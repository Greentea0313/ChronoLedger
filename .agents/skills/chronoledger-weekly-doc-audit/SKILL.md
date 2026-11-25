---
name: chronoledger-weekly-doc-audit
description: Audit the integrity of ChronoLedger documents updated during the last 7 days (cross-doc consistency, archive rules, Git SHA validity, SQL doc sync, broken markdown links, and Korean itemized style), move overdue records into docs/archive, commit, and leave a user notice in docs/handoff.md. Use weekly or whenever auditing recent documentation changes.
---

# ChronoLedger Weekly Document Integrity Audit

Audit all project documents (`docs/`, `sql/README.md`, `artifacts/`, `.agents/`) modified within the past 7 days and produce a concise, evidence-based integrity report.

## When to use

- When the user asks to audit documentation updated in the past week, or from a weekly scheduled task.
  - Prefer a **local** scheduled task on the PC that holds the run worktrees (for example a scheduled task in the Claude desktop app). A cloud run (Claude Code `/schedule`) sees only the pushed repository: skip the worktree check there and say so in the report.
- Do **not** modify `src/**` or `sql/**` (migrations, `SCHEMA.sql`, tests) during this audit.

## Workflow

1. **Sync and collect the 7-day change scope**:
   - Run `git fetch origin` first, so branches and SHAs pushed from other PCs are visible. Do not pull, reset or switch branches; if the local branch is behind or ahead of its remote, note it in the report.
   - Run `git log --since="7 days ago" --name-only --pretty=format:"%h %ad %s" --date=short -- docs/ sql/ artifacts/ .agents/`.
   - Add uncommitted changes from `git status --short -- docs/ sql/ artifacts/ .agents/` and mark them as uncommitted in the report.
   - Deduplicate the file list. If nothing changed in the last 7 days and nothing is uncommitted, report `"최근 7일간 갱신된 문서 없음"` and stop.

2. **Run the 6-point integrity audit**:
   - **Cross-doc consistency (`handoff.md` ↔ `to-do.md` ↔ `progress.md` ↔ `changelog.md`)**:
     - Verify every Run, status, and merge SHA mentioned in `docs/handoff.md` matches `docs/to-do.md` (`[x]`/`[ ]`), `docs/progress.md`, and `docs/changelog.md`.
     - Flag finished or already-applied items lingering in the `handoff.md` reservation/agenda summary table.
   - **Archive & size hygiene (`chronoledger-docs-closeout` §2)**:
     - `docs/handoff.md` must keep only the active Run table(s), handover checkpoint, reservation/agenda summary, and **one** latest finished Run record.
     - `docs/progress.md` and `docs/changelog.md` should keep roughly two weeks of entries; flag older entries for `docs/archive/` migration.
     - Flag fully completed `R` items in `docs/to-do.md` (with no open children) that are ready for `docs/archive/to-do-archive.md`.
   - **Git SHA & worktree reality check**:
     - Verify cited commit SHAs in the 7-day doc diff exist (`git cat-file -t <sha>`). If a SHA is missing, check whether the doc says its branch was not pushed (`원격 미push`, `push 안 함`); report that case as "다른 PC에만 있음(push 필요)", not as a broken SHA.
     - List any merged Run worktrees still present in `git worktree list` as cleanup candidates (local runs only).
   - **SQL doc sync (when `sql/` changed in the last 7 days)**:
     - Cross-check new/updated `sql/migrations/*.sql` against `sql/SCHEMA.sql`, `sql/README.md` Table B (check query + ordering notes), and `sql/tests/TESTS.sql`.
     - Count `|` in each changed Table B row: it must equal the column count + 1. A `|` inside a check query (for example a regex alternation) splits the cell (`docs/known-pitfalls.md` #41).
     - For every function that several migrations redefine in full (for example `purge_expired_account_deletion_requests`), compare the body in the most recently added migration with `sql/SCHEMA.sql`. A difference means a later migration would drop another run's change when applied in order (R102-REV-01). Also check that the README rows state the required application order.
   - **Markdown link & path check**:
     - Inspect relative links (`[text](path)`) in the modified `docs/**/*.md` files and verify target files exist in the repository.
   - **Language & location rules (`.agents/rules/language.md`, `document_location.md`)**:
     - Verify operating docs (`handoff.md`, `progress.md`, `changelog.md`, `to-do.md`) use Korean itemized style (`~함`, `~임`, `~됨`) without polite declarative endings (`~습니다`, `~해요`, `~입니다`).
     - Skip text inside backticks or quotation marks before checking: records often quote UI messages verbatim (for example `"DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다."`), and those are not violations.
     - Confirm no external session paths (e.g., `brain/...`) were written into `docs/`.

3. **Apply archive moves (the only automatic edit)**:
   - Move the archive candidates found in step 2 following `chronoledger-docs-closeout` §2: extra finished Run records from `docs/handoff.md` to the top of `docs/archive/handoff-archive.md`, entries older than about two weeks from `docs/progress.md` / `docs/changelog.md` to their archive files, and finished `R` items with no open child from `docs/to-do.md` to `docs/archive/to-do-archive.md`. Cut and paste only; never reword, merge or drop text.
   - Skip the moves (report them as candidates instead) when any of `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` or `docs/archive/*` already has uncommitted changes, because another session or the user may be editing them.
   - Every other finding (inconsistency, broken link, style, SHA, worktree, SQL sync) stays report-only; fixing those needs judgment and is done only when the user asks.

4. **Write the report and the user notice, then commit**:
   - Write the report to `docs/doc-audit-report.md` (overwrite the previous one) in Korean itemized style (`~함`, `~임`): 대상 기간, 갱신 파일 수(미커밋 포함 여부), 원격 동기화 상태, 통과 항목, 경고·불일치 항목(파일·라인·근거), 이관한 항목, 확인 필요 항목.
   - Unattended runs add one line under `### 📣 사용자 알림 대기` near the top of `docs/handoff.md`: date, `주간 문서 감사`, what was moved, how many items need the user's check, a link to `doc-audit-report.md`, and `push 필요` (the audit never pushes). Replace the `현재 알림 없음` line if it is there; keep any other pending notice.
   - Verify with `git diff --check`, then commit only the files this audit touched (`git commit --only <files>`), with a message such as `docs(audit): weekly doc audit YYYY-MM-DD and archive moves`. Do not push; the user decides when to push.
   - When the user ran the audit in a conversation, report the result in the reply and skip the notice line, since the user has already been told. Scheduled or unattended runs always write it.
