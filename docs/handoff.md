# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **현재 활성 Run 없음** *(직전 `r39-daily-notifications` 완료·`main` 병합 `9ae05f9`, 2026-11-24. 다음 Run은 예약 요약표에서 사용자가 지목하면 Orchestrator가 등록함)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R39` | 완료 (`r39-daily-notifications`, `main` 병합 `9ae05f9`, 2026-11-24) | 운영 DB 마이그레이션 수동 적용·확인 쿼리·실브라우저 확인 대기(사용자). P4 후속 `R39-REV-01`(타입 전용) | `docs/to-do.md` R39 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료로 착수 가능(운영 DB R39 적용 후 권장). VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 완료 (`r97-tauri-notifications`, `main` 병합 `d350267`, 2026-11-23) | 엣지 케이스 보완 병합 및 `npm run tauri dev` 실기기 OS 토스트 수신 확인 완료(개발 실행 시 발신 앱 `Windows PowerShell` 표기). 선택 후속 `R97-REV-001`(P4)이 `docs/to-do.md`에 있음 | 아래 직전 완료 Run 기록 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r39-daily-notifications`

- **Run ID**: `r39-daily-notifications` **(완료, `main` 병합 `9ae05f9`, 2026-11-24)** *(`R39` 일일 정기 알림: `public.notification_settings` 테이블·RLS·탈퇴 정리 + KST 09:00 `pg_cron` `enqueue_daily_notifications()` 함수(관심 일정 시작 당일 `FAVORITE_START`·종료 D-1 `FAVORITE_END_D1`·예정 지출 결제 예정일 D-1 `EXPENSE_D1` 3종) + 설정 화면 알림 토글 UI)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-23 등록)* → Claude Opus *(Step 3 리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r39-daily-notifications` (브랜치: `collab/r39-daily-notifications`, 매니페스트: `artifacts/r39-daily-notifications/run.json`, 미삭제)
- **Base SHA**: `1af478baed61123977a05729f46e23768726f4a9`
- **Target SHA**: `afc9a21d3672314c829a3d491e649c81f848ffa2` *(iteration-01 리뷰 P4 1건 비차단, 산출물 `94e3abe`, `main` 병합 `9ae05f9`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`, `sql/SCHEMA.sql` — `pg_cron`·RLS·`SECURITY DEFINER`). Step 1·2의 `LOCAL_DB_DEFERRED`는 Step 3에서 🐳 로컬 DB 검증으로 해소함. **운영 DB 적용은 사용자 수동 적용 대기**.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 3d612eda7fc1596151b5b021a5d452656a2af5cc)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R39 DB/RLS/pg_cron & Types)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R39_DAILY_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 3d612ed`: `MIGRATION_R39_DAILY_NOTIFICATIONS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. `tsc`·`lint`·`diff-check`·Vitest 71파일/952개 통과. ⚠️ `LOCAL_DB_DEFERRED`(Docker 미설치, 아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: afc9a21)`** | **Claude Sonnet** *(Gemini 4 Hydrogen 1순위 대체, GitHub Copilot 2순위 대체)* | `Maker (설정 화면 알림 토글 UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/settings/page.test.tsx`, 필요 시 `src/components/settings/` 신규 컴포넌트·테스트, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ afc9a21`: 설정 화면 알림 설정 카드(3종 토글·부분 upsert·오프라인/미적용 폴백). tsc·lint·Vitest 960개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (산출물 94e3abe, main 병합 9ae05f9)`** | **Claude Opus** *(Gemini 4 Argon / Gemini 4 Neon 1순위 대체)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. Base(`1af478baed61123977a05729f46e23768726f4a9`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감 | 정적 리뷰 P4 1건(비차단). 🐳 업그레이드 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 42개 PASS, tsc·lint·Vitest 71파일/960개·`next build` 통과 후 `main` 병합 `9ae05f9` |

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

#### 📝 `r39-daily-notifications` Step 3 완료 기록 (Claude Opus, 2026-11-24)

- **리뷰 범위·독립성**: Base `1af478baed61123977a05729f46e23768726f4a9` ↔ Target `afc9a21d3672314c829a3d491e649c81f848ffa2`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과. 이 PC에 워크트리가 없어 `origin/collab/r39-daily-notifications`에서 다시 만듦. Maker(Gemini 4 Neon·Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (P4 1건, 비차단)**: 마이그레이션의 `enqueue_daily_notifications`·`purge_expired_account_deletion_requests` 본문이 `SCHEMA.sql`과 동일함(diff 0줄). `notifications` kind CHECK·부분 유니크 인덱스와 맞물리고, 제목·본문 길이 제한 안, 금액·메모 미포함 확인함. 설정 카드는 토글한 컬럼만 `upsert`해 `request_result`·`push_enabled`를 보존함. **R39-REV-01(P4)**: `database.types.ts` `notification_settings` `Update` 타입의 `user_id`만 필수로 되어 있음(타입 전용, 동작 영향 없음).
- **검증**: 🐳 초기화 → Base `SCHEMA.sql` + 마이그레이션 2회 → `TESTS.sql` 42개 PASS(R39 블록 포함)·롤백 PASS. 초기화 → 신규 `SCHEMA.sql` → `TESTS.sql` 42개 PASS → 마이그레이션 재실행 무오류. README 확인 쿼리 `notification_settings|t|4`·`f|t|t|f|f`·`1|t|0 0 * * *`. 워크트리 tsc·lint·Vitest 71파일/960개·`next build` 통과, 병합 후 `main` tsc·lint·Vitest 72파일/968개 재통과함(r97 의존성 `@tauri-apps/plugin-notification`이 이 PC에 미설치라 `npm install`로 lockfile 동기화 후 실행).
- **산출물**: `artifacts/r39-daily-notifications/iteration-01/review.json`(`findings`, P4 1건)·`test.json`(passed), `run.json` `target_sha` 갱신(`94e3abe`). 공식 검증 스크립트는 `jsonschema` 미설치로 미실행, Node 부분 검증기로 대조함.
- **남은 일 (사용자)**: 운영 DB에 `MIGRATION_R39_DAILY_NOTIFICATIONS.sql` 수동 적용(R84 선행) 후 `sql/README.md` B표 R39 확인 쿼리 실행, 실브라우저 설정 카드 확인, 다음 KST 09:00 알림 생성 확인.
