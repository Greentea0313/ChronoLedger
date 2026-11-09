# 변경 이력
## 2026-11-09 (Phase 13.4 DB 및 R41 게스트 일정 RLS)

- `games.max_breakthrough`, `user_characters.is_favorite`·`breakthrough_level`과 게임별 돌파 상한 트리거를 추가함. 기존 돌파 값은 상한 축소만으로 낮추지 않으며 사용자 증가/게임 변경은 상한 검증함.
- 게스트 조회를 위해 anon에 승인 게임 및 공식 일정 SELECT 권한을 부여하고, 일정 RLS는 공식 일정만 허용함.
- 신규 설치 SCHEMA, 재실행 migration, SQL 회귀 테스트, DB 타입과 SRS/SPEC/README를 동기화함.
- 검증: tsc·lint·Vitest 48파일/385개, PostgreSQL 17 신규 스키마·migration 2회·전체 TESTS.sql 통과함. 커밋 `ba49f135582d44fa4c9458fc45a76752baf07fd9`임.

## 2026-11-09 (신규 협업 Run r13-4-breakthrough-guest-and-schedule-tree 등록 — R41~R44)

- **R13 명세 §8 개정 및 신규 로드맵(R41~R44) 등록 (Gemini 4 Argon)**:
  - `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §8에 캐릭터 메모 UI 제거, 컴팩트 아이콘 타일 그리드, 즐겨찾기(`is_favorite`) 금색 테두리 및 최상단 정렬, 게임별 최대 돌파(`games.max_breakthrough`) 및 아이콘 좌하단 `n★` 배지·클릭 설정 모달 명세를 추가함.
  - 비로그인 게스트 모드 공식 일정 열람(`R41`), 게임별 일정 모달 `ON AIR` 상단 고정 + 버전(`VERSION`) 아코디언 하위 트리(`R42`), 캐릭터 돌파·즐겨찾기·타일 개편(`R43`), 전체 카드·타이포그래피 밀도 개편(`R44`)을 `docs/to-do.md` 및 `docs/handoff.md`에 등록함.
  - 격리 Worktree `.worktrees/r13-4-breakthrough-guest-and-schedule-tree` (Base SHA `6295a0e6f0bec385abe16c7f4b962840a5ea85ce`)를 생성하고 Step 1(`GPT Codex` `▶ READY`)을 배정함.

## 2026-11-09 (R13 UI Run iteration-02 재리뷰 및 `main` 병합)

- iteration-02 재리뷰 결과를 기록함: R13UI-01~08 해소, 신규 P4 서식 1건(`artifacts/r13-phase13-2-and-13-3-ui/iteration-02/review.json`).
- manifest를 `target_sha=e07cc6a`, `status=completed`로 마감하고 iteration-01 산출물 날짜 오기를 정정함(워크트리 커밋 `0b8eb4d`).
- `collab/r13-phase13-2-and-13-3-ui`를 `main`에 병합함(`1f5d43a`). R13 Phase 13.2 관리자 캐릭터 카탈로그·분류 설정·캐릭터 요청 승인과 Phase 13.3 `/dashboard/characters`가 `main`에 반영됨.
- 병합 후 tsc·lint·Vitest 385개·정적 export 빌드 통과함. 브라우저 수동 확인은 미수행임.

## 2026-11-09 (R13 UI Run iteration-02 수정)

- `/admin/requests` 캐릭터 요청: 아이콘 미리보기와 관리자 교체(파일·붙여넣기·URL) 추가, 교체 아이콘을 `approve_character_request`의 `p_default_icon_url`로 전달함. 아이콘 없는 ADD 요청은 승인 버튼을 비활성화함.
- `RequestSubmissionModal` 캐릭터 요청: 빈 분류 값 제거, UPDATE 대상 미선택 검증 문구, 대상 선택 시 이름·성급·분류 프리필(현재 스키마에 유효한 값만) 추가함.
- `/admin`: 분류 축 행 안정 key(입력 중 포커스 유지), 캐릭터 삭제 확인 다이얼로그, 게임 수정 시 제거되는 성급·분류 옵션의 사용 캐릭터 수 경고(재확인 후 저장), 캐릭터 폼 아이콘 필수 검증 추가함.
- Phase 13.2 단위 테스트 21개 추가함. tsc·lint 통과, Vitest 48파일 385개 통과, 빌드·수동 확인은 미수행임. 커밋 `e07cc6a`(워크트리, 미 push)임.

## 2026-11-09 (R13 UI Run iteration-01 통합 정적 리뷰)

- Base `fe8a776` ↔ Target `6b755aa` 리뷰 결과 기록함: P1 0건, P2 1건, P3 6건, P4 1건(`artifacts/r13-phase13-2-and-13-3-ui/iteration-01/review.json`).
- `test.json`에 tsc·lint·Vitest(48파일 364개) 통과와 빌드·수동 확인 미수행을 기록함.
- manifest `target_sha`를 `6b755aa`로 기록하고 Phase 13.3 수용 기준·R13 명세 §4.2를 전용 `/dashboard/characters` 페이지 기준으로 동기화함(워크트리 커밋 `b6cd7a0`).
- Dispatch Queue에 iteration-02 수정(Step 4, Claude Sonnet `▶ READY`)과 재리뷰·병합(Step 5, Claude Opus)을 추가함. 코드 변경 없음.

## 2026-11-09 (R13 Phase 13.3 전용 캐릭터·프리셋 페이지)

- 신규 `/dashboard/characters` 페이지와 Topbar `캐릭터` 메뉴를 추가함. 구독 게임 선택 바(`보유 캐릭터 n / m명 · 프리셋 k개`), `?gameId=` 진입, 구독 0개 안내를 포함함.
- `보유 캐릭터` 탭에 보유 여부·성급·분류 축·`기타` 필터, 이름 검색, 미보유 명도 감쇠(`brightness-50 saturate-50 opacity-65`), 보유 토글, 캐릭터 메모(200자, Tab 입력), 커스텀 아이콘 변경·기본 복원을 추가함.
- `조합 프리셋` 탭에 프리셋 목록·편집기(중복 방지, 순서 변경, 슬롯 상한, 상한 초과 프리셋의 비파괴 처리)와 삭제를 추가함.
- `storage-upload.ts`에 캐릭터 커스텀 아이콘 헬퍼(`{userId}/characters/{characterId}.webp`, 전체 객체 경로 캐시 키)를 추가하고 게임 아이콘 함수는 공통 내부 함수로 위임함(동작 동일).
- `RequestSubmissionModal`에 선택 prop `initialKind`를 추가함(기존 호출부 동작 불변).
- 선행 수정(`17945d9`): 관리자 페이지 게임 목록의 `classification_schema`·`max_preset_slots` 정규화 및 `Json` 타입 오류 3건 수정, 관리자 테스트 17개 실패 해소함.
- 커밋 `17945d9`, `6b755aa`임. tsc·lint·Vitest(48파일 364개) 통과, 빌드·수동 확인은 미수행임.

## 2026-11-09 (R13 Phase 13.2 관리자 캐릭터 UI)

- 게임 등록·수정 모달에 프리셋 슬롯 수와 성급·분류 축 설정을 추가함.
- `/admin` 캐릭터 관리 탭에 게임·성급·이름 필터 및 캐릭터 추가·수정·삭제 흐름을 추가함.
- `RequestSubmissionModal`에 캐릭터 ADD/UPDATE 요청, 분류 값·아이콘·메모 제출을 추가함.
- `/admin/requests`에 캐릭터 요청 목록과 승인·반려 RPC 처리를 추가함.
- 커밋 `688205e`임. Node/npm 부재로 tsc·lint·Vitest는 미실행 상태임.

## 2026-11-09 (경쟁 서비스 비교 분석 및 개선 후보 R32~R40 등록·리뷰 확정)

- **비교 분석 문서 추가 (Claude Opus)**: `docs/competitive-analysis-pickupgg.md` 신설함. ChronoLedger 기능 현황 점검, 픽업지지(pickupgg.com) 기능 조사, 강점·개선점·포지셔닝 정리함.
- **로드맵 등록**: `docs/to-do.md`에 개선 후보 R32~R40 등록함(오늘/이번 주 요약·D-day, 복각·특별방송 분류, 주차별 리스트 뷰, 관심 일정, 게임별 상세, 일정 시각, 온보딩, 알림, R13 후속 편성). 코드 변경 없음.
- **아키텍처·정합성 리뷰 및 로드맵 확정 (Gemini 4 Argon)**: `docs/competitive-analysis-pickupgg.md` §1 과장/누락 3건 보정(Tauri 딥링크 T1~T4 후속 명시, 카테고리 원그래프 아코디언·수익 추가·R29/R30 보완, R36 버전별 지출 요약으로 R11 정합성 보정), §3·§5 포지셔닝 공식 승인(`APPROVED`), R32~R40 담당 모델·Opus 승격 조건 및 실행 순서(현재 R13 UI Run 완수 직후 차기 Run 1순위 `R32+R34` → 2순위 `R33`) 확정함.
- **R13 `Phase 13.3` 전용 `/dashboard/characters` 페이지 분리 설계 반영 (Gemini 4 Argon)**: 사용자 요청에 따라 보유 캐릭터 로스터 및 조합 프리셋 관리를 `/dashboard/games` 내부 모달이 아닌 상단 내비게이션(`Topbar` `캐릭터` 탭) 및 독립 페이지(`/dashboard/characters`)에서 관리하도록 `docs/spec/R13_Character_Roster_and_Preset_Spec.md`(§4.2, §5), `docs/handoff.md`(Step 2 수용 기준), `docs/to-do.md`, 워크트리 매니페스트(`run.json`)를 일괄 갱신함.

## 2026-11-04 (신규 협업 Run r13-phase13-2-and-13-3-ui 등록 — R13 Phase 13.2 & 13.3 UI)

- **협업 Run 생성 (Gemini 4 Argon)**: Phase 13.1 DB 스키마 및 운영 마이그레이션(R31) 적용이 완료됨에 따라, R13 UI 구현을 위한 격리 Worktree `.worktrees/r13-phase13-2-and-13-3-ui` (Base SHA `fe8a7762404a1b119cb879d1ae4fe624aa370ef7`)를 생성하고 Dispatch Queue에 배정함.
- **과제 배정**:
  - Step 1 (`Phase 13.2`, GitHub Copilot, `▶ READY`): 관리자 게임 분류/슬롯 설정, `캐릭터 관리` 탭, 캐릭터 요청 제출 및 `/admin/requests` 승인/반려 UI + 단위 테스트 배정함.
  - Step 2 (`Phase 13.3`, Claude Sonnet, `⏳ WAITING`): 캐릭터 커스텀 아이콘 Storage 헬퍼, `CharacterPresetModal`(보유 캐릭터 로스터 & 조합 프리셋 빌더), `/dashboard/games` 연동 + 단위 테스트 배정함.
  - Step 3 (Claude Opus / Gemini 4 Argon, `⏳ WAITING`): 통합 정적 코드 리뷰 및 `main` 병합 마감 배정함.

## 2026-11-04 (R13 Phase 13.1·R30 병합)

- **`main` 병합 (7956064)**: R13 캐릭터·프리셋 DB 스키마·마이그레이션·RLS·관리자 RPC·스모크 테스트·타입(`4a21555`), R30 관리자 외부 아이콘 재저장(`12148ea`), iteration-02 수정(`334c642`: 외부 아이콘 판정을 `http(s)://`로 한정, 프리셋 `game_id` 변경 시 슬롯 상한 적용).
- **재리뷰 (Claude Opus)**: iteration-02 clean, 산출물 스키마 검증 통과.

## 2026-11-04 (R13/R30 iteration-02 리뷰 수정)

- R30 아이콘 변환 배지·일괄 집계 대상을 HTTP(S) 외부 URL로 한정하고 `/assets/...` 로컬 시드 아이콘 테스트를 추가함.
- `user_character_presets.game_id` 변경 시 대상 게임의 슬롯 상한을 다시 검사하고 PostgreSQL 회귀 시나리오를 추가함.
- 검증: admin 18개, tsc, ESLint, Vitest 45파일/311개 통과. PostgreSQL 17 임시 stub DB에서 migration 2회 및 전체 SQL suite 통과함.
- 커밋 `334c642f91111b0227327efb2848007cd6ee07f6`임. Claude Opus iteration-02 재리뷰 대기 중임.

## 2026-11-04 (R13 Phase 13.1·R30 iteration-01 리뷰)

- **통합 리뷰 (Claude Opus)**: `1f656ad` ↔ `12148ea` 리뷰 결과 P2 1건·P3 1건 기록, 산출물 `review.json`·`test.json` 스키마 검증 통과. 코드 변경 없음.

## 2026-11-04 (Phase 13.1 R13 DB/타입 Maker 완료)

- R13 분류 스키마 검증, 캐릭터/요청/보유 캐릭터/프리셋 DB, RLS와 관리자 RPC, 계정 삭제 연동 및 TypeScript 타입을 구현함.
- 단일 정의를 유지한 통합 `sql/SCHEMA.sql`, 재실행 가능한 `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`, rollback-only SQL 시나리오 7종과 SRS/SPEC/README를 갱신함.
- 검증: tsc·ESLint·Vitest 45파일/309개 통과, PostgreSQL 17 임시 stub DB에서 마이그레이션 2회 및 전체 SQL smoke suite 통과함. 로컬에는 `pg_cron`을 설치하지 않아 SCHEMA 검증 복사본에서 해당 확장 선언만 제외함.
- 커밋: `4a21555e6bc8177d440a4c765507b1f438069474`임.

## 2026-11-04 (격리 협업 Run r13-phase13-1-db-and-r30-icon-resave 재생성 및 재배정)

- **협업 Run 재생성 (Gemini 4 Argon)**: 타 작업 환경의 미동기화 Worktree로 인한 `🛑 BLOCKED` 상태를 해소하기 위해 현재 PC에서 `.worktrees/r13-phase13-1-db-and-r30-icon-resave` (Base SHA `1f656ad9156e874bfed5901aca00ef06ca9e82cf`)를 재생성함.
- **수용 기준 보강 및 재배정**:
  - Step 1 (`Phase 13.1`, GPT Codex, `▶ READY`): R13 캐릭터·프리셋 DB 스키마 및 타입 구현 시 `iteration-01` 리뷰 지적 사항(`R13-SEC-01` 관리자 RPC `coalesce(v_is_admin, false)` 가드, `R13-TEST-01` 권한/트리거 테스트, `R13-MAINT-01` `SCHEMA.sql` 중복 제거)을 선반영하도록 수용 기준을 명문화함.
  - Step 2 (`Phase 12.34`, Claude Sonnet, `⏳ WAITING`): `/admin` 게임 목록 외부 URL 아이콘 배지 및 WebP Data URL 재저장 기능 배정함.

## 2026-11-04 (에이전트 규칙 문서 한국어 개조식 원칙 추가)

