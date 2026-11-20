# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run ID**: `r85-schedule-times` *(2026-11-21 등록 · `R85`: 일정 시각 `start_at`·`end_at`·예상 표시 + 게임별 서버 초기화 시각 `games.daily_reset_time` · 설계 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §4~§8, §10)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-21 등록)*
- **Worktree 경로**: `.worktrees/r85-schedule-times` (브랜치: `collab/r85-schedule-times`, 매니페스트: `artifacts/r85-schedule-times/run.json`)
- **Base SHA**: `be4b43fd752a15185d584f035f9692d7181e064b`
- **Target SHA**: `97a809f3f80006b375ffabbf0acb439f7fc4eb58` *(Step 1 DB/RLS/RPC & Types 커밋 기준, 미병합·원격 미push)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql` · 🐳 Docker Desktop 로컬 DB 업그레이드 2회 멱등 + 신규 `SCHEMA.sql` + `TESTS.sql` 41개 PASS 확인 완료).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 97a809f3f80006b375ffabbf0acb439f7fc4eb58)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R85 DB/RLS/RPC & Types)` | `.worktrees/r85-schedule-times`에서 아래 **Step 1 수용 기준** 수행(🐳 Docker Desktop 로컬 Supabase 검증 포함). 허용 파일: 신규 `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` | `✅ 97a809f`: `MIGRATION_R85_SCHEDULE_TIMES.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. 🐳 로컬 DB 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 41개 PASS, tsc·lint·Vitest 70파일/900개·diff-check 통과 (아래 Step 1 완료 기록 참고) |
| **2** | **`▶ READY`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R85 공용 로직·UI & Vitest)` | `.worktrees/r85-schedule-times`에서 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/lib/`(`calendar-utils.ts` 등 관련 유틸·테스트), `src/app/admin/page.tsx`·`requests/page.tsx` 및 테스트, `src/components/game/request-submission-modal.tsx` 및 테스트, `src/components/calendar/*`·`src/components/game/*`·`src/app/dashboard/page.tsx`·`games/page.tsx`·`src/app/page.tsx` 및 해당 테스트 | 대기 중 |
| **3** | **`⏳ WAITING`** | **Claude Opus** *(Fallback: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Base `be4b43f` ↔ Step 2 Target SHA 통합 정적 리뷰(`review.json`·`test.json`), 🐳 로컬 DB 업그레이드(2회 멱등)·신규 `SCHEMA.sql` + `TESTS.sql` 검증, `main` 병합 및 `docs/` 마감 | 대기 중 |

#### 📝 `r85-schedule-times` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-21)

- **Target SHA**: `97a809f3f80006b375ffabbf0acb439f7fc4eb58` (워크트리 브랜치 `collab/r85-schedule-times`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·RPC 변경**: `games.daily_reset_time TIME`(분 단위 CHECK·`anon` 조회 허용), `game_schedules`·`schedule_requests`의 `start_at`·`end_at TIMESTAMPTZ`·`start_at_estimated`·`end_at_estimated BOOLEAN` 및 CHECK 10종(KST 날짜 일치·순서·`date_trunc('minute', ..., 'UTC')` 분 단위·예상-시각 일치) 추가. `approve_schedule_request`가 신규 INSERT·대상 UPDATE 모두 시각·예상 플래그를 복사하도록 갱신(`sync_version_expenses_trigger` 및 R84 알림 INSERT 유지). `README.md` B표에 확인 쿼리 및 R84 선행/재실행 주의 문구 추가.
- **검증**: 🐳 로컬 Supabase 초기화 → Base `SCHEMA.sql`(`be4b43f`) + R85 마이그레이션 **1·2회차 멱등 적용** + `README.md` 확인 쿼리(컬럼 9행·제약 11행·`anon`/RPC 4종 `true`) + `TESTS.sql` **41개 PASS(R85 7종 시나리오+`anon` 조회 포함)·최종 rollback PASS**. 별도로 신규 Target `SCHEMA.sql` 직접 적용 + `TESTS.sql` **41개 PASS·롤백 PASS** 확인. 워크트리 `git diff --check`·`tsc --noEmit`·`next lint`·Vitest **70파일/900개** 모두 통과함.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 Step 2를 이어가려면 `git -C .worktrees/r85-schedule-times push -u origin collab/r85-schedule-times` 필요함.
- **다음 단계**: Step 2(`Claude Sonnet`, Fallback: `Gemini 4 Hydrogen` / `GitHub Copilot` — R85 공용 로직·UI & Vitest) `▶ READY`임.

#### 📌 `r85-schedule-times` 단계별 수용 기준 (Acceptance Criteria)

- **Step 1 (`GPT Codex` — DB/RLS/RPC & Types, 🐳 Docker 필요)**: 상세 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §4·§8
  1. `sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`(재실행 멱등) 및 `sql/SCHEMA.sql` 동기화: `game_schedules`·`schedule_requests`에 `start_at`/`end_at TIMESTAMPTZ NULL`, `start_at_estimated`/`end_at_estimated BOOLEAN NOT NULL DEFAULT FALSE` 및 일관성 CHECK(`date_trunc('minute', ...)` 초/밀리초 0, `(start_at AT TIME ZONE 'Asia/Seoul')::date = start_date` 등, 순서 CHECK, 플래그-시각 일치 CHECK) 추가.
  2. `games`에 `daily_reset_time TIME NULL` 및 분 단위 CHECK 추가(`anon`·`authenticated` 조회 허용).
  3. `approve_schedule_request`가 신규 INSERT·대상 일정 UPDATE 모두 `start_at`·`end_at`·두 플래그를 복사하도록 갱신(`sync_version_expenses_trigger`는 날짜 변경 시에만 동작 유지).
  4. `sql/README.md` B표 확인 쿼리 추가, `sql/tests/TESTS.sql` R85 스모크 테스트(§8 7종) 추가 및 🐳 로컬 Supabase 2회 멱등 적용·`TESTS.sql` PASS 확인, `src/types/database.types.ts` 갱신 후 `tsc --noEmit` 통과 및 워크트리 커밋.
- **Step 2 (`Claude Sonnet` — 공용 로직·UI & Vitest)**: 상세 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §5·§6·§8·§10
  1. 공용 함수(`formatSchedulePeriod`, `getScheduleStatus`, `getDdayLabel` 확장) 및 미적용 DB(`42703`/`PGRST204`) 비차단 폴백(조회 시 새 컬럼 제외 재조회, 저장 시 시각 제외 폴백 + 안내).
  2. 폼: `/admin` 일정 등록·수정(시작·종료 `시각(선택)`+`예상` 체크, `daily_reset_time` 있을 때 `[초기화 시각으로 종료]` 버튼 및 `00:00` 전날 `23:59` 안내, 순서 검증), `/admin` 게임 정보 모달(`서버 초기화 시각 (KST)`), 사용자 요청 모달(`request-submission-modal.tsx` 선택 시각 입력).
  3. 표시: 주차별 리스트(오늘 새벽 종료 제외·기간 문자열), 선택일 상세(오늘 이미 종료된 일정 `종료` 배지), 게임별 일정 모달(`진행 중`·`다음 예정` 구분), `/admin/requests`·내 요청 카드 기간 문자열 표시. 달력 칸(`desktop-calendar.tsx`, 모바일 달력 타일)은 미변경.
  4. §8 Vitest 케이스 추가 후 `tsc --noEmit`, `npm run lint`, `vitest run --dir src` 통과 및 워크트리 커밋.
- **Step 3 (`Claude Opus` — 통합 정적 리뷰·로컬 DB 검증·병합·마감)**:
  1. Base `be4b43f` ↔ Step 2 Target SHA 정적 리뷰(`review.json`·`test.json`), 🐳 로컬 DB 업그레이드(2회 멱등)·신규 `SCHEMA.sql` + `TESTS.sql` 통과 확인 후 `main` 병합 및 `docs/` 마감(`r98-character-icon-remove` 기록을 `docs/archive/handoff-archive.md`로 이동).

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

### 🗂️ 직전 완료 Run 기록: `r98-character-icon-remove`

- **Run ID**: `r98-character-icon-remove` **(완료, `main` 병합 `56c26ce`, 2026-11-21)** *(`R98`: 관리자 캐릭터 모달, 사용자 캐릭터 등록 요청 모달, 관리자 캐릭터 요청 대기열에 캐릭터 아바타/아이콘 이미지 제거 기능 추가)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-21 등록·리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r98-character-icon-remove` (브랜치: `collab/r98-character-icon-remove`, 매니페스트: `artifacts/r98-character-icon-remove/run.json`, 미삭제·원격 미push)
- **Base SHA**: `bc9e0265abee74b71c50d2886908395ec847ae4e`
- **Target SHA**: `342067dd49346e44bbaa228c2ea9ebe26f7c4e1f` *(iteration-01 리뷰 clean, 산출물 `bfdfb59`, `main` 병합 `56c26ce`)*
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 342067d)`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R98 캐릭터 이미지 제거 UI & 테스트)` | 관리자 캐릭터 모달·요청 모달·관리자 요청 대기열에 `이미지 제거` 추가 및 Vitest 5건 보강. tsc·lint·Vitest 70파일/900개 통과 |
| **2** | **`✅ DONE (산출물 bfdfb59, main 병합 56c26ce)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / GitHub Copilot)* | `Reviewer & Orchestrator` | Base `bc9e026` ↔ Target `342067d` 정적 리뷰 **clean**(지적 0건). tsc·lint·Vitest 70파일/900개·`next build`(16페이지) 통과 후 `main` 병합 `56c26ce` 및 병합 후 검증 통과 |

#### 📝 `r98-character-icon-remove` Step 2 완료 기록 (Gemini 4 Hydrogen, 2026-11-21)

- **리뷰 범위·독립성**: Base `bc9e0265abee74b71c50d2886908395ec847ae4e` ↔ Target `342067dd49346e44bbaa228c2ea9ebe26f7c4e1f`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: 6개 허용 파일 외 변경 없음. 일반/픽업 전용 캐릭터 `default_icon_url: null` 분기, 요청 모달 `null` 제출, 요청 대기열 교체 이미지 초기화 모두 수용 기준과 일치함.
- **산출물·검증**: `artifacts/r98-character-icon-remove/iteration-01/review.json`·`test.json`, `run.json` 갱신 후 워크트리 커밋 `bfdfb59` (이 PC Python에 `jsonschema` 모듈 미설치로 `json.load` + 스키마 수동 대조 검증). 워크트리 `tsc --noEmit`, `npm run lint`, Vitest 70파일/900개, `next build` 통과 후 `main` 병합(`56c26ce`), 병합 후 `main`에서 `tsc`·`lint`·Vitest 70파일/900개 재통과 확인함. 실브라우저 확인 및 워크트리/브랜치 정리는 사용자 선택 대기.
