# R113~R116 데이터 내보내기·게임별 예산·CSV 가져오기·공개 일정 페이지 명세

> 작성: Claude Opus (High), Chief Architect Fallback 1, 2026-11-26. `📐 SPEC_NEEDED`(게임 일정·과금 관리 기능 후보 4종) 산출물임. 명세·결정·인수 기준만 담으며 `src/**`·`sql/**`는 수정하지 않음. Run 등록·워크트리 생성·모델 최종 배정은 Orchestrator가 이 문서를 근거로 수행함.
> 요구사항 접수 기록은 [`docs/handoff.md`](handoff.md), 후보 출처는 [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md) §4(C1·C2·C5·C6)임.

## 0. 범위와 ID

| ID | 기능 | 출처 | DB 변경 | 구현 순서 |
| :--- | :--- | :--- | :--- | :--- |
| `R113` | 데이터 내보내기·백업(JSON 전체, 지출·수익 CSV) | C2 | 없음 | 1 |
| `R114` | 게임별 월 예산·월간 과금 리포트·알림 | C5 | 있음(🐳) | 2 |
| `R115` | CSV 결제 내역 가져오기 | C6 | 있음(🐳) | 3 |
| `R116` | 공개 게임별 일정 페이지·`robots.txt`·sitemap | C1 | 없음 | 4 |

- **명세 구성**: 네 기능을 이 문서 하나에 묶고, Run은 ID별로 따로 등록함(서로 다른 영역·위험도라 한 Run에 묶으면 리뷰 범위가 커짐).
- **순서 근거**: `R115`는 `R113`의 CSV 형식을 그대로 읽으므로 `R113`이 먼저임. `R114`·`R116`은 서로 독립이나 사용자 결정 순서(내보내기 → 예산 → 가져오기 → 공개 페이지)를 따름.
- **범위 제외**: 외부 캘린더 구독(C3, 사용자 제외), JSON 백업 복원, 스토어 전용 결제 내역 형식 자동 인식, 공개 페이지 자동 재빌드, 게임 예산 초과 시 등록 차단.

## 1. 사용자 확정 결정 (2026-11-26 질문 카드)

| 질문 | 결정 |
| :--- | :--- |
| 첫 구현 순서 | 내보내기 → 게임별 예산·리포트 → CSV 가져오기 → 공개 페이지 |
| 내보내기 범위 | JSON 전체 백업 + 지출·수익 CSV, 기기에 파일 저장, **복원 제외** |
| 게임별 예산 초과 | **경고·알림만**(등록 차단 없음), 매달 같은 게임별 월 한도, 기존 월 전체 예산과 별개 |
| 게임별 예산 사용액 | **예정 + 확정 합산**(기존 월 예산과 같은 귀속 규칙) |
| 가져온 결제 내역 상태 | **확정(`CONFIRMED`) 기록, 총자산·포인트 미반영**, 중복은 건너뜀 |
| 가져오기 형식 | ChronoLedger 내보내기 CSV 자동 인식 + 일반 CSV 열 지정 |
| 공개 페이지 갱신 | **빌드 때 생성, 배포 때만 갱신**(자동 재빌드 없음). 열람 시 최신 일정을 다시 불러와 보완 |
| 공개 일정 범위 | 진행 중·예정 + 최근 3개월 종료 일정. 공식 일정·게임 카탈로그만 공개, 개인 지출·설정은 항상 제외 |

## 2. 현행 구조 요약 (2026-11-26 확인, 근거)

- **지출**: `public.expenses`. 상태 `PLANNED`·`CONFIRMED`·`CANCELLED`(취소 구분 `PLANNED_CANCEL`·`TEMPLATE_DEACTIVATION`·`PAYMENT_REFUND`). 금액 `final_amount = original_price - discount_amount - point_discount_amount`.
  - 클라이언트 INSERT·UPDATE 정책은 `PLANNED` 행만 허용함(`Insert own planned expenses`·`Update own planned expenses`). 확정은 `process_expense_payment`, 환불은 `refund_expense_payment` RPC로만 함.
  - `refund_expense_payment`는 `payment_method = 'NAVER_PAY'`면 `deduct_from_asset`과 무관하게 네이버페이 잔액에 `final_amount`를 더하고, 포인트 필드가 있으면 지갑을 되돌리며, `deduct_from_asset AND payment_method <> 'NAVER_PAY'`일 때만 총자산을 복원함.
