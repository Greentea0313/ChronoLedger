-- R64: Store icons for classification axis options.

CREATE TABLE IF NOT EXISTS public.game_classification_icons (
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    axis_key TEXT NOT NULL,
    option_value TEXT NOT NULL,
    icon_data_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (game_id, axis_key, option_value),
    CONSTRAINT chk_game_classification_icons_axis_key CHECK (axis_key ~ '^[a-z0-9_]{1,24}$'),
    CONSTRAINT chk_game_classification_icons_option CHECK (
        length(btrim(option_value)) BETWEEN 1 AND 100
    ),
    CONSTRAINT chk_game_classification_icons_icon CHECK (
        length(icon_data_url) <= 20000
        AND icon_data_url LIKE 'data:image/webp;base64,%'
    )
);

CREATE OR REPLACE FUNCTION public.validate_game_classification_icon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_schema JSONB;
BEGIN
    SELECT classification_schema
    INTO v_schema
    FROM public.games
    WHERE id = NEW.game_id
    FOR SHARE;

    IF NOT FOUND OR NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_schema -> 'axes') AS axis(value)
        WHERE axis.value ->> 'key' = NEW.axis_key
          AND (axis.value -> 'options') ? NEW.option_value
    ) THEN
        RAISE EXCEPTION 'classification option not found' USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_game_classification_icon() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_game_classification_icons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.game_classification_icons icon
    WHERE icon.game_id = NEW.id
      AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(NEW.classification_schema -> 'axes') AS axis(value)
          WHERE axis.value ->> 'key' = icon.axis_key
            AND (axis.value -> 'options') ? icon.option_value
      );
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_game_classification_icons() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_game_classification_icon ON public.game_classification_icons;
CREATE TRIGGER trg_validate_game_classification_icon
BEFORE INSERT OR UPDATE ON public.game_classification_icons
FOR EACH ROW EXECUTE FUNCTION public.validate_game_classification_icon();

DROP TRIGGER IF EXISTS trg_cleanup_game_classification_icons ON public.games;
CREATE TRIGGER trg_cleanup_game_classification_icons
AFTER UPDATE OF classification_schema ON public.games
FOR EACH ROW
WHEN (OLD.classification_schema IS DISTINCT FROM NEW.classification_schema)
EXECUTE FUNCTION public.cleanup_game_classification_icons();

ALTER TABLE public.game_classification_icons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_classification_icons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_classification_icons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_classification_icons TO authenticated;

DROP POLICY IF EXISTS "Read icons of approved games" ON public.game_classification_icons;
CREATE POLICY "Read icons of approved games"
ON public.game_classification_icons
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.games g
        WHERE g.id = game_id AND g.status = 'APPROVED'
    )
);

DROP POLICY IF EXISTS "Admin manage classification icons" ON public.game_classification_icons;
CREATE POLICY "Admin manage classification icons"
ON public.game_classification_icons
FOR ALL
TO authenticated
USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false))
WITH CHECK (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false));
