# R107 정기·반복 지출 자동화 명세 (서버 생성 통일 → 결제 예정 알림 → 자동 확정)

> 작성: Claude Opus (High), Chief Architect Fallback 1, 2026-11-25. `📐 SPEC_NEEDED` 수행 산출물임. 스펙·결정·인수 기준만 포함하며 `src/**`·`sql/**`는 수정하지 않음. Run 등록·워크트리 생성·모델 최종 배정은 Gemini 4 Hydrogen이 이 문서를 근거로 수행함.
> 접수 기록·결정 요약·큐 행은 [`docs/handoff.md`](handoff.md), 백로그는 [`docs/to-do.md`](to-do.md) `R107`에 둠.

## 0. 범위와 ID

| ID | 내용 | 선행 |
| :--- | :--- | :--- |
| `R107-A` | 서버 측 정기 지출 생성 통일 (`pg_cron` 일 1회 + 클라이언트 lazy 경로를 같은 SQL 로직으로 통일) | 없음 |
| `R107-B` | "오늘 결제 예정 N건" 알림 (`notifications`·`push_subscriptions` 재사용) | `R107-A` |
| `R107-C` | 템플릿별 자동 확정 옵션 (기본값 꺼짐, `GOOGLE_PLAY`·`GALAXY_STORE`만) | `R107-A`, `R107-B` |

- **범위 제외 (근거 부족으로 보류, 사용자 결정)**: 이벤트 연동형 일반화(`PICKUP`·`CONTENTS`·`BROADCAST`는 가변 지출 또는 무료라 정기결제와 맞지 않음), 주간·연간·종료 조건 주기 유형 추가. 재검토는 실사용 사례가 쌓인 뒤 사용자가 지목할 때만 함.
- **금지 사항**: 금액·잔액·포인트 변경은 `SECURITY DEFINER` 단일 RPC 경로만 사용함. 클라이언트는 확정 금액을 전달하지 않음.

## 1. 현행 구조 요약 (근거)

| 항목 | 현행 | 문제 |
| :--- | :--- | :--- |
| 회차 생성 | `src/lib/subscription-sync.ts` `ensureMonthlySubscriptionExpenses`가 `/dashboard`·`/dashboard/expenses`·구독 모달 진입 시 클라이언트 `insert`로 생성함 | 앱을 열지 않으면 회차가 없어 알림·예산 집계에서 누락됨 |
| `MONTHLY_DAY` 멱등성 | `idx_expenses_template_billing_cycle` 유니크 + `dedupe_monthly_planned_expenses` RPC | 해결됨 |
| `VERSION_PASS` 멱등성 | `idx_expenses_template_schedule_id` 유니크 | 해결됨 |
| `INTERVAL_30` 멱등성 | 유니크 제약 없음. PLANNED 존재 여부를 읽고 `insert`함(`ensureMonthly…` 와 `createNextIntervalSubscriptionExpense` 두 경로) | 동시 실행 시 PLANNED 중복 가능함 |
| `INTERVAL_30` 다음 회차 | 결제 후 클라이언트가 `createNextIntervalSubscriptionExpense`로 생성(조기 결제 시 기존 예정일 + 충전일수 누적). lazy 경로는 `최근 CONFIRMED.target_date + 충전일수` | 날짜 계산이 TS 두 곳(+ 동작 차이)에 있고 비원자적임 |
| `INTERVAL_30` 환불 롤백 | 클라이언트가 `refund_expense_payment` 뒤에 `rollbackIntervalSubscriptionExpense`를 별도 호출함 | 환불과 롤백이 비원자적이며 재호출 시 이중 차감 가능함 |
| 결제 | `process_expense_payment`가 `auth.uid()`로 사용자 판정 | cron(JWT 없음)에서 호출 불가 |
| 알림 | `enqueue_daily_notifications()`가 `pg_cron` `0 0 * * *`(UTC, KST 09:00)에 실행됨. `EXPENSE_D1`(내일 예정)만 있음. `uq_notifications_daily_source (user_id, kind, source_id, scheduled_for)`로 멱등함 | "오늘 결제 예정" 알림 없음 |
| 예산 귀속 | `PLANNED` = 종료일(없으면 `target_date`) 월, `CONFIRMED` = 결제월(`target_date`는 결제 시 결제일로 덮어씀) | 자동 확정 시 결제일 기준이 월 경계를 좌우함 |

## 2. 확정 결정 사항

