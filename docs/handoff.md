# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R96-REV-07` (`r96-rev07-webhook-config` — Base `91c7abd`, 브랜치 `collab/r96-rev07-webhook-config`, 워크트리 `.worktrees/r96-rev07-webhook-config`)** *(운영 Supabase DB에서 `ALTER DATABASE postgres SET app.settings.send_notifications_*` 실행 시 `42501: permission denied` 발생에 따른 비공개 단일 행 설정 테이블 `public.push_webhook_config` + `public.set_push_webhook_config` 헬퍼 + 3단계 조회 `push_webhook_config` → `vault.decrypted_secrets` → `current_setting` 전환)*
- **Target SHA**: `1514343279d78d19d18c9df5a2723a9b2cb73113` *(Step 2 Maker 완료, 미병합, 원격 브랜치: push 안 함)*
- **DB 변경**: 있음(🐳 로컬 Supabase DB 업그레이드·신규 2회 멱등 + `TESTS.sql` 44개 PASS 완료; Step 3 병합 게이트 재검증 대기).
- **전제 현황 (사용자 완료)**: R96 1~3단계(VAPID 키쌍·웹훅 시크릿 생성, Edge Function `send-notifications --no-verify-jwt` 배포, Edge Function 시크릿 4종 등록) 적용 완료됨.
- **확정 명세 및 수용 기준**: [`docs/push-notification-research.md`](push-notification-research.md) **§11.2.4 · §11.5 · §11.6**

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`✅ DONE (2026-11-24)`** | **Gemini 4 Argon** *(Fallback 1: Claude Opus / Gemini 4 Neon, Fallback 2: Gemini 4 Hydrogen)* | `Chief Architect` | **요구사항 접수 기록 (`R96-REV-07`)** 검토 후 설계 결정·단계별 수용 기준 확정([`docs/push-notification-research.md`](push-notification-research.md) §11.2.4·§11.5·§11.6·`docs/handoff.md`, `src/**`·`sql/**` 직접 수정 금지) 및 Run 등록용 `Gemini 4 Hydrogen`(`▶ READY`) 행 반환 | `✅` `public.push_webhook_config` 단일 행 비공개 테이블(`REVOKE ALL FROM PUBLIC, anon, authenticated, service_role` + RLS 무정책)·`public.set_push_webhook_config` 헬퍼·3단계 조회(`push_webhook_config` $\to$ 동적 `vault.decrypted_secrets` $\to$ `current_setting`) 설계 및 §11.6 수용 기준 확정 완료 |
| **1** | **`✅ DONE (Base 91c7abd)`** | **Gemini 4 Hydrogen** *(Fallback 1: Gemini 4 Neon / Claude Sonnet, Fallback 2: GitHub Copilot)* | `Orchestrator (Run r96-rev07-webhook-config 워크트리 생성 및 등록)` | [`docs/push-notification-research.md`](push-notification-research.md) §11.6에 따라 깨끗한 `main`에서 `New-CollaborationRun.ps1 -RunId "r96-rev07-webhook-config"`로 격리 워크트리(`.worktrees/r96-rev07-webhook-config`)를 생성하고 아래 Step 2(`GPT Codex` Maker)를 `▶ READY`로 전환함 | `✅` Row 0 `docs/` 커밋(`91c7abd`) 후 `.worktrees/r96-rev07-webhook-config`(`collab/r96-rev07-webhook-config`, `run.json`) 생성 및 Step 2 `▶ READY` 전환 완료 |
| **2** | **`✅ DONE (SHA: 1514343279d78d19d18c9df5a2723a9b2cb73113)`** | **~~GPT Codex~~ ➡️ Gemini 4 Neon** *(Fallback 1 대체 실행; Fallback 1: Claude Opus, Fallback 2: Gemini 4 Hydrogen)* | `Maker (R96-REV-07 Webhook Config DB/Migration/Tests)` | Step 1 완료 후 착수. 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). [`docs/push-notification-research.md`](push-notification-research.md) §11.2.4·§11.6 Step 1 수용 기준 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R96_WEBHOOK_CONFIG.sql`, `sql/migrations/MIGRATION_R96_WEB_PUSH.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅` 워크트리 커밋 `1514343279d78d19d18c9df5a2723a9b2cb73113`(SQL 5파일). 🐳 로컬 Supabase 업그레이드/신규 2회 멱등·확인 쿼리 3종·`TESTS.sql` 44개 PASS·Vault 2순위 조회·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1021개 통과 |
| **3** | **`▶ READY`** | **Claude Opus** *(Fallback 1: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요** (로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증 병합 게이트). [`docs/push-notification-research.md`](push-notification-research.md) §11.6 Step 2 수용 기준(Base `91c7abd7b4b95a7bb02f536d1571529b2743e017` $\leftrightarrow$ Target `1514343279d78d19d18c9df5a2723a9b2cb73113` 정적 리뷰 `review.json`·로컬 DB 2회 멱등 및 `TESTS.sql` 검증 `test.json`·`main` 병합·운영 적용 안내 및 문서 마감) 수행 | 대기 중 |

#### 📝 `r96-rev07-webhook-config` Step 2 (Maker) 완료 기록 (Gemini 4 Neon, GPT Codex 1순위 대체, 2026-11-24)

- **Target SHA**: `1514343279d78d19d18c9df5a2723a9b2cb73113` (`collab/r96-rev07-webhook-config`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 5건)**:
  - 신규 `sql/migrations/MIGRATION_R96_WEBHOOK_CONFIG.sql`: `public.push_webhook_config` 단일 행 비공개 테이블(`id = true` CHECK, `url` `^https://` 12~2048자 CHECK, `secret` `NULL` 또는 32~512자 CHECK, `ENABLE ROW LEVEL SECURITY` 무정책, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`), `public.set_push_webhook_config(p_url, p_secret DEFAULT NULL)`(`SECURITY DEFINER SET search_path = public`, `ERRCODE = '23514'` 검증, `ON CONFLICT (id) DO UPDATE`, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`), `public.invoke_send_notifications_webhook()` 3단계 조회(`push_webhook_config` $\to$ 동적 예외 격리 `vault.decrypted_secrets` $\to$ `current_setting('app.settings.send_notifications_*', true)`).
  - `sql/migrations/MIGRATION_R96_WEB_PUSH.sql` · `sql/SCHEMA.sql`: 구 마이그레이션 재실행 회귀 방지 및 신규 설치 정합성을 위해 동일 테이블·RLS·권한·함수 반영함.
  - `sql/README.md`: B표에 `MIGRATION_R96_WEBHOOK_CONFIG.sql` 행 및 확인 쿼리 3종 추가, `MIGRATION_R96_WEB_PUSH.sql` 행에 후속 증분 안내 연결함.
  - `sql/tests/TESTS.sql`: 헤더·`R96-01`(`authenticated`)·`R96-02`(fixture: 유효성 `23514` 거부·등록·설정 존재 시 `invoke_send_notifications_webhook()` 예외 미발생·`NULL` 시크릿 갱신·`service_role` 권한 차단 단언·정리)·`R96-04`(`anon`) 확장함.
