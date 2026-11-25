# ChronoLedger Instructions for Claude Code

## 1. Always-on Rules

- @.agents/rules/language.md — 답과 문서는 한국어 개조식(~함, ~임). 작업 목록·완료 상자(recap·질문·버튼)·브리프·요약도 같음. `~습니다`·`~입니다` 금지.
- @.agents/rules/agent_rules.md — Think before coding, simplicity first, surgical changes, verifiable goals.
- @.agents/rules/document_location.md — Project docs live in `docs/`; finished records in `docs/archive/`.
- Chief Architect escalation (`.agents/rules/collaboration.md` §2): **Claude Sonnet** never specifies an out-of-scope requirement itself (open design/product decision, new spec, 3+ module restructuring, money/ledger/RLS/RPC/security design, or acceptance criteria the approved documents cannot settle); it records `📐 SPEC_NEEDED` with a `요구사항 접수 기록` for Gemini 4 Carbon. **Claude Opus** is the Chief Architect's Fallback 1 and may execute `📐 SPEC_NEEDED` rows (spec/decision and acceptance criteria only, no `src/**` edits), then returns Run registration to Gemini 4 Hydrogen.
- Model roles, default reasoning levels (`Hydrogen: Medium`, `Sonnet: Medium`, `Neon: High`, `Carbon: High`, `Opus: High`), fallback chains, Gemini (`Hydrogen` default $\to$ `Neon`/`Carbon` promotion) and Claude (`Sonnet` default $\to$ `Opus` promotion) criteria are in `.agents/rules/collaboration.md`. It is not loaded automatically; read it when assigning a model, choosing a fallback, or registering a Run.

## 2. Claude Role (`Sonnet (Medium)` / `Opus (High)`)

- Role: `Reviewer & Maker (Complex)` — Base ↔ Target static review (`review.json`), security/RLS/ledger integrity audits, complex multi-component state and refactoring; Fallback 1 for Gemini 4 Carbon (`High`), Gemini 4 Neon (`High`), Gemini 4 Hydrogen (`Medium`) and GPT Codex.
- Default to **`Sonnet (Medium)`**. Use **`Opus (High)`** when any applies: ① money, ledger, points, RLS or SQL/RPC changes, ② browser lifecycle or async concurrency edge cases, ③ restructuring across 3+ modules or open design decisions, ④ run-level integrated review. If Sonnet finds one mid-task, hand over with `⚠️ HANDOVER_NEEDED`.

## 3. Skills

Project skills live in `.claude/skills/` (copies of `.agents/skills/`). Edit only `.agents/skills/`, then run `powershell -File scripts/collaboration/Sync-Skills.ps1` (`-Check` verifies the copies match).

| Skill | Use when |
| :--- | :--- |
| `handoff` | The user says **`"인수인계 문서를 확인해"`** (or asks to check the handoff document) — always load it, even if it was not triggered automatically. Also for milestone records and planned handover. |
| `chronoledger-orchestrator` | Registering, routing or closing out a collaboration Run. |
| `chronoledger-maker` | A queue row assigns you the Maker role. |
| `chronoledger-reviewer` | A queue row assigns you the Reviewer role (`review.json`/`test.json`). |
| `chronoledger-sql-migration` | Any `sql/`, RLS, trigger or RPC change, or a local Supabase run. |
| `chronoledger-docs-closeout` | After a queue step or other meaningful work: update `docs/` and archive old records. |
| `chronoledger-weekly-doc-audit` | Weekly (or on request) integrity audit of documents changed in the last 7 days; moves overdue records to `docs/archive/`, commits, and leaves a notice in `docs/handoff.md` (other findings are report-only). |

## 4. Key Project Documents & Code Paths

- **Specifications & Requirements Authorities**:
  - `docs/spec/SRS.md` (Software Requirements Specification, top-level functional authority)
  - `docs/spec/SPEC.md` (Feature & UI specification summary)
  - `docs/spec/revisions_and_decisions.md` (Product decisions & change history)
  - `docs/spec/ChronoLedger_UI_Design_Sheet.md` (UI design sheet & layout guide)
- **Database Schema & Migrations**:
  - `sql/SCHEMA.sql` (Official baseline DB schema DDL)
  - `sql/*.sql` (Classified migrations, seeds, tests, and archive in `sql/README.md`)
- **Operations & Handoff Documents**:
  - `docs/handoff.md` (Active dispatch queue & session handover checkpoints)
  - `docs/to-do.md` (Full roadmap & step-by-step task backlog)
  - `docs/progress.md` (Development progress & milestone logs)
  - `docs/changelog.md` (Detailed change history)
  - `docs/architecture.md` (System architecture & module structure)
  - `docs/known-pitfalls.md` (Known pitfalls & troubleshooting notes)
  - `docs/archive/*-archive.md` (Finished run records and old log entries; read only when a task points to them)
- **Collaboration Artifacts & Verification Scripts**:
  - `artifacts/schemas/review.schema.json` (Code review JSON schema)
  - `artifacts/schemas/test.schema.json` (Test result JSON schema)
  - `scripts/collaboration/New-CollaborationRun.ps1` (Isolated worktree creation script)
  - `scripts/collaboration/validate_collaboration_artifact.py` (Artifact schema validation script)

## 5. Development Commands

Node 20 (`.nvmrc`). Supabase credentials reside in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), throwing at import time if missing in `src/lib/supabase/client.ts`.

```bash
npm run dev                      # Next.js dev server (localhost:3000)
npm run build                    # 정적 export → out/
npm run lint                     # next lint (next/core-web-vitals + next/typescript)
npm run test -- --run            # Vitest single run (default `npm run test` is watch mode)
npx vitest run src/lib/budget-calculations.test.ts   # Single test file
npx vitest run -t "test name"                        # Test name filter
npm run tauri dev                # Windows desktop (Tauri v2) dev run
python scripts/collaboration/validate_collaboration_artifact.py --artifact <json> --schema artifacts/schemas/review.schema.json  # or test.schema.json
```

