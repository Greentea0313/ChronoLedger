# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **현재 활성 Run 없음** *(직전 `r96-web-push`(`18d5f0c`)·`r102-expense-presets`(`9ff2ae6`) 완료·`main` 병합, 2026-11-24. 다음 Run은 예약 요약표에서 사용자가 지목하면 Orchestrator가 등록함)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R39` | 완료 (`r39-daily-notifications`, `main` 병합 `9ae05f9`, 2026-11-24) | 운영 DB 적용·확인 쿼리 완료(사용자, 2026-11-24). 실브라우저·KST 09:00 알림 생성 확인 대기. P4 후속 `R39-REV-01`(타입 전용) | `docs/to-do.md` R39, 아래 직전 완료 Run 기록 |
| `R96` | 완료 (`r96-web-push`, `main` 병합 `18d5f0c`, 2026-11-24) | 운영 DB 마이그레이션·Edge Function 배포·시크릿·DB 설정값·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 설정 대기(사용자, §11.5). P3 `R96-REV-07`·P4 2건 후속 | `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R97` | 완료 (`r97-tauri-notifications`, `main` 병합 `d350267`, 2026-11-23) | 엣지 케이스 보완 병합 및 `npm run tauri dev` 실기기 OS 토스트 수신 확인 완료(개발 실행 시 발신 앱 `Windows PowerShell` 표기). 선택 후속 `R97-REV-001`(P4)이 `docs/to-do.md`에 있음 | [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |
| `R101`+`R103` | 완료 (`r101-r103-two-month-budget-and-shortcuts`, `main` 병합 `c942e1e`, 2026-11-24) | 당월·익월 예산 비교 카드와 데스크톱 단축키·빠른 시작 안내 병합 완료. 실브라우저 확인은 사용자 몫이고 선택 후속 `R101-REV-001`(P4)이 `docs/to-do.md`에 있음 | 아래 직전 완료 Run 기록 |
| `R102` | 완료 (`r102-expense-presets`, `main` 병합 `9ff2ae6`, 2026-11-24) | 운영 DB 마이그레이션 수동 적용(R96 다음)·실브라우저 확인 대기(사용자) | `docs/to-do.md` R102 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |

### 🗂️ 직전 완료 Run 기록: `r102-expense-presets`

- **Run ID**: `r102-expense-presets` **(완료, `main` 병합 `9ff2ae6`, 2026-11-24)** *(`R102` 자주 쓰는 과금 프리셋 사용자 DB 저장: `public.user_expense_presets` 최대 20개 + `ExpenseModal` 상단 칩 원클릭 적용·**`[프리셋 저장]`**·삭제 — 명세 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3, `r96-web-push`와 병행)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-24 등록)*
- **Worktree 경로**: `.worktrees/r102-expense-presets` (브랜치: `collab/r102-expense-presets`, 매니페스트: `artifacts/r102-expense-presets/run.json`)
- **Base SHA**: `052e53acdd7d22031bcee020487f91bd37718ad5`
- **Target SHA**: `56e4ab8234218b6085968687a108859481df4497` *(iteration-02, 산출물 `dd1beb7`, `main` 병합 `9ff2ae6`. iteration-01 `bffa1e4`, Step 1 DB `a6a36ed`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`). `LOCAL_DB_DEFERRED`는 Step 3에서 🐳 로컬 DB 검증으로 해소함. **운영 DB 적용은 R96 다음 순서로 사용자 수동 적용 대기**.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: a6a36ed304d6b6a53f04b75851b0c6697af8b352)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R102 DB/RLS/Trigger & Types)` | 아래 **Step 1 수용 기준** 수행(🐳 Docker Desktop 필요, 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 진행). 허용 파일: 신규 `sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ a6a36ed`: `MIGRATION_R102_EXPENSE_PRESETS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. `tsc`·`lint`·`diff-check`·Vitest 74파일/977개 통과. ⚠️ `LOCAL_DB_DEFERRED`(Docker 미설치, 아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: bffa1e45abeac81074122dbb9c51550f155bdf85)`** | **Claude Sonnet** *(Fallback 1: Gemini 4 Hydrogen, Fallback 2: GitHub Copilot)* | `Maker (ExpenseModal 프리셋 칩·[프리셋 저장]·삭제 UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ bffa1e4`: ExpenseModal 프리셋 칩·`[프리셋 저장]`·삭제·미적용 DB 폴백. tsc·lint·Vitest 993개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (산출물 dd1beb7, main 병합 9ff2ae6)`** | **Claude Opus** *(Fallback 1: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. Base(`052e53acdd7d22031bcee020487f91bd37718ad5`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감 | iteration-01 리뷰 P2 1건(R96과 탈퇴 정리 함수 충돌) → iteration-02 수정 `56e4ab8` clean. 🐳 R96+R102 업그레이드 각 2회·신규 `SCHEMA.sql`·`TESTS.sql` 44개 PASS, tsc·lint·Vitest 76파일/1013개·`next build` 통과 후 `main` 병합 `9ff2ae6` |

#### 📝 `r102-expense-presets` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-24)

- **Target SHA**: `a6a36ed304d6b6a53f04b75851b0c6697af8b352` (워크트리 브랜치 `collab/r102-expense-presets`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·트리거·RLS·탈퇴 변경**:
  - `public.user_expense_presets` 테이블(`title` 1~150자·`category` 5종·`game_id` `ON DELETE SET NULL`·`original_price >= 0`·`payment_method` 2종·`point_platform` NULL 또는 2종·`deduct_from_asset`·`sort_order`), `idx_user_expense_presets_user_sort` 인덱스 생성함(`SCHEMA.sql`에서는 `games`·`expenses` 뒤, 공통 계정 삭제 대기 루프 앞에 배치).
  - `public.enforce_user_expense_presets_limit()` (`SECURITY DEFINER SET search_path = public`, `pg_advisory_xact_lock`으로 동일 사용자 동시 INSERT 직렬화 후 20개 이상 시 `23514` 예외 발생, 직접 실행 권한 회수) 및 `trg_enforce_user_expense_presets_limit` (`BEFORE INSERT`) 추가함.
  - RLS 활성화(`Manage own expense presets`, 본인 행 CRUD 허용, `anon` 차단), 계정 삭제 대기 차단 RESTRICTIVE 정책·트리거(`SCHEMA.sql` 공통 루프 2곳 포함) 및 `purge_expired_account_deletion_requests`에 `DELETE FROM public.user_expense_presets WHERE user_id = v_req.user_id;` 추가함.
  - `sql/README.md` B표 확인 쿼리·선행 purge 주의 추가, `sql/tests/TESTS.sql` `R102-01`~`R102-04` 스모크 블록(RLS·CHECK·20개 상한·삭제 후 재등록·게임 `SET NULL`·삭제 대기 차단·탈퇴 정리·`anon` 차단) 추가, `src/types/database.types.ts` `user_expense_presets` 타입 추가함.
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(74파일 / 977개 통과) 확인함.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED`)**: 현재 PC Docker CLI 미설치(`NO_DOCKER`)로 로컬 Supabase 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 실행 검증은 미수행임. Step 3(Docker 환경)에서 로컬 DB 병합 게이트 검증 필수임.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 이어가려면 `git -C .worktrees/r102-expense-presets push -u origin collab/r102-expense-presets` 필요함.
- **다음 단계**: Step 2(**Claude Sonnet**, Fallback 1: **Gemini 4 Hydrogen**, Fallback 2: **GitHub Copilot** — `ExpenseModal` 프리셋 칩·`[프리셋 저장]`·삭제 UI & Vitest) `▶ READY`임.

