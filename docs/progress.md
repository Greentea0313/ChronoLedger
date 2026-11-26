# 프로젝트 진행 현황
- **2026-11-26 (`r110-desktop-auto-update` Step 3 — GPT Codex)**: 정적 리뷰 `clean`, `tsc`·lint·배너 테스트 8개·`cargo check` 통과. 전체 Vitest는 기존 대시보드 테스트 1건 실패, `next build`는 `.next` 디렉터리 생성 `EPERM`으로 실패해 산출물 `46dd615` 기록 후 병합 보류함. 원인 해소 후 재검증 필요.
- **2026-11-26 (`r110-desktop-auto-update` Step 1 — Claude Opus)**: updater·process 플러그인, NSIS 업데이트 번들·`pubkey`·endpoint, 앱 버전 0.2.0, 릴리스 워크플로(`desktop-v*`, 버전 일치 검사, `tauri-action@v1.0.0`) 구현, 워크트리 `2003475`(`cargo check`·tsc·lint·Vitest 1076개 통과, 서명 빌드·Actions 실행은 Step 4에서 확인). Step 2(`Claude Sonnet (Medium)`, 배너·래퍼) `▶ READY`.
- **2026-11-26 (`R110-REG` Run 등록 — Claude Sonnet `Medium`, Hydrogen 대체)**: Run `r110-desktop-auto-update` 등록(워크트리 `.worktrees/r110-desktop-auto-update`, Base `9096cd1`). Gemini 한도 소진으로 Step 1 `Claude Opus (High)`, Step 2 `Claude Sonnet (Medium)`, Step 3 `GPT Codex`로 배정함. 사용자 Step U0(서명 키·Secrets 준비) 대기, Step 1은 U0 완료 후 `▶ READY`.
- **2026-11-26 (`R110-SPEC` 명세 — Claude Opus, Carbon Fallback 1)**: Tauri 데스크톱 자동 업데이트 명세 [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) 작성(결정 `U1`~`U14`, Step U0·1~4 인수 기준, 모델 배정 권고). Run 등록(`R110-REG`, `Gemini 4 Hydrogen`) `▶ READY`, 사용자 Step U0 선행 필요.
- **2026-11-26 (협업 규칙 — 단계별 중간 기록 도입, Claude Opus `High`)**: Carbon이 `main` 병합 직후 쿼터 소진으로 큐 기록 없이 끊긴 일을 계기로 handoff 스킬 §1에 중간 기록 단계를 추가함(메이커 구현 커밋·리뷰어 산출물 커밋·`main` 병합 직후 해당 행 상태를 바꿔 `docs/handoff.md`만 바로 커밋). 강제 종료 복구는 `🔄 IN_PROGRESS (...)` 메모부터 이어받고, §3 비상 인수인계는 한도가 미리 보일 때만 쓰는 계획된 인수인계로 낮춤. 리뷰어·메이커 스킬, `collaboration.md` §4, `CLAUDE.md` 문구 반영, `Sync-Skills.ps1 -Check` 일치 확인.
- **2026-11-26 (`p4-followups-r107c-r109-r75` Step 3·4 — Gemini 4 Carbon `High` 리뷰·병합, Claude Opus `High` 마감 대체)**: 리뷰 `clean`·🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 56개 PASS, 산출물 `524cb2a`, `main` 병합 `ac752b6`(Carbon 토큰 소진으로 병합 직후 종료). Opus가 병합 후 `main` 재검증(`tsc`·`lint`·Vitest 1,076개·`build`)과 문서 마감 수행함. `R107C-REV-002` 운영 DB 적용·검증 완료(사용자). 남음: `main` push 배포.
- **2026-11-26 (`p4-followups-r107c-r109-r75` Step 2 — Claude Opus `High`)**: 워크트리 커밋 `66d4547`(미병합·미push). `R107C-REV-002` `chk_expense_auto_confirmed_status` 마이그레이션(위반 행 있으면 `NOT VALID`)·`SCHEMA.sql`·README, `R75-REV-001` R64 음성 테스트를 트리거·CHECK 방어선별로 분리. 🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 56개 PASS, `tsc`·`lint`·Vitest 1,076개 통과. 다음: Step 3 `Gemini 4 Carbon (High)`.
- **2026-11-26 (`p4-followups-r107c-r109-r75` Step 1 — Claude Sonnet `Medium`, Hydrogen 대체)**: 워크트리 커밋 `1c04860`(미병합·미push). `R109-REV-003` 배지 재조회, `R107C-REV-001` 구독 수정 시 `payment_method`·`point_platform` 동기화 및 Vitest 2건 추가, `tsc`·`lint`·Vitest 1,076개 통과. 다음: Step 2 `Claude Opus (High)`(🐳).
- **2026-11-26 (`r75-r64-tests-readme` Step 2 — Claude Sonnet `Medium`)**: Base `2d4317b` ↔ Target `d35bf3c` 정적 리뷰(P4 2건 비차단: `R75-REV-001·002`)·🐳 로컬 신규 스키마 `TESTS.sql` 2회 54개 PASS, 산출물 `7e4e989`, `main` 병합 `35d43b6`(미push) 및 문서 마감함. 운영 DB 작업 없음.
- **2026-11-26 (`r75-r64-tests-readme` Step 1 — Gemini 4 Neon `High`)**: 워크트리 커밋 `d35bf3c`(미병합·미push). `sql/tests/TESTS.sql` R64·R80 블록에 명세 §7 시나리오(관리자 INSERT·UPSERT `updated_at` 갱신·DELETE, 일반 사용자·`user_metadata` 스푸핑·`anon` 쓰기 거부, 승인 게임 조회·`games_status_check`+RLS 정책 검증, non-WebP·`https://`·20,001자·잘못된 `axis_key`·빈 옵션·없는 축/옵션 `23514` 메시지 단위 검증, 순서 변경 유지·옵션/축 제거·게임 삭제 CASCADE) 보강 및 `sql/README.md` R64 행 upsert 안내 추가. 🐳 로컬 DB `TESTS.sql` 54개 PASS·R64+R80 재실행 멱등·확인 쿼리 4종·`git diff --check`·`tsc`·`lint` 통과. 다음: Step 2 `Claude Sonnet (Medium)` 🐳 리뷰·병합.
- **2026-11-26 (`R107-C` 운영 DB 적용 및 확인 쿼리 검증 완료 — 사용자)**: `MIGRATION_R107C_AUTO_CONFIRM.sql` 운영 적용, README 확인 쿼리 3종(컬럼 3행·제약 `1, true`·함수 권한) 기대값 일치 확인함. 남음: 앱 배포(`main` push)·구독 모달 `자동 확정` 동작 1회 확인(사용자).
- **2026-11-26 (`r107c-auto-confirm` Step 4 — Claude Sonnet `Medium`, Hydrogen 대체)**: `p4-followups-r108-r109` 기록과 `R107-C` Step 1~3 상세 기록을 `handoff-archive.md`로 이관하고 `handoff.md` 마감함(`main` 병합 `9268bf0`). 남음: 운영 DB `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 → 배포(사용자).
- **2026-11-26 (`r107c-auto-confirm` Step 3 — Gemini 4 Carbon `High`)**: Base `3a9e313` ↔ Target `451ab5e` 통합 정적 리뷰(차단 0건, 비차단 P4 2건: `R107C-REV-001·002`)·🐳 로컬 Supabase 업그레이드/신규 설치 2경로 각 2회 멱등·확인 쿼리 3종·`TESTS.sql` 54개 블록 PASS·`C-5` 2세션 병렬 3종·`tsc`·`lint`·Vitest 78파일/1,074개·`next build`(16페이지) 통과, 산출물 `f8d9aed`, `main` 병합 `9268bf0`(미push). 다음: Step 4 `Gemini 4 Hydrogen (Medium)` 아카이브 마감 및 운영 적용 안내 `▶ READY`.
- **2026-11-26 (`r107c-auto-confirm` Step 2 — Gemini 4 Hydrogen `Medium`)**: 워크트리 커밋 `451ab5e4292534fc0f5165fceb4bf9875af06a8b`(7파일, 미병합·미push). 구독 모달 스토어 결제수단/`auto_confirm` 토글·미적용 폴백, 지출 목록/상세 `'자동 확정'` 배지·별도 조회(D15), `expense-detail-modal` 환불 시 클라이언트 롤백 호출 제거, `restore_cancelled_expense` `23505` 안내 및 테스트(`C-4` 월 경계·`C-11`) 보강. `git diff --check`·`tsc`·`lint`·Vitest 78파일/1,074개 통과. Step 3(**Gemini 4 Carbon `High`**, 🐳) `▶ READY`.
- **2026-11-26 (`r107c-auto-confirm` Step 1 — Claude Opus `High`)**: 워크트리 커밋 `1094f84`(미병합·미push). `MIGRATION_R107C_AUTO_CONFIRM.sql` 신설(템플릿 `auto_confirm`·결제 core 추출·`auto_confirm_due_expenses`·일 배치 2단계·`INTERVAL_30` 환불 롤백 원자화·`EXPENSE_AUTO_CONFIRMED`) 및 `SCHEMA.sql`·README·`TESTS.sql`·타입 반영. 🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 54개 PASS·2세션 병렬 3종, `tsc`·`lint`·Vitest 1,068개 통과. 다음: Step 2 `Gemini 4 Hydrogen (Medium)`.
- **2026-11-26 (수동 검증 항목 완료 기록 — 사용자 확인, Claude Sonnet `Medium` 문서 반영)**: `to-do.md`의 실환경 수동 검증 항목(배포 환경 anon RLS·스크린리더·OAuth 왕복, UI 키보드/스크린리더·대비, Cloudflare Pages 이관 검증, 실브라우저 390/900/1280·라이트 테마, 7.4 Web/PWA 회귀·배포 빌드, `T2`~`T4` Windows 실기기 확인)을 완료로 표시함. 항목별 상세 결과는 사용자 기록 없음.
- **2026-11-25 (`p4-followups-r108-r109` Step 3 — Claude Opus `High`, Claude Sonnet 대체)**: Base `9efde83` ↔ Target `d7e5139` 정적 리뷰(P4 1건 비차단: 배지 수 캐릭터 저장·삭제 후 미갱신 → `R109-REV-003`)·`tsc`·`lint`·Vitest 78파일/1,068개·`build` 통과, 산출물 `ccbf53a`, `main` 병합 `c52705c`. `R109-REV-001·002`·`R108-REV-001` 완료. 남음: `main` push 배포.
- **2026-11-25 (`p4-followups-r108-r109` Step 2 — Gemini 4 Hydrogen `Medium`)**: 워크트리 커밋 `d7e5139ed1c93bb2fd0bb70192f3e9fba6c8a9f8`(미병합·미push). `R108-REV-001`(`send-notifications/index.ts` `cryptoOverrides` 주입 및 `web-push-crypto.test.ts` 전역 스파이 제거) 반영. `git diff --check`·`tsc`·`lint`·Vitest 78파일/1068개 통과. Step 3(**Claude Sonnet `Medium`** 리뷰·빌드·병합) `▶ READY`.
- **2026-11-25 (`p4-followups-r108-r109` Step 1 — Gemini 4 Hydrogen `Medium`)**: 워크트리 커밋 `750331c69c652c5eea82b1ed1b54c803f80ccd21`(미병합·미push). `R109-REV-001`·`002`(`admin/page.tsx` `handleBulkMigrateGameAssets` 1,000행 `.range()` 페이지네이션·`fetchPendingCharacterAssetCount` 서버 `count` 배지 반영) 및 Vitest 보강. `git diff --check`·`tsc`·`lint`·Vitest 78파일/1068개 통과. Step 2(`Gemini 4 Hydrogen Medium`, `R108-REV-001`) `▶ READY`.
- **2026-11-25 (페이지 전환 가로 흔들림 수정 — Claude Sonnet `Medium`, `main` 직접 수정)**: 스크롤바 유무 차이로 내용이 가로로 밀리던 현상을 `src/app/globals.css` `html`의 `scrollbar-gutter: stable`로 완화함. 사용자 배포 후 확인 필요(미확인).
- **2026-11-25 (`R109` 운영 적용·일괄 이전 완료 — 사용자)**: 운영 DB 마이그레이션·배포·`/admin` 아이콘 Storage 일괄 이전 완료, `data:%` 잔여 건수 games 0·characters 0, REST 응답 크기 감소 확인함. 남음: 선택 후속 `R109-REV-001·002`·`R109-CLEANUP`(사용자 지목 시).
- **2026-11-25 (`r109-icon-storage-migration` Step 4 — Claude Sonnet `Medium`, Hydrogen 대체)**: `t4-rust-build-and-lock` 기록과 `R109` Step 1~3 상세 기록을 `handoff-archive.md`로 이관하고 `handoff.md` 마감함(`main` 병합 `7f54ef1`, 미push). 남음: 운영 DB 적용(`MIGRATION_R109_GAME_ASSETS_STORAGE.sql`) → 앱 배포 → `/admin` `[아이콘 Storage 일괄 이전]` 1회 실행(사용자).
- **2026-11-25 (`r109-icon-storage-migration` Step 3 — Gemini 4 Carbon `High`)**: Base `358fd4b` ↔ Target `8dfd5f1` 통합 정적 리뷰(차단 0건, 비차단 P4 2건: `R109-REV-001·002`)·🐳 로컬 Supabase 업그레이드/신규 설치 2경로 각 2회 멱등·확인 쿼리 4종·`TESTS.sql` 51개 블록 PASS·`tsc`·`lint`·Vitest 78파일/1,067개·`next build`(16페이지) 통과, 산출물 `fe7fbc7`, 선행 문서 보존 `f97b3c0`, `main` 병합 `7f54ef1`(미push). 다음: Step 4 `Gemini 4 Hydrogen (Medium)` 아카이브 마감 및 운영 이전 안내 `▶ READY`.
- **2026-11-25 (`r109-icon-storage-migration` Step 2 — Gemini 4 Neon `High`)**: 워크트리 커밋 `8dfd5f1`(미병합·미push). `src/lib/game-asset-storage.ts` 신설(SHA-256 해시 파일명·1년 캐시·유효 WebP 무손실 디코딩·기이전/로컬 경로 단락), `pickup-character-registration.ts`·`/admin` 등록/수정 및 `[아이콘 Storage 일괄 이전]`(게임+캐릭터 멱등 이전, 기존 R30 역변환 대체)·`/admin/requests` 게임/캐릭터/일정(`p_pickup_icon_overrides`) 승인 업로드 전환, `public/sw.js` `chronoledger-game-assets-v1` Cache-First(상한 500, `user-icons` 비개입) 구현 및 테스트 5파일 보강. `git diff --check`·`tsc`·`lint`·Vitest 78파일/1,067개 통과. 다음: Step 3 `Gemini 4 Carbon (High — 도구에서 High 선택)` 🐳 통합 리뷰·병합.
- **2026-11-25 (`r109-icon-storage-migration` Step 1 — Claude Opus `High`)**: 워크트리 커밋 `5b44d15`(미병합·미push). `MIGRATION_R109_GAME_ASSETS_STORAGE.sql` 신설(공개 `game-assets` 버킷·관리자 전용 쓰기 RLS·해시 경로 강제, 픽업 제안 `https://` 허용, `approve_schedule_request(UUID, JSONB DEFAULT NULL)` 오버라이드·1인자 오버로드 제거) 및 `SCHEMA.sql`·`README.md`·`TESTS.sql`·타입·`CLAUDE.md` 반영. 🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 51개 PASS, `tsc`·`lint`·Vitest 1,050개 통과. 다음: Step 2 `Gemini 4 Neon (High)`.
- **2026-11-25 (`r109-icon-storage-migration` Run 등록 — Gemini 4 Hydrogen `Medium`)**: `New-CollaborationRun.ps1`로 격리 워크트리(`.worktrees/r109-icon-storage-migration`, Base `358fd4b`, 브랜치 `collab/r109-icon-storage-migration`) 생성 및 Step 1(`Claude Opus (High — 도구에서 High 선택)` 🐳 Storage RLS·SQL·타입) `▶ READY` → Step 2(`Gemini 4 Neon (High)` 업로드·관리자/일괄 이전·SW 캐시) → Step 3(`Gemini 4 Carbon (High)` 🐳 통합 리뷰·병합) → Step 4(`Gemini 4 Hydrogen (Medium)` 마감) 큐를 등록함.
- **2026-11-25 (`R109` 아이콘 이미지 Storage 이전 Chief Architect 명세 확정 — Gemini 4 Carbon `High`)**: 사용자 질문 카드 결정 4건(`D1`~`D4`: 공개 읽기 공용 버킷 `game-assets`·해시 파일명 즉시 착수 및 비공개 `user-icons` 유지, `public/sw.js` Cache-First 이미지 캐시 상한 500개, 요청 단계 Data URL 유지 + 관리자 승인 시 자동 업로드 + `/admin` 1클릭 일괄 이전 버튼으로 R30 역변환 대체, 과도기 공존 유지·64×64 분류 아이콘 제외·후속 `R109-CLEANUP` 분리)을 확정해 `docs/r109-icon-storage-migration-spec.md`를 작성하고 `icon-storage-migration-review.md`·`handoff.md`·`to-do.md`를 갱신함(`src/**`·`sql/**` 미수정). Row 2(**Gemini 4 Hydrogen (`Medium`)** 격리 워크트리 `r109-icon-storage-migration` 생성·Run 등록) `▶ READY` 반환.
- **2026-11-25 (`t4-rust-build-and-lock` Step 2 — Claude Sonnet `Medium`)**: Base `ae56b57` ↔ Target `2387bcd` 정적 리뷰(`Cargo.lock` 추가 18줄만, 지적 0건)·`cargo check --locked`·`tsc`·`lint`·Vitest 1,050개·`build`(더미 환경변수) 통과, 산출물 `501b587`, `main` 병합 `2829bb7`(미push). Run 마감. `T4` 실기기 로그인·`single-instance` 확인은 사용자 몫.
- **2026-11-25 (`t4-rust-build-and-lock` Step 1 — Gemini 4 Hydrogen `Medium`)**: `.worktrees/t4-rust-build-and-lock`에서 `cargo check`·`npm run tauri build`(`app.exe` 릴리스 빌드 성공, `T1T4-REV-002` 오류 없음) 통과 및 `src-tauri/Cargo.lock` 갱신 커밋 `2387bcd`(`tsc`·`lint`·`diff-check`·Vitest 77파일/1,050개 통과, 미push). Step 2(`Claude Sonnet (Medium)` 리뷰·병합) `▶ READY`.
- **2026-11-25 (`t4-rust-build-and-lock` Run 등록 — Gemini 4 Hydrogen `Medium`)**: Rust/Cargo 설치 환경 확인 후 `T4` 후속 Run(`.worktrees/t4-rust-build-and-lock`, Base `ae56b57`, 브랜치 `collab/t4-rust-build-and-lock`)을 등록하고 Step 1(`Gemini 4 Hydrogen Medium` — `cargo check`·`tauri build`·`Cargo.lock` 갱신)을 `▶ READY`로 전환함.
- **2026-11-25 (`R106-REV-002` 운영 DB 적용 및 Redirect URL 등록 완료 — 사용자)**: `MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 운영 적용·확인 쿼리 검증, Supabase Redirect URLs에 `chronoledger://auth/callback` 등록 완료함. 남음: `main` push 배포, Rust PC `cargo check`·`tauri build`·`Cargo.lock` 커밋 및 Windows 실기기 OAuth 확인(`T2`~`T4`).
- **2026-11-25 (`t1-t4-desktop-and-followups` Step 3 — Claude Opus `High`)**: Base `64c4317` ↔ Target `277dbdc` 통합 정적 리뷰(P4 3건 비차단: `Cargo.lock` 미갱신·Rust 컴파일 미검증, npm deep-link 2.0.0↔크레이트 2.6.1, 예전 데스크톱 SW 미해제)·`tsc`·`lint`·Vitest 77파일/1,050개·`next build`·🐳 로컬 업그레이드/신규 2경로 각 2회 멱등·`TESTS.sql` 49개 PASS 통과, 산출물 `b3467ba`, `main` 병합 `5e63007`(미push) 및 Run 마감함. `cargo check`·`tauri build`는 Rust 미설치로 미실행. 남음(사용자): 운영 DB `MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql` 적용·`main` push·Redirect URL `chronoledger://auth/callback` 등록·Rust PC 빌드와 실기기 OAuth 확인.
- **2026-11-25 (`t1-t4-desktop-and-followups` Step 2 — Gemini 4 Neon `High`)**: `T1`~`T3`(PKCE 단일화·`auth-adapter.ts`·`tauri-auth.ts` `getCurrent`/`onOpenUrl`·`AuthProvider` 딥링크/만료 세션 정리·`DashboardLayout` 로그아웃 `/auth` 복귀·SW 데스크톱 스킵·`src-tauri` `single-instance`/`register_all`) 및 `R106-REV-001`(알림 `[전체 삭제]` 인라인 2단계 확인) 구현, 워크트리 커밋 `277dbdc`(19파일, 미병합·미push). `git diff --check`·`tsc`·`lint`·Vitest 77파일/1050개·`next build`(16페이지) 통과함(현 PC Rust 미설치로 `cargo check`·`tauri build`·`Cargo.lock` 갱신 미실행). Step 3(`Claude Opus (High — 도구에서 High 선택)`, 🐳) `▶ READY`임.
- **2026-11-25 (`t1-t4-desktop-and-followups` Step 1 — Gemini 4 Neon `High`, GPT Codex 1순위 대체)**: `R106-REV-002`(`MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`: 삭제 알림 ID 조용한 종료·만료/성공 구독 정리) 및 `R101-REV-001`(`budget-calculations.ts`·`expenses/page.tsx`·테스트: 취소·환불 월간 구독 당월 고정비 제외/익월 유지) 구현, 워크트리 커밋 `57acd67`(미병합·미push). 🐳 로컬 Supabase 2경로 2회 멱등·확인 쿼리·`TESTS.sql` 49개 PASS·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1039개 통과함. Step 2(`Gemini 4 Neon (High — 도구에서 High 선택)` T1~T4 Auth·Tauri·알림 UI & 빌드) `▶ READY`임.
- **2026-11-25 (`t1-t4-desktop-and-followups` Run 등록 — Gemini 4 Hydrogen `Medium`)**: `New-CollaborationRun.ps1`로 격리 워크트리(`.worktrees/t1-t4-desktop-and-followups`, Base `64c4317`, 브랜치 `collab/t1-t4-desktop-and-followups`) 생성 및 Step 1(`GPT Codex` 🐳 SQL+예산) `▶ READY` → Step 2(`Gemini 4 Neon (High)` Auth·Tauri·UI·빌드) → Step 3(`Claude Opus (High)` 통합 리뷰·병합) 큐를 등록함.
- **2026-11-25 (`T1`~`T4` Windows 데스크톱 통합 및 `R101-REV-001`·`R106-REV-001·002` Chief Architect 명세 확정 — Gemini 4 Carbon `High`)**: 사용자 질문 카드 결정 4건(`D1`~`D5`: 웹·Tauri PKCE 단일화 및 해시 토큰 제거, 단일 Run `t1-t4-desktop-and-followups` 단계 구성 및 상단바 `[로그아웃]` 시 `/auth` 복귀, 취소·환불 월간 구독 당월 고정비 제외, 알림함 `[전체 삭제]` 인라인 2단계 확인 + `complete_push_notification_delivery` 삭제 알림 조용한 종료 SQL 포함)을 반영해 `docs/t1-t4-desktop-and-followups-spec.md`를 작성하고 `handoff.md`·`to-do.md`를 갱신함(`src/**`·`sql/**` 미수정). Row 2(**Gemini 4 Hydrogen (`Medium`)** 격리 워크트리 생성 및 Run 등록) `▶ READY` 반환.
- **2026-11-25 (`R107-B` 운영 DB 적용 및 확인 쿼리 검증 완료 — 사용자)**: `MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql` 운영 적용·확인 쿼리 3종 검증 완료함. 남음: 앱 배포(`main` push), 이후 사용자 지목 시 `R107-C`.
- **2026-11-25 (`r107b-due-today-notification` Step 3 — Claude Sonnet `Medium`)**: Base `a6f14cc` ↔ Target `74bece6` 정적 리뷰 `clean`·`tsc`·`lint`·Vitest 1,037개·`build`·🐳 로컬 업그레이드/신규 2경로 각 2회 멱등·`TESTS.sql` 49개 PASS, 산출물 `0589844`, `main` 병합 `a84c6de`(미push) 및 문서 마감함. 남음: 사용자 운영 DB 적용(`MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql`)·앱 배포, 이후 사용자 지목 시 `R107-C`.
- **2026-11-25 (`r107b-due-today-notification` Step 2 — Gemini 4 Hydrogen `Medium`)**: 워크트리 커밋 `74bece6ecbdc81a81b6b19610852ae18d4b4458e`(미병합·미push). `NotificationSettingsCard`에 `'오늘 결제 예정'` 토글·컬럼 미적용(`42703`/`PGRST204`) 폴백 숨김, `database.types.ts` `'EXPENSE_DUE_TODAY'`/`expense_due_today`, 설정 테스트 3건 추가함. `git diff --check`·`tsc`·`lint`·Vitest 76파일/1037개 통과. Step 3(**Claude Sonnet `Medium`**, 🐳) `▶ READY`.
- **2026-11-25 (`r107b-due-today-notification` Step 1 — Gemini 4 Neon `High`)**: `MIGRATION_R107B_DUE_TODAY_NOTIFICATION.sql` 신설 및 `SCHEMA.sql`·`sql/README.md`·`sql/tests/TESTS.sql` 반영(`notifications_kind_check` `'EXPENSE_DUE_TODAY'` 추가, `notification_settings.expense_due_today` 추가, `enqueue_daily_notifications()` 4번 절 당일 요약·민감정보 비노출·멱등), 워크트리 커밋 `2e325cf`(미병합·미push). 🐳 로컬 Supabase 업그레이드·신규 2경로 2회 멱등·확인 쿼리 3종·`TESTS.sql` 49개 PASS·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1034개 통과함. Step 2(`Gemini 4 Hydrogen (Medium)` UI·타입 & Vitest) `▶ READY`임.
- **2026-11-25 (`R107-B` Run 2 `r107b-due-today-notification` 등록 — Gemini 4 Hydrogen `Medium`)**: `New-CollaborationRun.ps1`로 격리 워크트리(`.worktrees/r107b-due-today-notification`, Base `a6f14cc`, 브랜치 `collab/r107b-due-today-notification`) 생성 및 Step 1(`Gemini 4 Neon (High — 도구에서 High 선택)` SQL/Migration/Tests, 🐳) `▶ READY` → Step 2(`Gemini 4 Hydrogen (Medium)` UI/Types/Tests) → Step 3(`Claude Sonnet (Medium)` Reviewer & Orchestrator, 🐳) 큐를 등록함.
- **2026-11-25 (`R107-A` 운영 DB 적용 및 확인 쿼리 검증 완료 — 사용자)**: `MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql` 운영 적용 및 확인 쿼리 검증 완료함. 남음: 앱 배포(`main` push) 및 1주 관찰 후 `R107-A-CLEANUP`, 사용자 지목 시 `R107-B`(`r107b-due-today-notification`) 착수 가능함.
- **2026-11-25 (`r107a-server-subscription-generation` Step 4 — Gemini 4 Hydrogen `Medium`)**: `r108-review-followups-p4`를 `docs/archive/handoff-archive.md`로 이관하고 `handoff.md`·`changelog.md`·`progress.md` 마감 완료함(`main` 병합 `7aa2984`). 운영 DB 적용(`MIGRATION_R107A_SERVER_SUBSCRIPTION_GENERATION.sql`)·`main` push 배포 및 1주 관찰 후 `R107-A-CLEANUP`·Run 2 착수 안내함. 다음 대기 과제는 `T1`~`T4` `📐 SPEC_NEEDED`(`Gemini 4 Carbon High`)임.
- **2026-11-25 (`r107a-server-subscription-generation` Step 3 — Gemini 4 Carbon `High`)**: 원격 브랜치 복원 후 Base `ff04d84` ↔ Target `372b37b` 정적 리뷰(P4 2건 비차단: `R107A-REV-001·002`)·🐳 로컬 Supabase 업그레이드/신규 설치 2경로 각 2회 멱등·확인 쿼리·`TESTS.sql` 48개 블록 PASS·2세션 병렬 `FOR UPDATE` 직렬화 검증·`tsc`·`lint`·Vitest 1,026개·`next build`(16페이지) 통과, 산출물 `1cd8ad4`, `main` 병합 `7aa2984`(미push). Step 4(`Gemini 4 Hydrogen Medium` 마감·운영 적용 안내) `▶ READY` 전환(`T1`~`T4` `📐 SPEC_NEEDED` 별도 대기).
- **2026-11-25 (페이지 로딩 지연 완화 — Claude Sonnet `Medium`, `main` 직접 수정)**: 사용자 요청으로 ① `public/sw.js` 읽기 캐시 저장을 `event.waitUntil` 백그라운드로 전환(`sw.test.ts` 2건 추가), ② 캐릭터 페이지 선택 게임 캐릭터 조회를 개수 조회와 병렬 시작·커스텀 게임 아이콘 다운로드를 첫 표시와 분리(테스트 2건 추가, 옛 코드에서 실패 확인), ③ 근본 방법 검토 문서 `docs/icon-storage-migration-review.md` 작성과 `R109`(착수 결정 전) 예약. 실측 전이며 배포 후 Network 탭 확인 필요.
- **2026-11-25 (푸시 큰 아이콘 투명화 — Claude Sonnet `Medium`, `main` 직접 수정)**: 사용자 실기기 확인에서 알림창 우측 큰 이미지가 `icon-192.png`의 어두운 둥근 사각형 배경 때문에 검은 사각형으로 보임. 투명 심볼 `push-icon-192.png`를 파비콘 원본에서 만들어 `sw.js` `icon`과 셸 캐시 `v8`로 교체하고 `sw.test.ts`(v8·RGBA 검사)·`known-pitfalls.md` 갱신. `tsc`·`lint`·`sw.test.ts` 12개 통과, 실기기 재확인 필요.
- **2026-11-25 (`r108-review-followups-p4` Step 2 — Claude Sonnet `Medium`)**: Base `6c95c0e` ↔ Target `a1a4ceb` 정적 리뷰(P4 1건 비차단: RFC 벡터 테스트가 전역 스파이에 결합)·`tsc`·`lint`·Vitest 1,028개·`build`(더미 환경변수) 통과, 산출물 `67fc9bf`, `main` 병합 `32ea55d`(미push). Run 마감.
- **2026-11-25 (`r108-review-followups-p4` Step 1 — Gemini 4 Hydrogen `Medium`)**: `R39-REV-01`(`notification_settings.Update.user_id` 선택)·`R96-REV-05`(RFC 8291 Appendix A 고정 벡터 복호화·Edge Function 암호화 일치 테스트)·`R97-REV-001`(`ensurePermission()` 예외 시 `seenIds` 보존·재시도) 반영, 워크트리 `a1a4ceb`(`tsc`·`lint`·`diff-check`·Vitest 76파일/1,028개 통과, 미push). Step 2(`Claude Sonnet (Medium)` 리뷰·`next build`·병합) `▶ READY`.
- **2026-11-25 (`r108-review-followups-p4` 병행 Run 등록 및 `T1`~`T4` `SPEC_NEEDED` 접수 — Gemini 4 Hydrogen)**: 미커밋된 `r107a` Step 2 문서를 커밋(`6c95c0e`)한 뒤, ① P4 선택 후속 3건(`R39-REV-01`·`R96-REV-05`·`R97-REV-001`) 격리 워크트리(`.worktrees/r108-review-followups-p4`, Base `6c95c0e`) 생성·Step 1(`Gemini 4 Hydrogen Medium`) `▶ READY` 등록, ② `T1`~`T4`(Windows 데스크톱 통합) 및 `R101-REV-001`·`R106-REV-001·002`는 `Gemini 4 Carbon (High)` `📐 SPEC_NEEDED`로 접수함.
- **2026-11-25 (`r107a-server-subscription-generation` Step 2 — Gemini 4 Neon `High`)**: `subscription-sync.ts` 3종(`ensure_subscription_expenses`·`advance_interval_subscription`·`rollback_interval_subscription`) RPC 전환 + `PGRST202`/`42883` Legacy 폴백·비차단 처리, `database.types.ts` 5개 RPC 추가, `subscription-sync.test.ts`·`expenses/page.test.tsx` 보강, 워크트리 커밋 `372b37b`(`tsc`·`lint`·`diff-check`·Vitest 76파일/1,026개 통과, `⚠️ LOCAL_DB_DEFERRED` 유지, 미push). Step 3(`Gemini 4 Carbon (High — 도구에서 High 선택)`, Fallback `GPT Codex`, 🐳 Docker 필요) `▶ READY`임.
- **2026-11-25 (`r107a-server-subscription-generation` Step 1 — Claude Opus)**: 정기 지출 생성 SQL 단일 구현·INTERVAL_30 유니크 인덱스·advance/rollback RPC·일 배치·cron 및 `SCHEMA.sql`·README·`TESTS.sql` `R107A-01~03` 작성, 워크트리 `d82f38f`(tsc·lint·Vitest 1026개 통과, SQL 미실행 `⚠️ LOCAL_DB_DEFERRED`). Step 2(`Gemini 4 Neon (High)`, 클라이언트 RPC 전환) `▶ READY`, 브랜치 미push.
- **2026-11-25 (`R107` Run 1 등록 — Claude Opus, Hydrogen 대신 사용자 지시)**: 미커밋 R107 명세를 보존 커밋(`ff04d84`)하고 `r107a-server-subscription-generation` 격리 워크트리(Base `ff04d84`, 매니페스트 `3cf2f64`)를 생성함. Step 1(`Claude Opus (High)`, SQL Maker, 🐳) `▶ READY` → Step 2 `Gemini 4 Neon` → Step 3 `Gemini 4 Carbon` 리뷰 → Step 4 `Hydrogen` 마감.
- **2026-11-25 (`R96` 진행 상태 대조 — Claude Opus)**: 문서·Git·운영 Supabase(읽기 전용) 대조 결과 DB 객체·`pg_cron` 4잡·Edge Function(`verify_jwt: false`, 저장소 최신본과 동일) 모두 문서와 일치함. `to-do.md`의 `R96-REV-05·06`을 `R96-REV-05`로 정정(`7da3ae0`)하고 병합된 `.worktrees/r96-web-push`·로컬 `collab/r96-web-push` 브랜치를 정리함. 남은 일: 안드로이드 배지 아이콘 확인(사용자), `R96-REV-05`(선택).
- **2026-11-25 (Antigravity 공용 쿼터 구조 및 쿼터 풀 대체 체인 보정 마감 — Gemini 4 Argon)**: 사용자 질문 카드 결정 3건(① `Hydrogen`·`Neon`·`Carbon`의 Antigravity `Gemini Models` 주간·5시간 공용 한도 공유 명시 및 `Hydrogen (Medium)` 기본 사용 사유를 공용 한도 턴당 차감량 절약·응답 속도 최적화로 정정, ② 난이도 승격과 한도 소진 대체를 분리해 `Gemini Pool` 한도 소진 시 같은 묶음을 건너뛰고 `Claude`/`GPT Codex`/`GitHub Copilot` 풀로 즉시 인계, ③ 도구 UI 초기값 `Medium` 대비 `High` 모델 전환 시 `'도구에서 High 선택'` 병기 및 `GPT-OSS 120B`는 비상 백업 참고로만 유지)을 `.agents/rules/collaboration.md`, `handoff/SKILL.md`(`.claude/skills/` 동기화), `docs/collaboration-guide.md`에 반영하고 마감함(활성 Run 없음).
- **2026-11-25 (Antigravity 쿼터 구조 조사 인계 — Claude Opus)**: Gemini 모델이 주간·5시간 공용 한도를 쓰는 사실을 확인해 쿼터 설명 오류·토큰 소진 대체 체인 무효 구간·추론 수준 기본값 불일치를 정리하고, `Gemini 4 Argon` 검토 행(`📐 SPEC_NEEDED`)으로 등록함.
- **2026-11-25 (협업 규칙 개정 Step 2 — Claude Opus)**: `Argon`→`Carbon` 인계·`Flash` 통합·기본 추론 수준 개정을 2차 검토함. 구참조 이상 없음, 추론 수준 예외 기준·서브에이전트 위임 금지 범위·큐 행 수준 표기 3건 보완 후 마감함. 활성 Run 없음.
- **2026-11-25 (협업 규칙 `Argon` $\to$ `Carbon` 인계·`Flash` 대체·모델별 추론 수준 명시 및 Opus 2차 검토 배정 — Gemini 4 Argon)**: 11월 30일 `Gemini 4 Argon`·`Gemini 3.8 Flash` 서비스 종료에 맞춰 ① `Gemini 4 Carbon (High)`이 Tier-3 Chief Architect & Final Gatekeeper를 전면 승계하고 `/swarm` 병렬 기능은 사용자 사전 제안·승낙 시에만 허용, ② `Gemini 3.8 Flash` 독립 행을 제거해 6대 모델 체제로 통합(`Gemini 4 Hydrogen (Medium)` 흡수, 세션 내 `invoke_subagent`는 `Model: "flash_lite"`/`"inherit"` 사용), ③ 모델별 기본 추론 수준(`Hydrogen: Medium`, `Sonnet: Medium`, `Neon: High`, `Carbon: High`, `Opus: High`)을 `.agents/rules/collaboration.md`, `.agents/skills/*`(`.claude/skills/*` 동기화), `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, `docs/collaboration-guide.md`에 반영함. Row 2(**`Claude Opus (High)`** 2차 검토 및 마감) `▶ READY`.
- **2026-11-25 (주간 문서 감사 Skill 개정 — Claude Opus)**: 감사 후 아카이브 이관(잘라 붙이기만, 관련 문서에 미커밋 변경 있으면 건너뜀)·보고서 커밋까지 자동 수행하고, 무인 실행은 `docs/handoff.md` `📣 사용자 알림 대기`에 알림을 남기게 함. handoff Skill §1 1단계에 알림을 답변 첫머리에서 전하고 같은 턴에 지워 커밋하는 규칙 추가함.

## 협업 규칙 개정(`Argon` $\to$ `Carbon` · `Flash` 대체) 요구사항 접수 (2026-11-25)

- **수행 주체**: Gemini 4 Hydrogen (`Intake`)임.
- **내용**: 11월 30일 `Gemini 4 Argon`·`Gemini 3.8 Flash` 서비스 종료에 대비해 `Argon` $\to$ `Carbon` 인계 적합성 검토 후 `docs/handoff.md`에 `📐 SPEC_NEEDED`(`Gemini 4 Argon`, Fallback: `Claude Opus` / `Gemini 4 Neon`)를 접수함.

## `R106` Run `r106-notification-delete` Step 3 리뷰·병합 완료 (2026-11-25)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Step 3)임.
- **결과**: 정적 리뷰 P4 2건(비차단, `R106-REV-001·002` 후속 등록), 산출물 `34a99bf`, `main` 병합 `0ddc229`. 활성 Run 없음.
- **검증**: 🐳 로컬 업그레이드·신규 설치 2경로 멱등·`TESTS.sql` 45개 PASS, tsc·lint·Vitest 76파일/1026개·build 통과(병합 후 재통과).
- **운영 적용**: 사용자가 운영 SQL Editor에서 `MIGRATION_R106_NOTIFICATION_DELETE.sql` 적용·확인 쿼리 검증·실배포 확인 완료함(2026-11-25).

## `R106` Run `r106-notification-delete` Step 2 알림 삭제 UI·테스트 구현 완료 (2026-11-25)

- **수행 주체**: Gemini 4 Hydrogen (`Maker`)임.
- **결과**: 워크트리 커밋 `61a4b17cb3e37cb5a7c310c85b23756c018cbfd8`(미병합·미push). `NotificationBell`에 헤더 `'전체 삭제'` 버튼 및 항목별 형제 `<button>` 개별 삭제 버튼, `isOffline()`·RPC 오류 가드와 Vitest 4건 추가함. `git diff --check`·`tsc`·`lint`·Vitest 76파일/1026개 전체 통과함.
- **다음 단계**: Step 3(**Claude Opus** `Reviewer & Orchestrator`, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon`)이 🐳 로컬 DB 검증·정적 리뷰·`next build`·`main` 병합 예정임.