> 사용자 승인 방향(① 서버 측 생성 ② 확정 알림 ③ 자동 확정 옵션)은 고정이며, 아래는 그 방향 안에서 Opus가 내린 설계 결정임. 사용자 확인이 필요한 항목은 §9에 따로 모음.

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| D1 | 생성 로직의 단일 구현은 **SQL**(`generate_subscription_expenses_core`)임. 클라이언트 lazy 경로는 얇은 RPC 호출로 바꿈 | TS 유지 + cron 별도 SQL 이식은 이중 구현이 되어 기각함. Edge Function으로 TS 재사용하는 안은 배포 계층·시크릿이 늘고 `process_expense_payment` 같은 DB 트랜잭션과 한 몸으로 묶기 어려워 기각함 |
| D2 | cron은 일 1회 `chronoledger-subscription-daily`, `50 23 * * *` UTC(= KST 08:50)에 `run_daily_subscription_automation()`을 실행함. 순서: ① 생성 ② 자동 확정(`R107-C`) | 기존 `chronoledger-daily-notifications`(KST 09:00)보다 10분 앞서 실행해 알림이 생성·확정 결과를 반영하게 함 |
| D3 | lazy 경로는 제거하지 않고 유지함(템플릿 신규 생성·재활성화 직후 즉시 반영 + cron 장애 보험). cron과 lazy는 같은 core를 호출하며 템플릿 행 `FOR UPDATE` 잠금으로 직렬화함 | lazy 제거 시 템플릿 생성 직후 화면에 회차가 없는 UX 회귀가 생겨 기각함 |
| D4 | `INTERVAL_30` 중복 방지는 **부분 유니크 인덱스** `idx_expenses_interval_single_planned ON expenses(template_id) WHERE status='PLANNED' AND template_id IS NOT NULL AND billing_cycle IS NULL AND schedule_id IS NULL`로 DB가 보장함 | `MONTHLY_DAY`는 `billing_cycle`, `VERSION_PASS`는 `schedule_id`가 항상 채워져 이 조건에서 제외되므로 타 주기와 충돌하지 않음. 트리거+잠금 방식, `expenses`에 템플릿 주기 컬럼 비정규화는 복잡해 기각함 |
| D5 | `INTERVAL_30` 다음 회차 생성·환불 롤백도 SQL로 이관함: `advance_interval_subscription(p_template_id, p_original_target_date, p_payment_date)`·`rollback_interval_subscription(p_expense_id)` RPC(금액 인자 없음, 템플릿 `default_price` 사용). TS의 날짜 계산 구현은 제거함 | 이관하지 않으면 자동 확정(SQL)과 수동 결제(TS)가 같은 규칙을 두 번 구현하게 됨 |
| D6 | 자동 확정이 `process_expense_payment`를 재사용하도록 **본문을 내부 함수 `_process_expense_payment_core(p_user_id, …)`로 추출**하고 기존 공개 함수는 `auth.uid()`를 넘기는 얇은 래퍼로 유지함(시그니처·`GRANT` 불변). core는 `PUBLIC`·`anon`·`authenticated` 권한 전량 회수, `service_role`만 허용함 | 결제 로직 복제는 원장 불일치 위험이 커 기각함. `request.jwt.claim.sub` 세션 변수 위장은 취약해 기각함 |
| D7 | 자동 확정 대상 결제수단은 `GOOGLE_PLAY`·`GALAXY_STORE`만임. `WALLET`은 v1에서 자동 확정 불가(알림만)이며 DB `CHECK`로 강제함 | 스토어 정기결제는 외부에서 실제로 자동 결제되어 앱 기록과 일치함. `WALLET`(내 지갑)은 외부 결제 증거가 없고 `total_asset`을 조용히 차감하게 됨. `total_asset`은 음수를 허용하므로 "잔액 부족 실패"는 존재하지 않으며, 이는 실제 부족을 가려 오히려 위험함 |
| D8 | 자동 확정 결제일은 **`target_date`(예정일)**임. 금액은 생성 시점 스냅샷(`original_price`·`final_amount`), 할인·포인트 사용 없음(0), 적립은 스토어 `earn_rate`로 RPC가 계산함 | 예정일 기준이어야 `PLANNED`(예정일 월) → `CONFIRMED`(결제월) 월 귀속이 달라지지 않음(예: 11-30 예정이 12-01 보정 실행으로 12월에 잡히는 것 방지). `INTERVAL_30`도 예정일 = 결제일이면 다음 회차가 `예정일 + 충전일수`로 정확함 |
| D9 | 자동 확정 대상 창은 `target_date BETWEEN 오늘-2일 AND 오늘`(KST)임. 그보다 오래된 `PLANNED`는 자동 확정하지 않고 기존 연체 모달 경로로 둠. 생성일(`created_at`)이 오늘 KST 0시 이후인 행은 제외함 | cron 1~2회 누락 보정은 허용하되, 오래된 행의 대량 소급 확정과 "방금 템플릿을 만들고 옵션을 켠 직후 즉시 확정" 사고를 막음 |
| D10 | 자동 확정 실패(예: 포인트 지갑 제약 위반)는 행 단위 `BEGIN … EXCEPTION` 블록으로 격리하고 `PLANNED`로 남김. 해당 행은 `R107-B`의 "오늘 결제 예정" 집계에 자연히 포함됨. 다음 날 창(D9) 안이면 재시도함 | 한 사용자·한 행의 실패가 전체 cron을 중단시키지 않음 |
| D11 | `expenses.auto_confirmed_at TIMESTAMPTZ`(감사·배지·알림 집계용)와 `expenses.auto_confirm_blocked BOOLEAN NOT NULL DEFAULT false`를 추가함. `blocked`는 `rollback_interval_subscription`이 롤백한 `PLANNED`와 `restore_cancelled_expense`로 복구된 행에 `true`를 설정함 | `INTERVAL_30` 환불 시 예정일이 과거(창 안)로 롤백되면 다음 cron이 즉시 재결제하는 사고를 막음. `MONTHLY_DAY`·`VERSION_PASS`는 환불된 회차 행이 `CANCELLED`로 남아 유니크 인덱스를 점유하므로 재생성되지 않음 |
| D12 | `INTERVAL_30` 환불 롤백은 `R107-C`에서 `refund_expense_payment` 내부로 이관해 원자화함(클라이언트의 별도 롤백 호출 제거). 롤백은 환불 대상이 해당 템플릿의 최신 `CONFIRMED`이고 `PLANNED`가 있을 때만 수행함 | 자동 확정으로 환불 빈도가 늘어 이중 차감 위험이 커짐. 환불 RPC 수정은 금전 경로라 `Opus (High)` 대상임 |
| D13 | 알림은 사용자별 일 1건 요약 행으로 만듦: `kind='EXPENSE_DUE_TODAY'`(`R107-B`), `'EXPENSE_AUTO_CONFIRMED'`(`R107-C`). `source_id = user_id`, `scheduled_for = 오늘`로 기존 유니크 인덱스에 걸어 멱등함. 본문에 금액·항목명을 넣지 않음(잠금 화면 보호, `EXPENSE_D1` 선례) | `source_id`가 `NULL`이면 유니크가 동작하지 않아 `user_id`를 대신 사용함. 항목별 행은 알림함 소음이 커 기각함 |
| D14 | 두 신규 알림은 새 설정 컬럼 `notification_settings.expense_due_today BOOLEAN NOT NULL DEFAULT true` 하나로 제어함. `EXPENSE_D1`(내일 예정)은 유지하며 기존 `planned_expense_d1` 설정을 그대로 씀 | 토글 증가를 피함. 푸시 워커의 kind별 필터는 `REQUEST_*`·`FEEDBACK_ANSWERED`만 있어 신규 kind는 `push_enabled`·구독 유무 규칙만 따름 |
| D15 | 미적용 마이그레이션 폴백: 신규 RPC 부재(`PGRST202`·`42883`)는 기존 TS 생성 로직(`…Legacy`)으로 폴백하고, 신규 컬럼 조회(`auto_confirm`·`auto_confirmed_at`·`expense_due_today`)는 별도 쿼리·`isMissingColumn` 폴백으로 분리해 공용 `select` 문자열(`EXPENSE_COLUMNS` 등)에 넣지 않음. 폴백 TS는 `R107-A` 운영 적용 확인 후 별도 정리 Step에서 제거함 | 기존 `interval_days`·`cycle_type`·`user_games.memo` 패턴과 동일함. 폴백을 영구 유지하면 이중 구현이 되므로 제거 시점을 명시함 |

