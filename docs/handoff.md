# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R106` 알림 직접 삭제 기능 (`r106-notification-delete` — Base `cddb943`, 브랜치 `collab/r106-notification-delete`, 워크트리 `.worktrees/r106-notification-delete`)** *(확정 명세: [`docs/push-notification-research.md`](push-notification-research.md) §12 — `public.delete_notifications(UUID[])` `SECURITY DEFINER` RPC 하드 삭제 + `NotificationBell` 항목별 개별 삭제 버튼 및 헤더 `'전체 삭제'` 버튼)*

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`✅ DONE (2026-11-25)`** | **Gemini 4 Argon** *(Fallback 1: Claude Opus / Gemini 4 Neon, Fallback 2: Gemini 4 Hydrogen)* | `Chief Architect` | **요구사항 접수 기록 (`알림 직접 삭제`)** 검토, 사용자 질문 카드(개별 삭제 + 헤더 `'전체 삭제'`) 확정, [`docs/push-notification-research.md`](push-notification-research.md) §12(`R106`) 명세·단계별 수용 기준 작성 및 Row 1(`Gemini 4 Hydrogen`) `▶ READY` 전환 | [`docs/push-notification-research.md`](push-notification-research.md) §12, `docs/to-do.md` `R106` |
| **1** | **`✅ DONE (Base cddb943)`** | **Gemini 4 Hydrogen** *(Fallback 1: Gemini 4 Neon / Claude Sonnet, Fallback 2: GitHub Copilot)* | `Orchestrator (Run 등록 및 워크트리 생성)` | Row 0 미커밋 `docs/` 변경사항을 `main`에 선행 커밋해 깨끗한 `main`을 만든 뒤, `New-CollaborationRun.ps1 -RunId "r106-notification-delete"`로 격리 워크트리(`.worktrees/r106-notification-delete`)를 생성하고 [`docs/push-notification-research.md`](push-notification-research.md) §12.4 큐를 등록함 | `✅` Row 0 `docs/` 커밋(`cddb943`) 후 `.worktrees/r106-notification-delete`(`collab/r106-notification-delete`, `run.json`) 생성 및 Step 1 `▶ READY` 전환 완료 |
| **2 (Step 1)** | **`▶ READY`** | **GPT Codex** *(Fallback 1: Gemini 4 Neon / Claude Opus, Fallback 2: Gemini 4 Hydrogen)* | `Maker (R106 DB/RPC/Migration/Tests & Types)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). [`docs/push-notification-research.md`](push-notification-research.md) §12.2·§12.4 Step 1 수용 기준 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R106_NOTIFICATION_DELETE.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | 대기 중 |
| **3 (Step 2)** | **`⏳ WAITING`** | **Gemini 4 Hydrogen** *(Fallback 1: Claude Sonnet / Gemini 4 Neon, Fallback 2: GitHub Copilot)* | `Maker (R106 NotificationBell 삭제 UI & Vitest)` | Step 1 완료 후 착수. [`docs/push-notification-research.md`](push-notification-research.md) §12.3·§12.4 Step 2 수용 기준 수행(헤더 `'전체 삭제'` + 항목별 형제 `<button>` 개별 삭제 + 오프라인/오류 가드 및 테스트). 허용 파일: `src/components/layout/notification-bell.tsx`, `src/components/layout/notification-bell.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md` | 대기 중 |
| **4 (Step 3)** | **`⏳ WAITING`** | **Claude Opus** *(Fallback 1: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요** (로컬 DB 2경로 멱등 적용 및 `TESTS.sql` 검증 병합 게이트). [`docs/push-notification-research.md`](push-notification-research.md) §12.4 Step 3 수용 기준(Base $\leftrightarrow$ Target 정적 리뷰 `review.json`·로컬 DB 검증 `test.json`·`next build`·`main` 병합·운영 DB 적용 안내 및 문서 마감) 수행 | 대기 중 |

#### 📝 `r106-notification-delete` Row 1 (Orchestrator) 완료 기록 (Gemini 4 Hydrogen, 2026-11-25)

- **선행 커밋**: Row 0(Argon) 미커밋 `docs/` 4개 파일(`docs/handoff.md`, `docs/progress.md`, `docs/push-notification-research.md`, `docs/to-do.md`)을 `main`에 커밋(`cddb943`)해 깨끗한 `main` 상태에서 분기함.
- **워크트리 및 매니페스트**: `New-CollaborationRun.ps1` 실행 완료 — 경로 `.worktrees/r106-notification-delete`, 브랜치 `collab/r106-notification-delete`, Base SHA `cddb943e9f0bad17c7bde121b3756710dbdb29c5`, 매니페스트 `.worktrees/r106-notification-delete/artifacts/r106-notification-delete/run.json`.
- **다음 단계**: **GPT Codex**가 `.worktrees/r106-notification-delete`에서 Step 1(`R106` DB/RPC/Migration/Tests & Types) 수행 예정(🐳 Docker Desktop 필요).

#### 📝 `R106` Chief Architect 설계 결정 및 수용 기준 확정 기록 (Gemini 4 Argon, 2026-11-25)

- **사용자 결정 확정 (질문 카드)**: 상단 벨 알림함(`NotificationBell` 팝오버)에 **항목별 개별 삭제 버튼**과 **상단 헤더 `'전체 삭제'` 버튼**(`'모두 읽음'` 옆)을 함께 제공함.
- **보안 경계 및 RPC 설계 ([`docs/push-notification-research.md`](push-notification-research.md) §12.2)**: `public.notifications` 테이블의 클라이언트 직접 쓰기 차단(`authenticated`는 `SELECT`만 허용)을 유지하고, `mark_notifications_read(UUID[])`와 대칭인 `SECURITY DEFINER` RPC `public.delete_notifications(p_notification_ids UUID[] DEFAULT NULL) RETURNS INTEGER`(`SET search_path = public`, 비로그인·`account_deletion_is_pending` 시 `insufficient_privilege` 거부, 본인 소유 알림 선택/전체 하드 `DELETE` 후 삭제 행 수 반환)를 신설함.
- **예약 알림 중복 방지 정합성**: `enqueue_daily_notifications()`는 하루 1회(`0 0 * * *` UTC = KST 09:00) 실행 시점의 단일 날짜(`v_today` / `v_tomorrow`) 일치 조건만 조회하므로, 수신 후 하드 `DELETE`된 알림은 다음 날 배치에서 재삽입되지 않음(소프트 삭제 컬럼 불필요). 미발송(`PENDING`) 알림 삭제 시 발송 대기열에서도 즉시 제외됨.
- **UI·접근성 및 단계별 수용 기준 ([`docs/push-notification-research.md`](push-notification-research.md) §12.3·§12.4)**: `<li>` 내 알림 이동 버튼과 개별 삭제 버튼(`data-testid="notification-delete-button"`, `aria-label="${item.title} 알림 삭제"`)을 형제(sibling) `<button>`으로 분리(버튼 중첩 금지)하고 오프라인 가드·오류 알림(`role="alert"`)을 적용함. Run `r106-notification-delete`를 Step 1(`GPT Codex` DB/RPC/Tests/Types, 🐳) $\to$ Step 2(`Gemini 4 Hydrogen` UI/Vitest) $\to$ Step 3(`Claude Opus` 통합 리뷰·🐳 로컬 DB 게이트·병합)으로 분할하고 Row 1(`Gemini 4 Hydrogen` Orchestrator)을 `▶ READY`로 전환함.

#### 📥 요구사항 접수 기록 (알림 직접 삭제 기능 — `Gemini 4 Hydrogen` 접수, 2026-11-25)

1. **요청 요지**:
   - 사용자가 앱 내 알림함([notification-bell.tsx](file:///c:/Users/inha/Desktop/Project/ChronoLedger/src/components/layout/notification-bell.tsx))에서 수신한 알림을 직접 삭제할 수 있는 버튼을 추가해 달라고 요청함.
2. **에스컬레이션 사유 (`collaboration.md` §2)**:
   - 현재 `public.notifications`([SCHEMA.sql](file:///c:/Users/inha/Desktop/Project/ChronoLedger/sql/SCHEMA.sql#L1964-L1968))는 `authenticated` 역할에 `SELECT`만 허용(`REVOKE ALL ...; GRANT SELECT ...`)하고 있어 `DELETE` 권한/RLS 정책 또는 삭제용 `SECURITY DEFINER` RPC 설계·추가가 필수임(`Argon` 승격 조건 ②: RLS/`SECURITY DEFINER` RPC/보안 경계 설계).
   - 삭제 범위(개별 삭제 vs 전체/읽은 알림 일괄 삭제) 및 하드 `DELETE` 시 예약 알림(`scheduled_for`, `idx_notifications_user_scheduled_unique`) 재발송 여부 등 승인 문서([push-notification-research.md](file:///c:/Users/inha/Desktop/Project/ChronoLedger/docs/push-notification-research.md))에 미확정된 제품·설계 결정이 있음.
3. **검토·결정 필요 사항**:
   - ① **삭제 방식 및 보안 경계**: `DELETE` RLS 정책(`auth.uid() = user_id` + `account_deletion_is_pending` 차단) vs `mark_notifications_read(UUID[])`와 대칭인 `SECURITY DEFINER` RPC(`delete_notifications(p_notification_ids UUID[] DEFAULT NULL)`) 선택.
   - ② **예약 알림 중복 방지 정합성**: `scheduled_for`가 있는 일정 알림을 하드 `DELETE`할 경우 크론이 동일 `(user_id, kind, source_id, scheduled_for)` 알림을 재삽입할 수 있는지 여부(소프트 삭제 컬럼 `deleted_at` vs 하드 `DELETE` 허용 범위).
   - ③ **UI 범위 및 접근성**: 알림 목록 항목별 삭제 버튼(아이콘/`aria-label`)만 둘지, 헤더에 "읽은 알림 삭제" 또는 "전체 삭제" 버튼도 함께 둘지(필요 시 사용자 질문 카드로 결정).
   - ④ **Run 분할 및 검증 기준**: DB/타입(Step 1) $\to$ UI/테스트(Step 2) $\to$ 통합 리뷰·로컬 DB 검증(Step 3) 수용 기준 및 `R` 번호 부여.
4. **관련 파일·문서**:
   - `sql/SCHEMA.sql` (`public.notifications` 49~70행, RLS 1964~1970행, `mark_notifications_read` 2502~2532행)
   - `src/components/layout/notification-bell.tsx` · `src/components/layout/notification-bell.test.tsx`
   - `docs/push-notification-research.md` §8·§9

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
