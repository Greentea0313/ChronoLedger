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
--   psql "$env:SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f md/TESTS.sql
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
--   WAL-01 authenticated / A       WALLET 결제 -> final=8900, asset=91100,
--                                  Google point=400, earned_points=0.
--   WAL-02 authenticated / A       같은 CONFIRMED 결제 재호출 -> 거부, no mutation.
--   REF-01 authenticated / A       환불 -> asset/used points 원복, manual adjust 보존.
--   REF-02 authenticated / A       PAYMENT_REFUND 복구 시도 -> 거부.
--   ST-01  authenticated / A       Google 결제 -> earned=floor(9000*0.10%)=9;
--                                  deduct_from_asset=false는 자산 불변.
--   ST-02  authenticated / A       환불 -> 적립 9 회수, 자산 불변.
--   EXP-01 authenticated / A       예정 취소 후 restore -> PLANNED로 복구.
--   SUB-01 DB fixture + A JWT       템플릿 비활성화 -> 연결 PLANNED 회차 취소;
--                                  비활성 템플릿 복구 거부, 재활성 후 복구 성공.
--   SCH-01 DB fixture 역할         PICKUP 날짜 변경 -> 연결 PLANNED expense 동기화.
--   REF-03 DB fixture 역할         다른 게임 ID와 일정 ID 연결 -> trigger 거부.
--   REQ-01 authenticated / A       본인 game/schedule 요청 INSERT -> PENDING 성공.
--   REQ-02 authenticated / A       다른 사용자 expense 조회/RPC 결제 및 직접 요청
--                                  상태 변경 -> 타 사용자 row 은닉/write 거부.
--   ADM-01 authenticated / A       app_metadata.role 없는 승인 RPC -> 관리자 오류,
--                                  요청 PENDING 유지.
--   ADM-02 authenticated / A+admin game/schedule 승인·반려 -> 카탈로그/일정 생성,
--                                  요청 상태·admin memo 기록, 연결 예정 지출 동기화.
--   ADM-03 authenticated / A+admin 잘못된 game/target 일정 승인 -> 오류, 요청 PENDING,
--                                  대상 일정 값 불변.
--   WAL-03 authenticated / A       일치하는 tier/rate 변경 성공, 불일치/음수 잔액 거부.
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
          AND current_balance = 0 AND user_tier IS NULL AND earn_rate = 0.10
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
              (platform = 'GALAXY_STORE' AND user_tier IS NOT NULL)
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
          AND final_amount = 8900 AND earned_points = 0
    ) THEN
        RAISE EXCEPTION 'FAIL: WALLET payment values or no-earn rule are incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = v_user AND total_asset = 91100
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct the final amount from assets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 400
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct the used points';
    END IF;
END;
$$;
\echo PASS: WALLET payment with store points deducts points/assets and earns no points

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
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'TEMPLATE_DEACTIVATION'
    ) THEN
        RAISE EXCEPTION 'FAIL: template deactivation did not cancel its planned cycle';
    END IF;
END;
$$;

DO $$
BEGIN
    BEGIN
        PERFORM public.restore_cancelled_expense(
            current_setting('chronoledger.template_expense_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: inactive template cycle was restored';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '복구 가능한 예정 취소 항목이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;

UPDATE public.subscription_templates
SET is_active = true
WHERE id = :'test_template_id'::uuid;
SET LOCAL ROLE authenticated;
SELECT public.restore_cancelled_expense(:'template_expense_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'PLANNED' AND cancellation_kind IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: reactivated template cycle was not explicitly restored';
    END IF;
END;
$$;
\echo PASS: template deactivation cancellation and active-only explicit restoration

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

INSERT INTO public.schedule_requests (
    user_id, game_id, title, schedule_type, start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid,
    'Chrono test schedule addition', 'VERSION',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 40,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 45,
    'rollback test'
)
RETURNING id AS schedule_add_request_id \gset

INSERT INTO public.schedule_requests (
    user_id, game_id, target_schedule_id, title, schedule_type,
    start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid, :'test_schedule_id'::uuid,
    'Chrono test schedule edit', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 50,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 55,
    'rollback test'
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

-- SECURITY DEFINER RPC execute 권한은 authenticated에만 있어야 한다.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'anon')::text,
    true
);
SELECT set_config('request.jwt.claim.sub', '', true);
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
