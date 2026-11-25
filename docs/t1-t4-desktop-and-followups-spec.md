# T1~T4 Windows 데스크톱(Tauri v2) 통합 및 선택 후속(R101-REV-001 · R106-REV-001·002) 확정 명세

- **작성일**: 2026-11-25
- **작성 주체**: Gemini 4 Carbon (`High`, Chief Architect — `📐 SPEC_NEEDED` 구체화 산출물, `src/**`·`sql/**` 미수정)
- **관련 항목**: `T1`(웹/Tauri Auth Adapter 분리 및 PKCE 단일화), `T2`(Tauri v2 `chronoledger://` 커스텀 스킴 OAuth·`getCurrent()`·`single-instance` 연동), `T3`(성공·취소·만료·로그아웃 `/auth` 복귀 검증), `T4`(Windows 프로덕션 빌드 및 단독 실행 검증), `R101-REV-001`(취소·환불된 월간 구독 회차의 고정비 예정 제외), `R106-REV-001`(알림함 `[전체 삭제]` 인라인 2단계 확인), `R106-REV-002`(`complete_push_notification_delivery` 삭제 알림 조용한 종료 및 만료 구독 정리)

---

## 1. 사용자 확정 결정 사항 (2026-11-25 질문 카드 확정)

| ID | 항목 | 확정 결정 | 근거 및 기각 대안 |
| :--- | :--- | :--- | :--- |
| **D1** | `T1`·`T2` 데스크톱 OAuth 방식 | **웹·Tauri 모두 PKCE(`flowType: 'pkce'` + `exchangeCodeForSession`) 단일 플로우로 통일**하고, 기존 `tauri-auth.ts`의 해시 토큰(`#access_token` / `setSession`) 경로를 완전 제거함. Supabase Redirect URLs에 `chronoledger://auth/callback`을 등록함 | Windows 커스텀 스킴은 OS 명령행 인자(`argv`)로 전달되므로 `implicit` 해시 토큰은 프로세스 인자 노출·조각(`#`) 유실·`state`/`code_verifier` 미검증 세션 고정(Login CSRF) 위험이 큼(`known-pitfalls.md` 15번 해소) |
| **D2** | Run 구성 및 로그아웃 복귀 | **`R106-REV-002`(SQL, 🐳) + `R101-REV-001` + `R106-REV-001` + `T1`~`T4`를 단일 Run(`t1-t4-desktop-and-followups`)으로 묶어 단계별 진행**하며, 상단바 `[로그아웃]` 클릭 성공 시 `AdminLayout`과 동일하게 **`/auth`로 즉시 복귀**함(비로그인 직접 `/dashboard` 게스트 열람은 기존대로 유지) | 현재 PC에 Docker와 Windows 환경이 모두 준비되어 있어 단일 격리 워크트리에서 DB·UI·Rust·빌드를 일관되게 검증 가능함. 명시적 로그아웃 클릭 후 설정·소비 화면의 빈 게스트 상태에 남는 UX 불일치를 해소함 |
| **D3** | `R101-REV-001` 취소 회차 고정비 정책 | 해당 월(`billing_cycle` 우선, 없으면 귀속월 기준)에 **`CANCELLED` 행이 존재하는 `template_id`도 `coveredTemplateIds`에 포함**해 그 달의 `고정 구독 예정`(`plannedFixedAmount`)에서 제외함(금액은 `0원` 유지) | DB(`idx_expenses_template_billing_cycle`·`generate_subscription_expenses_core`)는 취소·환불된 `billing_cycle`의 회차를 재생성하지 않으므로 그 달 실제 예정 지출은 `0원`임. 익월은 `CANCELLED` 행이 없으므로 활성 구독료가 정상 예측됨 |
| **D4** | `R106-REV-001` 알림함 `[전체 삭제]` 확인 | 알림함 팝오버 헤더 `[전체 삭제]` 클릭 시 모달 중첩 없이 **헤더 내 인라인 2단계 확인(`[삭제 확인]` / `[취소]`)**을 거친 뒤 전체 하드 삭제(`p_notification_ids: null`)를 호출함 | 팝오버에 로드된 30건 너머의 알림까지 영구 하드 삭제되므로 단일 오클릭을 방지하되, `'전체 삭제'` 명칭대로 계정 알림함 전체 비우기 기능을 유지함 |
| **D5** | `R106-REV-002` 푸시 완료 RPC 예외 처리 | 이번 Run의 SQL Step에 포함함(🐳 로컬 DB 검증). `complete_push_notification_delivery` 호출 시 대상 알림 행이 이미 삭제(`NOT FOUND`)되었더라도 예외(`no_data_found`)를 던지지 않고, **전달된 `p_expired_endpoints` 정리 및 `p_succeeded_endpoints` 시각 갱신만 수행한 뒤 조용히 반환(`RETURN`)**함 | 사용자가 푸시 워커의 5분 점유 중 알림을 삭제하더라도 만료 엔드포인트(`404`/`410`) 즉시 정리와 무오류 완료를 보장함(`push_subscriptions.endpoint`는 전역 유니크임) |

