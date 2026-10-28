# ChronoLedger Instructions for Claude Code

## 1. Core Rule Imports

Claude Code 세션 시작 시 다음 규칙 파일을 우선 로드하고 준수합니다:

- `@.agents/rules/language.md` — [.agents/rules/language.md](file:///c:/Projects/ChronoLedger/.agents/rules/language.md) (한국어 소통 원칙)
- `@.agents/rules/collaboration.md` — [.agents/rules/collaboration.md](file:///c:/Projects/ChronoLedger/.agents/rules/collaboration.md) (5대 AI 모델 역할 분배, 하이브리드 위임 및 비상 인계 규칙)
- `@.agents/rules/handoff.md` — [.agents/rules/handoff.md](file:///c:/Projects/ChronoLedger/.agents/rules/handoff.md) (`"인수인계 문서를 확인해"` 자동 실행 및 문서 갱신 규칙)
- `@.agents/rules/agent_rules.md` — [.agents/rules/agent_rules.md](file:///c:/Projects/ChronoLedger/.agents/rules/agent_rules.md) (핵심 코딩 행동 수칙)
- `@.agents/rules/document_location.md` — [.agents/rules/document_location.md](file:///c:/Projects/ChronoLedger/.agents/rules/document_location.md) (문서 위치 및 분류 규칙)

## 2. Claude 모델 핵심 역할 (Role & Fallback)

ChronoLedger 5대 AI 모델 협업 아키텍처에서 Claude(Claude Pro: Fable / Opus / Sonnet)의 역할은 다음과 같습니다:

- **Claude Pro 환경 지원 및 세부 운용 기준**:
  - **`Claude Fable` / `Claude Opus`**: 고난도 복합 상태·브라우저 생명주기 제어(History API, 비동기 레이스 컨디션 등), 아키텍처 리팩토링, Base $\leftrightarrow$ Target SHA 심층 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증 및 `Gemini 4 Argon` / `GPT Codex` 1순위 대체(Fallback 1) 전담.
  - **`Claude Sonnet`**: 명확히 구체화된 다중 컴포넌트 UI 인터랙션·상태 연동 구현 및 단위 테스트 작성 전담 (Fable/Opus 쿼터 절약 및 고속 구현).
- **기본 역할: `Reviewer & Maker (Complex)`**
  - **정적 코드 리뷰**: Base SHA $\leftrightarrow$ Target SHA 비교 정적 코드 검토를 수행하고 `artifacts/schemas/review.schema.json` 규격에 맞는 `review.json` 생성.
  - **보안 및 무결성 검증**: Supabase RLS 정책, SQL 트리거, 원장 무결성 및 권한/트랜잭션 검증.
  - **복합 리팩토링 및 인터랙션**: 다중 컴포넌트 간 복합 상태 관리, 비동기 파이프라인, 아코디언/드로어 인터랙션 구현 및 아키텍처 리팩토링.
- **대체(Fallback) 역할: 1순위 대체 모델 (Fallback 1)**
  - **Gemini 4 Argon**(`Orchestrator & Architect`) 토큰 소진 시: 1순위 대체 모델로서 오케스트레이션 및 아키텍처 결정 승계 (`Claude Fable / Opus`).
  - **GPT Codex**(`Maker - Core & Test`) 토큰 소진 시: 1순위 대체 모델로서 원장/결제/구독 핵심 로직 구현 및 Vitest 단위 테스트 승계 (`Claude Fable / Opus / Sonnet`).

## 3. "인수인계 문서를 확인해" 자동 실행 프로토콜

사용자가 `"인수인계 문서를 확인해"` (또는 인수인계 확인 요청)를 입력하면, 추가 질문 없이 즉시 아래 6단계를 자동 실행합니다:

1. **큐 확인**: `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue`를 읽습니다.
2. **과제 식별**: 상태가 `⚠️ HANDOVER_NEEDED`(1순위) 또는 `▶ READY`(2순위)인 과제를 식별합니다.
3. **강제 중단 복구**: 이전 모델이 쿼터/토큰 초과로 상태를 갱신하지 못하고 강제 종료된 경우, 대상 Worktree(`.worktrees/<run_id>` 또는 `main`)에서 `git status --short`와 `git diff`를 먼저 스캔하여 미커밋 변경사항을 파악한 뒤 이어서 완수합니다.
4. **스킬 지침 준수**: 역할별 작업 수행 시 `.agents/skills/` 하위의 스킬 지침을 반드시 준수합니다:
   - 리뷰어: [.agents/skills/chronoledger-reviewer/SKILL.md](file:///c:/Projects/ChronoLedger/.agents/skills/chronoledger-reviewer/SKILL.md)
   - 메이커: [.agents/skills/chronoledger-maker/SKILL.md](file:///c:/Projects/ChronoLedger/.agents/skills/chronoledger-maker/SKILL.md)
   - 오케스트레이터: [.agents/skills/chronoledger-orchestrator/SKILL.md](file:///c:/Projects/ChronoLedger/.agents/skills/chronoledger-orchestrator/SKILL.md)
   - 인수인계 프로토콜: [.agents/skills/handoff/SKILL.md](file:///c:/Projects/ChronoLedger/.agents/skills/handoff/SKILL.md)
5. **비상 인계 체크포인트**: 작업 도중 토큰/컨텍스트 부족 감지 시 `docs/handoff.md`의 과제 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고, `### 📌 중단 체크포인트 (Handover Checkpoint)`에 완료/남은 작업/검증 상태를 기록한 뒤 대체 모델 전환을 사용자에게 안내합니다.
6. **완료 및 문서 최신화**: 작업 완료 시 Dispatch Queue 상태를 `✅ DONE (SHA: <커밋해시>)`으로 갱신하고 다음 순서 행을 `▶ READY`로 전환하며, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md`를 최신화합니다.

## 4. 프로젝트 주요 문서 및 코드 경로 안내

- **기획 및 스펙 권위 문서**:
  - `docs/spec/SRS.md` (소프트웨어 요구사항 명세서, 최우선 기능 권위)
  - `docs/spec/SPEC.md` (기능 및 UI 세부 명세 요약)
  - `docs/spec/revisions_and_decisions.md` (기획 의사결정 및 히스토리)
  - `docs/spec/ChronoLedger_UI_Design_Sheet.md` (UI 디자인 시트 및 레이아웃 가이드)
- **DB 스키마 및 마이그레이션**:
  - `sql/SCHEMA.sql` (공식 기준 DB 스키마 DDL)
  - `sql/*.sql` (기능별 마이그레이션 및 시드 스크립트)
- **운영 및 인수인계 문서**:
  - `docs/handoff.md` (활성 인수인계 큐 및 세션 인계 체크포인트)
  - `docs/to-do.md` (전체 로드맵 및 단계별 태스크 백로그)
  - `docs/progress.md` (작업 진행 상황 및 마일스톤 로그)
  - `docs/changelog.md` (변경 이력 로그)
  - `docs/architecture.md` (시스템 아키텍처 및 모듈 구조)
  - `docs/known-pitfalls.md` (기억해야 할 함정 및 트러블슈팅 가이드)
- **협업 산출물 및 검증 스크립트**:
  - `artifacts/schemas/review.schema.json` (코드 리뷰 아티팩트 JSON 스키마)
  - `artifacts/schemas/test.schema.json` (테스트 결과 아티팩트 JSON 스키마)
  - `scripts/collaboration/New-CollaborationRun.ps1` (격리 협업 Worktree 생성 스크립트)
  - `scripts/collaboration/validate_collaboration_artifact.py` (아티팩트 스키마 검증 스크립트)
