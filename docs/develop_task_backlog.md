# ChronoLedger 개발 백로그 & 네이버페이 충전 로직 상세 설계

---

## 1. 결제 수단 및 지출(Expenses) 관리 로직

### 1.1 결제 수단 및 지갑(Wallet) 모델 확장
- **네이버페이(NAVER_PAY) 결제 수단 추가**
  - 기존 지갑(기본 현금/계좌)과 분리된 **네이버페이 전용 지갑(`Wallet` type: `NAVER_PAY`)** 생성.
  - 지갑 간 잔액 이동 및 충전 이력을 추적할 수 있도록 트랜잭션 분리.

### 1.2 네이버페이 충전 로직 상세 설계

#### (1) 기본 규칙 및 수식
- **파라미터 정의:**
  - $P$ (`payment_amount`): 결제 요청 금액
  - $B_{np}$ (`naver_pay_balance`): 네이버페이 지갑 현재 잔액
  - $B_{total}$ (`total_asset_balance`): 충전 재원이 되는 총 자산(메인 계좌/현금) 잔액
  - $U$ (`UNIT`): 충전 최소 단위 = 10,000원
- **충전 필요 금액 계산:**
  - $B_{np} \ge P$: 충전 불필요 ($R = 0$)
  - $B_{np} < P$: 부족액 $S = P - B_{np}$ 발생
    $$R = \left\lceil \frac{S}{U} \right\rceil \times U = \left\lceil \frac{P - B_{np}}{10000} \right\rceil \times 10000$$
- **자산 검증 및 잔액 변화:**
  - 총 자산 검증: $B_{total} \ge R$ 이어야 결제 가능 (부족 시 `INSUFFICIENT_TOTAL_ASSETS` 예외 처리).
  - 충전 실행: 총 자산에서 $R$만큼 차감, 네이버페이 지갑에 $R$만큼 증액.
  - 결제 실행: 네이버페이 지갑에서 $P$만큼 차감.
  - 최종 네이버페이 잔액: $B_{np}' = B_{np} + R - P$

#### (2) 처리 흐름도 (Flow)
```text
[결제 요청: 결제금액 P]
        │
        ▼
[네이버페이 잔액 B_np >= P ?]
  ├─ Yes ──> [네이버페이에서 P 차감] ──> [지출 기록 완료]
  │
  └─ No ───> [부족액 S = P - B_np 계산]
                 │
                 ▼
             [충전액 R = ceil(S / 10,000) * 10,000 계산]
                 │
                 ▼
             [총 자산 B_total >= R ?]
               ├─ No ──> [에러: 총 자산 부족으로 충전 불가]
               │
               └─ Yes ──> [모드 분기]
                            ├─ A. 자동 충전 모드: 즉시 트랜잭션 수행
                            └─ B. 단계별 게이트웨이 모드: 사용자 승인 모달 호출
                                     │
                                     ▼
                               [단일 DB 트랜잭션 실행]
                                 1) 총 자산에서 R 차감 (이체 로그 생성)
                                 2) 네이버페이 지갑에 R 충전
                                 3) 네이버페이 지갑에서 P 결제
                                 4) Expense 레코드 생성
```

#### (3) 단계별 결제 게이트웨이(Gateway) UI/UX 설계
- **Step 1 (잔액 부족 감지):** 사용자가 결제 금액 입력 후 [결제하기] 클릭 시 네이버페이 잔액 확인.
- **Step 2 (충전 안내 모달 노출):**
  - "네이버페이 잔액이 부족합니다." 안내문구 표시.
  - 현재 잔액: $B_{np}$원 / 결제 금액: $P$원 / 부족 금액: $S$원.
  - 자동 계산된 충전 금액: $R$원 (10,000원 단위 올림).
  - 충전 후 예상 네이버페이 잔액: $(B_{np} + R - P)$원.
- **Step 3 (수동 조정 및 승인):**
  - 충전 금액을 10,000원 단위로 증액할 수 있는 +/- 버튼 또는 직접 수정 기능 제공.
  - [충전 후 바로 결제] 원클릭 버튼을 통해 트랜잭션 일괄 승인.

#### (4) TypeScript 로직 구현 명세
```typescript
interface NaverPayPaymentParams {
  paymentAmount: number;     // 결제 요청 금액
  naverPayBalance: number;   // 네이버페이 현재 잔액
  totalAssetBalance: number; // 메인 자산 현재 잔액
}

interface RechargeCalculationResult {
  needsRecharge: boolean;
  shortageAmount: number;
  rechargeAmount: number;
  finalNaverPayBalance: number;
  finalTotalAssetBalance: number;
}

const RECHARGE_UNIT = 10_000;

export function calculateNaverPayPayment({
  paymentAmount,
  naverPayBalance,
  totalAssetBalance,
}: NaverPayPaymentParams): RechargeCalculationResult {
  if (paymentAmount <= 0) {
    throw new Error("결제 금액은 0원보다 커야 합니다.");
  }

  // 잔액이 충분한 경우
  if (naverPayBalance >= paymentAmount) {
    return {
      needsRecharge: false,
      shortageAmount: 0,
      rechargeAmount: 0,
      finalNaverPayBalance: naverPayBalance - paymentAmount,
      finalTotalAssetBalance: totalAssetBalance,
    };
  }

  // 잔액이 부족한 경우: 부족분 및 1만원 단위 올림 충전액 계산
  const shortageAmount = paymentAmount - naverPayBalance;
  const rechargeAmount = Math.ceil(shortageAmount / RECHARGE_UNIT) * RECHARGE_UNIT;

  // 총 자산 검증
  if (totalAssetBalance < rechargeAmount) {
    throw new Error("총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.");
  }

  return {
    needsRecharge: true,
    shortageAmount,
    rechargeAmount,
    finalNaverPayBalance: (naverPayBalance + rechargeAmount) - paymentAmount,
    finalTotalAssetBalance: totalAssetBalance - rechargeAmount,
  };
}
```

