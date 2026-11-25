# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R107-A` (`r107a-server-subscription-generation`) 마감 완료 (2026-11-25, `main` 병합 `7aa2984`)**. 현재 활성 대기 과제는 아래 `T1`~`T4` 및 후속 `📐 SPEC_NEEDED` (`Gemini 4 Carbon (High)`)임. `R107-A-CLEANUP`(운영 적용·1주 관찰 후) 및 `R107` Run 2(`r107b-due-today-notification`, `R107-A` 운영 적용 후)는 사용자 지목 시 등록함.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

#### 📐 Chief Architect 구체화 대기 (`T1`~`T4` Windows 데스크톱 통합 및 `R101-REV-001` · `R106-REV-001·002`)

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`📐 SPEC_NEEDED`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: Claude Opus (`High`) / Gemini 4 Neon (`High`))* | `Chief Architect (T1~T4 인증·딥링크 명세 및 선택 후속 정책 확정)` | 아래 **요구사항 접수 기록**을 바탕으로 `T1`~`T4` Windows Tauri 데스크톱 통합 명세·보안 경계·수용 기준 및 `R101-REV-001`·`R106-REV-001·002` 정책 확정 (`src/**` 직접 수정 금지). 허용 파일: 신규 `docs/` 스펙 문서, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `📐 구체화 대기 (2026-11-25 접수)` |
| **2** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (T1~T4 Run 등록)` | Step 1 완료 후 확정 명세에 따라 `T1`~`T4`(및 후속 Run) 격리 워크트리 생성·Dispatch Queue 등록 | `⏳ Step 1 완료 대기` |

##### 📥 요구사항 접수 기록 (`T1`~`T4` Windows 데스크톱 통합 및 정책 판단 필요 후속 — `Gemini 4 Hydrogen` 접수, 2026-11-25)

1. **요청 요지**: Docker 없이 진행 가능한 선택 후속과 Windows 데스크톱 통합(`T1`~`T4`)을 병행 진행하고자 함.
2. **에스컬레이션 사유 (`.agents/rules/collaboration.md` §1~§2)**:
   - `T1`~`T4`는 웹/Tauri auth adapter 분리, Tauri v2 custom scheme(`chronoledger://`) 외부 브라우저 OAuth 콜백·single-instance plugin 연동 등 **인증/세션 보안 경계** 및 **3개 이상 모듈**에 걸치며, 상세 설계 문서가 아직 없음 (`Carbon` 승격 조건 ①·②).
   - `R101-REV-001`(취소된 구독 회차의 고정비 표시 정책)과 `R106-REV-001·002`(`'전체 삭제'` 확인 UI·워커 점유 중 삭제 시 SQL 예외 처리)는 제품·SQL 판단이 필요함.
3. **확정·결정이 필요한 사항**:
   - `T1`~`T4`: OAuth flow(PKCE vs implicit·딥링크 state/토큰 검증), `single-instance` 플러그인 연동 시 콜백 URL 전달·세션 복구·로그아웃 복귀 수용 기준 및 Run 분할.
   - `R101-REV-001`: 취소된 같은 달 `template_id`를 `coveredTemplateIds`에 포함할지 여부.
   - `R106-REV-001·002`: `'전체 삭제'` 확인 단계 또는 로드 범위 한정 여부, `complete_push_notification_delivery` `no_data_found` 무시 처리 여부.
