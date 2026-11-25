---
name: chronoledger-reviewer
description: Perform a read-only static review of a ChronoLedger change between an exact Base SHA and Target SHA and write schema-valid review.json and test.json artifacts. Use when your Dispatch Queue row's role is Reviewer.
---

# ChronoLedger Reviewer

- Use the exact Base SHA from the run manifest (or the Run block for `main` runs) and the Target SHA the last Maker recorded in the root `docs/handoff.md`. Never review a moving working tree as if it were the target commit. If a SHA, criteria or context is missing, mark the step `🛑 BLOCKED` and say what is missing.
- Range check before reviewing: resolve the Target to its full SHA (`git rev-parse <sha>^{commit}`), confirm it is an ancestor of the workspace `HEAD` (`git merge-base --is-ancestor <Target> HEAD`) and that `git diff <Target> HEAD -- src sql` is empty. Any failure → `🛑 BLOCKED`; never pick a range from the commit history yourself.
- Worktree runs: if `run.json` has `target_sha: null` (or an older SHA), set only `target_sha` to that full SHA and commit it together with `review.json`/`test.json` in the artifact commit. Artifact commits touch only `artifacts/<run_id>/`, so the reviewed range stays `Base..Target`. Copy `run_id`, `base_sha` and `target_sha` into both artifacts from the manifest; the validator checks only the schema, so compare them yourself.
- If the queue row points to a design document (for example `docs/<topic>-design.md §N`), read those sections; they are part of the acceptance criteria.
- Review only the requested change and its dependencies against the acceptance criteria. Do not edit implementation files.
- Each finding needs severity (`P1`–`P4`), file, line, evidence, impact and recommendation. With no findings, describe the reviewed scope and evidence.
- Re-run the project checks on the target: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`, and for SQL changes the local run in `chronoledger-sql-migration` §4. Record skipped checks as `skipped`, never as passed.
- **Local DB merge gate**: if `git diff --name-only <Base> <Target> -- sql` is non-empty (whether or not the Run says `⚠️ LOCAL_DB_DEFERRED`), the Run must not be merged into `main` until `test.json` records the migration applied twice and `TESTS.sql` passing on a local Supabase. If Docker is unavailable here, still write `review.json` and a `test.json` with the DB check `skipped`, then set the merge step to `🛑 BLOCKED (로컬 DB 검증 대기)` and do not merge. A SQL defect found by the local run goes back to a Maker iteration.
- Write `artifacts/<run_id>/iteration-NN/review.json` (role `static-review`) and `test.json` (role `dynamic-test`) inside the worktree; take run/SHA metadata from the manifest, not from model output; no secrets or raw sensitive logs.
- Validate both files (the script needs both flags):
  - `python scripts/collaboration/validate_collaboration_artifact.py --artifact <path>/review.json --schema artifacts/schemas/review.schema.json`
  - `python scripts/collaboration/validate_collaboration_artifact.py --artifact <path>/test.json --schema artifacts/schemas/test.schema.json`
- Commit the artifacts in the worktree. Then record the milestone at once (handoff skill §1 step 7): set your row to `🔄 IN_PROGRESS (산출물 커밋 <sha>, 병합 전)` and commit the root `docs/handoff.md` alone. If your row also merges into `main`, record `🔄 IN_PROGRESS (main 병합 <sha>, 재검증·문서 마감 남음)` the same way right after the merge, before the post-merge checks.
- When everything in the row is done, set your row to `✅ DONE (SHA: <artifact commit>)`, set the next step to `▶ READY`, and close out docs with `chronoledger-docs-closeout`.
