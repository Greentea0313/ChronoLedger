-- ============================================================================
-- ChronoLedger deployed-schema DB/RPC/RLS smoke tests (rollback-only)
--
-- 실행 전제:
--   1) 운영이 아닌 전용 Supabase 테스트 프로젝트를 선택한다.
--   2) auth.users fixture 생성 및 SET ROLE authenticated/anon이 가능한
--      DB 연결 역할로 접속한다. Supabase anon/service_role API 키를 DB 비밀번호
--      대신 사용하지 않는다. 연결 문자열은 셸 환경 변수 등 안전한 경로로 전달한다.
--   3) SCHEMA.sql과 필요한 user-icons Storage bucket/policies가 먼저 배포되어
--      있어야 한다. 이 파일은 이미 배포된 스키마를 검증하며 설치하지 않는다.
--
-- PowerShell 실행 예:
--   psql "$env:SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f sql/tests/TESTS.sql
--
-- 역할/JWT:
--   DB fixture 역할: 테스트 계정/초기 row를 만들고 검증값을 읽는 privileged
--     연결 역할. 이 역할로 앱 RPC를 호출하지 않는다.
--   authenticated 사용자 A: request.jwt.claim.sub와 request.jwt.claims.sub를
--     같은 fixture UUID로 설정하고 SET LOCAL ROLE authenticated로 실행한다.
--   사용자 B: 교차 사용자 RLS 격리용 별도 auth.users fixture.
--   authenticated 관리자: JWT의 app_metadata.role=admin만 설정해 관리자 RPC
--     권한을 모의한다. 실제 Supabase Auth에서 발급한 admin JWT 테스트가 아니다.
--   anon: PUBLIC/anon 실행 권한 회수 여부를 확인한다.
--
-- 초기 데이터:
--   사용자 A/B는 임의 UUID와 example.invalid 이메일로 트랜잭션 안에서 생성한다.
--   가입 트리거로 A/B 각각 finances(0/0)와 GOOGLE_PLAY(0.10/BRONZE),
--     GALAXY_STORE(0.10/NULL) 지갑을 만든다.
--   사용자 A의 자산/기본 예산은 100,000/20,000, Google Play 포인트는 500,
--     Galaxy Store 포인트는 0으로 설정한다. 두 게임, PICKUP 일정, 예정 지출,
--     구독 템플릿은 이후 순서에서 필요한 FK/trigger fixture로 생성한다.
--
-- 실행 순서 및 기대 결과 (실제 assertion은 아래 같은 순서의 SQL 블록):
--   ID     역할/JWT               동작 및 기대 결과
--   SETUP  DB fixture 역할         auth.users A/B 생성 -> 각각 finance 0/0,
--                                  Google(BRONZE/0.10)/Galaxy(NULL/0.10) 지갑 생성.
--   FIN-01 authenticated / A       설정 RPC -> asset=100000, budget=20000.
--   WAL-00 authenticated / A       수동 보정 -> Google point=500,
--                                  MANUAL_ADJUST 원장 amount/balance_after=500.
--   WAL-01 authenticated / A       WALLET 결제(포인트 플랫폼 GOOGLE_PLAY) -> final=8900,
--                                  asset=91100, earned=floor(8900*0.10%)=8,
--                                  Google point=500-100+8=408.
--   WAL-02 authenticated / A       같은 CONFIRMED 결제 재호출 -> 거부, no mutation.
--   REF-01 authenticated / A       환불 -> asset/used points 원복, manual adjust 보존.
--   REF-02 authenticated / A       PAYMENT_REFUND 복구 시도 -> 거부.
--   ST-01  authenticated / A       Google 결제 -> earned=floor(9000*0.10%)=9;
--                                  deduct_from_asset=false는 자산 불변.
--   ST-02  authenticated / A       환불 -> 적립 9 회수, 자산 불변.
--   EXP-01 authenticated / A       예정 취소 후 restore -> PLANNED로 복구.
--   SUB-01 DB fixture + A JWT       템플릿 비활성화 -> 연결 PLANNED 회차 삭제;
--                                  재활성화 후 새 회차 INSERT 허용.
--   SUB-02 authenticated / A       월간 구독 중복 정리 RPC -> 가장 이른 PLANNED 1건 유지;
--                                  CANCELLED/CONFIRMED 보존, 타인/없는 템플릿 거부.
--   SCH-01 DB fixture 역할         PICKUP 날짜 변경 -> 연결 PLANNED expense 동기화.
--   SCH-02 DB fixture 역할         일정 날짜 변경 -> PLANNED만 동기화, CONFIRMED/CANCELLED 보존,
--                                  날짜 외 컬럼 변경은 동기화 없음.
--   REF-03 DB fixture 역할         다른 게임 ID와 일정 ID 연결 -> trigger 거부.
--   REQ-01 authenticated / A       본인 game/schedule 요청 INSERT -> PENDING 성공.
--   REQ-02 authenticated / A       다른 사용자 expense 조회/RPC 결제 및 직접 요청
--                                  상태 변경 -> 타 사용자 row 은닉/write 거부.
--   USR-01 authenticated / A       본인 users.role -> admin 변경 거부(role=user 유지),
--                                  nickname/show_unofficial_schedules 본인 수정은 성공.
--   ADM-01 authenticated / A       app_metadata.role 없는 승인 RPC -> 관리자 오류,
--                                  요청 PENDING 유지.
--   ADM-02 authenticated / A+admin game/schedule 승인·반려 -> 카탈로그/일정 생성,
--                                  요청 상태·admin memo 기록, 연결 예정 지출 동기화.
--   ADM-03 authenticated / A+admin 잘못된 game/target 일정 승인 -> 오류, 요청 PENDING,
--                                  대상 일정 값 불변.
--   R13-01 authenticated / A       타인 ID, invalid icon/oversize character request -> 거부.
--   R13-02 authenticated / A       중복/NULL/다른 게임/최대 초과 preset -> 거부.
--   R13-03 authenticated / A       슬롯 축소 후 기존 preset 유지·축소 및 캐릭터 삭제 정리.
--   R13-04 authenticated / A       비관리자 character approval/rejection RPC -> 거부·행 불변.
--   R13-05 authenticated / A+admin metadata JWT
--                                  신규 및 기존 캐릭터 request 승인 성공.
--   R13-06 DB fixture 역할         캐릭터 삭제 시 preset 배열 정리/빈 preset 삭제,
--                                  캐릭터와 preset이 남은 게임 삭제 성공.
--   R13-07 authenticated / A       custom icon path 제한 및 pending deletion 쓰기 차단.
--   R43-DB authenticated / A       max_breakthrough 초과 거부, 상한 축소 후 기존 값 유지·축소 허용.
--   R41-RLS anon                   공식 일정 SELECT 허용, 비공식 일정 행 은닉.
--   WAL-03 authenticated / A       일치하는 tier/rate 변경 성공, 불일치/음수 잔액 거부.
--   R35-01 authenticated / B       관심 일정 본인 등록·조회·삭제 성공, 중복 등록 unique_violation,
--                                  타인 user_id 등록·타인 행 조회/삭제 차단, UPDATE 권한 없음.
--   R35-02 DB fixture 역할         일정 삭제 시 관심 일정 ON DELETE CASCADE, 계정 purge 함수 정리 포함.
--   R35-03 authenticated / A       계정 삭제 대기 사용자 관심 일정 등록/조회/삭제 차단.
--   R35-04 anon                   관심 일정 SELECT/INSERT -> insufficient_privilege.
--   R93-01 authenticated / B       record_income -> 수익 행 생성·total_asset 증액, 잘못된 유형/0 이하 금액/빈 항목명 거부,
--                                  직접 INSERT/UPDATE/DELETE 거부, 타인 수익 은닉·delete_income 거부,
--                                  delete_income -> 행 삭제·total_asset 차감 복원, 같은 행 재삭제 거부.
--   R93-02 authenticated / A       계정 삭제 대기 사용자 record_income/delete_income 거부, 수익 조회 0행.
--   R93-03 DB fixture 역할         사용자 A 수익·자산 불변, 계정 purge 함수 incomes 정리 포함, 차단 트리거 존재.
--   R93-04 anon                   수익 SELECT, record_income/delete_income 실행 -> insufficient_privilege.
--   R84-01 authenticated / B       feedback_requests PENDING 등록·직접 UPDATE/DELETE 거부·타인 행 은닉,
--                                  일반 사용자 answer_feedback_request 거부, 관리자 답변·알림 생성·재답변 거부,
--                                  approve/reject_game_request 요청자 알림 1건(관리자 메모 미포함),
--                                  mark_notifications_read 단건/전체 읽음 및 link_path 검증.
--   R84-02 authenticated / A       계정 삭제 대기 사용자 건의 등록·알림 읽음 거부, 조회 차단.
--   R84-03 DB fixture 역할         purge_expired_notifications 30일 초과 삭제, 탈퇴 purge 연동·차단 트리거.
--   R84-04 anon                   feedback_requests/notifications/RPC 접근 -> insufficient_privilege.
--   R39-01 authenticated / B       notification_settings 본인 등록·조회·수정 성공, 타인 행 등록/조회/수정 차단,
--                                  직접 DELETE 및 enqueue_daily_notifications() 실행 -> insufficient_privilege.
--   R39-02 DB fixture 역할         enqueue_daily_notifications() 3종(FAVORITE_START/FAVORITE_END_D1/EXPENSE_D1) 생성·
--                                  설정 OFF 제외·기본값(행 없음=true)·중복 방지(재실행 0건)·민감정보(금액/메모) 비노출·
--                                  계정 삭제 대기 사용자 제외·탈퇴 purge 연동·차단 트리거·pg_cron 스케줄 검증.
--   R39-03 authenticated / A       계정 삭제 대기 사용자 notification_settings 조회 은닉 및 INSERT/UPDATE 차단.
--   R39-04 anon                   notification_settings 조회 및 enqueue_daily_notifications() 실행 -> insufficient_privilege.
--   R96-01 authenticated / B       push_subscriptions 직접 쓰기 거부, upsert_push_subscription 유효성·등록·공용 기기 endpoint 소유자 교체·
--                                  push_enabled 자동 true, 타인 행 은닉, delete_push_subscription 삭제·0건 시 push_enabled false,
--                                  service_role 전용 claim/complete RPC 및 push_webhook_config/set_push_webhook_config 접근 -> insufficient_privilege.
--   R96-02 DB fixture 역할         claim_pending_push_notifications(request_result=false/push_enabled=false/구독 0건/계정 삭제 대기 SKIPPED),
--                                  complete_push_notification_delivery(만료 endpoint 삭제·last_success_at·3회 재시도 후 FAILED·
--                                  삭제 알림 ID 무예외 종료 및 만료/성공 구독 정리 R106-REV-002),
--                                  claim 5분 점유(재선점 금지)·1일 초과/첫 구독 이전 알림 SKIPPED·재시도 cron 등록,
--                                  set_push_webhook_config 유효성·등록·NULL 시크릿 갱신·service_role 차단,
--                                  pg_net 웹훅 트리거 예외 격리, 탈퇴 purge 연동 및 차단 트리거 검증.
--   R96-03 authenticated / A       계정 삭제 대기 사용자 push_subscriptions 조회 은닉 및 upsert/delete RPC 차단.
--   R96-04 anon                   push_subscriptions·push_webhook_config 조회/쓰기 및 5개 RPC 실행 -> insufficient_privilege.
--   R102-01 authenticated / B      user_expense_presets 본인 CRUD·타인 행 은닉 및 쓰기 차단·CHECK 검증·20개 상한 트리거(21번째 23514 거부·삭제 후 재등록 성공).
--   R102-02 DB fixture 역할        게임 삭제 시 game_id ON DELETE SET NULL, 탈퇴 purge 연동 및 트리거 존재 검증.
--   R102-03 authenticated / A      계정 삭제 대기 사용자 user_expense_presets 조회 은닉 및 INSERT/UPDATE/DELETE 차단.
--   R102-04 anon                   user_expense_presets SELECT/INSERT -> insufficient_privilege.
--   R106-01 authenticated / B      notifications 직접 DELETE 거부, delete_notifications 빈 배열 0건·선택 삭제(타인 ID 혼입 무시)·
--                                  전체 삭제(NULL) 0건 전환 및 재호출 0건 반환.
--   R106-02 DB fixture 역할        사용자 B 선택/전체 삭제 이후 사용자 A 알림 보존 검증.
--   R106-03 authenticated / A      계정 삭제 대기 사용자 delete_notifications(선택/전체) 호출 -> insufficient_privilege.
--   R106-04 anon                   delete_notifications 호출 -> insufficient_privilege.
--   R107B-01 DB fixture 역할       EXPENSE_DUE_TODAY 당일 PLANNED N건 요약 1행·N=0 미생성·연체/확정/취소 제외·
--                                  민감정보(금액/항목명/메모) 비노출·당일 재실행 멱등·다음 날 새 행 생성·
--                                  설정 행 없음 기본 true·expense_due_today=false 및 탈퇴 대기 사용자 제외.
--   R107B-02 DB fixture 역할       EXPENSE_DUE_TODAY 푸시 선점·완료: 미구독/push_enabled=false -> SKIPPED,
--                                  push_enabled=true+구독 보유 -> claim 반환 및 SENT 전이.
--   R64    anon / B / admin        game_classification_icons 관리자 INSERT·UPSERT(updated_at 전진)·DELETE,
--                                  일반 사용자·user_metadata 스푸핑 쓰기 거부(INSERT 42501·UPDATE/DELETE 0행)·anon 쓰기 거부,
--                                  승인 게임 조회(anon/일반/관리자)·비승인 게임 차단(games_status_check + APPROVED RLS 정책 정의),
--                                  CHECK(non-WebP·https·20,001자·axis_key·빈 옵션)·트리거(없는 축/옵션) 23514 메시지 단위 검증,
--                                  옵션 순서 변경 유지·옵션 제거·축 제거 정리 및 게임 삭제 ON DELETE CASCADE.
--   R80    authenticated / A       public.users.role=admin(JWT 없음) 분류 아이콘 쓰기 허용, 권한 회수 후 쓰기 거부(42501/0행).
--   R85-01 DB fixture / B / admin  games.daily_reset_time 분 단위 CHECK, game_schedules/schedule_requests 시각·날짜·순서·분·예상 CHECK,
--                                  approve_schedule_request 신규/수정 시각·예상 복사(+R84 알림 유지), 시각만 수정 시 예정 지출 날짜 불변, anon 조회.
--   R107A-01 DB fixture 역할       generate_subscription_expenses_core 날짜 규칙 이식(MONTHLY_DAY 당월·말일 보정·지난 결제일 다음 달·확정 회차 건너뛰기·
--                                  중복 PLANNED 정리, INTERVAL_30 첫 회차·최근 확정+충전일수·단일 PLANNED 유니크, VERSION_PASS 공식·미종료만),
--                                  재실행 멱등, 계정 삭제 대기 사용자 생성 없음.
--   R107A-02 DB fixture 역할       run_daily_subscription_automation 사용자 단위 오류 격리, cron 1건 등록, 함수 권한.
--   R107A-03 authenticated / B     advance/rollback_interval_subscription 조기·정시 결제·환불 롤백, 타인 행 IDOR 거부,
--                                  내부 함수 실행 거부, ensure_subscription_expenses 호출, anon 실행 거부.
--   R109-01 DB fixture 역할       game-assets 버킷(공개·102400B·image/webp)·정책 4종·user-icons 비공개/정책 불변,
--                                  approve_schedule_request (uuid, jsonb) 단일 오버로드·권한, 픽업 제안 https 아이콘 허용·http 거부.
--   R109-02~06 anon / B / admin   game-assets anon·일반 사용자 쓰기 거부(INSERT 42501, UPDATE/DELETE 0행, user-icons→game-assets 이동 거부),
--                                  관리자 유효 경로 INSERT/UPDATE/DELETE·잘못된 경로 거부, user-icons 본인 업로드 유지,
--                                  p_pickup_icon_overrides 적용(URL·빈 문자열 NULL·키 없음 폴백)·1인자 호출 하위호환·잘못된 주소 거부·R84 알림 유지.
--   R107C-01 DB fixture / C       auto_confirm 컬럼·WALLET CHECK, 내부 함수(core·auto_confirm·run_daily) service_role 전용·공개 RPC 권한 불변,
--                                  자동 확정 매트릭스(옵션·스토어·blocked·창 2일·당일 생성·강제 실패 격리·탈퇴 대기·타 사용자), 예정일 결제(월 경계),
--                                  스냅샷 금액·스토어 적립·EARN 원장·자산 차감이 수동 결제와 동일, 다음 회차(MONTHLY·INTERVAL_30, VERSION_PASS 추가 없음), 재실행 멱등.
--   R107C-02 authenticated / C    자동 확정 INTERVAL_30 환불 시 자산·포인트 복원과 같은 트랜잭션 롤백(blocked=true, 최신 확정만, 비활성 템플릿 생략),
--                                  구버전 rollback RPC 재호출 무동작, cron 재확정 없음, restore 시 blocked=true·INTERVAL_30 중복 23505 문구.
--   R107C-03 DB fixture 역할      EXPENSE_AUTO_CONFIRMED 사용자·일자당 1건·금액/항목명 미포함·expense_due_today=false 제외, 실패 행 DUE_TODAY 포함, 일 배치 실행.
--   R75-REV-001 DB fixture 역할   검증 트리거를 끈 상태에서 R64 axis_key 형식·빈 옵션 CHECK 제약 이름을 정확히 고정(트리거 경로는 트리거 메시지만 허용).
--   R107C-REV-002 fixture / C     chk_expense_auto_confirmed_status 검증됨, PLANNED 행 auto_confirmed_at 삽입·본인 수정 -> check_violation.
--   PRIV-01 fixture / B           users SELECT 본인 행만(B는 A 프로필 조회 불가), 가입 닉네임은 메타데이터 nickname 공백 제거·20자(없으면 NULL),
--                                  65자·공백 닉네임 -> chk_users_nickname_length check_violation.
--   R114-01 DB fixture 역할       게임 월 예산 80%·100% 알림(예정+확정·end_date 귀속·포인트 할인 후 금액·정기 구독 포함·game_id 없음/취소/환불 제외),
--                                  한 달 종류별 1회·같은 날 재실행 0건·토글 false 제외·100% 직행 시 100만·본문 금액 미포함·내부 함수 권한.
--   R114-02 DB fixture 역할       MONTHLY_REPORT 1일만·전월 확정 합·전월 대비 ±%·전월 기록 없음·예산 초과 게임 수·토글 false/확정 0건 제외·재실행 0건.
--   R115-01 authenticated / I1    가져오기 행 CONFIRMED·WALLET·자산 미차감·할인/포인트 0·제목 trim·빈 메모 NULL, 가져오기와 환불 후
--                                  총자산·지갑 3종·포인트 원장 불변, 환불 행 CANCELLED/PAYMENT_REFUND.
--   R115-02 authenticated / I1    I4 위반 1행(미래·2000년 이전·없는 날짜·금액 0/소수/문자/상한 초과·빈/151자 제목·분류·없는/형식 틀린 game_id·
--                                  501자 메모·객체 아님) 시 행 번호 오류와 전체 미반영, 0행·1,001행 거부, 1,000행 성공, anon 실행 거부.
--   R115-03 authenticated / I1·I2 배치 취소는 본인·I1 값 행만(환불 행 포함) 삭제, 다른 사용자·NULL 배치 0건, 탈퇴 대기 시 두 RPC 거부.
--   ACL-01 anon                   authenticated 전용 RPC 실행 -> insufficient_privilege.
--   END    DB fixture 역할         ROLLBACK 출력 -> fixture 및 데이터 변경 전부 제거.
--
-- 각 단계는 PASS 출력과 assertion으로 확인한다. 예상된 실패는 명시적으로
-- 예외를 잡고 기대 SQL 오류/상태를 검증한다. 예외를 잡지 못하거나 assertion이
-- 실패하면 ON_ERROR_STOP으로 중단되며 최종 ROLLBACK에 도달하지 않을 수 있으므로,
-- 해당 연결을 종료해 열린 트랜잭션을 rollback한 뒤 상태를 확인한다.
-- 성공 시에도 모든 fixture와 변경은 마지막 ROLLBACK으로 취소된다.
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off

BEGIN;

SELECT gen_random_uuid() AS test_user_id \gset
SELECT gen_random_uuid() AS other_user_id \gset
SELECT set_config('chronoledger.test_user_id', :'test_user_id', true);
SELECT set_config('chronoledger.other_user_id', :'other_user_id', true);
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text,
    true
);

-- Synthetic auth users are transaction-scoped. The first insert exercises the
-- auth.users initialization trigger; the second supports cross-user RLS checks.
INSERT INTO auth.users (id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data)
VALUES (
    :'test_user_id'::uuid, 'authenticated', 'authenticated',
    'codex-sqltest-' || replace(:'test_user_id', '-', '') || '@example.invalid',
    '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password,
                        raw_app_meta_data, raw_user_meta_data)
VALUES (
    :'other_user_id'::uuid, 'authenticated', 'authenticated',
    'codex-sqltest-' || replace(:'other_user_id', '-', '') || '@example.invalid',
    '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
);

DO $$
DECLARE
    v_user UUID := current_setting('chronoledger.test_user_id')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = v_user AND total_asset = 0 AND default_budget = 0
    ) THEN
        RAISE EXCEPTION 'FAIL: auth.users trigger did not create default finances';
    END IF;
    IF (SELECT count(*) FROM public.store_wallets WHERE user_id = v_user) <> 2 THEN
        RAISE EXCEPTION 'FAIL: auth.users trigger did not create two store wallets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY'
          AND current_balance = 0 AND user_tier = 'BRONZE' AND earn_rate = 0.10
    ) OR NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GALAXY_STORE'
          AND current_balance = 0 AND (user_tier = 'GENERAL' OR user_tier IS NULL) AND earn_rate = 0.10
    ) THEN
        RAISE EXCEPTION 'FAIL: initial store wallet values are incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND total_asset = 0 AND default_budget = 0
    ) OR (
        SELECT count(*) FROM public.store_wallets
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
    ) <> 2 THEN
        RAISE EXCEPTION 'FAIL: second auth.users trigger did not create default finance/wallet rows';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND (
              current_balance <> 0 OR earn_rate <> 0.10 OR
              (platform = 'GOOGLE_PLAY' AND user_tier <> 'BRONZE') OR
              (platform = 'GALAXY_STORE' AND coalesce(user_tier, 'GENERAL') <> 'GENERAL')
          )
    ) THEN
        RAISE EXCEPTION 'FAIL: second user initial store wallet values are incorrect';
    END IF;
END;
$$;
\echo PASS: auth.users trigger creates finance row and both wallets for both fixtures

SET LOCAL ROLE authenticated;
SELECT public.set_user_finance_settings(100000, 20000);
SELECT public.adjust_wallet_balance('GOOGLE_PLAY', 500, 'rollback smoke-test seed');
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND total_asset = 100000 AND default_budget = 20000
    ) THEN
        RAISE EXCEPTION 'FAIL: finance settings RPC did not save expected asset/budget';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets AS w
        JOIN public.store_point_transactions AS t
          ON t.user_id = w.user_id AND t.platform = w.platform
        WHERE w.user_id = current_setting('chronoledger.test_user_id')::uuid
          AND w.platform = 'GOOGLE_PLAY' AND w.current_balance = 500
          AND t.transaction_type = 'MANUAL_ADJUST' AND t.amount = 500
          AND t.balance_after = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: wallet adjustment RPC did not save balance/ledger';
    END IF;
END;
$$;
\echo PASS: finance settings and manual wallet adjustment RPCs

INSERT INTO public.games (name, default_icon_url, created_by)
VALUES (
    'Codex SQL test game ' || :'test_user_id',
    'https://example.invalid/codex-sql-test.webp',
    :'test_user_id'::uuid
)
RETURNING id AS test_game_id \gset
SELECT set_config('chronoledger.test_game_id', :'test_game_id', true);

INSERT INTO public.games (name, default_icon_url, created_by)
VALUES (
    'Codex SQL test other game ' || :'other_user_id',
    'https://example.invalid/codex-sql-test-other.webp',
    :'test_user_id'::uuid
)
RETURNING id AS other_game_id \gset
SELECT set_config('chronoledger.other_game_id', :'other_game_id', true);

INSERT INTO public.game_schedules (game_id, title, schedule_type, start_date, end_date)
VALUES (
    :'test_game_id'::uuid,
    'Codex SQL test schedule',
    'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 20,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 25
)
RETURNING id AS test_schedule_id \gset
SELECT set_config('chronoledger.test_schedule_id', :'test_schedule_id', true);

INSERT INTO public.expenses (
    user_id, game_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test wallet payment', '게임',
    (now() AT TIME ZONE 'Asia/Seoul')::date,
    10000, 10000
)
RETURNING id AS wallet_payment_id \gset

SELECT set_config('chronoledger.wallet_payment_id', :'wallet_payment_id', true);
SET LOCAL ROLE authenticated;
SELECT public.process_expense_payment(
    :'wallet_payment_id'::uuid,
    10000, 1000, 100, 100,
    'GOOGLE_PLAY', 'WALLET', true,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);
RESET ROLE;

DO $$
DECLARE
    v_user UUID := auth.uid();
    v_expense UUID := current_setting('chronoledger.wallet_payment_id')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = v_expense AND status = 'CONFIRMED'
          AND final_amount = 8900 AND earned_points = 8
    ) THEN
        RAISE EXCEPTION 'FAIL: WALLET payment values or point-platform earn are incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances
        WHERE user_id = v_user AND total_asset = 91100
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct the final amount from assets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 408
    ) THEN
        RAISE EXCEPTION 'FAIL: payment did not deduct used points and credit earned points';
    END IF;
END;
$$;
\echo PASS: WALLET payment with store points deducts points/assets and earns at the point-platform rate

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.process_expense_payment(
            current_setting('chronoledger.wallet_payment_id')::uuid,
            10000, 1000, 100, 100,
            'GOOGLE_PLAY', 'WALLET', true,
            (now() AT TIME ZONE 'Asia/Seoul')::date
        );
        RAISE EXCEPTION 'FAIL: already confirmed expense was paid twice';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: duplicate payment of a confirmed expense is rejected

SET LOCAL ROLE authenticated;
SELECT public.refund_expense_payment(:'wallet_payment_id'::uuid);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.wallet_payment_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PAYMENT_REFUND'
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not mark payment as non-restorable refund';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances WHERE user_id = v_user AND total_asset = 100000
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not restore assets';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not restore used points';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_point_transactions
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY'
          AND transaction_type = 'MANUAL_ADJUST' AND amount = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund removed the independent manual adjustment';
    END IF;
END;
$$;
\echo PASS: refund restores ledgered payment effects and preserves manual adjustment

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.restore_cancelled_expense(
            current_setting('chronoledger.wallet_payment_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: payment refund was restored as a planned expense';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '복구 가능한 예정 취소 항목이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: payment-refunded expense cannot use planned-expense restore RPC

INSERT INTO public.expenses (
    user_id, game_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test store payment', '게임',
    (now() AT TIME ZONE 'Asia/Seoul')::date,
    10000, 10000
)
RETURNING id AS store_payment_id \gset
SELECT set_config('chronoledger.store_payment_id', :'store_payment_id', true);

SET LOCAL ROLE authenticated;
SELECT public.process_expense_payment(
    :'store_payment_id'::uuid,
    10000, 1000, 0, 0,
    'GOOGLE_PLAY', 'GOOGLE_PLAY', false,
    (now() AT TIME ZONE 'Asia/Seoul')::date
);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.store_payment_id')::uuid
          AND status = 'CONFIRMED' AND final_amount = 9000 AND earned_points = 9
    ) THEN
        RAISE EXCEPTION 'FAIL: store payment did not compute expected 0.10%% earn';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 509
    ) THEN
        RAISE EXCEPTION 'FAIL: earned points were not credited';
    END IF;
END;
$$;
\echo PASS: selected Google Play payment earns floor(final amount * rate / 100)

SET LOCAL ROLE authenticated;
SELECT public.refund_expense_payment(:'store_payment_id'::uuid);
RESET ROLE;
DO $$
DECLARE v_user UUID := auth.uid();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY' AND current_balance = 500
    ) THEN
        RAISE EXCEPTION 'FAIL: refund did not recover the earned points';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_finances WHERE user_id = v_user AND total_asset = 100000
    ) THEN
        RAISE EXCEPTION 'FAIL: refund changed assets despite deduct_from_asset=false';
    END IF;
END;
$$;
\echo PASS: store refund reverses earned points and respects asset-deduction toggle

INSERT INTO public.expenses (user_id, game_id, title, category, target_date)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test planned cancellation', '기타',
    (now() AT TIME ZONE 'Asia/Seoul')::date
)
RETURNING id AS planned_cancel_id \gset
SELECT set_config('chronoledger.planned_cancel_id', :'planned_cancel_id', true);
SET LOCAL ROLE authenticated;
SELECT public.cancel_planned_expense(:'planned_cancel_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.planned_cancel_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PLANNED_CANCEL'
    ) THEN
        RAISE EXCEPTION 'FAIL: planned cancellation state is incorrect';
    END IF;
END;
$$;
SET LOCAL ROLE authenticated;
SELECT public.restore_cancelled_expense(:'planned_cancel_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.planned_cancel_id')::uuid
          AND status = 'PLANNED' AND cancellation_kind IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: planned cancellation was not restored';
    END IF;
END;
$$;
\echo PASS: planned cancellation and restoration RPCs

INSERT INTO public.subscription_templates (
    user_id, game_id, title, billing_day, default_price, payment_method, is_active
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid,
    'Codex SQL test subscription', 1, 3000, 'WALLET', true
)
RETURNING id AS test_template_id \gset
SELECT set_config('chronoledger.test_template_id', :'test_template_id', true);

INSERT INTO public.expenses (
    user_id, game_id, template_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    'Codex SQL test subscription cycle', '정기 구독',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 1,
    3000, 3000
)
RETURNING id AS template_expense_id \gset
SELECT set_config('chronoledger.template_expense_id', :'template_expense_id', true);

UPDATE public.subscription_templates
SET is_active = false
WHERE id = :'test_template_id'::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: template deactivation did not delete its planned cycle';
    END IF;
END;
$$;
UPDATE public.subscription_templates
SET is_active = true
WHERE id = :'test_template_id'::uuid;
INSERT INTO public.expenses (
    user_id, game_id, template_id, title, category, target_date,
    original_price, final_amount
)
VALUES (
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    'Codex SQL test resumed subscription cycle', '정기 구독',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 1,
    3000, 3000
)
RETURNING id AS template_expense_id \gset
SELECT set_config('chronoledger.template_expense_id', :'template_expense_id', true);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'PLANNED' AND cancellation_kind IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: reactivated template did not accept a fresh planned cycle';
    END IF;
END;
$$;
\echo PASS: template pause deletes planned cycle and resume accepts a fresh cycle

WITH target_dates AS (
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '10 days')::date AS target_date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '45 days')::date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '80 days')::date
    UNION ALL
    SELECT (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 month' + INTERVAL '110 days')::date
)
INSERT INTO public.expenses (
    user_id, game_id, template_id, billing_cycle, title, category,
    status, cancellation_kind, target_date, original_price, final_amount
)
SELECT
    :'test_user_id'::uuid, :'test_game_id'::uuid, :'test_template_id'::uuid,
    to_char(target_date, 'YYYY-MM'), 'Codex SQL test dedupe cycle', '정기 구독',
    CASE WHEN row_number = 3 THEN 'CANCELLED'
         WHEN row_number = 4 THEN 'CONFIRMED'
         ELSE 'PLANNED' END,
    CASE WHEN row_number = 3 THEN 'PLANNED_CANCEL' ELSE NULL END,
    target_date, 3000, 3000
FROM (
    SELECT target_date, ROW_NUMBER() OVER (ORDER BY target_date) AS row_number
    FROM target_dates
) AS candidates;

SET LOCAL ROLE authenticated;
SELECT public.dedupe_monthly_planned_expenses(:'test_template_id'::uuid);
RESET ROLE;
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'PLANNED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe did not retain exactly one planned cycle';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.template_expense_id')::uuid
          AND status = 'PLANNED'
    ) THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe did not retain the earliest planned cycle';
    END IF;
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'CANCELLED' AND cancellation_kind = 'PLANNED_CANCEL') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe changed a cancelled cycle';
    END IF;
    IF (SELECT COUNT(*) FROM public.expenses
        WHERE template_id = current_setting('chronoledger.test_template_id')::uuid
          AND status = 'CONFIRMED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: MONTHLY_DAY dedupe changed a confirmed cycle';
    END IF;
END;
$$;
\echo PASS: monthly planned dedupe retains earliest plan and preserves cancelled/confirmed rows

SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.dedupe_monthly_planned_expenses('00000000-0000-0000-0000-000000000000'::uuid);
        RAISE EXCEPTION 'FAIL: monthly planned dedupe accepted a template the user does not own';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '정리할 수 있는 본인 소유의 활성 월간 구독 템플릿이 아닙니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: monthly planned dedupe requires an owned active template

INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, target_date,
    start_date, end_date
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule sync', '게임', s.end_date, s.start_date, s.end_date
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_expense_id \gset
SELECT set_config('chronoledger.schedule_expense_id', :'schedule_expense_id', true);

UPDATE public.game_schedules
SET start_date = start_date + 1, end_date = end_date + 1
WHERE id = :'test_schedule_id'::uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date
          AND e.end_date = s.end_date
          AND e.target_date = s.end_date
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule update did not synchronize planned expense dates';
    END IF;
END;
$$;
\echo PASS: schedule change synchronizes linked planned expense dates

INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Codex SQL test broadcast sync','BROADCAST',CURRENT_DATE,CURRENT_DATE + 1)
RETURNING id AS broadcast_schedule_id \gset
INSERT INTO public.expenses(user_id,game_id,schedule_id,title,category,target_date,start_date,end_date)
VALUES (:'test_user_id'::uuid, :'test_game_id'::uuid, :'broadcast_schedule_id'::uuid,
        'Codex SQL test broadcast expense','게임',CURRENT_DATE + 1,CURRENT_DATE,CURRENT_DATE + 1)
RETURNING id AS broadcast_expense_id \gset
SELECT set_config('chronoledger.broadcast_expense_id', :'broadcast_expense_id', true);
UPDATE public.game_schedules SET start_date=start_date + 2,end_date=end_date + 3 WHERE id=:'broadcast_schedule_id'::uuid;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.expenses e JOIN public.game_schedules s ON s.id=e.schedule_id
  WHERE e.id=current_setting('chronoledger.broadcast_expense_id')::uuid AND e.status='PLANNED'
    AND e.start_date=s.start_date AND e.end_date=s.end_date AND e.target_date=s.end_date) THEN
  RAISE EXCEPTION 'FAIL: BROADCAST date change did not synchronize planned expense';
 END IF;
END $$;
\echo PASS: BROADCAST schedule change synchronizes linked planned expense dates

-- SCH-02: 일정 날짜 변경 시 CONFIRMED/CANCELLED 지출은 보존되고 PLANNED만 동기화된다.
INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, status, target_date,
    start_date, end_date, original_price, final_amount
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule confirmed', '게임', 'CONFIRMED',
    s.start_date, s.start_date, s.end_date, 5000, 5000
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_confirmed_id \gset
SELECT set_config('chronoledger.schedule_confirmed_id', :'schedule_confirmed_id', true);

INSERT INTO public.expenses (
    user_id, game_id, schedule_id, title, category, status, cancellation_kind,
    target_date, start_date, end_date
)
SELECT
    :'test_user_id'::uuid, s.game_id, s.id,
    'Codex SQL test schedule cancelled', '게임', 'CANCELLED', 'PLANNED_CANCEL',
    s.end_date, s.start_date, s.end_date
FROM public.game_schedules AS s
WHERE s.id = :'test_schedule_id'::uuid
RETURNING id AS schedule_cancelled_id \gset
SELECT set_config('chronoledger.schedule_cancelled_id', :'schedule_cancelled_id', true);

SELECT set_config('chronoledger.before_start', start_date::text, true),
       set_config('chronoledger.before_end', end_date::text, true)
FROM public.game_schedules
WHERE id = :'test_schedule_id'::uuid;

