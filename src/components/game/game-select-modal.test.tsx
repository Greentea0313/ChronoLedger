import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GameSelectModal } from "./game-select-modal"

const { from, useAuth, resizeImageToWebP, uploadUserIcon } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  resizeImageToWebP: vi.fn(),
  uploadUserIcon: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/use-online-status", () => ({ useOnlineStatus: () => true }))
vi.mock("@/lib/storage-upload", () => ({ uploadUserIcon }))
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-resizer")>()),
  resizeImageToWebP,
}))

describe("GameSelectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "user-1" } })
    URL.createObjectURL = vi.fn(() => "blob:preview")
    URL.revokeObjectURL = vi.fn()
    from.mockImplementation((table: string) => {
      const query = {
        select: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
        insert: vi.fn().mockResolvedValue({ error: null }),
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

  it("공용 이미지 다이얼로그로 아이콘을 고르면 변환된 Blob을 보관했다가 게임 추가 때 업로드한다", async () => {
    const webp = new Blob(["webp"], { type: "image/webp" })
    resizeImageToWebP.mockResolvedValue(webp)
    uploadUserIcon.mockResolvedValue(undefined)
    const onGameAdded = vi.fn()
    render(<GameSelectModal onGameAdded={onGameAdded} />)
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))
    fireEvent.click(await screen.findByRole("button", { name: "미구독 게임" }))

    fireEvent.click(screen.getByRole("button", { name: "이미지 선택" }))
    const file = new File(["x"], "icon.png", { type: "image/png" })
    fireEvent.change(await screen.findByLabelText("이미지 파일"), { target: { files: [file] } })
    await screen.findByAltText("미리보기")
    fireEvent.click(screen.getByRole("button", { name: "등록" }))

    expect(await screen.findByText("아이콘 선택됨 (변경)")).toBeTruthy()
    expect(resizeImageToWebP).toHaveBeenCalledWith(file)
    expect(uploadUserIcon).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "등록 완료" }))
    await waitFor(() => expect(uploadUserIcon).toHaveBeenCalledWith("user-1", "game-available", webp))
    await waitFor(() => expect(onGameAdded).toHaveBeenCalled())
  })

  it("선택한 아이콘을 제거하면 업로드 없이 게임만 추가한다", async () => {
    resizeImageToWebP.mockResolvedValue(new Blob(["webp"], { type: "image/webp" }))
    render(<GameSelectModal onGameAdded={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "구독 추가" }))
    fireEvent.click(await screen.findByRole("button", { name: "미구독 게임" }))
    fireEvent.click(screen.getByRole("button", { name: "이미지 선택" }))
    fireEvent.change(await screen.findByLabelText("이미지 파일"), { target: { files: [new File(["x"], "icon.png", { type: "image/png" })] } })
    await screen.findByAltText("미리보기")
    fireEvent.click(screen.getByRole("button", { name: "등록" }))
    fireEvent.click(await screen.findByRole("button", { name: "선택한 아이콘 제거" }))

    expect(screen.getByRole("button", { name: "이미지 선택" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "등록 완료" }))
    await waitFor(() => expect(from).toHaveBeenCalledWith("user_games"))
    expect(uploadUserIcon).not.toHaveBeenCalled()
  })
})
