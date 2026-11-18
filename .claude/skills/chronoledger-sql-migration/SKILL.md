---
name: chronoledger-sql-migration
description: Write or review a ChronoLedger Supabase schema change (table, RLS policy, trigger, SECURITY DEFINER RPC) with an idempotent migration, SCHEMA.sql sync, README check queries, a TESTS.sql smoke block and generated types, and run it on a local Supabase. Use for any sql/ or RLS/RPC change.
---

# ChronoLedger SQL Migration

Any change to money, ledger, points, RLS or SQL/RPC is an Opus promotion condition (`.agents/rules/collaboration.md`). Never touch the production database; migrations are applied by the user in the Supabase SQL Editor.

## 1. Files to change together

1. `sql/migrations/MIGRATION_<topic>.sql`: wrap in `BEGIN; … COMMIT;`, re-runnable (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY/TRIGGER IF EXISTS` before `CREATE`). If a function signature changes, `DROP FUNCTION IF EXISTS` the old one first.
2. `sql/SCHEMA.sql`: the same change for fresh installs. Place tables before the shared pending-deletion loops if you add them to those loops.
3. `sql/README.md` section B: one row with the file, what it does, and check queries with expected results.
4. `sql/tests/TESTS.sql`: a rollback-only smoke block plus its line in the header table.
5. `src/types/database.types.ts`: `Row`/`Insert`/`Update`/`Relationships` for new tables and `Args`/`Returns` for new RPCs; then `npx tsc --noEmit`.
6. If an older migration becomes stale, move it to `sql/archive/` with a do-not-run comment. Never run anything in `sql/archive/`.

## 2. Project rules for personal tables and RPCs

- New `public` tables: `ENABLE ROW LEVEL SECURITY`, then `REVOKE ALL … FROM PUBLIC, anon, authenticated` (Supabase default privileges grant ALL) and grant only what is needed.
- Personal tables also get the pending-deletion block: a `RESTRICTIVE` policy `"Block account deletion users from <table>"` and the `block_pending_account_deletion_<table>` trigger using `public.block_pending_account_data_mutations()`; add the table to both loops in `SCHEMA.sql`.
- Add `DELETE FROM public.<table> WHERE user_id = v_req.user_id;` to `purge_expired_account_deletion_requests`. A migration redefines the whole function from the current `SCHEMA.sql` body; note in the README row that it must be re-run if an older purge migration (`MIGRATION_PG_CRON.sql`, `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`, `MIGRATION_R35_FAVORITE_SCHEDULES.sql`, …) is re-applied later.
- Money and balance changes go through one `SECURITY DEFINER` RPC with `SET search_path = public`: check `auth.uid()` and `public.account_deletion_is_pending(auth.uid())`, validate input, change rows and balances in the same transaction, then `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated;`. Never split them into client updates.
- Admin checks use the JWT claim `app_metadata.role = 'admin'` (existing policies also accept `public.users.role = 'admin'`); never `user_metadata`.
- Amounts are integer KRW `BIGINT`; points are separate integers.

## 3. TESTS.sql patterns

- Fixtures: user A (`:test_user_id`) and user B (`:other_user_id`). Act as a user with `set_config('request.jwt.claim.sub', …)` and `set_config('request.jwt.claims', …)`, then `SET LOCAL ROLE authenticated`; `RESET ROLE` afterwards.
- User A has a PENDING account deletion request from the pending-deletion block after R63 until the line that deletes it after the R35/R93 blocks; put pending-deletion checks there, and make sure `auth.uid()` is not user A when the fixture role writes user A rows.
- Expected failures: catch `insufficient_privilege` for missing grants, `raise_exception` for RPC errors and check `SQLERRM`; re-raise anything starting with `FAIL:`.
- End each block with `\echo PASS: …`.

## 4. Local run (🐳 Docker Desktop required)

- Run `docker version` first; if Docker is missing or the engine is stopped, stop and ask the user to start Docker Desktop.
- Start the local stack outside the repository as described in `sql/README.md` section C (`npx supabase@2.120.0 init/start --workdir <folder>`, `project_id = chronoledger-local`).
- A host `psql` is not required: copy files into the DB container and run them there, which also avoids PowerShell encoding issues:
  - `docker cp sql/SCHEMA.sql supabase_db_chronoledger-local:/tmp/SCHEMA.sql`
  - `docker exec supabase_db_chronoledger-local psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f /tmp/SCHEMA.sql`
- Apply the migration twice to prove it is re-runnable, then run `sql/tests/TESTS.sql` the same way and confirm the final rollback `PASS`.
- If the local run was not possible, record it as not run in the handoff record; do not claim the SQL was executed.