UPDATE public.game_schedules
SET start_date = start_date + 2, end_date = end_date + 3
WHERE id = :'test_schedule_id'::uuid;
DO $$
DECLARE
    v_before_start DATE := current_setting('chronoledger.before_start')::date;
    v_before_end DATE := current_setting('chronoledger.before_end')::date;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date AND e.end_date = s.end_date
          AND e.target_date = s.end_date
          AND s.start_date = v_before_start + 2 AND s.end_date = v_before_end + 3
    ) THEN
        RAISE EXCEPTION 'FAIL: second schedule change did not synchronize the planned expense';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.schedule_confirmed_id')::uuid
          AND status = 'CONFIRMED'
          AND start_date = v_before_start AND end_date = v_before_end
          AND target_date = v_before_start
          AND final_amount = 5000
    ) THEN
        RAISE EXCEPTION 'FAIL: CONFIRMED expense was changed by schedule sync';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = current_setting('chronoledger.schedule_cancelled_id')::uuid
          AND status = 'CANCELLED'
          AND start_date = v_before_start AND end_date = v_before_end
          AND target_date = v_before_end
    ) THEN
        RAISE EXCEPTION 'FAIL: CANCELLED expense was changed by schedule sync';
    END IF;
END;
$$;

-- 날짜가 아닌 컬럼(title)만 변경하면 PLANNED 지출 날짜도 바뀌지 않아야 한다.
UPDATE public.expenses
SET start_date = start_date - 1, end_date = end_date - 1, target_date = target_date - 1
WHERE id = current_setting('chronoledger.schedule_expense_id')::uuid;
UPDATE public.game_schedules
SET title = 'Codex SQL test schedule renamed'
WHERE id = :'test_schedule_id'::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.start_date = s.start_date
    ) THEN
        RAISE EXCEPTION 'FAIL: non-date schedule update triggered expense sync';
    END IF;
END;
$$;
\echo PASS: schedule sync updates only PLANNED expenses and preserves CONFIRMED/CANCELLED

-- R56: a VERSION date change keeps version-pass PLANNED rows due on the new end date,
-- while other VERSION-linked PLANNED rows follow the new start date. Rolled back via savepoint.
SAVEPOINT r56_version_pass_sync;
INSERT INTO public.game_schedules (game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R56 version sync', 'VERSION', CURRENT_DATE + 10, CURRENT_DATE + 30)
RETURNING id AS r56_version_id \gset
SELECT set_config('chronoledger.r56_version_id', :'r56_version_id', true);
INSERT INTO public.expenses (user_id, game_id, schedule_id, title, category, target_date, start_date, end_date)
VALUES
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version pass', '게임', CURRENT_DATE + 30, CURRENT_DATE + 10, CURRENT_DATE + 30),
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version period start', '게임', CURRENT_DATE + 10, CURRENT_DATE + 10, CURRENT_DATE + 30),
    (:'test_user_id'::uuid, :'test_game_id'::uuid, :'r56_version_id'::uuid, 'R56 version single day', '게임', CURRENT_DATE + 10, CURRENT_DATE + 10, CURRENT_DATE + 10);
UPDATE public.game_schedules
SET start_date = CURRENT_DATE + 13, end_date = CURRENT_DATE + 35
WHERE id = :'r56_version_id'::uuid;
DO $$
DECLARE
    v_id UUID := current_setting('chronoledger.r56_version_id')::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version pass'
                   AND target_date = CURRENT_DATE + 35 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 version pass target_date did not follow the new end date';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version period start'
                   AND target_date = CURRENT_DATE + 13 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 start-dated VERSION expense did not follow the new start date';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version single day'
                   AND target_date = CURRENT_DATE + 13 AND start_date = CURRENT_DATE + 13 AND end_date = CURRENT_DATE + 35) THEN
        RAISE EXCEPTION 'FAIL: R56 single-day VERSION expense did not follow the new start date';
    END IF;
END;
$$;
-- A second move must keep the pass on the end date (its row now matches the new period).
UPDATE public.game_schedules
SET start_date = CURRENT_DATE + 15, end_date = CURRENT_DATE + 40
WHERE id = :'r56_version_id'::uuid;
DO $$
DECLARE
    v_id UUID := current_setting('chronoledger.r56_version_id')::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version pass' AND target_date = CURRENT_DATE + 40) THEN
        RAISE EXCEPTION 'FAIL: R56 version pass lost its end-date due date after a second move';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE schedule_id = v_id AND title = 'R56 version period start' AND target_date = CURRENT_DATE + 15) THEN
        RAISE EXCEPTION 'FAIL: R56 start-dated VERSION expense drifted to the end date after a second move';
    END IF;
END;
$$;
\echo PASS: R56 VERSION date change keeps version-pass due date on the end date and others on the start date
ROLLBACK TO SAVEPOINT r56_version_pass_sync;

DO $$
DECLARE
    v_user UUID := auth.uid();
    v_game UUID := current_setting('chronoledger.other_game_id')::uuid;
    v_schedule UUID := current_setting('chronoledger.test_schedule_id')::uuid;
BEGIN
    BEGIN
        INSERT INTO public.expenses (user_id, game_id, schedule_id, title, category, target_date)
        VALUES (v_user, v_game, v_schedule, 'Codex SQL test invalid reference', '게임',
                (now() AT TIME ZONE 'Asia/Seoul')::date);
        RAISE EXCEPTION 'FAIL: mismatched game/schedule reference was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '지출 게임과 일정 게임이 일치해야 합니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
\echo PASS: invalid expense game/schedule reference is rejected

-- 사용자 요청은 authenticated 역할과 사용자 A JWT로 생성한다.
SET LOCAL ROLE authenticated;
INSERT INTO public.game_requests (user_id, name, memo)
VALUES (
    auth.uid(),
    'ChronoLedger SQL approved game ' || :'test_user_id',
    'rollback test'
)
RETURNING id AS approved_game_request_id \gset

INSERT INTO public.game_requests (user_id, name, memo)
VALUES (
    auth.uid(),
    'ChronoLedger SQL rejected game ' || :'test_user_id',
    'rollback test'
)
RETURNING id AS rejected_game_request_id \gset

-- R33 schedule kind and PICKUP-only rerun constraint coverage.
-- Direct catalog writes are fixture-role only (authenticated is blocked by RLS);
-- the savepoint discards these rows and restores the authenticated role afterwards.
SAVEPOINT r33_direct_schedule_checks;
RESET ROLE;
INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Chrono broadcast insert','BROADCAST',CURRENT_DATE,CURRENT_DATE);
INSERT INTO public.game_schedules(game_id,title,schedule_type,is_rerun,start_date,end_date)
VALUES (:'test_game_id'::uuid,'Chrono pickup rerun','PICKUP',true,CURRENT_DATE,CURRENT_DATE);
DO $$ BEGIN
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,is_rerun,start_date,end_date)
  VALUES (current_setting('chronoledger.test_game_id')::uuid,'Invalid rerun','BROADCAST',true,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'FAIL: non-PICKUP rerun was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
\echo PASS: BROADCAST and PICKUP rerun schedules insert; non-PICKUP rerun is rejected
ROLLBACK TO SAVEPOINT r33_direct_schedule_checks;

INSERT INTO public.schedule_requests (
    user_id, game_id, title, schedule_type, start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid,
    'Chrono test schedule addition', 'BROADCAST',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 40,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 45,
    'rollback test'
)
RETURNING id AS schedule_add_request_id \gset

INSERT INTO public.schedule_requests (
    user_id, game_id, target_schedule_id, title, schedule_type,
    start_date, end_date, memo, is_rerun
)
VALUES (
    auth.uid(), :'test_game_id'::uuid, :'test_schedule_id'::uuid,
    'Chrono test schedule edit', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 50,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 55,
    'rollback test', true
)
RETURNING id AS schedule_edit_request_id \gset

INSERT INTO public.schedule_requests (
    user_id, game_id, title, schedule_type, start_date, end_date, memo
)
VALUES (
    auth.uid(), :'test_game_id'::uuid,
    'Chrono test schedule rejection', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 60,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 65,
    'rollback test'
)
RETURNING id AS schedule_reject_request_id \gset

-- Existing target belongs to test_game_id, so approving this mismatched
-- request must fail atomically and leave both request and schedule unchanged.
INSERT INTO public.schedule_requests (
    user_id, game_id, target_schedule_id, title, schedule_type,
    start_date, end_date, memo
)
VALUES (
    auth.uid(), :'other_game_id'::uuid, :'test_schedule_id'::uuid,
    'Chrono test invalid schedule target', 'PICKUP',
    (now() AT TIME ZONE 'Asia/Seoul')::date + 70,
    (now() AT TIME ZONE 'Asia/Seoul')::date + 75,
    'rollback test'
)
RETURNING id AS schedule_invalid_request_id \gset
RESET ROLE;

SELECT set_config(
    'chronoledger.approved_game_request_id',
    :'approved_game_request_id',
    true
);
SELECT set_config(
    'chronoledger.rejected_game_request_id',
    :'rejected_game_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_add_request_id',
    :'schedule_add_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_edit_request_id',
    :'schedule_edit_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_reject_request_id',
    :'schedule_reject_request_id',
    true
);
SELECT set_config(
    'chronoledger.schedule_invalid_request_id',
    :'schedule_invalid_request_id',
    true
);
\echo PASS: authenticated user can submit own pending game and schedule requests

-- The second synthetic account's row must not be visible to the first account.
INSERT INTO public.expenses (user_id, title, category, target_date)
VALUES (
    :'other_user_id'::uuid,
    'Codex SQL test foreign expense ' || :'other_user_id',
    '기타', (now() AT TIME ZONE 'Asia/Seoul')::date
)
RETURNING id AS other_user_expense_id \gset
SELECT set_config(
    'chronoledger.other_user_expense_id',
    :'other_user_expense_id',
    true
);

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_other UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_id UUID := current_setting('chronoledger.planned_cancel_id')::uuid;
    v_rows INTEGER;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'FAIL: authenticated test JWT did not resolve auth.uid()';
    END IF;
    IF EXISTS (SELECT 1 FROM public.expenses WHERE user_id = v_other) THEN
        RAISE EXCEPTION 'FAIL: RLS exposed a foreign expense';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = v_id AND user_id = v_user) THEN
        RAISE EXCEPTION 'FAIL: RLS hid an owned expense';
    END IF;

    BEGIN
        PERFORM public.process_expense_payment(
            current_setting('chronoledger.other_user_expense_id')::uuid,
            10000, 0, 0, 0,
            NULL, 'WALLET', true,
            (now() AT TIME ZONE 'Asia/Seoul')::date
        );
        RAISE EXCEPTION 'FAIL: user A paid user B expense through RPC';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.' THEN
            RAISE;
        END IF;
    END;

    BEGIN
        UPDATE public.store_wallets
        SET current_balance = current_balance + 1
        WHERE user_id = v_user AND platform = 'GOOGLE_PLAY';
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: direct wallet update bypassed RPC-only policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        UPDATE public.expenses SET status = 'CONFIRMED'
        WHERE id = v_id AND user_id = v_user AND status = 'PLANNED';
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: direct planned expense confirmation bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        DELETE FROM public.expenses WHERE id = v_id AND user_id = v_user;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: expense physical deletion bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = v_id AND user_id = v_user) THEN
        RAISE EXCEPTION 'FAIL: direct delete removed planned expense';
    END IF;

    BEGIN
        DELETE FROM public.subscription_templates
        WHERE id = current_setting('chronoledger.test_template_id')::uuid
          AND user_id = v_user;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: subscription template physical deletion bypassed policy';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.subscription_templates
        WHERE id = current_setting('chronoledger.test_template_id')::uuid
          AND user_id = v_user
    ) THEN
        RAISE EXCEPTION 'FAIL: direct delete removed subscription template';
    END IF;

    BEGIN
        UPDATE public.game_requests
        SET request_status = 'APPROVED'
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: user directly changed game request status';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'FAIL: direct request update changed its pending status';
    END IF;
END;
$$;
\echo PASS: RLS isolates users and blocks cross-user RPC/direct wallet/expense/template/request writes

RESET ROLE;

-- 일반 사용자는 본인 users.role을 바꿀 수 없고, 그 외 프로필 컬럼은 수정할 수 있다.
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INTEGER;
BEGIN
    BEGIN
        UPDATE public.users SET role = 'admin' WHERE id = auth.uid();
        RAISE EXCEPTION 'FAIL: user promoted own role to admin';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLERRM <> '사용자 역할은 변경할 수 없습니다.' THEN
            RAISE;
        END IF;
    END;

    UPDATE public.users
    SET nickname = 'codex-sqltest-renamed', show_unofficial_schedules = true
    WHERE id = auth.uid();
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'FAIL: user could not update own nickname/schedule preference';
    END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = current_setting('chronoledger.test_user_id')::uuid
          AND role = 'user' AND nickname = 'codex-sqltest-renamed'
          AND show_unofficial_schedules = true
    ) THEN
        RAISE EXCEPTION 'FAIL: users role guard or own profile update state is incorrect';
    END IF;
END;
$$;
\echo PASS: users cannot change own role but can update own profile preferences

-- 일반 사용자 JWT로 관리자 RPC를 호출하면 권한 오류가 나고 상태는 유지된다.
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.approve_game_request(
            current_setting('chronoledger.approved_game_request_id')::uuid,
            'https://example.invalid/approved-game.webp'
        );
        RAISE EXCEPTION 'FAIL: non-admin approved a game request';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '관리자 권한이 필요합니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'PENDING' AND approved_game_id IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: rejected non-admin approval changed the request';
    END IF;
END;
$$;
\echo PASS: non-admin approval is denied without changing request state

-- 관리자 권한은 JWT app_metadata claim으로만 모의한다. 사용자 row 자체는
-- fixture 사용자 A이며, 이 테스트는 실제 Auth-issued admin token을 대체하지 않는다.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', :'test_user_id',
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SET LOCAL ROLE authenticated;
SELECT public.approve_game_request(
    :'approved_game_request_id'::uuid,
    'https://example.invalid/approved-game.webp'
) AS approved_game_id \gset
SELECT set_config('chronoledger.approved_game_id', :'approved_game_id', true);
SELECT public.reject_game_request(
    :'rejected_game_request_id'::uuid,
    'duplicate proposal'
);
SELECT public.approve_schedule_request(:'schedule_add_request_id'::uuid);
SELECT public.approve_schedule_request(:'schedule_edit_request_id'::uuid);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE title='Chrono test schedule addition' AND schedule_type='BROADCAST' AND is_rerun=false) THEN RAISE EXCEPTION 'FAIL: approved BROADCAST schedule fields were not copied'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE id=current_setting('chronoledger.test_schedule_id')::uuid AND schedule_type='PICKUP' AND is_rerun=true) THEN RAISE EXCEPTION 'FAIL: approved PICKUP rerun fields were not copied'; END IF;
END $$;
SELECT public.reject_schedule_request(
    :'schedule_reject_request_id'::uuid,
    'insufficient detail'
);

DO $$
BEGIN
    BEGIN
        PERFORM public.approve_schedule_request(
            current_setting('chronoledger.schedule_invalid_request_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: mismatched schedule/game target was approved';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '요청 대상 일정이 없거나 게임이 일치하지 않습니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.approved_game_request_id')::uuid
          AND request_status = 'APPROVED'
          AND approved_game_id = current_setting('chronoledger.approved_game_id')::uuid
    ) OR NOT EXISTS (
        SELECT 1 FROM public.games
        WHERE id = current_setting('chronoledger.approved_game_id')::uuid
          AND created_by = current_setting('chronoledger.test_user_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: game approval did not atomically create/link the catalog row';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.game_requests
        WHERE id = current_setting('chronoledger.rejected_game_request_id')::uuid
          AND request_status = 'REJECTED' AND admin_memo = 'duplicate proposal'
    ) THEN
        RAISE EXCEPTION 'FAIL: game request rejection state/memo is incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_add_request_id')::uuid
          AND request_status = 'APPROVED'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.game_schedules
        WHERE game_id = current_setting('chronoledger.test_game_id')::uuid
          AND title = 'Chrono test schedule addition'
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule addition approval did not create schedule';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_edit_request_id')::uuid
          AND request_status = 'APPROVED'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.expenses AS e
        JOIN public.game_schedules AS s ON s.id = e.schedule_id
        WHERE e.id = current_setting('chronoledger.schedule_expense_id')::uuid
          AND e.status = 'PLANNED'
          AND e.start_date = s.start_date
          AND e.end_date = s.end_date
          AND e.target_date = s.end_date
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule edit was not approved/synchronized atomically';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_reject_request_id')::uuid
          AND request_status = 'REJECTED' AND admin_memo = 'insufficient detail'
    ) THEN
        RAISE EXCEPTION 'FAIL: schedule request rejection state/memo is incorrect';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.schedule_requests
        WHERE id = current_setting('chronoledger.schedule_invalid_request_id')::uuid
          AND request_status = 'PENDING'
    ) OR NOT EXISTS (
        SELECT 1 FROM public.game_schedules
        WHERE id = current_setting('chronoledger.test_schedule_id')::uuid
          AND title = 'Chrono test schedule edit'
          AND start_date = (now() AT TIME ZONE 'Asia/Seoul')::date + 50
          AND end_date = (now() AT TIME ZONE 'Asia/Seoul')::date + 55
    ) THEN
        RAISE EXCEPTION 'FAIL: failed schedule approval changed request or target state';
    END IF;
END;
$$;
\echo PASS: admin request approval/rejection and invalid-target atomicity

SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text,
    true
);
SET LOCAL ROLE authenticated;
SELECT public.update_store_wallet_settings('GOOGLE_PLAY', 'SILVER', 0.11);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE user_id = auth.uid() AND platform = 'GOOGLE_PLAY'
          AND user_tier = 'SILVER' AND earn_rate = 0.11
    ) THEN
        RAISE EXCEPTION 'FAIL: valid Google Play tier/rate was not saved';
    END IF;

    BEGIN
        PERFORM public.update_store_wallet_settings('GOOGLE_PLAY', 'SILVER', 0.10);
        RAISE EXCEPTION 'FAIL: invalid Google Play tier/rate pair was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Google Play 등급 또는 공식 적립률이 올바르지 않습니다.' THEN
            RAISE;
        END IF;
    END;

    BEGIN
        PERFORM public.adjust_wallet_balance('GOOGLE_PLAY', -1, 'invalid test');
        RAISE EXCEPTION 'FAIL: negative wallet target balance was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '플랫폼 또는 목표 잔액이 올바르지 않습니다.' THEN
            RAISE;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: wallet settings accept matching tier/rate and reject invalid values

-- R13 character catalog, requests, owned roster, and presets.
INSERT INTO public.games (name, default_icon_url, max_preset_slots, classification_schema)
VALUES ('R13 smoke game', 'https://example.invalid/game.webp', 4,
        '{"rarities":["5★","4★"],"axes":[{"key":"element","label":"속성","options":["불","물"]}]}'::jsonb)
RETURNING id AS r13_game_id \gset
SELECT set_config('chronoledger.r13_game_id', :'r13_game_id', true);
INSERT INTO public.games (name, default_icon_url) VALUES ('R13 other game', 'https://example.invalid/other.webp') RETURNING id AS r13_other_game_id \gset
SELECT set_config('chronoledger.r13_other_game_id', :'r13_other_game_id', true);
UPDATE public.games SET max_preset_slots = 1 WHERE id = :'r13_other_game_id';
INSERT INTO public.games (name, default_icon_url) VALUES ('R13 delete game', 'https://example.invalid/delete.webp') RETURNING id AS r13_delete_game_id \gset
SELECT set_config('chronoledger.r13_delete_game_id', :'r13_delete_game_id', true);

INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes) VALUES (:'r13_game_id', 'R13 character 1', 'https://example.invalid/c1.webp', '5★', '{"element":"불"}') RETURNING id AS r13_character_1 \gset
SELECT set_config('chronoledger.r13_character_1_id', :'r13_character_1', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url, rarity, attributes) VALUES (:'r13_game_id', 'R13 character 2', 'https://example.invalid/c2.webp', '4★', '{"element":"물"}') RETURNING id AS r13_character_2 \gset
SELECT set_config('chronoledger.r13_character_2_id', :'r13_character_2', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 3', 'https://example.invalid/c3.webp') RETURNING id AS r13_character_3 \gset
SELECT set_config('chronoledger.r13_character_3_id', :'r13_character_3', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 4', 'https://example.invalid/c4.webp') RETURNING id AS r13_character_4 \gset
SELECT set_config('chronoledger.r13_character_4_id', :'r13_character_4', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_game_id', 'R13 character 5', 'https://example.invalid/c5.webp') RETURNING id AS r13_character_5 \gset
SELECT set_config('chronoledger.r13_character_5_id', :'r13_character_5', true);
INSERT INTO public.game_characters(game_id, name, rarity, attributes)
VALUES (:'r13_game_id', 'R13 iconless character', '4★', '{"element":"물"}')
RETURNING id AS r13_iconless_character \gset
SELECT set_config('chronoledger.r13_iconless_character_id', :'r13_iconless_character', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_other_game_id', 'R13 other character', 'https://example.invalid/other-char.webp') RETURNING id AS r13_other_character \gset
SELECT set_config('chronoledger.r13_other_character_id', :'r13_other_character', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_other_game_id', 'R13 other character 2', 'https://example.invalid/other-char-2.webp') RETURNING id AS r13_other_character_2 \gset
SELECT set_config('chronoledger.r13_other_character_2_id', :'r13_other_character_2', true);
INSERT INTO public.game_characters(game_id, name, default_icon_url) VALUES (:'r13_delete_game_id', 'R13 delete character', 'https://example.invalid/delete-char.webp') RETURNING id AS r13_delete_character \gset
SELECT set_config('chronoledger.r13_delete_character_id', :'r13_delete_character', true);

INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url, rarity, attributes)
VALUES (:'test_user_id', :'r13_game_id', 'R13 new request', 'https://example.invalid/request.webp', '5★', '{"element":"불"}') RETURNING id AS r13_new_request \gset
SELECT set_config('chronoledger.r13_new_request_id', :'r13_new_request', true);
INSERT INTO public.character_requests(user_id, game_id, target_character_id, name, rarity, attributes)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_1', 'R13 renamed character', '4★', '{"element":"물"}') RETURNING id AS r13_update_request \gset
SELECT set_config('chronoledger.r13_update_request_id', :'r13_update_request', true);
INSERT INTO public.character_requests(user_id, game_id, name, rarity, attributes)
VALUES (:'test_user_id', :'r13_game_id', 'R13 iconless request', '4★', '{"element":"물"}')
RETURNING id AS r13_iconless_request \gset
SELECT set_config('chronoledger.r13_iconless_request_id', :'r13_iconless_request', true);

SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name) VALUES (current_setting('chronoledger.other_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid, 'forged owner');
        RAISE EXCEPTION 'FAIL: character request accepted another user_id';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'bad icon', 'http://example.invalid/icon.png');
        RAISE EXCEPTION 'FAIL: character request accepted invalid icon';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, default_icon_url) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'oversized icon', repeat('x', 150001));
        RAISE EXCEPTION 'FAIL: character request accepted oversized icon';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name, admin_memo) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'forged admin memo', 'forged');
        RAISE EXCEPTION 'FAIL: character request accepted admin_memo';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM public.approve_character_request(current_setting('chronoledger.r13_new_request_id')::uuid);
        RAISE EXCEPTION 'FAIL: non-admin approved character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN
        PERFORM public.reject_character_request(current_setting('chronoledger.r13_update_request_id')::uuid, 'forbidden');
        RAISE EXCEPTION 'FAIL: non-admin rejected character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_new_request_id')::uuid) <> 'PENDING'
       OR (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_update_request_id')::uuid) <> 'PENDING'
       OR (SELECT name FROM public.game_characters WHERE id = current_setting('chronoledger.r13_character_1_id')::uuid) <> 'R13 character 1' THEN
        RAISE EXCEPTION 'FAIL: non-admin character RPC changed data';
    END IF;
END $$;
\echo PASS: character request constraints and null-safe non-admin RPC denial

SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id, custom_icon_path) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_1_id')::uuid, 'wrong/path.webp');
        RAISE EXCEPTION 'FAIL: invalid custom icon path accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'duplicate', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: duplicate preset characters accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'null member', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, NULL]::uuid[]);
        RAISE EXCEPTION 'FAIL: NULL preset member accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'wrong game', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_other_character_id')::uuid]);
        RAISE EXCEPTION 'FAIL: cross-game preset accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'too many', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid, current_setting('chronoledger.r13_character_3_id')::uuid, current_setting('chronoledger.r13_character_4_id')::uuid, current_setting('chronoledger.r13_character_5_id')::uuid]);
        RAISE EXCEPTION 'FAIL: over-limit preset accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

INSERT INTO public.user_characters(user_id, game_id, character_id, custom_icon_path)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_1', :'test_user_id' || '/characters/' || :'r13_character_1' || '.webp');
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'over-limit preserved', ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid, :'r13_character_3'::uuid, :'r13_character_4'::uuid]) RETURNING id AS r13_over_limit_preset \gset
SELECT set_config('chronoledger.r13_over_limit_preset_id', :'r13_over_limit_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'game change slot guard', ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid]) RETURNING id AS r13_game_change_preset \gset
SELECT set_config('chronoledger.r13_game_change_preset_id', :'r13_game_change_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_game_id', 'kept when empty', ARRAY[:'r13_character_5'::uuid]) RETURNING id AS r13_empty_preset \gset
SELECT set_config('chronoledger.r13_empty_preset_id', :'r13_empty_preset', true);
INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids)
VALUES (:'test_user_id', :'r13_delete_game_id', 'cascade preset', ARRAY[:'r13_delete_character'::uuid]) RETURNING id AS r13_delete_preset \gset
SELECT set_config('chronoledger.r13_delete_preset_id', :'r13_delete_preset', true);
UPDATE public.games SET max_preset_slots = 2 WHERE id = :'r13_game_id';
DELETE FROM public.game_characters WHERE id = :'r13_character_4'::uuid;
DELETE FROM public.game_characters WHERE id = :'r13_character_5'::uuid;
DO $$ BEGIN
    IF (SELECT cardinality(character_ids) FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_over_limit_preset_id')::uuid) <> 3 THEN RAISE EXCEPTION 'FAIL: character delete did not shrink over-limit preset'; END IF;
    IF (SELECT character_ids FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_empty_preset_id')::uuid) IS DISTINCT FROM '{}'::uuid[] THEN RAISE EXCEPTION 'FAIL: empty preset was not preserved'; END IF;
END $$;
DO $$ BEGIN
    BEGIN
        UPDATE public.user_character_presets
        SET game_id = current_setting('chronoledger.r13_other_game_id')::uuid,
            character_ids = ARRAY[
                current_setting('chronoledger.r13_other_character_id')::uuid,
                current_setting('chronoledger.r13_other_character_2_id')::uuid
            ]
        WHERE id = current_setting('chronoledger.r13_game_change_preset_id')::uuid;
        RAISE EXCEPTION 'FAIL: game change bypassed target slot limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
UPDATE public.user_character_presets SET character_ids = ARRAY[:'r13_character_1'::uuid, :'r13_character_2'::uuid] WHERE id = :'r13_over_limit_preset';
\echo PASS: preset limits, non-destructive slot reduction, game-change slot cap, and character-delete cleanup

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
SET LOCAL ROLE authenticated;
SELECT public.approve_character_request(:'r13_new_request'::uuid);
SELECT public.approve_character_request(:'r13_update_request'::uuid);
SELECT public.approve_character_request(:'r13_iconless_request'::uuid);
RESET ROLE;
DO $$ BEGIN
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_new_request_id')::uuid) <> 'APPROVED'
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND name = 'R13 new request' AND rarity = '5★') THEN RAISE EXCEPTION 'FAIL: admin could not approve new character'; END IF;
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_update_request_id')::uuid) <> 'APPROVED'
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE id = current_setting('chronoledger.r13_character_1_id')::uuid AND name = 'R13 renamed character' AND default_icon_url = 'https://example.invalid/c1.webp') THEN RAISE EXCEPTION 'FAIL: admin update did not preserve omitted icon'; END IF;
    IF (SELECT request_status FROM public.character_requests WHERE id = current_setting('chronoledger.r13_iconless_request_id')::uuid) <> 'APPROVED'
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND name = 'R13 iconless request' AND default_icon_url IS NULL) THEN
        RAISE EXCEPTION 'FAIL: admin could not approve iconless regular character';
    END IF;
END $$;
\echo PASS: admin metadata JWT approves new and existing character requests

DELETE FROM public.games WHERE id = :'r13_delete_game_id'::uuid;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.user_character_presets WHERE id = current_setting('chronoledger.r13_delete_preset_id')::uuid)
       OR EXISTS (SELECT 1 FROM public.game_characters WHERE id = current_setting('chronoledger.r13_delete_character_id')::uuid) THEN RAISE EXCEPTION 'FAIL: game deletion did not cascade characters and presets'; END IF;
END $$;
\echo PASS: deleting game with characters and presets succeeds

-- 게임별 최대 돌파 상한 검증 및 상한 축소 시 기존 행 보존 동작을 확인한다.
UPDATE public.games SET max_breakthrough = 2 WHERE id = current_setting('chronoledger.r13_game_id')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id, breakthrough_level)
        VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_3_id')::uuid, 3);
        RAISE EXCEPTION 'FAIL: breakthrough insert exceeded game limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
INSERT INTO public.user_characters(user_id, game_id, character_id, breakthrough_level)
VALUES (:'test_user_id', :'r13_game_id', :'r13_character_3', 2);
UPDATE public.games SET max_breakthrough = 1 WHERE id = :'r13_game_id';
SET LOCAL ROLE authenticated;
UPDATE public.user_characters SET is_favorite = true WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
UPDATE public.user_characters SET breakthrough_level = 1 WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
DO $$ BEGIN
    BEGIN
        UPDATE public.user_characters SET breakthrough_level = 2
        WHERE user_id = auth.uid() AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid;
        RAISE EXCEPTION 'FAIL: breakthrough increase exceeded reduced game limit';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF (SELECT breakthrough_level FROM public.user_characters WHERE user_id = current_setting('chronoledger.test_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid) <> 1
       OR NOT (SELECT is_favorite FROM public.user_characters WHERE user_id = current_setting('chronoledger.test_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid) THEN
        RAISE EXCEPTION 'FAIL: breakthrough reduction/favorite update was not preserved';
    END IF;
END $$;
\echo PASS: game breakthrough cap rejects excess values and preserves existing values on cap reduction

-- R63 favorite sections, ownership guard, append ordering, and atomic reorder.
RESET ROLE;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.user_characters(user_id, game_id, character_id, is_owned, is_favorite)
VALUES (:'other_user_id', :'r13_game_id', :'r13_character_1', true, true),
       (:'other_user_id', :'r13_game_id', :'r13_character_2', true, true),
       (:'other_user_id', :'r13_game_id', :'r13_character_3', false, true);
DO $$
DECLARE v_first INTEGER; v_second INTEGER; v_third INTEGER;
BEGIN
    SELECT favorite_sort_order INTO v_first FROM public.user_characters
    WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_1_id')::uuid;
    SELECT favorite_sort_order INTO v_second FROM public.user_characters
    WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_2_id')::uuid;
    IF v_first <> 1 OR v_second <> 2 OR EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid AND is_favorite
    ) THEN RAISE EXCEPTION 'FAIL: R63 initial favorite ordering or unowned guard'; END IF;
END $$;
UPDATE public.user_characters SET is_owned = true, is_favorite = true
WHERE user_id = :'other_user_id' AND character_id = :'r13_character_3';
SELECT public.reorder_favorite_characters(
    :'r13_game_id',
    ARRAY[:'r13_character_2'::uuid, :'r13_character_1'::uuid, :'r13_character_3'::uuid]
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND is_favorite AND favorite_sort_order = 1
          AND character_id = current_setting('chronoledger.r13_character_2_id')::uuid
    ) OR NOT EXISTS (
        SELECT 1 FROM public.user_characters
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND character_id = current_setting('chronoledger.r13_character_3_id')::uuid
          AND favorite_sort_order = 3
    ) THEN RAISE EXCEPTION 'FAIL: R63 reorder did not persist atomically'; END IF;
    BEGIN
        PERFORM public.reorder_favorite_characters(current_setting('chronoledger.r13_game_id')::uuid, ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: R63 incomplete favorite set was accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
\echo PASS: R63 favorite ownership guard, append ordering, and reorder RPC

INSERT INTO public.account_deletion_requests(user_id, status_token_hash, status) VALUES (:'test_user_id', repeat('a', 64), 'PENDING');
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
-- auth.uid() reads request.jwt.claim.sub first; the R63 block left it on the other user.
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        INSERT INTO public.character_requests(user_id, game_id, name) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'blocked');
        RAISE EXCEPTION 'FAIL: pending user inserted character request';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_characters(user_id, game_id, character_id) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid);
        RAISE EXCEPTION 'FAIL: pending user inserted user character';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
    BEGIN
        INSERT INTO public.user_character_presets(user_id, game_id, title, character_ids) VALUES (auth.uid(), current_setting('chronoledger.r13_game_id')::uuid, 'blocked', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid]);
        RAISE EXCEPTION 'FAIL: pending user inserted preset';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
\echo PASS: pending deletion user is blocked from writes to all R13 personal tables

INSERT INTO public.game_schedules(game_id, title, schedule_type, is_official, start_date, end_date)
VALUES (:'r13_game_id', 'R41 official guest schedule', 'VERSION', true, CURRENT_DATE, CURRENT_DATE),
       (:'r13_game_id', 'R41 unofficial guest schedule', 'CONTENTS', false, CURRENT_DATE, CURRENT_DATE);

-- SECURITY DEFINER RPC execute 권한은 authenticated에만 있어야 한다.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id', 'role', 'anon')::text,
    true
);
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = current_setting('chronoledger.r13_game_id')::uuid AND status = 'APPROVED')
       OR (SELECT count(*) FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title LIKE 'R41 %') <> 1
       OR NOT EXISTS (SELECT 1 FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title = 'R41 official guest schedule')
       OR EXISTS (SELECT 1 FROM public.game_schedules WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND title = 'R41 unofficial guest schedule') THEN
        RAISE EXCEPTION 'FAIL: anon schedule policy did not expose official schedules only';
    END IF;
END $$;
\echo PASS: anon can read approved games and official schedules but not unofficial schedules

-- R52 + Amendment A1: template validation, pickup references, deletion cleanup, pickup-only catalog characters, user proposals, approval and anon boundary.
RESET ROLE;
DO $$
DECLARE
 v_game UUID := current_setting('chronoledger.r13_game_id')::uuid;
 v_other_game UUID := current_setting('chronoledger.r13_other_game_id')::uuid;
 v_user UUID := current_setting('chronoledger.other_user_id')::uuid;
 v_pickup UUID; v_guard UUID; v_canonical UUID := current_setting('chronoledger.r13_character_1_id')::uuid;
 v_cleanup_character UUID; v_approved_req UUID;
 v_request UUID; v_schedule UUID; v_ids UUID[]; v_many UUID[]; v_before INTEGER;
