# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **Run ID**: `r39-daily-notifications` *(`R39` 일일 정기 알림: `public.notification_settings` 테이블·RLS·탈퇴 정리 + KST 09:00 `pg_cron` `enqueue_daily_notifications()` 함수(관심 일정 시작 당일 `FAVORITE_START`·종료 D-1 `FAVORITE_END_D1`·예정 지출 결제 예정일 D-1 `EXPENSE_D1` 3종) + 설정 화면 알림 토글 UI)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-23 사용자 선택으로 등록)*
- **Worktree 경로**: `.worktrees/r39-daily-notifications` (브랜치: `collab/r39-daily-notifications`, 매니페스트: `artifacts/r39-daily-notifications/run.json`)
- **Base SHA**: `1af478baed61123977a05729f46e23768726f4a9`
- **Target SHA**: `afc9a21d3672314c829a3d491e649c81f848ffa2` *(Step 2 완료 기준, 미병합)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`, `sql/SCHEMA.sql` — `pg_cron`·RLS·`SECURITY DEFINER` → Opus 승격 조건 ①). ⚠️ `LOCAL_DB_DEFERRED` — 현재 PC Docker CLI 미설치로 Step 1은 SQL/타입/테스트 작성·정적 검증까지만 완료함. 🐳 로컬 DB 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 검증은 Docker 환경(Step 3 또는 별도 PC)에서 수행함.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 3d612eda7fc1596151b5b021a5d452656a2af5cc)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R39 DB/RLS/pg_cron & Types)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 3d612ed`: `MIGRATION_R39_DAILY_NOTIFICATIONS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. `tsc`·`lint`·`diff-check`·Vitest 71파일/952개 통과. ⚠️ `LOCAL_DB_DEFERRED`(Docker 미설치, 아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: afc9a21)`** | **Claude Sonnet** *(Gemini 4 Hydrogen 1순위 대체, GitHub Copilot 2순위 대체)* | `Maker (설정 화면 알림 토글 UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/settings/page.test.tsx`, 필요 시 `src/components/settings/` 신규 컴포넌트·테스트, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ afc9a21`: 설정 화면 알림 설정 카드(3종 토글·부분 upsert·오프라인/미적용 폴백). tsc·lint·Vitest 960개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`▶ READY`** | **Claude Opus** *(Gemini 4 Argon / Gemini 4 Neon 1순위 대체)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. Base(`1af478baed61123977a05729f46e23768726f4a9`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감 | `▶ Step 2 완료(afc9a21). Base 1af478b ↔ Target afc9a21` |

#### 📋 `r39-daily-notifications` Step 1 수용 기준 (`GPT Codex` — DB/RLS/`pg_cron` & Types)

1. **`public.notification_settings` 테이블·RLS·탈퇴 연동**:
   - 컬럼 ([`docs/push-notification-research.md`](push-notification-research.md) §5.2 기준): `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `favorite_schedule_start BOOLEAN NOT NULL DEFAULT true`, `favorite_schedule_end_d1 BOOLEAN NOT NULL DEFAULT true`, `planned_expense_d1 BOOLEAN NOT NULL DEFAULT true`, `request_result BOOLEAN NOT NULL DEFAULT true`, `push_enabled BOOLEAN NOT NULL DEFAULT false`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
   - 권한·RLS: `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL ON public.notification_settings FROM PUBLIC, anon, authenticated; GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;` (본인 행 `auth.uid() = user_id`만 조회·등록·수정 허용, `DELETE` 권한 없음).
   - 계정 삭제 대기 사용자 차단 RESTRICTIVE 정책(`Block account deletion users from notification_settings`)·트리거(`block_pending_account_deletion_notification_settings`) 적용(`SCHEMA.sql` 공통 루프 2곳 포함) 및 `purge_expired_account_deletion_requests`에 `DELETE FROM public.notification_settings WHERE user_id = v_req.user_id;` 추가.