- **예산 귀속**: `src/lib/budget-calculations.ts` `getBudgetDate()` — `PLANNED`이고 `end_date`가 있으면 `end_date` 달, 그 외는 `target_date` 달. `isBudgetCounted()`는 `PLANNED`·`CONFIRMED`만 셈.
- **월 예산**: `monthly_budgets`(월별 행) + `user_finances.default_budget`(폴백). 클라이언트가 RLS(`Manage own budgets`)로 직접 씀.
- **게임별 통계**: `src/app/dashboard/expenses/page.tsx` "게임별 과금 분석"은 `CONFIRMED` + `category = '게임'`만 합산함.
- **알림**: `notifications.kind` CHECK 제약(현재 8종), 중복 방지 `uq_notifications_daily_source (user_id, kind, source_id, scheduled_for)`, 생성은 pg_cron `chronoledger-daily-notifications` → `enqueue_daily_notifications()`, 사용자 토글은 `notification_settings` 열(행 없으면 기본 true).
- **공개 데이터**: `anon`은 `games` 전체, `game_schedules`(`is_official = true`), `game_characters` 일부 열을 읽을 수 있음. 게스트 열람(R41~R44)이 이미 이 권한을 씀.
- **정적 export**: `next.config.mjs` `output: 'export'`. 동적 경로 페이지·`sitemap`·`robots`가 아직 없음. `scripts/inject-csp.mjs`(postbuild)가 모든 `out/**/*.html`에 CSP를 넣고 인라인 스크립트 해시를 계산함. `public/_redirects`는 `/ → /auth 302`, `/* → /index.html 200`.
- **서비스 워커**: `public/sw.js`는 Supabase REST GET을 네트워크 우선으로 받고 응답 사본을 사용자별 캐시에 저장, 네트워크 실패 시 캐시로 응답함.
- **사이트 주소**: 코드·설정 어디에도 운영 도메인 값이 없음(canonical·sitemap에 필요).

## 3. `R113` 데이터 내보내기·백업

### 3.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| E1 | 클라이언트에서 본인 데이터를 Supabase로 조회해 브라우저에서 파일을 만들고 `Blob` + `<a download>`로 저장함. DB·RPC 변경 없음 | 서버 런타임이 없음. RLS가 본인 행만 돌려주므로 새 권한이 필요 없음. Edge Function 생성은 기각함(복잡도 대비 이득 없음) |
| E2 | 설정 페이지에 "데이터 내보내기" 카드를 두고 버튼 3개: `전체 백업(JSON)`·`지출 CSV`·`수익 CSV` | 압축(zip) 의존성 추가를 피함 |
| E3 | 파일명: `chronoledger-backup-YYYYMMDD.json`, `chronoledger-expenses-YYYYMMDD.csv`, `chronoledger-incomes-YYYYMMDD.csv`(KST 날짜) | |
| E4 | 조회는 테이블마다 `.range()`로 1,000행씩 끝까지 페이지 조회함(정렬 `created_at, id`) | PostgREST 기본 최대 행 수 때문에 한 번 조회로는 잘림 |
| E5 | 오프라인이면 `isOffline()` 가드로 막고 안내 토스트를 띄움 | 서비스 워커가 네트워크 실패 시 캐시 응답을 돌려주므로 오프라인 내보내기는 오래된 데이터가 섞일 수 있음 |
| E6 | 형식 정의(열 순서·한국어 라벨·코드 매핑·수식 방지 규칙)는 `src/lib/export-format.ts` 한곳에 두고 `R115`가 재사용함 | 왕복 호환 보장 |
| E7 | 데스크톱(Tauri, Windows WebView2)도 같은 `<a download>` 경로를 씀. 다운로드 폴더 저장을 실기기에서 확인하고, 안 되면 `R113-TAURI-SAVE` 후속으로 넘김(이 Run에서 Tauri 플러그인 추가 안 함) | 플러그인·capability 추가는 Rust 영역 변경이라 범위를 키움 |

### 3.2 JSON 백업 형식

```json
{
  "format": "chronoledger-backup",
  "version": 1,
  "exported_at": "2026-11-26T12:00:00+09:00",
  "user_id": "<uuid>",
  "tables": { "<table>": [ /* 행 원본 그대로 */ ] },
  "catalog": {
    "games": [{ "id": "...", "name": "..." }],
    "schedules": [{ "id": "...", "game_id": "...", "title": "...", "start_date": "...", "end_date": "..." }]
  }
}
```

- **포함 테이블(본인 행)**: `users`(본인 프로필), `user_finances`, `monthly_budgets`, `incomes`, `expenses`, `store_wallets`, `store_point_transactions`, `subscription_templates`, `user_expense_presets`, `user_games`, `user_favorite_schedules`, `personal_memos`, `user_characters`, `user_character_presets`, `notification_settings`, `feedback_requests`, `game_requests`, `schedule_requests`, `character_requests`.
- **제외**: `push_subscriptions`(푸시 endpoint·키는 자격 증명과 같음), `notifications`(30일 후 정리되는 일시 데이터), `account_deletion_requests`, 관리자 전용 테이블, Storage 이미지 파일(경로 문자열만 행에 남음).
- **`catalog`**: 지출·템플릿·관심 일정 등이 참조하는 게임·일정의 이름만 함께 담아 파일만으로도 읽을 수 있게 함.
- 어떤 테이블에 본인 SELECT 정책이 없거나 미적용 열 때문에 조회가 실패하면, 그 테이블은 `tables`에서 빼고 `"skipped": [{ "table": "...", "reason": "..." }]`에 남김. 이 Run에서 정책을 추가하지 않음.
- 여러 테이블을 한 트랜잭션으로 읽지 않으므로 내보내는 몇 초 사이의 변경은 섞일 수 있음. `exported_at`으로 시점을 밝힘.

