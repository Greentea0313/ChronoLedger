# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> **🤖 AI 에이전트 자동 실행 지침 (`"인수인계 문서를 확인해"` 및 하이브리드 위임 원칙)**
> 0. **주축 모델(Gemini 4 Argon) 직접 구현 금지 및 하이브리드 위임**: `Gemini 4 Argon`(`Orchestrator & Architect`)은 절대 직접 제품 소스 코드(`src/**`)를 수정하지 않습니다. **Gemini 3.8 Flash** 담당 과제(UI/Tailwind, 배지·모달·드로어 마크업, 고속 탐색, `docs/` 동기화)는 내부 서브에이전트(`define_subagent` + `invoke_subagent` `Model: "flash"`)로 즉시 호출해 위임하고, **GPT Codex** / **Claude Opus 5.5** / **GitHub Copilot** 담당 과제는 아래 **Active Dispatch Table**에 `▶ READY`로 등록한 뒤 멈추고 사용자에게 해당 모델로 전환해 `"인수인계 문서를 확인해"`를 입력하도록 안내합니다.
>
> 1. 사용자가 **`"인수인계 문서를 확인해"`**라고 입력하면, 아래 **Active Dispatch Table**에서 상태가 **`⚠️ HANDOVER_NEEDED`**(1순위) 또는 **`▶ READY`**(2순위)인 과제를 찾아 즉시 수행하십시오.
> 2. **강제 중단 자동 복구**: 만약 이전 모델이 토큰/쿼터 초과로 문서를 갱신하지 못한 채 중단되어 상태가 `▶ READY`이거나 `🔄 IN_PROGRESS`인 경우, 새로 호출된 대체(Fallback) 모델은 즉시 대상 Worktree의 `git status --short`와 `git diff`를 스캔하여 이전 모델이 작성하다 멈춘 미커밋 변경사항을 파악한 뒤 이어서 완수하십시오.
> 3. **토큰 부족 시 비상 인계**: 작업 도중 보유 토큰/컨텍스트 내에서 완수가 불가능하다고 판단되면, 무리하게 축약하지 말고 현재까지의 파일 수정을 안전하게 저장한 뒤:
>    - 해당 행의 상태를 **`⚠️ HANDOVER_NEEDED`**로 변경하고, `담당 모델` 칸을 **`~~기존 모델~~ ➡️ [대체 모델명]`**으로 갱신하십시오.
>    - 하단 **`### 📌 중단 체크포인트 (Handover Checkpoint)`**에 **① 완료된 파일/작업, ② 남은 구체적 작업, ③ 가정/결정 사항, ④ 테스트 실행 여부**를 기록하고, 사용자에게 대체 모델로 전환해 `"인수인계 문서를 확인해"`를 입력하도록 안내하십시오.
> 4. **완료 및 배턴 터치**: 자신의 단계를 완수(Maker의 경우 Worktree 내 커밋 생성)하면 상태를 `✅ DONE (SHA: <커밋해시>)`으로 바꾸고, 다음 순서 행의 상태를 `▶ READY`로 변경하십시오.

### 📋 5대 AI 모델 기본 역할 및 토큰 소진 시 대체(Fallback) 체인

| 주력 모델 / 에이전트 | 기본 역할 (Role) | ChronoLedger 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성(`New-CollaborationRun.ps1`), Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus 5.5** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/KST 날짜(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus 5.5** | **GitHub Copilot** |
| **Claude Opus 5.5** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | VS Code 밀착형 일반 기능·컴포넌트·라우팅(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 보조 | **GitHub Copilot** | **Gemini 4 Argon** |

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **Run ID**: `user-game-memo-feature` *(2026-10-26, 게임별 상시 메모 기능 추가 — `/dashboard/games` 구독 게임 카드 연동 및 `user_games.memo` 확장)*
- **Worktree 경로**: `main`
- **배경 및 사용자 요구사항**:
  - 특정 일정(`game_schedules`)에 연동되지 않더라도 해당 게임 자체(`user_games`)에 귀속되는 개인 상시 메모 기능이 필요함.
  - `/dashboard/games` (내 게임 관리) 페이지의 각 구독 게임 카드에서 바로 게임별 메모를 작성·열람·수정·삭제할 수 있어야 함.
- **수용 기준 (Acceptance Criteria)**:
  1. `sql/SCHEMA.sql` & 신규 `sql/MIGRATION_USER_GAME_MEMO.sql`: `public.user_games` 테이블에 `memo TEXT` 컬럼을 추가(멱등성 보장 `ALTER TABLE public.user_games ADD COLUMN IF NOT EXISTS memo TEXT;`).
  2. `src/app/dashboard/games/page.tsx`:
     - `UserGameRow` 인터페이스 및 `user_games` 조회(`select`) 쿼리에 `memo` 포함.
     - 각 구독 게임 카드 내에 게임별 상시 메모 표시 영역 및 인라인 편집 UI(`Textarea` 또는 입력창, `[메모 작성]`/`[메모 수정]`, `[저장]`, `[취소]` 버튼) 구현.
     - 저장 시 `supabase.from("user_games").update({ memo: trimmed || null }).eq("id", ug.id).eq("user_id", user.id)`를 호출하고 로컬 상태(`userGames`)를 즉시 갱신할 것.
     - 모바일 화면 안전성을 위해 구독 게임 목록 하단 페이지네이션에도 `flex-wrap justify-center` 적용.
  3. `src/app/dashboard/games/page.test.tsx`: 구독 게임 카드에서 게임별 메모 렌더링 및 작성/수정/저장 동작을 검증하는 단위 테스트 추가.
  4. 전체 단위 테스트(`npx vitest run`) 및 정적 빌드(`npm run build`) 100% 통과.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `▶ READY` | **GitHub Copilot** *(1순위 대체: Gemini 3.8 Flash / 2순위 대체: GPT Codex)* | `Maker (General)` | `user_games.memo` 스키마/마이그레이션 SQL 추가 및 `/dashboard/games` 게임 카드 내 상시 메모 작성·열람·수정 UI 구현 (`sql/SCHEMA.sql`, `sql/MIGRATION_USER_GAME_MEMO.sql`, `src/app/dashboard/games/page.tsx`) | `▶ READY` (대기 중) |
| **2** | `⏳ PENDING` | **GPT Codex** *(1순위 대체: Claude Opus 5.5 / 2순위 대체: GitHub Copilot)* | `Maker (Test)` | `/dashboard/games` 게임별 상시 메모 렌더링 및 저장 단위 테스트 보강 (`src/app/dashboard/games/page.test.tsx`) | 1단계 완료 후 진행 |
| **3** | `⏳ PENDING` | **Claude Opus 5.5** *(1순위 대체: Gemini 4 Argon / 2순위 대체: GitHub Copilot)* | `Reviewer & Orchestrator` | 코드 리뷰, 전체 빌드 검증 및 문서 4종(`handoff`, `progress`, `changelog`, `to-do`) 동기화 | 2단계 완료 후 진행 |

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 `완료된 내역` / `남은 작업` / `검증 상태`를 기록합니다.)*

---

## 구글 플레이 포인트 적립 누락 버그 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계 (2026-10-26)

- **수행 주체**: Claude Opus 5.5 (Maker - Core & Test, GPT Codex 1순위 대체) / Gemini 4 Argon (Reviewer & Architect)
- **구현 커밋**: `7307b99` (Base: `cc9889a`)
- **수행 내역**:
  1. `src/lib/payment-calculations.ts`: `GOOGLE_BOOST_BASE_RATE = 0.1` 상수 도입, 등급별 `baseEarnRate`와 무관하게 `effectiveRate = 0.1 * mult %` 고정 계산 및 `Math.floor((finalAmount * effectiveRate) / 100)` 적립식 재설계.
  2. `src/components/expense/expense-modal.tsx`: 포인트 미사용 결제(`usedPoints === 0`) 시에도 `pointPlatform: activePointPlatform`을 정상 전달하여 RPC에 스토어 플랫폼 누락 방지. 예정 지출 등록/수정 시 `point_platform` 보존 및 `resolveStorePlatform` 복원. 부스트 UI 안내 문구 직관화(`"이벤트 고정: 1,000원당 {n}P ({effectiveRate}%)"`).
  3. `src/app/dashboard/expenses/page.tsx`: 예정 지출 확인/수정 핸들러(`handleConfirmPlanned`, `handleEditPlanned`)에 `point_platform` 전달 연동.
  4. `sql/SCHEMA.sql` & `sql/MIGRATION_STORE_EVENT_EARN.sql`: `process_expense_payment` RPC에서 스토어 결제 시 `store_wallets` 레코드가 없으면 기본 등급(`GOOGLE_PLAY`: `'BRONZE'`/`0.10`, `GALAXY_STORE`: `'GENERAL'`/`0.10`)으로 자동 삽입(`ON CONFLICT DO NOTHING`) 안전망 추가.
  5. `src/lib/payment-calculations.test.ts` & `src/components/expense/expense-modal.test.tsx`: 고정 부스트 계산식 및 포인트 미사용 결제 시 `p_point_platform` 전달 검증 테스트 반영.
- **검증 결과**:
  - Vitest 42개 파일, 262개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.
  - Gemini 4 Argon 정적 코드 리뷰 완료 (원장 정합성 및 수용 기준 PASS).
- **⚠️ 운영 배포 주의사항**:
  - Supabase 실제 데이터베이스 운영 환경에 신규 마이그레이션 반영을 위해 Supabase 대시보드 SQL Editor에서 `sql/MIGRATION_STORE_EVENT_EARN.sql` 스크립트를 1회 직접 실행해야 합니다.


## 모바일 화면 UI 오버플로우 3건 해결 및 향후 과제 4종 로드맵 수립 (2026-10-26)

- **수행 주체**: Gemini 3.8 Flash (Maker - Fast UI & Subagent)
- **수행 내역**:
  1. `DialogContent`(`src/components/ui/dialog.tsx`): `grid-cols-1 overflow-x-hidden p-4 sm:p-6` 적용으로 직계 자식 `min-width: auto` 팽창 원천 차단.
  2. `StoreWalletAdjustHistoryModal`(`src/components/wallet/store-wallet-adjust-history-modal.tsx`): `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강, 헤더 `pr-7 min-w-0 break-words`, 필터 바 `flex-wrap min-w-0`, 레코드 카드 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 `shrink-0` 적용.
  3. 관리자 페이지(`/admin` `src/app/admin/page.tsx`): 공식 일정 및 게임 목록 페이지네이션 `flex-wrap items-center justify-center gap-1 sm:gap-1.5`, 번호 버튼 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs` 반응형 축소 최적화.
  4. 소비 페이지(`/dashboard/expenses` `src/app/dashboard/expenses/page.tsx`): 최상위 컨테이너 `w-full overflow-x-hidden`, 차트 영역 `min-w-0 w-full overflow-hidden`, 순위 카드 영역 `min-w-0 w-full overflow-hidden`, 픽업 순위 리스트 좌측 행 `min-w-0 flex-1 overflow-hidden` 말줄임(`truncate`) 개선, 페이지네이션 `flex-wrap justify-center` 적용.
  5. 단위 테스트(`src/app/dashboard/expenses/page.test.tsx`): KST 기준일 모킹(`mockGetKstToday: vi.fn(() => "2026-10-15")`) 보강으로 날짜 경과 비결정론적 실패 방지.
  6. 로드맵 동기화(`docs/to-do.md`): 12.11 완료 기록 및 향후 로드맵 4종(R1~R4) 신설.
- **검증 결과**:
  - Vitest 42개 파일, 260개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.

---

## 모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  - 모바일 달력 타일에서 우측 상단에 표시되는 일정 도트(버전 초록, 픽업 파랑, 콘텐츠 보라) 및 메모 도트의 정렬 방식을 기존 가로 정렬(`flex items-center`)에서 데스크톱 아이콘 정렬 방식과 일치하는 세로 정렬(`flex flex-col items-end`)로 변경.
  - 타일 내 날짜 숫자 및 배지와의 겹침을 방지하고 우측 상단에 세로로 단정하게 배치되도록 개선.
- **수정 파일 및 내역**:
  - `src/components/calendar/desktop-calendar.tsx`: 모바일 도트 컨테이너 클래스를 `flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`로 변경.
  - `src/components/calendar/desktop-calendar.test.tsx`: 모바일 도트 부모 컨테이너가 `flex-col`, `items-end`, `gap-1`을 포함하는지 검증하는 단위 테스트 단언문 추가.
- **검증 결과**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 정상 export).

---

## Google OAuth 로그인 UI 피드백 및 콜백(/auth/callback) 페이지 다크 테마 카드 레이아웃 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  1. **Google 로그인 버튼 로딩 피드백 강화**:
     - 기존 `/auth` 페이지에서 Google 계정으로 로그인 버튼 클릭 시 비활성화만 이루어지고 시각적 회전 스피너나 안내 문구가 없어 사용자가 진행 여부를 명확히 인지하기 어려웠음.
     - `loading === true`일 때 버튼 내부에 `Loader2` 회전 스피너(`mr-2 h-5 w-5 animate-spin text-slate-900`)와 `"Google 연결 중..."` 텍스트를 노출하도록 개선.
  2. **콜백 페이지 다크 테마 및 카드 레이아웃 일원화**:
     - 기존 `/auth/callback` 페이지는 로그인 화면의 일관된 다크 테마 디자인 시스템과 분리된 채 밋밋한 텍스트로만 렌더링되던 시각적 결함이 존재함.
     - 컨테이너에 `data-theme="dark"`, `bg-app`, `text-content` 스타일을 적용하고, `@/components/ui/card`의 `Card`, `CardHeader`, `CardTitle`, `CardContent` 컴포넌트를 사용하여 로그인 화면과 완벽히 통일된 중앙 카드 레이아웃 구성.
     - 인증 진행 중: `CardHeader`에 브랜드 타이틀("ChronoLedger") 및 서브카피("게임 일정과 지출을 한 곳에서 관리하세요.") 렌더링, `CardContent`에 `Loader2` 회전 스피너(`animate-spin text-primary`)와 `role="status"` 안내 문구("Google 인증을 확인하고 있습니다..."), 보조 문구("잠시 후 대시보드로 이동합니다.") 노출.
     - 에러 발생 시: `AlertCircle` 아이콘(`text-danger`), 에러 메시지(`role="alert" text-danger`), `<Button variant="outline" asChild><a href="/auth">로그인 화면으로 돌아가기</a></Button>` 구성.
     - 기존 셀렉터(`role="status"`, `role="alert"`, `a[href="/auth"]`) 100% 호환 유지.
- **수정 파일 및 내역**:
  - `src/app/auth/page.tsx`: Google 로그인 버튼 로딩 상태 조건부 렌더링 추가 (`Loader2` 스피너 및 "Google 연결 중..." 문구).
  - `src/app/auth/callback/page.tsx`: 다크 테마 Card 중앙 레이아웃, `Loader2` 회전 스피너, `AlertCircle` 에러 뷰 일원화.
  - `src/app/auth/page.test.tsx`: Google 로그인 버튼 클릭 시 로딩 스피너/텍스트 노출 및 버튼 비활성화 검증 테스트 케이스 추가.
  - `src/app/auth/callback/page.test.tsx`: `globalThis.IS_REACT_ACT_ENVIRONMENT = true` 설정 및 인증 진행 중 로딩 스피너(`.animate-spin`), 브랜드 타이틀, `role="status"` 텍스트 렌더링 검증 테스트 케이스 추가.
- **검증 결과**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 export 정상 생성).

---

## Google OAuth 로그인 UI 개선 및 OAuth 콜백 화면 디자인 시스템 통일 (2026-10-19)

