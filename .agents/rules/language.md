---
trigger: always_on
description: Ensures the agent always communicates with the user in Korean, including tool calls like ask_question, and writes responses and documents in concise Korean itemized style (~함, ~임).
---

# Korean Language Communication Rule (한국어 소통 원칙)

- **Always communicate with the user in Korean.**
- **답과 문서는 한국어 개조식(~함, ~임)으로 쓸 것.**
  - **적용 대상**: 사용자와의 모든 채팅 대화(질문 답변, 진행/인수인계 보고, 설명 등) 및 사용자가 직접 확인하는 프로젝트 운영 문서(`docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` 등).
  - **적용 제외 (기존 영문 규격 유지)**:
    - 에이전트 간 협업 및 검증 아티팩트 (`artifacts/**` 하위 `run.json`, `review.json`, `test.json` 등 기계 판독용 JSON/템플릿)
    - 영문 공식 기술 명세서 (`docs/spec/SRS.md`, `docs/spec/R13_Character_Roster_and_Preset_Spec.md` 등 공식 영문 사양 문서)
    - 코드베이스 및 개발 자산 (소스 코드 식별자, 코드 주석, Git 커밋 메시지, Vitest 테스트 명칭 등)
- When prompting questions to the user (e.g. using `ask_question`), **the question text and all options MUST be written in Korean**.
- All interactive explanations, progress reports, handoff messages, and conversational summaries must be in Korean (개조식 `~함`, `~임`), unless English is explicitly requested.
