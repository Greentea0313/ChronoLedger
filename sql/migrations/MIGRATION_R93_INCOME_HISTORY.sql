-- R93: income history (owner-only read, RPC-only writes kept in sync with user_finances.total_asset,
-- pending-deletion block, account purge integration).
-- Idempotent: safe to re-run in the Supabase SQL Editor.
BEGIN;

CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('급여', '용돈', '상여금', '금융수익', '기타')),
    title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
    amount BIGINT NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes(user_id, income_date DESC, created_at DESC);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
-- Supabase default privileges grant ALL to anon/authenticated on new public tables; reset to read-only.
-- Writes go through record_income/delete_income so incomes and total_asset never drift apart.
REVOKE ALL ON public.incomes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.incomes TO authenticated;

DROP POLICY IF EXISTS "Read own incomes" ON public.incomes;
CREATE POLICY "Read own incomes" ON public.incomes FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from incomes" ON public.incomes;
CREATE POLICY "Block account deletion users from incomes" ON public.incomes
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_incomes ON public.incomes;
CREATE TRIGGER block_pending_account_deletion_incomes
    BEFORE INSERT OR UPDATE OR DELETE ON public.incomes
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

-- Record one income and raise total_asset by the same amount in one transaction.
CREATE OR REPLACE FUNCTION public.record_income(
    p_category VARCHAR(50),
    p_title VARCHAR(150),
    p_amount BIGINT,
    p_income_date DATE,
    p_memo TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_income_id UUID;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF p_category IS NULL OR p_category NOT IN ('급여', '용돈', '상여금', '금융수익', '기타') THEN
        RAISE EXCEPTION '수익 유형이 올바르지 않습니다.';
    END IF;
    IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION '수익 항목명은 1자 이상 100자 이하로 입력해야 합니다.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION '수익 금액은 0보다 커야 합니다.';
    END IF;
    IF p_income_date IS NULL THEN
        RAISE EXCEPTION '입금일을 입력해야 합니다.';
    END IF;

    INSERT INTO public.incomes(user_id, category, title, amount, income_date, memo)
    VALUES (v_user_id, p_category, btrim(p_title), p_amount, p_income_date, p_memo)
    RETURNING id INTO v_income_id;

    INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at)
    VALUES (v_user_id, p_amount, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = public.user_finances.total_asset + EXCLUDED.total_asset,
        updated_at = NOW();

    RETURN v_income_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Delete one own income and subtract its amount from total_asset in one transaction.
CREATE OR REPLACE FUNCTION public.delete_income(p_income_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_income public.incomes%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;

    SELECT * INTO v_income
    FROM public.incomes
    WHERE id = p_income_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '삭제할 수 있는 본인 소유의 수익 내역이 아닙니다.';
    END IF;

    DELETE FROM public.incomes WHERE id = p_income_id AND user_id = v_user_id;

    UPDATE public.user_finances
    SET total_asset = total_asset - v_income.amount,
        updated_at = NOW()
    WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_income(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_income(UUID) TO authenticated;

-- Account purge: also delete incomes (body otherwise identical to sql/SCHEMA.sql).
CREATE OR REPLACE FUNCTION public.purge_expired_account_deletion_requests(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    v_req RECORD;
    v_purged_count INTEGER := 0;
BEGIN
    FOR v_req IN
        SELECT id, user_id
        FROM public.account_deletion_requests
        WHERE status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'AUTH_DELETE_PENDING')
          AND retry_after <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    LOOP
        UPDATE public.account_deletion_requests
        SET locked_until = NOW() + INTERVAL '5 minutes',
            attempt_count = attempt_count + 1,
            updated_at = NOW()
        WHERE id = v_req.id;

        IF v_req.user_id IS NOT NULL THEN
            DELETE FROM storage.objects
            WHERE bucket_id = 'user-icons'
              AND (name LIKE v_req.user_id || '/%' OR (path_tokens IS NOT NULL AND path_tokens[1] = v_req.user_id::text));

            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.expenses WHERE user_id = v_req.user_id;
            DELETE FROM public.incomes WHERE user_id = v_req.user_id;
            DELETE FROM public.subscription_templates WHERE user_id = v_req.user_id;
            DELETE FROM public.personal_memos WHERE user_id = v_req.user_id;
            DELETE FROM public.user_favorite_schedules WHERE user_id = v_req.user_id;
            DELETE FROM public.user_character_presets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_characters WHERE user_id = v_req.user_id;
            DELETE FROM public.character_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.user_games WHERE user_id = v_req.user_id;
            DELETE FROM public.monthly_budgets WHERE user_id = v_req.user_id;
            DELETE FROM public.store_wallets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_finances WHERE user_id = v_req.user_id;

            DELETE FROM auth.users WHERE id = v_req.user_id;
        END IF;

        UPDATE public.account_deletion_requests
        SET status = 'COMPLETED',
            storage_completed_at = NOW(),
            data_completed_at = NOW(),
            user_id = NULL,
            locked_until = NULL,
            last_error_code = NULL,
            updated_at = NOW()
        WHERE id = v_req.id;

        v_purged_count := v_purged_count + 1;
    END LOOP;

    RETURN v_purged_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, storage;

REVOKE ALL ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) TO service_role;

COMMIT;
