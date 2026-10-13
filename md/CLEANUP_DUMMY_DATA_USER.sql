-- ==============================================================================
-- ChronoLedger 테스트 계정 더미 데이터 정리(제거) 스크립트
-- 대상 사용자 ID: dae6adf8-7bfe-457e-8a05-c1e2ce64a381
-- 설명:
-- 1. 대상 유저의 가계부 지출 내역(expenses) 전체 삭제
-- 2. 대상 유저의 정기 구독 템플릿(subscription_templates) 전체 삭제
-- 3. 대상 유저의 구독 게임(user_games) 전체 삭제
-- 4. 대상 유저의 캘린더 개인 메모(personal_memos) 전체 삭제
-- 5. 대상 유저의 월간 예산(monthly_budgets) 전체 삭제
-- 6. 대상 유저의 재무 정보(user_finances) 및 스토어 지갑(store_wallets) 잔액 초기화
-- ※ 공용 게임 카탈로그(games)는 시스템 공용 자산이므로 보존됩니다.
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID := 'dae6adf8-7bfe-457e-8a05-c1e2ce64a381';
BEGIN
    -- 1. 지출 내역 및 정기 구독 템플릿 삭제
    DELETE FROM public.expenses WHERE user_id = v_user_id;
    DELETE FROM public.subscription_templates WHERE user_id = v_user_id;

    -- 2. 유저 구독 게임 삭제
    DELETE FROM public.user_games WHERE user_id = v_user_id;

    -- 3. 개인 메모 삭제
    DELETE FROM public.personal_memos WHERE user_id = v_user_id;

    -- 4. 월간 예산 삭제
    DELETE FROM public.monthly_budgets WHERE user_id = v_user_id;

    -- 5. 유저 재무 설정 초기화 (자산 0원, 기본 예산 0원)
    UPDATE public.user_finances
    SET total_asset = 0,
        default_budget = 0,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- 6. 스토어 지갑 잔액 0원 초기화 (체크 제약조건 준수)
    UPDATE public.store_wallets
    SET current_balance = 0,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RAISE NOTICE '테스트 계정(%)의 더미 데이터가 성공적으로 모두 정리(삭제)되었습니다.', v_user_id;
END $$;
