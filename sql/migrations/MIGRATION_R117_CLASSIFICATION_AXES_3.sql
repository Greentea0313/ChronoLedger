-- R117: 캐릭터 분류 축 최대 3개로 확대 (사용자 결정 2026-11-27, 원 R13 설계값 복원).
-- is_valid_classification_schema의 축 수 상한만 2 -> 3으로 바꿈(나머지 검증 규칙 불변). games_classification_schema_check가
-- 이 함수를 그대로 참조하므로 제약 재생성은 필요 없고, 기존 0~2축 데이터는 계속 유효함.
-- 분류 값 검증(approve_character_request)·분류 아이콘 트리거는 축 수와 무관하게 schema의 axes 전체를 보므로 바꾸지 않음.
-- ⚠️ 이후 MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql을 다시 실행하면 상한이 2로 돌아감(3축 게임이 있으면 R52 사전 점검에서 중단됨).
--    R52를 다시 실행했다면 이 파일도 다시 실행함. 재실행 안전.
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
       OR jsonb_array_length(p_schema -> 'axes') > 3
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

COMMIT;
