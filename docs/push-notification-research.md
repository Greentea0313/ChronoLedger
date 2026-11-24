# 푸시 알림 설계 조사 (R89 · R39 · R84 연계)

- **작성**: Claude Opus (Run `r89-push-notification-research` Step 1), 2026-11-18
- **성격**: 문서 전용 조사임. 코드·DB 변경 없음. 외부 서비스 약관·요금은 작성일 기준이며 구현 전 재확인 필요함.
- **확인 방법**: 저장소 코드 확인(`public/sw.js`, `src/components/pwa/service-worker-register.tsx`, `src/app/dashboard/layout.tsx`, `src-tauri/`, `sql/SCHEMA.sql`) + 공개 문서·이슈 검색(10절 근거). 실제 기기 시험은 하지 않음 → `확인 필요` 표시 항목은 구현 Run 첫 단계에서 실측함.

## 1. 결론 요약

- **1단계는 "앱 내 알림함 + DB 알림 행"을 먼저 만들고, 웹 푸시는 2단계로 붙이는 방식을 권장함.**
  - 알림 내용을 DB `notifications` 행으로 먼저 저장하면 모든 환경(웹·PWA·Tauri·권한 거부 사용자)에서 앱 안에서 볼 수 있음. 웹 푸시는 같은 행을 "밖으로도 보내는" 추가 경로가 됨.
  - `R84` 건의 답변 알림은 1단계(앱 내 알림)만으로 요구를 채울 수 있음 → `R84`는 `R89` 구현 전체를 기다릴 필요 없음.
- **발송 주체**: Supabase Edge Function 1개(`send-notifications`)가 미발송 알림 행을 읽어 웹 푸시로 보냄. 호출은 ① `pg_cron` 하루 1회(KST 지정 시각, 일정·예정 지출 알림), ② 알림 행이 생길 때 DB 웹훅(`pg_net`) 즉시 호출(건의 답변·요청 승인/반려).
- **플랫폼 판정**:

| 환경 | 웹 푸시 | 판정 |
| :--- | :--- | :--- |
| Android Chrome (웹·설치 PWA) | 지원 | 2단계 대상 |
| Windows/macOS Chrome·Edge (웹) | 지원 | 2단계 대상 |
| iOS/iPadOS 16.4+ | **홈 화면에 추가한 웹 앱에서만** 지원. Safari 탭은 불가 | 2단계 대상(설치 안내 필요) |
| Windows 데스크톱 앱 (Tauri, WebView2) | **사실상 불가**로 봄(구독 시 push service 오류 보고, 공식 지원 문서 없음) | 앱 내 알림 + 실행 중 OS 알림(`plugin-notification`)만 |

- **비용**: 개인 프로젝트 규모(하루 수백 건 이하)에서는 Supabase 무료 플랜 Edge Function 한도(월 50만 회) 안에 들어감. 웹 푸시 발송 자체(브라우저 푸시 서비스)는 무료임.

## 2. 현행 코드 상태 (2026-11-18 `main` 기준)

- **Service Worker**: `public/sw.js`(`chronoledger-shell-v5`)는 앱 셸·사용자별 Supabase 읽기 캐시만 담당함. `push`·`notificationclick` 핸들러 없음. 등록은 운영 빌드에서만(`service-worker-register.tsx:16`) 하며, 로그인 사용자가 없어지면 `clearAppCaches()`로 캐시를 지움.
- **로그아웃**: `dashboard/layout.tsx`·`admin/layout.tsx`가 `supabase.auth.signOut()`만 호출함. 푸시 구독 정리 단계 없음.
- **PWA 매니페스트**: `display: "standalone"` → iOS 홈 화면 웹 앱 조건 충족함.
- **Tauri**: 플러그인은 `log`·`deep-link`·`shell`만 있음. 알림 플러그인 없음.
- **DB**: `pg_cron` 사용 중(계정 정리 5분 주기). `pg_net`·Edge Function 없음. 알림 관련 테이블 없음.
- **알림 소스 데이터**:
  - 관심 일정: `user_favorite_schedules(user_id, schedule_id)` → `game_schedules.start_date`·`end_date`(날짜만, 시각 없음).
  - 예정 지출: `expenses`(`status = 'PLANNED'`, `target_date DATE`).
  - 요청 처리: `approve_*`/`reject_*_request` RPC(관리자, `SECURITY DEFINER`).
  - 시각 단위 알림(예: 점검 1시간 전)은 `R85`(`start_at`·`end_at`) 이후에만 가능함 → 이번 범위는 **날짜 단위(D-1·당일) 알림**으로 한정함.

## 3. 플랫폼별 지원 범위와 제약

### 3.1 Web / Android PWA

- 표준 구성: `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID 공개키> })` → 구독(`endpoint`, `keys.p256dh`, `keys.auth`)을 서버에 저장 → 서버가 VAPID(RFC 8292) 서명 + 메시지 암호화(RFC 8291)로 푸시 서비스에 POST → SW `push` 이벤트에서 `showNotification()`.
- Chrome 계열은 브라우저 탭에서도 구독 가능함. 설치(PWA) 여부와 무관함.
- **현행 SW와 공존**: 같은 `sw.js`에 `push`·`notificationclick` 핸들러를 추가하면 됨. 캐시 로직과 독립임.
  - `notificationclick`: 열린 창이 있으면 `focus()` 후 이동, 없으면 `clients.openWindow(url)`. 이동 URL은 같은 출처 상대 경로만 허용함(알림 데이터 조작 대비).
  - 푸시 데이터에는 **민감 정보(금액·메모 원문)를 넣지 않음**. 제목·짧은 본문·이동 경로만 넣음. 푸시 서비스는 내용을 볼 수 없지만 잠금 화면에 표시됨.
  - `sw.js` 변경 시 `SHELL_CACHE` 버전 올림(기존 규칙).
