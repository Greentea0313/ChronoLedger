# ChronoLedger — 웹 배포 플랫폼 평가 및 아키텍처 제안서 (Cloudflare Pages / Supabase / Tauri)

- **문서명**: 웹 배포 플랫폼 다각화 평가 및 아키텍처 제안서 (구 Netlify 웹 배포 도입 의견서)
- **대상 프로젝트**: ChronoLedger
- **기준 SRS**: `ChronoLedger SRS v1.0`
- **최초 작성일**: 2026-10-06 (2026-10-07 재검토)
- **전면 리팩토링 및 갱신일**: **2026-10-13 (배포 플랫폼 다각화 종합 평가 및 Cloudflare Pages + Supabase pg_cron 최적화 권장안 확정)**
- **상태**: **최종 아키텍처 확정 및 이관 단계 준비**
- **최종 권장안**: **Next.js 14 정적 export(`out/`) + Cloudflare Pages(웹/PWA 호스팅) + Supabase(Auth/DB/Storage/pg_cron)**

---

## 1. 개요 및 핵심 요약 (Executive Summary)

본 문서는 ChronoLedger의 상용 및 지속 가능한 무료 운영을 위해 웹 배포 플랫폼(Netlify, Cloudflare Pages, Vercel, GitHub Pages)의 운영 리스크와 비용 구조를 비교 분석하고, 가장 안정적이고 유지보수 비용이 들지 않는 최종 타깃 인프라 아키텍처를 정의합니다.

### 핵심 결정 사항
1. **정적 프론트엔드와 데이터베이스 워커의 완전한 인프라 분리**:
   - 웹 호스팅 플랫폼에 5분 주기 Cron 백그라운드 워커를 결합하지 않고, 정적 자산 호스팅(Cloudflare Pages)과 데이터베이스 스케줄러(Supabase `pg_cron`)로 역할을 분리합니다.
2. **웹 호스팅 플랫폼으로 Cloudflare Pages 채택 (최우선 권장)**:
   - Netlify의 무료 한도(월 300분 빌드, 월 100GB 대역폭 초과 시 사이트 정지 하드 리밋)를 원천 극복하기 위해 **대역폭 완전 무제한 무료, 월 500회 빌드 무료**를 제공하는 Cloudflare Pages를 채택합니다.
3. **단일 정적 export 산출물(`out/`) 공유 원칙 유지**:
   - 웹과 Tauri v2 데스크톱을 위해 별도의 이중 빌드(SSR vs Static)를 두지 않고, 현재 확정된 Next.js 14 `output: 'export'` 단일 결과물을 웹, Android PWA, 데스크톱 WebView가 100% 동일하게 공유합니다.
4. **회계 및 데이터 정합성은 Supabase RPC + RLS로 원자적 보장**:
   - 모든 결제, 환불, 자산 차감, 포인트 적립은 클라이언트나 웹 호스팅 서버리스 계층이 아닌 Supabase PostgreSQL의 `SECURITY DEFINER` RPC에서 원자적으로 처리합니다.

---

## 2. 배포 플랫폼 비교 분석 및 리스크 평가

ChronoLedger는 `next.config.mjs`에 `output: 'export'`가 적용되어 순수 HTML/JS/CSS 정적 파일(`out/`)로 빌드되며, 백엔드는 Supabase(Auth, Database, Storage)에 직접 통신합니다.

### 2.1 플랫폼별 적합도 비교 매트릭스

