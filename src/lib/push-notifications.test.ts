import { createElement } from "react"
import { render, fireEvent, waitFor, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildUserAgentLabel,
  detectPushPlatform,
  getPushSupportState,
  subscribeCurrentDevicePush,
  unsubscribeCurrentDevicePush,
} from "./push-notifications"

const { isTauri, rpc, signOut, useAuth, replace } = vi.hoisted(() => ({
  isTauri: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  useAuth: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({ isTauri }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc, auth: { signOut } } }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard",
}))
vi.mock("@/components/layout/topbar", () => ({
  Topbar: ({ onLogout }: { onLogout?: () => void }) =>
    createElement("button", { type: "button", onClick: onLogout }, "로그아웃"),
}))

import DashboardLayout from "@/app/dashboard/layout"
import AdminLayout from "@/app/admin/layout"
import { AccountDeletionStatusScreen } from "@/components/auth/account-deletion-status"

describe("push-notifications helper (R96)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isTauri.mockReturnValue(false)
    rpc.mockResolvedValue({ data: "sub-id-1", error: null })
    signOut.mockResolvedValue({ error: null })
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })

  it("classifies platform support states accurately", () => {
    expect(getPushSupportState({ isTauri: true })).toBe("tauri_desktop")
    expect(
      getPushSupportState({
        isTauri: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
        isStandalone: false,
      }),
    ).toBe("ios_install_required")
    expect(
      getPushSupportState({
        isTauri: false,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
        hasServiceWorker: true,
        hasPushManager: false,
        hasNotification: true,
        vapidPublicKey: "BKey",
      }),
    ).toBe("unsupported")
    expect(
      getPushSupportState({
        isTauri: false,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
        hasServiceWorker: true,
        hasPushManager: true,
        hasNotification: true,
        vapidPublicKey: "",
      }),
    ).toBe("unconfigured")
    expect(
      getPushSupportState({
        isTauri: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
        isStandalone: true,
        hasServiceWorker: true,
        hasPushManager: true,
        hasNotification: true,
        vapidPublicKey: "BValidPublicKey",
      }),
    ).toBe("supported")
  })

  it("detects platform and builds short non-fingerprinting UA labels", () => {
    expect(detectPushPlatform({ userAgent: "iPhone OS 17", isStandalone: true })).toBe("ios_pwa")
    expect(detectPushPlatform({ userAgent: "Linux; Android 14", isStandalone: true })).toBe("android_pwa")
    expect(detectPushPlatform({ userAgent: "Windows NT 10.0 Chrome/130", isStandalone: false })).toBe("web")

    expect(buildUserAgentLabel("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0")).toBe(
      "Edge · Windows",
    )
    expect(buildUserAgentLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Safari/604.1")).toBe(
      "Safari · iPhone",
    )
  })

  it("subscribes current device and calls upsert_push_subscription RPC", async () => {
    const prevKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "B" + "A".repeat(86)

    const mockSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/device-token",
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/device-token",
        keys: { p256dh: "P".repeat(65), auth: "A".repeat(22) },
      }),
    }
    const subscribe = vi.fn().mockResolvedValue(mockSub)
    const getSubscription = vi.fn().mockResolvedValue(null)
    const getRegistration = vi.fn().mockResolvedValue({ pushManager: { getSubscription, subscribe } })

    Object.defineProperty(window, "PushManager", { value: function PushManager() {}, configurable: true })
    Object.defineProperty(window, "Notification", {
      value: { permission: "default", requestPermission: vi.fn().mockResolvedValue("granted") },
      configurable: true,
    })
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { getRegistration },
      configurable: true,
    })

    try {
      const result = await subscribeCurrentDevicePush()
      expect(subscribe).toHaveBeenCalledTimes(1)
      expect(rpc).toHaveBeenCalledWith("upsert_push_subscription", {
        p_endpoint: "https://fcm.googleapis.com/fcm/send/device-token",
        p_p256dh: "P".repeat(65),
        p_auth: "A".repeat(22),
        p_platform: "web",
        p_user_agent_label: expect.any(String),
      })
      expect(result.subscriptionId).toBe("sub-id-1")
    } finally {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = prevKey
    }
  })

  it("unsubscribeCurrentDevicePush calls RPC then unsubscribes locally, even when RPC fails or offline", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true)
    const getRegistration = vi.fn().mockResolvedValue({
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue({
          endpoint: "https://fcm.googleapis.com/fcm/send/logout-token",
          unsubscribe,
        }),
      },
    })
    Object.defineProperty(window.navigator, "serviceWorker", { value: { getRegistration }, configurable: true })

    // Online + RPC succeeds
    await unsubscribeCurrentDevicePush()
    expect(rpc).toHaveBeenCalledWith("delete_push_subscription", {
      p_endpoint: "https://fcm.googleapis.com/fcm/send/logout-token",
    })
    expect(unsubscribe).toHaveBeenCalledTimes(1)

    // RPC throws -> local unsubscribe still runs
    rpc.mockRejectedValueOnce(new Error("rpc failed"))
    await unsubscribeCurrentDevicePush()
    expect(unsubscribe).toHaveBeenCalledTimes(2)

    // Offline -> skips RPC and still unsubscribes locally
    rpc.mockClear()
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    await unsubscribeCurrentDevicePush()
    expect(rpc).not.toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalledTimes(3)
  })
})

describe("logout push cleanup integration (dashboard, admin, account deletion)", () => {
  const unsubscribe = vi.fn().mockResolvedValue(true)

  beforeEach(() => {
    vi.clearAllMocks()
    isTauri.mockReturnValue(false)
    rpc.mockResolvedValue({ data: 1, error: null })
    signOut.mockResolvedValue({ error: null })
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({
              endpoint: "https://fcm.googleapis.com/fcm/send/shared-logout",
              unsubscribe,
            }),
          },
        }),
      },
      configurable: true,
    })
  })

  it("cleans up push subscription before signOut in DashboardLayout", async () => {
    useAuth.mockReturnValue({
      user: { id: "u1" },
      isLoading: false,
      isAccountDeletionStatusLoading: false,
      accountDeletionStatus: null,
    })
    render(createElement(DashboardLayout, null, createElement("div", null, "child")))

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith("delete_push_subscription", {
      p_endpoint: "https://fcm.googleapis.com/fcm/send/shared-logout",
    })
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("cleans up push subscription before signOut in AdminLayout", async () => {
    useAuth.mockReturnValue({
      user: { id: "admin-1" },
      role: "admin",
      isLoading: false,
      isAccountDeletionStatusLoading: false,
      accountDeletionStatus: null,
    })
    render(createElement(AdminLayout, null, createElement("div", null, "admin child")))

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith("delete_push_subscription", {
      p_endpoint: "https://fcm.googleapis.com/fcm/send/shared-logout",
    })
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("cleans up push subscription before local signOut when account deletion completes", async () => {
    useAuth.mockReturnValue({ accountDeletionStatus: "COMPLETED" })
    render(createElement(AccountDeletionStatusScreen))

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ scope: "local" }))
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith("/auth?accountDeleted=1")
  })
})
