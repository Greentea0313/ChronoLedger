-- R107-C: 템플릿별 자동 확정 (명세 docs/r107-recurring-expense-automation-spec.md §5.1, D6~D14, 인수 기준 C-1~C-10)
-- 1) subscription_templates.auto_confirm(기본 false, 스토어 결제수단만), expenses.auto_confirmed_at·auto_confirm_blocked 추가.
-- 2) process_expense_payment 본문을 _process_expense_payment_core(p_user_id, …)로 추출(공개 함수 시그니처·권한 불변).
--    advance/rollback_interval_subscription도 사용자 지정 core로 추출해 pg_cron에서 쓸 수 있게 함.
-- 3) auto_confirm_due_expenses(내부)와 run_daily_subscription_automation 2단계(생성 → 자동 확정).
-- 4) refund_expense_payment에 INTERVAL_30 롤백 원자화(활성 템플릿의 최신 CONFIRMED만), 롤백·복구 행 auto_confirm_blocked=true,
--    rollback_interval_subscription은 이미 환불된 지출에 대해 아무것도 하지 않음(구버전 앱의 이중 롤백 방지).
-- 5) notifications.kind에 'EXPENSE_AUTO_CONFIRMED' 추가, enqueue_daily_notifications() 5번 절.
-- 선행 조건: MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql, MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql 적용 이후 실행한다.
-- 재실행 안전. 아래 함수를 재정의하는 구버전 파일(MIGRATION_R107A·R107B, MIGRATION_STORE_EVENT_EARN.sql 등)을 이후 재실행했다면
-- 이 파일도 다시 실행해야 한다.
BEGIN;

-- 1) Columns and constraint
ALTER TABLE public.subscription_templates
    ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.subscription_templates DROP CONSTRAINT IF EXISTS chk_subscription_template_auto_confirm_store;
ALTER TABLE public.subscription_templates
    ADD CONSTRAINT chk_subscription_template_auto_confirm_store
    CHECK (NOT auto_confirm OR payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE'));

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS auto_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS auto_confirm_blocked BOOLEAN NOT NULL DEFAULT false;

-- 2) Notification kind
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check CHECK (
        kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1', 'EXPENSE_DUE_TODAY', 'EXPENSE_AUTO_CONFIRMED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
    );

