-- ⚠️ ARCHIVE — 재실행 금지. 내용은 sql/SCHEMA.sql 및 sql/migrations/의 최신판으로 대체되었다.
-- 구버전 RPC/제약을 포함할 수 있어 실행 시 최신 정의를 되돌린다. 이력 참고용 (sql/README.md).

-- users 테이블의 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON public.users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;

-- 무한 재귀(Infinite Recursion)를 방지하기 위해 단순하게 변경
CREATE POLICY "Anyone can view user profiles" 
ON public.users FOR SELECT TO authenticated
USING (true);

-- UPDATE 정책도 확실하게 재정의
DROP POLICY IF EXISTS "Users can update their own nickname" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