- **결정 및 배경**:
  - **Google OAuth 로그인 버튼 디자인 개선**:
    - `src/app/auth/page.tsx`: Google 공식 브랜드 가이드라인에 부합하는 4색(Blue `#4285F4`, Green `#34A853`, Yellow `#FBBC05`, Red `#EA4335`) 'G' 멀티컬러 SVG 아이콘(`GoogleIcon`)을 적용하고, 로그인 진행 시 회전 스피너(`Loader2`)와 `"Google 연결 중..."` 텍스트로 로딩 피드백을 제공하며 버튼을 `disabled` 처리하여 중복 요청을 방지.
  - **OAuth 콜백 화면 디자인 시스템 통일**:
    - `src/app/auth/callback/page.tsx`: 기존 단순 텍스트/배경 구성을 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`) 및 `Card` 컴포넌트 기반으로 전면 리팩토링.
    - "ChronoLedger" 브랜드 타이틀(`text-primary`)과 부드러운 스피너(`Loader2 animate-spin`), 진행 안내 문구(`role="status"`), 에러 발생 시 경고 카드(`role="alert"`, `AlertCircle`) 및 [로그인 화면으로 돌아가기] 버튼 제공.
- **수행 내역 및 검증**:
  - `src/app/auth/page.tsx`: `GoogleIcon` 멀티컬러 SVG 컴포넌트 추가 및 로딩 분기 처리.
  - `src/app/auth/callback/page.tsx`: 앱 전역 다크 테마, Card 레이아웃, 브랜드 타이틀, 로딩 스피너 및 에러 상태 UI 구성.
  - `src/app/auth/page.test.tsx`: 공식 4색 SVG 아이콘 렌더링 및 OAuth 진행 중 로딩 스피너/"Google 연결 중..." 표시 단위 테스트 2건 추가.
  - `src/app/auth/callback/page.test.tsx`: 브랜드 타이틀, 스피너, `role="status"` 상태 안내 문구 노출 단위 테스트 추가.
  - 검증: Vitest 42개 파일 259개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.

## 관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달(Past Schedules Dialog) 신규 구현 (2026-10-19)

- **결정 및 배경**:
  - **중복 네비게이션 정리**:
    - `AdminLayout` 상단 헤더에서 이미 `[일정 관리]` / `[요청 관리]` 탭을 전역으로 제공하므로, `/admin` 및 `/admin/requests` 본문 상단에 별도로 존재하던 바로가기 배너 박스(데이터 제안 대기열/관리자 콘솔 이동 링크)를 제거하여 여백 낭비를 줄이고 정돈된 관리자 UI 레이아웃 확보.
  - **[지난 일정] 조회 및 관리 모달(`Dialog`) 신설**:
    - 활성 공식 일정 목록에서 만료 일정(`end_date < today`)이 제외됨에 따라, 과거에 종료된 일정 데이터를 확인·수정·삭제할 수 있는 전용 모달 창 구현.
    - 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘)을 배치하고, 클릭 시 Supabase `.lt("end_date", today).order("end_date", { ascending: false })` 쿼리로 과거 일정 목록을 비동기 조회.
    - 다이얼로그 내부에서 게임별 필터링(`<select>`), 검색어 필터링(`<input>`), 8개 단위 페이지네이션(`PAST_SCHEDULES_PER_PAGE = 8`) 지원.
    - 각 지난 일정 카드에서 [수정] 및 [삭제]가 가능하도록 연동하고, `returnToPastModal` 플래그를 통해 수정/삭제 완료 또는 취소 시 안전하게 지난 일정 모달로 복귀하고 목록을 즉시 재조회(동기화)하도록 상태 제어 체계 확립.
- **수행 내역 및 검증**:
  - `src/app/admin/requests/page.tsx`: 상단 `데이터 제안 대기열` 중복 배너 박스 및 미사용 `Link`, `ArrowLeft` 임포트 제거.
  - `src/app/admin/page.tsx`:
    - 상단 `공식 일정 관리 콘솔` 중복 배너 박스 및 `Link`, `ArrowRight` 임포트 제거.
    - 툴바에 [지난 일정] 버튼 추가 및 `isPastModalOpen`, `pastSchedules`, `isLoadingPastSchedules`, `pastGameFilter`, `pastSearchQuery`, `currentPastPage`, `returnToPastModal` 상태 추가.
    - `fetchPastSchedules` (`.lt("end_date", today)`), `handleEditFromPast`, `handleDeleteFromPast`, `handleCloseScheduleModal`, `handleCancelDelete` 핸들러 구현.
    - 지난 일정 모달(`DialogContent className="max-w-3xl"`) 마크업: 게임 필터, 검색 인풋, 일정 카드 목록(게임 배지, 유형 배지, 제목, 기간, 메모, 수정/삭제 버튼), 하단 페이지네이션 및 닫기 버튼 구성.
  - `src/app/admin/page.test.tsx`:
    - `createQueryBuilder`에 `lt` 모의 메서드 지원 추가.
    - 지난 일정 모달 열기 및 `lt("end_date", "2026-09-01")` 쿼리 검증, 모달 내 게임 필터 및 검색어 필터링 검증 테스트 추가.
    - 지난 일정 모달 내 [수정] 클릭 후 수정 폼 모달 연동 및 업데이트 저장 검증 테스트 추가.
    - 지난 일정 모달 내 [삭제] 클릭 후 삭제 확인 모달 연동 및 삭제 실행 검증 테스트 추가.
  - 검증: `src/app/admin/page.test.tsx` (15개 테스트 통과), 전체 Vitest (42개 파일, 256개 테스트 전체 통과), `npm run build` Next.js 14 프로덕션 빌드 성공.

## 관리자 공식 일정 목록 만료 일정(end_date < today) 표시 제외 및 필터링 강화 (2026-10-19)

- **결정 및 배경**:
  - `/admin` 페이지의 공식 일정 관리 탭에서 KST 오늘 날짜(`today`) 기준 이미 종료된 일정(`end_date < today`)이 노출되어 관리 대상 일정 식별이 비효율적인 문제를 해결.
  - Supabase 쿼리 레벨에서 `.gte("end_date", today)` 필터를 적용하여 불필요한 지난 일정 데이터를 서버에서 가져오지 않도록 최적화.
  - 클라이언트 측에서도 `filter((s) => s.end_date >= today)`를 방어적으로 적용하여 공식 일정 목록, 탭 배지 카운트, 게임 필터 카운트, 페이지네이션에 만료된 일정이 절대 포함되지 않도록 보장.
- **수행 내역 및 검증**:
  - `src/app/admin/page.tsx`: `@/lib/dashboard-date`에서 `getKstToday`를 가져와 `fetchSchedules`에서 `.gte("end_date", today)` 및 방어 필터 적용.
  - `src/app/admin/page.test.tsx`: `mockGetKstToday` 모킹, `createQueryBuilder` 내 `gte` 모의 메서드 지원, 만료 일정(`end_date < today`) 제외 및 활성 일정/카운트 검증 단위 테스트 추가.
  - 검증: `npx tsc --noEmit` (0 errors), `npx vitest run src/app/admin/page.test.tsx` (12개 테스트 전체 통과), 전체 Vitest (42개 파일, 253개 테스트 전체 통과).

## 모바일 초소형 뷰포트(360px 이하) 달력 타일·배지 최적화 및 날짜 타일 터치 시 바텀시트 즉시 연동 (2026-10-19)

- **결정 및 배경**:
  - **모바일 달력 타일 일정 유형별 컬러 도트 분리 표시**:
    - 모바일(`< md`) 달력 타일 우측 상단에 단일 파란 점 대신, 시작일(`is_start_date === true`)인 게임 일정을 유형별 색상 점(`VERSION`: 초록 `bg-success`, `PICKUP`: 파랑 `bg-primary`, `CONTENTS`: 보라 `bg-purple-500`)과 메모 회색 점(`bg-content-muted`)으로 나란히 분리 표시하여 타일 크기 증가 없이도 다중 일정 구성을 직관적으로 식별하도록 개선.
    - 360px 이하 초소형 화면에서도 도트와 두 자리 날짜 숫자가 겹치지 않도록 `gap-0.5 sm:gap-1 shrink-0` 간격을 적용.
  - **모바일 당일(Today) 타일 금색(`#EFBF04`) 테두리 강조 및 데스크톱 전용 `'오늘'` 배지 처리**:
    - 360px 이하 화면(타일 폭 약 40px)에서 두 자리 날짜 숫자와 `'오늘'` 텍스트 배지 및 우측 상단 도트가 충돌하는 문제를 해결하기 위해, 모바일(`< md`)에서는 `'오늘'` 텍스트 배지를 숨기고(`hidden md:inline-flex`) 오늘 타일 테두리만 금색(`max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`)으로 강조하도록 변경.
  - **모바일 달력 날짜 타일 터치 시 `'선택일 상세'` 바텀시트(`MobileDrawer`) 즉시 오픈**:
    - 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일을 터치하면 해당 날짜 선택과 동시에 `MobileDrawer` 바텀시트가 즉시 열리도록 `open`/`onOpenChange` 제어 상태를 연동하고, 하단 `'선택일 상세'` 버튼도 그대로 유지.
  - **초소형 화면 게임 필터 팝오버 가로 넘침 방지**:
    - `CalendarGameFilter` 드롭다운 팝오버에 `max-w-[calc(100vw-2rem)]`을 적용하여 320px~360px 뷰포트에서도 화면 밖으로 넘치지 않도록 보강.
- **수행 내역 및 검증**:
  - `src/components/calendar/desktop-calendar.tsx` / `desktop-calendar.test.tsx`: 모바일 일정 유형별 도트, 모바일 오늘 금색 테두리 및 데스크톱 전용 `'오늘'` 배지 구현·테스트.
  - `src/components/calendar/mobile-drawer.tsx`: `open`, `onOpenChange` 제어 props 추가.
  - `src/app/dashboard/page.tsx` / `page.test.tsx`: 모바일(`< 900px`) 날짜 타일 클릭 시 `MobileDrawer` 즉시 오픈 연동 및 360px 뷰포트 단위 테스트 추가.
  - `src/components/calendar/calendar-game-filter.tsx`: 팝오버 `max-w-[calc(100vw-2rem)]` 반응형 보강.
  - 검증: `npx tsc --noEmit` (0 errors), `npx vitest run` (42개 파일, 252개 테스트 전체 통과), `npm run build` (정적 15개 페이지 빌드 성공).

## 대시보드 요약 카드 진행률, 100% 포인트 할인, 사이드바 드롭다운 탭 및 모바일 터치 개선 (2026-10-19)

- **결정 및 배경**:
  - **요약 카드(Summary Card) 진행률 계산식 및 UI 개편**:
    - 기존의 월 예산 대비 비율 대신, 당월 전체 예상 지출(`expectedExpense`) 중 이미 결제 확정한 지출(`confirmedExpense`)의 비율(`(confirmedExpense / expectedExpense) * 100`)로 진행률을 산출하도록 변경.
    - 우측 하단에는 당월 예상 지출에서 확정 지출을 뺀 잔여 예정 지출 금액(`expectedExpense - confirmedExpense`)을 표시하고, 좌측 라벨은 `진행률 n%`로 간결화함.
    - `src/lib/budget-calculations.ts`에 당월 확정 지출 합계를 구하는 `calculateConfirmedExpense` 함수를 추가하고 `DashboardPage`에서 `confirmedExpense`를 useMemo로 계산하여 `HeroSidebar`와 `MobileDrawer`에 동일하게 전달함.
  - **포인트 할인 100% 허용(방식 A) 및 결제 플랫폼별 포인트 차감 동기화**:
    - `uiDiscount`를 총 원화 할인액으로 취급하고 `uPoints`는 순수 차감 포인트 수량으로 취급하여, 정가의 100% 포인트 할인(예: 정가 5,000원, 할인 5,000원, 포인트 250P 사용 $\to$ 실결제액 0원) 시 중복 차감 에러 없이 클라이언트 검증과 RPC 호출이 모두 통과되도록 함.
    - `process_expense_payment` RPC 검증을 만족하도록 `uPoints > 0`일 때 `discountAmount = 0`, `pointDiscountAmount = effectiveDiscount`, `usedPoints = uPoints`로 매핑.
    - 결제 플랫폼(`GOOGLE_PLAY`, `GALAXY_STORE`)과 포인트 지갑을 1:1 강제 동기화하고 중복 선택 드롭다운(`#expense-point-platform`)을 `disabled`로 고정.
    - 결제 플랫폼 `OTHER` 선택 시 `usedPoints`를 즉시 `""`로 초기화하고 입력 필드를 `disabled` 처리(스토어 외 포인트 사용 불가).
  - **사이드바 카드 배치 순서 및 선택일 카드 드롭다운 탭 추가**:
    - 사이드바 카드 순서를 `1) 요약` $\to$ `2) 선택일 상세` $\to$ `3) 스토어 포인트`로 변경.
    - 선택일 카드 헤더 바로 아래에 `게임 일정` (기본값) / `지출 내역` / `메모` 드롭다운(`<select aria-label="선택일 상세 항목 선택">`)을 배치하여 선택된 항목 1개만 본문에 렌더링.
    - 메모 탭 선택 시 비편집 상태에서 `[작성]` / `[수정]` 버튼이 표시되며 편집 상태 시 `<textarea>` 및 `[취소]` / `[저장]` 제공.
  - **모바일 바텀시트(`MobileDrawer`) 제스처 간섭 해결 및 반응형 최적화**:
    - 바텀시트 제스처 간섭 방지를 위해 인터랙티브 요소에 `data-vaul-no-drag` 속성 부여.
    - 메모 작성/수정 버튼 터치 영역 개선, 저장/취소 버튼에 `onPointerDown`/`onMouseDown` 이벤트 전파 방지 적용으로 키보드 blur 포커스 유실 차단.
    - `MobileDrawer`와 `HeroSidebar`에 `confirmedExpense`, `onIncomeAdded` props 완전 동기화.
    - `CalendarBgCustomizer` 모바일 뷰포트 대응 `max-w-[calc(100vw-2rem)]` 및 슬라이더 터치 영역 개선.
- **수행 내역 및 검증**:
  - `src/lib/budget-calculations.ts` / `budget-calculations.test.ts`: 확정 지출 계산 함수 및 테스트 추가.
  - `src/lib/payment-calculations.ts` / `payment-calculations.test.ts`: 100% 포인트 할인 및 플랫폼 해석 검증.
  - `src/components/expense/expense-modal.tsx` / `expense-modal.test.tsx`: 100% 포인트 할인 결제 및 플랫폼 동기화/비활성화 검증.
  - `src/components/calendar/hero-sidebar.tsx` / `hero-sidebar.test.tsx`: 카드 순서, 요약 카드 진행률, 드롭다운 탭 전환 및 메모 편집/저장, `data-vaul-no-drag` 검증.
  - `src/components/calendar/mobile-drawer.tsx`: props 완전 동기화.
  - `src/components/calendar/calendar-bg-customizer.tsx`: 모바일 뷰포트 반응형 보강.
  - `src/app/dashboard/page.tsx` / `page.test.tsx`: props 연동 및 캘린더 타일 클릭 테스트 갱신.
  - 검증: `tsc --noEmit` (통과), `vitest run` (42개 파일, 251개 테스트 전체 통과), `npm run build` (Next.js 15개 정적 페이지 빌드 성공).

## 5대 AI 모델 역할 분배 및 인수인계 문서 기반 자동 과제 실행·비상 인계(Fallback) 아키텍처 구축 (2026-10-19)

- **결정 및 배경**:
  - **다중 모델 협업 및 단일 프롬프트 디스패치(`"인수인계 문서를 확인해"`) 체계 도입**:
    - 주축 모델인 **Gemini 4 Argon**을 중심으로 **GPT Codex**, **Claude Opus 5.5**, **GitHub Copilot**, **Gemini 3.8 Flash**의 5대 AI 모델이 ChronoLedger 파이프라인(`Orchestrator` $\to$ `Maker` $\to$ `Reviewer`)에서 각자의 강점에 맞는 역할을 분담하고, 사용자가 어느 모델에서든 `"인수인계 문서를 확인해"`라고 입력하면 `docs/handoff.md` 최상단의 **Active AI Collaboration Dispatch Queue**에서 즉시 자신의 활성 과제를 찾아 이행하는 Blackboard 아키텍처를 수립함.
  - **`.worktrees/<run_id>` 격리 실행과 루트 `docs/handoff.md` 단일 진실 공급원(SSOT) 연동**:
    - `scripts/collaboration/New-CollaborationRun.ps1`은 루트 작업 트리가 깨끗할 때만 실행되므로, Orchestrator가 먼저 격리 Worktree(`.worktrees/<run_id>`)를 생성한 직후 루트 `docs/handoff.md`의 Dispatch Queue에 대상 Worktree 경로와 과제를 기록하도록 순서를 규정함.
  - **토큰/컨텍스트 소진 대비 2중 안전장치 (Soft Checkpoint + Hard Cutoff Auto-Recovery)**:
    - **시나리오 A (사전 감지 인계)**: 작업 중 토큰 부족 감지 시 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고, 담당 모델 칸에 대체 모델(`➡️ 대체 모델명`)을 표시한 뒤 `중단 체크포인트`에 완료/미완료 내역을 기록함.
    - **시나리오 B (강제 중단 자동 복구)**: 플랫폼 쿼터 초과로 문서를 미처 수정하지 못하고 강제 종료된 경우에도, 사전에 병기된 대체(Fallback) 모델에서 `"인수인계 문서를 확인해"`를 입력하면 해당 Worktree의 `git status --short` 및 `git diff`를 자동 스캔하여 이전 모델이 작성하다 멈춘 미커밋 코드를 이어받아 완수하도록 프로토콜화함.
- **수행 내역**:
  - `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `md/SKILL.md`: `"인수인계 문서를 확인해"` 5단계 실행 프로토콜, 5대 AI 모델 역할 및 Fallback 매트릭스, 토큰 소진 시 비상 인계 규칙 명문화.
  - `.github/copilot-instructions.md`: GitHub Copilot 세션에서 `"인수인계 문서를 확인해"` 수신 시 Dispatch Queue 즉시 실행 및 `git diff` 기반 강제 중단 복구 규칙 추가.
  - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `chronoledger-maker/SKILL.md`, `chronoledger-reviewer/SKILL.md`: Orchestrator의 5대 모델 라우팅/Worktree 생성 순서 및 Maker/Reviewer의 Dispatch Queue 상태 전이·체크포인트 작성 규칙 반영.
  - `docs/handoff.md`: 최상단에 `## 🎯 Active AI Collaboration Dispatch Queue` 상설 보드 신설.
  - `docs/architecture.md`: 5대 AI 다중 에이전트 디스패치 및 Fallback 인계 아키텍처 책임 구조 반영.

## 캘린더 날짜별 개인 메모 저장 실패 결함 해결 및 UNIQUE 제약조건 마이그레이션 (2026-10-19)

- **결정 및 배경**:
  - **Supabase upsert onConflict 실패 문제**:
    - PostgreSQL의 `ON CONFLICT (user_id, memo_date)` 구문은 해당 컬럼들에 대한 `UNIQUE` 제약조건 또는 `UNIQUE` 인덱스가 데이터베이스에 물리적으로 생성되어 있어야만 실행이 가능함.
    - 기존 `md/SCHEMA.sql` 및 실제 DB에 이 제약조건이 없어 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 에러로 인해 메모 작성이 저장되지 않는 현상이 발생함.

  - **방어적 클라이언트 분기 로직 적용**:
    - DB 스키마 수정 마이그레이션이 즉시 반영되지 않은 환경에서도 메모 저장이 100% 보장되도록 `src/app/dashboard/page.tsx`의 `handleSaveMemo`를 `upsert` 의존에서 벗어나 `existingMemo` 존재 여부에 따른 명시적 `update` / `insert` / `delete` 분기 구조로 개편.
    - 또한 저장이 진행되는 동안 사용자 인터페이스가 멈추거나 튕기지 않고 타일의 점(`day.hasMemo`)과 사이드바에 즉각 변경사항이 표시되도록 낙관적 상태 갱신(`setMemos`)을 적용함.