## 3. R107-A 서버 측 정기 지출 생성 통일

### 3.1 DB 변경 (`sql/migrations/MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`, 재실행 안전)

1. **중복 정리**: 인덱스 생성 전 `INTERVAL_30` 템플릿의 중복 `PLANNED`를 `ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY target_date ASC, id ASC)`로 1건만 남기고 삭제함(`dedupe_monthly_planned_expenses`와 같은 기준). 삭제 건수를 `RAISE NOTICE`로 출력함.
2. **인덱스**: D4의 `idx_expenses_interval_single_planned`를 `CREATE UNIQUE INDEX IF NOT EXISTS`로 생성함.
3. **내부 함수**: `generate_subscription_expenses_core(p_user_id UUID, p_today DATE) RETURNS INTEGER` — 3개 주기를 모두 처리함. 템플릿별로 `SELECT … FROM subscription_templates … FOR UPDATE` 후 처리하고 모든 `INSERT`는 `ON CONFLICT DO NOTHING`으로 씀. `p_user_id`의 `account_deletion_is_pending`이면 0 반환함. `PUBLIC`·`anon`·`authenticated` 권한 회수, `service_role` 허용함.
   - `MONTHLY_DAY`: `getAdjustedBillingDate`(결제일을 해당 월 말일로 클램프) 규칙, 오늘 월 우선·과거면 다음 월, 이미 존재하는 `billing_cycle`은 다음 월로 건너뛰는 규칙, `PLANNED`가 이미 있으면 생성하지 않는 규칙을 TS와 동일하게 이식함.
   - `INTERVAL_30`: `PLANNED` 없음 + `CONFIRMED` 있으면 `최근 CONFIRMED.target_date + COALESCE(interval_days, 30)`, 둘 다 없으면 오늘. (조기 결제 누적은 §3.1-5의 `advance_…` 경로가 담당하고, lazy 경로는 기존 동작을 유지함. 한계는 §9에 기록함.)
   - `VERSION_PASS`: `game_id`가 있는 템플릿, `game_schedules`의 `schedule_type='VERSION' AND is_official AND end_date >= p_today`인 일정 중 회차가 없는 것만 생성함. 제목 `템플릿 제목 (일정 제목)`, `start_date`·`end_date`·`target_date=start_date`를 TS와 동일하게 채움.
4. **공개 RPC**: `ensure_subscription_expenses() RETURNS INTEGER` — `auth.uid()` 필수, 오늘 KST를 서버에서 계산해 core를 호출함. `authenticated`만 `EXECUTE`, `anon` 차단함. 클라이언트는 날짜를 전달하지 않음.
5. **INTERVAL_30 이관 RPC**: `advance_interval_subscription(p_template_id, p_original_target_date DATE, p_payment_date DATE)`(결제 후 다음 회차 생성, 조기 결제 시 기존 예정일 + 충전일수 누적 규칙 `calculateNextIntervalTargetDate`와 동일), `rollback_interval_subscription(p_expense_id)`(`PLANNED` 예정일을 충전일수만큼 차감, `calculateRollbackIntervalTargetDate`와 동일). 둘 다 본인 소유·활성 템플릿만, 금액 인자 없음, `INTERVAL_30` 아니면 `false`/0 반환함.
6. **일 배치**: `run_daily_subscription_automation() RETURNS INTEGER` — 활성 템플릿 보유 사용자(탈퇴 대기 제외)를 순회하며 사용자별 `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING … END`으로 격리해 core를 호출함. `service_role`만 `EXECUTE`. `cron.schedule('chronoledger-subscription-daily', '50 23 * * *', …)`를 SCHEMA.sql의 기존 `DO $$` 블록 패턴(`unschedule` 후 `schedule`)으로 등록함.
7. 현재 사용자 규모(개인 앱)를 가정해 배치 분할은 하지 않음. 활성 사용자가 1,000명을 넘으면 `LIMIT`·청크 실행으로 재검토함.

