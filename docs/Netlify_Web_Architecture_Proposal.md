# ChronoLedger — Netlify 웹 버전 도입 검토 및 아키텍처 제안

- 문서명: Netlify 웹 배포 도입 의견서
- 대상 프로젝트: ChronoLedger
- 기준 SRS: `ChronoLedger SRS v1.0`
- 작성일: 2026-10-06
- 상태: **제안(Decision Proposal)**
- 권장안: **Next.js App Router + Netlify + Supabase**
- 중요: 본 문서는 현재 SRS의 배포/실행 환경을 검토하여 웹 배포 방식을 구체화하기 위한 설계 제안이다.

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

## 2.1 권장 결정

ChronoLedger의 웹 버전은 **Netlify를 프런트엔드 웹 배포 플랫폼으로 사용하는 것을 권장한다.**

권장 아키텍처는 다음과 같다.

```text
                         GitHub
                           │
                           ▼
                     ┌──────────┐
                     │ Netlify  │
                     │          │
                     │ Next.js  │
                     │   Web    │
                     └────┬─────┘
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
         Supabase Auth  PostgreSQL   Storage
              │           │            │
              └───────────┼────────────┘
                          │
                    ChronoLedger
```

Netlify는 **웹 애플리케이션을 실행·배포하는 계층**으로 사용하고, 인증·데이터베이스·RLS·RPC·Storage는 기존 SRS대로 Supabase에서 담당한다.

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

따라서 Netlify 도입 자체는 SRS와 충돌하지 않지만, **웹 배포 방식과 Tauri 실행 방식의 요구가 서로 다른 렌더링 모델을 요구할 수 있다는 점**을 별도로 관리해야 한다.

이 문서에서는 다음과 같이 구분한다.

```text
Web
  → Netlify
  → 일반적인 Next.js 웹 실행

Tauri
  → 정적 프런트엔드 자산
  → Tauri WebView에서 실행

Android PWA
  → 웹 애플리케이션 기반
  → 모바일 브라우저/PWA 실행
```

즉, **하나의 소스 코드베이스를 공유하되 빌드 대상별 실행 전략을 분리**하는 것을 권장한다.

---

# 4. 왜 Netlify를 추천하는가

## 4.1 Next.js와의 궁합

Netlify는 현재 Next.js App Router를 지원하며 SSR, ISR, SSG, Server Components, Server Actions, Route Handlers 등의 주요 Next.js 기능을 지원한다.

따라서 웹 버전에서 향후 동적 렌더링이 필요해지더라도 정적 사이트 호스팅에만 묶이지 않는다.

### 제안

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

# 5. 권장 전체 아키텍처

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
        ┌───────▼───────┐       ┌───────▼─────────┐
        │    Netlify    │       │     Tauri v2    │
        │   Web Target  │       │ Desktop Target  │
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

## 6.1 Web Target

웹 버전은 Netlify에서 다음과 같이 운영한다.

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

# 7. 가장 중요한 설계 결정

## 7.1 "웹도 static export인가?"

현재 SRS에는 정적 export가 명시되어 있지만, Netlify는 일반적인 Next.js App Router 실행 방식도 지원한다.

따라서 다음 둘 중 하나를 결정해야 한다.

### A안 — 권장

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

### B안

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

### 권장 결론

**A안을 채택한다.**

단, A안을 실제 확정하면 SRS의 `정적 export` 표현을 **"실행 대상에 따라 Web/desktop build target을 분리한다"**는 방향으로 갱신해야 한다.

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

# 20. 추천 최종 구조

```text
                         GitHub
                           │
                           ▼
                     ┌──────────┐
                     │ Netlify  │
                     │   Web    │
                     └────┬─────┘
                          │
                     Next.js Web
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
             ┌────────────┴────────────┐
             ▼                         ▼
          Tauri v2                 Android PWA
          Windows                 Mobile Web
```

---

# 21. SRS 변경 제안

현재 SRS의 실행 환경 항목은 다음 방향으로 보완하는 것을 권장한다.

### 기존 개념

```text
Next.js App Router 정적 export
Windows Tauri v2
Android PWA
```

### 권장 개념

```text
Client:
- Next.js App Router
- Web deployment: Netlify
- Windows: Tauri v2
- Android: PWA

Build:
- Web build target
- Desktop static build target

Services:
- Supabase Auth
- PostgreSQL / RLS / RPC
- Private Storage
```

즉, **"모든 타깃이 동일한 정적 export 결과물을 사용한다"**는 식으로 이해하지 않도록 명시한다.

---

# 22. 결정해야 할 사항

Netlify 도입 자체는 권장하지만, 개발 착수 전에 다음 한 가지를 명확히 결정해야 한다.

## Build Strategy

### Recommended

```text
WEB
Next.js → Netlify

DESKTOP
Next.js static-compatible build → Tauri

MOBILE
Web/PWA → Next.js web deployment
```

이 결정을 SRS와 Software Architecture Design에 반영한다.

---

# 23. 최종 판단

## 결정

**ChronoLedger 웹 버전의 배포 플랫폼으로 Netlify를 채택하는 것을 권장한다.**

### 채택 이유

- 현재 Next.js App Router 구조와 잘 맞는다.
- Supabase가 인증/DB/RLS/RPC/Storage를 담당하고 있어 별도 백엔드 서버가 필수가 아니다.
- 웹 배포와 CI/CD 구성이 단순하다.
- 향후 SSR/Route Handler/Server Action이 필요해져도 확장 여지가 있다.
- Tauri v2 및 Android PWA와 하나의 코드베이스에서 공존할 수 있다.

### 단서

**Tauri는 정적 프런트엔드 자산을 필요로 하므로 Web과 Desktop의 빌드 타깃을 분리하는 구조를 권장한다.**

따라서 Netlify 도입을 최종 확정할 경우 SRS의 배포/빌드 관련 문구도 함께 갱신한다.

---

# 24. 참고 자료

- Netlify — Next.js on Netlify
  https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/

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