- **수행 내역**:
  - `src/app/dashboard/page.tsx`:
    - `MemoRow` 타입에 `id?: string` 추가.
    - `personal_memos` select 쿼리에 `id` 포함.
    - `handleSaveMemo`에서 `upsert({ onConflict })` 제거 $\to$ `existingMemo ? update : insert`, 빈 메모 삭제(`delete`) 분기 및 `setMemos` 낙관적 업데이트.
  - `src/components/calendar/hero-sidebar.tsx`: `handleSave`에 `try...catch` 및 오류 알림(`alert`) 보강.
  - `md/SCHEMA.sql`: `personal_memos` 테이블에 `CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)` 추가.
  - `md/MIGRATION_MEMO_UNIQUE.sql`: 중복 제거 및 유니크 제약조건 추가 DDL 스크립트 신규 작성.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 241개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공 (0 error).

## 캘린더 날짜 타일 내 당일(Today) 표기 골드 배지 추가 (2026-10-19)

- **결정 및 배경**:
  - **당일(Today) 타일 식별 편의성 향상**:
    - 캘린더를 볼 때 현재 사용자가 위치한 오늘 날짜를 직관적으로 파악할 수 있도록 날짜 표기(ex. 17) 바로 오른쪽에 **`오늘`** 배지를 제공.
    - 배지 색상은 사용자가 요청한 **`#EFBF04`** (골드 옐로우)를 배경색(`backgroundColor: #EFBF04`)으로 적용하고, 텍스트는 명도 대비가 우수한 다크 컬러(`color: #0F1115`)를 적용하여 다크 모드, 라이트 모드, 그리고 커스텀 배경 일러스트 위에서도 선명하게 시인되도록 설계.
  - **레이아웃 및 프로퍼티 연동**:
    - 타일 상단 좌측 날짜 영역을 `flex items-center gap-1`로 구성하여 배지와 날짜 숫자가 깔끔하게 정렬되며, 우측의 게임 아이콘이나 모바일 도트의 자리를 침범하지 않음.
    - `DesktopCalendarProps.todayDate` 및 `DesktopCalendarDay.isToday`를 통해 현재 일자를 유연하게 전달/테스트할 수 있도록 구현.
- **수행 내역**:
  - `src/components/calendar/desktop-calendar.tsx`: `isToday` 조건부 `오늘` 골드 배지(`backgroundColor: #EFBF04`) 렌더링.
  - `src/app/dashboard/page.tsx`: `days` useMemo에서 `isToday: cell.date === today` 및 `todayDate` prop 연동.
  - `src/components/calendar/desktop-calendar.test.tsx`: 당일 타일 배지 렌더링 및 비당일 배지 미렌더링 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 241개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 시인성 대폭 개선: 글래스모피즘 타일, 날짜 타일 투명도(0~90%)·배경 투명도(10~90%) 개별 조절 및 가독성 섀도우 보강 (2026-10-18)

- **결정 및 배경**:
  - **배경 일러스트 가림 현상의 원인 및 해결**:
    - 기존 구조에서는 캘린더 커스텀 배경을 켜더라도, 42개 날짜 타일의 75% 불투명 배경(`bg-app/75`)과 가독성 오버레이(`bg-surface/40`), 그리고 투명도 상한선 60%의 3중 중첩으로 인해 실제 배경 일러스트가 5% 미만 수준으로만 투과되어 일러스트가 거의 보이지 않는 문제가 발생함.
    - 이를 해결하기 위해 오버레이를 `bg-surface/15`로 완화하고, 날짜 타일의 배경 투명도(`tileOpacity`)를 기본 `15%` 글래스모피즘으로 적용하되 사용자가 직접 **0%(완전 투명) ~ 90%(진하게)** 범위에서 슬라이더로 조절할 수 있도록 개편.
  - **직전 작업 코드 점검 및 보완 사항**:
    - 커스텀 배경 활성화 시 날짜 숫자 `<span>`에 지정된 `text-content`가 부모 버튼의 `text-content-muted`를 덮어써서 이전/다음 달 날짜(`!day.inCurrentMonth`)의 텍스트 색상 구분이 약해지던 문제를 수정.
    - 동적 인라인 `style.backgroundColor` 적용 시 기존 `hover:bg-surface/30` 클래스가 CSS 명시도(specificity)로 인해 무시되거나 고불투명도(예: 70%) 설정 시 오히려 흐려질 수 있는 문제를 방지하기 위해 `hover:border-line hover:ring-1 hover:ring-primary/30`으로 호버 인터랙션을 개선.
    - `CalendarBgCustomizer` 내 미정의 클래스(`hover:bg-surface-1`)를 `hover:bg-surface`로 정정하고, `DesktopCalendar`의 기본 투명도 폴백을 `DEFAULT_CALENDAR_BG_SETTINGS.opacity`(`40`)로 통일.
  - **배경 투명도 상한선 90% 확대, 원본 업로드 한도 50MB 확대 및 텍스트/배지 가독성 섀도우 보강**:
    - 배경 이미지 투명도 슬라이더 상한선을 60%에서 90%(`MAX_BG_OPACITY = 90`, 기본값 `40%`)로 확대.
    - 15MB가 넘는 고해상도(4K/8K 등) 대용량 일러스트도 브라우저 리사이징/압축 프로세스를 통과할 수 있도록 원본 파일 크기 상한을 기존 15MB에서 **50MB**로 확대.
    - 날짜 숫자에 `drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] font-bold`, 요일 헤더에 `drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-medium`, 일정 배지 컨테이너에 `drop-shadow-sm`, 게임 아이콘 및 모바일 도트에 `ring-1 ring-background/60 shadow-sm`을 부여하여 모든 배경에서 또렷하게 식별되도록 보강.
- **수행 내역**:
  - `src/lib/calendar-bg-storage.ts`: `MAX_BG_OPACITY = 90`, `DEFAULT_BG_OPACITY = 40`, `MIN_TILE_OPACITY = 0`, `MAX_TILE_OPACITY = 90`, `DEFAULT_TILE_OPACITY = 15`, `clampTileOpacity` 추가 및 IndexedDB 영구 보관 연동.
  - `src/components/calendar/calendar-bg-customizer.tsx`: 배경 투명도(10~90%) 슬라이더 및 **날짜 타일 투명도(0~90%) 슬라이더** 제공, 초기 상태 판별(`isDefaultState`)에 `tileOpacity` 반영.
  - `src/components/calendar/desktop-calendar.tsx`:
    - 오버레이: `bg-surface/40` $\to$ `bg-surface/15`.
    - 타일 배경: 커스텀 배경 시 `style={{ backgroundColor: "rgb(var(--surface) / ${tileOpacityRatio})" }}` 및 `tileOpacityRatio > 0`일 때 `backdrop-blur-[1px]`.
    - 날짜 숫자, 요일 헤더, 배지, 아이콘에 섀도우 및 링 대비 스타일 추가.
  - `src/app/dashboard/page.tsx`: `bgTileOpacity` 상태 및 `handleChangeBgTileOpacity` 핸들러 연동.
  - 테스트 및 픽스처 갱신:
    - `src/lib/calendar-bg-storage.test.ts` (6개 PASS)
    - `src/components/calendar/calendar-bg-customizer.test.tsx` (1개 PASS)
    - `src/components/calendar/desktop-calendar.test.tsx` (5개 PASS)
    - `src/app/dashboard/expenses/page.test.tsx` (16개 PASS)
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 240개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 이미지 업로드·투명도/블러 조절 구현, 사용자 지정 게임 아이콘 전역 적용 및 픽업 그래프 다중 색상 적용 (2026-10-17)

- **결정 및 배경**:
  - **캘린더 커스텀 배경 이미지 로컬(IndexedDB) 영구 보관 및 가독성 보호 설계 (Phase 12.3)**:
    - 고해상도 배경화면 이미지를 서버(Supabase Storage)에 업로드할 경우 대역폭과 스토리지 한도를 급격히 소모하므로, 클라이언트 `Canvas`를 통해 최대 `1920×1080` 비율 유지 WebP(품질 0.82)로 압축한 뒤 브라우저 로컬 `IndexedDB`(`chronoledger_calendar_bg`)에 사용자별로 영구 보관하도록 설계.
    - 배경 이미지가 과도하게 선명하면 달력의 날짜·게임 아이콘·일정 배지(`VERSION`/`PICKUP`/`CONTENTS`) 가독성을 해치므로, 투명도 상한을 **10% ~ 60%**로 제한(`clampBgOpacity`)하고, 3단계 블러(`Off` / `약함 4px` / `보통 8px`) 및 반투명 표면 오버레이(`bg-surface/40`)를 결합.
  - **사용자 지정 게임 아이콘(Custom Game Icon) 표시 범위 확대**:
    - 기존에는 `/dashboard/games` 페이지에서만 `downloadUserIcon(userId, gameId)`를 호출하여 사용자가 업로드한 커스텀 아이콘을 표시하고, 정작 달력 타일(`/dashboard`)과 소비/구독 내역(`/dashboard/expenses`)에서는 DB의 `default_icon_url`만 참조하여 커스텀 아이콘이 반영되지 않던 문제를 해결.
    - `storage-upload.ts`의 인메모리 캐시(`userIconCache`)를 활용하여 페이지 이동 시 중복 다운로드 없이 즉시 커스텀 아이콘 ObjectURL을 공유하도록 구성.
  - **게임 픽업별 과금 분석 차트 색상 다각화**:
    - `/dashboard/expenses`의 `게임 픽업별 과금 분석` 탭은 게임 카테고리의 픽업 배너들을 비교·분류하기 위한 영역임에도 모든 픽업 막대가 동일한 단일 색상(`#6366F1`)으로 렌더링되어 시각적 구분이 어려웠음.
    - 8색 다중 팔레트(`PICKUP_CHART_PALETTE`)를 도입하여 각 픽업 배너 막대마다 고유한 색상을 부여하고, 우측 `픽업 과금 순위` 리스트에도 동일한 색상의 원형 도트 인디케이터를 배치하여 차트와 순위표 간 직관적 대응성을 높임 (`일반` 지출은 슬레이트 컬러 `#64748B`로 구분 유지).
- **수행 내역**:
  - `src/lib/calendar-bg-storage.ts` (신설):
    - `loadCalendarBgRecord`, `saveCalendarBgRecord`, `clearCalendarBgRecord`: IndexedDB 및 메모리 폴백 기반 영구 저장/복원/초기화.
    - `compressCalendarBgImage`, `calculateScaledDimensions`, `clampBgOpacity`, `getBlurFilterCss`: 이미지 압축 및 스타일 정규화 순수/유틸 함수.
  - `src/components/calendar/calendar-bg-customizer.tsx` (신설):
    - 캘린더 상단 헤더의 `[배경 설정]` 팝오버 컨트롤러 (이미지 업로드/변경, 10%~60% 투명도 슬라이더, Off/약함/보통 블러 토글, 기본 배경 초기화).
  - `src/components/calendar/desktop-calendar.tsx`:
    - `backgroundConfig` 및 `bgCustomizer` prop 지원, 하단 `object-fit: cover` 배경 이미지 레이어 및 반투명 가독성 오버레이 렌더링.
  - `src/lib/storage-upload.ts`, `src/app/dashboard/games/page.tsx`:
    - `downloadUserIcon` 안전 가드 추가 및 업로드 직후 캐시 ObjectURL 공유 연동.
  - `src/app/dashboard/page.tsx`:
    - 캘린더 커스텀 배경 상태(`bgBlob`, `bgImageUrl`, `bgOpacity`, `bgBlur`) 및 IndexedDB 핸들러 연동, `gameIcons` 병렬 조회 및 달력 타일/사이드바/필터 커스텀 아이콘 우선 적용.
  - `src/app/dashboard/expenses/page.tsx`:
    - 지출 내역 및 정기 구독 템플릿 카드에 커스텀 아이콘 우선 적용, `PICKUP_CHART_PALETTE` 기반 픽업 차트 및 순위 리스트 컬러 도트 적용.
  - 단위 테스트 (`src/lib/calendar-bg-storage.test.ts`, `src/components/calendar/calendar-bg-customizer.test.tsx`, `src/components/calendar/desktop-calendar.test.tsx`, `src/app/dashboard/page.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`):
    - 총 10개의 신규 테스트 케이스 추가.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 239개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 누적 충전형 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감 롤백 및 카드 배지 개선 (2026-10-15)

- **결정 및 배경**:
  - **누적 충전형 조기 결제 시 기존 잔여일수 보존 및 누적 연장**:
    - 누적 충전형(`INTERVAL_30`, 예: 월정액 30일권) 구독 상품을 예정일보다 이른 시점에 결제하여 확정 상태로 변경했을 때, `process_expense_payment`가 해당 지출 레코드의 `target_date`를 결제일로 갱신하면서 발생했던 잔여일수 유실(남아있던 10일 등이 날아가고 결제일 기준 30일로 고정되던 결함)을 원천 해결.
    - 조기 결제($D_{pay} < D_{orig\_target}$) 시 새 예정일을 $D_{orig\_target} + \text{stepDays}$로 계산하여, 기존 잔여 일수가 온전히 보존된 상태에서 연장 일수가 누적되도록 확립.
  - **결제 환불 시 충전 일수 정확한 차감(롤백)**:
    - 결제된 누적 충전형 지출을 환불(취소)할 경우, 해당 결제로 인해 연장되었던 다음 예정(`PLANNED`) 지출의 예정일(`target_date`)에서 충전 일수(`interval_days`, 기본 30일)를 차감하여 결제 전 원래 예정일로 완벽하게 되돌리는 롤백 메커니즘(`rollbackIntervalSubscriptionExpense`) 구현.
  - **결제 및 환불 모달 원자적 연동**:
    - `ExpenseModal`: 결제 성공 시 `createNextIntervalSubscriptionExpense` 호출.
    - `ExpenseDetailModal`: 환불 성공 시 `rollbackIntervalSubscriptionExpense` 호출.
  - **정기 구독 카드 배지 텍스트 간결화**:
    - 소비 페이지(`/dashboard/expenses`)의 정기 구독 카드에서 `[누적 충전형 n일]` 표시 옆의 `[남은 n일]` 표시를 `[n일]`로 간결하게 변경.
- **수행 내역**:
  - `src/lib/subscription-sync.ts`:
    - `calculateNextIntervalTargetDate`: 조기 결제 시 기존 예정일 가산 계산.
    - `createNextIntervalSubscriptionExpense`: 다음 회차 `PLANNED` 레코드 자동 생성 함수.
    - `calculateRollbackIntervalTargetDate`: 환불 시 충전 일수 차감(롤백) 계산.
    - `rollbackIntervalSubscriptionExpense`: 환불 시 다음 `PLANNED` 지출의 예정일 차감 업데이트 함수.
  - `src/components/expense/expense-modal.tsx`:
    - `PlannedExpenseInput`에 `template_id` 추가 및 결제 성공 후 자동 생성 연계.
  - `src/components/expense/expense-detail-modal.tsx`:
    - `ExpenseDetail`에 `template_id` 추가, `useAuth()` 연동 및 환불 성공 후 롤백 차감 함수 연동.
  - `src/app/dashboard/expenses/page.tsx`:
    - `handleConfirmPlanned`, `handleOpenRefund`에 `template_id` 전달.
    - 구독 카드 배지: `남은 {diffDays}일` $\to$ `{diffDays}일`.
  - `src/app/dashboard/page.tsx`, `src/components/expense/overdue-planned-modal.tsx`:
    - `EXPENSE_COLUMNS`, `OverduePlannedExpense`에 `template_id` 필드 연동.
  - `src/lib/subscription-sync.test.ts`, `src/components/expense/expense-detail-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`:
    - 누적 연장, 환불 롤백, 배지 라벨 렌더링 검증 단위 테스트 작성.
- **검증 증거**:
  - `npx vitest run`: 40개 파일 / 229개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 스토어 지갑·포인트 수동 보정 내역(Audit Log) 조회 모달 구현 (2026-10-14)

- **결정 및 배경**:
  - **수동 잔액 보정 이력 추적성(Auditability) 확보**:
    - 사용자가 `/dashboard/settings`의 스토어 지갑 관리에서 실제 앱 잔액과 차이가 발생했을 때 수동으로 잔액을 보정할 수 있으나, 과거에 언제 어떤 이유로 보정했는지 추적할 수 있는 UI 수단이 부재했음.
    - `store_point_transactions` 테이블에 `transaction_type = 'MANUAL_ADJUST'`로 저장된 보정 레코드들을 사용자가 직접 모달로 조회할 수 있도록 신규 기능 구현.
  - **플랫폼별 필터링 및 단위 대응**:
    - Google Play, Galaxy Store (포인트, P) 및 네이버페이 (머니, 원) 각각의 단위와 배지 색상을 명확히 분리하여 직관적인 UI 제공.
    - 전체 및 개별 플랫폼 필터 탭과 새로고침 기능을 제공하여 실시간 정합성 확인 지원.
