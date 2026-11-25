-- R107-A: server-side subscription expense generation (single SQL core shared by the client lazy path and a daily pg_cron batch),
-- INTERVAL_30 single-PLANNED unique index, and INTERVAL_30 advance/rollback RPCs.
-- Spec: docs/r107-recurring-expense-automation-spec.md section 3 (D1-D5, D15). Re-runnable.
BEGIN;

-- 1. Remove duplicate PLANNED rows that the new unique index would reject (keep the earliest per template).
--    The predicate matches the index exactly: MONTHLY_DAY rows always carry billing_cycle and VERSION_PASS rows schedule_id.
DO $$
DECLARE
    v_deleted INTEGER := 0;
BEGIN
    WITH ranked AS (
        SELECT e.id,
               ROW_NUMBER() OVER (PARTITION BY e.template_id ORDER BY e.target_date ASC, e.id ASC) AS rn
        FROM public.expenses AS e
        WHERE e.status = 'PLANNED'
          AND e.template_id IS NOT NULL
          AND e.billing_cycle IS NULL
          AND e.schedule_id IS NULL
    ), deleted AS (
        DELETE FROM public.expenses AS e
        USING ranked AS r
        WHERE e.id = r.id AND r.rn > 1
        RETURNING e.id
    )
    SELECT COUNT(*)::INTEGER INTO v_deleted FROM deleted;
    RAISE NOTICE 'R107-A: removed % duplicate interval PLANNED expense rows', v_deleted;
END;
$$;

-- 2. One PLANNED row per INTERVAL_30 template, guaranteed by the database (D4).
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_interval_single_planned
    ON public.expenses(template_id)
    WHERE status = 'PLANNED' AND template_id IS NOT NULL AND billing_cycle IS NULL AND schedule_id IS NULL;

-- 3. Single implementation of the subscription generation rules (D1). Called by ensure_subscription_expenses (lazy, per user)
--    and run_daily_subscription_automation (pg_cron). Templates are locked FOR UPDATE so both paths serialize (D3).
CREATE OR REPLACE FUNCTION public.generate_subscription_expenses_core(p_user_id UUID, p_today DATE)
RETURNS INTEGER AS $$
DECLARE
    v_tpl public.subscription_templates%ROWTYPE;
    v_created INTEGER := 0;
    v_rows INTEGER;
    v_month DATE;
    v_day INTEGER;
    v_next_date DATE;
    v_latest_confirmed DATE;
    v_step INTEGER;
    v_point_platform VARCHAR(30);
