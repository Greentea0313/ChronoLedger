# ChronoLedger AI 협업 종합 가이드 (AI Collaboration Guide)

> **2026-11-25 기준 안내**: 에이전트가 따르는 규칙의 기준은 `.agents/rules/collaboration.md`(모델 역할·승격 조건·대체 체인·`/swarm` 사전 승인 규칙)와 `.agents/skills/*/SKILL.md`(역할별 절차)임. 이 문서는 사람이 읽는 개요이며, 내용이 다르면 규칙·Skill 쪽을 따름.

이 문서는 ChronoLedger 프로젝트의 6대 AI 모델(Gemini 4 Hydrogen [기본], Gemini 4 Neon [1차 승격], Gemini 4 Carbon [2차 최상위 승격 — 구 Gemini 4 Argon 승계], GPT Codex, Claude [Claude Pro: Sonnet / Opus], GitHub Copilot) 협업 파이프라인, 격리 Worktree 기반 개발 워크플로우, 그리고 비상 인계 규약의 단일 진실 공급원(SSOT) 가이드임.

---

## 1. 6대 AI 모델 역할 분배, 기본 추론 수준 및 Fallback 매트릭스

| 주력 모델 / 에이전트 (기본 추론 수준) | 기본 역할 (Role) | ChronoLedger 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Hydrogen (`Medium`)** *(Gemini 기본)* | `Default Maker (Feature·UI·Test·Fast Docs) & Default Orchestrator / Reviewer` | 단기 쿼터 주기 올라운더(**기본 `Medium`**, `Low`~`XHigh` 지원). 일반·표준 기능 및 UI 컴포넌트(`src/app/`, `src/components/`, `src/lib/`), 경량 Tailwind/마크업·`docs/` 동기화(구 `Gemini 3.8 Flash` 역할 통합), Vitest 단위/통합 테스트, 표준 Run 등록/배정/마감(`New-CollaborationRun.ps1`), 표준 정적 리뷰(`review.json`); Claude Sonnet·GitHub Copilot의 기본 1순위 대체 모델 | **Gemini 4 Neon (`High`)** / **Claude Sonnet (`Medium`)** | **GitHub Copilot** |
| **Gemini 4 Neon (`High`)** *(1차 승격)* | `Maker (Complex·Core) & Multi-Step Orchestrator` | 단기 쿼터 주기 심층 코딩·조율 모델(**기본 `High`**, 난해한 디버깅 시 `XHigh` + `Orchestrator (Neon)`). 다중 컴포넌트 복합 상태·생명주기 구현, 코어 수식/날짜/SQL/RPC 구현(GPT Codex 1순위 Gemini 대체), 반복 실패 디버깅 해결, 다단계 복합 Run 오케스트레이션 | **Claude Opus (`High`)** / **Gemini 4 Hydrogen (`Medium`)** | **GitHub Copilot** |
| **Gemini 4 Carbon (`High`)** *(2차 최상위 승격)* | `Chief Architect & Final Gatekeeper (src/** 직접 구현 금지)` | 최상위 수석 아키텍트(**기본 `High`** + `Orchestrator (Carbon)`, 구 `Argon` 승계). 오픈 아키텍처·공식 명세(`docs/spec/*.md`) 수립, 금전/원장/포인트/RLS/`SECURITY DEFINER` RPC 심층 감사, 고위험 Run 최종 통합 리뷰(`review.json`), 메타 오케스트레이션 및 규칙 설계 | **Claude Opus (`High`)** / **Gemini 4 Neon (`High`)** | **Gemini 4 Hydrogen (`Medium`)** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/KST 날짜 계산(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Gemini 4 Neon (`High`)** / **Claude Opus (`High`)** | **Gemini 4 Hydrogen (`Medium`)** / **GitHub Copilot** |
| **Claude (Claude Pro: `Sonnet (Medium)` / `Opus (High)`)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태·인터랙션 구현 및 리팩토링 (**`Sonnet (Medium)`** 기본 Maker/표준 리뷰; **`Opus (High)`** 심층 감사/통합 리뷰) | **Gemini 4 Hydrogen (`Medium`)** *(Sonnet)* / **Gemini 4 Neon·Carbon (`High`)** *(Opus)* | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | 일반 기능, 라우팅 및 UI 컴포넌트(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 4 Hydrogen (`Medium`)** | **GPT Codex** |

### 모델별 기본 추론 수준(Reasoning Level) 운용 기준

- **기본 주력 티어 (`Gemini 4 Hydrogen: Medium`, `Claude Sonnet: Medium`)**: 수용 기준과 대상 파일이 명확한 표준 기능·UI·테스트 구현, 일상 Run 등록/마감, 문서 동기화에서 **응답 속도·생각 토큰(Thinking tokens) 절약·정확도의 균형이 가장 좋은 `Medium`**을 기본으로 운용함.
- **심층 구현·수석 아키텍트·최종 감사 티어 (`Gemini 4 Neon: High`, `Gemini 4 Carbon: High`, `Claude Opus: High`)**: 복합 상태·코어 수식·SQL/RPC 구현(`Neon`), 신규 명세·보안/원장 설계 감사(`Carbon`), Run 단위 최종 통합 리뷰 및 병합 게이트(`Opus`)는 한 번의 판단에서 엣지 케이스와 보안 결함을 빠짐없이 검출해야 하므로 **`High`**를 기본으로 고정함.
- **Step별 예외 (사유 한 줄 필수)**: Orchestrator가 큐 행의 모델 옆에 다른 수준을 적을 수 있음(예: `Claude Opus (XHigh — 2회 반복 실패 동시성 디버깅)`).
  - **`Low`로 낮춤**: 아카이브 잘라 붙이기, `docs/`의 상태·SHA 갱신, 한 줄 오타 수정처럼 판단이 필요 없는 작업.
  - **`XHigh`로 올림**: 2회 이상 실패 후 디버깅, 비동기·동시성 또는 암호화·프로토콜 정확성, 근거가 엇갈리는 보안·원장 감사.
  - 금액·원장·포인트·RLS·SQL/RPC를 건드리는 Step은 기본 수준 아래로 낮추지 않음. 수준 조정은 승격을 대신하지 않으며, §1 승격 조건에 해당하면 모델을 바꿈.
  - 수준은 사용자가 각 도구에서 정함. 행에 다른 수준이 적힌 것을 본 에이전트는 추측하지 말고 답변 첫머리에서 알림.

### Gemini 4 다단계 운용 및 승격 기준 (`Hydrogen` 기본 $\to$ `Neon` / `Carbon` 조건부 승격)

최상위 모델인 **`Gemini 4 Carbon`**의 쿼터 조기 소진을 방지하기 위해, **`Gemini 4 Hydrogen`**을 Gemini 계열의 기본(Default) 모델로 두고, 작업 난이도와 특화 방향에 따라 **`Gemini 4 Neon`**(1차 승격) 또는 **`Gemini 4 Carbon`**(2차 최상위 승격)으로 승격함.

1. **`Gemini 4 Hydrogen` (기본 Maker · 기본 Orchestrator · 표준 Reviewer)**:
   - 명시적 수용 기준과 대상 파일이 지정된 표준 기능·UI·유틸(`src/app/`, `src/components/`, `src/lib/`), 경량 스타일/마크업·문서 동기화 구현 및 Vitest 테스트 작성.
   - 범위가 명확한 표준 Run의 워크트리 생성(`New-CollaborationRun.ps1`), Dispatch Queue 등록, 병합 및 `docs/` 마감.
   - 저~중위험 변경분의 정적 코드 리뷰(`review.json`) 및 `Claude Sonnet`·`GitHub Copilot`의 기본 1순위 대체.
2. **`Gemini 4 Neon` 1차 승격 조건 (심층 구현 · 코어 로직 · 복합 오케스트레이션 — 단기 쿼터 유지)**:
   - **`Neon (Maker)` 승격 조건** *(Maker 스텝으로 배정 시 `src/**`·`sql/**` 직접 구현 허용)*:
     - ① **다중 컴포넌트 복합 상태 및 브라우저 생명주기 구현**: 3개 이상 컴포넌트 상태 동기화, History API/`popstate`/중첩 모달·드로어, 오프라인 폴백 및 비동기 경쟁 상태 제어.
     - ② **코어 도메인 수식·날짜 동기화 및 SQL/RPC 구현 (`GPT Codex` 1순위 Gemini 대체)**: `payment-calculations.ts`, `budget-calculations.ts`, `subscription-sync.ts`, KST 날짜 경계 계산, Supabase 마이그레이션·트리거·`SECURITY DEFINER` RPC 작성.
     - ③ **반복 실패 디버깅 해결**: `Hydrogen` 또는 타 Maker에서 테스트/타입/런타임 오류가 2회 이상 반복된 구간의 정밀 수정.
   - **`Neon (Orchestrator)` 승격 조건** *(`Orchestrator` 역할/프로필로 호출 시 `src/**` 직접 수정 제한)*:
     - ④ **다단계 복합 Run 설계 및 서브 오케스트레이션**: DB(Step 1) $\to$ UI(Step 2) $\to$ 리뷰(Step 3) 등 다중 스텝 간 인터페이스·수용 기준 정교화, 라우팅 및 중간 산출물 검수.
3. **`Gemini 4 Carbon` 2차(최상위) 승격 조건 (수석 아키텍트 · 보안/원장 감사 · 최종 게이트키퍼 — `src/**` 직접 수정 금지)**:
   - 아래 4대 조건 중 하나 이상에 해당할 때만 `Carbon`으로 배정함(`Claude Opus` 승격 조건과 대칭):
     - ① **오픈 아키텍처·신규 스펙 수립 및 고위험 의사결정**: 기술/법적/UX 트레이드오프 분석, 공식 명세서(`docs/spec/*.md`) 제·개정, 3개 이상 도메인 모듈의 경계 재설계.
     - ② **금전·원장·포인트·보안/RLS/`SECURITY DEFINER` RPC 심층 감사**: 회계 원장 무결성, 권한 상승 방어, RLS 정책, 계정 탈퇴/푸시 등 핵심 보안 경계 변경의 사전 설계 검수 및 사후 감사.
     - ③ **고위험 Run 단위 최종 통합 정적 리뷰**: Base SHA $\leftrightarrow$ Target SHA 전체 diff 통합 정적 검증(`review.json`, `Claude Opus`와 상호 1순위 대체) 및 릴리스 게이트 판정.
     - ④ **메타 오케스트레이션 및 협업 파이프라인 설계**: 에이전트 규칙(`.agents/rules/`), 스킬(`.agents/skills/`), 전체 로드맵 재설계.
   - `Hydrogen` 작업 중 위 승격 조건이 발견되면 심층 구현/디버깅은 **`Neon`**으로, 아키텍처/보안/원장 설계 판단이나 통합 감사는 **`Carbon`**(또는 `Claude Opus`)으로 인계함.

### Claude Pro Sonnet / Opus 2단계 운용 기준 (토큰 최적화)

사용자의 Claude Pro 구독을 효율적으로 활용하기 위해 **`Claude Sonnet`**과 **`Claude Opus`**를 2단계로 나누어 운용함. 기본 작업은 Sonnet으로 수행하여 쿼터 소진을 최소화하고, 심층 판단이 필요한 고난도 작업에 한해 Opus로 승격함.

1. **Claude Sonnet (기본 Maker · 쿼터 절약)**:
   - 명시적 수용 기준과 대상 파일이 지정된 UI 인터랙션 및 상태 연결 (아코디언, 모달, 필터, 토글, 드로어 등).
   - 기존 패턴을 따르는 표준 페이지/컴포넌트 수정 및 확장.
   - Vitest 단위 테스트 작성 및 보강.
   - 저위험 일반 정적 코드 리뷰.
   - `docs/` 문서 동기화.
2. **Claude Opus (심층 전문가 · On Demand)**:
   - 고난도 복합 상태 및 브라우저 생명주기 제어 (History API, 비동기 레이스 컨디션, popstate/beforeunload 등).
   - 아키텍처 리팩토링 및 규칙/협업 체계 설계.
   - 고심도 보안/RLS/`SECURITY DEFINER` RPC/원장 무결성 감사.
   - Base $\leftrightarrow$ Target SHA 통합 정적 코드 리뷰 (`review.json` 생성 및 검증).
   - `Gemini 4 Carbon`, `Gemini 4 Neon` 및 `GPT Codex`의 1순위 대체(Fallback 1) 수행.
3. **Opus 승격 4대 조건 (Assign Opus)**:
   - 작업 착수 시 또는 Sonnet 작업 진행 중 아래 4대 조건 중 하나라도 충족될 경우 즉시 Opus로 배정(또는 `⚠️ HANDOVER_NEEDED`로 Opus에 인계)함.
     - ① **금전, 원장, 포인트, RLS, SQL/RPC 수정**: 회계 무결성과 보안에 직결된 변경.
     - ② **브라우저 생명주기 및 비동기 동시성 예외 케이스**: 페이지 전환, 뒤로가기, 타이머, 경쟁 상태 등 미세 타이밍 제어.
     - ③ **3개 이상 모듈에 걸친 구조 변경 또는 오픈 아키텍처 설계 판단**: 모듈 간 경계 재정의, 전역 상태 아키텍처 변경 등.
     - ④ **Run 단위 통합 리뷰**: 전체 워크트리 변경분에 대한 종합 정적 검증(`review.json`).

---

## 2. 역할별 `src/**` 직접 구현 경계, `/swarm` 승인 규칙 및 하이브리드 위임 프로토콜

1. **Gemini 모델 역할별 제품 소스(`src/**`) 직접 구현 경계**:
   - **`Gemini 4 Carbon` (`Architect · Orchestrator · Reviewer`)**: 어떠한 경우에도 제품 소스 코드(`src/**`)를 직접 수정하지 않음. 아키텍처/명세 설계, 보안·원장 감사, 통합 리뷰 및 메타 오케스트레이션에만 집중함.
   - **`Gemini 4 Neon` (`Maker` vs `Orchestrator`)**: **`Orchestrator` 역할/프로필로 호출될 때는 `src/**` 직접 수정을 제한**하고 수용 기준 수립, 워크트리/큐 관리, 스텝 검수, 경량 서브에이전트 위임만 수행함. **Dispatch Queue의 `Maker` 스텝으로 명시 배정될 때만 `src/**`·`sql/**` 직접 구현을 허용**함.
   - **`Gemini 4 Hydrogen` (`Default Maker & Default Orchestrator`)**: 기본 `Maker`로서 `src/**`·`sql/**`·테스트·경량 UI/문서 직접 구현을 수행하며, 표준 Run 오케스트레이션/마감도 겸임함(순수 오케스트레이션/리뷰 스텝 중에는 요청되지 않은 `src/**` 직접 수정 지양).
2. **하이브리드 위임 및 `/swarm` 병렬 실행 정책 (Hybrid Delegation & `/swarm` Policy)**:
   - **내부 경량 서브에이전트 즉시 위임 (`invoke_subagent` $\to$ `Model: "flash_lite"` 또는 `"inherit"`)**:
     - **대상**: 다중 파일 읽기 전용 탐색, 경량 Tailwind·마크업 초안, `docs/` 및 아카이브 이관 작업 등.
     - **방식**: Gemini 에이전트(`Hydrogen`, `Neon`, `Carbon`) 세션 내에서 `invoke_subagent`(`Model: "flash_lite"` 또는 `"inherit"`)를 통해 비동기 호출 및 위임함.
     - **위임 금지**: SQL/RPC/RLS, 금액·날짜·포인트 로직, 커밋, 큐 상태 변경, 리뷰 판정·`test.json` 결과 기록. 위임한 수정은 위임한 에이전트가 diff로 직접 확인하고 책임짐.
   - **`/swarm` 병렬 에이전트 모드 (사용자 사전 승낙 필수)**:
     - 기본 협업은 `docs/handoff.md` Dispatch Queue + 격리 워크트리(`.worktrees/<run_id>`)로 수행하며, 에이전트가 `/swarm`을 임의로 자율 시작하는 것을 금지함.
     - 다수의 독립 파일/모듈 병렬 처리로 `/swarm`이 유의미하게 유리하다고 판단될 때는 **먼저 사용자에게 예상 워커 수·역할·쿼터 소모 영향을 설명해 제안(요청)하고, 사용자가 승낙(또는 `/swarm`을 직접 지시)한 경우에만 실행**함.
   - **외부 모델 턴 인계 (`docs/handoff.md` Dispatch Queue)**:
     - **대상**: 기능/UI/테스트 구현(**Gemini 4 Hydrogen / Neon**, **Claude Sonnet**, **GitHub Copilot**), 원장/결제/구독 계산 수식·SQL/RPC 및 Vitest 단위 테스트(**GPT Codex** / **Gemini 4 Neon**), 심층 정적 리뷰(`review.json`)·보안/RLS 검증 및 복합 리팩토링(**Claude Opus** / **Gemini 4 Carbon**).
     - **방식**: `docs/handoff.md` 최상단 `## 🎯 Active AI Collaboration Dispatch Queue`에 과제를 등록(`▶ READY`)하고 턴을 종료한 뒤, 사용자에게 모델 전환 후 **`"인수인계 문서를 확인해"`**를 입력하도록 명확히 안내함.

---

## 3. "인수인계 문서를 확인해" 공식 5단계 프로토콜

사용자가 모델 전환 후 **`"인수인계 문서를 확인해"`**(또는 인수인계 문서 확인 요청)를 입력하면, 해당 모델은 추가 질의 없이 즉시 다음 5단계를 실행합니다.

1. **1단계: Scan Dispatch Queue (협업 큐 스캔)**:
   - 루트 `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue`를 읽고 현재 활성 Run 정보를 파악합니다.
2. **2단계: Identify Target Task & Auto-Recover Hard Cutoffs (과제 식별 및 강제 중단 복구)**:
   - **`⚠️ HANDOVER_NEEDED` (1순위)**: 이전 모델이 토큰/컨텍스트 한도로 작업을 인계한 경우 최우선 착수. 하단 `### 📌 중단 체크포인트 (Handover Checkpoint)`를 확인하여 이미 완료된 작업을 건너뛰고 남은 작업을 즉시 재개.
   - **`▶ READY` (2순위)**: 대기 중인 본인 담당 과제를 선택하여 착수.
   - **강제 중단 자동 복구 (Hard Cutoff Auto-Recovery)**: 이전 모델이 쿼터/컨텍스트 소진으로 인해 상태를 미처 `⚠️ HANDOVER_NEEDED`로 갱신하지 못하고 비정상 종료(`▶ READY` 또는 `🔄 IN_PROGRESS` 상태로 방치)된 경우, 새로 투입된 대체 모델은 대상 워크스페이스(`.worktrees/<run_id>` 또는 `main`)에서 즉시 `git status --short` 및 `git diff`를 실행하여 미커밋 변경사항을 보존·분석한 후 잔여 수용 기준을 이어서 완수.
3. **3단계: Respect Workspace & Scope (작업 공간 및 허용 범위 준수)**:
   - 할당된 워크스페이스 경로(`.worktrees/<run_id>` 또는 `main`), 허용 파일 범위(Allowed Files), 수용 기준(Acceptance Criteria)을 엄격히 준수.
   - 격리 Worktree 과제인 경우 소스 수정, 단위 테스트, 커밋은 전용 디렉토리(`.worktrees/<run_id>`) 내에서 수행하고, 협업 큐 업데이트는 루트 `docs/handoff.md`에 기록.
4. **4단계: Baton Touch (상태 전이 및 배턴 터치)**:
   - **정상 완수 시**: 자신의 행 상태를 `✅ DONE (SHA: <commit_sha>)`으로 갱신하고, 다음 단계 과제를 `⏳ WAITING`에서 `▶ READY`로 전환.
   - **토큰 소진 시 비상 인계**: 남은 토큰이나 컨텍스트가 부족할 경우 축약하거나 건너뛰지 말고, 현재까지의 파일 수정을 안전하게 저장한 뒤:
     - 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고, `담당 모델`을 `~~현재 모델~~ ➡️ [대체 모델명]`으로 갱신.
     - `### 📌 중단 체크포인트 (Handover Checkpoint)`에 4대 필수 항목(**① 완료된 파일/작업, ② 남은 구체적 작업, ③ 설계/가정 결정 사항, ④ 테스트 실행 결과**)을 명확히 기록.
   - 해결 불가능한 치명적 차단 요소 발생 시 상태를 `🛑 BLOCKED`로 표기하고 사용자에게 보고.
5. **5단계: Report Results & Documentation Sync (결과 보고 및 문서 동기화)**:
   - 완료된 작업 내역, 검증 증거(테스트 통과, 린트 결과 등)를 보고하고, 다음에 호출할 AI 모델(및 Fallback 체인)을 명확히 안내 (`"[다음 모델명]으로 전환하여 '인수인계 문서를 확인해'라고 입력해 주세요"`).
   - 의미 있는 개발 작업 후 `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md` 최신 상태 동기화 (구조 변경 시 `docs/architecture.md` 포함).

---

## 4. 격리 Worktree 기반 협업 워크플로우 & 검증 도구

ChronoLedger는 대규모 기능 개발이나 코어 로직 리팩토링 시 `main` 브랜치의 오염을 방지하기 위해 Git Worktree 기반의 격리 실행 환경과 정적 아티팩트 검증 체계를 운영합니다.

### 협업 생명주기 4단계

1. **작업 정의 및 격리 환경 생성 (Orchestrator: Gemini 4 Hydrogen [기본] / Neon [복합 Run 승격] / Carbon [아키텍처·고위험 승격])**:
   - 요구사항 분석 및 구체적 수용 기준(Acceptance Criteria) 정의.
   - `scripts/collaboration/New-CollaborationRun.ps1`을 실행하여 Base SHA를 고정하고 격리된 Git Worktree(`.worktrees/<run_id>`) 및 `artifacts/<run_id>/run.json` 생성:

     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/collaboration/New-CollaborationRun.ps1 -RunId "<run_id>" -Branch "<branch_name>"
     ```

   - `docs/handoff.md`의 `## 🎯 Active AI Collaboration Dispatch Queue`에 단계별 과제를 등록하고 1단계를 `▶ READY`로 활성화.
2. **격리 구현 (Maker: Gemini 4 Hydrogen / Neon / GPT Codex / Claude Sonnet / GitHub Copilot)**:
   - 지정된 전용 Worktree(`.worktrees/<run_id>`) 내부에서 허용 파일 범위에 맞추어 구현 진행.
   - 단위 테스트(`npx vitest run`) 및 타입 검사(`npx tsc --noEmit`) 수행.
   - 구현 완료 후 Git 커밋을 생성하여 **Target SHA**를 고정.
   - 루트 `docs/handoff.md`의 본인 과제 상태를 `✅ DONE (SHA: <commit_sha>)`으로 변경하고 다음 단계를 `▶ READY`로 전환.
3. **검증 및 정적 코드 리뷰 (Reviewer: Claude Opus / Gemini 4 Carbon [통합 리뷰] 또는 Claude Sonnet / Gemini 4 Hydrogen [표준 리뷰])**:
   - Base SHA $\leftrightarrow$ Target SHA 간 정적 diff를 바탕으로 `artifacts/<run_id>/review.json` 생성.
   - 단위 테스트 실행 결과가 포함된 경우 `artifacts/<run_id>/test.json` 생성.
   - 협업 아티팩트 스키마 검증 스크립트를 실행하여 스키마 준수 확인:

     ```bash
     python scripts/collaboration/validate_collaboration_artifact.py artifacts/<run_id>/review.json
     ```

4. **통합 및 인수인계 마감 (Orchestrator: Gemini 4 Hydrogen / Neon / Carbon 또는 Claude Opus)**:
   - 수용 기준과 `review.json` 심층 리뷰 결과를 대조 검증.
   - 전체 통합 테스트 및 빌드(`npm run build`) 확인 후 `main` 브랜치에 병합.
   - `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md`, `docs/handoff.md` 최신 상태 동기화 및 임시 Worktree 정리.

---

## 5. 프로젝트 문서 체계 (Single Source of Truth)

모든 프로젝트 문서는 `docs/` 하위 체계로 일원화되어 관리되며, 기획·설계·데이터베이스·협업 산출물에 대한 단일 진실 공급원(SSOT) 역할을 합니다.

```text
c:\Projects\ChronoLedger\
├── docs/
│   ├── to-do.md                          # [SSOT] 전체 개발 로드맵 및 단계별 세부 백로그
│   ├── progress.md                       # [SSOT] 마일스톤별 누적 진척도 및 개발 현황
│   ├── changelog.md                      # [SSOT] 버전/단계별 상세 변경 이력
│   ├── handoff.md                        # [SSOT] 활성 Dispatch Queue 및 세션 인수인계 체크포인트
│   ├── architecture.md                   # 시스템 아키텍처 및 기술 스택 사양
│   ├── detailed-design.md                # 상세 기능 설계서
│   ├── known-pitfalls.md                 # 반복 결함 패턴, 알려진 함정 및 트러블슈팅
│   ├── collaboration-guide.md            # (본 문서) AI 협업 종합 가이드
│   ├── spec/                             # 기획 및 명세 원본 권위 문서
│   │   ├── SRS.md                        # [SSOT] 소프트웨어 요구사항 명세서 (최상위 기능 권위)
│   │   ├── SPEC.md                       # [SSOT] 기능 및 UI 명세 요약
│   │   ├── revisions_and_decisions.md    # [SSOT] 제품 기획·의사결정 및 변경 이력
│   │   └── ChronoLedger_UI_Design_Sheet.md # [SSOT] UI 디자인 시트 및 레이아웃 가이드
│   ├── design-previews/                  # UI/아이콘 프로토타입 HTML 프리뷰
│   └── archive/                          # 과거 검토 기록 및 구버전 계획서 보존소
├── sql/                                  # 데이터베이스 스키마 및 마이그레이션 관리
│   ├── SCHEMA.sql                        # [SSOT] 공식 기준 DB 스키마 DDL (Supabase 적용 기준)
│   ├── README.md                         # SQL 파일 분류 및 마이그레이션 적용 가이드
│   ├── migrations/                       # 순차 적용된 DDL/DML 마이그레이션 SQL
│   ├── seeds/                            # 개발/테스트용 시드 데이터 SQL
│   ├── tests/                            # 무결성 검증 및 로컬 스모크 테스트 SQL (TESTS.sql 등)
│   └── archive/                          # 과거 릴리스/구버전 SQL 아카이브
├── artifacts/                            # Run별 협업 산출물 및 스키마 정의
│   ├── schemas/                          # 산출물 JSON Schema 정의
│   │   ├── review.schema.json            # 코드 리뷰 JSON 스키마
│   │   ├── run.schema.json               # Run 메타데이터 JSON 스키마
│   │   └── test.schema.json              # 테스트 결과 JSON 스키마
│   └── <run_id>/                         # Run별 메타데이터 (run.json, review.json, test.json)
└── scripts/collaboration/                # AI 협업 자동화 도구
    ├── New-CollaborationRun.ps1          # 격리 Git Worktree 및 run 메타데이터 생성 스크립트
    └── validate_collaboration_artifact.py # 협업 산출물 스키마 유효성 검증 스크립트
```

### 핵심 명세 및 산출물 권위 계층

1. **요구사항 및 비즈니스 로직**: `docs/spec/SRS.md` $\to$ `docs/spec/SPEC.md` $\to$ `docs/spec/revisions_and_decisions.md`
2. **UI 레이아웃 및 디자인**: `docs/spec/ChronoLedger_UI_Design_Sheet.md` $\to$ `docs/design-previews/`
3. **데이터베이스 구조 및 RPC**: `sql/SCHEMA.sql` $\to$ `sql/migrations/`
4. **진척도 및 세션 인계**: `docs/handoff.md` $\to$ `docs/to-do.md` $\to$ `docs/progress.md`
5. **정적 코드 리뷰 증거**: `artifacts/<run_id>/review.json` (검증: `validate_collaboration_artifact.py`)
