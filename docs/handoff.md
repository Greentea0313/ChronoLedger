# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **과제 구분**: 협업 규칙 보정 — Antigravity 실제 쿼터 구조(Gemini 공용 한도) 반영 및 토큰 소진 대체 체인 정정 (`main` 직접, 문서 전용, 🐳 불필요)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`📐 SPEC_NEEDED`** | **Gemini 4 Argon (`High`)** *(사용자 지정. Fallback: Gemini 4 Carbon (`High`) / Claude Opus (`High`))* | `Chief Architect (협업 규칙 보정 검토·결정·반영)` | 아래 **요구사항 접수 기록**의 조사 결과를 검토해 ① 쿼터 설명 정정 ② 토큰 소진 시 같은 쿼터 묶음 건너뛰기 대체 규칙 ③ 추론 수준 선택 안내 반영 여부와 문구를 결정하고 반영함(제품 결정은 질문 카드). 허용 파일: `.agents/rules/collaboration.md`, `.agents/skills/*`(`Sync-Skills.ps1`로 `.claude/skills/` 동기화), `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `docs/collaboration-guide.md`, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md` | `📐 Argon 검토 대기` |

#### 📥 요구사항 접수 기록 (Antigravity 쿼터 구조 반영 — Claude Opus 조사, 2026-11-25)

1. **조사 근거 (사용자 제공 Antigravity 모델 선택·사용량 화면, 2026-11-25)**:
   - 사용량은 **두 묶음**으로만 표시됨: `Gemini Models`(주간 한도 + 5시간 한도 공용), `Claude and GPT models`(주간 한도 + 5시간 한도 공용). `Gemini 4 Carbon` 전용 주간 쿼터는 따로 표시되지 않음.
   - 모델 목록: `Gemini 4 Neon`·`Gemini 4 Carbon`·`Gemini 4 Hydrogen`(New), `Gemini 4 Argon`·`Gemini 3.8 Flash`(Leaving Soon), `Orchestrator`(= `Gemini 4 Neon High`), `Claude Opus 5.5`·`Claude Sonnet 5.5`, `GPT-OSS 120B`(Notice).
   - 기본 표시 추론 수준: `Argon`만 `High`, 나머지(`Neon`·`Carbon`·`Hydrogen`·`Opus`·`Sonnet`)는 `Medium`.
2. **현재 규칙과 어긋나는 점**:
   - ① **쿼터 설명 오류**: `collaboration.md` §1이 `Hydrogen`·`Neon`을 "단기 쿼터", `Carbon`을 별도 쿼터처럼 설명하고 `Hydrogen` 기본 사유를 "`Carbon` 쿼터 보호"로 둠. 실제로는 세 모델이 같은 Gemini 주간·5시간 한도를 씀.
   - ② **토큰 소진 대체 체인 무효 구간**: Gemini 한도가 바닥나면 `Hydrogen`·`Neon`·`Carbon`이 동시에 멈추는데, 1순위 대체에 같은 묶음끼리 넘기는 경로가 있음(`Hydrogen`→`Neon`, `Carbon`→`Neon`, `Neon`→`Hydrogen`, `GPT Codex`→`Neon`). 승격(난이도) 체인은 한도와 무관하므로 유지 가능함.
   - ③ **추론 수준 기본값 불일치**: 규칙상 `Neon`·`Carbon`·`Opus`는 `High`인데 도구 기본 표시는 `Medium`이라, 사용자가 선택 시 직접 올려야 함.
3. **검토·결정 필요 사항**:
   - ① §1 쿼터 문구를 "Gemini 공용 한도(주간 + 5시간)"로 정정하고, `Hydrogen` 기본 사유를 "공용 한도 절약"으로 바꿀지. 모델별 한도 차감 비율(`Carbon`이 더 빨리 줄어드는지)은 화면으로 확인 불가하므로 관찰 후 기록할지.
   - ② 토큰 소진으로 인한 인계(`⚠️ HANDOVER_NEEDED`)에서는 같은 쿼터 묶음 모델을 건너뛰고 다른 묶음(Claude·GPT Codex·GitHub Copilot)으로 넘기는 규칙을 `collaboration.md` §1과 handoff Skill §3에 넣을지.
   - ③ Antigravity 안의 Claude·GPT 모델이 Gemini와 별도 한도이고 Claude Code의 Claude Pro 구독과도 별개로 보이는 점을 대체 경로로 명시할지.
   - ④ 큐 행에 적힌 추론 수준과 도구 기본 표시가 다르면 사용자가 모델 선택 시 수준을 직접 바꾼다는 안내를 넣을지.
   - ⑤ 미확인 사항: 서브에이전트 `Model: "flash_lite"`·`"inherit"` 실제 이름(이 화면에 없음), `GPT-OSS 120B`의 역할 편입 여부.
