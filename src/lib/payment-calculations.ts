export type PaymentMethod = "WALLET" | "NAVER_PAY"
export type LegacyPaymentMethod = PaymentMethod | "GOOGLE_PLAY" | "GALAXY_STORE"
export type PaymentPlatform = "GOOGLE_PLAY" | "GALAXY_STORE" | "OTHER"
export type WalletPlatform = "GOOGLE_PLAY" | "GALAXY_STORE" | "NAVER_PAY"
export type PointPlatform = "GOOGLE_PLAY" | "GALAXY_STORE" | "NAVER_PAY"
export type StorePlatform = "GOOGLE_PLAY" | "GALAXY_STORE"

export const GOOGLE_TIER_RATES = {
  BRONZE: 0.1,
  SILVER: 0.11,
  GOLD: 0.13,
  PLATINUM: 0.16,
  DIAMOND: 0.2,
} as const

export type GoogleTier = keyof typeof GOOGLE_TIER_RATES

export const GALAXY_TIER_RATES = {
  GENERAL: 0.1,
  STAR: 0.1,
  PRESTIGE: 1.1,
  ROYAL_BLUE: 2.1,
} as const

export type GalaxyTier = keyof typeof GALAXY_TIER_RATES

export const GALAXY_TIER_LABELS: Record<GalaxyTier, string> = {
  GENERAL: "일반",
  STAR: "스타",
  PRESTIGE: "프레스티지",
  ROYAL_BLUE: "로열블루",
}

export interface PaymentInput {
  originalPrice: number
  discountAmount: number
  pointDiscountAmount: number
  usedPoints: number
  paymentMethod: PaymentMethod
  paymentPlatform?: PaymentPlatform
  pointPlatform: PointPlatform | null
  paymentDate: string
}

export function calculateFinalAmount(input: Pick<PaymentInput, "originalPrice" | "discountAmount" | "pointDiscountAmount">): number {
  return Math.max(0, input.originalPrice - input.discountAmount - input.pointDiscountAmount)
}

// 스토어 플랫폼(Google Play, Galaxy Store)은 해당 스토어가 기본 포인트 플랫폼이며,
// 기타 플랫폼은 포인트를 사용할 때 지정된 포인트 플랫폼을 사용한다.
export function resolvePointPlatform(
  platformOrMethod: PaymentPlatform | LegacyPaymentMethod,
  selected: PointPlatform | null,
  usedPoints: number,
): PointPlatform | null {
  if (platformOrMethod === "GOOGLE_PLAY" || platformOrMethod === "GALAXY_STORE") return platformOrMethod
  return usedPoints > 0 ? selected : null
}

// 스토어 플랫폼(GOOGLE_PLAY, GALAXY_STORE) 결제 시 최종 실결제액에 대해 해당 스토어 등급별 포인트 적립을 계산한다.
export function estimateEarnedPoints(
  finalAmount: number,
  earnRate: number,
  platformOrMethod: PaymentPlatform | LegacyPaymentMethod | null,
): number {
  if (
    !platformOrMethod ||
    platformOrMethod === "WALLET" ||
    platformOrMethod === "NAVER_PAY" ||
    platformOrMethod === "OTHER" ||
    finalAmount <= 0
  ) {
    return 0
  }
  return Math.floor((finalAmount * earnRate) / 100)
}

export interface StoreEventConfig {
  isGoogleBoost?: boolean
  googleMultiplier?: number
  isGalaxyPayback?: boolean
  galaxyPaybackRate?: number
}

export interface StoreEventEarnResult {
  effectiveRate: number
  earnedPoints: number
  eventTag: string | null
}

/**
 * 스토어 이벤트(Google Play 부스트 n배, Galaxy Store 페이백 n%)를 반영한
 * 실효 적립률 및 예상 적립 포인트, 메모 태그를 계산한다.
 */
export function calculateStoreEventEarn(
  finalAmount: number,
  baseEarnRate: number,
  platform: PaymentPlatform | LegacyPaymentMethod | null,
  eventConfig?: StoreEventConfig,
): StoreEventEarnResult {
  if (
    !platform ||
    platform === "WALLET" ||
    platform === "NAVER_PAY" ||
    platform === "OTHER" ||
    finalAmount <= 0
  ) {
    return { effectiveRate: 0, earnedPoints: 0, eventTag: null }
  }

  let effectiveRate = baseEarnRate
  let eventTag: string | null = null

  if (platform === "GOOGLE_PLAY" && eventConfig?.isGoogleBoost) {
    const mult = eventConfig.googleMultiplier ?? 1
    if (mult > 0) {
      effectiveRate = Number((baseEarnRate * mult).toFixed(4))
      eventTag = `[구글 부스트: ${mult}배]`
    }
  } else if (platform === "GALAXY_STORE" && eventConfig?.isGalaxyPayback) {
    const payback = eventConfig.galaxyPaybackRate ?? 0
    if (payback > 0) {
      effectiveRate = Number(payback.toFixed(4))
      eventTag = `[갤스 페이백: ${payback}%]`
    }
  }

  const earnedPoints = Math.floor((finalAmount * effectiveRate) / 100)
  return { effectiveRate, earnedPoints, eventTag }
}

/**
 * 기존 메모에 이벤트 태그를 병합한다.
 */
export function mergeEventMemo(existingMemo: string | null | undefined, eventTag: string | null): string | null {
  if (!eventTag) return existingMemo?.trim() || null
  const trimmed = existingMemo?.trim()
  if (!trimmed) return eventTag
  if (trimmed.includes(eventTag)) return trimmed
  return `${eventTag} ${trimmed}`
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
  ["총 자산 잔액이 부족하여 네이버페이를 충전", "총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다."],
  ["네이버페이 지갑 설정이 없습니다", "네이버페이 지갑이 없습니다. 설정에서 지갑을 먼저 생성해 주세요."],
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