BEGIN
 UPDATE public.games SET classification_schema='{"character_label":"Operative","rarities":["5★"],"axes":[{"key":"element","label":"속성","options":["불"]}]}'::jsonb WHERE id=v_game;
 IF NOT public.is_valid_classification_schema('{"rarities":[],"axes":[]}'::jsonb)
 OR NOT public.is_valid_classification_schema('{"character_label":"Operative","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":"","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":"123456789012345678901","rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"character_label":7,"rarities":[],"axes":[]}'::jsonb)
 OR public.is_valid_classification_schema('{"rarities":[],"axes":[{"key":"a","label":"a","options":["1"]},{"key":"b","label":"b","options":["1"]},{"key":"c","label":"c","options":["1"]}]}'::jsonb)
 THEN RAISE EXCEPTION 'FAIL: character template validation regression'; END IF;

 v_ids := ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid];
 INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_game,'R52 pickup characters','PICKUP',v_ids,CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_schedule;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 non pickup','VERSION',v_ids,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 bad character game','PICKUP',ARRAY[current_setting('chronoledger.r13_other_character_id')::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_CROSS_GAME_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_CROSS_GAME_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 duplicate characters','PICKUP',ARRAY[v_ids[1],v_ids[1]],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_DUPLICATE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_DUPLICATE_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 null character ID','PICKUP',ARRAY[v_ids[1],NULL]::uuid[],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_NULL_ID_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_NULL_ID_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 missing character ID','PICKUP',ARRAY['ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_MISSING_ID_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_SCHEDULE_MISSING_ID_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_user,v_game,'R52 request non pickup','VERSION',v_ids,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_REQUEST_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_user,v_game,'R52 request cross game','PICKUP',ARRAY[current_setting('chronoledger.r13_other_character_id')::uuid],CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_REQUEST_CROSS_GAME_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_REQUEST_CROSS_GAME_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%같은 게임의 카탈로그%' THEN RAISE; END IF; END;

 INSERT INTO public.game_characters(game_id,name,default_icon_url)
 SELECT v_game,'R52 many '||n,'https://example.invalid/extra.webp' FROM generate_series(1,9) n;
 SELECT array_agg(id) INTO v_many FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 many %';
 BEGIN
  INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
  VALUES(v_game,'R52 too many characters','PICKUP',v_many,CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_SCHEDULE_OVER_EIGHT_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 DELETE FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 many %';

 -- Deletion cleanup removes deleted IDs from schedules and PENDING requests while keeping APPROVED requests intact.
 INSERT INTO public.game_characters(game_id,name,default_icon_url)
 VALUES(v_game,'R52 cleanup character','https://example.invalid/cleanup.webp') RETURNING id INTO v_cleanup_character;
 INSERT INTO public.game_schedules(game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_game,'R52 cleanup schedule','PICKUP',ARRAY[v_cleanup_character],CURRENT_DATE,CURRENT_DATE);
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_user,v_game,'R52 cleanup pending request','PICKUP',ARRAY[v_cleanup_character],CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_request;
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,request_status,start_date,end_date)
 VALUES(v_user,v_game,'R52 cleanup approved request','PICKUP',ARRAY[v_cleanup_character],'APPROVED',CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_approved_req;
 DELETE FROM public.game_characters WHERE id=v_cleanup_character;
 IF NOT EXISTS(SELECT 1 FROM public.game_schedules WHERE title='R52 cleanup schedule' AND cardinality(pickup_character_ids)=0) THEN
  RAISE EXCEPTION 'FAIL: character deletion did not clean schedule references';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schedule_requests WHERE id=v_request AND cardinality(pickup_character_ids)=0) THEN
  RAISE EXCEPTION 'FAIL: character deletion did not clean pending request references';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schedule_requests WHERE id=v_approved_req AND cardinality(pickup_character_ids)=1) THEN
  RAISE EXCEPTION 'FAIL: character deletion mutated non-PENDING request history';
 END IF;

 INSERT INTO public.game_characters(game_id,name,default_icon_url,is_pickup_only)
 VALUES(v_game,'R52 iconless pickup',NULL,true) RETURNING id INTO v_pickup;
 BEGIN
  INSERT INTO public.user_characters(user_id,game_id,character_id) VALUES(v_user,v_game,v_pickup);
  RAISE EXCEPTION 'R52_EXPECTED_USER_CHARACTER_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_USER_CHARACTER_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO public.user_character_presets(user_id,game_id,title,character_ids) VALUES(v_user,v_game,'R52 pickup preset',ARRAY[v_pickup]);
  RAISE EXCEPTION 'R52_EXPECTED_PRESET_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_PRESET_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 INSERT INTO public.character_requests(user_id,game_id,target_character_id,name)
 VALUES(v_user,v_game,v_canonical,'R52 target guard') RETURNING id INTO v_request;
 BEGIN
  UPDATE public.character_requests SET target_character_id=v_pickup WHERE id=v_request;
  RAISE EXCEPTION 'R52_EXPECTED_TARGET_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_TARGET_REJECTION' THEN RAISE; ELSIF SQLERRM NOT LIKE '%정식 캐릭터%' THEN RAISE; END IF; END;
 INSERT INTO public.game_characters(game_id,name,default_icon_url) VALUES(v_game,'R52 downgrade guard','https://example.invalid/guard.webp') RETURNING id INTO v_guard;
 INSERT INTO public.user_characters(user_id,game_id,character_id) VALUES(v_user,v_game,v_guard);
 BEGIN
  UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
  RAISE EXCEPTION 'R52_EXPECTED_DOWNGRADE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_DOWNGRADE_REJECTION' THEN RAISE; ELSIF SQLERRM <> '사용자 보유 또는 프리셋에서 참조 중인 정식 캐릭터는 픽업 전용으로 변경할 수 없습니다.' THEN RAISE; END IF; END;
 DELETE FROM public.user_characters WHERE user_id=v_user AND character_id=v_guard;
 INSERT INTO public.user_character_presets(user_id,game_id,title,character_ids) VALUES(v_user,v_game,'R52 downgrade preset',ARRAY[v_guard]);
 BEGIN
  UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
  RAISE EXCEPTION 'R52_EXPECTED_PRESET_DOWNGRADE_REJECTION';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='R52_EXPECTED_PRESET_DOWNGRADE_REJECTION' THEN RAISE; ELSIF SQLERRM <> '사용자 보유 또는 프리셋에서 참조 중인 정식 캐릭터는 픽업 전용으로 변경할 수 없습니다.' THEN RAISE; END IF; END;
 DELETE FROM public.user_character_presets WHERE user_id=v_user AND title='R52 downgrade preset';
 UPDATE public.game_characters SET is_pickup_only=true WHERE id=v_guard;
 UPDATE public.game_characters SET is_pickup_only=false WHERE id=v_guard;
 IF NOT public.is_valid_pickup_new_characters('[{"name":" 신규 ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters('[{"name":" ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters(jsonb_build_array(jsonb_build_object('name',repeat('x',101),'icon_url',NULL)))
 OR public.is_valid_pickup_new_characters('[{"name":"dup","icon_url":null},{"name":" dup ","icon_url":null}]'::jsonb)
 OR public.is_valid_pickup_new_characters('[{"name":"external","icon_url":"http://example.invalid/a.webp"}]'::jsonb)
 OR public.is_valid_pickup_new_characters(jsonb_build_array(jsonb_build_object('name','large','icon_url','data:image/webp;base64,'||repeat('A',150001))))
 THEN RAISE EXCEPTION 'FAIL: pickup proposal validation accepted invalid data'; END IF;
 INSERT INTO public.game_characters(game_id,name,default_icon_url) SELECT v_game,'R52 count '||n,'https://example.invalid/count.webp' FROM generate_series(1,8) n;
 SELECT array_agg(id) INTO v_ids FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 count %';
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
  VALUES(v_user,v_game,'R52 combined limit','PICKUP',v_ids,'[{"name":"ninth","icon_url":null}]',CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_NINE_CHARACTER_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_new_characters,start_date,end_date)
  VALUES(v_user,v_game,'R52 invalid non-pickup proposal','VERSION','[{"name":"x","icon_url":null}]',CURRENT_DATE,CURRENT_DATE);
  RAISE EXCEPTION 'R52_EXPECTED_NON_PICKUP_REJECTION';
 EXCEPTION WHEN check_violation THEN NULL; END;
 v_ids := ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid,current_setting('chronoledger.r13_character_2_id')::uuid];
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
 VALUES(v_user,v_game,'R52 proposal approval','PICKUP',ARRAY[v_ids[1]],'[ {"name":"R52 proposed no icon","icon_url":null}, {"name":"R13 character 2","icon_url":null} ]',CURRENT_DATE,CURRENT_DATE)
 RETURNING id INTO v_request;
 PERFORM set_config('chronoledger.r52_approval_request',v_request::text,true);
 INSERT INTO public.game_schedules(game_id,title,schedule_type,start_date,end_date)
 VALUES(v_game,'R52 edit target','PICKUP',CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_schedule;
 PERFORM set_config('chronoledger.r52_edit_target',v_schedule::text,true);
 INSERT INTO public.schedule_requests(user_id,game_id,target_schedule_id,title,schedule_type,pickup_character_ids,start_date,end_date)
 VALUES(v_user,v_game,v_schedule,'R52 edited pickup','PICKUP',ARRAY[v_ids[2]],CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_request;
 PERFORM set_config('chronoledger.r52_edit_request',v_request::text,true);
END $$;

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id','role','authenticated','app_metadata',jsonb_build_object('role','admin'))::text,true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
SELECT public.approve_schedule_request(current_setting('chronoledger.r52_approval_request')::uuid);
SELECT public.approve_schedule_request(current_setting('chronoledger.r52_edit_request')::uuid);
DO $$
DECLARE v_game UUID := current_setting('chronoledger.r13_game_id')::uuid; v_new UUID; v_schedule UUID; v_result_ids UUID[];
BEGIN
 SELECT id INTO v_new FROM public.game_characters WHERE game_id=v_game AND name='R52 proposed no icon';
 IF v_new IS NULL OR (SELECT is_pickup_only OR default_icon_url IS NOT NULL FROM public.game_characters WHERE id=v_new) IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: proposal was not created as iconless pickup-only'; END IF;
 SELECT id,pickup_character_ids INTO v_schedule,v_result_ids FROM public.game_schedules WHERE title='R52 proposal approval';
 IF cardinality(v_result_ids)<>3 OR v_result_ids[1]<>current_setting('chronoledger.r13_character_1_id')::uuid OR v_result_ids[2]<>(SELECT id FROM public.game_characters WHERE game_id=v_game AND name='R52 proposed no icon') OR v_result_ids[3]<>current_setting('chronoledger.r13_character_2_id')::uuid THEN RAISE EXCEPTION 'FAIL: approval did not preserve selection/proposal order and reuse existing character'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.game_schedules WHERE id=current_setting('chronoledger.r52_edit_target')::uuid AND title='R52 edited pickup' AND pickup_character_ids=ARRAY[current_setting('chronoledger.r13_character_2_id')::uuid]) THEN RAISE EXCEPTION 'FAIL: edit approval did not copy pickup character references'; END IF;
END $$;

RESET ROLE;
DO $$
DECLARE v_game UUID := current_setting('chronoledger.r13_game_id')::uuid; v_user UUID := current_setting('chronoledger.other_user_id')::uuid; v_ids UUID[]; v_req UUID; v_new_name TEXT := 'R52 rollback proposal';
BEGIN
 INSERT INTO public.game_characters(game_id,name,default_icon_url) SELECT v_game,'R52 limit '||n,'https://example.invalid/a.webp' FROM generate_series(1,8) n;
 SELECT array_agg(id) INTO v_ids FROM public.game_characters WHERE game_id=v_game AND name LIKE 'R52 limit %';
 ALTER TABLE public.schedule_requests DROP CONSTRAINT chk_schedule_requests_pickup_new_characters_valid;
 INSERT INTO public.schedule_requests(user_id,game_id,title,schedule_type,pickup_character_ids,pickup_new_characters,start_date,end_date)
 VALUES(v_user,v_game,'R52 overlimit atomic','PICKUP',v_ids,jsonb_build_array(jsonb_build_object('name',v_new_name,'icon_url',NULL)),CURRENT_DATE,CURRENT_DATE) RETURNING id INTO v_req;
 PERFORM set_config('chronoledger.r52_overlimit_request',v_req::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.approve_schedule_request(current_setting('chronoledger.r52_overlimit_request')::uuid);
 RAISE EXCEPTION 'R52_EXPECTED_APPROVAL_ROLLBACK';
EXCEPTION WHEN check_violation THEN NULL; END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.game_characters WHERE name='R52 rollback proposal') OR EXISTS(SELECT 1 FROM public.game_schedules WHERE title='R52 overlimit atomic') THEN RAISE EXCEPTION 'FAIL: over-limit approval did not roll back atomically'; END IF;
END $$;
DELETE FROM public.schedule_requests WHERE id=current_setting('chronoledger.r52_overlimit_request')::uuid;
ALTER TABLE public.schedule_requests ADD CONSTRAINT chk_schedule_requests_pickup_new_characters_valid CHECK (public.is_valid_pickup_new_characters(pickup_new_characters) AND (schedule_type='PICKUP' OR jsonb_array_length(pickup_new_characters)=0) AND cardinality(pickup_character_ids)+jsonb_array_length(pickup_new_characters)<=8);

SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.game_characters WHERE id=current_setting('chronoledger.r13_character_2_id')::uuid AND is_pickup_only IS NOT NULL) THEN RAISE EXCEPTION 'FAIL: anon could not read is_pickup_only'; END IF;
 BEGIN PERFORM created_by FROM public.game_characters LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_CREATED_BY_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_characters LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_character_presets LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.character_requests LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.schedule_requests LIMIT 1; RAISE EXCEPTION 'R52_EXPECTED_ANON_DENIAL'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
\echo PASS: R52 + Amendment A1 template validation, pickup references, deletion cleanup, proposals, atomic approval and anon boundary
-- R35: favorite schedules are owner-only, hidden from other users and anon,
-- blocked for pending-deletion users, cleaned up on schedule delete and account purge.
-- User A has a PENDING account deletion request since R13-07, so user B is the regular owner here.
RESET ROLE;
INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R35 favorite target', 'VERSION', CURRENT_DATE, CURRENT_DATE + 7)
RETURNING id AS r35_schedule_id \gset
INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date)
VALUES (:'test_game_id'::uuid, 'R35 cascade target', 'PICKUP', CURRENT_DATE, CURRENT_DATE + 3)
RETURNING id AS r35_cascade_schedule_id \gset
SELECT set_config('chronoledger.r35_schedule_id', :'r35_schedule_id', true);
SELECT set_config('chronoledger.r35_cascade_schedule_id', :'r35_cascade_schedule_id', true);
-- Pre-existing favorite of user A (pending deletion) for cross-user and pending-delete checks.
INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
VALUES (:'test_user_id'::uuid, :'r35_schedule_id'::uuid);

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_other UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_schedule UUID := current_setting('chronoledger.r35_schedule_id')::uuid;
    v_cascade UUID := current_setting('chronoledger.r35_cascade_schedule_id')::uuid;
    v_rows INTEGER;
BEGIN
    IF v_user IS DISTINCT FROM current_setting('chronoledger.other_user_id')::uuid THEN
        RAISE EXCEPTION 'FAIL: R35 JWT did not resolve user B';
    END IF;

    INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_schedule);
    IF (SELECT count(*) FROM public.user_favorite_schedules) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.user_favorite_schedules WHERE user_id = v_user AND schedule_id = v_schedule) THEN
        RAISE EXCEPTION 'FAIL: R35 owner could not read only own favorite';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_favorite_schedules WHERE user_id = v_other) THEN
        RAISE EXCEPTION 'FAIL: R35 RLS exposed another user favorite';
    END IF;

    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_schedule);
        RAISE EXCEPTION 'FAIL: R35 duplicate favorite was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_other, v_cascade);
        RAISE EXCEPTION 'FAIL: R35 user B inserted a favorite for user A';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    DELETE FROM public.user_favorite_schedules WHERE user_id = v_other;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R35 user B deleted user A favorite';
    END IF;

    BEGIN
        UPDATE public.user_favorite_schedules SET schedule_id = v_cascade WHERE user_id = v_user;
        RAISE EXCEPTION 'FAIL: R35 favorite UPDATE was not denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    DELETE FROM public.user_favorite_schedules WHERE user_id = v_user AND schedule_id = v_schedule;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
        RAISE EXCEPTION 'FAIL: R35 owner could not delete own favorite';
    END IF;

    INSERT INTO public.user_favorite_schedules(user_id, schedule_id) VALUES (v_user, v_cascade);
END $$;
RESET ROLE;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND schedule_id = current_setting('chronoledger.r35_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 user A favorite changed by user B';
    END IF;
    DELETE FROM public.game_schedules WHERE id = current_setting('chronoledger.r35_cascade_schedule_id')::uuid;
    IF EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE schedule_id = current_setting('chronoledger.r35_cascade_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 schedule delete did not cascade to favorites';
    END IF;
    IF position('user_favorite_schedules' IN pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure)) = 0 THEN
        RAISE EXCEPTION 'FAIL: R35 account purge does not delete favorite schedules';
    END IF;
END $$;

-- Pending-deletion user A cannot add, read or remove favorites.
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_rows INTEGER;
BEGIN
    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
        SELECT auth.uid(), id FROM public.game_schedules WHERE title = 'R41 official guest schedule' LIMIT 1;
        RAISE EXCEPTION 'FAIL: R35 pending user inserted favorite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM public.user_favorite_schedules) THEN
        RAISE EXCEPTION 'FAIL: R35 pending user could read favorites';
    END IF;
    BEGIN
        DELETE FROM public.user_favorite_schedules WHERE user_id = auth.uid();
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows <> 0 THEN
            RAISE EXCEPTION 'FAIL: R35 pending user deleted favorite';
        END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_favorite_schedules
        WHERE user_id = current_setting('chronoledger.test_user_id')::uuid
          AND schedule_id = current_setting('chronoledger.r35_schedule_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R35 pending user favorite was removed';
    END IF;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
    BEGIN
        PERFORM 1 FROM public.user_favorite_schedules LIMIT 1;
        RAISE EXCEPTION 'FAIL: R35 anon read favorites';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
        VALUES (current_setting('chronoledger.other_user_id')::uuid, current_setting('chronoledger.r35_schedule_id')::uuid);
        RAISE EXCEPTION 'FAIL: R35 anon inserted favorite';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R35 favorite schedules owner CRUD, duplicate/cross-user/UPDATE denial, cascade, purge, pending-deletion and anon boundary

-- R93: income history is owner-read-only, written only through record_income/delete_income,
-- which keep user_finances.total_asset in sync; pending-deletion users and anon are blocked.
-- User A still has a PENDING account deletion request here, so user B is the regular owner.
RESET ROLE;
-- auth.uid() must not be user A while the fixture role inserts A's row (pending-deletion trigger).
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
INSERT INTO public.incomes(user_id, category, title, amount, income_date)
VALUES (:'test_user_id'::uuid, '기타', 'R93 user A income', 5000, CURRENT_DATE)
RETURNING id AS r93_a_income_id \gset
SELECT set_config('chronoledger.r93_a_income_id', :'r93_a_income_id', true);
SELECT total_asset AS r93_a_asset FROM public.user_finances WHERE user_id = :'test_user_id'::uuid \gset
SELECT set_config('chronoledger.r93_a_asset', :'r93_a_asset', true);

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_other_income UUID := current_setting('chronoledger.r93_a_income_id')::uuid;
    v_before BIGINT;
    v_after BIGINT;
    v_income_id UUID;
BEGIN
    IF v_user IS DISTINCT FROM current_setting('chronoledger.other_user_id')::uuid THEN
        RAISE EXCEPTION 'FAIL: R93 JWT did not resolve user B';
    END IF;
    SELECT total_asset INTO v_before FROM public.user_finances WHERE user_id = v_user;

    v_income_id := public.record_income('급여', '  R93 salary  ', 30000, CURRENT_DATE, 'R93 memo');
    IF NOT EXISTS (
        SELECT 1 FROM public.incomes
        WHERE id = v_income_id AND user_id = v_user AND category = '급여' AND title = 'R93 salary'
          AND amount = 30000 AND income_date = CURRENT_DATE AND memo = 'R93 memo'
    ) THEN
        RAISE EXCEPTION 'FAIL: R93 record_income did not store the trimmed income row';
    END IF;
    SELECT total_asset INTO v_after FROM public.user_finances WHERE user_id = v_user;
    IF v_after <> v_before + 30000 THEN
        RAISE EXCEPTION 'FAIL: R93 record_income did not raise total_asset (before %, after %)', v_before, v_after;
    END IF;

    BEGIN
        PERFORM public.record_income('부업', 'R93 bad category', 1000, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 invalid category was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '수익 유형%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.record_income('기타', 'R93 zero amount', 0, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 zero amount was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '수익 금액%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.record_income('기타', 'R93 negative amount', -1, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 negative amount was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '수익 금액%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.record_income('기타', '   ', 1000, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 blank title was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '수익 항목명%' THEN RAISE; END IF;
    END;
    IF (SELECT total_asset FROM public.user_finances WHERE user_id = v_user) <> v_before + 30000
       OR (SELECT count(*) FROM public.incomes) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R93 rejected record_income calls changed data or RLS exposed another user income';
    END IF;

    BEGIN
        INSERT INTO public.incomes(user_id, category, title, amount, income_date)
        VALUES (v_user, '기타', 'R93 direct insert', 1000, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 direct INSERT was not denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        UPDATE public.incomes SET amount = 1 WHERE id = v_income_id;
        RAISE EXCEPTION 'FAIL: R93 direct UPDATE was not denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        DELETE FROM public.incomes WHERE id = v_income_id;
        RAISE EXCEPTION 'FAIL: R93 direct DELETE was not denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        PERFORM public.delete_income(v_other_income);
        RAISE EXCEPTION 'FAIL: R93 user B deleted user A income';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '삭제할 수 있는%' THEN RAISE; END IF;
    END;

    PERFORM public.delete_income(v_income_id);
    IF EXISTS (SELECT 1 FROM public.incomes WHERE id = v_income_id) THEN
        RAISE EXCEPTION 'FAIL: R93 delete_income did not delete the row';
    END IF;
    SELECT total_asset INTO v_after FROM public.user_finances WHERE user_id = v_user;
    IF v_after <> v_before THEN
        RAISE EXCEPTION 'FAIL: R93 delete_income did not restore total_asset (before %, after %)', v_before, v_after;
    END IF;
    BEGIN
        PERFORM public.delete_income(v_income_id);
        RAISE EXCEPTION 'FAIL: R93 second delete_income of the same row was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '삭제할 수 있는%' THEN RAISE; END IF;
    END;
    IF (SELECT total_asset FROM public.user_finances WHERE user_id = v_user) <> v_before THEN
        RAISE EXCEPTION 'FAIL: R93 rejected delete_income changed total_asset';
    END IF;
END $$;
RESET ROLE;

-- Pending-deletion user A cannot record, delete or read incomes.
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'test_user_id', 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', :'test_user_id', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
    BEGIN
        PERFORM public.record_income('기타', 'R93 pending user', 1000, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 pending user recorded an income';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '계정 삭제가 진행 중%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.delete_income(current_setting('chronoledger.r93_a_income_id')::uuid);
        RAISE EXCEPTION 'FAIL: R93 pending user deleted an income';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' OR SQLERRM NOT LIKE '계정 삭제가 진행 중%' THEN RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM public.incomes) THEN
        RAISE EXCEPTION 'FAIL: R93 pending user could read incomes';
    END IF;
END $$;
RESET ROLE;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.incomes WHERE id = current_setting('chronoledger.r93_a_income_id')::uuid) THEN
        RAISE EXCEPTION 'FAIL: R93 user A income was removed';
    END IF;
    IF (SELECT total_asset FROM public.user_finances WHERE user_id = current_setting('chronoledger.test_user_id')::uuid)
       <> current_setting('chronoledger.r93_a_asset')::bigint THEN
        RAISE EXCEPTION 'FAIL: R93 user A total_asset changed';
    END IF;
    IF position('public.incomes' IN pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure)) = 0 THEN
        RAISE EXCEPTION 'FAIL: R93 account purge does not delete incomes';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_incomes' AND tgrelid = 'public.incomes'::regclass) THEN
        RAISE EXCEPTION 'FAIL: R93 pending-deletion trigger is missing on incomes';
    END IF;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
    BEGIN
        PERFORM 1 FROM public.incomes LIMIT 1;
        RAISE EXCEPTION 'FAIL: R93 anon read incomes';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.record_income('기타', 'R93 anon', 1000, CURRENT_DATE);
        RAISE EXCEPTION 'FAIL: R93 anon executed record_income';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.delete_income(current_setting('chronoledger.r93_a_income_id')::uuid);
        RAISE EXCEPTION 'FAIL: R93 anon executed delete_income';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R93 income RPCs keep total_asset in sync, validate input, deny direct writes, isolate users, block pending deletion and anon

-- The fixture role must not act as user A here: user A is pending deletion until the cleanup line below,
-- and the pending-deletion trigger blocks writes to user A rows while auth.uid() is user A (known-pitfalls #40).
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
-- R84: feedback_requests and notifications (owner isolation, admin answer + atomic notification,
-- read RPC, 30-day purge, pending deletion block, and anon denial).
WITH inserted_fb AS (
    INSERT INTO public.feedback_requests(user_id, category, title, content)
    VALUES (:'test_user_id'::uuid, '기타', 'R84 user A feedback', 'user A content')
    RETURNING id
)
SELECT set_config('chronoledger.r84_a_fb_id', id::text, true) FROM inserted_fb;

WITH inserted_gr AS (
    INSERT INTO public.game_requests(user_id, name, memo)
    VALUES
        (:'other_user_id'::uuid, 'R84 approve game ' || :'other_user_id', 'r84'),
        (:'other_user_id'::uuid, 'R84 reject game ' || :'other_user_id', 'r84')
    RETURNING id, name
)
SELECT set_config(
    CASE WHEN name LIKE 'R84 approve%' THEN 'chronoledger.r84_approve_gr_id' ELSE 'chronoledger.r84_reject_gr_id' END,
    id::text, true
) FROM inserted_gr;

INSERT INTO public.notifications(user_id, kind, title, body, link_path, source_id, created_at)
VALUES
    (:'test_user_id'::uuid, 'FEEDBACK_ANSWERED', 'R84 old', 'old body', '/dashboard/games', NULL, NOW() - INTERVAL '31 days'),
    (:'other_user_id'::uuid, 'REQUEST_APPROVED', 'R84 fresh', 'fresh body', '/dashboard/games', NULL, NOW());

SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_fb_id UUID;
    v_other_fb_id UUID := current_setting('chronoledger.r84_a_fb_id')::uuid;
    v_read_count INTEGER;
    v_nt_id UUID;
BEGIN
    INSERT INTO public.feedback_requests(user_id, category, title, content)
    VALUES (v_user, '기능 제안', 'R84 user B feedback', 'B content')
    RETURNING id INTO v_fb_id;
    PERFORM set_config('chronoledger.r84_b_fb_id', v_fb_id::text, true);

    IF EXISTS (SELECT 1 FROM public.feedback_requests WHERE id = v_other_fb_id) THEN
        RAISE EXCEPTION 'FAIL: R84 RLS exposed another user feedback';
    END IF;

    BEGIN
        UPDATE public.feedback_requests SET title = 'tamper' WHERE id = v_fb_id;
        RAISE EXCEPTION 'FAIL: R84 direct UPDATE on feedback_requests succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        DELETE FROM public.feedback_requests WHERE id = v_fb_id;
        RAISE EXCEPTION 'FAIL: R84 direct DELETE on feedback_requests succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        INSERT INTO public.notifications(user_id, kind, title, body, link_path)
        VALUES (v_user, 'FEEDBACK_ANSWERED', 'bad', 'bad', '/dashboard');
        RAISE EXCEPTION 'FAIL: R84 direct INSERT on notifications succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        PERFORM public.answer_feedback_request(v_fb_id, 'unauthorized answer', 'ANSWERED');
        RAISE EXCEPTION 'FAIL: R84 non-admin executed answer_feedback_request';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    SELECT id INTO v_nt_id FROM public.notifications WHERE user_id = v_user LIMIT 1;
    v_read_count := public.mark_notifications_read(ARRAY[v_nt_id]);
    IF v_read_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: R84 mark_notifications_read single expected 1, got %', v_read_count;
    END IF;
    -- User B also holds the approve/reject notifications created above: clear them, then a repeat call reads nothing.
    PERFORM public.mark_notifications_read(NULL);
    v_read_count := public.mark_notifications_read(NULL);
    IF v_read_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: R84 second mark_notifications_read expected 0, got %', v_read_count;
    END IF;
END $$;
RESET ROLE;

-- Admin answer creates FEEDBACK_ANSWERED notification atomically for feedback owner.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_fb_id UUID := current_setting('chronoledger.r84_b_fb_id')::uuid;
BEGIN
    PERFORM public.answer_feedback_request(v_fb_id, '관리자 답변 완료', 'ANSWERED');
    IF NOT EXISTS (
        SELECT 1 FROM public.feedback_requests
        WHERE id = v_fb_id AND request_status = 'ANSWERED' AND admin_answer = '관리자 답변 완료'
    ) THEN
        RAISE EXCEPTION 'FAIL: R84 answer_feedback_request did not update feedback row';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND kind = 'FEEDBACK_ANSWERED'
          AND source_id = v_fb_id
          AND read_at IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R84 answer_feedback_request did not create notification';
    END IF;

    BEGIN
        PERFORM public.answer_feedback_request(v_fb_id, 'second answer', 'ANSWERED');
        RAISE EXCEPTION 'FAIL: R84 answer_feedback_request accepted a non-PENDING feedback';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
    IF (SELECT count(*) FROM public.notifications WHERE kind = 'FEEDBACK_ANSWERED' AND source_id = v_fb_id) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.feedback_requests WHERE id = v_fb_id AND admin_answer = '관리자 답변 완료') THEN
        RAISE EXCEPTION 'FAIL: R84 second answer changed the feedback or added a notification';
    END IF;

    -- Existing request RPCs create exactly one requester notification without the admin memo.
    PERFORM public.approve_game_request(current_setting('chronoledger.r84_approve_gr_id')::uuid, 'https://example.com/r84-icon.webp');
    PERFORM public.reject_game_request(current_setting('chronoledger.r84_reject_gr_id')::uuid, 'R84 secret admin memo');
    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND kind = 'REQUEST_APPROVED'
          AND source_id = current_setting('chronoledger.r84_approve_gr_id')::uuid) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R84 approve_game_request did not create exactly one REQUEST_APPROVED notification';
    END IF;
    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND kind = 'REQUEST_REJECTED'
          AND source_id = current_setting('chronoledger.r84_reject_gr_id')::uuid
          AND position('R84 secret admin memo' IN title || body) = 0) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R84 reject_game_request notification missing or leaked admin memo';
    END IF;
END $$;
RESET ROLE;

-- Pending-deletion user A cannot submit feedback or mark notifications read.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id'::text, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        INSERT INTO public.feedback_requests(user_id, category, title, content)
        VALUES (auth.uid(), '기타', 'pending user', 'blocked');
        RAISE EXCEPTION 'FAIL: R84 pending user inserted feedback';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;

    BEGIN
        PERFORM public.mark_notifications_read(NULL);
        RAISE EXCEPTION 'FAIL: R84 pending user executed mark_notifications_read';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    IF EXISTS (SELECT 1 FROM public.notifications) THEN
        RAISE EXCEPTION 'FAIL: R84 pending user could read notifications';
    END IF;
END $$;
RESET ROLE;

-- The fixture role must not act as user A here: user A is pending deletion until the cleanup line below,
-- and the pending-deletion trigger blocks writes to user A rows while auth.uid() is user A (known-pitfalls #40).
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
-- DB fixture role checks 30-day purge, account purge linkage, and link_path check.
DO $$
DECLARE
    v_purged INTEGER;
    v_purge_def TEXT := pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure);
BEGIN
    BEGIN
        INSERT INTO public.notifications(user_id, kind, title, body, link_path)
        VALUES (current_setting('chronoledger.other_user_id')::uuid, 'FEEDBACK_ANSWERED', 'bad link', 'body', 'https://evil.example');
        RAISE EXCEPTION 'FAIL: R84 external link_path was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    v_purged := public.purge_expired_notifications();
    IF v_purged < 1 THEN
        RAISE EXCEPTION 'FAIL: R84 purge_expired_notifications deleted % rows', v_purged;
    END IF;
    IF position('public.feedback_requests' IN v_purge_def) = 0 OR position('public.notifications' IN v_purge_def) = 0 THEN
        RAISE EXCEPTION 'FAIL: R84 account purge function missing feedback_requests or notifications cleanup';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_feedback_requests')
       OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_notifications') THEN
        RAISE EXCEPTION 'FAIL: R84 pending-deletion trigger missing';
    END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.feedback_requests LIMIT 1;
        RAISE EXCEPTION 'FAIL: R84 anon read feedback_requests';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM 1 FROM public.notifications LIMIT 1;
        RAISE EXCEPTION 'FAIL: R84 anon read notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.mark_notifications_read(NULL);
        RAISE EXCEPTION 'FAIL: R84 anon executed mark_notifications_read';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R84 feedback_requests, notifications, answer/read RPCs, 30-day purge, pending-deletion and anon checks

-- R39: notification_settings RLS/grants, enqueue_daily_notifications() (FAVORITE_START, FAVORITE_END_D1, EXPENSE_D1),
-- dedupe, privacy (no amount/memo leak), pending-deletion block, account purge linkage, pg_cron schedule, and anon ACL.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.test_game_id')::uuid;
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_tomorrow DATE := v_today + 1;
    v_s_start UUID;
    v_s_end UUID;
    v_s_other UUID;
    v_e_planned UUID;
    v_e_confirmed UUID;
BEGIN
    INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo)
    VALUES (v_game_id, 'R39 오늘 시작 일정', 'CONTENTS', v_today, v_today + 3, 'R39 비밀 메모 START')
    RETURNING id INTO v_s_start;

    INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo)
    VALUES (v_game_id, 'R39 내일 종료 일정', 'PICKUP', v_today - 2, v_tomorrow, 'R39 비밀 메모 END')
    RETURNING id INTO v_s_end;

    INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo)
    VALUES (v_game_id, 'R39 먼 미래 일정', 'CONTENTS', v_today + 5, v_today + 10, 'R39 미래 메모')
    RETURNING id INTO v_s_other;

    INSERT INTO public.user_favorite_schedules(user_id, schedule_id)
    VALUES
        (v_user_b, v_s_start),
        (v_user_b, v_s_end),
        (v_user_b, v_s_other),
        (v_user_a, v_s_start),
        (v_user_a, v_s_end);

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R39 비밀 지출 제목 99000원', '게임', 'PLANNED', v_tomorrow, 99000, 99000, 'R39 비밀 지출 메모')
    RETURNING id INTO v_e_planned;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R39 확정 지출', '게임', 'CONFIRMED', v_tomorrow, 5000, 5000, 'R39 확정 메모')
    RETURNING id INTO v_e_confirmed;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_a, 'R39 대기 사용자 지출', '게임', 'PLANNED', v_tomorrow, 10000, 10000, 'R39 대기 메모');

    -- Fixture row for pending-deletion user A to test cross-user isolation and pending-user read hiding.
    INSERT INTO public.notification_settings(user_id, favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1)
    VALUES (v_user_a, true, true, true)
    ON CONFLICT (user_id) DO UPDATE
    SET favorite_schedule_start = true, favorite_schedule_end_d1 = true, planned_expense_d1 = true;

    PERFORM set_config('chronoledger.r39_s_start_id', v_s_start::text, true);
    PERFORM set_config('chronoledger.r39_s_end_id', v_s_end::text, true);
    PERFORM set_config('chronoledger.r39_s_other_id', v_s_other::text, true);
    PERFORM set_config('chronoledger.r39_e_planned_id', v_e_planned::text, true);
    PERFORM set_config('chronoledger.r39_e_confirmed_id', v_e_confirmed::text, true);
END $$;

-- R39-01: User B manages own notification_settings, cannot access user A, cannot DELETE or run enqueue function.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user_b UUID := auth.uid();
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_row public.notification_settings%ROWTYPE;
BEGIN
    IF EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = v_user_a) THEN
        RAISE EXCEPTION 'FAIL: R39 RLS exposed another user notification_settings';
    END IF;

    BEGIN
        INSERT INTO public.notification_settings(user_id) VALUES (v_user_a);
        RAISE EXCEPTION 'FAIL: R39 user B inserted notification_settings for user A';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    INSERT INTO public.notification_settings(user_id, favorite_schedule_end_d1)
    VALUES (v_user_b, false);

    SELECT * INTO v_row FROM public.notification_settings WHERE user_id = v_user_b;
    IF NOT FOUND
       OR v_row.favorite_schedule_start IS NOT TRUE
       OR v_row.favorite_schedule_end_d1 IS NOT FALSE
       OR v_row.planned_expense_d1 IS NOT TRUE
       OR v_row.request_result IS NOT TRUE
       OR v_row.push_enabled IS NOT FALSE THEN
        RAISE EXCEPTION 'FAIL: R39 notification_settings defaults or insert mismatch';
    END IF;

    UPDATE public.notification_settings SET favorite_schedule_start = false WHERE user_id = v_user_a;
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R39 user B updated user A notification_settings';
    END IF;

    BEGIN
        DELETE FROM public.notification_settings WHERE user_id = v_user_b;
        RAISE EXCEPTION 'FAIL: R39 direct DELETE on notification_settings succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        PERFORM public.enqueue_daily_notifications();
        RAISE EXCEPTION 'FAIL: R39 authenticated user executed enqueue_daily_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R39-02: DB fixture role runs enqueue_daily_notifications() and verifies 3 kinds, opt-out, privacy, dedupe,
