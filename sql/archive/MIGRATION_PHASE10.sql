-- ⚠️ ARCHIVE — 재실행 금지. 내용은 sql/SCHEMA.sql 및 sql/migrations/의 최신판으로 대체되었다.
-- 구버전 RPC/제약을 포함할 수 있어 실행 시 최신 정의를 되돌린다. 이력 참고용 (sql/README.md).

-- ==============================================================================
-- ChronoLedger: Phase 10 / 정기 구독 및 결제 주기 개선 마이그레이션 스크립트
-- Supabase Dashboard > SQL Editor 에서 실행할 수 있습니다.
-- ==============================================================================

BEGIN;

-- 1. subscription_templates: cycle_type 컬럼 추가 (3종 주기 모델: MONTHLY_DAY, INTERVAL_30, VERSION_PASS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'subscription_templates' 
          AND column_name = 'cycle_type'
    ) THEN
        ALTER TABLE public.subscription_templates 
        ADD COLUMN cycle_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY_DAY';
        
        ALTER TABLE public.subscription_templates 
        ADD CONSTRAINT chk_subscription_template_cycle_type 
        CHECK (cycle_type IN ('MONTHLY_DAY', 'INTERVAL_30', 'VERSION_PASS'));
    END IF;
END;
$$;

-- 2. subscription_templates: billing_day 컬럼 NOT NULL 해제 (INTERVAL_30 / VERSION_PASS 대응)
ALTER TABLE public.subscription_templates 
    ALTER COLUMN billing_day DROP NOT NULL;

-- 3. subscription_templates: VERSION_PASS 연관 제약 조건 설정/완화
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'subscription_templates'
          AND constraint_name = 'chk_subscription_template_version_pass'
    ) THEN
        ALTER TABLE public.subscription_templates
        DROP CONSTRAINT chk_subscription_template_version_pass;
    END IF;

    ALTER TABLE public.subscription_templates
    ADD CONSTRAINT chk_subscription_template_version_pass
    CHECK (cycle_type <> 'VERSION_PASS' OR game_id IS NOT NULL);
END;
$$;

-- 4. expenses: 버전 패스 멱등성 보장 인덱스 추가 (동일 템플릿-버전 중복 회차 생성 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_template_schedule_id 
    ON public.expenses(template_id, schedule_id) 
    WHERE template_id IS NOT NULL AND schedule_id IS NOT NULL;

-- 5. expenses & subscription_templates: 카테고리 체크 제약에 '정기 구독' 확인 및 허용
DO $$
BEGIN
    -- expenses 테이블의 category 제약 확인 및 갱신
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'expenses'
          AND constraint_name = 'expenses_category_check'
    ) THEN
        ALTER TABLE public.expenses DROP CONSTRAINT expenses_category_check;
        ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
            CHECK (category IN ('게임', '정기 구독', '식비', '교통', '생활', '기타'));
    END IF;

    -- subscription_templates 테이블의 category 제약 확인 및 갱신
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'subscription_templates'
          AND constraint_name = 'subscription_templates_category_check'
    ) THEN
        ALTER TABLE public.subscription_templates DROP CONSTRAINT subscription_templates_category_check;
        ALTER TABLE public.subscription_templates ADD CONSTRAINT subscription_templates_category_check 
            CHECK (category IN ('게임', '정기 구독', '식비', '교통', '생활', '기타'));
    END IF;
END;
$$;

-- 6. store_wallets: chk_wallet_platform_settings 제약조건 갱신 (Galaxy Store 4대 공식 등급 허용)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'store_wallets'
          AND constraint_name = 'chk_wallet_platform_settings'
    ) THEN
        ALTER TABLE public.store_wallets DROP CONSTRAINT chk_wallet_platform_settings;
    END IF;

    ALTER TABLE public.store_wallets
    ADD CONSTRAINT chk_wallet_platform_settings CHECK (
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
    );
END;
$$;

-- 7. update_store_wallet_settings: Galaxy Store 4대 공식 등급(GENERAL, STAR, PRESTIGE, ROYAL_BLUE) 지원 갱신
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

-- 8. handle_new_user_setup: 신규 가입 시 Galaxy Store 기본 등급을 'GENERAL'(0.10%)로 생성하도록 갱신
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

-- 9. adjust_wallet_balance: 수동 보정 시 Galaxy Store 기본 등급을 'GENERAL'로 생성하도록 갱신
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
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')
       OR p_target_balance IS NULL OR p_target_balance < 0 THEN
        RAISE EXCEPTION '플랫폼 또는 목표 잔액이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
    VALUES (v_user_id, p_platform,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE 'GENERAL' END,
        0.10)
    ON CONFLICT (user_id, platform) DO NOTHING;
    SELECT current_balance INTO v_current
    FROM public.store_wallets 
    WHERE user_id = v_user_id AND platform = p_platform FOR UPDATE;

    v_diff := p_target_balance - v_current;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_target_balance,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE 'GENERAL' END,
        0.10, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET current_balance = p_target_balance, updated_at = NOW();

    INSERT INTO public.store_point_transactions(user_id, platform, transaction_type, amount, balance_after, memo)
    VALUES (v_user_id, p_platform, 'MANUAL_ADJUST', v_diff, p_target_balance, coalesce(p_memo, '수동 잔액 보정'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. 기존 store_wallets 데이터 보정: user_tier가 NULL인 Galaxy Store 지갑을 공식 등급으로 일괄 업데이트
UPDATE public.store_wallets
SET user_tier = CASE
    WHEN earn_rate >= 2.10 THEN 'ROYAL_BLUE'
    WHEN earn_rate >= 1.10 THEN 'PRESTIGE'
    ELSE 'GENERAL'
END,
updated_at = NOW()
WHERE platform = 'GALAXY_STORE' AND user_tier IS NULL;

COMMIT;

-- 완료 확인
SELECT platform, user_tier, earn_rate, count(*) 
FROM public.store_wallets 
GROUP BY platform, user_tier, earn_rate;
