import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DashboardPage from "./page"
import { getGridRange } from "@/lib/calendar-utils"

const {
  from,
  useAuth,
  ensureMonthlySubscriptionExpenses,
} = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  ensureMonthlySubscriptionExpenses: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/subscription-sync", () => ({ ensureMonthlySubscriptionExpenses }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

function createQueryBuilder() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    or: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.gte.mockReturnValue(query)
  query.lt.mockReturnValue(query)
  query.or.mockReturnValue(query)
  return query
}

function createThenableBuilder(data: unknown[]) {
  const query = createQueryBuilder()
  Object.assign(query, {
    then: (resolve: (value: unknown) => unknown) => resolve({ data, error: null }),
  })
  return query
}

describe("DashboardPage", () => {
  it("그리드 범위의 end_date PLANNED 행을 병합하고 기한 지난 항목이 있으면 차단 모달을 자동으로 연다", async () => {
    const now = new Date()
    const selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(0)

    const targetBuilder = createThenableBuilder([])
    const endDateBuilder = createThenableBuilder([
      { id: "p1", title: "다월 픽업", final_amount: 40000, status: "PLANNED", target_date: "2000-01-01", end_date: selectedDate, game_id: "game-1" },
    ])
    const overdueBuilder = createThenableBuilder([
      { id: "o1", title: "만료 예정", final_amount: 10000, status: "PLANNED", target_date: "2000-01-01", end_date: "2000-01-02", original_price: 10000 },
    ])
    const expenseBuilders = [targetBuilder, endDateBuilder, overdueBuilder]
    const single = (data: unknown) => {
      const query = createQueryBuilder()
      query.maybeSingle.mockResolvedValue({ data, error: null })
      return query
    }
    const list = (data: unknown[]) => {
      const query = createThenableBuilder(data)
      return query
    }
    let expenseCall = 0
    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return single({ total_asset: 1, default_budget: 1 })
        case "monthly_budgets": return single(null)
        case "expenses": return expenseBuilders[expenseCall++]
        default: return list([])
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByText("기한이 지난 예정 지출")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
    expect(screen.getByText("만료 예정")).toBeTruthy()
    const range = getGridRange(now.getFullYear(), now.getMonth() + 1)
    expect(endDateBuilder.eq).toHaveBeenCalledWith("status", "PLANNED")
    expect(endDateBuilder.gte).toHaveBeenCalledWith("end_date", range.startDate)
    expect(endDateBuilder.lt).toHaveBeenCalledWith("end_date", range.endDateExclusive)
    expect(overdueBuilder.or).toHaveBeenCalledWith(expect.stringContaining("end_date.is.null"))
  })

  it("renders minimalist calendar and selected-day sidebar details", async () => {
    const now = new Date()
    const selectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(1)

    const finance = createQueryBuilder()
    finance.maybeSingle.mockResolvedValue({
      data: { total_asset: 100000, default_budget: 300000 },
      error: null,
    })
    const budget = createQueryBuilder()
    budget.maybeSingle.mockResolvedValue({ data: { budget_amount: 300000 }, error: null })
    const wallets = createQueryBuilder()
    wallets.eq.mockResolvedValue({
      data: [{ platform: "GOOGLE_PLAY", current_balance: 1200 }],
      error: null,
    })
    const schedules = createQueryBuilder()
    schedules.gte.mockResolvedValue({
      data: [{ id: "s1", schedule_type: "PICKUP", start_date: selectedDate, end_date: selectedDate, game_id: "game-1" }],
      error: null,
    })
    const memos = createQueryBuilder()
    memos.lt.mockResolvedValue({ data: [{ memo_date: selectedDate, content: "메모 1" }], error: null })
    const expenses = createQueryBuilder()
    expenses.lt.mockResolvedValue({
      data: [{ id: "e1", title: "패키지", final_amount: 30000, status: "CONFIRMED", target_date: selectedDate, game_id: "game-1" }],
      error: null,
    })
    const userGames = createQueryBuilder()
    userGames.eq.mockResolvedValue({ data: [{ game_id: "game-1" }], error: null })

    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return finance
        case "monthly_budgets": return budget
        case "store_wallets": return wallets
        case "game_schedules": return schedules
        case "personal_memos": return memos
        case "expenses": return expenses
        case "user_games": return userGames
        default: return createQueryBuilder()
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByLabelText("월간 캘린더")).toBeTruthy()
    expect(screen.getAllByText("PICKUP").length).toBeGreaterThan(0)
    expect(screen.getByText("메모 1")).toBeTruthy()
    expect(screen.getByText("패키지")).toBeTruthy()
    expect(screen.getByText(/100,000/)).toBeTruthy()
    expect(expenses.gte).toHaveBeenCalledWith("target_date", getGridRange(now.getFullYear(), now.getMonth() + 1).startDate)
    expect(expenses.lt).toHaveBeenCalledWith("target_date", getGridRange(now.getFullYear(), now.getMonth() + 1).endDateExclusive)
    expect(screen.getAllByText(/30,000/).length).toBeGreaterThan(0)
  })
})