- **개발 환경 주의**: SW가 운영 빌드에서만 등록되므로, 푸시 시험은 `npm run build` 결과물(정적 서버) 또는 배포 미리보기에서 해야 함.

### 3.2 iOS / iPadOS PWA

- iOS·iPadOS 16.4부터 **홈 화면에 추가한 웹 앱**에서만 웹 푸시 지원함. Safari 탭·북마크는 권한 요청 불가함.
- iOS 16.4~18은 매니페스트 `display`가 `standalone`/`fullscreen`일 때만 웹 앱으로 열림(현행 `standalone` 충족). iOS 26부터는 홈 화면 추가 사이트가 기본으로 웹 앱으로 열린다고 보고됨.
- 권한 요청(`Notification.requestPermission()`·`subscribe`)은 **사용자 탭 처리기 안에서만** 동작함. 페이지 로드·타이머에서 호출하면 대화상자가 안 뜸 → 설정 화면 `[알림 켜기]` 버튼에서 요청하는 구조로 함(모든 플랫폼 공통 원칙으로 채택).
- 발송은 Apple 푸시 서비스(APNs)를 거치지만 **Apple 개발자 계정·인증서 불필요**함(표준 VAPID 그대로).
- UX: iOS Safari 탭에서 접속한 사용자에게는 "홈 화면에 추가 후 알림 사용 가능" 안내를 보여줌(`navigator.standalone`/`display-mode: standalone` 감지).

### 3.3 Windows 데스크톱 (Tauri v2, WebView2)