- **에이전트 소통 및 문서 작성 규칙 표준화**:
  - 답과 문서는 한국어 개조식(~함, ~임)으로 쓸 것 원칙을 에이전트 규칙 및 지침 문서 전반에 반영함.
  - 적용 파일: .agents/rules/language.md, AGENTS.md, CLAUDE.md, .agents/rules/agent_rules.md, .agents/rules/collaboration.md, .agents/rules/document_location.md, .agents/rules/handoff.md, .agents/skills/handoff/SKILL.md, .github/copilot-instructions.md.
  - 사용자와의 채팅 대화 및 직접 확인하는 프로젝트 운영 문서(docs/handoff.md, docs/progress.md, docs/changelog.md, docs/to-do.md)에 ~함, ~임, ~됨 종결어미의 개조식 문체를 적용하도록 명시함.
  - 에이전트 간 협업 아티팩트(artifacts/** JSON), 영문 기술 명세서(docs/spec/SRS.md 등), 코드 주석, 커밋 메시지는 기존 영문 규격을 그대로 유지하도록 예외 범위를 명확히 규정함.

## 2026-11-04 (R13 iteration-02 실행 차단 기록)

- 지정된 `.worktrees/r13-phase13-1-db-and-r30-icon-resave` worktree가 없고, 기록된 Step 1/2 SHA `1746ffc…` 및 `78c132f…`가 현재 Git 객체 DB에 없음을 확인했다. 미참조 Git 객체와 저장소 파일 검색에서도 R13 구현 및 iteration-01 리뷰 산출물을 찾지 못했다.
- 기존 SQL 구현에 대한 iteration-02 수정·검증이 불가능해 `docs/handoff.md` Step 4를 `🛑 BLOCKED` 처리했다. 원본 복구 또는 새 Run 등록이 필요하다.

## 2026-11-04 (Run r13-phase13-1-db-and-r30-icon-resave iteration-01 통합 리뷰)

- **정적 리뷰 (Claude Opus)**: Base `3bc0245` ↔ Target `78c132f`. P1: `approve_character_request`/`reject_character_request` 관리자 가드가 일반 사용자에게서 `NULL`이 되어 우회됨(PGlite에서 비관리자가 기존 캐릭터 이름·아이콘을 덮어쓰는 것 재현). P2: §7.5 및 RPC 권한 테스트 누락. P3: `SCHEMA.sql` 함수 중복 정의.
- **검증**: tsc·ESLint·Vitest 45파일/313개 통과, PGlite에서 마이그레이션 2회 멱등 및 프리셋 트리거 엣지 케이스 통과. `TESTS.sql` 전체 실행은 Supabase 테스트 프로젝트 부재로 미실행.
- **산출물**: worktree 커밋 `4d30d5a` (`iteration-01/review.json`·`test.json`, `run.json` `target_sha`). `main` 병합 보류, iteration-02 수정(Step 4, GPT Codex) 배정.
- Phase 12.34 (R30) 관리자 외부 URL 아이콘 배지·Data URL 재저장(`78c132f`, Claude Sonnet)은 리뷰 지적 없음.

## 2026-11-04 (Phase 13.1 R13 DB/타입 Maker 완료)

- 캐릭터 분류 스키마 검증, 캐릭터/요청/보유 캐릭터/프리셋 테이블, 소유권·슬롯 검증 트리거, 캐릭터 삭제 정리, 관리자 승인·반려 RPC, RLS 및 계정 삭제 대기 차단/정리 연동을 추가했다.
- `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`, 통합 `SCHEMA.sql`, rollback-only 테스트 7개 시나리오, TypeScript DB 타입, SRS/SPEC/README/to-do를 갱신했다.
- 검증: `tsc --noEmit`, ESLint, 전체 Vitest 45파일/309개 테스트 통과. 로컬 PostgreSQL이 실행되지 않아 SQL 스모크 실행은 보류.
- 커밋: `1746ffcda57f8be943d52e5fbc0502b228157448`. 다음 단계는 Claude Sonnet의 Phase 12.34 관리자 아이콘 재저장 구현.

## 2026-11-04 (신규 협업 Run r13-phase13-1-db-and-r30-icon-resave 등록)

- **협업 Run 생성 (Gemini 4 Argon)**: 격리 Worktree `.worktrees/r13-phase13-1-db-and-r30-icon-resave` (브랜치 `collab/r13-phase13-1-db-and-r30-icon-resave`, Base SHA `3bc02457a8de4c19b4dca46060c4d358ce15b94e`) 생성 및 Dispatch Queue 배정.
- **과제 배정**:
  - Step 1 (`Phase 13.1`, GPT Codex, `▶ READY`): R13 캐릭터·프리셋 DB 스키마(`MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`), `SCHEMA.sql`, `TESTS.sql`(§7.5 스모크 테스트 7종), `database.types.ts`, `sql/README.md`, `SRS.md`/`SPEC.md`.
  - Step 2 (`Phase 12.34`, Claude Sonnet, `⏳ WAITING`): `/admin` 게임 목록 외부 URL 아이콘 표시 배지 및 WebP Data URL 재저장 기능 (`src/app/admin/page.tsx`, `page.test.tsx`, `docs/to-do.md`).
  - Step 3 (Claude Opus / Gemini 4 Argon, `⏳ WAITING`): Base `3bc0245` ↔ Target 통합 정적 리뷰(`review.json`), `run.json` 마감 및 `main` 병합.

## 2026-11-03 (Phase 12.33 정적 리뷰 PASS 및 r13 Run 마감)

- **정적 코드 리뷰 완료 (Gemini 4 Argon)**: Base `cdee5a74ddb97b86d3899e3cfe6c01cadb9fa9e9` ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` 리뷰 PASS (`clean`, P1~P3 0건, P4 1건). `artifacts/r13-spec-review-and-icon-cors-fix/iteration-01/review.json` 검증 통과.
- **Run 마감**: `r13-spec-review-and-icon-cors-fix` (Step 1 R13 캐릭터 로스터·프리셋 영문 명세서 승인 `b66b07c` + Step 2 Phase 12.33 외부 아이콘 CORS 폴백·클립보드 이미지 붙여넣기·전역 no-referrer `bf3f1a1` + Step 3 정적 리뷰 및 문서 마감) 전 단계 완료.
- **검증**: `tsc --noEmit`, `npm run lint`, Vitest 45개 파일 309개 테스트, `markdownlint` 통과.

## 2026-11-03 (Phase 12.33 외부 아이콘 URL 및 클립보드 이미지, `bf3f1a1`)

- `src/lib/image-resizer.ts`: 외부 URL 직접 요청 실패 시 10초 제한 wsrv.nl 폴백을 추가하고 `no-referrer`, `image/*` 응답 확인, 5MB 입력 제한을 적용했다. URL 실패 시 이미지 붙여넣기 또는 파일 업로드를 안내한다.
- `/admin` 게임 등록/수정 및 `/admin/requests` 게임 승인에서 클립보드 이미지 파일을 WebP Data URL로 변환해 미리보기·저장에 사용한다. 텍스트 붙여넣기는 가로채지 않는다.
- `public/_headers`와 Next metadata의 Referrer Policy를 `no-referrer`로 변경하고, 프록시 폴백·타임아웃·클립보드 입력 테스트를 추가했다.
- 검증: Vitest 45개 파일/309개 테스트, TypeScript, ESLint 통과. 정적 리뷰와 배포는 다음 단계.

## 2026-11-03 (R13 명세 승인)

- **R13 명세 `APPROVED` (b66b07c)**: Claude Opus 아키텍처·보안 리뷰 결과를 명세에 직접 반영하고 §7 Review Resolutions를 추가. 코드 변경 없음.
- **Phase 12.33 Step 2 수용 기준 보완**: 아이콘 URL 프록시 폴백의 시간 제한·응답 형식 검사·제3자 고지, 붙여넣기 범위, CSP 주의 사항.

## 2026-11-03 (Phase 12.32 모달 접근성·기간 필터 라벨 및 통합 리뷰 마감, `3ed5e5d` / `7243c3b`)

- **Phase 12.32 (`3ed5e5d`, GitHub Copilot)**: `src/app/admin/page.tsx`(일정 등록/수정·일정 삭제·게임 삭제), `src/components/game/game-select-modal.tsx`, `src/components/game/request-submission-modal.tsx` 등 5개 모달에 `<DialogDescription>` 추가, `src/app/dashboard/expenses/page.tsx` 통계 기간 드롭다운 고유 `aria-label` 분리(`카테고리별 지출 비중 기간 선택` / `게임별 과금 분석 기간 선택`), 관리자 권한 거부 안내에 `role="alert"` 및 `text-danger` 적용, 단위 테스트 보강.
- **통합 리뷰 및 마감 (`7243c3b`, Gemini 4 Argon)**: Base `05140cb` ↔ Target `3ed5e5d` 정적 리뷰 clean(finding 0건), JSON Schema 검증 및 전체 테스트(44파일 302개)·`tsc`·`lint` 통과 후 `main` 병합 완료.

## 2026-11-03 (Phase 12.15-F3 Supabase 타입 연결, `c075045f`)

- `src/lib/supabase/client.ts`의 `createClient<Database>` 연결과 RPC nullable/optional 인자 및 일정·요청 상태 리터럴 타입을 반영했다.
- 타입 안전성 연결 중 확인된 호출부 정합성 문제를 해결하기 위해 구독 템플릿 payload를 `TablesInsert`/`TablesUpdate`로 지정하고, subscription sync 및 요청 화면의 nullable 필드를 보정했다.
- 검증: `tsc --noEmit`, 관련 Vitest 30개, 변경 파일 ESLint 통과.

## 2026-11-03 (R24 iteration-02 수정 및 Run 마감, `42e52c6` / `5bd515e`)

- `scripts/collaboration/New-CollaborationRun.ps1`: `iteration-01/README.md` 생성 구문을 `@" ... "@`에서 `@' ... '@`로 교체해 백틱 경로 문자열(`review.json`, `test.json`, `artifacts/schemas/`)이 제어문자(`\r`, `\t`, `\a`)로 손상되는 문제를 해결.
- `artifacts/require-main-run-sha/`: `iteration-01/README.md` 복구 및 `iteration-02/review.json`·`test.json` 기록(Base `ea188c6` ↔ Target `42e52c6` clean), `run.json` `completed` 마감 및 `main` 병합 완료.

## 2026-11-02 (R24 iteration-01 리뷰)

- Base `ea188c6` ↔ Target `83d2e18` 리뷰에서 Run 생성 iteration README의 경로 문자열 손상(P3)을 발견했다. README Markdownlint(MD009/MD010)와 Base/Target `git diff --check`가 실패해 R24 마감을 보류하고 Maker 수정·재리뷰 단계를 Dispatch Queue에 등록했다. manifest/review/test 기록은 Run 커밋 `dee8ce6`, Markdownlint 재검증 결과 정정은 `12225b2`에 저장했다.
- Run manifest, review, test 산출물은 각각 해당 JSON Schema 검증을 통과했다. 기능 소스 변경이나 배포는 없다.

## 2026-11-02 (Phase 12.31 정적 리뷰)

- **리뷰 완료 (Claude Opus)**: `20e32b5` ↔ `fc4ea9d` PASS. P4 2건(미사용 eslint-disable 주석, 툴팁 연결 컴포넌트 테스트 부재)을 `docs/handoff.md`에 기록. 코드 변경 없음.

## 2026-11-02 (배포)

- **운영 배포**: `origin/main`을 `d70ec5e` → `d57b3e2`로 갱신해 Phase 12.24 ~ 12.30 변경을 일괄 배포. 운영 DB 마이그레이션(`MIGRATION_USERS_ROLE_GUARD.sql`, `MIGRATION_MONTHLY_PLANNED_DEDUPE.sql`)은 사전 적용 완료. 메모 Tab 입력 실제 환경 테스트 성공.

## 2026-11-02 (Phase 12.30 정적 리뷰)

- **리뷰 완료 (Claude Opus)**: `7e9a57b` ↔ `87cf75e` PASS. P4 3건(Radix 포커스 트랩 마지막 요소 조건, 되돌리기 단계, 일정 메모 공백 표시)을 `docs/handoff.md`에 기록. 코드 변경 없음.

## 2026-11-02 (Phase 12.30 메모 입력란 Tab 키, `87cf75e`)

- `src/lib/textarea-tab.ts` 신규: 메모 입력란에서 Tab 키를 `\t` 입력으로 처리(Shift/Ctrl/Alt/Meta 조합·IME 조합 중 제외, `maxLength` 초과 시 미삽입).
- `hero-sidebar.tsx`, `games/page.tsx`, `expense-detail-modal.tsx`, `request-submission-modal.tsx`의 메모 입력란에 적용. `games/page.tsx` 공식 일정 메모 표시를 `whitespace-pre-line` → `whitespace-pre-wrap`으로 변경.
- 헬퍼 및 4개 컴포넌트 단위 테스트 추가.

## 2026-11-02 (Phase 12.27 ~ 12.29 통합 정적 리뷰)

- Base `0da8eb4` ↔ Target `b820a4e` 통합 리뷰 clean, finding 0건. 리뷰 결과 `artifacts/users-role-guard-and-subscription-dedupe/iteration-01/review.json` schema 검증 통과.
- 전체 Vitest 42개 파일 286개, TypeScript, lint, 관련 Markdownlint 통과. 리뷰 환경에 `psql`이 없어 SQL 스모크 테스트는 독립 재실행하지 않았고 Maker 기록과 구분했다.

## 2026-11-02 (Phase 12.29 문서·UI 보강)

- **대시보드 (b820a4e)**: 일정 표시 설정 조회 실패 시 대시보드 전체 실패 대신 공식 일정만 표시하고 안내 문구 노출.
- **게임 등록 모달 (b820a4e)**: 세션 갱신으로 `user` 참조만 바뀔 때 목록 재조회·선택 초기화가 일어나지 않도록 `user?.id` 의존으로 변경.
- **`sql/README.md` (b820a4e)**: `MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql` 확인 쿼리와 물리 삭제 경고 추가.
- **`docs/handoff.md` (70efa54)**: 잘못 삽입된 12.24~12.26 리뷰 섹션을 이동해 상단 Fallback 표 구조 복구.

## 2026-11-02 (Phase 12.28 월간 구독 중복 정리 및 공식 일정 필터, `bdb064c`)

- `MIGRATION_MONTHLY_PLANNED_DEDUPE.sql`이 각 월간 템플릿의 가장 이른 `PLANNED` 1건만 남기고 기존 중복을 정리한다. 본인 활성 템플릿 소유를 검사하는 `dedupe_monthly_planned_expenses` RPC로 런타임 정리를 수행하며 `expenses` DELETE 정책은 열지 않는다.
- `VERSION_PASS` 예정 지출과 지출 모달 버전 연결에서 비공식 일정을 제외한다. `is_official` 컬럼이 없는 기존 DB는 전체 일정을 공식으로 처리한다.
- SRS·의사결정 기록·SQL README·테스트·타입 정의를 동기화했다. 해당 Vitest 47개, TypeScript, 로컬 PostgreSQL 신규 SCHEMA/전체 migrations/백필/TESTS.sql 및 두 마이그레이션 재실행 검증 통과. 운영 DB에는 미적용.

## 2026-11-02 (Phase 12.27 `public.users.role` 자기 승격 차단)

- **보안 수정 (361fbbc)**: 일반 사용자가 본인 `public.users.role`을 `admin`으로 바꿔 관리자 RPC를 통과할 수 있던 결함을 `BEFORE UPDATE OF role` 트리거(`prevent_users_role_self_change`)로 차단. `sql/migrations/MIGRATION_USERS_ROLE_GUARD.sql`, `SCHEMA.sql`, `sql/README.md` 반영, `TESTS.sql` USR-01 추가.
- **결정 기록**: R20 비공식 일정은 사용자 토글과 무관하게 `VERSION_PASS` 생성·지출 모달 버전 연결에서 항상 제외(Phase 12.28에서 구현 예정).

## 2026-11-02 (Phase 12.24 ~ 12.26 통합 정적 리뷰)

- **통합 리뷰 완료 (Claude Opus)**: `d70ec5e` ↔ `ec61251` 범위를 검토함. 조건부 통과이며, P1 1건(기존 `public.users.role` 자기 승격 RLS 결함)·P2 1건(MONTHLY_DAY 중복 PLANNED 정리 무동작)·P3 4건·P4 2건을 `docs/handoff.md`에 기록하고 `docs/to-do.md` R18~R22로 등록함. 코드 변경 없음.

## 2026-11-02 (Phase 12.26 소비 통계·예산 배지, `6364132`)

- `expenses/page.tsx`: 게임별 과금 분석 Y축을 24px 게임 아이콘으로 교체(이름은 순위 목록에만 표시), 차트 `accessibilityLayer` 비활성화 및 `globals.css` 포커스 외곽선 제거, Tooltip 최대 폭 제한.
- 카테고리별 지출 비중·게임별 과금 분석에 이번 달 기본값 + 월 선택 드롭다운(이번 달/과거 연월/전체 기간) 추가. 정기 구독 탭에 활성 구독 총액과 주기별 소계 표시.
- `hero-sidebar.tsx`: 예상 지출 옆에 예산 80% 이상 `[주의: 예산 근접]`, 100% 초과 `[위험: 예산 초과]` 배지 표시. 관련 단위 테스트 추가.

## 2026-11-02 (Phase 12.25 관리자/게임 모달 및 비공식 일정, `3c20e70`)

- `/admin/requests`의 관리자 직접 게임 추가 중복 UI를 제거하고, 관리자 게임 등록/수정 및 게임 요청 승인에서 아이콘 파일·URL을 256×256 WebP Data URL로 변환해 저장하도록 했다. 이미 구독한 게임은 구독 추가 목록에서 제외하며, `GameIcon`에 외부 이미지 1회 재시도를 추가했다.
- `game_schedules` 및 `schedule_requests`에 `is_official`, `users`에 `show_unofficial_schedules`를 추가하고, 관리자 분류·사용자 설정 토글·대시보드/게임 페이지 필터와 `[비공식]` 배지를 연결했다.
- 관련 8개 Vitest 파일(57개 테스트), `tsc --noEmit`, lint 통과. 운영 Supabase 적용 및 원격 동작 확인은 후속 수동 작업이다.

## 2026-11-02 (Phase 12.24 구독 템플릿·다음 회차 동기화)

- 구독 템플릿 비활성화 시 미결제 `PLANNED` 회차를 삭제하도록 스키마와 마이그레이션을 추가하고, 과거 `TEMPLATE_DEACTIVATION` 취소 행을 정리한다. 복구 RPC는 사용자가 직접 취소한 `PLANNED_CANCEL`만 복구한다.
- `MONTHLY_DAY` 지연 생성은 KST 오늘 기준 다음 한 회차로 제한하고 기존 중복 예정 행을 정리한다. `VERSION_PASS`는 종료일이 오늘 이전인 일정을 제외한다.
- `TESTS.sql` 및 SRS를 동기화하고 구독 동기화 단위 테스트를 보강했다. Vitest 20개와 `tsc --noEmit` 통과. SQL 스모크 테스트 미실행.

## 2026-10-29 (Phase 12.15-F2 통합 리뷰 마감)

- `38d3f71`(`database.types.ts` 동기화) 정적 리뷰 PASS, Run `database-types-schema-sync` 마감. 코드 변경 없음. 리뷰 기록은 `docs/handoff.md`, 비차단 후속 과제는 `docs/to-do.md` 12.15-F3.

## 2026-10-29 (Phase 12.15-F2 database.types.ts 동기화)

- **`src/types/database.types.ts`**: `user_games.memo`, `subscription_templates.cycle_type`/`interval_days` 추가 및 `billing_day` nullable 처리. RPC `admin_create_game`, `delete_subscription_template`, `get_account_deletion_status`, `purge_expired_account_deletion_requests`, `request_account_deletion`, `update_confirmed_expense_metadata` 추가, `process_expense_payment`에 `p_custom_earned_points`/`p_memo` 반영. `sql/SCHEMA.sql`을 기준으로 삼았으며 handoff 수용 기준과 다른 항목은 handoff.md 순서 1 기록 참조.

## 2026-10-29 (운영 DB 마이그레이션 적용 완료 및 Phase 12.15-F2 타입 동기화 Run 발족)

- **운영 Supabase 마이그레이션 실행 완료**:
  - 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 적용 완료 (`Phase 12.15-F2-a` 체크 완료).
- **신규 협업 Run 발족 (`database-types-schema-sync`)**:
  - `src/types/database.types.ts`를 현행 `sql/SCHEMA.sql` 기준 테이블 컬럼(`user_games.memo`, `subscription_templates`) 및 11개 인자 `process_expense_payment` 등 최신 RPC 시그니처와 100% 일치하도록 동기화하는 과제(`Phase 12.15-F2-b`)를 Active Dispatch Table에 `▶ READY`로 배정 (담당: Claude Sonnet).
- **운영 문서 동기화**: `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md` 최신화.

## 2026-10-29 (Phase 12.23 & 12.15-F1 통합 정적 리뷰 및 예정 지출 메모 보존)

- **통합 리뷰 완료 (Gemini 4 Argon)**: `Phase 12.23` (`d5522dc`) 및 `Phase 12.15-F1` (`cb0b92c`) 변경 사항 통합 정적 코드 리뷰 완료. 차단 결함 0건, P3(예정 지출 수정·결제 시 기존 메모 증발 버그) 완전 해결 확인.
- **Phase 12.23 예정 지출 메모 보존 및 잔여 주석 정리 (`d5522dc`, Claude Sonnet)**:
  - `expense-modal.tsx`: `PlannedExpenseInput`에 `memo?: string | null` 추가 및 `handleSubmit`에서 기존 메모(`editingExpense?.memo ?? plannedExpense?.memo ?? null`)를 추출해 `mergeEventMemo`로 전달하여 수정(`EDIT_PLAN`) 및 결제(`PAY`) 시 메모 보존 및 이벤트 태그 병합.
  - `expenses/page.tsx`: `handleConfirmPlanned`에서 `memo: expense.memo ?? null` 전달 및 구 픽업 관련 잔여 주석 정리.
  - `expense-modal.test.tsx`: 예정 지출 수정 및 결제 시 기존 메모 보존 및 이벤트 태그 병합 단위 테스트 2건 추가.
- **협업 Run 마감**: `expense-memo-preservation-and-sql-smoke-tests` Run 3단계 전체 완료 (`✅ DONE`) 처리 및 프로젝트 운영 문서 동기화.

## 2026-10-29 (Phase 12.15-F1 스모크 테스트 정합화 및 구독 템플릿 삭제 RPC 전용화)

- **`sql/tests/TESTS.sql` (cb0b92c)**: WAL-01을 현행 결제 RPC에 맞춰 갱신(포인트 플랫폼 지정 WALLET 결제 적립 8, 잔액 408). 전체 스모크 테스트가 끝까지 PASS.
- **구독 템플릿 삭제 RPC 전용화**: `Delete own templates` RLS 정책 제거(`sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql`, `SCHEMA.sql`). 소비 페이지의 RPC 실패 시 직접 DELETE/비활성화 폴백을 제거하고 오류를 알리도록 변경(단위 테스트 추가).
- **명세 갱신**: SRS FR-042(포인트 플랫폼 지정 WALLET 결제 적립)·FR-053(템플릿 삭제는 RPC로만), SPEC, `revisions_and_decisions.md`.

## 2026-10-29 (Phase 12.20 ~ 12.22 통합 정적 리뷰)

- **통합 리뷰 완료 (Claude Opus)**: `de373b9` ↔ `a688dab` 범위와 Phase 12.22 지침 변경을 검토함. 차단 결함 0건이며, P3 1건(지출 모달 기존 메모 덮어쓰기, 기존 결함)과 P4 3건을 `docs/handoff.md`에 기록함.
- **문서 수정**: Phase 12.21 changelog 항목에서 LaTeX 화살표 표기가 탭 문자로 변형되어 생긴 markdownlint MD010 오류를 `→`로 교체해 해소.

## 2026-10-29 (Phase 12.22 AI 전용 지침 문서 영문화 및 한국어 원본 아카이빙)

- **AI 전용 지침 영문화 (`CLAUDE.md`, `AGENTS.md`, `.agents/rules/*.md`, `.agents/skills/*/SKILL.md`)**:
  - AI 에이전트 자동 로드 지침 8종을 의미 손실 없이 간결한 영문으로 전면 재작성하여 시스템 프롬프트 토큰 소모량 대폭 절감.
  - `CLAUDE.md` 7~11행 un-backticked `@.agents/rules/...` 임포트 규칙 엄격 준수.
  - Claude Pro Sonnet / Opus 2단계 운용 기준(기본 Sonnet, 4대 조건 충족 시 Opus 승격) 및 5대 AI 모델 Fallback 매트릭스 영문화 반영.
- **Phase 12.21 게임별 과금 분석 전환 및 픽업 연결 제거 (e9a7017)**:
  - `expenses/page.tsx`: `게임 픽업별 과금 분석` → `게임별 과금 분석`(CONFIRMED + 게임 카테고리 지출을 게임별 합산·정렬), 게임 필터·`game_schedules` 조회·목록 픽업 배지 제거.
  - `expense-modal.tsx`: `연결된 픽업 일정` UI·픽업 상태·`[PICKUPS:...]` 메모 합성 제거(`pickup_schedule_id`는 `null`), 버전 일정/패스 유예 유지. `expense-detail-modal.tsx`: 픽업 줄 제거. 관련 단위 테스트 갱신.
- **Phase 12.20 대시보드 선택일 게임 일정 표시 개편 (335e517)**:
  - `hero-sidebar.tsx`: 기본은 `VERSION` 시작일만, 그 외 일정은 시작/종료일만 노출. `진행 일정 전체 보기` 토글 ON 시 진행 중 일정 전체 노출. 정렬은 `start_date` 내림차순, 동일 시 `end_date` 오름차순 (`dashboard/page.tsx` 정렬 동기화, 단위 테스트 추가).
- **한국어 지침 원본 분리 아카이빙 (`docs/archive/agent-rules-ko/`)**:
  - `docs/archive/agent-rules-ko/` 디렉터리를 신규 생성하고 기존 한국어 지침 8종(`CLAUDE-ko.md`, `AGENTS-ko.md`, `language-ko.md`, `collaboration-ko.md`, `handoff-rule-ko.md`, `document_location-ko.md`, `handoff-SKILL-ko.md`, `chronoledger-orchestrator-SKILL-ko.md`)을 원본 대조용으로 분리 보관.
  - 에이전트 자동 탐색 경로 바깥에 배치하여 중복 프롬프트 주입 차단 및 아카이브 안내 `README.md` 작성.
- **한국어 소통 원칙 유지 (`.agents/rules/language.md`)**:
  - 사용자 대면 질의/보고 및 `ask_question` 선택지는 반드시 한국어(`Korean`)로 작성하도록 명시.
  - 사용자가 열람하는 프로젝트 운영 문서(`docs/handoff.md`, `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md` 등)는 한국어 유지.
- **신규 협업 Run 등록 (`docs/handoff.md`)**:
  - `schedule-filter-and-game-spend-stats` Run 등록: Phase 12.22 `✅ DONE`, Phase 12.20 `▶ READY`, Phase 12.21 `⏳ WAITING`, 통합 리뷰 `⏳ WAITING`.

## 2026-10-29 (Phase 12.17 Android WebAPK 앱 명칭 `ChroLog` 동기화 및 Service Worker v5 갱신)

- **Android WebAPK/설치 창 표시 명칭 `ChroLog` 동기화 (`public/manifest.json`)**:
  - 모바일 Chrome/Android 환경에서 PWA WebAPK 설치 시 다이얼로그 및 홈 화면/앱 서랍에서 `ChronoLedger`가 말줄임되는 문제를 원천 차단하기 위해 `manifest.json`의 `name`을 `"ChronoLedger"`에서 `"ChroLog"`로 동기화 (`name: "ChroLog"`, `short_name: "ChroLog"`).
  - 앱 설명은 `"ChronoLedger - 게임 일정 및 지출 관리 매니저"`로 보완.
- **Service Worker 셸 캐시 v5 갱신 (`public/sw.js`, `src/components/pwa/sw.test.ts`)**:
  - `manifest.json` 갱신 사항이 모바일 클라이언트 브라우저 캐시에 즉시 반영되도록 `SHELL_CACHE` 버전을 `chronoledger-shell-v4`에서 `chronoledger-shell-v5`로 범프.
  - `src/components/pwa/sw.test.ts`에 `SHELL_CACHE` 버전 및 `manifest.json` 명칭 검증 테스트 추가 (전체 41개 파일 272개 테스트 통과).

## 2026-10-29 (Phase 12.14 ~ 12.19 통합 정적 코드 리뷰 및 협업 Run 마감)

- **Phase 12.14 ~ 12.19 통합 코드 리뷰 통과**: 커밋 `49cf00a` (Phase 12.16/12.17), `ac58a1b` & `f272bfd` (Phase 12.14/12.18), `6015399` & `102e89e` (Claude Pro Sonnet/Opus 2단계 기준 수립), `dd01401` (Phase 12.19 소비 카테고리 아코디언), `cee2b76` (Phase 12.15 SQL 분류·정리) 전체 변경사항 정적 코드 리뷰 및 무결성 검증 완료.
- **`sql/SCHEMA.sql` 보안 및 멱등성 보강**: `public.handle_new_user()` 트리거 함수에 `ON CONFLICT (id) DO NOTHING` 및 `SET search_path = public`을 추가하여 `SCHEMA.sql` 내 다른 `SECURITY DEFINER` 함수들과의 보안 일관성 확보.
- **협업 Run 마감**: `mobile-ux-and-sql-consolidation` Run 전 단계(Step 1~6) 완료 처리 및 `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` 동기화. 전체 270개 단위 테스트, 타입 검사, 린트 100% 통과 확인.

## 2026-10-29 (Phase 12.15 SQL 문서 분류·통합·정리)

- **`sql/` 재구성**: `SCHEMA.sql`(신규 설치용 마스터), `migrations/`(기존 DB 동기화·재실행 안전 5개), `seed/`(3), `tests/TESTS.sql`, `archive/`(대체된 6개, 재실행 금지 주석). `sql/README.md`에 설치 순서·반영 확인 쿼리·신규 변경 규칙 정리.
- **`SCHEMA.sql` 신규 설치 수정**: `public.users` 테이블·RLS·가입 트리거·백필 추가, 중복 `idx_expenses_pickup_schedule_id` 및 존재하지 않는 9개 인자 `process_expense_payment` GRANT 제거, `pg_cron` 탈퇴 정리 스케줄 통합.
- **`MIGRATION_STORE_EVENT_EARN.sql`**: 9개 인자 구버전 결제 RPC 오버로드를 먼저 `DROP`.
- **`TESTS.sql`**: 두 번째 사용자 Galaxy Store 초기 등급 단언이 `GENERAL`을 허용하도록 정정. 헤더 실행 경로 `sql/tests/TESTS.sql`로 갱신.
- 경로 참조 갱신(`games/page.tsx` 안내 문구, `CLAUDE.md`, `README.md`, `architecture.md`, `detailed-design.md`, `known-pitfalls.md` 27번 신규).

## 2026-10-28 (Phase 12.19 카테고리별 지출 내역 아코디언)

- **소비 페이지 카테고리 아코디언 (`src/app/dashboard/expenses/page.tsx`)**: 원그래프 조각/범례 버튼 클릭 시 카드 하단에 해당 카테고리 확정(`CONFIRMED`) 지출을 최신순으로 펼침. 재클릭·닫기로 접힘, 항목 클릭 시 `ExpenseDetailModal` 열림. 범례를 `<button>`으로 변경해 키보드 접근 지원.
- 단위 테스트 2건 추가 (`page.test.tsx`).

## 2026-10-28 (Claude 모델 표기 정리: 사용 불가 모델 제거, Sonnet / Opus 2단계 기준 문서 간 통일)

- **사용 불가 Claude 모델 표기 제거**: `CLAUDE.md`, `AGENTS.md`, `.agents/rules/collaboration.md`, `docs/handoff.md` 및 이력 문서(`docs/changelog.md`, `docs/progress.md`, `docs/to-do.md`)에서 Sonnet / Opus 외 Claude 모델 선택지·언급 삭제.
- **옛 단일 `Claude Opus 5.5` 역할 표기를 Sonnet / Opus 2단계 기준으로 통일**: `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`(역할 표·배정 안내), `.agents/skills/chronoledger-orchestrator/SKILL.md`(Sonnet 기본·Opus 승격 조건), `.github/copilot-instructions.md`, `docs/architecture.md`, `docs/handoff.md` 상단 위임 지침. Argon / Codex 1순위 대체는 `Claude Opus`로 명시.
- `docs/handoff.md` 수용 기준 3의 "3종 모델" 오기를 "2종 모델"로 수정.

## 2026-10-28 (Phase 12.14 / 12.18 모바일 UX, CLAUDE.md 문서화, Netlify 잔재 제거)

- **배경 설정 팝오버 모바일 화면 이탈 수정 (`src/components/calendar/calendar-bg-customizer.tsx`)**: 팝오버 정렬을 `left-0 sm:left-auto sm:right-0`으로 변경.
- **세로형 배경 이미지 리사이징 최적화 (`src/lib/calendar-bg-storage.ts`)**: `calculateScaledDimensions`가 세로형 원본에는 1080×1920 경계 상자를 적용.
- **모바일 선택일 드로어 뒤로 가기 연동 (`src/components/calendar/mobile-drawer.tsx`)**: `useDrawerHistory` 훅으로 `pushState`/`popstate`/`history.back()` 동기화. 테스트 `mobile-drawer.test.tsx` 신규.
- **CLAUDE.md / AGENTS.md**: 개발 명령어·아키텍처·데이터/UI 규칙 문서화, 깨진 절대 경로 링크 수정.
- **Netlify 잔재 제거**: `netlify/`, `netlify.toml`, `src/__tests__/functions/*`, `@netlify/functions` 의존성 삭제. `docs/architecture.md` 갱신.

## 2026-10-28 (모바일 UX 개선 구현, Active Dispatch Queue 과제 배정, Claude Code/AGENTS 설정 및 경로 최신화)

- **공식 일정 보기 "/" 자동 줄바꿈 구현 (`src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`)**:
  - Phase 12.16 (R6): 공식 일정 중앙 팝업 다이얼로그에서 `sch.title` 및 `sch.memo`에 `"/"`가 포함된 경우 `split("/").map(part => part.trim()).filter(Boolean)`으로 분리하여 각 줄 단위 블록(`span className="block"`)으로 줄바꿈 렌더링.
  - `src/app/dashboard/games/page.test.tsx`에 "/" 포함 일정 제목 및 메모의 블록 줄바꿈 렌더링 단위 테스트 추가 (13개 테스트 PASS).
- **모바일 PWA 설치 시 홈 화면 표시 이름 `ChroLog` 단축 (`public/manifest.json`, `src/app/layout.tsx`)**:
  - Phase 12.17 (R7): 모바일 Chrome PWA 설치 시 `ChronoLedger`가 `ChronoLe...`로 말줄임되는 문제를 해결하기 위해 앱 정식 명칭은 유지하고 `manifest.json`의 `short_name` 및 `layout.tsx`의 `appleWebApp.title`을 `"ChroLog"`로 단축 적용.
- **Claude Pro Opus / Sonnet 구독 반영 및 Active AI Collaboration Dispatch Queue 배정 (`.agents/rules/collaboration.md`, `CLAUDE.md`, `AGENTS.md`, `docs/handoff.md`)**:
  - 사용자의 Claude Pro 구독으로 Opus, Sonnet을 난이도와 토큰 효율에 맞춰 운용:
    - `Claude Opus`: 고난도 복합 상태·브라우저 생명주기 제어(History API 등), 아키텍처 리팩토링, 심층 정적 코드 리뷰 및 Argon / Codex 1순위 Fallback 전담.
    - `Claude Sonnet`: 명확히 구체화된 다중 컴포넌트 UI 인터랙션·상태 연동 및 단위 테스트 고속 구현 전담.
  - 신규 협업 Run `mobile-ux-and-sql-consolidation` (Step 1 DONE, Step 2 READY, Step 3~5 PENDING)을 `docs/handoff.md` 최상단에 배정.
- **신규 모바일·소비 기능 과제 3건 기획 구체화 및 로드맵 반영 (`docs/to-do.md`, `docs/handoff.md`, `docs/progress.md`)**:
  - `12.17` / `R7`: 모바일 Chrome PWA 설치 시 `ChronoLedger` 명칭 말줄임(`ChronoLe...`) 방지를 위해 홈 화면 앱 아이콘 표시 이름(`short_name`) 및 `appleWebApp.title`을 `"ChroLog"`로 단축 적용하기로 명세 확정.
  - `12.18` / `R8`: 모바일 대시보드(`/dashboard`) 선택일 상세 드로어(`MobileDrawer`) 오픈 상태에서 스마트폰 뒤로 가기 시 이전 라우트 이탈 없이 드로어만 닫히도록 브라우저 History API 연동 명세 확정.
  - `12.19` / `R9`: 소비 페이지(`/dashboard/expenses`) 카테고리별 지출 비중 카드 내 원그래프 조각 또는 범례 버튼 클릭 시 카드 내부 하단에 해당 카테고리의 `CONFIRMED` 지출 내역만 최신순으로 펼쳐서 표시하는 아코디언 인터랙션 구체화 명세 확정 (기존 R7은 R10으로 번호 조정).
- **Claude Code 지침 신규 생성 (`CLAUDE.md`)**:
  - 프로젝트 루트에 Claude Code(VS Code 확장 및 데스크톱) 전용 지침 파일 `CLAUDE.md` 신규 생성.
  - `@.agents/rules/` 문법으로 5개 핵심 규칙 파일(`language.md`, `collaboration.md`, `handoff.md`, `agent_rules.md`, `document_location.md`) 링크 임포트.
  - Claude(Claude Opus 5.5 / Sonnet)의 기본 역할(`Reviewer & Maker (Complex)`) 및 1순위 대체(Fallback 1) 역할(Gemini 4 Argon, GPT Codex 토큰 소진 시 승계) 명시.
  - `"인수인계 문서를 확인해"` 6단계 자동 실행 프로토콜 및 프로젝트 주요 문서/코드 경로 안내 수록.
- **범용 코딩 에이전트 지침 신규 생성 (`AGENTS.md`)**:
  - GPT Codex, OpenCode 등 범용 에이전트 자동 인식을 위해 프로젝트 루트에 `AGENTS.md` 신규 생성.
  - `.agents/rules/*.md` 및 `.agents/skills/*/SKILL.md` 우선 참조 연결.
  - 5대 AI 모델 역할 분배표(Role Matrix & Fallback chain), 5단계 실행 프로토콜, 프로젝트 경로 안내 수록.
- **기존 지침 파일 내 구버전 경로(`md/...`) 최신화**:
  - `.github/copilot-instructions.md`: 구 `md/SKILL.md`, `md/agent_rules.md`, `md/revisions_and_decisions.md`, `md/SRS.md`, `md/SPEC.md`, `md/SCHEMA.sql`, `md/ChronoLedger_UI_Design_Sheet.md`, `docs/design-v1-ko.html`, `docs/Netlify_Web_Architecture_Proposal.md` 참조를 `.agents/rules/`, `docs/spec/`, `sql/`, `docs/design-previews/`, `docs/archive/`의 실제 유효 경로로 일괄 수정.
  - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.agents/skills/chronoledger-maker/SKILL.md`, `.agents/skills/chronoledger-reviewer/SKILL.md`: `md/` 참조를 `.agents/rules/collaboration.md`, `.agents/rules/handoff.md`, `.agents/rules/agent_rules.md`로 수정.

## 2026-10-27 (게임별 상시 메모 기능 추가: user_games.memo 확장 및 /dashboard/games 카드 연동)

- **게임별 상시 메모 스키마 확장 및 마이그레이션 (`sql/SCHEMA.sql`, `sql/MIGRATION_USER_GAME_MEMO.sql`)**:
  - `public.user_games` 테이블에 특정 일정과 무관하게 게임 단위로 상시 기록할 수 있는 `memo TEXT` 컬럼 추가 (`ALTER TABLE public.user_games ADD COLUMN IF NOT EXISTS memo TEXT;`).
- **`/dashboard/games` 구독 게임 상시 메모 중앙 팝업 다이얼로그(`Dialog`) 전환 및 카드 높이 균일화 (`src/app/dashboard/games/page.tsx`)**:
  - `UserGameRow` 인터페이스 및 `user_games` 조회(`select`) 쿼리에 `memo` 포함.
  - 상시 메모 작성/수정 방식을 기존 카드 내부 인라인 편집에서 `[일정 보기]`와 통일된 **중앙 팝업 다이얼로그(`Dialog`)**로 개편하여 카드 레이아웃 흔들림 방지.
  - 다이얼로그 내부 `Textarea`를 `h-56 max-h-56 resize-none overflow-y-auto` 고정 높이로 지정하여 긴 메모 작성 시 안정적인 세로 스크롤 제공.
  - 구독 게임 카드 내부의 메모 표시 영역 및 미작성 안내 버튼에 `h-20` 고정 높이와 `overflow-y-auto`를 적용하여 그리드 내 모든 카드의 높이를 균일하게 유지.
  - 저장 시 앞뒤 공백을 제거(`trim`)하여 빈 문자열이면 `null`로 초기화하고, `.eq("id", ug.id).eq("user_id", user.id)`로 본인 소유 행만 안전하게 갱신한 뒤 로컬 상태를 즉시 반영.
  - 구독 게임 목록 하단 페이지네이션 컨테이너에 `flex-wrap justify-center`를 적용하여 모바일 화면 이탈 방지.
- **단위 테스트 및 리뷰/빌드 검증 (`src/app/dashboard/games/page.test.tsx`)**:
  - 게임별 상시 메모 표시, 신규 작성 및 trim 저장, 기존 메모 비우기(`null` 저장), 취소 시 미호출, 저장 실패 시 `alert` 안내 및 편집 유지 등 5개 단위 테스트 케이스 추가 (`games/page.test.tsx` 12개 PASS, 전체 42개 파일 267개 테스트 100% PASS, Next.js 정적 빌드 성공).
- **ESLint 빌드 에러 해결 및 Service Worker 캐시 범프 (`src/app/dashboard/games/page.tsx`, `public/sw.js`)**:
  - `/dashboard/games` `loadGames` 내 `let` 변수를 `const`로 수정하여 `prefer-const` ESLint 빌드 에러 해결.
  - PWA Service Worker `SHELL_CACHE` 버전을 `v4`(`chronoledger-shell-v4`)로 범프하여 신규 정적 자산 즉시 갱신 및 Cloudflare Pages 배포 정상화.
- **일정·상태 배지 줄바꿈 잘림 방지 및 모달 레이아웃 개선 (`src/app/dashboard/games/page.tsx` 등)**:
  - 공식 일정 모달 및 대시보드/관리자/요청 내역의 일정·상태 배지에 `shrink-0 whitespace-nowrap`을 적용하고 제목에 `min-w-0 flex-1 break-words`를 적용하여 긴 일정 제목에서도 배지가 세로로 분리되거나 줄바꿈되는 현상 해결.
- **소비 페이지 과거 지출 내림차순 정렬 개선 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
  - `/dashboard/expenses`의 `과거 기록`(`pastExpenses`)을 날짜 내림차순(최신 과거 $\to$ 오래된 과거)으로 정렬하도록 수정.
  - `src/app/dashboard/expenses/page.test.tsx`에 과거 지출 내림차순 정렬 단위 테스트 추가 (18개 테스트 PASS).

## 2026-10-26 (구글 플레이 포인트 적립 누락 버그 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계)

- **포인트 미사용 결제 시 스토어 포인트 적립 누락 버그 해결 (`src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 기존 `ExpenseModal`의 `input` 계산 시 `usedPoints === 0`이면 `pointPlatform: null`을 반환하여 `process_expense_payment` RPC에서 적립이 0P로 누락되던 결함을 해결 (`pointPlatform: activePointPlatform` 전달).
  - 예정 지출(`PLANNED`) 등록 및 수정 시에도 `point_platform`을 저장하고, 모달 재오픈 시 `resolveStorePlatform`을 통해 선택한 스토어 플랫폼을 복원하도록 개선.
- **구글 플레이 부스트 이벤트 고정 적립률(`0.1% × n배`) 재설계 (`src/lib/payment-calculations.ts`, `src/components/expense/expense-modal.tsx`)**:
  - `GOOGLE_BOOST_BASE_RATE = 0.1` 상수를 도입하여 구글 플레이 부스트 활성화 시 등급별 기본 적립률(`baseEarnRate`)과 무관하게 **1,000원당 `n`포인트(`0.1% × n배`)**로 고정 적립률을 계산하도록 변경.
  - 부스트 안내 UI 문구를 `"이벤트 고정: 1,000원당 {n}P ({effectiveRate}%)"`로 직관화.
- **DB RPC 지갑 자동 생성 안전망 보강 (`sql/SCHEMA.sql`, `sql/MIGRATION_STORE_EVENT_EARN.sql`)**:
  - `process_expense_payment` RPC에서 포인트 미사용 스토어 결제(`p_used_points = 0`) 시 해당 스토어의 `store_wallets` 행이 아직 없으면 기본 등급(`GOOGLE_PLAY`: `'BRONZE'`/`0.10`, `GALAXY_STORE`: `'GENERAL'`/`0.10`)으로 자동 생성(`ON CONFLICT DO NOTHING`)한 뒤 적립을 수행하도록 보강.
- **단위 테스트 및 리뷰/빌드 검증**:
  - `src/lib/payment-calculations.test.ts` (10개 PASS), `src/components/expense/expense-modal.test.tsx` (24개 PASS), 전체 42개 파일 262개 테스트 100% 통과 및 정적 빌드 성공 (커밋 `7307b99`, Gemini 4 Argon 정적 리뷰 PASS).

## 2026-10-26 (모바일 화면 UI 오버플로우 3건 해결 및 향후 과제 4종 로드맵 수립)

- **공통 다이얼로그 및 수동 보정 내역 모달 모바일 화면 이탈 방지 (`src/components/ui/dialog.tsx`, `src/components/wallet/store-wallet-adjust-history-modal.tsx`)**:
  - `DialogContent` 기본 스타일에 `grid-cols-1 overflow-x-hidden p-4 sm:p-6`을 적용하여 CSS Grid 직계 자식의 `min-width: auto` 팽창 현상 차단 및 모바일 내부 패딩 최적화.
  - `StoreWalletAdjustHistoryModal`에 `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강, 헤더 타이틀 컨테이너에 `pr-7 min-w-0` 및 `break-words` 적용으로 우측 상단 닫기(`X`) 버튼과 제목 겹침/이탈 방지.
  - 플랫폼 필터 바에 `flex-wrap min-w-0`을 적용하여 모바일에서 '네이버페이' 캡슐 버튼이 우측으로 잘리지 않고 자연스럽게 줄바꿈되도록 개선.
  - 내역 리스트 컨테이너 및 레코드 카드에 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 영역 `shrink-0` 적용.
- **관리자 페이지 및 소비 페이지 페이지네이션 모바일 반응형 개선 (`src/app/admin/page.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - `/admin` 공식 일정 및 게임 목록 페이지네이션 컨테이너를 `flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full`로 변경.
  - 내부 번호 버튼 크기를 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼을 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs`로 축소 최적화하여 좁은 모바일 화면에서도 좌우 여백을 벗어나지 않도록 처리.
  - `/dashboard/expenses` 지출 내역 탭 및 구독 탭 하단 페이지네이션 컨테이너에도 `flex-wrap justify-center` 적용.
- **소비 페이지 픽업별 과금 분석 & 순위 카드 모바일 우측 잘림 해결 (`src/app/dashboard/expenses/page.tsx`)**:
  - 페이지 최상위 컨테이너에 `w-full overflow-x-hidden`을 적용하여 모바일 가로 스크롤 및 쏠림 현상 원천 차단.
  - `게임 픽업별 과금 분석` 카드 내부 좌측 차트 영역(`lg:col-span-7`) 및 우측 순위 카드 영역(`lg:col-span-5`)에 `min-w-0 w-full overflow-hidden` 적용.
  - 픽업 순위 리스트 각 행 좌측 컨테이너를 `flex items-center gap-2 min-w-0 flex-1 overflow-hidden`으로 수정하여 긴 픽업 이름(예: "치사 + 유노 + 여우의 별자리") 및 `동시 픽업` 배지가 카드 우측 금액/비중 영역을 밀어내지 않고 자연스럽게 말줄임(`truncate`)되도록 개선.
- **지출 내역 테스트 KST 기준일 모킹 보강 (`src/app/dashboard/expenses/page.test.tsx`)**:
  - `sampleExpenses` 기준일(`2026-10-15`)로부터 7일 경과 시(`today > 2026-10-22`) 모든 항목이 과거 지출(`pastExpenses`)로 분류되어 테스트가 실패하던 현상을 해결하기 위해 `mockGetKstToday: vi.fn(() => "2026-10-15")` 고정 모킹 추가.
- **로드맵 문서 동기화 (`docs/to-do.md`)**:
  - Phase 12 하단 `12.11 모바일 화면 UI 오버플로우 해결` 완료 기록.
  - `## 향후 / 진행 로드맵 (Active & Planned Roadmap)` 섹션에 과제 4종(R1 완료, R2 GPT Codex 할당 예정, R3 대기, R4 장기 백로그) 신설.
- **검증 완료**:
  - Vitest 42개 파일, 260개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 페이지 export 성공.

## 2026-10-20 (모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선)

- **모바일 달력 타일 도트 컨테이너 세로 정렬 일원화 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 모바일 도트 컨테이너 클래스를 기존 가로 정렬(`flex md:hidden items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5`)에서 데스크톱과 일치하는 세로 정렬(`flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`)로 변경.
  - 모바일 타일 우측 상단에 버전(초록), 픽업(파랑), 콘텐츠(보라) 및 메모 도트가 수직 세로 방향으로 깔끔하게 배치되도록 최적화.
- **모바일 도트 컨테이너 단위 테스트 검증 보강 (`src/components/calendar/desktop-calendar.test.tsx`)**:
  - 모바일 도트 렌더링 단위 테스트에 도트 부모 컨테이너가 `flex-col`, `items-end`, `gap-1` 스타일 클래스를 정상적으로 보유하고 있는지 검증 단언문 추가.
- **검증 완료**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 export).

## 2026-10-20 (Google OAuth UI 피드백 및 콜백 페이지 다크 테마 카드 레이아웃 개선)

- **Google 로그인 버튼 로딩 피드백 강화 (`src/app/auth/page.tsx`, `src/app/auth/page.test.tsx`)**:
  - Google 로그인 버튼 클릭 후 대기(`loading === true`) 상태일 때 내부 SVG 로고 및 기본 텍스트 대신 `Loader2` 회전 스피너(`mr-2 h-5 w-5 animate-spin text-slate-900`)와 `"Google 연결 중..."` 텍스트를 노출하도록 개선하고 버튼 비활성화(`disabled={loading}`) 유지.
  - 단위 테스트에 Google 로그인 버튼 클릭 시 로딩 스피너, `"Google 연결 중..."` 텍스트 노출 및 버튼 `disabled` 비활성화 검증 케이스 추가.
- **콜백 페이지 다크 테마 및 카드 중앙 레이아웃 일원화 (`src/app/auth/callback/page.tsx`, `src/app/auth/callback/page.test.tsx`)**:
  - `/auth/callback` 컨테이너에 `data-theme="dark"`, `bg-app`, `text-content` 스타일을 적용하고 `@/components/ui/card`의 `Card`, `CardHeader`, `CardTitle`, `CardContent` 컴포넌트를 사용하여 로그인 화면과 완벽히 통일된 디자인 시스템 적용.
  - 인증 진행 중: `CardHeader`에 브랜드 타이틀("ChronoLedger") 및 서브카피("게임 일정과 지출을 한 곳에서 관리하세요.") 렌더링, `CardContent`에 `Loader2` 회전 스피너(`animate-spin text-primary`), `role="status"` 안내 문구("Google 인증을 확인하고 있습니다..."), 보조 문구("잠시 후 대시보드로 이동합니다.") 노출.
  - 에러 발생 시: `AlertCircle` 아이콘(`text-danger`), 에러 메시지(`role="alert" text-danger`), `<Button variant="outline" asChild><a href="/auth">로그인 화면으로 돌아가기</a></Button>` 구성.
  - 기존 셀렉터(`role="status"`, `role="alert"`, `a[href="/auth"]`) 및 기능 동작 100% 호환성 유지.
  - 단위 테스트에 `globalThis.IS_REACT_ACT_ENVIRONMENT = true` 설정 및 인증 진행 중 로딩 스피너(`.animate-spin`), 브랜드 타이틀, `role="status"` 텍스트 렌더링 검증 케이스 추가.
- **검증 완료**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 빌드(`npm run build`) 성공.

## 2026-10-19 (Google OAuth 로그인 버튼 디자인 개선 및 콜백 화면 디자인 시스템 통일)

- **Google OAuth 로그인 버튼 디자인 및 로딩 피드백 개선 (`src/app/auth/page.tsx`)**:
  - Google 공식 4색(Blue `#4285F4`, Green `#34A853`, Yellow `#FBBC05`, Red `#EA4335`) 'G' 멀티컬러 SVG 아이콘(`GoogleIcon`) 추가.
  - 로그인 진행 중 회전 스피너(`Loader2 animate-spin`) 및 `"Google 연결 중..."` 텍스트 노출과 버튼 비활성화(`disabled`) 적용으로 사용자 피드백 개선 및 중복 호출 차단.
- **OAuth 콜백 화면 디자인 시스템 통일 (`src/app/auth/callback/page.tsx`)**:
  - 기존 단순 텍스트 레이아웃을 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`) 및 `Card` 컴포넌트 기반으로 통일.
  - "ChronoLedger" 브랜드 헤더 및 안내 문구, 부드러운 회전 스피너(`Loader2`), 진행 메시지(`role="status"`), 에러 발생 시 경고 카드(`role="alert"`, `AlertCircle`) 및 [로그인 화면으로 돌아가기] 버튼 제공.
- **인증 화면 단위 테스트 보강 및 검증 (`src/app/auth/page.test.tsx`, `src/app/auth/callback/page.test.tsx`)**:
  - Google 공식 4색 멀티컬러 SVG 아이콘 렌더링 및 진행 중 로딩 스피너/"Google 연결 중..." 표시 단위 테스트 2건 추가.
  - 콜백 페이지 브랜드 타이틀, 로딩 스피너, `role="status"` 안내 문구 렌더링 단위 테스트 추가.
- **전체 단위 테스트 및 빌드 검증**:
  - Vitest 42개 파일, 259개 테스트 전체 통과 (에러 0건, 100% PASS), Next.js 14 프로덕션 정적 export 빌드 성공.

## 2026-10-19 (관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달 구현)

- **관리자 페이지 중복 네비게이션 배너 박스 제거 (`src/app/admin/page.tsx`, `src/app/admin/requests/page.tsx`)**:
  - `AdminLayout` 상단 헤더 탭([일정 관리] / [요청 관리])과의 중복을 해소하기 위해 `/admin` 및 `/admin/requests` 본문 상단에 위치하던 바로가기 배너 박스를 제거하여 UI 공간 활용도 및 시각적 정돈성 개선.
- **공식 일정 관리 [지난 일정] 팝업 다이얼로그 신규 구현 (`src/app/admin/page.tsx`)**:
  - 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘) 신설.
  - 클릭 시 `Dialog`가 열리며 KST 오늘 기준 만료된 과거 일정(`end_date < today`)을 Supabase `.lt("end_date", today).order("end_date", { ascending: false })` 쿼리로 조회.
  - 모달 내 게임별 드롭다운 필터링, 검색어 실시간 필터링, 8개 단위 페이지네이션(`PAST_SCHEDULES_PER_PAGE = 8`) 지원.
  - 지난 일정 카드별 [수정] 및 [삭제] 기능 지원: 기존 일정 등록/수정 모달 및 삭제 확인 모달과 유기적으로 연동(`returnToPastModal` 제어 플래그를 통해 수정/삭제 완료 또는 취소 시 안전하게 지난 일정 모달로 복귀하고 목록을 자동 갱신).
- **관리자 페이지 단위 테스트 보강 및 검증 (`src/app/admin/page.test.tsx`)**:
  - `createQueryBuilder` 내 `lt` 모의 메서드 지원 추가.
  - [지난 일정] 버튼 클릭 시 모달 열림, `.lt("end_date", today)` 쿼리 호출, 모달 내 게임 필터 및 검색 동작 검증 단위 테스트 추가.
  - 지난 일정 모달에서 [수정] 클릭 시 수정 폼 연동 및 수정 저장 검증 단위 테스트 추가.
  - 지난 일정 모달에서 [삭제] 클릭 시 삭제 확인 모달 연동 및 삭제 실행 검증 단위 테스트 추가.
- **전체 단위 테스트 및 빌드 검증**:
  - Vitest 42개 파일, 256개 테스트 전체 통과 (에러 0건, 100% PASS), Next.js 14 프로덕션 빌드 성공.

## 2026-10-19 (관리자 공식 일정 목록 만료 일정 표시 제외 및 필터링 강화)

- **공식 일정 관리 목록 KST 오늘 기준 만료 일정(`end_date < today`) 제외 (`src/app/admin/page.tsx`)**:
  - `fetchSchedules`에서 `getKstToday`를 사용해 Supabase 쿼리에 `.gte("end_date", today)` 조건을 적용.
  - 응답 데이터에 대해 클라이언트 측 방어 필터(`.filter((s) => s.end_date >= today)`)를 적용하여 탭 배지 카운트, 게임 필터 카운트, 페이지네이션 및 목록에서 만료된 일정이 완전히 제외되도록 처리.
- **관리자 페이지 단위 테스트 갱신 및 검증 (`src/app/admin/page.test.tsx`)**:
  - `createQueryBuilder`에 `gte` 모킹 메서드 추가 및 `@/lib/dashboard-date`의 `getKstToday` 모킹 구성.
  - `end_date < today`인 만료 일정이 목록 및 카운트에서 제외되고 활성 일정만 표시되는지 검증하는 신규 단위 테스트 추가.
- **단위 테스트 및 타입 검증**:
  - TypeScript 컴파일 검증(`npx tsc --noEmit`) 0 errors, Vitest 42개 파일 253개 테스트 전체 통과 (100% PASS).

## 2026-10-19 (모바일 초소형 뷰포트(360px 이하) 달력 타일·배지 최적화 및 날짜 타일 터치 시 바텀시트 즉시 연동)

- **모바일 달력 타일 일정 유형별 컬러 도트 분리 표시 (`src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/desktop-calendar.test.tsx`)**:
  - 모바일(`< md`) 달력 타일 우측 상단 도트를 일정 시작일(`is_start_date`) 기준 유형별 색상(`VERSION`: 초록 `bg-success`, `PICKUP`: 파랑 `bg-primary`, `CONTENTS`: 보라 `bg-purple-500`) 및 메모 회색 점(`bg-content-muted`)으로 분리 렌더링하고 초소형 화면 간격(`gap-0.5 sm:gap-1`)을 최적화.
- **모바일 당일(Today) 타일 금색(`#EFBF04`) 테두리 강조 및 데스크톱 전용 `'오늘'` 배지 처리 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 360px 이하 초소형 뷰포트에서 두 자리 날짜 숫자와 `'오늘'` 배지 및 우측 도트가 겹치는 현상을 해결하기 위해 모바일(`< md`)에서는 오늘 타일 테두리만 금색(`max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`)으로 강조하고, `'오늘'` 텍스트 배지는 데스크톱(`hidden md:inline-flex`)에서만 노출하도록 개선.
- **모바일 달력 날짜 타일 터치 시 `'선택일 상세'` 바텀시트(`MobileDrawer`) 즉시 오픈 (`src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`)**:
  - `MobileDrawer`에 `open`, `onOpenChange` 제어 props를 추가하고, 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일 클릭 시 해당 날짜 선택과 동시에 바텀시트가 즉시 열리도록 연동(하단 `'선택일 상세'` 트리거 버튼도 유지).
- **초소형 뷰포트 게임 필터 팝오버 가로 넘침 방지 (`src/components/calendar/calendar-game-filter.tsx`)**:
  - 게임 필터 드롭다운 대화상자에 `max-w-[calc(100vw-2rem)]`을 추가하여 320px~360px 화면에서 가로 넘침 방지.
- **단위 테스트 및 빌드 검증**:
  - Vitest 42개 파일, 248개 테스트 전체 통과 (100% PASS), Next.js 14 정적 15개 페이지 빌드 성공.

## 2026-10-19 (대시보드 요약 카드 진행률, 100% 포인트 할인, 사이드바 드롭다운 탭 및 모바일 터치 개선)

- **요약 카드(Summary Card) 진행률 계산식 및 UI 개편 (`src/lib/budget-calculations.ts`, `src/app/dashboard/page.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`)**:
  - 당월 확정 지출(`status === "CONFIRMED"`) 합계를 구하는 `calculateConfirmedExpense` 함수 추가.
  - 진행률 계산식을 기존 월 예산 대비 비율에서 당월 전체 예상 지출 중 이미 결제 확정한 지출 비율(`confirmedExpense / expectedExpense * 100`)로 변경.
  - 프로그레스 바 하단 좌측 라벨을 `진행률 n%`로 변경하고, 우측에 잔여 예정 지출 금액(`Math.max(0, expectedExpense - confirmedExpense) + " 원"`)을 표시하도록 개선.
  - `DashboardPage`에서 `confirmedExpense`를 계산하여 `HeroSidebar`와 `MobileDrawer`에 동기화 전달.
- **포인트 할인 100% 허용(방식 A) 및 결제 플랫폼별 포인트 차감 동기화 (`src/components/expense/expense-modal.tsx`, `src/lib/payment-calculations.ts`)**:
  - `uiDiscount`를 총 원화 할인액으로 취급하고 `uPoints`는 차감 포인트 수량으로 취급하여, 정가 100% 할인(예: 5,000원 정가, 5,000원 할인, 250P 사용 $\to$ 실결제액 0원) 시 중복 차감 에러 없이 정상 결제 승인되도록 수정.
  - 결제 플랫폼(`GOOGLE_PLAY`, `GALAXY_STORE`)과 포인트 지갑을 1:1 강제 동기화하고 중복 드롭다운을 `disabled` 처리.
  - 결제 플랫폼 `OTHER`(`기타 (스토어 외)`) 선택 시 포인트 입력창 비활성화 및 0으로 즉시 초기화.
- **사이드바 카드 배치 순서 및 선택일 카드 드롭다운 탭 추가 (`src/components/calendar/hero-sidebar.tsx`)**:
  - 카드 배치 순서를 `1) 요약` $\to$ `2) 선택일 상세` $\to$ `3) 스토어 포인트`로 변경.
  - 선택일 카드 헤더 바로 아래에 `게임 일정` (기본값) / `지출 내역` / `메모` 드롭다운(`<select aria-label="선택일 상세 항목 선택">`)을 배치하여 선택된 항목 1개만 본문에 렌더링하도록 탭 UI 개편.
- **모바일 바텀시트(`MobileDrawer`) 제스처 간섭 해결 및 반응형 최적화 (`src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/components/calendar/calendar-bg-customizer.tsx`)**:
  - 바텀시트 제스처 간섭 방지를 위해 인터랙티브 요소에 `data-vaul-no-drag` 속성 부여.
  - 메모 작성/수정 버튼 터치 영역 개선, 저장/취소 버튼에 `onPointerDown`/`onMouseDown` 이벤트 전파 방지 적용으로 키보드 blur 포커스 유실 차단.
  - `MobileDrawer`와 `HeroSidebar`에 `confirmedExpense`, `onIncomeAdded` props 완전 동기화.
  - `CalendarBgCustomizer` 모바일 뷰포트 대응 `max-w-[calc(100vw-2rem)]` 및 슬라이더 터치 영역 개선.
- **단위 테스트 및 빌드 검증**:
  - Vitest 42개 파일, 251개 테스트 전체 통과 (100% PASS), Next.js 14 프로덕션 빌드 성공.

## 2026-10-19 (5대 AI 모델 역할 분배 및 인수인계 문서 기반 자동 과제 실행·비상 인계 아키텍처 구축)

- **다중 모델 디스패치 보드(`Active AI Collaboration Dispatch Queue`) 및 `"인수인계 문서를 확인해"` 자동 실행 프로토콜 도입 (`docs/handoff.md`, `.agents/rules/handoff.md`, `md/SKILL.md`, `.github/copilot-instructions.md`)**:
  - **5대 AI 모델 역할 및 Fallback 체인 정립**:
    - **Gemini 4 Argon** (주축 Orchestrator & Architect, 대체: Claude Opus 5.5 / GitHub Copilot)
    - **GPT Codex** (Core Algorithmic Maker & Test Engineer, 대체: Claude Opus 5.5 / GitHub Copilot)
    - **Claude Opus 5.5** (Primary Static Reviewer & Complex Maker, 대체: Gemini 4 Argon / GitHub Copilot)
    - **GitHub Copilot** (Workspace General Maker & 전천후 Fallback Hub, 대체: Gemini 3.8 Flash / GPT Codex)
    - **Gemini 3.8 Flash** (Fast UI Maker & Research Subagent, 대체: GitHub Copilot / Gemini 4 Argon)
  - **`"인수인계 문서를 확인해"` 단일 프롬프트 실행 프로토콜**: 사용자가 어떤 모델에서든 해당 프롬프트를 입력하면 루트 `docs/handoff.md` 최상단 큐에서 `⚠️ HANDOVER_NEEDED`(1순위) 또는 `▶ READY`(2순위) 상태인 과제를 즉시 식별하여 지정된 `.worktrees/<run_id>`(또는 `main`)에서 이행하고, 완료 시 `✅ DONE` 및 다음 단계 `▶ READY`로 배턴을 넘기도록 규칙화.
  - **토큰/컨텍스트 소진 대비 2중 안전장치**:
    - 사전 감지 시 `⚠️ HANDOVER_NEEDED` 상태 전환 및 담당 모델 칸에 대체 모델 표기 + `중단 체크포인트` 작성.
    - API 쿼터 초과로 인한 강제 중단(Hard Cutoff) 시 대체 모델이 대상 Worktree의 `git status --short`와 `git diff`를 자동 스캔하여 미커밋 작업을 이어받는 복구 절차 내장.
- **협업 스킬 프로필 및 아키텍처 문서 동기화 (`.agents/skills/chronoledger-*/SKILL.md`, `docs/architecture.md`)**:
  - Orchestrator의 Worktree 선생성(`New-CollaborationRun.ps1`) 후 루트 `docs/handoff.md` 큐 기록 순서와 Maker/Reviewer의 상태 전이 규칙 반영.

## 2026-10-19 (캘린더 날짜별 개인 메모 저장 실패 결함 해결 및 UNIQUE 제약조건 마이그레이션)

- **개인 메모(personal_memos) 저장 실패 원인 해결 (`src/app/dashboard/page.tsx`, `src/components/calendar/hero-sidebar.tsx`)**:

  - 기존 `handleSaveMemo`에서 Supabase의 `.upsert(..., { onConflict: "user_id,memo_date" })`를 호출하고 있었으나, 데이터베이스의 `personal_memos` 테이블에 `(user_id, memo_date)`에 대한 `UNIQUE` 제약조건(또는 인덱스)이 생성되어 있지 않아 PostgreSQL의 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 오류가 발생하며 저장이 실패하던 문제를 해결.
  - DB 제약조건 유무와 무관하게 100% 안전하게 동작하도록 `existingMemo` 존재 여부에 따라 명시적인 `update` / `insert` / `delete`(빈 내용 입력 시) 분기 로직으로 개편.
  - `personal_memos` 조회 쿼리에 `id` 컬럼을 포함하고 `MemoRow` 타입에 `id?: string`을 추가하여 정확한 레코드 식별 및 업데이트 보장.
  - 저장 요청 직후 `setMemos`를 통한 낙관적 로컬 상태 반영으로 딜레이 없이 캘린더 타일의 메모 인디케이터 도트(`day.hasMemo`)와 사이드바 텍스트가 즉각 동기화되도록 개선.
  - `HeroSidebar`의 `handleSave`에 `try...catch` 예외 처리를 추가하여 저장 실패 시 침묵하지 않고 사용자에게 명확한 alert 알림을 제공하도록 안전망 구축.
- **데이터베이스 스키마 및 마이그레이션 SQL 스크립트 제공 (`md/SCHEMA.sql`, `md/MIGRATION_MEMO_UNIQUE.sql`)**:
  - `md/SCHEMA.sql`: `personal_memos` 테이블 정의에 `CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)` 추가.
  - `md/MIGRATION_MEMO_UNIQUE.sql` 신규 작성: 기존 DB에 중복 저장된 이력이 있을 경우 가장 최근 작성된 메모만 유지하고 중복을 정리한 뒤 `uq_personal_memos_user_date` 유니크 제약조건을 안전하게 부여하는 멱등성 보장 마이그레이션 DDL 스크립트 작성.
- **단위 테스트 및 빌드 무결점 검증**:
  - Vitest 42개 파일 241개 테스트 전체 통과 (100% PASS), Next.js 14 정적 15개 페이지 export 빌드 성공.

## 2026-10-19 (캘린더 날짜 타일 내 당일(Today) 표기 배지 추가)

- **당일(Today) 타일 식별 '오늘' 골드 배지 추가 (`src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
  - 캘린더 날짜 타일에서 오늘 날짜(`isToday`)인 경우 날짜 표기(ex. 17) 바로 오른쪽에 사용자가 지정한 골드 색상(`backgroundColor: #EFBF04`, `color: #0F1115`)의 **`오늘`** 배지를 표시하도록 구현.
  - 다크 테마, 라이트 테마, 커스텀 배경 일러스트 어디서든 명확한 시인성을 확보하도록 `drop-shadow-sm` 및 아담한 패딩(`px-1 py-[1px] text-[8px] md:text-[9px]`)을 적용하여 우측의 게임 아이콘이나 모바일 도트와 간섭 없이 정돈된 레이아웃 유지.
  - `DesktopCalendarProps`에 `todayDate?: string`을 추가하고 `DesktopCalendarDay`에 `isToday?: boolean`을 지원하여 테스트 및 컴포넌트 유연성 확보.
- **단위 테스트 및 빌드 검증**:
  - `src/components/calendar/desktop-calendar.test.tsx`: 당일 타일에 `#EFBF04` 색상의 `오늘` 배지가 날짜 숫자 바로 오른쪽에 정상 렌더링되고, 타일 날짜가 오늘이 아닌 경우 배지가 렌더링되지 않음을 검증하는 단위 테스트 추가 (6개 PASS).
  - Vitest 42개 파일 241개 테스트 전체 통과 및 Next.js 14 정적 export 빌드 성공.

## 2026-10-18 (캘린더 커스텀 배경 시인성 대폭 개선: 글래스모피즘 타일, 날짜 타일 투명도(0~90%) 및 배경 투명도(10~90%) 개별 조절, 텍스트·배지 가독성 섀도우 보강)

- **날짜 타일 투명도(`tileOpacity`, 0% ~ 90%) 개별 조절 기능 추가 (`src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
  - 사용자가 배경 일러스트 노출 정도와 달력 타일 가독성 사이의 균형을 직접 세밀하게 맞출 수 있도록 **`[날짜 타일 투명도]` 슬라이더(`0% ~ 90%`, 기본값 `15%`)**를 추가하고 IndexedDB(`CalendarBgRecord.tileOpacity`)에 영구 저장·복원·초기화하도록 구현.
  - `0%`(`투명하게`)로 설정 시 타일 배경색 및 미세 블러(`backdrop-blur`)가 완전히 제거되어 테두리와 텍스트/아이콘/배지만 남고 배경 일러스트가 100% 투과되며, 값을 높일수록(`진하게`, 최대 `90%`) 타일 배경(`rgb(var(--surface) / ratio)`)이 진해져 가독성을 높일 수 있음.
- **캘린더 커스텀 배경 일러스트 시인성 극대화 및 직전 작업 정합성 보완 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 기존 42개 날짜 타일의 `bg-app/75`(75% 불투명) 및 배경 오버레이 `bg-surface/40`로 인해 업로드한 배경 일러스트가 짙은 타일 배경에 가려져 흐릿하게 보이던 문제를 근본적으로 해결.
  - 가독성 보호 오버레이 강도를 `bg-surface/40` $\to$ `bg-surface/15`로 완화하여 일러스트 본연의 색감과 디테일을 보존.
  - 직전 작업 점검 및 보완:
    - 타일 호버 시 인라인 배경색(`style.backgroundColor`)과 충돌하지 않도록 `hover:ring-1 hover:ring-primary/30 hover:border-line`으로 호버 피드백 개선.
    - 커스텀 배경 활성화 시 이전/다음 달 날짜(`!day.inCurrentMonth`)의 `text-content-muted` 색상이 `text-content`로 덮어써지던 문제를 수정하여 당월/타월 날짜 구분성 유지.
    - `DesktopCalendar`의 기본 투명도 폴백값을 `DEFAULT_CALENDAR_BG_SETTINGS.opacity`(`40`)로 일치시키고, `CalendarBgCustomizer`의 미정의 클래스(`hover:bg-surface-1`)를 디자인 토큰(`hover:bg-surface`)으로 정정.
- **배경 투명도 상한선 90%로 확대 및 원본 업로드 허용 크기 50MB로 확대 (`src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`)**:
  - 일러스트를 더 선명하게 감상하고 싶어 하는 사용자 니즈를 반영하여 배경 투명도 슬라이더 상한선을 기존 60%에서 **최대 90%**로 확대 (`MAX_BG_OPACITY = 90`, `clampBgOpacity`: 10 ~ 90%).
  - 고해상도(4K/8K 등) 대용량 원본 일러스트(15MB 초과) 업로드 시 거절되지 않고 브라우저에서 정상적으로 리사이징 및 WebP 압축을 거칠 수 있도록 업로드 허용 한도를 기존 15MB에서 **최대 50MB**(`MAX_INPUT_FILE_SIZE = 50MB`)로 대폭 확대.
  - 초기 기본 배경 투명도를 30%에서 **40%**(`DEFAULT_BG_OPACITY = 40`)로 상향 조정.
- **텍스트 및 일정 배지 가독성 강화 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 일러스트가 밝거나 복잡한 경우에도 날짜와 일정이 묻히지 않도록 텍스트 섀도우 및 외곽 테두리 대비를 부여:
    - 날짜 숫자: `drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] font-bold` 적용으로 밝은 배경에서도 선명한 시인성 확보.
    - 요일 헤더: `drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-medium` 적용.
    - 일정 배지(`VERSION`, `PICKUP`, `CONTENTS`): 배지 컨테이너에 `drop-shadow-sm`을 부여하여 배경과의 층위 분리.
    - 게임 아이콘 래퍼 및 모바일 인디케이터 도트: `ring-1 ring-background/60 shadow-sm` 대비 테두리를 추가하여 배경 위에서 또렷하게 인식되도록 보강.
- **단위 테스트 및 프로덕션 빌드 검증**:
  - `src/lib/calendar-bg-storage.test.ts`: 배경 투명도(10~90%) 및 날짜 타일 투명도(0~90%) 클램핑·영구 저장 테스트 (6개 PASS).
  - `src/components/calendar/calendar-bg-customizer.test.tsx`: 배경 투명도 및 날짜 타일 투명도 슬라이더 조작 검증 (1개 PASS).
  - `src/components/calendar/desktop-calendar.test.tsx`: 배경 레이어 및 날짜 타일 투명도 스타일(`rgb(var(--surface) / 0.35)`) 렌더링 검증 (5개 PASS).
  - `src/app/dashboard/expenses/page.test.tsx`: 픽업 지출 날짜 픽스처 최신화 (16개 PASS).
  - Vitest 42개 파일 240개 테스트 100% 통과, Next.js 14 정적 export 빌드 15개 페이지 0 에러 통과.

## 2026-10-17 (캘린더 커스텀 배경 이미지 업로드·투명도/블러 조절 구현, 사용자 지정 게임 아이콘 전역 적용 및 픽업 그래프 다중 색상 적용)

- **캘린더 커스텀 배경 이미지 업로드 및 투명도/블러 조절 기능 구현 (Phase 12.3, `src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`)**:
  - **로컬 저장소(IndexedDB) 영구 보관 (`src/lib/calendar-bg-storage.ts`)**: 서버 트래픽 및 DB 스토리지 부담을 원천 차단하기 위해 브라우저 `IndexedDB`(`chronoledger_calendar_bg` / `backgrounds` 스토어, 인메모리 폴백 포함)에 사용자별(`calendar_bg_{userId}`) 이미지 `Blob`, 투명도(`opacity`), 블러 단계(`blur`)를 영구 저장·복원·초기화하도록 구현.
  - **Canvas 비율 유지 리사이징 및 WebP 압축 (`compressCalendarBgImage`)**: 최대 15MB 이하의 PNG/JPG/JPEG/WebP 원본 이미지를 입력받아 최대 `1920×1080` 해상도 이내로 종횡비를 유지(`calculateScaledDimensions`)하여 리사이징한 뒤 `image/webp`(품질 0.82)로 압축.
  - **메인 캘린더 배경 레이어 및 가독성 보호 오버레이 (`src/components/calendar/desktop-calendar.tsx`)**: 캘린더 컨테이너 하단에 `object-fit: cover` 배경 이미지 레이어(`calendar-custom-bg-image`)와 반투명 가독성 보호 오버레이(`calendar-custom-bg-overlay`, `bg-surface/40`)를 결합하고, 커스텀 배경 활성화 시 날짜 타일을 반투명(`bg-app/75`)으로 전환하여 배경이 자연스럽게 비치면서도 날짜·아이콘·배지(`VERSION`/`PICKUP`/`CONTENTS`) 가독성을 유지.
  - **`[배경 커스텀 설정]` 컨트롤러 팝오버 (`src/components/calendar/calendar-bg-customizer.tsx`)**: 캘린더 상단 헤더에 `[배경 설정]` 버튼을 배치하고 이미지 업로드/변경, 투명도 슬라이더(**10% ~ 60% 상한 제한** `clampBgOpacity`), 블러 효과 단계 토글(**Off / 약함 `4px` / 보통 `8px`**), `[기본 배경 초기화]` 버튼 제공.
- **사용자 지정 게임 아이콘(Custom Game Icon) 달력 및 소비 페이지 전역 적용 (`src/lib/storage-upload.ts`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 기존 `/dashboard/games`에서만 표시되던 사용자 지정 게임 아이콘(`downloadUserIcon`)이 대시보드 달력 타일(`/dashboard`) 및 소비 페이지(`/dashboard/expenses`) 전반에서 기본 아이콘(`default_icon_url`)보다 우선 표시되도록 개선.
  - `src/app/dashboard/page.tsx`: 구독 게임 및 지출 연결 게임들에 대해 `downloadUserIcon`으로 커스텀 아이콘 URL을 병렬 로드(`gameIcons`)하여 캘린더 날짜 타일(`dayIcons`), 선택일 사이드바 일정/지출 목록, 게임 필터 버튼에 우선 반영.
  - `src/app/dashboard/expenses/page.tsx`: 지출 내역 및 정기 구독 템플릿에 연결된 게임들의 커스텀 아이콘을 로드하여 데스크톱 지출 테이블, 모바일 지출 카드 우측 배경, 정기 구독 카드 아이콘에 우선 반영 (`default_icon_url`이 없는 커스텀 아이콘 전용 게임도 정상 노출).
  - `src/lib/storage-upload.ts`: 인메모리 `userIconCache` 활용 및 `supabase.storage` 미정의 환경(단위 테스트 모킹 등) 안전 가드 추가.
- **게임 픽업별 과금 분석 그래프 다중 컬러 팔레트 적용 (`src/app/dashboard/expenses/page.tsx`)**:
  - 모든 픽업 배너 막대가 단일 인디고(`#6366F1`) 색상으로만 표시되어 배너 간 구분이 어렵던 문제를 해결하기 위해 8색 다중 컬러 팔레트(`PICKUP_CHART_PALETTE`: Indigo, Emerald, Amber, Pink, Cyan, Violet, Orange, Teal) 적용 (`일반` 지출은 슬레이트 컬러 유지).
  - 우측 `픽업 과금 순위` 리스트의 각 항목에도 차트 막대와 동일한 색상의 원형 도트 인디케이터(`pickup-color-dot-*`)를 함께 표시하여 직관적인 시각적 매칭 제공.
- **단위 테스트 및 프로덕션 빌드 검증**:
  - `src/lib/calendar-bg-storage.test.ts` (5개 테스트), `src/components/calendar/calendar-bg-customizer.test.tsx` (1개 테스트), `src/components/calendar/desktop-calendar.test.tsx` (배경 레이어/오버레이 테스트 추가) 신설 및 갱신.
  - `src/app/dashboard/page.test.tsx`: 사용자 지정 게임 아이콘 우선 렌더링 검증 테스트 추가.
  - `src/app/dashboard/expenses/page.test.tsx`: 지출 목록/정기 구독 커스텀 아이콘 우선 표시 및 픽업 과금 분석 다중 팔레트 색상 할당 테스트 추가.
  - Vitest 42개 파일 239개 테스트 100% 통과, Next.js 14 정적 export 빌드 15개 페이지 0 에러 통과.

## 2026-10-15 (누적 충전형 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감 롤백 및 카드 배지 개선)

- **누적 충전형(`INTERVAL_30`) 구독 조기 결제 시 잔여일수 누적 연장 및 환불 시 차감(롤백) 로직 구현 (`src/lib/subscription-sync.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`)**:
  - 결제 시 잔여일수 보존: 예정일보다 이른 시점에 결제를 확정할 경우 기존 예정일($D_{orig\_target}$)에 충전 기간(`interval_days`, 기본 30일)을 가산($D_{next} = D_{orig\_target} + 30\text{일}$)하여 누적 잔여일수가 온전히 보존 연장되도록 구현.
  - **환불 시 충전 일수 차감(롤백)**: 결제된 누적 충전형 지출을 환불(취소)할 경우, 해당 결제로 인해 연장되었던 다음 회차 예정(`PLANNED`) 지출의 `target_date`에서 충전했던 일수(`interval_days`, 기본 30일)를 정확히 차감(`calculateRollbackIntervalTargetDate`, `rollbackIntervalSubscriptionExpense`)하여 결제 전 원래 예정일로 완벽 원복.
  - 지출 상세/환불 모달(`ExpenseDetailModal`)에서 `refund_expense_payment` 성공 직후 `rollbackIntervalSubscriptionExpense`를 호출하도록 연동.
  - 소비 페이지(`src/app/dashboard/expenses/page.tsx`), 대시보드 페이지(`src/app/dashboard/page.tsx`), 만료 모달(`src/components/expense/overdue-planned-modal.tsx`)의 `payingExpense` 및 `detailExpense` 전달 인터페이스에 `template_id` 완벽 연동.
- **정기 구독 카드 잔여일수 배지 텍스트 간결화 (`src/app/dashboard/expenses/page.tsx`)**:
  - 누적 충전형 구독 카드의 `[누적 충전형 (n일)]` 배지 옆 `[남은 n일]` 표시를 `[n일]`로 변경.
- **단위 테스트 및 프로덕션 빌드 검증**:
  - `src/lib/subscription-sync.test.ts`: 조기 결제 누적 연장, 환불 시 예정일 롤백 차감, 중복 생성 방지 등 신규 테스트 추가 (18개 테스트 PASS).
  - `src/components/expense/expense-detail-modal.test.tsx`: 누적 충전형 지출 환불 시 차감 함수 호출 검증 테스트 추가 (9개 테스트 PASS).
  - `src/app/dashboard/expenses/page.test.tsx`: 누적 충전형 카드 `[n일]` 배지 표시 테스트 추가 (14개 테스트 PASS).
  - Vitest 40개 파일 229개 테스트 100% 통과, Next.js 14 정적 export 빌드 15개 페이지 0 에러 통과.

## 2026-10-14 (스토어 지갑·포인트 수동 보정 내역 조회 모달 구현)

- **스토어 지갑/포인트 수동 보정 내역(Audit Log) 뷰어 모달 신설 (`src/components/wallet/store-wallet-adjust-history-modal.tsx`)**:
  - `store_point_transactions` 테이블에서 `transaction_type = 'MANUAL_ADJUST'`인 레코드를 조회하여 사용자에게 제공.
  - 일시(YYYY-MM-DD HH:mm), 스토어/수단 배지(Google Play, Galaxy Store, 네이버페이), 변동 차액(+/-), 보정 후 잔액, 사유 메모 표시.
  - 플랫폼별 필터 탭(전체, Google Play, Galaxy Store, 네이버페이) 및 새로고침 지원.
  - **5개 기준 페이지네이션(`ITEMS_PER_PAGE = 5`, 이전/다음, 번호 내비게이션, 범위 안내) 구현**.
  - 빈 상태(Empty State) 일러스트 및 에러 시 재시도 안내 UI 제공.
- **스토어 지갑 위젯 모달 진입점 연동 (`src/components/wallet/store-wallet-widget.tsx`)**:
  - `지갑 잔액 수동 보정` 헤더 우측에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
- **단위 테스트 및 빌드 무결점 검증**:
  - `src/components/wallet/store-wallet-adjust-history-modal.test.tsx` 신설 (6개 테스트 통과, 페이지네이션 검증 포함).
  - `src/components/wallet/store-wallet-widget.test.tsx` 갱신 (모달 열기 테스트 추가).
  - Vitest 40개 파일 216개 단위 테스트 100% PASS.
  - TypeScript 에러 0건 및 Next.js 14 정적 export 빌드 성공.

## 2026-10-14 (버전 패스형 지출 옵션 및 연계 픽업 선택 드롭다운 구현, 모바일 달력 파란 점 시작일 정상화)

- **버전 패스형(결제 유예) 지출 옵션 및 연계 픽업 선택 드롭다운 구현 (`src/components/expense/expense-modal.tsx`)**:
  - 단발성 특정일 지출(기본값)과 버전 종료일까지 결제 유예가 가능한 기간형 버전 패스 지출을 분리 지원.
  - `matchingVersion`이 존재하는 게임 선택 시 `[✓] 버전 패스형 (버전 종료일까지 결제 유예)` 체크박스 제공.
  - 체크 시 버전 기간(`matchingVersion.start_date ~ matchingVersion.end_date`)이 적용되며, 픽업 선택 드롭다운이 활성화되어 사용자가 원하는 픽업 배너(전반/후반/전체/선택 안 함)를 직접 선택하여 과금 분석에 매핑 가능.
  - 체크 해제 시 기존 특정일 지출(`start_date = target_date = end_date = paymentDate`)로 저장.
  - 편집 모드(`editingExpense`)에서 기존 기간형 지출(`start_date !== end_date`) 감지 시 체크박스 자동 활성화 및 픽업 상태 복원.
- **기간형(버전 패스) 미결제 지출의 마감일(`end_date`) 기준 예산 귀속 및 만료 판정 정합성 확립 (`src/lib/budget-calculations.ts`, `src/app/dashboard/expenses/page.tsx`)**:
  - `getBudgetDate`: 미결제(`PLANNED`) 기간형 지출은 마감일인 `end_date`가 속한 달의 예산에서 차감 대기하고, 결제 완료(`CONFIRMED`) 또는 특정일 지출은 `target_date` 기준으로 배정.
  - `findOverduePlannedExpenses`: 버전 패스 지출은 마감일인 `end_date`가 지나야 비로소 만료된 지출로 경고하도록 판정.
  - `getExpenseEffectiveDate`: 소비 페이지에서 미결제 기간형 지출의 활성 기간을 `end_date` + 7일로 유지.
- **모바일 달력 타일 파란색 일정 점(Dot) 시작일(`is_start_date`) 기준 노출 수정 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 기존 `day.schedules.length > 0`으로 인해 일정 진행 기간 내내 매일 파란 점이 찍히던 결함을 `day.schedules.some((s) => s.is_start_date)`로 변경하여 데스크톱 아이콘과 동일하게 시작일에만 파란 점이 노출되도록 정상화.
- **테스트 및 정적 빌드 무결점 검증**:
  - Vitest 39개 파일 209개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-14 (지출 결제일/예정일 수정 결함 및 버전 종료일 강제 고정 버그 해결)

- **예정 지출 등록/수정 시 `target_date` 버전 종료일(`end_date`) 강제 고정 버그 해결 (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 지출 등록 및 수정 시 `target_date: schedule?.end_date ?? input.paymentDate`로 하드코딩되어 있어, 버전 일정이 연결된 게임의 경우 사용자가 지정한 결제일/예정일(예: 전반부 픽업 시작일)이 완전히 무시되고 버전 종료일(예: 3주 뒤)로 강제 저장되던 문제 해결.
  - 조치: `target_date: input.paymentDate`로 정상화하여 사용자가 입력한 날짜 그대로 예정일/결제일이 지정되도록 수정. 픽업 기간과 지출 예정일이 불일치하던 데이터 모순을 원천 해소.
  - 라벨 개선: 모드에 따라 `지출 예정일` / `결제일` / `결제일 / 예정일`로 명확히 분기 표시.
- **예정 지출 결제 확정 시 카테고리 및 게임 ID 하드코딩 리셋 방어 (`src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 원인: 예정 지출의 [확정] 결제 진행 시 `ExpenseModal` 내부에서 카테고리가 무조건 `"게임"`으로 하드코딩되고 `gameId`가 `""`로 초기화되어, 등록해 둔 연관 게임 및 카테고리가 유실되던 현상 해소.
  - 조치: `PlannedExpenseInput` 인터페이스에 `category`, `game_id`, `target_date`를 포함하고, 결제 모달 오픈 시 원본 예정 지출의 카테고리, 게임 ID, 지출일을 온전히 보존·복원하도록 개선.
- **사이드바 지출 결제수단 영문 코드(`NAVER_PAY` 등) 한글 시맨틱 라벨 표기 (`src/components/calendar/hero-sidebar.tsx`)**:
  - 원인: 대시보드 히어로 사이드바 지출 목록에서 네이버페이 결제건이 `NAVER_PAY` 영문 코드로 그대로 노출되던 미비점 해소.
  - 조치: `METHOD_LABELS` 객체를 도입하여 `네이버페이`, `내 지갑` 등으로 한글 정규화 표시.
- **확정 지출(`CONFIRMED`) 결제일(`target_date`) 수정 지원 (`src/components/expense/expense-detail-modal.tsx`, `md/MIGRATION_EXPENSE_EDIT.sql`, `md/SCHEMA.sql`)**:
  - 기존에는 결제 완료 건의 [정보 수정]에서 제목, 카테고리, 메모만 수정 가능하여 결제일을 변경할 수 없던 제약 해소.
  - `update_confirmed_expense_metadata` RPC에 `p_target_date DATE DEFAULT NULL` 파라미터 및 미래 날짜 방어 가드 추가.
  - `ExpenseDetailModal`에 결제일(`editDate`) 입력 폼을 신설하여 결제 완료된 지출의 날짜도 자유롭게 보정 가능하도록 개선.
- **특정일 지정 지출 원칙 확립 (`start_date = target_date = end_date = input.paymentDate`) (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 지출 등록 시 게임이 연결되면 게임 버전 일정의 시작일/종료일이 지출의 `start_date`, `end_date`로 복사되어, 단일 지출임에도 6주짜리 기간형 지출처럼 취급되던 문제 원천 해소.
  - 조치: 특정일 지정 지출은 `start_date = target_date = end_date = input.paymentDate`로 단일일 일치화. 게임 버전 일정 및 픽업 일정은 각각 `schedule_id`와 `pickup_schedule_id` 외래키로만 연결되도록 분리.
  - 예정 지출 수정 모드(`EDIT_PLAN`)에서도 버전 변경 시 `schedule_id`가 올바르게 업데이트되도록 보강.
- **예산 귀속 및 만료 판정 기준을 지출 예정일(`target_date`)로 통일 (`src/lib/budget-calculations.ts`)**:
  - 원인: `getBudgetDate`에서 `expense.end_date`를 우선 반환하여, 10월 14일 픽업 예정 지출이 11월 19일 버전 종료일 예산으로 넘어가고 기한 지난 팝업도 11월 19일까지 뜨지 않던 왜곡 해소.
  - 조치: 사용자가 지정한 `target_date`를 예산 배정 및 만료 판정 기준으로 완전 일원화.
- **지출 목록 정렬 및 과거 기록 분리 기준일 정상화 (`src/app/dashboard/expenses/page.tsx`)**:
  - `getExpenseEffectiveDate`가 버전 `end_date` 대신 `target_date`를 반환하도록 수정하여 테이블 정렬 순서 및 7일 경과 과거 기록 분리가 실제 지출 예정일과 일치하도록 개선.
- **테스트 무결점 검증**:
  - 예정 지출 등록/수정 시 `start_date`, `end_date`가 `target_date`와 동일하게 저장되는지 검증 (`src/components/expense/expense-modal.test.tsx`).
  - `target_date` 기준 월 귀속 단위 테스트 갱신 (`src/lib/budget-calculations.test.ts`).
  - Vitest 39개 파일 206개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-14 (지출 등록 모달 항목명 원복 버그 수정 및 Recharts 차트 Y축 라이트 모드 가독성 개선)

- **지출 등록 모달(`ExpenseModal`) 항목명 자동 리셋 및 원복 버그 해결 (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 일정 연동 `useEffect`의 의존성 배열에 `title`이 포함되어 있어, 사용자가 항목명을 수정하려고 전체 삭제하거나 백스페이스를 누를 때(`!title.trim()` 조건 충족) 이펙트가 재실행되며 Supabase 비동기 조회 후 게임 버전 일정 제목(`${game.name} ${matched.title}`)으로 강제 덮어쓰기되던 결함 해소.
  - 조치:
    - `title`을 이펙트 의존성 배열에서 제외하고 `titleRef`로 최신 상태를 참조하도록 분리.
    - `prevGameIdRef`를 신설하여 사용자가 게임 셀렉트박스를 직접 변경했을 때(`prevGameIdRef.current !== gameId`)에만 1회 기본값 제안이 동작하도록 제어.
    - 예정 지출 수정 모드(`isEditMode`) 및 예정 지출 결제 모드(`isPlannedPayment`)에서는 일정에 의한 항목명 덮어쓰기를 원천 방어하여 사용자의 수정 주도권 보장.
    - 모달 오픈 시 `editingExpense`와 `plannedExpense`의 ID를 정규화(`?? null`)하여 부모 리렌더링에 따른 폼 무한 리셋 방어.
  - 검증: 사용자가 항목명을 지우거나 새로 입력해도 원래 텍스트로 되돌아가지 않고 온전히 유지됨을 검증하는 단위 테스트 케이스 추가 (`src/components/expense/expense-modal.test.tsx`).
- **지출 분석 차트 Y축 카테고리 레이블 가독성 수정 (`src/app/dashboard/expenses/page.tsx`)**:
  - 원인: 픽업 과금 막대 차트의 `YAxis` 컴포넌트에 `tick={{ fill: "#F5F7FA" }}`가 하드코딩되어 라이트 테마의 흰색 배경 위에서 "일반" 등의 텍스트가 완전히 투명해져 보이지 않던 문제 해결.
  - 조치: `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip` 컴포넌트에 하드코딩된 HEX 컬러 대신 시맨틱 CSS 변수 `rgb(var(--text-primary))`, `rgb(var(--text-secondary))`, `rgb(var(--border))`, `rgb(var(--surface))`를 적용하여 라이트/다크 테마 모두에서 명확한 대비 확보.
- **라이트 테마 배경색 톤 개선 (테크니컬 슬레이트 쿨 그레이 도입, `src/app/globals.css`)**:
  - 기존의 백색에 가까웠던 라이트 테마 배경(`--bg`: `rgb(245, 247, 250)`)을 눈이 편안하고 차분한 테크니컬 슬레이트 쿨 그레이(`rgb(236, 240, 245)`, `#ECF0F5`)로 미세 톤다운.
  - 서브 표면(`--surface-2`: `rgb(243, 246, 250)`) 및 테두리(`--border`: `rgb(214, 221, 230)`)를 슬레이트 톤에 맞추어 재정렬.
  - 결과: 순백색 메인 카드(`--surface: #FFFFFF`)와의 명암 대비(Elevation)가 극대화되어 카드가 또렷하게 분리되고, 장시간 화면을 보아도 눈부심이 없는 20대 테크/게이밍 맞춤형 무드 연출.
- **테스트 및 정적 빌드 무결점 검증**:
  - Vitest 39개 파일 203개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (라이트 테마 전수 검증 및 UI 가독성·대비 전면 최적화)

- **라이트/다크 테마 시맨틱 컬러 토큰 전면 정합화**:
  - `tailwind.config.ts`의 `textColor: { white: token("text-primary") }` 설정으로 인해 유색 배경 버튼(`bg-primary`, `bg-emerald-600`, `bg-danger` 등) 위에 검정색 텍스트가 렌더링되던 시각적 결함을 해결하기 위해, 모든 유색 버튼 텍스트를 `text-primary-foreground`로 표준화.
  - 모달 대화상자(`expense-modal.tsx`, `expense-detail-modal.tsx`, `overdue-planned-modal.tsx`) 내 하드코딩된 다크 전용 클래스(`bg-gray-800`, `bg-gray-900`, `border-gray-700`, `text-white`)를 시맨틱 디자인 토큰(`border-line bg-surface text-content`, `bg-surface-2`)으로 전면 전환하여 라이트 테마에서 깔끔하고 높은 대비의 모달 UI 제공.
- **연한 파스텔 하드코딩 색상 및 WCAG 대비 취약 요소 제거**:
  - **콘텐츠 배너 (`schedule-banner.tsx`, `hero-sidebar.tsx`, `games/page.tsx`, `admin/page.tsx`)**: 흰색/연회색 타일 위에서 흐려지던 `text-purple-300`을 `text-purple-700 dark:text-purple-300` 및 시맨틱 배경으로 개선.
  - **픽업 통계 순위 뱃지 (`expenses/page.tsx`)**: 라이트 테마에서 글자가 사라지던 2위 은색 뱃지의 `text-slate-300`을 `text-slate-700 dark:text-slate-300`으로 수정하고, 1위(`text-amber-600 dark:text-amber-400`), 3위(`text-amber-700 dark:text-amber-500`)의 명도 대비 확보.
  - **지출 상태 뱃지 (`expenses/page.tsx`)**: 테이블 및 모바일 카드의 `CONFIRMED`/`PLANNED`/`CANCELLED` 뱃지에 밝은 파스텔 하드코딩 색상(`text-emerald-400`, `text-amber-400`, `text-red-400`) 대신 시맨틱 클래스 `text-success`, `text-warning`, `text-danger` 적용.
  - **스토어 이벤트 및 네이버페이 프리뷰 박스 (`expense-modal.tsx`)**: 어두운 인디고/에메랄드/로즈 박스를 `bg-primary/10 border-primary/30`, `bg-success/10 border-success/30`, `bg-danger/10 border-danger/30` 및 시맨틱 텍스트 토큰으로 일원화.
  - **인풋 및 라벨 폼 컴포넌트**: `selectClassName`, `inputClassName`, `labelClassName`을 `border-line-control bg-surface-2 text-content`, `text-content-secondary`로 표준화.
  - **상단바 로고 (`topbar.tsx`)**: 라이트 모드에서 번짐과 거친 테두리를 유발하던 `WebkitTextStroke: "1px black"` 인라인 스타일 제거.
- **단위 테스트 및 빌드 무결점 검증**:
  - Vitest 39개 파일 202개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (스토어 이벤트 적립률/포인트 수동 수정 및 지출 내역 분리 수정·취소 내역 필터링 구현)

- **스토어별 이벤트 포인트 적립 및 포인트 수동 수정 (`src/lib/payment-calculations.ts`, `src/components/expense/expense-modal.tsx`)**:
  - 프리셋 버튼을 배제하고 `부스트 배율: [ n ] 배`, `페이백률: [ n ] %` 숫자 입력란만 제공하여 원하는 값을 직접 기입하도록 UI 간소화.
  - 구글 플레이 부스트 n배(`기본 적립률 × n`) 및 갤럭시 스토어 n% 페이백(`실결제액 × n%`) 실효 적립률 및 포인트 계산 로직 구현 (`calculateStoreEventEarn`).
  - 자동 계산된 예상 적립 포인트를 사용자가 직접 수정할 수 있는 수동 수정 필드 및 `[자동 계산값 복원]` 버튼 제공.
  - 결제 시 `[구글 부스트: n배]`, `[갤스 페이백: n%]` 이벤트 태그가 메모에 보존되도록 자동 병합 처리 (`mergeEventMemo`).
- **확정 지출(`CONFIRMED`) 비회계 메타데이터 분리 수정 및 원장 불변성 보호 (`src/components/expense/expense-detail-modal.tsx`, `md/MIGRATION_EXPENSE_EDIT.sql`)**:
  - 회계 무결성 보장을 위해 결제 완료된 지출은 금액 및 결제수단 수정을 DB 차원에서 원천 차단.
  - 비회계 메타데이터(항목명, 카테고리, 메모) 전용 보안 정의자 RPC `update_confirmed_expense_metadata` 구현 및 연동.
  - 지출 상세 모달 내 `[정보 수정]` 모드를 신설하여 항목명, 카테고리, 메모를 즉시 수정 및 저장 가능.
- **예정 지출(`PLANNED`) 전면 정보 수정 지원 (`src/components/expense/expense-modal.tsx`)**:
  - 미결제 상태인 예정 지출에 대해 항목명, 정가, 날짜, 카테고리, 결제수단 등 모든 필드를 수정할 수 있는 `editingExpense` 모드 지원.
- **가계부 목록 취소 내역 숨기기 토글 필터 (`src/app/dashboard/expenses/page.tsx`)**:
  - 취소/환불로 쌓이는 내역을 화면에서 가려주는 `[✓] 취소 내역 숨기기` 토글 체크박스 신설 (기본값: 체크됨).
  - 지출 목록에서 `PLANNED` 지출의 `[수정]` 버튼 및 `CONFIRMED` 지출의 `[상세 / 수정]` 액션 버튼 신설.
- **DB RPC 마이그레이션 (`md/MIGRATION_STORE_EVENT_EARN.sql`, `md/MIGRATION_EXPENSE_EDIT.sql`, `md/SCHEMA.sql`)**:
  - `process_expense_payment`에 `p_custom_earned_points` 및 `p_memo` 지원 추가.
  - `update_confirmed_expense_metadata` RPC 함수 및 실행 권한 등록.
- **단위 테스트 및 빌드 검증**:
  - 단위 테스트 39개 파일 202개 전건 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (결제 수단 / 결제 플랫폼 / 할인 수단 정합성 리팩토링 및 0원 결제·복합 결제 지원)

- **결제 수단(Payment Method)과 결제 플랫폼(Platform) 및 할인 수단(Discount)의 명확한 역할 분리 (`src/lib/payment-calculations.ts`)**:
  - 실제 자산이 빠져나가는 실결제 수단(`PaymentMethod`)을 **'내 지갑'(`WALLET`, 메인 계좌 자산)**과 **'네이버페이'(`NAVER_PAY`, 머니 및 부족 시 자동 충전)** 2대로 명확히 정제.
  - 기존에 결제 수단으로 혼용되던 **'Google Play'**와 **'Galaxy Store'**를 결제가 발생하는 **결제 플랫폼(스토어)** 및 쿠폰/포인트 **할인 수단**으로 재정립.
  - 스토어 포인트 적립(`estimateEarnedPoints`) 기준을 결제 수단이 아닌 **결제 플랫폼(`PaymentPlatform`)** 기준으로 전면 수정하여, 실결제 수단으로 '내 지갑'이나 '네이버페이'를 사용하더라도 스토어 포인트가 공식 등급별 비율에 따라 정상 적립되도록 개선.
- **지출 등록 모달 2대 실결제 수단 통합 및 스토어 포인트 복합 결제 허용 (`src/components/expense/expense-modal.tsx`)**:
  - 결제 플랫폼(Google Play, Galaxy Store, 기타)과 무관하게 실제 결제 수단은 항상 **'내 지갑'** 또는 **'네이버페이'** 중 선택하도록 UI 일원화.
  - 네이버페이 결제 시 스토어 포인트(`usedPoints`) 비활성화 제약을 해제하여, 구글 플레이/갤럭시 스토어에서 포인트를 사용하고 남은 차액에 대해서만 네이버페이 머니 차감 및 10,000원 단위 자동 충전이 동작하도록 지원.
  - 스토어 포인트나 쿠폰으로 100% 전액 차감(실결제액 = 0원) 시, 자산 차감 및 네이버페이 충전액이 0원으로 안전하게 결제 확정되도록 안내 및 계산 로직 보강.
- **DB RPC 및 마이그레이션 스크립트 구축 (`md/MIGRATION_PAYMENT_REFINEMENT.sql`, `md/SCHEMA.sql`)**:
  - `process_expense_payment`: `p_payment_method`를 `WALLET`과 `NAVER_PAY`로 검증하며, 구버전 데이터는 실결제 수단 `WALLET`과 플랫폼 스토어로 안전하게 하위 호환 매핑. 네이버페이+스토어 포인트 복합 결제 에러 제약 해제 및 스토어 플랫폼 기준 포인트 적립 계산 로직 적용.
  - `refund_expense_payment`: 실결제액이 0원인 건의 결제 취소 시 불필요한 원장 기록 및 자산 복원을 방지하는 안전 가드 추가.
  - 기존 `expenses` 테이블 내 구버전 `GOOGLE_PLAY`/`GALAXY_STORE` 결제수단 데이터를 `point_platform` 보존 및 `payment_method = 'WALLET'`으로 정제하는 SQL 마이그레이션 제공.
- **지출 상세 모달 및 목록 표기 개선 (`src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 결제 상세 화면에 '결제 플랫폼'(Google Play / Galaxy Store) 항목을 신설하여 결제수단과 스토어를 분리 표시.
- **단위 테스트 및 빌드 검증**:
  - 플랫폼-수단 분리 테스트, 네이버페이와 스토어 포인트 복합 결제 테스트, 0원 결제 적립 방지 테스트 등 39개 파일 192개 테스트 전체 100% 통과 및 Next.js 14 정적 export 빌드 성공.

## 2026-10-13 (캘린더 타일 배너 하단 정렬 및 상향 적층 구조 개선)

- **달력 타일 내 배너 하단 고정 및 상향 적층 레이아웃 적용 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 타일 상단 우측에 게임 아이콘이 다수(2~3개) 위치할 때 상단 행 높이로 인해 아래쪽 배너(`CONTENTS` 등)가 잘리던 현상 해결.
  - 배너 컨테이너를 타일 하단 기준(`absolute bottom-1.5 left-1.5`)에 앵커링하여 최하단 배너가 타일 경계를 벗어나지 않도록 보장.
  - 기존 표시 우선순위 규칙(`VERSION` > `PICKUP` > `CONTENTS`)을 유지하면서, 신규 배너 추가 시 하단에 삽입되고 기존 배너가 위로 상향 적층(Lift)되는 구조 확립.
- **단위 테스트 보강 및 검증 (`src/components/calendar/desktop-calendar.test.tsx`)**:
  - 배너 컨테이너의 하단 앵커링 클래스(`absolute bottom-1.5 left-1.5`) 검증 테스트 추가 및 전체 테스트 191개 통과.

## 2026-10-13 (Cloudflare Pages 호스팅 환경 구축 및 계정 탈퇴 Supabase pg_cron / RPC 완전 이관)

- **Cloudflare Pages 정적 호스팅 자산 구축 (`.nvmrc`, `public/_headers`, `public/_redirects`)**:
  - Node.js 20 LTS 명시(`.nvmrc`), Cloudflare Pages 정적 캐시 최적화 및 보안 헤더(`public/_headers`) 설정.
- **Supabase Database pg_cron 탈퇴 워커 및 원자적 함수 (`md/MIGRATION_PG_CRON.sql`, `md/SCHEMA.sql`)**:
  - `purge_expired_account_deletion_requests` 함수를 통해 `storage.objects`(user-icons 버킷), 10개 개인 데이터 테이블, `auth.users`를 원자적으로 일괄 영구 삭제하는 로직 구현.
  - 5분 주기 `cron.schedule` 자동 등록 스크립트 작성으로 외부 서버리스 Cron 종속성 제거.
- **계정 탈퇴 API의 Supabase RPC 완전 통합 (`src/lib/account-deletion.ts`, `src/lib/account-deletion.test.ts`, `md/SCHEMA.sql`)**:
  - Netlify Functions 호출(`fetch`)을 제거하고 `request_account_deletion`, `get_account_deletion_status` RPC를 Supabase JS 클라이언트로 직접 호출하도록 리팩토링.
  - 불투명 SHA-256 토큰 생성 및 검증을 DB 내부에서 원자적으로 처리.
- **단위 테스트 및 정적 빌드 검증**:
  - 전체 단위 테스트 39개 파일, 191개 테스트 100% PASS (`vitest run`).
  - Next.js 14 정적 15개 페이지 export 빌드 성공 (`npm run build`).

## 2026-10-13 (지출 등록 모달 픽업 선택 필드 비활성화 및 결제일 기준 자동 연계 구현)

- **픽업 선택 필드 비활성화 및 자동 매핑 로직 적용 (`src/components/expense/expense-modal.tsx`)**:
  - `expense-pickup` select 필드를 비활성화(`disabled`, `opacity-60 cursor-not-allowed`)하여 수동 조작 방지.
  - 결제일(`paymentDate`)이 픽업 기간 내인 경우:
    - 1개 진행 중: 해당 픽업 배너로 자동 연계(`pickup_schedule_id` 저장).
    - 2개 이상 진행 중: 모든 배너에 자동 동시 연계(`[PICKUPS:id1,id2,...]` 메타데이터 바인딩 및 1건 1x 회계 처리).
  - 결제일이 픽업 기간 외인 경우:
    - '진행 중인 픽업 없음 (픽업 외 지출)'로 자동 매핑(`pickup_schedule_id = null`, `memo = null`).
- **테스트 추가 및 검증 (`src/components/expense/expense-modal.test.tsx`)**:
  - 필드 disabled 상태, 단일 픽업 자동 연계, 복수 픽업 동시 연계, 픽업 외 지출 자동 매핑 4개 케이스 전체 100% 통과 (총 190개 테스트 통과).

## 2026-10-13 (웹 배포 플랫폼 비교 분석 및 아키텍처 제안 갱신: Cloudflare Pages + Supabase pg_cron)

- **Netlify 무료 플랜 리소스 한계 분석 및 제안서 전면 리팩토링 (`docs/Netlify_Web_Architecture_Proposal.md`, `docs/to-do.md`)**:
  - Netlify 무료 티어의 월간 빌드 시간(300분) 및 대역폭(100GB) 소진 시 신규 배포 차단 및 사이트 자동 일시 정지(Hard Limit) 리스크 문서화.
  - 상단 요약과 하단 구버전 내용 간 불일치를 전면 해소하고, 문서를 **Cloudflare Pages + Supabase pg_cron** 중심으로 완전 재구성.
  - 구버전 2026-10-06 ~ 10-07 초기 이력은 부록(Archived History)으로 분리 격리.
  - 5분 주기 백그라운드 탈퇴 워커(`account-deletion-worker`)의 웹 호스팅 종속성을 해결하기 위한 구체적 5단계 이관 액션 플랜 수립.
- **배포 플랫폼 적합도 비교 평가 및 권장 아키텍처 수립**:
  - 프로젝트 특성(Next.js 14 `output: 'export'` 정적 빌드 + Supabase 백엔드)에 맞춰 4개 플랫폼 비교 평가:
    1. **Cloudflare Pages + Workers (95점, 최우선 권장)**: 대역폭 무제한 무료, 월 500회 빌드, 1분 단위 스케줄러 지원.
    2. **Vercel (88점)**: 월 6,000분 빌드, Next.js 최고 궁합, 단 무료 플랜 Cron 일 1회 제한.
    3. **Netlify (80점, 현행 유지)**: 세팅 불필요하나 월 300분/100GB 초과 시 사이트 중단 위험.
    4. **GitHub Pages (75점)**: 무료 정적 호스팅 우수하나 서버리스/스케줄러 미지원.
- **정적 웹과 백그라운드 스케줄러 분리 아키텍처 확립**:
  - 웹 프론트엔드(`out/`): **Cloudflare Pages**로 호스팅하여 트래픽/빌드 비용 걱정 없이 고가용성 유지.
  - 백그라운드 5분 주기 워커: Netlify Functions 대신 **Supabase Database 내부 `pg_cron`** 또는 **Supabase Edge Function**으로 분리 이관.
  - 향후 이관 및 검증 로드맵을 `docs/to-do.md` 구현 체크리스트에 반영.

## 2026-10-13 (소비 페이지 차트 시각적 품질 강화 및 호버 하이라이트 인터랙션 구현)

- **카테고리 도넛 차트 색상 대비 강화 및 호버 연동 (`src/app/dashboard/expenses/page.tsx`)**:
  - `CATEGORY_COLORS`에서 '게임'(`#6366F1`, 인디고)과 '정기 구독'(`#10B981`, 에메랄드)을 뚜렷하게 분리된 고대비 색상으로 개편.
  - 도넛 슬라이스 기본 테두리(`stroke="#171A21"`) 부여.
  - 마우스 호버 시 깔끔한 흰색 솔리드 테두리(`stroke="#FFFFFF"`, 두께 3px) 하이라이트 적용 (불필요한 드롭 섀도우 번짐 제거).
  - 하단 범례 카드와 원 그래프 슬라이스 간 마우스 호버 시 양방향 포커스 하이라이트 연동.
- **막대 그래프 축선(X/Y Axis Line), 눈금선 및 CartesianGrid 격자 복원, 배경 하이라이트 제거**:
  - 월별 소비 추이: X축/Y축 기준 축선(`stroke="#374151"`) 복원, 수평 점선 격자(`CartesianGrid vertical={false}`) 추가, 막대 테두리 및 호버 시 솔리드 흰색 외곽선 강조.
  - 게임 픽업별 과금 분석: 가로 막대 X축/Y축 기준선 복원, 수직 점선 격자(`CartesianGrid horizontal={false}`) 추가, 막대 테두리 및 우측 순위 카드와의 양방향 호버 하이라이트 연동.
  - 막대 그래프 호버 시 배경 영역 전체가 반투명 사각형으로 하이라이트되던 툴팁 커서(`Tooltip cursor={false}`) 및 드롭 섀도우 글로우를 완전히 제거하여 막대 외곽선만 또렷하게 표시.
- **테스트 및 검증**:
  - 단위 테스트 11건 100% 통과 (`vitest run src/app/dashboard/expenses/page.test.tsx`), TypeScript 및 Next.js 14 프로덕션 빌드 무결성 확인.

## 2026-10-13 (관리자 요청 페이지 직접 게임 추가 기능 및 [게임 등록] 버튼 구현)

- **관리자 직접 게임 추가 카드 UI (`src/app/admin/requests/page.tsx`)**:
  - `/admin/requests`의 "게임 요청" 탭 상단에 관리자가 유저 건의 승인 없이 즉시 새 게임을 마스터 카탈로그에 등록할 수 있는 카드 폼 추가.
  - 게임 이름, 기본 아이콘 URL 입력란 및 `[게임 등록]` 버튼 구현.
  - URL 유효성 검사, 필수 입력값 검증, 중복 등록 방어 에러 처리 및 성공 피드백 표시.
- **`admin_create_game` 보안 정의자 RPC 및 DB 스키마 갱신 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 관리자 권한 검증 및 게임 카탈로그 원자적 등록 함수 `admin_create_game` 추가 및 권한 부여.
- **단위 테스트 추가 (`src/app/admin/requests/page.test.tsx`)**:
  - 관리자가 입력란을 통해 게임 이름과 아이콘 URL을 입력하고 `[게임 등록]` 버튼을 클릭해 등록을 완료하는 플로우 검증 (총 163개 테스트 100% 통과).

## 2026-10-13 (정기 구독 템플릿 수정/삭제 기능 구현 및 카드 액션 버튼 레이아웃 개편)

- **정기 구독 템플릿 수정 기능 (`src/components/subscription/subscription-modal.tsx`)**:
  - `SubscriptionModal`에 `editingTemplate` prop 지원 추가.
  - 수정 시 제목, 카테고리, 연관 게임, 결제 주기 유형, 결제일/누적일수, 금액 등 기존 설정을 폼에 자동 바인딩.
  - 수정 완료 시 `subscription_templates.update()` 호출 및 미결제(`PLANNED`) 예정 회차의 기본 정보 자동 동기화.
- **정기 구독 템플릿 삭제 및 안전 정리 RPC 구현 (`src/app/dashboard/expenses/page.tsx`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 보안 정의자 RPC `delete_subscription_template(p_template_id UUID)` 및 RLS `Delete own templates` 정책 생성.
  - 템플릿 삭제 시 미래 미결제(`PLANNED`) 회차만 정리하고, 이미 결제된(`CONFIRMED`) 과거 지출 내역은 `template_id ON DELETE SET NULL`을 통해 안전하게 보존.
  - 삭제 전 확인 다이얼로그(`<Dialog>`)를 통해 안전한 삭제 절차 안내.
- **구독 카드 액션 버튼 레이아웃 개편 (`src/app/dashboard/expenses/page.tsx`)**:
  - 좌측 정렬: `[수정]`, `[남은 날짜 수정]` (누적 충전형일 때만 노출).
  - 우측 정렬: `[구독 중지/재개]`, `[휴지통 모양 아이콘]`(삭제).
- **단위 테스트 및 빌드 검증 (`src/components/subscription/subscription-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
  - 템플릿 수정 모달 데이터 로드/업데이트 및 삭제 다이얼로그/RPC 호출 검증 테스트 추가 (Vitest 162개 테스트 전체 PASS, Next.js 14 정적 빌드 통과).

## 2026-10-13 (소비 페이지 전체 지출 내역 10개 단위 페이지네이션 및 누적 충전형 주기 커스텀 지원)

- **전체 지출 내역 10개 단위 페이지네이션 구현 (`src/app/dashboard/expenses/page.tsx`)**:
  - 기존에 등록된 모든 지출 내역을 한 화면에 무제한 나열하던 방식에서 10개 단위(`EXPENSES_PER_PAGE = 10`) 페이지 분할 렌더링으로 개선.
  - 데스크톱 테이블 뷰와 모바일 카드 뷰 모두 현재 페이지 데이터(`paginatedExpenses`)만 렌더링하여 렌더링 성능 최적화 및 스크롤 피로도 해소.
  - 하단에 총 건수 및 현재 표시 범위(`총 N건 중 A - B건 표시 (페이지 X / Y)`), 이전/다음 버튼(`ChevronLeft`, `ChevronRight`), 스마트 번호 네비게이션(7페이지 초과 시 생략 부호 `...` 지원) UI 추가.
  - 내역 변경/삭제 시 페이지 범위를 초과하지 않도록 자동 클램핑 방어 로직 적용.
- **누적 충전형 정기 구독 결제 주기(`interval_days`) 커스텀 기능 (`src/components/subscription/subscription-modal.tsx`, `src/lib/subscription-sync.ts`)**:
  - '30일 누적 충전형'에서 '누적 충전형'으로 명칭 통일 및 결제 주기 일수(기본값 30일) 자유 입력 지원.
  - 다음 회차 자동 생성 시 템플릿의 `interval_days`만큼 목표일 누적 연장 처리.
  - DB 스키마 컬럼 미존재 시에도 무중단 동작하도록 프론트엔드 폴백 처리.
- **단위 테스트 보강 (`src/app/dashboard/expenses/page.test.tsx`, `src/lib/subscription-sync.test.ts`, `src/components/subscription/subscription-modal.test.tsx`)**:
  - 25개 지출 데이터 기준 10개 단위 페이지 분할 및 2페이지 이동/이전 복귀 검증 테스트 추가 (총 160개 테스트 100% 통과).

## 2026-10-13 (게임 버전 패스형/정기 구독 예정 지출 생성 실패 수정 및 버전 시작일 바인딩 개선)

- **PostgREST 부분 유니크 인덱스 충돌 에러(42P10) 해결 및 `insert` 전환 (`src/lib/subscription-sync.ts`)**:
  - `expenses` 테이블의 부분 유니크 인덱스(`idx_expenses_template_schedule_id`, `idx_expenses_template_billing_cycle`) 환경에서 PostgREST `.upsert(..., { onConflict })` 호출 시 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 오류로 저장이 차단되던 문제를 해결.
  - 클라이언트 인메모리 사전 중복 필터링 후 안전한 `.insert()` 호출 방식으로 전환하고 중복 키(`23505`) 예외를 무해하게 방어.
- **버전 패스형 결제 목표일(`target_date`) 시작일 바인딩 (`src/lib/subscription-sync.ts`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 기존에 버전 종료일(`s.end_date`)로 지정되던 `target_date`를 실제 패스 오픈 및 결제 시점인 버전 시작일(`s.start_date`)로 수정하여, 홈 대시보드 버전 시작일(예: 10월 15일) 클릭 시 지출 내역에 즉시 노출되도록 개선.
  - 관리자 일정 변경 트리거(`sync_version_expenses_trigger`)에서도 `VERSION` 일정 변경 시 `target_date = NEW.start_date`로 자동 동기화되도록 SQL 갱신.
- **소비 페이지 방문 시 지연 구독 자동 생성 연동 (`src/app/dashboard/expenses/page.tsx`)**:
  - `loadExpenses()` 실행 시 온라인 상태일 경우 `ensureMonthlySubscriptionExpenses`를 선행 호출하여, 기존에 생성되었으나 회차가 누락되었던 정기 구독 템플릿의 예정 지출이 페이지 진입 즉시 자동 보정 생성되도록 개선.
- **단위 테스트 무결성 갱신 (`src/lib/subscription-sync.test.ts`, `src/app/dashboard/expenses/page.test.tsx`)**:
  - `MONTHLY_DAY` 및 `VERSION_PASS` 테스트 mock을 `insert` 및 버전 시작일(`target_date: "2026-10-09"`) 기준으로 갱신 (Vitest 37개 파일 / 158개 테스트 100% PASS, Next.js 빌드 성공).

## 2026-10-13 (Alt+Tab/창 전환 시 모달 입력값 초기화 방지 및 백그라운드 재조회 스켈레톤 언마운트 차단)

- **소비 및 게임 페이지 백그라운드 재조회 시 스켈레톤 언마운트 차단 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`)**:
  - `hasLoadedInitialRef` 플래그를 도입하여 `if (isLoading && !hasLoadedInitialRef.current) return <Skeleton />` 형태로 최초 마운트 시에만 스켈레톤을 노출하고, 창 포커스 복귀(Alt+Tab)나 백그라운드 쿼리 재실행 시 페이지 전체가 스켈레톤으로 대체되어 모달이 언마운트되는 현상을 원천 차단.
  - 데이터 페칭 콜백(`loadExpenses`, `loadSubscriptions`, `loadGames`)의 의존성을 객체 레퍼런스(`user`)에서 원시 ID(`userId: user?.id`)로 변경하여 토큰 갱신 시 불필요한 재호출 방지.
- **모달 내부 폼 리셋 가드 (`src/components/subscription/subscription-modal.tsx`, `src/components/expense/expense-modal.tsx`)**:
  - `prevOpenRef`를 적용하여 모달이 닫힌 상태에서 새로 열리는 시점(`open && !prevOpenRef.current`)에만 폼을 초기화하도록 가드. 모달이 열려 있는 상태에서 부모 컴포넌트가 리렌더링되더라도 사용자가 입력해 둔 모든 값(제목, 게임, 금액, 결제 주기, 결제일 등)이 100% 보존되도록 개선.
- **인증 컨텍스트 사용자 레퍼런스 안정화 (`src/lib/auth-context.tsx`)**:
  - `onAuthStateChange`에서 `prevUser`와 `nextUser`의 `id`, `email`, `updated_at`이 동일한 경우 이전 레퍼런스를 유지하여 토큰 갱신 시 전역 컴포넌트 트리 리렌더링 전파 방지.
- **단위 테스트 검증 (`src/components/subscription/subscription-modal.test.tsx`)**:
  - 팝업이 열려 있는 상태에서 `useAuth` 사용자 객체 갱신 및 부모 리렌더링이 발생해도 입력한 내용이 초기화되지 않음을 검증하는 단위 테스트 추가 (총 158개 테스트 100% 통과).

## 2026-10-13 (페이지 로드 부드러움 향상 및 게임 아이콘 지연 로딩 최적화)

- **게임 아이콘 에셋 고효율 압축 최적화 (`public/assets/games/`)**:
  - `nikke.png`(430KB $\to$ 26KB, 94% 절감), `star_rail.png`(209KB $\to$ 18KB, 91% 절감), `genshin.png`(184KB $\to$ 14KB, 92% 절감) 3종을 256x256 WebP로 포맷 변환하여 다른 6개 아이콘(12KB~24KB)과 균등한 초경량화 달성.
- **PWA 서비스 워커 및 사전 로드 엔진 (`public/sw.js`, `src/lib/icon-preload.ts`)**:
  - `public/sw.js` 정적 캐시(`isStatic`) 판별 대상에 `/assets/` 및 `/fonts/` 추가, `PRECACHE_URLS`에 전체 게임 아이콘 등록 및 셸 캐시 v3 승격.
  - `src/lib/icon-preload.ts` 유틸리티 구현 및 대시보드/소비/게임 데이터 수신 시 백그라운드 선제적 이미지 사전 로드 연동.
- **게임 아이콘 컴포넌트 (`src/components/ui/game-icon.tsx`)**:
  - 이미지 로딩 중 스켈레톤 펄스, 로드 완료 시 `duration-200` 페이드인, 에러 시 Gamepad2 폴백 기능을 지원하는 재사용 컴포넌트 추가 및 캘린더, 게임 목록, 지출 테이블/템플릿에 적용.
- **스토리지 다운로드 인메모리 캐시 (`src/lib/storage-upload.ts`)**:
  - `downloadUserIcon`에 인메모리 Map 캐시 계층을 적용하여 반복 방문 시 다운로드 지연시간을 0ms로 단축하고 불필요한 404 실패 요청을 차단.
- **스켈레톤 UI 및 부드러운 페이지 전환 (`src/components/ui/skeleton.tsx`, `page-skeletons.tsx`, `src/app/dashboard/loading.tsx`)**:
  - 대시보드, 소비, 게임 화면의 단순 텍스트("불러오는 중...") 로딩을 실제 화면 뼈대와 일치하는 스켈레톤 레이아웃으로 전면 개편.
  - Next.js 서스펜스 라우트 전환용 `src/app/dashboard/loading.tsx` 추가 및 페이지 마운트 시 `animate-fade-in` CSS 애니메이션 적용.
- **종합 검증 무결성**:
  - Vitest 37개 파일 / 158개 테스트 전체 통과 (100% PASS), Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (정기 구독 모달 연관 게임 선택 및 버전 패스형 활성화 버그 수정)

- **정기 구독 모달(`SubscriptionModal`) 버전 패스형 활성화 및 카테고리 자동 동기화 (`src/components/subscription/subscription-modal.tsx`)**:
  - `CYCLE_TYPE_OPTIONS`의 `VERSION_PASS` 비활성화 조건(`disabled`)을 기존 고정 카테고리 검사(`category !== "게임"`)에서 연관 게임 미선택 검사(`!gameId`)로 교체하여, 연관 게임 선택 시 즉시 '게임 버전 패스형' 항목이 정상 활성화되도록 수정.
  - 연관 게임 선택(`handleGameChange`) 시 `category` 상태를 `'게임'`으로 자동 전환(해제 시 `'정기 구독'` 및 `cycleType` 자동 복구)하고, DB 저장(`subscription_templates.insert`) 시 `category`가 올바르게 반영되도록 보장.
- **버전 패스 지연 회차 생성 엔진 동기화 완화 (`src/lib/subscription-sync.ts`)**:
  - `ensureMonthlySubscriptionExpenses`에서 `VERSION_PASS` 템플릿 필터링 조건을 `t.cycle_type === "VERSION_PASS" && Boolean(t.game_id)`로 완화하여 `category` 값에 구애받지 않고 버전 연동 회차가 확실하게 생성되도록 방어 로직 강화.
- **단위 테스트 보강 (`src/components/subscription/subscription-modal.test.tsx`)**:
  - 연관 게임 미선택 시 버전 패스형 비활성화 확인, 게임 선택 후 즉각 활성화 및 카테고리 전환 확인, 버전 패스형 템플릿 저장 검증, 게임 선택 해제 시 `MONTHLY_DAY` 자동 복구 검증 등 단위 테스트 추가 (총 148개 테스트 100% 통과).

## 2026-10-13 (Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트)

- **모달 컴포넌트 모바일 패딩 최적화**:
  - `ExpenseModal`, `ExpenseDetailModal`, `SubscriptionModal`의 `DialogContent` 패딩을 `p-4 sm:p-6`으로 튜닝하여 좁은 화면에서의 가용 폼 영역 및 가독성 개선.
- **모바일 카드 뷰 뱃지 레이아웃 보강**:
  - `src/app/dashboard/expenses/page.tsx`: 타이틀 및 픽업 뱃지 컨테이너에 `flex-wrap`을 적용하여 좁은 뷰포트에서도 오버플로우 방지.
- **종합 회귀 검증 무결성**:
  - Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석)

- **DB 스키마 및 마이그레이션 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`)**:
  - `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 추가.
  - 픽업 지출 인덱스(`idx_expenses_pickup_schedule_id`) 생성.
  - 지출-일정 게임 일치 트리거 검증 함수(`validate_expense_references()`)에 픽업 일정 게임 검증 로직 추가.
  - TypeScript 데이터베이스 타입(Row, Insert, Update, Relationships)에 `pickup_schedule_id` 완벽 반영.
- **지출 모달 UI 픽업 바인딩 지원 (`src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`)**:
  - 카테고리가 '게임'이고 게임이 선택된 경우 결제일 기준 진행 중인 픽업 일정 목록을 `[픽업 선택 (선택 사항)]` 드롭다운으로 노출.
  - 지출 등록 시 `pickup_schedule_id` 저장 연동.
  - 지출 상세 모달에 연결된 픽업 타이틀(`pickupTitle`) 표시.
- **소비 화면 가챠/픽업 분석 통계 섹션 추가 (`src/app/dashboard/expenses/page.tsx`)**:
  - 확정(`CONFIRMED`) 지출 기준 픽업별 총 과금액 가로 막대 차트(`BarChart layout="vertical"`).
  - 픽업 과금 순위 랭킹 카드: 최다 과금 픽업 순위, 과금액, 비중(%), 건수 렌더링.
  - 픽업 미지정 과금은 `'버전 일반'`으로 명확히 분리 표기하여 100% 회계 정합성 보장.
  - 게임 선택 필터 드롭다운 연동.
  - 지출 목록 테이블 및 모바일 카드 내 `[픽업명]` 뱃지 렌더링.
- **검증 무결성**:
  - Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동)

- **결제 플랫폼 $\to$ 결제 수단 2단계 종속 선택 구조 (`src/components/expense/expense-modal.tsx`)**:
  - `PaymentPlatform` 타입(`GOOGLE_PLAY`, `GALAXY_STORE`, `OTHER`)을 신설하고 플랫폼에 따라 지원 결제 수단을 동적으로 필터링.
  - 카테고리(`게임` vs 일반) 변경 시 플랫폼 자동 동기화.
- **네이버페이 충전 프리뷰 및 원클릭 승인 플로우**:
  - `calculateNaverPayPayment` 엔진을 결제 모달에 연동하여 네이버페이 선택 시 부족액, 10,000원 단위 올림 충전액, 충전 후 예상 잔액 인라인 카드 렌더링.
  - 머니 부족 시 `[충전 후 결제]` 버튼으로 자동 전환 및 원클릭 트랜잭션 수행. 총 자산 부족 시 `[총 자산 부족]` 경고 및 비활성화.
  - 네이버페이 선택 시 사용 포인트 필드 비활성화 및 0P 리셋.
- **최종 실결제액 수동 오버라이드 지원**:
  - `최종 실결제액 (원)` 입력 필드를 추가하여 사용자가 원하는 금액으로 수동 수정 가능.
  - 수동 수정 시 차액을 할인 금액으로 자동 역산하여 DB 제약조건(`chk_expense_math`) 및 RPC 정합성 유지.
- **지출 상세 모달 친화적 라벨 및 환불 안내 (`src/components/expense/expense-detail-modal.tsx`)**:
  - 네이버페이 결제 건에 대한 친화적 라벨 표시 및 네이버페이 머니 전액 환불 안내 메시지 제공.
- **검증 무결성**:
  - Vitest 34개 파일 / 143개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-12 (Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현)

- **네이버페이 충전 및 결제 계산 엔진 모듈화 (`src/lib/naver-pay-calculations.ts`)**:
  - 부족액 발생 시 10,000원 단위 올림 충전액($R$) 계산, 총 자산 검증 및 잔액 차감을 순수 함수 `calculateNaverPayPayment`로 분리.
  - 9가지 엣지 케이스 단위 테스트 작성 및 전체 통과 (`naver-pay-calculations.test.ts`).
- **결제 타입 및 에러 매핑 확장 (`src/lib/payment-calculations.ts`)**:
  - `PaymentMethod`, `PointPlatform`에 `"NAVER_PAY"` 추가.
  - 네이버페이 결제 시 적립 0P 처리 및 충전 자산 부족 에러 친화적 메시지 매핑 추가.
- **스토어/페이 지갑 위젯 확장 (`src/components/wallet/store-wallet-widget.tsx`)**:
  - 3열 그리드로 네이버페이 잔액(원) 표시 및 수동 목표 잔액 보정(`adjust_wallet_balance`) 지원.
  - 단위 테스트(`store-wallet-widget.test.tsx`) 4건 통과.
- **지출 관련 컴포넌트 라벨 동기화**:
  - `src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`에 `NAVER_PAY` 레이블 추가.
- **DB 스키마 및 마이그레이션 DDL 갱신 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - `store_wallets`, `expenses`, `store_point_transactions`의 CHECK 제약조건 확장.
  - `process_expense_payment` 및 `refund_expense_payment` RPC에 네이버페이 충전·결제 트랜잭션 및 자산 이중 차감/환불 방지 로직 적용.
- **검증 무결성**:
  - Vitest 34개 파일 / 138개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-12 (회원가입 페이지 분리 및 닉네임 입력 지원)

- **회원가입 라우팅 분리 (`src/app/auth/signup/page.tsx`)**:
  - 기존 `/auth`에서 단일 폼으로 처리되던 회원가입 로직을 별도 전용 페이지로 분리.
  - 이메일, 비밀번호(6자 이상), 닉네임(최대 20자) 입력 폼 제공.
  - `supabase.auth.signUp` 호출 시 닉네임을 메타데이터(`options: { data: { nickname } }`)로 저장하고 세션 생성 시 `users` 테이블 동기화 폴백 지원.
- **기존 로그인 페이지 연동 (`src/app/auth/page.tsx`)**:
  - 기존 로그인 및 Google OAuth UI는 유지하면서 '회원가입' 버튼 클릭 시 `/auth/signup` 페이지로 라우팅되도록 변경.
- **경로 리다이렉트 지원 (`src/app/dashboard/auth/page.tsx`)**:
  - `/dashboard/auth` 접근 시 404 없이 `/auth`로 즉시 리다이렉트 처리.
- **단위 테스트 및 빌드 무결성**:
  - `src/app/auth/page.test.tsx` 갱신 및 `src/app/auth/signup/page.test.tsx` 신규 5건 테스트 추가 (전체 33개 파일 128개 테스트 100% 통과, `next build` 15개 정적 페이지 빌드 성공).

## 2026-10-12 (Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 파이프라인 등록)

- **파이프라인 등록**: 픽업별 지출 추적 및 소비 통계 분석 요구사항을 Phase 11.4로 신규 등록(`docs/to-do.md`, `docs/progress.md`, `docs/handoff.md`).
- **테스트 및 빌드 무결성 보완**: `src/app/dashboard/games/page.test.tsx` MockQuery 타입 선언을 개선하여 `tsc --noEmit` 에러(TS18046) 및 Next.js ESLint 빌드 에러를 해결. (123개 테스트 100% 통과, 정적 export 13개 페이지 빌드 성공).

## 2026-10-12 (Phase 11.2 사이드바 동일 게임·기간 일정 그룹핑)

- **일정 등록 원칙 변경**: 같은 날 같은 게임의 픽업이 여러 개면 `'/'`로 합치지 않고 캐릭터(배너)별로 개별 등록. 지출(`expenses.schedule_id`)과 1:1 연결 가능.
- **`src/components/calendar/hero-sidebar.tsx`**: 같은 `gameId`(없으면 게임명) + `schedule_type` + `start_date` + `end_date` 일정을 하나의 카드로 묶고, 제목(+개별 메모)을 `• 제목` 목록으로 표시. 기간·유형·게임이 다르면 카드 분리 유지.
- **`src/app/dashboard/page.tsx`**: `HeroScheduleItem`에 `gameId` 전달.
- **테스트**: `hero-sidebar.test.tsx`에 그룹핑/분리 케이스 2건 추가.
- **관리자 일정 복사 (`src/app/admin/page.tsx`)**: 공식 일정 항목 버튼을 `[복사] [수정] [삭제]` 순서로 배치. `[복사]`는 원본 값(게임·유형·기간·제목·메모)이 채워진 "일정 복사" 모달을 열고 저장 시 새 일정으로 insert. `page.test.tsx`에 버튼 순서/복사 저장 테스트 2건 추가.

## 2026-10-12 (Phase 10.7 페이지별 UI 및 인터랙션 긴급 개선)

- **Alt+Tab / 창 포커스 전환 시 화면 리셋 및 모달 닫힘 현상 해결**:
  - `src/app/dashboard/layout.tsx`: `hasMountedChildren` ref 가드를 추가하여 초기 마운트 이후 백그라운드 토큰 갱신 시 자식 컴포넌트 언마운트 방지.
  - `src/lib/auth-context.tsx`: 토큰 갱신 시 `isAccountDeletionStatusLoading` 재트리거 방지.
- **대시보드 에러 방어 및 하위 호환 (`src/lib/subscription-sync.ts`, `src/app/dashboard/page.tsx`)**:
  - 원격 DB의 `cycle_type` 컬럼 부재 시 자동 폴백 처리 및 쿼리 필터 단순화.
- **소비 화면(`/dashboard/expenses`) 버튼 분기 및 문구 수정**:
  - 탭 상태에 따라 상단 버튼 분기 (`activeTab === "expenses" ? [+ 지출 추가] : [+ 구독 추가]`).
  - 정기 구독 탭 타이틀/설명 문구 수정 (`정기 구독`, `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.`).
  - 30일 누적 충전형(`INTERVAL_30`) 구독 카드: `남은 N일` 배지 추가, `[남은 날짜 수정]` 버튼 및 D-day 동기화 모달 추가.
  - 예정 지출 결제 확정 시 결제 수단, 할인, 쿠폰, 포인트 수정 지원.
- **할인/포인트 입력 모델 개편 (`src/components/expense/expense-modal.tsx`, `expense-detail-modal.tsx`)**:
  - 지출 모달 카테고리에서 `정기 구독` 삭제.
  - "포인트 할인 (원)" 삭제 $\to$ `정가 (원)`, `쿠폰 (%)`, `할인 (원)`, `사용 포인트 (P)`로 일원화 (1P = 1원 자동 매핑).
- **구독 추가 모달 개편 (`src/components/subscription/subscription-modal.tsx`)**:
  - 카테고리 `정기 구독` 고정(read-only).
  - 제목 placeholder `예: ~` 제거, 30일 누적 충전형 설명 문구 수정.
- **게임 관리(`/dashboard/games`) 및 관리자(`/admin`) UI 수정**:
  - `GameSelectModal` 트리거 버튼 문구를 `구독 추가`로 변경 (`+ + 구독 추가` 중복 해소).
  - `/admin` 일정 타이틀 placeholder `예: ~` 제거.
- **원격 DB 마이그레이션 DDL 스크립트 작성 (`md/MIGRATION_PHASE10.sql`)**:
  - Supabase SQL Editor에서 실행 가능한 `subscription_templates`, `expenses`, 및 최신 `update_store_wallet_settings` DDL 제공.
- **캘린더 타일 아이콘 표시 방식 개선 (`src/app/dashboard/page.tsx`)**:
  - `start_date`와 `end_date`를 가지는 복수일 기간 일정(버전, 픽업 등) 및 기간형 지출의 경우, 캘린더 타일 우측 상단 게임 아이콘을 전체 기간 동안 반복 표기하지 않고 오직 `start_date` 타일에만 단일 표기하도록 변경 (타일 아이콘 중복/도배 해소, 사이드바 상세 목록은 기간 내 유지).
- **Galaxy Store 등급 설정 저장 호환성 강화 (`src/components/wallet/store-wallet-widget.tsx`)**:
  - 원격 DB의 구버전 `update_store_wallet_settings` RPC 오류 방어를 위해 `p_tier: null` 자동 폴백 지원.
- **미구독 게임 일정 노출 차단 (`src/app/dashboard/page.tsx`)**:
  - 사용자가 구독한 게임(`user_games`)의 공용 일정만 개인 캘린더에 노출되도록 필터링 분리.
- **관리자 탭 내비게이션 및 일정 관리(CRUD) 전면 개편 (`src/app/admin/layout.tsx`, `src/app/admin/page.tsx`)**:
  - `/admin` $\leftrightarrow$ `/admin/requests` 간 상단 서브 탭 내비게이션 추가.
  - 등록된 공식 일정 전체 목록 조회, 게임별 필터링, 새 일정 등록 모달, 기존 일정 수정 모달, 일정 삭제 확인 다이얼로그 및 `src/app/admin/page.test.tsx` 5종 단위 테스트 완료.
- **요청 관리(`/admin/requests`) 관리자 권한 검사 일원화 및 디자인 정리 (`src/app/admin/requests/page.tsx`)**:
  - `user.app_metadata.role`뿐 아니라 `AuthContext`의 `role === 'admin'`을 포괄하도록 `isAdmin` 검사 로직 통일 (`Topbar`, `AdminLayout`, `AdminPage`와 일관성 확보).
  - 중복된 외부 래퍼(`min-h-screen bg-gray-900`) 제거 및 테마 토큰(`bg-surface`, `border-line`, `text-content`) 정리.
  - `src/app/admin/requests/page.test.tsx`에 컨텍스트 role 기반 요청 로드 테스트 추가 (총 3종 통과).
- **소비/게임/관리자 헤더 높이 통일, 중복 버튼 단일화 및 관리자 화면 요청 기능 은닉**:
  - 소비/게임/관리자 헤더 좌상단 텍스트(소비, 게임, 관리자 센터)의 높이와 `border-b border-line pb-4` 규격을 통일하고, 우측 버튼(`[+ 지출 추가]`, `[+ 구독 추가]`, `[+ 추가 요청]`) 및 관리자 링크 높이를 `h-10`(40px)으로 일치.
  - 소비 정기 구독 탭 본문의 중복 `+ 구독 추가` 버튼 제거 (상단 헤더에 1개만 단일 배치).
  - 게임 페이지 하단 카드의 중복 버튼 제거 (상단 헤더에 1개씩 단일 배치).
  - 관리자 계정 격리: 관리자 로그인 시 `/dashboard/games`에서 게임 추가 요청 버튼/안내 카드를 숨기고, `/dashboard/settings`에서 `UserRequestsCard` 숨김 처리.
- **검증 완료**: TypeScript 0 오류, Vitest 31개 파일 / 115개 테스트 전체 통과 (100% PASS), Next.js 빌드 무결성 유지.

## 2026-10-12 (Phase 2.5 TypeScript Database 타입 자동 생성 완료)

- **원격 DB 타입 자동 생성 (`src/types/database.types.ts`)**:
  - `npx.cmd supabase gen types typescript --db-url ...` 실행을 통해 원격 Supabase DB의 12개 테이블 스키마, 뷰, 제약조건, RPC 함수 타입을 최신 상태로 생성.
  - `Database['public']['Tables']['personal_memos']['Row']` 등 모든 핵심 테이블 타입 정상 바인딩 확인.
- **종합 정적 분석 및 테스트 검증**:
  - `npx.cmd tsc --noEmit` 무결점 통과 (에러 0건).
  - Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS).

## 2026-10-12 (Phase 2.3 RLS 격리 및 Phase 7.1 일정 동기화 DB 실기 검증)

- **테스트 스크립트 결함 수정 (`md/TESTS.sql`)**:
  - `test_game_id` 생성 직후 세션 구성 변수 등록(`set_config('chronoledger.test_game_id', :'test_game_id', true);`) 누락을 수정하여 인라인 PL/pgSQL 블록의 변수 미인식 오류 해결.
- **Phase 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증**:
  - `psql` 17.11로 Supabase 테스트 프로젝트에서 `md/TESTS.sql` 전체 스위트 실행 (`ON_ERROR_STOP=1`).
  - 일반 사용자 권한에서 타 사용자 자산/지출/지갑 접근 차단, `store_wallets` 잔액 직접 수정 차단, `store_point_transactions` 원장 임의 쓰기 차단, `expenses` 및 `subscription_templates` 물리 삭제 차단, 요청 상태 임의 변경 차단(`REQ-02`) 100% 통과 확인.
- **Phase 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증**:
  - 관리자의 일정 시작/종료일 변경 시 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 자동 동기화되고 `CONFIRMED`/`CANCELLED` 회계 지출과 날짜 외 컬럼은 보존됨을 검증(`SCH-01`, `SCH-02`) 통과 확인.
- **원자적 롤백 확인**:
  - `PASS: all smoke-test fixtures and mutations rolled back` 출력 및 단일 트랜잭션 롤백 완료 확인.

## 2026-10-12 (Phase 10: 기획 v2 전면 개편)

- **캘린더 & 지출 바인딩 (10.1)**:
  - 버튼 레이블을 `+ 지출 추가`로 통일.
  - 지출 모달 내 카테고리 우선 선택 도입(카테고리가 '게임'일 때만 게임 선택 노출).
  - 지출 일자의 공용 일정 중 `VERSION` 일정에만 단일 바인딩 연동 (`PICKUP` 일정 바인딩 제외).
- **소비 화면 UI 개편 (10.2)**:
  - 소비(`/dashboard/expenses`) 헤더에 `+ 지출 추가` 버튼 및 모달 연동.
  - 카테고리별 비중 그래프를 Recharts 원그래프(Pie Chart)로 전면 교체.
  - 집계 기준 엄격 적용: 취소/예정 지출을 완전히 제외한 확정(`CONFIRMED`) 지출만으로 비율 및 통계 계산.
  - 목록 액션 버튼을 `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 직관화하고 전용 RPC 연동.
- **정기 구독 3종 주기 모델 A안 (10.3)**:
  - 소비 화면 내 `[지출 내역 및 통계 | 정기 구독]` 서브 탭 분리 구성.
  - `subscription_templates` 스키마 및 DB 체크 제약에 `cycle_type`(`MONTHLY_DAY`, `INTERVAL_30`, `VERSION_PASS`) 추가.
  - `src/lib/subscription-sync.ts`: 매월 지정일 말일 보정, 30일 누적 충전식, 신규 버전 시작일 연동 3종 회차 생성 엔진 구현.
  - 구독 생성 모달(카테고리 '게임' 우선 필터링, 주기 모델 선택) 및 활성화 토글 스위치 구현.
- **게임 관리 화면 개편 (10.4)**:
  - 게임 관리(`/dashboard/games`) 헤더 및 하단 배너에 `+ 구독 추가`, `+ 추가 요청` 버튼 배치.
  - `RequestSubmissionModal`: 게임 요청(게임 제목만 입력)과 일정 요청(게임+기간+유형+내용 템플릿) 분기 템플릿 제공.
  - 내 구독 게임 카드 그리드: 256×256 WebP Canvas 자동 변환 아이콘 업로드/삭제, 공식 일정 보기 시트, 지출 보존 구독 해제.
- **설정 화면 개편 (10.5)**:
  - Galaxy Store 포인트 지갑: 적립률 수동 입력을 4대 공식 등급(일반 0.1%, 스타 0.1%, 프레스티지 1.1%, 로열블루 2.1%) 선택 드롭다운으로 개편 (`md/SCHEMA.sql` 및 `src/lib/payment-calculations.ts` 동기화).
  - 개인 재무 설정 카드: `user_finances`의 총 자산(`total_asset`) 및 기본 월 예산(`default_budget`) 조회/수정 기능 추가.
  - 내 요청 내역 카드: 제출한 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 피드백 메모(`admin_memo`) 조회 뷰 추가.
- **종합 검증 및 회귀 테스트 (10.6)**:
  - TypeScript 오류 0건 (`npx tsc --noEmit`).
  - Vitest 30개 파일 / 106개 테스트 100% 통과 (PASS).
  - Next.js 정적 export (`npm run build`) 13개 페이지 최적화 빌드 성공.

## 2026-10-09 (Phase 9 Iteration 01)

- 레이아웃 정리: 좌측 사이드바를 제거하고 상단바(`components/layout/topbar.tsx`)로 이동(홈·소비·게임, 로고 확대, 테마 토글, 프로필 드롭다운의 계정/로그아웃). 기본 테마는 저장값이 없으면 OS 설정을 따르고 토글은 유지. 빈 상태의 □ 제거, 스토어 포인트 표기를 Google/Galaxy로 변경, "지출 등록"을 "등록"으로 바꿔 일자 상세 패널(히어로 사이드바·모바일 드로어) 날짜 줄 우측으로 이동.

- 프로필: 상단바 프로필 버튼에 사용자 이름과 사진(직접 업로드 > Google 사진 > 이니셜) 표시. 계정 설정(`/dashboard/settings`)에 `ProfileAvatarCard` 추가(256x256 WebP를 비공개 `user-icons/{uid}/profile.webp`에 업로드/삭제, 오프라인 시 비활성). 계정 삭제 워커가 `{uid}` 폴더를 지워 별도 정리 불필요.

## 2026-10-10 (Phase 8 Iteration 01)

- UI 폴리싱: 디자인 시트 기준 dark/Cool Neutral Light 시맨틱 토큰(`globals.css` RGB 채널 변수)과 Tailwind 매핑, 레거시 gray/blue/red/green/yellow·`text-white` 유틸리티를 토큰으로 재매핑, A2Z 전역 폰트(기존 자체 호스팅 9 weight + OFL 유지), 중단점 md=900/lg=1280, 반경/그림자/전환 토큰, 테마 토글(`cl-theme`, 기본 dark, 인증 화면은 dark 고정), `EmptyState` 공통 컴포넌트, 버튼/입력/카드/다이얼로그/드로어/진행바 다듬기, 대시보드 셸(데스크톱 사이드바·모바일 상단바), 캘린더·히어로 사이드바·모바일 바텀시트 다듬기, 관리자/설정/게임 선택 하드코딩 색 교체.

## 2026-10-09 (Iteration 03)

- Phase 7 Iteration 03: Iteration 02 수정이 미커밋 상태로 리뷰된 점을 확인하고 유지(자동 열림·비해제 만료 모달, `manifest.id`)하면서, Service Worker에 Supabase REST GET의 로그인 사용자별(JWT `sub`) 읽기 캐시를 추가(익명·만료 토큰·비-GET·타 출처 제외, 로그아웃 시 전체 삭제), 기본 브랜드 아이콘 재생성과 maskable 분리, 7.3 완료 표기. 실브라우저/Android 검증은 7.4로 이월.

## 2026-10-09

- Phase 7 Iteration 02 리뷰 반영: 기한 지난 PLANNED가 있으면 닫을 수 없는 만료 모달 자동 표시(닫기 버튼·Esc·바깥 클릭 차단, 오프라인 안내), 그리드 범위 `end_date` PLANNED 조회·병합 및 만료 조회를 종료일 기준으로 통일(일정 연결 PLANNED는 `target_date=end_date`로 저장), 앱 셸 Service Worker(`public/sw.js`)·등록/로그아웃 캐시 삭제, 전 쓰기 진입점에 오프라인 핸들러 가드(`offline-guard.ts`)와 배너 문구 정정, manifest `id`·180px apple-touch 아이콘 추가. 7.3의 개인 데이터 오프라인 조회 캐시는 미구현으로 기록(부분 완료), 정식 아이콘 교체는 릴리스 차단 항목.

## 2026-10-08

- Phase 7 구현: `md/TESTS.sql`에 SCH-02(일정 날짜 변경 시 PLANNED만 동기화, CONFIRMED/CANCELLED 보존, 날짜 외 변경 무동기화) 추가, `budget-calculations.ts`(PLANNED는 종료일 월·CONFIRMED는 결제월 귀속, 만료 항목 탐지), `overdue-planned-modal.tsx`(결제/예정 취소), PWA `manifest.json`·임시 아이콘·`offline-banner.tsx`·오프라인 쓰기 버튼 잠금을 추가했다. tsc/Vitest(22 files/70 tests)/lint/build 통과, DB SQL 실행과 Android PWA 설치·오프라인 실기 검증은 미수행.
- Phase 6 구현: 스토어 포인트 지갑 위젯(설정 페이지, `update_store_wallet_settings`/`adjust_wallet_balance`), 결제 모달(PLANNED 지출 생성 후 `process_expense_payment`), 지출 상세/환불 모달(`refund_expense_payment`, 잔액 부족 오류 안내)과 결제 계산·검증 라이브러리, 대시보드 연동을 추가했다. tsc/Vitest(19 files/59 tests)/lint/build 통과, 실DB RPC·RLS·원장 검증은 미수행.

- Phase 5 Iteration 02 리뷰 반영: 조회 범위를 42일 그리드 전체로 확장, 예상 지출에 CONFIRMED 포함(표시 월·CANCELLED 제외), date-only 문자열 로컬 파싱, 초기 날짜를 마운트 후 설정해 hydration 불일치 방지, EOF 공백 정리. tsc/Vitest(15 files/45 tests)/lint/build 통과, 실DB 검증은 미수행.
- Phase 5 캘린더 코어를 구현했다. 6주 그리드·말일 보정 날짜 연산, 월간 구독 Lazy Generation, 금액 미표시 데스크톱 캘린더, 히어로 사이드바/모바일 바텀시트를 추가하고 대시보드를 해당 구조로 교체했다.
- 캘린더/구독/대시보드 테스트를 추가·갱신했으며 전체 Vitest(15 files/43 tests), TypeScript check, lint, 정적 build를 통과했다.
- Phase 3 Web/PWA 인증 흐름과 계정 삭제를 구현했다. Netlify Functions + Supabase 내구성 queue/retry worker로 사용자 아이콘/개인 행을 정리하고 Resend 멱등성 키 메일 후 Auth 계정을 삭제한다. 대기 중 접근 차단, 진행 상태 화면, OAuth/session 및 deletion worker 테스트를 추가했다. migration/실환경 인증·RLS/Storage/메일 발송은 미검증이다.
- Resend 멱등성 기간을 넘긴 미확정 발송은 자동 재전송하지 않고 `MANUAL_REVIEW`로 보류해 잠재적 중복 안내를 방지한다. 관련 선택과 수동 운영 필요성을 설계/결정 문서에 기록했다.
- `docs/to-do.md`의 기존 Phase 2.4 충돌 마커를 제거하고, 완전한 Phase 2.4 검증 현황 및 Phase 2.5 미완료 상태를 보존했다.
- Phase 2.4를 위해 `md/TESTS.sql`을 현재 `md/SCHEMA.sql` 기준으로 보강했다. 테스트 역할/JWT, synthetic 사용자 및 기본 finance/wallet 값, 순서별 기대 결과, authenticated RPC 호출, 실패 원자성, RLS/grants 케이스를 문서화했다. 테스트는 rollback-only로 유지했으며 DB 접속과 SQL 실행은 하지 않았다.
- 진행 현황·인수인계·to-do에 정적 검토 범위와 현재 SQL 버전의 미실행 상태, 격리된 Supabase 테스트 프로젝트에서의 후속 실행 필요성을 기록했다.

- Phase 1 환경 설정을 보완했다. Progress/Drawer 컴포넌트와 의존성을 추가하고, Supabase 브라우저 singleton이 필수 공개 환경변수 누락을 명시적으로 보고하도록 했다. 기존 Dialog/Select를 확인하고 브라우저 PKCE/Tauri implicit 동작을 테스트했다.
- 다중 에이전트 파이프라인 보완판과 현재 협업 체계 이식 검토 문서를 추가했다(문서 전용, 코드·스크립트 변경 없음).
- Antigravity 시험용 한국어 workspace 규칙과 Maker/Reviewer/Orchestrator skills를 추가했다. 기존 Copilot agent 정의는 `.bak`으로 보존하고 `.github/agents/`의 활성 정의를 제거했다. Antigravity 내 인식·실행 여부는 미검증이다.

- Phase 4 기반 및 요청 제출 변경을 `main`에 통합했다. 게임 카탈로그/아이콘 업로드, 관리자 승인 화면, 사용자 게임·일정 제안 UI와 테스트를 포함하며, 기존 최신 인증 UI와 KST 대시보드 동작을 보존한다. 중첩 worktree 테스트 검색 제외, 로그인 입력 오타 및 npm peer/lockfile 정합성도 보완했다.
- Gemini Phase 4.4 검토를 위한 수동 패킷(승인 기준 요약, 프롬프트, Base/Target 정보)과 40,198-byte exact diff를 준비했다. 사용자가 수동 방식을 선택해 Gemini API run은 호출 전에 abandoned 처리했으며 어떤 diff도 외부로 전송하지 않았다.
- 사용자가 동일 Base/Target의 Gemini 수동 정적 리뷰 결과를 전달했다. Gemini는 clean/발견 없음으로 판정했으며, 별도 결과 파일에 기록해 기존 ChronoLedger review.json은 보존했다. 실제 Supabase RLS/RPC 원자성은 미검증으로 유지한다.

## 2026-10-07 (Phase 4.4 및 협업 파이프라인)

- Phase 4.4 협업 run에서 사용자 게임 제안 및 일정 추가/수정 요청 UI를 추가하고 입력 검증, 요청 목록, 회귀 테스트를 구현했다. 동일 Target SHA 리뷰는 clean이고 Vitest 21개, lint, dummy 환경의 정적 build 및 run 결과 Schema 검증이 통과했다. 실제 Supabase 연동과 격리 sandbox 검증은 남아 있다.
- 협업 파이프라인 변경을 main `f163157`, Phase 4 초기 구현을 `collab/phase1-setup` `674f741`에 분리 커밋했다. Target SHA와 범위가 어긋난 기존 `phase1-setup` run은 review/test가 없음을 기록하고 `abandoned`로 종료했다.
- Local harness용 ChronoLedger Orchestrator와 Maker/Reviewer 자동 위임 절차, 사용자 개입 지점 가이드, 협업 JSON Schema validator 및 테스트를 추가했다. VS Code 실제 위임 흐름은 검증 전이다.
- Windows PowerShell이 UTF-8 BOM으로 저장할 수 있는 run manifest를 Gemini Reviewer JSON loader가 읽도록 보완했다.
- Gemini Reviewer 단일 run/SHA PoC와 오프라인 회귀 테스트를 추가했다. 전체 diff를 표시하고 인터랙티브 승인을 요구하며, manifest/결과를 기존 JSON Schema로 검증하고 검증된 결과만 no-overwrite 방식으로 저장한다. API 호출·외부 전송 승인·도입 결정은 수행하지 않았다.
- PoC 사용법 및 제한은 `ChronoLedger_pipeline_auto.md`에 기록했다. 제안서의 독립 리뷰 전달용 `ChronoLedger_pipeline_auto_review.md`도 추가했다.
- Gemini 작성 진행 기록과 공용 구현 체크리스트의 역할을 구분했다. 현재 우선순위·완료 상태는 `docs/to-do.md`가 기준이며, `docs/to-do_Gemini.md`는 검증 전 과거 기록으로 보존한다.

## 2026-10-07 (Phase 4 초기 구현, 검증 중)

- 클라이언트 Canvas 기반 256x256 WebP 이미지 리사이징 모듈(`src/lib/image-resizer.ts`)을 구현하여 5MB 이하 이미지의 1:1 중앙 크롭 및 100KB 이하 압축을 적용했다.
- Supabase Storage `user-icons` 비공개 버킷 업로드/다운로드/삭제 유틸리티(`src/lib/storage-upload.ts`)와 공용 게임 카탈로그 구독/아이콘 등록 모달의 초기 구현을 추가했다.
- 관리자 요청 페이지의 초기 구현에서 DB 필드/RPC 인자 불일치를 발견해 수정했다. 관리자 역할 gate, 기본 아이콘 URL 입력, RPC 실패 시 상태 직접 변경 fallback 제거를 반영했다.
- 앱 테스트 15개, ESLint 및 dummy Supabase 환경변수를 사용한 정적 build가 통과했다. 실제 Storage/RLS/RPC 통합은 미검증이며 게임/일정 요청 제출 모달도 남아 있어 Phase 4 완료로 보지 않는다.

## 2026-10-07

- Dashboard의 당월 예정 지출을 KST DATE 월 범위로 조회하고 `end_date` 우선 월 귀속과 실제 0원/오류 분기를 반영했다. Gemini 분업은 커밋 이후 동일 SHA 읽기 전용 리뷰로 별도 미착수 표시했다.
- 로그인·대시보드의 접근성을 보완했다. 카드 제목 단계, 로딩/오류 알림 역할, 내비게이션 이름 및 장식 아이콘 의미를 정리하고 브라우저에서 로그인 폼 이름, 키보드 초점, 타깃 크기와 색상 대비를 검증했다. 실제 스크린리더 및 인증 dashboard 실행 검증은 남아 있다.
- `/auth` 로그인 화면을 앱과 일관된 다크 테마로 개선했다. 레이블이 있는 입력과 이메일 로그인·가입·Google 버튼 구성을 정리하고, 좁은 화면에서도 넘침이 없는지 확인했다. 실제 인증 동작은 유지했으며 앱 전체 테마 전환은 후속으로 남겼다.
- 사용자와 UI 제안 항목을 이어서 결정했다. 본문 15px/보조 12px/섹션 17px/페이지 제목 22px/주요 숫자 20–28px, 쿨 뉴트럴 라이트 테마, 기존 다크 팔레트, 절제된 카드/강조 모달 그림자, 다음 행동을 제시하는 빈 상태, 짧고 중립적인 보조 피드백을 반응형 시안과 설계 문서에 반영했다. 양 테마의 텍스트·버튼·상태 라벨 대비를 계산했고, 수정 시안을 390/900/1280px에서 브라우저로 재검증했다. 제품 UI 접근성 검증은 남아 있다. 당시 라이선스 검토가 끝나지 않아 시안은 시스템 글꼴을 사용했으며, 이후 확인 결과는 아래 항목과 같다.
- A2Z 제작자 안내에서 SIL OFL 1.1을, 눈누 항목에서 상업 이용·수정·재배포 허용 및 폰트 자체 단독 판매 금지를 확인했다. 원본 WOFF2의 내장 저작권 표기(`Copyright © 2026 PT&`)를 확인하고, 9개 WOFF2 굵기를 미리보기와 웹 앱에서 자체 호스팅하며 각 폰트 폴더에 OFL 전문을 동봉했다.
- 2026-10-07 사용자 지시에 따라 Android PWA 실기기 인증 검증을 보류하고 웹사이트 기능 개발을 우선하도록 작업 상태를 변경했다. Netlify 제안서를 재검토해 정적 export Deploy Preview를 먼저 검증하고, 필요가 입증되기 전에는 Web/Desktop 이중 빌드 및 Next.js 서버 기능을 도입하지 않는 권고를 기록했다.
- Netlify 사전검증에서 앱 브랜치의 일반 production build, 주요 정적 경로와 참조 자산, OAuth callback 테스트 5개를 확인했다. 빌드를 막던 lint 위반 두 건도 최소 수정했다. PWA manifest/service worker는 없다.
- 로컬 앱 브랜치와 원격 `main`의 차이를 검토해 최신 앱 코드·문서를 통합하고 push했다. 루트 `.gitignore`에 `.worktrees/` 및 일반 로컬 환경 파일 규칙을 보존해 중첩 worktree가 실수로 추적되지 않도록 했다.
- GitHub import 화면에서 `main` Production 배포를 피하고 Netlify CLI로 검증된 `out`을 Draft Deploy했다. 사용자가 루트/`/auth` 로그인, callback 안내, 비로그인 대시보드 차단 동작을 확인했다. 익명 HTTP의 401은 Edge Access에 의한 것이다. GitHub 자동 배포/프로덕션 배포는 시작하지 않았다.
- 로컬 Supabase URL과 Legacy anon 키가 형식상 서로 맞고 실제 대시보드 값과 동일함을 확인했다. Draft OAuth allowlist 추가는 미실행이며, 사용자가 오늘 작업을 마치기로 해 다음 세션으로 넘겼다.

## 2026-10-06

- 로컬 브라우저 Google OAuth를 실제 검증하고 중복 code 교환 및 React Strict Mode cleanup 문제를 수정했다. 로그인 UI를 `/auth`로 단일화하고 dashboard layout 인증 gate를 추가했으며 root 이동과 비로그인 직접 접근 차단을 확인했다. Android PWA 실기기 검증은 남아 있다.
- Web/PWA 작업 체크리스트를 실제 상태에 맞게 동기화했다. Phase 1 run은 target SHA 및 동일-SHA review/test 산출물이 없어 미완료 상태를 유지한다.
- 사용자가 ChronoLedger를 과제 제출물이 아닌 개인 프로젝트로 진행하기로 결정했다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제외하고 기존 승인 기술·기능 기준(Supabase PostgreSQL, Next.js 정적 export, 회원 기능 및 사용자/관리자 구분)을 유지하도록 기획·상세 설계·진행/인수인계 문서를 갱신했다.
- 승인 SRS/SPEC/SCHEMA를 기반으로 런타임 경계, 데이터 책임, RPC, 핵심 흐름, 보안·오류 처리 및 요구사항별 검증 설계를 정리한 `docs/detailed-design.md`를 추가했다. 미승인 구현 선택은 미결정으로 기록했다.
- 사용자 결정에 따라 예산 집계와 경고 계산은 공유 클라이언트 도메인 함수에서 수행하고 온라인 RLS 조회/허용된 오프라인 캐시에 같은 규칙을 적용하도록 상세 설계를 보완했다.
- 계정 삭제 서버 경로는 Netlify 채택 시 Netlify 서버 함수를 사용하는 방향으로 기록했다. Netlify 채택 자체와 실패 복구 정책은 별도 결정으로 남겼다.
- Netlify/Web·Desktop 빌드 제안은 보류하고 Web/PWA MVP를 현재 승인 기준으로 진행하기로 한 사용자 결정을 기록했다.
- 오프라인 읽기 캐시는 계정별 IndexedDB에 최근 조회 데이터를 두고 로그아웃/세션 만료 때 제거하기로 결정했다. 보존 기간과 재동기화 규칙은 미결정으로 남겼다.
- 계정 삭제 부분 실패는 삭제 대기 상태를 보존하고 서버 재시도로 처리하기로 결정했다. 대기 중 계정 접근 및 worker 구조는 후속 설계로 남겼다.
- 삭제 대기 중에는 세션을 유지하되 일반 데이터/기능 접근을 차단하고 상태 화면만 허용하며, 서버/RLS 경계에서도 제한하기로 결정했다.
- 계정 삭제 재시도는 실패 간격을 늘려 완료까지 자동 반복하고 삭제 대기 상태를 유지하기로 결정했다. worker 구조와 완료 알림은 미결정으로 남겼다.
- 계정 삭제가 끝나면 완료 화면과 등록 이메일 알림을 제공하기로 결정했다. 이메일 전송 경로와 수신 주소 보관·삭제 시점은 미결정으로 남겼다.
- 삭제 알림 주소 사본은 저장하지 않는다. 데이터/Storage 정리 후 Auth 삭제 전에 진행 상태 메일을 보내고, Auth 삭제 실패 시 상태 화면에서 알리며 Auth 삭제만 재시도하기로 했다.
- 게임 구독 해제 중 Storage 삭제가 실패하면 대기 작업과 서버 재시도를 두고 Storage 정리 성공 후 구독 행을 제거하기로 했다. 대기 UI는 미결정으로 남겼다.
- 게임 구독 정리 대기 중에는 목록에 “삭제 처리 중”으로 표시하고 중복 해제를 막기로 했다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성만 미결정으로 명시했다. Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export 및 Web/PWA 우선 순서는 기존 결정대로 유지한다.
- 성능 측정의 기준 기기를 중급 Android 실기기로 정했다. 네트워크·데이터 규모·수치 목표는 후속으로 확정한다.
- 오프라인 캐시는 고정 TTL 없이 다음 성공 동기화까지 유지하고 마지막 동기화 시각을 표시하며, 네트워크 복귀 시 관련 데이터를 즉시 재조회하기로 했다.
- `.worktrees/phase1-setup`에서 브라우저 Google OAuth PKCE callback 및 실패 상태 처리를 구현하고 단위 테스트를 추가했다. 실제 Supabase provider/Redirect URL 기반 end-to-end 인증은 미검증으로 기록했다.
- 구현 우선순위를 명확히 표시했다: Web/PWA 브라우저 OAuth callback 및 PKCE 처리를 먼저 진행하고, Tauri OAuth 딥링크는 Web/PWA MVP 이후로 둔다. Copilot 프로필 확인은 사용자 환경 검증 과제로 분리했다.
- UI 디자인 시트와 한국어 정적 목업을 승인 SRS와 대조해 UI 참조로 아키텍처/to-do에 추가했다. 기능 규칙은 호환되며, 반응형/동작은 미구현 시안으로 남겼다.
- Netlify 아키텍처 문서를 제안 상태로 기록했다. 사용자 결정 전까지 SRS 및 실행 빌드 구조는 바꾸지 않는다.
- VS Code GitHub Copilot 저장소 지침과 Maker/Reviewer 프로필을 추가하고 협업 사용 안내, 아티팩트 규약, 아키텍처, 인수인계, 체크리스트를 갱신했다. 자동 AI 호출 및 VS Code 환경에서의 프로필 인식/동일-SHA 실행은 미검증이다.

## 2026-10-05

- 사용자와 합의한 Web/Android PWA 우선 개발 순서를 `docs/to-do.md`에 반영했다. Windows Tauri 지원은 유지하고 데스크톱 OAuth 딥링크 및 패키징을 Web/PWA MVP 후속 단계로 옮겼다.
- 진행 현황 및 인수인계의 다음 작업 순서를 갱신했다.

## 2026-10-03

- 테스트 프로젝트의 읽기 전용 메타데이터를 `SCHEMA.sql`과 대조했다. 핵심 테이블, 컬럼, RLS/정책, RPC 권한, 트리거 및 인코딩이 대체로 일치함을 확인했다.
- 사용자가 확인·승인한 프로젝트에 `user-icons` 버킷을 생성하고 private, 102,400 bytes, `image/webp` 설정을 확인했다.
- 사용자가 `md/TESTS.sql` rollback-only smoke suite를 `ON_ERROR_STOP=1`로 실행했다. 최종 `PASS: all smoke-test fixtures and mutations rolled back` 출력으로 선행 검증 통과와 fixture 롤백을 확인했다.
- `docs/to-do.md`의 Phase 0.6을 완료하고 설계 단계 진입을 승인했다. 전체 SRS 수용 기준의 상세 테스트 케이스와 성능 목표는 설계 단계에서 정한다.
- 갱신된 Gemini 진행표를 작업 트리와 재검토했다. Tauri v2와 shadcn 설정은 반영됐지만 OAuth callback 화면, PKCE 교환 및 Windows 딥링크 수신에 누락이 있어 인증 완료 판정을 보류하고 관련 과제를 `docs/to-do.md`에 기록했다.

## 2026-10-02

- `docs/to-do_Gemini.md`와 `phase1-setup` 작업 트리를 대조해 구현 초안, 미확인된 DB 배포 주장, 미완료 리뷰/테스트 증거, 계획의 Tauri v2와 작업 트리 v3 alpha 불일치를 `docs/to-do.md`에 기록했다. 후속 검증 항목을 추가했다.
- 낡은 제안·검토 문서 2개(`md/fix-proposals.md`, `md/revisions_and_decisions_review.md`)를 삭제했다. 최신 요구사항 문서와 명시적인 역사 기록으로 연결된 검토 자료는 유지했다.
- 초보 개발자를 위한 AI 협업 안내서를 추가했다. Maker/Reviewer/Orchestrator 역할, PowerShell run 생성, 동일 Target SHA 검토·시험, 안전 규칙 및 현재 수동 연동 제약을 설명한다.

- 오프라인 정책 선택(캐시 조회 허용, 온라인 복귀 후 만료 처리)을 반영하고 SRS v1 초안을 작성했다.
- 예정 취소/결제 환불 원인 및 복구 가능성을 분리하고, 참조 무결성 트리거와 가입 시 기본 재무·지갑 초기화 트리거를 SQL 초안에 추가했다.
- 포인트 적립을 공식 정산 보장이 없는 앱 예상치로 정리하고 기능 명세 및 인수인계 내용을 최신 결정에 맞췄다.
- 복구된 과거 예정 취소 항목의 재표시와 수동 포인트 보정 이후 환불 원장 처리를 사용자와 확정하고 결정 문서에 반영했다. 통합 문서와 SQL의 기준 우선순위도 명확히 했다.
- 계정 삭제 시 개인 데이터와 비공개 아이콘을 삭제하고 공용 카탈로그/일정은 보존하도록 요구사항을 확정했다. 개별 지출 삭제 금지의 계정 삭제 예외와 Storage 정리 작업을 명시했다.
- 예산 0원은 미설정으로 보고 80%/100% 비율 경고와 초과 확인을 생략하기로 결정해 SRS 및 기능 명세에 반영했다.
- 예산을 넘기는 등록뿐 아니라 예상액을 증가시키는 수정·복구·결제 변경 전에도 확인을 요구하도록 확정하고 명세했다.
- 포인트 적립은 Google/Galaxy Store를 실제 결제수단으로 고른 경우에만 발생하도록 확정했다. WALLET 결제 + 포인트 사용은 적립하지 않으며 기준을 SQL 초안에도 반영했다.
- 구독 템플릿 비활성화 시 생성된 미결제 회차는 취소하고 재활성화해도 자동 복구하지 않으며, 명시적 복구를 허용하도록 확정했다.
- 구독 템플릿 자체의 물리 삭제도 금지하고 비활성화만 허용하도록 확정해 SRS와 RLS 초안을 갱신했다.
- SRS 검토의 사용자 결정, 작업 위치, 파일 변경, 검증 미수행 상태 및 다음 절차를 `docs/srs-review-checkpoint.md`에 저장해 재개 지점으로 지정했다.
- SQL 실행 검증과 자동 테스트는 수행하지 않았다.

- SKILL의 토큰/맥락 부족 대응 절차를 추가해 사용자에게 사전 알림하고 `docs/progress.md`에 체크포인트를 저장하도록 했다.
- 개발 세션마다 프로젝트 진행 현황을 기록하도록 했다.
- SKILL이 지정한 아키텍처·인수인계·할 일·주의사항 문서를 `docs/`로 이동하고, 문서 간 경로 참조를 갱신했다.

- SRS 준비도 검토를 기록하고, 기획/DDL 불일치 해결 전 설계 단계 진입 및 SRS 승인을 보류했다. `docs/to-do.md`에 Phase 0 요구사항 게이트를 추가했다.

- 주요 기획 차단 항목의 충돌, 사용자 영향, 결정 사항 및 완료 기준을 `md/planning-blockers.md`에 정리했다.
- 사용자가 작성한 차단 항목 결정안을 검토했다. 오프라인 만료 모달 충돌, 포인트 계산 표현, 참조 소유권 및 초기화 트리거 누락을 별도 검토 문서에 기록하고 승인 SRS는 보류했다.
- 멀티 에이전트 협업 설계의 병목과 파일 프로토콜, 반복 종료 조건 및 적용 범위에 관한 검토 의견을 `md/multi_agent_collaboration_architecture_review.md`에 기록했다.
- 사용자가 보완한 최종 설계안을 다시 검토해 이전 지적의 반영을 확인하고, 공유 작업 트리에서 `git reset --hard`를 자동 실행할 때의 데이터 손실 위험과 안전 대안을 추가했다.
- 협업 실행용 run/review/test Schema와 아티팩트 규약, 사용자 보고서 템플릿, 깨끗한 Git 상태에서만 격리 worktree를 생성하는 PowerShell 스크립트를 추가했다. 설계안은 자동 강제 reset 대신 실패 상태 보존을 사용하도록 수정했다.
- (2026-10-02 당시 상태) SRS §5~§10 검토를 완료하고 플랫폼 범위를 Windows 데스크톱/Android PWA로 확정했다. 당시 SQL 실행 검증은 보류 중이었으며 2026-10-03 기록에서 완료 및 설계 진입 승인으로 갱신됐다.
