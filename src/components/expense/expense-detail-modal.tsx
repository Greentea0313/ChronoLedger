"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  pickupTitle?: string | null
  memo?: string | null
}

interface ExpenseDetailModalProps {
  expense: ExpenseDetail | null
  onOpenChange: (open: boolean) => void
  onRefunded?: () => void
  onUpdated?: () => void
}

const CATEGORIES = ["게임", "정기 구독", "식비", "교통", "생활", "기타"] as const
const STATUS_LABELS = { PLANNED: "예정", CONFIRMED: "결제 완료", CANCELLED: "취소됨" }
const METHOD_LABELS: Record<string, string> = {
  WALLET: "내 지갑",
  NAVER_PAY: "네이버페이",
  GOOGLE_PLAY: "내 지갑 (구 Google Play)",
  GALAXY_STORE: "내 지갑 (구 Galaxy Store)",
}
const PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
}

function won(value: number | undefined): string {
  return `${(value ?? 0).toLocaleString()} 원`
}

export function ExpenseDetailModal({ expense, onOpenChange, onRefunded, onUpdated }: ExpenseDetailModalProps) {
  const isOnline = useOnlineStatus()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState("기타")
  const [editMemo, setEditMemo] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setEditTitle(expense.title || "")
      setEditCategory(expense.category || "기타")
      setEditMemo(expense.memo || "")
      setIsEditing(false)
      setIsConfirming(false)
      setError(null)
    }
  }, [expense])

  const close = (open: boolean) => {
    if (!open) {
      setIsConfirming(false)
      setIsEditing(false)
      setError(null)
    }
    onOpenChange(open)
  }

  const startEdit = () => {
    if (!expense) return
    setEditTitle(expense.title || "")
    setEditCategory(expense.category || "기타")
    setEditMemo(expense.memo || "")
    setIsEditing(true)
    setIsConfirming(false)
    setError(null)
  }

  const saveEdit = async () => {
    if (!expense) return
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      setError("항목명을 입력해 주세요.")
      return
    }
    setIsSaving(true)
    setError(null)

    const trimmedMemo = editMemo.trim() || null
    const { error: rpcError } = await supabase.rpc("update_confirmed_expense_metadata", {
      p_expense_id: expense.id,
      p_title: trimmedTitle,
      p_category: editCategory,
      p_memo: trimmedMemo,
    })

    setIsSaving(false)
    if (rpcError) {
      setError(mapPaymentError(rpcError.message, "지출 정보를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."))
      return
    }

    expense.title = trimmedTitle
    expense.category = editCategory
    expense.memo = trimmedMemo
    setIsEditing(false)
    onUpdated?.()
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
      <DialogContent className="border-gray-700 bg-gray-800 text-white p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {expense && (
          <>
            <DialogHeader>
              <DialogTitle>{expense.title}</DialogTitle>
              <DialogDescription>{`${STATUS_LABELS[expense.status]} · ${expense.target_date}`}</DialogDescription>
            </DialogHeader>

            {isEditing ? (
              <div className="space-y-4 rounded-md border border-gray-700 bg-gray-900/60 p-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary">지출 정보 수정</p>
                  <p className="text-[11px] text-gray-400">
                    회계 무결성을 위해 결제 금액과 결제수단은 변경할 수 없습니다. 금액 변경은 결제 취소 후 재등록해 주세요.
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-expense-title" className="block text-xs text-gray-300">항목명</label>
                  <Input
                    id="edit-expense-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-gray-800 text-white border-gray-600"
                    placeholder="지출 항목명"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-expense-category" className="block text-xs text-gray-300">카테고리</label>
                  <select
                    id="edit-expense-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-expense-memo" className="block text-xs text-gray-300">메모</label>
                  <textarea
                    id="edit-expense-memo"
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-600 bg-gray-800 p-2.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder="메모 입력"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => setIsEditing(false)}>
                    취소
                  </Button>
                  <Button type="button" size="sm" disabled={isSaving || !isOnline} onClick={() => void saveEdit()}>
                    {isSaving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-1 text-sm">
                {expense.gameName && (<><dt className="text-gray-400">게임</dt><dd>{expense.gameName}</dd></>)}
                {expense.pickupTitle && (<><dt className="text-gray-400">픽업</dt><dd>{expense.pickupTitle}</dd></>)}
                {expense.category && (<><dt className="text-gray-400">카테고리</dt><dd>{expense.category}</dd></>)}
                {expense.original_price !== undefined && (<><dt className="text-gray-400">정가</dt><dd>{won(expense.original_price)}</dd></>)}
                {expense.discount_amount !== undefined && (<><dt className="text-gray-400">할인</dt><dd>{won(expense.discount_amount)}</dd></>)}
                {expense.used_points !== undefined && (<><dt className="text-gray-400">사용 포인트</dt><dd>{`${expense.used_points.toLocaleString()} P`}</dd></>)}
                {expense.earned_points !== undefined && (<><dt className="text-gray-400">적립 포인트</dt><dd>{`${expense.earned_points.toLocaleString()} P`}</dd></>)}
                {expense.point_platform && PLATFORM_LABELS[expense.point_platform] && (<><dt className="text-gray-400">결제 플랫폼</dt><dd>{PLATFORM_LABELS[expense.point_platform]}</dd></>)}
                {expense.payment_method && (<><dt className="text-gray-400">결제수단</dt><dd>{METHOD_LABELS[expense.payment_method] ?? expense.payment_method}</dd></>)}
                <dt className="text-gray-400">실결제액</dt>
                <dd>{won(expense.final_amount)}</dd>
                {expense.memo && (
                  <>
                    <dt className="text-gray-400">메모</dt>
                    <dd className="col-span-2 text-xs text-gray-300 bg-gray-900/50 p-2 rounded mt-1 whitespace-pre-wrap">
                      {expense.memo}
                    </dd>
                  </>
                )}
              </dl>
            )}

            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

            {expense.status === "CONFIRMED" && !isEditing && !isConfirming && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                <Button type="button" variant="outline" size="sm" onClick={startEdit}>
                  정보 수정
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => setIsConfirming(true)}>
                  결제 취소
                </Button>
              </div>
            )}
            {expense.status === "CONFIRMED" && isConfirming && (
              <div className="space-y-2 rounded-md border border-danger/50 p-3 text-sm">
                <p>
                  {expense.payment_method === "NAVER_PAY"
                    ? "결제 금액을 네이버페이 머니 잔액으로 전액 환불합니다. 계속할까요?"
                    : "사용 포인트와 총 자산을 복원하고 적립 포인트를 회수합니다. 계속할까요?"}
                </p>
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

