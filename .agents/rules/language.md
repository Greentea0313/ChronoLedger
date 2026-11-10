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
- **사용자 화면에 보이는 모든 도구 산출 문구도 한국어 개조식으로 쓸 것**:
  - 작업 목록(plan/todo)의 단계 문구, 완료 상자(`recap`·`ask`·버튼 라벨), 서브에이전트·세션에 넘기는 브리프 제목, 대화 요약문이 해당함.
  - 예: `Check dispatch queue and workspace state` → `인수인계 큐와 작업 공간 상태 확인`, `Run tsc, lint, Vitest` → `tsc·lint·Vitest 실행`.
- **개조식 판정 기준**: 종결어미를 줄여 항목형으로 끝맺음(`~함`, `~임`, `~됨`, `~음`, `~필요`, `~예정`, 명사 종결 허용).
  - **금지 표현**: `~습니다`, `~겠습니다`, `~했습니다`, `~입니다`, `~해요`, `~해 주세요` 등 서술형 존댓말은 쓰지 않음.
  - 올바른 예 / 잘못된 예: `테스트 통과함` / `테스트를 통과했습니다`, `Step 2는 Opus가 수행함` / `Step 2는 Opus가 수행하겠습니다`.
  - 길어진 대화·요약 이후에도 동일하게 적용하며, 고정 안내 문구도 예외 없이 개조식으로 씀.
- When prompting questions to the user (e.g. using `ask_question`), **the question text and all options MUST be written in Korean**.
- All interactive explanations, progress reports, handoff messages, and conversational summaries must be in Korean (개조식 `~함`, `~임`), unless English is explicitly requested.
