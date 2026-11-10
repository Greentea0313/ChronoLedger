-- R76: Allow empty presets and atomically save preset board changes.

DO $$
DECLARE
    v_constraint RECORD;
BEGIN
    FOR v_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.user_character_presets'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%cardinality(character_ids)%'
          AND conname <> 'chk_user_character_presets_character_ids'
    LOOP
        EXECUTE format('ALTER TABLE public.user_character_presets DROP CONSTRAINT %I', v_constraint.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.user_character_presets
    DROP CONSTRAINT IF EXISTS chk_user_character_presets_character_ids;
ALTER TABLE public.user_character_presets
    ADD CONSTRAINT chk_user_character_presets_character_ids
    CHECK (cardinality(character_ids) BETWEEN 0 AND 12 AND array_position(character_ids, NULL) IS NULL);

CREATE OR REPLACE FUNCTION public.cleanup_deleted_game_character_presets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_character_presets
    SET character_ids = array_remove(character_ids, OLD.id), updated_at = NOW()
    WHERE game_id = OLD.game_id AND OLD.id = ANY(character_ids);
    UPDATE public.game_schedules
    SET pickup_character_ids = array_remove(pickup_character_ids, OLD.id), updated_at = NOW()
    WHERE game_id = OLD.game_id AND OLD.id = ANY(pickup_character_ids);
    UPDATE public.schedule_requests
    SET pickup_character_ids = array_remove(pickup_character_ids, OLD.id)
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
        RAISE EXCEPTION '로그인한 사용자만 프리셋 순서를 변경할 수 있습니다.';
    END IF;
    IF p_game_id IS NULL OR p_preset_ids IS NULL THEN
        RAISE EXCEPTION '게임과 프리셋 목록이 필요합니다.' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(array_agg(id ORDER BY id), '{}'::UUID[])
    INTO v_expected
    FROM public.user_character_presets
    WHERE user_id = v_user_id AND game_id = p_game_id;
    SELECT COALESCE(array_agg(id ORDER BY id), '{}'::UUID[])
    INTO v_requested
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
