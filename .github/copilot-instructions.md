# ChronoLedger instructions for GitHub Copilot

- Always follow the root `AGENTS.md` §1 rules. Read a skill from `AGENTS.md` §2 only when its situation applies (do not read all skills up front). The current user request takes precedence over source documents; report conflicts instead of choosing silently.
- Treat `docs/spec/revisions_and_decisions.md` and the approved `docs/spec/SRS.md` as product authorities. Use `docs/spec/SPEC.md` and `sql/SCHEMA.sql` for their respective details. If they conflict, report the conflict and do not silently choose.
- For UI work, read `docs/spec/ChronoLedger_UI_Design_Sheet.md` and use `docs/design-previews/design-v1-ko.html` as a visual reference. Preserve fixed SRS behavior; the sheet marks visual proposals separately. The HTML is a static mockup, not a functional or responsive implementation.
- `docs/archive/Netlify_Web_Architecture_Proposal.md` is a proposal, not an accepted deployment decision. Do not change build/deployment architecture or rewrite SRS decisions based on it alone. Record unresolved choices in `docs/to-do.md` and ask the user when a choice blocks implementation.
- Respect the Web/Android PWA first sequence in `docs/to-do.md`; Windows Tauri OAuth/deep-link/packaging follows the Web/PWA MVP.
- Keep changes scoped, preserve existing user changes, and do not run destructive Git commands or expose secrets. Do not state that a build, test, deployment, or external setting succeeded unless it was actually verified.
- In collaboration runs, read the run manifest and schemas under `artifacts/`; base all review/test results on the exact `target_sha`. Save outputs only to the assigned run/iteration paths and never include credentials, personal data, or raw sensitive logs.
- For a scoped collaboration workflow in VS Code Local, use `ChronoLedger Orchestrator` as the single coordinator; it routes implementation/review to Maker/Reviewer. Do not ask the user to choose those roles. If Local subagent tools are unavailable, state the limitation and use the documented manual fallback.
- For a review role, report evidence, file and line, impact, and recommendation in `artifacts/schemas/review.schema.json` format; do not modify implementation files. A role description is not a technical permission boundary, so the user must select restrictive tools/permissions and inspect proposed changes.
- After meaningful work, update `docs/` as described in `.agents/skills/chronoledger-docs-closeout/SKILL.md`.
- When the user says `"인수인계 문서를 확인해"` (or asks to check the handoff document), follow `.agents/skills/handoff/SKILL.md`.
- Model roles, fallback chains and the Gemini 4 Argon no-direct-implementation rule: `.agents/rules/collaboration.md` (read when assigning models).
- **Communication & Documentation Style**: Always communicate with the user in Korean. **답과 문서는 한국어 개조식(~함, ~임)으로 쓸 것** (details: `.agents/rules/language.md`).
