-- MIGRATION_R118_EXPENSE_D1_SUMMARY.sql
-- R118-A (docs/r118-payment-notification-report-popup-spec.md §3): EXPENSE_D1 is now one summary row per
-- user and payment date ("내일 결제 예정 N건", source_id = user_id) instead of one row per PLANNED expense.
-- Only clause 3 of enqueue_daily_notifications() changes; clauses 1, 2, 4, 5 and the R114 calls (6, 7) are
-- copied verbatim from sql/SCHEMA.sql. No table, constraint, index, RLS, cron or payment RPC change.
-- Existing per-expense EXPENSE_D1 rows are kept as they are.
-- Apply after MIGRATION_R114_GAME_BUDGETS.sql. Re-runnable. Do not re-run enqueue_daily_notifications()
-- manually on the day this is applied (a same-date summary may be added next to that morning's per-item rows).

BEGIN;

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

    -- 3) 내일 결제 예정 지출 요약 (EXPENSE_D1, R118-A): 사용자·결제일당 1건, 금액·항목명·메모 원문 미포함
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        e.user_id,
        'EXPENSE_D1',
        '내일 결제 예정 ' || count(*)::text || '건',
        '내일 결제 예정인 지출을 지출 관리에서 확인하세요.',
        '/dashboard/expenses',
        e.user_id,
        v_tomorrow
    FROM public.expenses e
    LEFT JOIN public.notification_settings ns ON ns.user_id = e.user_id
    WHERE e.status = 'PLANNED'
      AND e.target_date = v_tomorrow
      AND coalesce(ns.planned_expense_d1, true) = true
      AND NOT public.account_deletion_is_pending(e.user_id)
    GROUP BY e.user_id
    HAVING count(*) >= 1
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

    -- 6) 게임별 월 예산 80%·100% (GAME_BUDGET_80·GAME_BUDGET_100, R114) / 7) 매월 1일 월간 리포트 (MONTHLY_REPORT, R114)
    v_inserted_count := v_inserted_count + public.enqueue_game_budget_notifications(v_today);
    v_inserted_count := v_inserted_count + public.enqueue_monthly_report_notifications(v_today);

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enqueue_daily_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_notifications() TO service_role;

COMMIT;
