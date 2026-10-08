# 통합 기획 및 아키텍처 명세서 (revisions_and_decisions.md)

본 문서는 데스크톱(Tauri v2) 및 모바일(PWA) 크로스 플랫폼 가계부 & 게임 스케줄 통합 관리 애플리케이션의 기획 및 아키텍처 명세서입니다[cite: 5, 9]. 내장 SQL에 대한 정적 검토에서 확인된 결함을 반영했으며, 아래 SQL은 실제 PostgreSQL/Supabase 실행 검증을 거치지 않았습니다. 사용자 결정은 문서 말미에 정리합니다.

본 문서는 제품 비전과 기획 결정을 기록한다. 상세 요구사항은 `md/SRS.md`, 기능/UI 요약은 `md/SPEC.md`, 실행 가능한 DB 초안은 `md/SCHEMA.sql`을 각각 기준으로 삼는다. 문서 간 충돌이 있으면 최신 날짜의 결정 보완과 SRS를 우선하며, 아래 복사된 과거 SQL은 참고용이다.

## 프로젝트 목적 결정 (2026-10-06)

- 사용자는 ChronoLedger를 과제 제출물이 아닌 개인 프로젝트로 진행하기로 결정했다. 과제 조건(SQLite, Node.js 웹서버, 게시판)은 제품 요구사항에 추가하지 않는다.
- 기존 승인 기준은 변경하지 않는다. DB는 Supabase PostgreSQL을 사용하고, 앱은 이메일/Google 회원 기능과 일반 사용자/관리자 역할을 포함한다. 기존 SRS의 Next.js 정적 export 및 Android PWA/Windows Tauri v2 범위도 유지한다.
- 이 결정만으로 Netlify 채택, Web/Desktop 빌드 분리 또는 별도의 상시 실행 Node.js 서버를 채택하지 않는다. 해당 항목은 이미 기록된 별도 결정 상태를 따른다.

## 웹 개발 우선순위 및 Netlify 검토 (2026-10-07)

- 사용자는 Android PWA 실기기 검증을 미루고 웹사이트 개발을 우선하기로 했다. 모바일 범위나 SRS 요구사항을 취소한 것이 아니며, 실기기 인증 검증만 후순위다.
- 사용자는 Netlify를 웹 배포 후보로 고려한다. 기존 제안서 재검토 결과 Netlify는 타당한 우선 후보지만 최종 채택 전 Deploy Preview 검증을 한다.
- 초기 검증 권고는 현재 승인된 Next.js 정적 export를 Netlify에서 제공하는 최소 경로다. Netlify의 Next.js 서버 기능 지원만으로 Web/Tauri 이중 빌드를 확정하지 않는다. 정적 export가 구체 요구를 충족하지 못한다는 검증 증거가 생길 때 빌드 분리와 SRS 변경을 다시 결정한다.
- 권한 있는 계정 정리 등 서버 작업에는 Netlify Functions를 검토할 수 있으나, 내구성 있는 작업 저장·멱등성·재시도·모니터링은 별도 설계 조건이다. 이 기록은 아직 Netlify 배포 플랫폼이나 서버 기능 채택을 확정하지 않는다.

## 계정 삭제 서버 경계 구현 선택 (2026-10-08)

- 사용자는 계정 삭제 작업에 한해 Netlify Functions를 서버 경계로 채택하고, Supabase에 저장하는 내구성 queue와 예약 worker 재시도를 승인했다. 이 결정은 Netlify 전체 웹 호스팅 채택이나 Next.js 정적 export 변경, Web/Desktop 빌드 분리를 뜻하지 않는다.
- 이메일 전달은 Resend API와 삭제 작업별 안정적인 idempotency key를 사용한다. 별도 이메일 주소 사본은 저장하지 않는다.
- Resend의 idempotency 보장 기간(24시간)을 넘어 발송 결과가 불명확하면 중복 발송을 피하기 위해 자동 재발송하지 않고 `MANUAL_REVIEW` 상태로 전환한다. 이때 개인 데이터 접근은 계속 차단하며 운영자 확인이 필요하다. exactly-once 이메일 전송을 보장한다고 주장하지 않는다.
- 실제 Supabase migration/RLS/Storage, Netlify 예약 실행, Resend 계정·발신 도메인 및 비밀 환경 변수는 배포 전후로 별도 검증해야 한다. 비밀값은 저장소에 두지 않는다.

---

## 1. 프로젝트 비전 및 시스템 아키텍처 원칙

### 1.1 프로젝트 목표
* **통합 관리**: 게임 버전/픽업 스케줄과 가계부(확정 지출, 예정 지출, 정기 구독, 스토어 포인트 지갑)를 유기적으로 결합.
* **단일 코드베이스**: Next.js 14+ App Router 기반의 단일 프론트엔드로 데스크톱 로컬 애플리케이션(Tauri v2 / `.exe`)과 모바일 웹 앱(PWA) 동시 서빙[cite: 5, 9].
* **극단적 단순성 (Simplicity First)**: 복잡한 인게임 상품 카탈로그나 불필요한 시각 요소(서버 점검, 달력 타일 내 금액 난립 등)를 철저히 배제하고 본질적인 과금 통제와 가시성에 집중[cite: 1].
* **철저한 회계 무결성**: 클라이언트 분할 쓰기를 폐기하고 단일 PostgreSQL RPC 트랜잭션과 엄격한 DB CHECK 제약조건을 통해 데이터 정합성 보장[cite: 12, 13, 14].

### 1.2 시스템 아키텍처 구성도
```text
┌────────────────────────────────────────────────────────┐
│            프론트엔드 클라이언트 (Next.js 14+)           │
│   - Desktop: Tauri v2 (.exe, output: 'export' 정적 빌드) │
│   - Mobile : Web PWA (반응형 뷰, 바텀 시트)              │
└───────────────────────────┬────────────────────────────┘
                            │ (Supabase 클라이언트 SDK 전용 호출)
                            ▼
┌────────────────────────────────────────────────────────┐
│             BaaS 인프라 (Supabase Cloud)               │
│  ├─ Auth     : 이메일/비밀번호 + Google OAuth (Deep Link)│
│  ├─ Storage  : 256x256 WebP 아이콘 버킷                │
│  ├─ Database : PostgreSQL 15+ (12개 핵심 테이블)       │
│  ├─ RPC/Trg  : 원자적 결제/환불 RPC, 버전 동기화 트리거 │
│  └─ RLS      : JWT app_metadata 기반 관리자/유저 격리   │
└────────────────────────────────────────────────────────┘
```

---

## 2. 핵심 비즈니스 로직 및 회계 엔진 명세

### 2.1 자산 및 월별 예산 관리
* **총 보유 자산 (`user_finances.total_asset`)**:
  * 메인 대시보드 우측 히어로 사이드바 상단에 현재 내 통장/현금 총 잔고를 표시.
  * 신용카드 결제 및 마이너스 통장 잔고를 허용하기 위해 음수 잔고(`CHECK (total_asset >= 0)` 제거)를 수용[cite: 15].
  * 사용자는 `total_asset`을 직접 갱신할 수 없다. 초기 설정과 잔액 정정은 전용 RPC로 수행하고, 결제·환불 RPC가 회계 변동을 반영한다.
  * **과거 내역 소급 입력 안전장치**: 지출 등록 팝업에 `[현재 자산에서 차감]` 체크박스(`deduct_from_asset`)를 제공[cite: 12].
    * 신규 당일 결제: 결제일 기본값은 KST 오늘이며 차감 체크 기본 상태로, 결제 완료 시 `total_asset`에서 실결제액 차감.
    * 과거 내역 소급 입력: 사용자가 결제일을 과거로 바꾸면 차감 체크 기본 해제 $\to$ 통장 잔고는 보존하고 해당 결제일의 월 지출 통계에만 반영하여 이중 차감 방지[cite: 12]. 사용자가 날짜를 입력하되 KST 오늘 이후 날짜는 RPC에서 거부한다.
* **월별 예산 (`monthly_budgets`)**:
  * 사용자별 연/월 단위 독립 예산 레코드 관리[cite: 9, 10].
  * 특정 월의 양수 예산 레코드가 없을 경우(행이 없거나 금액이 0원인 경우) `user_finances.default_budget`을 폴백(기본값)으로 적용한다. 적용 예산도 0원이면 예산 미설정으로 보고 비율 경고와 초과 확인을 생략한다.
