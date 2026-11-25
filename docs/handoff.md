# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run 없음** *(직전 Run `r107c-auto-confirm`은 `main` 병합 `9268bf0`로 마감함. 다음 후보는 사용자 지목 시 등록: `R107C-REV-001·002`·`R109-REV-003`(P4 선택), `R107-A-CLEANUP`·`R109-CLEANUP`(관찰 후))*

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`), 운영 DB 적용 대기** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·배포는 사용자 수행(아래 「직전 완료 Run 기록」 참조). 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `r107c-auto-confirm` *(`R107-C` 템플릿별 자동 확정·`INTERVAL_30` 환불 롤백 원자화·`R107A-REV-001·002`)*

- **Run ID**: `r107c-auto-confirm` **(완료, `main` 병합 `9268bf0`, 문서 마감 2026-11-26)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Sonnet `Medium` *(Step 4 마감 대체 실행)*
- **Worktree 경로**: `.worktrees/r107c-auto-confirm` (브랜치 `collab/r107c-auto-confirm`, 매니페스트 `artifacts/r107c-auto-confirm/run.json`, 미삭제·원격 미push)
- **Base SHA**: `3a9e31319fbea82f3b1ab85a26f819e5d904d5af` · **Target SHA**: `451ab5e4292534fc0f5165fceb4bf9875af06a8b` *(Step 1 `1094f84`, 산출물 `f8d9aed`, `main` 병합 `9268bf0`)*
- **명세**: [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §5~§6. Step 1~3 상세 완료 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R107C_AUTO_CONFIRM.sql`, `SCHEMA.sql`). **운영 DB 미적용(사용자 수동 적용 필요)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 1094f84cb2324dc10ca78b9e62c567a2e2233dba)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (R107-C SQL/RPC/Tests)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). 명세 §5.1·`C-1`~`C-10`, `R107A-REV-001·002`(`supabase gen types` 시 `p_original_target_date` `\| null` 보존, 환불 롤백의 비활성 템플릿 처리 명시). 허용 파일: 신규 `sql/migrations/MIGRATION_R107C_AUTO_CONFIRM.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 1 완료 기록 |
| **2** | **`✅ DONE (SHA: 451ab5e4292534fc0f5165fceb4bf9875af06a8b)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Maker (R107-C 구독 모달·배지·환불 흐름 & Vitest)` | Step 1 완료 후 착수. 명세 §5.2·`C-11`. 허용 파일: 구독 모달·지출 목록/상세·환불 흐름 관련 `src/**`와 테스트(범위는 명세 §5.2), 루트 `docs/handoff.md`, `docs/progress.md` | `✅` 워크트리 커밋 `451ab5e4292534fc0f5165fceb4bf9875af06a8b`(7파일). `git diff --check`·`tsc`·`lint`·Vitest 78파일/1,074개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (SHA: f8d9aed, main 병합 9268bf0)`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex — Maker인 Opus·Hydrogen 제외)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요**. 금전·원장·동시성·권한 통합 정적 리뷰(`review.json`), `test.json`(로컬 DB 2경로 2회 멱등·`TESTS.sql`·2세션 병렬·`tsc`·`lint`·Vitest·`next build`, `C-5`·`C-12`), `main` 병합 | ✅ 아래 Step 3 완료 기록 (`P4` 2건 비차단, 로컬 DB 2경로·`TESTS.sql` 54개·`C-5` 병렬 3종 PASS, `main` 병합 `9268bf0`) |
| **4** | **`✅ DONE (2026-11-26, 문서 마감)`** | **Gemini 4 Hydrogen (`Medium`)** *(실행: Claude Sonnet `Medium` 대체)* | `Orchestrator (마감)` | `p4-followups-r108-r109` 기록·`R107-C` Step 1~3 상세 기록 이관, 운영 적용 순서 안내 | `✅` 문서 마감 완료 |

#### 📝 `r107c-auto-confirm` 핵심 요약 (2026-11-26)

- **구현**: `subscription_templates.auto_confirm`·`expenses.auto_confirmed_at`/`auto_confirm_blocked`, `_process_expense_payment_core` 추출(공개 `process_expense_payment` 시그니처·권한 불변), `auto_confirm_due_expenses`(스토어 결제수단·보정 창 2일·당일 생성 제외)와 일 배치 2단계, `refund_expense_payment`의 `INTERVAL_30` 롤백 원자화, `EXPENSE_AUTO_CONFIRMED` 요약 알림, 구독 모달 `자동 확정` 토글·배지·환불 후 클라이언트 롤백 호출 제거.
- **리뷰·검증**: 정적 리뷰 차단 0건·`P4` 2건 비차단(`R107C-REV-001·002`), 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 54개 PASS·`C-5` 2세션 병렬 3종, `tsc`·`lint`·Vitest 78파일/1,074개·`build` 통과.
- **사용자 수행 순서(명세 §6)**: ① 운영 DB에 `MIGRATION_R107C_AUTO_CONFIRM.sql` 실행 → `sql/README.md` B표 `R107C` 확인 쿼리 3종 확인 → ② `main` push 배포(신규 컬럼 미적용 환경 폴백이 있어도 DB 먼저 적용 권장) → ③ 구독 모달에서 스토어 결제수단 템플릿의 `자동 확정` 토글을 켜 보고, 예정일에 자동 확정·`오늘 자동 확정된 결제 N건` 알림·환불 동작을 1회 확인. ⚠️ `R107A`·`R107B` 마이그레이션을 이후 다시 실행하면 `enqueue_daily_notifications`가 구버전으로 돌아가므로 `MIGRATION_R107C_AUTO_CONFIRM.sql`을 다시 실행해야 함.
