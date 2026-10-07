# ChronoLedger 협업 사용 가이드 (초보자용)

이 가이드는 사용자가 Maker와 Reviewer를 매번 직접 고르지 않고, **ChronoLedger Orchestrator를 한 번 시작해** 구현·검토·검증을 조정하는 방법을 설명한다.

## 가장 짧은 사용 방법

1. 저장소를 VS Code로 열고 Chat의 **Session Target을 Local**로 선택한다. VS Code의 custom subagent 자동 위임은 Local harness에서 사용한다.
2. Agent 목록에서 **ChronoLedger Orchestrator**를 한 번 선택한다. `Run Subagent` 도구가 활성화되어 있는지 확인한다.
3. 아래처럼 하고 싶은 일을 평소 말로 요청한다.

   ```text
   환불 RPC가 포인트와 자산 원장을 일관되게 복구하는지 구현하고 검증해줘.
   실패 시 변경 사항은 모두 롤백되어야 해.
   실제 데이터베이스에는 접속하지 말고, 완료 후 커밋/푸시/배포는 하지 마.
   ```

4. Orchestrator가 작업 트리가 깨끗하고 요청이 명확하면 run을 만들고 Maker → Reviewer → 테스트 순으로 진행한다. 필요한 선택이 생길 때만 질문한다.
5. 마지막 요약에서 run ID, Target SHA, 리뷰/테스트 결과와 위험을 확인한다. 코드를 기본 브랜치에 합치거나 배포하는 일은 사용자가 직접 결정한다.

## 처음 한 번 설정할 항목

- VS Code에서 **Local** Session Target을 선택한다. Copilot harness와 Local harness는 기능이 같다고 가정하지 않는다. 현재 VS Code 공식 문서의 subagent 위임 흐름은 Local harness를 기준으로 한다.
- `.github/agents/chronoledger-orchestrator.agent.md`가 Agent 목록에 표시되는지 확인한다. 표시되지 않으면 Chat의 **Configure Custom Agents** 진단에서 파일 발견/파싱 오류를 확인한다.
- Orchestrator에 `Run Subagent`, `read`, `search`, `edit`, `execute` 도구가 허용되어야 한다. 터미널이나 파일 편집 권한이 필요한 작업은 VS Code가 승인 창을 표시할 수 있다. 도구를 무조건 모두 자동 승인하지 말고, 실행할 명령과 수정 파일을 확인한다.
- 협업 JSON 검증을 위해 `jsonschema`가 필요하다. 설치되어 있지 않으면 저장소 루트에서 `py -m pip install -r scripts/collaboration/requirements-reviewer.txt`를 실행한다. 패키지 설치는 현재 Python 환경을 바꾸므로 설치 확인이 나오면 목적과 환경을 확인한다.
- `ChronoLedger Maker`는 구현 및 검증 도구를 사용한다. `ChronoLedger Reviewer`는 읽기/검색 도구만 사용하도록 구성되어 있다. 역할 프롬프트는 보안 경계 자체가 아니므로 VS Code 권한 설정과 변경 검토는 계속 중요하다.
- Gemini를 사용할 계획이라면 [Gemini PoC 안내](ChronoLedger_pipeline_auto.md)의 의존성/자격 증명 지침을 별도로 따른다. 일반 Maker/Reviewer 흐름에는 Gemini가 자동 포함되지 않는다.

## Orchestrator가 자동으로 맡는 일

