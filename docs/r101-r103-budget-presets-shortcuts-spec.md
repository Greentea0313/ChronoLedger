# R101 · R102 · R103 신규 기능 확정 명세 및 R104 보류 결정 (2026-11-24 Chief Architect 확정)

- **작성일**: 2026-11-24
- **작성 주체**: Gemini 4 Argon (`Chief Architect`, `📐 SPEC_NEEDED` 구체화)
- **관련 항목**: `R101`(당월+익월 2개월 예산·고정비 비교 뷰), `R102`(DB 저장 과금 프리셋 및 지출 모달 원클릭 적용), `R103`(데스크톱 키보드 단축키 및 선택형 빠른 시작 안내), `R104`(단기 픽업 재화·과금 계산기 — 보류)

---

## 1. 사용자 확정 결정 사항 (2026-11-24 질문 카드 확정)

1. **Run 분할 및 착수 순서**:
   - **1차 Run (`r101-r103-two-month-budget-and-shortcuts`)**: DB 변경이 전혀 없어 현재 PC(Docker 미설치 환경)에서 구현·리뷰·`main` 병합까지 즉시 완결 가능한 **`R101` + `R103`**을 먼저 진행함.
   - **2차 Run (`r102-expense-presets`)**: DB/RLS 마이그레이션이 필요한 **`R102`**는 2차 Run으로 분리함.
2. **`R101` 익월 예상 지출 산출 기준**:
   - 익월 예산(`monthly_budgets` 익월 설정값, 미설정/0원이면 `user_finances.default_budget` 기본 예산 폴백) 대비 **① 이미 DB에 등록된 익월 귀속 `CONFIRMED`/`PLANNED` 지출**과 **② 아직 익월 `PLANNED` 행이 생성되지 않은 활성 월간 고정 구독(`MONTHLY_DAY` `subscription_templates`)의 예상 고정비(중복 템플릿 제외)**를 합산하여 당월·익월의 고정비·예정 지출·예상 잔여 예산을 나란히 비교함.
3. **`R102` 과금 프리셋 구성 및 UI**:
   - `public.user_expense_presets` 테이블(계정당 최대 20개, 특정 게임 연결 `game_id` 또는 공통 `NULL` 허용)에 저장하고, 지출 모달(`ExpenseModal`) 상단 칩에서 원클릭 적용·삭제 및 **`[프리셋 저장]`** 버튼으로 현재 입력값 즉시 저장을 지원함.
4. **`R104` (단기 픽업 재화·과금 계산기)**:
   - **`⏸️ 보류`**로 결정함(사용자가 직접 호출할 때만 재검토하며 자동 착수·재개 추천하지 않음).

---

## 2. 1차 Run (`r101-r103-two-month-budget-and-shortcuts`) 상세 명세

### 2.1 `R101`: 당월 + 익월(2개월) 예산·고정 구독비·예정 지출 비교 뷰

