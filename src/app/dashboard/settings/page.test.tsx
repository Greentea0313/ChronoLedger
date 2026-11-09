import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import SettingsPage from "./page"

const { useAuth, requestAccountDeletion, from, rpc, loadSchedulePreference, saveSchedulePreference } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  requestAccountDeletion: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  loadSchedulePreference: vi.fn(),
  saveSchedulePreference: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/account-deletion", () => ({ requestAccountDeletion }))
vi.mock("@/lib/schedule-preferences", () => ({ loadSchedulePreference, saveSchedulePreference }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("@/lib/storage-upload", () => ({
  downloadProfileAvatar: vi.fn().mockResolvedValue(null),
  uploadProfileAvatar: vi.fn().mockResolvedValue(undefined),
  deleteProfileAvatar: vi.fn().mockResolvedValue(undefined),
}))

describe("SettingsPage", () => {
  const mockBeginAccountDeletionTracking = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({
      user: { id: "user-123", email: "test@example.com" },
      nickname: "테스터",
      refreshProfile: vi.fn().mockResolvedValue(undefined),
      beginAccountDeletionTracking: mockBeginAccountDeletionTracking,
    })

    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      maybeSingle: vi.fn(),
    }
    q.select.mockReturnValue(q)
    q.eq.mockReturnValue(q)
    q.order.mockResolvedValue({ data: [], error: null })
    q.maybeSingle.mockResolvedValue({
      data: { total_asset: 500000, default_budget: 300000 },
      error: null,
    })

    from.mockImplementation((table: string) => {
      if (table === "store_wallets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { platform: "GOOGLE_PLAY", current_balance: 1000, earn_rate: 0.1, user_tier: "BRONZE" },
                { platform: "GALAXY_STORE", current_balance: 500, earn_rate: 1.1, user_tier: "PRESTIGE" },
              ],
              error: null,
            }),
          }),
        }
      }
      return q
    })

    rpc.mockResolvedValue({ error: null })
    loadSchedulePreference.mockResolvedValue({ showUnofficialSchedules: false, isAvailable: true })
    saveSchedulePreference.mockResolvedValue(undefined)
  })

  it("renders page header and main sections", async () => {
    render(<SettingsPage />)

    expect(screen.getByRole("heading", { level: 1, name: "설정" })).toBeTruthy()
    expect(screen.getByText("계정, 재무, 스토어 지갑 및 요청 내역을 관리합니다.")).toBeTruthy()

    // Profile cards
    expect(screen.getByText("프로필 사진")).toBeTruthy()
    expect(screen.getByText("닉네임 설정")).toBeTruthy()

    // Finance settings card
    expect(screen.getByText("개인 재무 설정")).toBeTruthy()

    // Store wallet widget
    expect(await screen.findByText("스토어 지갑 관리")).toBeTruthy()

    // User requests card
    expect(screen.getByText("내 요청 내역")).toBeTruthy()

    // Account deletion card
    expect(screen.getByText("계정 삭제")).toBeTruthy()

    // Wait for async loads to settle
    expect(await screen.findByText("총 자산 (원)")).toBeTruthy()
    expect(await screen.findByText("제출한 요청 내역이 없습니다.")).toBeTruthy()
  })

  it("handles account deletion submission successfully", async () => {
    requestAccountDeletion.mockResolvedValueOnce("test-status-token")

    render(<SettingsPage />)
    await screen.findByText("총 자산 (원)")

    const input = screen.getByLabelText(/확인을 위해 로그인 이메일/)
    fireEvent.change(input, { target: { value: "test@example.com" } })

    const submitBtn = screen.getByRole("button", { name: "계정 삭제 요청" })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(requestAccountDeletion).toHaveBeenCalledWith("test@example.com")
      expect(mockBeginAccountDeletionTracking).toHaveBeenCalledWith("test-status-token")
    })
  })

  it("clears the user's local game order and onboarding keys once the deletion request is accepted", async () => {
    window.localStorage.setItem("chronoledger:game-order:user-123", '["g1"]')
    window.localStorage.setItem("chronoledger:game-onboarding-dismissed:user-123", "1")
    window.localStorage.setItem("chronoledger:game-order:someone-else", '["g2"]')
    requestAccountDeletion.mockResolvedValueOnce("test-status-token")

    render(<SettingsPage />)
    await screen.findByText("총 자산 (원)")
    fireEvent.change(screen.getByLabelText(/확인을 위해 로그인 이메일/), { target: { value: "test@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "계정 삭제 요청" }))

    await waitFor(() => expect(mockBeginAccountDeletionTracking).toHaveBeenCalledWith("test-status-token"))
    expect(window.localStorage.getItem("chronoledger:game-order:user-123")).toBeNull()
    expect(window.localStorage.getItem("chronoledger:game-onboarding-dismissed:user-123")).toBeNull()
    expect(window.localStorage.getItem("chronoledger:game-order:someone-else")).toBe('["g2"]')
  })

  it("keeps the local game order when the deletion request fails", async () => {
    window.localStorage.setItem("chronoledger:game-order:user-123", '["g1"]')
    requestAccountDeletion.mockRejectedValueOnce(new Error("network"))

    render(<SettingsPage />)
    await screen.findByText("총 자산 (원)")
    fireEvent.change(screen.getByLabelText(/확인을 위해 로그인 이메일/), { target: { value: "test@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: "계정 삭제 요청" }))

    await screen.findByText(/계정 삭제 요청을 접수하지 못했습니다/)
    expect(window.localStorage.getItem("chronoledger:game-order:user-123")).toBe('["g1"]')
  })

  it("persists the unofficial schedule display toggle", async () => {
    render(<SettingsPage />)
    const toggle = await screen.findByRole("switch", { name: "비공식 일정(테스트 서버·유출 등) 표시" })
    expect(toggle.getAttribute("aria-checked")).toBe("false")

    fireEvent.click(toggle)

    await waitFor(() => {
      expect(saveSchedulePreference).toHaveBeenCalledWith("user-123", true)
      expect(toggle.getAttribute("aria-checked")).toBe("true")
    })
  })

  it("disables the toggle and reports when the preference migration is unavailable", async () => {
    loadSchedulePreference.mockResolvedValueOnce({ showUnofficialSchedules: false, isAvailable: false })
    render(<SettingsPage />)

    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByRole("switch", { name: "비공식 일정(테스트 서버·유출 등) 표시" })).toHaveProperty("disabled", true)
  })

  it("displays error when account deletion fails", async () => {
    requestAccountDeletion.mockRejectedValueOnce(new Error("CONFIRMATION_REQUIRED"))

    render(<SettingsPage />)
    await screen.findByText("총 자산 (원)")

    const input = screen.getByLabelText(/확인을 위해 로그인 이메일/)
    fireEvent.change(input, { target: { value: "wrong@example.com" } })

    const submitBtn = screen.getByRole("button", { name: "계정 삭제 요청" })
    fireEvent.click(submitBtn)

    expect(await screen.findByText("로그인한 계정의 이메일 주소를 정확히 입력해주세요.")).toBeTruthy()
  })
})
