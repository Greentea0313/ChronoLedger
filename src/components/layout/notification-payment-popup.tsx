"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PaymentPopupExpense {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED"
}

export interface NotificationPopupProps {
  userId: string
  /** 알림의 `scheduled_for`(YYYY-MM-DD). */
  scheduledFor: string
  onNavigate: () => void
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
}

/** PLANNED 먼저, 같은 상태 안에서 금액 큰 순, 같으면 항목명 오름차순(R118 B3). */
export function sortPaymentPopupExpenses<T extends { title: string; final_amount: number; status: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) return a.status === "PLANNED" ? -1 : 1
    if (a.final_amount !== b.final_amount) return b.final_amount - a.final_amount
    return a.title.localeCompare(b.title, "ko")
  })
}

export function formatPaymentDateTitle(scheduledFor: string): string {
  const [, month, day] = scheduledFor.split("-").map(Number)
  return `${month}월 ${day}일 결제 예정`
}

/** 결제 예정 알림(`EXPENSE_D1`·`EXPENSE_DUE_TODAY`) 팝업. 읽기 전용이며 열릴 때 1회만 조회함. */
export function NotificationPaymentPopup({ userId, scheduledFor, onNavigate, onClose, onCloseAutoFocus }: NotificationPopupProps) {
  const [rows, setRows] = useState<PaymentPopupExpense[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("id, title, final_amount, status")
          .eq("user_id", userId)
          .eq("target_date", scheduledFor)
          .in("status", ["PLANNED", "CONFIRMED"])
        if (cancelled) return
        if (error) {
          setFailed(true)
          return
        }
        setRows(sortPaymentPopupExpenses((data ?? []) as PaymentPopupExpense[]))
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, scheduledFor])

  const plannedTotal = (rows ?? []).filter((r) => r.status === "PLANNED").reduce((sum, r) => sum + r.final_amount, 0)

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{formatPaymentDateTitle(scheduledFor)}</DialogTitle>
          <DialogDescription>알림 이후 바뀐 내용이 반영됨.</DialogDescription>
        </DialogHeader>
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            결제 내역을 불러오지 못함.
          </p>
        ) : rows === null ? (
          <p className="text-sm text-content-muted">불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-content-muted">이 날짜에 남은 결제 예정이 없음.</p>
        ) : (
          <>
            <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-content">{row.title}</span>
                  <span className="shrink-0 tabular-nums text-content">{row.final_amount.toLocaleString("ko-KR")}원</span>
                  <span
                    className={
                      row.status === "PLANNED"
                        ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        : "shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-content-secondary"
                    }
                  >
                    {row.status === "PLANNED" ? "예정" : "결제 완료"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-content">예정 합계 {plannedTotal.toLocaleString("ko-KR")}원</p>
          </>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-md px-3 text-sm text-content-secondary hover:bg-surface-2"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onNavigate}
            className="min-h-[40px] rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            지출 관리로 이동
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
