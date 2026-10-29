---
trigger: always_on
description: Enforces ChronoLedger 5-model AI collaboration roles, fallback chains, Active Dispatch Queue execution on "인수인계 문서를 확인해", and token-exhaustion emergency handover across all sessions.
---

# ChronoLedger 5-Model AI Collaboration & Emergency Handover Rules

## 1. 5-Model Roles & Token-Exhaustion Fallback Matrix

| Primary Model / Agent | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(Chief)* | `Orchestrator & Architect` | Requirements breakdown, acceptance criteria, worktree creation (`New-CollaborationRun.ps1`), dispatch queue allocation, final verification, docs closeout | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/KST date sync (`subscription-sync.ts`), Supabase SQL/RPC, Vitest unit tests | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent under Argon, `docs/` sync assistance | **GitHub Copilot** | **Gemini 4 Argon** |

> **💡 Claude Pro Sonnet / Opus 2-Tier Operating Criteria (Token Optimization)**:
>
> - Operate both **`Claude Sonnet`** and **`Claude Opus`** from the user's Claude Pro subscription. Default to Sonnet, promoting to Opus only when one of the promotion conditions below applies to minimize quota consumption.
> - **Claude Sonnet (Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
> - **Claude Opus (Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Argon` and `GPT Codex`.
> - **Opus Promotion Conditions** (Assign Opus if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to Opus via `⚠️ HANDOVER_NEEDED`.

## 2. Chief Orchestrator (Gemini 4 Argon) No-Direct-Implementation Rule & Hybrid Delegation

1. **Strict Prohibition of Direct Source Code Implementation**:
   - As `Orchestrator & Architect`, **Gemini 4 Argon** focuses exclusively on requirements intake, acceptance criteria specification, worktree setup, task dispatching, and final verification. **Argon must NEVER directly edit product implementation source code (`src/**`).**
2. **Hybrid Delegation Protocol (User-Mandated)**:
   - **Immediate Internal Subagent Delegation (`Gemini 3.8 Flash` $\to$ `Model: "flash"`)**:
     - For UI/Tailwind styling, badge/modal/drawer markup, fast codebase search, and `docs/` synchronization tasks, Argon must delegate immediately by invoking an internal subagent (`define_subagent` with `enable_write_tools: true` for file edits, and `invoke_subagent` with **`Model: "flash"`** — explicitly designated tier).
   - **External Model Dispatch Queue Assignment (`GPT Codex`, `Claude Sonnet / Opus`, `GitHub Copilot`)**:
     - For core ledger/payment/subscription logic and Vitest tests (**GPT Codex**), static code review (`review.json`), security/RLS verification, and complex refactoring (**Claude Sonnet / Opus** following the 2-tier criteria), or general feature implementation (**GitHub Copilot**), Argon registers the task in `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` with status **`▶ READY`** (after running `New-CollaborationRun.ps1` if isolated execution is needed). Argon then ends the turn immediately and instructs the user to switch to the assigned model and input **`"인수인계 문서를 확인해"`**.

## 3. "인수인계 문서를 확인해" Auto-Execution & Emergency Handover Protocol

1. **Automatic Execution**: When the user inputs **`"인수인계 문서를 확인해"`** (or any variation requesting handoff check), immediately inspect `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` and execute the active task with status **`⚠️ HANDOVER_NEEDED`** (1st priority) or **`▶ READY`** (2nd priority) without asking clarifying questions.
2. **Hard Cutoff Auto-Recovery**: If a previous model was terminated abruptly by quota/context limits without updating the status (`▶ READY` or `🔄 IN_PROGRESS`), the replacement model must inspect `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) to identify and preserve uncommitted changes before continuing the remaining acceptance criteria.
3. **Emergency Handover on Token Exhaustion (`⚠️ HANDOVER_NEEDED`)**:
   - If remaining tokens or context budget are insufficient to safely finish the task, safely save all current file edits, update the task status in `docs/handoff.md` Dispatch Table to **`⚠️ HANDOVER_NEEDED`**, and update `Assigned Model` to **`~~Current Model~~ ➡️ [Fallback Model]`**.
   - Record **① Completed files/tasks, ② Remaining concrete tasks, ③ Decisions/assumptions, ④ Tests executed** in `### 📌 중단 체크포인트 (Handover Checkpoint)`, then instruct the user to switch to the replacement model and input `"인수인계 문서를 확인해"`.
4. **Post-Completion Documentation Sync**: After meaningful development work, update `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` (and `docs/architecture.md` if system structure changed).
