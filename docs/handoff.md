# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **현재 활성 Run 없음** *(직전 `r85-schedule-times` 완료·`main` 병합 `6204346`, 2026-11-21. 다음 Run은 예약 요약표에서 사용자가 지목하면 Orchestrator가 등록함)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R39` | 결정 완료 · 2차 Run 예약 (`r39-daily-notifications`) | `R84` 완료 후 착수 가능. `notification_settings` + `pg_cron` 일일 알림(KST 09:00, 관심 일정 시작 당일·종료 D-1·예정 지출 결제일 D-1 3종) + 설정 화면 알림 토글 (DB 변경, 🐳 Docker 필요) | `docs/to-do.md` R39, [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 |
| `R96` | 결정 완료 · 3차 Run 예약 (`r96-web-push`) | `R39` 완료 후 착수. VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 홈 화면 안내 (DB·Edge Function 변경, 🐳 Docker 필요) | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §3·§4·§5.1·§8 |
| `R97` | 결정 완료 · 4차 Run 예약 (`r97-tauri-notifications`) | `R84` 완료로 착수 가능. Windows 데스크톱(Tauri v2) `@tauri-apps/plugin-notification` 연동 + 앱 실행 중 새 알림 OS 네이티브 표시 (DB 변경 없음) | `docs/to-do.md` R97, [`docs/push-notification-research.md`](push-notification-research.md) §3.3·§8 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r85-schedule-times`

- **Run ID**: `r85-schedule-times` **(완료, `main` 병합 `6204346`, 2026-11-21)** *(2026-11-21 등록 · `R85`: 일정 시각 `start_at`·`end_at`·예상 표시 + 게임별 서버 초기화 시각 `games.daily_reset_time` · 설계 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §4~§8, §10)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-21 등록)* → Claude Opus *(Step 3 리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r85-schedule-times` (브랜치: `collab/r85-schedule-times`, 매니페스트: `artifacts/r85-schedule-times/run.json`, 미삭제·원격 미push)
- **Base SHA**: `be4b43fd752a15185d584f035f9692d7181e064b`
- **Target SHA**: `48086cc101299340c3b982439afc22efd87efd85` *(iteration-01 리뷰 clean, 산출물 `62b8b76`, `main` 병합 `6204346`. Step 1 DB 커밋은 `97a809f`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R85_SCHEDULE_TIMES.sql`, `sql/SCHEMA.sql`). 🐳 Step 3 로컬 DB 재검증 통과. **운영 DB 적용은 사용자 수동 적용 대기**.

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
- **남은 일 (사용자)**: 운영 DB에 `MIGRATION_R85_SCHEDULE_TIMES.sql` 수동 적용 후 `sql/README.md` B표 R85 확인 쿼리 실행, 실브라우저 입력·표시 확인. 후속 판단: 사용자용 게임별 일정 모달의 서버 초기화 시각 표시(설계 §3.2, 이번 범위 제외).
