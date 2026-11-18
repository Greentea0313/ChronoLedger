# 개발 체크리스트 보관 기록 (to-do-archive.md)

- `docs/to-do.md`에서 옮긴 완료 구간과 완료 항목임(2026-11-18 분리). 새로 옮기는 항목은 이 머리말 바로 아래(맨 위)에 넣음.
- 평소 작업에서는 읽지 않음.

### Phase 1. Web/PWA 환경 및 테스트 기반

- [x] 1.1 Next.js 14+ (App Router) 정적 export 프로젝트 초기화
  - 대상 파일: `package.json`, `next.config.mjs`, `src/app/layout.tsx`
  - 작업: `output: 'export'` 설정, `images.unoptimized: true` 설정, Tailwind 보일러플레이트 세팅
  - verify: `npm run build` 성공 및 `out/` 생성 확인 (2026-10-08)
- [x] 1.2 Vitest 단위 테스트 환경 구성
  - 대상 파일: `vitest.config.ts`, `package.json`
  - 작업: `vitest`, `@testing-library/react` 설치 및 기본 단언문 테스트 등록
  - verify: `npm run test -- --run`에서 7개 파일/24개 테스트 통과 (2026-10-08)
- [x] 1.3 shadcn/ui 컴포넌트 라이브러리 세팅
  - 대상 파일: `components.json`, `src/components/ui/`
  - 작업: Button, Dialog, Card, Input, Select, Progress, Drawer(바텀시트) 설치
  - Dialog/Select는 기존 구현을 재사용하고 Progress/Drawer를 추가했다. `npm run build`에서 타입 검사 및 정적 export를 확인했다.
- [x] 1.4 Supabase 클라이언트 SDK 싱글톤 구성
  - 대상 파일: `.env.local`, `src/lib/supabase/client.ts`
  - 작업: 서버 쿠키 세션을 배제하고 `@supabase/supabase-js` 싱글톤 브라우저 클라이언트 유틸 작성
  - 환경변수 누락 오류 및 PKCE/Tauri flow 설정은 단위 테스트로 확인했다. 실제 Supabase 인증/조회는 미검증이며 placeholder 연결을 성공으로 간주하지 않는다.

---

### Phase 2. 데이터베이스 스키마, RPC 및 RLS 배포

- [x] 2.1 12개 핵심 테이블 DDL 마이그레이션 적용
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: Supabase 대시보드 SQL 에디터에서 통합 DDL 스크립트 실행
  - verify: 12개 테이블 및 유니크 인덱스가 Table Editor에 에러 없이 생성되었는지 확인
- [x] 2.2 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거 배포
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: `process_expense_payment`, `refund_expense_payment`, 지갑 설정/보정 RPC, 게임·일정 승인/반려 RPC, 트리거 등록
  - verify: 결제/환불 RPC의 금액·잔액·상태 검증과 게임/일정 승인 원자성 확인
- [x] 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: 일반 사용자 역할/JWT로 자산, 확정 지출, 지갑, 원장 및 요청 승인 상태에 직접 쓰기를 시도
  - verify: 2026-10-12 `md/TESTS.sql` psql 실행에서 RLS 격리, 교차 사용자 쓰기 차단, wallets 직접 수정 거부, expenses/구독 템플릿 물리 삭제 거부, 요청 임의 승인 차단이 모두 검증되고 전 테스트 PASS 및 롤백 완료됨을 확인했다.
- [x] 2.4 재현 가능한 DB/RPC/RLS 검증 케이스 준비 및 실행 검증
  - 대상 파일: `md/TESTS.sql`, `md/SCHEMA.sql`
  - 작업: 테스트 역할/JWT, 초기 데이터, 실행 순서, 각 케이스의 기대 성공/실패 결과를 문서화했다. 결제/환불·지갑, 구독/일정 트리거, 사용자 요청, 관리자 RPC, RLS/grants 케이스를 rollback-only SQL로 준비하고 실행했다.
  - verify: 2026-10-12 격리된 Supabase 테스트 프로젝트에서 `md/TESTS.sql`을 `ON_ERROR_STOP=1`로 psql 실행하여 결제/환불, 지갑, 트리거, RLS, 관리자 권한 등 전체 시나리오가 통과하고 `PASS: all smoke-test fixtures and mutations rolled back` 출력을 확인했다.
- [x] 2.5 TypeScript Database 타입 자동 생성
  - 대상 파일: `src/types/database.types.ts`
  - 작업: `npx.cmd supabase gen types typescript --db-url ...` 실행하여 원격 DB 기반 타입 갱신
  - verify: 2026-10-12 `src/types/database.types.ts` 생성 완료. `Database['public']['Tables']['personal_memos']['Row']` 타입 포함 12개 테이블/뷰/함수 타입 갱신 확인, `npx.cmd tsc --noEmit` 에러 0건 통과, Vitest 30개 파일 / 106개 테스트 100% 통과 확인.

---

### Phase 3. Web/PWA 인증(Auth)

- [x] 3.1 이메일 가입/로그인 및 구글 OAuth 연동
  - 대상 파일: `src/app/auth/page.tsx` 또는 통합 로그인 경로, `src/app/auth/callback/page.tsx`, `src/lib/auth-context.tsx`
  - 작업: 이메일 가입/로그인, Google OAuth/PKCE callback, 세션 상태 및 protected routes를 Web/PWA 기준으로 연결했다. 별도 callback route는 기존 공유 callback 흐름을 재사용한다.
  - [x] 로그인 화면을 기존 앱과 맞는 다크 테마로 정리하고, 레이블이 있는 입력과 이메일 로그인/가입/Google 액션을 배치했다. 320/390/768/1280px 화면에서 넘침이 없고 입력 높이가 44px 이상임을 확인했다.
  - [x] Google OAuth 로그인 버튼 공식 4색 SVG 아이콘 및 로딩 스피너 피드백(`Loader2` 회전 스피너, "Google 연결 중..." 문구), OAuth 콜백(`/auth/callback`) 화면 앱 전역 다크 테마 및 Card 디자인 시스템(스피너/안내 문구/에러 UI) 일원화 완료 (2026-10-19 ~ 2026-10-20).
  - 후속: 앱 전체 테마 전환은 보호 화면과 함께 적용한다. 키보드/스크린리더 심화 검증은 별도로 수행한다.
  - verify: 인증 화면/상태 단위 테스트로 검증한다. 실환경 OAuth 왕복과 Android PWA 실기기 검증은 아직 수행하지 않았다.
- [x] 3.2 사용자 계정 삭제 및 개인 데이터/Storage 정리 흐름
  - 대상 파일: 인증 설정 화면, 서버 측 계정 삭제 경로, `user-icons` Storage 정책
  - 작업: Netlify Functions 내구성 queue/worker에서 본인 확인 후 아이콘·개인 행을 정리하고 등록 이메일 알림 뒤 Auth 계정을 삭제한다. 대기 중 RLS/trigger로 개인 접근을 차단하고 공용 게임/일정은 보존한다.
  - verify: 단위 테스트에서 순서, 재시도, provider 멱등성 경계 및 Auth 최종 삭제를 확인했다. 실제 Supabase migration/RLS/Storage, Netlify 예약 실행과 Resend 전달은 배포 환경에서 검증해야 한다. Idempotency 기간 만료 전에 발송 결과를 확정할 수 없으면 `MANUAL_REVIEW`로 멈추며 운영자 조치가 필요하다.

---

### Phase 4. 게임 마스터, 256x256 아이콘 및 요청 시스템

- [x] 4.1 클라이언트 Canvas 256x256 WebP 리사이징 모듈
  - 대상 파일: `src/lib/image-resizer.ts`
  - 작업: PNG/JPG/JPEG/WebP 입력(원본 5 MiB 이하)을 1:1 중앙 크롭 후 Canvas로 256×256 WebP 변환 (Safari 폴백 포함)
- [x] 4.2 Supabase Storage `user-icons` 버킷 업로드 연동
  - 대상 파일: `src/lib/storage-upload.ts`
  - 작업: 비공개 `user-icons` 버킷 안에 `{user_id}/{game_id}.webp` 고정 객체 경로를 사용하고 소유자만 인증 조회/교체/삭제하도록 설정.
- [x] 4.3 공용 게임 카탈로그 구독 및 커스텀 아이콘 등록 UI
  - 대상 파일: `src/components/game/game-select-modal.tsx`
  - 작업: 공용 `games` 중 내 게임으로 `user_games`에 등록 및 커스텀 아이콘 교체 기능 구현.
- [x] 4.4 일반 유저 게임/일정 추가·수정 요청 모달 및 관리자 승인 UI
  - 대상 파일: `src/components/game/schedule-request-modal.tsx`, `src/app/admin/requests/page.tsx`
  - 작업: 게임 요청(`game_requests`)과 일정 요청(`schedule_requests`)을 분리하고 승인/반려 RPC 연동. 사용자 게임/일정 제안 제출 UI와 관리자 페이지를 구현했다.
  - verify: run Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`에서 Vitest 21개, lint, 정적 build, run/review/test Schema 및 동일 SHA Reviewer 검토를 통과했다. 실제 Supabase RLS/승인 RPC 통합과 sandbox 격리는 미검증이다.

---

### Phase 5. 미니멀 캘린더 코어, 개인 메모 및 Lazy Generation

- [x] 5.1 날짜 연산 코어 및 말일 보정 함수 작성
  - 대상 파일: `src/lib/calendar-utils.ts`
  - 작업: 6주 캘린더 그리드 및 `getAdjustedBillingDate(year, month, billingDay)` 구현
  - verify: `calendar-utils.test.ts`에서 31일 결제일이 2월 평년=28일, 윤년=29일, 4월=30일로 보정되는 케이스와 6주(42칸) 그리드를 검증했다.
- [x] 5.2 정기 구독 멱등성 보장 지연 생성 (Lazy Generation)
  - 대상 파일: `src/lib/subscription-sync.ts`
  - 작업: 당월 캘린더 로드 시 `is_active=true` 템플릿을 기준으로 `expenses`에 `PLANNED` 회차를 upsert하고, `template_id+billing_cycle` 충돌은 `ignoreDuplicates`로 무시한다. 취소 회차 자동 복구 로직은 추가하지 않았다.
  - verify: `subscription-sync.test.ts`에서 billing cycle 기반 삽입 파라미터와 중복 무시 옵션을 검증했다. 실제 동시 접속 중복 생성 방지는 DB 유니크 인덱스(`idx_expenses_template_billing_cycle`)에 의존하며 실DB 동시성 검증은 후속 과제다.
- [x] 5.3 미니멀 데스크톱 캘린더 (금액 완전 배제, 버전/픽업 배너 및 메모 도트)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/schedule-banner.tsx`
  - 작업: 타일 내부에서 금액을 렌더링하지 않고, 일정 유형 배너(`VERSION`/`PICKUP`), 게임 아이콘, 메모 도트만 표시하도록 구현했다.
  - verify: `desktop-calendar.test.tsx`에서 배너/아이콘/메모 도트 렌더링과 타일 내 통화 텍스트 미표시를 검증했다.
- [x] 5.4 우측 히어로 사이드바 (Hero Area) 및 모바일 바텀 시트
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: 우측 사이드바에 총 자산/예산 진행률/스토어 포인트/선택일 지출·메모를 표시하고, 모바일에서는 Drawer 바텀 시트로 동일 상세를 제공한다.
  - verify: `dashboard/page.test.tsx`에서 캘린더와 선택일 상세(지출/메모/자산) 렌더링을 확인했다.

---

### Phase 6. 가계부, 결제/환불 RPC 연동 및 포인트 지갑

- [x] 6.1 스토어 포인트 지갑 위젯 및 계정 등급 설정
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/settings/page.tsx`
  - 작업: `update_store_wallet_settings` RPC 연동(구글 등급별 적립률, 갤럭시 적립률 수정) 및 잔액 수동 보정 UI 구현
  - verify: 설정 변경 시 지갑 레코드가 정상 갱신되고 수동 보정 시 원장에 `MANUAL_ADJUST`가 기록되는지 확인
- [x] 6.2 정밀 결제 모달 및 `process_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`
  - 작업: 계층형 등록(카테고리 $\to$ 게임 $\to$ 버전/픽업 탭), `WALLET`/`GOOGLE_PLAY`/`GALAXY_STORE` 결제수단, 할인/포인트할인 분리 입력, 자산 차감 토글 및 RPC 호출
  - verify: 정가 119,000원, 쿠폰 5,000원(250P 소모) 입력 시 실결제액 114,000원 산출 및 잔액 차감 확인
- [x] 6.3 결제 취소/환불 UI 및 `refund_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-detail-modal.tsx`
  - 작업: 지출 상세에서 [결제 취소] 클릭 시 환불 RPC 호출 (포인트 반환, 적립 회수, 자산 복원)
  - verify: 적립 포인트를 이미 써서 잔액이 부족한 경우 환불 거부 에러 메시지가 정상 노출되는지 확인

---

### Phase 10. 재정리된 기획(v2) 기반 UI/UX 및 정기 구독·지갑 개편

- [x] 10.1 대시보드 캘린더 및 지출 바인딩 로직 개선
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: `[+ 지출 추가]` 버튼명 변경, 지출 모달 내 카테고리 우선 선택(게임 시에만 게임 선택 노출), 해당 날짜의 `VERSION` 일정에만 바인딩 (`PICKUP` 일정 바인딩 제외)
  - verify: 지출 추가 시 카테고리='게임'일 때만 게임 선택란이 보이고, 해당 날짜의 `VERSION` 일정이 자동 바인딩되는지 확인
- [x] 10.2 소비(`/dashboard/expenses`) 화면 UI 개편
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업: 헤더 버튼명 `[+ 지출 추가]`로 변경 및 모달 연동, 목록 액션 버튼 `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 통일, 카테고리별 비중을 **원그래프(Pie Chart)**로 교체, 집계 기준을 `CONFIRMED` 지출만으로 한정
  - verify: 취소/예정 지출을 제외한 확정 지출만 원그래프로 비율 계산되는지 확인, 버튼 레이블 통일 및 RPC 연동 확인, 단위 테스트 4개 통과 및 정적 export 빌드 성공
