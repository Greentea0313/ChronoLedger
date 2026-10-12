import { describe, expect, it } from "vitest"
import { calculateNaverPayPayment } from "@/lib/naver-pay-calculations"

describe("calculateNaverPayPayment", () => {
  it("네이버페이 잔액이 결제 금액 이상일 때 충전 없이 즉시 차감한다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 15_000,
      naverPayBalance: 20_000,
      totalAssetBalance: 100_000,
    })

    expect(result).toEqual({
      needsRecharge: false,
      shortageAmount: 0,
      rechargeAmount: 0,
      finalNaverPayBalance: 5_000,
      finalTotalAssetBalance: 100_000,
    })
  })

  it("네이버페이 잔액과 결제 금액이 정확히 일치할 때 충전 없이 잔액이 0원이 된다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 30_000,
      naverPayBalance: 30_000,
      totalAssetBalance: 50_000,
    })

    expect(result).toEqual({
      needsRecharge: false,
      shortageAmount: 0,
      rechargeAmount: 0,
      finalNaverPayBalance: 0,
      finalTotalAssetBalance: 50_000,
    })
  })

  it("부족액이 1원일 때 10,000원을 올림 충전한다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 10_001,
      naverPayBalance: 10_000,
      totalAssetBalance: 50_000,
    })

    expect(result).toEqual({
      needsRecharge: true,
      shortageAmount: 1,
      rechargeAmount: 10_000,
      finalNaverPayBalance: 9_999,
      finalTotalAssetBalance: 40_000,
    })
  })

  it("부족액이 정확히 10,000원일 때 10,000원을 충전한다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 20_000,
      naverPayBalance: 10_000,
      totalAssetBalance: 50_000,
    })

    expect(result).toEqual({
      needsRecharge: true,
      shortageAmount: 10_000,
      rechargeAmount: 10_000,
      finalNaverPayBalance: 0,
      finalTotalAssetBalance: 40_000,
    })
  })

  it("부족액이 10,001원일 때 20,000원을 올림 충전한다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 25_000,
      naverPayBalance: 14_999,
      totalAssetBalance: 50_000,
    })

    // 부족액: 10,001원 -> 올림 충전액: 20,000원
    // 최종 네이버페이: 14,999 + 20,000 - 25,000 = 9,999원
    // 최종 총 자산: 50,000 - 20,000 = 30,000원
    expect(result).toEqual({
      needsRecharge: true,
      shortageAmount: 10_001,
      rechargeAmount: 20_000,
      finalNaverPayBalance: 9_999,
      finalTotalAssetBalance: 30_000,
    })
  })

  it("네이버페이 잔액이 0원일 때 33,000원 결제 시 40,000원을 충전하고 잔여 7,000원이 남는다", () => {
    const result = calculateNaverPayPayment({
      paymentAmount: 33_000,
      naverPayBalance: 0,
      totalAssetBalance: 100_000,
    })

    expect(result).toEqual({
      needsRecharge: true,
      shortageAmount: 33_000,
      rechargeAmount: 40_000,
      finalNaverPayBalance: 7_000,
      finalTotalAssetBalance: 60_000,
    })
  })

  it("총 자산 잔액이 충전 필요 금액보다 적으면 에러를 던진다", () => {
    expect(() =>
      calculateNaverPayPayment({
        paymentAmount: 50_000,
        naverPayBalance: 10_000, // 부족액: 40,000원 -> 충전 필요: 40,000원
        totalAssetBalance: 35_000, // 총 자산 35,000원 < 충전 필요 40,000원
      }),
    ).toThrow("총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.")
  })

  it("결제 금액이 0원 이하이면 에러를 던진다", () => {
    expect(() =>
      calculateNaverPayPayment({
        paymentAmount: 0,
        naverPayBalance: 10_000,
        totalAssetBalance: 50_000,
      }),
    ).toThrow("결제 금액은 0원보다 커야 합니다.")

    expect(() =>
      calculateNaverPayPayment({
        paymentAmount: -5_000,
        naverPayBalance: 10_000,
        totalAssetBalance: 50_000,
      }),
    ).toThrow("결제 금액은 0원보다 커야 합니다.")
  })

  it("네이버페이 잔액 또는 총 자산이 음수이면 에러를 던진다", () => {
    expect(() =>
      calculateNaverPayPayment({
        paymentAmount: 10_000,
        naverPayBalance: -100,
        totalAssetBalance: 50_000,
      }),
    ).toThrow("네이버페이 잔액은 0원 이상이어야 합니다.")

    expect(() =>
      calculateNaverPayPayment({
        paymentAmount: 10_000,
        naverPayBalance: 10_000,
        totalAssetBalance: -1,
      }),
    ).toThrow("총 자산 잔액은 0원 이상이어야 합니다.")
  })
})

