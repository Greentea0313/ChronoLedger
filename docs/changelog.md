# 변경 이력

## 2026-11-27 (Run `r117-classification-axes-3` 병합 `065fe4a` — 캐릭터 분류 축 3개 지원)

- 게임별 캐릭터 템플릿의 분류 축 상한을 2개에서 3개로 확대함. DB 검증·관리자 템플릿 설정·정규화가 3축을 지원하고, 요청 폼의 세 번째 축 필수 선택·제출 회귀 테스트와 R13/R52 명세를 갱신함.
- 업그레이드·신규 격리 DB 및 앱 검증 통과함. 운영 DB 적용·배포·3축 실화면 확인은 사용자 Step 3에 남아 있음.

## 2026-11-26 (Run `r115-csv-import` 병합 `35f4461` — CSV 지출 내역 가져오기)

- 지출 페이지에서 ChronoLedger 지출 CSV 또는 일반 CSV를 미리보기·열 지정 후 확정 지출로 가져오고, 가져온 배치를 취소할 수 있음. 가져오기 행은 지갑 결제·자산 미차감·포인트 0으로 기록해 자산 원장에 영향이 없도록 함.
- `expenses.import_batch_id`와 `import_confirmed_expenses`·`delete_import_batch` RPC를 추가함. 운영 DB 적용 및 실제 파일 확인은 사용자 Step 3로 남아 있음.

## 2026-11-26 (Run `r114-game-budgets` 병합 `b161592` — 게임별 월 예산·리포트)

- 게임별 월 예산 설정과 예산 사용 현황을 추가함. 지출 페이지에서 선택한 달의 게임별 사용액·진행률을 확인하고, 80%·100% 도달 알림과 월간 과금 리포트를 받도록 함.
- DB 마이그레이션 `MIGRATION_R114_GAME_BUDGETS.sql`과 기준 `SCHEMA.sql`을 갱신함. 운영 DB 적용은 사용자 Step 3로 남아 있음.

## 2026-11-26 (`main` 직접 수정 `e0e3f84` — `R113` CSV 날짜순 정렬)

- **내보내기 CSV 정렬 (`src/lib/data-export.ts`)**: 지출 CSV는 '날짜'(`target_date`), 수익 CSV는 '날짜'(`income_date`) 오름차순으로 내보내고 같은 날짜는 생성시각·ID 순으로 둠. 이전에는 앱에 기록된 순서(생성시각)라 날짜가 뒤섞여 보였음. JSON 백업 순서는 그대로임.

## 2026-11-26 (Run `r113-data-export` 병합 `7f2e4d9` — `R113` 데이터 내보내기·백업)

- **설정 페이지 "데이터 내보내기" 카드 (`src/components/settings/data-export-card.tsx`, `src/lib/data-export.ts`, `src/lib/export-format.ts`)**: 본인 데이터 전체 JSON 백업(19개 본인 테이블, 참조 게임·일정 이름 `catalog`, 실패 항목 `skipped`)과 지출·수익 CSV(BOM·CRLF·따옴표·수식 방지)를 내려받음. 1,000행 단위로 나눠 조회하고 오프라인이면 조회 없이 안내함. 복원 기능은 없음.
- **다운로드 안정화 (`R113-REV-001`)**: 내려받기 클릭 직후가 아니라 10초 뒤에 Blob URL을 해제해 저장 시작 전에 주소가 사라지지 않게 함.

## 2026-11-26 (콘솔 오류·경고 정리)

- **커스텀 아이콘 400 오류 제거 (`src/lib/storage-upload.ts`)**: 사용자 폴더의 파일 목록을 한 번 조회해 실제로 있는 커스텀 아이콘만 내려받음. 없는 아이콘마다 생기던 Storage 400 요청이 사라지고 요청 수가 줄어듦. 목록 조회 실패나 1,000개 이상이면 기존처럼 바로 내려받음.
- **모바일 웹앱 메타 경고 제거 (`src/app/layout.tsx`)**: 표준 `mobile-web-app-capable` 태그를 함께 출력해 Chrome 경고를 없앰. iOS용 `apple-mobile-web-app-capable`은 유지함.

## 2026-11-26 (`R111` 보안 검토 상위 3건)

- **사용자 프로필 노출 축소 (`MIGRATION_USERS_PROFILE_PRIVACY.sql`)**: `public.users`를 본인 행만 조회하도록 바꾸고, 가입 기본 닉네임을 이메일 앞부분 대신 가입 입력 닉네임(최대 20자) 또는 빈 값으로 바꿈. 닉네임 64자·공백 금지 제약 추가, 설정 화면 닉네임 20자 제한. 운영 DB 적용 완료.
- **CSP·보안 헤더 (`scripts/inject-csp.mjs`, `public/_headers`)**: 빌드 후 각 페이지에 인라인 스크립트 해시 기반 CSP를 넣어 웹·데스크톱 모두 외부 스크립트·허용 외 연결을 차단함. HSTS·Permissions-Policy·`frame-ancestors 'none'` 추가.
- **CI (`.github/workflows/ci.yml`)**: PR·`main` push마다 타입 검사·lint·Vitest·빌드 실행.
- **분석 문서**: 나머지 보안·기능·구조·경쟁력 항목을 [`security-and-competitiveness-review.md`](security-and-competitiveness-review.md)에 정리함.

## 2026-11-26 (`R110` 후속 — 데스크톱 릴리스 수정·아이콘)

- **릴리스 빌드 수정 (`package.json`)**: `@tauri-apps/plugin-deep-link`를 `^2.6.3`으로 올려 Rust crate와 minor 버전을 맞춤(`tauri build` 중단 해소).
- **프로젝트 아이콘 적용 (`src-tauri/icons/`)**: Tauri 기본 아이콘을 프로젝트 아이콘(시계 `C`, 둥근 사각형 투명 모서리)으로 교체해 설치 파일·바로가기·작업표시줄에 반영함. 앱 버전 `0.2.2`.

## 2026-11-26 (Run `r110-desktop-auto-update` 병합 `a83503a` — `R110` 데스크톱 자동 업데이트)

- **자동 업데이트 플러그인·서명 (`src-tauri/`)**: `tauri-plugin-updater`·`tauri-plugin-process` 등록, capability는 `updater:default`·`process:allow-restart`만 추가함. NSIS 단일 번들·서명된 업데이트 산출물·공개 키·단일 endpoint(GitHub Releases `latest.json`)를 설정하고 앱 버전을 `0.2.0`으로 올림.
- **릴리스 워크플로 (`.github/workflows/desktop-release.yml`)**: `desktop-vX.Y.Z` 태그 push 때만 실행, 빌드 전 태그·`package.json`·`Cargo.toml` 버전 일치 검사, 개인 서명 키는 GitHub Secrets로만 주입함.
- **업데이트 배너 (`src/components/layout/desktop-update-banner.tsx`, `src/lib/desktop-updater.ts`)**: Tauri 데스크톱에서만 앱 시작 시 1회 확인해 `[지금 업데이트]`·`[나중에]` 배너를 표시함. 진행률 표시 후 자동 재시작, 실패 시 `[다시 시도]`, 오프라인이면 설치 차단함. 웹·PWA에서는 렌더링도 플러그인 import도 하지 않음.
- **미검증**: 서명 포함 빌드와 실제 Actions 실행·업데이트 동작은 사용자 Step 4에서 확인함.

## 2026-11-26 (Run `p4-followups-r107c-r109-r75` 병합 `ac752b6` — `R109-REV-003`·`R107C-REV-001·002`·`R75-REV-001` P4 후속)

- **관리자 미이전 아이콘 배지 즉시 갱신 (`src/app/admin/page.tsx`)**: 캐릭터 저장·삭제·템플릿 삭제 뒤 미이전 캐릭터 수를 다시 조회해 `[아이콘 Storage 일괄 이전 (N)]` 숫자가 새로고침 없이 맞음.
- **구독 결제수단 변경의 예정 지출 동기화 (`src/components/subscription/subscription-modal.tsx`)**: 구독 수정 저장 시 미결제 `PLANNED` 지출에도 `payment_method`·`point_platform`을 함께 반영함(`WALLET`이면 포인트 플랫폼 없음).
- **자동 확정 시각 상태 불변식 (`MIGRATION_R107C_REV002_AUTO_CONFIRMED_STATUS_CHECK.sql`)**: `expenses`에 `chk_expense_auto_confirmed_status`를 추가해 예정 행에 자동 확정 시각이 남지 않게 함(기존 위반 행이 있으면 `NOT VALID`로 추가, 운영 적용 완료).
- **R64 분류 아이콘 음성 테스트 방어선 분리 (`sql/tests/TESTS.sql`)**: 트리거 경로는 트리거 메시지만, 트리거를 끈 경로는 `axis_key` 형식·빈 옵션 CHECK 제약 이름을 정확히 고정함.

## 2026-11-26 (Run `r75-r64-tests-readme` 병합 `35d43b6` — `R75` R64 분류 아이콘 SQL 회귀 테스트 보강)

