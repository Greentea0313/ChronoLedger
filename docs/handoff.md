# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### ⛽ 쿼터 상태 (Quota Status)

- **`Gemini Models` 주간 한도 소진** *(사용자 통보, 2026-11-26, 리셋 시점 미확인)*: `Gemini 4 Hydrogen`·`Gemini 4 Neon`·`Gemini 4 Carbon`은 같은 공용 한도를 쓰므로 모두 사용 불가로 봄. 새 행 배정·인계는 다른 한도 묶음(`Claude Sonnet (Medium)`·`Claude Opus (High)`·`GPT Codex`·`GitHub Copilot`)으로 바로 보냄(handoff Skill §3). 리셋되면 사용자가 알려 주거나 Antigravity `View Usage`에서 확인한 모델이 이 절을 지움.
### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run**: **`R117` 캐릭터 분류 축 최대 3개로 확대 (`r117-classification-axes-3` — Base `123a70b699b80398999d171140eec6e471d2cc53`, 브랜치 `collab/r117-classification-axes-3`, 워크트리 `.worktrees/r117-classification-axes-3`)** *(사용자 요청·결정 2026-11-27: `R116`보다 먼저, 최대 3개(원 `R13` 설계값). 별도 명세 문서 없음 — 아래 수용 기준과 `docs/spec/R13_Character_Roster_and_Preset_Spec.md`·`R52_Character_Template_and_Pickup_Avatar_Spec.md`의 "최대 2개" 서술을 3개로 갱신함)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R117_CLASSIFICATION_AXES_3.sql`, `SCHEMA.sql`: `is_valid_classification_schema`의 `jsonb_array_length(axes) > 2` → `> 3`). 🐳 Docker Desktop 필요(이 PC는 2026-11-27 등록 시점에 엔진 실행 중 확인함). 금전·원장 접점 없음, 기존 2축 데이터는 그대로 유효.
- **Iteration 02 Target SHA**: `3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8` *(리뷰 완료·`main` 병합 `065fe4a322c602dad6f6b9fec27b6aee85948cfb`; 원격 Maker 브랜치는 push 안 함. 리뷰 범위는 Base ↔ Iteration 02 Target)*
- **수용 기준**: ① 3축 스키마 허용·4축 거부·기존 2축 게임 불변 ② 세 번째 축으로 캐릭터 `attributes` 검증·`game_classification_icons` 트리거·승인 RPC가 동작 ③ `character-utils.ts` `TEMPLATE_AXIS_MAX_COUNT = 3`·정규화 `slice(0, 3)` ④ 필터 막대·캐릭터 목록·프리셋·요청 모달·관리자 템플릿 폼이 3축에서 동작하고 390/900/1280 레이아웃 확인 ⑤ 마이그레이션 미적용 DB에서도 앱이 깨지지 않는 폴백 ⑥ `R13`·`R52` 명세 문구 갱신 ⑦ 로컬 DB `TESTS.sql`·tsc·lint·Vitest·`next build` 통과.
- **모델 배정 근거**: `Gemini Models` 한도 소진 중. SQL 제약 함수 재정의라 Step 1은 `Claude Opus`(승격 조건 ① SQL), 리뷰어는 Maker와 다른 모델임.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: 3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R117 SQL 제약·화면 3축 대응·명세)` | 요청 모달의 3축 Vitest 회귀 추가, R52 현재 UI 명세를 class1~3으로 갱신. 레이아웃 실화면 확인은 Step 3로 이관함 | `R117-REV-001`·`002` 보완함 |
| **2** | **`✅ DONE (artifact a3f7c55, main 병합 065fe4a322c602dad6f6b9fec27b6aee85948cfb)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외)* | `Reviewer & Local DB Gate` | Iteration 02 재리뷰·격리 DB 양 경로·앱 검증·main 재검증 통과 | Step 2 Iteration 02 기록 참조 |
| **3** | **`▶ READY`** | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 한 게임에 세 번째 분류 축 추가·390/900/1280 화면 및 필터 확인 | R117 운영 적용·화면 확인 필요 |


#### 📝 `r117-classification-axes-3` Step 1 (Maker) 완료 기록 (Claude Opus `High`, 2026-11-27)

