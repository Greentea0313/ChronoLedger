"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { getKstToday } from "@/lib/dashboard-date"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import {
  calculateFinalAmount,
  estimateEarnedPoints,
  mapPaymentError,
  resolvePointPlatform,
  validatePayment,
  type PaymentMethod,
  type PointPlatform,
} from "@/lib/payment-calculations"
import { calculateNaverPayPayment } from "@/lib/naver-pay-calculations"

export interface PlannedExpenseInput {
  id: string
  title: string
  original_price: number
  payment_method?: string
  pickup_schedule_id?: string | null
}

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
  plannedExpense?: PlannedExpenseInput | null
  initialDate?: string
}

interface GameOption {
  id: string
  name: string
}

interface ScheduleOption {
  id: string
  game_id: string
  title: string
  schedule_type: "VERSION" | "PICKUP"
  start_date: string
  end_date: string
}

interface WalletInfo {
  platform: PointPlatform
  current_balance: number
  earn_rate: number
}

export type PaymentPlatform = "GOOGLE_PLAY" | "GALAXY_STORE" | "OTHER"

const CATEGORIES = ["게임", "식비", "교통", "생활", "기타"] as const
const METHOD_LABELS: Record<PaymentMethod, string> = {
  WALLET: "내 지갑",
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
  NAVER_PAY: "네이버페이",
}
const PLATFORM_LABELS: Record<PaymentPlatform, string> = {
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
  OTHER: "기타 (스토어 외)",
}
const PLATFORM_METHODS: Record<PaymentPlatform, PaymentMethod[]> = {
  GOOGLE_PLAY: ["WALLET", "GOOGLE_PLAY", "NAVER_PAY"],
  GALAXY_STORE: ["WALLET", "GALAXY_STORE", "NAVER_PAY"],
  OTHER: ["WALLET", "NAVER_PAY"],
}
const selectClassName = "h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
const labelClassName = "block text-xs text-gray-300"
const inputClassName = "bg-gray-900 text-white"

function toAmount(value: string): number {
  return value.trim() === "" ? 0 : Number(value)
}