-- default-enabled (no settings row), pending-deletion exclusion, purge linkage, trigger, and pg_cron job.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_s_start UUID := current_setting('chronoledger.r39_s_start_id')::uuid;
    v_s_end UUID := current_setting('chronoledger.r39_s_end_id')::uuid;
    v_s_other UUID := current_setting('chronoledger.r39_s_other_id')::uuid;
    v_e_planned UUID := current_setting('chronoledger.r39_e_planned_id')::uuid;
    v_e_confirmed UUID := current_setting('chronoledger.r39_e_confirmed_id')::uuid;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_tomorrow DATE := v_today + 1;
    v_inserted INTEGER;
    v_purge_def TEXT := pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure);
BEGIN
    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted < 2 THEN
        RAISE EXCEPTION 'FAIL: R39 first enqueue expected at least 2 rows, got %', v_inserted;
    END IF;

    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = v_user_b
          AND kind = 'FAVORITE_START'
          AND source_id = v_s_start
          AND scheduled_for = v_today
          AND link_path = '/dashboard?date=' || to_char(v_today, 'YYYY-MM-DD')
          AND position('R39 오늘 시작 일정' IN title || body) > 0
          AND position('R39 비밀 메모 START' IN title || body) = 0) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R39 FAVORITE_START notification missing, malformed, or leaked memo';
    END IF;

    IF EXISTS (SELECT 1 FROM public.notifications
        WHERE user_id = v_user_b AND kind = 'FAVORITE_END_D1' AND source_id = v_s_end) THEN
        RAISE EXCEPTION 'FAIL: R39 FAVORITE_END_D1 was generated despite user opt-out';
    END IF;

    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = v_user_b
          AND kind = 'EXPENSE_D1'
          AND source_id = v_e_planned
          AND scheduled_for = v_tomorrow
          AND link_path = '/dashboard/expenses'
          AND position('99000' IN title || body) = 0
          AND position('R39 비밀 지출 메모' IN title || body) = 0
          AND position('R39 비밀 지출 제목' IN title || body) = 0) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R39 EXPENSE_D1 notification missing, malformed, or leaked sensitive data';
    END IF;

    IF EXISTS (SELECT 1 FROM public.notifications
        WHERE user_id = v_user_b AND source_id IN (v_s_other, v_e_confirmed)) THEN
        RAISE EXCEPTION 'FAIL: R39 generated notification for non-qualifying schedule or confirmed expense';
    END IF;

    IF EXISTS (SELECT 1 FROM public.notifications
        WHERE user_id = v_user_a
          AND kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1')
          AND scheduled_for IN (v_today, v_tomorrow)) THEN
        RAISE EXCEPTION 'FAIL: R39 generated daily notification for pending-deletion user A';
    END IF;

    -- Repeat call on the same day must be deduplicated (0 rows inserted).
    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted <> 0 THEN
        RAISE EXCEPTION 'FAIL: R39 repeat enqueue was not deduplicated (inserted %)', v_inserted;
    END IF;

    -- Verify account purge linkage, trigger, and pg_cron registration.
    IF position('public.notification_settings' IN v_purge_def) = 0 THEN
        RAISE EXCEPTION 'FAIL: R39 account purge function missing notification_settings cleanup';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_notification_settings') THEN
        RAISE EXCEPTION 'FAIL: R39 pending-deletion trigger missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = 'chronoledger-daily-notifications' AND schedule = '0 0 * * *'
    ) THEN
        RAISE EXCEPTION 'FAIL: R39 pg_cron job chronoledger-daily-notifications missing or wrong schedule';
    END IF;
END $$;

-- User B re-enables favorite_schedule_end_d1 via authenticated UPDATE policy, then enqueue adds only FAVORITE_END_D1.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
UPDATE public.notification_settings
SET favorite_schedule_end_d1 = true, updated_at = NOW()
WHERE user_id = auth.uid();
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_s_start UUID := current_setting('chronoledger.r39_s_start_id')::uuid;
    v_s_end UUID := current_setting('chronoledger.r39_s_end_id')::uuid;
    v_e_planned UUID := current_setting('chronoledger.r39_e_planned_id')::uuid;
    v_tomorrow DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date + 1;
    v_inserted INTEGER;
BEGIN
    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted <> 1 THEN
        RAISE EXCEPTION 'FAIL: R39 enqueue after enabling FAVORITE_END_D1 expected 1 row, got %', v_inserted;
    END IF;
    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = v_user_b
          AND kind = 'FAVORITE_END_D1'
          AND source_id = v_s_end
          AND scheduled_for = v_tomorrow
          AND link_path = '/dashboard?date=' || to_char(v_tomorrow, 'YYYY-MM-DD')
          AND position('R39 내일 종료 일정' IN title || body) > 0
          AND position('R39 비밀 메모 END' IN title || body) = 0) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R39 FAVORITE_END_D1 notification missing, malformed, or leaked memo';
    END IF;

    -- User without a notification_settings row defaults to all 3 daily notifications enabled.
    DELETE FROM public.notification_settings WHERE user_id = v_user_b;
    DELETE FROM public.notifications
    WHERE user_id = v_user_b AND source_id IN (v_s_start, v_s_end, v_e_planned);
    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted <> 3 THEN
        RAISE EXCEPTION 'FAIL: R39 default-enabled enqueue without settings row expected 3 rows, got %', v_inserted;
    END IF;
END $$;

-- R39-03: Pending-deletion user A cannot read, insert, or update notification_settings.
SELECT set_config('request.jwt.claim.sub', :'test_user_id'::text, true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id'::text, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.notification_settings) THEN
        RAISE EXCEPTION 'FAIL: R39 pending user could read notification_settings';
    END IF;

    UPDATE public.notification_settings SET favorite_schedule_start = false WHERE user_id = auth.uid();
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R39 pending user updated notification_settings';
    END IF;

    BEGIN
        INSERT INTO public.notification_settings(user_id, favorite_schedule_start)
        VALUES (auth.uid(), false)
        ON CONFLICT (user_id) DO UPDATE SET favorite_schedule_start = EXCLUDED.favorite_schedule_start;
        RAISE EXCEPTION 'FAIL: R39 pending user upserted notification_settings';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;

-- R39-04: anon cannot read notification_settings or execute enqueue_daily_notifications().
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.notification_settings LIMIT 1;
        RAISE EXCEPTION 'FAIL: R39 anon read notification_settings';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.enqueue_daily_notifications();
        RAISE EXCEPTION 'FAIL: R39 anon executed enqueue_daily_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R39 notification_settings RLS, enqueue_daily_notifications 3 kinds, dedupe, privacy, pending-deletion, purge, cron and anon checks

-- R96: push_subscriptions RLS/grants, upsert/delete RPCs (shared-device endpoint takeover, push_enabled sync),
-- claim/complete delivery queue RPCs (SKIPPED rules, 3-retry FAILED cap, expired endpoint cleanup, last_success_at),
-- exception-isolated pg_net webhook trigger, pending-deletion block, account purge linkage, and anon ACL.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_shared_ep TEXT := 'https://push.example.test/r96/shared-device-endpoint';
    v_a_private_ep TEXT := 'https://push.example.test/r96/user-a-private-endpoint';
    v_p256dh TEXT := repeat('P', 65);
    v_auth TEXT := repeat('A', 22);
    v_a_sub_id UUID;
BEGIN
    -- Seed user A subscriptions via fixture role (user A is pending deletion).
    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label)
    VALUES (v_user_a, v_shared_ep, v_p256dh, v_auth, 'web', 'Chrome · Shared PC');

    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label)
    VALUES (v_user_a, v_a_private_ep, v_p256dh, v_auth, 'web', 'Edge · User A')
    RETURNING id INTO v_a_sub_id;

    PERFORM set_config('chronoledger.r96_a_sub_id', v_a_sub_id::text, true);
END $$;

-- R96-01: User B direct writes denied, validation enforced, upsert & shared-device takeover, isolation, delete sync.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user_b UUID := auth.uid();
    v_a_sub_id UUID := current_setting('chronoledger.r96_a_sub_id')::uuid;
    v_shared_ep TEXT := 'https://push.example.test/r96/shared-device-endpoint';
    v_b_ep_2 TEXT := 'https://push.example.test/r96/user-b-second-endpoint';
    v_p256dh TEXT := repeat('Q', 65);
    v_auth TEXT := repeat('B', 22);
    v_sub_id_1 UUID;
    v_sub_id_2 UUID;
    v_deleted INTEGER;
BEGIN
    -- User B cannot see user A's subscriptions.
    IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE id = v_a_sub_id) THEN
        RAISE EXCEPTION 'FAIL: R96 RLS exposed another user push_subscriptions';
    END IF;

    -- Direct table writes are revoked.
    BEGIN
        INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth)
        VALUES (v_user_b, v_b_ep_2, v_p256dh, v_auth);
        RAISE EXCEPTION 'FAIL: R96 direct INSERT on push_subscriptions succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- Validation checks in upsert_push_subscription.
    BEGIN
        PERFORM public.upsert_push_subscription('http://insecure.example/ep', v_p256dh, v_auth, 'web', 'Bad');
        RAISE EXCEPTION 'FAIL: R96 non-https endpoint accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        PERFORM public.upsert_push_subscription(v_b_ep_2, 'short', v_auth, 'web', 'Bad');
        RAISE EXCEPTION 'FAIL: R96 short p256dh accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        PERFORM public.upsert_push_subscription(v_b_ep_2, v_p256dh, 'short', 'web', 'Bad');
        RAISE EXCEPTION 'FAIL: R96 short auth accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        PERFORM public.upsert_push_subscription(v_b_ep_2, v_p256dh, v_auth, 'desktop', 'Bad');
        RAISE EXCEPTION 'FAIL: R96 invalid platform accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Shared-device endpoint takeover: user A's shared endpoint transfers atomically to user B.
    v_sub_id_1 := public.upsert_push_subscription(v_shared_ep, v_p256dh, v_auth, 'android_pwa', 'Chrome · Android');
    IF NOT EXISTS (
        SELECT 1 FROM public.push_subscriptions
        WHERE id = v_sub_id_1 AND user_id = v_user_b AND endpoint = v_shared_ep AND platform = 'android_pwa'
    ) THEN
        RAISE EXCEPTION 'FAIL: R96 shared-device endpoint takeover did not transfer ownership to user B';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = true
    ) THEN
        RAISE EXCEPTION 'FAIL: R96 upsert_push_subscription did not enable push_enabled';
    END IF;

    -- Direct UPDATE/DELETE on own row are also revoked.
    BEGIN
        UPDATE public.push_subscriptions SET user_agent_label = 'tamper' WHERE id = v_sub_id_1;
        RAISE EXCEPTION 'FAIL: R96 direct UPDATE on push_subscriptions succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        DELETE FROM public.push_subscriptions WHERE id = v_sub_id_1;
        RAISE EXCEPTION 'FAIL: R96 direct DELETE on push_subscriptions succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- Cannot delete another user's subscription.
    v_deleted := public.delete_push_subscription(NULL, v_a_sub_id);
    IF v_deleted <> 0 THEN
        RAISE EXCEPTION 'FAIL: R96 user B deleted another user subscription (deleted %)', v_deleted;
    END IF;

    -- Register a second subscription, delete one (push_enabled stays true), delete last (push_enabled becomes false).
    v_sub_id_2 := public.upsert_push_subscription(v_b_ep_2, v_p256dh, v_auth, 'ios_pwa', 'Safari · iPhone');
    v_deleted := public.delete_push_subscription(NULL, v_sub_id_1);
    IF v_deleted <> 1 OR NOT EXISTS (
        SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = true
    ) THEN
        RAISE EXCEPTION 'FAIL: R96 deleting 1 of 2 subscriptions failed or cleared push_enabled prematurely';
    END IF;

    v_deleted := public.delete_push_subscription(v_b_ep_2, NULL);
    IF v_deleted <> 1 OR NOT EXISTS (
        SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = false
    ) THEN
        RAISE EXCEPTION 'FAIL: R96 deleting last subscription failed or did not disable push_enabled';
    END IF;

    -- Re-register two subscriptions for R96-02 delivery queue tests.
    PERFORM public.upsert_push_subscription(v_shared_ep, v_p256dh, v_auth, 'web', 'Chrome · Desktop');
    PERFORM public.upsert_push_subscription(v_b_ep_2, v_p256dh, v_auth, 'ios_pwa', 'Safari · iPhone');

    -- Authenticated user cannot call service_role delivery RPCs or access push_webhook_config.
    BEGIN
        PERFORM * FROM public.claim_pending_push_notifications(10);
        RAISE EXCEPTION 'FAIL: R96 authenticated user executed claim_pending_push_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.complete_push_notification_delivery(gen_random_uuid(), 'SENT');
        RAISE EXCEPTION 'FAIL: R96 authenticated user executed complete_push_notification_delivery';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM 1 FROM public.push_webhook_config LIMIT 1;
        RAISE EXCEPTION 'FAIL: R96 authenticated user read push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.push_webhook_config(id, url, secret)
        VALUES (true, 'https://example.invalid/functions/v1/send-notifications', repeat('s', 32));
        RAISE EXCEPTION 'FAIL: R96 authenticated user inserted push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.set_push_webhook_config('https://example.invalid/functions/v1/send-notifications', repeat('s', 32));
        RAISE EXCEPTION 'FAIL: R96 authenticated user executed set_push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R96-02: Fixture role tests claim/complete RPCs, SKIPPED rules, 3-attempt FAILED cap, expired cleanup,
-- webhook trigger exception isolation, purge linkage, and pending-deletion trigger.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_ep_1 TEXT := 'https://push.example.test/r96/shared-device-endpoint';
    v_ep_2 TEXT := 'https://push.example.test/r96/user-b-second-endpoint';
    v_n_req UUID;
    v_n_fav UUID;
    v_n_pending_a UUID;
    v_n_sent UUID;
    v_n_expire_last UUID;
    v_n_off UUID;
    v_n_old UUID;
    v_n_before_sub UUID;
    v_claimed_count INTEGER;
    v_claimed_id UUID;
    v_claimed_attempts SMALLINT;
    v_purge_def TEXT := pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure);
BEGIN
    -- Clear prior PENDING notifications from earlier smoke blocks so claim ordering is deterministic.
    UPDATE public.notifications SET push_status = 'SKIPPED', pushed_at = NOW() WHERE push_status = 'PENDING';

    -- User B has push_enabled=true and request_result=false.
    UPDATE public.notification_settings
    SET push_enabled = true, request_result = false, updated_at = NOW()
    WHERE user_id = v_user_b;

    -- User A has push_enabled=true and a subscription, but is pending account deletion.
    UPDATE public.notification_settings
    SET push_enabled = true, request_result = true, updated_at = NOW()
    WHERE user_id = v_user_a;

    -- Confirm webhook trigger does not break INSERT even with an unreachable/unset setting.
    PERFORM set_config('app.settings.send_notifications_url', '', true);
    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'REQUEST_APPROVED', 'R96 req skipped', 'req body', '/dashboard/games')
    RETURNING id INTO v_n_req;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'FAVORITE_START', 'R96 fav claim', 'fav body', '/dashboard')
    RETURNING id INTO v_n_fav;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_a, 'FAVORITE_START', 'R96 pending user', 'a body', '/dashboard')
    RETURNING id INTO v_n_pending_a;

    -- Claim pass 1: only v_n_fav is returned (attempts=1); v_n_req and v_n_pending_a become SKIPPED.
    SELECT count(*), min(notification_id::text)::uuid, max(push_attempts)
    INTO v_claimed_count, v_claimed_id, v_claimed_attempts
    FROM public.claim_pending_push_notifications(50);

    IF v_claimed_count <> 1 OR v_claimed_id <> v_n_fav OR v_claimed_attempts <> 1 THEN
        RAISE EXCEPTION 'FAIL: R96 claim pass 1 unexpected result (count=%, id=%, attempts=%)',
            v_claimed_count, v_claimed_id, v_claimed_attempts;
    END IF;
    IF (SELECT push_status FROM public.notifications WHERE id = v_n_req) <> 'SKIPPED' THEN
        RAISE EXCEPTION 'FAIL: R96 request_result=false notification was not marked SKIPPED';
    END IF;
    IF (SELECT push_status FROM public.notifications WHERE id = v_n_pending_a) <> 'SKIPPED' THEN
        RAISE EXCEPTION 'FAIL: R96 pending-deletion user notification was not marked SKIPPED';
    END IF;

    -- Lease: a second worker right after the first must not claim the same row again.
    -- Backlog: rows older than 1 day or created before the first subscription are SKIPPED, never pushed.
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, created_at)
    VALUES (v_user_b, 'FAVORITE_START', 'R96 old backlog', 'body', '/dashboard', NOW() - INTERVAL '2 days')
    RETURNING id INTO v_n_old;
    INSERT INTO public.notifications(user_id, kind, title, body, link_path, created_at)
    VALUES (v_user_b, 'FAVORITE_START', 'R96 before first sub', 'body', '/dashboard', NOW() - INTERVAL '1 hour')
    RETURNING id INTO v_n_before_sub;
    SELECT count(*) INTO v_claimed_count FROM public.claim_pending_push_notifications(50);
    IF v_claimed_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: R96 second claim re-claimed a leased or backlog notification (count=%)', v_claimed_count;
    END IF;
    IF (SELECT push_status FROM public.notifications WHERE id = v_n_old) <> 'SKIPPED'
       OR (SELECT push_status FROM public.notifications WHERE id = v_n_before_sub) <> 'SKIPPED' THEN
        RAISE EXCEPTION 'FAIL: R96 backlog notification was not marked SKIPPED';
    END IF;
    IF (SELECT push_claimed_at FROM public.notifications WHERE id = v_n_fav) IS NULL THEN
        RAISE EXCEPTION 'FAIL: R96 claim did not record push_claimed_at lease';
    END IF;

    -- Retry attempt 1: transient failure ('PENDING') + expire v_ep_1 (v_ep_2 remains so push_enabled stays true).
    PERFORM public.complete_push_notification_delivery(v_n_fav, 'PENDING', ARRAY[v_ep_1]::TEXT[], '{}'::TEXT[]);
    IF (SELECT push_status FROM public.notifications WHERE id = v_n_fav) <> 'PENDING'
       OR EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_b AND endpoint = v_ep_1)
       OR NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = true) THEN
        RAISE EXCEPTION 'FAIL: R96 attempt 1 completion did not preserve PENDING or clean expired endpoint';
    END IF;

    -- Retry attempt 2 -> still PENDING.
    SELECT push_attempts INTO v_claimed_attempts FROM public.claim_pending_push_notifications(50) LIMIT 1;
    IF v_claimed_attempts <> 2 THEN
        RAISE EXCEPTION 'FAIL: R96 claim pass 2 expected attempts=2, got %', v_claimed_attempts;
    END IF;
    PERFORM public.complete_push_notification_delivery(v_n_fav, 'PENDING', '{}'::TEXT[], '{}'::TEXT[]);
    IF (SELECT push_status FROM public.notifications WHERE id = v_n_fav) <> 'PENDING' THEN
        RAISE EXCEPTION 'FAIL: R96 attempt 2 did not remain PENDING';
    END IF;

    -- Retry attempt 3 -> server enforces FAILED at attempts >= 3 even if caller passes PENDING.
    SELECT push_attempts INTO v_claimed_attempts FROM public.claim_pending_push_notifications(50) LIMIT 1;
    IF v_claimed_attempts <> 3 THEN
        RAISE EXCEPTION 'FAIL: R96 claim pass 3 expected attempts=3, got %', v_claimed_attempts;
    END IF;
    PERFORM public.complete_push_notification_delivery(v_n_fav, 'PENDING', '{}'::TEXT[], '{}'::TEXT[]);
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications WHERE id = v_n_fav AND push_status = 'FAILED' AND pushed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R96 attempt 3 did not transition to FAILED';
    END IF;

    -- Successful delivery updates push_status='SENT' and subscription last_success_at.
    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'EXPENSE_D1', 'R96 sent ok', 'body', '/dashboard/expenses')
    RETURNING id INTO v_n_sent;

    PERFORM * FROM public.claim_pending_push_notifications(50);
    PERFORM public.complete_push_notification_delivery(v_n_sent, 'SENT', '{}'::TEXT[], ARRAY[v_ep_2]::TEXT[]);
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = v_n_sent AND push_status = 'SENT' AND pushed_at IS NOT NULL)
       OR NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_b AND endpoint = v_ep_2 AND last_success_at IS NOT NULL) THEN
        RAISE EXCEPTION 'FAIL: R96 SENT delivery did not update notification or last_success_at';
    END IF;

    -- Expiring the final remaining endpoint disables push_enabled automatically.
    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'EXPENSE_D1', 'R96 expire last', 'body', '/dashboard/expenses')
    RETURNING id INTO v_n_expire_last;

    PERFORM * FROM public.claim_pending_push_notifications(50);
    PERFORM public.complete_push_notification_delivery(v_n_expire_last, 'FAILED', ARRAY[v_ep_2]::TEXT[], '{}'::TEXT[]);
    IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_b)
       OR NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = false) THEN
        RAISE EXCEPTION 'FAIL: R96 expiring last endpoint did not disable push_enabled';
    END IF;

    -- R106-REV-002: Calling complete_push_notification_delivery on a deleted/missing notification ID
    -- must not raise; it still updates succeeded endpoints and cleans expired endpoints (+ push_enabled sync).
    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label)
    VALUES
        (v_user_b, 'https://push.example.test/r106-rev002/ok', repeat('P', 65), repeat('A', 22), 'web', 'Chrome · Quiet OK'),
        (v_user_b, 'https://push.example.test/r106-rev002/expired', repeat('P', 65), repeat('A', 22), 'web', 'Chrome · Quiet Expired');
    UPDATE public.notification_settings SET push_enabled = true, updated_at = NOW() WHERE user_id = v_user_b;

    PERFORM public.complete_push_notification_delivery(
        gen_random_uuid(),
        'SENT',
        ARRAY['https://push.example.test/r106-rev002/expired']::TEXT[],
        ARRAY['https://push.example.test/r106-rev002/ok']::TEXT[]
    );
    IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE endpoint = 'https://push.example.test/r106-rev002/expired')
       OR NOT EXISTS (
           SELECT 1 FROM public.push_subscriptions
           WHERE endpoint = 'https://push.example.test/r106-rev002/ok' AND last_success_at IS NOT NULL
       )
       OR NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = true) THEN
        RAISE EXCEPTION 'FAIL: R106-REV-002 missing-notification completion did not clean expired or update succeeded endpoint';
    END IF;

    PERFORM public.complete_push_notification_delivery(
        gen_random_uuid(),
        'FAILED',
        ARRAY['https://push.example.test/r106-rev002/ok']::TEXT[],
        '{}'::TEXT[]
    );
    IF EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = v_user_b)
       OR NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = v_user_b AND push_enabled = false) THEN
        RAISE EXCEPTION 'FAIL: R106-REV-002 missing-notification final endpoint expiry did not disable push_enabled';
    END IF;

    -- With push_enabled=false / 0 subscriptions, new notification is immediately SKIPPED.
    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'FAVORITE_START', 'R96 push off', 'body', '/dashboard')
    RETURNING id INTO v_n_off;

    SELECT count(*) INTO v_claimed_count FROM public.claim_pending_push_notifications(50);
    IF v_claimed_count <> 0 OR (SELECT push_status FROM public.notifications WHERE id = v_n_off) <> 'SKIPPED' THEN
        RAISE EXCEPTION 'FAIL: R96 notification with push_enabled=false was not SKIPPED';
    END IF;

    -- Verify account purge linkage, pending-deletion trigger, and webhook trigger.
    IF position('public.push_subscriptions' IN v_purge_def) = 0 THEN
        RAISE EXCEPTION 'FAIL: R96 account purge function missing push_subscriptions cleanup';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_push_subscriptions') THEN
        RAISE EXCEPTION 'FAIL: R96 pending-deletion trigger missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_send_webhook') THEN
        RAISE EXCEPTION 'FAIL: R96 webhook trigger trg_notifications_send_webhook missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chronoledger-push-retry' AND schedule = '*/5 * * * *') THEN
        RAISE EXCEPTION 'FAIL: R96 retry cron job chronoledger-push-retry missing';
    END IF;

    -- R96-REV-07: push_webhook_config validation, upsert/update (including NULL secret), service_role ACL block,
    -- and exception-isolated invoke_send_notifications_webhook() with config present and cleared.
    BEGIN
        PERFORM public.set_push_webhook_config('http://insecure.example.invalid/functions/v1/send-notifications', repeat('s', 32));
        RAISE EXCEPTION 'FAIL: R96-REV-07 non-https webhook url accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        PERFORM public.set_push_webhook_config('https://example.invalid/functions/v1/send-notifications', 'too-short-secret');
        RAISE EXCEPTION 'FAIL: R96-REV-07 short webhook secret (<32 chars) accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    PERFORM public.set_push_webhook_config('https://example.invalid/functions/v1/send-notifications', repeat('s', 32));
    IF (SELECT count(*) FROM public.push_webhook_config) <> 1
       OR NOT EXISTS (
           SELECT 1
           FROM public.push_webhook_config
           WHERE id = true
             AND url = 'https://example.invalid/functions/v1/send-notifications'
             AND secret = repeat('s', 32)
       ) THEN
        RAISE EXCEPTION 'FAIL: R96-REV-07 set_push_webhook_config did not persist singleton row';
    END IF;

    -- Calling invoke_send_notifications_webhook() with config present must never raise.
    PERFORM public.invoke_send_notifications_webhook();

    -- Updating singleton row with NULL secret (for Vault-backed secret) keeps 1 row and clears secret.
    PERFORM public.set_push_webhook_config('https://updated.example.invalid/functions/v1/send-notifications', NULL);
    IF (SELECT count(*) FROM public.push_webhook_config) <> 1
       OR NOT EXISTS (
           SELECT 1
           FROM public.push_webhook_config
           WHERE id = true
             AND url = 'https://updated.example.invalid/functions/v1/send-notifications'
             AND secret IS NULL
       ) THEN
        RAISE EXCEPTION 'FAIL: R96-REV-07 set_push_webhook_config update with NULL secret failed';
    END IF;

    IF has_table_privilege('service_role', 'public.push_webhook_config', 'SELECT')
       OR has_function_privilege('service_role', 'public.set_push_webhook_config(text,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: R96-REV-07 service_role still has privilege on push_webhook_config or set_push_webhook_config';
    END IF;

    DELETE FROM public.push_webhook_config;
    PERFORM public.invoke_send_notifications_webhook();
END $$;

-- R96-03: Pending-deletion user A cannot read, upsert, or delete push_subscriptions.
SELECT set_config('request.jwt.claim.sub', :'test_user_id'::text, true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id'::text, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.push_subscriptions) THEN
        RAISE EXCEPTION 'FAIL: R96 pending user could read push_subscriptions';
    END IF;

    BEGIN
        PERFORM public.upsert_push_subscription(
            'https://push.example.test/r96/pending-a',
            repeat('P', 65),
            repeat('A', 22),
            'web',
            'Blocked'
        );
        RAISE EXCEPTION 'FAIL: R96 pending user executed upsert_push_subscription';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        PERFORM public.delete_push_subscription(NULL, current_setting('chronoledger.r96_a_sub_id')::uuid);
        RAISE EXCEPTION 'FAIL: R96 pending user deleted push_subscriptions';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;

-- R96-04: anon cannot read push_subscriptions or execute any R96 RPC.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.push_subscriptions LIMIT 1;
        RAISE EXCEPTION 'FAIL: R96 anon read push_subscriptions';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.upsert_push_subscription('https://push.example.test/r96/anon', repeat('P', 65), repeat('A', 22));
        RAISE EXCEPTION 'FAIL: R96 anon executed upsert_push_subscription';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.delete_push_subscription('https://push.example.test/r96/anon', NULL);
        RAISE EXCEPTION 'FAIL: R96 anon executed delete_push_subscription';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM * FROM public.claim_pending_push_notifications(10);
        RAISE EXCEPTION 'FAIL: R96 anon executed claim_pending_push_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.complete_push_notification_delivery(gen_random_uuid(), 'SENT');
        RAISE EXCEPTION 'FAIL: R96 anon executed complete_push_notification_delivery';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM 1 FROM public.push_webhook_config LIMIT 1;
        RAISE EXCEPTION 'FAIL: R96 anon read push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.push_webhook_config(id, url, secret)
        VALUES (true, 'https://example.invalid/functions/v1/send-notifications', repeat('s', 32));
        RAISE EXCEPTION 'FAIL: R96 anon inserted push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.set_push_webhook_config('https://example.invalid/functions/v1/send-notifications', repeat('s', 32));
        RAISE EXCEPTION 'FAIL: R96 anon executed set_push_webhook_config';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R96 push_subscriptions RLS, upsert/delete RPCs, delivery queue RPCs, webhook trigger, pending-deletion, purge and anon checks

-- R102: user_expense_presets CRUD/owner isolation, CHECK constraints, 20-item limit trigger,
-- ON DELETE SET NULL on games, pending-deletion block, account purge linkage, and anon ACL.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_temp_game_id UUID;
    v_a_preset_id UUID;
BEGIN
    INSERT INTO public.games(name, default_icon_url, status)
    VALUES ('R102 temp game ' || v_user_a::text, 'https://example.com/r102.webp', 'APPROVED')
    RETURNING id INTO v_temp_game_id;

    INSERT INTO public.user_expense_presets(user_id, title, category, game_id, original_price, payment_method, point_platform, deduct_from_asset)
    VALUES (v_user_a, 'R102 User A Preset', '게임', v_temp_game_id, 119000, 'WALLET', 'GOOGLE_PLAY', true)
    RETURNING id INTO v_a_preset_id;

    PERFORM set_config('chronoledger.r102_temp_game_id', v_temp_game_id::text, true);
    PERFORM set_config('chronoledger.r102_a_preset_id', v_a_preset_id::text, true);
END $$;

-- R102-01: User B owner isolation, CHECK constraints, CRUD, and 20-preset limit trigger.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user_b UUID := auth.uid();
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_a_preset_id UUID := current_setting('chronoledger.r102_a_preset_id')::uuid;
    v_temp_game_id UUID := current_setting('chronoledger.r102_temp_game_id')::uuid;
    v_game_preset_id UUID;
    v_last_preset_id UUID;
    v_idx INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_expense_presets WHERE id = v_a_preset_id) THEN
        RAISE EXCEPTION 'FAIL: R102 RLS exposed another user expense preset';
    END IF;

    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price)
        VALUES (v_user_a, 'R102 cross user insert', 5900);
        RAISE EXCEPTION 'FAIL: R102 user B inserted preset for user A';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    UPDATE public.user_expense_presets SET title = 'tamper' WHERE id = v_a_preset_id;
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R102 user B updated user A preset';
    END IF;

    DELETE FROM public.user_expense_presets WHERE id = v_a_preset_id;
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R102 user B deleted user A preset';
    END IF;

    -- CHECK constraints
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price) VALUES (v_user_b, '   ', 1000);
        RAISE EXCEPTION 'FAIL: R102 blank title accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price) VALUES (v_user_b, '음수 금액', -1);
        RAISE EXCEPTION 'FAIL: R102 negative original_price accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, category, original_price) VALUES (v_user_b, '불가 카테고리', '정기 구독', 5900);
        RAISE EXCEPTION 'FAIL: R102 invalid category accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price, payment_method) VALUES (v_user_b, '불가 결제수단', 5900, 'GOOGLE_PLAY');
        RAISE EXCEPTION 'FAIL: R102 invalid payment_method accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price, point_platform) VALUES (v_user_b, '불가 플랫폼', 5900, 'NAVER_PAY');
        RAISE EXCEPTION 'FAIL: R102 invalid point_platform accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Insert game-linked preset (1 of 20) and update it.
    INSERT INTO public.user_expense_presets(user_id, title, category, game_id, original_price, payment_method, point_platform, deduct_from_asset, sort_order)
    VALUES (v_user_b, '월정액', '게임', v_temp_game_id, 5900, 'WALLET', 'GOOGLE_PLAY', true, 1)
    RETURNING id INTO v_game_preset_id;
    PERFORM set_config('chronoledger.r102_b_game_preset_id', v_game_preset_id::text, true);

    UPDATE public.user_expense_presets
    SET title = '월정액(수정)', original_price = 6000, updated_at = NOW()
    WHERE id = v_game_preset_id;
    IF NOT EXISTS (SELECT 1 FROM public.user_expense_presets WHERE id = v_game_preset_id AND title = '월정액(수정)' AND original_price = 6000) THEN
        RAISE EXCEPTION 'FAIL: R102 user B update on own preset did not persist';
    END IF;

    -- Insert remaining 19 common presets (total 20).
    FOR v_idx IN 2..20 LOOP
        INSERT INTO public.user_expense_presets(user_id, title, category, game_id, original_price, payment_method, point_platform, deduct_from_asset, sort_order)
        VALUES (v_user_b, 'R102 프리셋 #' || v_idx, '기타', NULL, v_idx * 1000, 'NAVER_PAY', NULL, false, v_idx)
        RETURNING id INTO v_last_preset_id;
    END LOOP;

    -- 21st preset must be rejected with check_violation (23514).
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price)
        VALUES (v_user_b, 'R102 21번째 초과', 1000);
        RAISE EXCEPTION 'FAIL: R102 21st expense preset was accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM NOT LIKE '%최대 20개%' THEN RAISE; END IF;
    END;

    -- After deleting one preset, inserting a new one succeeds again.
    DELETE FROM public.user_expense_presets WHERE id = v_last_preset_id;
    INSERT INTO public.user_expense_presets(user_id, title, original_price)
    VALUES (v_user_b, 'R102 삭제 후 재등록', 9900);
END $$;
RESET ROLE;

-- R102-02: Deleting linked game sets preset.game_id to NULL; verify purge linkage and triggers.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_temp_game_id UUID := current_setting('chronoledger.r102_temp_game_id')::uuid;
    v_b_game_preset_id UUID := current_setting('chronoledger.r102_b_game_preset_id')::uuid;
    v_purge_def TEXT := pg_get_functiondef('public.purge_expired_account_deletion_requests(integer)'::regprocedure);
BEGIN
    DELETE FROM public.games WHERE id = v_temp_game_id;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_expense_presets WHERE id = v_b_game_preset_id AND game_id IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R102 deleting linked game did not set user_expense_presets.game_id to NULL';
    END IF;

    IF position('public.user_expense_presets' IN v_purge_def) = 0 THEN
        RAISE EXCEPTION 'FAIL: R102 account purge function missing user_expense_presets cleanup';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'block_pending_account_deletion_user_expense_presets')
       OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_user_expense_presets_limit') THEN
        RAISE EXCEPTION 'FAIL: R102 required triggers missing';
    END IF;
END $$;

-- R102-03: Pending-deletion user A cannot read, insert, update, or delete user_expense_presets.
SELECT set_config('request.jwt.claim.sub', :'test_user_id'::text, true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id'::text, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_expense_presets) THEN
        RAISE EXCEPTION 'FAIL: R102 pending user could read user_expense_presets';
    END IF;

    UPDATE public.user_expense_presets SET title = 'blocked' WHERE user_id = auth.uid();
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R102 pending user updated user_expense_presets';
    END IF;

    DELETE FROM public.user_expense_presets WHERE user_id = auth.uid();
    IF FOUND THEN
        RAISE EXCEPTION 'FAIL: R102 pending user deleted user_expense_presets';
    END IF;

    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price)
        VALUES (auth.uid(), 'blocked insert', 1000);
        RAISE EXCEPTION 'FAIL: R102 pending user inserted user_expense_presets';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;

