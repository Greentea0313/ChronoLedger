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
| `MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` | `subscription_templates` 직접 DELETE 정책 제거(삭제는 `delete_subscription_template` RPC로만) | `SELECT policyname FROM pg_policies WHERE tablename = 'subscription_templates' AND cmd = 'DELETE';` → 0행 |
| `MIGRATION_USERS_ROLE_GUARD.sql` | **보안**: 일반 사용자의 `public.users.role` 자기 변경(관리자 자기 승격) 차단 트리거 | `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_prevent_users_role_self_change';` → 1행 |
| `MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql` | 구독 중지 시 미결제 `PLANNED` 회차 삭제 트리거로 교체. ⚠️ 적용 시 기존 `CANCELLED / TEMPLATE_DEACTIVATION` 행과 비활성 템플릿의 `PLANNED` 행을 **물리 삭제**(되돌릴 수 없음) | `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_delete_planned_expenses_on_template_deactivation';` → 1행. `SELECT count(*) FROM public.expenses WHERE cancellation_kind = 'TEMPLATE_DEACTIVATION';` → 0. 적용 전 같은 쿼리로 삭제될 행 수를 먼저 확인 |
| `MIGRATION_UNOFFICIAL_SCHEDULES.sql` | 공식/비공식 일정 분류와 사용자 표시 설정 | `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name IN ('game_schedules', 'schedule_requests') AND column_name = 'is_official') OR (table_name = 'users' AND column_name = 'show_unofficial_schedules'));` → 3행 |
| `MIGRATION_MONTHLY_PLANNED_DEDUPE.sql` | `MONTHLY_DAY` 템플릿별 가장 이른 `PLANNED` 1건을 남기고 나머지 예정 행을 **물리 삭제**; 소유자 검증 `dedupe_monthly_planned_expenses(UUID)` RPC 추가 | `SELECT proname, proargtypes::regtype[] FROM pg_proc WHERE proname = 'dedupe_monthly_planned_expenses';` → UUID 인자 1행. `SELECT t.id FROM public.subscription_templates t JOIN public.expenses e ON e.template_id = t.id WHERE COALESCE(t.cycle_type, 'MONTHLY_DAY') = 'MONTHLY_DAY' AND e.status = 'PLANNED' GROUP BY t.id HAVING COUNT(*) > 1;` → 0행. 적용 시 중복 `PLANNED` 행은 되돌릴 수 없이 삭제되므로 적용 전 확인 |
| `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` | 게임별 캐릭터 분류·카탈로그, 요청 RPC, 사용자 보유 캐릭터·프리셋, 탈퇴 정리 연결 | `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('game_characters','character_requests','user_characters','user_character_presets');` → 4행. `SELECT proname FROM pg_proc WHERE proname IN ('approve_character_request','reject_character_request','is_valid_classification_schema');` → 3행. 확인: `SELECT polname FROM pg_policy WHERE polrelid IN ('public.game_characters'::regclass,'public.character_requests'::regclass,'public.user_characters'::regclass,'public.user_character_presets'::regclass);` → 10행 (`game_characters` 2, `character_requests` 4, `user_characters` 2, `user_character_presets` 2) |
| `MIGRATION_R33_SCHEDULE_RERUN_AND_BROADCAST.sql` | `BROADCAST` 일정 종류와 PICKUP 전용 `is_rerun` 필드·승인 복사·예정 지출 동기화 | `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('game_schedules','schedule_requests') AND column_name='is_rerun';` → 2행. `SELECT conname FROM pg_constraint WHERE conname IN ('game_schedules_schedule_type_check','schedule_requests_schedule_type_check');` → 2행 |
| `MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql` | R13 캐릭터 카탈로그·R33 일정 스키마 이후 적용함. 픽업 전용 캐릭터(`is_pickup_only`)·신규 캐릭터 제안(`pickup_new_characters`)·승인 RPC·열 단위 `anon` 조회를 추가하고 구 `pickup_image_url`을 제거함. 기존 위반 게임이 있으면 자동 변환하지 않고 ID와 함께 중단함 | 사전 점검: `SELECT id FROM public.games WHERE jsonb_array_length(classification_schema->'axes')>2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(classification_schema->'rarities') r WHERE jsonb_typeof(r)<>'string' OR length(r#>>'{}') NOT BETWEEN 1 AND 20) OR (classification_schema ? 'character_label' AND (jsonb_typeof(classification_schema->'character_label')<>'string' OR length(btrim(classification_schema->>'character_label')) NOT BETWEEN 1 AND 20));` → 0행. 컬럼 확인: `SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'game_characters' AND column_name IN ('default_icon_url', 'is_pickup_only')) OR (table_name = 'game_schedules' AND column_name IN ('pickup_character_ids', 'pickup_image_url')) OR (table_name = 'schedule_requests' AND column_name IN ('pickup_character_ids', 'pickup_new_characters', 'pickup_image_url'))) ORDER BY table_name, column_name;` → 5행 (`game_characters.default_icon_url`=`YES`, `game_characters.is_pickup_only`=`NO`, `game_schedules.pickup_character_ids`=`NO`, `schedule_requests.pickup_character_ids`=`NO`, `schedule_requests.pickup_new_characters`=`NO`; `pickup_image_url`은 0행). 함수·권한 확인: `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('is_valid_pickup_new_characters', 'validate_schedule_pickup_characters', 'guard_game_character_pickup_only_transition', 'validate_character_request_target') ORDER BY proname;` → 4행. `SELECT has_column_privilege('anon', 'public.game_characters', 'is_pickup_only', 'SELECT') AS anon_pickup_only, has_column_privilege('anon', 'public.game_characters', 'created_by', 'SELECT') AS anon_created_by, has_table_privilege('anon', 'public.schedule_requests', 'SELECT') AS anon_schedule_requests;` → `true, false, false` |
| `MIGRATION_R64_CLASSIFICATION_OPTION_ICONS.sql` | R64 분류 축 선택지별 64×64 WebP Data URL 아이콘 테이블·검증/정리 트리거·승인 게임 공개 조회·JWT 관리자 쓰기 RLS 추가함. 운영 DB에는 사용자 수동 적용함 | `SELECT c.relname, c.relrowsecurity, (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies FROM pg_class c WHERE c.oid = 'public.game_classification_icons'::regclass;` → `game_classification_icons, true, 2`. `SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_validate_game_classification_icon','trg_cleanup_game_classification_icons');` → 2. `SELECT has_table_privilege('anon','public.game_classification_icons','SELECT') AS anon_select, has_table_privilege('authenticated','public.game_classification_icons','INSERT') AS auth_insert;` → `true, true` (실제 관리자 여부는 RLS로 판정함) |
| `MIGRATION_R76_PRESET_GRID_EDITING.sql` | 빈 프리셋 허용, 캐릭터 삭제 시 빈 프리셋 유지, 프리셋 슬롯 변경 원자 RPC 및 프리셋 순서 변경 RPC 추가함. 운영 DB에는 사용자 수동 적용함 | `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.user_character_presets'::regclass AND conname = 'chk_user_character_presets_character_ids';` → 1행(`cardinality` 0~12). `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('update_character_preset_slots','reorder_character_presets') ORDER BY proname;` → 2행 |
| `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql` | R64 이후 적용함. 분류 아이콘 쓰기 정책 `Admin manage classification icons`를 다른 관리자 테이블과 같은 조건(JWT `app_metadata.role = 'admin'` 또는 `public.users.role = 'admin'`)으로 교체함. 재실행 안전. 운영 DB에는 사용자 수동 적용함 | `SELECT pg_get_expr(polqual, polrelid) LIKE '%users u%u.role = ''admin''%' AS users_role_allowed FROM pg_policy WHERE polrelid = 'public.game_classification_icons'::regclass AND polname = 'Admin manage classification icons';` → `true` (`pg_get_expr`는 `search_path`에 있는 `public.`을 생략하므로 스키마 이름으로 찾지 않음) |
| `MIGRATION_R13_4_BREAKTHROUGH_AND_GUEST_RLS.sql` | 게임별 최대 돌파 상한, 사용자 캐릭터 즐겨찾기/돌파 단계 및 게스트 승인 게임·공식 일정 조회 RLS | `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'games' AND column_name = 'max_breakthrough') OR (table_name = 'user_characters' AND column_name IN ('is_favorite','breakthrough_level')));` → 3행. `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'game_schedules' AND policyname = 'Allow anon read official schedules';` → 1행. `SELECT has_table_privilege('anon','public.games','SELECT') AS anon_games_select, has_table_privilege('anon','public.game_schedules','SELECT') AS anon_schedules_select;` → `true, true` |
| `MIGRATION_R35_FAVORITE_SCHEDULES.sql` | 관심 일정 즐겨찾기 `user_favorite_schedules`(본인 행만 조회·등록·삭제, `UPDATE` 권한 없음, `anon` 차단, 계정 삭제 대기 사용자 차단) 추가 및 계정 탈퇴 정리 함수 `purge_expired_account_deletion_requests`에 삭제 연결. ⚠️ 구버전 purge 본문을 담은 `MIGRATION_PG_CRON.sql`·`MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`을 이후 재실행했다면 이 파일을 다시 실행함 | 테이블·RLS: `SELECT c.relname, c.relrowsecurity, (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies FROM pg_class c WHERE c.oid = 'public.user_favorite_schedules'::regclass;` → `user_favorite_schedules, true, 2`. 권한: `SELECT has_table_privilege('anon', 'public.user_favorite_schedules', 'SELECT') AS anon_select, has_table_privilege('authenticated', 'public.user_favorite_schedules', 'INSERT') AS auth_insert, has_table_privilege('authenticated', 'public.user_favorite_schedules', 'UPDATE') AS auth_update;` → `false, true, false`. 트리거·탈퇴 정리: `SELECT (SELECT count(*) FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_user_favorite_schedules') AS block_trigger, position('user_favorite_schedules' IN pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure)) > 0 AS purge_linked;` → `1, true` |
| `MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql` | VERSION 일정 기간 변경 시 버전 패스 예정 지출(`start_date <> end_date`이고 `target_date = end_date`)은 `target_date`를 새 종료일로 유지하고, 그 외 VERSION 연동 예정 지출은 새 시작일을 따르도록 `sync_version_expenses_trigger()` 교체. 재실행 안전 | `SELECT position('R56 version pass' IN pg_get_functiondef('public.sync_version_expenses_trigger()'::regprocedure)) > 0 AS r56_applied;` → `true` |
| `MIGRATION_USER_CHARACTER_FAVORITE_ORDER.sql` | 보유 캐릭터 즐겨찾기 순서 저장, 미보유 즐겨찾기 자동 해제, 순서 재정렬 RPC 추가. 재실행 안전 | `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='user_characters' AND column_name='favorite_sort_order';` → 1행. `SELECT oid::regprocedure FROM pg_proc WHERE proname='reorder_favorite_characters';` → UUID, UUID[] 인자 1행. 권한(R74): `SELECT has_function_privilege('anon', 'public.reorder_favorite_characters(uuid, uuid[])', 'EXECUTE') AS anon_exec, has_function_privilege('authenticated', 'public.reorder_favorite_characters(uuid, uuid[])', 'EXECUTE') AS auth_exec;` → `false, true` |

