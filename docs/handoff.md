# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **과제 구분**: 협업 규칙 개정 — 11월 30일 서비스 종료 예정인 `Gemini 4 Argon` $\to$ `Gemini 4 Carbon` 인계 및 `Gemini 3.8 Flash` 대체 모델·서브에이전트 위임 규칙 정비 (`collaboration.md` §1~§3 및 관련 스킬/에이전트 문서)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`📐 SPEC_NEEDED`** | **Gemini 4 Argon** *(Fallback: Claude Opus / Gemini 4 Neon)* | `Chief Architect (협업 규칙·스킬 개정 설계 및 반영)` | 아래 **요구사항 접수 기록**을 바탕으로 `Argon` $\to$ `Carbon` 인계 원칙(역할·주간 할당량 보호·`No Direct src/**` 경계·`/swarm` 사용 제한 여부) 및 `Flash` 대체 모델(`Model: "flash"` 서브에이전트 위임 경로 포함)을 확정·반영함. 허용 파일: `.agents/rules/collaboration.md`, `.agents/skills/*` (`Sync-Skills.ps1`로 `.claude/skills/` 동기화), `.github/copilot-instructions.md`, `docs/handoff.md`, `docs/progress.md` | `📐 구체화 대기 (2026-11-25 접수)` |
| **2** | **`⏳ WAITING`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet)* | `Orchestrator / Sync Check` | Step 1 완료 후 `Sync-Skills.ps1 -Check`, 남아 있는 `Argon`/`Flash` 구참조 전수 확인 및 후속 안내 | `⏳ Step 1 완료 대기` |

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

### 🗂️ 직전 완료 Run 기록: `r106-notification-delete`

