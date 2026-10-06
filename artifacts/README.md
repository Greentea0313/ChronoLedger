# 협업 실행 아티팩트

이 폴더는 협업 실행별 계획, 정적 리뷰, 테스트 결과 및 사용자용 종료 보고서를 공유한다. VS Code GitHub Copilot은 저장소의 `.github/copilot-instructions.md`와 `.github/agents/chronoledger-reviewer.agent.md`를 통해 Reviewer로 사용할 수 있다. AI 제품 간 자동 호출은 구성되어 있지 않으며, 사용자가 같은 SHA와 아래 산출물 계약을 각 역할에 전달하고 결과 파일을 확인·저장한다. 초보자 절차는 [AI 협업 사용 안내](../docs/ai-collaboration-usage.md)를 참고한다.

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
- Copilot이 응답으로 반환한 리뷰는 사용자가 내용을 확인해 적절한 `iteration-XX/review.json`에 저장한다. Copilot 프로필이 로드됐거나 JSON이 스키마 검증됐다고 가정하지 않는다.
- 예시 파일은 `templates/`를 참고한다. 새 실행은 아래 PowerShell 스크립트로 만든다.
- 실행 예: `./scripts/collaboration/New-CollaborationRun.ps1 -RunId "expense-refund-review" -Objective "환불 RPC 검증" -AcceptanceCriteria @("환불 성공 시 원장 잔액이 일치", "실패 시 모든 변경이 롤백")`
- 로그 원문, 환경 변수 파일, 토큰, 비밀번호, 개인정보는 이 폴더에 저장하거나 Git에 추가하지 않는다. 민감값이 포함될 수 있는 로그는 `raw-logs/`에 임시로 두며 Git에서 제외된다.
- 공유 저장소의 아티팩트에는 민감값을 제거한 요약만 남긴다. 검증되지 않은 항목은 성공으로 표시하지 않는다.

## 격리 및 롤백

- 실행 브랜치는 `.worktrees/<run_id>`의 전용 Git worktree에서 작업한다.
- `scripts/collaboration/New-CollaborationRun.ps1`은 저장소가 깨끗할 때만 worktree를 만든다. 미커밋/미추적 변경을 자동 stash, 복사, 폐기하지 않는다.
- 실패하거나 반복 한도에 도달해도 공유 작업 트리에 `git reset --hard`를 실행하지 않는다. 브랜치, worktree 및 비밀정보를 제거한 보고서를 보존한다.
- 워킹 트리가 깨끗해지고 설계·스크립트가 커밋된 뒤에만 새 run을 만든다. 현재 작업 중인 변경을 보존하려고 본 설정 작업에서는 새 worktree를 만들지 않았다.

## 현재 상태

- 산출물 형식과 전용 worktree 생성 스크립트가 준비됐다.
- 외부 Gemini 에이전트 자동 연동은 설정되지 않았다.
- 현재 환경에서 Docker 실행 파일을 찾지 못해 컨테이너 테스트 실행은 아직 불가능하다. 호스트에서 동적 테스트로 대체하지 않는다.
