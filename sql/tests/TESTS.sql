-- ============================================================================
-- ChronoLedger deployed-schema DB/RPC/RLS smoke tests (rollback-only)
--
-- 실행 전제:
--   1) 운영이 아닌 전용 Supabase 테스트 프로젝트를 선택한다.
--   2) auth.users fixture 생성 및 SET ROLE authenticated/anon이 가능한
--      DB 연결 역할로 접속한다. Supabase anon/service_role API 키를 DB 비밀번호
--      대신 사용하지 않는다. 연결 문자열은 셸 환경 변수 등 안전한 경로로 전달한다.
--   3) SCHEMA.sql과 필요한 user-icons Storage bucket/policies가 먼저 배포되어
--      있어야 한다. 이 파일은 이미 배포된 스키마를 검증하며 설치하지 않는다.
--
-- PowerShell 실행 예:
--   psql "$env:SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f sql/tests/TESTS.sql
--
-- 역할/JWT:
--   DB fixture 역할: 테스트 계정/초기 row를 만들고 검증값을 읽는 privileged
--     연결 역할. 이 역할로 앱 RPC를 호출하지 않는다.
--   authenticated 사용자 A: request.jwt.claim.sub와 request.jwt.claims.sub를
--     같은 fixture UUID로 설정하고 SET LOCAL ROLE authenticated로 실행한다.
--   사용자 B: 교차 사용자 RLS 격리용 별도 auth.users fixture.
--   authenticated 관리자: JWT의 app_metadata.role=admin만 설정해 관리자 RPC
--     권한을 모의한다. 실제 Supabase Auth에서 발급한 admin JWT 테스트가 아니다.
--   anon: PUBLIC/anon 실행 권한 회수 여부를 확인한다.
--
-- 초기 데이터:
--   사용자 A/B는 임의 UUID와 example.invalid 이메일로 트랜잭션 안에서 생성한다.
--   가입 트리거로 A/B 각각 finances(0/0)와 GOOGLE_PLAY(0.10/BRONZE),
--     GALAXY_STORE(0.10/NULL) 지갑을 만든다.
--   사용자 A의 자산/기본 예산은 100,000/20,000, Google Play 포인트는 500,
--     Galaxy Store 포인트는 0으로 설정한다. 두 게임, PICKUP 일정, 예정 지출,
--     구독 템플릿은 이후 순서에서 필요한 FK/trigger fixture로 생성한다.
--
-- 실행 순서 및 기대 결과 (실제 assertion은 아래 같은 순서의 SQL 블록):
--   ID     역할/JWT               동작 및 기대 결과
--   SETUP  DB fixture 역할         auth.users A/B 생성 -> 각각 finance 0/0,
--                                  Google(BRONZE/0.10)/Galaxy(NULL/0.10) 지갑 생성.
--   FIN-01 authenticated / A       설정 RPC -> asset=100000, budget=20000.
--   WAL-00 authenticated / A       수동 보정 -> Google point=500,
--                                  MANUAL_ADJUST 원장 amount/balance_after=500.
--   WAL-01 authenticated / A       WALLET 결제(포인트 플랫폼 GOOGLE_PLAY) -> final=8900,
--                                  asset=91100, earned=floor(8900*0.10%)=8,
--                                  Google point=500-100+8=408.
--   WAL-02 authenticated / A       같은 CONFIRMED 결제 재호출 -> 거부, no mutation.
--   REF-01 authenticated / A       환불 -> asset/used points 원복, manual adjust 보존.
--   REF-02 authenticated / A       PAYMENT_REFUND 복구 시도 -> 거부.
--   ST-01  authenticated / A       Google 결제 -> earned=floor(9000*0.10%)=9;
--                                  deduct_from_asset=false는 자산 불변.
--   ST-02  authenticated / A       환불 -> 적립 9 회수, 자산 불변.
--   EXP-01 authenticated / A       예정 취소 후 restore -> PLANNED로 복구.
--   SUB-01 DB fixture + A JWT       템플릿 비활성화 -> 연결 PLANNED 회차 삭제;
--                                  재활성화 후 새 회차 INSERT 허용.
--   SUB-02 authenticated / A       월간 구독 중복 정리 RPC -> 가장 이른 PLANNED 1건 유지;
--                                  CANCELLED/CONFIRMED 보존, 타인/없는 템플릿 거부.
--   SCH-01 DB fixture 역할         PICKUP 날짜 변경 -> 연결 PLANNED expense 동기화.
--   SCH-02 DB fixture 역할         일정 날짜 변경 -> PLANNED만 동기화, CONFIRMED/CANCELLED 보존,
--                                  날짜 외 컬럼 변경은 동기화 없음.
--   REF-03 DB fixture 역할         다른 게임 ID와 일정 ID 연결 -> trigger 거부.
--   REQ-01 authenticated / A       본인 game/schedule 요청 INSERT -> PENDING 성공.
--   REQ-02 authenticated / A       다른 사용자 expense 조회/RPC 결제 및 직접 요청
--                                  상태 변경 -> 타 사용자 row 은닉/write 거부.
--   USR-01 authenticated / A       본인 users.role -> admin 변경 거부(role=user 유지),
--                                  nickname/show_unofficial_schedules 본인 수정은 성공.
--   ADM-01 authenticated / A       app_metadata.role 없는 승인 RPC -> 관리자 오류,
--                                  요청 PENDING 유지.
--   ADM-02 authenticated / A+admin game/schedule 승인·반려 -> 카탈로그/일정 생성,
--                                  요청 상태·admin memo 기록, 연결 예정 지출 동기화.
--   ADM-03 authenticated / A+admin 잘못된 game/target 일정 승인 -> 오류, 요청 PENDING,
--                                  대상 일정 값 불변.
--   R13-01 authenticated / A       타인 ID, invalid icon/oversize character request -> 거부.
--   R13-02 authenticated / A       중복/NULL/다른 게임/최대 초과 preset -> 거부.
--   R13-03 authenticated / A       슬롯 축소 후 기존 preset 유지·축소 및 캐릭터 삭제 정리.
--   R13-04 authenticated / A       비관리자 character approval/rejection RPC -> 거부·행 불변.
--   R13-05 authenticated / A+admin metadata JWT
--                                  신규 및 기존 캐릭터 request 승인 성공.
--   R13-06 DB fixture 역할         캐릭터 삭제 시 preset 배열 정리/빈 preset 삭제,
--                                  캐릭터와 preset이 남은 게임 삭제 성공.
--   R13-07 authenticated / A       custom icon path 제한 및 pending deletion 쓰기 차단.
--   R43-DB authenticated / A       max_breakthrough 초과 거부, 상한 축소 후 기존 값 유지·축소 허용.
--   R41-RLS anon                   공식 일정 SELECT 허용, 비공식 일정 행 은닉.
--   WAL-03 authenticated / A       일치하는 tier/rate 변경 성공, 불일치/음수 잔액 거부.
--   R35-01 authenticated / B       관심 일정 본인 등록·조회·삭제 성공, 중복 등록 unique_violation,
--                                  타인 user_id 등록·타인 행 조회/삭제 차단, UPDATE 권한 없음.
--   R35-02 DB fixture 역할         일정 삭제 시 관심 일정 ON DELETE CASCADE, 계정 purge 함수 정리 포함.
--   R35-03 authenticated / A       계정 삭제 대기 사용자 관심 일정 등록/조회/삭제 차단.
--   R35-04 anon                   관심 일정 SELECT/INSERT -> insufficient_privilege.
--   ACL-01 anon                   authenticated 전용 RPC 실행 -> insufficient_privilege.
--   END    DB fixture 역할         ROLLBACK 출력 -> fixture 및 데이터 변경 전부 제거.
--
-- 각 단계는 PASS 출력과 assertion으로 확인한다. 예상된 실패는 명시적으로
-- 예외를 잡고 기대 SQL 오류/상태를 검증한다. 예외를 잡지 못하거나 assertion이
-- 실패하면 ON_ERROR_STOP으로 중단되며 최종 ROLLBACK에 도달하지 않을 수 있으므로,
-- 해당 연결을 종료해 열린 트랜잭션을 rollback한 뒤 상태를 확인한다.
-- 성공 시에도 모든 fixture와 변경은 마지막 ROLLBACK으로 취소된다.
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off

BEGIN;

SELECT gen_random_uuid() AS test_user_id \gset
SELECT gen_random_uuid() AS other_user_id \gset
SELECT set_config('chronoledger.test_user_id', :'test_user_id', true);
SELECT set_config('chronoledger.other_user_id', :'other_user_id', true);
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text,
    true
);

