-- ⚠️ ARCHIVE — 재실행 금지. 내용은 sql/SCHEMA.sql 및 sql/migrations/의 최신판으로 대체되었다.
-- 구버전 RPC/제약을 포함할 수 있어 실행 시 최신 정의를 되돌린다. 이력 참고용 (sql/README.md).

-- 1. users 테이블 생성 (역할 및 닉네임 관리)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 설정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile and admins can view all" 
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update their own nickname" 
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. 새 사용자가 가입할 때 자동으로 users 테이블에 레코드를 생성하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, nickname)
  VALUES (new.id, 'user', split_part(new.email, '@', 1)); -- 이메일 앞부분을 기본 닉네임으로 사용
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 있으면 삭제하고 다시 생성 (안전하게)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 기존 가입된 auth.users 데이터를 public.users로 복사 (이미 가입된 유저용)
INSERT INTO public.users (id, role, nickname)
SELECT id, 'user', split_part(email, '@', 1) FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. 특정 이메일을 가진 사용자를 관리자로 지정 (수동 실행용)
-- 아래 이메일 주소를 자신의 구글 계정 이메일로 변경한 뒤 실행하세요.
UPDATE public.users 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = '여기에_본인_이메일@gmail.com');

-- 4. game_schedules 테이블 생성 (버전 및 픽업 일정)

CREATE TABLE IF NOT EXISTS public.game_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('version', 'pickup')),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;

-- 누구나 일정 조회 가능
CREATE POLICY "Anyone can view game schedules" 
ON public.game_schedules FOR SELECT TO authenticated
USING (true);

-- 관리자만 일정 추가/수정/삭제 가능
CREATE POLICY "Only admins can manage game schedules" 
ON public.game_schedules FOR ALL TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

