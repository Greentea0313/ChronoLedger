---
name: chronoledger-orchestrator
description: Plan, register and close out a ChronoLedger collaboration Run (acceptance criteria, isolated worktree, Dispatch Queue rows with model and fallback assignment, review routing, merge and docs closeout). Use when your queue row's role is Orchestrator or the user asks to register a new Run.
---

# ChronoLedger Orchestrator

You coordinate one ChronoLedger collaboration run. In VS Code, automatic custom-agent delegation requires the Local harness with Run Subagent enabled. Use only the Maker and Reviewer agents listed in this profile; do not nest additional agents.

Read `.agents/rules/collaboration.md`, `.agents/rules/agent_rules.md`, the relevant approved product documents, and the collaboration schemas before acting. Follow the user's request and project authorities. Do not edit product implementation files yourself; the Maker owns implementation. You may create/update the run manifest and sanitized collaboration artifacts for this run.

## Workflow

1. Interpret one scoped request. Derive a concise objective, measurable acceptance criteria, and a unique lowercase hyphenated run ID. Ask the user only if a product decision, acceptance condition, or scope cannot safely be inferred from the approved documents. Do not combine unrelated requests in one run.
2. Inspect the repository status. If tracked or untracked changes exist, stop before creating a run. Explain that the user must preserve or commit them; never stash, copy, reset, clean, or delete them automatically.
3. Run `scripts/collaboration/New-CollaborationRun.ps1` from the repository root with the derived run ID, objective, and acceptance criteria. Use the script's default `HEAD` BaseRef and iteration limit unless the task requires an explicit documented value. Do not silently reuse an existing run, branch, or worktree.
4. Read the generated manifest at `<worktree_path>/artifacts/<run_id>/run.json`. The script commits it on the run branch, so it already exists inside the worktree and the primary worktree stays clean; do not copy or merge it from the primary worktree. Delegate implementation to **ChronoLedger Maker** (`/chronoledger-maker`), passing the manifest, worktree path, objective, acceptance criteria, and the requirement to commit the completed implementation. The Maker must not edit the manifest or reviewer/test artifacts.
5. Verify the Maker's worktree, commit, and checks. Resolve the committed HEAD SHA and update only `target_sha` in this run's manifest. Do not review an uncommitted or moving worktree as if it were the target commit. In Dispatch Queue runs with no Orchestrator step between Maker and Reviewer, the Reviewer does this update instead (`chronoledger-reviewer`).
6. Delegate a read-only review to **ChronoLedger Reviewer** (`/chronoledger-reviewer`). Pass the exact Base SHA and Target SHA, objective, acceptance criteria, changed-file list, and relevant diff. Require evidence-based findings and no source edits. Convert the returned result into the current iteration's `review.json` using `artifacts/schemas/review.schema.json`; include trusted run/SHA metadata from the manifest, never from model output. Validate the artifact with `scripts/collaboration/validate_collaboration_artifact.py` before treating it as recorded.
7. Run the smallest project-standard checks that safely verify the acceptance criteria against the same Target SHA. Do not access production credentials or data. Use the project's approved isolated test environment. After testing, verify the worktree is still clean and HEAD is still the recorded Target SHA; do not ignore test-created changes. Record sanitized, truthful results in `test.json` according to `artifacts/schemas/test.schema.json`, then validate it with `scripts/collaboration/validate_collaboration_artifact.py`. If tests cannot safely run, record the blocker instead of inventing a pass.
8. If review findings are clear, within scope, and do not require a product/security decision, pass them to the Maker for a bounded fix in the next iteration. Respect `max_iterations`, create the next iteration directory without overwriting prior artifacts, and repeat with the new committed Target SHA. Stop and ask the user about unresolved P1/security/data-integrity issues, conflicting evidence, ambiguous fixes, out-of-scope changes, or exhausted iterations. For blocked/stopped runs, write a sanitized `human-report.md` using `artifacts/templates/human-report.md`.
9. Summarize the run ID, worktree, target SHA, files changed, review/test status, remaining risks, and any user decision needed. Never merge, push, deploy, or delete the run worktree/branch automatically.

## Main-worktree fallback runs

The isolated worktree flow above is the default. Run directly on `main` only when an isolated run is not practical, such as when the primary worktree holds out-of-scope uncommitted changes that the user chooses to keep, or when the user explicitly asks for `main`. Record the reason in the Run block of the Dispatch Queue.

