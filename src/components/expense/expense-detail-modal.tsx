"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { mapPaymentError } from "@/lib/payment-calculations"

export interface ExpenseDetail {
  id: string
  title: string
  category?: string
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  target_date: string
  original_price?: number
  discount_amount?: number
  point_discount_amount?: number
  used_points?: number
  earned_points?: number
  final_amount: number
  payment_method?: string
  point_platform?: string | null
  deduct_from_asset?: boolean
  gameName?: string | null
}

interface ExpenseDetailModalProps {
  expense: ExpenseDetail | null
  onOpenChange: (open: boolean) => void
  onRefunded?: () => void
}

const STATUS_LABELS = { PLANNED: "예정", CONFIRMED: "결제 완료", CANCELLED: "취소됨" }

function won(value: number | undefined): string {
  return `${(value ?? 0).toLocaleString()} 원`
}

export function ExpenseDetailModal({ expense, onOpenChange, onRefunded }: ExpenseDetailModalProps) {
  const isOnline = useOnlineStatus()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = (open: boolean) => {
    if (!open) {
      setIsConfirming(false)
      setError(null)
    }
    onOpenChange(open)
  }

  const refund = async () => {
    if (!expense) return
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setIsSubmitting(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc("refund_expense_payment", { p_expense_id: expense.id })
    setIsSubmitting(false)
    if (rpcError) {
      setIsConfirming(false)
      setError(mapPaymentError(rpcError.message, "결제를 취소하지 못했습니다. 잠시 후 다시 시도해 주세요."))
      return
    }
    onRefunded?.()
    close(false)
  }

  return (
    <Dialog open={expense !== null} onOpenChange={close}>
      <DialogContent className="border-gray-700 bg-gray-800 text-white">
        {expense && (
          <>
            <DialogHeader>
              <DialogTitle>{expense.title}</DialogTitle>
              <DialogDescription>{`${STATUS_LABELS[expense.status]} · ${expense.target_date}`}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-1 text-sm">
              {expense.gameName && (<><dt className="text-gray-400">게임</dt><dd>{expense.gameName}</dd></>)}
              {expense.category && (<><dt className="text-gray-400">카테고리</dt><dd>{expense.category}</dd></>)}
              {expense.original_price !== undefined && (<><dt className="text-gray-400">정가</dt><dd>{won(expense.original_price)}</dd></>)}
              {expense.discount_amount !== undefined && (<><dt className="text-gray-400">할인</dt><dd>{won(expense.discount_amount)}</dd></>)}
              {expense.point_discount_amount !== undefined && (<><dt className="text-gray-400">포인트 할인</dt><dd>{won(expense.point_discount_amount)}</dd></>)}
              {expense.used_points !== undefined && (<><dt className="text-gray-400">사용 포인트</dt><dd>{`${expense.used_points.toLocaleString()} P`}</dd></>)}
              {expense.earned_points !== undefined && (<><dt className="text-gray-400">적립 포인트</dt><dd>{`${expense.earned_points.toLocaleString()} P`}</dd></>)}
              {expense.payment_method && (<><dt className="text-gray-400">결제수단</dt><dd>{expense.payment_method}</dd></>)}
              <dt className="text-gray-400">실결제액</dt>
              <dd>{won(expense.final_amount)}</dd>
            </dl>

            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

            {expense.status === "CONFIRMED" && !isConfirming && (
              <Button type="button" variant="destructive" onClick={() => setIsConfirming(true)}>결제 취소</Button>
            )}
            {expense.status === "CONFIRMED" && isConfirming && (
              <div className="space-y-2 rounded border border-red-900 p-3 text-sm">
                <p>사용 포인트와 총 자산을 복원하고 적립 포인트를 회수합니다. 계속할까요?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" disabled={isSubmitting || !isOnline} onClick={() => void refund()}>
                    {isSubmitting ? "처리 중..." : "취소 확정"}
                  </Button>
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsConfirming(false)}>돌아가기</Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
