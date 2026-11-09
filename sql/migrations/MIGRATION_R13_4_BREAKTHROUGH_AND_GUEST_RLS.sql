BEGIN;

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS max_breakthrough SMALLINT NOT NULL DEFAULT 6
    CHECK (max_breakthrough BETWEEN 0 AND 12);

ALTER TABLE public.user_characters
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS breakthrough_level SMALLINT NOT NULL DEFAULT 0
    CHECK (breakthrough_level BETWEEN 0 AND 12);

CREATE OR REPLACE FUNCTION public.validate_user_character_game()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game_id UUID; v_max_breakthrough SMALLINT;
BEGIN
    SELECT game_id INTO v_game_id FROM public.game_characters WHERE id = NEW.character_id;
    IF NOT FOUND OR v_game_id IS DISTINCT FROM NEW.game_id THEN
        RAISE EXCEPTION '캐릭터가 선택한 게임에 속하지 않습니다.';
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

DROP TRIGGER IF EXISTS trg_validate_user_character_game ON public.user_characters;
CREATE TRIGGER trg_validate_user_character_game BEFORE INSERT OR UPDATE ON public.user_characters
FOR EACH ROW EXECUTE FUNCTION public.validate_user_character_game();

GRANT SELECT ON public.games, public.game_schedules TO anon;
DROP POLICY IF EXISTS "Allow anon read official schedules" ON public.game_schedules;
CREATE POLICY "Allow anon read official schedules" ON public.game_schedules
    FOR SELECT TO anon USING (is_official = true);

COMMIT;
