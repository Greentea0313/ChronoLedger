# 프로젝트 진행 현황

## 웹 우선순위 및 Netlify 재검토 (2026-10-07)

- Netlify 검증: 앱 브랜치에서 `npm run build`(lint/type 포함)가 성공해 `/`, `/auth`, `/auth/callback`, `/dashboard` 정적 HTML/자산을 만들었고 OAuth callback 단위 테스트 5개도 통과했다. Draft URL에서 로그인 화면과 `/auth` 직접 경로, callback 안내가 열리고 비로그인 `/dashboard` 직접 접근은 `/auth`로 이동함을 사용자가 확인했다. 익명 HTTP 요청은 Netlify Edge Access로 401이다. OAuth 실인증/Redirect URL, GitHub 자동 Preview, Preview 환경변수 분리는 아직 미검증이며 앱에 PWA manifest/service worker도 없다.
- Netlify Git import 마법사가 `main` 첫 Production 배포를 시작하므로 이를 취소하고, 공식 CLI Draft Deploy(`--dir out --no-build`, `--prod` 없이)를 생성했다. Draft는 GitHub continuous deployment에 연결하지 않았다. OAuth callback은 Netlify 도메인 허용목록 갱신 전 실제 인증하지 않는다.
- 2026-10-07 세션 종료 상태: 사용자가 오늘 작업을 중단했다. 로컬 Supabase 환경 파일은 URL + Legacy `anon` 두 항목이며 HTTPS Supabase 주소/anon 역할/project ref가 서로 일치하고, 사용자가 대시보드의 URL과 Legacy anon 키 값도 정확히 대조했다. 실제 OAuth 허용 Redirect URL 추가와 로그인 왕복은 다음 작업으로 남긴다. Draft는 이미 생성됐지만 Netlify site-level env/ Git 연결은 설정하지 않았다.
- 앱 코드와 최신 문서를 `main`에 통합해 `origin/main`으로 push했다 (현재 원격 `f902021`). 폴더 점검에서 추적된 94개 파일에 `.env`, 의존성/빌드 산출물, worktree 및 일반적인 비밀값 패턴은 없었다. `.worktrees/`, `.netlify/`, 로컬 환경 파일은 ignore 처리된다. Phase 1 run manifest는 여전히 `target_sha: null`, `in_progress`이므로 미완료로 유지한다.
- 2026-10-07 현재 상태: 사용자는 웹사이트 기능 개발을 우선하고 Android PWA 실기기 인증 검증은 보류했다(제품 범위는 유지). Netlify는 유력 후보이나 아직 미채택이다. 기존 정적 export를 Deploy Preview에서 먼저 검증하며, 필요 증거 전에는 일반 Next.js 런타임/이중 빌드를 도입하지 않는다. 이전 날짜가 붙은 세부 결정은 아래 이력 항목을 참조한다.
- 2026-10-07: 사용자는 Android PWA 실기기 검증을 보류하고 웹사이트 개발을 우선하기로 했다. Netlify를 후보로 고려하되, 기존 제안서 재검토는 `현재 정적 export를 Netlify에서 검증하는 최소 경로`를 먼저 권고한다. 플랫폼 및 이중 빌드 최종 채택은 Deploy Preview 확인 전까지 미정이다.
- 사용자는 ChronoLedger를 과제 제출물이 아닌 개인 프로젝트로 진행하기로 결정했다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않고 기존 승인된 Supabase PostgreSQL/Next.js 정적 export 및 회원·관리자 요구사항을 유지한다. Netlify나 상시 Node.js 서버 채택 결정은 아니다.
- 사용자의 요청에 따라 [상세 설계](detailed-design.md)를 추가했다. 승인 SRS/SPEC/SCHEMA를 런타임 경계, 데이터 책임, Supabase/RPC 계약, 핵심 사용자 흐름, 보안·오류 정책 및 요구사항별 검증 계획으로 연결했다.
- 사용자는 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성을 미결정으로 유지하도록 요청했다. 기존 결정인 Android PWA와 Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export, Web/PWA 우선 순서는 그대로 유지한다. Netlify 및 Web/Desktop 빌드 분리는 별도 미결정이다.
- 사용자는 월 예산 합계 및 경고를 공유 클라이언트 도메인 함수에서 계산하고 온라인 RLS 조회와 허용된 오프라인 캐시에 동일 규칙을 적용하기로 결정했다. 오프라인 데이터는 계정별 IndexedDB에 저장하고 고정 TTL 없이 다음 성공 동기화/로그아웃/세션 만료까지 유지하며 마지막 동기화 시각을 표시한다. 네트워크 복귀 때 관련 화면 데이터를 즉시 재조회하고 성공 전까지 캐시를 유지한다. 계정 삭제는 대기 상태를 보존하고 서버가 Storage 정리를 재시도하는 방식으로 결정했다. 대기 중에는 세션을 유지하지만 일반 기능/데이터를 차단하고 상태 화면만 허용한다. 실패 시 재시도 간격을 늘려 완료까지 자동 재시도한다. 데이터 정리 뒤 Auth 삭제 전에 주소 사본 없이 “정리 완료, 계정 삭제 마무리 중” 메일을 보내며, Auth 삭제 실패 시 상태 화면에서 알리고 삭제만 재시도한다. 게임 구독 해제도 아이콘 정리를 서버가 재시도하고 완료 후 구독 행을 제거하며, 처리 중에는 목록에 표시하고 중복 요청을 막는다. worker/메일 전달 구조는 추가 설계 대상이다. 성능 측정 기준 기기는 중급 Android 실기기로 선택됐다. Netlify 제안은 보류하고 현재 Web/PWA 기준으로 MVP를 진행하기로 했다. Netlify 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다. UI/접근성 값과 성능 측정 세부조건·목표도 남은 설계 항목이다.
- 사용자가 추가한 UI 디자인 시트, `design-v1-ko.html`, Netlify 제안서를 승인 SRS와 기존 Web/PWA 우선순위에 대조했다. UI 시트의 달력 제한(VERSION/PICKUP, 금액 없음, 메모 표시 1개), 지출 상태/예산/모바일 상세 설계는 승인 요구와 부합한다. 색상/레이아웃 등 `[PROPOSED]` 값은 시각 제안으로 구분했다. HTML은 단일 화면의 정적 목업이며 인터랙션 또는 반응형 동작을 증명하지 않는다.
- Netlify 문서 자체가 `Decision Proposal`이다. 플랫폼과 Web/Desktop 빌드 전략을 확정하지 않고 `docs/to-do.md`에 사용자 결정 및 승인 후 호환성 검증 과제를 남겼다.
- 협업 AI 우선 요구에 따라 `.github/copilot-instructions.md`와 `.github/agents/chronoledger-{maker,reviewer}.agent.md`를 추가했다. 기존 파일 기반 run/SHA/JSON 규약과 연결했고, Reviewer 역할 문구만으로 읽기 전용 실행 권한을 보장하지 않는다는 점을 명시했다.
- Copilot 역할과 사용 절차를 `docs/ai-collaboration-usage.md`, `md/multi_agent_collaboration_architecture.md`, `artifacts/README.md`에 반영했다. VS Code의 실사용 프로필 인식/도구 제한/아티팩트 저장은 아직 사용자의 VS Code 환경에서 확인하지 않았다. AI 간 자동 호출도 구성하지 않았다.
- `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`를 갱신했다. 문서 정합성만 검토했으며 앱 테스트/빌드/배포 및 실제 Copilot 세션 실행은 수행하지 않았다.
- 브라우저 OAuth callback 구현과 실제 로컬 Google 인증, `/auth` 로그인 통합 및 dashboard layout 인증 gate를 검증했다. Android PWA 실기기 검증과 Tauri 딥링크는 각각 후속 Web/PWA·데스크톱 단계로 남아 있다.
- Phase 1 협업 run은 `target_sha: null`, `in_progress`이며 동일-SHA review/test 산출물이 없어 완료로 표시하지 않는다.
- 기존 Netlify 제안서의 A안(일반 Next.js 웹 런타임 + Tauri 정적 빌드)은 현 요구에 비해 복잡도가 커 즉시 채택할 근거가 부족하다. 배포 preview에서 정적 export, auth callback, 하위 경로, PWA service worker 및 환경변수 분리를 확인한 뒤 필요 시에만 서버 런타임/이중 빌드를 재논의한다.
- 사용자는 Supabase Google provider 활성화와 `http://localhost:3000/auth/callback` 등록을 확인했다. 실제 브라우저 Google OAuth가 PKCE code를 교환하고 세션을 저장해 `/dashboard`로 이동하는 것을 검증했다. callback 테스트는 Strict Mode 재실행 케이스를 포함해 5개로 늘렸다.
- 검증 중 발견한 중복 URL code 교환 및 React Strict Mode cleanup 문제를 수정했다. 단일 Supabase client에서 브라우저는 PKCE, Tauri는 기존 implicit flow를 사용하며 URL 자동 세션 감지는 비활성화했다.
- `/`의 중복 로그인 폼을 `/auth` 이동 페이지로 바꾸고 dashboard layout에 인증 gate를 적용했다. 로그인 상태의 root 이동 및 로그아웃 후 직접 dashboard 접근 차단을 브라우저에서 확인했다. Android PWA 실기기 인증은 미검증이다.
- 변경 파일의 callback 단위 테스트 5개, ESLint 및 `npx tsc --noEmit`은 통과했다. `npm run build`는 컴파일 후 기존 `src/app/layout.tsx`의 `@ts-ignore`와 `src/lib/tauri-auth.ts`의 `any` lint 오류로 중단됐다. Phase 1 run은 여전히 `target_sha: null`, `in_progress`다.

