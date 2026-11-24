---
name: chronoledger-weekly-doc-audit
description: Audit the integrity of ChronoLedger documents updated during the last 7 days (cross-doc consistency, archive rules, Git SHA validity, SQL doc sync, broken markdown links, and Korean itemized style). Use weekly or whenever auditing recent documentation changes.
---

# ChronoLedger Weekly Document Integrity Audit

Audit all project documents (`docs/`, `sql/README.md`, `artifacts/`, `.agents/`) modified within the past 7 days and produce a concise, evidence-based integrity report.

## When to use

- On a weekly schedule (e.g., via `/schedule` or `/automation`) or when the user asks to audit documentation updated in the past week.
- Do **not** modify `src/**` or `sql/*.sql` implementation files during this audit.

## Workflow

1. **Collect the 7-day change scope**:
   - Run `git log --since="7 days ago" --name-only --pretty=format:"%h %ad %s" --date=short -- docs/ sql/ artifacts/ .agents/`.
   - Deduplicate the modified file list. If no files changed in the last 7 days, report `"최근 7일간 갱신된 문서 없음"` and stop.

2. **Run the 6-point integrity audit**:
   - **Cross-doc consistency (`handoff.md` ↔ `to-do.md` ↔ `progress.md` ↔ `changelog.md`)**:
     - Verify every Run, status, and merge SHA mentioned in `docs/handoff.md` matches `docs/to-do.md` (`[x]`/`[ ]`), `docs/progress.md`, and `docs/changelog.md`.
     - Flag finished or already-applied items lingering in the `handoff.md` reservation/agenda summary table.
   - **Archive & size hygiene (`chronoledger-docs-closeout` §2)**:
     - `docs/handoff.md` must keep only the active Run table, handover checkpoint, reservation/agenda summary, and **one** latest finished Run record.
     - `docs/progress.md` and `docs/changelog.md` should keep roughly two weeks of entries; flag older entries for `docs/archive/` migration.
     - Flag fully completed `R` items in `docs/to-do.md` (with no open children) that are ready for `docs/archive/to-do-archive.md`.
   - **Git SHA & worktree reality check**:
     - Verify cited commit SHAs in the 7-day doc diff exist (`git cat-file -t <sha>`).
     - List any merged Run worktrees still present in `git worktree list` as cleanup candidates.
   - **SQL doc sync (when `sql/` changed in the last 7 days)**:
     - Cross-check new/updated `sql/migrations/*.sql` against `sql/SCHEMA.sql`, `sql/README.md` Table B (check query + ordering notes), and `sql/tests/TESTS.sql`.
   - **Markdown link & path check**:
     - Inspect relative links (`[text](path)`) in the modified `docs/**/*.md` files and verify target files exist in the repository.
   - **Language & location rules (`.agents/rules/language.md`, `document_location.md`)**:
     - Verify operating docs (`handoff.md`, `progress.md`, `changelog.md`, `to-do.md`) use Korean itemized style (`~함`, `~임`, `~됨`) without polite declarative endings (`~습니다`, `~해요`, `~입니다`).
     - Confirm no external session paths (e.g., `brain/...`) were written into `docs/`.

3. **Report or apply safe doc fixes**:
   - By default, output a read-only audit report in Korean itemized style (`~함`, `~임`):
     - 대상 기간 및 갱신 파일 수
     - 통과 항목 / 경고·불일치 항목 (파일·라인·근거 포함)
     - 권장 후속 조치 (예: 아카이브 이동, 깨진 링크 수정, 워크트리 정리)
   - Only apply direct edits to `docs/` when the user asks to fix/clean up findings, and verify with `git diff --check` before committing.
