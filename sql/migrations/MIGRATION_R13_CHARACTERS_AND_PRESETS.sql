-- R13 character roster, requests, and party presets.
-- Safe to re-run on an existing ChronoLedger schema.
BEGIN;

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
       OR jsonb_array_length(p_schema -> 'axes') > 3 THEN
        RETURN false;
    END IF;

    v_seen_options := ARRAY[]::TEXT[];
    FOR v_rarity IN SELECT value FROM jsonb_array_elements(p_schema -> 'rarities') AS item(value) LOOP
        IF jsonb_typeof(v_rarity) <> 'string' THEN RETURN false; END IF;
        v_value := v_rarity #>> '{}';
        IF length(btrim(v_value)) = 0 OR v_value = ANY(v_seen_options) THEN RETURN false; END IF;
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

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS max_preset_slots SMALLINT NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS classification_schema JSONB NOT NULL DEFAULT '{"rarities": [], "axes": []}'::jsonb;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.games'::regclass AND conname = 'games_max_preset_slots_check') THEN
        ALTER TABLE public.games ADD CONSTRAINT games_max_preset_slots_check CHECK (max_preset_slots BETWEEN 1 AND 12);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.games'::regclass AND conname = 'games_classification_schema_check') THEN
        ALTER TABLE public.games ADD CONSTRAINT games_classification_schema_check CHECK (public.is_valid_classification_schema(classification_schema));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.game_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    default_icon_url TEXT NOT NULL CHECK (length(default_icon_url) <= 150000 AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%')),
    rarity VARCHAR(30),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_game_characters_game_name UNIQUE (game_id, name)
);
CREATE INDEX IF NOT EXISTS idx_game_characters_game_id ON public.game_characters(game_id);

CREATE TABLE IF NOT EXISTS public.character_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    target_character_id UUID REFERENCES public.game_characters(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    default_icon_url TEXT CHECK (default_icon_url IS NULL OR (length(default_icon_url) <= 150000 AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%'))),
    rarity VARCHAR(30),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
    memo VARCHAR(500),
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_memo TEXT,
    approved_character_id UUID REFERENCES public.game_characters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_requests_status ON public.character_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_character_requests_user_id ON public.character_requests(user_id);

CREATE TABLE IF NOT EXISTS public.user_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.game_characters(id) ON DELETE CASCADE,
    is_owned BOOLEAN NOT NULL DEFAULT true,
    custom_icon_path TEXT CHECK (custom_icon_path IS NULL OR custom_icon_path = user_id::text || '/characters/' || character_id::text || '.webp'),
    memo VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_characters_user_character UNIQUE (user_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_user_characters_user_game ON public.user_characters(user_id, game_id);

CREATE TABLE IF NOT EXISTS public.user_character_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL CHECK (btrim(title) <> ''),
    character_ids UUID[] NOT NULL CHECK (cardinality(character_ids) BETWEEN 1 AND 12 AND array_position(character_ids, NULL) IS NULL),
    memo VARCHAR(300),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_character_presets_user_game ON public.user_character_presets(user_id, game_id);

CREATE OR REPLACE FUNCTION public.validate_user_character_game()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game_id UUID;
BEGIN
    SELECT game_id INTO v_game_id FROM public.game_characters WHERE id = NEW.character_id;
    IF NOT FOUND OR v_game_id IS DISTINCT FROM NEW.game_id THEN
        RAISE EXCEPTION '캐릭터가 선택한 게임에 속하지 않습니다.';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_user_character_game ON public.user_characters;
CREATE TRIGGER trg_validate_user_character_game BEFORE INSERT OR UPDATE ON public.user_characters
FOR EACH ROW EXECUTE FUNCTION public.validate_user_character_game();

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
    WHERE game_id = NEW.game_id AND id = ANY(NEW.character_ids);
    IF v_character_count <> cardinality(NEW.character_ids) THEN
        RAISE EXCEPTION '프리셋 캐릭터는 같은 게임의 카탈로그에 있어야 합니다.';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_user_character_preset ON public.user_character_presets;
CREATE TRIGGER trg_validate_user_character_preset BEFORE INSERT OR UPDATE ON public.user_character_presets
FOR EACH ROW EXECUTE FUNCTION public.validate_user_character_preset();

CREATE OR REPLACE FUNCTION public.cleanup_deleted_game_character_presets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.user_character_presets
    WHERE game_id = OLD.game_id AND OLD.id = ANY(character_ids) AND cardinality(array_remove(character_ids, OLD.id)) = 0;
    UPDATE public.user_character_presets
    SET character_ids = array_remove(character_ids, OLD.id), updated_at = NOW()
    WHERE game_id = OLD.game_id AND OLD.id = ANY(character_ids);
    RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_cleanup_deleted_game_character_presets ON public.game_characters;
CREATE TRIGGER trg_cleanup_deleted_game_character_presets AFTER DELETE ON public.game_characters
FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_game_character_presets();

CREATE OR REPLACE FUNCTION public.approve_character_request(p_request_id UUID, p_default_icon_url TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_request public.character_requests%ROWTYPE;
    v_game_schema JSONB;
    v_icon_url TEXT;
    v_character_id UUID;
    v_is_admin BOOLEAN;
    v_attr RECORD;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_request FROM public.character_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 캐릭터 요청이 아닙니다.';
    END IF;
    SELECT classification_schema INTO v_game_schema FROM public.games WHERE id = v_request.game_id;
    IF NOT FOUND THEN RAISE EXCEPTION '게임을 찾을 수 없습니다.'; END IF;

    IF v_request.rarity IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_game_schema -> 'rarities') AS rarity(value)
        WHERE rarity.value = v_request.rarity
    ) THEN
        RAISE EXCEPTION '게임 분류 스키마에 없는 성급입니다.';
    END IF;
    FOR v_attr IN SELECT key, value FROM jsonb_each_text(v_request.attributes) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_game_schema -> 'axes') AS axis(value)
            CROSS JOIN LATERAL jsonb_array_elements_text(axis.value -> 'options') AS option(value)
            WHERE axis.value ->> 'key' = v_attr.key AND option.value = v_attr.value
        ) THEN
            RAISE EXCEPTION '게임 분류 스키마에 없는 분류 값입니다: %', v_attr.key;
        END IF;
    END LOOP;

    IF v_request.target_character_id IS NULL THEN
        v_icon_url := coalesce(nullif(btrim(p_default_icon_url), ''), nullif(btrim(v_request.default_icon_url), ''));
        IF v_icon_url IS NULL THEN RAISE EXCEPTION '캐릭터 아이콘이 필요합니다.'; END IF;
        INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes, created_by)
        VALUES (v_request.game_id, v_request.name, v_icon_url, v_request.rarity, v_request.attributes, auth.uid())
        RETURNING id INTO v_character_id;
    ELSE
        UPDATE public.game_characters
        SET name = v_request.name,
            default_icon_url = coalesce(nullif(btrim(p_default_icon_url), ''), nullif(btrim(v_request.default_icon_url), ''), default_icon_url),
            rarity = v_request.rarity,
            attributes = v_request.attributes,
            updated_at = NOW()
        WHERE id = v_request.target_character_id AND game_id = v_request.game_id
        RETURNING id INTO v_character_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 캐릭터가 같은 게임에 없습니다.'; END IF;
    END IF;
    UPDATE public.character_requests SET request_status = 'APPROVED', approved_character_id = v_character_id
    WHERE id = p_request_id;
    RETURN v_character_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_character_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin BOOLEAN;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    UPDATE public.character_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 캐릭터 요청이 아닙니다.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_character_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_character_request(UUID, TEXT) TO authenticated;

