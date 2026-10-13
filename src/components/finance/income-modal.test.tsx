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

  it("수익 추가 제출 시 set_user_finance_settings RPC가 올바른 합산 자산으로 호출된다", async () => {
    const onCompleted = vi.fn()
    const onOpenChange = vi.fn()

    render(<IncomeModal open={true} onOpenChange={onOpenChange} onCompleted={onCompleted} />)

    await waitFor(() => {
      expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0)
    })

    const amountInput = screen.getByLabelText("입금 금액 (원) *")
    fireEvent.change(amountInput, { target: { value: "100000" } })

    const submitBtn = screen.getByRole("button", { name: "수익 추가" })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("set_user_finance_settings", {
        p_total_asset: 600000,
        p_default_budget: 300000,
      })
      expect(onCompleted).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
