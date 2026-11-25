# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R109` 아이콘 이미지 Storage 이전 (`📐 SPEC_NEEDED` — Chief Architect 설계·미결 결정·수용 기준 확정 대기)** *(T1~T4 `npm run tauri dev` 테스트에서 구글 로그인은 안정적이나 페이지 전환 지연 체감에 따른 사용자 착수 지목, 2026-11-25. 검토 초안: [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md))*

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`📐 SPEC_NEEDED`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Opus (`High` — 도구에서 High 선택) / Gemini 4 Neon (`High` — 도구에서 High 선택), Fallback 2: Gemini 4 Hydrogen (`Medium`))* | `Chief Architect` | 아래 **요구사항 접수 기록 (`R109`)** 및 [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md)를 검토해 질문 카드(§9 미결 결정 4건) 확정, 정식 명세·보안 경계(`game-assets` 버킷·`storage.objects` RLS·`CLAUDE.md` 예외)·단계별 수용 기준 확정(`src/**`·`sql/**` 직접 수정 금지) 및 Row 2(`Gemini 4 Hydrogen`) `▶ READY` 전환 | 대기 중 |
| **2** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Orchestrator (R109 Run 등록 및 워크트리 생성)` | Row 1 명세 확정 후 착수. 깨끗한 `main`에서 `New-CollaborationRun.ps1`로 격리 워크트리 생성 및 Step별 Dispatch Queue(`▶ READY`) 등록함 | 대기 중 |

#### 📥 요구사항 접수 기록 (`R109` 아이콘 이미지 Storage 이전 — `Gemini 4 Hydrogen` 접수, 2026-11-25)

1. **요청 요지**:
   - 사용자가 `T1`~`T4` `npm run tauri dev` 실테스트에서 Google OAuth 로그인은 안정적으로 동작하나 페이지 전환 속도가 느려 `R109`([icon-storage-migration-review.md](icon-storage-migration-review.md))를 빠르게 적용해야 한다고 요청함.
2. **에스컬레이션 사유 (`.agents/rules/collaboration.md` §1~§2)**:
   - 새 공용 Storage 버킷 `game-assets` 생성, `storage.objects` RLS 정책(관리자 JWT 클레임 쓰기 제한), 승인 RPC(`approve_game_request`, `approve_character_request`) 및 일정 요청 `icon_url` 검증 함수 변경 등 **Storage RLS/RPC/보안 경계 설계**가 필수임(`Carbon` 승격 조건 ②).
   - DB·Storage·Admin·Characters·Service Worker(`public/sw.js`)·`CLAUDE.md` 규칙 예외 등 **3개 이상 도메인 모듈(약 16개 파일)**에 걸친 구조 변경이며, [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md) §9 미결 결정 4건과 정식 단계별 수용 기준이 미확정 상태임(`Carbon` 승격 조건 ①).
3. **검토·결정 필요 사항**:
   - ① **미결 결정 4건 (`docs/icon-storage-migration-review.md` §9)**: (a) 공용 `game-assets` 버킷 공개 읽기 허용 여부, (b) 오프라인 아이콘 표시를 위한 `public/sw.js` 타 출처 이미지 런타임 캐시 도입 여부, (c) 일반 사용자 요청 이미지를 데이터 URL로 받고 승인 시점에 Storage로 이전하는 방식 확정, (d) 전체 이전 완료 후 데이터 URL 허용 CHECK 제거 여부.
   - ② **측정 및 전 단계 병행 여부 (§6·§7)**: `npm run tauri dev` 지연이 아이콘 크기 때문인지(또는 dev 서버 컴파일/DB 쿼리/초기 번들 등 다른 요인 포함인지) 확인하기 위해 §6 측정 쿼리 결과 확인 또는 즉시 `A안`(Storage 이전) 진행 여부 확정.
   - ③ **이전 스크립트·스키마 정합성**: 기존 데이터 일괄 이전 도구(관리자 UI 버튼 vs 스크립트), `games.default_icon_url` CHECK 유무, `game_classification_icons` 포함 여부, `CLAUDE.md`의 `getPublicUrl` 금지 규칙 예외 문구 명시.
   - ④ **Run 분할 및 모델 배정**: DB/Storage RLS(🐳) $\to$ Admin/승인/이전 스크립트 $\to$ SW/화면 혼재 표시·테스트 $\to$ 통합 리뷰·로컬 DB 검증(`test.json`).
4. **관련 파일·문서**:
   - `docs/icon-storage-migration-review.md` (전체)
   - `sql/SCHEMA.sql` (`games`, `game_characters`, `character_requests`, `storage.objects`, `approve_game_request`, `approve_character_request`)
   - `src/lib/image-resizer.ts`, `src/lib/storage-upload.ts`, `src/lib/icon-preload.ts`, `public/sw.js`, `src/app/dashboard/characters/page.tsx`, `CLAUDE.md`

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A` 운영 적용 완료 · `R107-B` 운영 DB 적용 완료 | 정기·반복 지출 자동화: `R107-A` 운영 적용 완료(1주 관찰 후 `R107-A-CLEANUP`) → `R107-B` 결제 예정 알림 `main` 병합 `a84c6de`·운영 DB 적용 완료(앱 배포 필요) → `R107-C` 자동 확정 옵션(Run 3, `R107-B` 앱 배포 후 사용자 지목 시 등록). 명세 §9 미결 질문 6건은 기본값으로 진행 중 | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), `docs/to-do.md` `R107` |
| `R109` | **`📐 SPEC_NEEDED`** *(착수 요청 접수, 2026-11-25)* | 아이콘 Storage 이전(DB base64 → 공용 버킷 파일): `T1`~`T4` 페이지 전환 지연으로 사용자 착수 지목. `Gemini 4 Carbon (High)` 명세·미결 결정 4건 확정 대기 | [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md), `docs/to-do.md` R109 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 🐳)·`R99`(건의 첨부 🐳)·`R108-REV-001` (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. **사용자 확인 대기**: `app.exe` 실행 후 구글 로그인 복귀·`single-instance`·캘린더·결제 흐름(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |

### 🗂️ 직전 완료 Run 기록: `t4-rust-build-and-lock` *(`T4` 후속: Rust 빌드·`Cargo.lock` 갱신)*

- **Run ID**: `t4-rust-build-and-lock` **(완료, `main` 병합 `2829bb7`, 2026-11-25)** *(`T4` 후속: Rust 툴체인 PC에서 `cargo check`·`npm run tauri build`·`src-tauri/Cargo.lock` 갱신 및 `T1T4-REV-002` 확인 — DB 변경 없음, 🐳 Docker 불필요)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-25 등록)*
- **Worktree 경로**: `.worktrees/t4-rust-build-and-lock` (브랜치 `collab/t4-rust-build-and-lock`, 매니페스트 `artifacts/t4-rust-build-and-lock/run.json`)
- **Base SHA**: `ae56b57d02a72af729d13051d8cecb0dabdeaa26` · **Target SHA**: `2387bcddcf2a60a5705570a220a21e5f8f65ac00` *(Step 1 완료 기준, `main` 병합 완료)*
- **DB 변경**: 없음 (Rust/Cargo 및 npm 버전 정합 확인 전용)

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 2387bcddcf2a60a5705570a220a21e5f8f65ac00)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback 1: Claude Sonnet (`Medium`), Fallback 2: GitHub Copilot)* | `Maker (T4 Rust 빌드 & Cargo.lock 갱신)` | `.worktrees/t4-rust-build-and-lock`에서 `cargo check`·`npm run tauri build` 실행 및 `src-tauri/Cargo.lock` 갱신(`T1T4-REV-002` 버전 불일치로 빌드 실패 시 `package.json`·`package-lock.json` 또는 `src-tauri/Cargo.toml` 정합 보완), `tsc`·`lint`·`vitest`·`diff-check` 통과 후 커밋. 허용 파일: `src-tauri/Cargo.lock`, `src-tauri/Cargo.toml`, `package.json`, `package-lock.json`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 2387bcd`: `cargo check`·`npm run tauri build`(`app.exe` 릴리스 빌드 성공, `T1T4-REV-002` 오류 없음)·`Cargo.lock` 갱신, `tsc`·`lint`·`diff-check`·Vitest 77파일/1,050개 통과 (아래 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: 501b587)`** | **Claude Sonnet (`Medium`)** *(Fallback 1: Gemini 4 Neon (`High` — 도구에서 High 선택) / Claude Opus (`High` — 도구에서 High 선택))* | `Reviewer & Orchestrator` | Step 1 완료 후 착수. Base(`ae56b57d02a72af729d13051d8cecb0dabdeaa26`) $\leftrightarrow$ Target SHA 정적 리뷰(`review.json`)·검증(`test.json`, `cargo check`·`tsc`·`lint`·`vitest`·`build`)·`main` 병합·문서 마감 | `✅ 501b587`: 지적 0건(clean)·`cargo check --locked`·산출물 검증 통과, `main` 병합 `2829bb7` (아래 Step 2 완료 기록 참고) |