1. **순수 계산 로직 확장 (`src/lib/budget-calculations.ts`)**:
   - `getNextMonthKey(month: MonthKey): MonthKey`: 12월이면 `{ year: month.year + 1, month: 1 }`, 그 외 `{ year: month.year, month: month.month + 1 }` 반환.
   - 입력 인터페이스:
     ```ts
     export interface BudgetComparisonExpense extends BudgetExpense {
       template_id?: string | null
     }

     export interface BudgetSubscriptionTemplate {
       id: string
       is_active: boolean
       cycle_type?: "MONTHLY_DAY" | "INTERVAL_30" | "VERSION_PASS" | string
       default_price: number
     }

     export interface MonthBudgetBreakdown {
       month: MonthKey
       budgetAmount: number
       confirmedAmount: number
       /** 해당 월 귀속 PLANNED 중 template_id가 있는 지출 + 아직 해당 월 지출(PLANNED/CONFIRMED)이 없는 활성 MONTHLY_DAY 템플릿의 default_price 합계 */
       plannedFixedAmount: number
       /** 해당 월 귀속 PLANNED 중 template_id가 없는 일반 예정 지출 합계 */
       plannedVariableAmount: number
       /** confirmedAmount + plannedFixedAmount + plannedVariableAmount */
       totalExpectedAmount: number
       /** budgetAmount - totalExpectedAmount */
       remainingBudget: number
       isOverBudget: boolean
     }
     ```
   - `calculateMonthBudgetBreakdown(params: { month: MonthKey; budgetAmount: number; expenses: BudgetComparisonExpense[]; templates: BudgetSubscriptionTemplate[] }): MonthBudgetBreakdown`:
     - 귀속 월 판정은 기존 `getBudgetDate(expense)` 규칙(`CONFIRMED`는 `target_date`, `PLANNED`는 `end_date ?? target_date`)을 그대로 따름.
     - 해당 월에 이미 귀속된 `PLANNED` 또는 `CONFIRMED` 지출의 `template_id` 집합(`coveredTemplateIds`)을 구한 뒤, `is_active === true`이고 `(cycle_type ?? "MONTHLY_DAY") === "MONTHLY_DAY"`이면서 `!coveredTemplateIds.has(tpl.id)`인 템플릿의 `default_price`를 `plannedFixedAmount`에 합산함(이미 해당 월 회차가 생성되었거나 결제 완료된 구독은 이중 합산하지 않음).
   - `calculateTwoMonthBudgetComparison(...)`: 당월(`currentMonth`)과 익월(`getNextMonthKey(currentMonth)`)의 `{ current: MonthBudgetBreakdown; next: MonthBudgetBreakdown }`을 반환함.

2. **소비 페이지 UI 연동 (`src/components/finance/two-month-budget-card.tsx` & `src/app/dashboard/expenses/page.tsx`)**:
   - `/dashboard/expenses` 로드 시 `user_finances`(`default_budget`)와 당월·익월 `monthly_budgets`(`year, month, budget_amount`)를 함께 조회함(조회 실패가 기존 지출 목록 로드를 막지 않도록 비차단 처리).
   - 각 월의 유효 예산은 `monthlyBudget > 0 ? monthlyBudget : defaultBudget`으로 산출함.
   - 소비 페이지 상단에 `TwoMonthBudgetCard`(`data-testid="two-month-budget-card"`)를 배치해 **당월(`YYYY년 M월`)**과 **익월(`YYYY년 M+1월`)** 2열 카드로 다음 항목을 나란히 표시함:
     - 월 예산 (`0원`이면 `"예산 미설정"` 안내)
     - 확정 지출 (`confirmedAmount`)
     - 고정 구독 예정 (`plannedFixedAmount`, 미생성 정기 구독 포함 안내)
     - 일반 예정 지출 (`plannedVariableAmount`)
     - 예상 총 지출 (`totalExpectedAmount`) 및 **예상 잔여 예산 (`remainingBudget`)** (`isOverBudget`이면 `text-danger` 및 `"예산 초과"` 배지 표시)

### 2.2 `R103`: 데스크톱 키보드 단축키 및 선택형 접이식 빠른 시작 안내

1. **선택형 접이식 빠른 시작 및 단축키 안내 (`src/components/calendar/quick-start-guide.tsx`)**:
   - `SRS.md` `FR-001`("강제 온보딩 금지")을 준수하여 화면을 차단하는 모달이 아닌, `/dashboard` 상단의 **접이식 비차단 안내 카드 / `[? 빠른 시작 · 단축키]` 토글 버튼**으로 구현함.
   - `localStorage` 키: `chronoledger:quick-start-dismissed:${userId ?? "guest"}`.
     - 최초 방문(값 없음) 시 펼쳐진 카드로 표시하고, 사용자가 `[닫기]`를 누르면 `"1"`을 저장해 접어 둠.
     - 접힌 상태에서도 상단 요약 줄 근처의 `[? 빠른 시작 · 단축키]` 버튼(또는 키보드 `?` 단축키)으로 언제든 다시 펼치거나 접을 수 있음.
   - 안내 내용:
     - **3단계 빠른 시작**: ① `게임 관리`에서 플레이 중인 게임 구독 → ② 캘린더 일정 `★ 관심` 등록 및 `예정 지출` 연결 → ③ `소비`·`설정`에서 월 예산·스토어 지갑·알림 설정.
     - **데스크톱 단축키 요약**: `[` 이전 달 · `]` 다음 달 · `T` 오늘로 이동 · `V` 캘린더/주차별 보기 전환 · `N` 새 지출 등록(로그인 시) · `?` 안내 펼침/접기.

