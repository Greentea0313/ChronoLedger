-- personal_memos 테이블에 (user_id, memo_date) 유니크 제약조건 추가 마이그레이션
-- 혹시 과거 중복 레코드가 있을 경우 최신 레코드 1건만 유지하고 정리
DELETE FROM public.personal_memos a
USING public.personal_memos b
WHERE a.user_id = b.user_id
  AND a.memo_date = b.memo_date
  AND a.created_at < b.created_at;

-- UNIQUE 제약조건 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_personal_memos_user_date'
    ) THEN
        ALTER TABLE public.personal_memos
        ADD CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date);
    END IF;
END $$;

