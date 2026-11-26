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

- **활성 Run**: **`R114` 게임별 월 예산·리포트·알림 (`r114-game-budgets` — Base `85d8adcb294bcd4622eb90df3bb826b94a4445d6`, 브랜치 `collab/r114-game-budgets`, 워크트리 `.worktrees/r114-game-budgets`)** *(명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §4(결정 B1~B12·인수 기준 114-1~114-8)·§7(모델 배정). 직전 Run `r113-data-export`는 2026-11-26 마감함. 이후 `R115` 🐳 → `R116` 순으로 등록함)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, `SCHEMA.sql`). 🐳 Docker Desktop 필요. Step 2에서 격리 로컬 DB 업그레이드·신규 2경로 각 2회 멱등·`TESTS.sql` R114-01/02 PASS 재검증함. 운영 DB 미적용.
- **Iteration 02 Target SHA**: `f577f6d5fb3fabcb7c777905dfea5402cc070c81` *(워크트리 커밋, 미병합, 원격 브랜치: push 안 함. Iteration 01 Target `692ea97b731f7ca171005be3348c8302e16ab59a`, 리뷰 범위는 Base ↔ Iteration 02 Target)* 결제·환불 RPC와 `expenses` 제약은 변경하지 않음(114-8).
- **모델 배정 근거**: `Gemini Models` 한도 소진 중이라 명세 §7 권고대로 배정함(Step 1 `Claude Opus` = SQL·알림 cron·예산 귀속 규칙, Opus 조건 ①).

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: f577f6d5fb3fabcb7c777905dfea5402cc070c81)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R114 SQL·알림·예산 UI)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 이관). 명세 §4 전부(마이그레이션·`SCHEMA.sql`·README 확인 쿼리·`TESTS.sql`·`database.types.ts`·`calculateGameBudgetUsage`·게임 카드 월 예산 모달·지출 페이지 "게임별 예산" 목록·설정 알림 토글 2개·미적용 폴백)·인수 기준 114-1~114-8. 허용 파일: 신규 `sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `src/lib/budget-calculations.ts`·`.test.ts`, `src/app/dashboard/games/**`, `src/app/dashboard/expenses/**`, `src/components/settings/notification-settings-card.tsx`·관련 테스트, 루트 `docs/handoff.md`, `docs/progress.md` | `R114-REV-001` 수정함(지출 1,000행 단위 페이지 조회·초과 테스트) |
| **2** | **`🔄 IN_PROGRESS (Iteration 02 artifact e47928f8911ee61b9587210c336193bb6e53b2cb, main 병합 전)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외)* | `Reviewer & Local DB Gate` | Iteration 02 Target `f577f6d` 재리뷰. 🐳 **Docker Desktop 필요**. TS·SQL 귀속 규칙 정적 리뷰·DB 업그레이드/신규 2경로 2회 멱등·`TESTS.sql`·tsc·lint·Vitest·build 재검증·통과 시 `main` 병합·문서 마감 | Iteration 02 재리뷰 대기 |
| **3** | `⏳ WAITING` | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 예산 UI·알림 확인 | Step 2 병합 후 안내함 |


#### 📝 `r114-game-budgets` Step 1 Iteration 02 (Maker) 완료 기록 (Claude Opus `High`, 2026-11-26)

- **Target SHA**: `f577f6d5fb3fabcb7c777905dfea5402cc070c81` (`collab/r114-game-budgets`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (2개)**: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`. SQL 변경 없음(Iteration 01과 같음).
- **수정 (`R114-REV-001`)**: 지출 페이지 `loadExpenses`를 1,000행 단위 `.range()` 페이지 조회로 바꿈. `target_date` 내림차순 → `id` 내림차순으로 정렬해 페이지 경계를 고정하고, 1,000행 미만 페이지에서 멈춤. 한 페이지라도 실패하면 일부만 반영하지 않고 이전 상태를 유지함(기존 오류 처리와 같음). 예산 목록뿐 아니라 같은 `expenses` 상태를 쓰는 기존 통계·목록도 전체 행으로 계산됨.
- **판단**: 서버 집계 대신 페이지 조회를 고름. 예산 규칙(`calculateGameBudgetUsage`)을 그대로 쓰고 새 RPC·SQL이 필요 없어서임.
- **검증 (실제 실행)**: 게임 행을 모두 2페이지(1,000행 뒤)에 둔 테스트 추가 — 수정 전 코드에서는 이 테스트 `FAIL` 확인, 수정 후 통과. `tsc`·`lint`·Vitest 82파일/1,122개·`next build` 16/16(워크트리에 `.env.local`이 없어 더미 공개 Supabase 값 사용)·`git diff --check` 통과. SQL 변경이 없어 로컬 DB는 다시 돌리지 않음(Step 2 DB 게이트에서 Base ↔ Target 전체로 확인).
- **남은 관찰 (수정 안 함)**: 같은 함수의 자동 확정 표시 조회 `.in("id", confirmedIds)`는 확정 ID를 한 번에 URL로 보냄. ID가 많으면 URL이 길어져 실패할 수 있으나, 실패 시 자동 확정 배지만 숨겨짐(예산·금액 영향 없음). R107-C 기존 코드라 이번 범위 밖임.
- **남음**: Step 2 GPT Codex 재리뷰·DB 게이트·통과 시 `main` 병합 → Step 3 사용자 운영 DB 적용·배포·UI 확인.

#### 📝 `r114-game-budgets` Step 1 (Maker) 완료 기록 (Claude Opus `High`, 2026-11-26)

- **Target SHA**: `692ea97b731f7ca171005be3348c8302e16ab59a` (`collab/r114-game-budgets`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (13개)**: 신규 `sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`(R114 행·R107C 재실행 경고), `sql/tests/TESTS.sql`(R114-01·02), `src/types/database.types.ts`, `src/lib/budget-calculations.ts`·`.test.ts`, `src/app/dashboard/games/page.tsx`·`.test.tsx`, `src/app/dashboard/expenses/page.tsx`·`.test.tsx`, `src/components/settings/notification-settings-card.tsx`, `src/app/dashboard/settings/page.test.tsx`(카드 테스트가 이 파일에 있음).
- **SQL (§4.2)**: `user_games.monthly_budget`(> 0)·설정 열 2개·알림 종류 3개. 새 알림은 날짜를 받는 내부 함수 `enqueue_game_budget_notifications(p_today)`·`enqueue_monthly_report_notifications(p_today)`(service_role 전용)로 만들고 `enqueue_daily_notifications()` 6·7번 절에서 오늘 날짜로 호출함 — 기존 1~5번 절 불변, 테스트에서 날짜 고정 가능. 결제·환불 RPC·`expenses` 제약 변경 없음(114-8, diff 확인).
- **판단**: ① 예산 알림 본문에 게임 이름만 넣고 금액은 뺌(잠금 화면 보호, 기존 `EXPENSE_*` 선례). ② 월간 리포트의 "예산 초과"는 사용액 > 예산(같으면 초과 아님), 100% 알림은 ≥ 100%. ③ 지출 페이지 예산 목록은 '전체 기간'에서는 숨기고 선택한 달에만 표시, 전월 대비는 기존 분석과 같은 확정·`게임` 분류 기준. ④ 예산 조회는 `user_games`를 따로 읽어 공용 `EXPENSE_COLUMNS`에 넣지 않음.
- **검증 (실제 실행)**: 🐳 업그레이드(Base `85d8adc` `SCHEMA.sql` → R114 2회 → `TESTS.sql` 59개 PASS)·신규(Target `SCHEMA.sql` → 2회 → 59개 PASS), 함수 3종 본문 일치, README 확인 쿼리 기대값 일치. 귀속 규칙 변이(예정 행을 `target_date`로 귀속)가 처음에 통과해 경계 금액을 고친 뒤 `FAIL`로 잡힘. `tsc`·`lint`·Vitest 82파일/1,121개·`next build` 16/16·`git diff --cached --check` 통과.
- **후속**: Step 2 Iteration 01에서 `R114-REV-001` 확인됨 → Iteration 02에서 수정함(위 기록).

#### 📝 `r114-game-budgets` Step 2 Iteration 01 검토 기록 (GPT Codex, 2026-11-26)

- **범위·결과**: Base `85d8adcb294bcd4622eb90df3bb826b94a4445d6` ↔ Target `692ea97b731f7ca171005be3348c8302e16ab59a`. `R114-REV-001` P2: 지출 페이지가 `.range()` 없이 단일 조회 결과를 예산 합산에 재사용해 PostgREST 기본 1,000행을 넘을 때 사용액을 누락할 수 있음(114-5). 정적 리뷰 `findings`, artifact 커밋 `b8e3f6296369ffa89aaca8d90f119995be71d52d`.
- **검증**: 원본 로컬 Target DB migration 2회·전체 `TESTS.sql` 통과. 격리 스택에서 Base 업그레이드와 Target 신규 설치 경로 각각 migration 2회·`TESTS.sql` R114-01/02·ROLLBACK 통과. tsc·lint·Vitest 82파일/1,121개·`next build` 16/16·artifact schema(Ajv)·`git diff --check` 통과.
- **남음**: 지출 전량 페이지네이션 또는 동등한 합산 경로와 1,000행 초과 테스트 추가 → 재리뷰·전체 검증 → 통과 시 `main` 병합 → 사용자 운영 적용·배포 확인.

> **다음 단계**: **GPT Codex**(Fallback: Claude Sonnet `Medium`)가 `"인수인계 문서를 확인해"`로 Step 2 Iteration 02 재리뷰(Base `85d8adc` ↔ Target `f577f6d`)·🐳 DB 게이트·통과 시 `main` 병합함.

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


### 🗂️ 직전 완료 Run 기록: `r113-data-export` *(`R113` 데이터 내보내기·백업, 완료)*

- **Run ID**: `r113-data-export` **(완료, `main` 병합 `7f2e4d9`, 후속 정렬 수정 `e0e3f84`, 문서 마감 2026-11-26)** · **Orchestrator**: Claude Sonnet `Medium` *(등록)* · Claude Opus `High` *(Step 2 대체·마감)*

- **`✅ DONE (2026-11-26, Claude Opus High)` — 기능 후보 4종 명세(`R113`~`R116`)**: 명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) 작성함(사용자 질문 카드 결정 8건, 결정표·단계별 인수 기준·모델 배정 권고·위험). Run 순서는 `R113` 내보내기 → `R114` 게임별 예산 🐳 → `R115` CSV 가져오기 🐳 → `R116` 공개 일정 페이지임.
- **`✅ DONE (2026-11-26, Claude Sonnet Medium)` — `R113-REG` Run 등록**: Run `r113-data-export` 워크트리 생성·Step 배정 완료(Gemini 4 Hydrogen 대체). `R114`~`R116`은 `R113` 마감 뒤 차례로 등록함(사용자가 순서를 바꾸면 그에 따름).

#### 🧩 Run: `r113-data-export` *(`R113` 데이터 내보내기·백업)* · **Orchestrator**: Claude Sonnet `Medium` *(2026-11-26 등록, Gemini 한도 소진으로 Hydrogen 대체)*

- **워크트리·브랜치**: `.worktrees/r113-data-export`, `collab/r113-data-export` *(매니페스트 `artifacts/r113-data-export/run.json`)*
- **명세**: [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §3(결정 E1~E7·JSON/CSV 형식·인수 기준 113-1~113-7)·§7(모델 배정). 세부는 명세를 따름.
- **리뷰 범위**: Base `57c76645d4595348d865af321c447b6adcd84464` ↔ Target `773af3702f1c0cad0628499246f1e41fcc670790` *(Step 1)*.
- **모델 배정 근거**: 명세 §7 원안대로 Step 2는 `GPT Codex`임(다른 계정으로 로그인해 사용 가능, 사용자 확인 2026-11-26). Gemini 한도는 소진 상태라 Step 1은 Sonnet임.
- 🐳 Docker 불필요(DB 변경 없음). Tauri 플러그인·Rust 변경 없음(E7).

| Step | 상태 | 담당 모델 | 작업 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: 2a446e72f329ed479c01e1344182c0d0f8d3e2ad)`** | **Claude Sonnet (`Medium`)** *(Fallback: GitHub Copilot)* | 리뷰 finding 수정: 다운로드 클릭 직후 Blob URL을 해제하는 순서 보완, 수정 커밋 기록 | 허용 파일: `src/lib/data-export.ts` 및 관련 테스트만. DB·Tauri 설정 변경 금지. 명세 §3.1~3.4(113-1~113-6) 유지 |
| **2** | **`✅ DONE (SHA: bb4a898, main 병합 7f2e4d9 — Claude Opus 대체)`** | **GPT Codex** *(Fallback: Claude Opus `High` — 도구에서 High 선택)* | Base↔Target 정적 리뷰·재검증 완료, 빌드 통과 후 `main` 병합 | Iteration 02 artifact `68b73e5`; 리뷰 `clean`, tsc·lint·Vitest 통과. `next build` 2회 `.next/types/app` 생성에서 EPERM, 스키마 검증은 Python `jsonschema` 모듈 부재로 미실행. 재검증 환경에서 빌드·스키마 검증 후 병합 판단 |
| **3** | **`✅ DONE (2026-11-26, 사용자 확인)`** | **사용자** | 웹·Windows 설치본에서 파일 저장 1회씩 확인(113-7) | JSON·지출 CSV·수익 CSV 모두 웹·설치본 저장·열기 확인. `R113-TAURI-SAVE` 불필요 |

> **마감**: Step 3 확인 후 사용자 피드백(지출 CSV 정렬 기준 불명확)으로 CSV 정렬을 날짜순으로 바꿈(아래 후속 수정 기록).

#### 📝 `r113-data-export` 마감·후속 수정 기록 (Claude Opus `High`, 2026-11-26)

- **Step 3 (사용자)**: 웹·Windows 설치본에서 JSON·지출 CSV·수익 CSV 저장과 파일 열기를 모두 확인함(113-7 통과).
- **후속 수정 (`main` 직접, `e0e3f84`)**: 지출 CSV가 '날짜'가 아니라 생성시각·ID 순이라 읽기 어렵다는 피드백에 따라 CSV 조회 정렬을 지출 `target_date`→`created_at`→`id`, 수익 `income_date`→`created_at`→`id`로 바꿈. 끝에 `id`가 있어 1,000행 페이지 조회 순서도 안정적임. JSON 백업은 기존 `created_at, id` 유지. 정렬 열을 확인하는 Vitest 1건 추가. `tsc`·`lint`·Vitest 82파일/1,110개·`next build` 16/16·`diff --check` 통과.
- **남음**: `main` push로 웹 배포(데스크톱 설치본 반영은 다음 데스크톱 릴리스 때).

#### 📝 `r113-data-export` Step 2 완료 기록 (Claude Opus `High` — GPT Codex 1순위 대체, 2026-11-26)

- **이어받은 지점**: Codex Iteration 02 리뷰 `clean`·산출물 `68b73e5` 이후 `next build` EPERM과 스키마 검증 미실행으로 멈춘 상태. Target `2a446e7` 조상 확인, Target 이후 `src`·`sql` 변경 없음.
- **원인·재검증**: 워크트리에 자체 `node_modules`가 있어 루트 `next` 실행 파일로 빌드하면 React가 두 벌 로드돼 `useContext` 오류가 남. 워크트리 자체 `next`로 빌드하니 16/16 통과, EPERM은 재현 안 됨. `tsc`·`lint`·Vitest 82파일/1,109개·`diff --check` 재통과, `review.json`·`test.json` 스키마 검증 통과.
- **산출물·병합**: `test.json`을 재실행 결과로 갱신(`passed`) 후 커밋 `bb4a898`, 중간 기록 `df14ef0` → `main` 병합 `7f2e4d9`(no-ff) → 중간 기록 `4f179be`. 병합 후 `main` 재검증 `tsc`·`lint`·Vitest 1,109개·`next build` 16/16 통과.
- **남음**: Step 3 사용자 저장 확인(113-7), `main` push. 원격 브랜치 `collab/r113-data-export`: 수정·산출물 커밋은 push 안 함.

#### 📝 `r113-data-export` Step 2 Iteration 02 검토 기록 (GPT Codex, 2026-11-26)

- **범위**: Base `57c76645d4595348d865af321c447b6adcd84464` ↔ Target `2a446e72f329ed479c01e1344182c0d0f8d3e2ad`. R113-REV-001 수정 확인, 본인 행 필터·제외 테이블·CSV 수식 방지·웹 경로 의존성 검토 결과 `clean`임. 산출물·매니페스트 커밋 `68b73e5681d5f3622dc27afb4d146cbf66de3464`.
- **검증**: tsc·lint·Vitest 82파일/1,109개 통과, `git diff --check` 통과함. `next build`는 두 번 `.next/types/app` 디렉터리 생성에서 `EPERM`으로 실패함. 스키마 검증 스크립트는 Python `jsonschema` 모듈 부재로 실행하지 못함(BOM 제거 후 run/review/test JSON 파싱 통과).
- **남음**: 빌드·스키마 검증을 지원하는 환경에서 재실행 후 통과 시 Step 2 병합, 이후 사용자 웹·Windows 설치본 저장 확인(113-7).

#### 📝 `r113-data-export` Step 2 Iteration 01 검토 기록 (GPT Codex, 2026-11-26)

- **범위**: Base `57c76645d4595348d865af321c447b6adcd84464` ↔ Target `773af3702f1c0cad0628499246f1e41fcc670790`. Target은 워크트리 HEAD였고 이후 `src`·`sql` 차이 없음.
- **결과**: `R113-REV-001` P2 1건 기록함. `src/lib/data-export.ts`에서 다운로드 앵커 클릭 직후 Blob URL을 동기 해제함. 클라이언트에 따라 저장 시작 전에 URL이 폐기될 수 있어 지연 해제 또는 완료 신호가 필요함. 실제 웹·Windows 저장은 113-7에서 확인 필요함.
- **검증**: TypeScript·lint·Vitest 82파일/1,109개·`next build` 16/16 통과함. 빌드에는 더미 공개 Supabase 환경값을 사용함. 리뷰·검증 아티팩트는 커밋 `aebb3855c67d5d776f7a1c900470d9f7e800a72c`에 기록함.
- **남음**: Sonnet Iteration 02 수정 → GPT Codex 재리뷰·재검증 → 통과 시 `main` 병합 → 사용자 웹·Windows 설치본 저장 확인(113-7).

#### 📝 `r113-data-export` Step 1 완료 기록 (Claude Sonnet `Medium`, 2026-11-26)

- **SHA**: `773af3702f1c0cad0628499246f1e41fcc670790`(워크트리, 미push). 신규 `src/lib/export-format.ts`·`data-export.ts`, `src/components/settings/data-export-card.tsx`, 각 Vitest 3종, 수정 `src/app/dashboard/settings/page.tsx`(카드 1줄).
- **구현**: 설정 페이지 "데이터 내보내기" 카드(버튼 3개, 진행 중 전체 비활성, 완료·실패 안내). JSON은 §3.2 형식(19개 본인 테이블, `skipped`·`catalog` 포함), CSV는 §3.3(BOM·CRLF·따옴표·수식 방지, 숫자 열은 숫자로 출력). 1,000행 단위 `.range()` 조회, 오프라인이면 조회 없이 안내.
- **판단**: `catalog`는 참조된 게임·일정 이름만 담고 실패 시 `skipped`에 `catalog`로 기록함. 일정 테이블 이름은 `game_schedules`임(명세의 `schedules`는 논리명). 알 수 없는 코드는 원문 코드로 내보냄.
- **검증(실행함)**: `tsc` 0, lint 0, Vitest 82파일/1109개(신규 25개), `next build` 16/16, `git diff --check` 통과. 113-1~113-6 대응. **미검증**: 113-7(웹·설치본 실제 저장)은 사용자 Step 3임.
- **남음**: Step 2 리뷰(`GPT Codex`)·병합. 원격 브랜치: push 안 함.

#### 📝 `R113`~`R116` 명세 완료 기록 (Claude Opus, 2026-11-26)

- **사용자 결정**: 내보내기는 JSON 전체+CSV·복원 제외, 게임 예산은 경고·알림만·매달 같은 한도·예정+확정 합산, 가져오기는 확정 기록·자산·포인트 미반영·자체 형식+일반 CSV 열 지정, 공개 페이지는 빌드 생성·배포 때만 갱신·진행/예정+최근 3개월.
- **핵심 설계 판단**: 가져온 행은 `WALLET`·`deduct_from_asset = false`·포인트 0으로 고정함. 기존 `refund_expense_payment`는 `NAVER_PAY`면 자산 차감 여부와 무관하게 네이버페이 잔액을 늘리므로, 원본 결제수단을 그대로 넣으면 환불 시 원장이 틀어짐(원본 수단은 메모에 보존).
- **기타 판단**: 게임 예산은 `user_games.monthly_budget` 열(RLS 직접 쓰기)·알림은 기존 `enqueue_daily_notifications()` 확장, 공개 페이지는 빌드 시점 서버 컴포넌트 + anon REST `fetch`(supabase-js 미사용)·`NEXT_PUBLIC_SITE_URL` 없으면 sitemap만 생략.
- **미결(기본값 진행 가능)**: 명세 §9 4건. `src/**`·`sql/**` 변경 없음.
