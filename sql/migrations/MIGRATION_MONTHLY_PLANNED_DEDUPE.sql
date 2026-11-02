-- MONTHLY_DAY 템플릿별 가장 이른 PLANNED 회차만 보존하고 나머지는 정리합니다.
-- runtime 재호출은 소유권 검증 RPC로 수행하며 expenses DELETE 정책은 추가하지 않습니다.
BEGIN;

LOCK TABLE public.expenses IN SHARE ROW EXCLUSIVE MODE;

WITH ranked_planned AS (
    SELECT e.id,
               ROW_NUMBER() OVER (
               PARTITION BY e.template_id
               ORDER BY e.target_date ASC, e.id ASC
               ) AS rn
    FROM public.expenses AS e
    JOIN public.subscription_templates AS t ON t.id = e.template_id
    WHERE e.status = 'PLANNED'
      AND COALESCE(t.cycle_type, 'MONTHLY_DAY') = 'MONTHLY_DAY'
)
DELETE FROM public.expenses AS e
USING ranked_planned AS r
WHERE e.id = r.id AND r.rn > 1;

CREATE OR REPLACE FUNCTION public.dedupe_monthly_planned_expenses(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    PERFORM 1
    FROM public.subscription_templates
    WHERE id = p_template_id
      AND user_id = v_user_id
      AND is_active = true
      AND COALESCE(cycle_type, 'MONTHLY_DAY') = 'MONTHLY_DAY'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '정리할 수 있는 본인 소유의 활성 월간 구독 템플릿이 아닙니다.';
    END IF;

    WITH ranked_planned AS (
        SELECT e.id,
               ROW_NUMBER() OVER (
                   ORDER BY e.target_date ASC, e.id ASC
               ) AS row_number
        FROM public.expenses AS e
        WHERE e.user_id = v_user_id
          AND e.template_id = p_template_id
          AND e.status = 'PLANNED'
    ), deleted AS (
        DELETE FROM public.expenses AS e
        USING ranked_planned AS r
        WHERE e.id = r.id AND r.row_number > 1
        RETURNING e.id
    )
    SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.dedupe_monthly_planned_expenses(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dedupe_monthly_planned_expenses(UUID) TO authenticated;

COMMIT;
