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
  calculateStoreEventEarn,
  mapPaymentError,
  mergeEventMemo,
  validatePayment,
  type PaymentMethod,
  type PointPlatform,
  type StoreEventConfig,
} from "@/lib/payment-calculations"
import { calculateNaverPayPayment } from "@/lib/naver-pay-calculations"
import { createNextIntervalSubscriptionExpense } from "@/lib/subscription-sync"

export interface PlannedExpenseInput {
  id: string
  title: string
  original_price: number
  payment_method?: string
  pickup_schedule_id?: string | null
  category?: string
  game_id?: string | null
  target_date?: string
  start_date?: string | null
  end_date?: string | null
  template_id?: string | null
  point_platform?: string | null
}

export interface PlannedExpenseEditInput {
  id: string
  title: string
  original_price: number
  category?: string
  target_date?: string
  start_date?: string | null
  end_date?: string | null
  payment_method?: string
  game_id?: string | null
  pickup_schedule_id?: string | null
  memo?: string | null
  point_platform?: string | null
}

/** 저장된 결제수단(구버전 스토어 값 포함)과 point_platform으로 모달의 스토어 플랫폼을 복원한다. */
function resolveStorePlatform(
  method: string | null | undefined,
  pointPlatform: string | null | undefined,
): "GOOGLE_PLAY" | "GALAXY_STORE" {
  if (method === "GALAXY_STORE" || method === "GOOGLE_PLAY") return method
  if (pointPlatform === "GALAXY_STORE" || pointPlatform === "GOOGLE_PLAY") return pointPlatform
  return "GOOGLE_PLAY"
}

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
  plannedExpense?: PlannedExpenseInput | null
  editingExpense?: PlannedExpenseEditInput | null
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
  NAVER_PAY: "네이버페이",
}
const PLATFORM_LABELS: Record<PaymentPlatform, string> = {
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
  OTHER: "기타 (스토어 외)",
}
const AVAILABLE_PAYMENT_METHODS: PaymentMethod[] = ["WALLET", "NAVER_PAY"]
const selectClassName = "h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const labelClassName = "block text-xs text-content-secondary"
const inputClassName = "bg-surface-2 text-content border-line-control"

function toAmount(value: string): number {
  return value.trim() === "" ? 0 : Number(value)
}