- **테스트 보강**: `sql/tests/TESTS.sql` R64·R80 블록에 분류 옵션 아이콘의 관리자 CRUD·`updated_at`, 일반 사용자·`user_metadata` 스푸핑·`anon` 쓰기 거부, 승인 게임 조회 범위, CHECK·검증 트리거 메시지 단위 검증, 순서 변경·옵션/축 제거 정리, 게임 삭제 CASCADE 시나리오를 추가함. 스키마·앱 동작 변경은 없음.
- **문서**: `sql/README.md`에 아이콘 수정이 upsert 기준임을 한 줄 추가함. 협업 산출물은 `artifacts/r75-r64-tests-readme/iteration-01/`(`review.json` P4 2건 비차단, `test.json` 로컬 `TESTS.sql` 54개 2회 통과)임.

## 2026-11-26 (Run `r107c-auto-confirm` 병합 `9268bf0` — `R107-C` 스토어 정기 구독 자동 확정 및 `INTERVAL_30` 환불 롤백 원자화)

- **스토어 정기 구독 자동 확정 (`MIGRATION_R107C_AUTO_CONFIRM.sql`, `SubscriptionModal`, `ExpensesPage`)**: `subscription_templates.auto_confirm`(기본 꺼짐, `GOOGLE_PLAY`·`GALAXY_STORE`만 허용하는 DB `CHECK` 및 모달 토글)을 추가함. 일 배치 `run_daily_subscription_automation()`이 회차 생성 직후 `auto_confirm_due_expenses`(예정일 결제·스냅샷 금액·스토어 적립률 적용·2일 보정 창·당일 생성분 및 `auto_confirm_blocked` 제외·행 단위 실패 격리·다음 회차 즉시 생성)를 실행하며, 결제 로직은 내부 `_process_expense_payment_core`로 일원화해 공개 `process_expense_payment` 시그니처와 동작을 그대로 유지함. 자동 확정된 지출에는 목록·상세 화면에 `'자동 확정'` 배지를 표시하고 매일 09:00 KST 일일 알림에서 `'오늘 자동 확정된 결제 N건'` 요약 알림(`EXPENSE_AUTO_CONFIRMED`, 금액·항목명 미포함)을 보냄.
- **`INTERVAL_30` 환불 롤백 원자화 및 중복 복구 안내 (`refund_expense_payment`, `restore_cancelled_expense`, `ExpenseDetailModal`)**: 활성 `INTERVAL_30` 템플릿의 최신 확정 결제를 환불하면 같은 트랜잭션 안에서 다음 `PLANNED` 회차 예정일을 충전일수만큼 되돌리고 `auto_confirm_blocked=true`로 표시해 재결제를 막음(`R107A-REV-002` 비활성 템플릿 생략 포함). 클라이언트의 별도 롤백 RPC 호출을 제거했고 구버전 클라이언트가 환불 후 재호출해도 이중 롤백되지 않음. 예정 취소 복구 시에도 `auto_confirm_blocked=true`를 설정하고 `INTERVAL_30` 중복 충돌(`23505`)을 사용자 안내 문구로 표시함.
- **운영 적용 안내 및 협업 산출물**: **운영 DB 수동 적용**(`MIGRATION_R107C_AUTO_CONFIRM.sql`, 선행 `R107-A`·`R107-B` 적용 상태) → 확인 쿼리 검증 → 앱 배포(`main` push) 순서로 적용 필요함(명세 `docs/r107-recurring-expense-automation-spec.md` §6). 산출물: `artifacts/r107c-auto-confirm/iteration-01/`(`review.json` P4 2건 비차단, `test.json` 로컬 DB 2경로·`TESTS.sql` 54개·`C-5` 2세션 병렬 3종 통과).

## 2026-11-25 (Run `p4-followups-r108-r109` 병합 `c52705c` — `R109-REV-001·002`·`R108-REV-001` P4 후속)

- **관리자 아이콘 일괄 이전 1,000행 초과 대응 (`src/app/admin/page.tsx`)**: `[아이콘 Storage 일괄 이전]`이 `game_characters`를 이름·id 순 1,000행 단위 `.range()`로 끝까지 읽어 전체 카탈로그를 이전함. 버튼 배지 숫자는 서버 `count` 쿼리(아이콘 있음·`game-assets` 주소 아님)로 선택 게임 밖 미이전 캐릭터까지 반영하고, 일괄 이전 뒤 다시 조회함.
- **푸시 암호 테스트 결합 제거 (`supabase/functions/send-notifications/index.ts`, `src/lib/web-push-crypto.test.ts`)**: 워커에 테스트용 `cryptoOverrides`(salt·임시 키쌍·페이로드)를 받는 선택 인자를 추가하고 RFC 8291 벡터 테스트의 전역 스파이를 없앰. 운영 요청 경로(`Deno.serve`)는 인자를 넘기지 않아 동작 불변(Edge Function 재배포 선택).

## 2026-11-25 (Run `r109-icon-storage-migration` 병합 `7f54ef1` — `R109` 공용 게임·캐릭터 아이콘 Storage 이전)

- **공개 읽기 `game-assets` 버킷 및 관리자 RLS·승인 RPC (`MIGRATION_R109_GAME_ASSETS_STORAGE.sql`)**: 공용 게임·캐릭터 기본 아이콘용 공개 버킷 `game-assets`(102,400B 상한, `image/webp`)와 `storage.objects` 정책 4종(`anon`·`authenticated` 읽기, 관리자 전용 쓰기 및 `games/{sha256}.webp`·`characters/{game_id}/{sha256}.webp` 경로 강제)을 추가함. 개인 커스텀 아이콘 버킷 `user-icons`의 비공개 정책은 그대로 유지함. `approve_schedule_request(UUID, JSONB DEFAULT NULL)`에 픽업 신규 캐릭터 제안 아이콘 오버라이드(`p_pickup_icon_overrides`)를 추가하고 구 1인자 오버로드를 제거함.
- **공용 업로드 모듈 및 관리자 등록·승인·일괄 이전 (`src/lib/game-asset-storage.ts`, `/admin`, `/admin/requests`)**: 이미지를 256×256 WebP(≤100KB)로 정규화해 SHA-256 해시 파일명과 1년 불변 캐시(`cacheControl: "31536000"`)로 업로드하며 이미 이전된 URL과 로컬 정적 경로(`/assets/games/`)는 재업로드를 건너뜀. 관리자 게임·캐릭터 등록/수정, 요청 승인 대기열(게임·캐릭터·일정 픽업 제안), `/admin` `[아이콘 Storage 일괄 이전]` 버튼(기존 R30 Data URL 역변환 대체, 게임+캐릭터 멱등 일괄 이전·실패 원본 보존)을 모두 Storage 공개 URL 기반으로 전환함.
- **서비스 워커 이미지 캐시 (`public/sw.js`)**: 동일 Supabase 출처의 `/storage/v1/object/public/game-assets/` `GET` 요청만 `chronoledger-game-assets-v1` 캐시에 Cache-First(상한 500개 FIFO 정리)로 보관해 재방문·오프라인 표시를 지원함(비공개 `user-icons` 경로 미개입).
- **운영 적용 안내 및 협업 산출물**: **운영 DB 수동 적용**(`MIGRATION_R109_GAME_ASSETS_STORAGE.sql`) → 앱 배포(`main` push) → `/admin` `[아이콘 Storage 일괄 이전]` 실행 순서로 적용 필요함(명세 `docs/r109-icon-storage-migration-spec.md` §4). 산출물: `artifacts/r109-icon-storage-migration/iteration-01/`(`review.json` P4 2건 비차단, `test.json` 로컬 DB 2경로·`TESTS.sql` 51개 통과).

## 2026-11-25 (`t4` Rust 빌드·`Cargo.lock` 갱신 병합 `2829bb7`)

- 데스크톱 앱의 단일 실행(`tauri-plugin-single-instance`) 의존성을 `src-tauri/Cargo.lock`에 반영함. Windows 릴리스 빌드(`app.exe`)가 오류 없이 만들어지는 것을 확인했고 `package.json`·`Cargo.toml` 수정은 필요 없었음. 사용자 화면·DB 변경 없음. 실기기 로그인·단일 창 동작 확인은 남아 있음.

## 2026-11-25 (Run `t1-t4-desktop-and-followups` 병합 `5e63007` — 데스크톱 PKCE 로그인·딥링크, `R101-REV-001`, `R106-REV-001·002`)

