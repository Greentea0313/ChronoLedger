-- ==============================================================================
-- ChronoLedger 일반 사용자 테스트 계정 더미 데이터 생성 스크립트
-- 대상 사용자 ID: dae6adf8-7bfe-457e-8a05-c1e2ce64a381
-- 설명:
-- 1. 게임 카탈로그 14종 등록 (구독 게임 페이지 12개 단위 페이지네이션 검증 지원)
-- 2. 대상 유저의 14개 게임 구독(user_games) 등록
-- 3. 스토어 지갑(Google Play, Galaxy Store, Naver Pay) 및 잔액, 등급 설정
-- 4. 유저 자산(user_finances) 및 2026년 10월 예산(monthly_budgets) 등록
-- 5. 정기 구독 템플릿(게임 월정액 및 일반 OTT/멤버십 등) 등록 (정렬 순서 검증 지원)
-- 6. 가계부 지출 내역 18건 등록 (확정/예정/취소 지출, 카테고리별 통계 및 페이지네이션 검증 지원)
-- 7. 캘린더 개인 메모(personal_memos) 등록
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID := 'dae6adf8-7bfe-457e-8a05-c1e2ce64a381';
    v_user_exists BOOLEAN;

    -- 게임 UUID 변수
    v_game_starrail UUID;
    v_game_genshin UUID;
    v_game_bluearchive UUID;
    v_game_arknights UUID;
    v_game_endfield UUID;
    v_game_nikke UUID;
    v_game_wuthering UUID;
    v_game_zenless UUID;
    v_game_limbus UUID;
    v_game_chaos UUID;
    v_game_fgo UUID;
    v_game_epicseven UUID;
    v_game_trickcal UUID;
    v_game_umamusume UUID;

    -- 정기 구독 템플릿 UUID 변수
    v_tpl_starrail UUID;
    v_tpl_genshin UUID;
    v_tpl_bluearchive UUID;
    v_tpl_arknights UUID;
    v_tpl_netflix UUID;
    v_tpl_youtube UUID;
    v_tpl_coupang UUID;

