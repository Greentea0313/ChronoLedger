import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { IncomeModal } from "./income-modal"

const mockRpc = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockSelect,
        }),
      }),
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  },
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}))

vi.mock("@/lib/use-online-status", () => ({
  useOnlineStatus: () => true,
}))

vi.mock("@/lib/offline-guard", () => ({
  isOffline: () => false,
  OFFLINE_WRITE_MESSAGE: "오프라인 상태입니다.",
}))

vi.mock("@/lib/dashboard-date", () => ({
  getKstToday: () => "2026-10-15",
}))

describe("IncomeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockResolvedValue({
      data: { total_asset: 500000, default_budget: 300000 },
    })
    mockRpc.mockResolvedValue({ error: null })
  })

  it("모달이 열리면 현재 자산이 표시되고 기본 카테고리가 '급여'로 설정된다", async () => {
    render(<IncomeModal open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText("수익(자산 증액) 추가")).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0)
    })
  })

  it("금액 입력 시 반영 후 총 자산이 올바르게 계산되어 프리뷰된다", async () => {
    render(<IncomeModal open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0)
    })

    const amountInput = screen.getByLabelText("입금 금액 (원) *")
    fireEvent.change(amountInput, { target: { value: "250000" } })

    expect(screen.getByText(/\+250,000/)).toBeTruthy()
    expect(screen.getByText(/750,000/)).toBeTruthy()
  })

  async function fillAndSubmit(amount: string, title?: string) {
    await waitFor(() => {
      expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0)
    })
    if (title !== undefined) fireEvent.change(screen.getByLabelText("항목명 *"), { target: { value: title } })
    fireEvent.change(screen.getByLabelText("입금 금액 (원) *"), { target: { value: amount } })
    fireEvent.click(screen.getByRole("button", { name: "수익 추가" }))
  }

  it("수익 추가 제출 시 record_income RPC를 우선 호출하고 자산 직접 갱신은 하지 않는다", async () => {
    const onCompleted = vi.fn()
    const onOpenChange = vi.fn()
    render(<IncomeModal open={true} onOpenChange={onOpenChange} onCompleted={onCompleted} />)

    await fillAndSubmit("100000", "  10월 급여  ")

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("record_income", {
        p_category: "급여",
        p_title: "10월 급여",
        p_amount: 100000,
        p_income_date: "2026-10-15",
        p_memo: null,
      })
      expect(onCompleted).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each(["PGRST202", "42883"])("마이그레이션 미적용 DB(%s)에서는 set_user_finance_settings로 폴백한다", async (code) => {
    mockRpc.mockImplementation(async (name: string) => (name === "record_income" ? { error: { code, message: "not found" } } : { error: null }))
    const onCompleted = vi.fn()
    render(<IncomeModal open={true} onOpenChange={vi.fn()} onCompleted={onCompleted} />)

    await fillAndSubmit("100000")

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("set_user_finance_settings", { p_total_asset: 600000, p_default_budget: 300000 })
      expect(onCompleted).toHaveBeenCalled()
    })
  })

  it("함수 부재가 아닌 RPC 오류는 폴백하지 않고 오류를 보여준다", async () => {
    mockRpc.mockResolvedValue({ error: { code: "22023", message: "invalid category" } })
    const onCompleted = vi.fn()
    const onOpenChange = vi.fn()
    render(<IncomeModal open={true} onOpenChange={onOpenChange} onCompleted={onCompleted} />)

    await fillAndSubmit("100000")

    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(onCompleted).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("금액이 0 이하이거나 항목명이 비면 RPC를 호출하지 않는다", async () => {
    render(<IncomeModal open={true} onOpenChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0)
    })

    // 0원은 제출 버튼이 비활성화되어 있다.
    fireEvent.change(screen.getByLabelText("입금 금액 (원) *"), { target: { value: "0" } })
    expect((screen.getByRole("button", { name: "수익 추가" }) as HTMLButtonElement).disabled).toBe(true)

    // 공백뿐인 항목명은 거부한다.
    fireEvent.change(screen.getByLabelText("입금 금액 (원) *"), { target: { value: "1000" } })
    fireEvent.change(screen.getByLabelText("항목명 *"), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "수익 추가" }))
    expect((await screen.findByRole("alert")).textContent).toContain("항목명")
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