- **Run ID**: `r106-notification-delete` **(완료, `main` 병합 `0ddc229`, 2026-11-25)** *(`R106` 알림 직접 삭제: `public.delete_notifications(UUID[])` `SECURITY DEFINER` RPC 하드 삭제 + `NotificationBell` 항목별 삭제·헤더 `'전체 삭제'` 버튼. 명세 [`docs/push-notification-research.md`](push-notification-research.md) §12)*
- **Chief Architect·Orchestrator**: Gemini 4 Argon(설계 확정 `cddb943`) · Gemini 4 Hydrogen(등록) · Claude Opus(리뷰·병합)
- **Worktree 경로**: `.worktrees/r106-notification-delete` (브랜치: `collab/r106-notification-delete`, 매니페스트: `artifacts/r106-notification-delete/run.json`, 미삭제·원격 미push)
- **Base SHA**: `cddb943e9f0bad17c7bde121b3756710dbdb29c5`
- **Target SHA**: `61a4b17cb3e37cb5a7c310c85b23756c018cbfd8` *(iteration-01 리뷰 P4 2건 비차단, 산출물 `34a99bf`, `main` 병합 `0ddc229`)*
- **DB 변경**: 있음. 🐳 로컬 DB 업그레이드·신규 설치 경로 각 2회 멱등·`TESTS.sql` 45개 PASS. 운영 DB 적용·확인 쿼리·실배포 확인 완료(사용자, 2026-11-25).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **0** | **`✅ DONE (2026-11-25)`** | **Gemini 4 Argon** *(Fallback: Claude Opus / Gemini 4 Neon)* | `Chief Architect` | 질문 카드(개별 삭제 + `'전체 삭제'`) 확정, §12 명세·수용 기준 확정(`cddb943`) |
| **1** | **`✅ DONE (Base cddb943)`** | **Gemini 4 Hydrogen** *(Fallback: Gemini 4 Neon / Claude Sonnet)* | `Orchestrator` | 워크트리·`run.json` 생성 및 Step 1 `▶ READY` 전환 |
| **2 (Step 1)** | **`✅ DONE (SHA: 7fe58d2)`** | **~~GPT Codex~~ ➡️ Gemini 4 Neon** *(Fallback: Claude Opus / Gemini 4 Hydrogen)* | `Maker (DB/RPC/Tests & Types)` | RPC·마이그레이션·`SCHEMA.sql`·README·`TESTS.sql`·타입. 🐳 로컬 2경로·`TESTS.sql` 45개 PASS |
| **3 (Step 2)** | **`✅ DONE (SHA: 61a4b17)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet / Gemini 4 Neon)* | `Maker (NotificationBell UI & Vitest)` | 개별·전체 삭제 버튼, 오프라인·오류 처리, 테스트 4건. Vitest 76파일/1026개 통과 |
| **4 (Step 3)** | **`✅ DONE (산출물 34a99bf, main 병합 0ddc229)`** | **Claude Opus** *(Fallback: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | 정적 리뷰 P4 2건(비차단). 🐳 로컬 2경로·`TESTS.sql` 45개 PASS·tsc·lint·Vitest·build 통과 후 `main` 병합 및 병합 후 검증 통과 |

#### 📝 `r106-notification-delete` Step 3 (Reviewer & Orchestrator) 완료 기록 (Claude Opus, 2026-11-25)

- **리뷰 범위·독립성**: Base `cddb943e9f0bad17c7bde121b3756710dbdb29c5` ↔ Target `61a4b17cb3e37cb5a7c310c85b23756c018cbfd8`. 범위 검사(`merge-base --is-ancestor`·`Target..HEAD`의 `src`·`sql` 변경 0건) 통과, Maker(Gemini 4 Neon·Hydrogen)와 다른 모델로 독립 리뷰함.
- **정적 리뷰 (`findings`, P4 2건 비차단)**: §12.2~§12.4 수용 기준 모두 충족함(RPC 권한·`insufficient_privilege` 차단·테이블 직접 `DELETE` 미부여, 형제 `<button>` 분리·`aria-label`·오프라인/오류 `role="alert"`). ① `R106-REV-001`: `'전체 삭제'`가 확인 없이 화면에 보이지 않는 30개 초과·로드 후 도착 알림까지 하드 삭제함(명세대로, 제품 후속 판단). ② `R106-REV-002`: 워커 점유 중 알림이 삭제되면 `complete_push_notification_delivery`가 `no_data_found`로 실패해 그 1회의 만료 구독 정리가 건너뛰어짐(Edge Function은 로그만 남기고 다음 발송에서 자연 복구).
- **🐳 로컬 DB 병합 게이트**: ① 업그레이드 경로(`db reset` → Base `SCHEMA.sql` → 신규 마이그레이션 2회 멱등 → 확인 쿼리 `delete_notifications, t` / `f, t, f` → `TESTS.sql` 45개 PASS·ROLLBACK), ② 신규 설치 경로(`db reset` → Target `SCHEMA.sql` 1회 → 마이그레이션 2회 → 확인 쿼리 → `TESTS.sql` 45개 PASS·ROLLBACK) 모두 통과함.
- **산출물·검증**: `artifacts/r106-notification-delete/iteration-01/review.json`·`test.json`, `run.json` `target_sha` 기록 후 워크트리 커밋 `34a99bf`. `jsonschema` 미설치로 `node_modules/ajv`(6.15.0) 대체 검증 통과(공식 스크립트 재검증 필요). 워크트리 `tsc`·`lint`·Vitest 76파일/1026개·`next build`(더미 공개 env) 통과.
- **병합**: `main`에 `--no-ff` 병합 `0ddc229`. 병합 후 `sql`·`src`가 Target과 동일함 확인, `tsc`·`lint`·Vitest 76파일/1026개 재통과함. 원격 push·워크트리 삭제 안 함.
- **운영 적용 (사용자 완료, 2026-11-25)**: 아래 절차대로 적용·확인 쿼리 검증·실배포 확인 완료함. Supabase SQL Editor에서 `sql/migrations/MIGRATION_R106_NOTIFICATION_DELETE.sql` 실행 → README B표 확인 쿼리 2종(`delete_notifications, true` / `false, true, false`) → 웹 재배포 후 알림함 개별·전체 삭제 실브라우저 확인. 마이그레이션 적용 전에 배포하면 삭제 버튼이 오류 안내만 표시함.

#### 📝 `r106-notification-delete` Step 2 (Maker) 완료 기록 (Gemini 4 Hydrogen, 2026-11-25)

- **Target SHA**: `61a4b17cb3e37cb5a7c310c85b23756c018cbfd8` (`collab/r106-notification-delete`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 2건)**:
  - `src/components/layout/notification-bell.tsx`: 팝오버 헤더 `'모두 읽음'` 옆에 `'전체 삭제'` 버튼(`items.length === 0` 비활성화)을 추가하고, `<li>` 내 알림 선택 버튼(`data-testid="notification-item"`)과 형제 `<button>`으로 개별 삭제 버튼(`data-testid="notification-delete-button"`, `aria-label="${item.title} 알림 삭제"`)을 분리함. `deleteNotifications(ids)`에서 `isOffline()` 차단·`supabase.rpc("delete_notifications", { p_notification_ids: ids })` 호출·오류 시 `role="alert"` 표시 및 목록 보존 처리함.
  - `src/components/layout/notification-bell.test.tsx`: 개별 삭제(미읽음 배지 감소·라우터/읽음 RPC 미호출), `'전체 삭제'`(빈 상태 전환·버튼 비활성화), RPC 실패 시 목록 보존·경고 표시, 오프라인 삭제 차단 테스트 4건 추가함.
- **실행 검증 결과**: 워크트리 `git diff --check` 통과, `npx tsc --noEmit` 통과, `npm run lint` 경고·오류 0건, `npx vitest run --dir src` 76파일 1026개 전체 통과함.
- **남은 작업**: Step 3(**Claude Opus**, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon`)이 Base `cddb943` ↔ Target `61a4b17` 통합 정적 리뷰·🐳 로컬 DB 검증·`next build`·`main` 병합·문서 마감 수행 예정임.

