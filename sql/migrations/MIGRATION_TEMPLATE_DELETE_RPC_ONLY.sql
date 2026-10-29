-- subscription_templates 직접 DELETE 정책 제거 마이그레이션
-- 템플릿 삭제는 미결제(PLANNED) 회차 정리와 함께 원자적으로 처리되는
-- SECURITY DEFINER RPC public.delete_subscription_template(UUID)로만 수행합니다.
-- 직접 DELETE를 허용하면 PLANNED 회차는 RLS로 삭제되지 않은 채 template_id만 NULL이 되어
-- 템플릿 없는 예정 지출이 남습니다. 재실행해도 안전합니다.

DROP POLICY IF EXISTS "Delete own templates" ON public.subscription_templates;