- **수행 내역**:
  - `src/components/wallet/store-wallet-adjust-history-modal.tsx`:
    - `StoreWalletAdjustHistoryModal` 신설.
    - Supabase RLS 정책(`Read own point transactions`)에 따라 `transaction_type = 'MANUAL_ADJUST'` 레코드를 최신순 조회.
    - 일시, 플랫폼 배지, 변동 차액(+/-), 보정 후 잔액, 사유 메모 뷰어 구성.
    - **5개 기준 페이지네이션 (`ITEMS_PER_PAGE = 5`) 바 및 스마트 번호 내비게이션 구현**.
  - `src/components/wallet/store-wallet-widget.tsx`:
    - 지갑 잔액 수동 보정 헤더 우측에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
  - `src/components/wallet/store-wallet-adjust-history-modal.test.tsx`, `store-wallet-widget.test.tsx`:
    - 빈 상태, 데이터 렌더링, 플랫폼 필터링, 에러 및 재시도, 모달 열기 버튼 연동, **5개 단위 페이지네이션 및 이전/다음 이동** 단위 테스트 작성.
  - `docs/to-do.md`, `docs/develop_task_backlog.md`:
    - 백로그 문서를 `docs/to-do.md`의 `Phase 12`로 완전 일원화하여 단일 기준(Single Source of Truth) 체계 확립.
- **검증 증거**:
  - `npx vitest run`: 40개 파일 / 216개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 버전 패스형(결제 유예) 지출 옵션·연계 픽업 드롭다운 구현 및 모바일 달력 일정 점 정상화 (2026-10-14)

- **결정 및 배경**:
  - **버전 패스/누적형 구독의 결제 유예 변동성 확립**:
    - 버전 패스는 버전 종료일(`end_date`) 전까지만 결제하면 보상을 소급 수령할 수 있으므로, 최종 결제 마감 시한인 `end_date`까지 결제 확정일에 유연한 변동성(결제 유예)이 보장되어야 함.
    - 단발성 패키지/픽업 지출(특정일 결제)과 버전 패스(기간형 결제 유예)를 지출 모달에서 분리 지원.
  - **연계 픽업 선택 드롭다운 제공**:
    - 버전 패스 선택 시 해당 버전의 어떤 픽업 배너에 연계할지 드롭다운으로 직접 선택(전반/후반/동시 연계/선택 안 함)하여 픽업별 과금 통계의 정합성을 확보.
  - **마감일(`end_date`) 기준 예산 귀속 및 만료 판정**:
    - 미결제(`PLANNED`) 버전 패스의 월 예산 귀속을 최종 결제 마감 시한인 `end_date`가 속한 달로 지정하여 가용 예산 왜곡 방지 (실제 결제 시 실결제일 월로 확정 귀속).
  - **모바일 달력 일정 점(Dot) 시작일 정상화**:
    - `day.schedules.some((s) => s.is_start_date)`를 기준으로 하여 일정 시작일에만 파란 점이 노출되도록 개선.
- **수행 내역**:
  - `src/components/calendar/desktop-calendar.tsx`, `desktop-calendar.test.tsx`:
    - 모바일 달력 파란 점 시작일 조건 변경 및 테스트 케이스 추가.
  - `src/components/expense/expense-modal.tsx`, `expense-modal.test.tsx`:
    - `isVersionPass` 체크박스 및 `manualPickupId` 드롭다운 UI 구현.
    - 버전 패스 선택 시 `start_date`, `end_date` 및 `target_date` 마감일 설정.
    - 단위 테스트 추가 (`버전 패스형 체크박스 선택 시 버전 시작일~종료일 기간이 반영되고, 연계 픽업을 드롭다운에서 선택할 수 있다`).
  - `src/lib/budget-calculations.ts`, `budget-calculations.test.ts`:
    - `getBudgetDate`를 미결제 기간형의 경우 `end_date` 기준, 결제 완료 및 특정일의 경우 `target_date` 기준으로 분기.
  - `src/app/dashboard/expenses/page.tsx`:
    - `getExpenseEffectiveDate`에서 미결제 기간형의 경우 `end_date` 반환.
- **검증 증거**:
  - `npx vitest run`: 39개 파일 / 209개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 export 빌드 성공.

## 결제 수단 / 결제 플랫폼 / 할인 수단 정합성 리팩토링 및 0원 결제·복합 결제 지원 (2026-10-13)

- **결정 및 배경**:
  - **실결제 수단(`PaymentMethod`) 2대 체계 정립**:
    - 실제로 사용자의 자본이 인출되는 실결제 수단을 **'내 지갑'(`WALLET`, 계좌/현금)**과 **'네이버페이'(`NAVER_PAY`, 머니 및 10,000원 단위 올림 자동 충전)**로 엄격히 한정.
    - 기존에 결제 수단으로 오분류되어 있던 'Google Play'와 'Galaxy Store'는 결제가 일어나는 **결제 플랫폼(스토어)**이자 쿠폰/포인트 **할인 수단**으로 재분류.
  - **스토어 포인트 적립(`estimateEarnedPoints`) 기준 개편**:
    - 기존에는 결제 수단이 스토어(`GOOGLE_PLAY`/`GALAXY_STORE`)여야만 적립되어 '내 지갑'이나 '네이버페이' 결제 시 적립이 누락되던 모순 해결.
    - 결제 수단과 무관하게 **결제 플랫폼(`PaymentPlatform`)**이 Google Play 또는 Galaxy Store이면, 최종 실결제액에 대해 해당 스토어 등급별 적립률로 포인트가 자동 계산/적립되도록 로직 수정.
  - **네이버페이 + 스토어 포인트 복합 결제 허용**:
    - 인앱 결제 시 구글 플레이/갤럭시 스토어 포인트를 사용하고 남은 차액을 네이버페이로 결제할 수 있도록 지원.
    - 네이버페이 선택 시 포인트 필드 비활성화 제약 및 DB RPC 내 네이버페이+포인트 사용 에러 제약 해제.
  - **100% 전액 할인 및 포인트 결제 (0원 결제) 지원**:
    - 할인과 포인트로 전액 차감 시 최종 실결제액이 0원이 되며, 자산 차감 및 네이버페이 충전액이 0원으로 정상 확정(`CONFIRMED`) 처리.
- **수행 내역**:
  - `src/lib/payment-calculations.ts`, `src/lib/payment-calculations.test.ts`:
    - `PaymentMethod`(`WALLET` | `NAVER_PAY`), `PaymentPlatform`, `PointPlatform`, `WalletPlatform` 정제.
    - 플랫폼 기반 적립 산식 및 0원 결제, 네이버페이 복합 결제 검증 로직 구현.
  - `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`:
    - 결제 플랫폼 선택과 결제수단 선택의 분리 UI 제공.
    - 0원 결제 네이버페이 프리뷰 안내 및 스토어 포인트 복합 결제 허용.
  - `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`:
    - 결제 플랫폼 라벨 추가 및 구버전 결제수단 하위 호환 표시.
  - `md/MIGRATION_PAYMENT_REFINEMENT.sql`, `md/SCHEMA.sql`:
    - `process_expense_payment`, `refund_expense_payment` RPC 갱신 및 기존 결제수단 마이그레이션 DDL 제공.
- **검증 증거**:
  - `npx vitest run`: 39개 파일 / 192개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 export 빌드 성공.

## 다중 픽업 배너 1x 회계 방어·수익 추가·앱 아이콘 및 13가지 종합 UX 개선 (2026-10-13)

- **결정 및 배경**:
  - **1x 회계 정합성 방어 & 복수 픽업 바인딩**:
    - 동일 기간 내 동일 게임에 2개 이상의 픽업 배너가 열려 있는 경우, 지출 등록 시 `[진행 중인 모든 배너에 동시 연계]`를 지원.
    - 단일 지출 레코드(실제 결제액 1건)를 기반으로 하여 총 자산 차감(-1x), 게임 총 과금액(+1x), 카테고리 지출액(+1x)이 절대 2배(2x) 중복 계산되지 않도록 엄격히 방어.
    - 지출 목록 및 픽업 통계 차트에서는 각 픽업 배너에 동시 연계 뱃지 및 통계를 표시하고 명확한 안내 문구(`※ 동일 기간 복수 배너 지출은 각 배너 항목에 동시 연계되며, 게임 전체 과금액 및 총 자산 차감은 1회(1x)만 정상 합산됩니다`) 제공.
    - 진행 중인 픽업이 없을 때는 자동으로 `[일반]` 지출로 처리되어 `[버전 일반]` $\to$ `[일반]` 라벨 일원화.
  - **수익(급여, 용돈 등) 추가 기능 신설**:
    - `IncomeModal` 컴포넌트(`src/components/finance/income-modal.tsx`) 생성.
    - 소비 페이지(`/dashboard/expenses`) 상단 헤더에 `[+ 수익 추가]` 버튼(에메랄드) 및 대시보드 사이드바(`hero-sidebar.tsx`) 요약 카드에 `[+ 수익]` 버튼 배치.
    - 급여/용돈/상여금/금융수익/기타 선택, 실시간 총 자산 증액 프리뷰 및 `set_user_finance_settings` RPC를 통한 자산 안전 증액 연동.
  - **앱 아이콘 및 PWA 마스커블 아이콘 Safe Zone / 파비콘 정비**:
    - 안드로이드/PWA Adaptive Icon 원형 마스크(지름 80% 안전 구역)에 맞추어 `scripts/generate_icons.py`에서 `k=0.75` 축소 및 maskable 생성 시 외곽 테두리 사각형 제거(이중 프레임 방지).
    - `public/favicon.ico`(16, 32, 48 멀티사이즈) 생성 및 `layout.tsx` metadata icons 연결.
  - **소비 페이지 7일 경과 과거 기록 분리 및 오름차순 정렬**:
    - `today <= end_date + 7`은 기본 내역, `today > end_date + 7`은 헤더 우측 `[과거 기록 (N건)]` 버튼으로 토글 분리.
    - 유효 날짜(`start_date < end_date`이면 `end_date`, 그 외 `target_date`) 기준 오름차순(과거 $\to$ 미래) 정렬.
    - 정기 구독 탭 카테고리 필터 `[전체/게임/기타]` 드롭다운 추가.
  - **캘린더 & 사이드바 UI 개선**:
    - Netlify(`/`) 접속 시 `/auth` 리다이렉트 지연 해결 (`public/_redirects` 302 규칙 추가 및 meta refresh/인라인 스크립트 적용).
    - 달력 타일 높이 균일화(`h-[54px] md:h-[100px]`), 모바일 달력 dot icon(일정=primary, 메모=muted) 간소화.
    - 모바일 일자 선택 후 메모 작성 드로어 버튼 연결.
    - 우측 사이드바 스토어 포인트 순서 고정(Google $\to$ Galaxy $\to$ 네이버페이) 및 네이버페이 '원' 단위 분기 표기.
    - 명일방주 등 슬래시(`/`) 구분 다중 캐릭터 배너 뱃지 분리 표시(`ScheduleTitleBadges`).
    - 관리자 페이지(`/admin`) 공식 일정 카드 좌측 배경에 게임 아이콘 그라데이션 마스킹 적용.
- **수행 내역**:
  - `public/_redirects`, `src/app/page.tsx`
  - `public/favicon.ico`, `public/icons/*`, `scripts/generate_icons.py`, `src/app/layout.tsx`
  - `src/components/finance/income-modal.tsx`, `income-modal.test.tsx`
  - `src/components/expense/expense-modal.tsx`, `expense-modal.test.tsx`
  - `src/app/dashboard/expenses/page.tsx`, `expenses/page.test.tsx`
  - `src/components/calendar/hero-sidebar.tsx`, `hero-sidebar.test.tsx`
  - `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`
  - `src/app/admin/page.tsx`
- **검증 증거**:
  - `npx vitest run`: 39개 테스트 스위트 / 189개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: TypeScript 검증 에러 0건 (완전 무결).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 정기 구독 템플릿 정렬 및 구독 게임 가나다순 정렬·12개 단위 페이지네이션 구현 (2026-10-13)

- **결정 및 배경**:
  - `/dashboard/expenses` 정기 구독 탭: 사용자 요청에 따라 정기 구독 템플릿 목록의 정렬 순서를 `[게임]` 그룹(게임별 묶음, 가나다순) $\to$ `[정기 구독]` 그룹(고정 결제일 오름차순 $\to$ 누적 충전형)으로 일원화.
  - `/dashboard/games` 구독 게임 탭: 내 구독 게임 카드들을 게임 이름 기준 가나다순으로 정렬하고, 12개 단위 페이지네이션을 적용하여 대량의 게임 구독 시에도 쾌적한 탐색 UI 제공.
  - 일반 사용자 계정(`users.id = dae6adf8-7bfe-457e-8a05-c1e2ce64a381`) 테스트를 위한 더미 데이터 SQL(`md/DUMMY_DATA_USER.sql`) 제공.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`:
    - `sortedTemplates` 훅 추가: 게임 템플릿 판별 후 게임명 가나다순 $\to$ 주기 순 $\to$ 결제일 순 정렬, 일반 구독 템플릿은 결제일 오름차순 $\to$ 누적 충전형 순 정렬.
  - `src/app/dashboard/games/page.tsx`:
    - `sortedUserGames` 훅: 게임 이름 가나다순 정렬.
    - `GAMES_PER_PAGE = 12` 기준 페이지네이션 바 UI 추가 (`getPaginationRange`, 이전/다음, 페이지 번호).
  - `md/DUMMY_DATA_USER.sql`, `md/CLEANUP_DUMMY_DATA_USER.sql`:
    - 사용자 자산 150만 원, 10월 예산 35만 원.
    - 스토어 지갑 3종(Google Play GOLD 13%, Galaxy Store GENERAL 10%, Naver Pay 0%).
    - 게임 14종 카탈로그 및 전체 구독 등록(12개 페이지네이션 테스트 지원).
    - 정기 구독 템플릿 7종(정렬 순서 검증 지원).
    - 지출 18건(확정 12건, 예정 4건, 취소 2건) 및 캘린더 메모 등록.
    - 테스트 완료 후 해당 계정의 지출, 구독, 게임, 메모를 원상 복구할 수 있는 정리 스크립트(`md/CLEANUP_DUMMY_DATA_USER.sql`) 제공.
  - 테스트 및 빌드 검증:
    - `src/app/dashboard/games/page.test.tsx`: 가나다순 정렬 및 12개 페이지네이션 검증 테스트 추가.
    - `src/app/dashboard/expenses/page.test.tsx`: 구독 템플릿 5종 정렬 순서 검증 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 168개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: TypeScript 무결성 검증 통과 (에러 0건).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Supabase 원격 Redirect URL 최종 등록 완료 확인 (2026-10-13)

- **결정 및 배경**:
  - Supabase 콘솔(Authentication $\to$ URL Configuration $\to$ Redirect URLs)에 배포 도메인의 `/auth/callback` 등록이 사용자 확인을 통해 완료됨.
  - 이에 따라 Web/PWA 배포 환경에서 Google OAuth 및 PKCE 인증 세션 왕복이 정상 동작할 수 있는 환경 준비가 완료됨.

## 관리자 요청 페이지 요청 승인/반려 권한 보완 및 테이블 폴백 지원 (2026-10-13)

- **결정 및 배경**:
  - 기존 승인/반려 RPC(`approve_game_request`, `reject_game_request`, `approve_schedule_request`, `reject_schedule_request`)가 JWT 토큰의 `app_metadata.role = 'admin'`만 검사하여, 데이터베이스 `public.users.role = 'admin'`으로 권한을 부여받은 관리자 계정에서 승인/반려 실행 시 권한 에러가 발생하던 결함 수정.
  - 마이그레이션 DDL 미적용 원격 환경에서도 관리자 작업이 중단되지 않도록 프론트엔드 단에서 직접 테이블 CUD 폴백 로직을 보강하고 성공 안내 토스트를 추가함.
- **수행 내역**:
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: 4종 승인/반려 RPC에 `public.users.role = 'admin'` 통합 권한 검증 추가.
  - `src/app/admin/requests/page.tsx`:
    - 승인/반려 RPC 실패 시 `games` 인서트, `game_schedules` 인서트/업데이트, `game_requests`/`schedule_requests` 상태 변경 직접 테이블 처리 폴백 구현.
    - 처리 완료 후 성공 피드백 안내 메시지(`successMessage`) 배너 노출.
    - 일정 요청 타입에 `CONTENTS` 추가 대응 (`VERSION` | `PICKUP` | `CONTENTS`).
  - `src/app/admin/requests/page.test.tsx`: 승인/반려 RPC 실패 시 테이블 폴백 처리 및 성공 메시지 노출 검증 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 165개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 관리자 요청 페이지 직접 게임 추가 기능 및 [게임 등록] 버튼 구현 (2026-10-13)

- **결정 및 배경**:
  - 관리자가 일반 유저의 건의를 기다리지 않고 공식 게임 마스터 카탈로그에 신규 게임을 직접 추가할 수 있도록 `/admin/requests` 페이지 상단에 전용 카드 및 폼 배치.
  - 사용자 요구사항에 따라 버튼 이름을 명확히 `[게임 등록]`으로 적용.
- **수행 내역**:
  - `src/app/admin/requests/page.tsx`:
    - "게임 요청" 탭 상단에 `관리자 직접 게임 추가` 카드 추가.
    - 게임 이름, 기본 아이콘 URL 필드 및 유효성 검사(`http:`/`https:`) 구현.
    - 버튼 명칭: `[게임 등록]` (처리 중일 때 `등록 중...`).
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - 보안 정의자 RPC `admin_create_game(p_name TEXT, p_default_icon_url TEXT)` 추가 (관리자 권한 검증, 게임명 중복 검증).
    - 프론트엔드에서 RPC 우선 호출 및 실패 시 direct insert 폴백 지원.
  - `src/app/admin/requests/page.test.tsx`: 관리자 직접 게임 등록 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 163개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 정기 구독 템플릿 수정/삭제 기능 구현 및 카드 액션 버튼 레이아웃 개편 (2026-10-13)

- **결정 및 배경**:
  - 기존에는 정기 구독 탭에서 등록된 템플릿의 세부 정보(제목, 금액, 결제 주기, 결제일 등)를 수정하거나 템플릿 자체를 삭제할 수 없었던 문제 해결.
  - 요구사항에 맞춰 구독 카드의 액션 버튼 레이아웃을 개편:
    - 좌측 정렬: `[수정]`, `[남은 날짜 수정]` (누적 충전형일 때만 노출)
    - 우측 정렬: `[구독 중지]`(또는 `[구독 재개]`), `[휴지통 모양 아이콘]`(삭제)
- **수행 내역**:
  - `src/components/subscription/subscription-modal.tsx`:
    - `editingTemplate` prop 지원 및 기존 폼 값 자동 바인딩.
    - 수정 제출 시 `subscription_templates.update()` 호출 및 미결제(`PLANNED`) 회차의 기본 정보 자동 동기화.
  - `src/app/dashboard/expenses/page.tsx`:
    - 구독 카드에 `Trash2` 삭제 아이콘 버튼 추가 및 확인 다이얼로그 연동.
    - 안전 회차 정리: 미결제(`PLANNED`) 회차는 정리되고, 과거 이미 결제 완료된(`CONFIRMED`) 내역은 안전 보존.
    - `delete_subscription_template` RPC 연동 및 직접 테이블 삭제 폴백 지원.
    - 액션 버튼 행을 좌측(수정 그룹)과 우측(상태/삭제 그룹)으로 분리 배치.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - `delete_subscription_template(p_template_id UUID)` RPC 및 RLS `Delete own templates` 정책 추가.
  - `src/components/subscription/subscription-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`:
    - 템플릿 수정 및 삭제 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 162개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 전체 지출 내역 10개 단위 클라이언트 페이지네이션 및 누적 충전 주기 커스텀 지원 (2026-10-13)

- **결정 및 배경**:
  - 지출 내역이 증가함에 따라 데스크톱/모바일 뷰에서 스크롤이 무한정 길어지는 문제를 해결하기 위해 10개 단위 페이지네이션 도입. (전체 지출 통계 및 차트는 정확도를 위해 전체 데이터 유지).
  - 기존 고정 30일 주기였던 누적 충전형 상품을 7일(주간), 14일(2주) 등 원하는 일수로 자유롭게 지정할 수 있도록 커스텀 주기 지원.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`:
    - `EXPENSES_PER_PAGE = 10` 기준 슬라이싱 적용.
    - 총 N건 중 A-B건 표시, 이전/다음 버튼, 페이지 번호 버튼(스마트 말줄임표 `...`) 구현.
    - 지출 상태 변경/삭제 시 총 페이지 수 축소에 따른 자동 클램핑 `useEffect` 적용.
  - `src/components/subscription/subscription-modal.tsx`, `src/lib/subscription-sync.ts`:
    - 명칭을 '누적 충전형'으로 변경하고, 주기 일수(`interval_days`, 기본값 30일) 자유 입력 지원.
    - 다음 회차 자동 생성 시 `template.interval_days` 반영 및 폴백 지원.
  - `src/app/dashboard/expenses/page.test.tsx`:
    - 25개 지출 항목 기준 페이지네이션 분할 및 이동 검증 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 160개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 게임 버전 패스형/정기 구독 예정 지출 생성 실패 수정 및 버전 시작일 바인딩 개선 (2026-10-13)

