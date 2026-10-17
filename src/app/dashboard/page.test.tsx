import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DashboardPage from "./page"
import { getGridRange } from "@/lib/calendar-utils"

const {
  from,
  useAuth,
  ensureMonthlySubscriptionExpenses,
  downloadUserIcon,
} = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  ensureMonthlySubscriptionExpenses: vi.fn(),
  downloadUserIcon: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/subscription-sync", () => ({ ensureMonthlySubscriptionExpenses }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/storage-upload", () => ({ downloadUserIcon }))

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
    expect(overdueBuilder.eq).toHaveBeenCalledWith("status", "PLANNED")
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
    expect(screen.getByText(/100,000/)).toBeTruthy()

    // 날짜 타일 클릭 시 HeroSidebar에 메모와 지출이 표시됨
    const dateCell = screen.getByLabelText(new RegExp(selectedDate))
    fireEvent.click(dateCell)

    expect(await screen.findByText("메모 1")).toBeTruthy()
    expect(screen.getByText("패키지")).toBeTruthy()
    expect(expenses.gte).toHaveBeenCalledWith("target_date", getGridRange(now.getFullYear(), now.getMonth() + 1).startDate)
    expect(expenses.lt).toHaveBeenCalledWith("target_date", getGridRange(now.getFullYear(), now.getMonth() + 1).endDateExclusive)
    expect(screen.getAllByText(/30,000/).length).toBeGreaterThan(0)
  })

  it("복수일 기간 일정의 아이콘은 전체 기간이 아닌 start_date 타일에만 표시된다", async () => {
    const now = new Date()
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-20`

    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(0)

    const single = (data: unknown) => {
      const query = createQueryBuilder()
      query.maybeSingle.mockResolvedValue({ data, error: null })
      return query
    }
    const list = (data: unknown[]) => {
      const query = createThenableBuilder(data)
      return query
    }

    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return single({ total_asset: 1, default_budget: 1 })
        case "monthly_budgets": return single(null)
        case "game_schedules": {
          const q = createQueryBuilder()
          q.gte.mockResolvedValue({
            data: [{ id: "s-multi", schedule_type: "VERSION", start_date: startDate, end_date: endDate, game_id: "game-multi" }],
            error: null,
          })
          return q
        }
        case "games": {
          const q = createQueryBuilder()
          q.select.mockResolvedValue({
            data: [{ id: "game-multi", name: "원신", default_icon_url: "/genshin.webp" }],
            error: null,
          })
          return q
        }
        case "user_games": {
          const q = createQueryBuilder()
          q.eq.mockResolvedValue({
            data: [{ game_id: "game-multi", games: { name: "원신", default_icon_url: "/genshin.webp" } }],
            error: null,
          })
          return q
        }
        default: return list([])
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByLabelText("월간 캘린더")).toBeTruthy()
    // start_date인 10일 타일에만 게임 아이콘이 렌더링되므로 총 1개 (또는 VERSION 태그 옆 1개 포함 소수)만 존재해야 함
    // 전체 기간(11일간) 모두 표시되었다면 11개 이상이었을 것
    const icons = screen.getAllByLabelText("원신")
    expect(icons.length).toBe(1)
  })

  it("구독하지 않은 게임의 일정은 캘린더에 표시되지 않는다", async () => {
    const now = new Date()
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-25`

    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(0)

    const single = (data: unknown) => {
      const query = createQueryBuilder()
      query.maybeSingle.mockResolvedValue({ data, error: null })
      return query
    }
    const list = (data: unknown[]) => {
      const query = createThenableBuilder(data)
      return query
    }

    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return single({ total_asset: 1, default_budget: 1 })
        case "monthly_budgets": return single(null)
        case "game_schedules": {
          const q = createQueryBuilder()
          q.gte.mockResolvedValue({
            data: [{ id: "s-unsubscribed", schedule_type: "VERSION", start_date: startDate, end_date: endDate, game_id: "game-endfield" }],
            error: null,
          })
          return q
        }
        case "games": {
          const q = createQueryBuilder()
          q.select.mockResolvedValue({
            data: [{ id: "game-endfield", name: "명일방주: 엔드필드", default_icon_url: "/endfield.webp" }],
            error: null,
          })
          return q
        }
        case "user_games": {
          const q = createQueryBuilder()
          // 사용자가 어떤 게임도 구독하지 않은 상태
          q.eq.mockResolvedValue({ data: [], error: null })
          return q
        }
        default: return list([])
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByLabelText("월간 캘린더")).toBeTruthy()
    // 구독하지 않은 명일방주: 엔드필드 아이콘 및 일정은 렌더링되지 않아야 함
    expect(screen.queryByLabelText("명일방주: 엔드필드")).toBeNull()
    expect(screen.queryByText("명일방주: 엔드필드")).toBeNull()
  })

  it("같은 날짜에 여러 게임 일정이 겹치면 타일 우측 아이콘이 게임명 가나다순으로 정렬된다", async () => {
    const now = new Date()
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-25`

    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(0)

    const single = (data: unknown) => {
      const query = createQueryBuilder()
      query.maybeSingle.mockResolvedValue({ data, error: null })
      return query
    }
    const list = (data: unknown[]) => {
      const query = createThenableBuilder(data)
      return query
    }

    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return single({ total_asset: 1, default_budget: 1 })
        case "monthly_budgets": return single(null)
        case "game_schedules": {
          const q = createQueryBuilder()
          // DB에서 원신 -> 림버스 컴퍼니 -> 명일방주 순서로 인입된다고 가정
          q.gte.mockResolvedValue({
            data: [
              { id: "s1", schedule_type: "VERSION", start_date: startDate, end_date: endDate, game_id: "game-genshin" },
              { id: "s2", schedule_type: "PICKUP", start_date: startDate, end_date: endDate, game_id: "game-limbus" },
              { id: "s3", schedule_type: "PICKUP", start_date: startDate, end_date: endDate, game_id: "game-arknights" },
            ],
            error: null,
          })
          return q
        }
        case "games": {
          const q = createQueryBuilder()
          q.select.mockResolvedValue({
            data: [
              { id: "game-genshin", name: "원신", default_icon_url: "/genshin.webp" },
              { id: "game-limbus", name: "림버스 컴퍼니", default_icon_url: "/limbus.webp" },
              { id: "game-arknights", name: "명일방주", default_icon_url: "/arknights.webp" },
            ],
            error: null,
          })
          return q
        }
        case "user_games": {
          const q = createQueryBuilder()
          q.eq.mockResolvedValue({
            data: [
              { game_id: "game-genshin", games: { name: "원신", default_icon_url: "/genshin.webp" } },
              { game_id: "game-limbus", games: { name: "림버스 컴퍼니", default_icon_url: "/limbus.webp" } },
              { game_id: "game-arknights", games: { name: "명일방주", default_icon_url: "/arknights.webp" } },
            ],
            error: null,
          })
          return q
        }
        default: return list([])
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByLabelText("월간 캘린더")).toBeTruthy()

    // 15일 타일 버튼 찾기
    const tileButton = screen.getByRole("button", { name: startDate })
    const iconSpans = tileButton.querySelectorAll("span[aria-label]")
    const iconLabels = Array.from(iconSpans).map((span) => span.getAttribute("aria-label"))

    // 가나다순: 림버스 컴퍼니 -> 명일방주 -> 원신
    expect(iconLabels).toEqual(["림버스 컴퍼니", "명일방주", "원신"])
  })

  it("사용자 지정 게임 아이콘이 있으면 달력 타일에 기본 아이콘 대신 커스텀 아이콘을 표시한다", async () => {
    const now = new Date()
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-12`

    useAuth.mockReturnValue({ user: { id: "user-1" }, isLoading: false })
    ensureMonthlySubscriptionExpenses.mockResolvedValue(0)
    downloadUserIcon.mockImplementation(async (_uid: string, gid: string) => {
      if (gid === "game-custom") return "blob:custom-game-icon-url"
      return null
    })

    const single = (data: unknown) => {
      const query = createQueryBuilder()
      query.maybeSingle.mockResolvedValue({ data, error: null })
      return query
    }
    const list = (data: unknown[]) => {
      const query = createThenableBuilder(data)
      return query
    }

    from.mockImplementation((table: string) => {
      switch (table) {
        case "user_finances": return single({ total_asset: 1, default_budget: 1 })
        case "monthly_budgets": return single(null)
        case "game_schedules": {
          const q = createQueryBuilder()
          q.gte.mockResolvedValue({
            data: [{ id: "s-custom", schedule_type: "PICKUP", start_date: startDate, end_date: startDate, game_id: "game-custom" }],
            error: null,
          })
          return q
        }
        case "games": {
          const q = createQueryBuilder()
          q.select.mockResolvedValue({
            data: [{ id: "game-custom", name: "젠레스 존 제로", default_icon_url: "/default-zzz.webp" }],
            error: null,
          })
          return q
        }
        case "user_games": {
          const q = createQueryBuilder()
          q.eq.mockResolvedValue({
            data: [{ game_id: "game-custom", games: { name: "젠레스 존 제로", default_icon_url: "/default-zzz.webp" } }],
            error: null,
          })
          return q
        }
        default: return list([])
      }
    })

    render(<DashboardPage />)

    expect(await screen.findByLabelText("월간 캘린더")).toBeTruthy()
    const iconSpan = await screen.findByLabelText("젠레스 존 제로")
    const img = iconSpan.querySelector("img")
    expect(img?.getAttribute("src")).toBe("blob:custom-game-icon-url")
    downloadUserIcon.mockResolvedValue(null)
  })
})