- [x] 10.3 정기 구독 탭 및 3종 주기 모델(A안) 구현
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/lib/subscription-sync.ts`, `src/components/subscription/subscription-modal.tsx`, `md/SCHEMA.sql`
  - 작업: 소비 화면 내 서브 탭(`[지출 내역 및 통계 | 정기 구독]`), `[+ 구독 추가]` 버튼 및 모달(카테고리='게임'일 때만 게임 노출), `cycle_type` 3종(`MONTHLY_DAY`, `INTERVAL_30`, `VERSION_PASS`) 모델 적용 및 회차 생성 로직 확장, `is_active` 활성화/비활성화 토글
  - verify: 매월 지정일, 30일 누적 충전, 새 버전 시작일 연동에 따른 회차 생성 테스트 통과, Vitest 28개 파일/99개 테스트 통과, 정적 export 빌드 성공
- [x] 10.4 게임 관리(`/dashboard/games`) 추가 요청 모달 개선
  - 대상 파일: `src/app/dashboard/games/page.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/game/game-select-modal.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업: `[+ 추가 요청]` 버튼으로 변경 및 모달 연동, 모달에서 [게임 요청 | 일정 요청] 선택 분기(게임은 제목만, 일정은 게임+기간+종류+내용 템플릿 제공), 내 구독 게임 그리드 카드(커스텀 아이콘 등록/변경, 구독 해제, 일정 보기), 하단 카탈로그 검색 및 `[+ 구독 추가]`, `[+ 추가 요청]` 배너 연동
  - verify: 각각의 요청이 `game_requests` 및 `schedule_requests`로 정상 분기 인입 확인, 단위 테스트 9개 통과(modal 5개 + page 4개), Vitest 29개 파일/103개 테스트 전체 통과, `npm run build` 정적 export 빌드 성공
- [x] 10.5 설정(`/dashboard/settings`) Galaxy Store 등급 개편 및 내 요청 내역
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/dashboard/settings/page.tsx`, `src/components/finance/finance-settings-card.tsx`, `src/components/game/user-requests-card.tsx`, `md/SCHEMA.sql`
  - 작업: Galaxy Store 적립률 입력을 4대 공식 등급(일반 0.1%, 스타 0.1%, 프레스티지 1.1%, 로열블루 2.1%) 선택 드롭다운으로 개편하고 DB 제약 동기화, 개인 재무 설정(`total_asset`, `default_budget`) 카드 연동, 사용자 본인의 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 메모 조회 UI 추가
  - verify: Galaxy Store 등급 선택 시 올바른 적립률 저장 및 원장/지갑 갱신 확인, 내 요청 내역 정상 조회 확인, `settings/page.test.tsx` 3개 테스트 및 `store-wallet-widget.test.tsx` 3개 테스트 통과
- [x] 10.6 종합 검증 및 회귀 테스트
  - 작업: `npx tsc --noEmit`, Vitest 테스트 실행, `npm run build` 정적 export 빌드 검증
  - verify: TypeScript 타입 에러 0건, Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS), `npm run build` 정적 13개 페이지 export 생성 성공

### Phase 11. 게임 일정 구조 다변화, 대시보드 중앙 모달 전환 및 네이버페이 충전 결제 연동

- [x] 11.1 게임 일정 스키마 확장(`CONTENTS`, 단일 목표일), 일정 모달 전환 및 대시보드/사이드바 3단 UI·정렬 일원화
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/schedule-banner.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/subscription/subscription-modal.tsx`
  - 작업:
    1. DB `game_schedules.schedule_type`에 `CONTENTS` 추가 (`chk_schedule_type` 제약 갱신), 단일 목표 일정(`start_date = end_date = target_date`) 지원 및 관리자 등록 UI(`AdminPage`) 확장.
    2. 게임 관리(`/dashboard/games`): 내 구독 게임 '일정 보기' 우측 Sheet를 화면 중앙 팝업 다이얼로그(`<Dialog>`)로 전환하고, `end_date >= today` 필터링으로 만료된 일정 제외.
    3. 홈 대시보드(`/dashboard`): 사이드바(`HeroSidebar`) 레이아웃 원상 복구, 캘린더 타일에서 지출 항목에 의한 아이콘 증식 제거(공식 일정 시작일에만 아이콘 노출), 개인 메모 인라인 편집/저장 UI 연동.
    4. 캘린더 타일 배지 및 내비게이션(`desktop-calendar.tsx`): 배지 겹침 시 `[VERSION]` $\to$ `[PICKUP]` $\to$ `[CONTENTS]` 우선순위 렌더링, 상/하단 수직 분리 레이아웃으로 날짜 가림 방지, `VERSION` 배지 옆 중복 아이콘 제거, `PICKUP`/`CONTENTS` 배지 시작일(`start_date`) 한정 노출, 동일 날짜 다중 게임 일정 시작 시 타일 우측 아이콘 게임명 가나다순(`localeCompare`) 정렬, 내비게이션 버튼을 `public/assets/nav/` SVG 에셋으로 교체 및 테마별 화살표 동기화.
    5. 선택일 일정(`HeroSidebar`): 3단 수직 카드 구조(`[배지] 게임명` / 기간 / 일정 제목(볼드) / 메모) 개편.
    6. 전체 화면 일정 정렬 로직 일원화: 1순위 `start_date ASC`, 2순위 `end_date ASC` (대시보드 사이드바, 게임 일정 모달, 관리자 공식 일정 목록).
    7. 지출 모달(`ExpenseModal`): `[연결된 버전 일정]` 레이블 변경, 비활성화 안내 텍스트 제거, 상시 disabled 상태로 매칭 버전 명칭만 노출(기간 텍스트 제외).
    8. 정기 구독 모달(`SubscriptionModal`): 결제수단 필드를 '내 지갑'(`WALLET`, disabled)으로 고정.
  - verify: `CONTENTS` 등록 및 캘린더/배너 정상 표시, 게임 일정 중앙 모달 동작 및 만료 일정 필터링 확인, 타일 배지 엄격한 순서 렌더링 검증, 타일 아이콘 가나다순 정렬 단위 테스트 검증, 사이드바 3단 레이아웃 및 2차 정렬 단위 테스트 검증, Vitest 32개 파일 / 119개 테스트 전체 통과 (100% PASS), `npm run build` 정적 13개 페이지 export 빌드 성공
- [x] 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/lib/naver-pay-calculations.ts`, `src/lib/naver-pay-calculations.test.ts`, `src/lib/payment-calculations.ts`, `src/components/wallet/store-wallet-widget.tsx`, `src/components/wallet/store-wallet-widget.test.tsx`
  - 작업:
    1. `store_wallets`, `expenses`, `store_point_transactions`에 `NAVER_PAY` 플랫폼/결제수단/`RECHARGE` 트랜잭션 지원 및 DB 제약조건(`chk_wallet_platform_settings`: 네이버페이는 등급 NULL, 적립률 0%) 추가.
    2. 네이버페이 충전 및 결제 계산 순수 함수 `calculateNaverPayPayment` 모듈화 (부족액 $S$, 1만원 단위 올림 충전액 $R$, 총 자산 잔액 검증 $B_{total} \ge R$, 최종 잔액 계산).
    3. `process_expense_payment` 및 `refund_expense_payment` RPC에 네이버페이 결제 시 부족액 충전($R$ 자산 차감 + 네이버페이 머니 충전) 및 결제($P$ 차감) 원자적 단일 트랜잭션 구현, 자산 이중 차감 및 이중 환불 원천 차단.
    4. 스토어 지갑 위젯(`StoreWalletWidget`)에 네이버페이 잔액(원) 표시 및 수동 목표 잔액 보정(`adjust_wallet_balance`) 지원.
  - verify: 단위 테스트(잔액 충분, 1만원 단위 올림 충전, 총 자산 부족 차단 등 9개 시나리오) 및 위젯 렌더링/보정 테스트 통과, Vitest 34개 파일 / 138개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/expense/expense-detail-modal.test.tsx`
  - 작업:
    1. 결제 모달 내 [결제 플랫폼(구글/갤럭시/기타)] -> [결제 수단(내 지갑/스토어/네이버페이)] 2단계 종속 선택 구조 구현.
    2. 네이버페이 선택 시 실시간 잔액 비교 및 "부족 금액 안내 / 1만원 단위 자동 충전 프리뷰" 인라인 카드 노출, 사용 포인트 입력 비활성화 및 리셋 가드.
    3. 네이버페이 잔액 부족 시 `[충전 후 결제]` 원클릭 승인 버튼 라벨 전환 및 단일 트랜잭션 RPC 연동, 총 자산 부족 시 `[총 자산 부족]` 경고 및 비활성화.
    4. 자동 계산값 기본 채움 및 최종 실결제액 수동 오버라이드 지원 (수동 금액 입력 시 할인액 자동 역산 및 DB 제약조건 무결성 보장).
    5. 지출 상세 모달(`ExpenseDetailModal`) 내 네이버페이 결제 라벨 및 전액 환불 안내 메시지 적용.
  - verify: 단위 테스트(플랫폼별 수단 필터링, 네이버페이 부족액 올림 충전 프리뷰, 원클릭 결제 RPC 파라미터, 실결제액 수동 오버라이드 역산, 상세 모달 환불 문구 등 13개 케이스) 통과, Vitest 34개 파일 / 143개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석 구현
  - 대상 파일: `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/expense/expense-detail-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업:
    1. DB 스키마: `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 및 인덱스(`idx_expenses_pickup_schedule_id`), 일정 게임 일치 트리거 검증(`validate_expense_references`) 반영, `md/MIGRATION_PHASE11.sql` 마이그레이션 DDL 추가, TypeScript 데이터베이스 타입 동기화.
    2. 지출 등록 모달(`ExpenseModal`): 카테고리가 '게임'일 때 결제일(`paymentDate`) 기준 진행 중인 픽업 일정(`schedule_type = 'PICKUP'`) 목록을 `[픽업 선택 (선택 사항)]` 드롭다운으로 조회 및 바인딩 지원 (`pickup_schedule_id` insert 반영).
    3. 지출 상세 모달(`ExpenseDetailModal`): 바인딩된 픽업 타이틀(`pickupTitle`) 항목 표시.
    4. 소비 화면(`/dashboard/expenses`) 통계 UI: 게임별 픽업 과금 통계 섹션 추가 (확정 `CONFIRMED` 지출 기준 픽업별 총 과금액 가로 막대 차트 `BarChart layout="vertical"`, 랭킹 카드, 버전 내 픽업 과금 비중(%) 표시, 게임 선택 필터 드롭다운, 미지정 지출 '버전 일반' 분리 표기로 정합성 100% 보장).
    5. 지출 목록 테이블 및 모바일 카드: 게임 지출 항목에 `[픽업명]` 뱃지 렌더링.
  - verify: 단위 테스트(ExpenseModal 픽업 드롭다운 바인딩, ExpenseDetailModal 픽업 타이틀 노출, ExpensesPage 픽업 통계 집계 및 배지 렌더링 등) 통과, Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공
- [x] 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/subscription/subscription-modal.tsx`, 전체 테스트 스위트
  - 작업: 모바일 뷰포트 패딩 최적화(`p-4 sm:p-6`), 중앙 모달 반응형 크기 세부 조정, 지출 목록 모바일 카드 타이틀-배지 줄바꿈 래핑, `npx tsc --noEmit`, Vitest 전체 테스트 실행, `npm run build` 정적 export 검증.
  - verify: Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

### Phase 12. 지갑 편의 기능(Audit Log), 캘린더 커스터마이징 및 대시보드/모바일 고도화

- [x] 12.1 스토어 지갑·포인트 수동 보정 내역(Audit Log) 조회 모달 구현 (2026-10-14)
  - 대상 파일: `src/components/wallet/store-wallet-adjust-history-modal.tsx`, `src/components/wallet/store-wallet-widget.tsx`
  - 작업: `store_point_transactions` 테이블에서 `transaction_type = 'MANUAL_ADJUST'` 레코드 조회, 플랫폼별(전체/구글 플레이/갤럭시 스토어/네이버페이) 필터 탭, 5개 기준 페이지네이션(`ITEMS_PER_PAGE = 5`, 이전/다음/페이지 번호/범위 안내) 바, 새로고침, 증감 차액(+/-) 및 사유 메모 뷰어 제공, 지갑 잔액 수동 보정 헤더에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
  - verify: 단위 테스트 11개(모달 6개, 위젯 5개) 통과, Vitest 40개 파일 216개 테스트 통과, Next.js 14 정적 export 빌드 성공.
- [x] 12.2 누적 충전형(INTERVAL_30) 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감(롤백) 및 카드 배지 변경 (2026-10-15)
  - 대상 파일: `src/lib/subscription-sync.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/expense/overdue-planned-modal.tsx`
  - 작업:
    1. 결제 예정일보다 이른 날짜에 결제 확정 시 기존 남은 잔여일수에 연장 일수(`interval_days`, 기본 30일)를 누적 가산하는 계산 로직(`calculateNextIntervalTargetDate`) 및 다음 회차 `PLANNED` 자동 생성 함수(`createNextIntervalSubscriptionExpense`) 구현.
    2. 결제 확정 모달(`ExpenseModal`) 결제 성공 시 `template_id`를 인식하여 조기 결제일 경우 기존 예정일 기준 연장된 다음 회차를 즉시 생성하도록 연동.
    3. 누적 충전형 구독 결제 환불(취소) 시 충전했던 일수만큼 다음 예정 회차(`PLANNED`)의 예정일에서 차감(롤백)하는 함수(`calculateRollbackIntervalTargetDate`, `rollbackIntervalSubscriptionExpense`) 구현 및 지출 상세/환불 모달(`ExpenseDetailModal`) 연동.
    4. 소비 페이지(`/dashboard/expenses`) 정기 구독 카드의 `[누적 충전형 n일]` 옆 잔여일수 배지 텍스트를 `[남은 n일]`에서 `[n일]`로 간결화.
  - verify: 단위 테스트(조기/당일/만료후 결제일 산출, 자동 생성, 환불 시 일수 롤백 차감, 배지 텍스트) 12개 추가 통과, Vitest 40개 파일 229개 테스트 100% 통과, Next.js 14 정적 export 빌드 15개 페이지 성공.
- [x] 12.3 사용자 지정 게임 아이콘 전역 적용, 픽업 과금 차트 다중 색상 및 캘린더 커스텀 배경·글래스모피즘 타일 구현 (2026-10-17 ~ 2026-10-19)
  - 대상 파일: `src/lib/storage-upload.ts`, `src/lib/calendar-bg-storage.ts`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/expenses/page.tsx`
  - 작업:
    1. **사용자 지정 게임 아이콘 전역 적용 및 픽업 차트 다중 팔레트** (`2026-10-17`): `downloadUserIcon` 커스텀 아이콘을 대시보드 달력 타일, 선택일 사이드바, 소비/구독 내역 전반에 기본 아이콘보다 우선 적용하고, 픽업별 과금 분석 그래프 및 순위 리스트에 8색 다중 팔레트(`PICKUP_CHART_PALETTE`) 적용.
    2. **브라우저 로컬 저장소(IndexedDB) 기반 커스텀 배경 보관** (`2026-10-17 ~ 2026-10-18`): `chronoledger_calendar_bg`에 사용자별 이미지 Blob과 설정(`opacity`, `tileOpacity`, `blur`) 영구 보관, 원본 업로드 허용 용량 **50MB(`MAX_BG_FILE_SIZE_BYTES`)** 확대 후 최대 1920×1080 Canvas WebP 리사이징/압축 저장.
    3. **글래스모피즘 타일 및 개별 투명도 조절**: 가독성 보호용 반투명 오버레이(`bg-surface/15`), 날짜 타일 글래스모피즘(`rgb(var(--surface) / tileOpacity)` + `backdrop-blur-[1px]`), **배경 투명도 슬라이더(10%~90%)**, **날짜 타일 투명도 슬라이더(0%~90%)**, 블러 효과 단계(Off/약함/보통) 토글, 날짜/요일/일정 배지 텍스트 그림자(`drop-shadow`) 보강.
    4. **오늘 날짜 황금색(`#EFBF04`) `오늘` 배지 추가** (`2026-10-19`): 달력 타일 내 오늘(`day.isToday`) 날짜 숫자 우측에 황금색 `#EFBF04` 배경의 `오늘` 캡슐 배지(`data-testid="today-badge-..."`) 노출.
  - verify: 대용량(50MB) 이미지 리사이징/압축 및 배경(10~90%)/타일(0~90%) 투명도 클램핑 검증(`calendar-bg-storage.test.ts`), 가독성 오버레이·배경 레이어·타일 투명도·황금색 `오늘` 배지 렌더링 검증(`desktop-calendar.test.tsx`), 설정 컨트롤러 조작 검증(`calendar-bg-customizer.test.tsx`), Vitest 42개 파일 241개 테스트 100% 통과, Next.js 14 정적 export 빌드 성공.
