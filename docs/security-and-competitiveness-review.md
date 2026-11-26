# 보안 취약점·경쟁력 공백 분석 (2026-11-26)

> 작성: Claude Opus · 범위: `sql/SCHEMA.sql`(RLS·RPC), `src/` 인증·쓰기 경로, `public/sw.js`·`_headers`, `src-tauri/` 설정, Edge Function `send-notifications`, CI, [`competitive-analysis-pickupgg.md`](competitive-analysis-pickupgg.md) 대조.
> 전제: 개인 재무 "기록" 앱이라 금액은 실제 송금이 아닌 자기 기록임. 심각도는 이 전제로 판정함.
> 경쟁 서비스 현황은 웹 재조사 없이 2026-11-09 비교 문서 기준임.

## 0. 처리 상태

| 항목 | 상태 |
| :--- | :--- |
| S1. `public.users` 전체 공개 + 이메일 앞부분 기본 닉네임 | 구현 (`MIGRATION_USERS_PROFILE_PRIVACY.sql`, `TESTS.sql` `PRIV-01`, 설정 닉네임 20자 제한) · 운영 DB 적용·README 확인 쿼리 확인(사용자, 2026-11-26) · 🐳 로컬 `TESTS.sql` 미실행 |
| S2. 웹·데스크톱 CSP 부재, HSTS·Permissions-Policy 부재 | 구현 (`scripts/inject-csp.mjs` postbuild, `public/_headers`) · 로컬 정적 서빙 브라우저 검증 완료, 데스크톱 설치본 미검증 |
| S3. PR·`main` 품질 게이트(CI) 부재 | 구현 (`.github/workflows/ci.yml`) · GitHub 실행 미확인 |
| 아래 §1~§4 나머지 항목 | 미착수 · 후보 목록 |

## 1. 보안 (S1~S3 제외 나머지)

### 🟠 중간

- **S4. 관리자 판정 근거 이중화**
  - 정책·RPC 다수가 JWT `app_metadata.role = 'admin'` 외에 `public.users.role = 'admin'`도 인정함(R80에서 의도적으로 확정).
  - CLAUDE.md "JWT 클레임만으로 판정" 원칙과 불일치함.
  - 자기 승격 차단 트리거 `prevent_users_role_self_change`는 `current_user IN ('authenticated','anon')`일 때만 동작함 → 이후 `users`를 갱신하는 `SECURITY DEFINER` 함수가 추가되면 우회 경로가 됨.
  - 권장: 판정을 `public.is_admin()` 단일 함수로 모으고 근거를 하나로 정하는 결정 필요(📐 설계 결정 사안).
- **S5. 요청·건의 입력 횟수 무제한**
  - `feedback_requests`·`game_requests`·`schedule_requests`·`character_requests` INSERT에 개수·빈도 제한 없음 → 1인이 관리자 대기열을 채울 수 있음.
  - 권장: `user_expense_presets` 상한 트리거와 같은 방식으로 "사용자당 미처리 PENDING N건" 상한 트리거 추가.

### 🟡 낮음

- **S6. 아이콘 URL 임의 `https://` 허용**
  - `games`·`game_characters`의 `default_icon_url`이 임의 외부 호스트를 허용함(관리자 입력 한정) → 열람자 IP가 외부 호스트에 노출되고, CSP `img-src https:`를 좁힐 수 없음.
  - 권장: `R109-CLEANUP` 때 `game-assets` 공개 URL 접두사만 허용으로 축소.
- **S7. 외부 이미지 URL 직접 `fetch`**
  - `src/lib/image-resizer.ts`가 사용자 입력 URL을 직접 가져온 뒤 실패 시 `wsrv.nl` 프록시로 폴백함.
  - S2 CSP 적용 후 직접 요청은 차단되고 프록시 경로만 남음. 프록시에 원본 URL이 그대로 전달되는 구조는 유지됨.

## 2. 원장·기능 정합성

- **F1. 적립 포인트 직접 입력 상한 없음**: `_process_expense_payment_core`의 `p_custom_earned_points`에 상한이 없음 → 입력 실수 한 번에 지갑 잔액이 크게 왜곡됨. 권장: 실결제액 이하 등 상한 결정 후 RPC 검증 추가(💰 Opus 조건 ①).
- **F2. 총자산 음수 허용 불일치**: `NAVER_PAY` 충전은 총자산 부족 시 거부하나 `WALLET` + 자산 차감은 음수까지 통과함. 의도 여부 명세 확인 필요.
- **F3. 루트 경로 이중 정의**: `public/_redirects`는 `/ → /auth 302`, `src/app/page.tsx`는 `/dashboard`로 이동함. `page.tsx`는 `<main>` 안에 `<head>`를 두어 잘못된 HTML도 만듦.
- ~~F4. 닉네임 길이 UI 불일치~~: S1에서 설정 카드 20자 제한·DB 64자 상한으로 정리함.
- **F5. 데스크톱 AI 업스케일러 런타임 로드 실패 (S2 검증 중 발견)**
  - `src/lib/image-upscaler.ts`가 `ort.env.wasm.wasmPaths = "/ort/"`로 설정하면 `onnxruntime-web` 1.31.1이 `/ort/ort-wasm-simd-threaded.mjs`를 import하려 하나, `next.config.mjs`는 `.wasm`과 번들 `.mjs` 2개만 복사함 → `no available backend found`로 세션 생성 실패.
  - 실패는 `catch`에서 일반 변환으로 조용히 폴백되므로 사용자는 업스케일이 안 된 것을 모름.
  - CSP 유무와 무관하게 재현됨(CSP 없는 페이지에서도 같은 오류). `wasmPaths = { wasm: "/ort/ort-wasm-simd-threaded.wasm" }`로 주면 CSP 적용 상태에서도 세션 생성 성공함.
  - 권장: `wasmPaths`를 파일 지정 객체로 바꾸고 데스크톱에서 업스케일 결과 1회 확인.