## 현재 상태

- 프로젝트는 SRS 사용자 검토·승인과 SQL rollback-only 스모크 테스트를 마쳐 설계 단계 진입이 승인됐다.
- 사용자의 결정과 SRS 전체 검토 내용을 문서와 SQL 초안에 반영했다. 사용자가 테스트 프로젝트에서 `md/TESTS.sql`을 `ON_ERROR_STOP=1`로 실행했고, 최종 PASS 메시지로 전체 테스트 완료 및 rollback을 확인했다.
- Codex가 직접 실행한 것은 아니며, 사용자가 전달한 최종 PASS 출력으로 테스트가 오류 없이 완료되고 변경이 롤백됐음을 확인했다. 이 smoke suite는 핵심 동작의 일부만 다루므로 전체 SRS 수용 기준의 상세 테스트는 설계/테스트 계획에서 추적한다.
- 2026-10-03 읽기 전용 조회에서 의도한 프로젝트 ref와 일치함을 확인했다. `SCHEMA.sql`의 12개 테이블 이름 및 `expenses`의 24개 컬럼이 이미 있어 기존 스키마 배포 가능성이 높다. RLS·정책·RPC·트리거 및 인코딩 메타데이터 비교 전까지 DDL을 재실행하지 않는다.
- 2026-10-03 후속 확인에서 CHECK 값, 가입 트리거, Storage 정책 및 주요 RPC 권한을 대조했다. 사용자가 테스트 프로젝트임을 재확인하고 허용해 `user-icons` Storage 버킷을 생성했다 (private, 100 KB/102,400 bytes, image/webp). Dashboard 설정을 시각적으로 확인했다.
- `md/TESTS.sql`은 단일 트랜잭션에서 가입 초기화·결제/환불·포인트·취소/복구·구독/일정 트리거·참조 무결성·RLS를 점검하고 전체를 ROLLBACK했다.
- 사용자가 `md/TESTS.sql`의 최종 PASS 및 전체 rollback 완료 메시지를 확인했다.
- 멀티 에이전트 협업의 초보자용 사용 안내를 `docs/ai-collaboration-usage.md`에 추가했다. AI 간 자동 연동은 여전히 미설정이며 역할 간 파일 전달은 수동이다.
- 다음 단계는 승인된 SRS를 바탕으로 설계 산출물을 작성하는 것이다. 설계 단계에서 요구사항별 상세 테스트 케이스와 측정 환경에 따른 성능 목표를 정한다.

