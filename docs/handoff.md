# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 과제**: **`R109` 아이콘 이미지 Storage 이전 (`r109-icon-storage-migration` — Base `358fd4b`, 브랜치 `collab/r109-icon-storage-migration`, 워크트리 `.worktrees/r109-icon-storage-migration`)** *(확정 명세: [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §2~§3 — 공개 읽기 `game-assets` 버킷·해시 파일명·`sw.js` Cache-First 500개·관리자 승인 업로드·`/admin` 일괄 이전)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `SCHEMA.sql`). 🐳 **Docker Desktop 필요**. Step 1에서 로컬 업그레이드·신규 설치 2경로 각 2회 멱등·`TESTS.sql` 51개 PASS 확인함(Step 3 병합 게이트에서 재검증 필요). 운영 DB 미적용.
- **Target SHA (Step 1)**: `5b44d156afaf5d0ef061230f8a4c090301f1d48b`
- **수용 기준**: [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §2~§3. 아래 행은 절 포인터만 둠.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **0** | **`✅ DONE (SHA: 358fd4b, 2026-11-25)`** *(원 상태 `📐 SPEC_NEEDED`)* | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Opus (`High`) / Gemini 4 Neon (`High`), Fallback 2: Gemini 4 Hydrogen (`Medium`))* | `Chief Architect` | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) 명세·사용자 질문 카드(`D1`~`D4`)·Step 1~4 수용 기준 확정(`src/**`·`sql/**` 미수정) | ✅ `358fd4b` 명세 작성 및 Row 2 `▶ READY` 반환 |
| **1** | **`✅ DONE (Base 358fd4b)`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`) / GitHub Copilot)* | `Orchestrator (R109 Run 등록 및 워크트리 생성)` | `New-CollaborationRun.ps1 -RunId "r109-icon-storage-migration"`로 격리 워크트리 생성 및 Step 1~4 큐 등록 | `✅` `.worktrees/r109-icon-storage-migration`(`collab/r109-icon-storage-migration`, `run.json`) 생성 및 Step 1 `▶ READY` 전환 |
| **2 (Step 1)** | **`✅ DONE (SHA: 5b44d156afaf5d0ef061230f8a4c090301f1d48b)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback 1: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (Storage 버킷·RLS·승인 RPC SQL & 타입)` | 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관). 명세 §2.1~§2.2 및 §3 Step 1 수용 기준 수행. 허용 파일: 신규 `sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `CLAUDE.md`, 루트 `docs/handoff.md`, `docs/progress.md` | ✅ 아래 Step 1 완료 기록 |
| **3 (Step 2)** | **`▶ READY`** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Sonnet (`Medium`), Fallback 2: GitHub Copilot)* | `Maker (공용 업로드 모듈·관리자 쓰기/일괄 이전·SW 캐시 & Vitest)` | Step 1 완료 후 착수. 명세 §2.3~§2.5 및 §3 Step 2 수용 기준 수행(허용 파일 목록은 명세 §3 표 참고) | 대기 중 |
| **4 (Step 3)** | **`⏳ WAITING`** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: GPT Codex — Step 1·2 Maker가 아닌 독립 모델)* | `Reviewer & Local DB Gate` | Step 2 완료 후 착수. 🐳 **Docker Desktop 필요** (로컬 DB 2경로 2회 멱등 및 `TESTS.sql` 검증 병합 게이트). 명세 §3 Step 3 통합 정적 리뷰(`review.json`)·`test.json`·`tsc`·`lint`·Vitest·`next build`·`main` 병합 | 대기 중 |
| **5 (Step 4)** | **`⏳ WAITING`** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | Step 3 병합 후 착수. 문서 아카이브 마감 및 명세 §4 운영 적용·`/admin` 일괄 이전 절차 안내 | 대기 중 |

#### 📝 `r109-icon-storage-migration` Step 1 완료 기록 (Claude Opus `High`, 2026-11-25)