---

## 2. 영역별 상세 설계 및 보안 경계

### 2.1 `T1`: 웹 / Tauri Auth Adapter 분리 및 PKCE 단일화

1. **Supabase 클라이언트 단일화 (`src/lib/supabase/client.ts`)**:
   - `isTauriRuntime ? 'implicit' : 'pkce'` 분기를 제거하고 웹·Tauri 모두 `{ auth: { flowType: 'pkce', detectSessionInUrl: false } }`로 고정함.
   - `src/lib/supabase/client.test.ts`의 Tauri 런타임 케이스도 `flowType: 'pkce'`를 단언하도록 갱신함.

2. **플랫폼 어댑터 신설 (`src/lib/auth-adapter.ts`)**:
   - `isDesktopRuntime(): boolean`: `@tauri-apps/api/core`의 `isTauri()`(또는 브라우저 환경 가드 포함 동등 판정)를 단일 경계로 노출함.
   - `getOAuthRedirectUrl(): string`:
     - 데스크톱(`isDesktopRuntime()`): `"chronoledger://auth/callback"` 반환.
     - 웹: `` `${window.location.origin}/auth/callback` `` 반환.
   - `startGoogleOAuth(): Promise<{ mode: "browser-redirect" | "external-browser"; error?: string }>`:
     - `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getOAuthRedirectUrl(), skipBrowserRedirect: isDesktop } })` 호출(PKCE `code_verifier`가 현재 WebView/브라우저 `localStorage`에 자동 저장됨).
     - 데스크톱인 경우 반환된 `data.url`이 반드시 `https:` 프로토콜이며 설정된 `NEXT_PUBLIC_SUPABASE_URL`과 **동일 origin**인지 검증한 뒤에만 `@tauri-apps/plugin-shell`의 `open(data.url)`을 호출함(임의 스킴/명령 실행 원천 차단).
   - `isOAuthCallbackUrl(rawUrl: string): boolean`:
     - WHATWG `new URL(rawUrl)` 파싱 시 커스텀 스킴 `chronoledger://auth/callback?...`(`protocol === "chronoledger:"`, `hostname === "auth"` & `pathname` 말미 슬래시 제거값 `=== "/callback"`, 또는 `hostname === ""` & `pathname` `=== "/auth/callback"`)과 웹 콜백 URL(`pathname` 말미 슬래시 제거값 `=== "/auth/callback"`)을 모두 수용함. 그 외 URL은 `false` 반환.
     - **보안 규칙**: `url.hash`(`#access_token=...`)는 절대 읽지 않으며 `supabase.auth.setSession`을 호출하지 않음.
   - `completeOAuthCallbackUrl(rawUrl: string): Promise<{ status: "ignored" } | { status: "success" } | { status: "error"; message: string }>`:
     - `isOAuthCallbackUrl(rawUrl)`이 `false`면 `{ status: "ignored" }` 반환.
     - `searchParams.get("error")` 존재 시: `error === "access_denied"`면 `"Google 로그인이 취소되었습니다. 다시 시도해 주세요."`, 그 외에는 `error_description` 또는 일반 안내 문구를 담아 `{ status: "error", message }` 반환(내부 토큰·원시 스택 비노출).
     - `code = searchParams.get("code")` 누락 시: `{ status: "error", message: "인증 응답에 코드가 없습니다. 로그인 화면으로 돌아가 다시 시도해주세요." }` 반환.
     - **중복 교환 방지(Idempotency)**: 모듈 스코프 `Map<string, Promise<...>>`(최근 10개 상한)으로 동일 `code`에 대한 진행 중·완료된 `exchangeCodeForSession(code)` 결과를 공유함(React Strict Mode 이중 마운트 및 Tauri `getCurrent()` + `onOpenUrl()` 동시 수신 시 2번째 호출이 `code_verifier` 소진으로 실패하는 현상 방지).