- Running `npm run build` while `npm run dev` is active overwrites `.next` chunks and breaks the dev server. Recovery: Stop dev server → delete `.next` → restart.
- Vitest excludes `.worktrees/**`. Removing this exclude causes duplicate runs across nested worktrees and React instance conflicts.

## 6. Architecture Overview

**Single Next.js 14 App Router codebase → static export (`output: 'export'`, `images.unoptimized`)**. With no server runtime, all pages are client components, and the backend is entirely Supabase (Auth / PostgreSQL+RLS / Storage / pg_cron). The identical `out/` build output is utilized across three environments:

- **Web/PWA**: Hosted on Cloudflare Pages (`public/_headers`, `public/_redirects`). `public/sw.js` manages the app shell + per-user Supabase read cache, cleared via `CLEAR_CACHES` message upon logout. Bump `SHELL_CACHE` version (`chronoledger-shell-vN`) when shell assets change.
- **Desktop**: `src-tauri/` (Tauri v2, `frontendDist: ../out`). Auth uses the `pkce` flow on both web and Tauri (`src/lib/auth-adapter.ts`); Tauri receives the `chronoledger://auth/callback` deep link via `src/lib/tauri-auth.ts` and `tauri-plugin-single-instance`.
- **Account Deletion**: Handled without server functions via Supabase `SECURITY DEFINER` RPCs (`request_account_deletion`, `get_account_deletion_status`) + `pg_cron` 5-minute cleanup job (`sql/SCHEMA.sql`, or `sql/migrations/MIGRATION_PG_CRON.sql`). Legacy Netlify Functions have been eliminated.

### Code Structure

- `src/app/` — Routes. `/` redirects to `/auth`, OAuth callback at `/auth/callback`, `/dashboard` (calendar), `/dashboard/expenses`, `/dashboard/games`, `/dashboard/settings`, and `/admin` (schedule/game request approvals). `dashboard/layout.tsx` serves as a session guard, but the actual security boundary is RLS.
- `src/lib/auth-context.tsx` — Global `AuthProvider`/`useAuth()` (`user`, `session`, `users.role`/`nickname`, deletion status).
- `src/lib/supabase/client.ts` — The singleton Supabase client. Do not call `createClient` elsewhere.
- `src/lib/*-calculations.ts` — Pure domain logic (budget attribution, payment/point calculation, Naver Pay 10,000 KRW rounding top-up). High test coverage area.
- `src/lib/subscription-sync.ts` — Lazy generation for recurring subscription expenses (duplicate-ignoring upsert). `calendar-utils.ts`/`dashboard-date.ts` — KST date and grid calculations.
- `src/lib/offline-guard.ts`, `use-online-status.ts` — All write handlers are guarded by `isOffline()`.
- `src/components/<domain>/` — calendar, expense, finance, game, wallet, subscription, profile, pwa, layout. `src/components/ui/` contains shadcn-style primitives (Radix, Vaul drawer).
- `src/types/database.types.ts` — Types generated against deployed schema.
- Tests are colocated next to target files as `*.test.ts(x)`. Page/component tests follow the pattern of `vi.hoisted` + `vi.mock("@/lib/supabase/client")` and `vi.mock("@/lib/auth-context")`.

### Data Layer Rules

- **Schema Baseline**: `sql/SCHEMA.sql`. Add changes via `sql/migrations/MIGRATION_*.sql` and reflect into `SCHEMA.sql`. Classification, execution order, and verification queries are in `sql/README.md`. `sql/archive/` must never be run. Because migrations are manually applied via Supabase SQL Editor, new columns require fallback queries that tolerate unapplied states (e.g. `user_games.memo`).
- **Financial Changes Must Use `SECURITY DEFINER` RPCs**: `process_expense_payment`, `refund_expense_payment`, `adjust_wallet_balance`, `update_store_wallet_settings`, `set_user_finance_settings`, `cancel_planned_expense`, `approve_*/reject_*_request`, etc. Never split payments, refunds, or balance adjustments into multiple client `update` calls. Final amounts and earned points are calculated by RPCs.
- Monetary values are integer KRW (`BIGINT`), points are separate integers. Budget attribution: PLANNED = end date month, CONFIRMED = payment month. Schedule date change triggers only update PLANNED.
- Admin role check uses DB-side JWT claim `app_metadata.role=admin`. Never decide permissions using `user_metadata` or client-side values.
- `user-icons` Storage bucket is private (`{user_id}/{game_id}.webp`, 256×256 WebP ≤ 100KiB). Never call `getPublicUrl` on it. The only exception is the public, admin-write-only catalog bucket `game-assets` (`games/{sha256}.webp`, `characters/{game_id}/{sha256}.webp`, R109), where `getPublicUrl` is allowed.

### UI Rules

- Colors use RGB channel CSS variables from `globals.css` (default dark, `[data-theme="light"]`) mapped to semantic tokens in `tailwind.config.ts` (`bg-surface`, `text-content`, `bg-primary`, etc.). Use semantic tokens instead of hardcoded colors. Breakpoints: md=900, lg=1280.
- Skeletons are rendered only on initial page load (`hasLoadedInitialRef`), and data load callbacks depend on primitives like `user?.id`. Modal forms initialize only when opened (`prevOpenRef`), preventing background re-fetches from wiping out user input.
- Due to the TS build target, do not iterate `Map.values()` with `for..of`; use `forEach` or `Array.from()`.

For other recurrent pitfalls, consult `docs/known-pitfalls.md` first.