### 3.3 CSV 형식

- **공통**: UTF-8 BOM, CRLF 줄바꿈, RFC 4180 따옴표 규칙, 첫 줄은 한국어 헤더. 금액은 쉼표 없는 정수, 날짜는 `YYYY-MM-DD`, 시각은 ISO 8601(KST 오프셋).
- **수식 주입 방지**: 셀 값이 `=`, `+`, `-`, `@`, 탭, CR로 시작하면 앞에 `'`를 붙임. `R115`는 자체 형식을 읽을 때 "`'` 뒤에 위 문자가 오는 경우"에만 `'` 하나를 지움.
- **지출 CSV 열(순서 고정)**: `ID`, `날짜`, `항목명`, `분류`, `게임`, `게임ID`, `상태`, `취소구분`, `정가`, `할인액`, `포인트할인액`, `사용포인트`, `적립포인트`, `실결제액`, `결제수단`, `포인트플랫폼`, `자산차감`, `기간시작`, `기간종료`, `메모`, `생성시각`.
  - `상태`·`취소구분`·`결제수단`·`포인트플랫폼`은 앱 화면과 같은 한국어 라벨, `자산차감`은 `Y`/`N`. 코드 ↔ 라벨 매핑은 `export-format.ts`에만 둠.
  - 모든 상태(예정·확정·취소)를 포함함. 화면 필터와 무관하게 전체 기간을 내보냄.
- **수익 CSV 열**: `ID`, `날짜`, `분류`, `항목명`, `금액`, `메모`, `생성시각`.

### 3.4 인수 기준 (`R113`)

| # | 기준 |
| :--- | :--- |
| 113-1 | 설정 페이지 "데이터 내보내기" 카드의 버튼 3개가 각각 E3 이름의 파일을 저장함. 진행 중에는 버튼을 비활성화하고 완료·실패 토스트를 띄움 |
| 113-2 | JSON이 §3.2 형식을 따르고 포함·제외 목록을 지킴. `push_subscriptions` 값이 파일에 없음을 테스트로 확인함 |
| 113-3 | 1,000행을 넘는 테이블이 전부 담김(페이지 조회 Vitest: 2,345행 모킹 → 2,345행) |
| 113-4 | CSV가 §3.3 열 순서·BOM·CRLF·따옴표·수식 방지를 지킴(쉼표·줄바꿈·따옴표·`=` 시작 메모를 포함한 Vitest) |
| 113-5 | 오프라인이면 조회 없이 안내만 함 |
| 113-6 | 웹 빌드에서 Tauri 전용 import가 없음, 기존 Vitest·tsc·lint·`next build` 통과 |
| 113-7 | (사용자) 웹과 Windows 설치본에서 파일 저장 1회씩 확인. 설치본 실패 시 `R113-TAURI-SAVE` 등록 |

## 4. `R114` 게임별 월 예산·월간 리포트·알림

