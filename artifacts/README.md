# 협업 실행 아티팩트

이 폴더는 협업 실행별 계획, 정적 리뷰, 테스트 결과 및 사용자용 종료 보고서를 공유한다. VS Code Local harness에서 `ChronoLedger Orchestrator`는 Maker/Reviewer custom agent를 하위 에이전트로 위임한다. 다른 harness에서 자동 위임을 가정하지 않는다. Gemini API Reviewer PoC는 별도 명령행 도구로, 전체 diff 전송마다 사용자의 확인이 필요하다. 초보자는 [최소 개입 협업 가이드](../docs/ChronoLedger_collaboration_guide.md)를 참고한다.

## 디렉터리 규약

```text
artifacts/<run_id>/
├── run.json
├── iteration-01/
│   ├── review.json
│   ├── test.json
│   └── human-report.md   # 차단 또는 사용자 판단이 필요한 경우
└── iteration-02/
```

- `run_id`는 소문자 영문/숫자로 시작하는 고유한 하이픈 구분 이름이다. 같은 ID를 재사용하지 않는다.
- `run.json`은 목표, 수용 기준, Base SHA, 전용 브랜치/worktree, 최대 반복 수를 기록한다.
- 결과 JSON은 `schemas/`의 JSON Schema를 따른다. 모든 검토/테스트 결과는 같은 `target_sha`를 기준으로 판정한다.
- `scripts/collaboration/validate_collaboration_artifact.py`로 결과 파일을 저장 후 검증한다. `jsonschema` 의존성은 `scripts/collaboration/requirements-reviewer.txt`로 설치한다.
- Orchestrator가 Reviewer 결과를 신뢰된 manifest 메타데이터와 결합해 `iteration-XX/review.json`에 저장하고 Schema validator를 실행한다. 이 흐름을 실제 실행 환경에서 확인하기 전까지 자동 성공을 가정하지 않는다.
- 예시 파일은 `templates/`를 참고한다. 새 실행은 아래 PowerShell 스크립트로 만든다.
- 실행 예: `./scripts/collaboration/New-CollaborationRun.ps1 -RunId "expense-refund-review" -Objective "환불 RPC 검증" -AcceptanceCriteria @("환불 성공 시 원장 잔액이 일치", "실패 시 모든 변경이 롤백")`
- 로그 원문, 환경 변수 파일, 토큰, 비밀번호, 개인정보는 이 폴더에 저장하거나 Git에 추가하지 않는다. 민감값이 포함될 수 있는 로그는 `raw-logs/`에 임시로 두며 Git에서 제외된다.
- 공유 저장소의 아티팩트에는 민감값을 제거한 요약만 남긴다. 검증되지 않은 항목은 성공으로 표시하지 않는다.
- Gemini API Reviewer PoC는 `review.json`을 쓰기 전에 응답을 `schemas/review.schema.json`으로 검증하고 기존 파일을 덮어쓰지 않는다. API 리뷰는 테스트 결과나 병합 승인으로 간주하지 않는다. 사용법과 외부 전송 한계는 [PoC 문서](../docs/ChronoLedger_pipeline_auto.md)를 따른다.

## 격리 및 롤백

- 실행 브랜치는 `.worktrees/<run_id>`의 전용 Git worktree에서 작업한다.
- `scripts/collaboration/New-CollaborationRun.ps1`은 저장소가 깨끗할 때만 worktree를 만든다. 미커밋/미추적 변경을 자동 stash, 복사, 폐기하지 않는다.
- 실패하거나 반복 한도에 도달해도 공유 작업 트리에 `git reset --hard`를 실행하지 않는다. 브랜치, worktree 및 비밀정보를 제거한 보고서를 보존한다.
- 워킹 트리가 깨끗해지고 설계·스크립트가 커밋된 뒤에만 새 run을 만든다. 현재 작업 중인 변경을 보존하려고 본 설정 작업에서는 새 worktree를 만들지 않았다.

## 현재 상태

- 산출물 형식과 전용 worktree 생성 스크립트가 준비됐다.
- 외부 Gemini 에이전트 자동 호출/파일 전달은 설정되어 있지 않다. 동일 SHA 고정, 전체 diff 사전 표시 및 사용자 승인 뒤에만 Gemini API Reviewer PoC가 호출될 수 있다. Live API 호출은 아직 확인하지 않았다.
- 현재 환경에서 Docker 실행 파일을 찾지 못해 컨테이너 테스트 실행은 아직 불가능하다. 호스트에서 동적 테스트로 대체하지 않는다.
