-- ============================================================================
-- ChronoLedger deployed-schema smoke tests (rollback-only)
-- Run against the explicitly selected test Supabase project with:
--   psql "$env:SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f md/TESTS.sql
-- Every fixture, auth user, ledger entry, and RPC mutation is enclosed in one
-- transaction and rolled back at the end. Do not remove the final ROLLBACK.
-- This file verifies an already deployed schema; it does not install SCHEMA.sql.
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
END;
$$;
\echo PASS: auth.users trigger creates finance row and both wallets

SELECT public.set_user_finance_settings(100000, 20000);
SELECT public.adjust_wallet_balance('GOOGLE_PLAY', 500, 'rollback smoke-test seed');

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
SELECT public.process_expense_payment(
    :'wallet_payment_id'::uuid,
    10000, 1000, 100, 100,
    'GOOGLE_PLAY', 'WALLET', true,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);

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

SELECT public.refund_expense_payment(:'wallet_payment_id'::uuid);
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

SELECT public.process_expense_payment(
    :'store_payment_id'::uuid,
    10000, 1000, 0, 0,
    'GOOGLE_PLAY', 'GOOGLE_PLAY', false,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);
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

SELECT public.refund_expense_payment(:'store_payment_id'::uuid);
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
SELECT public.cancel_planned_expense(:'planned_cancel_id'::uuid);
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
SELECT public.restore_cancelled_expense(:'planned_cancel_id'::uuid);
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
SELECT public.restore_cancelled_expense(:'template_expense_id'::uuid);
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

-- The second synthetic account's row must not be visible to the first account.
INSERT INTO public.expenses (user_id, title, category, target_date)
VALUES (
    :'other_user_id'::uuid,
    'Codex SQL test foreign expense ' || :'other_user_id',
    '기타', (now() AT TIME ZONE 'Asia/Seoul')::date
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
END;
$$;
\echo PASS: RLS isolates users and blocks direct wallet/confirmed-state/delete writes

RESET ROLE;
ROLLBACK;
\echo PASS: all smoke-test fixtures and mutations rolled back