* **소비 상한선 경고 공식**:
  $$\text{당월 총 예상 소비액} = \sum(\text{당월 확정 지출}) + \sum(\text{당월 남은 예정 지출})$$
  * 월 귀속은 공통으로 `CONFIRMED`는 `target_date` 월, `PLANNED`는 `COALESCE(end_date, target_date)` 월을 사용하고 `CANCELLED`는 제외한다. SQL, 화면 집계, 예산 경고가 같은 규칙을 사용한다.
  * 총 예상액이 당월 예산의 80% 도달 시 주의 배너, 100% 초과 시 위험 알림을 제공한다. 예상액을 증가시켜 100%를 초과하게 하는 등록·수정·복구·결제 변경은 저장/확정 전에 최종 확인을 요구한다.
  * 적용 예산이 0원이면 미설정으로 보고 비율 경고 및 초과 확인을 생략한다.

### 2.2 스토어 포인트 지갑 및 감사 원장 체계
* **지원 포인트 지갑**: 실제 포인트 잔액이 있는 `GOOGLE_PLAY`, `GALAXY_STORE`를 각각 별도 지갑과 거래 원장으로 관리한다[cite: 9, 10].
* **결제 수단 분리**: `payment_method`는 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`만 허용한다. `WALLET`은 사용자가 관리하는 보유 자산에서 결제하는 방식이며, 스토어 결제는 해당 스토어를 적립 플랫폼으로 사용한다.
  * `WALLET` 결제와 Google Play 또는 Galaxy Store 포인트 사용은 한 지출에서 함께 허용한다. 실제 포인트 출처는 `point_platform`에 별도로 기록한다.
* **원장 분리 및 무결성 격리**:
  * `store_point_transactions` 및 `store_wallets`의 직접 쓰기 RLS를 차단하고 `SELECT`만 허용[cite: 13, 14].
  * 모든 결제, 취소, 수동 보정은 오직 전담 DB RPC 함수를 통해서만 단일 트랜잭션으로 실행[cite: 12, 14, 15].
* **포인트 입력 및 단위 분리 규격**:
  * 포인트 수량(P)과 포인트 할인 금액(원)을 완전히 분리하여 수식 제약조건을 강제[cite: 15, 16].
  * 결제 등록 모달에서 **[할인 금액(원)]**, **[포인트 할인액(원)]**, **[소모 포인트(P)]**를 분리 입력[cite: 15].
  * **Google Play**: 한국 등급별 적립률은 브론즈 0.10%, 실버 0.11%, 골드 0.13%, 플래티넘 0.16%, 다이아몬드 0.20%로 적용한다. 이는 공식 안내의 ₩1,000당 1, 1.10, 1.30, 1.60, 2P에 대응한다. 기본 등급은 브론즈다. [Google Play 한국 등급 및 적립률](https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DKR&hl=ko)
  * 제휴 게임 특수 쿠폰(예: 250P로 5,000원권 교환)은 포인트 할인액과 소모 포인트를 분리 입력해 수용한다.
  * **Galaxy Store**: 1P = 1원(KRW) 1:1 차감. 계정 탭에서 본인의 적립률(%) 상시 수동 편집 가능.
* **정밀 회계 공식**:
  $$\text{실결제액(final\_amount)} = \text{정가} - \text{일반할인액} - \text{포인트할인액} \quad (\text{단, } \text{final\_amount} \ge 0) \text{[cite: 15]}$$
  $$\text{적립포인트(earned\_points)} = \operatorname{round}(\text{실결제액} \times (\text{earn\_rate} / 100))$$
  * 적립률은 결제 시 잠근 지갑 설정에서 읽고, 클라이언트가 확정 금액이나 적립 포인트를 결정하지 않는다. 포인트 스토어(`point_platform`)와 실제 결제 수단(`payment_method`)은 별도 값이다. Google Play/Galaxy Store 결제는 해당 스토어를 적립 플랫폼으로 사용하고, 카드 등으로 결제하면서 포인트를 함께 쓴 경우에는 사용 포인트의 플랫폼을 별도로 지정한다.
* **결제 취소/환불 원칙 (어뷰징 차단)**:
  * 결제 취소 시 사용 포인트 반환과 적립 포인트 회수를 순서대로 처리하고 각 원장 행에 해당 시점 잔액을 기록한다. 적립 포인트 회수 후 잔액이 음수가 되면 전체 환불을 롤백한다[cite: 15].

### 2.3 정기 구독 및 지연 생성 (Lazy Generation)
* **관리 대상**: 월정액 상품 및 정기 결제 서비스 (`subscription_templates`)[cite: 11].
* **지연 생성 메커니즘**:
  * 유료 크론 스케줄러를 배제하고, 사용자가 당월 캘린더에 접속하는 순간 클라이언트가 미생성 `is_active = true` 템플릿 항목을 감지하여 당월 `PLANNED` 지출로 자동 생성(`INSERT`)[cite: 10, 11]. 재생성은 명시적 사용자 액션으로만 수행한다.
* **중복 생성 및 좀비 레코드 원천 차단**:
  * `expenses` 테이블에 `billing_cycle VARCHAR(7)`(예: `'2026-10'`) 컬럼을 도입하고 `UNIQUE(template_id, billing_cycle)` 인덱스를 적용하여 일자 변경 시의 중복 재생성을 원천 차단[cite: 15, 16].
  * 특정 달의 구독 지출 취소 시 행을 `DELETE`하지 않고 `status = 'CANCELLED'`로 갱신하여 무한 재생성 루프를 차단[cite: 12, 13, 15].
* **말일 결제일 보정 공식**:
  $$\text{target\_date} = \min(\text{billing\_day}, \text{LastDayOfMonth}(\text{year}, \text{month})) \text{[cite: 11]}$$

### 2.4 게임 카탈로그 및 일정 관리 (승인 요청 시스템)
* **공용 게임 카탈로그 (`games`)**: 관리자만 정식 등록/수정/삭제 가능(`app_metadata.role = 'admin'`)[cite: 8, 11].
  * 게임 추가 제안은 별도 `game_requests` 행으로 접수하고 관리자 승인 시 `games`에 등록한다. `games.status`는 정식 카탈로그 상태를 나타내며 요청 대기 상태는 `game_requests.request_status`에 둔다.
* **관리자 일정 승인 시스템 (`schedule_requests`)**:
  * 공용 게임 일정은 관리자가 등록한 데이터가 해당 게임을 구독한 모든 유저의 캘린더에 공유 노출됨[cite: 9, 13].
  * 일반 유저는 추가 및 수정(`target_schedule_id` 지정) 요청 폼을 제출하며, 관리자가 전용 승인/반려 RPC로 처리[cite: 16].
* **일정 분류 (`schedule_type`)의 극단적 단순화**:
  * 가계부 과금 계획과 무관한 서버 점검(`MAINTENANCE`) 및 잡다한 일반 이벤트(`EVENT`)를 완전히 제거[cite: 7].
  * 오직 **`VERSION` (버전 업데이트 기간)**과 **`PICKUP` (캐릭터 픽업 기간)** 2종만 지원.
  * 요청에는 메모를 저장한다. 승인·반려 RPC는 관리자 권한, `PENDING` 상태, 요청 게임과 대상 일정의 게임 일치를 확인하고 일정 반영 및 상태 전환을 원자적으로 수행한다.
* **게임 추가 요청 (`game_requests`)**:
  * 승인 시 게임을 공용 카탈로그에만 추가한다. 요청자를 `user_games`에 자동 등록하지 않으며, 기본 아이콘은 관리자가 승인 시 지정한다.
* 커스텀 아이콘은 업로더 개인용이다. `user_games.custom_icon_path`에는 공개 URL이 아니라 비공개 버킷 내 객체 경로를 저장하고, 인증된 소유자만 읽고 교체한다. PNG/JPG/JPEG/WebP 원본은 최대 5 MiB까지 받고, 클라이언트에서 256×256 WebP로 변환한다. 변환 결과가 100 KiB를 넘으면 업로드를 거부하고 용량 초과 안내를 표시한다.

### 2.5 게임 지출 및 일정 연동 모델
* **계층형 지출 등록 플로우**:
  * `[카테고리: 게임]` $\to$ `[내 게임 목록 선택]` $\to$ `[전체 버전 / 픽업 기간 필터 / 기타]`를 통해 일정을 선택하고 예산을 바인딩. 전반/후반은 별도 DB `phase` 값 없이 날짜 범위 기반 화면 필터로 제공한다.
* **게임 지출 세부 품목 단순화**:
  * 패스 및 월정액을 제외한 일반 게임 과금(트럭, 패키지 등)은 복잡한 인게임 상품 카탈로그를 두지 않고, 화면과 통계에는 오직 **`[게임명] + [지출 금액]`**만 표기[cite: 1].
  * 구체적으로 어떤 상품을 샀는지는 강제 선택창 없이 사용자가 자유롭게 입력하는 **`[메모(memo)]`** 필드로만 확인[cite: 1].
* **일정 바인딩 지출의 개별 상품 분리 및 잔여액 자동 차감**:
  * 특정 일정(`schedule_id`) 아래에 여러 건의 예정 지출(예: 트럭 119,000원, 패키지 33,000원)을 개별 레코드로 등록[cite: 8].
  * 트럭 결제 시 해당 건만 `CONFIRMED`로 전환되며, 남은 예정액 합계는 33,000원으로 자동 갱신[cite: 7].
* **두 달에 걸치는 일정의 예산 이월/차감 연동**:
  * 픽업 일정이 10월 25일 ~ 11월 12일인 경우, 미결제 상태인 `PLANNED` 상품들은 종료일이 속한 **11월 예산**에 예정액으로 집계[cite: 14].
  * 10월 28일에 실제 결제(`CONFIRMED`)하면 결제일이 10월 28일로 확정되어 **10월 실제 지출**로 반영되며, 11월 예정액 목록에서는 자동으로 제외되어 11월 예상 소비액이 즉시 차감됨[cite: 13, 14].
* **DB 트리거 기반 일정 동기화**:
  * 관리자가 공용 `VERSION` 또는 `PICKUP` 일정 날짜를 변경하면 DB 트리거(`trg_sync_version_expenses`)가 연결된 `PLANNED` 지출의 `start_date`, `end_date`, `target_date`를 동기화한다. 비교는 NULL 안전하게 수행하며 `CONFIRMED` 지출은 보존한다.
  * 이미 결제된 **`status = 'CONFIRMED'` 항목은 과거 회계 기록이므로 절대 일정을 자동으로 변경하지 않음**[cite: 9, 10, 11].

---

## 3. 화면 UI/UX 및 캘린더 인터랙션 규격

### 3.1 캘린더 타일 미니멀리즘 정책
* **타일 내부 금액/지출 표시 완전 배제**:
  * 월간 달력 타일 칸 내부에는 난잡한 금액 숫자(`-119,000원` 등) 및 일반 지출 도트를 완전히 배제.
  * 타일에는 오직 등록된 게임의 **[20x20px 정규화 아이콘]**과 기간을 나타내는 **[배너 바(Bar)]**만 노출.
* **개인 메모 힌트 도트**:
  * 사용자가 개인 일정/메모를 등록한 경우(`personal_memos`), 해당 날짜 타일 우측 상단에 눈에 띄지 않는 작은 **미니멀 도트(Dot)** 1개만 표기.

### 3.2 우측 '히어로 사이드바 (Hero Sidebar)' 중심 인터페이스
우측 30% 영역은 소프트웨어 전체의 **핵심 비주얼 사령탑(Hero Section)**으로 기능.
* **상단**: 총 자산 잔고 스냅샷, 이번 달 설정 예산 대비 실시간 소비 진행률 게이지 바 (80% 주의 / 100% 위험 시각화).
* **중단**: 스토어 포인트 잔액 위젯 (Google Play / Galaxy Store 잔액 카드 및 등급별 적립률 표시).
* **하단**: 달력에서 선택한 날짜의 상세 지출 내역(게임명, 실결제액, 품목 메모), 미결제 예정액 목록, 작성된 개인 메모 전문 출력.

### 3.3 모바일 레이아웃 (PWA)
* **상단**: 스와이프 가능한 필터 칩 (`전체`, `버전 일정`, `픽업 배너`).
* **중앙**: 간소화된 캘린더 그리드 (배너 바 중심으로 렌더링).
* **하단 바텀 시트 (Drawer)**: 날짜 또는 배너 터치 시 위로 슬라이드업되며 상세 소비 내역 확인 및 빠른 결제 등록 버튼 제공[cite: 7].
* **오프라인**: 인증 세션이 유효한 동안 캐시된 데이터 조회만 허용한다. 지출 쓰기는 비활성화하며, 세션이 만료되면 캐시된 개인정보를 표시하지 않는다.

---

## 4. 데이터베이스 스키마 및 보안 명세 (`SCHEMA.sql`)

총 12개 핵심 테이블과 사용자 RPC 및 승인 RPC, 동기화 트리거, 제한적 RLS 정책으로 구성된 통합 DDL 초안입니다[cite: 15, 16]. 실제 DB 적용 전 별도 재현 검증이 필요합니다.

```sql
-- ==============================================================================
-- SCHEMA.sql (통합 초안: 12개 핵심 테이블, RPC, 트리거, RLS)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 재정 상태 (총 자산 및 기본 예산, 음수 자산 허용)
CREATE TABLE public.user_finances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    total_asset BIGINT NOT NULL DEFAULT 0, -- 음수 잔고 허용
    default_budget BIGINT NOT NULL DEFAULT 0 CHECK (default_budget >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 월별 소비 예산
CREATE TABLE public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    budget_amount BIGINT NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- 3. 공용 게임 마스터 카탈로그
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    default_icon_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status = 'APPROVED'),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게임 추가 요청 (승인된 게임만 games 카탈로그에 생성)
CREATE TABLE public.game_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    memo TEXT,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_memo TEXT,
    approved_game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 유저별 구독 게임 및 커스텀 아이콘
