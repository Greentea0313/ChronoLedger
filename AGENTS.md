# ChronoLedger Multi-Agent Instructions

This document provides shared guidelines for general coding agents (such as GPT Codex, OpenCode, and GitHub Copilot) entering the ChronoLedger repository.

## 1. Core Rule & Skill References

All agents must consult the following rule files and skill guidelines before starting work:

- [.agents/rules/language.md](.agents/rules/language.md) — Always communicate with the user in Korean (including `ask_question`).
- [.agents/rules/collaboration.md](.agents/rules/collaboration.md) — 5-model AI role distribution, hybrid delegation, and emergency handover rules.
- [.agents/rules/handoff.md](.agents/rules/handoff.md) — `"인수인계 문서를 확인해"` dispatch trigger protocol and documentation update rules.
- [.agents/rules/agent_rules.md](.agents/rules/agent_rules.md) — Think before coding, simplicity first, and surgical changes.
- [.agents/rules/document_location.md](.agents/rules/document_location.md) — Store all project docs in `docs/`, not temporary session directories.
- [.agents/skills/chronoledger-orchestrator/SKILL.md](.agents/skills/chronoledger-orchestrator/SKILL.md) — Orchestrator workflow and isolated worktree coordination.
- [.agents/skills/chronoledger-maker/SKILL.md](.agents/skills/chronoledger-maker/SKILL.md) — Implementation Maker guidelines and worktree boundaries.
- [.agents/skills/chronoledger-reviewer/SKILL.md](.agents/skills/chronoledger-reviewer/SKILL.md) — Read-only static code review and `review.json` generation.
- [.agents/skills/handoff/SKILL.md](.agents/skills/handoff/SKILL.md) — Multi-agent handoff and Active Dispatch Queue execution skill.

## 2. 5-Model Role Distribution & Fallback Matrix

| Primary Model / Agent | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(Chief)* | `Orchestrator & Architect` | Requirements breakdown, acceptance criteria, worktree creation, dispatch queue allocation, final verification, docs closeout | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/date sync (`subscription-sync.ts`), Supabase SQL/RPC, Vitest unit tests | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent under Argon, `docs/` sync assistance | **GitHub Copilot** | **Gemini 4 Argon** |

> **Claude Pro Sonnet / Opus 2-Tier Operating Criteria (Token Optimization)**:
>
> - Operate both **`Claude Sonnet`** and **`Claude Opus`** from the user's Claude Pro subscription. Default to Sonnet, promoting to Opus only when one of the promotion conditions below applies to minimize quota consumption.
> - **Claude Sonnet (Default Maker · Quota Saver)**: UI interactions and state wiring with explicit acceptance criteria and target files (accordions, modals, filters, toggles), page/component edits following existing patterns, Vitest unit test authoring/expansion, low-risk standard static reviews, and `docs/` synchronization.
> - **Claude Opus (Deep Specialist · On Demand)**: High-complexity composite state and browser lifecycle control (History API, async race conditions), architectural refactoring and rule/collaboration design, deep security/RLS/`SECURITY DEFINER` RPC/ledger integrity auditing, Base $\leftrightarrow$ Target SHA integrated static review (`review.json`), Fallback 1 for `Gemini 4 Argon` and `GPT Codex`.
> - **Opus Promotion Conditions** (Assign Opus if any condition is met): ① Modifications to money, ledger, points, RLS, or SQL/RPC, ② Browser lifecycle and async concurrency edge cases, ③ Restructuring across 3+ modules or open architectural design decisions, ④ Run-level integrated reviews. If Sonnet discovers any of these conditions during work, hand over to Opus via `⚠️ HANDOVER_NEEDED`.

## 3. "인수인계 문서를 확인해" 5-Step Execution Protocol

When the user enters **`"인수인계 문서를 확인해"`** (or any request to check handoff documentation), the agent must immediately execute this 5-step protocol without asking clarifying questions:

1. **Scan Dispatch Queue**: Read `## 🎯 Active AI Collaboration Dispatch Queue` at the top of the root `docs/handoff.md`.
2. **Identify Target Task & Auto-Recover Hard Cutoffs**:
   - If a task has status `⚠️ HANDOVER_NEEDED` (1st priority), pick it first and resume unfinished work from `### 📌 중단 체크포인트 (Handover Checkpoint)`.
   - Otherwise, select the task with status `▶ READY` (2nd priority).
   - If a previous model stopped abruptly due to API limits without updating status, inspect `git status --short` and `git diff` in the target workspace to preserve and understand uncommitted changes before continuing.
3. **Respect Workspace & File Boundaries**:
   - Work strictly within the designated workspace (root or `.worktrees/<run_id>`) and allowed file scope to satisfy the Acceptance Criteria.
4. **Baton Touch (State Transition)**:
   - Upon completion, update own row to `✅ DONE (SHA: <commit_sha>)` and advance the next step to `▶ READY`.
   - If token/context budget runs low before completion, set status to `⚠️ HANDOVER_NEEDED`, record checkpoint details, and guide the user to the designated fallback model.
5. **Report Results & Documentation Sync**:
   - Update `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, and `docs/to-do.md`, and report the next model to invoke.

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
