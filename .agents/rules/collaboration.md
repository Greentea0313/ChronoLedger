---
trigger: always_on
description: ChronoLedger 7-model AI collaboration roles, fallback chains, Gemini Hydrogen/Neon/Argon & Claude Sonnet/Opus promotion criteria, and role-scoped src/** implementation boundaries. The handoff procedure itself is in .agents/skills/handoff/SKILL.md.
---

# ChronoLedger Multi-Model AI Collaboration & Promotion Rules

## 1. 7-Model Roles & Token-Exhaustion Fallback Matrix

| Primary Model / Agent | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Hydrogen** *(Default Gemini)* | `Default Maker (Feature·UI·Test) & Default Orchestrator / Reviewer` | Short-cycle quota workhorse (`Low`~`XHigh`). Standard features/UI/utils (`src/app/`, `src/components/`, `src/lib/`), Vitest unit/integration tests, standard Run setup/dispatch/closeout (`New-CollaborationRun.ps1`), standard static review (`review.json`); 1st fallback for Claude Sonnet & GitHub Copilot | **Gemini 4 Neon** / **Claude Sonnet** | **GitHub Copilot** |
| **Gemini 4 Neon** *(Tier-2 Promotion)* | `Maker (Complex·Core) & Multi-Step Orchestrator` | Short-cycle quota deep specialist (`Low`~`XHigh` + `Orchestrator (Neon)`). Multi-component state & lifecycle implementation, core ledger/date/SQL/RPC implementation (1st Gemini fallback for GPT Codex), repeated-failure debugging, and multi-step Run orchestration | **Claude Opus** / **Gemini 4 Hydrogen** | **GitHub Copilot** |
| **Gemini 4 Argon** *(Tier-3 Chief)* | `Chief Architect & Final Gatekeeper (No Direct src/**)` | **Weekly-cycle quota** frontier architect (`Orchestrator (Argon)`). Open architecture & formal spec design (`docs/spec/*.md`), deep security/RLS/`SECURITY DEFINER` RPC/ledger auditing, high-risk Run integrated review (`review.json`), meta-orchestration & pipeline rules | **Claude Opus** / **Gemini 4 Neon** | **Gemini 4 Hydrogen** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/KST date sync (`subscription-sync.ts`), Supabase SQL/RPC, Vitest unit tests | **Gemini 4 Neon** / **Claude Opus** | **Gemini 4 Hydrogen** / **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Hydrogen** *(Sonnet)* / **Gemini 4 Neon·Argon** *(Opus)* | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 4 Hydrogen** / **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent (`Model: "flash"`), `docs/` sync assistance | **Gemini 4 Hydrogen** | **GitHub Copilot** |

> **💡 Gemini 4 Multi-Tier Operating & Promotion Criteria (`Hydrogen` Default $\to$ `Neon` / `Argon` Promotion)**:
>
> - **Default to `Gemini 4 Hydrogen` (Short-Cycle Quota Base)**: Use **`Hydrogen`** by default for Gemini Maker tasks, standard Run registration/dispatch/closeout, and standard reviews to protect **`Argon`**'s weekly (7-day) quota.
> - **`Gemini 4 Neon` Promotion Conditions (Tier 2 — Deep Coding & Multi-Step Orchestration, Short-Cycle Quota)**:
>   - **`Neon (Maker)`** *(direct `src/**` & `sql/**` implementation allowed when assigned as a Maker row)*: ① Complex multi-component state (3+ components), browser lifecycle (`History`/`popstate`/nested modals·drawers), offline fallbacks, or async concurrency control, ② Core domain math/date sync (`payment-calculations.ts`, `budget-calculations.ts`, `subscription-sync.ts`) or Supabase SQL/triggers/`SECURITY DEFINER` RPCs (including 1st Gemini fallback for `GPT Codex`), ③ Debugging/recovery after 2+ repeated test/type/runtime failures in `Hydrogen` or another Maker.
>   - **`Neon (Orchestrator)`** *(no direct `src/**` edits when invoked as `Orchestrator`)*: ④ Multi-step composite Run design (e.g., DB $\to$ UI $\to$ Review), cross-step interface/acceptance-criteria specification, routing, and intermediate verification.
> - **`Gemini 4 Argon` Promotion Conditions (Tier 3 — Chief Architect & Final Gatekeeper, Weekly Quota, NEVER edits `src/**`)**:
>   - Assign **`Argon`** only when at least one condition is met: ① Open architectural/product decisions, trade-off analysis, new formal specs (`docs/spec/*.md`), or restructuring across 3+ domain modules, ② Pre-design review or deep post-audit of money, ledger, points, RLS, `SECURITY DEFINER` RPCs, or auth/deletion security boundaries, ③ High-risk Run-level final integrated static review (`review.json`, mutual 1st-tier peer with `Claude Opus`), ④ Meta-orchestration and collaboration rule/skill redesign.
> - **Dynamic Mid-Task Promotion**: If `Hydrogen` encounters any condition above mid-task, hand over via `⚠️ HANDOVER_NEEDED` to **`Neon`** (for deep implementation/debugging) or **`Argon` / `Claude Opus`** (for architectural/security/ledger judgment or integrated audit).

> **💡 Claude Pro Sonnet / Opus 2-Tier Operating Criteria (Token Optimization)**:
>
> - Operate both **`Claude Sonnet`** and **`Claude Opus`** from the user's Claude Pro subscription. Default to Sonnet, promoting to Opus only when one of the promotion conditions below applies to minimize quota consumption.
> - **Claude Sonnet (Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
> - **Claude Opus (Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Argon`, `Gemini 4 Neon`, and `GPT Codex`.
> - **Opus Promotion Conditions** (Assign Opus if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to Opus via `⚠️ HANDOVER_NEEDED`.

## 2. Role-Scoped `src/**` Implementation Boundaries & Hybrid Delegation

1. **Role-Scoped Product Source (`src/**`) Implementation Boundaries**:
   - **`Gemini 4 Argon` (`Architect · Orchestrator · Reviewer`)**: **Must NEVER directly edit product implementation source code (`src/**`).** Focuses exclusively on architecture, specs, security/ledger auditing, integrated review, and high-risk orchestration.
   - **`Gemini 4 Neon` (`Maker` vs `Orchestrator`)**: **When invoked in an `Orchestrator` role/profile, `Neon` must NOT directly edit `src/**`** (focusing on acceptance criteria, worktree/queue management, step verification, and `Flash` subagent delegation). **`Neon` may directly edit `src/**` and `sql/**` only when explicitly assigned to a `Maker` row** in the Dispatch Queue.
   - **`Gemini 4 Hydrogen` (`Default Maker & Default Orchestrator`)**: Allowed to directly edit `src/**`, `sql/**`, and tests when acting as `Maker`, and handles standard Run registration/closeout (avoiding unrequested `src/**` edits during pure orchestration or review steps).
2. **Hybrid Delegation Protocol**:
   - **Immediate Internal Subagent Delegation (`Gemini 3.8 Flash` $\to$ `Model: "flash"`)**:
     - For UI/Tailwind styling, badge/modal/drawer markup, fast codebase search, and `docs/` synchronization tasks, the active Gemini Orchestrator (`Hydrogen`, `Neon`, or `Argon`) delegates immediately by invoking an internal subagent (`define_subagent` with `enable_write_tools: true` for file edits, and `invoke_subagent` with **`Model: "flash"`**).
   - **Dispatch Queue Assignment (`Gemini 4 Hydrogen / Neon / Argon`, `GPT Codex`, `Claude Sonnet / Opus`, `GitHub Copilot`)**:
     - Register multi-step or cross-model tasks in `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` with status **`▶ READY`** (after running `New-CollaborationRun.ps1` if isolated execution is needed), end the turn, and instruct the user to switch to the assigned model and input **`"인수인계 문서를 확인해"`**.

## 3. Handoff Execution & Emergency Handover

- The `"인수인계 문서를 확인해"` procedure, hard-cutoff recovery, Docker precheck and emergency handover checkpoint are defined only in the handoff skill (`.agents/skills/handoff/SKILL.md`).
- Document updates after each step follow `.agents/skills/chronoledger-docs-closeout/SKILL.md`.