- **결정·전제 사항**:
  - `src/types/database.types.ts`는 의도적으로 미수정함(`push_webhook_config`·`set_push_webhook_config` 모두 PostgREST 전 역할 권한 회수·SQL Editor 전용이며 허용 파일 외임).
  - `MIGRATION_R96_WEB_PUSH.sql`을 R102 적용 DB에 재실행하면 구버전 `purge_expired_account_deletion_requests` 본문으로 되돌아가므로(기존 README 주의사항) 로컬 검증 시 R96 재실행 후 `MIGRATION_R102_EXPENSE_PRESETS.sql`을 재적용해 탈퇴 정리 함수를 최신화함.
- **실행 검증 결과**:
  - 🐳 로컬 Supabase 업그레이드 경로(`MIGRATION_R96_WEBHOOK_CONFIG.sql` 2회 멱등 → 확인 쿼리 3종: `push_webhook_config, t, 0` / 6개 권한 모두 `f` / `uses_config_table = t` → `TESTS.sql` 44개 PASS·ROLLBACK) 통과함.
  - 🐳 로컬 Supabase 신규 설치 경로(`public` 스키마 리셋 → `SCHEMA.sql` 1회 → `MIGRATION_R96_WEB_PUSH.sql` 2회 → `MIGRATION_R96_WEBHOOK_CONFIG.sql` 2회 → `MIGRATION_R102_EXPENSE_PRESETS.sql` 1회 → `TESTS.sql` 44개 PASS·ROLLBACK) 통과함.
  - 🐳 2순위 `vault.decrypted_secrets` 동적 SQL 조회 실동작(ROLLBACK 트랜잭션 내 `vault.create_secret` 등록 후 테이블 비어 있음 / `secret = NULL` 조합 모두 예외 없음·복호화 값 일치) 확인함.
  - 워크트리 `git diff --check` 통과, `npx.cmd tsc --noEmit` 통과, `npm.cmd run lint` 경고·오류 0건, `npx.cmd vitest run --dir src` 76파일 1021개 전체 통과함.
