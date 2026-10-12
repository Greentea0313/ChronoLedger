import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SubscriptionModal } from "./subscription-modal"

const { from, useAuth, insert, update } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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
    update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
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
        return {
          insert,
          update: vi.fn().mockImplementation((payload) => {
            update(payload)
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            }
          }),
        }
      }
      if (table === "expenses") {
        const expenseUpdateChain = {
          eq: vi.fn().mockImplementation(() => expenseUpdateChain),
          then: vi.fn().mockImplementation((cb: (arg: unknown) => unknown) => Promise.resolve(cb({ error: null }))),
          catch: vi.fn().mockImplementation(() => Promise.resolve()),
        }
        return {
          update: vi.fn().mockReturnValue(expenseUpdateChain),
        }
      }
      return query({ data: [], error: null })
    })
  })

  it("기본 폼 필드를 렌더링하고 카테고리는 '정기 구독'으로 고정된다", () => {
    render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    expect(screen.getByLabelText("카테고리")).toBeTruthy()
    expect(screen.getByLabelText("구독 제목 *")).toBeTruthy()
    expect(screen.getByLabelText("결제 주기 유형 *")).toBeTruthy()
    expect(screen.getByLabelText("매월 결제일 (1~31일) *")).toBeTruthy()
    expect(screen.getByLabelText("결제수단 *")).toHaveProperty("disabled", true)
    expect((screen.getByLabelText("결제수단 *") as HTMLSelectElement).value).toBe("WALLET")
    expect(screen.getByLabelText(/연관 게임/)).toBeTruthy()
  })

  it("게임 선택 전에는 버전 패스형이 비활성화되고, 연관 게임 선택 시 활성화되며 카테고리가 '게임'으로 자동 반영된다", async () => {
    render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    await screen.findByRole("option", { name: "원신" })

    // 게임 선택 전: 버전 패스형은 비활성화 상태
    const versionPassOption = screen.getByRole("option", { name: /게임 버전 패스형/ }) as HTMLOptionElement
    expect(versionPassOption.disabled).toBe(true)
    expect((screen.getByLabelText("카테고리") as HTMLInputElement).value).toBe("정기 구독")

    // 연관 게임 선택: 원신(g1)
    fireEvent.change(screen.getByLabelText(/연관 게임/), { target: { value: "g1" } })

    // 게임 선택 후: 버전 패스형 활성화 및 카테고리가 '게임'으로 변경
    expect(versionPassOption.disabled).toBe(false)
    expect((screen.getByLabelText("카테고리") as HTMLInputElement).value).toBe("게임")

    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "VERSION_PASS" } })
    expect((screen.getByLabelText("결제 주기 유형 *") as HTMLSelectElement).value).toBe("VERSION_PASS")
  })

  it("버전 패스형(VERSION_PASS) 선택 후 정상 저장되며 category='게임'으로 등록된다", async () => {
    const onCreated = vi.fn()
    render(<SubscriptionModal open onOpenChange={vi.fn()} onCreated={onCreated} />)

    await screen.findByRole("option", { name: "원신" })
    fireEvent.change(screen.getByLabelText(/연관 게임/), { target: { value: "g1" } })
    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "VERSION_PASS" } })
    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "진주 기행" } })
    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "12000" } })

    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "진주 기행",
        category: "게임",
        game_id: "g1",
        cycle_type: "VERSION_PASS",
        default_price: 12000,
      }),
    )
  })

  it("버전 패스형 선택 상태에서 게임 선택을 해제하면 cycleType이 MONTHLY_DAY로 자동 복구된다", async () => {
    render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    await screen.findByRole("option", { name: "원신" })
    fireEvent.change(screen.getByLabelText(/연관 게임/), { target: { value: "g1" } })
    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "VERSION_PASS" } })
    expect((screen.getByLabelText("결제 주기 유형 *") as HTMLSelectElement).value).toBe("VERSION_PASS")

    // 게임 선택 해제
    fireEvent.change(screen.getByLabelText(/연관 게임/), { target: { value: "" } })
    expect((screen.getByLabelText("결제 주기 유형 *") as HTMLSelectElement).value).toBe("MONTHLY_DAY")
    expect((screen.getByLabelText("카테고리") as HTMLInputElement).value).toBe("정기 구독")
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
      interval_days: 30,
      default_price: 17000,
      payment_method: "WALLET",
      is_active: true,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("누적 충전형(INTERVAL_30) 선택 시 결제일 입력란이 숨겨지고 연장 일수 입력란이 노출되어 지정한 일수로 정상 저장된다", async () => {
    const onCreated = vi.fn()
    render(<SubscriptionModal open onOpenChange={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "유튜브 프리미엄" } })
    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "INTERVAL_30" } })

    // INTERVAL_30에서는 매월 결제일 입력란 숨김, 연장 일수 입력란 노출 (기본값 30)
    expect(screen.queryByLabelText("매월 결제일 (1~31일) *")).toBeNull()
    const intervalInput = screen.getByLabelText("결제 시 연장 일수 (일) *") as HTMLInputElement
    expect(intervalInput.value).toBe("30")

    // 연장 일수를 14일로 변경
    fireEvent.change(intervalInput, { target: { value: "14" } })

    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "14900" } })
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "유튜브 프리미엄",
        cycle_type: "INTERVAL_30",
        billing_day: 1,
        interval_days: 14,
        default_price: 14900,
      }),
    )
  })

  it("팝업이 열려있는 동안 부모 리렌더링이나 user 객체 갱신(Alt+Tab/창 포커스)이 발생해도 입력한 내용이 초기화되지 않는다", async () => {
    const { rerender } = render(<SubscriptionModal open onOpenChange={vi.fn()} />)

    await screen.findByRole("option", { name: "원신" })
    fireEvent.change(screen.getByLabelText(/연관 게임/), { target: { value: "g1" } })
    fireEvent.change(screen.getByLabelText("결제 주기 유형 *"), { target: { value: "VERSION_PASS" } })
    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "임시 작성 중인 패스" } })
    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "9900" } })

    // 창 포커스/세션 갱신으로 user 객체 레퍼런스가 변경되며 리렌더링되는 상황 재현
    useAuth.mockReturnValue({ user: { id: "user-123", email: "test@test.com" } })
    rerender(<SubscriptionModal open onOpenChange={vi.fn()} />)

    // 입력했던 모든 필드 값이 보존되어야 함
    expect((screen.getByLabelText("구독 제목 *") as HTMLInputElement).value).toBe("임시 작성 중인 패스")
    expect((screen.getByLabelText("기본 금액 (원) *") as HTMLInputElement).value).toBe("9900")
    expect((screen.getByLabelText(/연관 게임/) as HTMLSelectElement).value).toBe("g1")
    expect((screen.getByLabelText("결제 주기 유형 *") as HTMLSelectElement).value).toBe("VERSION_PASS")
    expect((screen.getByLabelText("카테고리") as HTMLInputElement).value).toBe("게임")
  })

  it("editingTemplate가 제공되면 '정기 구독 수정' 타이틀과 기존 데이터를 로드하고 수정 완료 시 update를 호출한다", async () => {
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    const editingTemplate = {
      id: "tpl-1",
      title: "기존 넷플릭스",
      category: "정기 구독",
      game_id: null,
      cycle_type: "MONTHLY_DAY" as const,
      billing_day: 15,
      interval_days: 30,
      default_price: 17000,
      payment_method: "WALLET" as const,
      is_active: true,
    }

    render(
      <SubscriptionModal
        open
        onOpenChange={onOpenChange}
        onCreated={onCreated}
        editingTemplate={editingTemplate}
      />,
    )

    expect(screen.getByText("정기 구독 수정")).toBeTruthy()
    expect((screen.getByLabelText("구독 제목 *") as HTMLInputElement).value).toBe("기존 넷플릭스")
    expect((screen.getByLabelText("기본 금액 (원) *") as HTMLInputElement).value).toBe("17000")
    expect((screen.getByLabelText("매월 결제일 (1~31일) *") as HTMLInputElement).value).toBe("15")

    fireEvent.change(screen.getByLabelText("구독 제목 *"), { target: { value: "수정된 넷플릭스" } })
    fireEvent.change(screen.getByLabelText("기본 금액 (원) *"), { target: { value: "19000" } })

    fireEvent.click(screen.getByRole("button", { name: "수정 완료" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "수정된 넷플릭스",
        default_price: 19000,
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