### 3.2 클라이언트 변경 (`src/lib/subscription-sync.ts` 등)

- `ensureMonthlySubscriptionExpenses(userId, year, month, todayStr?)` 시그니처는 호출처 4곳(대시보드·지출 페이지·구독 모달)이 있어 유지함. 본문은 `supabase.rpc("ensure_subscription_expenses")` 호출 + 폴백(D15)으로 교체함.
- `createNextIntervalSubscriptionExpense`·`rollbackIntervalSubscriptionExpense`는 각각 `advance_interval_subscription`·`rollback_interval_subscription` RPC 호출로 교체함. 화면에서 직접 쓰는 `addDays` 등 순수 날짜 헬퍼만 남기고, 생성·롤백 판정 로직은 TS에 남기지 않음.
- RPC 부재 시 폴백: 기존 TS 구현을 `…Legacy` 이름으로 보존하고 `PGRST202`·`42883`일 때만 호출함. 정리 Step(`R107-A-CLEANUP`)에서 제거함.
- `database.types.ts`를 로컬 DB 기준으로 재생성함.

### 3.3 적용 순서 (사용자 수동, SQL Editor)

1. `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql` 실행 → README B표 확인 쿼리 확인.
2. 앱 배포(`main` push).
3. 역순(앱 먼저)이어도 안전해야 함: 구버전 앱이 SQL 적용 후에도 동작함(구 클라이언트 `INTERVAL_30` `insert`가 `23505`를 받아도 기존 코드가 오류를 무시·로그만 남김). 반대로 신버전 앱 + 미적용 SQL은 폴백으로 동작함.
4. 운영에서 1주 관찰 후 `R107-A-CLEANUP`(폴백 TS 제거)을 진행함.

### 3.4 인수 기준과 검증 (`R107-A`)

| # | 인수 기준 | 검증 방법 |
| :-: | :--- | :--- |
| A-1 | 같은 템플릿에 대해 core를 연속·동시 2회 실행해도 `PLANNED`가 1건만 존재함(`MONTHLY_DAY`·`INTERVAL_30`), `VERSION_PASS`는 일정당 1건임 | `TESTS.sql` 시나리오 + 로컬 Supabase 🐳에서 2세션 병렬 실행(`pg_advisory`/`FOR UPDATE` 대기 확인) |
| A-2 | `INTERVAL_30` `PLANNED` 2건 직접 `INSERT` 시 `23505`로 거부됨. 마이그레이션이 기존 중복을 정리한 뒤에도 재실행 안전함 | `TESTS.sql`, 마이그레이션 2회 실행 |
| A-3 | SQL core 결과가 기존 TS 결과와 일치함. `subscription-sync.test.ts`의 기존 날짜 시나리오(말일 클램프·월 경계·기존 `billing_cycle` 건너뛰기·`INTERVAL_30` 조기 결제 누적·환불 롤백)를 SQL 시나리오로 이식해 같은 기댓값을 확인함 | `TESTS.sql` PASS 수, 이식 표(TS 케이스 ↔ SQL 케이스) 리뷰 |
| A-4 | `anon`은 모든 신규 함수 실행 불가, `authenticated`는 `ensure_subscription_expenses`·`advance_…`·`rollback_…`만 가능하고 core·`run_daily_…`는 불가임. 다른 사용자 템플릿에는 효과 없음 | README 확인 쿼리(`has_function_privilege`), `TESTS.sql` 권한·IDOR 케이스 |
| A-5 | `run_daily_subscription_automation()`이 한 사용자 오류(예: 강제 제약 위반)에도 나머지 사용자를 처리하고, 탈퇴 대기 사용자는 건너뜀 | `TESTS.sql` |
| A-6 | cron 잡이 1개만 등록되고 `schedule='50 23 * * *'`임. 재실행해도 중복 등록되지 않음 | `SELECT jobname, schedule FROM cron.job WHERE jobname='chronoledger-subscription-daily';` → 1행 |
| A-7 | 앱을 열지 않은 사용자(세션 없음)의 활성 템플릿에도 다음 날 08:50 KST 이후 회차가 존재함 | 로컬 DB에서 `run_daily_subscription_automation()` 직접 호출 후 `expenses` 조회 |
| A-8 | 클라이언트: RPC 정상 시 RPC만 호출, RPC 부재 오류 시 폴백 호출, 그 외 오류는 기존처럼 비차단 처리함. 미적용 환경에서도 대시보드·지출 페이지가 로드됨 | Vitest(`subscription-sync.test.ts` 개편, 페이지 테스트 모의 갱신), `tsc`, `lint` |
| A-9 | `process_expense_payment`·`refund_expense_payment`·예산 계산 동작 불변 | 기존 `TESTS.sql` 전 케이스 PASS, Vitest 전체 통과 |

## 4. R107-B 결제 예정 알림

### 4.1 변경 (`sql/migrations/MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql`, 재실행 안전)