2. **`public.enqueue_daily_notifications()` 함수 및 `pg_cron` 등록**:
   - `RETURNS INTEGER`, `SECURITY DEFINER SET search_path = public`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.
   - 기준일: KST 오늘 `v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::date`, 내일 `v_tomorrow := v_today + 1`.
   - 계정 삭제 대기 중(`account_deletion_is_pending(user_id)`)인 사용자는 제외하고, `notification_settings` 행이 없으면 각 알림 기본값 `true`로 간주함.
   - 3종 알림 생성 (`ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING`):
     - ① `FAVORITE_START`: `user_favorite_schedules` + `game_schedules`에서 `start_date = v_today`인 관심 일정 (`link_path = '/dashboard?date=' || to_char(v_today, 'YYYY-MM-DD')`, `source_id = s.id`, `scheduled_for = v_today`, 제목·본문은 일정 제목만 포함하고 민감 메모 제외).
     - ② `FAVORITE_END_D1`: `user_favorite_schedules` + `game_schedules`에서 `end_date = v_tomorrow`인 관심 일정 (`link_path = '/dashboard?date=' || to_char(v_tomorrow, 'YYYY-MM-DD')`, `source_id = s.id`, `scheduled_for = v_tomorrow`).
     - ③ `EXPENSE_D1`: `expenses`에서 `status = 'PLANNED'`이고 `target_date = v_tomorrow`인 예정 지출 (`link_path = '/dashboard/expenses'`, `source_id = e.id`, `scheduled_for = v_tomorrow`, **잠금 화면 보호를 위해 금액·메모 원문은 절대 포함하지 않음**, 예: `'내일 결제 예정인 지출이 있습니다'`).
   - `pg_cron` 잡 `chronoledger-daily-notifications`(`0 0 * * *` = 매일 KST 09:00) 멱등 등록.
3. **동기화 및 검증**:
   - `sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`(멱등), `sql/SCHEMA.sql`, `sql/README.md`(B표 `R39` 확인 쿼리·선행 purge 주의), `sql/tests/TESTS.sql`(`R39` 스모크 블록), `src/types/database.types.ts` 동기화.
   - `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, Step 2 `▶ READY` 전환함(Docker 미설치 PC면 로컬 DB 미실행 사유를 기록하고 Step 3으로 넘김).

#### 📋 `r39-daily-notifications` Step 2 수용 기준 (`Claude Sonnet` — 설정 화면 알림 토글 UI & Vitest)

1. **`/dashboard/settings` 알림 설정 카드 추가**:
   - `notification_settings`에서 본인 행을 조회하고, 행이 없으면 기본값(`favorite_schedule_start: true`, `favorite_schedule_end_d1: true`, `planned_expense_d1: true`, `request_result: true`)으로 표시함.
   - 3종 일일 알림(`관심 일정 시작 당일`, `관심 일정 종료 1일 전`, `예정 지출 결제일 1일 전`) 토글 스위치 제공 (`request_result`·`push_enabled`는 R96 범위까지 유지·비파괴 `upsert` 처리, `onConflict: 'user_id'`).
   - 오프라인 가드(`isOffline()`) 및 미적용 DB(`42P01`/`PGRST205`) 시 읽기·저장 폴백 안내("DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다.") 처리.
2. **테스트 및 검증**:
   - `src/app/dashboard/settings/page.test.tsx`에 알림 설정 조회(기본값/기존 행), 토글 upsert 저장, 오프라인 가드, 미적용 DB 폴백 테스트 추가.
   - `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 3(`Claude Opus`) `▶ READY` 전환.

#### 📝 `r39-daily-notifications` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-23)

