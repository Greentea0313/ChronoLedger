-- 구독 일시 중지 시 미결제 예정 회차를 삭제하고, 기존 비활성화 취소 행을 정리합니다.
-- 재실행 안전: trigger/function은 교체하고 정리 대상 행이 없으면 DELETE는 아무 작업도 하지 않습니다.
BEGIN;

DROP TRIGGER IF EXISTS trg_cancel_planned_expenses_on_template_deactivation ON public.subscription_templates;
DROP TRIGGER IF EXISTS trg_delete_planned_expenses_on_template_deactivation ON public.subscription_templates;
DROP FUNCTION IF EXISTS public.cancel_planned_expenses_on_template_deactivation();

DELETE FROM public.expenses
WHERE status = 'PLANNED'
  AND template_id IN (
      SELECT id FROM public.subscription_templates WHERE is_active = false
  );

DELETE FROM public.expenses
WHERE status = 'CANCELLED'
  AND cancellation_kind = 'TEMPLATE_DEACTIVATION';

CREATE OR REPLACE FUNCTION public.delete_planned_expenses_on_template_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        DELETE FROM public.expenses
        WHERE template_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_delete_planned_expenses_on_template_deactivation
AFTER UPDATE OF is_active ON public.subscription_templates
FOR EACH ROW EXECUTE FUNCTION public.delete_planned_expenses_on_template_deactivation();

CREATE OR REPLACE FUNCTION public.restore_cancelled_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses AS e
    SET status = 'PLANNED', cancellation_kind = NULL
    WHERE e.id = p_expense_id AND e.user_id = v_user_id AND e.status = 'CANCELLED'
      AND e.cancellation_kind = 'PLANNED_CANCEL';
    IF NOT FOUND THEN RAISE EXCEPTION '복구 가능한 예정 취소 항목이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