- **데스크톱 로그인 PKCE 통일**: 웹과 Windows 데스크톱(Tauri) 모두 PKCE(`code` 교환) 한 가지 방식으로 Google 로그인함. 데스크톱의 해시 토큰(`#access_token`) 경로를 없애고, 외부 브라우저로 여는 인증 주소는 설정된 Supabase 주소(`https:`)일 때만 엶. 플랫폼 차이는 새 `src/lib/auth-adapter.ts`가 맡음.
- **딥링크·단일 인스턴스**: `chronoledger://auth/callback`으로 돌아오면 실행 중인 앱 창이 앞으로 오고 로그인이 이어짐(`tauri-plugin-single-instance`). 앱이 꺼진 상태에서 링크로 열려도 처리함. 로그인 취소·오류는 로그인 화면 안내로 보여줌.
- **로그아웃 복귀**: 상단바 `[로그아웃]` 후 로그인 화면(`/auth`)으로 이동함. 데스크톱에서는 서비스 워커를 등록하지 않음.
- **예산 비교 보정 (`R101-REV-001`)**: 이번 달 회차를 취소·환불한 월간 구독은 이번 달 고정 구독 예정액에 다시 잡히지 않음(다음 달은 그대로 예측).
- **알림함 전체 삭제 확인 (`R106-REV-001`)**: `[전체 삭제]`를 누르면 `[삭제 확인]`/`[취소]`를 한 번 더 거침.
- **푸시 완료 처리 보정 (`R106-REV-002`)**: 푸시 발송 중 사용자가 알림을 지워도 `complete_push_notification_delivery`가 오류 없이 끝나고 만료 구독 정리·성공 시각 갱신은 그대로 함. **운영 DB 수동 적용**(`MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`) 필요함.
- **배포 전 사용자 설정**: Supabase Redirect URLs에 `chronoledger://auth/callback` 등록 필요함(미등록 시 데스크톱 Google 로그인 실패). Rust 빌드(`cargo check`·`tauri build`)와 Windows 실기기 확인은 아직 안 함.
- **협업 산출물**: `artifacts/t1-t4-desktop-and-followups/iteration-01/`(`review.json` P4 3건 비차단, `test.json` 로컬 DB 2경로·`TESTS.sql` 49개 통과, Rust 검사 `skipped`).

## 2026-11-25 (Run `r107b-due-today-notification` 병합 `a84c6de` — `R107-B` 오늘 결제 예정 알림)

- **`EXPENSE_DUE_TODAY` 요약 알림**: 매일 오전 9시(KST) 일일 알림 배치에서 오늘이 예정일인 `PLANNED` 지출이 있는 사용자에게 `'오늘 결제 예정 N건'` 알림을 사용자·일자당 1건 생성함. 금액·항목명·메모는 알림에 표시하지 않으며, 탈퇴 대기·옵트아웃 사용자는 제외함. 기존 `EXPENSE_D1`(전날 예고)은 그대로 유지함.
- **알림 설정**: `notification_settings.expense_due_today`(기본 켜짐) 컬럼과 설정 화면 `'오늘 결제 예정'` 토글을 추가함. DB 미적용 환경에서는 토글만 숨기고 오류 없이 동작함.
- **협업 산출물**: `artifacts/r107b-due-today-notification/iteration-01/`(`review.json` 발견 0건, `test.json` 로컬 DB 2경로·`TESTS.sql` 49개 통과). **운영 DB 수동 적용**(`MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql`) 필요함.

## 2026-11-25 (Run `r107a-server-subscription-generation` 병합 `7aa2984` — `R107-A` 서버 측 정기 지출 생성 통일)

- **서버 측 회차 생성 단일화 및 일 배치(`pg_cron`)**: 정기 지출(`MONTHLY_DAY`·`INTERVAL_30`·`VERSION_PASS`) 생성 규칙을 SQL 내부 함수 `generate_subscription_expenses_core`로 일원화하고, 매일 KST 08:50(`50 23 * * *` UTC, 일일 알림 10분 전)에 `run_daily_subscription_automation`을 실행하는 `chronoledger-subscription-daily` 잡을 등록해 앱을 열지 않아도 예정 회차가 생성되도록 함.
- **중복 원천 차단 및 클라이언트 RPC 전환**: `INTERVAL_30` 템플릿의 단일 `PLANNED` 회차를 DB 부분 유니크 인덱스(`idx_expenses_interval_single_planned`)와 템플릿 `FOR UPDATE` 잠금으로 보장하고, 클라이언트 `subscription-sync.ts`의 3종 함수(`ensureMonthlySubscriptionExpenses`·`createNextIntervalSubscriptionExpense`·`rollbackIntervalSubscriptionExpense`)를 서버 RPC(`ensure_subscription_expenses`·`advance_interval_subscription`·`rollback_interval_subscription`) 호출 + 미적용 DB(`PGRST202`·`42883`) Legacy 폴백으로 전환함.
- **협업 산출물**: `artifacts/r107a-server-subscription-generation/iteration-01/`(`review.json` P4 2건 비차단, `test.json` 로컬 DB 2경로·48개 블록·2세션 동시성 통과). Step 4 문서 마감 완료, 운영 DB 수동 적용(`MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`) 대기.

## 2026-11-25 (페이지 로딩 지연 완화: 서비스 워커 응답 대기 제거·캐릭터 페이지 병렬 로딩)

- 서비스 워커가 Supabase 읽기 응답을 오프라인용 캐시에 쓰는 동안 화면에 응답을 늦게 넘기던 것을 백그라운드 저장으로 바꿈. 로그인 후 모든 페이지의 데이터 조회에 적용되며 오프라인 동작은 그대로임.
- 캐릭터 페이지는 구독 게임 목록이 오면 선택 게임의 캐릭터 조회를 개수 조회와 병렬로 시작하고, 커스텀 게임 아이콘 다운로드는 첫 화면 표시를 막지 않게 함. 응답 크기는 그대로이며 근본 방법(아이콘 Storage 이전)은 검토 문서 `docs/icon-storage-migration-review.md`로만 남김.

## 2026-11-25 (푸시 알림 큰 아이콘 투명 배경 교체)

- 안드로이드 알림창을 내렸을 때 우측에 검은 사각형으로 보이던 알림 큰 이미지를, 배경이 없는 투명 심볼 `public/icons/push-icon-192.png`로 바꿈. 서비스 워커 `push` 핸들러의 `icon`만 교체했고 앱 아이콘·배지는 그대로임. 설치된 앱이 새 이미지를 받도록 셸 캐시를 `chronoledger-shell-v8`로 올림.

## 2026-11-25 (`r108` P4 선택 후속 3건 병합 `32ea55d`)

- 데스크톱 알림이 알림 권한 확인 중 일시 오류가 나도 다음 확인 때 다시 시도하도록 보완함(그 묶음의 OS 토스트가 사라지던 문제). 알림 설정 타입의 `Update.user_id`를 선택값으로 바로잡음. 웹 푸시 암호화가 표준(RFC 8291 부록 A) 예시 값과 바이트 단위로 일치함을 확인하는 테스트를 추가함. 사용자 화면·DB 변경 없음.

## 2026-11-25 (R107 정기·반복 지출 자동화 명세, 문서 전용)

- `docs/r107-recurring-expense-automation-spec.md`를 추가해 서버 측 정기 지출 생성 통일(`pg_cron`·`INTERVAL_30` 부분 유니크 인덱스·SQL 단일 구현), "오늘 결제 예정 N건" 알림, 템플릿별 자동 확정(스토어 결제수단 한정·예정일 결제일 기준·환불 롤백 원자화)의 결정 `D1`~`D15`, 단계별 인수 기준, 운영 SQL 적용 순서, 모델 배정·Run 3분할안을 확정함. `src/**`·`sql/**` 변경 없음. `docs/handoff.md`에 접수 기록·Run 등록 대기 행, `docs/to-do.md`에 `R107` 항목 추가함.

## 2026-11-25 (Antigravity 공용 쿼터 풀 반영 및 한도 소진 대체 체인 보정)

- `Gemini 4 Hydrogen`·`Neon`·`Carbon`이 Antigravity의 `Gemini Models` 주간·5시간 공용 한도를 공유하는 구조를 `.agents/rules/collaboration.md`·`docs/collaboration-guide.md`에 반영하고, `Hydrogen (Medium)` 기본 운용 사유를 공용 한도 절약 및 응답 속도 최적화로 정정함.
- 난이도 승격(`Hydrogen` $\to$ `Neon` / `Carbon`)과 한도 소진 인계(Cross-Pool Quota Fallback)를 분리해, 공용 한도 소진 시 같은 쿼터 묶음을 건너뛰고 다른 한도 풀(`Claude`·`GPT Codex`·`GitHub Copilot`)로 넘기도록 대체 표와 `handoff` Skill을 보정함. 도구 UI의 기본 추론 수준(`Medium`)을 고려해 `High`/`XHigh` 모델 전환 안내 시 `'도구에서 High 선택'`을 함께 표기하도록 명시함.

## 2026-11-25 (협업 규칙 개정 2차 검토 보완)

- `collaboration.md`·`collaboration-guide.md`에 Step별 추론 수준 예외 기준(`Low`·`XHigh` 전환 조건, 금액·SQL Step 하향 금지, 승격 우선)과 서브에이전트 위임 금지 범위를 추가하고, Orchestrator Skill의 큐 행 표기를 `Primary Model (Level)`로 명시함.

## 2026-11-25 (협업 규칙 개정: `Gemini 4 Argon` $\to$ `Gemini 4 Carbon` 인계 및 `Gemini 3.8 Flash` 역할 통합)

- 11월 30일 `Gemini 4 Argon`·`Gemini 3.8 Flash` 서비스 종료에 대비해 Tier-3 수석 아키텍트(`Chief Architect & Final Gatekeeper`, `src/**` 직접 수정 금지, `📐 SPEC_NEEDED` 전담)를 **`Gemini 4 Carbon`**(`Orchestrator (Carbon)`)으로 인계하고, `/swarm` 병렬 에이전트 모드는 자율 시작을 금지하되 필요한 경우 사용자에게 사전 요청 후 승낙 시에만 허용하도록 `.agents/rules/collaboration.md` §3.2에 명시함.
- 모델 역할 매트릭스에서 `Gemini 3.8 Flash` 행을 제거해 **6대 모델(`Hydrogen`·`Neon`·`Carbon`·`GPT Codex`·`Claude`·`GitHub Copilot`)**로 통합하고 경량 UI/문서/`GitHub Copilot` 1순위 대체 역할을 `Gemini 4 Hydrogen`으로 일원화함(세션 내 경량 서브에이전트 위임은 `Model: "flash_lite"` 또는 `"inherit"` 사용).

