-- ==============================================================================
-- SCHEMA.sql (통합 초안: 12개 핵심 테이블, RPC, 트리거, RLS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 재정 상태 (총 자산 및 기본 예산, 음수 자산 허용)
CREATE TABLE public.user_finances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_asset BIGINT NOT NULL DEFAULT 0, -- 음수 잔고 허용
    default_budget BIGINT NOT NULL DEFAULT 0 CHECK (default_budget >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 신규 가입 시 기본 재정 및 스토어 지갑을 무음 생성한다.
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_finances(user_id, total_asset, default_budget)
    VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, earn_rate, user_tier)
    VALUES
        (NEW.id, 'GOOGLE_PLAY', 0, 0.10, 'BRONZE'),
        (NEW.id, 'GALAXY_STORE', 0, 0.10, 'GENERAL')
    ON CONFLICT (user_id, platform) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_handle_new_user_setup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 2. 월별 소비 예산
CREATE TABLE public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    budget_amount BIGINT NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- 3. 공용 게임 마스터 카탈로그
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    default_icon_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status = 'APPROVED'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게임 추가 요청 (승인된 게임만 games 카탈로그에 생성)
CREATE TABLE public.game_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    memo TEXT,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_memo TEXT,
    approved_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 유저별 구독 게임 및 커스텀 아이콘
CREATE TABLE public.user_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    custom_icon_path TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

-- 5. 게임 공용 일정 (버전 및 픽업 기간 한정)
CREATE TABLE public.game_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    memo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_schedule_dates CHECK (end_date >= start_date)
);

-- 6. 일반 유저 일정 추가/수정 건의 요청 테이블
CREATE TABLE public.schedule_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    target_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL, -- 수정 요청 시 대상 일정
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP', 'CONTENTS')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    memo TEXT,
    admin_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_req_dates CHECK (end_date >= start_date)
);

-- 7. 유저 개인 캘린더 메모 (타일 도트 힌트용)
CREATE TABLE public.personal_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memo_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)
);

-- 8. 정기 구독 결제 템플릿
CREATE TABLE public.subscription_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '정기 구독',
    cycle_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY_DAY' CHECK (cycle_type IN ('MONTHLY_DAY', 'INTERVAL_30', 'VERSION_PASS')),
    billing_day SMALLINT DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 31),
    interval_days INTEGER DEFAULT 30 CHECK (interval_days > 0),
    default_price BIGINT NOT NULL DEFAULT 0 CHECK (default_price >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_subscription_template_version_pass CHECK (
        cycle_type <> 'VERSION_PASS' OR (category = '게임' AND game_id IS NOT NULL)
    )
);

-- 9. 스토어 포인트 및 페이 지갑
CREATE TABLE public.store_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    current_balance BIGINT NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    earn_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.10 CHECK (earn_rate BETWEEN 0 AND 100),
    user_tier VARCHAR(30),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform),
    CONSTRAINT chk_wallet_platform_settings CHECK (
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
    )
);

