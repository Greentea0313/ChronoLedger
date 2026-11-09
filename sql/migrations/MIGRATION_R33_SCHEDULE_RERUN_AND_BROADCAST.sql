-- R33: PICKUP rerun flag and BROADCAST schedule kind. Safe to reapply.
BEGIN;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_schedule_type_check;
ALTER TABLE public.game_schedules ADD CONSTRAINT game_schedules_schedule_type_check CHECK (schedule_type IN ('VERSION','PICKUP','CONTENTS','BROADCAST'));
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS schedule_requests_schedule_type_check;
ALTER TABLE public.schedule_requests ADD CONSTRAINT schedule_requests_schedule_type_check CHECK (schedule_type IN ('VERSION','PICKUP','CONTENTS','BROADCAST'));
ALTER TABLE public.game_schedules ADD COLUMN IF NOT EXISTS is_rerun BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.schedule_requests ADD COLUMN IF NOT EXISTS is_rerun BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_game_schedules_rerun_pickup' AND conrelid='public.game_schedules'::regclass) THEN
  ALTER TABLE public.game_schedules ADD CONSTRAINT chk_game_schedules_rerun_pickup CHECK (is_rerun = false OR schedule_type = 'PICKUP');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_schedule_requests_rerun_pickup' AND conrelid='public.schedule_requests'::regclass) THEN
  ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_rerun_pickup CHECK (is_rerun = false OR schedule_type = 'PICKUP');
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.sync_version_expenses_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS', 'BROADCAST')
       AND (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
        UPDATE public.expenses
        SET start_date = NEW.start_date,
            end_date = NEW.end_date,
            target_date = CASE 
                WHEN NEW.schedule_type = 'VERSION' THEN NEW.start_date 
                ELSE NEW.end_date 
            END
        WHERE schedule_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
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
    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo, is_official, is_rerun)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo, v_request.is_official, v_request.is_rerun);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            is_official = v_request.is_official, is_rerun = v_request.is_rerun,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
