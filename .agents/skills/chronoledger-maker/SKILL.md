---
name: chronoledger-maker
description: Implement a scoped ChronoLedger Dispatch Queue Maker step inside its assigned worktree, commit it, and report changes and verification honestly. Use when your queue row's role is Maker.
---

# ChronoLedger Maker

- Read the queue row, its acceptance criteria and the run manifest (`artifacts/<run_id>/run.json` inside the worktree) before editing. Work only in the assigned worktree (`.worktrees/<run_id>` or `main`) and allowed files.
- Check and preserve existing changes first. Do not make product or deployment decisions the documents leave open; name the decision needed instead.
- If the work hits a promotion condition you are not tier-assigned for (money, ledger, points, RLS or SQL/RPC, async/browser-lifecycle edge cases, 3+ modules of restructuring), stop, save your work and hand over along your own tier in `.agents/rules/collaboration.md` §1–§2. Implementation-only promotion uses `⚠️ HANDOVER_NEEDED` (handoff skill §3): Claude Sonnet → Claude Opus; Gemini 4 Hydrogen / GitHub Copilot → Gemini 4 Neon or Claude Opus. When a spec, open design, security or ledger judgment is needed, models other than the Chief Architect and its Fallback 1 never decide it themselves: record a `📐 SPEC_NEEDED` row with a `요구사항 접수 기록` for `Gemini 4 Carbon` (Fallback: Claude Opus / Gemini 4 Neon). A row explicitly assigned to a promoted tier (Opus, Neon Maker, GPT Codex) continues. For SQL work follow `chronoledger-sql-migration`.
- Follow the project code rules in `CLAUDE.md`/`AGENTS.md` (semantic color tokens, `isOffline()` guards on writes, single Supabase client, colocated `*.test.ts(x)`).
- Verify before committing: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check`. Report only checks you actually ran.
- Commit inside the worktree. Do not edit the run manifest or write reviewer/test artifacts; the Reviewer copies your Target SHA into `run.json`.
- Right after the implementation commit, record the milestone (handoff skill §1 step 7): set your row to `✅ DONE (SHA: <full SHA>)`, the Run block's `Target SHA` line and the next row to `▶ READY`, and commit the root `docs/handoff.md` alone.
- Then write the handoff record: the full 40-character Target SHA (`git rev-parse HEAD`), changed files, decisions/assumptions, checks and results, and remaining work; then close out docs with `chronoledger-docs-closeout`.
- If local DB checks could not run because this PC has no Docker CLI (`chronoledger-sql-migration` §4), finish every other check, commit, and write `⚠️ LOCAL_DB_DEFERRED` in the Run block's DB line and your record instead of stopping.
- Pushing is outward-facing: do not push unless the user asked. Record `원격 브랜치: push함 / 안 함` in your record; when the next step may run on another PC, ask the user to approve `git -C .worktrees/<run_id> push -u origin collab/<run_id>`.
- Where the harness offers a lightweight subagent (Antigravity `invoke_subagent` with `Model: "flash_lite"` or `"inherit"`), you may delegate read-only multi-file search and plain markup/styling drafts. Never delegate SQL/RPC/RLS, money/date/point logic, commits or queue status changes, and check every delegated edit in the diff yourself.
