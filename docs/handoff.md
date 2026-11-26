# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(직전 Run `p4-followups-r107c-r109-r75`는 `main` 병합 `ac752b6`로 마감함. `R110` 명세 완료, Run 등록(`R110-REG`) `▶ READY`)*

| Step | 상태 | 담당 모델 | 작업 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `R110-SPEC` | **`✅ DONE (2026-11-26)`** *(원 상태 `📐 SPEC_NEEDED`)* | ~~**Gemini 4 Carbon (`High`)**~~ ➡️ **Claude Opus (`High`)** *(Fallback 1로 수행)* | 명세·결정(`U1`~`U14`)·Step별 인수 기준 작성 | ✅ [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md). `src/**`·`src-tauri/**` 수정 없음 |
| `R110-REG` | **`▶ READY`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet `Medium`)* | Run `r110-desktop-auto-update` 등록: 깨끗한 트리에서 `New-CollaborationRun.ps1`, 큐 행에는 명세 §4·§5 포인터만 기재(Step 1 `Gemini 4 Neon (High — 도구에서 High 선택)`, Step 2 `Hydrogen`, Step 3 `Claude Opus (High)` 리뷰). 사용자에게 **Step U0(서명 키 생성·Secrets 등록·공개 키 전달)** 선행을 먼저 요청함 | 명세 §4 U0는 사용자 작업이라 Step 1 착수 전 완료 필요 |

#### 📝 `R110-SPEC` 명세 완료 기록 (Claude Opus, 2026-11-26)

- **결정 요약**: 공식 `updater`·`process` 플러그인(U1), endpoint는 공개 저장소의 `releases/latest/download/latest.json` 1개(U2), `tauri-action`으로 `latest.json` 생성(U3), NSIS 단일 번들·`passive` 설치(U4), 공개 키는 커밋·개인 키는 Secrets(U5), 키 백업·분실/유출 대응(U6), 버전 원천 `package.json`·CI 버전 일치 검사(U7), 태그 `desktop-vX.Y.Z`·Release는 데스크톱 전용(U8), 배포 순서 DB → 웹 → 태그(U9).
- **UI 기본값**: Tauri에서만 앱 시작 시 1회 확인(웹은 import도 안 함), 상단 배너 `[지금 업데이트]`·`[나중에]`(이번 실행만 숨김), 확인 실패는 조용히, 설치 실패는 재시도 버튼(U11~U13). Windows 코드 서명은 범위 제외(U14).
- **사용자 선행 작업(Step U0)**: 저장소 밖에서 서명 키 생성·백업, GitHub Secrets 5개 등록, 공개 키만 Maker에게 전달.
- **첫 전환 주의**: 현재 0.1.0 설치본에는 updater가 없어, 0.2.0은 기존 설치본 제거 후 한 번 수동 설치해야 함(§4 Step 4-2).

#### 📐 `R110-SPEC` 요구사항 접수 기록 (Claude Sonnet `Medium`, 2026-11-26)

1. **요청 이해**: 설치된 Tauri 데스크톱 앱이 새 빌드 배포를 감지해 사용자가 업데이트할 수 있게 함. 앱이 시작될 때 자동으로 새 버전을 확인하고, 있으면 배너로 알리며 버튼으로 다운로드·설치·재시작함.
2. **에스컬레이션 조건**: 서명 키 보안 설계, 릴리스 배포 파이프라인(CI) 신규 도입, Rust·설정·프런트·CI 4개 영역에 걸친 변경임. 승인된 문서로 인수 기준을 확정할 수 없음.
3. **사용자 결정 (2026-11-26, 질문 카드 응답)**:
   - 업데이트 파일 배포 위치: **GitHub Releases**.
   - 알림 방식: **앱 시작 시 자동 확인 후 배너 알림**.
   - 서명 개인 키 보관: **GitHub Actions Secrets**.
   - 릴리스 빌드 방식: **GitHub Actions 자동 빌드**(태그 push 시 빌드·서명·릴리스 업로드).
4. **현재 상태 (확인함)**: `src-tauri/tauri.conf.json`에 updater 설정과 공개 키가 없음. `Cargo.toml`에 `tauri-plugin-updater`·`tauri-plugin-process`가 없음. `frontendDist: ../out`이라 웹 배포만으로는 설치된 앱이 갱신되지 않음. `.github/workflows` 존재 여부는 미확인임.
5. **열린 질문 (Carbon이 결정)**:
   - 저장소 공개 여부(비공개면 `latest.json` 접근 방식이 달라짐), 업데이트 endpoint URL 형식, `latest.json` 생성 방식(`tauri-action` 사용 여부).
   - 서명 개인 키 분실·유출 시 복구 절차와 키 교체 정책, Windows 코드 서명(SmartScreen) 도입 여부.
   - 버전 번호 관리(`package.json`·`Cargo.toml`·`tauri.conf.json` 동기화 규칙), 릴리스 태그 규칙, 웹(Cloudflare Pages) 배포와의 순서.
   - 배너 UI 위치·문구·"나중에" 동작, 확인 실패·오프라인 시 처리, 웹/PWA에서는 배너를 숨기는 조건(Tauri 환경 감지).
   - 검증 방법: 낮은 버전 설치본으로 실제 업데이트를 받아 보는 절차.
