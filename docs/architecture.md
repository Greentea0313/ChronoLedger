# 시스템 아키텍처 및 책임 구조 (architecture.md)

아키텍처 결정의 기준은 [revisions_and_decisions.md](../md/revisions_and_decisions.md)다. 이 문서는 런타임 구성요소와 각 계층의 책임을 정한다.

화면 흐름, 데이터 계약, RPC 경계, 보안 및 검증 설계는 [detailed-design.md](detailed-design.md)를 참조한다. 이 문서는 승인 기준을 구체화하며 미승인 구현 선택은 미결정으로 남긴다.

## 1. 구성

```text
Next.js App Router
├── 모바일: PWA (SRS 제품 범위; 앱 버전/첫 릴리스 미결정)
└── 데스크톱: Windows Tauri v2 정적 export (SRS 상위 방향; 앱 릴리스 버전 미결정)
        │ Supabase SDK / 인증 세션
        ▼
Supabase
├── Auth: 이메일 및 Google OAuth
├── PostgreSQL: RLS 격리, 원자적 RPC, 일정 동기화 트리거
└── Storage: 소유자 전용 비공개 커스텀 아이콘
Netlify Functions (계정 삭제 전용 서버 경계)
├── 요청 인증/확인 및 상태 조회
├── 예약 worker: queue claim, Storage/개인 데이터 정리, Resend 알림, Auth 최종 삭제
└── Supabase service-role 비밀값은 server environment에서만 사용
```

## 2. 데이터 및 권한 경계

- 클라이언트는 Supabase SDK를 통해 데이터 조회와 허용된 사용자 요청을 수행한다. 비밀 키를 포함하지 않는다.
- PostgreSQL RLS는 개인 데이터 소유권을 강제한다. 관리자 권한은 JWT `app_metadata.role=admin`을 기준으로 하며 값은 Supabase 관리 콘솔/서버에서만 부여한다.
- 공용 `games` 카탈로그와 `game_schedules`는 인증 사용자가 읽는다. 직접 변경은 관리자만 가능하다. 사용자 제안은 `game_requests` 및 `schedule_requests`에 저장하고 관리자 승인 RPC로 반영한다.
- 자산·포인트 원장·지갑 설정·확정 지출은 전용 `SECURITY DEFINER` RPC 경로에서 검증 및 원자적으로 변경한다. 함수 실행 권한은 `authenticated`로 제한한다.
- `VERSION`/`PICKUP` 일정의 날짜 변경 트리거는 관련 예정 지출만 동기화한다. 확정 회계 기록은 수정하지 않는다.

## 3. 클라이언트 모듈 책임

