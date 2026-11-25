# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(직전 `t1-t4-desktop-and-followups`는 2026-11-25 `main` 병합 `5e63007`·문서 마감 완료, 미push)*
- **다음 후보 (사용자 지목 시 등록)**: `T4` 후속(Rust 툴체인 PC에서 `cargo check`·`tauri build`·`Cargo.lock` 커밋) · `R107-C` Run 3 `r107c-auto-confirm`(`R107-B` 앱 배포 후)

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

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
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R108-REV-001` (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **`main` 병합 완료 (`5e63007`) · 운영 DB 적용·Redirect URL 등록 완료 · 실기기 확인 대기** | Windows Tauri 데스크톱 통합(PKCE 단일화·auth adapter, `chronoledger://` + `single-instance`, 로그아웃 `/auth` 복귀) + `R101-REV-001` + `R106-REV-001·002` 완료. 남음: `main` push(사용자), Rust PC `cargo check`·`tauri build`·`Cargo.lock`·실기기 OAuth 확인(`T4`) | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4, 아래 직전 완료 Run 기록 |

### 🗂️ 직전 완료 Run 기록: `t1-t4-desktop-and-followups` *(`T1`~`T4` 데스크톱 PKCE·딥링크·`single-instance` + `R101-REV-001`·`R106-REV-001·002`)*

