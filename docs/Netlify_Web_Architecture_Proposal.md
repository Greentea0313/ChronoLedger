# ChronoLedger — Netlify 웹 버전 도입 검토 및 아키텍처 제안

- 문서명: Netlify 웹 배포 도입 의견서
- 대상 프로젝트: ChronoLedger
- 기준 SRS: `ChronoLedger SRS v1.0`
- 작성일: 2026-10-06 (2026-10-07 재검토)
- 상태: **제안 및 재검토 완료; 플랫폼 채택은 Deploy Preview 검증 대기**
- 우선 검증안: **기존 Next.js 정적 export + Netlify 정적 호스팅 + Supabase**
- 중요: 본 문서는 현재 SRS의 배포/실행 환경을 검토하여 웹 배포 방식을 구체화하기 위한 설계 제안이다.

## 사용자 검토 결과 (2026-10-07)

사용자는 웹사이트 개발을 우선하고 Netlify를 배포 플랫폼 후보로 고려하기로 했다. Android PWA 실기기 검증은 후순위로 보류한다. 아래 평가는 Netlify를 아직 최종 채택한 것으로 간주하지 않는다.

### 판단

- **Netlify를 웹 정적 호스팅 후보로 검증하는 것은 타당하다.** 현재 제품은 Supabase Auth/PostgreSQL/RLS/RPC/Storage를 사용하고, 실제 브라우저 OAuth 왕복도 client-side Supabase SDK로 동작했다. 웹 MVP에 Next.js SSR이나 Server Actions가 반드시 필요하다는 근거는 현재 없다.
- **제안서의 A안(웹 일반 Next.js 런타임 + Tauri 정적 export 이중 빌드)은 현 단계에서 과하다.** SRS와 Tauri 설정은 정적 export를 기준으로 하고 있다. Netlify가 App Router 서버 기능을 지원한다는 사실만으로 별도 웹 런타임과 빌드 분리를 도입할 필요는 없다.
- 우선 검증할 최소 경로는 **현재 Next.js `output: 'export'` 결과물을 Netlify에서 정적으로 제공하고, 웹/PWA 클라이언트는 기존대로 Supabase에 직접 연결하는 방식**이다. 성공하면 같은 정적 산출 방향을 Tauri와 공유해 기존 결정과 배포 복잡도를 보존한다.
- 정적 export의 제약이 실제 웹 요구사항을 막는 경우에만 Web 빌드와 Tauri 빌드를 분리한다. Netlify Functions/Next.js 서버 기능도 실제로 권한이 필요한 서버 작업 등 요구가 생긴 범위에 한해 별도로 검증한다.
- 계정 삭제 등 서버 권한 작업은 Netlify Functions로 구현할 수 있지만, 함수만으로 durable queue나 재시도 정책이 생기는 것은 아니다. 내구성 있는 작업 상태, 멱등성, backoff/reconciliation, 실패 관측을 별도 설계해야 한다. Netlify Scheduled Functions는 게시된 deploy에서 실행되며 UTC cron을 사용하므로 preview 검증 및 재시도 의미를 혼동하지 않는다.

### 채택 전 검증 게이트

작은 검증 브랜치/Deploy Preview에서 현재 프로젝트의 Next.js 14 정적 export가 정상 배포되는지 확인한다. 최소 점검은 `/auth`와 하위 경로 직접 열기, Supabase Google OAuth callback/허용 Redirect URL, 정적 파일 및 PWA service worker 경로, Preview/Production 환경 변수 분리다. production 데이터나 실제 계정 삭제 작업은 검증에 사용하지 않는다. 결과를 확인하기 전에는 Netlify와 빌드 타깃 모두 최종 채택으로 표시하지 않는다.

---

## 1. 문서 목적

ChronoLedger의 웹 버전을 `netlify.app` 기반으로 운영하는 방안을 검토하고, 현재 SRS에 정의된 기술 구조와 충돌 여부를 확인한다.

