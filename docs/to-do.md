# 구현 체크리스트 (to-do.md)

## Phase 0. SRS 및 설계 진입 게이트
- [x] 0.1 예정 취소/복구와 환불 상태 전이를 분리하고 물리 삭제 금지 정책 및 RPC 경로를 명세했다.
- [x] 0.2 앱 예상 적립식을 `floor(final_amount * rate / 100)`으로 정하고 공식 정산 비보장 및 수동 보정 정책을 명세했다.
- [x] 0.3 일정-게임 일치, 템플릿 소유권 및 게임 일치 검증 규칙을 명세하고 SQL 트리거 초안을 추가했다.
- [x] 0.4 만료 예정 지출과 온라인 강제 처리, 오프라인 캐시 읽기 선택을 명세했다.
- [x] 0.5 가입 시 초기 재무/지갑 기본값과 멱등 초기화 트리거 초안을 추가했다.
- [x] 0.6 SRS v1.0 사용자 승인 및 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료해 설계 단계 진입을 승인했다.
  - 참고: [SRS 초안](../md/SRS.md), [이전 준비도 검토](../md/srs-readiness-review.md), [차단 항목 설명](../md/planning-blockers.md), [결정안 검토](../md/resolved-blockers-review.md). 검토 기록은 당시 상태의 이력이며 최신 기준은 SRS/결정 보완이다.

---

### UI 글꼴 자산
- [x] A2Z의 SIL OFL 1.1을 확인하고 WOFF2 9개 굵기 및 저작권 고지/OFL 전문을 `public/fonts/a2z/`에 포함한다.
- [x] 정적 export의 9개 WOFF2 파일/CSS 참조와 브라우저에서 9개 굵기 적용을 확인한다. 앱 worktree ESLint 설정의 `root: true`로 상위 설정 탐색 오류를 해결하고 lint/build를 통과했다.

### 문서 정리
- [x] 오래된 기획 검토 문서를 참조 상태와 최신 기준 문서에 따라 정리
  - 삭제: `md/fix-proposals.md`, `md/revisions_and_decisions_review.md` (구식 Gemini.sql/Downloads 기준, 활성 문서 참조 없음)
  - 보존: 현재 체크리스트/인수인계에서 참조하는 SRS 준비도 및 차단 항목 검토 이력
- [x] SKILL에서 지정한 개발 운영 문서를 `docs/`로 이동하고 문서 링크를 갱신
  - 완료 파일: `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/known-pitfalls.md`, `docs/progress.md`, `docs/changelog.md`
  - 기획 기준 문서와 SQL은 `md/`에 유지
- [x] 멀티 에이전트 협업 아키텍처 검토 의견을 별도 문서로 작성
  - 결과: `md/multi_agent_collaboration_architecture_review.md` (§8에 최종 보완안 재검토 추가)
  - 검토만 완료했으며 파이프라인 채택이나 구현은 결정하지 않음
- [x] 협업 산출물 Schema, 저장 규칙, 보고서 템플릿 및 안전한 worktree 생성 스크립트 추가
  - 결과: `artifacts/`, `scripts/collaboration/New-CollaborationRun.ps1`
  - 정적 확인: JSON 문법, PowerShell 구문, 상대 Markdown 링크 통과
  - 현재 실행 환경은 깨끗하지 않고 Docker가 없어 실제 run/샌드박스 검증은 보류
- [x] 초보 개발자용 AI 협업 사용 안내 작성 (`docs/ai-collaboration-usage.md`)
- [ ] 깨끗한 커밋 상태에서 run 생성 스크립트를 검증하고 생성된 전용 worktree/manifest가 일치하는지 확인
- [ ] Docker 기반 테스트 샌드박스를 사용할 수 있는 환경에서 격리·네트워크·환경변수 제한을 검증
- [ ] Gemini Code Assist/Spark가 같은 run 아티팩트와 커밋을 읽고 쓸 수 있는지 수동 연결 확인