1. 요청을 한 개의 구현 목표로 정리하고 수용 기준을 만든다. 제품 요구가 승인 문서에 이미 정해져 있으면 같은 내용을 사용자에게 다시 묻지 않는다.
2. `git status`로 추적 파일과 새 파일을 모두 확인한다. 저장소가 깨끗할 때 `New-CollaborationRun.ps1`을 호출해 고유 Run ID, 브랜치, `.worktrees/<run_id>`, manifest를 만든다.
3. `ChronoLedger Maker`에게 manifest의 목표와 지정 worktree를 전달한다. Maker가 구현하고 변경 내용을 커밋한다.
4. Orchestrator는 실제 HEAD 커밋 SHA를 확인해 manifest의 `target_sha`를 갱신한다. 커밋되지 않은 이동 중 작업을 고정된 대상인 것처럼 리뷰하지 않는다.
5. 같은 iteration에서는 정적 Reviewer 하나만 사용한다. 기본은 `ChronoLedger Reviewer`이며, 사용자가 Gemini를 명시적으로 선택하고 해당 diff 전송을 승인한 경우 Copilot Reviewer 대신 Gemini PoC를 쓴다. 둘 다 같은 `review.json` 경로를 쓰므로 같은 iteration에서 두 결과를 동시에 저장하지 않는다. Reviewer는 코드를 수정하지 않고 근거가 있는 발견을 반환한다.
6. Orchestrator는 신뢰할 수 있는 manifest 메타데이터로 `review.json`을 작성하고, 적절한 제한 환경에서 가장 작은 관련 테스트를 실행해 `test.json`에 기록한다. 결과는 기존 JSON Schema로 확인한다.
7. 명확하고 범위 안에 있는 리뷰 수정만 최대 반복 횟수 안에서 Maker에게 되돌린다. 새 커밋을 만든 뒤 SHA를 갱신하고 다음 iteration에서 다시 리뷰/테스트한다.
8. 완료, 차단 또는 사용자 결정이 필요한 이유를 한 번의 요약으로 알려준다. 이전 run, 브랜치 또는 worktree를 자동 삭제하거나 덮어쓰지 않는다.

수용 기준을 자연어 요청에서 안전하게 정할 수 없거나 승인된 제품 문서끼리 충돌하면 Orchestrator는 추측하지 않고 필요한 결정만 질문한다. 이는 같은 요구를 다시 확인하는 절차가 아니라, 잘못 구현했을 때 영향이 큰 모호성을 해결하는 단계다.

## 사용자가 개입해야 하는 경우

| 상황 | 왜 멈추는가 | 초보자가 할 일 |
|---|---|---|
| 작업 트리에 변경 파일이 있음 | 새 run의 Base를 무엇으로 삼을지 불분명하고, 기존 변경을 보존해야 함 | `git status --short`로 파일을 확인한다. 보존할 변경은 직접 커밋하거나 별도로 안전하게 보관한다. 파일을 삭제하거나 자동 stash하지 않는다. 다시 깨끗한 상태에서 Orchestrator에게 계속해 달라고 요청한다. |
| 제품 규칙/수용 기준이 모호하거나 승인 문서가 충돌 | AI가 제품 정책을 대신 결정하면 안 됨 | Orchestrator가 제시한 선택과 영향 중 하나를 정하거나 관련 문서를 먼저 갱신한다. |
| 도구 승인 창이 표시됨 | 명령 실행/파일 수정이 사용자 환경에 영향을 줄 수 있음 | 명령과 대상 파일을 읽는다. run 생성, 읽기, 테스트 등 요청 범위에 맞으면 허용하고, 삭제·설치·네트워크·배포 또는 예상 밖 경로이면 거부하고 이유를 확인한다. |
| 테스트가 안전한 격리 환경에서 실행되지 않음 | 호스트/운영 데이터에 부작용을 줄 수 있음 | 임의 실행을 승인하지 않는다. 테스트가 차단됐다는 결과를 받고, 적절한 환경을 준비한 뒤 재개를 요청한다. |
| P1 보안/데이터 손상 문제, 상충하는 리뷰 또는 iteration 한도 도달 | 자동 수정이 더 큰 위험이나 잘못된 완료 판정을 만들 수 있음 | 근거·영향·선택지를 확인한 뒤 수정 방향을 결정한다. 해결 전에는 성공으로 처리하지 않는다. |
| Gemini Reviewer를 사용하려 함 | 선택한 커밋 diff 전체가 외부 Gemini API로 전송됨 | 먼저 [PoC 안내](ChronoLedger_pipeline_auto.md)를 읽는다. 전송 파일과 전체 diff를 확인할 준비가 됐을 때만 실제 실행을 승인한다. |
| 최종 변경 통합/배포 | 협업 run은 검토된 브랜치를 기본 브랜치에 자동 반영하지 않음 | Target SHA, diff, 테스트 결과를 직접 확인한 뒤 별도로 merge/cherry-pick 및 배포를 결정한다. |
| 완료 후 worktree를 정리하려 함 | 브랜치/worktree에 유용한 미커밋 변경 또는 증거가 남아 있을 수 있음 | 먼저 `git status`와 run 결과를 확인한다. 해당 run 전용임을 확신하고 보존할 내용이 없을 때 별도 정리 명령을 요청한다. |