### 4.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| B1 | `user_games`에 `monthly_budget BIGINT NULL CHECK (monthly_budget IS NULL OR monthly_budget > 0)` 열을 추가함. `NULL`이면 예산 없음. 쓰기는 기존 `Manage own user_games` RLS로 클라이언트가 직접 함 | 사용자당 게임당 1행이 이미 있음. 금전 이동이 아닌 설정값이라 RPC가 필요 없음(기존 `monthly_budgets`와 같은 방식). 별도 테이블은 기각함 |
| B2 | 사용액 = 그 게임(`game_id` 일치) 지출 중 `PLANNED`·`CONFIRMED`의 `final_amount` 합, 귀속 달은 `getBudgetDate()`. **분류(`category`)와 무관하게 `game_id`로 셈** | 게임 월정액(`정기 구독` 분류 + `game_id`)도 그 게임 예산에 들어가는 것이 사용자 기대에 맞음. 기존 "게임별 과금 분석"(확정·`게임` 분류만)과 기준이 다르므로 화면에 기준을 명시함 |
| B3 | 순수 함수 `calculateGameBudgetUsage(expenses, month, budgets)`를 `budget-calculations.ts`에 추가하고 기존 `getBudgetDate`·`isBudgetCounted`를 재사용함 | 귀속 규칙 단일화 |
| B4 | 서버 알림 집계 SQL은 B2와 같은 규칙을 씀: `status IN ('PLANNED','CONFIRMED')`, 귀속일 `CASE WHEN status = 'PLANNED' AND end_date IS NOT NULL THEN end_date ELSE target_date END` | TS·SQL 규칙이 어긋나면 화면과 알림이 다른 숫자를 냄. `TESTS.sql`에 같은 경계 사례를 둠 |
| B5 | 알림 종류 3개 추가: `GAME_BUDGET_80`, `GAME_BUDGET_100`, `MONTHLY_REPORT`. `notifications_kind_check` 제약을 재생성함 | |
| B6 | `notification_settings`에 `game_budget_alert BOOLEAN NOT NULL DEFAULT true`, `monthly_report BOOLEAN NOT NULL DEFAULT true` 추가. 설정 페이지 알림 카드에 토글 2개 추가 | 기존 토글 패턴 |
| B7 | 생성은 기존 `enqueue_daily_notifications()`를 확장함(새 cron 없음). 하루 1회 실행이라 알림은 최대 하루 늦을 수 있고, 화면 표시는 즉시 반영됨 | 지출 테이블 트리거는 결제·환불 경로마다 실행돼 원장 RPC 위험을 키움. 기각함 |
| B8 | 예산 알림 규칙(KST 이번 달 기준): 사용률 ≥ 100%면 `GAME_BUDGET_100`만, 80% ≤ 사용률 < 100%면 `GAME_BUDGET_80`. 중복 방지 키 `source_id = game_id`, `scheduled_for = 이번 달 1일`. 한 달에 종류별 1회만 보냄. 예산을 내린 뒤 다시 넘어도 같은 달에는 다시 보내지 않음 | 기존 고유 인덱스를 그대로 씀 |
| B9 | 월간 리포트: KST 매월 1일 실행분에서, 전월에 `CONFIRMED` 지출이 1건 이상인 사용자에게 1건. `source_id = user_id`, `scheduled_for = 전월 1일`. 본문: `"N월 확정 지출 X원(전월 대비 ±Y%) · 예산 초과 게임 K개"`. 전전월 확정 지출이 0이면 `"전월 기록 없음"`. 예산 초과 수는 B2 기준(전월 귀속 예정+확정)으로 셈. 링크 `/dashboard/expenses` | 본문 300자 제한 안 |
| B10 | 예산 설정 UI: 게임 페이지(`/dashboard/games`) 게임 카드에 "월 예산" 동작 → 금액 입력 모달(정수, 1원 이상 1,000억 원 이하, 비우면 해제). 모달은 열릴 때만 초기화(`prevOpenRef`) | |
| B11 | 리포트 UI: 지출 페이지 "게임별 과금 분석" 영역에 "게임별 예산" 목록 추가 — 선택한 달의 예산 있는 게임별 `사용액 / 한도`, 진행 막대(80% 이상 경고색, 100% 이상 위험색, 시맨틱 토큰), 문구 "예정 포함". 그리고 그 달 게임 확정 합계의 "전월 대비 ±X원(±Y%)" 1줄 | 차트 신규 추가 없이 기존 화면 확장 |
| B12 | 마이그레이션 미적용 DB 폴백: `monthly_budget` 조회가 열 없음(`42703`)으로 실패하면 열 없이 다시 조회하고 예산 UI를 숨김. 알림 토글도 열이 없으면 숨김 | CLAUDE.md 수동 적용 규칙 |

### 4.2 DB 변경 (`sql/migrations/MIGRATION_R114_GAME_BUDGETS.sql`, 재실행 안전)

1. `user_games.monthly_budget` 열·CHECK 추가(`ADD COLUMN IF NOT EXISTS`, 제약 존재 검사).
2. `notifications_kind_check` 재생성(기존 8종 + B5 3종).
3. `notification_settings` 열 2개 추가.
4. `enqueue_daily_notifications()` 재정의: 기존 블록은 그대로 두고 B8·B9 블록 추가. 토글 열이 false인 사용자는 건너뜀(행 없음 = true). `ON CONFLICT DO NOTHING`으로 중복 방지.
5. `SCHEMA.sql` 동기화, `sql/README.md` 확인 쿼리, `sql/tests/TESTS.sql` 블록, `database.types.ts` 갱신.

### 4.3 인수 기준 (`R114`)

| # | 기준 |
| :--- | :--- |
| 114-1 | `calculateGameBudgetUsage` Vitest: 취소·환불 제외, `PLANNED` + `end_date` 다음 달 귀속, 포인트 할인 후 `final_amount` 사용, `정기 구독` 분류 + `game_id` 포함, `game_id` 없는 지출 제외 |
| 114-2 | `TESTS.sql`: 114-1과 같은 경계 사례로 `enqueue_daily_notifications()`가 80%·100%를 정확히 1회씩 만들고, 같은 날 재실행해도 늘지 않음. 토글 false 사용자는 생성 없음 |
| 114-3 | `TESTS.sql`: 1일 실행에서 `MONTHLY_REPORT` 1건, 전월 확정 0건 사용자는 생성 없음, 전전월 0원이면 "전월 기록 없음" 문구 |
| 114-4 | 게임 카드 예산 모달이 저장·해제되고 범위 밖 값은 거부함. 오프라인이면 저장 차단 |
| 114-5 | 지출 페이지 "게임별 예산" 목록이 114-1 함수 결과와 같은 값을 보이고, 기존 "게임별 과금 분석" 숫자는 바뀌지 않음 |
| 114-6 | 마이그레이션 미적용 모킹(`42703`)에서 페이지가 깨지지 않고 예산 UI만 숨김 |
| 114-7 | 마이그레이션 재실행 안전, 🐳 로컬 Supabase에서 `TESTS.sql` 통과, tsc·lint·Vitest·`next build` 통과 |
| 114-8 | 결제·환불 RPC와 `expenses` 제약은 변경하지 않음(diff로 확인) |