- **결정 및 배경**:
  - PostgREST의 `.upsert`가 부분 유니크 인덱스(`WHERE ... IS NOT NULL`) 조건절을 포함하지 못해 발생하던 `42P10` 에러로 인한 예정 지출 저장 중단 해결.
  - 버전 패스 회차 생성 시 목표 결제일(`target_date`)이 버전 종료일이 아닌 실제 오픈일(`s.start_date`)에 바인딩되도록 개선.
  - 소비 페이지 진입 시 미반영 구독 회차를 즉시 생성하는 자동 지연 동기화 연동.
- **수행 내역**:
  - `src/lib/subscription-sync.ts`:
    - `MONTHLY_DAY`, `VERSION_PASS` 모두 기존 등록 회차를 선조회하여 미등록 회차만 필터링한 후 안전한 `.insert()`로 저장 (동시성 23505 에러 무해 처리).
    - 버전 패스 예정 회차의 `target_date`를 버전 시작일(`s.start_date`)로 지정.
  - `src/app/dashboard/expenses/page.tsx`:
    - `loadExpenses()` 실행 시 온라인 상태이면 `ensureMonthlySubscriptionExpenses` 선행 호출.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - `sync_version_expenses_trigger()` SQL 트리거에서 `VERSION` 일정 변경 시 `target_date = NEW.start_date` 자동 동기화.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Alt+Tab/창 전환 시 모달 입력값 초기화 방지 및 백그라운드 재조회 스켈레톤 언마운트 차단 (2026-10-13)

- **결정 및 배경**:
  - 창 포커스 전환(Alt+Tab) 시 백그라운드 데이터 재조회가 트리거되면서 화면이 스켈레톤 컴포넌트로 대체/언마운트되어, 사용자가 모달에서 입력 중이던 내용이 날아가던 현상 차단.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`:
    - `hasLoadedInitialRef` 플래그로 최초 1회 로드 시에만 스켈레톤을 렌더링하고 백그라운드 재조회 시 언마운트 차단.
    - `useCallback` 의존성을 `user` 객체 대신 불변 원시값인 `user?.id`로 교체.
  - `src/components/subscription/subscription-modal.tsx`, `src/components/expense/expense-modal.tsx`:
    - `prevOpenRef` 가드를 적용하여 모달이 닫힌 상태에서 새로 열리는 시점에만 폼을 초기화하도록 수정. 부모 리렌더링 시 폼 값 영구 보존.
  - `src/lib/auth-context.tsx`:
    - `setUser`에서 동일 사용자 식별자 유지 시 불필요한 레퍼런스 변경 방지.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 페이지 로드 부드러움 향상 및 게임 아이콘 지연 로딩 최적화 (2026-10-13)

- **결정 및 배경**:
  - 특정 게임 아이콘(니케 430KB, 스타레일 209KB, 원신 184KB)이 비압축 PNG로 남아있어 타 아이콘 대비 10~30배의 용량 차이로 뒤늦게 로드되던 문제를 해결하기 위해, 에셋을 256x256 WebP 포맷으로 압축 최적화(동일 파일명 유지).
  - PWA 서비스 워커(`sw.js`) 캐시 대상에 `/assets/`와 `/fonts/`를 포함하고 게임 아이콘을 프리캐시 목록에 추가하여 2회차 로드부터 0ms 로딩 보장.
  - 전역 이미지 사전 로드 유틸(`icon-preload.ts`) 및 부드러운 스켈레톤/페이드인 전환(`game-icon.tsx`, `page-skeletons.tsx`, `loading.tsx`) 도입.
- **수행 내역**:
  - `public/assets/games/`: `nikke.png`, `star_rail.png`, `genshin.png` 91~94% 압축 최적화.
  - `public/sw.js`: `/assets/` 및 `/fonts/` 캐시 대상 추가, PRECACHE_URLS 확장, 셸 캐시 v3 승격.
  - `src/lib/icon-preload.ts`: 중복 방지 브라우저 메모리 사전 로더 신규 생성 및 각 페이지 연동.
  - `src/lib/storage-upload.ts`: `downloadUserIcon` 인메모리 캐시 도입으로 중복 네트워크 및 404 대기 차단.
  - `src/components/ui/game-icon.tsx`: 스켈레톤 펄스 + 페이드인 + Fallback 통합 아이콘 컴포넌트 추가 및 캘린더/게임/소비 화면 적용.
  - `src/components/ui/skeleton.tsx`, `page-skeletons.tsx`, `src/app/dashboard/loading.tsx`: 페이지별 스켈레톤 레이아웃 및 Next.js Suspense 로딩 폴백 연동.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공 (0 error).
- **다음 추천 구현 단계**:
  - 실제 디바이스 PWA 환경에서 캐시 히트율 및 전환 애니메이션 체감 품질 최종 확인.

## Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트 완료 (2026-10-13)

- **결정 및 배경**:
  - 모바일(360px~390px) 환경에서 모달 다이얼로그의 입력 여백을 유연하게 처리하기 위해 다이얼로그 패딩을 `p-4 sm:p-6`으로 일관되게 튜닝.
  - 지출 목록 모바일 카드 뷰에서 긴 항목명과 픽업 뱃지가 겹치거나 가로 오버플로우를 발생시키지 않도록 `flex-wrap` 기반 안전 레이아웃 적용.
- **수행 내역**:
  - `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/subscription/subscription-modal.tsx`: 다이얼로그 패딩 `p-4 sm:p-6` 적용.
  - `src/app/dashboard/expenses/page.tsx`: 모바일 카드 뷰 타이틀 뱃지 컨테이너 `flex-wrap` 적용.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 146개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **Phase 11 전체 완료 현황**:
  - Phase 11.1 ~ 11.5 전체 구현 및 검증 완료.
  - Supabase 마이그레이션 DDL: `md/MIGRATION_PHASE11.sql`.

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석 완료 (2026-10-13)

- **결정 및 배경**:
  - 버전 일정(`schedule_id`) 단위의 거시적 예산 귀속과 분리하여, 지출 등록 시 특정 캐릭터/가챠 픽업(`pickup_schedule_id`)을 선택적으로 바인딩할 수 있도록 데이터베이스 및 프론트엔드 파이프라인 구현.
  - 소비 화면(`/dashboard/expenses`)에 확정(`CONFIRMED`) 지출 기준의 픽업별 소비 분석 섹션을 도입: 가로 막대 차트(`BarChart layout="vertical"`), 픽업별 과금 랭킹 카드, 버전 내 픽업 비중(%), 게임 선택 필터를 제공하며, 픽업을 지정하지 않은 과금(패키지/월정액 등)은 `'버전 일반'`으로 분리 집계하여 100% 회계 정합성을 달성.
- **수행 내역**:
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: `expenses.pickup_schedule_id` 외래키 및 인덱스(`idx_expenses_pickup_schedule_id`), 게임 일치 트리거(`validate_expense_references`) 반영.
  - `src/types/database.types.ts`: `expenses` Row, Insert, Update, Relationships에 `pickup_schedule_id` 동기화.
  - `src/components/expense/expense-modal.tsx`: 게임 선택 및 결제일 기준 유효 픽업 일정 목록 메모이제이션, `[픽업 선택 (선택 사항)]` 드롭다운 제공, 지출 insert 시 바인딩 반영.
  - `src/components/expense/expense-detail-modal.tsx`: 픽업 타이틀(`pickupTitle`) 렌더링.
  - `src/app/dashboard/expenses/page.tsx`: 픽업 과금 통계 섹션(가로 막대 차트 + 랭킹 카드, 게임 선택 필터, 버전 일반 분리 집계), 목록 테이블 및 모바일 카드 내 `[픽업명]` 뱃지 표시.
  - 단위 테스트 추가: `expense-modal.test.tsx` (10/10 PASS), `expense-detail-modal.test.tsx` (5/5 PASS), `expenses/page.test.tsx` (6/6 PASS).
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 146개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 추천 구현 단계**:
  - Phase 11.5: 반응형 모바일 튜닝 및 종합 회귀 테스트 (모바일 뷰포트 패딩 및 모달 크기 반응형 세부 점검).

## Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동 완료 (2026-10-13)

- **결정 및 배경**:
  - `[결제 플랫폼: 구글 / 갤럭시 / 기타]` $\to$ `[결제 수단: 내 지갑 / 스토어 결제 / 네이버페이]`의 2단계 계층 선택 구조를 구축하여 플랫폼별 결제 수단과 포인트 사용을 명확하게 분리.
  - 네이버페이 선택 시 잔액 부족 시 10,000원 단위 올림 충전액 프리뷰 인라인 카드 노출 및 원클릭 `[충전 후 결제]` 버튼 제공. 총 자산 부족 시 사전 경고 및 결제 차단.
  - 네이버페이는 포인트 미적립 및 포인트 사용 불가 정책에 따라 사용 포인트 필드 비활성화 및 0원 리셋 처리.
  - 사용자가 정가/할인/포인트 외에 `최종 실결제액`을 수동으로 직접 오버라이드할 수 있도록 입력창을 추가하고, 수동 수정 시 차액을 할인 금액으로 자동 역산하여 `chk_expense_math` DB 제약조건과 100% 무결성을 보장.
- **수행 내역**:
  - `src/components/expense/expense-modal.tsx`: 2단계 종속 선택 드롭다운, 실시간 네이버페이 충전 프리뷰 카드, `[충전 후 결제]` 원클릭 버튼, 최종 실결제액 수동 오버라이드 필드 및 할인 역산 연동.
  - `src/components/expense/expense-modal.test.tsx`: 신규 4개 테스트 추가 (플랫폼 필터링, 부족액 충전 프리뷰 & RPC 파라미터, 실결제액 수동 오버라이드, 포인트 비활성화).
  - `src/components/expense/expense-detail-modal.tsx`, `expense-detail-modal.test.tsx`: 네이버페이 결제 라벨 및 네이버페이 전액 환불 안내 메시지 적용 및 단위 테스트 4/4 통과.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 143개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 추천 구현 단계**:
  - Phase 11.4: 픽업별 지출 바인딩 및 가챠 소비 통계/분석 구현 (`expenses.pickup_schedule_id` 컬럼 추가, 지출 모달 내 픽업 선택 드롭다운, 소비 화면 픽업별 과금 가로 막대 차트 및 픽업 비중 계산).

## Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현 완료 (2026-10-12)

- **결정 및 배경**:
  - 현금성 간편결제 수단인 네이버페이(`NAVER_PAY`)의 잔액 부족 시 자동 올림 충전($R = \lceil S / 10,000 \rceil \times 10,000$) 및 총 자산 연동 모델 확정.
  - 구글/갤럭시 스토어의 포인트와 달리 네이버페이 머니는 현금성 자산(원 단위)이므로 등급(`user_tier`)은 `NULL`, 적립률(`earn_rate`)은 `0.00`으로 고정하는 제약조건 적용.
  - RPC 트랜잭션 수준에서 충전액 $R$ 자산 차감, 네이버페이 충전(`RECHARGE`), 결제액 $P$ 네이버페이 잔액 차감(`USE`)을 원자적으로 처리하며, 기본 자산 차감 옵션과의 이중 차감 및 환불 시의 이중 환불을 원천 차단.
- **수행 내역**:
  - `src/lib/naver-pay-calculations.ts`: 네이버페이 올림 충전 및 결제 계산 순수 함수 `calculateNaverPayPayment` 구현.
  - `src/lib/naver-pay-calculations.test.ts`: 잔액 충분, 0원 일치, 1원 부족, 1만원/1만1원 부족, 올림 충전, 총 자산 부족 차단 등 9개 케이스 단위 테스트 (100% 통과).
  - `src/lib/payment-calculations.ts`: `PaymentMethod` / `PointPlatform`에 `"NAVER_PAY"` 추가 및 에러 매핑 확장.
  - `src/components/wallet/store-wallet-widget.tsx`: 3열 그리드로 네이버페이 잔액(원) 표시 및 수동 보정 드롭다운 지원.
  - `src/components/wallet/store-wallet-widget.test.tsx`: 네이버페이 렌더링 및 보정 RPC 단위 테스트 4/4 통과.
  - `src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`: 네이버페이 결제 라벨 동기화.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: `store_wallets`, `expenses`, `store_point_transactions`, `adjust_wallet_balance`, `process_expense_payment`, `refund_expense_payment` DDL 및 RPC 갱신.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 138개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 오류 0건 (Clean).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 구현 추천 단계**:
  - Phase 11.3: 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동 (`[결제 플랫폼] -> [결제 수단]`, 네이버페이 충전 프리뷰 인라인 카드, `[충전 후 결제]` 원클릭 버튼).
  - Phase 11.4: 픽업별 지출 바인딩 및 가챠 소비 통계 구현 (`pickup_schedule_id` 컬럼, 픽업 가로 막대 차트, 픽업 비중 계산).

## 정식 아이콘 1A 확정 및 적용 (2026-10-12)

- **선정**: `docs/icon-concepts-v2-preview.html`(3종) → `docs/icon-concepts-v3-c-variants-preview.html`(시안1 기반 1A/1B/1C) 중 **1A(C-Chrono + 메모 도트)** 확정.
- **생성**: `scripts/generate_icons.py`를 1A 스펙으로 교체(바탕 `#0F1115`, C `#F5B942`, 바늘 `#7C8CFF`, 도트 `#4CD6A5`, SVG round-cap 재현용 끝점 디스크).
  `public/icons/icon-{512,192,180,maskable-512}.png` 4종 재생성 및 192px 실물 확인.
- **미세 보정**: 소형 렌더에서 메모 도트가 링에 닿아 보여 `(414,256)→(420,256)` 이동, v3 미리보기 1A 5곳 동기화.
  이후 PNG 실측 대조에서 미리보기의 안쪽 테두리(`#2A2F3A` 프레임) 누락을 발견해 생성기에 `rounded_rectangle` 프레임을 추가하고 4종 재생성.
  사용자 대조에서 v3 시안 작성 시 링을 64px로 굵게 그린 것이 결정 1A(얇은 링)와 다르다는 지적을 받아
  기존 임시 아이콘 실측치(링 R158/굵기 32, 바늘 23, 틈 43도)로 되돌리고 1A 토큰 색·메모 도트(r16)·프레임만 유지해 4종 재생성, v3 미리보기 1A 5곳 동기화.
