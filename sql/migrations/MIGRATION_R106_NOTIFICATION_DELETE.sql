-- R106: 앱 내 알림 직접 삭제 RPC (public.delete_notifications)
-- public.notifications 테이블의 authenticated 직접 쓰기 차단을 유지하고,
-- mark_notifications_read(UUID[])와 대칭인 SECURITY DEFINER RPC로 본인 알림 선택/전체 하드 삭제를 제공한다.
-- 선행 조건: MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql 적용 이후 실행한다. 재실행 안전.
BEGIN;

CREATE OR REPLACE FUNCTION public.delete_notifications(p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 알림을 삭제할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_notification_ids IS NULL THEN
        DELETE FROM public.notifications
        WHERE user_id = v_user_id;
    ELSE
        DELETE FROM public.notifications
        WHERE user_id = v_user_id
          AND id = ANY(p_notification_ids);
    END IF;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.delete_notifications(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_notifications(UUID[]) TO authenticated;

COMMIT;
