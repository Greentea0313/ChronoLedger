# 프로젝트 진행 현황

## Phase 4.4 사용자 게임·일정 요청 제출 UI (2026-10-07)

- 대시보드에 게임 및 일정 요청 모달 진입점을 추가했다. 게임 요청은 `game_requests.name`/`memo`, 일정 요청은 `schedule_requests`의 스키마 필드만 INSERT하며 `user_id`는 인증 사용자에서 가져오고 요청 상태·관리자 필드는 전송하지 않는다. 일정 수정 제안은 승인 스키마의 `target_schedule_id`로 구분한다.
- 필수 입력, 스키마 허용 일정 종류, 유효한 날짜 및 종료일 순서를 검사하고 DB/RLS 실패를 사용자 오류로 표시한다. 본인 요청 상태와 관리자 메모 조회도 모달에 제공한다. 관리자 승인·반려 RPC 경로는 우회하지 않는다.
- 전체 Vitest 6개 파일·21개 테스트, ESLint, `npx tsc --noEmit`, 더미 Supabase URL/key만 사용한 정적 Next build가 통과했다. 실제 Supabase RLS/RPC, Tauri 및 Gemini는 실행하지 않았다.
- worktree의 의존성 부재로 npm ci는 기존 package.json/package-lock.json 불일치(잠금에 누락된 패키지 엔트리)로 실패했다. lockfile은 수정하지 않고 `npm install --no-package-lock --legacy-peer-deps`로 검증용 패키지를 설치했다.
- 다음: 격리된 테스트 Supabase에서 요청 RLS와 관리자 RPC 원자성을 검증하고, 별도 작업으로 package manifest/lockfile 동기화를 복구한다. Tauri는 Web/PWA MVP 이후다.

## 전체 협업 run 검증 사전 정리 (2026-10-07)

- 관리자 요청 UI의 조회 필터·필드명·조인 및 RPC 인자가 승인된 `md/SCHEMA.sql`과 불일치하던 부분을 수정했다. 관리자 화면은 `app_metadata.role=admin`만 요청을 조회하며 게임 승인 시 관리자가 기본 아이콘 URL을 입력한다. RPC 오류 시 직접 테이블을 갱신하던 비원자적 fallback은 제거했다.
- 게임 선택 모달의 카탈로그 조회도 승인 스키마의 `games.name` 필드에 맞췄다.
- 관리자 요청 페이지 회귀 테스트를 추가했다. 앱 전체 Vitest 5개 파일·15개 테스트, ESLint, dummy Supabase 환경변수를 사용한 정적 빌드가 통과했다. 실제 Supabase/RLS/RPC, Tauri 실행 및 전체 협업 run은 아직 검증하지 않았다.
- 다음: 두 worktree 변경을 별도 커밋하고, clean main 상태에서 run 생성 스크립트와 Maker/Reviewer 전체 흐름을 검증한다.

## 대시보드 KST 월간 지출 조회 (2026-10-07)

- Gemini 분업은 구현이 아니라 커밋 후 동일 Target SHA의 읽기 전용 리뷰로 분리해 `to-do.md`에 미착수 항목으로 기록했다. 자동 연동은 없다.
- 예정 지출을 KST 현재 달의 반개구간 `[월 시작일, 다음 달 시작일)`로 조회한다. 월 귀속 날짜는 `end_date`가 있으면 이를 사용하고 없으면 `target_date`를 사용해 승인 예산 규칙과 일치시켰다.
- 누락된 재무 행은 오류로 처리하며 저장된 0원과 정상 빈 지출 결과는 실제 0원으로 표시한다. 지출 query 오류는 합계 0원으로 표시하지 않는다.
- KST 경계와 대시보드 UI를 포함한 두 Vitest 파일의 7개 테스트, `npm run lint`, `npx tsc --noEmit`, 정적 `npm run build`가 통과했다. Vite configLoader 향후 호환성 경고가 있었으며 원격 Supabase query는 실행하지 않았다.

## 로그인 UI 개선 (2026-10-07)

- `/auth`를 앱의 기존 다크 테마에 맞춘 반응형 로그인 화면으로 개선했다. 이메일/비밀번호 레이블, 이메일 로그인·가입 및 Google 버튼 구성을 정리했고 기존 인증 처리기는 유지했다.
- 320/390/768/1280px에서 가로 넘침이 없고 입력 영역이 44px 이상임을 확인했다. 키보드 탭 순서는 이메일/비밀번호/로그인/가입/Google로 이어진다. callback 테스트 5개와 TypeScript 검사가 통과했다.
- 앱 worktree의 ESLint 설정에 `root: true`를 추가해 상위 저장소 설정을 잘못 이어받던 문제를 해결했다. `npm run lint`와 `npm run build`가 경고/오류 없이 통과했다.
- 브라우저 접근성 트리에서 H1/H2, 입력 및 버튼 이름을 확인했다. 모든 로그인 컨트롤의 키보드 초점이 보이며 입력 44px, 주요 버튼 48px이다. 주요 로그인 텍스트 대비는 최소 6.13:1, dashboard 텍스트 조합은 최소 5.31:1, 초점 표시 대비는 5.21:1이다.
- 카드 제목을 H2로 수정하고 dashboard 로딩 live status, 데이터 오류 alert, 명명된 nav landmark 및 장식 이모지 숨김을 추가했다. dashboard는 인증 보호로 코드 수준에서만 확인했으며 실제 NVDA/VoiceOver 검증과 앱 전체 테마 전환은 남아 있다. 실제 인증은 이번 UI 검증에서 실행하지 않았다.

