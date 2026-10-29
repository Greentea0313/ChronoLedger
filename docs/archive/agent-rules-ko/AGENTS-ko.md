# ChronoLedger Multi-Agent Instructions (한국어 원본 아카이브)

> **보관 안내**: 본 문서는 Phase 12.22 지침 영문화 이전의 한국어 원본입니다. 최신 활성 지침은 프로젝트 루트의 `AGENTS.md`를 참조하세요.

이 문서는 GPT Codex, OpenCode 등 범용 코딩 에이전트가 ChronoLedger 프로젝트 작업 공간에 진입할 때 공통으로 로드하고 준수해야 하는 지침입니다.

## 1. Core Rule & Skill References

모든 에이전트는 작업을 시작하기 전 아래 규칙 파일과 스킬 가이드를 필히 참조해야 합니다:

- `.agents/rules/language.md` — 항상 한국어로 소통하며 질의/안내를 작성합니다.
- `.agents/rules/collaboration.md` — 5대 AI 모델 역할 분배, 하이브리드 위임 및 비상 인계 원칙을 규정합니다.
- `.agents/rules/handoff.md` — `"인수인계 문서를 확인해"` 디스패치 프로토콜 및 문서 갱신 수칙을 정의합니다.
- `.agents/rules/agent_rules.md` — 생각 우선, 단순성 추구, 최소 침습 편집(Surgical Changes) 등 코딩 행동 수칙입니다.
- `.agents/rules/document_location.md` — 문서는 외부 임시 디렉터리가 아닌 프로젝트 내부(`docs/`)에 기록합니다.
- `.agents/skills/chronoledger-orchestrator/SKILL.md` — 조율자 워크플로우 및 Worktree 오케스트레이션 지침.
- `.agents/skills/chronoledger-maker/SKILL.md` — 구현자 작업 지침 및 Worktree 격리 구현 수칙.
- `.agents/skills/chronoledger-reviewer/SKILL.md` — 읽기 전용 정적 코드 리뷰 및 `review.json` 생성 지침.
- `.agents/skills/handoff/SKILL.md` — 멀티 에이전트 인수인계 및 디스패치 큐 스킬 가이드.

## 2. 5대 AI 모델 역할 분배 및 Fallback 매트릭스

| 주력 모델 / 에이전트 | 파이프라인 기본 역할 | ChronoLedger 핵심 담당 영역 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성, Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/날짜 계산(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태·인터랙션 구현 및 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | 표준 기능/라우팅/컴포넌트 구현(`src/app/`, `src/components/`), 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 | **GitHub Copilot** | **Gemini 4 Argon** |

> **Claude Pro Sonnet / Opus 2단계 운용 기준 (토큰 최소화)**:
>
> - 사용자의 Claude Pro 구독 중 **`Claude Sonnet`**과 **`Claude Opus`** 2종을 운용합니다. 기본은 Sonnet이며, 아래 Opus 승격 조건에 해당할 때만 Opus를 사용해 쿼터를 절약합니다.
> - **Claude Sonnet (기본 Maker · 쿼터 절약)**: 수용 기준과 대상 파일이 명시된 UI 인터랙션·상태 연동 구현(아코디언, 모달, 필터, 토글 등), 기존 패턴을 따르는 페이지/컴포넌트 수정, Vitest 단위 테스트 작성·보강, 저위험 변경의 일반 정적 리뷰, `docs/` 동기화.
> - **Claude Opus (심층 전담 · 필요 시에만)**: 고난도 복합 상태·브라우저 생명주기 제어(History API, 비동기 레이스 컨디션 등), 아키텍처 리팩토링 및 규칙/협업 설계, 보안/RLS/`SECURITY DEFINER` RPC/원장 무결성 심층 검증, Base $\leftrightarrow$ Target SHA 통합 정적 코드 리뷰(`review.json`), `Gemini 4 Argon` / `GPT Codex` 1순위 대체(Fallback 1).
> - **Opus 승격 조건** (하나라도 해당하면 Opus 배정): ① 금전·원장·포인트·RLS·SQL/RPC 변경, ② 브라우저 생명주기·비동기 동시성 엣지 케이스, ③ 3개 이상 모듈의 구조 변경 또는 명세 미확정으로 설계 판단 필요, ④ Run 단위 통합 리뷰. Sonnet 작업 중 조건이 드러나면 `⚠️ HANDOVER_NEEDED`로 Opus에 인계합니다.

## 3. "인수인계 문서를 확인해" 5단계 실행 프로토콜

사용자가 `"인수인계 문서를 확인해"` (또는 인수인계 확인 요청)를 입력하면 에이전트는 되묻지 않고 즉시 다음 5단계를 수행합니다:

1. **Dispatch Queue 스캔**: 루트 `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue`를 읽습니다.
2. **수행 대상 과제 식별 및 강제 중단 복구**:
   - `⚠️ HANDOVER_NEEDED`(1순위) 과제가 있으면 최우선으로 선택하여 `### 📌 중단 체크포인트 (Handover Checkpoint)`의 완료 내역을 제외한 남은 작업을 이어받습니다.
   - 대기 중인 `▶ READY`(2순위) 과제를 선택합니다.
   - 이전 모델이 API 한도로 상태를 갱신하지 못하고 강제 종료된 경우, 대상 작업 공간의 `git status --short` 및 `git diff`를 스캔하여 미커밋 변경사항을 보존·파악한 후 이어받습니다.
3. **작업 공간 및 범위 준수**:
   - 지정된 작업 공간(루트 또는 `.worktrees/<run_id>`)과 허용 파일 범위 내에서 수용 기준(Acceptance Criteria)을 충족하도록 작업합니다.
4. **배턴 터치 (State Transition)**:
   - 과제 완료 후 자신의 행을 `✅ DONE (SHA: <커밋해시>)`으로 갱신하고, 다음 순서 행을 `▶ READY`로 전환합니다.
   - 토큰/컨텍스트 부족 시 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고 체크포인트를 기록한 뒤 대체 모델 전환을 안내합니다.
5. **결과 보고 및 문서 최신화**:
   - `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md`를 최신화하고 사용자에게 다음 호출할 모델을 안내합니다.

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