6. **관련 문서·파일**: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src/lib/tauri-auth.ts`, `docs/t1-t4-desktop-and-followups-spec.md`, `docs/to-do.md` T4(실기기 확인 대기 중).
7. **선행 조건**: `T4` 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제)은 사용자가 2026-11-26 완료함. 선행 조건 충족됨.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R110` | **`📐 SPEC_NEEDED` 명세 대기** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·Actions 자동 빌드·Secrets 서명 키·시작 시 확인 후 배너). Carbon 명세 후 Hydrogen이 Run 등록 | 위 활성 과제 표 `R110-SPEC` 요구사항 접수 기록 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. 사용자 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제)도 2026-11-26 완료(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `p4-followups-r107c-r109-r75` *(`R109-REV-003`·`R107C-REV-001·002`·`R75-REV-001` P4 후속 일괄 처리)*

- **Run ID**: `p4-followups-r107c-r109-r75` **(완료, `main` 병합 `ac752b6`, 문서 마감 2026-11-26)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Opus `High` *(Step 4 마감 대체 실행)*
- **Worktree 경로**: `.worktrees/p4-followups-r107c-r109-r75` (브랜치 `collab/p4-followups-r107c-r109-r75`, 매니페스트 `artifacts/p4-followups-r107c-r109-r75/run.json`, 미삭제·원격 미push)
- **Base SHA**: `328704b7fdd5fc9f908894499a8d82acef0a8169` · **Target SHA**: `66d4547f7856e3a70c1ab6fbf6a34622c95fc944` *(Step 1 `1c04860`, 산출물 `524cb2a`, `main` 병합 `ac752b6`)*
- **DB 변경**: 있음 (`MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql`, `SCHEMA.sql`). **운영 적용·검증 완료(사용자, 2026-11-26)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 1c048600213e727a3e25a9f6d75fb0f9bb2381cb)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R109-REV-003·R107C-REV-001 UI 보완)` | `R109-REV-003`: `/admin` 캐릭터 저장·삭제 핸들러에서 `fetchCharacters()`와 함께 `fetchPendingCharacterAssetCount()` 호출. `R107C-REV-001`: 구독 모달 수정 저장 시 미결제 `PLANNED` 지출 동기화 `update`에 `payment_method`·`point_platform` 포함. 각각 Vitest 추가, `tsc`·`lint`·Vitest 통과 후 커밋. 허용 파일: `src/app/admin/page.tsx`·`page.test.tsx`, `src/components/subscription/subscription-modal.tsx`·`subscription-modal.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 1 완료 기록 (실행: Claude Sonnet `Medium` 대체) |
| **2** | **`✅ DONE (SHA: 66d4547f7856e3a70c1ab6fbf6a34622c95fc944)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (R107C-REV-002 CHECK·R75-REV-001 테스트)` | 🐳 **Docker Desktop 필요**. `R107C-REV-002`: 신규 `sql/migrations/MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql`(멱등 `CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED')`, 위반 행 사전 확인), `sql/SCHEMA.sql`, `sql/README.md` B표 행·확인 쿼리, `TESTS.sql` 블록. 자동 확정·환불 롤백·`restore_cancelled_expense` 경로가 이 제약을 위반하지 않는지 점검. `R75-REV-001`: `TESTS.sql` R64 블록의 잘못된 `axis_key`·빈 옵션 음성 케이스를 방어선별로 고정. 허용 파일: 위 SQL 파일들, `src/types/database.types.ts`(필요 시), 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 2 완료 기록 |
| **3** | **`✅ DONE (SHA: 524cb2a, main 병합 ac752b6)`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex — Maker인 Opus·Hydrogen 제외)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요**. 통합 정적 리뷰(`review.json`)·`test.json`(로컬 DB 업그레이드·신규 2경로 2회 멱등·`TESTS.sql`·`tsc`·`lint`·Vitest·`next build`)·`main` 병합 | ✅ 아래 Step 3 완료 기록 (지적 0건, 🐳 로컬 2경로·`TESTS.sql` 56개 PASS, `main` 병합 `ac752b6`) |
| **4** | **`✅ DONE (2026-11-26, 문서 마감)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | Step 3 병합 후 착수. 문서 아카이브 마감 및 운영 DB 적용 절차 안내 | ✅ 문서 마감 완료 (실행: Claude Opus `High` 대체) |

#### 📝 `p4-followups-r107c-r109-r75` Step 3·4 완료 기록 (Gemini 4 Carbon `High` 리뷰·병합 → Claude Opus `High` 마감 대체, 2026-11-26)

- **Step 3 (Gemini 4 Carbon)**: Base `328704b` ↔ Target `66d4547` 정적 리뷰 `clean`(지적 0건), `test.json` `passed`(`diff --check`·`tsc`·`lint`·Vitest·`next build`, 🐳 로컬 업그레이드 경로(위반 행 `NOT VALID` 전환·정리 후 재검증 포함)·신규 설치 경로 각 2회 멱등·`TESTS.sql` 56개 PASS). 산출물 커밋 `524cb2a`(`run.json` `target_sha` 기록), `main` 병합 `ac752b6`(no-ff). 병합 직후 토큰 소진으로 종료돼 문서 기록 없이 끝남.
- **Step 4 (Claude Opus 대체 실행)**: 산출물 2종 스키마 재검증, 병합 결과가 브랜치 끝과 `src`·`sql`·`supabase` 차이 없음 확인. 병합 후 `main` 재검증 `tsc`·`next lint`·Vitest 78파일/1,076개·`next build`(더미 `NEXT_PUBLIC_SUPABASE_*`) 통과. `R75-REV-002`는 비승인 게임 상태가 없어 도달 불가라 보류함.
- **운영 반영**: `MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql` 운영 적용·검증 완료(사용자, 2026-11-26). 남음: `main` push로 웹 배포(Step 1 UI 보완 반영). 원격 브랜치 `collab/p4-followups-r107c-r109-r75`: push 안 함.

#### 📝 `p4-followups-r107c-r109-r75` Step 2 (Maker) 완료 기록 (Claude Opus `High`, 2026-11-26)

- **Target SHA**: `66d4547f7856e3a70c1ab6fbf6a34622c95fc944` (`collab/p4-followups-r107c-r109-r75`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (4개)**: 신규 `sql/migrations/MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql`, `sql/SCHEMA.sql`, `sql/README.md`(B표 행·적용 전 위반 행 확인 쿼리), `sql/tests/TESTS.sql`. 타입 변경 없음.
- **`R107C-REV-002`**: `chk_expense_auto_confirmed_status` `CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED')`. 위반 행이 없으면 검증된 제약으로, 있으면 `NOT VALID`로 추가하고 NOTICE로 건수를 출력함(정리 후 재실행하면 검증된 제약으로 바뀜). 자동 확정(확정 후 기록)·환불(CONFIRMED → CANCELLED)·환불 롤백(PLANNED 날짜만 변경)·`restore_cancelled_expense`(PLANNED 상태에서 취소된 행만 복구) 경로는 위반하지 않음 — 제약이 있는 상태에서 R107C-01~03이 그대로 통과함.
- **`R75-REV-001`**: BEFORE 트리거가 CHECK보다 먼저 실행되므로 트리거 경로 음성 3건은 트리거 메시지만 허용하도록 고정함. 새 블록에서 검증 트리거를 끈 채(롤백 전용 트랜잭션) `axis_key` 형식 2건·빈 옵션 1건이 각각 정확한 제약 이름(`GET STACKED DIAGNOSTICS CONSTRAINT_NAME`)으로 거부되는지 확인함. 트리거를 끄지 않는 변이에서 `FAIL`로 잡힘.
- **검증 (실제 실행)**: 🐳 업그레이드(Base `328704b` `SCHEMA.sql` → 마이그레이션 2회 → `TESTS.sql` 56개 PASS)·신규(Target `SCHEMA.sql` → 2회 → 56개 PASS). 위반 행 1건을 만든 뒤 적용 시 `NOT VALID`+NOTICE·새 위반 쓰기 거부, 정리 후 재실행 시 `convalidated=true` 확인. `tsc`·`lint`·Vitest 78파일/1,076개·`git diff --cached --check` 통과.
- **남은 작업**: Step 3(**Gemini 4 Carbon (`High`)**, 🐳)가 Base `328704b` ↔ Target 통합 리뷰·로컬 DB 게이트·`main` 병합 수행함.

