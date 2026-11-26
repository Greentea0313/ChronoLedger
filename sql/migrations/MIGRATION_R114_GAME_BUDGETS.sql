-- R114: 게임별 월 예산·월간 리포트·알림 (명세 docs/r113-r116-data-budget-public-spec.md §4, B1~B12, 인수 기준 114-1~114-8)
-- 1) user_games.monthly_budget(BIGINT NULL, > 0) 추가. 쓰기는 기존 "Manage own user_games" RLS로 클라이언트가 직접 함.
-- 2) notifications.kind에 GAME_BUDGET_80·GAME_BUDGET_100·MONTHLY_REPORT 추가.
-- 3) notification_settings.game_budget_alert·monthly_report(기본 true) 추가.
-- 4) enqueue_daily_notifications()에 6·7번 절 추가(기존 1~5번 절 불변). 새 절은 날짜를 받는 내부 함수
--    enqueue_game_budget_notifications(p_today)·enqueue_monthly_report_notifications(p_today)로 두어 service_role만 실행함.
-- 결제·환불 RPC와 expenses 제약은 바꾸지 않음(114-8).
-- 선행 조건: MIGRATION_R107C_AUTO_CONFIRM.sql 적용 이후 실행한다(enqueue_daily_notifications 5번 절 포함판).
-- 재실행 안전. enqueue_daily_notifications 또는 notifications_kind_check를 재정의하는 구버전 파일
-- (MIGRATION_R39·R84·R107B·R107C 등)을 이후 재실행했다면 이 파일도 다시 실행해야 한다.
BEGIN;

-- 1) Game monthly budget
ALTER TABLE public.user_games ADD COLUMN IF NOT EXISTS monthly_budget BIGINT;
ALTER TABLE public.user_games DROP CONSTRAINT IF EXISTS chk_user_games_monthly_budget;
ALTER TABLE public.user_games
    ADD CONSTRAINT chk_user_games_monthly_budget CHECK (monthly_budget IS NULL OR monthly_budget > 0);

-- 2) Notification kinds
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check CHECK (
        kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1', 'EXPENSE_DUE_TODAY', 'EXPENSE_AUTO_CONFIRMED', 'GAME_BUDGET_80', 'GAME_BUDGET_100', 'MONTHLY_REPORT', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
    );

-- 3) Notification settings
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS game_budget_alert BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS monthly_report BOOLEAN NOT NULL DEFAULT true;

-- 4) Notification generators
-- R114 (B4·B8): 게임별 월 예산 알림. p_today(KST)가 속한 달 기준, 예정+확정 final_amount 합(예정은 end_date가 있으면 end_date 달)을
--   user_games.monthly_budget과 비교함. 100% 이상이면 GAME_BUDGET_100만, 80% 이상 100% 미만이면 GAME_BUDGET_80.
--   source_id = game_id, scheduled_for = 이번 달 1일로 종류별 한 달 1회. 금액은 본문에 넣지 않음(잠금 화면 보호).
CREATE OR REPLACE FUNCTION public.enqueue_game_budget_notifications(p_today DATE)
RETURNS INTEGER AS $$
DECLARE
    v_month_start DATE := date_trunc('month', p_today)::date;
    v_next_month DATE := (date_trunc('month', p_today) + INTERVAL '1 month')::date;
    v_rows INTEGER := 0;
