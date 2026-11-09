-- R52 Amendment A1: pickup-only catalog characters and request proposals.
BEGIN;

-- Stop before strengthening the CHECK-backed template validator when legacy rows need cleanup.
DO $$ DECLARE v_ids TEXT; BEGIN
 SELECT string_agg(id::text, ', ' ORDER BY id) INTO v_ids FROM public.games
 WHERE jsonb_array_length(classification_schema -> 'axes') > 2
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(classification_schema -> 'rarities') r(value)
               WHERE jsonb_typeof(r.value) <> 'string' OR length(r.value #>> '{}') NOT BETWEEN 1 AND 20)
    OR (classification_schema ? 'character_label' AND
        (jsonb_typeof(classification_schema -> 'character_label') <> 'string'
         OR length(btrim(classification_schema ->> 'character_label')) NOT BETWEEN 1 AND 20));
 IF v_ids IS NOT NULL THEN RAISE EXCEPTION 'R52 classification schema cleanup required for game IDs: %', v_ids; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_valid_classification_schema(p_schema JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
    v_rarity JSONB;
    v_axis JSONB;
    v_option JSONB;
    v_seen_keys TEXT[] := ARRAY[]::TEXT[];
    v_seen_options TEXT[];
    v_value TEXT;
BEGIN
    IF jsonb_typeof(p_schema) <> 'object'
       OR jsonb_typeof(p_schema -> 'rarities') <> 'array'
       OR jsonb_typeof(p_schema -> 'axes') <> 'array'
       OR jsonb_array_length(p_schema -> 'rarities') > 10
       OR jsonb_array_length(p_schema -> 'axes') > 2
       OR (p_schema ? 'character_label' AND (jsonb_typeof(p_schema -> 'character_label') <> 'string' OR length(btrim(p_schema ->> 'character_label')) NOT BETWEEN 1 AND 20)) THEN
        RETURN false;
    END IF;

    v_seen_options := ARRAY[]::TEXT[];
    FOR v_rarity IN SELECT value FROM jsonb_array_elements(p_schema -> 'rarities') AS item(value) LOOP
        IF jsonb_typeof(v_rarity) <> 'string' THEN RETURN false; END IF;
        v_value := v_rarity #>> '{}';
        IF length(btrim(v_value)) = 0 OR length(v_value) > 20 OR v_value = ANY(v_seen_options) THEN RETURN false; END IF;
        v_seen_options := array_append(v_seen_options, v_value);
    END LOOP;

    FOR v_axis IN SELECT value FROM jsonb_array_elements(p_schema -> 'axes') AS item(value) LOOP
        IF jsonb_typeof(v_axis) <> 'object'
           OR jsonb_typeof(v_axis -> 'key') <> 'string'
           OR jsonb_typeof(v_axis -> 'label') <> 'string'
           OR jsonb_typeof(v_axis -> 'options') <> 'array' THEN
            RETURN false;
        END IF;
        v_value := v_axis ->> 'key';
        IF v_value !~ '^[a-z0-9_]{1,24}$' OR v_value = ANY(v_seen_keys) THEN RETURN false; END IF;
        v_seen_keys := array_append(v_seen_keys, v_value);
        v_value := v_axis ->> 'label';
        IF length(btrim(v_value)) < 1 OR length(v_value) > 30 THEN RETURN false; END IF;
        IF jsonb_array_length(v_axis -> 'options') < 1 OR jsonb_array_length(v_axis -> 'options') > 20 THEN
            RETURN false;
        END IF;
        v_seen_options := ARRAY[]::TEXT[];
        FOR v_option IN SELECT value FROM jsonb_array_elements(v_axis -> 'options') AS item(value) LOOP
            IF jsonb_typeof(v_option) <> 'string' THEN RETURN false; END IF;
            v_value := v_option #>> '{}';
            IF length(btrim(v_value)) = 0 OR v_value = ANY(v_seen_options) THEN RETURN false; END IF;
            v_seen_options := array_append(v_seen_options, v_value);
        END LOOP;
    END LOOP;
    RETURN true;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$$;

ALTER TABLE public.game_characters ADD COLUMN IF NOT EXISTS is_pickup_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.game_characters ALTER COLUMN default_icon_url DROP NOT NULL;
ALTER TABLE public.game_schedules ADD COLUMN IF NOT EXISTS pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.schedule_requests ADD COLUMN IF NOT EXISTS pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.game_characters DROP CONSTRAINT IF EXISTS game_characters_default_icon_url_check;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.game_characters'::regclass AND conname='chk_game_characters_icon_valid') THEN
  ALTER TABLE public.game_characters ADD CONSTRAINT chk_game_characters_icon_valid CHECK (default_icon_url IS NULL OR (length(default_icon_url)<=150000 AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%')));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.game_characters'::regclass AND conname='chk_game_characters_icon_or_pickup_only') THEN
  ALTER TABLE public.game_characters ADD CONSTRAINT chk_game_characters_icon_or_pickup_only CHECK (default_icon_url IS NOT NULL OR is_pickup_only);
 END IF;
END $$;

ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS chk_game_schedules_pickup_image_valid;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS chk_game_schedules_pickup_mode_exclusive;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS chk_game_schedules_pickup_characters_only_pickup;
ALTER TABLE public.game_schedules DROP COLUMN IF EXISTS pickup_image_url;
ALTER TABLE public.game_schedules ADD CONSTRAINT chk_game_schedules_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids)=0 OR (schedule_type='PICKUP' AND cardinality(pickup_character_ids)<=8));

ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_requests_pickup_image_valid;
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_requests_pickup_mode_exclusive;
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_requests_pickup_characters_only_pickup;
ALTER TABLE public.schedule_requests DROP COLUMN IF EXISTS pickup_image_url;
ALTER TABLE public.schedule_requests ADD COLUMN IF NOT EXISTS pickup_new_characters JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids)=0 OR (schedule_type='PICKUP' AND cardinality(pickup_character_ids)<=8));

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
            IF length(v_icon) > 150000 OR v_icon NOT LIKE 'data:image/webp;base64,%' THEN RETURN false; END IF;
        END IF;
    END LOOP;
    RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END;
