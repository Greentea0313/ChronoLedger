# ChronoLedger Instructions for Claude Code

## 1. Core Rule Imports

When starting a Claude Code session, load and adhere to the following rule files:

- @.agents/rules/language.md — [.agents/rules/language.md](.agents/rules/language.md) (Korean language communication rule)
- @.agents/rules/collaboration.md — [.agents/rules/collaboration.md](.agents/rules/collaboration.md) (5-model AI collaboration roles, hybrid delegation & emergency handover)
- @.agents/rules/handoff.md — [.agents/rules/handoff.md](.agents/rules/handoff.md) (`"인수인계 문서를 확인해"` auto-execution & docs sync)
- @.agents/rules/agent_rules.md — [.agents/rules/agent_rules.md](.agents/rules/agent_rules.md) (Core coding behavior guidelines)
- @.agents/rules/document_location.md — [.agents/rules/document_location.md](.agents/rules/document_location.md) (Document location & taxonomy)

## 2. Claude Core Roles (Role & Fallback)

Within the ChronoLedger 5-model AI collaboration architecture, the roles of Claude (Claude Pro: Sonnet / Opus) are defined as follows:

- **Claude Pro Sonnet / Opus 2-Tier Operating Criteria (Token Optimization)**:
  - Operate both **`Claude Sonnet`** and **`Claude Opus`** from the user's Claude Pro subscription. Default to Sonnet, promoting to Opus only when one of the promotion conditions below applies to minimize quota consumption.
  - **Claude Sonnet (Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
  - **Claude Opus (Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Argon` and `GPT Codex`.
  - **Opus Promotion Conditions** (Assign Opus if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to Opus via `⚠️ HANDOVER_NEEDED`.
- **Primary Role: `Reviewer & Maker (Complex)`**
  - **Static Code Review**: Perform read-only static code reviews comparing Base SHA $\leftrightarrow$ Target SHA, producing structured `review.json` matching `artifacts/schemas/review.schema.json`.
  - **Security & Integrity Auditing**: Audit Supabase RLS policies, SQL triggers, ledger integrity, auth boundaries, and transaction safety.
  - **Complex Refactoring & Interaction**: Implement complex multi-component state management, async data pipelines, accordion/drawer interactions, and system refactoring.
- **Fallback Role: Primary Fallback Model (Fallback 1)**
  - When **Gemini 4 Argon** (`Orchestrator & Architect`) exhausts tokens: Claude Opus succeeds as Fallback 1 for orchestration and architecture decisions.
  - When **GPT Codex** (`Maker - Core & Test`) exhausts tokens: Claude Opus succeeds for ledger/payment/RPC logic, and Claude Sonnet succeeds for unit tests and standard implementation.

## 3. "인수인계 문서를 확인해" Auto-Execution Protocol

When the user enters **`"인수인계 문서를 확인해"`** (or any request to check handoff documentation), immediately execute these 6 steps without asking clarifying questions:

1. **Check Queue**: Read `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md`.
2. **Identify Task**: Select the task with status `⚠️ HANDOVER_NEEDED` (1st priority) or `▶ READY` (2nd priority).
3. **Hard Cutoff Auto-Recovery**: If a previous model ended abruptly due to quota/token limits without updating status, inspect `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) to identify and preserve uncommitted changes before continuing.
4. **Adhere to Skill Guidelines**: Strictly follow the corresponding skill guideline under `.agents/skills/`:
   - Reviewer: [.agents/skills/chronoledger-reviewer/SKILL.md](.agents/skills/chronoledger-reviewer/SKILL.md)
   - Maker: [.agents/skills/chronoledger-maker/SKILL.md](.agents/skills/chronoledger-maker/SKILL.md)
   - Orchestrator: [.agents/skills/chronoledger-orchestrator/SKILL.md](.agents/skills/chronoledger-orchestrator/SKILL.md)
   - Handoff Protocol: [.agents/skills/handoff/SKILL.md](.agents/skills/handoff/SKILL.md)
5. **Emergency Handover Checkpoint**: If token/context budget runs low during execution, update task status in `docs/handoff.md` to `⚠️ HANDOVER_NEEDED`, record completed tasks, remaining work, decisions, and tests in `### 📌 중단 체크포인트 (Handover Checkpoint)`, and instruct the user to switch to the fallback model.
6. **Completion & Docs Sync**: Upon completion, update Dispatch Queue status to `✅ DONE (SHA: <commit_sha>)`, advance the next step to `▶ READY`, and sync `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, and `docs/to-do.md`.

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
python scripts/collaboration/validate_collaboration_artifact.py <json>  # Validate artifact
```

- Running `npm run build` while `npm run dev` is active overwrites `.next` chunks and breaks the dev server. Recovery: Stop dev server → delete `.next` → restart.
- Vitest excludes `.worktrees/**`. Removing this exclude causes duplicate runs across nested worktrees and React instance conflicts.

## 6. Architecture Overview

**Single Next.js 14 App Router codebase → static export (`output: 'export'`, `images.unoptimized`)**. With no server runtime, all pages are client components, and the backend is entirely Supabase (Auth / PostgreSQL+RLS / Storage / pg_cron). The identical `out/` build output is utilized across three environments:

- **Web/PWA**: Hosted on Cloudflare Pages (`public/_headers`, `public/_redirects`). `public/sw.js` manages the app shell + per-user Supabase read cache, cleared via `CLEAR_CACHES` message upon logout. Bump `SHELL_CACHE` version (`chronoledger-shell-vN`) when shell assets change.
- **Desktop**: `src-tauri/` (Tauri v2, `frontendDist: ../out`). Auth uses `implicit` flow + deep links (`src/lib/tauri-auth.ts`) in Tauri, and `pkce` flow in browsers.
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
- `user-icons` Storage bucket is private (`{user_id}/{game_id}.webp`, 256×256 WebP ≤ 100KiB). Never call `getPublicUrl`.

### UI Rules

- Colors use RGB channel CSS variables from `globals.css` (default dark, `[data-theme="light"]`) mapped to semantic tokens in `tailwind.config.ts` (`bg-surface`, `text-content`, `bg-primary`, etc.). Use semantic tokens instead of hardcoded colors. Breakpoints: md=900, lg=1280.
- Skeletons are rendered only on initial page load (`hasLoadedInitialRef`), and data load callbacks depend on primitives like `user?.id`. Modal forms initialize only when opened (`prevOpenRef`), preventing background re-fetches from wiping out user input.
- Due to the TS build target, do not iterate `Map.values()` with `for..of`; use `forEach` or `Array.from()`.

For other recurrent pitfalls, consult `docs/known-pitfalls.md` first.