- `src/app/`: 인증, 캘린더, 설정, 관리자 요청 화면의 라우팅과 페이지 조립.
- `src/app/page.tsx`는 단일 로그인 경로 `/auth`로 이동한다. `src/app/dashboard/layout.tsx`는 세션 로딩과 사용자 존재 여부를 확인해 보호 화면 렌더링을 제어한다. 데이터 권한은 Supabase RLS가 강제한다.
- `src/lib/budget-calculations.ts`: 월별 예산 귀속(PLANNED=종료일 월, CONFIRMED=결제월)과 만료 예정 탐지. `src/components/expense/overdue-planned-modal.tsx`: 만료 항목 결제/예정 취소. `src/lib/use-online-status.ts`, `src/components/ui/offline-banner.tsx`: 오프라인 감지·배너·쓰기 잠금. `public/manifest.json`: PWA 매니페스트. `public/sw.js`, `src/components/pwa/service-worker-register.tsx`: 앱 셸 + 로그인 사용자별 Supabase 읽기 캐시 Service Worker와 등록/로그아웃 캐시 삭제. `src/lib/offline-guard.ts`: 쓰기 핸들러 오프라인 가드.
- `src/components/wallet/store-wallet-widget.tsx`: 스토어 지갑 설정/수동 보정 위젯(설정 페이지). `src/components/expense/expense-modal.tsx`, `expense-detail-modal.tsx`: 결제(`process_expense_payment`)와 환불(`refund_expense_payment`) 모달. `src/lib/payment-calculations.ts`: 실결제액·적립 추정·검증·RPC 오류 매핑.
- `src/components/calendar/`: 반응형 월간 캘린더, 일정 배너, 메모 도트, 선택 날짜 상세 및 예산 화면. 타일에는 금액을 그리지 않는다.
- `src/components/calendar/desktop-calendar.tsx`: 6주 월간 그리드와 타일 렌더링(배너/아이콘/메모 도트 전용, 금액 미표시).
- `src/components/calendar/hero-sidebar.tsx`, `mobile-drawer.tsx`: 선택일 상세, 예산 진행률, 포인트 요약을 데스크톱/모바일 각각의 레이아웃으로 표시한다.
- `src/components/expense/`: 예정 지출 입력, 결제/환불 RPC 호출, 예산 요약 및 만료 예정 지출 흐름.
- `src/components/game/`: 공용 카탈로그 선택 및 게임 요청, 일정 추가·수정 제안 제출, 개인 아이콘 업로드/표시.
- `src/app/admin/requests/`: 관리자 전용 게임/일정 요청 조회 및 승인·반려 화면. DB 변경은 승인된 RPC 경로를 사용한다.
- `src/lib/`: 단일 Supabase client(브라우저 PKCE/Tauri implicit 런타임 설정 및 callback URL 자동 감지 비활성화), 인증 상태, KST 날짜 범위·예산 계산, 이미지 변환, 캐시 및 오프라인 쓰기 차단.
- `src/lib/calendar-utils.ts`: 캘린더 그리드와 말일 보정 날짜 계산. `src/lib/subscription-sync.ts`: 월간 구독 Lazy Generation과 중복 충돌 무시 upsert 경계.
- `src/components/ui/`: 공통 Button, Card, Input, Dialog, Select, Progress, Drawer UI 컴포넌트. Progress는 Radix UI, Drawer는 Vaul 기반이며 alias는 `components.json`에 정의한다.
- Web/PWA 앱의 `public/fonts/a2z/`: 자체 호스팅하는 A2Z WOFF2 9개 굵기 및 SIL OFL 1.1 고지.
- `src/types/`: 배포한 PostgreSQL 스키마에 맞춰 생성한 TypeScript 타입.
- `netlify/functions/`: 계정 삭제 요청·상태 endpoint와 예약 정리 worker. 이 경계만 service-role key를 사용하며, 일반 앱은 기존 정적 export/Supabase browser client 구조를 유지한다.
- `md/`: 통합 기획 원본, 기능 명세, DB 스키마, 프로젝트 에이전트 지침, 멀티 에이전트 협업 제안과 검토.
- `docs/`: 진행 현황, 아키텍처, 인수인계, 구현 체크리스트, 변경 이력, 주의사항.
- `docs/ai-collaboration-usage.md`, `docs/ChronoLedger_collaboration_guide.md`: 기존 수동 절차와 초보자를 위한 최소 개입 협업 흐름 및 사용자 개입 안내.
- `.github/copilot-instructions.md`, `.github/agents/`: VS Code 지침과 ChronoLedger Orchestrator/Maker/Reviewer 프로필. Local harness에서 Orchestrator가 Maker/Reviewer를 하위 에이전트로 위임하도록 구성했으며, 실제 발견·도구 권한·실행은 VS Code 환경에서 검증해야 한다.
- `md/ChronoLedger_UI_Design_Sheet.md`, `docs/design-v1-ko.html`, `docs/design-preview-ko.html`: SRS에 근거한 UI 설계 참조 및 정적 목업. 반응형 시안은 자체 호스팅 폰트 자산을 `docs/assets/fonts/a2z/`에서 가져온다. 실제 제품 UI 구현은 별도다.
- `docs/Netlify_Web_Architecture_Proposal.md`: Netlify/Web·Desktop 빌드 분리 제안. 아직 승인되지 않아 런타임 결정으로 적용하지 않는다.
- `artifacts/`: run manifest, 반복별 정적 리뷰/테스트 JSON, 민감정보를 제거한 종료 보고서 및 JSON Schema.
- `scripts/collaboration/`: 깨끗한 저장소 상태를 확인하고 실행 전용 Git worktree를 만드는 스크립트, collaboration artifact JSON Schema 검증기 및 승인된 단일 run/SHA의 Gemini Reviewer 초안을 만드는 제한 PoC.
- `.worktrees/`: run별 격리 작업 트리 위치이며 Git에서 제외한다. 자동 강제 초기화는 사용하지 않는다.

