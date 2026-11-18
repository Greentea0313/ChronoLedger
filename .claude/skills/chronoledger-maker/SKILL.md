---
name: chronoledger-maker
description: Implement a scoped ChronoLedger Dispatch Queue Maker step inside its assigned worktree, commit it, and report changes and verification honestly. Use when your queue row's role is Maker.
---

# ChronoLedger Maker

- Read the queue row, its acceptance criteria and the run manifest (`artifacts/<run_id>/run.json` inside the worktree) before editing. Work only in the assigned worktree (`.worktrees/<run_id>` or `main`) and allowed files.
- Check and preserve existing changes first. Do not make product or deployment decisions the documents leave open; name the decision needed instead.
- If the work turns out to touch money, ledger, points, RLS or SQL/RPC, async/browser-lifecycle edge cases, or 3+ modules of restructuring, stop and hand over to Claude Opus with `⚠️ HANDOVER_NEEDED` (handoff skill §3). For SQL work follow `chronoledger-sql-migration`.
- Follow the project code rules in `CLAUDE.md`/`AGENTS.md` (semantic color tokens, `isOffline()` guards on writes, single Supabase client, colocated `*.test.ts(x)`).
- Verify before committing: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check`. Report only checks you actually ran.
- Commit inside the worktree. Do not edit the run manifest or write reviewer/test artifacts.
- In the handoff record give the Target SHA, changed files, decisions/assumptions, checks and results, and remaining work; then close out docs with `chronoledger-docs-closeout`.
