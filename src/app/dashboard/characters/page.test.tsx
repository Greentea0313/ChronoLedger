import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CharactersPage from "./page"

type Row = Record<string, unknown>
type Write = { table: string; op: "upsert" | "insert" | "update" | "delete"; payload?: unknown; options?: unknown; filters: Record<string, unknown> }

const {
  from,
  rpc,
  useAuth,
  downloadUserIcon,
  getCustomCharacterIconUrl,
  uploadCustomCharacterIcon,
  deleteCustomCharacterIcon,
  resizeImageToWebP,
} = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  downloadUserIcon: vi.fn(),
  getCustomCharacterIconUrl: vi.fn(),
  uploadCustomCharacterIcon: vi.fn(),
  deleteCustomCharacterIcon: vi.fn(),
  resizeImageToWebP: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("@/lib/storage-upload", () => ({
  downloadUserIcon,
  getCustomCharacterIconUrl,
  uploadCustomCharacterIcon,
  deleteCustomCharacterIcon,
  getCustomCharacterIconPath: (userId: string, characterId: string) => `${userId}/characters/${characterId}.webp`,
}))
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-resizer")>()),
  resizeImageToWebP,
}))

const USER_ID = "test-user-id"
const DIM = "brightness-50 saturate-50 opacity-65"

const db = {
  userGames: [] as Row[],
  characters: {} as Record<string, Row[]>,
  userCharacters: [] as Row[],
  presets: [] as Row[],
  writeError: null as { message: string } | null,
  countErrorGames: [] as string[],
  pickupColumnMissing: false,
  favoriteColumnMissing: false,
  rpcError: null as { code?: string; message: string } | null,
  icons: [] as Row[],
  iconError: null as { code?: string; message: string } | null,
}
let iconQueries: string[] = []
let writes: Write[] = []
let rpcCalls: { fn: string; args: Record<string, unknown> }[] = []
let presetSeq = 0

function execute(table: string, ctx: { op: string; filters: Record<string, unknown>; head: boolean; payload: unknown; options: unknown; columns: string }) {
  if (ctx.op === "select") {
    if (table === "user_games") return { data: db.userGames, error: null }
    if (table === "game_characters") {
      // Unmigrated DB: any use of is_pickup_only (selected column or filter) fails with 42703.
      if (db.pickupColumnMissing && (ctx.columns.includes("is_pickup_only") || "is_pickup_only" in ctx.filters)) {
        return { data: null, count: null, error: { code: "42703", message: 'column "is_pickup_only" does not exist' } }
      }
      const allRows = db.characters[String(ctx.filters.game_id)] ?? []
      const rows = ctx.head && ctx.filters.is_pickup_only === false ? allRows.filter((row) => row.is_pickup_only !== true) : allRows
      if (ctx.head && db.countErrorGames.includes(String(ctx.filters.game_id))) return { data: null, count: null, error: { message: "count failed" } }
      return ctx.head ? { data: null, count: rows.length, error: null } : { data: rows, error: null }
    }
    if (table === "user_characters") {
      // Unmigrated DB: the favorite_sort_order column does not exist yet.
      if (db.favoriteColumnMissing && ctx.columns.includes("favorite_sort_order")) {
        return { data: null, error: { code: "42703", message: 'column "favorite_sort_order" does not exist' } }
      }
      return { data: db.userCharacters, error: null }
    }
    if (table === "user_character_presets") {
      return { data: [...db.presets].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)), error: null }
    }
    if (table === "game_classification_icons") {
      iconQueries.push(String(ctx.filters.game_id))
      if (db.iconError) return { data: null, error: db.iconError }
      return { data: db.icons.filter((row) => row.game_id === ctx.filters.game_id), error: null }
    }
    return { data: [], error: null }
  }
  if (db.writeError) return { data: null, error: db.writeError }
  const payload = ctx.payload as Row
  if (table === "user_characters" && ctx.op === "upsert") {
    const existing = db.userCharacters.find((row) => row.character_id === payload.character_id)
    if (existing) Object.assign(existing, payload)
    else db.userCharacters.push({ is_favorite: false, breakthrough_level: 0, custom_icon_path: null, ...payload })
  }
  if (table === "user_character_presets") {
    if (ctx.op === "insert") db.presets.push({ id: `preset-new-${++presetSeq}`, created_at: "2026-11-09T00:00:00Z", ...payload })
    if (ctx.op === "update") Object.assign(db.presets.find((row) => row.id === ctx.filters.id) ?? {}, payload)
    if (ctx.op === "delete") db.presets = db.presets.filter((row) => row.id !== ctx.filters.id)
  }
  return { data: null, error: null }
}

function createQuery(table: string) {
  const ctx = { op: "select", filters: {} as Record<string, unknown>, head: false, payload: undefined as unknown, options: undefined as unknown, columns: "" }
  const record = (op: Write["op"], payload?: unknown, options?: unknown) => {
    ctx.op = op
    ctx.payload = payload
    ctx.options = options
    writes.push({ table, op, payload, options, filters: ctx.filters })
  }
  const query: Record<string, unknown> = {}
  query.select = vi.fn((columns?: string, options?: { head?: boolean }) => {
    if (ctx.op === "select") {
      ctx.head = !!options?.head
      ctx.columns = columns ?? ""
    }
    return query
  })
  query.eq = vi.fn((column: string, value: unknown) => {
    ctx.filters[column] = value
    return query
  })
  query.order = vi.fn(() => query)
  query.upsert = vi.fn((payload: unknown, options?: unknown) => (record("upsert", payload, options), query))
  query.insert = vi.fn((payload: unknown) => (record("insert", payload), query))
  query.update = vi.fn((payload: unknown) => (record("update", payload), query))
  query.delete = vi.fn(() => (record("delete"), query))
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(execute(table, ctx)).then(resolve, reject)
  return query
}

const schemaA = {
  rarities: ["5★", "4★"],
  axes: [{ key: "element", label: "속성", options: ["화염", "얼음"] }],
}

function character(id: string, name: string, rarity: string | null, element?: string): Row {
  return {
    id,
    game_id: "game-a",
    name,
    rarity,
    attributes: element ? { element } : {},
    default_icon_url: `https://example.com/${id}.png`,
  }
}

