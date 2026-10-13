# 변경 이력

## 2026-10-14 (지출 결제일/예정일 수정 결함 및 버전 종료일 강제 고정 버그 해결)

- **예정 지출 등록/수정 시 `target_date` 버전 종료일(`end_date`) 강제 고정 버그 해결 (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 지출 등록 및 수정 시 `target_date: schedule?.end_date ?? input.paymentDate`로 하드코딩되어 있어, 버전 일정이 연결된 게임의 경우 사용자가 지정한 결제일/예정일(예: 전반부 픽업 시작일)이 완전히 무시되고 버전 종료일(예: 3주 뒤)로 강제 저장되던 문제 해결.
  - 조치: `target_date: input.paymentDate`로 정상화하여 사용자가 입력한 날짜 그대로 예정일/결제일이 지정되도록 수정. 픽업 기간과 지출 예정일이 불일치하던 데이터 모순을 원천 해소.
  - 라벨 개선: 모드에 따라 `지출 예정일` / `결제일` / `결제일 / 예정일`로 명확히 분기 표시.
- **예정 지출 결제 확정 시 카테고리 및 게임 ID 하드코딩 리셋 방어 (`src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 원인: 예정 지출의 [확정] 결제 진행 시 `ExpenseModal` 내부에서 카테고리가 무조건 `"게임"`으로 하드코딩되고 `gameId`가 `""`로 초기화되어, 등록해 둔 연관 게임 및 카테고리가 유실되던 현상 해소.
  - 조치: `PlannedExpenseInput` 인터페이스에 `category`, `game_id`, `target_date`를 포함하고, 결제 모달 오픈 시 원본 예정 지출의 카테고리, 게임 ID, 지출일을 온전히 보존·복원하도록 개선.
- **사이드바 지출 결제수단 영문 코드(`NAVER_PAY` 등) 한글 시맨틱 라벨 표기 (`src/components/calendar/hero-sidebar.tsx`)**:
  - 원인: 대시보드 히어로 사이드바 지출 목록에서 네이버페이 결제건이 `NAVER_PAY` 영문 코드로 그대로 노출되던 미비점 해소.
  - 조치: `METHOD_LABELS` 객체를 도입하여 `네이버페이`, `내 지갑` 등으로 한글 정규화 표시.
- **확정 지출(`CONFIRMED`) 결제일(`target_date`) 수정 지원 (`src/components/expense/expense-detail-modal.tsx`, `md/MIGRATION_EXPENSE_EDIT.sql`, `md/SCHEMA.sql`)**:
  - 기존에는 결제 완료 건의 [정보 수정]에서 제목, 카테고리, 메모만 수정 가능하여 결제일을 변경할 수 없던 제약 해소.
  - `update_confirmed_expense_metadata` RPC에 `p_target_date DATE DEFAULT NULL` 파라미터 및 미래 날짜 방어 가드 추가.
  - `ExpenseDetailModal`에 결제일(`editDate`) 입력 폼을 신설하여 결제 완료된 지출의 날짜도 자유롭게 보정 가능하도록 개선.
- **특정일 지정 지출 원칙 확립 (`start_date = target_date = end_date = input.paymentDate`) (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 지출 등록 시 게임이 연결되면 게임 버전 일정의 시작일/종료일이 지출의 `start_date`, `end_date`로 복사되어, 단일 지출임에도 6주짜리 기간형 지출처럼 취급되던 문제 원천 해소.
  - 조치: 특정일 지정 지출은 `start_date = target_date = end_date = input.paymentDate`로 단일일 일치화. 게임 버전 일정 및 픽업 일정은 각각 `schedule_id`와 `pickup_schedule_id` 외래키로만 연결되도록 분리.
  - 예정 지출 수정 모드(`EDIT_PLAN`)에서도 버전 변경 시 `schedule_id`가 올바르게 업데이트되도록 보강.
- **예산 귀속 및 만료 판정 기준을 지출 예정일(`target_date`)로 통일 (`src/lib/budget-calculations.ts`)**:
  - 원인: `getBudgetDate`에서 `expense.end_date`를 우선 반환하여, 10월 14일 픽업 예정 지출이 11월 19일 버전 종료일 예산으로 넘어가고 기한 지난 팝업도 11월 19일까지 뜨지 않던 왜곡 해소.
  - 조치: 사용자가 지정한 `target_date`를 예산 배정 및 만료 판정 기준으로 완전 일원화.
- **지출 목록 정렬 및 과거 기록 분리 기준일 정상화 (`src/app/dashboard/expenses/page.tsx`)**:
  - `getExpenseEffectiveDate`가 버전 `end_date` 대신 `target_date`를 반환하도록 수정하여 테이블 정렬 순서 및 7일 경과 과거 기록 분리가 실제 지출 예정일과 일치하도록 개선.
- **테스트 무결점 검증**:
  - 예정 지출 등록/수정 시 `start_date`, `end_date`가 `target_date`와 동일하게 저장되는지 검증 (`src/components/expense/expense-modal.test.tsx`).
  - `target_date` 기준 월 귀속 단위 테스트 갱신 (`src/lib/budget-calculations.test.ts`).
  - Vitest 39개 파일 206개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-14 (지출 등록 모달 항목명 원복 버그 수정 및 Recharts 차트 Y축 라이트 모드 가독성 개선)

- **지출 등록 모달(`ExpenseModal`) 항목명 자동 리셋 및 원복 버그 해결 (`src/components/expense/expense-modal.tsx`)**:
  - 원인: 일정 연동 `useEffect`의 의존성 배열에 `title`이 포함되어 있어, 사용자가 항목명을 수정하려고 전체 삭제하거나 백스페이스를 누를 때(`!title.trim()` 조건 충족) 이펙트가 재실행되며 Supabase 비동기 조회 후 게임 버전 일정 제목(`${game.name} ${matched.title}`)으로 강제 덮어쓰기되던 결함 해소.
  - 조치:
    - `title`을 이펙트 의존성 배열에서 제외하고 `titleRef`로 최신 상태를 참조하도록 분리.
    - `prevGameIdRef`를 신설하여 사용자가 게임 셀렉트박스를 직접 변경했을 때(`prevGameIdRef.current !== gameId`)에만 1회 기본값 제안이 동작하도록 제어.
    - 예정 지출 수정 모드(`isEditMode`) 및 예정 지출 결제 모드(`isPlannedPayment`)에서는 일정에 의한 항목명 덮어쓰기를 원천 방어하여 사용자의 수정 주도권 보장.
    - 모달 오픈 시 `editingExpense`와 `plannedExpense`의 ID를 정규화(`?? null`)하여 부모 리렌더링에 따른 폼 무한 리셋 방어.
  - 검증: 사용자가 항목명을 지우거나 새로 입력해도 원래 텍스트로 되돌아가지 않고 온전히 유지됨을 검증하는 단위 테스트 케이스 추가 (`src/components/expense/expense-modal.test.tsx`).
- **지출 분석 차트 Y축 카테고리 레이블 가독성 수정 (`src/app/dashboard/expenses/page.tsx`)**:
  - 원인: 픽업 과금 막대 차트의 `YAxis` 컴포넌트에 `tick={{ fill: "#F5F7FA" }}`가 하드코딩되어 라이트 테마의 흰색 배경 위에서 "일반" 등의 텍스트가 완전히 투명해져 보이지 않던 문제 해결.
  - 조치: `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip` 컴포넌트에 하드코딩된 HEX 컬러 대신 시맨틱 CSS 변수 `rgb(var(--text-primary))`, `rgb(var(--text-secondary))`, `rgb(var(--border))`, `rgb(var(--surface))`를 적용하여 라이트/다크 테마 모두에서 명확한 대비 확보.
- **라이트 테마 배경색 톤 개선 (테크니컬 슬레이트 쿨 그레이 도입, `src/app/globals.css`)**:
  - 기존의 백색에 가까웠던 라이트 테마 배경(`--bg`: `rgb(245, 247, 250)`)을 눈이 편안하고 차분한 테크니컬 슬레이트 쿨 그레이(`rgb(236, 240, 245)`, `#ECF0F5`)로 미세 톤다운.
  - 서브 표면(`--surface-2`: `rgb(243, 246, 250)`) 및 테두리(`--border`: `rgb(214, 221, 230)`)를 슬레이트 톤에 맞추어 재정렬.
  - 결과: 순백색 메인 카드(`--surface: #FFFFFF`)와의 명암 대비(Elevation)가 극대화되어 카드가 또렷하게 분리되고, 장시간 화면을 보아도 눈부심이 없는 20대 테크/게이밍 맞춤형 무드 연출.
- **테스트 및 정적 빌드 무결점 검증**:
  - Vitest 39개 파일 203개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (라이트 테마 전수 검증 및 UI 가독성·대비 전면 최적화)

- **라이트/다크 테마 시맨틱 컬러 토큰 전면 정합화**:
  - `tailwind.config.ts`의 `textColor: { white: token("text-primary") }` 설정으로 인해 유색 배경 버튼(`bg-primary`, `bg-emerald-600`, `bg-danger` 등) 위에 검정색 텍스트가 렌더링되던 시각적 결함을 해결하기 위해, 모든 유색 버튼 텍스트를 `text-primary-foreground`로 표준화.
  - 모달 대화상자(`expense-modal.tsx`, `expense-detail-modal.tsx`, `overdue-planned-modal.tsx`) 내 하드코딩된 다크 전용 클래스(`bg-gray-800`, `bg-gray-900`, `border-gray-700`, `text-white`)를 시맨틱 디자인 토큰(`border-line bg-surface text-content`, `bg-surface-2`)으로 전면 전환하여 라이트 테마에서 깔끔하고 높은 대비의 모달 UI 제공.
- **연한 파스텔 하드코딩 색상 및 WCAG 대비 취약 요소 제거**:
  - **콘텐츠 배너 (`schedule-banner.tsx`, `hero-sidebar.tsx`, `games/page.tsx`, `admin/page.tsx`)**: 흰색/연회색 타일 위에서 흐려지던 `text-purple-300`을 `text-purple-700 dark:text-purple-300` 및 시맨틱 배경으로 개선.
  - **픽업 통계 순위 뱃지 (`expenses/page.tsx`)**: 라이트 테마에서 글자가 사라지던 2위 은색 뱃지의 `text-slate-300`을 `text-slate-700 dark:text-slate-300`으로 수정하고, 1위(`text-amber-600 dark:text-amber-400`), 3위(`text-amber-700 dark:text-amber-500`)의 명도 대비 확보.
  - **지출 상태 뱃지 (`expenses/page.tsx`)**: 테이블 및 모바일 카드의 `CONFIRMED`/`PLANNED`/`CANCELLED` 뱃지에 밝은 파스텔 하드코딩 색상(`text-emerald-400`, `text-amber-400`, `text-red-400`) 대신 시맨틱 클래스 `text-success`, `text-warning`, `text-danger` 적용.
  - **스토어 이벤트 및 네이버페이 프리뷰 박스 (`expense-modal.tsx`)**: 어두운 인디고/에메랄드/로즈 박스를 `bg-primary/10 border-primary/30`, `bg-success/10 border-success/30`, `bg-danger/10 border-danger/30` 및 시맨틱 텍스트 토큰으로 일원화.
  - **인풋 및 라벨 폼 컴포넌트**: `selectClassName`, `inputClassName`, `labelClassName`을 `border-line-control bg-surface-2 text-content`, `text-content-secondary`로 표준화.
  - **상단바 로고 (`topbar.tsx`)**: 라이트 모드에서 번짐과 거친 테두리를 유발하던 `WebkitTextStroke: "1px black"` 인라인 스타일 제거.
- **단위 테스트 및 빌드 무결점 검증**:
  - Vitest 39개 파일 202개 테스트 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (스토어 이벤트 적립률/포인트 수동 수정 및 지출 내역 분리 수정·취소 내역 필터링 구현)

- **스토어별 이벤트 포인트 적립 및 포인트 수동 수정 (`src/lib/payment-calculations.ts`, `src/components/expense/expense-modal.tsx`)**:
  - 프리셋 버튼을 배제하고 `부스트 배율: [ n ] 배`, `페이백률: [ n ] %` 숫자 입력란만 제공하여 원하는 값을 직접 기입하도록 UI 간소화.
  - 구글 플레이 부스트 n배(`기본 적립률 × n`) 및 갤럭시 스토어 n% 페이백(`실결제액 × n%`) 실효 적립률 및 포인트 계산 로직 구현 (`calculateStoreEventEarn`).
  - 자동 계산된 예상 적립 포인트를 사용자가 직접 수정할 수 있는 수동 수정 필드 및 `[자동 계산값 복원]` 버튼 제공.
  - 결제 시 `[구글 부스트: n배]`, `[갤스 페이백: n%]` 이벤트 태그가 메모에 보존되도록 자동 병합 처리 (`mergeEventMemo`).
- **확정 지출(`CONFIRMED`) 비회계 메타데이터 분리 수정 및 원장 불변성 보호 (`src/components/expense/expense-detail-modal.tsx`, `md/MIGRATION_EXPENSE_EDIT.sql`)**:
  - 회계 무결성 보장을 위해 결제 완료된 지출은 금액 및 결제수단 수정을 DB 차원에서 원천 차단.
  - 비회계 메타데이터(항목명, 카테고리, 메모) 전용 보안 정의자 RPC `update_confirmed_expense_metadata` 구현 및 연동.
  - 지출 상세 모달 내 `[정보 수정]` 모드를 신설하여 항목명, 카테고리, 메모를 즉시 수정 및 저장 가능.
- **예정 지출(`PLANNED`) 전면 정보 수정 지원 (`src/components/expense/expense-modal.tsx`)**:
  - 미결제 상태인 예정 지출에 대해 항목명, 정가, 날짜, 카테고리, 결제수단 등 모든 필드를 수정할 수 있는 `editingExpense` 모드 지원.
- **가계부 목록 취소 내역 숨기기 토글 필터 (`src/app/dashboard/expenses/page.tsx`)**:
  - 취소/환불로 쌓이는 내역을 화면에서 가려주는 `[✓] 취소 내역 숨기기` 토글 체크박스 신설 (기본값: 체크됨).
  - 지출 목록에서 `PLANNED` 지출의 `[수정]` 버튼 및 `CONFIRMED` 지출의 `[상세 / 수정]` 액션 버튼 신설.
- **DB RPC 마이그레이션 (`md/MIGRATION_STORE_EVENT_EARN.sql`, `md/MIGRATION_EXPENSE_EDIT.sql`, `md/SCHEMA.sql`)**:
  - `process_expense_payment`에 `p_custom_earned_points` 및 `p_memo` 지원 추가.
  - `update_confirmed_expense_metadata` RPC 함수 및 실행 권한 등록.
- **단위 테스트 및 빌드 검증**:
  - 단위 테스트 39개 파일 202개 전건 100% 통과 (`vitest run`).
  - Next.js 14 정적 export 빌드 성공 (`npm run build`).

## 2026-10-13 (결제 수단 / 결제 플랫폼 / 할인 수단 정합성 리팩토링 및 0원 결제·복합 결제 지원)

- **결제 수단(Payment Method)과 결제 플랫폼(Platform) 및 할인 수단(Discount)의 명확한 역할 분리 (`src/lib/payment-calculations.ts`)**:
  - 실제 자산이 빠져나가는 실결제 수단(`PaymentMethod`)을 **'내 지갑'(`WALLET`, 메인 계좌 자산)**과 **'네이버페이'(`NAVER_PAY`, 머니 및 부족 시 자동 충전)** 2대로 명확히 정제.
  - 기존에 결제 수단으로 혼용되던 **'Google Play'**와 **'Galaxy Store'**를 결제가 발생하는 **결제 플랫폼(스토어)** 및 쿠폰/포인트 **할인 수단**으로 재정립.
  - 스토어 포인트 적립(`estimateEarnedPoints`) 기준을 결제 수단이 아닌 **결제 플랫폼(`PaymentPlatform`)** 기준으로 전면 수정하여, 실결제 수단으로 '내 지갑'이나 '네이버페이'를 사용하더라도 스토어 포인트가 공식 등급별 비율에 따라 정상 적립되도록 개선.
- **지출 등록 모달 2대 실결제 수단 통합 및 스토어 포인트 복합 결제 허용 (`src/components/expense/expense-modal.tsx`)**:
  - 결제 플랫폼(Google Play, Galaxy Store, 기타)과 무관하게 실제 결제 수단은 항상 **'내 지갑'** 또는 **'네이버페이'** 중 선택하도록 UI 일원화.
  - 네이버페이 결제 시 스토어 포인트(`usedPoints`) 비활성화 제약을 해제하여, 구글 플레이/갤럭시 스토어에서 포인트를 사용하고 남은 차액에 대해서만 네이버페이 머니 차감 및 10,000원 단위 자동 충전이 동작하도록 지원.
  - 스토어 포인트나 쿠폰으로 100% 전액 차감(실결제액 = 0원) 시, 자산 차감 및 네이버페이 충전액이 0원으로 안전하게 결제 확정되도록 안내 및 계산 로직 보강.
- **DB RPC 및 마이그레이션 스크립트 구축 (`md/MIGRATION_PAYMENT_REFINEMENT.sql`, `md/SCHEMA.sql`)**:
  - `process_expense_payment`: `p_payment_method`를 `WALLET`과 `NAVER_PAY`로 검증하며, 구버전 데이터는 실결제 수단 `WALLET`과 플랫폼 스토어로 안전하게 하위 호환 매핑. 네이버페이+스토어 포인트 복합 결제 에러 제약 해제 및 스토어 플랫폼 기준 포인트 적립 계산 로직 적용.
  - `refund_expense_payment`: 실결제액이 0원인 건의 결제 취소 시 불필요한 원장 기록 및 자산 복원을 방지하는 안전 가드 추가.
  - 기존 `expenses` 테이블 내 구버전 `GOOGLE_PLAY`/`GALAXY_STORE` 결제수단 데이터를 `point_platform` 보존 및 `payment_method = 'WALLET'`으로 정제하는 SQL 마이그레이션 제공.
- **지출 상세 모달 및 목록 표기 개선 (`src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`)**:
  - 결제 상세 화면에 '결제 플랫폼'(Google Play / Galaxy Store) 항목을 신설하여 결제수단과 스토어를 분리 표시.
- **단위 테스트 및 빌드 검증**:
  - 플랫폼-수단 분리 테스트, 네이버페이와 스토어 포인트 복합 결제 테스트, 0원 결제 적립 방지 테스트 등 39개 파일 192개 테스트 전체 100% 통과 및 Next.js 14 정적 export 빌드 성공.

## 2026-10-13 (캘린더 타일 배너 하단 정렬 및 상향 적층 구조 개선)

- **달력 타일 내 배너 하단 고정 및 상향 적층 레이아웃 적용 (`src/components/calendar/desktop-calendar.tsx`)**:
  - 타일 상단 우측에 게임 아이콘이 다수(2~3개) 위치할 때 상단 행 높이로 인해 아래쪽 배너(`CONTENTS` 등)가 잘리던 현상 해결.
  - 배너 컨테이너를 타일 하단 기준(`absolute bottom-1.5 left-1.5`)에 앵커링하여 최하단 배너가 타일 경계를 벗어나지 않도록 보장.
  - 기존 표시 우선순위 규칙(`VERSION` > `PICKUP` > `CONTENTS`)을 유지하면서, 신규 배너 추가 시 하단에 삽입되고 기존 배너가 위로 상향 적층(Lift)되는 구조 확립.
- **단위 테스트 보강 및 검증 (`src/components/calendar/desktop-calendar.test.tsx`)**:
  - 배너 컨테이너의 하단 앵커링 클래스(`absolute bottom-1.5 left-1.5`) 검증 테스트 추가 및 전체 테스트 191개 통과.

## 2026-10-13 (Cloudflare Pages 호스팅 환경 구축 및 계정 탈퇴 Supabase pg_cron / RPC 완전 이관)

- **Cloudflare Pages 정적 호스팅 자산 구축 (`.nvmrc`, `public/_headers`, `public/_redirects`)**:
  - Node.js 20 LTS 명시(`.nvmrc`), Cloudflare Pages 정적 캐시 최적화 및 보안 헤더(`public/_headers`) 설정.
- **Supabase Database pg_cron 탈퇴 워커 및 원자적 함수 (`md/MIGRATION_PG_CRON.sql`, `md/SCHEMA.sql`)**:
  - `purge_expired_account_deletion_requests` 함수를 통해 `storage.objects`(user-icons 버킷), 10개 개인 데이터 테이블, `auth.users`를 원자적으로 일괄 영구 삭제하는 로직 구현.
  - 5분 주기 `cron.schedule` 자동 등록 스크립트 작성으로 외부 서버리스 Cron 종속성 제거.
- **계정 탈퇴 API의 Supabase RPC 완전 통합 (`src/lib/account-deletion.ts`, `src/lib/account-deletion.test.ts`, `md/SCHEMA.sql`)**:
  - Netlify Functions 호출(`fetch`)을 제거하고 `request_account_deletion`, `get_account_deletion_status` RPC를 Supabase JS 클라이언트로 직접 호출하도록 리팩토링.
  - 불투명 SHA-256 토큰 생성 및 검증을 DB 내부에서 원자적으로 처리.
- **단위 테스트 및 정적 빌드 검증**:
  - 전체 단위 테스트 39개 파일, 191개 테스트 100% PASS (`vitest run`).
  - Next.js 14 정적 15개 페이지 export 빌드 성공 (`npm run build`).

## 2026-10-13 (지출 등록 모달 픽업 선택 필드 비활성화 및 결제일 기준 자동 연계 구현)

- **픽업 선택 필드 비활성화 및 자동 매핑 로직 적용 (`src/components/expense/expense-modal.tsx`)**:
  - `expense-pickup` select 필드를 비활성화(`disabled`, `opacity-60 cursor-not-allowed`)하여 수동 조작 방지.
  - 결제일(`paymentDate`)이 픽업 기간 내인 경우:
    - 1개 진행 중: 해당 픽업 배너로 자동 연계(`pickup_schedule_id` 저장).
    - 2개 이상 진행 중: 모든 배너에 자동 동시 연계(`[PICKUPS:id1,id2,...]` 메타데이터 바인딩 및 1건 1x 회계 처리).
  - 결제일이 픽업 기간 외인 경우:
    - '진행 중인 픽업 없음 (픽업 외 지출)'로 자동 매핑(`pickup_schedule_id = null`, `memo = null`).
- **테스트 추가 및 검증 (`src/components/expense/expense-modal.test.tsx`)**:
  - 필드 disabled 상태, 단일 픽업 자동 연계, 복수 픽업 동시 연계, 픽업 외 지출 자동 매핑 4개 케이스 전체 100% 통과 (총 190개 테스트 통과).

## 2026-10-13 (웹 배포 플랫폼 비교 분석 및 아키텍처 제안 갱신: Cloudflare Pages + Supabase pg_cron)

- **Netlify 무료 플랜 리소스 한계 분석 및 제안서 전면 리팩토링 (`docs/Netlify_Web_Architecture_Proposal.md`, `docs/to-do.md`)**:
  - Netlify 무료 티어의 월간 빌드 시간(300분) 및 대역폭(100GB) 소진 시 신규 배포 차단 및 사이트 자동 일시 정지(Hard Limit) 리스크 문서화.
  - 상단 요약과 하단 구버전 내용 간 불일치를 전면 해소하고, 문서를 **Cloudflare Pages + Supabase pg_cron** 중심으로 완전 재구성.
  - 구버전 2026-10-06 ~ 10-07 초기 이력은 부록(Archived History)으로 분리 격리.
  - 5분 주기 백그라운드 탈퇴 워커(`account-deletion-worker`)의 웹 호스팅 종속성을 해결하기 위한 구체적 5단계 이관 액션 플랜 수립.
- **배포 플랫폼 적합도 비교 평가 및 권장 아키텍처 수립**:
  - 프로젝트 특성(Next.js 14 `output: 'export'` 정적 빌드 + Supabase 백엔드)에 맞춰 4개 플랫폼 비교 평가:
    1. **Cloudflare Pages + Workers (95점, 최우선 권장)**: 대역폭 무제한 무료, 월 500회 빌드, 1분 단위 스케줄러 지원.
    2. **Vercel (88점)**: 월 6,000분 빌드, Next.js 최고 궁합, 단 무료 플랜 Cron 일 1회 제한.
    3. **Netlify (80점, 현행 유지)**: 세팅 불필요하나 월 300분/100GB 초과 시 사이트 중단 위험.
    4. **GitHub Pages (75점)**: 무료 정적 호스팅 우수하나 서버리스/스케줄러 미지원.
- **정적 웹과 백그라운드 스케줄러 분리 아키텍처 확립**:
  - 웹 프론트엔드(`out/`): **Cloudflare Pages**로 호스팅하여 트래픽/빌드 비용 걱정 없이 고가용성 유지.
  - 백그라운드 5분 주기 워커: Netlify Functions 대신 **Supabase Database 내부 `pg_cron`** 또는 **Supabase Edge Function**으로 분리 이관.
  - 향후 이관 및 검증 로드맵을 `docs/to-do.md` 구현 체크리스트에 반영.

## 2026-10-13 (소비 페이지 차트 시각적 품질 강화 및 호버 하이라이트 인터랙션 구현)

- **카테고리 도넛 차트 색상 대비 강화 및 호버 연동 (`src/app/dashboard/expenses/page.tsx`)**:
  - `CATEGORY_COLORS`에서 '게임'(`#6366F1`, 인디고)과 '정기 구독'(`#10B981`, 에메랄드)을 뚜렷하게 분리된 고대비 색상으로 개편.
  - 도넛 슬라이스 기본 테두리(`stroke="#171A21"`) 부여.
  - 마우스 호버 시 깔끔한 흰색 솔리드 테두리(`stroke="#FFFFFF"`, 두께 3px) 하이라이트 적용 (불필요한 드롭 섀도우 번짐 제거).
  - 하단 범례 카드와 원 그래프 슬라이스 간 마우스 호버 시 양방향 포커스 하이라이트 연동.
- **막대 그래프 축선(X/Y Axis Line), 눈금선 및 CartesianGrid 격자 복원, 배경 하이라이트 제거**:
  - 월별 소비 추이: X축/Y축 기준 축선(`stroke="#374151"`) 복원, 수평 점선 격자(`CartesianGrid vertical={false}`) 추가, 막대 테두리 및 호버 시 솔리드 흰색 외곽선 강조.
  - 게임 픽업별 과금 분석: 가로 막대 X축/Y축 기준선 복원, 수직 점선 격자(`CartesianGrid horizontal={false}`) 추가, 막대 테두리 및 우측 순위 카드와의 양방향 호버 하이라이트 연동.
  - 막대 그래프 호버 시 배경 영역 전체가 반투명 사각형으로 하이라이트되던 툴팁 커서(`Tooltip cursor={false}`) 및 드롭 섀도우 글로우를 완전히 제거하여 막대 외곽선만 또렷하게 표시.
- **테스트 및 검증**:
  - 단위 테스트 11건 100% 통과 (`vitest run src/app/dashboard/expenses/page.test.tsx`), TypeScript 및 Next.js 14 프로덕션 빌드 무결성 확인.

## 2026-10-13 (관리자 요청 페이지 직접 게임 추가 기능 및 [게임 등록] 버튼 구현)

- **관리자 직접 게임 추가 카드 UI (`src/app/admin/requests/page.tsx`)**:
  - `/admin/requests`의 "게임 요청" 탭 상단에 관리자가 유저 건의 승인 없이 즉시 새 게임을 마스터 카탈로그에 등록할 수 있는 카드 폼 추가.
  - 게임 이름, 기본 아이콘 URL 입력란 및 `[게임 등록]` 버튼 구현.
  - URL 유효성 검사, 필수 입력값 검증, 중복 등록 방어 에러 처리 및 성공 피드백 표시.
- **`admin_create_game` 보안 정의자 RPC 및 DB 스키마 갱신 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 관리자 권한 검증 및 게임 카탈로그 원자적 등록 함수 `admin_create_game` 추가 및 권한 부여.
- **단위 테스트 추가 (`src/app/admin/requests/page.test.tsx`)**:
  - 관리자가 입력란을 통해 게임 이름과 아이콘 URL을 입력하고 `[게임 등록]` 버튼을 클릭해 등록을 완료하는 플로우 검증 (총 163개 테스트 100% 통과).

## 2026-10-13 (정기 구독 템플릿 수정/삭제 기능 구현 및 카드 액션 버튼 레이아웃 개편)

- **정기 구독 템플릿 수정 기능 (`src/components/subscription/subscription-modal.tsx`)**:
  - `SubscriptionModal`에 `editingTemplate` prop 지원 추가.
  - 수정 시 제목, 카테고리, 연관 게임, 결제 주기 유형, 결제일/누적일수, 금액 등 기존 설정을 폼에 자동 바인딩.
  - 수정 완료 시 `subscription_templates.update()` 호출 및 미결제(`PLANNED`) 예정 회차의 기본 정보 자동 동기화.
- **정기 구독 템플릿 삭제 및 안전 정리 RPC 구현 (`src/app/dashboard/expenses/page.tsx`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 보안 정의자 RPC `delete_subscription_template(p_template_id UUID)` 및 RLS `Delete own templates` 정책 생성.
  - 템플릿 삭제 시 미래 미결제(`PLANNED`) 회차만 정리하고, 이미 결제된(`CONFIRMED`) 과거 지출 내역은 `template_id ON DELETE SET NULL`을 통해 안전하게 보존.
  - 삭제 전 확인 다이얼로그(`<Dialog>`)를 통해 안전한 삭제 절차 안내.
- **구독 카드 액션 버튼 레이아웃 개편 (`src/app/dashboard/expenses/page.tsx`)**:
  - 좌측 정렬: `[수정]`, `[남은 날짜 수정]` (누적 충전형일 때만 노출).
  - 우측 정렬: `[구독 중지/재개]`, `[휴지통 모양 아이콘]`(삭제).
- **단위 테스트 및 빌드 검증 (`src/components/subscription/subscription-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
  - 템플릿 수정 모달 데이터 로드/업데이트 및 삭제 다이얼로그/RPC 호출 검증 테스트 추가 (Vitest 162개 테스트 전체 PASS, Next.js 14 정적 빌드 통과).

## 2026-10-13 (소비 페이지 전체 지출 내역 10개 단위 페이지네이션 및 누적 충전형 주기 커스텀 지원)

- **전체 지출 내역 10개 단위 페이지네이션 구현 (`src/app/dashboard/expenses/page.tsx`)**:
  - 기존에 등록된 모든 지출 내역을 한 화면에 무제한 나열하던 방식에서 10개 단위(`EXPENSES_PER_PAGE = 10`) 페이지 분할 렌더링으로 개선.
  - 데스크톱 테이블 뷰와 모바일 카드 뷰 모두 현재 페이지 데이터(`paginatedExpenses`)만 렌더링하여 렌더링 성능 최적화 및 스크롤 피로도 해소.
  - 하단에 총 건수 및 현재 표시 범위(`총 N건 중 A - B건 표시 (페이지 X / Y)`), 이전/다음 버튼(`ChevronLeft`, `ChevronRight`), 스마트 번호 네비게이션(7페이지 초과 시 생략 부호 `...` 지원) UI 추가.
  - 내역 변경/삭제 시 페이지 범위를 초과하지 않도록 자동 클램핑 방어 로직 적용.
- **누적 충전형 정기 구독 결제 주기(`interval_days`) 커스텀 기능 (`src/components/subscription/subscription-modal.tsx`, `src/lib/subscription-sync.ts`)**:
  - '30일 누적 충전형'에서 '누적 충전형'으로 명칭 통일 및 결제 주기 일수(기본값 30일) 자유 입력 지원.
  - 다음 회차 자동 생성 시 템플릿의 `interval_days`만큼 목표일 누적 연장 처리.
  - DB 스키마 컬럼 미존재 시에도 무중단 동작하도록 프론트엔드 폴백 처리.
- **단위 테스트 보강 (`src/app/dashboard/expenses/page.test.tsx`, `src/lib/subscription-sync.test.ts`, `src/components/subscription/subscription-modal.test.tsx`)**:
  - 25개 지출 데이터 기준 10개 단위 페이지 분할 및 2페이지 이동/이전 복귀 검증 테스트 추가 (총 160개 테스트 100% 통과).

## 2026-10-13 (게임 버전 패스형/정기 구독 예정 지출 생성 실패 수정 및 버전 시작일 바인딩 개선)

- **PostgREST 부분 유니크 인덱스 충돌 에러(42P10) 해결 및 `insert` 전환 (`src/lib/subscription-sync.ts`)**:
  - `expenses` 테이블의 부분 유니크 인덱스(`idx_expenses_template_schedule_id`, `idx_expenses_template_billing_cycle`) 환경에서 PostgREST `.upsert(..., { onConflict })` 호출 시 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 오류로 저장이 차단되던 문제를 해결.
  - 클라이언트 인메모리 사전 중복 필터링 후 안전한 `.insert()` 호출 방식으로 전환하고 중복 키(`23505`) 예외를 무해하게 방어.
- **버전 패스형 결제 목표일(`target_date`) 시작일 바인딩 (`src/lib/subscription-sync.ts`, `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - 기존에 버전 종료일(`s.end_date`)로 지정되던 `target_date`를 실제 패스 오픈 및 결제 시점인 버전 시작일(`s.start_date`)로 수정하여, 홈 대시보드 버전 시작일(예: 10월 15일) 클릭 시 지출 내역에 즉시 노출되도록 개선.
  - 관리자 일정 변경 트리거(`sync_version_expenses_trigger`)에서도 `VERSION` 일정 변경 시 `target_date = NEW.start_date`로 자동 동기화되도록 SQL 갱신.
- **소비 페이지 방문 시 지연 구독 자동 생성 연동 (`src/app/dashboard/expenses/page.tsx`)**:
  - `loadExpenses()` 실행 시 온라인 상태일 경우 `ensureMonthlySubscriptionExpenses`를 선행 호출하여, 기존에 생성되었으나 회차가 누락되었던 정기 구독 템플릿의 예정 지출이 페이지 진입 즉시 자동 보정 생성되도록 개선.
- **단위 테스트 무결성 갱신 (`src/lib/subscription-sync.test.ts`, `src/app/dashboard/expenses/page.test.tsx`)**:
  - `MONTHLY_DAY` 및 `VERSION_PASS` 테스트 mock을 `insert` 및 버전 시작일(`target_date: "2026-10-09"`) 기준으로 갱신 (Vitest 37개 파일 / 158개 테스트 100% PASS, Next.js 빌드 성공).


## 2026-10-13 (Alt+Tab/창 전환 시 모달 입력값 초기화 방지 및 백그라운드 재조회 스켈레톤 언마운트 차단)

- **소비 및 게임 페이지 백그라운드 재조회 시 스켈레톤 언마운트 차단 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`)**:
  - `hasLoadedInitialRef` 플래그를 도입하여 `if (isLoading && !hasLoadedInitialRef.current) return <Skeleton />` 형태로 최초 마운트 시에만 스켈레톤을 노출하고, 창 포커스 복귀(Alt+Tab)나 백그라운드 쿼리 재실행 시 페이지 전체가 스켈레톤으로 대체되어 모달이 언마운트되는 현상을 원천 차단.
  - 데이터 페칭 콜백(`loadExpenses`, `loadSubscriptions`, `loadGames`)의 의존성을 객체 레퍼런스(`user`)에서 원시 ID(`userId: user?.id`)로 변경하여 토큰 갱신 시 불필요한 재호출 방지.
- **모달 내부 폼 리셋 가드 (`src/components/subscription/subscription-modal.tsx`, `src/components/expense/expense-modal.tsx`)**:
  - `prevOpenRef`를 적용하여 모달이 닫힌 상태에서 새로 열리는 시점(`open && !prevOpenRef.current`)에만 폼을 초기화하도록 가드. 모달이 열려 있는 상태에서 부모 컴포넌트가 리렌더링되더라도 사용자가 입력해 둔 모든 값(제목, 게임, 금액, 결제 주기, 결제일 등)이 100% 보존되도록 개선.
- **인증 컨텍스트 사용자 레퍼런스 안정화 (`src/lib/auth-context.tsx`)**:
  - `onAuthStateChange`에서 `prevUser`와 `nextUser`의 `id`, `email`, `updated_at`이 동일한 경우 이전 레퍼런스를 유지하여 토큰 갱신 시 전역 컴포넌트 트리 리렌더링 전파 방지.
- **단위 테스트 검증 (`src/components/subscription/subscription-modal.test.tsx`)**:
  - 팝업이 열려 있는 상태에서 `useAuth` 사용자 객체 갱신 및 부모 리렌더링이 발생해도 입력한 내용이 초기화되지 않음을 검증하는 단위 테스트 추가 (총 158개 테스트 100% 통과).

## 2026-10-13 (페이지 로드 부드러움 향상 및 게임 아이콘 지연 로딩 최적화)

- **게임 아이콘 에셋 고효율 압축 최적화 (`public/assets/games/`)**:
  - `nikke.png`(430KB $\to$ 26KB, 94% 절감), `star_rail.png`(209KB $\to$ 18KB, 91% 절감), `genshin.png`(184KB $\to$ 14KB, 92% 절감) 3종을 256x256 WebP로 포맷 변환하여 다른 6개 아이콘(12KB~24KB)과 균등한 초경량화 달성.
- **PWA 서비스 워커 및 사전 로드 엔진 (`public/sw.js`, `src/lib/icon-preload.ts`)**:
  - `public/sw.js` 정적 캐시(`isStatic`) 판별 대상에 `/assets/` 및 `/fonts/` 추가, `PRECACHE_URLS`에 전체 게임 아이콘 등록 및 셸 캐시 v3 승격.
  - `src/lib/icon-preload.ts` 유틸리티 구현 및 대시보드/소비/게임 데이터 수신 시 백그라운드 선제적 이미지 사전 로드 연동.
- **게임 아이콘 컴포넌트 (`src/components/ui/game-icon.tsx`)**:
  - 이미지 로딩 중 스켈레톤 펄스, 로드 완료 시 `duration-200` 페이드인, 에러 시 Gamepad2 폴백 기능을 지원하는 재사용 컴포넌트 추가 및 캘린더, 게임 목록, 지출 테이블/템플릿에 적용.
- **스토리지 다운로드 인메모리 캐시 (`src/lib/storage-upload.ts`)**:
  - `downloadUserIcon`에 인메모리 Map 캐시 계층을 적용하여 반복 방문 시 다운로드 지연시간을 0ms로 단축하고 불필요한 404 실패 요청을 차단.
- **스켈레톤 UI 및 부드러운 페이지 전환 (`src/components/ui/skeleton.tsx`, `page-skeletons.tsx`, `src/app/dashboard/loading.tsx`)**:
  - 대시보드, 소비, 게임 화면의 단순 텍스트("불러오는 중...") 로딩을 실제 화면 뼈대와 일치하는 스켈레톤 레이아웃으로 전면 개편.
  - Next.js 서스펜스 라우트 전환용 `src/app/dashboard/loading.tsx` 추가 및 페이지 마운트 시 `animate-fade-in` CSS 애니메이션 적용.
- **종합 검증 무결성**:
  - Vitest 37개 파일 / 158개 테스트 전체 통과 (100% PASS), Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (정기 구독 모달 연관 게임 선택 및 버전 패스형 활성화 버그 수정)

- **정기 구독 모달(`SubscriptionModal`) 버전 패스형 활성화 및 카테고리 자동 동기화 (`src/components/subscription/subscription-modal.tsx`)**:
  - `CYCLE_TYPE_OPTIONS`의 `VERSION_PASS` 비활성화 조건(`disabled`)을 기존 고정 카테고리 검사(`category !== "게임"`)에서 연관 게임 미선택 검사(`!gameId`)로 교체하여, 연관 게임 선택 시 즉시 '게임 버전 패스형' 항목이 정상 활성화되도록 수정.
  - 연관 게임 선택(`handleGameChange`) 시 `category` 상태를 `'게임'`으로 자동 전환(해제 시 `'정기 구독'` 및 `cycleType` 자동 복구)하고, DB 저장(`subscription_templates.insert`) 시 `category`가 올바르게 반영되도록 보장.
- **버전 패스 지연 회차 생성 엔진 동기화 완화 (`src/lib/subscription-sync.ts`)**:
  - `ensureMonthlySubscriptionExpenses`에서 `VERSION_PASS` 템플릿 필터링 조건을 `t.cycle_type === "VERSION_PASS" && Boolean(t.game_id)`로 완화하여 `category` 값에 구애받지 않고 버전 연동 회차가 확실하게 생성되도록 방어 로직 강화.
- **단위 테스트 보강 (`src/components/subscription/subscription-modal.test.tsx`)**:
  - 연관 게임 미선택 시 버전 패스형 비활성화 확인, 게임 선택 후 즉각 활성화 및 카테고리 전환 확인, 버전 패스형 템플릿 저장 검증, 게임 선택 해제 시 `MONTHLY_DAY` 자동 복구 검증 등 단위 테스트 추가 (총 148개 테스트 100% 통과).

## 2026-10-13 (Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트)

- **모달 컴포넌트 모바일 패딩 최적화**:
  - `ExpenseModal`, `ExpenseDetailModal`, `SubscriptionModal`의 `DialogContent` 패딩을 `p-4 sm:p-6`으로 튜닝하여 좁은 화면에서의 가용 폼 영역 및 가독성 개선.
- **모바일 카드 뷰 뱃지 레이아웃 보강**:
  - `src/app/dashboard/expenses/page.tsx`: 타이틀 및 픽업 뱃지 컨테이너에 `flex-wrap`을 적용하여 좁은 뷰포트에서도 오버플로우 방지.
- **종합 회귀 검증 무결성**:
  - Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석)

- **DB 스키마 및 마이그레이션 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`, `src/types/database.types.ts`)**:
  - `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id) ON DELETE SET NULL` 컬럼 추가.
  - 픽업 지출 인덱스(`idx_expenses_pickup_schedule_id`) 생성.
  - 지출-일정 게임 일치 트리거 검증 함수(`validate_expense_references()`)에 픽업 일정 게임 검증 로직 추가.
  - TypeScript 데이터베이스 타입(Row, Insert, Update, Relationships)에 `pickup_schedule_id` 완벽 반영.
- **지출 모달 UI 픽업 바인딩 지원 (`src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`)**:
  - 카테고리가 '게임'이고 게임이 선택된 경우 결제일 기준 진행 중인 픽업 일정 목록을 `[픽업 선택 (선택 사항)]` 드롭다운으로 노출.
  - 지출 등록 시 `pickup_schedule_id` 저장 연동.
  - 지출 상세 모달에 연결된 픽업 타이틀(`pickupTitle`) 표시.
- **소비 화면 가챠/픽업 분석 통계 섹션 추가 (`src/app/dashboard/expenses/page.tsx`)**:
  - 확정(`CONFIRMED`) 지출 기준 픽업별 총 과금액 가로 막대 차트(`BarChart layout="vertical"`).
  - 픽업 과금 순위 랭킹 카드: 최다 과금 픽업 순위, 과금액, 비중(%), 건수 렌더링.
  - 픽업 미지정 과금은 `'버전 일반'`으로 명확히 분리 표기하여 100% 회계 정합성 보장.
  - 게임 선택 필터 드롭다운 연동.
  - 지출 목록 테이블 및 모바일 카드 내 `[픽업명]` 뱃지 렌더링.
- **검증 무결성**:
  - Vitest 34개 파일 / 146개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.

## 2026-10-13 (Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동)

- **결제 플랫폼 $\to$ 결제 수단 2단계 종속 선택 구조 (`src/components/expense/expense-modal.tsx`)**:
  - `PaymentPlatform` 타입(`GOOGLE_PLAY`, `GALAXY_STORE`, `OTHER`)을 신설하고 플랫폼에 따라 지원 결제 수단을 동적으로 필터링.
  - 카테고리(`게임` vs 일반) 변경 시 플랫폼 자동 동기화.
- **네이버페이 충전 프리뷰 및 원클릭 승인 플로우**:
  - `calculateNaverPayPayment` 엔진을 결제 모달에 연동하여 네이버페이 선택 시 부족액, 10,000원 단위 올림 충전액, 충전 후 예상 잔액 인라인 카드 렌더링.
  - 머니 부족 시 `[충전 후 결제]` 버튼으로 자동 전환 및 원클릭 트랜잭션 수행. 총 자산 부족 시 `[총 자산 부족]` 경고 및 비활성화.
  - 네이버페이 선택 시 사용 포인트 필드 비활성화 및 0P 리셋.
- **최종 실결제액 수동 오버라이드 지원**:
  - `최종 실결제액 (원)` 입력 필드를 추가하여 사용자가 원하는 금액으로 수동 수정 가능.
  - 수동 수정 시 차액을 할인 금액으로 자동 역산하여 DB 제약조건(`chk_expense_math`) 및 RPC 정합성 유지.
- **지출 상세 모달 친화적 라벨 및 환불 안내 (`src/components/expense/expense-detail-modal.tsx`)**:
  - 네이버페이 결제 건에 대한 친화적 라벨 표시 및 네이버페이 머니 전액 환불 안내 메시지 제공.
- **검증 무결성**:
  - Vitest 34개 파일 / 143개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.


- **네이버페이 충전 및 결제 계산 엔진 모듈화 (`src/lib/naver-pay-calculations.ts`)**:
  - 부족액 발생 시 10,000원 단위 올림 충전액($R$) 계산, 총 자산 검증 및 잔액 차감을 순수 함수 `calculateNaverPayPayment`로 분리.
  - 9가지 엣지 케이스 단위 테스트 작성 및 전체 통과 (`naver-pay-calculations.test.ts`).
- **결제 타입 및 에러 매핑 확장 (`src/lib/payment-calculations.ts`)**:
  - `PaymentMethod`, `PointPlatform`에 `"NAVER_PAY"` 추가.
  - 네이버페이 결제 시 적립 0P 처리 및 충전 자산 부족 에러 친화적 메시지 매핑 추가.
- **스토어/페이 지갑 위젯 확장 (`src/components/wallet/store-wallet-widget.tsx`)**:
  - 3열 그리드로 네이버페이 잔액(원) 표시 및 수동 목표 잔액 보정(`adjust_wallet_balance`) 지원.
  - 단위 테스트(`store-wallet-widget.test.tsx`) 4건 통과.
- **지출 관련 컴포넌트 라벨 동기화**:
  - `src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`에 `NAVER_PAY` 레이블 추가.
- **DB 스키마 및 마이그레이션 DDL 갱신 (`md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`)**:
  - `store_wallets`, `expenses`, `store_point_transactions`의 CHECK 제약조건 확장.
  - `process_expense_payment` 및 `refund_expense_payment` RPC에 네이버페이 충전·결제 트랜잭션 및 자산 이중 차감/환불 방지 로직 적용.
- **검증 무결성**:
  - Vitest 34개 파일 / 138개 테스트 전체 통과 (100% PASS), `tsc --noEmit` 0 에러, Next.js 15개 정적 페이지 빌드 성공.


- **회원가입 라우팅 분리 (`src/app/auth/signup/page.tsx`)**:
  - 기존 `/auth`에서 단일 폼으로 처리되던 회원가입 로직을 별도 전용 페이지로 분리.
  - 이메일, 비밀번호(6자 이상), 닉네임(최대 20자) 입력 폼 제공.
  - `supabase.auth.signUp` 호출 시 닉네임을 메타데이터(`options: { data: { nickname } }`)로 저장하고 세션 생성 시 `users` 테이블 동기화 폴백 지원.
- **기존 로그인 페이지 연동 (`src/app/auth/page.tsx`)**:
  - 기존 로그인 및 Google OAuth UI는 유지하면서 '회원가입' 버튼 클릭 시 `/auth/signup` 페이지로 라우팅되도록 변경.
- **경로 리다이렉트 지원 (`src/app/dashboard/auth/page.tsx`)**:
  - `/dashboard/auth` 접근 시 404 없이 `/auth`로 즉시 리다이렉트 처리.
- **단위 테스트 및 빌드 무결성**:
  - `src/app/auth/page.test.tsx` 갱신 및 `src/app/auth/signup/page.test.tsx` 신규 5건 테스트 추가 (전체 33개 파일 128개 테스트 100% 통과, `next build` 15개 정적 페이지 빌드 성공).

## 2026-10-12 (Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 파이프라인 등록)

- **파이프라인 등록**: 픽업별 지출 추적 및 소비 통계 분석 요구사항을 Phase 11.4로 신규 등록(`docs/to-do.md`, `docs/progress.md`, `docs/handoff.md`).
- **테스트 및 빌드 무결성 보완**: `src/app/dashboard/games/page.test.tsx` MockQuery 타입 선언을 개선하여 `tsc --noEmit` 에러(TS18046) 및 Next.js ESLint 빌드 에러를 해결. (123개 테스트 100% 통과, 정적 export 13개 페이지 빌드 성공).

## 2026-10-12 (Phase 11.2 사이드바 동일 게임·기간 일정 그룹핑)

- **일정 등록 원칙 변경**: 같은 날 같은 게임의 픽업이 여러 개면 `'/'`로 합치지 않고 캐릭터(배너)별로 개별 등록. 지출(`expenses.schedule_id`)과 1:1 연결 가능.
- **`src/components/calendar/hero-sidebar.tsx`**: 같은 `gameId`(없으면 게임명) + `schedule_type` + `start_date` + `end_date` 일정을 하나의 카드로 묶고, 제목(+개별 메모)을 `• 제목` 목록으로 표시. 기간·유형·게임이 다르면 카드 분리 유지.
- **`src/app/dashboard/page.tsx`**: `HeroScheduleItem`에 `gameId` 전달.
- **테스트**: `hero-sidebar.test.tsx`에 그룹핑/분리 케이스 2건 추가.
- **관리자 일정 복사 (`src/app/admin/page.tsx`)**: 공식 일정 항목 버튼을 `[복사] [수정] [삭제]` 순서로 배치. `[복사]`는 원본 값(게임·유형·기간·제목·메모)이 채워진 "일정 복사" 모달을 열고 저장 시 새 일정으로 insert. `page.test.tsx`에 버튼 순서/복사 저장 테스트 2건 추가.

## 2026-10-12 (Phase 10.7 페이지별 UI 및 인터랙션 긴급 개선)

- **Alt+Tab / 창 포커스 전환 시 화면 리셋 및 모달 닫힘 현상 해결**:
  - `src/app/dashboard/layout.tsx`: `hasMountedChildren` ref 가드를 추가하여 초기 마운트 이후 백그라운드 토큰 갱신 시 자식 컴포넌트 언마운트 방지.
  - `src/lib/auth-context.tsx`: 토큰 갱신 시 `isAccountDeletionStatusLoading` 재트리거 방지.
- **대시보드 에러 방어 및 하위 호환 (`src/lib/subscription-sync.ts`, `src/app/dashboard/page.tsx`)**:
  - 원격 DB의 `cycle_type` 컬럼 부재 시 자동 폴백 처리 및 쿼리 필터 단순화.
- **소비 화면(`/dashboard/expenses`) 버튼 분기 및 문구 수정**:
  - 탭 상태에 따라 상단 버튼 분기 (`activeTab === "expenses" ? [+ 지출 추가] : [+ 구독 추가]`).
  - 정기 구독 탭 타이틀/설명 문구 수정 (`정기 구독`, `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.`).
  - 30일 누적 충전형(`INTERVAL_30`) 구독 카드: `남은 N일` 배지 추가, `[남은 날짜 수정]` 버튼 및 D-day 동기화 모달 추가.
  - 예정 지출 결제 확정 시 결제 수단, 할인, 쿠폰, 포인트 수정 지원.
- **할인/포인트 입력 모델 개편 (`src/components/expense/expense-modal.tsx`, `expense-detail-modal.tsx`)**:
  - 지출 모달 카테고리에서 `정기 구독` 삭제.
  - "포인트 할인 (원)" 삭제 $\to$ `정가 (원)`, `쿠폰 (%)`, `할인 (원)`, `사용 포인트 (P)`로 일원화 (1P = 1원 자동 매핑).
- **구독 추가 모달 개편 (`src/components/subscription/subscription-modal.tsx`)**:
  - 카테고리 `정기 구독` 고정(read-only).
  - 제목 placeholder `예: ~` 제거, 30일 누적 충전형 설명 문구 수정.
- **게임 관리(`/dashboard/games`) 및 관리자(`/admin`) UI 수정**:
  - `GameSelectModal` 트리거 버튼 문구를 `구독 추가`로 변경 (`+ + 구독 추가` 중복 해소).
  - `/admin` 일정 타이틀 placeholder `예: ~` 제거.
- **원격 DB 마이그레이션 DDL 스크립트 작성 (`md/MIGRATION_PHASE10.sql`)**:
  - Supabase SQL Editor에서 실행 가능한 `subscription_templates`, `expenses`, 및 최신 `update_store_wallet_settings` DDL 제공.
- **캘린더 타일 아이콘 표시 방식 개선 (`src/app/dashboard/page.tsx`)**:
  - `start_date`와 `end_date`를 가지는 복수일 기간 일정(버전, 픽업 등) 및 기간형 지출의 경우, 캘린더 타일 우측 상단 게임 아이콘을 전체 기간 동안 반복 표기하지 않고 오직 `start_date` 타일에만 단일 표기하도록 변경 (타일 아이콘 중복/도배 해소, 사이드바 상세 목록은 기간 내 유지).
- **Galaxy Store 등급 설정 저장 호환성 강화 (`src/components/wallet/store-wallet-widget.tsx`)**:
  - 원격 DB의 구버전 `update_store_wallet_settings` RPC 오류 방어를 위해 `p_tier: null` 자동 폴백 지원.
- **미구독 게임 일정 노출 차단 (`src/app/dashboard/page.tsx`)**:
  - 사용자가 구독한 게임(`user_games`)의 공용 일정만 개인 캘린더에 노출되도록 필터링 분리.
- **관리자 탭 내비게이션 및 일정 관리(CRUD) 전면 개편 (`src/app/admin/layout.tsx`, `src/app/admin/page.tsx`)**:
  - `/admin` $\leftrightarrow$ `/admin/requests` 간 상단 서브 탭 내비게이션 추가.
  - 등록된 공식 일정 전체 목록 조회, 게임별 필터링, 새 일정 등록 모달, 기존 일정 수정 모달, 일정 삭제 확인 다이얼로그 및 `src/app/admin/page.test.tsx` 5종 단위 테스트 완료.
- **요청 관리(`/admin/requests`) 관리자 권한 검사 일원화 및 디자인 정리 (`src/app/admin/requests/page.tsx`)**:
  - `user.app_metadata.role`뿐 아니라 `AuthContext`의 `role === 'admin'`을 포괄하도록 `isAdmin` 검사 로직 통일 (`Topbar`, `AdminLayout`, `AdminPage`와 일관성 확보).
  - 중복된 외부 래퍼(`min-h-screen bg-gray-900`) 제거 및 테마 토큰(`bg-surface`, `border-line`, `text-content`) 정리.
  - `src/app/admin/requests/page.test.tsx`에 컨텍스트 role 기반 요청 로드 테스트 추가 (총 3종 통과).
- **소비/게임/관리자 헤더 높이 통일, 중복 버튼 단일화 및 관리자 화면 요청 기능 은닉**:
  - 소비/게임/관리자 헤더 좌상단 텍스트(소비, 게임, 관리자 센터)의 높이와 `border-b border-line pb-4` 규격을 통일하고, 우측 버튼(`[+ 지출 추가]`, `[+ 구독 추가]`, `[+ 추가 요청]`) 및 관리자 링크 높이를 `h-10`(40px)으로 일치.
  - 소비 정기 구독 탭 본문의 중복 `+ 구독 추가` 버튼 제거 (상단 헤더에 1개만 단일 배치).
  - 게임 페이지 하단 카드의 중복 버튼 제거 (상단 헤더에 1개씩 단일 배치).
  - 관리자 계정 격리: 관리자 로그인 시 `/dashboard/games`에서 게임 추가 요청 버튼/안내 카드를 숨기고, `/dashboard/settings`에서 `UserRequestsCard` 숨김 처리.
- **검증 완료**: TypeScript 0 오류, Vitest 31개 파일 / 115개 테스트 전체 통과 (100% PASS), Next.js 빌드 무결성 유지.

## 2026-10-12 (Phase 2.5 TypeScript Database 타입 자동 생성 완료)

- **원격 DB 타입 자동 생성 (`src/types/database.types.ts`)**:
  - `npx.cmd supabase gen types typescript --db-url ...` 실행을 통해 원격 Supabase DB의 12개 테이블 스키마, 뷰, 제약조건, RPC 함수 타입을 최신 상태로 생성.
  - `Database['public']['Tables']['personal_memos']['Row']` 등 모든 핵심 테이블 타입 정상 바인딩 확인.
- **종합 정적 분석 및 테스트 검증**:
  - `npx.cmd tsc --noEmit` 무결점 통과 (에러 0건).
  - Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS).

## 2026-10-12 (Phase 2.3 RLS 격리 및 Phase 7.1 일정 동기화 DB 실기 검증)

- **테스트 스크립트 결함 수정 (`md/TESTS.sql`)**:
  - `test_game_id` 생성 직후 세션 구성 변수 등록(`set_config('chronoledger.test_game_id', :'test_game_id', true);`) 누락을 수정하여 인라인 PL/pgSQL 블록의 변수 미인식 오류 해결.
- **Phase 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증**:
  - `psql` 17.11로 Supabase 테스트 프로젝트에서 `md/TESTS.sql` 전체 스위트 실행 (`ON_ERROR_STOP=1`).
  - 일반 사용자 권한에서 타 사용자 자산/지출/지갑 접근 차단, `store_wallets` 잔액 직접 수정 차단, `store_point_transactions` 원장 임의 쓰기 차단, `expenses` 및 `subscription_templates` 물리 삭제 차단, 요청 상태 임의 변경 차단(`REQ-02`) 100% 통과 확인.
- **Phase 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증**:
  - 관리자의 일정 시작/종료일 변경 시 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 자동 동기화되고 `CONFIRMED`/`CANCELLED` 회계 지출과 날짜 외 컬럼은 보존됨을 검증(`SCH-01`, `SCH-02`) 통과 확인.
- **원자적 롤백 확인**:
  - `PASS: all smoke-test fixtures and mutations rolled back` 출력 및 단일 트랜잭션 롤백 완료 확인.

## 2026-10-12 (Phase 10: 기획 v2 전면 개편)

- **캘린더 & 지출 바인딩 (10.1)**:
  - 버튼 레이블을 `+ 지출 추가`로 통일.
  - 지출 모달 내 카테고리 우선 선택 도입(카테고리가 '게임'일 때만 게임 선택 노출).
  - 지출 일자의 공용 일정 중 `VERSION` 일정에만 단일 바인딩 연동 (`PICKUP` 일정 바인딩 제외).
- **소비 화면 UI 개편 (10.2)**:
  - 소비(`/dashboard/expenses`) 헤더에 `+ 지출 추가` 버튼 및 모달 연동.
  - 카테고리별 비중 그래프를 Recharts 원그래프(Pie Chart)로 전면 교체.
  - 집계 기준 엄격 적용: 취소/예정 지출을 완전히 제외한 확정(`CONFIRMED`) 지출만으로 비율 및 통계 계산.
  - 목록 액션 버튼을 `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 직관화하고 전용 RPC 연동.
- **정기 구독 3종 주기 모델 A안 (10.3)**:
  - 소비 화면 내 `[지출 내역 및 통계 | 정기 구독]` 서브 탭 분리 구성.
  - `subscription_templates` 스키마 및 DB 체크 제약에 `cycle_type`(`MONTHLY_DAY`, `INTERVAL_30`, `VERSION_PASS`) 추가.
  - `src/lib/subscription-sync.ts`: 매월 지정일 말일 보정, 30일 누적 충전식, 신규 버전 시작일 연동 3종 회차 생성 엔진 구현.
  - 구독 생성 모달(카테고리 '게임' 우선 필터링, 주기 모델 선택) 및 활성화 토글 스위치 구현.
- **게임 관리 화면 개편 (10.4)**:
  - 게임 관리(`/dashboard/games`) 헤더 및 하단 배너에 `+ 구독 추가`, `+ 추가 요청` 버튼 배치.
  - `RequestSubmissionModal`: 게임 요청(게임 제목만 입력)과 일정 요청(게임+기간+유형+내용 템플릿) 분기 템플릿 제공.
  - 내 구독 게임 카드 그리드: 256×256 WebP Canvas 자동 변환 아이콘 업로드/삭제, 공식 일정 보기 시트, 지출 보존 구독 해제.
- **설정 화면 개편 (10.5)**:
  - Galaxy Store 포인트 지갑: 적립률 수동 입력을 4대 공식 등급(일반 0.1%, 스타 0.1%, 프레스티지 1.1%, 로열블루 2.1%) 선택 드롭다운으로 개편 (`md/SCHEMA.sql` 및 `src/lib/payment-calculations.ts` 동기화).
  - 개인 재무 설정 카드: `user_finances`의 총 자산(`total_asset`) 및 기본 월 예산(`default_budget`) 조회/수정 기능 추가.
  - 내 요청 내역 카드: 제출한 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 피드백 메모(`admin_memo`) 조회 뷰 추가.
- **종합 검증 및 회귀 테스트 (10.6)**:
  - TypeScript 오류 0건 (`npx tsc --noEmit`).
  - Vitest 30개 파일 / 106개 테스트 100% 통과 (PASS).
  - Next.js 정적 export (`npm run build`) 13개 페이지 최적화 빌드 성공.

- 레이아웃 정리: 좌측 사이드바를 제거하고 상단바(`components/layout/topbar.tsx`)로 이동(홈·소비·게임, 로고 확대, 테마 토글, 프로필 드롭다운의 계정/로그아웃). 기본 테마는 저장값이 없으면 OS 설정을 따르고 토글은 유지. 빈 상태의 □ 제거, 스토어 포인트 표기를 Google/Galaxy로 변경, "지출 등록"을 "등록"으로 바꿔 일자 상세 패널(히어로 사이드바·모바일 드로어) 날짜 줄 우측으로 이동.

- 프로필: 상단바 프로필 버튼에 사용자 이름과 사진(직접 업로드 > Google 사진 > 이니셜) 표시. 계정 설정(`/dashboard/settings`)에 `ProfileAvatarCard` 추가(256x256 WebP를 비공개 `user-icons/{uid}/profile.webp`에 업로드/삭제, 오프라인 시 비활성). 계정 삭제 워커가 `{uid}` 폴더를 지워 별도 정리 불필요.

## 2026-10-10 (Phase 8 Iteration 01)

- UI 폴리싱: 디자인 시트 기준 dark/Cool Neutral Light 시맨틱 토큰(`globals.css` RGB 채널 변수)과 Tailwind 매핑, 레거시 gray/blue/red/green/yellow·`text-white` 유틸리티를 토큰으로 재매핑, A2Z 전역 폰트(기존 자체 호스팅 9 weight + OFL 유지), 중단점 md=900/lg=1280, 반경/그림자/전환 토큰, 테마 토글(`cl-theme`, 기본 dark, 인증 화면은 dark 고정), `EmptyState` 공통 컴포넌트, 버튼/입력/카드/다이얼로그/드로어/진행바 다듬기, 대시보드 셸(데스크톱 사이드바·모바일 상단바), 캘린더·히어로 사이드바·모바일 바텀시트 다듬기, 관리자/설정/게임 선택 하드코딩 색 교체.

## 2026-10-09 (Iteration 03)

- Phase 7 Iteration 03: Iteration 02 수정이 미커밋 상태로 리뷰된 점을 확인하고 유지(자동 열림·비해제 만료 모달, `manifest.id`)하면서, Service Worker에 Supabase REST GET의 로그인 사용자별(JWT `sub`) 읽기 캐시를 추가(익명·만료 토큰·비-GET·타 출처 제외, 로그아웃 시 전체 삭제), 기본 브랜드 아이콘 재생성과 maskable 분리, 7.3 완료 표기. 실브라우저/Android 검증은 7.4로 이월.

## 2026-10-09

- Phase 7 Iteration 02 리뷰 반영: 기한 지난 PLANNED가 있으면 닫을 수 없는 만료 모달 자동 표시(닫기 버튼·Esc·바깥 클릭 차단, 오프라인 안내), 그리드 범위 `end_date` PLANNED 조회·병합 및 만료 조회를 종료일 기준으로 통일(일정 연결 PLANNED는 `target_date=end_date`로 저장), 앱 셸 Service Worker(`public/sw.js`)·등록/로그아웃 캐시 삭제, 전 쓰기 진입점에 오프라인 핸들러 가드(`offline-guard.ts`)와 배너 문구 정정, manifest `id`·180px apple-touch 아이콘 추가. 7.3의 개인 데이터 오프라인 조회 캐시는 미구현으로 기록(부분 완료), 정식 아이콘 교체는 릴리스 차단 항목.

## 2026-10-08

- Phase 7 구현: `md/TESTS.sql`에 SCH-02(일정 날짜 변경 시 PLANNED만 동기화, CONFIRMED/CANCELLED 보존, 날짜 외 변경 무동기화) 추가, `budget-calculations.ts`(PLANNED는 종료일 월·CONFIRMED는 결제월 귀속, 만료 항목 탐지), `overdue-planned-modal.tsx`(결제/예정 취소), PWA `manifest.json`·임시 아이콘·`offline-banner.tsx`·오프라인 쓰기 버튼 잠금을 추가했다. tsc/Vitest(22 files/70 tests)/lint/build 통과, DB SQL 실행과 Android PWA 설치·오프라인 실기 검증은 미수행.
- Phase 6 구현: 스토어 포인트 지갑 위젯(설정 페이지, `update_store_wallet_settings`/`adjust_wallet_balance`), 결제 모달(PLANNED 지출 생성 후 `process_expense_payment`), 지출 상세/환불 모달(`refund_expense_payment`, 잔액 부족 오류 안내)과 결제 계산·검증 라이브러리, 대시보드 연동을 추가했다. tsc/Vitest(19 files/59 tests)/lint/build 통과, 실DB RPC·RLS·원장 검증은 미수행.

- Phase 5 Iteration 02 리뷰 반영: 조회 범위를 42일 그리드 전체로 확장, 예상 지출에 CONFIRMED 포함(표시 월·CANCELLED 제외), date-only 문자열 로컬 파싱, 초기 날짜를 마운트 후 설정해 hydration 불일치 방지, EOF 공백 정리. tsc/Vitest(15 files/45 tests)/lint/build 통과, 실DB 검증은 미수행.
- Phase 5 캘린더 코어를 구현했다. 6주 그리드·말일 보정 날짜 연산, 월간 구독 Lazy Generation, 금액 미표시 데스크톱 캘린더, 히어로 사이드바/모바일 바텀시트를 추가하고 대시보드를 해당 구조로 교체했다.
- 캘린더/구독/대시보드 테스트를 추가·갱신했으며 전체 Vitest(15 files/43 tests), TypeScript check, lint, 정적 build를 통과했다.
- Phase 3 Web/PWA 인증 흐름과 계정 삭제를 구현했다. Netlify Functions + Supabase 내구성 queue/retry worker로 사용자 아이콘/개인 행을 정리하고 Resend 멱등성 키 메일 후 Auth 계정을 삭제한다. 대기 중 접근 차단, 진행 상태 화면, OAuth/session 및 deletion worker 테스트를 추가했다. migration/실환경 인증·RLS/Storage/메일 발송은 미검증이다.
- Resend 멱등성 기간을 넘긴 미확정 발송은 자동 재전송하지 않고 `MANUAL_REVIEW`로 보류해 잠재적 중복 안내를 방지한다. 관련 선택과 수동 운영 필요성을 설계/결정 문서에 기록했다.
- `docs/to-do.md`의 기존 Phase 2.4 충돌 마커를 제거하고, 완전한 Phase 2.4 검증 현황 및 Phase 2.5 미완료 상태를 보존했다.
- Phase 2.4를 위해 `md/TESTS.sql`을 현재 `md/SCHEMA.sql` 기준으로 보강했다. 테스트 역할/JWT, synthetic 사용자 및 기본 finance/wallet 값, 순서별 기대 결과, authenticated RPC 호출, 실패 원자성, RLS/grants 케이스를 문서화했다. 테스트는 rollback-only로 유지했으며 DB 접속과 SQL 실행은 하지 않았다.
- 진행 현황·인수인계·to-do에 정적 검토 범위와 현재 SQL 버전의 미실행 상태, 격리된 Supabase 테스트 프로젝트에서의 후속 실행 필요성을 기록했다.

- Phase 1 환경 설정을 보완했다. Progress/Drawer 컴포넌트와 의존성을 추가하고, Supabase 브라우저 singleton이 필수 공개 환경변수 누락을 명시적으로 보고하도록 했다. 기존 Dialog/Select를 확인하고 브라우저 PKCE/Tauri implicit 동작을 테스트했다.
- 다중 에이전트 파이프라인 보완판과 현재 협업 체계 이식 검토 문서를 추가했다(문서 전용, 코드·스크립트 변경 없음).
- Antigravity 시험용 한국어 workspace 규칙과 Maker/Reviewer/Orchestrator skills를 추가했다. 기존 Copilot agent 정의는 `.bak`으로 보존하고 `.github/agents/`의 활성 정의를 제거했다. Antigravity 내 인식·실행 여부는 미검증이다.

- Phase 4 기반 및 요청 제출 변경을 `main`에 통합했다. 게임 카탈로그/아이콘 업로드, 관리자 승인 화면, 사용자 게임·일정 제안 UI와 테스트를 포함하며, 기존 최신 인증 UI와 KST 대시보드 동작을 보존한다. 중첩 worktree 테스트 검색 제외, 로그인 입력 오타 및 npm peer/lockfile 정합성도 보완했다.
- Gemini Phase 4.4 검토를 위한 수동 패킷(승인 기준 요약, 프롬프트, Base/Target 정보)과 40,198-byte exact diff를 준비했다. 사용자가 수동 방식을 선택해 Gemini API run은 호출 전에 abandoned 처리했으며 어떤 diff도 외부로 전송하지 않았다.
- 사용자가 동일 Base/Target의 Gemini 수동 정적 리뷰 결과를 전달했다. Gemini는 clean/발견 없음으로 판정했으며, 별도 결과 파일에 기록해 기존 ChronoLedger review.json은 보존했다. 실제 Supabase RLS/RPC 원자성은 미검증으로 유지한다.

## 2026-10-07
- Phase 4.4 협업 run에서 사용자 게임 제안 및 일정 추가/수정 요청 UI를 추가하고 입력 검증, 요청 목록, 회귀 테스트를 구현했다. 동일 Target SHA 리뷰는 clean이고 Vitest 21개, lint, dummy 환경의 정적 build 및 run 결과 Schema 검증이 통과했다. 실제 Supabase 연동과 격리 sandbox 검증은 남아 있다.
- 협업 파이프라인 변경을 main `f163157`, Phase 4 초기 구현을 `collab/phase1-setup` `674f741`에 분리 커밋했다. Target SHA와 범위가 어긋난 기존 `phase1-setup` run은 review/test가 없음을 기록하고 `abandoned`로 종료했다.
- Local harness용 ChronoLedger Orchestrator와 Maker/Reviewer 자동 위임 절차, 사용자 개입 지점 가이드, 협업 JSON Schema validator 및 테스트를 추가했다. VS Code 실제 위임 흐름은 검증 전이다.
- Windows PowerShell이 UTF-8 BOM으로 저장할 수 있는 run manifest를 Gemini Reviewer JSON loader가 읽도록 보완했다.
- Gemini Reviewer 단일 run/SHA PoC와 오프라인 회귀 테스트를 추가했다. 전체 diff를 표시하고 인터랙티브 승인을 요구하며, manifest/결과를 기존 JSON Schema로 검증하고 검증된 결과만 no-overwrite 방식으로 저장한다. API 호출·외부 전송 승인·도입 결정은 수행하지 않았다.
- PoC 사용법 및 제한은 `ChronoLedger_pipeline_auto.md`에 기록했다. 제안서의 독립 리뷰 전달용 `ChronoLedger_pipeline_auto_review.md`도 추가했다.
- Gemini 작성 진행 기록과 공용 구현 체크리스트의 역할을 구분했다. 현재 우선순위·완료 상태는 `docs/to-do.md`가 기준이며, `docs/to-do_Gemini.md`는 검증 전 과거 기록으로 보존한다.

## 2026-10-07 (Phase 4 초기 구현, 검증 중)

- 클라이언트 Canvas 기반 256x256 WebP 이미지 리사이징 모듈(`src/lib/image-resizer.ts`)을 구현하여 5MB 이하 이미지의 1:1 중앙 크롭 및 100KB 이하 압축을 적용했다.
- Supabase Storage `user-icons` 비공개 버킷 업로드/다운로드/삭제 유틸리티(`src/lib/storage-upload.ts`)와 공용 게임 카탈로그 구독/아이콘 등록 모달의 초기 구현을 추가했다.
- 관리자 요청 페이지의 초기 구현에서 DB 필드/RPC 인자 불일치를 발견해 수정했다. 관리자 역할 gate, 기본 아이콘 URL 입력, RPC 실패 시 상태 직접 변경 fallback 제거를 반영했다.
- 앱 테스트 15개, ESLint 및 dummy Supabase 환경변수를 사용한 정적 build가 통과했다. 실제 Storage/RLS/RPC 통합은 미검증이며 게임/일정 요청 제출 모달도 남아 있어 Phase 4 완료로 보지 않는다.

## 2026-10-07

- Dashboard의 당월 예정 지출을 KST DATE 월 범위로 조회하고 `end_date` 우선 월 귀속과 실제 0원/오류 분기를 반영했다. Gemini 분업은 커밋 이후 동일 SHA 읽기 전용 리뷰로 별도 미착수 표시했다.
- 로그인·대시보드의 접근성을 보완했다. 카드 제목 단계, 로딩/오류 알림 역할, 내비게이션 이름 및 장식 아이콘 의미를 정리하고 브라우저에서 로그인 폼 이름, 키보드 초점, 타깃 크기와 색상 대비를 검증했다. 실제 스크린리더 및 인증 dashboard 실행 검증은 남아 있다.
- `/auth` 로그인 화면을 앱과 일관된 다크 테마로 개선했다. 레이블이 있는 입력과 이메일 로그인·가입·Google 버튼 구성을 정리하고, 좁은 화면에서도 넘침이 없는지 확인했다. 실제 인증 동작은 유지했으며 앱 전체 테마 전환은 후속으로 남겼다.
- 사용자와 UI 제안 항목을 이어서 결정했다. 본문 15px/보조 12px/섹션 17px/페이지 제목 22px/주요 숫자 20–28px, 쿨 뉴트럴 라이트 테마, 기존 다크 팔레트, 절제된 카드/강조 모달 그림자, 다음 행동을 제시하는 빈 상태, 짧고 중립적인 보조 피드백을 반응형 시안과 설계 문서에 반영했다. 양 테마의 텍스트·버튼·상태 라벨 대비를 계산했고, 수정 시안을 390/900/1280px에서 브라우저로 재검증했다. 제품 UI 접근성 검증은 남아 있다. 당시 라이선스 검토가 끝나지 않아 시안은 시스템 글꼴을 사용했으며, 이후 확인 결과는 아래 항목과 같다.
- A2Z 제작자 안내에서 SIL OFL 1.1을, 눈누 항목에서 상업 이용·수정·재배포 허용 및 폰트 자체 단독 판매 금지를 확인했다. 원본 WOFF2의 내장 저작권 표기(`Copyright © 2026 PT&`)를 확인하고, 9개 WOFF2 굵기를 미리보기와 웹 앱에서 자체 호스팅하며 각 폰트 폴더에 OFL 전문을 동봉했다.
- 2026-10-07 사용자 지시에 따라 Android PWA 실기기 인증 검증을 보류하고 웹사이트 기능 개발을 우선하도록 작업 상태를 변경했다. Netlify 제안서를 재검토해 정적 export Deploy Preview를 먼저 검증하고, 필요가 입증되기 전에는 Web/Desktop 이중 빌드 및 Next.js 서버 기능을 도입하지 않는 권고를 기록했다.
- Netlify 사전검증에서 앱 브랜치의 일반 production build, 주요 정적 경로와 참조 자산, OAuth callback 테스트 5개를 확인했다. 빌드를 막던 lint 위반 두 건도 최소 수정했다. PWA manifest/service worker는 없다.
- 로컬 앱 브랜치와 원격 `main`의 차이를 검토해 최신 앱 코드·문서를 통합하고 push했다. 루트 `.gitignore`에 `.worktrees/` 및 일반 로컬 환경 파일 규칙을 보존해 중첩 worktree가 실수로 추적되지 않도록 했다.
- GitHub import 화면에서 `main` Production 배포를 피하고 Netlify CLI로 검증된 `out`을 Draft Deploy했다. 사용자가 루트/`/auth` 로그인, callback 안내, 비로그인 대시보드 차단 동작을 확인했다. 익명 HTTP의 401은 Edge Access에 의한 것이다. GitHub 자동 배포/프로덕션 배포는 시작하지 않았다.
- 로컬 Supabase URL과 Legacy anon 키가 형식상 서로 맞고 실제 대시보드 값과 동일함을 확인했다. Draft OAuth allowlist 추가는 미실행이며, 사용자가 오늘 작업을 마치기로 해 다음 세션으로 넘겼다.

## 2026-10-06
- 로컬 브라우저 Google OAuth를 실제 검증하고 중복 code 교환 및 React Strict Mode cleanup 문제를 수정했다. 로그인 UI를 `/auth`로 단일화하고 dashboard layout 인증 gate를 추가했으며 root 이동과 비로그인 직접 접근 차단을 확인했다. Android PWA 실기기 검증은 남아 있다.
- Web/PWA 작업 체크리스트를 실제 상태에 맞게 동기화했다. Phase 1 run은 target SHA 및 동일-SHA review/test 산출물이 없어 미완료 상태를 유지한다.
- 사용자가 ChronoLedger를 과제 제출물이 아닌 개인 프로젝트로 진행하기로 결정했다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제외하고 기존 승인 기술·기능 기준(Supabase PostgreSQL, Next.js 정적 export, 회원 기능 및 사용자/관리자 구분)을 유지하도록 기획·상세 설계·진행/인수인계 문서를 갱신했다.
- 승인 SRS/SPEC/SCHEMA를 기반으로 런타임 경계, 데이터 책임, RPC, 핵심 흐름, 보안·오류 처리 및 요구사항별 검증 설계를 정리한 `docs/detailed-design.md`를 추가했다. 미승인 구현 선택은 미결정으로 기록했다.
- 사용자 결정에 따라 예산 집계와 경고 계산은 공유 클라이언트 도메인 함수에서 수행하고 온라인 RLS 조회/허용된 오프라인 캐시에 같은 규칙을 적용하도록 상세 설계를 보완했다.
- 계정 삭제 서버 경로는 Netlify 채택 시 Netlify 서버 함수를 사용하는 방향으로 기록했다. Netlify 채택 자체와 실패 복구 정책은 별도 결정으로 남겼다.
- Netlify/Web·Desktop 빌드 제안은 보류하고 Web/PWA MVP를 현재 승인 기준으로 진행하기로 한 사용자 결정을 기록했다.
- 오프라인 읽기 캐시는 계정별 IndexedDB에 최근 조회 데이터를 두고 로그아웃/세션 만료 때 제거하기로 결정했다. 보존 기간과 재동기화 규칙은 미결정으로 남겼다.
- 계정 삭제 부분 실패는 삭제 대기 상태를 보존하고 서버 재시도로 처리하기로 결정했다. 대기 중 계정 접근 및 worker 구조는 후속 설계로 남겼다.
- 삭제 대기 중에는 세션을 유지하되 일반 데이터/기능 접근을 차단하고 상태 화면만 허용하며, 서버/RLS 경계에서도 제한하기로 결정했다.
- 계정 삭제 재시도는 실패 간격을 늘려 완료까지 자동 반복하고 삭제 대기 상태를 유지하기로 결정했다. worker 구조와 완료 알림은 미결정으로 남겼다.
- 계정 삭제가 끝나면 완료 화면과 등록 이메일 알림을 제공하기로 결정했다. 이메일 전송 경로와 수신 주소 보관·삭제 시점은 미결정으로 남겼다.
- 삭제 알림 주소 사본은 저장하지 않는다. 데이터/Storage 정리 후 Auth 삭제 전에 진행 상태 메일을 보내고, Auth 삭제 실패 시 상태 화면에서 알리며 Auth 삭제만 재시도하기로 했다.
- 게임 구독 해제 중 Storage 삭제가 실패하면 대기 작업과 서버 재시도를 두고 Storage 정리 성공 후 구독 행을 제거하기로 했다. 대기 UI는 미결정으로 남겼다.
- 게임 구독 정리 대기 중에는 목록에 “삭제 처리 중”으로 표시하고 중복 해제를 막기로 했다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성만 미결정으로 명시했다. Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스/Tauri 정적 export 및 Web/PWA 우선 순서는 기존 결정대로 유지한다.
- 성능 측정의 기준 기기를 중급 Android 실기기로 정했다. 네트워크·데이터 규모·수치 목표는 후속으로 확정한다.
- 오프라인 캐시는 고정 TTL 없이 다음 성공 동기화까지 유지하고 마지막 동기화 시각을 표시하며, 네트워크 복귀 시 관련 데이터를 즉시 재조회하기로 했다.
- `.worktrees/phase1-setup`에서 브라우저 Google OAuth PKCE callback 및 실패 상태 처리를 구현하고 단위 테스트를 추가했다. 실제 Supabase provider/Redirect URL 기반 end-to-end 인증은 미검증으로 기록했다.
- 구현 우선순위를 명확히 표시했다: Web/PWA 브라우저 OAuth callback 및 PKCE 처리를 먼저 진행하고, Tauri OAuth 딥링크는 Web/PWA MVP 이후로 둔다. Copilot 프로필 확인은 사용자 환경 검증 과제로 분리했다.
- UI 디자인 시트와 한국어 정적 목업을 승인 SRS와 대조해 UI 참조로 아키텍처/to-do에 추가했다. 기능 규칙은 호환되며, 반응형/동작은 미구현 시안으로 남겼다.
- Netlify 아키텍처 문서를 제안 상태로 기록했다. 사용자 결정 전까지 SRS 및 실행 빌드 구조는 바꾸지 않는다.
- VS Code GitHub Copilot 저장소 지침과 Maker/Reviewer 프로필을 추가하고 협업 사용 안내, 아티팩트 규약, 아키텍처, 인수인계, 체크리스트를 갱신했다. 자동 AI 호출 및 VS Code 환경에서의 프로필 인식/동일-SHA 실행은 미검증이다.

## 2026-10-05

- 사용자와 합의한 Web/Android PWA 우선 개발 순서를 `docs/to-do.md`에 반영했다. Windows Tauri 지원은 유지하고 데스크톱 OAuth 딥링크 및 패키징을 Web/PWA MVP 후속 단계로 옮겼다.
- 진행 현황 및 인수인계의 다음 작업 순서를 갱신했다.

## 2026-10-03

- 테스트 프로젝트의 읽기 전용 메타데이터를 `SCHEMA.sql`과 대조했다. 핵심 테이블, 컬럼, RLS/정책, RPC 권한, 트리거 및 인코딩이 대체로 일치함을 확인했다.
- 사용자가 확인·승인한 프로젝트에 `user-icons` 버킷을 생성하고 private, 102,400 bytes, `image/webp` 설정을 확인했다.
- 사용자가 `md/TESTS.sql` rollback-only smoke suite를 `ON_ERROR_STOP=1`로 실행했다. 최종 `PASS: all smoke-test fixtures and mutations rolled back` 출력으로 선행 검증 통과와 fixture 롤백을 확인했다.
- `docs/to-do.md`의 Phase 0.6을 완료하고 설계 단계 진입을 승인했다. 전체 SRS 수용 기준의 상세 테스트 케이스와 성능 목표는 설계 단계에서 정한다.
- 갱신된 Gemini 진행표를 작업 트리와 재검토했다. Tauri v2와 shadcn 설정은 반영됐지만 OAuth callback 화면, PKCE 교환 및 Windows 딥링크 수신에 누락이 있어 인증 완료 판정을 보류하고 관련 과제를 `docs/to-do.md`에 기록했다.
## 2026-10-02

- `docs/to-do_Gemini.md`와 `phase1-setup` 작업 트리를 대조해 구현 초안, 미확인된 DB 배포 주장, 미완료 리뷰/테스트 증거, 계획의 Tauri v2와 작업 트리 v3 alpha 불일치를 `docs/to-do.md`에 기록했다. 후속 검증 항목을 추가했다.
- 낡은 제안·검토 문서 2개(`md/fix-proposals.md`, `md/revisions_and_decisions_review.md`)를 삭제했다. 최신 요구사항 문서와 명시적인 역사 기록으로 연결된 검토 자료는 유지했다.
- 초보 개발자를 위한 AI 협업 안내서를 추가했다. Maker/Reviewer/Orchestrator 역할, PowerShell run 생성, 동일 Target SHA 검토·시험, 안전 규칙 및 현재 수동 연동 제약을 설명한다.

- 오프라인 정책 선택(캐시 조회 허용, 온라인 복귀 후 만료 처리)을 반영하고 SRS v1 초안을 작성했다.
- 예정 취소/결제 환불 원인 및 복구 가능성을 분리하고, 참조 무결성 트리거와 가입 시 기본 재무·지갑 초기화 트리거를 SQL 초안에 추가했다.
- 포인트 적립을 공식 정산 보장이 없는 앱 예상치로 정리하고 기능 명세 및 인수인계 내용을 최신 결정에 맞췄다.
- 복구된 과거 예정 취소 항목의 재표시와 수동 포인트 보정 이후 환불 원장 처리를 사용자와 확정하고 결정 문서에 반영했다. 통합 문서와 SQL의 기준 우선순위도 명확히 했다.
- 계정 삭제 시 개인 데이터와 비공개 아이콘을 삭제하고 공용 카탈로그/일정은 보존하도록 요구사항을 확정했다. 개별 지출 삭제 금지의 계정 삭제 예외와 Storage 정리 작업을 명시했다.
- 예산 0원은 미설정으로 보고 80%/100% 비율 경고와 초과 확인을 생략하기로 결정해 SRS 및 기능 명세에 반영했다.
- 예산을 넘기는 등록뿐 아니라 예상액을 증가시키는 수정·복구·결제 변경 전에도 확인을 요구하도록 확정하고 명세했다.
- 포인트 적립은 Google/Galaxy Store를 실제 결제수단으로 고른 경우에만 발생하도록 확정했다. WALLET 결제 + 포인트 사용은 적립하지 않으며 기준을 SQL 초안에도 반영했다.
- 구독 템플릿 비활성화 시 생성된 미결제 회차는 취소하고 재활성화해도 자동 복구하지 않으며, 명시적 복구를 허용하도록 확정했다.
- 구독 템플릿 자체의 물리 삭제도 금지하고 비활성화만 허용하도록 확정해 SRS와 RLS 초안을 갱신했다.
- SRS 검토의 사용자 결정, 작업 위치, 파일 변경, 검증 미수행 상태 및 다음 절차를 `docs/srs-review-checkpoint.md`에 저장해 재개 지점으로 지정했다.
- SQL 실행 검증과 자동 테스트는 수행하지 않았다.

- SKILL의 토큰/맥락 부족 대응 절차를 추가해 사용자에게 사전 알림하고 `docs/progress.md`에 체크포인트를 저장하도록 했다.
- 개발 세션마다 프로젝트 진행 현황을 기록하도록 했다.
- SKILL이 지정한 아키텍처·인수인계·할 일·주의사항 문서를 `docs/`로 이동하고, 문서 간 경로 참조를 갱신했다.

- SRS 준비도 검토를 기록하고, 기획/DDL 불일치 해결 전 설계 단계 진입 및 SRS 승인을 보류했다. `docs/to-do.md`에 Phase 0 요구사항 게이트를 추가했다.

- 주요 기획 차단 항목의 충돌, 사용자 영향, 결정 사항 및 완료 기준을 `md/planning-blockers.md`에 정리했다.
- 사용자가 작성한 차단 항목 결정안을 검토했다. 오프라인 만료 모달 충돌, 포인트 계산 표현, 참조 소유권 및 초기화 트리거 누락을 별도 검토 문서에 기록하고 승인 SRS는 보류했다.
- 멀티 에이전트 협업 설계의 병목과 파일 프로토콜, 반복 종료 조건 및 적용 범위에 관한 검토 의견을 `md/multi_agent_collaboration_architecture_review.md`에 기록했다.
- 사용자가 보완한 최종 설계안을 다시 검토해 이전 지적의 반영을 확인하고, 공유 작업 트리에서 `git reset --hard`를 자동 실행할 때의 데이터 손실 위험과 안전 대안을 추가했다.
- 협업 실행용 run/review/test Schema와 아티팩트 규약, 사용자 보고서 템플릿, 깨끗한 Git 상태에서만 격리 worktree를 생성하는 PowerShell 스크립트를 추가했다. 설계안은 자동 강제 reset 대신 실패 상태 보존을 사용하도록 수정했다.
- (2026-10-02 당시 상태) SRS §5~§10 검토를 완료하고 플랫폼 범위를 Windows 데스크톱/Android PWA로 확정했다. 당시 SQL 실행 검증은 보류 중이었으며 2026-10-03 기록에서 완료 및 설계 진입 승인으로 갱신됐다.
