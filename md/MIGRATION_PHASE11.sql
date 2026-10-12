-- ==============================================================================
-- ChronoLedger Phase 11 Migration
-- 게임 일정 카테고리 CONTENTS 확장
-- ==============================================================================

-- 1. 게임 공용 일정 schedule_type 에 CONTENTS 추가 (PostgreSQL 자동 생성 이름 및 커스텀 이름 모두 처리)
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS game_schedules_schedule_type_check;
ALTER TABLE public.game_schedules DROP CONSTRAINT IF EXISTS chk_schedule_type;
ALTER TABLE public.game_schedules ADD CONSTRAINT game_schedules_schedule_type_check
    CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS'));

-- 2. 일정 건의 요청 schedule_type 에 CONTENTS 추가
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS schedule_requests_schedule_type_check;
ALTER TABLE public.schedule_requests DROP CONSTRAINT IF EXISTS chk_schedule_type;
ALTER TABLE public.schedule_requests ADD CONSTRAINT schedule_requests_schedule_type_check
    CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS'));

-- 3. 일정 날짜 변경 시 예정 지출 동기화 트리거 함수 갱신
CREATE OR REPLACE FUNCTION public.sync_version_expenses_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS')
       AND (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
        UPDATE public.expenses
        SET start_date = NEW.start_date,
            end_date = NEW.end_date,
            target_date = CASE 
                WHEN NEW.schedule_type = 'VERSION' THEN NEW.start_date 
                ELSE NEW.end_date 
            END
        WHERE schedule_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- Phase 11.2 네이버페이(NAVER_PAY) 지갑 및 자동 충전/결제 엔진 연동
-- ==============================================================================

-- 4. store_wallets 플랫폼 제약조건 갱신 (NAVER_PAY 추가 및 등급/적립률 설정 허용)
ALTER TABLE public.store_wallets DROP CONSTRAINT IF EXISTS store_wallets_platform_check;
ALTER TABLE public.store_wallets DROP CONSTRAINT IF EXISTS chk_wallet_platform_settings;
ALTER TABLE public.store_wallets ADD CONSTRAINT store_wallets_platform_check
    CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY'));
ALTER TABLE public.store_wallets ADD CONSTRAINT chk_wallet_platform_settings CHECK (
    (platform = 'GOOGLE_PLAY' AND user_tier IS NOT NULL
        AND user_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')
        AND earn_rate = CASE user_tier
            WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
            WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END)
    OR (platform = 'GALAXY_STORE' AND (
        (user_tier IS NULL AND earn_rate BETWEEN 0 AND 100)
        OR (user_tier IN ('GENERAL', 'STAR', 'PRESTIGE', 'ROYAL_BLUE')
            AND earn_rate = CASE user_tier
                WHEN 'GENERAL' THEN 0.10 WHEN 'STAR' THEN 0.10
                WHEN 'PRESTIGE' THEN 1.10 WHEN 'ROYAL_BLUE' THEN 2.10 END)
    ))
    OR (platform = 'NAVER_PAY' AND user_tier IS NULL AND earn_rate = 0)
);

-- 5. expenses 결제 수단에 NAVER_PAY 추가
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_payment_method_check
    CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY'));

-- 6. store_point_transactions 플랫폼 및 트랜잭션 타입 갱신 (RECHARGE 추가)
ALTER TABLE public.store_point_transactions DROP CONSTRAINT IF EXISTS store_point_transactions_platform_check;
ALTER TABLE public.store_point_transactions DROP CONSTRAINT IF EXISTS store_point_transactions_transaction_type_check;
ALTER TABLE public.store_point_transactions ADD CONSTRAINT store_point_transactions_platform_check
    CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY'));
ALTER TABLE public.store_point_transactions ADD CONSTRAINT store_point_transactions_transaction_type_check
    CHECK (transaction_type IN ('USE', 'EARN', 'MANUAL_ADJUST', 'REFUND', 'RECHARGE'));

-- 7. 지갑 잔액 수동 보정 RPC 갱신 (NAVER_PAY 지원)
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_platform VARCHAR(30),
    p_target_balance BIGINT,
    p_memo TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_diff BIGINT;
    v_current BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')
       OR p_target_balance IS NULL OR p_target_balance < 0 THEN
        RAISE EXCEPTION '플랫폼 또는 목표 잔액이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
    VALUES (v_user_id, p_platform,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' WHEN p_platform = 'GALAXY_STORE' THEN 'GENERAL' ELSE NULL END,
        CASE WHEN p_platform = 'NAVER_PAY' THEN 0.00 ELSE 0.10 END)
    ON CONFLICT (user_id, platform) DO NOTHING;
    SELECT current_balance INTO v_current
    FROM public.store_wallets 
    WHERE user_id = v_user_id AND platform = p_platform FOR UPDATE;

    v_diff := p_target_balance - v_current;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_target_balance,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' WHEN p_platform = 'GALAXY_STORE' THEN 'GENERAL' ELSE NULL END,
        CASE WHEN p_platform = 'NAVER_PAY' THEN 0.00 ELSE 0.10 END, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET current_balance = p_target_balance, updated_at = NOW();

    INSERT INTO public.store_point_transactions(user_id, platform, transaction_type, amount, balance_after, memo)
    VALUES (v_user_id, p_platform, 'MANUAL_ADJUST', v_diff, p_target_balance, coalesce(p_memo, '수동 잔액 보정'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. 결제 전담 RPC 갱신 (네이버페이 부족액 10,000원 단위 올림 충전 및 결제 원자적 처리)
CREATE OR REPLACE FUNCTION public.process_expense_payment(
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR(30),
    p_payment_method VARCHAR(30),
    p_deduct_asset BOOLEAN,
    p_payment_date DATE
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_final_amount BIGINT;
    v_earned_points BIGINT := 0;
    v_earn_rate NUMERIC(5, 2);
    v_wallet_balance BIGINT;
    v_new_balance BIGINT;
    v_np_balance BIGINT;
    v_np_shortage BIGINT;
    v_np_recharge BIGINT;
    v_total_asset BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND OR v_expense.status <> 'PLANNED' THEN
        RAISE EXCEPTION '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.';
    END IF;

    IF p_original_price IS NULL OR p_discount_amount IS NULL OR p_point_discount_amount IS NULL
       OR p_used_points IS NULL OR p_deduct_asset IS NULL OR p_payment_date IS NULL
       OR p_original_price < 0 OR p_discount_amount < 0 OR p_point_discount_amount < 0 OR p_used_points < 0
       OR p_discount_amount + p_point_discount_amount > p_original_price THEN
        RAISE EXCEPTION '결제 금액 입력이 올바르지 않습니다.';
    END IF;
    IF p_payment_method IS NULL OR p_payment_method NOT IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY') THEN
        RAISE EXCEPTION '지원하지 않는 결제 수단입니다.';
    END IF;
    IF p_payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_point_platform IS DISTINCT FROM p_payment_method THEN
        RAISE EXCEPTION '스토어 결제의 포인트 플랫폼은 결제 스토어와 같아야 합니다.';
    END IF;
    IF p_payment_method = 'NAVER_PAY' AND (p_point_platform IS NOT NULL OR p_used_points > 0) THEN
        RAISE EXCEPTION '네이버페이 결제에는 별도 포인트 플랫폼을 지정할 수 없습니다.';
    END IF;
    IF p_payment_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제할 수 없습니다.';
    END IF;
    IF p_used_points = 0 AND p_point_discount_amount <> 0 THEN
        RAISE EXCEPTION '포인트 사용 정보가 서로 일치하지 않습니다.';
    END IF;
    IF p_used_points > 0 AND (p_point_discount_amount = 0 OR p_point_platform IS NULL OR p_point_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')) THEN
        RAISE EXCEPTION '포인트 플랫폼과 할인 금액을 확인해 주세요.';
    END IF;
    IF p_point_platform IS NOT NULL AND p_point_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 포인트 플랫폼입니다.';
    END IF;
    IF p_payment_method NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_used_points = 0 AND p_point_platform IS NOT NULL THEN
        RAISE EXCEPTION '포인트를 사용하지 않는 결제에는 포인트 플랫폼을 지정할 수 없습니다.';
    END IF;

    v_final_amount := p_original_price - p_discount_amount - p_point_discount_amount;

    -- 네이버페이 결제 처리 (부족 시 10,000원 단위 올림 자동 충전 및 결제 차감)
    IF p_payment_method = 'NAVER_PAY' THEN
        INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
        VALUES (v_user_id, 'NAVER_PAY', NULL, 0)
        ON CONFLICT (user_id, platform) DO NOTHING;

        SELECT current_balance INTO v_np_balance
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY'
        FOR UPDATE;

        v_np_balance := coalesce(v_np_balance, 0);

        IF v_np_balance < v_final_amount THEN
            v_np_shortage := v_final_amount - v_np_balance;
            v_np_recharge := CEIL(v_np_shortage::numeric / 10000.0) * 10000;

            SELECT total_asset INTO v_total_asset
            FROM public.user_finances
            WHERE user_id = v_user_id
            FOR UPDATE;

            IF v_total_asset IS NULL OR v_total_asset < v_np_recharge THEN
                RAISE EXCEPTION '총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.';
            END IF;

            -- 총 자산에서 10,000원 단위 올림 충전액 차감
            UPDATE public.user_finances
            SET total_asset = total_asset - v_np_recharge, updated_at = NOW()
            WHERE user_id = v_user_id;

            -- 네이버페이 지갑에 충전액 증액
            v_np_balance := v_np_balance + v_np_recharge;
            UPDATE public.store_wallets
            SET current_balance = v_np_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

            -- 충전 원장 트랜잭션 기록
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'RECHARGE', v_np_recharge, v_np_balance, '네이버페이 자동 충전');
        END IF;

        -- 네이버페이 지갑에서 결제액 차감
        v_np_balance := v_np_balance - v_final_amount;
        UPDATE public.store_wallets
        SET current_balance = v_np_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

        -- 결제 사용 원장 트랜잭션 기록
        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'USE', -v_final_amount, v_np_balance, '네이버페이 결제');
    END IF;

    -- 사용 포인트 지갑을 잠그고 적립률도 서버에서 읽는다.
    IF p_point_platform IS NOT NULL THEN
        SELECT current_balance, earn_rate INTO v_wallet_balance, v_earn_rate
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = p_point_platform
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION '포인트 지갑 설정이 없습니다.'; END IF;
    END IF;

    IF p_used_points > 0 THEN
        SELECT current_balance INTO v_wallet_balance 
        FROM public.store_wallets 
        WHERE user_id = v_user_id AND platform = p_point_platform FOR UPDATE;

        IF v_wallet_balance IS NULL OR v_wallet_balance < p_used_points THEN
            RAISE EXCEPTION '포인트 잔액이 부족합니다.';
        END IF;

        v_new_balance := v_wallet_balance - p_used_points;
        UPDATE public.store_wallets 
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = p_point_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, p_point_platform, p_expense_id, 'USE', -p_used_points, v_new_balance, '결제 포인트 사용');
        
        v_wallet_balance := v_new_balance;
    END IF;

    -- 포인트 적립은 실제 결제수단으로 선택한 스토어에서만 계산한다.
    IF p_payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        -- 앱 추정 적립 산식: floor(final_amount * rate / 100). Google 공식 정산액 보장 아님.
        v_earned_points := FLOOR(v_final_amount * v_earn_rate / 100);
    END IF;
    IF v_earned_points > 0 THEN
        v_new_balance := coalesce(v_wallet_balance, 0) + v_earned_points;
        
        UPDATE public.store_wallets
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = p_point_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, p_point_platform, p_expense_id, 'EARN', v_earned_points, v_new_balance, '결제 적립 포인트');
    END IF;

    -- 총 자산 차감 처리 (네이버페이 결제 시에는 충전 시 이미 차감되었으므로 이중 차감 방지)
    IF p_deduct_asset AND p_payment_method <> 'NAVER_PAY' THEN
        UPDATE public.user_finances
        SET total_asset = total_asset - v_final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    -- expenses 상태 CONFIRMED 원자적 갱신
    UPDATE public.expenses
    SET status = 'CONFIRMED',
        original_price = p_original_price,
        discount_amount = p_discount_amount,
        point_discount_amount = p_point_discount_amount,
        used_points = p_used_points,
        payment_method = p_payment_method,
        deduct_from_asset = p_deduct_asset,
        target_date = p_payment_date,
        point_platform = p_point_platform,
        earned_points = v_earned_points,
        final_amount = v_final_amount
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. 결제 취소/환불 전담 RPC 갱신 (네이버페이 지갑 환불 지원)
CREATE OR REPLACE FUNCTION public.refund_expense_payment(
    p_expense_id UUID
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_wallet_balance BIGINT;
    v_np_balance BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense FROM public.expenses 
    WHERE id = p_expense_id AND user_id = v_user_id FOR UPDATE;

    IF v_expense.id IS NULL OR v_expense.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '취소할 수 있는 확정 결제 내역이 아닙니다.';
    END IF;

    -- 네이버페이 환불 처리 (네이버페이 지갑 잔액으로 복원)
    IF v_expense.payment_method = 'NAVER_PAY' THEN
        SELECT current_balance INTO v_np_balance
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY'
        FOR UPDATE;

        v_np_balance := coalesce(v_np_balance, 0) + v_expense.final_amount;
        UPDATE public.store_wallets
        SET current_balance = v_np_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = 'NAVER_PAY';

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, 'NAVER_PAY', p_expense_id, 'REFUND', v_expense.final_amount, v_np_balance, '결제 취소 네이버페이 환불');
    END IF;

    -- 포인트 롤백 (적립 포인트 기사용 시 취소 거부)
    IF (v_expense.used_points > 0 OR v_expense.earned_points > 0) AND v_expense.point_platform IS NOT NULL THEN
        SELECT current_balance INTO v_wallet_balance 
        FROM public.store_wallets 
        WHERE user_id = v_user_id AND platform = v_expense.point_platform FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION '환불 대상 포인트 지갑이 없습니다.';
        END IF;

        v_wallet_balance := coalesce(v_wallet_balance, 0);
        IF v_wallet_balance + v_expense.used_points - v_expense.earned_points < 0 THEN
            RAISE EXCEPTION '적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다.';
        END IF;

        IF v_expense.used_points > 0 THEN
            v_wallet_balance := v_wallet_balance + v_expense.used_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', v_expense.used_points, v_wallet_balance, '결제 취소 포인트 반환');
        END IF;

        IF v_expense.earned_points > 0 THEN
            v_wallet_balance := v_wallet_balance - v_expense.earned_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', -v_expense.earned_points, v_wallet_balance, '결제 취소 적립 포인트 회수');
        END IF;
    END IF;

    -- 총 자산 복원 처리 (네이버페이 결제는 네이버페이 잔액으로 복원되므로 총 자산 이중 복원 방지)
    IF v_expense.deduct_from_asset AND v_expense.payment_method <> 'NAVER_PAY' THEN
        UPDATE public.user_finances
        SET total_asset = total_asset + v_expense.final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    UPDATE public.expenses SET status = 'CANCELLED', cancellation_kind = 'PAYMENT_REFUND'
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 10. 픽업별 지출 바인딩 및 가챠 소비 통계/분석 (Phase 11.4)
-- ==============================================================================

-- 10-1. expenses 테이블에 pickup_schedule_id 외래키 추가
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS pickup_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL;

-- 10-2. 픽업 지출 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_expenses_pickup_schedule_id 
    ON public.expenses(pickup_schedule_id)
    WHERE pickup_schedule_id IS NOT NULL;

-- 10-3. 일정 및 구독 템플릿 참조 검증 트리거 함수 갱신 (픽업 일정 게임 일치 검증 추가)
CREATE OR REPLACE FUNCTION public.validate_expense_references()
RETURNS TRIGGER AS $$
DECLARE v_schedule_game UUID; v_pickup_game UUID; v_template_user UUID; v_template_game UUID;
BEGIN
    IF NEW.schedule_id IS NOT NULL THEN
        SELECT game_id INTO v_schedule_game FROM public.game_schedules WHERE id = NEW.schedule_id;
        IF NOT FOUND OR NEW.game_id IS DISTINCT FROM v_schedule_game THEN
            RAISE EXCEPTION '지출 게임과 일정 게임이 일치해야 합니다.';
        END IF;
    END IF;
    IF NEW.pickup_schedule_id IS NOT NULL THEN
        SELECT game_id INTO v_pickup_game FROM public.game_schedules WHERE id = NEW.pickup_schedule_id;
        IF NOT FOUND OR NEW.game_id IS DISTINCT FROM v_pickup_game THEN
            RAISE EXCEPTION '지출 게임과 픽업 일정 게임이 일치해야 합니다.';
        END IF;
    END IF;
    IF NEW.template_id IS NOT NULL THEN
        SELECT user_id, game_id INTO v_template_user, v_template_game
        FROM public.subscription_templates WHERE id = NEW.template_id;
        IF NOT FOUND OR v_template_user IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION '본인 소유의 구독 템플릿만 연결할 수 있습니다.';
        END IF;
        IF v_template_game IS NOT NULL AND NEW.game_id IS DISTINCT FROM v_template_game THEN
            RAISE EXCEPTION '지출 게임과 구독 템플릿 게임이 일치해야 합니다.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_expense_references ON public.expenses;
CREATE TRIGGER trg_validate_expense_references
BEFORE INSERT OR UPDATE OF user_id, game_id, schedule_id, pickup_schedule_id, template_id ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.validate_expense_references();

-- ==============================================================================
-- 11. 정기 구독 누적 충전형 주기 일수(interval_days) 확장
-- ==============================================================================
ALTER TABLE public.subscription_templates
    ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 30 CHECK (interval_days > 0);



