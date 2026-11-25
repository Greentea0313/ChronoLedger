-- R109: 공용 게임·캐릭터 아이콘 Storage 이전 (공개 읽기 game-assets 버킷)
-- 1) game-assets 버킷(공개, 102,400 bytes, image/webp) 생성·설정 동기화.
-- 2) storage.objects 정책: game-assets 공개 읽기(anon·authenticated) + 관리자 전용 INSERT/UPDATE/DELETE
--    (경로: games/{sha256}.webp 또는 characters/{game_id}/{sha256}.webp). user-icons 정책은 변경하지 않는다.
--    계정 삭제 대기 사용자 차단은 기존 RESTRICTIVE 정책 "Block account deletion users from storage"가 그대로 적용된다.
-- 3) is_valid_pickup_new_characters: 픽업 신규 캐릭터 제안 icon_url에 https:// 주소 허용(game_characters CHECK와 일치).
-- 4) approve_schedule_request: 구 1인자 오버로드 제거 후 (UUID, JSONB DEFAULT NULL)로 교체.
--    p_pickup_icon_overrides { "<캐릭터 이름>": "<아이콘 URL>" }가 있으면 제안 icon_url보다 우선한다.
-- 선행 조건: MIGRATION_R85_SCHEDULE_TIMES.sql 적용 이후 실행한다. 재실행 안전.
-- approve_schedule_request를 재정의하는 구버전 마이그레이션(R85·R84·R52·R33·UNOFFICIAL_SCHEDULES)이나
-- is_valid_pickup_new_characters를 재정의하는 MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql을
-- 이후 재실행했다면 이 파일도 다시 실행해야 한다(1인자 오버로드가 다시 생기면 호출이 모호해짐).
BEGIN;

-- 1) game-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('game-assets', 'game-assets', true, 102400, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) storage.objects policies for game-assets
DROP POLICY IF EXISTS "Public read game assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert game assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update game assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete game assets" ON storage.objects;

CREATE POLICY "Public read game assets" ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'game-assets');

CREATE POLICY "Admins insert game assets" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'game-assets'
        AND (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
             OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
        AND position('..' IN name) = 0
        AND (((storage.foldername(name))[1] = 'games' AND array_length(storage.foldername(name), 1) = 1 AND name ~ '^games/[0-9a-f]{64}\.webp$')
             OR ((storage.foldername(name))[1] = 'characters' AND array_length(storage.foldername(name), 1) = 2 AND name ~ '^characters/[0-9a-f-]{36}/[0-9a-f]{64}\.webp$'))
    );

CREATE POLICY "Admins update game assets" ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'game-assets'
        AND (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
             OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
        AND position('..' IN name) = 0
        AND (((storage.foldername(name))[1] = 'games' AND array_length(storage.foldername(name), 1) = 1 AND name ~ '^games/[0-9a-f]{64}\.webp$')
             OR ((storage.foldername(name))[1] = 'characters' AND array_length(storage.foldername(name), 1) = 2 AND name ~ '^characters/[0-9a-f-]{36}/[0-9a-f]{64}\.webp$'))
    )
    WITH CHECK (
        bucket_id = 'game-assets'
        AND (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
             OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
        AND position('..' IN name) = 0
        AND (((storage.foldername(name))[1] = 'games' AND array_length(storage.foldername(name), 1) = 1 AND name ~ '^games/[0-9a-f]{64}\.webp$')
             OR ((storage.foldername(name))[1] = 'characters' AND array_length(storage.foldername(name), 1) = 2 AND name ~ '^characters/[0-9a-f-]{36}/[0-9a-f]{64}\.webp$'))
    );

CREATE POLICY "Admins delete game assets" ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'game-assets'
        AND (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
             OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
        AND position('..' IN name) = 0
        AND (((storage.foldername(name))[1] = 'games' AND array_length(storage.foldername(name), 1) = 1 AND name ~ '^games/[0-9a-f]{64}\.webp$')
             OR ((storage.foldername(name))[1] = 'characters' AND array_length(storage.foldername(name), 1) = 2 AND name ~ '^characters/[0-9a-f-]{36}/[0-9a-f]{64}\.webp$'))
    );

-- 3) Pickup proposal validator accepts https:// icon URLs
CREATE OR REPLACE FUNCTION public.is_valid_pickup_new_characters(p_characters JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_item JSONB; v_name TEXT; v_icon TEXT; v_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF jsonb_typeof(p_characters) <> 'array' OR jsonb_array_length(p_characters) > 8 THEN RETURN false; END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_characters) AS item(value) LOOP
        IF jsonb_typeof(v_item) <> 'object' OR jsonb_typeof(v_item -> 'name') <> 'string' OR NOT (v_item ? 'icon_url') THEN RETURN false; END IF;
        v_name := btrim(v_item ->> 'name');
        IF length(v_name) < 1 OR length(v_name) > 100 OR v_name = ANY(v_names) THEN RETURN false; END IF;
        v_names := array_append(v_names, v_name);
        IF v_item ? 'icon_url' AND jsonb_typeof(v_item -> 'icon_url') <> 'null' THEN
            IF jsonb_typeof(v_item -> 'icon_url') <> 'string' THEN RETURN false; END IF;
            v_icon := v_item ->> 'icon_url';
            IF length(v_icon) > 150000 OR NOT (v_icon LIKE 'data:image/webp;base64,%' OR v_icon LIKE 'https://%') THEN RETURN false; END IF;
        END IF;
    END LOOP;
    RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END;
$$;

-- 4) approve_schedule_request with optional pickup icon overrides
DROP FUNCTION IF EXISTS public.approve_schedule_request(UUID);

CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID, p_pickup_icon_overrides JSONB DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
    v_pickup_character_ids UUID[] := '{}'::uuid[];
    v_proposal JSONB;
    v_character_id UUID;
    v_character_name TEXT;
    v_icon_url TEXT;
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
            -- R109: an admin-uploaded Storage URL replaces the proposal's Data URL icon.
            IF jsonb_typeof(p_pickup_icon_overrides) = 'object'
               AND jsonb_typeof(p_pickup_icon_overrides -> v_character_name) = 'string' THEN
                v_icon_url := nullif(p_pickup_icon_overrides ->> v_character_name, '');
                IF v_icon_url IS NOT NULL AND NOT (
                    length(v_icon_url) <= 150000
                    AND (v_icon_url LIKE 'https://%' OR v_icon_url LIKE 'data:image/webp;base64,%')
                ) THEN
                    RAISE EXCEPTION '픽업 캐릭터 아이콘 주소가 올바르지 않습니다.' USING ERRCODE = 'check_violation';
                END IF;
            ELSE
                v_icon_url := v_proposal ->> 'icon_url';
            END IF;
            SELECT id INTO v_character_id FROM public.game_characters
            WHERE game_id = v_request.game_id AND name = v_character_name;
            IF NOT FOUND THEN
                INSERT INTO public.game_characters(game_id, name, default_icon_url, is_pickup_only, created_by)
                VALUES (v_request.game_id, v_character_name, v_icon_url, true, auth.uid())
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

REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID, JSONB) TO authenticated;

COMMIT;
