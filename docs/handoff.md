# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R107-C` 템플릿별 자동 확정 (`r107c-auto-confirm` — Base `3a9e31319fbea82f3b1ab85a26f819e5d904d5af`, 브랜치 `collab/r107c-auto-confirm`, 워크트리 `.worktrees/r107c-auto-confirm`)** *(확정 명세: [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §5 — `auto_confirm`·`_process_expense_payment_core` 추출·`auto_confirm_due_expenses`·`INTERVAL_30` 환불 롤백 원자화·`EXPENSE_AUTO_CONFIRMED` 알림·구독 모달 토글. `R107A-REV-001·002` 포함)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R107C_AUTO_CONFIRM.sql`, `SCHEMA.sql`). 🐳 Docker Desktop 필요. 금전·원장·환불 변경이라 Step 1은 `Opus` 승격 조건 ①.
- **수용 기준**: 명세 §5.4(`C-1`~`C-12`). 명세 §9 미결 질문 6건은 기본값으로 진행(사용자 이견 시 중단 후 재확인).

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`▶ READY`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (R107-C SQL/RPC/Tests)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). 명세 §5.1·`C-1`~`C-10`, `R107A-REV-001·002`(`supabase gen types` 시 `p_original_target_date` `\| null` 보존, 환불 롤백의 비활성 템플릿 처리 명시). 허용 파일: 신규 `sql/migrations/MIGRATION_R107C_AUTO_CONFIRM.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | 대기 중 |
| **2** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R107-C 구독 모달·배지·환불 흐름 & Vitest)` | Step 1 완료 후 착수. 명세 §5.2·`C-11`. 허용 파일: 구독 모달·지출 목록/상세·환불 흐름 관련 `src/**`와 테스트(범위는 명세 §5.2), 루트 `docs/handoff.md`, `docs/progress.md` | `⏳ Step 1 완료 대기` |
| **3** | **`⏳ WAITING`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex — Maker인 Opus·Hydrogen 제외)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요**. 금전·원장·동시성·권한 통합 정적 리뷰(`review.json`), `test.json`(로컬 DB 2경로 2회 멱등·`TESTS.sql`·2세션 병렬·`tsc`·`lint`·Vitest·`next build`, `C-5`·`C-12`), `main` 병합 | `⏳ Step 2 완료 대기` |
| **4** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | Step 3 병합 후 착수. 문서 아카이브 마감 및 명세 §6 운영 적용 순서 안내 | `⏳ Step 3 완료 대기` |


### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A` 운영 적용 완료 · `R107-B` 운영 DB 적용 완료 | 정기·반복 지출 자동화: `R107-A` 운영 적용 완료(1주 관찰 후 `R107-A-CLEANUP`) → `R107-B` 결제 예정 알림 `main` 병합 `a84c6de`·운영 DB 적용 완료(앱 배포 필요) → `R107-C` 자동 확정 옵션(Run 3, `R107-B` 앱 배포 후 사용자 지목 시 등록). 명세 §9 미결 질문 6건은 기본값으로 진행 중 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `p4-followups-r108-r109` *(`R109-REV-001·002`·`R108-REV-001` P4 선택 후속 묶음)*

