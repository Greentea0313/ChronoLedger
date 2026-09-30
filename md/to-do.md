# 구현 체크리스트 (to-do.md)

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
  - verify: RPC만 허용된 변경은 직접 쓰기에서 RLS/권한 오류로 차단되는지 확인
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
  - 작업: 이메일 폼 및 Google 로그인 버튼 연동
  - verify: 웹 환경에서 구글 로그인 성공 후 대시보드로 정상 이동하는지 확인
- [ ] 3.2 데스크톱(Tauri) Deep Link 콜백 핸들러 구성
  - 대상 파일: `src-tauri/tauri.conf.json`, `src/lib/tauri-auth.ts`
  - 작업: `tauri-plugin-deep-link` 연동 및 `myapp://auth/callback` 리스너 작성
  - verify: 외부 브라우저에서 인증 후 데스크톱 앱 창으로 세션 토큰이 전달되어 로그인되는지 확인

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
  - 작업: 공용 `games` 중 내 게임으로 `user_games`에 등록 및 커스텀 아이콘 교체 기능 구현
  - verify: 내 게임 목록에 추가된 게임이 커스텀 아이콘과 함께 표시되는지 확인
- [ ] 4.4 일반 유저 게임/일정 추가·수정 요청 모달 및 관리자 승인 UI
  - 대상 파일: `src/components/game/schedule-request-modal.tsx`, `src/app/admin/requests/page.tsx`
  - 작업: 게임 요청(`game_requests`)과 일정 요청(`schedule_requests`)을 분리하고 승인/반려 RPC 연동
  - verify: 승인 요청의 상태 변경과 카탈로그/일정 반영이 원자적으로 완료되는지 확인

---

### Phase 5. 미니멀 캘린더 코어, 개인 메모 및 Lazy Generation
- [ ] 5.1 날짜 연산 코어 및 말일 보정 함수 작성
  - 대상 파일: `src/lib/calendar-utils.ts`
  - 작업: 6주 캘린더 그리드 및 `getAdjustedBillingDate(year, month, billingDay)` 구현
  - verify: 31일 결제일이 2월 평년은 28일, 윤년은 29일, 4월은 30일로 산출되는지 Vitest로 검증
- [ ] 5.2 정기 구독 멱등성 보장 지연 생성 (Lazy Generation)
  - 대상 파일: `src/lib/subscription-sync.ts`
  - 작업: 당월 캘린더 로드 시 누락된 `is_active = true` 템플릿만 자동 INSERT (`billing_cycle` 기반 유니크 제약 연동); 취소 회차는 자동 재생성하지 않음
  - verify: 새로고침을 여러 번 하거나 동시 접속해도 `expenses`에 동일 월 구독 지출이 1건만 생성되는지 확인
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
