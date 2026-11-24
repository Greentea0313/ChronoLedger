# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Argon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **Run ID**: `r96-web-push` *(`R96` Web Push 외부 발송: `public.push_subscriptions`·4개 RPC·`pg_net` 웹훅·순수 Web Crypto RFC 8291/8292·Edge Function `send-notifications`·SW `push` 핸들러·로그아웃 해제·설정 UI — 명세 [`docs/push-notification-research.md`](push-notification-research.md) §11)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-24 등록)*
- **Worktree 경로**: `.worktrees/r96-web-push` (브랜치: `collab/r96-web-push`, 매니페스트: `artifacts/r96-web-push/run.json`)
- **Base SHA**: `54a1224d7833566da43d0a41d6014bc459c84a0a`
- **Target SHA**: `e2dbc4db2a900bdc09f07ae32d23ac419078e290` *(iteration-02 Maker 수정 기준. iteration-01 리뷰 대상 `c3940c50d993d2243daf53d3c6388dae96675447`, Step 1 DB: `abdfd17d3f5ed0f0ae4b8e66254b2fc32d63b1d2`, Step 2 App: `c3940c50d993d2243daf53d3c6388dae96675447`)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R96_WEB_PUSH.sql`, `sql/SCHEMA.sql` — `push_subscriptions`·RLS·`SECURITY DEFINER` RPC 4종·`pg_net` 웹훅 → Opus 승격 조건 ①). ⚠️ `LOCAL_DB_DEFERRED` — 현재 PC Docker CLI 미설치(`NO_DOCKER`)로 로컬 DB 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 검증은 미실행이며 Step 3(🐳 Docker 환경)에서 필수 수행함.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: abdfd17d3f5ed0f0ae4b8e66254b2fc32d63b1d2)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R96 DB/RLS/RPC/pg_net & Types)` | 아래 **Step 1 수용 기준** 수행(🐳 Docker Desktop 필요, 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 진행). 허용 파일: 신규 `sql/migrations/MIGRATION_R96_WEB_PUSH.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ abdfd17`: `MIGRATION_R96_WEB_PUSH.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. `tsc`·`lint`·`diff-check`·Vitest 72파일/968개 통과. ⚠️ `LOCAL_DB_DEFERRED`(Docker 미설치, 아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: c3940c50d993d2243daf53d3c6388dae96675447)`** | **Gemini 4 Neon** *(Fallback 1: Claude Opus / Gemini 4 Hydrogen, Fallback 2: GitHub Copilot)* | `Maker (Web Crypto·Edge Function·SW·로그아웃 해제·설정 UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: 신규 `src/lib/web-push-crypto.ts`·`test.ts`, `supabase/functions/send-notifications/index.ts`, `src/lib/push-notifications.ts`·`test.ts`, `public/sw.js`, `src/app/dashboard/layout.tsx`, `src/app/admin/layout.tsx`, `src/components/auth/account-deletion-status.tsx`, `src/components/settings/notification-settings-card.tsx`, `src/app/dashboard/settings/page.test.tsx`(및 관련 레이아웃·SW 테스트), 루트 `docs/handoff.md`, `docs/progress.md` | `✅ c3940c5`: 순수 Web Crypto RFC 8291/8292 모듈·Edge Function·`sw.js` v6·푸시 헬퍼·로그아웃 3곳·설정 UI 확장·테스트 추가. `tsc`·`lint`·`diff-check`·Vitest 74파일/987개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`🛑 BLOCKED (로컬 DB 검증 대기)`** | **Claude Opus** *(Fallback 1: Gemini 4 Argon — Step 1·2 Maker가 Gemini 4 Neon이므로 독립 리뷰어 필수)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. Base(`54a1224d7833566da43d0a41d6014bc459c84a0a`) $\leftrightarrow$ Target(`c3940c50d993d2243daf53d3c6388dae96675447`) 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감 | `🛑` iteration-02 Maker 수정 `e2dbc4d`(P2 3건·P3 반영) 완료, Docker PC에서 iteration-02 리뷰·로컬 DB 실행 후 병합 필요. iteration-01 아티팩트 `bd24e4f`(워크트리). P2 3건·P3 1건·P4 2건, tsc·lint·Vitest 987개·build 통과, 로컬 DB 미실행(이 PC Docker 미설치)으로 병합 보류. 아래 Step 3 리뷰 기록 참고 |

#### 📋 `r96-web-push` Step 1 수용 기준 (`GPT Codex` — DB/RLS/RPC/`pg_net` & Types, [`docs/push-notification-research.md`](push-notification-research.md) §11.2·§11.4)

1. **`public.push_subscriptions` 테이블·RLS·탈퇴 연동**: `https://` 시작·길이 제한 CHECK, 본인 조회 전용(`anon`·직접 쓰기 차단), 계정 삭제 대기 차단 RESTRICTIVE 정책·트리거 및 `purge_expired_account_deletion_requests` 삭제 연결.
2. **4개 `SECURITY DEFINER` RPC & 예외 격리 `pg_net` 웹훅**: `upsert_push_subscription`(공용 기기 `endpoint` 소유자 원자적 교체), `delete_push_subscription`, `claim_pending_push_notifications`(`FOR UPDATE SKIP LOCKED`, `request_result=false`/`push_enabled=false`/구독 0건 시 `SKIPPED`), `complete_push_notification_delivery`(`404`/`410` 정리·`429`/`5xx` 3회 재시도 후 `FAILED`), `trigger_send_notifications_webhook`(`pg_net` 미설정·예외 시 INSERT 트랜잭션 보호).
3. **동기화 및 검증**: `MIGRATION_R96_WEB_PUSH.sql`(멱등), `SCHEMA.sql`, `README.md`(B표 확인 쿼리), `TESTS.sql`(`R96` 스모크 블록), `database.types.ts` 반영 후 `tsc`·`lint`·`vitest`·`diff-check` 통과 및 커밋(🐳 Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록).