- **남은 작업**: Step 3(**Claude Opus**, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon`)가 Base `91c7abd` $\leftrightarrow$ Target `1514343` 정적 리뷰(`review.json`)·🐳 로컬 DB 병합 게이트 검증(`test.json`)·`main` 병합·운영 DB 적용 안내 및 문서 마감 수행 예정임.

#### 📝 `r96-rev07-webhook-config` Step 1 (Orchestrator) 완료 기록 (Gemini 4 Hydrogen, 2026-11-24)

- **선행 커밋**: Row 0(Argon) 미커밋 `docs/` 5개 파일(`docs/handoff.md`, `docs/known-pitfalls.md`, `docs/progress.md`, `docs/push-notification-research.md`, `docs/to-do.md`)을 `main`에 커밋(`91c7abd`)해 깨끗한 `main` 상태에서 분기함.
- **워크트리 및 매니페스트**: `New-CollaborationRun.ps1` 실행 완료 — 경로 `.worktrees/r96-rev07-webhook-config`, 브랜치 `collab/r96-rev07-webhook-config`, Base SHA `91c7abd7b4b95a7bb02f536d1571529b2743e017`, 매니페스트 `.worktrees/r96-rev07-webhook-config/artifacts/r96-rev07-webhook-config/run.json`.
- **다음 단계**: **GPT Codex**가 `.worktrees/r96-rev07-webhook-config`에서 Step 2(`R96-REV-07` DB 마이그레이션·`SCHEMA.sql`·`README.md`·`TESTS.sql`) 수행 예정(🐳 Docker Desktop 필요).

#### 📝 `R96-REV-07` Chief Architect 설계 결정 및 수용 기준 확정 기록 (Gemini 4 Argon, 2026-11-24)

1. **설계 결정 (`docs/push-notification-research.md` §11.2.4 · §11.5 · §11.6)**:
   - ① **저장소 구조**: 호스팅 Supabase에서 `postgres` 역할이 비슈퍼유저라 `ALTER DATABASE postgres SET app.settings.*`가 `42501`로 차단되므로, PostgREST 모든 역할(`PUBLIC, anon, authenticated, service_role`)로부터 권한을 회수(`REVOKE ALL`)하고 `ENABLE ROW LEVEL SECURITY`(무정책 기본 거부)를 적용한 단일 행 비공개 설정 테이블 `public.push_webhook_config`(`id = true` CHECK, `url` `^https://` 12~2048자 CHECK, `secret` `NULL` 또는 32~512자 CHECK)와 SQL Editor 전용 등록·갱신 함수 `public.set_push_webhook_config(p_url TEXT, p_secret TEXT DEFAULT NULL)`(`SECURITY DEFINER SET search_path = public`, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`)를 도입함.
   - ② **3단계 조회 우선순위 및 하위 호환(`R96-REV-06` Vault 연동 포함)**: `public.invoke_send_notifications_webhook()`은 1순위 `public.push_webhook_config`(`WHERE id = true`) $\to$ 2순위 `vault.decrypted_secrets`(`to_regclass('vault.decrypted_secrets') IS NOT NULL`일 때 내부 `EXCEPTION WHEN OTHERS THEN NULL` 격리 블록에서 동적 SQL로 `'send_notifications_url'`·`'send_notifications_secret'` 보충) $\to$ 3순위 `current_setting('app.settings.send_notifications_*', true)` 세션 GUC 폴백(`TESTS.sql` `set_config` 호환 유지) 순으로 조회함.
   - ③ **마이그레이션 회귀 방지 및 검증 범위**: 이미 `MIGRATION_R96_WEB_PUSH.sql`을 적용한 운영 DB가 바로 실행할 수 있도록 증분 마이그레이션 `sql/migrations/MIGRATION_R96_WEBHOOK_CONFIG.sql`을 신규 추가하고, 구 마이그레이션 재실행 시 함수 본문이 되돌아가지 않도록 `sql/migrations/MIGRATION_R96_WEB_PUSH.sql`과 `sql/SCHEMA.sql`에도 동일한 테이블·함수 정의를 반영함. `sql/README.md` B표 확인 쿼리 3종과 `sql/tests/TESTS.sql` R96 블록(`set_push_webhook_config` 검증·갱신, `anon`/`authenticated` 테이블·함수 접근 차단 단언)을 함께 확장함.
2. **현재 세션 제약 및 다음 단계**:
   - 이 대화 세션(`d2511ae9-...`)은 이전 PC 경로(`c:\Users\inha0\OneDrive\...`)가 셸 작업 디렉터리로 캐시되어 `run_command`(`New-CollaborationRun.ps1`) 실행이 불가하므로, `.agents/rules/collaboration.md` §2.5에 따라 Row 0을 `✅ DONE`으로 마감하고 **새 채팅 세션**에서 **`Gemini 4 Hydrogen`**(또는 1순위 대체 **`Gemini 4 Neon`** / **`Claude Sonnet`**)이 `New-CollaborationRun.ps1 -RunId "r96-rev07-webhook-config"`를 실행하도록 Row 1(`▶ READY`)을 반환함.

#### 📥 요구사항 접수 기록 (`R96-REV-07` — `Gemini 4 Hydrogen` 접수, 2026-11-24)

1. **요청 요지**:
   - 사용자가 R96 운영 배포 1~3단계(VAPID 키쌍·웹훅 시크릿 생성, `send-notifications` Edge Function 배포, Edge Function 시크릿 4종 등록)를 완료한 뒤 4단계(`ALTER DATABASE postgres SET app.settings.send_notifications_url` / `send_notifications_secret`)를 Supabase Dashboard SQL Editor에서 실행하자 `ERROR: 42501: permission denied to set parameter "app.settings.send_notifications_url"` 오류가 발생함.
   - 운영 Supabase 클라우드 DB에서 `invoke_send_notifications_webhook()`이 웹훅 URL과 시크릿을 안전하게 읽을 수 있도록 대체 저장·조회 방식을 설계하고 새 Run으로 등록해 해결해야 함.
2. **에스컬레이션 사유 (`collaboration.md` §2)**:
   - `SECURITY DEFINER` 함수·시크릿 저장소(Supabase Vault vs 비공개 테이블 등) 권한 경계 및 보안 설계 변경에 해당하며, 기존 승인 명세([`docs/push-notification-research.md`](push-notification-research.md))에 `42501` 대체 설계가 확정되어 있지 않음.
3. **검토·결정 필요 사항**:
   - ① 저장 방식 선택: Supabase Vault(`vault.decrypted_secrets`) vs 비공개 설정 테이블(예: `private` 또는 `public` 내 `REVOKE ALL` 테이블 + 관리자/SQL Editor 등록용 헬퍼 또는 직접 INSERT) vs 기타 Supabase 지원 방식.
   - ② 기존 `current_setting('app.settings.send_notifications_*', true)` 폴백 유지 여부(`sql/tests/TESTS.sql` 로컬 호환성) 및 `invoke_send_notifications_webhook()` 조회 우선순위.
   - ③ 신규 마이그레이션(`MIGRATION_R96_REV08_...sql`), `SCHEMA.sql`, `sql/README.md` B표 확인 쿼리·운영 적용 절차(§11.5 갱신), `TESTS.sql` 검증 범위.
4. **관련 파일·문서**:
   - `sql/migrations/MIGRATION_R96_WEB_PUSH.sql` (313~345행 `invoke_send_notifications_webhook`)
   - `sql/SCHEMA.sql` (2349~2350행)
   - `sql/tests/TESTS.sql` (2863행 부근 R96 블록)
   - `docs/push-notification-research.md` §11.5 (313~320행)

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 1~3단계 배포 완료 / 4단계 DB 설정 보완 대기 | 운영 DB 마이그레이션 + 1~3단계(VAPID·Edge Function 배포·시크릿 4종) 완료(2026-11-24). 4단계 `ALTER DATABASE` `42501` 차단에 따른 `R96-REV-07`(`📐 SPEC_NEEDED`) 후속 처리 및 5단계(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) 대기 | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R96-REV-07`·`R101-REV-001` | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r105-dashboard-summary-bar`

- **Run ID**: `r105-dashboard-summary-bar` **(완료, `main` 병합 `fe5bf77`, 2026-11-24)** *(`R105`: 대시보드 홈 상단 상태바를 컴팩트 KPI + 월간 예산 페이스 연동 바로 개편)*
- **Orchestrator & Reviewer**: Gemini 4 Hydrogen *(2026-11-24 등록·리뷰·병합 마감)*
- **Worktree 경로**: `.worktrees/r105-dashboard-summary-bar` (브랜치: `collab/r105-dashboard-summary-bar`, 매니페스트: `artifacts/r105-dashboard-summary-bar/run.json`, 미삭제·원격 미push)
- **Base SHA**: `d1e18b42e021d8eeefe4dc0795be421d0a450a29`
- **Target SHA**: `3271d5d0e6c0ed00dfa8b3a7deca8cf4b11d20c1` *(iteration-01 리뷰 clean, 산출물 `e363cc4`, `main` 병합 `fe5bf77`)*
- **DB 변경**: 없음. 🐳 Docker 불필요.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 3271d5d)`** | **Claude Sonnet** *(Fallback: Gemini 4 Hydrogen / GitHub Copilot)* | `Maker (R105 대시보드 상태바 개편 & Vitest)` | 상태바 4칸 인터랙티브 카드·월간 예산 페이스 바·클릭 연계 구현 및 Vitest 8건 보강. tsc·lint·Vitest 76파일/1021개 통과 |
| **2** | **`✅ DONE (산출물 e363cc4, main 병합 fe5bf77)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / GitHub Copilot)* | `Reviewer & Orchestrator` | Base `d1e18b4` ↔ Target `3271d5d` 정적 리뷰 **clean**(지적 0건). tsc·lint·Vitest 76파일/1021개·`next build`(16페이지) 통과 후 `main` 병합 `fe5bf77` 및 병합 후 검증 통과 |