-- R102-04: anon cannot read or insert user_expense_presets.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.user_expense_presets LIMIT 1;
        RAISE EXCEPTION 'FAIL: R102 anon read user_expense_presets';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.user_expense_presets(user_id, title, original_price)
        VALUES (current_setting('chronoledger.other_user_id')::uuid, 'anon', 1000);
        RAISE EXCEPTION 'FAIL: R102 anon inserted user_expense_presets';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R102 user_expense_presets RLS, CHECKs, 20-item limit trigger, game SET NULL, pending-deletion, purge and anon checks

-- R106: delete_notifications SECURITY DEFINER RPC (selective/all hard delete, cross-user isolation,
-- direct DELETE denial, pending-deletion block, and anon ACL).
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_a_nt_id UUID;
    v_b_nt_1 UUID;
    v_b_nt_2 UUID;
    v_b_nt_3 UUID;
BEGIN
    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_a, 'FAVORITE_START', 'R106 User A notif', 'keep a', '/dashboard')
    RETURNING id INTO v_a_nt_id;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'FAVORITE_START', 'R106 User B notif 1', 'body 1', '/dashboard')
    RETURNING id INTO v_b_nt_1;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'EXPENSE_D1', 'R106 User B notif 2', 'body 2', '/dashboard/expenses')
    RETURNING id INTO v_b_nt_2;

    INSERT INTO public.notifications(user_id, kind, title, body, link_path)
    VALUES (v_user_b, 'REQUEST_APPROVED', 'R106 User B notif 3', 'body 3', '/dashboard/games')
    RETURNING id INTO v_b_nt_3;

    PERFORM set_config('chronoledger.r106_a_nt_id', v_a_nt_id::text, true);
    PERFORM set_config('chronoledger.r106_b_nt_1', v_b_nt_1::text, true);
    PERFORM set_config('chronoledger.r106_b_nt_2', v_b_nt_2::text, true);
    PERFORM set_config('chronoledger.r106_b_nt_3', v_b_nt_3::text, true);
END $$;

-- R106-01: User B cannot directly DELETE public.notifications, can selectively delete own rows (ignoring user A's ID),
-- and can delete all own notifications via delete_notifications(NULL).
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_a_nt_id UUID := current_setting('chronoledger.r106_a_nt_id')::uuid;
    v_b_nt_1 UUID := current_setting('chronoledger.r106_b_nt_1')::uuid;
    v_b_nt_2 UUID := current_setting('chronoledger.r106_b_nt_2')::uuid;
    v_b_nt_3 UUID := current_setting('chronoledger.r106_b_nt_3')::uuid;
    v_before_count INTEGER;
    v_deleted INTEGER;
BEGIN
    -- Direct DELETE on public.notifications must remain revoked.
    BEGIN
        DELETE FROM public.notifications WHERE id = v_b_nt_1;
        RAISE EXCEPTION 'FAIL: R106 direct DELETE on public.notifications succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    SELECT count(*) INTO v_before_count FROM public.notifications;
    IF v_before_count < 3 THEN
        RAISE EXCEPTION 'FAIL: R106 expected at least 3 notifications for user B, got %', v_before_count;
    END IF;

    -- Empty array deletes 0 rows.
    v_deleted := public.delete_notifications('{}'::uuid[]);
    IF v_deleted <> 0 THEN
        RAISE EXCEPTION 'FAIL: R106 empty array delete expected 0, got %', v_deleted;
    END IF;

    -- Selective delete with mixed own + other user's notification ID deletes only own matching row.
    v_deleted := public.delete_notifications(ARRAY[v_b_nt_1, v_a_nt_id]);
    IF v_deleted <> 1
       OR EXISTS (SELECT 1 FROM public.notifications WHERE id = v_b_nt_1)
       OR NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = v_b_nt_2)
       OR NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = v_b_nt_3) THEN
        RAISE EXCEPTION 'FAIL: R106 selective delete unexpected result (deleted=%)', v_deleted;
    END IF;

    -- Delete all own notifications (p_notification_ids = NULL) removes all remaining rows for user B.
    v_deleted := public.delete_notifications(NULL);
    IF v_deleted <> (v_before_count - 1) OR EXISTS (SELECT 1 FROM public.notifications) THEN
        RAISE EXCEPTION 'FAIL: R106 delete-all expected %, got %', (v_before_count - 1), v_deleted;
    END IF;

    -- Calling delete-all again when empty returns 0.
    v_deleted := public.delete_notifications(NULL);
    IF v_deleted <> 0 THEN
        RAISE EXCEPTION 'FAIL: R106 second delete-all expected 0, got %', v_deleted;
    END IF;
END $$;
RESET ROLE;

-- R106-02: Verify user A's notification survived user B's selective (mixed-ID) and delete-all calls.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_a_nt_id UUID := current_setting('chronoledger.r106_a_nt_id')::uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = v_a_nt_id) THEN
        RAISE EXCEPTION 'FAIL: R106 user B delete_notifications removed user A notification';
    END IF;
END $$;

-- R106-03: Pending-deletion user A cannot execute delete_notifications.
SELECT set_config('request.jwt.claim.sub', :'test_user_id'::text, true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', :'test_user_id'::text, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_a_nt_id UUID := current_setting('chronoledger.r106_a_nt_id')::uuid;
BEGIN
    BEGIN
        PERFORM public.delete_notifications(ARRAY[v_a_nt_id]);
        RAISE EXCEPTION 'FAIL: R106 pending user executed selective delete_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.delete_notifications(NULL);
        RAISE EXCEPTION 'FAIL: R106 pending user executed delete-all delete_notifications';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R106-04: anon cannot execute delete_notifications.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
DECLARE
    v_a_nt_id UUID := current_setting('chronoledger.r106_a_nt_id')::uuid;
BEGIN
    BEGIN
        PERFORM public.delete_notifications(NULL);
        RAISE EXCEPTION 'FAIL: R106 anon executed delete_notifications(NULL)';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.delete_notifications(ARRAY[v_a_nt_id]);
        RAISE EXCEPTION 'FAIL: R106 anon executed delete_notifications(ARRAY)';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R106 delete_notifications RPC selective/all delete, cross-user isolation, direct DELETE denial, pending-deletion and anon checks

-- R107B-01: EXPENSE_DUE_TODAY daily summary notification (N>=1 summary 1 row, N=0 none, excludes overdue/confirmed/cancelled,
-- no amount/title/memo leak, same-day dedupe, next-day new row, missing settings defaults true, opt-out & pending-deletion excluded).
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_user_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_e1 UUID;
    v_e2 UUID;
    v_e3 UUID;
    v_e_overdue UUID;
    v_e_confirmed UUID;
    v_e_cancelled UUID;
    v_e_a UUID;
    v_inserted INTEGER;
    v_claimed_count INTEGER;
    v_nt public.notifications%ROWTYPE;
BEGIN
    -- Clear prior notifications/settings for user B so R107B assertions are isolated.
    DELETE FROM public.notifications WHERE user_id IN (v_user_a, v_user_b) AND kind = 'EXPENSE_DUE_TODAY';
    DELETE FROM public.notification_settings WHERE user_id = v_user_b;

    -- B-1 (N=0): no today PLANNED expenses -> no EXPENSE_DUE_TODAY created.
    DELETE FROM public.expenses WHERE user_id = v_user_b AND status = 'PLANNED' AND target_date = v_today;
    PERFORM public.enqueue_daily_notifications();
    IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today
    ) THEN
        RAISE EXCEPTION 'FAIL: R107B generated EXPENSE_DUE_TODAY when user B had 0 due-today PLANNED expenses';
    END IF;

    -- Seed 2 due-today PLANNED expenses (with sensitive title/amount/memo), plus overdue, confirmed, cancelled, and pending user A.
    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R107B 비밀 지출 항목A 88000원', '게임', 'PLANNED', v_today, 88000, 88000, 'R107B 비밀 메모 A')
    RETURNING id INTO v_e1;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R107B 비밀 지출 항목B 12000원', '정기 구독', 'PLANNED', v_today, 12000, 12000, 'R107B 비밀 메모 B')
    RETURNING id INTO v_e2;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R107B 연체 예정', '게임', 'PLANNED', v_today - 1, 5000, 5000, 'overdue')
    RETURNING id INTO v_e_overdue;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_b, 'R107B 오늘 확정', '게임', 'CONFIRMED', v_today, 5000, 5000, 'confirmed')
    RETURNING id INTO v_e_confirmed;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, cancellation_kind, memo)
    VALUES (v_user_b, 'R107B 오늘 취소', '게임', 'CANCELLED', v_today, 5000, 5000, 'PLANNED_CANCEL', 'cancelled')
    RETURNING id INTO v_e_cancelled;

    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, memo)
    VALUES (v_user_a, 'R107B 대기 사용자 지출', '게임', 'PLANNED', v_today, 15000, 15000, 'pending a')
    RETURNING id INTO v_e_a;

    -- B-1, B-3 (missing settings defaults true, pending-deletion user A excluded), B-4 (privacy & link_path).
    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted < 1 THEN
        RAISE EXCEPTION 'FAIL: R107B first enqueue expected >= 1 row, got %', v_inserted;
    END IF;

    SELECT * INTO v_nt
    FROM public.notifications
    WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today;
    IF NOT FOUND
       OR v_nt.source_id <> v_user_b
       OR v_nt.title <> '오늘 결제 예정 2건'
       OR v_nt.body <> '오늘 결제 예정인 지출을 지출 관리에서 확인하세요.'
       OR v_nt.link_path <> '/dashboard/expenses'
       OR v_nt.link_path !~ '^/' OR v_nt.link_path ~ '^//'
       OR position('88000' IN v_nt.title || v_nt.body) > 0
       OR position('12000' IN v_nt.title || v_nt.body) > 0
       OR position('R107B 비밀' IN v_nt.title || v_nt.body) > 0 THEN
        RAISE EXCEPTION 'FAIL: R107B EXPENSE_DUE_TODAY notification missing, malformed, or leaked sensitive data (title=%, body=%)',
            v_nt.title, v_nt.body;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_user_a AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today
    ) THEN
        RAISE EXCEPTION 'FAIL: R107B generated EXPENSE_DUE_TODAY for pending-deletion user A';
    END IF;

    -- B-2 (same-day dedupe): adding a 3rd PLANNED row and re-running keeps the original 1 row unchanged.
    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_user_b, 'R107B 추가 지출 3', '기타', 'PLANNED', v_today, 3000, 3000)
    RETURNING id INTO v_e3;

    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted <> 0
       OR (SELECT count(*) FROM public.notifications WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today) <> 1
       OR (SELECT title FROM public.notifications WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today) <> '오늘 결제 예정 2건' THEN
        RAISE EXCEPTION 'FAIL: R107B same-day repeat enqueue was not deduplicated (inserted=%)', v_inserted;
    END IF;

    -- B-2 (next day creates a new row): shift previous row to v_today - 1, then enqueue inserts a fresh row for v_today.
    UPDATE public.notifications
    SET scheduled_for = v_today - 1
    WHERE id = v_nt.id;

    v_inserted := public.enqueue_daily_notifications();
    IF v_inserted <> 1
       OR (SELECT count(*) FROM public.notifications WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY') <> 2
       OR (SELECT title FROM public.notifications WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today) <> '오늘 결제 예정 3건' THEN
        RAISE EXCEPTION 'FAIL: R107B next-day enqueue did not create a new summary row (inserted=%)', v_inserted;
    END IF;

    -- B-3 (opt-out): expense_due_today = false prevents EXPENSE_DUE_TODAY generation.
    DELETE FROM public.notifications WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY';
    INSERT INTO public.notification_settings(user_id, expense_due_today)
    VALUES (v_user_b, false)
    ON CONFLICT (user_id) DO UPDATE SET expense_due_today = false, updated_at = NOW();

    v_inserted := public.enqueue_daily_notifications();
    IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today
    ) THEN
        RAISE EXCEPTION 'FAIL: R107B generated EXPENSE_DUE_TODAY despite expense_due_today = false';
    END IF;

    -- R107B-02 (B-5): Push queue handling for EXPENSE_DUE_TODAY (unsubscribed -> SKIPPED, subscribed + push_enabled -> SENT).
    UPDATE public.notifications SET push_status = 'SKIPPED', pushed_at = NOW() WHERE push_status = 'PENDING';
    UPDATE public.notification_settings
    SET expense_due_today = true, push_enabled = false, updated_at = NOW()
    WHERE user_id = v_user_b;
    DELETE FROM public.push_subscriptions WHERE user_id = v_user_b;

    PERFORM public.enqueue_daily_notifications();
    SELECT * INTO v_nt
    FROM public.notifications
    WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: R107B failed to re-enqueue EXPENSE_DUE_TODAY after re-enabling setting';
    END IF;

    SELECT count(*) INTO v_claimed_count FROM public.claim_pending_push_notifications(50);
    IF v_claimed_count <> 0
       OR (SELECT push_status FROM public.notifications WHERE id = v_nt.id) <> 'SKIPPED' THEN
        RAISE EXCEPTION 'FAIL: R107B unsubscribed/disabled EXPENSE_DUE_TODAY was not marked SKIPPED (claimed=%)', v_claimed_count;
    END IF;

    -- Subscribed + push_enabled=true -> claimed and completed as SENT.
    DELETE FROM public.notifications WHERE id = v_nt.id;
    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth, platform, user_agent_label, created_at)
    VALUES (v_user_b, 'https://push.example.test/r107b/user-b', repeat('P', 65), repeat('A', 22), 'web', 'Chrome · R107B', NOW() - INTERVAL '1 minute');
    UPDATE public.notification_settings SET push_enabled = true, updated_at = NOW() WHERE user_id = v_user_b;

    PERFORM public.enqueue_daily_notifications();
    SELECT * INTO v_nt
    FROM public.notifications
    WHERE user_id = v_user_b AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today;

    SELECT count(*) INTO v_claimed_count
    FROM public.claim_pending_push_notifications(50)
    WHERE notification_id = v_nt.id AND kind = 'EXPENSE_DUE_TODAY';
    IF v_claimed_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: R107B subscribed EXPENSE_DUE_TODAY was not claimed for push delivery (claimed=%)', v_claimed_count;
    END IF;

    PERFORM public.complete_push_notification_delivery(v_nt.id, 'SENT', '{}'::TEXT[], ARRAY['https://push.example.test/r107b/user-b']::TEXT[]);
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications WHERE id = v_nt.id AND push_status = 'SENT' AND pushed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R107B subscribed EXPENSE_DUE_TODAY did not transition to SENT';
    END IF;

    -- Clean up R107B fixture rows so subsequent test blocks remain unaffected.
    DELETE FROM public.notifications WHERE id = v_nt.id;
    DELETE FROM public.push_subscriptions WHERE user_id = v_user_b AND endpoint = 'https://push.example.test/r107b/user-b';
    DELETE FROM public.expenses WHERE id IN (v_e1, v_e2, v_e3, v_e_overdue, v_e_confirmed, v_e_cancelled, v_e_a);
END $$;
\echo PASS: R107B EXPENSE_DUE_TODAY daily summary, privacy, dedupe, opt-out, pending-deletion, and push SKIPPED/SENT checks

-- User A's PENDING account deletion request (R13-07) is only needed up to R35; later blocks write as user A.
DELETE FROM public.account_deletion_requests WHERE user_id = :'test_user_id'::uuid AND status_token_hash = repeat('a', 64);

-- R64 classification option icons (spec §7 + R80 amendment):
-- admin CRUD/upsert/updated_at, non-admin & user_metadata spoof denial, anon write denial,
-- approved/non-approved read scope, SQLSTATE+message-level CHECK/trigger negatives,
-- reorder keep, option/axis removal cleanup, and game delete ON DELETE CASCADE.
UPDATE public.games
SET status = 'APPROVED'
WHERE id = current_setting('chronoledger.r13_game_id')::uuid;

INSERT INTO public.games (name, default_icon_url, status, classification_schema)
VALUES (
    'R64 Approved Test Game',
    'https://example.invalid/r64-approved.webp',
    'APPROVED',
    '{
        "rarities": ["5성"],
        "axes": [
            {"key": "element", "label": "속성", "options": ["불", "물", "바람", "번개"]},
            {"key": "weapon", "label": "무기", "options": ["검", "활"]}
        ]
    }'::jsonb
)
RETURNING id AS r64_approved_game_id \gset
SELECT set_config('chronoledger.r64_approved_game_id', :'r64_approved_game_id', true);

-- Verify R64 CHECK constraints, non-approved game CHECK guard (games_status_check),
-- and the two RLS policies (APPROVED-only public read + admin ALL).
DO $$
DECLARE
    v_cnt INT;
    v_read_qual TEXT;
    v_admin_cmd CHAR(1);
BEGIN
    SELECT count(*) INTO v_cnt
    FROM pg_constraint
    WHERE conrelid = 'public.game_classification_icons'::regclass
      AND convalidated = true
      AND conname IN (
          'chk_game_classification_icons_axis_key',
          'chk_game_classification_icons_option',
          'chk_game_classification_icons_icon'
      );
    IF v_cnt <> 3 THEN
        RAISE EXCEPTION 'FAIL: R64 expected 3 validated CHECK constraints, got %', v_cnt;
    END IF;

    -- Schema enforces status = 'APPROVED' on public.games (so non-approved rows cannot exist directly);
    -- verify both that CHECK and the APPROVED filter inside the Read icons of approved games RLS policy.
    BEGIN
        INSERT INTO public.games (name, default_icon_url, status)
        VALUES ('R64 Pending Test Game', 'https://example.invalid/r64-pending.webp', 'PENDING');
        RAISE EXCEPTION 'FAIL: R64 non-approved game row was unexpectedly accepted by public.games';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM NOT LIKE '%games_status_check%' THEN
            RAISE EXCEPTION 'FAIL: R64 non-approved game unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    SELECT pg_get_expr(polqual, polrelid) INTO v_read_qual
    FROM pg_policy
    WHERE polrelid = 'public.game_classification_icons'::regclass
      AND polname = 'Read icons of approved games'
      AND polcmd = 'r';
    IF v_read_qual IS NULL OR v_read_qual NOT LIKE '%APPROVED%' THEN
        RAISE EXCEPTION 'FAIL: R64 Read icons of approved games policy missing APPROVED filter (%)', v_read_qual;
    END IF;

    SELECT polcmd INTO v_admin_cmd
    FROM pg_policy
    WHERE polrelid = 'public.game_classification_icons'::regclass
      AND polname = 'Admin manage classification icons';
    IF v_admin_cmd IS DISTINCT FROM '*' THEN
        RAISE EXCEPTION 'FAIL: R64 Admin manage classification icons policy expected cmd=*, got %', v_admin_cmd;
    END IF;
END;
$$;

-- §7-1: Admin (JWT app_metadata.role = admin) inserts icons (including exact 20,000-char boundary),
-- upserts with updated_at advancing, and deletes an icon.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.other_user_id'),
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SET LOCAL ROLE authenticated;

INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
VALUES
    (current_setting('chronoledger.r13_game_id')::uuid, 'element', '불', 'data:image/webp;base64,' || repeat('A', 32)),
    (current_setting('chronoledger.r64_approved_game_id')::uuid, 'element', '불', 'data:image/webp;base64,' || repeat('A', 32)),
    (current_setting('chronoledger.r64_approved_game_id')::uuid, 'element', '물', 'data:image/webp;base64,' || repeat('B', 20000 - 23)),
    (current_setting('chronoledger.r64_approved_game_id')::uuid, 'element', '바람', 'data:image/webp;base64,' || repeat('C', 32)),
    (current_setting('chronoledger.r64_approved_game_id')::uuid, 'weapon', '검', 'data:image/webp;base64,' || repeat('D', 32)),
    (current_setting('chronoledger.r64_approved_game_id')::uuid, 'weapon', '활', 'data:image/webp;base64,' || repeat('E', 32));
-- Verify BEFORE INSERT and BEFORE UPDATE trigger enforces NEW.updated_at := NOW() even if caller supplies a stale timestamp.
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
    v_stale_ts TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
    v_new_ts TIMESTAMPTZ;
    v_new_url TEXT;
    v_deleted INT;
BEGIN
    INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url, updated_at)
    VALUES (v_game_id, 'element', '불', 'data:image/webp;base64,' || repeat('Z', 32), v_stale_ts)
    ON CONFLICT (game_id, axis_key, option_value)
    DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url, updated_at = v_stale_ts
    RETURNING updated_at, icon_data_url INTO v_new_ts, v_new_url;

    IF v_new_ts <= v_stale_ts OR v_new_ts <> NOW() OR v_new_url <> 'data:image/webp;base64,' || repeat('Z', 32) THEN
        RAISE EXCEPTION 'FAIL: R64 admin upsert did not refresh updated_at to NOW() or update icon_data_url (stale=%, new=%)', v_stale_ts, v_new_ts;
    END IF;

    DELETE FROM public.game_classification_icons
    WHERE game_id = v_game_id AND axis_key = 'weapon' AND option_value = '활';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    IF v_deleted <> 1 THEN
        RAISE EXCEPTION 'FAIL: R64 admin delete expected 1 row, got %', v_deleted;
    END IF;

    -- Restore weapon/활 (with stale updated_at to verify BEFORE INSERT override too) for the axis-removal cleanup check below.
    INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url, updated_at)
    VALUES (v_game_id, 'weapon', '활', 'data:image/webp;base64,' || repeat('E', 32), v_stale_ts)
    RETURNING updated_at INTO v_new_ts;
    IF v_new_ts <= v_stale_ts OR v_new_ts <> NOW() THEN
        RAISE EXCEPTION 'FAIL: R64 admin insert did not refresh updated_at to NOW() (stale=%, new=%)', v_stale_ts, v_new_ts;
    END IF;
END;
$$;

-- §7-5, §7-6, §7-8: Negative CHECK and validation-trigger assertions (SQLSTATE + message/constraint).
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
BEGIN
    -- Unknown option -> validation trigger (23514, 'classification option not found').
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'element', '없는 옵션', 'data:image/webp;base64,' || repeat('A', 32));
        RAISE EXCEPTION 'FAIL: R64 invalid classification option accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM <> 'classification option not found' THEN
            RAISE EXCEPTION 'FAIL: R64 unknown option unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Unknown axis -> validation trigger (23514, 'classification option not found').
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'unknown_axis', '불', 'data:image/webp;base64,' || repeat('A', 32));
        RAISE EXCEPTION 'FAIL: R64 unknown axis accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM <> 'classification option not found' THEN
            RAISE EXCEPTION 'FAIL: R64 unknown axis unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Invalid axis_key (uppercase/hyphen and >24 chars): the BEFORE trigger runs before CHECK constraints, so with the
    -- trigger enabled the trigger message is the only accepted error. The CHECK guard alone is pinned below (R75-REV-001).
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'Bad-Key!', '불', 'data:image/webp;base64,' || repeat('A', 32));
        RAISE EXCEPTION 'FAIL: R64 bad axis_key accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM <> 'classification option not found' THEN
            RAISE EXCEPTION 'FAIL: R64 bad axis_key unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'a' || repeat('b', 24), '불', 'data:image/webp;base64,' || repeat('A', 32));
        RAISE EXCEPTION 'FAIL: R64 overlong axis_key accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM <> 'classification option not found' THEN
            RAISE EXCEPTION 'FAIL: R64 overlong axis_key unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Blank/whitespace option_value: also stopped by the trigger first (not an option of the axis).
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'element', '   ', 'data:image/webp;base64,' || repeat('A', 32));
        RAISE EXCEPTION 'FAIL: R64 blank option_value accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM <> 'classification option not found' THEN
            RAISE EXCEPTION 'FAIL: R64 blank option_value unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Non-WebP Data URL -> chk_game_classification_icons_icon.
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'element', '물', 'data:image/png;base64,' || repeat('A', 32))
        ON CONFLICT (game_id, axis_key, option_value)
        DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url;
        RAISE EXCEPTION 'FAIL: R64 non-WebP data URL accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM NOT LIKE '%chk_game_classification_icons_icon%' THEN
            RAISE EXCEPTION 'FAIL: R64 non-WebP data URL unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- External https:// URL -> chk_game_classification_icons_icon.
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'element', '물', 'https://example.invalid/icon.webp')
        ON CONFLICT (game_id, axis_key, option_value)
        DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url;
        RAISE EXCEPTION 'FAIL: R64 https URL accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM NOT LIKE '%chk_game_classification_icons_icon%' THEN
            RAISE EXCEPTION 'FAIL: R64 https URL unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Exact 20,001-char WebP Data URL -> chk_game_classification_icons_icon.
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_game_id, 'element', '물', 'data:image/webp;base64,' || repeat('A', 20001 - 23))
        ON CONFLICT (game_id, axis_key, option_value)
        DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url;
        RAISE EXCEPTION 'FAIL: R64 20001-char icon accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLSTATE <> '23514' OR SQLERRM NOT LIKE '%chk_game_classification_icons_icon%' THEN
            RAISE EXCEPTION 'FAIL: R64 oversized icon unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- §7-4 (admin): Admin can read all 5 icons of the test game.
    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = v_game_id) <> 5 THEN
        RAISE EXCEPTION 'FAIL: R64 admin could not read approved game icons';
    END IF;
END;
$$;
RESET ROLE;

-- R75-REV-001: each CHECK guard on its own. The validation trigger is disabled inside this rollback-only transaction so
-- the axis_key format and blank option CHECK constraints are the only guards left; the constraint name is pinned exactly.
ALTER TABLE public.game_classification_icons DISABLE TRIGGER trg_validate_game_classification_icon;
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
    v_case RECORD;
    v_constraint TEXT;
BEGIN
    FOR v_case IN
        SELECT * FROM (VALUES
            ('Bad-Key!', '불', 'chk_game_classification_icons_axis_key'),
            ('a' || repeat('b', 24), '불', 'chk_game_classification_icons_axis_key'),
            ('element', '   ', 'chk_game_classification_icons_option')
        ) AS c(axis_key, option_value, expected)
    LOOP
        BEGIN
            INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
            VALUES (v_game_id, v_case.axis_key, v_case.option_value, 'data:image/webp;base64,' || repeat('A', 32));
            RAISE EXCEPTION 'FAIL: R64 CHECK guard % accepted axis_key=% option=%', v_case.expected, v_case.axis_key, v_case.option_value;
        EXCEPTION WHEN check_violation THEN
            GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
            IF v_constraint IS DISTINCT FROM v_case.expected THEN
                RAISE EXCEPTION 'FAIL: R64 expected constraint %, got % (%)', v_case.expected, v_constraint, SQLERRM;
            END IF;
        END;
    END LOOP;
END;
$$;
ALTER TABLE public.game_classification_icons ENABLE TRIGGER trg_validate_game_classification_icon;
\echo PASS: R75-REV-001 R64 axis_key format and blank option CHECK guards isolated from the validation trigger

-- §7-2, §7-4 (regular authenticated user): can read APPROVED game icons;
-- INSERT fails with 42501 RLS, UPDATE and DELETE affect 0 rows.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.test_user_id'),
        'role', 'authenticated'
    )::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.test_user_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_approved_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
    v_rows INT;
BEGIN
    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = v_approved_id) <> 5 THEN
        RAISE EXCEPTION 'FAIL: R64 regular user could not read approved-game icons';
    END IF;

    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_approved_id, 'element', '번개', 'data:image/webp;base64,' || repeat('X', 32));
        RAISE EXCEPTION 'FAIL: R64 regular user INSERT succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE '%row-level security%' THEN
            RAISE EXCEPTION 'FAIL: R64 regular user INSERT unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    UPDATE public.game_classification_icons
    SET icon_data_url = 'data:image/webp;base64,' || repeat('X', 32)
    WHERE game_id = v_approved_id AND axis_key = 'element' AND option_value = '불';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R64 regular user UPDATE affected % rows', v_rows;
    END IF;

    DELETE FROM public.game_classification_icons
    WHERE game_id = v_approved_id AND axis_key = 'element' AND option_value = '불';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R64 regular user DELETE affected % rows', v_rows;
    END IF;
END;
$$;
RESET ROLE;

-- §7-3 (R80-amended security boundary): user_metadata.role = 'admin' is NEVER accepted as admin.
-- (Note: public.users.role = 'admin' without JWT is intentionally allowed since R80 and verified in the R80 block below.)
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.test_user_id'),
        'role', 'authenticated',
        'user_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.test_user_id'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_approved_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
    v_rows INT;
BEGIN
    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_approved_id, 'element', '번개', 'data:image/webp;base64,' || repeat('S', 32));
        RAISE EXCEPTION 'FAIL: R64 user_metadata admin spoof INSERT succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE '%row-level security%' THEN
            RAISE EXCEPTION 'FAIL: R64 user_metadata spoof INSERT unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;

    UPDATE public.game_classification_icons
    SET icon_data_url = 'data:image/webp;base64,' || repeat('S', 32)
    WHERE game_id = v_approved_id AND axis_key = 'element' AND option_value = '불';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R64 user_metadata spoof UPDATE affected % rows', v_rows;
    END IF;

    DELETE FROM public.game_classification_icons
    WHERE game_id = v_approved_id AND axis_key = 'element' AND option_value = '불';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN
        RAISE EXCEPTION 'FAIL: R64 user_metadata spoof DELETE affected % rows', v_rows;
    END IF;
END;
$$;
RESET ROLE;

-- §7-4 (anon): reads APPROVED game icons (both r13 and r64_approved) and cannot write.
SET LOCAL ROLE anon;
DO $$
DECLARE
    v_approved_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND axis_key = 'element'
          AND option_value = '불'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 approved-game anon read denied';
    END IF;

    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = v_approved_id) <> 5 THEN
        RAISE EXCEPTION 'FAIL: R64 anon did not read all 5 approved-game icons';
    END IF;

    BEGIN
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (v_approved_id, 'element', '불', 'data:image/webp;base64,' || repeat('N', 32));
        RAISE EXCEPTION 'FAIL: R64 anon INSERT succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE '%permission denied%' THEN
            RAISE EXCEPTION 'FAIL: R64 anon INSERT unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;
END;
$$;
RESET ROLE;

-- §7-7: Cleanup trigger (reorder keeps all, option removal deletes only that option,
-- axis removal deletes all icons of that axis) and game delete ON DELETE CASCADE.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object(
        'sub', current_setting('chronoledger.other_user_id'),
        'role', 'authenticated',
        'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SET LOCAL ROLE authenticated;

-- Reorder options on r64_approved_game_id: all 5 icons must be preserved.
UPDATE public.games
SET classification_schema = '{
    "rarities": ["5성"],
    "axes": [
        {"key": "element", "label": "속성", "options": ["바람", "물", "불"]},
        {"key": "weapon", "label": "무기", "options": ["활", "검"]}
    ]
}'::jsonb
WHERE id = current_setting('chronoledger.r64_approved_game_id')::uuid;

DO $$
BEGIN
    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = current_setting('chronoledger.r64_approved_game_id')::uuid) <> 5 THEN
        RAISE EXCEPTION 'FAIL: R64 option reorder dropped classification icons';
    END IF;
END;
$$;

-- Remove one option ('불') from element: only element/불 is deleted, remaining 4 stay.
UPDATE public.games
SET classification_schema = '{
    "rarities": ["5성"],
    "axes": [
        {"key": "element", "label": "속성", "options": ["바람", "물"]},
        {"key": "weapon", "label": "무기", "options": ["활", "검"]}
    ]
}'::jsonb
WHERE id = current_setting('chronoledger.r64_approved_game_id')::uuid;

DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.game_classification_icons
        WHERE game_id = v_game_id AND axis_key = 'element' AND option_value = '불'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 removed option icon was not cleaned';
    END IF;
    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = v_game_id) <> 4 THEN
        RAISE EXCEPTION 'FAIL: R64 removing one option affected unrelated icons';
    END IF;
END;
$$;

-- Remove the entire 'weapon' axis: both weapon icons are deleted, 2 element icons remain.
UPDATE public.games
SET classification_schema = '{
    "rarities": ["5성"],
    "axes": [
        {"key": "element", "label": "속성", "options": ["바람", "물"]}
    ]
}'::jsonb
WHERE id = current_setting('chronoledger.r64_approved_game_id')::uuid;

DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r64_approved_game_id')::uuid;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.game_classification_icons
        WHERE game_id = v_game_id AND axis_key = 'weapon'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 removed axis icons were not cleaned';
    END IF;
    IF (SELECT count(*) FROM public.game_classification_icons WHERE game_id = v_game_id) <> 2 THEN
        RAISE EXCEPTION 'FAIL: R64 removing weapon axis affected element icons';
    END IF;
END;
$$;

-- Keep original r13_game_id cleanup check and state expected by R80/R76 below.
UPDATE public.games
SET classification_schema = jsonb_set(classification_schema, '{axes,0,options}', '["물"]'::jsonb)
WHERE id = current_setting('chronoledger.r13_game_id')::uuid;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND axis_key = 'element'
          AND option_value = '불'
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 removed classification option icon was not cleaned';
    END IF;
END;
$$;
RESET ROLE;

-- Deleting the dedicated R64 game must cascade-delete all remaining classification icons.
DELETE FROM public.games
WHERE id = current_setting('chronoledger.r64_approved_game_id')::uuid;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r64_approved_game_id')::uuid
    ) THEN
        RAISE EXCEPTION 'FAIL: R64 game deletion did not cascade-delete classification icons';
    END IF;
END;
$$;
\echo PASS: R64 classification option icon CRUD, RLS/read scope, SQLSTATE/message validation, cleanup, and CASCADE

-- R80: an admin promoted only through public.users.role (no JWT app_metadata.role) can write icons;
-- the same user without the role is denied by RLS.
SELECT role AS r80_original_role FROM public.users WHERE id = :'test_user_id'::uuid \gset
UPDATE public.users SET role = 'admin' WHERE id = :'test_user_id'::uuid;
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.test_user_id'), 'role', 'authenticated')::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.test_user_id'), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
VALUES (current_setting('chronoledger.r13_game_id')::uuid, 'element', '물', 'data:image/webp;base64,' || repeat('B', 32))
ON CONFLICT (game_id, axis_key, option_value) DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid
          AND axis_key = 'element' AND option_value = '물'
          AND icon_data_url = 'data:image/webp;base64,' || repeat('B', 32)
    ) THEN
        RAISE EXCEPTION 'FAIL: R80 users.role admin could not write a classification icon';
    END IF;
END;
$$;
RESET ROLE;
UPDATE public.users SET role = :'r80_original_role' WHERE id = :'test_user_id'::uuid;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        DELETE FROM public.game_classification_icons
        WHERE game_id = current_setting('chronoledger.r13_game_id')::uuid AND axis_key = 'element' AND option_value = '물';
        IF FOUND THEN
            RAISE EXCEPTION 'FAIL: R80 non-admin deleted a classification icon';
        END IF;
        INSERT INTO public.game_classification_icons (game_id, axis_key, option_value, icon_data_url)
        VALUES (current_setting('chronoledger.r13_game_id')::uuid, 'element', '물', 'data:image/webp;base64,' || repeat('C', 32))
        ON CONFLICT (game_id, axis_key, option_value) DO UPDATE SET icon_data_url = EXCLUDED.icon_data_url;
        RAISE EXCEPTION 'FAIL: R80 non-admin wrote a classification icon';
    EXCEPTION WHEN insufficient_privilege THEN
        IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE '%row-level security%' THEN
            RAISE EXCEPTION 'FAIL: R80 non-admin upsert unexpected error (% / %)', SQLSTATE, SQLERRM;
        END IF;
    END;
END;
$$;
RESET ROLE;
\echo PASS: R80 users.role admin writes classification icons, non-admin is denied

-- R76 empty presets, atomic slot changes, preset ordering, and RPC ACL.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.test_user_id'), 'role', 'authenticated')::text,
    true
);
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.test_user_id'), true);
SET LOCAL ROLE authenticated;
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (
    current_setting('chronoledger.test_user_id')::uuid,
    current_setting('chronoledger.r13_game_id')::uuid,
    'R76 empty',
    '{}'::uuid[]
) RETURNING id AS r76_empty_preset \gset
SELECT set_config('chronoledger.r76_empty_preset_id', :'r76_empty_preset', true);
SELECT public.update_character_preset_slots(
    jsonb_build_array(jsonb_build_object(
        'id', :'r76_empty_preset'::uuid,
        'expected', ARRAY[]::uuid[],
        'next', ARRAY[:'r13_character_1'::uuid]
    ))
);
DO $$
BEGIN
    BEGIN
        PERFORM public.update_character_preset_slots(
            jsonb_build_array(jsonb_build_object(
                'id', current_setting('chronoledger.r76_empty_preset_id')::uuid,
                'expected', ARRAY[]::uuid[],
                'next', ARRAY[]::uuid[]
            ))
        );
        RAISE EXCEPTION 'FAIL: R76 stale preset update succeeded';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;