1. `notifications.kind` `CHECK`에 `'EXPENSE_DUE_TODAY'` 추가(제약 `DROP … ADD`, 기존 6종 유지). `database.types.ts`·`notification-settings-card`의 kind 목록도 갱신함.
2. `notification_settings.expense_due_today BOOLEAN NOT NULL DEFAULT true` 추가(`ADD COLUMN IF NOT EXISTS`).
3. `enqueue_daily_notifications()`에 4번 절 추가:
   - 대상: `status='PLANNED' AND target_date = 오늘(KST)`인 지출을 사용자별로 집계(템플릿 유무 무관), 탈퇴 대기 사용자·`expense_due_today=false` 사용자 제외, 건수 N ≥ 1.
   - 행: `kind='EXPENSE_DUE_TODAY'`, `title='오늘 결제 예정 N건'`, `body='오늘 결제 예정인 지출을 지출 관리에서 확인하세요.'`(금액·항목명 미포함), `link_path='/dashboard/expenses'`, `source_id=user_id`, `scheduled_for=오늘`, `ON CONFLICT … DO NOTHING`.
   - `auto_confirm_blocked`·연체(과거 `target_date`) 행은 집계하지 않음(연체는 기존 연체 모달 경로).
4. 알림 설정 UI(`notification-settings-card.tsx`)에 "오늘 결제 예정" 토글 추가. 컬럼 미적용 환경에서는 토글을 숨기고 오류 없이 동작하는 폴백을 둠.
5. 푸시 전송 경로는 변경하지 않음(`trg_notifications_send_webhook`·`claim_pending_push_notifications` 재사용). 신규 kind가 워커·Edge Function·`sw.js`·Tauri 토스트에서 막히지 않는지 확인만 함.

### 4.2 시점·대상·중복 방지 규칙

- **시점**: 매일 09:00 KST(`enqueue_daily_notifications`의 기존 cron)임. 사용자별 시각 설정은 만들지 않음.
- **대상**: 오늘이 예정일인 `PLANNED` 전부. `R107-A`의 서버 생성 덕분에 앱 미접속 사용자도 포함됨.
- **중복 방지**: 사용자·kind·날짜당 1건(`uq_notifications_daily_source`). cron 재실행 시 N이 늘어도 갱신하지 않음.
- **`EXPENSE_D1` 병행**: 전날 예고(`EXPENSE_D1`)와 당일 요약(`EXPENSE_DUE_TODAY`)은 목적이 달라 함께 유지함.
  - *(2026-11-27 개정, `R118-A`)*: 전날 예고도 건별 → 사용자·결제일당 `내일 결제 예정 N건` 1건으로 바꿈. 당일 요약은 유지함. [`docs/r118-payment-notification-report-popup-spec.md`](r118-payment-notification-report-popup-spec.md) §3

### 4.3 인수 기준과 검증 (`R107-B`)

| # | 인수 기준 | 검증 방법 |
| :-: | :--- | :--- |
| B-1 | 오늘 예정 `PLANNED` N건(N≥1) 보유 사용자에게 `EXPENSE_DUE_TODAY` 1행이 생김. N=0이면 생기지 않음 | `TESTS.sql` |
| B-2 | `enqueue_daily_notifications()`를 같은 날 2회 실행해도 1행임. 다음 날에는 새 행이 생김 | `TESTS.sql` |
| B-3 | `expense_due_today=false`·탈퇴 대기 사용자는 제외됨. 설정 행이 없는 사용자는 기본 true로 처리됨 | `TESTS.sql` |
| B-4 | 본문에 금액·항목명·메모가 없음. `link_path`가 `^/` 제약을 만족함 | `TESTS.sql`, 행 조회 |
| B-5 | 푸시: `push_enabled` + 구독 사용자에게 `SENT`, 미구독은 `SKIPPED`. 기존 `FAVORITE_*`·`EXPENSE_D1`·`REQUEST_*` 동작 불변 | 로컬 DB 시나리오 + 기존 `TESTS.sql` 회귀, 필요 시 실기기 1회 확인 |
| B-6 | 알림 설정 UI 토글 저장·복원이 동작하고 컬럼 미적용 환경에서 페이지가 깨지지 않음 | Vitest(`notification-settings-card`, 설정 페이지 테스트), `tsc`, `lint` |

## 5. R107-C 자동 확정

### 5.1 DB 변경 (`sql/migrations/MIGRATION_R107C_AUTO_CONFIRM.sql`, 재실행 안전)

1. `subscription_templates.auto_confirm BOOLEAN NOT NULL DEFAULT false` + `CHECK (NOT auto_confirm OR payment_method IN ('GOOGLE_PLAY','GALAXY_STORE'))`(D7).
2. `expenses.auto_confirmed_at TIMESTAMPTZ`, `expenses.auto_confirm_blocked BOOLEAN NOT NULL DEFAULT false`(D11).
3. `process_expense_payment` 본문을 `_process_expense_payment_core(p_user_id UUID, …기존 11개 인자)`로 추출하고 공개 함수는 `auth.uid()` 확인 후 core 호출 래퍼로 교체함(D6). 시그니처·`GRANT`·`REVOKE`는 기존과 동일함.
4. `auto_confirm_due_expenses(p_user_id UUID, p_today DATE) RETURNS INTEGER`(내부, `service_role`만):
   - 후보: `e.status='PLANNED' AND NOT e.auto_confirm_blocked AND t.auto_confirm AND t.is_active AND t.payment_method IN (스토어 2종) AND e.target_date BETWEEN p_today-2 AND p_today AND e.created_at < (p_today::timestamp AT TIME ZONE 'Asia/Seoul')`(D8·D9), 탈퇴 대기 제외.
   - 각 행: `FOR UPDATE SKIP LOCKED` 후 상태 재확인 → core 호출(`p_original_price=e.original_price`, 할인·포인트 사용 0, `p_point_platform`·`p_payment_method`=템플릿 스토어, `p_deduct_asset=e.deduct_from_asset`, `p_payment_date=e.target_date`, `p_custom_earned_points=NULL`) → `auto_confirmed_at=NOW()` 설정 → `INTERVAL_30`이면 `advance_interval_subscription(…, 원예정일=target_date, 결제일=target_date)`, 그 외 주기는 같은 트랜잭션에서 core 생성 함수로 다음 회차를 즉시 생성함. 행 단위 예외 격리(D10).
