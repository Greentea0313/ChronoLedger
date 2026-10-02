# 프로젝트 인수인계 문서 (handoff.md)

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
- SRS 검토 재개 체크포인트: [srs-review-checkpoint.md](srs-review-checkpoint.md). 이번 작업은 체크포인트 저장 후 중단한다. 사용자가 나중에 재개하면 이 문서와 SRS를 먼저 읽어 시작 지점을 확인한다(다음 위치: §5).
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- 프로젝트는 문서 기반 기획/요구사항 정리 단계다. 코드는 구현되지 않았고 SQL은 실제 Supabase/PostgreSQL에서 검증되지 않았다.
- `SRS.md` v1 초안은 작성됐으나 사용자 리뷰/승인 전이다. 승인 및 DB 실행 검증 전까지 설계 단계 공식 진입은 보류한다.
- SRS는 항목별 사용자 검토를 진행 중이다. §4.8 아이콘/메모 검토를 완료했고 다음은 §5 외부 인터페이스 및 환경이다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 설계 진입 전 해결 사항

- 사용자 리뷰로 [SRS.md](../md/SRS.md)의 요구사항/가정을 승인 또는 수정한다.
- SRS의 수용 기준에 대한 재현 가능한 테스트 환경 검증을 수행한다.
- 검증 결과를 반영하고 설계 단계 진입 여부를 결정한다.

## 다음 작업

- 사용자가 후속 작업을 시작하면 `srs-review-checkpoint.md`를 먼저 읽고 그때의 SRS 상태와 적절한 시작 지점을 확인한다. 전체 리뷰 승인 뒤 `to-do.md`의 SQL 검증 항목을 진행한다.
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