#### 📋 `r96-web-push` Step 2 수용 기준 (`Gemini 4 Neon` — Web Crypto·Edge Function·SW·UI & Vitest, [`docs/push-notification-research.md`](push-notification-research.md) §11.3·§11.4)

1. **순수 Web Crypto & Edge Function**: `src/lib/web-push-crypto.ts`(RFC 8292 VAPID ES256 JWT + RFC 8291 `aes128gcm`) 및 단위 테스트, `supabase/functions/send-notifications/index.ts` 워커(`404`/`410` 정리·`429`/`5xx` 3회 재시도·민감정보 로그 배제).
2. **SW & 로그아웃 구독 해제**: `public/sw.js`(`chronoledger-shell-v6`, `push`/`notificationclick` 동일 출처 상대 경로 강제), `src/lib/push-notifications.ts` 및 로그아웃 3곳(`dashboard/layout`, `admin/layout`, `account-deletion-status`) 구독 해제 연동.
3. **설정 UI 확장 및 검증**: `NotificationSettingsCard`(`request_result`·`push_enabled` 토글, `[이 기기에서 푸시 알림 켜기]`, Tauri/iOS/권한 거부/미적용 DB 폴백, 등록 기기 목록·`[해제]`) 및 Vitest 통과(`tsc`·`lint`·`vitest`·`diff-check`), 커밋 후 Step 3 `▶ READY` 전환.

#### 📝 `r96-web-push` iteration-02 Maker 기록 (Claude Opus, 2026-11-24)

- **Target SHA**: `e2dbc4db2a900bdc09f07ae32d23ac419078e290`(워크트리, 미push). 변경: 마이그레이션·`SCHEMA.sql`·`TESTS.sql`·`sql/README.md`·`database.types.ts`·`web-push-crypto.test.ts`·`docs/push-notification-research.md` §11.5임.
- **수정**: ① `notifications.push_claimed_at` 추가, `claim`이 5분 점유하고 `complete`가 해제(동시 호출 중복 발송 방지) ② 1일 지난 알림·첫 기기 등록 이전 알림은 `SKIPPED`(과거 알림 일괄 발송 방지) ③ 배포 절차 §11.5 추가(`--no-verify-jwt`, 시크릿, DB 설정값, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) ④ 웹훅 호출을 `invoke_send_notifications_webhook`로 분리하고 5분 재시도 `pg_cron` 잡 `chronoledger-push-retry` 추가.
- **P4 처리**: 워커 출력 본문을 라이브러리 복호화로 검증하는 테스트 추가함. RFC 8291 부록 A 고정 벡터 테스트와 Vault 이전은 반영 안 함(§11.5에 절충으로 기록).
- **검증**: tsc·lint·Vitest 74파일 988개·`git diff --check` 통과. 마이그레이션과 `SCHEMA.sql`의 R96 함수 7개 본문 일치 확인. 새 SQL 검사(점유·과거 알림·재시도 잡)는 **미실행**(`⚠️ LOCAL_DB_DEFERRED`, Docker 미설치).
- **원격 브랜치**: push 안 함.
- **다음**: Docker PC에서 Reviewer(Claude Opus)가 iteration-02(Base `54a1224` ↔ Target `e2dbc4d`) 리뷰·로컬 DB 2회 적용·`TESTS.sql` 통과 기록 후 병합함.

#### 📝 `r96-web-push` Step 3 리뷰 기록 (Claude Opus, 2026-11-24, iteration-01)

- **범위**: Base `54a1224` ↔ Target `c3940c50d993d2243daf53d3c6388dae96675447`. 범위 검사 통과, `run.json` `target_sha` 갱신, `review.json`·`test.json` 스키마 검증 후 아티팩트 커밋 `bd24e4f`(미push). Maker가 `main`에 남긴 Step 1·2 미커밋 큐 기록은 `5eb8804`로 보존함.
- **확인된 점**: RFC 8291 키 유도(`WebPush: info`·`aes128gcm`·`nonce`)와 VAPID ES256 구성 정상, SW `push`/`notificationclick` 동일 출처 강제, 로그아웃 3곳 해제 연동, RPC 권한(`service_role` 전용 2종·`authenticated` 2종) 적절함.
- **발견 P2**: ① `claim`이 상태를 `PENDING`으로 두고 잠금이 RPC 종료 시 풀려 동시 웹훅 호출 시 중복 발송 ② R84 이후 쌓인 기존 `PENDING` 알림(최대 30일치)이 첫 구독 후 한꺼번에 푸시됨 ③ Supabase Edge Function 기본 JWT 검증 때문에 `x-webhook-secret`만 보내는 웹훅이 401로 막힘, 배포 설정·VAPID·DB 설정 절차 문서 없음.
- **발견 P3·P4**: P3 일시 오류 재시도를 다시 호출할 스케줄 없음(다음 알림 INSERT까지 대기). P4 워커 내 암호화 사본 미검증(RFC 8291 부록 A 벡터·워커 출력 복호화 테스트 없음), 웹훅 시크릿을 DB 설정값에 보관.
- **검사**: tsc·lint·Vitest 74파일 987개·build(더미 로컬 환경값)·`git diff --check` 통과. 로컬 Supabase 2회 적용·`TESTS.sql`·Edge Function 실배포는 **미실행**.
- **다음 단계(권장)**: iteration-02 Maker(SQL·Edge Function이므로 Claude Opus 또는 Gemini 4 Neon)가 P2 3건·P3 수정 후, Docker PC에서 Reviewer가 로컬 DB 검증을 기록하고 병합함. 다른 PC로 옮기려면 `collab/r96-web-push` push 필요.

#### 📝 `r96-web-push` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-24)

