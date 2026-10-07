import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AdminRequestsPage from "./page"

const { from, rpc, useAuth, replace } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth,
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from, rpc },
}))

function createQueryBuilder(result: { data: unknown[]; error: null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue(result)
  return query
}

describe("AdminRequestsPage", () => {
  const gameRequests = [
    {
      id: "game-request-1",
      name: "Sample RPG",
      memo: "Please add this game",
      request_status: "PENDING",
      created_at: "2026-01-02T00:00:00.000Z",
    },
  ]
  const scheduleRequests = [
    {
      id: "schedule-request-1",
      game_id: "game-1",
      title: "Version 2.0",
      schedule_type: "VERSION",
      start_date: "2026-01-10",
      end_date: "2026-01-20",
      memo: null,
      request_status: "PENDING",
      created_at: "2026-01-02T00:00:00.000Z",
      games: { name: "Sample RPG" },
    },
  ]
  let gameQuery: ReturnType<typeof createQueryBuilder>
  let scheduleQuery: ReturnType<typeof createQueryBuilder>
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    gameQuery = createQueryBuilder({ data: gameRequests, error: null })
    scheduleQuery = createQueryBuilder({ data: scheduleRequests, error: null })
    useAuth.mockReturnValue({
      user: { id: "admin-1", app_metadata: { role: "admin" } },
      isLoading: false,
    })
    from.mockImplementation((table: string) =>
      table === "game_requests" ? gameQuery : scheduleQuery,
    )
    rpc.mockResolvedValue({ error: null })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  async function renderPage() {
    await act(async () => {
      root.render(<AdminRequestsPage />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it("loads schema-backed requests and approves a game with its icon URL", async () => {
    await renderPage()

    expect(container.textContent).toContain("Sample RPG")
    expect(gameQuery.eq).toHaveBeenCalledWith("request_status", "PENDING")
    expect(scheduleQuery.select).toHaveBeenCalledWith("*, games(name)")
    expect(scheduleQuery.eq).toHaveBeenCalledWith("request_status", "PENDING")

    const iconUrlInput = container.querySelector('input[type="url"]')
    expect(iconUrlInput).not.toBeNull()
    await act(async () => {
      Simulate.change(iconUrlInput!, { target: { value: "https://example.test/game.webp" } })
    })

    const approveButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("승인"),
    )
    expect(approveButton).toBeDefined()
    await act(async () => {
      approveButton!.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("approve_game_request", {
      p_request_id: "game-request-1",
      p_default_icon_url: "https://example.test/game.webp",
    })
  })

  it("does not fetch requests for a non-admin user", async () => {
    useAuth.mockReturnValue({
      user: { id: "user-1", app_metadata: { role: "user" } },
      isLoading: false,
    })

    await renderPage()

    expect(container.textContent).toContain("관리자 권한이 필요합니다.")
    expect(from).not.toHaveBeenCalled()
  })
})
