# 멀티 에이전트 협업 및 교차 검증 아키텍처 (최종 설계안)

## 1. 아키텍처 개요
본 아키텍처는 Maker, Reviewer, Orchestrator의 역할을 분리한다. 기본 협업 설정은 VS Code Local harness의 `ChronoLedger Orchestrator` custom agent가 Maker와 Reviewer를 하위 에이전트로 위임하는 반자동 파이프라인이다. run 생성과 일반 구현·검토·테스트·결과 기록은 정해진 범위 안에서 자동 진행하고, 저장소 상태 문제, 미결정 제품 규칙, 위험한 수정, Gemini 외부 전송 및 최종 통합 같은 필수 사용자 결정에서만 멈춘다.

자동 subagent 위임은 VS Code Local harness의 Run Subagent 도구에 의존한다. 다른 harness에서 동작한다고 가정하지 않으며, 미지원 환경에서는 사용자가 기존 수동 절차로 역할을 선택한다. 프로필은 권한 경계 자체가 아니므로 VS Code 도구 허용/승인 설정과 사용자의 최종 변경 검토가 계속 필요하다.

## 2. 에이전트 역할 분담

### 1) Maker (구현 담당 | ChronoLedger Maker)
* **역할:** 작업 계획과 완료 조건에 맞춰 코드를 구현하고, 결과를 식별 가능한 커밋(Target SHA) 또는 스냅샷으로 기록합니다.
* **제약:** Orchestrator가 배정한 run worktree와 수용 기준 안에서만 수정하며 manifest 및 Reviewer/Test artifact를 쓰지 않습니다. 리뷰 결과를 반영하되, 범위를 벗어나는 요구가 발생하면 임의로 수정하지 않고 상향 보고합니다.

### 2) Reviewer (정적 검토 담당 | VS Code GitHub Copilot 우선)
* **역할:** 코드를 직접 수정하지 않는 읽기 전용(Read-only) 에이전트로, 기준 커밋(Base SHA)과 변경점(Diff)을 비교 검토합니다.
* **제약:** 발견 사항에 대해 대상 파일, 줄 번호, 명확한 근거, 파급 효과, 재현/검증 방법을 구체적으로 명시해야 합니다.
* **실행:** Orchestrator가 동일한 Base/Target SHA와 변경 범위를 전달하여 하위 에이전트로 호출합니다. 직접 실행은 수동 대체 절차입니다. 읽기/검색 도구만 구성하지만 실제 권한은 VS Code에서 확인해야 합니다.

### 3) Orchestrator (실행 및 조정 담당 | ChronoLedger Orchestrator 또는 사용자)
* **역할:** run script 실행, Maker/Reviewer 위임, target SHA 고정, 안전한 검증, Schema artifact 기록 및 bounded iteration 조정을 담당합니다.
* **제약:** 제품 구현 파일을 직접 수정하거나 run을 merge/push/deploy/삭제하지 않습니다. API 외부 전송 및 미결정 제품/보안 판단을 사용자 대신 승인하지 않습니다.
* **실행:** `.github/agents/chronoledger-orchestrator.agent.md`에서 자동 위임 절차를 정의합니다. Local harness와 `Run Subagent`가 없거나 자동 실행이 실패하면 `docs/ChronoLedger_collaboration_guide.md`의 수동 절차로 대체합니다.

## 3. 동적 테스트 및 안전 환경 (Sandbox Execution)
* **환경 격리:** Orchestrator가 스크립트나 동적 테스트를 실행할 때는 시스템 부작용과 데이터 오염을 막기 위해, 반드시 로컬 호스트와 격리된 컨테이너(Docker 등) 또는 가상 환경에서 실행합니다.
* **보안 및 데이터 보호:** 운영 환경의 `.env` 파일 접근을 차단하고 더미 데이터가 포함된 `.env.test`만 주입합니다. 테스트 로그나 결과 파일에 개인 정보, 토큰, 비밀번호 등의 민감 데이터가 복사되지 않도록 마스킹 처리합니다.

