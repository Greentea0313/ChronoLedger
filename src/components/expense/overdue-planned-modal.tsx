"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { getBudgetDate } from "@/lib/budget-calculations"
import { useOnlineStatus } from "@/lib/use-online-status"

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
  onOpenChange: (open: boolean) => void
  onPay: (expense: OverduePlannedExpense) => void
  onChanged?: () => void
}

export function OverduePlannedModal({ open, expenses, onOpenChange, onPay, onChanged }: OverduePlannedModalProps) {
  const isOnline = useOnlineStatus()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancel = async (expense: OverduePlannedExpense) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-700 bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>기한이 지난 예정 지출</DialogTitle>
          <DialogDescription>
            결제하지 않은 채 종료일이 지난 항목입니다. 결제하거나 예정을 취소해 예산에서 정리해 주세요.
          </DialogDescription>
        </DialogHeader>

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
