# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

#### 1) 활성 Run: `r84-feedback-and-inbox` *(Step 3 iteration-02 리뷰 완료(2026-11-19, 로컬 `TESTS.sql` 실패 → Maker iteration-03 `▶ READY`), 이전 표기: Step 3 `🛑 BLOCKED (로컬 DB 검증 대기)` — 리뷰 완료, 병합 보류)*

- **Run ID**: `r84-feedback-and-inbox` *(`R84` 1차: 기타 건의 요청 창구 `feedback_requests` + `public.notifications` 테이블·30일 보관 `pg_cron` 정리·앱 내 알림함 상단 벨 UI + 건의 답변·요청 승인/반려 시 알림 행 원자적 생성)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 사용자 지시로 활성화)*
- **Worktree 경로**: `.worktrees/r84-feedback-and-inbox` (브랜치: `collab/r84-feedback-and-inbox`, 매니페스트: `artifacts/r84-feedback-and-inbox/run.json`)
- **Base SHA**: `ac71676bb8f4e0e737d97c26e21f35d7507296a1`
- **Target SHA**: `0f8e188a295b2643d76f43a59de296d0e94375b7` *(iteration-02 Maker 수정 기준, 미병합. iteration-01 리뷰 대상은 `d7eef7a177addb64952eb80a2fa18111278dce00`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`). 🐳 **Docker Desktop 필요**. `⚠️ LOCAL_DB_DEFERRED` (Step 1 로컬 DB 미실행 → Step 3에서 2회 멱등 적용·`TESTS.sql` 통과 전 병합 금지).
- **원격 브랜치**: `origin/collab/r84-feedback-and-inbox` push 완료(2026-11-19, `0f8e188`). 다른 PC는 handoff Skill §1 5단계로 워크트리 복원.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 0b93975)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Hydrogen** *(1순위 대체로 수행)* | `Maker (DB/RLS/RPC & Types)` | 🐳 **Docker Desktop 필요**. 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 0b93975`: `feedback_requests`·`notifications`·30일 정리 `pg_cron`·`mark_notifications_read`·`answer_feedback_request`·6개 요청 RPC 알림 연동·`TESTS.sql`·타입 반영. tsc·lint·Vitest 69파일/862개·diff-check 통과. ⚠️ Docker 미설치 PC로 로컬 DB 실행 미수행(사용자 지시로 Step 3 이관) |
| **2** | **`✅ DONE (SHA: d7eef7a)`** | **Claude Sonnet** *(Gemini 4 Hydrogen 1순위 대체, GitHub Copilot 2순위 대체)* | `Maker (UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/components/game/request-submission-modal.tsx`, `src/components/game/request-submission-modal.test.tsx`, `src/components/game/user-requests-card.tsx`, `src/app/dashboard/games/page.test.tsx`(또는 `src/components/game/user-requests-card.test.tsx`), `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `src/components/layout/topbar.tsx`, 신규 `src/components/layout/notification-bell.tsx` 및 테스트 파일, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ d7eef7a`: 건의 모달·내 요청 카드·관리자 건의 대기열·상단바 알림 벨. tsc·lint·Vitest 892개 통과 (아래 Step 2 완료 기록 참고) |
| **3a** | **`▶ READY`** | **GPT Codex** *(Claude Opus / Gemini 4 Neon 1순위 대체, GitHub Copilot 2순위 대체)* | `Maker (iteration-03: TESTS.sql R84 fixes)` | 🐳 **Docker Desktop 필요**. `.worktrees/r84-feedback-and-inbox`에서 아래 iteration-02 리뷰 기록의 `R84-REV-06`~`09`(모두 `sql/tests/TESTS.sql` 테스트 코드 문제) 수정. 허용 파일: `sql/tests/TESTS.sql`만. 로컬 Supabase(`sql/README.md` C절)에서 Base 스키마 + R84 마이그레이션 2회 적용 후 `TESTS.sql` 끝까지 통과(마지막 rollback PASS) 확인·커밋·push 후 Step 3 재리뷰를 `▶ READY`로 전환 | - |
| **3** | **`⏳ WAITING (iteration-03 후 재리뷰·병합)`** | **Claude Opus** *(Gemini 4 Argon / Gemini 4 Neon 1순위 대체, Gemini 4 Hydrogen / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | 🐳 **Docker Desktop 필요**. Base(`ac71676bb8f4e0e737d97c26e21f35d7507296a1`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·테스트(`test.json`) 검증 및 `main` 병합·문서 마감 | `🛑` iteration-02 Maker 수정 `0f8e188`(P3 2건·P4 3건 반영) 완료, Docker PC에서 iteration-02 리뷰·로컬 DB 실행 후 병합 필요. iteration-01 아티팩트 `0429417`(워크트리). 발견 P3 2건·P4 3건, tsc·lint·Vitest 892개·build 통과, 로컬 DB 미실행(이 PC Docker 미설치)으로 병합 보류. 아래 Step 3 리뷰 기록 참고 |

#### 📝 `r84-feedback-and-inbox` Step 3 iteration-02 리뷰 기록 (Claude Opus, 2026-11-19)

- **범위**: Base `ac71676` ↔ Target `0f8e188`. 이 PC에 워크트리가 없어 handoff Skill §1 5단계로 원격 브랜치에서 복원함. 범위 검사(조상·`Target..HEAD`의 `src`·`sql` 변경 없음) 통과. 산출물 `artifacts/r84-feedback-and-inbox/iteration-02/review.json`·`test.json`, `run.json` `target_sha` 갱신(커밋 `eb6379c`, 원격 브랜치 push 완료).
- **iteration-01 지적 반영 확인**: P3 2건(`answer_feedback_request` PENDING 가드, 승인/반려 알림 `TESTS.sql` 검사)·P4 3건(`CLOSED` 제목, README 경고, KST 시각 표시) 모두 반영됨. 마이그레이션과 `SCHEMA.sql` 본문 일치.
- **🐳 로컬 DB**: 로컬 Supabase 초기화 → Base `SCHEMA.sql`(`ac71676`) → R84 마이그레이션 **1·2회차 모두 성공(멱등)** → 테이블·권한(`authenticated` 직접 INSERT/UPDATE·`anon` 조회 불가)·`pg_cron` 잡(`chronoledger-notifications-purge`) 확인. **`TESTS.sql`은 R84 블록에서 실패**(35개 PASS 후 중단).
- **지적 (모두 P2, 테스트 코드 문제 — 마이그레이션·RPC 결함 아님)**:
  - `R84-REV-06`: R93 블록이 `request.jwt.claim.sub`를 사용자 A로 남겨 두고 A는 삭제 대기 상태라, R84 블록 첫 fixture INSERT(약 2127행)와 30일 정리 블록(약 2299행)이 삭제 대기 트리거에 막힘 → 두 곳 앞에서 `claim.sub`·`claims`를 `''`로 초기화(known-pitfalls 40).
  - `R84-REV-07`: iteration-02에서 추가한 게임 요청 승인/반려로 사용자 B 알림이 2건 더 생겨 `mark_notifications_read(NULL)`가 2를 반환함(정상) → 남은 알림을 먼저 읽음 처리한 뒤 0을 확인하도록 기대값 수정(약 2208행).
  - `R84-REV-08`: 삭제 대기 사용자 건의 INSERT는 RLS보다 BEFORE 트리거의 `raise_exception`이 먼저 나므로 `raise_exception`도 받도록 수정(약 2283행).
  - `R84-REV-09`: `DO $$` 본문 안에서 psql 변수 `:'other_user_id'` 사용 → `current_setting('chronoledger.other_user_id')::uuid`로 수정(약 2307행).
- **진단 결과**: 저장소는 건드리지 않고 컨테이너 임시 사본에 위 4가지를 넣어 실행하면 `TESTS.sql` **전체 통과(40개 PASS, R84 블록 포함, 마지막 rollback PASS)**함 → 수정 방향 확인됨.
- **앱 검사**: tsc·lint·`git diff --check`·build 통과, Vitest 70파일/893개 통과함. 공식 산출물 검증 스크립트는 `jsonschema` 미설치로 미실행, Node 부분 검증기로 스키마 형식만 확인함.
- **결정**: 리뷰어 규칙(로컬 DB에서 `sql/` 결함 발견 시 Maker 반복)에 따라 **병합하지 않음**. Maker iteration-03(`sql/tests/TESTS.sql`만 수정) 후 Step 3 재리뷰에서 로컬 DB 통과를 확인하고 병합함.

#### 📝 `r84-feedback-and-inbox` iteration-02 Maker 기록 (Claude Opus, 2026-11-19)

- **Target SHA**: `0f8e188a295b2643d76f43a59de296d0e94375b7`(워크트리, 미push). 변경: 마이그레이션·`SCHEMA.sql`·`TESTS.sql`·`sql/README.md`·`notification-bell.tsx`·테스트임.
- **수정**: `answer_feedback_request`가 `PENDING`이 아니면 예외(덮어쓰기·중복 알림 방지), `CLOSED` 알림 제목 분리, `TESTS.sql`에 재답변 거부·`approve/reject_game_request` 요청자 알림 1건·관리자 메모 미포함 검사 추가, README 재실행 경고에 R33·R52·UNOFFICIAL 추가, 알림 시각 KST 표시.
- **검증**: tsc·lint·Vitest 70파일 893개·`git diff --check` 통과. 마이그레이션과 `SCHEMA.sql`의 `answer_feedback_request` 본문 일치 확인함. 로컬 DB 실행은 **미실행**(`⚠️ LOCAL_DB_DEFERRED`, Docker 미설치).
- **원격 브랜치**: push 완료(2026-11-19).
- **다음**: Docker PC에서 Reviewer(Claude Opus)가 iteration-02(`Base ac71676` ↔ `Target 0f8e188`) 리뷰·로컬 DB 2회 적용·`TESTS.sql` 통과 기록 후 병합함.

#### 📝 `r84-feedback-and-inbox` Step 3 리뷰 기록 (Claude Opus, 2026-11-19, iteration-01)

- **범위**: Base `ac71676` ↔ Target `d7eef7a177addb64952eb80a2fa18111278dce00`. 범위 검사(조상 확인·`Target..HEAD`의 `src`·`sql` 변경 없음) 통과함. `run.json` `target_sha` 갱신, `review.json`·`test.json` 스키마 검증 통과 후 아티팩트 커밋 `0429417`(미push).
- **SQL 대조**: 기존 6개 요청 RPC·탈퇴 purge 본문이 Base `SCHEMA.sql` 대비 알림 INSERT·정리 2줄 외 변경 없음, 마이그레이션과 Target `SCHEMA.sql` 본문 일치함. 삭제 대기 트리거는 `auth.uid() = user_id`일 때만 막아 관리자 승인·답변 시 알림 생성을 막지 않음.
- **발견**: P3 ① `answer_feedback_request`에 `PENDING` 확인 없음 → 중복 답변 시 답변 덮어쓰기·알림 2건. P3 ② `TESTS.sql`이 6개 승인/반려 RPC의 알림 생성을 검사하지 않음. P4 ③ `CLOSED`도 제목이 "답변이 등록되었습니다" ④ README 경고에 승인/반려 RPC를 재정의하는 구버전 마이그레이션(R33·R52·UNOFFICIAL) 누락 ⑤ 알림 시각이 KST가 아닌 기기 시간대.
- **검사**: tsc·lint·Vitest 70파일 892개 통과, build는 워크트리에 `.env.local`이 없어 더미 로컬 값으로 통과, `git diff --check` 통과. 로컬 Supabase 2회 적용·`TESTS.sql`은 **미실행**(`skipped`).
- **다음 단계(권장)**: iteration-02 Maker(SQL이므로 Claude Opus 또는 Gemini 4 Neon / GPT Codex)가 P3 2건(가능하면 P4 포함) 수정 후, Docker 있는 PC에서 Reviewer가 로컬 DB 2회 적용·`TESTS.sql` 통과를 기록하고 병합. 다른 PC로 옮기려면 사용자가 `collab/r84-feedback-and-inbox` push 필요.

#### 📝 `r84-feedback-and-inbox` Step 2 완료 기록 (Claude Sonnet, 2026-11-18)

- **Target SHA**: `d7eef7a` (워크트리 브랜치 `collab/r84-feedback-and-inbox`, 미병합)임. SQL·타입 변경 없음. 변경 파일: `request-submission-modal.tsx`·테스트, `user-requests-card.tsx`·테스트, `admin/requests/page.tsx`·테스트, `layout/topbar.tsx`·테스트, 신규 `layout/notification-bell.tsx`·테스트임.
- **통합 요청 모달**: 요청 종류에 `기타 건의` 추가(분류 `기능 제안·오류 신고·기타`, 제목 1~100자, 내용 1~2,000자, 첨부 없음). `feedback_requests`에 `user_id·category·title·content`만 insert함(상태·답변 컬럼은 RLS 조건상 보내지 않음). `내 요청` 탭에 건의 목록(분류, 상태 `검토 대기/답변 완료/종료`, 관리자 답변)을 추가함. 테이블 미적용(`42P01`/`PGRST205`)은 내역 빈 목록, 제출 시에는 "R84 마이그레이션 미적용" 안내임.
- **내 요청 현황 카드**: 건의를 함께 조회·표시하고 필터 `건의 (n)` 추가함(기존 `게임 요청`·`일정 요청` 라벨은 유지). 테이블 미적용은 빈 목록, 그 외 오류는 기존 로드 오류 문구임.
- **관리자 요청 대기열**: `건의 (n)` 탭과 `기타 건의 대기열`(PENDING, 오래된 순) 추가. 항목별 답변 입력(최대 2,000자)과 `답변 등록`(답변 필수, `ANSWERED`)·`종료 처리`(답변 선택, `CLOSED`)가 `answer_feedback_request` RPC만 호출하고 직접 쓰기 폴백은 없음. 성공 시 대기열에서 제거, 실패 시 오류 표시·항목 유지, `isOffline()` 가드함. 건의 조회 실패·테이블 미적용은 건의 탭만 비우고 다른 대기열은 막지 않음.
- **알림함**: 로그인 사용자(비게스트)에게만 상단바 우측에 벨(`NotificationBell`)과 미읽음 배지(10건 이상 `9+`)를 표시함. 팝오버는 최근 30건(미읽음 강조·시각), `모두 읽음`(`mark_notifications_read(null)`), 항목 클릭 시 `mark_notifications_read([id])` 후 `link_path`가 `^/`(`//` 제외)일 때만 `router.push`함. 오프라인이면 읽음 처리를 막고 안내, 미적용 DB는 빈 상태("새 알림이 없습니다.")로 폴백함. 새 알림은 마운트·벨 열기 시에만 다시 불러오고 자동 폴링·Realtime은 쓰지 않음.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`(CRLF 경고만), Vitest 70파일 892개 통과함(알림 벨 11개·건의 모달 5개·카드 4개·관리자 6개 등 추가). 실브라우저·실DB 확인은 하지 않음(Step 1 SQL 로컬 실행도 Step 3 확인 대상).
- **가정·남은 점**: 요청 승인/반려·답변 알림 행은 Step 1 RPC가 만든다고 보고 UI는 읽기·읽음 처리만 함. 건의 답변 직후 알림이 사용자 벨에 보이려면 벨을 다시 열거나 새로고침해야 함(실시간 갱신 미구현). `splitVersionGroups` 같은 미사용 코드는 이번 범위가 아님.
- **다음 단계**: Step 3(`Claude Opus`, Base `ac71676` ↔ Target `d7eef7a` 통합 리뷰·로컬 DB 2회 적용·병합) `▶ READY`임.

#### 📋 `r84-feedback-and-inbox` Step 1 수용 기준 (GPT Codex — DB/RLS/RPC & Types)

1. **`public.feedback_requests` 테이블·제약·RLS·탈퇴 연동**:
   - 컬럼: `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `category VARCHAR(30) NOT NULL CHECK (category IN ('기능 제안', '오류 신고', '기타'))`, `title VARCHAR(100) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100)`, `content TEXT NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000)`, `request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'ANSWERED', 'CLOSED'))`, `admin_answer TEXT CHECK (admin_answer IS NULL OR length(btrim(admin_answer)) <= 2000)`, `answered_at TIMESTAMPTZ`, `answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
   - 인덱스: `idx_feedback_requests_status(request_status)`, `idx_feedback_requests_user_id(user_id, created_at DESC)`.
   - 권한·RLS: `REVOKE ALL ON public.feedback_requests FROM PUBLIC, anon, authenticated; GRANT SELECT, INSERT ON public.feedback_requests TO authenticated;` (일반 사용자 직접 `UPDATE`/`DELETE` 원천 차단). 본인 조회 정책(`auth.uid() = user_id`), 본인 등록 정책(`auth.uid() = user_id AND request_status = 'PENDING' AND admin_answer IS NULL AND answered_at IS NULL AND answered_by IS NULL`), 관리자 전체 조회/관리 정책(`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')`).
   - 계정 삭제 대기 사용자 차단 RESTRICTIVE 정책(`Block account deletion users from feedback_requests`)·트리거(`block_pending_account_deletion_feedback_requests`) 적용 및 `purge_expired_account_deletion_requests`에 `DELETE FROM public.feedback_requests WHERE user_id = v_req.user_id;` 추가.
2. **`public.notifications` 테이블·제약·RLS·30일 보관 `pg_cron` 정리**:
   - 컬럼 ([`docs/push-notification-research.md`](push-notification-research.md) §5.3·§9 기준): `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `kind VARCHAR(40) NOT NULL CHECK (kind IN ('FAVORITE_START', 'FAVORITE_END_D1', 'EXPENSE_D1', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED'))`, `title VARCHAR(120) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120)`, `body VARCHAR(300) NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 300)`, `link_path TEXT NOT NULL CHECK (link_path ~ '^/' AND link_path !~ '^//' AND length(link_path) <= 200)`(같은 출처 상대 경로만 허용), `source_id UUID`, `scheduled_for DATE`, `push_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (push_status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED'))`, `push_attempts SMALLINT NOT NULL DEFAULT 0 CHECK (push_attempts >= 0)`, `pushed_at TIMESTAMPTZ`, `read_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
   - 인덱스: `idx_notifications_user_created(user_id, created_at DESC)`, `idx_notifications_user_unread(user_id, created_at DESC) WHERE read_at IS NULL`, 일일 알림 중복 방지 부분 고유 인덱스 `uq_notifications_daily_source(user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL`.
   - 권한·RLS: `REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated; GRANT SELECT ON public.notifications TO authenticated;` (클라이언트 직접 쓰기 원천 차단, 본인 행 `SELECT`만 허용). 계정 삭제 대기 사용자 차단 RESTRICTIVE 정책·트리거 및 `purge_expired_account_deletion_requests` 내 `DELETE FROM public.notifications WHERE user_id = v_req.user_id;` 추가.
   - 30일 보관 정리: `public.purge_expired_notifications()` (`RETURNS INTEGER`, `SECURITY DEFINER SET search_path = public`, `service_role`만 실행 허용)에서 `created_at < NOW() - INTERVAL '30 days'` 행 삭제 후 건수 반환. `pg_cron` 잡 `chronoledger-notifications-purge`(`15 0 * * *` 매일 00:15 UTC) 멱등 등록.
3. **알림 읽음 처리·건의 답변 RPC 및 기존 승인/반려 RPC 알림 생성 연동**:
   - `public.mark_notifications_read(p_notification_ids UUID[] DEFAULT NULL)` (`RETURNS INTEGER`, `SECURITY DEFINER SET search_path = public`, `authenticated` 실행 허용): `auth.uid()` 및 계정 삭제 대기 여부를 확인한 뒤, `p_notification_ids IS NULL`이면 본인의 미읽음(`read_at IS NULL`) 알림 전체를, 배열이 주어지면 해당 ID 중 본인 미읽음 알림만 `read_at = NOW()`로 갱신하고 갱신 행 수를 반환함.
   - `public.answer_feedback_request(p_request_id UUID, p_admin_answer TEXT DEFAULT NULL, p_status VARCHAR DEFAULT 'ANSWERED')` (`RETURNS VOID`, `SECURITY DEFINER SET search_path = public`, `authenticated` 실행 허용): 관리자 권한 확인, `p_status IN ('ANSWERED', 'CLOSED')` 검증(`ANSWERED`일 때 `btrim(coalesce(p_admin_answer, ''))` 1~2,000자 필수), 대상 행 `FOR UPDATE` 갱신(`request_status`, `admin_answer`, `answered_at = NOW()`, `answered_by = auth.uid()`, `updated_at = NOW()`)과 동시에 작성자(`v_request.user_id`) 앞으로 `public.notifications` 행(`kind = 'FEEDBACK_ANSWERED'`, 민감 원문 제외한 안내 제목·본문, `link_path = '/dashboard/games'`, `source_id = v_request.id`)을 원자적으로 생성함.
   - 기존 6개 요청 승인/반려 RPC(`approve_game_request`, `reject_game_request`, `approve_schedule_request`, `reject_schedule_request`, `approve_character_request`, `reject_character_request`) 내부에서 요청자(`user_id`) 앞으로 `REQUEST_APPROVED` 또는 `REQUEST_REJECTED` 알림 행(`link_path = '/dashboard/games'`, `source_id = 요청 id`, 반려 사유 원문 미포함)을 같은 트랜잭션에서 INSERT함.
4. **동기화 및 검증**:
   - `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`(멱등), `sql/SCHEMA.sql`, `sql/README.md`(B표 `R84` 확인 쿼리), `sql/tests/TESTS.sql`(`R84` 스모크 블록), `src/types/database.types.ts` 동기화.
   - 로컬 Supabase DB 2회 적용 및 `TESTS.sql` 통과, `npx tsc --noEmit`, `npm run lint`, `npm test -- --run` 통과 후 `.worktrees/r84-feedback-and-inbox`에 커밋하고 Step 2를 `▶ READY`로 전환함.

#### 📋 `r84-feedback-and-inbox` Step 2 수용 기준 (Claude Sonnet — UI & Vitest)

1. **통합 요청 모달(`request-submission-modal.tsx`) 확장**:
   - `RequestKind`에 `"feedback"`(`기타 건의`) 추가. 건의 분류(`기능 제안`·`오류 신고`·`기타`), 제목(1~100자), 내용(1~2,000자, 이미지 첨부 없음) 입력 및 `feedback_requests` 등록 구현.
   - 모달 내 `내 요청 내역` 탭에서도 본인의 `feedback_requests` 내역(분류, 제목, 상태 배지 `검토 대기`/`답변 완료`/`종료`, 관리자 답변 `admin_answer`)을 조회·표시함(미적용 DB `42P01`/`PGRST205` 시 빈 배열 폴백).
2. **내 요청 현황 카드(`user-requests-card.tsx`) 확장**:
   - `feedback_requests`를 함께 조회해 표시하고 필터 탭에 `건의` 추가(`전체` / `일정` / `게임` / `건의`). 분류 배지, 상태 배지, 본문 요약, 관리자 답변(`admin_answer`)을 표시함.
3. **관리자 요청 대기열(`/admin/requests/page.tsx`) 확장**:
   - `기타 건의 대기열`(`PENDING` 상태 `feedback_requests`) 섹션/탭을 추가하고, 관리자가 답변(`admin_answer`)을 입력해 `answer_feedback_request` RPC로 답변 등록(`ANSWERED`) 또는 종료 처리(`CLOSED`)할 수 있게 함.
4. **상단바 앱 내 알림함(`topbar.tsx` / `notification-bell.tsx`) 구현**:
   - 로그인 사용자(비게스트) 상단바 우측에 벨 아이콘과 미읽음(`read_at IS NULL`) 배지를 표시함.
   - 팝오버/드로어에서 최근 알림 목록(최대 30건, 미읽음 강조), `[모두 읽음]` 버튼(`mark_notifications_read()`), 개별 알림 클릭 시 읽음 처리(`mark_notifications_read([id])`) 후 `link_path`(`^/` 상대 경로 검증)로 이동을 지원함(미적용 DB `42P01`/`PGRST205` 및 오프라인 시 우아한 빈 상태 폴백).
5. **테스트 및 검증**:
   - 위 4개 영역 단위 테스트(Vitest) 추가 및 `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 3(`Claude Opus`) `▶ READY` 전환.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R85` | 설계·결정 완료 · 구현 Run 예약 대기(🐳) | 일정 시각(`start_at`·`end_at`·예상 표시) + 게임별 서버 초기화 시각(`games.daily_reset_time`) | [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §10, `docs/to-do.md` R85 |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 결정 완료 · 4차 Run 예약 (`r97-tauri-notifications`) | `R84` 이후 착수 가능. Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 + 앱 실행 중 새 알림 OS 네이티브 표시 (DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75`·`R87`·`R95` | 후속 · 우선 낮음 | 리뷰 P4 이관·후속 설계 | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `pipeline-collab-6-items-opus-review`

- **Run ID**: `pipeline-collab-6-items-opus-review` **(완료, 2026-11-19)** *(AI 협업 파이프라인 6대 병목·모순 Opus 2차 검토 및 스킬 반영)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-19 사용자 지시로 등록)*
- **Worktree 경로**: `main` (협업 문서·스킬 개정, 제품 코드·DB 변경 없음)
- **Base SHA**: `7c0ff3cbb73a8eee636d95cb98bccd7882d8cc8e`

| 순서 | 상태 | 담당 모델 | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-19)`** | **Claude Opus** | `Reviewer & Architect (Pipeline Audit)` | [`docs/pipeline-collaboration-review.md`](pipeline-collaboration-review.md) §4 작성, 6건 채택(보완 포함), 스킬 6종·Copilot 지침·`New-CollaborationRun.ps1` 반영 |

#### 📝 `pipeline-collab-6-items-opus-review` Step 1 완료 기록 (Claude Opus, 2026-11-19)

- **P1-1**: Reviewer가 `run.json` `target_sha`를 채워 아티팩트와 한 커밋에 넣음. 범위 검사(`merge-base --is-ancestor`·`git diff <Target> HEAD -- src sql`)를 워크트리 Run까지 확대함.
- **P1-2**: Maker·SQL 스킬·Copilot 지침에 티어별 인계(Sonnet→Opus, Hydrogen→Neon 또는 Argon/Opus) 반영함.
- **P2-1·P2-2**: handoff §1 5단계 워크트리 복원 추가. Docker 미설치/엔진 꺼짐 분기, `⚠️ LOCAL_DB_DEFERRED` 표기, `sql/` diff 기준 병합 게이트 추가함.
- **P2-3·P3-1**: 수용 기준 포인터+8줄 원칙, 서브에이전트 위임 허용·금지 범위 명시함.
- **검증**: `Sync-Skills.ps1 -Check` 일치, PS1 구문 검사 오류 0건, `git diff --check` 통과. 제품 코드 변경 없어 tsc·Vitest 미실행.
- **남은 점**: `r84` 브랜치 미push, 현재 PC Docker 미설치. 검증기 `--manifest` 교차 검사는 후속 후보(미등록).