#### 📝 `r102-expense-presets` Step 2 완료 기록 (Claude Sonnet, 2026-11-24)

- **Target SHA**: `bffa1e45abeac81074122dbb9c51550f155bdf85` (워크트리 브랜치 `collab/r102-expense-presets`, 미병합·원격 push 안 함). SQL·타입 변경 없음. 변경 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`(허용 2개 파일만, `run.json` 미수정).
- **칩 목록·적용**: 신규 등록 모드(`!plannedExpense && !editingExpense`)에서 모달이 열릴 때 `user_expense_presets`를 `sort_order`·`created_at` 오름차순으로 조회해 `자주 쓰는 과금` 칩으로 표시함. 선택한 게임의 프리셋과 공통(`game_id === null`) 프리셋만 보이고, 칩 클릭 시 항목명·카테고리·게임(게임 카테고리이고 프리셋에 게임이 있을 때)·정가·실결제액·결제수단·플랫폼(`point_platform ?? "OTHER"`)·총자산 차감을 채우며 할인·쿠폰·사용 포인트·적립 입력은 비움. 게임이 아닌 카테고리 프리셋은 게임을 비우고 플랫폼을 `OTHER`로 둠(기존 카테고리 변경 동작과 동일).
- **삭제**: 칩의 `×`가 해당 프리셋을 `DELETE`하고 칩을 제거함(`isOffline()` 가드, 실패 시 칩 유지·오류 표시).
- **`[프리셋 저장]`**: 항목명 1~150자, 정가 0 이상 정수를 검증하고 `INSERT`(`game_id`는 게임 카테고리에서 선택한 게임 또는 `null`, `point_platform`은 스토어 플랫폼일 때만, `sort_order`는 현재 개수) 후 목록을 다시 불러와 칩을 갱신함. 이미 20개면 요청 없이 "최대 20개" 안내, DB 트리거 `23514`도 같은 문구, 오프라인은 오프라인 안내, 테이블 미적용은 "DB 업데이트(R102) 적용 후" 안내를 표시함.
- **미적용 DB 폴백**: 조회가 `42P01`/`PGRST205`이면 프리셋 영역 전체를 숨기고 오류를 기록하지 않으며 나머지 지출 입력은 그대로 동작함. 예정 지출 결제·수정 모드에서는 프리셋 영역도 조회도 하지 않음.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`(CRLF 경고만), Vitest 74파일 993개 통과함(프리셋 테스트 16개 추가: 조회·게임별 필터·필드 채움·비게임 적용·삭제 성공/실패/오프라인·저장·게임 저장·검증·20개 상한 클라이언트/DB·오프라인·미적용 2종·결제/수정 모드 숨김). 실브라우저·실DB 확인은 하지 않음.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED` 유지)**: Step 1의 로컬 Supabase 2회 멱등 적용·`SCHEMA.sql`·`TESTS.sql` 실행은 여전히 미수행이며 Step 3(🐳 Docker 환경)이 맡음.
- **가정**: 프리셋 칩은 게임 선택 후에야 해당 게임 전용 프리셋이 보이는 명세(§3.2) 그대로임. 프리셋 이름 변경·순서 변경 UI는 명세에 없어 만들지 않음. 같은 제목의 프리셋 중복 저장은 막지 않음.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC(Docker)에서 Step 3을 하려면 `git -C .worktrees/r102-expense-presets push -u origin collab/r102-expense-presets` 필요함.
- **다음 단계**: Step 3(`Claude Opus`, Base `052e53a` ↔ Target `bffa1e4` 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`임.

