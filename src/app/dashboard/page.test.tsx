import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "./page"
import { getKstMonthDateRange } from "@/lib/dashboard-date"

const { from, useAuth, replace } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth,
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from,
    auth: { signOut: vi.fn() },
  },
}))

function createQueryBuilder() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    maybeSingle: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.or.mockReturnValue(query)
  return query
}

describe("DashboardPage", () => {
  let financeQuery: ReturnType<typeof createQueryBuilder>
  let expenseQuery: ReturnType<typeof createQueryBuilder>
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    financeQuery = createQueryBuilder()
    expenseQuery = createQueryBuilder()
    useAuth.mockReturnValue({
      user: { id: "user-1", email: "user@example.com" },
      isLoading: false,
    })
    from.mockImplementation((table: string) =>
      table === "user_finances" ? financeQuery : expenseQuery,
    )
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  async function renderPage() {
    await act(async () => {
      root.render(<DashboardPage />)
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  function zeroAmountCount() {
    return Array.from(container.querySelectorAll(".text-3xl")).filter(
      (element) => element.textContent?.trim() === "0 원",
    ).length
  }

  it("shows valid zero balances and queries the current KST month", async () => {
    financeQuery.maybeSingle.mockResolvedValue({
      data: { total_asset: 0 },
      error: null,
    })
    expenseQuery.or.mockResolvedValue({ data: [], error: null })

    await renderPage()

    expect(zeroAmountCount()).toBe(2)

    const { startDate, endDateExclusive } = getKstMonthDateRange(new Date())
    expect(expenseQuery.eq).toHaveBeenCalledWith("status", "PLANNED")
    expect(expenseQuery.or).toHaveBeenCalledWith(
      `and(end_date.gte.${startDate},end_date.lt.${endDateExclusive}),and(end_date.is.null,target_date.gte.${startDate},target_date.lt.${endDateExclusive})`,
    )
  })

  it("sums planned expenses in the selected month", async () => {
    financeQuery.maybeSingle.mockResolvedValue({
      data: { total_asset: 12500 },
      error: null,
    })
    expenseQuery.or.mockResolvedValue({
      data: [{ final_amount: 2500 }, { final_amount: 1000 }],
      error: null,
    })

    await renderPage()

    expect(container.querySelector(".text-3xl")?.textContent).toContain("12,500 원")
    expect(container.querySelectorAll(".text-3xl")[1]?.textContent).toContain("3,500 원")
  })

  it("does not display a missing finance row as a zero balance", async () => {
    financeQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    expenseQuery.or.mockResolvedValue({ data: [], error: null })

    await renderPage()

    expect(container.textContent).toContain("자산 데이터가 아직 설정되지 않았습니다.")
    expect(zeroAmountCount()).toBe(1)
  })

  it("provides a dashboard entry point to request games and schedules", async () => {
    financeQuery.maybeSingle.mockResolvedValue({ data: { total_asset: 0 }, error: null })
    expenseQuery.or.mockResolvedValue({ data: [], error: null })

    await renderPage()

    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "게임·일정 요청")).toBe(true)
  })
  it("does not display a failed planned-expense query as zero", async () => {
    financeQuery.maybeSingle.mockResolvedValue({
      data: { total_asset: 0 },
      error: null,
    })
    expenseQuery.or.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    })

    await renderPage()

    expect(container.textContent).toContain("지출 데이터를 불러올 수 없습니다.")
    expect(zeroAmountCount()).toBe(1)
  })
})