| 평가 항목 | Cloudflare Pages + Workers | Vercel | Netlify (현행) | GitHub Pages |
| :--- | :---: | :---: | :---: | :---: |
| **종합 적합도** | **95점 (1위, 최우선 권장)** | **88점 (2위)** | **80점 (3위)** | **75점 (4위)** |
| **월간 대역폭 (트래픽)** | **완전 무제한 (무료)** | 100 GB | 100 GB | 100 GB |
| **초과 시 정책** | 차단 없음 (소프트 한도 없음) | 대역폭 추가 과금 또는 경고 | **사이트 즉시 정지 (Paused, 하드 리밋)** | 트래픽 제한 경고 |
| **월간 빌드 리소스** | **월 500회 빌드 (시간 무제한)** | 월 6,000분 (100시간) | **월 300분 (5시간)** | GitHub Actions 2,000분 |
| **무료 Cron Job 주기** | 1분 주기 지원 (Workers Cron) | **1일 1회 제한 (0 0 * * *)** | 5분 주기 지원 (Scheduled Functions) | 지원 안 함 (Actions 필요) |
| **글로벌 CDN 성능** | 최상 (Cloudflare Anycast 엣지) | 최상 (Vercel Edge Network) | 우수 | 양호 |
| **Tauri와의 빌드 정합성** | 완벽 일치 (`out/` 정적 호스팅) | 완벽 일치 (`out/` 정적 호스팅) | 완벽 일치 (`out/` 정적 호스팅) | 완벽 일치 (`out/` 정적 호스팅) |

### 2.2 Netlify 무료 플랜의 실질적 운영 리스크
1. **월 300분 빌드 한도의 조기 소진**:
   - Next.js 프로덕션 빌드는 매 실행 시 약 1분~1.5분이 소요됩니다. 커밋, PR 프리뷰, 브랜치 병합이 빈번할 경우 월 중순에 300분이 쉽게 전소되어 신규 배포가 전면 차단됩니다.
2. **하드 리밋(Hard Limit)에 의한 사이트 자동 정지**:
   - Netlify 무료 티어는 빌드 시간이나 대역폭(월 100GB) 초과 시, 추가 과금 대신 **사이트 전체를 일시 정지(Paused)** 처리하여 일반 방문자에게 *"Site not available"* 에러를 노출합니다 (결제 주기 갱신 시까지 복구 불가).
3. **5분 주기 Cron 워커의 플랫폼 결합**:
   - 계정 탈퇴 워커(`account-deletion-worker`)가 웹 호스팅 플랫폼에 묶여 있어, 웹 플랫폼 리소스 소진 시 계정 정리 작업까지 함께 중단되는 결합 리스크가 발생합니다.

---

## 3. 최종 권장 시스템 아키텍처

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      ChronoLedger Client Layer                         │
│               (Next.js 14 Static Export — `out/` 산출물)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │    Cloudflare Pages    │      │        Tauri v2        │
       │  (웹 / Android PWA)    │      │  (데스크톱 앱 WebView) │
       │  • 대역폭 완전 무제한  │      │  • 동일 정적 자산 로드 │
       │  • 월 500회 빌드 무료  │      └────────────┬───────────┘
       └────────────┬───────────┘                   │
                    │                               │
                    └───────────────┬───────────────┘
                                    │ (Client-side Supabase SDK / HTTPS)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                        Supabase                        │
       ├────────────────────────────────────────────────────────┤
       │ • Auth: Google OAuth (PKCE) 및 이메일 인증             │
       │ • PostgreSQL: RLS 데이터 격리 및 트랜잭션 RPC          │
       │ • Storage: user-icons 비공개 버킷                      │
       │ • pg_cron: 5분 주기 탈퇴 처리 워커 (DB 내부 완결)      │
       └────────────────────────────────────────────────────────┘
