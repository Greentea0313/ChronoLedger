-- ==============================================================================
-- ChronoLedger Migration: 확정 지출 비회계 메타데이터(제목, 카테고리, 메모) 수정 RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_confirmed_expense_metadata(
    p_expense_id UUID,
    p_title VARCHAR(150),
    p_category VARCHAR(50),
    p_memo TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_status VARCHAR(20);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RAISE EXCEPTION '항목명을 입력해 주세요.';
    END IF;

    IF p_category NOT IN ('게임', '정기 구독', '식비', '교통', '생활', '기타') THEN
        RAISE EXCEPTION '올바르지 않은 카테고리입니다.';
    END IF;

    SELECT status INTO v_status
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '지출 내역을 찾을 수 없습니다.';
    END IF;

    IF v_status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '결제 완료된 지출만 메타데이터를 수정할 수 있습니다.';
    END IF;

    UPDATE public.expenses
    SET title = btrim(p_title),
        category = p_category,
        memo = p_memo
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT) TO authenticated;

