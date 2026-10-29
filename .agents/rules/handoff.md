# Handoff Documentation & Multi-Agent Dispatch Protocol

After each meaningful development session, update the relevant documentation in `docs/`. In addition, `docs/handoff.md` serves as the active blackboard (Dispatch Queue) for multi-model collaboration.

## 0. Orchestrator Intake & Hybrid Delegation on New Requests (Gemini 4 Argon)

When the user enters a new feature request or fix to the Chief Orchestrator (**Gemini 4 Argon**), unless the user explicitly instructs to *"implement it directly"*, Argon never directly modifies product source code (`src/**`) and executes the following **Hybrid Delegation Protocol**:

1. Analyze requirements and existing code, establish clear **Acceptance Criteria**, and design structured subtasks (Maker $\to$ Reviewer $\to$ Orchestrator closeout). If isolated execution is needed, run `scripts/collaboration/New-CollaborationRun.ps1` to create `.worktrees/<run_id>`.
2. Update **`## 🎯 Active AI Collaboration Dispatch Queue`** at the top of the root `docs/handoff.md`, assigning the primary model and fallback chain for each step, and setting Step 1 to **`▶ READY`**.
3. Summarize the queue for the user and instruct which model to switch to and prompt with **`"인수인계 문서를 확인해"`**.

## 1. "인수인계 문서를 확인해" (Handoff Dispatch Trigger Protocol)

When the user enters **`"인수인계 문서를 확인해"`** (or any request to check handoff documentation), the agent must immediately execute this **5-step protocol** without asking clarifying questions:

1. **Scan Dispatch Queue**: Read `## 🎯 Active AI Collaboration Dispatch Queue` at the top of the root `docs/handoff.md`.
2. **Identify Target Task (Priority Order)**:
   - **1st Priority (`⚠️ HANDOVER_NEEDED`)**: Pick this first if a previous model handed over work due to token/context exhaustion. Read `### 📌 중단 체크포인트 (Handover Checkpoint)` below the queue, skip finished parts, and resume remaining work.
   - **2nd Priority (`▶ READY`)**: Select the current pending active task.
   - **Hard Cutoff Auto-Recovery**: If a prior model ended abruptly due to API quota/token limits without updating status to `⚠️ HANDOVER_NEEDED` (leaving it as `▶ READY` or `🔄 IN_PROGRESS`), the replacement fallback model must immediately inspect `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) to identify and preserve uncommitted changes before completing remaining criteria.
3. **Respect Workspace & Scope**:
   - Strictly follow the assigned `Worktree Path` (`.worktrees/<run_id>` or `main`), `Allowed Files`, and `Acceptance Criteria` for the assigned role (Maker / Reviewer / Orchestrator).
   - For isolated worktrees created by `New-CollaborationRun.ps1`, perform edits, tests, and commits inside `.worktrees/<run_id>`, while recording queue updates in the root `docs/handoff.md`.
4. **Baton Touch (State Transition)**:
   - Upon completing the task (and creating git commit for Maker), update own row in the root `docs/handoff.md` to `✅ DONE (SHA: <commit_sha>)` and advance the next step from `⏳ WAITING` to `▶ READY`.
   - If an unresolvable blocker is encountered, mark status as `🛑 BLOCKED` and report to the user.
5. **Report Results**: Clearly report completed work, verification evidence, and the **next AI model (and fallbacks)** to invoke.

## 2. 5-Model Role Distribution & Fallback Matrix

When the Orchestrator breaks down tasks into the Dispatch Queue, use this role distribution and fallback chain. Always specify **`Primary Model (Fallback: 1st / 2nd)`** in the table:

| Primary Model / Agent | Pipeline Role | ChronoLedger Domain Ownership | **Fallback 1** | **Fallback 2** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(Chief)* | `Orchestrator & Architect` | Requirements breakdown, acceptance criteria, worktree/dispatch queue allocation, architecture decisions, final verification, docs closeout | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | Ledger/payment/refund formulas (`payment-calculations.ts`), subscription/date sync (`subscription-sync.ts`), Supabase RPC/SQL, Vitest unit tests | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA static code review (`review.json`), security/RLS/ledger integrity verification, multi-component state & interaction refactoring | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | Standard features, routing, and UI components (`src/app/`, `src/components/`); universal backup when other models exhaust token quota | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind styling, badge/modal/drawer markup, high-speed codebase search subagent under Argon, `docs/` sync assistance | **GitHub Copilot** | **Gemini 4 Argon** |

> Claude tasks must follow the **Sonnet / Opus 2-Tier Operating Criteria** in [`.agents/rules/collaboration.md`](collaboration.md) (default to Sonnet, promote to Opus when one of the 4 conditions applies).

## 3. Limited Context or Token Budget (Emergency Handover)

- Keep track of whether the remaining context or token budget is likely to be insufficient to finish the requested work reliably. Do not claim an exact remaining amount unless the environment provides it.
- If completion is at risk, tell the user promptly before running out of context. Save current file edits safely, then update the task row in `docs/handoff.md` Dispatch Queue:
  1. Set status to **`⚠️ HANDOVER_NEEDED`**.
  2. Update `Assigned Model` to `~~Current Model~~ ➡️ [Fallback Model]`.
  3. Record **① Completed work (modified files/functions), ② Remaining concrete tasks, ③ Decisions/assumptions, ④ Tests executed** in `### 📌 중단 체크포인트 (Handover Checkpoint)` and `docs/progress.md`.
- Save current project-file edits and preserve unfinished work. Do not leave the user with only a chat summary when a durable project checkpoint can be written.
- In the final response, instruct the user: *"토큰/컨텍스트 한도로 체크포인트를 남겼습니다. **[대체 모델명]**으로 전환하여 `'인수인계 문서를 확인해'`라고 입력해 주세요."*

## 4. Required Updates

- Update `docs/progress.md` after every meaningful session with current project state, work completed, active or blocked work, and next concrete steps. Keep it concise and current.
- Update `docs/architecture.md` when files, folders, modules, responsibilities, or project structure change.
- Update `docs/handoff.md` with what was done, why it was done, current state, and recommended next steps (and update the top Dispatch Queue state).
- Update `docs/changelog.md` when behavior, features, fixes, refactors, or documentation meaningfully changed.
- Update `docs/to-do.md` by marking completed work and adding remaining tasks as clear, actionable items.
- Update `docs/known-pitfalls.md` when a repeated failure pattern, fragile behavior, blocker, or useful workaround is discovered.

## 5. Rules

- Keep entries concise, factual, and useful for the next AI agent or developer.
- Preserve the existing format of each documentation file.
- Do not rewrite entire documents unless the current content is outdated or misleading.
- Do not claim work is complete unless it was actually completed.
- If something is uncertain, mark it as needing verification.
- Avoid duplicate information across files unless each file needs different context.

## 6. Completion Summary

Before finishing, report:

- Current project state, Dispatch Queue status, and checkpoint location (if handover checkpoint was needed).
- Which next AI model should be invoked with `"인수인계 문서를 확인해"` (if steps remain in queue).
- Which documentation files were updated.
- What major changes were recorded.
- What remaining tasks were added.
- What pitfalls or blockers were documented.
- Which expected files were not updated, and why.
