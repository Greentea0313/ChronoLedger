# 프로젝트 인수인계 문서 (handoff.md)

## 현재 상태

- 프로젝트 목적 결정: ChronoLedger는 과제 제출물이 아닌 개인 프로젝트다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않는다. 기존 승인된 Supabase PostgreSQL/Next.js 정적 export, 이메일·Google 회원 기능, 사용자/관리자 구분을 유지한다. Netlify 또는 상시 Node.js 서버를 채택한 것은 아니다. 세부 결정은 [revisions_and_decisions.md](../md/revisions_and_decisions.md)에 기록했다.
- 통합 기획 및 결정 문서: [revisions_and_decisions.md](../md/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](../md/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](../md/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../md/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](../md/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](../md/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](../md/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- Gemini 작업 진행 기록: [to-do_Gemini.md](to-do_Gemini.md) (외부 배포 완료 표시는 로컬 증거와 별도로 확인 필요)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](ai-collaboration-usage.md)
- UI 시트: [ChronoLedger_UI_Design_Sheet.md](../md/ChronoLedger_UI_Design_Sheet.md); 한국어 대시보드 목업: [design-v1-ko.html](design-v1-ko.html). 시트의 시각 값은 제안이며 HTML은 정적 참고용이다.
- Netlify 웹 배포 제안: [Netlify_Web_Architecture_Proposal.md](Netlify_Web_Architecture_Proposal.md). 상태는 Decision Proposal이며 사용자가 승인하기 전에는 플랫폼/빌드 타깃 변경을 적용하지 않는다.
- SRS 검토/검증 체크포인트: [srs-review-checkpoint.md](srs-review-checkpoint.md). SRS 승인 및 테스트 프로젝트 rollback-only SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- SRS 요구사항 검토·승인과 테스트 프로젝트의 SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- `SRS.md` v1.0 요구사항은 사용자 승인됐고, `md/TESTS.sql`의 rollback-only smoke suite도 최종 PASS를 확인했다. Phase 0.6 완료 및 설계 진입이 승인됐다.
- 지원 플랫폼은 Windows용 Tauri v2 데스크톱과 Android PWA다. 성능 목표는 설계 단계에서 측정 환경과 함께 확정한다.
- Gemini의 2026-10-03 진행표를 `.worktrees/phase1-setup`과 대조했다. Tauri v2 및 shadcn 설정은 반영됐다. 다만 `/auth/callback`이 로그인 폼이고 Tauri 딥링크 처리에 PKCE 교환/cold-start 수신이 없어 OAuth 완료로 볼 수 없다. 버튼 무반응의 원인은 아직 미확정이다. [to-do.md](to-do.md)의 대조 절을 따른다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 설계 진입 게이트 (완료)

- 승인된 [SRS.md](../md/SRS.md) 요구사항과 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료했다.
- `md/TESTS.sql`의 핵심 DDL/RPC/RLS 동작 점검은 `ON_ERROR_STOP=1`에서 최종 PASS를 확인했다.
- Phase 0.6 완료 및 설계 단계 진입을 승인했다. 전체 SRS 수용 기준 테스트는 설계/테스트 계획에서 상세화한다.

## 다음 작업

- 사용자 우선순위는 웹사이트 개발이다. Android PWA 실기기 로그인 검증은 보류하되 제품 범위에서는 제외하지 않는다.
- Netlify는 후보이며 아직 확정 채택이 아니다. 로컬에서 `next build --no-lint` 정적 export와 주요 HTML/자산 경로, OAuth callback 단위 테스트 5개를 확인했지만 통상 build는 기존 lint 오류 두 건에서 실패했다. Netlify CLI/site link와 공유 브라우저가 없어 Deploy Preview, preview OAuth redirect, 환경변수 분리는 미검증이다. 현재 앱에 PWA manifest/service worker도 없어 해당 자산 경로는 아직 검증할 수 없다.

- [상세 설계](detailed-design.md)는 승인 SRS/SPEC/SCHEMA를 흐름과 호출 경계로 연결한 초안이다. 예산 집계는 공유 클라이언트 도메인 함수, 오프라인 데이터는 계정별 IndexedDB에 고정 TTL 없이 저장하고 마지막 동기화 시각을 표시하며 네트워크 복귀 즉시 재조회하고 로그아웃/세션 만료 시 제거하기로 했다. 계정 삭제 부분 실패는 대기 상태를 유지하면서 재시도 간격을 늘려 완료까지 재시도하고, 대기 중 일반 접근은 차단하며 상태 화면만 허용한다. 데이터 정리 후 Auth 삭제 전에 주소 사본 없이 상태별 이메일을 보내며, Auth 삭제 실패 시 진행 상태를 알리고 삭제만 재시도한다. 게임 구독 해제도 Storage 정리 대기 작업과 재시도 후 행을 삭제하며, 처리 중에는 목록에 “삭제 처리 중”으로 표시하기로 했다. 성능 기준 기기는 중급 Android 실기기다. worker/메일 전달 구조와 성능 측정 세부조건은 미결정이다. Netlify 제안은 보류하며, 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정이다. 기존 결정인 Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스와 Tauri 정적 export, Web/PWA 우선 순서는 유지한다. Netlify 채택과 Web/Desktop 빌드 분리는 별도 미결정이다.
- 브라우저 Google OAuth를 실제 Supabase 설정으로 검증했다. Google provider 활성화와 `http://localhost:3000/auth/callback` 등록 후 PKCE code 교환, 세션 저장 및 dashboard 복귀가 성공했다. 중복 URL code 교환과 React Strict Mode cleanup 문제를 수정하고 관련 테스트 5개가 통과했다.
- `/`에서 단일 `/auth` 로그인 화면으로 이동하고 dashboard layout에서 비인증 접근을 막는다. 브라우저에서 로그인 상태 이동 및 로그아웃 후 직접 dashboard 접근 차단을 확인했다. 이 client gate는 RLS를 대체하지 않는다. Android PWA 실기기 왕복 검증은 남아 있다.
- 다음 구현 후보는 dashboard 예정 지출 조회의 KST 월 경계와 0원/오류 구분 검증이다. 변경 파일 lint 및 TypeScript 검사는 통과했지만 전체 build는 기존 `src/app/layout.tsx` `@ts-ignore`, `src/lib/tauri-auth.ts` `any` lint 오류로 실패했다.
- Phase 1 run manifest는 `target_sha: null`, `in_progress`이므로 동일-SHA review/test 산출물 및 종료 조건을 확인하기 전까지 협업 run 완료로 취급하지 않는다.
- VS Code Copilot 저장소 설정은 추가했다: `.github/copilot-instructions.md`, `.github/agents/chronoledger-maker.agent.md`, `.github/agents/chronoledger-reviewer.agent.md`. 프로필 인식 및 동일-SHA 리뷰 아티팩트 절차는 사용자의 VS Code 환경에서 별도로 확인한다. 역할 설명만으로 읽기 전용 권한은 강제되지 않는다.
- 상세 설계 미결정 사항과 후속 문서 작업은 [to-do.md](to-do.md)에 추적한다.
- Netlify 플랫폼 및 Web/Desktop 이중 빌드 결정은 Deploy Preview 검증 전까지 대기 중이다. 정적 export가 충족하지 못하는 구체 요구가 확인되면 그때 서버 runtime을 재평가한다.
- 측정 환경과 함께 성능 목표를 확정한다. 상세 순서는 [to-do.md](to-do.md)를 따른다.
## 멀티 에이전트 협업 검토

- 설계안과 검토 의견은 각각 [협업 아키텍처](../md/multi_agent_collaboration_architecture.md), [검토 문서](../md/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
