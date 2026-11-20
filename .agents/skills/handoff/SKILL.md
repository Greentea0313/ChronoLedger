---
name: handoff
description: Execute the active ChronoLedger Dispatch Queue task when the user says "인수인계 문서를 확인해" (or asks to check the handoff document), and write an emergency handover checkpoint when token or context budget runs low. Use in any coding agent working in this repository.
license: MIT
---

# ChronoLedger Handoff Protocol

`docs/handoff.md` is the shared blackboard for multi-model work. Its top section `## 🎯 Active AI Collaboration Dispatch Queue` holds the active Run, the handover checkpoint, a reservation summary and the latest finished Run. Finished Run records live in `docs/archive/handoff-archive.md`; read that file only when a task points to one of its sections.

## 1. "인수인계 문서를 확인해" trigger

Run these steps immediately, without clarifying questions:

1. **Read the queue**: read only the top of the root `docs/handoff.md` (it is short by design).
2. **Pick the task**: `⚠️ HANDOVER_NEEDED` first (resume from `### 📌 중단 체크포인트`, skip finished parts), then a `📐 SPEC_NEEDED` row, otherwise the single `▶ READY` row. Rows in the reservation summary (`📝 AGENDA`, 보류, 예약) are never auto-started.
   - `📐 SPEC_NEEDED` is a Chief Architect escalation (`.agents/rules/collaboration.md` §2). Only `Gemini 4 Argon` or its Fallback 1 (`Claude Opus`, `Gemini 4 Neon`) executes it: read its `요구사항 접수 기록`, write the spec/decision and per-Step acceptance criteria (question cards for product decisions, no `src/**` edits), set it to `✅ DONE` and set the returned `Gemini 4 Hydrogen` Orchestrator row to `▶ READY`. Any other model that finds this row stops and tells the user to switch to `Gemini 4 Argon` (or `Claude Opus` / `Gemini 4 Neon`).
3. **Hard-cutoff recovery**: if a previous model stopped without updating status (row still `▶ READY` or `🔄 IN_PROGRESS`), run `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) and preserve its uncommitted changes before continuing.
4. **Load the role skill** for the row: Maker → `chronoledger-maker`, Reviewer → `chronoledger-reviewer`, Orchestrator → `chronoledger-orchestrator`. For SQL/RPC/RLS work also load `chronoledger-sql-migration`.
5. **Restore the workspace** (multi-PC): if `.worktrees/<run_id>` or the recorded Target SHA is missing locally, run `git fetch origin collab/<run_id>` before blocking. If the remote branch exists, recreate the worktree with `git worktree add --track -b collab/<run_id> .worktrees/<run_id> origin/collab/<run_id>` (when the local branch is missing too), or update an existing clean worktree with `git -C .worktrees/<run_id> pull --ff-only`. Never reset, force or overwrite local changes; a dirty worktree or a non-fast-forward pull is `🛑 BLOCKED`. If the remote branch or Target SHA is still missing, set `🛑 BLOCKED` and ask the user to run `git -C .worktrees/<run_id> push -u origin collab/<run_id>` on the previous PC.
6. **Respect scope**: work only in the row's worktree and allowed files, against its acceptance criteria. Edits, tests and commits happen inside `.worktrees/<run_id>`; queue updates go to the root `docs/handoff.md`.
7. **Baton touch**: when done (Maker: after the commit), set your row to `✅ DONE (SHA: <sha>)` and the next `⏳ WAITING` row to `▶ READY`. On an unresolvable blocker set `🛑 BLOCKED` and report.
8. **Close out docs** with the `chronoledger-docs-closeout` skill, then report: what was done, verification evidence, and the next model (with fallbacks) to call with `"인수인계 문서를 확인해"`.

## 2. Docker Desktop precheck

For tasks that need local Supabase (marked `🐳`), check Docker before starting (`chronoledger-sql-migration` §4):

- **Docker installed, engine stopped** (`docker version` has no Server part): stop immediately and tell the user "Docker Desktop을 켜고 `Engine running` 확인 필요" instead of doing other work while waiting.
- **No Docker CLI on this PC**: a Maker continues without the local DB run and records `⚠️ LOCAL_DB_DEFERRED`; a Reviewer writes the artifacts but does not merge (`🛑 BLOCKED (로컬 DB 검증 대기)`). Tell the user that the remaining step needs a PC with Docker.

## 3. Emergency handover (token/context budget)

- Track whether the remaining budget is likely to be enough; never claim an exact remaining amount.
- If completion is at risk, tell the user early, save all file edits, then in `docs/handoff.md`:
  1. set the row to `⚠️ HANDOVER_NEEDED`;
  2. change the assigned model to `~~Current Model~~ ➡️ [Fallback Model]` (fallback chain: `.agents/rules/collaboration.md` §1);
  3. under `### 📌 중단 체크포인트 (Handover Checkpoint)` record ① completed files/tasks, ② remaining concrete tasks, ③ decisions/assumptions, ④ tests run.
- Final message: "토큰/컨텍스트 한도로 체크포인트 남김. **[대체 모델명]**으로 전환 후 `'인수인계 문서를 확인해'` 입력 필요."