-- Synthetic auth users are transaction-scoped. The first insert exercises the
-- auth.users initialization trigger; the second supports cross-user RLS checks.
INSERT INTO auth.users (id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data)
VALUES (
    :'test_user_id'::uuid, 'authenticated', 'authenticated',
    'codex-sqltest-' || replace(:'test_user_id', '-', '') || '@example.invalid',
    '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data)
VALUES (
    :'other_user_id'::uuid, 'authenticated', 'authenticated',
    'codex-sqltest-' || replace(:'other_user_id', '-', '') || '@example.invalid',
    '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
);

DO $$
DECLARE
    v_user UUID := current_setting('chronoledger.test_user_id')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = v_user AND total_asset = 0 AND default_budget = 0
    ) THEN
        RAISE EXCEPTION 'FAIL: auth.users trigger did not create default finances';
    END IF;
    IF (SELECT count(*) FROM public.store_wallets WHERE user_id = v_user) <> 2 THEN
        RAISE EXCEPTION 'FAIL: auth.users trigger did not create two store wallets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY'
          AND current_balance = 0 AND user_tier = 'BRONZE' AND earn_rate = 0.10
    ) OR NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GALAXY_STORE'
          AND current_balance = 0 AND (user_tier = 'GENERAL' OR user_tier IS NULL) AND earn_rate = 0.10
    ) THEN
        RAISE EXCEPTION 'FAIL: initial store wallet values are incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND total_asset = 0 AND default_budget = 0
    ) OR (
        SELECT count(*) FROM public.store_wallets
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
    ) <> 2 THEN
        RAISE EXCEPTION 'FAIL: second auth.users trigger did not create default finance/wallet rows';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND (
              current_balance <> 0 OR earn_rate <> 0.10 OR
              (platform = 'GOOGLE_PLAY' AND user_tier <> 'BRONZE') OR
              (platform = 'GALAXY_STORE' AND coalesce(user_tier, 'GENERAL') <> 'GENERAL')
          )
    ) THEN
        RAISE EXCEPTION 'FAIL: second user initial store wallet values are incorrect';
    END IF;
END;
$$;
\echo PASS: auth.users trigger creates finance row and both wallets for both fixtures

SET LOCAL ROLE authenticated;
SELECT public.set_user_finance_settings(100000, 20000);
SELECT public.adjust_wallet_balance('GOOGLE_PLAY', 500, 'rollback smoke-test seed');
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND total_asset = 100000 AND default_budget = 20000
    ) THEN
        RAISE EXCEPTION 'FAIL: finance settings RPC did not save expected asset/budget';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets AS w
        JOIN public.store_point_transactions AS t
          ON t.user_id = w.user_id AND t.platform = w.platform
        WHERE w.user_id = current_setting('chronoledger.test_user_id')::uuid
          AND w.platform = 'GOOGLE_PLAY' AND w.current_balance = 500
          AND t.transaction_type = 'MANUAL_ADJUST' AND t.amount = 500
          AND t.balance_after = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: wallet adjustment RPC did not save balance/ledger';
    END IF;
END;
$$;
\echo PASS: finance settings and manual wallet adjustment RPCs

INSERT INTO public.games (name, default_icon_url, created_by)
VALUES (
    'Codex SQL test game ' || :'test_user_id',
    'https://example.invalid/codex-sql-test.webp',
    :'test_user_id'::uuid
)
RETURNING id AS test_game_id \gset
SELECT set_config('chronoledger.test_game_id', :'test_game_id', true);

INSERT INTO public.games (name, default_icon_url, created_by)
VALUES (
    'Codex SQL test other game ' || :'other_user_id',
    'https://example.invalid/codex-sql-test-other.webp',
    :'test_user_id'::uuid
)
RETURNING id AS other_game_id \gset
SELECT set_config('chronoledger.other_game_id', :'other_game_id', true);

INSERT INTO public.game_schedules (game_id, title, schedule_type, start_date, end_date)
VALUES (
    :'test_game_id'::uuid,
    'Codex SQL test schedule',
    'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 20,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 25
)
RETURNING id AS test_schedule_id \gset
SELECT set_config('chronoledger.test_schedule_id', :'test_schedule_id', true);

INSERT INTO public.expenses (
    user_id, game_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test wallet payment', '게임',
    (now() AT TIME ZONE 'Asia/Seoul')::date,
    10000, 10000
)
RETURNING id AS wallet_payment_id \gset

SELECT set_config('chronoledger.wallet_payment_id', :'wallet_payment_id', true);
SET LOCAL ROLE authenticated;
SELECT public.process_expense_payment(
    :'wallet_payment_id'::uuid,
    10000, 1000, 100, 100,
    'GOOGLE_PLAY', 'WALLET', true,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);
RESET ROLE;

DO $$
DECLARE
    v_user UUID := auth.uid();
    v_expense UUID := current_setting('chronoledger.wallet_payment_id')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = v_expense AND status = 'CONFIRMED'
          AND final_amount = 8900 AND earned_points = 8
    ) THEN
        RAISE EXCEPTION 'FAIL: WALLET payment values or point-platform earn are incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = v_user AND total_asset = 91100
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct the final amount from assets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 408
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct used points and credit earned points';
    END IF;
END;
$$;
\echo PASS: WALLET payment with store points deducts points/assets and earns at the point-platform rate

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.process_expense_payment(
            current_setting('chronoledger.wallet_payment_id')::uuid,
            10000, 1000, 100, 100,
            'GOOGLE_PLAY', 'WALLET', true,
            (now() AT TIME ZONE 'Asia/Seoul')::date
        );
        RAISE EXCEPTION 'FAIL: already confirmed expense was paid twice';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: duplicate payment of a confirmed expense is rejected

SET LOCAL ROLE authenticated;
SELECT public.refund_expense_payment(:'wallet_payment_id'::uuid);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.wallet_payment_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PAYMENT_REFUND'
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not mark payment as non-restorable refund';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances WHERE user_id = v_user AND total_asset = 100000
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not restore assets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not restore used points';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_point_transactions
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY'
          AND transaction_type = 'MANUAL_ADJUST' AND amount = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund removed the independent manual adjustment';
    END IF;
END;
$$;
\echo PASS: refund restores ledgered payment effects and preserves manual adjustment

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.restore_cancelled_expense(
            current_setting('chronoledger.wallet_payment_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: payment refund was restored as a planned expense';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '복구 가능한 예정 취소 항목이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: payment-refunded expense cannot use planned-expense restore RPC

INSERT INTO public.expenses (
    user_id, game_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test store payment', '게임',
    (now() AT TIME ZONE 'Asia/Seoul')::date,
    10000, 10000
)
RETURNING id AS store_payment_id \gset
SELECT set_config('chronoledger.store_payment_id', :'store_payment_id', true);

SET LOCAL ROLE authenticated;
SELECT public.process_expense_payment(
    :'store_payment_id'::uuid,
    10000, 1000, 0, 0,
    'GOOGLE_PLAY', 'GOOGLE_PLAY', false,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.store_payment_id')::uuid
          AND status = 'CONFIRMED' AND final_amount = 9000 AND earned_points = 9
    ) THEN
        RAISE EXCEPTION 'FAIL: store payment did not compute expected 0.10%% earn';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 509
    ) THEN
        RAISE EXCEPTION 'FAIL: earned points were not credited';
    END IF;
END;
$$;
\echo PASS: selected Google Play payment earns floor(final amount * rate / 100)

SET LOCAL ROLE authenticated;
SELECT public.refund_expense_payment(:'store_payment_id'::uuid);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not recover the earned points';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances WHERE user_id = v_user AND total_asset = 100000
    ) THEN
        RAISE EXCEPTION 'FAIL: refund changed assets despite deduct_from_asset=false';
    END IF;
END;
$$;
\echo PASS: store refund reverses earned points and respects asset-deduction toggle

INSERT INTO public.expenses (user_id, game_id, title, category, target_date)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test planned cancellation', '기타',
    (now() AT TIME ZONE 'Asia/Seoul')::date
)
RETURNING id AS planned_cancel_id \gset
SELECT set_config('chronoledger.planned_cancel_id', :'planned_cancel_id', true);
SET LOCAL ROLE authenticated;
SELECT public.cancel_planned_expense(:'planned_cancel_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.planned_cancel_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PLANNED_CANCEL'
    ) THEN
        RAISE EXCEPTION 'FAIL: planned cancellation state is incorrect';
    END IF;
END;
$$;
SET LOCAL ROLE authenticated;
SELECT public.restore_cancelled_expense(:'planned_cancel_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.planned_cancel_id')::uuid
          AND status = 'PLANNED' AND cancellation_kind IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: planned cancellation was not restored';
    END IF;
END;
$$;
\echo PASS: planned cancellation and restoration RPCs

INSERT INTO public.subscription_templates (
    user_id, game_id, title, billing_day, default_price, payment_method, is_active
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test subscription', 1, 3000, 'WALLET', true
)
RETURNING id AS test_template_id \gset
SELECT set_config('chronoledger.test_template_id', :'test_template_id', true);

INSERT INTO public.expenses (
    user_id, game_id, template_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    'Codex SQL test subscription cycle', '정기 구독',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 1,
    3000, 3000
)
RETURNING id AS template_expense_id \gset
SELECT set_config('chronoledger.template_expense_id', :'template_expense_id', true);

UPDATE public.subscription_templates
SET is_active = false
WHERE id = :'test_template_id'::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: template deactivation did not delete its planned cycle';
    END IF;
END;
$$;
UPDATE public.subscription_templates
SET is_active = true
WHERE id = :'test_template_id'::uuid;
INSERT INTO public.expenses (
    user_id, game_id, template_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    'Codex SQL test resumed subscription cycle', '정기 구독',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 1,
    3000, 3000
)
RETURNING id AS template_expense_id \gset
SELECT set_config('chronoledger.template_expense_id', :'template_expense_id', true);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'PLANNED' AND cancellation_kind IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: reactivated template did not accept a fresh planned cycle';
    END IF;
