-- ==============================================================================
-- ChronoLedger Phase 11 Migration
-- 게임 일정 카테고리 CONTENTS 확장
-- ==============================================================================

-- 1. 게임 공용 일정 schedule_type 에 CONTENTS 추가 (PostgreSQL 자동 생성 이름 및 커스텀 이름 모두 처리)
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_schedule_type_check;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS chk_schedule_type;
ALTER TABLE public.game_schedules ADD CONSTRAINT game_schedules_schedule_type_check
    CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS'));

-- 2. 일정 건의 요청 schedule_type 에 CONTENTS 추가
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS schedule_requests_schedule_type_check;
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_type;
ALTER TABLE public.schedule_requests ADD CONSTRAINT schedule_requests_schedule_type_check
    CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS'));

-- 3. 일정 날짜 변경 시 예정 지출 동기화 트리거 함수 갱신
CREATE OR REPLACE FUNCTION public.sync_version_expenses_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS')
       AND (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
        UPDATE public.expenses
        SET start_date = NEW.start_date,
            end_date = NEW.end_date,
            target_date = NEW.end_date
        WHERE schedule_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

