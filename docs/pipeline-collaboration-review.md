# AI 협업 파이프라인 6대 병목·모순 검토 및 개선안 (Claude Opus 2차 검증용)

- **작성일**: 2026-11-19
- **1차 검토 주체**: Gemini 4 Argon (`Chief Architect & Orchestrator`)
- **2차 검증 대상 모델**: **Claude Opus** (`Reviewer & Architect`)
- **목적**: 최근 멀티 에이전트 Run(`r93`, `r89`, `r84`, `skill-support-check`) 운영과 **Gemini 4 다단계 승격 체계(`Hydrogen` 기본 $\to$ `Neon` 1차 승격 $\to$ `Argon` 2차 승격)** 도입 이후, 실제 협업 과정에서 드러난 **6가지 규칙 모순·병목 현상(`P1` 2건, `P2` 3건, `P3` 1건)**과 개선 초안을 정리하고 **Claude Opus의 2차 비판적 검증**을 거쳐 협업 스킬·스크립트에 반영하기 위함.

---

## 1. 검토 배경 및 현재 파이프라인 강점 요약

- **현재 파이프라인의 강점 (유지 대상)**:
  1. **토큰 절감형 Progressive Disclosure**: `docs/handoff.md` 아카이브 분리(`3,295줄` $\to$ `115줄`) 및 6개 역할별 Skill(`.agents/skills/*`, `.claude/skills/*` 사본 동기화) 온디맨드 로딩으로 세션 진입 토큰을 대폭 절감함.
  2. **쿼터 주기 기반 이중 티어링(Dual-Tiering)**: Claude(`Sonnet` 기본 $\to$ `Opus` 승격)와 Gemini(`Hydrogen` 단기 쿼터 기본 $\to$ `Neon` 단기 쿼터 심층 구현/조율 승격 $\to$ `Argon` 주간 쿼터 수석 아키텍처/감사 승격)가 대칭 구조로 정립됨.
  3. **증거 기반 검증 게이트**: 격리 워크트리(`.worktrees/<run_id>`), 고정 `Base SHA` $\leftrightarrow$ `Target SHA`, `review.json`·`test.json` 스키마 검증(`validate_collaboration_artifact.py`)으로 환각 통과 보고를 차단함.

---

## 2. 6가지 문제 현상(파일·행 근거) 및 1차 개선안 (Gemini 4 Argon)

### 🔴 [P1-1] `run.json` 매니페스트의 `target_sha` 갱신 주체 모순 (스킬·스크립트 간 충돌)

- **현상 및 파일·행 근거**:
  1. `scripts/collaboration/New-CollaborationRun.ps1` (111행)이 생성하는 `iteration-01/README.md`:
     > `"Target SHA is recorded by Maker after implementation. Reviewer and Orchestrator must use that same SHA."`
  2. `.agents/skills/chronoledger-maker/SKILL.md` (13행):
     > `"Commit inside the worktree. Do not edit the run manifest or write reviewer/test artifacts."`
  3. `.agents/skills/chronoledger-reviewer/SKILL.md` (13행):
     > `"Write artifacts/<run_id>/iteration-NN/review.json ... inside the worktree; take run/SHA metadata from the manifest, not from model output"`
  4. `.agents/skills/chronoledger-orchestrator/SKILL.md` (18행):
     > `"Resolve the committed HEAD SHA and update only target_sha in this run's manifest."`
- **실제 발생한 문제**:
  - VS Code 단일 세션 로컬 서브에이전트 위임이 아닌 **`docs/handoff.md` 기반 모델 전환(Step 1 Maker $\to$ Step 2 Maker $\to$ Step 3 Reviewer 직접 배턴 터치)**에서는 마지막 Maker와 Reviewer 사이에 Orchestrator 전용 스텝이 없음.
  - 또한 Maker가 구현 커밋을 만든 뒤 `run.json`에 그 커밋 SHA를 적어 다시 커밋하면 워크트리 `HEAD` SHA 자체가 바뀌어 버리는 순환 모순(Chicken-and-Egg)이 있음.
  - 그 결과 현재 활성 Run인 `.worktrees/r84-feedback-and-inbox/artifacts/r84-feedback-and-inbox/run.json` 역시 Step 2(`d7eef7a`)까지 완료되었음에도 `target_sha: null`인 상태로 Step 3에 도달함.
