# 다중 AI 에이전트 협업 파이프라인 (ChronoLedger 보완판)

원본: 사용자 초안 `Multi-Agent_Workflow_Pipeline.md`(5단계). 이 문서는 초안의 단계 구조를 유지하고, [SKILL.md](../md/SKILL.md)(인수인계 문서화)와 [agent_rules.md](../md/agent_rules.md)(생각 후 코딩·단순성·최소 변경·검증 가능한 목표)로 보완한 제안이다. 승인된 결정이 아니며, 채택 여부는 [포팅 검토](ChronoLedger_pipeline_v2_porting_review.md)의 사용자 결정 항목에 따른다.

## 0. 공통 원칙 (모든 단계에 적용)

| 원칙 | 근거 | 내용 |
|---|---|---|
| 단일 진실 공급원 | 프로젝트 지침 | 제품 기준은 `md/revisions_and_decisions.md`, 승인된 `md/SRS.md`다. `md/SPEC.md`, `md/SCHEMA.sql`은 상세 기준이다. 충돌하면 보고하고 임의로 고르지 않는다. |
| 가정 명시 | agent_rules 1 | 불명확하면 가정을 적고 질문한다. 조용히 선택하지 않는다. |
| 단순성 | agent_rules 2 | 요청 범위 밖 기능, 불필요한 추상화, 새 도구를 추가하지 않는다. |
| 최소 변경 | agent_rules 3 | 요청과 직접 관련된 줄만 수정한다. 기존 사용자 변경을 보존한다. |
| 검증 가능한 완료 조건 | agent_rules 4 | 각 단계는 통과/실패를 판정할 수 있는 조건을 가진다. 실행하지 않은 빌드·테스트를 성공이라 쓰지 않는다. |
| 인수인계 문서 | SKILL.md | 의미 있는 작업 뒤 `docs/`의 progress, handoff, to-do, changelog를 갱신하고 구조가 바뀌면 architecture, 함정이 있으면 known-pitfalls를 갱신한다. 미확인 항목은 "검증 필요"로 표시한다. |
| 고정된 대상 | 기존 협업 설계 | 리뷰·테스트 결과는 Base/Target SHA와 iteration에 묶는다. 수정 시각으로 최신 여부를 판단하지 않는다. |
| 비밀정보 | 프로젝트 지침 | 키, `.env` 값, 개인정보, 원본 민감 로그를 프롬프트·산출물·커밋에 넣지 않는다. |

## 1. 기획 및 아키텍처 설계 (Antigravity / Gemini)

- **역할:** 설계 초안 작성 보조. 제품 결정권자는 아니다.
- **입력:** 승인된 SRS, SPEC, SCHEMA, `docs/architecture.md`, `docs/detailed-design.md`.
- **보완된 작업 내용**
  - 신규 문서를 처음부터 생성하지 않는다. 기존 `SPEC.md`/`architecture.md`를 읽고 **변경 제안(diff 형태)** 만 낸다. SRS는 사용자 승인 없이 수정하지 않는다.
  - 모호한 요구는 "가정 / 질문 / 선택지와 트레이드오프" 표로 낸다.
  - 다이어그램(Excalidraw `.svg`)은 선택 사항이다. 텍스트 설계가 우선이며, 다이어그램은 텍스트와 일치해야 한다.
  - 작업은 작고 검증 가능하게 쪼개 수용 기준을 붙인다.
- **스택 정합:** 초안의 REST API/OOP/Python 예시는 이 프로젝트에 맞지 않는다. 기준은 Next.js App Router + TypeScript + Supabase(RLS, RPC)다.
- **외부 전송:** Antigravity/Gemini에 코드나 문서를 보내는 것이 외부 전송이면 사용자가 전송 내용을 확인하고 승인한 경우에만 한다.
- **완료 조건:** 수용 기준이 측정 가능하고, 미결정 항목이 `docs/to-do.md`에 기록되며, SRS와 충돌이 없음을 확인했다.
- **사용자 개입:** 제품 규칙 결정, SRS 변경 승인.

## 2. 문서 기반 인수인계 (Docs-as-Code Handoff)

- **역할:** 설계에서 구현으로 컨텍스트를 넘기는 단계. 초안의 "열린 파일이 자동으로 컨텍스트가 된다"는 가정은 도구마다 다르므로 **검증 필요**이며, 명시적 인수인계 패킷으로 대체한다.
- **보완된 작업 내용**
  - 인수인계 패킷 = 목표, 수용 기준, 읽을 문서 목록, 수정 허용 파일 범위, 금지 사항, Base SHA.
  - 빈 골격 파일은 Python이 아니라 이 저장소의 TypeScript 구조(`src/`) 안에서 만든다. 기존 모듈 배치와 규칙을 따른다.
  - 기존 협업 흐름에서는 `scripts/collaboration/New-CollaborationRun.ps1`이 run manifest와 격리 worktree를 만든다. 패킷은 `run.json`이 담는다.
  - 저장소에 미커밋 변경이 있으면 시작하지 않고 보존 여부를 사용자에게 묻는다.
- **완료 조건:** run manifest가 존재하고 worktree가 격리되어 있으며 수용 기준이 패킷에 있다.

## 3. 구현 (GitHub Copilot & Codex)

