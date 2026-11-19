-- R84: 기타 건의 요청 창구(feedback_requests) + 앱 내 알림함(notifications) + 30일 정리 pg_cron + 승인/반려·답변 알림 연동
BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('기능 제안', '오류 신고', '기타')),
    title VARCHAR(100) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
    content TEXT NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000),
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'ANSWERED', 'CLOSED')),
    admin_answer TEXT CHECK (admin_answer IS NULL OR length(btrim(admin_answer)) <= 2000),
    answered_at TIMESTAMPTZ,
    answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_status ON public.feedback_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_user_id ON public.feedback_requests(user_id, created_at DESC);

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.feedback_requests TO authenticated;

DROP POLICY IF EXISTS "Read own feedback requests" ON public.feedback_requests;
CREATE POLICY "Read own feedback requests" ON public.feedback_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Create own feedback requests" ON public.feedback_requests;
CREATE POLICY "Create own feedback requests" ON public.feedback_requests FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND request_status = 'PENDING'
        AND admin_answer IS NULL
        AND answered_at IS NULL
        AND answered_by IS NULL
    );

DROP POLICY IF EXISTS "Admins manage all feedback requests" ON public.feedback_requests;
CREATE POLICY "Admins manage all feedback requests" ON public.feedback_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

DROP POLICY IF EXISTS "Block account deletion users from feedback_requests" ON public.feedback_requests;
CREATE POLICY "Block account deletion users from feedback_requests" ON public.feedback_requests
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_feedback_requests ON public.feedback_requests;
CREATE TRIGGER block_pending_account_deletion_feedback_requests
    BEFORE INSERT OR UPDATE OR DELETE ON public.feedback_requests
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind VARCHAR(40) NOT NULL CHECK (
        kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')
    ),
    title VARCHAR(120) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
    body VARCHAR(300) NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 300),
    link_path TEXT NOT NULL CHECK (link_path ~ '^/' AND link_path !~ '^//' AND length(link_path) <= 200),
    source_id UUID,
    scheduled_for DATE,
    push_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (push_status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
    push_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (push_attempts >= 0),
    pushed_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_daily_source
    ON public.notifications(user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "Read own notifications" ON public.notifications;
CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block account deletion users from notifications" ON public.notifications;
CREATE POLICY "Block account deletion users from notifications" ON public.notifications
    AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DROP TRIGGER IF EXISTS block_pending_account_deletion_notifications ON public.notifications;
CREATE TRIGGER block_pending_account_deletion_notifications
    BEFORE INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations();

CREATE OR REPLACE FUNCTION public.purge_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.purge_expired_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_notifications() TO service_role;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_updated_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제 대기 중에는 알림 상태를 변경할 수 없습니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_notification_ids IS NULL THEN
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = v_user_id AND read_at IS NULL;
    ELSE
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = v_user_id
          AND read_at IS NULL
          AND id = ANY(p_notification_ids);
    END IF;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.mark_notifications_read(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_feedback_request(
    p_request_id UUID,
    p_admin_answer TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ANSWERED'
)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_request public.feedback_requests%ROWTYPE;
    v_trimmed_answer TEXT;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_status NOT IN ('ANSWERED', 'CLOSED') THEN
        RAISE EXCEPTION '허용되지 않은 건의 상태입니다.';
    END IF;

    v_trimmed_answer := nullif(btrim(coalesce(p_admin_answer, '')), '');
    IF p_status = 'ANSWERED' AND v_trimmed_answer IS NULL THEN
        RAISE EXCEPTION '답변 내용을 입력해 주세요.';
    END IF;
    IF v_trimmed_answer IS NOT NULL AND length(v_trimmed_answer) > 2000 THEN
        RAISE EXCEPTION '답변 내용은 2000자 이하여야 합니다.';
    END IF;

    SELECT * INTO v_request FROM public.feedback_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '검토 대기 중인 건의 요청이 아닙니다.';
    END IF;

    UPDATE public.feedback_requests
    SET request_status = p_status,
        admin_answer = coalesce(v_trimmed_answer, admin_answer),
        answered_at = NOW(),
        answered_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'FEEDBACK_ANSWERED',
        CASE WHEN p_status = 'CLOSED' THEN '건의 검토가 종료되었습니다' ELSE '건의에 답변이 등록되었습니다' END,
        CASE
            WHEN p_status = 'CLOSED' THEN '등록하신 건의가 검토 종료되었습니다. 내 요청 현황에서 확인하세요.'
            ELSE '등록하신 건의에 관리자 답변이 등록되었습니다. 내 요청 현황에서 확인하세요.'
        END,
        '/dashboard/games',
        v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.answer_feedback_request(UUID, TEXT, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_feedback_request(UUID, TEXT, VARCHAR) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_character_request(p_request_id UUID, p_default_icon_url TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_request public.character_requests%ROWTYPE;
    v_game_schema JSONB;
    v_icon_url TEXT;
    v_character_id UUID;
    v_is_admin BOOLEAN;
    v_attr RECORD;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_request FROM public.character_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 캐릭터 요청이 아닙니다.';
    END IF;
    SELECT classification_schema INTO v_game_schema FROM public.games WHERE id = v_request.game_id;
    IF NOT FOUND THEN RAISE EXCEPTION '게임을 찾을 수 없습니다.'; END IF;

    IF v_request.rarity IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_game_schema -> 'rarities') AS rarity(value)
        WHERE rarity.value = v_request.rarity
    ) THEN
        RAISE EXCEPTION '게임 분류 스키마에 없는 성급입니다.';
    END IF;
    FOR v_attr IN SELECT key, value FROM jsonb_each_text(v_request.attributes) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_game_schema -> 'axes') AS axis(value)
            CROSS JOIN LATERAL jsonb_array_elements_text(axis.value -> 'options') AS option(value)
            WHERE axis.value ->> 'key' = v_attr.key AND option.value = v_attr.value
        ) THEN
            RAISE EXCEPTION '게임 분류 스키마에 없는 분류 값입니다: %', v_attr.key;
        END IF;
    END LOOP;

    IF v_request.target_character_id IS NULL THEN
        v_icon_url := coalesce(nullif(btrim(p_default_icon_url), ''), nullif(btrim(v_request.default_icon_url), ''));
        INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes, created_by)
        VALUES (v_request.game_id, v_request.name, v_icon_url, v_request.rarity, v_request.attributes, auth.uid())
        RETURNING id INTO v_character_id;
    ELSE
        UPDATE public.game_characters
        SET name = v_request.name,
            default_icon_url = coalesce(nullif(btrim(p_default_icon_url), ''), nullif(btrim(v_request.default_icon_url), ''), default_icon_url),
            rarity = v_request.rarity,
            attributes = v_request.attributes,
            updated_at = NOW()
        WHERE id = v_request.target_character_id AND game_id = v_request.game_id
        RETURNING id INTO v_character_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 캐릭터가 같은 게임에 없습니다.'; END IF;
    END IF;
    UPDATE public.character_requests SET request_status = 'APPROVED', approved_character_id = v_character_id
    WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '캐릭터 요청이 승인되었습니다',
        '요청하신 캐릭터가 반영되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
    RETURN v_character_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_character_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    UPDATE public.character_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 캐릭터 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '캐릭터 요청이 반려되었습니다',
        '요청하신 캐릭터가 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
    v_pickup_character_ids UUID[] := '{}'::uuid[];
    v_proposal JSONB;
    v_character_id UUID;
    v_character_name TEXT;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    SELECT * INTO v_request FROM public.schedule_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 일정 요청이 아닙니다.';
    END IF;

    IF v_request.schedule_type = 'PICKUP' THEN
        SELECT coalesce(array_agg(c.id ORDER BY u.ord), '{}'::uuid[]) INTO v_pickup_character_ids
        FROM unnest(v_request.pickup_character_ids) WITH ORDINALITY AS u(id, ord)
        JOIN public.game_characters c ON c.id = u.id AND c.game_id = v_request.game_id;

        FOR v_proposal IN SELECT value FROM jsonb_array_elements(v_request.pickup_new_characters) AS item(value) LOOP
            v_character_name := btrim(v_proposal ->> 'name');
            SELECT id INTO v_character_id FROM public.game_characters
            WHERE game_id = v_request.game_id AND name = v_character_name;
            IF NOT FOUND THEN
                INSERT INTO public.game_characters(game_id, name, default_icon_url, is_pickup_only, created_by)
                VALUES (v_request.game_id, v_character_name, v_proposal ->> 'icon_url', true, auth.uid())
                ON CONFLICT (game_id, name) DO NOTHING
                RETURNING id INTO v_character_id;
                IF v_character_id IS NULL THEN
                    SELECT id INTO v_character_id FROM public.game_characters
                    WHERE game_id = v_request.game_id AND name = v_character_name;
                END IF;
            END IF;
            IF NOT (v_character_id = ANY(v_pickup_character_ids)) THEN
                v_pickup_character_ids := array_append(v_pickup_character_ids, v_character_id);
            END IF;
        END LOOP;
        IF cardinality(v_pickup_character_ids) > 8 THEN
            RAISE EXCEPTION '픽업 캐릭터는 최대 8명까지 연결할 수 있습니다.' USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo, is_official, is_rerun, pickup_character_ids)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo,
            v_request.is_official, v_request.is_rerun, v_pickup_character_ids);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            is_official = v_request.is_official, is_rerun = v_request.is_rerun,
            pickup_character_ids = v_pickup_character_ids,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '일정 요청이 승인되었습니다',
        '요청하신 일정이 반영되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_schedule_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.schedule_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 일정 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '일정 요청이 반려되었습니다',
        '요청하신 일정이 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_game_request(p_request_id UUID, p_default_icon_url TEXT)