- **1차 개선안**:
  - **구현 커밋(`Target SHA`)과 아티팩트 커밋의 명확한 분리**:
    1. **Maker**: 지금처럼 `run.json`을 수정하지 않고 구현 코드만 커밋한 뒤, 그 커밋 해시(`Target SHA`)를 루트 `docs/handoff.md`의 본인 행(`✅ DONE (SHA: <sha>)`)과 Run 헤더의 `Target SHA` 줄에만 기록함.
    2. **Reviewer**: Step 3 진입 시 ① `docs/handoff.md`에 기록된 `Target SHA`와 워크트리 현재 `HEAD`(또는 마지막 `src/`·`sql/` 변경 커밋)가 일치하는지 먼저 검증(`git rev-parse HEAD`)하고, ② 일치하면 **`artifacts/<run_id>/run.json`의 `target_sha`를 해당 40자 SHA로 갱신**한 뒤 `Base SHA` $\leftrightarrow$ `Target SHA` 범위를 리뷰하고, ③ 갱신된 `run.json`과 `iteration-NN/review.json`·`test.json`을 한 번에 아티팩트 커밋으로 기록함.
    3. `New-CollaborationRun.ps1` 111행의 `iteration-01/README.md` 문구도 위 절차와 일치하도록 수정함.

---

### 🔴 [P1-2] 하위 Skill 및 지침 문서 내 구버전 승격 규칙 잔재 (`Hydrogen` $\to$ `Neon`/`Argon` 미반영)

- **현상 및 파일·행 근거**:
  1. `.agents/skills/chronoledger-maker/SKILL.md` (10행):
     > `"If the work turns out to touch money, ledger, points, RLS or SQL/RPC, async/browser-lifecycle edge cases, or 3+ modules of restructuring, stop and hand over to Claude Opus with ⚠️ HANDOVER_NEEDED (handoff skill §3)."`
  2. `.agents/skills/chronoledger-sql-migration/SKILL.md` (8행):
     > `"Any change to money, ledger, points, RLS or SQL/RPC is an Opus promotion condition (.agents/rules/collaboration.md)."`
  3. `.github/copilot-instructions.md` (14행):
     > `"Model roles, fallback chains and the Gemini 4 Argon no-direct-implementation rule: .agents/rules/collaboration.md"`
- **실제 발생한 문제**:
  - `.agents/rules/collaboration.md`에는 7대 모델 체계와 **Gemini 4 다단계 승격(`Hydrogen` 기본 $\to$ `Neon` 1차 승격[복합 상태·생명주기·코어 수식·SQL/RPC] $\to$ `Argon` 2차 승격[아키텍처·보안/원장 감사·통합 리뷰])**이 도입되었으나, 하위 스킬은 여전히 `Claude Sonnet` $\to$ `Claude Opus` 단일 승격만 가정하고 있음.
  - 이로 인해 `Gemini 4 Hydrogen`이 Maker 작업을 수행하다 복합 상태·SQL/RPC·코어 수식 조건을 만났을 때 1차 승격 대상인 `Gemini 4 Neon`(또는 `GPT Codex`) 대신 무조건 `Claude Opus`로만 인계하도록 지시하게 됨.
- **1차 개선안**:
  - `chronoledger-maker/SKILL.md` 10행, `chronoledger-sql-migration/SKILL.md` 8행, `.github/copilot-instructions.md` 14행을 `.agents/rules/collaboration.md` §1·§2의 양대 승격 규칙(`Claude Sonnet` $\to$ `Claude Opus`, `Gemini 4 Hydrogen` $\to$ `Gemini 4 Neon`[복합 구현·코어·SQL] 또는 `Gemini 4 Argon`/`Claude Opus`[오픈 아키텍처·보안/원장 감사])과 일치시키고 `Sync-Skills.ps1`을 실행함.

---

### 🟠 [P2-1] 다중 PC 작업 시 격리 워크트리 브랜치(`collab/<run_id>`) 미동기화 및 복원 절차 부재

