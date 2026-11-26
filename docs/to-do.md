# 구현 체크리스트 (to-do.md)

현재 작업 우선순위와 완료 상태의 단일 기준 문서다. Gemini 진행 기록(구 to-do_Gemini 이력, 정리됨)은 별도 작성 이력으로 보존하며, 이 체크리스트와 상태가 다르면 이 문서 및 검증 가능한 구현/테스트 증거를 우선한다.

## 구현 우선순위: Web/PWA 먼저

### R41~R44 게스트 일정 열람 및 UI 밀도 개편

- 과제 제출 조건은 적용하지 않는다. 개인 프로젝트로서 승인된 SRS/SPEC/SCHEMA를 기준으로 진행하며, SQLite·별도 Node.js 웹서버·게시판 요구사항을 추가하지 않는다.
- 현재 구현 목표는 웹사이트 기능을 우선 완성하는 것이다. Android PWA 실기기 인증 검증은 사용자의 요청으로 후순위에 보류하지만 제품 범위에서 제외하지 않는다.
- Windows Tauri 지원 결정은 SRS대로 유지하되, 외부 OAuth/딥링크 및 Windows 패키징은 Web/PWA MVP 승인 뒤 진행한다. 기존 Tauri 뼈대와 작업은 보존하며, 웹 기능을 Tauri 전용 API에 직접 결합하지 않는다.
- 웹 MVP 종료 조건: 이메일/Google 브라우저 인증 및 callback, 인증된 핵심 화면, 가계부·캘린더·설정 주요 흐름, RLS 연동과 재현 가능한 기능 검증을 완료하고 필수 수용 기준을 확인한다. Android PWA 실기기 설치/인증 검증은 별도 후속 검증으로 둔다.
- 데스크톱 OAuth 구현은 별도 adapter 경계로 미룬다. 웹 callback 구현은 지금 완성하며, 이후 Tauri custom scheme callback이 같은 세션 경계에 연결되도록 설계한다.

## 상세 설계 문서

- [ ] SRS 수용 기준별 세부 테스트 케이스와 성능 측정 환경·목표를 릴리스 검증 자료로 구체화한다. 기준 기기는 중급 Android 실기기로 정했다.

## Gemini 진행 문서 대조 기록 (2026-10-03)

당시 검토 대상: `to-do_Gemini.md` (구 이력, 정리됨). 아래는 2026-10-03 당시 Gemini 진행 보고와 구현 상태를 대조한 기록이다. 현재 우선순위와 완료 상태는 이 문서 상단의 공용 체크리스트를 따른다.

- **환경 골격 확인:** 작업 트리에 Next.js 정적 export, Tailwind/shadcn UI, Supabase 브라우저 클라이언트, Vitest 샘플, Tauri v2 설정, 로그인 화면과 dashboard 코드가 있다. Tauri CLI/Rust 의존성은 v2 계열이고 앱 식별자는 `com.chronoledger.app`이다. Gemini가 기록한 `npx tauri dev` 성공은 보고된 결과이며 이 리뷰에서 재실행하지 않았다.
- **Phase 1 run은 미종료:** `artifacts/phase1-setup/run.json`은 `target_sha: null`, `status: in_progress`이고 `iteration-01/review.json`/`test.json`이 없다. Maker의 Phase 1 커밋 `ccfbca5` 이후 Tauri 플러그인·인증 변경이 미커밋 상태로 남아 있다. 생성된 `.next`/`out` 폴더는 변경 이후 동일 SHA의 검증 결과를 대신하지 않는다.
- **Phase 2 구현 범위:** Dashboard 예정 지출 query의 KST 월 경계·다음 달 제외·실제 0원/오류 분기를 단위 테스트로 확인했다. 예정 지출 월 귀속은 `end_date` 우선, 없으면 `target_date`다. 실제 Supabase 프로젝트 설정은 환경 파일의 비밀값이 아닌 키 존재 여부만 확인하고, 콘솔 상태는 사용자 확인 및 OAuth 왕복으로 검증했다. 원격 월별 query 통합은 미실행이다.
  - **Gemini 분업(미착수):** 대시보드 변경을 커밋한 뒤 동일 Target SHA로 읽기 전용 코드·요구사항 리뷰를 별도 run에서 요청한다. 구현과 로컬 검증은 현재 작업 세션에서 진행하며, Gemini 자동 연동은 미설정이다.
