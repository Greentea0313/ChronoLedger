---
trigger: always_on
description: ChronoLedger 6-model AI collaboration roles, default reasoning levels, fallback chains, Gemini Hydrogen/Neon/Carbon & Claude Sonnet/Opus promotion criteria, /swarm approval policy, and role-scoped src/** implementation boundaries. The handoff procedure itself is in .agents/skills/handoff/SKILL.md.
---

# ChronoLedger Multi-Model AI Collaboration & Promotion Rules

## 1. 6-Model Roles, Default Reasoning Levels & Token-Exhaustion Fallback Matrix

| Primary Model / Agent (Default Reasoning) | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Hydrogen (`Medium`)** *(Default Gemini)* | `Default Maker (Feature·UI·Test·Fast Docs) & Default Orchestrator / Reviewer` | Short-cycle quota workhorse (**default `Medium`**; `Low`~`XHigh` available). Standard features/UI/utils (`src/app/`, `src/components/`, `src/lib/`), lightweight Tailwind/markup & `docs/` sync (absorbs former `Gemini 3.8 Flash` role), Vitest unit/integration tests, standard Run setup/dispatch/closeout (`New-CollaborationRun.ps1`), standard static review (`review.json`); 1st fallback for Claude Sonnet & GitHub Copilot | **Gemini 4 Neon (`High`)** / **Claude Sonnet (`Medium`)** | **GitHub Copilot** |
| **Gemini 4 Neon (`High`)** *(Tier-2 Promotion)* | `Maker (Complex·Core) & Multi-Step Orchestrator` | Short-cycle quota deep specialist (**default `High`**; `XHigh` for hard debugging, + `Orchestrator (Neon)`). Multi-component state & lifecycle implementation, core ledger/date/SQL/RPC implementation (1st Gemini fallback for GPT Codex), repeated-failure debugging, and multi-step Run orchestration | **Claude Opus (`High`)** / **Gemini 4 Hydrogen (`Medium`)** | **GitHub Copilot** |
| **Gemini 4 Carbon (`High`)** *(Tier-3 Chief)* | `Chief Architect & Final Gatekeeper (No Direct src/**)` | Frontier architect (**default `High`** + `Orchestrator (Carbon)`, replaces `Gemini 4 Argon`). Open architecture & formal spec design (`docs/spec/*.md`), deep security/RLS/`SECURITY DEFINER` RPC/ledger auditing, high-risk Run integrated review (`review.json`), meta-orchestration & pipeline rules | **Claude Opus (`High`)** / **Gemini 4 Neon (`High`)** | **Gemini 4 Hydrogen (`Medium`)** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/KST date sync (`subscription-sync.ts`), Supabase SQL/RPC, Vitest unit tests | **Gemini 4 Neon (`High`)** / **Claude Opus (`High`)** | **Gemini 4 Hydrogen (`Medium`)** / **GitHub Copilot** |
| **Claude (Claude Pro: `Sonnet (Medium)` / `Opus (High)`)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring (**`Sonnet (Medium)`** default Maker/standard review; **`Opus (High)`** promoted deep specialist/integrated review) | **Gemini 4 Hydrogen (`Medium`)** *(Sonnet)* / **Gemini 4 Neon·Carbon (`High`)** *(Opus)* | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 4 Hydrogen (`Medium`)** | **GPT Codex** |

> **💡 Default Reasoning Level Policy (`Hydrogen: Medium`, `Sonnet: Medium`, `Neon: High`, `Carbon: High`, `Opus: High`)**:
>
> - **Tier-1 Default Workhorses (`Gemini 4 Hydrogen (Medium)`, `Claude Sonnet (Medium)`)**: Operate at **`Medium`** by default to balance code accuracy, response latency, and thinking-token quota on scoped implementation, standard orchestration, and docs sync.
> - **Tier-2 & Tier-3 Promoted Specialists (`Gemini 4 Neon (High)`, `Gemini 4 Carbon (High)`, `Claude Opus (High)`)**: Operate at **`High`** by default because they are invoked specifically for complex multi-component/SQL/core logic (`Neon`), open architectural specs & security/ledger audits (`Carbon`), or final Run-level integrated reviews & high-risk audits (`Opus`).
> - **Per-Step Exceptions (with a short reason)**: the Orchestrator may write a different level next to the model in a queue row, e.g. `Claude Opus (XHigh — 2회 반복 실패 동시성 디버깅)`.
>   - **Down to `Low`**: mechanical work with no judgment, such as archive cut-and-paste, status/SHA updates in `docs/`, or a one-line typo fix.
>   - **Up to `XHigh`**: debugging after 2+ failed attempts, async/concurrency or crypto/protocol correctness, or a security/ledger audit with conflicting evidence.
>   - Never lower a Step that touches money, ledger, points, RLS or SQL/RPC below the model's default. A level change never replaces a promotion: when a §1 promotion condition applies, switch the model instead.
>   - The level is set by the user in each tool; an agent that finds its row asks for a different level states this at the start of its reply instead of assuming it.

> **💡 Gemini 4 Multi-Tier Operating & Promotion Criteria (`Hydrogen (Medium)` Default $\to$ `Neon (High)` / `Carbon (High)` Promotion)**:
>
> - **Default to `Gemini 4 Hydrogen (Medium)` (Short-Cycle Quota Base)**: Use **`Hydrogen (Medium)`** by default for Gemini Maker tasks (including lightweight UI/markup and `docs/` sync formerly handled by `Gemini 3.8 Flash`), standard Run registration/dispatch/closeout, and standard reviews to protect **`Carbon (High)`**'s frontier quota.
> - **`Gemini 4 Neon (High)` Promotion Conditions (Tier 2 — Deep Coding & Multi-Step Orchestration, Short-Cycle Quota)**:
>   - **`Neon (Maker, High)`** *(direct `src/**` & `sql/**` implementation allowed when assigned as a Maker row)*: ① Complex multi-component state (3+ components), browser lifecycle (`History`/`popstate`/nested modals·drawers), offline fallbacks, or async concurrency control, ② Core domain math/date sync (`payment-calculations.ts`, `budget-calculations.ts`, `subscription-sync.ts`) or Supabase SQL/triggers/`SECURITY DEFINER` RPCs (including 1st Gemini fallback for `GPT Codex`), ③ Debugging/recovery after 2+ repeated test/type/runtime failures in `Hydrogen` or another Maker.
>   - **`Neon (Orchestrator, High)`** *(no direct `src/**` edits when invoked as `Orchestrator`)*: ④ Multi-step composite Run design (e.g., DB $\to$ UI $\to$ Review), cross-step interface/acceptance-criteria specification, routing, and intermediate verification.
> - **`Gemini 4 Carbon (High)` Promotion Conditions (Tier 3 — Chief Architect & Final Gatekeeper, NEVER edits `src/**`)**:
>   - Assign **`Carbon (High)`** only when at least one condition is met: ① Open architectural/product decisions, trade-off analysis, new formal specs (`docs/spec/*.md`), or restructuring across 3+ domain modules, ② Pre-design review or deep post-audit of money, ledger, points, RLS, `SECURITY DEFINER` RPCs, or auth/deletion security boundaries, ③ High-risk Run-level final integrated static review (`review.json`, mutual 1st-tier peer with `Claude Opus (High)`), ④ Meta-orchestration and collaboration rule/skill redesign.
> - **Dynamic Mid-Task Promotion**: If `Hydrogen (Medium)` encounters any condition above mid-task, hand over via `⚠️ HANDOVER_NEEDED` to **`Neon (High)`** (for deep implementation/debugging) or **`Carbon (High)` / `Claude Opus (High)`** (for architectural/security/ledger judgment or integrated audit).

> **💡 Claude Pro `Sonnet (Medium)` / `Opus (High)` 2-Tier Operating Criteria (Token Optimization)**:
>
> - Operate both **`Claude Sonnet (Medium)`** and **`Claude Opus (High)`** from the user's Claude Pro subscription. Default to **`Sonnet (Medium)`**, promoting to **`Opus (High)`** only when one of the promotion conditions below applies to minimize quota consumption.
> - **Claude Sonnet (`Medium` — Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
> - **Claude Opus (`High` — Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Carbon (High)`, `Gemini 4 Neon (High)`, and `GPT Codex`.
> - **Opus Promotion Conditions** (Assign `Opus (High)` if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to `Opus (High)` via `⚠️ HANDOVER_NEEDED`.

## 2. Requirement Intake & Chief Architect Escalation (`📐 SPEC_NEEDED`)

**Applies to every AI except the Chief Architect (`Gemini 4 Carbon`) and its Fallback 1 (`Claude Opus`, `Gemini 4 Neon`)**: `Gemini 4 Hydrogen`, `GPT Codex`, `Claude Sonnet`, `GitHub Copilot`. These models never specify an out-of-scope requirement themselves (no guessed product decisions, specs or acceptance criteria); they hand it to the Chief Architect, or to its Fallback 1 when Carbon's quota is exhausted.

1. **Intake**: new requirements are received by `Gemini 4 Hydrogen` by default (any other non-escalation model follows the same rule).
2. **Triage**: escalate if any applies; otherwise the receiving model writes the acceptance criteria and registers the Run itself.
   - a `Carbon` promotion condition in §1 (open architecture/product decision, new formal spec, restructuring across 3+ domain modules, pre-design or audit of money/ledger/points/RLS/`SECURITY DEFINER` RPC/auth/deletion boundaries, collaboration rule or skill redesign);
   - the acceptance criteria cannot be settled from the approved documents (`docs/spec/*`, design docs, prior decisions).
3. **Escalation record**: add a `📐 SPEC_NEEDED` row in the root `docs/handoff.md` queue assigned to `Gemini 4 Carbon` *(Fallback: Claude Opus / Gemini 4 Neon)* with a `요구사항 접수 기록`: ① the request as understood, ② the triggering condition, ③ open questions and decisions needed, ④ related files/documents. `⚠️ HANDOVER_NEEDED` stays reserved for token/context exhaustion.
4. **Specification**: the Chief Architect (or Fallback 1) writes the spec or decision record and per-Step acceptance criteria, asking the user with question cards for product decisions. It does not edit `src/**`.
5. **Return**: the Chief Architect sets its row to `✅ DONE` and returns Run registration, worktree creation and model assignment to `Gemini 4 Hydrogen` (`▶ READY` Orchestrator row) to save Carbon's quota, unless it already registered the Run in the same step.
6. **Mid-task discovery**: if a non-escalation model finds such a condition while working, it stops, saves its work and records `📐 SPEC_NEEDED` for judgment (spec, design, security/ledger decision) or `⚠️ HANDOVER_NEEDED` to `Gemini 4 Neon` / `Claude Opus` for implementation-only promotion, as in §1.

## 3. Role-Scoped `src/**` Implementation Boundaries, `/swarm` Policy & Hybrid Delegation

1. **Role-Scoped Product Source (`src/**`) Implementation Boundaries**:
   - **`Gemini 4 Carbon` (`Architect · Orchestrator · Reviewer`)**: **Must NEVER directly edit product implementation source code (`src/**`).** Focuses exclusively on architecture, specs, security/ledger auditing, integrated review, and high-risk orchestration.
   - **`Gemini 4 Neon` (`Maker` vs `Orchestrator`)**: **When invoked in an `Orchestrator` role/profile, `Neon` must NOT directly edit `src/**`** (focusing on acceptance criteria, worktree/queue management, step verification, and lightweight subagent delegation). **`Neon` may directly edit `src/**` and `sql/**` only when explicitly assigned to a `Maker` row** in the Dispatch Queue.
   - **`Gemini 4 Hydrogen` (`Default Maker & Default Orchestrator`)**: Allowed to directly edit `src/**`, `sql/**`, and tests when acting as `Maker`, and handles standard Run registration/closeout (avoiding unrequested `src/**` edits during pure orchestration or review steps).
2. **Hybrid Delegation & `/swarm` Parallel Execution Policy**:
   - **Immediate Internal Subagent Delegation (`invoke_subagent` $\to$ `Model: "flash_lite"` or `"inherit"`)**:
     - For read-only multi-file codebase search, lightweight Tailwind/markup drafts, and `docs/` or archive cut-and-paste sync, the active Gemini agent (`Hydrogen`, `Neon`, or `Carbon`) may delegate immediately via an internal subagent (`invoke_subagent` with runtime tier **`Model: "flash_lite"`** or **`"inherit"`**).
     - **Never delegate** SQL/RPC/RLS, money/date/point logic, commits, Dispatch Queue status changes, review verdicts or `test.json` results; the delegating agent checks every delegated edit in the diff and stays responsible for it.
   - **`/swarm` Parallel Mode Policy (User-Approval Required)**:
     - ChronoLedger multi-agent work defaults to the `docs/handoff.md` Dispatch Queue + isolated Git worktrees (`.worktrees/<run_id>`). **Never start `/swarm` autonomously.**
     - If parallel execution across non-overlapping files/modules would significantly benefit a task, first propose `/swarm` to the user (stating the planned worker count, roles, and quota impact) and **only invoke `/swarm` after the user explicitly approves (or directly invokes `/swarm`)**.
   - **Dispatch Queue Assignment (`Gemini 4 Hydrogen / Neon / Carbon`, `GPT Codex`, `Claude Sonnet / Opus`, `GitHub Copilot`)**:
     - Register multi-step or cross-model tasks in `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` with status **`▶ READY`** (after running `New-CollaborationRun.ps1` if isolated execution is needed), end the turn, and instruct the user to switch to the assigned model and input **`"인수인계 문서를 확인해"`**.

## 4. Handoff Execution & Emergency Handover

- The `"인수인계 문서를 확인해"` procedure, hard-cutoff recovery, Docker precheck and emergency handover checkpoint are defined only in the handoff skill (`.agents/skills/handoff/SKILL.md`).
- Document updates after each step follow `.agents/skills/chronoledger-docs-closeout/SKILL.md`.
