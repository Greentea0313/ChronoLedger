-- ==============================================================================
-- SCHEMA.sql (통합 마스터: 핵심 테이블, RPC, 트리거, RLS, pg_cron 스케줄)
-- 신규(빈) Supabase 프로젝트 전용. 기존 DB에 재실행하지 말고 sql/migrations/를 사용한다.
-- 실행 순서와 분류는 sql/README.md 참고.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 재정 상태 (총 자산 및 기본 예산, 음수 자산 허용)
CREATE TABLE public.user_finances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_asset BIGINT NOT NULL DEFAULT 0, -- 음수 잔고 허용
    default_budget BIGINT NOT NULL DEFAULT 0 CHECK (default_budget >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1-1. 유저별 수익 내역 (R93). 쓰기는 record_income/delete_income RPC로만 하여 total_asset과 함께 바뀜.
CREATE TABLE public.incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('급여', '용돈', '상여금', '금융수익', '기타')),
    title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
    amount BIGINT NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_incomes_user_date ON public.incomes(user_id, income_date DESC, created_at DESC);

-- 1-2. 기타 건의 요청 (R84). 일반 사용자는 PENDING 등록·본인 조회만 가능하며 답변/상태 변경은 관리자/RPC로 처리.
CREATE TABLE public.feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('기능 제안', '오류 신고', '기타')),
    title VARCHAR(100) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
    content TEXT NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000),
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'ANSWERED', 'CLOSED')),
    admin_answer TEXT CHECK (admin_answer IS NULL OR length(btrim(admin_answer)) <= 2000),
    answered_at TIMESTAMPTZ,
    answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feedback_requests_status ON public.feedback_requests(request_status);
CREATE INDEX idx_feedback_requests_user_id ON public.feedback_requests(user_id, created_at DESC);

-- 1-3. 앱 내 알림함 (R84). 클라이언트 직접 쓰기 금지(RPC·DB 함수 전용), 본인 조회만 허용.
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind VARCHAR(40) NOT NULL CHECK (
        kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
    ),
    title VARCHAR(120) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
    body VARCHAR(300) NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 300),
    link_path TEXT NOT NULL CHECK (link_path ~ '^/' AND link_path !~ '^//' AND length(link_path) <= 200),
    source_id UUID,
    scheduled_for DATE,
    push_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (push_status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
    push_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (push_attempts >= 0),
    pushed_at TIMESTAMPTZ,
    push_claimed_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE UNIQUE INDEX uq_notifications_daily_source
    ON public.notifications(user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL;

-- 1-4. 사용자별 알림 설정 (R39). 행이 없으면 각 알림 기본값 true(push_enabled만 false)로 간주. 본인 조회·등록·수정만 허용(DELETE 불가).
CREATE TABLE public.notification_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_schedule_start BOOLEAN NOT NULL DEFAULT true,
    favorite_schedule_end_d1 BOOLEAN NOT NULL DEFAULT true,
    planned_expense_d1 BOOLEAN NOT NULL DEFAULT true,
    request_result BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1-5. 사용자별 Web Push 기기 구독 (R96). 본인 조회 전용, 등록/해제는 전용 RPC로만 처리.
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(btrim(endpoint)) BETWEEN 12 AND 2048),
    p256dh TEXT NOT NULL CHECK (length(btrim(p256dh)) BETWEEN 40 AND 256),
    auth TEXT NOT NULL CHECK (length(btrim(auth)) BETWEEN 16 AND 128),
    platform VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios_pwa', 'android_pwa')),
    user_agent_label VARCHAR(100) NOT NULL DEFAULT '웹 브라우저' CHECK (length(btrim(user_agent_label)) BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_success_at TIMESTAMPTZ
);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id, created_at DESC);

-- 1-6. Web Push 웹훅 비공개 단일 행 설정 (R96-REV-07). PostgREST 모든 역할 접근 차단, DB 소유자/SQL Editor 전용.
CREATE TABLE public.push_webhook_config (
    id BOOLEAN PRIMARY KEY DEFAULT true
        CONSTRAINT chk_push_webhook_config_singleton CHECK (id = true),
    url TEXT NOT NULL
        CONSTRAINT chk_push_webhook_config_url CHECK (
            char_length(btrim(url)) BETWEEN 12 AND 2048
            AND btrim(url) ~ '^https://'
        ),
    secret TEXT NULL
        CONSTRAINT chk_push_webhook_config_secret CHECK (
            secret IS NULL OR char_length(btrim(secret)) BETWEEN 32 AND 512
        ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 신규 가입 시 기본 재정 및 스토어 지갑을 무음 생성한다.
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_finances(user_id, total_asset, default_budget)
    VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, earn_rate, user_tier)
    VALUES
        (NEW.id, 'GOOGLE_PLAY', 0, 0.10, 'BRONZE'),
        (NEW.id, 'GALAXY_STORE', 0, 0.10, 'GENERAL')
    ON CONFLICT (user_id, platform) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_handle_new_user_setup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 1-1. 사용자 프로필 (역할 및 닉네임). 관리자 RLS 정책이 참조하므로 정책보다 먼저 생성한다.
-- (출처: archive/PHASE9_ADMIN_AND_USERS.sql + archive/FIX_USERS_RLS.sql 최종 정책)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  nickname TEXT,
  show_unofficial_schedules BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 자기 참조 서브쿼리로 인한 무한 재귀를 피하기 위해 SELECT는 인증 사용자 전체 허용
CREATE POLICY "Anyone can view user profiles"
ON public.users FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 본인 프로필 UPDATE는 role 변경을 허용하지 않는다(관리자 판정이 users.role도 인정하므로 자기 승격 차단).
-- 컬럼 단위 GRANT 대신 트리거를 쓰면 이후 GRANT ALL ... TO authenticated가 실행되어도 보호가 유지된다.
CREATE OR REPLACE FUNCTION public.prevent_users_role_self_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND current_user IN ('authenticated', 'anon') THEN
        RAISE EXCEPTION '사용자 역할은 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_users_role_self_change ON public.users;
CREATE TRIGGER trg_prevent_users_role_self_change
BEFORE UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_users_role_self_change();

-- 신규 가입 시 public.users 레코드 자동 생성 (이메일 앞부분을 기본 닉네임으로 사용)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, nickname)
  VALUES (new.id, 'user', split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 스키마 적용 전에 이미 가입된 auth.users 백필
INSERT INTO public.users (id, role, nickname)
SELECT id, 'user', split_part(email, '@', 1) FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. 월별 소비 예산
CREATE TABLE public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    budget_amount BIGINT NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- 3. 공용 게임 마스터 카탈로그
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    default_icon_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status = 'APPROVED'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    max_breakthrough SMALLINT NOT NULL DEFAULT 6 CHECK (max_breakthrough BETWEEN 0 AND 12),
    daily_reset_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_games_daily_reset_time_minute CHECK (daily_reset_time IS NULL OR date_trunc('minute', daily_reset_time) = daily_reset_time)
);

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
    default_icon_url TEXT,
    is_pickup_only BOOLEAN NOT NULL DEFAULT false,
    rarity VARCHAR(30),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_game_characters_game_name UNIQUE (game_id, name),
    CONSTRAINT chk_game_characters_icon_valid CHECK (default_icon_url IS NULL OR (length(default_icon_url) <= 150000 AND (default_icon_url LIKE 'data:image/webp;base64,%' OR default_icon_url LIKE 'https://%')))
);
CREATE INDEX IF NOT EXISTS idx_game_characters_game_id ON public.game_characters(game_id);

CREATE TABLE IF NOT EXISTS public.game_classification_icons (
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    axis_key TEXT NOT NULL,
    option_value TEXT NOT NULL,
    icon_data_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (game_id, axis_key, option_value),
    CONSTRAINT chk_game_classification_icons_axis_key CHECK (axis_key ~ '^[a-z0-9_]{1,24}$'),
    CONSTRAINT chk_game_classification_icons_option CHECK (length(btrim(option_value)) BETWEEN 1 AND 100),
    CONSTRAINT chk_game_classification_icons_icon CHECK (length(icon_data_url) <= 20000 AND icon_data_url LIKE 'data:image/webp;base64,%')
);