BEGIN
    IF p_user_id IS NULL OR p_today IS NULL THEN
        RAISE EXCEPTION 'p_user_id and p_today are required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF public.account_deletion_is_pending(p_user_id) THEN
        RETURN 0;
    END IF;

    FOR v_tpl IN
        SELECT *
        FROM public.subscription_templates
        WHERE user_id = p_user_id AND is_active = true
        ORDER BY created_at ASC, id ASC
        FOR UPDATE
    LOOP
        v_point_platform := CASE WHEN v_tpl.payment_method = 'WALLET' THEN NULL ELSE v_tpl.payment_method END;

        IF COALESCE(v_tpl.cycle_type, 'MONTHLY_DAY') = 'MONTHLY_DAY' THEN
            -- Same cleanup as dedupe_monthly_planned_expenses: keep the earliest PLANNED row.
            WITH ranked AS (
                SELECT e.id, ROW_NUMBER() OVER (ORDER BY e.target_date ASC, e.id ASC) AS rn
                FROM public.expenses AS e
                WHERE e.user_id = p_user_id AND e.template_id = v_tpl.id AND e.status = 'PLANNED'
            )
            DELETE FROM public.expenses AS e
            USING ranked AS r
            WHERE e.id = r.id AND r.rn > 1;

            CONTINUE WHEN EXISTS (
                SELECT 1 FROM public.expenses
                WHERE user_id = p_user_id AND template_id = v_tpl.id AND status = 'PLANNED'
            );

            -- getAdjustedBillingDate: billing day clamped to the month's last day; this month first, next month when the
            -- date has passed, and skip any month whose billing_cycle already exists (any status).
            v_day := COALESCE(NULLIF(v_tpl.billing_day, 0), 1);
            v_month := date_trunc('month', p_today)::date;
            LOOP
                v_next_date := v_month + (LEAST(v_day, EXTRACT(DAY FROM (v_month + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER) - 1);
                EXIT WHEN v_next_date >= p_today AND NOT EXISTS (
                    SELECT 1 FROM public.expenses
                    WHERE template_id = v_tpl.id AND billing_cycle = to_char(v_month, 'YYYY-MM')
                );
                v_month := (v_month + INTERVAL '1 month')::date;
            END LOOP;

            INSERT INTO public.expenses(
                user_id, template_id, game_id, billing_cycle, title, category, status, target_date,
                original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount,
                payment_method, point_platform, deduct_from_asset
            ) VALUES (
                p_user_id, v_tpl.id, v_tpl.game_id, to_char(v_month, 'YYYY-MM'), v_tpl.title, v_tpl.category, 'PLANNED', v_next_date,
                v_tpl.default_price, 0, 0, 0, 0, v_tpl.default_price,
                v_tpl.payment_method, v_point_platform, true
            )
            ON CONFLICT DO NOTHING;
            GET DIAGNOSTICS v_rows = ROW_COUNT;
            v_created := v_created + v_rows;

        ELSIF v_tpl.cycle_type = 'INTERVAL_30' THEN
            CONTINUE WHEN EXISTS (
                SELECT 1 FROM public.expenses
                WHERE user_id = p_user_id AND template_id = v_tpl.id AND status = 'PLANNED'
            );

            -- Next date is the latest CONFIRMED target_date + interval_days, or today when nothing was paid yet.
            -- Early-payment accumulation is handled by advance_interval_subscription (spec section 9 item 5).
            v_step := COALESCE(NULLIF(v_tpl.interval_days, 0), 30);
            SELECT e.target_date INTO v_latest_confirmed
            FROM public.expenses AS e
            WHERE e.user_id = p_user_id AND e.template_id = v_tpl.id AND e.status = 'CONFIRMED'
            ORDER BY e.target_date DESC
            LIMIT 1;
            v_next_date := CASE WHEN v_latest_confirmed IS NULL THEN p_today ELSE v_latest_confirmed + v_step END;

            INSERT INTO public.expenses(
                user_id, template_id, game_id, title, category, status, target_date,
                original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount,
                payment_method, point_platform, deduct_from_asset
            ) VALUES (
                p_user_id, v_tpl.id, v_tpl.game_id, v_tpl.title, v_tpl.category, 'PLANNED', v_next_date,
                v_tpl.default_price, 0, 0, 0, 0, v_tpl.default_price,
                v_tpl.payment_method, v_point_platform, true
            )
            ON CONFLICT DO NOTHING;
            GET DIAGNOSTICS v_rows = ROW_COUNT;
            v_created := v_created + v_rows;

        ELSIF v_tpl.cycle_type = 'VERSION_PASS' AND v_tpl.game_id IS NOT NULL THEN
            -- One row per official VERSION schedule of the template's game that has not ended yet.
            INSERT INTO public.expenses(
                user_id, template_id, game_id, schedule_id, title, category, status, start_date, end_date, target_date,
                original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount,
                payment_method, point_platform, deduct_from_asset
            )
            SELECT
                p_user_id, v_tpl.id, v_tpl.game_id, s.id, LEFT(v_tpl.title || ' (' || s.title || ')', 150), v_tpl.category,
                'PLANNED', s.start_date, s.end_date, s.start_date,
                v_tpl.default_price, 0, 0, 0, 0, v_tpl.default_price,
                v_tpl.payment_method, v_point_platform, true
            FROM public.game_schedules AS s
            WHERE s.game_id = v_tpl.game_id
              AND s.schedule_type = 'VERSION'
              AND s.is_official = true
              AND s.end_date >= p_today
              AND NOT EXISTS (
                  SELECT 1 FROM public.expenses AS e
                  WHERE e.template_id = v_tpl.id AND e.schedule_id = s.id
              )
            ON CONFLICT DO NOTHING;
            GET DIAGNOSTICS v_rows = ROW_COUNT;
            v_created := v_created + v_rows;
        END IF;
    END LOOP;

    RETURN v_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_subscription_expenses_core(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_subscription_expenses_core(UUID, DATE) TO service_role;

-- 4. Client lazy path: the server decides "today" in KST; the client passes nothing.
CREATE OR REPLACE FUNCTION public.ensure_subscription_expenses()
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN public.generate_subscription_expenses_core(v_user_id, (NOW() AT TIME ZONE 'Asia/Seoul')::date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.ensure_subscription_expenses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_subscription_expenses() TO authenticated;

-- 5. INTERVAL_30 next cycle after a payment (calculateNextIntervalTargetDate): an early payment keeps the remaining days
--    (original date + interval), otherwise payment date + interval. No amount arguments; the template price is used.
CREATE OR REPLACE FUNCTION public.advance_interval_subscription(
    p_template_id UUID,
    p_original_target_date DATE,
    p_payment_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tpl public.subscription_templates%ROWTYPE;
    v_step INTEGER;
    v_next_date DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 구독 회차를 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_payment_date IS NULL THEN
        RAISE EXCEPTION 'p_payment_date is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT * INTO v_tpl
    FROM public.subscription_templates
    WHERE id = p_template_id AND user_id = v_user_id AND is_active = true AND cycle_type = 'INTERVAL_30'
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.expenses
        WHERE user_id = v_user_id AND template_id = v_tpl.id AND status = 'PLANNED'
    ) THEN
        RETURN false;
    END IF;

    v_step := COALESCE(NULLIF(v_tpl.interval_days, 0), 30);
    v_next_date := CASE
        WHEN p_original_target_date IS NOT NULL AND p_original_target_date > p_payment_date THEN p_original_target_date + v_step
        ELSE p_payment_date + v_step
    END;

    INSERT INTO public.expenses(
        user_id, template_id, game_id, title, category, status, target_date,
        original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount,
        payment_method, point_platform, deduct_from_asset
    ) VALUES (
        v_user_id, v_tpl.id, v_tpl.game_id, v_tpl.title, v_tpl.category, 'PLANNED', v_next_date,
        v_tpl.default_price, 0, 0, 0, 0, v_tpl.default_price,
        v_tpl.payment_method, CASE WHEN v_tpl.payment_method = 'WALLET' THEN NULL ELSE v_tpl.payment_method END, true
    )
    ON CONFLICT DO NOTHING;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.advance_interval_subscription(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_interval_subscription(UUID, DATE, DATE) TO authenticated;

-- 6. INTERVAL_30 refund rollback (calculateRollbackIntervalTargetDate): move the template's PLANNED row back by interval_days.
CREATE OR REPLACE FUNCTION public.rollback_interval_subscription(p_expense_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_template_id UUID;
    v_tpl public.subscription_templates%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 구독 회차를 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT template_id INTO v_template_id
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id;
    IF v_template_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT * INTO v_tpl
    FROM public.subscription_templates
    WHERE id = v_template_id AND user_id = v_user_id AND cycle_type = 'INTERVAL_30'
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.expenses
    SET target_date = target_date - COALESCE(NULLIF(v_tpl.interval_days, 0), 30)
    WHERE user_id = v_user_id AND template_id = v_tpl.id AND status = 'PLANNED';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.rollback_interval_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_interval_subscription(UUID) TO authenticated;

-- 7. Daily batch for every user with an active template; one user's failure never stops the others (A-5).
CREATE OR REPLACE FUNCTION public.run_daily_subscription_automation()
RETURNS INTEGER AS $$
DECLARE
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_user_id UUID;
    v_total INTEGER := 0;
BEGIN
    FOR v_user_id IN
        SELECT DISTINCT t.user_id
        FROM public.subscription_templates AS t
        WHERE t.is_active = true
          AND NOT public.account_deletion_is_pending(t.user_id)
    LOOP
        BEGIN
            v_total := v_total + public.generate_subscription_expenses_core(v_user_id, v_today);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'R107-A: subscription generation failed for user % (SQLSTATE %)', v_user_id, SQLSTATE;
        END;
    END LOOP;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.run_daily_subscription_automation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_daily_subscription_automation() TO service_role;

-- 8. Daily at 23:50 UTC (= 08:50 KST), ten minutes before chronoledger-daily-notifications (D2).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-subscription-daily') THEN
        PERFORM cron.unschedule('chronoledger-subscription-daily');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-subscription-daily',
        '50 23 * * *',
        'SELECT public.run_daily_subscription_automation();'
    );
END;
$$;

COMMIT;
