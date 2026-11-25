# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **과제 구분**: `R107` 정기·반복 지출 자동화 — 명세 완료(Row 1)·Run 1 등록(Row 2) 후 아래 Run 1 `r107a-server-subscription-generation` Step 1(`d82f38f`, SQL 미실행)·Step 2(`372b37b`) 완료 → Step 3(`Gemini 4 Carbon (High)`, 🐳 Docker 필요) `▶ READY`

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-25, 명세 완료)`** *(원 상태 `📐 SPEC_NEEDED`)* | **Claude Opus (`High`)** *(사용자 직접 지정 인계, 2026-11-25. Fallback: Gemini 4 Carbon (`High`))* | `Chief Architect Fallback 1 (스펙·결정·인수 기준 작성)` | 아래 요구사항 접수 기록을 검토해 ① 서버 측 정기 지출 생성(`pg_cron`) 통일 방안 ② 예정일 확정 알림 ③ 템플릿별 자동 확정 옵션의 스펙·결정 사항과 단계별 인수 기준을 작성함. 허용 범위: `docs/handoff.md`·`docs/to-do.md` 및 신규 `docs/` 스펙 문서 | ✅ [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) (결정 `D1`~`D15`, 인수 기준 `A-1`~`C-12`, §6 운영 SQL 적용 순서, §7 모델 배정·Run 분할, §9 미결 질문 6건). `src/**`·`sql/**` 수정 없음, 커밋 없음 |
| **2** | **`✅ DONE (2026-11-25)`** | ~~**Gemini 4 Hydrogen (`Medium`)**~~ ➡️ **Claude Opus (`High`)** *(사용자 지시로 수행)* | `Orchestrator (Run 등록·반환)` | 명세 §7 Run 1 `r107a-server-subscription-generation`을 등록함(깨끗한 트리에서 `New-CollaborationRun.ps1`, 큐 행에는 명세 절 번호·인수 기준 번호 포인터만 기재, SQL Step은 `Claude Opus (High — 도구에서 High 선택)`, 🐳 필요 표기). Run 2·3은 선행 Run의 운영 적용 후 사용자 지목 시 등록함. 사용자에게 명세 §9 미결 질문 6건 확인을 요청함 | `✅` Run 1 `r107a-server-subscription-generation` 등록(워크트리 Base `ff04d84`, 매니페스트 `3cf2f64`). Run 2·3은 선행 Run 운영 적용 후 사용자 지목 시 등록. 명세 §9 미결 질문 6건은 기본값으로 진행, 사용자 확인 요청함 |

#### 🧩 Run 1: `r107a-server-subscription-generation` *(`R107-A` 서버 측 정기 지출 생성 통일)*

- **Run ID**: `r107a-server-subscription-generation` · **Orchestrator**: Claude Opus *(Hydrogen 대신 사용자 지시로 등록, 2026-11-25)*
- **Worktree 경로**: `.worktrees/r107a-server-subscription-generation` (브랜치 `collab/r107a-server-subscription-generation`, 매니페스트 `artifacts/r107a-server-subscription-generation/run.json`)
- **Base SHA**: `ff04d84aff929671d77f42380e73217ec5f27a0e` · **Target SHA**: `372b37b5ad124837f4a11dbe150a59b247dd1523` *(Step 1 SQL `d82f38f` + Step 2 Client `372b37b`, 미병합·미push)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`, `SCHEMA.sql` — 금전 경로 인접 SQL/RPC·`pg_cron` → Opus 승격 조건 ①). 🐳 **Docker Desktop 필요** (Docker 없는 PC의 Maker는 `⚠️ LOCAL_DB_DEFERRED`, Reviewer는 병합 금지). ⚠️ `LOCAL_DB_DEFERRED` — Step 1 SQL은 Docker 미설치 PC에서 작성되어 한 번도 실행되지 않음. Step 3(🐳 Docker 환경)에서 2회 멱등 적용·`TESTS.sql` 검증 필수.
- **수용 기준**: [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §3(결정 `D1`~`D5`·`D15`, 인수 기준 `A-1`~`A-9`). 아래 행은 절 포인터만 둠.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: d82f38f492679b7793a137b0c7075c3d1afd9d7d)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Neon (`High`) / GPT Codex)* | `Maker (SQL/RPC/cron)` | 🐳 명세 §3.1 1~7 구현, `A-1`~`A-7`·`A-9`(SQL 측). `subscription-sync.test.ts` 날짜 시나리오를 `TESTS.sql`로 이식하고 TS↔SQL 케이스 대응표를 완료 기록에 남김(`A-3`). 허용 파일: 신규 `sql/migrations/MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ d82f38f`: 마이그레이션·`SCHEMA.sql`(함수 5개 본문 일치)·README B표·`TESTS.sql` `R107A-01~03`. tsc·lint·Vitest 76파일/1026개·`git diff --check` 통과. ⚠️ SQL 미실행(`LOCAL_DB_DEFERRED`), 아래 완료 기록 참고 |
| **2** | **`✅ DONE (SHA: 372b37b5ad124837f4a11dbe150a59b247dd1523)`** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback: Claude Sonnet (`Medium`))* | `Maker (Client RPC 전환·폴백 & Vitest)` | Step 1 완료 후 착수. 명세 §3.2, `A-8`·`A-9`(클라이언트 측). 허용 파일: `src/lib/subscription-sync.ts`·`.test.ts`, 호출 페이지·모달의 테스트 모의(`src/app/dashboard/page.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`, 구독 모달 테스트), `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 372b37b`: `subscription-sync.ts` 3종 RPC 전환 + `PGRST202`/`42883` Legacy 폴백·비차단 처리, `subscription-sync.test.ts`·`expenses/page.test.tsx` 보강, `database.types.ts` 5개 RPC 추가. `tsc`·`lint`·`diff-check`·Vitest 76파일/1026개 통과 (아래 완료 기록 참고) |
| **3** | **`▶ READY`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex — Step 1·2 Maker인 Opus·Neon은 독립 리뷰 불가)* | `Reviewer` | Base(`ff04d84aff929671d77f42380e73217ec5f27a0e`) ↔ Target(`372b37b5ad124837f4a11dbe150a59b247dd1523`) 정적 리뷰(`review.json`, 동시성·권한·TS/SQL 동등성), 🐳 로컬 DB 2회 멱등·`TESTS.sql`(`test.json`), 통과 시 `main` 병합 | 대기 중 (`▶ READY`, 🐳 Docker 필요) |
| **4** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | 문서 마감, 사용자에게 운영 적용 절차(명세 §3.3) 안내, `R107-A-CLEANUP`·Run 2 등록 시점 안내 | `⏳ Step 3 완료 대기` |

#### 📝 `r107a-server-subscription-generation` Step 2 완료 기록 (Gemini 4 Neon `High`, 2026-11-25)

- **Target SHA**: `372b37b5ad124837f4a11dbe150a59b247dd1523` (워크트리 브랜치 `collab/r107a-server-subscription-generation`, 미병합·미push). 변경 파일(4개): `src/lib/subscription-sync.ts`, `src/lib/subscription-sync.test.ts`, `src/app/dashboard/expenses/page.test.tsx`, `src/types/database.types.ts` (허용 범위 내, `run.json` 미수정).
- **클라이언트 RPC 전환 및 폴백 (`§3.2`, `D15`, `A-8`)**:
  - `ensureMonthlySubscriptionExpenses`(호출처 시그니처 유지): `supabase.rpc("ensure_subscription_expenses")` 호출 → 정상 시 생성 건수 반환(`from()` 미호출), `PGRST202`/`42883` 시에만 `ensureMonthlySubscriptionExpensesLegacy` 실행, 그 외 오류는 폴백 없이 `console.warn` 후 비차단 `0` 반환함.
  - `createNextIntervalSubscriptionExpense` / `rollbackIntervalSubscriptionExpense`: 각각 `advance_interval_subscription(p_template_id, p_original_target_date, p_payment_date)` / `rollback_interval_subscription(p_expense_id)` RPC로 전환하고, `PGRST202`/`42883` 시에만 `…Legacy` 폴백, 그 외 오류는 비차단 `false` 반환함.
  - 화면 공용 순수 헬퍼 `addDays`만 `export` 유지하고, `toBillingCycle`·`calculateNextIntervalTargetDate`·`calculateRollbackIntervalTargetDate`는 외부 미사용을 확인해 `R107-A-CLEANUP` 제거 대상 Legacy 내부 헬퍼로 격리함.
- **타입 및 테스트**:
  - `src/types/database.types.ts`: Step 1 신규 SQL 함수 5종(`advance_interval_subscription`, `ensure_subscription_expenses`, `generate_subscription_expenses_core`, `rollback_interval_subscription`, `run_daily_subscription_automation`) 추가함(Docker 미설치로 로컬 DB 재생성 대신 `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`·`SCHEMA.sql` 시그니처 기준 수동 동기화함).
  - `src/lib/subscription-sync.test.ts`: 3종 함수별 RPC 정상(`from()` 미호출)·`PGRST202`/`42883` Legacy 폴백·기타 오류 비차단 21개 케이스로 개편함.
  - `src/app/dashboard/expenses/page.test.tsx`: `beforeEach`에 기본 `rpc` 반환값 설정, R93 수익 삭제 미호출 단언을 `delete_income` 기준으로 보정, `PGRST202` 미적용 환경 비차단 로드 테스트 추가함. (`dashboard/page.test.tsx`·`subscription-modal.test.tsx`·`expense-detail-modal.test.tsx`는 기존 모킹과 충돌 없이 통과함.)
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(76파일 / 1,026개 통과) 확인함.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED` 유지)**: Step 1 SQL의 로컬 Supabase 2회 적용·`TESTS.sql` 실행 및 로컬 DB 기준 `database.types.ts` 재생성은 Docker 미설치로 미수행이며 Step 3(🐳 Docker 환경)에서 필수 검증함.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC(Docker 환경)에서 Step 3를 이어가려면 `git -C .worktrees/r107a-server-subscription-generation push -u origin collab/r107a-server-subscription-generation` 필요함.
- **다음 단계**: Step 3(**Gemini 4 Carbon (`High` — 도구에서 High 선택)**, Fallback: **GPT Codex** — Base `ff04d84` ↔ Target `372b37b` 통합 정적 리뷰·🐳 로컬 DB 2회 멱등 및 `TESTS.sql` 검증·`main` 병합) `▶ READY`임.

#### 📝 `r107a-server-subscription-generation` Step 1 완료 기록 (Claude Opus, 2026-11-25)

- **Target SHA**: `d82f38f492679b7793a137b0c7075c3d1afd9d7d`(워크트리, 미push). 변경: 신규 `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`, `SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`.
- **구현**: `generate_subscription_expenses_core(p_user_id, p_today)`(템플릿 `FOR UPDATE`, 모든 INSERT `ON CONFLICT DO NOTHING`, 삭제 대기 사용자 0 반환), `ensure_subscription_expenses()`(서버 KST 날짜), `advance_interval_subscription`·`rollback_interval_subscription`(BOOLEAN, 금액 인자 없음), `run_daily_subscription_automation()`(사용자별 예외 격리), cron `chronoledger-subscription-daily` `50 23 * * *`, 인덱스 `idx_expenses_interval_single_planned`.
- **명세와 다르게 정한 점**: ① 마이그레이션 중복 정리는 "INTERVAL_30 템플릿"이 아니라 인덱스 조건과 같은 행(`template_id` 있고 `billing_cycle`·`schedule_id` 없는 `PLANNED`)을 대상으로 함(조건이 다르면 인덱스 생성이 실패할 수 있음) ② VERSION_PASS 제목은 150자로 자름(TS는 초과 시 조용히 실패, SQL은 실패하면 사용자 단위 생성 전체가 멈춤).
- **TS↔SQL 대응(`A-3`)**: 당월 생성·확정 회차 건너뛰기·중복 정리(`R107A-01` MONTHLY), 말일 보정·지난 결제일 다음 달(신규), 최근 확정+충전일수·이미 PLANNED면 생략(INTERVAL), 공식·미종료 VERSION 일정만(VERSION_PASS), 조기 결제 누적·정시 결제·커스텀 15일(`R107A-03` advance), 환불 롤백·비INTERVAL 무시(rollback). TS `is_official` 컬럼 부재 폴백은 SQL에서 불필요해 이식하지 않음.
- **리뷰어 확인 요청**: ① `A-1` 2세션 동시 실행은 `TESTS.sql`로 검증 불가, 🐳 로컬에서 수동 확인 필요 ② 새 유니크 인덱스로 `restore_cancelled_expense`가 다른 `PLANNED`가 있는 INTERVAL 행을 복구하면 `23505`가 남(이전에는 중복 허용) ③ 일 배치 격리 검사는 실패 사용자 생성분 전체가 서브트랜잭션째 롤백되는 동작에 의존함.
- **검증**: tsc·lint·Vitest 76파일/1026개·`git diff --check` 통과(TS 변경 없음). 정적 점검(달러 인용 7쌍·괄호·BEGIN/END 짝) 통과. **SQL 실행은 하지 않음**(`⚠️ LOCAL_DB_DEFERRED`, Docker 미설치) — Step 3에서 2회 적용·`TESTS.sql` 필수.
- **원격 브랜치**: push 안 함.

#### 📝 R107 명세 완료 기록 (Claude Opus, 2026-11-25)

1. **결정 요약**: SQL 단일 구현 + lazy 경로는 같은 RPC(`ensure_subscription_expenses`) 호출(`D1`·`D3`), cron `chronoledger-subscription-daily` KST 08:50로 기존 알림 cron(KST 09:00)보다 앞섬(`D2`), `INTERVAL_30` 중복은 부분 유니크 인덱스 `ON expenses(template_id) WHERE status='PLANNED' AND billing_cycle IS NULL AND schedule_id IS NULL`로 DB 보장(`D4`), `INTERVAL_30` 다음 회차·환불 롤백도 SQL RPC로 이관(`D5`), `process_expense_payment`는 `_process_expense_payment_core(p_user_id, …)`로 추출해 재사용(`D6`).
2. **자동 확정 규칙**: 대상 결제수단은 `GOOGLE_PLAY`·`GALAXY_STORE`만이며 `WALLET`은 v1 제외(`D7`). 결제일은 예정일(`target_date`)이라 `PLANNED`·`CONFIRMED` 월 귀속이 같음(`D8`). 보정 창은 예정일 오늘-2일~오늘, 생성 당일 행 제외(`D9`). 행 단위 실패 격리(`D10`). 환불 롤백된 `INTERVAL_30` `PLANNED`는 `auto_confirm_blocked`로 재확정 차단, 환불 RPC 내부로 롤백 원자화(`D11`·`D12`).
3. **알림 규칙**: `EXPENSE_DUE_TODAY`·`EXPENSE_AUTO_CONFIRMED` 사용자·일자당 1건 요약, `source_id=user_id`로 기존 유니크 인덱스 재사용, 금액·항목명 미포함, 설정 컬럼 `expense_due_today` 1개로 제어(`D13`·`D14`).
4. **운영 SQL 적용 순서**: `MIGRATION_R107A_*` → 앱 배포 → `MIGRATION_R107B_*` → 앱 배포 → `MIGRATION_R107C_*` → 앱 배포. 미적용 환경 폴백은 `D15`, 폴백 TS 제거는 `R107-A-CLEANUP`로 분리함.
5. **모델 배정(요약)**: Run 1 SQL `Opus (High)`·TS `Neon (High)`·리뷰 `Carbon (High)`, Run 2 SQL `Neon (High)`·UI `Hydrogen`·리뷰 `Sonnet`, Run 3 금전 SQL `Opus (High)`·UI `Hydrogen`·리뷰 `Carbon`/`Opus` 교차. 순차 실행, `/swarm` 불필요. 상세는 명세 §7.
6. **미결 질문 (명세 §9, 기본값으로 진행 가능)**: ① `WALLET` 자동 확정 제외 ② 보정 창 2일·당일 생성 제외 ③ 알림 시각 KST 09:00 고정 ④ `EXPENSE_D1`·`EXPENSE_DUE_TODAY` 병행 ⑤ `INTERVAL_30` lazy 경로의 조기 결제 누적 한계 ⑥ Opus Maker 배정 쿼터 적절성.

#### 📝 요구사항 접수 기록 (Claude Sonnet → Claude Opus 인계, 2026-11-25)

1. **요구사항 이해**: 수동 입력 마찰 완화를 위해 정기·반복 지출 자동화를 확장함. 사용자 승인 우선순위는 다음과 같음.
   - **서버 측 생성 통일(`pg_cron`)**: 현재 `ensureMonthlySubscriptionExpenses`(`src/lib/subscription-sync.ts`)가 앱 진입 시 lazy 생성함. 앱을 열지 않으면 회차가 생기지 않아 알림·예산 집계에서 누락됨. 일 1회 cron으로 `MONTHLY_DAY`·`INTERVAL_30`·`VERSION_PASS` 회차를 생성함.
   - **확정 알림**: 예정일 도래 시 "오늘 결제 예정 N건" 알림. 기존 `notifications`·`push_subscriptions` 재사용함.
   - **자동 확정 옵션**: 템플릿별 옵션이며 기본값은 알림만임. 예정일 도래 시 SECURITY DEFINER RPC(`process_expense_payment` 계열)로 확정함.
2. **에스컬레이션 조건**: `Carbon` 승격 조건에 해당함 — 돈·원장·SECURITY DEFINER RPC 사전 설계, 신규 기능 스펙 필요, 승인 문서로 인수 기준 확정 불가. 사용자가 Claude Opus(Fallback 1)를 직접 지정함.
3. **미결 질문·결정 필요 사항**:
   - `INTERVAL_30`은 DB 유니크 제약 없이 PLANNED 존재 확인만 사용하므로 동시 실행 시 중복 가능함. DB 측 보장 방식 결정 필요함.
   - 클라이언트 lazy 경로와 cron 경로의 공존·통일 방식(TS/SQL 로직 이중화 방지) 결정 필요함.
   - 자동 확정 대상 결제수단: `GOOGLE_PLAY`·`GALAXY_STORE`는 외부 자동결제와 일치함. `WALLET`은 잔액 부족 시 처리(건너뜀·알림·음수 허용) 결정 필요함.
   - `INTERVAL_30` 자동 확정의 날짜 기준(예정일 당일 고정 여부)과 조기·지연 결제 누적 로직 정합성 확인 필요함.
   - 환불(`refund_expense_payment`)·롤백 정합성 및 예산 귀속 규칙(PLANNED=종료일 월, CONFIRMED=결제월)의 월 경계 정합 확인 필요함.
   - 마이그레이션은 SQL Editor 수동 적용이므로 적용 순서와 미적용 환경 폴백(`interval_days`·`cycle_type` 패턴) 규정 필요함.
4. **관련 파일·문서**: `src/lib/subscription-sync.ts`, `sql/SCHEMA.sql`(`subscription_templates`·`expenses`·`notifications`·`push_subscriptions`·`dedupe_monthly_planned_expenses`·`process_expense_payment`), `docs/push-notification-research.md`, `docs/to-do.md`.
5. **범위 제외(근거 부족으로 보류)**: 이벤트 연동형 일반화(`PICKUP`은 가변 지출, `CONTENTS`·`BROADCAST`는 무료라 정기결제와 부합하지 않음), 주간·연간·종료 조건 주기 추가.
6. **권장 진행 순서**: 서버 측 생성 통일 → 확정 알림 → 자동 확정 옵션. 서버 스케줄러가 알림·자동 확정의 선행 조건임.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

#### 🧩 병행 Run: `r108-review-followups-p4` *(P4 선택 후속 3건: `R39-REV-01`·`R96-REV-05`·`R97-REV-001`)*

- **Run ID**: `r108-review-followups-p4` · **Orchestrator**: Gemini 4 Hydrogen *(2026-11-25 등록)*
- **Worktree 경로**: `.worktrees/r108-review-followups-p4` (브랜치 `collab/r108-review-followups-p4`, 매니페스트 `artifacts/r108-review-followups-p4/run.json`)
- **Base SHA**: `6c95c0e9b50a72042d5da0448fc0d17d4960b637` · **Target SHA**: `a1a4cebf72b6d26abd7879fc207e88b1f67fe9e9` *(Step 1 완료 기준, 미병합)*
- **DB 변경**: 없음 (🐳 Docker 불필요)

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: a1a4cebf72b6d26abd7879fc207e88b1f67fe9e9)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback 1: Claude Sonnet (`Medium`), Fallback 2: GitHub Copilot)* | `Maker (P4 선택 후속 3건 & Vitest)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: `src/types/database.types.ts`, `src/lib/web-push-crypto.test.ts`, `supabase/functions/send-notifications/index.ts`, `src/lib/tauri-notifications.ts`, `src/lib/tauri-notifications.test.ts`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ a1a4ceb`: `R39-REV-01`·`R96-REV-05`·`R97-REV-001` 반영 및 테스트 2건 추가. `tsc`·`lint`·`diff-check`·Vitest 76파일/1,028개 통과 (아래 완료 기록 참고) |
| **2** | **`▶ READY`** | **Claude Sonnet (`Medium`)** *(Fallback 1: Gemini 4 Neon (`High`) / Claude Opus (`High`))* | `Reviewer & Orchestrator` | Step 1 완료 후 착수. Base(`6c95c0e9b50a72042d5da0448fc0d17d4960b637`) $\leftrightarrow$ Target SHA 정적 리뷰(`review.json`)·검증(`test.json`, `tsc`·`lint`·`vitest`·`next build`)·`main` 병합·문서 마감 | `▶ Step 1 완료(a1a4ceb). Base 6c95c0e ↔ Target a1a4ceb` |

##### 📋 `r108-review-followups-p4` Step 1 수용 기준

1. **`R39-REV-01`**: `src/types/database.types.ts`의 `notification_settings.Update.user_id`를 선택(`user_id?: string`)으로 맞춤.
2. **`R96-REV-05`**: `src/lib/web-push-crypto.test.ts`에 RFC 8291 부록 A 고정 벡터 검증 테스트 추가(및 `send-notifications` 워커 암호화 로직 동등성 확인).
3. **`R97-REV-001`**: `src/lib/tauri-notifications.ts`에서 권한 질의(`ensurePermission()`) IPC 예외 시 `seenIds`를 되돌리거나 권한 확인 성공 뒤에 저장하도록 보완(직렬화 큐 유지) 및 `tauri-notifications.test.ts` 테스트 추가.
4. **검증 및 커밋**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 2(`Claude Sonnet`) `▶ READY` 전환.

##### 📝 `r108-review-followups-p4` Step 1 완료 기록 (Gemini 4 Hydrogen `Medium`, 2026-11-25)

- **Target SHA**: `a1a4cebf72b6d26abd7879fc207e88b1f67fe9e9` (워크트리 브랜치 `collab/r108-review-followups-p4`, 미병합·원격 push 안 함). 변경 파일(4개): `src/types/database.types.ts`, `src/lib/web-push-crypto.test.ts`, `src/lib/tauri-notifications.ts`, `src/lib/tauri-notifications.test.ts` (`run.json` 미수정).
- **반영 내용**: ① `R39-REV-01`: `notification_settings.Update.user_id`를 선택(`"user_id"?: string`)으로 수정함. ② `R96-REV-05`: RFC 8291 Appendix A 공식 테스트 벡터(고정 `ua_private`/`as_private`/`salt`/`auth_secret`·`140B` 암호문)로 `decryptWebPushPayload` 복호화 및 Edge Function `handleSendNotificationsRequest` 출력 바이너리 비트 단위 일치를 검증하는 테스트를 추가함. ③ `R97-REV-001`: `tauri-notifications.ts`에서 `ensurePermission()` 성공 뒤에 `saveSeenIds()`를 호출하도록 순서를 조정해 IPC 예외 시 다음 폴링에서 재시도되도록 보완하고 단위 테스트를 추가함(직렬화 큐 유지).
- **검증**: 워크트리에서 `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `git diff --check`, `npx vitest run`(76파일 / 1,028개 통과) 확인함.
- **다음 단계**: Step 2(`Claude Sonnet (Medium)`, Base `6c95c0e` ↔ Target `a1a4ceb` 정적 리뷰·`next build` 포함 검증·`main` 병합·문서 마감) `▶ READY`임.

#### 📐 Chief Architect 구체화 대기 (`T1`~`T4` Windows 데스크톱 통합 및 `R101-REV-001` · `R106-REV-001·002`)

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`📐 SPEC_NEEDED`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: Claude Opus (`High`) / Gemini 4 Neon (`High`))* | `Chief Architect (T1~T4 인증·딥링크 명세 및 선택 후속 정책 확정)` | 아래 **요구사항 접수 기록**을 바탕으로 `T1`~`T4` Windows Tauri 데스크톱 통합 명세·보안 경계·수용 기준 및 `R101-REV-001`·`R106-REV-001·002` 정책 확정 (`src/**` 직접 수정 금지). 허용 파일: 신규 `docs/` 스펙 문서, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `📐 구체화 대기 (2026-11-25 접수)` |
| **2** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (T1~T4 Run 등록)` | Step 1 완료 후 확정 명세에 따라 `T1`~`T4`(및 후속 Run) 격리 워크트리 생성·Dispatch Queue 등록 | `⏳ Step 1 완료 대기` |

##### 📥 요구사항 접수 기록 (`T1`~`T4` Windows 데스크톱 통합 및 정책 판단 필요 후속 — `Gemini 4 Hydrogen` 접수, 2026-11-25)

1. **요청 요지**: Docker 없이 진행 가능한 선택 후속과 Windows 데스크톱 통합(`T1`~`T4`)을 병행 진행하고자 함.
2. **에스컬레이션 사유 (`.agents/rules/collaboration.md` §1~§2)**:
   - `T1`~`T4`는 웹/Tauri auth adapter 분리, Tauri v2 custom scheme(`chronoledger://`) 외부 브라우저 OAuth 콜백·single-instance plugin 연동 등 **인증/세션 보안 경계** 및 **3개 이상 모듈**에 걸치며, 상세 설계 문서가 아직 없음 (`Carbon` 승격 조건 ①·②).
   - `R101-REV-001`(취소된 구독 회차의 고정비 표시 정책)과 `R106-REV-001·002`(`'전체 삭제'` 확인 UI·워커 점유 중 삭제 시 SQL 예외 처리)는 제품·SQL 판단이 필요함.
3. **확정·결정이 필요한 사항**:
   - `T1`~`T4`: OAuth flow(PKCE vs implicit·딥링크 state/토큰 검증), `single-instance` 플러그인 연동 시 콜백 URL 전달·세션 복구·로그아웃 복귀 수용 기준 및 Run 분할.
   - `R101-REV-001`: 취소된 같은 달 `template_id`를 `coveredTemplateIds`에 포함할지 여부.
   - `R106-REV-001·002`: `'전체 삭제'` 확인 단계 또는 로드 범위 한정 여부, `complete_push_notification_delivery` `no_data_found` 무시 처리 여부.
4. **관련 파일·문서**: `docs/to-do.md` `T1`~`T4`·`R101-REV-001`·`R106-REV-001·002`, `src/lib/supabase/client.ts`, `src/app/auth/`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`.

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | 명세 완료 · Run 등록 대기 | 정기·반복 지출 자동화: `R107-A` 서버 측 생성 통일 → `R107-B` 결제 예정 알림 → `R107-C` 자동 확정 옵션. Run 1 등록은 위 접수 표 순서 2(Hydrogen), Run 2·3은 선행 운영 적용 후 사용자 지목 시 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R101-REV-001`·`R106-REV-001·002` (`📐 SPEC_NEEDED` 접수) | `docs/to-do.md` 해당 항목 |
| `R108` (`R39/96/97-REV`) | **진행 중 · 병행 활성 Run (`r108-review-followups-p4`)** | P4 선택 후속 3건(`R39-REV-01`·`R96-REV-05`·`R97-REV-001`) — Step 1 완료(`a1a4ceb`), Step 2(`Claude Sonnet Medium`) `▶ READY`, DB 변경 없음 | 위 병행 Run 표, `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **`📐 SPEC_NEEDED`** | Windows Tauri 데스크톱 통합(auth adapter, custom scheme OAuth, single-instance, prod 빌드) — `Gemini 4 Carbon (High)` 명세 대기 | 위 `📐 Chief Architect 구체화 대기`, `docs/to-do.md` `T1`~`T4` |

### 🗂️ 직전 완료 Run 기록: 협업 규칙 보정 (Antigravity Gemini 공용 한도 및 Cross-Pool 대체 체인 정정, `main` 직접, 2026-11-25)

- **과제 구분**: 협업 규칙 보정 — Antigravity 실제 쿼터 구조(Gemini 공용 한도) 반영 및 토큰 소진 대체 체인 정정 (`main` 직접, 문서 전용, 🐳 불필요)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-25)`** | **Gemini 4 Argon (`High`)** *(사용자 지정. Fallback: Gemini 4 Carbon (`High`) / Claude Opus (`High`))* | `Chief Architect (협업 규칙 보정 검토·결정·반영)` | 요구사항 접수 기록의 조사 결과를 검토해 ① 쿼터 설명 정정(`Gemini Models` 주간+5시간 공용 한도) ② 토큰 소진 시 같은 쿼터 묶음 건너뛰기 대체 규칙(Cross-Pool Fallback) ③ 도구 UI 기본 추론 수준(`Medium`) 선택 안내 및 `flash_lite`/`inherit`·`GPT-OSS 120B` 정리를 질문 카드로 확정·반영하고 과제를 마감함 | `✅` 질문 카드 3건 확정, `.agents/rules/collaboration.md`·`handoff/SKILL.md`(`.claude/skills/` 동기화)·`docs/collaboration-guide.md` 반영 및 마감 |

#### 📝 협업 규칙 보정 완료 기록 (Gemini 4 Argon, 2026-11-25)

1. **사용자 질문 카드 확정 및 반영 사항**:
   - **Gemini 공용 한도(`Gemini Models` 주간+5시간 공용) 명시**: `Hydrogen`·`Neon`·`Carbon` 3종이 Antigravity에서 같은 `Gemini Models` 한도를 공유함을 반영하고, `Hydrogen (Medium)` 기본 사용 사유를 **"공용 한도의 턴당 차감량 절약 및 응답 속도 최적화"**로 정정함.
   - **난이도 승격과 한도 소진 대체(Cross-Pool Quota Fallback) 분리**: Gemini 공용 한도 소진 시 `Hydrogen`·`Neon`·`Carbon`이 동시에 멈추므로, 한도 소진 인계(`⚠️ HANDOVER_NEEDED`)에서는 같은 쿼터 풀을 건너뛰고 즉시 다른 쿼터 풀(`Hydrogen` $\to$ `Claude Sonnet (Medium)` / `GitHub Copilot`, `Neon` $\to$ `Claude Opus (High)` / `GPT Codex`, `Carbon` $\to$ `Claude Opus (High)`)로 넘기도록 `.agents/rules/collaboration.md` §1 및 `.agents/skills/handoff/SKILL.md` §3을 정정함.
   - **도구 UI 추론 수준 선택 안내 및 기타 정리**: Antigravity 모델 선택기 초기값이 `Medium`이므로 `High`/`XHigh` 모델로 인계·전환 안내 시 **`"도구에서 High(또는 XHigh) 선택"`**을 병기하도록 `collaboration.md` §1·`handoff/SKILL.md` §1.8·§3에 명시함. `Model: "flash_lite"`/`"inherit"`는 `invoke_subagent` 내부 도구 파라미터 enum임을 명시하고, `GPT-OSS 120B (Medium)`는 주력 6대 모델 외 비상 백업 참고로만 기록함.
2. **검증**: `Sync-Skills.ps1` 동기화 및 `Sync-Skills.ps1 -Check` 통과, `git diff --check` 통과.