## 자체 호스팅 폰트 (2026-10-07)

- A2Z SIL OFL 1.1을 확인해 9개 WOFF2 굵기를 `public/fonts/a2z/`에 추가했다. 제작 ZIP에 라이선스 파일이 없어 폰트 내장 저작권 표기와 OFL 전문을 함께 제공한다.
- `src/app/globals.css`에서 A2Z를 기본 웹 글꼴로 설정했다.
- 폰트는 브라우저와 정적 export에서 9개 굵기 적용을 확인했다. 로그인 UI 변경 후 빌드·린트 결과는 최신 인수인계 항목을 따른다.

## 브라우저 OAuth 및 dashboard 보호 (2026-10-06)

- Supabase client는 브라우저/PWA에서 PKCE, Tauri에서 기존 implicit flow를 사용한다. Supabase의 callback URL 자동 감지를 끄고 `/auth/callback`에서 authorization code를 명시적으로 한 번 교환한다.
- 실제 OAuth 재현 중 자동 code 교환 중복과 React Strict Mode effect cleanup으로 진행 UI가 멈추는 문제를 수정했다. provider 오류/취소, code 누락, 교환 오류 및 Strict Mode 재실행을 callback 테스트 5개로 검증했다.
- 사용자가 Google provider 활성화 및 `http://localhost:3000/auth/callback` Redirect URL 등록을 확인했다. 실제 브라우저 로그인에서 token 교환 HTTP 200, 세션 저장 및 dashboard 복귀를 확인했다. Android PWA 설치 환경 검증은 남아 있다.
- `/`는 `/auth`로 이동하며 `dashboard/layout.tsx`가 세션 로딩 중 콘텐츠를 숨기고 비인증 사용자를 `/auth`로 보낸다. 브라우저에서 root 이동과 로그아웃 후 직접 dashboard 접근 차단을 확인했다. 데이터 권한은 RLS가 최종 집행한다.
- 변경 파일 ESLint, `npx tsc --noEmit`, callback 테스트 5개를 통과했다. `npm run build`는 Next.js 컴파일 후 기존 `src/app/layout.tsx`의 `@ts-ignore`, `src/lib/tauri-auth.ts`의 `any` lint 오류로 중단됐다.
- 다음: Android PWA 실기기 OAuth 검증, dashboard 예정 지출 조회의 KST 월 경계/0원-오류 구분 검증. Tauri OAuth deep link는 Web/PWA MVP 이후다.

## 현재 상태

- SRS v1.0의 사용자 승인을 받았고 테스트 프로젝트에서 rollback-only SQL smoke suite의 최종 PASS/rollback을 확인해 설계 단계 진입이 승인됐다.
- Web/PWA 우선 구현 중이다. 브라우저 Google OAuth는 실제 로컬 Supabase 설정으로 성공 검증했으며 Android PWA E2E는 남아 있다.
- 전체 PostgreSQL/Supabase 검증 범위 및 나머지 SRS 수용 기준 테스트는 설계/구현 과정에서 계속 추적한다.
- 멀티 에이전트 협업의 초보자용 사용 안내를 `docs/ai-collaboration-usage.md`에 추가했다. AI 간 자동 연동은 여전히 미설정이며 역할 간 파일 전달은 수동이다.
- 다음: Android PWA 실기기에서 Google OAuth 성공·취소·세션 복귀를 검증하고 Web/PWA MVP 인증 경로를 완성한다. Windows Tauri OAuth 딥링크는 MVP 이후 진행한다.

## 이번 작업 (2026-10-02)

