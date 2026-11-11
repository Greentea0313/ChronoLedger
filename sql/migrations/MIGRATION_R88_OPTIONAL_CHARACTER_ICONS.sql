-- R88: regular template characters may use the default avatar without a catalog icon.
BEGIN;

ALTER TABLE public.game_characters
    DROP CONSTRAINT IF EXISTS chk_game_characters_icon_or_pickup_only;

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
    RETURN v_character_id;
END;
$$;

COMMIT;
