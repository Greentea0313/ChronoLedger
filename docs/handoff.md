# 프로젝트 인수인계 문서 (handoff.md)

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
- 사용자는 Gemini와의 이번 리뷰는 API 키 연결이 아니라 승인 기준/프롬프트를 직접 입력하는 수동 방식으로 진행했다. [Gemini 수동 리뷰 패킷](Gemini_phase4_manual_review.md)과 exact diff `artifacts/gemini-phase4-connection/phase4-request-submission.diff`로 Gemini 수동 정적 리뷰를 받았다.
- API 전송 검증용 `gemini-phase4-connection` run은 dry-run만 수행했다. API 키가 없어 호출·네트워크 전송은 없었으며, 사용자 선택에 따라 `abandoned` 처리했다. 종료 기록은 `artifacts/gemini-phase4-connection/iteration-01/human-report.md`에 있다.
- 참조 Base/Target은 `674f741ee52d45bb96db3431521101a5aa01341f` → `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. Gemini는 `clean`/발견 없음으로 판정했다. 결과는 `artifacts/phase4-request-submission/iteration-01/gemini-manual-review.md` 및 `gemini-review.json`에 기록했으며 기존 ChronoLedger `review.json`은 변경하지 않았다.
- Gemini는 실제 Supabase RLS 격리와 승인/반려 RPC 원자성을 미검증 항목으로 남겼다. 당시 `npm ci` 재현성 문제는 이 통합에서 의존성 범위와 lockfile을 갱신해 표준 clean install로 검증했다.
- 협업 도구/문서는 main의 `f163157`, 대시보드·게임 UI 기반은 `collab/phase1-setup`의 `674f741`, 요청 제출 UI는 `5f7cf55`에 각각 기록되어 있으며 모두 현재 main 작업 트리에 통합됐다.
- 기존 `phase1-setup` run은 Target `dda0cae...`와 후속 Phase 4 변경의 범위가 달라 `abandoned` 처리했다. 동일 SHA review/test를 주장하지 않으며 보고서는 `artifacts/phase1-setup/iteration-01/human-report.md`에 있다.
- Phase 4.4 run `phase4-request-submission`은 Base `674f741...`, Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. 요청 제출 UI(게임 제안, 일정 추가/수정), 입력 검증, 소유자 요청 목록과 회귀 테스트를 추가했다.
- 같은 Target SHA의 Reviewer는 `clean`/0 findings다. Vitest 21개, ESLint, dummy Supabase 환경변수의 정적 build 및 세 run artifact Schema가 통과했다. sandbox unavailable; 실제 Supabase/RLS/RPC 및 사용자 인증 DB 동작은 미검증이다.
- `npm ci`는 기존 manifest/lock 충돌로 실패했으며, 검증은 `npm install --no-package-lock --legacy-peer-deps`로 설치한 로컬 의존성을 사용했다. lockfile은 이 run에서 변경하지 않았다.
- 최소 개입 협업을 위해 [ChronoLedger Orchestrator](../.github/agents/chronoledger-orchestrator.agent.md), [초보자 가이드](ChronoLedger_collaboration_guide.md), 협업 artifact Schema 검증기를 추가했다. Local harness 기반이며 실제 에이전트 인식/통합 실행은 아직 검증 전이다.
- Gemini Reviewer는 선택형 외부 리뷰로 둔다. 전체 diff에 대한 사용자 승인 없이 외부 API를 호출하지 않는다.
- Gemini Reviewer 제한 PoC를 [구현 문서](ChronoLedger_pipeline_auto.md)에 따라 추가했다. 단일 run/SHA 검증, 전체 diff의 사용자 승인, JSON Schema 검증과 no-overwrite 결과 저장이 적용됐고 오프라인 테스트 12개가 통과했다. 실제 Gemini API 실행·외부 전송·품질/비용 평가는 하지 않았으므로 도입 결정은 보류 상태다.
- 제안서의 독립 검토 의견은 [전달용 문서](ChronoLedger_pipeline_auto_review.md)에 정리했다.
- 체크리스트 기준: 현재 작업 우선순위와 상태는 [공용 `to-do.md`](to-do.md)가 단일 기준이다. [Gemini 진행 기록](to-do_Gemini.md)은 보존용 별도 이력이며, 상충하는 상태나 검증 주장은 증거 대조 전까지 기준으로 사용하지 않는다.
- Phase 4 초기 구현은 `.worktrees/phase1-setup`에서 검증한 뒤 요청 제출 UI와 함께 현재 `main` 작업 트리에 통합했다.
- 관리자 요청 페이지와 게임 선택 모달의 DB 필드/RPC 인자 불일치를 해당 worktree에서 수정했다. 관리자 역할 gate, 게임 기본 아이콘 URL 입력, RPC 실패 시 비원자적 직접 갱신 제거를 반영했다.
- 앱 전체 Vitest 5개 파일·15개 테스트, ESLint, dummy Supabase 환경변수로 실행한 정적 빌드가 통과했다. 실제 Supabase/RLS/Storage 통합과 브라우저 이미지 흐름은 확인하지 않았다.
- Phase 4.4 요청 제출 UI는 `phase4-request-submission` run에서 구현 완료되어 기존 ChronoLedger Reviewer 검토 및 테스트를 통과했다. 실제 Supabase/RLS/RPC는 미검증이다.

## 다음 작업

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
- UI 디자인 제안 결정에 따라 [디자인 시안](design-preview-ko.html)을 추가했다. 기존 정적 참고 목업 [design-v1-ko.html](design-v1-ko.html)은 수정하지 않았다.
- 사용자 결정은 [상세 설계](detailed-design.md) 및 [UI Design Sheet](../md/ChronoLedger_UI_Design_Sheet.md)에 기록했다: 화면 구성에 더해 글자 크기, 쿨 뉴트럴 라이트/기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 정했다.
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

- 프로젝트 목적 결정: ChronoLedger는 과제 제출물이 아닌 개인 프로젝트다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않는다. 기존 승인된 Supabase PostgreSQL/Next.js 정적 export, 이메일·Google 회원 기능, 사용자/관리자 구분을 유지한다. Netlify 또는 상시 Node.js 서버를 채택한 것은 아니다. 세부 결정은 [revisions_and_decisions.md](../md/revisions_and_decisions.md)에 기록했다.
- 통합 기획 및 결정 문서: [revisions_and_decisions.md](../md/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](../md/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](../md/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../md/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](../md/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](../md/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](../md/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- Gemini 작업 진행 기록: [to-do_Gemini.md](to-do_Gemini.md) (외부 배포 완료 표시는 로컬 증거와 별도로 확인 필요)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](ai-collaboration-usage.md)
- UI 시트: [ChronoLedger_UI_Design_Sheet.md](../md/ChronoLedger_UI_Design_Sheet.md); 참고 목업 [design-v1-ko.html](design-v1-ko.html); 사용자 결정 반영 중인 반응형 시안 [design-preview-ko.html](design-preview-ko.html). 새 시안은 정적 예시이며 제품 UI 구현을 뜻하지 않는다.
- Netlify 웹 배포 제안: [Netlify_Web_Architecture_Proposal.md](Netlify_Web_Architecture_Proposal.md). 상태는 Decision Proposal이며 사용자가 승인하기 전에는 플랫폼/빌드 타깃 변경을 적용하지 않는다.
- SRS 검토/검증 체크포인트: [srs-review-checkpoint.md](srs-review-checkpoint.md). SRS 승인 및 테스트 프로젝트 rollback-only SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
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

- 승인된 [SRS.md](../md/SRS.md) 요구사항과 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료했다.
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

- 설계안과 검토 의견은 각각 [협업 아키텍처](../md/multi_agent_collaboration_architecture.md), [검토 문서](../md/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
