"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { ensureMonthlySubscriptionExpenses, type SubscriptionCycleType } from "@/lib/subscription-sync"

interface SubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

interface GameOption {
  id: string
  name: string
}


const PAYMENT_METHODS = [
  { value: "WALLET", label: "내 지갑" },
  { value: "GOOGLE_PLAY", label: "Google Play" },
  { value: "GALAXY_STORE", label: "Galaxy Store" },
] as const

const CYCLE_TYPE_OPTIONS: { value: SubscriptionCycleType; label: string; desc: string }[] = [
  {
    value: "MONTHLY_DAY",
    label: "매월 지정일형",
    desc: "OTT 등 매월 지정된 일자에 정기 결제",
  },
  {
    value: "INTERVAL_30",
    label: "30일 누적 충전형",
    desc: "월정액 결제 시마다 +30일 연장 누적",
  },
  {
    value: "VERSION_PASS",
    label: "게임 버전 패스형",
    desc: "게임 새 버전 시작 시 자동 회차 연동 (게임 연관 필수)",
  },
]

const selectClassName =
  "h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const labelClassName = "block text-xs text-content-secondary mb-1"
const inputClassName = "bg-surface-2 text-content border-line-control"

function toAmount(value: string): number {
  return value.trim() === "" ? 0 : Number(value)
}

export function SubscriptionModal({ open, onOpenChange, onCreated }: SubscriptionModalProps) {
  const isOnline = useOnlineStatus()
  const { user } = useAuth()

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("정기 구독")
  const [gameId, setGameId] = useState("")
  const [games, setGames] = useState<GameOption[]>([])
  const [cycleType, setCycleType] = useState<SubscriptionCycleType>("MONTHLY_DAY")
  const [billingDay, setBillingDay] = useState("1")
  const [defaultPrice, setDefaultPrice] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "GOOGLE_PLAY" | "GALAXY_STORE">("WALLET")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setTitle("")
    setCategory("정기 구독")
    setGameId("")
    setCycleType("MONTHLY_DAY")
    setBillingDay("1")
    setDefaultPrice("")
    setPaymentMethod("WALLET")
  }, [open])

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    void (async () => {
      const [gameResult, userGamesResult] = await Promise.all([
        supabase.from("games").select("id, name").order("name"),
        supabase.from("user_games").select("game_id").eq("user_id", user.id),
      ])
      if (cancelled) return
      const userGameIds = new Set((userGamesResult.data ?? []).map((ug: { game_id: string }) => ug.game_id))
      const filteredGames = (gameResult.data ?? []).filter((g: { id: string }) => userGameIds.has(g.id))
      setGames(filteredGames as GameOption[])
    })()
    return () => {
      cancelled = true
    }
  }, [open, user])



  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (isOffline()) return setError(OFFLINE_WRITE_MESSAGE)
    setError(null)

    if (!title.trim()) return setError("구독 제목을 입력해 주세요.")
    if (cycleType === "VERSION_PASS" && !gameId) {
      return setError("버전 패스형은 연관 게임을 선택해야 합니다.")
    }
    if (cycleType === "MONTHLY_DAY") {
      const dayNum = Number(billingDay)
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        return setError("결제일은 1일에서 31일 사이로 입력해 주세요.")
      }
    }
    const priceNum = toAmount(defaultPrice)
    if (priceNum < 0) return setError("기본 금액은 0원 이상이어야 합니다.")

    setIsSubmitting(true)
    try {
      const { error: insertError } = await supabase
        .from("subscription_templates")
        .insert({
          user_id: user.id,
          title: title.trim(),
          category: "정기 구독",
          game_id: gameId || null,
          cycle_type: cycleType,
          billing_day: cycleType === "MONTHLY_DAY" ? Number(billingDay) : 1,
          default_price: priceNum,
          payment_method: paymentMethod,
          is_active: true,
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      // 템플릿 생성 즉시 첫 회차 동기화 생성
      const now = new Date()
      await ensureMonthlySubscriptionExpenses(user.id, now.getFullYear(), now.getMonth() + 1).catch(() => {})

      onCreated?.()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "구독 템플릿을 저장하지 못했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface text-content sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>새 정기 구독 추가</DialogTitle>
          <DialogDescription>
            반복 결제되는 정기 구독 또는 게임 버전 패스 템플릿을 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-2">
          {/* 1. 카테고리 (고정) */}
          <div>
            <label htmlFor="sub-category" className={labelClassName}>
              카테고리
            </label>
            <Input
              id="sub-category"
              className={inputClassName}
              value="정기 구독"
              disabled
              readOnly
            />
          </div>

          {/* 2. 연관 게임 (선택 사항, 버전 패스형 시 필수) */}
          <div>
            <label htmlFor="sub-game" className={labelClassName}>
              연관 게임 {cycleType === "VERSION_PASS" ? "*" : "(선택 사항)"}
            </label>
            <select
              id="sub-game"
              className={selectClassName}
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            >
              <option value="">게임 선택 안 함</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 구독 제목 */}
          <div>
            <label htmlFor="sub-title" className={labelClassName}>
              구독 제목 *
            </label>
            <Input
              id="sub-title"
              className={inputClassName}
              placeholder="구독 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
            />
          </div>

          {/* 4. 결제 주기 유형 (3종 모델) */}
          <div>
            <label htmlFor="sub-cycle-type" className={labelClassName}>
              결제 주기 유형 *
            </label>
            <select
              id="sub-cycle-type"
              className={selectClassName}
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value as SubscriptionCycleType)}
            >
              {CYCLE_TYPE_OPTIONS.map((opt) => {
                const disabled = opt.value === "VERSION_PASS" && category !== "게임"
                return (
                  <option key={opt.value} value={opt.value} disabled={disabled}>
                    {opt.label} {disabled ? "(게임 카테고리 전용)" : ""}
                  </option>
                )
              })}
            </select>
            <p className="text-[11px] text-content-muted mt-1">
              {CYCLE_TYPE_OPTIONS.find((o) => o.value === cycleType)?.desc}
            </p>
          </div>

          {/* 5. 결제일 (MONTHLY_DAY일 때만 노출) */}
          {cycleType === "MONTHLY_DAY" && (
            <div>
              <label htmlFor="sub-billing-day" className={labelClassName}>
                매월 결제일 (1~31일) *
              </label>
              <Input
                id="sub-billing-day"
                type="number"
                min="1"
                max="31"
                className={inputClassName}
                placeholder="1"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                required
              />
              <p className="text-[11px] text-content-muted mt-0.5">
                해당 월에 없는 일자(예: 2월 30일)는 말일로 자동 보정됩니다.
              </p>
            </div>
          )}

          {/* 6. 기본 금액 및 결제수단 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sub-default-price" className={labelClassName}>
                기본 금액 (원) *
              </label>
              <Input
                id="sub-default-price"
                type="number"
                min="0"
                step="1"
                className={inputClassName}
                placeholder="0"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="sub-payment-method" className={labelClassName}>
                결제수단 *
              </label>
              <select
                id="sub-payment-method"
                className={selectClassName}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number]["value"])}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {isSubmitting ? "저장 중..." : "구독 추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