#### 📝 `t4-rust-build-and-lock` Step 1 완료 기록 (Gemini 4 Hydrogen `Medium`, 2026-11-25)

- **Target SHA**: `2387bcddcf2a60a5705570a220a21e5f8f65ac00` (워크트리 브랜치 `collab/t4-rust-build-and-lock`, 미병합·원격 push 안 함). 변경 파일(1개): `src-tauri/Cargo.lock` (`tauri-plugin-single-instance v2.5.3` 등 반영, `run.json` 미수정).
- **버전 정합 확인 (`T1T4-REV-002`)**: `npm run tauri build` 실행 시 버전 불일치 오류 없이 통과하여 `package.json`·`Cargo.toml` 수정 불필요함.
- **검증**: 워크트리에서 `cargo check --manifest-path src-tauri/Cargo.toml` 통과, `npm run tauri build` 통과(`next build` 16페이지 + `release` `app.exe` 생성 확인, 임시 복사한 `.env.local` 정리 완료), `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `git diff --check`, `npx vitest run`(77파일 / 1,050개 통과) 확인함.
- **다음 단계**: Step 2(`Claude Sonnet (Medium)`, Base `ae56b57` ↔ Target `2387bcd` 정적 리뷰·검증·`main` 병합·문서 마감 및 사용자 실기기 OAuth 확인 안내) `▶ READY`임.

#### 📝 `t4-rust-build-and-lock` Step 2 완료 기록 (Claude Sonnet `Medium`, 2026-11-25)

- **리뷰 범위**: Base `ae56b57d02a72af729d13051d8cecb0dabdeaa26` ↔ Target `2387bcddcf2a60a5705570a220a21e5f8f65ac00`(범위 확인: Target이 워크트리 `HEAD`의 조상이고 `src`·`sql`·`src-tauri` 차이 없음). 구현 변경은 `src-tauri/Cargo.lock` 1개뿐이고 `sql/`·`supabase/` 변경이 없어 로컬 DB 게이트 대상이 아님.
- **정적 리뷰 (`clean`, 지적 0건)**: `Cargo.lock` 변경은 추가 18줄뿐이며 `tauri-plugin-single-instance v2.5.3` 패키지 항목과 앱 의존성 목록의 한 줄임. 기존 패키지 삭제·버전 하향이 없음. `Cargo.toml`의 `tauri-plugin-single-instance = { version = "2.0.0", features = ["deep-link"] }`와 `lib.rs`의 `tauri_plugin_single_instance::init`·`tauri_plugin_deep_link::init` 사용과 일치함. 요구된 `package.json`·`Cargo.toml` 보완은 불필요함(`T1T4-REV-002` 버전 불일치 없음)이라는 Maker 기록이 `npm run tauri build` 통과와 맞음.
- **검증 (리뷰어가 Target에서 직접 재실행)**: `cargo check --locked --manifest-path src-tauri/Cargo.toml` 통과(`--locked`로 `Cargo.lock`이 `Cargo.toml`과 어긋나지 않음을 확인), `tsc --noEmit`·`npm run lint`·`git diff --check` 통과, Vitest 77파일 1,050개 통과, `npm run build` 통과(워크트리에 `.env.local`이 없어 더미 Supabase 환경변수로 실행). `npm run tauri build`(릴리스 `app.exe`)는 오래 걸려 리뷰어가 다시 돌리지 않고 Maker 기록을 따름(`skipped`로 기록). 실기기 로그인·딥링크 확인은 하지 않음(`skipped`).
- **산출물**: `artifacts/t4-rust-build-and-lock/iteration-01/review.json`·`test.json`(스키마 검증 통과)과 `run.json` `target_sha` 갱신, 산출물 커밋 `501b587`. `main` 병합 `2829bb7`(`--no-ff`, 병합 후 `cargo check --locked` 재확인, 미push).
- **남은 일 (사용자)**: `T4`의 마지막 검증은 사용자 몫임. 빌드한 `app.exe`(또는 `npm run tauri dev`)를 실행해 ① 구글 로그인 후 앱으로 돌아오는지(`chronoledger://auth/callback`, 이미 Supabase Redirect URL 등록 완료), ② 앱이 이미 켜져 있을 때 링크를 열면 두 번째 창이 아니라 기존 창으로 이어지는지(`single-instance`), ③ 캘린더·결제 흐름이 정상인지 확인함.
- **다음 단계**: 이 Run은 마감함. 활성 Run 없음.