- **Target SHA**: `3d612eda7fc1596151b5b021a5d452656a2af5cc` (워크트리 브랜치 `collab/r39-daily-notifications`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·함수·`pg_cron` 변경**:
  - `public.notification_settings` 테이블 생성(`user_id PK → auth.users ON DELETE CASCADE`, `favorite_schedule_start`/`favorite_schedule_end_d1`/`planned_expense_d1`/`request_result` 기본 `true`, `push_enabled` 기본 `false`, `updated_at`), RLS 활성화 및 `authenticated`에 본인 행 `SELECT`/`INSERT`/`UPDATE`만 허용(`DELETE` 권한·`anon` 권한 없음).
  - 계정 삭제 대기 차단 RESTRICTIVE 정책(`Block account deletion users from notification_settings`)·트리거(`block_pending_account_deletion_notification_settings`) 적용(`SCHEMA.sql` 공통 루프 2곳 포함) 및 `purge_expired_account_deletion_requests`에 `DELETE FROM public.notification_settings WHERE user_id = v_req.user_id;` 추가.
  - `public.enqueue_daily_notifications()` (`RETURNS INTEGER`, `SECURITY DEFINER SET search_path = public`, `service_role` 실행 전용) 및 `pg_cron` 잡 `chronoledger-daily-notifications`(`0 0 * * *`, 매일 KST 09:00) 멱등 등록. KST 기준 오늘(`v_today`)/내일(`v_tomorrow`)로 `FAVORITE_START`·`FAVORITE_END_D1`·`EXPENSE_D1` 3종을 `ON CONFLICT (user_id, kind, source_id, scheduled_for) WHERE scheduled_for IS NOT NULL DO NOTHING`으로 생성함.
- **결정·가정**:
  - `notifications.title`(`VARCHAR(120)`) 초과 및 잠금 화면 민감정보 노출을 막기 위해 `FAVORITE_START`·`FAVORITE_END_D1`은 고정 제목 + 본문에 `left(coalesce(nullif(btrim(s.title), ''), '관심 일정'), 150)`만 넣고 `s.memo`는 제외함. `EXPENSE_D1`은 고정 문구(`'내일 결제 예정인 지출이 있습니다'` / `'예정된 결제 일정을 지출 관리에서 확인하세요.'`)만 사용해 금액·지출명·메모 원문을 모두 제외함.
  - `README.md` B표에 R84 선행 적용 및 구버전 `purge_expired_account_deletion_requests` 재실행 주의 문구·확인 쿼리 추가함. `TESTS.sql`에 `R39-01`~`R39-04` 스모크 블록 추가함.
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(71파일/952개 통과) 확인함.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED`)**: 현재 PC에 Docker CLI 미설치(`NO_DOCKER`)로 로컬 Supabase 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 실행 검증은 수행하지 못함. Step 3(Docker 환경)에서 로컬 DB 병합 게이트 검증 필수임.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 이어가려면 `git -C .worktrees/r39-daily-notifications push -u origin collab/r39-daily-notifications` 필요함.
- **다음 단계**: Step 2(`Claude Sonnet`, Fallback: `Gemini 4 Hydrogen` / `GitHub Copilot` — 설정 화면 알림 토글 UI & Vitest) `▶ READY`임.

#### 📝 `r39-daily-notifications` Step 2 완료 기록 (Claude Sonnet, 2026-11-23)

- **Target SHA**: `afc9a21d3672314c829a3d491e649c81f848ffa2` (워크트리 브랜치 `collab/r39-daily-notifications`, 미병합·미push). SQL·타입 변경 없음. 변경 파일: 신규 `src/components/settings/notification-settings-card.tsx`, `src/app/dashboard/settings/page.tsx`(카드 연결 3줄), `src/app/dashboard/settings/page.test.tsx`임.
- **UI**: `/dashboard/settings`에 `알림 설정` 카드를 추가함(로그인 사용자만). 3종 토글(`관심 일정 시작 당일`·`관심 일정 종료 1일 전`·`예정 지출 결제일 1일 전`)을 `role="switch"`·`aria-checked`로 표시하고, 각 항목에 전달 시각(KST 09:00) 설명을 둠. 예정 지출 알림에는 금액을 표시하지 않는다고 안내함.
- **조회·저장**: `notification_settings`에서 `favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1`만 `user_id`로 조회하고, 행이 없거나 값이 비면 `true`(켜짐)로 표시함. 저장은 `upsert({ user_id, <토글한 컬럼>, updated_at }, { onConflict: "user_id" })`로 토글한 컬럼 하나만 보내 기존 행의 `request_result`·`push_enabled`를 건드리지 않음. 낙관적 갱신 후 실패하면 되돌리고 오류를 표시하며, 저장 중에는 다른 토글을 잠가 중복 요청을 막음.
- **가드·폴백**: 쓰기는 `isOffline()`으로 막고 오프라인 안내를 표시함. 테이블 미적용(`42P01`/`PGRST205`)이면 기본값을 읽기 전용(토글 비활성)으로 보이고 "DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다."를 안내함. 그 외 조회 실패는 "알림 설정을 불러오지 못했습니다."임.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`(CRLF 경고만), Vitest 71파일 960개 통과함(설정 화면 알림 테스트 8개 추가: 기본값·기존 행·부분 upsert 페이로드·저장 실패 롤백·오프라인·미적용 2종·기타 로드 오류). 실브라우저·실DB 확인은 하지 않음.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED` 유지)**: Step 1의 로컬 Supabase 2회 멱등 적용·`SCHEMA.sql`·`TESTS.sql` 실행은 여전히 미수행이며 Step 3(Docker 환경)이 맡음.
- **가정**: `request_result`·`push_enabled` 토글은 R96 범위라 UI에 두지 않음. 설정을 바꿔도 이미 생성된 알림은 그대로이며, 새 설정은 다음 일일 생성(KST 09:00)부터 `enqueue_daily_notifications()`가 반영하는지는 Step 1 SQL의 동작에 의존하고 이번에 검증하지 못함.
- **다음 단계**: Step 3(`Claude Opus`, Base `1af478b` ↔ Target `afc9a21` 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`임.

### 🚦 병행 활성 Run: `r97-tauri-notifications`

- **Run ID**: `r97-tauri-notifications` *(`R97` Windows Tauri 데스크톱 OS 네이티브 알림 실기기 동작 확인 및 엣지 케이스 보완 — `r39-daily-notifications`와 별도 병행)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-23 사용자 요청으로 등록)*
- **Worktree 경로**: `.worktrees/r97-tauri-notifications` (브랜치: `collab/r97-tauri-notifications`, 매니페스트: `artifacts/r97-tauri-notifications/run.json`)
- **Base SHA**: `0f8ce5529ccfc4fd8065678ac474627b1d224b4c`
- **Target SHA**: `390920fed29d7e130fd6b10a460f5cecdd489470` *(Step 1 완료 기준, 미병합)*
- **DB 변경**: 없음 (`src/lib/tauri-notifications.ts`, `src/components/layout/notification-bell.tsx`, `src-tauri/` 범위)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 390920fed29d7e130fd6b10a460f5cecdd489470)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / GitHub Copilot)* | `Maker (R97 실기기 검증·엣지 케이스 보완 & Vitest)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: `src/lib/tauri-notifications.ts`, `src/lib/tauri-notifications.test.ts`, `src/components/layout/notification-bell.tsx`·`test.tsx`, `src-tauri/src/`, `src-tauri/capabilities/`, `docs/push-notification-research.md`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 390920f`: 빈 초기 알림함 시드 누락·동시 호출 경쟁 상태·빈 제목/본문 폴백 보완. `cargo check`·`tsc`·`lint`·`diff-check`·Vitest 72파일/960개 통과 (아래 Step 1 완료 기록 참고) |
| **2** | **`▶ READY`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Reviewer & Orchestrator` | Step 1 완료 후 착수. Base(`0f8ce5529ccfc4fd8065678ac474627b1d224b4c`) $\leftrightarrow$ Target SHA 정적 리뷰(`review.json`)·검증(`test.json`)·`main` 병합·문서 마감 | `▶ Step 1 완료(390920f). Base 0f8ce55 ↔ Target 390920f` |

#### 📋 `r97-tauri-notifications` Step 1 수용 기준 (`Gemini 4 Hydrogen` — 실기기 검증·보완 & Vitest)

1. **기존 `R97` 구현 엣지 케이스 점검·보완** ([`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 기준):
   - `src/lib/tauri-notifications.ts`·`NotificationBell`·`src-tauri` 권한/capabilities에서 다중 탭/폴링 중복 발송, 권한 거부 후 재시도, 빈 제목/본문 길이, 재로그인 시 `seenIds` 초기화 등 엣지 케이스를 점검하고 필요 시 보완함.
