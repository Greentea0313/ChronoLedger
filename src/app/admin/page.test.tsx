import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AdminPage from "./page"

const { from, useAuth } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

function createQueryBuilder() {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.delete.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe("AdminPage - 일정 관리", () => {
  const mockGames = [
    { id: "game-1", name: "원신" },
    { id: "game-2", name: "붕괴: 스타레일" },
  ]

  const mockSchedules = [
    {
      id: "schedule-1",
      game_id: "game-1",
      schedule_type: "VERSION",
      title: "5.0 버전 업데이트",
      start_date: "2026-08-28",
      end_date: "2026-10-08",
      memo: "나타 신규 지역",
      games: { id: "game-1", name: "원신" },
    },
    {
      id: "schedule-2",
      game_id: "game-2",
      schedule_type: "PICKUP",
      title: "아케론 복각",
      start_date: "2026-09-01",
      end_date: "2026-09-21",
      memo: null,
      games: { id: "game-2", name: "붕괴: 스타레일" },
    },
  ]

  let gamesBuilder: ReturnType<typeof createQueryBuilder>
  let schedulesBuilder: ReturnType<typeof createQueryBuilder>

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({
      user: { id: "admin-1", app_metadata: { role: "admin" } },
      role: "admin",
      isLoading: false,
    })

    gamesBuilder = createQueryBuilder()
    gamesBuilder.order.mockResolvedValue({ data: mockGames, error: null })

    schedulesBuilder = createQueryBuilder()
    schedulesBuilder.order.mockResolvedValue({ data: mockSchedules, error: null })

    from.mockImplementation((table: string) => {
      if (table === "games") return gamesBuilder
      if (table === "game_schedules") return schedulesBuilder
      return createQueryBuilder()
    })
  })

  it("비관리자 접근 시 차단 메시지를 렌더링한다", () => {
    useAuth.mockReturnValue({
      user: { id: "user-1", app_metadata: { role: "user" } },
      role: "user",
      isLoading: false,
    })

    render(<AdminPage />)
    expect(screen.getByText("접근 권한이 없습니다. 관리자만 이용 가능합니다.")).toBeTruthy()
  })

  it("등록된 일정 목록을 정상적으로 렌더링하고 게임별 필터링을 지원한다", async () => {
    render(<AdminPage />)

    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()
    expect(screen.getByText("5.0 버전 업데이트")).toBeTruthy()
    expect(screen.getByText("아케론 복각")).toBeTruthy()
    expect(screen.getByText(/나타 신규 지역/)).toBeTruthy()

    // 게임 필터 선택
    const filterSelect = screen.getByLabelText("게임 필터 선택")
    fireEvent.change(filterSelect, { target: { value: "game-1" } })

    expect(screen.getByText("5.0 버전 업데이트")).toBeTruthy()
    expect(screen.queryByText("아케론 복각")).toBeNull()
  })

  it("새 일정 등록 모달을 열고 일정을 추가할 수 있다", async () => {
    schedulesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    // 새 일정 등록 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "새 일정 등록" }))

    expect(screen.getByRole("heading", { name: "새 일정 등록" })).toBeTruthy()

    // 폼 입력
    fireEvent.change(screen.getByLabelText(/게임 선택/), {
      target: { value: "game-1" },
    })
    fireEvent.change(screen.getByPlaceholderText("일정 제목을 입력하세요"), {
      target: { value: "5.1 신규 버전" },
    })
    fireEvent.change(screen.getByLabelText(/시작일/), {
      target: { value: "2026-10-09" },
    })
    fireEvent.change(screen.getByLabelText(/종료일/), {
      target: { value: "2026-11-19" },
    })

    // 저장 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))

    await waitFor(() => {
      expect(schedulesBuilder.insert).toHaveBeenCalledWith({
        game_id: "game-1",
        schedule_type: "VERSION",
        title: "5.1 신규 버전",
        start_date: "2026-10-09",
        end_date: "2026-11-19",
        memo: null,
      })
    })
  })

  it("기존 일정의 수정 모달을 열고 데이터를 갱신할 수 있다", async () => {
    schedulesBuilder.update.mockReturnValue(schedulesBuilder)
    schedulesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    // 첫 번째 일정의 수정 버튼 클릭
    const editButtons = screen.getAllByRole("button", { name: /일정 수정:/ })
    fireEvent.click(editButtons[0])

    expect(screen.getByRole("heading", { name: "일정 수정" })).toBeTruthy()

    const titleInput = screen.getByPlaceholderText("일정 제목을 입력하세요") as HTMLInputElement
    expect(titleInput.value).toBe("5.0 버전 업데이트")

    // 제목 변경
    fireEvent.change(titleInput, { target: { value: "5.0 나타 대형 업데이트 (수정)" } })

    // 수정 저장 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => {
      expect(schedulesBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "5.0 나타 대형 업데이트 (수정)",
        })
      )
      expect(schedulesBuilder.eq).toHaveBeenCalledWith("id", "schedule-1")
    })
  })

  it("일정 삭제 확인 모달을 통해 일정을 안전하게 삭제할 수 있다", async () => {
    schedulesBuilder.delete.mockReturnValue(schedulesBuilder)
    schedulesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    // 두 번째 일정의 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole("button", { name: /일정 삭제:/ })
    fireEvent.click(deleteButtons[1])

    expect(screen.getByRole("heading", { name: "일정 삭제 확인" })).toBeTruthy()
    expect(screen.getByText(/'아케론 복각'/)).toBeTruthy()

    // 모달 내 최종 삭제 버튼 클릭
    const confirmDeleteBtn = screen.getByRole("button", { name: "삭제" })
    fireEvent.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(schedulesBuilder.delete).toHaveBeenCalled()
      expect(schedulesBuilder.eq).toHaveBeenCalledWith("id", "schedule-2")
    })
  })
})
