# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **없음** *(`r96-rev07-webhook-config` 병합 완료, 2026-11-24. 새 과제는 사용자가 지목하면 `Gemini 4 Hydrogen`이 접수·등록함)*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 1~3단계 배포 완료 / 4·5단계 사용자 적용 대기 | 운영 DB 마이그레이션 + 1~3단계(VAPID·Edge Function 배포·시크릿 4종) 완료(2026-11-24). `R96-REV-07` `main` 병합(`7445447`)으로 4단계는 운영 SQL Editor에서 `MIGRATION_R96_WEBHOOK_CONFIG.sql` 적용 + `SELECT public.set_push_webhook_config(...)` 등록으로 대체됨(사용자 대기). 5단계(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`)·실기기 수신 확인 대기 | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R101-REV-001` | `docs/to-do.md` 해당 항목 |

### 🗂️ 직전 완료 Run 기록: `r96-rev07-webhook-config`

- **Run ID**: `r96-rev07-webhook-config` **(완료, `main` 병합 `7445447`, 2026-11-24)** *(`R96-REV-07`: 호스팅 Supabase `ALTER DATABASE ... SET app.settings.*` `42501` 차단 대체 — 비공개 단일 행 `public.push_webhook_config` + `public.set_push_webhook_config` + 3단계 조회. 명세 [`docs/push-notification-research.md`](push-notification-research.md) §11.2.4·§11.5·§11.6)*
- **Chief Architect·Orchestrator**: Gemini 4 Argon(설계 확정 `91c7abd`) · Gemini 4 Hydrogen(등록) · Claude Opus(리뷰·병합)
- **Worktree 경로**: `.worktrees/r96-rev07-webhook-config` (브랜치: `collab/r96-rev07-webhook-config`, 매니페스트: `artifacts/r96-rev07-webhook-config/run.json`, 미삭제·원격 미push)
- **Base SHA**: `91c7abd7b4b95a7bb02f536d1571529b2743e017`
- **Target SHA**: `1514343279d78d19d18c9df5a2723a9b2cb73113` *(iteration-01 리뷰 clean, 산출물 `bf3d370`, `main` 병합 `7445447`)*
- **DB 변경**: 있음. 🐳 로컬 DB 업그레이드·신규 설치 경로 각 2회 멱등·`TESTS.sql` 44개 PASS. **운영 적용은 사용자 대기**.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **0** | **`✅ DONE (2026-11-24)`** | **Gemini 4 Argon** *(Fallback: Claude Opus / Gemini 4 Neon)* | `Chief Architect` | 비공개 단일 행 설정 테이블·SQL Editor 헬퍼·3단계 조회 설계 및 §11.6 수용 기준 확정(`91c7abd`) |
| **1** | **`✅ DONE (Base 91c7abd)`** | **Gemini 4 Hydrogen** *(Fallback: Gemini 4 Neon / Claude Sonnet)* | `Orchestrator` | `New-CollaborationRun.ps1`로 워크트리·`run.json` 생성 및 Step 2 `▶ READY` 전환 |
| **2** | **`✅ DONE (SHA: 1514343)`** | **~~GPT Codex~~ ➡️ Gemini 4 Neon** *(Fallback: Claude Opus / Gemini 4 Hydrogen)* | `Maker (DB/Migration/Tests)` | SQL 5파일. 🐳 로컬 2경로 멱등·`TESTS.sql` 44개 PASS·tsc·lint·Vitest 76파일/1021개 통과 |
| **3** | **`✅ DONE (산출물 bf3d370, main 병합 7445447)`** | **Claude Opus** *(Fallback: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | 정적 리뷰 **clean**(지적 0건). 🐳 로컬 2경로·`TESTS.sql` 44개 PASS·3단계 조회 스텁 검증·tsc·lint·Vitest·build 통과 후 `main` 병합 및 병합 후 검증 통과 |

#### 📝 `r96-rev07-webhook-config` Step 3 (Reviewer & Orchestrator) 완료 기록 (Claude Opus, 2026-11-24)

- **리뷰 범위·독립성**: Base `91c7abd7b4b95a7bb02f536d1571529b2743e017` ↔ Target `1514343279d78d19d18c9df5a2723a9b2cb73113`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Gemini 4 Neon)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`clean`, 지적 0건)**: §11.2.4·§11.6 수용 기준과 일치함. 신규 마이그레이션·`MIGRATION_R96_WEB_PUSH.sql`·`SCHEMA.sql`의 `set_push_webhook_config`·`invoke_send_notifications_webhook` 본문 3벌 동일(103행 비교), 테이블 CHECK 3종·RLS 무정책·`service_role` 포함 `REVOKE ALL`, `invoke_send_notifications_webhook` 권한(`PUBLIC, anon, authenticated` 회수)은 Base와 동일 유지 확인함. `database.types.ts` 미수정은 PostgREST 비노출 대상이라 타당함.
- **🐳 로컬 DB 병합 게이트**: ① 업그레이드 경로(`db reset` → Base `SCHEMA.sql` → 신규 마이그레이션 2회 멱등 → README 확인 쿼리 3종 기대값 일치 → `TESTS.sql` 44개 PASS·ROLLBACK), ② 신규 설치 경로(`db reset` → Target `SCHEMA.sql` 1회(재실행 불가 기준선) → `WEB_PUSH` 2회 → `WEBHOOK_CONFIG` 2회 → `R102` 1회 → 확인 쿼리 → `TESTS.sql` 44개 PASS·ROLLBACK) 모두 통과함.
- **3단계 조회 실동작**: 로컬 `pg_net` 미설치라 ROLLBACK 트랜잭션 안에서 `net.http_post` 스텁으로 인자 캡처함 — 미설정 시 미호출, GUC 단독, 테이블 우선(GUC 무시), 테이블 URL + `secret = NULL` 시 Vault 시크릿 보충 모두 기대대로 동작함.
- **산출물·검증**: `artifacts/r96-rev07-webhook-config/iteration-01/review.json`(clean)·`test.json`(passed), `run.json` `target_sha` 기록 후 워크트리 커밋 `bf3d370`. 이 PC Python에 `jsonschema` 미설치로 공식 검증 스크립트 실행 불가 → `node_modules/ajv`(6.15.0)로 3개 파일 스키마 검증 통과(공식 스크립트 재검증 필요). 워크트리 `tsc`·`lint`·Vitest 76파일/1021개·`next build`(더미 공개 env, 16페이지) 통과.
- **병합**: `main`에 Step 2 문서 기록 커밋(`0a41f35`) 후 `--no-ff` 병합 `7445447`. 병합 후 `main`에서 `sql`·`src`가 Target과 동일함 확인, `tsc`·`lint`·Vitest 76파일/1021개 재통과함. 원격 push·워크트리 삭제 안 함.
- **남은 작업 (사용자, 운영)**: Supabase SQL Editor에서 `MIGRATION_R96_WEBHOOK_CONFIG.sql` 실행 → README B표 확인 쿼리 3종 → `SELECT public.set_push_webhook_config('https://<project-ref>.supabase.co/functions/v1/send-notifications', '<SEND_NOTIFICATIONS_WEBHOOK_SECRET과 동일 값>');` → §11.5 설정 확인 쿼리(`has_table_secret = true`) → `pg_net` 활성 확인 → 5단계 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 반영·재빌드 → 실기기 수신 확인.

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