- **OAuth 상태:** callback의 PKCE code 교환, provider 오류/취소, code 누락, 세션 교환 실패 처리를 구현하고 5개 단위 테스트를 통과했다. Google provider와 `http://localhost:3000/auth/callback` 등록 후 실제 브라우저 로그인·세션 저장·dashboard 복귀를 확인했다. Android PWA 실기기 검증과 Phase 1 run의 동일-SHA 검토/검증 산출물은 남아 있다.
- **인증 경계:** `/`는 단일 로그인 경로 `/auth`로 이동하고 dashboard layout이 인증 로딩 및 사용자 존재를 확인해 비인증 화면 렌더링을 막는다. 브라우저에서 로그인 후 dashboard 복귀와 로그아웃 뒤 직접 dashboard 접근 차단을 확인했다. 최종 데이터 권한은 Supabase RLS가 강제한다.
- **무반응 원인은 미확정:** 버튼에 코드 핸들러는 연결되어 있으나 실행 확인은 별도다. “권한 부족”이나 “Hydration 오류”는 아직 원인으로 입증되지 않은 가설이므로 웹뷰/콘솔 오류로 재현해야 한다.
- **기획 게이트 최신 상태:** 사용자가 기록한 테스트 프로젝트의 `md/TESTS.sql` PASS/rollback 및 SRS 승인에 따라 Phase 0.6은 완료 상태다. 이는 DB smoke 검증이지 Tauri OAuth 실행 검증은 아니다.
- **Gemini Phase 4 정리 필요:** 데이터베이스 스키마를 새로 설계/생성한다는 문구는 승인된 `md/SCHEMA.sql` 및 smoke 검증과 중복될 수 있다. 기존 기준 스키마를 재사용하는 마이그레이션과 상세 테스트 설계로 구체화한다.

### 다음 조치