- [x] 12.4 개인 메모 저장 안정화(Update/Insert 분기 및 Unique 제약 보강) (2026-10-19)
  - 대상 파일: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE12_MEMO_FIX.sql`
  - 작업:
    1. 원격 Supabase DB에 `(user_id, target_date)` 복합 유니크 제약이 누락된 경우 `.upsert(..., { onConflict: "user_id,target_date" })` 호출 시 발생하던 `42P10` 에러를 해결하기 위해, 기존 메모 `id` 유무에 따라 명시적 `.update()` 또는 `.insert()`로 분기하고 `23505` 충돌 시 `.update()` 폴백 처리.
    2. 중복 행 자동 정리 및 `uq_personal_memos_user_target_date` 고유 제약 조건을 보강하는 마이그레이션 스크립트(`md/MIGRATION_PHASE12_MEMO_FIX.sql`) 추가.
  - verify: 신규 메모 `.insert()` 및 기존 메모 `.update()` 분기 단위 테스트 통과, Vitest 42개 파일 242개 테스트 100% 통과.
- [x] 12.5 대시보드 요약 카드 진행률 개편, 100% 포인트 할인(방식 A), 사이드바 드롭다운 탭 및 모바일 바텀시트 터치 개선 (2026-10-19)
  - 대상 파일: `src/lib/budget-calculations.ts`, `src/lib/payment-calculations.ts`, `src/components/expense/expense-modal.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/components/calendar/calendar-bg-customizer.tsx`, `src/app/dashboard/page.tsx`
  - 작업:
    1. **요약 카드 진행률 및 잔여 예정 지출 표시**: 당월 예상 지출 대비 확정 지출 비율(`(confirmedExpense / expectedExpense) * 100`)로 진행률 바를 개편하고, 좌측 `진행률 n%`, 우측 잔여 예정 지출(`expectedExpense - confirmedExpense`)원 표시 (`calculateConfirmedExpense` 함수 추가).
    2. **100% 포인트 할인 허용(방식 A) 및 플랫폼별 포인트 지갑 강제 동기화**: `할인 (원)`을 총 원화 할인액, `사용 포인트 (P)`를 차감 포인트 수량으로 취급하여 정가 100% 할인(실결제액 0원) 결제를 허용하고, 결제 플랫폼(`GOOGLE_PLAY`/`GALAXY_STORE`)과 포인트 지갑을 1:1 고정(`disabled`) 동기화하며 `OTHER` 선택 시 포인트 입력을 비활성화.
    3. **사이드바 카드 배치 순서 및 선택일 드롭다운 탭 추가**: 사이드바 순서를 `요약` $\to$ `선택일 상세` $\to$ `스토어 포인트`로 재배치하고, 선택일 상세 카드 내 `[게임 일정 | 지출 내역 | 메모]` 드롭다운 선택기를 추가하여 선택한 섹션만 깔끔하게 노출.
    4. **모바일 바텀시트(`MobileDrawer`) 메모 작성/저장 터치 버그 해결 및 배경 설정기 모바일 반응형 개선**: Vaul 드래그 가로채기 방지를 위해 `data-vaul-no-drag` 속성과 `onPointerDown`/`onMouseDown` 포커스 유지 가드를 적용하고, `CalendarBgCustomizer` 팝오버 폭(`max-w-[calc(100vw-2rem)]`) 및 슬라이더 터치 영역을 개선.
  - verify: 단위 테스트(`budget-calculations.test.ts`, `payment-calculations.test.ts`, `expense-modal.test.tsx`, `hero-sidebar.test.tsx`, `dashboard/page.test.tsx`) 전체 갱신 및 추가 검증 완료, `npx tsc --noEmit` 0 에러, Vitest 42개 파일 / 247개 테스트 100% 통과, `npm run build` 정적 15개 페이지 빌드 성공.
- [x] 12.6 모바일 초소형 뷰포트(360px 이하) 타일·배지 세부 최적화 및 바텀시트 즉시 연동 (2026-10-19)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/calendar-game-filter.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`
  - 작업:
    1. **모바일 일정 유형별 컬러 도트 분리 표시**: 모바일(`< md`) 달력 타일 우측 상단에 게임 일정 시작일(`is_start_date`)을 유형별 색상 점(`VERSION` 초록 `bg-success`, `PICKUP` 파랑 `bg-primary`, `CONTENTS` 보라 `bg-purple-500`)과 메모 회색 점(`bg-content-muted`)으로 나란히 분리 표시하고 360px 이하 초소형 타일 간격(`gap-0.5 sm:gap-1`) 최적화.
    2. **모바일 당일(Today) 타일 금색 테두리 강조 및 데스크톱 전용 배지 처리**: 360px 이하 초소형 화면에서 두 자리 날짜 숫자와 `'오늘'` 글자 배지 및 도트가 겹치는 현상을 방지하기 위해 모바일(`< md`)에서는 오늘 타일 테두리만 금색(`#EFBF04`, `max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`)으로 강조하고, `'오늘'` 텍스트 배지는 데스크톱(`hidden md:inline-flex`)에서만 표시.
    3. **모바일 달력 날짜 타일 터치 시 바텀시트(`MobileDrawer`) 즉시 오픈**: 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일을 터치/클릭하면 해당 날짜 선택과 동시에 `'선택일 상세'` 바텀시트(`MobileDrawer`)가 즉시 열리도록 `open`/`onOpenChange` 제어 상태 연동(하단 `'선택일 상세'` 버튼도 함께 유지).
    4. **초소형 뷰포트 팝오버 가로 넘침 방지**: `CalendarGameFilter` 드롭다운 팝오버에 `max-w-[calc(100vw-2rem)]`을 적용하여 320px~360px 화면에서 좌우 넘침 차단.
  - verify: 모바일 일정 유형별 도트/오늘 금색 테두리/데스크톱 전용 배지 단위 테스트(`desktop-calendar.test.tsx`) 및 모바일(360px) 날짜 타일 클릭 시 바텀시트 오픈 테스트(`dashboard/page.test.tsx`) 통과, Vitest 42개 파일 252개 테스트 100% 통과, Next.js 14 정적 export 빌드 성공. *(남은 실기기 점검은 Phase 7.4 Android PWA 실기기 검증과 함께 수행)*
- [x] 12.7 관리자 공식 일정 목록 만료 일정(`end_date < today`) 표시 제외 및 필터링 강화 (2026-10-19)
  - 대상 파일: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`
  - 작업:
    1. `fetchSchedules`에서 `getKstToday`로 KST 오늘 날짜를 구하고 Supabase 조회에 `.gte("end_date", today)` 필터 적용.
    2. 응답 데이터에 대해 클라이언트 측 `.filter((s) => s.end_date >= today)` 방어 로직을 적용하여 공식 일정 목록, 탭 배지 카운트, 게임 필터 카운트, 페이지네이션에서 만료된 일정 제외.
    3. `src/app/admin/page.test.tsx`에 `gte` 모의 메서드 지원 및 만료 일정 제외/카운트 단위 테스트 추가.
  - verify: `src/app/admin/page.test.tsx` 단위 테스트(12개) 통과, `npx tsc --noEmit` 0 에러, Vitest 42개 파일 253개 테스트 100% 통과.
- [x] 12.8 관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달 구현 (2026-10-19)
  - 대상 파일: `src/app/admin/page.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/page.test.tsx`
  - 작업:
    1. **중복 네비게이션 배너 정리**: `AdminLayout` 상단 헤더 탭([일정 관리] / [요청 관리])과의 중복을 해소하기 위해 `/admin` 및 `/admin/requests` 본문 상단 배너 박스(데이터 제안 대기열/관리자 콘솔 바로가기) 제거.
    2. **[지난 일정] 조회 및 관리 모달(`Dialog`) 신설**: 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘)을 추가하고, 클릭 시 Supabase `.lt("end_date", today)` 쿼리로 만료된 과거 일정 목록 로드.
    3. **다이얼로그 내 탐색 및 관리 연동**: 게임별 필터링, 검색, 8개 단위 페이지네이션(`PAST_SCHEDULES_PER_PAGE = 8`) 지원 및 카드별 [수정]·[삭제] 버튼을 기존 수정 폼 모달 및 삭제 확인 모달과 안전하게 연동(`returnToPastModal` 플래그로 완료/취소 시 지난 일정 모달 복귀 및 목록 자동 갱신).
    4. **테스트 및 검증**: `src/app/admin/page.test.tsx`에 `lt` 쿼리 모킹 및 지난 일정 모달 오픈/필터링/수정/삭제 단위 테스트 추가.
  - verify: `src/app/admin/page.test.tsx` 15개 단위 테스트 통과, Vitest 42개 파일 / 256개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.
- [x] 12.9 Google OAuth 로그인 버튼 디자인 개선 및 OAuth 콜백 화면 디자인 시스템 통일 (2026-10-19 ~ 2026-10-20)
  - 대상 파일: `src/app/auth/page.tsx`, `src/app/auth/callback/page.tsx`, `src/app/auth/page.test.tsx`, `src/app/auth/callback/page.test.tsx`
  - 작업:
    1. **Google OAuth 로그인 버튼 디자인 및 UI 피드백 개선**: Google 공식 브랜드 가이드라인에 부합하는 4색(Blue, Green, Yellow, Red) 'G' 멀티컬러 SVG 아이콘 적용, 로그인 진행 시 회전 스피너(`Loader2 animate-spin`) 및 `"Google 연결 중..."` 텍스트 노출과 `disabled` 처리로 중복 클릭 방지.
    2. **OAuth 콜백 화면 디자인 시스템 통일 및 카드 레이아웃 개선**: `/auth/callback` 페이지를 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`, `text-content`) 및 `Card` 중앙 레이아웃으로 일원화. "ChronoLedger" 브랜드 타이틀/서브카피, `Loader2` 회전 스피너, 진행 상태 문구(`role="status"`, "Google 인증을 확인하고 있습니다..."), 에러 발생 시 경고 카드(`role="alert"`, `AlertCircle`) 및 [로그인 화면으로 돌아가기] 버튼 제공.
  - verify: 단위 테스트 보강 (`auth/page.test.tsx`, `auth/callback/page.test.tsx`), Vitest 42개 파일 / 260개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.
