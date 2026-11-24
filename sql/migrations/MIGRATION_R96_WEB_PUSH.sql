-- R96: Web Push 외부 발송(push_subscriptions, RLS, 탈퇴 연동, 4개 SECURITY DEFINER RPC, 예외 격리 pg_net 웹훅 트리거)
-- 선행 조건: MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql 및 MIGRATION_R39_DAILY_NOTIFICATIONS.sql 적용 이후 실행한다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(btrim(endpoint)) BETWEEN 12 AND 2048),
    p256dh TEXT NOT NULL CHECK (length(btrim(p256dh)) BETWEEN 40 AND 256),
    auth TEXT NOT NULL CHECK (length(btrim(auth)) BETWEEN 16 AND 128),
    platform VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios_pwa', 'android_pwa')),
    user_agent_label VARCHAR(100) NOT NULL DEFAULT '웹 브라우저' CHECK (length(btrim(user_agent_label)) BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_success_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON public.push_subscriptions(user_id, created_at DESC);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Read own push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Block account deletion users from push_subscriptions" ON public.push_subscriptions
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_push_subscriptions ON public.push_subscriptions;
CREATE TRIGGER block_pending_account_deletion_push_subscriptions
    BEFORE INSERT OR UPDATE OR DELETE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
    p_endpoint TEXT,
    p_p256dh TEXT,
    p_auth TEXT,
    p_platform VARCHAR DEFAULT 'web',
    p_user_agent_label VARCHAR DEFAULT '웹 브라우저'
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_endpoint TEXT;
    v_p256dh TEXT;
    v_auth TEXT;
    v_platform TEXT;
    v_label TEXT;
    v_sub_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 푸시 구독을 등록할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_endpoint := btrim(coalesce(p_endpoint, ''));
    v_p256dh := btrim(coalesce(p_p256dh, ''));
    v_auth := btrim(coalesce(p_auth, ''));
    v_platform := btrim(coalesce(p_platform, 'web'));
    v_label := coalesce(nullif(btrim(coalesce(p_user_agent_label, '')), ''), '웹 브라우저');

    IF v_endpoint !~ '^https://' OR length(v_endpoint) NOT BETWEEN 12 AND 2048 THEN
        RAISE EXCEPTION '유효하지 않은 푸시 endpoint입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_p256dh) NOT BETWEEN 40 AND 256 THEN
        RAISE EXCEPTION '유효하지 않은 p256dh 키입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_auth) NOT BETWEEN 16 AND 128 THEN
        RAISE EXCEPTION '유효하지 않은 auth 키입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_platform NOT IN ('web', 'ios_pwa', 'android_pwa') THEN
        RAISE EXCEPTION '허용되지 않은 플랫폼 값입니다.' USING ERRCODE = 'check_violation';
    END IF;
    IF length(v_label) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION '기기 라벨은 1~100자여야 합니다.' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label, updated_at)
    VALUES (v_user_id, v_endpoint, v_p256dh, v_auth, v_platform, v_label, NOW())
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = v_user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        platform = EXCLUDED.platform,
        user_agent_label = EXCLUDED.user_agent_label,
        updated_at = NOW()
    RETURNING id INTO v_sub_id;

    INSERT INTO public.notification_settings(user_id, push_enabled, updated_at)
    VALUES (v_user_id, true, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET push_enabled = true,
        updated_at = NOW();

    RETURN v_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, VARCHAR, VARCHAR) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(
    p_endpoint TEXT DEFAULT NULL,
    p_subscription_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_endpoint TEXT := nullif(btrim(coalesce(p_endpoint, '')), '');
    v_deleted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_endpoint IS NULL AND p_subscription_id IS NULL THEN
        RAISE EXCEPTION '삭제할 구독 대상(endpoint 또는 subscription_id)이 필요합니다.' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    DELETE FROM public.push_subscriptions
    WHERE user_id = v_user_id
      AND (v_endpoint IS NULL OR endpoint = v_endpoint)
      AND (p_subscription_id IS NULL OR id = p_subscription_id);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count > 0 AND NOT EXISTS (
        SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_id
    ) THEN
        UPDATE public.notification_settings
        SET push_enabled = false,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.delete_push_subscription(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_pending_push_notifications(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    kind VARCHAR,
    title VARCHAR,
    body VARCHAR,
    link_path TEXT,
    push_attempts SMALLINT
) AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_push_enabled BOOLEAN;
    v_request_result BOOLEAN;
    v_has_subscription BOOLEAN;
    v_next_attempts SMALLINT;
BEGIN
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 200' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    FOR v_notif IN
        SELECT n.*
        FROM public.notifications n
        WHERE n.push_status = 'PENDING'
        ORDER BY n.created_at ASC, n.id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    LOOP
        IF v_notif.push_attempts >= 3 THEN
            UPDATE public.notifications AS target
            SET push_status = 'FAILED',
                pushed_at = NOW()
            WHERE target.id = v_notif.id;
            CONTINUE;
        END IF;

        v_push_enabled := NULL;
        v_request_result := NULL;
        SELECT ns.push_enabled, ns.request_result
        INTO v_push_enabled, v_request_result
        FROM public.notification_settings ns
        WHERE ns.user_id = v_notif.user_id;

        SELECT EXISTS (
            SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = v_notif.user_id
        ) INTO v_has_subscription;

        IF public.account_deletion_is_pending(v_notif.user_id)
           OR NOT coalesce(v_push_enabled, false)
           OR (
               v_notif.kind IN ('REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
               AND NOT coalesce(v_request_result, true)
           )
           OR NOT v_has_subscription THEN
            UPDATE public.notifications AS target
            SET push_status = 'SKIPPED',
                pushed_at = NOW()
            WHERE target.id = v_notif.id;
            CONTINUE;
        END IF;

        UPDATE public.notifications AS target
        SET push_attempts = target.push_attempts + 1
        WHERE target.id = v_notif.id
        RETURNING target.push_attempts INTO v_next_attempts;

        notification_id := v_notif.id;
        user_id := v_notif.user_id;
        kind := v_notif.kind;
        title := v_notif.title;
        body := v_notif.body;
        link_path := v_notif.link_path;
        push_attempts := v_next_attempts;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_pending_push_notifications(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_notifications(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_push_notification_delivery(
    p_notification_id UUID,
    p_status VARCHAR,
    p_expired_endpoints TEXT[] DEFAULT '{}'::TEXT[],
    p_succeeded_endpoints TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS VOID AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_final_status VARCHAR(20);
BEGIN
    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'p_notification_id is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('SENT', 'SKIPPED', 'FAILED', 'PENDING') THEN
        RAISE EXCEPTION 'Invalid push status: %', p_status USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '알림을 찾을 수 없습니다.' USING ERRCODE = 'no_data_found';
    END IF;

    IF p_status = 'PENDING' AND v_notif.push_attempts >= 3 THEN
        v_final_status := 'FAILED';
    ELSE
        v_final_status := p_status;
    END IF;

    IF p_expired_endpoints IS NOT NULL AND cardinality(p_expired_endpoints) > 0 THEN
        DELETE FROM public.push_subscriptions
        WHERE user_id = v_notif.user_id
          AND endpoint = ANY(p_expired_endpoints);

        IF NOT EXISTS (
            SELECT 1 FROM public.push_subscriptions WHERE user_id = v_notif.user_id
        ) THEN
            UPDATE public.notification_settings
            SET push_enabled = false,
                updated_at = NOW()
            WHERE user_id = v_notif.user_id;
        END IF;
    END IF;

    IF p_succeeded_endpoints IS NOT NULL AND cardinality(p_succeeded_endpoints) > 0 THEN
        UPDATE public.push_subscriptions
        SET last_success_at = NOW(),
            updated_at = NOW()
        WHERE user_id = v_notif.user_id
          AND endpoint = ANY(p_succeeded_endpoints);
    END IF;

    UPDATE public.notifications
    SET push_status = v_final_status,
        pushed_at = CASE
            WHEN v_final_status IN ('SENT', 'SKIPPED', 'FAILED') THEN NOW()
            ELSE pushed_at
        END
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_send_notifications_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_url TEXT;
    v_secret TEXT;
BEGIN
    v_url := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_url', true), '')), '');
    v_secret := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_secret', true), '')), '');

    IF v_url IS NULL OR v_secret IS NULL THEN
        RETURN NULL;
    END IF;

    IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
        RETURN NULL;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('source', 'db_trigger'),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 5000
    );
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.trigger_send_notifications_webhook() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notifications_send_webhook ON public.notifications;
CREATE TRIGGER trg_notifications_send_webhook
    AFTER INSERT ON public.notifications
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_send_notifications_webhook();

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