## SQL 검증 및 설계 진입 판정 (2026-10-03)

- 사용자가 테스트 프로젝트에서 rollback-only 스모크 스크립트를 `ON_ERROR_STOP=1`로 실행하고 최종 PASS/rollback 메시지를 확인했다.
- Phase 0.6을 완료하고 설계 단계 진입을 승인했다. 상세 SRS 검증 케이스와 성능 목표는 설계 단계에서 구체화한다.

## 다음 작업

1. 승인된 SRS를 바탕으로 시스템 구조, 데이터 흐름, 컴포넌트/API 및 보안 설계를 시작한다.
2. 수용 기준별 상세 검증 케이스와 전체 DB/RPC/RLS 검증 계획을 설계 산출물에 추적한다.
3. 지원 기기·네트워크·데이터 규모를 정해 성능 측정 목표를 확정한다.

## 멀티 에이전트 협업 아키텍처 검토

- 요청에 따라 `md/multi_agent_collaboration_architecture.md`를 읽고 역할 분담, 병목, 반복 제한, 파일 기반 통신을 검토했다.
- 결론과 권장 워크플로우, JSON 결과 메타데이터, 종료 기준, 적용 범위를 `md/multi_agent_collaboration_architecture_review.md`에 기록했다.
- 문서 목록 반영을 위해 `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`를 갱신했다.
- 상대 링크를 정적으로 확인했다. 협업 파이프라인 및 특정 에이전트 제품 동작은 실행 검증하지 않았다.
- 검토 의견은 제안이며 파이프라인은 아직 채택·구현되지 않았다.