```

### 아키텍처 핵심 원칙
1. **Cloudflare Pages 정적 딜리버리**:
   - `npm run build`로 생성되는 정적 `out/` 디렉터리를 배포합니다.
   - 단일 페이지 애플리케이션(SPA) 라우팅을 위해 0ms 즉시 리다이렉트가 기본 제공됩니다.
2. **Supabase Database 내부 `pg_cron` 워커**:
   - 5분마다 실행되는 계정 삭제 작업(`account-deletion-worker`)을 외부 서버리스 HTTP 호출 대신 **PostgreSQL 내부 `pg_cron` 익스텐션**으로 등록합니다.
   - 네트워크 지연(오버헤드)이 전혀 없고, 웹 배포 플랫폼의 크레딧을 단 1초도 소모하지 않습니다.
3. **단일 빌드 파이프라인**:
   - 웹(Cloudflare Pages)과 데스크톱(Tauri v2) 간의 분기 빌드 없이 단일 소스, 단일 빌드 설정을 영구적으로 유지합니다.

---

## 4. 컴포넌트 및 서비스별 책임 분장

| 컴포넌트 | 담당 인프라 | 세부 역할 및 책임 |
| :--- | :--- | :--- |
| **웹 프론트엔드** | Cloudflare Pages | • Next.js 14 정적 HTML/CSS/JS 에셋 글로벌 CDN 서빙<br>• 브라우저 클라이언트 렌더링 및 로컬 캐시 관리 |
| **모바일 앱** | Android PWA | • Cloudflare Pages에서 PWA manifest 및 Service Worker 캐싱<br>• 홈 화면 설치 및 독립 실행 환경 제공 |
| **데스크톱 앱** | Windows Tauri v2 | • Rust 기반 로컬 WebView에서 동일한 `out/` 정적 에셋 로드<br>• OS 네이티브 윈도우 프레임 제공 |
| **사용자 인증** | Supabase Auth | • Google OAuth 2.0 및 이메일 기반 세션 발급/갱신<br>• JWT 토큰 기반 클라이언트 신원 확인 |
| **데이터 및 비즈니스 로직** | Supabase PostgreSQL | • Row Level Security (RLS) 기반 사용자별 데이터 엄격 격리<br>• 지출 결제/환불, 포인트 적립, 자산 차감 RPC 원자적 수행 |
| **미디어 스토리지** | Supabase Storage | • 사용자 프로필 및 게임 아이콘 비공개 WebP 저장소(`user-icons`) |
| **백그라운드 스케줄러** | Supabase `pg_cron` | • 5분 주기 30일 경과 계정 영구 삭제 및 연관 데이터 안전 정리 |

---

## 5. 실제 프로젝트 구조 및 파일 매핑

현재 실제 코드베이스는 `src/` 구조를 엄격히 준수하고 있으며, 불필요한 서버리스 계층 없이 클라이언트와 데이터베이스가 직접 통신합니다.

```text
ChronoLedger/
├── src/
│   ├── app/                      # Next.js 14 App Router (정적 페이지)
│   │   ├── auth/                 # 로그인 및 OAuth 콜백 라우트
│   │   ├── dashboard/            # 대시보드 메인
│   │   │   ├── expenses/         # 소비 관리 및 카테고리/픽업 차트 통계
│   │   │   ├── games/            # 구독 게임 카탈로그 및 12개 페이지네이션
│   │   │   └── settings/         # 자산/예산 및 계정 탈퇴 신청 화면
│   │   └── admin/                # 관리자 게임/일정 마스터 관리
│   ├── components/               # 재사용 UI 컴포넌트
│   │   ├── expense/              # 지출 모달 (결제일 기준 픽업 자동 바인딩)
│   │   ├── finance/              # 수익 추가 모달
│   │   ├── subscription/         # 정기 구독 모달
│   │   └── ui/                   # Radix UI 기반 기본 컨트롤
│   └── lib/                      # 순수 도메인 함수 및 Supabase 클라이언트
│       ├── supabase/client.ts    # Client-side Supabase SDK 인스턴스
│       └── payment-calculations.ts # 포인트/결제 계산 순수 함수
├── public/                       # 정적 아이콘, PWA manifest, _redirects
├── src-tauri/                    # Tauri v2 데스크톱 프로젝트 (동일 out/ 공유)
├── md/                           # DB 스키마, 마이그레이션 SQL (SCHEMA.sql 등)
├── next.config.mjs               # output: 'export' 설정
└── package.json
```

---

## 6. Cloudflare Pages + Supabase pg_cron 이관 실행 계획 (Action Plan)

### Step 1. Supabase Database `pg_cron` 탈퇴 워커 프로시저 등록
1. Supabase SQL Editor에서 `pg_cron` 확장을 활성화합니다.
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```
2. 기존 Netlify Functions(`account-deletion-worker.ts`)의 비즈니스 로직을 PostgreSQL 저장 프로시저로 생성합니다.
   - 신청 후 30일 경과(`status = 'PENDING' AND scheduled_purge_at <= NOW()`) 계정 탐색.
   - 연관 테이블(`expenses`, `subscription_templates`, `user_games`, `user_finances`, `store_wallets`) 삭제.
   - `auth.users` 영구 삭제.
