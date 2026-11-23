import { beforeEach, describe, expect, it, vi } from "vitest"
import { notifyNewTauriNotifications } from "./tauri-notifications"

const { isTauri, isPermissionGranted, requestPermission, sendNotification } = vi.hoisted(() => ({
  isTauri: vi.fn(),
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({ isTauri }))
vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted,
  requestPermission,
  sendNotification,
}))

const item = (id: string, read_at: string | null = null) => ({
  id,
  title: `제목 ${id}`,
  body: `본문 ${id}`,
  read_at,
})

describe("notifyNewTauriNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    isTauri.mockReturnValue(true)
    isPermissionGranted.mockResolvedValue(true)
    requestPermission.mockResolvedValue("granted")
  })

  it("does nothing outside Tauri", async () => {
    isTauri.mockReturnValue(false)
    expect(await notifyNewTauriNotifications("u1", [item("n1")])).toBe(0)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it("seeds seen ids on the first load without bursting old unread notifications", async () => {
    expect(await notifyNewTauriNotifications("u1", [item("n1"), item("n2")])).toBe(0)
    expect(sendNotification).not.toHaveBeenCalled()
    expect(isPermissionGranted).not.toHaveBeenCalled()
  })

  it("sends OS notifications only for newly arrived unread items after seeding", async () => {
    await notifyNewTauriNotifications("u1", [item("n1")])

    const sent = await notifyNewTauriNotifications("u1", [item("n2"), item("n3", "2026-11-23T00:00:00Z"), item("n1")])
    expect(sent).toBe(1)
    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendNotification).toHaveBeenCalledWith({ title: "제목 n2", body: "본문 n2" })
  })

  it("requests permission when not yet granted and skips sending if denied", async () => {
    await notifyNewTauriNotifications("u1", [item("n1")])
    isPermissionGranted.mockResolvedValue(false)
    requestPermission.mockResolvedValue("denied")

    expect(await notifyNewTauriNotifications("u1", [item("n2"), item("n1")])).toBe(0)
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(sendNotification).not.toHaveBeenCalled()
  })
})