### Gemini 분업 후보 (별도 검토, 미착수)
- [ ] 이번 Dashboard KST 월간 예정 지출 변경을 커밋한 뒤, 전용 run의 동일 Target SHA를 기준으로 Gemini에 읽기 전용 코드 리뷰를 요청한다. 검토 범위는 월 경계/날짜 귀속 및 0원·오류 상태 처리와 승인 SRS/상세 설계 일치 여부로 한정하고, 결과는 run의 `review.json`으로 받는다.
  - 현재 구현·테스트·문서화는 이 작업 세션에서 수행한다. Gemini에는 구현을 맡기지 않는다.
  - Gemini의 저장소 직접 연결은 구성되어 있지 않다. clean tree에서 run을 만든 후 수동으로 자료를 전달해야 하며, run 생성 전까지는 미착수다.

### Phase 1. 환경 세팅, 테스트 인프라 및 Tauri 스파이크
- [ ] 1.1 Next.js 14+ (App Router) 정적 export 프로젝트 초기화
  - 대상 파일: `package.json`, `next.config.mjs`, `src/app/layout.tsx`
  - 작업: `output: 'export'` 설정, `images.unoptimized: true` 설정, Tailwind 보일러플레이트 세팅
  - verify: `npm run build` 실행 시 에러 없이 `out/` 정적 디렉터리가 생성되는지 확인
- [ ] 1.2 Vitest 단위 테스트 환경 구성
  - 대상 파일: `vitest.config.ts`, `package.json`
  - 작업: `vitest`, `@testing-library/react` 설치 및 기본 단언문 테스트 등록
  - verify: `npm run test` 실행 시 테스트 환경이 100% 통과하는지 확인
- [ ] 1.3 Tauri v2 데스크톱 초기화 및 정적 빌드 스파이크
  - 대상 파일: `src-tauri/tauri.conf.json`
  - 작업: `npm run tauri init` 수행 후 정적 `out/` 디렉터리를 가리키도록 설정
  - verify: `npm run tauri dev` 실행 시 데스크톱 윈도우 창에 Next.js 화면이 정상 로딩되는지 확인
- [ ] 1.4 shadcn/ui 컴포넌트 라이브러리 세팅
  - 대상 파일: `components.json`, `src/components/ui/`
  - 작업: Button, Dialog, Card, Input, Select, Progress, Drawer(바텀시트) 설치
  - verify: 버튼 및 카드 컴포넌트가 화면에 깨짐 없이 렌더링되는지 확인
- [ ] 1.5 Supabase 클라이언트 SDK 싱글톤 구성
  - 대상 파일: `.env.local`, `src/lib/supabase/client.ts`
  - 작업: 서버 쿠키 세션을 배제하고 `@supabase/supabase-js` 싱글톤 브라우저 클라이언트 유틸 작성
  - verify: 브라우저 콘솔에서 Supabase 클라이언트 초기화 에러가 없는지 확인

---

### Phase 2. 데이터베이스 스키마, RPC 및 RLS 배포
- [ ] 2.1 12개 핵심 테이블 DDL 마이그레이션 적용
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: Supabase 대시보드 SQL 에디터에서 통합 DDL 스크립트 실행
  - verify: 12개 테이블 및 유니크 인덱스가 Table Editor에 에러 없이 생성되었는지 확인
- [ ] 2.2 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거 배포
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: `process_expense_payment`, `refund_expense_payment`, 지갑 설정/보정 RPC, 게임·일정 승인/반려 RPC, 트리거 등록
  - verify: 결제/환불 RPC의 금액·잔액·상태 검증과 게임/일정 승인 원자성 확인
- [ ] 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: 일반 사용자 역할/JWT로 자산, 확정 지출, 지갑, 원장 및 요청 승인 상태에 직접 쓰기를 시도
  - verify: RPC만 허용된 변경은 직접 쓰기에서 RLS/권한 오류로 차단되는지 확인. 구독 템플릿 DELETE와 expenses DELETE도 거부되는지 확인
- [ ] 2.4 재현 가능한 DB/RPC/RLS 검증 케이스 준비
  - 대상 파일: `md/TESTS.sql`, `md/SCHEMA.sql`
  - 작업: 테스트 역할/JWT, 초기 데이터, 실행 순서, 각 케이스의 기대 성공/실패 결과를 문서화
  - verify: 결과를 재실행할 수 있고, 실행하지 않은 케이스는 PASS로 표시하지 않는지 확인
