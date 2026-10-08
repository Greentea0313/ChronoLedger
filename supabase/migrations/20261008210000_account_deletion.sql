CREATE TABLE public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    status_token_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'EMAIL_PENDING', 'AUTH_DELETE_PENDING', 'MANUAL_REVIEW', 'COMPLETED')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    retry_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    last_error_code VARCHAR(50),
    storage_completed_at TIMESTAMPTZ,
    data_completed_at TIMESTAMPTZ,
    email_attempted_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_deletion_requests_due
    ON public.account_deletion_requests(retry_after)
    WHERE status <> 'COMPLETED';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT (status, requested_at, updated_at)
    ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

CREATE POLICY "Users read own account deletion status"
    ON public.account_deletion_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.account_deletion_is_pending(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.account_deletion_requests
        WHERE user_id = p_user_id AND status <> 'COMPLETED'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.account_deletion_is_pending(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_is_pending(UUID) TO authenticated;

CREATE POLICY "Block account deletion users from storage"
    ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'personal_memos', 'subscription_templates',
        'store_wallets', 'expenses', 'store_point_transactions'
    ] LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_deletion_is_pending(auth.uid())) WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()))',
            'Block account deletion users from ' || v_table,
            v_table
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_deletion_requests(p_limit INTEGER DEFAULT 5)
RETURNS SETOF public.account_deletion_requests AS $$
BEGIN
    IF p_limit < 1 OR p_limit > 20 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 20';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT id
        FROM public.account_deletion_requests
        WHERE status NOT IN ('COMPLETED', 'MANUAL_REVIEW')
          AND retry_after <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.account_deletion_requests AS request
    SET locked_until = NOW() + INTERVAL '5 minutes',
        attempt_count = request.attempt_count + 1,
        updated_at = NOW()
    FROM due
    WHERE request.id = due.id
    RETURNING request.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_deletion_requests(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.block_pending_account_data_mutations()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    IF auth.uid() = v_user_id AND public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'personal_memos', 'subscription_templates',
        'store_wallets', 'expenses', 'store_point_transactions'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations()',
            'block_pending_account_deletion_' || v_table,
            v_table
        );
    END LOOP;
END;
$$;