- **현상 및 실제 사례**:
  - `r93-income-history-db-and-ui` 당시 PC A에서 Step 1·2를 워크트리 브랜치(`collab/r93-...`)에 커밋하고 루트 `main`(`docs/handoff.md`)만 원격에 push한 뒤 PC B에서 Step 3를 실행했을 때, PC B에 `.worktrees/r93-...`와 `collab/r93-...` 브랜치가 없어 `🛑 BLOCKED`가 발생함.
  - 현재 `r84-feedback-and-inbox` 역시 Docker가 없는 PC에서 Step 1·2가 진행되어, Docker가 있는 다른 PC에서 Step 3를 진행할 경우 동일한 현상이 재발할 수 있음.
- **1차 개선안**:
  1. `handoff/SKILL.md` §1(3단계 Hard-cutoff recovery 다음 또는 5단계 Respect scope)에 **워크트리 자동 복원 절차**를 추가함:
     - 할당된 Run의 `.worktrees/<run_id>` 디렉토리가 로컬에 없거나 `Target SHA` 커밋이 로컬에 없으면, 즉시 `🛑 BLOCKED`로 멈추기 전에 `git fetch origin collab/<run_id>`를 시도하고 원격 브랜치가 존재하면 `git worktree add .worktrees/<run_id> collab/<run_id>`(이미 워크트리가 있으면 `git -C .worktrees/<run_id> pull --ff-only origin collab/<run_id>`)로 복원한 뒤 진행함.
     - `git fetch` 후에도 원격에 `collab/<run_id>` 브랜치나 `Target SHA`가 없을 때만 `🛑 BLOCKED`로 전환하고 사용자에게 이전 PC에서 `git -C .worktrees/<run_id> push -u origin collab/<run_id>` 실행을 요청함.
  2. `chronoledger-maker/SKILL.md` 완료 절차에 다중 PC 전환 또는 로컬 DB 검증 이관 시 워크트리 브랜치 동기화 안내 문구를 추가함.

---

### 🟠 [P2-2] Docker 미설치 PC $\leftrightarrow$ Docker 가용 PC 간 `🐳` 로컬 DB 검증 이관 표준화

- **현상 및 파일·행 근거**:
  - `.agents/skills/handoff/SKILL.md` §2 (25행):
    > `"For tasks that need local Supabase (marked 🐳), run docker version before starting. If the engine is not running or Docker is missing, stop immediately and tell the user 'Docker Desktop을 켜고 Engine running 확인 필요' instead of doing other work while waiting."`
- **실제 발생한 문제**:
  - 사용자는 Docker가 설치되지 않은 PC에서 Step 1(SQL·타입 작성)과 Step 2(UI·Vitest 작성)를 먼저 진행하고, Step 3(통합 리뷰 및 병합)에서 로컬 DB 검증을 수행하는 패턴(`r93`, `r84`)을 실제로 활용하고 있음.
  - 그러나 현재 `handoff/SKILL.md` §2는 Docker가 없으면 무조건 즉시 중단하도록만 되어 있어, 매번 사용자가 수동으로 "SQL만 먼저 작성하고 Step 3로 넘겨라"라고 별도 지시해야 하는 마찰이 발생함.
- **1차 개선안**:
  - `handoff/SKILL.md` §2 및 `chronoledger-sql-migration/SKILL.md` §4를 **"Docker 상태 분기 및 Step 3 최종 병합 게이트"**로 정교화함:
    1. **Docker 설치 PC에서 엔진만 꺼져 있는 경우**: 기존처럼 `"Docker Desktop을 켜고 Engine running 확인 필요"`를 안내하고 중단함.
    2. **Docker CLI 자체가 미설치된 PC에서 Maker(Step 1)를 수행하는 경우(또는 사용자가 이관을 지시한 경우)**: SQL 마이그레이션·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 작성 및 `tsc`·`lint`·`vitest`·`git diff --check` 검증까지 완수·커밋하고, `docs/handoff.md` 완료 기록에 **`⚠️ [LOCAL_DB_DEFERRED_TO_REVIEWER]`** 표기를 남겨 Step 2(UI)가 블로킹 없이 진행되게 함.
    3. **Reviewer / Merge Gate (Step 3, 강제 보루)**: `⚠️ [LOCAL_DB_DEFERRED_TO_REVIEWER]`가 있는 Run은 **Step 3에서 반드시 🐳 로컬 Supabase 2회 적용 및 `TESTS.sql` 통과를 완료해야만 `main` 병합이 가능**하며, Step 3 환경에서도 Docker를 실행할 수 없으면 병합하지 않고 `🛑 BLOCKED (로컬 DB 실행 검증 대기)`로 멈춤.

