# 변경 이력

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

## 2026-10-07
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
