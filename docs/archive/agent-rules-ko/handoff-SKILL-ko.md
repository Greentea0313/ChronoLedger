---
name: handoff
description: Keep project handoff documentation up to date after development work and execute assigned tasks from the Active AI Collaboration Dispatch Queue when asked to check the handoff document ("인수인계 문서를 확인해"). Use in coding agents such as Antigravity, Gemini, Codex, Claude, GitHub Copilot, OpenCode, or similar tools.
license: MIT
---

# Handoff Documentation & Multi-Agent Dispatch Protocol (한국어 원본 아카이브)

> **보관 안내**: 본 문서는 Phase 12.22 지침 영문화 이전의 한국어 원본입니다. 최신 활성 지침은 `.agents/skills/handoff/SKILL.md`를 참조하세요.

After each meaningful development session, update the relevant documentation in `docs/`. In addition, `docs/handoff.md` serves as the active blackboard (Dispatch Queue) for multi-model collaboration.

## 0. 신규 요구사항 입력 시 주축 모델(Gemini 4 Argon) 기본 동작 (Orchestrator Intake — Hybrid Delegation)

사용자가 주축 모델(**Gemini 4 Argon**)에게 프로젝트 관련 새로운 기능/수정 요구사항을 입력하면(단, 사용자가 *"직접 바로 구현해"*라고 명시한 경우 제외), Argon은 **절대 직접 제품 소스 코드(`src/**`)를 수정하지 않고** **Chief Orchestrator**로서 다음 **하이브리드 위임(Hybrid Delegation)** 절차를 수행합니다:

1. 요구사항과 관련 코드를 분석하여 명확한 **수용 기준(Acceptance Criteria)**과 **도메인별 하위 과제**를 설계합니다.
2. **Gemini 3.8 Flash 담당 도메인 (UI/Tailwind 스타일링, 배지·모달·드로어 마크업, 고속 탐색, `docs/` 문서 동기화)**:
   - Antigravity 내부에서 `define_subagent`(쓰기 필요 시 `enable_write_tools: true`) 및 `invoke_subagent`(`Model: "flash"` — 사용자 명시 지정 티어)를 사용해 **Gemini 3.8 Flash 서브에이전트**를 즉시 호출하여 위임합니다.
3. **외부 모델 담당 도메인 (`GPT Codex` 코어 로직/단위 테스트, `Claude Sonnet / Opus` 정적 코드 리뷰/보안·RLS 검증/복합 리팩토링 — `.agents/rules/collaboration.md`의 2단계 운용 기준으로 배정, `GitHub Copilot` 일반 기능)**:
   - (격리 실행이 필요한 경우 먼저 `New-CollaborationRun.ps1`로 `.worktrees/<run_id>`를 생성한 뒤) 루트 `docs/handoff.md` 최상단의 **`## 🎯 Active AI Collaboration Dispatch Queue`**를 갱신하여 각 단계의 **담당 모델(및 토큰 소진 대비 대체 모델)**을 배정하고, 1번 과제의 상태를 **`▶ READY`**로 설정합니다.
   - 사용자에게 갱신된 할당표를 요약해 보여주고, **전환하여 `"인수인계 문서를 확인해"`라고 입력할 대상 AI 모델**을 안내한 뒤 턴을 종료합니다.

## 1. "인수인계 문서를 확인해" (Handoff Dispatch Trigger Protocol)

사용자가 **`"인수인계 문서를 확인해"`** (또는 이에 준하는 인수인계 확인 요청)를 입력하면, 에이전트는 질문만 던지거나 단순 요약에 그치지 않고 즉시 다음 **5단계 실행 프로토콜**을 수행합니다:

1. **Dispatch Queue 스캔**: 루트 경로의 `docs/handoff.md` 최상단에 위치한 `## 🎯 Active AI Collaboration Dispatch Queue` 섹션을 읽습니다.
2. **수행 대상 과제 식별 (우선순위 순)**:
   - **1순위 (`⚠️ HANDOVER_NEEDED`)**: 이전 모델이 토큰/컨텍스트 부족으로 중단하고 인계한 과제가 있으면 최우선으로 선택합니다. 하단의 `### 📌 중단 체크포인트 (Handover Checkpoint)`를 읽고 이미 완료된 작업은 건너뛰며 남은 작업부터 이어받습니다.
   - **2순위 (`▶ READY`)**: 현재 실행 대기 중인 활성 과제를 선택합니다.
   - **강제 중단 자동 복구 (Hard Cutoff Auto-Recovery)**: 만약 이전 모델이 API 쿼터/토큰 한도로 인해 문서 상태를 `⚠️ HANDOVER_NEEDED`로 갱신하지도 못한 채 강제 종료되어 상태가 여전히 `▶ READY`이거나 `🔄 IN_PROGRESS`인 경우, 새로 호출된 대체(Fallback) 모델은 즉시 대상 작업 공간(루트 또는 `.worktrees/<run_id>`)의 `git status --short`와 `git diff`를 먼저 스캔합니다. 이전 모델이 작성하다 멈춘 미커밋 코드가 있다면 이를 보존·파악한 뒤 남은 수용 기준을 이어받아 완수합니다.
3. **작업 공간(Worktree) 및 범위 준수**:
   - Dispatch Queue에 지정된 `Worktree 경로`(예: `.worktrees/<run_id>` 또는 `main`)와 `허용 파일 범위`, `수용 기준(Acceptance Criteria)`을 엄격히 준수하여 역할(Maker / Reviewer / Orchestrator)을 수행합니다.
   - `New-CollaborationRun.ps1`로 생성된 격리 Worktree 과제인 경우, 실제 코드 수정·테스트·커밋은 반드시 `.worktrees/<run_id>` 내부에서 수행하고, Dispatch Queue 상태 갱신은 루트의 `docs/handoff.md`에 기록합니다.
