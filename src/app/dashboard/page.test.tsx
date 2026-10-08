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
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.gte.mockReturnValue(query)
  query.lt.mockReturnValue(query)
  return query
}

describe("DashboardPage", () => {
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
