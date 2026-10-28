# ⏱️ ChronoLedger (크로노레저)

<div align="center">

<p><strong>게임 일정과 소비를 한눈에, 스마트하게 관리하는 서브컬처 게이머를 위한 일정 연동 가계부</strong></p>

[![Deployment](https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflarepages&logoColor=white)](https://chronoledger.pages.dev/)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tests-260_Passed-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[🌐 서비스 바로가기 (Web & PWA)](https://chronoledger.pages.dev/)

</div>

---

## 📖 목차

- [프로젝트 소개](#프로젝트-소개)
- [핵심 킬러 기능](#핵심-킬러-기능)
- [시스템 아키텍처 및 보안](#시스템-아키텍처-및-보안)
- [기술 스택](#기술-스택)
- [로컬 실행 가이드](#로컬-실행-가이드)
- [테스트 및 품질 보증](#테스트-및-품질-보증)
- [기여 및 라이선스](#기여-및-라이선스)

---

## 🌟 프로젝트 소개

<a id="프로젝트-소개"></a>

**ChronoLedger(크로노레저)**는 여러 가챠/서브컬처 게임을 동시에 즐기는 게이머들이 겪는 **일정 분산**과 **비계획적 과금** 문제를 해결하기 위해 탄생한 차세대 **게임 일정 연동 스마트 가계부 & 스토어 포인트 관리 웹앱**입니다.

> **"게임 일정과 소비를 한눈에, 스마트하게 관리하는 서브컬처 게이머를 위한 일정 연동 가계부"**

- 🎮 **일정과 지출의 유기적 결합**: 신규 버전 개방, 캐릭터 픽업, 시즌 패스 갱신 시점에 맞춰 가계부 지출 계획을 자동으로 연동합니다.
- 🪙 **정교한 스토어 포인트 엔진**: 구글 플레이 및 갤럭시 스토어의 티어별 적립/차감, 네이버페이 올림 충전, 100% 포인트 전액 할인 결제를 실제 금융 결제 메커니즘과 완벽히 동기화합니다.
- 📱 **앱 급의 사용성 (PWA)**: 오프라인 캐시 방어, 반응형 모바일 바텀시트(`MobileDrawer`), 초경량 글래스모피즘 UI를 통해 데스크톱과 모바일 어디서나 매끄러운 경험을 제공합니다.

---

## ✨ 핵심 킬러 기능

<a id="핵심-킬러-기능"></a>

### 1. 📅 게임 일정 캘린더 연동 (Official Schedules & Smart Dots)

- **공용 게임 카탈로그 & 공식 일정**: 원신, 붕괴: 스타레일, 명일방주 등 구독한 게임들의 공식 버전 패치, 픽업 이벤트, 콘텐츠 일정을 캘린더에 실시간 투영합니다.
- **가시성 높은 타일 인디케이터**:
  - 시작일 단일 게임 아이콘 배지 표시로 캘린더 복잡도를 획기적으로 축소.
  - 일정 성격에 따른 직관적 컬러 도트 체계:
    - 🟢 **버전 (VERSION)**: 정기 업데이트 및 시즌 패스 기간 (`bg-success`)
    - 🔵 **픽업 (PICKUP)**: 한정 캐릭터/무기 소환 기간 (`bg-primary`)
    - 🟣 **콘텐츠 (CONTENTS)**: 인게임 주요 이벤트 및 보상 기간 (`bg-purple-500`)
    - ⚪ **개인 메모**: 사용자 본인만 확인 가능한 비공개 일정 메모 (`bg-content-secondary`)

### 2. 🎨 캐릭터 일러스트 커스텀 배경 & 글래스모피즘

- **IndexedDB 로컬 영구 보관**: 최대 **50MB**의 고해상도 캐릭터 일러스트를 브라우저 로컬 데이터베이스에 안전하게 영구 저장(서버 전송 없음).
- **정밀한 비주얼 튜닝**:
  - 배경 투명도(10% ~ 90%, 가독성 보호 슬라이더) 및 날짜 타일 투명도(0% ~ 90%) 실시간 슬라이더 조절.
  - 블러(Blur) 3단계 토글(OFF / 약함 / 보통) 지원으로 가독성과 일러스트 감상을 동시에 만족하는 글래스모피즘 디자인.
- **간편한 원클릭 초기화**: 언제든 기본 테마로 복원할 수 있는 편의 설정 지원.

### 3. 💳 스마트 게임 결제 & 스토어 포인트 엔진

- **스토어별 등급 및 적립률 계산**:
  - **구글 플레이 (Google Play Points)**: 브론즈(1%), 실버(1.1%), 골드(1.3%), 플래티넘(1.6%), 다이아몬드(2%) 자동 적립 및 포인트 사용 차감.
  - **갤럭시 스토어 (Galaxy Store)**: 일반/스타(10%), 프레스티지(11%), 로열블루(21%) 및 커스텀 프로모션 적립률 완벽 대응.
- **네이버페이 자동 올림 충전 엔진 (10,000원 단위)**:
  - 네이버페이 잔액이 부족한 결제 발생 시, 부족분을 **10,000원 단위로 자동 올림(Ceil)**하여 총 자산에서 즉시 충전 후 결제 처리.
- **100% 전액 포인트 결제 (0원 결제)**:
  - 보유 포인트만으로 전액 할인 결제 시 자산 차감 없이 순수 포인트 원장만 차감.
- **원자적 결제 취소 & 환불 롤백**:
  - 지출 결제 취소 시 사용된 포인트와 네이버페이 충전 잔액을 안전하게 복원하고, 이미 적립된 포인트를 회수한 내역까지 트랜잭션 기록 보존.

### 4. 📊 픽업별 가챠 소비 통계 (Gacha Analytics)

- **버전 내 픽업별 과금 비율 시각화**: 특정 버전 패치 동안 어떤 픽업 캐릭터/무기에 얼마를 지출했는지 Recharts 기반의 가로 막대 차트 및 랭킹으로 정밀 분석.
- **예산 대비 지출 모니터링**: 월별 소비 예산 설정 및 진행 바, 초과 지출 경고를 통해 합리적인 과금 통제 지원.
- **만료된 예정 지출 알림 (`OverduePlannedModal`)**: 지난 일정의 미결제 예정 항목을 모아서 즉시 확정/취소 처리할 수 있는 리마인더 다이얼로그.

### 5. 🔒 비공개 개인 메모 & 모바일 최적화 UX

- **RLS 기반 비밀 메모 (`personal_memos`)**: 날짜별 과금 전략이나 개인 메모를 DB 수준에서 사용자 UUID로 완벽 격리하여, 시스템 관리자조차 읽을 수 없도록 보안 보장.
- **반응형 모바일 바텀시트 (`MobileDrawer`)**: 데스크톱의 우측 사이드바(`HeroSidebar`)가 모바일 터치 환경에서는 부드러운 드로어로 자연스럽게 전환.
- **PWA 오프라인 방어 (`OfflineBanner`)**: Service Worker 캐싱을 통한 빠른 초기 로딩 및 오프라인 상태 감지 시 변조 방지 배너 안내.

### 6. 🛠️ 관리자 콘솔 (Admin Operations)

- **공식 게임 & 일정 카탈로그 관리**: 유저들이 건의한 신규 게임/일정 요청을 단일 트랜잭션으로 승인/반려.
- **만료된 지난 일정 관리 다이얼로그**: 종료된 지난 게임 일정을 따로 모아보며 날짜 수정, 명칭 변경 등을 신속하게 일괄 편집 가능.

---

## 🛡️ 시스템 아키텍처 및 보안

<a id="시스템-아키텍처-및-보안"></a>

ChronoLedger는 단순한 가계부 UI에 머무르지 않고, **금융 서비스 수준의 원장 무결성과 엄격한 데이터 프라이버시**를 보장합니다.

```mermaid
flowchart TD
    Client["Next.js 14 클라이언트 (App Router / PWA)"]
    EdgeCDN["Cloudflare Pages (Global Edge CDN)"]
    SupabaseAuth["Supabase Auth (JWT / User UUID)"]
    RPC["PostgreSQL 원자적 RPC 트랜잭션"]
    RLS["Row Level Security (100% 격리 엔진)"]
    DB[(PostgreSQL Ledger Tables)]

    Client -->|정적 리소스 요청| EdgeCDN
    Client -->|인증 요청| SupabaseAuth
    Client -->|지출 확정 / 환불 / 지갑 조정| RPC
    RPC -->|FOR UPDATE Row Locking| DB
    Client -->|데이터 조회 SELECT| RLS
    RLS -->|auth.uid() = user_id 엄격 검증| DB
```

### 1. 100% Row Level Security (RLS) 격리 원칙

- 모든 사용자 테이블(`user_finances`, `expenses`, `store_wallets`, `personal_memos`, `monthly_budgets`, `subscription_templates` 등)에 **RLS를 강제 적용**하여 타인의 데이터에 대한 조회를 원천 차단합니다.
- 특히 **개인 메모(`personal_memos`)**와 **개인 지출 상세 내역**은 시스템 관리자 역할(`role = 'admin'`)에게도 열람 권한이 일절 부여되지 않는 사용자 전용 완전 격리 구역입니다.

### 2. 자산 및 포인트 잔액 조작 방지 (REVOKE & Atomic RPC)

- 클라이언트가 `store_wallets`, `user_finances`, `store_point_transactions` 테이블에 직접 `INSERT`나 `UPDATE` 쿼리를 실행하는 권한을 **완전 박탈(REVOKE)**했습니다.
- 모든 자산 차감, 포인트 적립/사용, 네이버페이 올림 충전, 환불 롤백은 `SECURITY DEFINER`로 봉인된 PostgreSQL RPC 함수(`process_expense_payment`, `refund_expense_payment`, `adjust_wallet_balance`)를 통해서만 원자적으로 수행됩니다.
- 행 레벨 잠금(`SELECT ... FOR UPDATE`)을 적용하여 동시 결제 시 발생할 수 있는 Race Condition과 이중 지출(Double Spending)을 완벽 방어합니다.

---

## 💻 기술 스택

<a id="기술-스택"></a>

| 영역 | 스택 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** | App Router, 정적 내보내기(`output: export`), React 18 |
| **Language** | **TypeScript 5** | Strict Type 검사 및 Supabase Database Type 연동 |
| **Styling** | **Tailwind CSS** | 반응형 유틸리티 클래스, CSS 변수 기반 다크 테마 |
| **UI Components** | **shadcn/ui & Radix UI** | 접근성(A11y) 보장 컴포넌트 (Dialog, Sheet, Tabs 등) |
| **Icons & Charts**| **Lucide React & Recharts** | 고해상도 SVG 아이콘 및 반응형 통계 차트 |
| **Backend & DB** | **Supabase (PostgreSQL)** | RLS, 원자적 RPC 트랜잭션 함수, Supabase Auth, Storage |
| **Deployment** | **Cloudflare Pages** | 글로벌 엣지 정적 웹 호스팅 및 초고속 배포 |
| **Client Storage**| **IndexedDB** | 최대 50MB 캐릭터 배경 일러스트 로컬 영구 보관 |
| **Application** | **PWA (Service Worker)** | 모바일 홈 화면 설치 지원, 오프라인 네트워크 감지 방어 |
| **Testing** | **Vitest & RTL** | 단위 및 컴포넌트 통합 테스트 (260개 전원 통과) |

---

## 🚀 로컬 실행 가이드

<a id="로컬-실행-가이드"></a>

### 사전 요구사항

- **Node.js**: `v20.0.0` 이상 권장
- **npm**: `v10.0.0` 이상 권장 (또는 pnpm / yarn)
- **Supabase 계정 및 프로젝트**: [Supabase 바로가기](https://supabase.com/)

### 1. 저장소 복제 (Clone)

```bash
git clone https://github.com/your-username/ChronoLedger.git
cd ChronoLedger
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트 경로에 `.env.local` 파일을 생성하고 Supabase 프로젝트 정보를 입력합니다:

```env
# Supabase 환경 변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **참고**: 데이터베이스 스키마 및 마이그레이션 파일은 `sql/SCHEMA.sql`에 위치하고 있습니다. Supabase 대시보드의 **SQL Editor**에서 실행하여 초기 테이블, 함수, RLS를 설정할 수 있습니다.

### 4. 로컬 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 실행 상태를 확인합니다.

### 5. 정적 빌드 및 배포 산출물 생성

```bash
npm run build
```

Cloudflare Pages 등에 바로 업로드할 수 있는 정적 HTML/CSS/JS 파일이 `/out` 디렉터리에 생성됩니다.

---

## 🧪 테스트 및 품질 보증

<a id="테스트-및-품질-보증"></a>

ChronoLedger는 비즈니스 로직(금융 계산, 네이버페이 올림 충전, 스토어 포인트 적립, 지출 동기화)과 UI 상호작용의 신뢰성을 위해 엄격한 테스트 슈트를 구축했습니다.

```bash
# 전체 단위 및 통합 테스트 실행 (단일 패스)
npm run test -- --run

# 테스트 워치 모드 실행
npm run test
```

### 테스트 현황

- **테스트 러너**: Vitest 5 & React Testing Library
- **통과 테스트 수**: **42개 테스트 파일 / 총 260개 테스트 100% 통과 (0 failed)**
- **주요 검증 영역**:
  - `payment-calculations`: 복합 포인트/할인 계산 및 네이버페이 올림 충전 로직
  - `desktop-calendar` & `mobile-drawer`: 반응형 글래스모피즘 렌더링 및 모바일 인터랙션
  - `expense-modal`: 100% 포인트 결제, 결제일 보존, 잔액 초과 클라이언트 사전 차단
  - `calendar-bg-storage`: IndexedDB 대용량 일러스트 이미지 비동기 CRUD 무결성
  - `subscription-sync`: 월별/버전별 구독 지출 템플릿 멱등성 보장

---

## 🤝 기여 및 라이선스

<a id="기여-및-라이선스"></a>

### 기여 및 피드백

버그 제보, 기능 건의 및 풀 리퀘스트를 환영합니다!

1. 이슈(Issues) 탭에서 논의할 주제나 버그를 등록해주세요.
2. 기능 추가나 수정은 새 브랜치를 생성하여 작업 후 PR을 제출해주세요.

   ```bash
   git checkout -b feature/awesome-feature
   ```

3. PR 제출 전 코드 린트와 테스트 통과 여부를 확인해주세요.

   ```bash
   npm run lint
   npm run test -- --run
   ```

### 라이선스 (License)

이 프로젝트는 **MIT License**를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 확인하세요.

---

<div align="center">
  <sub>Crafted with passion for subculture gamers around the world.</sub><br>
  <sub>© 2026 ChronoLedger Team. All rights reserved.</sub>
</div>
