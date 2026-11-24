-- R96-REV-07: 호스팅 Supabase ALTER DATABASE app.settings.* 42501 차단 대체
-- 비공개 단일 행 웹훅 설정 테이블(push_webhook_config), SQL Editor 전용 등록 헬퍼(set_push_webhook_config),
-- 3단계 조회(push_webhook_config -> vault.decrypted_secrets -> current_setting) invoke_send_notifications_webhook() 적용.
-- 선행 조건: MIGRATION_R96_WEB_PUSH.sql 적용 이후 실행한다. 재실행 안전.
BEGIN;

CREATE TABLE IF NOT EXISTS public.push_webhook_config (
    id BOOLEAN PRIMARY KEY DEFAULT true
        CONSTRAINT chk_push_webhook_config_singleton CHECK (id = true),
    url TEXT NOT NULL
        CONSTRAINT chk_push_webhook_config_url CHECK (
            char_length(btrim(url)) BETWEEN 12 AND 2048
            AND btrim(url) ~ '^https://'
        ),
    secret TEXT NULL
        CONSTRAINT chk_push_webhook_config_secret CHECK (
            secret IS NULL OR char_length(btrim(secret)) BETWEEN 32 AND 512
        ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_webhook_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_webhook_config FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_push_webhook_config(
    p_url TEXT,
    p_secret TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_url TEXT := nullif(btrim(coalesce(p_url, '')), '');
    v_secret TEXT := nullif(btrim(coalesce(p_secret, '')), '');
BEGIN
    IF v_url IS NULL OR char_length(v_url) NOT BETWEEN 12 AND 2048 OR v_url !~ '^https://' THEN
        RAISE EXCEPTION '유효하지 않은 웹훅 URL입니다. https://로 시작하는 12~2048자 URL이 필요합니다.'
            USING ERRCODE = '23514';
    END IF;
    IF v_secret IS NOT NULL AND char_length(v_secret) NOT BETWEEN 32 AND 512 THEN
        RAISE EXCEPTION '웹훅 시크릿은 NULL이거나 32~512자여야 합니다.'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.push_webhook_config(id, url, secret, updated_at)
    VALUES (true, v_url, v_secret, NOW())
    ON CONFLICT (id) DO UPDATE
    SET url = EXCLUDED.url,
        secret = EXCLUDED.secret,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_push_webhook_config(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;

-- Shared webhook caller for the AFTER INSERT trigger and the retry pg_cron job.
-- Lookup priority: 1) public.push_webhook_config, 2) vault.decrypted_secrets (dynamic/isolated),
-- 3) session GUC app.settings.send_notifications_* fallback.
-- Every failure is swallowed so a notification INSERT or a cron run never fails because of it.
CREATE OR REPLACE FUNCTION public.invoke_send_notifications_webhook()
RETURNS VOID AS $$
DECLARE
    v_url TEXT;
    v_secret TEXT;
    v_vault_val TEXT;
BEGIN
    -- 1) Private singleton config table (primary for hosted Supabase)
    SELECT nullif(btrim(url), ''), nullif(btrim(secret), '')
    INTO v_url, v_secret
    FROM public.push_webhook_config
    WHERE id = true;

    -- 2) Supabase Vault fallback (R96-REV-06) isolated against missing extension or pgsodium key issues
    IF (v_url IS NULL OR v_secret IS NULL)
       AND to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
        BEGIN
            IF v_url IS NULL THEN
                EXECUTE $vault$
                    SELECT nullif(btrim(decrypted_secret), '')
                    FROM vault.decrypted_secrets
                    WHERE name = 'send_notifications_url'
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                    LIMIT 1
                $vault$ INTO v_vault_val;
                IF v_vault_val IS NOT NULL THEN
                    v_url := v_vault_val;
                END IF;
            END IF;

            IF v_secret IS NULL THEN
                EXECUTE $vault$
                    SELECT nullif(btrim(decrypted_secret), '')
                    FROM vault.decrypted_secrets
                    WHERE name = 'send_notifications_secret'
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                    LIMIT 1
                $vault$ INTO v_vault_val;
                IF v_vault_val IS NOT NULL THEN
                    v_secret := v_vault_val;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- 3) Session GUC fallback (kept for local TESTS.sql set_config compatibility)
    IF v_url IS NULL THEN
        v_url := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_url', true), '')), '');
    END IF;
    IF v_secret IS NULL THEN
        v_secret := nullif(btrim(coalesce(current_setting('app.settings.send_notifications_secret', true), '')), '');
    END IF;

    IF v_url IS NULL OR v_secret IS NULL THEN
        RETURN;
    END IF;

    IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
        RETURN;
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
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.invoke_send_notifications_webhook() FROM PUBLIC, anon, authenticated;

COMMIT;
