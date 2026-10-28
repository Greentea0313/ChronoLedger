# ChronoLedger SQL 실행 가이드

원격 Supabase DB에는 **Supabase Dashboard → SQL Editor**로 수동 적용합니다. 파일을 열어 전체를 붙여넣고 `Run`으로 실행합니다.

## 디렉터리 구조

| 경로 | 분류 | 언제 실행하나 |
| :--- | :--- | :--- |
| [`SCHEMA.sql`](SCHEMA.sql) | ① 통합 마스터 스키마 | **신규(빈) 프로젝트에서 1회만**. 기존 DB에 다시 실행하지 않습니다(`CREATE TABLE`이 멱등하지 않음). |
| [`migrations/`](migrations/) | ② 기존 DB 동기화용 마이그레이션 | 이미 운영 중인 DB에 해당 변경이 빠져 있을 때. 모두 `SCHEMA.sql`에 반영된 **최신판**이며 재실행해도 안전합니다. |
| [`seed/`](seed/) | ③ 시드·더미 데이터 | 공용 게임 카탈로그 등록, 테스트 계정 더미 생성/정리. |
| [`tests/`](tests/) | ③ 스모크 테스트 | **운영이 아닌 전용 테스트 프로젝트**에서만. rollback-only. |
| [`archive/`](archive/) | ④ 아카이브 | **실행 금지.** 이력 참고용. |

`supabase/migrations/`(저장소 루트)는 과거 Supabase CLI로 적용한 계정 삭제 마이그레이션 기록입니다. 내용은 모두 `SCHEMA.sql`에 반영돼 있으니 실행하지 않습니다. CLI 연결 프로젝트의 적용 이력과 맞물려 있어 위치를 옮기지 않았습니다.

## A. 신규 프로젝트 설치 순서

1. `SCHEMA.sql` 실행. 테이블, RPC, 트리거, RLS, `public.users` 프로필, `pg_cron` 탈퇴 정리 스케줄이 생성됩니다.
2. Storage에서 **비공개(private)** 버킷 `user-icons` 생성. 객체 정책은 `SCHEMA.sql`이 이미 만들었습니다. `getPublicUrl`은 쓰지 않으므로 public으로 열지 않습니다.
3. `seed/SEED_GAMES.sql` 실행. 공용 게임 카탈로그가 등록됩니다(`ON CONFLICT` 갱신이라 재실행 가능).
4. 관리자 지정. 아래 중 하나를 사용합니다(DB 측 판정이 둘 다 허용).
   - 권장: Supabase Auth에서 해당 사용자의 `app_metadata`에 `{"role": "admin"}` 설정
   - 또는 SQL: `UPDATE public.users SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = '<관리자 이메일>');`

## B. 기존 DB 동기화 (`migrations/`)

아래 표의 확인 쿼리로 반영 여부를 먼저 점검하고, 기대 결과와 다를 때만 해당 파일을 실행합니다. 작성 순서대로 나열했지만 서로 독립적이라 순서는 무관합니다.

| 파일 | 내용 | 확인 쿼리 → 기대 결과 |
| :--- | :--- | :--- |
| `MIGRATION_PG_CRON.sql` | 계정 탈퇴 RPC + 5분 주기 `pg_cron` 정리 작업 | `SELECT jobname FROM cron.job WHERE jobname = 'chronoledger-account-purge';` → 1행 |
| `MIGRATION_STORE_EVENT_EARN.sql` | `process_expense_payment` 11개 인자판(이벤트 적립·수동 보정). 9개 인자 구버전 오버로드 제거 포함 | `SELECT oid::regprocedure FROM pg_proc WHERE proname = 'process_expense_payment';` → 11개 인자 1행만 |
| `MIGRATION_EXPENSE_EDIT.sql` | 확정 지출 메타데이터 수정 RPC(결제일 포함) | `SELECT oid::regprocedure FROM pg_proc WHERE proname = 'update_confirmed_expense_metadata';` → `date` 포함 5개 인자 1행 |
| `MIGRATION_MEMO_UNIQUE.sql` | `personal_memos (user_id, memo_date)` 유니크. **중복 메모는 최신 1건만 남기고 삭제** | `SELECT conname FROM pg_constraint WHERE conname = 'uq_personal_memos_user_date';` → 1행 |
| `MIGRATION_USER_GAME_MEMO.sql` | `user_games.memo` 컬럼 | `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_games' AND column_name = 'memo';` → 1행 |

## C. 시드·더미·테스트

- `seed/DUMMY_DATA_USER.sql` / `seed/CLEANUP_DUMMY_DATA_USER.sql`: 하드코딩된 테스트 사용자 ID(`dae6adf8-…`)의 더미 데이터를 생성/정리합니다. 운영 사용자 데이터에는 사용하지 않습니다. 게임 카탈로그(`games`)는 정리 대상이 아닙니다.
- `tests/TESTS.sql`: 배포된 스키마 대상 DB/RPC/RLS rollback-only 스모크 테스트입니다. 실행 전제와 `psql` 예시는 파일 상단을 따릅니다. 전체 SRS 수용 검증을 대체하지 않습니다.
  - ⚠️ 2026-10-29 기준 `WAL-01` 단언이 현재 결제 RPC와 맞지 않아 그 지점에서 실패합니다. 테스트는 "WALLET 결제는 적립 0"을 기대하지만, 현재 `process_expense_payment`는 포인트 플랫폼이 지정되면 WALLET 결제에도 적립합니다. 적립 규칙을 확정한 뒤 테스트를 갱신해야 합니다(`docs/to-do.md` 후속 과제).

## D. 아카이브 (`archive/`, 실행 금지)

구버전 RPC 본문이나 제약을 담고 있어, 실행하면 최신 정의를 되돌립니다(예: `process_expense_payment`·`refund_expense_payment`·`adjust_wallet_balance` 구버전).

| 파일 | 대체한 곳 |
| :--- | :--- |
| `PHASE9_ADMIN_AND_USERS.sql` | `SCHEMA.sql` 1-1절 `public.users`(+ 가입 트리거). 소문자 `game_schedules` 정의는 폐기 |
| `FIX_USERS_RLS.sql` | `SCHEMA.sql` 1-1절 `users` 최종 RLS 정책 |
| `UPDATE_CATEGORIES.sql` | `MIGRATION_PHASE10.sql`의 카테고리 정리 → `SCHEMA.sql` `expenses.category` CHECK |
| `MIGRATION_PHASE10.sql` | `SCHEMA.sql` (구독 3종 주기, 지갑 설정) |
| `MIGRATION_PHASE11.sql` | `SCHEMA.sql` (`CONTENTS` 일정, 픽업 바인딩, 관리자 RPC) |
| `MIGRATION_PAYMENT_REFINEMENT.sql` | `SCHEMA.sql` 환불 RPC + `migrations/MIGRATION_STORE_EVENT_EARN.sql` 결제 RPC |

## 새 스키마 변경 추가 규칙

1. `migrations/MIGRATION_<주제>.sql`로 작성합니다. 재실행 안전(`IF NOT EXISTS`, `CREATE OR REPLACE`, 조건부 `DO $$` 블록)하게 쓰고, 함수 시그니처가 바뀌면 구 시그니처를 `DROP FUNCTION IF EXISTS`로 먼저 제거합니다.
2. 같은 변경을 `SCHEMA.sql`에도 반영합니다(신규 설치 기준 유지).
3. 이 문서 B 표에 확인 쿼리와 함께 추가합니다.
4. 해당 변경으로 기존 마이그레이션이 구버전이 되면 `archive/`로 옮기고 파일 상단에 재실행 금지 주석을 답니다.