3. **화면 연결 (`src/app/auth/page.tsx`, `src/app/auth/callback/page.tsx`, `src/components/pwa/service-worker-register.tsx`)**:
   - `src/app/auth/page.tsx`: 직접 `__TAURI_INTERNALS__`·`@tauri-apps/plugin-shell`을 다루는 코드를 제거하고 `startGoogleOAuth()`를 호출함. 또한 Tauri 딥링크 콜백 오류 이벤트(`chronoledger:oauth-callback-error`) 및 URL 쿼리(`oauthError`) 수신 시 오류 배너(`role="alert"`)를 표시함.
   - `src/app/auth/callback/page.tsx`: `completeOAuthCallbackUrl(window.location.href)`를 호출해 웹과 데스크톱이 동일한 PKCE 검증·오류 매핑 계약을 공유하게 함.
   - `src/components/pwa/service-worker-register.tsx`: `isDesktopRuntime()`일 때는 내장 정적 번들(`tauri.localhost`) 위에서 불필요한 구버전 캐시 고착을 막기 위해 `navigator.serviceWorker.register(...)`를 건너뜀(로그아웃·비인증 시 `clearAppCaches()`는 그대로 유지).

### 2.2 `T2` & `T3`: Tauri v2 딥링크(`getCurrent` + `onOpenUrl`), `single-instance` 및 세션/로그아웃 흐름

1. **프런트엔드 딥링크 초기화 (`src/lib/tauri-auth.ts` & `src/lib/auth-context.tsx`)**:
   - `setupDeepLink(handlers: { onSuccess: () => void; onError: (message: string) => void }): Promise<() => void>`:
     - `isDesktopRuntime()`이 아니면 즉시 no-op 해제 함수를 반환함.
     - **Cold-start 처리**: `@tauri-apps/plugin-deep-link`의 `getCurrent()`를 프로세스 수명당 **최초 1회(`coldStartChecked` 모듈 플래그)**만 조회해 콜백 URL이 있으면 처리함(이후 같은 프로세스에서 로그아웃 후 재마운트되더라도 초기 실행 인자 `code`를 재실행하지 않음).
     - **실행 중 수신 처리**: `await onOpenUrl(...)` 리스너를 등록하고 cleanup 시 해제 함수(`unlisten`)를 호출함.
     - `completeOAuthCallbackUrl` 결과가 `success`면 `onSuccess()`(`router.replace("/dashboard")`), `error`면 `window.dispatchEvent(new CustomEvent("chronoledger:oauth-callback-error", { detail: { message } }))` 및 `onError(message)`(`router.replace("/auth")` 포함)를 수행함(`window.location.href` 전체 리로드 지양).
   - **만료 세션 처리**: `AuthProvider`의 `supabase.auth.getSession()` 오류 또는 만료 토큰 정리 시 개인 데이터·캐시(`clearAppCaches`)가 비노출 상태로 유지되고 보호 기능 쓰기가 차단됨을 검증함.
   - **명시적 로그아웃 `/auth` 복귀 (`src/app/dashboard/layout.tsx`)**:
     - `handleLogout`에서 `unsubscribeCurrentDevicePush()` → `supabase.auth.signOut()` 성공 직후 `router.replace("/auth")`를 호출해 웹·데스크톱 모두 로그인 화면으로 명확히 복귀시킴(`AdminLayout`과 동작 일치).