2. **Windows Tauri 빌드·실기기 OS 토스트 검증**:
   - 워크트리에서 `cargo check`(필요 시 `tauri build` / `tauri dev`)로 Rust·권한 설정을 재확인하고, 실기기 OS 토스트 확인 절차를 실행·기록함(사용자 확인 필요 시 구체적 확인 절차 명시).
3. **정적·단위 테스트 검증 및 커밋**:
   - `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 2(`Claude Sonnet`) `▶ READY` 전환함.

#### 📝 `r97-tauri-notifications` Step 1 완료 기록 (Gemini 4 Hydrogen, 2026-11-23)

- **Target SHA**: `390920fed29d7e130fd6b10a460f5cecdd489470` (워크트리 브랜치 `collab/r97-tauri-notifications`, 미병합·원격 push 안 함). 변경 파일: `src/lib/tauri-notifications.ts`, `src/lib/tauri-notifications.test.ts` (`run.json` 미수정).
- **보완 내용**: ① 빈 초기 알림함(`items = []`)에서도 최초 1회 시드(`saveSeenIds(userId, [])`)를 기록해 직후 도착한 첫 알림이 누락되지 않도록 수정함. ② 사용자별 직렬화 큐(`pendingByUser`)와 권한 질의 전 `seenIds` 선저장으로 마운트·`focus`·폴링 동시 호출 시 중복 OS 토스트 발송을 차단함. ③ 공백 제목 시 `"ChronoLedger"` 폴백 및 공백 본문 생략 처리함.
- **검증**: 워크트리에서 `cargo check --manifest-path src-tauri/Cargo.toml`, `npx tsc --noEmit`, `npm run lint`, `git diff --check`, `npx vitest run`(72파일/960개, 신규 3건 포함) 모두 통과함. Windows 설치본/개발 실행 실기기 OS 토스트 육안 확인은 사용자 수동 확인(`npm run tauri dev` 또는 설치본 실행 중 새 알림 수신 시 Windows 알림 센터 확인)으로 남김.
- **다음 단계**: Step 2(`Claude Sonnet`, Base `0f8ce55` ↔ Target `390920f` 정적 리뷰·검증·`main` 병합) `▶ READY`임.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수 가능. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 진행 중 · 병행 Run (`r97-tauri-notifications`) | `main` 1차 구현(`3a8bad9`) 이후 실기기 OS 토스트 동작 확인 및 엣지 케이스 보완 진행 (`r39-daily-notifications`와 병행, DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r85-schedule-times`