본 문서의 목표는 다음과 같다.

1. Netlify를 웹 배포 플랫폼으로 채택할지 결정하기 위한 근거를 제시한다.
2. Next.js + Supabase와 Netlify의 역할을 분리해 정의한다.
3. Tauri v2 데스크톱 및 Android PWA와의 공존 방식을 정리한다.
4. 현재 SRS의 `Next.js App Router 정적 export` 항목에서 발생하는 설계상의 차이를 명시한다.
5. 향후 구현 전에 확정해야 할 빌드/배포 규칙을 정의한다.

---

# 2. 결론

## 2.1 기존 권장 결정 (2026-10-07 재검토)

기존 제안은 ChronoLedger 웹 버전에서 **Next.js 일반 런타임 + Netlify + Supabase**를 권장했으나, 재검토에 따라 우선 검증 범위를 기존 정적 export 산출물의 Netlify 정적 호스팅으로 축소한다. 최종 플랫폼 선택은 Deploy Preview 후 결정한다.

우선 검증할 아키텍처는 다음과 같다.

```text
                         GitHub
                           │
                           ▼
                 ┌────────────────────┐
                 │ Netlify static host│
                 │ Next.js `out/`     │
                 └─────────┬──────────┘
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
         Supabase Auth  PostgreSQL   Storage
              │           │            │
              └───────────┼────────────┘
                          │
                    ChronoLedger
```

Netlify는 Deploy Preview에서 **정적 export 파일을 호스팅하는 후보**로 검증한다. 인증·데이터베이스·RLS·RPC·Storage는 기존 SRS대로 Supabase에서 담당한다. 플랫폼 최종 채택은 Preview 검증 전까지 보류한다.

---

# 3. SRS와의 관계

현재 SRS는 다음 실행 환경을 정의한다.

- Next.js App Router
- Windows용 Tauri v2 데스크톱 애플리케이션
- Android 모바일 PWA
- Supabase Auth
- PostgreSQL
- Supabase Storage

또한 클라이언트 항목에는 **`Next.js App Router 정적 export`**가 명시되어 있다.

정적 파일 호스팅은 기존 SRS와 정합한다. 웹 요구가 정적 export로 충족되지 않는다는 증거가 생길 때만 웹 배포와 Tauri의 렌더링 모델을 분리 검토한다.

이 문서에서는 다음과 같이 구분한다.

```text
Web/PWA
  → Next.js 정적 export
  → Netlify Deploy Preview에서 우선 검증

Tauri
  → 정적 프런트엔드 자산
  → Tauri WebView에서 실행

Android PWA
  → 웹 애플리케이션 기반
```

우선 동일한 정적 export 방향을 보존한다. 빌드 타깃 분리는 정적 export 제약이 구체적인 웹 요구를 막는 경우에만 검토한다.

---

# 4. Netlify 후보의 적합성

## 4.1 Next.js 정적 export와의 궁합

Netlify는 현재 Next.js App Router를 지원하며 SSR, ISR, SSG, Server Components, Server Actions, Route Handlers 등의 주요 Next.js 기능을 지원한다.

Netlify가 동적 Next.js 기능도 지원한다는 점은 향후 선택지지만, 현재 웹 MVP에서 해당 기능이 필요하다는 근거는 없다. 우선은 현재 정적 export를 검증한다.

### 향후 서버 런타임이 필요해지는 경우의 선택지

```text
Next.js App Router
        │
        ├── Static UI
        ├── Client Components
        ├── Server Components
        ├── Route Handlers
        └── Server Actions
                │
                ▼
             Netlify
```

단, ChronoLedger의 핵심 비즈니스 변경은 **Supabase RPC + RLS를 중심으로 유지**하는 것이 좋다. Netlify Server Actions/Route Handlers를 비즈니스 상태 변경의 필수 계층으로 만들 필요는 없다.

---

## 4.2 Supabase와의 역할 분리가 명확하다

