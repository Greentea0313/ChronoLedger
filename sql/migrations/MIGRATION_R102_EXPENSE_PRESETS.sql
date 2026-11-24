-- R102: 사용자별 자주 쓰는 과금 프리셋(user_expense_presets) 테이블, 20개 상한 트리거, RLS, 계정 삭제 대기 차단 및 탈퇴 정리 연동
-- 선행 조건: MIGRATION_R96_WEB_PUSH.sql 적용 이후 실행한다(탈퇴 정리 함수 본문에 R96 push_subscriptions 삭제 포함).
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_expense_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 150),
    category VARCHAR(50) NOT NULL DEFAULT '게임' CHECK (category IN ('게임', '식비', '교통', '생활', '기타')),
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    original_price BIGINT NOT NULL CHECK (original_price >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'NAVER_PAY')),
    point_platform VARCHAR(30) CHECK (point_platform IS NULL OR point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    deduct_from_asset BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_expense_presets_user_sort
    ON public.user_expense_presets(user_id, sort_order ASC, created_at ASC);

CREATE OR REPLACE FUNCTION public.enforce_user_expense_presets_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('user_expense_presets:' || NEW.user_id::text));

    SELECT count(*) INTO v_count
    FROM public.user_expense_presets
    WHERE user_id = NEW.user_id;

    IF v_count >= 20 THEN
        RAISE EXCEPTION '과금 프리셋은 최대 20개까지 저장할 수 있습니다.' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.enforce_user_expense_presets_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_user_expense_presets_limit ON public.user_expense_presets;
CREATE TRIGGER trg_enforce_user_expense_presets_limit
    BEFORE INSERT ON public.user_expense_presets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_user_expense_presets_limit();

ALTER TABLE public.user_expense_presets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_expense_presets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_expense_presets TO authenticated;

DROP POLICY IF EXISTS "Manage own expense presets" ON public.user_expense_presets;
CREATE POLICY "Manage own expense presets" ON public.user_expense_presets FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from user_expense_presets" ON public.user_expense_presets;
CREATE POLICY "Block account deletion users from user_expense_presets" ON public.user_expense_presets
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_user_expense_presets ON public.user_expense_presets;
CREATE TRIGGER block_pending_account_deletion_user_expense_presets
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_expense_presets
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

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

            DELETE FROM public.push_subscriptions WHERE user_id = v_req.user_id;
            DELETE FROM public.notification_settings WHERE user_id = v_req.user_id;
            DELETE FROM public.notifications WHERE user_id = v_req.user_id;
            DELETE FROM public.feedback_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.user_expense_presets WHERE user_id = v_req.user_id;
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
