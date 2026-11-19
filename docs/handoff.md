# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(2026-11-19 `r84-feedback-and-inbox` 완료·`main` 병합 `660c3fc`. 운영 DB `MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용·확인 쿼리 및 실브라우저 확인 대기. 다음 착수 후보: `R39` 일일 알림, `R85` 일정 시간 단위, `R97` Tauri 알림)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R85` | 설계·결정 완료 · 구현 Run 예약 대기(🐳) | 일정 시각(`start_at`·`end_at`·예상 표시) + 게임별 서버 초기화 시각(`games.daily_reset_time`) | [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §10, `docs/to-do.md` R85 |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수 가능. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 결정 완료 · 4차 Run 예약 (`r97-tauri-notifications`) | `R84` 완료로 착수 가능. Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 + 앱 실행 중 새 알림 OS 네이티브 표시 (DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r84-feedback-and-inbox`

- **Run ID**: `r84-feedback-and-inbox` **(완료, `main` 병합 `660c3fc`, 2026-11-19 · 운영 DB 수동 마이그레이션·실브라우저 확인 대기)** *(`R84` 1차: 기타 건의 요청 창구 `feedback_requests` + `public.notifications` 테이블·30일 보관 `pg_cron` 정리·앱 내 알림함 상단 벨 UI + 건의 답변·요청 승인/반려 시 알림 행 원자적 생성)*
- **설계 기준**: [`docs/push-notification-research.md`](push-notification-research.md) §5.3·§8·§9 (`feedback_requests`·`notifications`·30일 보관 `pg_cron`·`mark_notifications_read`·`answer_feedback_request`·기존 6개 요청 승인/반려 RPC 알림 연동 + 건의 모달/내 요청 카드/관리자 대기열/상단바 알림 벨 UI)
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 등록)* · 마감 병합: Gemini 4 Neon *(2026-11-19)*
- **Worktree 경로**: `.worktrees/r84-feedback-and-inbox` (브랜치: `collab/r84-feedback-and-inbox`, 매니페스트: `artifacts/r84-feedback-and-inbox/run.json`, 미삭제·원격 미push)
- **Base SHA**: `ac71676bb8f4e0e737d97c26e21f35d7507296a1`
- **Target SHA**: `71824a21d01c7a115b9554186d46153032cf9fb4` *(iteration-03 최종 리뷰 통과, 산출물 `2cebdf5`, `main` 병합 `660c3fc`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`, `sql/SCHEMA.sql`). 🐳 로컬 DB 2회 멱등 적용 + 신규 `SCHEMA.sql` + `TESTS.sql` 40개 PASS 검증 완료.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 0b93975)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Hydrogen** *(1순위 대체)* | `Maker (DB/RLS/RPC & Types)` | `feedback_requests`·`notifications`·30일 정리 `pg_cron`·`mark_notifications_read`·`answer_feedback_request`·6개 요청 RPC 알림 연동·`SCHEMA.sql`·`README.md`·`TESTS.sql`·타입 반영. tsc·lint·Vitest 862개 통과 (로컬 DB 검증 Step 3 이관) |
| **2** | **`✅ DONE (SHA: d7eef7a)`** | **Claude Sonnet** | `Maker (UI & Vitest)` | 건의 모달·내 요청 카드·관리자 건의 대기열·상단바 알림 벨(`NotificationBell`) 구현 및 테스트 추가. tsc·lint·Vitest 892개 통과 |
| **2b** | **`✅ DONE (SHA: 0f8e188)`** | **Claude Opus** *(iteration-02 Maker)* | `Maker (iteration-02 Fixes)` | iteration-01 P3 2건·P4 3건 반영(`answer_feedback_request` PENDING 가드, 승인/반려 알림 `TESTS.sql`, `CLOSED` 문구, README 경고, KST 시각). tsc·lint·Vitest 893개 통과 |
| **3a** | **`✅ DONE (SHA: 71824a2)`** | ~~**GPT Codex**~~ ➡️ **Claude Opus** *(1순위 대체)* | `Maker (iteration-03: TESTS.sql)` | iteration-02 `R84-REV-06`~`09`(`TESTS.sql` R84 블록 테스트 코드 4건) 수정. 🐳 로컬 DB 마이그레이션 2회·`TESTS.sql` 40개 PASS, tsc·lint·Vitest 893개 통과 |
| **3** | **`✅ DONE (산출물 2cebdf5, main 병합 660c3fc)`** | ~~**Claude Opus**~~ ➡️ **Gemini 4 Neon** *(1순위 대체, 독립 리뷰)* | `Reviewer & Orchestrator` | Base `ac71676` ↔ Target `71824a2` 통합 정적 리뷰 **clean**(지적 0건). 🐳 로컬 DB 업그레이드(마이그레이션 2회)·신규 `SCHEMA.sql` 모두 `TESTS.sql` 40개 PASS, `main` 병합 `660c3fc` 및 병합 후 검증 통과 |

#### 📝 `r84-feedback-and-inbox` Step 3 iteration-03 완료 기록 (Gemini 4 Neon — Claude Opus 1순위 대체, 2026-11-19)

- **리뷰 범위·독립성**: Base `ac71676bb8f4e0e737d97c26e21f35d7507296a1` ↔ Target `71824a21d01c7a115b9554186d46153032cf9fb4`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과함. 이전 iteration Maker와 다른 모델(Gemini 4 Neon)로 독립 통합 리뷰 수행함.
- **정적 리뷰 결과 (`clean`, 지적 0건)**: `MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts`·UI 5종 및 테스트 전체 대조 완료. iteration-01(P3 2·P4 3)·iteration-02(`R84-REV-06`~`09`) 지적 사항 모두 해소 확인함.
- **산출물**: `artifacts/r84-feedback-and-inbox/iteration-03/review.json`·`test.json`, `run.json`(`target_sha` 갱신·`status: completed`) 워크트리 커밋 `2cebdf5`. 이 PC에 Python `jsonschema`가 없어 공식 검증 스크립트 대신 Node로 스키마 전체 규칙·SHA 일치를 검증함.
- **검증 (워크트리 Target `71824a2`)**: `git diff --check`·`tsc --noEmit`·`next lint`·Vitest 70파일/893개·`next build`(16개 정적 페이지, 플레이스홀더 env) 모두 통과함. 🐳 로컬 Supabase 초기화 후 ① Base `SCHEMA.sql`(`ac71676`) + R84 마이그레이션 **1·2회 멱등 적용** + `README.md` R84 확인 쿼리(RLS·권한·RPC 3종·`pg_cron` 잡) + `TESTS.sql` **40개 PASS·롤백 PASS**, ② 신규 Target `SCHEMA.sql` 직접 적용 + `TESTS.sql` **40개 PASS·롤백 PASS** 모두 통과함. 실브라우저 확인은 `skipped`.
- **병합·후속 검증**: `main`에 충돌 없이 병합(`660c3fc`, 23개 파일 변경). 병합 후 `main` 기준 `tsc --noEmit`·`next lint`·Vitest **70파일/895개** 통과함. 원격 `push` 및 워크트리/브랜치 삭제는 수행하지 않음(사용자 결정 대기).
- **사용자 수동 작업 남음**:
  1. 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 적용 후 `sql/README.md` B표 R84 확인 쿼리 검증.
  2. 실브라우저에서 건의 등록·내 요청 내역·관리자 답변/종료·상단바 알림 벨(배지·읽음·이동) 확인.

#### 📝 `r84-feedback-and-inbox` 이전 단계 요약 (Step 1~iteration-03 Maker)

- **Step 1 (`0b93975`, Gemini 4 Hydrogen)** · **Step 2 (`d7eef7a`, Claude Sonnet)**: DB/RLS/RPC/타입 및 건의·알림 UI/테스트 1차 구현.
- **iteration-01 리뷰 (`0429417`, Claude Opus)** → **iteration-02 Maker (`0f8e188`, Claude Opus)**: P3 2건(`answer_feedback_request` PENDING 가드, 승인/반려 알림 `TESTS.sql`)·P4 3건(`CLOSED` 제목, README 경고, KST 시각) 반영.
- **iteration-02 리뷰 (`eb6379c`, Claude Opus)** → **iteration-03 Maker (`71824a2`, Claude Opus)**: 로컬 DB에서 드러난 `TESTS.sql` R84 블록 테스트 코드 4건(`R84-REV-06`~`09`) 수정 및 40개 PASS 확인. 상세 기록은 각 커밋 및 `artifacts/r84-feedback-and-inbox/iteration-01~03/` 참조.
