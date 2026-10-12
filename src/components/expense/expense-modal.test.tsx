import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseModal } from "./expense-modal"
import { getKstToday } from "@/lib/dashboard-date"

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
    if (table === "user_games") {
      const ug = query(null)
      ug.eq.mockResolvedValue({ data: [{ game_id: "g1" }], error: null })
      return ug
    }
    if (table === "game_schedules") {
      const today = getKstToday()
      return query({
        data: [{ id: "s1", game_id: "g1", title: "버전 1.0", schedule_type: "VERSION", start_date: today, end_date: today }],
        error: null,
      })
    }
    const wallets = query(null)
    wallets.eq.mockResolvedValue({ data: [{ platform: "GOOGLE_PLAY", current_balance: 10000, earn_rate: 0.2 }], error: null })
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
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 1.0" })
    expect(screen.getByLabelText("연결된 버전 일정")).toHaveProperty("disabled", true)
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "119000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "5000" } })
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
      start_date: today,
      end_date: today,
      target_date: today,
    }))
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_expense_id: "e1",
      p_original_price: 119000,
      p_discount_amount: 0,
      p_point_discount_amount: 5000,
      p_used_points: 5000,
      p_point_platform: "GOOGLE_PLAY",
      p_payment_method: "WALLET",
      p_deduct_asset: true,
    }))
  })

  it("blocks submit client-side when points exceed the wallet balance and does not call the server", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "테스트" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "20000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "15000" } })
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
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "식비" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "4500" } })

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))
    expect((await screen.findByRole("alert")).textContent).toContain("예정 지출로 저장")
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it("hides game selection when category is changed from 게임 to another category", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    expect(screen.getByLabelText("게임")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "식비" } })
    expect(screen.queryByLabelText("게임")).toBeNull()
  })

  it("결제일 기간에 진행 중인 버전 일정이 없으면 연결된 버전 일정이 disabled 상태로 안내 문구가 출력된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} initialDate="2026-01-01" />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })

    await waitFor(() => {
      const scheduleSelect = screen.getByLabelText("연결된 버전 일정")
      expect(scheduleSelect).toHaveProperty("disabled", true)
    })
    expect(screen.getByText("해당 날짜에 진행 중인 버전 일정이 없습니다")).toBeTruthy()
  })
})
