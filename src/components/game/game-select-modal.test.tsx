import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GameSelectModal } from "./game-select-modal"

const { from, useAuth } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/use-online-status", () => ({ useOnlineStatus: () => true }))

describe("GameSelectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "user-1" } })
    from.mockImplementation((table: string) => {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
      }
      query.select.mockReturnValue(query)
      if (table === "games") {
        query.order.mockResolvedValue({
          data: [
            { id: "game-subscribed", name: "이미 구독한 게임" },
            { id: "game-available", name: "미구독 게임" },
          ],
          error: null,
        })
      } else {
        query.eq.mockResolvedValue({
          data: [{ game_id: "game-subscribed" }],
          error: null,
        })
      }
      return query
    })
  })

  it("현재 사용자가 이미 구독 중인 게임은 등록 목록에서 제외한다", async () => {
    render(<GameSelectModal onGameAdded={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))

    expect(await screen.findByRole("button", { name: "미구독 게임" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "이미 구독한 게임" })).toBeNull()
  })

  it("세션 갱신으로 user 객체 참조만 바뀌면 목록을 다시 불러오거나 선택을 초기화하지 않는다", async () => {
    const { rerender } = render(<GameSelectModal onGameAdded={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))
    fireEvent.click(await screen.findByRole("button", { name: "미구독 게임" }))
    expect(screen.getByRole("button", { name: "변경" })).toBeTruthy()
    const callsBeforeRefresh = from.mock.calls.length

    useAuth.mockReturnValue({ user: { id: "user-1" } })
    rerender(<GameSelectModal onGameAdded={vi.fn()} />)

    expect(from.mock.calls.length).toBe(callsBeforeRefresh)
    expect(screen.getByText("미구독 게임")).toBeTruthy()
    expect(screen.getByRole("button", { name: "변경" })).toBeTruthy()
  })
})