- **Run ID**: `p4-followups-r108-r109` **(완료, `main` 병합 `c52705c`, 문서 마감 2026-11-25)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Opus `High` *(Step 3 Reviewer & Orchestrator, Claude Sonnet 1순위 대체)*
- **Worktree 경로**: `.worktrees/p4-followups-r108-r109` (브랜치 `collab/p4-followups-r108-r109`, 매니페스트 `artifacts/p4-followups-r108-r109/run.json`, 미삭제·원격 미push)
- **Base SHA**: `9efde83f89003f10da4e52dd7c0d992720c19035` · **Target SHA**: `d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8` *(Step 1 `750331c`, 산출물 `86294dd`·`ccbf53a`, `main` 병합 `c52705c`)*
- **DB 변경**: 없음.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 750331c69c652c5eea82b1ed1b54c803f80ccd21)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R109-REV-001·002 관리자 일괄 이전 보완)` | `R109-REV-001`: `handleBulkMigrateGameAssets`의 `game_characters` 조회를 `.range()` 페이지네이션 또는 미이전 서버 필터로 보완(1,000행 초과 대응). `R109-REV-002`: `pendingAssetMigrationCount`가 선택 게임 밖 미이전 캐릭터도 반영하도록 보완. Vitest 추가, `tsc`·`lint`·Vitest 통과 후 커밋. 허용 파일: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅` 워크트리 커밋 `750331c69c652c5eea82b1ed1b54c803f80ccd21`(2파일). `.range()` 1,000행 페이지네이션·서버 `count` 배지 반영·Vitest 추가. `git diff --check`·`tsc`·`lint`·Vitest 78파일/1068개 통과 |
| **2** | **`✅ DONE (SHA: d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R108-REV-001 푸시 암호 테스트 결합 제거)` | `handleSendNotificationsRequest`에 salt·임시 키쌍·페이로드를 주입할 수 있게 해 `web-push-crypto.test.ts`의 전역 스파이(`crypto.getRandomValues`·`crypto.subtle.generateKey`·`JSON.stringify`) 제거. 동작 불변. 허용 파일: `supabase/functions/send-notifications/index.ts`, `src/lib/web-push-crypto.test.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅` 워크트리 커밋 `d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8`(2파일). `cryptoOverrides` 주입·전역 스파이 제거, `git diff --check`·`tsc`·`lint`·Vitest 78파일/1068개 통과 |
| **3** | **`✅ DONE (SHA: ccbf53a, main 병합 c52705c)`** | **Claude Sonnet (`Medium`)** *(실행: Claude Opus `High` 1순위 대체)* | `Reviewer & Orchestrator` | Base ↔ Target 정적 리뷰(`review.json`)·`test.json`(`tsc`·`lint`·Vitest·`build`)·`main` 병합·문서 마감 | ✅ 아래 Step 3 완료 기록 (`P4` 1건 비차단, `main` 병합 `c52705c`) |

#### 📝 `p4-followups-r108-r109` Step 3 (Reviewer & Orchestrator) 완료 기록 (Claude Opus `High` — Claude Sonnet 1순위 대체, 2026-11-25)

- **리뷰 범위**: Base `9efde83f89003f10da4e52dd7c0d992720c19035` ↔ Target `d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8`(조상 확인·Target 이후 `src`·`sql`·`supabase` 변경 0). 산출물 커밋 `86294dd`·`ccbf53a`(`review.json`·`test.json` 스키마 검증 통과, `run.json` `target_sha` 기록), `main` 병합 `c52705c`(no-ff).
- **정적 리뷰 (`findings`, P4 1건 비차단)**: `R109-REV-001` `.range()` 1,000행 페이지(이름·id 정렬, 짧은 페이지에서 종료, 갱신 전 전체 조회라 페이지 밀림 없음) 확인. `R109-REV-002` 서버 `count` 필터가 `game_characters` CHECK(`NULL`·`data:image/webp`·`https://`만 허용) 기준으로 `needsGameAssetMigration`과 일치함. `R108-REV-001` `cryptoOverrides`는 직접 호출에서만 쓰이고 `Deno.serve`는 요청만 넘기므로 운영 암호화(무작위 salt·구독별 새 ECDH 키·`buildSafePushPayload`) 불변.
- **`P4F-REV-001` (P4, 선택)**: 배지용 서버 미이전 캐릭터 수가 페이지 진입·일괄 이전 뒤에만 갱신되고 캐릭터 저장·삭제 뒤에는 갱신되지 않아, 같은 화면에서 미이전 캐릭터를 지우거나 아이콘을 바꾸면 새로고침 전까지 배지 숫자만 1 크게 보임. 일괄 이전 자체는 매번 전체를 다시 읽어 영향 없음 → `docs/to-do.md` `R109-REV-003`.
- **검증 (Target 기준 실행)**: `git diff --check`·`tsc --noEmit`·`next lint`·Vitest 78파일/1,068개·`next build`(더미 `NEXT_PUBLIC_SUPABASE_*`) 통과(Node v24.22.2). DB 변경 없음.
- **운영 반영**: `main` push로 웹 배포 필요. `send-notifications` Edge Function 원본도 바뀌었으나 운영 동작은 같아 재배포는 선택임. 원격 브랜치 `collab/p4-followups-r108-r109`: push 안 함.

