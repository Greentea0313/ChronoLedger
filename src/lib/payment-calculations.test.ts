import { describe, expect, it } from "vitest"
import {
  calculateFinalAmount,
  estimateEarnedPoints,
  mapPaymentError,
  resolvePointPlatform,
  validatePayment,
  type PaymentInput,
} from "./payment-calculations"

const base: PaymentInput = {
  originalPrice: 119000,
  discountAmount: 0,
  pointDiscountAmount: 5000,
  usedPoints: 250,
  paymentMethod: "WALLET",
  paymentPlatform: "GOOGLE_PLAY",
  pointPlatform: "GOOGLE_PLAY",
  paymentDate: "2026-10-08",
}

describe("payment calculations", () => {
  it("computes 114,000 for 119,000 with a 5,000 coupon (250P)", () => {
    expect(calculateFinalAmount(base)).toBe(114000)
  })

  it("computes 0 for 100% full discount (no negative amount)", () => {
    expect(calculateFinalAmount({ originalPrice: 10000, discountAmount: 10000, pointDiscountAmount: 0 })).toBe(0)
    expect(calculateFinalAmount({ originalPrice: 10000, discountAmount: 5000, pointDiscountAmount: 5000 })).toBe(0)
  })

  it("resolves the point platform from the payment platform or legacy method", () => {
    expect(resolvePointPlatform("GALAXY_STORE", "GOOGLE_PLAY", 0)).toBe("GALAXY_STORE")
    expect(resolvePointPlatform("OTHER", "GOOGLE_PLAY", 0)).toBeNull()
    expect(resolvePointPlatform("OTHER", "GALAXY_STORE", 10)).toBe("GALAXY_STORE")
    expect(resolvePointPlatform("WALLET", "GOOGLE_PLAY", 0)).toBeNull()
    expect(resolvePointPlatform("WALLET", "GALAXY_STORE", 10)).toBe("GALAXY_STORE")
  })

  it("estimates earned points based on payment platform regardless of payment method", () => {
    // Google Play 플랫폼 결제 시: '내 지갑' 결제든 '네이버페이' 결제든 스토어 포인트 적립
    expect(estimateEarnedPoints(114000, 0.2, "GOOGLE_PLAY")).toBe(228)
    expect(estimateEarnedPoints(100000, 1.1, "GALAXY_STORE")).toBe(1100)
    // 기타 플랫폼 또는 지갑 결제 시 스토어 플랫폼이 아니면 0P
    expect(estimateEarnedPoints(114000, 0.2, "OTHER")).toBe(0)
    expect(estimateEarnedPoints(114000, 0.2, "WALLET")).toBe(0)
    expect(estimateEarnedPoints(114000, 0.2, "NAVER_PAY")).toBe(0)
    // 0원 결제(100% 할인) 시 적립은 0P
    expect(estimateEarnedPoints(0, 0.2, "GOOGLE_PLAY")).toBe(0)
  })

  it("accepts valid input and rejects invalid combinations", () => {
    expect(validatePayment(base, "2026-10-08", 300)).toBeNull()
    expect(validatePayment(base, "2026-10-08", 100)).toBe("포인트 잔액이 부족합니다.")
    expect(validatePayment({ ...base, paymentDate: "2026-10-09" }, "2026-10-08", 300)).toBe("미래 날짜로 결제할 수 없습니다.")
    expect(validatePayment({ ...base, usedPoints: 0 }, "2026-10-08", 300)).toContain("함께 입력")
    expect(validatePayment({ ...base, discountAmount: 120000 }, "2026-10-08", 300)).toContain("초과")
    expect(validatePayment({ ...base, pointPlatform: null }, "2026-10-08", 300)).toContain("지갑")
    expect(validatePayment({ ...base, originalPrice: -1 }, "2026-10-08", 300)).toContain("정수")
    // NAVER_PAY 결제 시에도 스토어 포인트 정상 허용
    expect(validatePayment({ ...base, paymentMethod: "NAVER_PAY" }, "2026-10-08", 300)).toBeNull()
  })

  it("maps refund rejection to a friendly message and hides unknown errors", () => {
    expect(mapPaymentError("적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다.", "x")).toContain("이미 사용")
    expect(mapPaymentError("internal sql detail", "fallback")).toBe("fallback")
  })
})