- **WebView2 웹 푸시**: Microsoft 공식 지원 문서를 찾지 못함. WebView2 런타임에서 `pushManager.subscribe()`가 `AbortError: Registration failed - push service error`로 실패한다는 보고(WebView2Feedback #5051, 해결 기록 없음)와 Edge에서는 되지만 WebView2에서는 안 된다는 오래된 보고가 있음 → **미지원으로 간주함**. 또한 Tauri 앱은 `tauri.localhost` 출처라 웹 버전과 구독이 별개임.
- **`@tauri-apps/plugin-notification`(공식)**: Windows 지원. JS `isPermissionGranted()`·`requestPermission()`·`sendNotification()` 제공. **Windows에서는 설치된 앱에서만 동작**하고, 개발 실행에서는 PowerShell 이름·아이콘으로 표시됨. 예약(스케줄) 알림 API는 공식 문서에서 확인하지 못함.
- **결론**: 데스크톱 앱은 ① 앱 내 알림함, ② 앱 실행 중 Supabase Realtime 또는 주기 조회로 새 알림을 받아 `sendNotification()`으로 OS 알림 표시까지만 함. 앱이 꺼져 있을 때 알림은 지원하지 않음(필요하면 웹 버전 푸시를 쓰도록 안내).
- **확인 필요**: 실제 WebView2 런타임에서 `PushManager` 존재 여부·구독 결과, Tauri 설치본에서 알림 표시.

### 3.4 앱 내 알림함 (모든 환경 공통 기반)

- 상단 벨 아이콘 + 읽지 않은 수 배지 + 알림 목록(드로어/팝오버). 항목 클릭 시 관련 화면으로 이동하고 `read_at` 기록.
- 푸시 권한을 거부했거나 지원하지 않는 환경(iOS 탭, Tauri, 오래된 브라우저)에서도 같은 알림을 볼 수 있음.
- 갱신: 화면 진입·포커스 복귀 시 조회(기존 데이터 로드 패턴) + 선택적으로 Supabase Realtime 구독. 1단계는 조회만으로 충분함.

## 4. 발송 아키텍처 (서버 없는 정적 배포 기준)

### 4.1 공통 흐름 (알림 행 = 발송 대기열)

```text
[알림 생성]                      [저장]                         [발송]
pg_cron 일일 스캔 함수   ─┐
관리자 RPC(답변·승인·반려) ─┼─▶ public.notifications (행 1개) ─▶ Edge Function send-notifications
                          │     · 앱 내 알림함이 읽음            · push_subscriptions 조회 → 웹 푸시
                          │     · push_status = 'PENDING'         · 결과로 push_status 갱신
```

- 알림 생성은 모두 DB 안(`SECURITY DEFINER` 함수)에서 함. 클라이언트는 알림 행을 만들 수 없음(위조 방지).
- 같은 알림 중복 방지: `UNIQUE (user_id, kind, source_id, scheduled_for)`.

### 4.2 정기 알림 (`R39` 관심 일정·예정 지출) — `pg_cron`

- `pg_cron` 하루 1회(예: KST 09:00 = `0 0 * * *` UTC) `public.enqueue_daily_notifications()` 실행:
  - 관심 일정: 시작일 당일·종료 D-1(설정에 따라).
  - 예정 지출: `target_date` D-1·당일.
  - 사용자 알림 설정이 꺼진 종류는 만들지 않음.
- 같은 작업 끝에 `pg_net`으로 Edge Function을 1회 호출해 그날 만든 행을 일괄 발송함.
- `pg_net` 호출은 응답을 기다리지 않는 방식이라 실패해도 재시도·경보가 없음 → Edge Function은 매번 "아직 `PENDING`인 행 전체"를 처리하게 해서 다음 호출 때 자동으로 따라잡게 함.

### 4.3 이벤트 알림 (`R84` 건의 답변, 요청 승인·반려) — 즉시

- 관리자 RPC(답변·승인·반려) 안에서 `notifications` 행을 같은 트랜잭션으로 INSERT함 → 처리 결과와 알림이 항상 함께 남음.
- 즉시 발송은 `notifications` INSERT에 대한 **DB 웹훅**(Supabase Database Webhook = `pg_net` 트리거)으로 Edge Function 호출. 웹훅 실패 시에도 다음 일일 실행이 `PENDING` 행을 처리하므로 늦어질 뿐 누락되지 않음.
- 대안 비교:

| 방식 | 장점 | 단점 | 판정 |
| :--- | :--- | :--- | :--- |
| DB 웹훅(`pg_net`) | 클라이언트 변경 없음, RPC와 독립 | 웹훅 설정 1회 필요 | **권장** |
| 관리자 화면이 RPC 후 Edge Function 직접 호출 | 구현 단순 | 화면을 닫거나 오프라인이면 발송 누락, 관리자 JWT로 함수 권한 판정 필요 | 비권장 |
| `pg_cron` 1~5분 주기 폴링 | 웹훅 불필요 | 함수 호출 수 증가(월 8,640~43,200회), 지연 | 보조 수단 |

### 4.4 Edge Function `send-notifications`

- **입력**: 없음(대기열 처리) 또는 웹훅 페이로드(무시하고 대기열 처리해도 됨).
- **권한**: 서비스 역할로 DB 접근. 함수 호출은 JWT 검증을 켜고, `pg_net`·웹훅이 보내는 서비스 키(또는 전용 비밀 헤더)로만 허용함. 브라우저에서 호출할 이유 없음.
- **처리**: `push_status = 'PENDING'` 행을 묶음으로 잠금(`FOR UPDATE SKIP LOCKED` 해당 RPC) → 사용자 활성 구독마다 발송 → 결과 기록.
  - `201/200`: 성공.
  - `404`/`410 Gone`: 만료 구독 → `push_subscriptions` 행 삭제(또는 비활성).
  - `429`/`5xx`: 재시도 횟수 증가, 상한(예: 3회) 넘으면 `FAILED`.
  - 구독 없는 사용자: `SKIPPED`(앱 내 알림함에는 남음).
- **라이브러리**: Node 전용 `web-push` 패키지는 Deno 런타임과 호환 문제가 보고됨 → Web Crypto 기반 라이브러리(예: `npm:@pushforge/builder`, `jsr:@negrel/webpush`) 후보. **구현 Run 첫 단계에서 1개를 골라 실제 발송 시험 필요**함.
- **VAPID 키**: 공개키는 앱 환경 변수(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, 공개돼도 됨). 개인키·`subject`(`mailto:` 운영 연락처)는 **Edge Function Secrets에만** 둠. 저장소·`out/`·`.env.local`에 넣지 않음. 키 교체 시 기존 구독은 모두 재구독 필요함(문서화).

### 4.5 비용·한도 (작성일 기준, 재확인 필요)

- Supabase 무료 플랜: Edge Function 호출 월 50만 회(Pro 200만 회 포함, 초과 100만 회당 $2). 일일 1회 + 이벤트 알림 수십 건/일이면 월 수천 회 수준임.
- `pg_cron`·`pg_net`은 무료 플랜에서도 사용 가능함(`pg_net`은 확장 활성화 필요).
- 무료 플랜 프로젝트는 일정 기간 활동이 없으면 일시 중지될 수 있음 → 중지되면 일일 알림도 멈춤. 실사용 중에는 문제없으나 운영 시 확인 필요함.
- 브라우저 푸시 서비스(FCM·Mozilla·Apple) 발송 비용 없음.

## 5. DB 스키마·RLS·탈퇴 정리 초안

> 구현 시 `chronoledger-sql-migration` Skill 규칙(재실행 안전 마이그레이션, SCHEMA 동기화, README 확인 쿼리, TESTS.sql)을 따름. 아래는 초안이며 이름·컬럼은 구현 Run에서 확정함.

### 5.1 `public.push_subscriptions`

| 컬럼 | 타입 | 비고 |
| :--- | :--- | :--- |
| `id` | `UUID PK` | |
| `user_id` | `UUID NOT NULL → auth.users ON DELETE CASCADE` | |
| `endpoint` | `TEXT NOT NULL UNIQUE` | 기기(브라우저)별 고유. 같은 기기에서 다른 계정 로그인 시 소유자 교체 |
| `p256dh`, `auth` | `TEXT NOT NULL` | 암호화 키 |
| `platform` | `VARCHAR(20)` | `web`·`ios_pwa` 등(표시·통계용) |
| `user_agent_label` | `VARCHAR(100)` | "Chrome · Windows" 같은 요약만. 원문 UA 저장 안 함 |
| `created_at`, `last_success_at` | `TIMESTAMPTZ` | |

- **권한**: `authenticated`는 본인 행 `SELECT`만. 등록·해제는 RPC `upsert_push_subscription(endpoint, p256dh, auth, platform, label)`·`delete_push_subscription(endpoint)`로만 함.
  - `upsert`는 같은 `endpoint`가 다른 사용자 소유면 **현재 사용자로 소유자를 바꿈**(공용 기기에서 계정을 바꿔 로그인한 경우 이전 계정 알림이 오지 않게 함).
  - `endpoint`는 `https://` 시작·길이 상한 검사함.
- `anon` 권한 없음. 계정 삭제 대기 차단 정책·트리거, `purge_expired_account_deletion_requests` 삭제 연결.

### 5.2 `public.notification_settings`

- `user_id PK`, `favorite_schedule_start BOOLEAN`, `favorite_schedule_end_d1 BOOLEAN`, `planned_expense_d1 BOOLEAN`, `request_result BOOLEAN`(요청 승인·반려·건의 답변), `push_enabled BOOLEAN`(웹 푸시 전체 끄기), `updated_at`.
- 행이 없으면 기본값(전부 켬, `push_enabled`는 구독 시 켬)으로 간주함. 본인 행 조회·수정(RPC 또는 본인 행 `UPDATE` 정책).

### 5.3 `public.notifications`

| 컬럼 | 비고 |
| :--- | :--- |
| `id`, `user_id` | |
| `kind` | `FAVORITE_START`·`FAVORITE_END_D1`·`EXPENSE_D1`·`REQUEST_APPROVED`·`REQUEST_REJECTED`·`FEEDBACK_ANSWERED` |
| `title`, `body` | 짧은 문구. 금액·메모 원문 넣지 않음 |
| `link_path` | 같은 출처 상대 경로(`/dashboard?date=…` 등), CHECK로 `^/` 강제 |
| `source_id`, `scheduled_for DATE` | 중복 방지 키 |
| `push_status` | `PENDING`·`SENT`·`SKIPPED`·`FAILED`, `push_attempts`, `pushed_at` |
| `read_at`, `created_at` | |

- **권한**: 본인 행 `SELECT`, `read_at`만 바꾸는 RPC `mark_notifications_read(ids)`. INSERT는 DB 함수(`enqueue_daily_notifications`, 관리자 RPC)만. 보관 기간(예: 90일) 지난 행은 `pg_cron`으로 정리.
- 계정 삭제 대기 차단, 탈퇴 정리 연결.

### 5.4 로그아웃·공용 기기 처리

- 로그아웃 순서: ① 현재 기기 구독 조회 → ② `delete_push_subscription(endpoint)` RPC(세션이 살아 있을 때) → ③ `subscription.unsubscribe()` → ④ `signOut()` → ⑤ 기존 캐시 삭제.
- 오프라인·RPC 실패 시에도 ③은 실행함 → 서버의 남은 행은 다음 발송 때 `404/410`으로 정리됨.
- 계정 삭제 대기 화면(`account-deletion-status.tsx`)의 로컬 로그아웃에도 같은 정리 적용.

## 6. 화면 초안

- **설정 화면 `알림` 카드**: 알림 종류별 토글, `[이 기기에서 푸시 알림 켜기]` 버튼(권한 요청은 이 버튼에서만), 현재 상태(허용·거부·미지원·홈 화면 추가 필요) 안내, 등록된 기기 목록과 `[해제]`.
- **상단 벨 아이콘**: 읽지 않은 수 배지, 목록, `모두 읽음`.
- 권한이 `denied`면 브라우저 설정에서 바꿔야 한다는 안내만 표시함(재요청 불가).

## 7. 보안·개인정보 점검 항목

- VAPID 개인키·서비스 키는 Edge Function Secrets에만 둠. 클라이언트에는 VAPID 공개키만.
- 알림 생성·발송 상태 변경은 클라이언트가 할 수 없게 함(직접 쓰기 권한 없음).
- `notificationclick`·`link_path`는 같은 출처 상대 경로만 허용함(외부 URL 유도 차단).
- 잠금 화면 노출을 고려해 금액·메모·건의 본문은 알림 문구에 넣지 않음.
- 공용 기기: `endpoint` 소유자 교체 + 로그아웃 시 구독 해제.
- Edge Function 로그에 `endpoint`·키를 그대로 남기지 않음.

## 8. 단계별 구현 Run 분할안 (2026-11-18 확정)

| 순서 | Run (가칭) | 범위 | DB | 담당(안) |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `r84-feedback-and-inbox` (`R84`) | `R84` 기타 건의 창구(`feedback_requests`) + `public.notifications` 테이블·앱 내 알림함(상단 벨 아이콘·읽음 처리 RPC·30일 보관 `pg_cron` 정리) + 관리자 건의 답변·요청 승인/반려 시 알림 행 원자적 생성 | 있음 | DB GPT Codex / Claude Opus → UI Claude Sonnet / Gemini 4 Hydrogen → 리뷰 Claude Opus |
| 2 | `r39-daily-notifications` (`R39`) | `public.notification_settings` + `pg_cron` 일일 생성(KST 09:00, 관심 일정 시작 당일 `FAVORITE_START`·종료 1일 전 `FAVORITE_END_D1`·예정 지출 결제 예정일 1일 전 `EXPENSE_D1` 3종) + 설정 화면 알림 카드(토글) | 있음 | DB GPT Codex / Claude Opus → UI Claude Sonnet / Gemini 4 Hydrogen → 리뷰 Claude Opus |
| 3 | `r96-web-push` (`R96`) | VAPID·`public.push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push`/`notificationclick` 핸들러·로그아웃 구독 해제·iOS 홈 화면 추가 안내 | 있음 | Claude Opus(설계·Edge Function) → Claude Sonnet / Gemini 4 Hydrogen(UI) → 리뷰 Claude Opus |
| 4 | `r97-tauri-notifications` (`R97`) | Tauri `@tauri-apps/plugin-notification` 연동 + 데스크톱 앱 실행 중 새 알림 OS 네이티브 표시 | 없음 | Claude Sonnet / Gemini 4 Hydrogen / GitHub Copilot |

- 1·2단계만으로 모든 환경에서 앱 내 알림이 동작함. 3단계가 앱 밖 웹 푸시를, 4단계가 Tauri 데스크톱 실행 중 OS 알림을 추가함.
- 각 DB 단계는 🐳 로컬 Supabase 검증 필요(Docker Desktop).
- 2단계(`R39`) 예정 지출(`PLANNED`) 알림 기준일은 `expenses.target_date`를 사용함(`R56` 이후 버전 패스 예정 지출도 `target_date = end_date`로 유지되므로 단일 컬럼으로 일관됨).
- 3단계 첫 작업: 웹 푸시 라이브러리 선택·실제 발송 시험(Android Chrome, Windows Chrome, iOS 홈 화면 웹 앱), WebView2 실측.

## 9. 사용자 결정 확정 항목 (2026-11-18 Step 2 질문 카드 확정)

1. **도입 순서**: **단계별 분리 도입 확정** — 1차(`R84` 기타 건의 창구 + 앱 내 알림함) → 2차(`R39` 관심 일정·예정 지출 일일 알림) → 3차(`R96` Web Push 외부 발송) → 4차(`R97` Windows Tauri 실행 중 OS 네이티브 알림).
2. **`R84` 답변 알림**: **앱 내 알림함만으로 1차 먼저 출시** 확정.
3. **일일 정기 알림(`R39`) 종류와 시점**: **3종 확정** — ① 관심 일정 시작 당일(`FAVORITE_START`), ② 관심 일정 종료 1일 전(`FAVORITE_END_D1`), ③ 예정 지출 결제 예정일 1일 전(`EXPENSE_D1`). (건의 답변 `FEEDBACK_ANSWERED` 및 요청 승인·반려 `REQUEST_APPROVED`·`REQUEST_REJECTED`는 1차부터 기본 포함).
4. **일일 발송 시각**: **KST 09:00 (`0 0 * * *` UTC)** 확정.
5. **Windows 데스크톱 앱(Tauri)**: 앱 내 알림함 + **앱 실행 중 OS 네이티브 알림(`@tauri-apps/plugin-notification`)까지 포함**(4차 `R97`) 확정.
6. **알림 보관 기간**: **30일** (경과한 `notifications` 행은 `pg_cron`으로 자동 정리) 확정.

## 10. 근거 링크 (확인일 2026-11-18)

- WebKit, iOS·iPadOS 웹 앱 웹 푸시: <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
- Apple, 웹 앱·브라우저 웹 푸시 문서: <https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers>
- OneSignal, iOS 웹 푸시 조건(홈 화면·사용자 동작): <https://documentation.onesignal.com/docs/web-push-for-ios>
- W3C Push API: <https://www.w3.org/TR/push-api/>
- WebView2Feedback #5051(구독 시 push service 오류): <https://github.com/MicrosoftEdge/WebView2Feedback/issues/5051>
- Microsoft Tech Community(Edge 동작·WebView2 미동작 보고): <https://techcommunity.microsoft.com/t5/discussions/web-push-working-in-edge-but-not-in-webview2/m-p/1672634>
- Tauri v2 알림 플러그인: <https://v2.tauri.app/plugin/notification/>
- Supabase 푸시 알림 예제(FCM 기준): <https://supabase.com/docs/guides/functions/examples/push-notifications>
- PushForge(Web Crypto 기반 웹 푸시, Deno 지원): <https://github.com/draphy/pushforge>
- Supabase 과금 FAQ: <https://supabase.com/docs/guides/platform/billing-faq>
- Supabase Cron: <https://supabase.com/modules/cron>

---

## 11. R96 Web Push 외부 발송 확정 명세 및 단계별 수용 기준 (2026-11-24 Chief Architect 확정)

- **작성**: Gemini 4 Argon (`Chief Architect`, `📐 SPEC_NEEDED` 구체화), 2026-11-24
- **선행 조건 확인**: `R39`(`r39-daily-notifications`)가 `main`에 병합(`9ae05f9`) 및 운영 DB 적용(`a98a621`) 완료되었으므로, `r96-web-push`는 최신 `main`에서 격리 워크트리(`.worktrees/r96-web-push`)로 분기함.

### 11.1 사용자 확정 결정 사항 (2026-11-24 질문 카드 확정)

1. **브랜치 분기 기준**: `R39` 병합 완료본이 반영된 최신 `main`에서 `r96-web-push`를 분기함.
2. **`request_result` 토글 동작 범위**: 요청 승인(`REQUEST_APPROVED`)·반려(`REQUEST_REJECTED`)·건의 답변(`FEEDBACK_ANSWERED`)의 **앱 내 알림함(`public.notifications` 행)은 항상 생성**하고, `notification_settings.request_result = false`이거나 `push_enabled = false`(또는 활성 구독 0건)이면 **기기 외부 Web Push 발송만 생략(`push_status = 'SKIPPED'`)**함.
3. **Web Push 암호화·서명 및 DB 웹훅 격리**:
   - 외부 서드파티 패키지 의존성 없이 **표준 Web Crypto API (`crypto.subtle` — RFC 8292 VAPID ES256 JWT 서명 + RFC 8291 `aes128gcm` 페이로드 암호화)** 내장 모듈로 구현해 Vitest 단위 테스트로 직접 검증함.
   - `pg_net` 웹훅 미설정·비활성·호출 실패가 DB 알림 행 `INSERT` 트랜잭션을 절대 롤백시키지 않도록 예외 격리(`EXCEPTION WHEN OTHERS THEN`)함.

### 11.2 DB 스키마·RLS·RPC 확정 명세 (`sql/migrations/MIGRATION_R96_WEB_PUSH.sql`)

1. **`public.push_subscriptions` 테이블**:
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `endpoint TEXT NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(btrim(endpoint)) BETWEEN 12 AND 2048)`
   - `p256dh TEXT NOT NULL CHECK (length(btrim(p256dh)) BETWEEN 40 AND 256)`
   - `auth TEXT NOT NULL CHECK (length(btrim(auth)) BETWEEN 16 AND 128)`
   - `platform VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios_pwa', 'android_pwa'))`
   - `user_agent_label VARCHAR(100) NOT NULL DEFAULT '웹 브라우저' CHECK (length(btrim(user_agent_label)) BETWEEN 1 AND 100)`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `last_success_at TIMESTAMPTZ`
   - 인덱스: `idx_push_subscriptions_user_id ON public.push_subscriptions(user_id, created_at DESC)`
   - 권한·RLS: `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated; GRANT SELECT ON public.push_subscriptions TO authenticated;` (클라이언트 직접 `INSERT`/`UPDATE`/`DELETE` 원천 차단, 본인 행 `auth.uid() = user_id` 조회만 허용).
   - 계정 삭제 대기 차단: `RESTRICTIVE` 정책 `"Block account deletion users from push_subscriptions"` 및 `block_pending_account_deletion_push_subscriptions` 트리거(`SCHEMA.sql` 공통 루프 2곳 포함), `purge_expired_account_deletion_requests` 내 `DELETE FROM public.push_subscriptions WHERE user_id = v_req.user_id;` 추가.
2. **클라이언트 구독 관리 `SECURITY DEFINER` RPC 2종 (`authenticated` 실행 허용)**:
   - `public.upsert_push_subscription(p_endpoint TEXT, p_p256dh TEXT, p_auth TEXT, p_platform VARCHAR DEFAULT 'web', p_user_agent_label VARCHAR DEFAULT '웹 브라우저') RETURNS UUID`:
     - `auth.uid()` 인증 및 `public.account_deletion_is_pending(auth.uid())` 차단 검사.
     - `p_endpoint`(`^https://`, 12~2048자), `p_p256dh`(40~256자), `p_auth`(16~128자), `p_platform`(`'web'|'ios_pwa'|'android_pwa'`), `p_user_agent_label`(1~100자) 검증.
     - `INSERT INTO public.push_subscriptions ... ON CONFLICT (endpoint) DO UPDATE SET user_id = auth.uid(), p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, platform = EXCLUDED.platform, user_agent_label = EXCLUDED.user_agent_label, updated_at = NOW()`로 **공용 기기에서 다른 계정이 로그인해 구독할 때 `endpoint` 소유자를 현재 사용자로 원자적 교체**함.
     - 동시에 `public.notification_settings`에 `INSERT INTO public.notification_settings(user_id, push_enabled, updated_at) VALUES (auth.uid(), true, NOW()) ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, updated_at = NOW()`를 반영함.
   - `public.delete_push_subscription(p_endpoint TEXT DEFAULT NULL, p_subscription_id UUID DEFAULT NULL) RETURNS INTEGER`:
     - `auth.uid()` 인증 검사 (`p_endpoint`와 `p_subscription_id`가 모두 `NULL`이면 예외 발생).
     - `user_id = auth.uid()`이면서 `endpoint = btrim(p_endpoint)` 또는 `id = p_subscription_id`인 행만 삭제하고, 삭제 후 본인의 남은 `push_subscriptions`가 0건이면 `notification_settings`의 `push_enabled = false, updated_at = NOW()`로 갱신한 뒤 삭제 건수를 반환함.
3. **발송 워커 대기열 선점·완료 `SECURITY DEFINER` RPC 2종 (`service_role` 실행 전용)**:
   - `public.claim_pending_push_notifications(p_limit INTEGER DEFAULT 50) RETURNS TABLE (notification_id UUID, user_id UUID, kind VARCHAR, title VARCHAR, body VARCHAR, link_path TEXT, push_attempts SMALLINT)`:
     - `p_limit` (1~200) 범위 검사.
     - `push_status = 'PENDING'`인 `public.notifications` 행을 `created_at ASC` 순으로 `FOR UPDATE SKIP LOCKED` 잠금:
       - ① `public.account_deletion_is_pending(n.user_id)`이거나, ② `coalesce(ns.push_enabled, false) = false`이거나, ③ (`n.kind IN ('REQUEST_APPROVED', 'REQUEST_REJECTED', 'FEEDBACK_ANSWERED')` 이고 `coalesce(ns.request_result, true) = false`)이거나, ④ 해당 `user_id`의 `push_subscriptions` 행이 0건인 경우: 즉시 `push_status = 'SKIPPED'`, `pushed_at = NOW()`로 갱신하고 반환 결과에서 제외함.
       - 실제 발송 대상인 행은 `push_attempts = n.push_attempts + 1`로 증가시키고 반환함.
   - `public.complete_push_notification_delivery(p_notification_id UUID, p_status VARCHAR, p_expired_endpoints TEXT[] DEFAULT '{}'::TEXT[], p_succeeded_endpoints TEXT[] DEFAULT '{}'::TEXT[]) RETURNS VOID`:
     - `p_status IN ('SENT', 'SKIPPED', 'FAILED', 'PENDING')` 검증(`429`/`5xx` 일시 오류 시 `push_attempts < 3`이면 `'PENDING'` 유지, `>= 3`이면 `'FAILED'`).
     - 대상 알림 소유자(`user_id`)의 `push_subscriptions` 중 `endpoint = ANY(p_expired_endpoints)`인 만료 구독(`404`/`410`)을 삭제하고(남은 구독이 0건이면 `notification_settings.push_enabled = false` 동기화), `endpoint = ANY(p_succeeded_endpoints)`인 구독의 `last_success_at = NOW(), updated_at = NOW()`를 갱신함.
     - 대상 `public.notifications` 행의 `push_status = p_status`, `pushed_at = CASE WHEN p_status IN ('SENT', 'SKIPPED', 'FAILED') THEN NOW() ELSE pushed_at END`를 갱신함.
4. **비동기 웹훅 호출 도우미 (`public.trigger_send_notifications_webhook`)**:
   - `notifications` `AFTER INSERT FOR EACH STATEMENT` 트리거로 연결하되, `pg_net` 확장(`net.http_post`)과 DB 설정(`current_setting('app.settings.send_notifications_url', true)`, `current_setting('app.settings.send_notifications_secret', true)`)이 모두 유효할 때만 호출하고, 블록 전체를 `EXCEPTION WHEN OTHERS THEN RETURN NULL;`로 감싸 **로컬/운영 DB에서 `pg_net` 미설정이나 네트워크 오류가 나도 알림 INSERT가 절대 실패하지 않게 보장**함.

### 11.3 Web Crypto 암호화·Edge Function·SW·클라이언트 확정 명세

1. **표준 Web Crypto Web Push 모듈 (`src/lib/web-push-crypto.ts` & Edge Function 공유)**:
   - 외부 패키지 없이 `crypto.subtle`만으로 ① RFC 8292 VAPID ES256 JWT 서명(`createVapidAuthorizationHeader`), ② RFC 8291 `aes128gcm` 페이로드 암호화(`encryptWebPushPayload`), ③ 알림 페이로드 직렬화(`buildSafePushPayload`: `{ title, body, link_path, tag }`만 허용하고 `link_path`가 `^/`이면서 `^//`가 아니면 통과, 아니면 `'/dashboard'`로 강제)를 구현함.
   - `supabase/functions/send-notifications/index.ts`는 `x-webhook-secret`(또는 `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`)을 검증한 뒤 `claim_pending_push_notifications` $\to$ 사용자별 `push_subscriptions` 조회 및 암호화 발송 $\to$ `complete_push_notification_delivery`를 수행함. 로그에 `endpoint` 원문이나 암호화 키를 절대 출력하지 않음.
2. **Service Worker (`public/sw.js`)**:
   - `SHELL_CACHE`를 `"chronoledger-shell-v6"`으로 상향함.
   - `push` 이벤트: JSON 페이로드(`{ title, body, link_path, tag }`)를 파싱(비정상 JSON 시 기본 제목 `"ChronoLedger 알림"` 폴백)하여 `self.registration.showNotification()` 호출.
   - `notificationclick` 이벤트: `notification.close()` 후 `link_path`가 `^/`로 시작하고 `^//`가 아닌 동일 출처 상대 경로인지 검증(위반 시 `'/dashboard'`)한 뒤, 열린 동일 출처 창이 있으면 `focus()` 및 이동하고 없으면 `clients.openWindow(targetUrl)`를 실행함.
3. **클라이언트 푸시 헬퍼 (`src/lib/push-notifications.ts`) 및 로그아웃 구독 해제**:
   - 환경 감지(`getPushSupportState`):
     - Tauri 데스크톱(`isTauriRuntime()`): `'tauri_desktop'` (웹 푸시 대신 데스크톱 OS 알림 사용 안내)
     - iOS/iPadOS 비-standalone 브라우저 탭: `'ios_install_required'` (`"공유 → 홈 화면에 추가"` 안내)
     - `serviceWorker` / `PushManager` / `Notification` 미지원: `'unsupported'`
     - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 미설정: `'unconfigured'`
     - 지원 환경: `'supported'`
   - `unsubscribeCurrentDevicePush()`: 로그아웃 공용 정리 함수. ① 현재 SW registration의 `pushManager.getSubscription()` 조회 → ② 구독이 있으면 `delete_push_subscription(endpoint)` RPC 호출(오프라인·RPC 오류 무시) → ③ `subscription.unsubscribe()` 호출.
   - `src/app/dashboard/layout.tsx`, `src/app/admin/layout.tsx`, `src/components/auth/account-deletion-status.tsx`의 로그아웃(`signOut`) 직전에 `await unsubscribeCurrentDevicePush()`를 호출해 공용 기기에서 로그아웃 후 이전 계정 푸시가 오지 않게 보장함.
4. **설정 화면 알림 카드 확장 (`src/components/settings/notification-settings-card.tsx`)**:
   - `요청 처리 결과 알림`(`request_result`) 토글 추가: `"요청 승인·반려 및 건의 답변 시 웹 푸시 알림을 받습니다. (앱 내 알림함에는 항상 표시됨)"`.
   - `웹 푸시 알림 (외부 기기 알림)` 섹션 추가:
     - 플랫폼 상태별 안내(`tauri_desktop`, `ios_install_required`, `Notification.permission === 'denied'`, `unconfigured`).
     - 지원 환경에서 `[이 기기에서 푸시 알림 켜기]` 버튼(클릭 핸들러 내부에서만 권한 요청 및 `subscribe` 실행 후 `upsert_push_subscription` RPC 호출), `웹 푸시 전체 수신`(`push_enabled`) 토글, 등록된 기기 목록(`push_subscriptions`: `user_agent_label`, `platform`, 등록/최근 발송일) 및 기기별 `[해제]` 버튼(`delete_push_subscription` RPC + 현재 기기 일치 시 `subscription.unsubscribe()`) 제공.

### 11.4 `r96-web-push` 단계별 수용 기준 (Dispatch Queue 등록용)

- **Step 1 (`GPT Codex`, Fallback 1: `Gemini 4 Neon` / `Claude Opus`, Fallback 2: `Gemini 4 Hydrogen` — `Maker: R96 DB/RLS/RPC & Types`)**:
  - 🐳 **Docker Desktop 필요** (Docker 미설치 PC면 `⚠️ LOCAL_DB_DEFERRED` 기록 후 Step 3 이관).
  - 허용 파일: 신규 `sql/migrations/MIGRATION_R96_WEB_PUSH.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, 루트 `docs/handoff.md`, `docs/progress.md`.
  - 수용 기준: §11.2의 `public.push_subscriptions` 테이블·RLS·삭제 대기 차단·탈퇴 정리, `upsert_push_subscription`·`delete_push_subscription`·`claim_pending_push_notifications`·`complete_push_notification_delivery` 4개 `SECURITY DEFINER` RPC, 예외 격리된 `trigger_send_notifications_webhook` 트리거, `SCHEMA.sql`·`README.md`(B표 R96 확인 쿼리)·`TESTS.sql`(`R96` 스모크 시나리오: 구독 등록·공용 기기 `endpoint` 소유자 교체·본인 외 조회/직접 쓰기 차단·`claim`/`complete` 상태 전이 및 `request_result=false`/`push_enabled=false` 시 `SKIPPED`·만료 `endpoint` 정리·계정 삭제 대기 차단 및 탈퇴 정리)·`database.types.ts` 동기화.
- **Step 2 (`Gemini 4 Neon`, Fallback 1: `Claude Opus` / `Gemini 4 Hydrogen`, Fallback 2: `GitHub Copilot` — `Maker: Web Crypto·Edge Function·SW·로그아웃 해제·설정 UI & Vitest`)**:
  - 허용 파일: 신규 `src/lib/web-push-crypto.ts`, 신규 `src/lib/web-push-crypto.test.ts`, 신규 `supabase/functions/send-notifications/index.ts`, 신규 `src/lib/push-notifications.ts`, 신규 `src/lib/push-notifications.test.ts`, `public/sw.js`, `src/app/dashboard/layout.tsx`, `src/app/admin/layout.tsx`, `src/components/auth/account-deletion-status.tsx`, `src/components/settings/notification-settings-card.tsx`, `src/app/dashboard/settings/page.test.tsx`(및 필요 시 관련 레이아웃 테스트), 루트 `docs/handoff.md`, `docs/progress.md`.
  - 수용 기준: §11.3의 순수 Web Crypto VAPID/RFC 8291 암호화 모듈 및 단위 테스트(복호화 왕복·서명·상대 경로 검증), `supabase/functions/send-notifications/index.ts` 워커(404/410 구독 정리·429/5xx 3회 재시도·민감정보 로그 배제), `public/sw.js`(`chronoledger-shell-v6`, `push`/`notificationclick` 동일 출처 상대 경로 강제), `src/lib/push-notifications.ts` 및 로그아웃 3곳(`dashboard/layout`, `admin/layout`, `account-deletion-status`) 구독 해제 연동, `NotificationSettingsCard` 확장(`request_result`·`push_enabled` 토글, `[이 기기에서 푸시 알림 켜기]`, Tauri/iOS/권한 거부/미적용 DB 폴백, 등록 기기 목록 및 `[해제]`)과 Vitest 테스트 통과(`npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `git diff --check`).
