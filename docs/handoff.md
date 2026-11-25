# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: `T1`~`T4` Windows 데스크톱 통합 및 선택 후속(`R101-REV-001`·`R106-REV-001·002`) 명세 확정 완료 → 아래 Row 2(`Gemini 4 Hydrogen (Medium)`, 격리 워크트리 `t1-t4-desktop-and-followups` 생성·Run 등록) **`▶ READY`**. 다음 `R107-C`(Run 3 `r107c-auto-confirm`)는 앱 배포 후 사용자가 지목하면 Orchestrator가 등록함(자동 착수 안 함).

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

#### 📐 Chief Architect 구체화 완료 및 Run 등록 반환 (`T1`~`T4` Windows 데스크톱 통합 및 `R101-REV-001` · `R106-REV-001·002`)

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 아래 커밋 참조, 2026-11-25)`** *(원 상태 `📐 SPEC_NEEDED`)* | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: Claude Opus (`High`) / Gemini 4 Neon (`High`))* | `Chief Architect (T1~T4 인증·딥링크 명세 및 선택 후속 정책 확정)` | 아래 **요구사항 접수 기록**을 바탕으로 `T1`~`T4` Windows Tauri 데스크톱 통합 명세·보안 경계·수용 기준 및 `R101-REV-001`·`R106-REV-001·002` 정책 확정 (`src/**` 직접 수정 금지). 허용 파일: 신규 `docs/` 스펙 문서, `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | ✅ [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) 작성 완료(사용자 질문 카드 결정 `D1`~`D5`, §2 상세 설계, §3 Step 1~3 수용 기준·모델 배정, `src/**`·`sql/**` 미수정) |
| **2** | **`▶ READY`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (t1-t4-desktop-and-followups Run 등록)` | 확정 명세 [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §3에 따라 깨끗한 트리에서 `New-CollaborationRun.ps1 -RunId "t1-t4-desktop-and-followups"`로 격리 워크트리를 생성하고 Dispatch Queue(Step 1 `GPT Codex` 🐳 SQL+예산 `▶ READY` → Step 2 `Gemini 4 Neon (High)` Tauri·Auth·UI·빌드 → Step 3 `Claude Opus (High)` 통합 리뷰·병합) 등록(큐 행에는 명세 절 번호 포인터만 기재) | `▶ READY (명세 확정 완료)` |

##### 📝 `T1`~`T4` 및 선택 후속 명세 확정 기록 (Gemini 4 Carbon `High`, 2026-11-25)

1. **사용자 확정 결정 (`D1`~`D5`)**: ① 웹·Tauri 모두 PKCE(`flowType: 'pkce'` + `exchangeCodeForSession`)로 단일 통일하고 해시 토큰(`implicit`/`setSession`) 경로를 제거함(Supabase Redirect URLs에 `chronoledger://auth/callback` 등록), ② `R106-REV-002`(SQL, 🐳) + `R101-REV-001` + `R106-REV-001` + `T1`~`T4`를 단일 Run `t1-t4-desktop-and-followups`로 묶어 단계별 진행하고 `DashboardLayout` `[로그아웃]` 클릭 시 `/auth`로 복귀함, ③ `R101-REV-001`은 해당 월 취소·환불(`CANCELLED`) 구독 회차의 `template_id`를 `coveredTemplateIds`에 포함해 당월 고정비 예정에서 제외함(익월은 유지), ④ `R106-REV-001`은 알림함 헤더 `[전체 삭제]` 인라인 2단계 확인(`[삭제 확인]`/`[취소]`) 적용, `R106-REV-002`는 `complete_push_notification_delivery`에서 알림 행 부재 시 `no_data_found` 예외 대신 만료/성공 엔드포인트 갱신 후 조용히 `RETURN`하도록 이번 Run SQL Step에 포함함.
2. **단계 배정 요약 (명세 §3)**: Step 1 **GPT Codex**(Fallback: `Gemini 4 Neon (High)` / `Claude Opus (High)`, 🐳 `R106-REV-002` SQL + `R101-REV-001` 예산 도메인) → Step 2 **Gemini 4 Neon (`High`)**(Fallback: `Claude Opus (High)`, `T1`~`T4` Auth Adapter·Tauri `single-instance`/`deep-link`·로그아웃 복귀·`R106-REV-001` UI·프로덕션 빌드) → Step 3 **Claude Opus (`High`)**(Fallback: `Gemini 4 Carbon (High)`, 통합 정적 리뷰·🐳 로컬 DB 게이트·`cargo check`·`main` 병합·마감).

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
| `R107` | `R107-A` 운영 적용 완료 · `R107-B` 운영 DB 적용 완료 | 정기·반복 지출 자동화: `R107-A` 운영 적용 완료(1주 관찰 후 `R107-A-CLEANUP`) → `R107-B` 결제 예정 알림 `main` 병합 `a84c6de`·운영 DB 적용 완료(앱 배포 필요) → `R107-C` 자동 확정 옵션(Run 3, `R107-B` 앱 배포 후 사용자 지목 시 등록). 명세 §9 미결 질문 6건은 기본값으로 진행 중 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R109` | `⏸️ 검토 완료 · 착수 결정 전` | 아이콘 Storage 이전(DB base64 → 공용 버킷 파일): 착수 전 §6 측정 쿼리로 크기 확인, 미결 결정 4건 사용자 확인 필요. 사용자가 지목할 때만 Run 등록 | [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md), `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R108-REV-001` (`R101-REV-001`·`R106-REV-001·002`는 아래 `T1`~`T4` Run에 합류) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **명세 확정 완료 · Run 등록 `▶ READY`** | Windows Tauri 데스크톱 통합(PKCE 단일화·auth adapter, `chronoledger://` + `single-instance`, 로그아웃 `/auth` 복귀, prod 빌드) + `R101-REV-001` + `R106-REV-001·002` — `Gemini 4 Hydrogen (Medium)` Run 등록 대기 | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md), `docs/to-do.md` `T1`~`T4` |

### 🗂️ 직전 완료 Run 기록: `r107b-due-today-notification` *(`R107-B` 오늘 결제 예정 알림 `EXPENSE_DUE_TODAY`)*

- **Run ID**: `r107b-due-today-notification` **(완료, `main` 병합 `a84c6de`, 문서 마감 2026-11-25)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Sonnet `Medium` *(Step 3 리뷰·병합·마감)*
- **Worktree 경로**: `.worktrees/r107b-due-today-notification` (브랜치 `collab/r107b-due-today-notification`, 매니페스트 `artifacts/r107b-due-today-notification/run.json`, 미삭제·원격 미push)
- **Base SHA**: `a6f14cc2b519bfba97c06c804082378b1c623558` · **Target SHA**: `74bece6ecbdc81a81b6b19610852ae18d4b4458e` *(산출물 `0589844`, `main` 병합 `a84c6de`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql`, `SCHEMA.sql`). **운영 DB 적용 및 확인 쿼리 3종 검증 완료(사용자, 2026-11-25)**. 미적용 상태에서도 설정 UI는 `42703`/`PGRST204` 폴백으로 토글만 숨김.

| 순서 | 상태 | 담당 모델 (Level) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 2e325cf)`** | **Gemini 4 Neon (`High`)** | `Maker (SQL/Migration/Tests)` | 마이그레이션·`SCHEMA.sql`·README·`TESTS.sql` `R107B-01~02`. 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 49개 PASS |
| **2** | **`✅ DONE (SHA: 74bece6)`** | **Gemini 4 Hydrogen (`Medium`)** | `Maker (설정 UI·타입 & Vitest)` | `'오늘 결제 예정'` 토글·컬럼 미적용 폴백·`database.types.ts`·테스트 3건, Vitest 1,037개 통과 |
| **3** | **`✅ DONE (SHA: 0589844, 병합 a84c6de)`** | **Claude Sonnet (`Medium`)** | `Reviewer & Orchestrator` | 정적 리뷰 `clean`(발견 0건), `tsc`·`lint`·Vitest 76파일/1,037개·`build`(더미 환경변수) 통과, 🐳 로컬 업그레이드(Base 스키마→마이그레이션)·신규 설치 2경로 각 2회 멱등·확인 쿼리 3종·`TESTS.sql` 49개 PASS, `main` 병합 `a84c6de`(미push) |

#### 📝 `r107b-due-today-notification` 핵심 요약 (2026-11-25)

- **구현**: `notifications_kind_check`에 `'EXPENSE_DUE_TODAY'` 추가, `notification_settings.expense_due_today`(기본 true) 추가, `enqueue_daily_notifications()` 4번 절(오늘 KST `PLANNED` 지출 사용자·일자당 1건 요약, 금액·항목명·메모 비노출, 탈퇴 대기·옵트아웃 제외, `ON CONFLICT DO NOTHING`), 설정 UI 토글과 미적용 컬럼 폴백.
- **리뷰 메모**: `R107-C`에서 `auto_confirm_blocked` 컬럼 추가 시 4번 절 집계 조건 재검토 필요(명세 §5.1-2). `R107-C` 적용 후 이 마이그레이션을 재실행하면 `MIGRATION_R107C_AUTO_CONFIRM.sql`도 재실행해야 함(README 기재).
- **검증 환경 메모**: 워크트리에 `.env.local`이 없어 `build`는 더미 `NEXT_PUBLIC_SUPABASE_*` 환경변수로 실행함. 로컬 DB 재설정 시 `storage.objects` 정책도 함께 제거해야 `SCHEMA.sql`이 끝까지 적용됨. `validate_collaboration_artifact.py`는 `jsonschema` 설치 필요(`pip install --user jsonschema`로 설치함).
- **남은 일**: 앱 배포(`main` push) → 사용자 지목 시 `R107-C`.