-- 10. 가계부 지출 내역
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL,
    pickup_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.subscription_templates(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(7), -- YYYY-MM 형식 정기 구독 식별자
    cancellation_kind VARCHAR(30) CHECK (cancellation_kind IN ('PLANNED_CANCEL', 'TEMPLATE_DEACTIVATION', 'PAYMENT_REFUND')),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('게임', '정기 구독', '식비', '교통', '생활', '기타')),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('CONFIRMED', 'PLANNED', 'CANCELLED')),
    target_date DATE NOT NULL,
    start_date DATE,
    end_date DATE,
    original_price BIGINT NOT NULL DEFAULT 0 CHECK (original_price >= 0),
    discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    point_discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (point_discount_amount >= 0),
    used_points BIGINT NOT NULL DEFAULT 0 CHECK (used_points >= 0),
    earned_points BIGINT NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
    final_amount BIGINT NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
    point_platform VARCHAR(30) CHECK (point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    deduct_from_asset BOOLEAN NOT NULL DEFAULT true,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_expense_period CHECK (
        (start_date IS NULL AND end_date IS NULL) OR 
        (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    ),
    CONSTRAINT chk_expense_math CHECK (
        final_amount = original_price - discount_amount - point_discount_amount AND
        point_discount_amount <= (original_price - discount_amount)
    ),
    CONSTRAINT chk_expense_cancellation_kind CHECK (
        (status = 'CANCELLED' AND cancellation_kind IS NOT NULL)
        OR (status <> 'CANCELLED' AND cancellation_kind IS NULL)
    )
);
ALTER TABLE public.expenses ADD CONSTRAINT chk_expense_earned_points_platform
    CHECK (earned_points = 0 OR point_platform IS NOT NULL);

-- 구독 템플릿 비활성화 시 이미 생성된 미결제 회차를 보존 취소한다.
CREATE OR REPLACE FUNCTION public.cancel_planned_expenses_on_template_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        UPDATE public.expenses
        SET status = 'CANCELLED', cancellation_kind = 'TEMPLATE_DEACTIVATION'
        WHERE template_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cancel_planned_expenses_on_template_deactivation
AFTER UPDATE OF is_active ON public.subscription_templates
FOR EACH ROW EXECUTE FUNCTION public.cancel_planned_expenses_on_template_deactivation();

-- 멱등성 보장 인덱스: 동일 구독 템플릿의 같은 월 중복 생성 원천 차단
CREATE UNIQUE INDEX idx_expenses_template_billing_cycle 
    ON public.expenses(template_id, billing_cycle) 
    WHERE template_id IS NOT NULL AND billing_cycle IS NOT NULL;

-- 버전 패스 멱등성 인덱스: 동일 템플릿-버전 중복 회차 생성 방지
CREATE UNIQUE INDEX idx_expenses_template_schedule_id 
    ON public.expenses(template_id, schedule_id) 
    WHERE template_id IS NOT NULL AND schedule_id IS NOT NULL;

-- 픽업별 지출 조회 인덱스
CREATE INDEX idx_expenses_pickup_schedule_id 
    ON public.expenses(pickup_schedule_id) 
    WHERE pickup_schedule_id IS NOT NULL;

ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_billing_cycle
    CHECK (billing_cycle IS NULL OR billing_cycle ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_point_platform
    CHECK ((used_points = 0 AND point_discount_amount = 0)
        OR (used_points > 0 AND point_discount_amount > 0 AND point_platform IS NOT NULL));
ALTER TABLE public.subscription_templates ADD CONSTRAINT chk_subscription_payment_method
    CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE'));
ALTER TABLE public.personal_memos ADD CONSTRAINT chk_personal_memo_content
    CHECK (length(btrim(content)) > 0);

-- 11. 스토어 포인트 및 페이 거래 원장 (Ledger)
CREATE TABLE public.store_point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('USE', 'EARN', 'MANUAL_ADJUST', 'REFUND', 'RECHARGE')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 보강
CREATE INDEX idx_expenses_user_target_date ON public.expenses(user_id, target_date);
CREATE INDEX idx_expenses_schedule_id ON public.expenses(schedule_id);
CREATE INDEX idx_expenses_pickup_schedule_id ON public.expenses(pickup_schedule_id);
CREATE INDEX idx_game_schedules_dates ON public.game_schedules(start_date, end_date);
CREATE INDEX idx_personal_memos_user_date ON public.personal_memos(user_id, memo_date);
CREATE INDEX idx_store_point_transactions_user_platform ON public.store_point_transactions(user_id, platform);
CREATE INDEX idx_schedule_requests_status ON public.schedule_requests(request_status);
CREATE INDEX idx_game_requests_status ON public.game_requests(request_status);

-- ==============================================================================
-- 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거
-- ==============================================================================

-- 1. 결제 전담 RPC (IDOR 방어 및 expenses 상태 갱신 일원화)
CREATE OR REPLACE FUNCTION public.process_expense_payment(
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR(30),
    p_payment_method VARCHAR(30),
    p_deduct_asset BOOLEAN,
    p_payment_date DATE,
    p_custom_earned_points BIGINT DEFAULT NULL,
    p_memo TEXT DEFAULT NULL
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

    -- 1-1. 포인트 미사용 스토어 결제: 지갑 행이 아직 없으면 기본 등급으로 자동 생성하여 적립 누락/지갑 미생성 오류 방지
    IF v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_used_points = 0 THEN
        INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
        VALUES (
            v_user_id,
            v_store_platform,
            CASE WHEN v_store_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE 'GENERAL' END,
            0.10
        )
        ON CONFLICT (user_id, platform) DO NOTHING;
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

    -- 3. 포인트 적립: 결제 플랫폼이 스토어이고 실결제액이 있는 경우
    --    (커스텀 적립 포인트 p_custom_earned_points가 주어지면 해당 값 우선 적용)
    IF v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND v_final_amount > 0 THEN
        IF p_custom_earned_points IS NOT NULL AND p_custom_earned_points >= 0 THEN
            v_earned_points := p_custom_earned_points;
        ELSE
            v_earned_points := FLOOR(v_final_amount * coalesce(v_earn_rate, 0) / 100);
        END IF;
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
        final_amount = v_final_amount,
        memo = coalesce(p_memo, memo)
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. 결제 취소/환불 전담 RPC (포인트 회수 검증 및 자산 복원)
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

-- 결제 완료된 지출의 비회계 메타데이터(제목, 카테고리, 메모, 결제일) 수정 함수
CREATE OR REPLACE FUNCTION public.update_confirmed_expense_metadata(
    p_expense_id UUID,
    p_title VARCHAR(150),
    p_category VARCHAR(50),
    p_memo TEXT DEFAULT NULL,
    p_target_date DATE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_status VARCHAR(20);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RAISE EXCEPTION '항목명을 입력해 주세요.';
    END IF;

    IF p_category NOT IN ('게임', '정기 구독', '식비', '교통', '생활', '기타') THEN
        RAISE EXCEPTION '올바르지 않은 카테고리입니다.';
    END IF;

    IF p_target_date IS NOT NULL AND p_target_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제일을 설정할 수 없습니다.';
    END IF;

    SELECT status INTO v_status
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '지출 내역을 찾을 수 없습니다.';
    END IF;

    IF v_status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '결제 완료된 지출만 메타데이터를 수정할 수 있습니다.';
    END IF;

    UPDATE public.expenses
    SET title = btrim(p_title),
        category = p_category,
        memo = p_memo,
        target_date = coalesce(p_target_date, target_date)
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 예정 취소와 복구는 전용 경로로 수행한다. 구독 비활성화 취소는 복구 가능하지만 환불은 불가하다.
CREATE OR REPLACE FUNCTION public.cancel_planned_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses
    SET status = 'CANCELLED', cancellation_kind = 'PLANNED_CANCEL'
    WHERE id = p_expense_id AND user_id = v_user_id AND status = 'PLANNED';
    IF NOT FOUND THEN RAISE EXCEPTION '취소할 수 있는 예정 지출이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.restore_cancelled_expense(p_expense_id UUID)
RETURNS VOID AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    UPDATE public.expenses AS e
    SET status = 'PLANNED', cancellation_kind = NULL
    WHERE e.id = p_expense_id AND e.user_id = v_user_id AND e.status = 'CANCELLED'
      AND (
          e.cancellation_kind = 'PLANNED_CANCEL'
          OR (e.cancellation_kind = 'TEMPLATE_DEACTIVATION' AND EXISTS (
              SELECT 1 FROM public.subscription_templates AS t
              WHERE t.id = e.template_id AND t.user_id = v_user_id AND t.is_active = true
          ))
      );
    IF NOT FOUND THEN RAISE EXCEPTION '복구 가능한 예정 취소 항목이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 일정 및 구독 템플릿 참조는 본인 소유와 게임 관계가 일치해야 한다.
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

CREATE TRIGGER trg_validate_expense_references
BEFORE INSERT OR UPDATE OF user_id, game_id, schedule_id, pickup_schedule_id, template_id ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.validate_expense_references();

-- Account deletion requests remain readable to their owner while personal data
-- access is blocked. The service role owns request/worker state transitions.
CREATE TABLE public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    status_token_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'STORAGE_CLEANUP', 'DATA_CLEANUP', 'EMAIL_PENDING', 'AUTH_DELETE_PENDING', 'MANUAL_REVIEW', 'COMPLETED')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    retry_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    last_error_code VARCHAR(50),
    storage_completed_at TIMESTAMPTZ,
    data_completed_at TIMESTAMPTZ,
    email_attempted_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_deletion_requests_due
    ON public.account_deletion_requests(retry_after)
    WHERE status <> 'COMPLETED';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT (status, requested_at, updated_at)
    ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

CREATE POLICY "Users read own account deletion status"
    ON public.account_deletion_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.account_deletion_is_pending(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.account_deletion_requests
        WHERE user_id = p_user_id AND status <> 'COMPLETED'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.account_deletion_is_pending(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_is_pending(UUID) TO authenticated;

CREATE POLICY "Block account deletion users from storage"
    ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT public.account_deletion_is_pending(auth.uid()))
    WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()));

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'personal_memos', 'subscription_templates',
        'store_wallets', 'expenses', 'store_point_transactions'
    ] LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_deletion_is_pending(auth.uid())) WITH CHECK (NOT public.account_deletion_is_pending(auth.uid()))',
            'Block account deletion users from ' || v_table,
            v_table
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_deletion_requests(p_limit INTEGER DEFAULT 5)
RETURNS SETOF public.account_deletion_requests AS $$
BEGIN
    IF p_limit < 1 OR p_limit > 20 THEN
        RAISE EXCEPTION 'p_limit must be between 1 and 20';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT id
        FROM public.account_deletion_requests
        WHERE status NOT IN ('COMPLETED', 'MANUAL_REVIEW')
          AND retry_after <= NOW()
          AND (locked_until IS NULL OR locked_until < NOW())
        ORDER BY requested_at
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.account_deletion_requests AS request
    SET locked_until = NOW() + INTERVAL '5 minutes',
        attempt_count = request.attempt_count + 1,
        updated_at = NOW()
    FROM due
    WHERE request.id = due.id
    RETURNING request.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_account_deletion_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_deletion_requests(INTEGER) TO service_role;