- [x] 12.10 모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선 (2026-10-20)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/desktop-calendar.test.tsx`
  - 작업: 모바일 달력 타일 우측 상단 도트 컨테이너 클래스를 기존 가로 정렬(`flex md:hidden items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5`)에서 데스크톱과 일치하는 세로 정렬(`flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`)로 변경하여 버전/픽업/콘텐츠/메모 도트가 우측 상단에 수직으로 깔끔하게 나열되도록 설정.
  - verify: 모바일 도트 컨테이너 클래스(`flex-col`, `items-end`, `gap-1`) 단위 테스트 보강(`desktop-calendar.test.tsx`), Vitest 42개 파일 260개 테스트 100% PASS, Next.js 14 정적 빌드(`npm run build`) 성공.
- [x] 12.11 모바일 화면 UI 오버플로우 해결 (수동 보정 내역 모달, 관리자 페이지네이션, 소비 페이지 픽업 과금 분석 카드) (2026-10-26)
  - 대상 파일: `src/components/ui/dialog.tsx`, `src/components/wallet/store-wallet-adjust-history-modal.tsx`, `src/app/admin/page.tsx`, `src/app/dashboard/expenses/page.tsx`
  - 작업:
    1. **모달(`DialogContent` & `StoreWalletAdjustHistoryModal`) 모바일 화면 이탈 해결**:
       - `DialogContent`의 grid 직계 자식 `min-width: auto` 팽창 방지를 위해 `grid-cols-1 overflow-x-hidden p-4 sm:p-6` 적용.
       - `StoreWalletAdjustHistoryModal`의 `DialogContent`에 `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강, 헤더 텍스트 래퍼에 `pr-7 min-w-0` 및 `break-words` 적용으로 우측 상단 닫기(`X`) 버튼 겹침 방지.
       - 플랫폼 필터 바 컨테이너를 `flex-wrap min-w-0`으로 변경하여 모바일에서 '네이버페이' 버튼 잘림 해결.
       - 내역 리스트 영역과 개별 레코드 카드에 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 영역 `shrink-0` 적용.
    2. **관리자 페이지(`/admin`) 공식 일정 및 게임 목록 페이지네이션 반응형 개선**:
       - 페이지네이션 래퍼를 `flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 max-w-full`로 변경.
       - 페이지 번호 버튼 컨테이너를 `flex flex-wrap items-center justify-center gap-1`로 변경하고, 번호 버튼 크기를 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼을 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs`로 최적화.
    3. **소비 페이지(`/dashboard/expenses`) 픽업별 과금 분석 & 순위 카드 반응형 개선**:
       - 페이지 최상위 컨테이너에 `w-full overflow-x-hidden` 추가로 모바일 가로 스크롤/쏠림 원천 차단.
       - `게임 픽업별 과금 분석` 카드 내부 좌측 차트 영역(`lg:col-span-7`) 및 우측 순위 카드 영역(`lg:col-span-5`)에 `min-w-0 w-full overflow-hidden` 적용.
       - 픽업 순위 리스트 행 좌측 영역을 `flex items-center gap-2 min-w-0 flex-1 overflow-hidden`으로 수정하여 긴 픽업 이름과 `동시 픽업` 배지가 카드 우측을 밀어내지 않고 말줄임(`truncate`)되도록 보완.
       - 지출 내역 및 구독 탭 하단 페이지네이션 컨테이너에 `flex-wrap justify-center` 추가.
  - verify: 단위 테스트(`store-wallet-adjust-history-modal.test.tsx`, `dashboard/expenses/page.test.tsx`) 통과.

- [x] 12.12 구글 플레이 포인트 적립 누락 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계 (2026-10-26)
  - 대상 파일: `src/lib/payment-calculations.ts`, `src/lib/payment-calculations.test.ts`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `sql/SCHEMA.sql`, `sql/MIGRATION_STORE_EVENT_EARN.sql`
  - 작업:
    1. **포인트 미사용 결제 시 스토어 포인트 적립 누락 버그 해결**: `ExpenseModal`에서 `usedPoints === 0`일 때도 `pointPlatform: activePointPlatform`을 정상 전달하여 `process_expense_payment` RPC 적립 누락 차단. 예정 지출 등록/수정 시 `point_platform` 보존 및 모달 재오픈 복원 연동.
    2. **구글 플레이 부스트 고정 적립률(`0.1% × n배`) 재설계**: 등급 무관 기본 1,000원당 `n`P(`0.1% × n배`)로 고정 계산하도록 `calculateStoreEventEarn` 수식 재설계 및 안내 UI 문구 명확화.
    3. **스토어 지갑 미생성 안전망 보강**: `process_expense_payment` RPC에서 스토어 지갑 미생성 시 기본 등급(`BRONZE` / `GENERAL`)으로 자동 생성(`ON CONFLICT DO NOTHING`) 후 적립 처리.
    4. **단위 테스트 및 빌드 검증**: 변경 수식 및 모달 전달 파라미터 단위 테스트 보강.
  - verify: Vitest 42개 파일 262개 테스트 통과, 정적 빌드(`npm run build`) 성공 (커밋 `7307b99`, Gemini 4 Argon 코드 리뷰 통과).

- [x] 12.13 게임별 상시 메모 기능 추가 (/dashboard/games 구독 게임 카드 연동 및 user_games.memo 확장) (2026-10-27)
  - 대상 파일: `sql/SCHEMA.sql`, `sql/MIGRATION_USER_GAME_MEMO.sql`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업:
    1. **DB 스키마 확장 및 마이그레이션**: `user_games` 테이블에 `memo TEXT` 컬럼 추가 (`sql/MIGRATION_USER_GAME_MEMO.sql` 및 `sql/SCHEMA.sql` 반영).
    2. **구독 게임 상시 메모 다이얼로그(`Dialog`) UI 구현 및 카드 높이 균일화**: `UserGameRow`에 `memo` 필드 추가, 상시 메모 작성/수정 방식을 `[일정 보기]`와 일관된 중앙 팝업 다이얼로그로 개편(`h-56` 세로 스크롤 `Textarea`), 카드 내부 메모 영역 `h-20 overflow-y-auto` 적용으로 그리드 카드 높이 균일 유지, `trim` 후 빈 문자열은 `null` 저장, 본인 소유(`eq("id", ug.id).eq("user_id", user.id)`) 안전 갱신 및 로컬 상태 동기화.
    3. **모바일 반응형 보강**: 구독 게임 목록 하단 페이지네이션에 `flex-wrap justify-center` 적용.
    4. **단위 테스트 보강**: 상시 메모 표시, 신규 작성 및 trim 저장, 비우기(null) 저장, 취소 시 미호출, 저장 실패 시 안내 및 편집 유지 등 5개 단위 테스트 케이스 추가.
  - verify: Vitest 42개 파일 267개 테스트 100% 통과, 정적 빌드(`npm run build`) 성공 (커밋 `53fbd26`, `d75310d`, Gemini 4 Argon 코드 리뷰 통과).

- [x] 12.14 모바일 캘린더 배경 커스터마이징 팝오버 화면 이탈 해결 및 모바일 배경 이미지 리사이징 최적화 (2026-10-28, `f272bfd`)
  - 대상 파일: `src/components/calendar/calendar-bg-customizer.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/lib/calendar-bg-storage.ts`
  - 작업:
    1. 모바일에서 캘린더 헤더 줄바꿈(flex-wrap) 시 좌측 끝에 위치한 [배경 설정] 버튼의 팝오버(absolute right-0)가 화면 좌측 바깥으로 잘리는(overflow-hidden 클리핑) 문제를 해결 (모바일 좌측 기준 정렬 left-0 sm:left-auto sm:right-0 또는 모바일 중앙 모달/고정 위치 적용).
    2. 현재 데스크톱 가로형 고정 해상도(1920×1080)로만 동작하는 compressCalendarBgImage / calculateScaledDimensions 리사이징 로직을 점검하여, 모바일 뷰포트 및 세로형 이미지 비율에 맞춘 리사이징·표시 최적화 적용.
  - verify: 모바일(360px~412px) 및 데스크톱 뷰포트에서 배경 설정 패널 위치·리사이징 단위 테스트 통과.
  - 결과: 팝오버 `left-0 sm:left-auto sm:right-0` 적용, `calculateScaledDimensions`가 세로형 이미지는 1080×1920 상자로 축소(예: 1080×1920 원본 유지, 1440×3200 → 864×1920). 팝오버 정렬·리사이징 단위 테스트 추가. 실기기 시각 확인은 미수행.

- [x] 12.15 Supabase SQL Editor 실행용 SQL 문서(sql/*.sql) 분류 및 통합·정리 (`완료` - 커밋 `cee2b76`, Claude Opus)
  - 대상 파일: `sql/*.sql` (현재 `SCHEMA.sql`, `MIGRATION_*.sql` 등 16개 파일), `supabase/migrations/`
  - 작업: SQL Editor 입력을 위해 생성했던 산재된 마이그레이션·패치·시드·더미·테스트 SQL 문서들을 역할별(① 최신 통합 마스터 스키마, ② 미적용/운영 마이그레이션, ③ 시드·더미·스모크 테스트, ④ 아카이브)로 분류·통합하고 실행 순서 가이드를 정리.
  - verify: 통합된 SQL 스크립트의 문법·멱등성 점검 및 문서 참조 경로 동기화.
  - 결과: `sql/{migrations,seed,tests,archive}/` 분류, [`sql/README.md`](../sql/README.md) 작성. PGlite 빈 DB에서 SCHEMA 적용·migrations 2회 멱등·seed PASS. SCHEMA 신규 설치 결함 3건 수정. `supabase/migrations/`는 CLI 이력 때문에 유지.
- [x] 12.15-F1 `sql/tests/TESTS.sql` WAL-01 이후 단언을 현행 결제/적립 RPC에 맞게 갱신 (`완료` - 커밋 `cb0b92c`, Claude Opus. 구독 템플릿 직접 DELETE 정책 제거 포함)
- [x] 12.15-F2-a 운영 Supabase SQL Editor에서 sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql 실행 완료 (2026-10-29 사용자 실행 완료)
- [x] 12.15-F2-b src/types/database.types.ts를 최신 sql/SCHEMA.sql 테이블(user_games.memo, subscription_templates) 및 11개 인자 process_expense_payment 등 전체 RPC 시그니처에 맞게 동기화 (담당: Claude Sonnet) (`완료` - 커밋 `38d3f71`, Claude Opus 통합 리뷰 PASS)
- [x] 12.15-F2-c 원격 DB 정합성 점검: `sql/README.md` B표 확인 쿼리 실행(특히 9개 인자 `process_expense_payment` 잔존 여부) 및 전용 테스트 프로젝트에서 `TESTS.sql` 실행 확인 (사용자 수동) (`완료` - 2026-11-02)
  - 결과: `process_expense_payment` 11개 인자·`update_confirmed_expense_metadata` 5개 인자, pg_cron 작업·`user_games.memo`·`public.users`·가입 트리거 2종 정상, 템플릿 직접 DELETE 정책 0. 운영에 누락돼 있던 `uq_personal_memos_user_date`는 `MIGRATION_MEMO_UNIQUE.sql`로 적용, 구 PHASE9 `game_schedules` 정책 1건 DROP. 신규 테스트 프로젝트(`SCHEMA.sql` 설치)에서 `TESTS.sql` 최종 PASS.
- [x] 12.15-F3 `database.types.ts` 리뷰 P3 후속: SQL DEFAULT/nullable 인자 타입을 보정하고 `createClient<Database>`를 연결해 타입 불일치를 검출한다 (`완료` - 커밋 `c075045f`, GPT Codex; Gemini 4 Argon 통합 리뷰 `7243c3b` PASS).
  - `SCHEMA.sql` 기준 필수 인자(`admin_create_game.p_default_icon_url`, `approve_game_request.p_default_icon_url`, `set_user_finance_settings.p_default_budget`)는 필수로 유지하고, `process_expense_payment`, `update_confirmed_expense_metadata`, `reject_game_request`, `reject_schedule_request`, `update_store_wallet_settings`, `adjust_wallet_balance`의 nullable/optional 인자와 `game_schedules`·`game_requests`·`schedule_requests` 리터럴 유니온 타입을 스키마·호출부와 정렬했다.
  - Supabase client에 `Database` 제네릭을 연결하고 노출된 호출부 타입 불일치를 정리했다. `tsc --noEmit`, 전체 Vitest(44파일 302테스트) 및 ESLint 통과; 통합 리뷰(`7243c3b`) 및 `main` 병합 완료.

- [x] 12.16 공식 일정 보기에서 "/" 구분자 입력 시 자동 줄바꿈 표시 (2026-10-28)
  - 대상 파일: `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`
  - 작업: 게임 페이지([일정 보기] 공식 일정 중앙 팝업 다이얼로그)에서 `sch.title` 및 `sch.memo`에 "/"가 포함된 경우 `split("/").map(part => part.trim()).filter(Boolean)`으로 분리하여 각 줄 단위 블록(`span className="block"`)으로 줄바꿈 렌더링하도록 개선.
  - verify: `src/app/dashboard/games/page.test.tsx` 단위 테스트 통과 (13개 테스트 PASS).

- [x] 12.17 모바일 PWA 설치 시 홈 화면 및 Android WebAPK 앱 표시 이름 `ChroLog` 단축 및 SW v5 갱신 (2026-10-28 ~ 2026-10-29)
  - 대상 파일: `public/manifest.json`, `public/sw.js`, `src/app/layout.tsx`, `src/components/pwa/sw.test.ts`
  - 작업: 모바일 Chrome 및 Android WebAPK 설치 창/홈 화면에서 `ChronoLedger`가 `ChronoLe...`로 끊어지는 문제를 원천 해결하기 위해 `manifest.json`의 `name`과 `short_name`을 모두 `"ChroLog"`로 동기화하고 `description`은 `"ChronoLedger - 게임 일정 및 지출 관리 매니저"`로 보완. `layout.tsx`의 `appleWebApp.title`도 `"ChroLog"` 유지. 모바일 브라우저의 서비스 워커 및 캐시된 `manifest.json`을 강제 갱신하기 위해 `public/sw.js`의 `SHELL_CACHE` 버전을 `"chronoledger-shell-v5"`로 증가.
  - verify: `src/components/pwa/sw.test.ts` 단위 테스트(SHELL_CACHE v5 및 manifest name/short_name 단언) 추가 및 통과, 정적 빌드(`npm run build`) 통과.

- [x] 12.18 모바일 대시보드(`/dashboard`) 선택일 상세 드로어(`MobileDrawer`) 오픈 시 스마트폰 내장 뒤로 가기 연동 (2026-10-28, `f272bfd`)
  - 대상 파일: `src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/mobile-drawer.test.tsx`
  - 작업: 모바일 환경에서 선택일 상세 드로어(`MobileDrawer`)가 열린 상태에서 스마트폰 내장(하드웨어/제스처) 뒤로 가기 실행 시, 이전 페이지(소비, 게임, 관리자 등)로 라우트가 이탈하지 않고 선택일 상세 드로어만 닫혀 달력 타일 화면으로 돌아가도록 브라우저 History API(`window.history.pushState` 및 `popstate` 이벤트) 연동. 사용자가 드로어를 딤 클릭/스와이프로 직접 닫을 때는 푸시된 히스토리 엔트리를 정리(`history.back()`)하여 히스토리 정합성 보장.
  - verify: 드로어 오픈 후 `popstate` 발생 시 페이지 이동 없이 드로어 닫힘 동작 단위 테스트 통과.
  - 결과: `mobile-drawer.tsx`에 `useDrawerHistory` 훅 추가(`dashboard/page.tsx` 변경 불필요). Next.js App Router `history.state`(`__NA`) 보존, 직접 닫기 시 `history.back()` 후 popstate 1회 무시, back 처리 중 재오픈 시 popstate 도착 후 push. 단위 테스트 5건 추가. 실기기 Android 뒤로 가기 확인은 미수행.

- [x] 12.19 소비 페이지(`/dashboard/expenses`) 카테고리별 지출 비중 클릭 시 카드 내부 하단에 해당 카테고리 확정 지출 내역 펼침 표시 (`완료` - 커밋 `dd01401`, Claude Sonnet)
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`
  - 작업 (구체화 확정안):
    1. **클릭 및 토글 인터랙션**: `[카테고리별 지출 비중]` 카드 내 원그래프 조각(`Pie` `Cell`) 또는 하단 `["카테고리 이름" n%]` 범례 버튼을 클릭하면 `selectedCategory` 상태가 활성화되며, 선택된 카테고리를 재클릭하거나 닫기 버튼을 누르면 펼쳐진 목록이 접힘(토글).
    2. **카드 내부 하단 아코디언 리스트 표시**: `[카테고리별 지출 비중]` 카드 내부 하단(`["카테고리 이름" n%]` 그리드 아래)에 선택된 카테고리의 지출 내역 리스트 섹션을 즉시 펼쳐서 표시 (카테고리명, 총 건수·합계 금액 헤더, 닫기 버튼, 내부 스크롤 리스트 `max-h-60 overflow-y-auto`, 개별 항목 클릭 시 `ExpenseDetailModal` 상세 모달 연동).
    3. **집계 기준 일치**: 원그래프 통계 집계 기준과 동일하게 최근/과거 7일 구분 없이 **`status === "CONFIRMED"`(확정 지출)** 상태인 해당 카테고리 내역만 최신순(`target_date` 내림차순)으로 모아 표시.
  - verify: 원그래프/범례 버튼 클릭 시 카드 내부 하단에 해당 카테고리의 `CONFIRMED` 지출 내역만 펼쳐지고 재클릭 시 닫히는 단위 테스트 통과.
  - 결과: `selectedCategory` 상태 관리, 원그래프 조각 및 범례 클릭 토글, 카드 내부 하단 아코디언 내역(헤더 건수/합계/닫기, `max-h-60` 스크롤, `CONFIRMED`만 `target_date` 내림차순), `ExpenseDetailModal` 연동 완료. 접근성(`aria-pressed`, `aria-label`) 적용 및 신규 단위 테스트 2건 추가(`dashboard/expenses/page.test.tsx`, 전체 270개 테스트 통과).

- [x] 12.20 대시보드 홈(`/dashboard`) 선택일 게임 일정 표시 조건(`start_date`/`end_date` 일치) 및 전체 진행 일정 토글 + 정렬 변경
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/hero-sidebar.test.tsx`
  - 작업 (세부 확정 사양):
    1. **기본 표시 조건 (토글 OFF)**:
       - `VERSION` 일정: `s.start_date === selectedDateLabel`일 때만 표시 (`end_date`에는 표시하지 않음).
       - 그 외 일정(`PICKUP`, `CONTENTS` 등): `s.start_date === selectedDateLabel || s.end_date === selectedDateLabel` (선택일과 시작일 또는 종료일이 일치하는 일정)만 표시.
    2. **진행 중 전체 보기 토글 (토글 ON)**:
       - 선택일 상세 카드 내 `게임 일정` 탭 상단에 토글 버튼을 추가하고, 활성화 시 `VERSION` 일정을 포함한 모든 일정(`VERSION`, `PICKUP`, `CONTENTS`)에 대해 `s.start_date <= selectedDateLabel && selectedDateLabel <= s.end_date`인 진행 중 일정을 모두 표시.
    3. **정렬 기준 변경**:
       - 기본 1차 정렬을 `start_date` **내림차순**(`b.start_date.localeCompare(a.start_date)`)으로 변경하고, 동일 `start_date` 내에서는 `end_date` **오름차순**(`a.end_date.localeCompare(b.end_date)`)으로 정렬.
  - verify: `src/components/calendar/hero-sidebar.test.tsx`에 기본 표시(`VERSION` 시작일만, 타 일정 시작/종료일만), 토글 활성화 시 `VERSION` 포함 전체 진행 일정 표시, `start_date DESC` + 동일 시작일 `end_date ASC` 정렬 단위 테스트 통과.

- [x] 12.21 소비 페이지 `게임 픽업별 과금 분석`을 `게임 카테고리별(게임별) 과금 분석`으로 변경 및 픽업 배너 연결 제거(경량화)
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `src/components/expense/expense-modal.test.tsx`
  - 작업 (세부 확정 사양):
    1. **지출 모달(`expense-modal.tsx`) 픽업 배너 연결 제거 및 버전 일정 유지**:
       - `연결된 버전 일정` 및 `버전 패스형(버전 종료일까지 결제 유예)` 기능은 그대로 유지.
       - `연결된 픽업 일정` UI 및 픽업 배너 연결 관련 상태·로직(`pickupSchedules`, `pickupScheduleId`, `manualPickupId`, `availablePickups`, `versionPickups`, `ALL_CURRENT`, `[PICKUPS:...]` 메모 태그 합성 등)을 전면 제거하고 `pickup_schedule_id`는 `null`로 처리(DB 스키마 하위 호환 유지).
       - `expense-detail-modal.tsx`에서도 `pickupTitle` 표시 줄 제거.
    2. **소비 페이지(`expenses/page.tsx`) `게임별 과금 분석` 전환 및 쿼리 경량화**:
       - 기존 `게임 픽업별 과금 분석` 카드를 `게임별 과금 분석`(게임 카테고리 과금 통계)으로 변경하여, `status === "CONFIRMED"`이고 `category === "게임"`인 확정 지출을 게임별(`game_id` / `games.name`, 미지정 시 `'미지정(기타)'`)로 합산·내림차순 정렬해 가로 막대 차트 및 과금 순위·비중 카드로 표시.
       - 불필요해진 `loadSchedules()`(`game_schedules` 조회), `schedulesMap`, `getExpensePickupIds` 로직을 제거하여 초기 로딩 경량화.
  - verify: 지출 모달 및 소비 페이지 단위 테스트(`expense-modal.test.tsx`, `expenses/page.test.tsx`) 갱신 및 100% 통과.

- [x] 12.22 AI 전용 지침 문서 영문화(토큰 절감) 및 한국어 원본(`*-ko.md`) `docs/archive/agent-rules-ko/` 분리 보관 (`완료` - 커밋 `de71051`, Gemini 3.8 Flash)
  - 대상 파일: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.agents/rules/*.md` (5종), `.agents/skills/*/SKILL.md` (4종), `docs/archive/agent-rules-ko/*-ko.md`
  - 작업 (세부 확정 사양):
    1. **한국어 원본 아카이빙**: 에이전트 자동 스캔 경로(`.agents/`) 바깥인 `docs/archive/agent-rules-ko/` 폴더를 생성하고, 기존 한국어 지침 문서 8종의 원본을 `*-ko.md` 이름으로 일괄 보관하여 중복 로드를 원천 차단 (`README.md` 작성).
    2. **AI 전용 지침 영문 재작성**: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.agents/rules/*.md`, `.agents/skills/*/SKILL.md`를 의미 손실 없이 간결한 영문(English)으로 작성하여 매 턴 시스템 프롬프트 토큰 소모량을 절감.
    3. **사용자 소통 및 운영 문서 한국어 유지**: `.agents/rules/language.md`에 사용자 대면 응답·보고 및 `ask_question` 질의/선택지는 반드시 한국어(`Korean`)로 작성하도록 명시하고, 사용자가 직접 열람하는 `docs/` 운영 문서(`handoff.md`, `to-do.md`, `progress.md`, `changelog.md`, `collaboration-guide.md`, `docs/spec/*`)는 한국어를 유지.
  - verify: `docs/archive/agent-rules-ko/` 원본 보존 확인, 영문 지침 링크 및 `markdownlint-cli` 0 errors 통과.
  - 결과: `docs/archive/agent-rules-ko/`에 한국어 원본 8종 및 `README.md` 보관, 활성 지침 영문 전환(`CLAUDE.md` 7~11행 un-backticked `@.agents/rules/...` 임포트 준수), `markdownlint-cli` 0건 통과 (커밋 `de71051`).

- [x] 12.23 지출 모달(`expense-modal.tsx`) 예정 지출 수정·결제 시 기존 사용자 메모 보존 및 소비 페이지 잔여 픽업 주석 정리 (R14) (`완료` - 커밋 `d5522dc`, Claude Sonnet, Gemini 4 Argon 통합 리뷰 완료)
  - 대상 파일: `src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/components/expense/expense-modal.test.tsx`
  - 작업 (세부 확정 사양):
    1. `PlannedExpenseInput` 인터페이스에 `memo?: string | null`을 추가하고, `src/app/dashboard/expenses/page.tsx`의 `handleConfirmPlanned`에서 `memo: expense.memo ?? null`을 전달하도록 보강.
    2. `src/components/expense/expense-modal.tsx`의 `handleSubmit` 내 `EDIT_PLAN`(500행) 및 `PAY`(572행)에서 `mergeEventMemo(null, storeEventResult.eventTag)` 대신 기존 메모(`editingExpense?.memo ?? plannedExpense?.memo ?? null`)를 첫 번째 인자로 전달하여 예정 지출 수정·결제 시 기존 사용자 메모가 증발하지 않고 보존(이벤트 태그 활성 시 병합)되도록 수정.
    3. `src/app/dashboard/expenses/page.tsx`에 남아 있는 구 픽업 관련 주석(`// 픽업 통계 관련 상태`, `픽업 랭킹 및 비중 카드`)을 `게임별 과금 통계` 문맥에 맞게 정리.
  - verify: `src/components/expense/expense-modal.test.tsx`에 예정 지출 수정(`EDIT_PLAN`) 및 예정 지출 결제(`PAY`) 시 기존 메모 보존 및 이벤트 태그 병합 단위 테스트 추가 및 통과.
  - 결과: `PlannedExpenseInput.memo` 추가, `handleSubmit`에서 기존 메모(`editingExpense?.memo ?? plannedExpense?.memo ?? null`)를 추출해 `mergeEventMemo`로 전달하여 수정·결제 시 사용자 메모 보존 및 이벤트 태그 병합, `expenses/page.tsx`에서 예정 메모 전달 및 잔여 구 픽업 주석 정리, 단위 테스트 2건 추가 (커밋 `d5522dc`, 전체 271개 테스트 통과).

- [x] 12.24 구독 템플릿 동기화 및 중지 시 PLANNED 삭제 개편 (R15, 커밋 `1bb175b`; Vitest 20개 및 tsc 통과; SQL 스모크 미실행)
  - 대상 파일: `sql/migrations/MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql`, `sql/SCHEMA.sql`, `sql/tests/TESTS.sql`, `docs/spec/SRS.md`, `src/lib/subscription-sync.ts`, `src/lib/subscription-sync.test.ts`, `src/components/expense/expense-modal.tsx`
  - 작업 (세부 확정 사양):
    1. **구독 중지 시 PLANNED 완전 삭제**: 구독 중지(`is_active: true → false`) 시 미결제 `PLANNED` 지출을 완전히 물리 삭제(`DELETE`)하고, 구독 재개(`is_active: true`) 시 수정된 템플릿 정보로 새 `PLANNED` 회차가 깨끗하게 재생성되도록 개선. 기존 `TEMPLATE_DEACTIVATION` 취소 행 정리 마이그레이션(`MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql`) 작성 및 `SCHEMA.sql`, `TESTS.sql`, `docs/spec/SRS.md` 명세 갱신.
    2. **매월 지정일형(`MONTHLY_DAY`) 미래 월 과다 생성 해결**: 대시보드 달력 미래 월(12월, 1월 등) 탐색 시 불필요한 미래 회차가 미리 누적 생성되지 않도록, `MONTHLY_DAY` 템플릿은 언제나 바로 다음 결제 예정 회차 1건만 `PLANNED`로 유지/생성 보장(이미 `PLANNED` 회차가 존재하면 추가 생성 방지, 기존 미래 중복 행 정리). 당월 회차가 결제 확정(`PAY` / `CONFIRMED`)되거나 이미 `CONFIRMED`/`CANCELLED`인 경우 다음 달 회차 1건을 생성.
    3. **버전 패스형(`VERSION_PASS`) 과거 버전 생성 차단**: `game_schedules`에서 `VERSION` 일정 조회 시 `.gte("end_date", today)` 조건을 적용하여 이미 종료된 과거 버전 일정에 대한 `PLANNED` 지출 생성 원천 차단.
  - verify: `src/lib/subscription-sync.test.ts` 단위 테스트 보강 및 통과, 스모크 테스트 정합성 확인.

- [x] 12.25 관리자/게임 모달 정비, 아이콘 자체 WebP Data URL 저장, 비공식 일정 분류 및 설정 토글 (R16, 구현 및 로컬 검증 완료)
  - 대상 파일: `sql/migrations/MIGRATION_UNOFFICIAL_SCHEDULES.sql`, `sql/SCHEMA.sql`, `src/types/database.types.ts`, `src/lib/schedule-preferences.ts`, `src/app/admin/requests/page.tsx`, `src/app/admin/page.tsx`, `src/components/game/game-select-modal.tsx`, `src/components/game/game-modal.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/ui/game-icon.tsx`, `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/page.tsx`
  - 작업 (세부 확정 사양):
    1. **중복 UI 제거 및 미구독 게임 필터**: `/admin/requests`의 `[관리자 직접 게임 추가]` 중복 카드 및 핸들러 삭제. `GameSelectModal`에서 현재 사용자가 이미 구독 중(`user_games`)인 게임을 제외하고 미구독 게임만 표시.
    2. **게임 아이콘 자체 WebP Data URL 변환·저장**: 관리자가 게임 등록/수정 및 게임 요청 승인 시 이미지 파일 업로드 또는 외부 이미지 URL 입력에 대해 `resizeImageToWebP`(256×256 WebP)를 거쳐 자체 `data:image/webp;base64,...` Data URL로 변환해 `games.default_icon_url`에 저장(모바일 핫링크 차단/만료 원천 해결). `GameIcon` 컴포넌트에 외부 URL 로드 실패 시 1회 재시도 안전망 추가.
    3. **비공식 일정 DB 스키마 및 관리자/사용자 기능**: `game_schedules` 및 `schedule_requests`에 `is_official BOOLEAN NOT NULL DEFAULT true`, `public.users`에 `show_unofficial_schedules BOOLEAN NOT NULL DEFAULT false` 컬럼 추가(`MIGRATION_UNOFFICIAL_SCHEDULES.sql`, `SCHEMA.sql`, `database.types.ts`). 관리자 일정 추가/수정 및 일정 요청 모달에서 공식/비공식 여부 분류 지원, 계정 설정 페이지(`/dashboard/settings`)에 `비공식 일정(테스트 서버·유출 등) 표시` 토글 버튼 제공, 대시보드 및 게임 페이지 일정 보기에서 토글 설정에 따른 필터링 및 `[비공식]` 배지 표시.
  - verify: 관련 8개 Vitest 파일의 57개 테스트, `npx tsc --noEmit`, `npm run lint` 통과.
  - [x] 후속: 운영 Supabase SQL Editor에서 `MIGRATION_UNOFFICIAL_SCHEDULES.sql`을 수동 적용하고 설정 토글 및 일정 조회를 확인한다. (`완료` - 2026-11-02 사용자 적용, R27)

- [x] 12.26 소비 차트 Y축 아이콘·포커스 테두리·모바일 툴팁 교정, 월별 통계 드롭다운, 활성 구독 총액, 예산 경고 배지 (R17)
  - 대상 파일: `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `src/app/globals.css`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/hero-sidebar.test.tsx`
  - 작업 (세부 확정 사양):
    1. **게임별 과금 분석 가로 막대 차트 좌측 Y축 아이콘화**: 좌측 Y축 게임 이름 텍스트를 24×24px 게임 아이콘으로 대체하고, 우측 순위 목록에만 게임 이름 텍스트 유지.
    2. **차트 포커스 테두리 제거 및 모바일 툴팁 이탈 교정**: Recharts SVG 포커스 테두리(`outline: none`, `accessibilityLayer={false}`) 제거 및 모바일 터치 시 `<Tooltip>`이 카드 우측 화면 밖으로 벗어나지 않도록 위치·최대 너비·줄바꿈 교정.
    3. **카테고리별 지출 비중 & 게임별 과금 분석 월별 자동 갱신 및 이전 달 드롭다운**: 두 통계 카드 모두 기본값을 현재 KST 연·월(`YYYY-MM`)로 설정하여 매달 자동 갱신되도록 하고, 각 카드 우측 상단에 월 선택 드롭다운(이번 달, 이전 기록이 있는 과거 연·월, 전체 기간)을 추가해 이전 기록 조회 지원.
    4. **활성 정기 구독 템플릿 총액 표시**: `/dashboard/expenses` 정기 구독 탭 상단에 현재 활성(`is_active === true`) 구독 템플릿들의 총액(전체 합산 및 주기별 소계) 요약 표시.
    5. **홈 대시보드 예산 경고 배지**: `hero-sidebar.tsx` 요약 카드의 `예상 지출: n원` 행 우측에 `budgetAmount > 0` 기준 80% 이상 시 주황색 `[주의: 예산 근접]`, 100% 초과 시 빨간색 `[위험: 예산 초과]` 배지 배치.
  - verify: `expenses/page.test.tsx`, `hero-sidebar.test.tsx` 단위 테스트 갱신 및 전체 통과.

- [x] 12.33 나무위키 등 외부 아이콘 URL 등록 CORS 프록시 폴백·클립보드 붙여넣기 및 전역 no-referrer 적용 (R29, 완료 - 커밋 bf3f1a1, GitHub Copilot, Gemini 4 Argon 리뷰 PASS)
  - 대상 파일: `src/lib/image-resizer.ts`, `src/lib/image-resizer.test.ts`, `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `public/_headers`, `src/app/layout.tsx`
  - 작업: 외부 URL 직접 요청 실패 시 10초 제한 wsrv.nl 프록시 폴백(`image/*` 및 5MB 제한), `/admin` 및 `/admin/requests` 클립보드 이미지 붙여넣기(`onPaste`) 및 WebP Data URL 미리보기/변환, `public/_headers` 및 `layout.tsx` 전역 `Referrer-Policy: no-referrer` 설정.
  - verify: 관련 단위 테스트(28개) 및 전체 Vitest 45개 파일/309개 테스트 통과, `tsc --noEmit`, ESLint 통과.
- [x] 12.34 관리자 게임 목록 외부 HTTP(S) URL 아이콘 배지 및 WebP Data URL 재저장 (R30, `12148ea` 구현 + `334c642f` iteration-02 리뷰 수정, admin 테스트 18개 통과; iteration-02 리뷰 clean, `main` 병합 `7956064`)
- [x] 12.35 비로그인 게스트 모드 공식 일정 열람(R41) 및 게임별 일정 보기 모달 `ON AIR` 상단 고정 + `VERSION` 아코디언 트리 개편(R42) (`ba49f13` DB/RLS + `d5b75eb` UI + `29443b4` iteration-02 게스트·로그인 뷰 `ScheduleDialog` 일원화 및 `ScheduleTree` 보강; Vitest 48파일/396개 통과, `main` 병합 `ce4bed2`)
- [x] 12.36 대시보드·게임·소비 페이지 전반의 카드 패딩·섹션 간격·타이포그래피 밀도 개선 (R44, `d5b75eb`, `main` 병합 `ce4bed2`)
- [x] 12.37 대시보드 상단 오늘/이번 주 요약 카드, 사이드바 일정·예정 지출 `D-n`·기간 진행률 바(R32) 및 월간 캘린더 ↔ 주차별 리스트 뷰 토글(R34) 구현 (`ab930c5` + iteration-02 `be57e71`, `main` 병합 `d09ba5c`)
- [x] 12.38 일정 분류 세분화: `PICKUP` 복각 플래그(`is_rerun`) 및 `BROADCAST`(특별방송) 일정 종류 추가 (R33, DB `9e33ac9` + UI `5ce5d22` + iteration-02 `8c64d98`, `main` 병합 `7436a3b`, 운영 마이그레이션 R46 적용 완료)
- [x] 12.39 대시보드 주차별 리스트 게임별 묶음(R48) 및 공용 `ScheduleTypeBadge` `[픽업 [복각]]` 통합·높이 정렬(R49) 구현 (`d51fba8`, Gemini 4 Argon 정적 리뷰 `clean` `696f23f`, Vitest 52파일/430개 통과, `main` 병합 `23d2699`)

---

### 사용자 추가 검토 확정 과제 (2026-11-09 완료 · Run `r13-4-breakthrough-guest-and-schedule-tree` 병합 `ce4bed2`)
- [x] R41 (`Phase 12.35`). 비로그인 게스트 모드 도입: 로그인 없이 `/dashboard` 및 `/dashboard/games` 진입을 허용하여 전체 승인 게임의 공식 일정(`is_official = true`, `anon` SELECT RLS 정책 추가)을 캘린더·게임별 일정 모달에서 열람할 수 있게 하고, 과금·내 게임 구독·캐릭터 메뉴는 로그인 유도 배너/안내를 표시함 (`ba49f13` DB/RLS + `d5b75eb` UI, `main` 병합 `ce4bed2`)
- [x] R42 (`Phase 12.35`). 게임별 일정 보기 모달 구조 개편(`/dashboard/games`): 상단에 현재 진행 중(`ON AIR`) 일정을 고정 노출하고, 하단에 버전(`VERSION`) 일정을 아코디언 헤더(진행 중 버전 기본 펼침)로 묶어 클릭 시 해당 버전 기간에 속하는 픽업(`PICKUP`)·콘텐츠(`CONTENTS`) 상세 일정이 하위 트리 목록으로 펼쳐지도록 개편함(버전 외 일정은 `기타 일정` 그룹 분리; `d5b75eb` 구현 + `29443b4` iteration-02 게스트·로그인 뷰 `ScheduleDialog` 일원화 및 `ScheduleTree` 보강, `main` 병합 `ce4bed2`)
- [x] R43 (`Phase 13.4`). 캐릭터 로스터 UX 개편(`/dashboard/characters` & `/admin`): ① 캐릭터별 텍스트 메모(`memo`) UI 제거, ② 긴 가로형 카드를 아이콘 중심 컴팩트 타일 그리드로 개편, ③ 즐겨찾기(`is_favorite`) 체크 시 금색 테두리(`ring-2 ring-amber-400`) 표시 및 목록 최상단 노출, ④ 관리자가 게임별 최대 돌파 단계(`games.max_breakthrough`, `0~12`, 기본 `6`)를 지정하고 캐릭터 아이콘 클릭 시 보유·즐겨찾기·돌파 단계(`0..max_breakthrough`)·커스텀 아이콘을 설정하며 보유 캐릭터 아이콘 좌하단에 `n★` 배지로 표시함 (`ba49f13` DB/Types + `8ff4f42` UI, `main` 병합 `ce4bed2`)
- [x] R44 (`Phase 12.36`). 대시보드·게임·소비 페이지 전반의 카드 여백·테두리·타이포그래피 밀도 개선으로 한 화면 정보 가독성 향상 (`d5b75eb`, `main` 병합 `ce4bed2`)
- [x] R45. [운영] Supabase SQL Editor에서 `sql/migrations/MIGRATION_R13_4_BREAKTHROUGH_AND_GUEST_RLS.sql` 적용 후 `sql/README.md` B표 확인 쿼리 확인 (사전 조건: `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` 적용 완료, 사용자 수동) (`완료` - 2026-11-09 사용자 적용 확인)
- [x] R46. [운영 · 배포 전 필수] Supabase SQL Editor에서 `sql/migrations/MIGRATION_R33_SCHEDULE_RERUN_AND_BROADCAST.sql` 적용 후 `sql/README.md` B표 확인 쿼리 확인. **반드시 R33 포함 빌드 배포(push) 전에 적용**함 (미적용 배포 시 내 요청 내역 로드 실패·BROADCAST/복각 저장 실패, 사용자 수동) (`완료` - 2026-11-09 사용자 적용·검증 확인)
- [x] R47 (`Phase 12.40`). [완료 · `r36-game-detail-and-r47-followup` (`0e15b18`, 리뷰 `e3a4acc`, `main` 병합 `4ffd901`)] ① `src/components/game/user-requests-card.tsx` `schedule_requests` 조회가 `is_rerun` 컬럼 부재(`42703`/`PGRST204`) 시 해당 컬럼 없이 재조회하도록 폴백 추가(`R33-REV-006`, P3), ② 관리자 일정 폼 복각 토글·`originalIsRerun` 수정 페이로드, `RequestSubmissionModal` EDIT 모드 `is_rerun: false` 분기, R33 마이그레이션 오류 문구, `/dashboard/games` ScheduleTree 배지 테스트 보강(`R33-REV-007`, P4) (담당: Claude Sonnet, Fallback: GitHub Copilot)
- [x] R48 (`Phase 12.39`). [완료 · `weekly-game-group-and-rerun-badge` (`d51fba8`, 리뷰 `696f23f`, `main` 병합 `23d2699`)] 대시보드 주차별 리스트를 주차 카드 안에서 게임별 하위 그룹(아이콘·게임명 헤더, 시작일순 일정, 미연결 `기타`)으로 묶음 (2026-11-09 사용자 피드백, 담당: Claude Sonnet)
- [x] R49 (`Phase 12.39`). [완료 · `weekly-game-group-and-rerun-badge` (`d51fba8`, 리뷰 `696f23f`, `main` 병합 `23d2699`)] 공용 `ScheduleTypeBadge`로 일정 종류·복각 배지를 `[픽업 [복각]]` 형태로 통일하고 복각 칩 높이·기준선 불일치 해소(관리자 목록·게임 ScheduleTree·사이드바·주차 리스트), 사이드바 묶음 키에 복각 여부 포함 (2026-11-09 사용자 피드백)
- [x] R52 (`Phase 13.5`). [완료 · `r52-character-template-and-pickup-avatar` (Step 1 명세 `f1b3298` → Step 2 DB `422f8ab` → Step 3 UI `4ff5295` → iteration-01 리뷰 `7a2b1e5` → Amendment A1 `af39b72` → Step 5 DB `51a686f` → Step 6 UI `634d481` → Step 7 iteration-02 재리뷰 `7f3e6d9` clean, `main` 병합 `8a5b478`)] 게임별 동적 캐릭터 템플릿(`character_label`, `character_rank`, `character_class1·2`) 및 캐릭터 페이지, `is_pickup_only` 기반 픽업 전용 카탈로그/요청 제안/승인과 일정 아바타 표시를 완성함. 관리자 탭 가로 스크롤·요청 제목 통합·주차별 게임 접기 UI, 픽업 전용 입력/승격·요청 제안(`pickup_new_characters`), nullable 아이콘(이니셜 아바타 폴백) 및 구 `pickup_image_url` 제거 검증을 마침 — 명세서 [`docs/spec/R52_Character_Template_and_Pickup_Avatar_Spec.md`](spec/R52_Character_Template_and_Pickup_Avatar_Spec.md).
- [x] R53. [운영 · 배포 전 필수] Supabase SQL Editor에서 [`sql/migrations/MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql`](../sql/migrations/MIGRATION_R52_CHARACTER_TEMPLATE_AND_PICKUP_AVATAR.sql) 적용 후 [`sql/README.md`](../sql/README.md) B표 확인 쿼리 확인 (`완료` - 2026-11-10 사용자 적용 및 5행·4행·`true, false, false` 검증 완료)
- [x] R54. [운영 · 배포 전 필수] Supabase SQL Editor에서 [`sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql`](../sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql) 적용 후 [`sql/README.md`](../sql/README.md) B표 확인 쿼리 3종(`user_favorite_schedules, true, 2` / `false, true, false` / `1, true`) 확인. **반드시 R35 포함 빌드 배포 전에 적용 권장** (미적용 시 `42P01`/`PGRST205` 빈 집합 폴백으로 동작하나 관심 일정 저장 불가, 사용자 수동) (`완료` - 2026-11-10 사용자 적용·검증 확인)


### 경쟁 서비스(픽업지지) 비교 기반 개선 후보 (2026-11-09 등록 · Gemini 4 Argon 리뷰 확정)
- [x] R32. [우선 높음 · 차기 Run 1 (`dashboard-summary-dday-and-week-list`)] 대시보드 상단 오늘/이번 주 요약 카드(오늘 시작·마감 일정 수, 이번 주 예정 지출 합계) 추가 및 사이드바 일정·예정 지출(`PLANNED`) 카드에 종료/결제 `D-n`·기간 진행률 바 표시 (DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot / Gemini 3.8 Flash)
- [x] R33. [우선 높음 · 완료 (`schedule-rerun-and-broadcast`, Step 1 `9e33ac9`·Step 2 `5ce5d22`·iteration-02 `8c64d98`, `main` 병합 `7436a3b`)] R33. [우선 높음 · Step 1 `9e33ac9`·Step 2 `5ce5d22`·iteration-02 `8c64d98` 완료, Step 5 통합 재리뷰 Claude Opus `▶ READY` (`schedule-rerun-and-broadcast`)] 일정 분류 세분화: `PICKUP` 복각 여부 플래그(`is_rerun BOOLEAN NOT NULL DEFAULT false`) 및 `BROADCAST`(특별방송) 일정 종류 추가, `approve_schedule_request` RPC·캘린더 배지·필터·관리자/요청 모달 반영함. Step 5에서 Base/Target 재리뷰·`main` 병합·R46 운영 마이그레이션 체크리스트를 마감함.
- [x] R34. [우선 높음 · 차기 Run 1 (`dashboard-summary-dday-and-week-list`)] 대시보드 주차별 리스트 뷰 토글(월간 캘린더형 ↔ 주차별 리스트형, KST "이번 주" 강조 및 주간 예정/확정 지출 소계 표시, 모바일 가독성 최적화) (DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot / Claude Opus)
- [x] R35 (`Phase 12.42`). [우선 중간 · 완료 · `r35-favorite-schedules-and-r51-followup` (Step 1 DB `865d0a7` → Step 2 UI `13ca8fa` → Step 3 iteration-01 리뷰 `6c913c2` → Step 4 수정 `129a118` → Step 5 iteration-02 리뷰 `e9d9367` → Step 6 수정 `d8f13ba` → Step 7 Gemini 4 Argon iteration-03 교차 리뷰 `clean` 완료)] 관심 일정(즐겨찾기) 저장(`user_favorite_schedules` + 소유자 RLS + 계정 탈퇴 `purge` 연동), "관심 일정만" 필터 및 관심 일정에서 바로 `[+ 예정 지출 추가]` 모달 프리필 연결 (사용자 소유 테이블·RLS 필요 → Opus 승격 조건 ①, 담당: GPT Codex + Claude Sonnet + Claude Opus / Gemini 4 Argon 리뷰)
- [x] R36 (`Phase 12.40`). [우선 중간 · 완료 · `r36-game-detail-and-r47-followup` (`4fdf99a`, 리뷰 `e3a4acc`, `main` 병합 `4ffd901`)] 게임별 일정·과금 통합 상세 뷰(`/dashboard/games` 일정 보기 확장): 진행 중(ON AIR, D-n·진행 바) / 다음 예정 / 지난 일정 기록(최근 6개월) 구분 + 해당 게임 이번 달/누적 확정 과금액·예정 지출·버전별 지출 요약 결합 (Phase 12.21 R11의 픽업 배너 연결 제거 정책과 정합성 유지, 담당: Claude Sonnet, Fallback: GitHub Copilot)
- [x] R38 (`Phase 12.41`). [완료 · `r38-onboarding-and-game-order` (`c1cb27b`, 리뷰 `66c99f4`, `main` 병합 `b8abcc6`)] 신규 가입 첫 진입 시(구독 게임 0개) 게임 일괄 구독 선택 온보딩 모달 자동 표시 및 내 게임 순서 변경(캘린더 아이콘 정렬 반영; `user_games.sort_order` 추가 시 Opus 승격 조건 ① 적용, 담당: GitHub Copilot / Claude Sonnet)
- [x] R51 (`Phase 12.42`). [후속 · 완료 · `r35-favorite-schedules-and-r51-followup` (`13ca8fa`, Step 7 Gemini 4 Argon iteration-03 교차 리뷰 `clean` 완료)] ① `GameOnboardingModal` 일괄 구독을 `upsert(..., { onConflict: "user_id,game_id", ignoreDuplicates: true })`로 바꿔 타 탭·기기 중복 구독 시 전체 실패 방지(`R38-REV-001`, P4), ② 로그아웃·계정 탈퇴 시 `chronoledger:game-order:<userId>`·`chronoledger:game-onboarding-dismissed:<userId>` localStorage 키 정리(`R38-REV-002`, P4) (담당: Claude Sonnet, Fallback: GitHub Copilot)
- [x] R55 (`Phase 12.43`). [후속 · 완료 · `r55-r56-favorite-hook-and-version-pass-trigger` (`daf9a5a`, Gemini 4 Argon 리뷰 `clean`, `main` 병합 `25b3953`) · `R35-REV-003`(P4) 이관] `/dashboard`·`/dashboard/games`에 중복된 관심 일정 조회·토글 로직을 공용 훅(`src/lib/use-favorite-schedules.ts`)으로 추출하고, 같은 일정의 쓰기 진행 중 재클릭을 무시함 (DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot)
- [x] R56 (`Phase 12.43`). [완료 · `r55-r56-favorite-hook-and-version-pass-trigger` (`5a479a5`, Claude Opus 대체 수행, Gemini 4 Argon 리뷰 `clean`, `main` 병합 `25b3953`) · `R35-REV-005`(P4) 이관] `sync_version_expenses_trigger`가 VERSION 날짜 변경 시 연결된 PLANNED 행의 `target_date`를 무조건 시작일로 바꿔 버전 패스 행(`target_date = end_date`)이 비패스로 보이는 문제 수정: 기존 `target_date = end_date`였던 행은 새 `end_date`를 유지하도록 마이그레이션·`SCHEMA.sql`·`TESTS.sql` 반영 (SQL/트리거 변경 → Opus 승격 조건 ①, 담당: GPT Codex + Claude Opus / Gemini 4 Argon 리뷰)
- [x] R58. [운영] Supabase SQL Editor에서 [`sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`](../sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql) 적용 후 [`sql/README.md`](../sql/README.md) B표 확인 쿼리(`SELECT position('R56 version pass' IN pg_get_functiondef('public.sync_version_expenses_trigger()'::regprocedure)) > 0 AS r56_applied;` → `true`) 확인 (사용자 수동) (`완료` - 2026-11-10 사용자 적용·확인 쿼리 `true` 확인)
- [x] R57. [완료 · `r57-character-template-gate-and-validation` (`15c0d14`, 리뷰 `dbf1109`, `main` 병합 `6712a24`)] R57. [진행 중 · 활성 Run (`r57-character-template-gate-and-validation`) Step 1 `▶ READY` (Claude Sonnet) · 2026-11-10 사용자 확인 결함] 관리자 캐릭터 추가 모달의 템플릿 게이트(전체 필터에서 템플릿 없는 게임 선택 시 입력 차단·`[캐릭터 템플릿 생성]` 연결), 템플릿 폼 검증을 DB `is_valid_classification_schema`와 일치(등급 1개 이상 필수·선택지 20개·중복 불가), 축 `key` 입력 제거·자동 비중복 배정, 템플릿 모달 제목·설명 안내, 스키마 CHECK 오류 안내 (DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot / Gemini 3.8 Flash, 리뷰: Gemini 4 Argon)
- [x] R59. [완료 · `main` 직접 수정 `4c849ce` (Base `4697920`), 2026-11-10 사용자 확인 결함] 캐릭터 템플릿 모달 세로 스크롤 복구(`overflow-hidden` 제거) 및 템플릿 흐름의 게임 이름·아이콘 입력 제거·템플릿 컬럼만 저장(상대 경로 아이콘 게임 템플릿 저장 실패 해소)
- [x] R60. [기능 확장 · 완료 · `r60-ai-icon-upscaler` (`38b989d`, 리뷰 `8082c78`, `main` 병합 예정)] PC 데스크톱 환경 한정 저해상도 아이콘 AI 업스케일러 (Waifu2x / ONNX Web) 도입
  - [x] wasm 전용 ONNX Runtime 동적 로딩, PC/WebAssembly·256px 미만 판정, 기존 `resizeImageToWebP` 폴백, 관리자·사용자 요청 흐름의 기본 ON 토글·로딩 상태·중복 제출 방지 구현함.
  - [x] waifu2x cunet/art scale2x 모델과 입력/출력 계약을 `docs/upscaler-model.md`에 기록하고 단위 테스트 추가함.
  - [x] tsc, lint, Vitest 58파일/675개, diff-check, 자리표시자 환경 변수 기반 `npm run build` 통과함.
  - 대상 파일: `src/lib/image-upscaler.ts`, `src/lib/image-resizer.ts`, `src/app/admin/page.tsx`, `src/components/game/schedule-request-modal.tsx` 등
  - 배경:
    - 캐릭터/게임 아이콘 등록 시 원본이 256×256 미만인 저해상도 이미지일 경우 단순 캔버스 Bilinear 확대에 따른 뭉개짐 발생.
    - 모바일 PWA 번들 크기(First Load JS) 및 저사양 모바일 기기의 OOM 리스크를 원천 방지하기 위해 **PC(데스크톱) 환경 한정 + 동적 지연 로딩(Dynamic Import)** 아키텍처 채택.
  - 작업 (주요 요구사항 및 작업 범위):
    1. **동적 모듈 분리 (`src/lib/image-upscaler.ts`)**: `onnxruntime-web` 및 2D 애니메이션 특화 Waifu2x 초경량 ONNX 모델(~2MB, `public/models/waifu2x.onnx`)을 PC 환경 및 저해상도 이미지 입력 시에만 `import()`로 지연 로딩.
    2. **모달 UI 연동 (`src/app/admin/page.tsx` 등)**: 업로드 이미지 가로/세로가 256px 미만인 경우 `[AI 고화질 업스케일 (PC 전용)]` 옵션 노출. PC 환경에서 256px 미만의 저해상도 이미지가 감지되었을 때 해당 옵션은 **기본 활성화(Default Enabled, 기본값 ON)** 상태로 동작하도록 설정(원할 경우 끌 수 있는 토글 스위치는 유지).
    3. **무조건적 안전 폴백(Fallback)**: 모바일 접속, WebGL/WASM 미지원 브라우저, 모델 로드 실패 시 기존 캔버스 리사이저(`resizeImageToWebP`)로 즉시 폴백.
    4. **UI 프리징 방지**: AI 추론 비동기 처리 중 로딩 인디케이터 제공.
  - verify: PC 데스크톱 브라우저에서 256px 미만 이미지 입력 시 Waifu2x ONNX 동적 로딩 및 256×256 고화질 WebP 변환 단위/통합 테스트, 모바일/WASM 미지원 환경 폴백 테스트, 빌드 번들 크기(First Load JS) 영향 없음 확인.
  - 담당 모델: Claude Sonnet (UI/동적 임포트 구현), Fallback: GitHub Copilot / Gemini 3.8 Flash (DB 변경 없음, Opus 승격 조건 비해당).
- [x] R61. [캐릭터·프리셋 UX · 완료 · `main` 병합 `9962a21` · Run `r61-r65-r66-character-admin-quick-fixes` Step 1 `✅ 07e5c89` 구현 완료 (Claude Sonnet), Step 2 리뷰·병합 `▶ READY` (Gemini 4 Argon)] 프리셋 제목 입력란의 예시 `placeholder`("예: 혼돈 전반 파티") 삭제 (`preset-editor-dialog.tsx`, DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot) — 검토 문서 [`docs/character-preset-ux-review.md`](character-preset-ux-review.md) §1
- [x] R62. [캐릭터·프리셋 UX · 완료 · `main` 병합 `e8d9b41` · Run `r62-preset-workspace-desktop` (Step 1 `ffd07b9` Claude Sonnet, Step 2 리뷰 Claude Opus) · 결정: 900px 이상·탭 인라인 편집·저장 버튼] PC 프리셋 탭을 좌측 보유 캐릭터 사이드바 + 우측 프리셋 편집으로 분할하고, 아바타 드래그 또는 슬롯 클릭 → 아바타 클릭으로 특정 슬롯에 배치 (모바일 현행 유지·추후 논의, DB 변경 없음, 결정: 적용 너비 `md`/`lg`, 인라인 편집 vs 넓은 모달, 저장 시점, 담당: Claude Sonnet + Claude Opus 리뷰) — 검토 문서 §2
- [x] R63. [캐릭터·프리셋 UX · 완료 · `main` 병합 `478b137` · Run `r63-character-favorite-sections` (Step 1 `cb5d5be` GitHub Copilot, Step 2 `1781495` Claude Sonnet, Step 3 리뷰 Claude Opus) · 마이그레이션 `MIGRATION_USER_CHARACTER_FAVORITE_ORDER.sql` 운영 적용·검증 완료(사용자, 2026-11-10)] 보유 캐릭터 화면을 즐겨찾기 / 보유 / 미보유 3구역으로 나누고 즐겨찾기 순서를 드래그로 조정 (`favorite_sort_order` 마이그레이션·트리거·RPC·순수 로직 완료, UI·프리셋 선택 목록·통합 리뷰 남음) — 검토 문서 §3
- [x] R65. [캐릭터·프리셋 UX · 완료 · `main` 병합 `9962a21` · Run `r61-r65-r66-character-admin-quick-fixes` Step 1 `✅ 07e5c89` 구현 완료 (Claude Sonnet), Step 2 리뷰·병합 `▶ READY` (Gemini 4 Argon)] 관리자 캐릭터 탭 게임 필터에서 `모든 게임` 제거(기본값 첫 게임), 레어도 필터는 선택한 게임 레어도만 표시 (`src/app/admin/page.tsx`, DB 변경 없음, 담당: Claude Sonnet, Fallback: GitHub Copilot) — 검토 문서 §5
- [x] R66. [캐릭터·프리셋 UX · 완료 · `main` 병합 `9962a21` · Run `r61-r65-r66-character-admin-quick-fixes` Step 1 `✅ 07e5c89` 구현 완료 (Claude Sonnet), Step 2 리뷰·병합 `▶ READY` (Gemini 4 Argon) · 개선 채택: 템플릿 없는 게임에서만 기존 `[+ (명칭) 추가]` 자리에 `[+ 캐릭터 추가]`(픽업 전용 생성) 버튼] 픽업 전용 캐릭터 생성 경로 확인: 관리자 일정(`PICKUP`) 폼의 `[+ 새 픽업 캐릭터]` 또는 사용자 일정 요청 제안 승인으로만 생성되며 캐릭터 탭 직접 생성 버튼 없음 → 채택 시 캐릭터 탭에 템플릿 무관 `[+ 픽업 전용 캐릭터 추가]` 추가 (DB 변경 없음, 담당: Claude Sonnet) — 검토 문서 §6
- [x] R67. [캐릭터·프리셋 UX · 완료 · `main` 직접 수정] 모바일(`md` 900px 미만) 캐릭터 페이지 상단 요청 버튼을 관리자 캐릭터 시스템 명칭 대신 `+ 캐릭터 추가·수정 요청`으로 고정 표시함(PC는 `+ (명칭) 추가·수정 요청` 유지). `RequestSubmissionModal.triggerText`를 `ReactNode`로 확장함 (DB 변경 없음, Claude Opus)
- [x] R68. [캐릭터 UX · 완료 · `main` 직접 수정 `d67921e`] 캐릭터 페이지(보유 목록·프리셋 선택 공용 필터)와 관리자 캐릭터 탭의 캐릭터 이름 검색 입력란 문구를 `검색`으로 통일함(화면 낭독기용 `aria-label="캐릭터 이름 검색"`은 유지, 관리자 일정 폼 픽업 검색란은 범위 밖)
- [x] R69. [일정 UX · 완료 · `main` 직접 수정 `f99e4fb`] 사이드바(단일·묶음 일정)와 게임별 일정 모달 카드의 관심 일정 별 버튼·`+ 예정 지출 추가`를 일정 제목 오른쪽으로 옮겨 카드 줄 수를 줄임(주차별 리스트는 기존부터 오른쪽 배치)
- [x] R70. [일정 UX · 완료 · `main` 직접 수정 `f93ff31`] 주차별 리스트의 각 주차 헤더를 눌러 접기/펼치기, 이번 주만 기본 펼침. 접힌 상태에서도 주간 예정/확정 소계는 헤더에 표시함(게임별 그룹·지출 섹션 기본값은 기존과 동일: 이번 주만 펼침)
- [x] R71. [일정 UX · 완료 · `main` 직접 수정] 픽업 일정 제목 글자가 캐릭터 아바타보다 높게 보이던 문제 보정: 사이드바(인라인 `align-middle`) 제목을 아바타가 있을 때 2px 내리고(`relative top-0.5`), 게임별 일정 창은 첫 줄을 아바타 중심에 맞춤(`pt-1`). 주차별 리스트는 이미 중앙 정렬이라 변경 없음
- [x] R72. [완료 · Run `r64-r72-r73-classification-icons-followups` Step 1 `e17e960`, `main` 병합 `66dd067`] · 후속 · 우선 낮음 · `R66-REV-001`(P4) 이관] `src/lib/pickup-character-registration.ts` 공용 중복 이름 오류 문구에서 '목록에서 선택해 주세요.'를 빼거나 호출부별 안내로 나누고 관련 테스트 2건 갱신 (캐릭터 탭 픽업 전용 추가 대화상자에는 선택할 목록이 없음, DB 변경 없음, 담당: Claude Sonnet)
- [x] R73. [종료 · 손잡이 방식은 사용자 확인 결과 드래그가 원활하지 않아 R76(`@dnd-kit` 그리드 편집)으로 대체함, 2026-11-10] · 후속 · 우선 낮음 · `R62-REV-001`(P4) 이관] 개발 서버에서 PC 프리셋 작업 공간의 실제 드래그(Chromium·Firefox)·900px 경계 전환·키보드(슬롯 선택·Esc)를 확인하고, 보유 캐릭터 화면 즐겨찾기 구역 순서 드래그(`R63-REV-004`)도 함께 확인함. Firefox가 `<button draggable>`(또는 버튼을 감싼 `<li draggable>`)에서 드래그를 시작하지 않으면 드래그 대상을 버튼이 아닌 래퍼(또는 전용 손잡이)로 바꿈 (DB 변경 없음, 담당: Claude Sonnet / 사용자 수동 확인)
- [x] R74. [완료 · 2026-11-10 · Claude Opus · 운영 DB `REVOKE` 적용·권한 확인(`false, true`) 완료(사용자)] [후속 · 우선 낮음 · `R63-REV-001`·`R63-REV-003`(P4) 이관] ① `MIGRATION_USER_CHARACTER_FAVORITE_ORDER.sql`·`SCHEMA.sql`의 `reorder_favorite_characters` 권한 회수를 `FROM PUBLIC, anon`으로 맞춤(마이그레이션은 이미 적용됨 → 파일 수정 후 운영 DB에서 `REVOKE ALL ON FUNCTION public.reorder_favorite_characters(UUID, UUID[]) FROM PUBLIC, anon;` 1줄 추가 실행 필요) ② 미사용 `sortCharactersFavoriteFirst`와 테스트 삭제 (`R63-REV-002` 순서 중복은 수용, 담당: Claude Sonnet / GPT Codex)
- [x] R76. [Run `r76-r77-preset-grid-dnd-and-icon-modal` 완료(`main` 병합 `e5e6140`, 리뷰 수정 `434e6aa`·`8dcfecc`) · R76 마이그레이션 운영 적용·확인 쿼리 완료(사용자, 2026-11-10) · **사용자 남은 작업: Chrome·Firefox·터치 실기기 드래그 확인** · 명세: `docs/spec/R76_Preset_Grid_Editing_Spec.md` · 추가 결정: 빈 프리셋 허용, 프리셋 간 이동, 끌어내기+X 제거, 모바일 빈 슬롯 탭 선택 창 · 캐릭터·프리셋 UX · DB 변경 완료 · 결정 확정: `@dnd-kit` 도입, pickupgg(`https://pickupgg.com/party?game=endfield`)식 전체 프리셋 카드 그리드 편집·즉시 저장, 터치 드래그 지원] 손잡이 없이 아바타·카드 전체를 끄는 드래그(사이드바→슬롯, 슬롯 끼워넣기 정렬, 프리셋 간 이동, 프리셋 카드 순서)와 R63 즐겨찾기 정렬 dnd-kit 전환. R62 저장 버튼·R73 손잡이 방식을 대체함 (담당: Claude Opus 명세·UI → GPT Codex(DB))
- [x] R77. [Run `r76-r77-preset-grid-dnd-and-icon-modal` Step 1 Claude Sonnet `✅ f3fdd91`(`main` 병합 `e5e6140`, 실브라우저 확인 대기) · DB 변경 없음] 관리자 분류 아이콘 `이미지 선택`을 다른 이미지 입력과 같은 등록 모달(URL·붙여넣기·파일, 미리보기, 취소·등록)로 바꾸고 모든 입력을 64×64 WebP로 재인코딩함 (담당: Claude Sonnet)
- [x] R78. [Run `r78-r76-followups-and-browser-check` 완료(`main` 병합 `519ac81`, 리뷰 수정 `e2d1de9`) · **사용자 남은 작업: 미리보기 위치·필터 배치·즐겨찾기 드래그·R77 파일명 초기화 실브라우저 재확인** · 사용자 추가 요청 `f61e90f`·`7c683cc` 포함, 실브라우저 확인 나머지 정상(사용자) · 후속 · 우선 낮음 · `R76-REV-003`(P3)·`R76-REV-004`~`006`(P4) 이관] ① 완료: `sql/tests/TESTS.sql` R76 블록에 명세 §4.5 누락 시나리오 추가함(리뷰 수정 `e2d1de9`). ② 완료: R77 모달에서 URL 입력·붙여넣기 시 파일 입력 표시값 초기화 ③ 완료: 명세 §10·`docs/architecture.md`에 `use-board-sensors.ts` 반영 ④ 실기기 확인 결과 모바일 카드 사이 놓기로 인한 실수 제거가 잦으면 명시적 제거 영역 검토, 키보드 드래그 대상 확인 (DB 스키마 변경 없음, 담당: GPT Codex(완료) / Claude Sonnet(완료) / 사용자 확인(④))
- [x] R79. [Run `r79-sql-tests-local-run` 완료(`main` 병합 `b38d65e`, 2026-11-11) · 후속 · 우선 낮음] `sql/README.md:61-62`의 잘못된 `psql` 명령을 `-h/-p/-U/-d` 형식으로 수정하고 재리뷰·main 병합함. Target `270f2c7` 정적 리뷰 clean, 기존 로컬 Supabase 38개 블록 PASS·최종 rollback PASS 확인함. Docker 엔진 미실행으로 재실행은 보류함.
- [x] R80. [Run `r80-classification-icon-admin-policy` 완료(`main` 병합 `dbded69`, 확인 쿼리 수정 `e08c2f0`) · R80 마이그레이션 운영 적용·확인 쿼리 `true`(사용자, 2026-11-11) · **사용자 남은 확인: 아이콘 등록 재시도·보유 캐릭터 크기** · DB 변경(RLS)] 분류 아이콘 저장 실패(RLS `42501`) 해결: 쓰기 정책을 JWT 또는 `users.role` 관리자 조건으로 통일하고 실패 원인을 화면에 표시함. 보유 캐릭터 아바타·이름 확대(게임 무관 고정 크기) 포함 (담당: Claude Opus → Gemini 4 Argon → 사용자)
- [x] R81. [Run `r81-image-input-unification` 완료(`main` 병합 `3c87917`) · **사용자 남은 확인: 각 위치 실브라우저 등록** · 사용자 요청·결정 2026-11-11 · DB 변경 없음(예정)] 이미지 입력을 공용 등록 모달(URL·붙여넣기·파일·미리보기)로 통일함. 대상: 사용자 화면 4곳(게임 커스텀 아이콘 2곳, 보유 캐릭터 커스텀 아이콘, 프로필 사진) + 관리자·요청 화면 8곳 + R77 모달. 캘린더 배경 제외. 사용자 화면도 wsrv.nl 프록시 대체 경로 사용 (담당: Claude Opus 명세 → Claude Sonnet 구현 → Claude Opus 리뷰)
- [x] R88. [Run `r88-optional-character-icons` 완료(`main` 병합 `66d55d8`, 리뷰 clean) · R88 마이그레이션 운영 적용·확인 쿼리 완료(사용자, 2026-11-11) · **사용자 남은 확인: 실브라우저** · 사용자 보고·결정 2026-11-11 · DB 변경] 템플릿 게임 일반 캐릭터도 아이콘 없이 등록(기본 아바타): Step 1에서 DB 제약·승인 RPC·SQL 테스트 반영함(운영 DB 미적용). 관리자 캐릭터 폼·요청 승인·요청 모달 필수 해제 예정 (담당: Claude Opus 대체 DB → Claude Sonnet UI → Claude Opus 리뷰)
- [x] R82. [Run `r82-version-grouped-schedules` 진행 중(Step 1 Claude Sonnet `✅ 58aa956`, Step 2 Claude Opus `▶ READY`) · 사용자 요청·결정 2026-11-11 · DB 변경 없음] 버전 일정이 있는 게임은 픽업·콘텐츠 일정을 시작일 기준으로 소속 버전 아래에 접어서(유형별 개수·픽업 아바타 요약) 표시함. 대상: 주간 일정 목록, 선택일 상세(사이드바·모바일 하단 창). 달력 칸·방송 일정은 그대로 (담당: Claude Sonnet → Claude Opus 리뷰) (`완료` - 2026-11-11 리뷰 clean, `main` 병합 `2c1f5c5`)
- [x] R83. [Run `r83-schedule-dialog-and-character-sort` 완료(`main` 병합 `6af6780`, 리뷰 clean) · **사용자 남은 확인: 일정 모달·캐릭터 정렬 실브라우저**] ① 게임별 일정 모달 `기타 일정`이 진행 중·다음 예정 일정과 항상 중복 표시되는 결함 수정 ② 캐릭터 기본 정렬을 첫 번째 분류 축 선택지 순서 + 가나다순으로 변경(캐릭터 페이지·프리셋 선택기·관리자 표, 즐겨찾기는 사용자 순서 유지) (DB 변경 없음, 담당: Claude Sonnet, 리뷰: Gemini 4 Argon)
- [x] R86. [Run `r86-schedule-crawling-research` 완료(2026-11-11) · 조사 · 문서 전용] 공식 일정 자동 수집 가능성을 검토함. 별도 `schedule_candidates`, Steam 6개+버전 주기 추정, 하루 1회, Supabase Edge Function+`pg_cron`, 구현 전 추가 조사로 결정함. 후속 구현은 R90으로 예약함.
- [x] R91. [2026-11-16 완료 · `main` 병합 `703362e` (`r91-r94-weekly-timeline-and-template-delete`)] 주차별 리스트(`WeeklyScheduleList`)에 표시되는 일정도 `end_date < todayDate`인 경우 표시에서 제외함 (DB 변경 없음)
- [x] R92. [2026-11-16 완료 · `main` 병합 `703362e` (`r91-r94-weekly-timeline-and-template-delete`)] 관리자 캐릭터 관리(`/admin`)에 게임별 '캐릭터 템플릿(명칭·등급·분류 기준)' 삭제/초기화 버튼 및 확인 다이얼로그 추가(`classification_schema`를 빈 배열 기본값으로 초기화, 정식 캐릭터 존재 시 함께 삭제 경고·픽업 일정/대기 요청 영향 안내·정리 후 미생성 상태로 복귀, 픽업 전용 캐릭터는 유지, DB 변경 없음)
- [x] R93. [Run `r93-income-history-db-and-ui` 완료(`main` 병합 `a1f17e0`, 리뷰 P4 2건 `R95` 이관) · R93 마이그레이션 운영 적용·확인 쿼리 완료(사용자, 2026-11-16) · **사용자 남은 확인: 실브라우저** · DB/RPC 변경 → Opus 승격 조건 ①] `public.incomes` 테이블(RLS·탈퇴 정리)·원장 동기화 RPC(`record_income`, `delete_income`) 신설 및 `/dashboard/expenses` 내 '전체 지출 내역' 카드에 `[지출 내역 | 수익 내역]` 전환 탭을 추가해 수익 목록 조회 및 삭제(총 자산 자동 차감 복원) 지원 (담당: GPT Codex / Claude Opus / Gemini 4 Hydrogen DB → Claude Sonnet / Gemini 4 Hydrogen UI → Claude Opus 리뷰)
- [x] R94. [2026-11-16 완료 · `main` 병합 `703362e` (`r91-r94-weekly-timeline-and-template-delete`)] 주차별 리스트(`WeeklyScheduleList`)를 첨부 레퍼런스 이미지 스타일로 전면 개편: 상단 `[전체 | 픽업(신규·복각·진행 중) | 버전 | 콘텐츠 | 방송]` 필터 바 + 주차 카드 내 좌측 `MM/DD(요일)`(`TODAY` 배지) 날짜 열 + 캐릭터/게임 아바타(우하단 게임 아이콘 배지 오버레이) + 굵은 제목 + 하단 게임명·기간 + 우측 관심 일정 버튼 타임라인 행 구조로 통합 표시(주간 지출 섹션은 주차 하단 유지, DB 변경 없음)