## Gemini Reviewer PoC 사용 시 추가 주의

Gemini는 선택형 Reviewer 대안이다. Copilot Reviewer와 역할은 비슷하지만, 리뷰 입력을 외부 API에 전송한다. 둘은 한 iteration에서 같은 `review.json` 파일을 사용하므로 한 번의 run iteration에는 하나만 선택한다. Orchestrator는 매번 대신 승인하지 않는다.

- 먼저 dry-run으로 run 상태와 전체 diff를 출력해 확인한다. dry-run은 API를 부르지 않는다.
- 실제 실행은 사용자가 `GEMINI_API_KEY`, `GEMINI_MODEL`을 안전하게 현재 프로세스 환경에 설정한 뒤 인터랙티브 PowerShell에서 수행한다.
- 파일/키 필터가 모든 비밀을 찾아내지는 않는다. 전송할 전체 diff를 직접 읽고 승인한다.
- CLI에서 `y`를 입력하지 않으면 전송하지 않는다. 비대화형 터미널에서는 도구가 fail-closed로 중단될 수 있으므로, Orchestrator가 대신 실행한 것처럼 보고하지 않는다.
- 결과는 리뷰 초안일 뿐이다. 테스트 성공, 코드 안전성 또는 merge 승인과 같은 의미가 아니다.

명령 예시는 다음과 같다. 실제 API 실행 전에는 위의 diff 검토와 전송 동의가 필요하다.

```powershell
py scripts/collaboration/run_gemini_reviewer.py `
  --run-id "expense-refund-review" `
  --iteration 1 `
  --dry-run
```

## 작동하지 않을 때

- **Orchestrator가 Maker/Reviewer를 호출하지 않음:** Session Target이 Local인지, Run Subagent 도구가 켜졌는지 확인한다. 프롬프트에 “요청의 역할에 따라 Maker와 Reviewer를 직접 위임해”라고 덧붙인다.
- **에이전트가 목록에 없음:** VS Code에서 저장소 루트를 열었는지, Agent 파일이 `.github/agents/` 아래 있는지, Configure Custom Agents 진단에 YAML 오류가 없는지 확인한다.
- **run 생성이 중단됨:** 오류를 그대로 확인한다. 가장 흔한 원인은 dirty worktree, 중복 Run ID/브랜치 또는 같은 경로의 기존 run이다. 기존 자료를 조사하지 않고 삭제/초기화하지 않는다.
- **테스트나 JSON 검증을 실행할 수 없음:** 실제로 실행되지 않은 결과는 `passed`가 아니다. 실패/차단 사유와 사용 환경을 요약에 남긴다.
- **VS Code 버전이나 harness에서 subagent를 지원하지 않음:** 아래 [수동 대체 절차](ai-collaboration-usage.md)를 이용해 필요한 역할만 직접 선택한다. 역할 전환 버튼은 자동 역할 선택과 같지 않다.

## 현재 검증 상태

Orchestrator 설정과 가이드는 저장소에 추가했지만, 이 변경 세션에서는 VS Code의 Agent 목록 인식, Local subagent 호출, 새 run 생성/정리, Maker→Reviewer 전체 통합 흐름을 실제로 실행하지 않았다. 사용 전 첫 clean run에서 확인해야 한다. Gemini 실제 API 연결 및 외부 전송도 별도 승인 전까지 검증하지 않는다.