BEGIN
    IF p_today IS NULL THEN
        RAISE EXCEPTION 'p_today is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        u.user_id,
        CASE WHEN u.used >= u.monthly_budget THEN 'GAME_BUDGET_100' ELSE 'GAME_BUDGET_80' END,
        CASE WHEN u.used >= u.monthly_budget THEN '게임 월 예산을 모두 사용했습니다' ELSE '게임 월 예산의 80%를 사용했습니다' END,
        left(coalesce(nullif(btrim(u.game_name), ''), '게임'), 100)
            || CASE WHEN u.used >= u.monthly_budget
                    THEN ' 이번 달 지출(예정 포함)이 월 예산에 도달했습니다. 지출 관리에서 확인하세요.'
                    ELSE ' 이번 달 지출(예정 포함)이 월 예산의 80%를 넘었습니다. 지출 관리에서 확인하세요.' END,
        '/dashboard/expenses',
        u.game_id,
        v_month_start
    FROM (
        SELECT ug.user_id, ug.game_id, ug.monthly_budget, g.name AS game_name, coalesce(sum(e.final_amount), 0) AS used
        FROM public.user_games ug
        JOIN public.games g ON g.id = ug.game_id
        LEFT JOIN public.notification_settings ns ON ns.user_id = ug.user_id
        LEFT JOIN public.expenses e
            ON e.user_id = ug.user_id
           AND e.game_id = ug.game_id
           AND e.status IN ('PLANNED', 'CONFIRMED')
           AND (CASE WHEN e.status = 'PLANNED' AND e.end_date IS NOT NULL THEN e.end_date ELSE e.target_date END) >= v_month_start
           AND (CASE WHEN e.status = 'PLANNED' AND e.end_date IS NOT NULL THEN e.end_date ELSE e.target_date END) < v_next_month
        WHERE ug.monthly_budget IS NOT NULL
          AND coalesce(ns.game_budget_alert, true) = true
          AND NOT public.account_deletion_is_pending(ug.user_id)
        GROUP BY ug.user_id, ug.game_id, ug.monthly_budget, g.name
    ) AS u
    WHERE u.used * 100 >= u.monthly_budget * 80
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enqueue_game_budget_notifications(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_game_budget_notifications(DATE) TO service_role;

-- R114 (B9): 월간 리포트. p_today(KST)가 1일일 때만 전월 CONFIRMED 지출이 1건 이상인 사용자에게 1건.
--   본문: 'N월 확정 지출 X원(전월 대비 ±Y%) · 예산 초과 게임 K개'. 전전월 확정 합이 0이면 '(전월 기록 없음)'.
--   예산 초과 = 전월 귀속 예정+확정 합 > monthly_budget(B2 규칙). source_id = user_id, scheduled_for = 전월 1일.
CREATE OR REPLACE FUNCTION public.enqueue_monthly_report_notifications(p_today DATE)
RETURNS INTEGER AS $$
DECLARE
    v_month_start DATE := date_trunc('month', p_today)::date;
    v_prev_start DATE := (date_trunc('month', p_today) - INTERVAL '1 month')::date;
    v_prev2_start DATE := (date_trunc('month', p_today) - INTERVAL '2 month')::date;
    v_rows INTEGER := 0;
BEGIN
    IF p_today IS NULL THEN
        RAISE EXCEPTION 'p_today is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF extract(day FROM p_today) <> 1 THEN
        RETURN 0;
    END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, scheduled_for)
    SELECT
        r.user_id,
        'MONTHLY_REPORT',
        extract(month FROM v_prev_start)::int::text || '월 지출 리포트',
        extract(month FROM v_prev_start)::int::text || '월 확정 지출 ' || to_char(r.prev_total, 'FM999,999,999,999,990') || '원('
            || CASE
                   WHEN r.prev2_total = 0 THEN '전월 기록 없음'
                   ELSE '전월 대비 '
                        || CASE WHEN round((r.prev_total - r.prev2_total) * 100.0 / r.prev2_total) > 0 THEN '+' ELSE '' END
                        || round((r.prev_total - r.prev2_total) * 100.0 / r.prev2_total)::bigint::text || '%'
               END
            || ') · 예산 초과 게임 ' || r.over_count::text || '개',
        '/dashboard/expenses',
        r.user_id,
        v_prev_start
    FROM (
        SELECT
            p.user_id,
            p.prev_total,
            coalesce((
                SELECT sum(e2.final_amount) FROM public.expenses e2
                WHERE e2.user_id = p.user_id AND e2.status = 'CONFIRMED'
                  AND e2.target_date >= v_prev2_start AND e2.target_date < v_prev_start
            ), 0) AS prev2_total,
            (
                SELECT count(*) FROM (
                    SELECT ug.game_id
                    FROM public.user_games ug
                    LEFT JOIN public.expenses e3
                        ON e3.user_id = ug.user_id
                       AND e3.game_id = ug.game_id
                       AND e3.status IN ('PLANNED', 'CONFIRMED')
                       AND (CASE WHEN e3.status = 'PLANNED' AND e3.end_date IS NOT NULL THEN e3.end_date ELSE e3.target_date END) >= v_prev_start
                       AND (CASE WHEN e3.status = 'PLANNED' AND e3.end_date IS NOT NULL THEN e3.end_date ELSE e3.target_date END) < v_month_start
                    WHERE ug.user_id = p.user_id AND ug.monthly_budget IS NOT NULL
                    GROUP BY ug.game_id, ug.monthly_budget
                    HAVING coalesce(sum(e3.final_amount), 0) > ug.monthly_budget
                ) AS over_games
            ) AS over_count
        FROM (
            SELECT e.user_id, sum(e.final_amount) AS prev_total
            FROM public.expenses e
            WHERE e.status = 'CONFIRMED' AND e.target_date >= v_prev_start AND e.target_date < v_month_start
            GROUP BY e.user_id
        ) AS p
        LEFT JOIN public.notification_settings ns ON ns.user_id = p.user_id
        WHERE coalesce(ns.monthly_report, true) = true
          AND NOT public.account_deletion_is_pending(p.user_id)
    ) AS r
    ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enqueue_monthly_report_notifications(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_monthly_report_notifications(DATE) TO service_role;

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

    -- 6) 게임별 월 예산 80%·100% (GAME_BUDGET_80·GAME_BUDGET_100, R114) / 7) 매월 1일 월간 리포트 (MONTHLY_REPORT, R114)
    v_inserted_count := v_inserted_count + public.enqueue_game_budget_notifications(v_today);
    v_inserted_count := v_inserted_count + public.enqueue_monthly_report_notifications(v_today);

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