2. **데스크톱 키보드 단축키 핸들러 (`src/app/dashboard/page.tsx`)**:
   - `keydown` 이벤트 가드:
     - `event.ctrlKey || event.metaKey || event.altKey || event.isComposing`이면 무시함.
     - `event.target`이 `INPUT`, `TEXTAREA`, `SELECT`이거나 `isContentEditable`이거나 `closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')`에 해당하면 무시함.
     - 대시보드 내 모달/드로어(`isExpenseModalOpen`, `payingExpense !== null`, `detailExpenseId !== null`, `overdueExpenses.length > 0`, `isMobileDrawerOpen`, 게스트가 아닌 온보딩 모달 오픈 상태)가 하나라도 열려 있으면 무시함.
   - 키 매핑:
     - `[`: 이전 달로 이동
     - `]`: 다음 달로 이동
     - `t` 또는 `T`: 오늘 날짜(`todayDate`) 선택 및 현재 달로 복귀
     - `v` 또는 `V`: `calendar` $\leftrightarrow$ `weekly` 보기 모드 전환
     - `n` 또는 `N`: 로그인 사용자(`user`)이면서 온라인(`isOnline`)일 때 선택일 기준 새 지출 모달(`setIsExpenseModalOpen(true)`) 열기
     - `?`: 빠른 시작 · 단축키 안내 펼침/접기 토글

### 2.3 `r101-r103-two-month-budget-and-shortcuts` 단계별 수용 기준

