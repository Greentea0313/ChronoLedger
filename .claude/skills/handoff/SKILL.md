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
2. **Pick the task**: `⚠️ HANDOVER_NEEDED` first (resume from `### 📌 중단 체크포인트`, skip finished parts), otherwise the single `▶ READY` row. Rows in the reservation summary (`📝 AGENDA`, 보류, 예약) are never auto-started.
3. **Hard-cutoff recovery**: if a previous model stopped without updating status (row still `▶ READY` or `🔄 IN_PROGRESS`), run `git status --short` and `git diff` in the target workspace (`.worktrees/<run_id>` or `main`) and preserve its uncommitted changes before continuing.
4. **Load the role skill** for the row: Maker → `chronoledger-maker`, Reviewer → `chronoledger-reviewer`, Orchestrator → `chronoledger-orchestrator`. For SQL/RPC/RLS work also load `chronoledger-sql-migration`.
5. **Respect scope**: work only in the row's worktree and allowed files, against its acceptance criteria. Edits, tests and commits happen inside `.worktrees/<run_id>`; queue updates go to the root `docs/handoff.md`.
6. **Baton touch**: when done (Maker: after the commit), set your row to `✅ DONE (SHA: <sha>)` and the next `⏳ WAITING` row to `▶ READY`. On an unresolvable blocker set `🛑 BLOCKED` and report.
7. **Close out docs** with the `chronoledger-docs-closeout` skill, then report: what was done, verification evidence, and the next model (with fallbacks) to call with `"인수인계 문서를 확인해"`.

## 2. Docker Desktop precheck

For tasks that need local Supabase (marked `🐳`), run `docker version` before starting. If the engine is not running or Docker is missing, stop immediately and tell the user "Docker Desktop을 켜고 `Engine running` 확인 필요" instead of doing other work while waiting.

## 3. Emergency handover (token/context budget)

- Track whether the remaining budget is likely to be enough; never claim an exact remaining amount.
- If completion is at risk, tell the user early, save all file edits, then in `docs/handoff.md`:
  1. set the row to `⚠️ HANDOVER_NEEDED`;
  2. change the assigned model to `~~Current Model~~ ➡️ [Fallback Model]` (fallback chain: `.agents/rules/collaboration.md` §1);
  3. under `### 📌 중단 체크포인트 (Handover Checkpoint)` record ① completed files/tasks, ② remaining concrete tasks, ③ decisions/assumptions, ④ tests run.
- Final message: "토큰/컨텍스트 한도로 체크포인트 남김. **[대체 모델명]**으로 전환 후 `'인수인계 문서를 확인해'` 입력 필요."