## `R106` Run `r106-notification-delete` Step 1 DB/RPC/테스트·타입 구현 완료 (2026-11-25)

- **수행 주체**: Gemini 4 Neon (`GPT Codex` 1순위 대체, `Maker`)임.
- **결과**: 워크트리 커밋 `7fe58d2461b2f4bec4c14e260f53f96f527e148d`(미병합·미push). `MIGRATION_R106_NOTIFICATION_DELETE.sql` 신설 및 `SCHEMA.sql`·`sql/README.md`·`sql/tests/TESTS.sql`·`src/types/database.types.ts`에 `public.delete_notifications(UUID[])` RPC 및 검증 반영함.
- **검증**: 🐳 로컬 Supabase 업그레이드·신규 2경로 2회 멱등·확인 쿼리·`TESTS.sql` 45개 PASS·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1022개 전체 통과함.
- **다음 단계**: Step 2(**Gemini 4 Hydrogen**, Fallback 1: `Claude Sonnet` / `Gemini 4 Neon` — `NotificationBell` 삭제 UI & Vitest) `▶ READY`임.

## `R106` Run `r106-notification-delete` 격리 워크트리 등록 완료 (2026-11-25)

- **수행 주체**: Gemini 4 Hydrogen (`Orchestrator`, Row 1)임.
- **결과**: Row 0 미커밋 `docs/` 4개 파일 커밋(`cddb943`) 후 `New-CollaborationRun.ps1`로 `.worktrees/r106-notification-delete`(`collab/r106-notification-delete`, `run.json`) 생성 및 Step 1(`GPT Codex` DB/RPC/Migration/Tests & Types)을 `▶ READY`로 등록·전환함.
- **다음 단계**: **GPT Codex**가 `.worktrees/r106-notification-delete`에서 🐳 로컬 DB 검증을 포함해 `MIGRATION_R106_NOTIFICATION_DELETE.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 구현 예정임.

## `R106` 알림 직접 삭제 기능 Chief Architect 설계 및 수용 기준 확정 (2026-11-25)

- **수행 주체**: Gemini 4 Argon (`Chief Architect`, Row 0)임.
- **결과**: 사용자 질문 카드(항목별 개별 삭제 버튼 + 상단 헤더 `'전체 삭제'` 버튼 함께 제공)를 반영해 [`docs/push-notification-research.md`](push-notification-research.md) §12에 `public.delete_notifications(p_notification_ids UUID[] DEFAULT NULL) RETURNS INTEGER` `SECURITY DEFINER` RPC(하드 `DELETE`, `public.notifications` 직접 `DELETE` 권한 미부여, 비로그인·계정 삭제 대기 차단, 일일 알림 `enqueue_daily_notifications` 재삽입 없음 검증)와 `NotificationBell` 형제(sibling) `<button>` 접근성 구조·오프라인 가드 및 Run `r106-notification-delete` 단계별 수용 기준(Step 1 `GPT Codex` DB $\to$ Step 2 `Gemini 4 Hydrogen` UI $\to$ Step 3 `Claude Opus` 통합 리뷰)을 확정함.
- **다음 단계**: **Gemini 4 Hydrogen**(Fallback 1: `Gemini 4 Neon` / `Claude Sonnet`, Fallback 2: `GitHub Copilot`)이 Row 1(`▶ READY`)에서 미커밋 `docs/` 선행 커밋 후 `New-CollaborationRun.ps1 -RunId "r106-notification-delete"`로 격리 워크트리 및 Dispatch Queue를 등록함.

## `R96` 운영 배포 완료 확인 및 안드로이드 푸시 배지 수정 (`main` 직접 수정, 2026-11-25)

- **수행 주체**: Claude Opus임(사용자 보고 기반 `main` 직접 수정).
- **결과**: 사용자가 운영 4·5단계(`set_push_webhook_config`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) 적용 후 테스트 알림 `SENT`·실기기 수신 확인함. 처음 `PENDING`은 `pg_net` 비활성 때문이었고 활성화 후 재시도 잡이 발송함.
- **수정**: 안드로이드 상태 표시줄 흰 사각형 → 배경을 뺀 투명 컬러 배지 `public/icons/badge-96.png` 추가, `public/sw.js` `badge` 교체·사전 캐시 추가·`SHELL_CACHE` v7. tsc·lint·Vitest 76파일/1022개·build 통과.
- **다음 단계**: 배포 후 안드로이드에서 사이트를 한 번 열어 새 SW 적용 → 다음 푸시의 상태 표시줄 아이콘 확인(사용자).

## `R96-REV-07` Run `r96-rev07-webhook-config` Step 3 리뷰·병합 완료 (2026-11-24)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Step 3)임.
- **결과**: 정적 리뷰 clean(지적 0건), 산출물 `bf3d370`, `main` 병합 `7445447`. 활성 Run 없음.
- **검증**: 🐳 로컬 업그레이드·신규 설치 2경로 멱등·`TESTS.sql` 44개 PASS, `net.http_post` 스텁으로 3단계 조회 우선순위 확인, tsc·lint·Vitest 76파일/1021개·build 통과(병합 후 재통과).
- **다음 단계**: 사용자가 운영 SQL Editor에서 `MIGRATION_R96_WEBHOOK_CONFIG.sql` 적용 + `set_push_webhook_config` 등록 → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 반영 → 실기기 확인.

## `R96-REV-07` Run `r96-rev07-webhook-config` Step 2 DB/마이그레이션/테스트 구현 완료 (2026-11-24)

- **수행 주체**: Gemini 4 Neon (`GPT Codex` 1순위 대체, `Maker`)임.
- **결과**: 워크트리 커밋 `1514343279d78d19d18c9df5a2723a9b2cb73113`(미병합·미push). `MIGRATION_R96_WEBHOOK_CONFIG.sql` 신설 및 `MIGRATION_R96_WEB_PUSH.sql`·`SCHEMA.sql`·`sql/README.md`·`sql/tests/TESTS.sql` 동기화(`push_webhook_config` 단일 행 비공개 테이블·`set_push_webhook_config` 헬퍼·3단계 웹훅 조회) 완료함.
- **검증**: 🐳 로컬 Supabase 업그레이드/신규 2회 멱등·확인 쿼리 3종·`TESTS.sql` 44개 PASS·Vault 2순위 조회·`git diff --check`·`tsc`·`lint`·Vitest 76파일/1021개 전체 통과함.
- **다음 단계**: Step 3(**Claude Opus**, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon` — 정적 리뷰·로컬 DB 병합 게이트·`main` 병합·문서 마감) `▶ READY`임.

