# R118 결제 예정 알림 요약·월간 리포트 차트·알림 팝업 명세

> 작성: Claude Opus (High), Chief Architect Fallback 1, 2026-11-27. `📐 SPEC_NEEDED`(결제 예정 알림·월간 리포트 그래프·알림 팝업) 산출물임. 명세·결정·인수 기준만 담으며 `src/**`·`sql/**`는 수정하지 않음. Run 등록·워크트리 생성·모델 최종 배정은 Orchestrator가 이 문서를 근거로 수행함.
> 요구사항 접수 기록은 [`docs/handoff.md`](handoff.md) 「요구사항 접수 기록 (2026-11-27)」, 관련 명세는 [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §4, [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §4(B7·B9·B11)임.

## 0. 범위와 ID

| ID | 내용 | DB 변경 |
| :--- | :--- | :--- |
| `R118-A` | 전날 결제 예정 알림(`EXPENSE_D1`)을 지출 1건마다 1개 → 사용자·결제일당 요약 1개(`내일 결제 예정 N건`)로 바꿈 | 있음 (`enqueue_daily_notifications()` 3번 절만) 🐳 |
| `R118-B` | 알림함에서 결제 예정 알림·월간 리포트 알림을 누르면 그 자리에서 팝업 카드를 띄움 | 없음 |
| `R118-C` | 월간 리포트 팝업 차트(카테고리별 확정 지출, 대상 달 vs 전달) + 지출 페이지 일별 누적 확정 지출 꺾은선 | 없음 |

## 1. 사용자 확정 결정 (2026-11-27 질문 카드)

| # | 질문 | 결정 |
| :-: | :--- | :--- |
| U1 | 결제 예정 알림 빈도 | **전날 요약 + 당일 요약**: 건별 `EXPENSE_D1`을 `내일 결제 예정 N건` 1건으로 묶고, 당일 `오늘 결제 예정 N건`(`EXPENSE_DUE_TODAY`)은 유지함. 결제일 하나당 알림 2회 |
| U2 | 월간 리포트 그래프 | **리포트 팝업 차트 + 지출 페이지 누적 추이 둘 다** |
| U3 | 팝업 대상 알림 | **결제 예정 알림**(`EXPENSE_D1`·`EXPENSE_DUE_TODAY`). U2에 따라 `MONTHLY_REPORT`도 팝업 대상. 자동 확정·게임 예산·일정·요청 알림은 기존처럼 페이지 이동 |
| U4 | 팝업 위치 | **어느 화면이든 그 자리**: 상단 알림함(대시보드·관리자 공통 `Topbar`)에서 누른 화면 위에 띄우고 `지출 관리로 이동` 버튼을 둠. 기기 푸시 알림 클릭은 기존처럼 `link_path`로 이동 |

## 2. 현행 구조 요약 (2026-11-27 `main` `7bfa48a` 확인)

- `enqueue_daily_notifications()`(`sql/SCHEMA.sql`, 매일 09:00 KST cron) 3번 절이 `PLANNED`·`target_date = 내일` 지출마다 `EXPENSE_D1` 1행(`source_id = expense.id`, `scheduled_for = 내일`)을 만듦. 4번 절은 사용자별 `EXPENSE_DUE_TODAY` 1행(`source_id = user_id`, `scheduled_for = 오늘`, 제목 `오늘 결제 예정 N건`).
- 중복 방지는 부분 고유 인덱스 `(user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL`임.
- `MONTHLY_REPORT`는 `enqueue_monthly_report_notifications(p_today)`가 매월 1일에 만듦(`scheduled_for = 전월 1일`, 본문에 확정 합계·전월 대비 %·예산 초과 게임 수).
- `src/components/layout/notification-bell.tsx`는 `id, title, body, link_path, read_at, created_at`만 조회하고, 항목을 누르면 읽음 처리 후 `router.push(link_path)`함. `kind`·`scheduled_for`는 조회하지 않음.
- 지출 페이지(`src/app/dashboard/expenses/page.tsx`)는 `recharts`로 카테고리 원그래프·월별 추이 막대·게임별 막대를 그림. 카테고리 색은 같은 파일의 `CATEGORY_COLORS`임.

## 3. `R118-A` 전날 결제 예정 요약 알림

### 3.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| A1 | `kind`는 `EXPENSE_D1` 그대로 씀. 새 kind·`CHECK` 제약 변경 없음 | 설정 토글(`planned_expense_d1`)·푸시 경로·기존 행을 그대로 이어 씀. 새 kind(`EXPENSE_DUE_TOMORROW`)는 기각함 |
| A2 | 3번 절을 사용자별 집계로 바꿈: 대상 조건은 현행과 같음(`status = 'PLANNED' AND target_date = 내일(KST)`, `planned_expense_d1` true 또는 행 없음, 탈퇴 대기 제외). `GROUP BY user_id HAVING count(*) >= 1` | 4번 절과 같은 모양 |
| A3 | 행: `title = '내일 결제 예정 ' \|\| N \|\| '건'`, `body = '내일 결제 예정인 지출을 지출 관리에서 확인하세요.'`(금액·항목명·메모 미포함), `link_path = '/dashboard/expenses'`, `source_id = user_id`, `scheduled_for = 내일`, `ON CONFLICT … DO NOTHING` | 사용자·결제일당 1건. 같은 날 cron 재실행 시 N이 늘어도 갱신하지 않음(4번 절과 같은 규칙) |
| A4 | 이미 쌓인 건별 `EXPENSE_D1` 행(`source_id = expense.id`)은 지우거나 고치지 않음 | 사용자가 읽거나 지운 상태를 건드리지 않음. 팝업은 `scheduled_for`로 찾으므로 옛 행도 동작함(B3) |
| A5 | 전환일 규칙: 마이그레이션 적용 전 09:00 실행분이 이미 건별 행을 만든 날에 함수를 수동 재실행하면 같은 날짜 요약 1건이 더 생길 수 있음. 마이그레이션 적용 후 수동 재실행은 하지 않도록 `sql/README.md` 적용 절차에 적음 | 전환일 1회 한정, 데이터 손상 없음. 옛 행을 지우는 정리 쿼리는 기각함(A4) |
| A6 | 설정 화면 `예정 지출 결제일 1일 전` 설명 문구를 `내일 결제 예정인 지출이 있으면 오늘 오전 9시(KST)에 건수만 요약해 1번 알려줌. 금액과 항목명은 표시하지 않음.`으로 바꿈 | 동작 변경 안내. 토글 키·라벨은 유지 |

### 3.2 DB 변경 (`sql/migrations/MIGRATION_R118_EXPENSE_D1_SUMMARY.sql`, 재실행 안전)

1. `CREATE OR REPLACE FUNCTION public.enqueue_daily_notifications()`로 3번 절만 A2·A3대로 바꿈. 1·2·4·5번 절과 6·7번 호출(`enqueue_game_budget_notifications`·`enqueue_monthly_report_notifications`)은 현행 `SCHEMA.sql` 본문을 글자 그대로 유지함. `REVOKE`/`GRANT`(service_role 전용)를 다시 적음.
2. 테이블·인덱스·제약·RLS·cron 변경 없음. 결제·환불 RPC 변경 없음.
3. `sql/SCHEMA.sql` 동기화, `sql/README.md`에 적용 순서·확인 쿼리(함수 본문에 `'내일 결제 예정 '` 포함 여부) 추가, `sql/tests/TESTS.sql` R39 `EXPENSE_D1` 단정을 새 형식으로 갱신 + 새 블록 추가.

### 3.3 인수 기준 (`R118-A`)

| # | 기준 | 검증 |
| :-: | :--- | :--- |
| 118A-1 | 내일 `PLANNED` 3건 보유 사용자에게 `EXPENSE_D1` 정확히 1행(`title = '내일 결제 예정 3건'`, `source_id = user_id`, `scheduled_for = 내일`)이 생김. 0건이면 생기지 않음. `CONFIRMED`·`CANCELLED`·다른 날짜 지출은 세지 않음 | `TESTS.sql` |
| 118A-2 | 같은 날 2회 실행해도 1행이고 제목의 N이 바뀌지 않음. 다음 날 실행은 새 결제일 행을 만듦 | `TESTS.sql` |
| 118A-3 | `planned_expense_d1 = false`·탈퇴 대기 사용자는 제외됨. 설정 행이 없으면 true로 처리됨 | `TESTS.sql` |
| 118A-4 | 제목·본문에 금액·항목명·메모가 없음(기존 R39 단정 유지: 금액·비밀 제목·비밀 메모 미포함) | `TESTS.sql` |
| 118A-5 | `FAVORITE_*`·`EXPENSE_DUE_TODAY`·`EXPENSE_AUTO_CONFIRMED`·`GAME_BUDGET_*`·`MONTHLY_REPORT` 생성 결과 불변, 푸시 `SENT`/`SKIPPED` 경로 불변 | 기존 `TESTS.sql` 전체 회귀 |
| 118A-6 | 마이그레이션 2회 연속 실행 안전, 업그레이드 경로(현행 DB → 마이그레이션)와 신규 경로(`SCHEMA.sql`) 함수 본문 일치 | 🐳 격리 로컬 Supabase 두 경로 |
| 118A-7 | 설정 카드 설명 문구 갱신, 기존 토글 저장·복원 불변 | Vitest(`notification-settings-card`) |

## 4. `R118-B` 알림 팝업 카드

### 4.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| B1 | 알림함 조회 열에 `kind, scheduled_for`를 추가함. 두 열은 기존 스키마에 있으므로 폴백 불필요 | |
| B2 | 항목을 누르면 읽음 처리(현행) 후 분기함: `kind ∈ {EXPENSE_D1, EXPENSE_DUE_TODAY}`이고 `scheduled_for`가 있으면 **결제 예정 팝업**, `kind = MONTHLY_REPORT`이고 `scheduled_for`가 있으면 **월간 리포트 팝업**(R118-C), 그 밖이나 `scheduled_for`가 `NULL`이면 현행처럼 `link_path`로 이동함 | U3·U4 |
| B3 | 결제 예정 팝업 대상: 본인 `expenses` 중 `target_date = 알림.scheduled_for`이고 `status IN ('PLANNED','CONFIRMED')`인 행. 정렬은 `PLANNED` 먼저, 같은 상태 안에서 `final_amount` 큰 순, 같으면 `title` 오름차순. `CANCELLED`는 보이지 않음 | 알림 생성 규칙(`target_date` 기준)과 같은 날짜 키. 옛 건별 행도 `scheduled_for`가 결제일이라 같은 목록을 보임(A4). 알림 뒤 결제한 항목은 `결제 완료`로 남아 무엇이 처리됐는지 보임 |
| B4 | 팝업 내용: 제목 `M월 D일 결제 예정`(KST, `scheduled_for` 기준), 항목별 `항목명`·`금액(final_amount, 원)`·상태 배지(`예정`/`결제 완료`), 아래에 `예정 합계 X원`(`PLANNED`만). 안내 문구 `알림 이후 바뀐 내용이 반영됨.` 버튼 `지출 관리로 이동`(→ `link_path`, 팝업 닫고 알림함 닫음)·`닫기` | 앱 안(로그인 본인 화면)이라 금액·항목명 노출 허용. 잠금 화면용 알림 본문 규칙(금액 미포함)은 그대로임 |
| B5 | 대상이 0건이면 `이 날짜에 남은 결제 예정이 없음.` 빈 상태와 이동 버튼을 보임. 조회 실패(오프라인 포함)면 `결제 내역을 불러오지 못함.`과 이동 버튼을 보임 | 읽기 전용이라 `isOffline()` 쓰기 가드는 불필요. 서비스 워커 캐시 응답이 있으면 그대로 씀 |
| B6 | 팝업은 읽기 전용임. 결제 처리·환불·삭제 버튼을 두지 않음 | 결제 RPC 흐름은 기존 지출 화면 모달에만 둠. 범위·위험 축소 |
| B7 | 구현 위치: 알림함 컴포넌트가 팝업 상태를 소유하고 `src/components/ui/dialog.tsx`(기존 Radix 프리미티브)로 띄움. 팝업 본문은 별도 컴포넌트(예: `src/components/layout/notification-payment-popup.tsx`)로 나눔. 팝업이 열릴 때 1회만 조회하고(`prevOpenRef` 패턴), 열린 동안 배경 재조회로 목록이 지워지지 않게 함. 시맨틱 색 토큰만 씀 | 대시보드·관리자 화면 공통 `Topbar`라 U4가 모든 화면에서 성립함 |
| B8 | 푸시 알림(`sw.js` `notificationclick`)·Tauri 토스트 클릭 동작은 바꾸지 않음. `link_path`·`SHELL_CACHE` 변경 없음 | U4 |

### 4.2 인수 기준 (`R118-B`)

| # | 기준 | 검증 |
| :-: | :--- | :--- |
| 118B-1 | `EXPENSE_D1`·`EXPENSE_DUE_TODAY` 클릭 시 읽음 처리되고 팝업이 열리며 `router.push`는 호출되지 않음. 다른 kind와 `scheduled_for = null` 행은 현행처럼 이동함 | Vitest(`notification-bell`) |
| 118B-2 | 팝업 조회가 `target_date = scheduled_for`·`status IN (PLANNED, CONFIRMED)` 조건으로 나가고 B3 정렬·B4 표시(항목명·금액·배지·예정 합계)가 맞음. `CANCELLED`는 보이지 않음 | Vitest(Supabase 모킹) |
| 118B-3 | 0건 빈 상태·조회 실패 상태에서 깨지지 않고 이동 버튼이 동작함 | Vitest |
| 118B-4 | `지출 관리로 이동`은 팝업·알림함을 닫고 `link_path`로 이동함. `닫기`·Esc는 이동 없이 닫음. 키보드 포커스가 팝업 안에 갇히고 닫으면 알림함 버튼으로 돌아감 | Vitest + 실화면 1회 |
| 118B-5 | 390·900·1280 너비에서 팝업이 넘치지 않음(긴 항목명 말줄임, 10건 이상이면 목록 스크롤). 라이트·다크 테마 모두 읽힘 | 실화면 확인(Reviewer 또는 사용자) |
| 118B-6 | 결제·환불 RPC, `expenses` 쓰기 경로, `sw.js`, 다른 알림 종류 동작 변경 없음 | diff·기존 Vitest 회귀 |

## 5. `R118-C` 월간 리포트 팝업 차트·지출 페이지 누적 추이

### 5.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| C1 | 순수 함수 2개를 새 파일 `src/lib/monthly-report.ts`에 둠: `buildMonthlyCategoryComparison(expenses, month)`, `buildCumulativeDailySpend(expenses, month, todayKst)`. 둘 다 **`CONFIRMED`만, 귀속은 `target_date`의 달**(기존 카테고리 원그래프·월별 추이·`MONTHLY_REPORT` SQL과 같은 기준) | R114 B11은 `예정 포함` 게임 예산 목록이라 기준이 다름. 이 차트들은 "확정 지출"로 화면에 명시함 |
| C2 | 월간 리포트 팝업: 대상 달 = `알림.scheduled_for`의 달(전월). 표시 ① 알림 본문(발송 시점 요약, 그대로) ② `카테고리별 확정 지출 (현재 기준)` 가로 묶음 막대: 카테고리마다 대상 달·그 전달 2개 막대, 카테고리 순서는 대상 달 금액 큰 순(같으면 `게임, 정기 구독, 식비, 교통, 생활, 기타` 순), 두 달 모두 0원인 카테고리는 뺌 ③ 막대 아래 카테고리별 `대상 달 X원 · 전달 Y원` 텍스트 목록(스크린 리더·좁은 화면용) ④ `지출 관리로 이동` 버튼 | 알림 본문은 스냅숏이라 그대로 두고, 차트는 지금 데이터로 계산함을 문구로 밝힘. 예산 초과 게임 수 재계산은 기각함(본문에 이미 있음) |
| C3 | 팝업 데이터 조회: 본인 `expenses`에서 `status = 'CONFIRMED'`, `target_date`가 전달 1일 이상·대상 달 다음 달 1일 미만인 행의 `category, final_amount, target_date`만 가져옴 | 최소 열·두 달 범위 |
| C4 | 지출 페이지 새 카드 `일별 누적 확정 지출`: 지출 탭 차트 그리드에 추가. 달 선택은 기존 `renderMonthSelect` 패턴(달 목록만, `전체 기간` 없음, 기본 이번 달). 선: 선택 달 일별 누적(실선), 전달 같은 일자 누적(점선, 전달 일수까지만). 선택 달이 이번 달이면 오늘(KST) 이후 점을 그리지 않음. 확정 지출이 두 달 모두 0이면 `EmptyState` | U2. 이미 페이지가 받은 지출 목록으로 계산해 새 조회 없음 |
| C5 | 색: 선택 달 = `CATEGORY_COLORS`와 겹치지 않는 기존 차트 강조색(Maker가 페이지 기존 팔레트 중 하나 선택), 전달 = `text-content-secondary` 계열 회색. 팝업 막대도 같은 2색. 축 금액은 기존 차트와 같은 천 단위 형식 | 페이지 기존 차트 관례(하드코딩 hex 팔레트)를 따르되 새 색 체계는 만들지 않음 |
| C6 | 전달 대비 문구는 만들지 않음(알림 본문·`TwoMonthBudgetCard`가 이미 보여 줌) | 중복 방지 |
| C7 | `recharts` 사용 시 기존과 같이 `accessibilityLayer={false}`와 감싼 요소의 `aria-label`(예: `11월 일별 누적 확정 지출 차트`)을 둠 | 기존 관례 |

### 5.2 함수 규칙 (`src/lib/monthly-report.ts`)

- 입력 지출 형태: `{ status, category, final_amount, target_date }`(`target_date`는 `YYYY-MM-DD`). 달은 `YYYY-MM`. 날짜 계산은 문자열·KST 기준으로 하고 `new Date(…)` 시간대 변환에 기대지 않음(기존 `calendar-utils.ts`·`dashboard-date.ts` 도구 재사용 가능).
- `buildMonthlyCategoryComparison` 반환: `{ month, previousMonth, rows: [{ category, current, previous }] }`, C2 정렬·0원 제외 적용.
- `buildCumulativeDailySpend` 반환: `{ days: [{ day, current: number | null, previous: number | null }] }`. `day`는 1~max(선택 달 일수, 전달 일수). `current`는 선택 달 일수 밖이거나 오늘 이후(이번 달일 때)면 `null`, `previous`는 전달 일수 밖이면 `null`. 누적은 해당 일자까지의 합(지출 없는 날은 전날 값 유지).

### 5.3 인수 기준 (`R118-C`)

| # | 기준 | 검증 |
| :-: | :--- | :--- |
| 118C-1 | 두 함수 Vitest: `PLANNED`·`CANCELLED` 제외, 달 경계(말일·1일), 윤년 2월·30/31일 달 길이 차이, 오늘 이후 `null`, 지출 없는 날 누적 유지, 0원 카테고리 제외·정렬 규칙 | Vitest |
| 118C-2 | `MONTHLY_REPORT` 클릭 시 팝업이 열리고 C3 조건으로 조회하며, 막대 데이터와 텍스트 목록이 118C-1 함수 결과와 같음. 데이터 0건이면 빈 상태 | Vitest(Supabase 모킹) |
| 118C-3 | 지출 페이지 누적 카드가 선택 달·전달 선을 그리고 달 선택 변경에 반응함. 기존 카테고리 원그래프·월별 추이·게임별 과금 분석·게임별 예산 숫자는 바뀌지 않음 | Vitest(지출 페이지 테스트), diff |
| 118C-4 | 390·900·1280 너비, 라이트·다크 테마에서 차트·팝업이 넘치지 않고 읽힘 | 실화면 확인 |

## 6. 공통 인수 기준

- `tsc --noEmit`·`npm run lint`·`npm run test -- --run`·`npm run build` 통과.
- 결제·환불·잔액 RPC와 `expenses` 제약·RLS 변경 없음(diff 확인).
- `src/lib/supabase/client.ts` 단일 클라이언트만 사용, `Map.values()` `for..of` 금지 등 CLAUDE.md UI·데이터 규칙 준수.

## 7. 모델 배정·Run 분할 권고 (최종 배정은 Orchestrator)

- **Run 1개 권장** `r118-payment-notification-popup` (Base = 등록 시점 `main`). `R118-A`는 SQL만, `R118-B`·`C`는 클라이언트만이라 파일이 겹치지 않음. 단 B의 팝업은 A의 요약 행·옛 건별 행 둘 다에서 동작하므로 A 운영 적용 전 배포해도 안전함.
- Step 1 `Maker (R118-A SQL)` — **Claude Opus (`High`)** *(SQL·RPC 변경, CLAUDE.md 승격 조건 ①; Fallback: GPT Codex)* 🐳. 허용 파일: `sql/migrations/MIGRATION_R118_EXPENSE_D1_SUMMARY.sql`(신규), `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/components/settings/notification-settings-card.tsx`(문구 1건)·`.test.tsx`.
- Step 2 `Maker (R118-B·C UI)` — **Claude Sonnet (`Medium`)** *(Fallback: GitHub Copilot)*. 허용 파일: `src/components/layout/notification-bell.tsx`·`.test.tsx`, 신규 팝업 컴포넌트·테스트(`src/components/layout/notification-*-popup.tsx`), 신규 `src/lib/monthly-report.ts`·`.test.ts`, `src/app/dashboard/expenses/page.tsx`·관련 테스트. Step 1과 병렬 가능(파일 겹침 없음).
- Step 3 `Reviewer` — **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Step 1 Maker인 Opus는 Step 1 범위 리뷰에서 제외)*. `review.json`·`test.json`, 🐳 격리 DB 두 경로 `TESTS.sql`, `main` 병합·문서 마감.
- Step 4 `사용자` — 운영 SQL Editor에서 마이그레이션 적용·확인 쿼리(적용 후 함수 수동 재실행 금지, A5), 배포, 다음 날 09:00 알림 1건·팝업·누적 차트 확인.
- `Gemini Models` 한도가 리셋되면 Orchestrator가 Step 2를 `Gemini 4 Hydrogen (Medium)`으로 돌려도 됨.

## 8. 위험과 완화

| 위험 | 완화 |
| :--- | :--- |
| 함수 재정의 중 다른 절이 옛 본문으로 되돌아감(R114 블록 유실 등) | A·3.2-1: 현행 `SCHEMA.sql` 본문 기준 재정의, 118A-5 전체 회귀·118A-6 두 경로 본문 비교 |
| 전환일 같은 결제일 알림 중복 | A5: 전환일 1회 한정, 수동 재실행 금지 안내 |
| 팝업 목록 수와 알림 제목 N이 다름 | B4 안내 문구, B3 `결제 완료` 배지로 변화 이유가 보임 |
| 차트 기준(확정만)과 게임 예산(예정 포함) 혼동 | C1: 카드·팝업 제목에 `확정 지출` 명시 |
| 알림함이 무거워짐 | 팝업 조회는 클릭 때 1회, 알림함 목록 조회는 열 2개 추가뿐 |

## 9. 미결 질문 (기본값으로 진행 가능)

- 없음. 팝업 항목을 눌러 개별 지출 상세로 가는 동작은 이번 범위 밖임(필요 시 후속 후보).
