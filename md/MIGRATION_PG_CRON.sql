-- ==============================================================================
-- ChronoLedger Migration: Supabase Database pg_cron 탈퇴 워커 이관 스크립트
--
-- 목적:
--   웹 호스팅(Netlify/Cloudflare) 서버리스 Functions에 5분 주기로 묶여 있던
--   계정 탈퇴 워커(account-deletion-worker)를 Supabase PostgreSQL 내부의
--   pg_cron 확장 프로그램으로 완전 이관하여, 웹 플랫폼 크레딧 소진 및
--   외부 네트워크 오류 리스크 없이 100% 원자적으로 안전하게 계정을 정리합니다.
--
-- 실행 방법:
--   Supabase Dashboard -> SQL Editor에 붙여넣고 [Run] 실행.
-- ==============================================================================

-- 1. pg_cron 확장 프로그램 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 만료된 계정 탈퇴 요청 일괄 영구 삭제 원자적 함수 정의
CREATE OR REPLACE FUNCTION public.purge_expired_account_deletion_requests(p_limit INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    v_req RECORD;
    v_purged_count INTEGER := 0;
BEGIN
    -- 탈퇴 처리 대기 중이거나 진행 중인 요청 락 획득 (경합 방지)
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
        -- 락 설정 및 시도 횟수 증가
        UPDATE public.account_deletion_requests
        SET locked_until = NOW() + INTERVAL '5 minutes',
            attempt_count = attempt_count + 1,
            updated_at = NOW()
        WHERE id = v_req.id;

        IF v_req.user_id IS NOT NULL THEN
            -- [1단계] 비공개 스토리지 버킷(user-icons) 내 사용자 파일 삭제
            DELETE FROM storage.objects
            WHERE bucket_id = 'user-icons'
              AND (name LIKE v_req.user_id || '/%' OR (path_tokens IS NOT NULL AND path_tokens[1] = v_req.user_id::text));

            -- [2단계] 개인 데이터 테이블 10종 삭제
            DELETE FROM public.schedule_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.game_requests WHERE user_id = v_req.user_id;
            DELETE FROM public.store_point_transactions WHERE user_id = v_req.user_id;
            DELETE FROM public.expenses WHERE user_id = v_req.user_id;
            DELETE FROM public.subscription_templates WHERE user_id = v_req.user_id;
            DELETE FROM public.personal_memos WHERE user_id = v_req.user_id;
            DELETE FROM public.user_games WHERE user_id = v_req.user_id;
            DELETE FROM public.monthly_budgets WHERE user_id = v_req.user_id;
            DELETE FROM public.store_wallets WHERE user_id = v_req.user_id;
            DELETE FROM public.user_finances WHERE user_id = v_req.user_id;

            -- [3단계] auth.users 영구 삭제 (PostgreSQL 내부 캐스케이드 삭제)
            DELETE FROM auth.users WHERE id = v_req.user_id;
        END IF;

        -- [4단계] 탈퇴 요청 상태를 COMPLETED로 전환 및 개인 식별자 비식별화
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

-- 실행 권한 설정 (일반 유저 호출 금지, 서비스 롤 및 슈퍼유저 전용)
REVOKE ALL ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_account_deletion_requests(INTEGER) TO service_role;

-- 3. 5분 주기 pg_cron 스케줄 등록 (기존 작업이 있으면 제거 후 재등록)
DO $$
BEGIN
    -- 기존 스케줄 작업이 등록되어 있다면 삭제
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-account-purge') THEN
        PERFORM cron.unschedule('chronoledger-account-purge');
    END IF;

    -- 매 5분마다 (월~일 연중무휴) purge 함수 실행
    PERFORM cron.schedule(
        'chronoledger-account-purge',
        '*/5 * * * *',
        'SELECT public.purge_expired_account_deletion_requests(10);'
    );
END;
$$;

-- 4. 계정 탈퇴 요청 및 상태 조회 RPC 함수 정의 (Netlify Functions 대체)
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_confirmation_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_token TEXT;
    v_token_hash CHAR(64);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
    END IF;

    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
    END IF;

    IF p_confirmation_email IS NULL OR LOWER(TRIM(p_confirmation_email)) <> LOWER(TRIM(v_user_email)) THEN
        RAISE EXCEPTION 'CONFIRMATION_REQUIRED';
    END IF;

    v_token := gen_random_uuid()::text;
    v_token_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');

    INSERT INTO public.account_deletion_requests (
        user_id, status_token_hash, status, attempt_count, retry_after, locked_until, last_error_code, requested_at, updated_at
    )
    VALUES (
        v_user_id, v_token_hash, 'PENDING', 0, NOW(), NULL, NULL, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET status_token_hash = EXCLUDED.status_token_hash,
        status = 'PENDING',
        attempt_count = 0,
        retry_after = NOW(),
        locked_until = NULL,
        last_error_code = NULL,
        requested_at = NOW(),
        updated_at = NOW();

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.request_account_deletion(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_account_deletion_status(p_status_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_token_hash CHAR(64);
    v_status VARCHAR(30);
    v_updated_at TIMESTAMPTZ;
BEGIN
    IF p_status_token IS NULL OR TRIM(p_status_token) = '' THEN
        RETURN NULL;
    END IF;

    v_token_hash := encode(sha256(convert_to(p_status_token, 'UTF8')), 'hex');

    SELECT status, updated_at INTO v_status, v_updated_at
    FROM public.account_deletion_requests
    WHERE status_token_hash = v_token_hash;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'status', v_status,
        'updatedAt', v_updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_account_deletion_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_deletion_status(TEXT) TO authenticated, anon;

-- 5. 등록 확인 쿼리 안내
-- SELECT * FROM cron.job WHERE jobname = 'chronoledger-account-purge';
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'chronoledger-account-purge') ORDER BY start_time DESC LIMIT 5;

