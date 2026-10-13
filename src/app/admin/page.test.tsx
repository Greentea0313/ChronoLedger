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

  it("일정 항목의 버튼이 [복사] [수정] [삭제] 순서로 배치된다", async () => {
    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    const copyBtn = screen.getByRole("button", { name: "일정 복사: 5.0 버전 업데이트" })
    const actionLabels = Array.from(copyBtn.parentElement!.querySelectorAll("button")).map((b) => b.textContent?.trim())
    expect(actionLabels).toEqual(["복사", "수정", "삭제"])
  })

  it("복사 버튼은 기존 값이 채워진 모달을 열고 새 일정으로 저장한다", async () => {
    schedulesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "일정 복사: 아케론 복각" }))
    expect(screen.getByRole("heading", { name: "일정 복사" })).toBeTruthy()

    const titleInput = screen.getByPlaceholderText("일정 제목을 입력하세요") as HTMLInputElement
    expect(titleInput.value).toBe("아케론 복각")
    fireEvent.change(titleInput, { target: { value: "블랙스완 복각" } })

    fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))

    await waitFor(() => {
      expect(schedulesBuilder.insert).toHaveBeenCalledWith({
        game_id: "game-2",
        schedule_type: "PICKUP",
        title: "블랙스완 복각",
        start_date: "2026-09-01",
        end_date: "2026-09-21",
        memo: null,
      })
    })
    expect(schedulesBuilder.update).not.toHaveBeenCalled()
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

  it("10개를 초과하는 공식 일정은 페이지네이션 바가 렌더링되고 2페이지로 이동할 수 있다", async () => {
    const manySchedules = Array.from({ length: 15 }, (_, i) => ({
      id: `schedule-batch-${i + 1}`,
      game_id: "game-1",
      schedule_type: "VERSION" as const,
      title: `일정 테스트 #${i + 1}`,
      start_date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      end_date: `2026-10-${String(i + 2).padStart(2, "0")}`,
      memo: null,
      games: { id: "game-1", name: "원신" },
    }))

    schedulesBuilder.order.mockResolvedValue({ data: manySchedules, error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 공식 일정")).toBeTruthy()

    // 1페이지 항목은 표시되지만 11번째는 1페이지에 없음
    expect(screen.getByText("일정 테스트 #1")).toBeTruthy()
    expect(screen.getByText("일정 테스트 #10")).toBeTruthy()
    expect(screen.queryByText("일정 테스트 #11")).toBeNull()

    // 페이지네이션 바 정보 확인
    expect(screen.getByText(/1 \/ 2/)).toBeTruthy()

    // 2페이지 버튼 클릭
    const page2Button = screen.getByRole("button", { name: "2 페이지로 이동" })
    fireEvent.click(page2Button)

    // 2페이지의 11번째 항목이 표시됨
    expect(screen.getByText("일정 테스트 #11")).toBeTruthy()
    expect(screen.getByText("일정 테스트 #15")).toBeTruthy()
    expect(screen.queryByText("일정 테스트 #1")).toBeNull()
  })

  it("등록된 게임 목록 탭에서 전체 게임을 조회하고 수정할 수 있다", async () => {
    gamesBuilder.update.mockReturnValue(gamesBuilder)
    gamesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)

    // 게임 목록 탭 클릭
    const gamesTab = await screen.findByRole("tab", { name: /등록된 게임 목록/ })
    fireEvent.click(gamesTab)

    expect(screen.getByText("등록된 전체 게임 목록")).toBeTruthy()
    expect(screen.getByText("원신")).toBeTruthy()
    expect(screen.getByText("붕괴: 스타레일")).toBeTruthy()

    // '원신' 게임 수정 버튼 클릭
    const editBtn = screen.getByRole("button", { name: "게임 수정: 원신" })
    fireEvent.click(editBtn)

    expect(screen.getByRole("heading", { name: "게임 정보 수정" })).toBeTruthy()

    const nameInput = screen.getByPlaceholderText("예: 원신, 붕괴: 스타레일") as HTMLInputElement
    expect(nameInput.value).toBe("원신")

    // 이름 및 아이콘 변경
    fireEvent.change(nameInput, { target: { value: "원신 (수정됨)" } })
    const iconInput = screen.getByPlaceholderText("https://... (웹 이미지 주소)") as HTMLInputElement
    fireEvent.change(iconInput, { target: { value: "https://example.com/genshin-new.webp" } })

    // 수정 저장
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => {
      expect(gamesBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "원신 (수정됨)",
          default_icon_url: "https://example.com/genshin-new.webp",
        })
      )
      expect(gamesBuilder.eq).toHaveBeenCalledWith("id", "game-1")
    })
  })

  it("등록된 게임을 삭제 모달을 통해 안전하게 삭제할 수 있다", async () => {
    gamesBuilder.delete.mockReturnValue(gamesBuilder)
    gamesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)

    // 게임 목록 탭 클릭
    const gamesTab = await screen.findByRole("tab", { name: /등록된 게임 목록/ })
    fireEvent.click(gamesTab)

    // '붕괴: 스타레일' 삭제 버튼 클릭
    const deleteBtn = screen.getByRole("button", { name: "게임 삭제: 붕괴: 스타레일" })
    fireEvent.click(deleteBtn)

    expect(screen.getByRole("heading", { name: "게임 삭제 확인" })).toBeTruthy()
    expect(screen.getByText(/'붕괴: 스타레일'/)).toBeTruthy()

    // 모달 내 최종 삭제 버튼 클릭
    const confirmDeleteBtn = screen.getAllByRole("button", { name: "삭제" })
    fireEvent.click(confirmDeleteBtn[confirmDeleteBtn.length - 1])

    await waitFor(() => {
      expect(gamesBuilder.delete).toHaveBeenCalled()
      expect(gamesBuilder.eq).toHaveBeenCalledWith("id", "game-2")
    })
  })

  it("새 게임 등록 모달을 통해 신규 게임을 등록할 수 있다", async () => {
    gamesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)

    // 게임 목록 탭 클릭
    const gamesTab = await screen.findByRole("tab", { name: /등록된 게임 목록/ })
    fireEvent.click(gamesTab)

    // 새 게임 등록 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "새 게임 등록" }))

    expect(screen.getByRole("heading", { name: "새 게임 등록" })).toBeTruthy()

    // 인풋 입력
    fireEvent.change(screen.getByPlaceholderText("예: 원신, 붕괴: 스타레일"), { target: { value: "명조: 워더링 웨이브" } })
    fireEvent.change(screen.getByPlaceholderText("https://... (웹 이미지 주소)"), { target: { value: "https://example.com/wuthering.webp" } })

    // 게임 등록 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "게임 등록" }))

    await waitFor(() => {
      expect(gamesBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "명조: 워더링 웨이브",
          default_icon_url: "https://example.com/wuthering.webp",
          status: "APPROVED",
        })
      )
    })
  })
})