END;
$$;
\echo PASS: template pause deletes planned cycle and resume accepts a fresh cycle

WITH target_dates AS (
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '10 days')::date AS target_date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '45 days')::date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '80 days')::date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '110 days')::date
)
INSERT INTO public.expenses (
    user_id, game_id, template_id, billing_cycle, title, category,
    status, cancellation_kind, target_date, original_price, final_amount
)
SELECT
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    to_char(target_date, 'YYYY-MM'), 'Codex SQL test dedupe cycle', '정기 구독',
    CASE WHEN row_number = 3 THEN 'CANCELLED'
         WHEN row_number = 4 THEN 'CONFIRMED'
         ELSE 'PLANNED' END,
    CASE WHEN row_number = 3 THEN 'PLANNED_CANCEL' ELSE NULL END,
    target_date, 3000, 3000
FROM (
    SELECT target_date, ROW_NUMBER() OVER (ORDER BY target_date) AS row_number
    FROM target_dates
) AS candidates;

SET LOCAL ROLE authenticated;
SELECT public.dedupe_monthly_planned_expenses(:'test_template_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'PLANNED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe did not retain exactly one planned cycle';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'PLANNED'
    ) THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe did not retain the earliest planned cycle';
    END IF;
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PLANNED_CANCEL') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe changed a cancelled cycle';
    END IF;
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'CONFIRMED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe changed a confirmed cycle';
    END IF;
END;
$$;
\echo PASS: monthly planned dedupe retains earliest plan and preserves cancelled/confirmed rows

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.dedupe_monthly_planned_expenses('00000000-0000-0000-0000-000000000000'::uuid);
        RAISE EXCEPTION 'FAIL: monthly planned dedupe accepted a template the user does not own';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '정리할 수 있는 본인 소유의 활성 월간 구독 템플릿이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: monthly planned dedupe requires an owned active template

INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, target_date,
    start_date, end_date
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule sync', '게임', s.end_date, s.start_date, s.end_date
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_expense_id \gset
SELECT set_config('chronoledger.schedule_expense_id', :'schedule_expense_id', true);

UPDATE public.game_schedules
SET start_date = start_date + 1, end_date = end_date + 1
WHERE id = :'test_schedule_id'::uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date
          AND e.end_date = s.end_date
          AND e.target_date = s.end_date
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule update did not synchronize planned expense dates';
    END IF;
END;
$$;
\echo PASS: schedule change synchronizes linked planned expense dates

INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Codex SQL test broadcast sync','BROADCAST',CURRENT_DATE,CURRENT_DATE + 1)
RETURNING id AS broadcast_schedule_id \gset
INSERT INTO public.expenses(user_id,game_id,schedule_id,title,category,target_date,start_date,end_date)
VALUES (:'test_user_id'::uuid, :'test_game_id'::uuid, :'broadcast_schedule_id'::uuid,
        'Codex SQL test broadcast expense','게임',CURRENT_DATE + 1,CURRENT_DATE,CURRENT_DATE + 1)
RETURNING id AS broadcast_expense_id \gset
SELECT set_config('chronoledger.broadcast_expense_id', :'broadcast_expense_id', true);
UPDATE public.game_schedules SET start_date=start_date + 2,end_date=end_date + 3 WHERE id=:'broadcast_schedule_id'::uuid;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.expenses e JOIN public.game_schedules s ON s.id=e.schedule_id
  WHERE e.id=current_setting('chronoledger.broadcast_expense_id')::uuid AND e.status='PLANNED'
    AND e.start_date=s.start_date AND e.end_date=s.end_date AND e.target_date=s.end_date) THEN
  RAISE EXCEPTION 'FAIL: BROADCAST date change did not synchronize planned expense';
 END IF;
END $$;
\echo PASS: BROADCAST schedule change synchronizes linked planned expense dates

-- SCH-02: 일정 날짜 변경 시 CONFIRMED/CANCELLED 지출은 보존되고 PLANNED만 동기화된다.
INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, status, target_date,
    start_date, end_date, original_price, final_amount
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule confirmed', '게임', 'CONFIRMED',
    s.start_date, s.start_date, s.end_date, 5000, 5000
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_confirmed_id \gset
SELECT set_config('chronoledger.schedule_confirmed_id', :'schedule_confirmed_id', true);

INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, status, cancellation_kind,
    target_date, start_date, end_date
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule cancelled', '게임', 'CANCELLED', 'PLANNED_CANCEL',
    s.end_date, s.start_date, s.end_date
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_cancelled_id \gset
SELECT set_config('chronoledger.schedule_cancelled_id', :'schedule_cancelled_id', true);

SELECT set_config('chronoledger.before_start', start_date::text, true),
       set_config('chronoledger.before_end', end_date::text, true)
FROM public.game_schedules
WHERE id = :'test_schedule_id'::uuid;

UPDATE public.game_schedules
SET start_date = start_date + 2, end_date = end_date + 3
WHERE id = :'test_schedule_id'::uuid;
DO $$
DECLARE
    v_before_start DATE := current_setting('chronoledger.before_start')::date;
    v_before_end DATE := current_setting('chronoledger.before_end')::date;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date AND e.end_date = s.end_date
          AND e.target_date = s.end_date
          AND s.start_date = v_before_start + 2 AND s.end_date = v_before_end + 3
    ) THEN
        RAISE EXCEPTION 'FAIL: second schedule change did not synchronize the planned expense';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.schedule_confirmed_id')::uuid
          AND status = 'CONFIRMED'
          AND start_date = v_before_start AND end_date = v_before_end
          AND target_date = v_before_start
          AND final_amount = 5000
    ) THEN
        RAISE EXCEPTION 'FAIL: CONFIRMED expense was changed by schedule sync';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.schedule_cancelled_id')::uuid
          AND status = 'CANCELLED'
          AND start_date = v_before_start AND end_date = v_before_end
          AND target_date = v_before_end
    ) THEN
        RAISE EXCEPTION 'FAIL: CANCELLED expense was changed by schedule sync';
    END IF;
END;
$$;

-- 날짜가 아닌 컬럼(title)만 변경하면 PLANNED 지출 날짜도 바뀌지 않아야 한다.
UPDATE public.expenses
SET start_date = start_date - 1, end_date = end_date - 1, target_date = target_date - 1
WHERE id = current_setting('chronoledger.schedule_expense_id')::uuid;
UPDATE public.game_schedules
SET title = 'Codex SQL test schedule renamed'
WHERE id = :'test_schedule_id'::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.start_date = s.start_date
    ) THEN
        RAISE EXCEPTION 'FAIL: non-date schedule update triggered expense sync';
    END IF;
END;
$$;
\echo PASS: schedule sync updates only PLANNED expenses and preserves CONFIRMED/CANCELLED