1. [x] **[Web/PWA MVP · callback 구현]** `.worktrees/phase1-setup`에서 PKCE callback과 provider 오류/취소, code 누락, 교환 실패 처리를 구현했다. Supabase URL 자동 세션 감지를 끄고 callback에서 code를 한 번만 교환하며 React Strict Mode에서도 완료되도록 수정했다. 관련 단위 테스트 5개 통과.
2. [x] Google provider 활성화와 `http://localhost:3000/auth/callback` Redirect URL 등록을 사용자 확인 및 성공한 실제 OAuth 왕복으로 검증했다. 키·비밀값은 문서에 기록하지 않았다.
3. [x] **[실환경 인증 · 브라우저]** localhost에서 Google OAuth, PKCE code 교환, 세션 저장 및 `/dashboard` 복귀를 확인했다.
4. [보류] **[실환경 인증 · Android PWA]** 사용자가 Android 실기기 검증을 미루기로 했다. 웹 MVP 우선 진행 기간에는 실행하지 않으며, PWA origin과 Redirect URL이 준비된 뒤 재개한다.
5. [x] `/`는 `/auth`로 이동하고 로그인 UI를 단일화했다. dashboard 레이아웃에 인증 gate를 적용했으며 로그인 상태의 root 이동과 로그아웃 후 직접 `/dashboard` 접근이 `/auth`로 돌아오는 동작을 브라우저에서 확인했다. 데이터 접근 권한의 최종 집행은 SRS대로 RLS가 담당한다.
6. [x] Dashboard 예정 지출을 KST 현재 달 DATE 범위로 조회하며 `end_date` 우선 귀속과 다음 달 시작일 exclusive 조건을 적용했다. 실제 0원, 빈 결과, 누락 자산 행, 조회 오류를 테스트로 구분했다. 원격 Supabase 조회는 미실행이다.
7. [x] 가계부, 캘린더, 설정 기능을 Web/PWA MVP 조건에 맞춰 구현하고 승인 SRS 수용 기준별 테스트를 추적한다. (Phase 4, 5, 6, 10, 11, 12에서 100% 구현 및 단위 테스트 통과 완료)
8. [x] 기존 `phase1-setup` run은 Target SHA(`dda0cae`)와 후속 Phase 4 변경의 범위가 달라 review/test 증거 없이 종료했다. 상태를 `abandoned`로 기록하고 [종료 보고서](../artifacts/phase1-setup/iteration-01/human-report.md)를 보존했다. Tauri 검증은 Web/PWA MVP 이후로 둔다.
9. [x] `phase4-request-submission` run에서 Phase 4 기반 및 4.4 요청 제출 UI를 구현·검증해 `main`에 통합했다. Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`; 동일 SHA Reviewer clean, 원 run의 Vitest 21개/lint/build/Schema 통과, 통합 상태의 표준 `npm ci`, Vitest 21개, lint/build도 통과했다. 실제 Supabase/RLS/RPC는 미검증이고 sandbox는 unavailable이다. 산출물: [`artifacts/phase4-request-submission/`](../artifacts/phase4-request-submission/).
10. [x] Gemini Phase 4 계획을 승인 스키마 재사용, 마이그레이션 및 상세 검증 케이스 중심으로 갱신한다. (Phase 2 및 Phase 4에서 DDL/RPC 적용 및 검증 완료)
11. [x] 버튼 무반응이 브라우저에서도 재현되는지 확인한다. (웹 브라우저에서 모든 버튼 정상 동작 확인 완료. Tauri 전용 점검은 데스크톱 통합 단계에서 웹뷰 로그를 수집해 진행 예정)

---

### 문서 정리

- [ ] Docker 기반 테스트 샌드박스를 사용할 수 있는 환경에서 격리·네트워크·환경변수 제한을 검증
  - 현황: 이 PC에는 `docker` 명령이 없다. 모든 run의 `test.json`은 `sandbox: unavailable`로 기록했고, 격리 검증은 Docker 준비 전까지 보류한다.

### Phase 8 & 9. UI/UX 폴리싱 및 추가 피드백 구현

- [ ] 내비게이션 셸 재구성([PROPOSED]) 및 정확한 상태 배경 토큰 여부 결정

---

## 향후 / 진행 로드맵 (Active & Planned Roadmap)

- [x] R13. 게임별 보유 캐릭터 체크(사용자 커스텀 아이콘 + 캐릭터별 메모), 게임별 성급·분류 축(`classification_schema`) 최적화, 게임별 최대 슬롯(`max_preset_slots`) 기반 캐릭터 조합 프리셋(미보유 캐릭터 명도 감쇠) 저장 기능 — 영문 명세서 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md) 승인 완료 (`APPROVED`, 2026-11-09 `/dashboard/characters` 전용 페이지 분리 반영). Phase 13.1 DB/타입 구현(`4a21555e`, `334c642f`) 및 운영 DB 적용(R31) 완료함. Phase 13.2 관리자 카탈로그·분류 설정·캐릭터 요청 UI 구현(`688205e`) 완료함. Phase 13.3(Topbar `캐릭터` 메뉴·전용 `/dashboard/characters` 페이지 보유 캐릭터 로스터·커스텀 아이콘·조합 프리셋 빌더) 구현(`6b755aa`, 선행 결함 수정 `17945d9`) 완료함. Step 3 iteration-01 통합 리뷰(2026-11-09, P2 1건·P3 6건·P4 1건, 산출물 `b6cd7a0`) 완료함. iteration-02 수정(13.2-F1, `e07cc6a`) 및 재리뷰(지적 8건 해소, P4 서식 1건만 남음, 산출물 `0b8eb4d`) 완료함. `main` 병합 `1f5d43a` 완료함(병합 후 tsc·lint·Vitest 385개·`npm run build` 통과). 남은 확인: 브라우저 수동 확인(사용자), 비차단 후속 13.2-F2.

### 사용자 추가 검토 확정 과제 (2026-11-09 완료 · Run `r13-4-breakthrough-guest-and-schedule-tree` 병합 `ce4bed2`)

- [ ] R50. [보안 검토 안건 · `📝 AGENDA` (`auth-security-settings-review`, 사용자 별도 요청 시에만 `▶ READY` 전환)] 인증 보안 설정 점검: 클라이언트 인증 흐름·키 관리·RLS/`SECURITY DEFINER` 권한 경계 읽기 전용 점검, Supabase 대시보드 Auth 설정 체크리스트(사용자 확인용) 작성, 문자열 컬럼 암호화 미도입 권장 근거 기록 → `docs/auth-security-review.md` (담당: Claude Opus, Fallback: Gemini 4 Argon / GitHub Copilot, 코드 수정은 별도 R 항목으로 분리)

### 보안·경쟁력 검토 후속 (2026-11-26 등록 · Claude Opus · [`docs/security-and-competitiveness-review.md`](security-and-competitiveness-review.md))

- [ ] R111. [2026-11-26 `main` 직접 커밋(사용자 지시, 로컬 DB 통과 전 병합 예외) · 운영 DB 적용·확인 쿼리 완료(사용자) · 🐳 로컬 `TESTS.sql` 미실행(`⚠️ LOCAL_DB_DEFERRED`, 이 PC에 Docker 없음)] 보안 상위 3건: ① S1 `MIGRATION_USERS_PROFILE_PRIVACY.sql`(`users` 본인 행 SELECT, 가입 닉네임 이메일 미사용, 닉네임 64자 CHECK) ② S2 빌드 후 인라인 스크립트 해시 기반 CSP 메타 주입(`scripts/inject-csp.mjs`)·HSTS·Permissions-Policy ③ S3 CI 워크플로(`.github/workflows/ci.yml`)
  - [ ] 🐳 로컬 Supabase에서 마이그레이션 2회 멱등·`TESTS.sql` `PRIV-01` 포함 전체 PASS 확인
  - [x] 운영 DB `MIGRATION_USERS_PROFILE_PRIVACY.sql` 적용·README 확인 쿼리 확인(사용자, 2026-11-26)
  - [ ] 데스크톱(Tauri) 설치본에서 CSP 적용 후 로그인·알림·업데이트 배너 동작 확인(사용자, 미검증)
  - [ ] Cloudflare Pages 빌드 명령이 `npm run build`인지 확인(`next build` 직접 실행 시 CSP 미주입)
- [ ] R112. [후보 · 사용자 지목 시] 보안·경쟁력 검토 나머지 항목(S4~S7, F1~F5, A1~A4, C1~C10) — 우선순위는 문서 §5
- [x] R113. [Run `r113-data-export` 완료·`main` 병합 `7f2e4d9`(2026-11-26, Iteration 02 리뷰 `clean`) · 사용자 웹·Windows 설치본 저장 확인 완료(113-7) · 후속: CSV 날짜순 정렬 `e0e3f84`] 데이터 내보내기·백업(JSON 전체, 지출·수익 CSV, 복원 제외) — 명세 [`docs/r113-r116-data-budget-public-spec.md`](r113-r116-data-budget-public-spec.md) §3
  - [ ] 사용자 확인: 웹과 Windows 설치본에서 파일 저장 1회씩 확인(113-7)
- [ ] R114. [Run `r114-game-budgets` · Iteration 01 P2 수정 대기 · 🐳] 게임별 월 예산(경고·알림만)·월간 과금 리포트 — 같은 명세 §4
  - [ ] Maker 수정: `R114-REV-001` 지출 조회 1,000행 페이지네이션 및 초과 행 테스트 추가 후 재리뷰
- [ ] R115. [명세 완료 · `R114` 마감 뒤 등록 · 🐳] CSV 결제 내역 가져오기(확정 기록, 자산·포인트 미반영) — 같은 명세 §5
- [ ] R116. [명세 완료 · `R115` 마감 뒤 등록] 공개 게임별 일정 페이지·`robots.txt`·sitemap(빌드 생성, 배포 때만 갱신) — 같은 명세 §6

### 경쟁 서비스(픽업지지) 비교 기반 개선 후보 (2026-11-09 등록 · Gemini 4 Argon 리뷰 확정)

> 근거: [`docs/competitive-analysis-pickupgg.md`](competitive-analysis-pickupgg.md). 실행 순서: 현재 진행 중인 R13 UI Run(`r13-phase13-2-and-13-3-ui`)을 1순위로 완수·병합한 직후, **차기 Run 1(`R32 + R34`)** → **차기 Run 2(`R33`)** 순으로 착수함.

- [x] R75. [Run `r75-r64-tests-readme` 완료·`main` 병합 `35d43b6`(2026-11-26, 리뷰 P4 2건 비차단, 🐳 로컬 `TESTS.sql` 54개 2회 PASS) · 후속 · 우선 낮음 · ②·③ 완료(2026-11-19) / ①·④ 남음(Docker 필요)] ① `sql/tests/TESTS.sql` R64 블록에 명세 §7 누락 시나리오 추가(일반 사용자 쓰기 거부, `users.role` 관리자·JWT 없음 쓰기 거부, 비승인 게임 조회 차단·관리자 조회, 잘못된 `axis_key`·빈 옵션·없는 축, 축 삭제·순서 변경 유지·게임 삭제 CASCADE, `updated_at` 갱신, 메시지 단위 검증) 후 임시 DB에서 실행 ② [x] 관리자 아이콘 삭제를 `.delete().select()`로 바꿔 0행이면 실패 표시 ③ [x] 템플릿 저장 후 아이콘 재조회를 취소 가능한 effect(`iconRefreshTick`)로 통합 ④ `sql/README.md`에 아이콘 수정은 upsert 사용 안내 1줄 (DB 스키마 변경 없음, 담당: GPT Codex(①·④))
  - [ ] R75-REV-001·002. [① 완료·Run `p4-followups-r107c-r109-r75` `main` 병합 `ac752b6`(2026-11-26) · ② 보류(비승인 게임 상태 도입 시) · P4 · 선택 후속 · 리뷰 `artifacts/r75-r64-tests-readme/iteration-01/review.json`] ① `sql/tests/TESTS.sql` R64 블록의 잘못된 `axis_key`·빈 옵션 음성 케이스를 트리거 메시지와 CHECK 이름 중 한쪽으로 고정해 개별 방어선 회귀를 잡도록 보완, ② 비승인 게임 0행 조회는 현재 `games_status_check`로 도달 불가이므로 비승인 상태가 도입될 때 동작 기반 테스트로 교체(DB 변경 없음).
- [x] R39. [Run `r39-daily-notifications` 완료·`main` 병합 `9ae05f9`(2026-11-24, iteration-01 리뷰 P4 1건 비차단, 🐳 로컬 DB 업그레이드 2회·신규 `SCHEMA.sql`·`TESTS.sql` 42개 PASS, Vitest 960개 통과) · 운영 DB `MIGRATION_R39_DAILY_NOTIFICATIONS.sql` 수동 적용·확인 쿼리 완료(사용자, 2026-11-24) · **남음: 실브라우저 설정 카드·KST 09:00 알림 생성 확인(사용자)**] 일일 정기 알림 생성: `public.notification_settings` 테이블 + KST 09:00(`0 0 * * *` UTC) `pg_cron` `enqueue_daily_notifications()` 함수(관심 일정 시작 당일 `FAVORITE_START`, 관심 일정 종료 1일 전 `FAVORITE_END_D1`, 예정 지출 결제 예정일 1일 전 `EXPENSE_D1` 3종) + 설정 화면 알림 토글 카드 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §4.2·§5.2·§8·§9 (담당: Step 1 GPT Codex DB `▶ READY` → Step 2 Claude Sonnet UI `⏳ WAITING` → Step 3 Claude Opus 리뷰 `⏳ WAITING`)
- [x] R84. [Run `r84-feedback-and-inbox` 완료·`main` 병합 `660c3fc`(2026-11-19, iteration-03 독립 리뷰 clean, 🐳 로컬 DB 마이그레이션 2회·신규 `SCHEMA.sql`·`TESTS.sql` 40개 PASS, `main` Vitest 895개 통과) · 운영 DB `MIGRATION_R84_FEEDBACK_AND_NOTIFICATIONS.sql` 수동 적용·확인 쿼리 완료(사용자, 2026-11-19) · **남음: 실브라우저 확인(사용자)**] 기타 건의 요청 창구(`feedback_requests`: 기능 제안·오류 신고·기타, 첨부 없음) + `public.notifications` 테이블(본인 조회·`mark_notifications_read` RPC·30일 보관 `pg_cron` 정리)·앱 내 알림함(상단 벨 아이콘·읽지 않은 수 배지) + 관리자 건의 답변·요청 승인/반려 시 알림 행 원자적 생성 — 설계 [`docs/push-notification-research.md`](push-notification-research.md) §5.3·§8·§9
- [x] R96. [Run `r96-web-push` 완료·`main` 병합 `18d5f0c`(2026-11-24, iteration-02 리뷰 P3 1건·P4 2건 비차단, 🐳 로컬 DB 2회·신규 `SCHEMA.sql`·`TESTS.sql` 43개 PASS) · 운영 DB 마이그레이션 적용·확인 쿼리 완료(사용자, 2026-11-24) · 운영 배포 1~5단계·실기기 수신(`SENT`) 확인 완료(사용자, 2026-11-25) · 안드로이드 배지 흰 사각형 → 투명 배지 `badge-96.png` `main` 직접 수정(2026-11-25) · **남음(사용자): 배포 후 안드로이드 상태 표시줄 아이콘 재확인** · DB/Edge Function/SW 변경 → Opus/Argon 승격 조건] Web Push 외부 발송: VAPID 키·`public.push_subscriptions`(공용 기기 `endpoint` 소유자 교체·로그아웃 시 구독 해제)·4개 `SECURITY DEFINER` RPC(`upsert_push_subscription`·`delete_push_subscription`·`claim_pending_push_notifications`·`complete_push_notification_delivery`)·순수 Web Crypto(`crypto.subtle`) RFC 8291/8292 암호화 모듈 및 Edge Function `send-notifications`·예외 격리된 `pg_net` 웹훅·`public/sw.js` `push`/`notificationclick` 핸들러·iOS 홈 화면 추가 안내 — 확정 명세 [`docs/push-notification-research.md`](push-notification-research.md) §11 (담당: Step 1 GPT Codex / Gemini 4 Neon DB → Step 2 Gemini 4 Neon / Claude Opus Web Crypto·Edge Function·SW·UI → Step 3 Claude Opus 통합 리뷰)
- [x] R85. [Run `r85-schedule-times` 완료·`main` 병합 `6204346`(2026-11-21, iteration-01 리뷰 clean, 🐳 로컬 DB 업그레이드 2회·신규 `SCHEMA.sql`·`TESTS.sql` 41개 PASS, Vitest 950개 통과) · 운영 DB `MIGRATION_R85_SCHEDULE_TIMES.sql` 수동 적용·확인 쿼리 완료(사용자, 2026-11-21) · **남음: 실브라우저 확인(사용자)** · 후속 판단: 사용자 게임별 일정 모달 서버 초기화 시각 표시 · 설계 [`docs/r85-schedule-time-design.md`](r85-schedule-time-design.md) §10] 일정 시간 단위 관리: `start_at`·`end_at TIMESTAMPTZ NULL`·예상 표시 + 게임별 서버 초기화 시각 `games.daily_reset_time` 구현 (DB/RPC → 공용 로직·UI → 통합 리뷰)
- [ ] R90. [⏸️ 잠정 보류 (2026-11-16 사용자 지시, 사용자가 직접 호출할 때만 재개) · `r90-dcinside-crawling-opus-review` 검증 완료] 디시인사이드 게임별 갤러리 공식 탭(`gall.dcinside.com/.../board/lists/?id=...&search_head=...`) 기반 일정 후보 반자동 수집(`schedule_candidates`) 및 관리자 후보 검토 UI 구현:
  - [x] Gemini 4 Argon 1차 기술·약관 실측 검토서 [`docs/dcinside-schedule-crawling-review.md`](dcinside-schedule-crawling-review.md) 작성 완료 (2026-11-16, HTTP 200 SSR `tr.ub-content` 파싱 확인, `robots.txt` `Allow: /` 및 2026-10-07 약관 제11조·제16조 대조, 작성자 식별정보/본문 미수집 완화 설계)
  - [x] Claude Opus 2차 검증 완료 (2026-11-16, §6 작성: 디시인사이드 자동 수집 제외 권장, 경로 A 바로가기+링크 붙여넣기 대안, 구조화 값 저장, R90 Step 1~4 수용 기준 확정안)
  - [ ] (보류) 경로 A/B·R90 범위 결정 (§6.7) — 사용자 호출 시에만 진행
  - [x] 네이버 이용약관 원문(`policy.naver.com/rules/service.html`)의 자동 수집 금지 문구 확인 (2026-11-12 사용자 제공 본문: 사전 허락 없는 자동 수단 게시물 수집 금지, 예외 없음)
- [ ] R99. [후속 · 우선 낮음 · DB/Storage/RLS 변경 → Opus 승격 조건 ①] 기타 건의(`feedback_requests`, 특히 오류 신고) 스크린샷 이미지 첨부 기능: 전용 비공개 Storage 버킷 + Signed URL 열람 + 장수/크기 제한 + 종료·탈퇴 시 자동 정리 설계 및 구현
- [x] R102. [Run `r102-expense-presets` 완료·`main` 병합 `9ff2ae6`(2026-11-24, iteration-01 P2 1건 → iteration-02 `56e4ab8` clean, 🐳 R96+R102 로컬 DB 각 2회·`TESTS.sql` 44개 PASS) · 운영 DB 적용(R96 다음)·확인 쿼리 완료(사용자, 2026-11-24) · **남음(사용자): 실브라우저 확인**] 자주 쓰는 과금 프리셋 사용자 DB 저장(`public.user_expense_presets`, 계정당 최대 20개 상한 트리거·본인 CRUD RLS·계정 삭제 대기 차단·탈퇴 정리) 및 `ExpenseModal` 상단 칩 원클릭 적용·삭제·**`[프리셋 저장]`** 버튼 — 명세 [`docs/r101-r103-budget-presets-shortcuts-spec.md`](r101-r103-budget-presets-shortcuts-spec.md) §3 (담당: Step 1 GPT Codex / Gemini 4 Neon DB → Step 2 Claude Sonnet / Gemini 4 Hydrogen UI → Step 3 Claude Opus 통합 리뷰)
- [ ] R104. [⏸️ 보류 (2026-11-24 사용자 결정, 직접 호출 시에만 재검토)] 단기(1~2개월) 픽업 재화·과금 계산기(게임별 천장 시스템 차이 검토 안건)
- [ ] R107. [명세 완료 2026-11-25(Claude Opus) · Run 등록 대기 · SQL/금전 변경 → Opus 승격 조건 ①] 정기·반복 지출 자동화 — 명세 [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md), 운영 SQL 적용 순서 §6:
  - [x] R107-A. [Run `r107a-server-subscription-generation` 완료·`main` 병합 `7aa2984`(2026-11-25, iteration-01 P4 2건 비차단, 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 48개·2세션 동시성 PASS, Vitest 1,026개 통과) · **운영 DB 적용·확인 쿼리 검증 완료(사용자, 2026-11-25)** · **남음: 앱 배포(`main` push) 및 1주 관찰 후 `R107-A-CLEANUP`**] 서버 측 정기 지출 생성 통일(`pg_cron` `chronoledger-subscription-daily`, `INTERVAL_30` 부분 유니크 인덱스, SQL 단일 구현 + 클라이언트 RPC 전환·폴백) — Run `r107a-server-subscription-generation` (인수 기준 `A-1`~`A-9`)
  - [x] R107A-REV-001·002. [Run `r107c-auto-confirm` 완료·`main` 병합 `9268bf0`(2026-11-26) · P4 · 선택 후속 · 리뷰 `artifacts/r107a-server-subscription-generation/iteration-01/review.json`] ① `R107-B`·`R107-C`에서 `advance_interval_subscription.Args.p_original_target_date`의 `| null` 보존, ② `R107-C`에서 `refund_expense_payment`에 롤백 통합 시 비활성 템플릿(`is_active = false`) 생략 명시 및 검증 완료.
  - [ ] R107-A-CLEANUP. `R107-A` 운영 적용·1주 관찰 후 `subscription-sync.ts` 폴백 TS 제거 (사용자 지목 시)
  - [x] R107-B. [Run `r107b-due-today-notification` 완료·`main` 병합 `a84c6de`(2026-11-25, iteration-01 리뷰 발견 0건, 🐳 로컬 2경로 2회 멱등·`TESTS.sql` 49개 PASS, Vitest 1,037개 통과) · **운영 DB 적용·확인 쿼리 검증 완료(사용자, 2026-11-25), 앱 배포(`main` push)만 남음**] "오늘 결제 예정 N건" 알림(`EXPENSE_DUE_TODAY`, `notification_settings.expense_due_today`)
  - [x] R107-C. [Run `r107c-auto-confirm` 완료·`main` 병합 `9268bf0`(2026-11-26, iteration-01 P4 2건 비차단, 🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 54개·`C-5` 2세션 병렬 3종 PASS, Vitest 78파일/1,074개·`next build` 통과) · **운영 DB `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(사용자, 2026-11-26) · 남음(사용자): `main` push 배포·구독 모달 `자동 확정` 동작 1회 확인**] 템플릿별 자동 확정(`auto_confirm`, 스토어 결제수단 한정, `process_expense_payment` core 추출, 환불 롤백 원자화, `EXPENSE_AUTO_CONFIRMED` 요약 알림, 구독 모달 토글·자동 확정 배지) — Run `r107c-auto-confirm` (인수 기준 `C-1`~`C-12`)
  - [x] R107C-REV-001·002. [Run `p4-followups-r107c-r109-r75` 완료·`main` 병합 `ac752b6`(2026-11-26) · ② 운영 DB 적용·검증 완료(사용자, 2026-11-26) · P4 · 선택 후속 · 리뷰 `artifacts/r107c-auto-confirm/iteration-01/review.json`] ① `src/components/subscription/subscription-modal.tsx` 수정 저장 시 미결제 `PLANNED` 지출 동기화 `update`에 `payment_method`·`point_platform` 포함 보완, ② `expenses.auto_confirmed_at` 상태 불변식 `CHECK (auto_confirmed_at IS NULL OR status <> 'PLANNED')` 선택 보강(자산·원장 영향 없음).
  - [ ] R107 미결 질문 6건 사용자 확인 (명세 §9, 기본값으로 진행 가능)