$$;

ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_requests_pickup_new_characters_valid;
ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_new_characters_valid
 CHECK (public.is_valid_pickup_new_characters(pickup_new_characters)
   AND (schedule_type='PICKUP' OR jsonb_array_length(pickup_new_characters)=0)
   AND cardinality(pickup_character_ids)+jsonb_array_length(pickup_new_characters)<=8);

CREATE OR REPLACE FUNCTION public.validate_schedule_pickup_characters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids UUID[];
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.pickup_character_ids IS NOT DISTINCT FROM OLD.pickup_character_ids AND NEW.game_id IS NOT DISTINCT FROM OLD.game_id THEN
        RETURN NEW;
    END IF;
    v_ids := NEW.pickup_character_ids;
    IF array_position(v_ids, NULL) IS NOT NULL
       OR cardinality(v_ids) <> cardinality(ARRAY(SELECT DISTINCT item.id FROM unnest(v_ids) AS item(id)))
       OR EXISTS (SELECT 1 FROM unnest(v_ids) AS item(id) LEFT JOIN public.game_characters c ON c.id=item.id AND c.game_id=NEW.game_id WHERE c.id IS NULL) THEN
        RAISE EXCEPTION '픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_game_schedule_pickup_characters ON public.game_schedules;
CREATE TRIGGER trg_validate_game_schedule_pickup_characters BEFORE INSERT OR UPDATE ON public.game_schedules FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_pickup_characters();
DROP TRIGGER IF EXISTS trg_validate_schedule_request_pickup_characters ON public.schedule_requests;
CREATE TRIGGER trg_validate_schedule_request_pickup_characters BEFORE INSERT OR UPDATE ON public.schedule_requests FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_pickup_characters();

CREATE OR REPLACE FUNCTION public.validate_user_character_game()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game_id UUID; v_max_breakthrough SMALLINT; v_is_pickup_only BOOLEAN;
BEGIN
    SELECT game_id, is_pickup_only INTO v_game_id, v_is_pickup_only FROM public.game_characters WHERE id = NEW.character_id;
    IF NOT FOUND OR v_game_id IS DISTINCT FROM NEW.game_id OR v_is_pickup_only THEN
        RAISE EXCEPTION '정식 캐릭터만 보유 목록에 등록할 수 있습니다.';
    END IF;
    SELECT max_breakthrough INTO v_max_breakthrough FROM public.games WHERE id = NEW.game_id;
    IF TG_OP = 'INSERT' OR NEW.game_id IS DISTINCT FROM OLD.game_id
       OR NEW.breakthrough_level > OLD.breakthrough_level THEN
        IF NEW.breakthrough_level > v_max_breakthrough THEN
            RAISE EXCEPTION '캐릭터 돌파 단계가 게임의 최대 돌파 단계를 초과합니다.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_character_preset()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max_slots SMALLINT; v_character_count INTEGER;