#### 📝 `r106-notification-delete` Step 1 (Maker) 완료 기록 (Gemini 4 Neon, GPT Codex 1순위 대체, 2026-11-25)

- **Target SHA**: `7fe58d2461b2f4bec4c14e260f53f96f527e148d` (`collab/r106-notification-delete`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 5건)**:
  - 신규 `sql/migrations/MIGRATION_R106_NOTIFICATION_DELETE.sql` · `sql/SCHEMA.sql`: `public.delete_notifications(p_notification_ids UUID[] DEFAULT NULL) RETURNS INTEGER`(`SECURITY DEFINER SET search_path = public`, `REVOKE ALL FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`, 비로그인·`account_deletion_is_pending` 시 `insufficient_privilege` 거부, 본인 알림 선택/전체 하드 `DELETE` 후 삭제 행 수 반환) 추가함. `public.notifications` 테이블의 `authenticated` 직접 `DELETE` 권한은 미부여 유지함.
  - `sql/README.md`: B표에 `MIGRATION_R106_NOTIFICATION_DELETE.sql` 행과 확인 쿼리(`delete_notifications, true` / `anon_exec=false, auth_exec=true, auth_tbl_del=false`) 추가함.
  - `sql/tests/TESTS.sql`: 헤더 표 및 `R106-01`~`R106-04` 스모크 블록(직접 `DELETE` 거부, 빈 배열 0건, 타인 ID 혼입 선택 삭제 시 타인 보존, 전체 삭제(`NULL`) 및 재호출 0건, 타인 보존 검증, 계정 삭제 대기 사용자 A 거부, `anon` 거부) 추가함.
  - `src/types/database.types.ts`: `public.Functions`에 `delete_notifications` (`Args: { "p_notification_ids"?: string[] | null }; Returns: number`) 추가함.
- **실행 검증 결과**:
  - 🐳 로컬 Supabase 업그레이드 경로(`MIGRATION_R106_NOTIFICATION_DELETE.sql` 2회 멱등 → 확인 쿼리 2종 `delete_notifications, t` / `f, t, f` → `TESTS.sql` 45개 PASS·ROLLBACK) 통과함.
  - 🐳 로컬 Supabase 신규 설치 경로(`public` 스키마 리셋 → `SCHEMA.sql` 1회 → `MIGRATION_R106_NOTIFICATION_DELETE.sql` 2회 멱등 → `TESTS.sql` 45개 PASS·ROLLBACK) 통과함.
  - 워크트리 `git diff --check` 통과, `npx.cmd tsc --noEmit` 통과, `npm.cmd run lint` 경고·오류 0건, `npx.cmd vitest run --dir src` 76파일 1022개 전체 통과함.
- **남은 작업**: Step 2(**Gemini 4 Hydrogen**, Fallback 1: `Claude Sonnet` / `Gemini 4 Neon`, Fallback 2: `GitHub Copilot`)가 `.worktrees/r106-notification-delete`에서 `NotificationBell` 삭제 UI 및 Vitest 테스트 구현 예정임.

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
