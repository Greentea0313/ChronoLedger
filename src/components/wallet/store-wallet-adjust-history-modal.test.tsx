import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StoreWalletAdjustHistoryModal } from "./store-wallet-adjust-history-modal"

const { from, useAuth } = vi.hoisted(() => ({ from: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

interface MockQuery {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

describe("StoreWalletAdjustHistoryModal", () => {
  let mockQuery: MockQuery

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "user-123" } })

    const q: MockQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    }
    q.select.mockReturnValue(q)
    q.eq.mockReturnValue(q)
    mockQuery = q
    from.mockReturnValue(mockQuery)
  })

  it("renders empty state when there are no adjustment records", async () => {
    mockQuery.order.mockResolvedValue({ data: [], error: null })

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText("포인트/페이 수동 보정 내역")).toBeTruthy()
    expect(await screen.findByText("수동 보정 내역이 없습니다.")).toBeTruthy()
    expect(
      screen.getByText("실제 스토어 잔액과 차이가 생겼을 때 잔액을 수동 보정하면 이곳에 기록됩니다.")
    ).toBeTruthy()
  })

  it("renders adjustment records with formatted amounts, units, and memos", async () => {
    mockQuery.order.mockResolvedValue({
      data: [
        {
          id: "rec-1",
          platform: "GOOGLE_PLAY",
          transaction_type: "MANUAL_ADJUST",
          amount: 500,
          balance_after: 1500,
          memo: "구글 플레이 잔액 정산",
          created_at: "2026-10-14T12:00:00Z",
        },
        {
          id: "rec-2",
          platform: "NAVER_PAY",
          transaction_type: "MANUAL_ADJUST",
          amount: -10000,
          balance_after: 40000,
          memo: "오차 차감",
          created_at: "2026-10-14T11:00:00Z",
        },
      ],
      error: null,
    })

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={vi.fn()} />)

    expect(await screen.findByText("구글 플레이 잔액 정산")).toBeTruthy()
    expect(screen.getByText("+500 P")).toBeTruthy()
    expect(screen.getByText("보정 후 1,500 P")).toBeTruthy()

    expect(screen.getByText("오차 차감")).toBeTruthy()
    expect(screen.getByText("-10,000 원")).toBeTruthy()
    expect(screen.getByText("보정 후 40,000 원")).toBeTruthy()
  })

  it("filters records by platform when clicking platform filter tabs", async () => {
    mockQuery.order.mockResolvedValue({ data: [], error: null })

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={vi.fn()} />)

    await screen.findByText("포인트/페이 수동 보정 내역")

    // Filter by NAVER_PAY
    const naverPayFilter = screen.getByRole("button", { name: "네이버페이" })
    fireEvent.click(naverPayFilter)

    await waitFor(() => {
      expect(mockQuery.eq).toHaveBeenCalledWith("platform", "NAVER_PAY")
    })
  })

  it("calls onOpenChange(false) when clicking the close button", async () => {
    mockQuery.order.mockResolvedValue({ data: [], error: null })
    const onOpenChange = vi.fn()

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={onOpenChange} />)

    await screen.findByText("포인트/페이 수동 보정 내역")

    const closeBtn = screen.getByRole("button", { name: "닫기" })
    fireEvent.click(closeBtn)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("handles fetch errors gracefully with a retry button", async () => {
    mockQuery.order.mockResolvedValueOnce({
      data: null,
      error: new Error("Network error"),
    })

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={vi.fn()} />)

    expect(
      await screen.findByText("보정 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
    ).toBeTruthy()

    // Retry
    mockQuery.order.mockResolvedValueOnce({
      data: [
        {
          id: "rec-3",
          platform: "GALAXY_STORE",
          transaction_type: "MANUAL_ADJUST",
          amount: 200,
          balance_after: 500,
          memo: "갤럭시 스토어 보정",
          created_at: "2026-10-14T10:00:00Z",
        },
      ],
      error: null,
    })

    const retryBtn = screen.getByRole("button", { name: "다시 시도" })
    fireEvent.click(retryBtn)

    expect(await screen.findByText("갤럭시 스토어 보정")).toBeTruthy()
  })

  it("paginates records by 5 items per page and navigates between pages", async () => {
    const mockRecords = Array.from({ length: 7 }, (_, i) => ({
      id: `rec-${i + 1}`,
      platform: "GOOGLE_PLAY",
      transaction_type: "MANUAL_ADJUST",
      amount: (i + 1) * 100,
      balance_after: 1000 + (i + 1) * 100,
      memo: `보정 메모 ${i + 1}번`,
      created_at: `2026-10-14T${String(10 + i).padStart(2, "0")}:00:00Z`,
    }))

    mockQuery.order.mockResolvedValue({ data: mockRecords, error: null })

    render(<StoreWalletAdjustHistoryModal open={true} onOpenChange={vi.fn()} />)

    // 1페이지: 1번~5번 노출, 6번~7번 비노출
    expect(await screen.findByText("보정 메모 1번")).toBeTruthy()
    expect(screen.getByText("보정 메모 5번")).toBeTruthy()
    expect(screen.queryByText("보정 메모 6번")).toBeNull()
    expect(screen.queryByText("보정 메모 7번")).toBeNull()

    // 페이지네이션 바 표시 확인
    expect(screen.getByTestId("adjust-pagination-info").textContent).toContain("총 7건 중 1 - 5건 (페이지 1 / 2)")

    // 다음 페이지 이동
    const nextBtn = screen.getByRole("button", { name: "다음 페이지" }) as HTMLButtonElement
    expect(nextBtn.disabled).toBe(false)
    fireEvent.click(nextBtn)

    // 2페이지: 6번~7번 노출, 1번~5번 비노출
    expect(await screen.findByText("보정 메모 6번")).toBeTruthy()
    expect(screen.getByText("보정 메모 7번")).toBeTruthy()
    expect(screen.queryByText("보정 메모 1번")).toBeNull()
    expect(screen.getByTestId("adjust-pagination-info").textContent).toContain("총 7건 중 6 - 7건 (페이지 2 / 2)")

    // 이전 페이지 이동
    const prevBtn = screen.getByRole("button", { name: "이전 페이지" }) as HTMLButtonElement
    expect(prevBtn.disabled).toBe(false)
    fireEvent.click(prevBtn)

    // 다시 1페이지 복귀
    expect(await screen.findByText("보정 메모 1번")).toBeTruthy()
    expect(screen.queryByText("보정 메모 6번")).toBeNull()
  })
})