- **Target SHA**: `c5c5a1c1004424fff8c496d0e55a7b18726e8ebc` (`collab/r117-classification-axes-3`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (11개)**: 신규 `sql/migrations/MIGRATION_R117_CLASSIFICATION_AXES_3.sql`, `sql/SCHEMA.sql`, `sql/README.md`(R117 행·R52 행 재실행 경고), `sql/tests/TESTS.sql`(R52 검증 줄 갱신·R117-01), `src/lib/character-utils.ts`·`.test.ts`, `src/app/admin/page.tsx`·`.test.tsx`, `src/components/character/character-filter-bar.test.tsx`, `docs/spec/R52_Character_Template_and_Pickup_Avatar_Spec.md`, `docs/spec/R13_Character_Roster_and_Preset_Spec.md`.
- **SQL (①②)**: `is_valid_classification_schema`의 축 상한만 `> 2` → `> 3`(본문 나머지 불변, 마이그레이션·`SCHEMA.sql` 본문 동일). `games_classification_schema_check`가 같은 함수를 참조해 제약 재생성 없음, 기존 0~2축 게임 그대로 유효. 승인 RPC·분류 아이콘 트리거는 축 전체를 돌기 때문에 변경 없음. 기존 R52 테스트의 "3축 거부" 줄은 "3축 허용·4축 거부"로 바꿈.
- **화면 (③④)**: `TEMPLATE_AXIS_MAX_COUNT = 3`, `normalizeClassificationSchema`는 `slice(0, TEMPLATE_AXIS_MAX_COUNT)`. 관리자 템플릿 폼의 "최대 2개" 문구 2곳과 `축 추가` 상한을 상수로 바꿈. 필터 막대·캐릭터 목록·프리셋·요청 모달·관리자 캐릭터 폼은 이미 `schema.axes` 전체를 돌고 있어 코드 변경 없음(각 축이 세로로 한 줄씩 쌓이는 구조).
- **판단**: ① `R13` 명세는 원래 "최대 3개"라 문구가 맞아, `R52`가 2개로 줄였다가 `R117`이 되돌렸다는 한 줄만 추가함. `R52` 명세는 `character_class3` 행과 상한 문구를 갱신함. ② 마이그레이션 미적용 DB(⑤)에서는 관리자가 3번째 축을 저장하면 기존 CHECK 위반 처리 문구("캐릭터 템플릿 형식이 올바르지 않습니다…")가 나오고, 나머지 화면은 그대로 동작함(새 열·RPC 없음). ③ `R52` 마이그레이션을 다시 실행하면 상한이 2로 돌아가므로 README 두 행과 마이그레이션 머리말에 재실행 경고를 둠.
- **검증 (실제 실행)**: 🐳 업그레이드(Base `123a70b` `SCHEMA.sql` → R117 2회 → `TESTS.sql` 63개 PASS)·신규(Target `SCHEMA.sql` → 2회 → 63개 PASS), 두 로그 `ERROR` 0건. 변이 2건(상한 2·상한 4) 모두 `FAIL`로 잡힘. `tsc`·`lint`·Vitest 85파일/1,149개(신규·갱신 6개)·`next build` 16/16(더미 공개 Supabase 값)·`git diff --check` 통과. **미검증**: 390/900/1280 실제 화면 레이아웃(④)은 브라우저로 보지 않음. Step 2 리뷰 또는 Step 3 사용자 확인 필요.
- **남음**: Step 2 GPT Codex 리뷰·🐳 DB 게이트·통과 시 `main` 병합 → Step 3 사용자 운영 DB 적용·배포·3번째 축 추가·필터 확인 → 이후 `R116` Step 1 `▶ READY`.

#### 📝 `r117-classification-axes-3` Step 1 Iteration 02 (Maker) 완료 기록 (Claude Opus `High`, 2026-11-27)

- **Target SHA**: `3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8` (`collab/r117-classification-axes-3`, 원격 브랜치: **push 안 함**, `run.json` 미수정)
- **변경 파일 (2개)**: `src/components/game/request-submission-modal.test.tsx`, `docs/spec/R52_Character_Template_and_Pickup_Avatar_Spec.md`. 실행 코드·SQL 변경 없음.
- **`R117-REV-001` (P3)**: 요청 모달에 3축 템플릿 게임만 쓰는 테스트를 추가함. 세 번째 축을 고르지 않으면 "역할을(를) 선택해 주세요."로 막히고, 고르면 세 값이 모두 `attributes`로 제출됨. 다른 테스트가 쓰는 공용 fixture(1축)는 바꾸지 않음. 축 정규화를 다시 2개로 자르면 이 테스트가 `FAIL`로 잡는 것을 확인함.
- **`R117-REV-002` (P3)**: R52 명세 §3.3 관리자 표 열·캐릭터 추가/수정 모달 필드, §4.2 요청 폼에 `{class3.label}`을 추가함(`R117`부터라는 표시). R52 당시 결정 문구(§2.2 "R52 원안은 `<= 2`")는 그대로 둠.
- **검증 (실제 실행)**: `tsc`·`lint`·Vitest 85파일/1,150개·`git diff --check` 통과. 실행 코드·SQL이 바뀌지 않아 `next build`·로컬 DB는 다시 돌리지 않음(Iteration 01: build 16/16, `TESTS.sql` 63개 PASS). 실제 화면 레이아웃은 Step 3 사용자 확인으로 넘김(큐 행 결정대로).
- **남음**: Step 2 GPT Codex Iteration 02 재리뷰·🐳 DB 게이트·통과 시 `main` 병합 → Step 3 사용자 확인 → `R116` Step 1 `▶ READY`.

#### 📝 `r117-classification-axes-3` Step 2 Iteration 01 검토 기록 (GPT Codex, 2026-11-27)

- **Base ↔ Target**: `123a70b699b80398999d171140eec6e471d2cc53` ↔ `c5c5a1c1004424fff8c496d0e55a7b18726e8ebc`; artifact commit `95a75d68481492e4101b4ebce2816e159dd975f5`.
- **정적 결과**: `findings` 2건임. `R117-REV-001` P3 — 요청 모달 테스트 fixture는 기존 분류 축 1개만 두어 세 번째 축 입력·필수 검증·제출 값을 확인하지 않음. `R117-REV-002` P3 — R52 현재 UI 명세 §3.3·§4.2가 분류 축을 class1/class2까지만 기재해 R117의 3축 기준과 어긋남.
- **DB 검증**: 격리 Docker Supabase 업그레이드(Base `SCHEMA.sql` → R117 migration 2회 → 전체 `TESTS.sql`) 및 신규 설치(Target `SCHEMA.sql` → migration 2회 → 전체 `TESTS.sql`) 모두 R117-01 및 최종 rollback PASS, SQL `ERROR` 없음. 비공개 `user-icons` 버킷은 README 전제에 따라 테스트 DB에 구성함.
- **앱 검증**: tsc·lint·Vitest 85파일/1,149개·`next build` 16/16 통과함. artifact schema는 Python `jsonschema` 부재로 Node Ajv 6.15.0의 Draft 7 변환 검증을 사용함. 390/900/1280 실화면 점검은 미실행이며 Step 3 확인으로 둠.
- **남음**: Claude Opus가 Iteration 02에서 요청 모달 3축 테스트와 R52 현재 UI 명세를 보완함. 이후 GPT Codex가 재리뷰·🐳 DB 게이트를 수행함. 병합하지 않음.

#### 📝 `r117-classification-axes-3` Step 2 Iteration 02 검토 기록 (GPT Codex, 2026-11-27)

- **Base ↔ Target**: `123a70b699b80398999d171140eec6e471d2cc53` ↔ `3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8`; artifact commit `a3f7c55`, main 병합 `065fe4a322c602dad6f6b9fec27b6aee85948cfb`임.
- **정적 결과**: `clean`임. `R117-REV-001`은 3축 요청 폼에서 세 번째 축 누락 제출 거부 및 3개 값 payload 테스트로 보완됨. `R117-REV-002`는 R52 §3.3·§4.2의 현재 UI 설명을 class1~class3로 갱신하고 R52 당시 상한 결정은 역사 맥락으로 유지함.
- **DB 검증**: Docker Desktop 4.98.0 엔진 연결 확인함. 사용자 화면의 기존 `chronoledger-local`은 유지하고 별도 격리 스택 2개를 사용함. Base 업그레이드 및 Target 신규 설치에서 migration 각 2회와 전체 `TESTS.sql` 63개 블록 PASS, `R117-01`·최종 rollback PASS, SQL `ERROR` 0건임. 테스트 스택·볼륨·임시 폴더 정리 완료함.
- **앱 검증**: Target 및 병합 후 main에서 각각 tsc·lint·Vitest 85파일/1,150개 통과함. main `next build` 16/16 및 CSP 13개 HTML 주입 통과함. artifact schema는 Python `jsonschema` 부재로 Node Ajv 6.15.0 Draft 7 변환 검증을 사용함. `src`·`sql` 병합 후 변경 없음 확인함.
- **남음**: 사용자 운영 DB migration·README 확인 쿼리 적용, 배포, 게임 하나의 3축 설정과 390/900/1280 화면·필터 확인임. 실제 화면은 수동 점검하지 않음.

> **다음 단계**: **사용자**가 Step 3 운영 DB 적용·배포·3축 화면 확인을 진행함. 완료 후 `R116` Step 1이 `▶ READY`가 됨.

- **대기 Run (R117 완료 후 재개, 워크트리는 생성돼 있음)**: **`R116` 공개 게임별 일정 페이지·SEO (`r116-public-game-pages` — Base `442fb6965b6c170eea66af2f817b1f2190353c33`, 브랜치 `collab/r116-public-game-pages`, 워크트리 `.worktrees/r116-public-game-pages`)** *(명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §6(결정 P1~P13·인수 기준 116-1~116-8)·§7(모델 배정). 직전 Run `r115-csv-import`는 2026-11-27 마감함. 마지막 후보 Run임)*
- **DB 변경**: 없음. 🐳 Docker 불필요. 새 환경 변수 `NEXT_PUBLIC_SITE_URL`(없으면 canonical·sitemap 항목만 생략, 빌드 경고). 개인 데이터 비노출(공개 `games`·`is_official` 일정·픽업 캐릭터 이름만, anon 키 전용).
- **주의 (명세 §6.1)**: 빌드 시점 서버 컴포넌트는 이 코드베이스의 새 관례임(P2). 빌드 시점 조회 실패는 빌드 실패(P9). Cloudflare Pages `_redirects` 규칙이 생성 HTML보다 앞서면 빈 SPA 셸이 나갈 수 있어 배포 뒤 확인(P11, 116-8).
- **모델 배정 근거**: `Gemini Models` 한도 소진 중이라 명세 §7 권고대로 배정함.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`⏳ WAITING (R117 완료 후 ▶ READY)`** | **Claude Sonnet (`Medium`)** *(Fallback: GitHub Copilot)* | `Maker (R116 공개 페이지·메타데이터·sitemap)` | 명세 §6 전부(`src/lib/public-catalog.ts`·P4 범위 함수·`src/app/games/**`(목록·`[gameId]`, `generateStaticParams`·`dynamicParams = false`)·열람 시 최신화 클라이언트 컴포넌트·`generateMetadata`·`src/app/sitemap.ts`·`src/app/robots.ts`·`/auth` 링크·`public/_redirects` 점검·빌드 산출물 검사 스크립트·테스트)·인수 기준 116-1~116-7. 기존 `/auth`·`/dashboard/**`·`/admin`·데스크톱 빌드 영향 금지. `service role` 키 참조 금지. 허용 파일: 신규 `src/lib/public-catalog.ts`·`.test.ts`, `src/app/games/**`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/auth/page.tsx`(링크 1건), `public/_redirects`(필요 시), `scripts/inject-csp.mjs`(필요 시), 빌드 산출물 검사 스크립트, 루트 `docs/handoff.md`, `docs/progress.md` | `⏳ 사용자가 R117을 먼저 하기로 함(2026-11-27)` |
| **2** | **`⏳ WAITING`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Reviewer` | Step 1 완료 후 착수. 공개 범위(개인 데이터 비노출)·CSP·정적 export 경계·빌드 실패 처리 정적 리뷰(`review.json`)·`test.json`(`tsc`·`lint`·Vitest·`next build`·`out/games/*.html` 검사)·`main` 병합·문서 마감 | `⏳ Step 1 완료 대기` |
| **3** | `⏳ WAITING` | **사용자** | `NEXT_PUBLIC_SITE_URL` 설정·배포·`curl`로 생성 HTML 확인·Search Console sitemap 제출(116-8) | Step 2 병합 후 안내함 |


### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R110` | **완료 · 릴리스 `desktop-v0.2.1` 배포·자동 업데이트 확인** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·서명). Run `r110-desktop-auto-update` 마감, 아이콘 교체(`0.2.2`) 배포만 남음 | 보관 문서 「이전 Run 기록 (완료): `r110-desktop-auto-update`」 절, [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4 |
| `R111` | **`main` 커밋 · 운영 DB 적용·확인 쿼리 완료 · `⚠️ LOCAL_DB_DEFERRED`** | 보안 상위 3건(S1 `users` 노출 축소 마이그레이션, S2 CSP·HSTS, S3 CI) `main` 작업 트리 구현. 운영 DB `MIGRATION_USERS_PROFILE_PRIVACY.sql` 적용·README 확인 쿼리 확인(사용자, 2026-11-26). 로컬 DB 통과 전 `main` 커밋은 사용자 지시에 따른 예외임. 남음: 🐳 로컬 `TESTS.sql`(`PRIV-01`) 실행, 배포, 데스크톱 CSP 확인. 나머지 항목은 `R112` 후보 | `docs/to-do.md` `R111`·`R112`, [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료·종료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`, `R110` 자동 업데이트 `main` 병합 `a83503a`) | Windows Tauri 데스크톱 통합(PKCE 단일 콜백·딥링크·`single-instance`) 병합, Rust 빌드·`Cargo.lock` 갱신, 운영 DB·Redirect URL 등록, 사용자 Windows 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제) 모두 2026-11-26까지 완료함. 남은 일 없음 | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4, 기록 상세는 `docs/archive/handoff-archive.md`, `docs/to-do.md` T1~T4 |


### 🗂️ 직전 완료 Run 기록: `r115-csv-import` *(`R115` CSV 결제 내역 가져오기)*

- **Run ID**: `r115-csv-import` **(완료, `main` 병합 `35f446188b4971059e83c492b03d9b46949e4e05`, 문서 마감 2026-11-27)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·마감)*
- **Worktree 경로**: `.worktrees/r115-csv-import` (브랜치 `collab/r115-csv-import`, 매니페스트 `artifacts/r115-csv-import/run.json`, 미삭제·원격 미push)
- **Base SHA**: `a04237f3da787e33dd37a6ca80e4d97322c575cc` · **Target SHA**: `a01d312dbaf835d33c27b21beb3bd0c32094240e` *(Iteration 02, `main` 병합 `35f4461`)*
- **명세**: [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §5. Step 1~2 상세 완료·검토 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R115_EXPENSE_IMPORT.sql`, `SCHEMA.sql`). **운영 DB 적용·확인 쿼리·배포·실제 가져오기·취소 확인 완료(사용자, 2026-11-27)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: a01d312dbaf835d33c27b21beb3bd0c32094240e)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R115 SQL RPC·CSV 파서·가져오기 UI)` | 🐳 **Docker Desktop 필요**. `delete_import_batch`가 편집된 가져오기 행을 지우지 않도록 I1 전체 불변 확인·회귀 테스트 추가, `TESTS.sql` psql 출력 경고 수정. 기존 합의 범위만 보완 | `R115-REV-001`·`002` 수정함 |
| **2** | **`✅ DONE (artifact 4f162821ba59ced29e27c30c18d22b3eb09acc3f; main 병합 35f446188b4971059e83c492b03d9b46949e4e05)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외, 불가 시 다른 세션의 Claude Opus)* | `Reviewer & Local DB Gate` | Iteration 02 정적 리뷰·격리 DB 두 경로·병합 후 전체 검증 통과 | review `clean`, DB 2경로 PASS |
| **3** | **`✅ DONE (2026-11-27, 사용자 확인)`** | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 실제 CSV 가져오기·취소 확인 | 운영 DB `MIGRATION_R115_EXPENSE_IMPORT.sql` 적용·확인 쿼리·배포 완료. 더미 CSV 2종(자체 형식 6건·35,700원, 일반 EUC-KR 5건·50,900원)으로 열 자동 추측·제외 사유·중복 의심·게임 미매칭 배지·`'` 복원을 확인하고 실제 가져오기 5건 → 총자산·지갑·포인트 전후 동일(예상 지출만 변경, I16 설계대로) → `가져오기 취소` 5건 정상 확인 |

