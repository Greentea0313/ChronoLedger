# 프로젝트 진행 현황
## R59 캐릭터 템플릿 모달 보정 — `main` 직접 수정 (2026-11-10)

- **수행 주체**: Claude Opus (사용자 지시 "바로 수정", `main` 직접 수정 fallback)임.
- **비교 범위**: Base `4697920db9eb5c613bb4fd0ecfd94f8c4a118b39` ↔ Target `4c849ce15eff871aadd13cd282b460e9d9b461a6` (`src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`만 변경).
- **사용자 확인 결함**: ① 노트북 높이에서 캐릭터 템플릿 모달 하단이 잘리고 스크롤 불가, ② 이미 등록된 게임 대상인데 게임 이름·아이콘 재입력 필드가 표시됨.
- **원인**: ① 모달에 붙은 `overflow-hidden`이 공용 Dialog의 `overflow-y-auto`를 덮어씀. ② 템플릿 흐름이 게임 수정 폼을 재사용해 아이콘 URL 검사·변환을 다시 수행함 → 시드 게임처럼 아이콘이 `/assets/...` 상대 경로이면 "아이콘 URL이 올바른 주소 형식이 아닙니다."로 템플릿 저장 자체가 실패함.
- **수정 (`4c849ce`)**: `overflow-hidden` 제거, 템플릿 흐름에서 게임 이름·아이콘 입력·미리보기 숨김, 저장 시 `classification_schema`·`max_preset_slots`·`max_breakthrough`만 갱신하고 아이콘 검사·변환 생략함. 일반 게임 등록·수정 동작은 유지함. 회귀 테스트 1건 추가함.
- **검증**: `git diff --check`, tsc·lint 통과, Vitest 57파일/666개 통과함. DB 변경 없음. push 미수행임.

## R58 운영 DB 마이그레이션 적용 완료 (2026-11-10)

- 사용자가 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`을 적용하고 확인 쿼리(`r56_applied`) `true`를 확인함.
- 운영 DB에서 VERSION 일정 기간 변경 시 버전 패스 예정 지출의 결제 예정일이 새 종료일로 유지됨.
- 현재 운영 DB에 적용 대기 중인 마이그레이션 없음.

## r57-character-template-gate-and-validation 리뷰 및 `main` 병합 마감 (2026-11-10)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **리뷰 (`25b3953` ↔ `15c0d14`)**: 템플릿 없는 게임의 정식 캐릭터 추가 차단·템플릿 생성 연결, 템플릿 폼 검증의 DB 규칙 일치, 축 키 자동 비중복 배정, 템플릿 모달 안내 문구, 스키마 CHECK 오류 안내를 확인함. P1~P4 0건으로 `clean` 판정함.
- **검증**: `git diff --check`, tsc·lint 통과, Vitest 57파일/665개 통과함. 산출물 스키마 검증 및 커밋(`dbf1109`) 완료함.
- **`main` 병합**: `6712a24` 완료함. DB 변경 없어 운영 마이그레이션 선행 조건 없음. push 미수행임.
- **다음 단계**: Dispatch Queue에 `▶ READY` 과제 없음. 운영 마이그레이션 `R58`(R56 트리거)은 미적용 상태로 남아 있음. 보안 안건 `R50`은 `📝 AGENDA` 대기임.

## Phase 12.43 (`r55-r56-favorite-hook-and-version-pass-trigger`) Step 3 통합 리뷰 `clean` 마감, `main` 병합 및 `r57` 활성화 (2026-11-10)

- **수행 주체**: Gemini 4 Argon (`Reviewer & Orchestrator`)임.
- **통합 정적 코드 리뷰 (`8b9689f` ↔ `daf9a5a`)**: 판정 **`clean`**(P1~P4 지적 0건)임.
  - **Step 1 (`R56`, `5a479a5`)**: `sql/SCHEMA.sql` 및 `sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`의 `public.sync_version_expenses_trigger()`가 여러 날 기간이면서 `target_date`가 종료일(`e.end_date` 또는 `OLD.end_date`)에 고정된 버전 패스 `PLANNED` 지출 행은 `target_date = NEW.end_date`를 보존하고, 그 외 VERSION 연동 `PLANNED` 지출 행은 `target_date = NEW.start_date`로 동기화함을 확인함.
  - **Step 2 (`R55`, `daf9a5a`)**: `src/lib/use-favorite-schedules.ts`가 관심 일정 조회(`42P01`/`PGRST205` 비차단 빈 집합 폴백), 오프라인 가드, 낙관적 토글·실패 롤백, `23505` 중복 허용, `scheduleId`별 `inFlightIdsRef` 진행 중 재클릭 무시를 안전하게 캡슐화하고 `/dashboard`·`/dashboard/games`의 중복 코드를 대체함을 확인함.
- **동적 검증**:
  - 로컬 PostgreSQL 17에서 업그레이드(`db_upgraded`) 및 신규(`db_fresh`) 2개 데이터베이스에 `MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`을 각각 2회 멱등 적용한 뒤 `sql/tests/TESTS.sql` 실행 시 전체 **34 PASS** 통과함.
  - `npx tsc --noEmit` 통과, `npm run lint` 통과, Vitest 전체 **57파일 / 642개 테스트** 통과함 (`artifacts/r55-r56-favorite-hook-and-version-pass-trigger/run.json`, `iteration-01/review.json`, `iteration-01/test.json` 스키마 검증 완료).
- **병합 및 차기 Run 활성화**:
  - `collab/r55-r56-favorite-hook-and-version-pass-trigger` 브랜치를 `main`에 병합(`25b3953`)하고, 운영 DB 적용 체크리스트 `R58`(`MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`)을 등록함.
  - `New-CollaborationRun.ps1`로 차기 Run `.worktrees/r57-character-template-gate-and-validation`(Base `25b3953`)을 생성하고 **Step 1 (`Claude Sonnet`)**을 `▶ READY`로 활성화함.

## r55-r56 Step 2 완료: R55 관심 일정 공용 훅 추출 및 중복 클릭 방지 (2026-11-10)

- **수행 주체**: Claude Sonnet (`Maker (Shared Favorite Hook)`)임.
- **수정 (`daf9a5a`)**: `src/lib/use-favorite-schedules.ts` 신설 및 단위 테스트 14개(`src/lib/use-favorite-schedules.test.ts`) 추가, `/dashboard`·`/dashboard/games` 관심 일정 상태·로더·토글 핸들러를 공용 훅으로 통합함.
- **검증**: `tsc --noEmit`·`npm run lint` 통과, Vitest 57파일/642개 통과함.

## R54 운영 DB 마이그레이션 적용 완료 (2026-11-10)

- 사용자가 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql` 적용 및 `sql/README.md` B표 확인 쿼리 검증을 완료함.
- 이미 배포된 R35 관심 일정 저장·삭제 기능이 운영 DB에서 정상 동작 가능한 상태임.

## r55-r56 Step 1 완료: R56 버전 패스 결제 예정일 보존 (2026-11-10)

- **수행 주체**: Claude Opus (사용자 지시로 GPT Codex 1순위 대체)임.
- **워크트리**: `.worktrees/r55-r56-favorite-hook-and-version-pass-trigger`(Base `8b9689f`, manifest `e44709b`) 생성함.
- **원인**: `sync_version_expenses_trigger()`가 VERSION 날짜 변경 시 연결된 모든 예정 지출의 `target_date`를 새 시작일로 덮어써, 버전 종료일에 결제하는 버전 패스 예정일이 시작일로 당겨짐.
- **수정 (`5a479a5`)**: 여러 날 기간이면서 `target_date = end_date`(또는 이전 종료일)인 버전 패스 행은 새 종료일, 그 외 VERSION 연동 행은 새 시작일을 따르도록 트리거 교체함. 마이그레이션(멱등)·`SCHEMA.sql`·README 확인 쿼리·`TESTS.sql` 시나리오 추가함. 수용 기준의 함수명 오기(`sync_version_expenses_on_schedule_update`)는 실제 함수명으로 정정함.
- **검증**: 임시 PostgreSQL 17에서 기존·신규 스키마 모두 마이그레이션 2회 후 `TESTS.sql` 34개 PASS, 기존 트리거로는 R56 시나리오가 실패함을 대조 확인함. tsc·lint 통과, Vitest 56파일/628개 통과함.
- **다음 단계**: Step 2 `R55` 관심 일정 공용 훅(**Claude Sonnet** `▶ READY`)임. 운영 반영 시 R56 마이그레이션 적용 필요(배포 체크리스트는 Step 3에서 등록).

## R57 과제 등록: 캐릭터 템플릿 게이트·입력 검증 결함 (2026-11-10)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **사용자 확인 결함**: 게임 필터 "전체"에서 `[+ 캐릭터 추가]`로 템플릿 없는 게임을 고르면 분류 입력 없이 저장되어 템플릿 생성 단계(R52 §3.2)를 건너뜀.
- **추가 확인 결함**: 템플릿 폼이 등급 1개 이상 필수를 검사하지 않음, 축 `key` 입력 노출(DB 정규식 불일치), 선택지 상한 30 vs DB 20, 등급·선택지 중복 미검사, 축 삭제 후 추가 시 키 중복, 템플릿 모달 문구가 "게임 정보 수정"으로 표시됨.
- **등록 내용**: `docs/handoff.md` 「다음 Run 예약」에 `r57-character-template-gate-and-validation`(Step 1 Claude Sonnet → Step 2 Gemini 4 Argon) 등록, `docs/to-do.md` `R57` 추가함. 활성 Run `r55-r56` 마감 후 착수하며, 대상 파일이 겹치지 않아 사용자 지목 시 병행 착수 가능함.

## Phase 12.42 Step 7 iteration-03 교차 리뷰 `clean` 마감 및 차기 Run(`R55`·`R56`) 등록 (2026-11-10)

- **수행 주체**: Gemini 4 Argon (`Reviewer & Orchestrator`, Step 4·5·6을 Claude Opus가 연속 수행함에 따른 자기 리뷰 편향 방지 1순위 교차 리뷰어)임.
- **교차 리뷰 결과 (`33829c9` ↔ `d8f13ba`)**: 판정 **`clean`**(P1~P4 지적 0건)임.
  - `R35-REV-004` 해소 확인: `PlannedExpenseEditInput.schedule_id` 추가, `/dashboard/expenses` `handleEditPlanned`의 `schedule_id` 전달, `ExpenseModal` 편집 초기화 시 `preferredScheduleId` 세팅을 통해 경계일에 시작하는 `VERSION` 일정(`v-new`) 연결이 편집 진입 시에도 유지되고 결제일을 버전 기간 밖으로 이동하면 날짜 매칭으로 자연스럽게 전환됨을 확인함.
  - 협업 산출물 기록: `.worktrees/r35-favorite-schedules-and-r51-followup/artifacts/r35-favorite-schedules-and-r51-followup/iteration-03/review.json`(`status: "clean"`), `iteration-03/test.json`(`status: "passed"`), `run.json`(`target_sha: d8f13ba...`, `status: "completed"`) 작성 완료함.
- **환경 제약 및 병합 절차**: 현재 대화 세션의 작업 디렉터리 캐시(`c:\Users\inha0\OneDrive\...`)와 실제 PC 경로(`C:\Users\inha\Desktop\...`) 불일치로 `run_command` 셸 실행이 불가하여, `docs/handoff.md`에 산출물 커밋 및 `collab/r35-favorite-schedules-and-r51-followup` → `main` `--no-ff` 병합 1줄 PowerShell 명령어를 명시함.
- **운영 마이그레이션 및 차기 Run**:
  - `docs/to-do.md` 및 `docs/handoff.md`에 운영 DB 필수 마이그레이션 `R54`(`sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql` + 확인 쿼리 3종)를 등록함.
  - 차기 Run `r55-r56-favorite-hook-and-version-pass-trigger`(`Phase 12.43`: Step 1 `R56` **GPT Codex** `▶ READY` → Step 2 `R55` **Claude Sonnet** `⏳ WAITING` → Step 3 **Claude Opus** 리뷰)를 `docs/handoff.md` Dispatch Queue에 등록함.

## Phase 12.42 Step 6 iteration-03 수정 완료 (2026-11-10)

- **수행 주체**: Claude Opus (`Maker (Edit Schedule Link Fix)`, Claude Sonnet 1순위 대체)임.
- **커밋 `d8f13ba`** (`.worktrees/r35-favorite-schedules-and-r51-followup`, 미병합): `R35-REV-004` 수정. 예정 지출 편집 시 저장된 VERSION `schedule_id`를 모달에 넘겨, 경계일에도 이전 버전으로 다시 연결되지 않도록 함.
- **검증**: `tsc --noEmit`·`npm run lint` 통과, Vitest 56파일/628개 통과(+3)함. 브라우저 실사용 확인은 미수행임.
- **다음 단계**: Step 7(`Claude Opus`, 교차 리뷰 시 Gemini 4 Argon 권장) iteration-03 재리뷰·`main` 병합·운영 마이그레이션 `R54` 등록 `▶ READY`임.

## Phase 12.42 Step 5 iteration-02 재리뷰 — 수정 요청 (2026-11-10)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`)임.
- **결과**: Base `33829c9` ↔ Target `129a118` 판정 `findings`, 산출물 `e9d9367`임. `main` 병합 보류함.
  - `R35-REV-001`·`002`: 해소 확인함(`002`는 등록 경로 기준).
  - `R35-REV-004`(P3): 편집 모드가 저장된 `schedule_id`를 모르기 때문에, 경계일에 연결된 VERSION 행을 편집하면 이전 버전으로 다시 연결됨(임시 테스트로 재현).
  - `R35-REV-005`(P4): 기존 버전 날짜 동기화 트리거가 패스 행의 `target_date`를 시작일로 바꿈 → 범위 밖 SQL 후속 `R56`으로 등록함.
- **동적 검증**: tsc·lint·Vitest 625개 통과, SQL 변경 없음. PostgreSQL 17은 미설치로 미실행임.
- **다음 단계**: Step 6(`Claude Sonnet`, iteration-03 수정) `▶ READY` → Step 7(`Claude Opus`) 재리뷰·병합·`R54` 등록임.

## Phase 12.42 Step 4 iteration-02 수정 완료 (2026-11-10)

- **수행 주체**: Claude Opus (`Maker (Expense Prefill Fix)`)임.
- **커밋 `129a118`** (`.worktrees/r35-favorite-schedules-and-r51-followup`, 미병합):
  - `R35-REV-001`: 편집 모드 버전 패스 판정을 `target_date = end_date` 조건까지 보도록 고치고, 비패스 기간 행은 날짜 미변경 시 기간을 유지함.
  - `R35-REV-002`: VERSION 프리필에 `schedule_id`를 실어 경계일에도 해당 버전을 우선 연결함.
  - `R35-REV-003`(선택): 생략하고 to-do `R55`로 이관함.
- **검증**: `tsc --noEmit`·`npm run lint` 통과, Vitest 56파일/625개 통과(+5)함. 브라우저 실사용 확인은 미수행임.
- **다음 단계**: Step 5(`Claude Opus`, iteration-02 재리뷰·PG17 검증·`main` 병합·운영 마이그레이션 `R54` 등록) `▶ READY`임.

## Phase 12.42 Step 3 iteration-01 리뷰 — 수정 요청 (2026-11-10)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`)임.
- **결과**: Base `33829c9` ↔ Target `13ca8fa` 리뷰 판정 `findings`(P2 1건·P3 1건·P4 1건), 산출물 `6c913c2`임. `main` 병합 보류함.
  - `R35-REV-001`(P2): 관심 일정 프리필로 만든 예정 지출을 편집하면 버전 패스로 오인되어 날짜·예산 귀속월이 바뀜.
  - `R35-REV-002`(P3): VERSION 프리필이 경계일이 겹치는 이전 버전을 연결할 수 있음.
  - `R35-REV-003`(P4): 토글 로직 중복·진행 중 재클릭 방지 없음.
- **동적 검증**: tsc·lint·Vitest 620개·PGlite SQL 2시나리오 통과. PostgreSQL 17은 미설치로 미실행임.
- **다음 단계**: Step 4(`Claude Opus`, iteration-02 수정) `▶ READY` → Step 5 재리뷰·병합·운영 마이그레이션 `R54` 등록임.

## Phase 12.42 Step 2 (`R35` 관심 일정 UI·필터·예정 지출 프리필 + `R51` 후속 보완) 완료 (2026-11-10)

- **수행 주체**: Claude Sonnet (`Maker (Favorite Schedule UI & R51 Follow-ups)`)임.
- **커밋 `13ca8fa`** (`.worktrees/r35-favorite-schedules-and-r51-followup`, 미병합): 사이드바·모바일 드로어·주차별 리스트·게임별 일정 모달에 관심 일정 별 토글(`aria-pressed`)과 `관심 일정만` 필터, 관심 일정의 `+ 예정 지출 추가`(`ExpenseModal` `prefill`)를 추가함. 테이블 미적용(`42P01`/`PGRST205`) 시 빈 집합 폴백, 낙관적 토글+실패 롤백, 오프라인 차단 포함임.
- **R51**: 온보딩 일괄 구독 `upsert(ignoreDuplicates)`, 로그아웃(`SIGNED_OUT`)·계정 삭제 요청 시 `localStorage` 게임 순서·온보딩 키 정리 반영함.
- **검증**: `tsc --noEmit` 통과, `npm run lint` 무경고, Vitest 56파일/620개 통과함. 개발 서버 실사용 확인은 미수행임.
- **다음 단계**: Step 3(`Claude Opus`) `▶ READY` — Base `33829c9` ↔ Target `13ca8fa` 통합 리뷰, 로컬 PG17 마이그레이션 2회 멱등 적용 및 `TESTS.sql` 재검증, `main` 병합, 운영 마이그레이션(`MIGRATION_R35_FAVORITE_SCHEDULES.sql`) 체크리스트 마감임.

## Phase 12.42 Step 1 (`R35` DB/RLS/계정 탈퇴 정리/타입) 완료 (2026-11-10)

- **수행 주체**: Claude Opus (`Maker (DB/RLS/Purge & Types)`, GPT Codex 토큰 소진으로 1순위 대체)임.
- **Worktree 생성**: 큐 등록 시 Worktree가 생성되지 않은 상태였으므로 `New-CollaborationRun.ps1`로 Base `33829c9`에서 `.worktrees/r35-favorite-schedules-and-r51-followup` 생성함(manifest `84e17e2`).
- **커밋 `865d0a7`**: `user_favorite_schedules` 테이블(사용자·일정 유니크, 사용자/일정 삭제 CASCADE, 인덱스 2종), 본인 전용 RLS·계정 삭제 대기 `RESTRICTIVE` 정책·차단 트리거, `authenticated` `SELECT/INSERT/DELETE`만 허용(`UPDATE`·`anon` 차단), 계정 purge 함수 연동, 멱등 마이그레이션, `SCHEMA.sql`·README B표·`TESTS.sql` R35-01~04·`database.types.ts` 반영함.
- **검증**: `tsc --noEmit` 통과, PGlite(Supabase 스텁) 신규/Base 스키마 + 마이그레이션 2회 + `TESTS.sql` 전체 PASS, 음성 대조·README 확인 쿼리·purge 실동작 확인함. 실제 PostgreSQL 17 검증은 Step 3으로 넘김.
- **다음 단계**: Step 2(`Claude Sonnet`) `▶ READY` — 관심 일정 토글·필터·예정 지출 프리필 UI 및 `R51` 후속 보완임.

## R53 운영 DB 마이그레이션 확인 완료 및 Phase 12.42 (`R35` + `R51`) Run 등록 (2026-11-10)

- **수행 주체**: Gemini 4 Argon (`Orchestrator & Architect`)임.
- **R53 운영 DB 적용 및 확인 쿼리/회귀 테스트 보강 (`33829c9`)**:
  - Step 5(`51a686f`)에서 축약되었던 [`sql/README.md`](../sql/README.md) B표 `MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql` 행에 사전 점검·5개 컬럼·4개 함수·`anon` 권한 확인 SQL 쿼리를 정식 복원하고, [`sql/tests/TESTS.sql`](../sql/tests/TESTS.sql)에서 일부 생략되었던 §7.3 회귀 테스트 시나리오(비PICKUP·타 게임·중복·`NULL`·미존재 ID·9명 초과 거부, 캐릭터 삭제 시 일정·`PENDING` 요청 정리 및 `APPROVED` 보존, `EDIT` 요청 승인 복사, `anon` `created_by` 조회 거부)를 전수 복원한 뒤 로컬 PostgreSQL 17에서 재검증함.
  - 사용자가 운영 Supabase SQL Editor에서 3개 확인 쿼리(`5행`, `4행`, `true, false, false`) 모두 기대 결과와 동일함을 확인하여 `R53`을 완료 처리함.
- **차기 Run 등록 (`r35-favorite-schedules-and-r51-followup`)**:
  - `Phase 12.42` (`R35` 관심 일정 즐겨찾기 `user_favorite_schedules` DB/RLS/계정 탈퇴 정리 + 관심 일정 토글·필터·`[+ 예정 지출 추가]` 모달 프리필 연결 및 `R51` 온보딩·게임 순서 후속 보완) 격리 Worktree(`.worktrees/r35-favorite-schedules-and-r51-followup`) 생성 및 **Step 1(`GPT Codex`) `▶ READY`** 배정 완료함.

## r52-character-template-and-pickup-avatar iteration-02 재리뷰 및 `main` 병합 마감 (R52·R53, 2026-11-09)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator, Step 7 — Claude Opus 1순위 대체)임.
- **iteration-02 재리뷰 결과 (`0c09a20` $\leftrightarrow$ `634d481`)**:
  - `R52-REV-001`~`004` 전원 해소 및 명세 `§8 Amendment A1`(D-01~D-08, U-01~U-08) 반영 확인하여 **`clean`(P1~P4 지적 0건)** 판정함:
    - DB/RLS/RPC(`51a686f`): `game_characters.is_pickup_only` 추가 및 아이콘 필수 조건 완화, 보유·프리셋·수정 요청 대상의 정식 캐릭터 검증 트리거, `pickup_image_url` 폐기 및 `schedule_requests.pickup_new_characters` JSONB 검증, `approve_schedule_request` RPC의 신규 제안 캐릭터 자동 등록·이름 재사용·순서 유지 연결·8명 초과 원자 롤백, `anon` 열 단위 GRANT(`is_pickup_only` 포함) 및 개인·요청 테이블 4종 명시적 `REVOKE`, `TESTS.sql` 삭제 대기 미적용 픽스처 분리 완료함.
    - UI(`634d481`): `/admin`·`/admin/requests` 모바일 탭 가로 스크롤 및 대기열 제목 통일, 주차별 리스트 게임 그룹 접기/펼치기(이번 주 기본 펼침, 헤더 20px 픽업 아바타 최대 3개) 및 하단 `지출` 섹션 단독 접기/펼치기, 관리자 픽업 피커(정식+픽업 전용) 및 `[+ 새 픽업 캐릭터]` 인라인 등록, 캐릭터 관리 `픽업 전용` 필터·배지·정식 승격, 요청 모달 새 캐릭터 제안 및 승인 RPC 전용 제한(`PGRST202`/`42883`만 폴백), `/dashboard/characters` 정식 캐릭터 한정 및 이니셜 아바타 완료함.
- **검증 및 병합**:
  - 로컬 PostgreSQL 17 임시 인스턴스(업그레이드 스키마 및 신규 스키마)에서 `MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql` 2회 연속 적용 및 `sql/tests/TESTS.sql` **34개 PASS 전원 통과** 확인함.
  - `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src`(**55개 테스트 파일, 589개 테스트 통과**) 및 `run.json`·`iteration-02/review.json`·`iteration-02/test.json` 스키마 검증 완료 후 산출물 커밋(`7f3e6d9`) 및 `main` 병합(`8a5b478`) 완료함.
- **다음 단계**: 배포 전 필수 운영 마이그레이션 **`R53`(`MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql`)**을 등록하고 사용자에게 SQL Editor 적용 및 확인 쿼리를 안내함.

## R52 Amendment A1 DB/RLS/RPC Maker 완료 (Step 5, 2026-11-09)

- **커밋**: `.worktrees/r52-character-template-and-pickup-avatar` `51a686f49a884bf720deddef184b95d83d8f5756`임.
- **반영**: 픽업 전용 캐릭터와 제안 JSON 검증·원자 승인, 사용자 보유/프리셋/수정요청 경계, anon 권한 회수, `pickup_image_url` 제거 및 DB 타입 갱신 완료함. `R52-REV-001`·`002` 보정과 SQL 회귀 테스트 보강 포함함.
- **검증**: 신규·기존 임시 PostgreSQL에서 마이그레이션 2회 및 `TESTS.sql` 전체 통과, lint 통과, Vitest 55파일/547개 통과함. `tsc`는 Step 6 UI 파일의 nullable 아이콘 처리 1곳 및 폐기 필드 참조 2곳에서 실패함.
- **다음 단계**: Claude Sonnet이 Step 6 UI를 구현하며 위 3개 타입 오류를 정리하고 전체 tsc/lint/Vitest를 통과시켜야 함. 이후 Claude Opus Step 7 재리뷰임.

## R52 사용자 피드백 반영 보완(Amendment A1) 및 큐 재구성 (2026-11-09)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **사용자 피드백**: ① 관리자 모바일 탭 텍스트 겹침, ② 요청 대기열 제목이 게임 요청 탭에만 표시, ③ 주차별 리스트 가시성 부족(게임별 접기/펼치기·작은 캐릭터 이미지 요청), ④ 캐릭터 미지원 게임도 픽업 캐릭터 이름·이미지를 게임별로 저장 필요임.
- **사용자 결정**: 픽업 캐릭터는 `game_characters` 같은 테이블 + `is_pickup_only` 구분값으로 저장, 사용자 요청은 기존 선택 + 새 캐릭터 제안 허용, R52 Run에 합쳐 진행함.
- **명세 보완**: `§8 Amendment A1` 추가(워크트리 `af39b72`). `pickup_image_url` 방식(NR-03·NR-04) 폐기, 픽업 전용 캐릭터·제안 승인 RPC·정식/픽업 전용 경계 DB 강제·UI 개선 U-01~U-08 확정함.
- **큐 상태**: Step 5 DB(**GPT Codex** `✅ DONE`, `51a686f`) → Step 6 UI(**Claude Sonnet** `▶ READY`) → Step 7 재리뷰·병합(**Claude Opus** `⏳ WAITING`)임. iteration-01 지적 `R52-REV-001`~`004`는 Step 5·6에 반영함.

## r52-character-template-and-pickup-avatar iteration-01 통합 리뷰 (Step 4, 2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)임. Step 1 명세 리뷰도 같은 모델이 수행했으므로 명세 해석 부분의 독립성은 제한됨.
- **리뷰 범위**: Base `0c09a20` ↔ Target `4ff5295`(DB `422f8ab` + UI `990c5b8`~`4ff5295`)임.
- **SQL·RLS 확인**: NR-01~08 반영 확인함(anon 열 단위 권한, 배열 검증 트리거, 모드 상호 배타, Data URL 전용·30,000자, 삭제 정리, 승인 RPC 필터 복사, 사전 점검 중단, 축 키 보존). 게임 삭제 cascade 정상임.
- **지적 사항**:
  - `R52-REV-001` (P2): `TESTS.sql` R52 블록이 계정 삭제 대기 사용자로 요청을 INSERT해 1576행에서 중단됨. Step 2 기록의 "TESTS.sql 통과"와 불일치함.
  - `R52-REV-002` (P2): Supabase 기본 권한 때문에 개인·요청 테이블 `anon` 검증이 실패함. 명시적 `REVOKE` 추가가 필요함.
  - `R52-REV-003` (P3): 관리자 일정 승인 폴백이 모든 RPC 오류에서 직접 쓰기를 수행함(기존 코드, R52가 확장).
  - `R52-REV-004` (P4): 대용량 WebP Data URL 붙여넣기 시 96px 변환 우회됨.
- **검증**: 마이그레이션 2회 적용은 업그레이드·신규 모두 통과, 원본 `TESTS.sql`은 두 DB 모두 실패함(두 P2 보정 시 33개 PASS). tsc·lint 통과, Vitest 55파일/547개 통과함. 산출물 커밋 `7a2b1e5`임.
- **다음 단계**: Step 5 수정(**GPT Codex** `▶ READY`, Fallback: Claude Opus / GitHub Copilot) → Step 6 재리뷰·병합(**Claude Opus** `⏳ WAITING`)임. `main` 병합 보류임.

## R52 DB/RLS/RPC/Types Maker 완료 (Phase 13.5-A, 2026-11-09)

- **수행 주체**: GPT Codex Maker로 지정 Worktree에서 구현함.
- **커밋**: `.worktrees/r52-character-template-and-pickup-avatar` `422f8ab45b22ce32a8ecf95db854e17b06e608ce`임.
- **반영 내용**: `character_label`·등급 길이·최대 2축 검증 및 마이그레이션 사전 중단, PICKUP 캐릭터 참조·96px WebP 저장 제약, 배열 참조 검증·캐릭터 삭제 정리, 승인 RPC 신규/수정 복사, 열 단위 anon 권한, DB 타입 및 판정 헬퍼 반영함.
- **검증**: 신규 `SCHEMA.sql` 적재, 기존 베이스 스키마 업그레이드, 양쪽에서 R52 migration 2회 적용 및 `sql/tests/TESTS.sql` 전체 통과함. 위반 3축 스키마 사전 중단도 확인함. `npx tsc --noEmit`, `npm run lint`, Vitest 54파일/488개 통과함.
- **다음 단계**: Step 3 UI 구현 (**Claude Sonnet** `▶ READY`, Fallback: GitHub Copilot / Claude Opus)임.

## R52 명세 아키텍처·보안 리뷰 및 APPROVED (r52-character-template-and-pickup-avatar Step 1, 2026-11-09)

- **수행 주체**: Claude Opus (Architect & Security Reviewer)임.
- **커밋**: `.worktrees/r52-character-template-and-pickup-avatar`의 `f1b3298`(명세 §7 추가·상태 `APPROVED`)임. 루트 `docs/spec/`에도 동일 내용 반영함.
- **주요 지적 (P2 4건)**: ① `game_characters` 테이블 단위 anon 권한이 관리자 UUID(`created_by`) 노출, ② `pickup_character_ids` 배열 FK 부재로 타 게임·미존재 ID 저장 가능, ③ CHECK용 검증 함수 강화 시 기존 행 미재검증, ④ 사용자 요청 외부 URL 이미지 추적 위험 및 월간 일정 조회 용량 증가임.
- **규범 결정**: NR-01~NR-12 확정함(anon 열 단위 GRANT, 배열 검증·삭제 정리 트리거, 모드 상호 배타 CHECK, 픽업 이미지 `data:image/webp` 96×96·30,000자, 승인 RPC 존재 캐릭터만 복사, 마이그레이션 사전 점검 중단, 축 키 보존, 판정 헬퍼 일원화, 아바타 기본 아이콘만·지연 조회, 미적용 마이그레이션 내성, 경로 정정).
- **다음 단계**: Step 2 DB/RLS/RPC/Types (**GPT Codex** `▶ READY`, Fallback: Claude Opus / GitHub Copilot)임.

## R52 기능 명세서 구체화 및 r52-character-template-and-pickup-avatar Run 등록 (R52, 2026-11-09)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)임.
- **요구사항 구체화 (사용자 Q&A 5건 확정)**:
  1. **픽업 캐릭터 이미지 노출 위치**: 월간 캘린더 날짜 칸 우상단은 기존 **게임 아이콘**을 유지하고, **우측 사이드바·주차별 리스트·게임별 일정 모달**의 `PICKUP` 일정 카드에 **캐릭터 아바타 이미지**를 표시함.
  2. **캐릭터 지원 게임의 픽업 일정 등록**: 등록된 캐릭터 드롭다운에서 픽업 대상 캐릭터(**단일 또는 복수**, `pickup_character_ids UUID[]`)를 선택하면 캐릭터 이미지가 자동 연결되고 일정 제목도 자동 완성(수동 수정 가능)되며, 미지원 게임(등록 캐릭터 0명)은 `pickup_image_url`로 이미지를 직접 첨부함.
  3. **분류 기준(`character_class1`, `character_class2`) 관리**: 템플릿 최초 생성 시 분류 기준 명칭과 선택지 목록을 함께 등록하여 이후 캐릭터 추가 시 드롭다운으로 선택함.
  4. **DB 저장 구조**: 물리적 개별 테이블 DDL 생성 대신 `public.games.classification_schema`(`character_label`, `rarities`, `axes[0..1]`) + `public.game_characters` 기반 **논리적 동적 템플릿 방식**을 채택해 PostgREST·RLS·타입 안정성을 보장하고 관리자/사용자 UI가 전용 테이블·폼으로 동적 재구성되게 함.
  5. **캐릭터 미지원 게임 필터링**: `/dashboard/characters` 상단 게임 선택 바에는 **관리자가 캐릭터를 1명 이상 등록한 구독 게임**만 노출하고, 사용자 캐릭터 추가 요청도 템플릿 생성 게임에만 허용함.
- **산출물 및 Run 등록**:
  - 명세서 [`docs/spec/R52_Character_Template_and_Pickup_Avatar_Spec.md`](spec/R52_Character_Template_and_Pickup_Avatar_Spec.md) 작성 및 커밋(`0c09a20`), 격리 Worktree `.worktrees/r52-character-template-and-pickup-avatar`(Base `0c09a20`, manifest `1abbb88`) 생성 완료함.
  - **과제 배정**: Step 1 명세서 아키텍처·보안 리뷰 (**Claude Opus** `▶ READY`) → Step 2 DB/RLS/RPC/Types (**GPT Codex** `⏳ WAITING`) → Step 3 UI 구현 (**Claude Sonnet** `⏳ WAITING`) → Step 4 통합 리뷰 및 병합 (**Claude Opus / Gemini 4 Argon** `⏳ WAITING`)임.

## r38-onboarding-and-game-order 통합 리뷰 및 `main` 병합 마감 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **리뷰 (`4ffd901` ↔ `c1cb27b`)**: 온보딩 모달(전체 선택 기본·일괄 구독·나중에 선택), `game-order-storage` 유틸(사용자별 키 격리·손상 데이터·SSR 안전 처리), `/dashboard/games` 순서 변경 버튼, `/dashboard` 필터·캘린더 아이콘 정렬 검토함. P1~P3 0건, P4 2건(`R38-REV-001` 일괄 구독 중복 경합, `R38-REV-002` 로그아웃 시 localStorage 키 잔존)으로 비차단 판정함.
- **검증**: `git diff --check`, `tsc --noEmit`, `npm run lint` 통과, Vitest 54파일/485개 통과함. `iteration-01/{review,test}.json`·`run.json`(`status: completed`) 스키마 검증 및 커밋(`66c99f4`) 완료함.
- **`main` 병합**: `collab/r38-onboarding-and-game-order`를 `main`에 병합(`b8abcc6`)함. DB 변경 없어 운영 마이그레이션 선행 조건 없음. push 미수행임.
- **다음 단계**: Dispatch Queue에 `▶ READY` 과제 없음. 후속 `R51`(P4 2건) 등록, 보안 안건 `R50`은 `📝 AGENDA`로 사용자 요청 대기임.

## r36-game-detail-and-r47-followup 정적 리뷰·병합 마감 및 r38-onboarding-and-game-order Run 등록 (R36·R47·R38, 2026-11-09)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator, Step 2 마감 및 차기 Run 등록)임.
- **`r36-game-detail-and-r47-followup` 정적 리뷰 및 병합 (`b5ca5d8` $\leftrightarrow$ `4fdf99a`)**:
  - `R47-1`(`user-requests-card.tsx` `is_rerun` 컬럼 부재 `42703`/`PGRST204` 시 제외 재조회 폴백 및 `userId` 의존성 안정화), `R47-2`(관리자 일정 폼·수정 요청 모달 R33 복각 회귀 테스트 9건), `R36`(`/dashboard/games` 180일 일정 조회, 로그인 전용 `게임 과금 요약` 카드, `ON AIR` `D-n` 배지·진행률 바, `다음 예정 일정`, 버전별 과금 소계, `지난 일정 기록` 접기/펼치기 아코디언 및 단위 테스트 9건)을 모두 검증하여 `clean`(지적 0건) 판정함.
  - `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src`(52파일, 453개 테스트 통과) 및 `run.json`·`review.json`·`test.json` 스키마 검증 완료 후 산출물 커밋(`e3a4acc`) 및 `main` 병합(`4ffd901`)을 완료함.
- **차기 기능 Run `r38-onboarding-and-game-order` (`Phase 12.41`: `R38`) 등록**:
  - `A1`(`R50`)은 사용자 지시에 따라 `📝 AGENDA` 상태로 유지하고, DB 마이그레이션 없이 즉시 배포 가능한 차기 중간 우선순위 기능 과제 **`R38`**(신규 가입 첫 진입 시 구독 게임 0개일 때 공용 게임 일괄 구독 온보딩 모달 자동 표시 + 내 게임 순서 변경 및 캘린더 아이콘·필터 정렬 연동)을 격리 Worktree `.worktrees/r38-onboarding-and-game-order`(Base `4ffd901`, manifest `12486d9`)로 생성하고 Step 1(**Claude Sonnet** `▶ READY`)에 배정함.

## r36-game-detail-and-r47-followup Run 등록 및 R50 안건 상태 전환 원칙 반영 (R36·R47·R50, 2026-11-09)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)임.
- **`A1` (`auth-security-settings-review`, `R50`) 수동 전환 원칙 명시**:
  - 사용자 지시에 따라 `A1`(`R50` 인증 보안 설정 점검)의 상태를 `📝 AGENDA`로 유지하고, 활성 기능 Run 종료 시 자동 전환하지 않으며 **사용자가 별도로 착수를 요청할 때에만 `▶ READY`로 전환**하도록 `docs/handoff.md`에 명시함.
- **차기 기능 Run `r36-game-detail-and-r47-followup` (`Phase 12.40`: `R36` + `R47`) 등록**:
  - DB 스키마 변경 없이 즉시 진행 가능한 **`R36`**(게임별 일정·과금 통합 상세 뷰: `ON AIR` `D-n`·진행 바, `다음 예정 일정`, `버전별 과금 소계`, `지난 일정 기록(최근 6개월)`, 로그인 사용자용 `게임 과금 요약` 카드)과 **`R47`**(`user-requests-card.tsx` `is_rerun` 컬럼 부재 폴백 조회 및 R33 UI 회귀 테스트 보강)을 단일 격리 Run으로 묶어 착수함.
  - 격리 Worktree `.worktrees/r36-game-detail-and-r47-followup` (브랜치 `collab/r36-game-detail-and-r47-followup`, Base SHA `b5ca5d8`, manifest 커밋 `17f9f44`) 생성 및 `run.json` 스키마 검증 통과함.
  - **과제 배정**: Step 1 구현 (**Claude Sonnet** `▶ READY`, Fallback 1: `GitHub Copilot` / Fallback 2: `Gemini 3.8 Flash`) → Step 2 통합 정적 리뷰 및 병합 (**Gemini 4 Argon** `⏳ WAITING`, Fallback 1: `Claude Opus` / Fallback 2: `GitHub Copilot`)임.

## weekly-game-group-and-rerun-badge 정적 리뷰 및 `main` 병합 마감 (R48·R49, 2026-11-09)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator, Step 2)임.
- **정적 리뷰 결과 (`742e58f` $\leftrightarrow$ `d51fba8`)**:
  - `src/components/calendar/schedule-type-badge.tsx` 공용 배지(`inline-flex items-center gap-1 leading-none`, 내부 복각 칩 `py-0 leading-none`으로 외부 배지 높이 변화 원천 차단), `/admin` 일정 목록 2곳·`/dashboard/games` `ScheduleTree`·`HeroSidebarContent`·`WeeklyScheduleList` 적용, 사이드바 묶음 키 `is_rerun` 분리, 주차별 리스트 게임별 그룹화(가나다순, 미연결 `기타` 마지막, 지출 섹션 분리) 및 단위 테스트 8+3건 추가를 모두 확인하여 `clean`(P1~P4 지적 0건) 판정함.
- **검증 및 병합**:
  - `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src`(52개 파일, 430개 테스트 통과) 및 `validate_collaboration_artifact.py` 스키마 검증(`run.json`, `iteration-01/review.json`, `iteration-01/test.json`)을 통과하고 워크트리 커밋(`696f23f`) 후 `main`에 병합(`23d2699`)함.
- **다음 단계**: 활성 Run 종료에 따라 `docs/handoff.md`의 병행 검토 안건 `A1`(`auth-security-settings-review`, `R50` 인증 보안 설정 점검, 담당: **Claude Opus** `▶ READY`)을 실행 대기 상태로 전환함.

## 인증 보안 설정 점검 안건 등록 (R50, 2026-11-09)

- **수행 주체**: Claude Opus (사용자 요청으로 안건 등록)임.
- **배경**: 비밀번호 저장 방식(Supabase Auth bcrypt 해시, 앱 테이블 미저장)·문자열 암호화(미도입 권장) 질의 답변 결과를 근거로 에이전트 검토 안건화함.
- **등록 내용**: `docs/handoff.md` 「병행 검토 안건」에 `auth-security-settings-review`(A1 Claude Opus 읽기 전용 점검 `📝 AGENDA` → A2 사용자 대시보드 확인) 등록, `docs/to-do.md` `R50` 추가함.
- **실행 조건**: 자동 실행 대상 아님. 활성 Run(`weekly-game-group-and-rerun-badge`)에 대기 과제가 없을 때 또는 사용자 지목 시 착수함.

## 배포 확인 피드백 반영 Run 등록: weekly-game-group-and-rerun-badge (R48·R49, 2026-11-09)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **사용자 배포 확인 결과**: 관리자 일정 폼 특별방송 옵션·복각 체크박스, 내 요청 카드 종류 라벨 정상 확인됨.
- **피드백**: ① 주차별 리스트를 게임별로 묶어 하위에 일정 표시(`R48`), ② 사이드바 복각 배지를 관리자 페이지처럼 `[픽업 [복각]]`로 표시하고 `[복각]` 높이 불일치 검토(`R49`)임.
- **원인 분석**: 복각 칩이 `inline` 부모 배지 안에 별도 세로 패딩·작은 글자로 중첩되어 기준선이 어긋남. 사이드바 묶음 키에 복각 여부가 없어 신규·복각 PICKUP이 합쳐짐.
- **격리 Worktree 생성**: `.worktrees/weekly-game-group-and-rerun-badge` (Base `742e58f`, manifest 커밋 `a8f9a1d`)임.
- **과제 배정**: Step 1 UI (**Claude Sonnet** `▶ READY`) → Step 2 리뷰·병합 (**Gemini 4 Argon** `⏳ WAITING`, Fallback Claude Opus)임.

## R46 운영 DB 마이그레이션 적용 완료 (2026-11-09)

- 사용자가 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R33_SCHEDULE_RERUN_AND_BROADCAST.sql`을 실행하고 `sql/README.md` B표 확인 쿼리로 검증 완료함.
- R33(`BROADCAST`·PICKUP 복각) 포함 `main` 빌드는 마이그레이션 선행 조건을 충족해 push·배포 가능 상태임. 배포는 미수행임.
- 남은 후속 과제: `R47`(내 요청 카드 `is_rerun` 조회 폴백, R33 테스트 보강)임.

## schedule-rerun-and-broadcast iteration-02 재리뷰 및 `main` 병합 마감 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **재리뷰 (`d09ba5c` ↔ `8c64d98`)**: `R33-REV-001`~`005` 해소 확인함(R33 UI 테스트 추가, 원본 복각 상태 기준 `is_rerun` 페이로드, 묶음 일정 복각 배지, 내 요청 카드 4종 라벨, 배너 영문 통일).
- **신규 지적**: `R33-REV-006` (P3, 내 요청 카드가 `is_rerun`을 명시 조회해 마이그레이션 미적용 시 요청 내역 전체 로드 실패), `R33-REV-007` (P4, 관리자 폼·ScheduleTree·오류 문구 테스트 미보강)임.
- **사용자 결정**: 조건부 병합 승인함. P3·P4는 `R47` 후속 과제로 이관하고, 운영 마이그레이션 `R46`은 배포 전 필수 적용으로 명시함.
- **검증**: 임시 PostgreSQL 17에서 업그레이드·신규 스키마 모두 마이그레이션 2회 후 `TESTS.sql` 31개 PASS. tsc·lint 통과, Vitest 51파일/420개 통과함. `iteration-02/{review,test}.json`·`run.json`(`status: completed`) 스키마 검증 및 커밋(`f0a5a58`, `ea645f6`) 완료함.
- **`main` 병합**: `collab/schedule-rerun-and-broadcast`를 `main`에 병합(`7436a3b`)함. push 미수행임.
- **다음 단계**: ① 사용자가 운영 DB에 R33 마이그레이션 적용(`R46`) 후 push·배포, ② `R47` 후속 보강, ③ 차기 후보 `R35`(관심 일정, DB/RLS) 또는 `R36`(게임별 상세 뷰) Run 등록임.

## R33 UI iteration-02 수정 완료: schedule-rerun-and-broadcast (2026-11-09)

- **수행 주체**: GitHub Copilot (Step 4 Maker)임.
- **커밋**: `.worktrees/schedule-rerun-and-broadcast`의 `8c64d98`임.
- **수정 내용**: 수정 payload의 `is_rerun` 미적용 마이그레이션 내성을 보강하고, 묶음 일정 사이드바 복각 배지·내 요청 카드 일정 종류 라벨을 추가함. BROADCAST·복각·캘린더 표시 회귀 테스트를 추가함.
- **검증**: `npx tsc --noEmit`, `npm run lint`, 전체 Vitest 51파일/420개, `git diff --check` 통과함.
- **다음 단계**: Claude Opus가 Base `d09ba5c`와 Target `8c64d98`을 재리뷰하고 `main` 병합·R46 운영 마이그레이션 체크리스트를 마감함.

## schedule-rerun-and-broadcast iteration-01 통합 정적 리뷰 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)임. Step 1 일부를 같은 모델이 인수·수정해 SQL 부분 리뷰 독립성은 제한됨.
- **리뷰 범위**: Base `d09ba5c` ↔ Target `5ce5d22`(Step 1 DB `9e33ac9` + Step 2 UI `5ce5d22`)임.
- **지적 사항 (`status: findings`)**:
  - `R33-REV-001` (P2): Step 2 UI 커밋에 테스트 추가 0건(수용 기준 ④ 미충족)임.
  - `R33-REV-002` (P3): 일정 수정·수정 요청 시 `is_rerun: false`를 항상 보내 마이그레이션 미적용 상태에서 모든 수정이 실패함.
  - `R33-REV-003` (P3): 사이드바 묶음 일정 목록에 항목별 `복각` 배지 누락임.
  - `R33-REV-004` (P3): `user-requests-card.tsx`가 VERSION 외 요청을 모두 `픽업`으로 표시함(Step 2 허용 파일 누락은 Orchestrator 책임).
  - `R33-REV-005` (P4): 캘린더 배너 표기 언어 불일치임.
- **검증**: 임시 PostgreSQL 17에서 업그레이드·신규 스키마 모두 마이그레이션 2회 후 `TESTS.sql` 31개 PASS. tsc·lint 통과, Vitest 50파일/415개 통과함. 산출물 스키마 검증 통과 및 커밋(`3a2d882`) 완료함.
- **다음 단계**: Step 4 수정(**GitHub Copilot** `▶ READY`) → Step 5 재리뷰·`main` 병합·`R46`(**Claude Opus** `⏳ WAITING`)임. `main` 병합 보류임.

## R33 UI Maker 인계 완료: schedule-rerun-and-broadcast Step 2 (2026-11-09)

- **수행 주체**: GitHub Copilot (Maker - General)임.
- **커밋**: `.worktrees/schedule-rerun-and-broadcast`의 `5ce5d22`임.
- **완료 내용**: 관리자·사용자 요청 폼에 `BROADCAST` 특별방송 및 PICKUP 복각 입력을 추가하고, 관리자 요청/과거 일정·캘린더·사이드바·주차 목록·게임 일정 트리에 라벨·배지를 반영함. 미적용 R33 마이그레이션 오류 안내와 수정 시 복각 해제 payload도 반영함.
- **검증**: `npx tsc --noEmit`, `npm run lint`, 대상 테스트 7파일/96개, 전체 Vitest 50파일/415개, `git diff --check` 통과함.
- **다음 단계**: Claude Opus가 Base `d09ba5c`와 Target `5ce5d22`를 비교해 통합 리뷰·산출물 마감·`main` 병합을 수행함.

## R33 DB Maker 인계 완료: schedule-rerun-and-broadcast Step 1 (2026-11-09)

- **수행 주체**: Claude Opus (GPT Codex 1순위 대체, `⚠️ HANDOVER_NEEDED` 인수)임.
- **커밋**: `.worktrees/schedule-rerun-and-broadcast`의 `9e33ac9d5bb5eb1a9dd9655329a0b1830ffbf134`임.
- **인수 내용 검토**: 마이그레이션(제약 재생성·`is_rerun`·PICKUP 전용 CHECK·트리거·승인 RPC)과 `SCHEMA.sql`·타입·요청 검증 초안이 수용 기준과 일치함을 확인함.
- **보완**:
  - `TESTS.sql` R33 블록이 `authenticated` 역할로 `game_schedules`에 직접 INSERT해 RLS에 거부되던 테스트 결함을 fixture 역할 + savepoint 롤백으로 수정함.
  - tsc 실패 3건은 Step 2 대상 파일의 로컬 `schedule_type` 타입 선언 문제로 판단, 타입 선언 4곳만 `BROADCAST`로 확장해 Step 1 범위를 최소 조정함(UI 동작 변경 없음).
  - SRS에 별도 절로 붙은 R33 내용을 `FR-010` 수정과 추적성 행으로 정리함.
- **검증**: 임시 PostgreSQL 17(Supabase `auth`/`storage`/`cron` 최소 스텁)에서 ① 기존 `SCHEMA.sql` → 마이그레이션 2회, ② 신규 `SCHEMA.sql` → 마이그레이션 2회 적용 오류 없음. 두 DB 모두 `TESTS.sql` 31개 PASS 및 최종 ROLLBACK 확인함. `tsc --noEmit`, `npm run lint`, `git diff --check` 통과, Vitest 50파일/415개 통과함. 운영 DB 미접근임.
- **다음 단계**: Step 2 UI (**GitHub Copilot** `▶ READY`, Fallback: Claude Sonnet / Gemini 3.8 Flash)임.

## R33 DB Maker 체크포인트 (2026-11-09)

- **수행 주체**: GPT Codex Maker 작업을 Claude Opus에 인계함.
- **반영 파일**: R33 migration/schema/tests/README, DB types, schedule request validation/test, SRS/SPEC 초안을 Worktree에 보존함.
- **검증**: 요청 검증 Vitest 3개 및 lint 통과, diff check 통과함. 전체 TypeScript 검사는 Step 2 UI 타입의 BROADCAST 미지원으로 3건 실패함. 임시 PostgreSQL 검증과 전체 Vitest는 미실행/미완료임.
- **다음 단계**: Claude Opus가 파일 경계와 타입 검사 순서를 정리하고, SQL 회귀 검증 및 Step 1 커밋 가능 여부를 판단함.

## 차기 Run 2 등록: schedule-rerun-and-broadcast (R33, 2026-11-09)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **격리 Worktree 생성**: `.worktrees/schedule-rerun-and-broadcast` (브랜치: `collab/schedule-rerun-and-broadcast`, Base SHA: `d09ba5c131838872fa8423c9ce80cd31d345106f`, manifest 커밋 `10ef476`)임.
- **설계 결정**: `is_rerun`은 PICKUP 전용 CHECK로 강제함. `BROADCAST`는 예정 지출 동기화 트리거 대상에 포함함. "필터" 범위는 기존 게임 필터·공식/비공식 설정 통과로 한정함. RLS 변경 없음. 클라이언트는 미적용 마이그레이션 상태를 견뎌야 함.
- **과제 배정**: Step 1 DB/RPC/Types (**GPT Codex** `▶ READY`) → Step 2 UI (**GitHub Copilot** `⏳ WAITING`) → Step 3 통합 리뷰·병합·`R46` 운영 마이그레이션 체크리스트 (**Claude Opus** `⏳ WAITING`)임.

## dashboard-summary-dday-and-week-list iteration-02 재리뷰 및 `main` 병합 마감 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **재리뷰 (`d56d211` ↔ `be57e71`)**: `DSW-REV-001`(요약 전용 이번 주 일정·`PLANNED` 지출 별도 조회, 공식/비공식 설정·게임 필터 동일 적용), `DSW-REV-002`(선택일 계산 통일), `DSW-REV-003`(중립 문구) 해소 확인, 신규 지적 0건으로 `clean` 판정함.
- **검증**: `tsc --noEmit`, `npm run lint`, `vitest run --dir src`(49파일/412개) 통과함. `run.json`(`target_sha: be57e71`, `status: completed`), `iteration-02/review.json`, `iteration-02/test.json` 스키마 검증 통과 및 산출물 커밋(`4ececa5`) 완료함.
- **`main` 병합**: `collab/dashboard-summary-dday-and-week-list`를 `main`에 병합(`590085a`)함. push는 미수행임.
- **다음 단계**: 차기 Run 2(`R33`, `schedule-rerun-and-broadcast`) 등록 필요함(Orchestrator 담당, 현재 Dispatch Queue에 `▶ READY` 과제 없음).

## dashboard-summary-dday-and-week-list iteration-01 통합 정적 리뷰 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Gemini 4 Argon 1순위 대체)임.
- **리뷰 범위**: Base `d56d211` ↔ Target `ab930c5`(R32 요약 스트립·D-n·진행률 바, R34 주차별 리스트 토글)임.
- **지적 사항 (`status: findings`)**:
  - `DSW-REV-001` (P2): 요약 스트립이 조회 월 그리드 범위로만 로드된 일정·지출에 의존해 월 이동 시 오늘/이번 주 값이 0 또는 일부 값으로 잘못 표시됨.
  - `DSW-REV-002` (P3): 주차별 리스트 이월 일정 버튼의 `aria-pressed` 기준일과 클릭 선택일 불일치임.
  - `DSW-REV-003` (P4): 모든 빈 주차에 `"이번 주 일정이 없습니다."` 문구가 표시됨.
- **검증**: `tsc --noEmit`, `npm run lint`, `vitest run --dir src`(49파일/410개) 통과함. `run.json`(`target_sha` 기록), `iteration-01/review.json`, `iteration-01/test.json` 스키마 검증 통과 및 산출물 커밋(`719ccc5`) 완료함.
- **다음 단계**: Step 3 iteration-02 수정(**Claude Sonnet** `▶ READY`) → Step 4 재리뷰·`main` 병합(**Claude Opus** / **Gemini 4 Argon** `⏳ WAITING`)임. `main` 병합은 보류 상태임.

## r13-4-breakthrough-guest-and-schedule-tree 통합 리뷰·iteration-02 수정 및 `main` 병합 마감 (2026-11-09)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator, Step 4) + Gemini 3.8 Flash (`gemini-flash-maker`, iteration-02 UI 수정)임.
- **Iteration 1 정적 리뷰 (`6295a0e` $\leftrightarrow$ `d5b75eb`)**:
  - `src/app/dashboard/games/page.tsx`에서 `ScheduleDialog`(`ScheduleTree`)가 비로그인 게스트 뷰에만 연결되고 인증 사용자 뷰(716~801행)에는 기존 평면 일정 목록 다이얼로그가 중복 남아 있는 문제(`R134-REV-001`, Severity `P2`)를 식별함.
  - `iteration-01/review.json`(`status: "findings"`) 및 `iteration-01/test.json`(`passed`, 48파일/394개)을 작성하고 `validate_collaboration_artifact.py` 스키마 검증을 통과함.
- **Iteration 2 수정 및 재리뷰 (`6295a0e` $\leftrightarrow$ `29443b4`)**:
  - `gemini-flash-maker` 서브에이전트가 `src/app/dashboard/games/page.tsx`의 게스트·인증 뷰 일정 다이얼로그를 `<ScheduleDialog>`로 일원화하고, `ScheduleTree`에 `[비공식]` 배지·슬래시(`/`) 다중 줄바꿈·단일 일자 `(단일)` 포맷·유형별 배지 색상·버전 아코디언 기간 표시를 보강하며 단위 테스트 2건을 추가함(커밋 `29443b4fc6f1be0ae4b4f65e32cfa073461f58f2`).
  - 재리뷰 결과 `clean`(P1~P4 지적 0건) 판정함. `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src`(48개 파일, 396개 테스트 통과) 검증 후 `run.json`(`target_sha: "29443b4..."`, `status: "completed"`), `iteration-02/review.json`, `iteration-02/test.json` 스키마 검증 및 아티팩트 커밋(`dd94e63`)을 완료함.
- **`main` 병합 및 차기 Run 착수**:
  - `collab/r13-4-breakthrough-guest-and-schedule-tree`를 `main`에 병합(`ce4bed21ce24faeacbddb9345ae63f034208deb2`) 완료함.
  - 운영 DB에 `sql/migrations/MIGRATION_R13_4_BREAKTHROUGH_AND_GUEST_RLS.sql`을 적용하는 수동 체크리스트(`R45`)를 `docs/to-do.md`에 등록하고, 차기 Run `dashboard-summary-dday-and-week-list`(`R32 + R34`, 담당: **Claude Sonnet** `▶ READY`) 워크트리 생성 및 Dispatch Queue 배정을 완료함.

## Phase 12.35~12.36 게스트 모드·일정 트리 Maker 완료 (2026-11-09)

- **수행 주체**: GitHub Copilot (Maker - General)임.
- **커밋**: `.worktrees/r13-4-breakthrough-guest-and-schedule-tree`의 `d5b75ebeff65a48e6f86c90a3ec74921809be30b`임.
- **완료 내용**: 비로그인 게스트 대시보드·게임 목록 공식 일정 열람, 로그인 안내, 게임 일정 ON AIR 및 VERSION 아코디언 트리, 소비 화면 로그인 빈 상태, UI 밀도 조정함.
- **검증**: `npm run lint`, `npx tsc --noEmit`, Vitest 48파일/394개, `git diff --check` 통과함.
- **다음 단계**: Claude Opus / Gemini 4 Argon이 Base `6295a0e` ↔ Target `d5b75eb` 통합 리뷰 및 Run 마감 수행함.

## Phase 13.4 DB 및 R41 게스트 일정 RLS Maker 완료 (2026-11-09)

- **수행 주체**: GPT Codex (Maker - Core & SQL/Types)임.
- **커밋**: `.worktrees/r13-4-breakthrough-guest-and-schedule-tree`의 `ba49f135582d44fa4c9458fc45a76752baf07fd9`임.
- **완료 내용**: 게임 최대 돌파 상한, 사용자 즐겨찾기/돌파 컬럼 및 상한 검증 트리거, 게스트의 승인 게임·공식 일정 SELECT 권한, 회귀 SQL과 타입/SRS/SPEC/README 반영함.
- **검증**: `tsc --noEmit`, `npm run lint`, Vitest 48파일/385개 통과함. 임시 PostgreSQL 17에서 신규 `SCHEMA.sql` 적용, migration 2회 실행, 전체 `TESTS.sql` 통과함. stub 환경 검증이며 운영 DB는 사용하지 않음.
- **다음 단계**: Claude Sonnet이 Phase 13.4 캐릭터/관리자 UI 구현함. Step 2가 `▶ READY`임.

## 사용자 추가 요구사항(R41~R44) 구체화 및 신규 Run 등록: r13-4-breakthrough-guest-and-schedule-tree (2026-11-09)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **요구사항 확정 (R41~R44)**:
  1. **R41 (게스트 모드 공식 일정 확인)**: 비로그인 상태로 `/dashboard`·`/dashboard/games` 진입을 허용해 승인 게임의 공식 일정(`is_official = true`, `game_schedules` `anon` SELECT 정책 추가)을 열람하고, 개인화 탭에는 로그인 유도 배너를 표시함.
  2. **R42 (게임별 일정 보기 ON AIR + 버전별 아코디언 트리)**: `/dashboard/games` 일정 모달 상단에 진행 중(`ON AIR`) 일정을 고정 노출하고, 하단에 버전(`VERSION`) 아코디언을 클릭하면 하위 `PICKUP`·`CONTENTS` 상세 일정이 펼쳐지도록 개편함.
  3. **R43 (Phase 13.4 캐릭터 메모 제거 · 컴팩트 타일 · 즐겨찾기 금색 테두리/상단 노출 · 게임별 최대 돌파 & 좌하단 `n★` 배지)**: `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §8에 영문 명세를 추가하고, `games.max_breakthrough`(`0..12`) 및 `user_characters.is_favorite`·`breakthrough_level`(`0..12`) 스키마 확장과 컴팩트 아이콘 타일 UI를 설계함.
  4. **R44 (UI 디자인 밀도 개편)**: 대시보드·게임·소비 화면 전반의 카드 패딩·간격·타이포그래피 밀도를 정돈함.
- **격리 Worktree 생성**: `.worktrees/r13-4-breakthrough-guest-and-schedule-tree` (브랜치: `collab/r13-4-breakthrough-guest-and-schedule-tree`, Base SHA: `6295a0e6f0bec385abe16c7f4b962840a5ea85ce`)
- **과제 배정**: Step 1 DB/RLS/Types (**GPT Codex** `▶ READY`) $\to$ Step 2 Phase 13.4 캐릭터·관리자 UI (**Claude Sonnet** `⏳ WAITING`) $\to$ Step 3 게스트 모드·버전 아코디언 일정 트리·UI 밀도 개편 (**GitHub Copilot** `⏳ WAITING`) $\to$ Step 4 통합 리뷰 및 마감 (**Claude Opus** / **Gemini 4 Argon** `⏳ WAITING`).

## R13 UI Run iteration-02 재리뷰 및 `main` 병합 마감 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Step 5)임.
- **재리뷰 결과**: Base `fe8a776` ↔ Target `e07cc6a`. iteration-01 지적 R13UI-01~08 전부 해소 확인함. 신규 지적은 P4 서식 1건(R13UI-09, 비차단)뿐임.
- **산출물**: 워크트리 커밋 `0b8eb4d`(`iteration-02/review.json`·`test.json`, manifest `target_sha=e07cc6a`·`status=completed`)임.
- **병합**: `main` 병합 `1f5d43a`(충돌 없음)임. 병합 후 tsc 0건·lint 통과·Vitest 48파일/385개(`--dir src`)·`npm run build` 통과함. push 완료함.
- **R13 상태**: Phase 13.1~13.3 전체 `main` 반영 완료임. 브라우저 수동 확인(사용자)과 비차단 후속 13.2-F2(스키마 정규화 중복·명세 표현·서식), 13.2-F3(Vitest `.claude/worktrees` 제외)이 남음.
- **다음 단계**: 큐에 `▶ READY` 과제 없음. Gemini 4 Argon(Fallback: Claude Opus)이 차기 Run `dashboard-summary-dday-and-week-list`(R32+R34) 등록 예정임.

## R13 UI Run iteration-02 수정 Maker 완료 (2026-11-09)

- **수행 주체**: Claude Sonnet (Maker, Step 4)임.
- **커밋**: `e07cc6a` (`.worktrees/r13-phase13-2-and-13-3-ui`, 미 push)임.
- **완료 내용**: iteration-01 지적 `R13UI-01`~`R13UI-08` 전부 수정함. 캐릭터 요청 아이콘 미리보기·관리자 교체 및 `p_default_icon_url` 전달(P2), 요청 빈 분류 값 제거·UPDATE 대상 검증·프리필, 분류 축 행 안정 key, 캐릭터 삭제 확인 다이얼로그, §7.3.4 옵션 제거 사용량 경고, 캐릭터 아이콘 필수 검증, Phase 13.2 단위 테스트 21개 추가함.
- **검증**: `tsc --noEmit` 0건, `npm run lint` 통과, `vitest run` 48파일 385개 통과임(Node 24.22.2). `npm run build`·브라우저 수동 확인 미수행임.
- **다음 단계**: Step 5 Claude Opus가 Base `fe8a776` ↔ Target `e07cc6a` 재리뷰, `iteration-02` 산출물, manifest 마감, `main` 병합을 수행함.

## R13 UI Run iteration-01 통합 정적 리뷰 (2026-11-09)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator, Step 3)임.
- **범위**: Base `fe8a776` ↔ Target `6b755aa` (Phase 13.2 `688205e`·결함 수정 `17945d9`·Phase 13.3 `6b755aa`)임.
- **결과**: `findings` — P1 0건, **P2 1건**(아이콘 없는 ADD 캐릭터 요청 승인 불가·관리자 아이콘 교체 UI 부재), P3 6건(요청 빈 분류 값·UPDATE 미프리필·분류 축 키 입력 포커스 소실·캐릭터 삭제 확인 부재·§7.3.4 옵션 제거 경고 미구현·Phase 13.2 테스트 부재), P4 1건임. Phase 13.3 `/dashboard/characters` 지적 0건임.
- **검증**: tsc 0건·lint 통과·Vitest 48파일/364개 통과(Node 24.22.2)임. 빌드·수동 확인 미수행임. Python 부재로 공식 스키마 검증 스크립트 대신 Node 보조 검사로 산출물 3종 통과 확인함.
- **산출물**: 워크트리 커밋 `b6cd7a0`(`iteration-01/review.json`·`test.json`, manifest `target_sha`, R13 명세 §4.2 동기화)임. `main`·`collab/r13-phase13-2-and-13-3-ui` 브랜치 `origin` push 완료함.
- **다음 단계**: Step 4 iteration-02 수정 Maker **Claude Sonnet** `▶ READY` → Step 5 재리뷰·`main` 병합 Claude Opus임. P2 해소 전 `main` 병합 보류함.

## R13 Phase 13.3 전용 캐릭터·프리셋 페이지 Maker 완료 (2026-11-09)

- **수행 주체**: Claude Sonnet (Maker)임.
- **커밋**: `17945d9`(Step 1 결함 수정: admin 스키마 정규화·tsc 오류 3건·테스트 17개 실패 해소), `6b755aa`(Phase 13.3 구현) — `.worktrees/r13-phase13-2-and-13-3-ui`, 미 push임.
- **완료 내용**: `/dashboard/characters`(구독 게임 선택 바, 보유 캐릭터 로스터의 성급·분류 축·`기타` 필터·미보유 명도 감쇠·메모·커스텀 아이콘, 조합 프리셋 목록·편집기·슬롯 축소 비파괴 처리), 캐릭터 아이콘 Storage 헬퍼, Topbar `캐릭터` 메뉴, `RequestSubmissionModal` `initialKind` prop 추가함.
- **검증**: `tsc --noEmit` 0건, `npm run lint` 통과, `vitest run` 48파일 364개 통과임(Node 24.22.2). `npm run build`·브라우저 수동 확인은 미수행임.
- **다음 단계**: Step 3(Claude Opus / Gemini 4 Argon)이 Base `fe8a776` ↔ Target `6b755aa` 통합 리뷰·`run.json` 마감·`main` 병합을 수행함. 명세와의 차이(download→Object URL 방식, 옵션 제거 경고 미확인 등)는 `docs/handoff.md` Step 2 완료 기록 참조함.

## R13 Phase 13.2 관리자 UI Maker 완료 (2026-11-09)

- **수행 주체**: GitHub Copilot (Maker)임.
- **커밋**: `688205e` (`.worktrees/r13-phase13-2-and-13-3-ui`)임.
- **완료 내용**: 게임별 `max_preset_slots`·`classification_schema` 설정, 관리자 캐릭터 CRUD·필터, 사용자 캐릭터 ADD/UPDATE 요청 제출, 관리자 캐릭터 요청 승인·반려 RPC 연결함.
- **검증**: `git diff --check` 통과함. 현재 환경에 Node/npm이 없어 `tsc`·lint·Vitest는 실행하지 못함.
- **다음 단계**: Claude Sonnet이 동일 Worktree에서 Phase 13.3 전용 `/dashboard/characters`·Storage 헬퍼·Topbar·프리셋 UI 구현함.

## 경쟁 서비스(픽업지지) 비교 분석 및 R32~R40 로드맵 리뷰·확정 (2026-11-09)

- **수행 주체**: Claude Opus (분석 문서 작성 `14eb539`) → Gemini 4 Argon (아키텍처·정합성 리뷰 및 로드맵 확정)
- **리뷰 및 보정 내용**:
  - `docs/competitive-analysis-pickupgg.md` §1 기능 현황 대조 결과 3건 보정 반영함: ① `Tauri deep link`를 `PKCE 브라우저 콜백 완료, Tauri 딥링크는 T1~T4 후속 예정`으로 과장 표현 보정함, ② Phase 12.19(카테고리 원그래프 클릭 아코디언)·수익 추가·구독 중지 시 미결제 `PLANNED` 정리·외부 아이콘 CORS 프록시 폴백 및 Data URL 재저장(R29·R30) 누락 항목을 보완함, ③ §4.2 및 `docs/to-do.md` R36의 `"픽업별 지출 결합"` 표현을 Phase 12.21(R11, 픽업 배너 연결 제거) 정책에 맞춰 `"이번 달/누적 확정 과금액·예정 지출·버전별(및 월별) 지출 요약 결합"`으로 정합성 보정함.
  - §3 강점 9종 및 §5 포지셔닝(**"게임 일정 기반 개인 과금 가계부"**)을 공식 승인(`APPROVED`)함.
  - `docs/to-do.md` R32~R40 각 항목의 우선순위(R37 시각 필드는 중간→낮음 조정), 담당 모델 및 대체(Fallback) 체인, Opus 승격 조건(① DB/RLS/RPC 변경: R33·R35·R37)을 확정함.
- **실행 순서 및 차기 Run 계획**:
  - **1순위**: 현재 활성 격리 Run `r13-phase13-2-and-13-3-ui` (`Phase 13.2` GitHub Copilot `▶ READY` → `Phase 13.3` Claude Sonnet: `/dashboard/games` 모달 대신 `Topbar` `캐릭터` 메뉴 및 전용 `/dashboard/characters` 페이지로 분리 구현 → 통합 리뷰 및 `main` 병합)를 최우선 완수함.
  - **2순위 (차기 Run 1순위)**: R13 병합 직후 DB 변경이 없는 `R32`(오늘/이번 주 요약 카드 + 일정·예정 지출 `D-n`/진행률 바) + `R34`(대시보드 주차별 리스트 뷰 토글)를 묶어 `dashboard-summary-dday-and-week-list` Run(Maker: Claude Sonnet)으로 등록·착수함.
  - **3순위 (차기 Run 2순위)**: DB/RPC 확장이 포함되는 `R33`(`PICKUP` 복각 플래그 `is_rerun` & `BROADCAST` 특별방송 일정 종류)을 `schedule-rerun-and-broadcast` Run(Step 1 GPT Codex DB/RPC → Step 2 GitHub Copilot UI → Step 3 Claude Opus 리뷰)으로 착수함.

## 신규 격리 협업 Run 등록: r13-phase13-2-and-13-3-ui (2026-11-04)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **Run ID**: `r13-phase13-2-and-13-3-ui`
- **Worktree**: `.worktrees/r13-phase13-2-and-13-3-ui` (브랜치: `collab/r13-phase13-2-and-13-3-ui`, Base SHA: `fe8a7762404a1b119cb879d1ae4fe624aa370ef7`)
- **과제 구성**:
  1. **Step 1 (`Phase 13.2`, GitHub Copilot, `▶ READY`)**: `/admin` 게임 등록/수정 모달의 `max_preset_slots`·`classification_schema`(성급 및 최대 3개 분류 축) 설정과 옵션 제거 시 사용 캐릭터 수 경고, `/admin` `캐릭터 관리` 탭, `RequestSubmissionModal` 캐릭터 요청 제출 탭, `/admin/requests` 캐릭터 요청 승인/반려 탭 및 단위 테스트 구현함.
  2. **Step 2 (`Phase 13.3`, Claude Sonnet, `⏳ WAITING`)**: `storage-upload.ts` 캐릭터 커스텀 아이콘 헬퍼(`{user_id}/characters/{character_id}.webp`), `CharacterPresetModal`(`보유 캐릭터` 탭 — 성급/분류 축/`기타` 필터·미보유 명도 감쇠·커스텀 아이콘·200자 메모 & `조합 프리셋` 탭 — `1..max_preset_slots` 빌더·미보유 슬롯 명도 감쇠·슬롯 축소 비파괴 처리), `/dashboard/games` 구독 게임 카드 연동 및 단위 테스트 구현함.
  3. **Step 3 (통합 정적 리뷰 및 Run 마감, Claude Opus / Gemini 4 Argon, `⏳ WAITING`)**: Base `fe8a7762` ↔ Step 2 Target SHA 통합 정적 리뷰 및 `main` 병합 마감함.

## R13 Phase 13.1·R30 iteration-02 재리뷰 및 Run 마감 (2026-11-04)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: iteration-02(`334c642`) 리뷰 clean. Run `r13-phase13-1-db-and-r30-icon-resave` 완료, `main` 병합(`7956064`).
- **검증**: 워크트리·병합 후 `main` 모두 tsc·eslint 0건, vitest 45개 파일 311개 통과. 로컬 PostgreSQL 17 기존 DB·신규 설치 `TESTS.sql` PASS.
- **다음 단계**: `main` push(사용자 확인), 운영 DB `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` 적용(R31). 이후 R13 Phase 13.2(관리자 카탈로그)·13.3(사용자 로스터·프리셋) Run 등록 필요.

## R13/R30 iteration-02 수정 완료 (2026-11-04)

- **수행 주체**: GPT Codex (Maker)임.
- **커밋**: `.worktrees/r13-phase13-1-db-and-r30-icon-resave`의 `334c642f91111b0227327efb2848007cd6ee07f6`임.
- **수정 내용**: 관리자 아이콘 변환 대상은 HTTP(S) URL로 한정하고 `/assets/...` 시드 아이콘을 제외함. 프리셋의 게임 변경 시 대상 게임 슬롯 상한 검증을 강제하고 회귀 테스트를 추가함.
- **검증**: admin 테스트 18개, `tsc --noEmit`, `npm run lint`, 전체 Vitest 45파일/311개 통과함. 임시 PostgreSQL 17 stub DB에서 마이그레이션 2회 및 전체 `TESTS.sql` 통과함.
- **다음 단계**: Claude Opus가 Base `1f656ad` ↔ Target `334c642f` iteration-02 재리뷰 및 Run 마감 진행함.

## R13 Phase 13.1·R30 iteration-01 통합 리뷰 (2026-11-04)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: 조건부 통과. P2 1건(R30 시드 `/assets/...` 아이콘 외부 URL 오판), P3 1건(프리셋 `game_id` 변경 시 슬롯 상한 우회) 발견. iteration-02 수정 과제 등록.
- **검증**: tsc·eslint 0건, vitest 45개 파일 311개 통과, 로컬 PostgreSQL 17에서 기존 DB 경로·신규 설치 모두 `TESTS.sql` PASS. R13-SEC-01(관리자 가드)·R13-MAINT-01(함수 단일 정의)·purge 재정의 무회귀 확인.
- **다음 단계**: Step 4 iteration-02 수정(GPT Codex) → Step 5 재리뷰·병합(Claude Opus).

## Phase 13.1 R13 DB/타입 Maker 완료 (2026-11-04)

- **수행 주체**: GPT Codex (Maker - Core & SQL/Types)임.
- **커밋**: `.worktrees/r13-phase13-1-db-and-r30-icon-resave`의 `4a21555e6bc8177d440a4c765507b1f438069474`임.
- **완료 내용**: 분류 검증 함수, 게임별 슬롯/분류 설정, 캐릭터·요청·보유 목록·프리셋 테이블 및 RLS/RPC, 계정 삭제 대기 차단·정리, SQL 테스트 7 시나리오, DB 타입과 SRS/SPEC/README를 반영함.
- **검증**: `npx tsc --noEmit`, `npm run lint`, Vitest 45파일/309개 통과함. PostgreSQL 17 로컬 stub 환경에서 마이그레이션 2회 적용 및 `sql/tests/TESTS.sql` 전체 PASS함. `pg_cron`은 로컬 설치가 없어 `SCHEMA.sql` 검증용 복사본에서만 제외했으며, 운영 DB는 사용하지 않음.
- **다음 단계**: Claude Sonnet이 동일 Worktree에서 Phase 12.34 (R30) 관리자 게임 아이콘 배지·WebP Data URL 재저장 기능을 구현함.

## 격리 협업 Run 재생성 및 재배정: r13-phase13-1-db-and-r30-icon-resave (2026-11-04)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **조치 사유**: 이전 작업 환경(타 PC)의 로컬 Worktree에만 존재하던 `collab/r13-phase13-1-db-and-r30-icon-resave` 커밋(`1746ffc`, `78c132f`, `4d30d5a`)이 원격(`origin`)에 Push되지 않아 Step 4가 `🛑 BLOCKED`된 상태를 해소하기 위해 사용자 결정에 따라 현재 PC에서 격리 Worktree를 새로 생성함.
- **Worktree**: `.worktrees/r13-phase13-1-db-and-r30-icon-resave` (브랜치: `collab/r13-phase13-1-db-and-r30-icon-resave`, Base SHA: `1f656ad9156e874bfed5901aca00ef06ca9e82cf`)
- **과제 구성**:
  1. **Step 1 (`Phase 13.1` / R13 DB & Types, GPT Codex, `▶ READY`)**: R13 캐릭터·프리셋 DB 스키마 및 마이그레이션, `iteration-01` 리뷰 지적 사항(`R13-SEC-01` 관리자 RPC `coalesce(v_is_admin, false)` 가드, `R13-TEST-01` 비관리자 RPC 거부·관리자 승인·캐릭터/게임 삭제 테스트, `R13-MAINT-01` `SCHEMA.sql` 단일 함수 정의)을 수용 기준에 선반영하여 구현함.
  2. **Step 2 (`Phase 12.34` / R30, Claude Sonnet, `⏳ WAITING`)**: 관리자 게임 목록 외부 URL 아이콘 `[외부 URL]` 배지 및 행별 WebP Data URL 재저장 버튼 구현 및 단위 테스트 추가함.
  3. **Step 3 (통합 정적 리뷰 및 Run 마감, Claude Opus / Gemini 4 Argon, `⏳ WAITING`)**: Base `1f656ad9` ↔ Step 2 Target SHA 정적 리뷰 및 `main` 병합 마감함.

## 에이전트 규칙 문서 한국어 개조식 원칙 추가 (2026-11-04)

- **작업 개요**: 에이전트 규칙 문서들에 '답과 문서는 한국어 개조식(~함, ~임)으로 쓸 것' 원칙 반영 완료함.
- **수정된 규칙 및 지침 문서**:
  1. .agents/rules/language.md: 한국어 소통 원칙에 답변 및 문서의 한국어 개조식(~함, ~임) 의무화 조항 추가함.
  2. AGENTS.md: Core Rule 요약 및 5단계 결과 보고 지침에 한국어 개조식 작성 원칙 반영함.
  3. CLAUDE.md: Claude Code 전용 지침에 한국어 개조식(~함, ~임) 의무화 및 완료 보고 지침 추가함.
  4. .agents/rules/agent_rules.md: 5번 섹션(응답 및 문서 작성 원칙)을 신설하여 개조식 종결어미(~함, ~임, ~됨) 사용 명시함.
  5. .agents/rules/document_location.md: 문서 작성 스타일 항목을 추가하여 프로젝트 문서의 개조식 작성을 명시함.
  6. .agents/rules/collaboration.md: 사후 문서 동기화 및 커뮤니케이션 스타일에 개조식 원칙 명시함.
  7. .agents/rules/handoff.md: 5번 규칙(Rules)에 모든 대화 응답 및 docs/** 문서의 개조식 준수 조항 추가함.
  8. .agents/skills/handoff/SKILL.md: 스킬 5번 규칙에 동일하게 개조식 원칙 동기화함.
  9. .github/copilot-instructions.md: GitHub Copilot 전용 지침에 한국어 개조식 소통 및 문서화 스타일 추가함.
- **적용 범위 명확화**: 사용자와의 채팅 대화 및 운영 문서(docs/handoff.md, docs/progress.md 등)에 한정되며, 에이전트 간 협업 아티팩트(artifacts/**), 영문 기술 명세서(docs/spec/SRS.md 등), 코드/커밋 메시지는 기존 영문 규격을 유지함을 전 규칙 파일에 명시함.
- **검증**: git diff를 통해 전 파일의 수정 내용 및 누락 여부 확인 완료함.

## R13 iteration-02 실행 차단 (2026-11-04)

- **확인 결과**: 대기열에서 지정한 `.worktrees/r13-phase13-1-db-and-r30-icon-resave`가 없고 `git worktree list`에도 나타나지 않는다. 기록된 Step 1/2 SHA `1746ffcda57f8be943d52e5fbc0502b228157448`, `78c132f9b23ea22064831f83f8f564ce24950c61`은 현재 Git 객체 DB에서 찾을 수 없었다.
- **영향**: 현재 checkout에는 R13 명세만 있고 `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`, R13 SCHEMA 정의/TESTS 블록 및 `iteration-01/review.json`이 없어 iteration-02 국소 수정과 리뷰 기준 재검증을 할 수 없다. 저장소의 미참조 객체에서도 해당 구현 commit은 복구되지 않았다.
- **상태**: `docs/handoff.md` Step 4를 `🛑 BLOCKED`로 기록. 구현 파일을 임의로 재작성하지 않고, 이전 worktree/commit 및 리뷰 artifact 복구 또는 R13 DB 작업 재등록을 다음 조치로 남겼다.
- **검증**: `git worktree list`, 지정 경로 확인, `git cat-file`, `git fsck --full --no-reflogs --unreachable`, R13 파일 검색.

## 신규 격리 협업 Run 등록: r13-phase13-1-db-and-r30-icon-resave (2026-11-04)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **Run ID**: `r13-phase13-1-db-and-r30-icon-resave`
- **Worktree**: `.worktrees/r13-phase13-1-db-and-r30-icon-resave` (브랜치: `collab/r13-phase13-1-db-and-r30-icon-resave`, Base SHA: `3bc02457a8de4c19b4dca46060c4d358ce15b94e`)
- **과제 구성**:
  1. **Step 1 (`Phase 13.1` / R13 DB & Types, GPT Codex, `✅ DONE`, `1746ffc`)**: 캐릭터·프리셋 DB 스키마 및 마이그레이션, §7.5 SQL 테스트 7종, 타입·명세 반영. tsc/lint/Vitest 통과. PostgreSQL 서버가 없어 SQL suite는 미실행.
  2. **Step 2 (`Phase 12.34` / R30, Claude Sonnet, `✅ DONE`, `78c132f`)**: 관리자 게임 목록 외부 URL 아이콘 `[외부 URL]` 배지 및 행별 WebP Data URL 재저장. 단위 테스트 4건 추가.
  3. **Step 3 (통합 정적 리뷰, Claude Opus, `✅ DONE` — 수정 필요)**: `iteration-01/review.json` P1 1건(관리자 승인/반려 RPC 가드가 `NULL`로 평가되어 일반 사용자가 캐릭터 요청을 승인·반려 가능, PGlite 재현), P2 1건(§7.5·RPC 테스트 누락), P3 1건(SCHEMA 중복 정의). tsc·lint·Vitest 45파일/313 통과. `main` 병합 보류.
  4. **Step 4 (iteration-02 SQL 수정, GPT Codex, `🛑 BLOCKED`)**: 지정 worktree와 기록된 Step 1/2 commit 객체가 현재 저장소에 없어 수정 기준 코드를 찾을 수 없다. 원본 복구 또는 Run 재등록 필요.
  5. **Step 5 (재리뷰 및 Run 마감, Claude Opus, `⏳ WAITING`)**.
- **다음 단계**: 원본 R13 worktree/commit과 iteration-01 리뷰 산출물을 복구하거나 R13 DB 작업을 새 Run으로 재등록한 뒤 Step 4를 재개한다.

## Phase 12.33 정적 코드 리뷰 완료 및 Run 마감 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator)
- **리뷰 범위**: Base `cdee5a74ddb97b86d3899e3cfe6c01cadb9fa9e9` ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` (`git diff bf3f1a1 HEAD -- src sql public` 비어 있음 확인).
- **결과**: 정적 코드 리뷰 PASS (`clean`, P1~P3 0건, P4 비차단 참고 1건). `artifacts/r13-spec-review-and-icon-cors-fix/iteration-01/review.json` 스키마 검증 통과.
- **수용 기준 점검**:
  1. `src/lib/image-resizer.ts`: 1차 `fetch` no-referrer 시도 후 실패 시 10초 제한 wsrv.nl 폴백, `image/*` 및 5MB 용량 검증, 256×256 WebP Data URL 변환 정상.
  2. `/admin` 및 `/admin/requests`: 클립보드 이미지 붙여넣기(`onPaste`) 및 WebP Data URL 미리보기 정상, 일반 텍스트 붙여넣기 미가로챔 보장, wsrv.nl 제3자 전달 고지 문구 반영.
  3. 전역 `no-referrer` 적용: `public/_headers` 및 `layout.tsx` 반영.
  4. 테스트: 단위 테스트 28건 및 전체 Vitest 45개 파일/309개 테스트 통과, `tsc --noEmit`, ESLint, `git diff --check`, `markdownlint` 전체 통과.
- **Run 마감**: Run ID `r13-spec-review-and-icon-cors-fix` 3단계(Step 1 R13 명세 승인 `b66b07c`, Step 2 Phase 12.33 구현 `bf3f1a1`, Step 3 정적 리뷰 및 문서 마감) 전체 완료.

## Phase 12.33 Maker 구현 완료 (2026-11-03, `bf3f1a1`)

- **수행 주체**: GitHub Copilot (Step 2 Maker, main-worktree fallback)
- `image-resizer.ts`에서 직접 이미지 요청 실패 시 10초 제한 wsrv.nl 폴백을 적용했다. 응답은 `image/*` 및 5MB 이하만 사용하고, 최종 결과는 기존 256×256 WebP Data URL로 저장한다. URL 입력 도움말에 제3자 전달을 고지했다.
- `/admin` 및 `/admin/requests`에서 클립보드 이미지(`files`/`items`)를 WebP Data URL로 변환해 미리보기·승인에 연결했다. 이미지가 아닌 붙여넣기는 기본 동작을 유지한다. `public/_headers`와 Next metadata에 `no-referrer`를 적용했다.
- **검증**: 전체 Vitest 45개 파일/309개 테스트, `npx tsc --noEmit`, `npm run lint`, `git diff --check` 통과.
- **다음 단계**: Gemini 4 Argon이 Base `cdee5a7b9f756a8131a5f49a6e82b47f97698541` ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` 정적 리뷰 및 문서 마감을 진행한다. 배포·실기기 모바일 검증은 미실시.

## R13 명세 리뷰 확정 및 Phase 12.33 설계 검증 (2026-11-03)

- **수행 주체**: Claude Opus (Reviewer & Architect)
- **결과**: `docs/spec/R13_Character_Roster_and_Preset_Spec.md`를 `APPROVED`로 확정(`b66b07c`). §7에 리뷰 결정(RLS 보완, 아이콘 크기 제한, 분류 스키마 DB 검증, 프리셋 트리거 경계 규칙, Storage 헬퍼 확장, Phase 13.1 필수 스모크 테스트)을 기록.
- **Phase 12.33**: 설계 승인. Step 2 수용 기준에 시간 제한, `Content-Type` 검사, wsrv.nl 제3자 고지, 붙여넣기 범위, CSP 주의를 보완하고 `▶ READY` 전환. 기존 외부 URL 아이콘 재저장은 후속 R30.
- **다음 단계**: Step 2 `Phase 12.33 (R29)` GitHub Copilot `▶ READY`.

## R13 영문 명세서 작성 및 Phase 12.33 아이콘 CORS/모바일 깨짐 해결 Run 등록 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **R13 영문 명세서 작성**: 사용자의 3대 핵심 요구사항(① 게임 아이콘과 동일한 캐릭터 아이콘 관리 및 사용자 커스텀 아이콘 `user-icons` 지원, ② 관리자 게임별 프리셋 최대 슬롯 `max_preset_slots` 설정 및 미보유 캐릭터 명도 감쇠 시각화, ③ 게임별 성급·다중 분류 축 `classification_schema` 최적화 및 캐릭터별 메모 필드·배지 생략)을 반영한 영문 명세서 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md)를 작성했다.
- **나무위키 아이콘 모바일 깨짐 및 관리자 URL 등록 CORS 오류 원인 규명 (`Phase 12.33` / `R29`)**:
  1. 관리자 URL 등록 실패 원인: `src/lib/image-resizer.ts`의 `fetchImageFile`이 브라우저 `fetch()`를 직접 수행하여 `Access-Control-Allow-Origin` 헤더가 없는 나무위키(`i.namu.wiki`) 등 외부 서버에서 CORS 에러가 발생함.
  2. 모바일 미표시 원인: 과거 원본 URL로 저장된 나무위키 이미지가 핫링크·세션 토큰·Referer 정책(`strict-origin-when-cross-origin` 및 SVG `<image>`의 `referrerPolicy` 미지원)에 의해 모바일에서 차단됨.
  3. 해결책: `fetchImageFile`에 CORS 허용 이미지 프록시(`wsrv.nl`) 폴백 추가, 관리자 모달 클립보드 이미지 직접 붙여넣기(`onPaste`) 지원, 전역 `Referrer-Policy: no-referrer` 적용을 `Phase 12.33`으로 등록했다.
- **다음 단계**: Step 1 **Claude Opus**(`▶ READY`)가 `R13` 영문 명세서 및 `Phase 12.33` 설계를 리뷰·확정 → Step 2 **GitHub Copilot**이 `Phase 12.33` 구현.

## Phase 12.15-F3 & Phase 12.32 통합 정적 리뷰 및 Run 마감 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator)
- **리뷰 범위**: Base `05140cb12f3f77b90656c71baad1d8686841cf87` ↔ Target `3ed5e5da10dd6c758dac370234aa27ac0608421e` (`c075045` GPT Codex + `3ed5e5d` GitHub Copilot).
- **결과**: 정적 코드 리뷰 PASS(P1~P4 finding 0건). `artifacts/supabase-typed-client-and-a11y-closeout/`의 `run.json`, `iteration-01/review.json`, `iteration-01/test.json` JSON Schema 검증 통과(`7243c3b`).
- **원격 대조 및 병합**: `origin/main`(`5a39dbe`) 대비 로컬 `main`이 순수 Fast-Forward(`ahead 10, behind 0`) 상태임을 확인하고, Worktree와 `main` 간 `docs/to-do.md`의 `R28` 행 충돌 가능성을 사전 정렬해 무충돌 병합 완료.
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 44개 파일 302개 테스트 통과, `markdownlint` 통과.

## Phase 12.15-F3 Supabase 타입 연결 완료 (2026-11-03)

- **수행 주체**: GPT Codex (Step 1 Maker)
- **완료**: `c075045f82fae6af8e9c7900a656220637bd899f`에서 RPC nullable/optional 인자와 일정·요청 상태 리터럴 타입을 정리하고 `createClient<Database>`를 연결했다. 타입 연결로 드러난 구독 동기화/모달 payload, 요청 화면 nullable 필드도 정합화했다.
- **검증**: `tsc --noEmit` 통과, 관련 Vitest 30개(22+8) 통과, 변경 파일 ESLint 및 `git diff --check` 통과.
- **다음 단계**: 같은 worktree의 Step 2 Phase 12.32 UI 접근성 및 Cloudflare Pages 체크리스트 마감(GitHub Copilot, `▶ READY`).

## Phase 12.15-F3 & Phase 12.32 협업 Run 등록 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Orchestrator & Architect)
- **내용**: 후보 1(`Phase 12.15-F3`: `src/types/database.types.ts` RPC/테이블 nullable·optional 정밀 보정 및 `src/lib/supabase/client.ts` `createClient<Database>` 연결)과 후보 2(`Phase 12.32`: 주요 모달 5종 `DialogDescription` 보완, 소비 페이지 월 선택 드롭다운 고유 `aria-label` 분리, 관리자 권한 안내 시맨틱 토큰 적용, Cloudflare Pages·접근성 체크리스트 마감)를 묶어 격리 Worktree `.worktrees/supabase-typed-client-and-a11y-closeout`(Base SHA: `05140cb12f3f77b90656c71baad1d8686841cf87`)에 등록했다.
- **다음 단계**: Step 1 `Phase 12.15-F3` **GPT Codex** `▶ READY` → Step 2 `Phase 12.32` **GitHub Copilot** → Step 3 **Claude Opus** 통합 정적 리뷰 및 마감.

## R24 iteration-02 수정·재리뷰 및 Run 마감 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Step 3 Claude Opus 1순위 대체 및 Step 4 Orchestrator & Reviewer)
- **원인 규명 및 수정 (`42e52c6`)**: `scripts/collaboration/New-CollaborationRun.ps1`에서 `iteration-01/README.md`를 생성할 때 PowerShell 이중 인용구 here-string(`@" ... "@`)을 사용해 백틱 뒤의 `` `r ``, `` `t ``, `` `a ``가 각각 `\r`, `\t`, `\a` 제어문자로 치환되던 문제를 단일 인용구 here-string(`@' ... '@`)으로 변경해 원천 해결하고, `artifacts/require-main-run-sha/iteration-01/README.md`를 정상 경로 텍스트로 복구했다.
- **재리뷰 및 검증 (`5bd515e`)**: Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Target `42e52c6940d0d141a595b90c04768c521b2d969f` 정적 재리뷰 clean(finding 0건). `run.json`, `iteration-02/review.json`, `iteration-02/test.json` 모두 JSON Schema 검증 통과, `git diff --check` 및 Markdownlint 통과 후 `main` 브랜치에 병합 완료.

## R24 main 작업 리뷰 SHA 인계 절차 보강 Run 등록 (2026-11-02)

- `docs/to-do.md`의 미완료 중 Orchestrator 역할에 직접 해당하는 R24를 다음 과제로 선택했다.
- Run `require-main-run-sha`를 `.worktrees/require-main-run-sha`에 생성했다. Base SHA는 `ea188c66f534e7adf63c2747769b2fae986c9d25`.
- 해결 방향은 `run.schema.json`을 확장하지 않고, main 직접 실행의 Base SHA 등록 시 기록과 Target SHA Maker 커밋 후 기록을 Orchestrator 스킬에 명시하는 것이다. 가짜 manifest 경로는 사용하지 않는다.
- Step 1 Maker 커밋 `83d2e180ee2871679bb76c15a34a42c596a61ed2`를 대상으로 iteration-01 리뷰를 진행했다. R24 스킬 문서는 기준을 충족하지만, 함께 생성된 iteration README의 경로 문자열에 제어문자가 있어 P3 finding을 기록했다. Run/review/test JSON Schema 검증은 통과했다. README Markdownlint(MD009/MD010)와 Base/Target `git diff --check`는 실패했고, 루트 문서와 변경 skill은 Markdownlint 통과했다. 산출물은 Run 커밋 `dee8ce6`, 검증 결과 정정은 `12225b2`에 기록했다.
- R24는 미완료 상태다. 다음 단계는 Claude Opus가 README 손상과 생성 원인을 수정·검증해 커밋하고, Gemini 4 Argon이 동일 Base SHA부터 새 Target SHA까지 재리뷰한 뒤 문서 마감을 하는 것이다.

## Phase 12.31 정적 리뷰 및 Run 마감 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: Run `expense-chart-labels-and-outline` 마감. Base `20e32b5` ↔ Target `fc4ea9d` PASS(P1~P3 0건, P4 2건).
- **검증**: tsc·eslint 0건, vitest 44개 파일 302개 통과, markdownlint 0건.
- **배포·운영**: 운영 DB `MIGRATION_UNOFFICIAL_SCHEDULES.sql` 적용 완료(R27), `origin/main` push 완료.
- **다음 단계**: Cloudflare 배포 후 실제 브라우저에서 차트 툴팁·축 눈금·외곽선 확인(사용자). 활성 과제 없음.

## Phase 12.31 소비 차트 라벨·외곽선 Run 등록 (2026-11-02)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 토큰 소진으로 1순위 대체)
- **내용**: 게임별 과금 툴팁의 UUID 표시, 금액 축 눈금 중복, 막대 외곽선 가시성을 Run `expense-chart-labels-and-outline`(R26)으로 등록.
- **운영 이슈**: 운영 DB에 `MIGRATION_UNOFFICIAL_SCHEDULES.sql` 미적용 상태로 12.25 코드가 배포되어 관리자 일정 저장·일정 요청 제출/승인이 실패할 가능성이 높음. 즉시 적용 요청(R27).
- **다음 단계**: R27 운영 적용(사용자) → Step 1 `Phase 12.31 (R26)` Claude Sonnet `▶ READY` → Step 2 Claude Opus 리뷰·마감.

## Phase 12.30 정적 리뷰 및 Run 마감 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: Run `memo-textarea-tab-indent` 마감. Base `7e9a57b` ↔ Target `87cf75e` 리뷰 PASS(P1~P3 0건, P4 3건). `review.json` 스키마 검증 통과.
- **검증**: tsc·eslint 0건, vitest 43개 파일 298개 통과, markdownlint 0건.
- **배포**: `origin/main` `d57b3e2`까지 push(12.24~12.30 일괄 배포), Cloudflare Pages 배포 및 실제 환경 Tab 입력 테스트 성공(2026-11-02 사용자 확인).
- **다음 단계**: 활성 과제 없음. 미결 백로그: R13(장기), R24(`run.schema.json` main Run 지원).

## Phase 12.30 메모 입력란 Tab 키 `\t` 입력 (2026-11-02, 커밋 `87cf75e`)

- 공용 헬퍼 `src/lib/textarea-tab.ts`(`insertTabOnKeyDown`)를 홈 사이드바 메모, 게임 상시 메모, 지출 상세 메모, 일정 요청 메모에 연결했다. 수식키 없는 Tab은 커서/선택 영역에 `\t`를 삽입하고 포커스를 유지한다.
- Shift/Ctrl/Alt/Meta+Tab과 IME 조합 중에는 가로채지 않고, `maxLength` 초과 시 삽입하지 않는다. 게임 공식 일정 메모 표시는 탭이 접히지 않도록 `whitespace-pre-wrap`으로 변경했다.
- 검증: Vitest 43개 파일 298개, `tsc --noEmit`, eslint 통과. 실제 브라우저의 Radix 모달 포커스·한글 IME 동작은 실기기 확인 필요.
- 다음: 순서 2 Claude Opus 정적 리뷰(Base `7e9a57b` ↔ Target `87cf75e`)와 문서 마감.

## Phase 12.30 메모 입력란 Tab 키 동작 Run 등록 (2026-11-02)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 토큰 소진으로 1순위 대체)
- **내용**: 메모 입력란에서 Tab 키가 취소 버튼으로 포커스를 옮기는 문제를 Run `memo-textarea-tab-indent`로 등록. 대상 4곳, Shift+Tab 포커스 이동 유지, IME·maxLength 처리, 게임 일정 메모 표시 `pre-wrap` 변경을 수용 기준으로 확정.
- **다음 단계**: Step 1 `Phase 12.30 (R25)` Claude Sonnet `▶ READY` → Step 2 Claude Opus 리뷰·마감.

## Phase 12.27~12.29 통합 리뷰 완료 (2026-11-02)

- Base `0da8eb49d4e9d98c4fb080e569860133c8f27636` ↔ Target `b820a4edff03170f02bb24356caba03163066b38` 범위 정적 리뷰 clean, finding 0건. 결과 JSON은 `artifacts/users-role-guard-and-subscription-dedupe/iteration-01/review.json`이며 리뷰 schema 검증 통과.
- 전체 Vitest 42개 파일 286개 통과, `npx tsc --noEmit`, `npm run lint`, 관련 Markdownlint 통과. `psql` 미설치로 SQL 스모크 테스트는 재실행하지 않았으며 Maker의 로컬 PG 통과 기록만 확인했다.
- Dispatch Step 4 완료. Run manifest는 기존 schema가 main 작업 트리를 표현하지 못해 미생성; 고정 SHA 범위는 `docs/handoff.md`에 기록했다.

## Phase 12.29 문서·UI 보강 (2026-11-02)

- **수행 주체**: Claude Opus (Claude Sonnet 1순위 대체)
- **결과**: 커밋 `b820a4e`. README 파괴적 마이그레이션 안내, 게임 등록 모달 `user?.id` 의존, 대시보드 일정 설정 조회 실패 폴백. `70efa54`로 `docs/handoff.md` 상단 표 구조 복구.
- **검증**: tsc·eslint 0건, vitest 42개 파일 286개 통과(신규 2건은 수정 전 실패 확인), markdownlint 0건.
- **다음 단계**: 없음. Phase 12.27~12.29 통합 리뷰 완료 기록 참조.

## Phase 12.28 MONTHLY_DAY 중복 정리 및 공식 일정 금전 경로 제한 (2026-11-02, 커밋 `bdb064c`)

- `dedupe_monthly_planned_expenses(UUID)` 소유자 검증 RPC를 추가하고, 중복 `MONTHLY_DAY` 예정 회차는 가장 이른 1건만 남기도록 마이그레이션·스키마·스모크 테스트를 동기화했다. 클라이언트 직접 DELETE는 제거했다.
- `VERSION_PASS` 생성과 지출 모달의 버전 일정 연결은 공식 일정만 사용한다. `is_official` 미적용 DB에서는 전체 일정을 공식으로 간주하는 폴백을 유지한다.
- 구독 동기화 22개 및 지출 모달 25개 Vitest 통과, `tsc --noEmit` 통과. 로컬 PostgreSQL 17에서 신규 SCHEMA + 전체 migrations + 중복 백필 단언 + TESTS.sql 통과; 새 구독 마이그레이션 2회씩 재실행 통과.
- 다음 단계: Phase 12.29 문서/UI 보강(Claude Sonnet), 이후 통합 정적 리뷰. 운영 Supabase 마이그레이션은 2026-11-02 사용자가 적용 완료했다.

## Phase 12.27 `public.users.role` 자기 승격 차단 (2026-11-02)

- **수행 주체**: Claude Opus (Maker - Security & SQL/RLS)
- **결과**: 커밋 `361fbbc`. `sql/migrations/MIGRATION_USERS_ROLE_GUARD.sql`(트리거) 신규, `SCHEMA.sql`·`sql/README.md`·`TESTS.sql`(USR-01) 반영.
- **검증**: 로컬 PostgreSQL 17에서 기존 DB(+마이그레이션 2회)·신규 설치·신규+전체 migrations 모두 `TESTS.sql` PASS. 자기 승격 재현 SQL이 거부되고, postgres 경로의 관리자 지정은 정상 동작.
- **사용자 결정 반영**: R20(비공식 일정은 토글과 무관하게 금전 경로에서 항상 제외)을 Step 2 범위에 추가. 운영 DB 관리자 계정은 사용자 본인 1개뿐임을 확인.
- **다음 단계**: 운영 Supabase에 `MIGRATION_USERS_ROLE_GUARD.sql` 적용(2026-11-02 사용자 적용 완료). Dispatch Step 2 `Phase 12.28 (R19·R20)` GPT Codex `▶ READY`.

## Phase 12.24 ~ 12.26 통합 정적 리뷰 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: 조건부 통과. 12.26 PASS. 기존 P1 보안 결함(`public.users.role` 자기 승격)과 P2(MONTHLY_DAY 중복 PLANNED 정리 무동작)를 로컬 PostgreSQL에서 재현해 기록. 상세 내용은 `docs/handoff.md` 리뷰 섹션 참조.
- **검증**: tsc·eslint 0건, vitest 42개 파일 281개 통과, markdownlint 0건, 로컬 PG `TESTS.sql` PASS.
- **다음 단계**: 후속 Run `users-role-guard-and-subscription-dedupe` 등록 완료. Step 1 `Phase 12.27 (R18)` Claude Opus `▶ READY` → Step 2 R19(GPT Codex) → Step 3 R21·R22(Claude Sonnet) → Step 4 통합 리뷰(Gemini 4 Argon). R20은 사용자 결정 대기.

## Phase 12.26 소비 통계·예산 배지 개선 (2026-11-02, 커밋 `6364132`)

- 게임별 과금 분석 Y축을 게임 아이콘으로 교체하고 Recharts 포커스 외곽선 제거·모바일 Tooltip 폭 제한을 적용했다.
- 카테고리별 지출 비중·게임별 과금 분석을 이번 달 기준으로 자동 갱신하고 월 선택 드롭다운(이번 달/기록 있는 연월/전체 기간)을 추가했다.
- 정기 구독 탭에 활성 구독 총액(주기별 소계)과 홈 요약 카드의 예산 근접(80%+)/초과 배지를 추가했다.
- 검증: Vitest 42개 파일 281개, `tsc --noEmit`, eslint 통과. 실기기(모바일 Tooltip·포커스 외곽선) 확인 필요.
- 다음: 순서 4 `Claude Opus` / `Gemini 4 Argon` Phase 12.24 ~ 12.26 통합 리뷰.

## Phase 12.25 관리자/게임 모달 및 비공식 일정 (2026-11-02, 커밋 `3c20e70`)

- `/admin/requests`의 중복 게임 추가 UI를 제거하고 관리자 아이콘 파일/URL을 256×256 WebP Data URL로 변환해 저장하도록 했다. 게임 선택 목록에서 이미 구독한 게임을 제외하고 아이콘 로드 1회 재시도를 추가했다.
- 일정 공식 여부 분류와 사용자 표시 설정을 DB 스키마·타입·관리자/요청 UI·설정 토글·대시보드 및 게임 일정 필터에 연결했다.
- 검증: `npx tsc --noEmit`, `npm run lint`, 관련 Vitest 8개 파일 57개 테스트 통과. 운영 Supabase 마이그레이션은 미적용이며 수동 실행이 필요하다.
- 다음 단계: Claude Sonnet의 Phase 12.26 진행 후 Claude Opus/Gemini 4 Argon 통합 리뷰 및 전체 검증. 운영 마이그레이션 적용 확인은 사용자 후속 작업이다.

## Phase 12.24 구독 템플릿·다음 회차 동기화 (2026-11-02)

- 구독 비활성화 시 미결제 `PLANNED` 회차를 삭제하고, 기존 `TEMPLATE_DEACTIVATION` 행 정리 및 복구 RPC 허용 제거를 반영했다.
- `MONTHLY_DAY`는 KST 오늘부터 다음 예정 회차 하나만 유지하며, 중복 예정 행을 정리한다. `VERSION_PASS` 조회는 오늘 이전에 끝난 일정을 제외한다.
- 단위 테스트와 TypeScript 검사는 통과했다. SQL 스모크 테스트는 데이터베이스 연결 환경에서 아직 실행하지 않았다.
- 다음 단계: GPT Codex 단계 완료 후 GitHub Copilot의 Phase 12.25를 진행하고, 최종 통합 검토를 수행한다.

## Phase 12.15-F2-c 운영 DB 정합성 점검 (2026-11-02, 사용자 수동 실행)

- **운영 DB 확인 쿼리**: 결제 RPC 11개 인자·지출 수정 RPC 5개 인자 단일 시그니처, pg_cron `chronoledger-account-purge`(5분), `user_games.memo`, `public.users`, 가입 트리거 2종, 템플릿 직접 DELETE 정책 0 모두 정상.
- **조치**: 운영에 `uq_personal_memos_user_date` 제약이 없었음 → `MIGRATION_MEMO_UNIQUE.sql` 실행(중복 메모 사전 조회는 실행 후에 수행해 삭제 건수는 미확인. 앱은 날짜별 기존 메모를 update하므로 중복은 동시 저장 시에만 생길 수 있었음). 구 PHASE9 `game_schedules` 정책 1건 DROP. 재조회로 전 항목 기대값 확인.
- **스모크 테스트**: 신규 테스트 프로젝트에 `SCHEMA.sql` 설치 후 `TESTS.sql` 실행, `PASS: all smoke-test fixtures and mutations rolled back`.
- **다음 단계**: Dispatch Queue 활성 과제 없음. 선택 과제 12.15-F3.

## Phase 12.15-F2 통합 정적 리뷰 및 Run `database-types-schema-sync` 마감 (2026-10-29)

- **수행 주체**: Claude Opus 5.5 (Reviewer & Orchestrator)
- **결과**: `38d3f71` 리뷰 PASS(차단 결함 0건). SCHEMA 대조 스크립트로 테이블 14개·비트리거 RPC 19개 일치 확인, Maker의 수용 기준 이탈 4건 타당 확인. P3 2건(DEFAULT 인자 필수 표기 3곳, 타입 파일이 Supabase 클라이언트에 미연결) 기록.
- **검증**: tsc 0 에러, lint 0건, Vitest 41파일 271 PASS, `npm run build` 성공.
- **다음 단계**: Dispatch Queue 활성 과제 없음. 사용자 수동 12.15-F2-c(원격 DB 확인 쿼리·`TESTS.sql`), 선택 과제 12.15-F3.

## Phase 12.15-F2 `database.types.ts` 스키마 동기화 구현 (2026-10-29)

- **수행 주체**: Claude Sonnet 5.5 (Maker) / 커밋 `38d3f71`
- **수행 내역**: `user_games.memo`, `subscription_templates.cycle_type`/`interval_days`(`billing_day` nullable) 반영, RPC 6종 추가 및 `process_expense_payment` 11개 인자 반영. SCHEMA.sql과 테이블 컬럼을 스크립트로 대조해 나머지 테이블은 일치 확인.
- **수용 기준 불일치(SCHEMA.sql 우선 적용)**: `subscription_templates`의 `billing_cycle`/`duration_days`/`start_date`/`end_date`는 SCHEMA에 없음(`billing_cycle`은 `expenses` 컬럼), `update_confirmed_expense_metadata` 인자는 `p_memo`/`p_target_date`, purge 인자는 `p_limit`, `add_wallet_income`은 존재하지 않아 미추가. 리뷰어는 이 차이를 확인 요망.
- **검증**: tsc 0 에러, lint 0건, Vitest 41파일 271 PASS. 빌드는 미실행.
- **다음 단계**: Dispatch Step 2 (통합 리뷰, Gemini 4 Argon / Claude Opus) `▶ READY`. `12.15-F2-c`(원격 DB 정합성 점검)는 사용자 수동.

## Phase 12.15-F2 운영 DB 마이그레이션 적용 완료 및 `src/types/database.types.ts` 스키마 동기화 착수 (2026-10-29)

- **배경 및 현황**:
  - 사용자가 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 실행을 완료함.
  - 이에 따라 `docs/to-do.md`의 `12.15-F2-a` 완료 처리 및 신규 협업 Run `database-types-schema-sync` 발족.
  - 2026-10-13 생성 이후 변경되지 않았던 `src/types/database.types.ts`를 현행 `sql/SCHEMA.sql`의 테이블 컬럼(`user_games.memo`, `subscription_templates` 4개 필드) 및 RPC 시그니처(11개 인자 `process_expense_payment`, `update_confirmed_expense_metadata`, `delete_subscription_template`, `add_wallet_income`, `request_account_deletion`, `get_account_deletion_status`, `purge_expired_account_deletion_requests` 등)와 100% 일치시키는 과제(`Phase 12.15-F2-b`)를 Active Dispatch Table에 배정.
- **다음 단계**:
  - 협업 Dispatch Step 1: `Claude Sonnet`에게 `Phase 12.15-F2` 배정 (`▶ READY`), `"인수인계 문서를 확인해"` 호출 대기.
  - 협업 Dispatch Step 2: `Gemini 4 Argon` / `Claude Opus` 통합 정적 리뷰 및 문서 마감 (`⏳ PENDING`).

## Phase 12.23 & 12.15-F1 통합 정적 코드 리뷰 및 협업 Run 마감 (2026-10-29)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator)
- **결과**: Run `expense-memo-preservation-and-sql-smoke-tests` 전 단계 `✅ DONE`.
  - `Phase 12.23 (R14)` (커밋 `d5522dc`, Claude Sonnet): 예정 지출 수정·결제 시 기존 사용자 메모 보존 및 이벤트 태그 병합, 잔여 픽업 주석 정리, 단위 테스트 2건 추가.
  - `Phase 12.15-F1` (커밋 `cb0b92c`, Claude Opus 대체 수행): `TESTS.sql` WAL-01 단언을 현행 결제 RPC에 맞게 갱신, 구독 템플릿 직접 삭제 RLS 정책 제거 마이그레이션(`MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql`) 작성 및 앱 폴백 제거, SRS FR-042/FR-053 명세 갱신, 로컬 PostgreSQL 17 스모크 테스트 끝까지 PASS.
  - 통합 정적 리뷰 통과: 차단(P1/P2) 결함 0건, P3(메모 덮어쓰기 기존 결함) 해결 확인.
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 41개 파일 271개 테스트 100% 통과, `markdownlint-cli` 0건.
- **다음 단계**:
  - `12.15-F2`: 운영 Supabase에 `MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 수동 적용 및 DB 정합성 점검 (사용자 수동).
  - 다음 협업 작업 준비 또는 사용자 피드백 대기.

## Phase 12.15-F1 스모크 테스트 정합화 및 구독 템플릿 삭제 RPC 전용화 (2026-10-29)

- **수행 주체**: Claude Opus (GPT Codex 1순위 대체)
- **결과**: 커밋 `cb0b92c`. `TESTS.sql` WAL-01 갱신, 사용자 결정 ③에 따라 `Delete own templates` 정책 제거 마이그레이션 및 앱 폴백 제거, SRS FR-042/FR-053 갱신.
- **검증**: 로컬 PostgreSQL 17 + Supabase 스텁에서 기존 DB·신규 설치 모두 TESTS.sql 끝까지 PASS. tsc·eslint 0건, vitest 271개 통과.
- **다음 단계**:
  - Dispatch Step 3 통합 리뷰(`▶ READY`, Gemini 4 Argon 권장).
  - 운영 Supabase에 `MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 수동 적용(12.15-F2).

## Phase 12.20 ~ 12.22 통합 정적 리뷰 및 Run 마감 (2026-10-29)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **결과**: Run `schedule-filter-and-game-spend-stats` 4단계 모두 `✅ DONE`. 차단 결함 없음. 상세 내용은 `docs/handoff.md` 통합 리뷰 섹션 참조.
- **검증**: tsc 0건, eslint 0건, vitest 41개 파일 268개 테스트 통과, markdownlint 0건(changelog MD010 하드탭 수정 후).
- **다음 단계**:
  - Phase 12.22 영문 지침 커밋(`de71051`) 완료.
  - 신규 협업 Run `expense-memo-preservation-and-sql-smoke-tests` 착수:
    - Step 1: `Phase 12.23 (R14)` 예정 지출 수정·결제 시 기존 사용자 메모 보존 및 잔여 주석 정리 (`Claude Sonnet`, `▶ READY`).
    - Step 2: `Phase 12.15-F1` `sql/tests/TESTS.sql`의 `WAL-01` 단언 현행 RPC 정합성 갱신 및 스모크 테스트 통과 (`GPT Codex`, `⏳ WAITING`).
    - Step 3: 통합 정적 리뷰 및 Run 마감 (`Claude Opus` / `Gemini 4 Argon`, `⏳ WAITING`).

## Phase 12.22 AI 전용 지침 문서 영문화 및 한국어 원본 아카이빙 (2026-10-29)

- **수행 주체**: Gemini 3.8 Flash (Maker - Docs & Config)
- **배경 및 개요**:
  - AI 에이전트(Claude Code, GPT Codex, GitHub Copilot, Gemini)가 매 턴마다 자동으로 주입받는 시스템 프롬프트 지침 문서의 토큰 소모량을 절감하기 위해 핵심 AI 지침을 영문화하고, 기존 상세 한국어 원본을 `docs/archive/agent-rules-ko/`로 분리 보관.
- **수행 내역**:
  1. **한국어 지침 원본 아카이빙 (`docs/archive/agent-rules-ko/`)**:
     - `docs/archive/agent-rules-ko/` 디렉터리 신규 생성.
     - 기존 한국어 지침 문서 8종(`CLAUDE-ko.md`, `AGENTS-ko.md`, `language-ko.md`, `collaboration-ko.md`, `handoff-rule-ko.md`, `document_location-ko.md`, `handoff-SKILL-ko.md`, `chronoledger-orchestrator-SKILL-ko.md`)을 원본 대조용으로 이동·보관하고, 깨진 상대 링크를 코드 스팬으로 변환.
     - 아카이브 안내 및 파일 매핑 표를 담은 `README.md` 작성.
  2. **AI 전용 지침 문서 간결한 영문 전환**:
     - `CLAUDE.md`, `AGENTS.md`, `.agents/rules/language.md`, `.agents/rules/document_location.md`, `.agents/rules/collaboration.md`, `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `.agents/skills/chronoledger-orchestrator/SKILL.md`를 의미 손실 없이 간결하고 명확한 영문(English)으로 재작성.
     - `CLAUDE.md` 7~11행의 un-backticked `@.agents/rules/...` 임포트 규칙을 정확히 준수하여 Claude Code 자동 파일 확장 기능 보존.
  3. **사용자 소통 및 운영 문서 한국어 원칙 유지**:
     - `.agents/rules/language.md`에 사용자 대면 질의/보고 및 `ask_question` 선택지는 반드시 한국어(`Korean`)로 작성하도록 엄격히 명시.
     - 사용자가 직접 열람하는 `docs/` 내 운영 문서(`handoff.md`, `to-do.md`, `progress.md`, `changelog.md` 등)는 한국어 유지.
  4. **신규 협업 Run `schedule-filter-and-game-spend-stats` 등록**:
     - `docs/handoff.md` 활성 큐를 신규 런으로 교체하고 Step 1(Phase 12.22) `✅ DONE`, Step 2(Phase 12.20) `▶ READY` 전이.
- **검증 완료**:
  - `markdownlint-cli` 전체 마크다운 파일 0건 오류 통과.
  - TypeScript 타입 검사 (`npx tsc --noEmit`) 0건 오류 통과.
  - Vitest 전체 단위 테스트 (`npx vitest run`) 42개 파일 270개 테스트 100% 통과.
- **다음 단계**:
  - Phase 12.20 (R10) ✅ 완료 (SHA: 335e517, Claude Sonnet): 선택일 게임 일정 필터/`진행 일정 전체 보기` 토글/정렬 개편, tsc·vitest 통과.
  - Phase 12.21 (R11) ✅ 완료 (SHA: e9a7017, Claude Sonnet): 소비 페이지 `게임별 과금 분석` 전환, 지출 모달 픽업 연결 제거.
  - 협업 Dispatch Queue Step 4: `Claude Opus` / `Gemini 4 Argon` 통합 정적 리뷰(Phase 12.20 ~ 12.22) 대기 (`"인수인계 문서를 확인해"` 호출).

## Phase 12.17 Android WebAPK 앱 명칭 `ChroLog` 동기화 및 Service Worker v5 갱신 (2026-10-29)

- **수행 주체**: Gemini 3.8 Flash (Maker - Fast UI)
- **배경 및 개요**:
  - Android 모바일 Chrome 및 WebAPK 설치 과정에서 앱 이름이 `ChronoLedger`로 인해 `ChronoLe...`로 말줄임되는 문제를 원천 해결하기 위해 `manifest.json`의 `name`을 `"ChroLog"`로 변경하고, Service Worker 캐시를 v5로 갱신하여 클라이언트 즉시 반영 보장.
- **수행 내역**:
  1. **`public/manifest.json` 수정**:
     - `name`: `"ChronoLedger"` ➡️ `"ChroLog"`로 동기화 (`short_name`도 `"ChroLog"` 유지).
     - `description`: `"ChronoLedger - 게임 일정 및 지출 관리 매니저"`로 유지/보완.
  2. **`public/sw.js` 셸 캐시 v5 갱신**:
     - `SHELL_CACHE` 버전을 `"chronoledger-shell-v4"`에서 `"chronoledger-shell-v5"`로 범프하여 브라우저에 캐시된 이전 셸 자산 및 `manifest.json` 강제 갱신.
  3. **단위 테스트 추가 (`src/components/pwa/sw.test.ts`)**:
     - `manifest.json`의 `name`과 `short_name`이 `"ChroLog"`인지, `SHELL_CACHE` 버전이 `"chronoledger-shell-v5"`인지 검증하는 테스트 추가.
- **검증 완료**:
  - Vitest 41개 파일 272개 단위 테스트 100% 통과.
  - Next.js 정적 빌드(`npm run build`) 성공 (15/15 페이지 생성 완료).

## Phase 12.14 ~ 12.19 통합 정적 코드 리뷰 및 협업 Run 마감 (2026-10-29)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator) / Gemini 3.8 Flash (Docs Sync Subagent)
- **대상 Run**: `mobile-ux-and-sql-consolidation` (Step 1~6 전체 완료)
- **리뷰 범위**: `49cf00a` (Phase 12.16/12.17), `ac58a1b` & `f272bfd` (Phase 12.14/12.18), `6015399` & `102e89e` (Claude Pro Sonnet/Opus 2단계 기준 수립), `dd01401` (Phase 12.19 소비 카테고리 아코디언), `cee2b76` (Phase 12.15 SQL 분류·정리 및 `SCHEMA.sql` 신규 설치 결함 수정)
- **리뷰 결과 및 보완 조치**:
  1. **Phase 12.19 소비 카테고리 아코디언 (`expenses/page.tsx`)**: `selectedCategoryExpenses`가 원그래프 집계와 동일하게 `CONFIRMED` 지출만 `target_date` 내림차순으로 정렬하고, 카테고리 소멸 시 자동 접힘, `ExpenseDetailModal` 연동 및 접근성(`aria-pressed`, `aria-label`)과 단위 테스트 2건 완비 확인 (PASS).
  2. **Phase 12.15 SQL 문서 분류 및 `SCHEMA.sql`**: `SCHEMA.sql` / `migrations/`(5) / `seed/`(3) / `tests/`(1) / `archive/`(6) 분류 및 `sql/README.md` 가이드, `MIGRATION_STORE_EVENT_EARN.sql`의 9개 인자 구버전 오버로드 제거 확인 (PASS). 리뷰 판단 항목이었던 `sql/SCHEMA.sql`의 `public.handle_new_user()`에 `ON CONFLICT (id) DO NOTHING` 및 `SET search_path = public`을 추가하여 `SECURITY DEFINER` 함수 보안 일관성 확보.
- **검증 완료**: `tsc --noEmit` 0 에러, Vitest 42개 파일 270개 테스트 전체 PASS, ESLint 0건 경고/오류, 마크다운 린트 통과.
- **다음 단계**: `mobile-ux-and-sql-consolidation` Run 공식 마감 완료. 차기 기능 로드맵(R10 등) 또는 후속 SQL 검증(TESTS.sql 단언 갱신, 원격 DB 확인) 대기.

## Phase 12.15 Supabase SQL 문서 분류·통합·정리 (2026-10-29)

- **수행 주체**: Claude Opus 5.5 (GPT Codex 토큰 소진으로 1순위 대체) / 커밋 `cee2b76`
- **수행 내역**: `sql/`을 `SCHEMA.sql`·`migrations/`·`seed/`·`tests/`·`archive/`로 분류하고 `sql/README.md` 실행 가이드 작성. `SCHEMA.sql` 신규 설치 결함 3건 수정(`users` 누락, 중복 인덱스, 없는 함수 GRANT) 및 `pg_cron` 스케줄 통합. `MIGRATION_STORE_EVENT_EARN.sql`에 구버전 결제 RPC 오버로드 제거 추가.
- **검증**: PGlite 빈 DB에서 SCHEMA 적용, migrations 2회 멱등, seed PASS. `TESTS.sql`은 WAL-01 기존 단언 불일치로 중단(후속 과제). lint·관련 Vitest PASS.
- **다음 단계**: Dispatch Queue Step 6 (통합 리뷰, Claude Opus / Gemini 4 Argon) `▶ READY`.

## Phase 12.19 소비 페이지 카테고리별 지출 내역 아코디언 (2026-10-28)

- **수행 주체**: Claude Sonnet 5.5 (Maker - Complex) / 커밋 `dd01401`
- **수행 내역**: `expenses/page.tsx`에 `selectedCategory` 상태 추가. 원그래프 `Cell` 및 범례 버튼 클릭/재클릭/닫기로 토글. 카드 하단에 카테고리명·건수·합계 헤더와 `max-h-60` 스크롤 리스트를 펼치고 CONFIRMED만 `target_date` 내림차순 표시. 항목 클릭 시 기존 `handleOpenRefund`로 `ExpenseDetailModal` 연동. 환불 등으로 카테고리가 사라지면 자동 접힘.
- **검증**: Vitest 전체 270 PASS(신규 2건), `tsc --noEmit` 0 에러, lint 0건. 실브라우저 시각 확인은 미수행.
- **다음 단계**: Dispatch Queue Step 5 (Phase 12.15, GPT Codex) `▶ READY`.

## Claude 모델 표기 정리 및 협업 지침 일관화 (2026-10-28)

- **수행 주체**: Claude Opus 5.5 (Architect & Rule Designer)
- **수행 내역**: 전 문서에서 Sonnet / Opus 외 Claude 모델 언급 삭제. 옛 단일 `Claude Opus 5.5` 역할 표기가 남아 있던 `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.github/copilot-instructions.md`, `docs/architecture.md`, `docs/handoff.md` 상단 지침을 `collaboration.md`의 Sonnet / Opus 2단계 기준(기본 Sonnet, 승격 조건 시 Opus, Argon/Codex 대체는 Opus)으로 통일.
- **검증**: 문서 전용 변경. 해당 모델명 잔여 검색 0건 확인. 코드·테스트 영향 없음.
- **다음 단계**: Dispatch Queue Step 4 (Phase 12.19, Claude Sonnet) `▶ READY` 유지.

## Phase 12.14 & 12.18 모바일 배경 팝오버·리사이징 및 드로어 뒤로 가기 연동 (2026-10-28)

- **수행 주체**: Claude Opus 5.5 (Maker - Complex)
- **수행 내역**:
  1. **Phase 12.14 / R4**: 모바일 헤더 줄바꿈 시 [배경 설정] 팝오버가 화면 좌측 밖으로 잘리던 문제를 `left-0 sm:left-auto sm:right-0`으로 해결. 배경 리사이징을 방향 인식형으로 변경해 세로형 이미지는 1080×1920 상자 기준으로 축소(기존 1080×1920 → 608×1080 과축소 해소).
  2. **Phase 12.18 / R8**: `MobileDrawer`에 `useDrawerHistory` 훅을 추가해 스마트폰 뒤로 가기 시 라우트 이탈 없이 드로어만 닫히도록 History API 연동. 직접 닫기 시 `history.back()`으로 엔트리 정리, Next.js App Router `history.state` 보존, back 처리 중 재오픈 레이스 가드.
  3. **CLAUDE.md 코드베이스 문서화 및 Netlify 잔재 제거**: 개발 명령어·아키텍처·규칙 섹션 추가, 깨진 링크 수정, 폐기된 Netlify Functions 코드·테스트·의존성 제거.
- **검증 완료**: tsc 0 에러, Vitest 41개 파일 268개 테스트 PASS, lint 0건, 정적 빌드 성공. 실기기 확인은 미수행.
- **다음 단계**: Dispatch Queue Step 3(Claude 모델 분배 기준 수립) 추가 배정 → Step 4 (Phase 12.19, Claude Sonnet).

## 모바일 UX 개선(일정 자동 줄바꿈, PWA short_name) 구현 및 Active Dispatch Queue 신규 과제 배정 (2026-10-28)

- **수행 주체**: Gemini 3.8 Flash (Maker - Fast UI) / Gemini 4 Argon (Orchestrator)
- **배경 및 개요**:
  - 사용자 요구사항에 따라 Fast UI 과제 2건(`12.16` 공식 일정 줄바꿈, `12.17` PWA `ChroLog` 단축)을 Gemini 3.8 Flash가 즉시 구현 및 단위 테스트 검증 완료.
  - 사용자의 Claude Pro 구독에 따라 Claude(Opus / Sonnet)의 토큰 여유 및 모델 선택 폭이 확장되었음을 지침에 반영하고, 모바일 UX 개선 및 소비 아코디언, SQL 문서 정리를 위한 신규 협업 Run(`mobile-ux-and-sql-consolidation`) 5단계 파이프라인을 `docs/handoff.md` 최상단 Dispatch Queue에 정식 배정.
- **수행 내역**:
  1. **Phase 12.17 / R7. 모바일 PWA 설치 시 홈 화면 표시 이름 `ChroLog` 단축 적용 (`public/manifest.json`, `src/app/layout.tsx`)**:
     - `public/manifest.json`: 앱 정식 명칭(`name: "ChronoLedger"`)은 보존하고 `short_name`을 `"ChroLog"`로 변경하여 모바일 Chrome 설치 시 홈 화면 아이콘 라벨 말줄임(`ChronoLe...`) 방지.
     - `src/app/layout.tsx`: `appleWebApp: { capable: true, title: "ChroLog", statusBarStyle: "black-translucent" }` 메타데이터를 추가하여 iOS/모바일 웹 앱 환경에서도 `"ChroLog"`로 표시되도록 보장.
  2. **Phase 12.16 / R6. 공식 일정 보기에서 "/" 구분자 입력 시 자동 줄바꿈 표시 (`src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`)**:
     - `/dashboard/games` 내 공식 일정 중앙 팝업 다이얼로그에서 일정 제목(`sch.title`) 및 메모(`sch.memo`)에 `"/"`가 포함된 경우 `split("/").map(p => p.trim()).filter(Boolean)`으로 분리하여 각 줄 단위 블록(`span className="block"`)으로 세로 줄바꿈 렌더링하도록 개선.
     - `src/app/dashboard/games/page.test.tsx`에 `"/"` 구분자 포함 일정 제목 및 메모가 블록 요소로 분리되어 렌더링되는지 검증하는 단위 테스트 추가 (13개 테스트 PASS).
  3. **Claude Pro Opus / Sonnet 구독 반영 및 지침 보완 (`.agents/rules/collaboration.md`, `CLAUDE.md`, `AGENTS.md`)**:
     - 사용자의 Claude Pro 구독으로 Opus, Sonnet을 난이도와 토큰 효율에 맞춰 운용:
       - **Claude Opus**: 고난도 복합 상태·브라우저 생명주기 제어(History API 등), 아키텍처 리팩토링, 심층 정적 코드 리뷰 및 Argon / Codex 1순위 Fallback 전담.
       - **Claude Sonnet**: 명확히 구체화된 다중 컴포넌트 UI 인터랙션·상태 연동 및 단위 테스트 고속 구현 전담.
  4. **Active AI Collaboration Dispatch Queue 신규 과제 배정 (`docs/handoff.md`)**:
     - Run ID `mobile-ux-and-sql-consolidation` (Step 1: Gemini 3.8 Flash `DONE`, Step 2: Claude Opus `READY`, Step 3: Claude Sonnet `PENDING`, Step 4: GPT Codex `PENDING`, Step 5: Claude Opus / Gemini 4 Argon `PENDING`).
  5. **문서 동기화**: `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md` 갱신.
- **검증 완료**:
  - Vitest `src/app/dashboard/games/page.test.tsx` 13개 테스트 통과.
  - TypeScript 타입 검사(`npx tsc --noEmit`) 0 에러.

## Claude Code 및 범용 에이전트 자동 인식 설정(CLAUDE.md, AGENTS.md) 및 구버전 경로 최신화 (2026-10-28)

- **배경 및 목적**:
  1. Claude Code(VS Code 확장 및 데스크톱 앱)와 GPT Codex, OpenCode 등 다양한 에이전트가 프로젝트 루트를 열었을 때 `.agents/` 규칙 및 5대 AI 모델 협업/인수인계 아키텍처를 100% 자동 인식하도록 루트 진입점 파일(`CLAUDE.md`, `AGENTS.md`) 구축.
  2. 과거 `md/` 폴더 정리 이후 남아 있던 지침 및 스킬 파일 내 구버전 경로 참조를 실제 유효 경로(`.agents/rules/`, `docs/spec/`, `sql/`, `docs/design-previews/`, `docs/archive/`)로 일괄 최신화.
- **수행 내역**:
  1. **`CLAUDE.md` 신규 생성**:
     - Claude Code 전용 루트 지침 파일 생성 및 최상단 `@` 문법으로 5개 핵심 규칙 파일(`language.md`, `collaboration.md`, `handoff.md`, `agent_rules.md`, `document_location.md`) 링크 임포트.
     - Claude(Claude Opus 5.5 / Sonnet)의 기본 역할(`Reviewer & Maker (Complex)`) 및 1순위 대체 역할(Argon 및 Codex 토큰 소진 시 승계) 명시.
     - `"인수인계 문서를 확인해"` 6단계 자동 실행 프로토콜 및 프로젝트 주요 권위 문서/경로 명시.
  2. **`AGENTS.md` 신규 생성**:
     - GPT Codex, OpenCode 등 범용 에이전트 자동 인식을 위해 `.agents/rules/*.md` 및 `.agents/skills/*/SKILL.md` 우선 참조 연결.
     - 5대 AI 모델 역할 분배표(Role Matrix & Fallback chain), 5단계 실행 프로토콜, 프로젝트 경로 안내 수록.
  3. **구버전 경로(`md/...`) 최신화**:
     - `.github/copilot-instructions.md`: `md/` 참조를 `.agents/rules/`, `docs/spec/`, `sql/`, `docs/design-previews/`, `docs/archive/` 경로로 전면 수정.
     - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.agents/skills/chronoledger-maker/SKILL.md`, `.agents/skills/chronoledger-reviewer/SKILL.md`: `md/` 참조를 `.agents/rules/collaboration.md`, `.agents/rules/handoff.md`, `.agents/rules/agent_rules.md`로 수정.
- **검증 완료**:
  - `markdownlint-cli` 0건 통과 (MD004, MD025, MD022, MD032, MD031, MD058, MD009, MD012, MD047, MD040 전체 오류 0건).
  - TypeScript 타입 검사(`npx tsc --noEmit`) 0 에러.

## 게임별 상시 메모 기능 추가: user_games.memo 확장 및 /dashboard/games 카드 연동 (2026-10-27)

- **배경 및 사용자 요구사항**:
  1. **게임 단위 상시 메모 필요성**: 특정 일정(`game_schedules`)에 종속되지 않고 구독 게임 자체(`user_games`)에 대해 상시 메모(예: 계정 정보, 파밍 목표, 특이사항 등)를 자유롭게 남길 수 있는 기능 요구.
  2. **구독 게임 카드 직관적 편집**: `/dashboard/games` (내 게임 관리) 페이지의 각 구독 게임 카드에서 별도 페이지 이동 없이 바로 상시 메모를 열람하고 인라인으로 작성·수정·삭제할 수 있는 UI 구현.
- **수행 내역**:
  1. **스키마 확장 및 마이그레이션 (`sql/SCHEMA.sql`, `sql/MIGRATION_USER_GAME_MEMO.sql`)**:
     - `public.user_games` 테이블에 `memo TEXT` 컬럼 추가 (`ALTER TABLE public.user_games ADD COLUMN IF NOT EXISTS memo TEXT;`).
  2. **`/dashboard/games` 상시 메모 팝업 다이얼로그(`Dialog`) 전환 및 카드 높이 균일화 (`src/app/dashboard/games/page.tsx`)**:
     - `UserGameRow` 타입 및 `supabase.from("user_games").select(...)` 쿼리에 `memo` 추가.
     - 상시 메모 작성/수정 방식을 카드 내부 인라인 편집에서 `[일정 보기]`와 일관된 **중앙 팝업 다이얼로그(`Dialog`)**로 전환하여 작성 편의성 향상 및 카드 찌그러짐 원천 방지.
     - 팝업 내부 입력 필드(`Textarea`) 크기를 `h-56 max-h-56 resize-none overflow-y-auto`로 고정하여 내용 초과 시 내부 세로 스크롤로 깔끔하게 처리.
     - 구독 게임 카드 내부의 메모 표시 영역 및 미작성 안내 버튼에 `h-20` 고정 높이와 `overflow-y-auto`를 부여하여 그리드 내 모든 카드의 세로 크기를 균일하게 정돈.
     - 저장 핸들러에서 앞뒤 공백 제거(`trim`) 후 빈 문자열은 `null`로 처리하여 Supabase `.update({ memo: trimmed || null }).eq("id", ug.id).eq("user_id", user.id)`로 본인 소유 행만 안전하게 갱신하고, 성공 시 로컬 상태(`userGames`) 즉시 동기화.
     - 구독 게임 목록 하단 페이지네이션 컨테이너에 `flex-wrap justify-center` 적용으로 모바일 뷰포트 가로 스크롤 방지.
  3. **단위 테스트 작성 (`src/app/dashboard/games/page.test.tsx`)**:
     - 상시 메모 렌더링, 신규 작성 및 저장 시 `id`/`user_id` 스코프와 `trim` 검증, 기존 메모 삭제 시 `null` 저장 검증, 취소 시 미호출, 저장 실패 시 `alert` 노출 및 편집창 유지 등 5개 단위 테스트 케이스 추가.
  4. **ESLint 빌드 에러 해결 및 Service Worker 캐시 범프 (`src/app/dashboard/games/page.tsx`, `public/sw.js`)**:
     - `/dashboard/games` `loadGames` 내 `let` 변수를 `const`로 수정하여 `prefer-const` ESLint 빌드 에러 해결.
     - PWA Service Worker `SHELL_CACHE` 버전을 `v4`(`chronoledger-shell-v4`)로 범프하여 신규 정적 자산 즉시 갱신 및 Cloudflare Pages 배포 정상화.
  5. **일정·상태 배지 줄바꿈 잘림 해결 (`src/app/dashboard/games/page.tsx` 등)**:
     - 공식 일정 모달 및 일정/상태 배지에 `shrink-0 whitespace-nowrap`, 제목 컨테이너에 `min-w-0 flex-1 break-words`를 적용하여 긴 일정 제목에서도 배지가 세로로 분리되거나 줄바꿈되는 현상 해결.
  6. **소비 페이지 과거 기록 내림차순 정렬 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
     - `pastExpenses`를 최신 과거 일자 순(내림차순)으로 정렬하여 사용자 탐색성 개선 및 단위 테스트(18개 PASS) 보강.
- **검증 완료**:
  - 커밋 `53fbd26` (Gemini 3.8 Flash 스키마 및 UI 구현), `d75310d` (Claude Opus 5.5 단위 테스트 보강) 및 후속 보완 커밋 완료.
  - Vitest 42개 파일, 267개 단위 테스트 100% 통과 (PASS, `src/app/dashboard/games/page.test.tsx` 12개, `src/app/dashboard/expenses/page.test.tsx` 18개 PASS).
  - TypeScript 타입 검사(`npx tsc --noEmit`) 0 에러.
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.
  - Gemini 4 Argon 독립 정적 코드 리뷰 완료 (`c60c91d..d75310d`, 수용 기준 및 정합성 PASS).

## 구글 플레이 포인트 적립 누락 버그 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계 (2026-10-26)

- **배경 및 사용자 요구사항**:
  1. **포인트 미사용 결제 시 스토어 포인트 적립 누락 버그 해결**: 기존 `ExpenseModal`에서 포인트를 사용하지 않고 결제할 때(`usedPoints === 0`) `pointPlatform: null`이 전달되어 `process_expense_payment` RPC에서 적립 대상 스토어 플랫폼을 판별하지 못하고 적립이 0P로 누락되던 결함 수정.
  2. **구글 플레이 부스트 이벤트 고정 수식 재설계**: 기존 수식이 등급별 적립률(`baseEarnRate`)의 배수로 동작하던 문제를 바로잡고, 실제 구글 플레이 부스트 규칙에 맞춰 등급과 무관하게 **1,000원당 `n`포인트(`0.1% × n배`)**로 고정 적립률을 계산하도록 재설계.
  3. **스토어 지갑 미생성 안전망 보강**: 첫 결제 시 `store_wallets` 행이 존재하지 않아도 기본 등급(`BRONZE` / `GENERAL`)으로 자동 생성하여 예외 없이 적립이 진행되도록 RPC 보강.
- **수행 내역**:
  1. **포인트 미사용 결제 시 스토어 플랫폼 전달 및 예정 지출 복원 보강 (`src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
     - `ExpenseModal`의 `input` 계산 시 `usedPoints === 0`인 경우에도 `pointPlatform: activePointPlatform`을 정상 전달하여 `process_expense_payment` RPC에 `p_point_platform`이 누락되지 않도록 수정.
     - 예정 지출(`PLANNED`) 생성 및 수정 시 `point_platform: activePointPlatform`을 저장하고, 모달 재오픈 시 `resolveStorePlatform`을 통해 선택된 스토어 플랫폼이 정확히 복원되도록 보완 (`page.tsx` 연동 보강).
     - 구글 플레이 부스트 안내 문구를 `"이벤트 고정: 1,000원당 {n}P ({effectiveRate}%)"`로 직관적으로 개편.
  2. **구글 플레이 부스트 이벤트 고정 적립률(`0.1% × n배`) 재설계 (`src/lib/payment-calculations.ts`)**:
     - `GOOGLE_BOOST_BASE_RATE = 0.1` 상수를 정의하고, `calculateStoreEventEarn`에서 `GOOGLE_PLAY` 부스트 시 등급별 `baseEarnRate`와 무관하게 `effectiveRate = Number((0.1 * mult).toFixed(4))`로 고정 계산하고 `Math.floor((finalAmount * effectiveRate) / 100)`를 반환하도록 수식 변경 (예: 4배 부스트 시 5,900원 결제 $\to$ `23P`, 100,000원 결제 $\to$ `400P`).
  3. **DB RPC 지갑 자동 생성 안전망 보강 (`sql/SCHEMA.sql`, `sql/MIGRATION_STORE_EVENT_EARN.sql`)**:
     - `process_expense_payment` RPC에서 `p_used_points = 0`이고 `v_store_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')`일 때 대상 `store_wallets` 레코드가 없으면 기본 등급(`GOOGLE_PLAY`: `'BRONZE'`/`0.10`, `GALAXY_STORE`: `'GENERAL'`/`0.10`)으로 자동 삽입(`ON CONFLICT DO NOTHING`)한 후 적립하도록 안전망 구축.
  4. **단위 테스트 업데이트 및 검증 (`src/lib/payment-calculations.test.ts`, `src/components/expense/expense-modal.test.tsx`)**:
     - 변경된 부스트 고정 계산식 단위 테스트 갱신 (10개 PASS) 및 포인트 미사용 결제 시 `p_point_platform` 전달 검증 케이스 보강 (24개 PASS).
- **검증 완료**:
  - Vitest 42개 파일, 262개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.
  - 커밋 `7307b99` (Claude Opus 5.5 구현), Gemini 4 Argon 독립 정적 코드 리뷰 완료 (정합성 및 수용 기준 PASS).

## 모바일 화면 UI 오버플로우 3건 해결 및 향후 과제 4종 로드맵 수립 (2026-10-26)

- **배경 및 사용자 요구사항**:
  - 모바일 소형 뷰포트에서 발생하던 UI 화면 이탈(Overflow) 3건(수동 보정 내역 모달, 관리자 페이지네이션, 소비 페이지 픽업 과금 분석 카드)을 해결하고, 구글 포인트 적립 누락 버그 해결을 포함한 향후 로드맵 4종을 수립·동기화.
- **수행 내역**:
  1. **공통 다이얼로그 및 수동 보정 내역 모달 모바일 화면 이탈 방지 (`src/components/ui/dialog.tsx`, `src/components/wallet/store-wallet-adjust-history-modal.tsx`)**:
     - `DialogContent`의 grid 직계 자식 `min-width: auto` 팽창 방지를 위해 `grid-cols-1 overflow-x-hidden p-4 sm:p-6` 적용.
     - `StoreWalletAdjustHistoryModal`의 `DialogContent`에 `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강.
     - `DialogHeader` 내부 헤더 컨테이너에 `pr-7 min-w-0` 및 텍스트 래퍼에 `min-w-0`, `break-words`를 적용하여 우측 상단 닫기(`X`) 버튼과의 겹침 및 화면 밖 밀림 방지.
     - 플랫폼 필터 바(`ALL`, `GOOGLE_PLAY`, `GALAXY_STORE`, `NAVER_PAY`) 컨테이너를 `flex flex-wrap items-center gap-1.5 min-w-0`으로 변경하여 모바일에서 '네이버페이' 버튼이 잘리지 않고 자연스럽게 줄바꿈되도록 개선.
     - 내역 리스트 영역과 개별 레코드 카드에 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 영역 `shrink-0` 적용.
  2. **관리자 페이지 및 소비 페이지 페이지네이션 모바일 반응형 개선 (`src/app/admin/page.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
     - `/admin` 공식 일정 및 게임 목록 하단 페이지네이션 컨테이너를 `flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full`로 변경.
     - 페이지 번호 버튼 컨테이너를 `flex flex-wrap items-center justify-center gap-1`로 변경하고, 번호 버튼 크기를 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼을 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs`로 축소 최적화하여 좁은 모바일 화면에서도 좌우 여백을 침범하지 않도록 처리.
     - `/dashboard/expenses` 지출 내역 탭 및 구독 탭 하단 페이지네이션 컨테이너에도 `flex-wrap justify-center` 적용.
  3. **소비 페이지 픽업별 과금 분석 & 순위 카드 모바일 우측 잘림 해결 (`src/app/dashboard/expenses/page.tsx`)**:
     - 페이지 최상위 컨테이너에 `w-full overflow-x-hidden`을 추가하여 모바일 가로 스크롤 및 쏠림 현상 원천 차단.
     - `게임 픽업별 과금 분석` 카드 내부 좌측 차트 영역(`lg:col-span-7`)과 우측 순위 카드 영역(`lg:col-span-5`)에 `min-w-0 w-full overflow-hidden` 적용.
     - 픽업 순위 리스트 각 행 좌측 컨테이너를 `flex items-center gap-2 min-w-0 flex-1 overflow-hidden`으로 수정하여 긴 픽업 이름(예: "치사 + 유노 + 여우의 별자리") 및 `동시 픽업` 배지가 카드 우측 금액/비중 영역을 밀어내지 않고 자연스럽게 말줄임(`truncate`)되도록 개선.
  4. **지출 내역 테스트 KST 기준일 모킹 보강 (`src/app/dashboard/expenses/page.test.tsx`)**:
     - `sampleExpenses` 기준일(`2026-10-15`)로부터 7일 경과 시(`today > 2026-10-22`) 모든 항목이 과거 지출(`pastExpenses`)로 분류되어 테스트가 실패하던 현상을 해결하기 위해 `mockGetKstToday: vi.fn(() => "2026-10-15")` 고정 모킹 추가.
  5. **로드맵 문서 동기화 (`docs/to-do.md`)**:
     - Phase 12 하단 `12.11 모바일 화면 UI 오버플로우 해결` 완료 기록.
     - `## 향후 / 진행 로드맵 (Active & Planned Roadmap)` 섹션에 과제 4종(R1 완료, R2 GPT Codex 할당 예정, R3 대기, R4 장기 백로그) 신설.
- **검증 완료**:
  - Vitest 42개 파일, 260개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 페이지 export 성공.

## 모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  - 모바일 달력 타일에서 우측 상단에 노출되는 게임 일정(버전, 픽업, 콘텐츠) 및 메모 도트의 정렬 방식을 기존 가로 정렬(`flex items-center`)에서 데스크톱과 일치하는 세로 정렬(`flex flex-col items-end`)로 변경.
  - 모바일 뷰포트에서 날짜 숫자 및 배지와의 레이아웃 간섭을 방지하고 우측 상단에 도트들이 세로로 정돈되어 표시되도록 최적화.
- **수행 내역**:
  1. **`src/components/calendar/desktop-calendar.tsx`**:
     - 모바일 도트 컨테이너 클래스를 `flex md:hidden items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5`에서 `flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`로 변경하여 수직 나열 및 우측 정렬 적용.
  2. **단위 테스트 검증 보강 (`src/components/calendar/desktop-calendar.test.tsx`)**:
     - 모바일 도트 렌더링 검증 테스트 케이스에 부모 컨테이너의 세로 정렬 클래스(`flex-col`, `items-end`, `gap-1`) 존재 여부 단언 추가.
  3. **검증 완료**:
     - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
     - Next.js 14 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 export 정상 생성).

## Google OAuth 로그인 UI 피드백 및 콜백(/auth/callback) 페이지 다크 테마 카드 레이아웃 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  1. **Google 로그인 버튼 로딩 피드백 강화**:
     - 기존 `/auth` 페이지에서 Google 계정으로 로그인 버튼 클릭 시 비활성화만 이루어지고 시각적 회전 스피너나 안내 문구가 없어 사용자가 진행 여부를 명확히 인지하기 어려웠음.
     - `loading === true`일 때 버튼 내부에 `Loader2` 회전 스피너(`mr-2 h-5 w-5 animate-spin text-slate-900`)와 `"Google 연결 중..."` 텍스트를 노출하도록 개선 (기존 `disabled={loading}` 유지).
  2. **콜백 페이지 다크 테마 및 카드 레이아웃 일원화**:
     - 기존 `/auth/callback` 페이지는 로그인 화면의 일관된 다크 테마 디자인 시스템과 분리된 채 밋밋한 텍스트로만 렌더링되던 시각적 결함이 존재함.
     - 컨테이너에 `data-theme="dark"`, `bg-app`, `text-content` 스타일을 적용하고, `@/components/ui/card`의 `Card`, `CardHeader`, `CardTitle`, `CardContent` 컴포넌트를 사용하여 로그인 화면과 완벽히 통일된 중앙 카드 레이아웃 구성.
     - 인증 진행 중: `CardHeader`에 브랜드 타이틀("ChronoLedger") 및 서브카피("게임 일정과 지출을 한 곳에서 관리하세요.") 렌더링, `CardContent`에 `Loader2` 회전 스피너(`animate-spin text-primary`)와 `role="status"` 안내 문구("Google 인증을 확인하고 있습니다..."), 보조 문구("잠시 후 대시보드로 이동합니다.") 노출.
     - 에러 발생 시: `AlertCircle` 아이콘(`text-danger`), 에러 메시지(`role="alert" text-danger`), `<Button variant="outline" asChild><a href="/auth">로그인 화면으로 돌아가기</a></Button>` 구성.
     - 기존 셀렉터(`role="status"`, `role="alert"`, `a[href="/auth"]`) 100% 호환 유지.
- **수행 내역**:
  1. **`src/app/auth/page.tsx`**:
     - `Loader2` lucide 아이콘 추가 및 Google 로그인 버튼 내부 조건부 렌더링 (`loading ? <Loader2 ... /> Google 연결 중... : Google SVG 로고 + Google 계정으로 로그인`).
  2. **`src/app/auth/callback/page.tsx`**:
     - 다크 테마 컨테이너(`data-theme="dark" bg-app text-content`) 및 `Card` 중앙 레이아웃 일원화.
     - 진행 중 `Loader2` 회전 스피너, `role="status"` 텍스트, 보조 문구 반영 및 에러 상태 `AlertCircle` + `role="alert"` + outline 버튼 일원화.
  3. **단위 테스트 보강**:
     - `src/app/auth/page.test.tsx`: Google 로그인 버튼 클릭 시 로딩 스피너(`.animate-spin`), `"Google 연결 중..."` 텍스트 노출 및 버튼 `disabled` 비활성화 검증 테스트 케이스 추가.
     - `src/app/auth/callback/page.test.tsx`: `globalThis.IS_REACT_ACT_ENVIRONMENT = true` 설정 및 인증 진행 중 로딩 스피너(`.animate-spin`), 브랜드 타이틀, `role="status"` 텍스트 렌더링 검증 테스트 케이스 추가.
  4. **검증 완료**:
     - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
     - Next.js 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 export 정상 생성).

## Google OAuth 로그인 UI 개선 및 OAuth 콜백 화면 디자인 시스템 통일 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. **Google OAuth 로그인 버튼 디자인 및 인터랙션 피드백 개선**:
     - Google 공식 4색(Blue, Green, Yellow, Red) 'G' 멀티컬러 SVG 아이콘을 적용하여 브랜드 일관성을 확보하고, 버튼 클릭 시 로딩 스피너(`Loader2`)와 "Google 연결 중..." 텍스트를 제공해 사용자 피드백을 향상.
  2. **OAuth 콜백 처리 화면 디자인 시스템 통일**:
     - `/auth/callback` 화면의 UI를 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`) 및 `Card` 컴포넌트 기반으로 리팩토링.
     - "ChronoLedger" 브랜드 타이틀, 부드러운 스피너, 진행 안내 문구(`role="status"`), 에러 발생 시 경고 카드(`role="alert"`) 및 [로그인 화면으로 돌아가기] 버튼을 제공하여 일관된 UX 제공.

- **수행 내역**:
  1. **`src/app/auth/page.tsx`**:
     - Google 공식 4색(Blue `#4285F4`, Green `#34A853`, Yellow `#FBBC05`, Red `#EA4335`) 'G' 멀티컬러 SVG 아이콘 컴포넌트(`GoogleIcon`) 추가.
     - OAuth 요청 진행 중(`loading === true`) 버튼 내부에 `Loader2` 회전 스피너와 `"Google 연결 중..."` 텍스트 제공 및 `disabled` 처리로 중복 클릭 방지.
  2. **`src/app/auth/callback/page.tsx`**:
     - 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`) 및 `Card` 컴포넌트 기반 레이아웃 통일.
     - "ChronoLedger" 브랜드 타이틀 및 서브텍스트 배치.
     - 정상 세션 교환 진행 중: `Loader2 animate-spin` 스피너 및 `role="status"` 상태 안내 문구 제공.
     - 인증 오류 발생 시: `AlertCircle` 아이콘, `role="alert"` 에러 메시지, [로그인 화면으로 돌아가기] 버튼 제공.
  3. **`src/app/auth/page.test.tsx` & `src/app/auth/callback/page.test.tsx`**:
     - 공식 4색 SVG 아이콘 및 로딩 스피너/"Google 연결 중..." 상태 검증 단위 테스트 2건 추가.
     - 콜백 페이지 브랜드 타이틀, 스피너, `role="status"` 안내 문구 노출 검증 단위 테스트 추가.
  4. **전체 검증 완료**:
     - Vitest 42개 파일, 259개 테스트 전체 통과 (에러 0건, 100% PASS).
     - `npm run build` Next.js 14 정적 15개 페이지 export 빌드 성공.

## 관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달(Past Schedules Dialog) 신규 구현 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. **/admin 및 /admin/requests 중복 네비게이션 정리**:
     - `AdminLayout`에서 상단 헤더 탭([일정 관리] / [요청 관리])을 이미 전역으로 제공하므로 각 페이지 내부의 중복 상단 배너 박스(데이터 제안 대기열/관리자 콘솔 바로가기) 제거하여 UI 레이아웃 정돈.
  2. **/admin [지난 일정] 버튼 및 중앙 팝업 다이얼로그(Past Schedules Dialog) 신규 구현**:
     - 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘) 추가.
     - 클릭 시 중앙 팝업 다이얼로그(`Dialog`)가 열리며 `end_date < today`인 과거 일정 목록을 Supabase `.lt("end_date", today)` 쿼리로 로드.
     - 다이얼로그 내에서 게임별 필터링, 검색, 페이지네이션(8개/페이지) 지원.
     - 각 지난 일정 카드에서 [수정], [삭제] 가능하며, 기존 수정 폼 모달 및 삭제 확인 모달과 완벽히 연동(수정/삭제 후 지난 일정 모달로 안전하게 복귀 및 목록 자동 갱신).

- **수행 내역**:
  1. **`src/app/admin/requests/page.tsx` & `src/app/admin/page.tsx`**:
     - `AdminLayout` 전역 탭과 중복되던 각 페이지 본문 상단 배너 박스 제거 및 불필요해진 `Link`, `ArrowLeft`, `ArrowRight` 임포트 정리.
  2. **`src/app/admin/page.tsx`**:
     - 툴바에 [지난 일정] 버튼(`History` 아이콘) 추가.
     - `isPastModalOpen`, `pastSchedules`, `isLoadingPastSchedules`, `pastGameFilter`, `pastSearchQuery`, `currentPastPage`, `returnToPastModal` 상태 및 `PAST_SCHEDULES_PER_PAGE = 8` 정의.
     - `fetchPastSchedules`: KST 오늘(`getKstToday()`) 기준 `.lt("end_date", today).order("end_date", { ascending: false })`로 만료된 일정 목록 비동기 조회.
     - 게임 필터 및 검색어 필터링(`filteredPastSchedules`), 페이지네이션(`paginatedPastSchedules`) 연동.
     - 지난 일정 모달 내 카드별 [수정] (`handleEditFromPast`), [삭제] (`handleDeleteFromPast`) 핸들러 구현 및 `returnToPastModal` 플래그를 통한 모달 상호작용(수정/삭제 취소나 완료 시 지난 일정 모달 자동 복귀 및 목록 갱신) 확립.
     - 지난 일정 전용 다이얼로그(`DialogContent className="max-w-3xl"`) 렌더링.
  3. **`src/app/admin/page.test.tsx`**:
     - `createQueryBuilder`에 `lt` 모의 메서드 지원 추가.
     - [지난 일정] 모달 오픈 및 `.lt("end_date", today)` 쿼리 호출, 게임/검색 필터링 검증 단위 테스트 추가.
     - 지난 일정 모달 내 [수정] 클릭 시 수정 폼 모달 오픈 및 저장 시 업데이트 검증 단위 테스트 추가.
     - 지난 일정 모달 내 [삭제] 클릭 시 삭제 확인 모달 오픈 및 삭제 실행 검증 단위 테스트 추가.
  4. **전체 검증 완료**:
     - `src/app/admin/page.test.tsx` 15개 단위 테스트 통과.
     - Vitest 42개 파일, 256개 테스트 전체 통과 (에러 0건, 100% PASS).
     - `npm run build` Next.js 14 정적 15개 페이지 export 빌드 성공.

## 관리자 공식 일정 목록 만료 일정(end_date < today) 표시 제외 및 필터링 강화 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. `/admin` 페이지에서 등록된 공식 일정 목록 조회 시, KST 오늘 날짜 기준으로 이미 종료된(`end_date < today`) 일정이 목록에 함께 표시되어 진행 중이거나 예정된 공식 일정을 관리하기 불편한 문제 개선.
  2. Supabase 쿼리에서 `.gte("end_date", today)` 조건을 적용하고, 클라이언트 상태 저장 전 방어적 필터(`s.end_date >= today`)를 추가하여 목록·탭 배지·필터 카운트·페이지네이션에서 만료 일정을 완전히 제외.

- **수행 내역**:
  1. **`src/app/admin/page.tsx`**:
     - `@/lib/dashboard-date`의 `getKstToday`를 임포트하여 `fetchSchedules`에서 `today` 날짜 획득.
     - Supabase `game_schedules` 조회 쿼리에 `.gte("end_date", today)` 적용.
     - 클라이언트 측에서 `filter((s) => s.end_date >= today)` 방어 필터를 적용하여 `schedules` 상태에 만료 일정이 포함되지 않도록 보장.
  2. **`src/app/admin/page.test.tsx`**:
     - `createQueryBuilder`에 `gte` 모의 메서드 추가.
     - `@/lib/dashboard-date`의 `getKstToday`를 모킹(기본값 `"2026-09-01"`).
     - `end_date < today`인 만료 일정("아케론 복각")이 목록 및 카운트에서 제외되고, `end_date >= today`인 일정만 정상 노출되며 `gte("end_date", today)`가 호출되는지 검증하는 신규 단위 테스트 추가.

## 모바일 초소형 뷰포트(360px 이하) 달력 타일·배지 최적화 및 날짜 타일 터치 시 바텀시트 즉시 연동 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. **모바일 달력 타일 다중 일정 요약 표시 (도트 색상 분리)**:
     - 모바일(`< md`)에서는 상단 우측 도트 방식을 유지하되, 게임 일정 시작일(`is_start_date`)에 대해 일정 유형별 색상(`VERSION`: 초록 `bg-success`, `PICKUP`: 파랑 `bg-primary`, `CONTENTS`: 보라 `bg-purple-500`)으로 점을 나란히 분리 표시.
  2. **360px 이하 초소형 화면에서 두 자리 날짜와 `'오늘'` 배지/도트 겹침 해결**:
     - 모바일(`< md`)에서는 오늘 타일 테두리만 금색(`#EFBF04`)으로 강조하고, `'오늘'` 글자 배지는 데스크톱(`md+`)에서만 표시(`hidden md:inline-flex`).
  3. **모바일 달력 날짜 타일 터치 시 바텀시트 즉시 오픈**:
     - 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일을 터치하면 해당 날짜 선택과 동시에 `'선택일 상세'` 바텀시트(`MobileDrawer`)가 즉시 열리도록 연동(하단 `'선택일 상세'` 버튼도 함께 유지).

- **수행 내역**:
  1. **`src/components/calendar/desktop-calendar.tsx` & `src/components/calendar/desktop-calendar.test.tsx`**:
     - 모바일 상단 우측 도트를 `hasVersion`(`bg-success`), `hasPickup`(`bg-primary`), `hasContents`(`bg-purple-500`), `day.hasMemo`(`bg-content-muted`)로 분리하고 초소형 화면 간격(`gap-0.5 sm:gap-1`) 최적화.
     - 오늘 타일(`isToday`)에 `data-today="true"` 및 모바일 금색 테두리(`max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`) 적용, `'오늘'` 배지에 `hidden md:inline-flex` 적용.
  2. **`src/components/calendar/mobile-drawer.tsx` & `src/app/dashboard/page.tsx` & `src/app/dashboard/page.test.tsx`**:
     - `MobileDrawer`에 `open` 및 `onOpenChange` prop을 추가하고, `DashboardPage`에서 모바일(`< 900px`) 날짜 타일 클릭 시 `setIsMobileDrawerOpen(true)`가 호출되도록 연결.
     - 360px 모바일 뷰포트에서 날짜 타일 클릭 시 바텀시트가 즉시 열리는 단위 테스트 추가.
  3. **`src/components/calendar/calendar-game-filter.tsx`**:
     - 초소형 화면(320px~360px)에서 게임 필터 팝오버가 화면 좌우로 넘치지 않도록 `max-w-[calc(100vw-2rem)]` 추가.

## 대시보드 요약 카드 진행률, 100% 포인트 할인, 사이드바 드롭다운 탭 및 모바일 터치 개선 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. **요약 카드 UI 및 진행률 계산식 변경**:
     - 기존 월 예산 대비 진행률 대신, 당월 전체 예상 지출 중 이미 결제 확정한 지출 비율(`confirmedExpense / expectedExpense * 100`)로 진행률을 산출하고, 우측 하단에 잔여 예정 지출 금액(`Math.max(0, expectedExpense - confirmedExpense)`) 표시.
     - `src/lib/budget-calculations.ts`에 `calculateConfirmedExpense` 추가.
  2. **포인트 할인 100% 허용(방식 A) 및 결제 플랫폼별 포인트 차감 동기화**:
     - `uiDiscount`를 총 원화 할인액으로 취급하고 `uPoints`는 순수 차감 포인트 수량으로 취급하여 100% 포인트 할인(실결제액 0원) 허용 및 중복 차감 방지.
     - 결제 플랫폼(`GOOGLE_PLAY`, `GALAXY_STORE`)과 포인트 지갑을 1:1 강제 동기화하고, `OTHER` 선택 시 포인트 사용 비활성화 및 초기화.
  3. **사이드바 배치 순서 및 선택일 카드 드롭다운 탭 추가**:
     - 사이드바 카드 순서를 `1) 요약` $\to$ `2) 선택일 상세` $\to$ `3) 스토어 포인트`로 재배치.
     - 선택일 카드 헤더 바로 아래에 `게임 일정` / `지출 내역` / `메모`를 선택할 수 있는 `<select aria-label="선택일 상세 항목 선택">` 드롭다운을 배치하여 선택된 항목 1개만 본문에 렌더링.
  4. **모바일 바텀시트(`MobileDrawer`) 메모 미동작 해결 및 모바일 최적화**:
     - 바텀시트 제스처 간섭을 차단하기 위해 인터랙티브 요소에 `data-vaul-no-drag` 부여.
     - 메모 작성/수정 버튼 터치 영역 개선, 저장/취소 버튼에 `onPointerDown`/`onMouseDown` 이벤트 전파 방지 적용.
     - `MobileDrawer`와 `HeroSidebar`에 props 동기화 (`confirmedExpense`, `onIncomeAdded`).
     - `CalendarBgCustomizer` 모바일 팝오버 최대 너비(`max-w-[calc(100vw-2rem)]`) 및 슬라이더 터치 영역 개선.

- **수행 내역**:
  1. **`src/lib/budget-calculations.ts` & `src/lib/budget-calculations.test.ts`**:
     - `calculateConfirmedExpense(expenses, month)` 함수 추가 및 단위 테스트 추가.
  2. **`src/app/dashboard/page.tsx` & `src/app/dashboard/page.test.tsx`**:
     - `confirmedExpense` useMemo 계산 및 `HeroSidebar`, `MobileDrawer`에 전달.
     - 드롭다운 전환 기반 지출/메모 테스트 갱신 및 정상 통과.
  3. **`src/components/calendar/hero-sidebar.tsx` & `src/components/calendar/hero-sidebar.test.tsx`**:
     - 요약 카드 프로그레스 바 영역 구조 수정 (`진행률 n%` / `남은 예정 지출 원`).
     - 사이드바 카드 순서 `요약` $\to$ `선택일 상세` $\to$ `스토어 포인트`로 변경.
     - 선택일 카드에 `게임 일정` / `지출 내역` / `메모` 드롭다운 탭 추가 및 메모 수정/저장 기능 연결.
     - 바텀시트 제스처 간섭 방지를 위해 `data-vaul-no-drag`, 터치 타깃 개선 및 버튼 포인터 다운 이벤트 핸들러 추가.
  4. **`src/components/calendar/mobile-drawer.tsx`**:
     - `confirmedExpense`, `onIncomeAdded` props 추가 및 `HeroSidebarContent` 완전 동기화.
  5. **`src/components/calendar/calendar-bg-customizer.tsx`**:
     - 모바일 뷰포트 대응 `max-w-[calc(100vw-2rem)]` 및 슬라이더 터치 영역 개선.
  6. **`src/components/expense/expense-modal.tsx`, `src/lib/payment-calculations.ts`, `expense-modal.test.tsx`**:
     - 정가 100% 포인트 할인 허용 (방식 A 매핑 및 실결제액 0원).
     - 결제 플랫폼 변경 시 포인트 지갑 자동 동기화 (`GOOGLE_PLAY`, `GALAXY_STORE`).
     - `OTHER` 선택 시 포인트 입력 비활성화 및 즉시 리셋.
  7. **전체 검증 완료**:
     - `npx tsc --noEmit`: 무결점 통과 (0 errors).
     - `npx vitest run`: 42개 파일, 251개 테스트 전체 통과 (100% PASS).
     - `npm run build`: 15개 정적 페이지 빌드 및 Next.js export 성공.

## 5대 AI 모델 역할 분배 및 인수인계 문서 기반 자동 과제 실행·비상 인계(Fallback) 아키텍처 구축 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. 주축 모델인 **Gemini 4 Argon**을 중심으로 하위/협업 에이전트 모델인 **GPT Codex**, **Claude Opus 5.5**, **GitHub Copilot**, **Gemini 3.8 Flash**의 5대 AI 모델을 ChronoLedger 파이프라인(`Orchestrator` $\to$ `Maker` $\to$ `Reviewer`) 역할에 대입.
  2. 사용자가 어떤 AI 모델에서든 **`"인수인계 문서를 확인해"`**라고 입력하면, 각 AI 모델이 자신에게 할당된 과제를 스스로 찾아서 실행하고 다음 모델로 배턴을 넘기는 아키텍처 구현.
  3. 작업 도중 특정 모델의 토큰이나 컨텍스트가 소진될 경우, 대체(Fallback) 모델이 이어서 완수할 수 있도록 인수인계 문서에 상태와 체크포인트를 남기는 보완 체계 구축.
- **수행 내역**:
  1. **루트 `docs/handoff.md` 최상단 `Active AI Collaboration Dispatch Queue` 신설**:
     - 모든 모델이 공통으로 참조하는 머신 리더블(Machine-Readable) 작업 할당표, 5대 AI 역할 및 1·2순위 대체(Fallback) 매트릭스, 중단 체크포인트(`### 📌 중단 체크포인트`) 섹션을 `docs/handoff.md` 최상단에 고정 배치.
     - `.worktrees/<run_id>` 격리 실행 시 `New-CollaborationRun.ps1`을 먼저 실행해 Worktree를 만든 뒤 루트 `docs/handoff.md`에 작업 큐와 대상 경로를 기록하도록 순서 규격화.
  2. **`"인수인계 문서를 확인해"` 단일 프롬프트 트리거 및 2중 토큰 소진 복구 프로토콜 명문화**:
     - `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `md/SKILL.md`, `.github/copilot-instructions.md`에 5단계 자동 실행 프로토콜 반영.
     - **사전 감지 인계(Soft Checkpoint)**: 토큰 부족 감지 시 상태를 `⚠️ HANDOVER_NEEDED`로 전환하고 담당 모델 칸에 대체 모델을 표시한 뒤 완료/미완료 체크포인트를 기록.
     - **강제 중단 자동 복구(Hard Cutoff Auto-Recovery)**: API 쿼터 한도로 문서를 미처 수정하지 못하고 끊긴 경우에도, 대체 모델에서 `"인수인계 문서를 확인해"`를 입력하면 대상 Worktree의 `git status --short`와 `git diff`를 먼저 스캔해 미커밋 변경사항을 파악하고 남은 작업을 이어받도록 설계.
  3. **Orchestrator / Maker / Reviewer 스킬 프로필 동기화**:
     - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `chronoledger-maker/SKILL.md`, `chronoledger-reviewer/SKILL.md`에 5대 모델 라우팅 규칙 및 Dispatch Queue 상태 전이(`▶ READY` $\to$ `✅ DONE` / `⚠️ HANDOVER_NEEDED`) 연동.

## 캘린더 날짜별 개인 메모 저장 실패 결함 해결 및 UNIQUE 제약조건 마이그레이션 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. 날짜 타일 클릭 후 사이드바(데스크톱) 또는 모바일 드로어에서 작성한 메모가 저장되지 않는 문제 제기.
  2. 메모 저장/수정/삭제 시 DB 오류 없이 신뢰성 있게 저장되고, 캘린더 타일 인디케이터 도트와 사이드바에 즉각 반영될 것.

- **원인 분석**:
  - `personal_memos` 테이블 스키마에 `(user_id, memo_date)`에 대한 `UNIQUE` 제약조건이 누락되어 있었음.
  - `src/app/dashboard/page.tsx`의 `handleSaveMemo`에서 `.upsert(..., { onConflict: "user_id,memo_date" })`를 호출할 때 PostgreSQL이 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 예외를 발생시키며 저장이 거부됨.
  - `hero-sidebar.tsx`의 `handleSave`에서 에러 핸들링이 누락되어 실패 시 아무런 알림 없이 침묵함.
- **수행 내역**:
  1. **명시적 분기 로직(Update/Insert/Delete) 전환 및 낙관적 로컬 상태 반영 (`src/app/dashboard/page.tsx`)**:
     - DB 수준의 UNIQUE 제약조건 유무와 무관하게 100% 정상 작동하도록 기존 `upsert` 구문을 분기 처리:
       - 빈 내용(`!trimmed`): 기존 메모 삭제(`delete`).
       - 기존 메모 존재(`existingMemo`): `update` 호출 (`id` 또는 `user_id, memo_date` 기준).
       - 신규 메모: `insert` 호출.
     - `personal_memos` 조회 쿼리에 `id`를 포함하고 `MemoRow` 타입에 `id?: string` 추가.
     - 저장 요청 시 `setMemos`를 통한 낙관적 상태 갱신으로 타일의 메모 인디케이터 도트(`hasMemo`)와 사이드바가 지연 없이 즉각 동기화되도록 구현.
  2. **에러 핸들링 및 사용자 피드백 추가 (`src/components/calendar/hero-sidebar.tsx`)**:
     - `handleSave` 내부에 `try...catch`를 적용하여 네트워크/DB 예외 발생 시 `alert("메모 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")` 피드백 제공.
  3. **데이터베이스 스키마 및 마이그레이션 DDL 제공 (`md/SCHEMA.sql`, `md/MIGRATION_MEMO_UNIQUE.sql`)**:
     - `SCHEMA.sql`: `personal_memos` 테이블에 `CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)` 추가.
     - `MIGRATION_MEMO_UNIQUE.sql`: 기존 중복 데이터 정리(가장 최근 레코드 보존) 후 유니크 제약조건을 안전하게 추가하는 마이그레이션 스크립트 작성.
  4. **단위 테스트 및 빌드 무결점 검증**:
     - Vitest 42개 파일 241개 테스트 전체 통과 (100% PASS), Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 날짜 타일 내 당일(Today) 표기 골드 배지 추가 (2026-10-19)

- **배경 및 사용자 요구사항**:
  1. 캘린더 날짜 타일의 날짜 표기(ex. 17) 바로 오른쪽에 해당 날짜가 당일(today)일 경우 이를 시각적으로 명확히 인지할 수 있는 배지 추가 요청.
  2. 배지 색상은 `#EFBF04` (골드 옐로우) 적용 요청.
- **수행 내역**:
  1. **'오늘' 골드 배지 UI 렌더링 (`src/components/calendar/desktop-calendar.tsx`)**:
     - 타일 상단 좌측 날짜 숫자 바로 오른쪽에 `flex items-center gap-1`로 묶인 **`오늘`** 골드 배지 추가.
     - 사용자 요청 색상 반영: `backgroundColor: #EFBF04`, 글자색은 고대비 다크 텍스트 `color: #0F1115`로 조합하여 모든 테마(다크/라이트) 및 커스텀 일러스트 배경에서 최상의 시인성 확보.
     - `drop-shadow-sm` 및 아담한 패딩(`px-1 py-[1px] text-[8px] md:text-[9px]`)을 적용하여 우측의 게임 아이콘이나 메모/일정 도트와 영역 침범 없이 조화로운 레이아웃 구성.
  2. **오늘 날짜 인식 및 프로퍼티 연동 (`src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
     - `DesktopCalendarDay`에 `isToday?: boolean` 추가, `DesktopCalendarProps`에 `todayDate?: string` 추가.
     - `page.tsx`의 `days` useMemo 및 `DesktopCalendar` 내부에서 `getTodayLocalDate()`와 자동 비교/연동.
  3. **단위 테스트 및 빌드 무결점 검증**:
     - `src/components/calendar/desktop-calendar.test.tsx`에 오늘 날짜 타일의 `#EFBF04` 골드 '오늘' 배지 렌더링 및 비당일 타일 미렌더링 검증 테스트 추가 (6개 PASS).
     - Vitest 42개 파일 241개 테스트 전체 통과 (100% PASS), Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 시인성 대폭 개선: 글래스모피즘 타일, 날짜 타일 투명도(0~90%)·배경 투명도(10~90%) 개별 조절 및 가독성 섀도우 보강 (2026-10-18)

- **배경 및 사용자 요구사항**:
  1. 현재 적용된 상태로는 배경의 일러스트가 날짜 타일 색상(`bg-app/75`) 및 오버레이에 가려져 제대로 보이지 않는 현상 개선 요청.
  2. 제안된 방안 중 **글래스모피즘 반투명 타일 전환 + 투명도 상한 90% 확대**에 더해 **텍스트 및 일정 배지 가독성 보강**을 함께 적용.
  3. 직전 작업이 문제 없이 이루어졌는지 정밀 점검하고, **날짜 타일의 투명도를 직접 조절하는 기능(`tileOpacity`, 0% ~ 90%)**을 추가하도록 요청.
- **수행 내역**:
  1. **직전 작업 코드 정밀 점검 및 세부 결함 보완**:
     - `DesktopCalendar`: 날짜 타일 숫자 `<span>`에 고정되어 있던 `text-content`로 인해 커스텀 배경 시 이전/다음 달 날짜(`!day.inCurrentMonth`)의 `text-content-muted` 색상이 덮어써지던 문제를 수정하여 당월/타월 색상 구분 유지.
     - `DesktopCalendar`: 배경 투명도 폴백 기본값을 `25`에서 `DEFAULT_CALENDAR_BG_SETTINGS.opacity`(`40`)로 일치시킴.
     - `CalendarBgCustomizer`: Tailwind 설정에 없던 `hover:bg-surface-1` 클래스를 정상 토큰인 `hover:bg-surface`로 정정.
     - `docs/to-do.md`: 누락되어 있던 Phase 12.3의 최신 사양(90% 상한, 타일 투명도, 오버레이 15%) 동기화 완료.
  2. **날짜 타일 투명도(`tileOpacity`, 0% ~ 90%) 조절 기능 구현 (`src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
     - `CalendarBgSettings`에 `tileOpacity` 추가 (범위 `0% ~ 90%`, 기본값 `15%`), `clampTileOpacity` 순수 함수 및 IndexedDB 영구 저장·복원·초기화 연동.
     - `[배경 커스텀 설정]` 팝오버에 **`날짜 타일 투명도` 슬라이더(`투명하게 0%` ~ `진하게 90%`)** 추가.
     - `DesktopCalendar`의 비선택 날짜 타일에 `backgroundColor: rgb(var(--surface) / ${tileOpacityRatio})`를 동적 적용하고, `0%`일 때는 `backdrop-blur`도 제거하여 완전 투명 타일을 지원하며 호버 시 `hover:ring-1 hover:ring-primary/30`으로 깔끔한 포커스 피드백 제공.
  3. **배경 투명도 상한선 90% 확대, 원본 업로드 한도 50MB 확대 및 가독성 섀도우 보강**:
     - `MAX_BG_OPACITY = 90`, `DEFAULT_BG_OPACITY = 40`, 가독성 보호 오버레이 `bg-surface/15` 적용.
     - 고해상도 대용량 일러스트(15MB 초과)가 리사이징을 거치지 못하고 거절당하던 문제를 해결하기 위해 업로드 허용 한도를 15MB $\to$ **50MB**로 확대.
     - 날짜 숫자(`drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] font-bold`), 요일 헤더(`drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-medium`), 일정 배지(`drop-shadow-sm`), 아이콘 및 도트(`ring-1 ring-background/60 shadow-sm`) 대비 보강.
  4. **단위 테스트 및 정적 빌드 검증**:
     - `src/lib/calendar-bg-storage.test.ts` (6개 PASS), `src/components/calendar/calendar-bg-customizer.test.tsx` (1개 PASS), `src/components/calendar/desktop-calendar.test.tsx` (5개 PASS) 갱신.
     - Vitest 42개 파일 240개 테스트 100% 통과, Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 이미지 업로드·투명도/블러 조절 구현, 사용자 지정 게임 아이콘 전역 적용 및 픽업 그래프 다중 색상 적용 (2026-10-17)

- **배경 및 사용자 요구사항**:
  1. 변경 내역(`docs/changelog.md`) 및 인수인계 문서(`docs/handoff.md`)를 확인하여 프로젝트 최신 상태 파악.
  2. 게임 아이콘에 사용자 지정 이미지를 적용하는 로직이 `/dashboard/games`에만 표시되고 다른 아이콘 표시 기능에는 적용되지 않는 문제 해결 — 최소한 달력 타일(`/dashboard`)과 소비 페이지(`/dashboard/expenses`)에서 정상 작동하도록 개선 요구.
  3. 게임 픽업별 과금 분석의 그래프 색상이 단일 색상으로 되어 있어 구분되지 않는 문제를 해결하기 위해, 픽업 배너별로 다양한 그래프 색상을 적용하여 시각적 구분을 명확히 할 것 요구.
  4. `Phase 12.3` **캘린더 커스텀 배경 이미지 업로드 및 투명도/블러 조절 기능** 구현 요구.
- **수행 내역**:
  1. **캘린더 커스텀 배경 이미지 업로드 및 투명도/블러 조절 구현 (`src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
     - 브라우저 로컬 저장소(`IndexedDB` `chronoledger_calendar_bg` 및 메모리 폴백)에 사용자별 배경 이미지 `Blob`, 투명도(`10%~60%` 상한 제한), 블러 효과(`OFF` / `LOW` / `MEDIUM`)를 영구 저장·복원·초기화하도록 구현하여 서버 트래픽 및 DB 부담을 차단.
     - 최대 15MB 이하 원본 이미지를 최대 `1920×1080` 비율 유지 리사이징 후 Canvas WebP(품질 0.82)로 압축하는 `compressCalendarBgImage` 구현.
     - 메인 캘린더 컨테이너 하단에 `object-fit: cover` 배경 레이어와 가독성 보호용 반투명 오버레이(`bg-surface/40`) 및 타일 반투명화(`bg-app/75`)를 적용하고, 상단 헤더에 `[배경 설정]` 팝오버 컨트롤러(`CalendarBgCustomizer`) 연동.
  2. **사용자 지정 게임 아이콘 전역 연동 (`src/lib/storage-upload.ts`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
     - `downloadUserIcon`의 인메모리 캐시(`userIconCache`)를 활용하여 대시보드(`/dashboard`)와 소비 페이지(`/dashboard/expenses`)에서 게임별 커스텀 아이콘을 병렬 조회하고, 커스텀 아이콘이 존재할 경우 `default_icon_url`보다 우선 렌더링하도록 구현.
  3. **게임 픽업별 과금 분석 다중 컬러 팔레트 적용 (`src/app/dashboard/expenses/page.tsx`)**:
     - 8색 팔레트(`PICKUP_CHART_PALETTE`: Indigo, Emerald, Amber, Pink, Cyan, Violet, Orange, Teal)를 정의하여 각 픽업 배너 막대에 서로 다른 색상을 부여하고, 우측 `픽업 과금 순위` 리스트 항목에도 동일한 색상의 원형 도트 인디케이터를 추가.
  4. **단위 테스트 및 정적 빌드 무결점 검증**:
     - `src/lib/calendar-bg-storage.test.ts`, `src/components/calendar/calendar-bg-customizer.test.tsx`, `src/components/calendar/desktop-calendar.test.tsx`, `src/app/dashboard/page.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`에 신규 단위 테스트 10건 추가 (총 42개 파일 239개 테스트 100% 통과).
     - Next.js 14 정적 15개 페이지 export 빌드 성공 (`npm run build`).

## 누적 충전형 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감 롤백 및 카드 배지 개선 (2026-10-15)

- **배경 및 사용자 요구사항**:
  1. 누적 충전형(`INTERVAL_30`, 예: 월정액 30일권) 구독 상품을 남은 결제 예정일(만료일) 이전에 일찍 결제하여 확정 상태로 변경했을 때, 기존에 남아있던 누적 잔여일수(예: 10일)를 무시하고 결제일 기준 충전량(30일)으로 잔여일수를 고정해버리는 결함 발생.
  2. 결제 예정일보다 이른 날짜에 결제를 확정할 경우 기존에 남아있던 일수에 충전 연장 일수(`interval_days`, 기본 30일)를 가산(누적 연장)하도록 변경.
  3. 결제된 누적 충전형 구독 지출을 환불(취소)할 경우, 충전했던 일수만큼 다음 예정 회차의 잔여일수에서 빠지지 않는 문제 해결 (충전 일수만큼 정확히 차감 롤백).
  4. 소비 페이지(`/dashboard/expenses`)의 정기 구독 카드에서 `[누적 충전형 n일]` 표시 옆의 `[남은 n일]` 표시를 `[n일]`로 간결하게 변경 요구.
- **수행 내역**:
  1. **누적 연장 및 환불 차감 결제일 산출 순수 함수 구현 (`src/lib/subscription-sync.ts`)**:
     - `calculateNextIntervalTargetDate`: 조기 결제($D_{pay} < D_{orig\_target}$) 시 $D_{orig\_target} + \text{stepDays}$로 누적 연장.
     - `calculateRollbackIntervalTargetDate`: 환불 시 현재 예정일에서 충전 일수를 차감($D_{current} - \text{stepDays}$)하여 결제 전 예정일로 원복.
  2. **누적 충전형 다음 회차 자동 생성 및 결제 연동 (`src/lib/subscription-sync.ts`, `src/components/expense/expense-modal.tsx`)**:
     - `createNextIntervalSubscriptionExpense`: 결제 모달 결제 성공 시 잔여일수가 누적된 다음 회차 `PLANNED` 지출 레코드 생성.
  3. **누적 충전형 환불 시 일수 차감(롤백) 연동 (`src/lib/subscription-sync.ts`, `src/components/expense/expense-detail-modal.tsx`)**:
     - `rollbackIntervalSubscriptionExpense`: 지출 상세/환불 모달에서 `refund_expense_payment` 성공 직후, 해당 템플릿의 현재 `PLANNED` 지출 예정일에서 충전 일수(`stepDays`, 30일)를 차감하여 결제 전 원래 예정일로 완벽 복원.
     - `ExpenseDetail` 및 대시보드/소비 페이지 인터페이스에 `template_id` 완벽 연계.
  4. **정기 구독 카드 배지 라벨 변경 (`src/app/dashboard/expenses/page.tsx`)**:
     - `남은 {diffDays}일` $\to$ `{diffDays}일`로 배지 텍스트 수정.
  5. **단위 테스트 및 빌드 무결점 검증**:
     - `src/lib/subscription-sync.test.ts`에 11개 신규 테스트(조기/당일/만료후 결제, 환불 시 롤백 차감, 커스텀 일수, 중복 방지) 추가 (18개 테스트 PASS).
     - `src/components/expense/expense-detail-modal.test.tsx`에 환불 시 롤백 함수 호출 검증 테스트 추가 (9개 테스트 PASS).
     - `src/app/dashboard/expenses/page.test.tsx`에 `[n일]` 배지 표시 검증 테스트 추가 (14개 테스트 PASS).
     - Vitest 40개 파일 229개 단위 테스트 100% 통과.
     - Next.js 14 정적 15개 페이지 export 빌드 성공.

## 스토어 지갑·포인트 수동 보정 내역(Audit Log) 조회 모달 구현 (2026-10-14)

- **배경 및 사용자 요구사항**:
  1. `/dashboard/settings`의 스토어 지갑 관리에서 실제 앱 잔액과 차이가 생겼을 때 잔액을 수동 보정할 수 있으나, 과거에 언제 어떤 이유로 잔액을 보정했는지 확인할 수 있는 UI가 제공되지 않음.
  2. 사용자가 직접 조정한 이력(`store_point_transactions`의 `transaction_type = 'MANUAL_ADJUST'`)을 확인하고 역추적하여 잔액 정합성을 검증할 수 있는 모달 뷰어 제공 요구.
- **수행 내역**:
  1. **수동 보정 내역 조회 모달 신설 (`src/components/wallet/store-wallet-adjust-history-modal.tsx`)**:
     - `store_point_transactions` 테이블에서 `transaction_type = 'MANUAL_ADJUST'` 레코드를 최신순 조회.
     - 플랫폼별 필터 탭(전체, Google Play, Galaxy Store, 네이버페이) 및 새로고침 버튼 지원.
     - 5개 기준 페이지네이션(`ITEMS_PER_PAGE = 5`, 이전/다음, 번호 내비게이션, 범위 안내) 구현.
     - 일시(YYYY-MM-DD HH:mm), 플랫폼 배지, 변동 차액(+/-), 보정 후 잔액, 사유 메모 뷰어 구성.
     - 빈 상태(Empty State) 및 에러 상태 대응.
  2. **스토어 지갑 관리 위젯 연동 (`src/components/wallet/store-wallet-widget.tsx`)**:
     - 잔액 수동 보정 헤더 우측에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
  3. **단위 테스트 및 빌드 무결점 검증**:
     - `src/components/wallet/store-wallet-adjust-history-modal.test.tsx` 신설 (6개 테스트, 페이지네이션 검증 포함).
     - `src/components/wallet/store-wallet-widget.test.tsx` 갱신 (모달 열기 테스트 추가).
     - Vitest 40개 파일 216개 단위 테스트 100% 통과.
     - TypeScript 타입 검사 통과 및 Next.js 14 정적 15개 페이지 export 빌드 성공.
  4. **백로그 관리 단일화 (`docs/to-do.md`, `docs/develop_task_backlog.md`)**:
     - `develop_task_backlog.md`를 `docs/to-do.md`의 `Phase 12`로 완전 일원화하여 단일 기준(Single Source of Truth) 체계 확립.

## 버전 패스형(결제 유예) 지출 옵션·연계 픽업 드롭다운 구현 및 모바일 달력 일정 점 정상화 (2026-10-14)

- **배경 및 사용자 요구사항**:
  1. 버전 패스 및 누적 충전형 구독 상품은 버전 종료일(`end_date`) 전까지만 결제하면 보상을 소급 수령하는 데 지장이 없으므로, 최종 결제 마감 시한인 `end_date`까지 결제 확정일에 유연한 변동성(결제 유예)이 보장되어야 함.
  2. 단발성 패키지/픽업 지출(특정일 결제)과 버전 패스(기간형 결제 유예)를 지출 모달에서 분리 지원하고, 버전 패스 선택 시 해당 버전의 어떤 픽업 배너에 연계할지 드롭다운으로 직접 선택하여 픽업별 과금 통계의 정합성을 확보.
  3. 미결제(`PLANNED`) 버전 패스의 월 예산 귀속을 최종 결제 마감 시한인 `end_date`가 속한 달로 지정하여 가용 예산 왜곡 방지 (실제 결제 시 실결제일 월로 확정 귀속).
  4. 모바일 달력 타일의 파란색 일정 점(Dot)이 일정 진행 기간 내내 매일 찍혀 달력 전체가 파란 점으로 도배되던 현상을 데스크톱 아이콘과 동일하게 시작일(`start_date`)에만 표시되도록 수정.
- **수행 내역**:
  1. **모바일 달력 파란 점(Dot) 시작일 판정 정상화 (`src/components/calendar/desktop-calendar.tsx`, `desktop-calendar.test.tsx`)**:
     - `day.schedules.length > 0`을 `day.schedules.some((s) => s.is_start_date)`로 수정하여, 일정이 시작되는 날에만 파란 점이 찍히도록 통일. 데스크톱의 메모 회색 점(`day.hasMemo`)과 모바일 메모 점은 기존 정상 상태 유지.
  2. **지출 모달 버전 패스형 체크박스 및 연계 픽업 선택 드롭다운 구현 (`src/components/expense/expense-modal.tsx`)**:
     - `isVersionPass` 및 `manualPickupId` 상태 도입.
     - `matchingVersion`이 존재하는 게임 지출 등록 시 `[✓] 버전 패스형 (버전 종료일까지 결제 유예)` 체크박스 제공.
     - 체크 시 버전 기간(`matchingVersion.start_date ~ matchingVersion.end_date`)이 적용되며, 픽업 선택 드롭다운이 활성화되어 버전 내 속한 픽업 배너(전반/후반/동시 연계/선택 안 함)를 유저가 직접 선택 가능.
     - 체크 해제 시 기존 특정일 지출(`start_date = target_date = end_date = paymentDate`)로 저장.
     - 편집 모드(`editingExpense`)에서 기존 기간형 지출(`start_date !== end_date`) 감지 시 체크박스 자동 활성화 및 기존 픽업 상태 복원.
  3. **예산 귀속 및 만료 판정 마감일(`end_date`) 정합성 확립 (`src/lib/budget-calculations.ts`, `src/app/dashboard/expenses/page.tsx`)**:
     - `getBudgetDate`: 미결제(`PLANNED`) 기간형 지출은 마감일인 `end_date`가 속한 달의 예산에서 차감 대기하고, 결제 완료(`CONFIRMED`) 또는 특정일 지출은 `target_date` 기준으로 배정.
     - `findOverduePlannedExpenses`: 버전 패스 지출은 `end_date`가 지나야 비로소 만료된 지출로 경고하도록 판정.
     - `getExpenseEffectiveDate`: 소비 페이지에서 미결제 기간형 지출의 활성 기간을 `end_date` + 7일로 유지.
  4. **무결점 검증**:
     - 단위 테스트 추가 및 갱신 (`src/components/calendar/desktop-calendar.test.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/lib/budget-calculations.test.ts`).
     - Vitest 39개 파일 209개 테스트 100% 통과 (`vitest run`).
     - TypeScript 타입 검사 무결점 통과 (`tsc --noEmit`).
     - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 지출 결제일/예정일 수정 결함 및 버전 종료일 강제 고정 버그 해결 (2026-10-14)

- **배경 및 사용자 요구사항**:
  1. 예정 지출 등록 시 게임 버전이 연결된 경우, 사용자가 지정한 날짜가 무시되고 버전의 `end_date`로 지출 예정일이 강제 묶이는 심각한 데이터 불일치 버그 발생 (전반부 픽업 지출인데 날짜는 버전 종료일이 되는 모순 발생).
  2. 예정 지출 수정 모드에서 날짜를 변경해도 다시 버전 종료일로 덮어써져 날짜 수정이 불가능하던 현상 발생.
  3. 결제 완료된 확정 지출(`CONFIRMED`)의 상세 모달에서 결제일을 수정할 수 있는 UI 및 백엔드 미비.
- **수행 내역**:
  1. **예정 지출 및 신규 지출 날짜 사용자 지정 주도권 정상화 (`src/components/expense/expense-modal.tsx`)**:
     - `target_date: schedule?.end_date ?? input.paymentDate`를 `target_date: input.paymentDate`로 교체하여 사용자가 지정한 날짜가 온전히 저장/수정되도록 수정.
     - 픽업 연계 기간과 지출 예정일의 정합성 보장.
     - 모드별 날짜 라벨을 `지출 예정일`, `결제일`, `결제일 / 예정일`로 직관화.
  2. **예정 지출 결제 확정 시 카테고리 및 게임 ID 하드코딩 리셋 방어 (`src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
     - 예정 지출 [확정] 결제 시 카테고리가 무조건 "게임"으로 초기화되고 `game_id`가 날아가던 현상 방어.
     - `PlannedExpenseInput`에 `category`, `game_id`, `target_date`를 포함하여 원본 예정 지출 정보 복원.
  3. **사이드바 지출 결제수단 한글 라벨링 (`src/components/calendar/hero-sidebar.tsx`)**:
     - `NAVER_PAY` 등 영문 코드로 찍히던 결제수단을 `METHOD_LABELS`를 통해 한글 시맨틱 라벨(`네이버페이`, `내 지갑`)로 정규화 노출.
  4. **확정 지출(`CONFIRMED`) 결제일 수정 기능 추가 (`src/components/expense/expense-detail-modal.tsx`, `md/MIGRATION_EXPENSE_EDIT.sql`, `md/SCHEMA.sql`)**:
     - `update_confirmed_expense_metadata` RPC에 `p_target_date` 파라미터 및 미래 날짜 방어 가드 추가.
     - `ExpenseDetailModal`의 [정보 수정] 폼에 결제일(`editDate`) 입력란을 신설하여 결제일도 자유롭게 수정 및 보정 가능하도록 지원.
  5. **특정일 지정 지출 원칙 확립 및 예산 귀속·정렬 기준일 정상화**:
     - `expense-modal.tsx`: 지출 등록/수정 시 `start_date = target_date = end_date = input.paymentDate`로 단일일 일치화 (버전 일정의 기간이 지출의 기간으로 복사되던 결함 해소).
     - `budget-calculations.ts`: `getBudgetDate`를 `target_date` 기준으로 통일하여 지출 예정일이 속한 달의 예산으로 정상 귀속 및 만료 판정 정합성 확립.
     - `expenses/page.tsx`: 지출 정렬 및 7일 경과 과거 기록 분리 기준일을 `target_date`로 일원화.
  6. **무결점 검증**:
     - 단위 테스트 추가 및 갱신 (`src/components/expense/expense-modal.test.tsx`, `src/lib/budget-calculations.test.ts`).
     - Vitest 39개 파일 206개 테스트 100% PASS (`vitest run`).
     - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 지출 등록 모달 항목명 원복 버그 수정 및 Recharts 차트 Y축 가독성 개선 (2026-10-14)

- **배경 및 사용자 요구사항**:
  1. 지출 등록 모달(`ExpenseModal`)에서 항목명 텍스트를 수정하려고 지우거나 입력할 때 곧바로 원래 텍스트로 되돌아가버리는 버그 발생.
  2. 지출 분석 탭의 '게임 픽업별 과금 분석' 그래프 Y축 카테고리 텍스트("일반" 등)가 라이트 테마에서 투명하게 처리되어 보이지 않는 문제 발생.
- **수행 내역**:
  1. **항목명 입력 주도권 보장 및 무한 리셋 원천 차단 (`src/components/expense/expense-modal.tsx`)**:
     - `game_schedules` 연동 `useEffect`의 의존성 배열에서 `title`을 제거하고 `titleRef`를 활용해 의존성 루프 해소.
     - `prevGameIdRef`를 도입하여 게임 셀렉트박스를 새로 선택한 최초 1회에만 비어있는 항목명에 버전을 제안하도록 제한.
     - `isEditMode` 및 `isPlannedPayment` 모드에서는 사용자가 지정한 항목명을 일정 매핑 로직이 절대 덮어쓰지 못하도록 안전 가드 구성.
     - 모달 오픈 감지 시 `plannedExpense?.id ?? null` 정규화로 매 렌더링마다 폼 필드가 리셋되던 문제 1차 방어.
  2. **차트 Y축 텍스트 시맨틱 토큰 적용 (`src/app/dashboard/expenses/page.tsx`)**:
     - `YAxis`의 하드코딩된 `#F5F7FA`를 `rgb(var(--text-secondary))`로 변경하여 라이트/다크 테마 환경 모두에서 선명한 대비 확보.
  3. **라이트 테마 배경 톤 개선 (`src/app/globals.css`)**:
     - 라이트 테마 배경색(`--bg`)을 기존 `rgb(245, 247, 250)`에서 차분한 슬레이트 쿨 그레이 `rgb(236, 240, 245)`(#ECF0F5)로 톤다운.
     - 메인 순백 카드(`--surface`)와의 입체감/구분을 확실히 확보하고, 20대 게이머 유저층이 선호하는 눈이 편안한 테크니컬 디자인 완성.
  4. **무결점 검증**:
     - 사용자 항목명 삭제 및 수정 유지 기능 단위 테스트 추가 (`src/components/expense/expense-modal.test.tsx`).
     - Vitest 39개 파일 203개 테스트 100% PASS (`vitest run`).
     - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 라이트 테마 전수 검증 및 UI 가독성·대비 전면 최적화 (2026-10-13)

- **배경 및 사용자 요구사항**:
  - 라이트 테마 전환 시 UI 요소(텍스트, 뱃지, 버튼, 입력폼, 차트 등)가 흐려지거나 아예 보이지 않게 되는(low contrast / invisible) 문제를 전체 페이지에서 전수 검증 및 해소.
  - 디자인 시스템 시맨틱 토큰(`content`, `content-secondary`, `content-muted`, `surface`, `surface-2`, `line`, `primary`, `success`, `warning`, `danger`, `info`)과의 완전한 정합성 확립.
- **수행 내역**:
  1. **`tailwind.config.ts`의 `textColor: { white: token("text-primary") }` 부작용 해소**:
     - 유색 버튼(`bg-primary`, `bg-emerald-600`, `bg-danger`) 위의 텍스트를 `text-primary-foreground`로 통일하여 라이트 테마에서 유색 배경 위에 검은 글씨가 올라가던 버그 완전 해결.
  2. **하드코딩된 다크 전용 모달 클래스 전면 전환**:
     - `expense-modal.tsx`, `expense-detail-modal.tsx`, `overdue-planned-modal.tsx`: `border-gray-700 bg-gray-800 text-white`를 `border-line bg-surface text-content`로 전환.
     - 폼 필드 상수를 `border-line-control bg-surface-2 text-content`로 통일.
  3. **WCAG 대비 미달 하드코딩 파스텔 텍스트 개선**:
     - 콘텐츠 배너의 `text-purple-300`을 `text-purple-700 dark:text-purple-300`으로 전환.
     - 픽업 순위 2위 뱃지의 `text-slate-300`을 `text-slate-700 dark:text-slate-300`으로 전환.
     - 지출 상태 뱃지의 `text-emerald-400`, `text-amber-400`, `text-red-400`을 `text-success`, `text-warning`, `text-danger`로 전환.
     - 상단바 로고의 `WebkitTextStroke: "1px black"` 인라인 스타일 제거.
  4. **무결점 검증**:
     - Vitest 39개 파일 202개 테스트 100% PASS 및 Next.js 14 정적 export 빌드 성공.

## Cloudflare Pages 호스팅 환경 구축 및 계정 탈퇴 Supabase pg_cron / RPC 완전 이관 (2026-10-13)

- **배경 및 사용자 요구사항**:
  - Netlify 무료 티어의 월 300분 빌드 시간 및 100GB 대역폭 초과 시 사이트 정지 하드 리밋 문제를 근본적으로 해결하기 위해, 완전 무료 무제한 대역폭의 **Cloudflare Pages**와 데이터베이스 내부 완결 스케줄러인 **Supabase `pg_cron`** 체제로 이관.
  - Netlify Functions에 종속되어 있던 5분 주기 탈퇴 워커 및 클라이언트 탈퇴 API(`request-account-deletion`, `account-deletion-status`)를 Supabase `SECURITY DEFINER` RPC 함수로 전환하여 순수 정적 SPA 웹앱 환경에서도 100% 정상 작동하도록 개편.
- **수행 내역**:
  1. **Cloudflare Pages 배포 및 정적 호스팅 자산 구축**:
     - [`.nvmrc`](../.nvmrc): Cloudflare Pages 빌드 환경을 위한 Node.js LTS 버전(`20.18.0`) 명시.
     - [`public/_headers`](../public/_headers): Cloudflare Pages 캐싱 규칙 및 보안 헤더(X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, `/sw.js` 무캐시, `/_next/static/*` 1년 불변 캐싱) 추가.
     - [`public/_redirects`](../public/_redirects): Cloudflare Pages 호환 0ms SPA 라우팅 리다이렉트 유지.
  2. **Supabase Database pg_cron 탈퇴 워커 및 원자적 함수 구현 (`md/MIGRATION_PG_CRON.sql`, `md/SCHEMA.sql`)**:
     - `purge_expired_account_deletion_requests(p_limit)`: `SECURITY DEFINER` 함수로 단일 PostgreSQL 트랜잭션 내에서 `storage.objects`(user-icons 버킷), 10개 개인 데이터 테이블, `auth.users`를 원자적으로 영구 삭제.
     - 5분 주기 `cron.schedule('chronoledger-account-purge', '*/5 * * * *', ...)` 자동 스케줄 등록 스크립트 작성.
  3. **계정 탈퇴 API의 Supabase Database RPC 완전 통합 (`src/lib/account-deletion.ts`, `src/lib/account-deletion.test.ts`)**:
     - Netlify Functions 호출(`fetch`)을 제거하고 `request_account_deletion(p_confirmation_email)`, `get_account_deletion_status(p_status_token)` RPC를 직접 호출하도록 리팩토링.
     - 외부 서버리스 함수 및 외부 Cron 호출 비용이 완전히 0이 되며 네트워크 실패 위험 원천 차단.
  4. **검증 및 빌드 확인**:
     - 단위 테스트 39개 파일, 191개 테스트 전체 통과 (`vitest run`).
     - TypeScript 타입 검사 통과 (`tsc --noEmit`).
     - Next.js 14 정적 15개 페이지 export 빌드 성공 (`npm run build`).

## 지출 등록 모달 픽업 선택 필드 비활성화 및 결제일 기준 자동 연계 구현 (2026-10-13)

- **배경 및 사용자 요구사항**:
  - 지출 추가 모달에서 픽업 선택 필드를 비활성화(`disabled`).
  - 사용자가 수동 선택하지 않고, 결제일이 픽업 기간 내에 포함되는 경우:
    - 1개 진행 중: 해당 픽업 배너로 자동 연계.
    - 2개 이상 진행 중: 진행 중인 모든 배너에 동시 연계(`[PICKUPS:id1,id2,...]` 메타데이터 바인딩 및 단 1회 1x 회계 합산).
  - 결제일이 픽업 기간 외에 속하는 경우:
    - '진행 중인 픽업 없음 (픽업 외 지출)'로 자동 매핑(`pickup_schedule_id = null`).
- **수행 내역**:
  1. **픽업 자동 연계 상태 동기화 (`src/components/expense/expense-modal.tsx`)**:
     - `useEffect`를 통해 `availablePickups` 길이에 따라 수동 오버라이드 없이 항상 자동 결정:
       - 0개: `""` (픽업 외 지출)
       - 1개: `availablePickups[0].id`
       - 2개 이상: `"ALL_CURRENT"` (모든 배너 동시 연계)
  2. **픽업 필드 비활성화 및 가이드 UI 적용**:
     - `expense-pickup` select 엘리먼트에 `disabled` 및 `opacity-60 cursor-not-allowed` 적용.
     - 라벨을 `연결된 픽업 일정`으로 정비하고 상태별 안내 문구(복수 배너 동시 연계 / 단일 배너 연계 / 픽업 외 지출) 제공.
  3. **단위 테스트 검증 (`src/components/expense/expense-modal.test.tsx`)**:
     - 픽업 필드 disabled 상태 검증.
     - 픽업 기간 내 단일 배너 자동 바인딩 저장 검증.
     - 픽업 기간 외 결제 시 픽업 외 지출(`pickup_schedule_id: null`) 자동 매핑 저장 검증.
     - 복수 배너 동시 연계(`[PICKUPS:p1,p2]`) 및 1x 회계 저장 검증.
     - 전체 39개 테스트 파일, 190개 테스트 100% PASS 및 빌드 성공.

## 웹 배포 플랫폼 비교 분석 및 아키텍처 제안 갱신 (2026-10-13)

- **배경 및 사용자 요구사항**:
  1. Netlify 무료 플랜 사용 시 빌드 시간/크레딧 및 트래픽 소진으로 사이트 및 배포가 멈추는(Paused) 제약 사항 확인.
  2. 현재 프로젝트(Next.js 14 Static Export + Supabase + 5분 Cron 워커)에 가장 적합한 배포 플랫폼 후보군 비교 분석 및 장단점 검토.
  3. 안정적인 100% 무료 운영을 위한 최적 권장 아키텍처 수립 및 문서 반영.
- **수행 내역**:
  1. **배포 플랫폼별 적합도 비교 평가 및 제안서 전면 리팩토링 (`docs/Netlify_Web_Architecture_Proposal.md`)**:
     - 상단의 최신 권장안과 하단 구버전 Netlify 권장 내용 간의 불일치를 해소하고 전체 문서를 **Cloudflare Pages + Supabase pg_cron** 기준으로 전면 리팩토링.
     - **1위 Cloudflare Pages + Workers (95점)**: 대역폭 완전 무제한 무료, 월 500회 빌드(시간 제한 없음), 1분 단위 스케줄러 지원으로 가장 적합.
     - **2위 Vercel (88점)**: 월 6,000분 빌드, Next.js 최고 궁합, 단 무료 플랜 Cron은 일 1회 제한.
     - **3위 Netlify (80점)**: 기존 세팅 즉시 사용 가능하나, 월 300분 빌드/100GB 대역폭 초과 시 사이트 일시 정지(Hard Limit) 리스크.
     - **4위 GitHub Pages (75점)**: 정적 호스팅 무료이나 서버리스 API 및 Cron 미지원.
     - 구버전 2026-10-06 ~ 10-07 이력은 '부록(Archived History)'으로 격리 보존하고, 실제 코드베이스 경로(`src/`) 및 단일 export 산출물 원칙을 정확히 반영.
     - 구체적인 5단계 이관 액션 플랜(Supabase `pg_cron` 활성화 $\to$ Cloudflare Pages 프로젝트 생성 $\to$ 환경 변수 $\to$ Redirect URL 갱신) 수립 완료.
  2. **정적 웹과 백그라운드 스케줄러의 완전 분리 아키텍처 수립**:
     - 웹 프론트엔드(`out/`): **Cloudflare Pages**로 호스팅하여 트래픽/빌드 비용 걱정 없이 고가용성 유지.
     - 5분 주기 탈퇴 워커(`account-deletion-worker`): Netlify Functions 대신 **Supabase Database 내부 `pg_cron`** 또는 **Supabase Edge Function**으로 분리 이관.
  3. **체크리스트 및 변경 이력 동기화**:
     - `docs/to-do.md`: 배포 플랫폼 다각화 재평가 완료 체크 및 Cloudflare Pages 배포 검증/Supabase pg_cron 이관 로드맵 등록.
     - `docs/changelog.md`: 변경 내역 등록 완료.

## 소비 페이지 차트 시각적 명확성 및 마우스 호버 인터랙션 개선 (2026-10-13)

- **배경 및 사용자 요구사항**:
  1. 막대 그래프들이 X축/Y축 선이 없어 배경에 붕 뜨는 느낌 개선 및 명확한 외곽선 보강 요구.
  2. 원(도넛) 그래프에서 주요 두 카테고리('게임'과 '정기 구독')의 색상이 비슷하여 구분이 어려운 문제 해결.
  3. 차트 슬라이스/막대에 마우스를 올렸을 때 외곽선이 하이라이트되고, 하단 범례/우측 순위 카드와 양방향 호버 연동 기능 구현.
- **수행 내역**:
  1. **고대비 카테고리 색상 팔레트 적용 (`src/app/dashboard/expenses/page.tsx`)**:
     - `CATEGORY_COLORS` 상수 개편: 게임 `#6366F1` (인디고 블루), 정기 구독 `#10B981` (선명한 에메랄드 그린 - 게임과 완벽한 색상환 대비), 식비 `#F59E0B` (앰버), 교통 `#06B6D4` (사이언), 생활 `#EC4899` (핑크), 기타 `#8B5CF6` (바이올렛).
  2. **원(도넛) 그래프 슬라이스 테두리 및 양방향 호버 하이라이트**:
     - `activeCategoryIndex` 상태 관리 추가.
     - 슬라이스 기본 테두리(`stroke="#171A21"`, `strokeWidth=2`) 적용으로 분리감 제공.
     - 마우스 호버 시 흰색 테두리(`stroke="#FFFFFF"`, `strokeWidth=3`) 및 글로우 드롭 섀도우 하이라이트 적용.
     - 하단 범례 카드와 슬라이스 간 마우스 오버 시 양방향 연동(하이라이트 링 및 텍스트 강조).
  3. **월별 세로 막대그래프 축선, 격자, 테두리 및 호버 인터랙션**:
     - `CartesianGrid vertical={false}` 수평 점선 격자선 추가.
     - `XAxis`, `YAxis`에 `axisLine={{ stroke: "#374151", strokeWidth: 1 }}` 및 `tickLine` 복원으로 기준 축 정립.
     - 막대 테두리(`stroke="#4338CA"`) 적용 및 호버 시 솔리드 `stroke="#FFFFFF"`, `strokeWidth=2` 하이라이트.
     - `Tooltip cursor={false}`를 적용하여 마우스 호버 시 배경에 나타나던 반투명 회색 하이라이트 음영 밴드를 완전 제거.
  4. **게임 픽업 가로 막대그래프 축선, 격자 및 우측 순위 카드 연동**:
     - `CartesianGrid horizontal={false}` 수직 점선 격자선 추가.
     - `XAxis`, `YAxis` 축선 복원 및 가로 막대 테두리 적용.
     - `Tooltip cursor={false}` 적용으로 가로 막대 호버 시 전체 배경이 하이라이트되는 현상 제거.
     - `activePickupIndex` 상태를 통해 가로 막대와 우측 픽업 과금 순위 카드 간 양방향 호버 하이라이트 연동.
  5. **검증**:
     - 단위 테스트 11건 100% 통과 (`vitest run src/app/dashboard/expenses/page.test.tsx`).
     - TypeScript 타입 검사(`tsc --noEmit`) 0 오류 및 Next.js 14 정적 15개 페이지 빌드 성공.

## 정기 구독 템플릿 정렬 및 구독 게임 가나다순 정렬·12개 단위 페이지네이션 구현 (2026-10-13)

- **배경 및 사용자 요구사항**:
  1. `/dashboard/expenses` 정기 구독 탭:
     - 템플릿 목록의 정렬 기준 개편: `[게임]` 그룹(연관 게임끼리 묶어 게임 이름의 가나다순 정렬) $\to$ `[정기 구독]` 그룹(고정 결제일 오름차순 $\to$ 누적 충전형 순서)으로 정렬.
  2. `/dashboard/games` 구독 게임 탭:
     - 내 구독 게임 카드들을 게임 이름을 기준으로 가나다순 정렬.
     - 구독 게임 카드 그리드에 **12개 단위 페이지네이션** 적용 (페이지 번호 및 이전/다음 네비게이션).
  3. 일반 사용자 계정(`users.id = dae6adf8-7bfe-457e-8a05-c1e2ce64a381`) 테스트를 위한 종합 더미 데이터 SQL 생성.
- **수행 내역**:
  1. **정기 구독 템플릿 정렬 훅 (`src/app/dashboard/expenses/page.tsx`)**:
     - `sortedTemplates` `useMemo` 구현:
       - 1단계: `[게임]` 그룹 우선 배치 (`category === '게임' || Boolean(game_id)`).
         - 게임 이름 기준 가나다순 정렬 (`gameNameA.localeCompare(gameNameB, "ko")`).
         - 동일 게임 내 주기 우선순위: `MONTHLY_DAY (1)` $\to$ `INTERVAL_30 (2)` $\to$ 기타 (`VERSION_PASS` 등 3).
         - 동일 주기 내: 고정 결제일(`billing_day`) 오름차순.
       - 2단계: `[정기 구독]` 일반 그룹:
         - 고정 결제(`MONTHLY_DAY`, 결제일 `billing_day` 오름차순) $\to$ 누적 충전형(`INTERVAL_30`) 순서 정렬.
     - 구독 탭 렌더링에 `sortedTemplates.map` 적용.
  2. **구독 게임 가나다순 정렬 및 12개 페이지네이션 (`src/app/dashboard/games/page.tsx`)**:
     - `sortedUserGames`: `[...userGames].sort((a, b) => (a.games?.name || "").localeCompare(b.games?.name || "", "ko"))` 가나다순 정렬 구현.
     - `GAMES_PER_PAGE = 12` 기준 `paginatedUserGames` 슬라이싱 및 현재 페이지 유효성 자동 보정.
     - 하단 페이지네이션 바 UI 추가 (`getPaginationRange`, 이전/다음 버튼, 페이지 번호 버튼, 총 건수 표시).
  3. **일반 사용자 테스트용 더미 데이터 생성 및 정리 SQL 작성 (`md/DUMMY_DATA_USER.sql`, `md/CLEANUP_DUMMY_DATA_USER.sql`)**:
     - 대상 ID `dae6adf8-7bfe-457e-8a05-c1e2ce64a381`를 위한 멱등 트랜잭션 스크립트.
     - 14종 게임 등록 및 전체 구독(12개 페이지네이션 즉시 검증 가능).
     - 스토어 지갑 3종(Google Play GOLD 13%, Galaxy Store GENERAL 10%, Naver Pay 0%) 제약 조건 완전 준수.
     - 사용자 자산 150만 원, 10월 예산 35만 원 등록.
     - 정기 구독 템플릿 7종(게임 4종 + 일반 3종) 등록(정렬 순서 즉시 검증 가능).
     - 가계부 지출 18건(확정 12건, 예정 4건, 취소 2건) 및 캘린더 메모 등록.
     - 검증 완료 후 테스트 계정의 지출, 구독, 게임, 메모를 원상 복구할 수 있는 정리 스크립트(`md/CLEANUP_DUMMY_DATA_USER.sql`) 제공.
  4. **단위 테스트 및 빌드 검증 (`src/app/dashboard/games/page.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
     - 게임 이름 가나다순 정렬 및 15개 목킹 데이터를 통한 12개 단위 페이지네이션 탐색 테스트 추가.
     - 정기 구독 템플릿 5종 정렬 순서(`[게임]` 가나다순 $\to$ `[정기 구독]` 결제일 오름차순 $\to$ 누적 충전형) 검증 테스트 추가.
     - Vitest 37개 파일 / 168개 테스트 전체 100% PASS (`tsc --noEmit` 무결성 확인 및 Next.js 14 정적 15개 페이지 빌드 성공).

## Supabase 원격 Redirect URL 최종 등록 완료 확인 (2026-10-13)

- **현황**:
  - Supabase Authentication $\to$ URL Configuration $\to$ Redirect URLs에 배포 도메인의 `/auth/callback` 등록이 사용자 확인을 통해 완료됨.
  - 이에 따라 원격 배포 환경에서 Google OAuth 및 PKCE 인증 콜백 정상 왕복이 가능한 상태로 준비됨.

## 관리자 요청 페이지 직접 게임 추가 기능 및 [게임 등록] 버튼 구현 완료 (2026-10-13)

- **배경 및 사용자 요구사항**:
  - `/admin/requests` 페이지에서 일반 유저의 추가 건의를 승인/반려하는 기능 외에도, 관리자가 직접 공식 게임 마스터 카탈로그에 새 게임을 등록할 수 있는 입력란 및 등록 버튼 요구.
  - 버튼 이름 요구사항: `[새 게임 직접 등록]`이 아닌 명확히 `[게임 등록]`으로 표시.
- **수행 내역**:
  1. **관리자 직접 게임 추가 카드 UI (`src/app/admin/requests/page.tsx`)**:
     - "게임 요청" 탭 상단에 `관리자 직접 게임 추가` 전용 카드를 배치.
     - 게임 이름(`direct-game-name`) 및 기본 아이콘 URL(`direct-game-icon-url`) 입력 필드 제공.
     - URL 유효성 검사(`http:`/`https:`) 및 미입력 방어, 중복 게임 이름 등록 방어(`23505` 에러 친화적 메시지 처리).
     - 요구사항에 맞춰 버튼 이름을 `[게임 등록]`(처리 중일 때 `등록 중...`)으로 적용.
  2. **DB 스키마 및 마이그레이션 RPC 추가 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
     - `admin_create_game(p_name TEXT, p_default_icon_url TEXT)` 보안 정의자 RPC 생성 (관리자 권한 검증, 게임 이름 중복 검증, `public.games` 인서트).
     - 클라이언트 단에서 RPC 우선 호출 및 실패 시 direct insert 폴백 지원.
  3. **단위 테스트 및 빌드 검증 (`src/app/admin/requests/page.test.tsx`)**:
     - 관리자 직접 게임 이름/아이콘 입력 후 `[게임 등록]` 클릭 시 `admin_create_game` RPC 호출 및 성공 메시지 노출 검증 테스트 추가.
     - Vitest 37개 파일 / 163개 단위 테스트 전체 100% PASS, Next.js 14 정적 15개 페이지 빌드 성공.

## 정기 구독 템플릿 수정/삭제 기능 구현 및 카드 액션 버튼 레이아웃 개편 완료 (2026-10-13)

- **배경 및 사용자 요구사항**:
  - 기존에는 정기 구독 탭에서 등록된 구독 상품의 세부 정보(제목, 금액, 결제 주기, 결제일 등)를 수정하거나 템플릿 자체를 삭제할 수 없었음.
  - 누적 충전형의 [남은 날짜 수정]과는 별개로 템플릿의 속성을 수정하는 [수정] 버튼과 템플릿을 삭제할 수 있는 [삭제] 버튼이 필요했음.
  - 액션 버튼 배치 요구사항:
    - [구독 중지/재개] 버튼과 동일한 행(높이)에 배치.
    - **좌측 정렬**: `[수정]`, `[남은 날짜 수정]` (누적 충전형일 때만 노출)
    - **우측 정렬**: `[구독 중지]`(또는 `[구독 재개]`), `[휴지통 모양 아이콘]`(삭제)
- **수행 내역**:
  1. **정기 구독 템플릿 수정 기능 (`src/components/subscription/subscription-modal.tsx`)**:
     - `SubscriptionTemplateInput` 인터페이스 및 `editingTemplate` prop 추가.
     - 템플릿 수정 모달 오픈 시 기존 데이터(제목, 카테고리, 연관 게임, 결제 주기 유형, 결제일/누적일수, 금액 등) 자동 바인딩.
     - 제출 시 `subscription_templates.update()` 호출 및 아직 결제되지 않은 미결제(`PLANNED`) 지출의 기본 정보(제목, 카테고리, 게임 ID, 금액)를 자동으로 함께 동기화.
     - 타이틀(`정기 구독 수정`) 및 제출 버튼(`수정 완료`) 동적 렌더링.
  2. **정기 구독 템플릿 삭제 기능 및 안전 회차 정리 (`src/app/dashboard/expenses/page.tsx`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
     - 구독 카드 우측에 `Trash2` 휴지통 아이콘 버튼 추가.
     - 클릭 시 확인 다이얼로그 노출: 미결제(`PLANNED`) 회차는 함께 삭제되며, 과거 이미 결제 완료된(`CONFIRMED`) 내역은 안전하게 보존됨을 안내.
     - 원자적 처리를 위한 보안 정의자 RPC `delete_subscription_template(p_template_id UUID)` 구현:
       - 본인 소유 템플릿 여부 검증 (IDOR 방지).
       - 해당 템플릿의 미결제(`PLANNED`) 지출만 삭제.
       - 템플릿 삭제 시 `expenses.template_id`의 `ON DELETE SET NULL` 동작으로 결제 완료 내역 보존.
     - Supabase RLS `Delete own templates` 정책 추가 및 마이그레이션 DDL 등록.
     - 클라이언트 단에서 RPC 미생성 시 직접 삭제 및 실패 시 비활성화 안내하는 폴백 구현.
  3. **구독 카드 액션 바 레이아웃 개편 (`src/app/dashboard/expenses/page.tsx`)**:
     - 좌측 정렬 그룹: `[수정]` 버튼, 누적 충전형일 때만 `[남은 날짜 수정]` 버튼 노출.
     - 우측 정렬 그룹: `[구독 중지/재개]` 버튼, `[Trash2]` 삭제 아이콘 버튼.
     - 헤더의 `+ 구독 추가` 클릭 시 수정 모드 잔여 상태를 초기화하고 모달 오픈.
  4. **단위 테스트 및 빌드 검증 (`src/components/subscription/subscription-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
     - `editingTemplate` 전달 시 폼 로드 및 `update` 호출 검증 테스트 추가.
     - 템플릿 삭제 다이얼로그 오픈 및 `delete_subscription_template` RPC 호출 검증 테스트 추가.
     - Vitest 37개 파일 / 162개 단위 테스트 전체 100% PASS, Next.js 14 정적 15개 페이지 클린 빌드 완료.

## 전체 지출 내역 10개 단위 클라이언트 페이지네이션 및 누적 충전 주기 커스텀 지원 완료 (2026-10-13)

- **배경 및 원인 분석**:
  - 기존에는 `expenses` 테이블의 모든 지출 내역을 한 번에 조회하여 데스크톱 테이블과 모바일 카드 뷰에서 제한 없이 무제한으로 렌더링하고 있었음.
  - 지출 데이터가 수십~수백 건으로 쌓일수록 스크롤이 무한정 길어지고 불필요한 DOM 노드 과다로 인해 렌더링 부하가 증가함.
  - 또한 '30일 누적 충전형'의 경우 고정 30일 주기로만 동작하여 7일(주간), 14일(2주) 등 유동적인 충전 주기를 지원하지 못했음.
- **수행 내역**:
  1. **전체 지출 내역 10개 단위 클라이언트 페이지네이션 (`src/app/dashboard/expenses/page.tsx`)**:
     - `EXPENSES_PER_PAGE = 10` 상수를 기준으로 `paginatedExpenses`를 슬라이싱하여 데스크톱 테이블과 모바일 카드 뷰에 적용.
     - 전체 지출 통계(카테고리별 비중, 월별 추이, 픽업 가챠 분석)는 전체 지출 데이터셋을 유지하여 정확도를 보존하면서, 하단 상세 목록만 깔끔하게 10개씩 분할 표시.
     - 하단에 정보 표시(`총 N건 중 A - B건 표시 (페이지 X / Y)`), 이전/다음 네비게이션 버튼, 페이지 번호 버튼(7페이지 초과 시 스마트 생략 부호 `...` 지원) UI 구현.
     - 지출 취소/환불/추가 시 총 페이지 수가 줄어들 경우 `currentPage`가 범위를 벗어나지 않도록 방어하는 자동 클램핑 `useEffect` 적용.
  2. **누적 충전형 결제 주기(`interval_days`) 커스텀 기능 (`src/components/subscription/subscription-modal.tsx`, `src/lib/subscription-sync.ts`)**:
     - 명칭을 '30일 누적 충전형'에서 '누적 충전형'으로 변경하고, 주기 일수(기본값 30일) 자유 입력 지원.
     - 다음 회차 자동 생성 시 `template.interval_days` 반영. DB 컬럼 미존재 시 프론트엔드 폴백 처리.
  3. **단위 테스트 및 빌드 검증 (`src/app/dashboard/expenses/page.test.tsx`)**:
     - 25개 지출 항목 기준 10개 단위 분할, 2페이지 이동 및 이전 복귀 테스트 추가 (총 160개 테스트 100% PASS, Next.js 프로덕션 빌드 성공).

## 게임 버전 패스형/정기 구독 예정 지출 생성 실패 수정 및 버전 시작일 바인딩 개선 완료 (2026-10-13)

- **배경 및 원인 분석**:
  - **PostgREST 부분 유니크 인덱스 충돌 에러(42P10)**: `expenses` 테이블에는 `idx_expenses_template_schedule_id` 및 `idx_expenses_template_billing_cycle`가 부분 유니크 인덱스(`WHERE ... IS NOT NULL`)로 설정되어 있었음. PostgREST의 `.upsert(rows, { onConflict: "template_id,schedule_id" })`는 SQL 변환 시 `WHERE` 절을 포함하지 못하여 PostgreSQL 엔진에서 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 오류가 발생해 모든 예정 지출 저장이 원천 차단되고 있었음.
  - **버전 패스 결제 목표일(`target_date`) 오지정**: 버전 패스 회차 생성 시 `target_date`가 버전 종료일(`s.end_date`, 2026-11-25)로 바인딩되어 있어, 실제 버전 오픈일(2026-10-15) 홈 대시보드 캘린더에서 해당 지출이 전혀 노출되지 않았음. (게임 버전 패스는 버전 시작일에 구매함).
  - **소비 페이지 지연 동기화 미연동**: `/dashboard/expenses` 초기 진입 시 `ensureMonthlySubscriptionExpenses`가 호출되지 않아, 이미 생성된 정기 구독의 미반영 회차가 자동으로 갱신되지 못했음.
- **수행 내역**:
  1. **인메모리 중복 방어 및 안전한 `.insert()` 전환 (`src/lib/subscription-sync.ts`)**:
     - `MONTHLY_DAY`와 `VERSION_PASS` 모두 기존 등록된 `template_id` 및 `schedule_id`를 선조회하여 아직 생성되지 않은 회차만 필터링한 후 `supabase.from("expenses").insert()`로 저장.
     - 다른 세션과의 동시성 충돌(`23505` 고유 키 위반)은 무해하게 예외 처리하여 42P10 오류 원천 제거.
  2. **버전 패스 결제 목표일(`target_date`) 시작일 바인딩 (`src/lib/subscription-sync.ts`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
     - 버전 패스 예정 회차의 `target_date`를 버전 시작일(`s.start_date`)로 지정하여, 홈 대시보드에서 버전 시작일(예: 10월 15일) 클릭 시 사이드바 지출 내역에 즉시 노출.
     - `sync_version_expenses_trigger()` SQL 트리거에서도 `VERSION` 일정 변경 시 `target_date = NEW.start_date`로 자동 동기화되도록 수정.
  3. **소비 페이지 진입 시 자동 지연 동기화 (`src/app/dashboard/expenses/page.tsx`)**:
     - `loadExpenses()` 실행 시 온라인 상태이면 `ensureMonthlySubscriptionExpenses`를 선행 호출하여, 기존에 추가되었던 버전 패스 및 정기 구독 회차가 소비 페이지 진입 즉시 자동 생성/보정되도록 개선.
  4. **단위 테스트 무결성 보강 (`src/lib/subscription-sync.test.ts`, `src/app/dashboard/expenses/page.test.tsx`)**:
     - `insert` 호출 및 버전 시작일(`target_date: "2026-10-09"`) 검증 테스트 갱신 (총 158개 테스트 100% PASS, Next.js 15개 정적 페이지 빌드 통과).

## Alt+Tab/창 전환 시 모달 입력값 초기화 방지 및 백그라운드 재조회 스켈레톤 언마운트 차단 완료 (2026-10-13)

- **배경 및 원인 분석**:
  - **스켈레톤 컴포넌트의 화면 언마운트**: `ExpensesPage` 및 `GamesPage`에서 `if (isLoading) return <Skeleton />` 패턴을 사용하고 있었는데, 사용자가 창 전환(Alt+Tab) 후 브라우저로 돌아올 때 창 포커스 이벤트 및 Supabase 세션 갱신으로 백그라운드 데이터 재조회(`loadExpenses()`)가 트리거됨.
  - 이 과정에서 `setIsLoading(true)`가 호출되면서 전체 화면이 스켈레톤 컴포넌트로 잠시 대체되었다가 복구되었고, 이때 활성화되어 있던 모달 다이얼로그(`<SubscriptionModal>`, `<ExpenseModal>`)가 언마운트 후 재생성되면서 폼 입력값이 모두 기본값으로 날아가는 현상 발생.
  - 또한 모달 내부 `useEffect`에서도 `open`이 열려 있는 상태에서 부모 리렌더링 시 폼 필드를 재설정하는 부작용이 존재했음.
- **수행 내역**:
  1. **페이지 레벨 최초 로드 가드 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`)**:
     - `hasLoadedInitialRef` 플래그를 도입하여 `if (isLoading && !hasLoadedInitialRef.current) return <Skeleton />` 형태로 최초 1회 진입 시에만 스켈레톤을 렌더링하고, 이후 백그라운드 재조회 시에는 화면 컴포넌트 트리를 절대 언마운트하지 않도록 수정.
     - 데이터 로드 콜백(`loadExpenses`, `loadSubscriptions`, `loadGames`)의 `useCallback` 의존성을 `user` 객체에서 불변 원시값인 `userId: user?.id`로 교체하여 창 포커스 시 불필요한 재호출 방지.
  2. **모달 내부 폼 리셋 가드 (`src/components/subscription/subscription-modal.tsx`, `src/components/expense/expense-modal.tsx`)**:
     - `prevOpenRef`를 적용하여 모달이 닫힌 상태에서 새로 열리는 전이 시점(`open && !prevOpenRef.current`)에만 폼을 초기화하도록 가드. 모달이 열려 있는 도중 부모 리렌더링이나 세션 갱신이 일어나도 사용자가 입력 중인 폼 상태가 영구 보존됨.
  3. **인증 컨텍스트 사용자 객체 레퍼런스 안정화 (`src/lib/auth-context.tsx`)**:
     - `setUser`에서 이전 사용자와 동일한 `id`, `email`, `updated_at`을 가질 경우 기존 레퍼런스를 유지하여 불필요한 React 전역 리렌더링 방지.
  4. **단위 테스트 보강 (`src/components/subscription/subscription-modal.test.tsx`)**:
     - 모달이 열려 있는 상태에서 `useAuth` 사용자 갱신 및 부모 리렌더링이 발생해도 입력한 내용이 초기화되지 않음을 검증하는 테스트 추가 (총 158개 테스트 100% 통과).
- **검증 무결성**:
  - Vitest: 37개 테스트 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `tsc --noEmit`: 0 errors.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공 (0 warnings).

## 페이지 로드 부드러움 향상 및 게임 아이콘 지연 로딩 최적화 완료 (2026-10-13)

- **배경 및 원인 분석**:
  - **아이콘 용량 불균형**: 전체 9개 공용 게임 아이콘 중 6개는 고압축 WebP(12KB~24KB)였으나, `nikke.png`(430KB), `star_rail.png`(209KB), `genshin.png`(184KB) 3종이 비압축 대용량 원본 PNG로 저장되어 있어 네트워크 다운로드 및 디코딩 병목으로 인해 해당 아이콘들만 뒤늦게 깜빡이며 로드되는 현상 발생.
  - **PWA 서비스 워커 캐시 누락**: `public/sw.js`에서 `/_next/static/`, `/icons/`만 정적 캐시(`isStatic`) 대상으로 등록되어 있어, `/assets/` 경로의 게임 아이콘들이 브라우저 캐시에 사전 저장되지 못하고 매번 네트워크를 탐색함.
  - **스토리지 404 요청 병목**: `/dashboard/games`에서 커스텀 아이콘이 없는 게임에 대해서도 매번 Supabase Storage로 다운로드를 시도하여 대량의 404 응답을 대기하느라 네트워크 커넥션 풀을 소진함.
  - **페이지 로드 깜빡임**: 대시보드, 소비, 게임 화면에서 데이터 로딩 중 전체 화면이 단순 "불러오는 중..." 텍스트로 대체되었다가 데이터 수신 후 전체 돔이 교체되는 깜빡임(Layout shift/FOUC) 발생.
- **수행 내역**:
  1. **게임 아이콘 에셋 고효율 최적화 (`public/assets/games/`)**:
     - `nikke.png`(430KB $\to$ 26KB, 94% 절감), `star_rail.png`(209KB $\to$ 18KB, 91% 절감), `genshin.png`(184KB $\to$ 14KB, 92% 절감) 3종을 256x256 WebP 포맷으로 변환(동일 경로/확장자 유지하여 스키마/시드 호환성 100% 보존). 전체 에셋 크기 ~900KB $\to$ ~160KB로 경량화.
  2. **PWA 서비스 워커 및 사전 로드 엔진 (`public/sw.js`, `src/lib/icon-preload.ts`)**:
     - `sw.js`의 `isStatic` 판별에 `/assets/` 및 `/fonts/` 추가, `PRECACHE_URLS`에 전체 게임 아이콘 등록 및 셸 캐시 v3 업그레이드.
     - `src/lib/icon-preload.ts`: 중복 없는 브라우저 메모리 캐시 이미지 프리로더 구현. 대시보드/소비/게임 데이터 패치 시 즉시 백그라운드 사전 로드 실행.
  3. **우아한 게임 아이콘 컴포넌트 (`src/components/ui/game-icon.tsx`)**:
     - 이미지 로딩 중 미세 펄스 스켈레톤 제공, 로드 완료 시 `transition-opacity duration-200` 페이드인 처리.
     - 로드 실패 시 Gamepad2 대체 아이콘 폴백. 캘린더, 게임 목록, 지출 내역에 전면 적용.
  4. **인메모리 유저 커스텀 아이콘 캐싱 (`src/lib/storage-upload.ts`)**:
     - `downloadUserIcon`에 인메모리 `Map` 캐시 계층 도입으로 세션 내 중복 다운로드 0ms 단축 및 404 실패 반복 요청 차단.
  5. **스켈레톤 UI 및 부드러운 페이지 전환 (`src/components/ui/skeleton.tsx`, `page-skeletons.tsx`, `src/app/dashboard/loading.tsx`)**:
     - 각 화면 레이아웃과 일치하는 `DashboardSkeleton`, `ExpensesPageSkeleton`, `GamesPageSkeleton` 구현.
     - Next.js 서스펜스 라우트 전환용 `src/app/dashboard/loading.tsx` 추가.
     - 콘텐츠 마운트 시 `animate-fade-in` CSS 애니메이션 적용으로 자연스러운 진입감 제공.
- **검증 무결성**:
  - Vitest: 37개 테스트 파일 / 158개 테스트 전체 통과 (100% PASS).
  - Next.js 프로덕션 빌드: 15개 정적 페이지 export 정상 완료 (0 error).

## 정기 구독 모달 연관 게임 선택 및 버전 패스형 활성화 버그 수정 완료 (2026-10-13)

- **배경 및 원인 분석**:
  - `SubscriptionModal`에서 카테고리 필드가 `'정기 구독'`으로 고정된 상태에서, 결제 주기 옵션(`CYCLE_TYPE_OPTIONS`)의 `VERSION_PASS` 비활성화 조건이 `category !== "게임"`으로 하드코딩되어 있어, 사용자가 연관 게임을 선택해도 '게임 버전 패스형' 옵션이 영구적으로 비활성화(`disabled`)되는 버그 발생.
  - 또한 `insert` 시 카테고리가 항상 `'정기 구독'`으로 저장되어 DB 제약조건(`chk_subscription_template_version_pass`) 및 `subscription-sync.ts`의 버전 패스 회차 생성 엔진 필터링 조건과 불일치할 위험이 있었음.
- **수행 내역**:
  1. `src/components/subscription/subscription-modal.tsx`:
     - `CYCLE_TYPE_OPTIONS` 비활성화 조건을 `opt.value === "VERSION_PASS" && !gameId`로 변경하여 연관 게임 선택 시 즉각 활성화.
     - `handleGameChange` 핸들러를 추가하여 연관 게임 선택 시 `category` 상태를 `'게임'`으로 자동 전환(미선택 시 `'정기 구독'`, `VERSION_PASS` 선택 상태에서 해제 시 `MONTHLY_DAY`로 자동 안전 복구).
     - 카테고리 인라인 입력란 `value={category}` 바인딩 및 `insert` 시 올바른 `category` 전달.
  2. `src/lib/subscription-sync.ts`:
     - `ensureMonthlySubscriptionExpenses`에서 `VERSION_PASS` 필터링 조건을 `t.cycle_type === "VERSION_PASS" && Boolean(t.game_id)`로 완화하여 방어적 동기화 보장.
  3. `src/components/subscription/subscription-modal.test.tsx`:
     - 연관 게임 선택 전 비활성화, 선택 후 활성화 및 카테고리 전환, 버전 패스형 저장, 게임 해제 시 `MONTHLY_DAY` 자동 복원 등 단위 테스트 보강.
- **검증 무결성**:
  - Vitest: 34개 테스트 파일 / 148개 테스트 전체 통과 (100% PASS).
  - `tsc --noEmit`: 0 errors.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트 완료 (2026-10-13)

- **배경 및 요구사항**:
  - 모바일 소형 뷰포트(360px~390px) 환경에서 모달 다이얼로그의 여백 패딩 및 입력 폼 가독성 향상.
  - 지출 목록 모바일 카드 뷰에서 긴 항목명과 픽업 뱃지가 겹치거나 잘리지 않도록 줄바꿈 래핑 최적화.
  - Phase 11 전체 변경분에 대한 TypeScript 타입 검사, 단위/통합 테스트, Next.js 정적 export 빌드 종합 검증.
- **수행 내역**:
  1. **모달 컴포넌트 모바일 패딩 최적화**:
     - `src/components/expense/expense-modal.tsx`: `DialogContent`에 `p-4 sm:p-6` 적용하여 좁은 화면에서의 폼 가용 영역 확보.
     - `src/components/expense/expense-detail-modal.tsx`: `DialogContent`에 `p-4 sm:p-6` 적용.
     - `src/components/subscription/subscription-modal.tsx`: `DialogContent`에 `p-4 sm:p-6` 적용.
  2. **모바일 카드 뷰 배지 레이아웃 보강 (`src/app/dashboard/expenses/page.tsx`)**:
     - 타이틀과 픽업 뱃지 컨테이너에 `flex items-center gap-1.5 flex-wrap`을 적용하여 좁은 화면에서도 뱃지가 오버플로우 없이 유연하게 줄바꿈되도록 개선.
  3. **종합 회귀 검증**:
     - Vitest: 34개 테스트 파일 / 146개 테스트 전체 통과 (100% PASS).
     - `tsc --noEmit`: 타입 오류 0건 (Clean).
     - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석 완료 (2026-10-13)

- **배경 및 요구사항**:
  - 기존 지출은 버전 일정(`schedule_id`) 단위로만 바인딩되어 동시 진행되는 복수 가챠(이중 픽업 등)의 픽업별 과금 통계를 확인할 수 없었음.
  - 가계부 지출에 특정 픽업 일정(`pickup_schedule_id`)을 선택적으로 바인딩하고, 소비 화면에서 게임별 픽업 과금액 순위, 막대 차트, 비중(%), 미지정 '버전 일반' 지출 분리 분석을 지원하는 기능 요구.
- **수행 내역**:
  1. **DB 스키마 및 마이그레이션 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`)**:
     - `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 추가.
     - `idx_expenses_pickup_schedule_id` 부분 인덱스 생성.
     - `validate_expense_references()` 트리거 함수에 픽업 일정의 게임 일치 검증 로직 반영.
     - TypeScript 데이터베이스 타입(Row, Insert, Update, Relationships)에 `pickup_schedule_id` 완벽 동기화.
  2. **지출 모달 UI (`src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`)**:
     - 카테고리가 '게임'이고 게임이 선택되었을 때 결제일(`paymentDate`) 기준 진행 중인 픽업 일정(`schedule_type = 'PICKUP'`) 목록을 조회하여 `[픽업 선택 (선택 사항)]` 드롭다운 제공.
     - 픽업 미선택 시 기본값 `""` (`null` 저장, "버전 일반 지출"로 집계).
     - 지출 insert 시 `pickup_schedule_id: isGameCategory && pickupScheduleId ? pickupScheduleId : null` 바인딩 저장.
     - 지출 상세 모달(`ExpenseDetailModal`) 내 픽업 타이틀(`pickupTitle`) 표시 항목 추가.
  3. **소비 화면(`/dashboard/expenses/page.tsx`) 통계 및 뱃지 UI**:
     - `game_schedules` 조회를 통해 schedule ID $\to$ title 맵을 메모리 캐싱.
     - 확정(`CONFIRMED`) 지출 기준 게임 픽업별 과금 분석 섹션 추가:
       - 게임 선택 필터 드롭다운 (전체 게임 / 개별 게임).
       - 가로 막대 차트 (`BarChart layout="vertical"`): 픽업별 총 과금액 막대 렌더링.
       - 픽업 과금 순위 랭킹 카드: 최다 과금 픽업 순위, 과금액, 비중(%), 결제 건수 표시.
       - 미지정 과금은 `'버전 일반'`으로 명확히 분리 표기하여 100% 회계 정합성 보장.
     - 지출 목록 테이블 및 모바일 카드 내 `[픽업명]` 뱃지 렌더링.
     - 확정 모달 및 환불 모달 호출 시 픽업 정보 연동.
  4. **단위 테스트 확장**:
     - `expense-modal.test.tsx`: 픽업 드롭다운 렌더링 및 `pickup_schedule_id` 저장 검증 (10/10 PASS).
     - `expense-detail-modal.test.tsx`: 픽업 타이틀 표시 검증 (5/5 PASS).
     - `expenses/page.test.tsx`: 픽업 과금 분석 섹션 렌더링, 픽업명/버전 일반 분리 집계, 테이블 뱃지 노출 검증 (6/6 PASS).
- **검증 증거**:
  - `npx vitest run`: 34개 테스트 파일 / 146개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 컴파일 에러 0건.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동 완료 (2026-10-13)

- **배경 및 요구사항**:
  - 기존 단일 결제수단 선택 방식에서 `[결제 플랫폼(Google Play, Galaxy Store, 기타)]` $\to$ `[결제 수단(내 지갑, 스토어 결제, 네이버페이)]` 2단계 종속 선택 구조로 개편.
  - 네이버페이 선택 시 실시간 잔액 비교 및 "부족 금액 안내 / 1만원 단위 충전 프리뷰" 인라인 카드 노출.
  - 잔액 부족 시 `[충전 후 결제]` 원클릭 승인 버튼 플로우 제공 (총 자산 부족 시 차단).
  - 자동 계산값 기본 채움 및 최종 실결제액 수동 오버라이드 지원 (할인 자동 역산).
  - 지출 상세 모달(`ExpenseDetailModal`) 내 네이버페이 결제 라벨 및 환불 안내 메시지 적용.
- **수행 내역**:
  1. **결제 모달 2단계 종속 선택 구조 (`src/components/expense/expense-modal.tsx`)**:
     - `PaymentPlatform` 타입(`GOOGLE_PLAY`, `GALAXY_STORE`, `OTHER`) 및 플랫폼별 결제수단 매핑 구성.
     - 플랫폼 변경 시 유효한 결제수단 동적 필터링 및 카테고리(`게임` vs 일반) 변경 시 플랫폼 자동 연동.
  2. **네이버페이 충전 프리뷰 및 원클릭 승인 플로우**:
     - `calculateNaverPayPayment` 모듈을 연동하여 네이버페이 선택 시 잔액 부족 여부, 부족액, 10,000원 단위 올림 충전액, 충전 후 예상 잔액을 인라인 카드로 실시간 렌더링.
     - 잔액 부족 시 버튼 텍스트가 `[충전 후 결제]`로 전환되고, 클릭 시 단일 트랜잭션 RPC(`process_expense_payment`)로 원자적 처리.
     - 총 자산 부족 시 `⚠️ 총 자산 잔액 부족` 경고 노출 및 버튼 비활성화(`[총 자산 부족]`).
     - 네이버페이 선택 시 사용 포인트 입력 필드 비활성화 및 0원 리셋 가드 적용.
  3. **최종 실결제액 수동 오버라이드 지원**:
     - 정가/쿠폰/할인/포인트 입력 시 실결제액 기본값이 자동 채워지며, `최종 실결제액 (원)` 필드를 사용자가 수동으로 직접 수정 가능.
     - 수동 수정 시 차액을 할인 금액으로 자동 역산하여 DB 제약조건(`chk_expense_math`) 및 RPC 정합성을 100% 무결하게 유지.
  4. **지출 상세 모달 갱신 (`src/components/expense/expense-detail-modal.tsx`)**:
     - 결제수단에 네이버페이 친화적 라벨 표시.
     - 네이버페이 환불 확인 시 "결제 금액을 네이버페이 머니 잔액으로 전액 환불합니다." 맞춤형 안내 제공.
  5. **단위 테스트 확장**:
     - `expense-modal.test.tsx`: 2단계 플랫폼/수단 필터링, 네이버페이 부족액 올림 충전 프리뷰 및 [충전 후 결제] RPC 파라미터 검증, 실결제액 수동 오버라이드 할인 역산, 포인트 비활성화 등 4개 신규 테스트 추가 (9/9 PASS).
     - `expense-detail-modal.test.tsx`: 네이버페이 라벨 및 환불 확인 메시지 테스트 추가 (4/4 PASS).
- **검증 증거**:
  - `npx vitest run`: 34개 테스트 파일 / 143개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 컴파일 에러 0건.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현 완료 (2026-10-12)

- **배경 및 요구사항**:
  - 기존 결제수단(`WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`)에 이어 현금성 간편결제 수단인 `NAVER_PAY`(네이버페이) 지갑 모델 구축.
  - 네이버페이 결제 시 현재 머니 잔액이 부족한 경우($S = \text{결제액} - \text{잔액} > 0$), 10,000원 단위 올림 충전($R = \lceil S / 10,000 \rceil \times 10,000$)을 계산하고 총 자산($B_{total} \ge R$) 검증 후 자산 차감 및 지갑 충전·결제 잔액 차감을 원자적 단일 트랜잭션으로 처리하는 로직 요구.
- **수행 내역**:
  1. **네이버페이 계산 엔진 모듈 (`src/lib/naver-pay-calculations.ts`)**:
     - 순수 함수 `calculateNaverPayPayment(currentBalance, paymentAmount, totalAsset)` 구현.
     - 잔액 충분 시 무충전 결제, 부족 시 10,000원 단위 올림 충전액 $R$ 산출, 총 자산 부족 시 `INSUFFICIENT_TOTAL_ASSETS` 에러 throw, 유효하지 않은 금액 입력 방어.
     - 단위 테스트(`naver-pay-calculations.test.ts`): 9가지 시나리오(잔액 충분, 0원 일치, 1원 부족, 1만원/1만1원 부족, 0원 시작 올림 충전, 총 자산 부족 차단, 음수/0원 예외) 작성 완료 및 9/9 PASS.
  2. **결제 타입 및 에러 매핑 확장 (`src/lib/payment-calculations.ts`)**:
     - `PaymentMethod` 및 `PointPlatform`에 `"NAVER_PAY"` 추가.
     - `estimateEarnedPoints`에서 네이버페이 결제 시 적립 0P 처리.
     - `mapPaymentError`에 네이버페이 충전 자산 부족(`INSUFFICIENT_TOTAL_ASSETS`) 및 지갑 부재 친화적 메시지 매핑 추가.
  3. **스토어/페이 지갑 관리 UI 갱신 (`src/components/wallet/store-wallet-widget.tsx`)**:
     - 상단 잔액 그리드를 3열(`sm:grid-cols-3`)로 확장하여 Google Play(P), Galaxy Store(P), **네이버페이 머니 잔액(원)** 동시 표시.
     - 잔액 수동 보정 드롭다운에 `NAVER_PAY` 옵션 추가 및 라벨을 `목표 잔액 (원)`으로 동적 전환.
     - `store-wallet-widget.test.tsx`에 네이버페이 렌더링 및 보정 RPC 테스트 추가 (4/4 PASS).
  4. **컴포넌트 타입/라벨 동기화**:
     - `src/components/expense/expense-modal.tsx`: `METHOD_LABELS`에 `NAVER_PAY: "네이버페이"` 추가.
     - `src/app/dashboard/expenses/page.tsx`: `METHOD_LABELS`에 `NAVER_PAY: "네이버페이"` 추가.
  5. **DB 스키마 및 마이그레이션 DDL 반영 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
     - `store_wallets`: `platform IN ('GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')`, `chk_wallet_platform_settings`에 `(platform = 'NAVER_PAY' AND user_tier IS NULL AND earn_rate = 0)` 추가.
     - `expenses`: `payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE', 'NAVER_PAY')`.
     - `store_point_transactions`: `platform`에 `NAVER_PAY`, `transaction_type`에 `RECHARGE` 추가.
     - `adjust_wallet_balance`: `p_platform = 'NAVER_PAY'` 시 기본 earn_rate 0, tier NULL로 행 생성/보정 처리.
     - `process_expense_payment`: 네이버페이 결제 시 부족액 검증, $R$ 계산, 총 자산 검증 및 $R$ 자산 차감, 네이버페이 $R$ 충전(`RECHARGE`), 네이버페이 $P$ 결제 차감(`USE`) 단일 트랜잭션 수행. 끝부분의 일반 자산 차감(`p_deduct_asset`) 시 네이버페이 결제는 제외(`p_payment_method <> 'NAVER_PAY'`)하여 **자산 이중 차감 원천 방지**.
     - `refund_expense_payment`: `payment_method = 'NAVER_PAY'`인 경우 네이버페이 지갑 잔액으로 환불 증액 및 `REFUND` 로그 기록, 일반 자산 복원 시 네이버페이는 제외하여 **자산 이중 증액 원천 방지**.
- **검증 증거**:
  - `npx vitest run`: 34개 테스트 파일 / 138개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 컴파일 오류 0건.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 회원가입 페이지 분리 및 닉네임 입력 지원 완료 (2026-10-12)

- **배경 및 요구사항**:
  - 기존 `/auth`에서 로그인과 회원가입이 단일 화면/폼에 공존하던 구조에서, 기존 로그인 화면의 UI 형태를 그대로 유지한 채 회원가입 버튼 클릭 시 별도 회원가입 전용 페이지(`/auth/signup`)로 이동하도록 라우팅 분리.
  - 회원가입 페이지에서 이메일, 비밀번호, 닉네임을 필수 입력받아 계정을 생성하도록 구현.
- **수행 내역**:
  1. **신규 회원가입 페이지 (`src/app/auth/signup/page.tsx`)**:
     - 이메일, 비밀번호(6자 이상), 닉네임(최대 20자) 입력 필드 및 유효성 검증 제공.
     - `supabase.auth.signUp` 호출 시 `options: { data: { nickname: trimmedNickname } }` 메타데이터를 전달하여 `raw_user_meta_data`에 저장.
     - 즉시 세션이 활성화되는 경우 `users` 테이블의 `nickname` 컬럼 업데이트 폴백 및 `/dashboard` 자동 이동.
     - 이메일 인증이 필요한 환경의 경우 안내 메시지 출력.
     - 이미 로그인된 상태일 경우 `/dashboard`로 리다이렉트.
     - 기존 로그인 화면으로 돌아갈 수 있는 `<Link href="/auth">로그인</Link>` 제공.
  2. **기존 로그인 페이지 (`src/app/auth/page.tsx`)**:
     - 기존 로그인 및 Google OAuth UI는 유지하되, 인라인 `handleSignUp` 로직을 제거하고 '회원가입' 버튼 클릭 시 `router.push("/auth/signup")`으로 이동하도록 변경.
  3. **라우팅 방어 (`src/app/dashboard/auth/page.tsx`)**:
     - `/dashboard/auth` 경로 접근 시 `/auth`로 즉시 치환 리다이렉트 처리.
  4. **테스트 및 검증**:
     - `src/app/auth/page.test.tsx`: 회원가입 버튼 클릭 시 `/auth/signup` 네비게이션 호출 검증 반영.
     - `src/app/auth/signup/page.test.tsx`: 렌더링, 기존 로그인 시 리다이렉트, 닉네임 메타데이터 전달 및 가입 성공/확인 메일 안내/실패 에러 검증 등 5개 단위 테스트 작성.
     - Vitest 33개 파일 / 128개 테스트 전체 통과 (100% PASS).
     - Next.js 정적 export 15개 페이지 빌드 성공 (`next build`).

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 파이프라인 편입 (2026-10-12)

- **배경 및 요구사항**:
  - 기존 지출은 결제일 기준 거시적 주기인 `VERSION` 일정에만 단일 바인딩되어, 동시 진행되는 복수 픽업/가챠(예: 켈시 vs 클로저)별 실제 과금 규모 분석이 불가했음.
  - 사용자의 요청에 따라 지출-픽업 1:1 바인딩 및 소비 통계 분석 기능을 Phase 11.4 파이프라인으로 정식 등록.
- **설계 확정안**:
  1. **DB 스키마**: `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 추가. 기존 `schedule_id`(버전)와 공존하여 거시/미시 분석 동시 지원.
  2. **지출 모달 UI**: 게임 카테고리 선택 시, 해당 결제일에 진행 중인 `PICKUP` 일정을 드롭다운(`[픽업 선택 (선택 사항)]`)으로 선택 가능.
  3. **소비 페이지 통계**: `/dashboard/expenses`에 선택 게임의 픽업별 확정 지출 가로 막대 차트(Bar Chart) / 랭킹 카드, 버전 내 픽업 비중(%), 픽업 미지정 지출('버전 일반') 분리 집계 제공.
- **검증 환경 최신화**:
  - `games/page.test.tsx` MockQuery 타입 정의를 개선하여 `tsc --noEmit` 에러(0건) 및 Next.js ESLint 빌드 에러 완전 해소.
  - Vitest 32개 파일 / 123개 테스트 전체 통과 (100% PASS), `npm run build` 정적 13개 페이지 export 빌드 성공.

## Phase 11.2 사이드바 동일 게임·기간 일정 그룹핑 (2026-10-12)

- **완료**: 동시 픽업은 캐릭터별 개별 일정으로 등록하는 원칙 확정. `hero-sidebar.tsx`에서 같은 게임·유형·기간 일정을 한 카드(`• 제목` 목록)로 그룹핑, `dashboard/page.tsx`에서 `gameId` 전달, 테스트 2건 추가.
- **검증**: 관련 vitest 10/10 통과. `games/page.test.tsx`의 타입 정의를 보완하여 `tsc --noEmit` 0 에러 달성.
- **다음 단계**: 기존 `'/'` 형식 일정을 관리자 화면 `[복사]` 버튼으로 개별 일정으로 분리.
- **추가 완료**: 관리자 공식 일정 목록에 `[복사] [수정] [삭제]` 버튼 배치 및 복사(원본 값 프리필 → 새 일정 insert) 구현, 테스트 2건 추가(admin 10/10 통과).

## Phase 11.1 게임 일정 다변화, 일정 모달 전환 및 대시보드/사이드바 3단 UI·정렬 일원화 완료 (2026-10-12)

- **수행 내역**:
  1. **게임 일정 스키마 확장 (`CONTENTS`, 단일 목표 일정)**:
     - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: `chk_schedule_type` 제약조건에 `'CONTENTS'` 추가 및 트리거 함수 갱신.
     - 단일 목표 일정(`start_date = end_date = target_date`) 구조를 채택하여 기존 날짜 범위 쿼리와 100% 하위 호환 유지.
     - `src/components/calendar/schedule-banner.tsx`: 콘텐츠(`CONTENTS`) 보라색 배지 스타일 추가 및 텍스트/패딩 크기 최적화(`text-[8px] md:text-[9px]`, `px-1 py-[1px]`).
     - `src/app/admin/page.tsx`: 일정 타입 선택에 `CONTENTS` 추가, "단일 목표 일정 (하루만 진행)" 체크박스 토글 UI 지원 및 목록 배지/단일 일정 표기 개선.
     - `src/components/game/request-submission-modal.tsx`, `request-validation.ts`: 유저 요청 모달 및 유효성 검증기에 `CONTENTS` 지원 추가.
  2. **캘린더 타일 배지 우선순위 및 배치 개선 (`desktop-calendar.tsx`)**:
     - 타일 좌측 배지가 겹칠 경우 엄격하게 `[VERSION]` $\to$ `[PICKUP]` $\to$ `[CONTENTS]` 순서로 정렬 노출.
     - 3개 배지가 모두 겹치더라도 날짜 번호(`day.day`)를 가리지 않도록 상단(날짜 숫자 + 게임 아이콘)과 하단(`mt-auto` 배지 스택)을 수직 분리하는 `flex-col justify-between min-h-[72px] md:min-h-[96px]` 레이아웃 적용.
     - `VERSION` 배지 바로 우측의 중복 게임 아이콘 완전 제거, `PICKUP` 및 `CONTENTS` 배지 또한 `start_date`에만 단일 표기.
     - 동일 날짜에 둘 이상의 게임 일정이 시작될 경우 타일 우측 게임 아이콘을 **게임명 가나다순(`a.label.localeCompare(b.label, "ko")`)**으로 상 $\to$ 하 정렬.
     - 헤더 월 이동 버튼(`<`, `>`)을 `public/assets/nav/`의 신규 SVG 에셋으로 교체하고, 라이트/다크 테마 전환 시 화살표 색상이 즉각 동기화되도록 전용 CSS 클래스 및 Tailwind selector darkMode 적용.
  3. **선택일 일정(`HeroSidebar`) 3단 수직 구조 개편**:
     - 기존 가로형 레이아웃에서 발생하던 긴 게임명/제목 말줄임 깨짐을 해결하기 위해 직관적인 3단 카드 구조로 전면 개편:
       - 1행: `[배지] 게임명`
       - 2행: `YYYY-MM-DD ~ YYYY-MM-DD`
       - 3행: `일정 제목` (굵은 텍스트)
       - 4행: `메모` (존재할 경우)
  4. **전체 화면 일정 정렬 로직 일원화**:
     - 1순위 `start_date` 오름차순(ASC), 2순위 `end_date` 오름차순(ASC) 기준을 전역 통일:
       - 홈 대시보드 사이드바(`hero-sidebar.tsx`, `daySchedules`)
       - 게임 관리 내 구독 게임 일정 보기 모달(`dashboard/games/page.tsx`)
       - 관리자 센터 공식 일정 목록(`admin/page.tsx`)
  5. **게임 관리(`/dashboard/games`) 내 구독 게임 일정 모달 및 만료 필터링**:
     - 기존 우측 슬라이드인 Sheet를 화면 중앙 팝업 다이얼로그(`<Dialog>`)로 전환.
     - `gte("end_date", today)` 필터링을 통해 이미 종료된 '만료 일정'을 제외하고 현재 진행 중이거나 예정된 일정만 깔끔하게 노출.
  6. **지출 모달 및 정기 구독 모달 UI 정돈**:
     - `ExpenseModal`: `[연결된 버전 일정]` 레이블 변경, 비활성화 안내 문구 제거, 상시 disabled 상태로 매칭 버전 명칭만 노출(기간 텍스트 제외).
     - `SubscriptionModal`: 결제수단 필드를 '내 지갑'(`WALLET`, disabled)으로 고정.
- **검증 결과 (100% PASS)**:
  - `npx vitest run`: 32개 테스트 파일 / 119개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 export 13개 페이지 생성 성공 (Linting 및 정적 HTML 생성 완료).

## Phase 10.7 페이지별 UI 및 인터랙션 긴급 개선 완료 (2026-10-12)

- **수행 내역**:
  1. **화면 깜빡임 / 창 가려짐 리셋 / 모달 닫힘 근본 해결**:
     - `src/app/dashboard/layout.tsx`: `hasMountedChildren` ref를 도입하여 대시보드 마운트 이후 백그라운드 토큰 갱신이나 윈도우 포커스 전환(Alt+Tab) 시 `{children}` 컴포넌트 트리가 unmount되지 않도록 가드.
     - `src/lib/auth-context.tsx`: `onAuthStateChange`에서 `TOKEN_REFRESHED` 등 포커스 전환 이벤트 발생 시 불필요하게 `isAccountDeletionStatusLoading(true)`를 트리거하여 레이아웃을 리셋시키던 결함 원천 차단.
  2. **대시보드 에러 방어 및 쿼리 하위 호환**:
     - `src/lib/subscription-sync.ts`: 원격 Supabase DB에 `cycle_type` 컬럼이 아직 없더라도 42703 오류로 대시보드가 죽지 않고 안전하게 `MONTHLY_DAY`로 폴백 조회하도록 개선.
     - `src/app/dashboard/page.tsx`: 구독 생성 호출을 비차단 `try...catch`로 감싸고 `overdueResult` 쿼리를 안전한 표준 필터로 단순화.
  3. **소비 페이지(`/dashboard/expenses`) 버튼 분기 및 문구 수정**:
     - 상단 헤더 액션 버튼: `activeTab === "expenses"`일 때는 `+ 지출 추가`, `activeTab === "subscriptions"`일 때는 `+ 구독 추가`로 자동 분기하여 정기 구독 탭에서 불필요한 `+ 지출 추가` 버튼 제거.
     - 정기 구독 탭 타이틀/설명: `정기 구독 템플릿` $\to$ `정기 구독`, `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스 템플릿을 관리합니다.` $\to$ `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.`.
     - 30일 누적 충전형(`INTERVAL_30`) 구독 카드: 잔여일수 배지(`남은 N일`) 표시 및 `[남은 날짜 수정]` 버튼/다이얼로그 추가. 사용자가 현재 남은 충전일수를 입력하면 다음 결제 예정일(D-day)이 자동 계산되어 예정 지출에 즉시 동기화.
     - 예정 지출 결제 확정 시 결제 수단(`payment_method`), 할인, 쿠폰, 사용 포인트 자유 수정 지원.
  4. **지출 모달(`ExpenseModal`) 및 상세 모달(`ExpenseDetailModal`) 할인/포인트 모델 일원화**:
     - 카테고리 목록에서 `정기 구독` 삭제 (`["게임", "식비", "교통", "생활", "기타"]`).
     - 혼란을 주는 "포인트 할인 (원)" 입력 필드 삭제 $\to$ `정가 (원)`, `쿠폰 (%)`, `할인 (원)`, `사용 포인트 (P)`의 직관적 4대 필드로 일원화 (1P = 1원 자동 연동).
  5. **구독 모달(`SubscriptionModal`) 개편**:
     - 카테고리: `정기 구독`으로 고정(read-only).
     - 제목 placeholder `예: ~` 문구 제거.
     - 30일 누적 충전형 설명: `월정액 결제 시마다 +30일 연장 누적`으로 변경.
  6. **게임 관리(`/dashboard/games`) 및 관리자(`/admin`) UI 정리**:
     - `GameSelectModal`: 트리거 버튼 문구를 `+ 구독 추가`에서 `구독 추가`로 수정하여 `+ + 구독 추가` 중복 표시 해결.
     - `AdminPage`: 일정 타이틀 placeholder `예: 1.2 버전 업데이트` 제거 및 명확한 안내로 교체.
  7. **원격 DB 마이그레이션 스크립트 작성**:
     - `md/MIGRATION_PHASE10.sql`: 사용자가 Supabase SQL Editor에서 실행할 수 있는 `cycle_type` 컬럼 추가, `billing_day` NOT NULL 해제, 멱등성 인덱스 DDL 스크립트 생성.
  8. **캘린더 타일 아이콘 표시 방식 개선**:
     - `src/app/dashboard/page.tsx`: `start_date`와 `end_date`를 가지는 복수일 기간 일정(버전, 픽업 등) 및 기간형 지출의 경우, 캘린더 타일 우측 상단 게임 아이콘을 전체 기간 동안 반복 표기하지 않고 **오직 `start_date` 타일에만 단일 표기**하도록 `dateGameIcons` 맵 분리 구현.
     - 날짜 클릭 시 사이드바 및 모바일 드로어 상세 목록(`daySchedules`)에서는 기간 내 전체 일정이 정상 표시되도록 보존.
  9. **Galaxy Store 등급 설정 저장 호환성 강화**:
     - `src/components/wallet/store-wallet-widget.tsx`: 구버전 원격 DB RPC 호환을 위해 `p_tier: galaxyTier` 호출 실패 시 `p_tier: null`로 안전하게 폴백 재시도하여 등급/적립률이 정상 저장되도록 보완.
     - `md/MIGRATION_PHASE10.sql`: 최신 `update_store_wallet_settings` RPC DDL을 마이그레이션 스크립트에 포함하여 사용자 SQL Editor 적용 지원.
  10. **미구독 게임의 캘린더 일정 노출 차단**:
      - `src/app/dashboard/page.tsx`: `user_games` 구독 게임 목록을 기준으로 캘린더 일정을 필터링(`subscribedSchedules`)하여, 구독하지 않은 게임(예: 명일방주: 엔드필드)의 공용 버전/픽업 일정이 캘린더에 노출되지 않도록 해결.
  11. **관리자 센터 상단 서브 탭 내비게이션 구축**:
      - `src/app/admin/layout.tsx`: 관리자 페이지(`/admin`)와 유저 요청 관리(`/admin/requests`) 간을 자유롭게 오갈 수 있는 상단 탭 내비게이션 바(`[일정 관리]`, `[요청 관리]`) 추가.
  12. **관리자 공식 일정 목록 조회 / 수정 / 삭제 기능 전면 구현**:
      - `src/app/admin/page.tsx`: 등록된 게임 일정 전체 목록 카드 및 게임별 필터링 기능 추가. 각 일정별 `[수정]` 모달(타이틀, 유형, 기간, 메모 수정 및 연결 지출 자동 동기화) 및 `[삭제]` 확인 다이얼로그 추가.
  13. **요청 관리(`/admin/requests`) 관리자 권한 판정 일원화 및 레이아웃 정리**:
      - `src/app/admin/requests/page.tsx`: 기존 `user.app_metadata.role === 'admin'` 단독 검사로 인해 DB 프로필(`public.users.role`)로 관리자 권한을 부여받은 계정에서 "관리자 권한이 필요합니다." 에러가 발생하던 결함 해결. `const isAdmin = role === "admin" || user?.app_metadata?.role === "admin"`으로 판정 기준을 통일하여 `AdminLayout`, `AdminPage`, `Topbar`와 일관성 확보.
      - `AdminLayout`과 중복되던 불필요한 `min-h-screen bg-gray-900` 래퍼 및 중복 헤더를 정리하고 테마 시스템(`bg-surface`, `border-line`, `text-content`)으로 통일.
      - `src/app/admin/requests/page.test.tsx`: auth context의 `role === 'admin'` 기반 조회 지원 테스트 추가.
  14. **소비/게임/관리자 헤더 높이 통일, 중복 버튼 정리 및 관리자 화면 요청 기능 은닉**:
      - `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`, `src/app/admin/layout.tsx`: 좌상단 타이틀(소비, 게임, 관리자 센터)의 Y축 높이와 `border-b border-line pb-4` 스타일을 일치시키고, 우측 액션 버튼(`[+ 지출 추가]`, `[+ 구독 추가]`, `[+ 추가 요청]`) 및 관리자 탭 링크의 높이를 `h-10`(40px)으로 완전 통일.
      - 소비 화면: 정기 구독 탭 본문 영역에 존재하던 중복 `+ 구독 추가` 버튼 제거 (상단 헤더에 1개만 단일 배치).
      - 게임 화면: 하단 카드에 중복 노출되던 버튼 제거 (헤더에 1개씩만 단일 배치).
      - 관리자 계정 격리: `role === 'admin'` 계정의 경우 `/dashboard/games`에서 게임 추가 요청 버튼(`[+ 추가 요청]`) 및 요청 안내 카드를 숨기고, `/dashboard/settings`에서 `UserRequestsCard`(내 요청 내역)를 숨김 처리.
- **검증 결과 (100% PASS)**:
  - `npx.cmd tsc --noEmit`: 0 오류.
  - Vitest: 31개 테스트 파일 / 115개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 export (`npm run build`): 13개 페이지 빌드 성공.

## Phase 2.5 TypeScript Database 타입 자동 생성 완료 (2026-10-12)

- **생성 명령**: `npx.cmd supabase gen types typescript --db-url "postgresql://postgres.[REF]:[PW]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"`
- **수행 내역**:
  - 원격 Supabase DB의 12개 테이블, RPC 함수, 뷰, 제약조건을 기반으로 `src/types/database.types.ts` 자동 갱신.
  - `Database['public']['Tables']['personal_memos']['Row']`, `account_deletion_requests`, `expenses`, `game_requests`, `game_schedules`, `games`, `monthly_budgets`, `schedule_requests`, `store_point_transactions`, `store_wallets`, `subscription_templates`, `user_games` 등 12개 핵심 테이블 타입 정의 확인.
- **검증 결과 (100% PASS)**:
  - `npx.cmd tsc --noEmit`: TypeScript 컴파일 에러 0건.
  - Vitest: 30개 테스트 파일 / 106개 테스트 전체 통과 (100% PASS).

## Phase 2.3 & 7.1 DB RLS 및 스케줄 동기화 실행 검증 완료 (2026-10-12)

- **검증 환경**: Supabase 전용 테스트 프로젝트 (`aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`) 대상 `psql` 17.11 실행.
- **수행 작업**:
  - `md/TESTS.sql` 내 누락되어 있던 `test_game_id` 세션 설정(`set_config('chronoledger.test_game_id', :'test_game_id', true)`) 스크립트 결함 수정.
  - `psql`로 `md/TESTS.sql` 전체 스위트(`ON_ERROR_STOP=1`) 실행.
- **검증 결과 (100% PASS 및 ROLLBACK 완료)**:
  - **Phase 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증 완료 (`REQ-02`)**:
    - 일반 사용자 JWT로 타 사용자 행 접근 및 수정 시도 시 완전 격리/차단 확인.
    - `store_wallets` 잔액 직접 수정 차단, `store_point_transactions` 원장 직접 쓰기 차단 확인.
    - `expenses` 물리 삭제 차단 (`DELETE` 정책 부재로 차단), `subscription_templates` 물리 삭제 차단 확인.
    - 일반 사용자 권한으로 게임/일정 요청 상태를 임의로 `APPROVED`로 변경하는 쓰기 시도 차단 확인.
  - **Phase 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증 완료 (`SCH-01`, `SCH-02`)**:
    - 관리자가 버전/픽업 일정 날짜 변경 시 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 자동 동기화됨을 확인.
    - 이미 결제된 `CONFIRMED` 지출 및 `CANCELLED` 지출은 보존되며, 날짜 외 컬럼 변경 시 무동기화 원칙 검증 완료.
  - **전체 트랜잭션 롤백 확인**: `PASS: all smoke-test fixtures and mutations rolled back` 출력 및 단일 트랜잭션 원자적 `ROLLBACK` 완료 (DB 내 더미 데이터 잔여 없음).

## Phase 10 재정리 기획(v2) 구현 진행 현황 (2026-10-12)

- **10.1 대시보드 캘린더 및 지출 바인딩 로직 개선 완료**:
  - `HeroSidebarContent`, `MobileDrawer`: 버튼명 `+ 지출 추가`로 변경, 누락된 `schedules` prop 기본값 디스트럭처링 버그 수정.
  - `ExpenseModal`: 카테고리 우선 선택(게임일 때만 게임 선택 노출), 해당 결제일의 `VERSION` 일정에만 단일 바인딩 (`PICKUP` 일정 바인딩 제외 및 기간 내 버전 자동 매칭), 결제일 `initialDate` 연동.
  - `dashboard/page.tsx`: TDZ `allGamesMap` 버그 수정, `budget-calculations.ts`의 `isBudgetCounted`에서 `CONFIRMED` 복원.
  - 검증: Vitest 26개 파일/86개 테스트 전체 통과.

- [x] 10.2 소비(`/dashboard/expenses`) 화면 UI 개편 완료:
  - 상단 헤더: `+ 지출 추가` 버튼 추가 및 `ExpenseModal` 연동.
  - 뷰 전환 탭: `[지출 내역 및 통계 | 정기 구독]` 서브 탭 분리 구성.
  - 통계 영역: 카테고리별 비중을 Recharts **원그래프(Pie Chart)**로 교체, 월별 소비 추이 **세로 막대그래프(Bar Chart)** 제공.
  - 집계 기준 엄격 적용: **오직 `CONFIRMED` 지출만 집계** (`PLANNED`, `CANCELLED` 제외).
  - 목록 영역: 데스크톱 반응형 테이블 및 모바일 카드 뷰 구현, 액션 버튼 통일(`PLANNED` -> `[확정]`, `[취소]`, `CONFIRMED` -> `[환불]`, `CANCELLED` -> `[되돌리기]`), 전용 RPC(`cancel_planned_expense`, `restore_cancelled_expense`, `refund_expense_payment`) 연동.
  - 검증: `src/app/dashboard/expenses/page.test.tsx` 4개 테스트 추가, Vitest 27개 파일/90개 테스트 전체 통과, `npx tsc --noEmit` 통과, Next.js 정적 export (`npm run build`) 13개 페이지 빌드 성공.

- **10.3 정기 구독 탭 및 3종 주기 모델(A안) 구현 완료**:
  - DB 스키마: `md/SCHEMA.sql`에 `subscription_templates`의 `cycle_type` 컬럼 및 체크 제약(`chk_subscription_template_version_pass`) 추가, `idx_expenses_template_schedule_id` 유니크 인덱스 추가.
  - 동기화 엔진: `src/lib/subscription-sync.ts`의 `ensureMonthlySubscriptionExpenses`에 3종 주기 모델 회차 생성 확장 (`MONTHLY_DAY` 매월 지정일 보정 생성, `INTERVAL_30` 30일 누적 충전식 회차 생성, `VERSION_PASS` 게임 새 버전 시작일 연동 생성).
  - 구독 모달: `src/components/subscription/subscription-modal.tsx` 구현. 카테고리 우선 선택(게임일 때만 게임 선택 노출), 3종 주기 모델 선택, 생성 시 `ensureMonthlySubscriptionExpenses` 즉시 실행.
  - 화면 UI: `src/app/dashboard/expenses/page.tsx` 내 `정기 구독` 서브 탭에 카드 그리드 렌더링, `[+ 구독 추가]` 버튼 및 모달 연동, `is_active` 활성화 토글 스위치 제공.
  - 검증: Vitest 28개 파일/99개 테스트 통과, `npx tsc --noEmit` 통과, 정적 export 빌드 성공.

- **10.4 게임 관리(`/dashboard/games`) 추가 요청 모달 개선 완료**:
  - 모달 템플릿 개편 (`src/components/game/request-submission-modal.tsx`):
    - 버튼명 `[+ 추가 요청]`으로 통일 및 프로젝트 디자인 시스템 토큰 적용.
    - [게임 요청 | 일정 요청] 선택 분기:
      - 게임 요청: '게임 제목'(`name`)만 입력하는 간결한 템플릿 제공 (`memo: null` 인입).
      - 일정 요청: '게임 선택'(`gameId`) $\to$ 기간 설정(`startDate` ~ `endDate`) $\to$ 일정 종류(`VERSION` / `PICKUP`) $\to$ 일정 제목(`title`) 및 내용/메모(`scheduleMemo`) 입력 템플릿 제공.
  - 카탈로그 등록 모달 (`src/components/game/game-select-modal.tsx`):
    - `[+ 구독 추가]` 트리거 버튼 연동 및 디자인 토큰 적용.
  - 화면 UI 전면 개편 (`src/app/dashboard/games/page.tsx`):
    - 상단 헤더: `+ 구독 추가`, `+ 추가 요청` 액션 버튼 배치.
    - 내 구독 게임 섹션: 반응형 그리드 카드, 게임 커스텀 아이콘 표시, `[일정 보기]`(공식 일정 시트), `[아이콘 변경]`(256×256 WebP Canvas 자동 변환 및 Storage 업로드), `[구독 해제]`(지출 내역 보존 안내 및 `user_games` 삭제) 제공.
    - 하단 액션 카드: "원하는 게임이나 일정이 없으신가요?" 안내와 함께 `[+ 구독 추가]`, `[+ 추가 요청]` 버튼 제공.
  - 검증: `src/app/dashboard/games/page.test.tsx` 4개 테스트 추가, `src/components/game/request-submission-modal.test.tsx` 5개 테스트 통과, Vitest 29개 파일/103개 테스트 전체 통과, `npx tsc --noEmit` 통과, Next.js 정적 export (`npm run build`) 13개 페이지 빌드 성공.

- **10.5 설정(`/dashboard/settings`) Galaxy Store 등급 개편, 재무 설정 및 내 요청 내역 조회 완료**:
  - Galaxy Store 4대 공식 등급 반영:
    - 계산 모듈: `src/lib/payment-calculations.ts`에 `GALAXY_TIER_RATES`, `GalaxyTier`, `GALAXY_TIER_LABELS` (일반 0.1%, 스타 0.1%, 프레스티지 1.1%, 로열블루 2.1%) 추가.
    - DB 스키마: `md/SCHEMA.sql`의 `chk_wallet_platform_settings` 및 `update_store_wallet_settings` RPC에 4대 등급 동기화 (기존 레코드 `user_tier IS NULL` 마이그레이션 호환 보장).
    - UI: `src/components/wallet/store-wallet-widget.tsx` Galaxy Store 적립률 수동 입력을 공식 등급 선택 드롭다운으로 개편 및 디자인 시스템 토큰 적용.
  - 개인 재무 설정 카드 신규 구현 (`src/components/finance/finance-settings-card.tsx`):
    - 총 자산(`total_asset`) 및 기본 월 예산(`default_budget`) 조회/수정 기능 제공.
    - `set_user_finance_settings` RPC 및 오프라인 방어 가드 연동.
  - 내 요청 내역 조회 카드 신규 구현 (`src/components/game/user-requests-card.tsx`):
    - 사용자가 제출한 게임 요청(`game_requests`) 및 일정 요청(`schedule_requests`) 상태(`PENDING`, `APPROVED`, `REJECTED`) 조회.
    - 전체 / 게임 / 일정 필터 탭 제공 및 관리자 피드백 메모(`admin_memo`) 표시.
  - 설정 페이지 레이아웃 통합 (`src/app/dashboard/settings/page.tsx`):
    - 프로필 사진/닉네임 $\to$ 개인 재무 설정 $\to$ 스토어 지갑 관리 $\to$ 내 요청 내역 $\to$ 계정 삭제 순서로 깔끔하게 배치.
  - 검증: `src/app/dashboard/settings/page.test.tsx` 3개 테스트 추가, `src/components/wallet/store-wallet-widget.test.tsx` 3개 테스트 통과.

- **10.6 종합 검증 및 회귀 테스트 완료**:
  - TypeScript 전체 검사: `npx tsc --noEmit` 무결점 통과 (오류 0건).
  - 단위 및 통합 테스트: `npm run test -- --run` Vitest 30개 파일 / 106개 테스트 100% 통과 (PASS).
  - Next.js 프로덕션 빌드: `npm run build` 정적 export 13개 페이지(루트, 인증, 대시보드, 지출, 게임, 설정, 관리자 등) 최적화 산출물 성공 생성.

## Phase 9 Iteration 01 (2026-10-09)

- 상단바 재구성 및 UI 미세 조정 구현(UI만, 가계부·일정 탭 페이지 로직은 미구현). 검증: tsc, Vitest 24 파일/79 테스트, lint, dummy env build 통과. 실브라우저 시각 확인은 미검증.

## Phase 8 Iteration 01 (2026-10-10)

- UI/UX 폴리싱 구현(토큰·테마·폰트·컴포넌트·반응형). 검증: tsc는 기존 베이스의 `src/__tests__/functions` 2개 파일 모듈 미해결 오류만 존재, Vitest 22 파일/73 테스트 통과(위 2 스위트는 기존 import 오류로 실패), lint 통과, dummy env build 통과. 실브라우저 시각·대비·라이트 테마 확인은 미검증.

## Phase 7 Iteration 03 (2026-10-09)

- SW 읽기 API 캐시(사용자별), 기본 브랜드 아이콘, 7.3 완료 표기. 상세는 handoff.md 참조.

## Phase 7 Iteration 02 (2026-10-09)

- 리뷰 5건(P7-F1~F5) 반영: 차단형 만료 모달 자동 표시, end_date 기준 조회 정합, 앱 셸 Service Worker, 오프라인 쓰기 가드 확대, manifest id·apple-touch 아이콘. 7.3은 개인 데이터 오프라인 조회 캐시 미구현으로 부분 완료(체크 해제)로 정정했다.
- 검증: tsc, Vitest(23 files/75 tests), lint, dummy 공개 Supabase 값 build(`out/sw.js` 생성) 통과. 브라우저 SW·Android·실DB 동작은 미검증.

## Phase 7 Web/PWA 통합 구현 (2026-10-08)

- 7.1: `md/TESTS.sql` SCH-02 시나리오 추가(미실행, 격리 Supabase 테스트 프로젝트에서 실행 필요).
- 7.2: `src/lib/budget-calculations.ts`, `overdue-planned-modal.tsx`, 대시보드 연동. 결제 시 RPC가 target_date를 결제일로 바꾸므로 익월 예정액이 재조회 시 즉시 줄어든다.
- 7.3: `public/manifest.json`, 임시 아이콘(`public/icons`, 정식 브랜드 아이콘 교체 필요), `offline-banner.tsx`, `use-online-status.ts`. 오프라인에서는 지출 등록·결제·환불·지갑 설정·예정 취소 버튼이 잠긴다. Service Worker/캐시는 미구현이므로 오프라인 읽기는 이미 로드된 화면에 한정된다.
- 7.4: tsc, Vitest(22 files/70 tests), lint, dummy 공개 Supabase 값 build 통과(`out/manifest.json` 생성 확인). Android 설치·실제 오프라인·세션 만료 동작은 미검증.

## Phase 6 가계부, 결제/환불 RPC, 포인트 지갑 구현 (2026-10-08)

- 6.1 `store-wallet-widget.tsx`(구글 등급/갤럭시 적립률 저장, 잔액 수동 보정), 6.2 `expense-modal.tsx`(계층 등록, 결제수단, 할인/포인트 할인, 자산 차감, 예: 119,000-5,000=114,000), 6.3 `expense-detail-modal.tsx`(결제 취소/환불)를 구현했다.
- 검증: tsc, Vitest(19 files/59 tests), lint, dummy 공개 Supabase 값 build 통과.
- 미검증: 실제 Supabase RPC/RLS/원장(`MANUAL_ADJUST`)/동시성. 게임명은 아직 placeholder, PLANNED 지출의 결제/취소 진입점은 대시보드에 미연결.

## Phase 5 미니멀 캘린더 코어 완료 (2026-10-08)

- Phase 5 Iteration 02 리뷰 반영: 조회 범위를 42일 그리드 전체로 확장, 예상 지출에 CONFIRMED 포함(표시 월·CANCELLED 제외), date-only 문자열 로컬 파싱, 초기 날짜를 마운트 후 설정해 hydration 불일치 방지, EOF 공백 정리. tsc/Vitest(15 files/45 tests)/lint/build 통과, 실DB 검증은 미수행.
- `src/lib/calendar-utils.ts`에 6주 캘린더 그리드 생성과 월말 보정 `getAdjustedBillingDate`를 구현했다.
- `src/lib/subscription-sync.ts`에 월간 Lazy Generation을 추가했다. 활성 템플릿만 대상으로 `template_id + billing_cycle` 충돌을 무시해 중복 생성을 방지하며, 취소 회차 자동 복구는 수행하지 않는다.
- `src/components/calendar/`에 데스크톱 캘린더(금액 미표시, `VERSION/PICKUP` 배너, 게임 아이콘, 메모 도트), 우측 히어로 사이드바, 모바일 바텀 시트를 구현했다.
- `src/app/dashboard/page.tsx`를 캘린더 중심 레이아웃으로 교체하고 선택일 상세(지출/메모)와 예산/포인트 요약을 연동했다.
- 검증: `npx tsc --noEmit`, `npm run test -- --run` (15 files / 43 tests), `npm run lint`, dummy 공개 Supabase 값으로 `npm run build` 통과.
- 미검증: 실제 Supabase 데이터/동시성 환경에서 Lazy Generation 중복 방지 및 템플릿 비활성화/재활성화 정책 검증.

## Phase 3 Web/PWA 인증 및 계정 삭제 구현 (2026-10-08)

- 이메일 가입/로그인, Google OAuth/PKCE 세션 흐름 및 보호 화면의 세션 상태 처리를 보완하고 관련 컴포넌트/상태 테스트를 추가했다.
- 계정 삭제는 사용자 이메일 재확인 후 Netlify Functions 요청 경로에서 접수한다. Supabase queue/예약 worker는 private `user-icons` 객체와 개인 테이블을 정리하고, Resend idempotency key 안내 메일 뒤 Auth 사용자를 마지막에 삭제한다. pending 상태는 RLS/trigger에서 차단하며 클라이언트에는 삭제 진행 상태만 허용한다.
- Resend 멱등성 안전 기간(23시간)을 넘겨 발송 결과를 확정할 수 없으면 자동 중복 발송 대신 `MANUAL_REVIEW`에서 멈추고 접근 차단을 유지하도록 했다.
- 검증: `npx tsc --noEmit`, 전체 Vitest 12개 파일/40개 테스트, `npm run lint`, dummy 공개 Supabase 값으로 `npm run build` 및 `out/` 생성, `git diff --check` 통과. Supabase migration 실적용, 실제 OAuth 및 Storage/RLS, Netlify 예약 실행, Resend 전달과 배포 비밀 환경 변수는 아직 검증하지 않았다.
- dependency 설치 시 npm audit이 13개 취약점(2 moderate, 9 high, 2 critical)을 보고했다. 이번 작업에서 자동 수정하지 않았으며 영향 범위는 별도 검토가 필요하다.

## Phase 2.4 DB/RPC/RLS 테스트 시나리오 준비 (2026-10-08)

- `md/SCHEMA.sql`의 현재 테이블, 결제·환불/지갑/요청 RPC, 일정·구독 트리거 및 권한을 기준으로 `md/TESTS.sql`의 rollback-only 시나리오를 보강했다. synthetic 사용자 두 명의 Auth/JWT, 기본 finance/wallet fixture, 실행 순서와 성공/실패 기대 조건을 문서화했다.
- 사용자 RPC 호출은 `authenticated` 역할로 실행하며 결제·환불, 일정 동기화, 요청 승인/반려와 원자성, RLS 교차 사용자 격리·직접 쓰기 차단, anon 실행 권한을 다룬다. 오류를 유도한 예상 실패도 오류 메시지와 상태 불변을 확인한다.
- DB 연결 및 SQL 실행은 사용자의 범위 지시에 따라 수행하지 않았다. 정적 검토와 `git diff --check`만 수행했으며, 현재 확장 시나리오의 런타임 결과는 미검증이다. 전용 비운영 Supabase 테스트 프로젝트에서 후속 실행이 필요하다.

## Phase 1 Web/PWA 기반 완료 (2026-10-08)

- `collab/phase1-completion`에서 Progress/Drawer UI 컴포넌트와 의존성을 추가하고 Supabase 브라우저 client의 환경변수 누락을 명시적으로 오류 처리했다. 기존 Dialog/Select 및 PKCE/Tauri 인증 흐름은 유지했다.
- 검증: `npm run test -- --run` 7개 파일/24개 테스트 통과, `npm run lint` 통과, 더미 공개 Supabase 환경변수로 `npm run build` 및 정적 `out/` 생성 통과. 실제 Supabase 네트워크 인증/조회는 검증하지 않았다.
- Maker 구현 커밋은 생성했으며, 동일 Target SHA Reviewer 및 run test artifact 기록/검증은 Orchestrator 후속 단계다. run manifest는 수정하지 않았다.

## 다중 에이전트 파이프라인 보완 및 이식 검토 (2026-10-08)

- 사용자 초안(5단계)을 `md/SKILL.md`, `md/agent_rules.md` 기준으로 보완한 [ChronoLedger_multi_agent_pipeline_v2.md](archive/ChronoLedger_multi_agent_pipeline_v2.md)와 이식 검토 [ChronoLedger_pipeline_v2_porting_review.md](archive/ChronoLedger_pipeline_v2_porting_review.md)를 작성했다.
- Antigravity 시험을 위해 `.agents/rules/language.md`와 Maker/Reviewer/Orchestrator skill 정의를 추가하고 기존 `.github/agents/*.agent.md` 프로필은 `.bak`으로 보존한 채 제거했다. 실제 확장 프로그램에서 규칙·skill 인식 여부와 자동 위임은 검증 필요다. Antigravity/Codex/OpenCode 연동은 아직 검증하지 않았다.

## Phase 4 변경 통합 완료 (2026-10-08)

- `collab/phase4-request-submission`의 기반 커밋 `674f741` 및 요청 제출 UI Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`을 현재 `main` 작업 트리에 통합했다. 게임 카탈로그/아이콘 처리, 관리자 요청 화면, 게임·일정 제안 UI와 테스트를 포함한다.
- main에 이미 반영된 최신 로그인 UI, KST 월간 지출 조회, Gemini 리뷰 기록은 유지한다. 충돌 문서는 최신 main 버전을 기준으로 보존하고 통합 상태를 별도로 기록한다.
- 대시보드에서는 main의 KST 지출 조회를 유지하고, 누락된 자산 행을 0원으로 오인하지 않도록 요청 브랜치의 명시적 오류 처리를 채택했다.
- 충돌을 해결해 Phase 4 변경을 `main` 작업 트리에 통합했다. `npm ci`, Vitest 6개 파일/21개 테스트, lint, dummy Supabase 환경변수의 정적 build가 통과했다.
- Vitest 기본 검색이 저장소 안의 `.worktrees/` 테스트를 중복 실행해 React hook 오류를 냈다. `vitest.config.ts`에서 `configDefaults.exclude`를 보존하면서 `.worktrees/**`를 제외해 해결했다.
- 기존 lockfile은 Vitest 5의 `@types/node` peer 범위와 어긋나 `npm ci`가 실패했다. `@types/node`를 `^22`로 맞추고 lockfile을 재생성한 뒤 표준 `npm ci` 통과를 확인했다. npm audit은 13개 취약점(2 moderate, 9 high, 2 critical)을 보고했으며 이번 통합에서 자동 수정하지 않았다.
- 실제 Supabase RLS/RPC 동작 및 Docker/VM 격리 검증은 여전히 미실행이다.

## Gemini 수동 리뷰 완료 (2026-10-08)

- 사용자가 Gemini API 호출보다 참조 기준과 prompt를 Gemini에 직접 제공하는 방식을 선택했고, 같은 Target SHA의 수동 정적 리뷰 결과를 전달했다.
- Phase 4.4 변경(Base `674f741ee52d45bb96db3431521101a5aa01341f`, Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`)의 기준 요약과 검토 프롬프트를 [Gemini 수동 리뷰 패킷](archive/Gemini_phase4_manual_review.md)에 작성하고, 40,198-byte 전체 diff를 `artifacts/gemini-phase4-connection/phase4-request-submission.diff`에 생성했다.
- API 연결 run `gemini-phase4-connection`은 dry-run에서 Base/Target 및 12개 파일을 확인한 뒤 사용자의 수동 전달 선택에 따라 `abandoned` 처리했다. GEMINI_API_KEY 미설정, API 호출·네트워크 요청·외부 전송 모두 없음. 종료 기록은 해당 run의 `iteration-01/human-report.md`에 있다.
- Gemini는 `clean`/발견 없음으로 판정했다. 응답은 [`gemini-manual-review.md`](../artifacts/phase4-request-submission/iteration-01/gemini-manual-review.md)와 Schema 형식의 [`gemini-review.json`](../artifacts/phase4-request-submission/iteration-01/gemini-review.json)에 기존 ChronoLedger Reviewer 결과와 분리해 기록했다. 실제 Supabase RLS 및 관리자 RPC 원자성은 후속 검증으로 남아 있다.
- Gemini 전체 API 도입 결정은 별도 미결정이며, 이번 수동 리뷰에는 API 호출이나 전송이 없었다.

## 협업 run 검증 재개 (2026-10-07)

- 협업 파이프라인 및 운영 문서를 main의 `f163157`에 커밋했고, 대시보드·게임 UI 변경을 `collab/phase1-setup`의 `674f741`에 별도 커밋했다. 두 커밋 모두 로컬에만 있으며 push/merge하지 않았다.
- 기존 `phase1-setup` run은 원래 Target SHA(`dda0cae`)와 후속 Phase 4 변경의 범위가 달라 review/test 증거 없이 `abandoned` 처리했다. 종료 보고서는 `artifacts/phase1-setup/iteration-01/human-report.md`에 있다.
- `674f741`의 앱 전체 테스트 15개, lint, dummy Supabase 환경변수를 사용한 정적 build가 통과했다. 이는 `phase1-setup`의 옛 Target SHA에 대한 테스트 증거가 아니다.
- Phase 4.4 사용자 게임/일정 요청 UI run `phase4-request-submission`을 `collab/phase1-setup` Base SHA `674f741`에서 실행하고 Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`에 고정했다. Maker가 요청 등록·일정 추가/수정 UI와 검증 테스트를 추가해 커밋했다.
- 동일 Base/Target SHA의 ChronoLedger Reviewer 결과는 `clean`/0 findings다. Vitest 6개 파일·21개 테스트, ESLint, dummy Supabase 환경변수를 사용한 static build가 통과했고 run/review/test JSON Schema 검증도 통과했다.
- run 결과는 `artifacts/phase4-request-submission/`에 보존했다. 격리 Docker/VM은 없어 sandbox 상태는 unavailable이며 실제 Supabase/RLS/RPC 통합 검증은 미실행이다. `npm ci`가 기존 package/lock 충돌로 실패해 lockfile을 수정하지 않고 `npm install --no-package-lock --legacy-peer-deps`로 로컬 검증 의존성을 준비했다.
- VS Code에서 전체 Local harness 위임 및 실제 Supabase 연결은 아직 검증하지 않았다. Tauri는 Web/PWA MVP 이후로 미룬다. 새 Phase 4.4 run의 커밋도 로컬 전용이며 push/merge하지 않았다.

## 최소 개입 협업 Orchestrator 준비 (2026-10-07)

- VS Code Local harness에서 Maker/Reviewer를 위임하는 `ChronoLedger Orchestrator` 프로필과 초보자용 [협업 가이드](collaboration-guide.md)를 추가했다.
- `New-CollaborationRun.ps1` 실행, manifest/Target SHA 관리, 리뷰·테스트 Schema 검증, 제한 반복, 사용자 개입 조건을 Orchestrator 지침에 명시했다. Gemini 외부 전송과 최종 통합은 사용자 승인 사항으로 유지한다.
- 협업 JSON Schema 검증 CLI와 오프라인 테스트를 추가했다. PowerShell 5의 UTF-8 BOM run manifest를 Gemini Reviewer가 읽도록 JSON 로더 호환성을 보완했다.
- VS Code Agent 발견, Local subagent 호출, clean run 생성 및 전체 협업 통합은 아직 실제 환경에서 확인하지 않았다.

## Gemini Reviewer 자동화 제안서 검토 (2026-10-07)

- `ChronoLedger_pipeline_auto.md`에 대한 Gemini 전달용 검토 문서 `ChronoLedger_pipeline_auto_review.md`를 작성했다. 검토 요점은 SHA/diff 고정, 외부 API 데이터 전송 승인 및 민감정보 경계, 자동화 범위, 응답 스키마·실패 처리, 효과 수치 근거 및 승인 상태다.
- `scripts/collaboration/run_gemini_reviewer.py`에 단일 run/SHA 정적 리뷰 초안 PoC를 구현했다. 전체 diff 확인 및 인터랙티브 승인, JSON Schema 검증, 원자적 no-overwrite 저장과 실패 시 명시적 종료를 적용했다.
- 네트워크 없는 회귀 테스트 12개가 통과했고 Python 진단 및 CLI 도움말을 확인했다. dry-run 제어 문자 escape와 전송 승인·거부 경로를 테스트한다.
- PoC 구현은 API 연결 검증이나 도입 승인이 아니다. 실제 Gemini 호출·외부 전송 승인·품질/비용 평가는 수행하지 않았고, 사용자의 별도 도입 결정이 남아 있다.

## 문서 역할 정리 (2026-10-07)

- `docs/to-do.md`를 현재 구현 우선순위·완료 상태의 단일 기준으로 명시하고, `docs/to-do_Gemini.md`는 Gemini 작성 진행 기록의 보존본으로 구분했다. 과거 체크/완료 주장은 구현 및 검증 증거와 대조 전까지 미검증 기록으로 취급한다.

## 커스텀 아이콘 및 카탈로그 요청 시스템 초기 구현 (2026-10-07)

- 이미지 변환, 비공개 `user-icons` Storage 유틸리티, 카탈로그 선택 모달 및 관리자 요청 페이지의 초기 구현이 `.worktrees/phase1-setup` worktree에 있다. 변경은 별도 브랜치에 미커밋 상태이며 아직 기본 브랜치에 통합되지 않았다.
- 검토 중 관리자 요청 UI의 DB 필드/RPC 인자 불일치를 발견해 worktree에서 수정했다. 관리자 화면에 `app_metadata.role=admin` gate와 게임 기본 아이콘 URL 입력을 추가하고 RPC 오류 시 직접 테이블을 갱신하던 fallback을 제거했다.
- 앱 테스트 15개, ESLint 및 dummy Supabase 환경변수로 실행한 정적 빌드가 통과했다. 실제 Supabase/RLS/Storage 동작은 검증하지 않았다.
- Phase 4.4 요청 제출 모달이 아직 없고, DB 연동도 검증되지 않았다. Phase 4를 완료로 처리하지 않는다. 다음 단계는 변경 커밋 후 동일 Target SHA의 전체 run 검증이다.

## 대시보드 KST 월간 지출 조회 (2026-10-07)

- Gemini 분업은 구현과 분리해 커밋 후 동일 Target SHA의 읽기 전용 리뷰로 표시했다. 저장소 자동 연동이 없어 아직 요청하지 않았다.
- 예정 지출을 KST의 현재 달 기준 `[월 시작일, 다음 달 시작일)`로 조회한다. 일정 종료일이 있으면 `end_date`, 없으면 `target_date`를 월 귀속 날짜로 사용해 예산 규칙과 맞췄다.
- 자산 행 누락은 데이터 오류로 알리고 임의로 0원 처리하지 않는다. 실제 저장된 0원과 정상 조회 결과가 없는 달의 0원은 계속 정상값으로 표시하며 조회 실패는 오류 문구로 분리했다.
- KST 자정/월말 및 연말 경계, 정상 합계·빈 결과·자산 행 누락·지출 조회 실패를 포함한 두 Vitest 파일의 7개 테스트가 통과했다. 앱 lint, type check, 정적 build도 통과했다. Vite configLoader 호환성 경고가 있었으며 Supabase 원격 쿼리는 실행하지 않았다.

## 로그인 UI 적용 (2026-10-07)

- 기존 앱과 일관되도록 `/auth`를 다크 테마로 정리했다. 이메일·비밀번호 라벨, 세로형 이메일 로그인/가입, 구분선과 Google 로그인 흐름을 유지하면서 화면 구성을 개선했다.
- 320/390/768/1280px에서 가로 넘침이 없고 입력 영역이 44px 이상임을 브라우저에서 확인했다. 키보드 탭 순서는 이메일/비밀번호/로그인/가입/Google로 이어진다. callback 회귀 테스트 5개와 `npx tsc --noEmit`이 통과했다.
- 앱 worktree의 ESLint 설정에 `root: true`를 추가해 부모 저장소 설정을 잘못 이어받던 문제를 해결했다. `npm run lint`, `npm run build`, `npx tsc --noEmit`, callback 테스트 5개가 모두 통과했다.
- 접근성 트리에서 로그인 H1/H2 구조, 이메일/비밀번호 이름 및 버튼 이름을 확인했다. 키보드 초점이 모든 로그인 컨트롤에서 보이고 입력은 44px, 주요 버튼은 48px이다.
- 대비 계산 결과 주요 로그인 텍스트는 6.13:1 이상, dashboard에서 확인한 텍스트 조합은 5.31:1 이상이며 로그인 초점 표시 대비는 5.21:1이다. 확인한 조합은 WCAG AA 텍스트 및 비텍스트 대비 기준을 충족한다.
- 카드 제목을 H2로 수정하고 대시보드 로딩 상태·조회 오류를 보조기술에 전달하도록 보완했다. 보호된 dashboard는 코드/정적 검사로 확인했으며 실제 NVDA/VoiceOver 실행과 인증된 런타임 검증은 남아 있다. 실제 인증은 이번 UI 검증에서 실행하지 않았다.
- 앱 전체 테마 전환은 로그인과 보호 화면을 함께 바꿀 때 후속 적용한다. 실제 인증은 이번 UI 검증 범위에 포함하지 않았다.

## UI 디자인 시안 및 시각 토큰 결정 (2026-10-07)

- 대시보드·지출·통계의 별도 반응형 시안 [design-preview-ko.html](design-previews/design-preview-ko.html)을 만들었다. 기존 [design-v1-ko.html](design-previews/design-v1-ko.html)은 참고용으로 보존했다.
- 사용자 결정: 대시보드 미니 그래프 제외, 데스크톱 지출 표/모바일 날짜별 카드, 캘린더 아이콘 전체 표시, 통계 월별 세로 막대와 분류별 가로 막대. 기존 결정인 상단 데스크톱 내비게이션, 반응형 폭, 간격/컨트롤 기준도 시안에 반영했다.
- 브라우저에서 대시보드·지출·통계 탭을 확인했고, 390/900/1280px에서 가로 넘침이 없으며 모바일 카드/하단 내비게이션과 중간 폭·모바일 바텀시트가 표시되는 것을 확인했다. 테마 전환 및 새로고침 후 저장도 확인했다.
- 추가 사용자 결정: 본문 15px/보조 12px/섹션 17px/페이지 제목 22px/주요 숫자 20–28px. 라이트는 쿨 뉴트럴 바탕·흰 표면·남색 글자·인디고 액션, 다크는 기존 팔레트 유지.
- A2Z 제작자 안내에서 SIL OFL 1.1을, 눈누 사용 FAQ에서 상업적 사용·수정·재배포 허용을 확인했다. 원본 WOFF2 글꼴의 내장 저작권 표기(`Copyright © 2026 PT&`)를 사용해 OFL 전문을 폰트와 함께 제공하고, 9개 굵기를 시안과 웹 앱에서 자체 호스팅한다. 제작자 배포 ZIP에 라이선스 파일이 없어 프로젝트에 OFL을 동봉했다. 폰트 자체 단독 판매는 금지된다.
- 라이선스 출처: [A2Z 제작자 안내](https://freesentation.blog/a2z), [눈누 사용 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1 본문](https://openfontlicense.org/documents/OFL.txt).
- 추가 사용자 결정: 카드는 은은한 그림자, 모달은 강조된 그림자. 빈 상태는 간결한 상황 설명과 관련 행동 버튼을 두고, 보조 피드백은 중립적이고 다음 행동을 안내한다.
- 라이트 팔레트의 본문/보조 텍스트, 주요 액션 라벨, 상태 라벨 대비를 계산해 WCAG AA 텍스트 기준(4.5:1 이상)을 충족하도록 시안 토큰을 조정했다. 다크 상태 라벨과 두 테마의 기본 컨트롤 외곽선도 확인했다. 세부 ratio와 값은 [UI Design Sheet](spec/ChronoLedger_UI_Design_Sheet.md)에 기록했다.
- 수정 시안을 브라우저에서 다크/라이트 각각 390/900/1280px로 확인했다. 페이지 가로 넘침이 없고 390px에서는 고정 상세 바텀시트, 900px에서는 중간 폭 상세 패널, 1280px에서는 우측 패널이 표시된다. 페이지 제목 22px, 주요 숫자 20–24px 적용을 확인했다.
- 시안은 제품 UI 구현이 아니다. 제품 구현 시 키보드/스크린리더 검증 및 컴포넌트별 대비 검증이 남아 있다.
- 브라우저에서 정적 시안과 웹 앱의 로컬 폰트를 확인해 A2Z 100–900의 9개 굵기가 모두 로드되는 것을 확인했다. 앱 정적 export에도 9개 파일과 CSS 참조가 포함된다. ESLint 설정 오류는 앱 worktree 설정의 `root: true`로 해결했다.
- 다음 작업: 제품 UI 구현 시 키보드/스크린리더 및 개별 상태·컨트롤 대비를 검증한다.

## 웹 우선순위 및 Netlify 재검토 (2026-10-07)

- Netlify 검증: 앱 브랜치에서 `npm run build`(lint/type 포함)가 성공해 `/`, `/auth`, `/auth/callback`, `/dashboard` 정적 HTML/자산을 만들었고 OAuth callback 단위 테스트 5개도 통과했다. Draft URL에서 로그인 화면과 `/auth` 직접 경로, callback 안내가 열리고 비로그인 `/dashboard` 직접 접근은 `/auth`로 이동함을 사용자가 확인했다. 익명 HTTP 요청은 Netlify Edge Access로 401이다. OAuth 실인증/Redirect URL, GitHub 자동 Preview, Preview 환경변수 분리는 아직 미검증이며 앱에 PWA manifest/service worker도 없다.
- Netlify Git import 마법사가 `main` 첫 Production 배포를 시작하므로 이를 취소하고, 공식 CLI Draft Deploy(`--dir out --no-build`, `--prod` 없이)를 생성했다. Draft는 GitHub continuous deployment에 연결하지 않았다. OAuth callback은 Netlify 도메인 허용목록 갱신 전 실제 인증하지 않는다.
- 2026-10-07 세션 종료 상태: 사용자가 오늘 작업을 중단했다. 로컬 Supabase 환경 파일은 URL + Legacy `anon` 두 항목이며 HTTPS Supabase 주소/anon 역할/project ref가 서로 일치하고, 사용자가 대시보드의 URL과 Legacy anon 키 값도 정확히 대조했다. 실제 OAuth 허용 Redirect URL 추가와 로그인 왕복은 다음 작업으로 남긴다. Draft는 이미 생성됐지만 Netlify site-level env/ Git 연결은 설정하지 않았다.
- 앱 코드와 최신 문서를 `main`에 통합해 `origin/main`으로 push했다 (현재 원격 `f902021`). 폴더 점검에서 추적된 94개 파일에 `.env`, 의존성/빌드 산출물, worktree 및 일반적인 비밀값 패턴은 없었다. `.worktrees/`, `.netlify/`, 로컬 환경 파일은 ignore 처리된다. 당시의 별도 `phase1-setup` run manifest는 `target_sha: null`, `in_progress` 상태였으며 이번 `phase1-completion` run과 구분한다.
- 2026-10-07 현재 상태: 사용자는 웹사이트 기능 개발을 우선하고 Android PWA 실기기 인증 검증은 보류했다(제품 범위는 유지). Netlify는 유력 후보이나 아직 미채택이다. 기존 정적 export를 Deploy Preview에서 먼저 검증하며, 필요 증거 전에는 일반 Next.js 런타임/이중 빌드를 도입하지 않는다. 이전 날짜가 붙은 세부 결정은 아래 이력 항목을 참조한다.
- 2026-10-07: 사용자는 Android PWA 실기기 검증을 보류하고 웹사이트 개발을 우선하기로 했다. Netlify를 후보로 고려하되, 기존 제안서 재검토는 `현재 정적 export를 Netlify에서 검증하는 최소 경로`를 먼저 권고한다. 플랫폼 및 이중 빌드 최종 채택은 Deploy Preview 확인 전까지 미정이다.
- 사용자는 ChronoLedger를 과제 제출물이 아닌 개인 프로젝트로 진행하기로 결정했다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않고 기존 승인된 Supabase PostgreSQL/Next.js 정적 export 및 회원·관리자 요구사항을 유지한다. Netlify나 상시 Node.js 서버 채택 결정은 아니다.
- 사용자의 요청에 따라 [상세 설계](detailed-design.md)를 추가했다. 승인 SRS/SPEC/SCHEMA를 런타임 경계, 데이터 책임, Supabase/RPC 계약, 핵심 사용자 흐름, 보안·오류 정책 및 요구사항별 검증 계획으로 연결했다.
- 사용자는 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성을 미결정으로 유지하도록 요청했다. 기존 결정인 Android PWA와 Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export, Web/PWA 우선 순서는 그대로 유지한다. Netlify 및 Web/Desktop 빌드 분리는 별도 미결정이다.
- 사용자는 월 예산 합계 및 경고를 공유 클라이언트 도메인 함수에서 계산하고 온라인 RLS 조회와 허용된 오프라인 캐시에 동일 규칙을 적용하기로 결정했다. 오프라인 데이터는 계정별 IndexedDB에 저장하고 고정 TTL 없이 다음 성공 동기화/로그아웃/세션 만료까지 유지하며 마지막 동기화 시각을 표시한다. 네트워크 복귀 때 관련 화면 데이터를 즉시 재조회하고 성공 전까지 캐시를 유지한다. 계정 삭제는 대기 상태를 보존하고 서버가 Storage 정리를 재시도하는 방식으로 결정했다. 대기 중에는 세션을 유지하지만 일반 기능/데이터를 차단하고 상태 화면만 허용한다. 실패 시 재시도 간격을 늘려 완료까지 자동 재시도한다. 데이터 정리 뒤 Auth 삭제 전에 주소 사본 없이 “정리 완료, 계정 삭제 마무리 중” 메일을 보내며, Auth 삭제 실패 시 상태 화면에서 알리고 삭제만 재시도한다. 게임 구독 해제도 아이콘 정리를 서버가 재시도하고 완료 후 구독 행을 제거하며, 처리 중에는 목록에 표시하고 중복 요청을 막는다. worker/메일 전달 구조는 추가 설계 대상이다. 성능 측정 기준 기기는 중급 Android 실기기로 선택됐다. Netlify 제안은 보류하고 현재 Web/PWA 기준으로 MVP를 진행하기로 했다. Netlify 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다. UI/접근성 값과 성능 측정 세부조건·목표도 남은 설계 항목이다.
- 사용자가 추가한 UI 디자인 시트, `design-v1-ko.html`, Netlify 제안서를 승인 SRS와 기존 Web/PWA 우선순위에 대조했다. UI 시트의 달력 제한(VERSION/PICKUP, 금액 없음, 메모 표시 1개), 지출 상태/예산/모바일 상세 설계는 승인 요구와 부합한다. 색상/레이아웃 등 `[PROPOSED]` 값은 시각 제안으로 구분했다. HTML은 단일 화면의 정적 목업이며 인터랙션 또는 반응형 동작을 증명하지 않는다.
- Netlify 문서 자체가 `Decision Proposal`이다. 플랫폼과 Web/Desktop 빌드 전략을 확정하지 않고 `docs/to-do.md`에 사용자 결정 및 승인 후 호환성 검증 과제를 남겼다.
- 협업 AI 우선 요구에 따라 `.github/copilot-instructions.md`와 `.github/agents/chronoledger-{maker,reviewer}.agent.md`를 추가했다. 기존 파일 기반 run/SHA/JSON 규약과 연결했고, Reviewer 역할 문구만으로 읽기 전용 실행 권한을 보장하지 않는다는 점을 명시했다.
- Copilot 역할과 사용 절차를 `docs/ai-collaboration-usage.md`, `md/multi_agent_collaboration_architecture.md`, `artifacts/README.md`에 반영했다. VS Code의 실사용 프로필 인식/도구 제한/아티팩트 저장은 아직 사용자의 VS Code 환경에서 확인하지 않았다. AI 간 자동 호출도 구성하지 않았다.
- `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`를 갱신했다. 문서 정합성만 검토했으며 앱 테스트/빌드/배포 및 실제 Copilot 세션 실행은 수행하지 않았다.
- 브라우저 OAuth callback 구현과 실제 로컬 Google 인증, `/auth` 로그인 통합 및 dashboard layout 인증 gate를 검증했다. Android PWA 실기기 검증과 Tauri 딥링크는 각각 후속 Web/PWA·데스크톱 단계로 남아 있다.
- 당시 `phase1-setup` 협업 run은 `target_sha: null`, `in_progress`였으며 동일-SHA review/test 산출물이 없어 미종료 상태다. 이는 별도의 `phase1-completion` run이다.
- 기존 Netlify 제안서의 A안(일반 Next.js 웹 런타임 + Tauri 정적 빌드)은 현 요구에 비해 복잡도가 커 즉시 채택할 근거가 부족하다. 배포 preview에서 정적 export, auth callback, 하위 경로, PWA service worker 및 환경변수 분리를 확인한 뒤 필요 시에만 서버 런타임/이중 빌드를 재논의한다.
- 사용자는 Supabase Google provider 활성화와 `http://localhost:3000/auth/callback` 등록을 확인했다. 실제 브라우저 Google OAuth가 PKCE code를 교환하고 세션을 저장해 `/dashboard`로 이동하는 것을 검증했다. callback 테스트는 Strict Mode 재실행 케이스를 포함해 5개로 늘렸다.
- 검증 중 발견한 중복 URL code 교환 및 React Strict Mode cleanup 문제를 수정했다. 단일 Supabase client에서 브라우저는 PKCE, Tauri는 기존 implicit flow를 사용하며 URL 자동 세션 감지는 비활성화했다.
- `/`의 중복 로그인 폼을 `/auth` 이동 페이지로 바꾸고 dashboard layout에 인증 gate를 적용했다. 로그인 상태의 root 이동 및 로그아웃 후 직접 dashboard 접근 차단을 브라우저에서 확인했다. Android PWA 실기기 인증은 미검증이다.
- 변경 파일의 callback 단위 테스트 5개, ESLint 및 `npx tsc --noEmit`은 통과했다. `npm run build`는 컴파일 후 기존 `src/app/layout.tsx`의 `@ts-ignore`와 `src/lib/tauri-auth.ts`의 `any` lint 오류로 중단됐다. Phase 1 run은 여전히 `target_sha: null`, `in_progress`다.

## 현재 상태

- 프로젝트는 SRS 사용자 검토·승인과 SQL rollback-only 스모크 테스트를 마쳐 설계 단계 진입이 승인됐다.
- 사용자의 결정과 SRS 전체 검토 내용을 문서와 SQL 초안에 반영했다. 사용자가 테스트 프로젝트에서 `md/TESTS.sql`을 `ON_ERROR_STOP=1`로 실행했고, 최종 PASS 메시지로 전체 테스트 완료 및 rollback을 확인했다.
- Codex가 직접 실행한 것은 아니며, 사용자가 전달한 최종 PASS 출력으로 테스트가 오류 없이 완료되고 변경이 롤백됐음을 확인했다. 이 smoke suite는 핵심 동작의 일부만 다루므로 전체 SRS 수용 기준의 상세 테스트는 설계/테스트 계획에서 추적한다.
- 2026-10-03 읽기 전용 조회에서 의도한 프로젝트 ref와 일치함을 확인했다. `SCHEMA.sql`의 12개 테이블 이름 및 `expenses`의 24개 컬럼이 이미 있어 기존 스키마 배포 가능성이 높다. RLS·정책·RPC·트리거 및 인코딩 메타데이터 비교 전까지 DDL을 재실행하지 않는다.
- 2026-10-03 후속 확인에서 CHECK 값, 가입 트리거, Storage 정책 및 주요 RPC 권한을 대조했다. 사용자가 테스트 프로젝트임을 재확인하고 허용해 `user-icons` Storage 버킷을 생성했다 (private, 100 KB/102,400 bytes, image/webp). Dashboard 설정을 시각적으로 확인했다.
- `md/TESTS.sql`은 단일 트랜잭션에서 가입 초기화·결제/환불·포인트·취소/복구·구독/일정 트리거·참조 무결성·RLS를 점검하고 전체를 ROLLBACK했다.
- 사용자가 `md/TESTS.sql`의 최종 PASS 및 전체 rollback 완료 메시지를 확인했다.
- 멀티 에이전트 협업의 초보자용 사용 안내를 `docs/ai-collaboration-usage.md`에 추가했다. AI 간 자동 연동은 여전히 미설정이며 역할 간 파일 전달은 수동이다.
- 다음 단계는 승인된 SRS를 바탕으로 설계 산출물을 작성하는 것이다. 설계 단계에서 요구사항별 상세 테스트 케이스와 측정 환경에 따른 성능 목표를 정한다.

## SQL 검증 및 설계 진입 판정 (2026-10-03)

- 사용자가 테스트 프로젝트에서 rollback-only 스모크 스크립트를 `ON_ERROR_STOP=1`로 실행하고 최종 PASS/rollback 메시지를 확인했다.
- Phase 0.6을 완료하고 설계 단계 진입을 승인했다. 상세 SRS 검증 케이스와 성능 목표는 설계 단계에서 구체화한다.

## 다음 작업

1. 승인된 SRS를 바탕으로 시스템 구조, 데이터 흐름, 컴포넌트/API 및 보안 설계를 시작한다.
2. 수용 기준별 상세 검증 케이스와 전체 DB/RPC/RLS 검증 계획을 설계 산출물에 추적한다.
3. 지원 기기·네트워크·데이터 규모를 정해 성능 측정 목표를 확정한다.

## 멀티 에이전트 협업 아키텍처 검토

- 요청에 따라 `md/multi_agent_collaboration_architecture.md`를 읽고 역할 분담, 병목, 반복 제한, 파일 기반 통신을 검토했다.
- 결론과 권장 워크플로우, JSON 결과 메타데이터, 종료 기준, 적용 범위를 `md/multi_agent_collaboration_architecture_review.md`에 기록했다.
- 문서 목록 반영을 위해 `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`를 갱신했다.
- 상대 링크를 정적으로 확인했다. 협업 파이프라인 및 특정 에이전트 제품 동작은 실행 검증하지 않았다.
- 검토 의견은 제안이며 파이프라인은 아직 채택·구현되지 않았다.

## 최종 협업 설계안 재검토

- Maker/Reviewer/Orchestrator 역할, Target/Base SHA, 원자적 결과 파일, 샌드박스, 반복 제한, 사용자용 종료 리포트가 초안의 주요 공백을 보완했음을 확인했다.
- 공유 작업 트리의 자동 `git reset --hard`가 미커밋 사용자 작업을 잃게 할 수 있어 도입 차단 위험으로 지적했다. 전용 worktree 격리와 실패 상태 보존을 권고했다.
- 테스트 성공 조건, 컨테이너 권한/네트워크, AST 의존성 추출의 누락 가능성, 제품별 파일 접근성도 추가 확인 항목으로 기록했다.
- 검토 문서의 8절을 갱신하고 `docs/handoff.md`, `docs/to-do.md`, `docs/known-pitfalls.md`에 최신 검토 결과를 반영했다.
- 문서 정적 검토만 수행했으며 Git 롤백, Docker 격리, 실제 에이전트 간 연동은 실행하지 않았다.

## 협업 작업 환경 준비

- 요청 목표: 최종 협업 설계와 안전성 검토를 바탕으로 재사용 가능한 로컬 작업 환경을 준비한다.
- `artifacts/` 아래 run 결과 규약, run/review/test JSON Schema, 예시, 사용자 종료 보고서 템플릿을 추가했다. 원시 로그·환경 변수 파일은 해당 폴더의 `.gitignore`로 제외한다.
- `scripts/collaboration/New-CollaborationRun.ps1`을 추가했다. 깨끗한 Git 상태와 고유 run ID를 요구하고 전용 `.worktrees/<run_id>` 브랜치/worktree 및 원자적으로 기록한 run manifest를 만든다. 자동 stash, reset, 삭제는 하지 않는다.
- JSON 문법, PowerShell 구문 및 상대 Markdown 링크를 정적으로 확인했고 통과했다. 스크립트 동작 테스트는 실행하지 않았다.
- `md/multi_agent_collaboration_architecture.md`의 롤백 규칙을 공유 작업 트리 자동 reset에서 실패 worktree/브랜치 보존으로 수정했다.
- 저장소에는 현재 미커밋 문서 변경이 많아 새 worktree를 만들지 않았다. 스크립트는 이를 감지해 중단하도록 설계했다. Docker 실행 파일도 찾지 못해 컨테이너 테스트는 실행할 수 없다.
- 외부 Gemini 에이전트와의 자동 호출은 구성하지 않았으며, 파일 규약에 따른 수동 전달만 준비됐다.
- 다음 단계: 변경 내용을 보존한 채 깨끗한 커밋 상태를 만든 후 스크립트를 실행 검증하고, Docker 샌드박스 및 Gemini의 동일 아티팩트 접근을 별도로 연결한다.

## AI 협업 사용 안내 작성 (2026-10-02)

- 사용자가 요청한 초보자용 역할 설명과 실행 절차를 `docs/ai-collaboration-usage.md`에 작성했다.
- run 생성 전 저장소 상태 확인, 전용 worktree 생성, Maker 커밋 후 Target SHA 기록, Reviewer/Orchestrator의 동일 SHA 검토, 반복 및 안전 규칙을 설명했다.
- 기존 제약(Docker 미확인, Gemini 자동 연동 미구성, 실제 worktree 생성 미검증)을 문서에 명시했다.
- `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`의 문서 목록/상태를 갱신했다.
- 문서 링크 및 내용은 정적으로 확인할 예정이다. 스크립트 실행, worktree 생성, 동적 테스트는 수행하지 않는다.

## 오래된 기획 검토 문서 정리 (2026-10-02)

- 사용 요청에 따라 현재 문서 참조와 상태를 조사하고, 현재 기준에 더 이상 쓰이지 않는 `md/fix-proposals.md`와 `md/revisions_and_decisions_review.md`를 삭제했다. 두 파일은 오래된 Gemini.sql/Downloads 기준 검토 기록이며 최신 기획/요구사항 기준은 SRS와 통합 기획 문서다.
- `md/srs-readiness-review.md`, `md/resolved-blockers-review.md`, `md/planning-blockers.md`는 현재 인수인계/체크리스트에서 참조하거나 결정 이력으로 보존할 가치가 있어 유지했다.
- 삭제 후 Markdown 문서에서 두 파일을 가리키는 링크가 남지 않았는지 확인할 예정이다.

## Gemini 진행 문서와 작업 트리 대조 (2026-10-02)

- 사용자가 추가한 `docs/to-do_Gemini.md`를 기존 구현 체크리스트 및 `.worktrees/phase1-setup`과 대조했다.
- Next.js/Tailwind/Supabase/Vitest/Tauri 및 로그인·대시보드 초안 파일은 있으나, Gemini 문서의 Phase 1 완료를 입증할 동일 SHA 테스트/리뷰 결과는 없다. shadcn/ui는 확인되지 않았고 계획의 Tauri v2와 구현된 Tauri 3 alpha가 충돌한다.
- Phase 2의 Supabase 배포/초기화 트리거 검증은 외부 상태라 저장소 자료만으로 확인할 수 없다. 기존 SRS 승인/SQL 검증 게이트와 충돌 가능성이 있어 `docs/to-do.md`에 사용자 확인 및 테스트 프로젝트 검증을 우선 과제로 추가했다.
- `phase1-setup` run은 `target_sha`가 비어 있고 `in_progress`; 격리 worktree 변경은 미커밋이다. 이를 병합·초기화하지 않았으며 비밀값 파일은 열지 않았다.
- 패키지/설정/화면 코드를 정적으로 살폈다. 빌드, 테스트, Tauri 실행 또는 원격 DB 연결은 수행하지 않았다.

## Gemini 진행 내용 후속 검토 (2026-10-03)

- 사용자가 갱신한 `docs/to-do_Gemini.md`를 `.worktrees/phase1-setup`의 코드와 설정에 대조했다. Tauri v2 의존성과 제품 식별자, shadcn UI, 인증 화면이 추가되어 10-02의 v3 alpha/shadcn 미구현 판단은 해소됐다.
- 인증 결함을 확인했다. `/auth/callback`는 로그인 폼을 렌더링하고 Tauri 처리기는 token fragment만 읽어 PKCE `code`를 교환하지 않는다. 앱 cold-start URL 확인 및 Windows 실행 중 single-instance 전달도 없다. `/`와 `/auth`의 OAuth 동작이 서로 다르다.
- 버튼 무반응은 source에 handler가 연결된 것만 확인했으며, 근본 원인은 웹뷰 로그 없이 판단할 수 없어 미확정으로 기록했다. Gemini의 권한/Hydration 설명은 가설이다.
- Phase 1 커밋 `ccfbca5`가 존재하지만 이후 Tauri/Auth 수정이 미커밋이다. `phase1-setup` manifest는 target SHA가 null이고 reviewer/test JSON이 없어 협업 run은 미종료다. Gemini가 보고한 Tauri 실행 성공은 재실행하지 않았다.
- 사용자가 최신 `docs/to-do.md`에 기록한 SRS 승인과 테스트 프로젝트 SQL smoke PASS를 현 기준으로 유지했다. 이 결과는 DB 검증이며 프론트엔드/Tauri 인증 검증과 구분했다.
- 구현 결함과 다음 과제를 `docs/to-do.md`에 기록했다. 정적 코드 검토와 공식 Supabase/Tauri 문서 대조만 수행했고 앱 빌드/테스트/원격 접속은 하지 않았다.

## Web/PWA 우선 개발 순서 (2026-10-05)

- 사용자 요청에 따라 브라우저 Web과 Android PWA 핵심 기능을 먼저 완성하고, Windows Tauri OAuth 딥링크 및 패키징은 Web/PWA MVP 이후로 미뤘다.
- SRS의 Windows Tauri 지원은 유지하며, 공통 프론트엔드와 인증 경계를 유지하는 순서를 `docs/to-do.md`에 반영했다.
- Web/PWA MVP 조건, 웹 우선 인증·기능 통합 순서, 후속 Windows Tauri 단계로 체크리스트를 재배치했다.
- 관련 인수인계/변경 이력을 갱신했다. 코드와 앱 동작 검증은 수행하지 않았다.

## SRS §4.8 검토 완료 (2026-10-02)

- 체크포인트의 실제 재개 지점인 SRS §4.8(아이콘 및 메모)을 기준 문서와 대조했다.
- 사용자는 내 게임 목록에서 게임을 제거할 때 해당 게임의 사용자 커스텀 아이콘 Storage 객체도 삭제하기로 결정했다. 이를 SRS, SPEC 및 구현 체크리스트에 반영했다.
- 사용자는 같은 날짜에 개인 메모를 여러 개 허용하고 캘린더 타일에는 도트 하나만 표시하기로 결정했다. 상세 영역에는 해당 날짜의 메모 전체를 표시하도록 SRS와 SPEC을 정합화했다. 현재 SQL 초안은 날짜당 유일성 제약이 없어 다중 메모를 허용한다.
- 사용자는 지원 플랫폼을 Windows Tauri 데스크톱과 Android PWA로 한정하고, 응답시간 목표는 설계 단계에서 측정 환경과 함께 정하기로 했다. 이를 SRS/SPEC에 반영했다.
- §4.8은 완료했다. 이후 §5~§10 검토도 마쳤고 사용자가 SRS 요구사항을 승인했다. DB 실행 검증은 환경 부재로 남아 있어 설계 단계 진입은 보류 상태다.

## SRS 전체 검토 및 승인 (2026-10-02)

- SRS §5~§10을 기준 문서 및 현재 구현 체크리스트와 대조했다. 상태 전이 표의 템플릿 비활성화 문구, 구현 현황 설명, 추적성 및 원자성 수용 기준을 보정했다.
- Windows용 Tauri v2 데스크톱 실행 파일과 Android PWA만 지원하고 iOS PWA는 제외하기로 결정했다. 성능 수치 목표는 설계 단계에서 측정 환경과 함께 정하기로 했다.
- 사용자가 검토 반영된 SRS 요구사항을 승인했다. [SRS](spec/SRS.md) 상태와 체크포인트에 승인 사실을 기록했다.
- (당시 체크포인트 기록, 2026-10-03 스모크 실행 전) SQL 검증은 미수행 상태였고 `public.expenses` 존재 때문에 DDL 적용을 보류했다. 이후 사용자가 rollback-only 스모크 검증을 완료해 최신 상태는 위의 설계 진입 승인으로 갱신됐다.