BEGIN
    -- 0. 대상 유저 존재 여부 확인 (auth.users)
    SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) INTO v_user_exists;
    IF NOT v_user_exists THEN
        RAISE EXCEPTION '대상 사용자 ID (%)가 auth.users 테이블에 존재하지 않습니다. 먼저 회원가입을 완료해주세요.', v_user_id;
    END IF;

    -- 1. public.users 테이블 확인 및 닉네임 설정
    INSERT INTO public.users (id, nickname, role)
    VALUES (v_user_id, '크로노테스터', 'user')
    ON CONFLICT (id) DO UPDATE
    SET nickname = COALESCE(public.users.nickname, '크로노테스터'),
        role = 'user';

    -- 2. 공용 게임 카탈로그 14종 등록/갱신 (12개 단위 페이지네이션 테스트를 위해 14개 구성)
    INSERT INTO public.games (name, default_icon_url, status)
    VALUES 
        ('붕괴: 스타레일', '/assets/games/star_rail.png', 'APPROVED'),
        ('원신', '/assets/games/genshin.png', 'APPROVED'),
        ('블루 아카이브', '/assets/games/blue_archive.png', 'APPROVED'),
        ('명일방주', '/assets/games/arknights.png', 'APPROVED'),
        ('명일방주: 엔드필드', '/assets/games/endfield.png', 'APPROVED'),
        ('승리의 여신: 니케', '/assets/games/nikke.png', 'APPROVED'),
        ('명조', '/assets/games/wuthering_wave.png', 'APPROVED'),
        ('젠레스 존 제로', '/assets/games/zenless_zone_zero.png', 'APPROVED'),
        ('림버스 컴퍼니', '/assets/games/limbus_company.png', 'APPROVED'),
        ('카오스 제로 나이트메어', '/assets/games/chaos_zero_nightmare.png', 'APPROVED'),
        ('페이트/그랜드 오더', '/assets/games/fgo.png', 'APPROVED'),
        ('에픽세븐', '/assets/games/epic_seven.png', 'APPROVED'),
        ('트릭컬 리바이브', '/assets/games/trickcal.png', 'APPROVED'),
        ('우마무스메 프리티 더비', '/assets/games/umamusume.png', 'APPROVED')
    ON CONFLICT (name) DO UPDATE 
    SET default_icon_url = EXCLUDED.default_icon_url,
        status = 'APPROVED';

    -- 각 게임의 UUID 조회
    SELECT id INTO v_game_starrail FROM public.games WHERE name = '붕괴: 스타레일';
    SELECT id INTO v_game_genshin FROM public.games WHERE name = '원신';
    SELECT id INTO v_game_bluearchive FROM public.games WHERE name = '블루 아카이브';
    SELECT id INTO v_game_arknights FROM public.games WHERE name = '명일방주';
    SELECT id INTO v_game_endfield FROM public.games WHERE name = '명일방주: 엔드필드';
    SELECT id INTO v_game_nikke FROM public.games WHERE name = '승리의 여신: 니케';
    SELECT id INTO v_game_wuthering FROM public.games WHERE name = '명조';
    SELECT id INTO v_game_zenless FROM public.games WHERE name = '젠레스 존 제로';
    SELECT id INTO v_game_limbus FROM public.games WHERE name = '림버스 컴퍼니';
    SELECT id INTO v_game_chaos FROM public.games WHERE name = '카오스 제로 나이트메어';
    SELECT id INTO v_game_fgo FROM public.games WHERE name = '페이트/그랜드 오더';
    SELECT id INTO v_game_epicseven FROM public.games WHERE name = '에픽세븐';
    SELECT id INTO v_game_trickcal FROM public.games WHERE name = '트릭컬 리바이브';
    SELECT id INTO v_game_umamusume FROM public.games WHERE name = '우마무스메 프리티 더비';

    -- 3. 유저 게임 구독 (user_games) 14종 등록 (기존 데이터 삭제 후 재삽입으로 중복 방지)
    DELETE FROM public.user_games WHERE user_id = v_user_id;

    INSERT INTO public.user_games (user_id, game_id)
    VALUES 
        (v_user_id, v_game_starrail),
        (v_user_id, v_game_genshin),
        (v_user_id, v_game_bluearchive),
        (v_user_id, v_game_arknights),
        (v_user_id, v_game_endfield),
        (v_user_id, v_game_nikke),
        (v_user_id, v_game_wuthering),
        (v_user_id, v_game_zenless),
        (v_user_id, v_game_limbus),
        (v_user_id, v_game_chaos),
        (v_user_id, v_game_fgo),
        (v_user_id, v_game_epicseven),
        (v_user_id, v_game_trickcal),
        (v_user_id, v_game_umamusume);

    -- 4. 유저 자산(user_finances) 및 당월 예산(monthly_budgets) 설정
    INSERT INTO public.user_finances (user_id, total_asset, default_budget)
    VALUES (v_user_id, 1500000, 300000)
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = 1500000, default_budget = 300000, updated_at = NOW();

    INSERT INTO public.monthly_budgets (user_id, year, month, budget_amount)
    VALUES (v_user_id, 2026, 10, 350000)
    ON CONFLICT (user_id, year, month) DO UPDATE
    SET budget_amount = 350000;

    -- 5. 스토어 지갑(store_wallets) 설정 (체크 제약 조건 엄격 준수)
    -- Google Play: GOLD 등급, 적립률 0.13, 잔액 24,500원
    INSERT INTO public.store_wallets (user_id, platform, current_balance, earn_rate, user_tier, updated_at)
    VALUES (v_user_id, 'GOOGLE_PLAY', 24500, 0.13, 'GOLD', NOW())
    ON CONFLICT (user_id, platform) DO UPDATE
    SET current_balance = 24500, earn_rate = 0.13, user_tier = 'GOLD', updated_at = NOW();

    -- Galaxy Store: GENERAL 등급, 적립률 0.10, 잔액 18,200원
    INSERT INTO public.store_wallets (user_id, platform, current_balance, earn_rate, user_tier, updated_at)
    VALUES (v_user_id, 'GALAXY_STORE', 18200, 0.10, 'GENERAL', NOW())
    ON CONFLICT (user_id, platform) DO UPDATE
    SET current_balance = 18200, earn_rate = 0.10, user_tier = 'GENERAL', updated_at = NOW();

    -- Naver Pay: user_tier NULL, 적립률 0, 잔액 45,000원
    INSERT INTO public.store_wallets (user_id, platform, current_balance, earn_rate, user_tier, updated_at)
    VALUES (v_user_id, 'NAVER_PAY', 45000, 0, NULL, NOW())
    ON CONFLICT (user_id, platform) DO UPDATE
    SET current_balance = 45000, earn_rate = 0, user_tier = NULL, updated_at = NOW();

    -- 6. 기존 지출(expenses) 및 정기 구독 템플릿(subscription_templates) 정리 후 재등록
    DELETE FROM public.expenses WHERE user_id = v_user_id;
    DELETE FROM public.subscription_templates WHERE user_id = v_user_id;

    -- 정기 구독 템플릿 등록 (게임 4종 + 일반 구독 3종)
    -- 게임 1: 붕괴: 스타레일 - 열차보급허가증 (누적 충전형 30일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, v_game_starrail, '열차보급허가증', '게임', 'INTERVAL_30', NULL, 30, 5900, 'WALLET', true)
    RETURNING id INTO v_tpl_starrail;

    -- 게임 2: 원신 - 공월 축복 (누적 충전형 30일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, v_game_genshin, '공월 축복', '게임', 'INTERVAL_30', NULL, 30, 5900, 'WALLET', true)
    RETURNING id INTO v_tpl_genshin;

    -- 게임 3: 블루 아카이브 - 월간 청휘석 패키지 (매월 1일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, v_game_bluearchive, '월간 청휘석 패키지', '게임', 'MONTHLY_DAY', 1, 30, 19000, 'WALLET', true)
    RETURNING id INTO v_tpl_bluearchive;

    -- 게임 4: 명일방주 - 먼슬리 패스 (매월 10일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, v_game_arknights, '먼슬리 카드', '게임', 'MONTHLY_DAY', 10, 30, 5900, 'WALLET', true)
    RETURNING id INTO v_tpl_arknights;

    -- 일반 구독 1: 넷플릭스 프리미엄 (매월 5일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, NULL, '넷플릭스 프리미엄', '정기 구독', 'MONTHLY_DAY', 5, 30, 17000, 'WALLET', true)
    RETURNING id INTO v_tpl_netflix;

    -- 일반 구독 2: 유튜브 프리미엄 (매월 25일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, NULL, '유튜브 프리미엄', '정기 구독', 'MONTHLY_DAY', 25, 30, 14900, 'WALLET', true)
    RETURNING id INTO v_tpl_youtube;

    -- 일반 구독 3: 쿠팡 와우 멤버십 (누적 충전형 30일)
    INSERT INTO public.subscription_templates (user_id, game_id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active)
    VALUES (v_user_id, NULL, '쿠팡 와우 멤버십', '정기 구독', 'INTERVAL_30', NULL, 30, 4990, 'WALLET', true)
    RETURNING id INTO v_tpl_coupang;

    -- 7. 지출 내역 (expenses) 18건 등록 (확정 12건, 예정 4건, 취소 2건)
    -- 모든 제약 조건 준수:
    -- chk_expense_math: final_amount = original_price - discount_amount - point_discount_amount
    -- chk_expense_cancellation_kind: CANCELLED이면 cancellation_kind 필수, 아니면 NULL
    -- chk_expense_earned_points_platform: earned_points > 0이면 point_platform 필수

    -- [확정 지출: 구독 템플릿 연동]
    INSERT INTO public.expenses (user_id, game_id, template_id, billing_cycle, title, category, status, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, v_game_bluearchive, v_tpl_bluearchive, '2026-10', '월간 청휘석 패키지', '게임', 'CONFIRMED', '2026-10-01', 19000, 0, 0, 0, 0, 19000, 'WALLET', true, '10월 정기고정결제 완료'),
        (v_user_id, NULL, v_tpl_netflix, '2026-10', '넷플릭스 프리미엄', '정기 구독', 'CONFIRMED', '2026-10-05', 17000, 0, 0, 0, 0, 17000, 'WALLET', true, '넷플릭스 10월 결제'),
        (v_user_id, v_game_arknights, v_tpl_arknights, '2026-10', '먼슬리 카드', '게임', 'CONFIRMED', '2026-10-10', 5900, 0, 0, 0, 0, 5900, 'WALLET', true, '명일방주 10월 월정액');

    -- [확정 지출: 게임 결제 (스토어 포인트/포인트 적립 포함)]
    INSERT INTO public.expenses (user_id, game_id, title, category, status, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, point_platform, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, v_game_starrail, '열차보급허가증 (30일)', '게임', 'CONFIRMED', '2026-10-03', 5900, 0, 0, 0, 590, 5900, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, '구글플레이 적립 10%'),
        (v_user_id, v_game_genshin, '공월 축복 (30일)', '게임', 'CONFIRMED', '2026-10-06', 5900, 0, 0, 0, 0, 5900, NULL, 'GALAXY_STORE', true, '갤럭시스토어 결제'),
        (v_user_id, v_game_starrail, '성옥 6480개 패키지', '게임', 'CONFIRMED', '2026-10-08', 119000, 10000, 0, 0, 0, 109000, NULL, 'WALLET', true, '신규 캐릭터 픽업 과금'),
        (v_user_id, v_game_zenless, '모노크롬 패키지', '게임', 'CONFIRMED', '2026-10-11', 33000, 0, 3000, 3000, 0, 30000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, '구글 포인트 3000P 차감 결제'),
        (v_user_id, v_game_nikke, '쥬얼 패키지', '게임', 'CONFIRMED', '2026-10-12', 55000, 5000, 0, 0, 0, 50000, NULL, 'NAVER_PAY', true, '네이버페이 머니 결제');

    -- [확정 지출: 일반 생활/식비/교통]
    INSERT INTO public.expenses (user_id, title, category, status, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, '점심 식사 (초밥)', '식비', 'CONFIRMED', '2026-10-02', 15000, 0, 0, 0, 0, 15000, 'WALLET', true, '동료들과 외식'),
        (v_user_id, '카페 음료 및 디저트', '식비', 'CONFIRMED', '2026-10-04', 8500, 0, 0, 0, 0, 8500, 'WALLET', true, '카페라떼'),
        (v_user_id, '교통카드 자동충전', '교통', 'CONFIRMED', '2026-10-07', 50000, 0, 0, 0, 0, 50000, 'WALLET', true, '10월 대중교통'),
        (v_user_id, '생필품 및 간식 장보기', '생활', 'CONFIRMED', '2026-10-09', 42000, 2000, 0, 0, 0, 40000, 'WALLET', true, '마트 장보기');

    -- [예정 지출: 향후 결제 예정]
    INSERT INTO public.expenses (user_id, game_id, template_id, billing_cycle, title, category, status, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, NULL, v_tpl_youtube, '2026-10', '유튜브 프리미엄', '정기 구독', 'PLANNED', '2026-10-25', 14900, 0, 0, 0, 0, 14900, 'WALLET', true, '10월 정기 결제 예정'),
        (v_user_id, v_game_starrail, v_tpl_starrail, NULL, '열차보급허가증 갱신', '게임', 'PLANNED', '2026-10-28', 5900, 0, 0, 0, 0, 5900, 'WALLET', true, '누적 충전 만료 전 갱신 예정');

    INSERT INTO public.expenses (user_id, game_id, title, category, status, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, v_game_genshin, '기행 패스 결제 예정', '게임', 'PLANNED', '2026-10-20', 12000, 0, 0, 0, 0, 12000, 'WALLET', true, '진주 기행 해금'),
        (v_user_id, NULL, '주말 친구 모임 식비', '식비', 'PLANNED', '2026-10-24', 40000, 0, 0, 0, 0, 40000, 'WALLET', true, '저녁 약속');

    -- [취소 지출: 보존 취소된 건들]
    INSERT INTO public.expenses (user_id, game_id, title, category, status, cancellation_kind, target_date, original_price, discount_amount, point_discount_amount, used_points, earned_points, final_amount, payment_method, deduct_from_asset, memo)
    VALUES 
        (v_user_id, v_game_chaos, '충동구매 패키지 취소', '게임', 'CANCELLED', 'PLANNED_CANCEL', '2026-10-05', 33000, 0, 0, 0, 0, 33000, 'WALLET', true, '예정 결제 취소함'),
        (v_user_id, NULL, '콘서트 티켓 환불', '생활', 'CANCELLED', 'PAYMENT_REFUND', '2026-10-07', 88000, 0, 0, 0, 0, 88000, 'WALLET', true, '일정 변경으로 환불');

    -- 8. 캘린더 개인 메모 (personal_memos) 등록
    DELETE FROM public.personal_memos WHERE user_id = v_user_id;

    INSERT INTO public.personal_memos (user_id, memo_date, content)
    VALUES 
        (v_user_id, '2026-10-15', '스타레일 버전 업데이트 점검 날'),
        (v_user_id, '2026-10-20', '원신 기행 결제일 체크'),
        (v_user_id, '2026-10-25', '유튜브 프리미엄 결제일');

    RAISE NOTICE '테스트 계정(%) 더미 데이터 등록이 성공적으로 완료되었습니다.', v_user_id;
END $$;

