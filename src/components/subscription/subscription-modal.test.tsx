import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SubscriptionModal } from "./subscription-modal"

const { from, useAuth, insert } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/subscription-sync", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/subscription-sync")
  return {
    ...actual,
    ensureMonthlySubscriptionExpenses: vi.fn().mockResolvedValue(1),
  }
})

function query(result: unknown) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert,
  }
  q.select.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  q.order.mockResolvedValue(result)
  return q
}

describe("SubscriptionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "user-123" } })
    insert.mockResolvedValue({ data: { id: "sub-1" }, error: null })
    from.mockImplementation((table: string) => {
      if (table === "games") {
        return query({ data: [{ id: "g1", name: "원신" }], error: null })
      }
      if (table === "user_games") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ game_id: "g1" }], error: null }),
          }),
        }
      }
      if (table === "subscription_templates") {
        return { insert }
      }
      return query({ data: [], error: null })
    })
  })

  it("기본 폼 필드를 렌더링하고 비게임 카테고리에서는 게임 선택란을 숨긴다", () => {
    render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    expect(screen.getByLabelText("카테고리 *")).toBeTruthy()
    expect(screen.getByLabelText("구독 제목 *")).toBeTruthy()
    expect(screen.getByLabelText("결제 주기 유형 *")).toBeTruthy()
    expect(screen.getByLabelText("매월 결제일 (1~31일) *")).toBeTruthy()
    expect(screen.getByLabelText("기본 금액 (원) *")).toBeTruthy()
    expect(screen.getByLabelText("결제수단 *")).toBeTruthy()

    // 기본 '정기 구독' 카테고리에서는 연관 게임 선택란이 보이지 않음
    expect(screen.queryByLabelText(/연관 게임/)).toBeNull()
  })

  it("카테고리를 '게임'으로 변경하면 연관 게임 선택란이 나타난다", async () => {
    render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("카테고리 *"), { target: { value: "게임" } })

    expect(await screen.findByLabelText(/연관 게임/)).toBeTruthy()
  })

  it("매월 지정일형(MONTHLY_DAY) 템플릿을 정상적으로 등록한다", async () => {
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    render(<SubscriptionModal open onOpenChange={onOpenChange} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "넷플릭스 프리미엄" } })
    fireEvent.change(screen.getByLabelText("매월 결제일 (1~31일) *"), { target: { value: "25" } })
    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "17000" } })

    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-123",
      title: "넷플릭스 프리미엄",
      category: "정기 구독",
      game_id: null,
      cycle_type: "MONTHLY_DAY",
      billing_day: 25,
      default_price: 17000,
      payment_method: "WALLET",
      is_active: true,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("30일 충전형(INTERVAL_30) 선택 시 결제일 입력란이 숨겨지고 정상 저장된다", async () => {
    const onCreated = vi.fn()
    render(<SubscriptionModal open onOpenChange={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "유튜브 프리미엄" } })
    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "INTERVAL_30" } })

    // INTERVAL_30에서는 매월 결제일 입력란 숨김
    expect(screen.queryByLabelText("매월 결제일 (1~31일) *")).toBeNull()

    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "14900" } })
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "유튜브 프리미엄",
        cycle_type: "INTERVAL_30",
        billing_day: 1,
        default_price: 14900,
      }),
    )
  })
})

