-- R39: 일일 정기 알림 설정(notification_settings) + KST 09:00 pg_cron 일일 알림 생성(enqueue_daily_notifications) + 탈퇴 정리 연동
-- 선행 조건: MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql 적용 이후 실행한다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_schedule_start BOOLEAN NOT NULL DEFAULT true,
    favorite_schedule_end_d1 BOOLEAN NOT NULL DEFAULT true,
    planned_expense_d1 BOOLEAN NOT NULL DEFAULT true,
    request_result BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;

DROP POLICY IF EXISTS "Read own notification settings" ON public.notification_settings;
CREATE POLICY "Read own notification settings" ON public.notification_settings FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert own notification settings" ON public.notification_settings;
CREATE POLICY "Insert own notification settings" ON public.notification_settings FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own notification settings" ON public.notification_settings;
CREATE POLICY "Update own notification settings" ON public.notification_settings FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from notification_settings" ON public.notification_settings;
CREATE POLICY "Block account deletion users from notification_settings" ON public.notification_settings
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_notification_settings ON public.notification_settings;
CREATE TRIGGER block_pending_account_deletion_notification_settings
    BEFORE INSERT OR UPDATE OR DELETE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

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

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enqueue_daily_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_notifications() TO service_role;

CREATE OR REPLACE FUNCTION public.purge_expired_account_deletion_requests(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    v_req RECORD;
    v_purged_count INTEGER := 0;
BEGIN
    FOR v_req IN
        SELECT id, user_id
        FROM public.account_deletion_requests
        WHERE status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'AUTH_DELETE_PENDING')
          AND retry_after <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    LOOP
        UPDATE public.account_deletion_requests
        SET locked_until = NOW() + INTERVAL '5 minutes',
            attempt_count = attempt_count + 1,
            updated_at = NOW()
        WHERE id = v_req.id;

        IF v_req.user_id IS NOT NULL THEN
            DELETE FROM storage.objects
            WHERE bucket_id = 'user-icons'
              AND (name LIKE v_req.user_id || '/%' OR (path_tokens IS NOT NULL AND path_tokens[1] = v_req.user_id::text));

            DELETE FROM public.notification_settings WHERE user_id = v_req.user_id;
            DELETE FROM public.notifications WHERE user_id = v_req.user_id;
            DELETE FROM public.feedback_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.expenses WHERE user_id = v_req.user_id;
            DELETE FROM public.incomes WHERE user_id = v_req.user_id;
            DELETE FROM public.subscription_templates WHERE user_id = v_req.user_id;
            DELETE FROM public.personal_memos WHERE user_id = v_req.user_id;
            DELETE FROM public.user_favorite_schedules WHERE user_id = v_req.user_id;
            DELETE FROM public.user_character_presets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_characters WHERE user_id = v_req.user_id;
            DELETE FROM public.character_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.user_games WHERE user_id = v_req.user_id;
            DELETE FROM public.monthly_budgets WHERE user_id = v_req.user_id;
            DELETE FROM public.store_wallets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_finances WHERE user_id = v_req.user_id;

            DELETE FROM auth.users WHERE id = v_req.user_id;
        END IF;

        UPDATE public.account_deletion_requests
        SET status = 'COMPLETED',
            storage_completed_at = NOW(),
            data_completed_at = NOW(),
            user_id = NULL,
            locked_until = NULL,
            last_error_code = NULL,
            updated_at = NOW()
        WHERE id = v_req.id;

        v_purged_count := v_purged_count + 1;
    END LOOP;

    RETURN v_purged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, storage;

REVOKE ALL ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-daily-notifications') THEN
        PERFORM cron.unschedule('chronoledger-daily-notifications');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-daily-notifications',
        '0 0 * * *',
        'SELECT public.enqueue_daily_notifications();'
    );
END;
$$;

COMMIT;
