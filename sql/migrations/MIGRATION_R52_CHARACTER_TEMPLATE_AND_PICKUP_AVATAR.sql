-- R52: dynamic per-game character templates and pickup character references.
BEGIN;

-- Abort before replacing the CHECK-backed validator if stored rows violate the new shape.
DO $$
DECLARE v_ids TEXT;
BEGIN
 SELECT string_agg(id::text, ', ' ORDER BY id) INTO v_ids
 FROM public.games
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

ALTER TABLE public.game_schedules ADD COLUMN IF NOT EXISTS pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.game_schedules ADD COLUMN IF NOT EXISTS pickup_image_url TEXT;
ALTER TABLE public.schedule_requests ADD COLUMN IF NOT EXISTS pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.schedule_requests ADD COLUMN IF NOT EXISTS pickup_image_url TEXT;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.game_schedules'::regclass AND conname='chk_game_schedules_pickup_characters_only_pickup') THEN
  ALTER TABLE public.game_schedules ADD CONSTRAINT chk_game_schedules_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids) <= 8 AND (cardinality(pickup_character_ids)=0 OR schedule_type='PICKUP'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.game_schedules'::regclass AND conname='chk_game_schedules_pickup_image_valid') THEN
  ALTER TABLE public.game_schedules ADD CONSTRAINT chk_game_schedules_pickup_image_valid CHECK (pickup_image_url IS NULL OR (schedule_type='PICKUP' AND length(pickup_image_url)<=30000 AND pickup_image_url LIKE 'data:image/webp;base64,%'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.game_schedules'::regclass AND conname='chk_game_schedules_pickup_mode_exclusive') THEN
  ALTER TABLE public.game_schedules ADD CONSTRAINT chk_game_schedules_pickup_mode_exclusive CHECK (cardinality(pickup_character_ids)=0 OR pickup_image_url IS NULL);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_requests'::regclass AND conname='chk_schedule_requests_pickup_characters_only_pickup') THEN
  ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids) <= 8 AND (cardinality(pickup_character_ids)=0 OR schedule_type='PICKUP'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_requests'::regclass AND conname='chk_schedule_requests_pickup_image_valid') THEN
  ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_image_valid CHECK (pickup_image_url IS NULL OR (schedule_type='PICKUP' AND length(pickup_image_url)<=30000 AND pickup_image_url LIKE 'data:image/webp;base64,%'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_requests'::regclass AND conname='chk_schedule_requests_pickup_mode_exclusive') THEN
  ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_mode_exclusive CHECK (cardinality(pickup_character_ids)=0 OR pickup_image_url IS NULL);
 END IF;
END $$;

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

CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
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
    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo, is_official, is_rerun, pickup_character_ids, pickup_image_url)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo, v_request.is_official, v_request.is_rerun,
            CASE WHEN v_request.schedule_type = 'PICKUP' THEN ARRAY(SELECT c.id FROM unnest(v_request.pickup_character_ids) WITH ORDINALITY AS u(id, ord) JOIN public.game_characters c ON c.id=u.id AND c.game_id=v_request.game_id ORDER BY u.ord) ELSE '{}'::uuid[] END,
            CASE WHEN v_request.schedule_type = 'PICKUP' THEN v_request.pickup_image_url ELSE NULL END);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            is_official = v_request.is_official, is_rerun = v_request.is_rerun,
            pickup_character_ids = CASE WHEN v_request.schedule_type = 'PICKUP' THEN ARRAY(SELECT c.id FROM unnest(v_request.pickup_character_ids) WITH ORDINALITY AS u(id, ord) JOIN public.game_characters c ON c.id=u.id AND c.game_id=v_request.game_id ORDER BY u.ord) ELSE '{}'::uuid[] END,
            pickup_image_url = CASE WHEN v_request.schedule_type = 'PICKUP' THEN v_request.pickup_image_url ELSE NULL END,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON public.game_characters FROM anon;
GRANT SELECT (id, game_id, name, default_icon_url, rarity, attributes) ON public.game_characters TO anon;
DROP POLICY IF EXISTS "Allow anon read game characters" ON public.game_characters;
CREATE POLICY "Allow anon read game characters" ON public.game_characters FOR SELECT TO anon USING (true);

COMMIT;