## 5. `R115` CSV 결제 내역 가져오기

### 5.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| I1 | 가져온 행은 `status = 'CONFIRMED'`, **`payment_method = 'WALLET'`, `deduct_from_asset = false`**, `original_price = final_amount = 금액`, 할인·포인트 필드 0, `point_platform`·`template_id`·`schedule_id`·`pickup_schedule_id` `NULL`로 고정함 | 이 조합이면 기존 `refund_expense_payment`가 총자산·지갑·포인트를 건드리지 않음(§2). 원본 결제수단을 `NAVER_PAY`로 넣으면 환불 시 차감된 적 없는 네이버페이 잔액이 늘어 원장이 틀어짐. 환불 RPC를 고치는 대안은 원장 RPC 변경이라 기각함 |
| I2 | 원본 결제수단 등 매핑되지 않는 정보는 메모 끝에 `[가져오기] 결제수단: 네이버페이` 식으로 붙임 | 정보 보존 |
| I3 | 쓰기는 새 `SECURITY DEFINER` RPC `import_confirmed_expenses(p_rows JSONB) RETURNS JSONB`(`{ "batch_id", "inserted" }`)로만 함. `auth.uid()` 필수, `anon` 실행 권한 회수 | 클라이언트 INSERT 정책은 `PLANNED`만 허용함. 일괄 원자 처리와 I1 강제를 서버에서 보장함 |
| I4 | RPC 검증: 행 수 1~1,000, `target_date` 2000-01-01 ~ KST 오늘, 금액 정수 1 ~ 10,000,000,000, 제목 trim 후 1~150자, 메모 500자 이하, 분류는 `expenses` 허용 목록, `game_id`는 `NULL`이거나 존재하는 게임. 한 행이라도 어기면 전체 실패하고 오류 문구에 행 번호를 담음 | 전부 아니면 전무. 클라이언트 미리보기가 먼저 거르므로 실패는 예외 경로임 |
| I5 | `expenses`에 `import_batch_id UUID NULL` 열과 부분 인덱스(`user_id, import_batch_id WHERE import_batch_id IS NOT NULL`) 추가 | 일괄 취소·최근 가져오기 목록용 |
| I6 | 가져오기 취소 RPC `delete_import_batch(p_batch_id UUID) RETURNS INTEGER`: 본인 행 중 `import_batch_id` 일치이고 I1 조건(`WALLET`·자산 미차감·포인트 0)을 그대로 지닌 행만 삭제하고 삭제 수를 돌려줌 | 원장에 흔적이 없는 행이라 삭제가 안전함. 상태가 `CANCELLED`(환불 처리)로 바뀐 행도 같은 조건이면 삭제함 |
| I7 | CSV 파서는 `src/lib/csv.ts`에 직접 작성(RFC 4180 따옴표·줄바꿈 포함 필드)하고 `R113` 쓰기와 공유함. 새 의존성 없음 | 수십 줄 규모, 테스트로 고정 가능 |
| I8 | 인코딩: UTF-8(BOM 제거)로 `fatal` 디코딩 시도 → 실패하면 `TextDecoder('euc-kr')` | 국내 Excel의 기본 CSV 저장이 EUC-KR(CP949)인 경우가 많음 |
| I9 | 파일 2 MiB 이하, 데이터 행 1,000행 이하(초과 시 파일 분할 안내) | RPC 상한과 일치 |
| I10 | **자체 형식 자동 인식**: 첫 줄이 §3.3 지출 CSV 헤더와 정확히 같으면 열 지정 단계를 건너뜀. `상태 = 확정` 행만 대상, 금액은 `실결제액`, `게임ID`가 존재하면 그대로, 없으면 `게임` 이름으로 매칭. `ID`가 이미 본인 지출에 있으면 "이미 있는 지출"로 제외 | 같은 계정 재가져오기 중복 방지 |
| I11 | **일반 CSV 열 지정**: 필수 `날짜`·`금액`·`항목명`, 선택 `분류`·`게임`·`메모`. 열 미지정 시 기본 분류 선택(기본값 `게임`). 분류 값이 허용 목록에 없으면 `기타` | |
| I12 | 값 해석: 날짜 `YYYY-MM-DD`·`YYYY.MM.DD`·`YYYY/MM/DD`(뒤 시각은 무시, 시간대 변환 없음). 금액은 `₩`·`원`·쉼표·공백 제거 후 정수만. 게임은 `games.name`과 trim·대소문자 무시 정확 일치, 없으면 `game_id = NULL` + "게임 미매칭" 표시 | 추측 매칭(부분 일치)은 잘못 묶을 위험이 커 기각함 |
| I13 | 제외 사유(미리보기에서 체크 불가): 날짜 해석 불가·범위 밖(미래 포함), 금액 0 이하·해석 불가(환불 행 가능성 안내), 제목 비어 있음, 자체 형식의 확정 외 상태, 이미 있는 ID | |
| I14 | **중복 의심**(기본 체크 해제, 사용자가 켤 수 있음): 같은 `target_date`·`final_amount`·정규화 제목(trim·공백 압축·소문자)을 가진 기존 `CONFIRMED`·`PLANNED` 지출이 있으면 표시. 개수 기준 비교(파일에 같은 행 2개, 기존 1개면 1개만 의심) | 같은 날 같은 상품을 두 번 산 경우를 막지 않기 위해 차단 대신 해제 기본값 |
| I15 | UI: 지출 페이지 `CSV 가져오기` 버튼 → 단계형 모달(파일 선택 → 열 지정 → 미리보기 → 완료). 미리보기는 행별 체크·사유 배지·합계(가져올 건수·금액). 완료 화면에 `가져오기 취소` 버튼, 시작 화면에 최근 가져오기 5건(일시·건수, 각각 취소 가능) | |
| I16 | 가져온 확정 행은 그 달 예산·통계·게임별 예산에 반영됨을 미리보기에 안내함 | 예상 밖 예산 초과 방지 |

