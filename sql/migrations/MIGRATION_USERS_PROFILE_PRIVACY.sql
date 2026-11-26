-- public.users 프로필 노출 축소 마이그레이션 (보안 검토 S1, docs/security-and-competitiveness-review.md)
-- 1) "Anyone can view user profiles"(authenticated 전체 SELECT)를 본인 행 SELECT로 교체함.
--    앱은 본인 행(role, nickname, show_unofficial_schedules)만 읽고, 다른 테이블 정책의
--    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') 판정도 본인 행만 보므로 동작 유지됨.
--    SECURITY DEFINER 함수는 RLS를 우회하므로 영향 없음.
-- 2) 가입 트리거 기본 닉네임을 이메일 앞부분 대신 가입 메타데이터 nickname(앞뒤 공백 제거, 최대 20자) 또는 NULL로 바꿈.
--    기존 행의 닉네임은 바꾸지 않음(본인만 조회 가능해지므로 노출은 1)로 해소됨).
-- 3) nickname 길이 상한(64자)과 공백만 있는 값 금지 CHECK를 추가함. 위반 기존 행은 먼저 정규화함.
-- 재실행해도 안전함.

BEGIN;

DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, nickname)
  VALUES (new.id, 'user', NULLIF(left(btrim(coalesce(new.raw_user_meta_data ->> 'nickname', '')), 20), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.users SET nickname = NULL WHERE nickname IS NOT NULL AND btrim(nickname) = '';
UPDATE public.users SET nickname = left(nickname, 64) WHERE char_length(nickname) > 64;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_nickname_length;
ALTER TABLE public.users ADD CONSTRAINT chk_users_nickname_length
    CHECK (nickname IS NULL OR (char_length(nickname) <= 64 AND btrim(nickname) <> ''));

COMMIT;