---

### 🟠 [P2-3] `docs/handoff.md` 내 수용 기준(Acceptance Criteria) 장문화로 인한 컨텍스트 중복

- **현상**:
  - Run 등록 시 `.worktrees/<run_id>/artifacts/<run_id>/run.json`과 루트 `docs/handoff.md` 양쪽에 수용 기준이 들어가며, 특히 DB 컬럼·제약 조건 전문을 `handoff.md`에 모두 적으면 Step 1·2 완료 기록까지 합쳐 활성 Run 블록 하나가 70~100줄로 비대해짐.
- **1차 개선안**:
  - `chronoledger-orchestrator/SKILL.md` §Dispatch Queue registration에 **"수용 기준 간결화 원칙"**을 추가함:
    - 별도 설계/조사 문서(예: `docs/push-notification-research.md`, `docs/r85-schedule-time-design.md`)가 있는 과제는 상세 컬럼·타입·제약 정의를 해당 설계 문서에 두고, `docs/handoff.md`의 Step별 수용 기준은 **설계 문서 절 번호 포인터 + 핵심 검증 항목(Step당 5~8줄 이내)**으로 요약함.
    - 이미 `✅ DONE`된 이전 Step의 수용 기준은 Run이 진행 중인 동안에는 Reviewer(Step 3) 대조를 위해 유지하되, Run 마감 시 아카이브로 이관할 때는 완료 요약 표와 Step별 완료 기록만 보존하고 장문 수용 기준 블록은 접거나 요약함.

---

### 🟡 [P3-1] `Hydrogen`·`Neon` 세션에서의 내부 `Gemini 3.8 Flash`(`Model: "flash"`) 서브에이전트 활용 명시

- **현상**:
  - `.agents/rules/collaboration.md` §2.2에 Gemini Orchestrator의 `Gemini 3.8 Flash` 서브에이전트 위임이 반영되었으나, `chronoledger-maker/SKILL.md`와 `chronoledger-docs-closeout/SKILL.md`에는 서브에이전트 활용 안내가 없음.
  - 그 결과 `Hydrogen`이나 `Neon`이 대규모 Maker 작업이나 `docs/archive/*` 이관 작업을 수행할 때 단순 코드베이스 검색이나 아카이브 줄 이동까지 메인 세션에서 직접 처리해 컨텍스트 예산을 소모함.
- **1차 개선안**:
  - `chronoledger-maker/SKILL.md` 및 `chronoledger-docs-closeout/SKILL.md`에 Antigravity 환경(`invoke_subagent` 가용 시)에서는 **초기 다중 파일 탐색, 단순 마크업/스타일 보조, `docs/archive/*` 구버전 기록 이관**을 `Gemini 3.8 Flash`(`Model: "flash"`) 서브에이전트에 위임해 메인 컨텍스트를 절약할 수 있음을 1줄 규칙으로 추가함.

---

## 3. Claude Opus 2차 검토 요청 사항 (수행 지침)

**Claude Opus**는 아래 항목을 비판적으로 검토하여 본 문서 하단 **`## 4. Claude Opus 2차 검증 결과 및 확정안`** 섹션을 작성한 뒤, 합의된 개선안을 스킬·지침 파일에 반영할 것:

1. **`P1-1` (`run.json` `target_sha` 갱신 시점 및 Git 커밋 순서)**:
   - Reviewer가 `run.json`의 `target_sha`를 마지막 구현 커밋 SHA로 채우고 `review.json`·`test.json`과 함께 커밋할 때, `validate_collaboration_artifact.py` 검증 및 `Base SHA` $\leftrightarrow$ `Target SHA` diff 범위에 부작용이 없는지 확인.
