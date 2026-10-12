import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ExpensesPage from "./page"

const { from, rpc, useAuth } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from,
    rpc,
  },
}))

vi.mock("recharts", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("recharts")
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

function createExpenseQueryBuilder(data: unknown[]) {
  const promise = Promise.resolve({ data, error: null })
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.update.mockReturnValue(query)
  return query
}


describe("ExpensesPage", () => {
  const sampleExpenses = [
    {
      id: "exp-1",
      title: "점심 식사",
      category: "식비",
      status: "CONFIRMED",
      target_date: "2026-10-10",
      end_date: null,
      game_id: null,
      original_price: 15000,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: 15000,
      payment_method: "WALLET",
      games: null,
    },
    {
      id: "exp-2",
      title: "게임 버전 패스",
      category: "게임",
      status: "PLANNED",
      target_date: "2026-10-15",
      end_date: "2026-10-25",
      game_id: "game-1",
      original_price: 25000,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: 25000,
      payment_method: "GOOGLE_PLAY",
      games: { name: "원신", default_icon_url: "/icons/genshin.webp" },
    },
    {
      id: "exp-3",
      title: "취소된 구독",
      category: "정기 구독",
      status: "CANCELLED",
      cancellation_kind: "PLANNED_CANCEL",
      target_date: "2026-10-01",
      end_date: null,
      game_id: null,
      original_price: 9900,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: 9900,
      payment_method: "WALLET",
      games: null,
    },
  ]

  it("헤더와 탭, 그리고 CONFIRMED 지출 기반의 카테고리 통계를 렌더링한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)

    render(<ExpensesPage />)

    // 헤더 및 버튼 확인
    expect(await screen.findByRole("heading", { name: "소비" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "+ 지출 추가" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "지출 내역 및 통계" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "정기 구독" })).toBeTruthy()

    // 통계 타이틀 확인
    expect(screen.getByText("카테고리별 지출 비중")).toBeTruthy()
    expect(screen.getByText("월별 소비 추이")).toBeTruthy()

    // CONFIRMED인 '식비'만 범례에 100%로 집계됨 (PLANNED 게임, CANCELLED 구독 제외)
    expect(screen.getAllByText("식비").length).toBeGreaterThan(0)
    expect(screen.getByText("100%")).toBeTruthy()
    expect(screen.queryByText("25,000 원 (62%)")).toBeNull()
  })

  it("목록에서 상태별 액션 버튼([확정], [취소], [환불], [되돌리기])이 올바르게 표시된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)

    render(<ExpensesPage />)

    // PLANNED 항목: 확정, 취소 버튼 존재
    const confirmButtons = await screen.findAllByRole("button", { name: "확정" })
    expect(confirmButtons.length).toBeGreaterThan(0)
    const cancelButtons = screen.getAllByRole("button", { name: "취소" })
    expect(cancelButtons.length).toBeGreaterThan(0)

    // CONFIRMED 항목: 환불 버튼 존재
    const refundButtons = screen.getAllByRole("button", { name: "환불" })
    expect(refundButtons.length).toBeGreaterThan(0)

    // CANCELLED 항목: 되돌리기 버튼 존재
    const restoreButtons = screen.getAllByRole("button", { name: "되돌리기" })
    expect(restoreButtons.length).toBeGreaterThan(0)
  })

  it("PLANNED 항목에서 [취소] 클릭 시 cancel_planned_expense RPC를 호출한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)
    rpc.mockResolvedValue({ error: null })

    render(<ExpensesPage />)

    const cancelButtons = await screen.findAllByRole("button", { name: "취소" })
    fireEvent.click(cancelButtons[0])

    expect(rpc).toHaveBeenCalledWith("cancel_planned_expense", { p_expense_id: "exp-2" })
  })

  it("CANCELLED 항목에서 [되돌리기] 클릭 시 restore_cancelled_expense RPC를 호출한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)
    rpc.mockResolvedValue({ error: null })

    render(<ExpensesPage />)

    const restoreButtons = await screen.findAllByRole("button", { name: "되돌리기" })
    fireEvent.click(restoreButtons[0])

    expect(rpc).toHaveBeenCalledWith("restore_cancelled_expense", { p_expense_id: "exp-3" })
  })

  it("정기 구독 탭 전환 시 등록된 구독 템플릿과 [+ 구독 추가] 버튼을 렌더링한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const expenseBuilder = createExpenseQueryBuilder(sampleExpenses)
    const subscriptionBuilder = createExpenseQueryBuilder([
      {
        id: "tpl-1",
        title: "넷플릭스",
        category: "정기 구독",
        cycle_type: "MONTHLY_DAY",
        billing_day: 15,
        default_price: 17000,
        payment_method: "WALLET",
        is_active: true,
        game_id: null,
        games: null,
      },
    ])

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })

    render(<ExpensesPage />)

    const subTab = await screen.findByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    expect(await screen.findByRole("heading", { name: "정기 구독", level: 2 })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "+ 구독 추가" }).length).toBe(1)
    expect(screen.getByText("넷플릭스")).toBeTruthy()
    expect(screen.getByText("매월 15일")).toBeTruthy()
    expect(screen.getByRole("button", { name: "구독 중지" })).toBeTruthy()
  })

  it("게임 픽업별 과금 분석 섹션과 픽업 배지가 정상 렌더링된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const pickupExpenses = [
      {
        id: "exp-p1",
        title: "수영복 픽업 10연차",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-10",
        end_date: null,
        game_id: "game-1",
        pickup_schedule_id: "sched-p1",
        original_price: 33000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 33000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "원신", default_icon_url: "/icons/genshin.webp" },
      },
      {
        id: "exp-p2",
        title: "월정액 구매",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-11",
        end_date: null,
        game_id: "game-1",
        pickup_schedule_id: null,
        original_price: 6000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 6000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "원신", default_icon_url: "/icons/genshin.webp" },
      },
    ]

    const expenseBuilder = createExpenseQueryBuilder(pickupExpenses)
    const schedulesBuilder = createExpenseQueryBuilder([
      { id: "sched-p1", title: "수영복 한정 픽업", schedule_type: "PICKUP", game_id: "game-1" },
    ])
    const subscriptionBuilder = createExpenseQueryBuilder([])

    from.mockImplementation((table: string) => {
      if (table === "game_schedules") return schedulesBuilder
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })

    render(<ExpensesPage />)

    // 게임 픽업 분석 섹션 확인
    expect(await screen.findByText("게임 픽업별 과금 분석")).toBeTruthy()
    expect(screen.getByText("픽업 과금 순위")).toBeTruthy()
    expect(screen.getByText("총 39,000 원")).toBeTruthy()

    // 픽업명 및 '버전 일반' 분리 집계 확인
    expect(screen.getAllByText("수영복 한정 픽업").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("버전 일반")).toBeTruthy()

    // 목록 테이블 내 픽업 배지 노출 확인
    const badges = screen.getAllByText("수영복 한정 픽업")
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })
})

