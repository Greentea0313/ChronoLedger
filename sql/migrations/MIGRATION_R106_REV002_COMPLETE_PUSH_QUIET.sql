-- R106-REV-002: complete_push_notification_delivery 삭제 알림 조용한 종료 및 만료/성공 구독 정리
-- 워커 점유 중 사용자가 알림을 삭제해 대상 notifications 행이 없어도 예외를 발생시키지 않고,
-- 전달된 p_expired_endpoints 삭제(남은 구독 0건 시 push_enabled=false 동기화) 및
-- p_succeeded_endpoints last_success_at 갱신만 수행한 뒤 정상 반환한다.
-- 선행 조건: MIGRATION_R96_WEB_PUSH.sql, MIGRATION_R106_NOTIFICATION_DELETE.sql 적용 이후 실행한다.
-- 재실행 안전. MIGRATION_R96_WEB_PUSH.sql을 이후 재실행했다면 이 파일도 다시 실행해야 한다.
BEGIN;

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
    v_affected_user_ids UUID[];
BEGIN
    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'p_notification_id is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('SENT', 'SKIPPED', 'FAILED', 'PENDING') THEN
        RAISE EXCEPTION 'Invalid push status: %', p_status USING ERRCODE = 'check_violation';
    END IF;

    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id FOR UPDATE;
    IF NOT FOUND THEN
        -- R106-REV-002: Notification was deleted before worker completion; still clean endpoints and return quietly.
        IF p_expired_endpoints IS NOT NULL AND cardinality(p_expired_endpoints) > 0 THEN
            WITH deleted_subs AS (
                DELETE FROM public.push_subscriptions
                WHERE endpoint = ANY(p_expired_endpoints)
                RETURNING user_id
            )
            SELECT array_agg(DISTINCT user_id) INTO v_affected_user_ids FROM deleted_subs;

            IF v_affected_user_ids IS NOT NULL AND cardinality(v_affected_user_ids) > 0 THEN
                UPDATE public.notification_settings ns
                SET push_enabled = false,
                    updated_at = NOW()
                WHERE ns.user_id = ANY(v_affected_user_ids)
                  AND NOT EXISTS (
                      SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = ns.user_id
                  );
            END IF;
        END IF;

        IF p_succeeded_endpoints IS NOT NULL AND cardinality(p_succeeded_endpoints) > 0 THEN
            UPDATE public.push_subscriptions
            SET last_success_at = NOW(),
                updated_at = NOW()
            WHERE endpoint = ANY(p_succeeded_endpoints);
        END IF;

        RETURN;
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
        push_claimed_at = NULL,
        pushed_at = CASE
            WHEN v_final_status IN ('SENT', 'SKIPPED', 'FAILED') THEN NOW()
            ELSE pushed_at
        END
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_push_notification_delivery(UUID, VARCHAR, TEXT[], TEXT[]) TO service_role;

COMMIT;
