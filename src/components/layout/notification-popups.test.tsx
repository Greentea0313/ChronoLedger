import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationBell } from "./notification-bell"
import { sortPaymentPopupExpenses } from "./notification-payment-popup"

const { from, rpc, push } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), push: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("recharts", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("recharts")
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  }
})

const notification = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `알림 ${id}`,
  body: `본문 ${id}`,
  link_path: "/dashboard/expenses",
  read_at: "2026-11-27T00:00:00Z",
  created_at: "2026-11-27T00:00:00Z",
  kind: "EXPENSE_D1",
  scheduled_for: "2026-11-28",
  ...overrides,
})

/** `notifications` inbox query + one `expenses` query builder whose awaited result is `expenseResult`. */
function mockTables(inbox: unknown[], expenseResult: { data: unknown[] | null; error: { message: string } | null }) {
  const expenseBuilder: Record<string, ReturnType<typeof vi.fn>> = {}
  const chain = ["select", "eq", "in", "gte", "lt"]
  chain.forEach((name) => {
    expenseBuilder[name] = vi.fn().mockReturnValue(expenseBuilder)
  })
  Object.assign(expenseBuilder, { then: (resolve: (v: unknown) => unknown) => Promise.resolve(expenseResult).then(resolve) })
  const inboxBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: inbox, error: null }),
  }
  inboxBuilder.select.mockReturnValue(inboxBuilder)
  inboxBuilder.eq.mockReturnValue(inboxBuilder)
  inboxBuilder.order.mockReturnValue(inboxBuilder)
  from.mockImplementation((table: string) => (table === "expenses" ? expenseBuilder : inboxBuilder))
  return expenseBuilder
}

async function clickNotification(title: string) {
  fireEvent.click(screen.getByRole("button", { name: /^알림/ }))
  fireEvent.click(await screen.findByText(title))
}

describe("sortPaymentPopupExpenses", () => {
  it("puts PLANNED first, then larger amount, then title", () => {
    const sorted = sortPaymentPopupExpenses([
      { title: "나", final_amount: 100, status: "CONFIRMED" },
      { title: "가", final_amount: 500, status: "CONFIRMED" },
      { title: "다", final_amount: 100, status: "PLANNED" },
      { title: "라", final_amount: 100, status: "PLANNED" },
      { title: "마", final_amount: 900, status: "PLANNED" },
    ])
    expect(sorted.map((r) => r.title)).toEqual(["마", "다", "라", "가", "나"])
  })
})

describe("NotificationBell popups (R118-B·C)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: 1, error: null })
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })

  it("opens the payment popup for EXPENSE_D1 without navigating and queries by target_date and status", async () => {
    const expenses = mockTables([notification("a", { read_at: null })], {
      data: [
        { id: "1", title: "확정 항목", final_amount: 5000, status: "CONFIRMED" },
        { id: "2", title: "예정 작은 항목", final_amount: 1000, status: "PLANNED" },
        { id: "3", title: "예정 큰 항목", final_amount: 3000, status: "PLANNED" },
      ],
      error: null,
    })
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 a")

    const dialog = await screen.findByRole("dialog", { name: "11월 28일 결제 예정" })
    await waitFor(() => expect(within(dialog).getByText("예정 합계 4,000원")).toBeTruthy())
    expect(rpc).toHaveBeenCalledWith("mark_notifications_read", { p_notification_ids: ["a"] })
    expect(push).not.toHaveBeenCalled()
    expect(expenses.eq).toHaveBeenCalledWith("user_id", "u1")
    expect(expenses.eq).toHaveBeenCalledWith("target_date", "2026-11-28")
    expect(expenses.in).toHaveBeenCalledWith("status", ["PLANNED", "CONFIRMED"])
    const titles = within(dialog)
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "")
    expect(titles[0]).toContain("예정 큰 항목")
    expect(titles[1]).toContain("예정 작은 항목")
    expect(titles[2]).toContain("확정 항목")
    expect(titles[2]).toContain("결제 완료")
  })

  it("shows an empty state and navigates with the move button", async () => {
    mockTables([notification("a", { kind: "EXPENSE_DUE_TODAY" })], { data: [], error: null })
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 a")

    expect(await screen.findByText("이 날짜에 남은 결제 예정이 없음.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "지출 관리로 이동" }))
    expect(push).toHaveBeenCalledWith("/dashboard/expenses")
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "11월 28일 결제 예정" })).toBeNull())
  })

  it("shows a failure state and closes without navigating", async () => {
    mockTables([notification("a")], { data: null, error: { message: "boom" } })
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 a")

    expect(await screen.findByText("결제 내역을 불러오지 못함.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "닫기" }))
    expect(push).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText("결제 내역을 불러오지 못함.")).toBeNull())
  })

  it("still navigates for other kinds and for a null scheduled_for", async () => {
    mockTables([notification("a", { kind: "EXPENSE_AUTO_CONFIRMED" }), notification("b", { scheduled_for: null })], {
      data: [],
      error: null,
    })
    const { unmount } = render(<NotificationBell userId="u1" />)
    await clickNotification("알림 a")
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/expenses"))
    expect(screen.queryByRole("dialog", { name: /결제 예정/ })).toBeNull()
    unmount()

    push.mockClear()
    mockTables([notification("b", { scheduled_for: null })], { data: [], error: null })
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 b")
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/expenses"))
  })

  it("opens the monthly report popup with category rows from the C3 query", async () => {
    const expenses = mockTables(
      [notification("r", { kind: "MONTHLY_REPORT", scheduled_for: "2026-10-01", body: "10월 확정 지출 합계" })],
      {
        data: [
          { status: "CONFIRMED", category: "식비", final_amount: 3000, target_date: "2026-10-05" },
          { status: "CONFIRMED", category: "게임", final_amount: 20000, target_date: "2026-10-20" },
          { status: "CONFIRMED", category: "게임", final_amount: 7000, target_date: "2026-09-30" },
        ],
        error: null,
      },
    )
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 r")

    const dialog = await screen.findByRole("dialog", { name: "10월 지출 리포트" })
    expect(push).not.toHaveBeenCalled()
    expect(within(dialog).getByText("10월 확정 지출 합계")).toBeTruthy()
    await waitFor(() => expect(within(dialog).getByText(/10월 20,000원 · 9월 7,000원/)).toBeTruthy())
    expect(within(dialog).getByText(/10월 3,000원 · 9월 0원/)).toBeTruthy()
    const items = within(dialog).getAllByRole("listitem")
    expect(items[0].textContent).toContain("게임")
    expect(within(dialog).getByRole("img", { name: /카테고리별 확정 지출 차트/ })).toBeTruthy()
    expect(expenses.eq).toHaveBeenCalledWith("status", "CONFIRMED")
    expect(expenses.gte).toHaveBeenCalledWith("target_date", "2026-09-01")
    expect(expenses.lt).toHaveBeenCalledWith("target_date", "2026-11-01")
  })

  it("shows the report empty state when nothing is confirmed", async () => {
    mockTables([notification("r", { kind: "MONTHLY_REPORT", scheduled_for: "2026-01-01" })], { data: [], error: null })
    render(<NotificationBell userId="u1" />)
    await clickNotification("알림 r")
    expect(await screen.findByText("확정된 지출 내역이 없음.")).toBeTruthy()
    expect(screen.getByRole("dialog", { name: "1월 지출 리포트" })).toBeTruthy()
  })
})
