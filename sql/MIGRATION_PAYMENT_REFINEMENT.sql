-- ==============================================================================
-- ChronoLedger: 결제 수단 / 결제 플랫폼 / 할인 수단 정합성 개선 마이그레이션
-- 1. 결제 수단을 실제 결제 자산인 '내 지갑'(WALLET)과 '네이버페이'(NAVER_PAY)로 명확히 정제.
-- 2. 'Google Play', 'Galaxy Store'는 할인 수단(포인트/쿠폰) 및 적립 플랫폼으로 명확히 분리.
-- 3. 네이버페이 결제 시에도 스토어 포인트/할인 복합 사용 허용 (남은 차액에 대해서만 네이버페이 처리).
-- 4. 100% 전액 할인/포인트 결제(실결제액 0원) 처리 지원.
-- ==============================================================================

-- 1. 기존 데이터 정리 (과거 구버전 payment_method를 WALLET으로 정제하고 point_platform으로 이전)
UPDATE public.expenses
SET point_platform = payment_method,
    payment_method = 'WALLET'
WHERE payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE');

UPDATE public.subscription_templates
SET payment_method = 'WALLET'
WHERE payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE');

-- 2. process_expense_payment RPC 갱신
CREATE OR REPLACE FUNCTION public.process_expense_payment(
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR,
    p_payment_method VARCHAR,
    p_deduct_asset BOOLEAN,
    p_payment_date DATE
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_wallet_balance BIGINT;
    v_earn_rate NUMERIC(5, 2);
    v_earned_points BIGINT := 0;
    v_new_balance BIGINT;
    v_final_amount BIGINT;
    v_np_balance BIGINT;
    v_np_shortage BIGINT;
    v_np_recharge BIGINT;
    v_total_asset BIGINT;
    v_effective_method VARCHAR;
    v_store_platform VARCHAR;
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

    IF p_payment_method IS NULL OR p_payment_method NOT IN ('WALLET', 'NAVER_PAY', 'GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 결제 수단입니다.';
    END IF;

    -- 하위 호환: 구버전 GOOGLE_PLAY, GALAXY_STORE가 넘어오면 실결제 수단은 WALLET으로, 플랫폼은 해당 스토어로 매핑
    IF p_payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        v_effective_method := 'WALLET';
        v_store_platform := p_payment_method;
    ELSE
        v_effective_method := p_payment_method;
        v_store_platform := p_point_platform;
    END IF;

    IF p_payment_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제할 수 없습니다.';
    END IF;

    IF p_used_points = 0 AND p_point_discount_amount <> 0 THEN
        RAISE EXCEPTION '포인트 사용 정보가 서로 일치하지 않습니다.';
    END IF;
    IF p_used_points > 0 AND (p_point_discount_amount = 0 OR v_store_platform IS NULL OR v_store_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')) THEN
        RAISE EXCEPTION '포인트 플랫폼과 할인 금액을 확인해 주세요.';
    END IF;
    IF v_store_platform IS NOT NULL AND v_store_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 포인트 플랫폼입니다.';
    END IF;

    -- 최종 실결제액 산출 (최대 100% 할인 가능, 0원 미만 불가)
    v_final_amount := p_original_price - p_discount_amount - p_point_discount_amount;
    IF v_final_amount < 0 THEN
        v_final_amount := 0;
    END IF;

    -- 1. 네이버페이 결제 처리 (실결제액이 존재할 때 부족 시 10,000원 단위 올림 자동 충전 및 결제 차감)
    IF v_effective_method = 'NAVER_PAY' THEN
        INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
        VALUES (v_user_id, 'NAVER_PAY', NULL, 0)
        ON CONFLICT (user_id, platform) DO NOTHING;

        IF v_final_amount > 0 THEN
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
    END IF;

    -- 2. 사용 포인트 차감 및 스토어 적립률 잠금 조회
    IF v_store_platform IS NOT NULL THEN
        SELECT current_balance, earn_rate INTO v_wallet_balance, v_earn_rate
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = v_store_platform
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION '포인트 지갑 설정이 없습니다.'; END IF;
    END IF;

    IF p_used_points > 0 THEN
        IF v_wallet_balance IS NULL OR v_wallet_balance < p_used_points THEN
            RAISE EXCEPTION '포인트 잔액이 부족합니다.';
        END IF;

        v_new_balance := v_wallet_balance - p_used_points;
        UPDATE public.store_wallets 
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = v_store_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, v_store_platform, p_expense_id, 'USE', -p_used_points, v_new_balance, '결제 포인트 사용');
        
        v_wallet_balance := v_new_balance;
    END IF;

    -- 3. 포인트 적립: 결제 수단과 무관하게 결제 플랫폼이 스토어(Google Play / Galaxy Store)이고 실결제액이 있는 경우 적립
    IF v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND v_final_amount > 0 THEN
        v_earned_points := FLOOR(v_final_amount * coalesce(v_earn_rate, 0) / 100);
    END IF;

    IF v_earned_points > 0 THEN
        v_new_balance := coalesce(v_wallet_balance, 0) + v_earned_points;
        
        UPDATE public.store_wallets
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = v_store_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, v_store_platform, p_expense_id, 'EARN', v_earned_points, v_new_balance, '결제 적립 포인트');
    END IF;

    -- 4. 총 자산 차감 처리 ('내 지갑' 결제이고 자산 차감 선택 시 실결제액 차감)
    IF p_deduct_asset AND v_effective_method = 'WALLET' AND v_final_amount > 0 THEN
        UPDATE public.user_finances
        SET total_asset = total_asset - v_final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    -- 5. expenses 상태 CONFIRMED 원자적 갱신
    UPDATE public.expenses
    SET status = 'CONFIRMED',
        original_price = p_original_price,
        discount_amount = p_discount_amount,
        point_discount_amount = p_point_discount_amount,
        used_points = p_used_points,
        payment_method = v_effective_method,
        deduct_from_asset = CASE WHEN v_effective_method = 'NAVER_PAY' THEN FALSE ELSE p_deduct_asset END,
        target_date = p_payment_date,
        point_platform = v_store_platform,
        earned_points = v_earned_points,
        final_amount = v_final_amount
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. refund_expense_payment RPC 갱신 (0원 결제 안전성 보강)
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

    -- 네이버페이 환불 처리 (네이버페이 지갑 잔액으로 실결제액 복원)
    IF v_expense.payment_method = 'NAVER_PAY' AND v_expense.final_amount > 0 THEN
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
    IF v_expense.deduct_from_asset AND v_expense.payment_method <> 'NAVER_PAY' AND v_expense.final_amount > 0 THEN
        UPDATE public.user_finances
        SET total_asset = total_asset + v_expense.final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    UPDATE public.expenses SET status = 'CANCELLED', cancellation_kind = 'PAYMENT_REFUND'
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