ALTER TABLE public.game_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_character_presets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_characters, public.character_requests, public.user_characters, public.user_character_presets TO authenticated;

DROP POLICY IF EXISTS "Users read game characters" ON public.game_characters;
CREATE POLICY "Users read game characters" ON public.game_characters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage game characters" ON public.game_characters;
CREATE POLICY "Admin manage game characters" ON public.game_characters FOR ALL TO authenticated
    USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
DROP POLICY IF EXISTS "Users insert own character requests" ON public.character_requests;
CREATE POLICY "Users insert own character requests" ON public.character_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_character_id IS NULL);
DROP POLICY IF EXISTS "Users read own character requests" ON public.character_requests;
CREATE POLICY "Users read own character requests" ON public.character_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin manage character requests" ON public.character_requests;
CREATE POLICY "Admin manage character requests" ON public.character_requests FOR ALL TO authenticated
    USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
DROP POLICY IF EXISTS "Manage own user characters" ON public.user_characters;
CREATE POLICY "Manage own user characters" ON public.user_characters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Manage own character presets" ON public.user_character_presets;
CREATE POLICY "Manage own character presets" ON public.user_character_presets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
DECLARE v_table TEXT; v_policy TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY['character_requests', 'user_characters', 'user_character_presets'] LOOP
        v_policy := 'Block account deletion users from ' || v_table;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, v_table);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_deletion_is_pending(auth.uid())) WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()))', v_policy, v_table);
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'block_pending_account_deletion_' || v_table, v_table);
        EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations()', 'block_pending_account_deletion_' || v_table, v_table);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.purge_expired_account_deletion_requests(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE v_req RECORD; v_purged_count INTEGER := 0;
BEGIN
    FOR v_req IN
        SELECT id, user_id FROM public.account_deletion_requests
        WHERE status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'AUTH_DELETE_PENDING')
          AND retry_after <= NOW() AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at ASC FOR UPDATE SKIP LOCKED LIMIT p_limit
    LOOP
        UPDATE public.account_deletion_requests SET locked_until = NOW() + INTERVAL '5 minutes', attempt_count = attempt_count + 1, updated_at = NOW() WHERE id = v_req.id;
        IF v_req.user_id IS NOT NULL THEN
            DELETE FROM storage.objects WHERE bucket_id = 'user-icons' AND (name LIKE v_req.user_id || '/%' OR (path_tokens IS NOT NULL AND path_tokens[1] = v_req.user_id::text));
            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.character_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.expenses WHERE user_id = v_req.user_id;
            DELETE FROM public.subscription_templates WHERE user_id = v_req.user_id;
            DELETE FROM public.personal_memos WHERE user_id = v_req.user_id;
            DELETE FROM public.user_character_presets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_characters WHERE user_id = v_req.user_id;
            DELETE FROM public.user_games WHERE user_id = v_req.user_id;
            DELETE FROM public.monthly_budgets WHERE user_id = v_req.user_id;
            DELETE FROM public.store_wallets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_finances WHERE user_id = v_req.user_id;
            DELETE FROM auth.users WHERE id = v_req.user_id;
        END IF;
        UPDATE public.account_deletion_requests SET status = 'COMPLETED', storage_completed_at = NOW(), data_completed_at = NOW(), user_id = NULL, locked_until = NULL, last_error_code = NULL, updated_at = NOW() WHERE id = v_req.id;
        v_purged_count := v_purged_count + 1;
    END LOOP;
    RETURN v_purged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, storage;
REVOKE ALL ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) TO service_role;

COMMIT;
