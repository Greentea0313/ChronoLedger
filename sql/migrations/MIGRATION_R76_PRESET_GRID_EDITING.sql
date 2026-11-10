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
    v_changes JSONB;
    v_ids UUID[];
    v_id UUID;
    v_game_id UUID;
    v_expected UUID[];
    v_next UUID[];
    v_current UUID[];
    v_row_count INTEGER;
    v_expected_union UUID[];
    v_next_union UUID[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인한 사용자만 프리셋을 변경할 수 있습니다.';
    END IF;
    IF jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 2 THEN
        RAISE EXCEPTION '프리셋 변경은 1~2개 행이어야 합니다.' USING ERRCODE = '22023';
    END IF;

    SELECT array_agg(item.id ORDER BY item.id)
    INTO v_ids
    FROM jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB);
    IF v_ids IS NULL OR cardinality(v_ids) <> jsonb_array_length(p_changes)
       OR cardinality(v_ids) <> cardinality(ARRAY(SELECT DISTINCT id FROM unnest(v_ids) AS ids(id))) THEN
        RAISE EXCEPTION '프리셋 ID가 중복되었거나 올바르지 않습니다.' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_row_count
    FROM public.user_character_presets
    WHERE id = ANY(v_ids) AND user_id = v_user_id;
    IF v_row_count <> cardinality(v_ids) THEN
        RAISE EXCEPTION 'preset changed' USING ERRCODE = '40001';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS _r76_preset_changes (
        id UUID PRIMARY KEY,
        expected UUID[] NOT NULL,
        next_ids UUID[] NOT NULL,
        game_id UUID NOT NULL
    ) ON COMMIT DROP;
    TRUNCATE _r76_preset_changes;
    SELECT item.id INTO v_id
    FROM public.user_character_presets preset
    JOIN jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB)
      ON item.id = preset.id
    WHERE preset.user_id = v_user_id
    ORDER BY item.id
    FOR UPDATE;
    INSERT INTO _r76_preset_changes (id, expected, next_ids, game_id)
    SELECT item.id,
           ARRAY(SELECT value::text::uuid FROM jsonb_array_elements(item.expected) AS values(value)),
           ARRAY(SELECT value::text::uuid FROM jsonb_array_elements(item.next) AS values(value)),
           preset.game_id
    FROM jsonb_to_recordset(p_changes) AS item(id UUID, expected JSONB, next JSONB)
    JOIN public.user_character_presets preset ON preset.id = item.id AND preset.user_id = v_user_id;

    SELECT count(*) INTO v_row_count FROM _r76_preset_changes;
    IF v_row_count <> cardinality(v_ids) THEN
        RAISE EXCEPTION 'preset changed' USING ERRCODE = '40001';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _r76_preset_changes change
        JOIN public.user_character_presets preset ON preset.id = change.id
        WHERE preset.character_ids IS DISTINCT FROM change.expected
    ) THEN
        RAISE EXCEPTION 'preset changed' USING ERRCODE = '40001';
    END IF;
    IF (SELECT count(DISTINCT game_id) FROM _r76_preset_changes) > 1 THEN
        RAISE EXCEPTION '프리셋 간 이동은 같은 게임에서만 가능합니다.' USING ERRCODE = '22023';
    END IF;
    IF cardinality(v_ids) = 2 THEN
        SELECT ARRAY(
            SELECT character_id FROM _r76_preset_changes, unnest(expected) AS characters(character_id)
            ORDER BY character_id
        ) INTO v_expected_union;
        SELECT ARRAY(
            SELECT character_id FROM _r76_preset_changes, unnest(next_ids) AS characters(character_id)
            ORDER BY character_id
        ) INTO v_next_union;
        IF v_expected_union IS DISTINCT FROM v_next_union THEN
            RAISE EXCEPTION 'invalid move' USING ERRCODE = '22023';
        END IF;
    END IF;

    FOR v_id, v_next IN
        SELECT id, next_ids FROM _r76_preset_changes ORDER BY id
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