- **역할:** 구현. 한 run에서 쓰기 권한을 가진 구현자는 한 번에 하나만 둔다(충돌 방지).
- **보완된 작업 내용**
  - Copilot: 인라인 보조와 `ChronoLedger Maker` 구현. Codex: 독립 알고리즘 모듈. 같은 파일을 동시에 편집하지 않는다.
  - 단순한 구현을 우선한다. 요청되지 않은 리팩터링은 하지 않는다.
  - `SPEC.md`의 예외 처리 규칙과 RLS/RPC 경계(클라이언트에 비밀 키 없음, 자산·포인트 변경은 RPC)를 따른다.
  - 완료 시 변경을 커밋해 **Target SHA**를 만든다. 움직이는 작업 트리를 리뷰 대상으로 삼지 않는다.
- **완료 조건:** 수용 기준에 대응하는 테스트 또는 확인 절차가 있고, 커밋이 있으며, 범위 밖 파일 변경이 없다.

## 4. 로컬 빌드 및 보안 테스트 (OpenCode)

- **역할:** 같은 Target SHA에 대한 빌드·테스트 실행과 결과 기록.
- **초안과 달라지는 점 (중요)**
  - 초안의 "민감한 `.env` 구성"은 채택하지 않는다. 운영 `.env`와 실제 키는 읽지 않는다. 더미 값만 쓴다(예: 빌드는 더미 `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`).
  - 로컬 DB 연결 테스트는 운영 데이터와 분리된 환경에서만 한다. 격리 환경(Docker/VM)은 이 환경에서 **사용 불가·미검증**이다. 없으면 RLS/RPC 테스트는 "미실행"으로 기록하고 통과로 쓰지 않는다.
  - 표준 검증 명령: `npm ci`, `npm test`(Vitest), `npm run lint`, `npm run build`.
  - 실행 후 작업 트리가 깨끗하고 HEAD가 Target SHA인지 확인한다.
  - 결과는 `artifacts/schemas/test.schema.json` 형식의 `test.json`에 마스킹해서 기록하고 검증기로 확인한다.
- **완료 조건:** 명령별 실제 결과가 기록되었고, 실행하지 못한 항목은 사유와 함께 blocked로 표시되었다.
- **사용자 개입:** 격리 실패, 비밀정보가 필요한 테스트.

## 5. 교차 검증 및 피드백 루프

- **역할:** 환각 방지와 품질 관리. 정적 리뷰어는 읽기 전용이다.
- **보완된 작업 내용**
  - iteration당 정적 리뷰어는 **하나**를 쓴다. 기본은 `ChronoLedger Reviewer`. Gemini는 사용자가 지정한 경우에만 쓴다.
  - Gemini에 보낼 입력은 정확한 diff와 수용 기준이다. 전체 diff를 사용자가 확인하고 승인한 뒤 보낸다(현재는 수동 전달 `docs/Gemini_phase4_manual_review.md` 방식). 매회 승인한다.
  - 결과는 `artifacts/schemas/review.schema.json`(심각도, 파일, 줄, 근거, 영향, 권고)을 따른다. 모델 출력은 신뢰하지 않는 초안으로 취급하고 스키마 검증을 거친다. SHA 메타데이터는 manifest에서 가져온다.
  - 리뷰와 테스트가 충돌하면 증거로 판정한다. 다수결이나 최신 파일 덮어쓰기는 쓰지 않는다.
  - 반복 상한(기본 3회). 새 Target SHA가 생길 때만 반복 횟수가 증가한다.
  - 리뷰가 `SPEC.md` 변경을 요구하면 직접 수정하지 않고 사용자 승인 대상으로 올린다. 해결되지 않는 P1/보안/데이터 무결성 문제는 중단하고 `human-report.md`를 쓴다.
- **완료 조건:** 현재 Target SHA에 대한 review/test 결과가 있고, 미해결 finding이 없거나 사용자에게 보고되었다.

## 6. 종료 및 인수인계 (초안에 없던 단계)

- 요약: run ID, worktree, Target SHA, 변경 파일, review/test 상태, 남은 위험, 필요한 사용자 결정.
- `docs/progress.md`, `handoff.md`, `to-do.md`, `changelog.md`를 갱신하고 구조 변경 시 `architecture.md`, 함정은 `known-pitfalls.md`를 갱신한다. 하지 않은 갱신은 하지 않았다고 쓴다.
- merge, push, deploy, worktree 삭제는 자동으로 하지 않는다. 사용자 명시 지시를 기다린다.

## 7. 사용자 개입 지점 요약

1. 제품 규칙·SRS 변경 결정.
2. 미커밋 변경 보존/커밋.
3. Antigravity/Gemini 등 외부 전송 승인(전송 diff 확인 포함).
4. 격리 테스트 불가 또는 비밀정보가 필요한 테스트.
5. 미해결 고위험 finding, 반복 소진, 증거 충돌.
6. 최종 merge/push/deploy.

## 8. 검증 상태

- 이 문서는 설계 제안이다. 실제 실행 검증은 하지 않았다.
- Antigravity, Codex, OpenCode의 이 저장소 연동·권한·컨텍스트 주입 동작은 **검증 필요**다.
- 에이전트 프로필은 권한 경계가 아니다. 도구 권한과 변경 제안은 사용자가 확인한다.
