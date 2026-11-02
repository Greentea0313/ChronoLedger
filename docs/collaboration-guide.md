# ChronoLedger AI 협업 종합 가이드 (AI Collaboration Guide)

이 문서는 ChronoLedger 프로젝트의 5대 AI 모델(Gemini 4 Argon, GPT Codex, Claude [Claude Pro: Sonnet / Opus], GitHub Copilot, Gemini 3.8 Flash) 협업 파이프라인, 격리 Worktree 기반 개발 워크플로우, 그리고 비상 인계 규약의 단일 진실 공급원(SSOT) 가이드입니다.

---

## 1. 5대 AI 모델 역할 분배 및 Fallback 매트릭스

| 주력 모델 / 에이전트 | 기본 역할 (Role) | ChronoLedger 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성(`New-CollaborationRun.ps1`), Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/KST 날짜 계산(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태·인터랙션 구현 및 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | 일반 기능, 라우팅 및 UI 컴포넌트(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 코드베이스 탐색 서브에이전트, `docs/` 문서 동기화 보조 | **GitHub Copilot** | **Gemini 4 Argon** |

### Claude Pro Sonnet / Opus 2단계 운용 기준 (토큰 최적화)

사용자의 Claude Pro 구독을 효율적으로 활용하기 위해 **`Claude Sonnet`**과 **`Claude Opus`**를 2단계로 나누어 운용합니다. 기본 작업은 Sonnet으로 수행하여 쿼터 소진을 최소화하고, 심층 판단이 필요한 고난도 작업에 한해 Opus로 승격합니다.

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
   - `Gemini 4 Argon` 및 `GPT Codex`의 1순위 대체(Fallback 1) 수행.
3. **Opus 승격 4대 조건 (Assign Opus)**:
   - 작업 착수 시 또는 Sonnet 작업 진행 중 아래 4대 조건 중 하나라도 충족될 경우 즉시 Opus로 배정(또는 `⚠️ HANDOVER_NEEDED`로 Opus에 인계)합니다.
     - ① **금전, 원장, 포인트, RLS, SQL/RPC 수정**: 회계 무결성과 보안에 직결된 변경.
     - ② **브라우저 생명주기 및 비동기 동시성 예외 케이스**: 페이지 전환, 뒤로가기, 타이머, 경쟁 상태 등 미세 타이밍 제어.
     - ③ **3개 이상 모듈에 걸친 구조 변경 또는 오픈 아키텍처 설계 판단**: 모듈 간 경계 재정의, 전역 상태 아키텍처 변경 등.
     - ④ **Run 단위 통합 리뷰**: 전체 워크트리 변경분에 대한 종합 정적 검증(`review.json`).

---

## 2. 주축 모델(Argon) 직접 구현 금지 원칙 및 하이브리드 위임 프로토콜

1. **Orchestrator 직접 구현 금지 원칙**:
   - 주축 모델인 **Gemini 4 Argon**은 제품 소스 코드(`src/**`)를 직접 수정하지 않습니다.
   - 요구사항 분석, 구체적 수용 기준(Acceptance Criteria) 수립, 격리 Worktree 생성, Dispatch Queue 할당, 최종 검증 및 문서 마감에만 집중합니다.
2. **하이브리드 위임 프로토콜 (Hybrid Delegation)**:
   - **내부 Flash 서브에이전트 즉시 위임 (`Gemini 3.8 Flash` $\to$ `Model: "flash"`)**:
     - **대상**: Tailwind 스타일링, 배지·모달·드로어 마크업, 빠른 코드베이스 탐색, `docs/` 문서 동기화 등.
     - **방식**: Argon 세션 내에서 `define_subagent`(`enable_write_tools: true`) 및 `invoke_subagent`(`Model: "flash"`)를 통해 즉각 비동기 호출 및 위임. 사용자 턴 전환 불필요.
   - **외부 모델 턴 인계 (`docs/handoff.md` Dispatch Queue)**:
     - **대상**: 원장/결제/구독 계산 수식 및 Vitest 단위 테스트(**GPT Codex**), 심층 정적 리뷰(`review.json`), 보안/RLS 검증 및 복합 상태 리팩토링(**Claude Sonnet / Opus**), 일반 기능 및 라우팅 구현(**GitHub Copilot**).
     - **방식**: `docs/handoff.md` 최상단 `## 🎯 Active AI Collaboration Dispatch Queue`에 과제를 등록(`▶ READY`)하고 턴을 종료한 뒤, 사용자에게 모델 전환 후 **`"인수인계 문서를 확인해"`**를 입력하도록 명확히 안내.

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

1. **작업 정의 및 격리 환경 생성 (Orchestrator: Gemini 4 Argon)**:
   - 요구사항 분석 및 구체적 수용 기준(Acceptance Criteria) 정의.
   - `scripts/collaboration/New-CollaborationRun.ps1`을 실행하여 Base SHA를 고정하고 격리된 Git Worktree(`.worktrees/<run_id>`) 및 `artifacts/<run_id>/run.json` 생성:

     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/collaboration/New-CollaborationRun.ps1 -RunId "<run_id>" -Branch "<branch_name>"
     ```

   - `docs/handoff.md`의 `## 🎯 Active AI Collaboration Dispatch Queue`에 단계별 과제를 등록하고 1단계를 `▶ READY`로 활성화.
2. **격리 구현 (Maker: GPT Codex / Claude Sonnet / GitHub Copilot)**:
   - 지정된 전용 Worktree(`.worktrees/<run_id>`) 내부에서 허용 파일 범위에 맞추어 구현 진행.
   - 단위 테스트(`npx vitest run`) 및 타입 검사(`npx tsc --noEmit`) 수행.
   - 구현 완료 후 Git 커밋을 생성하여 **Target SHA**를 고정.
   - 루트 `docs/handoff.md`의 본인 과제 상태를 `✅ DONE (SHA: <commit_sha>)`으로 변경하고 다음 단계를 `▶ READY`로 전환.
3. **검증 및 정적 코드 리뷰 (Reviewer: Claude Opus / Claude Sonnet)**:
   - Base SHA $\leftrightarrow$ Target SHA 간 정적 diff를 바탕으로 `artifacts/<run_id>/review.json` 생성.
   - 단위 테스트 실행 결과가 포함된 경우 `artifacts/<run_id>/test.json` 생성.
   - 협업 아티팩트 스키마 검증 스크립트를 실행하여 스키마 준수 확인:

     ```bash
     python scripts/collaboration/validate_collaboration_artifact.py artifacts/<run_id>/review.json
     ```

4. **통합 및 인수인계 마감 (Orchestrator: Gemini 4 Argon / Claude Opus Fallback)**:
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