- **링 끝 캡 버그 수정**: PIL `arc`+원반 방식이 곡선 안쪽으로 불거져 링 끝에 노란 도트가 달린 것처럼 렌더됨을 확대 검증으로 확인.
  링을 마스크 합성(밴드−틈 쐐기+바깥 반원 캡)으로 다시 짜 SVG `linecap=round`와 일치시킴. `arc`/`pieslice` 각도 기준 불일치도 실측으로 확인.
- **병행 세션 주의**: 동일 트리에서 다른 세션이 작업 중. `generate_icons.py`에 favicon.ico 생성·maskable(k=0.75, 프레임 없음) 추가,
  `layout.tsx`에 favicon 연결, 그 외 expenses/calendar 등 다수 수정. 아이콘 최종안(thick/thin) 결정 후 해당안으로 4종+favicon 재생성 필요.
- **최종 결정 A (thick)**: 승인 1A 원문 수치로 확정. 캡 수정된 생성기로 4종+favicon 재생성, 픽셀 실측(바탕·링·바늘 색 정확, 도트 (419,255)) 및
  캡 확대 검증 완료. v3 미리보기 1A 5곳 원문 수치로 원복.
- **연결**: `src/app/layout.tsx:10-11`(manifest + icon-192/apple-180), `public/manifest.json:13-16` 기존 참조 유지, 코드 변경 없음.
- **다음**: PWA 설치·마스크블 크롭 실기기 확인은 Android 검증 보류 결정에 따라 후순위.

## 회원가입 페이지 분리 및 닉네임 입력 지원 (2026-10-12)

- **결정 및 배경**:
  - 기존 단일 `/auth` 페이지에서 로그인과 회원가입이 동일 폼으로 처리되던 구조를 개선. 기존 로그인 화면 레이아웃과 디자인은 유지한 채 '회원가입' 버튼 클릭 시 전용 페이지(`/auth/signup`)로 이동하도록 라우팅 분리.
  - 가입 시 이메일, 비밀번호 외에 닉네임(최대 20자)을 필수 입력하도록 하여 유저 메타데이터 및 프로필에 닉네임을 사전 설정할 수 있도록 처리.
- **수행 내역**:
  - `src/app/auth/signup/page.tsx`: 신규 회원가입 전용 페이지 생성. 이메일, 비밀번호, 닉네임 필드 구성 및 `supabase.auth.signUp` 메타데이터 바인딩.
  - `src/app/auth/page.tsx`: 인라인 가입 함수 제거, 회원가입 버튼 클릭 시 `router.push("/auth/signup")` 네비게이션 연동.
  - `src/app/dashboard/auth/page.tsx`: 안전 리다이렉트 페이지 배치 (`/dashboard/auth` $\to$ `/auth`).
  - `src/app/auth/page.test.tsx`: 회원가입 이동 테스트로 갱신.
  - `src/app/auth/signup/page.test.tsx`: 회원가입 폼 및 케이스별 5건 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 33개 파일 / 128개 테스트 전체 통과 (100% PASS).
  - `npx next build`: 정적 15개 페이지 export 빌드 성공.
- **다음 개발 권장 사항**:
  - Phase 11.2 네이버페이 지갑 모델 및 충전 엔진 구현
  - Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  - Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 구현

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 파이프라인 등록 (2026-10-12)

- **결정 및 배경**:
  - 지출 항목이 `VERSION` 일정에만 바인딩되어 특정 픽업/가챠별 지출 추적이 불가능했던 한계를 극복하기 위해 사용자 요구사항을 반영.
  - `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id)` 컬럼을 신설하여 버전(거시적 일정)과 픽업(미시적 가챠 대상)을 동시에 바인딩하는 구조 확정.
  - 소비 화면(`/dashboard/expenses`)에 픽업별 누적 과금 막대 차트 및 버전 내 픽업 과금 비중(%)을 제공하는 Phase 11.4 파이프라인을 정식 등록함.
- **수행 내역**:
  - `docs/to-do.md`, `docs/progress.md`, `docs/handoff.md`, `docs/changelog.md`에 Phase 11.4 파이프라인 및 세부 구현 명세 등록.
  - `src/app/dashboard/games/page.test.tsx` 내 `createQuery`의 MockQuery 타이핑을 구체화하여 `tsc --noEmit` 에러(0건) 및 Next.js ESLint 빌드 에러 완전 해결.
- **검증 증거**:
  - `npx tsc --noEmit`: 오류 0건 (Clean).
  - `npx vitest run`: 32개 테스트 파일 / 123개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 13개 페이지 export 빌드 성공.
- **다음 구현 순서**:
  1. Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현
  2. Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  3. Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 구현 (DB 컬럼 신설, 모달 드롭다운, 소비 차트)
  4. Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트

## Phase 11.2 사이드바 동일 게임·기간 일정 그룹핑 (2026-10-12)

- **결정/이유**: 동시 픽업을 `'/'`로 한 일정에 합치면 특정 캐릭터 지출 연결·종료일 차이 표현이 불가. → DB는 캐릭터별 개별 등록, 사이드바 카드 비대화는 UI 그룹핑으로 해결.
- **구현**: `hero-sidebar.tsx`에서 정렬 후 `gameId|schedule_type|start_date|end_date` 키로 그룹핑(첫 등장 순서 유지). 2개 이상이면 `• 제목` 목록 + 제목별 메모, 1개면 기존 3단 카드 그대로. 캘린더 타일은 원래 게임/유형별 1개만 표시하므로 변경 없음.
- **검증**: `npx vitest run src/components/calendar src/app/dashboard/page.test.tsx` 10/10 통과. `games/page.test.tsx` 타입 수정으로 `tsc --noEmit` 0 에러 달성.
- **관리자 일정 복사**: `admin/page.tsx`에 `[복사] [수정] [삭제]` 버튼 배치. 복사는 `openDuplicateModal`이 원본 값을 채우고 `editingScheduleId=null`로 두어 기존 insert 경로를 재사용(`isDuplicating`은 모달 제목 표시용). `vitest run src/app/admin` 10/10 통과.
- **남은 작업**: 기존 `'/'` 형식 공용 일정 데이터는 관리자 화면에서 `[복사]`를 이용해 개별 일정으로 분리 필요(수동).

## Phase 11.1 게임 일정 다변화, 일정 모달 전환 및 대시보드/사이드바 3단 UI·정렬 일원화 완료 (2026-10-12)

- **작업 개요**:
  - **캘린더 타일 배지 우선순위 및 배치 개선 (`desktop-calendar.tsx`)**:
    - 배지 겹침 시 `[VERSION]` $\to$ `[PICKUP]` $\to$ `[CONTENTS]` 고정 우선순위 순차 렌더링.
    - 배지가 3개 모두 겹쳐도 날짜 숫자를 가리지 않도록 상단(날짜+아이콘)과 하단(배지)을 분리하는 `flex-col justify-between` 구조 및 배지 패딩/폰트 최적화.
    - 타일 내 중복 아이콘 제거 및 시작일(`start_date`) 기준 단일 표기, 동일 날짜 다중 게임 일정 시작 시 타일 우측 아이콘 **게임명 가나다순(`localeCompare`)** 정렬.
    - 월 내비게이션 버튼을 `public/assets/nav/` 신규 SVG 에셋으로 교체 및 라이트/다크 테마 전환 시 화살표 즉각 동기화(전용 CSS 클래스 및 Tailwind selector darkMode 적용).
  - **선택일 일정(`HeroSidebar`) 3단 카드 UI 개편**:
    - 긴 게임명과 일정 제목의 가독성을 위해 `[배지] 게임명` / 기간 / `일정 제목` (굵게) / 메모 3단 수직 구조 적용.
  - **전체 화면 일정 정렬 로직 일원화**:
    - 1순위 `start_date ASC`, 2순위 `end_date ASC`로 홈 대시보드 사이드바, 게임 관리 일정 모달, 관리자 공식 일정 목록 일원화.
  - **게임 관리(`/dashboard/games`) 일정 모달 및 만료 일정 필터링**:
    - 화면 중앙 `<Dialog>` 팝업 전환 및 `gte("end_date", today)` 필터링을 통해 지난 일정을 제외하고 유효한 일정만 출력.
  - **지출 및 구독 모달 UI 정돈**:
    - `ExpenseModal`: `[연결된 버전 일정]` disabled 표기 (기간 문구 제외).
    - `SubscriptionModal`: 결제수단 필드를 `내 지갑`(`WALLET`, disabled)으로 고정.
- **검증 증거**:
  - `npx vitest run`: 32개 테스트 파일 / 119개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 export 13개 페이지 빌드 성공.

## Phase 10.7 긴급 UI/UX 개선 및 인터랙션 안정화 완료 (2026-10-12)

- **작업 개요**:
  - Alt+Tab / 화면 가려짐 시 탭 리셋 및 팝업 닫힘 버그 해결 (`DashboardLayout`의 `hasMountedChildren` ref 가드 및 `auth-context` 불필요 로딩 상태 차단).
  - 대시보드 로드 에러 방어 및 `cycle_type` 부재 시 자동 하위 호환 폴백 처리.
  - 소비 탭 헤더 액션 버튼 분기 (`+ 지출 추가` vs `+ 구독 추가`).
  - 정기 구독 탭 문구 수정 (`정기 구독`, `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.`).
  - 30일 충전형(`INTERVAL_30`) 구독에 대한 `[남은 날짜 수정]` 버튼 및 D-day 동기화 기능 추가.
  - 지출/상세 모달에서 "포인트 할인 (원)" 삭제 및 `할인 (원) / 쿠폰 (%) / 사용 포인트 (P)` 일원화 (1P = 1원 자동 계산).
  - 지출 모달에서 `정기 구독` 카테고리 제거, 구독 모달에서 카테고리 `정기 구독` 고정.
  - `/dashboard/games`에서 `+ + 구독 추가` 중복 해소 (`구독 추가`로 변경).
  - `/admin` 일정 타이틀 placeholder `예: ~` 문구 제거.
  - Supabase SQL Editor용 Phase 10 DB 마이그레이션 스크립트 작성 (`md/MIGRATION_PHASE10.sql`): `update_store_wallet_settings` 포함.
  - 캘린더 타일 아이콘 표시 방식 개선: `start_date`와 `end_date`를 가지는 복수일 기간 일정 및 기간형 지출의 경우, 전체 기간 타일 아이콘 도배를 방지하고 오직 `start_date` 타일에만 아이콘을 단일 표기하도록 분리 (`daySchedules` 상세 조회는 유지).
  - Galaxy Store 등급 설정 저장 호환성 강화: 구버전 원격 RPC 호환용 `p_tier: null` 자동 폴백 추가.
  - 미구독 게임 캘린더 일정 노출 방지: `user_games` 기반 일정 필터링으로 미구독 게임 공용 일정 분리.
  - 관리자 탭 내비게이션 및 일정 관리(CRUD) 전면 개편: `/admin` $\leftrightarrow$ `/admin/requests` 서브 탭 내비게이션, 등록된 일정 목록 조회/필터, 수정 모달, 삭제 확인 다이얼로그 구현.
  - 요청 관리(`/admin/requests`) 관리자 권한 검사 일원화: `AuthContext`의 `role === 'admin'`과 `user.app_metadata.role === 'admin'`을 포괄하는 `isAdmin` 판정으로 통합하여 DB 프로필 관리자 계정의 정상 접근 보장 및 테마 디자인 토큰 일원화.
  - 소비/게임/관리자 헤더 높이 통일, 중복 버튼 단일화 및 관리자 화면 요청 기능 은닉: 좌상단 타이틀(소비, 게임, 관리자 센터) 높이와 `border-b border-line pb-4` 규격 통일, 우측 버튼(`[+ 지출 추가]`, `[+ 구독 추가]`, `[+ 추가 요청]`) 및 링크 높이를 `h-10`(40px)으로 일치. 소비 정기 구독 탭 본문과 게임 하단 카드의 중복 버튼 제거(헤더에 단일 배치). 관리자 로그인 시 `/dashboard/games` 및 `/dashboard/settings`의 게임 요청 기능 은닉.
- **검증 증거**:
  - `npx.cmd tsc --noEmit`: 0 오류.
  - Vitest: 31개 테스트 파일 / 115개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 export (`npm run build`): 13개 페이지 정상 빌드 완료.

## Phase 2 (2.1~2.5) DB 스키마, RPC, RLS 및 TypeScript 타입 생성 100% 완료 (2026-10-12)

- **작업 내용**:
  - `md/TESTS.sql` 내 누락되어 있던 `test_game_id`의 세션 구성 변수 등록 코드(`SELECT set_config('chronoledger.test_game_id', :'test_game_id', true);`)를 보완.
  - Supabase 테스트 프로젝트를 대상으로 `psql` 17.11 (`aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`)을 통해 `md/TESTS.sql` 실행 완료.
  - `npx.cmd supabase gen types typescript --db-url ...`를 실행하여 원격 DB 최신 스키마 기반 `src/types/database.types.ts` 자동 생성 완료.
- **검증 증거**:
  - `REQ-02`: 일반 사용자 JWT에서 타 사용자 행 차단, 지갑/원장 직접 수정 차단, 지출/구독 템플릿 물리 삭제 차단, 요청 상태 임의 승인 차단 검증 통과 (`PASS: RLS isolates users and blocks cross-user RPC/direct wallet/expense/template/request writes`).
  - `SCH-01`, `SCH-02`: 일정 날짜 변경 시 `PLANNED` 지출만 자동 동기화되고 `CONFIRMED`/`CANCELLED` 지출 및 날짜 외 컬럼 보존 검증 통과.
  - 최종 `PASS: all smoke-test fixtures and mutations rolled back` 및 트랜잭션 정상 `ROLLBACK` 확인.
  - `src/types/database.types.ts`: `Database['public']['Tables']['personal_memos']['Row']` 등 12개 테이블 타입 생성 확인.
  - `npx.cmd tsc --noEmit` 무결점 통과 (에러 0건).
  - Vitest 30개 테스트 파일 / 106개 테스트 전체 100% 통과.
- **현재 상태 및 남은 작업**:
  - **Phase 2 (2.1 ~ 2.5) 전체 완료.**
  - **Phase 7 (7.1 ~ 7.3) 완료**, 남은 작업: `7.4 Web/PWA MVP 회귀 및 배포 빌드 검증`.

## Phase 10 재정리 기획(v2) UI/UX 및 구독·게임·설정 개편 완료 (2026-10-12)

- **대시보드 캘린더 및 지출 바인딩 (10.1)**:
  - 버튼명을 `[+ 지출 추가]`로 통일.
  - 카테고리 우선 선택: '게임' 카테고리일 때만 게임 선택 입력란이 표시됨.
  - 게임 선택 시 해당 결제일에 속한 `VERSION` 일정에만 자동 단일 바인딩 (`PICKUP` 일정 바인딩 제외 및 기간 내 버전 자동 매칭).
