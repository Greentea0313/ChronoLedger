# ChronoLedger AI 지침 한국어 원본 아카이브 (agent-rules-ko)

이 디렉터리는 ChronoLedger 5대 AI 모델 협업 아키텍처 구축 과정에서 작성된 에이전트 지침 및 규칙 문서들의 **한국어 원본 아카이브**입니다.

## 1. 아카이빙 배경 및 목적

1. **시스템 프롬프트 토큰 최적화 (Phase 12.22 / R12)**:
   - AI 에이전트(Claude Code, GPT Codex, GitHub Copilot, Gemini)가 매 턴마다 자동으로 로드하는 시스템 프롬프트 지침 문서(`CLAUDE.md`, `AGENTS.md`, `.agents/rules/*.md`, `.agents/skills/*/SKILL.md`)를 의미 손실 없이 간결한 영문(English)으로 전면 전환하여 토큰 소모량을 대폭 절감했습니다.
2. **이력 보존 및 원문 대조**:
   - 기존에 상세하게 정립된 한국어 규칙 및 운용 지침의 의미를 보존하고, 향후 규칙 개정 시 원본 대조가 가능하도록 본 디렉터리에 분리 보관합니다.
3. **중복 로드 원천 차단**:
   - 에이전트가 자동 탐색하는 `.agents/` 디렉터리 및 프로젝트 루트 바깥인 `docs/archive/` 하위에 배치하여 불필요한 시스템 프롬프트 중복 주입을 방지합니다.

## 2. 원본-영문 파일 매핑

| 아카이브 원본 파일 (`*-ko.md`) | 현행 영문 지침 파일 | 설명 |
| :--- | :--- | :--- |
| `CLAUDE-ko.md` | `CLAUDE.md` | Claude Code 전용 루트 지침 (Sonnet/Opus 2단계 운용, 디스패치 트리거) |
| `AGENTS-ko.md` | `AGENTS.md` | 범용 코딩 에이전트 루트 지침 (5대 모델 매트릭스, 5단계 실행 프로토콜) |
| `language-ko.md` | `.agents/rules/language.md` | 한국어 소통 원칙 (`ask_question` 선택지 한국어 강제) |
| `collaboration-ko.md` | `.agents/rules/collaboration.md` | 5대 AI 모델 역할 분배, Sonnet/Opus 2단계 기준, 비상 인계 규칙 |
| `handoff-rule-ko.md` | `.agents/rules/handoff.md` | 인수인계 프로토콜 및 디스패치 큐 규칙 |
| `document_location-ko.md` | `.agents/rules/document_location.md` | 문서 프로젝트 내부(`docs/`) 저장 원칙 |
| `handoff-SKILL-ko.md` | `.agents/skills/handoff/SKILL.md` | 인수인계 및 디스패치 실행 스킬 |
| `chronoledger-orchestrator-SKILL-ko.md` | `.agents/skills/chronoledger-orchestrator/SKILL.md` | 조율자(Orchestrator) 워크플로우 스킬 |

> **참고**:
>
> - 사용자 대면 응답 및 소통은 `.agents/rules/language.md`에 따라 **항상 한국어**로 수행됩니다.
> - 사용자가 직접 열람하는 `docs/` 내 운영 문서(`handoff.md`, `to-do.md`, `progress.md`, `changelog.md`, `collaboration-guide.md`, `docs/spec/*`)는 한국어로 관리됩니다.
