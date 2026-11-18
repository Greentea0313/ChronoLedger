# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Sonnet/Opus 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** (2026-11-18 기준)

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R89` | 다음 Run 예약 | 푸시 알림 설계 조사(문서 전용, Claude Opus) | `docs/to-do.md` R89, 보관 문서 「다음 Run 예약 (`R83`~`R86`)」 절 |
| `R84` | 보류 | 기타 건의 창구(DB 변경). `R89` 후 착수 | `docs/to-do.md` R84, 보관 문서 같은 절 |
| `R85` | 결정 완료·설계 우선 | 일정 시간 단위 표시(분 단위·KST) | `docs/to-do.md` R85, 보관 문서 같은 절 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R39`·`R40`·`R75`·`R87`·`R95` | 후속 · 우선 낮음 | 리뷰 P4 이관·후속 설계 | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r93-income-history-db-and-ui`


- **Run ID**: `r93-income-history-db-and-ui` **(완료, `main` 병합 `a1f17e0`, R93 마이그레이션 운영 적용·확인 쿼리 검증 완료(사용자, 2026-11-16), 실브라우저 확인 대기)** *(`R93`: `public.incomes` 수익 내역 테이블·RLS·계정 탈퇴 정리 연동 + 총 자산 원자적 동기화 RPC `record_income`/`delete_income` + `/dashboard/expenses` `[지출 내역 | 수익 내역]` 전환 탭 조회·삭제 UI)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-16 등록)*
- **Worktree 경로**: `.worktrees/r93-income-history-db-and-ui` (브랜치: `collab/r93-income-history-db-and-ui`, manifest `artifacts/r93-income-history-db-and-ui/run.json`)
- **Base SHA**: `0844387fdffb8a01bb575836df16d57d10355165`
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql`, `sql/SCHEMA.sql` — 금전·자산·RLS·`SECURITY DEFINER` RPC 변경 → Opus 승격 조건 ① 해당). 🐳 로컬 `TESTS.sql` 실행 검증에 Docker Desktop(로컬 Supabase) 또는 로컬 PostgreSQL 필요(Docker 엔진 미실행 시 `.agents/rules/handoff.md` §5에 따라 기다리지 않고 즉시 사용자에게 안내).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 7e8f702)`** | ~~**GPT Codex**~~ ➡️ **Claude Opus** *(1순위 대체로 수행)* | `Maker (R93 DB/RLS/RPC & Types)` | `.worktrees/r93-income-history-db-and-ui`(Base `0844387`)에서 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (🐳 로컬 SQL 실행 검증 시 Docker Desktop 필요) | `✅ 7e8f702`: 마이그레이션·SCHEMA·README·TESTS·타입 반영. tsc·lint·Vitest 69파일/848개·diff-check 통과. ⚠️ 로컬 DB 실행 검증은 미실행(이 PC에 Docker·psql 없음, 사용자 지시로 SQL만 작성) → Step 3에서 수행 |
| **2** | **`✅ DONE (SHA: 7c8883e)`** | **Claude Sonnet** *(Gemini 4 Hydrogen 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (R93 Income History UI & Vitest)` | `.worktrees/r93-income-history-db-and-ui`에서 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/components/finance/income-modal.tsx`, 신규/보강 `src/components/finance/income-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `docs/to-do.md` | `✅ 7c8883e`: 수익 모달 `record_income` 연동, `[지출 내역 \| 수익 내역]` 탭·조회·삭제 UI. tsc·lint·Vitest 862개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (리뷰: 0844387 ↔ 7c8883e, 산출물 2d12115, main 병합 a1f17e0)`** | **Claude Opus** *(Gemini 4 Hydrogen / Gemini 4 Argon 1순위 대체, GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `0844387` ↔ Step 2 Target SHA 통합 정적 코드 리뷰(`review.json`·`test.json`), 로컬 DB 마이그레이션 2회 멱등 적용 및 `TESTS.sql` 검증, `main` 병합, 운영 DB 마이그레이션 안내 및 `docs/` 마감 | `✅` P1~P3 없음, P4 2건 to-do `R95` 이관. 🐳 로컬 DB 마이그레이션 2회(멱등)·`TESTS.sql` 39개 PASS, Vitest 862개·병합 후 1484개 통과. **R93 마이그레이션 운영 적용·확인 쿼리 완료(사용자), 실브라우저 확인 대기** (아래 Step 3 완료 기록 참고) |

#### 📝 `r93-income-history-db-and-ui` Step 3 완료 기록 (Claude Opus, 2026-11-16)

- **차단 해제**: 사용자가 작업 PC에서 `collab/r93-income-history-db-and-ui`를 push함 → 이 PC에서 fetch 후 워크트리를 다시 만들어 진행함.
- **리뷰 범위**: Base `0844387` ↔ Target `7c8883e`. 산출물 `artifacts/r93-income-history-db-and-ui/iteration-01/review.json`·`test.json`(커밋 `2d12115`)임. Step 1은 다른 세션의 Claude Opus가 작성해 같은 모델 리뷰라는 독립성 한계가 있음.
- **SQL·RLS 확인**: `incomes`는 `authenticated` SELECT만 허용(본인 행 정책), 쓰기 권한 없음, 계정 삭제 대기 차단 정책·트리거 적용. `record_income`·`delete_income`은 `SECURITY DEFINER`·`search_path` 고정·`auth.uid()` 본인 확인·입력 검증 후 수익 행과 `total_asset`을 한 트랜잭션에서 함께 바꾸고, `anon` 실행 권한 회수. 재정의한 탈퇴 정리 함수는 기존 본문과 동일하고 `incomes` 삭제 한 줄만 추가됨. `total_asset`은 원래 음수 허용이라 삭제 시 오류 없음. P1~P3 없음.
- **화면 확인**: 수익 모달은 `record_income` 우선, 함수 부재(`PGRST202`·`42883`)일 때만 기존 자산 갱신으로 대체해 이중 반영이 없음. 수익 내역 탭은 오프라인 가드 후 `delete_income` 호출·목록 재조회, 테이블 미적용 시 빈 목록 처리.
- **P4 2건 (to-do `R95` 이관)**: `R93-REV-001` 수익 삭제 실패 시 RPC 사유(삭제 대기 등) 대신 일반 문구만 표시. `R93-REV-002` 탈퇴 정리 함수를 재정의하는 이전 마이그레이션을 다시 실행하면 `incomes` 삭제 줄이 빠짐(단, `auth.users` CASCADE로 실제 삭제는 됨) → README 경고 추가 권장. **후속 정정(2026-11-16, 사용자 지적)**: README R93 행(확인 쿼리·재실행 경고 포함)이 B표가 아니라 D표(아카이브)에 잘못 들어가 있었음 → B표로 옮김. 재실행 경고는 이미 있어 `R93-REV-002`는 해결됨. 리뷰에서 놓친 부분임.
- **검증**: 🐳 로컬 Supabase를 초기화하고 `0844387` 스키마 적용 → R93 마이그레이션 2회 적용(멱등) → 권한 확인(`authenticated` INSERT·`anon` SELECT 없음) → `TESTS.sql` 전체 통과(39개 PASS, R93 블록 포함). 워크트리 tsc·lint·diff-check·build 통과, Vitest 69파일/862개 통과. `main` 병합 `a1f17e0` 후 tsc·Vitest 159파일/1484개 통과함.
- **사용자 수동 작업 남음**:
  1. ✅ (사용자, 2026-11-16 적용·확인 쿼리 검증 완료) 운영 DB에 `sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql` 적용 후 `sql/README.md` R93 확인 쿼리 실행. 적용 전에는 수익 등록이 기존 방식(자산만 증가)으로 동작하고 수익 내역 탭은 비어 있음.
  2. 실브라우저: 수익 등록 → 총 자산 증가·수익 내역 표시, 수익 삭제 → 총 자산 감소.

#### 🛑 `r93-income-history-db-and-ui` Step 3 차단 기록(해제됨) (Claude Opus, 2026-11-16)

- **원인**: Step 1 `7e8f702`·Step 2 `7c8883e` 커밋과 브랜치 `collab/r93-income-history-db-and-ui`가 이 PC 저장소와 원격(`origin`) 어디에도 없음(`git cat-file`·`git ls-remote --heads`로 확인). `.worktrees/r93-income-history-db-and-ui`도 없음. Step 1 기록의 "이 PC에 Docker·psql 없음" 문구로 보아 다른 PC에서 작업 후 브랜치를 push하지 않은 것으로 판단함(문서 커밋만 반영됨).
- **해제 방법**: 작업한 PC에서 `git push origin collab/r93-income-history-db-and-ui` 후 이 PC에서 `git fetch` → Step 3을 `▶ READY`로 되돌려 리뷰 진행함. 리뷰에는 🐳 Docker Desktop 필요(2026-11-16 이 PC 엔진 실행 확인).

#### 📝 `r93-income-history-db-and-ui` Step 2 완료 기록 (Claude Sonnet, 2026-11-16)

- **Target SHA**: `7c8883e` (워크트리 브랜치 `collab/r93-income-history-db-and-ui`, 미병합)임. 변경 파일: `income-modal.tsx`·`income-modal.test.tsx`, `dashboard/expenses/page.tsx`·`page.test.tsx`뿐임(SQL·타입 변경 없음).
- **수익 모달**: 제출 시 `record_income`(`p_category`, 앞뒤 공백 제거한 `p_title`, `p_amount`, `p_income_date`(없으면 KST 오늘), `p_memo: null`)을 먼저 호출함. 함수 부재(`PGRST202`/`42883`)일 때만 기존 `set_user_finance_settings`(실패 시 직접 `update`) 경로로 폴백하고, 그 외 오류는 폴백 없이 "수익을 등록하지 못했습니다" 오류를 보여줌(이중 반영 방지).
- **소비 페이지**: `incomes`를 `income_date DESC, created_at DESC`로 조회하고 테이블 미적용(`42P01`/`PGRST205`)은 빈 목록으로 폴백함. 전체 지출 내역 카드 헤더 맨 위에 `[지출 내역 | 수익 내역]` 전환 버튼(`aria-pressed`, 기본 지출)을 둠. 수익 내역은 건수·총 수익 안내, 데스크톱 표·모바일 카드, 10건 단위 페이지 이동, 항목별 `삭제` → 확인 다이얼로그(자산 차감 금액 안내) → `delete_income` RPC → 목록 재조회(`isOffline()` 가드, 실패 시 다이얼로그에 오류 유지)임. 0건이면 지정한 EmptyState를 보여줌. 수익 등록 완료 시에도 목록을 다시 불러옴.
- **유지**: 지출 내역 뷰(취소 숨기기·과거 기록·표/카드·페이지네이션)는 그대로이고, 지출 뷰에서는 수익 코드가 렌더되지 않음.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`(CRLF 경고만), Vitest 69파일 862개 통과함(모달 5개·소비 페이지 10개 테스트 추가·갱신). 실브라우저·실DB 확인은 하지 않음(Step 1 SQL도 로컬 DB 미실행 상태임).
- **가정**: 수익 페이지 이동은 이전/다음 버튼 방식임(지출 쪽 번호 버튼은 만들지 않음). 총 자산 표시는 이 페이지에 없어 삭제 후 별도 갱신은 하지 않음.
- **다음 단계**: Step 3(`Claude Opus`, 통합 리뷰·로컬 DB 검증·병합·운영 마이그레이션 안내) `▶ READY`임.