- **소비(`/dashboard/expenses`) 화면 개편 (10.2)**:
  - 통계 영역: 카테고리 비중을 Recharts 원그래프(Pie Chart)로 전면 교체.
  - 집계 기준 엄격화: 취소(`CANCELLED`) 및 예정(`PLANNED`)을 제외한 오직 확정(`CONFIRMED`) 지출만 통계에 산정.
  - 목록 액션 버튼 통일: `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 직관화 및 전용 RPC 연동.
- **정기 구독 3종 주기 모델 A안 (10.3)**:
  - 소비 화면 내 `[지출 내역 및 통계 | 정기 구독]` 서브 탭 분리.
  - 3종 주기 모델(`cycle_type`):
    - `MONTHLY_DAY`: 매월 지정일 결제 (월말 일자 자동 보정).
    - `INTERVAL_30`: 30일 누적 충전식 결제.
    - `VERSION_PASS`: 게임 새 버전 시작일 연동 결제.
  - 템플릿 생성 시 `ensureMonthlySubscriptionExpenses` 엔진을 통한 당월 회차 멱등 지연 생성.
- **게임 관리(`/dashboard/games`) 및 추가 요청 개편 (10.4)**:
  - 버튼명 `[+ 추가 요청]` 통일.
  - 요청 모달: 게임 요청(게임 제목만 간결 입력, `memo: null`), 일정 요청(게임 + 기간 + 유형 + 내용 템플릿).
  - 내 구독 게임 카드: 256×256 WebP 아이콘 업로드/삭제, 공식 일정 보기 시트, 지출 보존 구독 해제.
- **설정(`/dashboard/settings`) 개편 (10.5)**:
  - Galaxy Store 4대 공식 등급 반영: 일반(0.1%), 스타(0.1%), 프레스티지(1.1%), 로열블루(2.1%) 드롭다운 선택.
  - 개인 재무 설정 카드: 총 자산(`total_asset`), 기본 월 예산(`default_budget`) 조회/수정 연동.
  - 내 요청 내역 카드: 제출한 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 메모(`admin_memo`) 조회.
- **종합 검증 (10.6)**:
  - `npx tsc --noEmit` 무결점 (0 errors).
  - Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 export (`npm run build`) 13개 페이지 빌드 성공.

## Phase 9 Iteration 01 (2026-10-09)

- 상단바는 `src/components/layout/topbar.tsx`. 탭 이름은 홈/소비/게임이다. 내비 링크 `/dashboard/expenses`, `/dashboard/calendar` 페이지는 아직 없어 이동 시 404이며 후속 구현이 필요하다. 설정 링크는 프로필 드롭다운의 "계정" 항목(`/dashboard/settings`)으로 이동했다.
- 프로필 버튼은 사용자 이름(`full_name` > `name` > 이메일 앞부분)과 사진(직접 업로드 > Google `avatar_url`/`picture`)을 표시하고, 사진이 없거나 로드 실패 시 이름 첫 글자 원형 아바타를 쓴다. 직접 업로드는 계정 설정(`/dashboard/settings`)의 `ProfileAvatarCard`에서 하며 비공개 `user-icons/{uid}/profile.webp`(256x256 WebP)에 저장된다. 계정 삭제 워커가 `{uid}` 폴더를 통째로 지우므로 별도 정리가 필요 없다. 표시 이름 편집은 미구현(결정 필요).
- `docs/design-topbar-spec.md`(탭명 홈/기록/게임, 별도 ⚙️ 설정, 드롭다운에 로그아웃만)와 이번 요청(홈/소비/게임, 드롭다운에 계정+로그아웃)이 달라 요청을 따랐다.
- 테마: 저장값(`cl-theme`)이 없으면 `prefers-color-scheme`를 따른다(인증 화면은 dark 고정 유지). 스토어 포인트 잔액 표기는 Google/Galaxy이며 설정 폼 라벨의 "Google Play/Galaxy Store"는 유지했다.
- "등록" 버튼은 `HeroSidebarContent`의 날짜 카드 헤더 우측(`onRegisterExpense`)에 있으며 모바일 드로어도 같은 컴포넌트를 쓴다.

## Phase 8 Iteration 01 (2026-10-10)

- 색은 `globals.css`의 `--*` RGB 채널 토큰과 `tailwind.config.ts` 매핑으로 관리한다. 레거시 `gray-*`/`blue-*`/`red-300·400`/`green-300·400`/`yellow-300·400`/`text-white`는 토큰으로 재매핑되어 있으므로, 채워진 primary/danger/warning 배경 위 글자는 `text-primary-foreground`를 명시해야 한다. 재매핑되지 않은 기본 팔레트(purple, red-700/900 등)는 새로 쓰지 말 것.
- 테마는 `<html data-theme>`로 전환(기본 dark, localStorage `cl-theme`), 인증 화면은 dark 고정.
- 중단점이 md=900px, lg=1280px로 바뀌었다(히어로 사이드바 lg 이상, 그 미만은 바텀시트).
- 미검증/후속: 실브라우저 390/900/1280 시각 확인, 실제 대비 측정, 라이트 테마 전 화면 점검, 상단/하단 내비게이션 셸([PROPOSED])과 라이트 상태 배경 정확값 토큰, 정식 아이콘, `manifest.json` 색상은 기존 값 유지.
- 기존 이슈: `src/__tests__/functions/*` 2개 테스트가 존재하지 않는 모듈을 import해 tsc/Vitest 스위트가 실패한다(Phase 8 변경과 무관, 베이스 상태).

## Phase 7 Iteration 03 (2026-10-09)

- Iteration 02 변경은 미커밋 상태였고 리뷰어는 이전 HEAD를 본 것으로 보인다(작업 트리에는 자동 열림 모달·`manifest.id`가 이미 있었음). 커밋 후 같은 Target SHA로 재리뷰가 필요하다.
- `public/sw.js` v2: 읽기 API(Supabase `/rest/v1/` GET)를 JWT `sub`별 캐시 키로 저장하고 오프라인에서만 제공한다. 익명·만료 토큰, 비-GET, 타 출처는 가로채지 않는다. 등록 시 `supabaseOrigin`을 쿼리로 전달하며 로그아웃 시 전체 삭제한다.
- 아이콘: 시계 "C" 기본 마크로 재생성(192/512/180, maskable 512 분리). 최종 브랜드 아트는 후속.
- 개인 데이터 캐시가 기기에 남는 위험(공용 기기)은 로그아웃 삭제로 완화했으나 강제 종료·만료 케이스는 실기 확인 필요.

## Phase 7 Iteration 02 (2026-10-09)

- F1: 만료 PLANNED가 있으면 `OverduePlannedModal`이 대시보드 로드 후 자동으로 열리고 닫을 수 없다(`DialogContent`의 `hideClose`, Esc/바깥 클릭 차단). 결제 모달이 열린 동안만 숨고, 결제 없이 닫으면 다시 열린다.
- F2: 그리드 범위 `end_date` PLANNED를 별도 조회해 병합하고 만료 조회는 `end_date`(없으면 `target_date`) 기준. 일정 연결 PLANNED는 `target_date=end_date`로 저장.
- F3: `public/sw.js`(앱 셸 정적 자산·내비게이션 폴백, 교차 출처/비-GET 미개입), `ServiceWorkerRegister`(프로덕션에서만 등록, 로그아웃 시 캐시 삭제). 개인 데이터 오프라인 조회 캐시는 미구현으로 7.3을 부분 완료로 표기.
- F4: `src/lib/offline-guard.ts`의 `isOffline()`을 지갑 위젯·결제·환불·만료 취소·게임 추가·요청 제출·관리자 처리 핸들러와 구독 Lazy Generation 쓰기 앞에 적용. 배너 문구 정정. 계정 삭제와 로그아웃은 보안 흐름이라 가드하지 않았다.
- F5: manifest `id: "/dashboard"`, `icon-180.png`(임시) + apple-touch 연결. 정식 아이콘 교체는 릴리스 차단 항목(to-do 7.3).
- 미검증: 실제 브라우저의 SW 등록/오프라인 동작, Android 설치, 실DB RPC/RLS/트리거(TESTS.sql 미실행), 게임명 placeholder.

## Phase 7 PWA 통합, 예산 귀속, 오프라인 방어 (2026-10-08)

- 신규: `src/lib/budget-calculations.ts`, `src/lib/use-online-status.ts`, `src/components/expense/overdue-planned-modal.tsx`, `src/components/ui/offline-banner.tsx`, `public/manifest.json`, `public/icons/*`(임시 생성 아이콘). 수정: `layout.tsx`(manifest/viewport/배너), 대시보드(만료 PLANNED 조회·모달·결제 연결), 결제/환불/지갑 위젯의 오프라인 버튼 잠금, `md/TESTS.sql`(SCH-02).
- 후속/미검증: TESTS.sql 실행, Android PWA 설치·오프라인·세션 만료 확인, 정식 아이콘, Service Worker 도입 여부(미결정, 도입 시 인증 세션별 캐시 정책 필요), 게임명 placeholder.

## Phase 6 가계부, 결제/환불, 포인트 지갑 (2026-10-08)

- 신규: `src/lib/payment-calculations.ts`, `src/components/wallet/store-wallet-widget.tsx`, `src/components/expense/expense-modal.tsx`, `expense-detail-modal.tsx`와 각 테스트. 설정 페이지·대시보드·히어로 사이드바/모바일 드로어(`onSelectExpense`) 연동, `database.types.ts`의 `p_point_platform`/`p_tier`를 nullable로 조정.
- 결제 흐름: RPC가 기존 PLANNED 지출만 받으므로 모달이 PLANNED 행을 먼저 insert 후 RPC를 호출한다. RPC 실패 시 생성된 행을 재사용해 재시도한다.
- 후속: 실DB RPC/RLS/원장 검증, 실제 게임명 연동, PLANNED 지출의 결제·취소 UI 연결.

## Phase 5 미니멀 캘린더 코어, 메모, Lazy Generation (2026-10-08)

- Phase 5 Iteration 02 리뷰 반영: 조회 범위를 42일 그리드 전체로 확장, 예상 지출에 CONFIRMED 포함(표시 월·CANCELLED 제외), date-only 문자열 로컬 파싱, 초기 날짜를 마운트 후 설정해 hydration 불일치 방지, EOF 공백 정리. tsc/Vitest(15 files/45 tests)/lint/build 통과, 실DB 검증은 미수행.
- 신규 구현:
  - `src/lib/calendar-utils.ts`, `src/lib/subscription-sync.ts`
  - `src/components/calendar/desktop-calendar.tsx`, `schedule-banner.tsx`, `hero-sidebar.tsx`, `mobile-drawer.tsx`
  - `src/app/dashboard/page.tsx` 캘린더 중심 대시보드로 전환
- 핵심 동작:
  - 6주(42칸) 캘린더 그리드와 말일 보정 청구일 계산
  - 월 캘린더 로드 시 활성 구독 템플릿의 Lazy Generation 실행(중복은 DB 유니크+ignoreDuplicates로 방지)
  - 타일에서 금액은 배제하고 배너/아이콘/메모 도트만 표시
  - 데스크톱 우측 히어로 사이드바 + 모바일 바텀 시트에서 선택일 지출/메모 상세 제공
- 테스트:
  - 추가: `calendar-utils.test.ts`, `subscription-sync.test.ts`, `desktop-calendar.test.tsx`
  - 갱신: `dashboard/page.test.tsx`
  - 전체: Vitest 15 files/43 tests 통과
- 미검증/후속:
  - 실제 Supabase에서 Lazy Generation 동시성 검증(다중 탭/다중 세션)
  - 템플릿 비활성화 후 재활성화 시 과거 회차 비자동복구 정책의 end-to-end 검증

## Phase 3 Web/PWA 인증 및 계정 삭제 구현 (2026-10-08)

- 이메일 인증/가입, Google OAuth/PKCE, 세션 변경 및 dashboard gate에 대한 구현과 단위 테스트를 추가했다. 실제 Supabase OAuth 왕복은 이번 작업에서 실행하지 않았다.
- 계정 삭제는 Netlify Functions의 인증된 요청/status endpoint와 예약 worker, Supabase `account_deletion_requests` queue로 처리한다. Worker 순서는 `user-icons` Storage → 개인 테이블 → Resend 등록 이메일 알림 → Auth 사용자 삭제다. 사용자 확인 이메일은 현재 로그인 이메일과 일치해야 한다.
- 사용자 삭제 요청 중 개인 테이블과 Storage 접근은 restrictive RLS 및 trigger로 차단한다. 공용 `games`/`game_schedules` 데이터는 worker가 삭제하지 않는다.
- Resend stable idempotency key의 안전 기간은 유한하다. 시도 후 23시간이 지나도 결과가 불명확하면 job을 `MANUAL_REVIEW`에 보존하고 자동 재발송/ Auth 삭제를 중지한다. 운영자 확인 절차가 배포 운영 전에 마련되어야 한다.
- 검증 완료: `npx tsc --noEmit`, 전체 Vitest 12개 파일/40개 테스트, `npm run lint`, dummy 공개 Supabase 값으로 `npm run build` 및 `out/` 생성, `git diff --check` 통과. DB migration, 실환경 RLS/Storage, OAuth 실로그인, 예약 함수, Resend 발신 도메인/환경 변수는 미실행/미설정이며 배포 환경에서 확인해야 한다.
- dependency 설치 때 npm audit이 13개 취약점(2 moderate, 9 high, 2 critical)을 보고했다. 이 작업에서 자동 수정하지 않았고 원인/영향 범위는 후속 보안 검토가 필요하다.

## Phase 2.4 DB/RPC/RLS 테스트 시나리오 준비 (2026-10-08)

- `md/TESTS.sql`은 승인된 `md/SCHEMA.sql` 기준의 재현 가능한 rollback-only 시나리오를 담는다. 실행 전용 Supabase 테스트 프로젝트, privileged DB fixture 역할, authenticated 사용자 A의 synthetic JWT, 사용자 B 격리 fixture, 관리자 claim 모의의 한계를 파일 상단에 기록했다.
- 테스트는 신규 가입 기본값, 재무/지갑 설정, 결제·환불과 포인트, 예정 지출/구독 취소·복구, 일정 변경 동기화, 게임·일정 요청 처리, 관리자 승인/반려 원자성, RLS 격리 및 anon RPC 권한을 다룬다. 사용자 RPC 호출은 `SET LOCAL ROLE authenticated`로 감싼다.
- SQL/DB는 실행하지 않았다. 정적 검토 및 `git diff --check`만 완료했으며, 이 파일의 확장된 현재 버전은 런타임 검증 전이다. 안전한 전용 프로젝트에서 `psql -X -v ON_ERROR_STOP=1 -f md/TESTS.sql`로 실행하고 각 PASS 및 마지막 rollback 메시지를 확인해야 한다. 오류 중단 시 연결을 닫아 트랜잭션을 rollback한 뒤 상태를 확인한다.

## Phase 1 구현 인수인계 (2026-10-08)

- `collab/phase1-completion`에 Progress/Drawer 컴포넌트, Radix Progress/Vaul 의존성, Supabase 브라우저 client 환경변수 검증 및 테스트를 추가했다. Dialog/Select는 기존 구현을 확인해 재사용했다.
- `npm run test -- --run` 7개 파일/24개 테스트, `npm run lint`, 더미 공개 Supabase 값으로 정적 `npm run build`와 `out/` 생성을 검증했다. 실제 Supabase 연결은 미실행이다.
- Maker 변경은 worktree 커밋으로 기록한다. manifest 및 reviewer/test run artifact는 수정하지 않았으며, 동일 Target SHA의 review와 artifact 검증은 Orchestrator가 이어서 수행한다.

## 파이프라인 v2 검토 (2026-10-08)

- 보완 파이프라인과 이식 검토 문서를 `docs/`에 추가했다. 채택은 미결정이며 사용자 결정 4항목은 이식 검토 §5와 `docs/to-do.md`에 있다. 권장은 문서 채택(A단계)부터 단계적 확장이다.
- Antigravity용 `.agents/rules/language.md` 및 `.agents/skills/`의 ChronoLedger Maker/Reviewer/Orchestrator 정의를 추가했다. 기존 `.github/agents/*.agent.md`는 `.bak` 파일로 보존하고 working tree에서는 제거했다. 확장 프로그램의 실제 발견·호출은 아직 확인하지 않았다.
- 로컬 `main`은 `origin/main`보다 앞서 있다(병합 `50d7eef` 포함). push는 사용자 지시를 기다린다.

## 최신 작업 상태 (2026-10-08)

- `collab/phase4-request-submission`의 기반 구현(`674f741`)과 Phase 4.4 Target(`5f7cf557844f64d77e90eb67c09974bf6aab81a0`)을 현재 `main` 작업 트리에 통합했다. 관리자 요청 페이지, 게임/일정 요청 UI, 게임 선택 및 아이콘 업로드 흐름을 포함한다.
- 통합 시 최신 main의 로그인 UI, KST 월간 대시보드 동작, Gemini 수동 리뷰 자료를 유지했다. 문서 충돌은 main의 최신 문서를 보존하고 통합 상태를 별도 기록했다. `/auth`의 기존 `Input` 오타 2곳을 바로잡았다.
- 대시보드 자산 행이 없을 때는 0원으로 처리하지 않고 별도 오류로 표시한다. KST 월간 예정 지출 범위는 유지한다.
- 표준 `npm ci`, Vitest 6개 파일/21개 테스트, `npm run lint`, 더미 Supabase 설정의 `npm run build`가 통과했다. 실제 Supabase RLS/RPC 및 sandbox 격리는 미검증이다.
- 중첩 `.worktrees/`의 테스트 중복 검색을 막도록 Vitest 제외 규칙을 추가했다. `@types/node`/Vitest peer 불일치를 해결하고 lockfile을 갱신해 `npm ci`를 통과시켰다.
- 사용자는 Gemini와의 이번 리뷰는 API 키 연결이 아니라 승인 기준/프롬프트를 직접 입력하는 수동 방식으로 진행했다. [Gemini 수동 리뷰 패킷](archive/Gemini_phase4_manual_review.md)과 exact diff `artifacts/gemini-phase4-connection/phase4-request-submission.diff`로 Gemini 수동 정적 리뷰를 받았다.
- API 전송 검증용 `gemini-phase4-connection` run은 dry-run만 수행했다. API 키가 없어 호출·네트워크 전송은 없었으며, 사용자 선택에 따라 `abandoned` 처리했다. 종료 기록은 `artifacts/gemini-phase4-connection/iteration-01/human-report.md`에 있다.
- 참조 Base/Target은 `674f741ee52d45bb96db3431521101a5aa01341f` → `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. Gemini는 `clean`/발견 없음으로 판정했다. 결과는 `artifacts/phase4-request-submission/iteration-01/gemini-manual-review.md` 및 `gemini-review.json`에 기록했으며 기존 ChronoLedger `review.json`은 변경하지 않았다.
- Gemini는 실제 Supabase RLS 격리와 승인/반려 RPC 원자성을 미검증 항목으로 남겼다. 당시 `npm ci` 재현성 문제는 이 통합에서 의존성 범위와 lockfile을 갱신해 표준 clean install로 검증했다.
- 협업 도구/문서는 main의 `f163157`, 대시보드·게임 UI 기반은 `collab/phase1-setup`의 `674f741`, 요청 제출 UI는 `5f7cf55`에 각각 기록되어 있으며 모두 현재 main 작업 트리에 통합됐다.
- 기존 `phase1-setup` run은 Target `dda0cae...`와 후속 Phase 4 변경의 범위가 달라 `abandoned` 처리했다. 동일 SHA review/test를 주장하지 않으며 보고서는 `artifacts/phase1-setup/iteration-01/human-report.md`에 있다.
- Phase 4.4 run `phase4-request-submission`은 Base `674f741...`, Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. 요청 제출 UI(게임 제안, 일정 추가/수정), 입력 검증, 소유자 요청 목록과 회귀 테스트를 추가했다.
- 같은 Target SHA의 Reviewer는 `clean`/0 findings다. Vitest 21개, ESLint, dummy Supabase 환경변수의 정적 build 및 세 run artifact Schema가 통과했다. sandbox unavailable; 실제 Supabase/RLS/RPC 및 사용자 인증 DB 동작은 미검증이다.
- `npm ci`는 기존 manifest/lock 충돌로 실패했으며, 검증은 `npm install --no-package-lock --legacy-peer-deps`로 설치한 로컬 의존성을 사용했다. lockfile은 이 run에서 변경하지 않았다.
- 최소 개입 협업을 위해 [ChronoLedger Orchestrator](../.agents/skills/chronoledger-orchestrator/SKILL.md), [초보자 가이드](collaboration-guide.md), 협업 artifact Schema 검증기를 추가했다. Local harness 기반이며 실제 에이전트 인식/통합 실행은 아직 검증 전이다.
- Gemini Reviewer는 선택형 외부 리뷰로 둔다. 전체 diff에 대한 사용자 승인 없이 외부 API를 호출하지 않는다.
- Gemini Reviewer 제한 PoC를 [구현 문서](archive/ChronoLedger_pipeline_auto.md)에 따라 추가했다. 단일 run/SHA 검증, 전체 diff의 사용자 승인, JSON Schema 검증과 no-overwrite 결과 저장이 적용됐고 오프라인 테스트 12개가 통과했다. 실제 Gemini API 실행·외부 전송·품질/비용 평가는 하지 않았으므로 도입 결정은 보류 상태다.
- 제안서의 독립 검토 의견은 [전달용 문서](archive/ChronoLedger_pipeline_auto_review.md)에 정리했다.
- 체크리스트 기준: 현재 작업 우선순위와 상태는 [공용 `to-do.md`](to-do.md)가 단일 기준이다. Gemini 진행 기록(구 to-do_Gemini 이력, 정리됨)은 보존용 별도 이력이며, 상충하는 상태나 검증 주장은 증거 대조 전까지 기준으로 사용하지 않는다.
- Phase 4 초기 구현은 `.worktrees/phase1-setup`에서 검증한 뒤 요청 제출 UI와 함께 현재 `main` 작업 트리에 통합했다.
- 관리자 요청 페이지와 게임 선택 모달의 DB 필드/RPC 인자 불일치를 해당 worktree에서 수정했다. 관리자 역할 gate, 게임 기본 아이콘 URL 입력, RPC 실패 시 비원자적 직접 갱신 제거를 반영했다.
- 앱 전체 Vitest 5개 파일·15개 테스트, ESLint, dummy Supabase 환경변수로 실행한 정적 빌드가 통과했다. 실제 Supabase/RLS/Storage 통합과 브라우저 이미지 흐름은 확인하지 않았다.
- Phase 4.4 요청 제출 UI는 `phase4-request-submission` run에서 구현 완료되어 기존 ChronoLedger Reviewer 검토 및 테스트를 통과했다. 실제 Supabase/RLS/RPC는 미검증이다.

## 다음 작업 (2026-10-08)

- 다음에는 격리된 Supabase 프로젝트에서 RLS 소유자 격리와 관리자 승인/반려 RPC 원자성을 확인한다. npm ci 실행 시 `@types/node`와 Vitest peer 제약이 다시 바뀌지 않는지 의존성 업데이트 때 재확인한다.
- Gemini API PoC의 일반적인 도입 여부는 미결정이며, 이번 작업에서는 API 연결을 하지 않았다.
- [Phase 5.1 ~ 5.2] 말일 보정을 포함한 날짜 연산 코어(`src/lib/calendar-utils.ts`) 작성 및 정기 구독 멱등성 보장 지연 생성 모듈(`src/lib/subscription-sync.ts`) 구현을 진행한다[cite: 4].
- [Phase 5.3 ~ 5.4] 금액 노출을 완전히 배제한 데스크톱 캘린더와 총 자산 잔고, 월 예산 진행률 바를 포함한 히어로 사이드바 컴포넌트를 작성한다[cite: 4].

## 최신 작업 상태 (2026-10-07)

- Gemini 작업은 구현과 분리해 커밋 후 동일 Target SHA의 읽기 전용 리뷰로 지정했다. 외부 자동 연결이 없어 실제 전달 및 검토는 미착수다.
- Dashboard 예정 지출 합계는 KST 현재 달의 DATE 범위(`end_date` 우선, 없으면 `target_date`)로 조회하도록 변경했다. 정상 빈 결과와 실제 0원은 0원으로 표시하고, 누락 자산 행·조회 실패는 오류 상태로 구분한다. 원격 Supabase query는 실행하지 않았다.
- 관련 두 Vitest 파일의 7개 테스트, 앱 lint, `npx tsc --noEmit`, 정적 production build가 통과했다. Vite configLoader 향후 호환성 경고가 있었고 원격 Supabase 통합 검증은 미실행이다.
- `/auth` 로그인 화면을 현재 앱에 맞는 다크 테마로 개선했다. 브라우저에서 320/390/768/1280px 레이아웃, 입력 라벨 및 44px 입력 영역을 확인했다. 키보드 탭 순서도 이메일·비밀번호·로그인·가입·Google 순으로 확인했다. callback 테스트 5개와 TypeScript 검사는 통과했으며 실제 인증은 재실행하지 않았다.
- 접근성 트리에서 H1/H2 제목 구조 및 폼/버튼 이름을 확인했다. 입력 44px, 주요 버튼 48px, 각 키보드 초점 표시를 확인했다. 주요 로그인 텍스트 대비는 최소 6.13:1, 대시보드 텍스트 조합은 최소 5.31:1, 로그인 초점 표시 대비는 5.21:1이다.
- `CardTitle`을 H2로 맞췄고 dashboard 로딩 live status, 데이터 오류 alert, 명명된 내비게이션 landmark 및 장식용 이모지 숨김을 추가했다. 보호된 dashboard 런타임과 실제 스크린리더 검증은 하지 않았다.
- 앱 worktree의 `.eslintrc.json`에 `root: true`를 설정해 상위 저장소 설정의 잘못된 해석을 막았다. `npm run lint`는 경고/오류 없이 통과했고 `npm run build`는 ESLint·타입 검사를 포함해 네 정적 경로를 생성했다.
- 앱 전체 테마 전환은 추후 모든 보호 화면과 함께 적용한다. 로그인 화면은 현재 다크 전용으로 유지한다.
- UI 디자인 제안 결정에 따라 [디자인 시안](design-previews/design-preview-ko.html)을 추가했다. 기존 정적 참고 목업 [design-v1-ko.html](design-previews/design-v1-ko.html)은 수정하지 않았다.
- 사용자 결정은 [상세 설계](detailed-design.md) 및 [UI Design Sheet](spec/ChronoLedger_UI_Design_Sheet.md)에 기록했다: 화면 구성에 더해 글자 크기, 쿨 뉴트럴 라이트/기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 정했다.
- 브라우저에서 대시보드·지출·통계와 반응형 390/900/1280px를 확인했다. 모바일 지출 카드와 하단 내비게이션, 768–1099px 상세 바텀시트, 저장되는 테마 전환이 동작하며 가로 넘침은 없었다.
- 선택된 타이포그래피·팔레트·그림자를 정적 시안에 반영했다. 대비 계산에서 라이트 본문/보조/약한 텍스트 17.41:1/7.85:1/5.80:1, 기본 버튼 흰 라벨 5.02:1, 라이트 상태 라벨 5.03:1 이상, 다크 상태 라벨 5.57:1 이상을 확인했다.
- 브라우저에서 다크/라이트 각 390/900/1280px를 재검증해 가로 넘침이 없음을 확인했다. 390px 바텀시트, 900px 중간 폭 상세 패널, 1280px 우측 상세 패널이 유지된다.
- A2Z 9개 WOFF2 굵기를 제품의 `public/fonts/a2z/`와 정적 시안의 `docs/assets/fonts/a2z/`에서 자체 호스팅한다. 두 위치 모두 내장 저작권 표기(`Copyright © 2026 PT&`)와 SIL OFL 1.1 전문을 동봉했다.
- 출처: [A2Z 제작자 폰트 안내](https://freesentation.blog/a2z), [눈누 라이선스 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1](https://openfontlicense.org/documents/OFL.txt). 폰트 자체 단독 판매는 금지된다.
- 브라우저에서 앱 `/auth` 경로를 열어 9개 굵기 모두 로드됨을 확인했고, 정적 export의 `out/fonts/a2z/` 및 생성 CSS에서도 9개 파일과 경로 참조를 확인했다. 현재 ESLint 설정 및 production build 검증은 최신 작업 상태를 따른다.
- 다음 작업: NVDA/VoiceOver 등 실제 스크린리더로 인증 및 dashboard를 검증하고, 제품 화면이 추가될 때 같은 대비/키보드 기준을 적용한다.

## 최신 작업 상태 (2026-10-06)

- Google provider와 localhost Redirect URL을 실제 확인하고 브라우저 OAuth 왕복을 검증했다. PKCE code 교환·세션 저장·dashboard 복귀가 성공한다.
- OAuth 자동 code 교환 중복 및 React Strict Mode effect cleanup을 수정했다. callback 테스트 5개, 변경 파일 lint 및 TypeScript 검사가 통과했다.
- `/`를 `/auth`로 통합하고 dashboard layout 인증 gate를 추가했다. 비인증 직접 dashboard 접근을 브라우저에서 확인해 차단했다. Android PWA 실기기 검증은 남아 있다.

## 현재 상태

- 프로젝트 목적 결정: ChronoLedger는 과제 제출물이 아닌 개인 프로젝트다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않는다. 기존 승인된 Supabase PostgreSQL/Next.js 정적 export, 이메일·Google 회원 기능, 사용자/관리자 구분을 유지한다. Netlify 또는 상시 Node.js 서버를 채택한 것은 아니다. 세부 결정은 [revisions_and_decisions.md](spec/revisions_and_decisions.md)에 기록했다.
- 통합 기획 및 결정 문서: [revisions_and_decisions.md](spec/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](spec/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](spec/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../sql/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](archive/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](archive/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](archive/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- Gemini 작업 진행 기록: to-do_Gemini.md (구 이력, 정리됨, 외부 배포 완료 표시는 로컬 증거와 별도로 확인 필요)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](archive/ai-collaboration-usage.md)
- UI 시트: [ChronoLedger_UI_Design_Sheet.md](spec/ChronoLedger_UI_Design_Sheet.md); 참고 목업 [design-v1-ko.html](design-previews/design-v1-ko.html); 사용자 결정 반영 중인 반응형 시안 [design-preview-ko.html](design-previews/design-preview-ko.html). 새 시안은 정적 예시이며 제품 UI 구현을 뜻하지 않는다.
- Netlify 웹 배포 제안: [Netlify_Web_Architecture_Proposal.md](archive/Netlify_Web_Architecture_Proposal.md). 상태는 Decision Proposal이며 사용자가 승인하기 전에는 플랫폼/빌드 타깃 변경을 적용하지 않는다.
- SRS 검토/검증 체크포인트: [srs-review-checkpoint.md](archive/srs-review-checkpoint.md). SRS 승인 및 테스트 프로젝트 rollback-only SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- SRS 요구사항 검토·승인과 테스트 프로젝트의 SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- `SRS.md` v1.0 요구사항은 사용자 승인됐고, `md/TESTS.sql`의 rollback-only smoke suite도 최종 PASS를 확인했다. Phase 0.6 완료 및 설계 진입이 승인됐다.
- 지원 플랫폼은 Windows용 Tauri v2 데스크톱과 Android PWA다. 성능 목표는 설계 단계에서 측정 환경과 함께 확정한다.
- Gemini의 2026-10-03 진행표를 `.worktrees/phase1-setup`과 대조했다. Tauri v2 및 shadcn 설정은 반영됐다. 다만 `/auth/callback`이 로그인 폼이고 Tauri 딥링크 처리에 PKCE 교환/cold-start 수신이 없어 OAuth 완료로 볼 수 없다. 버튼 무반응의 원인은 아직 미확정이다. [to-do.md](to-do.md)의 대조 절을 따른다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 설계 진입 게이트 (완료)

- 승인된 [SRS.md](spec/SRS.md) 요구사항과 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료했다.
- `md/TESTS.sql`의 핵심 DDL/RPC/RLS 동작 점검은 `ON_ERROR_STOP=1`에서 최종 PASS를 확인했다.
- Phase 0.6 완료 및 설계 단계 진입을 승인했다. 전체 SRS 수용 기준 테스트는 설계/테스트 계획에서 상세화한다.

## 다음 작업

- 사용자 우선순위는 웹사이트 개발이다. Android PWA 실기기 로그인 검증은 보류하되 제품 범위에서는 제외하지 않는다.
- Netlify는 후보이며 아직 확정 채택이 아니다. 로컬 `npm run build`에서 lint·타입 검사 포함 정적 export와 callback 테스트 5개가 통과했다. CLI Draft Deploy에서 사용자가 루트/`/auth` 로그인 표시, `/auth/callback` 안내, 비로그인 `/dashboard`가 `/auth`로 이동하는 것을 확인했다. 익명 HTTP 요청의 401은 Netlify Edge Access 제한이다. GitHub 자동 Preview, 실제 OAuth callback/허용 URL, Preview/Production 환경 변수 분리는 미검증이다. 앱에 PWA manifest/service worker가 없어 해당 경로도 아직 검증할 수 없다.
- 최신 앱 코드와 프로젝트 문서는 `main`에 통합해 `origin/main`으로 push했다. 폴더 점검에서 추적된 비밀/생성 산출물은 찾지 못했고 `.worktrees/` 및 `.env.local`은 무시된다. `artifacts/phase1-setup/run.json`은 `target_sha: null`, `in_progress`인 기존 미완료 기록이므로 종료 처리하지 않았다.
- 사용자는 2026-10-07 현재 세션을 종료했다. `.worktrees/phase1-setup/.env.local`의 Supabase URL과 Legacy `anon` 키 형식 및 프로젝트 ref 일치 확인, 그리고 대시보드 값과의 사용자 대조가 끝났다. 다음 재개 시 Draft callback URL을 Supabase Redirect URLs에 임시 등록한 뒤 OAuth 왕복을 테스트한다. 오늘은 해당 설정을 변경하지 않았다. 현재 Netlify Draft는 locally built `out` 업로드이며 site-level env variables나 GitHub continuous deployment는 구성되지 않았다.

- [상세 설계](detailed-design.md)는 승인 SRS/SPEC/SCHEMA를 흐름과 호출 경계로 연결한 초안이다. 예산 집계는 공유 클라이언트 도메인 함수, 오프라인 데이터는 계정별 IndexedDB에 고정 TTL 없이 저장하고 마지막 동기화 시각을 표시하며 네트워크 복귀 즉시 재조회하고 로그아웃/세션 만료 시 제거하기로 했다. 계정 삭제 부분 실패는 대기 상태를 유지하면서 재시도 간격을 늘려 완료까지 재시도하고, 대기 중 일반 접근은 차단하며 상태 화면만 허용한다. 데이터 정리 후 Auth 삭제 전에 주소 사본 없이 상태별 이메일을 보내며, Auth 삭제 실패 시 진행 상태를 알리고 삭제만 재시도한다. 게임 구독 해제도 Storage 정리 대기 작업과 재시도 후 행을 삭제하며, 처리 중에는 목록에 “삭제 처리 중”으로 표시하기로 했다. 성능 기준 기기는 중급 Android 실기기다. worker/메일 전달 구조와 성능 측정 세부조건은 미결정이다. Netlify 제안은 보류하며, 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정이다. 기존 결정인 Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스와 Tauri 정적 export, Web/PWA 우선 순서는 유지한다. Netlify 채택과 Web/Desktop 빌드 분리는 별도 미결정이다.
- 브라우저 Google OAuth를 실제 Supabase 설정으로 검증했다. Google provider 활성화와 `http://localhost:3000/auth/callback` 등록 후 PKCE code 교환, 세션 저장 및 dashboard 복귀가 성공했다. 중복 URL code 교환과 React Strict Mode cleanup 문제를 수정하고 관련 테스트 5개가 통과했다.
- `/`에서 단일 `/auth` 로그인 화면으로 이동하고 dashboard layout에서 비인증 접근을 막는다. 브라우저에서 로그인 상태 이동 및 로그아웃 후 직접 dashboard 접근 차단을 확인했다. 이 client gate는 RLS를 대체하지 않는다. Android PWA 실기기 왕복 검증은 남아 있다.
- 다음 구현 후보는 SRS 수용 기준별 기능 흐름과 원격 Supabase 쿼리/권한 통합 검증을 진행한다. Android PWA 실기기 인증은 사용자의 보류 결정에 따라 후순위로 둔다.
- 기존 `phase1-setup` run manifest는 `target_sha: null`, `in_progress`인 별도 과거 run이다. 이번 `phase1-completion` 결과와 혼동하거나 완료 처리하지 않는다.
- VS Code Copilot 저장소 설정은 추가했다: `.github/copilot-instructions.md`, `.github/agents/chronoledger-maker.agent.md`, `.github/agents/chronoledger-reviewer.agent.md`. 프로필 인식 및 동일-SHA 리뷰 아티팩트 절차는 사용자의 VS Code 환경에서 별도로 확인한다. 역할 설명만으로 읽기 전용 권한은 강제되지 않는다.
- 상세 설계 미결정 사항과 후속 문서 작업은 [to-do.md](to-do.md)에 추적한다.
- Netlify 플랫폼 및 Web/Desktop 이중 빌드 결정은 Deploy Preview 검증 전까지 대기 중이다. 정적 export가 충족하지 못하는 구체 요구가 확인되면 그때 서버 runtime을 재평가한다.
- 측정 환경과 함께 성능 목표를 확정한다. 상세 순서는 [to-do.md](to-do.md)를 따른다.

## 멀티 에이전트 협업 검토

- 설계안과 검토 의견은 각각 [협업 아키텍처](archive/multi_agent_collaboration_architecture.md), [검토 문서](archive/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](archive/ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