export function ExpenseModal({ open, onOpenChange, onCompleted, plannedExpense = null, initialDate }: ExpenseModalProps) {
  const isOnline = useOnlineStatus()
  const { user } = useAuth()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("게임")
  const [games, setGames] = useState<GameOption[]>([])
  const [gameId, setGameId] = useState("")
  const [schedules, setSchedules] = useState<ScheduleOption[]>([])
  const [pickupSchedules, setPickupSchedules] = useState<ScheduleOption[]>([])
  const [pickupScheduleId, setPickupScheduleId] = useState("")
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [title, setTitle] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [couponPercent, setCouponPercent] = useState("")
  const [usedPoints, setUsedPoints] = useState("")
  const [paymentPlatform, setPaymentPlatform] = useState<PaymentPlatform>("GOOGLE_PLAY")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLET")
  const [selectedPointPlatform, setSelectedPointPlatform] = useState<PointPlatform>("GOOGLE_PLAY")
  const [totalAsset, setTotalAsset] = useState(0)
  const [finalAmountInput, setFinalAmountInput] = useState("")
  const [deductAsset, setDeductAsset] = useState(true)
  const [paymentDate, setPaymentDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingExpenseId = useRef<string | null>(null)
  const prevOpenRef = useRef(false)
  const prevPlannedExpenseIdRef = useRef<string | null>(null)

  useEffect(() => {
    const isOpening = open && !prevOpenRef.current
    const isNewPlannedExpense = open && plannedExpense?.id !== prevPlannedExpenseIdRef.current

    if (isOpening || isNewPlannedExpense) {
      pendingExpenseId.current = null
      setError(null)
      setPaymentDate(initialDate || getKstToday())
      setTitle(plannedExpense?.title ?? "")
      const origStr = plannedExpense ? String(plannedExpense.original_price) : ""
      setOriginalPrice(origStr)
      setDiscountAmount("")
      setCouponPercent("")
      setUsedPoints("")
      setFinalAmountInput(origStr)

      const method = plannedExpense?.payment_method
      if (method === "GALAXY_STORE") {
        setPaymentPlatform("GALAXY_STORE")
        setPaymentMethod("GALAXY_STORE")
      } else if (method === "GOOGLE_PLAY") {
        setPaymentPlatform("GOOGLE_PLAY")
        setPaymentMethod("GOOGLE_PLAY")
      } else if (method === "NAVER_PAY") {
        setPaymentPlatform("OTHER")
        setPaymentMethod("NAVER_PAY")
      } else {
        setPaymentPlatform("GOOGLE_PLAY")
        setPaymentMethod("WALLET")
      }
      setDeductAsset(true)
      setCategory("게임")
      setGameId("")
      setSchedules([])
      setPickupSchedules([])
      setPickupScheduleId(plannedExpense?.pickup_schedule_id ?? "")
    }
    prevOpenRef.current = open
    prevPlannedExpenseIdRef.current = plannedExpense?.id ?? null
  }, [open, plannedExpense, initialDate])

  const userId = user?.id

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    void (async () => {
      const [gameResult, walletResult, userGamesResult, financeResult] = await Promise.all([
        supabase.from("games").select("id, name").order("name"),
        supabase.from("store_wallets").select("platform, current_balance, earn_rate").eq("user_id", userId),
        supabase.from("user_games").select("game_id").eq("user_id", userId),
        supabase.from("user_finances").select("total_asset").eq("user_id", userId),
      ])
      if (cancelled) return
      const userGameIds = new Set((userGamesResult.data ?? []).map((ug: { game_id: string }) => ug.game_id))
      const filteredGames = (gameResult.data ?? []).filter((g: { id: string }) => userGameIds.has(g.id))

      setGames(filteredGames as GameOption[])
      setWallets((walletResult.data ?? []) as WalletInfo[])
      const financeRow = Array.isArray(financeResult.data) ? financeResult.data[0] : financeResult.data
      setTotalAsset((financeRow as { total_asset?: number } | undefined)?.total_asset ?? 0)
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId])

  useEffect(() => {
    if (!gameId) {
      setSchedules([])
      setPickupSchedules([])
      setPickupScheduleId("")
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from("game_schedules")
        .select("id, game_id, title, schedule_type, start_date, end_date")
        .eq("game_id", gameId)
        .in("schedule_type", ["VERSION", "PICKUP"])
        .order("start_date")
      if (!cancelled) {
        const all = (data ?? []) as ScheduleOption[]
        const versionSchedules = all.filter((s) => s.schedule_type === "VERSION")
        const pickups = all.filter((s) => s.schedule_type === "PICKUP")
        setSchedules(versionSchedules)
        setPickupSchedules(pickups)
        if (paymentDate) {
          const matched = versionSchedules.find(
            (s) => s.start_date <= paymentDate && paymentDate <= s.end_date
          )
          if (matched) {
            const game = games.find((item) => item.id === gameId)
            if (game && !title.trim()) setTitle(`${game.name} ${matched.title}`)
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId, paymentDate, games, title])

  const matchingVersion = useMemo(() => {
    if (!paymentDate) return null
    return schedules.find((s) => s.start_date <= paymentDate && paymentDate <= s.end_date) ?? null
  }, [paymentDate, schedules])

  const availablePickups = useMemo(() => {
    if (!paymentDate) return []
    return pickupSchedules.filter(
      (p) => p.start_date <= paymentDate && paymentDate <= p.end_date
    )
  }, [paymentDate, pickupSchedules])

  useEffect(() => {
    if (pickupScheduleId && !availablePickups.some((p) => p.id === pickupScheduleId)) {
      setPickupScheduleId("")
    }
  }, [availablePickups, pickupScheduleId])

  const updateCalculatedFinal = (orig: number, disc: number, pts: number) => {
    const calculated = Math.max(0, orig - disc - pts)
    setFinalAmountInput(String(calculated))
  }

  const handlePriceChange = (val: string) => {
    setOriginalPrice(val)
    const pct = Number(couponPercent)
    const priceNum = toAmount(val)
    let discNum = toAmount(discountAmount)
    if (!isNaN(pct) && pct > 0 && priceNum > 0) {
      discNum = Math.floor((priceNum * pct) / 100)
      setDiscountAmount(String(discNum))
    }
    updateCalculatedFinal(priceNum, discNum, toAmount(usedPoints))
  }

  const handleCouponChange = (val: string) => {
    setCouponPercent(val)
    const pct = Number(val)
    const priceNum = toAmount(originalPrice)
    let discNum = 0
    if (!isNaN(pct) && pct > 0 && priceNum > 0) {
      discNum = Math.floor((priceNum * pct) / 100)
      setDiscountAmount(String(discNum))
    } else if (val === "") {
      setDiscountAmount("")
    }
    updateCalculatedFinal(priceNum, discNum, toAmount(usedPoints))
  }

  const handleDiscountChange = (val: string) => {
    setDiscountAmount(val)
    setCouponPercent("")
    updateCalculatedFinal(toAmount(originalPrice), toAmount(val), toAmount(usedPoints))
  }

  const handleUsedPointsChange = (val: string) => {
    setUsedPoints(val)
    updateCalculatedFinal(toAmount(originalPrice), toAmount(discountAmount), toAmount(val))
  }

  const handleFinalAmountChange = (val: string) => {
    setFinalAmountInput(val)
    const targetFinal = toAmount(val)
    const orig = toAmount(originalPrice)
    const pts = toAmount(usedPoints)
    if (orig - pts >= targetFinal) {
      setDiscountAmount(String(orig - pts - targetFinal))
      setCouponPercent("")
    } else {
      setOriginalPrice(String(targetFinal + pts))
      setDiscountAmount("0")
      setCouponPercent("")
    }
  }

  const input = useMemo(
    () => {
      const uPoints = toAmount(usedPoints)
      return {
        originalPrice: toAmount(originalPrice),
        discountAmount: toAmount(discountAmount),
        pointDiscountAmount: uPoints,
        usedPoints: uPoints,
        paymentMethod,
        pointPlatform: resolvePointPlatform(paymentMethod, selectedPointPlatform, uPoints),
        paymentDate,
      }
    },
    [discountAmount, originalPrice, paymentDate, paymentMethod, selectedPointPlatform, usedPoints],
  )
  const finalAmount = calculateFinalAmount(input)
  const pointWallet = wallets.find((wallet) => wallet.platform === input.pointPlatform)
  const earnWallet = wallets.find((wallet) => wallet.platform === paymentMethod)
  const estimatedEarn = estimateEarnedPoints(finalAmount, earnWallet?.earn_rate ?? 0, paymentMethod)
  const isGameCategory = category === "게임"

  const naverWallet = wallets.find((wallet) => wallet.platform === "NAVER_PAY")
  const naverBalance = naverWallet?.current_balance ?? 0

  const naverCalc = useMemo(() => {
    if (paymentMethod !== "NAVER_PAY" || finalAmount <= 0) return null
    try {
      const result = calculateNaverPayPayment({
        paymentAmount: finalAmount,
        naverPayBalance: naverBalance,
        totalAssetBalance: totalAsset,
      })
      return {
        shortage: result.shortageAmount,
        rechargeAmount: result.rechargeAmount,
        isRechargeNeeded: result.needsRecharge,
        finalBalance: result.finalNaverPayBalance,
        assetDeduction: result.rechargeAmount,
        isAssetInsufficient: false,
      }
    } catch {
      const shortage = Math.max(0, finalAmount - naverBalance)
      const rechargeAmount = shortage > 0 ? Math.ceil(shortage / 10000) * 10000 : 0
      return {
        shortage,
        rechargeAmount,
        isRechargeNeeded: shortage > 0,
        finalBalance: shortage > 0 ? naverBalance + rechargeAmount - finalAmount : naverBalance - finalAmount,
        assetDeduction: rechargeAmount,
        isAssetInsufficient: totalAsset < rechargeAmount,
      }
    }
  }, [paymentMethod, finalAmount, naverBalance, totalAsset])

  const payButtonLabel = useMemo(() => {
    if (isSubmitting) return "처리 중..."
    if (paymentMethod === "NAVER_PAY" && naverCalc?.isRechargeNeeded) {
      if (naverCalc.isAssetInsufficient) return "총 자산 부족"
      return "충전 후 결제"
    }
    return "결제 확정"
  }, [isSubmitting, paymentMethod, naverCalc])

  const isPayDisabled = Boolean(
    isSubmitting ||
      !isOnline ||
      (paymentMethod === "NAVER_PAY" && naverCalc?.isAssetInsufficient),
  )

  const handleSubmit = async (event: FormEvent | React.MouseEvent, actionType: "PAY" | "PLAN" = "PAY") => {
    event.preventDefault()
    if (!user) return
    if (isOffline()) return setError(OFFLINE_WRITE_MESSAGE)
    setError(null)

    if (actionType === "PAY") {
      if (paymentMethod === "NAVER_PAY" && naverCalc?.isAssetInsufficient) {
        return setError("충전에 필요한 총 자산이 부족합니다.")
      }
      const validation = validatePayment(input, getKstToday(), input.usedPoints > 0 ? (pointWallet?.current_balance ?? 0) : null)
      if (validation) return setError(validation)
    }
    if (!plannedExpense && !title.trim()) return setError("항목명을 입력해 주세요.")

    setIsSubmitting(true)
    const effectiveDeductAsset = paymentMethod === "NAVER_PAY" ? false : deductAsset
    try {
      let expenseId = plannedExpense?.id ?? pendingExpenseId.current
      if (!expenseId) {
        const schedule = isGameCategory ? (matchingVersion ?? undefined) : undefined
        const { data, error: insertError } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            game_id: isGameCategory && gameId ? gameId : null,
            schedule_id: schedule?.id ?? null,
            pickup_schedule_id: isGameCategory && pickupScheduleId ? pickupScheduleId : null,
            title: title.trim(),
            category,
            status: "PLANNED",
            target_date: schedule?.end_date ?? input.paymentDate,
            start_date: schedule?.start_date ?? null,
            end_date: schedule?.end_date ?? null,
            original_price: input.originalPrice,
            final_amount: input.originalPrice,
            payment_method: paymentMethod,
            deduct_from_asset: effectiveDeductAsset,
          })
          .select("id")
          .single()
        if (insertError || !data) throw new Error("INSERT_FAILED")
        expenseId = data.id as string
        pendingExpenseId.current = expenseId
      }

      if (actionType === "PAY") {
        const { error: rpcError } = await supabase.rpc("process_expense_payment", {
          p_expense_id: expenseId,
          p_original_price: input.originalPrice,
          p_discount_amount: input.discountAmount,
          p_point_discount_amount: input.pointDiscountAmount,
          p_used_points: input.usedPoints,
          p_point_platform: input.pointPlatform,
          p_payment_method: paymentMethod,
          p_deduct_asset: effectiveDeductAsset,
          p_payment_date: input.paymentDate,
        })
        if (rpcError) {
          setError(`${mapPaymentError(rpcError.message, "결제를 처리하지 못했습니다.")} 입력한 내용은 예정 지출로 저장되어 다시 시도할 수 있습니다.`)
          return
        }
      }
      pendingExpenseId.current = null
      onCompleted?.()
      onOpenChange(false)
    } catch {
      setError("지출을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-700 bg-gray-800 text-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{plannedExpense ? "예정 지출 결제" : "지출 등록 및 결제"}</DialogTitle>
          <DialogDescription>결제 금액과 포인트는 서버에서 다시 검증하여 한 번에 반영됩니다.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          {!plannedExpense && (
            <>
              <div>
                <label htmlFor="expense-category" className={labelClassName}>카테고리</label>
                <select
                  id="expense-category"
                  className={selectClassName}
                  value={category}
                  onChange={(event) => {
                    const newCat = event.target.value as (typeof CATEGORIES)[number]
                    setCategory(newCat)
                    if (newCat !== "게임") {
                      setGameId("")
                      setSchedules([])
                      setPickupSchedules([])
                      setPickupScheduleId("")
                      setPaymentPlatform("OTHER")
                      if (paymentMethod === "GOOGLE_PLAY" || paymentMethod === "GALAXY_STORE") {
                        setPaymentMethod("WALLET")
                      }
                    } else {
                      setPaymentPlatform("GOOGLE_PLAY")
                    }
                  }}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              {isGameCategory && (
                <>
                  <div>
                    <label htmlFor="expense-game" className={labelClassName}>게임</label>
                    <select id="expense-game" className={selectClassName} value={gameId} onChange={(event) => setGameId(event.target.value)}>
                      <option value="">게임 선택 안 함</option>
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                  </div>
                  {gameId && (
                    <>
                      <div>
                        <label htmlFor="expense-schedule" className={labelClassName}>연결된 버전 일정</label>
                        <select
                          id="expense-schedule"
                          className={`${selectClassName} opacity-60 cursor-not-allowed`}
                          value={matchingVersion?.id ?? ""}
                          disabled
                        >
                          <option value={matchingVersion?.id ?? ""}>
                            {matchingVersion ? matchingVersion.title : "해당 날짜에 진행 중인 버전 일정이 없습니다"}
                          </option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="expense-pickup" className={labelClassName}>픽업 선택 (선택 사항)</label>
                        <select
                          id="expense-pickup"
                          className={selectClassName}
                          value={pickupScheduleId}
                          onChange={(event) => setPickupScheduleId(event.target.value)}
                        >
                          <option value="">픽업 선택 안 함 (버전 일반 지출)</option>
                          {availablePickups.map((pickup) => (
                            <option key={pickup.id} value={pickup.id}>
                              {pickup.title} ({pickup.start_date} ~ {pickup.end_date})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label htmlFor="expense-title" className={labelClassName}>항목명</label>
                <Input id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} className={inputClassName} />
              </div>
            </>
          )}

          {plannedExpense && <p className="text-sm">{plannedExpense.title}</p>}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="expense-price" className={labelClassName}>정가 (원)</label>
              <Input id="expense-price" type="number" inputMode="numeric" min={0} step={1} value={originalPrice} onChange={(event) => handlePriceChange(event.target.value)} className={inputClassName} />
            </div>
            <div>
              <label htmlFor="expense-coupon" className={labelClassName}>쿠폰 (%)</label>
              <Input id="expense-coupon" type="number" inputMode="numeric" min={0} max={100} step={1} placeholder="선택 사항" value={couponPercent} onChange={(event) => handleCouponChange(event.target.value)} className={inputClassName} />
            </div>
            <div>
              <label htmlFor="expense-discount" className={labelClassName}>할인 (원)</label>
              <Input id="expense-discount" type="number" inputMode="numeric" min={0} step={1} value={discountAmount} onChange={(event) => handleDiscountChange(event.target.value)} className={inputClassName} />
            </div>
            <div>
              <label htmlFor="expense-used-points" className={labelClassName}>사용 포인트 (P)</label>
              <Input
                id="expense-used-points"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={usedPoints}
                disabled={paymentMethod === "NAVER_PAY"}
                placeholder={paymentMethod === "NAVER_PAY" ? "네이버페이 사용 불가" : undefined}
                onChange={(event) => handleUsedPointsChange(event.target.value)}
                className={`${inputClassName} ${paymentMethod === "NAVER_PAY" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="expense-final-amount" className={labelClassName}>최종 실결제액 (원)</label>
              <span className="text-[11px] text-blue-400">수동 수정 시 할인이 자동 역산됩니다</span>
            </div>
            <Input
              id="expense-final-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={finalAmountInput}
              onChange={(event) => handleFinalAmountChange(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="expense-platform" className={labelClassName}>결제 플랫폼</label>
              <select
                id="expense-platform"
                className={selectClassName}
                value={paymentPlatform}
                onChange={(event) => {
                  const nextPlatform = event.target.value as PaymentPlatform
                  setPaymentPlatform(nextPlatform)
                  const available = PLATFORM_METHODS[nextPlatform]
                  if (!available.includes(paymentMethod)) {
                    setPaymentMethod("WALLET")
                  }
                }}
              >
                {(Object.keys(PLATFORM_LABELS) as PaymentPlatform[]).map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-method" className={labelClassName}>결제수단</label>
              <select
                id="expense-method"
                className={selectClassName}
                value={paymentMethod}
                onChange={(event) => {
                  const nextMethod = event.target.value as PaymentMethod
                  setPaymentMethod(nextMethod)
                  if (nextMethod === "NAVER_PAY") {
                    setUsedPoints("")
                    updateCalculatedFinal(toAmount(originalPrice), toAmount(discountAmount), 0)
                  }
                }}
              >
                {PLATFORM_METHODS[paymentPlatform].map((method) => (
                  <option key={method} value={method}>{METHOD_LABELS[method]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="expense-date" className={labelClassName}>결제일</label>
            <Input id="expense-date" type="date" value={paymentDate} min={plannedExpense ? getKstToday() : undefined} onChange={(event) => setPaymentDate(event.target.value)} className={inputClassName} />
          </div>

          {paymentMethod !== "NAVER_PAY" && input.usedPoints > 0 && (
            <div>
              <label htmlFor="expense-point-platform" className={labelClassName}>포인트 사용 지갑</label>
              <select id="expense-point-platform" className={selectClassName} value={selectedPointPlatform} onChange={(event) => setSelectedPointPlatform(event.target.value as PointPlatform)}>
                <option value="GOOGLE_PLAY">Google Play</option>
                <option value="GALAXY_STORE">Galaxy Store</option>
              </select>
            </div>
          )}

          {paymentMethod === "NAVER_PAY" && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  네이버페이 머니 결제 프리뷰
                </span>
                <span className="text-xs text-gray-400">보유 머니: {naverBalance.toLocaleString()} 원</span>
              </div>

              {naverCalc && naverCalc.isRechargeNeeded ? (
                naverCalc.isAssetInsufficient ? (
                  <div className="rounded bg-rose-950/50 border border-rose-500/50 p-2.5 text-xs text-rose-300 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>⚠️ 총 자산 잔액 부족</span>
                      <span>필요 충전: {naverCalc.rechargeAmount.toLocaleString()} 원</span>
                    </div>
                    <p>
                      부족 금액 {naverCalc.shortage.toLocaleString()}원을 충전하기 위한 총 자산(보유: {totalAsset.toLocaleString()}원)이 부족합니다.
                    </p>
                  </div>
                ) : (
                  <div className="rounded bg-gray-900/80 border border-gray-700/80 p-2.5 text-xs space-y-1.5">
                    <div className="flex justify-between text-gray-300">
                      <span>결제 필요 부족액</span>
                      <span className="text-amber-400 font-semibold">{naverCalc.shortage.toLocaleString()} 원</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>10,000원 단위 자동 충전액</span>
                      <span className="text-emerald-400 font-semibold">+{naverCalc.rechargeAmount.toLocaleString()} 원</span>
                    </div>
                    <div className="flex justify-between text-gray-400 border-t border-gray-800 pt-1">
                      <span>충전 및 결제 후 예상 잔액</span>
                      <span className="text-white font-medium">{naverCalc.finalBalance.toLocaleString()} 원</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      * 총 자산({totalAsset.toLocaleString()}원)에서 {naverCalc.rechargeAmount.toLocaleString()}원이 차감되어 충전 후 결제됩니다.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-xs text-emerald-300/90 flex justify-between items-center py-1">
                  <span>머니 잔액이 충분하여 추가 충전 없이 결제됩니다.</span>
                  <span className="text-gray-300">결제 후: {(naverBalance - finalAmount).toLocaleString()} 원</span>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={paymentMethod === "NAVER_PAY" ? false : deductAsset}
              disabled={paymentMethod === "NAVER_PAY"}
              onChange={(event) => setDeductAsset(event.target.checked)}
            />
            <span>
              총 자산에서 차감
              {paymentMethod === "NAVER_PAY" && (
                <span className="text-xs text-gray-400 ml-1.5">(네이버페이는 부족 시 충전액만 차감)</span>
              )}
            </span>
          </label>

          <div className="rounded border border-gray-700 bg-gray-900 p-3 text-sm" aria-live="polite">
            <p>{`실결제액: ${finalAmount.toLocaleString()} 원`}</p>
            {pointWallet && paymentMethod !== "NAVER_PAY" && (
              <p className="text-xs text-gray-400">{`포인트 잔액: ${pointWallet.current_balance.toLocaleString()} P`}</p>
            )}
            {paymentMethod === "NAVER_PAY" && (
              <p className="text-xs text-emerald-400">{`네이버페이 머니 잔액: ${naverBalance.toLocaleString()} 원`}</p>
            )}
            {paymentMethod !== "WALLET" && paymentMethod !== "NAVER_PAY" && (
              <p className="text-xs text-gray-400">{`예상 적립(앱 추정): ${estimatedEarn.toLocaleString()} P`}</p>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

          {plannedExpense ? (
            <Button type="button" disabled={isPayDisabled} className="w-full" onClick={(e) => void handleSubmit(e, "PAY")}>
              {payButtonLabel}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting || !isOnline} className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border-gray-600" onClick={(e) => void handleSubmit(e, "PLAN")}>
                예정 지출로 등록
              </Button>
              <Button type="button" disabled={isPayDisabled} className="flex-1" onClick={(e) => void handleSubmit(e, "PAY")}>
                {payButtonLabel}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
