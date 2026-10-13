"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { getKstToday } from "@/lib/dashboard-date"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"

interface IncomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

const INCOME_CATEGORIES = ["급여", "용돈", "상여금", "금융수익", "기타"] as const

const selectClassName =
  "h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const labelClassName = "block text-xs text-content-secondary mb-1"
const inputClassName = "bg-surface-2 text-content border-line-control"

export function IncomeModal({ open, onOpenChange, onCompleted }: IncomeModalProps) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()

  const [category, setCategory] = useState<(typeof INCOME_CATEGORIES)[number]>("급여")
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [incomeDate, setIncomeDate] = useState("")
  const [currentAsset, setCurrentAsset] = useState<number>(0)
  const [defaultBudget, setDefaultBudget] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setCategory("급여")
      setTitle("급여 입금")
      setAmount("")
      setIncomeDate(getKstToday())

      if (user?.id) {
        void (async () => {
          const { data } = await supabase
            .from("user_finances")
            .select("total_asset, default_budget")
            .eq("user_id", user.id)
            .maybeSingle()
          if (data) {
            setCurrentAsset(Number(data.total_asset ?? 0))
            setDefaultBudget(Number(data.default_budget ?? 0))
          }
        })()
      }
    }
  }, [open, user?.id])

  const handleCategoryChange = (newCat: (typeof INCOME_CATEGORIES)[number]) => {
    setCategory(newCat)
    if (!title || INCOME_CATEGORIES.some((c) => title.includes(c))) {
      setTitle(`${newCat} 입금`)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (isOffline()) return setError(OFFLINE_WRITE_MESSAGE)
    setError(null)

    const incomeAmount = Math.floor(Number(amount))
    if (isNaN(incomeAmount) || incomeAmount <= 0) {
      return setError("수익 금액은 1원 이상의 정수로 입력해 주세요.")
    }

    if (!title.trim()) {
      return setError("수익 항목명을 입력해 주세요.")
    }

    setIsSubmitting(true)
    try {
      const newTotalAsset = currentAsset + incomeAmount

      // set_user_finance_settings RPC로 자산 갱신
      const { error: rpcError } = await supabase.rpc("set_user_finance_settings", {
        p_total_asset: newTotalAsset,
        p_default_budget: defaultBudget,
      })

      if (rpcError) {
        // RPC 오류 시 직접 update 시도
        const { error: updateError } = await supabase
          .from("user_finances")
          .update({ total_asset: newTotalAsset })
          .eq("user_id", user.id)
        if (updateError) {
          throw new Error(rpcError.message || updateError.message)
        }
      }

      onCompleted?.()
      onOpenChange(false)
    } catch {
      setError("수익을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const amountNum = Math.floor(Number(amount)) || 0
  const previewNewAsset = currentAsset + amountNum

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-line bg-surface text-content sm:max-w-[440px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-content">수익(자산 증액) 추가</DialogTitle>
          <DialogDescription className="text-xs text-content-secondary">
            급여, 용돈 등 수입을 등록하여 총 자산을 증액합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm mt-1">
          {/* 1. 카테고리 */}
          <div>
            <label htmlFor="income-category" className={labelClassName}>
              수익 유형
            </label>
            <select
              id="income-category"
              className={selectClassName}
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as (typeof INCOME_CATEGORIES)[number])}
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 항목명 */}
          <div>
            <label htmlFor="income-title" className={labelClassName}>
              항목명 *
            </label>
            <Input
              id="income-title"
              className={inputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 10월 급여"
              maxLength={100}
              required
            />
          </div>

          {/* 3. 금액 */}
          <div>
            <label htmlFor="income-amount" className={labelClassName}>
              입금 금액 (원) *
            </label>
            <Input
              id="income-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className={inputClassName}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* 4. 입금일 */}
          <div>
            <label htmlFor="income-date" className={labelClassName}>
              입금일
            </label>
            <Input
              id="income-date"
              type="date"
              className={inputClassName}
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />
          </div>

          {/* 자산 증액 프리뷰 */}
          <div className="rounded-md border border-line bg-surface-2 p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-content-secondary">
              <span>현재 총 자산</span>
              <span>{currentAsset.toLocaleString()} 원</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>+ 추가 수익금</span>
              <span>+{amountNum.toLocaleString()} 원</span>
            </div>
            <div className="flex justify-between text-content font-bold border-t border-line pt-1.5">
              <span>반영 후 총 자산</span>
              <span className="text-primary">{previewNewAsset.toLocaleString()} 원</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-line-control text-content-secondary hover:text-content"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isOnline || amountNum <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {isSubmitting ? "반영 중..." : "수익 추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