#### 📝 `p4-followups-r107c-r109-r75` Step 1 (Maker) 완료 기록 (Claude Sonnet `Medium`, Gemini 4 Hydrogen 대체 실행, 2026-11-26)

- **Target SHA**: `1c048600213e727a3e25a9f6d75fb0f9bb2381cb` (`collab/p4-followups-r107c-r109-r75`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (4개)**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/components/subscription/subscription-modal.tsx`, `src/components/subscription/subscription-modal.test.tsx`.
- **`R109-REV-003`**: 캐릭터 저장·삭제·템플릿 삭제 성공 후 `fetchCharacters()` 뒤에 `fetchPendingCharacterAssetCount()`를 호출해 `[아이콘 Storage 일괄 이전 (N)]` 배지가 새로고침 없이 갱신됨. 삭제 후 건수 재조회 Vitest 1건 추가(해당 호출을 빼면 실패함을 뮤테이션으로 확인함).
- **`R107C-REV-001`**: 구독 수정 저장 시 미결제 `PLANNED` 지출 동기화 `update`에 `payment_method`와 `point_platform`(`WALLET`이면 `null`, 아니면 결제수단 값, `subscription-sync.ts`·SQL 생성 규칙과 동일)을 포함함. `GALAXY_STORE`·`WALLET` 전환 Vitest 1건 추가.
- **검증 (실제 실행, 워크트리)**: `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run --dir src` 78파일 1,076개 통과.
- **남은 작업**: Step 2(`Claude Opus (High)`, 🐳)가 `R107C-REV-002` `CHECK` 마이그레이션·`R75-REV-001` 테스트를 수행함.