#### 📝 `p4-followups-r108-r109` Step 2 (Maker) 완료 기록 (Gemini 4 Hydrogen `Medium`, 2026-11-25)

- **Target SHA**: `d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8` (`collab/p4-followups-r108-r109`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 2건)**:
  - `supabase/functions/send-notifications/index.ts`: `encryptWebPushPayload`·`handleSendNotificationsRequest`에 선택적 `cryptoOverrides`(`salt`, `ephemeralKeyPair`, `payloadText`) 옵션을 추가해 기본 동작 변경 없이 테스트 시 결정적 값 주입을 지원함.
  - `src/lib/web-push-crypto.test.ts`: RFC 8291 Appendix A 벡터 검증 테스트에서 전역 스파이(`crypto.getRandomValues`·`crypto.subtle.generateKey`·`JSON.stringify`)를 모두 제거하고 `cryptoOverrides` 직접 주입으로 대체함.
- **실행 검증 결과**: 워크트리 `git diff --check` 통과, `npx tsc --noEmit` 통과, `npm run lint` 경고·오류 0건, `npx vitest run --dir src` 78파일 1068개 전체 통과함.
- **남은 작업**: Step 3(**Claude Sonnet (`Medium`)**, Fallback: `Claude Opus (High)` / `Gemini 4 Carbon (High)`)가 Base `9efde83` ↔ Target `d7e5139` 정적 리뷰·`tsc`/`lint`/Vitest/`next build` 검증·`main` 병합·문서 마감 수행 예정임.

#### 📝 `p4-followups-r108-r109` Step 1 (Maker) 완료 기록 (Gemini 4 Hydrogen `Medium`, 2026-11-25)

- **Target SHA**: `750331c69c652c5eea82b1ed1b54c803f80ccd21` (`collab/p4-followups-r108-r109`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (워크트리 2건)**:
  - `src/app/admin/page.tsx`: `R109-REV-001` — `handleBulkMigrateGameAssets`에서 `game_characters`를 `.order("name").order("id").range(offset, offset + 999)` 1,000행 단위 루프로 조회하도록 보완함. `R109-REV-002` — `fetchPendingCharacterAssetCount()`(`head: true`, `count: "exact"`, `.not("default_icon_url", "is", null).not("default_icon_url", "like", "%/storage/v1/object/public/game-assets/%")`)를 추가해 `pendingAssetMigrationCount`가 선택 게임 밖·1,000행 초과 미이전 캐릭터까지 반영하도록 보완함(모의 빌더 호환 가드 포함).
  - `src/app/admin/page.test.tsx`: `createQueryBuilder`에 `not`/`range` 추가 및 1,001번째 캐릭터 2페이지 `.range()` 조회·배지 카운트 검증 테스트 1건 추가함.
- **실행 검증 결과**: 워크트리 `git diff --check` 통과, `npx tsc --noEmit` 통과, `npm run lint` 경고·오류 0건, `npx vitest run --dir src` 78파일 1068개 전체 통과함.
- **남은 작업**: Step 2(**Gemini 4 Hydrogen (`Medium`)**, Fallback: `Claude Sonnet (Medium)` / `GitHub Copilot`)가 `.worktrees/p4-followups-r108-r109`에서 `R108-REV-001`(`send-notifications/index.ts` 의존성 주입·`web-push-crypto.test.ts` 전역 스파이 제거) 수행 예정임.