## 4. 통신 규격 및 워크플로우

### 파일 기반 비동기 통신
에이전트 간 자유로운 핑퐁 대신 Orchestrator가 명시적인 역할 프롬프트와 결과를 전달합니다. `run_id`별 폴더(예: `artifacts/<run_id>/iteration-01/review.json`)를 사용해 SHA와 iteration에 따라 결과를 기록하고, 기존 결과는 덮어쓰지 않습니다. 가능한 경우 결과 저장 전에 JSON Schema 검증기를 실행합니다.

```json
{
  "schema_version": 1,
  "run_id": "2026-10-02-auth-update",
  "iteration": 1,
  "agent": "reviewer",
  "role": "static-review",
  "base_sha": "abc1234",
  "target_sha": "def5678",
  "status": "findings",
  "findings": [
    {
      "id": "REV-001",
      "severity": "P1",
      "file": "src/auth/login.py",
      "line": 42,
      "evidence": "비밀번호 해시 검증 로직 누락",
      "impact": "보안 무결성 훼손",
      "recommendation": "bcrypt compare_hash 함수 적용 및 테스트 케이스 추가"
    }
  ]
}
```
*(결과 판단 시 파일 수정 시각이 아닌 `target_sha`와 `iteration` 번호가 현재 대상과 일치하는지를 기준으로 최신 상태를 판정합니다.)*

## 5. 반복 제어 및 예외 처리

### 1) 반복(Iteration) 제한
* 작업 시작 시 최대 수정 사이클 수(기본 3회)를 고정합니다.
* 반복 횟수는 Maker에 의해 새로운 Target SHA가 생성된 실질적 코드 변경이 있을 때만 증가합니다.
* 리뷰와 테스트 결과가 상충할 경우 증거를 비교하여 판정하며, 다수결 채택이나 최신 파일 덮어쓰기 방식으로 자동화하지 않습니다.

### 2) 상태 롤백 메커니즘 (State Rollback)
* 최대 수정 사이클에 도달했거나 P1(보안/데이터 무결성) 이슈를 에이전트 선에서 해결하지 못한 경우, 파이프라인 루프를 강제 종료합니다.
* 각 실행은 사용자의 공유 작업 트리와 분리된 전용 Git worktree/브랜치에서 진행합니다. Maker와 Orchestrator는 그 실행에 속한 격리 작업 공간만 사용합니다.
* 종료 시 `git reset --hard`를 자동 실행하지 않습니다. 실패한 브랜치, worktree 및 민감정보를 제거한 결과 보고서를 보존해 사용자가 변경 내용을 검토할 수 있게 합니다.
* 정리가 필요하면 해당 실행이 만든 전용 worktree인지와 미커밋 변경 여부를 확인한 뒤 별도 정리 절차를 수행합니다. 공유 작업 트리의 기존 변경은 어떤 경우에도 자동 폐기하지 않습니다.

### 3) Human-in-the-Loop UX (사용자 개입 최적화)
* 에러가 해결되지 않아 루프가 중단되면, Orchestrator는 분산된 JSON 로그들을 종합하여 개발자가 읽기 쉬운 **단일 마크다운 리포트**를 생성합니다.
* 리포트는 파편화된 로그 대신 `[문제 요약]`, `[Maker와 Reviewer의 충돌 지점 및 근거]`, `[인간 개발자가 선택할 수 있는 해결 옵션]` 구조로 요약되어, 사용자가 즉각적인 결정을 내리고 파이프라인을 재개할 수 있도록 지원합니다.
* 사용자의 기본 진입점은 Orchestrator 하나입니다. dirty tree 보존, 미결정 요구/위험 수정, 테스트 격리 실패, 매회 Gemini diff 전송 동의 및 최종 merge/deploy만 사용자 확인을 요구합니다. 절차별 안내는 `docs/ChronoLedger_collaboration_guide.md`에 둡니다.