-- R56: a VERSION date change keeps version-pass PLANNED rows due on the new end date,
-- while other VERSION-linked PLANNED rows follow the new start date. Rolled back via savepoint.
SAVEPOINT r56_version_pass_sync;
INSERT INTO public.game_schedules (game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R56 version sync', 'VERSION', CURRENT_DATE + 10, CURRENT_DATE + 30)
RETURNING id AS r56_version_id \gset
SELECT set_config('chronoledger.r56_version_id', :'r56_version_id', true);
INSERT INTO public.expenses (user_id, game_id, schedule_id, title, category, target_date, start_date, end_date)
VALUES
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version pass', '게임', CURRENT_DATE + 30, CURRENT_DATE + 10, CURRENT_DATE + 30),
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version period start', '게임', CURRENT_DATE + 10, CURRENT_DATE + 10, CURRENT_DATE + 30),
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version single day', '게임', CURRENT_DATE + 10, CURRENT_DATE + 10, CURRENT_DATE + 10);
UPDATE public.game_schedules
SET start_date = CURRENT_DATE + 13, end_date = CURRENT_DATE + 35
WHERE id = :'r56_version_id'::uuid;
DO $$
DECLARE
    v_id UUID := current_setting('chronoledger.r56_version_id')::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version pass'
                   AND target_date = CURRENT_DATE + 35 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 version pass target_date did not follow the new end date';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version period start'
                   AND target_date = CURRENT_DATE + 13 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 start-dated VERSION expense did not follow the new start date';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version single day'
                   AND target_date = CURRENT_DATE + 13 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 single-day VERSION expense did not follow the new start date';
    END IF;
END;
$$;
-- A second move must keep the pass on the end date (its row now matches the new period).
UPDATE public.game_schedules
SET start_date = CURRENT_DATE + 15, end_date = CURRENT_DATE + 40
WHERE id = :'r56_version_id'::uuid;
DO $$
DECLARE
    v_id UUID := current_setting('chronoledger.r56_version_id')::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version pass' AND target_date = CURRENT_DATE + 40) THEN
        RAISE EXCEPTION 'FAIL: R56 version pass lost its end-date due date after a second move';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version period start' AND target_date = CURRENT_DATE + 15) THEN
        RAISE EXCEPTION 'FAIL: R56 start-dated VERSION expense drifted to the end date after a second move';
    END IF;
END;
$$;
\echo PASS: R56 VERSION date change keeps version-pass due date on the end date and others on the start date
ROLLBACK TO SAVEPOINT r56_version_pass_sync;

DO $$
DECLARE
    v_user UUID := auth.uid();
    v_game UUID := current_setting('chronoledger.other_game_id')::uuid;
    v_schedule UUID := current_setting('chronoledger.test_schedule_id')::uuid;
BEGIN
    BEGIN
        INSERT INTO public.expenses (user_id, game_id, schedule_id, title, category, target_date)
        VALUES (v_user, v_game, v_schedule, 'Codex SQL test invalid reference', '게임',
                (now() AT TIME ZONE 'Asia/Seoul')::date);
        RAISE EXCEPTION 'FAIL: mismatched game/schedule reference was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '지출 게임과 일정 게임이 일치해야 합니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
\echo PASS: invalid expense game/schedule reference is rejected

-- 사용자 요청은 authenticated 역할과 사용자 A JWT로 생성한다.
SET LOCAL ROLE authenticated;
INSERT INTO public.game_requests (user_id, name, memo)
VALUES (
    auth.uid(),
    'ChronoLedger SQL approved game ' || :'test_user_id',
    'rollback test'
)
RETURNING id AS approved_game_request_id \gset

INSERT INTO public.game_requests (user_id, name, memo)
VALUES (
    auth.uid(),
    'ChronoLedger SQL rejected game ' || :'test_user_id',
    'rollback test'
)
RETURNING id AS rejected_game_request_id \gset

-- R33 schedule kind and PICKUP-only rerun constraint coverage.
-- Direct catalog writes are fixture-role only (authenticated is blocked by RLS);
-- the savepoint discards these rows and restores the authenticated role afterwards.
SAVEPOINT r33_direct_schedule_checks;
RESET ROLE;
INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Chrono broadcast insert','BROADCAST',CURRENT_DATE,CURRENT_DATE);
INSERT INTO public.game_schedules(game_id,title,schedule_type,is_rerun,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Chrono pickup rerun','PICKUP',true,CURRENT_DATE,CURRENT_DATE);
DO $$ BEGIN
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,is_rerun,start_date,end_date)
  VALUES (current_setting('chronoledger.test_game_id')::uuid,'Invalid rerun','BROADCAST',true,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'FAIL: non-PICKUP rerun was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
\echo PASS: BROADCAST and PICKUP rerun schedules insert; non-PICKUP rerun is rejected
ROLLBACK TO SAVEPOINT r33_direct_schedule_checks;

INSERT INTO public.schedule_requests (
    user_id, game_id, title, schedule_type, start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid,
    'Chrono test schedule addition', 'BROADCAST',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 40,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 45,
    'rollback test'
)
RETURNING id AS schedule_add_request_id \gset

INSERT INTO public.schedule_requests (
    user_id, game_id, target_schedule_id, title, schedule_type,
    start_date, end_date, memo, is_rerun
)
VALUES (
    auth.uid(), :'test_game_id'::uuid, :'test_schedule_id'::uuid,
    'Chrono test schedule edit', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 50,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 55,
    'rollback test', true
)
RETURNING id AS schedule_edit_request_id \gset

INSERT INTO public.schedule_requests (
    user_id, game_id, title, schedule_type, start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid,
    'Chrono test schedule rejection', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 60,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 65,
    'rollback test'
)
RETURNING id AS schedule_reject_request_id \gset

-- Existing target belongs to test_game_id, so approving this mismatched
-- request must fail atomically and leave both request and schedule unchanged.
INSERT INTO public.schedule_requests (
    user_id, game_id, target_schedule_id, title, schedule_type,
    start_date, end_date, memo
)
VALUES (
    auth.uid(), :'other_game_id'::uuid, :'test_schedule_id'::uuid,
    'Chrono test invalid schedule target', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 70,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 75,
    'rollback test'
)
RETURNING id AS schedule_invalid_request_id \gset
RESET ROLE;

SELECT set_config(
    'chronoledger.approved_game_request_id',
    :'approved_game_request_id',
    true
);
SELECT set_config(
    'chronoledger.rejected_game_request_id',
    :'rejected_game_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_add_request_id',
    :'schedule_add_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_edit_request_id',
    :'schedule_edit_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_reject_request_id',
    :'schedule_reject_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_invalid_request_id',
    :'schedule_invalid_request_id',
    true
);
\echo PASS: authenticated user can submit own pending game and schedule requests

-- The second synthetic account's row must not be visible to the first account.
INSERT INTO public.expenses (user_id, title, category, target_date)
VALUES (
    :'other_user_id'::uuid,
    'Codex SQL test foreign expense ' || :'other_user_id',
    '기타', (now() AT TIME ZONE 'Asia/Seoul')::date
)
RETURNING id AS other_user_expense_id \gset
SELECT set_config(
    'chronoledger.other_user_expense_id',
    :'other_user_expense_id',
    true
);

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_other UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_id UUID := current_setting('chronoledger.planned_cancel_id')::uuid;
    v_rows INTEGER;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'FAIL: authenticated test JWT did not resolve auth.uid()';
    END IF;
    IF EXISTS (SELECT 1 FROM public.expenses WHERE user_id = v_other) THEN
        RAISE EXCEPTION 'FAIL: RLS exposed a foreign expense';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = v_id AND user_id = v_user) THEN
        RAISE EXCEPTION 'FAIL: RLS hid an owned expense';
    END IF;

    BEGIN
        PERFORM public.process_expense_payment(
            current_setting('chronoledger.other_user_expense_id')::uuid,
            10000, 0, 0, 0,
            NULL, 'WALLET', true,
            (now() AT TIME ZONE 'Asia/Seoul')::date
        );
        RAISE EXCEPTION 'FAIL: user A paid user B expense through RPC';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.' THEN
            RAISE;
        END IF;
    END;

    BEGIN
        UPDATE public.store_wallets
        SET current_balance = current_balance + 1
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY';
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: direct wallet update bypassed RPC-only policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        UPDATE public.expenses SET status = 'CONFIRMED'
        WHERE id = v_id AND user_id = v_user AND status = 'PLANNED';
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: direct planned expense confirmation bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        DELETE FROM public.expenses WHERE id = v_id AND user_id = v_user;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: expense physical deletion bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = v_id AND user_id = v_user) THEN
        RAISE EXCEPTION 'FAIL: direct delete removed planned expense';
    END IF;

    BEGIN
        DELETE FROM public.subscription_templates
        WHERE id = current_setting('chronoledger.test_template_id')::uuid
          AND user_id = v_user;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: subscription template physical deletion bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.subscription_templates
        WHERE id = current_setting('chronoledger.test_template_id')::uuid
          AND user_id = v_user
    ) THEN
        RAISE EXCEPTION 'FAIL: direct delete removed subscription template';
    END IF;

    BEGIN
        UPDATE public.game_requests
        SET request_status = 'APPROVED'
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: user directly changed game request status';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'FAIL: direct request update changed its pending status';
    END IF;
END;
$$;
\echo PASS: RLS isolates users and blocks cross-user RPC/direct wallet/expense/template/request writes

RESET ROLE;

-- 일반 사용자는 본인 users.role을 바꿀 수 없고, 그 외 프로필 컬럼은 수정할 수 있다.
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INTEGER;
BEGIN
    BEGIN
        UPDATE public.users SET role = 'admin' WHERE id = auth.uid();
        RAISE EXCEPTION 'FAIL: user promoted own role to admin';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLERRM <> '사용자 역할은 변경할 수 없습니다.' THEN
            RAISE;
        END IF;
    END;

    UPDATE public.users
    SET nickname = 'codex-sqltest-renamed', show_unofficial_schedules = true
    WHERE id = auth.uid();
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'FAIL: user could not update own nickname/schedule preference';
    END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = current_setting('chronoledger.test_user_id')::uuid
          AND role = 'user' AND nickname = 'codex-sqltest-renamed'
          AND show_unofficial_schedules = true
    ) THEN
        RAISE EXCEPTION 'FAIL: users role guard or own profile update state is incorrect';
    END IF;
END;
$$;
\echo PASS: users cannot change own role but can update own profile preferences

-- 일반 사용자 JWT로 관리자 RPC를 호출하면 권한 오류가 나고 상태는 유지된다.
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.approve_game_request(
            current_setting('chronoledger.approved_game_request_id')::uuid,
            'https://example.invalid/approved-game.webp'
        );
        RAISE EXCEPTION 'FAIL: non-admin approved a game request';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '관리자 권한이 필요합니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'PENDING' AND approved_game_id IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: rejected non-admin approval changed the request';
    END IF;
END;
$$;
\echo PASS: non-admin approval is denied without changing request state

-- 관리자 권한은 JWT app_metadata claim으로만 모의한다. 사용자 row 자체는
-- fixture 사용자 A이며, 이 테스트는 실제 Auth-issued admin token을 대체하지 않는다.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', :'test_user_id',
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SET LOCAL ROLE authenticated;
SELECT public.approve_game_request(
    :'approved_game_request_id'::uuid,
    'https://example.invalid/approved-game.webp'
) AS approved_game_id \gset
SELECT set_config('chronoledger.approved_game_id', :'approved_game_id', true);
SELECT public.reject_game_request(
    :'rejected_game_request_id'::uuid,
    'duplicate proposal'
);
SELECT public.approve_schedule_request(:'schedule_add_request_id'::uuid);
SELECT public.approve_schedule_request(:'schedule_edit_request_id'::uuid);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE title='Chrono test schedule addition' AND schedule_type='BROADCAST' AND is_rerun=false) THEN RAISE EXCEPTION 'FAIL: approved BROADCAST schedule fields were not copied'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE id=current_setting('chronoledger.test_schedule_id')::uuid AND schedule_type='PICKUP' AND is_rerun=true) THEN RAISE EXCEPTION 'FAIL: approved PICKUP rerun fields were not copied'; END IF;
END $$;
SELECT public.reject_schedule_request(
    :'schedule_reject_request_id'::uuid,
    'insufficient detail'
);

