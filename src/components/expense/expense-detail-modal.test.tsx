import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseDetailModal, type ExpenseDetail } from "./expense-detail-modal"

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc } }))

const confirmed: ExpenseDetail = {
  id: "e1",
  title: "패키지",
  status: "CONFIRMED",
  target_date: "2026-10-08",
  original_price: 119000,
  point_discount_amount: 5000,
  used_points: 250,
  earned_points: 228,
  final_amount: 114000,
}

describe("ExpenseDetailModal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refunds a confirmed payment after confirmation", async () => {
    rpc.mockResolvedValue({ error: null })
    const onRefunded = vi.fn()
    render(<ExpenseDetailModal expense={confirmed} onOpenChange={vi.fn()} onRefunded={onRefunded} />)

    fireEvent.click(screen.getByRole("button", { name: "결제 취소" }))
    expect(rpc).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "취소 확정" }))

    await waitFor(() => expect(onRefunded).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("refund_expense_payment", { p_expense_id: "e1" })
  })

  it("shows a rejection message when earned points were already spent", async () => {
    rpc.mockResolvedValue({ error: { message: "적립 포인트를 이미 사용하여 환불을 진행할 수 없습니다." } })
    const onRefunded = vi.fn()
    render(<ExpenseDetailModal expense={confirmed} onOpenChange={vi.fn()} onRefunded={onRefunded} />)

    fireEvent.click(screen.getByRole("button", { name: "결제 취소" }))
    fireEvent.click(screen.getByRole("button", { name: "취소 확정" }))

    expect((await screen.findByRole("alert")).textContent).toContain("이미 사용")
    expect(onRefunded).not.toHaveBeenCalled()
  })

  it("offers no refund action for planned or cancelled expenses", () => {
    render(<ExpenseDetailModal expense={{ ...confirmed, status: "PLANNED" }} onOpenChange={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "결제 취소" })).toBeNull()
  })
})
