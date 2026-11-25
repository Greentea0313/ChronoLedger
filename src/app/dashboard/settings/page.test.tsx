import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import SettingsPage from "./page"

const {
  useAuth,
  requestAccountDeletion,
  from,
  rpc,
  loadSchedulePreference,
  saveSchedulePreference,
  getPushSupportState,
  getCurrentDevicePushEndpoint,
  subscribeCurrentDevicePush,
  unsubscribeBrowserPushIfMatching,
} = vi.hoisted(() => ({
  useAuth: vi.fn(),
  requestAccountDeletion: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  loadSchedulePreference: vi.fn(),
  saveSchedulePreference: vi.fn(),
  getPushSupportState: vi.fn(),
  getCurrentDevicePushEndpoint: vi.fn(),
  subscribeCurrentDevicePush: vi.fn(),
  unsubscribeBrowserPushIfMatching: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/account-deletion", () => ({ requestAccountDeletion }))
vi.mock("@/lib/schedule-preferences", () => ({ loadSchedulePreference, saveSchedulePreference }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("@/lib/push-notifications", () => ({
  getPushSupportState,
  getCurrentDevicePushEndpoint,
  subscribeCurrentDevicePush,
  unsubscribeBrowserPushIfMatching,
}))
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
    getPushSupportState.mockReturnValue("supported")
    getCurrentDevicePushEndpoint.mockResolvedValue(null)
    subscribeCurrentDevicePush.mockResolvedValue({
      subscriptionId: "sub-new",
      endpoint: "https://fcm.googleapis.com/fcm/send/new",
      platform: "web",
      userAgentLabel: "Chrome · Windows",
    })
    unsubscribeBrowserPushIfMatching.mockResolvedValue(undefined)
    Object.defineProperty(window, "Notification", {
      value: { permission: "default", requestPermission: vi.fn().mockResolvedValue("granted") },
      configurable: true,
    })
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

  describe("알림 설정 (R39)", () => {
    type SettingsRow = {
      favorite_schedule_start?: boolean
      favorite_schedule_end_d1?: boolean
      planned_expense_d1?: boolean
      expense_due_today?: boolean
      request_result?: boolean
      push_enabled?: boolean
    } | null

    type PushSubRow = {
      id: string
      endpoint: string
      platform: "web" | "ios_pwa" | "android_pwa"
      user_agent_label: string
      created_at: string
      last_success_at: string | null
    }

    function mockNotificationSettings(
      options: {
        row?: SettingsRow
        loadError?: { code?: string; message: string }
        upsertError?: { code?: string; message: string }
        subscriptions?: PushSubRow[]
        subsError?: { code?: string; message: string }
      } = {},
    ) {
      const base = from.getMockImplementation()!
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(options.loadError ? { data: null, error: options.loadError } : { data: options.row ?? null, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: options.upsertError ?? null }),
      }
      builder.select.mockReturnValue(builder)
      builder.eq.mockReturnValue(builder)

      const subsBuilder = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn().mockResolvedValue(
          options.subsError ? { data: null, error: options.subsError } : { data: options.subscriptions ?? [], error: null },
        ),
      }
      subsBuilder.select.mockReturnValue(subsBuilder)
      subsBuilder.eq.mockReturnValue(subsBuilder)

      from.mockImplementation((table: string) => {
        if (table === "notification_settings") return builder
        if (table === "push_subscriptions") return subsBuilder
        return base(table)
      })
      return { builder, subsBuilder }
    }
    const toggle = (label: string) =>
      screen.findByRole("switch", { name: label.endsWith("알림") ? label : `${label} 알림` })

    it("shows all daily and request_result toggles on by default when the user has no settings row", async () => {
      const { builder } = mockNotificationSettings({ row: null })
      render(<SettingsPage />)

      for (const label of ["관심 일정 시작 당일", "관심 일정 종료 1일 전", "예정 지출 결제일 1일 전", "오늘 결제 예정", "요청 처리 결과 알림"]) {
        expect((await toggle(label)).getAttribute("aria-checked")).toBe("true")
      }
      expect((await toggle("웹 푸시 전체 수신")).getAttribute("aria-checked")).toBe("false")
      expect(builder.select).toHaveBeenCalledWith(
        "favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1, expense_due_today, request_result, push_enabled",
      )
      expect(builder.eq).toHaveBeenCalledWith("user_id", "user-123")
    })

    it("reflects the saved values of an existing row", async () => {
      mockNotificationSettings({
        row: {
          favorite_schedule_start: false,
          favorite_schedule_end_d1: true,
          planned_expense_d1: false,
          expense_due_today: false,
          request_result: false,
          push_enabled: true,
        },
      })
      render(<SettingsPage />)

      await waitFor(async () => {
        expect((await toggle("관심 일정 시작 당일")).getAttribute("aria-checked")).toBe("false")
      })
      expect((await toggle("관심 일정 종료 1일 전")).getAttribute("aria-checked")).toBe("true")
      expect((await toggle("예정 지출 결제일 1일 전")).getAttribute("aria-checked")).toBe("false")
      expect((await toggle("오늘 결제 예정")).getAttribute("aria-checked")).toBe("false")
      expect((await toggle("요청 처리 결과 알림")).getAttribute("aria-checked")).toBe("false")
      expect((await toggle("웹 푸시 전체 수신")).getAttribute("aria-checked")).toBe("true")
    })

    it("upserts only the toggled column with onConflict user_id", async () => {
      const { builder } = mockNotificationSettings({ row: null })
      render(<SettingsPage />)
      const target = await toggle("예정 지출 결제일 1일 전")
      await waitFor(() => expect((target as HTMLButtonElement).disabled).toBe(false))

      fireEvent.click(target)

      await waitFor(() => expect(target.getAttribute("aria-checked")).toBe("false"))
      expect(builder.upsert).toHaveBeenCalledTimes(1)
      const [payload, options] = builder.upsert.mock.calls[0]
      expect(payload).toMatchObject({ user_id: "user-123", planned_expense_d1: false })
      expect(Object.keys(payload).sort()).toEqual(["planned_expense_d1", "updated_at", "user_id"])
      expect(options).toEqual({ onConflict: "user_id" })
    })

    it("rolls the toggle back and shows an error when saving fails", async () => {
      mockNotificationSettings({ row: null, upsertError: { code: "42501", message: "denied" } })
      render(<SettingsPage />)
      const target = await toggle("관심 일정 시작 당일")
      await waitFor(() => expect((target as HTMLButtonElement).disabled).toBe(false))

      fireEvent.click(target)

      expect(await screen.findByText("알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")).toBeTruthy()
      expect(target.getAttribute("aria-checked")).toBe("true")
    })

    it("blocks saving while offline", async () => {
      const { builder } = mockNotificationSettings({ row: null })
      render(<SettingsPage />)
      const target = await toggle("관심 일정 시작 당일")
      await waitFor(() => expect((target as HTMLButtonElement).disabled).toBe(false))
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
      try {
        fireEvent.click(target)
        expect(await screen.findByText(/오프라인/)).toBeTruthy()
        expect(builder.upsert).not.toHaveBeenCalled()
        expect(target.getAttribute("aria-checked")).toBe("true")
      } finally {
        Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
      }
    })

    it.each(["42P01", "PGRST205"])("disables the toggles with the migration hint when the table is missing (%s)", async (code) => {
      mockNotificationSettings({ loadError: { code, message: "missing" } })
      render(<SettingsPage />)

      expect(await screen.findByText("DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다.")).toBeTruthy()
      expect((await toggle("관심 일정 시작 당일") as HTMLButtonElement).disabled).toBe(true)
      expect((await toggle("예정 지출 결제일 1일 전") as HTMLButtonElement).disabled).toBe(true)
    })

    it("shows a load error for other failures without the migration hint", async () => {
      mockNotificationSettings({ loadError: { code: "42501", message: "denied" } })
      render(<SettingsPage />)

      expect(await screen.findByText("알림 설정을 불러오지 못했습니다.")).toBeTruthy()
      expect(screen.queryByText("DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다.")).toBeNull()
    })

    it("subscribes the current device when clicking the Web Push enable button (R96)", async () => {
      mockNotificationSettings({ row: null, subscriptions: [] })
      render(<SettingsPage />)

      const enableBtn = await screen.findByRole("button", { name: "이 기기에서 푸시 알림 켜기" })
      await waitFor(() => expect((enableBtn as HTMLButtonElement).disabled).toBe(false))

      fireEvent.click(enableBtn)

      await waitFor(() => expect(subscribeCurrentDevicePush).toHaveBeenCalledTimes(1))
      expect(await screen.findByText("이 기기에서 웹 푸시 알림을 켰습니다.")).toBeTruthy()
      expect((await toggle("웹 푸시 전체 수신")).getAttribute("aria-checked")).toBe("true")
    })

    it("lists registered devices and unsubscribes via delete_push_subscription RPC, disabling push_enabled on last removal (R96)", async () => {
      const ep = "https://fcm.googleapis.com/fcm/send/current-device"
      getCurrentDevicePushEndpoint.mockResolvedValue(ep)
      mockNotificationSettings({
        row: { push_enabled: true },
        subscriptions: [
          {
            id: "sub-1",
            endpoint: ep,
            platform: "web",
            user_agent_label: "Chrome · Windows",
            created_at: "2026-11-24T01:00:00Z",
            last_success_at: null,
          },
        ],
      })
      render(<SettingsPage />)

      expect(await screen.findByText("Chrome · Windows")).toBeTruthy()
      expect(screen.getByText("(현재 기기)")).toBeTruthy()

      const removeBtn = screen.getByRole("button", { name: "Chrome · Windows 기기 해제" })
      fireEvent.click(removeBtn)

      await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_push_subscription", { p_subscription_id: "sub-1" }))
      expect(unsubscribeBrowserPushIfMatching).toHaveBeenCalledWith(ep)
      expect(await screen.findByText("등록된 기기가 없습니다.")).toBeTruthy()
      expect((await toggle("웹 푸시 전체 수신")).getAttribute("aria-checked")).toBe("false")
    })

    it("renders platform-specific Web Push notices for Tauri, iOS Safari tab, and denied permission (R96)", async () => {
      getPushSupportState.mockReturnValue("tauri_desktop")
      mockNotificationSettings({ row: null })
      const { unmount } = render(<SettingsPage />)
      expect(await screen.findByText(/Windows 데스크톱 앱에서는 웹 푸시 대신/)).toBeTruthy()
      expect(screen.queryByRole("button", { name: "이 기기에서 푸시 알림 켜기" })).toBeNull()
      unmount()

      getPushSupportState.mockReturnValue("ios_install_required")
      mockNotificationSettings({ row: null })
      const { unmount: unmountIos } = render(<SettingsPage />)
      expect(await screen.findByText(/홈 화면에 추가/)).toBeTruthy()
      unmountIos()

      getPushSupportState.mockReturnValue("supported")
      Object.defineProperty(window, "Notification", {
        value: { permission: "denied", requestPermission: vi.fn() },
        configurable: true,
      })
      mockNotificationSettings({ row: null })
      render(<SettingsPage />)
      expect(await screen.findByText(/브라우저에서 알림 권한이 차단되어 있습니다/)).toBeTruthy()
    })

    it("shows R96 migration fallback when push_subscriptions table is missing", async () => {
      mockNotificationSettings({ row: null, subsError: { code: "42P01", message: "missing" } })
      render(<SettingsPage />)

      expect(await screen.findByText("DB 업데이트(R96) 적용 후 웹 푸시 기기를 관리할 수 있습니다.")).toBeTruthy()
      expect((await screen.findByRole("button", { name: "이 기기에서 푸시 알림 켜기" }) as HTMLButtonElement).disabled).toBe(true)
    })

    it("upserts expense_due_today when 오늘 결제 예정 is toggled (R107-B)", async () => {
      const { builder } = mockNotificationSettings({ row: null })
      render(<SettingsPage />)
      const target = await toggle("오늘 결제 예정")
      await waitFor(() => expect((target as HTMLButtonElement).disabled).toBe(false))

      fireEvent.click(target)

      await waitFor(() => expect(target.getAttribute("aria-checked")).toBe("false"))
      expect(builder.upsert).toHaveBeenCalledTimes(1)
      const [payload, options] = builder.upsert.mock.calls[0]
      expect(payload).toMatchObject({ user_id: "user-123", expense_due_today: false })
      expect(Object.keys(payload).sort()).toEqual(["expense_due_today", "updated_at", "user_id"])
      expect(options).toEqual({ onConflict: "user_id" })
    })

    it.each(["42703", "PGRST204"])(
      "hides 오늘 결제 예정 without error and keeps other settings working when the column is missing (%s)",
      async (code) => {
        const { builder } = mockNotificationSettings({ row: null })
        builder.maybeSingle
          .mockResolvedValueOnce({ data: null, error: { code, message: "missing column" } })
          .mockResolvedValueOnce({
            data: {
              favorite_schedule_start: true,
              favorite_schedule_end_d1: false,
              planned_expense_d1: true,
              request_result: true,
              push_enabled: false,
            },
            error: null,
          })

        render(<SettingsPage />)

        expect((await toggle("관심 일정 종료 1일 전")).getAttribute("aria-checked")).toBe("false")
        expect(screen.queryByRole("switch", { name: "오늘 결제 예정 알림" })).toBeNull()
        expect(screen.queryByRole("alert")).toBeNull()
        expect(builder.select).toHaveBeenNthCalledWith(
          2,
          "favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1, request_result, push_enabled",
        )
      },
    )
  })
})