-- [pg_cron 백그라운드 워커] 만료된 계정 탈퇴 요청 일괄 영구 삭제 원자적 함수
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

-- [계정 탈퇴 요청 RPC] 확인 이메일 검증 및 탈퇴 토큰 발급
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

-- [계정 탈퇴 상태 조회 RPC] 불투명 토큰 해시 기반 상태 조회
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

CREATE OR REPLACE FUNCTION public.block_pending_account_data_mutations()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    IF auth.uid() = v_user_id AND public.account_deletion_is_pending(v_user_id) THEN
        RAISE EXCEPTION '계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'user_finances', 'monthly_budgets', 'game_requests', 'user_games',
        'schedule_requests', 'personal_memos', 'subscription_templates',
        'store_wallets', 'expenses', 'store_point_transactions'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_pending_account_data_mutations()',
            'block_pending_account_deletion_' || v_table,
            v_table
        );
    END LOOP;
END;
$$;

-- 3. 지갑 설정 변경 RPC (등급 및 적립률)
CREATE OR REPLACE FUNCTION public.update_store_wallet_settings(
    p_platform VARCHAR(30),
    p_tier VARCHAR(30),
    p_earn_rate NUMERIC(5, 2)
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') OR p_earn_rate IS NULL OR p_earn_rate < 0 THEN
        RAISE EXCEPTION '지갑 플랫폼 또는 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GOOGLE_PLAY' AND (
        p_tier NOT IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') OR
        p_earn_rate IS DISTINCT FROM CASE p_tier
            WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
            WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END
    ) THEN
        RAISE EXCEPTION 'Google Play 등급 또는 공식 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GALAXY_STORE' AND (
        (p_tier IS NOT NULL AND (
            p_tier NOT IN ('GENERAL', 'STAR', 'PRESTIGE', 'ROYAL_BLUE') OR
            p_earn_rate IS DISTINCT FROM CASE p_tier
                WHEN 'GENERAL' THEN 0.10 WHEN 'STAR' THEN 0.10
                WHEN 'PRESTIGE' THEN 1.10 WHEN 'ROYAL_BLUE' THEN 2.10 END
        )) OR (p_tier IS NULL AND p_earn_rate > 100)
    ) THEN
        RAISE EXCEPTION 'Galaxy Store 등급 또는 적립률이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_tier, p_earn_rate, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET user_tier = p_tier, earn_rate = p_earn_rate, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 지갑 잔액 수동 보정 RPC
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

-- 자산과 기본 예산 초기 설정/정정 RPC
CREATE OR REPLACE FUNCTION public.set_user_finance_settings(
    p_total_asset BIGINT,
    p_default_budget BIGINT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF p_total_asset IS NULL OR p_default_budget IS NULL OR p_default_budget < 0 THEN
        RAISE EXCEPTION '자산 또는 기본 예산 입력이 올바르지 않습니다.';
    END IF;
    INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at)
    VALUES (v_user_id, p_total_asset, p_default_budget, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = EXCLUDED.total_asset,
        default_budget = EXCLUDED.default_budget,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 버전/픽업 일정 날짜 변경에 따른 예정 지출 동기화 트리거 함수
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

CREATE TRIGGER trg_sync_version_expenses
AFTER UPDATE ON public.game_schedules
FOR EACH ROW EXECUTE FUNCTION public.sync_version_expenses_trigger();

-- 관리자 전용 요청 승인/반려 RPC. 일정 반영과 요청 상태 전환은 한 트랜잭션으로 처리한다.
CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
    v_is_admin BOOLEAN;
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
    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_schedule_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.schedule_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 일정 요청이 아닙니다.'; END IF;
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
    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_game_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    UPDATE public.game_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 게임 요청이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_create_game(p_name TEXT, p_default_icon_url TEXT)
RETURNS UUID AS $$
DECLARE
    v_game_id UUID;
    v_name TEXT := btrim(p_name);
    v_url TEXT := btrim(p_default_icon_url);
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');

    IF NOT coalesce(v_is_admin, false) THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;

    IF v_name IS NULL OR v_name = '' THEN
        RAISE EXCEPTION '게임 이름을 입력해 주세요.';
    END IF;

    IF v_url IS NULL OR v_url = '' THEN
        RAISE EXCEPTION '게임 기본 아이콘 URL을 입력해 주세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.games WHERE name = v_name) THEN
        RAISE EXCEPTION '이미 등록된 게임 이름입니다.';
    END IF;

    INSERT INTO public.games(name, default_icon_url, created_by)
    VALUES (v_name, v_url, auth.uid())
    RETURNING id INTO v_game_id;

    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_subscription_template(p_template_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.subscription_templates
        WHERE id = p_template_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION '삭제할 수 있는 본인 소유의 구독 템플릿이 아닙니다.';
    END IF;

    DELETE FROM public.expenses
    WHERE template_id = p_template_id
      AND user_id = v_user_id
      AND status = 'PLANNED';

    DELETE FROM public.subscription_templates
    WHERE id = p_template_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================== 
-- RLS 격리 및 보안 정책
-- ==============================================================================

ALTER TABLE public.user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_point_transactions ENABLE ROW LEVEL SECURITY;

-- games 정책
CREATE POLICY "Allow public read approved games" ON public.games FOR SELECT USING (status = 'APPROVED');
CREATE POLICY "Allow admin manage games" ON public.games FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage 버킷은 비공개로 생성한다. 설정: 최대 102,400 bytes, 허용 MIME `image/webp`.
-- 클라이언트는 PNG/JPG/JPEG/WebP 원본(최대 5 MiB)을 256x256 WebP(최대 100 KiB)로 변환해 업로드한다.
-- Storage 정책은 storage.objects에 별도 적용한다.
CREATE POLICY "Users read own icons" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own icons" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own icons" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own icons" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own game requests" ON public.game_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_game_id IS NULL);
CREATE POLICY "Users read own game requests" ON public.game_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Admin manage game requests" ON public.game_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- game_schedules 정책 (공용 읽기, 관리자만 쓰기)
CREATE POLICY "Allow public read schedules" ON public.game_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage schedules" ON public.game_schedules FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- schedule_requests 정책 (유저는 본인 등록/조회만, 관리자는 전체 검토)
CREATE POLICY "Users insert own requests" ON public.schedule_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL);
CREATE POLICY "Users read own requests" ON public.schedule_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage requests" ON public.schedule_requests FOR ALL TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 개인 데이터 기본 격리 (auth.uid() = user_id)
CREATE POLICY "Read own finances" ON public.user_finances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Manage own budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own user_games" ON public.user_games FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own memos" ON public.personal_memos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read own templates" ON public.subscription_templates FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Insert own templates" ON public.subscription_templates FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own templates" ON public.subscription_templates FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own templates" ON public.subscription_templates FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
-- 구독 종료는 비활성화(is_active=false) 또는 템플릿 삭제로 처리한다.
CREATE POLICY "Read own expenses" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own planned expenses" ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
CREATE POLICY "Update own planned expenses" ON public.expenses FOR UPDATE TO authenticated
    USING (auth.uid() = user_id AND status = 'PLANNED')
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
-- expenses는 물리 삭제를 허용하지 않는다. 예정 취소/복구는 전용 RPC로 수행한다.

-- 원장 및 지갑: 일반 유저는 직접 수정 불가, 오직 SELECT만 허용 (RPC를 통해서만 쓰기 허용)
CREATE POLICY "Read own wallets" ON public.store_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Read own point transactions" ON public.store_point_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER 함수는 기본 PUBLIC 실행 권한을 회수하고 필요한 인증 사용자에게만 허용한다.
REVOKE ALL ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE, BIGINT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.refund_expense_payment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_planned_expense(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_cancelled_expense(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_schedule_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_game_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_game_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_game(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_subscription_template(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_expense_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_confirmed_expense_metadata(UUID, VARCHAR, VARCHAR, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_planned_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_cancelled_expense(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_schedule_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_game_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_game_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_game(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subscription_template(UUID) TO authenticated;