- `md/revisions_and_decisions.md`, `md/SPEC.md`, `md/SCHEMA.sql`, `docs/to-do.md`, `docs/architecture.md`를 정적으로 대조했다.
- 구독 취소·삭제 RLS, 포인트 적립 산정 기준, 지출 참조 데이터 소유권, 일정 만료 처리 및 사용자 재정 초기화 요구사항을 설계 진입 전 이슈로 기록했다.
- 사용자 요청의 조건에 따라 오류가 남아 있는 동안 확정 SRS는 작성하지 않았다.
- 사용자가 제시한 차단 항목 결정안을 기존 DDL 및 오프라인 요구사항과 대조했다. 누락/충돌이 남아 승인 SRS 작성은 보류하고 결정안 검토 문서를 추가했다.
- 오프라인 캐시 읽기 허용/온라인 복귀 후 만료 항목 처리(선택 2)를 반영했다. 예정 취소와 환불을 구분하고 복구 RPC·참조 검증·가입 초기화 트리거를 `md/SCHEMA.sql`에 추가했다.
- `md/SRS.md` 초안을 요구사항 ID, 수용 기준, 상태 전이, 권한, 비기능 조건, 추적성으로 작성하고 `SPEC.md`, 결정 문서 및 구현 체크리스트를 정합화했다.
- 복구한 예정 취소 항목의 목표일이 이미 지난 경우에는 날짜를 유지하고 만료 처리 모달에 다시 표시하도록 사용자 결정사항을 SRS와 차단 결정 문서에 반영했다.
- 환불 시 해당 결제에 기록된 사용/예상 적립만 되돌리고 독립적인 `MANUAL_ADJUST`는 유지하기로 한 사용자 결정을 SRS 및 결정 문서에 반영했다.
- 과거 blocker 문서의 취소/환불·포인트·만료 기준 및 통합 문서의 기준 우선순위 표현을 최신 결정과 일치시켰다.
- 사용자가 기존 자산 차감 토글 정책 유지를 확정해 결제일에 따른 기본 체크값, 차감 및 환불 복원 규칙을 SRS와 기능 명세에 보완했다.
- 사용자가 계정 삭제 시 모든 개인 데이터를 삭제하기로 결정했다. 개별 지출 삭제 금지와의 경계를 SRS에 정의하고 Storage 아이콘 정리 요구사항을 아키텍처 및 구현 체크리스트에 추가했다.
- 사용자가 월별 예산 0원은 기본 예산으로 폴백하고, 최종 적용 예산도 0원이면 경고를 생략하기로 확정해 SRS, SPEC 및 통합 기획에 반영했다.
- 사용자가 월 예상액을 늘려 100% 초과를 발생시키는 등록·수정·복구·결제 변경 전부에 확인을 요구하도록 결정해 SRS와 예산 명세를 갱신했다.
- 사용자가 실제 결제 스토어 선택에 따라 적립률을 적용하고 WALLET 결제는 적립하지 않기로 결정해 SRS/SPEC/결정 문서와 SQL 초안을 정합화했다.
- 사용자가 구독 템플릿 비활성화 시 생성된 예정 회차를 취소하고 재활성화해도 자동 복구하지 않기로 확정했다. `TEMPLATE_DEACTIVATION` 사유, 명시적 복구 정책을 SRS/SQL에 추가했다.
- 사용자는 구독 템플릿 삭제를 금지하고 비활성화만 허용하기로 결정했다. 템플릿 RLS를 SELECT/INSERT/UPDATE로 한정하고 검증 체크리스트에 DELETE 거부를 추가했다.
- `TEMPLATE_DEACTIVATION` 회차는 템플릿 재활성화 후에만 수동 복구하도록 결정해 `restore_cancelled_expense`의 소유권/활성 상태 조건과 SRS를 보완했다.
- SQL은 정적으로만 수정·검토했으며 PostgreSQL/Supabase 실행 또는 테스트를 수행하지 않았다.

## 다음 작업

1. 사용자가 후속 작업을 재개하면 `srs-review-checkpoint.md`와 SRS를 다시 읽고 정확한 시작 지점을 확인한다. 다음 검토 위치는 §5이다.
2. SRS 전체 검토/승인과 재현 가능한 DB/RPC/RLS 검증을 진행한 뒤 설계 단계 진입을 판정한다.

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

## SRS §4.8 검토 완료 (2026-10-02)

- 체크포인트의 실제 재개 지점인 SRS §4.8(아이콘 및 메모)을 기준 문서와 대조했다.
- 사용자는 내 게임 목록에서 게임을 제거할 때 해당 게임의 사용자 커스텀 아이콘 Storage 객체도 삭제하기로 결정했다. 이를 SRS, SPEC 및 구현 체크리스트에 반영했다.
- 사용자는 같은 날짜에 개인 메모를 여러 개 허용하고 캘린더 타일에는 도트 하나만 표시하기로 결정했다. 상세 영역에는 해당 날짜의 메모 전체를 표시하도록 SRS와 SPEC을 정합화했다. 현재 SQL 초안은 날짜당 유일성 제약이 없어 다중 메모를 허용한다.
- 다음 검토 위치는 SRS §5 외부 인터페이스 및 환경이다. §4.8 완료만 반영했으며 SRS 전체 승인/설계 단계 진입은 보류 상태다.