DO $$
BEGIN
    BEGIN
        PERFORM public.approve_schedule_request(
            current_setting('chronoledger.schedule_invalid_request_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: mismatched schedule/game target was approved';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '요청 대상 일정이 없거나 게임이 일치하지 않습니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'APPROVED'
          AND approved_game_id = current_setting('chronoledger.approved_game_id')::uuid
    ) OR NOT EXISTS (
        SELECT 1 FROM public.games
        WHERE id = current_setting('chronoledger.approved_game_id')::uuid
          AND created_by = current_setting('chronoledger.test_user_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: game approval did not atomically create/link the catalog row';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.rejected_game_request_id')::uuid
          AND request_status = 'REJECTED' AND admin_memo = 'duplicate proposal'
    ) THEN
        RAISE EXCEPTION 'FAIL: game request rejection state/memo is incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_add_request_id')::uuid
          AND request_status = 'APPROVED'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.game_schedules
        WHERE game_id = current_setting('chronoledger.test_game_id')::uuid
          AND title = 'Chrono test schedule addition'
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule addition approval did not create schedule';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_edit_request_id')::uuid
          AND request_status = 'APPROVED'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date
          AND e.end_date = s.end_date
          AND e.target_date = s.end_date
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule edit was not approved/synchronized atomically';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_reject_request_id')::uuid
          AND request_status = 'REJECTED' AND admin_memo = 'insufficient detail'
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule request rejection state/memo is incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_invalid_request_id')::uuid
          AND request_status = 'PENDING'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.game_schedules
        WHERE id = current_setting('chronoledger.test_schedule_id')::uuid
          AND title = 'Chrono test schedule edit'
          AND start_date = (now() AT TIME ZONE 'Asia/Seoul')::date + 50
          AND end_date = (now() AT TIME ZONE 'Asia/Seoul')::date + 55
    ) THEN
        RAISE EXCEPTION 'FAIL: failed schedule approval changed request or target state';
    END IF;
END;
$$;
\echo PASS: admin request approval/rejection and invalid-target atomicity

SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text,
    true
);
SET LOCAL ROLE authenticated;
SELECT public.update_store_wallet_settings('GOOGLE_PLAY', 'SILVER', 0.11);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = auth.uid() AND platform = 'GOOGLE_PLAY'
          AND user_tier = 'SILVER' AND earn_rate = 0.11
    ) THEN
        RAISE EXCEPTION 'FAIL: valid Google Play tier/rate was not saved';
    END IF;

    BEGIN
        PERFORM public.update_store_wallet_settings('GOOGLE_PLAY', 'SILVER', 0.10);
        RAISE EXCEPTION 'FAIL: invalid Google Play tier/rate pair was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Google Play 등급 또는 공식 적립률이 올바르지 않습니다.' THEN
            RAISE;
        END IF;
    END;

    BEGIN
        PERFORM public.adjust_wallet_balance('GOOGLE_PLAY', -1, 'invalid test');
        RAISE EXCEPTION 'FAIL: negative wallet target balance was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '플랫폼 또는 목표 잔액이 올바르지 않습니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: wallet settings accept matching tier/rate and reject invalid values

-- R13 character catalog, requests, owned roster, and presets.
INSERT INTO public.games (name, default_icon_url, max_preset_slots, classification_schema)
VALUES ('R13 smoke game', 'https://example.invalid/game.webp', 4,
        '{"rarities":["5★","4★"],"axes":[{"key":"element","label":"속성","options":["불","물"]}]}'::jsonb)
RETURNING id AS r13_game_id \gset
SELECT set_config('chronoledger.r13_game_id', :'r13_game_id', true);
INSERT INTO public.games (name, default_icon_url) VALUES ('R13 other game', 'https://example.invalid/other.webp') RETURNING id AS r13_other_game_id \gset
SELECT set_config('chronoledger.r13_other_game_id', :'r13_other_game_id', true);
UPDATE public.games SET max_preset_slots = 1 WHERE id = :'r13_other_game_id';
INSERT INTO public.games (name, default_icon_url) VALUES ('R13 delete game', 'https://example.invalid/delete.webp') RETURNING id AS r13_delete_game_id \gset
SELECT set_config('chronoledger.r13_delete_game_id', :'r13_delete_game_id', true);

INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes) VALUES (:'r13_game_id', 'R13 character 1', 'https://example.invalid/c1.webp', '5★', '{"element":"불"}') RETURNING id AS r13_character_1 \gset
SELECT set_config('chronoledger.r13_character_1_id', :'r13_character_1', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes) VALUES (:'r13_game_id', 'R13 character 2', 'https://example.invalid/c2.webp', '4★', '{"element":"물"}') RETURNING id AS r13_character_2 \gset
SELECT set_config('chronoledger.r13_character_2_id', :'r13_character_2', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 3', 'https://example.invalid/c3.webp') RETURNING id AS r13_character_3 \gset
SELECT set_config('chronoledger.r13_character_3_id', :'r13_character_3', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 4', 'https://example.invalid/c4.webp') RETURNING id AS r13_character_4 \gset
SELECT set_config('chronoledger.r13_character_4_id', :'r13_character_4', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 5', 'https://example.invalid/c5.webp') RETURNING id AS r13_character_5 \gset
SELECT set_config('chronoledger.r13_character_5_id', :'r13_character_5', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_other_game_id', 'R13 other character', 'https://example.invalid/other-char.webp') RETURNING id AS r13_other_character \gset
SELECT set_config('chronoledger.r13_other_character_id', :'r13_other_character', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_other_game_id', 'R13 other character 2', 'https://example.invalid/other-char-2.webp') RETURNING id AS r13_other_character_2 \gset
SELECT set_config('chronoledger.r13_other_character_2_id', :'r13_other_character_2', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_delete_game_id', 'R13 delete character', 'https://example.invalid/delete-char.webp') RETURNING id AS r13_delete_character \gset
SELECT set_config('chronoledger.r13_delete_character_id', :'r13_delete_character', true);

INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url, rarity, attributes)
VALUES (:'test_user_id', :'r13_game_id', 'R13 new request', 'https://example.invalid/request.webp', '5★', '{"element":"불"}') RETURNING id AS r13_new_request \gset
SELECT set_config('chronoledger.r13_new_request_id', :'r13_new_request', true);
INSERT INTO public.character_requests(user_id, game_id, target_character_id, name, rarity, attributes)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_1', 'R13 renamed character', '4★', '{"element":"물"}') RETURNING id AS r13_update_request \gset
SELECT set_config('chronoledger.r13_update_request_id', :'r13_update_request', true);

SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name) VALUES (current_setting('chronoledger.other_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid, 'forged owner');
        RAISE EXCEPTION 'FAIL: character request accepted another user_id';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'bad icon', 'http://example.invalid/icon.png');
        RAISE EXCEPTION 'FAIL: character request accepted invalid icon';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'oversized icon', repeat('x', 150001));
        RAISE EXCEPTION 'FAIL: character request accepted oversized icon';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, admin_memo) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'forged admin memo', 'forged');
        RAISE EXCEPTION 'FAIL: character request accepted admin_memo';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM public.approve_character_request(current_setting('chronoledger.r13_new_request_id')::uuid);
        RAISE EXCEPTION 'FAIL: non-admin approved character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM public.reject_character_request(current_setting('chronoledger.r13_update_request_id')::uuid, 'forbidden');
        RAISE EXCEPTION 'FAIL: non-admin rejected character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_new_request_id')::uuid) <> 'PENDING'
       OR (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_update_request_id')::uuid) <> 'PENDING'
       OR (SELECT name FROM public.game_characters WHERE id = current_setting('chronoledger.r13_character_1_id')::uuid) <> 'R13 character 1' THEN
        RAISE EXCEPTION 'FAIL: non-admin character RPC changed data';
    END IF;
END $$;
\echo PASS: character request constraints and null-safe non-admin RPC denial

SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id, custom_icon_path) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_1_id')::uuid, 'wrong/path.webp');
        RAISE EXCEPTION 'FAIL: invalid custom icon path accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'duplicate', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: duplicate preset characters accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'null member', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, NULL]::uuid[]);
        RAISE EXCEPTION 'FAIL: NULL preset member accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'wrong game', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_other_character_id')::uuid]);
        RAISE EXCEPTION 'FAIL: cross-game preset accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'too many', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid, current_setting('chronoledger.r13_character_3_id')::uuid, current_setting('chronoledger.r13_character_4_id')::uuid, current_setting('chronoledger.r13_character_5_id')::uuid]);
        RAISE EXCEPTION 'FAIL: over-limit preset accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