- [ ] 2.5 TypeScript Database 타입 자동 생성
  - 대상 파일: `src/types/database.types.ts`
  - 작업: `npx supabase gen types typescript` 실행
  - verify: `Database['public']['Tables']['personal_memos']['Row']` 타입이 정상 임포트되는지 확인

---

### Phase 3. 인증(Auth), 구글 로그인 및 딥링크
- [ ] 3.1 이메일 가입/로그인 및 구글 OAuth 연동
  - 대상 파일: `src/app/auth/page.tsx`, `src/lib/auth-context.tsx`
  - [x] 브라우저 Google 로그인에 PKCE flow를 사용하고 `/auth/callback`에서 authorization code를 세션으로 교환한다.
  - [x] callback의 공급자 오류/취소, code 누락, code 교환 실패 및 Strict Mode 재실행에서도의 성공 이동을 Vitest 5개로 검증한다.
  - [x] Google provider 활성화 및 `http://localhost:3000/auth/callback` Redirect URL 등록을 확인하고 실제 브라우저 OAuth code 교환·세션 저장·dashboard 복귀를 검증한다.
  - [ ] Android PWA 실기기에서 로그인·취소·세션 복귀를 검증하고 사용하는 PWA origin을 Redirect URLs에 등록한다.
  - [x] `/` 로그인 UI를 `/auth`로 단일화하고 dashboard layout 인증 gate를 추가했다. 로그인 사용자 이동 및 로그아웃 후 비인증 직접 접근 차단을 브라우저에서 확인했다. RLS는 별도 데이터 권한 경계로 유지한다.
  - [x] `/auth`를 다크 테마에 맞춰 개선하고 레이블 및 이메일 로그인/가입/Google 액션을 정리했다. 320/390/768/1280px 반응형 확인, callback 테스트 5개 및 TypeScript 검사를 통과했다. 앱 전체 테마 전환과 접근성 심화 검증은 남아 있다.
  - verify: Android PWA에서 OAuth 성공·취소 및 세션 복귀를 실제 설치 환경으로 확인한다.
- [ ] 3.2 데스크톱(Tauri) Deep Link 콜백 핸들러 구성
  - 대상 파일: `src-tauri/tauri.conf.json`, `src/lib/tauri-auth.ts`
  - 작업: `tauri-plugin-deep-link` 연동 및 `myapp://auth/callback` 리스너 작성
  - verify: 외부 브라우저에서 인증 후 데스크톱 앱 창으로 세션 토큰이 전달되어 로그인되는지 확인
- [ ] 3.3 사용자 계정 삭제 및 개인 데이터/Storage 정리 흐름
  - 대상 파일: 인증 설정 화면, 서버 측 계정 삭제 경로, `user-icons` Storage 정책
  - 작업: 본인 확인 후 비공개 아이콘 객체를 제거하고 Auth 계정 삭제를 완료한다. 공용 게임/일정은 보존한다.
  - verify: 계정 삭제 완료 후 개인 테이블 행과 Storage 객체가 남지 않고 공용 카탈로그는 유지되는지 확인

---

### Phase 4. 게임 마스터, 256x256 아이콘 및 요청 시스템
- [ ] 4.1 클라이언트 Canvas 256x256 WebP 리사이징 모듈
  - 대상 파일: `src/lib/image-resizer.ts`
  - 작업: PNG/JPG/JPEG/WebP 입력(원본 5 MiB 이하)을 1:1 중앙 크롭 후 Canvas로 256×256 WebP 변환 (Safari 폴백 포함)
  - verify: 각 허용 입력이 256×256 WebP로 변환되고, 100 KiB 초과 결과는 업로드가 거부되며 사용자에게 안내되는지 확인