- [x] R109. [Run `r109-icon-storage-migration` 구현·리뷰 완료·`main` 병합 `7f54ef1`(2026-11-25, iteration-01 P4 2건 비차단, 🐳 로컬 2경로 각 2회 멱등·`TESTS.sql` 51개 PASS, Vitest 78파일/1,067개·`next build` 통과) · **남음(사용자): 운영 DB `MIGRATION_R109_GAME_ASSETS_STORAGE.sql` 적용 → `main` push 배포 → `/admin` `[아이콘 Storage 일괄 이전]` 실행**] 공용 게임·캐릭터 기본 아이콘을 공개 읽기 Storage 버킷 `game-assets`(SHA-256 해시 경로·1년 캐시·관리자 전용 쓰기 RLS, 비공개 `user-icons` 유지)로 이전하고 관리자 등록·승인(`approve_schedule_request` `p_pickup_icon_overrides` 포함)·`/admin` 1클릭 일괄 이전 버튼 및 `public/sw.js` Cache-First 이미지 캐시(상한 500개)를 도입함 — 확정 명세 [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) (Step 1 Claude Opus `High` DB/RLS 🐳 → Step 2 Gemini 4 Neon `High` 업로드·관리자·SW → Step 3 Gemini 4 Carbon `High` 리뷰·병합 🐳 → Step 4 Gemini 4 Hydrogen 마감):
  - [x] R109-REV-001·002. [Run `p4-followups-r108-r109` 완료·`main` 병합 `c52705c`(2026-11-25) · P4 · 선택 후속 · 리뷰 `artifacts/r109-icon-storage-migration/iteration-01/review.json`] ① `src/app/admin/page.tsx` `handleBulkMigrateGameAssets`의 `game_characters` 조회가 전체 카탈로그 1,000명 초과 전에 `.range()` 페이지네이션 또는 미이전 서버 필터를 쓰도록 보완, ② `pendingAssetMigrationCount` 배지 숫자가 선택 게임 외 미이전 캐릭터도 반영하도록 선택 보완(동작 영향 없음).
  - [x] R109-REV-003. [Run `p4-followups-r107c-r109-r75` 완료·`main` 병합 `ac752b6`(2026-11-26) · P4 · 선택 후속 · 리뷰 `artifacts/p4-followups-r108-r109/iteration-01/review.json` `P4F-REV-001`] `src/app/admin/page.tsx` 캐릭터 저장·삭제 핸들러에서 `fetchCharacters()`와 함께 `fetchPendingCharacterAssetCount()`도 호출해 `[아이콘 Storage 일괄 이전 (N)]` 배지 숫자가 새로고침 없이 맞도록 보완(배지 표시만 영향, DB 변경 없음, 담당: Claude Sonnet)
  - [ ] R109-CLEANUP. `R109` 운영 배포·일괄 이전 완료 및 관찰 후 `games`·`game_characters`에서 `data:image/...` 허용 제거 여부 결정 및 정리 (사용자 지목 시)