#### 📝 `r115-csv-import` 핵심 요약 (2026-11-27)

- **구현**: `expenses.import_batch_id`, SECURITY DEFINER RPC `import_confirmed_expenses`·`delete_import_batch`(가져온 행은 `CONFIRMED`·`WALLET`·자산 미차감·포인트 0이라 총자산·지갑·포인트 원장 불변, 가져온 행 환불도 불변), `src/lib/csv.ts` 파서(UTF-8/EUC-KR), 가져오기 해석(`expense-import.ts`), 지출 페이지 `CSV 가져오기` 단계형 모달(열 자동 추측·제외 사유·중복 의심·게임 미매칭·일괄 취소).
- **리뷰**: Iteration 01에서 `R115-REV-001`(P2, `delete_import_batch` 삭제 조건에 `original_price = final_amount` 누락)·`R115-REV-002`(P4) 확인 → Iteration 02에서 수정, 재리뷰 clean. 🐳 격리 DB 업그레이드·신규 경로 각 2회 멱등·`TESTS.sql` 62개 PASS.
- **사용자 확인**: 열 지정 화면 자동 선택은 구버전 번들·드롭다운 조작 문제로 보였으며 새로 고친 뒤 정상. 회귀 테스트 `1c1ba89`로 열 추측을 고정함.