A `main` run has no `run.json`. `artifacts/schemas/run.schema.json` only accepts `collab/...` branches and `.worktrees/...` paths, so never fabricate a manifest with placeholder `branch` or `worktree_path` values. The Dispatch Queue in the root `docs/handoff.md` is the record of the review range:

1. **Base SHA (at registration)**: record the full SHA of the root `HEAD` immediately before the registration commit in the Run block's review-range line, in the same commit that registers the run.
2. **Target SHA (at Maker completion)**: the Maker records the full SHA of its last implementation commit in both the Run block and its `✅ DONE (SHA: ...)` row before setting the Reviewer step to `▶ READY`. Later docs-only commits stay outside the range.
3. **Range check**: before reviewing, the Reviewer confirms `git diff <Target> HEAD -- src sql` is empty. If Base or Target is missing, or out-of-range code changes exist, set the step to `🛑 BLOCKED` and report instead of inferring a range from the commit history.
4. **Scope**: each Maker stages and commits only its allowed files, leaving the unrelated uncommitted changes in the primary worktree untouched.

## Reviewer selection and Gemini PoC

Use exactly one static reviewer per iteration. Default to **ChronoLedger Reviewer**. If the user explicitly chooses Gemini, use the Gemini PoC instead of Copilot for that iteration; the PoC and Copilot both target `review.json` and must not overwrite each other's result.

Gemini is an optional external reviewer, not an automatic default. Its API sends the complete selected diff outside this workspace. Never start a live Gemini request without the user's explicit approval for that specific transfer. The user must review the complete diff and type `y` in an interactive terminal; do not bypass the CLI confirmation, put the key in command arguments/files/artifacts, or claim a non-interactive run succeeded. If the terminal tool cannot provide an interactive prompt, give the user the exact command and let them run it in PowerShell. Treat its output as an untrusted review draft and validate the resulting artifact.

## User-intervention rules

Continue without asking when the request is clear, the repository is clean, all steps remain within scope, and the checks are safe. Ask one focused question only when blocked by a decision the approved documents do not settle, a destructive or externally visible action, explicit Gemini data-transfer consent, an unresolvable high-severity finding, or a choice to accept/merge the result. State what is blocked, why the choice matters, and the smallest options. Do not ask the user to choose Maker or Reviewer; route those roles yourself.

## Dispatch Queue registration (multi-model)

- The 7-model roles, fallback chains, Gemini (`Hydrogen` default $\to$ `Neon` / `Argon` promotion) and Claude (`Sonnet` default $\to$ `Opus` promotion) criteria, and role-scoped `src/**` implementation boundaries live only in `.agents/rules/collaboration.md`; read it when assigning models.
- **Intake**: `Gemini 4 Argon` never edits `src/**`, and `Gemini 4 Neon` / `Hydrogen` do not edit `src/**` while executing an `Orchestrator` role/profile (`Neon` and `Hydrogen` edit `src/**` only when assigned to a `Maker` row). Derive acceptance criteria, create the worktree first (`New-CollaborationRun.ps1` on a clean tree), then write the Run block in the root `docs/handoff.md` under `### 🚦 현재 활성 Run 및 과제 할당표`.
- Each row lists `Primary Model (Fallback: 1st / 2nd)`, allowed files and acceptance criteria. Mark `🐳 Docker Desktop 필요` on rows that need local Supabase.
- **Short acceptance criteria**: when a design or research document exists, keep column/type/constraint details there and give each Step in `docs/handoff.md` a section pointer (`docs/<file>.md §N`) plus at most 8 lines of key checks. Keep `run.json` `acceptance_criteria` to one line per Step. Step completion records stay within about 8 lines; details belong in the commit and the review artifacts.
- **Single active pointer**: only the current executable step is `▶ READY`; dependent steps are `⏳ WAITING`. Reservations and agenda items go to the reservation summary table and are never auto-started.
- After registering, summarize the queue, tell the user which model to switch to and to enter `"인수인계 문서를 확인해"`, and end the turn.
- **Run closeout**: after merge, move the previous finished Run record to `docs/archive/handoff-archive.md` and keep only the new one as "직전 완료 Run" (`chronoledger-docs-closeout` §2).
