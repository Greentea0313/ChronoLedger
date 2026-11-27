import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationBell, formatCreatedAt, isSafeLinkPath } from "./notification-bell"

const { from, rpc, push } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), push: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `알림 ${id}`,
  body: `본문 ${id}`,
  link_path: "/dashboard/games",
  read_at: null,
  created_at: "2026-11-18T01:00:00Z",
  ...overrides,
})

function mockInbox(result: { data: unknown[] | null; error: { code?: string; message: string } | null }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  from.mockReturnValue(builder)
  return builder
}

const openBell = () => fireEvent.click(screen.getByRole("button", { name: /^알림/ }))

describe("isSafeLinkPath", () => {
  it("accepts app-relative paths only", () => {
    expect(isSafeLinkPath("/dashboard/games")).toBe(true)
    expect(isSafeLinkPath("//evil.example")).toBe(false)
    expect(isSafeLinkPath("https://evil.example")).toBe(false)
    expect(isSafeLinkPath("dashboard")).toBe(false)
  })
})

describe("formatCreatedAt", () => {
  it("formats in KST regardless of the device time zone", () => {
    expect(formatCreatedAt("2026-11-18T15:05:00Z")).toBe("11/19 00:05")
    expect(formatCreatedAt("not-a-date")).toBe("")
  })
})

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: 1, error: null })
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })

  it("loads the latest 30 notifications of the user and shows the unread count badge", async () => {
    const builder = mockInbox({ data: [row("a"), row("b", { read_at: "2026-11-18T02:00:00Z" }), row("c")], error: null })
    render(<NotificationBell userId="u1" />)

    await waitFor(() => expect(screen.getByTestId("notification-badge").textContent).toBe("2"))
    expect(from).toHaveBeenCalledWith("notifications")
    expect(builder.select).toHaveBeenCalledWith("id, title, body, link_path, read_at, created_at, kind, scheduled_for")
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1")
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(30)
    expect(screen.getByRole("button", { name: "알림 2건 읽지 않음" })).toBeTruthy()
  })

  it("hides the badge when everything is read and caps it at 9+", async () => {
    mockInbox({ data: [row("a", { read_at: "2026-11-18T02:00:00Z" })], error: null })
    const { unmount } = render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(from).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByTestId("notification-badge")).toBeNull())
    unmount()

    mockInbox({ data: Array.from({ length: 12 }, (_, i) => row(String(i))), error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge").textContent).toBe("9+"))
  })

  it("lists notifications with unread ones highlighted when the bell is opened", async () => {
    mockInbox({ data: [row("a"), row("b", { read_at: "2026-11-18T02:00:00Z" })], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())

    openBell()
    const dialog = screen.getByRole("dialog", { name: "알림함" })
    const items = within(dialog).getAllByTestId("notification-item")
    expect(items.map((item) => item.getAttribute("data-unread"))).toEqual(["true", "false"])
    expect(within(dialog).getByText("본문 a")).toBeTruthy()
  })

  it("marks one notification read and follows its link", async () => {
    mockInbox({ data: [row("a")], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()

    fireEvent.click(screen.getByTestId("notification-item"))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("mark_notifications_read", { p_notification_ids: ["a"] }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/games"))
    expect(screen.queryByTestId("notification-badge")).toBeNull()
    expect(screen.queryByRole("dialog", { name: "알림함" })).toBeNull()
  })

  it("anchors the mobile popover within viewport horizontal margins below the bell", async () => {
    mockInbox({ data: [], error: null })
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 12,
      bottom: 56,
      left: 160,
      right: 204,
      width: 44,
      height: 44,
      x: 160,
      y: 12,
      toJSON: () => ({}),
    })
    try {
      render(<NotificationBell userId="u1" />)
      await waitFor(() => expect(from).toHaveBeenCalled())
      openBell()
      const dialog = screen.getByRole("dialog", { name: "알림함" })
      expect(dialog.className).toContain("fixed inset-x-4")
      expect(dialog.className).toContain("sm:absolute")
      expect(dialog.className).toContain("sm:right-0")
      expect(dialog.style.getPropertyValue("--notification-top")).toBe("60px")
    } finally {
      rectSpy.mockRestore()
    }
  })

  it("does not navigate to an unsafe link but still marks it read", async () => {
    mockInbox({ data: [row("a", { link_path: "//evil.example" })], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()
    fireEvent.click(screen.getByTestId("notification-item"))

    await waitFor(() => expect(rpc).toHaveBeenCalled())
    expect(push).not.toHaveBeenCalled()
  })

  it("marks everything read with 모두 읽음 (null id list)", async () => {
    mockInbox({ data: [row("a"), row("b")], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()

    fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("mark_notifications_read", { p_notification_ids: null }))
    await waitFor(() => expect(screen.queryByTestId("notification-badge")).toBeNull())
  })

  it("shows an error and keeps the item unread when the RPC fails", async () => {
    mockInbox({ data: [row("a")], error: null })
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()
    fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }))

    expect((await screen.findByRole("alert")).textContent).toContain("읽음 처리에 실패")
    expect(screen.getByTestId("notification-badge")).toBeTruthy()
  })

  it("blocks read marking while offline", async () => {
    mockInbox({ data: [row("a")], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }))

    expect((await screen.findByRole("alert")).textContent).toContain("오프라인")
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each(["42P01", "PGRST205"])("falls back to an empty inbox without logging when the table is missing (%s)", async (code) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockInbox({ data: null, error: { code, message: "missing" } })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(from).toHaveBeenCalled())
    openBell()

    expect(await screen.findByText("새 알림이 없습니다.")).toBeTruthy()
    expect(screen.queryByTestId("notification-badge")).toBeNull()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("deletes a single notification without marking read or navigating and updates the unread badge", async () => {
    mockInbox({ data: [row("a"), row("b")], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge").textContent).toBe("2"))
    openBell()

    fireEvent.click(screen.getByRole("button", { name: "알림 a 알림 삭제" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_notifications", { p_notification_ids: ["a"] }))
    await waitFor(() => expect(screen.getAllByTestId("notification-item")).toHaveLength(1))
    expect(screen.queryByText("알림 a")).toBeNull()
    expect(screen.getByText("알림 b")).toBeTruthy()
    expect(screen.getByTestId("notification-badge").textContent).toBe("1")
    expect(push).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalledWith("mark_notifications_read", expect.anything())
  })

  it("requires inline two-step confirmation for 전체 삭제 and resets confirmation on cancel or close (R106-REV-001)", async () => {
    mockInbox({ data: [row("a"), row("b", { read_at: "2026-11-18T02:00:00Z" })], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge").textContent).toBe("1"))
    openBell()

    const deleteAllButton = screen.getByRole("button", { name: "전체 삭제" }) as HTMLButtonElement
    expect(deleteAllButton.disabled).toBe(false)

    // 1st click enters inline confirmation without calling RPC
    fireEvent.click(deleteAllButton)
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "삭제 확인" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "취소" })).toBeTruthy()

    // Cancel returns to default header without calling RPC
    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "삭제 확인" })).toBeNull()
    expect(screen.getByRole("button", { name: "전체 삭제" })).toBeTruthy()

    // Closing popover resets confirmation state
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }))
    expect(screen.getByRole("button", { name: "삭제 확인" })).toBeTruthy()
    fireEvent.keyDown(document, { key: "Escape" })
    openBell()
    expect(screen.queryByRole("button", { name: "삭제 확인" })).toBeNull()

    // Confirming deletes all notifications and disables button when empty
    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }))
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_notifications", { p_notification_ids: null }))
    expect(await screen.findByText("새 알림이 없습니다.")).toBeTruthy()
    expect(screen.queryByTestId("notification-badge")).toBeNull()
    expect((screen.getByRole("button", { name: "전체 삭제" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("shows an alert and keeps notifications when delete RPC fails", async () => {
    mockInbox({ data: [row("a")], error: null })
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()

    fireEvent.click(screen.getByTestId("notification-delete-button"))

    expect((await screen.findByRole("alert")).textContent).toContain("알림 삭제에 실패했습니다")
    expect(screen.getByText("알림 a")).toBeTruthy()
    expect(screen.getByTestId("notification-badge")).toBeTruthy()
  })

  it("blocks single and bulk notification deletion while offline", async () => {
    mockInbox({ data: [row("a")], error: null })
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(screen.getByTestId("notification-badge")).toBeTruthy())
    openBell()
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })

    fireEvent.click(screen.getByTestId("notification-delete-button"))
    expect((await screen.findByRole("alert")).textContent).toContain("오프라인 상태에서는 알림을 삭제할 수 없습니다")
    expect(rpc).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }))
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }))
    expect((await screen.findByRole("alert")).textContent).toContain("오프라인 상태에서는 알림을 삭제할 수 없습니다")
    expect(rpc).not.toHaveBeenCalled()
  })
})
