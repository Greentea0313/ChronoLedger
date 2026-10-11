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
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockImplementation(() => {
    if (table === "user_games") return Promise.resolve({ data: mockUserGames, error: null })
    if (table === "game_schedules") return Promise.resolve({ data: mockSchedules, error: null })
    if (table === "games") return Promise.resolve({ data: [{ id: "game-1", name: "원신" }], error: null })
    return Promise.resolve({ data: [], error: null })
  })
  query.delete.mockReturnValue(query)
  return query
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
      (b) => b.textContent?.includes("+ 구독 추가")
    )
    expect(subscribeButtons.length).toBeGreaterThanOrEqual(1)

    const requestButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.includes("+ 추가 요청")
    )
    expect(requestButtons.length).toBeGreaterThanOrEqual(1)
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
})