4. **관련 파일·문서**: `docs/to-do.md` `T1`~`T4`·`R101-REV-001`·`R106-REV-001·002`, `src/lib/supabase/client.ts`, `src/app/auth/`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`.

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A` 운영 DB 적용·확인 쿼리 완료(2026-11-25) · Run 2 등록 가능 | 정기·반복 지출 자동화: `R107-A` 서버 측 생성 통일(`main` 병합·운영 DB 적용 완료, 앱 배포 및 1주 관찰 후 `R107-A-CLEANUP`) → `R107-B` 결제 예정 알림(Run 2, 사용자 지목 시 등록 가능) → `R107-C` 자동 확정 옵션(Run 3). 명세 §9 미결 질문 6건은 기본값으로 진행 중 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R109` | `⏸️ 검토 완료 · 착수 결정 전` | 아이콘 Storage 이전(DB base64 → 공용 버킷 파일): 착수 전 §6 측정 쿼리로 크기 확인, 미결 결정 4건 사용자 확인 필요. 사용자가 지목할 때만 Run 등록 | [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md), `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R101-REV-001`·`R106-REV-001·002` (`📐 SPEC_NEEDED` 접수) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **`📐 SPEC_NEEDED`** | Windows Tauri 데스크톱 통합(auth adapter, custom scheme OAuth, single-instance, prod 빌드) — `Gemini 4 Carbon (High)` 명세 대기 | 위 `📐 Chief Architect 구체화 대기`, `docs/to-do.md` `T1`~`T4` |

### 🗂️ 직전 완료 Run 기록: `r107a-server-subscription-generation` *(`R107-A` 서버 측 정기 지출 생성 통일)*

- **Run ID**: `r107a-server-subscription-generation` **(완료, `main` 병합 `7aa2984`, 문서 마감 2026-11-25)** · **Orchestrator**: Claude Opus *(등록)* · Gemini 4 Hydrogen *(Step 4 마감)*
- **Worktree 경로**: `.worktrees/r107a-server-subscription-generation` (브랜치 `collab/r107a-server-subscription-generation`, 매니페스트 `artifacts/r107a-server-subscription-generation/run.json`, 미삭제·원격 미push)
- **Base SHA**: `ff04d84aff929671d77f42380e73217ec5f27a0e` · **Target SHA**: `372b37b5ad124837f4a11dbe150a59b247dd1523` *(산출물 `1cd8ad4`, `main` 병합 `7aa2984`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`, `SCHEMA.sql`). 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 48개 블록·2세션 병렬 `FOR UPDATE` 검증 PASS. **운영 DB 적용 및 확인 쿼리 검증 완료(사용자, 2026-11-25)**.

| 순서 | 상태 | 담당 모델 (Level) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: d82f38f)`** | **Claude Opus (`High`)** | `Maker (SQL/RPC/cron)` | `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`·`SCHEMA.sql`·README B표·`TESTS.sql` `R107A-01~03` 작성(5개 함수, `chronoledger-subscription-daily` `50 23 * * *`, `idx_expenses_interval_single_planned`) |
| **2** | **`✅ DONE (SHA: 372b37b)`** | **Gemini 4 Neon (`High`)** | `Maker (Client RPC 전환·폴백 & Vitest)` | `subscription-sync.ts` 3종 RPC 전환 + `PGRST202`/`42883` Legacy 폴백, `database.types.ts` 5개 RPC 추가, Vitest 76파일/1,026개 통과 |
| **3** | **`✅ DONE (SHA: 1cd8ad4, 병합 7aa2984)`** | **Gemini 4 Carbon (`High`)** | `Reviewer` | 정적 리뷰 P4 2건 비차단(`R107A-REV-001·002`), 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 48개·2세션 병렬 `FOR UPDATE` 검증·`next build` 통과, `main` 병합 `7aa2984` |
| **4** | **`✅ DONE (2026-11-25, 문서 마감)`** | **Gemini 4 Hydrogen (`Medium`)** | `Orchestrator (마감)` | 직전 완료 Run(`r108-review-followups-p4`)을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md)로 이관하고 `handoff.md`·`progress.md`·`changelog.md` 마감 완료. 운영 적용 절차(§3.3) 및 후속 착수 시점 안내 |

#### 📝 `r107a-server-subscription-generation` Step 3·4 핵심 요약 (2026-11-25)

- **Step 3 (Gemini 4 Carbon `High`)**: Base `ff04d84` ↔ Target `372b37b` 정적 리뷰(`review.json` P4 2건 비차단: `R107A-REV-001`·`002`), 로컬 DB 업그레이드·신규 2경로 2회 멱등·`TESTS.sql` 48개·2세션 병렬 `FOR UPDATE` 직렬화·`next build` 통과(`test.json`), `main` 병합 `7aa2984`(미push).
- **Step 4 (Gemini 4 Hydrogen `Medium`)**: `r108-review-followups-p4` 아카이브 이관 및 운영 문서 마감 완료. 운영 DB 적용(`MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql` → README B표 확인 쿼리 → `main` push 배포) 및 1주 관찰 후 `R107-A-CLEANUP`·Run 2(`r107b-due-today-notification`) 착수 안내함.
