# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **현재 활성 Run 없음** *(직전 `협업 규칙 보정: Antigravity Gemini 공용 한도 및 Cross-Pool 대체 체인 정정` 완료, 2026-11-25. 다음 Run은 예약 요약표에서 사용자가 지목하거나 신규 요구사항을 입력하면 착수함)*

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

### 🗂️ 직전 완료 Run 기록: 협업 규칙 보정 (Antigravity Gemini 공용 한도 및 Cross-Pool 대체 체인 정정, `main` 직접, 2026-11-25)

- **과제 구분**: 협업 규칙 보정 — Antigravity 실제 쿼터 구조(Gemini 공용 한도) 반영 및 토큰 소진 대체 체인 정정 (`main` 직접, 문서 전용, 🐳 불필요)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-25)`** | **Gemini 4 Argon (`High`)** *(사용자 지정. Fallback: Gemini 4 Carbon (`High`) / Claude Opus (`High`))* | `Chief Architect (협업 규칙 보정 검토·결정·반영)` | 요구사항 접수 기록의 조사 결과를 검토해 ① 쿼터 설명 정정(`Gemini Models` 주간+5시간 공용 한도) ② 토큰 소진 시 같은 쿼터 묶음 건너뛰기 대체 규칙(Cross-Pool Fallback) ③ 도구 UI 기본 추론 수준(`Medium`) 선택 안내 및 `flash_lite`/`inherit`·`GPT-OSS 120B` 정리를 질문 카드로 확정·반영하고 과제를 마감함 | `✅` 질문 카드 3건 확정, `.agents/rules/collaboration.md`·`handoff/SKILL.md`(`.claude/skills/` 동기화)·`docs/collaboration-guide.md` 반영 및 마감 |

#### 📝 협업 규칙 보정 완료 기록 (Gemini 4 Argon, 2026-11-25)

1. **사용자 질문 카드 확정 및 반영 사항**:
   - **Gemini 공용 한도(`Gemini Models` 주간+5시간 공용) 명시**: `Hydrogen`·`Neon`·`Carbon` 3종이 Antigravity에서 같은 `Gemini Models` 한도를 공유함을 반영하고, `Hydrogen (Medium)` 기본 사용 사유를 **"공용 한도의 턴당 차감량 절약 및 응답 속도 최적화"**로 정정함.
   - **난이도 승격과 한도 소진 대체(Cross-Pool Quota Fallback) 분리**: Gemini 공용 한도 소진 시 `Hydrogen`·`Neon`·`Carbon`이 동시에 멈추므로, 한도 소진 인계(`⚠️ HANDOVER_NEEDED`)에서는 같은 쿼터 풀을 건너뛰고 즉시 다른 쿼터 풀(`Hydrogen` $\to$ `Claude Sonnet (Medium)` / `GitHub Copilot`, `Neon` $\to$ `Claude Opus (High)` / `GPT Codex`, `Carbon` $\to$ `Claude Opus (High)`)로 넘기도록 `.agents/rules/collaboration.md` §1 및 `.agents/skills/handoff/SKILL.md` §3을 정정함.
   - **도구 UI 추론 수준 선택 안내 및 기타 정리**: Antigravity 모델 선택기 초기값이 `Medium`이므로 `High`/`XHigh` 모델로 인계·전환 안내 시 **`"도구에서 High(또는 XHigh) 선택"`**을 병기하도록 `collaboration.md` §1·`handoff/SKILL.md` §1.8·§3에 명시함. `Model: "flash_lite"`/`"inherit"`는 `invoke_subagent` 내부 도구 파라미터 enum임을 명시하고, `GPT-OSS 120B (Medium)`는 주력 6대 모델 외 비상 백업 참고로만 기록함.
2. **검증**: `Sync-Skills.ps1` 동기화 및 `Sync-Skills.ps1 -Check` 통과, `git diff --check` 통과.
