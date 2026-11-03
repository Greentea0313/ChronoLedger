import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AdminRequestsPage from "./page"

const { from, rpc, useAuth, replace, convertIconSourceToDataUrl } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  replace: vi.fn(),
  convertIconSourceToDataUrl: vi.fn(),
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
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/image-resizer")>(),
  convertIconSourceToDataUrl,
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
    convertIconSourceToDataUrl.mockResolvedValue("data:image/webp;base64,converted")
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

  it("loads requests and stores an approved game's icon as a converted WebP Data URL", async () => {
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
      p_default_icon_url: "data:image/webp;base64,converted",
    })
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://example.test/game.webp")
  })

  it("converts a pasted game image, previews it, and approves with its WebP Data URL", async () => {
    await renderPage()

    const iconUrlInput = container.querySelector('input[aria-label="Sample RPG 기본 아이콘 URL"]')
    if (!(iconUrlInput instanceof HTMLInputElement)) throw new Error("Expected the game icon URL input.")
    const imageFile = new File(["image"], "clipboard.png", { type: "image/png" })
    await act(async () => {
      Simulate.paste(iconUrlInput, {
        clipboardData: { files: [imageFile], items: [] },
      } as unknown as { clipboardData: DataTransfer })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(imageFile)
    expect(container.querySelector('img[alt="Sample RPG 아이콘 미리보기"]')).not.toBeNull()

    const approveButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("승인"),
    )
    await act(async () => {
      approveButton!.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("approve_game_request", {
      p_request_id: "game-request-1",
      p_default_icon_url: "data:image/webp;base64,converted",
    })
  })

  it("does not show the duplicate direct-game registration card", async () => {
    await renderPage()
    expect(container.textContent).not.toContain("관리자 직접 게임 추가")
    expect(container.querySelector("#direct-game-name")).toBeNull()
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