function seed() {
  db.userGames = [
    {
      id: "ug-a",
      game_id: "game-a",
      custom_icon_path: null,
      games: { id: "game-a", name: "가나게임", default_icon_url: "https://example.com/a.png", max_preset_slots: 3, classification_schema: schemaA },
    },
    {
      id: "ug-b",
      game_id: "game-b",
      custom_icon_path: null,
      games: { id: "game-b", name: "다라게임", default_icon_url: null, max_preset_slots: 4, classification_schema: { rarities: [], axes: [] } },
    },
  ]
  db.characters = {
    "game-a": [
      character("c1", "아케론", "5★", "얼음"),
      character("c2", "칼리", "4★", "화염"),
      character("c3", "구캐릭터", "3★", "바람"),
      character("c4", "라이덴", "5★", "화염"),
    ],
    "game-b": [{ ...character("d1", "다라전용", null), game_id: "game-b" }],
  }
  db.userCharacters = [
    { character_id: "c1", game_id: "game-a", is_owned: true, is_favorite: false, breakthrough_level: 0, custom_icon_path: null },
    { character_id: "c3", game_id: "game-a", is_owned: true, is_favorite: false, breakthrough_level: 0, custom_icon_path: null },
  ]
  db.presets = [
    {
      id: "p1",
      game_id: "game-a",
      title: "혼돈 파티",
      character_ids: ["c1", "c2"],
      memo: "첫째 줄\n둘째 줄",
      sort_order: 0,
      created_at: "2026-11-01T00:00:00Z",
    },
  ]
  db.writeError = null
  db.countErrorGames = []
  db.pickupColumnMissing = false
  db.favoriteColumnMissing = false
  db.rpcError = null
  db.icons = []
  db.iconError = null
}

