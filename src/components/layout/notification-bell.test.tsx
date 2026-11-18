import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationBell, isSafeLinkPath } from "./notification-bell"

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
    expect(builder.select).toHaveBeenCalledWith("id, title, body, link_path, read_at, created_at")
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
})