4. **관련 파일·문서**: `.agents/rules/collaboration.md` §1(표·Gemini 운용 기준), `.agents/skills/handoff/SKILL.md` §3, `docs/collaboration-guide.md` §1, `CLAUDE.md`·`.github/copilot-instructions.md`(추론 수준 요약 줄).

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R101-REV-001`·`R106-REV-001·002`(P4 선택) | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: 협업 규칙 개정 (`Argon` $\to$ `Carbon` 인계·`Flash` 대체·기본 추론 수준, `main` 직접, 2026-11-25)

- **과제 구분**: 협업 규칙 개정 — 11월 30일 서비스 종료 예정인 `Gemini 4 Argon` $\to$ `Gemini 4 Carbon` 인계 및 `Gemini 3.8 Flash` 대체 모델·서브에이전트 위임 규칙 정비 (`collaboration.md` §1~§3 및 관련 스킬/에이전트 문서)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-25)`** | **Gemini 4 Argon (`High`)** *(Fallback: Claude Opus / Gemini 4 Neon)* | `Chief Architect (협업 규칙·스킬 개정 설계 및 반영)` | 아래 **요구사항 접수 기록**을 바탕으로 `Argon` $\to$ `Carbon` 인계 원칙(역할·할당량 보호·`No Direct src/**` 경계·`/swarm` 사전 승인 규칙), `Flash` 대체 모델(`Gemini 4 Hydrogen` 통합 및 `Model: "flash_lite"`/`"inherit"` 서브에이전트 위임), 모델별 기본 추론 수준(`Hydrogen: Medium`, `Sonnet: Medium`, `Neon: High`, `Carbon: High`, `Opus: High`)을 확정·반영함. 허용 파일: `.agents/rules/collaboration.md`, `.agents/skills/*` (`Sync-Skills.ps1`로 `.claude/skills/` 동기화), `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `docs/collaboration-guide.md`, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md` | `✅` 질문 카드 2건 및 모델별 추론 수준(`Hydrogen/Sonnet: Medium`, `Neon/Carbon/Opus: High`) 반영 완료, `Sync-Skills.ps1 -Check` 통과 |
| **2** | **`✅ DONE (2026-11-25)`** | **Claude Opus (`High`)** *(Fallback: Gemini 4 Neon (`High`))* | `Reviewer & Architect (협업 규칙 개정·추론 수준 2차 검토 및 마감)` | Step 1에서 개정된 ① `Argon` $\to$ `Carbon` 인계 및 `/swarm` 사용자 사전 제안·승낙 규칙, ② `Gemini 3.8 Flash` 종료에 따른 6대 모델 통합(`Hydrogen` 흡수) 및 내부 서브에이전트(`Model: "flash_lite"`/`"inherit"`) 위임 규칙, ③ 모델별 기본 추론 수준(`Opus: High`, `Sonnet: Medium`, `Hydrogen: Medium`, `Neon: High`, `Carbon: High`) 구성의 적합성·예외 전환 기준(예: 단순 문서 `Low`·난해한 디버깅 `XHigh`)을 2차 검토하고, `Sync-Skills.ps1 -Check` 및 구참조(`Argon`/`Flash`) 점검 후 보완 사항 반영·과제 마감 수행. 허용 파일: `.agents/rules/collaboration.md`, `.agents/skills/*`, `.claude/skills/*`, `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `docs/collaboration-guide.md`, `docs/handoff.md`, `docs/progress.md`, `docs/changelog.md` | `✅` 구참조 점검 통과(이력·승계 설명만 남음), 보완 3건 반영(추론 수준 예외 기준, 서브에이전트 위임 금지 범위, 큐 행 수준 표기), `Sync-Skills.ps1 -Check` 통과 |

#### 📝 협업 규칙 개정(`Argon` $\to$ `Carbon` 인계 및 `Flash` 대체) 완료 기록 (Gemini 4 Argon, 2026-11-25)

1. **사용자 질문 카드 확정 사항**:
   - **`Gemini 4 Argon` $\to$ `Gemini 4 Carbon` 승계 및 `/swarm` 사전 승인 원칙**: `Gemini 4 Carbon`(`Low`~`High` + `Orchestrator (Carbon)`)이 Tier-3 `Chief Architect & Final Gatekeeper`(`src/**` 직접 수정 전면 금지, `Hydrogen` $\to$ `Neon` $\to$ `Carbon` 승격, `📐 SPEC_NEEDED` 전담) 역할을 승계함. `/swarm` 병렬 에이전트 기능은 자율 호출을 금지하되, 다수의 비충돌 파일/모듈 병렬 처리가 유리할 때 **사용자에게 먼저 예상 워커 수·역할·쿼터 소모 영향을 설명해 요청하고 사용자가 승낙(또는 직접 지시)한 경우에 한해 허용**하도록 `.agents/rules/collaboration.md` §3.2에 명문화함.
   - **`Gemini 3.8 Flash` 종료 대응 (6대 모델 통합 + 런타임 경량 서브에이전트 티어)**: 역할 매트릭스에서 `Gemini 3.8 Flash` 독립 행을 제거해 **6대 모델(`Gemini 4 Hydrogen`·`Gemini 4 Neon`·`Gemini 4 Carbon`·`GPT Codex`·`Claude [Sonnet/Opus]`·`GitHub Copilot`)**로 통합하고, 경량 UI/마크업·`docs/` 동기화·`GitHub Copilot` 1순위 대체 역할은 `Gemini 4 Hydrogen`(`Low`~`Medium`)이 흡수함. 세션 내부 `invoke_subagent` 호출 시에는 런타임 추상 경량 티어(`Model: "flash_lite"` 또는 `"inherit"`)를 사용하도록 통일함.
2. **갱신 및 동기화 검증**:
   - `.agents/rules/collaboration.md`, `.agents/skills/{chronoledger-orchestrator,chronoledger-maker,chronoledger-docs-closeout,chronoledger-sql-migration,handoff}/SKILL.md`, `.claude/skills/*`(`Sync-Skills.ps1` 동기화 및 `-Check` 통과), `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `docs/collaboration-guide.md` 일괄 갱신 완료.

#### 📥 요구사항 접수 기록 (협업 규칙 `Argon` $\to$ `Carbon` 인계 및 `Flash` 대체 — `Gemini 4 Hydrogen` 접수, 2026-11-25)

1. **요청 요지**:
   - 11월 30일부터 `Gemini 4 Argon`과 `Gemini 3.8 Flash`가 서비스 종료되므로, 기존 `Argon`의 역할을 `Gemini 4 Carbon`으로 인계하고 `Flash` 종료에 따른 대체 구성을 협업 규칙에 반영하고자 함.
2. **에스컬레이션 사유 (`.agents/rules/collaboration.md` §1~§2)**:
   - **메타 오케스트레이션 및 협업 규칙·스킬 재설계**는 `Gemini 4 Argon` (Fallback: `Claude Opus` / `Gemini 4 Neon`) 승격 조건 ④에 해당함.
3. **검토·결정 필요 사항**:
   - ① **`Argon` $\to$ `Carbon` 인계 규칙**: `Gemini 4 Carbon`을 3티어 Chief Architect & Final Gatekeeper(`No Direct src/**`, 주간 할당량 보호, `Hydrogen` $\to$ `Neon` $\to$ `Carbon` 승격)로 교체하고, `Carbon`의 `/swarm` 등 병렬 기능을 ChronoLedger `Dispatch Queue` 워크플로와 어떻게 구분/제한할지 확정.
   - ② **`Gemini 3.8 Flash` 대체 모델 확정**: 기존 `Flash` 역할(Tailwind/마크업, `Model: "flash"` 고속 검색 서브에이전트, `docs/`·아카이브 이동 보조)을 어떤 후속 경량 모델(또는 `Gemini 4 Hydrogen` / `Model: "flash_lite"` 등)로 대체할지 확정(필요 시 사용자 확인).
   - ③ **일괄 동기화**: `.agents/rules/collaboration.md`, `.agents/skills/` 5개 스킬(`Sync-Skills.ps1`로 `.claude/skills/` 동기화 포함), `.github/copilot-instructions.md` 일괄 갱신.
4. **관련 파일·문서**:
   - `.agents/rules/collaboration.md` (20곳)
   - `.agents/skills/chronoledger-orchestrator/SKILL.md` (3곳), `chronoledger-maker/SKILL.md` (2곳), `chronoledger-docs-closeout/SKILL.md` (1곳), `chronoledger-sql-migration/SKILL.md` (1곳), `handoff/SKILL.md` (1곳)
   - `.github/copilot-instructions.md` (2곳)

#### 📝 협업 규칙 개정 Step 2 (2차 검토·마감) 완료 기록 (Claude Opus, 2026-11-25)

- **검토 결과**: `Carbon` 승계·`/swarm` 사전 승낙·6대 모델 통합·`flash_lite`/`inherit` 위임·기본 추론 수준 구성이 규칙·스킬·지침 간에 일치함. `Argon`·`Flash` 언급은 이력 기록과 "구 `Argon` 승계" 설명뿐이라 수정 불필요함.
- **보완 반영**: ① `collaboration.md` §1·`collaboration-guide.md`에 Step별 추론 수준 예외 기준 추가(`Low`: 기계적 문서 작업, `XHigh`: 반복 실패·동시성·암호화·근거 충돌 감사, 금액·SQL Step은 기본 아래로 낮추지 않음, 수준 조정이 승격을 대신하지 않음) ② §3.2에 서브에이전트 위임 금지 범위 추가(Maker 스킬과 일치) ③ Orchestrator 스킬 큐 행 표기를 `Primary Model (Level)`로 명시.
- **검증**: `Sync-Skills.ps1 -Check` 일치, `git diff --check` 통과. 코드 변경 없음.
- **남은 점**: `flash_lite`·`inherit` 모델 이름과 `Carbon` 쿼터 주기는 Antigravity 실제 화면에서 확인하지 못함(사용자 질문 카드 결정을 따름). 11월 30일 이후 첫 Gemini 세션에서 실제 이름 확인 필요.
