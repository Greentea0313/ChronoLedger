-- R115: CSV 결제 내역 가져오기 (명세 docs/r113-r116-data-budget-public-spec.md §5, I1~I16, 인수 기준 115-1~115-9)
-- 1) expenses.import_batch_id(UUID NULL)와 부분 인덱스 idx_expenses_user_import_batch 추가.
-- 2) import_confirmed_expenses(JSONB): 본인 확정 행을 한 번에 1~1,000행 넣음. 값은 항상 CONFIRMED·WALLET·자산 미차감·
--    할인·포인트 0(I1)이라 총자산·지갑·포인트 원장이 바뀌지 않고, 이후 환불해도 바뀌지 않음. 한 행이라도 틀리면 전체 거부(I4).
-- 3) delete_import_batch(UUID): 본인 배치 중 I1 값을 그대로 지닌 행만 삭제하고 삭제 수를 돌려줌(I6).
-- 결제·환불 RPC와 기존 expenses 정책은 바꾸지 않음(115-8). 재실행 안전.
BEGIN;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS import_batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_expenses_user_import_batch
    ON public.expenses(user_id, import_batch_id)
    WHERE import_batch_id IS NOT NULL;

-- R115 (MIGRATION_R115_EXPENSE_IMPORT.sql): CSV import of confirmed expense records (spec docs/r113-r116-data-budget-public-spec.md §5, I1~I6).
-- Imported rows are always CONFIRMED + WALLET + deduct_from_asset = false with no discount or points (I1), so neither this RPC
-- nor a later refund_expense_payment touches total_asset, store_wallets or store_point_transactions. One invalid row rejects the whole call (I4).
CREATE OR REPLACE FUNCTION public.import_confirmed_expenses(p_rows JSONB)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_batch_id UUID := gen_random_uuid();
    v_row JSONB;
    v_index BIGINT;
    v_text TEXT;
    v_date DATE;
    v_amount BIGINT;
    v_title TEXT;
    v_category TEXT;
    v_game_id UUID;
    v_memo TEXT;
    v_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
        RAISE EXCEPTION '가져올 행 목록 형식이 올바르지 않습니다.';
    END IF;
    IF jsonb_array_length(p_rows) < 1 OR jsonb_array_length(p_rows) > 1000 THEN
        RAISE EXCEPTION '한 번에 1행부터 1,000행까지 가져올 수 있습니다.';
    END IF;

    FOR v_row, v_index IN SELECT e.value, e.ordinality FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS e LOOP
        IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION '%번째 행: 형식이 올바르지 않습니다.', v_index;
        END IF;

        -- Date: YYYY-MM-DD between 2000-01-01 and today (KST).
        v_text := v_row->>'target_date';
        IF v_text IS NULL OR v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
            RAISE EXCEPTION '%번째 행: 날짜 형식이 올바르지 않습니다.', v_index;
        END IF;
        BEGIN
            v_date := v_text::date;
        EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RAISE EXCEPTION '%번째 행: 날짜 형식이 올바르지 않습니다.', v_index;
        END;
        IF v_date < DATE '2000-01-01' OR v_date > v_today THEN
            RAISE EXCEPTION '%번째 행: 날짜는 2000-01-01부터 오늘까지만 가져올 수 있습니다.', v_index;
        END IF;

        -- Amount: JSON integer 1 ~ 10,000,000,000.
        v_text := v_row->>'amount';
        IF jsonb_typeof(v_row->'amount') IS DISTINCT FROM 'number' OR v_text !~ '^[0-9]{1,11}$' THEN
            RAISE EXCEPTION '%번째 행: 금액은 1원 이상 100억 원 이하 정수여야 합니다.', v_index;
        END IF;
        v_amount := v_text::bigint;
        IF v_amount < 1 OR v_amount > 10000000000 THEN
            RAISE EXCEPTION '%번째 행: 금액은 1원 이상 100억 원 이하 정수여야 합니다.', v_index;
        END IF;

        v_title := btrim(coalesce(v_row->>'title', ''));
        IF char_length(v_title) < 1 OR char_length(v_title) > 150 THEN
            RAISE EXCEPTION '%번째 행: 항목명은 1자 이상 150자 이하여야 합니다.', v_index;
        END IF;

        v_category := v_row->>'category';
        IF v_category IS NULL OR v_category NOT IN ('게임', '정기 구독', '식비', '교통', '생활', '기타') THEN
            RAISE EXCEPTION '%번째 행: 분류가 올바르지 않습니다.', v_index;
        END IF;

        v_text := v_row->>'game_id';
        IF v_text IS NULL THEN
            v_game_id := NULL;
        ELSIF v_text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              AND EXISTS (SELECT 1 FROM public.games AS g WHERE g.id = v_text::uuid) THEN
            v_game_id := v_text::uuid;
        ELSE
            RAISE EXCEPTION '%번째 행: 존재하지 않는 게임입니다.', v_index;
        END IF;

        v_memo := nullif(v_row->>'memo', '');
        IF v_memo IS NOT NULL AND char_length(v_memo) > 500 THEN
            RAISE EXCEPTION '%번째 행: 메모는 500자 이하여야 합니다.', v_index;
        END IF;

        INSERT INTO public.expenses (
            user_id, game_id, title, category, status, target_date,
            original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount,
            point_platform, payment_method, deduct_from_asset, memo, import_batch_id
        ) VALUES (
            v_user_id, v_game_id, v_title, v_category, 'CONFIRMED', v_date,
            v_amount, 0, 0, 0, 0, v_amount,
            NULL, 'WALLET', false, v_memo, v_batch_id
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('batch_id', v_batch_id, 'inserted', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- R115 (I6): undo one import batch. Only the caller's rows that still carry the I1 values (no ledger trace) are deleted,
-- including rows already refunded to CANCELLED/PAYMENT_REFUND. Another user's batch id deletes nothing.
CREATE OR REPLACE FUNCTION public.delete_import_batch(p_batch_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF p_batch_id IS NULL THEN
        RETURN 0;
    END IF;

    DELETE FROM public.expenses AS e
    WHERE e.user_id = v_user_id
      AND e.import_batch_id = p_batch_id
      AND e.payment_method = 'WALLET'
      AND e.deduct_from_asset = false
      AND e.original_price = e.final_amount
      AND e.discount_amount = 0
      AND e.point_discount_amount = 0
      AND e.used_points = 0
      AND e.earned_points = 0
      AND e.point_platform IS NULL
      AND e.template_id IS NULL
      AND e.schedule_id IS NULL
      AND e.pickup_schedule_id IS NULL
      AND (e.status = 'CONFIRMED' OR (e.status = 'CANCELLED' AND e.cancellation_kind = 'PAYMENT_REFUND'));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.import_confirmed_expenses(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_confirmed_expenses(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_import_batch(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_import_batch(UUID) TO authenticated;

COMMIT;
