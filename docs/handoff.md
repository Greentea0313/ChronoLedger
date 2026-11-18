# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Sonnet/Opus 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run ID**: `r89-push-notification-research` *(`R89` · `R39` 연계: 웹 푸시(PWA)·Tauri 데스크톱 알림 지원 범위, 서버리스 발송 구조, 구독 저장·RLS, 게임 일정·예정 지출 알림 및 `R84` 건의 답변 알림 통합 설계 조사)*
- **Orchestrator**: Gemini 4 Argon *(2026-11-18 사용자 지시로 활성화)*
- **Worktree 경로**: `main` (문서 전용 조사이므로 격리 워크트리·`run.json` 없이 `main`에서 수행함. 코드·SQL 변경 없음)
- **Base SHA**: `d5b9b74312fe271b8e5f38c04a21023efbc156fb`
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-18)`** | **Claude Opus** *(Gemini 4 Hydrogen / Gemini 4 Argon 1순위 대체, GitHub Copilot 2순위 대체)* | `Researcher & Architect (R89)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: 신규 `docs/push-notification-research.md`, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `✅` [`docs/push-notification-research.md`](push-notification-research.md) 작성. 권장: 앱 내 알림함 먼저 → 일일 알림 → 웹 푸시. Tauri(WebView2) 웹 푸시는 미지원으로 판정. 사용자 결정 6건(§9) |
| **2** | **`▶ READY`** | **Gemini 4 Argon** *(Gemini 4 Hydrogen / Claude Opus 1순위 대체, GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | 조사 문서 검토, 사용자 결정 사항을 질문 카드로 확인, `R84` 및 알림 구현 후속 Run 예약 반영, `docs/` 마감 | `⏳ Step 1 완료 후 진행` |

#### 📝 `r89-push-notification-research` Step 1 완료 기록 (Claude Opus, 2026-11-18)

- **산출물**: [`docs/push-notification-research.md`](push-notification-research.md). 문서 전용, 코드·DB 변경 없음.
- **결론**: 알림을 DB `notifications` 행으로 먼저 만들고 앱 내 알림함으로 보여준 뒤, 같은 행을 Edge Function이 웹 푸시로 보내는 구조를 권장함. `R84` 답변 알림은 앱 내 알림만으로 먼저 출시 가능함.
- **플랫폼**: Android·데스크톱 브라우저 지원, iOS는 홈 화면 웹 앱(16.4+)에서만, Tauri(WebView2)는 웹 푸시 미지원으로 판정(구독 오류 보고·공식 문서 없음) → 앱 내 알림 + 실행 중 OS 알림만.
- **발송**: `pg_cron` 하루 1회(KST 09:00 안) + 알림 행 INSERT DB 웹훅(`pg_net`) 즉시 호출. 실패 행은 다음 실행이 다시 처리함. VAPID 개인키는 Edge Function Secrets에만 둠.
- **DB 초안**: `push_subscriptions`(endpoint 소유자 교체·로그아웃 시 해제), `notification_settings`, `notifications`(발송 상태·읽음). 모두 본인 조회만, 쓰기는 RPC·DB 함수 전용, 삭제 대기 차단·탈퇴 정리 연결.
- **Run 분할안**: ① `R84` 건의 + 앱 내 알림함 → ② 일일 알림(`R39`) → ③ 웹 푸시 → ④ (선택) Tauri OS 알림.
- **확인 못 한 것**: 실기기 시험 없음. WebView2 `PushManager` 실측, Deno용 웹 푸시 라이브러리 실제 발송, Supabase 무료 플랜 한도는 구현 Run에서 재확인 필요함.
- **다음 단계**: Step 2(`Gemini 4 Argon`, 대체 Gemini 4 Hydrogen / Claude Opus) `▶ READY`. 사용자 결정 6건(조사 문서 §9) 확인 후 후속 Run 예약.

#### 📌 `r89-push-notification-research` 단계별 수용 기준 (Acceptance Criteria)

1. **Step 1 (`Claude Opus` — Researcher & Architect)**: 신규 [`docs/push-notification-research.md`](push-notification-research.md)(한국어 개조식 `~함`, `~임`)를 작성함.
   - **① 플랫폼별 푸시·로컬 알림 지원 범위 및 제약**:
     - **Web / Android PWA**: Web Push API(`PushManager.subscribe`), VAPID 키(RFC 8292), 현행 `public/sw.js`에 `push`·`notificationclick` 이벤트 핸들러 결합 시 앱 셸/Supabase 캐시(`CLEAR_CACHES` 등)와의 공존 구조.
     - **iOS / iPadOS PWA**: iOS 16.4+ 홈 화면 추가(`display: standalone`) 필수 조건, 사용자 제스처(`Notification.requestPermission()`) 요구사항, 백그라운드 제약.
     - **Windows 데스크톱 (Tauri v2)**: WebView2 내 Web Push 지원 여부 vs `@tauri-apps/plugin-notification` 기반 OS 네이티브 알림(앱 실행 중/백그라운드 동작 범위) 비교.
     - **앱 내 알림함(In-App Notification / Badge) 대안**: 푸시 권한을 거부하거나 미지원 환경인 사용자를 위한 앱 내 알림(예: 상단 벨 아이콘 / 내 요청 카드 배지) 병행 여부 비교.
   - **② 서버 없는 정적 배포(`output: 'export'`)에서의 발송 아키텍처**:
     - **Supabase Edge Function + `pg_cron` (정기 알림)**: 게임 관심 일정(`user_favorite_schedules`) 시작·종료 D-1/당일 알림, 예정 지출(`expenses` `status = 'PLANNED'`) 결제 예정일 알림(`R39`)을 하루 1회 지정 시각(KST)에 스캔·발송하는 구조.
     - **이벤트 기반 즉시/준실시간 알림 (`R84` 건의 답변 알림 및 요청 승인/반려 알림)**: 관리자가 `R84` 기타 건의에 답변하거나 일정/캐릭터/게임 요청을 승인·반려할 때 발송하는 방식 비교(관리자 승인/답변 후 Edge Function 호출 vs DB Webhook/`pg_net` vs 앱 내 상태 배지).
     - VAPID 개인키 보관 위치(Edge Function Secrets), 발송 실패·만료 구독(`404`/`410 Gone`) 자동 정리, 무료 플랜 한도·비용 분석.
   - **③ DB 스키마·RLS·계정 탈퇴 정리 초안**:
     - 푸시 구독 테이블(예: `public.push_subscriptions`: `user_id`, `endpoint`, `p256dh`, `auth`, 기기 식별/활성 여부) 및 사용자별 알림 설정(예: 관심 일정 알림 ON/OFF, 예정 지출 알림 ON/OFF, 건의·요청 답변 알림 ON/OFF) 저장 구조.
     - 본인 행 전용 RLS 정책, 로그아웃 시 현재 기기 `endpoint` 구독 해제(공용 기기에서 타 계정 알림 노출 방지), 계정 삭제 대기 차단(`block_pending_account_data_mutations`) 및 `purge_expired_account_deletion_requests` 영구 삭제 연동.
   - **④ 결론 및 사용자 결정 항목 정리**:
     - `R84`(기타 건의 창구) 답변 알림의 권장 방식(1단계 앱 내 알림 배지 우선 vs Web Push 동시 도입), `R39`(일정·예정 지출 알림)와의 단계별 구현 순서(Run 분할안), 사용자 결정이 필요한 항목을 명확히 정리함.
2. **Step 2 (`Gemini 4 Argon` — Reviewer & Orchestrator)**:
   - [`docs/push-notification-research.md`](push-notification-research.md)의 기술 근거·보안 경계(공용 기기 로그아웃 시 구독 분리, VAPID 키 격리, RLS)를 검토하고, 사용자 결정 항목을 질문 카드로 확인한 뒤 `R84` 및 푸시 알림 구현 Run을 예약 목록에 반영하고 마감함.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R84` | 보류 | 기타 건의 창구(DB 변경). 활성 Run `R89` 완료 후 착수 | `docs/to-do.md` R84, 보관 문서 「다음 Run 예약 (`R83`~`R86`)」 절 |
| `R85` | 결정 완료·설계 우선 | 일정 시간 단위 표시(분 단위·KST) | `docs/to-do.md` R85, 보관 문서 같은 절 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R39`·`R40`·`R75`·`R87`·`R95` | 후속 · 우선 낮음 | 리뷰 P4 이관·후속 설계 | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `skill-support-check`

- **Run ID**: `skill-support-check` **(완료, 2026-11-18)** *(도구별 프로젝트 Skill 지원 확인 · 지침 Skill 분리 후속)*
- **Orchestrator**: Claude Opus *(Gemini 4 Argon 1순위 대체, 2026-11-18 사용자 지시로 등록)*
- **Worktree 경로**: `main` (문서 전용 확인이라 격리 워크트리·`run.json` 없음. 코드·SQL 변경 금지)
- **DB 변경**: 없음. 🐳 Docker 불필요.
- **배경**: 지침을 `.agents/skills/`(원본) Skill로 나누고 Claude용 사본 `.claude/skills/`를 `scripts/collaboration/Sync-Skills.ps1`로 만듦. 다른 도구는 Skill 지원 경로가 확인되지 않아 `AGENTS.md` §2 "필요할 때만 읽기" 안내만 둠.
- **확인 단계는 대체 모델이 대신할 수 없음**: 해당 도구에서만 확인 가능함. 도구를 쓸 수 없으면 행을 `🛑 BLOCKED (사유)`로 두고 다음 행을 `▶ READY`로 바꿈.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `🛑 BLOCKED (사용자 지시로 생략)` | **GitHub Copilot** *(대체 불가 — 사용 불가 시 BLOCKED 후 다음 행)* | `Tool Check` | 아래 공통 수용 기준 수행. 허용 파일: `docs/handoff.md`(아래 결과 표 해당 행·자기 단계 행), `docs/progress.md`(한 줄) | 사용자 지시로 확인 생략 (`미확인` 유지) |
| **2** | `🛑 BLOCKED (사용자 지시로 생략)` | **GPT Codex** *(대체 불가 — 사용 불가 시 BLOCKED 후 다음 행)* | `Tool Check` | 1번과 같음 | 사용자 지시로 확인 생략 (`미확인` 유지) |
| **3** | **`✅ DONE (2026-11-18)`** | **Gemini 4 Argon** *(같은 Gemini 도구의 Gemini 4 Hydrogen 대체 가능)* | `Tool Check` | 1번과 같음. 추가로 이 도구가 `.agents/rules/`·`.agents/skills/`를 자동으로 읽는지 확인 | `✅ 2026-11-18`: Antigravity IDE에서 `.agents/skills/` 6개 자동 인식(`Sync-Skills.ps1` 사본 불필요) 및 `AGENTS.md` + `trigger: always_on` 규칙(`collaboration.md`, `language.md`) 상시 로드 확인 |
| **4** | **`✅ DONE (2026-11-18)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Orchestrator (반영)` | 결과 표 기준으로 지원 확인된 도구 경로를 `Sync-Skills.ps1`의 `$Targets`에 추가·동기화, 해당 도구 상시 지침(`AGENTS.md`·`.github/copilot-instructions.md` 등) 정리, `docs/` 마감 | `✅` Antigravity는 원본 `.agents/skills/` 직접 인식 → `Sync-Skills.ps1` 대상 추가 없음. `agent_rules.md`·`document_location.md`에 `trigger: always_on` frontmatter 추가, `collaboration.md` 설명문 갱신, `AGENTS.md` 도구별 Skill 안내 갱신 |

#### 📌 `skill-support-check` 공통 수용 기준 (Step 1~3)

1. 지금 쓰는 도구 이름과 버전을 적음.
2. 그 도구가 저장소 안의 프로젝트 Skill(`SKILL.md` 형식, 필요할 때만 본문을 읽는 방식)을 지원하는지 공식 문서·도구 설정으로 확인함. 지원하면 프로젝트 Skill 폴더 경로를 적음. 확인하지 못하면 `미확인`으로 적고 추측하지 않음.
3. 이 세션 시작 때 자동으로 읽힌 지침 파일(`AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md`, `.agents/**` 등)을 적음.
4. 아래 결과 표의 자기 행을 채우고 자기 단계 행을 `✅ DONE (날짜)`, 다음 행을 `▶ READY`로 바꿈. `docs/progress.md` 맨 위에 한 줄 기록함.
5. `src/**`·`sql/**`·`.agents/**`·`scripts/**`는 수정하지 않음. 답과 문서는 한국어 개조식(~함, ~임)으로 씀.

#### 📋 도구별 Skill 지원 확인 결과

| 도구 | 버전 | 프로젝트 Skill 지원 | Skill 폴더 경로 | 세션 시작 시 자동으로 읽은 지침 | 근거(문서 링크·설정 위치) | 확인일 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Claude Code | 데스크톱 앱 | 지원 (Skill 6개 모두 세션 Skill 목록에 인식됨) | `.claude/skills/` | `CLAUDE.md` + `@` import 규칙 3개 | 세션 사용 가능 Skill 목록에서 6개 확인 | 2026-11-18 |
| GitHub Copilot | 미확인 | 미확인 | - | `.github/copilot-instructions.md` (`AGENTS.md` §2 안내 유지) | 사용자 지시로 확인 생략 | 2026-11-18 |
| GPT Codex | 미확인 | 미확인 | - | `AGENTS.md` (`AGENTS.md` §2 안내 유지) | 사용자 지시로 확인 생략 | 2026-11-18 |
| Gemini (Argon/Hydrogen/Flash) | Google Antigravity IDE (AGY 2.0, Gemini 4 Argon High) | 지원 (원본 `.agents/skills/*/SKILL.md` 6개 모두 세션 `<skills>`에 자동 인식·Progressive Disclosure 동작, 별도 사본 불필요) | `.agents/skills/` (`.agent/skills/`, `_agents/skills/`도 지원) | `<user_rules>`에 루트 `AGENTS.md` + `.agents/rules/` 중 YAML frontmatter `trigger: always_on`이 있는 `collaboration.md`·`language.md` 2개만 상시 주입됨 (`trigger: always_on`이 없는 `agent_rules.md`·`document_location.md`·`handoff.md`는 자동 주입 안 됨) | 현 세션 시스템 프롬프트 `<skills>`·`<user_rules>` 실측 및 내장 `agy-customizations` 가이드(`~/.gemini/antigravity/builtin/skills/agy-customizations/SKILL.md`·`docs/rules.md`·`docs/skills.md`) 확인 | 2026-11-18 |

#### 📝 `skill-support-check` Step 4 완료 기록 (Claude Opus, 2026-11-18)

- **결과 반영**: Antigravity는 원본 `.agents/skills/`를 바로 읽으므로 사본 대상에 넣지 않음(`Sync-Skills.ps1` 주석으로 기록). Copilot·Codex는 사용자 지시로 확인을 생략해 `AGENTS.md` §2 수동 안내를 유지함.
- **상시 규칙 정리**: Antigravity는 frontmatter `trigger: always_on`인 `.agents/rules/` 파일만 상시 주입함(Step 3 실측). `AGENTS.md` §1이 상시로 읽으라고 한 `agent_rules.md`·`document_location.md`에 같은 frontmatter를 추가함. `collaboration.md` 설명문의 낡은 "5-model"·handoff 절차 문구를 고침(절차는 handoff Skill에 있음).
- **확인 못 한 것**: `trigger` 값 종류(`always_on` 외)는 이 PC의 Antigravity 가이드(`docs/rules.md`)에 설명이 없어 확인하지 못함. `collaboration.md`는 Argon이 자주 쓰므로 `always_on`을 유지함. 두 파일의 상시 주입은 다음 Antigravity 세션에서 확인 필요함.
- **검증**: `Sync-Skills.ps1 -Check` 일치, markdownlint 통과.