## `R96-REV-07` Run `r96-rev07-webhook-config` 격리 워크트리 등록 완료 (2026-11-24)

- **수행 주체**: Gemini 4 Hydrogen (`Orchestrator`, Step 1)임.
- **결과**: Row 0 미커밋 `docs/` 5개 파일 커밋(`91c7abd`) 후 `New-CollaborationRun.ps1`로 `.worktrees/r96-rev07-webhook-config`(`collab/r96-rev07-webhook-config`, `run.json`) 생성 및 Step 2(`GPT Codex` Maker)를 `▶ READY`로 전환함.
- **다음 단계**: **GPT Codex**가 `.worktrees/r96-rev07-webhook-config`에서 🐳 로컬 DB 검증을 포함해 `MIGRATION_R96_WEBHOOK_CONFIG.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql` 구현 예정임.

## `R96-REV-07` Chief Architect 웹훅 설정 저장소 설계 및 수용 기준 확정 (2026-11-24)

- **수행 주체**: Gemini 4 Argon (`Chief Architect`)임.
- **결과**: 호스팅 Supabase SQL Editor에서 `ALTER DATABASE postgres SET app.settings.send_notifications_*` 실행 시 발생하는 `42501: permission denied`를 해결하기 위해 [`docs/push-notification-research.md`](push-notification-research.md) §11.2.4·§11.5·§11.6에 단일 행 비공개 설정 테이블 `public.push_webhook_config`(`REVOKE ALL FROM PUBLIC, anon, authenticated, service_role` + RLS 무정책), SQL Editor 전용 등록 헬퍼 `public.set_push_webhook_config(p_url, p_secret)`, 3단계 설정 조회(`push_webhook_config` $\to$ 동적 `vault.decrypted_secrets` $\to$ `current_setting('app.settings.*')` 폴백) 및 증분 마이그레이션 `MIGRATION_R96_WEBHOOK_CONFIG.sql` 수용 기준을 확정함.
- **다음 단계**: 새 채팅 세션에서 **Gemini 4 Hydrogen**(Fallback: `Gemini 4 Neon` / `Claude Sonnet`)이 Run `r96-rev07-webhook-config` 워크트리를 생성·등록(`▶ READY`)한 뒤 Step 2(`GPT Codex` Maker)로 인계함.

