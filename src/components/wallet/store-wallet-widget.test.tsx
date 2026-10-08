import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StoreWalletWidget } from "./store-wallet-widget"

const { from, rpc, useAuth } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), useAuth: vi.fn() }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))

describe("StoreWalletWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "u1" } })
    const q = { select: vi.fn(), eq: vi.fn() }
    q.select.mockReturnValue(q)
    q.eq.mockResolvedValue({
      data: [
        { platform: "GOOGLE_PLAY", current_balance: 1200, earn_rate: 0.1, user_tier: "BRONZE" },
        { platform: "GALAXY_STORE", current_balance: 300, earn_rate: 1, user_tier: null },
      ],
      error: null,
    })
    from.mockReturnValue(q)
    rpc.mockResolvedValue({ error: null })
  })

  it("shows balances and saves Google tier with its official rate", async () => {
    const onChanged = vi.fn()
    render(<StoreWalletWidget onChanged={onChanged} />)
    expect(await screen.findByText("Google: 1,200 P")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Google Play 등급"), { target: { value: "GOLD" } })
    fireEvent.click(screen.getByRole("button", { name: "등급 저장" }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("update_store_wallet_settings", { p_platform: "GOOGLE_PLAY", p_tier: "GOLD", p_earn_rate: 0.13 })
  })

  it("saves Galaxy rate with a null tier and rejects out-of-range rates", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("Galaxy: 300 P")

    fireEvent.change(screen.getByLabelText("Galaxy Store 적립률 (%)"), { target: { value: "101" } })
    fireEvent.click(screen.getByRole("button", { name: "적립률 저장" }))
    expect((await screen.findByRole("alert")).textContent).toContain("0~100")
    expect(rpc).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Galaxy Store 적립률 (%)"), { target: { value: "2.5" } })
    fireEvent.click(screen.getByRole("button", { name: "적립률 저장" }))
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("update_store_wallet_settings", { p_platform: "GALAXY_STORE", p_tier: null, p_earn_rate: 2.5 }))
  })

  it("adjusts the wallet to a target balance with a memo", async () => {
    render(<StoreWalletWidget />)
    await screen.findByText("Galaxy: 300 P")

    fireEvent.change(screen.getByLabelText("지갑"), { target: { value: "GALAXY_STORE" } })
    fireEvent.change(screen.getByLabelText("목표 잔액 (P)"), { target: { value: "500" } })
    fireEvent.change(screen.getByLabelText("메모 (선택)"), { target: { value: "앱 잔액과 일치" } })
    fireEvent.click(screen.getByRole("button", { name: "잔액 보정" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("adjust_wallet_balance", { p_platform: "GALAXY_STORE", p_target_balance: 500, p_memo: "앱 잔액과 일치" }))
  })
})
