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
  pointPlatform: "GOOGLE_PLAY",
  paymentDate: "2026-10-08",
}

describe("payment calculations", () => {
  it("computes 114,000 for 119,000 with a 5,000 coupon (250P)", () => {
    expect(calculateFinalAmount(base)).toBe(114000)
  })

  it("resolves the point platform from the payment method", () => {
    expect(resolvePointPlatform("GALAXY_STORE", "GOOGLE_PLAY", 0)).toBe("GALAXY_STORE")
    expect(resolvePointPlatform("WALLET", "GOOGLE_PLAY", 0)).toBeNull()
    expect(resolvePointPlatform("WALLET", "GALAXY_STORE", 10)).toBe("GALAXY_STORE")
  })

  it("estimates earned points only for store payments", () => {
    expect(estimateEarnedPoints(114000, 0.2, "GOOGLE_PLAY")).toBe(228)
    expect(estimateEarnedPoints(114000, 0.2, "WALLET")).toBe(0)
  })

  it("accepts valid input and rejects invalid combinations", () => {
    expect(validatePayment(base, "2026-10-08", 300)).toBeNull()
    expect(validatePayment(base, "2026-10-08", 100)).toBe("포인트 잔액이 부족합니다.")
    expect(validatePayment({ ...base, paymentDate: "2026-10-09" }, "2026-10-08", 300)).toBe("미래 날짜로 결제할 수 없습니다.")
    expect(validatePayment({ ...base, usedPoints: 0 }, "2026-10-08", 300)).toContain("함께 입력")
    expect(validatePayment({ ...base, discountAmount: 120000 }, "2026-10-08", 300)).toContain("초과")
    expect(validatePayment({ ...base, pointPlatform: null }, "2026-10-08", 300)).toContain("지갑")
    expect(validatePayment({ ...base, originalPrice: -1 }, "2026-10-08", 300)).toContain("정수")
  })

  it("maps refund rejection to a friendly message and hides unknown errors", () => {
    expect(mapPaymentError("적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다.", "x")).toContain("이미 사용")
    expect(mapPaymentError("internal sql detail", "fallback")).toBe("fallback")
  })
})
