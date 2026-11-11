import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AdminRequestsPage from "./page"

const { from, rpc, useAuth, replace, convertIconSourceToDataUrl, fetchImageFile } = vi.hoisted(() => ({
  fetchImageFile: vi.fn(async () => new File(["fetched"], "fetched.png", { type: "image/png" })),
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
  fetchImageFile,
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
  const characterRequests = [
    {
      id: "char-req-1",
      game_id: "game-1",
      target_character_id: null,
      name: "Hero",
      rarity: "5★",
      attributes: { element: "불" },
      default_icon_url: "data:image/webp;base64,requested",
      memo: null,
      request_status: "PENDING",
      created_at: "2026-01-02T00:00:00.000Z",
      games: { name: "Sample RPG" },
    },
    {
      id: "char-req-2",
      game_id: "game-1",
      target_character_id: null,
      name: "NoIcon",
      rarity: null,
      attributes: {},
      default_icon_url: null,
      memo: null,
      request_status: "PENDING",
      created_at: "2026-01-03T00:00:00.000Z",
      games: { name: "Sample RPG" },
    },
    {
      id: "char-req-3",
      game_id: "game-1",
      target_character_id: "char-existing",
      name: "Updater",
      rarity: "4★",
      attributes: {},
      default_icon_url: null,
      memo: null,
      request_status: "PENDING",
      created_at: "2026-01-04T00:00:00.000Z",
      games: { name: "Sample RPG" },
    },
  ]
  let gameQuery: ReturnType<typeof createQueryBuilder>
  let scheduleQuery: ReturnType<typeof createQueryBuilder>
  let characterQuery: ReturnType<typeof createQueryBuilder>
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    gameQuery = createQueryBuilder({ data: gameRequests, error: null })
    scheduleQuery = createQueryBuilder({ data: scheduleRequests, error: null })
    characterQuery = createQueryBuilder({ data: characterRequests, error: null })
    useAuth.mockReturnValue({
      user: { id: "admin-1", app_metadata: { role: "admin" } },
      isLoading: false,
    })
    convertIconSourceToDataUrl.mockResolvedValue("data:image/webp;base64,converted")
    from.mockImplementation((table: string) =>
      table === "game_requests"
        ? gameQuery
        : table === "character_requests"
          ? characterQuery
          : scheduleQuery,
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

    await registerIcon("Sample RPG 기본 아이콘 이미지 선택", { url: "https://example.test/game.webp" })

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
    expect(fetchImageFile).toHaveBeenCalledWith("https://example.test/game.webp", 256)
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(expect.any(File))
  })

  it("converts a pasted game image, previews it, and approves with its WebP Data URL", async () => {
    await renderPage()

    const imageFile = new File(["image"], "clipboard.png", { type: "image/png" })
    await registerIcon("Sample RPG 기본 아이콘 이미지 선택", { paste: imageFile })

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

  async function openCharacterTab() {
    await renderPage()
    const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((element) =>
      element.textContent?.includes("캐릭터 요청"),
    )
    if (!tab) throw new Error("Expected the character request tab.")
    await act(async () => {
      Simulate.mouseDown(tab, { button: 0, ctrlKey: false })
    })
  }

  function byLabel<T extends HTMLElement>(label: string): T {
    const element = container.querySelector(`[aria-label="${label}"]`)
    if (!element) throw new Error(`Expected element with aria-label ${label}`)
    return element as T
  }

  async function click(element: HTMLElement) {
    await act(async () => {
      element.click()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  // R81: icons are registered through the shared image dialog (rendered in a portal outside the page container).
  const imageDialog = () => document.body.querySelector('[data-testid="image-source-dialog"]') as HTMLElement | null
  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  async function registerIcon(triggerLabel: string, source: { url?: string; file?: File; paste?: File }, options: { submit?: boolean } = {}) {
    await click(byLabel(triggerLabel))
    const dialog = imageDialog()
    if (!dialog) throw new Error("Expected the shared image dialog.")
    const urlInput = dialog.querySelector("#image-source-url") as HTMLInputElement
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement
    if (source.url) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(urlInput, source.url)
        Simulate.change(urlInput)
      })
    }
    if (source.file) {
      await act(async () => {
        Simulate.change(fileInput, { target: { files: [source.file] } } as unknown as Record<string, unknown>)
      })
    }
    if (source.paste) {
      await act(async () => {
        Simulate.paste(urlInput, { clipboardData: { files: [source.paste], items: [] } } as unknown as { clipboardData: DataTransfer })
      })
    }
    await flush()
    if (options.submit === false) return dialog
    const register = Array.from(dialog.closest('[role="dialog"]')!.querySelectorAll("button")).find((button) => button.textContent === "등록") as HTMLButtonElement
    await act(async () => {
      Simulate.click(register)
    })
    await flush()
    return dialog
  }

  it("lists pending character requests with ADD/UPDATE badges and a requested-icon preview", async () => {
    await openCharacterTab()

    expect(characterQuery.select).toHaveBeenCalledWith("*, games(name)")
    expect(container.textContent).toContain("Hero")
    expect(container.textContent).toContain("ADD")
    expect(container.textContent).toContain("UPDATE")
    expect(container.querySelector('img[alt="Hero 아이콘 미리보기"]')?.getAttribute("src")).toBe(
      "data:image/webp;base64,requested",
    )
    expect(container.querySelector('img[alt="NoIcon 아이콘 미리보기"]')).toBeNull()
  })

  it("approves a character request without sending an icon when the requested icon is kept", async () => {
    await openCharacterTab()

    await click(byLabel("Hero 캐릭터 요청 승인"))

    expect(rpc).toHaveBeenCalledWith("approve_character_request", { p_request_id: "char-req-1" })
    expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
    expect(container.textContent).toContain("캐릭터 요청을 승인했습니다.")
  })

  it("passes an admin replacement icon URL to approve_character_request as p_default_icon_url", async () => {
    await openCharacterTab()

    await registerIcon("Hero 캐릭터 아이콘 이미지 선택", { url: "https://example.test/hero.png" })
    await click(byLabel("Hero 캐릭터 요청 승인"))

    expect(fetchImageFile).toHaveBeenCalledWith("https://example.test/hero.png", 256)
    expect(rpc).toHaveBeenCalledWith("approve_character_request", {
      p_request_id: "char-req-1",
      p_default_icon_url: "data:image/webp;base64,converted",
    })
  })

  it("converts an uploaded replacement icon file before approving", async () => {
    await openCharacterTab()

    const iconFile = new File(["image"], "hero.png", { type: "image/png" })
    await registerIcon("Hero 캐릭터 아이콘 이미지 선택", { file: iconFile })
    await click(byLabel("Hero 캐릭터 요청 승인"))

    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(iconFile)
    expect(rpc).toHaveBeenCalledWith("approve_character_request", {
      p_request_id: "char-req-1",
      p_default_icon_url: "data:image/webp;base64,converted",
    })
  })

  it("disables approval for an ADD request without any icon until the admin supplies one", async () => {
    await openCharacterTab()

    const approve = byLabel<HTMLButtonElement>("NoIcon 캐릭터 요청 승인")
    expect(approve.disabled).toBe(true)
    expect(container.textContent).toContain("아이콘이 없는 신규 캐릭터 요청은 아이콘을 지정해야 승인할 수 있음")
    // UPDATE requests keep the existing catalog icon, so they stay approvable without one.
    expect(byLabel<HTMLButtonElement>("Updater 캐릭터 요청 승인").disabled).toBe(false)

    await registerIcon("NoIcon 캐릭터 아이콘 이미지 선택", { url: "https://example.test/noicon.png" })
    expect(byLabel<HTMLButtonElement>("NoIcon 캐릭터 요청 승인").disabled).toBe(false)

    await click(byLabel("NoIcon 캐릭터 요청 승인"))
    expect(rpc).toHaveBeenCalledWith("approve_character_request", {
      p_request_id: "char-req-2",
      p_default_icon_url: "data:image/webp;base64,converted",
    })
  })

  it("rejects an invalid replacement icon URL without calling the RPC", async () => {
    await openCharacterTab()

    // The shared dialog refuses non-http(s) text, so no replacement icon is stored and nothing is approved.
    const dialog = await registerIcon("Hero 캐릭터 아이콘 이미지 선택", { url: "ftp://example.test/hero.png" })

    expect(dialog.textContent).toContain("이미지 URL(https://...)을 입력하거나")
    expect(imageDialog()).not.toBeNull()
    expect(rpc).not.toHaveBeenCalled()
    expect(fetchImageFile).not.toHaveBeenCalled()
  })

  it("rejects a character request via reject_character_request and removes it from the list", async () => {
    await openCharacterTab()

    await click(byLabel("Hero 캐릭터 요청 반려"))

    expect(rpc).toHaveBeenCalledWith("reject_character_request", {
      p_request_id: "char-req-1",
      p_admin_memo: null,
    })
    expect(container.textContent).toContain("캐릭터 요청을 반려했습니다.")
    expect(container.querySelector('[aria-label="Hero 캐릭터 요청 승인"]')).toBeNull()
  })

  describe("pickup characters of schedule requests (R52 A1)", () => {
    const pickupRequest = {
      id: "schedule-request-pickup",
      game_id: "game-1",
      target_schedule_id: null,
      title: "카프카 픽업",
      schedule_type: "PICKUP",
      start_date: "2026-01-10",
      end_date: "2026-01-20",
      memo: null,
      is_official: true,
      pickup_character_ids: ["c1", "c2"],
      pickup_new_characters: [],
      request_status: "PENDING",
      created_at: "2026-01-02T00:00:00.000Z",
      games: { name: "Sample RPG" },
    }
    const proposalRequest = {
      ...pickupRequest,
      id: "schedule-request-proposal",
      title: "제안 픽업",
      pickup_character_ids: ["c1"],
      pickup_new_characters: [{ name: "신규 캐릭", icon_url: "data:image/webp;base64,np" }, { name: "이미지 없는 신규", icon_url: null }],
    }

    function mockQueries(options: { schedules: unknown[]; characters?: { data: unknown[]; error: unknown } | "throw" }) {
      scheduleQuery = createQueryBuilder({ data: options.schedules, error: null })
      const lookup = {
        select: vi.fn(),
        in: vi.fn(),
      }
      lookup.select.mockReturnValue(lookup)
      if (options.characters === "throw") lookup.in.mockRejectedValue(new Error("network"))
      else lookup.in.mockResolvedValue(options.characters ?? { data: [], error: null })
      from.mockImplementation((table: string) =>
        table === "game_requests" ? gameQuery
          : table === "character_requests" ? characterQuery
            : table === "game_characters" ? lookup
              : scheduleQuery,
      )
      return lookup
    }
    async function openScheduleTab() {
      await renderPage()
      const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((element) => element.textContent?.includes("일정 요청"))
      if (!tab) throw new Error("Expected the schedule request tab.")
      await act(async () => {
        Simulate.mouseDown(tab, { button: 0, ctrlKey: false })
      })
    }

    async function clickApprove() {
      const approve = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "승인")
      await click(approve as HTMLElement)
    }

    it("shows proposed new characters with a 신규 badge, their image or an initial avatar", async () => {
      mockQueries({ schedules: [proposalRequest], characters: { data: [{ id: "c1", name: "카프카", default_icon_url: null }], error: null } })
      await openScheduleTab()

      const proposals = container.querySelector('[data-testid="pickup-request-proposals"]') as HTMLElement
      expect(proposals.textContent).toContain("신규 캐릭")
      expect(proposals.textContent).toContain("이미지 없는 신규")
      expect(proposals.querySelectorAll("li")).toHaveLength(2)
      expect(proposals.textContent?.match(/신규(?!\s*캐릭)/g)?.length).toBeGreaterThanOrEqual(2)
      expect(proposals.querySelector('img[alt="신규 캐릭 제안 이미지"]')?.getAttribute("src")).toBe("data:image/webp;base64,np")
      // The image-less proposal and the icon-less selected character fall back to initials.
      expect(proposals.textContent).toContain("이")
      expect(container.querySelector('[data-testid="pickup-request-characters"]')?.textContent).toContain("카")
    })

    it("ignores malformed pickup_new_characters values", async () => {
      mockQueries({ schedules: [{ ...pickupRequest, pickup_new_characters: [{ name: 5 }, null, "x", { name: "정상", icon_url: 3 }] }] })
      await openScheduleTab()

      const proposals = container.querySelector('[data-testid="pickup-request-proposals"]') as HTMLElement
      expect(proposals.querySelectorAll("li")).toHaveLength(1)
      expect(proposals.textContent).toContain("정상")
    })

    it("approves only through the RPC and shows the real RPC error instead of falling back (R52-REV-003)", async () => {
      mockQueries({ schedules: [pickupRequest], characters: { data: [], error: null } })
      rpc.mockResolvedValueOnce({ error: { code: "P0001", message: "픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다." } })
      await openScheduleTab()
      await clickApprove()

      expect(rpc).toHaveBeenCalledWith("approve_schedule_request", { p_request_id: "schedule-request-pickup" })
      expect(scheduleQuery.insert).not.toHaveBeenCalled()
      expect(scheduleQuery.update).not.toHaveBeenCalled()
      expect(container.textContent).toContain("픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다.")
      expect(container.textContent).toContain("카프카 픽업")
    })

    it.each(["PGRST202", "42883"])("falls back to a direct write and copies pickup ids only when the approve RPC is missing (%s)", async (code) => {
      mockQueries({ schedules: [pickupRequest], characters: { data: [], error: null } })
      rpc.mockResolvedValueOnce({ error: { code, message: "function not found" } })
      await openScheduleTab()
      await clickApprove()

      expect(scheduleQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        game_id: "game-1",
        schedule_type: "PICKUP",
        pickup_character_ids: ["c1", "c2"],
      }))
      expect(scheduleQuery.insert.mock.calls[0][0]).not.toHaveProperty("pickup_image_url")
      expect(scheduleQuery.insert.mock.calls[0][0]).not.toHaveProperty("pickup_new_characters")
    })

    it("does not fall back when the request carries new-character proposals the RPC alone can register", async () => {
      mockQueries({ schedules: [proposalRequest], characters: { data: [], error: null } })
      rpc.mockResolvedValueOnce({ error: { code: "PGRST202", message: "function not found" } })
      await openScheduleTab()
      await clickApprove()

      expect(scheduleQuery.insert).not.toHaveBeenCalled()
      expect(container.textContent).toContain("function not found")
    })

    it("uses the same 'name 대기열 (n)' heading in all three request tabs", async () => {
      mockQueries({ schedules: [pickupRequest] })
      await renderPage()
      expect(container.textContent).toContain("게임 요청 대기열 (1)")

      const open = async (label: string) => {
        const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((element) => element.textContent?.includes(label)) as HTMLElement
        await act(async () => {
          Simulate.mouseDown(tab, { button: 0, ctrlKey: false })
        })
      }
      await open("일정 요청")
      expect(container.textContent).toContain("일정 요청 대기열 (1)")
      await open("캐릭터 요청")
      expect(container.textContent).toContain("캐릭터 요청 대기열 (3)")
    })

    it("keeps the three tabs on one scrollable non-wrapping row on small screens (U-01)", async () => {
      mockQueries({ schedules: [] })
      await renderPage()

      expect(container.querySelector('[role="tablist"]')?.className).toContain("overflow-x-auto")
      const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
      expect(tabs).toHaveLength(3)
      expect(tabs.every((tab) => tab.className.includes("shrink-0") && tab.className.includes("whitespace-nowrap"))).toBe(true)
    })

    it("looks up only the referenced characters and shows their names and icons", async () => {
      const lookup = mockQueries({
        schedules: [pickupRequest],
        characters: { data: [
          { id: "c1", name: "카프카", default_icon_url: "data:image/webp;base64,a" },
          { id: "c2", name: "블랙 스완", default_icon_url: "data:image/webp;base64,b" },
        ], error: null },
      })
      await openScheduleTab()

      expect(lookup.select).toHaveBeenCalledWith("id, name, default_icon_url")
      expect(lookup.in).toHaveBeenCalledWith("id", ["c1", "c2"])
      const chips = container.querySelector('[data-testid="pickup-request-characters"]') as HTMLElement
      expect(chips.textContent).toContain("카프카")
      expect(chips.textContent).toContain("블랙 스완")
      expect(chips.querySelectorAll("img")).toHaveLength(2)
    })

    it("does not query characters when no request references any", async () => {
      const lookup = mockQueries({ schedules: [scheduleRequests[0]] })
      await openScheduleTab()

      expect(lookup.in).not.toHaveBeenCalled()
      expect(container.querySelector('[data-testid="pickup-request-characters"]')).toBeNull()
    })

    it("keeps listing the request when the character lookup fails", async () => {
      mockQueries({ schedules: [pickupRequest], characters: "throw" })
      await openScheduleTab()

      expect(container.textContent).toContain("카프카 픽업")
      expect(container.querySelector('[data-testid="pickup-request-characters"]')?.textContent).toContain("캐릭터")
      expect(container.textContent).not.toContain("데이터를 불러오는 중 오류가 발생했습니다")
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
