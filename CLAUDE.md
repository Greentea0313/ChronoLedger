# ChronoLedger Instructions for Claude Code

## 1. Core Rule Imports

Claude Code 세션 시작 시 다음 규칙 파일을 우선 로드하고 준수합니다:

- `@.agents/rules/language.md` — [.agents/rules/language.md](.agents/rules/language.md) (한국어 소통 원칙)
- `@.agents/rules/collaboration.md` — [.agents/rules/collaboration.md](.agents/rules/collaboration.md) (5대 AI 모델 역할 분배, 하이브리드 위임 및 비상 인계 규칙)
- `@.agents/rules/handoff.md` — [.agents/rules/handoff.md](.agents/rules/handoff.md) (`"인수인계 문서를 확인해"` 자동 실행 및 문서 갱신 규칙)
- `@.agents/rules/agent_rules.md` — [.agents/rules/agent_rules.md](.agents/rules/agent_rules.md) (핵심 코딩 행동 수칙)
- `@.agents/rules/document_location.md` — [.agents/rules/document_location.md](.agents/rules/document_location.md) (문서 위치 및 분류 규칙)

## 2. Claude 모델 핵심 역할 (Role & Fallback)

ChronoLedger 5대 AI 모델 협업 아키텍처에서 Claude(Claude Pro: Fable / Opus / Sonnet)의 역할은 다음과 같습니다:

- **Claude Pro 환경 지원 및 세부 운용 기준**:
  - **`Claude Fable` / `Claude Opus`**: 고난도 복합 상태·브라우저 생명주기 제어(History API, 비동기 레이스 컨디션 등), 아키텍처 리팩토링, Base $\leftrightarrow$ Target SHA 심층 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증 및 `Gemini 4 Argon` / `GPT Codex` 1순위 대체(Fallback 1) 전담.
  - **`Claude Sonnet`**: 명확히 구체화된 다중 컴포넌트 UI 인터랙션·상태 연동 구현 및 단위 테스트 작성 전담 (Fable/Opus 쿼터 절약 및 고속 구현).
- **기본 역할: `Reviewer & Maker (Complex)`**
  - **정적 코드 리뷰**: Base SHA $\leftrightarrow$ Target SHA 비교 정적 코드 검토를 수행하고 `artifacts/schemas/review.schema.json` 규격에 맞는 `review.json` 생성.
  - **보안 및 무결성 검증**: Supabase RLS 정책, SQL 트리거, 원장 무결성 및 권한/트랜잭션 검증.
  - **복합 리팩토링 및 인터랙션**: 다중 컴포넌트 간 복합 상태 관리, 비동기 파이프라인, 아코디언/드로어 인터랙션 구현 및 아키텍처 리팩토링.
- **대체(Fallback) 역할: 1순위 대체 모델 (Fallback 1)**
  - **Gemini 4 Argon**(`Orchestrator & Architect`) 토큰 소진 시: 1순위 대체 모델로서 오케스트레이션 및 아키텍처 결정 승계 (`Claude Fable / Opus`).
  - **GPT Codex**(`Maker - Core & Test`) 토큰 소진 시: 1순위 대체 모델로서 원장/결제/구독 핵심 로직 구현 및 Vitest 단위 테스트 승계 (`Claude Fable / Opus / Sonnet`).

## 3. "인수인계 문서를 확인해" 자동 실행 프로토콜

사용자가 `"인수인계 문서를 확인해"` (또는 인수인계 확인 요청)를 입력하면, 추가 질문 없이 즉시 아래 6단계를 자동 실행합니다:

1. **큐 확인**: `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue`를 읽습니다.
2. **과제 식별**: 상태가 `⚠️ HANDOVER_NEEDED`(1순위) 또는 `▶ READY`(2순위)인 과제를 식별합니다.
3. **강제 중단 복구**: 이전 모델이 쿼터/토큰 초과로 상태를 갱신하지 못하고 강제 종료된 경우, 대상 Worktree(`.worktrees/<run_id>` 또는 `main`)에서 `git status --short`와 `git diff`를 먼저 스캔하여 미커밋 변경사항을 파악한 뒤 이어서 완수합니다.
4. **스킬 지침 준수**: 역할별 작업 수행 시 `.agents/skills/` 하위의 스킬 지침을 반드시 준수합니다:
   - 리뷰어: [.agents/skills/chronoledger-reviewer/SKILL.md](.agents/skills/chronoledger-reviewer/SKILL.md)
   - 메이커: [.agents/skills/chronoledger-maker/SKILL.md](.agents/skills/chronoledger-maker/SKILL.md)
   - 오케스트레이터: [.agents/skills/chronoledger-orchestrator/SKILL.md](.agents/skills/chronoledger-orchestrator/SKILL.md)
   - 인수인계 프로토콜: [.agents/skills/handoff/SKILL.md](.agents/skills/handoff/SKILL.md)