CREATE OR REPLACE FUNCTION public.validate_game_classification_icon()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_schema JSONB;
BEGIN
    SELECT classification_schema INTO v_schema FROM public.games WHERE id = NEW.game_id FOR SHARE;
    IF NOT FOUND OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_schema -> 'axes') AS axis(value)
        WHERE axis.value ->> 'key' = NEW.axis_key AND (axis.value -> 'options') ? NEW.option_value
    ) THEN
        RAISE EXCEPTION 'classification option not found' USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_game_classification_icon() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_game_classification_icons()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.game_classification_icons icon
    WHERE icon.game_id = NEW.id
      AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(NEW.classification_schema -> 'axes') AS axis(value)
          WHERE axis.value ->> 'key' = icon.axis_key AND (axis.value -> 'options') ? icon.option_value
      );
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_game_classification_icons() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_game_classification_icon ON public.game_classification_icons;
CREATE TRIGGER trg_validate_game_classification_icon BEFORE INSERT OR UPDATE ON public.game_classification_icons
FOR EACH ROW EXECUTE FUNCTION public.validate_game_classification_icon();
DROP TRIGGER IF EXISTS trg_cleanup_game_classification_icons ON public.games;
CREATE TRIGGER trg_cleanup_game_classification_icons
AFTER UPDATE OF classification_schema ON public.games
FOR EACH ROW WHEN (OLD.classification_schema IS DISTINCT FROM NEW.classification_schema)
EXECUTE FUNCTION public.cleanup_game_classification_icons();

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
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    favorite_sort_order INTEGER,
    breakthrough_level SMALLINT NOT NULL DEFAULT 0 CHECK (breakthrough_level BETWEEN 0 AND 12),
    custom_icon_path TEXT CHECK (custom_icon_path IS NULL OR custom_icon_path = user_id::text || '/characters/' || character_id::text || '.webp'),
    memo VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_characters_user_character UNIQUE (user_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_user_characters_user_game ON public.user_characters(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_user_characters_favorite_order
    ON public.user_characters(user_id, game_id, favorite_sort_order)
    WHERE is_favorite;

CREATE TABLE IF NOT EXISTS public.user_character_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL CHECK (btrim(title) <> ''),
    character_ids UUID[] NOT NULL CONSTRAINT chk_user_character_presets_character_ids CHECK (cardinality(character_ids) BETWEEN 0 AND 12 AND array_position(character_ids, NULL) IS NULL),
    memo VARCHAR(300),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_character_presets_user_game ON public.user_character_presets(user_id, game_id);

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
    IF NOT NEW.is_owned THEN
        NEW.is_favorite := false;
        NEW.favorite_sort_order := NULL;
    ELSIF NOT NEW.is_favorite THEN
        NEW.favorite_sort_order := NULL;
    ELSIF NEW.favorite_sort_order IS NULL THEN
        SELECT COALESCE(MAX(favorite_sort_order), 0) + 1
        INTO NEW.favorite_sort_order
        FROM public.user_characters
        WHERE user_id = NEW.user_id
          AND game_id = NEW.game_id
          AND is_favorite
          AND id IS DISTINCT FROM NEW.id;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_user_character_game ON public.user_characters;
CREATE TRIGGER trg_validate_user_character_game BEFORE INSERT OR UPDATE ON public.user_characters
FOR EACH ROW EXECUTE FUNCTION public.validate_user_character_game();

CREATE OR REPLACE FUNCTION public.reorder_favorite_characters(
    p_game_id UUID,
    p_character_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expected UUID[];
    v_requested UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인한 사용자만 즐겨찾기 순서를 변경할 수 있습니다.';
    END IF;
    IF p_game_id IS NULL OR p_character_ids IS NULL THEN
        RAISE EXCEPTION '게임과 즐겨찾기 캐릭터 목록이 필요합니다.';
    END IF;
    SELECT COALESCE(array_agg(uc.character_id ORDER BY uc.character_id), '{}'::UUID[])
    INTO v_expected
    FROM public.user_characters uc
    WHERE uc.user_id = v_user_id AND uc.game_id = p_game_id
      AND uc.is_owned AND uc.is_favorite;
    SELECT COALESCE(array_agg(item.character_id ORDER BY item.character_id), '{}'::UUID[])
    INTO v_requested
    FROM unnest(p_character_ids) AS item(character_id);
    IF v_requested IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION '즐겨찾기 캐릭터 목록이 현재 상태와 일치하지 않습니다.';
    END IF;
    UPDATE public.user_characters uc
    SET favorite_sort_order = ordered.sort_order, updated_at = NOW()
    FROM unnest(p_character_ids) WITH ORDINALITY AS ordered(character_id, sort_order)
    WHERE uc.user_id = v_user_id AND uc.game_id = p_game_id
      AND uc.character_id = ordered.character_id
      AND uc.is_owned AND uc.is_favorite;
END;
$$;
REVOKE ALL ON FUNCTION public.reorder_favorite_characters(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_favorite_characters(UUID, UUID[]) TO authenticated;

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
DROP TRIGGER IF EXISTS trg_validate_user_character_preset ON public.user_character_presets;
CREATE TRIGGER trg_validate_user_character_preset BEFORE INSERT OR UPDATE ON public.user_character_presets
FOR EACH ROW EXECUTE FUNCTION public.validate_user_character_preset();

CREATE OR REPLACE FUNCTION public.cleanup_deleted_game_character_presets()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
CREATE OR REPLACE FUNCTION public.update_character_preset_slots(p_changes JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_ids UUID[];
    v_id UUID;
    v_game_id UUID;
    v_first_game_id UUID;
    v_expected UUID[];
    v_next UUID[];
    v_current UUID[];
    v_expected_all UUID[] := '{}'::UUID[];
    v_next_all UUID[] := '{}'::UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인한 사용자만 프리셋을 변경할 수 있습니다.';
    END IF;
    IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 2 THEN
        RAISE EXCEPTION '프리셋 변경은 1~2개 행이어야 합니다.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_changes) AS item(value)
        WHERE jsonb_typeof(item.value) IS DISTINCT FROM 'object'
           OR jsonb_typeof(item.value -> 'expected') IS DISTINCT FROM 'array'
           OR jsonb_typeof(item.value -> 'next') IS DISTINCT FROM 'array'
    ) THEN
        RAISE EXCEPTION '프리셋 변경 형식이 올바르지 않습니다.' USING ERRCODE = '22023';
    END IF;

    SELECT array_agg(item.id ORDER BY item.id)
    INTO v_ids
    FROM jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB);
    IF v_ids IS NULL OR array_position(v_ids, NULL) IS NOT NULL
       OR cardinality(v_ids) <> cardinality(ARRAY(SELECT DISTINCT id FROM unnest(v_ids) AS ids(id))) THEN
        RAISE EXCEPTION '프리셋 ID가 중복되었거나 올바르지 않습니다.' USING ERRCODE = '22023';
    END IF;

    -- Lock every target row in id order (PERFORM reads all rows, so both rows are locked; fixed order avoids deadlocks).
    PERFORM 1 FROM public.user_character_presets
    WHERE id = ANY(v_ids) AND user_id = v_user_id
    ORDER BY id
    FOR UPDATE;

    FOR v_id, v_expected, v_next IN
        SELECT item.id,
               ARRAY(SELECT e.value::UUID FROM jsonb_array_elements_text(item.expected) WITH ORDINALITY AS e(value, ord) ORDER BY e.ord),
               ARRAY(SELECT n.value::UUID FROM jsonb_array_elements_text(item.next) WITH ORDINALITY AS n(value, ord) ORDER BY n.ord)
        FROM jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB)
        ORDER BY item.id
    LOOP
        SELECT character_ids, game_id INTO v_current, v_game_id
        FROM public.user_character_presets
        WHERE id = v_id AND user_id = v_user_id;
        IF NOT FOUND OR v_current IS DISTINCT FROM v_expected THEN
            RAISE EXCEPTION 'preset changed' USING ERRCODE = '40001';
        END IF;
        IF v_first_game_id IS NULL THEN
            v_first_game_id := v_game_id;
        ELSIF v_first_game_id <> v_game_id THEN
            RAISE EXCEPTION '프리셋 간 이동은 같은 게임에서만 가능합니다.' USING ERRCODE = '22023';
        END IF;
        v_expected_all := v_expected_all || v_expected;
        v_next_all := v_next_all || v_next;
    END LOOP;

    -- A two-preset change must be a move: the same characters, only redistributed.
    IF cardinality(v_ids) = 2
       AND ARRAY(SELECT c FROM unnest(v_expected_all) AS a(c) ORDER BY c)
           IS DISTINCT FROM ARRAY(SELECT c FROM unnest(v_next_all) AS b(c) ORDER BY c) THEN
        RAISE EXCEPTION 'invalid move' USING ERRCODE = '22023';
    END IF;

    FOR v_id, v_next IN
        SELECT item.id,
               ARRAY(SELECT n.value::UUID FROM jsonb_array_elements_text(item.next) WITH ORDINALITY AS n(value, ord) ORDER BY n.ord)
        FROM jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB)
        ORDER BY item.id
    LOOP
        UPDATE public.user_character_presets
        SET character_ids = v_next, updated_at = NOW()
        WHERE id = v_id AND user_id = v_user_id;
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.update_character_preset_slots(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_character_preset_slots(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.reorder_character_presets(p_game_id UUID, p_preset_ids UUID[])
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expected UUID[];
    v_requested UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인한 사용자만 프리셋 순서를 변경할 수 있습니다.';
    END IF;
    IF p_game_id IS NULL OR p_preset_ids IS NULL THEN
        RAISE EXCEPTION '게임과 프리셋 목록이 필요합니다.' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(array_agg(id ORDER BY id), '{}'::UUID[]) INTO v_expected
    FROM public.user_character_presets WHERE user_id = v_user_id AND game_id = p_game_id;
    SELECT COALESCE(array_agg(id ORDER BY id), '{}'::UUID[]) INTO v_requested
    FROM unnest(p_preset_ids) AS item(id);
    IF v_requested IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'preset list changed' USING ERRCODE = '40001';
    END IF;
    UPDATE public.user_character_presets preset
    SET sort_order = ordered.sort_order, updated_at = NOW()
    FROM unnest(p_preset_ids) WITH ORDINALITY AS ordered(id, sort_order)
    WHERE preset.id = ordered.id AND preset.user_id = v_user_id AND preset.game_id = p_game_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reorder_character_presets(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_character_presets(UUID, UUID[]) TO authenticated;
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
DROP TRIGGER IF EXISTS trg_guard_game_character_pickup_only_transition ON public.game_characters;
CREATE TRIGGER trg_guard_game_character_pickup_only_transition BEFORE UPDATE OF is_pickup_only ON public.game_characters
FOR EACH ROW EXECUTE FUNCTION public.guard_game_character_pickup_only_transition();

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
DROP TRIGGER IF EXISTS trg_validate_character_request_target ON public.character_requests;
CREATE TRIGGER trg_validate_character_request_target BEFORE INSERT OR UPDATE OF game_id, target_character_id ON public.character_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_character_request_target();

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

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '캐릭터 요청이 승인되었습니다',
        '요청하신 캐릭터가 반영되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
    RETURN v_character_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_character_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    UPDATE public.character_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 캐릭터 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '캐릭터 요청이 반려되었습니다',
        '요청하신 캐릭터가 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$;
REVOKE ALL ON FUNCTION public.approve_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_character_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_character_request(UUID, TEXT) TO authenticated;

-- 게임 추가 요청 (승인된 게임만 games 카탈로그에 생성)
CREATE TABLE public.game_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    memo TEXT,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_memo TEXT,
    approved_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 유저별 구독 게임 및 커스텀 아이콘
CREATE TABLE public.user_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    custom_icon_path TEXT,
    memo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

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

-- 5. 게임 공용 일정 (버전 및 픽업 기간 한정)
CREATE TABLE public.game_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS', 'BROADCAST')),
    is_rerun BOOLEAN NOT NULL DEFAULT false,
    pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    is_official BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    start_at_estimated BOOLEAN NOT NULL DEFAULT false,
    end_at_estimated BOOLEAN NOT NULL DEFAULT false,
    memo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_schedule_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_game_schedules_start_at_date CHECK (start_at IS NULL OR (start_at AT TIME ZONE 'Asia/Seoul')::date = start_date),
    CONSTRAINT chk_game_schedules_end_at_date CHECK (end_at IS NULL OR (end_at AT TIME ZONE 'Asia/Seoul')::date = end_date),
    CONSTRAINT chk_game_schedules_at_order CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),
    CONSTRAINT chk_game_schedules_at_minute CHECK (
        (start_at IS NULL OR date_trunc('minute', start_at, 'UTC') = start_at)
        AND (end_at IS NULL OR date_trunc('minute', end_at, 'UTC') = end_at)
    ),
    CONSTRAINT chk_game_schedules_estimated_needs_at CHECK (
        (NOT start_at_estimated OR start_at IS NOT NULL)
        AND (NOT end_at_estimated OR end_at IS NOT NULL)
    ),
    CONSTRAINT chk_game_schedules_rerun_pickup CHECK (is_rerun = false OR schedule_type = 'PICKUP'),
    CONSTRAINT chk_game_schedules_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids) = 0 OR (schedule_type = 'PICKUP' AND cardinality(pickup_character_ids) <= 8))
);

