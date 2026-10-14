import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StoreWalletWidget } from "./store-wallet-widget"

const { from, rpc, useAuth } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))

interface MockQuery {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

describe("StoreWalletWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "u1" } })
    const q: MockQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    q.select.mockReturnValue(q)
    // store_wallets query resolves on eq("user_id", user.id)
    q.eq.mockImplementation((col: string) => {
      if (col === "user_id" && q.order.mock.calls.length === 0) {
        return Promise.resolve({
          data: [
            { platform: "GOOGLE_PLAY", current_balance: 1200, earn_rate: 0.1, user_tier: "BRONZE" },
            { platform: "GALAXY_STORE", current_balance: 300, earn_rate: 1, user_tier: null },
            { platform: "NAVER_PAY", current_balance: 45000, earn_rate: 0, user_tier: null },
          ],
          error: null,
        })
      }
      return q
    })
    from.mockImplementation((table: string) => {
      if (table === "store_point_transactions") {
        const transQ: MockQuery = {
          select: vi.fn(),
          eq: vi.fn(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
        transQ.select.mockReturnValue(transQ)
        transQ.eq.mockReturnValue(transQ)
        return transQ
      }
      return q
    })
    rpc.mockResolvedValue({ error: null })
  })

  it("shows balances and saves Google tier with its official rate", async () => {
    const onChanged = vi.fn()
    render(<StoreWalletWidget onChanged={onChanged} />)
    expect(await screen.findByText("1,200 P")).toBeTruthy()
    expect(screen.getByText("45,000 원")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Google Play 등급"), { target: { value: "GOLD" } })
    fireEvent.click(screen.getByRole("button", { name: "Google 등급 저장" }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("update_store_wallet_settings", { p_platform: "GOOGLE_PLAY", p_tier: "GOLD", p_earn_rate: 0.13 })
  })

  it("saves Galaxy Store tier with its official rate", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("Galaxy Store 포인트 잔액")

    fireEvent.change(screen.getByLabelText("Galaxy Store 등급"), { target: { value: "PRESTIGE" } })
    fireEvent.click(screen.getByRole("button", { name: "Galaxy 등급 저장" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("update_store_wallet_settings", { p_platform: "GALAXY_STORE", p_tier: "PRESTIGE", p_earn_rate: 1.1 }))
  })

  it("adjusts the wallet to a target balance with a memo", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("300 P")

    fireEvent.change(screen.getByLabelText("지갑"), { target: { value: "GALAXY_STORE" } })
    fireEvent.change(screen.getByLabelText("목표 잔액 (P)"), { target: { value: "500" } })
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "앱 잔액과 일치" } })
    fireEvent.click(screen.getByRole("button", { name: "잔액 보정" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("adjust_wallet_balance", { p_platform: "GALAXY_STORE", p_target_balance: 500, p_memo: "앱 잔액과 일치" }))
  })

  it("adjusts Naver Pay balance with won unit label", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("45,000 원")

    fireEvent.change(screen.getByLabelText("지갑"), { target: { value: "NAVER_PAY" } })
    fireEvent.change(screen.getByLabelText("목표 잔액 (원)"), { target: { value: "60000" } })
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "계좌 충전 잔액 동기화" } })
    fireEvent.click(screen.getByRole("button", { name: "잔액 보정" }))

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("adjust_wallet_balance", {
        p_platform: "NAVER_PAY",
        p_target_balance: 60000,
        p_memo: "계좌 충전 잔액 동기화",
      }),
    )
  })

  it("opens the adjust history modal when clicking the [보정 내역 보기] button", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("45,000 원")

    const historyBtn = screen.getByRole("button", { name: /보정 내역 보기/i })
    expect(historyBtn).toBeTruthy()
    fireEvent.click(historyBtn)

    expect(await screen.findByText("포인트/페이 수동 보정 내역")).toBeTruthy()
  })
})
