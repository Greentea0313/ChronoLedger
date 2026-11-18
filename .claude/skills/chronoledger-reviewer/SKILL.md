---
name: chronoledger-reviewer
description: Perform a read-only static review of a ChronoLedger change between an exact Base SHA and Target SHA and write schema-valid review.json and test.json artifacts. Use when your Dispatch Queue row's role is Reviewer.
---

# ChronoLedger Reviewer

- Use the exact Base and Target SHA from the queue row (or run manifest). Never review a moving working tree as if it were the target commit. If a SHA, criteria or context is missing, mark the step `🛑 BLOCKED` and say what is missing.
- For `main` runs without a manifest, first confirm `git diff <Target> HEAD -- src sql` is empty.
- Review only the requested change and its dependencies against the acceptance criteria. Do not edit implementation files.
- Each finding needs severity (`P1`–`P4`), file, line, evidence, impact and recommendation. With no findings, describe the reviewed scope and evidence.
- Re-run the project checks on the target: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`, and for SQL changes the local run in `chronoledger-sql-migration` §4. Record skipped checks as `skipped`, never as passed.
- Write `artifacts/<run_id>/iteration-NN/review.json` (role `static-review`) and `test.json` (role `dynamic-test`) inside the worktree; take run/SHA metadata from the manifest, not from model output; no secrets or raw sensitive logs.
- Validate both files (the script needs both flags):
  - `python scripts/collaboration/validate_collaboration_artifact.py --artifact <path>/review.json --schema artifacts/schemas/review.schema.json`
  - `python scripts/collaboration/validate_collaboration_artifact.py --artifact <path>/test.json --schema artifacts/schemas/test.schema.json`
- Commit the artifacts in the worktree, set your row to `✅ DONE (SHA: <artifact commit>)`, set the next step to `▶ READY`, and close out docs with `chronoledger-docs-closeout`.
