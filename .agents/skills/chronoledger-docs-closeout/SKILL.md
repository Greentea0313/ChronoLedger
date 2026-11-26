---
name: chronoledger-docs-closeout
description: Update ChronoLedger operating documents (docs/handoff.md, progress.md, changelog.md, to-do.md, architecture.md, known-pitfalls.md) after finishing a Dispatch Queue step or other meaningful work, and move finished records into docs/archive. Use at the end of a task, not at the start.
---

# ChronoLedger Docs Closeout

Write every operating document in Korean itemized style (`~함`, `~임`, `~됨`). Keep entries short, factual and useful to the next agent. Do not claim work is complete unless it was verified; mark anything uncertain as needing verification.

## 1. What to write after a queue step

| File | When | What |
| :--- | :--- | :--- |
| `docs/handoff.md` | every step | Update your row status and add one `#### 📝 <run> Step N 완료 기록` block (Target SHA, changed files, decisions, checks actually run, what is left). This is the only detailed record. |
| `docs/progress.md` | every step | One short entry at the top: who, result, next step (3–5 lines). Do not copy the handoff record. |
| `docs/changelog.md` | only when work is merged into `main` (or a `main` direct fix) | One entry at the top describing user-visible or structural changes. |
| `docs/to-do.md` | when an item is finished or a new follow-up appears | Tick or add the `R` item; keep the label short. A ticked item with no open child moves to the top of `docs/archive/to-do-archive.md` in the same commit (§2). If a user check is still pending, add it as an open child `- [ ] 사용자 확인: …` instead of writing `남음` inside a ticked item. |
| `docs/architecture.md` | when files, modules or responsibilities change | Update the affected section only. |
| `docs/known-pitfalls.md` | when a repeated failure or useful workaround is found | Add one item. |

Prepend new entries at the top of each file, preserve each file's existing format, and never rewrite a whole document.

## 2. Keep the documents small (archive rules)

- `docs/handoff.md` keeps only: the active Run table and its acceptance criteria, `### 📌 중단 체크포인트`, the reservation/hold/agenda summary table, and the **latest** finished Run record.
- When a Run is closed out (merged or abandoned), move the previous "직전 완료 Run" block to the top of `docs/archive/handoff-archive.md` (right under its header) and put the newly finished Run in its place.
- `docs/progress.md` and `docs/changelog.md`: keep about two weeks of entries. Move older entries to the top of `docs/archive/progress-archive.md` / `docs/archive/changelog-archive.md`.
- `docs/to-do.md`: move finished `R` items (and sections with no open item) to the top of `docs/archive/to-do-archive.md` in the same step that ticks them. Never move an item that still has an open child. The weekly audit (`chronoledger-weekly-doc-audit`) moves anything left behind.
- Archive files are not read during normal work; search them only when a task points to a section.
- When archiving a finished Run, keep its step table and completion records; replace long acceptance-criteria blocks with the design-document pointer or a 1–3 line summary.
- Archive moves are plain cut-and-paste and may be delegated to a lightweight subagent (Antigravity `invoke_subagent` with `Model: "flash_lite"` or `"inherit"`); check the moved text with `git diff` before committing.

## 3. Final report

Always re-read the active queue in the root `docs/handoff.md` right before reporting the next step—never rely on earlier conversation context, because another agent or session may have updated or closed a Run in parallel. Report the queue state, the next model to call with `"인수인계 문서를 확인해"`, which documents were updated, follow-ups added, and which expected documents were not updated and why.