### 1.3 결제 선택 계층 플로우
- **2단계 종속 셀렉트 구조:**
  1. `결제 플랫폼`: `구글 플레이(GOOGLE_PLAY)`, `갤럭시 스토어(GALAXY_STORE)`, `기타(ETC)`
  2. `결제 수단`: `기본 지갑(DEFAULT_WALLET)`, `네이버페이(NAVER_PAY)`
- 플랫폼 선택에 따라 지원되는 결제 수단 및 혜택/수수료 옵션이 연동되도록 구성.

### 1.4 지출(Expenses) 자동 계산 및 수동 수정 보장
- 플랫폼 수수료, 할인율, 지갑 잔액 차감 등 기본 계산값을 기본 입력값으로 자동 완성(Auto-fill).
- 사용자가 언제든지 최종 지출 금액, 수수료, 실결제액을 직접 오버라이드(수정)할 수 있도록 필드 수정 권한 개방.

---

## 2. 홈 대시보드 및 일자별 상세 모달

### 2.1 VERSION 일정 노출 조건 개선
- 대시보드의 특정 일자 클릭 시 열리는 상세 보기에서, `category === 'VERSION'`인 일정은 **해당 일정의 `start_date`와 선택일이 정확히 일치하는 경우에만** 배지/항목 노출.
- 진행 중인 기간 동안 매일 노출되어 화면이 혼잡해지는 현상 방지.

### 2.2 게임 지출 등록 시 버전 자동 바인딩
- 선택일 상세 모달에서 게임 지출을 추가할 때:
  - `start_date <= 선택일 <= end_date` 조건을 만족하는 버전 일정을 자동 탐색.
  - 일치하는 버전이 존재하면 `[연결할 버전 일정]` 드롭다운에서 해당 버전을 기본값으로 자동 바인딩.
  - 선택일을 포함하는 버전 일정이 없는 경우, 해당 선택 필드를 비활성화(`disabled`) 처리

### 2.3 게임 일정 타이틀 필드 매핑 정상화
- 선택일 상세 화면에 렌더링되는 게임 일정의 제목이 DB 스키마 기준 `game_schedules.title`과 일치하도록 바인딩 경로 수정.

### 2.4 메모(Memo) 필드 구현 검증 및 UI 개선
- 일자별 상세 모달 내 메모 입력 데이터가 실제 DB 및 API와 정상 통신(저장/조회)되는지 확인.
- 메모 작성/편집 모드로 진입하거나 즉시 저장할 수 있는 액션 버튼 UI 추가.

### 2.5 내비게이션 버튼 에셋 교체
- 홈 대시보드 상단 월/주 이동 내비게이션 버튼(`<`, `>`)을 신규 디자인 에셋/아이콘으로 교체.

---

## 3. 게임 일정(Game Schedules) 구조 및 팝업 UI

### 3.1 뷰어 UI 구조 변경 (사이드바 → 중앙 모달)
- 기존 화면 우측 사이드바(Right Sidebar) 방식 제거.
- 게임별 일정 클릭 시 화면 중앙에 집중도 높은 **중앙 팝업(Center Modal)** 형태로 레이아웃 전환.

### 3.2 카테고리 확장
- 일정 분류 카테고리 Enum에 `CONTENTS` 추가:
  - 기존: `VERSION`, `PICKUP`
  - 추가: `CONTENTS` (신규 상시/주기 콘텐츠, 레이드, 던전 등)

### 3.3 일정 기간 스키마 다변화
일정 유형에 따라 유연하게 저장할 수 있도록 날짜 스키마를 이원화:
1. **기간형 일정:** `(start_date, end_date)` - 버전, 이벤트, 픽업 등 시작과 종료가 존재하는 일정
2. **단일 목표 일정:** `(target_date)` - 점검일, 콘텐츠 오픈일, 마감 디데이 등 단일 시점 일정
- 유효성 검증: 기간형 일정은 `start_date <= end_date` 검증 필수, 단일형 일정은 `target_date` 단독 필수.

---

## 4. 반응형 대응 및 개발 원칙

### 4.1 모바일 화면 세부 튜닝
- 모바일 뷰포트에서의 여백(Padding/Margin), 터치 타겟 크기, 중앙 모달 크기 반응형 세부 조정.

### 4.2 개발 우선순위 원칙
- **웹(Desktop Web) 버전의 기능적/시각적 무결성을 1순위로 개발.**
- 웹 버전의 레이아웃 안정화 및 데이터 무결성 검증 완료 후, 모바일 전용 스타일링 및 UI 대응 진행.