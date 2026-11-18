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

## 8. 단계별 구현 Run 분할안

| 순서 | Run (가칭) | 범위 | DB | 담당(안) |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `r84-feedback-and-inbox` | `R84` 기타 건의 창구 + `notifications` 테이블·앱 내 알림함(벨 아이콘) + 관리자 답변·요청 승인/반려 시 알림 행 생성 | 있음 | DB GPT Codex / Claude Opus → UI Claude Sonnet → 리뷰 Claude Opus |
| 2 | `r39-daily-notifications` | `notification_settings` + `pg_cron` 일일 생성(관심 일정·예정 지출) + 설정 화면 알림 카드(토글) | 있음 | DB GPT Codex / Claude Opus → UI Claude Sonnet → 리뷰 Claude Opus |
| 3 | `r89-web-push` | VAPID·`push_subscriptions`·Edge Function `send-notifications`·`pg_net` 웹훅·SW `push` 핸들러·로그아웃 구독 해제·iOS 안내 | 있음 | Claude Opus(설계·Edge Function) → Claude Sonnet(UI) → 리뷰 Claude Opus |
| 4 | (선택) `tauri-notifications` | Tauri `plugin-notification` + 실행 중 새 알림 OS 표시 | 없음 | Claude Sonnet / GitHub Copilot |

- 1·2단계만으로 모든 환경에서 앱 내 알림이 동작함. 3단계가 앱 밖 알림을 추가함.
- 각 DB 단계는 🐳 로컬 Supabase 검증 필요(Docker Desktop).
- 3단계 첫 작업: 웹 푸시 라이브러리 선택·실제 발송 시험(Android Chrome, Windows Chrome, iOS 홈 화면 웹 앱), WebView2 실측.

## 9. 사용자 결정 필요 항목

1. **도입 순서**: 앱 내 알림함 먼저(권장, 8절 1→2→3) / 웹 푸시까지 한 번에.
2. **`R84` 답변 알림**: 앱 내 알림만으로 먼저 출시(권장) / 웹 푸시 완성 후 출시.
3. **알림 종류와 시점**: 관심 일정 시작 당일·종료 D-1, 예정 지출 D-1 — 이 3종으로 시작할지, 추가할 종류(예: 예정 지출 당일, 관심 일정 시작 D-1).
4. **일일 발송 시각**: KST 09:00(권장) / 다른 시각.
5. **Windows 데스크톱 앱**: 앱 내 알림만(권장) / 실행 중 OS 알림(`plugin-notification`)까지.
6. **알림 보관 기간**: 90일(권장) / 다른 기간.

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
