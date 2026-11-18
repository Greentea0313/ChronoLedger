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
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Hydrogen** / **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 4 Hydrogen** / **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent under Argon, `docs/` sync assistance | **Gemini 4 Hydrogen** | **GitHub Copilot** |

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
   - **Dispatch Queue Assignment (`Gemini 4 Hydrogen`, `GPT Codex`, `Claude Sonnet / Opus`, `GitHub Copilot`)**:
     - For feature/UI/test implementation, static review assistance, or sub-orchestration (**Gemini 4 Hydrogen**), core ledger/payment/subscription logic and Vitest tests (**GPT Codex**), static code review (`review.json`), security/RLS verification, and complex refactoring (**Claude Sonnet / Opus** following the 2-tier criteria), or general feature implementation (**GitHub Copilot**), Argon registers the task in `## 🎯 Active AI Collaboration Dispatch Queue` at the top of `docs/handoff.md` with status **`▶ READY`** (after running `New-CollaborationRun.ps1` if isolated execution is needed). Argon then ends the turn immediately and instructs the user to switch to the assigned model and input **`"인수인계 문서를 확인해"`**.

## 3. Handoff Execution & Emergency Handover

- The `"인수인계 문서를 확인해"` procedure, hard-cutoff recovery, Docker precheck and emergency handover checkpoint are defined only in the handoff skill (`.agents/skills/handoff/SKILL.md`).
- Document updates after each step follow `.agents/skills/chronoledger-docs-closeout/SKILL.md`.
