import { describe, expect, it } from "vitest"
import {
  calculateFinalAmount,
  calculateStoreEventEarn,
  estimateEarnedPoints,
  mapPaymentError,
  mergeEventMemo,
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
    expect(resolvePointPlatform("GOOGLE_PLAY", null, 250)).toBe("GOOGLE_PLAY")
    expect(resolvePointPlatform("GALAXY_STORE", "GOOGLE_PLAY", 0)).toBe("GALAXY_STORE")
    expect(resolvePointPlatform("OTHER", "GOOGLE_PLAY", 0)).toBeNull()
    expect(resolvePointPlatform("OTHER", "GALAXY_STORE", 10)).toBeNull()
    expect(resolvePointPlatform("WALLET", "GOOGLE_PLAY", 0)).toBeNull()
    expect(resolvePointPlatform("WALLET", "GALAXY_STORE", 10)).toBe("GALAXY_STORE")
  })

  it("allows 100% point discount (originalPrice = 5000, discountAmount = 0, pointDiscountAmount = 5000, usedPoints = 250 -> finalAmount = 0)", () => {
    const fullPointDiscount: PaymentInput = {
      originalPrice: 5000,
      discountAmount: 0,
      pointDiscountAmount: 5000,
      usedPoints: 250,
      paymentMethod: "WALLET",
      paymentPlatform: "GOOGLE_PLAY",
      pointPlatform: "GOOGLE_PLAY",
      paymentDate: "2026-10-08",
    }
    expect(calculateFinalAmount(fullPointDiscount)).toBe(0)
    expect(validatePayment(fullPointDiscount, "2026-10-08", 300)).toBeNull()
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

  it("calculates Google Play boost multiplier earnings and generates memo tags", () => {
    // 100,000원 결제, 기본 1.3% 적립률, 4배 부스트 적용 시: 5.2% 적립 (5,200P)
    const result = calculateStoreEventEarn(100000, 1.3, "GOOGLE_PLAY", {
      isGoogleBoost: true,
      googleMultiplier: 4,
    })
    expect(result.effectiveRate).toBe(5.2)
    expect(result.earnedPoints).toBe(5200)
    expect(result.eventTag).toBe("[구글 부스트: 4배]")

    // 부스트 미적용 시 기본 적립
    const normal = calculateStoreEventEarn(100000, 1.3, "GOOGLE_PLAY", {
      isGoogleBoost: false,
    })
    expect(normal.effectiveRate).toBe(1.3)
    expect(normal.earnedPoints).toBe(1300)
    expect(normal.eventTag).toBeNull()
  })

  it("calculates Galaxy Store payback percentage earnings and generates memo tags", () => {
    // 100,000원 결제, 기본 10% 적립률, 30% 페이백 적용 시: 30% 적립 (30,000P)
    const result = calculateStoreEventEarn(100000, 10, "GALAXY_STORE", {
      isGalaxyPayback: true,
      galaxyPaybackRate: 30,
    })
    expect(result.effectiveRate).toBe(30)
    expect(result.earnedPoints).toBe(30000)
    expect(result.eventTag).toBe("[갤스 페이백: 30%]")

    // 페이백 미적용 시 기본 적립
    const normal = calculateStoreEventEarn(100000, 10, "GALAXY_STORE", {
      isGalaxyPayback: false,
    })
    expect(normal.effectiveRate).toBe(10)
    expect(normal.earnedPoints).toBe(10000)
    expect(normal.eventTag).toBeNull()
  })

  it("merges event tags into existing memos cleanly", () => {
    expect(mergeEventMemo("첫 결제", "[구글 부스트: 3배]")).toBe("[구글 부스트: 3배] 첫 결제")
    expect(mergeEventMemo(null, "[갤스 페이백: 20%]")).toBe("[갤스 페이백: 20%]")
    expect(mergeEventMemo("", "[구글 부스트: 2배]")).toBe("[구글 부스트: 2배]")
    expect(mergeEventMemo("[구글 부스트: 3배] 기존 메모", "[구글 부스트: 3배]")).toBe("[구글 부스트: 3배] 기존 메모")
    expect(mergeEventMemo("일반 메모", null)).toBe("일반 메모")
  })
})