ChronoLedger SRS는 이미 다음을 Supabase에 맡기도록 결정하고 있다.

```text
Supabase
├── Auth
├── PostgreSQL
├── RLS
├── RPC
└── Storage
```

이 구조와 Netlify는 역할이 겹치지 않는다.

```text
Netlify
└── Web Application Delivery

Supabase
├── Authentication
├── Data
├── Authorization
├── Transactional RPC
└── Private Storage
```

따라서 별도의 Express/Node.js 백엔드를 새로 추가하지 않아도 된다.

---

# 5. 현재 우선 검증 아키텍처

```text
┌──────────────────────────────────────────────────────────┐
│                     ChronoLedger                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Next.js App Router                                     │
│  ├── Dashboard                                           │
│  ├── Spending                                            │
│  ├── Statistics                                          │
│  ├── Games                                               │
│  ├── Subscriptions                                       │
│  ├── Wallets                                             │
│  ├── Settings                                            │
│  └── Admin                                               │
│                                                          │
│  Shared UI / Domain / Validation / Supabase Client      │
│                                                          │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
        ┌───────▼──────────┐    ┌───────▼─────────┐
        │ Netlify Preview  │    │     Tauri v2    │
        │ Static export    │    │ Desktop Target  │
        └───────┬───────┘       └────────┬────────┘
                │                         │
                └─────────────┬───────────┘
                              │
                     ┌────────▼────────┐
                     │    Supabase     │
                     ├─────────────────┤
                     │ Auth            │
                     │ PostgreSQL      │
                     │ RLS             │
                     │ RPC             │
                     │ Private Storage │
                     └─────────────────┘
```

---

# 6. 웹 버전 실행 구조

## 6.1 Netlify Deploy Preview (검증 대상)

기존 `output: 'export'` 산출물을 Netlify Deploy Preview에 배포해 동작을 검증한다. 최종 운영 플랫폼 채택은 Preview 결과 이후 결정한다.

```text
GitHub push
    ↓
Netlify Build
    ↓
Next.js production build
    ↓
Netlify deployment
    ↓
Web browser
```

Netlify는 Next.js 프로젝트를 Git provider와 연결하여 배포할 수 있으며, OpenNext 기반으로 Next.js의 주요 기능을 처리한다.

---

## 6.2 Desktop Target

Tauri v2는 서버 기반 SSR을 자체적으로 실행하는 플랫폼이 아니라 프런트엔드 웹 자산을 WebView에서 로드하는 구조이므로, Tauri에서는 정적 프런트엔드 자산을 생성하는 방향이 필요하다.

```text
Next.js source
      ↓
Desktop build target
      ↓
Static frontend assets
      ↓
Tauri WebView
      ↓
Supabase
```

따라서 웹과 데스크톱은 동일한 소스 코드를 공유하더라도 **빌드 타깃은 분리**하는 것이 안전하다.

---

# 7. 기존 빌드 전략 제안의 재검토

## 7.1 "웹도 static export인가?"

현재 SRS에는 정적 export가 명시되어 있지만, Netlify는 일반적인 Next.js App Router 실행 방식도 지원한다.

따라서 다음 둘 중 하나를 결정해야 한다.

### A안 — 기존 제안 (현 단계 비권장)

```text
Web
→ 일반 Next.js build
→ Netlify

Tauri
→ static/export-compatible build
→ Tauri
```

장점:

- 웹에서 Next.js 기능을 제한할 필요가 적다.
- Netlify의 App Router 지원을 자연스럽게 활용할 수 있다.
- 웹과 데스크톱의 배포 요구를 분리할 수 있다.

단점:

- 빌드 타깃이 2개다.
- Next.js 설정에서 Web/Desktop 차이를 관리해야 한다.
- 일부 기능은 두 타깃에서 동시에 동작하도록 제한해야 한다.

### B안 — 현재 우선 검증안

```text
Next.js
→ static export
→ Netlify
→ Tauri
```

