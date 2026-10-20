# ChronoLedger AI 협업 종합 가이드 (AI Collaboration Guide)

이 문서는 ChronoLedger 프로젝트의 5대 AI 모델(Gemini 4 Argon, GPT Codex, Claude Opus 5.5, GitHub Copilot, Gemini 3.8 Flash) 협업 파이프라인, 격리 Worktree 기반 개발 워크플로우, 그리고 비상 인계 규약의 단일 진실 공급원(SSOT) 가이드입니다.

---

## 1. 5대 AI 모델 역할 분배 및 비상 인계 규칙

| 주력 모델 / 에이전트 | 기본 역할 (Role) | 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성, Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus 5.5** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식, 구독/KST 날짜 계산, Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus 5.5** | **GitHub Copilot** |
| **Claude Opus 5.5** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 복합 상태 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | 일반 UI 컴포넌트·라우팅(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 | **GitHub Copilot** | **Gemini 4 Argon** |

### 주축 모델(Argon) 직접 구현 금지 원칙
1. **Orchestrator 직접 구현 금지**: Argon은 제품 소스 코드(`src/**`)를 직접 수정하지 않으며, 요구사항 정의, Worktree 생성, 과제 분배 및 최종 검증만 담당합니다.
2. **하이브리드 위임 프로토콜**:
   - **경량 UI/문서 동기화**: `Gemini 3.8 Flash` 서브에이전트(`Model: "flash"`)를 내부 호출하여 즉시 위임.
   - **코어 로직/단위 테스트/심층 리뷰**: `docs/handoff.md`의 `## 🎯 Active AI Collaboration Dispatch Queue`에 등록(`▶ READY`) 후 외부 모델(Codex, Opus, Copilot)에 턴을 인계.

---

## 2. 프로젝트 문서 체계 (Single Source of Truth)

모든 프로젝트 문서는 `docs/` 하위 체계로 일원화되어 관리됩니다.

```
c:\Projects\ChronoLedger\
├── docs/
│   ├── to-do.md               # [SSOT] 전체 개발 백로그 및 작업 상태
│   ├── progress.md            # [SSOT] 마일스톤별 누적 진척도 및 구현 현황
│   ├── changelog.md           # [SSOT] 버전/단계별 변경 이력
│   ├── handoff.md             # [SSOT] 활성 Dispatch Queue 및 모델 인수인계 기록
│   ├── architecture.md        # 시스템 아키텍처 및 기술 스택 사양
│   ├── detailed-design.md     # 상세 기능 설계서
│   ├── known-pitfalls.md      # 개발 트러블슈팅 및 알려진 함정
│   ├── collaboration-guide.md # (본 문서) AI 협업 종합 가이드
│   ├── spec/                  # 기획 원본 (SRS, SPEC, revisions_and_decisions 등)
│   ├── design-previews/       # UI/아이콘 프로토타입 HTML 프리뷰
│   └── archive/               # 과거 검토 기록 및 구버전 계획서 보존소
├── sql/                       # 스키마, 마이그레이션, 시드, 테스트 SQL
├── artifacts/                 # run별 협업 산출물 (manifest, review.json, test.json)
└── scripts/collaboration/     # New-CollaborationRun.ps1 등 협업 스크립트
```

---

## 3. 격리 Worktree 기반 협업 워크플로우

1. **작업 정의 (Orchestrator)**:
   - 목표와 구체적 수용 기준(Acceptance Criteria) 정의.
   - `scripts/collaboration/New-CollaborationRun.ps1`을 실행하여 독립된 Git Worktree와 `artifacts/<run-id>/run.json` 생성.
2. **구현 (Maker)**:
   - 전용 Worktree(`.worktrees/<run-id>`)에서만 작업 수행.
   - 변경 사항 구현 후 커밋을 생성하여 **Target SHA**를 고정.
3. **검증 및 리뷰 (Reviewer / Test)**:
   - Base SHA와 Target SHA 간의 정적 diff를 바탕으로 `review.json` 및 `test.json` 증거 산출.
4. **통합 및 인수인계 마감 (Orchestrator)**:
   - 수용 기준과 리뷰 증거를 대조 검증한 뒤 `main` 브랜치에 병합.
   - `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md`, `docs/handoff.md` 최신 상태 동기화.

---

## 4. 비상 인계 프로토콜 ("인수인계 문서를 확인해")

1. **트리거**: 사용자가 모델 전환 후 **`"인수인계 문서를 확인해"`**를 입력하면, 해당 모델은 추가 질의 없이 즉시 다음을 수행합니다.
   - `docs/handoff.md` 최상단의 `## 🎯 Active AI Collaboration Dispatch Queue` 확인.
   - **`⚠️ HANDOVER_NEEDED`**(1순위) 또는 **`▶ READY`**(2순위) 상태의 과제를 찾아 즉시 착수.
2. **미완료 변경사항 복구**: 이전 모델이 쿼터/컨텍스트 소진으로 중단된 경우, 해당 브랜치에서 `git status --short` 및 `git diff`를 확인하여 미커밋 작업을 이어서 완수.
3. **토큰 소진 시 인계 기록**:
   - 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고 대체 모델 체인 지정.
   - `### 📌 중단 체크포인트`에 ① 완료된 파일, ② 남은 작업, ③ 결정 사항, ④ 테스트 여부를 명확히 기재.