- **Target SHA**: `abdfd17d3f5ed0f0ae4b8e66254b2fc32d63b1d2` (워크트리 브랜치 `collab/r96-web-push`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R96_WEB_PUSH.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·RLS·RPC·웹훅 변경**:
  - `public.push_subscriptions` 테이블(`endpoint` `^https://` 12~2048자 UNIQUE·`p256dh` 40~256자·`auth` 16~128자·`platform` 3종·`user_agent_label` 1~100자 CHECK), `idx_push_subscriptions_user_id` 인덱스, RLS 활성화 및 `authenticated` 본인 조회 전용(`anon`·직접 쓰기 차단), 계정 삭제 대기 RESTRICTIVE 정책·트리거(`SCHEMA.sql` 공통 루프 2곳 포함) 및 `purge_expired_account_deletion_requests` 삭제 연결.
  - 4개 `SECURITY DEFINER` RPC 구현: `upsert_push_subscription`(공용 기기 `endpoint` 소유자 원자적 교체 + `notification_settings.push_enabled = true` 동기화), `delete_push_subscription`(본인 행 삭제 + 남은 구독 0건 시 `push_enabled = false`), `claim_pending_push_notifications`(`service_role` 전용, `FOR UPDATE SKIP LOCKED`, 삭제 대기·`push_enabled=false`·`request_result=false`·구독 0건 시 즉시 `SKIPPED`, 3회 이상 선점 잔존 행 `FAILED` 마감), `complete_push_notification_delivery`(`service_role` 전용, `404`/`410` 만료 `endpoint` 삭제 및 0건 시 `push_enabled = false` 동기화, 성공 `endpoint` `last_success_at` 갱신, `push_attempts >= 3` 시 서버 측 `FAILED` 강제).
  - 예외 격리 `trigger_send_notifications_webhook()` + `trg_notifications_send_webhook` (`AFTER INSERT ON public.notifications FOR EACH STATEMENT`, `pg_net` 미설치·설정 미지정·호출 실패 시 `EXCEPTION WHEN OTHERS THEN RETURN NULL`로 INSERT 트랜잭션 보호).
  - `sql/README.md` B표 `MIGRATION_R96_WEB_PUSH.sql` 확인 쿼리·선행 purge 주의 추가, `sql/tests/TESTS.sql` `R96-01`~`R96-04` 스모크 블록 추가, `src/types/database.types.ts` 동기화.
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(72파일/968개 통과) 확인함.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED`)**: 현재 PC Docker CLI 미설치(`NO_DOCKER`)로 로컬 Supabase 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 실행 검증은 미수행임. Step 3(Docker 환경)에서 로컬 DB 병합 게이트 검증 필수임.

#### 📝 `r96-web-push` Step 2 완료 기록 (Gemini 4 Neon, 2026-11-24)

- **Target SHA**: `c3940c50d993d2243daf53d3c6388dae96675447` (워크트리 브랜치 `collab/r96-web-push`, 미병합). 변경 파일(12개): 신규 `src/lib/web-push-crypto.ts`·`src/lib/web-push-crypto.test.ts`·`supabase/functions/send-notifications/index.ts`·`src/lib/push-notifications.ts`·`src/lib/push-notifications.test.ts`, 수정 `public/sw.js`·`src/components/pwa/sw.test.ts`·`src/app/dashboard/layout.tsx`·`src/app/admin/layout.tsx`·`src/components/auth/account-deletion-status.tsx`·`src/components/settings/notification-settings-card.tsx`·`src/app/dashboard/settings/page.test.tsx` (`run.json` 미수정).
- **순수 Web Crypto & Edge Function**:
  - `src/lib/web-push-crypto.ts`: 외부 패키지 0개로 `crypto.subtle` 기반 RFC 8292 VAPID ES256 JWT 서명(`createVapidAuthorizationHeader`), RFC 8291/8188 `aes128gcm` 암호화(`encryptWebPushPayload`)·복호화 검증 헬퍼(`decryptWebPushPayload`), 잠금 화면 안전 페이로드 빌더(`buildSafePushPayload`, 동일 출처 상대 경로 강제) 구현함.
  - `supabase/functions/send-notifications/index.ts`: Deno 단독 배포와 Next.js `tsc --noEmit`을 동시에 만족하는 자체 완결형 순수 Web Crypto 워커 구현(`x-webhook-secret` 또는 `Authorization: Bearer <SERVICE_ROLE_KEY>` 상수 시간 검증, `claim` → 구독 일괄 조회 → 암호화 POST → `404`/`410` 만료 정리·`429`/`5xx` 3회 재시도 후 `FAILED` → `complete`, 로그에 `endpoint`·암호화 키·시크릿 출력 금지).
- **SW·푸시 헬퍼·로그아웃 해제·설정 UI**:
  - `public/sw.js`: `SHELL_CACHE`를 `chronoledger-shell-v6`으로 상향하고 `push`(비정상 JSON 폴백) 및 `notificationclick`(동일 출처 상대 경로 `^/(?!/)` 강제, 기존 창 navigate+focus 또는 `openWindow`) 추가함. 기존 `sw.test.ts`의 `v5` 단언을 `v6`으로 갱신하고 push/click 테스트 2건 추가함.
  - `src/lib/push-notifications.ts`: 플랫폼 감지 5종(`tauri_desktop`·`ios_install_required`·`unsupported`·`unconfigured`·`supported`), 비식별 요약 기기 라벨(`buildUserAgentLabel`), 클릭 전용 구독(`subscribeCurrentDevicePush`), 로그아웃 공용 정리(`unsubscribeCurrentDevicePush` — SW 미등록 환경에서 멈추지 않도록 `getRegistration()` 사용, 오프라인·RPC 실패 시에도 로컬 `subscription.unsubscribe()` 실행) 구현 및 `dashboard/layout.tsx`·`admin/layout.tsx`·`account-deletion-status.tsx` 3곳 연동함.
  - `src/components/settings/notification-settings-card.tsx`: `요청 처리 결과 알림`(`request_result`) 토글과 `웹 푸시 알림 (외부 기기 알림)` 섹션(`push_enabled` 토글, 플랫폼/권한 거부/R96 미적용 DB 폴백 안내, `[이 기기에서 푸시 알림 켜기]`, 등록 기기 목록 및 `[해제]` + 현재 기기 로컬 해제 + 마지막 기기 해제 시 `push_enabled = false` 동기화) 추가함.
- **결정·가정**:
  - `tsconfig.json`이 `**/*.ts`를 포함하고 `allowImportingTsExtensions`가 꺼져 있으므로 `supabase/functions/send-notifications/index.ts`는 외부 URL import나 `../../../src/` 상대 import 대신 순수 Web Crypto 구현을 자체 내장하고 `Deno` 타입만 선언해 `tsc`·`lint`·Vitest·Deno 단독 배포가 모두 통과하게 구성함.
  - `src/components/pwa/sw.test.ts`는 `public/sw.js` `SHELL_CACHE` 버전 상향 시 기존 단언이 깨지므로 함께 갱신함.
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(74파일 / 987개 통과 — 신규·확장 테스트 19건 포함) 확인함. 실브라우저·실Edge Function 배포·로컬 Supabase 실행(`⚠️ LOCAL_DB_DEFERRED`)은 미확인임.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 Step 3를 이어가려면 `git -C .worktrees/r96-web-push push -u origin collab/r96-web-push` 필요함.
- **다음 단계**: Step 3(**Claude Opus**, Fallback 1: **Gemini 4 Argon** — Base `54a1224` ↔ Target `c3940c5` 통합 정적 리뷰·🐳 로컬 DB 2회 멱등 및 `TESTS.sql` 검증·`main` 병합·문서 마감) `▶ READY`임.

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 📐 Chief Architect 구체화 완료 (`R101` · `R102` · `R103` 신규 기능 명세 확정 및 `R104` 보류)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (2026-11-24)`** | **Gemini 4 Argon** *(Fallback: Claude Opus / Gemini 4 Neon)* | `Chief Architect (R101·R102·R103 명세·RLS·수용 기준 확정 및 R104 검토 정리)` | 아래 **요구사항 접수 기록**을 바탕으로 `R101`(2개월 예산 비교)·`R102`(DB 저장 과금 프리셋 테이블·RLS·탈퇴 정리)·`R103`(단축키·선택형 시작 안내) 공식 명세·Step별 수용 기준 확정 및 `R104`(게임별 천장 계산기) 검토 방향 정리 (`src/**` 직접 수정 금지). 허용 파일: 신규 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md), `docs/handoff.md`, `docs/to-do.md`, `docs/progress.md` | `✅` 질문 카드 4건 확정: ① DB 변경 없는 1차 Run(`R101`+`R103`) 우선 착수 후 2차 Run(`R102`) 분리, ② `R101` 익월 미생성 `MONTHLY_DAY` 정기 구독 고정비 포함 비교, ③ `R102` 지출 모달 칩 + **`[프리셋 저장]`** 버튼(최대 20개), ④ `R104` `⏸️ 보류`. 명세서 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) 작성 완료 |
| **2** | **`✅ DONE (2026-11-24)`** | **Gemini 4 Hydrogen** *(Fallback: Claude Sonnet)* | `Orchestrator (1차 Run r101-r103-two-month-budget-and-shortcuts 등록)` | [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §2.3에 따라 DB 변경 없는 1차 Run **`r101-r103-two-month-budget-and-shortcuts`** 격리 워크트리(`New-CollaborationRun.ps1`) 생성 및 Dispatch Queue(Step 1 `Gemini 4 Hydrogen` `▶ READY`, Step 2 `Claude Sonnet` `⏳ WAITING`) 등록 수행 (`r96-web-push`는 Docker PC 검증 대기 상태로 병행 유지) | `✅` `.worktrees/r101-r103-two-month-budget-and-shortcuts`(Base `4fbf67f`) 생성 및 아래 병행 Run 등록 완료 |

#### 📝 `R101` · `R102` · `R103` · `R104` Chief Architect 명세 확정 기록 (Gemini 4 Argon, 2026-11-24)

1. **확정 명세 문서**: [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md)
2. **사용자 질문 카드 결정 (2026-11-24)**:
   - **Run 분할**: DB 변경이 없어 현재 PC(Docker 미설치 환경)에서 병합까지 즉시 완결 가능한 **`R101` + `R103`을 1차 Run (`r101-r103-two-month-budget-and-shortcuts`)**으로 먼저 진행하고, DB/RLS 마이그레이션이 필요한 **`R102`는 2차 Run (`r102-expense-presets`)**으로 분리함.
   - **`R101` 익월 산출 기준**: 익월 예산(미설정 시 `default_budget` 폴백) 대비 이미 등록된 익월 귀속 지출과 아직 익월 `PLANNED` 행이 생성되지 않은 활성 `MONTHLY_DAY` 정기 구독 예상 고정비(중복 템플릿 제외)를 합산해 당월·익월의 고정비·예정 지출·예상 잔여 예산을 나란히 비교함.
   - **`R102` 과금 프리셋**: `public.user_expense_presets`(사용자당 최대 20개 상한 트리거, 특정 게임 연결 또는 공통 `NULL`, 본인 CRUD RLS, 삭제 대기 차단·탈퇴 정리)에 저장하고, `ExpenseModal` 상단 칩 원클릭 적용·삭제 및 **`[프리셋 저장]`** 버튼으로 즉시 저장을 지원함.
   - **`R104` 천장 계산기**: **`⏸️ 보류`**로 결정함(사용자가 직접 호출할 때만 재검토).

### 🚦 병행 활성 Run: `r102-expense-presets`

- **Run ID**: `r102-expense-presets` *(`R102` 자주 쓰는 과금 프리셋 사용자 DB 저장: `public.user_expense_presets` 최대 20개 + `ExpenseModal` 상단 칩 원클릭 적용·**`[프리셋 저장]`**·삭제 — 명세 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3, `r96-web-push`와 병행)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-24 등록)*
- **Worktree 경로**: `.worktrees/r102-expense-presets` (브랜치: `collab/r102-expense-presets`, 매니페스트: `artifacts/r102-expense-presets/run.json`)
- **Base SHA**: `052e53acdd7d22031bcee020487f91bd37718ad5`
- **Target SHA**: `bffa1e45abeac81074122dbb9c51550f155bdf85` *(Step 2 완료 기준, 미병합)*
- **DB 변경**: 있음 (`sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql` — `user_expense_presets`·RLS·20개 상한 트리거·탈퇴 정리 → Opus 승격 조건 ①). ⚠️ `LOCAL_DB_DEFERRED` — 현재 PC Docker CLI 미설치(`NO_DOCKER`)로 로컬 DB 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 검증은 미실행이며 Step 3(🐳 Docker 환경)에서 필수 수행함.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: a6a36ed304d6b6a53f04b75851b0c6697af8b352)`** | ~~**GPT Codex**~~ ➡️ **Gemini 4 Neon** *(1순위 대체로 수행)* | `Maker (R102 DB/RLS/Trigger & Types)` | 아래 **Step 1 수용 기준** 수행(🐳 Docker Desktop 필요, 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 2 진행). 허용 파일: 신규 `sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ a6a36ed`: `MIGRATION_R102_EXPENSE_PRESETS.sql`·`SCHEMA.sql`·`README.md`·`TESTS.sql`·`database.types.ts` 반영. `tsc`·`lint`·`diff-check`·Vitest 74파일/977개 통과. ⚠️ `LOCAL_DB_DEFERRED`(Docker 미설치, 아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: bffa1e45abeac81074122dbb9c51550f155bdf85)`** | **Claude Sonnet** *(Fallback 1: Gemini 4 Hydrogen, Fallback 2: GitHub Copilot)* | `Maker (ExpenseModal 프리셋 칩·[프리셋 저장]·삭제 UI & Vitest)` | Step 1 완료 후 착수. 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ bffa1e4`: ExpenseModal 프리셋 칩·`[프리셋 저장]`·삭제·미적용 DB 폴백. tsc·lint·Vitest 993개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`▶ READY`** | **Claude Opus** *(Fallback 1: Gemini 4 Argon / Gemini 4 Neon)* | `Reviewer & Orchestrator` | Step 2 완료 후 착수. Base(`052e53acdd7d22031bcee020487f91bd37718ad5`) $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감 | `▶ Step 2 완료(bffa1e4). Base 052e53a ↔ Target bffa1e4` |

#### 📋 `r102-expense-presets` Step 1 수용 기준 (`GPT Codex` — DB/RLS/Trigger & Types, [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3.1·§3.3)

1. **`public.user_expense_presets` 테이블·20개 상한 트리거**: `title`(1~150자)·`category`·`game_id`(ON DELETE SET NULL)·`original_price`(>=0)·`payment_method`·`point_platform`·`deduct_from_asset`·`sort_order`·인덱스 및 `enforce_user_expense_presets_limit`(20개 이상 시 `23514` 예외) 구현.
2. **RLS·계정 삭제 연동**: 본인 CRUD 정책(`Manage own expense presets`), 계정 삭제 대기 `RESTRICTIVE` 정책·트리거(`SCHEMA.sql` 공통 루프 2곳 포함), `purge_expired_account_deletion_requests` 삭제 연결.
3. **동기화 및 검증**: `MIGRATION_R102_EXPENSE_PRESETS.sql`(멱등), `SCHEMA.sql`, `README.md`(B표 확인 쿼리), `TESTS.sql`(`R102` 스모크 블록), `database.types.ts` 반영 후 `tsc`·`lint`·`vitest`·`diff-check` 통과 및 커밋(🐳 Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록).

#### 📋 `r102-expense-presets` Step 2 수용 기준 (`Claude Sonnet` — `ExpenseModal` 프리셋 UI & Vitest, [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3.2·§3.3)

1. **프리셋 칩 목록·적용·삭제**: 신규 등록 모드에서 본인 `user_expense_presets` 조회(미적용 DB `42P01`/`PGRST205` 숨김 폴백), 선택 게임+공통(`null`) 칩 표시, 클릭 시 폼 필드 일괄 채움, `×` 삭제(`isOffline()` 가드).
2. **`[프리셋 저장]` & 테스트**: 현재 입력값 검증 후 `INSERT`·칩 갱신(20개 초과·오프라인·미적용 DB 안내) 및 `expense-modal.test.tsx` 추가 후 `tsc`·`lint`·`vitest`·`diff-check` 통과, 커밋 후 Step 3 `▶ READY` 전환.

#### 📝 `r102-expense-presets` Step 1 완료 기록 (Gemini 4 Neon — GPT Codex 1순위 대체, 2026-11-24)

- **Target SHA**: `a6a36ed304d6b6a53f04b75851b0c6697af8b352` (워크트리 브랜치 `collab/r102-expense-presets`, 미병합). 변경 파일: 신규 `sql/migrations/MIGRATION_R102_EXPENSE_PRESETS.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts` (허용 5개 파일만, `run.json` 미수정).
- **DB·트리거·RLS·탈퇴 변경**:
  - `public.user_expense_presets` 테이블(`title` 1~150자·`category` 5종·`game_id` `ON DELETE SET NULL`·`original_price >= 0`·`payment_method` 2종·`point_platform` NULL 또는 2종·`deduct_from_asset`·`sort_order`), `idx_user_expense_presets_user_sort` 인덱스 생성함(`SCHEMA.sql`에서는 `games`·`expenses` 뒤, 공통 계정 삭제 대기 루프 앞에 배치).
  - `public.enforce_user_expense_presets_limit()` (`SECURITY DEFINER SET search_path = public`, `pg_advisory_xact_lock`으로 동일 사용자 동시 INSERT 직렬화 후 20개 이상 시 `23514` 예외 발생, 직접 실행 권한 회수) 및 `trg_enforce_user_expense_presets_limit` (`BEFORE INSERT`) 추가함.
  - RLS 활성화(`Manage own expense presets`, 본인 행 CRUD 허용, `anon` 차단), 계정 삭제 대기 차단 RESTRICTIVE 정책·트리거(`SCHEMA.sql` 공통 루프 2곳 포함) 및 `purge_expired_account_deletion_requests`에 `DELETE FROM public.user_expense_presets WHERE user_id = v_req.user_id;` 추가함.
  - `sql/README.md` B표 확인 쿼리·선행 purge 주의 추가, `sql/tests/TESTS.sql` `R102-01`~`R102-04` 스모크 블록(RLS·CHECK·20개 상한·삭제 후 재등록·게임 `SET NULL`·삭제 대기 차단·탈퇴 정리·`anon` 차단) 추가, `src/types/database.types.ts` `user_expense_presets` 타입 추가함.
- **검증**: 워크트리에서 `git diff --check`, `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `npx vitest run`(74파일 / 977개 통과) 확인함.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED`)**: 현재 PC Docker CLI 미설치(`NO_DOCKER`)로 로컬 Supabase 2회 멱등 적용·신규 `SCHEMA.sql`·`TESTS.sql` 실행 검증은 미수행임. Step 3(Docker 환경)에서 로컬 DB 병합 게이트 검증 필수임.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC에서 이어가려면 `git -C .worktrees/r102-expense-presets push -u origin collab/r102-expense-presets` 필요함.
- **다음 단계**: Step 2(**Claude Sonnet**, Fallback 1: **Gemini 4 Hydrogen**, Fallback 2: **GitHub Copilot** — `ExpenseModal` 프리셋 칩·`[프리셋 저장]`·삭제 UI & Vitest) `▶ READY`임.

#### 📝 `r102-expense-presets` Step 2 완료 기록 (Claude Sonnet, 2026-11-24)

- **Target SHA**: `bffa1e45abeac81074122dbb9c51550f155bdf85` (워크트리 브랜치 `collab/r102-expense-presets`, 미병합·원격 push 안 함). SQL·타입 변경 없음. 변경 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`(허용 2개 파일만, `run.json` 미수정).
- **칩 목록·적용**: 신규 등록 모드(`!plannedExpense && !editingExpense`)에서 모달이 열릴 때 `user_expense_presets`를 `sort_order`·`created_at` 오름차순으로 조회해 `자주 쓰는 과금` 칩으로 표시함. 선택한 게임의 프리셋과 공통(`game_id === null`) 프리셋만 보이고, 칩 클릭 시 항목명·카테고리·게임(게임 카테고리이고 프리셋에 게임이 있을 때)·정가·실결제액·결제수단·플랫폼(`point_platform ?? "OTHER"`)·총자산 차감을 채우며 할인·쿠폰·사용 포인트·적립 입력은 비움. 게임이 아닌 카테고리 프리셋은 게임을 비우고 플랫폼을 `OTHER`로 둠(기존 카테고리 변경 동작과 동일).
- **삭제**: 칩의 `×`가 해당 프리셋을 `DELETE`하고 칩을 제거함(`isOffline()` 가드, 실패 시 칩 유지·오류 표시).
- **`[프리셋 저장]`**: 항목명 1~150자, 정가 0 이상 정수를 검증하고 `INSERT`(`game_id`는 게임 카테고리에서 선택한 게임 또는 `null`, `point_platform`은 스토어 플랫폼일 때만, `sort_order`는 현재 개수) 후 목록을 다시 불러와 칩을 갱신함. 이미 20개면 요청 없이 "최대 20개" 안내, DB 트리거 `23514`도 같은 문구, 오프라인은 오프라인 안내, 테이블 미적용은 "DB 업데이트(R102) 적용 후" 안내를 표시함.
- **미적용 DB 폴백**: 조회가 `42P01`/`PGRST205`이면 프리셋 영역 전체를 숨기고 오류를 기록하지 않으며 나머지 지출 입력은 그대로 동작함. 예정 지출 결제·수정 모드에서는 프리셋 영역도 조회도 하지 않음.
- **검증**: `tsc --noEmit`, `npm run lint`, `git diff --check`(CRLF 경고만), Vitest 74파일 993개 통과함(프리셋 테스트 16개 추가: 조회·게임별 필터·필드 채움·비게임 적용·삭제 성공/실패/오프라인·저장·게임 저장·검증·20개 상한 클라이언트/DB·오프라인·미적용 2종·결제/수정 모드 숨김). 실브라우저·실DB 확인은 하지 않음.
- **미실행 (`⚠️ LOCAL_DB_DEFERRED` 유지)**: Step 1의 로컬 Supabase 2회 멱등 적용·`SCHEMA.sql`·`TESTS.sql` 실행은 여전히 미수행이며 Step 3(🐳 Docker 환경)이 맡음.
- **가정**: 프리셋 칩은 게임 선택 후에야 해당 게임 전용 프리셋이 보이는 명세(§3.2) 그대로임. 프리셋 이름 변경·순서 변경 UI는 명세에 없어 만들지 않음. 같은 제목의 프리셋 중복 저장은 막지 않음.
- **원격 브랜치**: push 안 함(사용자 승인 필요). 다른 PC(Docker)에서 Step 3을 하려면 `git -C .worktrees/r102-expense-presets push -u origin collab/r102-expense-presets` 필요함.
- **다음 단계**: Step 3(`Claude Opus`, Base `052e53a` ↔ Target `bffa1e4` 통합 리뷰·🐳 로컬 DB 검증·병합) `▶ READY`임.

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R39` | 완료 (`r39-daily-notifications`, `main` 병합 `9ae05f9`, 2026-11-24) | 운영 DB 적용·확인 쿼리 완료(사용자, 2026-11-24). 실브라우저·KST 09:00 알림 생성 확인 대기. P4 후속 `R39-REV-01`(타입 전용) | `docs/to-do.md` R39, 아래 직전 완료 Run 기록 |
| `R96` | **진행 중 · 활성 Run (`r96-web-push`)** | Step 1·2 완료, iteration-01 리뷰(P2 3건) → iteration-02 수정 `e2dbc4d` 완료 → `🛑 BLOCKED (로컬 DB 검증 대기)`, Docker PC에서 리뷰·병합 필요 | 위 활성 과제 표, `docs/to-do.md` R96, [`docs/push-notification-research.md`](push-notification-research.md) §11 |
| `R97` | 완료 (`r97-tauri-notifications`, `main` 병합 `d350267`, 2026-11-23) | 엣지 케이스 보완 병합 및 `npm run tauri dev` 실기기 OS 토스트 수신 확인 완료(개발 실행 시 발신 앱 `Windows PowerShell` 표기). 선택 후속 `R97-REV-001`(P4)이 `docs/to-do.md`에 있음 | [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R40`·`R75` | 후속 · 우선 낮음 | 리뷰 후속·확장 설계 (`R75` ①·④ 🐳 Docker 필요) | `docs/to-do.md` 해당 항목 |
| `R101`+`R103` | 완료 (`r101-r103-two-month-budget-and-shortcuts`, `main` 병합 `c942e1e`, 2026-11-24) | 당월·익월 예산 비교 카드와 데스크톱 단축키·빠른 시작 안내 병합 완료. 실브라우저 확인은 사용자 몫이고 선택 후속 `R101-REV-001`(P4)이 `docs/to-do.md`에 있음 | 아래 직전 완료 Run 기록 |
| `R102` | **진행 중 · 병행 활성 Run (`r102-expense-presets`)** | `public.user_expense_presets`(최대 20개) + `ExpenseModal` 칩 원클릭 적용·**`[프리셋 저장]`**·삭제 — Step 1(`a6a36ed`, `⚠️ LOCAL_DB_DEFERRED`) 완료 → Step 2(`Claude Sonnet`) `▶ READY` | 위 병행 활성 Run 표, [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3, `docs/to-do.md` `R102` |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |

### 🗂️ 직전 완료 Run 기록: `r101-r103-two-month-budget-and-shortcuts`

- **Run ID**: `r101-r103-two-month-budget-and-shortcuts` **(완료, `main` 병합 `c942e1e`, 2026-11-24)** *(`R101` 당월+익월 2개월 예산·고정 구독비 비교 뷰 + `R103` 데스크톱 키보드 단축키·선택형 빠른 시작 안내 — DB 변경 없음, `r96-web-push`와 병행)*
- **Orchestrator**: Gemini 4 Hydrogen *(2026-11-24 등록)*
- **Worktree 경로**: `.worktrees/r101-r103-two-month-budget-and-shortcuts` (브랜치: `collab/r101-r103-two-month-budget-and-shortcuts`, 매니페스트: `artifacts/r101-r103-two-month-budget-and-shortcuts/run.json`)
- **Base SHA**: `4fbf67f2a1e2ac47f0945aaa72011734f347e333`
- **Target SHA**: `8a53990e0407f79170f401fd7e021802ac35c01a` *(Step 1 완료 기준, `main` 병합 완료)*
- **DB 변경**: 없음 (🐳 Docker 불필요)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 8a53990e0407f79170f401fd7e021802ac35c01a)`** | **Gemini 4 Hydrogen** *(Fallback 1: Claude Sonnet, Fallback 2: GitHub Copilot)* | `Maker (R101 2개월 예산 비교 + R103 단축키·빠른 시작 안내 & Vitest)` | 아래 **Step 1 수용 기준** 수행. 허용 파일: `src/lib/budget-calculations.ts`·`test.ts`, 신규 `src/components/finance/two-month-budget-card.tsx`·테스트, `src/app/dashboard/expenses/page.tsx`·`test.tsx`, 신규 `src/components/calendar/quick-start-guide.tsx`·테스트, `src/app/dashboard/page.tsx`·`test.tsx`, `docs/to-do.md`, 루트 `docs/handoff.md`, `docs/progress.md` | `✅ 8a53990`: `budget-calculations.ts`·`TwoMonthBudgetCard`·`expenses/page.tsx` + `QuickStartGuide`·`dashboard/page.tsx` 단축키 구현. `tsc`·`lint`·`diff-check`·Vitest 74파일/977개 통과 (아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: ef645b6)`** | **Claude Sonnet** *(Fallback 1: Gemini 4 Neon / Claude Opus)* | `Reviewer & Orchestrator` | Step 1 완료 후 착수. Base(`4fbf67f2a1e2ac47f0945aaa72011734f347e333`) $\leftrightarrow$ Target SHA 정적 리뷰(`review.json`)·검증(`test.json`, `tsc`·`lint`·`vitest`·`next build`)·`main` 병합·문서 마감 | `✅ ef645b6`: P4 1건(비차단)·산출물 검증 통과, `main` 병합 `c942e1e` (아래 Step 2 완료 기록 참고) |

#### 📋 `r101-r103-two-month-budget-and-shortcuts` Step 1 수용 기준 ([`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §2)

1. **`R101` 2개월 예산·고정비 계산 및 UI**: `budget-calculations.ts`(`getNextMonthKey`·`calculateMonthBudgetBreakdown`·`calculateTwoMonthBudgetComparison` — 미생성 활성 `MONTHLY_DAY` 템플릿 중복 제외 합산, `INTERVAL_30`/`VERSION_PASS` 미생성분 제외) 및 `/dashboard/expenses` 상단 `TwoMonthBudgetCard` 2열 비교 뷰·테스트.
2. **`R103` 빠른 시작 & 키보드 단축키**: `/dashboard` 상단 접이식 `QuickStartGuide`(`localStorage` 저장·`?` 토글, `FR-001` 비차단 준수) 및 단축키(`[`, `]`, `T`, `V`, `N`, `?` + 입력란·모달·IME 포커스 가드)·테스트.
3. **검증 및 커밋**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check` 통과 후 워크트리 커밋, `Target SHA` 기록 및 Step 2(`Claude Sonnet`) `▶ READY` 전환.

#### 📝 `r101-r103-two-month-budget-and-shortcuts` Step 1 완료 기록 (Gemini 4 Hydrogen, 2026-11-24)

- **Target SHA**: `8a53990e0407f79170f401fd7e021802ac35c01a` (워크트리 브랜치 `collab/r101-r103-two-month-budget-and-shortcuts`, 미병합·원격 push 안 함). 변경 파일(10개): `src/lib/budget-calculations.ts`·`test.ts`, 신규 `src/components/finance/two-month-budget-card.tsx`·`test.tsx`, `src/app/dashboard/expenses/page.tsx`·`test.tsx`, 신규 `src/components/calendar/quick-start-guide.tsx`·`test.tsx`, `src/app/dashboard/page.tsx`·`test.tsx` (`run.json` 미수정).
- **`R101` 2개월 예산 비교**: `getNextMonthKey`·`calculateMonthBudgetBreakdown`·`calculateTwoMonthBudgetComparison` 구현(당월/익월 귀속, 이미 생성된 `template_id` 지출과 미생성 활성 `MONTHLY_DAY` 템플릿 중복 제외 합산, `INTERVAL_30`/`VERSION_PASS` 미생성분 제외, 예산 `0원` 미설정 시 초과 판정 `false`) 및 `/dashboard/expenses` 상단 `TwoMonthBudgetCard` 2열 뷰·`user_finances`/`monthly_budgets` 비차단 조회 연결함.
- **`R103` 빠른 시작 & 단축키**: `/dashboard` 상단 비차단 접이식 `QuickStartGuide`(`localStorage` 키 `chronoledger:quick-start-dismissed:${userId ?? "guest"}`, 최초 방문 열림·`[닫기]`·`?` 토글) 및 데스크톱 단축키(`[`, `]`, `T`, `V`, `N`, `?` + 입력창/`contenteditable`/`role="dialog"`·모달/드로어 오픈·IME·게스트 `N` 가드) 구현함.
- **검증**: 워크트리에서 `npx tsc --noEmit`, `npm run lint`(경고·오류 0건), `git diff --check`, `npx vitest run`(74파일/977개 통과 — 신규·확장 테스트 포함) 확인함. 실브라우저 육안 확인은 미실행임.
- **원격 브랜치**: push 안 함.
- **다음 단계**: Step 2(`Claude Sonnet`, Base `4fbf67f` ↔ Target `8a53990` 정적 리뷰·`next build` 포함 검증·`main` 병합·문서 마감) `▶ READY`임.

#### 📝 `r101-r103-two-month-budget-and-shortcuts` Step 2 완료 기록 (Claude Sonnet, 2026-11-24)

- **리뷰 범위**: Base `4fbf67f2a1e2ac47f0945aaa72011734f347e333` ↔ Target `8a53990e0407f79170f401fd7e021802ac35c01a`(범위 확인: Target이 워크트리 `HEAD`의 조상이고 `src`·`sql` 차이 없음). 구현 10개 파일(+`run.json`·`README`)이며 `sql/` 변경이 없어 로컬 DB 게이트 대상이 아님. 명세 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §2와 대조함.
- **정적 리뷰 (`findings`, P4 1건·비차단)**: `getNextMonthKey`·`calculateMonthBudgetBreakdown`·`calculateTwoMonthBudgetComparison`은 명세 §2.1과 일치함(귀속 월은 기존 `getBudgetDate`, 확정/고정/일반 분리, 미생성 활성 `MONTHLY_DAY`만 합산, 예산 0원이면 초과 판정 `false`). 소비 페이지 예산 조회는 `try/catch`로 비차단이고 월 예산 0이면 기본 예산을 씀. 대시보드 단축키는 `Ctrl/Meta/Alt`·IME·입력창·`[role="dialog"]`·모달/드로어·온보딩 모달 가드와 게스트·오프라인 `N` 가드를 모두 갖췄고, 빠른 시작은 비차단 접이식(`FR-001`)임. `R101-REV-001`(P4): `CANCELLED` 지출은 `isBudgetCounted` 필터에서 먼저 제외돼 그 달 템플릿이 "생성됨"으로 인정되지 않으므로, 활성 템플릿의 그 달 회차를 취소하면(재생성 안 됨) 고정 구독 예정액이 `default_price`로 다시 더해져 예상 총 지출이 과대·잔여 예산이 과소 표시될 수 있음(표시 전용, 원장 영향 없음). 명세·테스트와는 일치해 선택 후속으로 `to-do.md`에 등록함.
- **검증 (리뷰어가 Target에서 직접 재실행)**: `tsc --noEmit`·`npm run lint`·`git diff --check` 통과, Vitest 74파일 977개 통과, `npm run build` 통과(워크트리에 `.env.local`이 없어 더미 Supabase 환경변수로 실행). 실브라우저 육안 확인은 하지 않음(`skipped`).
- **산출물**: `artifacts/r101-r103-two-month-budget-and-shortcuts/iteration-01/review.json`·`test.json`(스키마 검증 통과)과 `run.json` `target_sha` 갱신, 산출물 커밋 `ef645b6`. `main` 병합 `c942e1e`(`--no-ff`, 병합 후 관련 테스트 317개·`tsc` 재확인, 미push).
- **남은 일 (사용자)**: `/dashboard/expenses` 상단 `당월 · 익월 예산 비교` 카드(예산 설정·미설정·초과 표시)와 `/dashboard` 빠른 시작 카드·단축키(`[` `]` `T` `V` `N` `?`)를 데스크톱 브라우저에서 확인함.
- **다음 단계**: 이 Run은 마감함. 2차 Run `r102-expense-presets`(DB/RLS 변경·🐳 Docker 필요)는 예약 상태이며 사용자가 지목하면 Orchestrator가 등록함.