2. **Rust 백엔드 구성 (`src-tauri/Cargo.toml` & `src-tauri/src/lib.rs`)**:
   - `src-tauri/Cargo.toml` `[dependencies]`에 추가:
     ```toml
     tauri-plugin-single-instance = { version = "2.0.0", features = ["deep-link"] }
     ```
   - `src-tauri/src/lib.rs`:
     - **플러그인 등록 순서 (필수)**: `tauri::Builder::default()`에서 **`tauri_plugin_single_instance::init(...)`를 `tauri_plugin_deep_link::init()`보다 반드시 먼저 등록**함(`features = ["deep-link"]`가 두 번째 인스턴스의 `chronoledger://...` 인자를 기존 인스턴스의 `deep-link` `onOpenUrl` 이벤트로 전달함).
     - `single-instance` 콜백에서 `"main"` WebviewWindow를 찾아 `unminimize()`, `show()`, `set_focus()`를 호출해 외부 브라우저 인증 직후 앱 창을 전면으로 올림.
     - `.setup(|app| { ... })` 내부에 `#[cfg(any(windows, target_os = "linux"))]` 블록으로 `tauri_plugin_deep_link::DeepLinkExt`의 `app.deep_link().register_all()`을 호출하되, 실패 시 패닉하지 않고 `log::warn!`만 남김(`tauri dev` 및 무설치 단독 실행 `.exe`에서도 `HKCU\Software\Classes\chronoledger` 스킴이 자동 등록되도록 보장).
   - `src-tauri/capabilities/default.json`: 기존 `"core:default"`, `"shell:allow-open"`, `"deep-link:default"`, `"notification:default"` 유지(`single-instance`는 프런트엔드 IPC 권한 불필요).

### 2.3 `T4`: Windows 프로덕션 빌드 및 검증 경계

- 빌드 명령: `npm run tauri build`(PowerShell 실행 정책 환경에서는 `npm.cmd run tauri build`, Rust 툴체인이 기본 `PATH`에 없으면 `$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"` 선행).
- 정적 프런트엔드 빌드 시 루트 `.env.local`(또는 공개 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)이 주입된 `out/` 산출물이 `src-tauri/target/release/ChronoLedger.exe`(및 번들 설치 파일)에 포함되는지 확인함(**단, 워크트리 테스트/아티팩트에는 실제 키 값을 절대 기록하지 않음**).
- 자동 검증(`cargo check`, `next build`, `tauri build` 바이너리 생성)과 사용자 실계정 검증(Supabase Dashboard에 `chronoledger://auth/callback` 등록 후 실제 Google 계정 OAuth 왕복·캘린더·결제 확인)을 명확히 구분해 기록함.

### 2.4 `R101-REV-001`: 취소·환불된 월간 구독 회차의 고정비 예정 제외

- **변경 파일**: `src/lib/budget-calculations.ts`, `src/lib/budget-calculations.test.ts`, `src/app/dashboard/expenses/page.tsx`.
- **세부 규칙**:
  1. `BudgetComparisonExpense` 인터페이스에 선택 필드 `billing_cycle?: string | null`을 추가함.
  2. `src/app/dashboard/expenses/page.tsx`의 `EXPENSE_COLUMNS`(`SCHEMA.sql` 기본 컬럼만 포함)에 `billing_cycle`을 추가해 `ExpenseRow`가 월간 구독 식별자를 보유하게 함.
  3. `calculateMonthBudgetBreakdown`:
     - `expense.status === "CANCELLED"`인 행은 금액 합계(`confirmedAmount`·`plannedFixedAmount`·`plannedVariableAmount`)에는 절대 더하지 않음.
     - 단, `expense.template_id`가 존재하고 해당 월에 귀속되는 취소·환불 행(`expense.billing_cycle`이 `'YYYY-MM'` 형식이면 해당 연·월 일치, 없으면 `sameMonth(expense.end_date ?? expense.target_date, month)`)이면 `coveredTemplateIds.add(expense.template_id)`를 수행함.
     - 이에 따라 당월 회차를 예정 취소(`PLANNED_CANCEL`)하거나 결제 후 환불(`PAYMENT_REFUND`)한 활성 `MONTHLY_DAY` 템플릿은 당월 `plannedFixedAmount`에 다시 더해지지 않고, 익월(`next`)에는 정상적으로 `default_price`가 합산됨.