describe("CharactersPage", () => {
  let container: HTMLDivElement
  let root: Root

  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })

  async function renderPage() {
    await act(async () => root.render(<CharactersPage />))
    await flush()
    await flush()
  }

  async function click(el: Element | null | undefined) {
    expect(el).toBeTruthy()
    await act(async () => {
      Simulate.click(el as Element)
    })
    await flush()
  }

  async function toggle(el: Element | null) {
    expect(el).toBeTruthy()
    await act(async () => {
      (el as HTMLElement).click()
    })
    await flush()
  }

  async function change(el: Element | null, value: string) {
    expect(el).toBeTruthy()
    await act(async () => {
      Simulate.change(el as Element, { target: { value } as unknown as EventTarget })
    })
  }

  async function selectTab(name: string) {
    const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((el) => el.textContent === name)
    expect(tab).toBeTruthy()
    await act(async () => {
      tab!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }))
    })
  }

  const buttonByText = (text: string, scope: ParentNode = document.body) =>
    Array.from(scope.querySelectorAll("button")).find((b) => b.textContent?.trim() === text)
  // The request button renders a mobile label (md:hidden) and a desktop label (hidden md:inline).
  const requestButtonLabels = (scope: ParentNode = document.body) => {
    const button = Array.from(scope.querySelectorAll("button")).find((b) => b.textContent?.includes("추가·수정 요청"))
    return {
      button,
      mobile: button?.querySelector("span.md\\:hidden")?.textContent,
      desktop: button?.querySelector("span.hidden")?.textContent,
    }
  }

  const pickerButton = (name: string, scope: ParentNode) =>
    Array.from(scope.querySelectorAll("button")).find((b) => b.querySelector("span.truncate")?.textContent === name) as HTMLButtonElement
  const presetCardCount = () => container.querySelectorAll('[data-testid="preset-card"]').length
  const cards = () => Array.from(container.querySelectorAll('[data-testid="character-card"]'))
  const cardNames = () => cards().map((card) => card.querySelector("span.truncate")?.textContent)
  const cardByName = (name: string) => cards().find((card) => card.querySelector("span.truncate")?.textContent === name) as HTMLElement
  const chip = (group: string, label: string) =>
    buttonByText(label, container.querySelector(`[data-testid="${group}"]`) as HTMLElement)
  const gameChip = (name: string) =>
    Array.from(container.querySelectorAll('nav[aria-label="구독 게임 선택"] button')).find((b) => b.textContent?.includes(name))
  const isDimmed = (el: Element | null | undefined) => el?.querySelector('[data-testid="character-icon"]')?.className.includes(DIM)

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    seed()
    writes = []
    rpcCalls = []
    iconQueries = []
    presetSeq = 0
    useAuth.mockReturnValue({ user: { id: USER_ID } })
    downloadUserIcon.mockResolvedValue(null)
    getCustomCharacterIconUrl.mockResolvedValue("blob:custom")
    uploadCustomCharacterIcon.mockResolvedValue(undefined)
    deleteCustomCharacterIcon.mockResolvedValue(undefined)
    resizeImageToWebP.mockResolvedValue(new Blob(["webp"], { type: "image/webp" }))
    from.mockImplementation((table: string) => createQuery(table))
    rpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (db.rpcError) return { data: null, error: db.rpcError }
      if (fn === "reorder_favorite_characters") {
        const ids = args.p_character_ids as string[]
        db.userCharacters.forEach((row) => {
          const index = ids.indexOf(String(row.character_id))
          if (index >= 0) row.favorite_sort_order = index + 1
        })
      }
      return { data: null, error: null }
    })
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove())
    window.history.pushState({}, "", "/")
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe("game selector bar", () => {
    it("lists subscribed games with ownership and preset summaries and selects the first one", async () => {
      await renderPage()

      expect(container.textContent).toContain("보유 캐릭터 2 / 4명 · 프리셋 1개")
      expect(container.textContent).toContain("보유 캐릭터 0 / 1명 · 프리셋 0개")
      expect(gameChip("가나게임")?.getAttribute("aria-pressed")).toBe("true")
      expect(gameChip("다라게임")?.getAttribute("aria-pressed")).toBe("false")
      expect(cardNames()).toEqual(["구캐릭터", "아케론", "라이덴", "칼리"])
      expect(requestButtonLabels(container)).toMatchObject({ mobile: "+ 캐릭터 추가·수정 요청", desktop: "+ 캐릭터 추가·수정 요청" })
    })

    it("switches the selected game and shows that game's catalog", async () => {
      await renderPage()
      expect(cards()).toHaveLength(4)

      await click(gameChip("다라게임"))

      expect(gameChip("다라게임")?.getAttribute("aria-pressed")).toBe("true")
      expect(cardNames()).toEqual(["다라전용"])
      expect(container.querySelector('[data-testid="roster-rarity-filter"]')).toBeNull()
    })

    it("hides subscribed games without any catalog character from the game bar", async () => {
      db.characters["game-b"] = []
      await renderPage()

      expect(gameChip("가나게임")).toBeTruthy()
      expect(gameChip("다라게임")).toBeUndefined()
      expect(container.textContent).not.toContain("다라게임")
    })

    it("falls back to the first supported game when ?gameId= points to an unsupported game", async () => {
      db.characters["game-b"] = []
      window.history.pushState({}, "", "/dashboard/characters?gameId=game-b")
      await renderPage()

      expect(gameChip("가나게임")?.getAttribute("aria-pressed")).toBe("true")
    })

    it("does not count pickup-only characters: a game with only pickup-only characters is hidden", async () => {
      db.characters["game-b"] = [{ ...character("po1", "픽업 전용", null), game_id: "game-b", is_pickup_only: true }]
      await renderPage()

      expect(gameChip("가나게임")).toBeTruthy()
      expect(gameChip("다라게임")).toBeUndefined()
    })

    it("never lists pickup-only characters in the roster or presets", async () => {
      db.characters["game-a"] = [...db.characters["game-a"], { ...character("po2", "픽업전용A", null), is_pickup_only: true }]
      await renderPage()

      expect(cardNames()).toEqual(["구캐릭터", "아케론", "라이덴", "칼리"])
      expect(container.textContent).not.toContain("픽업전용A")
      expect(container.textContent).toContain("보유 캐릭터 2 / 4명")
    })

    it("treats every character as a roster character when is_pickup_only is not migrated yet (D-08)", async () => {
      db.pickupColumnMissing = true
      await renderPage()

      expect(cardNames()).toEqual(["구캐릭터", "아케론", "라이덴", "칼리"])
      expect(container.textContent).toContain("보유 캐릭터 2 / 4명")
      expect(container.textContent).not.toContain("캐릭터 목록을 불러오지 못했습니다")
    })

    it("shows the unsupported-games empty state when no subscribed game has characters", async () => {
      db.characters["game-a"] = []
      db.characters["game-b"] = []
      await renderPage()

      expect(container.textContent).toContain("현재 구독 중인 게임 중 캐릭터·프리셋 기능을 지원하는 게임이 없습니다.")
      expect(container.textContent).toContain("보유 캐릭터 체크 및 조합 프리셋은 관리자가 캐릭터 카탈로그를 등록한 게임에서만 제공됩니다.")
      expect(container.textContent).not.toContain("구독 중인 게임이 없습니다.")
      expect(container.querySelector('nav[aria-label="구독 게임 선택"]')).toBeNull()
    })

    it("keeps a game visible when its catalog count query fails", async () => {
      db.characters["game-b"] = []
      db.countErrorGames = ["game-b"]
      await renderPage()

      expect(gameChip("다라게임")).toBeTruthy()
    })

    it("uses the admin character_label in the summary, roster tab and request button", async () => {
      db.userGames[0] = {
        ...db.userGames[0],
        games: { ...(db.userGames[0].games as Row), classification_schema: { ...schemaA, character_label: "공명자" } },
      }
      await renderPage()

      expect(container.textContent).toContain("보유 공명자 2 / 4명 · 프리셋 1개")
      const tab = Array.from(container.querySelectorAll('[role="tab"]')).find((el) => el.textContent === "보유 공명자")
      expect(tab).toBeTruthy()
      // Mobile always shows the generic label; the admin label appears from md up.
      expect(requestButtonLabels(container)).toMatchObject({ mobile: "+ 캐릭터 추가·수정 요청", desktop: "+ 공명자 추가·수정 요청" })
    })

    it("preselects the game from the ?gameId= query", async () => {
      window.history.pushState({}, "", "/dashboard/characters?gameId=game-b")
      await renderPage()

      expect(gameChip("다라게임")?.getAttribute("aria-pressed")).toBe("true")
    })

    it("shows an empty state linking to /dashboard/games when nothing is subscribed", async () => {
      db.userGames = []
      await renderPage()

      expect(container.textContent).toContain("구독 중인 게임이 없습니다.")
      expect(container.querySelector('a[href="/dashboard/games"]')).toBeTruthy()
    })

    it("opens the request modal on the character request kind", async () => {
      await renderPage()
      await click(requestButtonLabels(container).button)
      await flush()

      const select = document.body.querySelector("#request-kind") as HTMLSelectElement | null
      expect(select?.value).toBe("character")
    })
  })

  describe("roster tab", () => {
    const openSettings = async (name: string) => {
      await click(container.querySelector(`button[aria-label="${name} 설정"]`))
      return document.body.querySelector('[role="dialog"]') as HTMLElement
    }
    const badge = (card: Element | undefined) => card?.querySelector('[data-testid="breakthrough-badge"]')?.textContent
    const isFavoriteIcon = (card: Element | undefined) => card?.querySelector('[data-testid="character-icon"]')?.getAttribute("data-favorite")

    it("dims unowned characters with the unowned icon classes only", async () => {
      await renderPage()

      expect(isDimmed(cardByName("아케론"))).toBe(false)
      expect(isDimmed(cardByName("구캐릭터"))).toBe(false)
      expect(isDimmed(cardByName("칼리"))).toBe(true)
      expect(isDimmed(cardByName("라이덴"))).toBe(true)
      expect(cardByName("칼리").getAttribute("data-owned")).toBe("false")
    })

    it("renders a compact tile grid without any memo field", async () => {
      await renderPage()

      const list = container.querySelector('[data-testid="roster-list-owned"]') as HTMLElement
      expect(list.className).toContain("grid-cols-3")
      expect(list.className).toContain("lg:grid-cols-8")
      expect(container.querySelector("textarea")).toBeNull()
    })

    it("shows the n★ badge at the bottom-left of owned characters only", async () => {
      db.userCharacters[0].breakthrough_level = 2
      await renderPage()

      expect(badge(cardByName("아케론"))).toBe("2★")
      expect(badge(cardByName("구캐릭터"))).toBe("0★")
      expect(badge(cardByName("칼리"))).toBeUndefined()
      expect(cardByName("아케론").querySelector('[data-testid="breakthrough-badge"]')?.className).toContain("bottom-0 left-0")
    })

    it("shows owned favorites first with a gold ring, then owned and unowned characters by name", async () => {
      db.userCharacters.push({ character_id: "c4", game_id: "game-a", is_owned: true, is_favorite: true, favorite_sort_order: 1, breakthrough_level: 0, custom_icon_path: null })
      await renderPage()

      expect(cardNames()).toEqual(["라이덴", "구캐릭터", "아케론", "칼리"])
      expect(isFavoriteIcon(cardByName("라이덴"))).toBe("true")
      expect(isFavoriteIcon(cardByName("아케론"))).toBe("false")
      expect(cardByName("라이덴").querySelector('[data-testid="character-icon"]')?.className).toContain("ring-amber-400")
    })

    it("falls back to an initial avatar when no icon is available", async () => {
      db.characters["game-a"] = [{ ...character("c9", "초성캐릭", "5★"), default_icon_url: null }]
      await renderPage()

      expect(cardByName("초성캐릭").textContent).toContain("초")
      expect(cardByName("초성캐릭").querySelector("img")).toBeNull()
    })

    it("shows the custom icon before the default icon", async () => {
      db.userCharacters = [{ character_id: "c1", game_id: "game-a", is_owned: true, custom_icon_path: `${USER_ID}/characters/c1.webp` }]
      await renderPage()

      expect(getCustomCharacterIconUrl).toHaveBeenCalledWith(USER_ID, "c1")
      expect(cardByName("아케론").querySelector("img")?.getAttribute("src")).toBe("blob:custom")
      expect(cardByName("칼리").querySelector("img")?.getAttribute("src")).toBe("https://example.com/c2.png")
    })

    it("filters by rarity, groups removed schema values under 기타 and filters by axis", async () => {
      await renderPage()

      await click(chip("roster-rarity-filter", "5★"))
      expect(cardNames().sort()).toEqual(["라이덴", "아케론"])

      expect(chip("roster-rarity-filter", "기타")).toBeTruthy()
      await click(chip("roster-rarity-filter", "기타"))
      expect(cardNames()).toEqual(["구캐릭터"])

      await click(chip("roster-rarity-filter", "전체"))
      await click(chip("roster-axis-element", "화염"))
      expect(cardNames().sort()).toEqual(["라이덴", "칼리"])

      await click(chip("roster-axis-element", "기타"))
      expect(cardNames()).toEqual(["구캐릭터"])
    })

    it("hides the 기타 chip when every value is mapped", async () => {
      db.characters["game-a"] = [character("c1", "아케론", "5★", "얼음")]
      await renderPage()

      expect(chip("roster-rarity-filter", "기타")).toBeUndefined()
      expect(chip("roster-axis-element", "기타")).toBeUndefined()
    })

    it("filters by ownership and name search", async () => {
      await renderPage()

      await click(buttonByText("보유", container.querySelector('[data-testid="roster-filter-bar"]') as HTMLElement))
      expect(cardNames().sort()).toEqual(["구캐릭터", "아케론"])

      await click(buttonByText("미보유", container.querySelector('[data-testid="roster-filter-bar"]') as HTMLElement))
      expect(cardNames().sort()).toEqual(["라이덴", "칼리"])

      await change(container.querySelector('input[aria-label="캐릭터 이름 검색"]'), "칼리")
      expect(cardNames()).toEqual(["칼리"])
    })

    it("opens a settings dialog with a description when a tile is clicked", async () => {
      await renderPage()
      const dialog = await openSettings("아케론")

      expect(dialog.querySelector("h2")?.textContent).toBe("아케론")
      expect(dialog.getAttribute("aria-describedby")).toBeTruthy()
      expect(dialog.textContent).toContain("5★ · 속성: 얼음")
    })

    it("upserts ownership from the dialog with game_id and the conflict target, then updates counts", async () => {
      await renderPage()
      const dialog = await openSettings("칼리")

      await toggle(dialog.querySelector('input[role="switch"]'))

      const write = writes.find((item) => item.table === "user_characters")
      expect(write?.op).toBe("upsert")
      expect(write?.payload).toEqual({ user_id: USER_ID, game_id: "game-a", character_id: "c2", is_owned: true })
      expect(write?.options).toEqual({ onConflict: "user_id,character_id" })
      expect(cardByName("칼리").getAttribute("data-owned")).toBe("true")
      expect(isDimmed(cardByName("칼리"))).toBe(false)
      expect(container.textContent).toContain("보유 캐릭터 3 / 4명 · 프리셋 1개")
    })

    it("toggles favorite of an owned character without changing ownership", async () => {
      await renderPage()
      const dialog = await openSettings("아케론")

      await click(dialog.querySelector('button[aria-label="아케론 즐겨찾기"]'))

      expect(writes[0].payload).toEqual({ user_id: USER_ID, game_id: "game-a", character_id: "c1", is_owned: true, is_favorite: true })
      expect(cardByName("아케론").getAttribute("data-owned")).toBe("true")
      expect(isFavoriteIcon(cardByName("아케론"))).toBe("true")
      expect(cardNames()[0]).toBe("아케론")
    })

    it("offers breakthrough buttons 0★ to max_breakthrough for owned characters and saves the level", async () => {
      db.userGames[0].games = { ...(db.userGames[0].games as Row), max_breakthrough: 3 }
      await renderPage()
      const dialog = await openSettings("아케론")

      const labels = Array.from(dialog.querySelectorAll('section[aria-label="돌파 단계"] button')).map((b) => b.textContent)
      expect(labels).toEqual(["0★", "1★", "2★", "3★"])

      await click(dialog.querySelector('button[aria-label="돌파 2★"]'))

      expect(writes[0].payload).toEqual({ user_id: USER_ID, game_id: "game-a", character_id: "c1", is_owned: true, breakthrough_level: 2 })
      expect(badge(cardByName("아케론"))).toBe("2★")
    })

    it("defaults max_breakthrough to 6 when the game does not define it", async () => {
      await renderPage()
      const dialog = await openSettings("아케론")

      expect(dialog.querySelectorAll('section[aria-label="돌파 단계"] button')).toHaveLength(7)
    })

    it("does not offer breakthrough or icon controls for unowned characters", async () => {
      await renderPage()
      const dialog = await openSettings("칼리")

      expect(dialog.querySelector('section[aria-label="돌파 단계"]')).toBeNull()
      expect(dialog.querySelector('button[aria-label="칼리 아이콘 변경"]')).toBeNull()
    })

    it("does not write while offline", async () => {
      await renderPage()
      const dialog = await openSettings("칼리")
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })

      await toggle(dialog.querySelector('input[role="switch"]'))

      expect(writes.filter((item) => item.table === "user_characters")).toHaveLength(0)
      expect(container.textContent).toContain("오프라인 상태에서는 저장할 수 없습니다")
      expect(cardByName("칼리").getAttribute("data-owned")).toBe("false")
    })

    it("shows the write error and keeps the previous state when saving fails", async () => {
      await renderPage()
      const dialog = await openSettings("칼리")
      db.writeError = { message: "rls denied" }

      await toggle(dialog.querySelector('input[role="switch"]'))

      expect(container.textContent).toContain("rls denied")
      expect(cardByName("칼리").getAttribute("data-owned")).toBe("false")
    })

    it("uploads a custom icon to the character icon path for owned characters", async () => {
      await renderPage()
      const dialog = await openSettings("아케론")
      expect(dialog.querySelector('button[aria-label="아케론 기본 아이콘 복원"]')).toBeNull()

      const file = new File(["x"], "icon.png", { type: "image/png" })
      const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
      await act(async () => {
        Simulate.change(input, { target: { files: [file] } as unknown as EventTarget })
      })
      await flush()

      expect(resizeImageToWebP).toHaveBeenCalledWith(file)
      expect(uploadCustomCharacterIcon).toHaveBeenCalledWith(USER_ID, "c1", expect.any(Blob))
      const write = writes.find((item) => item.table === "user_characters")
      expect(write?.payload).toEqual({
        user_id: USER_ID,
        game_id: "game-a",
        character_id: "c1",
        is_owned: true,
        custom_icon_path: `${USER_ID}/characters/c1.webp`,
      })
      expect(cardByName("아케론").querySelector("img")?.getAttribute("src")).toBe("blob:custom")
      expect(dialog.querySelector('button[aria-label="아케론 기본 아이콘 복원"]')).toBeTruthy()
    })

    it("restores the default icon by clearing the path and deleting the object", async () => {
      db.userCharacters = [{ character_id: "c1", game_id: "game-a", is_owned: true, custom_icon_path: `${USER_ID}/characters/c1.webp` }]
      await renderPage()
      const dialog = await openSettings("아케론")

      await click(dialog.querySelector('button[aria-label="아케론 기본 아이콘 복원"]'))

      expect(writes.find((item) => item.table === "user_characters")?.payload).toMatchObject({ character_id: "c1", custom_icon_path: null })
      expect(deleteCustomCharacterIcon).toHaveBeenCalledWith(USER_ID, "c1")
      expect(cardByName("아케론").querySelector("img")?.getAttribute("src")).toBe("https://example.com/c1.png")
      expect(dialog.querySelector('button[aria-label="아케론 기본 아이콘 복원"]')).toBeNull()
    })
  })

  describe("preset tab", () => {
    async function openPresets() {
      await renderPage()
      await selectTab("조합 프리셋")
    }

    const presetCards = () => Array.from(container.querySelectorAll('[data-testid="preset-card"]'))
    const slots = (card: Element) => Array.from(card.querySelectorAll('[data-testid="preset-slot"]'))

    it("renders title, slot grid sized to the game limit, memo and dims unowned slots without badges", async () => {
      await openPresets()

      const card = presetCards()[0]
      expect(card.textContent).toContain("혼돈 파티")
      expect(card.querySelectorAll('[data-testid="preset-slot"], [data-testid="preset-slot-empty"]')).toHaveLength(3)
      expect(slots(card)).toHaveLength(2)
      expect(isDimmed(slots(card)[0])).toBe(false)
      expect(isDimmed(slots(card)[1])).toBe(true)
      expect(card.textContent).not.toContain("미보유")
      expect(card.textContent).not.toContain("2돌")
      const memo = Array.from(card.querySelectorAll("p")).find((p) => p.textContent === "첫째 줄\n둘째 줄")
      expect(memo?.className).toContain("whitespace-pre-wrap")
    })

    it("grows the slot grid for presets above the reduced slot limit and warns", async () => {
      db.presets[0].character_ids = ["c1", "c2", "c3", "c4"]
      await openPresets()

      const card = presetCards()[0]
      expect(card.querySelectorAll('[data-testid="preset-slot"], [data-testid="preset-slot-empty"]')).toHaveLength(4)
      expect(card.textContent).toContain("슬롯 상한(3칸)을 초과한 프리셋")
    })

    it("creates a preset without duplicates and stops at the slot limit", async () => {
      await openPresets()
      await click(buttonByText("새 프리셋 추가", container))

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      expect(dialog.querySelector("h2")?.textContent).toBe("새 프리셋 추가")
      expect(dialog.getAttribute("aria-describedby")).toBeTruthy()
      // R61: the title input carries no example placeholder.
      expect((dialog.querySelector("#preset-title") as HTMLInputElement).hasAttribute("placeholder")).toBe(false)

      await change(dialog.querySelector("#preset-title"), "  신규 파티  ")
      const picker = () => dialog.querySelector('[data-testid="preset-picker-list"]') as HTMLElement
      const pick = (name: string) => pickerButton(name, picker())

      await click(pick("아케론"))
      await click(pick("칼리"))
      await click(pick("라이덴"))
      expect(pick("구캐릭터").disabled).toBe(true)
      expect(pick("아케론").getAttribute("aria-pressed")).toBe("true")

      // Clicking a selected character removes it instead of adding a duplicate.
      await click(pick("칼리"))
      await click(pick("칼리"))
      expect(dialog.querySelectorAll('[data-testid="preset-editor-slots"] > li')).toHaveLength(3)

      await click(buttonByText("저장", dialog))

      const insert = writes.find((item) => item.table === "user_character_presets" && item.op === "insert")
      expect(insert?.payload).toEqual({
        user_id: USER_ID,
        game_id: "game-a",
        title: "신규 파티",
        memo: null,
        character_ids: ["c1", "c4", "c2"],
        sort_order: 1,
      })
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(presetCards()).toHaveLength(2)
      expect(container.textContent).toContain("프리셋 2개")
    })

    it("reorders and removes slots in the editor and saves with update", async () => {
      await openPresets()
      await click(container.querySelector('button[aria-label="혼돈 파티 수정"]'))

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      expect((dialog.querySelector("#preset-title") as HTMLInputElement).value).toBe("혼돈 파티")
      await click(dialog.querySelector('button[aria-label="아케론 아래로 이동"]'))
      await click(buttonByText("저장", dialog))

      const update = writes.find((item) => item.table === "user_character_presets" && item.op === "update")
      expect(update?.payload).toEqual({ title: "혼돈 파티", memo: "첫째 줄\n둘째 줄", character_ids: ["c2", "c1"] })
      expect(update?.filters).toEqual({ id: "p1", user_id: USER_ID })
    })

    it("validates the title before saving", async () => {
      await openPresets()
      await click(buttonByText("새 프리셋 추가", container))
      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      await click(pickerButton("아케론", dialog.querySelector('[data-testid="preset-picker-list"]') as HTMLElement))
      await click(buttonByText("저장", dialog))

      expect(dialog.textContent).toContain("프리셋 제목은 1~80자")
      expect(writes.filter((item) => item.table === "user_character_presets")).toHaveLength(0)
    })

    it("lets an over-limit preset shrink but blocks adding characters until below the limit", async () => {
      db.presets[0].character_ids = ["c1", "c2", "c3", "c4"]
      await openPresets()
      await click(container.querySelector('button[aria-label="혼돈 파티 수정"]'))

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      expect(dialog.textContent).toContain("인원을 상한 이하로 줄이기 전에는 캐릭터를 추가할 수 없습니다")
      const picker = dialog.querySelector('[data-testid="preset-picker-list"]') as HTMLElement
      Array.from(picker.querySelectorAll("button")).forEach((button) => {
        expect(button.disabled).toBe(button.getAttribute("aria-pressed") !== "true")
      })

      await click(dialog.querySelector('button[aria-label="라이덴 제거"]'))
      await click(buttonByText("저장", dialog))

      const update = writes.find((item) => item.table === "user_character_presets" && item.op === "update")
      expect(update?.payload).toMatchObject({ character_ids: ["c1", "c2", "c3"] })
    })

    it("deletes a preset after confirmation and refreshes the list", async () => {
      await openPresets()
      await click(container.querySelector('button[aria-label="혼돈 파티 삭제"]'))

      const del = writes.find((item) => item.table === "user_character_presets" && item.op === "delete")
      expect(del?.filters).toEqual({ id: "p1", user_id: USER_ID })
      expect(presetCards()).toHaveLength(0)
      expect(container.textContent).toContain("저장된 프리셋이 없습니다.")
    })

    it("does not delete when the confirmation is cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false)
      await openPresets()
      await click(container.querySelector('button[aria-label="혼돈 파티 삭제"]'))

      expect(writes).toHaveLength(0)
      expect(presetCards()).toHaveLength(1)
    })
  })

  describe("preset tab viewport split", () => {
    const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia")

    function setViewport(width: number) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: query === "(min-width: 900px)" && width >= 900,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      })
    }

    afterEach(() => {
      if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia)
      else delete (window as { matchMedia?: unknown }).matchMedia
    })

    async function openPresets() {
      await renderPage()
      await selectTab("조합 프리셋")
    }

    const workspace = () => container.querySelector('[data-testid="preset-workspace"]')
    const avatarButton = (name: string) =>
      Array.from(container.querySelectorAll('[data-testid="workspace-avatar-list"] button')).find((b) => b.querySelector("span.truncate")?.textContent === name) as HTMLButtonElement
    const slotNames = () =>
      Array.from(container.querySelectorAll('[data-testid="workspace-slot"], [data-testid="workspace-slot-empty"]')).map((el) => el.querySelector("span.truncate")?.textContent ?? "(빈)")

    it("keeps the dialog flow below 900px", async () => {
      setViewport(899)
      await openPresets()

      expect(workspace()).toBeNull()
      expect(presetCardCount()).toBe(1)
      await click(buttonByText("새 프리셋 추가", container))
      expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    })

    it("shows the workspace instead of the list and dialog from 900px", async () => {
      setViewport(900)
      await openPresets()

      expect(workspace()).toBeTruthy()
      expect(presetCardCount()).toBe(0)
      expect((container.querySelector("#workspace-title") as HTMLInputElement).value).toBe("혼돈 파티")
      expect(slotNames()).toEqual(["아케론", "칼리", "(빈)"])

      await click(buttonByText("새 프리셋 추가", container))
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    })

    it("saves workspace edits with the existing update path", async () => {
      setViewport(1280)
      await openPresets()
      await click(avatarButton("라이덴"))
      await click(buttonByText("저장", container))

      const update = writes.find((item) => item.table === "user_character_presets" && item.op === "update")
      expect(update?.payload).toEqual({ title: "혼돈 파티", memo: "첫째 줄\n둘째 줄", character_ids: ["c1", "c2", "c4"] })
      expect(update?.filters).toEqual({ id: "p1", user_id: USER_ID })
      expect(container.textContent).toContain("프리셋을 저장했습니다.")
      expect((buttonByText("저장", container) as HTMLButtonElement).disabled).toBe(true)
    })

    it("inserts a new preset only on save and selects it afterwards", async () => {
      setViewport(1280)
      await openPresets()
      await click(buttonByText("새 프리셋 추가", container))
      expect(writes.filter((item) => item.table === "user_character_presets")).toHaveLength(0)

      await change(container.querySelector("#workspace-title"), "  신규 파티  ")
      await click(avatarButton("라이덴"))
      await click(buttonByText("저장", container))

      const insert = writes.find((item) => item.table === "user_character_presets" && item.op === "insert")
      expect(insert?.payload).toEqual({
        user_id: USER_ID,
        game_id: "game-a",
        title: "신규 파티",
        memo: null,
        character_ids: ["c4"],
        sort_order: 1,
      })
      const selected = container.querySelector('[data-testid="workspace-preset-list"] button[aria-pressed="true"]')
      expect(selected?.textContent).toBe("신규 파티")
    })

    it("warns before switching games or leaving the tab with unsaved changes", async () => {
      setViewport(1280)
      await openPresets()
      await click(avatarButton("라이덴"))

      vi.spyOn(window, "confirm").mockReturnValue(false)
      await click(gameChip("다라게임"))
      expect(window.confirm).toHaveBeenCalledTimes(1)
      expect(container.querySelector('nav[aria-label="구독 게임 선택"] button[aria-pressed="true"]')?.textContent).toContain("가나게임")

      await selectTab("보유 캐릭터")
      expect(window.confirm).toHaveBeenCalledTimes(2)
      expect(workspace()).toBeTruthy()

      vi.spyOn(window, "confirm").mockReturnValue(true)
      await click(gameChip("다라게임"))
      expect(container.querySelector('nav[aria-label="구독 게임 선택"] button[aria-pressed="true"]')?.textContent).toContain("다라게임")
    })

    it("does not warn after saving or when nothing changed", async () => {
      setViewport(1280)
      await openPresets()
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
      await click(gameChip("다라게임"))
      expect(confirmSpy).not.toHaveBeenCalled()
    })
  })

  describe("favorite sections (R63)", () => {
    const openSettings = async (name: string) => {
      await click(container.querySelector(`button[aria-label="${name} 설정"]`))
      return document.body.querySelector('[role="dialog"]') as HTMLElement
    }
    const isFavoriteIcon = (card: Element | undefined) => card?.querySelector('[data-testid="character-icon"]')?.getAttribute("data-favorite")
    const sectionEl = (key: string) => container.querySelector(`[data-testid="roster-section-${key}"]`)
    const sectionNames = (key: string) =>
      Array.from(sectionEl(key)?.querySelectorAll('[data-testid="character-card"]') ?? []).map((card) => card.querySelector("span.truncate")?.textContent)
    const favRow = (id: string, order: number | null, owned = true) => ({
      character_id: id,
      game_id: "game-a",
      is_owned: owned,
      is_favorite: true,
      favorite_sort_order: order,
      breakthrough_level: 0,
      custom_icon_path: null,
    })
    const orderRpcCalls = () => rpcCalls.filter((call) => call.fn === "reorder_favorite_characters")

    it("splits the roster into favorites (saved order), owned and unowned with counts and hides empty sections", async () => {
      db.userCharacters = [favRow("c3", 1), favRow("c1", 2), favRow("c2", 1, false)]
      await renderPage()

      expect(sectionNames("favorites")).toEqual(["구캐릭터", "아케론"])
      expect(sectionEl("owned")).toBeNull()
      // A stale unowned favorite (unmigrated data) is listed as unowned and not highlighted.
      expect(sectionNames("unowned")).toEqual(["라이덴", "칼리"])
      expect(isFavoriteIcon(cardByName("칼리"))).toBe("false")
      expect(isFavoriteIcon(cardByName("구캐릭터"))).toBe("true")
      expect(sectionEl("favorites")?.querySelector("h3")?.textContent).toContain("즐겨찾기 (2)")
      expect(sectionEl("unowned")?.querySelector("h3")?.textContent).toContain("미보유 (2)")
    })

    it("applies the existing filters inside the sections", async () => {
      db.userCharacters = [favRow("c3", 1), favRow("c1", 2)]
      await renderPage()
      await click(buttonByText("미보유", container.querySelector('[data-testid="roster-filter-bar"]') as HTMLElement))

      expect(sectionEl("favorites")).toBeNull()
      expect(sectionNames("unowned")).toEqual(["라이덴", "칼리"])
    })

    it("does not allow favoriting an unowned character", async () => {
      await renderPage()
      const dialog = await openSettings("칼리")
      const button = dialog.querySelector('button[aria-label="칼리 즐겨찾기"]') as HTMLButtonElement

      expect(button.disabled).toBe(true)
      await click(button)
      expect(writes).toHaveLength(0)
    })

    it("adds a new favorite at the end of the favorite section", async () => {
      db.userCharacters = [favRow("c1", 1), { character_id: "c3", game_id: "game-a", is_owned: true, is_favorite: false, favorite_sort_order: null, breakthrough_level: 0, custom_icon_path: null }]
      await renderPage()
      expect(sectionNames("favorites")).toEqual(["아케론"])

      const dialog = await openSettings("구캐릭터")
      await click(dialog.querySelector('button[aria-label="구캐릭터 즐겨찾기"]'))

      expect(writes[0].payload).toEqual({ user_id: USER_ID, game_id: "game-a", character_id: "c3", is_owned: true, is_favorite: true })
      expect(sectionNames("favorites")).toEqual(["아케론", "구캐릭터"])
      expect(sectionEl("owned")).toBeNull()
    })

    it("clears the favorite and its place immediately when ownership is removed", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2)]
      await renderPage()
      const dialog = await openSettings("아케론")
      await toggle(dialog.querySelector('input[aria-label="아케론 보유"]'))

      expect(writes[0].payload).toEqual({ user_id: USER_ID, game_id: "game-a", character_id: "c1", is_owned: false, is_favorite: false })
      expect(sectionNames("favorites")).toEqual(["구캐릭터"])
      expect(sectionNames("unowned")).toContain("아케론")
    })

    it("moves a favorite with the buttons and saves the whole order with one RPC call", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2)]
      await renderPage()
      expect((container.querySelector('button[aria-label="아케론 앞으로 이동"]') as HTMLButtonElement).disabled).toBe(true)
      expect((container.querySelector('button[aria-label="구캐릭터 뒤로 이동"]') as HTMLButtonElement).disabled).toBe(true)

      await click(container.querySelector('button[aria-label="아케론 뒤로 이동"]'))

      expect(orderRpcCalls()).toEqual([{ fn: "reorder_favorite_characters", args: { p_game_id: "game-a", p_character_ids: ["c3", "c1"] } }])
      expect(sectionNames("favorites")).toEqual(["구캐릭터", "아케론"])
    })

    it("reorders favorites by dragging one card onto another", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2), favRow("c4", 3)]
      await renderPage()
      const cardsIn = () => Array.from(sectionEl("favorites")?.querySelectorAll('[data-testid="character-card"]') ?? [])
      expect(sectionNames("favorites")).toEqual(["아케론", "구캐릭터", "라이덴"])

      const [first, , third] = cardsIn()
      // Firefox cannot start a drag on a <button>: the card itself is not draggable, a non-button handle is.
      const handle = first.querySelector('[data-testid="favorite-drag-handle"]') as HTMLElement
      expect(first.getAttribute("draggable")).toBeNull()
      expect(handle.tagName).not.toBe("BUTTON")
      expect(handle.getAttribute("draggable")).toBe("true")
      expect(handle.getAttribute("aria-hidden")).toBe("true")
      expect(sectionEl("owned")?.querySelector('[data-testid="favorite-drag-handle"]') ?? null).toBeNull()
      await act(async () => {
        Simulate.dragStart(handle, { dataTransfer: { setData: vi.fn() } } as never)
        Simulate.dragOver(third, { dataTransfer: { setData: vi.fn() } } as never)
        Simulate.drop(third, { dataTransfer: { setData: vi.fn() } } as never)
      })
      await flush()

      expect(orderRpcCalls()[0]?.args).toEqual({ p_game_id: "game-a", p_character_ids: ["c3", "c4", "c1"] })
      expect(sectionNames("favorites")).toEqual(["구캐릭터", "라이덴", "아케론"])
    })

    it("reorders against the full favorite order while a filter hides some favorites", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2), favRow("c4", 3)]
      await renderPage()
      await change(container.querySelector('input[aria-label="캐릭터 이름 검색"]'), "라이덴")
      expect(sectionNames("favorites")).toEqual(["라이덴"])
      await change(container.querySelector('input[aria-label="캐릭터 이름 검색"]'), "")
      await click(container.querySelector('button[aria-label="라이덴 앞으로 이동"]'))

      expect(orderRpcCalls()[0]?.args).toEqual({ p_game_id: "game-a", p_character_ids: ["c1", "c4", "c3"] })
    })

    it("rolls back to the previous order and shows the error when saving the order fails", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2)]
      db.rpcError = { code: "P0001", message: "boom" }
      await renderPage()
      await click(container.querySelector('button[aria-label="아케론 뒤로 이동"]'))

      expect(sectionNames("favorites")).toEqual(["아케론", "구캐릭터"])
      expect(container.textContent).toContain("즐겨찾기 순서를 저장하지 못했습니다: boom")
      expect(container.querySelector('button[aria-label="아케론 뒤로 이동"]')).toBeTruthy()
    })

    it("hides the ordering controls and explains when the reorder RPC is not migrated", async () => {
      db.userCharacters = [favRow("c1", 1), favRow("c3", 2)]
      db.rpcError = { code: "PGRST202", message: "function not found" }
      await renderPage()
      await click(container.querySelector('button[aria-label="아케론 뒤로 이동"]'))

      expect(sectionNames("favorites")).toEqual(["아케론", "구캐릭터"])
      expect(container.textContent).toContain("MIGRATION_USER_CHARACTER_FAVORITE_ORDER.sql")
      expect(container.querySelector('button[aria-label="아케론 뒤로 이동"]')).toBeNull()
    })

    it("falls back to the query without favorite_sort_order and disables ordering when the column is missing", async () => {
      db.favoriteColumnMissing = true
      db.userCharacters = [
        { character_id: "c3", game_id: "game-a", is_owned: true, is_favorite: true, breakthrough_level: 0, custom_icon_path: null },
        { character_id: "c1", game_id: "game-a", is_owned: true, is_favorite: true, breakthrough_level: 0, custom_icon_path: null },
      ]
      await renderPage()

      expect(container.textContent).not.toContain("R13 마이그레이션")
      expect(sectionNames("favorites")).toEqual(["구캐릭터", "아케론"])
      expect(container.textContent).toContain("즐겨찾기 순서 저장 기능이 아직 적용되지 않아")
      expect(container.querySelector('button[aria-label$="뒤로 이동"]')).toBeNull()
    })

    it("lists the preset picker in the same three sections (dialog below 900px)", async () => {
      db.userCharacters = [
        favRow("c3", 1),
        { character_id: "c1", game_id: "game-a", is_owned: true, is_favorite: false, favorite_sort_order: null, breakthrough_level: 0, custom_icon_path: null },
        favRow("c2", 1, false),
      ]
      await renderPage()
      await selectTab("조합 프리셋")
      await click(buttonByText("새 프리셋 추가", container))

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      const names = (key: string) =>
        Array.from(dialog.querySelectorAll(`[data-testid="preset-picker-${key}"] button`)).map((b) => b.querySelector("span.truncate")?.textContent)
      expect(names("favorites")).toEqual(["구캐릭터"])
      expect(names("owned")).toEqual(["아케론"])
      expect(names("unowned")).toEqual(["라이덴", "칼리"])
      expect(dialog.querySelector('[data-testid="preset-picker-favorites"] h4')?.textContent).toBe("즐겨찾기 (1)")
      // The picker has no ordering controls.
      expect(dialog.querySelector('button[aria-label$="뒤로 이동"]')).toBeNull()
    })
  })

  describe("classification option icons (R64)", () => {
    const FIRE = "data:image/webp;base64,FIRE"
    const iconsIn = (scope: ParentNode | null | undefined) =>
      Array.from(scope?.querySelectorAll('[data-testid="classification-option-icon"]') ?? []) as HTMLImageElement[]
    const openSettings = async (name: string) => {
      await click(container.querySelector(`button[aria-label="${name} 설정"]`))
      return document.body.querySelector('[role="dialog"]') as HTMLElement
    }
    const seedFireIcon = () => {
      db.icons = [{ game_id: "game-a", axis_key: "element", option_value: "화염", icon_data_url: FIRE }]
    }

    it("shows the option icon before the option text in the axis filter chips only", async () => {
      seedFireIcon()
      await renderPage()

      const fire = chip("roster-axis-element", "화염") as HTMLElement
      const fireIcons = iconsIn(fire)
      expect(fireIcons).toHaveLength(1)
      expect(fireIcons[0].getAttribute("src")).toBe(FIRE)
      expect(fireIcons[0].getAttribute("aria-hidden")).toBe("true")
      expect(fireIcons[0].getAttribute("alt")).toBe("")
      expect(fire.textContent).toBe("화염")
      expect(fire.firstElementChild?.firstElementChild).toBe(fireIcons[0])
      expect(iconsIn(chip("roster-axis-element", "얼음"))).toHaveLength(0)
      expect(iconsIn(chip("roster-axis-element", "전체"))).toHaveLength(0)
      expect(iconsIn(container.querySelector('[data-testid="roster-rarity-filter"]'))).toHaveLength(0)
    })

    it("keeps the chip filtering behaviour unchanged when an icon is shown", async () => {
      seedFireIcon()
      await renderPage()
      await click(chip("roster-axis-element", "화염"))

      expect(cardNames()).toEqual(["라이덴", "칼리"])
    })

    it("shows the icon before the axis value in the character settings dialog and leaves rarity as text", async () => {
      seedFireIcon()
      await renderPage()

      const fireDialog = await openSettings("칼리")
      const description = fireDialog.querySelector("p") as HTMLElement
      expect(iconsIn(description)).toHaveLength(1)
      expect(iconsIn(description)[0].getAttribute("src")).toBe(FIRE)
      expect(description.textContent).toBe("4★ · 속성: 화염")
    })

    it("renders the dialog description text-only for an option without an icon", async () => {
      seedFireIcon()
      await renderPage()

      const dialog = await openSettings("아케론")
      expect(iconsIn(dialog)).toHaveLength(0)
      expect(dialog.textContent).toContain("5★ · 속성: 얼음")
    })

    it("does not show icons in the preset picker", async () => {
      seedFireIcon()
      await renderPage()
      await selectTab("조합 프리셋")
      await click(buttonByText("새 프리셋 추가", container))

      const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
      expect(dialog).toBeTruthy()
      expect(iconsIn(dialog)).toHaveLength(0)
    })

    it("renders exactly as before and shows no error when the icon table is not migrated", async () => {
      seedFireIcon()
      db.iconError = { code: "42P01", message: 'relation "game_classification_icons" does not exist' }
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
      await renderPage()

      expect(iconsIn(container)).toHaveLength(0)
      expect(chip("roster-axis-element", "화염")?.textContent).toBe("화염")
      expect(cardNames().length).toBeGreaterThan(0)
      expect(container.textContent).not.toContain("game_classification_icons")
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it("treats PGRST205 as an unmigrated table and any other read error as no icons (logged)", async () => {
      seedFireIcon()
      db.iconError = { code: "PGRST205", message: "not in schema cache" }
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
      await renderPage()
      expect(iconsIn(container)).toHaveLength(0)
      expect(errorSpy).not.toHaveBeenCalled()

      await act(async () => root.unmount())
      container.remove()
      container = document.createElement("div")
      document.body.append(container)
      root = createRoot(container)
      db.iconError = { code: "XX000", message: "boom" }
      await renderPage()

      expect(iconsIn(container)).toHaveLength(0)
      expect(cardNames().length).toBeGreaterThan(0)
      expect(errorSpy).toHaveBeenCalled()
    })

    it("loads the icons once per selected game", async () => {
      seedFireIcon()
      await renderPage()
      expect(iconQueries).toEqual(["game-a"])

      await click(gameChip("다라게임"))
      expect(iconQueries).toEqual(["game-a", "game-b"])
    })
  })
})