END;
$$;
SELECT public.reorder_character_presets(
    current_setting('chronoledger.r13_game_id')::uuid,
    ARRAY[
        current_setting('chronoledger.r76_empty_preset_id')::uuid,
        current_setting('chronoledger.r13_over_limit_preset_id')::uuid,
        current_setting('chronoledger.r13_game_change_preset_id')::uuid,
        current_setting('chronoledger.r13_empty_preset_id')::uuid
    ]
);
DO $$
BEGIN
    IF (SELECT sort_order FROM public.user_character_presets
        WHERE id = current_setting('chronoledger.r76_empty_preset_id')::uuid) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R76 preset order was not saved';
    END IF;
END;
$$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.reorder_character_presets(
            current_setting('chronoledger.r13_game_id')::uuid,
            ARRAY[]::uuid[]
        );
        RAISE EXCEPTION 'FAIL: R76 anon reorder RPC executed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.update_character_preset_slots('[]'::jsonb);
        RAISE EXCEPTION 'FAIL: R76 anon slot RPC executed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END;
$$;
-- R76 RPC edge cases (spec 4.5). psql does not substitute :'vars' inside dollar-quoted DO bodies,
-- so every id is passed through set_config/current_setting.
SET LOCAL ROLE authenticated;
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 move source', ARRAY[current_setting('chronoledger.r13_character_3_id')::uuid])
RETURNING id AS r76_move_source \gset
SELECT set_config('chronoledger.r76_move_source_id', :'r76_move_source', true);
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 move target', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid])
RETURNING id AS r76_move_target \gset
SELECT set_config('chronoledger.r76_move_target_id', :'r76_move_target', true);
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 full target', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid, current_setting('chronoledger.r13_character_2_id')::uuid])
RETURNING id AS r76_full_target \gset
SELECT set_config('chronoledger.r76_full_target_id', :'r76_full_target', true);
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 duplicate source', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid])
RETURNING id AS r76_dup_source \gset
SELECT set_config('chronoledger.r76_dup_source_id', :'r76_dup_source', true);
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 duplicate target', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid])
RETURNING id AS r76_dup_target \gset
SELECT set_config('chronoledger.r76_dup_target_id', :'r76_dup_target', true);
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.test_user_id')::uuid, current_setting('chronoledger.r13_other_game_id')::uuid,
        'R76 other game', ARRAY[current_setting('chronoledger.r13_other_character_id')::uuid])
RETURNING id AS r76_other_game_preset \gset
SELECT set_config('chronoledger.r76_other_game_preset_id', :'r76_other_game_preset', true);
RESET ROLE;
INSERT INTO public.user_character_presets (user_id, game_id, title, character_ids)
VALUES (current_setting('chronoledger.other_user_id')::uuid, current_setting('chronoledger.r13_game_id')::uuid,
        'R76 other user', ARRAY[current_setting('chronoledger.r13_character_1_id')::uuid])
RETURNING id AS r76_other_user_preset \gset
SELECT set_config('chronoledger.r76_other_user_preset_id', :'r76_other_user_preset', true);

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_game UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_c1 UUID := current_setting('chronoledger.r13_character_1_id')::uuid;
    v_c2 UUID := current_setting('chronoledger.r13_character_2_id')::uuid;
    v_c3 UUID := current_setting('chronoledger.r13_character_3_id')::uuid;
    v_other UUID := current_setting('chronoledger.r13_other_character_id')::uuid;
    v_source UUID := current_setting('chronoledger.r76_move_source_id')::uuid;
    v_target UUID := current_setting('chronoledger.r76_move_target_id')::uuid;
    v_full UUID := current_setting('chronoledger.r76_full_target_id')::uuid;
    v_dup UUID := current_setting('chronoledger.r76_dup_source_id')::uuid;
    v_dup_target UUID := current_setting('chronoledger.r76_dup_target_id')::uuid;
    v_other_game UUID := current_setting('chronoledger.r76_other_game_preset_id')::uuid;
    v_other_user UUID := current_setting('chronoledger.r76_other_user_preset_id')::uuid;
    v_all UUID[];
BEGIN
    -- Cross-preset move succeeds and saves both rows.
    PERFORM public.update_character_preset_slots(jsonb_build_array(
        jsonb_build_object('id', v_source, 'expected', ARRAY[v_c3], 'next', ARRAY[]::uuid[]),
        jsonb_build_object('id', v_target, 'expected', ARRAY[v_c1], 'next', ARRAY[v_c1, v_c3])
    ));
    IF (SELECT character_ids FROM public.user_character_presets WHERE id = v_source) IS DISTINCT FROM ARRAY[]::uuid[]
       OR (SELECT character_ids FROM public.user_character_presets WHERE id = v_target) IS DISTINCT FROM ARRAY[v_c1, v_c3] THEN
        RAISE EXCEPTION 'FAIL: R76 cross-preset move was not applied';
    END IF;

    -- Atomicity: the second row would exceed the game slot limit (2), so the first row must roll back too.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_target, 'expected', ARRAY[v_c1, v_c3], 'next', ARRAY[v_c1]),
            jsonb_build_object('id', v_full, 'expected', ARRAY[v_c1, v_c2], 'next', ARRAY[v_c1, v_c2, v_c3])
        ));
        RAISE EXCEPTION 'FAIL: R76 move over the slot limit was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%최대 슬롯%' THEN RAISE; END IF;
    END;
    IF (SELECT character_ids FROM public.user_character_presets WHERE id = v_target) IS DISTINCT FROM ARRAY[v_c1, v_c3]
       OR (SELECT character_ids FROM public.user_character_presets WHERE id = v_full) IS DISTINCT FROM ARRAY[v_c1, v_c2] THEN
        RAISE EXCEPTION 'FAIL: R76 failed move partially committed';
    END IF;

    -- A duplicate in the target (multiset-preserving move) is rejected by the validation trigger; both rows stay.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_dup, 'expected', ARRAY[v_c1], 'next', ARRAY[]::uuid[]),
            jsonb_build_object('id', v_dup_target, 'expected', ARRAY[v_c1], 'next', ARRAY[v_c1, v_c1])
        ));
        RAISE EXCEPTION 'FAIL: R76 duplicate in target was accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '%중복%' THEN RAISE; END IF;
    END;
    IF (SELECT character_ids FROM public.user_character_presets WHERE id = v_dup) IS DISTINCT FROM ARRAY[v_c1]
       OR (SELECT character_ids FROM public.user_character_presets WHERE id = v_dup_target) IS DISTINCT FROM ARRAY[v_c1] THEN
        RAISE EXCEPTION 'FAIL: R76 rejected duplicate move partially committed';
    END IF;

    -- A two-row change that loses or invents a character is not a move.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_target, 'expected', ARRAY[v_c1, v_c3], 'next', ARRAY[v_c1]),
            jsonb_build_object('id', v_full, 'expected', ARRAY[v_c1, v_c2], 'next', ARRAY[v_c1, v_c2])
        ));
        RAISE EXCEPTION 'FAIL: R76 non-move two-row change was accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- Presets of different games cannot be changed together.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_target, 'expected', ARRAY[v_c1, v_c3], 'next', ARRAY[v_c1, v_c3]),
            jsonb_build_object('id', v_other_game, 'expected', ARRAY[v_other], 'next', ARRAY[v_other])
        ));
        RAISE EXCEPTION 'FAIL: R76 different-game change was accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- Three objects are rejected.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_target, 'expected', ARRAY[v_c1, v_c3], 'next', ARRAY[v_c1, v_c3]),
            jsonb_build_object('id', v_full, 'expected', ARRAY[v_c1, v_c2], 'next', ARRAY[v_c1, v_c2]),
            jsonb_build_object('id', v_dup, 'expected', ARRAY[v_c1], 'next', ARRAY[v_c1])
        ));
        RAISE EXCEPTION 'FAIL: R76 three-object change was accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;

    -- Another user's preset is invisible under RLS, so it reads as changed.
    BEGIN
        PERFORM public.update_character_preset_slots(jsonb_build_array(
            jsonb_build_object('id', v_other_user, 'expected', ARRAY[v_c1], 'next', ARRAY[]::uuid[])
        ));
        RAISE EXCEPTION 'FAIL: R76 other-user slot change was accepted';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;

    -- reorder_character_presets needs exactly the caller's presets of the game.
    SELECT array_agg(id ORDER BY sort_order, created_at, id) INTO v_all
    FROM public.user_character_presets
    WHERE user_id = auth.uid() AND game_id = v_game;
    BEGIN
        PERFORM public.reorder_character_presets(v_game, v_all[2:]);
        RAISE EXCEPTION 'FAIL: R76 reorder with a missing preset was accepted';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;
    BEGIN
        PERFORM public.reorder_character_presets(v_game, v_all || gen_random_uuid());
        RAISE EXCEPTION 'FAIL: R76 reorder with an extra id was accepted';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;
    BEGIN
        PERFORM public.reorder_character_presets(v_game, v_all || v_other_user);
        RAISE EXCEPTION 'FAIL: R76 reorder with another user''s preset was accepted';
    EXCEPTION WHEN serialization_failure THEN NULL;
    END;
    PERFORM public.reorder_character_presets(v_game, v_all);
END;
$$;
RESET ROLE;
\echo PASS: R76 empty presets, atomic slot RPC, preset ordering, and anon ACL

-- R85: schedule start_at/end_at/estimated flags, games.daily_reset_time, approve_schedule_request copy,
-- expense trigger immunity to time-only edits, and anon visibility.
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_user_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_sched_id UUID;
    v_exp_id UUID;
    v_exp_start DATE;
    v_exp_end DATE;
    v_exp_target DATE;
BEGIN
    -- 1) games.daily_reset_time rejects seconds and sub-seconds, accepts HH:MM and NULL.
    BEGIN
        UPDATE public.games SET daily_reset_time = TIME '05:00:30' WHERE id = v_game_id;
        RAISE EXCEPTION 'FAIL: R85 daily_reset_time accepted seconds';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        UPDATE public.games SET daily_reset_time = TIME '05:00:00.5' WHERE id = v_game_id;
        RAISE EXCEPTION 'FAIL: R85 daily_reset_time accepted fractional seconds';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE public.games SET daily_reset_time = TIME '00:00' WHERE id = v_game_id;
    UPDATE public.games SET daily_reset_time = NULL WHERE id = v_game_id;
    UPDATE public.games SET daily_reset_time = TIME '05:00' WHERE id = v_game_id;

    -- 2) game_schedules CHECKs: KST date mismatch, UTC/KST midnight boundary, order, seconds, estimated without timestamp.
    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at)
        VALUES (v_game_id, 'R85 bad start date', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-21 00:00:00+09');
        RAISE EXCEPTION 'FAIL: R85 start_at date mismatch was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        -- 2026-11-19T15:00:00Z is 2026-11-20 00:00 KST, so start_date 2026-11-19 must fail.
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at)
        VALUES (v_game_id, 'R85 utc boundary mismatch', 'CONTENTS', DATE '2026-11-19', DATE '2026-11-27', TIMESTAMPTZ '2026-11-19 15:00:00+00');
        RAISE EXCEPTION 'FAIL: R85 UTC/KST boundary mismatch was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, end_at)
        VALUES (v_game_id, 'R85 bad end date', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-28 04:59:00+09');
        RAISE EXCEPTION 'FAIL: R85 end_at date mismatch was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at, end_at)
        VALUES (v_game_id, 'R85 end before start', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-20',
                TIMESTAMPTZ '2026-11-20 20:00:00+09', TIMESTAMPTZ '2026-11-20 19:00:00+09');
        RAISE EXCEPTION 'FAIL: R85 end_at < start_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at, end_at)
        VALUES (v_game_id, 'R85 end equals start', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-20',
                TIMESTAMPTZ '2026-11-20 20:00:00+09', TIMESTAMPTZ '2026-11-20 20:00:00+09');
        RAISE EXCEPTION 'FAIL: R85 end_at = start_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at)
        VALUES (v_game_id, 'R85 start seconds', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-20 11:00:30+09');
        RAISE EXCEPTION 'FAIL: R85 start_at with seconds was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, end_at)
        VALUES (v_game_id, 'R85 end millis', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-27 04:59:00.25+09');
        RAISE EXCEPTION 'FAIL: R85 end_at with millis was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, start_at_estimated)
        VALUES (v_game_id, 'R85 start est no at', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', true);
        RAISE EXCEPTION 'FAIL: R85 start_at_estimated without start_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, end_at_estimated)
        VALUES (v_game_id, 'R85 end est no at', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', true);
        RAISE EXCEPTION 'FAIL: R85 end_at_estimated without end_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- 3) Time-only update on game_schedules must not trigger sync_version_expenses_trigger.
    INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, is_official)
    VALUES (v_game_id, 'R85 version target', 'VERSION', DATE '2026-11-20', DATE '2026-11-27', true)
    RETURNING id INTO v_sched_id;
    PERFORM set_config('chronoledger.r85_target_sched_id', v_sched_id::text, true);

    INSERT INTO public.expenses(user_id, game_id, schedule_id, title, category, status, original_price, final_amount, start_date, end_date, target_date)
    VALUES (v_user_a, v_game_id, v_sched_id, 'R85 planned check', '게임', 'PLANNED', 12000, 12000,
            DATE '2026-11-20', DATE '2026-11-27', DATE '2026-11-22')
    RETURNING id INTO v_exp_id;

    UPDATE public.game_schedules
    SET start_at = TIMESTAMPTZ '2026-11-19 15:00:00+00', -- 2026-11-20 00:00 KST (UTC boundary valid)
        end_at = TIMESTAMPTZ '2026-11-27 04:59:00+09',
        start_at_estimated = true,
        end_at_estimated = false
    WHERE id = v_sched_id;

    SELECT start_date, end_date, target_date INTO v_exp_start, v_exp_end, v_exp_target
    FROM public.expenses WHERE id = v_exp_id;
    IF v_exp_start <> DATE '2026-11-20' OR v_exp_end <> DATE '2026-11-27' OR v_exp_target <> DATE '2026-11-22' THEN
        RAISE EXCEPTION 'FAIL: R85 time-only schedule update mutated planned expense dates (%, %, %)',
            v_exp_start, v_exp_end, v_exp_target;
    END IF;
END $$;

-- 4) Authenticated user B validates schedule_requests CHECKs and submits ADD & EDIT requests with times.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'user'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_user UUID := auth.uid();
    v_game_id UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_target_sched_id UUID := current_setting('chronoledger.r85_target_sched_id')::uuid;
    v_add_req_id UUID;
    v_edit_req_id UUID;
BEGIN
    BEGIN
        INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, start_date, end_date, start_at)
        VALUES (v_user, v_game_id, 'R85 req bad date', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-21 11:00:00+09');
        RAISE EXCEPTION 'FAIL: R85 schedule_requests date mismatch was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, start_date, end_date, start_at, end_at)
        VALUES (v_user, v_game_id, 'R85 req bad order', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-20',
                TIMESTAMPTZ '2026-11-20 15:00:00+09', TIMESTAMPTZ '2026-11-20 14:00:00+09');
        RAISE EXCEPTION 'FAIL: R85 schedule_requests end_at <= start_at was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, start_date, end_date, start_at)
        VALUES (v_user, v_game_id, 'R85 req seconds', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', TIMESTAMPTZ '2026-11-20 11:00:15+09');
        RAISE EXCEPTION 'FAIL: R85 schedule_requests seconds were accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, start_date, end_date, end_at_estimated)
        VALUES (v_user, v_game_id, 'R85 req est no at', 'CONTENTS', DATE '2026-11-20', DATE '2026-11-27', true);
        RAISE EXCEPTION 'FAIL: R85 schedule_requests estimated without timestamp was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    INSERT INTO public.schedule_requests(
        user_id, game_id, title, schedule_type, start_date, end_date,
        start_at, end_at, start_at_estimated, end_at_estimated, is_official
    )
    VALUES (
        v_user, v_game_id, 'R85 approved new schedule', 'BROADCAST', DATE '2026-11-21', DATE '2026-11-21',
        TIMESTAMPTZ '2026-11-21 20:00:00+09', TIMESTAMPTZ '2026-11-21 22:00:00+09', true, false, true
    )
    RETURNING id INTO v_add_req_id;
    PERFORM set_config('chronoledger.r85_add_req_id', v_add_req_id::text, true);

    INSERT INTO public.schedule_requests(
        user_id, game_id, target_schedule_id, title, schedule_type, start_date, end_date,
        start_at, end_at, start_at_estimated, end_at_estimated, is_official
    )
    VALUES (
        v_user, v_game_id, v_target_sched_id, 'R85 version target edited', 'VERSION', DATE '2026-11-20', DATE '2026-11-27',
        TIMESTAMPTZ '2026-11-20 11:00:00+09', TIMESTAMPTZ '2026-11-27 04:59:00+09', false, true, true
    )
    RETURNING id INTO v_edit_req_id;
    PERFORM set_config('chronoledger.r85_edit_req_id', v_edit_req_id::text, true);
END $$;
RESET ROLE;

-- 5) Admin approves both requests: approve_schedule_request copies times/flags on INSERT and UPDATE and keeps R84 notifications.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_game_id UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_target_sched_id UUID := current_setting('chronoledger.r85_target_sched_id')::uuid;
    v_add_req_id UUID := current_setting('chronoledger.r85_add_req_id')::uuid;
    v_edit_req_id UUID := current_setting('chronoledger.r85_edit_req_id')::uuid;
    v_new_sched_id UUID;
BEGIN
    PERFORM public.approve_schedule_request(v_add_req_id);
    SELECT id INTO v_new_sched_id
    FROM public.game_schedules
    WHERE game_id = v_game_id
      AND title = 'R85 approved new schedule'
      AND start_at = TIMESTAMPTZ '2026-11-21 20:00:00+09'
      AND end_at = TIMESTAMPTZ '2026-11-21 22:00:00+09'
      AND start_at_estimated = true
      AND end_at_estimated = false;
    IF v_new_sched_id IS NULL THEN
        RAISE EXCEPTION 'FAIL: R85 approve_schedule_request INSERT did not copy time/estimated fields';
    END IF;
    PERFORM set_config('chronoledger.r85_new_sched_id', v_new_sched_id::text, true);

    PERFORM public.approve_schedule_request(v_edit_req_id);
    IF NOT EXISTS (
        SELECT 1 FROM public.game_schedules
        WHERE id = v_target_sched_id
          AND title = 'R85 version target edited'
          AND start_at = TIMESTAMPTZ '2026-11-20 11:00:00+09'
          AND end_at = TIMESTAMPTZ '2026-11-27 04:59:00+09'
          AND start_at_estimated = false
          AND end_at_estimated = true
    ) THEN
        RAISE EXCEPTION 'FAIL: R85 approve_schedule_request UPDATE did not copy time/estimated fields';
    END IF;

    IF (SELECT count(*) FROM public.notifications
        WHERE user_id = current_setting('chronoledger.other_user_id')::uuid
          AND kind = 'REQUEST_APPROVED'
          AND source_id IN (v_add_req_id, v_edit_req_id)) <> 2 THEN
        RAISE EXCEPTION 'FAIL: R85 approve_schedule_request did not preserve R84 REQUEST_APPROVED notifications';
    END IF;
END $$;
RESET ROLE;

-- 6) Anon can read games.daily_reset_time and official game_schedules time columns.
SET LOCAL ROLE anon;
DO $$
DECLARE
    v_reset TIME;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_start_est BOOLEAN;
BEGIN
    SELECT daily_reset_time INTO v_reset
    FROM public.games
    WHERE id = current_setting('chronoledger.r13_game_id')::uuid;
    IF v_reset IS DISTINCT FROM TIME '05:00' THEN
        RAISE EXCEPTION 'FAIL: R85 anon could not read games.daily_reset_time (got %)', v_reset;
    END IF;

    SELECT start_at, end_at, start_at_estimated INTO v_start, v_end, v_start_est
    FROM public.game_schedules
    WHERE id = current_setting('chronoledger.r85_new_sched_id')::uuid;
    IF v_start <> TIMESTAMPTZ '2026-11-21 20:00:00+09'
       OR v_end <> TIMESTAMPTZ '2026-11-21 22:00:00+09'
       OR v_start_est IS NOT TRUE THEN
        RAISE EXCEPTION 'FAIL: R85 anon could not read official schedule time columns';
    END IF;
END $$;
RESET ROLE;
\echo PASS: R85 schedule times, estimated flags, games.daily_reset_time, approve RPC copy, expense trigger immunity, and anon read

-- R107-A: server-side subscription generation core (TS scenario port with fixed p_today), INTERVAL_30 single-PLANNED index,
-- advance/rollback RPCs, privileges/IDOR, pending-deletion skip, daily batch isolation and cron registration.
INSERT INTO public.games (name, default_icon_url, created_by)
VALUES ('R107 test game ' || :'other_user_id', 'https://example.invalid/r107.webp', :'test_user_id'::uuid)
RETURNING id AS r107_game_id \gset
SELECT set_config('chronoledger.r107_game_id', :'r107_game_id', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);

-- R107A-01: DB fixture role ports the subscription-sync.test.ts date scenarios onto generate_subscription_expenses_core.
DO $$
DECLARE
    v_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_game UUID := current_setting('chronoledger.r107_game_id')::uuid;
    v_tpl UUID;
    v_exp UUID;
    v_n INTEGER;
    v_date DATE;
    v_cycle TEXT;
    v_title TEXT;
BEGIN
    -- Only this block's templates stay active for user B so each core call is deterministic.
    UPDATE public.subscription_templates SET is_active = false WHERE user_id = v_b AND is_active;

    -- MONTHLY_DAY: this month's cycle (TS "당월 회차 예정 지출을 생성").
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_b, 'R107 monthly 15', '정기 구독', 'MONTHLY_DAY', 15, 9900, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    v_n := public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    SELECT target_date, billing_cycle INTO v_date, v_cycle FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED';
    IF v_n <> 1 OR v_date <> DATE '2026-03-15' OR v_cycle <> '2026-03' THEN
        RAISE EXCEPTION 'FAIL: R107A monthly current cycle (n=%, date=%, cycle=%)', v_n, v_date, v_cycle;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE template_id = v_tpl AND user_id = v_b AND final_amount = 9900 AND original_price = 9900
          AND payment_method = 'GOOGLE_PLAY' AND point_platform = 'GOOGLE_PLAY' AND deduct_from_asset
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A monthly row does not copy the template price and payment method';
    END IF;
    -- Idempotent re-run.
    v_n := public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    IF v_n <> 0 OR (SELECT count(*) FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: R107A monthly re-run created another row (n=%)', v_n;
    END IF;
    -- Current cycle confirmed -> only next month (TS "당월 회차가 이미 확정됐으면 다음 달 한 건만").
    UPDATE public.expenses SET status = 'CONFIRMED' WHERE template_id = v_tpl AND status = 'PLANNED' RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107_monthly_confirmed_id', v_exp::text, true);
    v_n := public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    SELECT target_date, billing_cycle INTO v_date, v_cycle FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED';
    IF v_n <> 1 OR v_date <> DATE '2026-04-15' OR v_cycle <> '2026-04' THEN
        RAISE EXCEPTION 'FAIL: R107A monthly next month after confirmed cycle (n=%, date=%, cycle=%)', v_n, v_date, v_cycle;
    END IF;
    -- Duplicate PLANNED rows are cleaned to the earliest one (TS dedupe_monthly_planned_expenses delegation).
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date)
    VALUES (v_b, v_tpl, '2026-05', 'R107 monthly dup', '정기 구독', 'PLANNED', DATE '2026-05-15');
    PERFORM public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    IF (SELECT count(*) FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED') <> 1
       OR NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED' AND target_date = DATE '2026-04-15') THEN
        RAISE EXCEPTION 'FAIL: R107A monthly duplicate PLANNED cleanup did not keep the earliest row';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- MONTHLY_DAY: billing day 31 clamps to the month's last day.
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_b, 'R107 monthly 31', '정기 구독', 'MONTHLY_DAY', 31, 1000, 'WALLET') RETURNING id INTO v_tpl;
    PERFORM public.generate_subscription_expenses_core(v_b, DATE '2026-02-10');
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE template_id = v_tpl AND status = 'PLANNED' AND target_date = DATE '2026-02-28' AND billing_cycle = '2026-02'
          AND payment_method = 'WALLET' AND point_platform IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A monthly last-day clamp or WALLET point_platform';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- MONTHLY_DAY: billing day already passed this month -> next month.
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_b, 'R107 monthly 5', '정기 구독', 'MONTHLY_DAY', 5, 1000, 'WALLET') RETURNING id INTO v_tpl;
    PERFORM public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE template_id = v_tpl AND status = 'PLANNED' AND target_date = DATE '2026-04-05' AND billing_cycle = '2026-04'
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A monthly passed billing day did not move to next month';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- INTERVAL_30: nothing paid yet -> today; re-run keeps one PLANNED; a second PLANNED is rejected by the index.
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_b, 'R107 interval 30', '정기 구독', 'INTERVAL_30', 30, 3300, 'GALAXY_STORE') RETURNING id INTO v_tpl;
    v_n := public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    v_n := v_n + public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    IF v_n <> 1 OR NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE template_id = v_tpl AND status = 'PLANNED' AND target_date = DATE '2026-03-10' AND billing_cycle IS NULL
          AND point_platform = 'GALAXY_STORE'
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A interval first cycle or re-run (n=%)', v_n;
    END IF;
    BEGIN
        INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date)
        VALUES (v_b, v_tpl, 'R107 interval dup', '정기 구독', 'PLANNED', DATE '2026-04-09');
        RAISE EXCEPTION 'FAIL: R107A second interval PLANNED row was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- INTERVAL_30 with interval_days 15: latest CONFIRMED + 15 days (TS "설정된 일수만큼 연장").
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_b, 'R107 interval 15', '정기 구독', 'INTERVAL_30', 15, 1100, 'WALLET') RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date)
    VALUES (v_b, v_tpl, 'R107 interval old', '정기 구독', 'CONFIRMED', DATE '2026-02-01'),
           (v_b, v_tpl, 'R107 interval latest', '정기 구독', 'CONFIRMED', DATE '2026-03-01');
    PERFORM public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl AND status = 'PLANNED' AND target_date = DATE '2026-03-16') THEN
        RAISE EXCEPTION 'FAIL: R107A interval latest CONFIRMED + interval_days';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- VERSION_PASS: only official VERSION schedules that have not ended; one row per schedule.
    INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, is_official)
    VALUES (v_game, 'R107 v1', 'VERSION', DATE '2026-03-20', DATE '2026-04-30', true),
           (v_game, 'R107 ended', 'VERSION', DATE '2026-01-01', DATE '2026-03-01', true),
           (v_game, 'R107 unofficial', 'VERSION', DATE '2026-03-20', DATE '2026-05-01', false),
           (v_game, 'R107 pickup', 'PICKUP', DATE '2026-03-20', DATE '2026-04-01', true);
    INSERT INTO public.subscription_templates(user_id, game_id, title, category, cycle_type, default_price, payment_method)
    VALUES (v_b, v_game, 'R107 pass', '게임', 'VERSION_PASS', 22000, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    v_n := public.generate_subscription_expenses_core(v_b, DATE '2026-03-10');
    SELECT title INTO v_title FROM public.expenses WHERE template_id = v_tpl;
    IF v_n <> 1 OR v_title <> 'R107 pass (R107 v1)' OR NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE template_id = v_tpl AND game_id = v_game AND target_date = DATE '2026-03-20'
          AND start_date = DATE '2026-03-20' AND end_date = DATE '2026-04-30' AND billing_cycle IS NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A version pass rows (n=%, title=%)', v_n, v_title;
    END IF;
    IF public.generate_subscription_expenses_core(v_b, DATE '2026-03-10') <> 0 THEN
        RAISE EXCEPTION 'FAIL: R107A version pass re-run created another row';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- Pending account deletion: the core does nothing for that user.
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_b, 'R107 pending', '정기 구독', 'MONTHLY_DAY', 15, 1000, 'WALLET') RETURNING id INTO v_tpl;
    INSERT INTO public.account_deletion_requests(user_id, status_token_hash, status) VALUES (v_b, repeat('7', 64), 'PENDING');
    IF public.generate_subscription_expenses_core(v_b, DATE '2026-03-10') <> 0
       OR EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl) THEN
        RAISE EXCEPTION 'FAIL: R107A core generated rows for a pending-deletion user';
    END IF;
    DELETE FROM public.account_deletion_requests WHERE user_id = v_b AND status_token_hash = repeat('7', 64);
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl;

    -- Templates for the authenticated RPC checks below (no PLANNED row yet: created after the last core call).
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_b, 'R107 advance 30', '정기 구독', 'INTERVAL_30', 30, 5500, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    PERFORM set_config('chronoledger.r107_advance30_tpl', v_tpl::text, true);
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date)
    VALUES (v_b, v_tpl, 'R107 advance paid', '정기 구독', 'CONFIRMED', DATE '2026-04-01') RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107_advance30_paid', v_exp::text, true);
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_b, 'R107 advance 15', '정기 구독', 'INTERVAL_30', 15, 1500, 'WALLET') RETURNING id INTO v_tpl;
    PERFORM set_config('chronoledger.r107_advance15_tpl', v_tpl::text, true);
END $$;
\echo PASS: R107A-01 core ports MONTHLY_DAY/INTERVAL_30/VERSION_PASS date rules, idempotency, interval unique index and pending skip

-- R107A-02: DB fixture role runs the daily batch: user A is processed even when user B's template fails (A-5, A-7).
DO $$
DECLARE
    v_a UUID := current_setting('chronoledger.test_user_id')::uuid;
    v_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_tpl_a UUID;
    v_tpl_a_interval UUID;
    v_tpl_bad UUID;
    v_a_planned UUID;
BEGIN
    UPDATE public.subscription_templates SET is_active = false WHERE user_id = v_a AND is_active;
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_a, 'R107 batch A', '정기 구독', 'MONTHLY_DAY', 1, 1000, 'WALLET') RETURNING id INTO v_tpl_a;
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_a, 'R107 batch A interval', '정기 구독', 'INTERVAL_30', 30, 1000, 'WALLET') RETURNING id INTO v_tpl_a_interval;
    -- expenses.category CHECK rejects this category, so user B's generation fails inside the batch and the batch's
    -- per-user subtransaction rolls back every row it created for B (B's other active templates included).
    INSERT INTO public.subscription_templates(user_id, title, category, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_b, 'R107 batch bad', 'R107 invalid category', 'MONTHLY_DAY', 1, 1000, 'WALLET') RETURNING id INTO v_tpl_bad;

    PERFORM public.run_daily_subscription_automation();

    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl_a AND status = 'PLANNED')
       OR NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl_a_interval AND status = 'PLANNED') THEN
        RAISE EXCEPTION 'FAIL: R107A batch did not generate user A rows after user B failed';
    END IF;
    IF EXISTS (SELECT 1 FROM public.expenses WHERE template_id = v_tpl_bad) THEN
        RAISE EXCEPTION 'FAIL: R107A batch kept a partial row for the failing user';
    END IF;
    UPDATE public.subscription_templates SET is_active = false WHERE id = v_tpl_bad;
    SELECT id INTO v_a_planned FROM public.expenses WHERE template_id = v_tpl_a_interval AND status = 'PLANNED';
    PERFORM set_config('chronoledger.r107_a_interval_planned', v_a_planned::text, true);

    IF (SELECT count(*) FROM cron.job WHERE jobname = 'chronoledger-subscription-daily' AND schedule = '50 23 * * *') <> 1 THEN
        RAISE EXCEPTION 'FAIL: R107A cron job chronoledger-subscription-daily missing or duplicated';
    END IF;
    IF has_function_privilege('authenticated', 'public.generate_subscription_expenses_core(uuid,date)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.run_daily_subscription_automation()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.ensure_subscription_expenses()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.advance_interval_subscription(uuid,date,date)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.rollback_interval_subscription(uuid)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.ensure_subscription_expenses()', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: R107A function privileges';
    END IF;
END $$;
\echo PASS: R107A-02 daily batch isolates a failing user, cron registered once, function privileges

-- R107A-03: authenticated user B: advance/rollback rules (TS calculateNext/Rollback ports), IDOR, internal functions denied.
SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_tpl30 UUID := current_setting('chronoledger.r107_advance30_tpl')::uuid;
    v_tpl15 UUID := current_setting('chronoledger.r107_advance15_tpl')::uuid;
    v_paid UUID := current_setting('chronoledger.r107_advance30_paid')::uuid;
    v_a_planned UUID := current_setting('chronoledger.r107_a_interval_planned')::uuid;
    v_date DATE;
BEGIN
    -- Early payment keeps the remaining days: original 04-10 paid 04-01 -> 05-10.
    IF NOT public.advance_interval_subscription(v_tpl30, DATE '2026-04-10', DATE '2026-04-01') THEN
        RAISE EXCEPTION 'FAIL: R107A advance returned false for an early payment';
    END IF;
    SELECT target_date INTO v_date FROM public.expenses WHERE template_id = v_tpl30 AND status = 'PLANNED';
    IF v_date <> DATE '2026-05-10' THEN
        RAISE EXCEPTION 'FAIL: R107A advance early payment date %', v_date;
    END IF;
    IF public.advance_interval_subscription(v_tpl30, DATE '2026-05-10', DATE '2026-05-10') THEN
        RAISE EXCEPTION 'FAIL: R107A advance created a second PLANNED row';
    END IF;
    -- Refund rollback moves the PLANNED row back by interval_days: 05-10 -> 04-10.
    IF NOT public.rollback_interval_subscription(v_paid) THEN
        RAISE EXCEPTION 'FAIL: R107A rollback returned false';
    END IF;
    SELECT target_date INTO v_date FROM public.expenses WHERE template_id = v_tpl30 AND status = 'PLANNED';
    IF v_date <> DATE '2026-04-10' THEN
        RAISE EXCEPTION 'FAIL: R107A rollback date %', v_date;
    END IF;
    -- On-time payment with interval 15: payment date + 15.
    IF NOT public.advance_interval_subscription(v_tpl15, DATE '2026-04-01', DATE '2026-04-01') THEN
        RAISE EXCEPTION 'FAIL: R107A advance returned false for an on-time payment';
    END IF;
    SELECT target_date INTO v_date FROM public.expenses WHERE template_id = v_tpl15 AND status = 'PLANNED';
    IF v_date <> DATE '2026-04-16' THEN
        RAISE EXCEPTION 'FAIL: R107A advance interval 15 date %', v_date;
    END IF;
    -- Non-interval expense: rollback does nothing.
    IF public.rollback_interval_subscription(current_setting('chronoledger.r107_monthly_confirmed_id')::uuid) THEN
        RAISE EXCEPTION 'FAIL: R107A rollback changed a non-interval template';
    END IF;
    -- IDOR: user A's interval row is not touched.
    SELECT target_date INTO v_date FROM public.expenses WHERE id = v_a_planned;
    IF v_date IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: R107A user B can read user A expenses';
    END IF;
    IF public.rollback_interval_subscription(v_a_planned) THEN
        RAISE EXCEPTION 'FAIL: R107A user B rolled back user A interval row';
    END IF;

    BEGIN
        PERFORM public.generate_subscription_expenses_core(auth.uid(), DATE '2026-03-10');
        RAISE EXCEPTION 'FAIL: R107A authenticated executed generate_subscription_expenses_core';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.run_daily_subscription_automation();
        RAISE EXCEPTION 'FAIL: R107A authenticated executed run_daily_subscription_automation';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- The lazy RPC runs with the server's KST date and needs no arguments.
    PERFORM public.ensure_subscription_expenses();
END $$;
RESET ROLE;

DO $$
DECLARE
    v_a_planned UUID := current_setting('chronoledger.r107_a_interval_planned')::uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses
        WHERE id = v_a_planned AND status = 'PLANNED' AND target_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date
    ) THEN
        RAISE EXCEPTION 'FAIL: R107A user A interval row changed after user B rollback attempt';
    END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.ensure_subscription_expenses();
        RAISE EXCEPTION 'FAIL: R107A anon executed ensure_subscription_expenses';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.advance_interval_subscription(gen_random_uuid(), NULL, DATE '2026-04-01');
        RAISE EXCEPTION 'FAIL: R107A anon executed advance_interval_subscription';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R107A-03 advance/rollback date rules, IDOR, internal function denial, lazy RPC and anon denial