장점:

- 빌드 구조가 단순하다.
- 웹과 데스크톱이 동일한 정적 결과물을 사용할 수 있다.

단점:

- 서버 기능 사용에 제약이 커진다.
- Next.js의 SSR/Server Actions/일부 Route Handler 활용이 제한될 수 있다.
- 장기적으로 웹 기능이 확대될 경우 재설계 가능성이 있다.

### 이전 제안의 권장 결론 재검토

이 문서의 기존 A안 권장은 서버 기능 수요가 실제로 생겼을 때 다시 검토한다. 현재 기본 권장은 Netlify에서 기존 정적 export를 먼저 검증하는 것이며, 정적 export로 충족할 수 없는 구체 요구가 확인되기 전에는 이중 빌드나 SRS 변경을 하지 않는다.

---

# 8. 비즈니스 로직의 위치

Netlify를 도입하더라도 핵심 데이터 변경 로직은 Supabase RPC에 유지한다.

```text
UI
 │
 ▼
Validation / UI state
 │
 ▼
Supabase RPC
 │
 ├── ownership validation
 ├── amount validation
 ├── state transition
 ├── asset update
 ├── wallet update
 └── ledger update
```

예를 들어 결제 확정은 다음과 같다.

```text
Payment Modal
     ↓
Confirm
     ↓
RPC
     ↓
┌─────────────────────────────┐
│ final_amount validation     │
│ ownership validation        │
│ point validation            │
│ asset change                │
│ wallet change               │
│ ledger insert               │
│ spending state transition   │
└─────────────────────────────┘
     ↓
Atomic success / rollback
```

이는 SRS에서 결제·환불·자산·포인트 변경을 원자적으로 처리하도록 정의한 방향과 일치한다.

---

# 9. 인증 구조

웹에서는 Supabase Auth를 사용한다.

```text
Browser
   │
   ▼
Supabase Auth
   │
   ├── Email
   └── Google OAuth
         │
         ▼
      Session
         │
         ▼
Next.js / Supabase access
```

로그아웃 또는 세션 만료 시 개인 데이터를 화면에 노출하지 않는다.

오프라인 상태에서는 SRS가 정한 것처럼 유효한 세션의 캐시 읽기만 허용하고 쓰기는 막는다.

---

# 10. 보안 원칙

Netlify를 추가해도 보안 경계는 바뀌지 않는다.

## 10.1 데이터 격리

```text
User
 ↓
Supabase Auth identity
 ↓
RLS
 ↓
Owner-scoped rows
```

## 10.2 비즈니스 상태 변경

클라이언트가 직접 데이터베이스 상태를 임의 변경하지 않고 검증된 RPC 경로를 사용한다.

## 10.3 Secret

다음과 같은 민감정보는 Git repository에 저장하지 않는다.

```text
.env.local
Netlify Environment Variables
Supabase secrets
```

브라우저에 노출 가능한 publishable key와 서버 전용 secret을 구분한다.

---

# 11. 추천 Repository 구조

하나의 repository에서 웹/데스크톱/모바일을 관리하는 구조를 권장한다.

```text
chronoledger/
│
├── app/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── spending/
│   │   ├── statistics/
│   │   ├── games/
│   │   ├── subscriptions/
│   │   ├── wallets/
│   │   ├── settings/
│   │   └── admin/
│   │
│   └── ...
│
├── components/
│   ├── calendar/
│   ├── sidebar/
│   ├── spending/
│   ├── statistics/
│   ├── games/
│   ├── subscriptions/
│   ├── wallets/
│   └── ui/
│
├── lib/
│   ├── supabase/
│   ├── domain/
│   ├── validation/
│   └── utils/
│
├── public/
│
├── src-tauri/
│   ├── src/
│   └── tauri.conf.json
│
├── supabase/
│   ├── migrations/
│   └── seed/
│
├── next.config.ts
├── package.json
├── netlify.toml
└── README.md
```