#### 📝 `r105-dashboard-summary-bar` Step 2 완료 기록 (Gemini 4 Hydrogen, 2026-11-24)

- **리뷰 범위·독립성**: Base `d1e18b42e021d8eeefe4dc0795be421d0a450a29` ↔ Target `3271d5d0e6c0ed00dfa8b3a7deca8cf4b11d20c1`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Claude Sonnet)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: `src/app/dashboard/page.tsx`·`page.test.tsx` 2개 허용 파일만 변경. 4칸 카드(오늘 일정·이번 주 관심/진행 일정·이번 주 예정 지출·월 예산 잔여 페이스 바), 80%/100% 초과 색·폭 상한, 비로그인/미설정 폴백, 접근성(`aria-label`, `<button>`/`<Link>`, `progressbar`) 모두 수용 기준과 일치함.
- **산출물·검증**: `artifacts/r105-dashboard-summary-bar/iteration-01/review.json`·`test.json`, `run.json` 갱신 후 워크트리 커밋 `e363cc4` (이 PC Python에 `jsonschema` 모듈 미설치로 `json.load` + 스키마 대조 검증). 워크트리 `tsc`·`lint`·Vitest 76파일/1021개·`next build` 통과 후 `main` 병합(`fe5bf77`), 병합 후 `main`에서 `tsc`·`lint`·Vitest 76파일/1021개 재통과 확인함. 실브라우저(모바일 드로어·반응형) 확인 및 워크트리 정리는 사용자 선택 대기.