### 2.5 `R106-REV-001`: 알림함 `'전체 삭제'` 인라인 2단계 확인

- **변경 파일**: `src/components/layout/notification-bell.tsx`, `src/components/layout/notification-bell.test.tsx`.
- **세부 규칙**:
  1. `confirmingDeleteAll` 불리언 상태를 두어 기본 헤더에는 기존 `[모두 읽음]`·`[전체 삭제]` 버튼을 표시함.
  2. `[전체 삭제]` 클릭 시 RPC를 즉시 호출하지 않고 `confirmingDeleteAll = true`로 전환해 헤더 우측에 인라인 **`[삭제 확인]`**(위험 강조 스타일, 클릭 시 `deleteNotifications(null)` 실행 후 확인 상태 해제)과 **`[취소]`**(클릭 시 `confirmingDeleteAll = false`) 버튼을 렌더링함.
  3. 팝오버 닫힘(`open === false`), 벨 재토글, 항목 `0`건 도달, 개별 삭제 또는 모두 읽음 실행 시 `confirmingDeleteAll`을 `false`로 초기화함.

### 2.6 `R106-REV-002`: `complete_push_notification_delivery` 삭제 알림 조용한 종료 (🐳 SQL)

- **변경 파일**: 신규 `sql/migrations/MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`.
- **세부 규칙**:
  1. `public.complete_push_notification_delivery(p_notification_id UUID, p_status VARCHAR, p_expired_endpoints TEXT[], p_succeeded_endpoints TEXT[])` 본문에서 입력 검증(`p_notification_id IS NULL`, `p_status` 허용값 검사)은 그대로 유지함.
  2. `SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id FOR UPDATE;` 실행 결과 `NOT FOUND`일 때:
     - `RAISE EXCEPTION ... USING ERRCODE = 'no_data_found'`를 던지지 않음.
     - `p_expired_endpoints`가 비어 있지 않으면 `DELETE FROM public.push_subscriptions WHERE endpoint = ANY(p_expired_endpoints) RETURNING user_id`로 만료 구독을 삭제하고, 삭제된 `user_id` 중 남은 `push_subscriptions`가 없는 사용자의 `public.notification_settings.push_enabled`를 `false`(`updated_at = NOW()`)로 갱신함.
     - `p_succeeded_endpoints`가 비어 있지 않으면 `UPDATE public.push_subscriptions SET last_success_at = NOW(), updated_at = NOW() WHERE endpoint = ANY(p_succeeded_endpoints);`를 수행함.
     - 즉시 `RETURN;`하여 조용히 정상 종료함.
  3. 시그니처·`SECURITY DEFINER SET search_path = public`·권한(`PUBLIC, anon, authenticated` 회수, `service_role`만 `EXECUTE`)은 기존과 동일하게 유지함(`database.types.ts` 변경 없음).
  4. `sql/README.md` B표에 마이그레이션 행·확인 쿼리(`position('no_data_found' IN pg_get_functiondef(...)) = 0`) 및 재실행 안내(`MIGRATION_R96_WEB_PUSH.sql` 재실행 시 이 파일도 재실행)를 추가하고, `sql/tests/TESTS.sql`에 삭제된 알림 ID로 `complete_push_notification_delivery` 호출 시 예외 없이 만료 엔드포인트가 정리되는 스모크 단언을 추가함.

