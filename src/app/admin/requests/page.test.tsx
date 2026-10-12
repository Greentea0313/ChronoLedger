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

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (val: { data: unknown[]; error: null }) => unknown) => unknown
}

function createQueryBuilder(result: { data: unknown[]; error: null }): MockQueryBuilder {
  const query: MockQueryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    then: (resolve) => resolve({ data: result.data, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue(result)
  query.update.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.single.mockResolvedValue({ data: { id: "test-game-id" }, error: null })
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

    const iconUrlInput = container.querySelector('input[aria-label="Sample RPG 기본 아이콘 URL"]')
    expect(iconUrlInput).not.toBeNull()
    if (!(iconUrlInput instanceof HTMLInputElement)) throw new Error("Expected the game icon URL input.")
    await act(async () => {
      iconUrlInput.value = "https://example.test/game.webp"
      Simulate.change(iconUrlInput)
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

  it("allows admin to directly add a game by entering name and icon URL and clicking [게임 등록]", async () => {
    await renderPage()

    const nameInput = container.querySelector("#direct-game-name")
    const iconInput = container.querySelector("#direct-game-icon-url")
    expect(nameInput).not.toBeNull()
    expect(iconInput).not.toBeNull()

    if (!(nameInput instanceof HTMLInputElement) || !(iconInput instanceof HTMLInputElement)) {
      throw new Error("Expected direct game name and icon URL inputs.")
    }

    await act(async () => {
      nameInput.value = "신규 게임"
      Simulate.change(nameInput)
      iconInput.value = "https://example.test/new-game.webp"
      Simulate.change(iconInput)
    })

    const createButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("게임 등록"),
    )
    expect(createButton).toBeDefined()

    await act(async () => {
      createButton!.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("admin_create_game", {
      p_name: "신규 게임",
      p_default_icon_url: "https://example.test/new-game.webp",
    })
    expect(container.textContent).toContain("'신규 게임' 게임이 성공적으로 등록되었습니다.")
  })

  it("does not fetch requests for a non-admin user", async () => {
    useAuth.mockReturnValue({
      user: { id: "user-1", app_metadata: { role: "user" } },
      role: "user",
      isLoading: false,
    })

    await renderPage()

    expect(container.textContent).toContain("관리자 권한이 필요합니다.")
    expect(from).not.toHaveBeenCalled()
  })

  it("loads requests when role='admin' from auth context even without app_metadata.role", async () => {
    useAuth.mockReturnValue({
      user: { id: "admin-1", app_metadata: {} },
      role: "admin",
      isLoading: false,
    })

    await renderPage()

    expect(container.textContent).toContain("Sample RPG")
    expect(gameQuery.eq).toHaveBeenCalledWith("request_status", "PENDING")
  })

  it("rejects a game request via RPC and removes it from the list", async () => {
    await renderPage()

    expect(container.textContent).toContain("Sample RPG")

    const rejectButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("반려"),
    )
    expect(rejectButton).toBeDefined()

    await act(async () => {
      rejectButton!.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("reject_game_request", {
      p_request_id: "game-request-1",
      p_admin_memo: null,
    })
    expect(container.textContent).toContain("게임 추가 요청을 반려했습니다.")
    expect(container.textContent).not.toContain("Sample RPG")
  })

  it("falls back to direct table update when game rejection RPC fails", async () => {
    rpc.mockResolvedValueOnce({ error: new Error("RPC rejection failed") })

    await renderPage()

    const rejectButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("반려"),
    )
    expect(rejectButton).toBeDefined()

    await act(async () => {
      rejectButton!.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("reject_game_request", {
      p_request_id: "game-request-1",
      p_admin_memo: null,
    })
    expect(gameQuery.update).toHaveBeenCalledWith({
      request_status: "REJECTED",
      admin_memo: null,
    })
    expect(gameQuery.eq).toHaveBeenCalledWith("id", "game-request-1")
    expect(container.textContent).toContain("게임 추가 요청을 반려했습니다.")
  })
})