### 5.2 DB 변경 (`sql/migrations/MIGRATION_R115_EXPENSE_IMPORT.sql`, 재실행 안전)

1. `expenses.import_batch_id` 열·부분 인덱스.
2. `import_confirmed_expenses(JSONB)`·`delete_import_batch(UUID)` 생성, `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC, anon`, `GRANT EXECUTE ... TO authenticated`.
3. `SCHEMA.sql`·README 확인 쿼리·`TESTS.sql`·`database.types.ts` 동기화.

### 5.3 인수 기준 (`R115`)

| # | 기준 |
| :--- | :--- |
| 115-1 | `TESTS.sql`: 가져온 행이 I1 값으로 저장되고 `user_finances.total_asset`·`store_wallets`·`store_point_transactions`가 변하지 않음 |
| 115-2 | `TESTS.sql`: 가져온 행에 `refund_expense_payment`를 실행해도 총자산·지갑·포인트 원장이 변하지 않고 상태만 `CANCELLED`/`PAYMENT_REFUND`가 됨 |
| 115-3 | `TESTS.sql`: I4 위반 1행이 섞이면 전체가 들어가지 않음. 1,001행 거부. 존재하지 않는 `game_id` 거부. `anon` 실행 거부 |
| 115-4 | `TESTS.sql`: `delete_import_batch`가 본인 배치만 지우고, 다른 사용자 배치 ID는 0건 처리 |
| 115-5 | `csv.ts` Vitest: 따옴표 안 쉼표·줄바꿈·이중 따옴표, BOM, CRLF/LF, `R113` 출력 → 파싱 왕복 일치, 수식 방지 `'` 복원 규칙 |
| 115-6 | 해석 Vitest: I8 EUC-KR 바이트 디코딩, I12 날짜·금액 형식, I13 제외 사유, I14 개수 기준 중복 의심 |
| 115-7 | 자체 형식 파일은 열 지정 없이 미리보기로 가고, 같은 계정 재가져오기 시 모든 행이 "이미 있는 지출"로 제외됨 |
| 115-8 | 오프라인이면 가져오기·취소 차단. 결제·환불 RPC와 기존 정책 diff 없음 |
| 115-9 | 🐳 로컬 Supabase `TESTS.sql` 통과, tsc·lint·Vitest·`next build` 통과 |

## 6. `R116` 공개 게임별 일정 페이지·SEO

