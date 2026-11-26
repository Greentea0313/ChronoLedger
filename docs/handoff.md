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

- **활성 Run**: **`R116` 공개 게임별 일정 페이지·SEO (`r116-public-game-pages` — Base `442fb6965b6c170eea66af2f817b1f2190353c33`, 브랜치 `collab/r116-public-game-pages`, 워크트리 `.worktrees/r116-public-game-pages`)** *(명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §6(결정 P1~P13·인수 기준 116-1~116-8)·§7(모델 배정). 직전 Run `r115-csv-import`는 2026-11-27 마감함. 마지막 후보 Run임)*
- **DB 변경**: 없음. 🐳 Docker 불필요. 새 환경 변수 `NEXT_PUBLIC_SITE_URL`(없으면 canonical·sitemap 항목만 생략, 빌드 경고). 개인 데이터 비노출(공개 `games`·`is_official` 일정·픽업 캐릭터 이름만, anon 키 전용).
- **주의 (명세 §6.1)**: 빌드 시점 서버 컴포넌트는 이 코드베이스의 새 관례임(P2). 빌드 시점 조회 실패는 빌드 실패(P9). Cloudflare Pages `_redirects` 규칙이 생성 HTML보다 앞서면 빈 SPA 셸이 나갈 수 있어 배포 뒤 확인(P11, 116-8).
- **모델 배정 근거**: `Gemini Models` 한도 소진 중이라 명세 §7 권고대로 배정함.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`▶ READY`** | **Claude Sonnet (`Medium`)** *(Fallback: GitHub Copilot)* | `Maker (R116 공개 페이지·메타데이터·sitemap)` | 명세 §6 전부(`src/lib/public-catalog.ts`·P4 범위 함수·`src/app/games/**`(목록·`[gameId]`, `generateStaticParams`·`dynamicParams = false`)·열람 시 최신화 클라이언트 컴포넌트·`generateMetadata`·`src/app/sitemap.ts`·`src/app/robots.ts`·`/auth` 링크·`public/_redirects` 점검·빌드 산출물 검사 스크립트·테스트)·인수 기준 116-1~116-7. 기존 `/auth`·`/dashboard/**`·`/admin`·데스크톱 빌드 영향 금지. `service role` 키 참조 금지. 허용 파일: 신규 `src/lib/public-catalog.ts`·`.test.ts`, `src/app/games/**`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/auth/page.tsx`(링크 1건), `public/_redirects`(필요 시), `scripts/inject-csp.mjs`(필요 시), 빌드 산출물 검사 스크립트, 루트 `docs/handoff.md`, `docs/progress.md` | 대기 중 |
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
| `R110` | **완료 · 최신 릴리스 `desktop-v0.3.0`(2026-11-27)** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·서명). Run `r110-desktop-auto-update` 마감. `0.2.2`(아이콘)에 이어 `0.3.0`(`R113`~`R117` 포함) 릴리스 성공, 설치본 업데이트 배너 확인은 사용자 | 보관 문서 「이전 Run 기록 (완료): `r110-desktop-auto-update`」 절, [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4 |
| `R111` | **`main` 커밋 · 운영 DB 적용·확인 쿼리 완료 · `⚠️ LOCAL_DB_DEFERRED`** | 보안 상위 3건(S1 `users` 노출 축소 마이그레이션, S2 CSP·HSTS, S3 CI) `main` 작업 트리 구현. 운영 DB `MIGRATION_USERS_PROFILE_PRIVACY.sql` 적용·README 확인 쿼리 확인(사용자, 2026-11-26). 로컬 DB 통과 전 `main` 커밋은 사용자 지시에 따른 예외임. 남음: 🐳 로컬 `TESTS.sql`(`PRIV-01`) 실행, 배포, 데스크톱 CSP 확인. 나머지 항목은 `R112` 후보 | `docs/to-do.md` `R111`·`R112`, [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료·종료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`, `R110` 자동 업데이트 `main` 병합 `a83503a`) | Windows Tauri 데스크톱 통합(PKCE 단일 콜백·딥링크·`single-instance`) 병합, Rust 빌드·`Cargo.lock` 갱신, 운영 DB·Redirect URL 등록, 사용자 Windows 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제) 모두 2026-11-26까지 완료함. 남은 일 없음 | [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4, 기록 상세는 `docs/archive/handoff-archive.md`, `docs/to-do.md` T1~T4 |


### 🗂️ 직전 완료 Run 기록: `r117-classification-axes-3` *(`R117` 캐릭터 분류 축 최대 2개 → 3개)*

- **Run ID**: `r117-classification-axes-3` **(완료, `main` 병합 `065fe4a322c602dad6f6b9fec27b6aee85948cfb`, 문서 마감 2026-11-27)** · **Orchestrator**: Claude Sonnet `Medium` *(등록·마감)*
- **Worktree 경로**: `.worktrees/r117-classification-axes-3` (브랜치 `collab/r117-classification-axes-3`, 매니페스트 `artifacts/r117-classification-axes-3/run.json`, 미삭제·원격 미push)
- **Base SHA**: `123a70b699b80398999d171140eec6e471d2cc53` · **Target SHA**: `3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8` *(Iteration 02, 산출물 `a3f7c55`, `main` 병합 `065fe4a`)*
- **명세**: 별도 문서 없이 `R13`·`R52` 명세 문구를 3축으로 갱신함. Step 1~2 상세 기록은 `docs/archive/handoff-archive.md`로 옮김.
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R117_CLASSIFICATION_AXES_3.sql`, `SCHEMA.sql`). **운영 적용·배포·화면 확인 완료(사용자 확인, 2026-11-27)**.

| 순서 | 상태 | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (Iteration 02, SHA: 3c8168eb01b2697e4b36f2d0eaf7d4612cd77bd8)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | `Maker (R117 SQL 제약·화면 3축 대응·명세)` | 요청 모달의 3축 Vitest 회귀 추가, R52 현재 UI 명세를 class1~3으로 갱신. 레이아웃 실화면 확인은 Step 3로 이관함 | `R117-REV-001`·`002` 보완함 |
| **2** | **`✅ DONE (artifact a3f7c55, main 병합 065fe4a322c602dad6f6b9fec27b6aee85948cfb)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium` — Maker인 Opus 제외)* | `Reviewer & Local DB Gate` | Iteration 02 재리뷰·격리 DB 양 경로·앱 검증·main 재검증 통과 | Step 2 Iteration 02 기록 참조 |
| **3** | **`✅ DONE (2026-11-27, 사용자 확인)`** | **사용자** | 운영 DB 마이그레이션 적용·확인 쿼리, 배포, 한 게임에 세 번째 분류 축 추가·390/900/1280 화면 및 필터 확인 | 사용자가 운영 적용·배포·화면·필터 확인을 마쳤다고 알림(세부 결과 기록은 사용자 말뿐). 후속 필터 칩 다시 누르면 `전체`로(`main` `aebb7dc`) 사용자 dev 서버 확인 완료 |

#### 📝 `r117-classification-axes-3` 핵심 요약 (2026-11-27)

- **구현**: `is_valid_classification_schema`의 축 상한 `> 2` → `> 3`(기존 0~2축 게임 불변), `TEMPLATE_AXIS_MAX_COUNT = 3`·정규화 `slice(0, 3)`, 관리자 템플릿 폼 문구·`축 추가` 상한, 3축 요청 모달 회귀 테스트, `R52` 명세 갱신, 후속으로 필터 칩을 다시 누르면 `전체`로 돌아감(`main` `aebb7dc`).
- **리뷰·검증**: Iteration 01 `R117-REV-001`·`002` 보완 후 Iteration 02 clean. 🐳 격리 DB 업그레이드·신규 경로 각 2회 멱등·`TESTS.sql` 63개 PASS, Vitest 1,150개·`next build` 통과.