3. 5분 주기 cron job 등록:
   ```sql
   SELECT cron.schedule('purge-deleted-accounts', '*/5 * * * *', 'CALL process_account_purges()');
   ```

### Step 2. Cloudflare Pages 프로젝트 생성 및 Git 연동
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) $\to$ **Workers & Pages** $\to$ **Create Application** $\to$ **Pages** 선택.
2. ChronoLedger GitHub 저장소(`Greentea0313/ChronoLedger`) 연결.
3. 빌드 구성 설정:
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`

### Step 3. 환경 변수 등록
Cloudflare Pages 프로젝트 설정 $\to$ **Environment variables**에 프로덕션/미리보기 변수 등록:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 API 키

### Step 4. Supabase Redirect URL 갱신
1. Supabase Dashboard $\to$ **Authentication** $\to$ **URL Configuration** 이동.
2. Cloudflare Pages 배포 도메인(예: `https://chronoledger.pages.dev/auth/callback` 및 커스텀 도메인)을 **Redirect URLs** 허용 목록에 추가.

### Step 5. Netlify 정리 및 DNS 전환
1. 커스텀 도메인을 Cloudflare Pages로 CNAME 레코드 전환.
2. 기존 Netlify 대시보드에서 프로젝트 연결 해제 또는 아카이브 처리.

---

## 7. 부록: 이전 검토 이력 보존 (Archived History)

<details>
<summary><b>[2026-10-06 ~ 2026-10-07] Netlify 초기 도입 검토 및 Draft Deploy 검증 기록 펼치기</b></summary>

### 1. 초기 도입 배경
- 2026-10-06 작성 당시, Next.js 웹 호스팅의 간편한 연결을 위해 Netlify가 초기 검토 후보로 선정됨.
- 당시 검토되었던 **A안(Web 일반 Next.js SSR + Desktop Tauri 정적 export 이중 빌드 분리)**은 개발 및 유지보수 복잡도가 지나치게 높고, ChronoLedger는 Supabase client SDK와 RPC로 모든 상태를 제어하므로 서버 런타임이 불필요하다는 결론에 따라 **기각(B안 정적 export 유지 채택)**됨.

### 2. 2026-10-07 Draft Deploy 검증 결과
- `chronoledger-validation-20261007` 임시 배포 환경에서 다음 항목이 정상 검증됨:
  - `output: 'export'` 정적 산출물 기반 웹 라우팅 정상 동작.
  - `/auth` 직접 접근 및 보호된 대시보드 리다이렉트 확인.
  - Google OAuth 왕복 및 세션 유지 정상 확인.
- 결론: ChronoLedger 웹 애플리케이션은 서버 런타임 없이 순수 정적 호스팅만으로 100% 완벽하게 동작함이 실증됨.

### 3. 2026-10-13 재평가 결론
- Draft 검증을 통해 "정적 호스팅 + Supabase"의 기술적 타당성은 입증되었으나, Netlify의 무료 티어 제한(월 300분 빌드, 대역폭 100GB 초과 시 사이트 정지 하드 리밋)이 지속적인 운영에 위험 요소로 식별됨.
- 이에 따라 동일한 정적 산출물(`out/`)을 지원하면서 대역폭이 무제한 무료이고 빌드 제약이 없는 **Cloudflare Pages**로의 이관을 최종 권장안으로 확정함.

</details>

---

## 8. 결론 및 향후 로드맵

ChronoLedger는 순수 정적 프론트엔드(`out/`)와 완벽한 Supabase 백엔드로 분리 설계되어 있으므로, 호스팅 플랫폼 전환에 따른 코드 수정이 거의 발생하지 않습니다.

* **현 상태**: Netlify 기반으로 배포 및 기능 검증 완료 (`main` 브랜치).
* **향후 권장 작업**: 운영 안정성과 비용 위험 제거를 위해 위의 Step 1~4에 따라 **Cloudflare Pages 및 Supabase `pg_cron`으로 무중단 이관**을 진행합니다.