- [ ] 4.2 Supabase Storage `user-icons` 버킷 업로드 연동
  - 대상 파일: `src/lib/storage-upload.ts`
  - 작업: 비공개 `user-icons` 버킷 안에 `{user_id}/{game_id}.webp` 고정 객체 경로를 사용하고 소유자만 인증 조회/교체/삭제하도록 설정. 로그인 세션으로 다운로드한 Blob을 앱에서 표시하고 업로드 후 다시 가져온다.
  - verify: 소유자 경로 정책이 타 사용자 읽기/쓰기 요청을 거부하고 `image/webp`, 102,400 bytes 이하 결과만 업로드하며 교체 후 새 이미지가 표시되는지 확인
- [ ] 4.3 공용 게임 카탈로그 구독 및 커스텀 아이콘 등록 UI
  - 대상 파일: `src/components/game/game-select-modal.tsx`
  - 작업: 공용 `games` 중 내 게임으로 `user_games`에 등록 및 커스텀 아이콘 교체 기능 구현. 게임 구독 제거 시 사용자 커스텀 아이콘 객체도 Storage에서 삭제한다.
  - verify: 내 게임 목록에 추가된 게임이 커스텀 아이콘과 함께 표시되고, 게임 제거 완료 후 해당 사용자의 아이콘 객체가 남지 않는지 확인
- [x] 4.4 일반 유저 게임/일정 추가·수정 요청 모달 및 관리자 승인 UI
  - 대상 파일: `src/components/game/request-submission-modal.tsx`, `src/components/game/request-validation.ts`, `src/app/admin/requests/page.tsx`
  - 작업: dashboard 모달에서 게임 요청과 일정 추가/수정 요청을 승인 스키마 필드로 제출한다. `user_id`는 Auth 사용자에서 가져오고 상태/관리자 필드는 보내지 않으며, 일정 수정은 `target_schedule_id`를 사용한다. 본인 요청 상태 조회, 필수 입력/일정 종류/날짜 검증 및 오류 안내를 제공한다. 관리자 상태 변경은 승인/반려 RPC에 맡긴다.
  - verify: 전체 Vitest 6개 파일·21개 테스트, ESLint, TypeScript, dummy Supabase 환경값 정적 build 통과. 실제 Supabase RLS/역할 제한 및 승인·반려 RPC 원자성은 실행하지 않았다.
  - [ ] 후속: 격리된 테스트 Supabase에서 일반 사용자 RLS 차단/허용과 관리자 승인·반려 RPC 원자성을 검증한다.
  - [ ] 후속: 기존 `package.json`과 `package-lock.json` 동기화 후 `npm ci` 재현성을 확인한다. 현재 lockfile 누락 엔트리로 `npm ci`가 실패한다.

---

### Phase 5. 미니멀 캘린더 코어, 개인 메모 및 Lazy Generation
- [ ] 5.1 날짜 연산 코어 및 말일 보정 함수 작성
  - 대상 파일: `src/lib/calendar-utils.ts`
  - 작업: 6주 캘린더 그리드 및 `getAdjustedBillingDate(year, month, billingDay)` 구현
  - verify: 31일 결제일이 2월 평년은 28일, 윤년은 29일, 4월은 30일로 산출되는지 Vitest로 검증
- [ ] 5.2 정기 구독 멱등성 보장 지연 생성 (Lazy Generation)
  - 대상 파일: `src/lib/subscription-sync.ts`
  - 작업: 당월 캘린더 로드 시 누락된 `is_active = true` 템플릿만 자동 INSERT (`billing_cycle` 기반 유니크 제약 연동); 취소 회차는 자동 재생성하지 않음
  - verify: 새로고침을 여러 번 하거나 동시 접속해도 `expenses`에 동일 월 구독 지출이 1건만 생성되는지 확인. 템플릿 비활성화는 생성된 미결제 회차를 `TEMPLATE_DEACTIVATION`으로 보존 취소하고, 재활성화는 과거 회차를 자동 복구하지 않으며 소유자가 재활성화 후 명시적으로 복구해야 하는지 확인
