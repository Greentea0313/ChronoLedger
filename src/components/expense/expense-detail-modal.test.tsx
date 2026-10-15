import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseDetailModal, type ExpenseDetail } from "./expense-detail-modal"

const { rpc, rollbackIntervalSubscriptionExpense, useAuth } = vi.hoisted(() => ({
  rpc: vi.fn(),
  rollbackIntervalSubscriptionExpense: vi.fn().mockResolvedValue(true),
  useAuth: vi.fn().mockReturnValue({ user: { id: "user-123" } }),
}))
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc } }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/subscription-sync", () => ({ rollbackIntervalSubscriptionExpense }))

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

  it("renders NAVER_PAY label and tailored refund confirmation message", () => {
    const naverExpense: ExpenseDetail = {
      ...confirmed,
      payment_method: "NAVER_PAY",
    }
    render(<ExpenseDetailModal expense={naverExpense} onOpenChange={vi.fn()} />)
    expect(screen.getByText("네이버페이")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "결제 취소" }))
    expect(screen.getByText("결제 금액을 네이버페이 머니 잔액으로 전액 환불합니다. 계속할까요?")).toBeTruthy()
  })

  it("renders pickup title when pickupTitle is provided", () => {
    const pickupExpense: ExpenseDetail = {
      ...confirmed,
      pickupTitle: "2026 수영복 한정 픽업",
    }
    render(<ExpenseDetailModal expense={pickupExpense} onOpenChange={vi.fn()} />)
    expect(screen.getByText("픽업")).toBeTruthy()
    expect(screen.getByText("2026 수영복 한정 픽업")).toBeTruthy()
  })

  it("allows updating metadata (title, category, memo) for confirmed expenses", async () => {
    rpc.mockResolvedValue({ error: null })
    const onUpdated = vi.fn()
    render(<ExpenseDetailModal expense={confirmed} onOpenChange={vi.fn()} onUpdated={onUpdated} />)

    fireEvent.click(screen.getByRole("button", { name: "정보 수정" }))
    expect(screen.getByText("지출 정보 수정")).toBeTruthy()

    const titleInput = screen.getByLabelText("항목명")
    fireEvent.change(titleInput, { target: { value: "패키지 (수정됨)" } })

    const categorySelect = screen.getByLabelText("카테고리")
    fireEvent.change(categorySelect, { target: { value: "식비" } })

    const memoTextarea = screen.getByLabelText("메모")
    fireEvent.change(memoTextarea, { target: { value: "저녁 회식 결제" } })

    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => expect(onUpdated).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("update_confirmed_expense_metadata", {
      p_expense_id: "e1",
      p_title: "패키지 (수정됨)",
      p_category: "식비",
      p_memo: "저녁 회식 결제",
      p_target_date: "2026-10-08",
    })
  })

  it("allows updating target_date for confirmed expenses", async () => {
    rpc.mockResolvedValue({ error: null })
    const onUpdated = vi.fn()
    render(<ExpenseDetailModal expense={confirmed} onOpenChange={vi.fn()} onUpdated={onUpdated} />)

    fireEvent.click(screen.getByRole("button", { name: "정보 수정" }))
    const dateInput = screen.getByLabelText("결제일")
    fireEvent.change(dateInput, { target: { value: "2026-10-05" } })

    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => expect(onUpdated).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("update_confirmed_expense_metadata", expect.objectContaining({
      p_expense_id: "e1",
      p_target_date: "2026-10-05",
    }))
  })

  it("validates empty title when saving metadata edit", async () => {
    render(<ExpenseDetailModal expense={confirmed} onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "정보 수정" }))
    const titleInput = screen.getByLabelText("항목명")
    fireEvent.change(titleInput, { target: { value: "   " } })

    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect((await screen.findByRole("alert")).textContent).toContain("항목명을 입력해 주세요.")
    expect(rpc).not.toHaveBeenCalled()
  })

  it("누적 충전형 구독 지출 환불 시 rollbackIntervalSubscriptionExpense를 호출한다", async () => {
    rpc.mockResolvedValue({ error: null })
    const intervalExpense: ExpenseDetail = {
      ...confirmed,
      template_id: "tpl-interval-1",
    }
    const onRefunded = vi.fn()
    render(<ExpenseDetailModal expense={intervalExpense} onOpenChange={vi.fn()} onRefunded={onRefunded} />)

    fireEvent.click(screen.getByRole("button", { name: "결제 취소" }))
    fireEvent.click(screen.getByRole("button", { name: "취소 확정" }))

    await waitFor(() => expect(onRefunded).toHaveBeenCalled())
    expect(rollbackIntervalSubscriptionExpense).toHaveBeenCalledWith({
      userId: "user-123",
      expenseId: "e1",
      templateId: "tpl-interval-1",
    })
  })
})