## 최종 협업 설계안 재검토

- Maker/Reviewer/Orchestrator 역할, Target/Base SHA, 원자적 결과 파일, 샌드박스, 반복 제한, 사용자용 종료 리포트가 초안의 주요 공백을 보완했음을 확인했다.
- 공유 작업 트리의 자동 `git reset --hard`가 미커밋 사용자 작업을 잃게 할 수 있어 도입 차단 위험으로 지적했다. 전용 worktree 격리와 실패 상태 보존을 권고했다.
- 테스트 성공 조건, 컨테이너 권한/네트워크, AST 의존성 추출의 누락 가능성, 제품별 파일 접근성도 추가 확인 항목으로 기록했다.
- 검토 문서의 8절을 갱신하고 `docs/handoff.md`, `docs/to-do.md`, `docs/known-pitfalls.md`에 최신 검토 결과를 반영했다.
- 문서 정적 검토만 수행했으며 Git 롤백, Docker 격리, 실제 에이전트 간 연동은 실행하지 않았다.

## 협업 작업 환경 준비

- 요청 목표: 최종 협업 설계와 안전성 검토를 바탕으로 재사용 가능한 로컬 작업 환경을 준비한다.
- `artifacts/` 아래 run 결과 규약, run/review/test JSON Schema, 예시, 사용자 종료 보고서 템플릿을 추가했다. 원시 로그·환경 변수 파일은 해당 폴더의 `.gitignore`로 제외한다.
- `scripts/collaboration/New-CollaborationRun.ps1`을 추가했다. 깨끗한 Git 상태와 고유 run ID를 요구하고 전용 `.worktrees/<run_id>` 브랜치/worktree 및 원자적으로 기록한 run manifest를 만든다. 자동 stash, reset, 삭제는 하지 않는다.
- JSON 문법, PowerShell 구문 및 상대 Markdown 링크를 정적으로 확인했고 통과했다. 스크립트 동작 테스트는 실행하지 않았다.
- `md/multi_agent_collaboration_architecture.md`의 롤백 규칙을 공유 작업 트리 자동 reset에서 실패 worktree/브랜치 보존으로 수정했다.
- 저장소에는 현재 미커밋 문서 변경이 많아 새 worktree를 만들지 않았다. 스크립트는 이를 감지해 중단하도록 설계했다. Docker 실행 파일도 찾지 못해 컨테이너 테스트는 실행할 수 없다.
- 외부 Gemini 에이전트와의 자동 호출은 구성하지 않았으며, 파일 규약에 따른 수동 전달만 준비됐다.
- 다음 단계: 변경 내용을 보존한 채 깨끗한 커밋 상태를 만든 후 스크립트를 실행 검증하고, Docker 샌드박스 및 Gemini의 동일 아티팩트 접근을 별도로 연결한다.