-- 3) Payment core and wrapper (D6)
-- R107-C (D6): payment body shared by process_expense_payment (auth.uid()) and auto_confirm_due_expenses (pg_cron).
--    Internal only: PUBLIC/anon/authenticated cannot execute it.
CREATE OR REPLACE FUNCTION public._process_expense_payment_core(
    p_user_id UUID,
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR(30),
    p_payment_method VARCHAR(30),
    p_deduct_asset BOOLEAN,
    p_payment_date DATE,
    p_custom_earned_points BIGINT DEFAULT NULL,
    p_memo TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := p_user_id;
    v_expense public.expenses%ROWTYPE;
    v_wallet_balance BIGINT;
    v_earn_rate NUMERIC(5, 2);
    v_earned_points BIGINT := 0;
    v_new_balance BIGINT;
    v_final_amount BIGINT;
    v_np_balance BIGINT;
    v_np_shortage BIGINT;
    v_np_recharge BIGINT;
    v_total_asset BIGINT;
    v_effective_method VARCHAR;
    v_store_platform VARCHAR;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND OR v_expense.status <> 'PLANNED' THEN
        RAISE EXCEPTION '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.';
    END IF;

    IF p_original_price IS NULL OR p_discount_amount IS NULL OR p_point_discount_amount IS NULL
       OR p_used_points IS NULL OR p_deduct_asset IS NULL OR p_payment_date IS NULL
       OR p_original_price < 0 OR p_discount_amount < 0 OR p_point_discount_amount < 0 OR p_used_points < 0
       OR p_discount_amount + p_point_discount_amount > p_original_price THEN
        RAISE EXCEPTION '결제 금액 입력이 올바르지 않습니다.';
    END IF;

    IF p_payment_method IS NULL OR p_payment_method NOT IN ('WALLET', 'NAVER_PAY', 'GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 결제 수단입니다.';
    END IF;

    -- 하위 호환: 구버전 GOOGLE_PLAY, GALAXY_STORE가 넘어오면 실결제 수단은 WALLET으로, 플랫폼은 해당 스토어로 매핑
    IF p_payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        v_effective_method := 'WALLET';
        v_store_platform := p_payment_method;
    ELSE
        v_effective_method := p_payment_method;
        v_store_platform := p_point_platform;
    END IF;

    IF p_payment_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제할 수 없습니다.';
    END IF;

    IF p_used_points = 0 AND p_point_discount_amount <> 0 THEN
        RAISE EXCEPTION '포인트 사용 정보가 서로 일치하지 않습니다.';
    END IF;
    IF p_used_points > 0 AND (p_point_discount_amount = 0 OR v_store_platform IS NULL OR v_store_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')) THEN
        RAISE EXCEPTION '포인트 플랫폼과 할인 금액을 확인해 주세요.';
    END IF;
    IF v_store_platform IS NOT NULL AND v_store_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 포인트 플랫폼입니다.';
    END IF;

    -- 최종 실결제액 산출 (최대 100% 할인 가능, 0원 미만 불가)
    v_final_amount := p_original_price - p_discount_amount - p_point_discount_amount;
    IF v_final_amount < 0 THEN
        v_final_amount := 0;
    END IF;

    -- 1. 네이버페이 결제 처리 (실결제액이 존재할 때 부족 시 10,000원 단위 올림 자동 충전 및 결제 차감)
    IF v_effective_method = 'NAVER_PAY' THEN
        INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
        VALUES (v_user_id, 'NAVER_PAY', NULL, 0)
        ON CONFLICT (user_id, platform) DO NOTHING;

        IF v_final_amount > 0 THEN
            SELECT current_balance INTO v_np_balance
            FROM public.store_wallets
            WHERE user_id = v_user_id AND platform = 'NAVER_PAY'
            FOR UPDATE;

            v_np_balance := coalesce(v_np_balance, 0);

            IF v_np_balance < v_final_amount THEN
                v_np_shortage := v_final_amount - v_np_balance;
                v_np_recharge := CEIL(v_np_shortage::numeric / 10000.0) * 10000;

                SELECT total_asset INTO v_total_asset
                FROM public.user_finances
                WHERE user_id = v_user_id
                FOR UPDATE;

                IF v_total_asset IS NULL OR v_total_asset < v_np_recharge THEN
                    RAISE EXCEPTION '총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.';
                END IF;

                -- 총 자산에서 10,000원 단위 올림 충전액 차감
                UPDATE public.user_finances
                SET total_asset = total_asset - v_np_recharge, updated_at = NOW()
                WHERE user_id = v_user_id;

                -- 네이버페이 지갑에 충전액 증액
                v_np_balance := v_np_balance + v_np_recharge;
                UPDATE public.store_wallets
                SET current_balance = v_np_balance, updated_at = NOW()
                WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

                -- 충전 원장 트랜잭션 기록
                INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
                VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'RECHARGE', v_np_recharge, v_np_balance, '네이버페이 자동 충전');
            END IF;

            -- 네이버페이 지갑에서 결제액 차감
            v_np_balance := v_np_balance - v_final_amount;
            UPDATE public.store_wallets
            SET current_balance = v_np_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

            -- 결제 사용 원장 트랜잭션 기록
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'USE', -v_final_amount, v_np_balance, '네이버페이 결제');
        END IF;
    END IF;

    -- 1-1. 포인트 미사용 스토어 결제: 지갑 행이 아직 없으면 기본 등급으로 자동 생성하여 적립 누락/지갑 미생성 오류 방지
    IF v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_used_points = 0 THEN
        INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
        VALUES (
            v_user_id,
            v_store_platform,
            CASE WHEN v_store_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE 'GENERAL' END,
            0.10
        )
        ON CONFLICT (user_id, platform) DO NOTHING;
    END IF;

    -- 2. 사용 포인트 차감 및 스토어 적립률 잠금 조회
    IF v_store_platform IS NOT NULL THEN
        SELECT current_balance, earn_rate INTO v_wallet_balance, v_earn_rate
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = v_store_platform
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION '포인트 지갑 설정이 없습니다.'; END IF;
    END IF;

    IF p_used_points > 0 THEN
        IF v_wallet_balance IS NULL OR v_wallet_balance < p_used_points THEN
            RAISE EXCEPTION '포인트 잔액이 부족합니다.';
        END IF;

        v_new_balance := v_wallet_balance - p_used_points;
        UPDATE public.store_wallets
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = v_store_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, v_store_platform, p_expense_id, 'USE', -p_used_points, v_new_balance, '결제 포인트 사용');

        v_wallet_balance := v_new_balance;
    END IF;

    -- 3. 포인트 적립: 결제 플랫폼이 스토어이고 실결제액이 있는 경우
    --    (커스텀 적립 포인트 p_custom_earned_points가 주어지면 해당 값 우선 적용)
    IF v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND v_final_amount > 0 THEN
        IF p_custom_earned_points IS NOT NULL AND p_custom_earned_points >= 0 THEN
            v_earned_points := p_custom_earned_points;
        ELSE
            v_earned_points := FLOOR(v_final_amount * coalesce(v_earn_rate, 0) / 100);
        END IF;
    END IF;

    IF v_earned_points > 0 THEN
        v_new_balance := coalesce(v_wallet_balance, 0) + v_earned_points;

        UPDATE public.store_wallets
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = v_store_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, v_store_platform, p_expense_id, 'EARN', v_earned_points, v_new_balance, '결제 적립 포인트');
    END IF;

    -- 4. 총 자산 차감 처리 ('내 지갑' 결제이고 자산 차감 선택 시 실결제액 차감)
    IF p_deduct_asset AND v_effective_method = 'WALLET' AND v_final_amount > 0 THEN
        UPDATE public.user_finances
        SET total_asset = total_asset - v_final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    -- 5. expenses 상태 CONFIRMED 원자적 갱신
    UPDATE public.expenses
    SET status = 'CONFIRMED',
        original_price = p_original_price,
        discount_amount = p_discount_amount,
        point_discount_amount = p_point_discount_amount,
        used_points = p_used_points,
        payment_method = v_effective_method,
        deduct_from_asset = CASE WHEN v_effective_method = 'NAVER_PAY' THEN FALSE ELSE p_deduct_asset END,
        target_date = p_payment_date,
        point_platform = v_store_platform,
        earned_points = v_earned_points,
        final_amount = v_final_amount,
        memo = coalesce(p_memo, memo)
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public._process_expense_payment_core(UUID, UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._process_expense_payment_core(UUID, UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) TO service_role;

-- 1. 결제 전담 RPC (IDOR 방어 및 expenses 상태 갱신 일원화). R107-C: 본문은 _process_expense_payment_core로 옮기고 auth.uid()만 넘긴다.
CREATE OR REPLACE FUNCTION public.process_expense_payment(
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR(30),
    p_payment_method VARCHAR(30),
    p_deduct_asset BOOLEAN,
    p_payment_date DATE,
    p_custom_earned_points BIGINT DEFAULT NULL,
    p_memo TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    PERFORM public._process_expense_payment_core(
        auth.uid(), p_expense_id, p_original_price, p_discount_amount, p_point_discount_amount, p_used_points,
        p_point_platform, p_payment_method, p_deduct_asset, p_payment_date, p_custom_earned_points, p_memo
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Refund with atomic INTERVAL_30 rollback (D12) and restore blocking (D11)
-- R107-C: user-scoped INTERVAL_30 rollback shared by refund_expense_payment (atomic, D12) and the legacy RPC below.
--    The rolled-back PLANNED row is marked auto_confirm_blocked so the next pg_cron run does not pay it again (D11).
CREATE OR REPLACE FUNCTION public._rollback_interval_subscription_core(p_user_id UUID, p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tpl public.subscription_templates%ROWTYPE;
BEGIN
    SELECT * INTO v_tpl
    FROM public.subscription_templates
    WHERE id = p_template_id AND user_id = p_user_id AND cycle_type = 'INTERVAL_30'
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.expenses
    SET target_date = target_date - COALESCE(NULLIF(v_tpl.interval_days, 0), 30),
        auto_confirm_blocked = true
    WHERE user_id = p_user_id AND template_id = v_tpl.id AND status = 'PLANNED';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public._rollback_interval_subscription_core(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._rollback_interval_subscription_core(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_expense_payment(
    p_expense_id UUID
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_wallet_balance BIGINT;
    v_np_balance BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id FOR UPDATE;

    IF v_expense.id IS NULL OR v_expense.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '취소할 수 있는 확정 결제 내역이 아닙니다.';
    END IF;

    -- R107-C: lock the template before wallets/assets, the same order as auto_confirm_due_expenses (template -> expense -> wallet).
    IF v_expense.template_id IS NOT NULL THEN
        PERFORM 1 FROM public.subscription_templates
        WHERE id = v_expense.template_id AND user_id = v_user_id
        FOR UPDATE;
    END IF;

    -- 네이버페이 환불 처리 (네이버페이 지갑 잔액으로 실결제액 복원)
    IF v_expense.payment_method = 'NAVER_PAY' AND v_expense.final_amount > 0 THEN
        SELECT current_balance INTO v_np_balance
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY'
        FOR UPDATE;

        v_np_balance := coalesce(v_np_balance, 0) + v_expense.final_amount;
        UPDATE public.store_wallets
        SET current_balance = v_np_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'REFUND', v_expense.final_amount, v_np_balance, '결제 취소 네이버페이 환불');
    END IF;

    -- 포인트 롤백 (적립 포인트 기사용 시 취소 거부)
    IF (v_expense.used_points > 0 OR v_expense.earned_points > 0) AND v_expense.point_platform IS NOT NULL THEN
        SELECT current_balance INTO v_wallet_balance
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = v_expense.point_platform FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION '환불 대상 포인트 지갑이 없습니다.';
        END IF;

        v_wallet_balance := coalesce(v_wallet_balance, 0);
        IF v_wallet_balance + v_expense.used_points - v_expense.earned_points < 0 THEN
            RAISE EXCEPTION '적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다.';
        END IF;

        IF v_expense.used_points > 0 THEN
            v_wallet_balance := v_wallet_balance + v_expense.used_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', v_expense.used_points, v_wallet_balance, '결제 취소 포인트 반환');
        END IF;

        IF v_expense.earned_points > 0 THEN
            v_wallet_balance := v_wallet_balance - v_expense.earned_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', -v_expense.earned_points, v_wallet_balance, '결제 취소 적립 포인트 회수');
        END IF;
    END IF;

    -- 총 자산 복원 처리 (네이버페이 결제는 네이버페이 잔액으로 복원되므로 총 자산 이중 복원 방지)
    IF v_expense.deduct_from_asset AND v_expense.payment_method <> 'NAVER_PAY' AND v_expense.final_amount > 0 THEN
        UPDATE public.user_finances
        SET total_asset = total_asset + v_expense.final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    UPDATE public.expenses SET status = 'CANCELLED', cancellation_kind = 'PAYMENT_REFUND'
    WHERE id = p_expense_id AND user_id = v_user_id;

    -- R107-C (D12, R107A-REV-002): INTERVAL_30 rollback in the same transaction. Only an active template's latest CONFIRMED
    -- payment moves the PLANNED row back; an inactive template has no PLANNED row (deleted on deactivation) and is skipped.
    IF v_expense.template_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM public.subscription_templates AS t
           WHERE t.id = v_expense.template_id AND t.user_id = v_user_id AND t.cycle_type = 'INTERVAL_30' AND t.is_active
       )
       AND NOT EXISTS (
           SELECT 1 FROM public.expenses AS o
           WHERE o.user_id = v_user_id AND o.template_id = v_expense.template_id AND o.status = 'CONFIRMED'
             AND o.id <> v_expense.id
             AND (o.target_date, coalesce(o.created_at, '-infinity'::timestamptz), o.id)
                 > (v_expense.target_date, coalesce(v_expense.created_at, '-infinity'::timestamptz), v_expense.id)
       ) THEN
        PERFORM public._rollback_interval_subscription_core(v_user_id, v_expense.template_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.restore_cancelled_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses AS e
    SET status = 'PLANNED', cancellation_kind = NULL, auto_confirm_blocked = true
    WHERE e.id = p_expense_id AND e.user_id = v_user_id AND e.status = 'CANCELLED'
      AND (
          e.cancellation_kind = 'PLANNED_CANCEL'
      );
    IF NOT FOUND THEN RAISE EXCEPTION '복구 가능한 예정 취소 항목이 아닙니다.'; END IF;
EXCEPTION WHEN unique_violation THEN
    -- R107-C: an INTERVAL_30 template keeps one PLANNED row (idx_expenses_interval_single_planned).
    RAISE EXCEPTION '같은 구독의 예정 지출이 이미 있어 복구할 수 없습니다.' USING ERRCODE = 'unique_violation';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) INTERVAL_30 advance/rollback RPCs on top of the user-scoped cores
-- R107-C: user-scoped body of advance_interval_subscription, also called by auto_confirm_due_expenses (pg_cron).
CREATE OR REPLACE FUNCTION public._advance_interval_subscription_core(
    p_user_id UUID,
    p_template_id UUID,
    p_original_target_date DATE,
    p_payment_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := p_user_id;
    v_tpl public.subscription_templates%ROWTYPE;
    v_step INTEGER;
    v_next_date DATE;
BEGIN
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

REVOKE ALL ON FUNCTION public._advance_interval_subscription_core(UUID, UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._advance_interval_subscription_core(UUID, UUID, DATE, DATE) TO service_role;

CREATE OR REPLACE FUNCTION public.advance_interval_subscription(
    p_template_id UUID,
    p_original_target_date DATE,
    p_payment_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
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

    RETURN public._advance_interval_subscription_core(v_user_id, p_template_id, p_original_target_date, p_payment_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.rollback_interval_subscription(p_expense_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_template_id UUID;
    v_status VARCHAR(20);
    v_cancellation_kind VARCHAR(30);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 구독 회차를 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT template_id, status, cancellation_kind INTO v_template_id, v_status, v_cancellation_kind
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id;
    IF v_template_id IS NULL THEN
        RETURN false;
    END IF;
    -- R107-C: refund_expense_payment already rolled back in the same transaction; older clients still call this
    -- RPC after a refund, so a refunded expense must not be rolled back a second time.
    IF v_status = 'CANCELLED' AND v_cancellation_kind = 'PAYMENT_REFUND' THEN
        RETURN false;
    END IF;

    RETURN public._rollback_interval_subscription_core(v_user_id, v_template_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6) Auto confirm and daily batch
-- R107-C (§5.1-4): confirm due PLANNED rows of auto_confirm store templates for one user (D7-D10). Internal, service_role only.
--    Lock order template -> expense -> wallet/assets matches generate_subscription_expenses_core and refund_expense_payment.
CREATE OR REPLACE FUNCTION public.auto_confirm_due_expenses(p_user_id UUID, p_today DATE)
RETURNS INTEGER AS $$
DECLARE
    v_candidate_id UUID;
    v_exp public.expenses%ROWTYPE;
    v_tpl public.subscription_templates%ROWTYPE;
    v_cutoff TIMESTAMPTZ;
    v_confirmed INTEGER := 0;
BEGIN
    IF p_user_id IS NULL OR p_today IS NULL THEN
        RAISE EXCEPTION 'p_user_id and p_today are required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF public.account_deletion_is_pending(p_user_id) THEN
        RETURN 0;
    END IF;
    -- Rows created on p_today (KST) or later are skipped (D9).
    v_cutoff := p_today::timestamp AT TIME ZONE 'Asia/Seoul';

    PERFORM 1
    FROM public.subscription_templates
    WHERE user_id = p_user_id AND is_active = true
    ORDER BY created_at ASC, id ASC
    FOR UPDATE;

    FOR v_candidate_id IN
        SELECT e.id
        FROM public.expenses AS e
        JOIN public.subscription_templates AS t ON t.id = e.template_id AND t.user_id = e.user_id
        WHERE e.user_id = p_user_id
          AND e.status = 'PLANNED'
          AND NOT e.auto_confirm_blocked
          AND t.auto_confirm
          AND t.is_active
          AND t.payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE')
          AND e.target_date BETWEEN p_today - 2 AND p_today
          AND e.created_at < v_cutoff
        ORDER BY e.target_date ASC, e.id ASC
    LOOP
        BEGIN
            -- A concurrent manual payment holds the row: skip it, the other side wins (§5.3).
            SELECT * INTO v_exp
            FROM public.expenses
            WHERE id = v_candidate_id AND user_id = p_user_id
            FOR UPDATE SKIP LOCKED;
            CONTINUE WHEN NOT FOUND OR v_exp.status <> 'PLANNED' OR v_exp.auto_confirm_blocked;

            SELECT * INTO v_tpl FROM public.subscription_templates WHERE id = v_exp.template_id;

            -- D8: pay on the planned date with the generated snapshot price, no discount or point use; earn by the store rate.
            PERFORM public._process_expense_payment_core(
                p_user_id, v_exp.id, v_exp.original_price, 0, 0, 0,
                v_tpl.payment_method, v_tpl.payment_method, v_exp.deduct_from_asset, v_exp.target_date, NULL, NULL
            );
            UPDATE public.expenses SET auto_confirmed_at = NOW() WHERE id = v_exp.id;

            -- Next cycle in the same subtransaction (C-6).
            IF v_tpl.cycle_type = 'INTERVAL_30' THEN
                PERFORM public._advance_interval_subscription_core(p_user_id, v_tpl.id, v_exp.target_date, v_exp.target_date);
            ELSE
                PERFORM public.generate_subscription_expenses_core(p_user_id, p_today);
            END IF;

            v_confirmed := v_confirmed + 1;
        EXCEPTION WHEN OTHERS THEN
            -- D10: one failing row stays PLANNED and does not stop the others; it is retried while inside the window.
            RAISE WARNING 'R107-C: auto confirm failed for expense % (SQLSTATE %)', v_candidate_id, SQLSTATE;
        END;
    END LOOP;

    RETURN v_confirmed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.auto_confirm_due_expenses(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_confirm_due_expenses(UUID, DATE) TO service_role;

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

    -- R107-C: auto confirm runs after generation (D2) for users with an active auto_confirm template.
    FOR v_user_id IN
        SELECT DISTINCT t.user_id
        FROM public.subscription_templates AS t
        WHERE t.is_active = true AND t.auto_confirm = true
          AND NOT public.account_deletion_is_pending(t.user_id)
    LOOP
        BEGIN
            v_total := v_total + public.auto_confirm_due_expenses(v_user_id, v_today);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'R107-C: auto confirm failed for user % (SQLSTATE %)', v_user_id, SQLSTATE;
        END;
    END LOOP;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7) Daily notifications
CREATE OR REPLACE FUNCTION public.enqueue_daily_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_today DATE;
    v_tomorrow DATE;
    v_rows INTEGER := 0;
    v_inserted_count INTEGER := 0;
BEGIN
    v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_tomorrow := v_today + 1;

    -- 1) 관심 일정 시작 당일 (FAVORITE_START): 일정 제목만 포함하고 민감 메모 제외
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        f.user_id,
        'FAVORITE_START',
        '오늘 시작하는 관심 일정이 있습니다',
        left(coalesce(nullif(btrim(s.title), ''), '관심 일정'), 150) || ' 일정이 오늘 시작합니다.',
        '/dashboard?date=' || to_char(v_today, 'YYYY-MM-DD'),
        s.id,
        v_today
    FROM public.user_favorite_schedules f
    JOIN public.game_schedules s ON s.id = f.schedule_id
    LEFT JOIN public.notification_settings ns ON ns.user_id = f.user_id
    WHERE s.start_date = v_today
      AND coalesce(ns.favorite_schedule_start, true) = true
      AND NOT public.account_deletion_is_pending(f.user_id)
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted_count := v_inserted_count + v_rows;

    -- 2) 관심 일정 종료 1일 전 (FAVORITE_END_D1): 일정 제목만 포함하고 민감 메모 제외
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        f.user_id,
        'FAVORITE_END_D1',
        '내일 종료되는 관심 일정이 있습니다',
        left(coalesce(nullif(btrim(s.title), ''), '관심 일정'), 150) || ' 일정이 내일 종료합니다.',
        '/dashboard?date=' || to_char(v_tomorrow, 'YYYY-MM-DD'),
        s.id,
        v_tomorrow
    FROM public.user_favorite_schedules f
    JOIN public.game_schedules s ON s.id = f.schedule_id
    LEFT JOIN public.notification_settings ns ON ns.user_id = f.user_id
    WHERE s.end_date = v_tomorrow
      AND coalesce(ns.favorite_schedule_end_d1, true) = true
      AND NOT public.account_deletion_is_pending(f.user_id)
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted_count := v_inserted_count + v_rows;

    -- 3) 예정 지출 결제 예정일 1일 전 (EXPENSE_D1): 잠금 화면 보호를 위해 금액·메모 원문 미포함
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        e.user_id,
        'EXPENSE_D1',
        '내일 결제 예정인 지출이 있습니다',
        '예정된 결제 일정을 지출 관리에서 확인하세요.',
        '/dashboard/expenses',
        e.id,
        v_tomorrow
    FROM public.expenses e
    LEFT JOIN public.notification_settings ns ON ns.user_id = e.user_id
    WHERE e.status = 'PLANNED'
      AND e.target_date = v_tomorrow
      AND coalesce(ns.planned_expense_d1, true) = true
      AND NOT public.account_deletion_is_pending(e.user_id)
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted_count := v_inserted_count + v_rows;

    -- 4) 오늘 결제 예정 지출 요약 (EXPENSE_DUE_TODAY, R107-B): 사용자·일자당 1건, 금액·항목명·메모 원문 미포함
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        e.user_id,
        'EXPENSE_DUE_TODAY',
        '오늘 결제 예정 ' || count(*)::text || '건',
        '오늘 결제 예정인 지출을 지출 관리에서 확인하세요.',
        '/dashboard/expenses',
        e.user_id,
        v_today
    FROM public.expenses e
    LEFT JOIN public.notification_settings ns ON ns.user_id = e.user_id
    WHERE e.status = 'PLANNED'
      AND e.target_date = v_today
      AND coalesce(ns.expense_due_today, true) = true
      AND NOT public.account_deletion_is_pending(e.user_id)
    GROUP BY e.user_id
    HAVING count(*) >= 1
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted_count := v_inserted_count + v_rows;

    -- 5) 오늘 자동 확정된 결제 요약 (EXPENSE_AUTO_CONFIRMED, R107-C): 사용자·일자당 1건, 금액·항목명·메모 원문 미포함
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        e.user_id,
        'EXPENSE_AUTO_CONFIRMED',
        '오늘 자동 확정된 결제 ' || count(*)::text || '건',
        '자동 확정된 결제를 지출 관리에서 확인하세요. 잘못된 항목은 환불할 수 있습니다.',
        '/dashboard/expenses',
        e.user_id,
        v_today
    FROM public.expenses e
    LEFT JOIN public.notification_settings ns ON ns.user_id = e.user_id
    WHERE e.auto_confirmed_at IS NOT NULL
      AND (e.auto_confirmed_at AT TIME ZONE 'Asia/Seoul')::date = v_today
      AND coalesce(ns.expense_due_today, true) = true
      AND NOT public.account_deletion_is_pending(e.user_id)
    GROUP BY e.user_id
    HAVING count(*) >= 1
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted_count := v_inserted_count + v_rows;

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