- **Step 3 (`Claude Opus`, Fallback 1: `Gemini 4 Argon` / `Gemini 4 Neon` — `Reviewer & Orchestrator`)**:
  - Base $\leftrightarrow$ Target SHA 통합 정적 리뷰(`review.json`)·🐳 로컬 DB 2회 멱등 적용 및 `TESTS.sql` 검증(`test.json`)·`main` 병합·문서 마감.

### 11.5 운영 배포 설정 절차 (iteration-02 리뷰 반영, 2026-11-24)

- **적용 순서**: ① `MIGRATION_R96_WEB_PUSH.sql` 적용 → ② Edge Function 배포·시크릿 등록 → ③ DB 설정값 등록 → ④ 웹 빌드에 공개키 반영 순서로 진행함. ③을 마지막에 하면 그 전까지 웹훅은 아무 일도 하지 않음(트리거가 조용히 건너뜀).
- **VAPID 키 생성**: P-256 키쌍 1개를 만들고 공개키는 65바이트 비압축 점, 개인키는 32바이트 스칼라 `d`를 각각 base64url로 보관함(예: `npx web-push generate-vapid-keys` 출력값을 그대로 사용 가능). 개인키는 Edge Function 시크릿에만 둠.
- **Edge Function 배포**: `supabase functions deploy send-notifications --no-verify-jwt`로 배포함. DB 웹훅은 JWT 없이 `x-webhook-secret`만 보내므로, 기본값(JWT 검증)으로 배포하면 게이트웨이가 401로 막고 푸시가 전혀 나가지 않음. 함수가 시크릿을 상수 시간 비교로 직접 검증함.
- **Edge Function 시크릿**: `supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:… SEND_NOTIFICATIONS_WEBHOOK_SECRET=<임의 32자 이상>`. `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`는 Supabase가 자동 주입함.
- **DB 설정값**: SQL Editor에서 `ALTER DATABASE postgres SET app.settings.send_notifications_url = 'https://<project>.supabase.co/functions/v1/send-notifications';`와 `ALTER DATABASE postgres SET app.settings.send_notifications_secret = '<위 웹훅 시크릿>';` 실행 후 새 연결부터 적용됨. `pg_net` 확장 활성화 필요.
- **웹 빌드**: Cloudflare Pages 환경 변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`에 공개키를 넣고 다시 빌드함. 미설정이면 설정 화면이 `unconfigured` 안내를 보여 줌.
- **발송 보장 장치**: 워커는 알림을 5분간 점유(`push_claimed_at`)해 동시 호출 중복 발송을 막음. 1일 지난 알림과 사용자의 첫 기기 등록 전에 생긴 알림은 푸시하지 않고 앱 내 알림함에만 둠. `pg_cron` 잡 `chronoledger-push-retry`가 5분마다 최근 `PENDING` 알림이 있을 때만 워커를 다시 호출해 일시 오류(429/5xx)와 놓친 웹훅을 재시도함.
- **알려진 절충**: 웹훅 시크릿을 DB 설정값에 두므로 SQL을 실행할 수 있는 역할은 값을 읽을 수 있음. 워커는 이미 쌓인 알림만 보내므로 노출 영향은 제한적이며, 필요 시 Supabase Vault로 옮기는 후속 과제로 둠.
