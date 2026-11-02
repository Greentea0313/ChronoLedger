-- public.users.role 자기 승격 차단 마이그레이션
-- "Users can update their own profile" 정책은 본인 행의 모든 컬럼 UPDATE를 허용하므로,
-- 일반 사용자가 role을 'admin'으로 바꾸면 users.role 기반 관리자 판정을 통과할 수 있었습니다.
-- API 역할(authenticated/anon)로 실행된 UPDATE에서 role 변경을 거부합니다.
-- 컬럼 단위 GRANT 대신 트리거를 쓰는 이유: 이후 GRANT ALL ... TO authenticated가 실행되어도 보호가 유지됩니다.
-- SQL Editor(postgres), service_role, SECURITY DEFINER 함수 경로의 관리자 지정은 계속 동작합니다.
-- 재실행해도 안전합니다.

CREATE OR REPLACE FUNCTION public.prevent_users_role_self_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND current_user IN ('authenticated', 'anon') THEN
        RAISE EXCEPTION '사용자 역할은 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_users_role_self_change ON public.users;
CREATE TRIGGER trg_prevent_users_role_self_change
BEFORE UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_users_role_self_change();