## R105 대시보드 상태바 개편 완료 — `main` 병합 `fe5bf77` (2026-11-24)

- **수행 주체**: Claude Sonnet (Step 1 Maker `3271d5d`) → Gemini 4 Hydrogen (Step 2 Reviewer & Orchestrator).
- **결과**: Base `d1e18b4` ↔ Target `3271d5d` 정적 리뷰 **clean**(지적 0건, 산출물 `e363cc4`). 워크트리 `tsc`·`lint`·Vitest 76파일/1021개·`next build`(16페이지) 통과 후 `main` 병합(`fe5bf77`), 병합 후 검증 모두 통과함. 활성 Run 없음.
## R105 대시보드 상태바 개편 구현 (2026-11-24)

- **수행 주체**: Claude Sonnet (Run `r105-dashboard-summary-bar` Step 1)임.
- **결과**: 워크트리 커밋 `3271d5d`(미병합, 원격 push 안 함). 상태바를 4칸 인터랙티브 카드(오늘 일정·이번 주 관심 일정·이번 주 예정 지출·월 예산 잔여 페이스 바)로 개편하고 클릭 연계를 구현함. tsc·lint·Vitest 76파일/1021개 통과함.
- **미확인**: `next build`·실브라우저 반응형.
- **다음 단계**: Step 2(`Gemini 4 Hydrogen`, 리뷰·병합·마감) `▶ READY`임.