1. **Target SHA**: `5b44d156afaf5d0ef061230f8a4c090301f1d48b` (워크트리 `.worktrees/r109-icon-storage-migration`, 브랜치 `collab/r109-icon-storage-migration`). 원격 브랜치: push 안 함.
2. **변경 파일**: 신규 `sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `CLAUDE.md`.
3. **구현 내용 (명세 §2.1~§2.2)**:
   - `game-assets` 버킷(공개·102,400B·`image/webp`) `ON CONFLICT DO UPDATE`로 생성함. `SCHEMA.sql`에도 버킷 `INSERT`와 정책을 넣어 신규 설치 시 수동 생성이 필요 없음(`user-icons`는 기존대로 수동 생성).
   - `storage.objects` 정책 4종: `Public read game assets`(`anon`·`authenticated` 읽기), `Admins insert/update/delete game assets`(JWT `app_metadata.role` `coalesce` + `public.users.role` 이중 판정, `..` 금지, `games/{64hex}.webp`·`characters/{uuid}/{64hex}.webp` 정규식·폴더 깊이 강제). `user-icons` 정책 4종 불변, 계정 삭제 대기 RESTRICTIVE 정책 그대로 적용됨.
   - `is_valid_pickup_new_characters`: `https://` 허용(150,000자 상한 유지). 기존 `TESTS.sql` R52 블록의 `https` 거부 단언은 `http://` 거부로 바꿈.
   - `approve_schedule_request`: `DROP FUNCTION IF EXISTS (UUID)` 후 `(UUID, JSONB DEFAULT NULL)`로 교체, `REVOKE ... FROM PUBLIC, anon`·`GRANT ... TO authenticated`. 재정의 시 R85 본문(시각·예상 플래그 복사, R84 알림)을 그대로 유지함.
4. **결정·가정**:
   - 오버라이드는 `p_pickup_icon_overrides`가 JSON 객체이고 해당 이름 키 값이 문자열일 때만 적용함(빈 문자열 → `NULL`, 형식 위반 → `check_violation` `픽업 캐릭터 아이콘 주소가 올바르지 않습니다.`). 객체가 아니거나 키가 없으면 제안 `icon_url`로 폴백함. 이미 카탈로그에 같은 이름 캐릭터가 있으면 기존 행을 연결만 하고 아이콘은 바꾸지 않음(기존 동작 유지).
   - 검증 함수를 넓혀 일반 사용자도 픽업 제안에 외부 `https://` 주소를 넣을 수 있게 됨(`character_requests`와 동일 수준). Step 2 관리자 승인 화면이 제안 아이콘을 `game-assets`로 올려 오버라이드로 넘기면 외부 핫링크가 카탈로그에 남지 않음 — Step 3 리뷰 확인 대상.
   - `sql/README.md` R85 확인 쿼리의 `approve_schedule_request(uuid)::regprocedure`는 R109 이후 오류가 나므로 `'public.approve_schedule_request'::regproc`(오버로드 1개일 때만 성공)로 바꿈. R85 행과 R109 행에 구버전 재실행 시 R109 재실행 안내 추가함.
5. **검증 (실제 실행)**:
   - 🐳 로컬 Supabase 업그레이드 경로: Base `358fd4b` `SCHEMA.sql` → R109 마이그레이션 2회 → 확인 쿼리(버킷 `t/102400/{image/webp}`, 정책 4행, `approve_schedule_request(uuid,jsonb)` 1행, `anon_exec=f`·`auth_exec=t`·`https_ok=t`) → `TESTS.sql` 51개 PASS·ROLLBACK.
   - 🐳 신규 설치 경로: Target `SCHEMA.sql` → R109 마이그레이션 2회 → 같은 확인 쿼리 → `TESTS.sql` 51개 PASS·ROLLBACK. `SCHEMA.sql`↔마이그레이션 함수 2종·정책 4종 본문 일치 확인함.
   - `TESTS.sql` R109-01~06: 버킷·정책·단일 오버로드·권한, `anon`·일반 사용자 INSERT 42501·UPDATE/DELETE 0행·`user-icons`→`game-assets` 이동 거부, 관리자 유효 경로 INSERT/UPDATE/DELETE·잘못된 경로 8종 및 이름 변경 거부, `user-icons` 본인 업로드 유지, 오버라이드(URL·빈 문자열·키 없음)·1인자 호출 하위 호환·잘못된 주소 거부 후 `PENDING` 유지·R84 알림 유지.
   - `tsc --noEmit`·`next lint`·Vitest 77파일 1,050개·`git diff --cached --check` 통과(Node v24.22.2).