## 2026-11-25 (주간 문서 감사 자동 이관·사용자 알림)

- `chronoledger-weekly-doc-audit` Skill이 아카이브 이관과 보고서 커밋까지 수행하도록 바꾸고(그 밖의 발견 사항은 보고만 함), 무인 실행 결과를 `docs/handoff.md` 상단 `📣 사용자 알림 대기` 절에 남기게 함.
- handoff Skill에 알림 전달 후 해당 줄을 지우고 커밋하는 규칙을 추가하고, `CLAUDE.md` Skill 표 설명을 갱신함.

## 2026-11-25 (Run `r106-notification-delete` 완료 — `main` 병합 `0ddc229`)

- **알림 직접 삭제(`R106`)**: 상단 벨 알림함에 항목별 삭제 버튼(휴지통 아이콘)과 헤더 `'전체 삭제'` 버튼을 추가함. 오프라인이면 삭제하지 않고 안내하며, 실패하면 목록을 그대로 두고 오류를 표시함.
- **DB**: `public.delete_notifications(p_notification_ids UUID[] DEFAULT NULL)` `SECURITY DEFINER` RPC 추가(본인 알림만 선택/전체 하드 삭제, 비로그인·계정 삭제 대기 사용자 차단, 테이블 직접 `DELETE` 권한은 계속 막음). 신규 `MIGRATION_R106_NOTIFICATION_DELETE.sql`, `SCHEMA.sql`·`sql/README.md`·`TESTS.sql`·`database.types.ts` 동기화.
- **협업 산출물**: `artifacts/r106-notification-delete/iteration-01/`. `r96-rev07` 기록을 보관 문서로 이동함.

## 2026-11-25 (`main` 직접 수정 — 이번 주 관심 일정 필터 초기화)

- **대시보드 상단바 연동**: `[이번 주 관심 일정]` 카드 클릭 시 주차별 리스트 하단 필터를 `(전체, 전체, 관심 일정만)`으로 함께 설정하도록 `WeeklyScheduleList`에 선택적 제어 props를 추가하고 `DashboardPage` 및 테스트를 갱신함.

## 2026-11-25 (`main` 직접 수정 — 안드로이드 푸시 배지)

- **푸시 상태 표시줄 아이콘**: 안드로이드가 배지의 투명도만 써서 배경이 꽉 찬 `icon-192.png`가 흰 사각형으로 보이던 문제를 고침. 앱 아이콘에서 배경을 빼고 글자 모양(노란 C·파란 시계바늘·초록 점)만 남긴 투명 PNG `public/icons/badge-96.png`를 추가하고 `public/sw.js`의 `badge`로 씀. `SHELL_CACHE`를 `chronoledger-shell-v7`로 올리고 사전 캐시에 추가함.

## 2026-11-24 (Run `r96-rev07-webhook-config` 완료 — `main` 병합 `7445447`)

- **웹훅 설정 저장소 교체(`R96-REV-07`)**: 호스팅 Supabase에서 `ALTER DATABASE ... SET app.settings.*`가 `42501`로 막히는 문제를 비공개 단일 행 테이블 `public.push_webhook_config`(RLS 무정책, `PUBLIC`/`anon`/`authenticated`/`service_role` 권한 전량 회수)와 SQL Editor 전용 등록 함수 `public.set_push_webhook_config(url, secret DEFAULT NULL)`로 대체함.
- **조회 순서**: `invoke_send_notifications_webhook()`이 `push_webhook_config` → `vault.decrypted_secrets`(예외 격리 동적 조회) → `current_setting('app.settings.*')` 순으로 URL·시크릿을 찾음.
- **파일**: 신규 `MIGRATION_R96_WEBHOOK_CONFIG.sql`(이미 R96 적용한 운영 DB용), `MIGRATION_R96_WEB_PUSH.sql`·`SCHEMA.sql`·`sql/README.md`·`TESTS.sql` 동기화. 협업 산출물 `artifacts/r96-rev07-webhook-config/iteration-01/`. `r105` 기록을 보관 문서로 이동함.

## 2026-11-24 (Run `r105-dashboard-summary-bar` 완료 — `main` 병합 `fe5bf77`)

- **대시보드 상태바 개편(`R105`)**: 홈 상단 `dashboard-summary`를 4칸 인터랙티브 카드(① `오늘 일정` 클릭 시 오늘 선택·모바일 드로어 열기, ② `이번 주 관심 일정` 클릭 시 주차별 리스트·`관심 일정만` 전환, ③ `이번 주 예정 지출` `/dashboard/expenses` 링크, ④ `이번 달 예산 잔여`·소진율 `%`·경과율 마커 페이스 바 및 `/dashboard/expenses` 링크)로 개편함.

## 2026-11-24 (Run `r96-web-push` 병합 `18d5f0c`, Run `r102-expense-presets` 병합 `9ff2ae6`)

- **R96 Web Push**: `push_subscriptions`·구독/해제 RPC·워커 점유(`push_claimed_at`)·과거 알림 미발송·`pg_net` 웹훅·5분 재시도 `pg_cron` 잡, Edge Function `send-notifications`(Web Crypto RFC 8291/8292), SW `push` 처리, 로그아웃 시 구독 해제, 설정 화면 푸시 카드. 배포 절차는 `docs/push-notification-research.md` §11.5.
- **R102 과금 프리셋**: `user_expense_presets`(계정당 20개 상한 트리거, 본인 행 RLS, 탈퇴 정리), `ExpenseModal` 상단 칩 원클릭 적용·`[프리셋 저장]`·삭제.
- **병행 Run 충돌 정리**: R102 마이그레이션의 탈퇴 정리 함수에 R96 `push_subscriptions` 삭제를 포함하고, R96 → R102 적용 순서를 `sql/README.md`에 적음.
- **협업 산출물**: `artifacts/r96-web-push/iteration-02/`, `artifacts/r102-expense-presets/iteration-01·02/`. r96·r101-r103 기록과 Chief Architect 구체화 기록을 보관 문서로 이동함.

## 2026-11-24 (`r101`·`r103` 병합 `c942e1e` — 2개월 예산 비교·단축키·빠른 시작)

- `/dashboard/expenses` 상단에 `당월 · 익월 예산 비교` 카드를 추가함. 월 예산, 확정 지출, 고정 구독 예정(아직 생성되지 않은 활성 월간 구독 포함), 일반 예정 지출, 예상 총 지출·잔여 예산과 `예산 초과` 표시를 두 달 나란히 보여줌. 월 예산이 없으면 기본 예산을 쓰고, 예산 조회가 실패해도 지출 목록은 그대로 뜸.
- `/dashboard`에 접이식 `빠른 시작 · 단축키` 안내(처음에만 펼침, 닫으면 기억)와 데스크톱 단축키 `[`·`]`(이전/다음 달), `T`(오늘), `V`(캘린더/주차 전환), `N`(새 지출), `?`(안내 펼침/접기)를 추가함. 입력 중이거나 모달·드로어가 열려 있으면 동작하지 않음. DB 변경 없음.

## 2026-11-24 (Run `r39-daily-notifications` 완료 — `main` 병합 `9ae05f9`)

- **DB**: `public.notification_settings`(본인 행 RLS·삭제 대기 차단·탈퇴 정리 연결), `enqueue_daily_notifications()`(`FAVORITE_START`·`FAVORITE_END_D1`·`EXPENSE_D1`, 금액·메모 미포함, 중복 방지), `pg_cron` 잡 `chronoledger-daily-notifications`(KST 09:00) 추가 (`MIGRATION_R39_DAILY_NOTIFICATIONS.sql`).
- **UI**: 설정 화면 `알림 설정` 카드(일일 알림 3종 토글, 토글한 컬럼만 `upsert`, 오프라인·미적용 DB 폴백).
- **협업 산출물**: `artifacts/r39-daily-notifications/iteration-01/review.json`(P4 1건)·`test.json`(passed). `r97-tauri-notifications` 기록을 보관 문서로 이동함.

## 2026-11-23 (`r97` Tauri 데스크톱 알림 보완 병합 `d350267`)

- 데스크톱(Tauri) OS 알림이 빈 알림함으로 시작해도 직후 도착한 첫 알림을 놓치지 않도록 최초 시드를 기록함.
- 마운트·창 포커스·폴링이 동시에 호출돼도 사용자별 직렬 처리로 같은 알림이 OS 토스트로 중복 발송되지 않게 함. 제목이 비면 `ChronoLedger`를 쓰고 본문이 비면 생략함. DB 변경 없음. 실기기 토스트 육안 확인은 남아 있음.

## 2026-11-23 (`src/app/favicon.ico`·`public/favicon.ico` 투명 배경 프로젝트 아이콘 적용)

- `src/app/favicon.ico`와 `public/favicon.ico`를 어두운 사각형 배경·테두리를 제거한 투명 배경 ChronoLedger 심볼 아이콘(RGBA ICO, `16×16`·`32×32`·`48×48`·`256×256`)으로 교체함.