- **2026-11-24 (`r96-web-push`·`r102-expense-presets` Step 3 — Claude Opus)**: r96 iteration-02 리뷰(P3 1건·P4 2건 비차단)·🐳 로컬 DB 2회·`TESTS.sql` 43개 PASS 후 `main` 병합 `18d5f0c`. r102 iteration-01 리뷰에서 r96과 탈퇴 정리 함수 충돌(P2) 발견 → iteration-02(`56e4ab8`)로 `main` 반영·충돌 해결·R102 마이그레이션 본문 보정, 🐳 R96+R102 각 2회·`TESTS.sql` 44개 PASS 후 `main` 병합 `9ff2ae6`. 병합 후 `main` tsc·lint·Vitest 76파일/1013개 통과. 운영 DB 적용(R96 → R102)·확인 쿼리 기대값 확인 완료(사용자, 2026-11-24). 남음: R96 배포 절차·실기기 확인(사용자).
- **2026-11-24 (`r102-expense-presets` Step 2 — Claude Sonnet)**: `ExpenseModal`에 프리셋 칩(게임+공통 필터·원클릭 채움)·`[프리셋 저장]`(20개 상한·오프라인·미적용 DB 안내)·`×` 삭제 구현, 워크트리 `bffa1e4`(tsc·lint·Vitest 993개 통과, 실브라우저·실DB 미확인). `LOCAL_DB_DEFERRED` 유지. Step 3(`Claude Opus` 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`.
- **2026-11-24 (`r102-expense-presets` Step 1 완료 — Gemini 4 Neon, GPT Codex 1순위 대체)**: 워크트리 커밋 `a6a36ed`(미병합·미push). `MIGRATION_R102_EXPENSE_PRESETS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영(`user_expense_presets`·20개 상한 트리거·본인 CRUD RLS·계정 삭제 대기 차단·탈퇴 정리). `tsc`·`lint`·`diff-check`·Vitest 74파일/977개 통과함. 현재 PC Docker 미설치로 `⚠️ LOCAL_DB_DEFERRED`이며 Step 2(`Claude Sonnet`, `ExpenseModal` 프리셋 UI & Vitest) `▶ READY`임.
- **2026-11-24 (`r102-expense-presets` 병행 Run 등록 — Gemini 4 Hydrogen)**: 1차 Run(`R101`+`R103`, `c942e1e`) 완료에 이어 `R102` 격리 워크트리(`.worktrees/r102-expense-presets`, Base `052e53a`) 생성 및 Dispatch Queue(Step 1 `GPT Codex` `▶ READY` → Step 2 `Claude Sonnet` → Step 3 `Claude Opus`) 등록함 (`r96-web-push`와 병행, DB 변경·🐳 Docker 필요).
- **2026-11-24 (`r101-r103-two-month-budget-and-shortcuts` Step 2 — Claude Sonnet)**: Base `4fbf67f` ↔ Target `8a53990` 정적 리뷰(P4 1건 비차단: 취소된 구독 회차의 고정비 과대 표시 가능)·`tsc`·`lint`·Vitest 977개·`build`(더미 환경변수) 통과, 산출물 `ef645b6`, `main` 병합 `c942e1e`(미push). Run 마감. 실브라우저 확인은 사용자 몫.
- **2026-11-24 (`r101-r103-two-month-budget-and-shortcuts` Step 1 — Gemini 4 Hydrogen)**: `R101`(2개월 예산·고정 구독비 비교 `budget-calculations.ts`·`TwoMonthBudgetCard`·`expenses/page.tsx`) 및 `R103`(접이식 `QuickStartGuide`·`dashboard/page.tsx` 키보드 단축키 `[`, `]`, `T`, `V`, `N`, `?` 및 포커스·모달 가드) 구현·테스트 추가, 워크트리 `8a53990`(`tsc`·`lint`·`diff-check`·Vitest 74파일/977개 통과, 실브라우저 미확인). Step 2(`Claude Sonnet` 리뷰·`next build`·병합) `▶ READY`.
- **2026-11-24 (`r101-r103-two-month-budget-and-shortcuts` 병행 Run 등록 — Gemini 4 Hydrogen)**: `R101`+`R103` 격리 워크트리(`.worktrees/r101-r103-two-month-budget-and-shortcuts`, Base `4fbf67f`) 생성 및 Dispatch Queue(Step 1 `Gemini 4 Hydrogen` `▶ READY` → Step 2 `Claude Sonnet`) 등록함 (`r96-web-push`와 병행, DB 변경 없음).
- **2026-11-24 (`R101`·`R102`·`R103` Chief Architect 명세 확정 및 `R104` 보류 — Gemini 4 Argon)**: 사용자 질문 카드 결정 4건(① DB 변경 없는 `R101`+`R103` 1차 Run 우선 착수 후 `R102` 2차 Run 분리, ② `R101` 익월 예산 폴백 및 미생성 활성 `MONTHLY_DAY` 정기 구독 고정비 합산 비교, ③ `R102` `public.user_expense_presets` 최대 20개 + 지출 모달 칩 원클릭 적용·삭제·**`[프리셋 저장]`** 버튼, ④ `R104` 천장 계산기 `⏸️ 보류`)을 확정하여 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md)를 작성함. 1차 Run `r101-r103-two-month-budget-and-shortcuts` 등록(`Gemini 4 Hydrogen` Orchestrator) `▶ READY`.
- **2026-11-24 (`R101`~`R104` 신규 기능 접수 — Gemini 4 Hydrogen)**: `docs/to-do.md`에 `R101`(2개월 예산 비교)·`R102`(DB 저장 과금 프리셋)·`R103`(단축키·선택형 빠른 시작 안내)·`R104`(천장 계산기 검토 안건)를 등록하고, `docs/handoff.md`에 Chief Architect(`Gemini 4 Argon`) `📐 SPEC_NEEDED`를 접수함.
- **2026-11-24 (`r96-web-push` iteration-02 Maker — Claude Opus)**: 리뷰 P2 3건·P3 수정(발송 5분 점유, 과거 알림 제외, 배포 절차 §11.5, 5분 재시도 cron), 워크트리 `e2dbc4d`(tsc·lint·Vitest 988개 통과, 로컬 DB 미실행). Docker PC에서 iteration-02 리뷰·로컬 DB 검증 후 병합 필요, 브랜치 미push.
- **2026-11-24 (`r96-web-push` Step 3 리뷰 — Claude Opus)**: Base `54a1224` ↔ Target `c3940c5` 리뷰·테스트 아티팩트 `bd24e4f`(워크트리). P2 3건(동시 웹훅 중복 발송, 기존 `PENDING` 알림 일괄 발송, Edge Function JWT 검증으로 웹훅 차단·배포 절차 부재)·P3 1건·P4 2건. tsc·lint·Vitest 987개·build 통과, 로컬 DB 미실행(Docker 미설치)으로 `🛑 BLOCKED`, 병합 보류.
- **2026-11-24 (`r96-web-push` Step 1·Step 2 완료 — Gemini 4 Neon, Step 1은 GPT Codex 1순위 대체)**: 워크트리 커밋 Step 1 `abdfd17`(`push_subscriptions`·RLS·4개 RPC·예외 격리 `pg_net` 웹훅·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts`) + Step 2 `c3940c5`(순수 Web Crypto RFC 8291/8292·Edge Function `send-notifications`·`sw.js` v6·`push-notifications.ts`·로그아웃 3곳·`NotificationSettingsCard`·테스트 19건 추가, 미병합·미push). `tsc`·`lint`·`diff-check`·Vitest 74파일/987개 통과함. 현재 PC Docker 미설치로 `⚠️ LOCAL_DB_DEFERRED`이며 Step 3(`Claude Opus`, 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`임.
- **2026-11-24 (`r96-web-push` Run 등록 — Gemini 4 Hydrogen)**: 사용자 확인 후 `docs/SW-01_*` 삭제 커밋(`54a1224`)으로 작업트리를 정리하고 `r96-web-push` 격리 워크트리(`.worktrees/r96-web-push`, Base `54a1224`) 생성 및 Dispatch Queue(Step 1 `GPT Codex` `▶ READY` → Step 2 `Gemini 4 Neon` → Step 3 `Claude Opus`)를 등록함.
- **2026-11-24 (`main` 작업트리 점검 — Gemini 4 Hydrogen)**: 미추적 `docs/SW-02_인터뷰문서.docx` 삭제 확인, Git 추적 파일인 `docs/SW-01_소프트웨어_개발_계획서.docx`·`.md` 2건이 워킹트리 삭제(`D`) 상태로 남아 있어 `r96-web-push` 격리 워크트리 생성 전 사용자 처리 확인(삭제 커밋 vs 복원) 대기 중.
- **2026-11-24 (`R96` Chief Architect 명세·수용 기준 확정 — Gemini 4 Argon)**: `origin/main`(`R39` 병합 `9ae05f9`·운영 DB 적용 `a98a621`)을 로컬 `main`에 병합하여 선행 의존성을 해소하고, 사용자 질문 카드 결정(`request_result` 토글 꺼짐 시 앱 내 알림은 유지하고 외부 푸시만 `SKIPPED`, 외부 패키지 없는 표준 Web Crypto RFC 8291/8292 구현 + `pg_net` 예외 격리)을 반영해 `docs/push-notification-research.md` §11(`public.push_subscriptions`·4개 RPC·순수 Web Crypto 모듈·Edge Function·`sw.js`·로그아웃 해제·설정 UI 및 Step 1~3 수용 기준)을 확정함. `r96-web-push` Run 등록(`Gemini 4 Hydrogen` Orchestrator) `▶ READY`.
- **2026-11-24 (`r39-daily-notifications` Step 3 — Claude Opus)**: Base `1af478b` ↔ Target `afc9a21` 정적 리뷰(P4 1건 비차단: 타입 `Update.user_id` 필수 표기)·🐳 로컬 DB 업그레이드 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 42개 PASS·tsc·lint·Vitest 960개·`next build` 통과 후 `main` 병합 `9ae05f9`함. 운영 DB 수동 적용·확인 쿼리 기대값 확인(사용자, 2026-11-24). 남음: 실브라우저·KST 09:00 알림 생성 확인.
- **2026-11-23 (`r97-tauri-notifications` Step 2 — Claude Sonnet)**: Base `0f8ce55` ↔ Target `390920f` 정적 리뷰(P4 1건 비차단: 권한 질의 예외 시 토스트 유실 가능)·`tsc`·`lint`·Vitest 960개·`cargo check`·`build`(더미 환경변수) 통과, 산출물 `e9c0ef4`, `main` 병합 `d350267`(미push). Run 마감. 실기기 OS 토스트 확인은 사용자 몫.
- **2026-11-23 (`r97-tauri-notifications` Step 1 — Gemini 4 Hydrogen)**: `src/lib/tauri-notifications.ts` 빈 초기 알림함 시드 누락·동시 호출 중복 발송·빈 제목/본문 폴백 보완 및 테스트 3건 추가, 워크트리 `390920f`(`cargo check`·`tsc`·`lint`·`diff-check`·Vitest 72파일/960개 통과, 실기기 `npm run tauri dev` OS 토스트 수신 및 개발 실행 시 `Windows PowerShell` 발신 표기 확인 완료). Step 2(`Claude Sonnet` 리뷰·병합) `▶ READY`.
- **2026-11-23 (`r97-tauri-notifications` 병행 Run 등록 — Gemini 4 Hydrogen)**: `r39-daily-notifications`와 별도로 `R97` 실기기 OS 토스트 동작 확인·엣지 케이스 보완 Run(`.worktrees/r97-tauri-notifications`, Base `0f8ce55`)을 등록하고 Step 1(`Gemini 4 Hydrogen`) `▶ READY`로 전환함.
- **2026-11-23 (`main` 직접 수정 — Gemini 4 Hydrogen)**: `src/app/favicon.ico`와 `public/favicon.ico`를 투명 배경 ChronoLedger 심볼 아이콘(`16×16`·`32×32`·`48×48`·`256×256` RGBA ICO)으로 교체함(`tsc`·`lint`·`diff-check`·Vitest 72파일/957개 통과).
- **2026-11-23 (`r39-daily-notifications` Step 2 — Claude Sonnet)**: 설정 화면 `알림 설정` 카드(일일 알림 3종 토글, `notification_settings` 부분 upsert, 오프라인·미적용 DB 폴백) 구현, 워크트리 `afc9a21`(tsc·lint·Vitest 960개 통과, 실브라우저·실DB 미확인). `LOCAL_DB_DEFERRED` 유지. Step 3(`Claude Opus` 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`.
## Run `r39-daily-notifications` Step 1 DB/RLS/`pg_cron` & Types 완료 (2026-11-23)

- **수행 주체**: Gemini 4 Neon (GPT Codex 1순위 대체, `Maker`)임.
- **결과**: 워크트리 커밋 `3d612ed`(미병합·미push). `MIGRATION_R39_DAILY_NOTIFICATIONS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영(`notification_settings`·RLS·탈퇴 정리·`enqueue_daily_notifications()`·KST 09:00 `pg_cron`). `tsc`·`lint`·`diff-check`·Vitest 71파일/952개 통과함.
- **보류 (`⚠️ LOCAL_DB_DEFERRED`)**: 현재 PC Docker 미설치로 로컬 Supabase 2회 멱등·`TESTS.sql` 검증은 미실행이며 Step 3(Docker 환경)에서 수행 필요함.
- **다음 단계**: Step 2(`Claude Sonnet`, Fallback: `Gemini 4 Hydrogen` / `GitHub Copilot` — 설정 화면 알림 토글 UI & Vitest) `▶ READY`임.

## Run `r39-daily-notifications` (`R39` 일일 정기 알림) 등록 및 활성화 (2026-11-23)

- **수행 주체**: Gemini 4 Hydrogen (`Orchestrator`, 사용자 선택)임.
- **내용**: 격리 워크트리 `.worktrees/r39-daily-notifications`(브랜치 `collab/r39-daily-notifications`, Base `1af478b`)를 생성하고 Step 1(`GPT Codex` — DB/RLS/`pg_cron` & Types)을 `▶ READY`로 등록함.
- **참고**: 현재 PC에 Docker Desktop 미설치로 Step 1은 SQL/타입/테스트 작성·정적 검증까지 수행하고, 로컬 DB 2회 적용·`TESTS.sql` 실행 검증은 Docker 환경(Step 3 또는 별도 PC)에서 수행하도록 명시함.

## Run `r85-schedule-times` 완료 — `main` 병합 `6204346` (2026-11-21)

- **수행 주체**: Claude Opus (Step 3 통합 리뷰·병합)임.
- **결과**: Base `be4b43f` ↔ Target `48086cc` 정적 리뷰 clean. 🐳 로컬 DB 업그레이드 2회 멱등·신규 `SCHEMA.sql`·`TESTS.sql` 41개 PASS, tsc·lint·Vitest 71파일/950개·`next build` 통과 후 `main` 병합함.
- **운영 DB**: `MIGRATION_R85_SCHEDULE_TIMES.sql` 수동 적용·README 확인 쿼리 모두 기대값 확인(사용자, 2026-11-21).
- **남음 (사용자)**: 실브라우저 확인.

## R85 일정 시각 공용 로직·UI 구현 (2026-11-21)

- **수행 주체**: Claude Sonnet (Run `r85-schedule-times` Step 2)임.
- **결과**: 워크트리 커밋 `48086cc`(미병합, 원격 push 안 함). `schedule-time.ts` 공용 로직, 일정 시각 입력(관리자 일정·게임 정보·요청 모달)과 표시(주차별·선택일·게임별 일정 모달·요청 화면), 미적용 DB 폴백 구현함. tsc·lint·Vitest 71파일/950개 통과함.
- **미확인**: 마이그레이션 적용 DB 실화면. **미구현**: 사용자용 게임별 일정 모달의 서버 초기화 시각 표시(후속 판단).
- **다음 단계**: Step 3(`Claude Opus`, 통합 리뷰·로컬 DB 검증·병합) `▶ READY`임.


## Run `r85-schedule-times` Step 1 DB/RLS/RPC & Types 완료 (2026-11-21)

- **수행 주체**: Gemini 4 Neon (GPT Codex 1순위 대체, `Maker`)임.
- **결과**: `MIGRATION_R85_SCHEDULE_TIMES.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영, 워크트리 커밋 `97a809f`(미병합·미push). 🐳 로컬 DB 마이그레이션 2회 멱등 + 신규 `SCHEMA.sql` 모두 `TESTS.sql` 41개 PASS, `tsc`·`lint`·Vitest 70파일/900개 통과함.
- **다음 단계**: Step 2(`Claude Sonnet`, Fallback: `Gemini 4 Hydrogen` / `GitHub Copilot` — 공용 로직·UI & Vitest) `▶ READY`임.

## Run `r98-character-icon-remove` 완료 — `main` 병합 `56c26ce` (2026-11-21)

- **수행 주체**: Claude Sonnet (Step 1 Maker `342067d`) → Gemini 4 Hydrogen (Step 2 Reviewer & Orchestrator).
- **결과**: Base `bc9e026` ↔ Target `342067d` 정적 리뷰 **clean**(지적 0건, 산출물 `bfdfb59`). 워크트리 `tsc`·`lint`·Vitest 70파일/900개·`next build`(16페이지) 통과 후 `main` 병합(`56c26ce`), 병합 후 검증 모두 통과함. 활성 Run 없음.
## R98 캐릭터 이미지 제거 UI 구현 (2026-11-21)

- **수행 주체**: Claude Sonnet (Run `r98-character-icon-remove` Step 1)임.
- **결과**: 워크트리 커밋 `342067d`(미병합). 관리자 캐릭터 모달·요청 모달·관리자 요청 대기열에 `이미지 제거` 추가함. tsc·lint·Vitest 70파일/900개 통과함.
- **다음 단계**: Step 2(`Gemini 4 Hydrogen`, 리뷰·병합·문서 마감) `▶ READY`임.

## 협업 파이프라인: 요구사항 접수·Chief Architect 구체화 규칙 추가 (2026-11-21)

- **수행 주체**: Claude Opus (사용자 요청, 규칙 재설계)임.
- **규칙**: Chief Architect(Gemini 4 Argon)와 Fallback 1(Claude Opus·Gemini 4 Neon)을 뺀 모든 AI(Hydrogen·Codex·Sonnet·Copilot·Flash)는 범위를 넘는 요구사항을 직접 구체화하지 않고 `📐 SPEC_NEEDED` 행과 `요구사항 접수 기록`(이해한 내용·해당 조건·정할 질문·관련 파일)으로 Chief Architect에게 넘김.
- **흐름**: Hydrogen 기본 접수 → 분류(Argon 승격 조건 또는 문서로 수용 기준을 정할 수 없음) → `📐 SPEC_NEEDED` → Argon(대체 Opus/Neon)이 명세·결정·단계별 수용 기준 작성(`src/**` 수정 없음) → Hydrogen에게 반환해 Run 등록·배정. `⚠️ HANDOVER_NEEDED`는 토큰 소진 전용으로 유지함.
- **변경 파일**: `.agents/rules/collaboration.md` §2 신설(이후 절 번호 +1), handoff·orchestrator·maker 스킬과 `.claude/skills` 사본(`Sync-Skills.ps1` 동기화·검사 통과), `AGENTS.md`·`CLAUDE.md`·`.github/copilot-instructions.md`에 항상 읽는 한 줄 추가.


## Run `r84-feedback-and-inbox` 완료 — `main` 병합 `660c3fc` (2026-11-19)

- **수행 주체**: Gemini 4 Neon (`Reviewer & Orchestrator`, Claude Opus 1순위 대체·독립 리뷰)임.
- **결과**: Base `ac71676` ↔ Target `71824a2` 통합 정적 리뷰 **clean**(지적 0건, 산출물 `2cebdf5`). 🐳 로컬 DB 업그레이드(마이그레이션 2회 멱등)·신규 `SCHEMA.sql` 모두 `TESTS.sql` 40개 PASS 확인 후 `main` 병합(`660c3fc`), 병합 후 `tsc`·`lint`·Vitest 70파일/895개 통과함.
- **남은 작업 (사용자)**: ✅ 운영 DB에 `MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용·확인 쿼리 검증 완료(사용자, 2026-11-19). 실브라우저 확인 및 필요 시 `main` push·워크트리 정리 남음. 활성 Run 없음.

## Run `r84-feedback-and-inbox` Maker iteration-03 완료 (2026-11-19)

- **수행 주체**: Claude Opus (GPT Codex 1순위 대체)임.
- **결과**: `TESTS.sql` R84 블록 테스트 코드 4건(`R84-REV-06`~`09`)을 고쳐 워크트리 커밋 `71824a2`(미병합·미push). 🐳 로컬 DB에서 마이그레이션 2회 적용과 `TESTS.sql` 전체(40개 PASS) 통과함.
- **다음 단계**: Step 3 재리뷰·병합 `▶ READY`(다른 모델 권장, 🐳 Docker 필요).

## Run `r84-feedback-and-inbox` Step 3 iteration-02 리뷰 (2026-11-19)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`)임. 🐳 Docker 켜진 PC에서 원격 브랜치로 워크트리를 복원해 진행함.
- **결과**: iteration-01 지적 5건 반영 확인. 로컬 DB에 R84 마이그레이션 2회 적용은 성공했으나 `TESTS.sql`이 R84 블록 테스트 코드 문제 4건(`R84-REV-06`~`09`, 모두 P2)으로 실패함. 진단 사본으로 4건을 고치면 전체 통과함을 확인함.
- **결정**: 병합하지 않음. Maker iteration-03(`TESTS.sql`만 수정, GPT Codex → Claude Opus / Gemini 4 Neon 대체) `▶ READY`, 그 뒤 Step 3 재리뷰·병합.

- **2026-11-19 (`r84-feedback-and-inbox` iteration-02 Maker — Claude Opus)**: 리뷰 P3 2건·P4 3건 수정, 워크트리 `0f8e188`(tsc·lint·Vitest 893개 통과, 로컬 DB 미실행). Docker PC에서 iteration-02 리뷰·로컬 DB 검증 후 병합 필요, 브랜치 미push.
- **2026-11-19 (`r84-feedback-and-inbox` Step 3 리뷰 — Claude Opus)**: Base `ac71676` ↔ Target `d7eef7a` 정적 리뷰·테스트 아티팩트 커밋 `0429417`(워크트리). P3 2건(`answer_feedback_request` PENDING 확인 없음, 승인/반려 알림 TESTS 누락)·P4 3건. tsc·lint·Vitest 892개·build 통과, 로컬 DB 미실행(Docker 미설치)으로 `🛑 BLOCKED (로컬 DB 검증 대기)`, 병합 보류.
- **2026-11-19 (`pipeline-collab-6-items-opus-review` Step 1 — Claude Opus)**: 6대 개선안 2차 검토서 §4 작성, 6건 채택(범위 검사 확대·`sql/` diff 기준 로컬 DB 병합 게이트·티어별 인계·워크트리 복원·위임 금지 범위 보완). 스킬 6종·Copilot 지침·`New-CollaborationRun.ps1` 반영, Run 마감. 다음: `r84-feedback-and-inbox` Step 3(`Claude Opus`, 🐳) `▶ READY`. 현재 PC Docker 미설치·r84 브랜치 미push 상태임.
- **2026-11-19 (`pipeline-collab-6-items-opus-review` 등록 — Gemini 4 Argon)**: AI 협업 파이프라인 6대 문제 현상 및 개선안(`P1-1` `run.json` `target_sha` 갱신 주체 모순, `P1-2` 하위 스킬 내 `Hydrogen` $\to$ `Neon`/`Argon` 승격 규칙 통일, `P2-1` 다중 PC 워크트리 복원, `P2-2` Docker 미설치 PC의 Step 3 로컬 DB 검증 이관 표준화, `P2-3` `handoff.md` 수용 기준 슬림화, `P3-1` `Hydrogen`·`Neon`의 `Flash` 서브에이전트 활용) 검토서 [`docs/pipeline-collaboration-review.md`](pipeline-collaboration-review.md)를 생성하고, **Claude Opus** 2차 검증 과제(`pipeline-collab-6-items-opus-review` Step 1)를 `▶ READY`로 등록함(`r84-feedback-and-inbox` Step 3는 본 검토 완료 직후 `▶ READY`로 복원).
- **2026-11-19 (`R85` 결정 확정)**: 사용자 결정 5건을 권장안으로 확정함(예상 시각 시작·종료 분리, 새벽 종료 즉시 제외, `games.daily_reset_time` 도입, 요청 시각 입력 허용, `오늘 HH:mm 종료` 표시). 구현 Run 예약 대기.
- **2026-11-19 (`R85` 상세 설계 — Claude Opus)**: `docs/r85-schedule-time-design.md` 작성. 날짜 기준 유지 + `start_at`·`end_at`·예상 플래그 추가, 종료 판정은 시각 우선. 게임별 서버 초기화 시각은 입력 보조·표시 전용 `games.daily_reset_time`(KST)으로 도입 권장. 사용자 결정 5건 대기.
- **2026-11-19 (Gemini 4 다단계 운용 및 승격 기준 반영 — Gemini 4 Argon)**: 주간(7일) 쿼터인 `Argon` 보호를 위해 단기 리셋 쿼터인 **`Gemini 4 Hydrogen`을 Gemini 기본(Default Maker·Orchestrator·Reviewer)**으로 설정하고, **`Gemini 4 Neon` 1차 승격**(복합 상태/생명주기 구현·코어 수식/SQL/RPC 구현·반복 실패 디버깅·다단계 복합 Run 오케스트레이션; `Orchestrator` 호출 시 `src/**` 직접 수정 제한, `Maker` 배정 시 `src/**` 구현 허용) 및 **`Gemini 4 Argon` 2차 최상위 승격**(오픈 아키텍처/신규 명세·보안/원장/RLS 심층 감사·고위험 Run 통합 리뷰·메타 오케스트레이션; `src/**` 직접 수정 전면 금지) 기준을 `.agents/rules/collaboration.md`, `docs/collaboration-guide.md`, `CLAUDE.md`, `.agents/skills/chronoledger-orchestrator/SKILL.md`(`.claude/skills/` 동기화 포함)에 반영함.
- **2026-11-18 (`r84-feedback-and-inbox` Step 2 — Claude Sonnet)**: 건의 요청 모달·내 요청 카드·관리자 건의 대기열(`answer_feedback_request`)·상단바 알림 벨(`NotificationBell`, `mark_notifications_read`) 구현, 워크트리 `d7eef7a`(tsc·lint·Vitest 892개 통과, 실브라우저·실DB 미확인). Step 3(`Claude Opus` 통합 리뷰·병합) `▶ READY`.
- **2026-11-18 (`r84-feedback-and-inbox` Step 1 — Gemini 4 Hydrogen, GPT Codex 1순위 대체)**: `feedback_requests`·`notifications`·30일 보관 `pg_cron`(`purge_expired_notifications`)·`mark_notifications_read`·`answer_feedback_request`·기존 6개 요청 승인/반려 RPC 알림 생성 연동·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영 완료(워크트리 커밋 `0b93975`). `tsc`·`lint`·`git diff --check`·Vitest 69파일 862개 통과함. 현재 PC에 Docker 미설치로 로컬 DB 실행 검증은 미수행(사용자 지시로 Step 3 이관), Step 2(`Claude Sonnet`) `▶ READY` 전환함.
- **2026-11-18 (`r84-feedback-and-inbox` 활성화 — Gemini 4 Argon)**: `R84`(기타 건의 창구 `feedback_requests` + `public.notifications` 테이블·30일 보관 `pg_cron` 정리·앱 내 알림함 상단 벨 UI + 건의 답변·요청 승인/반려 시 알림 행 원자적 생성) 격리 워크트리 `.worktrees/r84-feedback-and-inbox`(브랜치 `collab/r84-feedback-and-inbox`, Base `ac71676`) 생성 및 Active Dispatch Queue 등록 완료. Step 1(`GPT Codex` / Fallback 1: `Claude Opus`·`Gemini 4 Hydrogen`) `▶ READY`.
- **2026-11-18 (`r89-push-notification-research` Step 2 — Gemini 4 Argon)**: `docs/push-notification-research.md` 검토 및 사용자 결정 6건 확정(1차 `R84` 건의 창구+앱 내 알림함 30일 보관 → 2차 `R39` 일일 알림 3종 KST 09:00 → 3차 `R96` Web Push → 4차 `R97` Tauri 실행 중 OS 알림). 후속 Run 예약 등록 및 `r89` 마감 완료(활성 Run 없음).
- **2026-11-18 (`r89` Step 1 — Claude Opus)**: 푸시 알림 설계 조사 문서 `docs/push-notification-research.md` 작성. 앱 내 알림함 → 일일 알림 → 웹 푸시 순서 권장, Tauri 웹 푸시 미지원 판정. Step 2(Gemini 4 Argon) `▶ READY`.
## Run `r89-push-notification-research` (`R89` 푸시 알림 설계 조사) 활성화 (2026-11-18)

- **수행 주체**: Gemini 4 Argon (`Orchestrator & Architect`, 사용자 지시)임.
- **내용**: 예약 과제 `R89`(웹 푸시 PWA·iOS·Tauri v2 알림 지원 범위, Supabase Edge Function + `pg_cron`/이벤트 발송 구조, 구독·설정 테이블 및 RLS/로그아웃·탈퇴 정리, `R39` 일정·예정 지출 알림 및 `R84` 건의 답변 알림 통합 설계 조사)를 활성 Run `r89-push-notification-research`(문서 전용, Base `d5b9b74`)로 등록하고 Step 1(`Claude Opus`)을 `▶ READY`로 전환함.
- **다음 단계**: `Claude Opus`가 `docs/push-notification-research.md`를 작성한 뒤 Step 2(`Gemini 4 Argon`)에서 사용자 결정을 확인하고 `R84` 착수로 연결함.

- **2026-11-18 (`skill-support-check` Step 4 — Claude Opus)**: Antigravity 결과 반영(사본 불필요), `agent_rules.md`·`document_location.md`에 `trigger: always_on` 추가, `AGENTS.md` 도구별 Skill 안내 갱신. Run 마감, 활성 Run 없음.
- **2026-11-18 (`skill-support-check` Step 3 — Gemini 4 Argon)**: Google Antigravity IDE에서 `.agents/skills/*/SKILL.md` 6개 원본이 별도 사본 없이 `<skills>`에 자동 인식(Progressive Disclosure)되고, `<user_rules>`에는 `AGENTS.md`와 YAML frontmatter `trigger: always_on`이 있는 `.agents/rules/collaboration.md`·`language.md`만 상시 주입됨(`agent_rules.md`·`document_location.md`·`handoff.md`는 frontmatter 부재로 미주입)을 확인해 `docs/handoff.md` 결과 표에 기록함.

## 지침 토큰 절감: 운영 문서 보관 분리·Skill 분리 (2026-11-18)

- **수행 주체**: Claude Opus (사용자 지시)임.
- **보관 분리**: `docs/handoff.md` 3,295줄 → 활성 큐·체크포인트·예약 요약·직전 Run만 남김. 끝난 Run·2026-11-10 이전 기록은 `docs/archive/{handoff,progress,changelog,to-do}-archive.md`로 옮김(커밋 `9bcb9d6`).
- **Skill 분리**: `.agents/skills/`에 handoff·orchestrator·maker·reviewer 정리, docs-closeout·sql-migration 신설. Claude용 사본 `.claude/skills/`와 동기화 스크립트 `Sync-Skills.ps1` 추가. `CLAUDE.md`·`AGENTS.md`·`copilot-instructions.md`는 "필요할 때만 읽기" 안내로 줄이고 중복 표·절차 제거함.
- **다음 단계**: 활성 Run `skill-support-check` Step 1(GitHub Copilot) `▶ READY`. Claude Skill 인식은 새 세션에서 확인 필요.

## R93 마이그레이션 운영 적용 (2026-11-16)

- 사용자가 운영 DB에 `MIGRATION_R93_INCOME_HISTORY.sql`을 적용하고 `sql/README.md` B표 R93 확인 쿼리로 검증을 마침. 수익 등록·삭제가 수익 내역과 총 자산에 함께 반영되는 상태임.
- **남은 확인 (사용자)**: 실브라우저(수익 등록·삭제와 총 자산 변화).

## Run `r93-income-history-db-and-ui` 완료 — `main` 병합 `a1f17e0` (2026-11-16)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Step 3)임.
- **경과**: Step 1·2 브랜치가 다른 PC에만 있어 한때 `🛑 BLOCKED` 처리함 → 사용자가 브랜치를 push해 해제함.
- **결과**: 수익 내역 테이블(`incomes`)과 원자적 RPC(`record_income`·`delete_income`)로 수익 기록과 총 자산을 함께 관리함. 지출 화면에 수익 내역 탭(조회·삭제) 추가. 리뷰 P1~P3 없음, P4 2건은 to-do `R95`.
- **검증**: 🐳 로컬 DB에서 마이그레이션 2회 적용·`TESTS.sql` 전체 통과, 병합 후 `main` Vitest 1484개 통과함.
- **남은 작업 (사용자)**: 운영 DB에 `MIGRATION_R93_INCOME_HISTORY.sql` 적용·확인 쿼리, 실브라우저 확인.

## 게스트 모드 `/dashboard/games` 카드 UI 수정 및 커밋·푸시 (2026-11-16)

- **수행 주체**: Gemini 3.8 Flash 서브에이전트(`flash-ui-worker`, Gemini 4 Hydrogen 위임)임.
- **결과**: 게스트 모드 게임 카드의 아이콘 크기(`w-14 h-14` 래퍼 누락으로 인한 확대 현상)와 카드 레이아웃(`[아이콘] [게임명]` 상단 + `[일정 보기]` 하단 풀폭 버튼)을 로그인 카드 기준으로 정리하고 테스트를 보강함.
- **참고 확인**: 로컬 테스트 시 외부 URL 아이콘 3건(`403 Forbidden`)으로 인한 `GameIcon` 기본 아이콘 폴백은 외부 CDN 차단 때문이며, `/admin` `외부 아이콘 일괄 변환`(`wsrv.nl` 프록시 경유) 또는 수동 재저장으로 해소 가능함을 확인함.
- **검증**: `tsc --noEmit`, `npm run lint`, `src/app/dashboard/games/page.test.tsx`(47개 테스트) 통과 후 `main` 커밋 및 원격 푸시 완료함.

## `r93` Step 1 DB/RLS/RPC 완료 (2026-11-16)

- **수행 주체**: Claude Opus (GPT Codex 1순위 대체)임.
- **결과**: `public.incomes`(본인 조회 전용·RPC 전용 쓰기·삭제 대기 차단·탈퇴 정리), `record_income`·`delete_income` 원자 RPC, `SCHEMA.sql`·README·`TESTS.sql`·타입 반영. 워크트리 커밋 `7e8f702`.
- **검증**: tsc·lint·Vitest 69파일/848개·diff-check 통과. 로컬 DB 실행은 미실행(이 PC에 Docker·psql 없음, 사용자 지시로 SQL만 작성).
- **다음 단계**: Step 2(`Claude Sonnet`) `▶ READY`. 🐳 Step 3에서 로컬 DB 검증 필요.

## Run `r93-income-history-db-and-ui` (`R93` 수익 내역 DB/RPC 및 조회·삭제 UI) 등록 및 활성화 (2026-11-16)

- **수행 주체**: Gemini 4 Argon (`Orchestrator & Architect`)임.
- **배경**: 직전 Run `r91-r94-weekly-timeline-and-template-delete`(`R91`·`R92`·`R94`) 및 후속 UI 개선(`0844387`)이 마감됨에 따라, 다음 예약 과제인 **`R93` (수익 내역 저장·조회·삭제)** 격리 워크트리 `.worktrees/r93-income-history-db-and-ui`(브랜치 `collab/r93-income-history-db-and-ui`, Base `0844387`)를 생성하고 Dispatch Queue에 등록함.
- **단계 구성**:
  - **Step 1 (`▶ READY` — GPT Codex, 1순위 대체: Claude Opus / Gemini 4 Hydrogen)**: `sql/migrations/MIGRATION_R93_INCOME_HISTORY.sql` 및 `sql/SCHEMA.sql`에 `public.incomes` 테이블(본인 `SELECT` RLS, 계정 삭제 대기 차단, `purge_expired_account_deletion_requests` 연동)과 총 자산 동기화 원자적 `SECURITY DEFINER` RPC 2종(`record_income`, `delete_income`), `sql/README.md` 확인 쿼리, `sql/tests/TESTS.sql` R93 시나리오, `src/types/database.types.ts` 타입을 구현함.
  - **Step 2 (`⏳ WAITING` — Claude Sonnet / Gemini 4 Hydrogen)**: `IncomeModal`의 `record_income` RPC 연동(미적용 DB 폴백 포함) 및 `/dashboard/expenses` 내 `[지출 내역 | 수익 내역]` 전환 탭·목록·삭제 확인 다이얼로그(`delete_income`) 및 Vitest 테스트를 구현함.
  - **Step 3 (`⏳ WAITING` — Claude Opus)**: 통합 정적 코드 리뷰(`review.json`·`test.json`), 로컬 DB 검증 및 `main` 병합 마감.

## 캘린더 배지 색상·주간 필터·관리자 캐릭터 페이지네이션 UI 개선 완료 (2026-11-16)

- **수행 주체**: Gemini 3.8 Flash 서브에이전트(`flash-ui-worker`, Gemini 4 Hydrogen 위임)임.
- **결과**: `BROADCAST` 색상 `#FF4A42` 통일, 캘린더 타일 기준 `VERSION`·`PICKUP` 색상 일치, 주간 목록 기본 `픽업(신규)` 및 `NEW`/`RERUN` `start_date` 기준 필터링, `/admin` 캐릭터 20개 페이지네이션 및 템플릿 버튼 위치 이동을 구현함.
- **검증**: `tsc --noEmit`, `npm run lint`, 수정 대상 Vitest 4개 파일(140개 테스트) 통과 및 사용자 실브라우저 확인 완료 후 `main`에 커밋함.

## `r91-r94` iteration-02 반영·`main` 병합 및 마감 완료 (2026-11-16)

- **수행 주체**: Gemini 4 Hydrogen (Gemini 4 Argon 1순위 대체)임.
- **결과**: 사용자 승인에 따라 Step 3 지적 4건(`R92-REV-001` 픽업 일정·대기 요청 영향 경고 추가, `R92-REV-002` 정식 캐릭터 삭제 호출 무조건 실행, `R94-REV-001` 필터 빈 주간 문구 구분, `R94-REV-002` 미사용 `splitVersionGroups`·테스트 삭제)을 반영해 커밋(`0d8a5b8`)하고, `iteration-02` 산출물(`review.json` `clean`, `test.json` `passed`) 스키마 검증 후 `main`에 병합(`703362e`) 및 워크트리를 정리함.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`, Vitest 69파일 844개 테스트, `npm run build` 통과함(워크트리에 `.env.local`이 없어 빌드는 임시 공개 Supabase env로 검증).
- **남은 확인**: 데스크톱·모바일(375px) 주차별 타임라인 배치 및 `/admin` 템플릿 삭제 실브라우저 확인 대기 중임.

## `r91-r94` Step 3 통합 리뷰 완료 (2026-11-16)

- **수행 주체**: Claude Opus임.
- **결과**: Base `2b66cda` ↔ Target `8628d5d` 리뷰 `findings`(P3 1·P4 3, P1·P2 없음). tsc·lint·Vitest 69파일/847개·build 통과함. 산출물 커밋 `75e2520`(워크트리).
- **주요 지적**: 템플릿 삭제 경고에 픽업 일정·대기 요청에서 캐릭터가 빠진다는 안내 누락(`R92-REV-001`).
- **다음 단계**: Step 4(`Gemini 4 Argon`) `▶ READY`. 지적 반영 여부 판단·병합·문서 마감.

## R90 잠정 보류 및 `R91` 통합 Run 등록 (2026-11-16)

- **수행 주체**: Claude Opus (Gemini 4 Argon 1순위 대체, 사용자 지시)임.
- **R90**: 사용자 지시로 잠정 보류함. 사용자가 직접 호출할 때만 재개함.
- **활성 Run**: `r91-r94-weekly-timeline-and-template-delete`(R91·R94·R92, DB 변경 없음) 등록함. 워크트리 `.worktrees/r91-r94-weekly-timeline-and-template-delete`, Step 1(`Claude Sonnet`, R91+R94) `▶ READY`임.
- **다음 단계**: Claude Sonnet으로 전환 후 `"인수인계 문서를 확인해"` 입력.

## 디시인사이드 수집 2차 검증(`R90` Step 2) 완료 (2026-11-16)

- **수행 주체**: Claude Opus임. 문서 전용, 코드·DB 변경 없음.
- **결과**: `docs/dcinside-schedule-crawling-review.md` §6 추가함. 자동 수집은 약관 제16조①로 R86 네이버·HoYoLAB과 같은 등급이라 제외 권장, 대안으로 갤러리 바로가기 + 링크 붙여넣기(경로 A) 제시함. URL 대신 구조화 값 저장, 후보함 UX, R90 Step 1~4 수용 기준 확정안 작성함.
- **미검증**: Edge Function 출구 IP 차단, 정식·미니 갤러리 DOM(직접 요청 안 함).
- **다음 단계**: R90은 사용자 지시로 잠정 보류함(사용자가 직접 호출할 때만 재개). 활성 Run은 R91 통합 Run으로 넘김.

## 6대 AI 협업 모델 체제 확장 (`Gemini 4 Hydrogen` 추가, 2026-11-16)

- **수행 주체**: Gemini 4 Argon (`Orchestrator & Architect`)임.
- **배경 및 결정**: 사용자 요청 및 결정에 따라 기존 5대 모델 체제에 **`Gemini 4 Hydrogen`**을 추가하여 **6대 AI 모델 협업 체제**로 확장함.
- **`Gemini 4 Hydrogen` 역할 및 대체 체인**:
  - **기본 역할**: `Maker (Feature·UI·Test) & Sub-Orchestrator/Reviewer`
  - **담당 도메인**: 일반·복합 기능 및 UI 컴포넌트(`src/app/`, `src/components/`, `src/lib/`) 구현, Vitest 단위/통합 테스트, 정적 리뷰(`review.json`)·오케스트레이션 보조.
  - **대체(Fallback) 배치**: 주간 쿼터인 `Gemini 4 Argon`, `Claude Sonnet`, `GPT Codex`, `GitHub Copilot`, `Gemini 3.8 Flash`의 1순위급 대체 모델로 배치하고, `Gemini 4 Hydrogen` 자체의 대체 체인은 1순위 `Claude Sonnet / Opus`, 2순위 `GitHub Copilot`으로 설정함.
- **반영 파일**: `AGENTS.md`, `CLAUDE.md`, `.agents/rules/collaboration.md`, `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.github/copilot-instructions.md`, `docs/collaboration-guide.md`, `docs/handoff.md`.

## 디시인사이드 공지/공식 탭 수집 1차 검토(`R90`) 및 신규 요구사항 4건(`R91`~`R94`) 검토·등록 (2026-11-16)

- **수행 주체**: Gemini 4 Argon (`Orchestrator & Architect`)임.
- **디시인사이드 갤러리 공식 탭 수집 검토 (`docs/dcinside-schedule-crawling-review.md`)**:
  - 예시 링크(`https://gall.dcinside.com/mgallery/board/lists/?id=endfield&sort_type=N&search_head=10&page=1`) 실측 결과 HTTP 200 SSR HTML로 응답하며, `tr.ub-content.us-post`에서 글 번호(`data-no`), 말머리(`gall_subject`), 제목·원문 링크(`gall_tit`), 초 단위 KST 시각(`gall_date[title]`)을 Headless 브라우저 없이 추출 가능함을 확인함.
  - `gall.dcinside.com/robots.txt`는 `User-agent: * / Allow: /`(일부 비게임 갤러리만 Disallow)이나, 이용약관(2026-10-07 시행) 제11조 제3항 제13호 및 제16조 제1항은 사전 서면 동의 없는 크롤링을 금지함. 이에 따라 작성자 정보(`gall_writer`)·본문을 수집하지 않고 목록 1페이지 메타데이터만 관리자 전용 `schedule_candidates`에 저장하는 완화 설계와 **Claude Opus 2차 검증 체크리스트(5개 항목)**를 문서화하고 활성 Run `r90-dcinside-crawling-opus-review` Step 2(`Claude Opus`)를 `▶ READY`로 등록함.
- **신규 요구사항 4건 코드베이스 대조 및 등록 (`R91`~`R94`)**:
  - `R91`: `WeeklyScheduleList`에서 `end_date < todayDate` 일정 제외.
  - `R92`: 프리셋/템플릿 삭제 버튼 추가 (관리자 캐릭터 템플릿 삭제/초기화 vs 조합 프리셋 삭제 확인).
  - `R93`: `IncomeModal`이 `user_finances.total_asset`만 증액하고 수익 기록을 DB에 남기지 않는 구조적 누락을 확인하고, `public.incomes` 테이블·원장 동기화 RPC 및 `/dashboard/expenses` 수익 내역 조회·삭제 UI 과제로 등록함.
  - `R94`: 첨부 이미지(픽업지지 스타일)와 같이 주차별 리스트를 날짜순(`MM/DD(요일)` + `TODAY`) 타임라인 행 및 캐릭터 아바타(우하단 게임 아이콘 배지 오버레이) 레이아웃으로 개편하는 과제를 등록함.

## R86 후속 검토: 수집 경로·약관 확인 (2026-11-12)

- **수행 주체**: Claude Opus (사용자 요청)임. 문서 전용, 코드·DB 변경 없음.
- **요구사항 확정**: 수집기는 1차 정보 수집 용도이고 가공·등록은 관리자 몫임. Steam 뉴스는 림버스 컴퍼니만 유효하다는 사용자 판단 반영함.
- **약관 확인**: HoYoLAB은 COGNOSPHERE 약관(2026-05-20) 제7조 c항이 사전 서면 허락 없는 스크래핑 금지함(원문 확인). 네이버 라운지는 사용자가 제공한 약관 원문으로 사전 허락 없는 자동 수단 게시물 수집 금지를 확인함(수량·목적 예외 없음).
- **비교 관찰**: pickupgg.com은 SSR로 Supabase 데이터를 담아 보내고, 수동/자동 구분·잠금 플래그·확정/소문 상태로 운영함.
- **기록 위치**: `docs/schedule-crawling-research.md` 10절. R90은 결정 전 착수 보류함.
- **다음 단계**: 10.4 결정 5건(경로 처리 방식·미정 게임 채널·저장 범위·실행 위치·알림) 확정 후 R90 수용 기준 갱신 필요.

## 작업 트리 정리 (2026-11-12)

- **수행 주체**: Claude Opus (사용자 요청)임.
- **미커밋 문서 커밋**: GitHub Copilot이 R86 Step 2 마감 중 남긴 미커밋 문서(handoff·progress·changelog·to-do·조사 문서 결정 반영, 후속 `R90` 등록)를 `2f583ce`로 커밋함.
- **워크트리 정리**: `.worktrees/` 등록 워크트리 14개(r13-phase13-2~r88)를 `git worktree remove`로 제거함. 모두 미커밋 변경 없었고 `collab/*` 브랜치는 그대로 유지해 커밋 손실 없음(미병합 브랜치: `r13-phase13-1-db-and-r30-icon-resave` 4커밋, `require-main-run-sha` 2커밋, `r82-version-grouped-schedules` manifest 1커밋 — 브랜치로 보존됨).
- **고아 폴더 7개 삭제**: git 연결이 이미 끊긴 phase5~9·r13-phase13-1·require-main-run-sha 폴더를 브랜치 최신 커밋과 비교해 삭제함. 고유 내용은 phase8 `collab/iterations/iteration-01/review.json`·`test.json` 2개뿐이라 저장소 밖 `C:Usersinhachronoledger-worktree-backup-2026-11-12`에 백업함.
- **남김**: `.claude/worktrees/`의 앱 세션 워크트리 2개(`handover-docs-review-ddffbe`, `project-feature-review-comparison-2974fa`)는 해당 세션이 열려 있을 수 있어 유지함. 앱 설정 Storage의 `Clean up inactive sessions`(30일 이상 미사용) 또는 세션 보관 후 정리 가능함.
- **이후 Run**: 새 Run은 `New-CollaborationRun.ps1`로 워크트리를 다시 만들면 됨.

## Run `r86-schedule-crawling-research` 완료 (2026-11-11)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Gemini 4 Argon 1순위 대체)임.
- **검토**: 공식 출처·약관 확인 범위·Steam 피드 혼재·날짜 형식 변동·자동 기간 확정 위험을 확인함.
- **사용자 결정**: 별도 `schedule_candidates` 테이블, Steam 6개 공지 감지+버전 주기 추정, 하루 1회, Supabase Edge Function+`pg_cron`, 미확인 항목은 구현 전 추가 조사로 확정함.
- **다음 단계**: R89 푸시 알림 조사 후 R84를 재검토하고, R90 일정 후보 수집 구현을 별도 Run으로 등록함.

## Run `r86-schedule-crawling-research` Step 1 (조사) 완료 (2026-11-11)

- **수행 주체**: Claude Opus (`Researcher`)임.
- **산출물**: `docs/schedule-crawling-research.md`. 등록 게임 14개 기준으로 공식 출처·이용 조건·실행 환경·데이터 흐름을 조사함.
- **결론**: Steam 공식 공지 감지(6개 게임) + 버전 주기 추정 + 관리자 승인의 반자동 방식 권장. 네이버 라운지·X·비문서화 API는 제외함.
- **다음 단계**: Step 2(`Gemini 4 Argon`, 검토·결정 질문) `▶ READY`임.

## R88 운영 적용 완료·Run `r86-schedule-crawling-research` 등록 (2026-11-11)

- 사용자가 운영 DB에 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql`을 적용하고 확인 쿼리 검증을 마침. 일반 캐릭터도 아이콘 없이 등록 가능함.
- 사용자 지시로 예약 `R86`(공식 일정 자동 수집 가능성 조사, 문서 전용)을 활성 Run으로 등록함(`main`에서 진행, Docker 불필요).
- **다음 단계**: Step 1(`Claude Opus`, 조사 문서 작성) `▶ READY`임.

## Run `r88-optional-character-icons` 완료 — `main` 병합 `66d55d8` (2026-11-11)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Step 3)임.
- **결과**: 템플릿 게임 일반 캐릭터도 아이콘 없이 등록·승인 가능함(아이콘 없으면 기본 아바타). 리뷰 지적 없음.
- **검증**: 로컬 Supabase에서 마이그레이션·`TESTS.sql` 전체 통과, 병합 후 `main` tsc·Vitest 159파일/1463개 통과함.
- **남은 작업 (사용자)**: 운영 DB에 `MIGRATION_R88_OPTIONAL_CHARACTER_ICONS.sql` 적용·확인 쿼리, 실브라우저 확인.
- **규칙 추가**: Docker Desktop이 필요한 작업은 시작 전 상태를 확인하고, 꺼져 있으면 기다리지 않고 즉시 사용자에게 요청함(`.agents/rules/handoff.md` §5).
- **다음 단계**: 활성 과제 없음. `R85`(결정 완료)·`R89`(푸시 알림 조사)·`R86`은 지목 시 등록함.


## R88 일반 캐릭터 아이콘 선택 사항 UI 구현 (2026-11-11)

- **수행 주체**: Claude Sonnet (Run `r88-optional-character-icons` Step 2)임.
- **결과**: 워크트리 커밋 `f30ae52`(미병합). 관리자 캐릭터 폼·요청 승인·요청 모달에서 아이콘을 선택 사항으로 바꾸고 미적용 DB 오류 안내를 추가함. tsc·lint·diff-check 통과, Vitest 69파일/841개 통과함.
- **미확인**: 실DB(R88 마이그레이션 적용 전후)·실브라우저 동작.
- **다음 단계**: Step 3(`Claude Opus`, 리뷰·병합·마이그레이션 적용 안내) `▶ READY`임.

## Run `r88-optional-character-icons` Step 1 완료 — Target `0be4f44` (2026-11-11)

- **수행 주체**: Claude Opus (`GPT Codex` 1순위 대체, RLS/SQL 승격 조건)임.
- **변경**: 일반 캐릭터의 `chk_game_characters_icon_or_pickup_only` 제약 제거, 아이콘 없는 `approve_character_request` 생성 허용, 확인 쿼리·직접 등록/승인 SQL 테스트 추가함.
- **검증**: `git diff --check` 통과함. Docker/psql 미실행으로 `TESTS.sql` 전체 실행은 미수행임.
- **운영 상태**: 마이그레이션 미적용임. Step 2 UI 구현 후 Step 3 리뷰가 필요함.
- **다음 단계**: Claude Sonnet이 R88 UI Step 2를 수행함.

## Run `r88-optional-character-icons` 등록·R84/R85 결정 기록 (2026-11-11)

- **수행 주체**: Claude Opus (`Gemini 4 Argon` 1순위 대체, Orchestrator)임.
- **사용자 보고**: 템플릿 게임에서 아이콘 없이 캐릭터를 추가할 수 없음 → 화면 검사와 DB 제약 `chk_game_characters_icon_or_pickup_only`·`approve_character_request` 검사가 원인임. 사용자 결정으로 아이콘을 선택 사항으로 바꾸는 Run `r88`을 등록함(DB Codex → UI Sonnet → 리뷰 Opus).
- **R84 결정**: 분류 기능 제안·오류 신고·기타, 첨부 없음, 답변 알림은 푸시 알림 설계 후 착수 → 보류함.
- **R85 결정**: 분 단위 입력, 종료 시각 미입력 시 날짜만, KST 입력·표시, 달력 칸 미표시 → 등록 가능함.
- **신규 예약 `R89`**: 푸시 알림 설계 조사(문서 전용).
- **다음 단계**: `r88` Step 1(`GPT Codex`) `▶ READY`임.

## Run `r83-schedule-dialog-and-character-sort` 완료 — `main` 병합 `6af6780` (2026-11-11)

- **수행 주체**: Claude Opus (`Gemini 4 Argon` 1순위 대체, Step 2 리뷰·병합)임.
- **결과**: 게임별 일정 모달의 중복 `기타 일정` 영역 삭제, 캐릭터 기본 정렬을 첫 번째 분류 축 + 가나다순으로 변경(즐겨찾기는 사용자 순서 유지, 관리자 표 포함). 리뷰 지적 없음.
- **검증**: 병합 후 `main`에서 tsc·Vitest 159파일/1457개 통과함.
- **남은 작업 (사용자)**: 일정 모달·캐릭터 정렬 실브라우저 확인.
- **다음 단계**: 활성 과제 없음. 예약 `R84`(기타 건의 창구)·`R85`(일정 시간 단위)는 사용자 결정 대기, `R86`(일정 자동 수집 조사)은 지목 시 착수함.


## R83 기타 일정 제거·캐릭터 기본 정렬 구현 (2026-11-11)

- **수행 주체**: Claude Sonnet (Run `r83-schedule-dialog-and-character-sort` Step 1)임.
- **결과**: 워크트리 커밋 `bc33d83`(미병합). 게임별 일정 모달의 `기타 일정` 영역을 삭제하고, 캐릭터 기본 정렬을 첫 번째 분류 축 → 가나다 → id로 바꿈(보유·미보유·관리자 표, 즐겨찾기는 사용자 순서 유지). tsc·lint·diff-check 통과, Vitest 69파일/835개 통과함.
- **미확인**: 실브라우저 화면.
- **다음 단계**: Step 2(`Gemini 4 Argon`, 리뷰·병합·문서 마감) `▶ READY`임.

## Run `r83-schedule-dialog-and-character-sort` 등록 (2026-11-11)

- **수행 주체**: Claude Opus (`Gemini 4 Argon` 1순위 대체, Orchestrator)임.
- **배경**: r81·r82·r79가 모두 마감돼 예약 `R83`을 활성 Run으로 등록함. `R84`·`R85`는 착수 전 사용자 결정이 필요해 대기, `R86`은 사용자 지목 시 착수함.
- **Worktree**: `.worktrees/r83-schedule-dialog-and-character-sort`(Base `2571663`).
- **다음 단계**: Step 1(`Claude Sonnet`) `▶ READY`임.

## Run `r79-sql-tests-local-run` 완료 — `main` 병합 `b38d65e` (2026-11-11)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`)임.
- **결과**: `sql/README.md`의 잘못된 `psql` 연결 형식을 `-h/-p/-U/-d` 및 `PGPASSWORD` 방식으로 수정한 Target `270f2c7`을 재리뷰하고 병합함. `R79-REV-001` 해소, 정적 리뷰 clean임.
- **산출물**: iteration-02 `review.json`·`test.json` 커밋 `50b26ce`임.
- **검증**: `git diff --check` 통과함. 기존 로컬 실행 38개 블록 PASS·최종 rollback PASS 증거 유지함. Docker 엔진 미실행으로 재실행 및 Python 아티팩트 스키마 검증은 미수행임.
- **다음 단계**: 예약 과제 `R83`~`R86`은 사용자 우선순위 확인 후 착수함.

## Run `r81-image-input-unification` 완료 — `main` 병합 `3c87917` (2026-11-11)

- **수행 주체**: Claude Opus (`Reviewer & Orchestrator`, Step 4)임.
- **결과**: 캘린더 배경을 뺀 모든 이미지 입력(사용자 4곳, 관리자·요청 8곳, 분류 아이콘)이 공용 등록 모달(URL·붙여넣기·파일·미리보기)을 씀. 리뷰 P1~P3 없음, P4 3건은 to-do `R87`로 이관함.
- **검증**: 병합 후 `main`에서 tsc·lint·Vitest 159파일/1450개 통과함.
- **남은 작업 (사용자)**: 각 위치 실브라우저 확인(URL·붙여넣기·파일, wsrv.nl 대체 경로, 투명 이미지 붙여넣기).
- **다음 단계**: Run `r79` Step 2 재리뷰(`Gemini 4 Argon`) `▶ READY`임.


## R81 관리자·요청 화면 이미지 입력 교체 (2026-11-11)

- **수행 주체**: Claude Sonnet (Run `r81-image-input-unification` Step 3)임.
- **결과**: 워크트리 커밋 `c266232`(미병합). 관리자 화면 A1~A4·A9, 요청 승인 화면 A5·A6, 요청 모달 A7·A8을 공용 이미지 모달(URL·붙여넣기·파일)로 교체함. R77 인라인 모달 삭제. tsc·lint·diff-check 통과, Vitest 66파일/810개 통과함.
- **미확인**: 실브라우저 동작(URL 가져오기·wsrv.nl·붙여넣기 투명도·AI 업스케일 체크박스).
- **다음 단계**: Step 4(`Claude Opus`, 통합 리뷰·병합·문서 마감) `▶ READY`임.


## R81 공용 이미지 입력 모달·사용자 화면 4곳 구현 (2026-11-11)

- **수행 주체**: Claude Sonnet (Run `r81-image-input-unification` Step 2)임.
- **결과**: 워크트리 커밋 `77edee9`(미병합). 공용 `image-source.ts`·`image-source-dialog.tsx` 추가, 게임 화면·게임 추가 모달·보유 캐릭터 설정 창·프로필 사진을 URL·붙여넣기·파일 모달로 교체함. 붙여넣기는 `text/html` 원본 주소 우선(투명도 보존), 실패 시 비트맵 폴백함. tsc·lint·diff-check 통과, Vitest 66파일/809개 통과함.
- **미확인**: 실브라우저 URL 가져오기·wsrv.nl 프록시·Windows 이미지 복사 붙여넣기 투명도.
- **다음 단계**: Step 3(`Claude Sonnet`, 관리자·요청 화면 + R77 모달 교체) `▶ READY`임.


## Excalidraw 기반 통합 ERD 및 서비스 기능 상호작용 지도 제작 (2026-11-11)

- **수행 주체**: Gemini 4 Argon임.
- **통합 ERD (`docs/diagrams/chronoledger-erd.excalidraw`)**:
  - 5개 논리 영역(① 인증·프로필·감사, ② 게임·버전·캘린더 일정, ③ 결제 원장·예산·환불, ④ 가챠·캐릭터·프리셋·인벤토리, ⑤ 공지·커뮤니티) 기준 핵심 테이블 20개와 Supabase Auth/Storage·pg_cron 인프라 박스를 158개 요소로 시각화함.
  - FK·RPC·트리거·pg_cron·Storage 경로 경계를 반영하고 검증 스크립트로 텍스트 넘침 0건·요소 겹침 0건·영역 이탈 0건·고유 ID 검증을 통과함.
- **서비스 기능 상호작용 지도 (`docs/diagrams/chronoledger-functional-map.excalidraw`)**:
  - 소스코드·DB 용어 대신 자연어 중심 6개 기능 영역(로그인·계정 관리, 게임 일정·버전 캘린더, 과금 장부·예산·환불, 보유 캐릭터·프리셋·재화 기록, 알림·공지·운영 지원, 자동 정리·동기화)과 목적 콜아웃, 10개 상호작용 화살표, 3대 핵심 사용자 흐름 루프를 147개 요소로 구성함.
  - 검증 스크립트로 넘침·겹침·라벨 충돌 0건 및 고유 ID 검증을 통과함.
- **아키텍처 문서 연동 (`docs/architecture.md`)**: 두 `.excalidraw` 다이어그램 파일 경로 링크를 추가하고 `markdownlint-cli` 검증을 통과함.

## r82-version-grouped-schedules 리뷰 및 `main` 병합 (2026-11-11)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)임.
- **리뷰 (`7c0a319` ↔ `58aa956`)**: 같은 게임의 픽업·콘텐츠를 시작일이 속한 버전 아래로 묶는 순수 함수, 주간 목록 버전 행 접힘 요약, 선택일 상세 카드 묶음·소속 라벨을 확인함. 지적 0건(`clean`).
- **산출물**: 워크트리에 없던 manifest(`run.json`)와 `iteration-01/{review,test}.json`을 작성·스키마 검증하고 커밋(`642849b`)함.
- **검증**: diff-check·tsc·lint 통과, Vitest 65파일/801개 통과, 빌드 통과함. `main` 병합(`2c1f5c5`) 후 tsc 통과·Vitest 66파일/802개 통과함.
- **남은 확인**: 데스크톱·모바일에서 주간 목록 버전 접기/펼치기와 선택일 상세 묶음 실화면 확인 필요함(사용자).
- **다음 단계**: `r81` Step 2(**Claude Sonnet**) `▶ READY` 유지, 그 뒤 `r79` 재리뷰와 예약 과제 `R83`~`R86` 순서임.

## 모바일 대시보드 폭·필터 칩 줄바꿈 `main` 직접 수정 및 붙여넣기 투명도 결함 이관 (2026-11-11)

- **수행 주체**: Claude Opus (사용자 지시 "바로 수정")임. 커밋 `8eaeaf9`.
- **수정**: 모바일에서 주차별 리스트 선택 시 화면이 넓어지던 문제(대시보드 그리드 열 규칙 누락)와 캐릭터 필터 칩이 라벨 아래로 줄바꿈되던 문제를 해소함.
- **원인 확정·이관**: 투명 PNG가 검은 배경으로 저장되는 문제는 Windows 클립보드 붙여넣기 경로의 투명도 손실임(사용자 확인). 앱 변환 경로는 투명도를 유지함. 클립보드 `text/html` 원본 주소 우선 사용·안내 문구 추가를 `r81` Step 2 수용 기준에 추가함.
- **검증**: tsc·lint 통과, Vitest 65파일/784개 통과함. 루트 `node_modules`에 `@dnd-kit`이 없어 `npm ci`로 재설치함. 실제 모바일 화면 확인 필요함.

## 사용자 요청 5건 분석·과제 등록 `R83`~`R86` (2026-11-11)

- **수행 주체**: Claude Opus (Orchestrator, Gemini 4 Argon 1순위 대체)임. 코드 변경 없음.
- **원인 확인**: 게임별 일정 모달 `기타 일정`은 진행 중·다음 예정 영역과 항상 중복됨(지난 일정은 별도 기록이라 남은 일정이 모두 두 영역에 포함됨). 캐릭터 정렬은 캐릭터 페이지 이름순, 관리자 표 등급→이름순이며 분류 축 기준 정렬은 없음.
- **등록**: `R83`(화면 결함 2건), `R84`(기타 건의 창구, DB), `R85`(시간 단위 일정 설계, `R37` 흡수), `R86`(공식 일정 수집 조사)을 `docs/handoff.md` 「다음 Run 예약」과 `docs/to-do.md`에 등록함. 활성 Run `r81`·`r82`와 파일 충돌을 피해 두 Run 마감 후 착수함.

## Run `r82-version-grouped-schedules` 등록 (2026-11-11)

- **수행 주체**: Claude Opus (`Gemini 4 Argon` 1순위 대체, Orchestrator)임.
- **배경**: 사용자 요청. 버전 일정이 있는 게임은 버전을 상위 일정으로 두고 픽업·콘텐츠를 그 아래로 묶어 표시를 간소화함.
- **결정**: 주간 일정 목록·선택일 상세만 적용(달력 칸 유지), 시작일 기준 자동 소속, 접힘 + 요약, 방송 일정 제외, DB 변경 없음.
- **Worktree**: `.worktrees/r82-version-grouped-schedules`(Base `7c0a319`). r81과 파일이 겹치지 않아 병행 가능함.
- **다음 단계**: Step 1(`Claude Sonnet`) `▶ READY`임.

## Run `r81-image-input-unification` Step 1 (명세) 완료 (2026-11-11)

- **수행 주체**: Claude Opus (`Architect`)임.
- **커밋 `96d4b3d`** (워크트리, 미병합): `docs/spec/R81_Image_Input_Unification_Spec.md` 작성함. 대상 13곳(사용자 4·관리자·요청 8·R77 모달), 공용 모달 API·변환 규격·회귀 금지·테스트·허용 파일 확정함.
- **다음 단계**: Step 2(`Claude Sonnet`, 공용 모달 + 사용자 화면 4곳) `▶ READY`임.

## Run `r81-image-input-unification` 등록 (2026-11-11)

- **수행 주체**: Claude Opus (`Gemini 4 Argon` 1순위 대체, Orchestrator)임.
- **배경**: 사용자 요청. R77 등록 모달처럼 모든 이미지 입력을 URL·붙여넣기·파일로 통일함.
- **조사**: 파일 전용 5곳(캘린더 배경 제외 시 4곳), 이미 지원하지만 각자 구현한 관리자·요청 입력 7곳 + R77 모달 확인함.
- **결정**: 공용 등록 모달, 캘린더 배경 제외, 기존 7곳도 교체, 사용자 화면도 wsrv.nl 프록시 대체 경로 사용.
- **Worktree**: `.worktrees/r81-image-input-unification`(Base `adb8e72`). Run `r79` Step 2 리뷰는 이 Run 뒤로 보류함.
- **다음 단계**: Step 1(`Claude Opus`, 명세) `▶ READY`임.

## Run `r79-sql-tests-local-run` Step 2 정적 리뷰 보류 (2026-11-11)

- **리뷰**: Base `a580d1d` ↔ Target `f13087d`에서 `R79-REV-001`(P3) 발견함. [sql/README.md](../sql/README.md) 61~62행의 `psql ******127.0.0.1:54322/postgres`가 유효하지 않은 명령임.
- **동적 검증**: 로컬 Docker Supabase에서 `TESTS.sql` 재실행 결과 38개 PASS·최종 rollback PASS 확인함.
- **산출물**: `review.json`·`test.json` 커밋 `4c1e84a`임.
- **상태**: 실행 절차 명령 수정 전 `main` 병합 보류함. 수정 후 재리뷰 필요함.

## Run `r79-sql-tests-local-run` 등록·Step 1 완료 (2026-11-11)

- **수행 주체**: Claude Opus (Orchestrator 대체 + Maker)임.
- **환경**: 사용자가 psql 17·Docker Desktop을 설치함. 저장소 밖 폴더에 로컬 Supabase(CLI 2.120.0)를 띄우고 `SCHEMA.sql`·`user-icons` 버킷을 적용함.
- **결과 (워크트리 `f13087d`, 미병합)**: `TESTS.sql` 첫 실행에서 테스트 버그 3건을 찾아 고친 뒤 38개 블록 전체 PASS함. 스키마·RPC 버그는 없음. README에 로컬 실행 절차를 추가함.
- **상태**: Step 2 정적 리뷰에서 P3 finding 발견함.

## R80 마이그레이션 운영 적용 (2026-11-11)

- 사용자가 운영 DB에 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql`을 적용하고 수정된 확인 쿼리에서 `true`를 확인함. `users.role` 관리자도 분류 아이콘을 저장할 수 있는 상태임.
- **남은 확인 (사용자)**: 관리자 화면 분류 아이콘 등록 재시도, 보유 캐릭터 화면 아바타·이름 크기 확인.
- **다음 단계**: 활성 Dispatch Queue 과제 없음.

## R80 확인 쿼리 수정 (2026-11-11)

- 사용자가 R80 마이그레이션 적용 후 확인 쿼리에서 `false`를 받음 → `pg_get_expr`가 `public.`을 생략해 생긴 확인 쿼리 오류임. `sql/README.md` 쿼리를 고치고 `docs/known-pitfalls.md` 39번에 기록함(Claude Opus).
- **다음 단계**: 사용자가 수정 쿼리 실행(`true` 기대) 후 분류 아이콘 등록 재시도함. 결과에 따라 Run `r80` Step 3 마감함.

## Run `r80-classification-icon-admin-policy` Step 2 완료 — `main` 병합 `dbded69` (2026-11-11)

- **리뷰**: Base `103dbf5` ↔ Target `c6ddd4d` 정적 리뷰 findings 없음. 정책의 JWT `app_metadata.role`·`users.role` 조건, 자기 승격 차단 트리거, 사용자 조회 정책을 확인함.
- **산출물**: `review.json`·`test.json` 커밋 `d621604`임.
- **검증**: tsc·lint·diff-check·Vitest 64파일/783개 통과함. Python 부재로 아티팩트 스키마 검증은 미실행함.
- **다음 단계**: 사용자가 운영 DB에 `MIGRATION_R80_CLASSIFICATION_ICON_ADMIN_POLICY.sql`을 적용하고 확인 쿼리 및 아이콘 저장을 재시험해야 함.

## Run `r80-classification-icon-admin-policy` 등록·Step 1 완료 (2026-11-11)

- **수행 주체**: Claude Opus (Orchestrator 대체 + Maker)임.
- **원인**: 분류 아이콘 저장 실패는 R64 쓰기 정책만 JWT `app_metadata.role`을 요구해서였음. `users.role`로만 관리자인 계정은 RLS `42501`로 막혔고 화면에는 일반 문구만 나왔음.
- **Step 1 (워크트리 `a2c2f47`·`c6ddd4d`, 미병합)**: 정책을 다른 관리자 테이블과 같은 조건으로 교체하는 마이그레이션·스키마·테스트·명세 개정, 저장 실패 시 코드·메시지 표시, 보유 캐릭터 아바타·이름 확대. tsc·lint·diff-check 통과, Vitest 783개 통과함.
- **상태**: Step 2 리뷰·병합 완료함. 이후 사용자가 R80 마이그레이션을 운영 DB에 적용해야 아이콘 저장이 됨.

> 2026-11-10 이전 기록은 [`docs/archive/progress-archive.md`](archive/progress-archive.md)로 옮김.
