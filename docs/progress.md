# 프로젝트 진행 현황

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


