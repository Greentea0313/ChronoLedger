import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import GamesPage from "./page"

const { from, useAuth, downloadUserIcon, deleteUserIcon, loadSchedulePreference } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  downloadUserIcon: vi.fn(),
  deleteUserIcon: vi.fn(),
  loadSchedulePreference: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/storage-upload", () => ({
  downloadUserIcon,
  deleteUserIcon,
  uploadUserIcon: vi.fn(),
}))
vi.mock("@/lib/schedule-preferences", () => ({ loadSchedulePreference }))

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
    loadSchedulePreference.mockResolvedValue({ showUnofficialSchedules: false, isAvailable: true })
    from.mockImplementation((table: string) => createQuery(table))
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove())
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

  it("opens the schedule sheet when clicking schedule button", async () => {
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

    expect(document.body.textContent).toContain("붕괴: 스타레일 일정")
  })

  it("includes unofficial schedules and labels them when the user preference is enabled", async () => {
    loadSchedulePreference.mockResolvedValueOnce({ showUnofficialSchedules: true, isAvailable: true })
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "game_schedules") {
        q.then = vi.fn((resolve: (val: unknown) => unknown) =>
          Promise.resolve({
            data: [
              { ...mockSchedules[0], is_official: true },
              { ...mockSchedules[0], id: "sch-unofficial", title: "테스트 서버 일정", is_official: false },
            ],
            error: null,
          }).then(resolve)
        )
      }
      return q
    })

    await act(async () => {
      root.render(<GamesPage />)
      await Promise.resolve()
      await Promise.resolve()
    })
    const scheduleBtn = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("일정 보기")
    )
    expect(scheduleBtn).toBeDefined()

    await act(async () => {
      Simulate.click(scheduleBtn!)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain("테스트 서버 일정")
    expect(document.body.textContent).toContain("[비공식]")
  })

  it("renders schedule title and memo with slash separated into block elements for line breaks", async () => {
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "game_schedules") {
        q.then = vi.fn((resolve: (val: unknown) => unknown) =>
          Promise.resolve({
            data: [
              {
                id: "sch-slash",
                game_id: "game-1",
                title: "전반 픽업 캐릭터 / 후반 픽업 캐릭터",
                schedule_type: "PICKUP",
                start_date: "2026-10-09",
                end_date: "2026-10-29",
                memo: "전반 메모 / 후반 메모",
              },
            ],
            error: null,
          }).then(resolve)
        )
      }
      return q
    })

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

    const blockSpans = Array.from(
      document.body.querySelectorAll("span.block")
    ).map((el) => el.textContent)

    expect(blockSpans).toContain("전반 픽업 캐릭터")
    expect(blockSpans).toContain("후반 픽업 캐릭터")
    expect(blockSpans).toContain("전반 메모")
    expect(blockSpans).toContain("후반 메모")
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

  describe("게임별 상시 메모", () => {
    const gamesWithMemo = [
      { ...mockUserGames[0], memo: "40연차 모으는 중" },
      { ...mockUserGames[1], memo: null },
    ]

    function mockUserGamesWithUpdate(updateResult: { error: unknown } = { error: null }) {
      const secondEq = vi.fn().mockResolvedValue(updateResult)
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
      const update = vi.fn().mockReturnValue({ eq: firstEq })
      from.mockImplementation((table: string) => {
        if (table === "user_games") {
          const query = createQuery("user_games") as ReturnType<typeof createQuery> & { update?: typeof update }
          query.then = vi.fn((resolve: (val: unknown) => unknown) =>
            Promise.resolve({ data: gamesWithMemo, error: null }).then(resolve)
          )
          query.update = update
          return query
        }
        return createQuery(table)
      })
      return { update, firstEq, secondEq }
    }

    const buttonsByText = (text: string) =>
      Array.from(document.body.querySelectorAll("button")).filter((b) => b.textContent?.trim() === text)

    async function click(el: Element) {
      await act(async () => {
        Simulate.click(el)
        await Promise.resolve()
      })
    }

    async function typeMemo(gameName: string, value: string) {
      const textarea = (document.body.querySelector(`textarea[aria-label="${gameName} 메모 입력"]`) || container.querySelector(`textarea[aria-label="${gameName} 메모 입력"]`)) as HTMLTextAreaElement
      expect(textarea).not.toBeNull()
      await act(async () => {
        Simulate.change(textarea, { target: { value } as unknown as EventTarget })
      })
      return textarea
    }

    it("renders the saved memo with an edit button and a write button for games without a memo", async () => {
      mockUserGamesWithUpdate()
      await act(async () => root.render(<GamesPage />))

      expect(container.textContent).toContain("40연차 모으는 중")
      expect(container.textContent).toContain("상시 메모")
      expect(buttonsByText("메모 수정")).toHaveLength(1)
      expect(buttonsByText("메모 작성")).toHaveLength(1)
    })

    it("saves a trimmed new memo scoped to the user's row and updates the card immediately", async () => {
      const { update, firstEq, secondEq } = mockUserGamesWithUpdate()
      await act(async () => root.render(<GamesPage />))

      await click(buttonsByText("메모 작성")[0])
      await typeMemo("붕괴: 스타레일", "  주간 보스 파밍  ")
      await click(buttonsByText("저장")[0])

      expect(update).toHaveBeenCalledWith({ memo: "주간 보스 파밍" })
      expect(firstEq).toHaveBeenCalledWith("id", "user-game-2")
      expect(secondEq).toHaveBeenCalledWith("user_id", "test-user-id")
      expect(document.body.querySelector("textarea")).toBeNull()
      expect(container.textContent).toContain("주간 보스 파밍")
      expect(buttonsByText("메모 수정")).toHaveLength(2)
      expect(buttonsByText("메모 작성")).toHaveLength(0)
    })

    it("prefills the existing memo on edit and stores null when the memo is cleared", async () => {
      const { update, firstEq } = mockUserGamesWithUpdate()
      await act(async () => root.render(<GamesPage />))

      await click(buttonsByText("메모 수정")[0])
      const textarea = (document.body.querySelector('textarea[aria-label="원신 메모 입력"]') || container.querySelector('textarea[aria-label="원신 메모 입력"]')) as HTMLTextAreaElement
      expect(textarea.value).toBe("40연차 모으는 중")

      await typeMemo("원신", "   ")
      await click(buttonsByText("저장")[0])

      expect(update).toHaveBeenCalledWith({ memo: null })
      expect(firstEq).toHaveBeenCalledWith("id", "user-game-1")
      expect(container.textContent).not.toContain("40연차 모으는 중")
      expect(buttonsByText("메모 작성")).toHaveLength(2)
    })

    it("inserts a tab character instead of moving focus when Tab is pressed in the memo textarea", async () => {
      mockUserGamesWithUpdate()
      await act(async () => root.render(<GamesPage />))

      await click(buttonsByText("메모 수정")[0])
      const textarea = await typeMemo("원신", "ab")
      textarea.setSelectionRange(1, 1)
      const preventDefault = vi.fn()
      await act(async () => {
        Simulate.keyDown(textarea, { key: "Tab", preventDefault })
      })

      expect(preventDefault).toHaveBeenCalled()
      expect(textarea.value).toBe("a	b")
    })

    it("discards edits on cancel without calling the server", async () => {
      const { update } = mockUserGamesWithUpdate()
      await act(async () => root.render(<GamesPage />))

      await click(buttonsByText("메모 수정")[0])
      await typeMemo("원신", "바뀐 내용")
      await click(buttonsByText("취소")[0])

      expect(update).not.toHaveBeenCalled()
      expect(document.body.querySelector("textarea")).toBeNull()
      expect(container.textContent).toContain("40연차 모으는 중")
      expect(container.textContent).not.toContain("바뀐 내용")
    })

    it("alerts and keeps the editor open when saving fails", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined)
      mockUserGamesWithUpdate({ error: new Error("network down") })
      await act(async () => root.render(<GamesPage />))

      await click(buttonsByText("메모 작성")[0])
      await typeMemo("붕괴: 스타레일", "저장 실패 테스트")
      await click(buttonsByText("저장")[0])

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("메모 저장에 실패했습니다"))
      expect(document.body.querySelector('textarea[aria-label="붕괴: 스타레일 메모 입력"]')).not.toBeNull()
      expect(buttonsByText("메모 수정")).toHaveLength(1)
      alertSpy.mockRestore()
    })
  })

  it("renders R42 schedule tree with ON AIR, version accordion toggle, and standalone schedules", async () => {
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "game_schedules") {
        q.then = vi.fn((resolve: (val: unknown) => unknown) =>
          Promise.resolve({
            data: [
              {
                id: "ver-1",
                game_id: "game-1",
                title: "1.0 버전 업데이트",
                schedule_type: "VERSION",
                start_date: "2026-11-01",
                end_date: "2026-11-20",
                memo: "1.0 패치",
              },
              {
                id: "pickup-1",
                game_id: "game-1",
                title: "픽업 캐릭터 A",
                schedule_type: "PICKUP",
                start_date: "2026-11-15",
                end_date: "2026-11-20",
                memo: "후반 픽업",
              },
              {
                id: "ver-2",
                game_id: "game-1",
                title: "2.0 버전 업데이트",
                schedule_type: "VERSION",
                start_date: "2026-12-01",
                end_date: "2026-12-31",
                memo: "2.0 패치",
              },
              {
                id: "contents-2",
                game_id: "game-1",
                title: "신규 지역 탐험",
                schedule_type: "CONTENTS",
                start_date: "2026-12-05",
                end_date: "2026-12-25",
                memo: "겨울 이벤트",
              },
              {
                id: "standalone-1",
                game_id: "game-1",
                title: "새해 특별 이벤트",
                schedule_type: "CONTENTS",
                start_date: "2027-01-01",
                end_date: "2027-01-10",
                memo: "단독 이벤트",
              },
            ],
            error: null,
          }).then(resolve)
        )
      }
      return q
    })

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

    // 1. 진행 중인 일정 · ON AIR
    expect(document.body.textContent).toContain("진행 중인 일정 · ON AIR")

    // 2. 버전별 일정 아코디언 트리
    expect(document.body.textContent).toContain("버전별 일정")

    const ver1Btn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("1.0 버전 업데이트")
    )
    expect(ver1Btn).toBeDefined()
    expect(ver1Btn?.getAttribute("aria-expanded")).toBe("true")
    expect(document.body.textContent).toContain("픽업 캐릭터 A")

    const ver2Btn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("2.0 버전 업데이트")
    )
    expect(ver2Btn).toBeDefined()
    expect(ver2Btn?.getAttribute("aria-expanded")).toBe("false")
    expect(document.body.textContent).not.toContain("신규 지역 탐험")

    // ver-2 아코디언 확장 클릭
    await act(async () => {
      Simulate.click(ver2Btn!)
      await Promise.resolve()
    })
    expect(ver2Btn?.getAttribute("aria-expanded")).toBe("true")
    expect(document.body.textContent).toContain("신규 지역 탐험")

    // ver-1 아코디언 접기 클릭
    await act(async () => {
      Simulate.click(ver1Btn!)
      await Promise.resolve()
    })
    expect(ver1Btn?.getAttribute("aria-expanded")).toBe("false")
    expect(document.body.textContent).not.toContain("픽업 캐릭터 A")

    // 3. 기타 일정
    expect(document.body.textContent).toContain("기타 일정")
    expect(document.body.textContent).toContain("새해 특별 이벤트")
  })

  it("renders guest mode notice when user is unauthenticated", async () => {
    useAuth.mockReturnValue({ user: null, role: null })
    from.mockImplementation((table: string) => {
      const q = createQuery(table)
      if (table === "games") {
        q.then = vi.fn((resolve: (val: unknown) => unknown) =>
          Promise.resolve({
            data: [{ id: "game-guest-1", name: "게스트 게임", default_icon_url: null }],
            error: null,
          }).then(resolve)
        )
      }
      return q
    })

    await act(async () => root.render(<GamesPage />))

    expect(container.textContent).toContain("게임 일정")
    expect(container.textContent).toContain(
      "게스트 모드에서는 승인된 게임의 공식 일정만 열람할 수 있습니다."
    )
    expect(container.textContent).toContain("게스트 게임")

    const scheduleBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("일정 보기")
    )
    expect(scheduleBtn).toBeDefined()

    await act(async () => {
      Simulate.click(scheduleBtn!)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain("게스트 게임 일정")
    expect(document.body.textContent).toContain(
      "관리자가 등록한 픽업, 버전 및 콘텐츠 업데이트 일정입니다."
    )
  })
})