RETURNS UUID AS $$
DECLARE
    v_request public.game_requests%ROWTYPE;
    v_game_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    SELECT * INTO v_request FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 게임 요청이 아닙니다.';
    END IF;
    IF p_default_icon_url IS NULL OR btrim(p_default_icon_url) = '' THEN
        RAISE EXCEPTION '게임 기본 아이콘이 필요합니다.';
    END IF;
    INSERT INTO public.games(name, default_icon_url, created_by)
    VALUES (v_request.name, p_default_icon_url, auth.uid())
    RETURNING id INTO v_game_id;
    UPDATE public.game_requests SET request_status = 'APPROVED', approved_game_id = v_game_id
    WHERE id = p_request_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_request.user_id,
        'REQUEST_APPROVED',
        '게임 요청이 승인되었습니다',
        '요청하신 게임이 카탈로그에 등록되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        v_request.id
    );
    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_game_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.game_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING'
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 게임 요청이 아닙니다.'; END IF;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id)
    VALUES (
        v_user_id,
        'REQUEST_REJECTED',
        '게임 요청이 반려되었습니다',
        '요청하신 게임이 반려되었습니다. 내 요청 현황에서 확인하세요.',
        '/dashboard/games',
        p_request_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.approve_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_character_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_character_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_character_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_schedule_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_schedule_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_game_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_game_request(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_game_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_game_request(UUID, TEXT) TO authenticated;

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

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-notifications-purge') THEN
        PERFORM cron.unschedule('chronoledger-notifications-purge');
    END IF;

    PERFORM cron.schedule(
        'chronoledger-notifications-purge',
        '15 0 * * *',
        'SELECT public.purge_expired_notifications();'
    );
END;
$$;

COMMIT;