6. **남은 작업**: Step 2(Gemini 4 Neon `High`)가 `src/app/admin/requests/page.tsx` 일정 승인에서 `p_pickup_icon_overrides`를 넘기도록 전환함(현재 `{ p_request_id }` 호출은 그대로 동작). 운영 DB 적용은 병합 후 명세 §4 순서로 사용자가 수행함.

#### 📝 `R109` 명세 확정 기록 (Gemini 4 Carbon `High`, 2026-11-25)

1. **사용자 확정 결정 (`D1`~`D4`)**: ① 별도 측정 대기 없이 공개 읽기 공용 버킷 `game-assets`(SHA-256 해시 파일명 `games/{hash}.webp`·`characters/{game_id}/{hash}.webp`, 1년 불변 캐시, 관리자 전용 쓰기 RLS)로 즉시 착수하며 비공개 `user-icons` 규칙은 유지함(`CLAUDE.md`에 `game-assets` 예외 명시), ② `public/sw.js`에 `game-assets` 공개 경로 전용 Cache-First 런타임 캐시(`chronoledger-game-assets-v1`, 상한 500개)를 추가해 Web/PWA 오프라인 아이콘 표시를 지원함, ③ 사용자 요청(`character_requests`·`pickup_new_characters`)은 기존 Data URL로 받고 관리자 승인 시점에 Storage로 업로드(`approve_schedule_request`에 `p_pickup_icon_overrides JSONB DEFAULT NULL` 추가, 구 1인자 오버로드 `DROP`)하며 기존 운영 DB 아이콘은 `/admin` `[아이콘 Storage 일괄 이전]` 버튼(멱등, 기존 R30 역변환 대체)으로 이전함, ④ 과도기 Data URL·`https://` 공존을 유지하고 소용량 `game_classification_icons`(64×64)는 제외하며 전체 이전 완료 후 `R109-CLEANUP`은 사용자 지목 시 진행함.
2. **단계 배정 요약 (명세 §3)**: Step 1 **Claude Opus (`High`)**(🐳 Storage 버킷·RLS·`approve_schedule_request` 마이그레이션·`TESTS.sql`·타입·`CLAUDE.md`) → Step 2 **Gemini 4 Neon (`High`)**(`game-asset-storage.ts`·관리자 등록/승인 전환·일괄 이전 버튼·`sw.js` 캐시·Vitest) → Step 3 **Gemini 4 Carbon (`High`)**(🐳 통합 정적 리뷰·로컬 DB 게이트·병합) → Step 4 **Gemini 4 Hydrogen (`Medium`)**(문서 마감·운영 이전 안내).

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
| `R109` | **Run 등록 완료 (`r109-icon-storage-migration` 진행 중)** | 아이콘 Storage 이전(DB base64 → 공용 `game-assets` 버킷 해시 파일 + 관리자 일괄 이전 + `sw.js` 오프라인 이미지 캐시): Step 1 완료(`5b44d15`), Step 2 `Gemini 4 Neon (High)` `▶ READY`(후속 `R109-CLEANUP`은 운영 이전 완료 후 사용자 지목 시) | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md), `docs/to-do.md` R109 |
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