2. **`P1-2` (하위 스킬의 승격 조건 문구 통일)**:
   - `chronoledger-maker/SKILL.md`, `chronoledger-sql-migration/SKILL.md`, `.github/copilot-instructions.md`의 구체 수정 문구 확정.
3. **`P2-1` & `P2-2` (다중 PC 워크트리 복원 및 Docker 미설치 PC의 Step 3 검증 이관)**:
   - Docker 미설치 PC와 Docker 설치하되 엔진만 꺼진 PC를 구분하는 방법(`Get-Command docker -ErrorAction SilentlyContinue` vs `docker version`)과, 미검증 SQL이 절대 `main`에 병합되지 않도록 보장하는 Step 3 게이트 조건에 허점이 없는지 검증.
4. **`P2-3` & `P3-1` (`handoff.md` 슬림화 및 `Flash` 서브에이전트 위임 범위)**:
   - Reviewer가 수용 기준을 놓치지 않으면서도 `handoff.md` 길이를 줄이는 최적 기준과, 서브에이전트 위임 시 금지해야 할 범위(예: 코어 수식/SQL/리뷰 판정은 서브에이전트 위임 금지) 명시.
5. **추가 발견 사항**:
   - Claude Code / Antigravity / GPT Codex / GitHub Copilot 간 협업에서 위 6가지 외에 Opus 관점에서 추가로 개선해야 할 파이프라인 병목이 있다면 함께 제시할 것.
6. **반영 및 배턴 터치**:
   - 본 문서 `## 4.` 작성과 함께 합의된 스킬/지침 파일(`.agents/skills/*/SKILL.md`, `.github/copilot-instructions.md`, `scripts/collaboration/New-CollaborationRun.ps1` 및 `Sync-Skills.ps1`)을 즉시 수정·커밋하고, `docs/handoff.md`에서 본 검토 과제를 완료 처리한 뒤 대기 중인 `r84-feedback-and-inbox` Step 3를 다시 `▶ READY`로 전환(또는 사용자 결정이 필요한 항목이 있으면 보고)할 것.

---

## 4. Claude Opus 2차 검증 결과 및 확정안

- **검증 주체·일자**: Claude Opus, 2026-11-19. Base `7c0ff3c` 기준 스킬 6종·`collaboration.md`·`New-CollaborationRun.ps1`·`validate_collaboration_artifact.py`·`run.schema.json`·r84 워크트리 상태를 직접 대조함.
- **총평**: 6건 모두 실제 모순·병목으로 확인함. 1차 개선안 방향은 채택하되, 아래 보완점(★)을 더해 반영함.

### 4.1 항목별 판정