5. `run_daily_subscription_automation()`에 2단계로 자동 확정 호출 추가함(생성 → 확정 순서).
6. `refund_expense_payment`에 `INTERVAL_30` 롤백 원자화(D12) 추가. 클라이언트의 `rollbackIntervalSubscriptionExpense` 호출을 제거함(RPC 내부 처리). 환불 대상이 최신 `CONFIRMED`가 아니면 롤백하지 않음. `rollback_interval_subscription`이 롤백한 `PLANNED`에 `auto_confirm_blocked=true`를 설정하고, `restore_cancelled_expense`도 복구 행에 `true`를 설정함(D11). 복구 시 `INTERVAL_30` 단일 `PLANNED` 유니크 충돌(`23505`)은 사용자 안내 문구로 매핑함.
7. `kind` `CHECK`에 `'EXPENSE_AUTO_CONFIRMED'` 추가(누적 목록 8종). `enqueue_daily_notifications()` 5번 절: 오늘 KST에 `auto_confirmed_at`이 찍힌 지출을 사용자별로 집계해 `title='오늘 자동 확정된 결제 N건'`, `body='자동 확정된 결제를 지출 관리에서 확인하세요. 잘못된 항목은 환불할 수 있습니다.'`, `source_id=user_id`, `scheduled_for=오늘`(D13·D14). 금액·항목명 미포함.

### 5.2 클라이언트 변경

- 구독 모달: 결제수단이 `GOOGLE_PLAY`·`GALAXY_STORE`일 때만 "자동 확정" 토글 활성(기본 꺼짐), `WALLET` 선택 시 강제 해제·비활성. 안내 문구에 ① 예정일에 앱 기록이 자동 결제로 확정됨 ② 실제 스토어 결제와 다르면 환불 가능 ③ 켠 당일 생성분은 다음 날부터 적용됨을 표기함.
- 지출 목록·상세: `auto_confirmed_at`이 있는 항목에 "자동 확정" 배지 표시. 신규 컬럼은 공용 `select`에 넣지 않고 별도 조회·폴백으로 읽음(D15).
- 환불 흐름: `INTERVAL_30` 롤백 클라이언트 호출 제거(RPC가 처리). 기존 환불 UX·오류 문구는 유지함.
- 템플릿 `update`는 직접 쓰기(금액 아님, 기존 RLS 정책 유지). `auto_confirm` 컬럼 미적용 환경에서는 저장 시 해당 필드를 보내지 않는 폴백을 둠.

### 5.3 월 경계·환불·롤백 정합 규칙

- **월 귀속**: 자동 확정 결제일 = 예정일(D8)이므로 `PLANNED` 때와 `CONFIRMED` 때의 귀속 월이 같음. 예: 11-30 예정이 12-01 08:50 KST에 보정 확정돼도 `target_date=11-30` → 11월 `CONFIRMED`.
- **이중 결제 방지**: 사용자가 같은 시각에 수동 결제하면 `process_expense_payment`의 `FOR UPDATE`·`status='PLANNED'` 검사 + 자동 확정의 `SKIP LOCKED`·재확인으로 한 쪽만 성공함.
- **환불**: 자동 확정 지출도 일반 `CONFIRMED`이므로 기존 `refund_expense_payment` 경로를 그대로 사용함(포인트 회수·자산 복원 불변). 적립 포인트를 이미 사용한 경우 기존처럼 환불이 거부됨.
- **`INTERVAL_30` 환불**: 롤백된 `PLANNED`는 `auto_confirm_blocked=true`라 자동 재결제되지 않음. 사용자가 수동 결제하면 `blocked`는 의미가 없어짐(상태가 `CONFIRMED`로 바뀜). `blocked` 행을 다시 자동 확정 대상으로 풀려면 사용자가 예정 지출을 수정·재생성해야 하며, 본 Run에서는 해제 UI를 만들지 않음.
- **템플릿 변경**: 결제수단 변경·중지·삭제 시 기존 트리거·RPC가 `PLANNED`를 정리하므로 자동 확정 대상에서 자연 제외됨. 옵션을 끄면 이후 cron부터 제외됨.

### 5.4 인수 기준과 검증 (`R107-C`)