CREATE TABLE public.user_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    custom_icon_path TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

-- 5. 게임 공용 일정 (버전 및 픽업 기간 한정)
CREATE TABLE public.game_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    memo TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_schedule_dates CHECK (end_date >= start_date)
);

-- 6. 일반 유저 일정 추가/수정 건의 요청 테이블
CREATE TABLE public.schedule_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    target_schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL, -- 수정 요청 시 대상 일정
    title VARCHAR(150) NOT NULL,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('VERSION', 'PICKUP')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    memo TEXT,
    admin_memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_req_dates CHECK (end_date >= start_date)
);

-- 7. 유저 개인 캘린더 메모 (타일 도트 힌트용)
CREATE TABLE public.personal_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memo_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 정기 구독 결제 템플릿
CREATE TABLE public.subscription_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '정기 구독',
    billing_day SMALLINT NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
    default_price BIGINT NOT NULL DEFAULT 0 CHECK (default_price >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 스토어 포인트 지갑
CREATE TABLE public.store_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    current_balance BIGINT NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    earn_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.10 CHECK (earn_rate BETWEEN 0 AND 100),
    user_tier VARCHAR(30),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform),
    CONSTRAINT chk_wallet_platform_settings CHECK (
        (platform = 'GOOGLE_PLAY' AND user_tier IS NOT NULL
            AND user_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')
            AND earn_rate = CASE user_tier
                WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
                WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END)
        OR (platform = 'GALAXY_STORE' AND user_tier IS NULL)
    )
);