## C. 시드·더미·테스트

- `seed/DUMMY_DATA_USER.sql` / `seed/CLEANUP_DUMMY_DATA_USER.sql`: 하드코딩된 테스트 사용자 ID(`dae6adf8-…`)의 더미 데이터를 생성/정리합니다. 운영 사용자 데이터에는 사용하지 않습니다. 게임 카탈로그(`games`)는 정리 대상이 아닙니다.
- `tests/TESTS.sql`: 배포된 스키마 대상 DB/RPC/RLS rollback-only 스모크 테스트입니다. 실행 전제와 `psql` 예시는 파일 상단을 따릅니다. 전체 SRS 수용 검증을 대체하지 않습니다.
  - 2026-10-29 기준 `SCHEMA.sql` + `migrations/` 전체를 적용한 DB에서 끝까지 PASS합니다. `WAL-01`은 포인트 플랫폼을 지정한 WALLET 결제가 스토어 적립률로 적립되는 현행 규칙을 검증합니다.
  - 2026-11-11 로컬 Supabase에서 끝까지 PASS함(38개 블록, Run `r79-sql-tests-local-run`). 운영 DB가 아닌 로컬에서 반복 실행하는 방법:
    1. Docker Desktop 실행(WSL2, `wsl --install`로 가상 머신 플랫폼 활성화 필요).
    2. 저장소 밖 작업 폴더에서 로컬 스택 준비: `npx supabase@2.120.0 init --workdir <폴더>` → `config.toml`의 `project_id`를 `chronoledger-local`로 바꿈 → `npx supabase@2.120.0 start --workdir <폴더> -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,postgres-meta,supavisor`. 저장소 루트 `supabase/`는 운영 프로젝트 연결 정보와 과거 마이그레이션이 있어 쓰지 않음.
    3. 빈 로컬 DB에 1회: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -X -v ON_ERROR_STOP=1 -f sql/SCHEMA.sql` 후 `INSERT INTO storage.buckets (id, name, public) VALUES ('user-icons', 'user-icons', false);`.
    4. 테스트: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -X -v ON_ERROR_STOP=1 -f sql/tests/TESTS.sql`. 전체가 `ROLLBACK`되므로 반복 실행 가능함. 스키마를 바꾼 뒤에는 `npx supabase@2.120.0 db reset --workdir <폴더>`로 초기화하고 3단계부터 다시 함.
    5. Windows PowerShell에서는 한글 깨짐을 막으려고 `$env:PGCLIENTENCODING="UTF8"`을 먼저 설정함. psql은 PATH에 없으면 `C:\Program Files\PostgreSQL\17\bin\psql.exe` 전체 경로로 실행함.

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