| # | 인수 기준 | 검증 방법 |
| :-: | :--- | :--- |
| C-1 | `process_expense_payment` 래퍼가 리팩터 전과 동일하게 동작함(시그니처, 권한, 오류 문구, 지갑·원장·자산·적립 결과) | 기존 `TESTS.sql` 결제 케이스 전부 PASS + 리팩터 전후 결과 비교 케이스 추가, `has_function_privilege` 확인 |
| C-2 | `auto_confirm=true`·스토어 결제·창 안·생성일 이전 `PLANNED`만 확정됨. `WALLET`·옵션 꺼짐·`blocked`·창 밖·당일 생성 행은 확정되지 않음 | `TESTS.sql` 매트릭스(조건별 1행씩) |
| C-3 | 확정 결과: `status='CONFIRMED'`, `target_date`=예정일, 금액=스냅샷, 적립 포인트=스토어 `earn_rate` 기준(`store_point_transactions` `EARN` 행 포함), `auto_confirmed_at` 설정, `deduct_from_asset` 반영(`total_asset` 차감) | `TESTS.sql` 값 검증(수동 결제 동일 입력과 결과 비교) |
| C-4 | 월 경계: 11-30 예정을 12-01 실행으로 확정해도 `target_date`가 11-30이고, 12월 예산 집계(`calculateMonthBudgetBreakdown` 입력)에 포함되지 않음 | `TESTS.sql` + `budget-calculations.test.ts` 경계 케이스 |
| C-5 | 같은 행을 cron 2회·수동 결제와 동시에 처리해도 결제가 1회만 일어나고 원장 `USE`·`EARN` 행이 중복되지 않음 | 로컬 DB 2세션 병렬 시나리오 |
| C-6 | 자동 확정 직후 다음 회차 `PLANNED`가 생성됨(`MONTHLY_DAY` 다음 달, `INTERVAL_30` 예정일 + 충전일수, `VERSION_PASS`는 해당 일정만 확정하고 추가 생성 없음) | `TESTS.sql` |
| C-7 | 환불: 자동 확정 지출 환불 시 자산·포인트가 원복되고, `INTERVAL_30`은 같은 트랜잭션에서 `PLANNED` 예정일이 충전일수만큼 롤백되며 `auto_confirm_blocked=true`임. 다음 cron이 해당 행을 재확정하지 않음. 클라이언트 추가 호출 없이도 이중 차감이 없음 | `TESTS.sql` 환불→cron 재실행 시나리오 |
| C-8 | 한 행의 실패(예: 포인트 지갑 제약 위반 강제)가 다른 행·사용자 처리를 막지 않고, 실패 행은 `PLANNED`로 남아 `EXPENSE_DUE_TODAY` 집계에 포함됨 | `TESTS.sql` |
| C-9 | `EXPENSE_AUTO_CONFIRMED` 요약 알림이 사용자·일자당 1건이며 금액·항목명을 포함하지 않음. `expense_due_today=false`면 생성되지 않음 | `TESTS.sql` |
| C-10 | 권한: core·`auto_confirm_due_expenses`·`run_daily_…`는 `authenticated`·`anon` 실행 불가. 다른 사용자 지출에는 영향 없음. 탈퇴 대기 사용자 제외 | README 확인 쿼리, `TESTS.sql` IDOR 케이스 |
| C-11 | UI: `WALLET`이면 토글 비활성, 스토어면 활성·기본 꺼짐. 배지 표시. 신규 컬럼 미적용 환경에서 지출·구독 화면이 깨지지 않음. 환불 후 클라이언트가 롤백 RPC를 호출하지 않음 | Vitest(구독 모달·지출 상세·환불 흐름 테스트), `tsc`, `lint`, 브라우저 수동 확인 1회 |
| C-12 | 회귀: 기존 `TESTS.sql` 전체, Vitest 전체, `tsc`, `lint`, `next build` 통과 | 전체 실행 로그 |

## 6. 통합 마이그레이션 적용 순서 (사용자 수동, SQL Editor)

> 선행 전제: `R84`·`R39`·`R96`·`R102`·`R106` 적용 완료(현재 운영 상태).

| 순서 | 파일 | 앱 배포 | 비고 |
| :-: | :--- | :--- | :--- |
| 1 | `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql` | 이후 배포 | `INTERVAL_30` 중복 `PLANNED` 정리 후 유니크 인덱스, cron `chronoledger-subscription-daily` 등록 |
| 2 | `MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql` | 이후 배포 | `kind` `CHECK` 갱신, `enqueue_daily_notifications` 교체 |
| 3 | `MIGRATION_R107C_AUTO_CONFIRM.sql` | 이후 배포 | `process_expense_payment`·`refund_expense_payment`·`enqueue_daily_notifications` 재정의 |

- 각 파일은 `SCHEMA.sql`에 최신판으로 반영하고 `sql/README.md` B표에 확인 쿼리를 추가함. `kind` `CHECK`·`enqueue_daily_notifications`는 후속 파일이 이전 내용을 포함한 누적판으로 재정의함(2번 파일을 3번 뒤에 다시 실행하면 5번 절이 사라지므로 README에 "재실행 시 3번 파일도 재실행" 경고를 명시함. `R96`·`R102` 재실행 경고와 같은 방식).
- 위 파일은 한 Run에 한꺼번에 적용하지 않고 단계별 Run 종료 시점마다 적용·관찰함. `R107-C`는 `R107-B` 운영 적용 후 착수함.

## 7. 모델 배정·Run 분할 제안

> 최종 Run 등록·모델 확정은 Hydrogen이 `.agents/rules/collaboration.md` §1 기준으로 수행함. 아래는 Opus 권고안임. 금전·원장·SQL/RPC 변경은 승격 조건 ①에 해당해 SQL Step은 `Claude Opus (High)`이며, 수정 안 한 모델이 리뷰하도록 Maker와 Reviewer를 분리함. 도구 UI에서 `High` 선택 안내를 큐 행에 병기함.

### Run 1 `r107a-server-subscription-generation` (모두 `main` 병합 전 격리 워크트리 권장, 🐳 로컬 Supabase 필요)