-- 5-1. 유저별 관심 일정 즐겨찾기 (R35)
CREATE TABLE public.user_favorite_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.game_schedules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite_schedules_user_schedule UNIQUE (user_id, schedule_id)
);
CREATE INDEX idx_user_favorite_schedules_user_id ON public.user_favorite_schedules(user_id);
CREATE INDEX idx_user_favorite_schedules_schedule_id ON public.user_favorite_schedules(schedule_id);

-- 6. 일반 유저 일정 추가/수정 건의 요청 테이블
CREATE TABLE public.schedule_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    target_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL, -- 수정 요청 시 대상 일정
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS', 'BROADCAST')),
    is_rerun BOOLEAN NOT NULL DEFAULT false,
    pickup_character_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    pickup_new_characters JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_official BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    start_at_estimated BOOLEAN NOT NULL DEFAULT false,
    end_at_estimated BOOLEAN NOT NULL DEFAULT false,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    memo TEXT,
    admin_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_req_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_schedule_requests_start_at_date CHECK (start_at IS NULL OR (start_at AT TIME ZONE 'Asia/Seoul')::date = start_date),
    CONSTRAINT chk_schedule_requests_end_at_date CHECK (end_at IS NULL OR (end_at AT TIME ZONE 'Asia/Seoul')::date = end_date),
    CONSTRAINT chk_schedule_requests_at_order CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),
    CONSTRAINT chk_schedule_requests_at_minute CHECK (
        (start_at IS NULL OR date_trunc('minute', start_at, 'UTC') = start_at)
        AND (end_at IS NULL OR date_trunc('minute', end_at, 'UTC') = end_at)
    ),
    CONSTRAINT chk_schedule_requests_estimated_needs_at CHECK (
        (NOT start_at_estimated OR start_at IS NOT NULL)
        AND (NOT end_at_estimated OR end_at IS NOT NULL)
    ),
    CONSTRAINT chk_schedule_requests_rerun_pickup CHECK (is_rerun = false OR schedule_type = 'PICKUP'),
    CONSTRAINT chk_schedule_requests_pickup_characters_only_pickup CHECK (cardinality(pickup_character_ids) <= 8 AND (cardinality(pickup_character_ids) = 0 OR schedule_type = 'PICKUP')),
    CONSTRAINT chk_schedule_requests_pickup_new_characters_valid CHECK (public.is_valid_pickup_new_characters(pickup_new_characters) AND (schedule_type = 'PICKUP' OR jsonb_array_length(pickup_new_characters) = 0) AND cardinality(pickup_character_ids) + jsonb_array_length(pickup_new_characters) <= 8)
);

DROP TRIGGER IF EXISTS trg_validate_game_schedule_pickup_characters ON public.game_schedules;
CREATE TRIGGER trg_validate_game_schedule_pickup_characters BEFORE INSERT OR UPDATE ON public.game_schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_pickup_characters();
DROP TRIGGER IF EXISTS trg_validate_schedule_request_pickup_characters ON public.schedule_requests;
CREATE TRIGGER trg_validate_schedule_request_pickup_characters BEFORE INSERT OR UPDATE ON public.schedule_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_pickup_characters();

-- 7. 유저 개인 캘린더 메모 (타일 도트 힌트용)
CREATE TABLE public.personal_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memo_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)
);

-- 8. 정기 구독 결제 템플릿
CREATE TABLE public.subscription_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '정기 구독',
    cycle_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY_DAY' CHECK (cycle_type IN ('MONTHLY_DAY', 'INTERVAL_30', 'VERSION_PASS')),
    billing_day SMALLINT DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 31),
    interval_days INTEGER DEFAULT 30 CHECK (interval_days > 0),
    default_price BIGINT NOT NULL DEFAULT 0 CHECK (default_price >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_subscription_template_version_pass CHECK (
        cycle_type <> 'VERSION_PASS' OR (category = '게임' AND game_id IS NOT NULL)
    )
);

-- 9. 스토어 포인트 및 페이 지갑
CREATE TABLE public.store_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    current_balance BIGINT NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    earn_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.10 CHECK (earn_rate BETWEEN 0 AND 100),
    user_tier VARCHAR(30),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform),
    CONSTRAINT chk_wallet_platform_settings CHECK (
        (platform = 'GOOGLE_PLAY' AND user_tier IS NOT NULL
            AND user_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')
            AND earn_rate = CASE user_tier
                WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
                WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END)
        OR (platform = 'GALAXY_STORE' AND (
            (user_tier IS NULL AND earn_rate BETWEEN 0 AND 100)
            OR (user_tier IN ('GENERAL', 'STAR', 'PRESTIGE', 'ROYAL_BLUE')
                AND earn_rate = CASE user_tier
                    WHEN 'GENERAL' THEN 0.10 WHEN 'STAR' THEN 0.10
                    WHEN 'PRESTIGE' THEN 1.10 WHEN 'ROYAL_BLUE' THEN 2.10 END)
        ))
        OR (platform = 'NAVER_PAY' AND user_tier IS NULL AND earn_rate = 0)
    )
);