### 6.1 결정

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| P1 | 경로 `/games/`(게임 목록)와 `/games/[gameId]/`(게임별 일정). `gameId`는 `games.id` UUID. `generateStaticParams`로 빌드 시점 전체 게임을 생성하고 `dynamicParams = false` | 슬러그 열 추가는 DB 변경과 이름 변경 시 링크 깨짐을 부름. 기각함. `/dashboard/games`와 경로가 겹치지 않음 |
| P2 | 이 두 페이지는 **빌드 시점 서버 컴포넌트**로 HTML을 만듦(정적 export 안에서 동작). 데이터는 새 모듈 `src/lib/public-catalog.ts`가 `fetch`로 Supabase REST를 **anon 키로만** 읽음 | 기존 "모든 페이지는 클라이언트 컴포넌트" 관례의 의도된 예외임. supabase-js 싱글턴은 브라우저 세션 저장소를 전제하므로 빌드 시점에 쓰지 않음. `createClient`를 새로 부르지 않으므로 싱글턴 규칙과 충돌하지 않음. service role 키는 절대 쓰지 않음(anon RLS가 공개 범위를 강제함) |
| P3 | 공개 데이터: `games`(`id`, `name`, `default_icon_url`), `game_schedules`(`is_official = true`만, 제목·종류·재복각·기간·시각·예상 여부), 픽업 캐릭터 이름(`game_characters` anon 허용 열). 개인 데이터 조회 코드 없음 | 사용자 결정 |
| P4 | 표시 범위: 기준일(KST) 기준 진행 중, 예정, 종료 후 3개월 이내. 그룹 순서 진행 중 → 예정 → 최근 종료. 예상 시각은 "예상" 배지, 재복각 배지, 픽업 캐릭터 이름 | 사용자 결정 |
| P5 | 열람 시 보완: 페이지 안의 클라이언트 컴포넌트가 빌드 데이터로 먼저 그리고, 온라인이면 싱글턴 클라이언트로 같은 게임의 최신 공식 일정을 다시 불러와 교체하며 기준일을 오늘로 바꿈. 실패하면 빌드 데이터를 그대로 둠 | 사용자 결정(배포 때만 HTML 갱신). 로그인 사용자도 `is_official = true` 조건을 명시해 개인 비공식 일정이 섞이지 않게 함 |
| P6 | 메타데이터: `generateMetadata`로 제목 `"{게임명} 픽업·버전 일정 | ChronoLedger"`, 설명(진행·예정 건수 요약), OG 제목·설명·이미지. OG 이미지는 아이콘이 `game-assets` 공개 URL일 때만 쓰고, 아니면 앱 기본 아이콘 | `data:` URL과 외부 임의 호스트는 OG 이미지로 부적합 |
| P7 | 사이트 주소는 새 환경 변수 `NEXT_PUBLIC_SITE_URL`(예: `https://<운영 도메인>`). 있으면 canonical·sitemap·robots의 sitemap 줄을 만들고, **없으면 그 항목만 생략하고 빌드 경고**를 출력함(빌드 실패 아님) | 데스크톱 릴리스 CI·로컬 빌드가 이 값 없이도 돌아야 함 |
| P8 | `src/app/sitemap.ts`·`src/app/robots.ts`(정적 생성). sitemap: `/games/`와 각 게임 페이지, `lastModified`는 그 게임 공식 일정의 최신 `updated_at`. robots: `/games/` 허용, `/dashboard`·`/admin`·`/auth` 비허용 | 앱 화면은 검색 대상이 아님 |
| P9 | 빌드 시점 조회 실패(네트워크·인증 오류)는 **빌드 실패**로 처리함 | 빈 공개 페이지를 조용히 배포하는 것보다 명확함. 운영 빌드는 이미 Supabase 환경 변수를 요구함 |
| P10 | 로그인 화면(`/auth`)에 "게임 일정 둘러보기" 링크(`/games/`)를 추가하고, 공개 페이지에는 "ChronoLedger에서 과금·일정 관리하기" 안내 링크(`/auth`)를 둠 | 크롤러 내부 링크와 유입 전환 |
| P11 | 배포 후 Cloudflare Pages가 `/games/<id>`에 **생성된 HTML**을 주는지 확인함(`/* /index.html 200` 규칙이 정적 파일보다 앞서면 빈 SPA 셸이 나감). 셸이 나가면 `_redirects`에 `/games/*` 예외를 두는 수정을 같은 Run에서 함 | 규칙 우선순위는 배포 환경에서만 확인 가능 |
| P12 | 게임이 삭제되면 다음 배포 전까지 옛 HTML이 남고, P5 조회가 게임 없음이면 "게임을 찾을 수 없음"으로 바꿈. 배포 뒤 추가된 게임은 다음 배포 때 페이지가 생김 | 사용자 결정(배포 때만 갱신)의 알려진 한계 |
| P13 | SEO 목표: 사용자가 Google Search Console에 sitemap을 제출하고, 4주 뒤 색인된 게임 페이지 수와 `/games/` 유입 클릭 수를 확인함. Run 통과 조건이 아닌 운영 지표임 | |

### 6.2 인수 기준 (`R116`)

| # | 기준 |
| :--- | :--- |
| 116-1 | `next build` 후 `out/games/index.html`과 게임 수만큼 `out/games/<id>.html`(또는 `<id>/index.html`)이 생기고, HTML 본문에 게임명·일정 제목이 JS 실행 없이 들어 있음(빌드 산출물 검사 스크립트 또는 테스트) |
| 116-2 | `public-catalog.ts`가 anon 키·`is_official=eq.true`로만 조회하고 개인 테이블을 부르지 않음(단위 테스트로 요청 URL 확인). 저장소에 service role 키 참조 없음 |
| 116-3 | P4 범위 함수 Vitest: KST 기준일 경계(진행 중 마지막 날, 종료 후 정확히 3개월·3개월+1일), 예상 배지, 재복각 |
| 116-4 | P5: 최신 조회 성공 시 교체, 실패 시 빌드 데이터 유지, 게임 없음 문구(컴포넌트 테스트) |
| 116-5 | `NEXT_PUBLIC_SITE_URL` 있음/없음 두 경우: 있으면 canonical·`sitemap.xml`·robots sitemap 줄 생성, 없으면 생략 + 경고, 빌드 성공 |
| 116-6 | `inject-csp.mjs`가 새 HTML에도 CSP를 넣고 페이지가 CSP 위반 없이 열림(로컬 정적 서빙 확인) |
| 116-7 | 기존 앱 경로(`/auth`, `/dashboard/**`, `/admin`) 동작과 데스크톱 빌드(`frontendDist`)에 영향 없음, tsc·lint·Vitest·`next build` 통과 |
| 116-8 | (사용자) Cloudflare Pages에 `NEXT_PUBLIC_SITE_URL` 설정 → 배포 → `curl https://<도메인>/games/<id>` 응답 HTML에 게임명이 있음(P11) → Search Console sitemap 제출 |