INSERT INTO public.user_characters(user_id, game_id, character_id, custom_icon_path)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_1', :'test_user_id' || '/characters/' || :'r13_character_1' || '.webp');
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'over-limit preserved', ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid, :'r13_character_3'::uuid, :'r13_character_4'::uuid]) RETURNING id AS r13_over_limit_preset \gset
SELECT set_config('chronoledger.r13_over_limit_preset_id', :'r13_over_limit_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'game change slot guard', ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid]) RETURNING id AS r13_game_change_preset \gset
SELECT set_config('chronoledger.r13_game_change_preset_id', :'r13_game_change_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'deleted when empty', ARRAY[:'r13_character_5'::uuid]) RETURNING id AS r13_empty_preset \gset
SELECT set_config('chronoledger.r13_empty_preset_id', :'r13_empty_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_delete_game_id', 'cascade preset', ARRAY[:'r13_delete_character'::uuid]) RETURNING id AS r13_delete_preset \gset
SELECT set_config('chronoledger.r13_delete_preset_id', :'r13_delete_preset', true);
UPDATE public.games SET max_preset_slots = 2 WHERE id = :'r13_game_id';
DELETE FROM public.game_characters WHERE id = :'r13_character_4'::uuid;
DELETE FROM public.game_characters WHERE id = :'r13_character_5'::uuid;
DO $$ BEGIN
    IF (SELECT cardinality(character_ids) FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_over_limit_preset_id')::uuid) <> 3 THEN RAISE EXCEPTION 'FAIL: character delete did not shrink over-limit preset'; END IF;
    IF EXISTS (SELECT 1 FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_empty_preset_id')::uuid) THEN RAISE EXCEPTION 'FAIL: empty preset was not deleted'; END IF;
END $$;
DO $$ BEGIN
    BEGIN
        UPDATE public.user_character_presets
        SET game_id = current_setting('chronoledger.r13_other_game_id')::uuid,
            character_ids = ARRAY[
                current_setting('chronoledger.r13_other_character_id')::uuid,
                current_setting('chronoledger.r13_other_character_2_id')::uuid
            ]
        WHERE id = current_setting('chronoledger.r13_game_change_preset_id')::uuid;
        RAISE EXCEPTION 'FAIL: game change bypassed target slot limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
UPDATE public.user_character_presets SET character_ids = ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid] WHERE id = :'r13_over_limit_preset';
\echo PASS: preset limits, non-destructive slot reduction, game-change slot cap, and character-delete cleanup

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
SET LOCAL ROLE authenticated;
SELECT public.approve_character_request(:'r13_new_request'::uuid);
SELECT public.approve_character_request(:'r13_update_request'::uuid);
RESET ROLE;
DO $$ BEGIN
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_new_request_id')::uuid) <> 'APPROVED'
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND name = 'R13 new request' AND rarity = '5★') THEN RAISE EXCEPTION 'FAIL: admin could not approve new character'; END IF;
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_update_request_id')::uuid) <> 'APPROVED'
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE id = current_setting('chronoledger.r13_character_1_id')::uuid AND name = 'R13 renamed character' AND default_icon_url = 'https://example.invalid/c1.webp') THEN RAISE EXCEPTION 'FAIL: admin update did not preserve omitted icon'; END IF;
END $$;
\echo PASS: admin metadata JWT approves new and existing character requests

DELETE FROM public.games WHERE id = :'r13_delete_game_id'::uuid;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_delete_preset_id')::uuid)
       OR EXISTS (SELECT 1 FROM public.game_characters WHERE id = current_setting('chronoledger.r13_delete_character_id')::uuid) THEN RAISE EXCEPTION 'FAIL: game deletion did not cascade characters and presets'; END IF;
END $$;
\echo PASS: deleting game with characters and presets succeeds

-- 게임별 최대 돌파 상한 검증 및 상한 축소 시 기존 행 보존 동작을 확인한다.
UPDATE public.games SET max_breakthrough = 2 WHERE id = current_setting('chronoledger.r13_game_id')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id, breakthrough_level)
        VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_3_id')::uuid, 3);
        RAISE EXCEPTION 'FAIL: breakthrough insert exceeded game limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
INSERT INTO public.user_characters(user_id, game_id, character_id, breakthrough_level)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_3', 2);
UPDATE public.games SET max_breakthrough = 1 WHERE id = :'r13_game_id';
SET LOCAL ROLE authenticated;
UPDATE public.user_characters SET is_favorite = true WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
UPDATE public.user_characters SET breakthrough_level = 1 WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
DO $$ BEGIN
    BEGIN
        UPDATE public.user_characters SET breakthrough_level = 2
        WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
        RAISE EXCEPTION 'FAIL: breakthrough increase exceeded reduced game limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF (SELECT breakthrough_level FROM public.user_characters WHERE user_id = current_setting('chronoledger.test_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid) <> 1
       OR NOT (SELECT is_favorite FROM public.user_characters WHERE user_id = current_setting('chronoledger.test_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid) THEN
        RAISE EXCEPTION 'FAIL: breakthrough reduction/favorite update was not preserved';
    END IF;
END $$;
\echo PASS: game breakthrough cap rejects excess values and preserves existing values on cap reduction

-- R63 favorite sections, ownership guard, append ordering, and atomic reorder.
RESET ROLE;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.user_characters(user_id, game_id, character_id, is_owned, is_favorite)
VALUES (:'other_user_id', :'r13_game_id', :'r13_character_1', true, true),
       (:'other_user_id', :'r13_game_id', :'r13_character_2', true, true),
       (:'other_user_id', :'r13_game_id', :'r13_character_3', false, true);
DO $$
DECLARE v_first INTEGER; v_second INTEGER; v_third INTEGER;
BEGIN
    SELECT favorite_sort_order INTO v_first FROM public.user_characters
    WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_1_id')::uuid;
    SELECT favorite_sort_order INTO v_second FROM public.user_characters
    WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_2_id')::uuid;
    IF v_first <> 1 OR v_second <> 2 OR EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid AND is_favorite
    ) THEN RAISE EXCEPTION 'FAIL: R63 initial favorite ordering or unowned guard'; END IF;
END $$;
UPDATE public.user_characters SET is_owned = true, is_favorite = true
WHERE user_id = :'other_user_id' AND character_id = :'r13_character_3';
SELECT public.reorder_favorite_characters(
    :'r13_game_id',
    ARRAY[:'r13_character_2'::uuid, :'r13_character_1'::uuid, :'r13_character_3'::uuid]
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND is_favorite AND favorite_sort_order = 1
          AND character_id = current_setting('chronoledger.r13_character_2_id')::uuid
    ) OR NOT EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid
          AND favorite_sort_order = 3
    ) THEN RAISE EXCEPTION 'FAIL: R63 reorder did not persist atomically'; END IF;
    BEGIN
        PERFORM public.reorder_favorite_characters(current_setting('chronoledger.r13_game_id')::uuid, ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: R63 incomplete favorite set was accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
\echo PASS: R63 favorite ownership guard, append ordering, and reorder RPC

INSERT INTO public.account_deletion_requests(user_id, status_token_hash, status) VALUES (:'test_user_id', repeat('a', 64), 'PENDING');
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'blocked');
        RAISE EXCEPTION 'FAIL: pending user inserted character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid);
        RAISE EXCEPTION 'FAIL: pending user inserted user character';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'blocked', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: pending user inserted preset';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
\echo PASS: pending deletion user is blocked from writes to all R13 personal tables

INSERT INTO public.game_schedules(game_id, title, schedule_type, is_official, start_date, end_date)
VALUES (:'r13_game_id', 'R41 official guest schedule', 'VERSION', true, CURRENT_DATE, CURRENT_DATE),
       (:'r13_game_id', 'R41 unofficial guest schedule', 'CONTENTS', false, CURRENT_DATE, CURRENT_DATE);

-- SECURITY DEFINER RPC execute 권한은 authenticated에만 있어야 한다.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'anon')::text,
    true
);
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = current_setting('chronoledger.r13_game_id')::uuid AND status = 'APPROVED')
       OR (SELECT count(*) FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title LIKE 'R41 %') <> 1
       OR NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title = 'R41 official guest schedule')
       OR EXISTS (SELECT 1 FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title = 'R41 unofficial guest schedule') THEN
        RAISE EXCEPTION 'FAIL: anon schedule policy did not expose official schedules only';
    END IF;
END $$;
\echo PASS: anon can read approved games and official schedules but not unofficial schedules

-- R52 + Amendment A1: template validation, pickup references, deletion cleanup, pickup-only catalog characters, user proposals, approval and anon boundary.
RESET ROLE;
DO $$
DECLARE
 v_game UUID := current_setting('chronoledger.r13_game_id')::uuid;
 v_other_game UUID := current_setting('chronoledger.r13_other_game_id')::uuid;
 v_user UUID := current_setting('chronoledger.other_user_id')::uuid;
 v_pickup UUID; v_guard UUID; v_canonical UUID := current_setting('chronoledger.r13_character_1_id')::uuid;
 v_cleanup_character UUID; v_approved_req UUID;
 v_request UUID; v_schedule UUID; v_ids UUID[]; v_many UUID[]; v_before INTEGER;