## AI 협업 사용 안내 작성 (2026-10-02)

- 사용자가 요청한 초보자용 역할 설명과 실행 절차를 `docs/ai-collaboration-usage.md`에 작성했다.
- run 생성 전 저장소 상태 확인, 전용 worktree 생성, Maker 커밋 후 Target SHA 기록, Reviewer/Orchestrator의 동일 SHA 검토, 반복 및 안전 규칙을 설명했다.
- 기존 제약(Docker 미확인, Gemini 자동 연동 미구성, 실제 worktree 생성 미검증)을 문서에 명시했다.
- `docs/architecture.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/changelog.md`의 문서 목록/상태를 갱신했다.
- 문서 링크 및 내용은 정적으로 확인할 예정이다. 스크립트 실행, worktree 생성, 동적 테스트는 수행하지 않는다.

## 오래된 기획 검토 문서 정리 (2026-10-02)

- 사용 요청에 따라 현재 문서 참조와 상태를 조사하고, 현재 기준에 더 이상 쓰이지 않는 `md/fix-proposals.md`와 `md/revisions_and_decisions_review.md`를 삭제했다. 두 파일은 오래된 Gemini.sql/Downloads 기준 검토 기록이며 최신 기획/요구사항 기준은 SRS와 통합 기획 문서다.
- `md/srs-readiness-review.md`, `md/resolved-blockers-review.md`, `md/planning-blockers.md`는 현재 인수인계/체크리스트에서 참조하거나 결정 이력으로 보존할 가치가 있어 유지했다.
- 삭제 후 Markdown 문서에서 두 파일을 가리키는 링크가 남지 않았는지 확인할 예정이다.

## Gemini 진행 문서와 작업 트리 대조 (2026-10-02)

- 사용자가 추가한 `docs/to-do_Gemini.md`를 기존 구현 체크리스트 및 `.worktrees/phase1-setup`과 대조했다.
- Next.js/Tailwind/Supabase/Vitest/Tauri 및 로그인·대시보드 초안 파일은 있으나, Gemini 문서의 Phase 1 완료를 입증할 동일 SHA 테스트/리뷰 결과는 없다. shadcn/ui는 확인되지 않았고 계획의 Tauri v2와 구현된 Tauri 3 alpha가 충돌한다.
- Phase 2의 Supabase 배포/초기화 트리거 검증은 외부 상태라 저장소 자료만으로 확인할 수 없다. 기존 SRS 승인/SQL 검증 게이트와 충돌 가능성이 있어 `docs/to-do.md`에 사용자 확인 및 테스트 프로젝트 검증을 우선 과제로 추가했다.
- `phase1-setup` run은 `target_sha`가 비어 있고 `in_progress`; 격리 worktree 변경은 미커밋이다. 이를 병합·초기화하지 않았으며 비밀값 파일은 열지 않았다.
- 패키지/설정/화면 코드를 정적으로 살폈다. 빌드, 테스트, Tauri 실행 또는 원격 DB 연결은 수행하지 않았다.

## Gemini 진행 내용 후속 검토 (2026-10-03)