-- ============================================================================
-- R109: game-assets public bucket, admin-only write policies, pickup https icons,
-- approve_schedule_request(UUID, JSONB) icon overrides.
-- ============================================================================

-- R109-01) Fixture role: bucket settings, policy set, single RPC overload, validator, request fixtures.
DO $$
DECLARE
    v_game UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_other UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_req UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'game-assets' AND public = true AND file_size_limit = 102400 AND allowed_mime_types = ARRAY['image/webp']
    ) THEN
        RAISE EXCEPTION 'FAIL: R109 game-assets bucket missing or misconfigured';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-icons' AND public = false) THEN
        RAISE EXCEPTION 'FAIL: R109 user-icons bucket must stay private';
    END IF;
    IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname IN ('Public read game assets', 'Admins insert game assets', 'Admins update game assets', 'Admins delete game assets')) <> 4 THEN
        RAISE EXCEPTION 'FAIL: R109 game-assets policies missing';
    END IF;
    IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname IN ('Users read own icons', 'Users upload own icons', 'Users update own icons', 'Users delete own icons')) <> 4 THEN
        RAISE EXCEPTION 'FAIL: R109 user-icons policies changed';
    END IF;
    IF (SELECT array_agg(oid::regprocedure::text) FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace AND proname = 'approve_schedule_request')
       <> ARRAY['approve_schedule_request(uuid,jsonb)'] THEN
        RAISE EXCEPTION 'FAIL: R109 approve_schedule_request must have only the (uuid, jsonb) overload';
    END IF;
    IF has_function_privilege('anon', 'public.approve_schedule_request(uuid, jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.approve_schedule_request(uuid, jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: R109 approve_schedule_request grants are wrong';
    END IF;
    IF NOT public.is_valid_pickup_new_characters('[{"name":"storage","icon_url":"https://example.invalid/a.webp"}]'::jsonb)
       OR NOT public.is_valid_pickup_new_characters('[{"name":"data","icon_url":"data:image/webp;base64,AAAA"}]'::jsonb)
       OR public.is_valid_pickup_new_characters('[{"name":"plain","icon_url":"http://example.invalid/a.webp"}]'::jsonb)
       OR public.is_valid_pickup_new_characters(jsonb_build_array(jsonb_build_object('name','large','icon_url','https://'||repeat('a',150000)))) THEN
        RAISE EXCEPTION 'FAIL: R109 pickup proposal icon validation is wrong';
    END IF;

    INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, pickup_new_characters, start_date, end_date)
    VALUES (v_other, v_game, 'R109 override request', 'PICKUP',
            '[{"name":"R109 override A","icon_url":"data:image/webp;base64,AAAA"},{"name":"R109 override B","icon_url":"data:image/webp;base64,BBBB"},{"name":"R109 override C","icon_url":"data:image/webp;base64,CCCC"}]'::jsonb,
            CURRENT_DATE, CURRENT_DATE)
    RETURNING id INTO v_req;
    PERFORM set_config('chronoledger.r109_override_req', v_req::text, true);

    INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, pickup_new_characters, start_date, end_date)
    VALUES (v_other, v_game, 'R109 legacy request', 'PICKUP',
            '[{"name":"R109 legacy","icon_url":"data:image/webp;base64,DDDD"}]'::jsonb, CURRENT_DATE, CURRENT_DATE)
    RETURNING id INTO v_req;
    PERFORM set_config('chronoledger.r109_legacy_req', v_req::text, true);

    INSERT INTO public.schedule_requests(user_id, game_id, title, schedule_type, pickup_new_characters, start_date, end_date)
    VALUES (v_other, v_game, 'R109 invalid override request', 'PICKUP',
            '[{"name":"R109 invalid","icon_url":null}]'::jsonb, CURRENT_DATE, CURRENT_DATE)
    RETURNING id INTO v_req;
    PERFORM set_config('chronoledger.r109_invalid_req', v_req::text, true);

    PERFORM set_config('chronoledger.r109_game_path', 'games/' || md5('r109-game') || md5('r109-game-2') || '.webp', true);
    PERFORM set_config('chronoledger.r109_char_path', 'characters/' || v_game::text || '/' || md5('r109-char') || md5('r109-char-2') || '.webp', true);
END $$;
\echo PASS: R109-01 game-assets bucket/policies, single approve_schedule_request overload, pickup https validation

-- R109-02) anon: public read allowed, any write rejected.
SET LOCAL ROLE anon;
DO $$
BEGIN
    PERFORM count(*) FROM storage.objects WHERE bucket_id = 'game-assets';
    BEGIN
        INSERT INTO storage.objects(bucket_id, name) VALUES ('game-assets', current_setting('chronoledger.r109_game_path'));
        RAISE EXCEPTION 'FAIL: R109 anon inserted a game asset';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R109-03) Non-admin authenticated user B: game-assets writes rejected, own user-icons upload still allowed.
SELECT set_config('request.jwt.claim.sub', current_setting('chronoledger.other_user_id'), true);
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated')::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_rows INT;
BEGIN
    BEGIN
        INSERT INTO storage.objects(bucket_id, name) VALUES ('game-assets', current_setting('chronoledger.r109_game_path'));
        RAISE EXCEPTION 'FAIL: R109 non-admin inserted a game asset';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.approve_schedule_request(
            current_setting('chronoledger.r109_override_req')::uuid,
            '{"R109 override A":"https://example.invalid/a.webp"}'::jsonb
        );
        RAISE EXCEPTION 'FAIL: R109 non-admin approved a schedule request';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '관리자 권한이 필요합니다.' THEN RAISE; END IF;
    END;
    INSERT INTO storage.objects(bucket_id, name)
    VALUES ('user-icons', current_setting('chronoledger.other_user_id') || '/r109-own.webp');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: R109 user-icons own-folder upload broke'; END IF;
END $$;
RESET ROLE;

-- R109-04) Admin (JWT app_metadata.role=admin): valid paths written, invalid paths rejected.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_game TEXT := current_setting('chronoledger.r13_game_id');
    v_hash TEXT := md5('r109-bad') || md5('r109-bad-2');
    v_path TEXT;
    v_rows INT;
BEGIN
    INSERT INTO storage.objects(bucket_id, name) VALUES ('game-assets', current_setting('chronoledger.r109_game_path'));
    INSERT INTO storage.objects(bucket_id, name) VALUES ('game-assets', current_setting('chronoledger.r109_char_path'));
    FOREACH v_path IN ARRAY ARRAY[
        'games/' || left(v_hash, 63) || '.webp',
        'games/' || upper(v_hash) || '.webp',
        'games/' || v_hash || '.png',
        'games/sub/' || v_hash || '.webp',
        'icons/' || v_hash || '.webp',
        'characters/' || v_hash || '.webp',
        'characters/' || v_game || '/../' || v_hash || '.webp',
        'characters/not-a-game-id-not-a-game-id-not-a-gam/' || v_hash || '.webp'
    ] LOOP
        BEGIN
            INSERT INTO storage.objects(bucket_id, name) VALUES ('game-assets', v_path);
            RAISE EXCEPTION 'FAIL: R109 admin inserted invalid game asset path %', v_path;
        EXCEPTION WHEN insufficient_privilege THEN NULL;
        END;
    END LOOP;

    UPDATE storage.objects SET metadata = '{"r109":true}'::jsonb
    WHERE bucket_id = 'game-assets' AND name = current_setting('chronoledger.r109_game_path');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: R109 admin could not update a game asset'; END IF;
    BEGIN
        UPDATE storage.objects SET name = 'games/renamed.webp'
        WHERE bucket_id = 'game-assets' AND name = current_setting('chronoledger.r109_game_path');
        RAISE EXCEPTION 'FAIL: R109 admin renamed a game asset to an invalid path';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R109-05) Non-admin user B cannot update or delete the admin's game assets (RLS hides them from writes).
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated')::text,
    true
);
SELECT set_config('storage.allow_delete_query', 'true', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_rows INT;
BEGIN
    IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'game-assets'
        AND name IN (current_setting('chronoledger.r109_game_path'), current_setting('chronoledger.r109_char_path'))) <> 2 THEN
        RAISE EXCEPTION 'FAIL: R109 authenticated user cannot read public game assets';
    END IF;
    UPDATE storage.objects SET metadata = '{"r109":"hijack"}'::jsonb
    WHERE bucket_id = 'game-assets' AND name = current_setting('chronoledger.r109_game_path');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL: R109 non-admin updated a game asset'; END IF;
    DELETE FROM storage.objects
    WHERE bucket_id = 'game-assets' AND name = current_setting('chronoledger.r109_game_path');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL: R109 non-admin deleted a game asset'; END IF;
    BEGIN
        UPDATE storage.objects SET bucket_id = 'game-assets', name = current_setting('chronoledger.r109_game_path') || '.moved'
        WHERE bucket_id = 'user-icons' AND name = current_setting('chronoledger.other_user_id') || '/r109-own.webp';
        RAISE EXCEPTION 'FAIL: R109 non-admin moved an own icon into game-assets';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

-- R109-06) Admin: delete a game asset; approve_schedule_request applies overrides and stays backward compatible.
SELECT set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', current_setting('chronoledger.other_user_id'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text,
    true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_rows INT;
    v_storage_url TEXT := 'https://example.invalid/storage/v1/object/public/game-assets/' || current_setting('chronoledger.r109_char_path');
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'game-assets' AND name = current_setting('chronoledger.r109_game_path');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: R109 admin could not delete a game asset'; END IF;

    -- A: override URL, B: empty override -> NULL icon, C: no key -> proposal Data URL.
    PERFORM public.approve_schedule_request(
        current_setting('chronoledger.r109_override_req')::uuid,
        jsonb_build_object('R109 override A', v_storage_url, 'R109 override B', '')
    );
    -- Legacy single-argument call keeps the proposal icon.
    PERFORM public.approve_schedule_request(current_setting('chronoledger.r109_legacy_req')::uuid);

    BEGIN
        PERFORM public.approve_schedule_request(
            current_setting('chronoledger.r109_invalid_req')::uuid,
            '{"R109 invalid":"http://example.invalid/a.webp"}'::jsonb
        );
        RAISE EXCEPTION 'FAIL: R109 invalid icon override was accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM <> '픽업 캐릭터 아이콘 주소가 올바르지 않습니다.' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;
SELECT set_config('storage.allow_delete_query', 'false', true);

DO $$
DECLARE
    v_game UUID := current_setting('chronoledger.r13_game_id')::uuid;
    v_storage_url TEXT := 'https://example.invalid/storage/v1/object/public/game-assets/' || current_setting('chronoledger.r109_char_path');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = v_game AND name = 'R109 override A' AND default_icon_url = v_storage_url AND is_pickup_only)
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = v_game AND name = 'R109 override B' AND default_icon_url IS NULL)
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = v_game AND name = 'R109 override C' AND default_icon_url = 'data:image/webp;base64,CCCC')
       OR NOT EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = v_game AND name = 'R109 legacy' AND default_icon_url = 'data:image/webp;base64,DDDD') THEN
        RAISE EXCEPTION 'FAIL: R109 approve_schedule_request icon overrides were not applied';
    END IF;
    IF (SELECT cardinality(pickup_character_ids) FROM public.game_schedules WHERE game_id = v_game AND title = 'R109 override request') <> 3 THEN
        RAISE EXCEPTION 'FAIL: R109 approved schedule did not link all new pickup characters';
    END IF;
    IF (SELECT request_status FROM public.schedule_requests WHERE id = current_setting('chronoledger.r109_override_req')::uuid) <> 'APPROVED'
       OR (SELECT request_status FROM public.schedule_requests WHERE id = current_setting('chronoledger.r109_legacy_req')::uuid) <> 'APPROVED'
       OR (SELECT request_status FROM public.schedule_requests WHERE id = current_setting('chronoledger.r109_invalid_req')::uuid) <> 'PENDING'
       OR EXISTS (SELECT 1 FROM public.game_characters WHERE game_id = v_game AND name = 'R109 invalid') THEN
        RAISE EXCEPTION 'FAIL: R109 request status or invalid-override rollback is wrong';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE source_id = current_setting('chronoledger.r109_override_req')::uuid AND kind = 'REQUEST_APPROVED') THEN
        RAISE EXCEPTION 'FAIL: R109 approve_schedule_request lost the R84 approval notification';
    END IF;
END $$;
\echo PASS: R109-02~06 anon/non-admin write denial, admin path rules, user-icons unchanged, pickup icon overrides and legacy call

-- ============================================================================
-- R107-C: per-template auto confirm (spec docs/r107-recurring-expense-automation-spec.md §5, C-1..C-10).
-- Fresh fixture users C (auto confirm owner), D (pending deletion) and E (expense_due_today=false) keep the matrix
-- independent from users A/B. Fixed past dates (p_today 2026-10-01) keep window/month checks deterministic.
-- ============================================================================
SELECT gen_random_uuid() AS r107c_user_c \gset
SELECT gen_random_uuid() AS r107c_user_d \gset
SELECT gen_random_uuid() AS r107c_user_e \gset
SELECT set_config('chronoledger.r107c_user_c', :'r107c_user_c', true);
SELECT set_config('chronoledger.r107c_user_d', :'r107c_user_d', true);
SELECT set_config('chronoledger.r107c_user_e', :'r107c_user_e', true);
INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
SELECT u.id, 'authenticated', 'authenticated', 'codex-sqltest-' || replace(u.id::text, '-', '') || '@example.invalid',
       '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
FROM (VALUES (:'r107c_user_c'::uuid), (:'r107c_user_d'::uuid), (:'r107c_user_e'::uuid)) AS u(id);

-- R107C-01) Fixture role: schema, constraint, privileges (C-10) and the eligibility matrix (C-2..C-4, C-6, C-8).
DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_d UUID := current_setting('chronoledger.r107c_user_d')::uuid;
    v_b UUID := current_setting('chronoledger.other_user_id')::uuid;
    v_cut TIMESTAMPTZ := TIMESTAMPTZ '2026-09-01 09:00:00+09';
    v_game UUID;
    v_sched UUID;
    v_tpl UUID;
    v_exp UUID;
    v_n INTEGER;
    v_fn TEXT;
BEGIN
    UPDATE public.user_finances SET total_asset = 100000 WHERE user_id = v_c;
    UPDATE public.user_finances SET total_asset = 100000 WHERE user_id = v_d;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_templates'
                   AND column_name = 'auto_confirm' AND column_default = 'false' AND is_nullable = 'NO')
       OR (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses'
           AND column_name IN ('auto_confirmed_at', 'auto_confirm_blocked')) <> 2 THEN
        RAISE EXCEPTION 'FAIL: R107C columns missing';
    END IF;
    BEGIN
        INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method, auto_confirm)
        VALUES (v_c, 'R107C wallet auto', 'MONTHLY_DAY', 1, 1000, 'WALLET', true);
        RAISE EXCEPTION 'FAIL: R107C WALLET template accepted auto_confirm';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- C-10: internal functions are service_role only; public RPC grants are unchanged.
    FOREACH v_fn IN ARRAY ARRAY[
        'public._process_expense_payment_core(uuid,uuid,bigint,bigint,bigint,bigint,character varying,character varying,boolean,date,bigint,text)',
        'public._advance_interval_subscription_core(uuid,uuid,date,date)',
        'public._rollback_interval_subscription_core(uuid,uuid)',
        'public.auto_confirm_due_expenses(uuid,date)',
        'public.run_daily_subscription_automation()'
    ] LOOP
        IF has_function_privilege('authenticated', v_fn, 'EXECUTE') OR has_function_privilege('anon', v_fn, 'EXECUTE')
           OR NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
            RAISE EXCEPTION 'FAIL: R107C privileges of %', v_fn;
        END IF;
    END LOOP;
    IF NOT has_function_privilege('authenticated', 'public.process_expense_payment(uuid,bigint,bigint,bigint,bigint,character varying,character varying,boolean,date,bigint,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.process_expense_payment(uuid,bigint,bigint,bigint,bigint,character varying,character varying,boolean,date,bigint,text)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.refund_expense_payment(uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.advance_interval_subscription(uuid,date,date)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.rollback_interval_subscription(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: R107C public RPC privileges changed';
    END IF;

    INSERT INTO public.games(name, default_icon_url) VALUES ('R107C game ' || v_c::text, 'https://example.invalid/r107c.webp') RETURNING id INTO v_game;
    INSERT INTO public.game_schedules(game_id, title, schedule_type, is_official, start_date, end_date)
    VALUES (v_game, 'R107C version', 'VERSION', true, DATE '2026-09-30', DATE '2026-10-20') RETURNING id INTO v_sched;
    PERFORM set_config('chronoledger.r107c_schedule', v_sched::text, true);

    -- Helper rows: every template gets exactly one PLANNED row created before the cutoff unless the case says otherwise.
    -- m1: MONTHLY_DAY GOOGLE_PLAY auto, due 09-30 (month boundary, C-4) -> confirmed, next cycle 2026-10 (C-6).
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C m1', 'MONTHLY_DAY', 30, 10000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date, original_price, final_amount,
                                payment_method, point_platform, deduct_from_asset, created_at)
    VALUES (v_c, v_tpl, '2026-09', 'R107C m1', '정기 구독', 'PLANNED', DATE '2026-09-30', 10000, 10000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_m1_tpl', v_tpl::text, true);
    PERFORM set_config('chronoledger.r107c_m1', v_exp::text, true);
    -- i1: INTERVAL_30 GALAXY_STORE auto, due 09-29 (window start) -> confirmed, next 10-29 (C-6).
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C i1', 'INTERVAL_30', 30, 5000, 'GALAXY_STORE', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount,
                                payment_method, point_platform, deduct_from_asset, created_at)
    VALUES (v_c, v_tpl, 'R107C i1', '정기 구독', 'PLANNED', DATE '2026-09-29', 5000, 5000, 'GALAXY_STORE', 'GALAXY_STORE', true, v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_i1_tpl', v_tpl::text, true);
    PERFORM set_config('chronoledger.r107c_i1', v_exp::text, true);
    -- v1: VERSION_PASS GOOGLE_PLAY auto for the schedule above -> confirmed, no extra row (C-6).
    INSERT INTO public.subscription_templates(user_id, game_id, title, category, cycle_type, default_price, payment_method, auto_confirm)
    VALUES (v_c, v_game, 'R107C v1', '게임', 'VERSION_PASS', 3000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, game_id, schedule_id, title, category, status, start_date, end_date, target_date,
                                original_price, final_amount, payment_method, point_platform, deduct_from_asset, created_at)
    VALUES (v_c, v_tpl, v_game, v_sched, 'R107C v1', '게임', 'PLANNED', DATE '2026-09-30', DATE '2026-10-20', DATE '2026-09-30',
            3000, 3000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_v1_tpl', v_tpl::text, true);
    PERFORM set_config('chronoledger.r107c_v1', v_exp::text, true);
    -- Not confirmed (C-2): WALLET, option off, blocked, outside the window, created on p_today, forced failure (C-8).
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_c, 'R107C wallet', 'MONTHLY_DAY', 1, 1000, 'WALLET') RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date, original_price, final_amount, payment_method, created_at)
    VALUES (v_c, v_tpl, '2026-10', 'R107C wallet', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'WALLET', v_cut);
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_c, 'R107C off', 'MONTHLY_DAY', 1, 1000, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_c, v_tpl, '2026-10', 'R107C off', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', v_cut);
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C blocked', 'INTERVAL_30', 30, 1000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, auto_confirm_blocked, created_at)
    VALUES (v_c, v_tpl, 'R107C blocked', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, v_cut);
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C old', 'INTERVAL_30', 30, 1000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_c, v_tpl, 'R107C old', '정기 구독', 'PLANNED', DATE '2026-09-28', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', v_cut);
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C sameday', 'INTERVAL_30', 30, 1000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_c, v_tpl, 'R107C sameday', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', TIMESTAMPTZ '2026-10-01 00:00:00+09');
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C fail', 'MONTHLY_DAY', 30, 2000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_c, v_tpl, '2026-09', 'R107C fail', '정기 구독', 'PLANNED', DATE '2026-09-30', 2000, 2000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_fail', v_exp::text, true);
    -- C-3 manual comparison row: same price/store as m1, option off, paid by user C through process_expense_payment below.
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, billing_day, default_price, payment_method)
    VALUES (v_c, 'R107C manual', 'MONTHLY_DAY', 30, 10000, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, target_date, original_price, final_amount,
                                payment_method, point_platform, deduct_from_asset, created_at)
    VALUES (v_c, v_tpl, '2026-09', 'R107C manual', '정기 구독', 'PLANNED', DATE '2026-09-30', 10000, 10000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_manual', v_exp::text, true);

    -- IDOR (C-10): user B's eligible row and pending-deletion user D's row stay PLANNED.
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_b, 'R107C other user', 'INTERVAL_30', 30, 1000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_b, v_tpl, 'R107C other user', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_other', v_exp::text, true);
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_d, 'R107C pending', 'INTERVAL_30', 30, 1000, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_d, v_tpl, 'R107C pending', '정기 구독', 'PLANNED', DATE '2026-10-01', 1000, 1000, 'GOOGLE_PLAY', 'GOOGLE_PLAY', v_cut)
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_pending', v_exp::text, true);
    INSERT INTO public.account_deletion_requests(user_id, status_token_hash, status) VALUES (v_d, repeat('c', 64), 'PENDING');
END $$;

-- C-8: force one row to fail inside the payment (trigger dropped by the final ROLLBACK).
CREATE FUNCTION public.r107c_test_fail_one() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id = current_setting('chronoledger.r107c_fail')::uuid AND NEW.status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'R107C forced failure';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER r107c_test_fail_one BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.r107c_test_fail_one();

DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_d UUID := current_setting('chronoledger.r107c_user_d')::uuid;
    v_n INTEGER;
BEGIN
    v_n := public.auto_confirm_due_expenses(v_c, DATE '2026-10-01');
    IF v_n <> 3 THEN
        RAISE EXCEPTION 'FAIL: R107C expected 3 auto confirmed rows, got %', v_n;
    END IF;
    IF public.auto_confirm_due_expenses(v_d, DATE '2026-10-01') <> 0
       OR (SELECT status FROM public.expenses WHERE id = current_setting('chronoledger.r107c_pending')::uuid) <> 'PLANNED' THEN
        RAISE EXCEPTION 'FAIL: R107C confirmed a pending-deletion user row';
    END IF;
    -- Idempotent: a second run (cron retry) confirms nothing new.
    IF public.auto_confirm_due_expenses(v_c, DATE '2026-10-01') <> 0 THEN
        RAISE EXCEPTION 'FAIL: R107C second run confirmed again';
    END IF;
END $$;
DROP TRIGGER r107c_test_fail_one ON public.expenses;
DROP FUNCTION public.r107c_test_fail_one();

-- C-3 manual comparison: user C pays the twin row through the public wrapper (C-1).
SELECT set_config('request.jwt.claim.sub', :'r107c_user_c', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r107c_user_c', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM public.process_expense_payment(
        current_setting('chronoledger.r107c_manual')::uuid, 10000, 0, 0, 0, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, DATE '2026-09-30'
    );
    BEGIN
        PERFORM public.process_expense_payment(
            current_setting('chronoledger.r107c_other')::uuid, 1000, 0, 0, 0, 'GOOGLE_PLAY', 'GOOGLE_PLAY', true, DATE '2026-09-30'
        );
        RAISE EXCEPTION 'FAIL: R107C wrapper paid another user expense';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public._process_expense_payment_core(
            auth.uid(), current_setting('chronoledger.r107c_manual')::uuid, 1, 0, 0, 0, NULL, 'WALLET', true, DATE '2026-09-30', NULL, NULL
        );
        RAISE EXCEPTION 'FAIL: R107C authenticated executed the payment core';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.auto_confirm_due_expenses(auth.uid(), DATE '2026-10-01');
        RAISE EXCEPTION 'FAIL: R107C authenticated executed auto_confirm_due_expenses';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.auto_confirm_due_expenses(gen_random_uuid(), DATE '2026-10-01');
        RAISE EXCEPTION 'FAIL: R107C anon executed auto_confirm_due_expenses';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;
RESET ROLE;

DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_auto public.expenses%ROWTYPE;
    v_manual public.expenses%ROWTYPE;
    v_row public.expenses%ROWTYPE;
    v_asset BIGINT;
    v_n INTEGER;
BEGIN
    SELECT * INTO v_auto FROM public.expenses WHERE id = current_setting('chronoledger.r107c_m1')::uuid;
    SELECT * INTO v_manual FROM public.expenses WHERE id = current_setting('chronoledger.r107c_manual')::uuid;
    -- C-3/C-4: confirmed on the planned date (09-30 stays in September), snapshot price, store earn rate, asset deduction.
    IF v_auto.status <> 'CONFIRMED' OR v_auto.target_date <> DATE '2026-09-30' OR v_auto.auto_confirmed_at IS NULL
       OR v_auto.final_amount <> 10000 OR v_auto.earned_points <> 10 OR v_auto.used_points <> 0
       OR v_auto.payment_method <> 'WALLET' OR v_auto.point_platform <> 'GOOGLE_PLAY' OR NOT v_auto.deduct_from_asset THEN
        RAISE EXCEPTION 'FAIL: R107C auto confirmed values (status %, date %, final %, earned %)',
            v_auto.status, v_auto.target_date, v_auto.final_amount, v_auto.earned_points;
    END IF;
    IF (v_auto.final_amount, v_auto.earned_points, v_auto.payment_method, v_auto.point_platform, v_auto.deduct_from_asset, v_auto.target_date,
        v_auto.discount_amount, v_auto.point_discount_amount, v_auto.used_points)
       IS DISTINCT FROM
       (v_manual.final_amount, v_manual.earned_points, v_manual.payment_method, v_manual.point_platform, v_manual.deduct_from_asset, v_manual.target_date,
        v_manual.discount_amount, v_manual.point_discount_amount, v_manual.used_points)
       OR v_manual.auto_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: R107C auto confirm differs from the manual payment of the same input';
    END IF;
    IF (SELECT count(*) FROM public.store_point_transactions WHERE expense_id = v_auto.id AND transaction_type = 'EARN' AND amount = 10) <> 1
       OR (SELECT count(*) FROM public.store_point_transactions WHERE expense_id = v_manual.id AND transaction_type = 'EARN' AND amount = 10) <> 1
       OR EXISTS (SELECT 1 FROM public.store_point_transactions WHERE expense_id = v_auto.id AND transaction_type <> 'EARN') THEN
        RAISE EXCEPTION 'FAIL: R107C ledger rows of the auto confirmed payment';
    END IF;
    -- Assets: 100000 - m1 10000 - i1 5000 - v1 3000 - manual 10000 = 72000.
    SELECT total_asset INTO v_asset FROM public.user_finances WHERE user_id = v_c;
    IF v_asset <> 72000 THEN
        RAISE EXCEPTION 'FAIL: R107C total_asset % (expected 72000)', v_asset;
    END IF;
    IF (SELECT current_balance FROM public.store_wallets WHERE user_id = v_c AND platform = 'GOOGLE_PLAY') <> 20 + 3 THEN
        RAISE EXCEPTION 'FAIL: R107C GOOGLE_PLAY wallet balance';
    END IF;

    -- C-6: next cycles.
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = current_setting('chronoledger.r107c_m1_tpl')::uuid
                   AND status = 'PLANNED' AND billing_cycle = '2026-10' AND target_date = DATE '2026-10-30') THEN
        RAISE EXCEPTION 'FAIL: R107C MONTHLY_DAY next cycle missing';
    END IF;
    SELECT * INTO v_row FROM public.expenses WHERE id = current_setting('chronoledger.r107c_i1')::uuid;
    IF v_row.status <> 'CONFIRMED' OR v_row.earned_points <> 5 OR v_row.point_platform <> 'GALAXY_STORE'
       OR NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = current_setting('chronoledger.r107c_i1_tpl')::uuid
                      AND status = 'PLANNED' AND target_date = DATE '2026-10-29' AND NOT auto_confirm_blocked) THEN
        RAISE EXCEPTION 'FAIL: R107C INTERVAL_30 confirm or next cycle';
    END IF;
    IF (SELECT status FROM public.expenses WHERE id = current_setting('chronoledger.r107c_v1')::uuid) <> 'CONFIRMED'
       OR (SELECT count(*) FROM public.expenses WHERE template_id = current_setting('chronoledger.r107c_v1_tpl')::uuid) <> 1 THEN
        RAISE EXCEPTION 'FAIL: R107C VERSION_PASS confirm created extra rows';
    END IF;

    -- C-2/C-8: excluded rows and the failed row stay PLANNED; other users are untouched (C-10).
    SELECT count(*) INTO v_n FROM public.expenses
    WHERE user_id = v_c AND title IN ('R107C wallet', 'R107C off', 'R107C blocked', 'R107C old', 'R107C sameday', 'R107C fail')
      AND status = 'PLANNED' AND auto_confirmed_at IS NULL;
    IF v_n <> 6 THEN
        RAISE EXCEPTION 'FAIL: R107C excluded or failed rows changed (% of 6 still PLANNED)', v_n;
    END IF;
    IF (SELECT status FROM public.expenses WHERE id = current_setting('chronoledger.r107c_other')::uuid) <> 'PLANNED' THEN
        RAISE EXCEPTION 'FAIL: R107C touched another user row';
    END IF;
END $$;
\echo PASS: R107C-01 auto confirm matrix, snapshot/earn/asset equal to manual payment, month boundary, next cycles, failure isolation, privileges

-- R107C-02) User C refunds the auto confirmed INTERVAL_30 payment: assets and points restored, PLANNED rolled back and blocked
-- in the same transaction (C-7, D12). The legacy client rollback call does nothing afterwards. Restore marks rows blocked (D11).
DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_tpl UUID;
    v_old UUID;
    v_new UUID;
    v_inactive UUID;
    v_exp UUID;
BEGIN
    -- Non-latest refund: two CONFIRMED rows (09-01, 09-15) and PLANNED 10-15. Refunding the older one keeps the PLANNED date.
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method)
    VALUES (v_c, 'R107C latest', 'INTERVAL_30', 30, 0, 'GOOGLE_PLAY') RETURNING id INTO v_tpl;
    PERFORM set_config('chronoledger.r107c_latest_tpl', v_tpl::text, true);
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, payment_method, deduct_from_asset)
    VALUES (v_c, v_tpl, 'R107C latest old', '정기 구독', 'CONFIRMED', DATE '2026-09-01', 'WALLET', false) RETURNING id INTO v_old;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, payment_method, deduct_from_asset)
    VALUES (v_c, v_tpl, 'R107C latest new', '정기 구독', 'CONFIRMED', DATE '2026-09-15', 'WALLET', false) RETURNING id INTO v_new;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, payment_method)
    VALUES (v_c, v_tpl, 'R107C latest planned', '정기 구독', 'PLANNED', DATE '2026-10-15', 'WALLET');
    PERFORM set_config('chronoledger.r107c_latest_old', v_old::text, true);
    PERFORM set_config('chronoledger.r107c_latest_new', v_new::text, true);
    -- Inactive template (R107A-REV-002): refund works and no rollback is attempted.
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, is_active)
    VALUES (v_c, 'R107C inactive', 'INTERVAL_30', 30, 0, 'GOOGLE_PLAY', false) RETURNING id INTO v_inactive;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, payment_method, deduct_from_asset)
    VALUES (v_c, v_inactive, 'R107C inactive paid', '정기 구독', 'CONFIRMED', DATE '2026-09-10', 'WALLET', false) RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_inactive_paid', v_exp::text, true);
    -- Restore cases: MONTHLY planned cancel (restorable, blocked) and INTERVAL planned cancel while another PLANNED exists (23505).
    INSERT INTO public.expenses(user_id, template_id, billing_cycle, title, category, status, cancellation_kind, target_date, payment_method)
    VALUES (v_c, current_setting('chronoledger.r107c_m1_tpl')::uuid, '2026-11', 'R107C restore monthly', '정기 구독', 'CANCELLED', 'PLANNED_CANCEL', DATE '2026-11-30', 'GOOGLE_PLAY')
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_restore_monthly', v_exp::text, true);
    INSERT INTO public.expenses(user_id, template_id, title, category, status, cancellation_kind, target_date, payment_method)
    VALUES (v_c, current_setting('chronoledger.r107c_i1_tpl')::uuid, 'R107C restore interval', '정기 구독', 'CANCELLED', 'PLANNED_CANCEL', DATE '2026-11-28', 'GALAXY_STORE')
    RETURNING id INTO v_exp;
    PERFORM set_config('chronoledger.r107c_restore_interval', v_exp::text, true);
END $$;

SELECT set_config('request.jwt.claim.sub', :'r107c_user_c', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r107c_user_c', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    PERFORM public.refund_expense_payment(current_setting('chronoledger.r107c_i1')::uuid);
    -- Older client still calls the rollback RPC after a refund: it must not roll back a second time.
    IF public.rollback_interval_subscription(current_setting('chronoledger.r107c_i1')::uuid) THEN
        RAISE EXCEPTION 'FAIL: R107C legacy rollback ran after an atomic refund rollback';
    END IF;
    PERFORM public.refund_expense_payment(current_setting('chronoledger.r107c_latest_old')::uuid);
    PERFORM public.refund_expense_payment(current_setting('chronoledger.r107c_inactive_paid')::uuid);
    PERFORM public.restore_cancelled_expense(current_setting('chronoledger.r107c_restore_monthly')::uuid);
    BEGIN
        PERFORM public.restore_cancelled_expense(current_setting('chronoledger.r107c_restore_interval')::uuid);
        RAISE EXCEPTION 'FAIL: R107C restored a second INTERVAL_30 PLANNED row';
    EXCEPTION WHEN unique_violation THEN
        IF SQLERRM <> '같은 구독의 예정 지출이 이미 있어 복구할 수 없습니다.' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;

DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_planned public.expenses%ROWTYPE;
BEGIN
    IF (SELECT status || '/' || cancellation_kind FROM public.expenses WHERE id = current_setting('chronoledger.r107c_i1')::uuid) <> 'CANCELLED/PAYMENT_REFUND'
       OR (SELECT total_asset FROM public.user_finances WHERE user_id = v_c) <> 72000 + 5000 THEN
        RAISE EXCEPTION 'FAIL: R107C refund of the auto confirmed payment did not restore assets';
    END IF;
    SELECT * INTO v_planned FROM public.expenses
    WHERE template_id = current_setting('chronoledger.r107c_i1_tpl')::uuid AND status = 'PLANNED';
    IF v_planned.target_date <> DATE '2026-09-29' OR NOT v_planned.auto_confirm_blocked THEN
        RAISE EXCEPTION 'FAIL: R107C refund rollback date % / blocked %', v_planned.target_date, v_planned.auto_confirm_blocked;
    END IF;
    -- The rolled-back row is inside the window and old enough, yet the next cron run must not pay it again.
    UPDATE public.expenses SET created_at = TIMESTAMPTZ '2026-09-01 09:00:00+09' WHERE id = v_planned.id;
    PERFORM public.auto_confirm_due_expenses(v_c, DATE '2026-10-01');
    IF (SELECT status FROM public.expenses WHERE id = v_planned.id) <> 'PLANNED' THEN
        RAISE EXCEPTION 'FAIL: R107C cron re-confirmed a rolled-back PLANNED row';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE template_id = current_setting('chronoledger.r107c_latest_tpl')::uuid
                   AND status = 'PLANNED' AND target_date = DATE '2026-10-15' AND NOT auto_confirm_blocked) THEN
        RAISE EXCEPTION 'FAIL: R107C refunding a non-latest payment rolled the PLANNED row back';
    END IF;
    IF (SELECT status FROM public.expenses WHERE id = current_setting('chronoledger.r107c_inactive_paid')::uuid) <> 'CANCELLED' THEN
        RAISE EXCEPTION 'FAIL: R107C inactive template refund';
    END IF;
    IF (SELECT status || '/' || auto_confirm_blocked::text FROM public.expenses WHERE id = current_setting('chronoledger.r107c_restore_monthly')::uuid) <> 'PLANNED/true'
       OR (SELECT status FROM public.expenses WHERE id = current_setting('chronoledger.r107c_restore_interval')::uuid) <> 'CANCELLED' THEN
        RAISE EXCEPTION 'FAIL: R107C restore blocking or unique mapping';
    END IF;