#### 📝 `r102-expense-presets` Step 3 리뷰·iteration-02·병합 기록 (Claude Opus, 2026-11-24)

- **iteration-01 리뷰** (Base `052e53a` ↔ Target `bffa1e4`, 산출물 `a9496ef`): 화면 로직(칩 필터·원클릭 적용·20개 사전 확인·오프라인·미적용 DB 폴백)과 R102 자체 로컬 DB(2회 멱등·`TESTS.sql` 43개 PASS)는 이상 없음. **R102-REV-01(P2)**: 병행 Run r96과 둘 다 `purge_expired_account_deletion_requests` 전체를 다시 정의하는데 R102 본문에 `push_subscriptions` 삭제가 없어, 운영 DB에 R96 → R102 순서로 적용하면 탈퇴 시 푸시 구독 정리가 빠짐.
- **iteration-02 수정** (Claude Opus, `56e4ab8`): r96 병합 후 `main`을 Run 브랜치에 합치고 `SCHEMA.sql`(공통 루프 2곳에 두 테이블)·README·`TESTS.sql`(R96 블록 뒤 R102 블록)·타입 충돌 해결. R102 마이그레이션의 탈퇴 정리 함수에 `push_subscriptions` 삭제를 넣고 "R96 적용 후 실행" 선행 조건과 재실행 주의를 README에 적음. ⚠️ 수정과 재리뷰를 같은 모델이 함.
- **검증**: 🐳 Base `052e53a` + R96 2회 + R102 2회 → `TESTS.sql` 44개 PASS, 탈퇴 정리 함수에 두 테이블 모두 포함 확인. 신규 `SCHEMA.sql` → 44개 PASS → 두 마이그레이션 재실행 무오류, README 확인 쿼리 기대값 일치. tsc·lint·Vitest 76파일/1013개·`next build` 통과.