-- 10. 가계부 지출 내역
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL,
    pickup_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.subscription_templates(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(7), -- YYYY-MM 형식 정기 구독 식별자
    cancellation_kind VARCHAR(30) CHECK (cancellation_kind IN ('PLANNED_CANCEL', 'TEMPLATE_DEACTIVATION', 'PAYMENT_REFUND')),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('게임', '정기 구독', '식비', '교통', '생활', '기타')),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('CONFIRMED', 'PLANNED', 'CANCELLED')),
    target_date DATE NOT NULL,
    start_date DATE,
    end_date DATE,
    original_price BIGINT NOT NULL DEFAULT 0 CHECK (original_price >= 0),
    discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    point_discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (point_discount_amount >= 0),
    used_points BIGINT NOT NULL DEFAULT 0 CHECK (used_points >= 0),
    earned_points BIGINT NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
    final_amount BIGINT NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
    point_platform VARCHAR(30) CHECK (point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    deduct_from_asset BOOLEAN NOT NULL DEFAULT true,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_expense_period CHECK (
        (start_date IS NULL AND end_date IS NULL) OR 
        (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    ),
    CONSTRAINT chk_expense_math CHECK (
        final_amount = original_price - discount_amount - point_discount_amount AND
        point_discount_amount <= (original_price - discount_amount)
    ),
    CONSTRAINT chk_expense_cancellation_kind CHECK (
        (status = 'CANCELLED' AND cancellation_kind IS NOT NULL)
        OR (status <> 'CANCELLED' AND cancellation_kind IS NULL)
    )
);
ALTER TABLE public.expenses ADD CONSTRAINT chk_expense_earned_points_platform
    CHECK (earned_points = 0 OR point_platform IS NOT NULL);

-- 구독 템플릿 비활성화 시 미결제 예정 회차를 제거한다.
CREATE OR REPLACE FUNCTION public.delete_planned_expenses_on_template_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        DELETE FROM public.expenses
        WHERE template_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_delete_planned_expenses_on_template_deactivation
AFTER UPDATE OF is_active ON public.subscription_templates
FOR EACH ROW EXECUTE FUNCTION public.delete_planned_expenses_on_template_deactivation();

-- 멱등성 보장 인덱스: 동일 구독 템플릿의 같은 월 중복 생성 원천 차단
CREATE UNIQUE INDEX idx_expenses_template_billing_cycle 
    ON public.expenses(template_id, billing_cycle) 
    WHERE template_id IS NOT NULL AND billing_cycle IS NOT NULL;

-- 버전 패스 멱등성 인덱스: 동일 템플릿-버전 중복 회차 생성 방지
CREATE UNIQUE INDEX idx_expenses_template_schedule_id 
    ON public.expenses(template_id, schedule_id) 
    WHERE template_id IS NOT NULL AND schedule_id IS NOT NULL;

-- 픽업별 지출 조회 인덱스
CREATE INDEX idx_expenses_pickup_schedule_id 
    ON public.expenses(pickup_schedule_id) 
    WHERE pickup_schedule_id IS NOT NULL;

ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_billing_cycle
    CHECK (billing_cycle IS NULL OR billing_cycle ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_point_platform
    CHECK ((used_points = 0 AND point_discount_amount = 0)
        OR (used_points > 0 AND point_discount_amount > 0 AND point_platform IS NOT NULL));
ALTER TABLE public.subscription_templates ADD CONSTRAINT chk_subscription_payment_method
    CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE'));
ALTER TABLE public.personal_memos ADD CONSTRAINT chk_personal_memo_content
    CHECK (length(btrim(content)) > 0);

-- 10-1. 사용자별 자주 쓰는 과금 프리셋 (R102, 사용자당 최대 20개 상한)
CREATE TABLE public.user_expense_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 150),
    category VARCHAR(50) NOT NULL DEFAULT '게임' CHECK (category IN ('게임', '식비', '교통', '생활', '기타')),
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    original_price BIGINT NOT NULL CHECK (original_price >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'NAVER_PAY')),
    point_platform VARCHAR(30) CHECK (point_platform IS NULL OR point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    deduct_from_asset BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_expense_presets_user_sort
    ON public.user_expense_presets(user_id, sort_order ASC, created_at ASC);

CREATE OR REPLACE FUNCTION public.enforce_user_expense_presets_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('user_expense_presets:' || NEW.user_id::text));

    SELECT count(*) INTO v_count
    FROM public.user_expense_presets
    WHERE user_id = NEW.user_id;

    IF v_count >= 20 THEN
        RAISE EXCEPTION '과금 프리셋은 최대 20개까지 저장할 수 있습니다.' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enforce_user_expense_presets_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_user_expense_presets_limit ON public.user_expense_presets;
CREATE TRIGGER trg_enforce_user_expense_presets_limit
    BEFORE INSERT ON public.user_expense_presets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_user_expense_presets_limit();

-- 11. 스토어 포인트 및 페이 거래 원장 (Ledger)
CREATE TABLE public.store_point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('USE', 'EARN', 'MANUAL_ADJUST', 'REFUND', 'RECHARGE')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 보강
CREATE INDEX idx_expenses_user_target_date ON public.expenses(user_id, target_date);
CREATE INDEX idx_expenses_schedule_id ON public.expenses(schedule_id);
CREATE INDEX idx_game_schedules_dates ON public.game_schedules(start_date, end_date);
CREATE INDEX idx_personal_memos_user_date ON public.personal_memos(user_id, memo_date);
CREATE INDEX idx_store_point_transactions_user_platform ON public.store_point_transactions(user_id, platform);
CREATE INDEX idx_schedule_requests_status ON public.schedule_requests(request_status);
CREATE INDEX idx_game_requests_status ON public.game_requests(request_status);

-- ==============================================================================
-- 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거
-- ==============================================================================

-- 1. 결제 전담 RPC (IDOR 방어 및 expenses 상태 갱신 일원화)
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
DECLARE
    v_user_id UUID := auth.uid();
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

-- 2. 결제 취소/환불 전담 RPC (포인트 회수 검증 및 자산 복원)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 결제 완료된 지출의 비회계 메타데이터(제목, 카테고리, 메모, 결제일) 수정 함수
CREATE OR REPLACE FUNCTION public.update_confirmed_expense_metadata(
    p_expense_id UUID,
    p_title VARCHAR(150),
    p_category VARCHAR(50),
    p_memo TEXT DEFAULT NULL,
    p_target_date DATE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_status VARCHAR(20);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RAISE EXCEPTION '항목명을 입력해 주세요.';
    END IF;

    IF p_category NOT IN ('게임', '정기 구독', '식비', '교통', '생활', '기타') THEN
        RAISE EXCEPTION '올바르지 않은 카테고리입니다.';
    END IF;

    IF p_target_date IS NOT NULL AND p_target_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제일을 설정할 수 없습니다.';
    END IF;

    SELECT status INTO v_status
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '지출 내역을 찾을 수 없습니다.';
    END IF;

    IF v_status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '결제 완료된 지출만 메타데이터를 수정할 수 있습니다.';
    END IF;

    UPDATE public.expenses
    SET title = btrim(p_title),
        category = p_category,
        memo = p_memo,
        target_date = coalesce(p_target_date, target_date)
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 예정 취소와 복구는 전용 경로로 수행한다. 구독 비활성화 취소는 복구 가능하지만 환불은 불가하다.
CREATE OR REPLACE FUNCTION public.cancel_planned_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses
    SET status = 'CANCELLED', cancellation_kind = 'PLANNED_CANCEL'
    WHERE id = p_expense_id AND user_id = v_user_id AND status = 'PLANNED';
    IF NOT FOUND THEN RAISE EXCEPTION '취소할 수 있는 예정 지출이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.restore_cancelled_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses AS e
    SET status = 'PLANNED', cancellation_kind = NULL
    WHERE e.id = p_expense_id AND e.user_id = v_user_id AND e.status = 'CANCELLED'
      AND (
          e.cancellation_kind = 'PLANNED_CANCEL'
      );
    IF NOT FOUND THEN RAISE EXCEPTION '복구 가능한 예정 취소 항목이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 일정 및 구독 템플릿 참조는 본인 소유와 게임 관계가 일치해야 한다.
CREATE OR REPLACE FUNCTION public.validate_expense_references()
RETURNS TRIGGER AS $$
DECLARE v_schedule_game UUID; v_pickup_game UUID; v_template_user UUID; v_template_game UUID;
BEGIN
    IF NEW.schedule_id IS NOT NULL THEN
        SELECT game_id INTO v_schedule_game FROM public.game_schedules WHERE id = NEW.schedule_id;
        IF NOT FOUND OR NEW.game_id IS DISTINCT FROM v_schedule_game THEN
            RAISE EXCEPTION '지출 게임과 일정 게임이 일치해야 합니다.';
        END IF;
    END IF;
    IF NEW.pickup_schedule_id IS NOT NULL THEN
        SELECT game_id INTO v_pickup_game FROM public.game_schedules WHERE id = NEW.pickup_schedule_id;
        IF NOT FOUND OR NEW.game_id IS DISTINCT FROM v_pickup_game THEN
            RAISE EXCEPTION '지출 게임과 픽업 일정 게임이 일치해야 합니다.';
        END IF;
    END IF;
    IF NEW.template_id IS NOT NULL THEN
        SELECT user_id, game_id INTO v_template_user, v_template_game
        FROM public.subscription_templates WHERE id = NEW.template_id;
        IF NOT FOUND OR v_template_user IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION '본인 소유의 구독 템플릿만 연결할 수 있습니다.';
        END IF;
        IF v_template_game IS NOT NULL AND NEW.game_id IS DISTINCT FROM v_template_game THEN
            RAISE EXCEPTION '지출 게임과 구독 템플릿 게임이 일치해야 합니다.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_expense_references
BEFORE INSERT OR UPDATE OF user_id, game_id, schedule_id, pickup_schedule_id, template_id ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.validate_expense_references();

-- Account deletion requests remain readable to their owner while personal data
-- access is blocked. The service role owns request/worker state transitions.
CREATE TABLE public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    status_token_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'EMAIL_PENDING', 'AUTH_DELETE_PENDING', 'MANUAL_REVIEW', 'COMPLETED')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    retry_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    last_error_code VARCHAR(50),
    storage_completed_at TIMESTAMPTZ,
    data_completed_at TIMESTAMPTZ,
    email_attempted_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_deletion_requests_due
    ON public.account_deletion_requests(retry_after)
    WHERE status <> 'COMPLETED';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT (status, requested_at, updated_at)
    ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