5. **비상 인계 체크포인트**: 작업 도중 토큰/컨텍스트 부족 감지 시 `docs/handoff.md`의 과제 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고, `### 📌 중단 체크포인트 (Handover Checkpoint)`에 완료/남은 작업/검증 상태를 기록한 뒤 대체 모델 전환을 사용자에게 안내합니다.
6. **완료 및 문서 최신화**: 작업 완료 시 Dispatch Queue 상태를 `✅ DONE (SHA: <커밋해시>)`으로 갱신하고 다음 순서 행을 `▶ READY`로 전환하며, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md`를 최신화합니다.

## 4. 프로젝트 주요 문서 및 코드 경로 안내

- **기획 및 스펙 권위 문서**:
  - `docs/spec/SRS.md` (소프트웨어 요구사항 명세서, 최우선 기능 권위)
  - `docs/spec/SPEC.md` (기능 및 UI 세부 명세 요약)
  - `docs/spec/revisions_and_decisions.md` (기획 의사결정 및 히스토리)
  - `docs/spec/ChronoLedger_UI_Design_Sheet.md` (UI 디자인 시트 및 레이아웃 가이드)
- **DB 스키마 및 마이그레이션**:
  - `sql/SCHEMA.sql` (공식 기준 DB 스키마 DDL)
  - `sql/*.sql` (기능별 마이그레이션 및 시드 스크립트)
- **운영 및 인수인계 문서**:
  - `docs/handoff.md` (활성 인수인계 큐 및 세션 인계 체크포인트)
  - `docs/to-do.md` (전체 로드맵 및 단계별 태스크 백로그)
  - `docs/progress.md` (작업 진행 상황 및 마일스톤 로그)
  - `docs/changelog.md` (변경 이력 로그)
  - `docs/architecture.md` (시스템 아키텍처 및 모듈 구조)
  - `docs/known-pitfalls.md` (기억해야 할 함정 및 트러블슈팅 가이드)
- **협업 산출물 및 검증 스크립트**:
  - `artifacts/schemas/review.schema.json` (코드 리뷰 아티팩트 JSON 스키마)
  - `artifacts/schemas/test.schema.json` (테스트 결과 아티팩트 JSON 스키마)
  - `scripts/collaboration/New-CollaborationRun.ps1` (격리 협업 Worktree 생성 스크립트)
  - `scripts/collaboration/validate_collaboration_artifact.py` (아티팩트 스키마 검증 스크립트)

## 5. 개발 명령어

Node 20(`.nvmrc`). Supabase 접속 정보는 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`이며, 없으면 `src/lib/supabase/client.ts`가 import 시점에 throw합니다.

```bash
npm run dev                      # Next.js 개발 서버 (localhost:3000)
npm run build                    # 정적 export → out/
npm run lint                     # next lint (next/core-web-vitals + next/typescript)
npm run test -- --run            # Vitest 단일 실행 (기본 `npm run test`는 watch 모드)
npx vitest run src/lib/budget-calculations.test.ts   # 단일 파일
npx vitest run -t "테스트 이름"                        # 이름 필터
npm run tauri dev                # Windows 데스크톱(Tauri v2) 개발 실행
python scripts/collaboration/validate_collaboration_artifact.py <json>  # 협업 아티팩트 검증
```

- `npm run dev` 실행 중에 `npm run build`를 돌리면 `.next` 청크가 덮어써져 dev 서버가 깨집니다. 복구: dev 서버 중지 → `.next` 삭제 → 재시작.
- Vitest는 `.worktrees/**`를 제외합니다. 이 exclude를 지우면 중첩 worktree 테스트가 중복 실행되고 React 인스턴스 충돌이 납니다.

## 6. 아키텍처 개요

**단일 Next.js 14 App Router 코드베이스 → 정적 export(`output: 'export'`, `images.unoptimized`)**. 서버 런타임이 없으므로 모든 페이지는 클라이언트 컴포넌트이고, 백엔드는 전부 Supabase(Auth / PostgreSQL+RLS / Storage / pg_cron)입니다. 같은 `out/` 산출물을 세 곳에서 사용합니다:

- **Web/PWA**: Cloudflare Pages 호스팅(`public/_headers`, `public/_redirects`). `public/sw.js`가 앱 셸 + 로그인 사용자별 Supabase 읽기 캐시를 담당하며, 로그아웃 시 `CLEAR_CACHES` 메시지로 삭제합니다. 셸 자산이 바뀌면 `SHELL_CACHE` 버전(`chronoledger-shell-vN`)을 올립니다.
- **Desktop**: `src-tauri/` (Tauri v2, `frontendDist: ../out`). Tauri 런타임에서는 Supabase auth가 `implicit` flow + 딥링크(`src/lib/tauri-auth.ts`), 브라우저에서는 `pkce` flow입니다.
- **계정 삭제**: 서버 함수 없이 Supabase `SECURITY DEFINER` RPC(`request_account_deletion`, `get_account_deletion_status`) + `pg_cron` 5분 주기 정리(`sql/MIGRATION_PG_CRON.sql`)로 처리합니다. 과거 Netlify Functions 경로는 제거되었습니다.

### 코드 구조

- `src/app/` — 라우트. `/` → `/auth`로 리다이렉트, `/auth/callback`에서 OAuth 교환, `/dashboard`(캘린더) · `/dashboard/expenses` · `/dashboard/games` · `/dashboard/settings`, `/admin`(게임/일정 요청 승인). `dashboard/layout.tsx`가 세션 가드 역할을 하지만 실제 권한 경계는 RLS입니다.
- `src/lib/auth-context.tsx` — 전역 `AuthProvider`/`useAuth()` (user, session, `users.role`/`nickname`, 계정 삭제 상태).
- `src/lib/supabase/client.ts` — 유일한 Supabase 클라이언트. 다른 곳에서 `createClient`하지 않습니다.
- `src/lib/*-calculations.ts` — 순수 도메인 로직(예산 월 귀속, 결제/포인트 적립, 네이버페이 10,000원 올림 충전). 테스트 커버리지가 가장 두터운 영역입니다.
- `src/lib/subscription-sync.ts` — 월간 구독 지출의 Lazy Generation(중복 무시 upsert). `calendar-utils.ts`/`dashboard-date.ts` — KST 기준 날짜·그리드 계산.
- `src/lib/offline-guard.ts`, `use-online-status.ts` — 모든 쓰기 핸들러는 `isOffline()`로 방어합니다.
- `src/components/<도메인>/` — calendar, expense, finance, game, wallet, subscription, profile, pwa, layout. `src/components/ui/`는 shadcn 스타일 프리미티브(Radix, Vaul 드로어).
- `src/types/database.types.ts` — 배포된 스키마 기준 생성 타입.
- 테스트는 대상 파일 옆 `*.test.ts(x)`에 둡니다. 페이지/컴포넌트 테스트는 `vi.hoisted` + `vi.mock("@/lib/supabase/client")`, `vi.mock("@/lib/auth-context")`로 Supabase와 인증을 모킹하는 패턴을 따릅니다.

### 데이터 계층 규칙

- **스키마 기준**: `sql/SCHEMA.sql`. 변경은 `sql/MIGRATION_*.sql`로 추가하고 SCHEMA.sql에도 반영합니다. 원격 DB에는 Supabase SQL Editor로 수동 적용되므로, 신규 컬럼은 미적용 상태를 견디는 fallback 쿼리가 필요할 수 있습니다(예: `user_games.memo`).
- **금전 변경은 반드시 `SECURITY DEFINER` RPC로**: `process_expense_payment`, `refund_expense_payment`, `adjust_wallet_balance`, `update_store_wallet_settings`, `set_user_finance_settings`, `cancel_planned_expense`, `approve_*/reject_*_request` 등. 결제·환불·잔액 보정을 여러 클라이언트 `update`로 쪼개지 않습니다. 최종 금액과 적립 포인트는 RPC가 계산합니다.
- 금액은 정수 KRW(`BIGINT`), 포인트는 별도 정수. 예산 귀속은 PLANNED=종료일 월, CONFIRMED=결제월이며 일정 날짜 변경 트리거는 PLANNED만 갱신합니다.
- 관리자 판정은 JWT `app_metadata.role=admin`(DB 측)입니다. `user_metadata`나 클라이언트 값으로 권한을 결정하지 않습니다.
- `user-icons` Storage 버킷은 비공개(`{user_id}/{game_id}.webp`, 256×256 WebP ≤100KiB). `getPublicUrl`을 쓰지 않습니다.

### UI 규칙

- 색상은 `globals.css`의 RGB 채널 CSS 변수(기본 dark, `[data-theme="light"]`) → `tailwind.config.ts`의 시맨틱 토큰(`bg-surface`, `text-content`, `bg-primary` 등)으로 씁니다. 하드코딩 색상 대신 토큰을 사용합니다. 브레이크포인트는 md=900, lg=1280.
- 페이지에서 스켈레톤은 최초 로드 시에만 렌더링(`hasLoadedInitialRef`)하고, 데이터 로드 콜백 의존성은 `user?.id` 같은 원시값을 씁니다. 모달 폼은 열리는 순간에만 초기화(`prevOpenRef`)합니다. 백그라운드 재조회로 모달 입력값이 날아가는 버그를 막기 위한 규칙입니다.
- TS 타깃 때문에 `Map.values()`를 `for..of`로 순회하지 말고 `forEach`/`Array.from()`을 씁니다.

그 밖의 재발 함정은 `docs/known-pitfalls.md`를 먼저 확인합니다.
