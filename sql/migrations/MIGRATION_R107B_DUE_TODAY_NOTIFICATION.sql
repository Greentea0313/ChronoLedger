-- R107-B: 오늘 결제 예정 지출 요약 알림 (EXPENSE_DUE_TODAY)
-- notifications.kind CHECK에 'EXPENSE_DUE_TODAY'를 추가하고,
-- notification_settings.expense_due_today 컬럼(기본 true)과 enqueue_daily_notifications() 4번 절을 추가한다.
-- 선행 조건: MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql, MIGRATION_R39_DAILY_NOTIFICATIONS.sql 적용 이후 실행한다.
-- 재실행 안전. R107-C 적용 이후 이 파일을 재실행했다면 MIGRATION_R107C_AUTO_CONFIRM.sql도 다시 실행해야 한다.
BEGIN;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check CHECK (
        kind IN (
            'FAVORITE_START',
            'FAVORITE_END_D1',
            'EXPENSE_D1',
            'EXPENSE_DUE_TODAY',
            'REQUEST_APPROVED',
            'REQUEST_REJECTED',
            'FEEDBACK_ANSWERED'
        )
    );

ALTER TABLE public.notification_settings
    ADD COLUMN IF NOT EXISTS expense_due_today BOOLEAN NOT NULL DEFAULT true;

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

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enqueue_daily_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_notifications() TO service_role;

COMMIT;