BEGIN
 UPDATE public.games SET classification_schema='{"character_label":"Operative","rarities":["5★"],"axes":[{"key":"element","label":"속성","options":["불"]}]}'::jsonb WHERE id=v_game;
 IF NOT public.is_valid_classification_schema('{"rarities":[],"axes":[]}'::jsonb)
 OR NOT public.is_valid_classification_schema('{"character_label":"Operative","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":"","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":"123456789012345678901","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":7,"rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"rarities":[],"axes":[{"key":"a","label":"a","options":["1"]},{"key":"b","label":"b","options":["1"]},{"key":"c","label":"c","options":["1"]}]}'::jsonb)
 THEN RAISE EXCEPTION 'FAIL: character template validation regression'; END IF;

 v_ids := ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid];
 INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_game,'R52 pickup characters','PICKUP',v_ids,CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_schedule;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 non pickup','VERSION',v_ids,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 bad character game','PICKUP',ARRAY[current_setting('chronoledger.r13_other_character_id')::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_CROSS_GAME_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_CROSS_GAME_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 duplicate characters','PICKUP',ARRAY[v_ids[1],v_ids[1]],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_DUPLICATE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_DUPLICATE_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 null character ID','PICKUP',ARRAY[v_ids[1],NULL]::uuid[],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_NULL_ID_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_NULL_ID_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 missing character ID','PICKUP',ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_MISSING_ID_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_MISSING_ID_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_user,v_game,'R52 request non pickup','VERSION',v_ids,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_REQUEST_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_user,v_game,'R52 request cross game','PICKUP',ARRAY[current_setting('chronoledger.r13_other_character_id')::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_REQUEST_CROSS_GAME_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_REQUEST_CROSS_GAME_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;

 INSERT INTO public.game_characters(game_id,name,default_icon_url)
 SELECT v_game,'R52 many '||n,'https://example.invalid/extra.webp' FROM generate_series(1,9) n;
 SELECT array_agg(id) INTO v_many FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 many %';
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 too many characters','PICKUP',v_many,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_OVER_EIGHT_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 DELETE FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 many %';

 -- Deletion cleanup removes deleted IDs from schedules and PENDING requests while keeping APPROVED requests intact.
 INSERT INTO public.game_characters(game_id,name,default_icon_url)
 VALUES(v_game,'R52 cleanup character','https://example.invalid/cleanup.webp') RETURNING id INTO v_cleanup_character;
 INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_game,'R52 cleanup schedule','PICKUP',ARRAY[v_cleanup_character],CURRENT_DATE,CURRENT_DATE);
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_user,v_game,'R52 cleanup pending request','PICKUP',ARRAY[v_cleanup_character],CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_request;
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,request_status,start_date,end_date)
 VALUES(v_user,v_game,'R52 cleanup approved request','PICKUP',ARRAY[v_cleanup_character],'APPROVED',CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_approved_req;
 DELETE FROM public.game_characters WHERE id=v_cleanup_character;
 IF NOT EXISTS(SELECT 1 FROM public.game_schedules WHERE title='R52 cleanup schedule' AND cardinality(pickup_character_ids)=0) THEN
  RAISE EXCEPTION 'FAIL: character deletion did not clean schedule references';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schedule_requests WHERE id=v_request AND cardinality(pickup_character_ids)=0) THEN
  RAISE EXCEPTION 'FAIL: character deletion did not clean pending request references';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schedule_requests WHERE id=v_approved_req AND cardinality(pickup_character_ids)=1) THEN
  RAISE EXCEPTION 'FAIL: character deletion mutated non-PENDING request history';
 END IF;

 INSERT INTO public.game_characters(game_id,name,default_icon_url,is_pickup_only)
 VALUES(v_game,'R52 iconless pickup',NULL,true) RETURNING id INTO v_pickup;
 BEGIN
  INSERT INTO public.user_characters(user_id,game_id,character_id) VALUES(v_user,v_game,v_pickup);
  RAISE EXCEPTION 'R52_EXPECTED_USER_CHARACTER_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_USER_CHARACTER_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.user_character_presets(user_id,game_id,title,character_ids) VALUES(v_user,v_game,'R52 pickup preset',ARRAY[v_pickup]);
  RAISE EXCEPTION 'R52_EXPECTED_PRESET_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_PRESET_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 INSERT INTO public.character_requests(user_id,game_id,target_character_id,name)
 VALUES(v_user,v_game,v_canonical,'R52 target guard') RETURNING id INTO v_request;
 BEGIN
  UPDATE public.character_requests SET target_character_id=v_pickup WHERE id=v_request;
  RAISE EXCEPTION 'R52_EXPECTED_TARGET_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_TARGET_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 INSERT INTO public.game_characters(game_id,name,default_icon_url) VALUES(v_game,'R52 downgrade guard','https://example.invalid/guard.webp') RETURNING id INTO v_guard;
 INSERT INTO public.user_characters(user_id,game_id,character_id) VALUES(v_user,v_game,v_guard);
 BEGIN
  UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
  RAISE EXCEPTION 'R52_EXPECTED_DOWNGRADE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_DOWNGRADE_REJECTION' THEN RAISE; ELSIF SQLERRM <> '사용자 보유 또는 프리셋에서 참조 중인 정식 캐릭터는 픽업 전용으로 변경할 수 없습니다.' THEN RAISE; END IF; END;
 DELETE FROM public.user_characters WHERE user_id=v_user AND character_id=v_guard;
 INSERT INTO public.user_character_presets(user_id,game_id,title,character_ids) VALUES(v_user,v_game,'R52 downgrade preset',ARRAY[v_guard]);
 BEGIN
  UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
  RAISE EXCEPTION 'R52_EXPECTED_PRESET_DOWNGRADE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_PRESET_DOWNGRADE_REJECTION' THEN RAISE; ELSIF SQLERRM <> '사용자 보유 또는 프리셋에서 참조 중인 정식 캐릭터는 픽업 전용으로 변경할 수 없습니다.' THEN RAISE; END IF; END;
 DELETE FROM public.user_character_presets WHERE user_id=v_user AND title='R52 downgrade preset';
 UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
 UPDATE public.game_characters SET is_pickup_only=false WHERE id=v_guard;
 IF NOT public.is_valid_pickup_new_characters('[{"name":" 신규 ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters('[{"name":" ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters(jsonb_build_array(jsonb_build_object('name',repeat('x',101),'icon_url',NULL)))
 OR public.is_valid_pickup_new_characters('[{"name":"dup","icon_url":null},{"name":" dup ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters('[{"name":"external","icon_url":"https://example.invalid/a.webp"}]'::jsonb)
 OR public.is_valid_pickup_new_characters(jsonb_build_array(jsonb_build_object('name','large','icon_url','data:image/webp;base64,'||repeat('A',150001))))
 THEN RAISE EXCEPTION 'FAIL: pickup proposal validation accepted invalid data'; END IF;
 INSERT INTO public.game_characters(game_id,name,default_icon_url) SELECT v_game,'R52 count '||n,'https://example.invalid/count.webp' FROM generate_series(1,8) n;
 SELECT array_agg(id) INTO v_ids FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 count %';
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
  VALUES(v_user,v_game,'R52 combined limit','PICKUP',v_ids,'[{"name":"ninth","icon_url":null}]',CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_NINE_CHARACTER_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_new_characters,start_date,end_date)
  VALUES(v_user,v_game,'R52 invalid non-pickup proposal','VERSION','[{"name":"x","icon_url":null}]',CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 v_ids := ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid,current_setting('chronoledger.r13_character_2_id')::uuid];
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
 VALUES(v_user,v_game,'R52 proposal approval','PICKUP',ARRAY[v_ids[1]],'[ {"name":"R52 proposed no icon","icon_url":null}, {"name":"R13 character 2","icon_url":null} ]',CURRENT_DATE,CURRENT_DATE)
 RETURNING id INTO v_request;
 PERFORM set_config('chronoledger.r52_approval_request',v_request::text,true);
 INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
 VALUES(v_game,'R52 edit target','PICKUP',CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_schedule;
 PERFORM set_config('chronoledger.r52_edit_target',v_schedule::text,true);
 INSERT INTO public.schedule_requests(user_id,game_id,target_schedule_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_user,v_game,v_schedule,'R52 edited pickup','PICKUP',ARRAY[v_ids[2]],CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_request;
 PERFORM set_config('chronoledger.r52_edit_request',v_request::text,true);
END $$;

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id','role','authenticated','app_metadata',jsonb_build_object('role','admin'))::text,true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
SELECT public.approve_schedule_request(current_setting('chronoledger.r52_approval_request')::uuid);
SELECT public.approve_schedule_request(current_setting('chronoledger.r52_edit_request')::uuid);
DO $$
DECLARE v_game UUID := current_setting('chronoledger.r13_game_id')::uuid; v_new UUID; v_schedule UUID; v_result_ids UUID[];
BEGIN
 SELECT id INTO v_new FROM public.game_characters WHERE game_id=v_game AND name='R52 proposed no icon';
 IF v_new IS NULL OR (SELECT is_pickup_only OR default_icon_url IS NOT NULL FROM public.game_characters WHERE id=v_new) IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: proposal was not created as iconless pickup-only'; END IF;
 SELECT id,pickup_character_ids INTO v_schedule,v_result_ids FROM public.game_schedules WHERE title='R52 proposal approval';
 IF cardinality(v_result_ids)<>3 OR v_result_ids[1]<>current_setting('chronoledger.r13_character_1_id')::uuid OR v_result_ids[2]<>(SELECT id FROM public.game_characters WHERE game_id=v_game AND name='R52 proposed no icon') OR v_result_ids[3]<>current_setting('chronoledger.r13_character_2_id')::uuid THEN RAISE EXCEPTION 'FAIL: approval did not preserve selection/proposal order and reuse existing character'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.game_schedules WHERE id=current_setting('chronoledger.r52_edit_target')::uuid AND title='R52 edited pickup' AND pickup_character_ids=ARRAY[current_setting('chronoledger.r13_character_2_id')::uuid]) THEN RAISE EXCEPTION 'FAIL: edit approval did not copy pickup character references'; END IF;
END $$;

RESET ROLE;
DO $$
DECLARE v_game UUID := current_setting('chronoledger.r13_game_id')::uuid; v_user UUID := current_setting('chronoledger.other_user_id')::uuid; v_ids UUID[]; v_req UUID; v_new_name TEXT := 'R52 rollback proposal';
BEGIN
 INSERT INTO public.game_characters(game_id,name,default_icon_url) SELECT v_game,'R52 limit '||n,'https://example.invalid/a.webp' FROM generate_series(1,8) n;
 SELECT array_agg(id) INTO v_ids FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 limit %';
 ALTER TABLE public.schedule_requests DROP CONSTRAINT chk_schedule_requests_pickup_new_characters_valid;
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
 VALUES(v_user,v_game,'R52 overlimit atomic','PICKUP',v_ids,jsonb_build_array(jsonb_build_object('name',v_new_name,'icon_url',NULL)),CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_req;
 PERFORM set_config('chronoledger.r52_overlimit_request',v_req::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.approve_schedule_request(current_setting('chronoledger.r52_overlimit_request')::uuid);
 RAISE EXCEPTION 'R52_EXPECTED_APPROVAL_ROLLBACK';
EXCEPTION WHEN check_violation THEN NULL; END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.game_characters WHERE name='R52 rollback proposal') OR EXISTS(SELECT 1 FROM public.game_schedules WHERE title='R52 overlimit atomic') THEN RAISE EXCEPTION 'FAIL: over-limit approval did not roll back atomically'; END IF;
END $$;
DELETE FROM public.schedule_requests WHERE id=current_setting('chronoledger.r52_overlimit_request')::uuid;
ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_new_characters_valid CHECK (public.is_valid_pickup_new_characters(pickup_new_characters) AND (schedule_type='PICKUP' OR jsonb_array_length(pickup_new_characters)=0) AND cardinality(pickup_character_ids)+jsonb_array_length(pickup_new_characters)<=8);

SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.game_characters WHERE id=current_setting('chronoledger.r13_character_2_id')::uuid AND is_pickup_only IS NOT NULL) THEN RAISE EXCEPTION 'FAIL: anon could not read is_pickup_only'; END IF;
 BEGIN PERFORM created_by FROM public.game_characters LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_CREATED_BY_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_characters LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_character_presets LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.character_requests LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.schedule_requests LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
\echo PASS: R52 + Amendment A1 template validation, pickup references, deletion cleanup, proposals, atomic approval and anon boundary
-- R35: favorite schedules are owner-only, hidden from other users and anon,
-- blocked for pending-deletion users, cleaned up on schedule delete and account purge.
-- User A has a PENDING account deletion request since R13-07, so user B is the regular owner here.
RESET ROLE;
INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R35 favorite target', 'VERSION', CURRENT_DATE, CURRENT_DATE + 7)
RETURNING id AS r35_schedule_id \gset
INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R35 cascade target', 'PICKUP', CURRENT_DATE, CURRENT_DATE + 3)
RETURNING id AS r35_cascade_schedule_id \gset
SELECT set_config('chronoledger.r35_schedule_id', :'r35_schedule_id', true);
SELECT set_config('chronoledger.r35_cascade_schedule_id', :'r35_cascade_schedule_id', true);
-- Pre-existing favorite of user A (pending deletion) for cross-user and pending-delete checks.
INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
VALUES (:'test_user_id'::uuid, :'r35_schedule_id'::uuid);

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_other UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_schedule UUID := current_setting('chronoledger.r35_schedule_id')::uuid;
    v_cascade UUID := current_setting('chronoledger.r35_cascade_schedule_id')::uuid;
    v_rows INTEGER;
BEGIN
    IF v_user IS DISTINCT FROM current_setting('chronoledger.other_user_id')::uuid THEN
        RAISE EXCEPTION 'FAIL: R35 JWT did not resolve user B';
    END IF;

    INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_schedule);
    IF (SELECT count(*) FROM public.user_favorite_schedules) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.user_favorite_schedules WHERE user_id = v_user AND schedule_id = v_schedule) THEN
        RAISE EXCEPTION 'FAIL: R35 owner could not read only own favorite';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_favorite_schedules WHERE user_id = v_other) THEN
        RAISE EXCEPTION 'FAIL: R35 RLS exposed another user favorite';
    END IF;

    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_schedule);
        RAISE EXCEPTION 'FAIL: R35 duplicate favorite was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_other, v_cascade);
        RAISE EXCEPTION 'FAIL: R35 user B inserted a favorite for user A';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    DELETE FROM public.user_favorite_schedules WHERE user_id = v_other;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R35 user B deleted user A favorite';
    END IF;

    BEGIN
        UPDATE public.user_favorite_schedules SET schedule_id = v_cascade WHERE user_id = v_user;
        RAISE EXCEPTION 'FAIL: R35 favorite UPDATE was not denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    DELETE FROM public.user_favorite_schedules WHERE user_id = v_user AND schedule_id = v_schedule;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'FAIL: R35 owner could not delete own favorite';
    END IF;

    INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_cascade);