4. **배턴 터치 (State Transition)**:
   - 과제 완수(및 Maker의 경우 커밋 생성) 후, 루트 `docs/handoff.md`의 Dispatch Queue에서 자신의 행 상태를 `✅ DONE (SHA: <커밋해시 또는 결과>)`으로 변경하고, 다음 순서 행의 상태를 `⏳ WAITING`에서 `▶ READY`로 전환합니다.
   - 만약 해결 불가능한 블로커가 발생하면 상태를 `🛑 BLOCKED`로 기록하고 사용자에게 보고합니다.
5. **결과 보고**: 수행한 작업, 검증 결과, 그리고 **다음 순서로 호출해야 할 담당 AI 모델명(및 대체 모델)**을 사용자에게 명확히 안내합니다.

## 2. 5대 AI 모델 역할 배분 및 Fallback(대체) 매트릭스

Orchestrator(주축 모델)가 과제를 분해하여 Dispatch Queue에 할당할 때 아래의 역할 분배와 토큰 소진 대비 Fallback 체인을 기본 기준으로 삼습니다. 항상 `담당 모델` 칸에 **`주력 모델 (대체: 1순위 / 2순위)`**를 함께 명시합니다.

| 주력 모델 / 에이전트 | 파이프라인 기본 역할 | ChronoLedger 핵심 담당 영역 | 토큰 소진 시 **1순위 대체** | **2순위 대체** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분석, 수용 기준 수립, Worktree/Dispatch Queue 할당, 아키텍처 결정, 최종 검수 및 문서 마감 | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/날짜 계산(`subscription-sync.ts`), Supabase RPC/SQL, Vitest 단위 테스트 작성·실행 | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태·인터랙션 구현 및 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | VS Code 밀착형 표준 기능/라우팅/컴포넌트 구현(`src/app/`, `src/components/`), 타 모델 토큰 소진 시 전천후 백업 수행 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 UI 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 보조 | **GitHub Copilot** | **Gemini 4 Argon** |

> Claude 과제는 `.agents/rules/collaboration.md`의 **Sonnet / Opus 2단계 운용 기준**에 따라 기본 Sonnet, Opus 승격 조건 해당 시 Opus로 `담당 모델` 칸에 구체 모델명을 명시합니다.

## 3. 토큰/컨텍스트 소진 시 비상 인계 (Limited Context or Token Budget)

- Keep track of whether the remaining context or token budget is likely to be insufficient to finish the requested work reliably. Do not claim an exact remaining amount unless the environment provides it.
- If completion is at risk, tell the user promptly before running out of context. Save current file edits safely, then update the task row in `docs/handoff.md` Dispatch Queue:
  1. 상태를 **`⚠️ HANDOVER_NEEDED`**로 변경합니다.
  2. `담당 모델` 칸을 `~~기존 모델~~ ➡️ 대체 모델명`으로 업데이트합니다.
  3. 큐 하단의 `### 📌 중단 체크포인트 (Handover Checkpoint)` 및 `docs/progress.md`에 **① 완료된 작업(수정된 파일/함수), ② 남은 작업(대체 모델이 바로 이어서 해야 할 구체적 단계), ③ 결정/가정 사항, ④ 테스트 실행 여부**를 기록합니다.
- Save current project-file edits and preserve unfinished work. Do not leave the user with only a chat summary when a durable project checkpoint can be written.
- 마지막 응답에서 사용자에게 *"토큰/컨텍스트 한도로 체크포인트를 남겼습니다. **[대체 모델명]**으로 전환하여 `'인수인계 문서를 확인해'`라고 입력해 주세요."*라고 안내합니다.

## 4. Required Updates (세션 및 파이프라인 마감 시 필수 갱신)

- Update `docs/progress.md` after every meaningful session with the current project state, work completed, active or blocked work, and the next concrete steps. Keep it concise and current so another session can resume without reconstructing the conversation.
- Update `docs/architecture.md` when files, folders, modules, responsibilities, or project structure change.
- Update `docs/handoff.md` with what was done, why it was done, current state, and recommended next steps (and update the top Dispatch Queue state).
- Update `docs/changelog.md` when behavior, features, fixes, refactors, or documentation meaningfully changed.
- Update `docs/to-do.md` by marking completed work and adding remaining tasks as clear, actionable items.
- Update `docs/known-pitfalls.md` when a repeated failure pattern, fragile behavior, blocker, or useful workaround is discovered.

## 5. Rules

- Keep entries concise, factual, and useful for the next AI agent or developer.
- Preserve the existing format of each documentation file.
- Do not rewrite entire documents unless the current content is outdated or misleading.
- Do not claim work is complete unless it was actually completed.
- If something is uncertain, mark it as needing verification.
- Avoid duplicate information across files unless each file needs different context.

## 6. Completion Summary

Before finishing, report:

- The current project state, Dispatch Queue status, and the checkpoint location (if a handover checkpoint was needed).
- Which next AI model should be invoked with `"인수인계 문서를 확인해"` (if steps remain in the queue).
- Which documentation files were updated.
- What major changes were recorded.
- What remaining tasks were added.
- What pitfalls or blockers were documented.
- Which expected files were not updated, and why.