---

## 3. 단계별 인수 기준 및 모델 배정 (`t1-t4-desktop-and-followups`)

> 격리 워크트리 `.worktrees/t1-t4-desktop-and-followups` 기준. SQL 변경(`R106-REV-002`)이 포함되므로 🐳 Docker 로컬 Supabase 검증 게이트를 적용함.

| Step | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 범위 및 핵심 인수 기준 |
| :---: | :--- | :--- | :--- |
| **1** | **GPT Codex** *(Fallback 1: Gemini 4 Neon (`High` — 도구에서 High 선택) / Claude Opus (`High` — 도구에서 High 선택))* | `Maker (SQL & 도메인 계산)` | 🐳 **§2.4(`R101-REV-001`) + §2.6(`R106-REV-002`)** 구현. 허용 파일: 신규 `sql/migrations/MIGRATION_R106_REV002_COMPLETE_PUSH_QUIET.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/lib/budget-calculations.ts`, `src/lib/budget-calculations.test.ts`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, 루트 `docs/handoff.md`, `docs/progress.md`. 검증: 로컬 DB 2경로 2회 멱등·`TESTS.sql` PASS, 취소·환불 월간 구독 당월 제외/익월 유지 Vitest 통과 |
| **2** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Opus (`High` — 도구에서 High 선택), Fallback 2: GitHub Copilot)* | `Maker (T1~T4 Auth·Tauri·알림 UI & 빌드)` | **§2.1~§2.3(`T1`~`T4`) + §2.5(`R106-REV-001`)** 구현. 허용 파일: `src/lib/auth-adapter.ts`(신규)·`.test.ts`(신규), `src/lib/supabase/client.ts`·`.test.ts`, `src/lib/tauri-auth.ts`, `src/lib/auth-context.tsx`·`.test.tsx`, `src/app/auth/page.tsx`·`.test.tsx`, `src/app/auth/callback/page.tsx`·`.test.tsx`, `src/app/dashboard/layout.tsx`, `src/lib/push-notifications.test.ts`, `src/components/pwa/service-worker-register.tsx`·`.test.tsx`, `src/components/layout/notification-bell.tsx`·`.test.tsx`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/lib.rs`, 루트 `docs/handoff.md`, `docs/progress.md`. 검증: `tsc`·`lint`·Vitest 전체·`cargo check`·`tauri build`(또는 정적 `next build` + Rust 릴리스 빌드) 통과 |
| **3** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback 1: Gemini 4 Carbon (`High` — 도구에서 High 선택))* | `Reviewer & Orchestrator` | Base ↔ Target 통합 정적 리뷰(`review.json`: PKCE·딥링크 URL 검증·`single-instance` 순서·SQL 권한/멱등·예산/알림 회귀), 🐳 로컬 DB 2경로 2회 멱등·`TESTS.sql`·`cargo check`·`tsc`·`lint`·Vitest·`next build`(`test.json`), 통과 시 `main` 병합·문서 마감 및 사용자 실기기 OAuth 왕복 체크리스트 안내 |

---

## 4. 사용자 외부 설정 및 실기기 최종 확인 항목 (배포·완결 게이트)

1. **Supabase Redirect URL 등록 (필수, 1회)**:
   - Supabase Dashboard → `Authentication` → `URL Configuration` → `Redirect URLs`에 **`chronoledger://auth/callback`** 추가 저장.
2. **Windows 실기기 단독 실행 확인 (`T3`·`T4` 수동 확인분)**:
   - 빌드된 `ChronoLedger.exe`(또는 설치본) 실행 → `[Google 계정으로 로그인]` 클릭 시 외부 브라우저 오픈 → 로그인 승인 시 기존 창 포커스 복귀 및 `/dashboard` 진입 확인.
   - 외부 브라우저에서 취소 시 `/auth` 오류 안내 확인, 앱 재실행 시 세션 유지 확인, 상단바 `[로그아웃]` 클릭 시 `/auth` 복귀 확인.