- **Run ID**: `r85-schedule-times` **(완료, `main` 병합 `6204346`, 2026-11-21)** *(2026-11-21 등록 · `R85`: 일정 시각 `start_at`·`end_at`·예상 표시 + 게임별 서버 초기화 시각 `games.daily_reset_time` · 설계 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §4~§8, §10)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-21 등록)* → Claude Opus *(Step 3 리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r85-schedule-times` (브랜치: `collab/r85-schedule-times`, 매니페스트: `artifacts/r85-schedule-times/run.json`, 미삭제·원격 미push)
- **Base SHA**: `be4b43fd752a15185d584f035f9692d7181e064b`
- **Target SHA**: `48086cc101299340c3b982439afc22efd87efd85` *(iteration-01 리뷰 clean, 산출물 `62b8b76`, `main` 병합 `6204346`. Step 1 DB 커밋은 `97a809f`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`). 🐳 Step 3 로컬 DB 재검증 통과. 운영 DB 수동 적용·README 확인 쿼리(컬럼 9행·제약 11행·`true` 4종) 완료(사용자, 2026-11-21).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 97a809f3f80006b375ffabbf0acb439f7fc4eb58)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R85 DB/RLS/RPC & Types)` | `.worktrees/r85-schedule-times`에서 아래 **Step 1 수용 기준** 수행(🐳 Docker Desktop 로컬 Supabase 검증 포함). 허용 파일: 신규 `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` | `✅ 97a809f`: `MIGRATION_R85_SCHEDULE_TIMES.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. 🐳 로컬 DB 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 41개 PASS, tsc·lint·Vitest 70파일/900개·diff-check 통과 (아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: 48086cc101299340c3b982439afc22efd87efd85)`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R85 공용 로직·UI & Vitest)` | `.worktrees/r85-schedule-times`에서 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/lib/`(`calendar-utils.ts` 등 관련 유틸·테스트), `src/app/admin/page.tsx`·`requests/page.tsx` 및 테스트, `src/components/game/request-submission-modal.tsx` 및 테스트, `src/components/calendar/*`·`src/components/game/*`·`src/app/dashboard/page.tsx`·`games/page.tsx`·`src/app/page.tsx` 및 해당 테스트 | `✅ 48086cc`: `schedule-time.ts` 공용 로직, 일정 시각 입력(관리자 일정·게임 정보·요청 모달), 표시(주차별·선택일·게임별 모달·요청 화면), 미적용 DB 폴백. tsc·lint·diff-check 통과, Vitest 71파일/950개 통과 (미병합, 원격 push 안 함, 아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (산출물 62b8b76, main 병합 6204346)`** | **Claude Opus** *(Fallback: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Base `be4b43f` ↔ Step 2 Target SHA 통합 정적 리뷰(`review.json`·`test.json`), 🐳 로컬 DB 업그레이드(2회 멱등)·신규 `SCHEMA.sql` + `TESTS.sql` 검증, `main` 병합 및 `docs/` 마감 | 정적 리뷰 **clean**(지적 0건). 🐳 업그레이드 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 41개 PASS, tsc·lint·Vitest 71파일/950개·`next build` 통과 후 `main` 병합 `6204346` |

#### 📝 `r85-schedule-times` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-21)

- **Target SHA**: `97a809f3f80006b375ffabbf0acb439f7fc4eb58` (워크트리 브랜치 `collab/r85-schedule-times`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·RPC 변경**: `games.daily_reset_time TIME`(분 단위 CHECK·`anon` 조회 허용), `game_schedules`·`schedule_requests`의 `start_at`·`end_at TIMESTAMPTZ`·`start_at_estimated`·`end_at_estimated BOOLEAN` 및 CHECK 10종(KST 날짜 일치·순서·`date_trunc('minute', ..., 'UTC')` 분 단위·예상-시각 일치) 추가. `approve_schedule_request`가 신규 INSERT·대상 UPDATE 모두 시각·예상 플래그를 복사하도록 갱신(`sync_version_expenses_trigger` 및 R84 알림 INSERT 유지). `README.md` B표에 확인 쿼리 및 R84 선행/재실행 주의 문구 추가.
- **검증**: 🐳 로컬 Supabase 초기화 → Base `SCHEMA.sql`(`be4b43f`) + R85 마이그레이션 **1·2회차 멱등 적용** + `README.md` 확인 쿼리(컬럼 9행·제약 11행·`anon`/RPC 4종 `true`) + `TESTS.sql` **41개 PASS(R85 7종 시나리오+`anon` 조회 포함)·최종 rollback PASS**. 별도로 신규 Target `SCHEMA.sql` 직접 적용 + `TESTS.sql` **41개 PASS·롤백 PASS** 확인. 워크트리 `git diff --check`·`tsc --noEmit`·`next lint`·Vitest **70파일/900개** 모두 통과함.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 Step 2를 이어가려면 `git -C .worktrees/r85-schedule-times push -u origin collab/r85-schedule-times` 필요함.
- **다음 단계**: Step 2(`Claude Sonnet`, Fallback: `Gemini 4 Hydrogen` / `GitHub Copilot` — R85 공용 로직·UI & Vitest) `▶ READY`임.

#### 📝 `r85-schedule-times` Step 2 완료 기록 (Claude Sonnet, 2026-11-21)

- **Target SHA**: `48086cc101299340c3b982439afc22efd87efd85` (`collab/r85-schedule-times`, 미병합, 원격 브랜치 push 안 함)임. 변경 17개 파일 모두 Step 2 허용 범위 내이며 `run.json`·SQL·타입은 건드리지 않음.
- **공용 로직** (`src/lib/schedule-time.ts` 신규, 테스트 21건): `formatSchedulePeriod`(시각 없음 현행 문구 유지·시각·`(예상)`·같은 날 한 번 표기, `short`/`full` 두 날짜 형식), `getScheduleStatus`·`hasScheduleEnded`(`end_at`/`start_at` 우선, 없으면 날짜 기준), `getScheduleEndLabel`(`D-n` 날짜 기준 유지, 종료 당일 `오늘 HH:mm 종료`/`종료`), KST 변환·`composeScheduleAt`·`getResetEndMoment`(초기화 −1분, `00:00`은 전날 `23:59`), 미적용 DB 오류 판별 `isMissingScheduleTimeColumnError`(`42703`/`PGRST204` + R85 컬럼명)·`stripScheduleTimeFields`.
- **표시**: 주차별 리스트(`weekly-schedule-list.tsx`)는 `hasScheduleEnded`로 새벽 종료 일정을 그날부터 제외하고 `진행 중` 칩을 `getScheduleStatus`로 판정하며 기간·종료 배지에 시각을 표시함. 선택일 상세(`hero-sidebar.tsx`)는 시각이 다른 일정을 같은 카드로 묶지 않고, 오늘을 선택했고 이미 종료된 일정은 `종료` 배지·흐리게(`data-ended`) 표시함. 게임별 일정 모달(`dashboard/games/page.tsx`)은 `진행 중`·`다음 예정`·`지난 일정 기록`을 시각으로 구분하고 기간·종료 라벨에 시각을 표시함. `/admin/requests`·내 요청 카드·요청 모달 내 요청 목록은 기간 문자열에 시각을 표시함. 달력 칸(`desktop-calendar.tsx`)·예산·예정 지출 로직은 변경 없음. 대시보드(`dashboard/page.tsx`)는 시각 필드를 목록 컴포넌트로 전달만 함(조회는 이미 `select("*")`라 미적용 DB에서도 안전).
- **입력**: `/admin` 일정 등록·수정·복사에 `시작/종료 시각(선택)`+`예상` 체크(시각 없으면 체크 비활성), 순서 검증(`종료 시각은 시작 시각보다 늦어야 합니다.`), `서버 초기화가 있는 게임`은 `[초기화 시각으로 종료]` 버튼·미리보기(00:00이면 종료일이 하루 앞당겨짐 안내, 단일 일정에서는 숨김), 게임 정보 모달에 `서버 초기화 시각 (KST, 선택)`, 사용자 일정 요청 모달에 같은 선택 시각 입력. 시각 키는 시각이 있거나 수정 대상이 원래 시각을 가졌을 때만 payload에 포함해 날짜만 쓰는 일정은 미적용 DB에서도 그대로 저장됨.
- **미적용 DB 폴백**: 시각 컬럼 쓰기가 `42703`/`PGRST204`로 거부되면 시각 키를 뺀 payload로 한 번 더 저장하고 `DB 업데이트(R85) 적용 전이라 시각 없이 저장함. 업데이트 후 시각을 저장할 수 있음.` 안내(관리자 일정·요청 모달), 게임 목록 조회는 `daily_reset_time` 오류 시 컬럼 없이 재조회, 게임 저장은 초기화 시각 없이 재시도 후 안내, 내 요청 카드는 전체 컬럼 → `is_rerun`만 → 둘 다 없이 3단계로 재조회(R33 `is_rerun` 표시 유지).
- **테스트**: 공용 함수 21건, 주차별 리스트 4건(새벽 종료 제외·경계 시각·기간·`D-Day`·시작 전 `진행 중` 제외), 선택일 상세 4건, 게임별 일정 모달 1건(고정 시각), 관리자 일정·게임 폼 10건(합성·예상 체크·순서 검증·초기화 버튼·00:00 경계·버튼 숨김·미적용 DB 폴백 3종·수정 시 지우기), 요청 모달 6건, 내 요청 카드 3건, 요청 승인 기간 표시 1건 추가함.
- **검증**: `git diff --check`, `tsc --noEmit`, `npm run lint` 통과, Vitest 71파일/950개 통과함. 실DB·실브라우저는 미확인(마이그레이션 적용 DB에서 입력·표시 확인 필요).
- **미구현·가정**: 설계 3.2의 "게임 정보에 `서버 초기화 05:00` 표시"는 Step 2 수용 기준 목록에 없어 `/admin` 게임 정보 모달·일정 폼 안내에만 쓰고 사용자용 게임별 일정 모달에는 표시하지 않음(사용자 화면 조회 컬럼 확장·폴백이 필요해 후속 판단). 화면이 열린 채 시각이 지나는 경우는 설계대로 주기 재계산 없이 렌더 시점 `new Date()`로 판정함. `isMissingScheduleTimeColumnError`는 컬럼명이 메시지에 있을 때만 폴백함(다른 컬럼 오류는 기존 문구 유지).
- **다음 단계**: Step 3(`Claude Opus`, Base `be4b43f` ↔ Target 통합 리뷰·🐳 로컬 DB 검증·`main` 병합·문서 마감) `▶ READY`임. 다른 PC에서 이어가려면 `git -C .worktrees/r85-schedule-times push -u origin collab/r85-schedule-times` 승인 필요함.

#### 📝 `r85-schedule-times` Step 3 완료 기록 (Claude Opus, 2026-11-21)

- **리뷰 범위·독립성**: Base `be4b43fd752a15185d584f035f9692d7181e064b` ↔ Target `48086cc101299340c3b982439afc22efd87efd85`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Gemini 4 Neon·Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: 마이그레이션 CHECK 11종·`approve_schedule_request` 본문이 `SCHEMA.sql`과 동일함(diff 0줄). 기존 `end_date >= start_date`·R84 알림 INSERT·예정 지출 트리거 조건 유지. UI는 날짜+시각을 한 입력에서 합성해 CHECK 위반 경로 없음, 시각 키는 사용 시에만 전송·`42703`/`PGRST204` 폴백, 조회는 `select("*")`·재조회로 미적용 DB 비차단. 달력 칸·예산 로직 미변경 확인함.
- **검증**: 🐳 로컬 Supabase 초기화 → Base `SCHEMA.sql` + 마이그레이션 2회 → `TESTS.sql` 41개 PASS·롤백 PASS. 초기화 → 신규 `SCHEMA.sql` → `TESTS.sql` 41개 PASS → 마이그레이션 재실행 무오류, README 확인 쿼리 9행·11행·`t|t|t|t`. 워크트리 tsc·lint·Vitest 71파일/950개·`next build` 통과, 병합 후 `main` tsc·Vitest 재통과함.
- **산출물**: `artifacts/r85-schedule-times/iteration-01/review.json`·`test.json`, `run.json` `target_sha` 갱신(`62b8b76`). 공식 검증 스크립트는 `jsonschema` 미설치로 미실행, Node 부분 검증기로 대조함.
- **남은 일 (사용자)**: 운영 DB 적용·확인 쿼리는 완료(2026-11-21). 실브라우저 입력·표시 확인만 남음. 후속 판단: 사용자용 게임별 일정 모달의 서버 초기화 시각 표시(설계 §3.2, 이번 범위 제외).