- **Run ID**: `t1-t4-desktop-and-followups` **(완료, `main` 병합 `5e63007`, 문서 마감 2026-11-25)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Opus `High` *(Step 3 리뷰·병합·마감)*
- **Worktree 경로**: `.worktrees/t1-t4-desktop-and-followups` (브랜치 `collab/t1-t4-desktop-and-followups`, 매니페스트 `artifacts/t1-t4-desktop-and-followups/run.json`, 미삭제·원격 미push)
- **Base SHA**: `64c431752a972f5af4925653e710ac4126c8f28b` · **Target SHA**: `277dbdce667837700bdf5c64fd7d5c0ef805713a` *(산출물 `b3467ba`, `main` 병합 `5e63007`)*
- **명세·결정**: [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §1(`D1`~`D5`)~§4. 명세 확정·요구사항 접수 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`, `SCHEMA.sql`). **운영 DB 적용 및 확인 쿼리 검증 완료(사용자, 2026-11-25)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`✅ DONE (SHA: 64c4317, 2026-11-25)`** *(원 상태 `📐 SPEC_NEEDED`)* | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: Claude Opus (`High`) / Gemini 4 Neon (`High`))* | `Chief Architect (T1~T4 인증·딥링크 명세 및 선택 후속 정책 확정)` | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) 명세·사용자 질문 카드(`D1`~`D5`)·Step 1~3 수용 기준 확정(`src/**`·`sql/**` 미수정) | ✅ `64c4317` 명세 작성 및 Row 2 `▶ READY` 반환 |
| **1** | **`✅ DONE (Base 64c4317)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (t1-t4-desktop-and-followups Run 등록)` | `New-CollaborationRun.ps1 -RunId "t1-t4-desktop-and-followups"`로 격리 워크트리 생성 및 Step 1~3 큐 등록 | `✅` `.worktrees/t1-t4-desktop-and-followups`(`collab/t1-t4-desktop-and-followups`, `run.json`) 생성 및 Step 1 `▶ READY` 전환 |
| **2 (Step 1)** | **`✅ DONE (SHA: 57acd67b0bbf625ee2df5801628d7b3f93aba84e)`** | **~~GPT Codex~~ ➡️ Gemini 4 Neon (`High`)** *(Fallback 1 대체 실행; Fallback 1: Claude Opus (`High`))* | `Maker (SQL & 도메인 계산)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). 명세 §2.4(`R101-REV-001`) + §2.6(`R106-REV-002`) 및 §3 Step 1 수용 기준 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/lib/budget-calculations.ts`·`.test.ts`, `src/app/dashboard/expenses/page.tsx`·`.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅` 워크트리 커밋 `57acd67b0bbf625ee2df5801628d7b3f93aba84e`(8파일). 🐳 로컬 2경로 2회 멱등·확인 쿼리·`TESTS.sql` 49개 PASS·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1039개 통과 |
| **3 (Step 2)** | **`✅ DONE (SHA: 277dbdce667837700bdf5c64fd7d5c0ef805713a)`** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Opus (`High` — 도구에서 High 선택), Fallback 2: GitHub Copilot)* | `Maker (T1~T4 Auth·Tauri·알림 UI & 빌드)` | Step 1 완료 후 착수. 명세 §2.1~§2.3(`T1`~`T4`) + §2.5(`R106-REV-001`) 및 §3 Step 2 수용 기준 수행(허용 파일 목록은 명세 §3 표 참고) | `✅` 워크트리 커밋 `277dbdce667837700bdf5c64fd7d5c0ef805713a`(19파일). `git diff --check`·`tsc`·`lint`·Vitest 77파일/1050개·`next build`(16페이지) 통과. ⚠️ 현 PC Rust 미설치로 `cargo check`·`tauri build`·`Cargo.lock` 갱신 미실행 |
| **4 (Step 3)** | **`✅ DONE (SHA: b3467ba, 병합 5e63007)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Carbon (`High` — 도구에서 High 선택))* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요** (로컬 DB 2경로 멱등 적용 및 `TESTS.sql` 검증 병합 게이트). 명세 §3 Step 3 통합 정적 리뷰(`review.json`)·`test.json`·`cargo check`·`next build`·`main` 병합·문서 마감 | `✅` 정적 리뷰 P4 3건 비차단·🐳 로컬 DB 2경로 게이트·`tsc`·`lint`·Vitest 1,050개·`next build` 통과, `cargo check`·`tauri build` 미실행(Rust 없음), `main` 병합 `5e63007` |

#### 📝 `t1-t4-desktop-and-followups` Step 3 (Reviewer & Orchestrator) 완료 기록 (Claude Opus `High`, 2026-11-25)

- **리뷰 범위**: Base `64c431752a972f5af4925653e710ac4126c8f28b` ↔ Target `277dbdce667837700bdf5c64fd7d5c0ef805713a`(범위 검사 통과: Target이 워크트리 `HEAD` 조상, `src`·`sql` 차이 없음). 산출물 커밋 `b3467ba`(`run.json` `target_sha` 기록 + `iteration-01/review.json`·`test.json`, 스키마 검증 통과), `main` 병합 `5e63007`(`--no-ff`, 미push).
- **정적 리뷰 (`review.json` `findings`, P4 3건 비차단)**: 명세 §2.1~§2.6과 일치함(PKCE 단일화·해시/`setSession` 제거, 외부 인증 URL `https:`·동일 Supabase origin 검증, `code` 중복 교환 캐시, `getCurrent` 프로세스당 1회 + `onOpenUrl` cleanup, `single-instance`를 `deep-link`보다 먼저 등록, 로그아웃 `/auth` 복귀, `CANCELLED` 당월 회차 `coveredTemplateIds` 포함, 알림 `[전체 삭제]` 인라인 확인, SQL `NOT FOUND` 조용한 반환·권한 불변).
  - `T1T4-REV-001`: `Cargo.lock`에 `tauri-plugin-single-instance` 미반영, Rust 컴파일 미검증(Step 2·3 PC 모두 Rust 미설치).
  - `T1T4-REV-002`: npm `@tauri-apps/plugin-deep-link` 2.0.0 ↔ 크레이트 2.6.1 버전 차이(기존 상태). `tauri build`에서 버전 불일치 검사에 걸리면 npm 패키지 맞춤 필요.
  - `T1T4-REV-003`: 데스크톱에서 SW 등록은 건너뛰나 예전 데스크톱 빌드가 등록한 SW 해제는 없음(배포된 데스크톱 빌드가 없으면 영향 없음, 선택).
- **실행 검증 (`test.json` `passed`)**: `git diff --check`·`tsc`·`lint`·Vitest 77파일/1,050개·`next build`(더미 공개 env, 16페이지) 통과. 🐳 로컬 업그레이드 경로(Base `SCHEMA.sql` 적용 시 `quiet_on_missing=f` → 마이그레이션 2회 → `t`/`auth_exec=f`/`anon_exec=f`/`sr_exec=t` → `TESTS.sql` 49개 PASS·ROLLBACK)·신규 설치 경로(Target `SCHEMA.sql` → 마이그레이션 2회 → 확인 쿼리 → `TESTS.sql` 49개 PASS) 통과, `SCHEMA.sql`·마이그레이션 함수 본문 동일 확인. 병합 후 `main` `tsc` 재통과.
- **미실행 (`skipped`)**: `cargo check`·`npm run tauri build`(이 PC에 Rust 툴체인 없음).
- **운영 반영 (사용자, 2026-11-25)**: ① 마이그레이션 운영 적용·확인 쿼리 검증 완료, ③ Supabase Redirect URLs에 `chronoledger://auth/callback` 등록 완료. ②·④는 남음.
- **남은 일 (사용자)**: ① 운영 DB에 `MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 적용 후 `sql/README.md` 확인 쿼리(`true, false, true`) 확인, ② `main` push 배포(웹은 기존 PKCE 그대로라 영향 없음), ③ Supabase Redirect URLs에 `chronoledger://auth/callback` 등록, ④ Rust PC에서 `cargo check`·`tauri build` 후 `Cargo.lock` 커밋 및 Windows 실기기 OAuth 왕복·취소·로그아웃 확인(명세 §4). ③ 전에는 데스크톱 Google 로그인이 실패함.

#### 📝 `t1-t4-desktop-and-followups` Step 2 (Maker) 완료 기록 (Gemini 4 Neon `High`, 2026-11-25)

- **Target SHA**: `277dbdce667837700bdf5c64fd7d5c0ef805713a` (`collab/t1-t4-desktop-and-followups`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 19건)**:
  - `T1` PKCE 단일화·Auth Adapter: `src/lib/supabase/client.ts`·`.test.ts`(웹·Tauri 모두 `flowType: 'pkce'`), 신규 `src/lib/auth-adapter.ts`·`.test.ts`(`isDesktopRuntime`, `getOAuthRedirectUrl`, `startGoogleOAuth` 동일 Supabase `https:` origin 검증, `isOAuthCallbackUrl`, `completeOAuthCallbackUrl` 해시/`setSession` 배제·`access_denied` 매핑·최대 10개 `code` 중복 교환 캐시), `src/app/auth/page.tsx`·`.test.tsx`(`startGoogleOAuth`·`oauthError` 쿼리·`chronoledger:oauth-callback-error` 배너), `src/app/auth/callback/page.tsx`·`.test.tsx`(`completeOAuthCallbackUrl`), `src/components/pwa/service-worker-register.tsx`·`.test.tsx`(데스크톱 SW 등록 스킵·로그아웃 캐시 삭제 유지).
  - `T2`·`T3` 딥링크·단일 인스턴스·로그아웃 복귀: `src/lib/tauri-auth.ts`(`getCurrent` 프로세스당 최초 1회 + `onOpenUrl` + cleanup, 해시/`setSession` 제거), `src/lib/auth-context.tsx`·`.test.tsx`(`routerRef` 안정화·딥링크 성공/오류 라우팅 및 cleanup·만료 `getSession()` 오류 시 세션 정리), `src/app/dashboard/layout.tsx` & `src/lib/push-notifications.test.ts`(로그아웃 성공 시 `router.replace('/auth')`), `src-tauri/Cargo.toml`(`tauri-plugin-single-instance = { version = "2.0.0", features = ["deep-link"] }`) · `src-tauri/src/lib.rs`(`single-instance`를 `deep-link`보다 먼저 등록·`"main"` 창 전면화·Windows/Linux `app.deep_link().register_all()` 비패닉 처리).
  - `R106-REV-001`: `src/components/layout/notification-bell.tsx`·`.test.tsx`(헤더 `[전체 삭제]` 인라인 2단계 확인 `[삭제 확인]`/`[취소]`, 팝오버 닫힘·재토글·항목 0건·개별 삭제·모두 읽음 시 확인 상태 초기화).
- **실행 검증 결과**:
  - 통과: 워크트리 `git diff --check`, `npx.cmd tsc --noEmit`, `npm.cmd run lint`(경고·오류 0건), `npx.cmd vitest run --dir src`(77파일 1050개 전체 통과), `npm.cmd run build`(더미 공개 env, 정적 16페이지 `out/` 생성 확인).
  - ⚠️ **미실행 (`Rust/Cargo` 미설치 환경)**: 현 PC에 `cargo`/`rustc`가 없어 `cargo check`, `npm.cmd run tauri build`, `src-tauri/Cargo.lock` 갱신은 실행하지 못함(Rust 툴체인 설치 PC에서 확인 필요).
- **남은 작업**: Step 3(**Claude Opus (`High` — 도구에서 High 선택)**, Fallback: `Gemini 4 Carbon (High — 도구에서 High 선택)`)가 Base `64c431752a972f5af4925653e710ac4126c8f28b` ↔ Target `277dbdce667837700bdf5c64fd7d5c0ef805713a` 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2경로 게이트·`cargo check`(Rust 환경 시)·`next build`(`test.json`)·`main` 병합·문서 마감 수행 예정임.

#### 📝 `t1-t4-desktop-and-followups` Step 1 (Maker) 완료 기록 (Gemini 4 Neon `High`, GPT Codex 1순위 대체, 2026-11-25)

- **Target SHA**: `57acd67b0bbf625ee2df5801628d7b3f93aba84e` (`collab/t1-t4-desktop-and-followups`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 8건)**:
  - `R106-REV-002` (SQL 4건): 신규 `sql/migrations/MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 및 `sql/SCHEMA.sql`에 `complete_push_notification_delivery` `NOT FOUND` 조용한 반환(만료 구독 삭제 + 남은 구독 0건 사용자 `push_enabled=false` 동기화 + 성공 구독 `last_success_at` 갱신, 시그니처·`service_role` 권한 불변) 반영함. `sql/README.md` B표 확인 쿼리·재실행 안내 및 `sql/tests/TESTS.sql` `R96-02` 삭제 알림 ID 스모크 단언 추가함.
  - `R101-REV-001` (TS 4건): `src/lib/budget-calculations.ts`(`BudgetComparisonExpense.billing_cycle` 추가, `CANCELLED` 행의 `billing_cycle` 우선·귀속월 폴백으로 `coveredTemplateIds` 포함, 금액은 0원 유지), `src/app/dashboard/expenses/page.tsx`(`EXPENSE_COLUMNS`·`ExpenseRow`에 `billing_cycle` 추가), `src/lib/budget-calculations.test.ts`·`src/app/dashboard/expenses/page.test.tsx`(당월 취소·조기 환불 제외 및 익월 유지 테스트) 반영함.
- **실행 검증 결과**:
  - 🐳 로컬 Supabase 업그레이드 경로(`MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 2회 멱등 → 확인 쿼리 `quiet_on_missing=t, auth_exec=f, sr_exec=t` → `TESTS.sql` 49개 PASS·ROLLBACK) 통과함.
  - 🐳 로컬 Supabase 신규 설치 경로(`public` 스키마 리셋 → `SCHEMA.sql` 1회 → `MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 2회 멱등 → 확인 쿼리 → `TESTS.sql` 49개 PASS·ROLLBACK) 통과함.
  - 워크트리 `git diff --check` 통과, `npx.cmd tsc --noEmit` 통과, `npm.cmd run lint` 경고·오류 0건, `npx.cmd vitest run --dir src` 76파일 1039개 전체 통과함.
- **남은 작업**: Step 2(**Gemini 4 Neon (`High` — 도구에서 High 선택)**, Fallback 1: `Claude Opus (High)` / Fallback 2: `GitHub Copilot`)가 `.worktrees/t1-t4-desktop-and-followups`에서 `T1`~`T4`(PKCE Auth Adapter·Tauri `single-instance`/`deep-link`·로그아웃 `/auth` 복귀·빌드) 및 `R106-REV-001`(알림함 `[전체 삭제]` 인라인 2단계 확인) 구현 예정임.