## 2026-11-23 (`R97` Windows Tauri 데스크톱 OS 네이티브 알림 연동)

- `@tauri-apps/plugin-notification`(`tauri-plugin-notification` v2)을 설치·등록(`src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`)함.
- `src/lib/tauri-notifications.ts` 및 `NotificationBell` 연동을 통해 Tauri 데스크톱 앱 실행 중 새로 도착한 미읽음 알림만 중복·초기 폭주 없이 OS 네이티브 알림으로 표시하도록 구현함(비Tauri 웹 환경에서는 no-op).
- `/dashboard/characters` 게스트 모드 진입 시 무한 스켈레톤 로딩이 표시되던 결함을 수정하고, 로그인 안내 화면(`EmptyState` + `로그인하러 가기`)이 표시되도록 개선함.

## 2026-11-23 (`R100` 캐릭터 아바타 크기 조절 & 모바일 알림 팝오버 정렬)

- `/dashboard/characters` 보유 캐릭터 목록(`CharacterRoster`)에 아바타 크기 3단계 프리셋(`작게` 56px·`보통` 80px·`크게` 96px, `localStorage` 저장)을 추가함.
- 모바일 상단바 알림 팝오버(`NotificationBell`)가 뷰포트 좌측을 벗어나지 않도록 `fixed inset-x-4` 반응형 배치로 수정함(`b5317d3`).
- `docs/to-do.md`에 기타 건의 스크린샷 첨부 기능을 후속 과제 `R99`로 분리 등록함.

## 2026-11-21 (Run `r85-schedule-times` 완료 — `main` 병합 `6204346`)

- **DB**: `games.daily_reset_time`, `game_schedules`·`schedule_requests`의 `start_at`·`end_at`·예상 플래그와 CHECK 11종 추가, `approve_schedule_request` 시각 복사 (`MIGRATION_R85_SCHEDULE_TIMES.sql`).
- **로직·UI**: `src/lib/schedule-time.ts` 신규(KST 기간 문자열·진행 상태·종료 라벨·미적용 DB 폴백). 관리자 일정·게임 정보·사용자 요청 폼에 선택 시각 입력, 주차별 리스트·선택일 상세·게임별 일정 모달·요청 화면에 시각 표시와 종료 시각 기준 판정 반영.
- **협업 산출물**: `artifacts/r85-schedule-times/iteration-01/review.json`(clean)·`test.json`(passed). `r98-character-icon-remove` 기록을 보관 문서로 이동함.

## 2026-11-21 (Run `r98-character-icon-remove` 완료 — `main` 병합 `56c26ce`)

- **캐릭터 아바타 이미지 제거 기능(`R98`)**: 관리자 캐릭터 추가/수정 모달, 사용자 캐릭터 등록 요청 모달, 관리자 캐릭터 요청 대기열에 `이미지 제거` 버튼을 추가해 등록·교체 이미지를 비우고(`default_icon_url: null`) 기본 아바타 상태로 되돌릴 수 있게 함.
- **용어 통일**: 관리자 화면·필터·요청 대기열에 남아 있던 `'레어도'` 표기를 `'희귀도'`로 일괄 통일함(`bc9e026`).
## 2026-11-21 (협업 파이프라인: Chief Architect 구체화 규칙)

- 범위를 넘는 요구사항은 Chief Architect(Gemini 4 Argon, 대체 Claude Opus·Gemini 4 Neon)만 구체화하도록 규칙을 추가함. 다른 모델은 `📐 SPEC_NEEDED`로 넘기고, 구체화 후 Run 등록은 Gemini 4 Hydrogen이 이어받음. `인수인계 문서를 확인해` 처리 순서는 `⚠️ HANDOVER_NEEDED` → `📐 SPEC_NEEDED` → `▶ READY`임.


## 2026-11-19 (Run `r84-feedback-and-inbox` 완료 — `main` 병합 `660c3fc`)

- **기타 건의 창구(`R84`)**: 통합 요청 모달에 `기타 건의`(기능 제안·오류 신고·기타, 제목 100자·내용 2,000자) 제출과 내 요청 내역 표시를 추가하고, 내 요청 현황 카드에 `건의` 필터·관리자 답변 표시를 연동함.
- **관리자 건의 대기열**: `/admin/requests`에 `건의` 탭을 추가해 `answer_feedback_request` RPC로 답변 등록(`ANSWERED`)·종료 처리(`CLOSED`)를 원자적으로 처리함(직접 쓰기 폴백 없음).
- **앱 내 알림함**: 로그인 사용자 상단바에 알림 벨(`NotificationBell`)·미읽음 배지(10건 이상 `9+`)·최근 30건 목록·KST 시각·개별/전체 읽음(`mark_notifications_read`)·상대 경로 이동을 추가함.
- **DB·RLS·자동 정리**: `public.feedback_requests`·`public.notifications` 테이블, 엄격한 RLS·계정 삭제 대기 차단·탈퇴 정리, 30일 보관 `pg_cron`(`chronoledger-notifications-purge`), 기존 6개 요청 승인/반려 RPC 및 건의 답변 RPC의 원자적 알림 생성을 반영함.
- **운영 반영**: 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용 및 `sql/README.md` B표 R84 확인 쿼리 검증 완료(사용자, 2026-11-19).

## 2026-11-19 (Run `r84-feedback-and-inbox` iteration-03 — `71824a2`, 미병합)

- SQL 스모크 테스트 R84 블록의 테스트 코드 4건을 고쳐 로컬 DB에서 전체 통과함. 마이그레이션·화면 코드는 그대로임.

## 2026-11-19 (Run `r84-feedback-and-inbox` Step 3 iteration-02 리뷰)

- R84 마이그레이션을 로컬 DB에 2회 적용해 문제없음을 확인함. SQL 스모크 테스트의 R84 블록에서 테스트 코드 문제 4건을 찾아 수정 단계(iteration-03)로 돌려보냄. 병합은 보류함.


## 2026-11-19 (AI 협업 파이프라인 6대 개선안 반영)

- Reviewer가 `run.json` `target_sha`를 아티팩트 커밋에서 갱신하고, 워크트리 Run도 `Target..HEAD` 범위 검사를 하도록 Reviewer·Orchestrator Skill과 `New-CollaborationRun.ps1` 안내 문구를 정리함.
- Maker·SQL Skill·Copilot 지침의 인계 규칙을 Claude(`Sonnet`→`Opus`)·Gemini(`Hydrogen`→`Neon`/`Argon`) 티어 체계와 일치시킴.
- handoff Skill에 다중 PC 워크트리 복원 절차와 Docker 미설치/엔진 꺼짐 분기를 추가하고, `sql/` 변경 Run은 로컬 DB 통과 기록 없이는 `main`에 병합하지 않는 게이트를 둠.
- Orchestrator·docs-closeout Skill에 수용 기준 간결화(설계 문서 포인터 + 8줄)와 서브에이전트 위임 허용·금지 범위를 추가함. 상세: `docs/pipeline-collaboration-review.md` §4.

## 2026-11-19 (UI·코드 후속 개선 5건: `R95`·`R87`·`R75②③`·`13.2-F2`·`13.2-F3`)