| Step | 담당 (Fallback) | 역할 | 범위 |
| :-: | :--- | :--- | :--- |
| 1 | `Claude Opus (High — 도구에서 High 선택)` *(Gemini 4 Neon (High) / GPT Codex)* | Maker | §3.1 마이그레이션, `SCHEMA.sql`·`sql/README.md`·`sql/tests/TESTS.sql` 동기화, 이식 시나리오(A-3) |
| 2 | `Gemini 4 Neon (High — 도구에서 High 선택)` *(Claude Sonnet (Medium))* | Maker | §3.2 `subscription-sync.ts` RPC 전환·폴백, 테스트 개편, `database.types.ts` 재생성. Step 1 완료 후 착수 |
| 3 | `Gemini 4 Carbon (High — 도구에서 High 선택)` *(Claude Opus (High))* | Reviewer | Base↔Target 정적 리뷰(`review.json`), 동시성·권한·TS/SQL 동등성 점검 |
| 4 | `Gemini 4 Hydrogen (Medium)` | Orchestrator | 문서 마감, 운영 적용 절차 안내(`§3.3`) |
| 후속 | `Gemini 4 Hydrogen (Medium)` *(Claude Sonnet (Medium))* | Maker | `R107-A-CLEANUP`: 운영 적용·1주 관찰 확인 후 폴백 TS 제거 (사용자 지목 시) |

### Run 2 `r107b-due-today-notification` (`R107-A` 운영 적용 후)

| Step | 담당 (Fallback) | 역할 | 범위 |
| :-: | :--- | :--- | :--- |
| 1 | `Gemini 4 Neon (High)` *(Claude Opus (High))* | Maker | §4.1-1~3 마이그레이션·`SCHEMA.sql`·README·`TESTS.sql` (금전 무관 알림 SQL이라 `Neon` 배정, 금전 접점이 생기면 `Opus`로 승격) |
| 2 | `Gemini 4 Hydrogen (Medium)` *(Claude Sonnet (Medium))* | Maker | §4.1-4~5 설정 UI·kind 목록·`database.types.ts`·테스트 |
| 3 | `Claude Sonnet (Medium)` *(Gemini 4 Hydrogen (Medium))* | Reviewer | 표준 정적 리뷰 |

### Run 3 `r107c-auto-confirm` (`R107-B` 운영 적용 후, 사용자 재확인 후 착수 권장)

| Step | 담당 (Fallback) | 역할 | 범위 |
| :-: | :--- | :--- | :--- |
| 1 | `Claude Opus (High — 도구에서 High 선택, 금전·원장·환불 변경)` *(Gemini 4 Neon (High) / GPT Codex)* | Maker | §5.1 마이그레이션·`SCHEMA.sql`·README·`TESTS.sql`(C-1~C-10) |
| 2 | `Gemini 4 Hydrogen (Medium)` *(Claude Sonnet (Medium))* | Maker | §5.2 구독 모달 토글·배지·환불 흐름 정리·테스트 |
| 3 | `Gemini 4 Carbon (High)` + `Claude Opus (High)` 중 Maker가 아닌 쪽 *(상호 대체)* | Reviewer | 금전·원장 통합 정적 리뷰, 필요 시 2차 리뷰 |
| 4 | `Gemini 4 Hydrogen (Medium)` | Orchestrator | 문서 마감, 운영 적용 절차 |

- Run 간 의존성이 순차이고 같은 SQL 함수(`enqueue_daily_notifications`·`kind` `CHECK`)를 공유하므로 병렬 실행하지 않음(`/swarm` 불필요).
- 각 Run의 큐 행에는 §3.4·§4.3·§5.4 인수 기준 번호(`A-1`…)와 이 문서 절 번호만 포인터로 적고 상세는 이 문서에 둠(Orchestrator Skill의 짧은 수용 기준 원칙).

## 8. 위험과 완화

| 위험 | 완화 |
| :--- | :--- |
| 자동 확정으로 실제 결제되지 않은 항목이 확정됨(구독 해지 후 템플릿 정리 누락) | 기본값 꺼짐, 스토어 결제수단 한정, 당일 요약 알림 + 환불 경로, UI 안내 문구 |
| 결제 리팩터(D6)로 기존 결제 회귀 | 래퍼 시그니처 불변, 기존 `TESTS.sql` 전수 + 전후 비교 케이스, 별도 리뷰어 |
| cron 장애 | lazy 경로 유지(D3), 보정 창 2일(D9), 다음날 재시도 |
| 신규 마이그레이션 미적용 상태의 신버전 앱 | D15 폴백, 적용 순서 §6 |
| 인덱스 생성 실패(운영에 `INTERVAL_30` 중복 `PLANNED` 잔존) | 마이그레이션 1단계 정리 후 생성, 삭제 건수 출력 |

## 9. 미결 질문 (사용자 확인 권장, 기본값으로 진행 가능)

1. `WALLET` 자동 확정을 v1에서 제외하는 결정(D7) 확인 필요. 허용하려면 "총 자산을 조용히 차감해도 되는가"를 별도 결정해야 함.
2. 자동 확정 보정 창 2일·"생성 당일 행 제외" 규칙(D9)이 적절한지 확인 필요.
3. 알림 시각을 09:00 KST 고정으로 두고 사용자별 시각 설정은 만들지 않는 결정 확인 필요.
4. `EXPENSE_D1`(내일 예정)과 `EXPENSE_DUE_TODAY`(오늘 요약) 병행 유지(D14) 확인 필요. 자동 확정 대상 행에 한해 `EXPENSE_D1` 문구를 "내일 자동 확정 예정"으로 바꿀지는 보류함.
5. 알려진 한계: `INTERVAL_30`에서 `advance_interval_subscription` 호출이 실패해 lazy 경로가 대신 회차를 만들면 조기 결제 누적(남은 일수 보존)이 반영되지 않음(현행 동작과 동일). 원예정일 보존용 컬럼 추가는 이번 범위에서 제외함.
6. Run 1 Step 1·Run 3 Step 1을 `Claude Opus`가 Maker로 맡는 배정(리뷰는 `Carbon`)이 쿼터 운용상 적절한지 Hydrogen·사용자 확인 필요.