-- 10. 가계부 지출 내역
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.subscription_templates(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(7), -- YYYY-MM 형식 정기 구독 식별자
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('게임', '정기 구독', '식비/카페', '교통/이동', '생활/쇼핑', '기타')),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('CONFIRMED', 'PLANNED', 'CANCELLED')),
    target_date DATE NOT NULL,
    start_date DATE,
    end_date DATE,
    original_price BIGINT NOT NULL DEFAULT 0 CHECK (original_price >= 0),
    discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    point_discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (point_discount_amount >= 0),
    used_points BIGINT NOT NULL DEFAULT 0 CHECK (used_points >= 0),
    earned_points BIGINT NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
    final_amount BIGINT NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
    point_platform VARCHAR(30) CHECK (point_platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE')),
    deduct_from_asset BOOLEAN NOT NULL DEFAULT true,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_expense_period CHECK (
        (start_date IS NULL AND end_date IS NULL) OR 
        (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
    ),
    CONSTRAINT chk_expense_math CHECK (
        final_amount = original_price - discount_amount - point_discount_amount AND
        point_discount_amount <= (original_price - discount_amount)
    )
);
ALTER TABLE public.expenses ADD CONSTRAINT chk_expense_earned_points_platform
    CHECK (earned_points = 0 OR point_platform IS NOT NULL);

-- 멱등성 보장 인덱스: 동일 구독 템플릿의 같은 월 중복 생성 원천 차단
CREATE UNIQUE INDEX idx_expenses_template_billing_cycle 
    ON public.expenses(template_id, billing_cycle) 
    WHERE template_id IS NOT NULL AND billing_cycle IS NOT NULL;

ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_billing_cycle
    CHECK (billing_cycle IS NULL OR billing_cycle ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_point_platform
    CHECK ((used_points = 0 AND point_discount_amount = 0)
        OR (used_points > 0 AND point_discount_amount > 0 AND point_platform IS NOT NULL));
ALTER TABLE public.subscription_templates ADD CONSTRAINT chk_subscription_payment_method
    CHECK (payment_method IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE'));
ALTER TABLE public.personal_memos ADD CONSTRAINT chk_personal_memo_content
    CHECK (length(btrim(content)) > 0);

-- 11. 스토어 포인트 거래 원장 (Ledger)
CREATE TABLE public.store_point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('GOOGLE_PLAY', 'GALAXY_STORE')),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('USE', 'EARN', 'MANUAL_ADJUST', 'REFUND')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 보강
CREATE INDEX idx_expenses_user_target_date ON public.expenses(user_id, target_date);
CREATE INDEX idx_expenses_schedule_id ON public.expenses(schedule_id);
CREATE INDEX idx_game_schedules_dates ON public.game_schedules(start_date, end_date);
CREATE INDEX idx_personal_memos_user_date ON public.personal_memos(user_id, memo_date);
CREATE INDEX idx_store_point_transactions_user_platform ON public.store_point_transactions(user_id, platform);
CREATE INDEX idx_schedule_requests_status ON public.schedule_requests(request_status);
CREATE INDEX idx_game_requests_status ON public.game_requests(request_status);

-- ==============================================================================
-- 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거
-- ==============================================================================

-- 1. 결제 전담 RPC (IDOR 방어 및 expenses 상태 갱신 일원화)
CREATE OR REPLACE FUNCTION public.process_expense_payment(
    p_expense_id UUID,
    p_original_price BIGINT,
    p_discount_amount BIGINT,
    p_point_discount_amount BIGINT,
    p_used_points BIGINT,
    p_point_platform VARCHAR(30),
    p_payment_method VARCHAR(30),
    p_deduct_asset BOOLEAN,
    p_payment_date DATE
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_final_amount BIGINT;
    v_earned_points BIGINT := 0;
    v_earn_rate NUMERIC(5, 2);
    v_wallet_balance BIGINT;
    v_new_balance BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense
    FROM public.expenses
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND OR v_expense.status <> 'PLANNED' THEN
        RAISE EXCEPTION '결제할 수 있는 본인 소유의 예정 지출이 아닙니다.';
    END IF;

    IF p_original_price IS NULL OR p_discount_amount IS NULL OR p_point_discount_amount IS NULL
       OR p_used_points IS NULL OR p_deduct_asset IS NULL OR p_payment_date IS NULL
       OR p_original_price < 0 OR p_discount_amount < 0 OR p_point_discount_amount < 0 OR p_used_points < 0
       OR p_discount_amount + p_point_discount_amount > p_original_price THEN
        RAISE EXCEPTION '결제 금액 입력이 올바르지 않습니다.';
    END IF;
    IF p_payment_method IS NULL OR p_payment_method NOT IN ('WALLET', 'GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 결제 수단입니다.';
    END IF;
    IF p_payment_method IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_point_platform IS DISTINCT FROM p_payment_method THEN
        RAISE EXCEPTION '스토어 결제의 포인트 플랫폼은 결제 스토어와 같아야 합니다.';
    END IF;
    IF p_payment_date > (NOW() AT TIME ZONE 'Asia/Seoul')::date THEN
        RAISE EXCEPTION '미래 날짜로 결제할 수 없습니다.';
    END IF;
    IF p_used_points = 0 AND p_point_discount_amount <> 0 THEN
        RAISE EXCEPTION '포인트 사용 정보가 서로 일치하지 않습니다.';
    END IF;
    IF p_used_points > 0 AND (p_point_discount_amount = 0 OR p_point_platform IS NULL OR p_point_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')) THEN
        RAISE EXCEPTION '포인트 플랫폼과 할인 금액을 확인해 주세요.';
    END IF;
    IF p_point_platform IS NOT NULL AND p_point_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') THEN
        RAISE EXCEPTION '지원하지 않는 포인트 플랫폼입니다.';
    END IF;
    IF p_payment_method NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') AND p_used_points = 0 AND p_point_platform IS NOT NULL THEN
        RAISE EXCEPTION '포인트를 사용하지 않는 결제에는 포인트 플랫폼을 지정할 수 없습니다.';
    END IF;

    v_final_amount := p_original_price - p_discount_amount - p_point_discount_amount;

    -- 사용 포인트 지갑을 잠그고 적립률도 서버에서 읽는다.
    IF p_point_platform IS NOT NULL THEN
        SELECT current_balance, earn_rate INTO v_wallet_balance, v_earn_rate
        FROM public.store_wallets
        WHERE user_id = v_user_id AND platform = p_point_platform
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION '포인트 지갑 설정이 없습니다.'; END IF;
    END IF;

    IF p_used_points > 0 THEN
        SELECT current_balance INTO v_wallet_balance 
        FROM public.store_wallets 
        WHERE user_id = v_user_id AND platform = p_point_platform FOR UPDATE;

        IF v_wallet_balance IS NULL OR v_wallet_balance < p_used_points THEN
            RAISE EXCEPTION '포인트 잔액이 부족합니다.';
        END IF;

        v_new_balance := v_wallet_balance - p_used_points;
        UPDATE public.store_wallets 
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = p_point_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, p_point_platform, p_expense_id, 'USE', -p_used_points, v_new_balance, '결제 포인트 사용');
        
        v_wallet_balance := v_new_balance;
    END IF;

    IF p_point_platform IS NOT NULL THEN
        v_earned_points := ROUND(v_final_amount * v_earn_rate / 100);
    END IF;
    IF v_earned_points > 0 THEN
        v_new_balance := coalesce(v_wallet_balance, 0) + v_earned_points;
        
        UPDATE public.store_wallets
        SET current_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = v_user_id AND platform = p_point_platform;

        INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
        VALUES (v_user_id, p_point_platform, p_expense_id, 'EARN', v_earned_points, v_new_balance, '결제 적립 포인트');
    END IF;

    -- 총 자산 차감 처리
    IF p_deduct_asset THEN
        UPDATE public.user_finances
        SET total_asset = total_asset - v_final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    -- expenses 상태 CONFIRMED 원자적 갱신
    UPDATE public.expenses
    SET status = 'CONFIRMED',
        original_price = p_original_price,
        discount_amount = p_discount_amount,
        point_discount_amount = p_point_discount_amount,
        used_points = p_used_points,
        payment_method = p_payment_method,
        deduct_from_asset = p_deduct_asset,
        target_date = p_payment_date,
        point_platform = p_point_platform,
        earned_points = v_earned_points,
        final_amount = v_final_amount
    WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. 결제 취소/환불 전담 RPC (포인트 회수 검증 및 자산 복원)
CREATE OR REPLACE FUNCTION public.refund_expense_payment(
    p_expense_id UUID
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense public.expenses%ROWTYPE;
    v_wallet_balance BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;

    SELECT * INTO v_expense FROM public.expenses 
    WHERE id = p_expense_id AND user_id = v_user_id FOR UPDATE;

    IF v_expense.id IS NULL OR v_expense.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION '취소할 수 있는 확정 결제 내역이 아닙니다.';
    END IF;

    -- 포인트 롤백 (적립 포인트 기사용 시 취소 거부)
    IF (v_expense.used_points > 0 OR v_expense.earned_points > 0) AND v_expense.point_platform IS NOT NULL THEN
        SELECT current_balance INTO v_wallet_balance 
        FROM public.store_wallets 
        WHERE user_id = v_user_id AND platform = v_expense.point_platform FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION '환불 대상 포인트 지갑이 없습니다.';
        END IF;

        v_wallet_balance := coalesce(v_wallet_balance, 0);
        IF v_wallet_balance + v_expense.used_points - v_expense.earned_points < 0 THEN
            RAISE EXCEPTION '적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다.';
        END IF;

        IF v_expense.used_points > 0 THEN
            v_wallet_balance := v_wallet_balance + v_expense.used_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', v_expense.used_points, v_wallet_balance, '결제 취소 포인트 반환');
        END IF;

        IF v_expense.earned_points > 0 THEN
            v_wallet_balance := v_wallet_balance - v_expense.earned_points;
            UPDATE public.store_wallets SET current_balance = v_wallet_balance, updated_at = NOW()
            WHERE user_id = v_user_id AND platform = v_expense.point_platform;
            INSERT INTO public.store_point_transactions(user_id, platform, expense_id, transaction_type, amount, balance_after, memo)
            VALUES (v_user_id, v_expense.point_platform, p_expense_id, 'REFUND', -v_expense.earned_points, v_wallet_balance, '결제 취소 적립 포인트 회수');
        END IF;
    END IF;

    -- 총 자산 복원 처리
    IF v_expense.deduct_from_asset THEN
        UPDATE public.user_finances
        SET total_asset = total_asset + v_expense.final_amount, updated_at = NOW()
        WHERE user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION '사용자 자산 설정이 없습니다.'; END IF;
    END IF;

    UPDATE public.expenses SET status = 'CANCELLED' WHERE id = p_expense_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. 지갑 설정 변경 RPC (등급 및 적립률)
CREATE OR REPLACE FUNCTION public.update_store_wallet_settings(
    p_platform VARCHAR(30),
    p_tier VARCHAR(30),
    p_earn_rate NUMERIC(5, 2)
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE') OR p_earn_rate IS NULL OR p_earn_rate < 0 THEN
        RAISE EXCEPTION '지갑 플랫폼 또는 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GOOGLE_PLAY' AND (
        p_tier NOT IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') OR
        p_earn_rate IS DISTINCT FROM CASE p_tier
            WHEN 'BRONZE' THEN 0.10 WHEN 'SILVER' THEN 0.11 WHEN 'GOLD' THEN 0.13
            WHEN 'PLATINUM' THEN 0.16 WHEN 'DIAMOND' THEN 0.20 END
    ) THEN
        RAISE EXCEPTION 'Google Play 등급 또는 공식 적립률이 올바르지 않습니다.';
    END IF;
    IF p_platform = 'GALAXY_STORE' AND (p_tier IS NOT NULL OR p_earn_rate > 100) THEN
        RAISE EXCEPTION 'Galaxy Store 등급 또는 적립률이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_tier, p_earn_rate, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET user_tier = p_tier, earn_rate = p_earn_rate, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 지갑 잔액 수동 보정 RPC
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_platform VARCHAR(30),
    p_target_balance BIGINT,
    p_memo TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_diff BIGINT;
    v_current BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다.';
    END IF;
    IF p_platform IS NULL OR p_platform NOT IN ('GOOGLE_PLAY', 'GALAXY_STORE')
       OR p_target_balance IS NULL OR p_target_balance < 0 THEN
        RAISE EXCEPTION '플랫폼 또는 목표 잔액이 올바르지 않습니다.';
    END IF;

    INSERT INTO public.store_wallets(user_id, platform, user_tier, earn_rate)
    VALUES (v_user_id, p_platform,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE NULL END,
        0.10)
    ON CONFLICT (user_id, platform) DO NOTHING;
    SELECT current_balance INTO v_current
    FROM public.store_wallets 
    WHERE user_id = v_user_id AND platform = p_platform FOR UPDATE;

    v_diff := p_target_balance - v_current;

    INSERT INTO public.store_wallets(user_id, platform, current_balance, user_tier, earn_rate, updated_at)
    VALUES (v_user_id, p_platform, p_target_balance,
        CASE WHEN p_platform = 'GOOGLE_PLAY' THEN 'BRONZE' ELSE NULL END,
        0.10, NOW())
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET current_balance = p_target_balance, updated_at = NOW();

    INSERT INTO public.store_point_transactions(user_id, platform, transaction_type, amount, balance_after, memo)
    VALUES (v_user_id, p_platform, 'MANUAL_ADJUST', v_diff, p_target_balance, coalesce(p_memo, '수동 잔액 보정'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 자산과 기본 예산 초기 설정/정정 RPC
CREATE OR REPLACE FUNCTION public.set_user_finance_settings(
    p_total_asset BIGINT,
    p_default_budget BIGINT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION '인증되지 않은 사용자입니다.'; END IF;
    IF p_total_asset IS NULL OR p_default_budget IS NULL OR p_default_budget < 0 THEN
        RAISE EXCEPTION '자산 또는 기본 예산 입력이 올바르지 않습니다.';
    END IF;
    INSERT INTO public.user_finances(user_id, total_asset, default_budget, updated_at)
    VALUES (v_user_id, p_total_asset, p_default_budget, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_asset = EXCLUDED.total_asset,
        default_budget = EXCLUDED.default_budget,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 버전/픽업 일정 날짜 변경에 따른 예정 지출 동기화 트리거 함수
CREATE OR REPLACE FUNCTION public.sync_version_expenses_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schedule_type IN ('VERSION', 'PICKUP')
       AND (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
        UPDATE public.expenses
        SET start_date = NEW.start_date,
            end_date = NEW.end_date,
            target_date = NEW.end_date
        WHERE schedule_id = NEW.id AND status = 'PLANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_version_expenses
AFTER UPDATE ON public.game_schedules
FOR EACH ROW EXECUTE FUNCTION public.sync_version_expenses_trigger();

-- 관리자 전용 요청 승인/반려 RPC. 일정 반영과 요청 상태 전환은 한 트랜잭션으로 처리한다.
CREATE OR REPLACE FUNCTION public.approve_schedule_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request public.schedule_requests%ROWTYPE;
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;
    SELECT * INTO v_request FROM public.schedule_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 일정 요청이 아닙니다.';
    END IF;
    IF v_request.target_schedule_id IS NULL THEN
        INSERT INTO public.game_schedules(game_id, title, schedule_type, start_date, end_date, memo)
        VALUES (v_request.game_id, v_request.title, v_request.schedule_type, v_request.start_date, v_request.end_date, v_request.memo);
    ELSE
        UPDATE public.game_schedules
        SET title = v_request.title, schedule_type = v_request.schedule_type,
            start_date = v_request.start_date, end_date = v_request.end_date, memo = v_request.memo,
            updated_at = NOW()
        WHERE id = v_request.target_schedule_id AND game_id = v_request.game_id;
        IF NOT FOUND THEN RAISE EXCEPTION '요청 대상 일정이 없거나 게임이 일치하지 않습니다.'; END IF;
    END IF;
    UPDATE public.schedule_requests SET request_status = 'APPROVED' WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_schedule_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;
    UPDATE public.schedule_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 일정 요청이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.approve_game_request(p_request_id UUID, p_default_icon_url TEXT)
RETURNS UUID AS $$
DECLARE
    v_request public.game_requests%ROWTYPE;
    v_game_id UUID;
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;
    SELECT * INTO v_request FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR v_request.request_status <> 'PENDING' THEN
        RAISE EXCEPTION '승인 대기 중인 게임 요청이 아닙니다.';
    END IF;
    IF p_default_icon_url IS NULL OR btrim(p_default_icon_url) = '' THEN
        RAISE EXCEPTION '게임 기본 아이콘이 필요합니다.';
    END IF;
    INSERT INTO public.games(name, default_icon_url, created_by)
    VALUES (v_request.name, p_default_icon_url, auth.uid())
    RETURNING id INTO v_game_id;
    UPDATE public.game_requests SET request_status = 'APPROVED', approved_game_id = v_game_id
    WHERE id = p_request_id;
    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.reject_game_request(p_request_id UUID, p_admin_memo TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION '관리자 권한이 필요합니다.';
    END IF;
    UPDATE public.game_requests SET request_status = 'REJECTED', admin_memo = p_admin_memo
    WHERE id = p_request_id AND request_status = 'PENDING';
    IF NOT FOUND THEN RAISE EXCEPTION '반려할 게임 요청이 아닙니다.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================== 
-- RLS 격리 및 보안 정책
-- ==============================================================================

ALTER TABLE public.user_finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_point_transactions ENABLE ROW LEVEL SECURITY;

-- games 정책
CREATE POLICY "Allow public read approved games" ON public.games FOR SELECT USING (status = 'APPROVED');
CREATE POLICY "Allow admin manage games" ON public.games FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Storage 버킷은 비공개로 생성한다. 설정: 최대 102,400 bytes, 허용 MIME `image/webp`.
-- 클라이언트는 PNG/JPG/JPEG/WebP 원본(최대 5 MiB)을 256x256 WebP(최대 100 KiB)로 변환해 업로드한다.
-- Storage 정책은 storage.objects에 별도 적용한다.
CREATE POLICY "Users read own icons" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own icons" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own icons" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own icons" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'user-icons' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own game requests" ON public.game_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_game_id IS NULL);
CREATE POLICY "Users read own game requests" ON public.game_requests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Admin manage game requests" ON public.game_requests FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- game_schedules 정책 (공용 읽기, 관리자만 쓰기)
CREATE POLICY "Allow public read schedules" ON public.game_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage schedules" ON public.game_schedules FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- schedule_requests 정책 (유저는 본인 등록/조회만, 관리자는 전체 검토)
CREATE POLICY "Users insert own requests" ON public.schedule_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL);
CREATE POLICY "Users read own requests" ON public.schedule_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage requests" ON public.schedule_requests FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 개인 데이터 기본 격리 (auth.uid() = user_id)
CREATE POLICY "Read own finances" ON public.user_finances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Manage own budgets" ON public.monthly_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own user_games" ON public.user_games FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own memos" ON public.personal_memos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own templates" ON public.subscription_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read own expenses" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own planned expenses" ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
CREATE POLICY "Update own planned expenses" ON public.expenses FOR UPDATE TO authenticated
    USING (auth.uid() = user_id AND status = 'PLANNED')
    WITH CHECK (auth.uid() = user_id AND status = 'PLANNED' AND earned_points = 0 AND used_points = 0);
CREATE POLICY "Delete own planned expenses" ON public.expenses FOR DELETE TO authenticated
    USING (auth.uid() = user_id AND status = 'PLANNED');

-- 원장 및 지갑: 일반 유저는 직접 수정 불가, 오직 SELECT만 허용 (RPC를 통해서만 쓰기 허용)
CREATE POLICY "Read own wallets" ON public.store_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Read own point transactions" ON public.store_point_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER 함수는 기본 PUBLIC 실행 권한을 회수하고 필요한 인증 사용자에게만 허용한다.
REVOKE ALL ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_expense_payment(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_schedule_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_schedule_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_game_request(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_game_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_expense_payment(UUID, BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, VARCHAR, BOOLEAN, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_expense_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_wallet_settings(VARCHAR, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(VARCHAR, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_finance_settings(BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_schedule_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_schedule_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_game_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_game_request(UUID, TEXT) TO authenticated;
```

---

## 5. 구현 체크리스트 (`to-do.md` 최신 개정판)

```markdown
# 구현 체크리스트 (to-do.md)

### Phase 1. 환경 세팅, 테스트 인프라 및 Tauri 스파이크
- [ ] 1.1 Next.js 14+ (App Router) 정적 export 프로젝트 초기화
  - 대상 파일: `package.json`, `next.config.mjs`, `src/app/layout.tsx`
  - 작업: `output: 'export'` 설정, `images.unoptimized: true` 설정, Tailwind 보일러플레이트 세팅
  - verify: `npm run build` 실행 시 에러 없이 `out/` 정적 디렉터리가 생성되는지 확인
- [ ] 1.2 Vitest 단위 테스트 환경 구성
  - 대상 파일: `vitest.config.ts`, `package.json`
  - 작업: `vitest`, `@testing-library/react` 설치 및 기본 단언문 테스트 등록
  - verify: `npm run test` 실행 시 테스트 환경이 100% 통과하는지 확인
- [ ] 1.3 Tauri v2 데스크톱 초기화 및 정적 빌드 스파이크
  - 대상 파일: `src-tauri/tauri.conf.json`
  - 작업: `npm run tauri init` 수행 후 정적 `out/` 디렉터리를 가리키도록 설정
  - verify: `npm run tauri dev` 실행 시 데스크톱 윈도우 창에 Next.js 화면이 정상 로딩되는지 확인
- [ ] 1.4 shadcn/ui 컴포넌트 라이브러리 세팅
  - 대상 파일: `components.json`, `src/components/ui/`
  - 작업: Button, Dialog, Card, Input, Select, Progress, Drawer(바텀시트) 설치
  - verify: 버튼 및 카드 컴포넌트가 화면에 깨짐 없이 렌더링되는지 확인
- [ ] 1.5 Supabase 클라이언트 SDK 싱글톤 구성
  - 대상 파일: `.env.local`, `src/lib/supabase/client.ts`
  - 작업: 서버 쿠키 세션을 배제하고 `@supabase/supabase-js` 싱글톤 브라우저 클라이언트 유틸 작성
  - verify: 브라우저 콘솔에서 Supabase 클라이언트 초기화 에러가 없는지 확인

---

### Phase 2. 데이터베이스 스키마, RPC 및 RLS 배포
- [ ] 2.1 12개 핵심 테이블 DDL 마이그레이션 적용
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: Supabase 대시보드 SQL 에디터에서 통합 DDL 스크립트 실행
  - verify: 12개 테이블 및 유니크 인덱스가 Table Editor에 에러 없이 생성되었는지 확인
- [ ] 2.2 결제/환불, 지갑, 요청 승인 RPC 및 일정 동기화 트리거 배포
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: `process_expense_payment`, `refund_expense_payment`, 지갑 설정/보정 RPC, 게임·일정 승인/반려 RPC, 트리거 등록
  - verify: 결제/환불 RPC의 금액·잔액·상태 검증과 게임/일정 승인 원자성 확인
- [ ] 2.3 RLS 보안 격리 및 원장 쓰기 봉쇄 검증
  - 대상 파일: `md/SCHEMA.sql`
  - 작업: 일반 사용자 역할/JWT로 자산, 확정 지출, 지갑, 원장 및 요청 승인 상태에 직접 쓰기를 시도
  - verify: RPC만 허용된 변경은 직접 쓰기에서 RLS/권한 오류로 차단되는지 확인
- [ ] 2.4 재현 가능한 DB/RPC/RLS 검증 케이스 준비
  - 대상 파일: `md/TESTS.sql`, `md/SCHEMA.sql`
  - 작업: 테스트 역할/JWT, 초기 데이터, 실행 순서, 각 케이스의 기대 성공/실패 결과를 문서화
  - verify: 결과를 재실행할 수 있고, 실행하지 않은 케이스는 PASS로 표시하지 않는지 확인
- [ ] 2.5 TypeScript Database 타입 자동 생성
  - 대상 파일: `src/types/database.types.ts`
  - 작업: `npx supabase gen types typescript` 실행
  - verify: `Database['public']['Tables']['personal_memos']['Row']` 타입이 정상 임포트되는지 확인

---

### Phase 3. 인증(Auth), 구글 로그인 및 딥링크
- [ ] 3.1 이메일 가입/로그인 및 구글 OAuth 연동
  - 대상 파일: `src/app/auth/page.tsx`, `src/lib/auth-context.tsx`
  - 작업: 이메일 폼 및 Google 로그인 버튼 연동
  - verify: 웹 환경에서 구글 로그인 성공 후 대시보드로 정상 이동하는지 확인
- [ ] 3.2 데스크톱(Tauri) Deep Link 콜백 핸들러 구성
  - 대상 파일: `src-tauri/tauri.conf.json`, `src/lib/tauri-auth.ts`
  - 작업: `tauri-plugin-deep-link` 연동 및 `myapp://auth/callback` 리스너 작성
  - verify: 외부 브라우저에서 인증 후 데스크톱 앱 창으로 세션 토큰이 전달되어 로그인되는지 확인

---

### Phase 4. 게임 마스터, 256x256 아이콘 및 요청 시스템
- [ ] 4.1 클라이언트 Canvas 256x256 WebP 리사이징 모듈
  - 대상 파일: `src/lib/image-resizer.ts`
  - 작업: PNG/JPG/JPEG/WebP 입력(원본 5 MiB 이하)을 1:1 중앙 크롭 후 Canvas로 256×256 WebP 변환 (Safari 폴백 포함)
  - verify: 각 허용 입력이 256×256 WebP로 변환되고, 100 KiB 초과 결과는 업로드가 거부되며 사용자에게 안내되는지 확인
- [ ] 4.2 Supabase Storage `user-icons` 버킷 업로드 연동
  - 대상 파일: `src/lib/storage-upload.ts`
  - 작업: 비공개 `user-icons` 버킷 안에 `{user_id}/{game_id}.webp` 고정 객체 경로를 사용하고 소유자만 인증 조회/교체/삭제하도록 설정. 로그인 세션으로 다운로드한 Blob을 앱에서 표시하고 업로드 후 다시 가져온다.
  - verify: 소유자 경로 정책이 타 사용자 읽기/쓰기 요청을 거부하고 `image/webp`, 102,400 bytes 이하 결과만 업로드하며 교체 후 새 이미지가 표시되는지 확인
- [ ] 4.3 공용 게임 카탈로그 구독 및 커스텀 아이콘 등록 UI
  - 대상 파일: `src/components/game/game-select-modal.tsx`
  - 작업: 공용 `games` 중 내 게임으로 `user_games`에 등록 및 커스텀 아이콘 교체 기능 구현
  - verify: 내 게임 목록에 추가된 게임이 커스텀 아이콘과 함께 표시되는지 확인
- [ ] 4.4 일반 유저 게임/일정 추가·수정 요청 모달 및 관리자 승인 UI
  - 대상 파일: `src/components/game/schedule-request-modal.tsx`, `src/app/admin/requests/page.tsx`
  - 작업: 게임 요청(`game_requests`)과 일정 요청(`schedule_requests`)을 분리하고 승인/반려 RPC 연동
  - verify: 승인 요청의 상태 변경과 카탈로그/일정 반영이 원자적으로 완료되는지 확인

---

### Phase 5. 미니멀 캘린더 코어, 개인 메모 및 Lazy Generation
- [ ] 5.1 날짜 연산 코어 및 말일 보정 함수 작성
  - 대상 파일: `src/lib/calendar-utils.ts`
  - 작업: 6주 캘린더 그리드 및 `getAdjustedBillingDate(year, month, billingDay)` 구현
  - verify: 31일 결제일이 2월 평년은 28일, 윤년은 29일, 4월은 30일로 산출되는지 Vitest로 검증
- [ ] 5.2 정기 구독 멱등성 보장 지연 생성 (Lazy Generation)
  - 대상 파일: `src/lib/subscription-sync.ts`
  - 작업: 당월 캘린더 로드 시 누락된 `is_active = true` 템플릿만 자동 INSERT (`billing_cycle` 기반 유니크 제약 연동); 취소 회차는 자동 재생성하지 않음
  - verify: 새로고침을 여러 번 하거나 동시 접속해도 `expenses`에 동일 월 구독 지출이 1건만 생성되는지 확인
- [ ] 5.3 미니멀 데스크톱 캘린더 (금액 완전 배제, 버전/픽업 배너 및 메모 도트)
  - 대상 파일: `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/schedule-banner.tsx`
  - 작업: 타일 내부 금액 텍스트 완전 제거, 게임 아이콘, 버전/픽업 배너 바, 개인 메모 힌트 도트 렌더링 구현
  - verify: 캘린더 타일 칸에 숫자가 뜨지 않고 배너 바와 아이콘, 메모 도트만 깔끔하게 표시되는지 확인
- [ ] 5.4 우측 히어로 사이드바 (Hero Area) 및 모바일 바텀 시트
  - 대상 파일: `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/mobile-drawer.tsx`
  - 작업: 총 자산 잔고, 월 예산 진행률 바, 스토어 포인트 카드, 선택일 상세 지출 내역 및 개인 메모 전문 렌더링
  - verify: 날짜 클릭 시 해당 일자의 지출 목록(게임명 + 금액)과 메모가 히어로 사이드바에 즉시 표시되는지 확인

---

### Phase 6. 가계부, 결제/환불 RPC 연동 및 포인트 지갑
- [ ] 6.1 스토어 포인트 지갑 위젯 및 계정 등급 설정
  - 대상 파일: `src/components/wallet/store-wallet-widget.tsx`, `src/app/settings/page.tsx`
  - 작업: `update_store_wallet_settings` RPC 연동(구글 등급별 적립률, 갤럭시 적립률 수정) 및 잔액 수동 보정 UI 구현
  - verify: 설정 변경 시 지갑 레코드가 정상 갱신되고 수동 보정 시 원장에 `MANUAL_ADJUST`가 기록되는지 확인
- [ ] 6.2 정밀 결제 모달 및 `process_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-modal.tsx`
  - 작업: 계층형 등록(카테고리 $\to$ 게임 $\to$ 버전/픽업 탭), `WALLET`/`GOOGLE_PLAY`/`GALAXY_STORE` 결제수단, 할인/포인트할인 분리 입력, 자산 차감 토글 및 RPC 호출
  - verify: 정가 119,000원, 쿠폰 5,000원(250P 소모) 입력 시 실결제액 114,000원 산출 및 잔액 차감 확인
- [ ] 6.3 결제 취소/환불 UI 및 `refund_expense_payment` 연동
  - 대상 파일: `src/components/expense/expense-detail-modal.tsx`
  - 작업: 지출 상세에서 [결제 취소] 클릭 시 환불 RPC 호출 (포인트 반환, 적립 회수, 자산 복원)
  - verify: 적립 포인트를 이미 써서 잔액이 부족한 경우 환불 거부 에러 메시지가 정상 노출되는지 확인

---

### Phase 7. 일정 동기화, 만료 처리 및 최종 빌드
- [ ] 7.1 게임 버전/픽업 패스 일정 안전 동기화 검증
  - 대상 파일: `md/SCHEMA.sql` (트리거 검증)
  - 작업: 관리자가 버전 또는 픽업 일정의 시작일·종료일을 변경했을 때 DB 트리거 동작 확인
  - verify: 연결된 `PLANNED` 지출의 시작일·종료일·예정일만 동기화되고 `CONFIRMED` 지출은 보존되는지 확인
- [ ] 7.2 두 달에 걸치는 픽업 일정의 예산 이월/차감 연동 및 만료 모달
  - 대상 파일: `src/components/expense/overdue-planned-modal.tsx`, `src/lib/budget-calculations.ts`
  - 작업: 미결제 항목은 종료일 속한 달의 예산으로 배정, 이전 달 결제 시 익월 예정액에서 자동 차감 및 만료 처리 구현
  - verify: 10/25~11/12 픽업 지출을 10월에 결제했을 때 11월 총 예상 소비액이 즉시 줄어드는지 확인
- [ ] 7.3 PWA 매니페스트 및 오프라인 방어 배너
  - 대상 파일: `public/manifest.json`, `src/components/ui/offline-banner.tsx`
  - 작업: PWA 홈 화면 추가 설정, 유효한 인증 세션의 캐시 조회만 허용하고 오프라인 시 지출 쓰기를 비활성화
  - verify: 세션 만료 시 캐시된 개인정보가 표시되지 않고 결제 등록 버튼이 잠기는지 확인
- [ ] 7.4 Tauri v2 데스크톱 최종 배포 빌드 검증
  - 대상 파일: `src-tauri/tauri.conf.json`
  - 작업: `npm run tauri build` 실행 및 Windows 독립 실행 파일(`.exe`) 추출
  - verify: 추출된 실행 파일을 단독 실행하여 로그인, 캘린더 배너, 결제 등록이 정상 동작하는지 확인
```

---

## 6. 개발 주의사항 및 엣지 케이스 (`known-pitfalls.md` 요약)

1. **Next.js 정적 Export와 Next/Image 충돌**:
   * Tauri 데스크톱 정적 배포(`output: 'export'`)에서는 Node.js 이미지 최적화 서버가 동작하지 않음. `next.config.mjs`에 반드시 `images: { unoptimized: true }`를 설정해야 함[cite: 9, 13].
2. **PostgreSQL RPC 파라미터 타입 일치**:
   * 자바스크립트의 큰 숫자(원화 금액)를 Supabase RPC로 넘길 때 부동소수점 오차가 발생하지 않도록 `Math.floor()`를 적용하고 `BIGINT` 타입 규격을 엄격히 유지할 것[cite: 3].
3. **적립 포인트 기사용 시 환불 불가 안내**:
   * 결제 취소 시 적립되었던 포인트가 이미 사용되어 지갑 잔액이 부족하면 DB 수준에서 환불이 차단되므로, 프론트엔드에서 적절한 예외 안내 팝업을 노출해야 함[cite: 15].
4. **캘린더 그리드 렌더링 성능 최적화**:
   * 월간 캘린더에서 버전/픽업 배너 바를 그릴 때 일자별로 중복 계산하지 않도록 `useMemo`를 활용해 월별 일정 배열을 1회만 평탄화(Flatten)하여 렌더링할 것.
5. **비공개 Storage 아이콘 조회**:
   * `user-icons`는 비공개 버킷이므로 `getPublicUrl`을 사용하지 않는다. 로그인된 소유자 세션으로 객체를 내려받아 표시하고, 새 업로드 후 다시 조회한다.

---

## 7. 검토 반영 상태와 구현 전 검증

검토 문서의 정적 분석 결과를 반영해 결제 RPC의 지출 잠금·상태 검증·서버 금액 계산, 포인트 플랫폼 분리, 환불 원장 잔액 순서, 예정 지출 직접 쓰기 제한, 자산 직접 변경 차단, RPC 권한 회수/부여, 요청 메모와 승인 RPC, 일정 동기화, 지갑 보정, 집계 규칙, 구독 멱등성 및 스키마 제약을 명세와 DDL 초안에 반영했다. 실제 SQL 실행과 회귀 검증은 아직 수행하지 않았다.

확정된 결정: 관리자 승인 후 공용 일정이 모든 사용자에게 노출된다. 일정 종류는 `VERSION`/`PICKUP`만 지원하며, 전반/후반 픽업은 기간 필터로 제공하고 DB `phase`는 두지 않는다. 캘린더 타일에는 금액을 표시하지 않는다. 픽업도 버전과 함께 예정 지출 날짜를 동기화한다. 게임 요청 승인 시 공용 카탈로그에만 등록하며 요청자를 자동 구독시키지 않고, 관리자가 기본 아이콘을 지정한다. 관리자 권한은 Supabase 관리 콘솔/서버에서 설정하는 `app_metadata.role=admin`을 사용한다. 자산 초기 설정과 정정은 전용 RPC를 사용한다. 포인트 지갑은 Google Play/Galaxy Store별로 분리하고, 결제수단은 `WALLET`/`GOOGLE_PLAY`/`GALAXY_STORE`만 허용한다. `WALLET` 결제와 Google/Galaxy 포인트의 복합 사용을 허용하고 `point_platform`에 포인트 출처를 기록한다. Google Play 한국 공식 등급 적립률과 반올림을 적용한다. 오프라인은 유효한 인증 세션에 한해 캐시 조회를 허용하고 지출 쓰기는 금지한다. 커스텀 아이콘은 업로더만 인증 조회·교체·삭제 가능한 비공개 Storage 경로를 사용하며, PNG/JPG/JPEG/WebP 원본(최대 5 MiB)을 256×256 WebP(최대 100 KiB)로 변환한다. 변환 결과가 100 KiB를 넘으면 업로드를 거부하고 안내하며, 이미지는 로그인 세션으로 가져와 표시한다.

구현 전 검증 작업: DB/RPC 검증 체크리스트의 테스트 역할/JWT·초기 데이터·실행 순서·기대 결과를 구체화한다. 이는 실제 테스트 환경과 실행 시점에 맞춰 정한다. SQL 실행 검증은 아직 수행하지 않았다.

## 2026-10-02 요구사항 결정 보완 및 우선순위

아래 내용은 본 문서의 이전 서술 중 상충하는 부분을 대체하는 최신 결정이다. 요구사항 상세는 [SRS.md](SRS.md), UI 요약은 [SPEC.md](SPEC.md), 현재 데이터베이스 구현 초안은 [SCHEMA.sql](SCHEMA.sql)을 기준으로 한다. 본 파일에 복사되어 있는 과거 DDL은 참고용이며 최신 SQL 기준선은 `SCHEMA.sql`이다.

- 사용자가 선택한 오프라인 정책은 2번이다. 유효 세션의 캐시 읽기와 오프라인 모달 닫기를 허용하지만 오프라인 쓰기는 비활성화한다. 온라인 복귀 시 KST 오늘보다 목표일이 지난 모든 예정 지출을 조회해 처리한다.
- 예정 취소 항목을 복구해도 기존 목표일을 유지한다. 목표일이 과거이면 만료 처리 모달에 다시 포함한다. 또한 사용자는 환불 시 결제에 기록된 포인트 사용/예상 적립만 되돌리고 독립된 수동 보정 원장은 유지하는 정책을 선택했다.
- 사용자는 기존 자산 차감 토글도 유지하기로 결정했다. `deduct_from_asset=true`면 실결제액 차감 및 환불 시 복원, 오늘 결제 기본 켬, 과거 내역 기본 끔이며 사용자가 직접 바꿀 수 있다.
- 사용자는 본인 계정 삭제 시 개인 재무/지출/포인트/메모 및 비공개 아이콘을 함께 삭제하고 공용 게임/일정은 유지하기로 결정했다. 개별 지출 삭제 금지 정책은 계정이 유지되는 동안 적용한다.
- 사용자는 월별 예산 행이 없거나 월별 금액이 0원일 때 기본 예산으로 폴백하고, 최종 적용 예산도 0원이면 비율 경고와 초과 확인을 생략하기로 결정했다.
- 사용자는 월 예상 소비액을 증가시켜 100%를 넘기는 등록·수정·복구·결제 변경 전체에 저장/확정 전 최종 확인을 적용하기로 결정했다.
- 사용자는 구독 템플릿 비활성화 시 연결된 모든 미결제 예정 지출을 취소하고, 재활성화는 향후 생성만 재개하며 기존 취소 회차는 명시적으로 복구하도록 결정했다.
- 사용자는 구독 템플릿 물리 삭제를 금지하고 비활성화만 허용하기로 결정했다.
- 사용자는 `TEMPLATE_DEACTIVATION` 회차 복구는 소유 템플릿을 먼저 재활성화한 뒤 명시적으로 수행하도록 결정했다.
- 지원 플랫폼은 Windows용 Tauri v2 데스크톱 실행 파일과 Android용 PWA로 한정한다. iOS PWA는 현재 범위에서 제외한다. 구체적인 응답시간 목표는 설계 단계에서 기기·네트워크·테스트 데이터 규모를 확정한 뒤 정한다.
- 예정 취소(`PLANNED_CANCEL`)와 환불(`PAYMENT_REFUND`)은 별도 원인으로 남긴다. 예정 취소만 복구 가능하며, 사용자 지출은 물리 삭제하지 않는다.
- Google Play/Galaxy Store를 실제 결제수단으로 선택한 경우에만 선택한 스토어의 적립률로 앱 예상 포인트를 `floor(final_amount * earn_rate / 100)` 계산한다. WALLET 결제는 스토어 포인트 사용 여부와 무관하게 적립하지 않는다. Google 공식 정산 결과는 보장하지 않는다. 수동 잔액 보정은 독립 원장 기록으로 환불 시 자동 조정하지 않는다.
- 지출이 연결하는 일정은 게임 ID가 일치해야 한다. 템플릿 연결은 소유자 일치가 필수이며 양쪽 게임 ID가 설정된 경우에도 일치해야 한다.
- 만료 지출은 자동 취소하지 않는다. 온라인에서 해결 전까지 예정 소비액에 포함한다. 이동 대상은 같은 게임의 가장 가까운 미래 일정이며 예정일은 그 일정의 종료일이다.
- 실제 DDL에 없었던 `handle_new_user_setup()` 및 `auth.users` 가입 트리거를 `SCHEMA.sql`에 추가했다. 가입 시 재무 및 두 포인트 지갑을 기본값 0으로 멱등 생성하고, 월별 예산 행은 만들지 않으며 `default_budget`을 폴백한다.
- SRS는 요구사항 초안으로 작성되었으며 사용자 리뷰/승인과 DB 실행 검증 전까지 공식 승인 기준선이 아니다.