## 3. 구조적 약점

- **A1. 운영 DB 스키마 드리프트 위험**: 마이그레이션 35개를 SQL Editor로 수동 적용하고 적용 이력 추적이 없음 → 운영 DB와 `SCHEMA.sql`의 차이를 검출할 수 없고, 클라이언트에 미적용 폴백 코드가 계속 쌓임. 권장: 적용 이력 테이블 또는 `supabase db push` 체계 도입 검토.
- **A2. 거대 페이지 컴포넌트**: `admin/page.tsx` 3,410줄, `dashboard/expenses/page.tsx` 2,452줄, `dashboard/page.tsx` 1,278줄 → 리뷰·테스트 비용이 크고 상태 관련 함정이 생기기 쉬움. 권장: 탭·섹션 단위 분리(기능 변경 없는 리팩터링 Run).
- **A3. 운영 오류 수집 부재**: Sentry 등 클라이언트 오류 수집이 없고, `pg_cron` 실패는 `RAISE WARNING` 로그에만 남음 → 실제 사용자 오류가 보이지 않음.
- **A4. 기타**: `package.json` `name`이 `temp-app`으로 남아 있음. 일정 데이터가 운영자 1인 큐레이션에 의존해 운영 공백 시 데이터가 낡는 위험이 있음.

## 4. 경쟁력 보강 후보

> 기존 비교 문서 개선 후보(R32~R39, R85, R96)는 대부분 완료됨. 아래는 그 이후 남은 공백임.
> `R90`·`R104`는 사용자 보류 결정 항목이라 후보에서 제외함.

### 우선 높음

| ID(가칭) | 내용 | 근거 |
| :--- | :--- | :--- |
| C1 | **공개 유입 경로(SEO)**: 게임별 공개 일정 페이지를 빌드 시점에 생성, `robots.txt`·sitemap·OG 메타 추가 | 정적 export + 클라이언트 렌더링이라 검색엔진에는 빈 화면으로 보임. 게스트 열람(R41~R44)이 있어 연결 비용 낮음 |
| C2 | **데이터 내보내기·백업(CSV/JSON)** | 가계부 앱의 기본 신뢰 요소임. 데이터 이동 가능성이 가입 부담을 낮춤 |
| C3 | **외부 캘린더 구독(ICS 피드)**: 관심 일정·예정 지출을 Google·Apple 캘린더로 구독 | 사용자별 토큰 Edge Function 하나로 구현 가능. 비용 대비 체감 효과가 큼 |

### 우선 중간

| ID(가칭) | 내용 | 근거 |
| :--- | :--- | :--- |
| C4 | 월 과금 리포트·캐릭터 프리셋 이미지 공유 카드 | 공유될 때마다 서비스가 노출되는 효과 |
| C5 | 과금 절제 기능 강화: 게임별 월 한도, 월말 리포트 알림, 전월 대비 증감 | 경쟁 서비스에 없는 지출 데이터 활용 |
| C6 | CSV 가져오기(스토어 결제 내역 등) | 가장 큰 이탈 요인인 수동 입력 부담 완화 |

### 우선 낮음·장기

- C7. Android 네이티브 빌드(Tauri v2 모바일): iOS·Android PWA 푸시 제약을 회피할 수 있음.
- C8. 영어 지원: 글로벌 서비스 게임 사용자층으로 확장 가능.
- C9. 카탈로그 기여자 신뢰도·보상 표시: 1인 큐레이션 부담을 사용자 제보 흐름으로 분산.
- C10. 익명 집계 통계(예: 픽업별 평균 과금): 개인정보 설계가 먼저 필요함.

## 5. 권장 후속 순서

1. F5 업스케일러 로드 수정(작은 단일 파일 수정), S5 요청 상한 트리거 + F1 적립 상한 (SQL·금전 → Opus)
2. A3 오류 수집 도입, F3 루트 경로 정리
3. C2 데이터 내보내기 → C3 ICS 피드 → C1 SEO·공개 페이지
4. S4 관리자 판정 단일화 설계 결정, A1 마이그레이션 이력 체계
5. A2 거대 페이지 분리 리팩터링