- [ ] 5.3 미니멀 데스크톱 캘린더 (금액 완전 배제, 버전/픽업 배너 및 메모 도트)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/schedule-banner.tsx`
  - 작업: 타일 내부 금액 텍스트 완전 제거, 게임 아이콘, 버전/픽업 배너 바, 개인 메모 힌트 도트 렌더링 구현
  - verify: 캘린더 타일 칸에 숫자가 뜨지 않고 배너 바와 아이콘, 메모 도트만 깔끔하게 표시되는지 확인
- [ ] 5.4 우측 히어로 사이드바 (Hero Area) 및 모바일 바텀 시트
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: 총 자산 잔고, 월 예산 진행률 바, 스토어 포인트 카드, 선택일 상세 지출 내역 및 개인 메모 전문 렌더링
  - verify: 날짜 클릭 시 해당 일자의 지출 목록(게임명 + 금액)과 메모가 히어로 사이드바에 즉시 표시되는지 확인

---

### Phase 6. 가계부, 결제/환불 RPC 연동 및 포인트 지갑
- [ ] 6.1 스토어 포인트 지갑 위젯 및 계정 등급 설정
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/settings/page.tsx`
  - 작업: `update_store_wallet_settings` RPC 연동(구글 등급별 적립률, 갤럭시 적립률 수정) 및 잔액 수동 보정 UI 구현
  - verify: 설정 변경 시 지갑 레코드가 정상 갱신되고 수동 보정 시 원장에 `MANUAL_ADJUST`가 기록되는지 확인
- [ ] 6.2 정밀 결제 모달 및 `process_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`
  - 작업: 계층형 등록(카테고리 $\to$ 게임 $\to$ 버전/픽업 탭), `WALLET`/`GOOGLE_PLAY`/`GALAXY_STORE` 결제수단, 할인/포인트할인 분리 입력, 자산 차감 토글 및 RPC 호출
  - verify: 정가 119,000원, 쿠폰 5,000원(250P 소모) 입력 시 실결제액 114,000원 산출 및 잔액 차감 확인
- [ ] 6.3 결제 취소/환불 UI 및 `refund_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-detail-modal.tsx`
  - 작업: 지출 상세에서 [결제 취소] 클릭 시 환불 RPC 호출 (포인트 반환, 적립 회수, 자산 복원)
  - verify: 적립 포인트를 이미 써서 잔액이 부족한 경우 환불 거부 에러 메시지가 정상 노출되는지 확인

---

### Phase 7. 일정 동기화, 만료 처리 및 최종 빌드
- [ ] 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증
  - 대상 파일: `md/SCHEMA.sql` (트리거 검증)
  - 작업: 관리자가 버전 또는 픽업 일정의 시작일·종료일을 변경했을 때 DB 트리거 동작 확인
  - verify: 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 동기화되고 `CONFIRMED` 지출은 보존되는지 확인
- [ ] 7.2 두 달에 걸치는 픽업 일정의 예산 이월/차감 연동 및 만료 모달
  - 대상 파일: `src/components/expense/overdue-planned-modal.tsx`, `src/lib/budget-calculations.ts`
  - 작업: 미결제 항목은 종료일 속한 달의 예산으로 배정, 이전 달 결제 시 익월 예정액에서 자동 차감 및 만료 처리 구현
  - verify: 10/25~11/12 픽업 지출을 10월에 결제했을 때 11월 총 예상 소비액이 즉시 줄어드는지 확인
- [ ] 7.3 PWA 매니페스트 및 오프라인 방어 배너
  - 대상 파일: `public/manifest.json`, `src/components/ui/offline-banner.tsx`
  - 작업: PWA 홈 화면 추가 설정, 유효한 인증 세션의 캐시 조회만 허용하고 오프라인 시 지출 쓰기를 비활성화
  - verify: 세션 만료 시 캐시된 개인정보가 표시되지 않고 결제 등록 버튼이 잠기는지 확인
- [ ] 7.4 Tauri v2 데스크톱 최종 배포 빌드 검증
  - 대상 파일: `src-tauri/tauri.conf.json`
  - 작업: `npm run tauri build` 실행 및 Windows 독립 실행 파일(`.exe`) 추출
  - verify: 추출된 실행 파일을 단독 실행하여 로그인, 캘린더 배너, 결제 등록이 정상 동작하는지 확인