- 사용자가 갱신한 `docs/to-do_Gemini.md`를 `.worktrees/phase1-setup`의 코드와 설정에 대조했다. Tauri v2 의존성과 제품 식별자, shadcn UI, 인증 화면이 추가되어 10-02의 v3 alpha/shadcn 미구현 판단은 해소됐다.
- 인증 결함을 확인했다. `/auth/callback`는 로그인 폼을 렌더링하고 Tauri 처리기는 token fragment만 읽어 PKCE `code`를 교환하지 않는다. 앱 cold-start URL 확인 및 Windows 실행 중 single-instance 전달도 없다. `/`와 `/auth`의 OAuth 동작이 서로 다르다.
- 버튼 무반응은 source에 handler가 연결된 것만 확인했으며, 근본 원인은 웹뷰 로그 없이 판단할 수 없어 미확정으로 기록했다. Gemini의 권한/Hydration 설명은 가설이다.
- Phase 1 커밋 `ccfbca5`가 존재하지만 이후 Tauri/Auth 수정이 미커밋이다. `phase1-setup` manifest는 target SHA가 null이고 reviewer/test JSON이 없어 협업 run은 미종료다. Gemini가 보고한 Tauri 실행 성공은 재실행하지 않았다.
- 사용자가 최신 `docs/to-do.md`에 기록한 SRS 승인과 테스트 프로젝트 SQL smoke PASS를 현 기준으로 유지했다. 이 결과는 DB 검증이며 프론트엔드/Tauri 인증 검증과 구분했다.
- 구현 결함과 다음 과제를 `docs/to-do.md`에 기록했다. 정적 코드 검토와 공식 Supabase/Tauri 문서 대조만 수행했고 앱 빌드/테스트/원격 접속은 하지 않았다.

## Web/PWA 우선 개발 순서 (2026-10-05)

- 사용자 요청에 따라 브라우저 Web과 Android PWA 핵심 기능을 먼저 완성하고, Windows Tauri OAuth 딥링크 및 패키징은 Web/PWA MVP 이후로 미뤘다.
- SRS의 Windows Tauri 지원은 유지하며, 공통 프론트엔드와 인증 경계를 유지하는 순서를 `docs/to-do.md`에 반영했다.
- Web/PWA MVP 조건, 웹 우선 인증·기능 통합 순서, 후속 Windows Tauri 단계로 체크리스트를 재배치했다.
- 관련 인수인계/변경 이력을 갱신했다. 코드와 앱 동작 검증은 수행하지 않았다.

## SRS §4.8 검토 완료 (2026-10-02)

- 체크포인트의 실제 재개 지점인 SRS §4.8(아이콘 및 메모)을 기준 문서와 대조했다.
- 사용자는 내 게임 목록에서 게임을 제거할 때 해당 게임의 사용자 커스텀 아이콘 Storage 객체도 삭제하기로 결정했다. 이를 SRS, SPEC 및 구현 체크리스트에 반영했다.
- 사용자는 같은 날짜에 개인 메모를 여러 개 허용하고 캘린더 타일에는 도트 하나만 표시하기로 결정했다. 상세 영역에는 해당 날짜의 메모 전체를 표시하도록 SRS와 SPEC을 정합화했다. 현재 SQL 초안은 날짜당 유일성 제약이 없어 다중 메모를 허용한다.
- 사용자는 지원 플랫폼을 Windows Tauri 데스크톱과 Android PWA로 한정하고, 응답시간 목표는 설계 단계에서 측정 환경과 함께 정하기로 했다. 이를 SRS/SPEC에 반영했다.
- §4.8은 완료했다. 이후 §5~§10 검토도 마쳤고 사용자가 SRS 요구사항을 승인했다. DB 실행 검증은 환경 부재로 남아 있어 설계 단계 진입은 보류 상태다.

## SRS 전체 검토 및 승인 (2026-10-02)

- SRS §5~§10을 기준 문서 및 현재 구현 체크리스트와 대조했다. 상태 전이 표의 템플릿 비활성화 문구, 구현 현황 설명, 추적성 및 원자성 수용 기준을 보정했다.
- Windows용 Tauri v2 데스크톱 실행 파일과 Android PWA만 지원하고 iOS PWA는 제외하기로 결정했다. 성능 수치 목표는 설계 단계에서 측정 환경과 함께 정하기로 했다.
- 사용자가 검토 반영된 SRS 요구사항을 승인했다. [SRS](../md/SRS.md) 상태와 체크포인트에 승인 사실을 기록했다.
- (당시 체크포인트 기록, 2026-10-03 스모크 실행 전) SQL 검증은 미수행 상태였고 `public.expenses` 존재 때문에 DDL 적용을 보류했다. 이후 사용자가 rollback-only 스모크 검증을 완료해 최신 상태는 위의 설계 진입 승인으로 갱신됐다.