- **Step 1 (`Gemini 4 Hydrogen`, Fallback 1: `Claude Sonnet`, Fallback 2: `GitHub Copilot` — `Maker: R101 2개월 예산 비교 + R103 단축키·빠른 시작 안내 & Vitest`)**:
  - DB 변경 없음 (🐳 Docker 불필요).
  - 허용 파일: `src/lib/budget-calculations.ts`, `src/lib/budget-calculations.test.ts`, 신규 `src/components/finance/two-month-budget-card.tsx`·테스트, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, 신규 `src/components/calendar/quick-start-guide.tsx`·테스트, `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md`.
  - 수용 기준:
    1. `budget-calculations.ts`에 `getNextMonthKey`, `calculateMonthBudgetBreakdown`, `calculateTwoMonthBudgetComparison`을 구현하고 단위 테스트(당월/익월 귀속, 이미 생성된 `template_id` 지출과 미생성 활성 `MONTHLY_DAY` 템플릿 중복 제외 합산, `INTERVAL_30`/`VERSION_PASS` 미생성분 제외, 기본 예산 폴백, 예산 초과 판정)를 추가함.
    2. `/dashboard/expenses` 상단에 `TwoMonthBudgetCard`를 연결하고 `expenses/page.test.tsx`에서 당월·익월 예산 비교 렌더링 및 예산 미설정/초과 표시를 검증함.
    3. `QuickStartGuide` 및 `/dashboard` 키보드 단축키(`[`, `]`, `T`, `V`, `N`, `?` 및 입력창·모달 포커스 가드)를 구현하고 단위 테스트로 검증함.
    4. `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 2 `▶ READY` 전환함.
- **Step 2 (`Claude Sonnet`, Fallback 1: `Gemini 4 Neon` / `Claude Opus` — `Reviewer & Orchestrator`)**:
  - Base $\leftrightarrow$ Target SHA 정적 리뷰(`review.json`)·검증(`test.json`, `tsc`·`lint`·`vitest`·`npm run build`) 기록, 스키마 검증 후 `main` 병합 및 문서 마감.

---

## 3. 2차 Run (`r102-expense-presets`) 상세 명세 (1차 Run 완료 후 착수)

### 3.1 DB 스키마·RLS·탈퇴 연동 (`sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`)

1. **`public.user_expense_presets` 테이블**:
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `title VARCHAR(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 150)` (프리셋 칩 표시명 겸 지출 항목명)
   - `category VARCHAR(50) NOT NULL DEFAULT '게임' CHECK (category IN ('게임', '식비', '교통', '생활', '기타'))`
   - `game_id UUID REFERENCES public.games(id) ON DELETE SET NULL` (특정 게임 전용 또는 `NULL` 공통 프리셋)
   - `original_price BIGINT NOT NULL CHECK (original_price >= 0)`
   - `payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'NAVER_PAY'))`
   - `point_platform VARCHAR(30) CHECK (point_platform IS NULL OR point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE'))`
   - `deduct_from_asset BOOLEAN NOT NULL DEFAULT true`
   - `sort_order INTEGER NOT NULL DEFAULT 0`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - 인덱스: `idx_user_expense_presets_user_sort ON public.user_expense_presets(user_id, sort_order ASC, created_at ASC)`
2. **사용자당 최대 20개 상한 트리거 (`public.enforce_user_expense_presets_limit`)**:
   - `BEFORE INSERT ON public.user_expense_presets FOR EACH ROW`: 해당 `NEW.user_id`의 기존 행 수가 20개 이상이면 `RAISE EXCEPTION '과금 프리셋은 최대 20개까지 저장할 수 있습니다.' USING ERRCODE = '23514';` 발생.
3. **권한·RLS·계정 삭제 대기 차단·탈퇴 정리**:
   - `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL ON public.user_expense_presets FROM PUBLIC, anon, authenticated; GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_expense_presets TO authenticated;`
   - 정책 `"Manage own expense presets"` (`FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`).
   - 계정 삭제 대기 차단 `RESTRICTIVE` 정책 `"Block account deletion users from user_expense_presets"` 및 `block_pending_account_deletion_user_expense_presets` 트리거(`SCHEMA.sql` 공통 루프 2곳 포함), `purge_expired_account_deletion_requests`에 `DELETE FROM public.user_expense_presets WHERE user_id = v_req.user_id;` 추가.

### 3.2 지출 모달(`ExpenseModal`) UI 연동

1. **프리셋 칩 목록 및 원클릭 적용**:
   - 신규 지출 등록 모드(`!plannedExpense && !editingExpense`)에서 모달이 열릴 때 본인의 `user_expense_presets`를 조회함(미적용 DB `42P01`/`PGRST205` 시 오류 없이 숨김/비활성 폴백).
   - 현재 선택된 `gameId`와 일치하는 프리셋과 공통 프리셋(`game_id === null`)을 상단 칩 목록에 표시하고, 칩 클릭 시 `title`, `category`, `gameId`(프리셋에 `game_id`가 있을 때), `originalPrice`, `paymentMethod`, `platform`(`point_platform ?? 'OTHER'`), `deductFromAsset`을 즉시 채움.
   - 각 프리셋 칩 옆의 삭제(`×`) 버튼으로 해당 프리셋을 삭제(`DELETE`)할 수 있음(`isOffline()` 가드).
2. **`[프리셋 저장]` 버튼**:
   - 신규 지출 등록 폼에서 **`[프리셋 저장]`** 버튼을 누르면 현재 입력된 항목명(`title`, 1~150자 필수)·금액(`original_price >= 0` 필수)·카테고리·게임(`category === '게임'`일 때 선택된 `gameId` 또는 `null`)·결제수단·스토어 플랫폼·총자산 차감 여부를 `user_expense_presets`에 즉시 `INSERT`하고 칩 목록을 갱신함(20개 초과·오프라인·미적용 DB 시 명확한 안내 문구 표시).

### 3.3 `r102-expense-presets` 단계별 수용 기준

- **Step 1 (`GPT Codex`, Fallback 1: `Gemini 4 Neon` / `Claude Opus`, Fallback 2: `Gemini 4 Hydrogen` — `Maker: R102 DB/RLS/Trigger & Types`)**:
  - 🐳 **Docker Desktop 필요** (미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 진행).
  - 허용 파일: 신규 `sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md`.
- **Step 2 (`Claude Sonnet`, Fallback 1: `Gemini 4 Hydrogen`, Fallback 2: `GitHub Copilot` — `Maker: ExpenseModal 프리셋 칩·[프리셋 저장]·삭제 UI & Vitest`)**:
  - 허용 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md`.
- **Step 3 (`Claude Opus`, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon` — `Reviewer & Orchestrator`)**:
  - Base $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감.
