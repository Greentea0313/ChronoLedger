# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **없음** *(직전 Run `r109-icon-storage-migration` 완료·`main` 병합 `7f54ef1`, 아래 「직전 완료 Run 기록」 참조)*. 새 과제는 사용자가 지목하면 Orchestrator가 Run으로 등록함.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A` 운영 적용 완료 · `R107-B` 운영 DB 적용 완료 | 정기·반복 지출 자동화: `R107-A` 운영 적용 완료(1주 관찰 후 `R107-A-CLEANUP`) → `R107-B` 결제 예정 알림 `main` 병합 `a84c6de`·운영 DB 적용 완료(앱 배포 필요) → `R107-C` 자동 확정 옵션(Run 3, `R107-B` 앱 배포 후 사용자 지목 시 등록). 명세 §9 미결 질문 6건은 기본값으로 진행 중 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R109` | **`main` 병합 완료 (`7f54ef1`) · 운영 DB 적용·배포·`/admin` 일괄 이전 대기** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 사용자 수행 순서는 아래 「직전 완료 Run 기록」 참조. `R109-REV-001·002`(P4)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R108-REV-001` (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `r109-icon-storage-migration` *(`R109` 공용 게임·캐릭터 아이콘 Storage 이전)*

- **Run ID**: `r109-icon-storage-migration` **(완료, `main` 병합 `7f54ef1`, 문서 마감 2026-11-25)** · **Orchestrator**: Gemini 4 Hydrogen *(등록)* · Claude Sonnet `Medium` *(Step 4 마감 대체 실행)*
- **Worktree 경로**: `.worktrees/r109-icon-storage-migration` (브랜치 `collab/r109-icon-storage-migration`, 매니페스트 `artifacts/r109-icon-storage-migration/run.json`, 미삭제·원격 미push)
- **Base SHA**: `358fd4b61713638d94ff7c7c0c5383a351600ca6` · **Target SHA**: `8dfd5f1e288a80ef627019a52c4df13cce92f030` *(Step 1 `5b44d15`, 산출물 `fe7fbc7`, `main` 병합 `7f54ef1`)*
- **명세**: [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §2~§4. Step 1~3 상세 완료 기록과 명세 확정 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `SCHEMA.sql`). **운영 DB 미적용(사용자 수동 적용 필요)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`✅ DONE (SHA: 358fd4b, 2026-11-25)`** *(원 상태 `📐 SPEC_NEEDED`)* | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Opus (`High`) / Gemini 4 Neon (`High`), Fallback 2: Gemini 4 Hydrogen (`Medium`))* | `Chief Architect` | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) 명세·사용자 질문 카드(`D1`~`D4`)·Step 1~4 수용 기준 확정(`src/**`·`sql/**` 미수정) | ✅ `358fd4b` 명세 작성 및 Row 2 `▶ READY` 반환 |
| **1** | **`✅ DONE (Base 358fd4b)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Orchestrator (R109 Run 등록 및 워크트리 생성)` | `New-CollaborationRun.ps1 -RunId "r109-icon-storage-migration"`로 격리 워크트리 생성 및 Step 1~4 큐 등록 | `✅` `.worktrees/r109-icon-storage-migration`(`collab/r109-icon-storage-migration`, `run.json`) 생성 및 Step 1 `▶ READY` 전환 |
| **2 (Step 1)** | **`✅ DONE (SHA: 5b44d156afaf5d0ef061230f8a4c090301f1d48b)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback 1: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (Storage 버킷·RLS·승인 RPC SQL & 타입)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). 명세 §2.1~§2.2 및 §3 Step 1 수용 기준 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `CLAUDE.md`, 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 1 완료 기록 |
| **3 (Step 2)** | **`✅ DONE (SHA: 8dfd5f1e288a80ef627019a52c4df13cce92f030)`** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Sonnet (`Medium`), Fallback 2: GitHub Copilot)* | `Maker (공용 업로드 모듈·관리자 쓰기/일괄 이전·SW 캐시 & Vitest)` | Step 1 완료 후 착수. 명세 §2.3~§2.5 및 §3 Step 2 수용 기준 수행(허용 파일 목록은 명세 §3 표 참고) | ✅ 아래 Step 2 완료 기록 |
| **4 (Step 3)** | **`✅ DONE (SHA: fe7fbc7, main 병합 7f54ef1)`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: GPT Codex — Step 1·2 Maker가 아닌 독립 모델)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요** (로컬 DB 2경로 2회 멱등 및 `TESTS.sql` 검증 병합 게이트). 명세 §3 Step 3 통합 정적 리뷰(`review.json`)·`test.json`·`tsc`·`lint`·Vitest·`next build`·`main` 병합 | ✅ 아래 Step 3 완료 기록 (`P4` 2건 비차단, 로컬 DB 2경로·`TESTS.sql` 51개 PASS, `main` 병합 `7f54ef1`) |
| **5 (Step 4)** | **`✅ DONE (2026-11-25, 문서 마감)`** | **Gemini 4 Hydrogen (`Medium`)** *(실행: Claude Sonnet `Medium` 대체)* | `Orchestrator (마감)` | `t4-rust-build-and-lock` 기록을 `handoff-archive.md`로 이관하고 `R109` 상세 완료 기록 이관·운영 적용 절차 안내 | `✅` 문서 마감 완료 |

#### 📝 `r109-icon-storage-migration` 핵심 요약 (2026-11-25)

- **구현**: 공개 읽기 `game-assets` 버킷(102,400B·`image/webp`)·관리자 전용 쓰기 정책 4종·`approve_schedule_request(UUID, JSONB DEFAULT NULL)`(픽업 아이콘 오버라이드), 공용 업로드 모듈 `game-asset-storage.ts`, 관리자 등록·승인 경로 전환, `/admin` `[아이콘 Storage 일괄 이전]`, `sw.js` `game-assets` Cache-First(상한 500개).
- **리뷰·검증**: 정적 리뷰 차단 0건·`P4` 2건 비차단(`R109-REV-001·002`), 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 51개 PASS, `tsc`·`lint`·Vitest 78파일/1,067개·`build` 통과.
- **사용자 수행 순서(명세 §4)**: ① 운영 DB에 `MIGRATION_R109_GAME_ASSETS_STORAGE.sql` 실행 후 `sql/README.md` B표 확인 쿼리 4종 확인 → ② `main` push 배포(필요 시 Tauri 빌드 갱신) → ③ 배포된 앱 `/admin`에서 `[아이콘 Storage 일괄 이전]` 1회 실행(실패 0건 확인, 재실행 안전) → ④ 선택: 명세 §4-4의 `data:%` 잔여 건수 쿼리가 모두 0인지 확인 → ⑤ `R109-CLEANUP`은 안정화 후 사용자 지목 시.