CREATE POLICY "Users read own account deletion status"
    ON public.account_deletion_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.account_deletion_is_pending(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.account_deletion_requests
        WHERE user_id = p_user_id AND status <> 'COMPLETED'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.account_deletion_is_pending(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_is_pending(UUID) TO authenticated;

CREATE POLICY "Block account deletion users from storage"
    ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'character_requests', 'user_characters', 'user_character_presets',
        'personal_memos', 'subscription_templates', 'store_wallets', 'expenses', 'store_point_transactions',
        'incomes', 'feedback_requests', 'notifications', 'notification_settings', 'push_subscriptions', 'user_expense_presets'
    ] LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_deletion_is_pending(auth.uid())) WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()))',
            'Block account deletion users from ' || v_table,
            v_table
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_deletion_requests(p_limit INTEGER DEFAULT 5)
RETURNS SETOF public.account_deletion_requests AS $$
BEGIN
    IF p_limit < 1 OR p_limit > 20 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 20';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT id
        FROM public.account_deletion_requests
        WHERE status NOT IN ('COMPLETED', 'MANUAL_REVIEW')
          AND retry_after <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.account_deletion_requests AS request
    SET locked_until = NOW() + INTERVAL '5 minutes',
        attempt_count = request.attempt_count + 1,
        updated_at = NOW()
    FROM due
    WHERE request.id = due.id
    RETURNING request.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_deletion_requests(INTEGER) TO service_role;

-- [pg_cron 백그라운드 워커] 만료된 계정 탈퇴 요청 일괄 영구 삭제 원자적 함수
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

            DELETE FROM public.push_subscriptions WHERE user_id = v_req.user_id;
            DELETE FROM public.notification_settings WHERE user_id = v_req.user_id;
            DELETE FROM public.notifications WHERE user_id = v_req.user_id;
            DELETE FROM public.feedback_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.user_expense_presets WHERE user_id = v_req.user_id;
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

-- [계정 탈퇴 요청 RPC] 확인 이메일 검증 및 탈퇴 토큰 발급
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_confirmation_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_token TEXT;
    v_token_hash CHAR(64);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
    END IF;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
    END IF;

    IF p_confirmation_email IS NULL OR LOWER(TRIM(p_confirmation_email)) <> LOWER(TRIM(v_user_email)) THEN
        RAISE EXCEPTION 'CONFIRMATION_REQUIRED';
    END IF;

    v_token := gen_random_uuid()::text;
    v_token_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');

    INSERT INTO public.account_deletion_requests (
        user_id, status_token_hash, status, attempt_count, retry_after, locked_until, last_error_code, requested_at, updated_at
    )
    VALUES (
        v_user_id, v_token_hash, 'PENDING', 0, NOW(), NULL, NULL, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET status_token_hash = EXCLUDED.status_token_hash,
        status = 'PENDING',
        attempt_count = 0,
        retry_after = NOW(),
        locked_until = NULL,
        last_error_code = NULL,
        requested_at = NOW(),
        updated_at = NOW();

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;

-- [계정 탈퇴 상태 조회 RPC] 불투명 토큰 해시 기반 상태 조회
CREATE OR REPLACE FUNCTION public.get_account_deletion_status(p_status_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_token_hash CHAR(64);
    v_status VARCHAR(30);
    v_updated_at TIMESTAMPTZ;
BEGIN
    IF p_status_token IS NULL OR TRIM(p_status_token) = '' THEN
        RETURN NULL;
    END IF;

    v_token_hash := encode(sha256(convert_to(p_status_token, 'UTF8')), 'hex');

    SELECT status, updated_at INTO v_status, v_updated_at
    FROM public.account_deletion_requests
    WHERE status_token_hash = v_token_hash;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'status', v_status,
        'updatedAt', v_updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_account_deletion_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_deletion_status(TEXT) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.block_pending_account_data_mutations()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    IF auth.uid() = v_user_id AND public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'character_requests', 'user_characters', 'user_character_presets',
        'personal_memos', 'subscription_templates', 'store_wallets', 'expenses', 'store_point_transactions',
        'incomes', 'feedback_requests', 'notifications', 'notification_settings', 'push_subscriptions', 'user_expense_presets'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations()',
            'block_pending_account_deletion_' || v_table,
            v_table
        );
    END LOOP;
END;
$$;

ALTER TABLE public.game_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_classification_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_character_presets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_characters, public.character_requests, public.user_characters, public.user_character_presets TO authenticated;
REVOKE ALL ON public.game_classification_icons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_classification_icons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_classification_icons TO authenticated;

REVOKE ALL ON public.game_characters FROM anon;
GRANT SELECT (id, game_id, name, default_icon_url, rarity, attributes, is_pickup_only) ON public.game_characters TO anon;
REVOKE ALL ON public.user_characters, public.user_character_presets, public.character_requests, public.schedule_requests FROM anon;
DROP POLICY IF EXISTS "Allow anon read game characters" ON public.game_characters;
CREATE POLICY "Allow anon read game characters" ON public.game_characters FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Users read game characters" ON public.game_characters;
CREATE POLICY "Users read game characters" ON public.game_characters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage game characters" ON public.game_characters;
CREATE POLICY "Admin manage game characters" ON public.game_characters FOR ALL TO authenticated
    USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));
DROP POLICY IF EXISTS "Read icons of approved games" ON public.game_classification_icons;
CREATE POLICY "Read icons of approved games" ON public.game_classification_icons FOR SELECT TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.status = 'APPROVED'));
DROP POLICY IF EXISTS "Admin manage classification icons" ON public.game_classification_icons;
CREATE POLICY "Admin manage classification icons" ON public.game_classification_icons FOR ALL TO authenticated
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

-- R35 관심 일정: 본인 소유 행만 조회/등록/삭제, anon 차단, 계정 삭제 대기 사용자 차단
ALTER TABLE public.user_favorite_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_favorite_schedules FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_favorite_schedules TO authenticated;
DROP POLICY IF EXISTS "Manage own favorite schedules" ON public.user_favorite_schedules;
CREATE POLICY "Manage own favorite schedules" ON public.user_favorite_schedules FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Block account deletion users from user_favorite_schedules" ON public.user_favorite_schedules;
CREATE POLICY "Block account deletion users from user_favorite_schedules" ON public.user_favorite_schedules
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));
DROP TRIGGER IF EXISTS block_pending_account_deletion_user_favorite_schedules ON public.user_favorite_schedules;
CREATE TRIGGER block_pending_account_deletion_user_favorite_schedules
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_favorite_schedules
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

-- R93 수익 내역: 본인 행만 조회, 직접 쓰기 권한 없음(RPC 전용), anon 차단.
-- 계정 삭제 대기 사용자 차단 정책·트리거는 위 공통 루프 목록('incomes')에서 생성됨.
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incomes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.incomes TO authenticated;
DROP POLICY IF EXISTS "Read own incomes" ON public.incomes;
CREATE POLICY "Read own incomes" ON public.incomes FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- R84 기타 건의 요청: 본인 조회/PENDING 등록, 관리자 전체 조회/관리, 직접 UPDATE/DELETE 차단.
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.feedback_requests TO authenticated;
DROP POLICY IF EXISTS "Read own feedback requests" ON public.feedback_requests;
CREATE POLICY "Read own feedback requests" ON public.feedback_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Create own feedback requests" ON public.feedback_requests;
CREATE POLICY "Create own feedback requests" ON public.feedback_requests FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND request_status = 'PENDING'
        AND admin_answer IS NULL
        AND answered_at IS NULL
        AND answered_by IS NULL
    );
DROP POLICY IF EXISTS "Admins manage all feedback requests" ON public.feedback_requests;
CREATE POLICY "Admins manage all feedback requests" ON public.feedback_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

-- R84 앱 내 알림함: 본인 조회만 허용, 직접 쓰기 권한 없음(RPC·DB 함수 전용), anon 차단.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
DROP POLICY IF EXISTS "Read own notifications" ON public.notifications;
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.purge_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.purge_expired_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_notifications() TO service_role;

-- R39 일일 정기 알림 설정: 본인 조회·등록·수정만 허용(DELETE 권한 없음), anon 차단.
-- 계정 삭제 대기 사용자 차단 정책·트리거는 위 공통 루프 목록('notification_settings')에서 생성됨.
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

