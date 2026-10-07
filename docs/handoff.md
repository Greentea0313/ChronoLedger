# 프로젝트 인수인계 문서 (handoff.md)

## 최신 작업 상태 (2026-10-07)

- `/auth`를 앱과 맞는 다크 테마로 개선했다. 이메일/비밀번호 레이블, 이메일 로그인·가입과 Google 대체 액션을 명확히 배치하고 기존 인증 처리는 유지했다. 320/390/768/1280px에서 넘침이 없으며 입력 영역이 44px 이상임을 확인했다. 키보드 순서(이메일, 비밀번호, 로그인, 가입, Google)도 확인했다.
- 브라우저 접근성 트리에서 H1/H2 구조 및 폼/버튼 이름을 확인했다. 주요 로그인 텍스트 대비는 최소 6.13:1, dashboard 텍스트 조합은 최소 5.31:1, 로그인 초점 표시 대비는 5.21:1이다.
- 공용 `CardTitle`을 H2로 수정했고 dashboard 로딩·오류 알림 역할, nav 이름과 장식 아이콘 처리를 보완했다. dashboard는 보호 상태라 브라우저에서 인증된 런타임이나 실제 스크린리더를 검증하지 않았다.
- callback 회귀 테스트 5개와 `npx tsc --noEmit`이 통과했다. 실제 인증 흐름은 이번 UI 검증에서 다시 실행하지 않았다. 앱 전체 테마 전환 및 키보드/스크린리더 심화 검증은 남아 있다.
- `.eslintrc.json`에 `root: true`를 추가해 상위 저장소 ESLint 설정을 잘못 이어받던 문제를 해결했다. `npm run lint`와 `npm run build`가 ESLint·타입 검사를 포함해 통과했고 정적 `/`, `/auth`, `/auth/callback`, `/dashboard`를 생성했다.
- A2Z 9개 WOFF2 굵기를 `public/fonts/a2z/`에서 자체 호스팅하고 SIL OFL 1.1을 동봉했다. 제작자 제공 파일의 내장 저작권 표기(`Copyright © 2026 PT&`)와 라이선스 metadata를 확인했다.
- 앱 전역 `src/app/globals.css`에서 A2Z 100–900을 등록했다.
- 출처: [제작자 안내](https://freesentation.blog/a2z), [눈누 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1](https://openfontlicense.org/documents/OFL.txt).
- 앱 `/auth`에서 A2Z 9개 굵기 로드를 확인했다. 빌드·린트는 위에 기록한 상위 설정 탐색 문제 수정 후 통과했다.

## 최신 작업 상태 (2026-10-06)

- Google provider와 localhost Redirect URL을 실제 확인하고 브라우저 OAuth 왕복을 검증했다. PKCE code 교환·세션 저장·dashboard 복귀가 성공한다.
- OAuth 자동 code 교환 중복 및 React Strict Mode effect cleanup을 수정했다. callback 테스트 5개, 변경 파일 lint 및 TypeScript 검사가 통과했다.
- `/`를 `/auth`로 통합하고 dashboard layout 인증 gate를 추가했다. 비인증 직접 dashboard 접근을 브라우저에서 확인해 차단했다. Android PWA 실기기 검증은 남아 있다.

## 현재 상태

- 통합 기획 및 결정 문서: [revisions_and_decisions.md](../md/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](../md/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](../md/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../md/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](../md/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](../md/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](../md/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](ai-collaboration-usage.md)
- SRS 검토 재개 체크포인트: [srs-review-checkpoint.md](srs-review-checkpoint.md). 이는 SRS 승인 전 검토의 역사 기록이며 현재 진행 지점은 아래 최신 작업 상태와 [progress.md](progress.md)를 따른다.
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- SRS v1.0은 사용자 승인됐고 테스트 프로젝트의 rollback-only SQL smoke suite는 PASS/rollback으로 확인되어 설계 단계 진입이 승인됐다.
- Web/PWA 구현을 진행 중이다. 브라우저 Google OAuth의 실제 로컬 E2E는 확인했으나 Android PWA 설치 환경 E2E는 남아 있다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 후속 설계 및 검증 사항

- SRS 수용 기준별 상세 테스트와 전체 DB/RPC/RLS 검증 계획을 구현과 함께 추적한다.
- 성능 목표는 측정 환경과 함께 확정한다.

## 다음 작업

- 다음 구현은 Android PWA OAuth 실기기 검증과 Dashboard 예정 지출 조회의 KST 월 범위/오류 상태 확인이다. Windows Tauri OAuth 딥링크·패키징은 MVP 이후 진행한다.
- 최신 결정은 `resolved-blockers.md`와 `revisions_and_decisions.md`의 2026-10-02 보완 항목을 우선한다.

## 멀티 에이전트 협업 검토

- 설계안과 검토 의견은 각각 [협업 아키텍처](../md/multi_agent_collaboration_architecture.md), [검토 문서](../md/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
