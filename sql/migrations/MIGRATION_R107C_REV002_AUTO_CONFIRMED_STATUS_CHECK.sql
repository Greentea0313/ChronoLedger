-- R107C-REV-002: expenses.auto_confirmed_at 상태 불변식 (리뷰 artifacts/r107c-auto-confirm/iteration-01/review.json)
-- 자동 확정 시각은 확정(CONFIRMED) 또는 이후 환불(CANCELLED)된 행에만 남는다. 예정(PLANNED) 행에 값이 있으면
-- 배지·EXPENSE_AUTO_CONFIRMED 요약이 잘못 잡히므로 CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED')를 둔다.
-- 자동 확정(확정 후 기록)·환불(CONFIRMED -> CANCELLED)·환불 롤백(PLANNED 날짜만 변경)·restore_cancelled_expense(PLANNED_CANCEL만,
-- 해당 행은 PLANNED 상태에서 취소되어 값이 없음) 경로는 이 제약을 위반하지 않는다.
-- 적용 전 위반 행 확인: SELECT count(*) FROM public.expenses WHERE status = 'PLANNED' AND auto_confirmed_at IS NOT NULL;
-- 위반 행이 있으면 제약을 NOT VALID로 추가해 새 쓰기만 막고(기존 행 유지, NOTICE로 건수 출력), 정리 후 재실행하면 VALID로 다시 만든다.
-- 선행 조건: MIGRATION_R107C_AUTO_CONFIRM.sql 적용 이후 실행한다. 재실행 안전.
BEGIN;

DO $$
DECLARE
    v_violations BIGINT;
BEGIN
    ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS chk_expense_auto_confirmed_status;
    SELECT count(*) INTO v_violations
    FROM public.expenses
    WHERE status = 'PLANNED' AND auto_confirmed_at IS NOT NULL;
    IF v_violations = 0 THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT chk_expense_auto_confirmed_status CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED');
    ELSE
        ALTER TABLE public.expenses
            ADD CONSTRAINT chk_expense_auto_confirmed_status CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED') NOT VALID;
        RAISE NOTICE 'R107C-REV-002: % PLANNED row(s) already have auto_confirmed_at; constraint added NOT VALID', v_violations;
    END IF;
END $$;

COMMIT;
