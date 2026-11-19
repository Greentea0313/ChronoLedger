# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

#### 1) 우선 실행 과제: `pipeline-collab-6-items-opus-review` *(AI 협업 파이프라인 6대 병목·모순 Opus 2차 검토 및 스킬 반영)*

- **Run ID**: `pipeline-collab-6-items-opus-review` *(`P1-1` `run.json` `target_sha` 갱신 주체 모순, `P1-2` 하위 스킬 내 `Hydrogen` $\to$ `Neon`/`Argon` 승격 규칙 통일, `P2-1` 다중 PC 워크트리 복원, `P2-2` Docker 미설치 PC의 Step 3 로컬 DB 검증 이관 표준화, `P2-3` `handoff.md` 수용 기준 슬림화, `P3-1` `Hydrogen`·`Neon`의 `Flash` 서브에이전트 활용)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-19 사용자 지시로 등록)*
- **Worktree 경로**: `main` (협업 문서·스킬 검토 및 개정이므로 격리 워크트리 없이 `main`에서 수행함. 제품 코드·DB 변경 없음, 🐳 Docker 불필요)
- **Base SHA**: `7c0ff3cbb73a8eee636d95cb98bccd7882d8cc8e`

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`▶ READY`** | **Claude Opus** *(Gemini 4 Argon / Gemini 4 Neon 1순위 대체, Gemini 4 Hydrogen 2순위 대체)* | `Reviewer & Architect (Pipeline Audit)` | [`docs/pipeline-collaboration-review.md`](pipeline-collaboration-review.md) §2~§3의 6가지 문제 현상(`P1-1`~`P3-1`)과 개선안을 비판적으로 2차 검토해 문서 내 `## 4. Claude Opus 2차 검증 결과 및 확정안`을 작성하고, 확정된 개선안을 스킬·스크립트에 반영(`Sync-Skills.ps1` 실행 포함)한 뒤 커밋하고 아래 `r84-feedback-and-inbox` Step 3를 `▶ READY`로 복원함. 허용 파일: `docs/pipeline-collaboration-review.md`, `.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`, `.github/copilot-instructions.md`, `scripts/collaboration/New-CollaborationRun.ps1`, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md` | 대기 중 (`▶ READY`) |

---

#### 2) 병합 대기 중 기능 Run: `r84-feedback-and-inbox` *(위 `pipeline-collab-6-items-opus-review` 완료 직후 Step 3 `▶ READY` 전환)*

- **Run ID**: `r84-feedback-and-inbox` *(`R84` 1차: 기타 건의 요청 창구 `feedback_requests` + `public.notifications` 테이블·30일 보관 `pg_cron` 정리·앱 내 알림함 상단 벨 UI + 건의 답변·요청 승인/반려 시 알림 행 원자적 생성)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 사용자 지시로 활성화)*
- **Worktree 경로**: `.worktrees/r84-feedback-and-inbox` (브랜치: `collab/r84-feedback-and-inbox`, 매니페스트: `artifacts/r84-feedback-and-inbox/run.json`)
- **Base SHA**: `ac71676bb8f4e0e737d97c26e21f35d7507296a1`
- **Target SHA**: `d7eef7a` *(Step 2 완료 기준, 미병합)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`). 🐳 **Docker Desktop 필요** (Step 1 또는 Step 3에서 로컬 Supabase 2회 멱등 적용 및 `TESTS.sql` 실행).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 0b93975)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Hydrogen** *(1순위 대체로 수행)* | `Maker (DB/RLS/RPC & Types)` | 🐳 **Docker Desktop 필요**. 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 0b93975`: `feedback_requests`·`notifications`·30일 정리 `pg_cron`·`mark_notifications_read`·`answer_feedback_request`·6개 요청 RPC 알림 연동·`TESTS.sql`·타입 반영. tsc·lint·Vitest 69파일/862개·diff-check 통과. ⚠️ Docker 미설치 PC로 로컬 DB 실행 미수행(사용자 지시로 Step 3 이관) |
| **2** | **`✅ DONE (SHA: d7eef7a)`** | **Claude Sonnet** *(Gemini 4 Hydrogen 1순위 대체, GitHub Copilot 2순위 대체)* | `Maker (UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/components/game/request-submission-modal.tsx`, `src/components/game/request-submission-modal.test.tsx`, `src/components/game/user-requests-card.tsx`, `src/app/dashboard/games/page.test.tsx`(또는 `src/components/game/user-requests-card.test.tsx`), `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `src/components/layout/topbar.tsx`, 신규 `src/components/layout/notification-bell.tsx` 및 테스트 파일, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ d7eef7a`: 건의 모달·내 요청 카드·관리자 건의 대기열·상단바 알림 벨. tsc·lint·Vitest 892개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`⏳ WAITING`** | **Claude Opus** *(Gemini 4 Argon / Gemini 4 Neon 1순위 대체, Gemini 4 Hydrogen / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | 위 `pipeline-collab-6-items-opus-review` 완료 즉시 `▶ READY` 전환. Base(`ac71676bb8f4e0e737d97c26e21f35d7507296a1`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·테스트(`test.json`) 검증 및 `main` 병합·문서 마감 | `⏳ 위 파이프라인 6대 개선안 Opus 검토 완료 직후 진행 (Base ac71676 ↔ Target d7eef7a)` |

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

### 🗂️ 직전 완료 Run 기록: `r89-push-notification-research`

- **Run ID**: `r89-push-notification-research` **(완료, 2026-11-18)** *(`R89` · `R39` 연계: 웹 푸시(PWA)·Tauri 데스크톱 알림 지원 범위, 서버리스 발송 구조, 구독 저장·RLS, 게임 일정·예정 지출 알림 및 `R84` 건의 답변 알림 통합 설계 조사)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 사용자 지시로 활성화)*
- **Worktree 경로**: `main` (문서 전용 조사이므로 격리 워크트리·`run.json` 없이 `main`에서 수행함. 코드·SQL 변경 없음)
- **Base SHA**: `d5b9b74312fe271b8e5f38c04a21023efbc156fb`
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-18)`** | **Claude Opus** *(Gemini 4 Hydrogen / Gemini 4 Argon 1순위 대체, GitHub Copilot 2순위 대체)* | `Researcher & Architect (R89)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `docs/push-notification-research.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `✅` [`docs/push-notification-research.md`](push-notification-research.md) 작성. 권장: 앱 내 알림함 먼저 → 일일 알림 → 웹 푸시. Tauri(WebView2) 웹 푸시는 미지원으로 판정. 사용자 결정 6건(§9) |
| **2** | **`✅ DONE (2026-11-18)`** | **Gemini 4 Argon** *(Gemini 4 Hydrogen / Claude Opus 1순위 대체, GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | 조사 문서 검토, 사용자 결정 사항을 질문 카드로 확인, `R84` 및 알림 구현 후속 Run 예약 반영, `docs/` 마감 | `✅` 기술·보안 경계 검토 완료, 질문 카드 6건 확정(1차 `R84`+알림함 30일 보관 → 2차 `R39` 일일 3종 KST 09:00 → 3차 `R96` Web Push → 4차 `R97` Tauri OS 알림), 예약 목록 갱신 및 마감 |

#### 📝 `r89-push-notification-research` Step 1 완료 기록 (Claude Opus, 2026-11-18)

- **산출물**: [`docs/push-notification-research.md`](push-notification-research.md). 문서 전용, 코드·DB 변경 없음.
- **결론**: 알림을 DB `notifications` 행으로 먼저 만들고 앱 내 알림함으로 보여준 뒤, 같은 행을 Edge Function이 웹 푸시로 보내는 구조를 권장함. `R84` 답변 알림은 앱 내 알림만으로 먼저 출시 가능함.
- **플랫폼**: Android·데스크톱 브라우저 지원, iOS는 홈 화면 웹 앱(16.4+)에서만, Tauri(WebView2)는 웹 푸시 미지원으로 판정(구독 오류 보고·공식 문서 없음) → 앱 내 알림 + 실행 중 OS 알림만.
- **발송**: `pg_cron` 하루 1회(KST 09:00 안) + 알림 행 INSERT DB 웹훅(`pg_net`) 즉시 호출. 실패 행은 다음 실행이 다시 처리함. VAPID 개인키는 Edge Function Secrets에만 둠.
- **DB 초안**: `push_subscriptions`(endpoint 소유자 교체·로그아웃 시 해제), `notification_settings`, `notifications`(발송 상태·읽음). 모두 본인 조회만, 쓰기는 RPC·DB 함수 전용, 삭제 대기 차단·탈퇴 정리 연결.

#### 📝 `r89-push-notification-research` Step 2 완료 기록 (Gemini 4 Argon, 2026-11-18)

- **검토 결과**: `notifications` 테이블 기반 Outbox 구조, 클라이언트 직접 쓰기 차단(DB 함수·RPC 전용 생성/읽음 처리), 공용 기기 `endpoint` 소유자 교체 및 로그아웃 시 구독 해제, `link_path` 상대 경로(`^/`) 강제, 잠금 화면 민감 정보 배제 설계가 모두 기존 보안·RLS 원칙과 부합함을 확인함. `R39` 예정 지출 알림 기준일은 `expenses.target_date`로 명시함.
- **사용자 결정 확정 (2026-11-18 질문 카드)**:
  1. **단계별 도입 순서**: 1차 `R84`(기타 건의 창구 + 앱 내 알림함) → 2차 `R39`(관심 일정·예정 지출 일일 알림) → 3차 `R96`(Web Push 외부 발송) → 4차 `R97`(Tauri 실행 중 OS 네이티브 알림).
  2. **일일 알림(`R39`) 종류**: 관심 일정 시작 당일(`FAVORITE_START`), 관심 일정 종료 1일 전(`FAVORITE_END_D1`), 예정 지출 결제 예정일 1일 전(`EXPENSE_D1`) 3종(건의 답변·요청 승인/반려 알림은 1차 기본 포함).
  3. **발송 시각·보관 기간·Tauri 범위**: KST 09:00(`0 0 * * *` UTC) 발송, 알림 보관 기간 **30일**(`pg_cron` 자동 정리), Windows Tauri는 앱 내 알림함 + 실행 중 OS 네이티브 알림(`@tauri-apps/plugin-notification`)까지 포함.
- **후속 조치**: `docs/push-notification-research.md` §8·§9에 확정안 반영, `docs/to-do.md` 및 본 문서 예약 요약표에 `R84`·`R39`·`R96`·`R97` 등록, 완료된 `R89` 및 직전 Run `skill-support-check` 기록을 `docs/archive/`로 이관함.
