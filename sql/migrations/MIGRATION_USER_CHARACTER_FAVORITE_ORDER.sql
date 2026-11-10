-- R63: persist the order of owned favorite characters.
-- Safe to re-run on an existing ChronoLedger schema.
BEGIN;

ALTER TABLE public.user_characters
    ADD COLUMN IF NOT EXISTS favorite_sort_order INTEGER;

UPDATE public.user_characters
SET is_favorite = false
WHERE NOT is_owned AND is_favorite;

WITH ranked AS (
    SELECT
        uc.id,
        row_number() OVER (
            PARTITION BY uc.user_id, uc.game_id
            ORDER BY gc.name, gc.id
        ) AS favorite_sort_order
    FROM public.user_characters uc
    JOIN public.game_characters gc ON gc.id = uc.character_id
    WHERE uc.is_owned AND uc.is_favorite AND uc.favorite_sort_order IS NULL
)
UPDATE public.user_characters uc
SET favorite_sort_order = ranked.favorite_sort_order
FROM ranked
WHERE uc.id = ranked.id;

UPDATE public.user_characters
SET favorite_sort_order = NULL
WHERE NOT is_favorite;

CREATE INDEX IF NOT EXISTS idx_user_characters_favorite_order
    ON public.user_characters(user_id, game_id, favorite_sort_order)
    WHERE is_favorite;

CREATE OR REPLACE FUNCTION public.validate_user_character_game()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_game_id UUID;
    v_max_breakthrough SMALLINT;
    v_is_pickup_only BOOLEAN;
BEGIN
    SELECT game_id, is_pickup_only INTO v_game_id, v_is_pickup_only
    FROM public.game_characters WHERE id = NEW.character_id;
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
    WHERE uc.user_id = v_user_id
      AND uc.game_id = p_game_id
      AND uc.is_owned
      AND uc.is_favorite;

    SELECT COALESCE(array_agg(item.character_id ORDER BY item.character_id), '{}'::UUID[])
    INTO v_requested
    FROM unnest(p_character_ids) AS item(character_id);

    IF v_requested IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION '즐겨찾기 캐릭터 목록이 현재 상태와 일치하지 않습니다.';
    END IF;

    UPDATE public.user_characters uc
    SET favorite_sort_order = ordered.sort_order,
        updated_at = NOW()
    FROM unnest(p_character_ids) WITH ORDINALITY AS ordered(character_id, sort_order)
    WHERE uc.user_id = v_user_id
      AND uc.game_id = p_game_id
      AND uc.character_id = ordered.character_id
      AND uc.is_owned
      AND uc.is_favorite;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_favorite_characters(UUID, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_favorite_characters(UUID, UUID[]) TO authenticated;

COMMIT;
