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

  it("seeds empty initial inbox so the very first arriving notification still fires", async () => {
    expect(await notifyNewTauriNotifications("u1", [])).toBe(0)

    const sent = await notifyNewTauriNotifications("u1", [item("n1")])
    expect(sent).toBe(1)
    expect(sendNotification).toHaveBeenCalledWith({ title: "제목 n1", body: "본문 n1" })
  })

  it("serializes concurrent calls for the same user to avoid duplicate OS notifications", async () => {
    await notifyNewTauriNotifications("u1", [])
    let resolvePermission!: (granted: boolean) => void
    isPermissionGranted.mockImplementationOnce(
      () => new Promise<boolean>((resolve) => { resolvePermission = resolve }),
    )

    const first = notifyNewTauriNotifications("u1", [item("n1")])
    const second = notifyNewTauriNotifications("u1", [item("n1")])
    await vi.waitFor(() => expect(resolvePermission).toBeTypeOf("function"))
    resolvePermission(true)

    const [sentFirst, sentSecond] = await Promise.all([first, second])
    expect(sentFirst + sentSecond).toBe(1)
    expect(sendNotification).toHaveBeenCalledTimes(1)
  })

  it("falls back to default title when title is blank and omits blank body", async () => {
    await notifyNewTauriNotifications("u1", [])

    const sent = await notifyNewTauriNotifications("u1", [
      { id: "n1", title: "   ", body: "   ", read_at: null },
    ])
    expect(sent).toBe(1)
    expect(sendNotification).toHaveBeenCalledWith({ title: "ChronoLedger" })
  })

  it("R97-REV-001: does not mark items as seen when ensurePermission throws so the next poll retries", async () => {
    await notifyNewTauriNotifications("u1", [])
    isPermissionGranted.mockRejectedValueOnce(new Error("ipc timeout"))

    expect(await notifyNewTauriNotifications("u1", [item("n1")])).toBe(0)
    expect(sendNotification).not.toHaveBeenCalled()

    isPermissionGranted.mockResolvedValueOnce(true)
    expect(await notifyNewTauriNotifications("u1", [item("n1")])).toBe(1)
    expect(sendNotification).toHaveBeenCalledWith({ title: "제목 n1", body: "본문 n1" })
  })
})
