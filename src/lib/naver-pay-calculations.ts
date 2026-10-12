export interface NaverPayPaymentParams {
  paymentAmount: number // 결제 요청 금액 P
  naverPayBalance: number // 네이버페이 현재 잔액 B_np
  totalAssetBalance: number // 충전 재원이 되는 메인 총 자산 B_total
}

export interface RechargeCalculationResult {
  needsRecharge: boolean
  shortageAmount: number // 부족액 S = P - B_np
  rechargeAmount: number // 10,000원 단위 올림 충전액 R
  finalNaverPayBalance: number // 최종 네이버페이 잔액 B_np + R - P
  finalTotalAssetBalance: number // 최종 총 자산 잔액 B_total - R
}

export const RECHARGE_UNIT = 10_000

/**
 * 네이버페이 결제 시 부족액 및 10,000원 단위 올림 충전 금액을 계산하고
 * 총 자산 검증을 수행하는 순수 함수.
 *
 * 공식:
 * - B_np >= P: R = 0 (충전 불필요)
 * - B_np < P: S = P - B_np, R = ceil(S / 10000) * 10000
 * - B_total < R: 에러 발생 ("총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.")
 */
export function calculateNaverPayPayment({
  paymentAmount,
  naverPayBalance,
  totalAssetBalance,
}: NaverPayPaymentParams): RechargeCalculationResult {
  if (!Number.isSafeInteger(paymentAmount) || paymentAmount <= 0) {
    throw new Error("결제 금액은 0원보다 커야 합니다.")
  }

  if (!Number.isSafeInteger(naverPayBalance) || naverPayBalance < 0) {
    throw new Error("네이버페이 잔액은 0원 이상이어야 합니다.")
  }

  if (!Number.isSafeInteger(totalAssetBalance) || totalAssetBalance < 0) {
    throw new Error("총 자산 잔액은 0원 이상이어야 합니다.")
  }

  // 네이버페이 잔액이 충분한 경우
  if (naverPayBalance >= paymentAmount) {
    return {
      needsRecharge: false,
      shortageAmount: 0,
      rechargeAmount: 0,
      finalNaverPayBalance: naverPayBalance - paymentAmount,
      finalTotalAssetBalance: totalAssetBalance,
    }
  }

  // 잔액이 부족한 경우: 부족액 계산 및 10,000원 단위 올림 충전액 산출
  const shortageAmount = paymentAmount - naverPayBalance
  const rechargeAmount = Math.ceil(shortageAmount / RECHARGE_UNIT) * RECHARGE_UNIT

  // 충전 재원이 되는 총 자산 검증
  if (totalAssetBalance < rechargeAmount) {
    throw new Error("총 자산 잔액이 부족하여 네이버페이를 충전할 수 없습니다.")
  }

  return {
    needsRecharge: true,
    shortageAmount,
    rechargeAmount,
    finalNaverPayBalance: naverPayBalance + rechargeAmount - paymentAmount,
    finalTotalAssetBalance: totalAssetBalance - rechargeAmount,
  }
}
