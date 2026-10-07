# ChronoLedger Reviewer 에이전트 자동화 PoC

- **문서 상태:** PoC 스크립트 구현 완료 / 외부 API 실행 및 도입 승인 대기
- **구현:** [`scripts/collaboration/run_gemini_reviewer.py`](../scripts/collaboration/run_gemini_reviewer.py)
- **의존성:** [`requirements-reviewer.txt`](../scripts/collaboration/requirements-reviewer.txt)
- **기준:** [협업 아키텍처](../md/multi_agent_collaboration_architecture.md), [AI 협업 사용 안내](ai-collaboration-usage.md), [협업 아티팩트 규약](../artifacts/README.md)
- 전체 협업을 조정하는 기본 프로필은 [ChronoLedger Orchestrator](../.github/agents/chronoledger-orchestrator.agent.md)다. 이 문서의 Gemini PoC는 선택형 외부 리뷰 단계만 설명하며, 초보자용 권한·개입 절차는 [협업 사용 가이드](ChronoLedger_collaboration_guide.md)를 따른다.

## 1. 범위와 한계

이 도구는 지정된 단일 run 및 고정된 Target SHA에 대한 Reviewer 정적 리뷰 초안을 생성한다. Maker 구현, 테스트 수행, 수정 반복, 병합 승인 또는 다른 에이전트 자동 호출은 하지 않는다. 생성 결과는 사람의 검토 전까지 미승인 리뷰 초안이다.

Gemini API는 Git diff를 외부로 전송한다. API 호출은 사용자가 전체 전송 diff를 확인하고 인터랙티브 터미널에서 명시적으로 승인한 경우에만 수행한다. 이 구현은 자동화 도입 승인이나 실제 Gemini 연결 검증을 뜻하지 않는다.

## 2. 구현된 게이트

- `run.json`을 JSON Schema로 검증하고, 지정 run ID, 유효한 iteration, `in_progress` 상태, 설정된 Base/Target SHA를 요구한다.
- manifest의 전용 `.worktrees/<run_id>`와 브랜치가 실제 Git worktree와 일치하는지 확인한다. worktree가 깨끗하고 HEAD가 Target SHA와 같으며 Base SHA가 Target SHA의 조상인 경우만 진행한다.
- Base SHA와 Target SHA 사이의 커밋 diff만 계산한다. 변경 파일 이름과 전체 텍스트 diff를 검토하고, 환경 파일/credential/비밀 파일 경로, 고신뢰 비밀 패턴, 바이너리 파일 및 256 KiB 초과 diff는 전송 전에 거부한다. 비밀 탐지는 완전한 보장을 하지 않으므로 승인 전 사람의 전체 검토도 필수다.
- API 키는 프로세스의 `GEMINI_API_KEY` 환경 변수에서만 읽는다. `.env`/`.env.test`를 로드하지 않으며 비밀값은 프롬프트, 명령행 인수, URL 및 결과 파일에 넣지 않는다. 모델은 `GEMINI_MODEL`로 지정한다.
- 전송 승인 전에는 API를 호출하지 않는다. dry-run은 전체 diff를 출력하지만 키를 읽거나 네트워크를 사용하지 않는다. 비대화형 실행은 외부 전송 승인을 거부한다.
- Gemini 응답은 지정된 `{status, findings}` 본문만 허용한다. 프로그램이 run/SHA 메타데이터를 신뢰 가능한 manifest에서 구성한 뒤 전체 `review.schema.json`으로 검증한다. 결과 파일이 이미 있으면 덮어쓰지 않고, 검증에 성공한 경우에만 같은 디렉터리에 원자적으로 새 파일을 만든다.
- API/검증 실패는 비정상 종료로 명시한다. 자동 재시도는 하지 않으며 기존 run manifest나 리뷰 파일을 성공 형태로 변경하지 않는다. API 호출 후 실패하면 비용이 발생했을 수 있다.

## 3. 사용 방법

Python 3.10 이상에서 의존성을 설치한다.

```powershell
py -m pip install -r scripts/collaboration/requirements-reviewer.txt
```

먼저 dry-run으로 run 상태와 전송할 전체 diff를 확인한다. 이 단계에서는 Gemini API가 호출되지 않는다.

```powershell
py scripts/collaboration/run_gemini_reviewer.py `
  --run-id "expense-refund-review" `
  --iteration 1 `
  --dry-run
```

실제 전송 전에 승인된 보안 경로를 통해 `GEMINI_API_KEY`와 사용할 수 있는 `GEMINI_MODEL`을 현재 프로세스 환경에 설정한다. 키를 저장소, `.env.test`, 명령행 인수 또는 협업 아티팩트에 기록하지 않는다. 이후 dry-run 없이 실행하면 전체 diff가 표시되고, 프롬프트에서 `y`를 입력해야만 API 요청을 보낸다.

```powershell
py scripts/collaboration/run_gemini_reviewer.py `
  --run-id "expense-refund-review" `
  --iteration 1
```

성공 시 `artifacts/<run_id>/iteration-XX/review.json`을 생성한다. 사람은 결과의 근거, 현재 Target SHA 및 JSON Schema를 확인해야 한다. 성공한 리뷰는 테스트 증거나 병합 승인으로 간주하지 않는다. 실패 시 원인을 해결한 뒤 같은 산출물을 덮어쓰지 말고 새 반복/실행 절차를 사용한다.

오프라인 회귀 테스트:

```powershell
py -m unittest discover -s scripts/collaboration -p "test_run_gemini_reviewer.py" -v
```

## 4. PoC 평가와 미완료 사항

채택 결정 전에 수동 리뷰와 비교해 컨텍스트 준비 시간, 전체 처리 시간, 스키마 준수율, 유용한 지적 비율, API 비용 및 실패 횟수를 여러 실행에서 기록한다. 수치 목표나 오류 0%를 보장하지 않는다.

- 구현은 완료했지만 Gemini API 자격 증명 설정, 외부 전송 승인, 실 API 호출 및 결과 품질 평가는 수행하지 않았다.
- 리뷰 diff 전달 전 민감 경로 및 패턴 검사를 수행하나, 정교한 비밀정보 스캐너는 아니며 모든 개인정보/자격 증명을 탐지한다고 보장할 수 없다. 전체 diff를 검토하는 사람의 승인이 계속 필요하다.
- JSON Schema 검증은 결과 모양을 확인할 뿐 리뷰 판단의 정확성, 완전성 또는 코드 안전성을 보증하지 않는다.
- Copilot 리뷰 JSON 등 다른 협업 결과를 검증할 때는 `scripts/collaboration/validate_collaboration_artifact.py`를 사용한다. 이 스크립트는 `requirements-reviewer.txt`의 `jsonschema` 의존성이 필요하다.
- 자동 재시도·비용 과금 상한·Gemini API 가용 모델 목록 조회는 구현하지 않았다. 반복 자동화 및 후속 이벤트 전달도 범위 밖이다.
- PoC 결과 검토 후 사용자가 별도로 도입을 승인해야 한다.