---

# 12. Build Target 관리

Web과 Desktop을 명시적으로 구분하는 것을 권장한다.

예:

```text
NEXT_BUILD_TARGET=web
```

또는

```text
NEXT_BUILD_TARGET=desktop
```

개념적으로는 다음과 같다.

```text
                 Shared Source
                      │
              ┌───────┴────────┐
              ▼                ▼
          Web Build       Desktop Build
              │                │
              ▼                ▼
          Netlify            Tauri
```

구체적인 `next.config.ts` 구현 방식은 실제 프로젝트 생성 단계에서 확정한다.

---

# 13. UI 관점에서 Netlify 도입의 영향

현재 UI Design Sheet의 화면 구조는 그대로 유지할 수 있다.

## Dashboard

```text
Calendar
   +
Detail Sidebar
```

## Spending

```text
Filter
   ↓
Spending Table
   ↓
Detail / Payment Modal
```

## Statistics

```text
Summary
   +
Charts
   +
Breakdown
```

## Games

```text
My Games
   +
Schedule
   +
Proposal
```

## Subscriptions

```text
Active Templates
   +
Generated Spending
```

## Wallets

```text
Google Play
Galaxy Store
Point Ledger
```

## Settings

```text
Finance
Budget
Account
```

## Admin

```text
Games
Schedules
Requests
```

Netlify는 이러한 UI 구조를 직접 결정하지 않고, **웹 애플리케이션을 배포·실행하는 역할**만 담당한다.

---

# 14. 오프라인 동작

오프라인 요구사항은 Netlify의 역할이 아니다.

구조는 다음과 같이 유지한다.

```text
                   ┌─────────────┐
                   │ Supabase    │
                   │ Online Data │
                   └──────┬──────┘
                          │
                    Online sync
                          │
                          ▼
                  ┌───────────────┐
                  │ Local Cache   │
                  └───────┬───────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
             Online              Offline
                │                   │
                ▼                   ▼
           Read / Write           Read only
                               Session invalid
                                     │
                                     ▼
                             Hide private cache
```

SRS에서 오프라인 쓰기를 큐잉하지 않는다는 규칙도 그대로 유지한다.

---

# 15. 배포 환경

최소한 다음 세 환경을 분리하는 것을 권장한다.

```text
Development
    ↓
Preview
    ↓
Production
```

## Development

```text
Local Next.js
Local Tauri
Supabase project
```

## Preview

```text
Git branch / Pull Request
        ↓
Netlify Preview
        ↓
Supabase development/staging
```

## Production

```text
main
 ↓
Netlify Production
 ↓
Supabase Production
```

Production 데이터베이스와 개발 데이터베이스를 혼용하지 않는다.

---

# 16. Environment Variables

개념적인 구성은 다음과 같다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

추가적인 서버 전용 secret이 필요할 경우에는 Netlify의 환경 변수에 별도로 저장한다.

환경 변수의 실제 이름과 필요 범위는 Supabase/Next.js 프로젝트 초기화 시 확정한다.

---

# 17. CI/CD

권장 흐름:

```text
Developer
   │
   ▼
Git branch
   │
   ▼
Pull Request
   │
   ├── lint
   ├── typecheck
   ├── unit tests
   └── build
           │
           ▼
      Netlify Preview
           │
           ▼
      Review / QA
           │
           ▼
        Merge
           │
           ▼
       Production
```

데이터베이스 migration은 애플리케이션 배포와 별도의 명시적인 단계로 관리한다.

---

# 18. Netlify를 사용할 경우에도 별도 서버가 필요한가?

**MVP 기준으로는 별도의 Express/Node.js API 서버를 추가할 필요가 없다.**

권장 구조:

```text
Next.js
   │
   └── Supabase
```

필요해질 경우에만:

```text
Next.js
   │
   ├── Netlify Functions / Route Handlers
   │
   └── Supabase
```

를 추가한다.