END $$;
RESET ROLE;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND schedule_id = current_setting('chronoledger.r35_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 user A favorite changed by user B';
    END IF;
    DELETE FROM public.game_schedules WHERE id = current_setting('chronoledger.r35_cascade_schedule_id')::uuid;
    IF EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE schedule_id = current_setting('chronoledger.r35_cascade_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 schedule delete did not cascade to favorites';
    END IF;
    IF position('user_favorite_schedules' IN pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure)) = 0 THEN
        RAISE EXCEPTION 'FAIL: R35 account purge does not delete favorite schedules';
    END IF;
END $$;

-- Pending-deletion user A cannot add, read or remove favorites.
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INTEGER;
BEGIN
    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
        SELECT auth.uid(), id FROM public.game_schedules WHERE title = 'R41 official guest schedule' LIMIT 1;
        RAISE EXCEPTION 'FAIL: R35 pending user inserted favorite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM public.user_favorite_schedules) THEN
        RAISE EXCEPTION 'FAIL: R35 pending user could read favorites';
    END IF;
    BEGIN
        DELETE FROM public.user_favorite_schedules WHERE user_id = auth.uid();
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: R35 pending user deleted favorite';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND schedule_id = current_setting('chronoledger.r35_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 pending user favorite was removed';
    END IF;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
    BEGIN
        PERFORM 1 FROM public.user_favorite_schedules LIMIT 1;
        RAISE EXCEPTION 'FAIL: R35 anon read favorites';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
        VALUES (current_setting('chronoledger.other_user_id')::uuid, current_setting('chronoledger.r35_schedule_id')::uuid);
        RAISE EXCEPTION 'FAIL: R35 anon inserted favorite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R35 favorite schedules owner CRUD, duplicate/cross-user/UPDATE denial, cascade, purge, pending-deletion and anon boundary
-- R64 classification option icons: admin write, approved-game guest read, validation, and cleanup.
UPDATE public.games
SET status = 'APPROVED'
WHERE id = current_setting('chronoledger.r13_game_id')::uuid;
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.other_user_id'),
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
VALUES (
    current_setting('chronoledger.r13_game_id')::uuid,
    'element',
    '불',
    'data:image/webp;base64,' || repeat('A', 32)
);
DO $$
BEGIN
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (
            current_setting('chronoledger.r13_game_id')::uuid,
            'element',
            '없는 옵션',
            'data:image/webp;base64,' || repeat('A', 32)
        );
        RAISE EXCEPTION 'FAIL: R64 invalid classification option accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (
            current_setting('chronoledger.r13_game_id')::uuid,
            'element',
            '물',
            'https://example.invalid/icon.webp'
        );
        RAISE EXCEPTION 'FAIL: R64 non-WebP data URL accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (
            current_setting('chronoledger.r13_game_id')::uuid,
            'element',
            '물',
            'data:image/webp;base64,' || repeat('A', 20000)
        );
        RAISE EXCEPTION 'FAIL: R64 oversized icon accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND axis_key = 'element'
          AND option_value = '불'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 approved-game anon read denied';
    END IF;
END;
$$;
RESET ROLE;

SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.other_user_id'),
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SET LOCAL ROLE authenticated;
UPDATE public.games
SET classification_schema = jsonb_set(classification_schema, '{axes,0,options}', '["물"]'::jsonb)
WHERE id = current_setting('chronoledger.r13_game_id')::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND axis_key = 'element'
          AND option_value = '불'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 removed classification option icon was not cleaned';
    END IF;
END;
$$;
RESET ROLE;
\echo PASS: R64 classification option icon validation, approved guest read, admin write, and schema cleanup

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.cancel_planned_expense(
            current_setting('chronoledger.planned_cancel_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: anon executed authenticated-only RPC';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$$;
RESET ROLE;

ROLLBACK;
\echo PASS: all smoke-test fixtures and mutations rolled back
