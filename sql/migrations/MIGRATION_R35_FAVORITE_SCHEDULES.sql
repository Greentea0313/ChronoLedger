-- R35: user favorite schedules (owner-only RLS, pending-deletion block, account purge integration).
-- Idempotent: safe to re-run in the Supabase SQL Editor.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_favorite_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.game_schedules(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite_schedules_user_schedule UNIQUE (user_id, schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_schedules_user_id ON public.user_favorite_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_schedules_schedule_id ON public.user_favorite_schedules(schedule_id);

ALTER TABLE public.user_favorite_schedules ENABLE ROW LEVEL SECURITY;
-- Supabase default privileges grant ALL to anon/authenticated on new public tables; reset to the exact set.
REVOKE ALL ON public.user_favorite_schedules FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_favorite_schedules TO authenticated;

DROP POLICY IF EXISTS "Manage own favorite schedules" ON public.user_favorite_schedules;
CREATE POLICY "Manage own favorite schedules" ON public.user_favorite_schedules FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from user_favorite_schedules" ON public.user_favorite_schedules;
CREATE POLICY "Block account deletion users from user_favorite_schedules" ON public.user_favorite_schedules
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_user_favorite_schedules ON public.user_favorite_schedules;
CREATE TRIGGER block_pending_account_deletion_user_favorite_schedules
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_favorite_schedules
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

-- Account purge: also delete favorite schedules (body otherwise identical to sql/SCHEMA.sql).
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