## 4. Storage 및 캐시

- `user-icons`는 비공개 버킷이다. 키는 `{user_id}/{game_id}.webp`이며 Storage RLS는 인증된 소유자 경로만 허용한다.
- 업로드 전 원본(최대 5 MiB)을 256×256 WebP로 변환한다. 결과가 100 KiB를 넘으면 업로드를 거부하고 안내한다.
- 앱은 소유자 세션으로 객체를 가져와 표시한다. 공개 URL은 만들지 않는다.
- 계정 삭제 요청에서는 소유자의 Storage 아이콘 객체를 정리한 뒤 Auth 계정 삭제를 완료해야 한다. 사용자 테이블의 cascade 삭제만으로 Storage 객체가 제거된다고 가정하지 않는다.
- 오프라인 캐시는 유효 세션에서 읽기 전용이다. 만료 예정 지출 모달은 오프라인에서 닫을 수 있고, 온라인 복귀 때 미해결 항목을 재조회해 다시 처리를 요구한다. 세션 만료 시 개인 데이터 캐시를 표시하지 않는다.

## 5. 배포 및 미검증 사항

- SRS는 Android PWA와 Windows Tauri v2, 단일 Next.js 코드베이스 및 Tauri 정적 export 방향을 정한다. Android PWA 실기기 검증은 웹사이트 우선 요청에 따라 보류됐으나 제품 범위는 유지한다. 앱 릴리스 버전은 미결정이다.
- 사용자는 Netlify를 웹 호스팅 후보로 고려한다. 우선 기존 `output: 'export'` 산출물을 Deploy Preview에서 검증하고, 서버 기능 요구 증거 없이 Web/Desktop 빌드를 분리하지 않는다. Netlify 채택은 preview 검증 전까지 미확정이며 체크 항목은 [to-do.md](to-do.md)에 둔다.
- UI 설계는 [UI Design Sheet](../md/ChronoLedger_UI_Design_Sheet.md)를 따른다. 이는 SRS가 정한 동작을 보존하며, `[PROPOSED]`로 표시된 시각/배치 선택은 구현 전에 확정한다. [한국어 HTML 목업](design-v1-ko.html)은 단일 대시보드의 정적 시각 참고 자료다.
- DDL/RPC/RLS는 [SCHEMA.sql](../md/SCHEMA.sql)에 둔다. 사용자는 전용 테스트 프로젝트에서 rollback-only smoke suite의 최종 PASS 및 fixture 롤백을 확인했다. 이는 전체 SRS 수용 기준 또는 Production 배포 검증을 뜻하지 않는다.
- 계정 삭제 worker는 Supabase의 `account_deletion_requests` queue에서 job을 claim하고 Storage → 개인 행 → Resend 안내 → Auth 순서로 처리한다. `MANUAL_REVIEW`는 Resend 멱등성 안전 기간을 넘긴 불명확한 메일 결과의 보류 상태다. Supabase migration 적용, Netlify 예약 실행 및 provider 환경 설정은 배포 전 검증이 필요하다.
