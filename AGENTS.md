# ChronoLedger Multi-Agent Instructions

Shared guidelines for coding agents (GPT Codex, GitHub Copilot, Gemini, OpenCode, …) working in this repository.

## 1. Always Read (short)

- [.agents/rules/language.md](.agents/rules/language.md) — Always answer the user in Korean itemized style (~함, ~임), including questions and summaries.
- [.agents/rules/agent_rules.md](.agents/rules/agent_rules.md) — Think before coding, simplicity first, surgical changes.
- [.agents/rules/document_location.md](.agents/rules/document_location.md) — Project docs live in `docs/`; finished records in `docs/archive/`.

## 2. Read Only When Needed (skills)

Do **not** read these up front. Open a skill only when its situation applies; each one is self-contained.

| Situation | Read |
| :--- | :--- |
| The user says **`"인수인계 문서를 확인해"`** or asks to check the handoff document | [.agents/skills/handoff/SKILL.md](.agents/skills/handoff/SKILL.md) |
| Your queue row is Maker | [.agents/skills/chronoledger-maker/SKILL.md](.agents/skills/chronoledger-maker/SKILL.md) |
| Your queue row is Reviewer | [.agents/skills/chronoledger-reviewer/SKILL.md](.agents/skills/chronoledger-reviewer/SKILL.md) |
| You register, route or close out a Run | [.agents/skills/chronoledger-orchestrator/SKILL.md](.agents/skills/chronoledger-orchestrator/SKILL.md) |
| Any `sql/`, RLS, trigger or RPC change | [.agents/skills/chronoledger-sql-migration/SKILL.md](.agents/skills/chronoledger-sql-migration/SKILL.md) |
| After finishing a step: update `docs/` | [.agents/skills/chronoledger-docs-closeout/SKILL.md](.agents/skills/chronoledger-docs-closeout/SKILL.md) |
| Choosing a model or fallback | [.agents/rules/collaboration.md](.agents/rules/collaboration.md) |

Tools with native project-skill support load these on demand: Google Antigravity reads `.agents/skills/` directly; Claude Code reads the copy in `.claude/skills/` (kept in sync by `scripts/collaboration/Sync-Skills.ps1`). GitHub Copilot and GPT Codex support is unconfirmed, so open the files above manually when their situation applies.

## 3. Key Project Documents & Code Paths

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
  - `docs/archive/*-archive.md` (Finished run records and old log entries; read only when a task points to them)
- **Collaboration Artifacts & Verification Scripts**:
  - `artifacts/schemas/review.schema.json` (Code review JSON schema)
  - `artifacts/schemas/test.schema.json` (Test result JSON schema)
  - `scripts/collaboration/New-CollaborationRun.ps1` (Isolated worktree creation script)
  - `scripts/collaboration/validate_collaboration_artifact.py --artifact <json> --schema <schema>` (Artifact schema validation script)
