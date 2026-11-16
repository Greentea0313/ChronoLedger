---
trigger: always_on
description: Enforces ChronoLedger 5-model AI collaboration roles, fallback chains, Active Dispatch Queue execution on "인수인계 문서를 확인해", and token-exhaustion emergency handover across all sessions.
---

# ChronoLedger 6-Model AI Collaboration & Emergency Handover Rules

## 1. 6-Model Roles & Token-Exhaustion Fallback Matrix

| Primary Model / Agent | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(Chief)* | `Orchestrator & Architect` | Requirements breakdown, acceptance criteria, worktree creation (`New-CollaborationRun.ps1`), dispatch queue allocation, final verification, docs closeout | **Gemini 4 Hydrogen** / **Claude Opus** | **GitHub Copilot** |
| **Gemini 4 Hydrogen** | `Maker (Feature·UI·Test) & Sub-Orchestrator/Reviewer` | Standard & composite features/UI (`src/app/`, `src/components/`, `src/lib/`), Vitest unit/integration tests, static code review (`review.json`) & orchestration assistance; primary 1st-tier fallback & quota-saving partner for Argon, Claude Sonnet, and GPT Codex | **Claude Sonnet / Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/KST date sync (`subscription-sync.ts`), Supabase SQL/RPC, Vitest unit tests | **Claude Opus** / **Gemini 4 Hydrogen** | **GitHub Copilot** |
| **Claude (Sonnet / Opus / Fable)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Hydrogen** / **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 4 Hydrogen** / **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent under Argon, `docs/` sync assistance | **Gemini 4 Hydrogen** | **GitHub Copilot** |

> **💡 Claude Sonnet / Opus / Fable 3-Tier Operating Criteria (Token Optimization)**:
>
> - Operate **`Claude Sonnet`**, **`Claude Opus`**, and **`Claude Fable 5.2`** (`claude-fable-5-2`, top-tier promotion model). Default to Sonnet, promote to Opus only when an Opus promotion condition applies, and promote to Fable only when a Fable promotion condition applies, to minimize quota consumption.
> - **Claude Sonnet (Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
> - **Claude Opus (Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Argon` and `GPT Codex`.
> - **Opus Promotion Conditions** (Assign Opus if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to Opus via `⚠️ HANDOVER_NEEDED`.
> - **Claude Fable 5.2 (Top-Tier Escalation · Exceptional Use Only)**: Final authority for the highest-risk design, audit, and review decisions where a mistake would corrupt production money/ledger data or lock in the architecture. Fable decides, designs, or reviews; follow-up implementation returns to Opus or Sonnet unless a Fable condition still applies.
> - **Fable Promotion Conditions** (Assign Fable only if a condition is met; each is a stricter subset of the Opus conditions): Ⓕ① New or signature-changing `SECURITY DEFINER` RPCs, triggers, or RLS policy redesign on money/ledger/points paths (payment, refund, balance adjustment, budget attribution), or a production migration that rewrites existing financial rows, Ⓕ② Escalation after Opus: a blocker/high finding still unresolved after 2 Opus review iterations, or an unresolved conflict between Opus and another model's verification, Ⓕ③ Hard-to-reverse project-wide architecture decisions (introducing a server runtime, changing the auth/session flow, restructuring the data model, or a full redesign of the collaboration rules — not incremental rule edits), Ⓕ④ Final integrated review of a Run that meets Ⓕ① before it is merged to `main` or applied to production. If Opus discovers any of these conditions during work, hand over to Fable via `⚠️ HANDOVER_NEEDED`.
> - **Fable Quota Fallback**: If Fable is unavailable or exhausts its quota, Claude Opus takes over, marks the step row `Fable 미수행`, and the user decides whether to wait for Fable re-verification before merging or applying to production.

## 2. Chief Orchestrator (Gemini 4 Argon) No-Direct-Implementation Rule & Hybrid Delegation

1. **Strict Prohibition of Direct Source Code Implementation**:
   - As `Orchestrator & Architect`, **Gemini 4 Argon** focuses exclusively on requirements intake, acceptance criteria specification, worktree setup, task dispatching, and final verification. **Argon must NEVER directly edit product implementation source code (`src/**`).**
2. **Hybrid Delegation Protocol (User-Mandated)**:
   - **Immediate Internal Subagent Delegation (`Gemini 3.8 Flash` $\to$ `Model: "flash"`)**:
     - For UI/Tailwind styling, badge/modal/drawer markup, fast codebase search, and `docs/` synchronization tasks, Argon must delegate immediately by invoking an internal subagent (`define_subagent` with `enable_write_tools: true` for file edits, and `invoke_subagent` with **`Model: "flash"`** — explicitly designated tier).
   - **Dispatch Queue Assignment (`Gemini 4 Hydrogen`, `GPT Codex`, `Claude Sonnet / Opus / Fable`, `GitHub Copilot`)**:
     - For feature/UI/test implementation, static review assistance, or sub-orchestration (**Gemini 4 Hydrogen**), core ledger/payment/subscription logic and Vitest tests (**GPT Codex**), static code review (`review.json`), security/RLS verification, and complex refactoring (**Claude Sonnet / Opus** following the 2-tier criteria), or general feature implementation (**GitHub Copilot**), Argon registers the task in `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` with status **`▶ READY`** (after running `New-CollaborationRun.ps1` if isolated execution is needed). Argon then ends the turn immediately and instructs the user to switch to the assigned model and input **`"인수인계 문서를 확인해"`**.

## 3. "인수인계 문서를 확인해" Auto-Execution & Emergency Handover Protocol

1. **Automatic Execution**: When the user inputs **`"인수인계 문서를 확인해"`** (or any variation requesting handoff check), immediately inspect `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` and execute the active task with status **`⚠️ HANDOVER_NEEDED`** (1st priority) or **`▶ READY`** (2nd priority) without asking clarifying questions.
2. **Hard Cutoff Auto-Recovery**: If a previous model was terminated abruptly by quota/context limits without updating the status (`▶ READY` or `🔄 IN_PROGRESS`), the replacement model must inspect `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) to identify and preserve uncommitted changes before continuing the remaining acceptance criteria.
3. **Emergency Handover on Token Exhaustion (`⚠️ HANDOVER_NEEDED`)**:
   - If remaining tokens or context budget are insufficient to safely finish the task, safely save all current file edits, update the task status in `docs/handoff.md` Dispatch Table to **`⚠️ HANDOVER_NEEDED`**, and update `Assigned Model` to **`~~Current Model~~ ➡️ [Fallback Model]`**.
   - Record **① Completed files/tasks, ② Remaining concrete tasks, ③ Decisions/assumptions, ④ Tests executed** in `### 📌 중단 체크포인트 (Handover Checkpoint)`, then instruct the user to switch to the replacement model and input `"인수인계 문서를 확인해"`.
4. **Post-Completion Documentation Sync & Communication Style**:
   - After meaningful development work, update `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` (and `docs/architecture.md` if system structure changed).
   - **답과 문서는 한국어 개조식(~함, ~임)으로 쓸 것**: 모든 사용자 응답, 진행/인수인계 보고, 프로젝트 운영 문서는 한국어 개조식 종결어미(`~함`, `~임`, `~됨` 등)로 간결하게 작성함 (기계 판독용 아티팩트 `artifacts/**`, 영문 명세서, 커밋 메시지는 기존 영문 규격 유지).