즉, 서버를 처음부터 하나 더 운영하지 않는다.

---

# 19. 대안 비교

| 항목 | Netlify + Next.js | Vercel + Next.js | 직접 Node 서버 |
|---|---|---|---|
| Next.js 통합 | 높음 | 매우 높음 | 직접 구성 |
| 배포 난이도 | 낮음 | 낮음 | 높음 |
| Supabase 사용 | 적합 | 적합 | 적합 |
| 별도 서버 관리 | 불필요 | 불필요 | 필요 |
| MVP 적합성 | 높음 | 높음 | 낮음 |
| Tauri 공존 | 가능 | 가능 | 가능 |
| 운영 복잡도 | 낮음 | 낮음 | 높음 |

본 프로젝트에서 Netlify를 선택하는 핵심 이유는 특정 플랫폼 종속보다 **현재 SRS와 UI의 요구를 충족하면서 운영 구조를 단순하게 유지할 수 있다는 점**이다.

---

# 20. 현재 우선 검증 구조

```text
                         GitHub
                           │
                           ▼
                 ┌────────────────────┐
                 │ Netlify static host│
                 │ Next.js `out/`     │
                 └─────────┬──────────┘
                          │
                   Web / Android PWA
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          Supabase      Supabase    Supabase
            Auth       PostgreSQL   Storage
              │           │           │
              └───────────┼───────────┘
                          │
                 ┌────────▼────────┐
                 │ ChronoLedger    │
                 │ Business Rules  │
                 │ RPC / RLS       │
                 └────────┬────────┘
                          │
                          ▼
                    Tauri v2
               동일한 정적 산출 방향
```

---

# 21. SRS 변경 여부

Deploy Preview 검증 결과가 나오기 전에는 승인된 정적 export/Tauri 방향을 변경하거나 SRS에 Netlify 채택을 반영하지 않는다.

---

# 22. 남은 검증 사항

현재 `output: 'export'` 산출물의 Deploy Preview를 확인한다. `/auth` 및 하위 경로 직접 접근, Google OAuth callback/Redirect URL, 정적 자산과 service worker 경로, Preview/Production 환경 변수 분리를 검증한다. 결과에 따라 Netlify 채택 여부를 결정하고, 정적 export로 충족할 수 없는 요구가 확인된 경우에만 런타임/빌드 구조 변경을 별도 검토한다.

---

# 23. 기존 제안의 최종 판단 (2026-10-07 재검토)

Netlify는 타당한 웹 호스팅 후보이며, 우선 기존 정적 export를 Netlify Deploy Preview에서 검증한다. 기존 A안인 일반 Next.js 웹 런타임과 Tauri 정적 빌드 분리는 현재 요구에서 필요성이 입증되지 않았다. Preview 검증에서 정적 export 제약이 구체적인 웹 요구를 막는 것이 확인되는 경우에만 서버 런타임과 빌드 분리를 다시 결정한다.

---

# 24. 참고 자료

- Netlify — Next.js on Netlify
  https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify — Scheduled Functions
  https://docs.netlify.com/build/functions/scheduled-functions/
- Next.js — Static Exports
  https://nextjs.org/docs/app/guides/static-exports

- Supabase — Use Supabase with Next.js
  https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

- Supabase — Auth with Next.js App Router
  https://supabase.com/docs/guides/auth/quickstarts/nextjs

- Tauri — Frontend Configuration
  https://v2.tauri.app/start/frontend/

- Tauri — Configuration
  https://v2.tauri.app/reference/config/

---

# 25. 문서 상태

이 문서는 **Netlify 도입에 대한 설계 제안**이며, SRS 자체를 자동으로 변경하지 않는다.

다음 설계 단계에서는 이 문서를 기준으로:

1. Software Architecture Design
2. Next.js directory structure
3. Web/Desktop build configuration
4. Supabase client boundary
5. Authentication flow
6. Netlify deployment configuration
7. Tauri build pipeline

을 구체화한다.