END $$;
\echo PASS: R107C-02 refund restores assets and atomically rolls back INTERVAL_30 (blocked, latest only, inactive skipped), legacy rollback no-op, restore blocked/23505

-- R107C-03) Daily notifications (C-8, C-9): one EXPENSE_AUTO_CONFIRMED summary per user and day without amounts or titles,
-- none when expense_due_today=false, and a failed row due today still counts in EXPENSE_DUE_TODAY.
DO $$
DECLARE
    v_c UUID := current_setting('chronoledger.r107c_user_c')::uuid;
    v_e UUID := current_setting('chronoledger.r107c_user_e')::uuid;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Seoul')::date;
    v_tpl UUID;
    v_exp UUID;
    v_notif public.notifications%ROWTYPE;
    v_expected INTEGER;
BEGIN
    -- A due-today row of user C whose payment fails stays PLANNED: the asset deduction needs the user_finances row removed here.
    INSERT INTO public.subscription_templates(user_id, title, cycle_type, interval_days, default_price, payment_method, auto_confirm)
    VALUES (v_c, 'R107C due today', 'INTERVAL_30', 30, 700, 'GOOGLE_PLAY', true) RETURNING id INTO v_tpl;
    INSERT INTO public.expenses(user_id, template_id, title, category, status, target_date, original_price, final_amount, payment_method, point_platform, created_at)
    VALUES (v_c, v_tpl, 'R107C due today', '정기 구독', 'PLANNED', v_today, 700, 700, 'GOOGLE_PLAY', 'GOOGLE_PLAY', NOW() - INTERVAL '3 days')
    RETURNING id INTO v_exp;
    DELETE FROM public.user_finances WHERE user_id = v_c;
    IF public.auto_confirm_due_expenses(v_c, v_today) <> 0 OR (SELECT status FROM public.expenses WHERE id = v_exp) <> 'PLANNED' THEN
        RAISE EXCEPTION 'FAIL: R107C failing due-today row was confirmed';
    END IF;

    -- User E: an auto confirmed row today but the summary setting is off.
    INSERT INTO public.notification_settings(user_id, expense_due_today) VALUES (v_e, false)
    ON CONFLICT (user_id) DO UPDATE SET expense_due_today = false;
    INSERT INTO public.expenses(user_id, title, category, status, target_date, payment_method, deduct_from_asset, auto_confirmed_at)
    VALUES (v_e, 'R107C E secret title', '정기 구독', 'CONFIRMED', v_today - 1, 'WALLET', false, NOW());

    PERFORM public.enqueue_daily_notifications();
    PERFORM public.enqueue_daily_notifications();

    SELECT count(*) INTO v_expected FROM public.expenses
    WHERE user_id = v_c AND auto_confirmed_at IS NOT NULL AND (auto_confirmed_at AT TIME ZONE 'Asia/Seoul')::date = v_today;
    IF (SELECT count(*) FROM public.notifications WHERE user_id = v_c AND kind = 'EXPENSE_AUTO_CONFIRMED') <> 1 THEN
        RAISE EXCEPTION 'FAIL: R107C EXPENSE_AUTO_CONFIRMED is not one row per user and day';
    END IF;
    SELECT * INTO v_notif FROM public.notifications WHERE user_id = v_c AND kind = 'EXPENSE_AUTO_CONFIRMED';
    IF v_notif.title <> '오늘 자동 확정된 결제 ' || v_expected::text || '건'
       OR v_notif.body <> '자동 확정된 결제를 지출 관리에서 확인하세요. 잘못된 항목은 환불할 수 있습니다.'
       OR v_notif.link_path <> '/dashboard/expenses' OR v_notif.source_id <> v_c OR v_notif.scheduled_for <> v_today
       OR v_notif.title LIKE '%R107C%' OR v_notif.body LIKE '%10000%' OR v_notif.body LIKE '%R107C%' THEN
        RAISE EXCEPTION 'FAIL: R107C EXPENSE_AUTO_CONFIRMED content (%: %)', v_notif.title, v_notif.body;
    END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_e AND kind = 'EXPENSE_AUTO_CONFIRMED') THEN
        RAISE EXCEPTION 'FAIL: R107C summary created although expense_due_today=false';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_c AND kind = 'EXPENSE_DUE_TODAY' AND scheduled_for = v_today) THEN
        RAISE EXCEPTION 'FAIL: R107C failed due-today row is missing from EXPENSE_DUE_TODAY';
    END IF;

    -- The daily batch runs generation then auto confirm without raising (failing rows only warn).
    PERFORM public.run_daily_subscription_automation();
END $$;
\echo PASS: R107C-03 EXPENSE_AUTO_CONFIRMED summary once per user/day without amounts, setting off, failed row in DUE_TODAY, daily batch

-- R107C-REV-002) auto_confirmed_at only on non-PLANNED rows. The R107C-01..03 paths above (auto confirm, refund rollback,
-- restore) already ran with the constraint in place; here a fixture insert and the owner's direct update are rejected.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.expenses'::regclass AND conname = 'chk_expense_auto_confirmed_status' AND convalidated
    ) THEN
        RAISE EXCEPTION 'FAIL: R107C-REV-002 chk_expense_auto_confirmed_status missing or not validated';
    END IF;
    BEGIN
        INSERT INTO public.expenses(user_id, title, category, status, target_date, auto_confirmed_at)
        VALUES (current_setting('chronoledger.r107c_user_c')::uuid, 'R107C planned spoof', '기타', 'PLANNED', DATE '2026-10-01', NOW());
        RAISE EXCEPTION 'FAIL: R107C-REV-002 PLANNED row accepted auto_confirmed_at';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM NOT LIKE '%chk_expense_auto_confirmed_status%' THEN RAISE; END IF;
    END;
END $$;
SELECT set_config('request.jwt.claim.sub', :'r107c_user_c', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r107c_user_c', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_exp UUID;
BEGIN
    SELECT id INTO v_exp FROM public.expenses WHERE title = 'R107C due today' AND status = 'PLANNED';
    IF v_exp IS NULL THEN
        RAISE EXCEPTION 'FAIL: R107C-REV-002 fixture PLANNED row missing';
    END IF;
    BEGIN
        UPDATE public.expenses SET auto_confirmed_at = NOW() WHERE id = v_exp;
        RAISE EXCEPTION 'FAIL: R107C-REV-002 owner stamped auto_confirmed_at on a PLANNED row';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM NOT LIKE '%chk_expense_auto_confirmed_status%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;
\echo PASS: R107C-REV-002 auto_confirmed_at rejected on PLANNED rows (fixture insert, owner update)

-- PRIV-01) public.users: own-row SELECT only, signup nickname from metadata (never the email prefix), nickname CHECK.
DO $$
DECLARE
    v_named UUID := gen_random_uuid();
    v_plain UUID := gen_random_uuid();
    v_nick TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users read own profile' AND cmd = 'SELECT'
    ) OR EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Anyone can view user profiles'
    ) THEN
        RAISE EXCEPTION 'FAIL: PRIV-01 users SELECT policy is not own-row only';
    END IF;

    INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
    VALUES
        (v_named, 'authenticated', 'authenticated', 'priv01-named-' || replace(v_named::text, '-', '') || '@example.invalid', '',
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nickname', '  ' || repeat('n', 25) || '  ')),
        (v_plain, 'authenticated', 'authenticated', 'priv01-plain-' || replace(v_plain::text, '-', '') || '@example.invalid', '',
         '{"provider":"google","providers":["google"]}'::jsonb, '{}'::jsonb);

    SELECT nickname INTO v_nick FROM public.users WHERE id = v_named;
    IF v_nick IS DISTINCT FROM repeat('n', 20) THEN
        RAISE EXCEPTION 'FAIL: PRIV-01 signup nickname should be trimmed metadata capped at 20 chars, got %', v_nick;
    END IF;
    SELECT nickname INTO v_nick FROM public.users WHERE id = v_plain;
    IF v_nick IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: PRIV-01 signup without metadata nickname should store NULL, got %', v_nick;
    END IF;

    BEGIN
        UPDATE public.users SET nickname = repeat('x', 65) WHERE id = v_named;
        RAISE EXCEPTION 'FAIL: PRIV-01 65-char nickname accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM NOT LIKE '%chk_users_nickname_length%' THEN RAISE; END IF;
    END;
    BEGIN
        UPDATE public.users SET nickname = '   ' WHERE id = v_named;
        RAISE EXCEPTION 'FAIL: PRIV-01 blank nickname accepted';
    EXCEPTION WHEN check_violation THEN
        IF SQLERRM NOT LIKE '%chk_users_nickname_length%' THEN RAISE; END IF;
    END;
END $$;

SELECT set_config('request.jwt.claim.sub', :'other_user_id', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'other_user_id', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_count INTEGER;
BEGIN
    SELECT count(*) INTO v_count FROM public.users;
    IF v_count <> 1 OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'FAIL: PRIV-01 user B should see only own users row, saw % rows', v_count;
    END IF;
    IF EXISTS (SELECT 1 FROM public.users WHERE id = current_setting('chronoledger.test_user_id')::uuid) THEN
        RAISE EXCEPTION 'FAIL: PRIV-01 user B can read user A profile';
    END IF;
END $$;
RESET ROLE;
\echo PASS: PRIV-01 users profiles are own-row only, signup nickname never derives from email, nickname CHECK enforced

-- ============================================================================
-- R114: game monthly budgets and monthly report (spec docs/r113-r116-data-budget-public-spec.md §4, 114-2/114-3).
-- Fresh users G1..G4, G6 keep the cases independent. Fixed dates (2026-10-15 / 2026-11-01) drive the date-taking helpers.
-- ============================================================================
SELECT gen_random_uuid() AS r114_g1 \gset
SELECT gen_random_uuid() AS r114_g2 \gset
SELECT gen_random_uuid() AS r114_g3 \gset
SELECT gen_random_uuid() AS r114_g4 \gset
SELECT gen_random_uuid() AS r114_g6 \gset
SELECT set_config('chronoledger.r114_g1', :'r114_g1', true);
SELECT set_config('chronoledger.r114_g2', :'r114_g2', true);
SELECT set_config('chronoledger.r114_g3', :'r114_g3', true);
SELECT set_config('chronoledger.r114_g4', :'r114_g4', true);
SELECT set_config('chronoledger.r114_g6', :'r114_g6', true);
INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
SELECT u.id, 'authenticated', 'authenticated', 'codex-sqltest-' || replace(u.id::text, '-', '') || '@example.invalid',
       '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
FROM (VALUES (:'r114_g1'::uuid), (:'r114_g2'::uuid), (:'r114_g3'::uuid), (:'r114_g4'::uuid), (:'r114_g6'::uuid)) AS u(id);

-- R114-01) Schema, privileges and the 114-1 boundary cases on the server side (114-2).
DO $$
DECLARE
    v_g1 UUID := current_setting('chronoledger.r114_g1')::uuid;
    v_g2 UUID := current_setting('chronoledger.r114_g2')::uuid;
    v_g4 UUID := current_setting('chronoledger.r114_g4')::uuid;
    v_game UUID;
    v_n INTEGER;
    v_body TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_games' AND column_name = 'monthly_budget')
       OR (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_settings'
           AND column_name IN ('game_budget_alert', 'monthly_report') AND column_default = 'true' AND is_nullable = 'NO') <> 2 THEN
        RAISE EXCEPTION 'FAIL: R114 columns missing';
    END IF;
    IF has_function_privilege('authenticated', 'public.enqueue_game_budget_notifications(date)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.enqueue_game_budget_notifications(date)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.enqueue_monthly_report_notifications(date)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.enqueue_monthly_report_notifications(date)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.enqueue_game_budget_notifications(date)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.enqueue_monthly_report_notifications(date)', 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: R114 helper privileges';
    END IF;

    INSERT INTO public.games(name, default_icon_url) VALUES ('R114 game ' || v_g1::text, 'https://example.invalid/r114.webp') RETURNING id INTO v_game;
    PERFORM set_config('chronoledger.r114_game', v_game::text, true);
    BEGIN
        INSERT INTO public.user_games(user_id, game_id, monthly_budget) VALUES (v_g1, v_game, 0);
        RAISE EXCEPTION 'FAIL: R114 monthly_budget 0 accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    INSERT INTO public.user_games(user_id, game_id, monthly_budget) VALUES (v_g1, v_game, 10000), (v_g2, v_game, 1000), (v_g4, v_game, 1000);
    INSERT INTO public.notification_settings(user_id, game_budget_alert, monthly_report) VALUES (v_g2, false, false)
    ON CONFLICT (user_id) DO UPDATE SET game_budget_alert = false, monthly_report = false;

    -- G1 October usage (114-1 cases): confirmed after point discount 5000, PLANNED ending in October 2000,
    -- '정기 구독' with the game 1000 -> 8000 (80%). Excluded: PLANNED ending in November, cancelled, refunded, no game_id.
    -- Using target_date instead of end_date for PLANNED rows would give 7000 (70%) and no alert.
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, original_price, point_discount_amount, used_points, point_platform, final_amount)
    VALUES (v_g1, v_game, 'R114 confirmed', '게임', 'CONFIRMED', DATE '2026-10-05', 6000, 1000, 1000, 'GOOGLE_PLAY', 5000);
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, start_date, end_date, original_price, final_amount)
    VALUES (v_g1, v_game, 'R114 planned oct', '게임', 'PLANNED', DATE '2026-09-28', DATE '2026-09-28', DATE '2026-10-02', 2000, 2000),
           (v_g1, v_game, 'R114 planned nov', '게임', 'PLANNED', DATE '2026-10-30', DATE '2026-10-30', DATE '2026-11-02', 1000, 1000);
    INSERT INTO public.expenses(user_id, game_id, title, category, status, cancellation_kind, target_date, original_price, final_amount)
    VALUES (v_g1, v_game, 'R114 cancelled', '게임', 'CANCELLED', 'PLANNED_CANCEL', DATE '2026-10-10', 4000, 4000),
           (v_g1, v_game, 'R114 refunded', '게임', 'CANCELLED', 'PAYMENT_REFUND', DATE '2026-10-11', 4000, 4000);
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g1, v_game, 'R114 game subscription', '정기 구독', 'CONFIRMED', DATE '2026-10-12', 1000, 1000);
    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g1, 'R114 no game', '게임', 'CONFIRMED', DATE '2026-10-12', 9000, 9000);
    -- G2 is over budget but has the alert toggle off; G4 jumps straight past 100%.
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g2, v_game, 'R114 g2', '게임', 'CONFIRMED', DATE '2026-10-05', 5000, 5000),
           (v_g4, v_game, 'R114 g4', '게임', 'CONFIRMED', DATE '2026-10-05', 5000, 5000);

    PERFORM public.enqueue_game_budget_notifications(DATE '2026-10-15');
    IF (SELECT count(*) FROM public.notifications WHERE user_id = v_g1 AND kind = 'GAME_BUDGET_80' AND source_id = v_game AND scheduled_for = DATE '2026-10-01') <> 1
       OR EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g1 AND kind = 'GAME_BUDGET_100') THEN
        RAISE EXCEPTION 'FAIL: R114 80%% alert for exactly 8000 of 10000';
    END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g2 AND kind LIKE 'GAME_BUDGET_%') THEN
        RAISE EXCEPTION 'FAIL: R114 alert created although game_budget_alert=false';
    END IF;
    IF (SELECT count(*) FROM public.notifications WHERE user_id = v_g4 AND kind = 'GAME_BUDGET_100') <> 1
       OR EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g4 AND kind = 'GAME_BUDGET_80') THEN
        RAISE EXCEPTION 'FAIL: R114 a user past 100%% must get only GAME_BUDGET_100';
    END IF;
    -- Same-day re-run adds nothing.
    v_n := public.enqueue_game_budget_notifications(DATE '2026-10-15');
    IF v_n <> 0 THEN
        RAISE EXCEPTION 'FAIL: R114 re-run created % alerts', v_n;
    END IF;
    -- G1 reaches 100% later in the month: GAME_BUDGET_100 once, the 80% row stays single.
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g1, v_game, 'R114 confirmed 2', '게임', 'CONFIRMED', DATE '2026-10-13', 2000, 2000);
    PERFORM public.enqueue_game_budget_notifications(DATE '2026-10-20');
    PERFORM public.enqueue_game_budget_notifications(DATE '2026-10-21');
    IF (SELECT count(*) FROM public.notifications WHERE user_id = v_g1 AND kind = 'GAME_BUDGET_100') <> 1
       OR (SELECT count(*) FROM public.notifications WHERE user_id = v_g1 AND kind = 'GAME_BUDGET_80') <> 1 THEN
        RAISE EXCEPTION 'FAIL: R114 100%% alert not created exactly once';
    END IF;
    SELECT body INTO v_body FROM public.notifications WHERE user_id = v_g1 AND kind = 'GAME_BUDGET_100';
    IF v_body NOT LIKE 'R114 game %' OR v_body LIKE '%10000%' OR v_body LIKE '%10,000%' OR v_body LIKE '%8000%' THEN
        RAISE EXCEPTION 'FAIL: R114 alert body must name the game without amounts (%)', v_body;
    END IF;

    -- The daily batch calls both helpers with the real KST date without raising.
    PERFORM public.enqueue_daily_notifications();
END $$;
\echo PASS: R114-01 game budget 80/100 alerts once per month, attribution cases, toggle off, re-run idempotent, privileges

-- R114-02) Monthly report on the 1st (114-3).
DO $$
DECLARE
    v_g1 UUID := current_setting('chronoledger.r114_g1')::uuid;
    v_g2 UUID := current_setting('chronoledger.r114_g2')::uuid;
    v_g3 UUID := current_setting('chronoledger.r114_g3')::uuid;
    v_g4 UUID := current_setting('chronoledger.r114_g4')::uuid;
    v_g6 UUID := current_setting('chronoledger.r114_g6')::uuid;
    v_game UUID := current_setting('chronoledger.r114_game')::uuid;
    v_n INTEGER;
BEGIN
    INSERT INTO public.user_games(user_id, game_id, monthly_budget) VALUES (v_g3, v_game, 5000);
    INSERT INTO public.expenses(user_id, game_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g3, NULL, 'R114 g3 sep', '식비', 'CONFIRMED', DATE '2026-09-10', 10000, 10000),
           (v_g3, v_game, 'R114 g3 oct', '게임', 'CONFIRMED', DATE '2026-10-10', 12000, 12000),
           (v_g4, NULL, 'R114 g4 sep', '식비', 'CONFIRMED', DATE '2026-09-10', 10000, 10000);
    -- G6 has only a PLANNED October row: no report.
    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount)
    VALUES (v_g6, 'R114 g6 planned', '기타', 'PLANNED', DATE '2026-10-10', 3000, 3000);

    IF public.enqueue_monthly_report_notifications(DATE '2026-11-02') <> 0 THEN
        RAISE EXCEPTION 'FAIL: R114 monthly report created on a day other than the 1st';
    END IF;
    PERFORM public.enqueue_monthly_report_notifications(DATE '2026-11-01');

    -- G1: October confirmed 5000 + 1000 + 2000 + 9000 (no game) = 17000, no September record, game usage 10000 is not over 10000.
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g1 AND kind = 'MONTHLY_REPORT'
                   AND source_id = v_g1 AND scheduled_for = DATE '2026-10-01' AND title = '10월 지출 리포트'
                   AND body = '10월 확정 지출 17,000원(전월 기록 없음) · 예산 초과 게임 0개' AND link_path = '/dashboard/expenses') THEN
        RAISE EXCEPTION 'FAIL: R114 G1 report (%)', (SELECT body FROM public.notifications WHERE user_id = v_g1 AND kind = 'MONTHLY_REPORT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g3 AND kind = 'MONTHLY_REPORT'
                   AND body = '10월 확정 지출 12,000원(전월 대비 +20%) · 예산 초과 게임 1개') THEN
        RAISE EXCEPTION 'FAIL: R114 G3 report (%)', (SELECT body FROM public.notifications WHERE user_id = v_g3 AND kind = 'MONTHLY_REPORT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = v_g4 AND kind = 'MONTHLY_REPORT'
                   AND body = '10월 확정 지출 5,000원(전월 대비 -50%) · 예산 초과 게임 1개') THEN
        RAISE EXCEPTION 'FAIL: R114 G4 report (%)', (SELECT body FROM public.notifications WHERE user_id = v_g4 AND kind = 'MONTHLY_REPORT');
    END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id IN (v_g2, v_g6) AND kind = 'MONTHLY_REPORT') THEN
        RAISE EXCEPTION 'FAIL: R114 report for monthly_report=false or a user without confirmed spending';
    END IF;
    v_n := public.enqueue_monthly_report_notifications(DATE '2026-11-01');
    IF v_n <> 0 THEN
        RAISE EXCEPTION 'FAIL: R114 monthly report re-run created % rows', v_n;
    END IF;
END $$;
\echo PASS: R114-02 monthly report on the 1st only, totals/percent/over-budget count, no previous record, toggle off, idempotent

-- ============================================================================
-- R115: CSV import of confirmed expenses (spec docs/r113-r116-data-budget-public-spec.md §5, 115-1~115-4).
-- Fresh users I1 (importer) and I2 (other user). Imported rows must never touch total_asset, wallets or the point ledger.
-- ============================================================================
SELECT gen_random_uuid() AS r115_i1 \gset
SELECT gen_random_uuid() AS r115_i2 \gset
SELECT set_config('chronoledger.r115_i1', :'r115_i1', true);
SELECT set_config('chronoledger.r115_i2', :'r115_i2', true);
INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
SELECT u.id, 'authenticated', 'authenticated', 'r115-sqltest-' || replace(u.id::text, '-', '') || '@example.invalid',
       '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
FROM (VALUES (:'r115_i1'::uuid), (:'r115_i2'::uuid)) AS u(id);

-- R115-00) Fixture: schema, privileges, I1 balances and a catalog game.
DO $$
DECLARE
    v_i1 UUID := current_setting('chronoledger.r115_i1')::uuid;
    v_game UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses'
                   AND column_name = 'import_batch_id' AND data_type = 'uuid' AND is_nullable = 'YES')
       OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'expenses'
                      AND indexname = 'idx_expenses_user_import_batch' AND indexdef LIKE '%WHERE (import_batch_id IS NOT NULL)%') THEN
        RAISE EXCEPTION 'FAIL: R115 import_batch_id column or partial index missing';
    END IF;
    IF has_function_privilege('anon', 'public.import_confirmed_expenses(jsonb)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.delete_import_batch(uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.import_confirmed_expenses(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.delete_import_batch(uuid)', 'EXECUTE')
       OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.import_confirmed_expenses(jsonb)'::regprocedure)
       OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.delete_import_batch(uuid)'::regprocedure) THEN
        RAISE EXCEPTION 'FAIL: R115 RPC privileges or SECURITY DEFINER';
    END IF;

    UPDATE public.user_finances SET total_asset = 50000 WHERE user_id = v_i1;
    UPDATE public.store_wallets SET current_balance = 300 WHERE user_id = v_i1 AND platform = 'GOOGLE_PLAY';
    INSERT INTO public.store_wallets(user_id, platform, current_balance, earn_rate) VALUES (v_i1, 'NAVER_PAY', 7000, 0)
    ON CONFLICT (user_id, platform) DO UPDATE SET current_balance = 7000;
    INSERT INTO public.games(name, default_icon_url) VALUES ('R115 game ' || v_i1::text, 'https://example.invalid/r115.webp') RETURNING id INTO v_game;
    PERFORM set_config('chronoledger.r115_game', v_game::text, true);
END $$;

-- R115-01) I1 imports three rows: stored with the I1 values, ledger unchanged (115-1). One row is refunded (115-2).
SELECT set_config('request.jwt.claim.sub', :'r115_i1', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r115_i1', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_result JSONB;
    v_refund UUID;
BEGIN
    v_result := public.import_confirmed_expenses(jsonb_build_array(
        jsonb_build_object('target_date', '2026-10-01', 'title', 'R115 imported game', 'category', '게임', 'amount', 12000,
                           'game_id', current_setting('chronoledger.r115_game'), 'memo', '메모' || chr(10) || '[가져오기] 결제수단: 네이버페이'),
        jsonb_build_object('target_date', '2026-10-02', 'title', '  R115 imported food  ', 'category', '식비', 'amount', 3000),
        jsonb_build_object('target_date', '2000-01-01', 'title', 'R115 imported oldest', 'category', '기타', 'amount', 1, 'game_id', NULL, 'memo', '')
    ));
    IF (v_result->>'inserted')::int <> 3 OR v_result->>'batch_id' IS NULL THEN
        RAISE EXCEPTION 'FAIL: R115 import result %', v_result;
    END IF;
    PERFORM set_config('chronoledger.r115_batch', v_result->>'batch_id', true);

    SELECT id INTO v_refund FROM public.expenses WHERE import_batch_id = (v_result->>'batch_id')::uuid AND title = 'R115 imported food';
    IF v_refund IS NULL THEN
        RAISE EXCEPTION 'FAIL: R115 title should be trimmed';
    END IF;
    PERFORM public.refund_expense_payment(v_refund);
    PERFORM set_config('chronoledger.r115_refunded', v_refund::text, true);
END $$;
RESET ROLE;

DO $$
DECLARE
    v_i1 UUID := current_setting('chronoledger.r115_i1')::uuid;
    v_batch UUID := current_setting('chronoledger.r115_batch')::uuid;
BEGIN
    IF (SELECT count(*) FROM public.expenses WHERE user_id = v_i1 AND import_batch_id = v_batch) <> 3
       OR EXISTS (
           SELECT 1 FROM public.expenses
           WHERE user_id = v_i1 AND import_batch_id = v_batch
             AND NOT (payment_method = 'WALLET' AND deduct_from_asset = false AND original_price = final_amount
                      AND discount_amount = 0 AND point_discount_amount = 0 AND used_points = 0 AND earned_points = 0
                      AND point_platform IS NULL AND template_id IS NULL AND schedule_id IS NULL AND pickup_schedule_id IS NULL
                      AND start_date IS NULL AND end_date IS NULL)
       ) THEN
        RAISE EXCEPTION 'FAIL: R115 imported rows must carry the I1 values (115-1)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE user_id = v_i1 AND import_batch_id = v_batch AND title = 'R115 imported game'
                   AND status = 'CONFIRMED' AND category = '게임' AND target_date = DATE '2026-10-01' AND final_amount = 12000
                   AND game_id = current_setting('chronoledger.r115_game')::uuid AND memo LIKE '메모%[가져오기] 결제수단: 네이버페이')
       OR NOT EXISTS (SELECT 1 FROM public.expenses WHERE user_id = v_i1 AND import_batch_id = v_batch AND title = 'R115 imported oldest'
                      AND status = 'CONFIRMED' AND game_id IS NULL AND memo IS NULL AND final_amount = 1) THEN
        RAISE EXCEPTION 'FAIL: R115 imported values (date/amount/game/memo)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = current_setting('chronoledger.r115_refunded')::uuid
                   AND status = 'CANCELLED' AND cancellation_kind = 'PAYMENT_REFUND') THEN
        RAISE EXCEPTION 'FAIL: R115 refunded import should be CANCELLED/PAYMENT_REFUND (115-2)';
    END IF;
    IF (SELECT total_asset FROM public.user_finances WHERE user_id = v_i1) <> 50000
       OR (SELECT current_balance FROM public.store_wallets WHERE user_id = v_i1 AND platform = 'GOOGLE_PLAY') <> 300
       OR (SELECT current_balance FROM public.store_wallets WHERE user_id = v_i1 AND platform = 'NAVER_PAY') <> 7000
       OR (SELECT current_balance FROM public.store_wallets WHERE user_id = v_i1 AND platform = 'GALAXY_STORE') <> 0
       OR EXISTS (SELECT 1 FROM public.store_point_transactions WHERE user_id = v_i1) THEN
        RAISE EXCEPTION 'FAIL: R115 import or refund changed total_asset, wallets or the point ledger (115-1/115-2)';
    END IF;
END $$;
\echo PASS: R115-01 imported rows are CONFIRMED WALLET without asset/points, import and refund leave asset/wallets/ledger unchanged

-- R115-02) Validation rejects the whole call; 1,000 rows succeed and 1,001 fail (115-3).
SELECT set_config('request.jwt.claim.sub', :'r115_i1', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r115_i1', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_ok JSONB := jsonb_build_object('target_date', '2026-10-03', 'title', 'R115 valid', 'category', '게임', 'amount', 500);
    v_tomorrow TEXT := to_char((NOW() AT TIME ZONE 'Asia/Seoul')::date + 1, 'YYYY-MM-DD');
    v_case RECORD;
    v_before BIGINT;
    v_result JSONB;
BEGIN
    SELECT count(*) INTO v_before FROM public.expenses WHERE user_id = auth.uid();
    FOR v_case IN
        SELECT * FROM (VALUES
            (jsonb_build_array(v_ok, v_ok || jsonb_build_object('target_date', v_tomorrow)), '2번째 행: 날짜는'),
            (jsonb_build_array(v_ok, v_ok || jsonb_build_object('target_date', '1999-12-31')), '2번째 행: 날짜는'),
            (jsonb_build_array(v_ok || jsonb_build_object('target_date', '2026-02-30')), '1번째 행: 날짜 형식'),
            (jsonb_build_array(v_ok || jsonb_build_object('target_date', '2026/10/03')), '1번째 행: 날짜 형식'),
            (jsonb_build_array(v_ok, v_ok, v_ok || jsonb_build_object('amount', 0)), '3번째 행: 금액'),
            (jsonb_build_array(v_ok || jsonb_build_object('amount', 1.5)), '1번째 행: 금액'),
            (jsonb_build_array(v_ok || jsonb_build_object('amount', '500')), '1번째 행: 금액'),
            (jsonb_build_array(v_ok || jsonb_build_object('amount', 10000000001)), '1번째 행: 금액'),
            (jsonb_build_array(v_ok || jsonb_build_object('amount', -500)), '1번째 행: 금액'),
            (jsonb_build_array(v_ok || jsonb_build_object('title', '   ')), '1번째 행: 항목명'),
            (jsonb_build_array(v_ok || jsonb_build_object('title', repeat('가', 151))), '1번째 행: 항목명'),
            (jsonb_build_array(v_ok || jsonb_build_object('category', '쇼핑')), '1번째 행: 분류'),
            (jsonb_build_array(v_ok || jsonb_build_object('game_id', gen_random_uuid())), '1번째 행: 존재하지 않는 게임'),
            (jsonb_build_array(v_ok || jsonb_build_object('game_id', 'not-a-uuid')), '1번째 행: 존재하지 않는 게임'),
            (jsonb_build_array(v_ok || jsonb_build_object('memo', repeat('m', 501))), '1번째 행: 메모'),
            (jsonb_build_array(v_ok, '"text"'::jsonb), '2번째 행: 형식'),
            ('[]'::jsonb, '1행부터 1,000행까지'),
            ((SELECT jsonb_agg(v_ok) FROM generate_series(1, 1001)), '1행부터 1,000행까지'),
            (v_ok, '행 목록 형식')
        ) AS t(rows, expected)
    LOOP
        BEGIN
            PERFORM public.import_confirmed_expenses(v_case.rows);
            RAISE EXCEPTION 'FAIL: R115 invalid import accepted (expected %)', v_case.expected;
        EXCEPTION WHEN raise_exception THEN
            IF SQLERRM LIKE 'FAIL:%' OR position(v_case.expected IN SQLERRM) = 0 THEN
                RAISE EXCEPTION 'FAIL: R115 expected "%" but got "%"', v_case.expected, SQLERRM;
            END IF;
        END;
    END LOOP;
    IF (SELECT count(*) FROM public.expenses WHERE user_id = auth.uid()) <> v_before THEN
        RAISE EXCEPTION 'FAIL: R115 a rejected import left rows behind (115-3)';
    END IF;

    SELECT public.import_confirmed_expenses((SELECT jsonb_agg(v_ok) FROM generate_series(1, 1000))) INTO v_result;
    IF (v_result->>'inserted')::int <> 1000 THEN
        RAISE EXCEPTION 'FAIL: R115 1,000-row import result %', v_result;
    END IF;
    IF public.delete_import_batch((v_result->>'batch_id')::uuid) <> 1000 THEN
        RAISE EXCEPTION 'FAIL: R115 1,000-row batch undo count';
    END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.import_confirmed_expenses('[]'::jsonb);
        RAISE EXCEPTION 'FAIL: anon executed import_confirmed_expenses';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
    BEGIN
        PERFORM public.delete_import_batch(gen_random_uuid());
        RAISE EXCEPTION 'FAIL: anon executed delete_import_batch';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END $$;
RESET ROLE;
\echo PASS: R115-02 one invalid row rejects the whole import with its row number, 1,000 rows accepted, 1,001 rejected, anon denied

-- R115-03) delete_import_batch only deletes the caller's untouched I1 rows (115-4).
DO $$
BEGIN
    -- A row in the same batch that does not carry the I1 values (asset deducted) must survive the undo.
    INSERT INTO public.expenses(user_id, title, category, status, target_date, original_price, final_amount, payment_method, deduct_from_asset, import_batch_id)
    VALUES (current_setting('chronoledger.r115_i1')::uuid, 'R115 not importable shape', '기타', 'CONFIRMED', DATE '2026-10-04', 100, 100, 'WALLET', true,
            current_setting('chronoledger.r115_batch')::uuid);
END $$;

SELECT set_config('request.jwt.claim.sub', :'r115_i2', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r115_i2', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    IF public.delete_import_batch(current_setting('chronoledger.r115_batch')::uuid) <> 0 OR public.delete_import_batch(NULL) <> 0 THEN
        RAISE EXCEPTION 'FAIL: R115 another user deleted rows from I1 batch (115-4)';
    END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', :'r115_i1', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r115_i1', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
    v_n INTEGER;
BEGIN
    IF (SELECT count(*) FROM public.expenses WHERE import_batch_id = current_setting('chronoledger.r115_batch')::uuid) <> 4 THEN
        RAISE EXCEPTION 'FAIL: R115 I2 undo changed I1 rows';
    END IF;
    v_n := public.delete_import_batch(current_setting('chronoledger.r115_batch')::uuid);
    IF v_n <> 3 THEN
        RAISE EXCEPTION 'FAIL: R115 own undo should delete 3 rows (incl. refunded), got %', v_n;
    END IF;
    IF (SELECT count(*) FROM public.expenses WHERE import_batch_id = current_setting('chronoledger.r115_batch')::uuid) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.expenses WHERE title = 'R115 not importable shape') THEN
        RAISE EXCEPTION 'FAIL: R115 undo must keep rows without the I1 values';
    END IF;
END $$;
RESET ROLE;

-- Pending account deletion blocks both RPCs.
INSERT INTO public.account_deletion_requests(user_id, status_token_hash)
VALUES (:'r115_i2'::uuid, repeat('f', 64));
SELECT set_config('request.jwt.claim.sub', :'r115_i2', true);
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r115_i2', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    BEGIN
        PERFORM public.import_confirmed_expenses(jsonb_build_array(jsonb_build_object('target_date', '2026-10-03', 'title', 'x', 'category', '기타', 'amount', 1)));
        RAISE EXCEPTION 'FAIL: R115 import allowed while account deletion is pending';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '계정 삭제가 진행 중%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.delete_import_batch(gen_random_uuid());
        RAISE EXCEPTION 'FAIL: R115 undo allowed while account deletion is pending';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM NOT LIKE '계정 삭제가 진행 중%' THEN RAISE; END IF;
    END;
END $$;
RESET ROLE;
\echo PASS: R115-03 undo deletes only the caller's untouched rows (refunded included), other user 0 rows, pending deletion blocks both RPCs

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.cancel_planned_expense(
            current_setting('chronoledger.planned_cancel_id')::uuid
        );
        RAISE EXCEPTION 'FAIL: anon executed authenticated-only RPC';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END;
$$;
RESET ROLE;

ROLLBACK;
\echo PASS: all smoke-test fixtures and mutations rolled back
