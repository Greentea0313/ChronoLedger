import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ExpensesPage from "./page"

const { from, rpc, useAuth, downloadUserIcon, mockGetKstToday } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  downloadUserIcon: vi.fn().mockResolvedValue(null),
  mockGetKstToday: vi.fn(() => "2026-10-15"),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/storage-upload", () => ({ downloadUserIcon }))
vi.mock("@/lib/dashboard-date", () => ({ getKstToday: mockGetKstToday }))
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
    in: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)
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
      target_date: "2026-10-15",
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
      target_date: "2026-10-15",
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

    // 취소 내역 숨기기 토글 체크 상태 확인
    const hideCancelledCheckbox = screen.getByLabelText("취소 내역 숨기기")
    expect(hideCancelledCheckbox).toBeTruthy()

    // 취소 내역 숨기기 해제 시 CANCELLED 항목 및 되돌리기 버튼 노출
    fireEvent.click(hideCancelledCheckbox)
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

    // 취소 내역 숨기기 해제
    const hideCancelledCheckbox = await screen.findByLabelText("취소 내역 숨기기")
    fireEvent.click(hideCancelledCheckbox)

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
    expect(screen.getByRole("button", { name: "수정" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "구독 중지" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "넷플릭스 구독 삭제" })).toBeTruthy()
  })

  it("정기 구독 템플릿 [삭제] 클릭 시 삭제 확인 모달이 열리고 [삭제] 클릭 시 delete_subscription_template RPC를 호출한다", async () => {
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
    rpc.mockResolvedValue({ error: null })

    render(<ExpensesPage />)

    const subTab = await screen.findByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    const deleteBtn = screen.getByRole("button", { name: "넷플릭스 구독 삭제" })
    fireEvent.click(deleteBtn)

    expect(screen.getByText("정기 구독 삭제")).toBeTruthy()
    expect(screen.getByText(/"넷플릭스"/)).toBeTruthy()

    const confirmDeleteBtn = screen.getByRole("button", { name: "삭제" })
    fireEvent.click(confirmDeleteBtn)

    expect(rpc).toHaveBeenCalledWith("delete_subscription_template", {
      p_template_id: "tpl-1",
    })
  })

  it("delete_subscription_template RPC 실패 시 직접 DELETE/비활성화 폴백 없이 오류를 알리고 템플릿을 유지한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
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
    const deleteSpy = vi.fn()
    Object.assign(subscriptionBuilder, { delete: deleteSpy })
    Object.assign(expenseBuilder, { delete: deleteSpy })

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })
    rpc.mockResolvedValue({ error: new Error("삭제할 수 있는 본인 소유의 구독 템플릿이 아닙니다.") })

    render(<ExpensesPage />)

    fireEvent.click(await screen.findByRole("tab", { name: "정기 구독" }))
    fireEvent.click(screen.getByRole("button", { name: "넷플릭스 구독 삭제" }))
    fireEvent.click(screen.getByRole("button", { name: "삭제" }))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("삭제할 수 있는 본인 소유의 구독 템플릿이 아닙니다.")
    })
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(subscriptionBuilder.update).not.toHaveBeenCalled()
    // 삭제 확인 다이얼로그가 열린 채 유지되어 배경이 aria-hidden 처리되므로 hidden 요소까지 조회한다
    expect(screen.getByRole("button", { name: "넷플릭스 구독 삭제", hidden: true })).toBeTruthy()
    alertSpy.mockRestore()
    consoleSpy.mockRestore()
  })

  it("게임별 과금 분석이 확정 게임 지출만 게임 단위로 합산·정렬해 렌더링한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const rows = [
      {
        id: "g1a",
        title: "월정액 구매",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-1",
        pickup_schedule_id: null,
        original_price: 6000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 6000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "원신", default_icon_url: "/icons/x.webp" },
      },
      {
        id: "g1b",
        title: "수영복 10연차",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-1",
        pickup_schedule_id: null,
        original_price: 33000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 33000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "원신", default_icon_url: "/icons/x.webp" },
      },
      {
        id: "g2a",
        title: "패키지",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-2",
        pickup_schedule_id: null,
        original_price: 10000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 10000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "명일방주", default_icon_url: "/icons/x.webp" },
      },
      {
        id: "pl",
        title: "예정 결제",
        category: "게임",
        status: "PLANNED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-2",
        pickup_schedule_id: null,
        original_price: 99000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 99000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "명일방주", default_icon_url: "/icons/x.webp" },
      },
      {
        id: "food",
        title: "점심",
        category: "식비",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: null,
        pickup_schedule_id: null,
        original_price: 12000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 12000,
        payment_method: "GOOGLE_PLAY",
        games: null,
      },
    ]

    const expenseBuilder = createExpenseQueryBuilder(rows)
    const subscriptionBuilder = createExpenseQueryBuilder([])

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })

    render(<ExpensesPage />)

    expect(await screen.findByText("게임별 과금 분석")).toBeTruthy()
    expect(screen.queryByText("게임 픽업별 과금 분석")).toBeNull()
    expect(screen.getByText("총 49,000 원")).toBeTruthy()

    const rankingTitle = screen.getByText("게임 과금 순위")
    const rankingCard = (rankingTitle.closest(".space-y-3") || rankingTitle.parentElement?.parentElement) as HTMLElement
    const rankingRows = Array.from(rankingCard.querySelectorAll("[data-testid^='game-color-dot-']"))
    expect(rankingRows.map((el) => el.getAttribute("data-testid"))).toEqual(["game-color-dot-game-1", "game-color-dot-game-2"])
    expect(within(rankingCard).getByText("39,000 원")).toBeTruthy()
    expect(within(rankingCard).getByText("80% (2건)")).toBeTruthy()
    expect(within(rankingCard).getByText("10,000 원")).toBeTruthy()
    expect(within(rankingCard).getByText("20% (1건)")).toBeTruthy()

    // 픽업 연결 제거로 game_schedules 조회가 더 이상 발생하지 않음
    expect(from).not.toHaveBeenCalledWith("game_schedules")
  })

  it("지출 내역이 10개를 초과할 경우 10개 단위로 페이지네이션이 동작한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const manyExpenses = Array.from({ length: 25 }, (_, i) => ({
      id: `exp-${i + 1}`,
      title: `지출 항목 ${i + 1}`,
      category: "식비",
      status: "CONFIRMED",
      target_date: "2026-10-15",
      end_date: null,
      game_id: null,
      original_price: 1000,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: 1000,
      payment_method: "WALLET",
      games: null,
    }))

    const expenseBuilder = createExpenseQueryBuilder(manyExpenses)
    from.mockReturnValue(expenseBuilder)

    render(<ExpensesPage />)

    // 1페이지에서 1~10번째 항목은 노출되고 11번째는 미노출
    const items1 = await screen.findAllByText("지출 항목 1")
    expect(items1.length).toBeGreaterThan(0)
    expect(screen.getAllByText("지출 항목 10").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("지출 항목 11").length).toBe(0)

    // 페이지네이션 안내 문구 확인
    expect(screen.getByTestId("pagination-info").textContent).toContain("총 25건 중 1 - 10건 표시")

    // 2페이지 버튼 클릭
    const page2Button = screen.getByRole("button", { name: "2 페이지로 이동" })
    fireEvent.click(page2Button)

    // 2페이지 항목(11~20) 노출 확인
    expect(screen.getAllByText("지출 항목 11").length).toBeGreaterThan(0)
    expect(screen.getAllByText("지출 항목 20").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("지출 항목 1").length).toBe(0)
    expect(screen.getByTestId("pagination-info").textContent).toContain("총 25건 중 11 - 20건 표시")

    // 이전 버튼 클릭 시 1페이지로 복귀
    const prevButton = screen.getByRole("button", { name: "이전 페이지" })
    fireEvent.click(prevButton)
    expect(screen.getAllByText("지출 항목 1").length).toBeGreaterThan(0)
    expect(screen.queryAllByText("지출 항목 11").length).toBe(0)
  })

  it("정기 구독 탭의 템플릿 목록이 [게임] (게임명 가나다순) > [정기 구독] (결제일 오름차순 > 누적 충전형) 순서로 정렬된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const templates = [
      {
        id: "tpl-sub-2",
        title: "유튜브 프리미엄",
        category: "정기 구독",
        cycle_type: "MONTHLY_DAY",
        billing_day: 25,
        default_price: 14900,
        payment_method: "WALLET",
        is_active: true,
        game_id: null,
        games: null,
      },
      {
        id: "tpl-game-genshin",
        title: "공월 축복",
        category: "게임",
        cycle_type: "INTERVAL_30",
        billing_day: null,
        default_price: 5900,
        payment_method: "WALLET",
        is_active: true,
        game_id: "game-1",
        games: { id: "game-1", name: "원신" },
      },
      {
        id: "tpl-sub-1",
        title: "넷플릭스",
        category: "정기 구독",
        cycle_type: "MONTHLY_DAY",
        billing_day: 5,
        default_price: 17000,
        payment_method: "WALLET",
        is_active: true,
        game_id: null,
        games: null,
      },
      {
        id: "tpl-game-starrail",
        title: "열차보급허가증",
        category: "게임",
        cycle_type: "INTERVAL_30",
        billing_day: null,
        default_price: 5900,
        payment_method: "WALLET",
        is_active: true,
        game_id: "game-2",
        games: { id: "game-2", name: "붕괴: 스타레일" },
      },
      {
        id: "tpl-sub-interval",
        title: "쿠팡 와우 멤버십 (충전형)",
        category: "정기 구독",
        cycle_type: "INTERVAL_30",
        billing_day: null,
        default_price: 4990,
        payment_method: "WALLET",
        is_active: true,
        game_id: null,
        games: null,
      },
    ]

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return createExpenseQueryBuilder(templates)
      return createExpenseQueryBuilder([])
    })

    render(<ExpensesPage />)

    const subTab = await screen.findByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim())
      .filter((text) => text && text !== "정기 구독")
    expect(headings).toEqual([
      "열차보급허가증",
      "공월 축복",
      "넷플릭스",
      "유튜브 프리미엄",
      "쿠팡 와우 멤버십 (충전형)",
    ])
  })

  it("12개를 초과하는 정기 구독은 12개 단위 페이지네이션이 적용되고 2페이지로 이동할 수 있다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })

    const manyTemplates = Array.from({ length: 15 }, (_, i) => ({
      id: `tpl-batch-${i + 1}`,
      title: `구독 서비스 #${String(i + 1).padStart(2, "0")}`,
      category: "정기 구독",
      cycle_type: "MONTHLY_DAY",
      billing_day: (i % 28) + 1,
      default_price: 10000 + i * 1000,
      payment_method: "WALLET",
      is_active: true,
      game_id: null,
      games: null,
    }))

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return createExpenseQueryBuilder(manyTemplates)
      return createExpenseQueryBuilder([])
    })

    render(<ExpensesPage />)

    const subTab = await screen.findByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    // 1페이지: #01부터 #12까지 렌더링되고, #13은 없어야 함
    expect(screen.getByText("구독 서비스 #01")).toBeTruthy()
    expect(screen.getByText("구독 서비스 #12")).toBeTruthy()
    expect(screen.queryByText("구독 서비스 #13")).toBeNull()

    // 페이지네이션 바 확인
    expect(screen.getByText(/1 \/ 2/)).toBeTruthy()

    // 2페이지 버튼 클릭
    const page2Button = screen.getByRole("button", { name: "2 페이지로 이동" })
    fireEvent.click(page2Button)

    // 2페이지: #13부터 #15까지 렌더링되고, #01은 없어야 함
    expect(screen.getByText("구독 서비스 #13")).toBeTruthy()
    expect(screen.getByText("구독 서비스 #15")).toBeTruthy()
    expect(screen.queryByText("구독 서비스 #01")).toBeNull()
  })

  it("PLANNED 항목에서 [수정] 클릭 시 ExpenseModal이 열린다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)

    render(<ExpensesPage />)

    // PLANNED 항목(교통비)에 [수정] 버튼이 존재하며 클릭 시 예정 지출 수정 모달이 뜸
    const editButtons = await screen.findAllByRole("button", { name: "수정" })
    expect(editButtons.length).toBeGreaterThan(0)
    fireEvent.click(editButtons[0])

    expect(screen.getByText("예정 지출 수정")).toBeTruthy()
  })

  it("CONFIRMED 항목에서 [상세 / 수정] 클릭 시 ExpenseDetailModal이 열린다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const builder = createExpenseQueryBuilder(sampleExpenses)
    from.mockReturnValue(builder)

    render(<ExpensesPage />)

    const detailButtons = await screen.findAllByRole("button", { name: "상세 / 수정" })
    expect(detailButtons.length).toBeGreaterThan(0)
    fireEvent.click(detailButtons[0])

    // 모달이 열리며 해당 지출 항목 제목이 보임
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.getByRole("button", { name: "정보 수정" })).toBeTruthy()
  })

  it("누적 충전형 구독 카드에서 잔여일 배지가 '[n일]' 형식으로 표시된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const templates = [
      {
        id: "tpl-interval",
        title: "공월 축복",
        category: "게임",
        cycle_type: "INTERVAL_30",
        billing_day: null,
        interval_days: 30,
        default_price: 5900,
        payment_method: "WALLET",
        is_active: true,
        game_id: "game-1",
        games: { id: "game-1", name: "원신" },
      },
    ]

    const intervalExpenses = [
      {
        id: "exp-interval-planned",
        template_id: "tpl-interval",
        title: "공월 축복",
        category: "게임",
        status: "PLANNED",
        target_date: "2026-10-30", // 오늘이 10/15라면 15일 남음
        final_amount: 5900,
        original_price: 5900,
        payment_method: "WALLET",
      },
    ]

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return createExpenseQueryBuilder(templates)
      if (table === "expenses") return createExpenseQueryBuilder(intervalExpenses)
      return createExpenseQueryBuilder([])
    })

    render(<ExpensesPage />)

    const subTab = await screen.findByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    // '누적 충전형 (30일)' 배지 확인
    expect(await screen.findByText("누적 충전형 (30일)")).toBeTruthy()
    // '남은 n일'이 아닌 'n일' 배지 확인 (정규식: /^\d+일$/)
    const daysBadges = screen.getAllByText(/\d+일/)
    expect(daysBadges.length).toBeGreaterThan(0)
    // '남은 '이라는 접두사가 붙은 배지는 없어야 함
    expect(screen.queryByText(/남은 \d+일/)).toBeNull()
  })

  it("사용자 지정 게임 아이콘이 있으면 지출 목록 및 정기 구독 카드에 커스텀 아이콘을 우선 표시한다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    downloadUserIcon.mockImplementation(async (_uid: string, gid: string) => {
      if (gid === "game-1") return "blob:custom-genshin-expense-icon"
      return null
    })

    const expenseBuilder = createExpenseQueryBuilder(sampleExpenses)
    const subscriptionBuilder = createExpenseQueryBuilder([
      {
        id: "tpl-custom",
        title: "공월 축복",
        category: "게임",
        cycle_type: "INTERVAL_30",
        billing_day: 1,
        interval_days: 30,
        default_price: 5900,
        payment_method: "WALLET",
        is_active: true,
        game_id: "game-1",
        games: { name: "원신", default_icon_url: "/icons/genshin.webp" },
      },
    ])

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })

    const { container } = render(<ExpensesPage />)

    await screen.findAllByText("게임 버전 패스")

    await waitFor(() => {
      const imgs = Array.from(container.querySelectorAll("img"))
      expect(imgs.some((img) => img.getAttribute("src") === "blob:custom-genshin-expense-icon")).toBe(true)
    })

    const subTab = screen.getByRole("tab", { name: "정기 구독" })
    fireEvent.click(subTab)

    await screen.findAllByText("공월 축복")
    const subImgs = Array.from(container.querySelectorAll("img"))
    expect(subImgs.some((img) => img.getAttribute("src") === "blob:custom-genshin-expense-icon")).toBe(true)

    downloadUserIcon.mockResolvedValue(null)
  })

  it("게임별 과금 분석에서 게임마다 서로 다른 팔레트 색상이 할당된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const rows = [
      {
        id: "p1",
        title: "트럭",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-1",
        pickup_schedule_id: null,
        original_price: 119000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 119000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "원신", default_icon_url: "/icons/x.webp" },
      },
      {
        id: "p2",
        title: "패키지",
        category: "게임",
        status: "CONFIRMED",
        target_date: "2026-10-15",
        start_date: "2026-10-15",
        end_date: "2026-10-15",
        game_id: "game-2",
        pickup_schedule_id: null,
        original_price: 59000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 59000,
        payment_method: "GOOGLE_PLAY",
        games: { name: "명일방주", default_icon_url: "/icons/x.webp" },
      },
    ]

    const expenseBuilder = createExpenseQueryBuilder(rows)
    const subscriptionBuilder = createExpenseQueryBuilder([])

    from.mockImplementation((table: string) => {
      if (table === "subscription_templates") return subscriptionBuilder
      return expenseBuilder
    })

    render(<ExpensesPage />)

    const dot1 = await screen.findByTestId("game-color-dot-game-1")
    const dot2 = await screen.findByTestId("game-color-dot-game-2")

    expect(dot1.style.backgroundColor).toBeTruthy()
    expect(dot2.style.backgroundColor).toBeTruthy()
    expect(dot1.style.backgroundColor).not.toBe(dot2.style.backgroundColor)
  })

  describe("카테고리별 지출 비중 아코디언", () => {
    const mk = (id: string, title: string, category: string, status: string, date: string, amount: number) => ({
      id,
      title,
      category,
      status,
      target_date: date,
      end_date: null,
      game_id: null,
      original_price: amount,
      discount_amount: 0,
      point_discount_amount: 0,
      used_points: 0,
      earned_points: 0,
      final_amount: amount,
      payment_method: "WALLET",
      games: null,
    })
    const accordionExpenses = [
      mk("a1", "오래된 식사", "식비", "CONFIRMED", "2026-09-01", 8000),
      mk("a2", "최근 식사", "식비", "CONFIRMED", "2026-10-10", 12000),
      mk("a3", "예정 식사", "식비", "PLANNED", "2026-10-20", 99000),
      mk("a4", "버스", "교통", "CONFIRMED", "2026-10-05", 3000),
    ]

    it("범례 클릭 시 해당 카테고리 확정 내역만 최신순으로 펼치고, 재클릭/닫기로 접는다", async () => {
      useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
      from.mockReturnValue(createExpenseQueryBuilder(accordionExpenses))

      render(<ExpensesPage />)

      expect(await screen.findByText("카테고리별 지출 비중")).toBeTruthy()
      expect(screen.queryByTestId("category-expense-accordion")).toBeNull()

      const legend = screen.getByRole("button", { name: /^식비\s*\d+%$/ })
      fireEvent.click(legend)

      const accordion = screen.getByTestId("category-expense-accordion")
      expect(within(accordion).getByText(/2건 · 20,000 원/)).toBeTruthy()
      const items = within(accordion).getAllByRole("listitem")
      expect(items.length).toBe(2)
      expect(within(items[0]).getByText("최근 식사")).toBeTruthy()
      expect(within(items[1]).getByText("오래된 식사")).toBeTruthy()
      expect(within(accordion).queryByText("예정 식사")).toBeNull()
      expect(within(accordion).queryByText("버스")).toBeNull()

      fireEvent.click(legend)
      expect(screen.queryByTestId("category-expense-accordion")).toBeNull()

      fireEvent.click(legend)
      fireEvent.click(screen.getByRole("button", { name: "카테고리 내역 닫기" }))
      expect(screen.queryByTestId("category-expense-accordion")).toBeNull()
    })

    it("아코디언 항목 클릭 시 ExpenseDetailModal이 열린다", async () => {
      useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
      from.mockReturnValue(createExpenseQueryBuilder(accordionExpenses))

      render(<ExpensesPage />)

      fireEvent.click(await screen.findByRole("button", { name: /^교통\s*\d+%$/ }))
      const accordion = screen.getByTestId("category-expense-accordion")
      fireEvent.click(within(accordion).getByRole("button", { name: /버스/ }))

      expect(screen.getByRole("dialog")).toBeTruthy()
      expect(screen.getByRole("button", { name: "정보 수정" })).toBeTruthy()
    })
  })

  it("과거 기록 전환 시 과거 지출 내역이 날짜 내림차순(최신순)으로 정렬되어 표시된다", async () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    const pastExpensesList = [
      {
        id: "past-1",
        title: "오래된 과거 지출 A",
        category: "기타",
        status: "CONFIRMED",
        target_date: "2026-09-10",
        end_date: null,
        game_id: null,
        original_price: 10000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 10000,
        payment_method: "WALLET",
        games: null,
      },
      {
        id: "past-2",
        title: "최신 과거 지출 B",
        category: "기타",
        status: "CONFIRMED",
        target_date: "2026-10-01",
        end_date: null,
        game_id: null,
        original_price: 20000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 20000,
        payment_method: "WALLET",
        games: null,
      },
      {
        id: "past-3",
        title: "중간 과거 지출 C",
        category: "기타",
        status: "CONFIRMED",
        target_date: "2026-09-25",
        end_date: null,
        game_id: null,
        original_price: 30000,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: 30000,
        payment_method: "WALLET",
        games: null,
      },
    ]

    const expenseBuilder = createExpenseQueryBuilder(pastExpensesList)
    from.mockReturnValue(expenseBuilder)

    render(<ExpensesPage />)

    const pastBtn = await screen.findByRole("button", { name: /과거 기록/ })
    fireEvent.click(pastBtn)

    const rows = await screen.findAllByRole("row")
    expect(rows.length).toBe(4)
    expect(within(rows[1]).getByText("최신 과거 지출 B")).toBeTruthy()
    expect(within(rows[2]).getByText("중간 과거 지출 C")).toBeTruthy()
    expect(within(rows[3]).getByText("오래된 과거 지출 A")).toBeTruthy()
  })
});
