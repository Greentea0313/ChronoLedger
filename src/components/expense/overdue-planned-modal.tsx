"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { getBudgetDate } from "@/lib/budget-calculations"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"

export interface OverduePlannedExpense {
  id: string
  title: string
  original_price: number
  final_amount: number
  target_date: string
  end_date?: string | null
}

interface OverduePlannedModalProps {
  open: boolean
  expenses: OverduePlannedExpense[]
  onPay: (expense: OverduePlannedExpense) => void
  onChanged?: () => void
}

/** 기한이 지난 PLANNED 항목이 남아 있는 동안 닫을 수 없는(차단형) 모달이다. 목록이 비면 부모가 open을 false로 만든다. */
export function OverduePlannedModal({ open, expenses, onPay, onChanged }: OverduePlannedModalProps) {
  const isOnline = useOnlineStatus()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancel = async (expense: OverduePlannedExpense) => {
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setBusyId(expense.id)
    setError(null)
    const { error: rpcError } = await supabase.rpc("cancel_planned_expense", { p_expense_id: expense.id })
    setBusyId(null)
    if (rpcError) {
      setError("예정 지출을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.")
      return
    }
    onChanged?.()
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="max-h-[90vh] overflow-y-auto border-gray-700 bg-gray-800 text-white"
      >
        <DialogHeader>
          <DialogTitle>기한이 지난 예정 지출</DialogTitle>
          <DialogDescription>
            결제하지 않은 채 종료일이 지난 항목입니다. 계속하려면 결제하거나 예정을 취소해 정리해 주세요.
          </DialogDescription>
        </DialogHeader>

        {!isOnline && <p role="status" className="text-sm text-yellow-300">오프라인 상태입니다. 연결이 복구되면 결제 또는 예정 취소를 진행할 수 있습니다.</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {expenses.length === 0 && <p className="text-sm text-gray-300">정리할 항목이 없습니다.</p>}

        <ul className="space-y-2">
          {expenses.map((expense) => (
            <li key={expense.id} className="rounded border border-gray-600 p-3 text-sm">
              <p className="font-medium">{expense.title}</p>
              <p className="text-gray-400">{`만료일 ${getBudgetDate({ ...expense, status: "PLANNED" })} · ${expense.final_amount.toLocaleString()} 원`}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" disabled={!isOnline || busyId !== null} onClick={() => onPay(expense)}>
                  결제하기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!isOnline || busyId !== null}
                  onClick={() => void cancel(expense)}
                >
                  {busyId === expense.id ? "처리 중..." : "예정 취소"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
