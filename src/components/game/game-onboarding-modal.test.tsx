import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Simulate } from "react-dom/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GameOnboardingModal } from "./game-onboarding-modal"
import { isGameOnboardingDismissed, loadGameOrder } from "@/lib/game-order-storage"

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

const catalog = [
  { id: "g1", name: "가 게임", default_icon_url: null },
  { id: "g2", name: "나 게임", default_icon_url: null },
  { id: "g3", name: "다 게임", default_icon_url: null },
]

describe("GameOnboardingModal", () => {
  let container: HTMLDivElement
  let root: Root
  let insert: ReturnType<typeof vi.fn>
  const onClose = vi.fn()
  const onSubscribed = vi.fn()

  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })

  async function renderModal(open = true) {
    await act(async () => root.render(<GameOnboardingModal open={open} userId="user-1" onClose={onClose} onSubscribed={onSubscribed} />))
    await flush()
  }

  const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement
  const buttonByText = (text: string) =>
    Array.from(dialog().querySelectorAll("button")).find((b) => b.textContent?.trim() === text) as HTMLButtonElement
  const gameButton = (name: string) =>
    Array.from(dialog().querySelectorAll('[data-testid="onboarding-game-list"] button')).find((b) => b.textContent === name) as HTMLButtonElement
  const startButton = () =>
    Array.from(dialog().querySelectorAll("button")).find((b) => b.textContent?.includes("선택한 게임 구독 시작")) as HTMLButtonElement
  const click = async (el: Element) => {
    await act(async () => {
      Simulate.click(el)
    })
    await flush()
  }

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    insert = vi.fn().mockResolvedValue({ error: null })
    from.mockImplementation((table: string) => {
      if (table === "games") {
        const query = { select: vi.fn(), order: vi.fn() }
        query.select.mockReturnValue(query)
        query.order.mockResolvedValue({ data: catalog, error: null })
        return query
      }
      return { insert }
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    document.body.querySelectorAll('[role="dialog"]').forEach((el) => el.remove())
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
    vi.clearAllMocks()
  })

  it("renders nothing and loads nothing while closed", async () => {
    await renderModal(false)
    expect(dialog()).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("loads the catalog ordered by name with every game preselected", async () => {
    await renderModal()

    expect(dialog().getAttribute("aria-describedby")).toBeTruthy()
    expect(Array.from(dialog().querySelectorAll('[data-testid="onboarding-game-list"] button')).map((b) => b.textContent)).toEqual([
      "가 게임",
      "나 게임",
      "다 게임",
    ])
    expect(["가 게임", "나 게임", "다 게임"].every((name) => gameButton(name).getAttribute("aria-pressed") === "true")).toBe(true)
    expect(startButton().textContent).toBe("선택한 게임 구독 시작 (3개)")
  })

  it("toggles single games and supports select-all / clear-all", async () => {
    await renderModal()

    await click(gameButton("나 게임"))
    expect(gameButton("나 게임").getAttribute("aria-pressed")).toBe("false")
    expect(startButton().textContent).toContain("(2개)")

    await click(buttonByText("전체 해제"))
    expect(startButton().disabled).toBe(true)
    expect(startButton().textContent).toContain("(0개)")

    await click(buttonByText("전체 선택"))
    expect(startButton().disabled).toBe(false)
    expect(startButton().textContent).toContain("(3개)")
  })

  it("bulk-inserts the selected games, stores their order, dismisses the onboarding and reports", async () => {
    await renderModal()
    await click(gameButton("나 게임"))
    await click(startButton())

    expect(from).toHaveBeenCalledWith("user_games")
    expect(insert).toHaveBeenCalledWith([
      { user_id: "user-1", game_id: "g1" },
      { user_id: "user-1", game_id: "g3" },
    ])
    expect(loadGameOrder("user-1")).toEqual(["g1", "g3"])
    expect(isGameOnboardingDismissed("user-1")).toBe(true)
    expect(onSubscribed).toHaveBeenCalledWith(["g1", "g3"])
    expect(onClose).not.toHaveBeenCalled()
  })

  it("keeps the modal open with an error and stores nothing when the insert fails", async () => {
    insert.mockResolvedValue({ error: { message: "rls" } })
    await renderModal()
    await click(startButton())

    expect(dialog().textContent).toContain("게임 구독에 실패했습니다.")
    expect(onSubscribed).not.toHaveBeenCalled()
    expect(isGameOnboardingDismissed("user-1")).toBe(false)
    expect(loadGameOrder("user-1")).toEqual([])
  })

  it("does not write while offline", async () => {
    await renderModal()
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    // The button is disabled by the online status; the in-handler guard covers a bypassed UI.
    await act(async () => {
      window.dispatchEvent(new Event("offline"))
    })
    expect(startButton().disabled).toBe(true)
    await act(async () => {
      Simulate.click(startButton())
    })
    expect(insert).not.toHaveBeenCalled()
  })

  it("dismisses permanently and closes on 나중에 직접 선택", async () => {
    await renderModal()
    await click(buttonByText("나중에 직접 선택"))

    expect(isGameOnboardingDismissed("user-1")).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(insert).not.toHaveBeenCalled()
  })

  it("shows an error when the catalog cannot be loaded", async () => {
    from.mockImplementation(() => {
      const query = { select: vi.fn(), order: vi.fn() }
      query.select.mockReturnValue(query)
      query.order.mockResolvedValue({ data: null, error: { message: "boom" } })
      return query
    })
    await renderModal()

    expect(dialog().textContent).toContain("게임 목록을 불러오지 못했습니다.")
    expect(startButton().disabled).toBe(true)
  })
})