-- R96 Web Push 기기 구독: 본인 조회 전용, 등록/해제는 SECURITY DEFINER RPC로만 처리, anon 차단.
-- 계정 삭제 대기 사용자 차단 정책·트리거는 위 공통 루프 목록('push_subscriptions')에서 생성됨.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.push_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Read own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
    p_endpoint TEXT,
    p_p256dh TEXT,
    p_auth TEXT,
    p_platform VARCHAR DEFAULT 'web',
    p_user_agent_label VARCHAR DEFAULT '웹 브라우저'
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_endpoint TEXT;
    v_p256dh TEXT;
    v_auth TEXT;
    v_platform TEXT;
    v_label TEXT;
    v_sub_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 푸시 구독을 등록할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_endpoint := btrim(coalesce(p_endpoint, ''));
    v_p256dh := btrim(coalesce(p_p256dh, ''));
    v_auth := btrim(coalesce(p_auth, ''));
    v_platform := btrim(coalesce(p_platform, 'web'));
    v_label := coalesce(nullif(btrim(coalesce(p_user_agent_label, '')), ''), '웹 브라우저');

    IF v_endpoint !~ '^https://' OR length(v_endpoint) NOT BETWEEN 12 AND 2048 THEN
        RAISE EXCEPTION '유효하지 않은 푸시 endpoint입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_p256dh) NOT BETWEEN 40 AND 256 THEN
        RAISE EXCEPTION '유효하지 않은 p256dh 키입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_auth) NOT BETWEEN 16 AND 128 THEN
        RAISE EXCEPTION '유효하지 않은 auth 키입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_platform NOT IN ('web', 'ios_pwa', 'android_pwa') THEN
        RAISE EXCEPTION '허용되지 않은 플랫폼 값입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_label) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION '기기 라벨은 1~100자여야 합니다.' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label, updated_at)
    VALUES (v_user_id, v_endpoint, v_p256dh, v_auth, v_platform, v_label, NOW())
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = v_user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        platform = EXCLUDED.platform,
        user_agent_label = EXCLUDED.user_agent_label,
        updated_at = NOW()
    RETURNING id INTO v_sub_id;

    INSERT INTO public.notification_settings(user_id, push_enabled, updated_at)
    VALUES (v_user_id, true, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET push_enabled = true,
        updated_at = NOW();

    RETURN v_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, VARCHAR, VARCHAR) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(
    p_endpoint TEXT DEFAULT NULL,
    p_subscription_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_endpoint TEXT := nullif(btrim(coalesce(p_endpoint, '')), '');
    v_deleted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_endpoint IS NULL AND p_subscription_id IS NULL THEN
        RAISE EXCEPTION '삭제할 구독 대상(endpoint 또는 subscription_id)이 필요합니다.' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    DELETE FROM public.push_subscriptions
    WHERE user_id = v_user_id
      AND (v_endpoint IS NULL OR endpoint = v_endpoint)
      AND (p_subscription_id IS NULL OR id = p_subscription_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count > 0 AND NOT EXISTS (
        SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_id
    ) THEN
        UPDATE public.notification_settings
        SET push_enabled = false,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.delete_push_subscription(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_pending_push_notifications(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    kind VARCHAR,
    title VARCHAR,
    body VARCHAR,
    link_path TEXT,
    push_attempts SMALLINT
) AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_push_enabled BOOLEAN;
    v_request_result BOOLEAN;
    v_has_subscription BOOLEAN;
    v_first_subscribed_at TIMESTAMPTZ;
    v_next_attempts SMALLINT;
BEGIN
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 200' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    FOR v_notif IN
        SELECT n.*
        FROM public.notifications n
        WHERE n.push_status = 'PENDING'
          AND (n.push_claimed_at IS NULL OR n.push_claimed_at < NOW() - INTERVAL '5 minutes')
        ORDER BY n.created_at ASC, n.id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    LOOP
        IF v_notif.push_attempts >= 3 THEN
            UPDATE public.notifications AS target
            SET push_status = 'FAILED',
                pushed_at = NOW()
            WHERE target.id = v_notif.id;
            CONTINUE;
        END IF;

        v_push_enabled := NULL;
        v_request_result := NULL;
        SELECT ns.push_enabled, ns.request_result
        INTO v_push_enabled, v_request_result
        FROM public.notification_settings ns
        WHERE ns.user_id = v_notif.user_id;

        SELECT EXISTS (
            SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = v_notif.user_id
        ) INTO v_has_subscription;

        -- Never push a backlog: rows older than the push TTL (1 day) or created before the
        -- user's first device subscription stay in the in-app inbox only.
        SELECT min(ps.created_at) INTO v_first_subscribed_at
        FROM public.push_subscriptions ps WHERE ps.user_id = v_notif.user_id;

        IF public.account_deletion_is_pending(v_notif.user_id)
           OR v_notif.created_at < NOW() - INTERVAL '1 day'
           OR v_notif.created_at < v_first_subscribed_at
           OR NOT coalesce(v_push_enabled, false)
           OR (
               v_notif.kind IN ('REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
               AND NOT coalesce(v_request_result, true)
           )
           OR NOT v_has_subscription THEN
            UPDATE public.notifications AS target
            SET push_status = 'SKIPPED',
                pushed_at = NOW()
            WHERE target.id = v_notif.id;
            CONTINUE;
        END IF;

        -- Lease the row for 5 minutes so a concurrent worker does not claim it again.
        UPDATE public.notifications AS target
        SET push_attempts = target.push_attempts + 1,
            push_claimed_at = NOW()
        WHERE target.id = v_notif.id
        RETURNING target.push_attempts INTO v_next_attempts;

        notification_id := v_notif.id;
        user_id := v_notif.user_id;
        kind := v_notif.kind;
        title := v_notif.title;
        body := v_notif.body;
        link_path := v_notif.link_path;
        push_attempts := v_next_attempts;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_pending_push_notifications(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_notifications(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_push_notification_delivery(
    p_notification_id UUID,
    p_status VARCHAR,
    p_expired_endpoints TEXT[] DEFAULT '{}'::TEXT[],
    p_succeeded_endpoints TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS VOID AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_final_status VARCHAR(20);
BEGIN
    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'p_notification_id is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('SENT', 'SKIPPED', 'FAILED', 'PENDING') THEN
        RAISE EXCEPTION 'Invalid push status: %', p_status USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '알림을 찾을 수 없습니다.' USING ERRCODE = 'no_data_found';
    END IF;

    IF p_status = 'PENDING' AND v_notif.push_attempts >= 3 THEN
        v_final_status := 'FAILED';
    ELSE
        v_final_status := p_status;
    END IF;

    IF p_expired_endpoints IS NOT NULL AND cardinality(p_expired_endpoints) > 0 THEN
        DELETE FROM public.push_subscriptions
        WHERE user_id = v_notif.user_id
          AND endpoint = ANY(p_expired_endpoints);

        IF NOT EXISTS (
            SELECT 1 FROM public.push_subscriptions WHERE user_id = v_notif.user_id
        ) THEN
            UPDATE public.notification_settings
            SET push_enabled = false,
                updated_at = NOW()
            WHERE user_id = v_notif.user_id;
        END IF;
    END IF;

    IF p_succeeded_endpoints IS NOT NULL AND cardinality(p_succeeded_endpoints) > 0 THEN
        UPDATE public.push_subscriptions
        SET last_success_at = NOW(),
            updated_at = NOW()
        WHERE user_id = v_notif.user_id
          AND endpoint = ANY(p_succeeded_endpoints);
    END IF;

    UPDATE public.notifications
    SET push_status = v_final_status,
        push_claimed_at = NULL,
        pushed_at = CASE
            WHEN v_final_status IN ('SENT', 'SKIPPED', 'FAILED') THEN NOW()
            ELSE pushed_at
        END
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) TO service_role;

-- R96-REV-07: Private singleton webhook config RLS/ACL and SQL Editor helper.
ALTER TABLE public.push_webhook_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_webhook_config FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_push_webhook_config(
    p_url TEXT,
    p_secret TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_url TEXT := nullif(btrim(coalesce(p_url, '')), '');
    v_secret TEXT := nullif(btrim(coalesce(p_secret, '')), '');
BEGIN
    IF v_url IS NULL OR char_length(v_url) NOT BETWEEN 12 AND 2048 OR v_url !~ '^https://' THEN
        RAISE EXCEPTION '유효하지 않은 웹훅 URL입니다. https://로 시작하는 12~2048자 URL이 필요합니다.'
            USING ERRCODE = '23514';
    END IF;
    IF v_secret IS NOT NULL AND char_length(v_secret) NOT BETWEEN 32 AND 512 THEN
        RAISE EXCEPTION '웹훅 시크릿은 NULL이거나 32~512자여야 합니다.'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.push_webhook_config(id, url, secret, updated_at)
    VALUES (true, v_url, v_secret, NOW())
    ON CONFLICT (id) DO UPDATE
    SET url = EXCLUDED.url,
        secret = EXCLUDED.secret,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_push_webhook_config(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;

-- Shared webhook caller for the AFTER INSERT trigger and the retry pg_cron job.
-- Lookup priority: 1) public.push_webhook_config, 2) vault.decrypted_secrets (dynamic/isolated),
-- 3) session GUC app.settings.send_notifications_* fallback.
-- Every failure is swallowed so a notification INSERT or a cron run never fails because of it.
CREATE OR REPLACE FUNCTION public.invoke_send_notifications_webhook()
RETURNS VOID AS $$
DECLARE
    v_url TEXT;
    v_secret TEXT;
    v_vault_val TEXT;
BEGIN
    -- 1) Private singleton config table (primary for hosted Supabase)
    SELECT nullif(btrim(url), ''), nullif(btrim(secret), '')
    INTO v_url, v_secret
    FROM public.push_webhook_config
    WHERE id = true;

    -- 2) Supabase Vault fallback (R96-REV-06) isolated against missing extension or pgsodium key issues
    IF (v_url IS NULL OR v_secret IS NULL)
       AND to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
        BEGIN
            IF v_url IS NULL THEN
                EXECUTE $vault$
                    SELECT nullif(btrim(decrypted_secret), '')
                    FROM vault.decrypted_secrets
                    WHERE name = 'send_notifications_url'
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                    LIMIT 1
                $vault$ INTO v_vault_val;
                IF v_vault_val IS NOT NULL THEN
                    v_url := v_vault_val;
                END IF;
            END IF;

            IF v_secret IS NULL THEN
                EXECUTE $vault$
                    SELECT nullif(btrim(decrypted_secret), '')
                    FROM vault.decrypted_secrets
                    WHERE name = 'send_notifications_secret'
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                    LIMIT 1
                $vault$ INTO v_vault_val;
                IF v_vault_val IS NOT NULL THEN
                    v_secret := v_vault_val;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- 3) Session GUC fallback (kept for local TESTS.sql set_config compatibility)
    IF v_url IS NULL THEN
        v_url := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_url', true), '')), '');
    END IF;
    IF v_secret IS NULL THEN
        v_secret := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_secret', true), '')), '');
    END IF;

    IF v_url IS NULL OR v_secret IS NULL THEN
        RETURN;
    END IF;

    IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
        RETURN;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('source', 'db_trigger'),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 5000
    );
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.invoke_send_notifications_webhook() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trigger_send_notifications_webhook()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.invoke_send_notifications_webhook();
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.trigger_send_notifications_webhook() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notifications_send_webhook ON public.notifications;
CREATE TRIGGER trg_notifications_send_webhook
    AFTER INSERT ON public.notifications
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_send_notifications_webhook();

-- R102 과금 프리셋: 본인 행만 조회·등록·수정·삭제 허용, anon 차단.
-- 계정 삭제 대기 사용자 차단 정책·트리거는 위 공통 루프 목록('user_expense_presets')에서 생성됨.
ALTER TABLE public.user_expense_presets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_expense_presets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_expense_presets TO authenticated;
DROP POLICY IF EXISTS "Manage own expense presets" ON public.user_expense_presets;
CREATE POLICY "Manage own expense presets" ON public.user_expense_presets FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_updated_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 알림 상태를 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_notification_ids IS NULL THEN
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = v_user_id AND read_at IS NULL;
    ELSE
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = v_user_id
          AND read_at IS NULL
          AND id = ANY(p_notification_ids);
    END IF;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.mark_notifications_read(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_feedback_request(
    p_request_id UUID,
    p_admin_answer TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ANSWERED'
)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_request public.feedback_requests%ROWTYPE;
    v_trimmed_answer TEXT;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_status NOT IN ('ANSWERED', 'CLOSED') THEN
        RAISE EXCEPTION '허용되지 않은 건의 상태입니다.';
    END IF;

    v_trimmed_answer := nullif(btrim(coalesce(p_admin_answer, '')), '');
    IF p_status = 'ANSWERED' AND v_trimmed_answer IS NULL THEN
        RAISE EXCEPTION '답변 내용을 입력해 주세요.';
    END IF;
    IF v_trimmed_answer IS NOT NULL AND length(v_trimmed_answer) > 2000 THEN
        RAISE EXCEPTION '답변 내용은 2000자 이하여야 합니다.';
    END IF;

    SELECT * INTO v_request FROM public.feedback_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '검토 대기 중인 건의 요청이 아닙니다.';
    END IF;

    UPDATE public.feedback_requests
    SET request_status = p_status,
        admin_answer = coalesce(v_trimmed_answer, admin_answer),
        answered_at = NOW(),
        answered_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'FEEDBACK_ANSWERED',
        CASE WHEN p_status = 'CLOSED' THEN '건의 검토가 종료되었습니다' ELSE '건의에 답변이 등록되었습니다' END,
        CASE
            WHEN p_status = 'CLOSED' THEN '등록하신 건의가 검토 종료되었습니다. 내 요청 현황에서 확인하세요.'
            ELSE '등록하신 건의에 관리자 답변이 등록되었습니다. 내 요청 현황에서 확인하세요.'
        END,
        '/dashboard/games',
        v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.answer_feedback_request(UUID, TEXT, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_feedback_request(UUID, TEXT, VARCHAR) TO authenticated;

-- 3. 지갑 설정 변경 RPC (등급 및 적립률)
CREATE OR REPLACE FUNCTION public.update_store_wallet_settings(
    p_platform VARCHAR(30),
    p_tier VARCHAR(30),
    p_earn_rate NUMERIC(5, 2)
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') OR p_earn_rate IS NULL OR p_earn_rate < 0 THEN
        RAISE EXCEPTION '지갑 플랫폼 또는 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GOOGLE_PLAY' AND (
        p_tier NOT IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') OR
        p_earn_rate IS DISTINCT FROM CASE p_tier
            WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
            WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END
    ) THEN
        RAISE EXCEPTION 'Google Play 등급 또는 공식 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GALAXY_STORE' AND (
        (p_tier IS NOT NULL AND (
            p_tier NOT IN ('GENERAL', 'STAR', 'PRESTIGE', 'ROYAL_BLUE') OR
            p_earn_rate IS DISTINCT FROM CASE p_tier
                WHEN 'GENERAL' THEN 0.10 WHEN 'STAR' THEN 0.10
                WHEN 'PRESTIGE' THEN 1.10 WHEN 'ROYAL_BLUE' THEN 2.10 END
        )) OR (p_tier IS NULL AND p_earn_rate > 100)
    ) THEN
        RAISE EXCEPTION 'Galaxy Store 등급 또는 적립률이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_tier, p_earn_rate, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET user_tier = p_tier, earn_rate = p_earn_rate, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 지갑 잔액 수동 보정 RPC
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_platform VARCHAR(30),
    p_target_balance BIGINT,
    p_memo TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_diff BIGINT;
    v_current BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')
       OR p_target_balance IS NULL OR p_target_balance < 0 THEN
        RAISE EXCEPTION '플랫폼 또는 목표 잔액이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
    VALUES (v_user_id, p_platform,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' WHEN p_platform = 'GALAXY_STORE' THEN 'GENERAL' ELSE NULL END,
        CASE WHEN p_platform = 'NAVER_PAY' THEN 0.00 ELSE 0.10 END)
    ON CONFLICT (user_id, platform) DO NOTHING;
    SELECT current_balance INTO v_current
    FROM public.store_wallets 
    WHERE user_id = v_user_id AND platform = p_platform FOR UPDATE;

    v_diff := p_target_balance - v_current;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_target_balance,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' WHEN p_platform = 'GALAXY_STORE' THEN 'GENERAL' ELSE NULL END,
        CASE WHEN p_platform = 'NAVER_PAY' THEN 0.00 ELSE 0.10 END, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET current_balance = p_target_balance, updated_at = NOW();

    INSERT INTO public.store_point_transactions(user_id, platform, transaction_type, amount, balance_after, memo)
    VALUES (v_user_id, p_platform, 'MANUAL_ADJUST', v_diff, p_target_balance, coalesce(p_memo, '수동 잔액 보정'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 자산과 기본 예산 초기 설정/정정 RPC
CREATE OR REPLACE FUNCTION public.set_user_finance_settings(
    p_total_asset BIGINT,
    p_default_budget BIGINT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF p_total_asset IS NULL OR p_default_budget IS NULL OR p_default_budget < 0 THEN
        RAISE EXCEPTION '자산 또는 기본 예산 입력이 올바르지 않습니다.';
    END IF;
    INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at)
    VALUES (v_user_id, p_total_asset, p_default_budget, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = EXCLUDED.total_asset,
        default_budget = EXCLUDED.default_budget,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R93 수익 등록 RPC: 수익 행 INSERT와 total_asset 증액을 한 트랜잭션에서 처리
CREATE OR REPLACE FUNCTION public.record_income(
    p_category VARCHAR(50),
    p_title VARCHAR(150),
    p_amount BIGINT,
    p_income_date DATE,
    p_memo TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_income_id UUID;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF p_category IS NULL OR p_category NOT IN ('급여', '용돈', '상여금', '금융수익', '기타') THEN
        RAISE EXCEPTION '수익 유형이 올바르지 않습니다.';
    END IF;
    IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION '수익 항목명은 1자 이상 100자 이하로 입력해야 합니다.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION '수익 금액은 0보다 커야 합니다.';
    END IF;
    IF p_income_date IS NULL THEN
        RAISE EXCEPTION '입금일을 입력해야 합니다.';
    END IF;

    INSERT INTO public.incomes(user_id, category, title, amount, income_date, memo)
    VALUES (v_user_id, p_category, btrim(p_title), p_amount, p_income_date, p_memo)
    RETURNING id INTO v_income_id;

    INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at)
    VALUES (v_user_id, p_amount, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = public.user_finances.total_asset + EXCLUDED.total_asset,
        updated_at = NOW();

    RETURN v_income_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R93 수익 삭제 RPC: 본인 수익 행 DELETE와 total_asset 차감 복원을 한 트랜잭션에서 처리
CREATE OR REPLACE FUNCTION public.delete_income(p_income_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_income public.incomes%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;

    SELECT * INTO v_income
    FROM public.incomes
    WHERE id = p_income_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '삭제할 수 있는 본인 소유의 수익 내역이 아닙니다.';
    END IF;

    DELETE FROM public.incomes WHERE id = p_income_id AND user_id = v_user_id;

    UPDATE public.user_finances
    SET total_asset = total_asset - v_income.amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 버전/픽업 일정 날짜 변경에 따른 예정 지출 동기화 트리거 함수
CREATE OR REPLACE FUNCTION public.sync_version_expenses_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS', 'BROADCAST')
       AND (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
        UPDATE public.expenses AS e
        SET start_date = NEW.start_date,
            end_date = NEW.end_date,
            target_date = CASE
                WHEN NEW.schedule_type <> 'VERSION' THEN NEW.end_date
                -- R56 version pass: multi-day period whose due date is the period end.
                WHEN e.start_date IS NOT NULL AND e.end_date IS NOT NULL
                     AND e.start_date <> e.end_date
                     AND (e.target_date = e.end_date OR e.target_date = OLD.end_date) THEN NEW.end_date
                ELSE NEW.start_date
            END
        WHERE e.schedule_id = NEW.id AND e.status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_version_expenses
AFTER UPDATE ON public.game_schedules
FOR EACH ROW EXECUTE FUNCTION public.sync_version_expenses_trigger();

-- 관리자 전용 요청 승인/반려 RPC. 일정 반영과 요청 상태 전환은 한 트랜잭션으로 처리한다.
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

CREATE OR REPLACE FUNCTION public.reject_schedule_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.schedule_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 일정 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '일정 요청이 반려되었습니다',
        '요청하신 일정이 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_game_request(p_request_id UUID, p_default_icon_url TEXT)
RETURNS UUID AS $$
DECLARE
    v_request public.game_requests%ROWTYPE;
    v_game_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    SELECT * INTO v_request FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 게임 요청이 아닙니다.';
    END IF;
    IF p_default_icon_url IS NULL OR btrim(p_default_icon_url) = '' THEN
        RAISE EXCEPTION '게임 기본 아이콘이 필요합니다.';
    END IF;
    INSERT INTO public.games(name, default_icon_url, created_by)
    VALUES (v_request.name, p_default_icon_url, auth.uid())
    RETURNING id INTO v_game_id;
    UPDATE public.game_requests SET request_status = 'APPROVED', approved_game_id = v_game_id
    WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '게임 요청이 승인되었습니다',
        '요청하신 게임이 카탈로그에 등록되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_game_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.game_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 게임 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '게임 요청이 반려되었습니다',
        '요청하신 게임이 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_create_game(p_name TEXT, p_default_icon_url TEXT)
RETURNS UUID AS $$
DECLARE
    v_game_id UUID;
    v_name TEXT := btrim(p_name);
    v_url TEXT := btrim(p_default_icon_url);
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');

    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    IF v_name IS NULL OR v_name = '' THEN
        RAISE EXCEPTION '게임 이름을 입력해 주세요.';
    END IF;

    IF v_url IS NULL OR v_url = '' THEN
        RAISE EXCEPTION '게임 기본 아이콘 URL을 입력해 주세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.games WHERE name = v_name) THEN
        RAISE EXCEPTION '이미 등록된 게임 이름입니다.';
    END IF;

    INSERT INTO public.games(name, default_icon_url, created_by)
    VALUES (v_name, v_url, auth.uid())
    RETURNING id INTO v_game_id;

    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_subscription_template(p_template_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.subscription_templates
        WHERE id = p_template_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION '삭제할 수 있는 본인 소유의 구독 템플릿이 아닙니다.';
    END IF;

    DELETE FROM public.expenses
    WHERE template_id = p_template_id
      AND user_id = v_user_id
      AND status = 'PLANNED';

    DELETE FROM public.subscription_templates
    WHERE id = p_template_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.dedupe_monthly_planned_expenses(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    PERFORM 1
    FROM public.subscription_templates
    WHERE id = p_template_id
      AND user_id = v_user_id
      AND is_active = true
      AND COALESCE(cycle_type, 'MONTHLY_DAY') = 'MONTHLY_DAY'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '정리할 수 있는 본인 소유의 활성 월간 구독 템플릿이 아닙니다.';
    END IF;

    WITH ranked_planned AS (
        SELECT e.id,
               ROW_NUMBER() OVER (ORDER BY e.target_date ASC, e.id ASC) AS rn
        FROM public.expenses AS e
        WHERE e.user_id = v_user_id
          AND e.template_id = p_template_id
          AND e.status = 'PLANNED'
    ), deleted AS (
        DELETE FROM public.expenses AS e
        USING ranked_planned AS r
        WHERE e.id = r.id AND r.rn > 1
        RETURNING e.id
    )
    SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================== 
-- RLS 격리 및 보안 정책
-- ==============================================================================

ALTER TABLE public.user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_point_transactions ENABLE ROW LEVEL SECURITY;

-- games 정책
CREATE POLICY "Allow public read approved games" ON public.games FOR SELECT USING (status = 'APPROVED');
GRANT SELECT ON public.games TO anon;
CREATE POLICY "Allow admin manage games" ON public.games FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage 버킷은 비공개로 생성한다. 설정: 최대 102,400 bytes, 허용 MIME `image/webp`.
-- 클라이언트는 PNG/JPG/JPEG/WebP 원본(최대 5 MiB)을 256x256 WebP(최대 100 KiB)로 변환해 업로드한다.
-- Storage 정책은 storage.objects에 별도 적용한다.
CREATE POLICY "Users read own icons" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own icons" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own icons" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own icons" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own game requests" ON public.game_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_game_id IS NULL);
CREATE POLICY "Users read own game requests" ON public.game_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Admin manage game requests" ON public.game_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- game_schedules 정책 (공용 읽기, 관리자만 쓰기)
CREATE POLICY "Allow public read schedules" ON public.game_schedules FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.game_schedules TO anon;
CREATE POLICY "Allow anon read official schedules" ON public.game_schedules FOR SELECT TO anon USING (is_official = true);
CREATE POLICY "Allow admin manage schedules" ON public.game_schedules FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- schedule_requests 정책 (유저는 본인 등록/조회만, 관리자는 전체 검토)
CREATE POLICY "Users insert own requests" ON public.schedule_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL);
CREATE POLICY "Users read own requests" ON public.schedule_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage requests" ON public.schedule_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 개인 데이터 기본 격리 (auth.uid() = user_id)
CREATE POLICY "Read own finances" ON public.user_finances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Manage own budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own user_games" ON public.user_games FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own memos" ON public.personal_memos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read own templates" ON public.subscription_templates FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Insert own templates" ON public.subscription_templates FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own templates" ON public.subscription_templates FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
-- 구독 종료는 비활성화(is_active=false) 또는 템플릿 삭제로 처리한다.
-- 템플릿 삭제는 PLANNED 회차를 함께 정리하는 delete_subscription_template RPC로만 허용하며, 직접 DELETE 정책은 두지 않는다.
CREATE POLICY "Read own expenses" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own planned expenses" ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
CREATE POLICY "Update own planned expenses" ON public.expenses FOR UPDATE TO authenticated
    USING (auth.uid() = user_id AND status = 'PLANNED')
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
-- expenses는 물리 삭제를 허용하지 않는다. 예정 취소/복구는 전용 RPC로 수행한다.

-- 원장 및 지갑: 일반 유저는 직접 수정 불가, 오직 SELECT만 허용 (RPC를 통해서만 쓰기 허용)
CREATE POLICY "Read own wallets" ON public.store_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Read own point transactions" ON public.store_point_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER 함수는 기본 PUBLIC 실행 권한을 회수하고 필요한 인증 사용자에게만 허용한다.
REVOKE ALL ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.refund_expense_payment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_planned_expense(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_cancelled_expense(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_income(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_schedule_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_game_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_game_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_game(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_subscription_template(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dedupe_monthly_planned_expenses(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_expense_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_planned_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_cancelled_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_income(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_schedule_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_game_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_game_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_game(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subscription_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dedupe_monthly_planned_expenses(UUID) TO authenticated;

-- 계정 탈퇴 만료 요청 5분 주기 정리 (pg_cron). purge 함수는 위 계정 삭제 절에서 정의한다.
-- (출처: migrations/MIGRATION_PG_CRON.sql)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-account-purge') THEN
        PERFORM cron.unschedule('chronoledger-account-purge');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-account-purge',
        '*/5 * * * *',
        'SELECT public.purge_expired_account_deletion_requests(10);'
    );

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-notifications-purge') THEN
        PERFORM cron.unschedule('chronoledger-notifications-purge');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-notifications-purge',
        '15 0 * * *',
        'SELECT public.purge_expired_notifications();'
    );

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-daily-notifications') THEN
        PERFORM cron.unschedule('chronoledger-daily-notifications');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-daily-notifications',
        '0 0 * * *',
        'SELECT public.enqueue_daily_notifications();'
    );

    -- R96: re-run the worker every 5 minutes while recent PENDING rows exist (429/5xx retries, missed webhooks).
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-push-retry') THEN
        PERFORM cron.unschedule('chronoledger-push-retry');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-push-retry',
        '*/5 * * * *',
        $cron$SELECT public.invoke_send_notifications_webhook() WHERE EXISTS (SELECT 1 FROM public.notifications WHERE push_status = 'PENDING' AND created_at >= NOW() - INTERVAL '1 day');$cron$
    );
END;
$$;