#### 📝 `r93-income-history-db-and-ui` Step 1 완료 기록 (Claude Opus — GPT Codex 1순위 대체, 2026-11-16)

- **Target SHA**: `7e8f702` (워크트리 브랜치 `collab/r93-income-history-db-and-ui`, 미병합)임. 변경 파일: 신규 `sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`.
- **테이블·권한**: `public.incomes`를 수용 기준 컬럼·CHECK·인덱스대로 만듦. `authenticated`는 `SELECT`만 있고 직접 쓰기 권한 없음(쓰기는 RPC 전용), `anon` 권한 없음. 본인 조회 정책 + 계정 삭제 대기 차단 RESTRICTIVE 정책·트리거. `SCHEMA.sql`은 공통 차단 루프 2곳에 `'incomes'`를 넣고 테이블은 `user_finances` 바로 뒤에 둠.
- **RPC**: `record_income`(검증 → 행 INSERT(항목명 앞뒤 공백 제거) → `total_asset` 증액, 새 id 반환), `delete_income`(본인 행 `FOR UPDATE` 조회 → DELETE → `total_asset` 차감). 둘 다 `SECURITY DEFINER`, `search_path = public`, 미인증·계정 삭제 대기 거부, `anon` 실행 권한 회수.
- **탈퇴 정리**: `purge_expired_account_deletion_requests`에 `DELETE FROM public.incomes` 추가(마이그레이션은 SCHEMA 본문 그대로 재정의). README에 "구버전 purge 본문 마이그레이션을 다시 돌렸다면 이 파일 재실행" 주의 기록함.
- **TESTS.sql**: R35 블록 뒤(사용자 A가 계정 삭제 대기 상태인 구간)에 R93 블록 추가. 사용자 B 등록·자산 증액·입력 거부 4종·직접 INSERT/UPDATE/DELETE 거부·타인 행 은닉·타인 삭제 거부·삭제 후 자산 복원·재삭제 거부, 사용자 A(삭제 대기) 등록·삭제 거부·조회 0행, purge 연동·트리거 존재, `anon` 조회·RPC 거부를 확인함.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check` 통과, Vitest 69파일/848개 통과함. **로컬 DB 실행은 하지 않음**(이 PC에 Docker Desktop·psql·Supabase CLI 없음, 사용자 지시로 SQL만 작성). 🐳 Step 3에서 마이그레이션 2회 적용·`TESTS.sql` 전체 실행 필요함.
- **가정**: `delete_income`은 `user_finances` 행이 있다고 보고 `UPDATE`만 함(가입 트리거가 항상 만들고 탈퇴 정리 때만 지워짐). 메모 길이 상한은 수용 기준에 없어 두지 않음.
- **다음 단계**: Step 2(`Claude Sonnet`, 대체 Gemini 4 Hydrogen / GitHub Copilot) `▶ READY`임.

#### 📌 `r93-income-history-db-and-ui` 배경 및 단계별 수용 기준 (Acceptance Criteria)

- **배경 (사용자 요청·결정 확정, 2026-11-16)**:
  - 현재 `IncomeModal`(`src/components/finance/income-modal.tsx`)은 수익 유형(`급여`, `용돈`, `상여금`, `금융수익`, `기타`)·항목명·입금 금액·입금일을 입력받지만 `set_user_finance_settings` RPC로 `user_finances.total_asset`만 증액하고 개별 수익 레코드를 저장하지 않아, 등록한 수익 내역을 확인하거나 오입력한 수익을 삭제(총 자산 차감 복원)할 경로가 없음.
- **단계별 수용 기준**:
  1. **Step 1 (`GPT Codex` — `R93` DB 스키마·RLS·탈퇴 정리·원자적 RPC·타입 & SQL 테스트)**:
     - `sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql` 신규 작성(재실행 멱등 보장) 및 `sql/SCHEMA.sql` 동기화:
       - **`public.incomes` 테이블 생성**:
         - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
         - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
         - `category VARCHAR(50) NOT NULL CHECK (category IN ('급여', '용돈', '상여금', '금융수익', '기타'))`
         - `title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100)`
         - `amount BIGINT NOT NULL CHECK (amount > 0)`
         - `income_date DATE NOT NULL`
         - `memo TEXT`
         - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
         - 인덱스: `idx_incomes_user_date ON public.incomes(user_id, income_date DESC, created_at DESC)`
       - **RLS 및 권한 경계 (원장 무결성 보장)**:
         - `ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;`
         - `REVOKE ALL ON public.incomes FROM PUBLIC, anon, authenticated;`
         - `GRANT SELECT ON public.incomes TO authenticated;` *(총 자산 `user_finances.total_asset`과의 불일치를 원천 차단하기 위해 클라이언트 직접 `INSERT`/`UPDATE`/`DELETE` 권한은 부여하지 않고, 아래 `SECURITY DEFINER` RPC로만 등록·삭제를 수행함)*
         - 본인 조회 정책: `"Read own incomes" ON public.incomes FOR SELECT TO authenticated USING (auth.uid() = user_id);`
         - 계정 삭제 대기 사용자 차단: `RESTRICTIVE` 정책 `"Block account deletion users from incomes"` 및 `BEFORE INSERT OR UPDATE OR DELETE` 트리거 `block_pending_account_deletion_incomes`(`public.block_pending_account_data_mutations()`) 연결 (`SCHEMA.sql`의 루프 목록에도 `'incomes'` 포함).
         - 계정 탈퇴 영구 정리 연동: `public.purge_expired_account_deletion_requests(INTEGER)` 함수 내 개인 데이터 삭제 목록에 `DELETE FROM public.incomes WHERE user_id = v_req.user_id;` 추가(기존 `user_favorite_schedules`·`user_character_presets` 등 모든 삭제문 유지 필수).
       - **원자적 `SECURITY DEFINER` RPC 2종 (`SET search_path = public`)**:
         - **`public.record_income(p_category VARCHAR(50), p_title VARCHAR(150), p_amount BIGINT, p_income_date DATE, p_memo TEXT DEFAULT NULL) RETURNS UUID`**:
           - `auth.uid()` 검증(미인증 시 `'인증되지 않은 사용자입니다.'`) 및 `public.account_deletion_is_pending(auth.uid())` 검증(대기 중이면 `'계정 삭제가 진행 중이므로 개인 데이터를 변경할 수 없습니다.'`).
           - 입력 검증: `p_category IN ('급여', '용돈', '상여금', '금융수익', '기타')`, `p_title IS NOT NULL AND length(btrim(p_title)) BETWEEN 1 AND 100`, `p_amount IS NOT NULL AND p_amount > 0`, `p_income_date IS NOT NULL`.
           - `public.incomes`에 행을 `INSERT`하고, 같은 트랜잭션에서 `public.user_finances`의 `total_asset`을 `+ p_amount`만큼 원자적으로 증액(`INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at) VALUES (v_user_id, p_amount, 0, NOW()) ON CONFLICT (user_id) DO UPDATE SET total_asset = public.user_finances.total_asset + EXCLUDED.total_asset, updated_at = NOW()`)한 뒤 생성된 `id`를 반환함.
           - `REVOKE ALL ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.record_income(VARCHAR, VARCHAR, BIGINT, DATE, TEXT) TO authenticated;`
         - **`public.delete_income(p_income_id UUID) RETURNS VOID`**:
           - `auth.uid()` 및 계정 삭제 대기 여부 검증.
           - `SELECT * INTO v_income FROM public.incomes WHERE id = p_income_id AND user_id = v_user_id FOR UPDATE;`로 본인 소유 수익 행을 잠금 조회하고, 없으면 `'삭제할 수 있는 본인 소유의 수익 내역이 아닙니다.'` 예외 발생.
           - `DELETE FROM public.incomes WHERE id = p_income_id AND user_id = v_user_id;` 수행 후, 같은 트랜잭션에서 `UPDATE public.user_finances SET total_asset = total_asset - v_income.amount, updated_at = NOW() WHERE user_id = v_user_id;`로 총 자산을 차감 복원함.
           - `REVOKE ALL ON FUNCTION public.delete_income(UUID) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.delete_income(UUID) TO authenticated;`
     - `sql/README.md` B표에 `MIGRATION_R93_INCOME_HISTORY.sql` 행 및 확인 쿼리(테이블·RLS 정책·권한 `anon_select=false, auth_select=true, auth_insert=false`·RPC 2종·`purge_expired_account_deletion_requests` 연동 확인) 추가.
     - `sql/tests/TESTS.sql`에 R93 스모크 테스트 블록 추가 (`record_income` 호출 시 `incomes` 행 생성 및 `user_finances.total_asset` 증액, 잘못된 카테고리/0 이하 금액 거부, `delete_income` 호출 시 행 삭제 및 `total_asset` 차감 복원, 타 사용자 `SELECT` 0행 및 `delete_income` 거부, `authenticated` 직접 `INSERT`/`DELETE` 거부, `anon` 접근 거부, 계정 삭제 대기 사용자 `record_income`/`delete_income` 거부) 및 로컬 DB 실행 검증.
     - `src/types/database.types.ts`에 `incomes` 테이블(`Row`, `Insert`, `Update`, `Relationships`) 및 `record_income`·`delete_income` RPC 타입 반영 후 `npx tsc --noEmit` 통과 확인.
  2. **Step 2 (`Claude Sonnet` / `Gemini 4 Hydrogen` — `R93` 수익 내역 UI·삭제 연동 & Vitest 테스트)**:
     - **`src/components/finance/income-modal.tsx`**:
       - 수익 등록 시 `supabase.rpc("record_income", { p_category: category, p_title: title.trim(), p_amount: incomeAmount, p_income_date: incomeDate || getKstToday(), p_memo: null })`를 우선 호출하도록 변경함.
       - 운영 DB에 아직 R93 마이그레이션이 적용되지 않아 함수 부재 오류(`PGRST202` 또는 `42883`)가 반환될 때만 기존 `set_user_finance_settings` 경로로 폴백하여 자산 증액이 중단되지 않게 함.
     - **`src/app/dashboard/expenses/page.tsx`**:
       - 로그인 사용자의 `incomes` 목록(`id, category, title, amount, income_date, memo, created_at`, `income_date DESC, created_at DESC` 정렬)을 조회함. 테이블 미적용(`42P01`/`PGRST205`) 오류 시 빈 배열로 비차단 폴백함.
       - 하단 내역 카드(`전체 지출 내역`) 헤더에 **`[지출 내역 | 수익 내역]`** 전환 탭(또는 버튼 그룹, 기본값 `지출 내역`)을 배치함:
         - `지출 내역` 선택 시: 기존 `취소 내역 숨기기` 체크박스, `과거 기록` 토글, 지출 데스크톱 표/모바일 카드 및 페이지네이션을 그대로 표시함.
         - `수익 내역` 선택 시:
           - 등록된 수익 건수 및 총 수익 합계 안내, 데스크톱 표(`입금일`, `항목명`, `수익 유형`, `입금 금액 (+N 원)`, `액션`) 및 모바일 카드 뷰, 10건 단위 페이지네이션을 표시함.
           - 각 수익 항목에 **`[삭제]`** 버튼을 두고 클릭 시 확인 다이얼로그(`"'{title}' 수익 내역을 삭제하시겠습니까? 삭제 시 총 자산에서 {amount}원이 차감됩니다."`)를 거쳐 `supabase.rpc("delete_income", { p_income_id })`를 호출함(`isOffline()` 가드 포함). 삭제 완료 후 수익 목록을 갱신함.
           - 수익 내역이 0건이면 `EmptyState`(`message="등록된 수익 내역이 없습니다."`, `hint="우측 상단 '+ 수익 추가' 버튼으로 새 수익을 등록해 보세요."`)를 표시함.
     - **단위 테스트**: `src/components/finance/income-modal.test.tsx`(신규, `record_income` 호출·미적용 DB `PGRST202` 폴백·유효성 검증) 및 `src/app/dashboard/expenses/page.test.tsx`(`[지출 내역 | 수익 내역]` 탭 전환, 수익 목록 표시, 수익 삭제 확인 다이얼로그 및 `delete_income` 호출, 테이블 미적용 `42P01` 폴백) 추가. `npx tsc --noEmit`, `npm run lint`, `git diff --check`, `npx vitest run --dir src` 통과 후 워크트리에 커밋함.
  3. **Step 3 (`Claude Opus` — 통합 정적 리뷰 및 마감)**:
     - Base `0844387` ↔ Step 2 Target SHA 정적 코드 리뷰(`review.json`·`test.json`), 로컬 DB 마이그레이션 2회 멱등 적용 및 `TESTS.sql` 전체 통과 확인, `main` 병합, 운영 DB 마이그레이션 체크리스트 등록 및 `docs/` 마감.
