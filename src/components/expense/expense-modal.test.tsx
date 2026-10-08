import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseModal } from "./expense-modal"

const { from, rpc, useAuth, insert } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))

function query(result: unknown) {
  const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn() }
  q.select.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  q.order.mockResolvedValue(result)
  q.insert = insert
  return q
}

function setup() {
  from.mockImplementation((table: string) => {
    if (table === "games") return query({ data: [{ id: "g1", name: "Sample RPG" }], error: null })
    if (table === "game_schedules") {
      return query({
        data: [{ id: "s1", game_id: "g1", title: "픽업 A", schedule_type: "PICKUP", start_date: "2026-10-25", end_date: "2026-11-12" }],
        error: null,
      })
    }
    const wallets = query(null)
    wallets.eq.mockResolvedValue({ data: [{ platform: "GOOGLE_PLAY", current_balance: 1000, earn_rate: 0.2 }], error: null })
    return wallets
  })
  const inserted = { select: vi.fn(), single: vi.fn() }
  inserted.select.mockReturnValue(inserted)
  inserted.single.mockResolvedValue({ data: { id: "e1" }, error: null })
  insert.mockReturnValue(inserted)
}

describe("ExpenseModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "u1" } })
    setup()
  })

  it("registers a PLANNED expense then calls process_expense_payment with 114,000 final amount", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    fireEvent.click(await screen.findByRole("button", { name: "픽업" }))
    await screen.findByRole("option", { name: /픽업 A/ })
    fireEvent.change(screen.getByLabelText("연결할 일정"), { target: { value: "s1" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "119000" } })
    fireEvent.change(screen.getByLabelText("포인트 할인 (원)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "250" } })
    fireEvent.change(screen.getByLabelText("포인트 사용 지갑"), { target: { value: "GOOGLE_PLAY" } })

    expect(screen.getByText("실결제액: 114,000 원")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1",
      game_id: "g1",
      schedule_id: "s1",
      status: "PLANNED",
      original_price: 119000,
      final_amount: 119000,
      start_date: "2026-10-25",
      end_date: "2026-11-12",
      target_date: "2026-11-12",
    }))
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_expense_id: "e1",
      p_original_price: 119000,
      p_discount_amount: 0,
      p_point_discount_amount: 5000,
      p_used_points: 250,
      p_point_platform: "GOOGLE_PLAY",
      p_payment_method: "WALLET",
      p_deduct_asset: true,
    }))
  })

  it("blocks submit client-side when points exceed the wallet balance and does not call the server", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "테스트" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "10000" } })
    fireEvent.change(screen.getByLabelText("포인트 할인 (원)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    expect((await screen.findByRole("alert")).textContent).toContain("포인트 잔액이 부족")
    expect(insert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("reuses the saved planned expense on retry after an RPC failure", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "포인트 잔액이 부족합니다." } }).mockResolvedValueOnce({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "커피" } })
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "식비/카페" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "4500" } })

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))
    expect((await screen.findByRole("alert")).textContent).toContain("예정 지출로 저장")
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
