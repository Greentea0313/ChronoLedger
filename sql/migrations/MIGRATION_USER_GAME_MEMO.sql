-- public.user_games 테이블에 게임별 상시 메모(memo) 컬럼 추가 마이그레이션
-- 특정 일정에 귀속되지 않는 게임별 상시 개인 메모를 저장합니다.

ALTER TABLE public.user_games
ADD COLUMN IF NOT EXISTS memo TEXT;

COMMENT ON COLUMN public.user_games.memo IS '사용자 지정 게임별 상시 메모 (특정 일정 무관 개인 목표/메모)';