- **`R95`**: 수익 내역 삭제(`delete_income`) 실패 시 RPC 오류 사유(`error.message`)를 다이얼로그에 함께 표시함.
- **`R87`**: `ImageSourceDialog`에서 오프라인 시 URL `blur`/`Enter` 변환을 건너뛰고, 관리자 분류 아이콘 모달 닫기 시 `iconError`를 초기화하며, 이미지 등록 모달 설명·안내 문구 어투(`~합니다`)를 통일함.
- **`R75` ②·③**: 관리자 분류 아이콘 삭제 시 `.delete().select("axis_key")`로 0행이면 실패 오류를 표시하고, 템플릿 저장·삭제 후 아이콘 재조회를 취소 가능한 effect(`iconRefreshTick`)로 통합함.
- **`13.2-F2`·`F3`**: `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §2.4·§7.2의 `signed URL` 표현을 `Object URL`로 보정하고, `vitest.config.ts` exclude에 `.claude/worktrees/**`를 추가함.

## 2026-11-19 (`R85` 일정 시간 단위 상세 설계)

- 일정 시각 컬럼·일관성 제약·표시/종료 판정 규칙·입력 폼·게임별 서버 초기화 시각 검토를 담은 `docs/r85-schedule-time-design.md`를 추가함.

## 2026-11-19 (Gemini 4 다단계 운용 및 `Hydrogen` $\to$ `Neon` / `Argon` 승격 기준 수립)

- Gemini 계열 기본 모델을 **`Gemini 4 Hydrogen`**(단기 리셋 쿼터, 기본 Maker·Orchestrator·표준 Reviewer)으로 전환하고, **`Gemini 4 Neon`**(1차 승격: 복합 상태/생명주기·코어 수식/SQL/RPC Maker 및 다단계 Run Orchestrator; Orchestrator 호출 시 `src/**` 직접 수정 제한)과 **`Gemini 4 Argon`**(2차 최상위 승격: 주간 쿼터 보호, 오픈 아키텍처/명세·보안/원장 감사·Run 통합 리뷰 전용, `src/**` 직접 구현 금지) 승격 조건을 `.agents/rules/collaboration.md`, `docs/collaboration-guide.md`, `CLAUDE.md`, `chronoledger-orchestrator` Skill에 반영함.

## 2026-11-18 (`R89` 푸시 알림 설계 조사)

- 플랫폼별 알림 지원 범위, 서버 없는 발송 구조, 알림 DB·RLS 초안, 단계별 구현 Run 분할안을 담은 `docs/push-notification-research.md`를 추가함.

## 2026-11-18 (`skill-support-check` 마감)

- Antigravity가 `.agents/skills/`를 바로 읽는 것을 확인해 별도 사본 없이 운용함. Antigravity 상시 규칙에 `agent_rules.md`·`document_location.md`가 들어가도록 frontmatter를 추가함.

## 2026-11-18 (지침 토큰 절감)

- 운영 문서 4종의 끝난 Run·2026-11-10 이전 기록을 `docs/archive/*-archive.md`로 옮김.
- 지침을 Skill 6개(`handoff`·`chronoledger-orchestrator`·`-maker`·`-reviewer`·`-sql-migration`·`-docs-closeout`)로 나누고 Claude용 `.claude/skills/` 사본과 `scripts/collaboration/Sync-Skills.ps1`을 추가함. 6대 모델 표·Sonnet/Opus 기준은 `collaboration.md`에만 둠.
- 단계 마감 문서 규칙을 바꿈: 상세 기록은 handoff에만, progress는 짧게, changelog는 `main` 반영 때만 씀.
- `CLAUDE.md`·`AGENTS.md`의 검증 스크립트 사용법을 `--artifact`·`--schema` 형식으로 고침.
## 2026-11-16 (R93 마이그레이션 운영 적용)

- 운영 DB에 `MIGRATION_R93_INCOME_HISTORY.sql` 적용·확인 쿼리 검증 완료함(사용자). 수익 내역 기능이 운영에서 활성화됨.

## 2026-11-16 (Run `r93-income-history-db-and-ui` 완료 — `main` 병합 `a1f17e0`)

- 수익을 등록하면 수익 내역으로 남고 총 자산도 함께 늘어남. 지출 화면에 `수익 내역` 탭을 추가해 등록한 수익을 보고 삭제(삭제 시 총 자산도 함께 줄어듦)할 수 있음.
- 운영 DB에는 `MIGRATION_R93_INCOME_HISTORY.sql` 적용이 필요함. 적용 전에는 기존처럼 총 자산만 늘어남.


## 2026-11-16 (게스트 모드 `/dashboard/games` 게임 카드 레이아웃·아이콘 크기 수정)

- `src/app/dashboard/games/page.tsx` 게스트 모드 `전체 게임` 카드를 로그인 카드와 동일한 구조(`w-14 h-14` 고정 크기 아이콘 래퍼, 상단 게임명, 하단 풀폭 `일정 보기` 버튼)로 수정하고 메모·아이콘 변경·구독 해제·순서 이동 버튼은 제외함.
- `src/app/dashboard/games/page.test.tsx` 게스트 카드 레이아웃 및 로그인 전용 버튼 미노출 검증을 보강함.

## 2026-11-16 (`r93` Step 2: 수익 내역 UI·삭제 연동 `7c8883e`)

- 수익 추가 모달이 `record_income` RPC로 수익 행과 총 자산 증액을 한 번에 처리함. 함수가 없는 DB(마이그레이션 미적용)에서만 기존 자산 직접 갱신 경로로 폴백함.
- 소비 페이지 전체 지출 내역 카드에 `[지출 내역 | 수익 내역]` 전환을 추가함. 수익 내역은 목록(표·모바일 카드)과 10건 단위 페이지 이동, 확인 후 삭제(`delete_income`, 총 자산 차감)를 지원함. 병합 전(Step 3 리뷰 대기)임.

## 2026-11-16 (`r93` Step 1: 수익 내역 DB/RPC `7e8f702`)

- 수익 내역 테이블 `incomes`와 원자 RPC `record_income`(수익 추가 + 총 자산 증액)·`delete_income`(본인 수익 삭제 + 총 자산 차감)을 추가함. 직접 쓰기 권한은 주지 않음. 계정 삭제 대기 차단·탈퇴 정리에 연결함.
- `SCHEMA.sql`·`sql/README.md` 확인 쿼리·`TESTS.sql` R93 블록·`database.types.ts`를 반영함. 로컬 DB 실행 검증 전·병합 전임.

## 2026-11-16 (Run `r93-income-history-db-and-ui` 등록 및 활성화 — `R93` 수익 내역 DB/RPC·조회/삭제 UI)

- `New-CollaborationRun.ps1`로 격리 워크트리 `.worktrees/r93-income-history-db-and-ui`(브랜치 `collab/r93-income-history-db-and-ui`, Base `0844387`)를 생성하고 `docs/handoff.md` Active Dispatch Table에 Step 1(`GPT Codex` `▶ READY`, 대체 `Claude Opus` / `Gemini 4 Hydrogen`) → Step 2(`Claude Sonnet` / `Gemini 4 Hydrogen`) → Step 3(`Claude Opus` 리뷰)을 등록함.

## 2026-11-16 (캘린더 색상 통일·주간 필터 기본값·관리자 캐릭터 페이지네이션 UI 개선)

- `BROADCAST` 색상을 `#FF4A42`로 통일하고, 우측 사이드바·주간 목록 배지(`VERSION`·`PICKUP`) 색상을 캘린더 타일(`ScheduleBanner`) 기준으로 일치시킴.
- 주차별 일정 리스트 기본 필터를 `픽업(신규)`로 설정하고, `신규`·`복각` 필터는 이전 주 이월(`carried`) 없이 `start_date` 기준으로만 출력하도록 개선함.
- `/admin` 캐릭터 관리 목록에 20개 단위 페이지네이션을 추가하고, `템플릿 설정 수정`·`템플릿 삭제` 버튼을 `${selectedCharacterLabel} 카탈로그` 제목과 같은 높이 우측 정렬로 배치함.

## 2026-11-16 (Run `r91-r94-weekly-timeline-and-template-delete` 완료 — `main` 병합 `703362e`)

- Step 3 리뷰 지적 4건을 iteration-02(`0d8a5b8`)로 반영하고 `main`에 병합함(`703362e`, `R91`·`R92`·`R94`).
  - `R92-REV-001`: `/admin` 템플릿 삭제 경고 문구에 등록된 픽업 일정·대기 중 일정 요청에서도 해당 캐릭터가 빠진다는 안내를 추가함.
  - `R92-REV-002`: 템플릿 삭제 시 클라이언트 목록 수와 무관하게 `game_characters` 정식 캐릭터 삭제 요청을 항상 실행하도록 보강함.
  - `R94-REV-001`: 주차별 리스트에서 유형 필터 적용 중 일정이 없을 때 `"선택한 필터에 맞는 일정이 없습니다."`로 구분 표시함.
  - `R94-REV-002`: 미사용 상태였던 `splitVersionGroups` 함수·`VersionGroupEntry` 타입·관련 테스트를 제거함.
- `iteration-02/review.json`(`clean`)·`test.json`(`passed`)·`run.json`(`completed`) 스키마 검증 완료 및 워크트리를 정리함.

## 2026-11-16 (`r91-r94` Step 3: 통합 리뷰 `75e2520`)

- Step 1·2 변경을 통합 리뷰하고 `review.json`(지적 4건, P1·P2 없음)·`test.json`(tsc·lint·Vitest·build 통과)을 작성함. 병합 전(Step 4 대기)임.

## 2026-11-16 (`r92` Step 2: 관리자 캐릭터 템플릿 삭제 `8628d5d`)

- 관리자 캐릭터 관리 탭에 `템플릿 삭제` 버튼과 확인 다이얼로그를 추가함. 확인하면 정식 캐릭터(사용자 보유 체크·프리셋 포함)를 먼저 삭제한 뒤 템플릿을 빈 기본값(슬롯 4·돌파 6)으로 초기화하며, 픽업 전용 캐릭터는 유지함.
- 중간 실패 시 오류를 표시하고 같은 버튼으로 다시 시도할 수 있음. DB 변경 없음. 병합 전(Step 3 리뷰 대기)임.

## 2026-11-16 (`r91`·`r94` Step 1: 주차별 리스트 타임라인 개편 `e79e86b`)

- 주차별 리스트에서 이미 끝난 일정(종료일이 오늘 이전)을 숨기고, 날짜순 타임라인 행으로 개편함(날짜 열·`TODAY`·`진행 중` 칩, 캐릭터/게임 아바타와 게임 아이콘 배지, 게임명·기간·`D-n`, 관심 일정 버튼).
- 상단에 `전체·픽업(신규·복각·진행 중)·버전·콘텐츠·방송` 필터 바를 추가함. 게임별 아코디언과 버전 하위 중첩은 주간 목록에서 제거함(선택일 상세의 버전 묶음은 유지). 병합 전(리뷰 대기)임.
## 2026-11-16 (R90 보류 · `R91` 통합 Run 등록)

- R90을 잠정 보류로 바꾸고, `r91-r94-weekly-timeline-and-template-delete`(R91·R94·R92)를 활성 Run으로 등록함. Step 1~4 담당·수용 기준을 `docs/handoff.md`에 기록함.

## 2026-11-16 (`R90` 디시인사이드 수집 2차 검증)

- 검토서 `docs/dcinside-schedule-crawling-review.md`에 §6(Claude Opus 2차 검증 의견)을 추가함. 자동 수집 제외 권장, 경로 A 대안, SSRF 방어용 구조화 값 저장 규칙, 후보함 UX, R90 수용 기준 확정안을 담음.
- `docs/schedule-crawling-research.md` §11에 2차 검증 결과 연계를 추가함.

## 2026-11-16 (6대 AI 협업 모델 체제 확장 — `Gemini 4 Hydrogen` 추가)

- 협업 모델 매트릭스에 **`Gemini 4 Hydrogen`**(`Maker (Feature·UI·Test) & Sub-Orchestrator/Reviewer`)을 추가해 6대 AI 모델 체제로 확장하고, `Gemini 4 Argon`·`Claude Sonnet`·`GPT Codex`·`GitHub Copilot`·`Gemini 3.8 Flash`의 1순위급 대체(Fallback 1) 모델로 연결함 (`AGENTS.md`, `CLAUDE.md`, `.agents/rules/*`, `.agents/skills/*`, `.github/copilot-instructions.md`, `docs/collaboration-guide.md`, `docs/handoff.md`).

## 2026-11-16 (디시인사이드 공식 탭 수집 1차 검토서 생성 및 `R91`~`R94` 신규 과제 등록)

- 디시인사이드 게임별 갤러리 공지/공식 탭 크롤링 가능성 실측 및 약관 대조 검토서 [`docs/dcinside-schedule-crawling-review.md`](dcinside-schedule-crawling-review.md)를 작성하고, Claude Opus 2차 검증 Run(`r90-dcinside-crawling-opus-review` Step 2 `▶ READY`)을 `docs/handoff.md`에 등록함.
- 사용자 신규 요구사항 4건(`R91` 주차별 리스트 `end_date < today` 제외, `R92` 프리셋/템플릿 삭제 버튼, `R93` 수익 내역 저장·조회 경로 추가, `R94` 주차별 리스트 타임라인 UI 개편)을 검토하여 `docs/to-do.md` 및 `docs/handoff.md`에 등록함.

## 2026-11-12 (R86 후속 검토)

- 일정 수집 조사 문서에 10절(사용자 요구사항, HoYoLAB·네이버 약관 확인 결과, pickupgg.com 비교 관찰, 대안·결정 필요 사항)을 추가함.
- 3절 HoYoLAB 판정을 `제외 권장`에서 `제외`(약관상 스크래핑 금지 확인)로 바꿈.
- R90에 재검토 메모를 달고 착수를 보류함.
- 사용자가 제공한 네이버 이용약관 원문으로 라운지 자동 수집 금지를 확인하고, 조사 문서 3절·10.2절의 2차 자료 표기를 원문 확인으로 바꿈.

## 2026-11-12 (작업 트리 정리)

- 완료된 Run의 `.worktrees/` 워크트리 14개와 git 연결이 끊긴 잔여 폴더 7개를 정리함. 브랜치는 모두 유지함. 고유 파일 2개는 저장소 밖에 백업함.

## 2026-11-11 (Run `r86-schedule-crawling-research` 완료)

- 공식 일정 자동 수집 조사 문서를 검토하고 사용자 결정을 반영함.
- 후속 구현 방향을 `schedule_candidates` 별도 테이블, Steam 6개 공지 감지+버전 주기 추정, 하루 1회, Supabase Edge Function+`pg_cron`으로 확정함.
- 네이버·X·비문서화 API는 제외하고, 미확인 약관·Steam 제공 여부는 구현 전 추가 조사 대상으로 남김.

## 2026-11-11 (Run `r86-schedule-crawling-research` Step 1)

- 공식 일정 자동 수집 가능성 조사 문서 `docs/schedule-crawling-research.md`를 추가함. Steam 공식 공지 감지와 버전 주기 추정을 관리자 승인과 묶는 반자동 방식을 권장함.

## 2026-11-11 (R88 운영 적용, Run `r86-schedule-crawling-research` 등록)

- 운영 DB에 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql` 적용·확인 쿼리 검증 완료함(사용자).
- 공식 일정 자동 수집 가능성 조사(`R86`)를 활성 Run으로 등록함(조사 Opus → 검토 Gemini 4 Argon).

## 2026-11-11 (Run `r88-optional-character-icons` 완료 — `main` 병합 `66d55d8`)

- 템플릿이 있는 게임에서도 캐릭터를 아이콘 없이 추가하거나 아이콘 없는 캐릭터 요청을 승인할 수 있음. 아이콘이 없으면 기본 아바타로 표시함. 운영 DB에는 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql` 적용이 필요함.
- 협업 규칙: Docker Desktop이 필요한 작업은 미리 확인하고 꺼져 있으면 사용자에게 바로 요청함.


## 2026-11-11 (R88 Step 2 일반 캐릭터 아이콘 선택 사항 UI — `f30ae52`, 미병합)

- 템플릿 게임의 관리자 캐릭터 추가·수정, 신규 캐릭터 요청 승인에서 아이콘 없이도 저장·승인되게 하고 아이콘이 없으면 기본 아바타로 표시함. 마이그레이션 적용 전 DB가 거부하면 `업데이트 적용 전에는 아이콘이 필요합니다.` 안내를 표시함.

## 2026-11-11 (R88 Step 1 — optional character icons, `0be4f44`)

- 템플릿 게임의 일반 캐릭터가 아이콘 없이 등록되도록 DB 제약과 캐릭터 승인 RPC를 완화함.
- 아이콘 형식·용량 검사는 유지하고, 기존 픽업 전용 캐릭터·참조 중 캐릭터의 승격 보호 트리거는 유지함.
- 운영 DB에는 아직 적용하지 않음. UI Step 2와 통합 리뷰 후 사용자 수동 적용 예정임.

## 2026-11-11 (Run `r88-optional-character-icons` 등록, R84·R85 결정, `R89` 예약)

- 템플릿 게임 캐릭터 아이콘을 선택 사항으로 바꾸는 Run을 등록함. R84·R85 착수 전 결정사항을 기록하고 푸시 알림 설계 조사(`R89`)를 예약함.

## 2026-11-11 (Run `r83-schedule-dialog-and-character-sort` 완료 — `main` 병합 `6af6780`)

- 게임별 일정 모달에서 같은 일정이 `기타 일정`에 한 번 더 나오던 문제를 없앰.
- 캐릭터 목록 기본 순서를 첫 번째 분류(예: 속성) 순서 → 이름 가나다순으로 바꿈. 보유 캐릭터 화면, 프리셋 사이드바·선택 창, 관리자 캐릭터 표에 적용함. 즐겨찾기는 사용자가 정한 순서 그대로임.


## 2026-11-11 (R83 기타 일정 제거·캐릭터 기본 정렬 — `bc33d83`, 미병합)

- 게임별 일정 모달에서 `진행 중`·`다음 예정`과 중복되던 `기타 일정` 영역을 제거함.
- 캐릭터 기본 정렬을 첫 번째 분류 축 선택지 순서 → 가나다순 → id로 바꿈(`sortCharactersByClassification`). 보유 캐릭터 화면·프리셋 사이드바·모바일 선택 창·관리자 캐릭터 표에 적용하고 즐겨찾기는 사용자 지정 순서를 유지함. 값이 없거나 템플릿에 없는 분류는 맨 뒤로 보냄.

## 2026-11-11 (Run `r83-schedule-dialog-and-character-sort` 등록)

- 예약 `R83`(게임별 일정 모달 `기타 일정` 중복 제거, 캐릭터 첫 번째 분류 축 + 가나다순 정렬)을 활성 Run으로 등록함(구현 Sonnet → 리뷰 Gemini 4 Argon).

## 2026-11-11 (Run `r79-sql-tests-local-run` 완료 — `main` 병합 `b38d65e`)

- `sql/README.md`의 로컬 `psql` 예시를 유효한 `-h/-p/-U/-d` 연결 인자와 `PGPASSWORD` 방식으로 수정함.
- Base `a580d1d` ↔ Target `270f2c7` 재리뷰에서 `R79-REV-001` 해소 및 findings 없음 확인함. 리뷰·테스트 산출물 `50b26ce` 추가함.
- 기존 로컬 Supabase 실행의 38개 블록 PASS·최종 rollback PASS를 유지함. 이번 재실행은 Docker 엔진 미실행으로 보류함.

## 2026-11-11 (Run `r81-image-input-unification` 완료 — `main` 병합 `3c87917`)

- 게임·캐릭터 커스텀 아이콘, 프로필 사진, 관리자·요청 화면의 모든 이미지 입력을 하나의 등록 모달로 통일함. 이미지 주소 입력, 이미지 붙여넣기(웹 이미지는 원본 주소를 우선 사용해 투명 배경 유지), 파일 선택을 모두 지원하고 미리보기 후 등록함. 캘린더 배경은 기존 방식 유지함.


## 2026-11-11 (R81 Step 3 관리자·요청 화면 이미지 입력 통일 — `c266232`, 미병합)

- 관리자 일정 폼·픽업 전용 캐릭터·캐릭터 폼·게임 폼·분류 아이콘, 요청 승인 화면(게임·캐릭터), 요청 모달(캐릭터 아이콘·제안 이미지)의 인라인 URL·파일 입력을 공용 이미지 등록 모달로 교체함. 저장·승인·제출 경로와 150,000자 검사·AI 업스케일 옵션은 유지함. 게임 폼 아이콘은 명세대로 AI 업스케일 없이 변환함.


## 2026-11-11 (R81 Step 2 공용 이미지 입력 모달 — `77edee9`, 미병합)

- 공용 이미지 등록 모달(URL·붙여넣기·파일·미리보기)과 변환 helper(`image-source.ts`)를 추가하고 사용자 화면 4곳(게임 아이콘·게임 추가 아이콘·보유 캐릭터 아이콘·프로필 사진)에 적용함.
- 붙여넣기는 브라우저 이미지의 원본 주소(`text/html`)를 우선 사용해 투명 배경을 보존하고, 실패할 때만 클립보드 비트맵을 사용함. 투명 배경 이미지는 파일 업로드 권장 안내를 표시함.


## 2026-11-11 (Excalidraw 통합 ERD 및 서비스 기능 상호작용 지도 추가)

- `docs/diagrams/chronoledger-erd.excalidraw` 추가: 5개 영역 20개 테이블·2개 인프라 박스·RPC/트리거/pg_cron/Storage 경계를 포함한 통합 ERD 다이어그램(158개 요소)을 작성함.
- `docs/diagrams/chronoledger-functional-map.excalidraw` 추가: 비개발자·기획 관점의 자연어 기반 6개 기능 영역·목적 콜아웃·상호작용 화살표·3대 핵심 루프를 담은 기능 지도 다이어그램(147개 요소)을 작성함.
- `docs/architecture.md` 수정: 아키텍처 개요 하단에 신규 Excalidraw ERD 및 기능 지도 파일 참조 링크를 추가함.

## 2026-11-11 (캐릭터 기본 아바타 적용)

- 사용자 지정·카탈로그 아이콘이 모두 없는 캐릭터에 사람 실루엣 기본 아바타(`DefaultAvatar`)를 표시함. 기존에는 이름 첫 글자를 보여줌.
- 적용 위치: 캐릭터 아이콘(`CharacterIcon`: 명단·프리셋 보드·선택기), 픽업 아바타(달력 목록·상세·게임 일정), 관리자 캐릭터 목록·표. 업로드한 이미지가 있으면 그대로 그 이미지를 보여줌.

## 2026-11-11 (관심 일정 `+ 예정 지출 추가` 버튼 제거)

- 관심 일정을 눌렀을 때 나오던 `+ 예정 지출 추가` 버튼을 주간 목록·선택일 상세·게임별 일정 모달에서 모두 제거함. 별 버튼(관심 등록/해제)은 그대로임.
- 연결 코드(`onAddPlannedExpense` 전달, 대시보드·게임 페이지의 사전 입력 핸들러, 게임 페이지의 지출 모달)와 관련 테스트도 함께 정리함. 대시보드의 `+ 지출 추가` 버튼은 그대로임.

## 2026-11-11 (R82 버전별 일정 묶음 병합)

- 주간 목록과 선택일 상세에서 같은 게임의 픽업·콘텐츠 일정을 시작일이 속한 버전 아래에 접어 묶어 표시함(요약 `픽업 n · 콘텐츠 n`과 캐릭터 아바타, 누르면 펼침). 달력 칸과 방송 일정은 그대로임. `main` 병합 `2c1f5c5`.

## 2026-11-11 (`r82` Step 1: 버전 아래 일정 묶음 UI `58aa956`)

- 주간 일정 목록과 선택일 상세에서 같은 게임의 픽업·콘텐츠를 시작일이 속한 버전 아래로 접어 표시함(유형별 개수·픽업 아바타 요약, 기본 접힘). 달력 칸·방송 일정은 그대로임.
- 버전 카드가 안 보이는 날의 하위 일정은 단독 카드에 `소속: 버전명` 라벨을 붙임. 소속 판정은 순수 함수 `version-schedule-groups.ts`로 분리함. 병합 전(Step 2 리뷰 대기)임.

## 2026-11-11 (모바일 대시보드 폭·필터 칩 줄바꿈 수정)

- 모바일에서 주차별 리스트를 열면 화면 전체가 넓어지던 문제를 고침(대시보드 본문 열을 화면 폭에 맞춤, `8eaeaf9`).
- 캐릭터 필터의 칩이 라벨 아래로 줄바꿈되던 문제를 고쳐 칩만 라벨 오른쪽 영역에서 줄바꿈되도록 함.
- 붙여넣기 시 투명 배경이 검게 되는 문제는 원인(Windows 클립보드) 확인 후 `r81` 공용 이미지 입력 모달 과제에 개선 기준을 추가함.

## 2026-11-11 (사용자 요청 5건 과제 등록 `R83`~`R86`)

- 일정 모달 중복 표시·캐릭터 기본 정렬(`R83`), 기타 건의 창구(`R84`), 시간 단위 일정 설계(`R85`, `R37` 흡수), 공식 일정 수집 조사(`R86`)를 다음 Run 예약으로 등록함.

## 2026-11-11 (Run `r82-version-grouped-schedules` 등록)

- 버전 일정 기준 일정 묶음 표시 Run을 등록함(구현 Sonnet → 리뷰 Opus). 주간 일정 목록과 선택일 상세만 대상이며 달력 칸은 유지함.

## 2026-11-11 (Run `r81-image-input-unification` Step 1 — `96d4b3d`)

- R81 명세서 `docs/spec/R81_Image_Input_Unification_Spec.md` 추가함. 이미지 입력을 공용 등록 모달 하나로 통일하는 설계(대상 13곳, 캘린더 배경 제외)를 확정함.
- Step 2(`Claude Sonnet`)를 `▶ READY`로 전환함.

## 2026-11-11 (Run `r81-image-input-unification` 등록)

- 이미지 입력 공용 등록 모달 통일 Run을 등록함(명세 Opus → 공용 모달·사용자 화면 Sonnet → 관리자·요청 화면 Sonnet → 리뷰 Opus). Run `r79` Step 2 리뷰는 보류함.

## 2026-11-11 (Run `r79-sql-tests-local-run` Step 2 리뷰 보류)

- Base `a580d1d` ↔ Target `f13087d` 정적 리뷰에서 `R79-REV-001`(P3)을 발견함. `sql/README.md`의 로컬 `psql` 명령이 유효하지 않아 실행 절차대로 재현할 수 없음.
- Docker 컨테이너에서 `TESTS.sql` 자체는 38개 블록 전체 PASS·최종 rollback PASS함. README 명령 수정 후 `main` 병합 필요함.

## 2026-11-11 (보유 캐릭터 목록 확대)

- 보유 캐릭터 목록 아바타 64→80px, 이름 `text-sm`→`text-base`, 열 수 md 6→5·lg 8→6으로 키움. 돌파 배지(10px)·캐릭터 설정 창·프리셋 선택 창은 변경 없음. 게임과 무관하게 동일 크기이며 열 수만 창 폭에 따라 달라짐.

## 2026-11-11 (Run `r79-sql-tests-local-run` Step 1 — `f13087d`, 미병합)

- `sql/tests/TESTS.sql`이 로컬 Supabase에서 처음으로 끝까지 통과함(38개 블록). 사용자 전환 누락, 삭제 대기 상태 잔존, `\gset` 오타 등 테스트 버그 3건을 고침.
- `sql/README.md`에 Docker·Supabase CLI로 로컬에서 테스트를 반복 실행하는 절차를 추가함.

## 2026-11-11 (R80 마이그레이션 운영 적용)

- 운영 DB에 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql` 적용·확인 쿼리 검증 완료함(사용자). 분류 아이콘 쓰기 정책이 다른 관리자 기능과 같은 조건으로 운영에 반영됨.

## 2026-11-11 (Run `r80-classification-icon-admin-policy` Step 2 — `main` 병합 `dbded69`)

- Base `103dbf5` ↔ Target `c6ddd4d` 정적 리뷰에서 findings 없음으로 확인하고 `main`에 병합함.
- `review.json`·`test.json`을 추가함. tsc·lint·diff-check·Vitest 64파일/783개 통과함.
- 운영 DB에는 R80 마이그레이션이 아직 미적용 상태이며, 사용자 적용·아이콘 저장 재시험이 남아 있음.

## 2026-11-11 (Run `r80-classification-icon-admin-policy` Step 1 — `a2c2f47`·`c6ddd4d`, 미병합)

- 분류 아이콘 쓰기 정책을 다른 관리자 테이블처럼 JWT `app_metadata.role` 또는 `users.role = 'admin'`이면 허용하도록 바꾸는 마이그레이션 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql`을 추가함(운영 미적용).
- 관리자 분류 아이콘 저장·삭제 실패 시 권한 문제(`42501`)나 오류 코드·메시지를 함께 표시함.
- 보유 캐릭터 화면 아바타를 64px, 이름을 한 단계 큰 글자로 키움. 모든 게임에서 같은 크기임.

> 2026-11-10 이전 기록은 [`docs/archive/changelog-archive.md`](archive/changelog-archive.md)로 옮김.
