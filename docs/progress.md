# 프로젝트 진행 현황

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

- 사용자 초안(5단계)을 `md/SKILL.md`, `md/agent_rules.md` 기준으로 보완한 [ChronoLedger_multi_agent_pipeline_v2.md](ChronoLedger_multi_agent_pipeline_v2.md)와 이식 검토 [ChronoLedger_pipeline_v2_porting_review.md](ChronoLedger_pipeline_v2_porting_review.md)를 작성했다.
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
- Phase 4.4 변경(Base `674f741ee52d45bb96db3431521101a5aa01341f`, Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`)의 기준 요약과 검토 프롬프트를 [Gemini 수동 리뷰 패킷](Gemini_phase4_manual_review.md)에 작성하고, 40,198-byte 전체 diff를 `artifacts/gemini-phase4-connection/phase4-request-submission.diff`에 생성했다.
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

- VS Code Local harness에서 Maker/Reviewer를 위임하는 `ChronoLedger Orchestrator` 프로필과 초보자용 [협업 가이드](ChronoLedger_collaboration_guide.md)를 추가했다.
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

- 대시보드·지출·통계의 별도 반응형 시안 [design-preview-ko.html](design-preview-ko.html)을 만들었다. 기존 [design-v1-ko.html](design-v1-ko.html)은 참고용으로 보존했다.
- 사용자 결정: 대시보드 미니 그래프 제외, 데스크톱 지출 표/모바일 날짜별 카드, 캘린더 아이콘 전체 표시, 통계 월별 세로 막대와 분류별 가로 막대. 기존 결정인 상단 데스크톱 내비게이션, 반응형 폭, 간격/컨트롤 기준도 시안에 반영했다.
- 브라우저에서 대시보드·지출·통계 탭을 확인했고, 390/900/1280px에서 가로 넘침이 없으며 모바일 카드/하단 내비게이션과 중간 폭·모바일 바텀시트가 표시되는 것을 확인했다. 테마 전환 및 새로고침 후 저장도 확인했다.
- 추가 사용자 결정: 본문 15px/보조 12px/섹션 17px/페이지 제목 22px/주요 숫자 20–28px. 라이트는 쿨 뉴트럴 바탕·흰 표면·남색 글자·인디고 액션, 다크는 기존 팔레트 유지.
- A2Z 제작자 안내에서 SIL OFL 1.1을, 눈누 사용 FAQ에서 상업적 사용·수정·재배포 허용을 확인했다. 원본 WOFF2 글꼴의 내장 저작권 표기(`Copyright © 2026 PT&`)를 사용해 OFL 전문을 폰트와 함께 제공하고, 9개 굵기를 시안과 웹 앱에서 자체 호스팅한다. 제작자 배포 ZIP에 라이선스 파일이 없어 프로젝트에 OFL을 동봉했다. 폰트 자체 단독 판매는 금지된다.
- 라이선스 출처: [A2Z 제작자 안내](https://freesentation.blog/a2z), [눈누 사용 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1 본문](https://openfontlicense.org/documents/OFL.txt).
- 추가 사용자 결정: 카드는 은은한 그림자, 모달은 강조된 그림자. 빈 상태는 간결한 상황 설명과 관련 행동 버튼을 두고, 보조 피드백은 중립적이고 다음 행동을 안내한다.
- 라이트 팔레트의 본문/보조 텍스트, 주요 액션 라벨, 상태 라벨 대비를 계산해 WCAG AA 텍스트 기준(4.5:1 이상)을 충족하도록 시안 토큰을 조정했다. 다크 상태 라벨과 두 테마의 기본 컨트롤 외곽선도 확인했다. 세부 ratio와 값은 [UI Design Sheet](../md/ChronoLedger_UI_Design_Sheet.md)에 기록했다.
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
- 사용자가 검토 반영된 SRS 요구사항을 승인했다. [SRS](../md/SRS.md) 상태와 체크포인트에 승인 사실을 기록했다.
- (당시 체크포인트 기록, 2026-10-03 스모크 실행 전) SQL 검증은 미수행 상태였고 `public.expenses` 존재 때문에 DDL 적용을 보류했다. 이후 사용자가 rollback-only 스모크 검증을 완료해 최신 상태는 위의 설계 진입 승인으로 갱신됐다.
