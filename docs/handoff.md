# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### ⛽ 쿼터 상태 (Quota Status)

- **`Gemini Models` 주간 한도 소진** *(사용자 통보, 2026-11-26, 리셋 시점 미확인)*: `Gemini 4 Hydrogen`·`Gemini 4 Neon`·`Gemini 4 Carbon`은 같은 공용 한도를 쓰므로 모두 사용 불가로 봄. 새 행 배정·인계는 다른 한도 묶음(`Claude Sonnet (Medium)`·`Claude Opus (High)`·`GPT Codex`·`GitHub Copilot`)으로 바로 보냄(handoff Skill §3). 리셋되면 사용자가 알려 주거나 Antigravity `View Usage`에서 확인한 모델이 이 절을 지움.
### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run**: **`R115` CSV 결제 내역 가져오기 (`r115-csv-import` — Base `a04237f3da787e33dd37a6ca80e4d97322c575cc`, 브랜치 `collab/r115-csv-import`, 워크트리 `.worktrees/r115-csv-import`)** *(명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §5(결정 I1~I16·인수 기준 115-1~115-9)·§7(모델 배정). 직전 Run `r114-game-budgets`는 2026-11-26 마감함. 이후 `R116` 순으로 등록함)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R115_EXPENSE_IMPORT.sql`, `SCHEMA.sql`: `expenses.import_batch_id`·`import_confirmed_expenses`·`delete_import_batch`). 🐳 Docker Desktop 필요(이 PC는 2026-11-26 등록 시점에 엔진 실행 중 확인함). **지출 원장 접점**이라 Step 1은 Opus 승격 조건 ①. 결제·환불 RPC와 기존 정책은 변경하지 않음(115-8).
- **핵심 불변식**: 가져온 행은 `CONFIRMED`·`WALLET`·`deduct_from_asset = false`·포인트 0이라 총자산·지갑·포인트 원장이 변하지 않아야 하고, 가져온 행을 환불해도 변하지 않아야 함(115-1·115-2). 위반 1행이 섞이면 전체 거부(115-3).
- **모델 배정 근거**: `Gemini Models` 한도 소진 중이라 명세 §7 권고대로 배정함. 리뷰어는 Maker와 다른 모델임.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`▶ READY`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R115 SQL RPC·CSV 파서·가져오기 UI)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 이관). 명세 §5 전부(마이그레이션·`SCHEMA.sql`·README 확인 쿼리·`TESTS.sql`·`database.types.ts`·`src/lib/csv.ts`·해석 로직·지출 페이지 `CSV 가져오기` 단계형 모달·미적용 폴백)·인수 기준 115-1~115-9. 허용 파일: 신규 `sql/migrations/MIGRATION_R115_EXPENSE_IMPORT.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 신규 `src/lib/csv.ts`·`.test.ts`와 가져오기 해석 모듈·테스트, `src/lib/export-format.ts`(파서 공유 시), `src/app/dashboard/expenses/**`, 신규 `src/components/expense/**` 가져오기 모달, 루트 `docs/handoff.md`, `docs/progress.md` | 대기 중 |
| **2** | **`⏳ WAITING`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외, 불가 시 다른 세션의 Claude Opus)* | `Reviewer & Local DB Gate` | Step 1 완료 후 착수. 🐳 **Docker Desktop 필요**. 원장 불변·권한(IDOR)·검증 정적 리뷰(`review.json`)·`test.json`(로컬 DB 업그레이드·신규 2경로 2회 멱등·`TESTS.sql`·`tsc`·`lint`·Vitest·`next build`)·`main` 병합·문서 마감 | `⏳ Step 1 완료 대기` |
| **3** | `⏳ WAITING` | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 실제 CSV 1개 가져오기·가져오기 취소 확인 | Step 2 병합 후 안내함 |


### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R110` | **완료 · 릴리스 `desktop-v0.2.1` 배포·자동 업데이트 확인** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·서명). Run `r110-desktop-auto-update` 마감, 아이콘 교체(`0.2.2`) 배포만 남음 | 보관 문서 「이전 Run 기록 (완료): `r110-desktop-auto-update`」 절, [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4 |
| `R111` | **`main` 커밋 · 운영 DB 적용·확인 쿼리 완료 · `⚠️ LOCAL_DB_DEFERRED`** | 보안 상위 3건(S1 `users` 노출 축소 마이그레이션, S2 CSP·HSTS, S3 CI) `main` 작업 트리 구현. 운영 DB `MIGRATION_USERS_PROFILE_PRIVACY.sql` 적용·README 확인 쿼리 확인(사용자, 2026-11-26). 로컬 DB 통과 전 `main` 커밋은 사용자 지시에 따른 예외임. 남음: 🐳 로컬 `TESTS.sql`(`PRIV-01`) 실행, 배포, 데스크톱 CSP 확인. 나머지 항목은 `R112` 후보 | `docs/to-do.md` `R111`·`R112`, [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료·종료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`, `R110` 자동 업데이트 `main` 병합 `a83503a`) | Windows Tauri 데스크톱 통합(PKCE 단일 콜백·딥링크·`single-instance`) 병합, Rust 빌드·`Cargo.lock` 갱신, 운영 DB·Redirect URL 등록, 사용자 Windows 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제) 모두 2026-11-26까지 완료함. 남은 일 없음 | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4, 기록 상세는 `docs/archive/handoff-archive.md`, `docs/to-do.md` T1~T4 |


### 🗂️ 직전 완료 Run 기록: `r114-game-budgets` *(`R114` 게임별 월 예산·월간 리포트·알림)*

- **Run ID**: `r114-game-budgets` **(완료, `main` 병합 `b161592`, 문서 마감 2026-11-26)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·마감)*
- **Worktree 경로**: `.worktrees/r114-game-budgets` (브랜치 `collab/r114-game-budgets`, 매니페스트 `artifacts/r114-game-budgets/run.json`, 미삭제·원격 미push)
- **Base SHA**: `85d8adcb294bcd4622eb90df3bb826b94a4445d6` · **Target SHA**: `f577f6d5fb3fabcb7c777905dfea5402cc070c81` *(Iteration 02, 산출물 `e47928f`, `main` 병합 `b161592`)*
- **명세**: [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §4. Step 1~2 상세 완료·검토 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, `SCHEMA.sql`). **운영 DB 적용·확인 쿼리 3종·배포·실기기 예산 목록 확인 완료(사용자, 2026-11-26)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: f577f6d5fb3fabcb7c777905dfea5402cc070c81)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R114 SQL·알림·예산 UI)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 이관). 명세 §4 전부(마이그레이션·`SCHEMA.sql`·README 확인 쿼리·`TESTS.sql`·`database.types.ts`·`calculateGameBudgetUsage`·게임 카드 월 예산 모달·지출 페이지 "게임별 예산" 목록·설정 알림 토글 2개·미적용 폴백)·인수 기준 114-1~114-8. 허용 파일: 신규 `sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `src/lib/budget-calculations.ts`·`.test.ts`, `src/app/dashboard/games/**`, `src/app/dashboard/expenses/**`, `src/components/settings/notification-settings-card.tsx`·관련 테스트, 루트 `docs/handoff.md`, `docs/progress.md` | `R114-REV-001` 수정함(지출 1,000행 단위 페이지 조회·초과 테스트) |
| **2** | **`✅ DONE (artifact e47928f8911ee61b9587210c336193bb6e53b2cb; main 병합 b161592d6eb707e37f14f4de1a6b53e16bcf9f40)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외)* | `Reviewer & Local DB Gate` | Iteration 02 정적 재리뷰·격리 DB 게이트·병합 후 전체 검증 | clean, 업그레이드·신규 경로 통과 |
| **3** | **`✅ DONE (2026-11-26, 사용자 확인)`** | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 예산 UI·알림 확인 | 운영 DB `MIGRATION_R114_GAME_BUDGETS.sql` 적용·README 확인 쿼리 3종 확인·배포 후 지출 페이지 "게임별 예산" 목록 실기기 확인 완료(화면 캡처로 사용량·한도·진행 막대·초과 경고색 확인). 80%·100% 알림·월간 리포트 수신은 사용자 별도 언급 없음(확인 필요 시 다음 09:00 KST 배치 이후 확인) |

#### 📝 `r114-game-budgets` 핵심 요약 (2026-11-26)

- **구현**: `user_games.monthly_budget`(`CHECK > 0`), `notification_settings.game_budget_alert`·`monthly_report`, `GAME_BUDGET_80`·`GAME_BUDGET_100`·`MONTHLY_REPORT` 알림(`enqueue_daily_notifications()` 6·7번 절, 금액 미포함), `calculateGameBudgetUsage`(TS·SQL 귀속 규칙 일치), 게임 카드 월 예산 모달, 지출 페이지 "게임별 예산" 목록, 미적용 DB 폴백. 결제·환불 RPC·`expenses` 제약 불변.
- **리뷰**: Iteration 01에서 `R114-REV-001`(P2, 지출 페이지가 1,000행 상한으로 예산 집계 누락 가능) 확인 → Iteration 02에서 `loadExpenses`를 1,000행 단위 `.range()` 페이지 조회로 수정, 재리뷰 clean. 🐳 격리 DB 업그레이드·신규 경로 각 2회 멱등·`TESTS.sql` 59개 PASS, Vitest 1,122개 통과.
- **미확인**: 80%·100% 알림과 월간 리포트 실제 수신(매일 09:00 KST 배치 이후 확인, 선택).
