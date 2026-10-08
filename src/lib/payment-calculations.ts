export type PaymentMethod = "WALLET" | "GOOGLE_PLAY" | "GALAXY_STORE"
export type PointPlatform = "GOOGLE_PLAY" | "GALAXY_STORE"

export const GOOGLE_TIER_RATES = {
  BRONZE: 0.1,
  SILVER: 0.11,
  GOLD: 0.13,
  PLATINUM: 0.16,
  DIAMOND: 0.2,
} as const

export type GoogleTier = keyof typeof GOOGLE_TIER_RATES

export interface PaymentInput {
  originalPrice: number
  discountAmount: number
  pointDiscountAmount: number
  usedPoints: number
  paymentMethod: PaymentMethod
  pointPlatform: PointPlatform | null
  paymentDate: string
}

export function calculateFinalAmount(input: Pick<PaymentInput, "originalPrice" | "discountAmount" | "pointDiscountAmount">): number {
  return input.originalPrice - input.discountAmount - input.pointDiscountAmount
}

// 스토어 결제는 결제 스토어가 포인트 플랫폼이며, 지갑 결제는 포인트를 쓸 때만 별도 플랫폼을 지정한다.
export function resolvePointPlatform(
  method: PaymentMethod,
  selected: PointPlatform | null,
  usedPoints: number,
): PointPlatform | null {
  if (method === "GOOGLE_PLAY" || method === "GALAXY_STORE") return method
  return usedPoints > 0 ? selected : null
}

export function estimateEarnedPoints(finalAmount: number, earnRate: number, method: PaymentMethod): number {
  if (method === "WALLET") return 0
  return Math.floor((finalAmount * earnRate) / 100)
}

export function validatePayment(
  input: PaymentInput,
  todayKst: string,
  pointBalance: number | null,
): string | null {
  const numbers = [input.originalPrice, input.discountAmount, input.pointDiscountAmount, input.usedPoints]
  if (numbers.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    return "금액은 0 이상의 정수로 입력해 주세요."
  }
  if (input.originalPrice <= 0) return "정가를 입력해 주세요."
  if (input.discountAmount + input.pointDiscountAmount > input.originalPrice) {
    return "할인 합계가 정가를 초과할 수 없습니다."
  }
  if ((input.usedPoints === 0) !== (input.pointDiscountAmount === 0)) {
    return "사용 포인트와 포인트 할인 금액은 함께 입력해 주세요."
  }
  if (input.usedPoints > 0) {
    if (!input.pointPlatform) return "사용할 포인트 지갑을 선택해 주세요."
    if (pointBalance !== null && input.usedPoints > pointBalance) return "포인트 잔액이 부족합니다."
  }
  if (!input.paymentDate) return "결제일을 입력해 주세요."
  if (input.paymentDate > todayKst) return "미래 날짜로 결제할 수 없습니다."
  return null
}

const ERROR_MESSAGES: Array<[string, string]> = [
  ["적립 포인트를 이미 사용", "적립된 포인트를 이미 사용해 잔액이 부족하므로 결제를 취소할 수 없습니다."],
  ["포인트 잔액이 부족", "포인트 잔액이 부족합니다."],
  ["미래 날짜", "미래 날짜로 결제할 수 없습니다."],
  ["결제할 수 있는 본인 소유의 예정 지출", "이미 처리되었거나 결제할 수 없는 지출입니다."],
  ["취소할 수 있는 확정 결제", "이미 취소되었거나 취소할 수 없는 결제입니다."],
  ["포인트 지갑 설정이 없습니다", "포인트 지갑 설정이 없습니다. 설정에서 지갑을 먼저 등록해 주세요."],
  ["인증되지 않은", "로그인이 필요합니다."],
]

export function mapPaymentError(message: string | null | undefined, fallback: string): string {
  if (!message) return fallback
  const matched = ERROR_MESSAGES.find(([needle]) => message.includes(needle))
  return matched ? matched[1] : fallback
}