export function ExpenseModal({
  open,
  onOpenChange,
  onCompleted,
  plannedExpense = null,
  editingExpense = null,
  initialDate,
}: ExpenseModalProps) {
  const isOnline = useOnlineStatus()
  const { user } = useAuth()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("게임")
  const [games, setGames] = useState<GameOption[]>([])
  const [gameId, setGameId] = useState("")
  const [schedules, setSchedules] = useState<ScheduleOption[]>([])
  const [isVersionPass, setIsVersionPass] = useState(false)
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [title, setTitle] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [couponPercent, setCouponPercent] = useState("")
  const [usedPoints, setUsedPoints] = useState("")
  const [paymentPlatform, setPaymentPlatform] = useState<PaymentPlatform>("GOOGLE_PLAY")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLET")
  const [totalAsset, setTotalAsset] = useState(0)
  const [finalAmountInput, setFinalAmountInput] = useState("")
  const [deductAsset, setDeductAsset] = useState(true)
  const [paymentDate, setPaymentDate] = useState("")
  const [isGoogleBoostEnabled, setIsGoogleBoostEnabled] = useState(false)
  const [googleBoostMultiplier, setGoogleBoostMultiplier] = useState("2")
  const [isGalaxyPaybackEnabled, setIsGalaxyPaybackEnabled] = useState(false)
  const [galaxyPaybackRate, setGalaxyPaybackRate] = useState("10")
  const [earnedPointsInput, setEarnedPointsInput] = useState("")
  const [isEarnedPointsManual, setIsEarnedPointsManual] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = Boolean(editingExpense)
  const isPlannedPayment = Boolean(plannedExpense && !isEditMode)
  const pendingExpenseId = useRef<string | null>(null)
  const prevOpenRef = useRef(false)
  const prevPlannedExpenseIdRef = useRef<string | null>(null)
  const prevEditingExpenseIdRef = useRef<string | null>(null)
  const prevGameIdRef = useRef<string>("")
  const titleRef = useRef(title)
  titleRef.current = title

  useEffect(() => {
    const plannedId = plannedExpense?.id ?? null
    const editingId = editingExpense?.id ?? null
    const isOpening = open && !prevOpenRef.current
    const isNewPlannedExpense = open && plannedId !== null && plannedId !== prevPlannedExpenseIdRef.current
    const isNewEditingExpense = open && editingId !== null && editingId !== prevEditingExpenseIdRef.current

    if (isOpening || isNewPlannedExpense || isNewEditingExpense) {
      pendingExpenseId.current = null
      setError(null)
      setDiscountAmount("")
      setCouponPercent("")
      setUsedPoints("")
      setIsGoogleBoostEnabled(false)
      setGoogleBoostMultiplier("2")
      setIsGalaxyPaybackEnabled(false)
      setGalaxyPaybackRate("10")
      setEarnedPointsInput("")
      setIsEarnedPointsManual(false)
      setDeductAsset(true)

      if (editingExpense) {
        setTitle(editingExpense.title ?? "")
        const origStr = String(editingExpense.original_price ?? 0)
        setOriginalPrice(origStr)
        setFinalAmountInput(origStr)
        setPaymentDate(editingExpense.target_date || initialDate || getKstToday())
        const cat = editingExpense.category as (typeof CATEGORIES)[number]
        setCategory(CATEGORIES.includes(cat) ? cat : "게임")
        setGameId(editingExpense.game_id ?? "")
        prevGameIdRef.current = editingExpense.game_id ?? ""
        const isPass = Boolean(
          editingExpense.start_date &&
          editingExpense.end_date &&
          editingExpense.start_date !== editingExpense.end_date
        )
        setIsVersionPass(isPass)

        const method = editingExpense.payment_method
        const restoredPlatform = resolveStorePlatform(method, editingExpense.point_platform)
        if (method === "NAVER_PAY") {
          setPaymentMethod("NAVER_PAY")
        } else {
          setPaymentMethod("WALLET")
        }
        if (restoredPlatform === "GALAXY_STORE") {
          setPaymentPlatform("GALAXY_STORE")
        } else if (method === "GOOGLE_PLAY") {
          setPaymentPlatform("GOOGLE_PLAY")
        } else {
          setPaymentPlatform("GOOGLE_PLAY")
        }
      } else {
        setPaymentDate(plannedExpense?.target_date || initialDate || getKstToday())
        setTitle(plannedExpense?.title ?? "")
        const origStr = plannedExpense ? String(plannedExpense.original_price) : ""
        setOriginalPrice(origStr)
        setFinalAmountInput(origStr)

        const method = plannedExpense?.payment_method
        const restoredPlatform = resolveStorePlatform(method, plannedExpense?.point_platform)
        if (method === "NAVER_PAY") {
          setPaymentMethod("NAVER_PAY")
        } else {
          setPaymentMethod("WALLET")
        }
        if (restoredPlatform === "GALAXY_STORE") {
          setPaymentPlatform("GALAXY_STORE")
        } else if (method === "GOOGLE_PLAY") {
          setPaymentPlatform("GOOGLE_PLAY")
        } else {
          setPaymentPlatform("GOOGLE_PLAY")
        }
        const plannedCat = plannedExpense?.category as (typeof CATEGORIES)[number] | undefined
        setCategory(plannedCat && CATEGORIES.includes(plannedCat) ? plannedCat : "게임")
        setGameId(plannedExpense?.game_id ?? "")
        prevGameIdRef.current = plannedExpense?.game_id ?? ""
        setSchedules([])
        setIsVersionPass(false)
      }
    }
    prevOpenRef.current = open
    prevPlannedExpenseIdRef.current = plannedId
    prevEditingExpenseIdRef.current = editingId
  }, [open, plannedExpense, editingExpense, initialDate])

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
      prevGameIdRef.current = ""
      return
    }
    const isGameChanged = prevGameIdRef.current !== gameId
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from("game_schedules")
        .select("id, game_id, title, schedule_type, start_date, end_date")
        .eq("game_id", gameId)
        .in("schedule_type", ["VERSION"])
        .order("start_date")
      if (!cancelled) {
        const versionSchedules = ((data ?? []) as ScheduleOption[]).filter((s) => s.schedule_type === "VERSION")
        setSchedules(versionSchedules)
        if (isGameChanged && !isEditMode && !isPlannedPayment && paymentDate) {
          const matched = versionSchedules.find(
            (s) => s.start_date <= paymentDate && paymentDate <= s.end_date
          )
          if (matched) {
            const game = games.find((item) => item.id === gameId)
            if (game && !titleRef.current.trim()) setTitle(`${game.name} ${matched.title}`)
          }
        }
        prevGameIdRef.current = gameId
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId, paymentDate, games, isEditMode, isPlannedPayment])

  const matchingVersion = useMemo(() => {
    if (!paymentDate) return null
    return schedules.find((s) => s.start_date <= paymentDate && paymentDate <= s.end_date) ?? null
  }, [paymentDate, schedules])

  const updateCalculatedFinal = (orig: number, disc: number, pts: number) => {
    const effectiveDisc = disc > 0 ? disc : pts
    const calculated = Math.max(0, orig - effectiveDisc)
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
    if (orig >= targetFinal) {
      setDiscountAmount(String(orig - targetFinal))
      setCouponPercent("")
    } else {
      setOriginalPrice(String(targetFinal))
      setDiscountAmount("0")
      setCouponPercent("")
    }
  }

  const activePointPlatform =
    paymentPlatform === "GOOGLE_PLAY" || paymentPlatform === "GALAXY_STORE"
      ? paymentPlatform
      : null

  const input = useMemo(() => {
    const orig = toAmount(originalPrice)
    const uiDiscount = toAmount(discountAmount)
    const uPoints = toAmount(usedPoints)
    const effectiveDiscount = uiDiscount > 0 ? uiDiscount : uPoints

    if (uPoints > 0) {
      return {
        originalPrice: orig,
        discountAmount: 0,
        pointDiscountAmount: effectiveDiscount,
        usedPoints: uPoints,
        paymentMethod,
        paymentPlatform,
        pointPlatform: activePointPlatform,
        paymentDate,
      }
    }

    return {
      originalPrice: orig,
      discountAmount: uiDiscount,
      pointDiscountAmount: 0,
      usedPoints: 0,
      paymentMethod,
      paymentPlatform,
      // 포인트를 사용하지 않아도 스토어 결제라면 적립 대상 플랫폼을 RPC에 전달해야 적립이 누락되지 않는다.
      pointPlatform: activePointPlatform,
      paymentDate,
    }
  }, [discountAmount, originalPrice, paymentDate, paymentMethod, paymentPlatform, activePointPlatform, usedPoints])

  const finalAmount = calculateFinalAmount(input)
  const pointWallet = wallets.find((wallet) => wallet.platform === activePointPlatform)
  const earnWallet = wallets.find((wallet) => wallet.platform === paymentPlatform)
  const baseEarnRate = earnWallet?.earn_rate ?? 0

  const storeEventConfig = useMemo<StoreEventConfig>(() => ({
    isGoogleBoost: isGoogleBoostEnabled,
    googleMultiplier: Number(googleBoostMultiplier) || 1,
    isGalaxyPayback: isGalaxyPaybackEnabled,
    galaxyPaybackRate: Number(galaxyPaybackRate) || 0,
  }), [isGoogleBoostEnabled, googleBoostMultiplier, isGalaxyPaybackEnabled, galaxyPaybackRate])

  const storeEventResult = useMemo(() => {
    return calculateStoreEventEarn(finalAmount, baseEarnRate, paymentPlatform, storeEventConfig)
  }, [finalAmount, baseEarnRate, paymentPlatform, storeEventConfig])

  useEffect(() => {
    if (!isEarnedPointsManual) {
      setEarnedPointsInput(storeEventResult.earnedPoints > 0 ? String(storeEventResult.earnedPoints) : "")
    }
  }, [storeEventResult.earnedPoints, isEarnedPointsManual])

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

  const handleSubmit = async (
    event: FormEvent | React.MouseEvent,
    actionType: "PAY" | "PLAN" | "EDIT_PLAN" = isEditMode ? "EDIT_PLAN" : "PAY",
  ) => {
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
    if (!isPlannedPayment && !title.trim()) return setError("항목명을 입력해 주세요.")

    setIsSubmitting(true)
    const effectiveDeductAsset = paymentMethod === "NAVER_PAY" ? false : deductAsset
    try {
      const schedule = isGameCategory ? (matchingVersion ?? undefined) : undefined
      const finalMemo = mergeEventMemo(null, storeEventResult.eventTag)

      let effectiveStartDate = input.paymentDate
      let effectiveEndDate = input.paymentDate
      let effectiveTargetDate = input.paymentDate

      if (isVersionPass && matchingVersion) {
        effectiveStartDate = matchingVersion.start_date
        effectiveEndDate = matchingVersion.end_date
        effectiveTargetDate = matchingVersion.end_date
      }

      if (actionType === "EDIT_PLAN") {
        if (!editingExpense) return

        const { error: updateError } = await supabase
          .from("expenses")
          .update({
            title: title.trim(),
            category,
            target_date: effectiveTargetDate,
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            original_price: input.originalPrice,
            final_amount: input.originalPrice,
            payment_method: paymentMethod,
            point_platform: activePointPlatform,
            deduct_from_asset: effectiveDeductAsset,
            game_id: isGameCategory && gameId ? gameId : null,
            schedule_id: isGameCategory ? (schedule?.id ?? null) : null,
            pickup_schedule_id: null,
            memo: finalMemo,
          })
          .eq("id", editingExpense.id)

        if (updateError) throw new Error("UPDATE_FAILED")
        onCompleted?.()
        onOpenChange(false)
        return
      }

      let expenseId = plannedExpense?.id ?? pendingExpenseId.current
      if (!expenseId) {
        const { data, error: insertError } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            game_id: isGameCategory && gameId ? gameId : null,
            schedule_id: schedule?.id ?? null,
            pickup_schedule_id: null,
            title: title.trim(),
            category,
            status: "PLANNED",
            target_date: effectiveTargetDate,
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            original_price: input.originalPrice,
            final_amount: input.originalPrice,
            payment_method: paymentMethod,
            point_platform: activePointPlatform,
            deduct_from_asset: effectiveDeductAsset,
            memo: finalMemo,
          })
          .select("id")
          .single()
        if (insertError || !data) throw new Error("INSERT_FAILED")
        expenseId = data.id as string
        pendingExpenseId.current = expenseId
      }

      if (actionType === "PAY") {
        const customEarnedPoints = toAmount(earnedPointsInput)
        const finalMemo = mergeEventMemo(null, storeEventResult.eventTag)

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
          p_custom_earned_points: customEarnedPoints,
          p_memo: finalMemo,
        })
        if (rpcError) {
          setError(`${mapPaymentError(rpcError.message, "결제를 처리하지 못했습니다.")} 입력한 내용은 예정 지출로 저장되어 다시 시도할 수 있습니다.`)
          return
        }

        // 누적 충전형 구독 상품의 경우 결제 후 다음 회차 예정일 자동 연장 생성
        const targetTemplateId = plannedExpense?.template_id
        if (targetTemplateId && user?.id) {
          await createNextIntervalSubscriptionExpense({
            userId: user.id,
            templateId: targetTemplateId,
            originalTargetDate: plannedExpense.target_date,
            paymentDate: input.paymentDate,
          }).catch((err) => {
            console.warn("누적 충전형 다음 회차 자동 생성 실패 (비차단):", err)
          })
        }
      }
      pendingExpenseId.current = null
      onCompleted?.()
      onOpenChange(false)
    } catch {
      setError(actionType === "EDIT_PLAN" ? "예정 지출을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." : "지출을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-line bg-surface text-content p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "예정 지출 수정" : isPlannedPayment ? "예정 지출 결제" : "지출 등록 및 결제"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "예정된 지출의 정보를 수정합니다." : "결제 금액과 포인트는 서버에서 다시 검증하여 한 번에 반영됩니다."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          {!isPlannedPayment && (
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
                      setPaymentPlatform("OTHER")
                      setUsedPoints("")
                      updateCalculatedFinal(toAmount(originalPrice), toAmount(discountAmount), 0)
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

                      {matchingVersion && (
                        <div className="pt-0.5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-content">
                            <input
                              type="checkbox"
                              id="expense-version-pass-toggle"
                              checked={isVersionPass}
                              onChange={(e) => {
                                setIsVersionPass(e.target.checked)
                              }}
                            />
                            <span className="font-medium text-primary">
                              버전 패스형 (버전 종료일까지 결제 유예)
                            </span>
                          </label>
                          {isVersionPass && (
                            <p className="text-[11px] text-primary mt-1 pl-5">
                              ※ 유효 기간: {matchingVersion.start_date} ~ {matchingVersion.end_date} (버전 종료일 전까지 결제 유예 가능)
                            </p>
                          )}
                        </div>
                      )}

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

          {isPlannedPayment && <p className="text-sm font-semibold">{plannedExpense?.title}</p>}

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
                disabled={paymentPlatform === "OTHER"}
                placeholder={paymentPlatform === "OTHER" ? "스토어 외 포인트 사용 불가" : undefined}
                onChange={(event) => handleUsedPointsChange(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="expense-final-amount" className={labelClassName}>최종 실결제액 (원)</label>
              <span className="text-[11px] text-info">수동 수정 시 할인이 자동 역산됩니다</span>
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
                  if (nextPlatform === "OTHER") {
                    setUsedPoints("")
                    updateCalculatedFinal(toAmount(originalPrice), toAmount(discountAmount), 0)
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
                }}
              >
                {AVAILABLE_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{METHOD_LABELS[method]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="expense-date" className={labelClassName}>
              {isPlannedPayment
                ? "결제일"
                : isVersionPass
                ? "결제 예정일 (마감일: 버전 종료일)"
                : isEditMode
                ? "지출 예정일"
                : "결제일 / 예정일"}
            </label>
            <Input id="expense-date" type="date" value={paymentDate} min={isPlannedPayment ? getKstToday() : undefined} onChange={(event) => setPaymentDate(event.target.value)} className={inputClassName} />
          </div>

          {/* 스토어 포인트 적립 및 이벤트 부스트/페이백 설정 */}
          {paymentPlatform !== "OTHER" && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">
                  {PLATFORM_LABELS[paymentPlatform]} 포인트 적립
                </span>
                <span className="text-xs text-content-secondary">
                  기본 적립률: {baseEarnRate}%
                </span>
              </div>

              {/* Google Play 포인트 부스트 이벤트 */}
              {paymentPlatform === "GOOGLE_PLAY" && (
                <div className="space-y-1.5 pt-1 border-t border-primary/20">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-content">
                    <input
                      type="checkbox"
                      id="expense-google-boost-toggle"
                      checked={isGoogleBoostEnabled}
                      onChange={(e) => {
                        setIsGoogleBoostEnabled(e.target.checked)
                        setIsEarnedPointsManual(false)
                      }}
                    />
                    <span className="font-medium text-primary">포인트 부스트 이벤트 적용</span>
                  </label>

                  {isGoogleBoostEnabled && (
                    <div className="pl-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="expense-google-multiplier" className="text-xs text-content-secondary whitespace-nowrap">
                          부스트 배율:
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            id="expense-google-multiplier"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="1"
                            value={googleBoostMultiplier}
                            onChange={(e) => {
                              setGoogleBoostMultiplier(e.target.value)
                              setIsEarnedPointsManual(false)
                            }}
                            className="h-7 w-20 px-2 text-xs bg-surface-2 border-line text-content"
                          />
                          <span className="text-xs text-content-secondary">배</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-primary">
                        이벤트 고정: 1,000원당 {Number(googleBoostMultiplier) || 1}P ({storeEventResult.effectiveRate}%)
                        <span className="block text-content-secondary">등급별 기본 적립률과 무관하게 기본 1P(0.1%) × 부스트 배율로 적립됩니다.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Galaxy Store 페이백 이벤트 */}
              {paymentPlatform === "GALAXY_STORE" && (
                <div className="space-y-1.5 pt-1 border-t border-primary/20">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-content">
                    <input
                      type="checkbox"
                      id="expense-galaxy-payback-toggle"
                      checked={isGalaxyPaybackEnabled}
                      onChange={(e) => {
                        setIsGalaxyPaybackEnabled(e.target.checked)
                        setIsEarnedPointsManual(false)
                      }}
                    />
                    <span className="font-medium text-primary">페이백 이벤트 적용</span>
                  </label>

                  {isGalaxyPaybackEnabled && (
                    <div className="pl-5 space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="expense-galaxy-payback-rate" className="text-xs text-content-secondary whitespace-nowrap">
                          페이백률:
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            id="expense-galaxy-payback-rate"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0.1"
                            max="100"
                            value={galaxyPaybackRate}
                            onChange={(e) => {
                              setGalaxyPaybackRate(e.target.value)
                              setIsEarnedPointsManual(false)
                            }}
                            className="h-7 w-20 px-2 text-xs bg-surface-2 border-line text-content"
                          />
                          <span className="text-xs text-content-secondary">%</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-primary">
                        적립률: {galaxyPaybackRate || 0}% (기본 등급 적립률 대체)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 예상 적립 포인트 표시 및 수동 오버라이드 */}
              <div className="pt-1.5 border-t border-primary/20">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="expense-earned-points" className="text-xs text-content-secondary whitespace-nowrap">
                    예상 적립 포인트 (P):
                  </label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="expense-earned-points"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={earnedPointsInput}
                      onChange={(e) => {
                        setEarnedPointsInput(e.target.value)
                        setIsEarnedPointsManual(true)
                      }}
                      className="h-7 w-28 px-2 text-right text-xs bg-surface-2 border-line text-content"
                    />
                    <span className="text-xs text-content-secondary">P</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1 text-[11px] text-content-secondary">
                  <span>※ 영수증과 차이가 있을 경우 직접 수정할 수 있습니다.</span>
                  {isEarnedPointsManual && (
                    <button
                      type="button"
                      className="text-primary underline hover:opacity-80 text-[11px]"
                      onClick={() => {
                        setIsEarnedPointsManual(false)
                        setEarnedPointsInput(storeEventResult.earnedPoints > 0 ? String(storeEventResult.earnedPoints) : "")
                      }}
                    >
                      자동 계산값 복원
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {input.usedPoints > 0 && (
            <div>
              <label htmlFor="expense-point-platform" className={labelClassName}>포인트 사용 지갑</label>
              <select
                id="expense-point-platform"
                className={`${selectClassName} opacity-60 cursor-not-allowed`}
                value={activePointPlatform ?? "GOOGLE_PLAY"}
                disabled
              >
                <option value="GOOGLE_PLAY">Google Play</option>
                <option value="GALAXY_STORE">Galaxy Store</option>
              </select>
            </div>
          )}

          {paymentMethod === "NAVER_PAY" && (
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-success flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                  네이버페이 머니 결제 프리뷰
                </span>
                <span className="text-xs text-content-secondary">보유 머니: {naverBalance.toLocaleString()} 원</span>
              </div>

              {finalAmount <= 0 ? (
                <div className="text-xs text-success py-1">
                  할인 및 포인트로 전액 결제되어 추가 충전 및 결제액이 없습니다 (0원 결제).
                </div>
              ) : naverCalc && naverCalc.isRechargeNeeded ? (
                naverCalc.isAssetInsufficient ? (
                  <div className="rounded bg-danger/10 border border-danger/30 p-2.5 text-xs text-danger space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>⚠️ 총 자산 잔액 부족</span>
                      <span>필요 충전: {naverCalc.rechargeAmount.toLocaleString()} 원</span>
                    </div>
                    <p>
                      부족 금액 {naverCalc.shortage.toLocaleString()}원을 충전하기 위한 총 자산(보유: {totalAsset.toLocaleString()}원)이 부족합니다.
                    </p>
                  </div>
                ) : (
                  <div className="rounded bg-surface-2 border border-line p-2.5 text-xs space-y-1.5">
                    <div className="flex justify-between text-content">
                      <span>결제 필요 부족액</span>
                      <span className="text-warning font-semibold">{naverCalc.shortage.toLocaleString()} 원</span>
                    </div>
                    <div className="flex justify-between text-content">
                      <span>10,000원 단위 자동 충전액</span>
                      <span className="text-success font-semibold">+{naverCalc.rechargeAmount.toLocaleString()} 원</span>
                    </div>
                    <div className="flex justify-between text-content-secondary border-t border-line pt-1">
                      <span>충전 및 결제 후 예상 잔액</span>
                      <span className="text-content font-medium">{naverCalc.finalBalance.toLocaleString()} 원</span>
                    </div>
                    <p className="text-[11px] text-content-secondary mt-1">
                      * 총 자산({totalAsset.toLocaleString()}원)에서 {naverCalc.rechargeAmount.toLocaleString()}원이 차감되어 충전 후 결제됩니다.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-xs text-success flex justify-between items-center py-1">
                  <span>머니 잔액이 충분하여 추가 충전 없이 결제됩니다.</span>
                  <span className="text-content">결제 후: {(naverBalance - finalAmount).toLocaleString()} 원</span>
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
                <span className="text-xs text-content-secondary ml-1.5">(네이버페이는 부족 시 충전액만 차감)</span>
              )}
            </span>
          </label>

          <div className="rounded border border-line bg-surface-2 p-3 text-sm text-content" aria-live="polite">
            <p>{`실결제액: ${finalAmount.toLocaleString()} 원`}</p>
            {pointWallet && input.usedPoints > 0 && (
              <p className="text-xs text-content-secondary">{`포인트 잔액: ${pointWallet.current_balance.toLocaleString()} P`}</p>
            )}
            {paymentMethod === "NAVER_PAY" && (
              <p className="text-xs text-success">{`네이버페이 머니 잔액: ${naverBalance.toLocaleString()} 원`}</p>
            )}
            {paymentPlatform !== "OTHER" && toAmount(earnedPointsInput) > 0 && (
              <p className="text-xs text-primary font-medium">
                {`${PLATFORM_LABELS[paymentPlatform]} 예상 적립: ${toAmount(earnedPointsInput).toLocaleString()} P`}
                {storeEventResult.eventTag && ` ${storeEventResult.eventTag}`}
                {isEarnedPointsManual && " (수동 수정됨)"}
              </p>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          {isEditMode ? (
            <Button
              type="button"
              disabled={isSubmitting || !isOnline}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={(e) => void handleSubmit(e, "EDIT_PLAN")}
            >
              {isSubmitting ? "수정 중..." : "예정 지출 수정 완료"}
            </Button>
          ) : isPlannedPayment ? (
            <Button type="button" disabled={isPayDisabled} className="w-full" onClick={(e) => void handleSubmit(e, "PAY")}>
              {payButtonLabel}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting || !isOnline} className="flex-1" onClick={(e) => void handleSubmit(e, "PLAN")}>
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