BEGIN
    SELECT max_preset_slots INTO v_max_slots FROM public.games WHERE id = NEW.game_id;
    IF NOT FOUND THEN RETURN NEW; END IF; -- game deletion cascade is in progress; FK decides the outcome.
    IF TG_OP = 'INSERT' OR NEW.game_id IS DISTINCT FROM OLD.game_id
       OR cardinality(NEW.character_ids) > cardinality(OLD.character_ids) THEN
        IF cardinality(NEW.character_ids) > v_max_slots THEN
            RAISE EXCEPTION '프리셋 슬롯 수가 게임의 최대 슬롯 수를 초과합니다.';
        END IF;
    END IF;
    IF cardinality(NEW.character_ids) <> cardinality(ARRAY(SELECT DISTINCT item.character_id FROM unnest(NEW.character_ids) AS item(character_id))) THEN
        RAISE EXCEPTION '프리셋에 중복 캐릭터를 추가할 수 없습니다.';
    END IF;
    SELECT count(*) INTO v_character_count FROM public.game_characters
    WHERE game_id = NEW.game_id AND id = ANY(NEW.character_ids) AND NOT is_pickup_only;
    IF v_character_count <> cardinality(NEW.character_ids) THEN
        RAISE EXCEPTION '프리셋에는 같은 게임의 정식 캐릭터만 배치할 수 있습니다.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_game_character_pickup_only_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.is_pickup_only AND NOT OLD.is_pickup_only
       AND (EXISTS (SELECT 1 FROM public.user_characters WHERE character_id = OLD.id)
            OR EXISTS (SELECT 1 FROM public.user_character_presets WHERE OLD.id = ANY(character_ids))) THEN
        RAISE EXCEPTION '사용자 보유 또는 프리셋에서 참조 중인 정식 캐릭터는 픽업 전용으로 변경할 수 없습니다.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_character_request_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game_id UUID; v_is_pickup_only BOOLEAN;
BEGIN
    IF NEW.target_character_id IS NULL THEN RETURN NEW; END IF;
    SELECT game_id, is_pickup_only INTO v_game_id, v_is_pickup_only FROM public.game_characters WHERE id = NEW.target_character_id;
    IF NOT FOUND OR v_game_id IS DISTINCT FROM NEW.game_id OR v_is_pickup_only THEN
        RAISE EXCEPTION '정식 캐릭터만 수정 요청 대상으로 선택할 수 있습니다.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_game_character_pickup_only_transition ON public.game_characters;
CREATE TRIGGER trg_guard_game_character_pickup_only_transition BEFORE UPDATE OF is_pickup_only ON public.game_characters FOR EACH ROW EXECUTE FUNCTION public.guard_game_character_pickup_only_transition();
DROP TRIGGER IF EXISTS trg_validate_character_request_target ON public.character_requests;
CREATE TRIGGER trg_validate_character_request_target BEFORE INSERT OR UPDATE OF game_id,target_character_id ON public.character_requests FOR EACH ROW EXECUTE FUNCTION public.validate_character_request_target();

CREATE OR REPLACE FUNCTION public.cleanup_deleted_game_character_presets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.user_character_presets
    WHERE game_id = OLD.game_id AND OLD.id = ANY(character_ids) AND cardinality(array_remove(character_ids, OLD.id)) = 0;
    UPDATE public.user_character_presets
    SET character_ids = array_remove(character_ids, OLD.id), updated_at = NOW()
    WHERE game_id = OLD.game_id AND OLD.id = ANY(character_ids);
    UPDATE public.game_schedules SET pickup_character_ids = array_remove(pickup_character_ids, OLD.id), updated_at = NOW()
    WHERE game_id = OLD.game_id AND OLD.id = ANY(pickup_character_ids);
    UPDATE public.schedule_requests SET pickup_character_ids = array_remove(pickup_character_ids, OLD.id)
    WHERE game_id = OLD.game_id AND request_status = 'PENDING' AND OLD.id = ANY(pickup_character_ids);
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_deleted_game_character_presets ON public.game_characters;
CREATE TRIGGER trg_cleanup_deleted_game_character_presets AFTER DELETE ON public.game_characters FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_game_character_presets();
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
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo, is_official, is_rerun, pickup_character_ids)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo,
            v_request.is_official, v_request.is_rerun, v_pickup_character_ids);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            is_official = v_request.is_official, is_rerun = v_request.is_rerun,
            pickup_character_ids = v_pickup_character_ids,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON public.game_characters FROM anon;
GRANT SELECT (id, game_id, name, default_icon_url, rarity, attributes, is_pickup_only) ON public.game_characters TO anon;
REVOKE ALL ON public.user_characters, public.user_character_presets, public.character_requests, public.schedule_requests FROM anon;
DROP POLICY IF EXISTS "Allow anon read game characters" ON public.game_characters;
CREATE POLICY "Allow anon read game characters" ON public.game_characters FOR SELECT TO anon USING (true);

COMMIT;
