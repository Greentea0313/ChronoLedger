-- R85: 일정 시각(start_at, end_at, start_at_estimated, end_at_estimated) + 게임별 서버 초기화 시각(games.daily_reset_time)
-- 사전 조건: MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql 적용 완료(approve_schedule_request가 public.notifications에 INSERT함).
BEGIN;

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS daily_reset_time TIME;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.games'::regclass
          AND conname = 'chk_games_daily_reset_time_minute'
    ) THEN
        ALTER TABLE public.games
            ADD CONSTRAINT chk_games_daily_reset_time_minute
            CHECK (daily_reset_time IS NULL OR date_trunc('minute', daily_reset_time) = daily_reset_time);
    END IF;
END;
$$;

GRANT SELECT ON public.games TO anon;

ALTER TABLE public.game_schedules
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS start_at_estimated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS end_at_estimated BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.game_schedules'::regclass
          AND conname = 'chk_game_schedules_start_at_date'
    ) THEN
        ALTER TABLE public.game_schedules
            ADD CONSTRAINT chk_game_schedules_start_at_date
            CHECK (start_at IS NULL OR (start_at AT TIME ZONE 'Asia/Seoul')::date = start_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.game_schedules'::regclass
          AND conname = 'chk_game_schedules_end_at_date'
    ) THEN
        ALTER TABLE public.game_schedules
            ADD CONSTRAINT chk_game_schedules_end_at_date
            CHECK (end_at IS NULL OR (end_at AT TIME ZONE 'Asia/Seoul')::date = end_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.game_schedules'::regclass
          AND conname = 'chk_game_schedules_at_order'
    ) THEN
        ALTER TABLE public.game_schedules
            ADD CONSTRAINT chk_game_schedules_at_order
            CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.game_schedules'::regclass
          AND conname = 'chk_game_schedules_at_minute'
    ) THEN
        ALTER TABLE public.game_schedules
            ADD CONSTRAINT chk_game_schedules_at_minute
            CHECK (
                (start_at IS NULL OR date_trunc('minute', start_at, 'UTC') = start_at)
                AND (end_at IS NULL OR date_trunc('minute', end_at, 'UTC') = end_at)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.game_schedules'::regclass
          AND conname = 'chk_game_schedules_estimated_needs_at'
    ) THEN
        ALTER TABLE public.game_schedules
            ADD CONSTRAINT chk_game_schedules_estimated_needs_at
            CHECK (
                (NOT start_at_estimated OR start_at IS NOT NULL)
                AND (NOT end_at_estimated OR end_at IS NOT NULL)
            );
    END IF;
END;
$$;

ALTER TABLE public.schedule_requests
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS start_at_estimated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS end_at_estimated BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schedule_requests'::regclass
          AND conname = 'chk_schedule_requests_start_at_date'
    ) THEN
        ALTER TABLE public.schedule_requests
            ADD CONSTRAINT chk_schedule_requests_start_at_date
            CHECK (start_at IS NULL OR (start_at AT TIME ZONE 'Asia/Seoul')::date = start_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schedule_requests'::regclass
          AND conname = 'chk_schedule_requests_end_at_date'
    ) THEN
        ALTER TABLE public.schedule_requests
            ADD CONSTRAINT chk_schedule_requests_end_at_date
            CHECK (end_at IS NULL OR (end_at AT TIME ZONE 'Asia/Seoul')::date = end_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schedule_requests'::regclass
          AND conname = 'chk_schedule_requests_at_order'
    ) THEN
        ALTER TABLE public.schedule_requests
            ADD CONSTRAINT chk_schedule_requests_at_order
            CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schedule_requests'::regclass
          AND conname = 'chk_schedule_requests_at_minute'
    ) THEN
        ALTER TABLE public.schedule_requests
            ADD CONSTRAINT chk_schedule_requests_at_minute
            CHECK (
                (start_at IS NULL OR date_trunc('minute', start_at, 'UTC') = start_at)
                AND (end_at IS NULL OR date_trunc('minute', end_at, 'UTC') = end_at)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.schedule_requests'::regclass
          AND conname = 'chk_schedule_requests_estimated_needs_at'
    ) THEN
        ALTER TABLE public.schedule_requests
            ADD CONSTRAINT chk_schedule_requests_estimated_needs_at
            CHECK (
                (NOT start_at_estimated OR start_at IS NOT NULL)
                AND (NOT end_at_estimated OR end_at IS NOT NULL)
            );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
    v_pickup_character_ids UUID[] := '{}'::uuid[];
    v_proposal JSONB;
    v_character_id UUID;
    v_character_name TEXT;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    SELECT * INTO v_request FROM public.schedule_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 일정 요청이 아닙니다.';
    END IF;

    IF v_request.schedule_type = 'PICKUP' THEN
        SELECT coalesce(array_agg(c.id ORDER BY u.ord), '{}'::uuid[]) INTO v_pickup_character_ids
        FROM unnest(v_request.pickup_character_ids) WITH ORDINALITY AS u(id, ord)
        JOIN public.game_characters c ON c.id = u.id AND c.game_id = v_request.game_id;

        FOR v_proposal IN SELECT value FROM jsonb_array_elements(v_request.pickup_new_characters) AS item(value) LOOP
            v_character_name := btrim(v_proposal ->> 'name');
            SELECT id INTO v_character_id FROM public.game_characters
            WHERE game_id = v_request.game_id AND name = v_character_name;
            IF NOT FOUND THEN
                INSERT INTO public.game_characters(game_id, name, default_icon_url, is_pickup_only, created_by)
                VALUES (v_request.game_id, v_character_name, v_proposal ->> 'icon_url', true, auth.uid())
                ON CONFLICT (game_id, name) DO NOTHING
                RETURNING id INTO v_character_id;
                IF v_character_id IS NULL THEN
                    SELECT id INTO v_character_id FROM public.game_characters
                    WHERE game_id = v_request.game_id AND name = v_character_name;
                END IF;
            END IF;
            IF NOT (v_character_id = ANY(v_pickup_character_ids)) THEN
                v_pickup_character_ids := array_append(v_pickup_character_ids, v_character_id);
            END IF;
        END LOOP;
        IF cardinality(v_pickup_character_ids) > 8 THEN
            RAISE EXCEPTION '픽업 캐릭터는 최대 8명까지 연결할 수 있습니다.' USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(
            game_id, title, schedule_type, start_date, end_date,
            start_at, end_at, start_at_estimated, end_at_estimated,
            memo, is_official, is_rerun, pickup_character_ids
        )
        VALUES (
            v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date,
            v_request.start_at, v_request.end_at, v_request.start_at_estimated, v_request.end_at_estimated,
            v_request.memo, v_request.is_official, v_request.is_rerun, v_pickup_character_ids
        );
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date,
            start_at = v_request.start_at, end_at = v_request.end_at,
            start_at_estimated = v_request.start_at_estimated, end_at_estimated = v_request.end_at_estimated,
            memo = v_request.memo,
            is_official = v_request.is_official, is_rerun = v_request.is_rerun,
            pickup_character_ids = v_pickup_character_ids,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '일정 요청이 승인되었습니다',
        '요청하신 일정이 반영되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID) TO authenticated;

COMMIT;
