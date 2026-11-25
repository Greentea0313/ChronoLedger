# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **남은 `P4` 선택 후속 일괄 처리 (`p4-followups-r107c-r109-r75` — Base `328704b7fdd5fc9f908894499a8d82acef0a8169`, 브랜치 `collab/p4-followups-r107c-r109-r75`, 워크트리 `.worktrees/p4-followups-r107c-r109-r75`)** *(`docs/to-do.md` `R109-REV-003`·`R107C-REV-001·002`·`R75-REV-001`. `R75-REV-002`는 비승인 게임 상태가 없어 도달 불가이므로 제외·보류)*
- **DB 변경**: 있음 (Step 2: `R107C-REV-002` `CHECK` 마이그레이션·`SCHEMA.sql`, `TESTS.sql`). 🐳 Docker Desktop 필요. 운영 DB 적용은 Step 4 안내 후 사용자 수동.
- **Target SHA**: `66d4547f7856e3a70c1ab6fbf6a34622c95fc944` *(Step 2 Maker 완료, Step 1 `1c04860`, 미병합, 원격 브랜치: push 안 함)*
- **수용 기준**: `docs/to-do.md` 해당 항목. 아래 행은 요지만 둠. `R107C-REV-002`는 운영 기존 데이터에 위반 행이 없는지 적용 전 확인 쿼리를 함께 제공하고, 위반 가능성이 있으면 제약을 `NOT VALID`로 추가하는 등 안전한 적용 방식을 택함.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 1c048600213e727a3e25a9f6d75fb0f9bb2381cb)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R109-REV-003·R107C-REV-001 UI 보완)` | `R109-REV-003`: `/admin` 캐릭터 저장·삭제 핸들러에서 `fetchCharacters()`와 함께 `fetchPendingCharacterAssetCount()` 호출. `R107C-REV-001`: 구독 모달 수정 저장 시 미결제 `PLANNED` 지출 동기화 `update`에 `payment_method`·`point_platform` 포함. 각각 Vitest 추가, `tsc`·`lint`·Vitest 통과 후 커밋. 허용 파일: `src/app/admin/page.tsx`·`page.test.tsx`, `src/components/subscription/subscription-modal.tsx`·`subscription-modal.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 1 완료 기록 (실행: Claude Sonnet `Medium` 대체) |
| **2** | **`✅ DONE (SHA: 66d4547f7856e3a70c1ab6fbf6a34622c95fc944)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (R107C-REV-002 CHECK·R75-REV-001 테스트)` | 🐳 **Docker Desktop 필요**. `R107C-REV-002`: 신규 `sql/migrations/MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql`(멱등 `CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED')`, 위반 행 사전 확인), `sql/SCHEMA.sql`, `sql/README.md` B표 행·확인 쿼리, `TESTS.sql` 블록. 자동 확정·환불 롤백·`restore_cancelled_expense` 경로가 이 제약을 위반하지 않는지 점검. `R75-REV-001`: `TESTS.sql` R64 블록의 잘못된 `axis_key`·빈 옵션 음성 케이스를 방어선별로 고정. 허용 파일: 위 SQL 파일들, `src/types/database.types.ts`(필요 시), 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 2 완료 기록 |
| **3** | **`▶ READY`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex — Maker인 Opus·Hydrogen 제외)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요**. 통합 정적 리뷰(`review.json`)·`test.json`(로컬 DB 업그레이드·신규 2경로 2회 멱등·`TESTS.sql`·`tsc`·`lint`·Vitest·`next build`)·`main` 병합 | 대기 중 |
| **4** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | Step 3 병합 후 착수. 문서 아카이브 마감 및 운영 DB 적용 절차 안내 | `⏳ Step 3 완료 대기` |


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


### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001·002` P4 선택)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `r75-r64-tests-readme` *(`R75` ①·④ R64 SQL 회귀 테스트 보강)*

- **Run ID**: `r75-r64-tests-readme` **(완료, `main` 병합 `35d43b6`, 문서 마감 2026-11-26)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·리뷰·병합·마감)*
- **Worktree 경로**: `.worktrees/r75-r64-tests-readme` (브랜치 `collab/r75-r64-tests-readme`, 매니페스트 `artifacts/r75-r64-tests-readme/run.json`, 미삭제·원격 미push)
- **Base SHA**: `2d4317b8141a5543b09b1d277cd80f54c9e0cf4a` · **Target SHA**: `d35bf3c0e513a9e80cd51098b81dc5832634d347` *(산출물 `7e4e989`, `main` 병합 `35d43b6`)*
- **DB 변경**: 없음(테스트·문서만). 운영 DB 작업 없음.

| 순서 | 상태 | 담당 모델 (Level) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: d35bf3c)`** | **Gemini 4 Neon (`High`)** | `Maker (TESTS.sql·README)` | `TESTS.sql` R64·R80 블록에 명세 §7 시나리오 보강(관리자 CRUD·`updated_at`, 비관리자·`user_metadata` 스푸핑·`anon` 쓰기 거부, 조회 범위, CHECK·트리거 메시지 단위 검증, 순서 변경·옵션/축 제거 정리, 게임 삭제 CASCADE), `README` B표 R64 행에 upsert 안내 1줄 |
| **2** | **`✅ DONE (SHA: 7e4e989, 병합 35d43b6)`** | **Claude Sonnet (`Medium`)** | `Reviewer & Orchestrator` | 정적 리뷰 `P4` 2건 비차단(`R75-REV-001·002`), 🐳 로컬 신규 스키마에서 `TESTS.sql` 2회 실행 각 54개 PASS(R64·R80 포함, ROLLBACK), 마이그레이션 변경 없어 멱등 검증·`tsc`·`lint`·Vitest·`build`는 `skipped`(src·package 변경 없음) |

#### 📝 `r75-r64-tests-readme` 핵심 요약 (2026-11-26)

- **리뷰 `P4` (`docs/to-do.md` `R75-REV-001·002`)**: ① 잘못된 `axis_key`·빈 옵션 음성 케이스가 트리거 메시지와 CHECK 이름 둘 중 하나만 맞으면 통과해 개별 방어선 회귀를 못 잡음. ② 비승인 게임 0행 조회를 `games_status_check`(APPROVED 한정)와 정책 정의 문자열(`LIKE %APPROVED%`)로 대체 검증함(현재 비승인 게임이 존재할 수 없어 도달 불가).
- **검증 환경 메모**: 로컬 DB 재설정 시 `storage.objects` 정책 5종도 함께 제거해야 `SCHEMA.sql`이 끝까지 적용됨. `docker cp` 원본 경로는 Git Bash에서 `MSYS_NO_PATHCONV=1`과 함께 저장소 상대 경로를 써야 함.