| ID | 판정 | 확정안 요지 (★ = 1차안 대비 보완) |
| :--- | :--- | :--- |
| `P1-1` | 채택·보완 | Maker는 `run.json`을 건드리지 않고 40자 Target SHA를 `handoff.md` 행·Run 헤더에만 기록함. Reviewer가 `run.json` `target_sha`를 채워 `review.json`·`test.json`과 한 커밋에 넣음. ★ 범위 검사를 `main` Run 전용에서 워크트리 Run까지 확대(`merge-base --is-ancestor <Target> HEAD` + `git diff <Target> HEAD -- src sql` 비어 있음). ★ 검증기는 스키마만 보고 SHA 교차 검증을 하지 않으므로, Reviewer가 `run_id`·`base_sha`·`target_sha`를 매니페스트에서 복사·대조함을 명시. ★ 짧은 SHA(`d7eef7a`)는 `git rev-parse`로 40자 해석 |
| `P1-2` | 채택·보완 | Maker·SQL 스킬·Copilot 지침을 `collaboration.md` §1 승격 체계와 일치시킴. ★ "본인 티어 기준으로 인계"로 정리(Sonnet→Opus, Hydrogen→Neon(구현·디버깅) 또는 Argon/Opus(설계·보안·원장 판단), Copilot/Flash→Neon/Opus). ★ 승격 티어(Opus·Neon Maker·GPT Codex)에 배정된 행은 인계 없이 계속함을 명시해 무한 인계 방지. ★ Argon은 `sql/**` 직접 수정 금지(사전 설계·감사만) |
| `P2-1` | 채택·보완 | `handoff` 스킬에 §1 5단계 "워크트리 복원" 추가(`git fetch` → `git worktree add --track -b …` 또는 깨끗한 워크트리 `pull --ff-only`). ★ reset·force·덮어쓰기 금지, 미커밋 변경·비 fast-forward는 `🛑 BLOCKED`. ★ 근본 원인은 원격 push 누락이나, push는 외부 공개 동작이라 자동 push는 넣지 않음. Maker 기록에 `원격 브랜치: push함 / 안 함`을 남기고 다른 PC 진행 시 사용자 승인 요청 |
| `P2-2` | 채택·보완 | 판별: `Get-Command docker -ErrorAction SilentlyContinue`(bash `command -v docker`) 없음 = 미설치, 있으나 `docker version` Server 실패 = 엔진 꺼짐. 미설치 PC의 Maker는 나머지 검증·커밋 후 `⚠️ LOCAL_DB_DEFERRED` 기록. ★ **병합 게이트를 표기 유무가 아닌 `git diff --name-only <Base> <Target> -- sql` 결과로 판정**: 표기 누락에도 미검증 SQL이 병합되지 않음. ★ `test.json`에 2회 적용·`TESTS.sql` 통과가 기록되어야만 병합, Docker 없으면 리뷰 산출물만 쓰고 `🛑 BLOCKED (로컬 DB 검증 대기)`. ★ 로컬 실행에서 SQL 결함 발견 시 Reviewer가 고치지 않고 Maker 반복으로 되돌림 |
| `P2-3` | 채택·보완 | Orchestrator 스킬에 "수용 기준 간결화" 추가: 설계 문서 절 포인터 + Step당 핵심 검증 8줄 이내, `run.json`은 Step당 1줄, 완료 기록 약 8줄. ★ Reviewer 스킬에 "행이 가리키는 설계 문서 절을 수용 기준으로 읽음"을 추가해 누락 방지. ★ 아카이브 이관 시 장문 수용 기준은 포인터·1~3줄 요약으로 대체(docs-closeout) |
| `P3-1` | 채택·범위 축소 | Maker·docs-closeout 스킬에 1줄씩 추가. 위임 허용: 읽기 전용 다중 파일 탐색, 단순 마크업·스타일 초안, 아카이브 잘라 붙이기. ★ **위임 금지**: SQL/RPC/RLS, 금액·날짜·포인트 로직, 커밋, 큐 상태 변경, 리뷰 판정·`test.json` 결과 기록. ★ 위임 결과는 메인 세션이 diff로 직접 확인 |

### 4.2 추가 발견 사항

1. **[현재 Run 영향] `r84` 브랜치 원격 미push**: `origin/collab/r84-feedback-and-inbox`가 없음. 현재 PC(Docker 미설치)에서만 Step 3 가능하나, 이 PC에서는 새 병합 게이트상 병합 불가함. Docker 있는 PC로 옮기려면 사용자가 이 PC에서 `git -C .worktrees/r84-feedback-and-inbox push -u origin collab/r84-feedback-and-inbox` 실행 필요.
2. **`New-CollaborationRun.ps1` iteration README 문구**: 확정 절차(Maker는 `handoff.md`에 기록, Reviewer가 `run.json` 갱신)로 수정함.
3. **남은 개선 후보(미반영, 필요 시 별도 Run)**: `validate_collaboration_artifact.py`에 `--manifest` 옵션을 추가해 `run_id`·`base_sha`·`target_sha` 일치를 자동 검사하면 P1-1 수동 대조를 없앨 수 있음. 이번 허용 파일 범위 밖이라 반영하지 않음.

### 4.3 반영 파일

- `.agents/skills/{handoff,chronoledger-maker,chronoledger-reviewer,chronoledger-orchestrator,chronoledger-sql-migration,chronoledger-docs-closeout}/SKILL.md` 및 `Sync-Skills.ps1`로 `.claude/skills/` 사본 동기화(`-Check` 일치 확인).
- `.github/copilot-instructions.md` 14행, `scripts/collaboration/New-CollaborationRun.ps1` iteration README 문구(PowerShell 구문 검사 오류 0건).
