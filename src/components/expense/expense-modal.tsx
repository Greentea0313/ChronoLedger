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

export interface PlannedExpenseInput {
  id: string
  title: string
  original_price: number
  payment_method?: string
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

const CATEGORIES = ["게임", "식비", "교통", "생활", "기타"] as const
const METHOD_LABELS: Record<PaymentMethod, string> = {
  WALLET: "내 지갑",
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
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
  const [scheduleId, setScheduleId] = useState("")
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [title, setTitle] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [couponPercent, setCouponPercent] = useState("")
  const [usedPoints, setUsedPoints] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLET")
  const [selectedPointPlatform, setSelectedPointPlatform] = useState<PointPlatform>("GOOGLE_PLAY")
  const [deductAsset, setDeductAsset] = useState(true)
  const [paymentDate, setPaymentDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingExpenseId = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    pendingExpenseId.current = null
    setError(null)
    setPaymentDate(initialDate || getKstToday())
    setTitle(plannedExpense?.title ?? "")
    setOriginalPrice(plannedExpense ? String(plannedExpense.original_price) : "")
    setDiscountAmount("")
    setCouponPercent("")
    setUsedPoints("")
    setPaymentMethod(
      plannedExpense?.payment_method &&
        (plannedExpense.payment_method === "WALLET" ||
          plannedExpense.payment_method === "GOOGLE_PLAY" ||
          plannedExpense.payment_method === "GALAXY_STORE")
        ? (plannedExpense.payment_method as PaymentMethod)
        : "WALLET",
    )
    setDeductAsset(true)
    setCategory("게임")
    setGameId("")
    setScheduleId("")
    setSchedules([])
  }, [open, plannedExpense, initialDate])

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    void (async () => {
      const [gameResult, walletResult, userGamesResult] = await Promise.all([
        supabase.from("games").select("id, name").order("name"),
        supabase.from("store_wallets").select("platform, current_balance, earn_rate").eq("user_id", user.id),
        supabase.from("user_games").select("game_id").eq("user_id", user.id),
      ])
      if (cancelled) return
      const userGameIds = new Set((userGamesResult.data ?? []).map((ug: { game_id: string }) => ug.game_id))
      const filteredGames = (gameResult.data ?? []).filter((g: { id: string }) => userGameIds.has(g.id))

      setGames(filteredGames as GameOption[])
      setWallets((walletResult.data ?? []) as WalletInfo[])
    })()
    return () => {
      cancelled = true
    }
  }, [open, user])

  useEffect(() => {
    if (!gameId) {
      setSchedules([])
      setScheduleId("")
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from("game_schedules")
        .select("id, game_id, title, schedule_type, start_date, end_date")
        .eq("game_id", gameId)
        .eq("schedule_type", "VERSION")
        .order("start_date")
      if (!cancelled) {
        const versionSchedules = (data ?? []) as ScheduleOption[]
        setSchedules(versionSchedules)
        if (paymentDate) {
          const matched = versionSchedules.find(
            (s) => s.start_date <= paymentDate && paymentDate <= s.end_date
          )
          if (matched) {
            setScheduleId(matched.id)
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

  const handlePriceChange = (val: string) => {
    setOriginalPrice(val)
    const pct = Number(couponPercent)
    const priceNum = toAmount(val)
    if (!isNaN(pct) && pct > 0 && priceNum > 0) {
      setDiscountAmount(String(Math.floor((priceNum * pct) / 100)))
    }
  }

  const handleCouponChange = (val: string) => {
    setCouponPercent(val)
    const pct = Number(val)
    const priceNum = toAmount(originalPrice)
    if (!isNaN(pct) && pct > 0 && priceNum > 0) {
      setDiscountAmount(String(Math.floor((priceNum * pct) / 100)))
    } else if (val === "") {
      setDiscountAmount("")
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

  const selectSchedule = (id: string) => {
    setScheduleId(id)
    const schedule = schedules.find((item) => item.id === id)
    const game = games.find((item) => item.id === gameId)
    if (schedule && game && !title.trim()) setTitle(`${game.name} ${schedule.title}`)
  }

  const handleSubmit = async (event: FormEvent | React.MouseEvent, actionType: "PLAN" | "PAY" = "PAY") => {
    event.preventDefault()
    if (!user) return
    if (isOffline()) return setError(OFFLINE_WRITE_MESSAGE)
    setError(null)

    if (actionType === "PAY") {
      const validation = validatePayment(input, getKstToday(), input.usedPoints > 0 ? (pointWallet?.current_balance ?? 0) : null)
      if (validation) return setError(validation)
    }
    if (!plannedExpense && !title.trim()) return setError("항목명을 입력해 주세요.")

    setIsSubmitting(true)
    try {
      let expenseId = plannedExpense?.id ?? pendingExpenseId.current
      if (!expenseId) {
        const schedule = isGameCategory ? schedules.find((item) => item.id === scheduleId) : undefined
        const { data, error: insertError } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            game_id: isGameCategory && gameId ? gameId : null,
            schedule_id: schedule?.id ?? null,
            title: title.trim(),
            category,
            status: "PLANNED",
            target_date: schedule?.end_date ?? input.paymentDate,
            start_date: schedule?.start_date ?? null,
            end_date: schedule?.end_date ?? null,
            original_price: input.originalPrice,
            final_amount: input.originalPrice,
            payment_method: paymentMethod,
            deduct_from_asset: deductAsset,
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
          p_deduct_asset: deductAsset,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-700 bg-gray-800 text-white">
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
                      setScheduleId("")
                      setSchedules([])
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
                    <select id="expense-game" className={selectClassName} value={gameId} onChange={(event) => { setGameId(event.target.value); setScheduleId("") }}>
                      <option value="">게임 선택 안 함</option>
                      {games.map((game) => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                  </div>
                  {gameId && (
                    <div>
                      <label htmlFor="expense-schedule" className={labelClassName}>연결할 버전 일정</label>
                      <select id="expense-schedule" className={selectClassName} value={scheduleId} onChange={(event) => selectSchedule(event.target.value)}>
                        <option value="">일정 연결 안 함</option>
                        {schedules.map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>{`${schedule.title} (${schedule.start_date} ~ ${schedule.end_date})`}</option>
                        ))}
                      </select>
                    </div>
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
              <Input id="expense-discount" type="number" inputMode="numeric" min={0} step={1} value={discountAmount} onChange={(event) => { setDiscountAmount(event.target.value); setCouponPercent("") }} className={inputClassName} />
            </div>
            <div>
              <label htmlFor="expense-used-points" className={labelClassName}>사용 포인트 (P)</label>
              <Input id="expense-used-points" type="number" inputMode="numeric" min={0} step={1} value={usedPoints} onChange={(event) => setUsedPoints(event.target.value)} className={inputClassName} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="expense-method" className={labelClassName}>결제수단</label>
              <select id="expense-method" className={selectClassName} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((method) => (
                  <option key={method} value={method}>{METHOD_LABELS[method]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-date" className={labelClassName}>결제일</label>
              <Input id="expense-date" type="date" value={paymentDate} min={plannedExpense ? getKstToday() : undefined} onChange={(event) => setPaymentDate(event.target.value)} className={inputClassName} />
            </div>
          </div>

          {paymentMethod === "WALLET" && input.usedPoints > 0 && (
            <div>
              <label htmlFor="expense-point-platform" className={labelClassName}>포인트 사용 지갑</label>
              <select id="expense-point-platform" className={selectClassName} value={selectedPointPlatform} onChange={(event) => setSelectedPointPlatform(event.target.value as PointPlatform)}>
                <option value="GOOGLE_PLAY">Google Play</option>
                <option value="GALAXY_STORE">Galaxy Store</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={deductAsset} onChange={(event) => setDeductAsset(event.target.checked)} />
            총 자산에서 차감
          </label>

          <div className="rounded border border-gray-700 bg-gray-900 p-3 text-sm" aria-live="polite">
            <p>{`실결제액: ${finalAmount.toLocaleString()} 원`}</p>
            {pointWallet && <p className="text-xs text-gray-400">{`포인트 잔액: ${pointWallet.current_balance.toLocaleString()} P`}</p>}
            {paymentMethod !== "WALLET" && <p className="text-xs text-gray-400">{`예상 적립(앱 추정): ${estimatedEarn.toLocaleString()} P`}</p>}
          </div>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

          {plannedExpense ? (
            <Button type="button" disabled={isSubmitting || !isOnline} className="w-full" onClick={(e) => void handleSubmit(e, "PAY")}>
              {isSubmitting ? "처리 중..." : "결제 확정"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting || !isOnline} className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border-gray-600" onClick={(e) => void handleSubmit(e, "PLAN")}>
                예정 지출로 등록
              </Button>
              <Button type="button" disabled={isSubmitting || !isOnline} className="flex-1" onClick={(e) => void handleSubmit(e, "PAY")}>
                {isSubmitting ? "처리 중..." : "결제 확정"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