## 7. 모델 배정·Run 분할 권고 (최종 배정은 Orchestrator)

> `Gemini Models` 주간 한도 소진 상태(2026-11-26)라 Gemini 배정을 다른 한도 묶음으로 바꿔 둠. 리셋되면 시작 전 Step에 한해 Gemini 원안(Hydrogen 기본 Maker·리뷰)으로 돌릴 수 있음.

| Run | Step | 역할 | 권고 모델 | 근거 |
| :--- | :--- | :--- | :--- | :--- |
| `r113-data-export` | 1 | Maker | Claude Sonnet (`Medium`) *(Fallback: GitHub Copilot)* | DB 변경 없는 클라이언트 기능, 기준 명확 |
| | 2 | Reviewer | GPT Codex *(Fallback: Claude Opus `High`)* | 개인 재무 데이터 노출 범위(포함·제외 목록) 확인 |
| | 3 | 사용자 | 웹·설치본 저장 확인(113-7) | |
| `r114-game-budgets` 🐳 | 1 | Maker | Claude Opus (`High`) *(Fallback: GPT Codex)* | SQL·알림 cron·예산 귀속 규칙(Opus 조건 ①) |
| | 2 | Reviewer | GPT Codex *(Fallback: Claude Sonnet `Medium`)* | TS·SQL 귀속 규칙 일치 확인 |
| | 3 | 사용자 | 운영 DB 마이그레이션 적용·확인 쿼리, 배포 | |
| `r115-csv-import` 🐳 | 1 | Maker | Claude Opus (`High`) *(Fallback: GPT Codex)* | 지출 원장 `SECURITY DEFINER` RPC(Opus 조건 ①) |
| | 2 | Reviewer | GPT Codex *(Fallback: Claude Opus `High` — Maker와 다른 세션)* | 환불 경로 원장 불변 확인 |
| | 3 | 사용자 | 운영 DB 적용, 실제 CSV 1개 가져오기·취소 확인 | |
| `r116-public-game-pages` | 1 | Maker | Claude Sonnet (`Medium`) *(Fallback: GitHub Copilot)* | DB 변경 없음. 빌드 시점 서버 컴포넌트는 새 관례라 §6.1 P2를 그대로 따름 |
| | 2 | Reviewer | Claude Opus (`High`) *(Fallback: GPT Codex)* | 공개 범위(개인 데이터 비노출)·CSP·정적 export 경계 확인 |
| | 3 | 사용자 | 116-8 | |

- 각 Run은 `main` 병합 전 격리 워크트리(`New-CollaborationRun.ps1`)를 씀. `R114`·`R115`는 Docker가 있는 PC 필요.
- 각 Run 마감 시 `docs/spec/SRS.md`·`SPEC.md`에 기능 요약을 추가함(closeout 범위).

## 8. 위험과 완화

| 위험 | 완화 |
| :--- | :--- |
| 백업 파일이 평문 재무 데이터임 | 카드에 "파일에 개인 재무 기록이 들어 있으니 공유에 주의" 안내. 푸시 자격 증명 제외(113-2) |
| 네트워크가 흔들릴 때 서비스 워커가 캐시 응답을 돌려줘 내보내기에 옛 데이터가 섞일 수 있음 | 오프라인 차단(E5). 완전 차단은 서비스 워커 변경이 필요하므로 이번 범위 밖, 문제 보고 시 후속 |
| TS와 SQL의 예산 귀속 규칙 불일치 | B4 공통 경계 사례를 Vitest·`TESTS.sql` 양쪽에 둠(114-1·114-2) |
| 가져온 행이 환불·결제 경로에서 원장을 바꿈 | I1 고정값 + 115-1·115-2 원장 불변 테스트. 결제 RPC는 `CONFIRMED` 행을 다시 처리하지 않음 |
| 일반 CSV 오해석(날짜 순서·금액 단위) | 지원 형식을 좁게 고정(I12), 해석 불가 행은 제외, 미리보기에서 합계 확인 |
| 공개 페이지가 빈 SPA 셸로 서빙됨 | P11 배포 후 `curl` 확인·`_redirects` 예외 |
| 공개 페이지 데이터가 다음 배포까지 낡음 | P5 열람 시 최신 조회. 자동 재빌드는 사용자 결정으로 제외, 필요 시 후속 |
| 빌드 시점 Supabase 장애로 배포 실패 | P9 의도된 동작. 재시도로 해결 |

## 9. 미결 질문 (기본값으로 진행 가능, 사용자 확인 권장)

1. 월간 리포트 알림(B9)을 기본 켬으로 둘지 — 기본값: 켬(설정에서 끌 수 있음).
2. 게임 예산 경고 단계(B8 80%·100%) — 기본값: 두 단계 고정, 사용자 지정 비율 없음.
3. 공개 페이지에 게임 아이콘 외 픽업 캐릭터 아이콘까지 그릴지 — 기본값: 이름만(이미지 요청 수·외부 호스트 노출 최소화).
4. 가져오기 기본 분류(I11) — 기본값: `게임`.
