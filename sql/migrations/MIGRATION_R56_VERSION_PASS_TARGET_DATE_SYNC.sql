-- R56: keep version-pass PLANNED expenses due on the version end date when a VERSION schedule moves.
-- A version pass stores the version period in start_date/end_date and target_date = end_date.
-- Other VERSION-linked PLANNED expenses keep following the new start date. Safe to re-run.
BEGIN;

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

COMMIT;