- [x] R110. [명세·구현·리뷰 완료, `main` 병합 `a83503a`, 릴리스 `desktop-v0.2.0`·`0.2.1` 배포·자동 업데이트 실기기 확인 완료(2026-11-26) · 남음: 둥근 아이콘 `0.2.2` 태그 배포(사용자)] Tauri 데스크톱 앱 자동 업데이트: GitHub Releases `latest.json`·`tauri-plugin-updater`/`process`·태그 `desktop-vX.Y.Z` GitHub Actions 빌드·서명·시작 시 확인 배너 — 명세 [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md)
- [ ] R40. [우선 낮음] R13 후속: 엔드 콘텐츠별 다중 파티 편성(콘텐츠별 팀 수 제한·캐릭터 중복 금지) 확장 검토 (R13 Phase 13.3 완료 후, 담당: Claude Opus 설계 → GPT Codex / Claude Sonnet)

---

## 후속 단계: Windows Tauri 데스크톱 통합 (`t1-t4-desktop-and-followups` 명세 확정 2026-11-25 — [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md))

- 완료 게이트: Web/PWA MVP 조건이 통과되고, 동일 기능의 데스크톱 인증/핵심 흐름 테스트가 통과한 뒤 Windows 앱 배포를 승인한다.

> 열린 항목이 없는 완료 구간과 완료된 `R` 항목은 [`docs/archive/to-do-archive.md`](archive/to-do-archive.md)로 옮김.
