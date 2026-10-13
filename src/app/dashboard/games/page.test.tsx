import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import GamesPage from "./page"

const { from, useAuth, downloadUserIcon, deleteUserIcon } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  downloadUserIcon: vi.fn(),
  deleteUserIcon: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/storage-upload", () => ({
  downloadUserIcon,
  deleteUserIcon,
  uploadUserIcon: vi.fn(),
}))

const mockUserGames = [
  {
    id: "user-game-1",
    game_id: "game-1",
    custom_icon_path: null,
    games: { id: "game-1", name: "원신", default_icon_url: "https://example.com/icon1.png" },
  },
  {
    id: "user-game-2",
    game_id: "game-2",
    custom_icon_path: null,
    games: { id: "game-2", name: "붕괴: 스타레일", default_icon_url: null },
  },
]

const mockSchedules = [
  {
    id: "sch-1",
    game_id: "game-1",
    title: "5.1 버전 업데이트",
    schedule_type: "VERSION",
    start_date: "2026-10-09",
    end_date: "2026-11-20",
    memo: "공식 5.1 패치",
  },
]

function createQuery(table: string) {
  const getResult = () => {
    if (table === "user_games") return { data: mockUserGames, error: null }
    if (table === "game_schedules") return { data: mockSchedules, error: null }
    if (table === "games") return { data: [{ id: "game-1", name: "원신" }], error: null }
    return { data: [], error: null }
  }

  type MockQuery = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    then: ReturnType<typeof vi.fn>
  }
  const query: Partial<MockQuery> = {}
  const select = vi.fn().mockReturnValue(query)
  const eq = vi.fn().mockReturnValue(query)
  const gte = vi.fn().mockReturnValue(query)
  const order = vi.fn().mockReturnValue(query)
  const del = vi.fn().mockReturnValue(query)
  const insert = vi.fn()
  const then = vi.fn((resolve: (val: unknown) => unknown) => Promise.resolve(getResult()).then(resolve))
  Object.assign(query, { select, eq, gte, order, delete: del, insert, then })
  return query as MockQuery
}

describe("GamesPage", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    useAuth.mockReturnValue({ user: { id: "test-user-id" } })
    downloadUserIcon.mockResolvedValue(null)
    deleteUserIcon.mockResolvedValue(undefined)
    from.mockImplementation((table: string) => createQuery(table))
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it("renders page header and action buttons (+ 구독 추가, + 추가 요청)", async () => {
    await act(async () => root.render(<GamesPage />))
    expect(container.textContent).toContain("게임")
    expect(container.textContent).toContain("내가 구독 중인 게임을 관리하고")

    const subscribeButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("구독 추가")
    )
    expect(subscribeButtons.length).toBe(1)

    const requestButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("+ 추가 요청")
    )
    expect(requestButtons.length).toBe(1)
  })

  it("hides game request button for admin users", async () => {
    useAuth.mockReturnValue({ user: { id: "admin-id" }, role: "admin" })
    await act(async () => root.render(<GamesPage />))

    expect(container.textContent).toContain("내가 구독 중인 게임을 관리합니다.")
    const requestButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("+ 추가 요청")
    )
    expect(requestButtons.length).toBe(0)

    const subscribeButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("구독 추가")
    )
    expect(subscribeButtons.length).toBe(1)
  })

  it("renders subscribed games list and cards", async () => {
    await act(async () => root.render(<GamesPage />))
    expect(container.textContent).toContain("원신")
    expect(container.textContent).toContain("붕괴: 스타레일")
    expect(container.textContent).toContain("2개 구독 중")
  })

  it("handles game unsubscription when confirm is accepted", async () => {
    const deleteQuery = createQuery("user_games")
    from.mockImplementation((table: string) => {
      if (table === "user_games") {
        deleteQuery.delete.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })
        return deleteQuery
      }
      return createQuery(table)
    })

    await act(async () => root.render(<GamesPage />))
    const unsubscribeBtn = container.querySelector('button[title="구독 해제"]')
    expect(unsubscribeBtn).not.toBeNull()

    await act(async () => {
      Simulate.click(unsubscribeBtn!)
      await Promise.resolve()
    })

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteQuery.delete).toHaveBeenCalled()
  })

  it("opens official schedule sheet when clicking schedule button", async () => {
    await act(async () => root.render(<GamesPage />))
    const scheduleBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("일정 보기")
    )
    expect(scheduleBtn).toBeDefined()

    await act(async () => {
      Simulate.click(scheduleBtn!)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain("공식 일정")
  })

  it("sorts subscribed games in Korean alphabetical order (붕괴: 스타레일 before 원신)", async () => {
    await act(async () => root.render(<GamesPage />))
    const headings = Array.from(container.querySelectorAll("h3")).map((h) => h.textContent)
    expect(headings).toEqual(["붕괴: 스타레일", "원신"])
  })

  it("paginates games with 12 items per page and renders pagination bar", async () => {
    const manyGames = Array.from({ length: 15 }, (_, i) => ({
      id: `user-game-${i + 1}`,
      game_id: `game-${i + 1}`,
      custom_icon_path: null,
      games: {
        id: `game-${i + 1}`,
        name: `게임 ${String(i + 1).padStart(2, "0")}`,
        default_icon_url: null,
      },
    }))

    from.mockImplementation((table: string) => {
      if (table === "user_games") {
        const query = createQuery("user_games")
        const then = vi.fn((resolve: (val: unknown) => unknown) =>
          Promise.resolve({ data: manyGames, error: null }).then(resolve)
        )
        query.then = then
        return query
      }
      return createQuery(table)
    })

    await act(async () => root.render(<GamesPage />))

    const paginationInfo = container.querySelector('[data-testid="pagination-info"]')
    expect(paginationInfo?.textContent).toContain("총 15개 중 1 - 12개 표시 (페이지 1 / 2)")

    // 1페이지에는 12개 카드만 렌더링되어야 함
    const headingsPage1 = Array.from(container.querySelectorAll("h3"))
    expect(headingsPage1.length).toBe(12)

    // 2페이지 버튼 클릭
    const page2Btn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "2 페이지로 이동"
    )
    expect(page2Btn).toBeDefined()

    await act(async () => {
      Simulate.click(page2Btn!)
      await Promise.resolve()
    })

    expect(paginationInfo?.textContent).toContain("총 15개 중 13 - 15개 표시 (페이지 2 / 2)")
    const headingsPage2 = Array.from(container.querySelectorAll("h3"))
    expect(headingsPage2.length).toBe(3)
  })
})

