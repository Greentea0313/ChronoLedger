---
trigger: always_on
description: Keep all ChronoLedger project documentation inside docs/ (finished records in docs/archive/), never in external session directories.
---

# Project Document Location Rule

- Store all project documentation (specs, design notes, progress, guides) inside the repository `docs/` directory, never in external session directories (e.g. `brain/...`), so it stays under Git.
- Finished run records and old log entries go to `docs/archive/` (see `.agents/skills/chronoledger-docs-closeout/SKILL.md`). Writing style: [`language.md`](language.md).
