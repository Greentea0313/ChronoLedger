---
trigger: always_on
description: Enforces ChronoLedger 5-model AI collaboration roles, fallback chains, Active Dispatch Queue execution on "인수인계 문서를 확인해", and token-exhaustion emergency handover across all sessions.
---

# ChronoLedger 5대 AI 모델 역할 분배 및 비상 인계 규칙 (Collaboration & Handover Rule)

## 1. 5대 AI 모델 기본 역할 및 토큰 소진 시 대체(Fallback) 체인

| 주력 모델 / 에이전트 | 기본 역할 (Role) | ChronoLedger 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성(`New-CollaborationRun.ps1`), Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus 5.5** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/KST 날짜(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus 5.5** | **GitHub Copilot** |
| **Claude Opus 5.5** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | VS Code 밀착형 일반 기능·컴포넌트·라우팅(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 보조 | **GitHub Copilot** | **Gemini 4 Argon** |

## 2. `"인수인계 문서를 확인해"` 자동 실행 및 비상 인계 프로토콜

1. **자동 과제 실행**: 사용자가 **`"인수인계 문서를 확인해"`**라고 입력하면, 즉시 `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue`를 읽고 **`⚠️ HANDOVER_NEEDED`**(1순위) 또는 **`▶ READY`**(2순위) 상태인 과제를 찾아 별도 되묻기 없이 수행합니다.
2. **강제 중단 자동 복구**: 이전 모델이 토큰/쿼터 초과로 상태를 갱신하지 못한 채 중단된 경우(`▶ READY` 또는 `🔄 IN_PROGRESS`), 대상 Worktree(또는 `main`)에서 `git status --short`와 `git diff`를 스캔하여 미커밋 변경사항을 파악한 뒤 이어서 완수합니다.
3. **토큰/컨텍스트 부족 시 비상 인계 (`⚠️ HANDOVER_NEEDED`)**:
   - 작업 도중 남은 토큰/컨텍스트로 완수가 어렵다고 판단되면, 현재까지의 수정을 안전하게 저장한 뒤 `docs/handoff.md`의 Dispatch Table 상태를 **`⚠️ HANDOVER_NEEDED`**로 변경하고 `담당 모델`을 **`~~기존 모델~~ ➡️ [대체 모델명]`**으로 갱신합니다.
   - `### 📌 중단 체크포인트 (Handover Checkpoint)`에 **① 완료된 파일/작업, ② 남은 구체적 작업, ③ 가정/결정 사항, ④ 테스트 실행 여부**를 기록하고, 사용자에게 대체 모델로 전환해 `"인수인계 문서를 확인해"`를 입력하도록 안내합니다.
4. **작업 완료 후 문서 동기화**: 유의미한 개발 작업이 끝나면 `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md`(및 구조 변경 시 `docs/architecture.md`)를 최신 상태로 갱신합니다.
