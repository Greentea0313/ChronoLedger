import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AdminPage from "./page"

const { from, useAuth, mockGetKstToday, convertIconSourceToDataUrl } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  mockGetKstToday: vi.fn(() => "2026-09-01"),
  convertIconSourceToDataUrl: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/dashboard-date", () => ({ getKstToday: mockGetKstToday }))
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/image-resizer")>(),
  convertIconSourceToDataUrl,
}))

function createQueryBuilder() {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.delete.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.gte.mockReturnValue(query)
  query.lt.mockReturnValue(query)
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
    mockGetKstToday.mockReturnValue("2026-09-01")
    convertIconSourceToDataUrl.mockResolvedValue("data:image/webp;base64,converted")
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
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("접근 권한이 없습니다. 관리자만 이용 가능합니다.")
    expect(alert.className).toContain("text-danger")
    expect(alert.className).not.toContain("text-red-500")
  })

  it("등록된 일정 목록을 정상적으로 렌더링하고 게임별 필터링을 지원한다", async () => {
    render(<AdminPage />)

    expect(await screen.findByText("등록된 일정")).toBeTruthy()
    expect(screen.getByText("5.0 버전 업데이트")).toBeTruthy()
    expect(screen.getByText("아케론 복각")).toBeTruthy()
    expect(screen.getByText(/나타 신규 지역/)).toBeTruthy()

    // 게임 필터 선택
    const filterSelect = screen.getByLabelText("게임 필터 선택")
    fireEvent.change(filterSelect, { target: { value: "game-1" } })

    expect(screen.getByText("5.0 버전 업데이트")).toBeTruthy()
    expect(screen.queryByText("아케론 복각")).toBeNull()
  })

  it("end_date가 오늘(today)보다 이전(end_date < today)인 만료된 일정은 목록 및 카운트에서 제외된다", async () => {
    mockGetKstToday.mockReturnValue("2026-10-01")

    render(<AdminPage />)

    expect(await screen.findByText("등록된 일정")).toBeTruthy()
    expect(schedulesBuilder.gte).toHaveBeenCalledWith("end_date", "2026-10-01")
    expect(screen.getByText("5.0 버전 업데이트")).toBeTruthy()
    expect(screen.queryByText("아케론 복각")).toBeNull()
    expect(screen.getByText("일정 관리 (1)")).toBeTruthy()
    expect(screen.getByText("1개의 일정")).toBeTruthy()
  })

  it("새 일정 등록 모달을 열고 일정을 추가할 수 있다", async () => {
    schedulesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    // 새 일정 등록 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "새 일정 등록" }))

    expect(screen.getByRole("heading", { name: "새 일정 등록" })).toBeTruthy()
    expect(screen.getByText("새 게임 일정을 등록합니다.")).toBeTruthy()

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
        is_official: true,
        title: "5.1 신규 버전",
        start_date: "2026-10-09",
        end_date: "2026-11-19",
        memo: null,
      })
    })
  })

  it("일정 항목의 버튼이 [복사] [수정] [삭제] 순서로 배치된다", async () => {
    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    const copyBtn = screen.getByRole("button", { name: "일정 복사: 5.0 버전 업데이트" })
    const actionLabels = Array.from(copyBtn.parentElement!.querySelectorAll("button")).map((b) => b.textContent?.trim())
    expect(actionLabels).toEqual(["복사", "수정", "삭제"])
  })

  it("복사 버튼은 기존 값이 채워진 모달을 열고 새 일정으로 저장한다", async () => {
    schedulesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

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
        is_official: true,
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
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

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
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    // 두 번째 일정의 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole("button", { name: /일정 삭제:/ })
    fireEvent.click(deleteButtons[1])

    expect(screen.getByRole("heading", { name: "일정 삭제 확인" })).toBeTruthy()
    expect(screen.getByText("선택한 일정은 삭제 후 복구할 수 없습니다.")).toBeTruthy()
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
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

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
          default_icon_url: "data:image/webp;base64,converted",
        })
      )
      expect(gamesBuilder.eq).toHaveBeenCalledWith("id", "game-1")
    })
  })

  it("외부 URL 아이콘 게임에 배지를 표시하고 Data URL 재저장 시 DB 갱신 및 목록에 반영한다", async () => {
    gamesBuilder.order.mockResolvedValue({
      data: [
        { id: "game-1", name: "원신", default_icon_url: "https://i.namu.wiki/a.png" },
        { id: "game-2", name: "붕괴: 스타레일", default_icon_url: "data:image/webp;base64,own" },
        { id: "game-3", name: "로컬 아이콘 게임", default_icon_url: "/assets/games/local.webp" },
      ],
      error: null,
    })
    gamesBuilder.update.mockReturnValue(gamesBuilder)
    gamesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))

    expect(screen.getAllByText("외부 URL")).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Data URL 재저장: 붕괴: 스타레일" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Data URL 재저장: 로컬 아이콘 게임" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Data URL 재저장: 원신" }))

    await waitFor(() => {
      expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://i.namu.wiki/a.png")
      expect(gamesBuilder.update).toHaveBeenCalledWith({ default_icon_url: "data:image/webp;base64,converted" })
      expect(gamesBuilder.eq).toHaveBeenCalledWith("id", "game-1")
    })
    await waitFor(() => {
      expect(screen.queryByText("외부 URL")).toBeNull()
      expect(screen.queryByRole("button", { name: /외부 아이콘 일괄 변환/ })).toBeNull()
    })
  })

  it("외부 아이콘 일괄 변환 버튼은 외부 URL 게임 수를 표시하고 변환 실패를 보고한다", async () => {
    gamesBuilder.order.mockResolvedValue({
      data: [
        { id: "game-1", name: "원신", default_icon_url: "https://a.example/1.png" },
        { id: "game-2", name: "붕괴: 스타레일", default_icon_url: "https://a.example/2.png" },
        { id: "game-3", name: "로컬 아이콘 게임", default_icon_url: "/assets/games/local.webp" },
      ],
      error: null,
    })
    gamesBuilder.update.mockReturnValue(gamesBuilder)
    gamesBuilder.eq.mockResolvedValue({ error: null })
    convertIconSourceToDataUrl
      .mockResolvedValueOnce("data:image/webp;base64,ok")
      .mockRejectedValueOnce(new Error("fail"))

    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
    fireEvent.click(screen.getByRole("button", { name: "외부 아이콘 일괄 변환 (2)" }))

    expect(await screen.findByText(/아이콘 재저장 실패: 붕괴: 스타레일 \(성공 1개\)/)).toBeTruthy()
    expect(gamesBuilder.update).toHaveBeenCalledTimes(1)
    expect(convertIconSourceToDataUrl).toHaveBeenCalledTimes(2)
    expect(convertIconSourceToDataUrl).not.toHaveBeenCalledWith("/assets/games/local.webp")
    expect(screen.getByRole("button", { name: "외부 아이콘 일괄 변환 (1)" })).toBeTruthy()
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
    expect(screen.getByText("게임을 삭제하면 연결된 데이터도 함께 삭제되며 복구할 수 없습니다.")).toBeTruthy()
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
          default_icon_url: "data:image/webp;base64,converted",
          status: "APPROVED",
        })
      )
    })
  })

  it("게임 아이콘 입력란은 이미지 붙여넣기를 변환하고 텍스트 붙여넣기는 가로채지 않는다", async () => {
    gamesBuilder.insert.mockResolvedValue({ error: null })

    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
    fireEvent.click(screen.getByRole("button", { name: "새 게임 등록" }))

    const iconInput = screen.getByPlaceholderText("https://... (웹 이미지 주소)")
    expect(fireEvent.paste(iconInput, { clipboardData: { files: [], items: [] } })).toBe(true)

    const imageFile = new File(["image"], "clipboard.png", { type: "image/png" })
    expect(fireEvent.paste(iconInput, { clipboardData: { files: [imageFile], items: [] } })).toBe(false)
    await waitFor(() => expect(convertIconSourceToDataUrl).toHaveBeenCalledWith(imageFile))

    fireEvent.change(screen.getByPlaceholderText("예: 원신, 붕괴: 스타레일"), {
      target: { value: "클립보드 테스트 게임" },
    })
    fireEvent.click(screen.getByRole("button", { name: "게임 등록" }))

    await waitFor(() => {
      expect(gamesBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "클립보드 테스트 게임",
          default_icon_url: "data:image/webp;base64,converted",
        }),
      )
    })
  })

  it("[지난 일정] 버튼을 클릭하면 지난 일정 모달이 열리고 lt(end_date, today) 조건으로 이전 일정을 조회한다", async () => {
    const mockPastSchedules = [
      {
        id: "past-schedule-1",
        game_id: "game-1",
        schedule_type: "VERSION" as const,
        title: "4.8 여름 이벤트",
        start_date: "2026-07-17",
        end_date: "2026-08-27",
        memo: "시뮬랑카 바다",
        games: { id: "game-1", name: "원신" },
      },
      {
        id: "past-schedule-2",
        game_id: "game-2",
        schedule_type: "PICKUP" as const,
        title: "은랑 픽업",
        start_date: "2026-06-01",
        end_date: "2026-06-21",
        memo: null,
        games: { id: "game-2", name: "붕괴: 스타레일" },
      },
    ]

    schedulesBuilder.order.mockResolvedValue({ data: mockPastSchedules, error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    // 지난 일정 버튼 클릭
    const pastBtn = screen.getByRole("button", { name: "지난 일정 모아보기" })
    fireEvent.click(pastBtn)

    expect(await screen.findByText("지난 일정 모아보기")).toBeTruthy()
    expect(schedulesBuilder.lt).toHaveBeenCalledWith("end_date", "2026-09-01")
    expect(screen.getByText("4.8 여름 이벤트")).toBeTruthy()
    expect(screen.getByText("은랑 픽업")).toBeTruthy()
    expect(screen.getByText(/시뮬랑카 바다/)).toBeTruthy()

    // 지난 일정 모달 내 게임 필터링
    const pastFilterSelect = screen.getByLabelText("지난 일정 게임 필터 선택")
    fireEvent.change(pastFilterSelect, { target: { value: "game-1" } })

    expect(screen.getByText("4.8 여름 이벤트")).toBeTruthy()
    expect(screen.queryByText("은랑 픽업")).toBeNull()

    // 지난 일정 모달 내 검색
    fireEvent.change(pastFilterSelect, { target: { value: "" } })
    const pastSearchInput = screen.getByLabelText("지난 일정 검색")
    fireEvent.change(pastSearchInput, { target: { value: "은랑" } })

    expect(screen.getByText("은랑 픽업")).toBeTruthy()
    expect(screen.queryByText("4.8 여름 이벤트")).toBeNull()
  })

  it("지난 일정 모달에서 [수정]을 클릭하면 수정 모달이 열리고 저장 시 갱신된다", async () => {
    const mockPastSchedules = [
      {
        id: "past-schedule-1",
        game_id: "game-1",
        schedule_type: "VERSION" as const,
        title: "4.8 여름 이벤트",
        start_date: "2026-07-17",
        end_date: "2026-08-27",
        memo: "시뮬랑카 바다",
        games: { id: "game-1", name: "원신" },
      },
    ]

    schedulesBuilder.order.mockResolvedValue({ data: mockPastSchedules, error: null })
    schedulesBuilder.update.mockReturnValue(schedulesBuilder)
    schedulesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    // 지난 일정 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "지난 일정 모아보기" }))
    expect(await screen.findByText("4.8 여름 이벤트")).toBeTruthy()

    // 지난 일정 행의 수정 버튼 클릭
    const editBtn = screen.getByRole("button", { name: "지난 일정 수정: 4.8 여름 이벤트" })
    fireEvent.click(editBtn)

    // 수정 모달 열림 확인
    expect(screen.getByRole("heading", { name: "일정 수정" })).toBeTruthy()

    const titleInput = screen.getByPlaceholderText("일정 제목을 입력하세요") as HTMLInputElement
    expect(titleInput.value).toBe("4.8 여름 이벤트")
    fireEvent.change(titleInput, { target: { value: "4.8 여름 바캉스 대작전" } })

    // 수정 저장 클릭
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => {
      expect(schedulesBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "4.8 여름 바캉스 대작전",
        })
      )
      expect(schedulesBuilder.eq).toHaveBeenCalledWith("id", "past-schedule-1")
    })
  })

  it("지난 일정 모달에서 [삭제]를 클릭하면 삭제 확인 모달이 열리고 삭제된다", async () => {
    const mockPastSchedules = [
      {
        id: "past-schedule-1",
        game_id: "game-1",
        schedule_type: "VERSION" as const,
        title: "4.8 여름 이벤트",
        start_date: "2026-07-17",
        end_date: "2026-08-27",
        memo: null,
        games: { id: "game-1", name: "원신" },
      },
    ]

    schedulesBuilder.order.mockResolvedValue({ data: mockPastSchedules, error: null })
    schedulesBuilder.delete.mockReturnValue(schedulesBuilder)
    schedulesBuilder.eq.mockResolvedValue({ error: null })

    render(<AdminPage />)
    expect(await screen.findByText("등록된 일정")).toBeTruthy()

    // 지난 일정 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "지난 일정 모아보기" }))
    expect(await screen.findByText("4.8 여름 이벤트")).toBeTruthy()

    // 지난 일정 행의 삭제 버튼 클릭
    const deleteBtn = screen.getByRole("button", { name: "지난 일정 삭제: 4.8 여름 이벤트" })
    fireEvent.click(deleteBtn)

    // 삭제 확인 모달
    expect(screen.getByRole("heading", { name: "일정 삭제 확인" })).toBeTruthy()
    expect(screen.getByText(/'4.8 여름 이벤트'/)).toBeTruthy()

    // 삭제 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "삭제" }))

    await waitFor(() => {
      expect(schedulesBuilder.delete).toHaveBeenCalled()
      expect(schedulesBuilder.eq).toHaveBeenCalledWith("id", "past-schedule-1")
    })
  })
})

describe("AdminPage - 게임 분류 설정 및 캐릭터 관리 (Phase 13.2)", () => {
  const schemaGame = {
    id: "game-1",
    name: "원신",
    default_icon_url: "data:image/webp;base64,own",
    max_preset_slots: 4,
    max_breakthrough: 5,
    classification_schema: {
      rarities: ["5★", "4★"],
      axes: [{ key: "element", label: "속성", options: ["불", "물"] }],
    },
  }
  const mockCharacters = [
    { id: "char-1", game_id: "game-1", name: "알리스", rarity: "5★", attributes: { element: "불" }, default_icon_url: "data:image/webp;base64,a" },
    { id: "char-2", game_id: "game-1", name: "보리스", rarity: "4★", attributes: { element: "물" }, default_icon_url: "data:image/webp;base64,b" },
    { id: "char-3", game_id: "game-1", name: "카린", rarity: "4★", attributes: { element: "불" }, default_icon_url: "data:image/webp;base64,c" },
  ]

  let gamesBuilder: ReturnType<typeof createQueryBuilder>
  let charactersBuilder: ReturnType<typeof createQueryBuilder>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetKstToday.mockReturnValue("2026-09-01")
    convertIconSourceToDataUrl.mockResolvedValue("data:image/webp;base64,converted")
    useAuth.mockReturnValue({
      user: { id: "admin-1", app_metadata: { role: "admin" } },
      role: "admin",
      isLoading: false,
    })
    gamesBuilder = createQueryBuilder()
    gamesBuilder.order.mockResolvedValue({ data: [schemaGame], error: null })
    gamesBuilder.eq.mockResolvedValue({ error: null })
    charactersBuilder = createQueryBuilder()
    charactersBuilder.order.mockResolvedValue({ data: mockCharacters, error: null })
    const schedulesBuilder = createQueryBuilder()
    schedulesBuilder.order.mockResolvedValue({ data: [], error: null })
    from.mockImplementation((table: string) => {
      if (table === "games") return gamesBuilder
      if (table === "game_characters") return charactersBuilder
      if (table === "game_schedules") return schedulesBuilder
      return createQueryBuilder()
    })
  })

  async function openGameEditModal() {
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
    fireEvent.click(await screen.findByRole("button", { name: "게임 수정: 원신" }))
    expect(screen.getByRole("heading", { name: "게임 정보 수정" })).toBeTruthy()
  }

  async function openCharacterTab() {
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
    expect(await screen.findByText("알리스")).toBeTruthy()
  }

  it("게임 수정 모달이 슬롯·성급·분류 축을 불러오고 변경값을 classification_schema로 저장한다", async () => {
    await openGameEditModal()

    expect((screen.getByLabelText("최대 프리셋 슬롯") as HTMLInputElement).value).toBe("4")
    expect((screen.getByLabelText("성급 목록") as HTMLInputElement).value).toBe("5★, 4★")
    expect((screen.getByLabelText("분류 축 1 키") as HTMLInputElement).value).toBe("element")
    expect((screen.getByLabelText("분류 축 1 옵션") as HTMLInputElement).value).toBe("불, 물")

    fireEvent.change(screen.getByLabelText("최대 프리셋 슬롯"), { target: { value: "6" } })
    fireEvent.change(screen.getByLabelText("성급 목록"), { target: { value: "5★, 4★, 3★" } })
    fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: "불, 물, 바람" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => {
      expect(gamesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
        max_preset_slots: 6,
        classification_schema: {
          rarities: ["5★", "4★", "3★"],
          axes: [{ key: "element", label: "속성", options: ["불", "물", "바람"] }],
        },
      }))
    })
  })

  it("게임 수정 모달이 최대 돌파 단계를 불러오고 저장하며 범위를 벗어나면 저장하지 않는다", async () => {
    await openGameEditModal()

    expect((screen.getByLabelText("최대 돌파 단계") as HTMLInputElement).value).toBe("5")

    fireEvent.change(screen.getByLabelText("최대 돌파 단계"), { target: { value: "13" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
    expect(gamesBuilder.update).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("최대 돌파 단계"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
    await waitFor(() => {
      expect(gamesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ max_breakthrough: 0 }))
    })
  })

  it("성급이 10개를 초과하면 저장하지 않는다", async () => {
    await openGameEditModal()

    fireEvent.change(screen.getByLabelText("성급 목록"), {
      target: { value: "1★, 2★, 3★, 4★, 5★, 6★, 7★, 8★, 9★, 10★, 11★" },
    })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    expect(await screen.findByText("성급은 비어 있지 않은 문자열을 최대 10개까지 입력할 수 있습니다.")).toBeTruthy()
    expect(gamesBuilder.update).not.toHaveBeenCalled()
  })

  it("분류 축 키를 입력해도 입력란이 다시 마운트되지 않는다 (안정적인 행 key)", async () => {
    await openGameEditModal()

    const keyInput = screen.getByLabelText("분류 축 1 키") as HTMLInputElement
    fireEvent.change(keyInput, { target: { value: "elem" } })
    fireEvent.change(keyInput, { target: { value: "element2" } })

    const afterInput = screen.getByLabelText("분류 축 1 키") as HTMLInputElement
    expect(afterInput).toBe(keyInput)
    expect(keyInput.isConnected).toBe(true)
    expect(afterInput.value).toBe("element2")
  })

  it("기존 캐릭터가 쓰는 성급·분류 옵션을 제거하면 사용 인원 경고를 보이고 재확인 후 저장한다 (§7.3.4)", async () => {
    await openGameEditModal()

    fireEvent.change(screen.getByLabelText("성급 목록"), { target: { value: "5★" } })
    fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: "불" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    const warning = await screen.findByText(/제거되는 분류 값을 사용 중인 캐릭터가 있음/)
    expect(warning.textContent).toContain("성급 '4★' 2명")
    expect(warning.textContent).toContain("속성 '물' 1명")
    expect(gamesBuilder.update).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
    await waitFor(() => {
      expect(gamesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
        classification_schema: {
          rarities: ["5★"],
          axes: [{ key: "element", label: "속성", options: ["불"] }],
        },
      }))
    })
  })

  it("사용 중이지 않은 옵션만 변경하면 경고 없이 바로 저장한다", async () => {
    await openGameEditModal()

    fireEvent.change(screen.getByLabelText("성급 목록"), { target: { value: "5★, 4★, 3★" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => expect(gamesBuilder.update).toHaveBeenCalled())
    expect(screen.queryByText(/제거되는 분류 값을 사용 중인 캐릭터가 있음/)).toBeNull()
  })

  it("캐릭터 관리 탭에서 성급 필터와 이름 검색으로 목록을 좁힌다", async () => {
    await openCharacterTab()
    expect(screen.getByText("보리스")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("캐릭터 성급 필터"), { target: { value: "4★" } })
    expect(screen.queryByText("알리스")).toBeNull()
    expect(screen.getByText("보리스")).toBeTruthy()
    expect(screen.getByText("카린")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("캐릭터 이름 검색"), { target: { value: "카" } })
    expect(screen.queryByText("보리스")).toBeNull()
    expect(screen.getByText("카린")).toBeTruthy()
  })

  it("캐릭터 삭제는 영향 안내가 포함된 확인 다이얼로그를 거친 뒤에만 실행된다", async () => {
    charactersBuilder.delete.mockReturnValue(charactersBuilder)
    charactersBuilder.eq.mockResolvedValue({ error: null })
    await openCharacterTab()

    const characterRow = screen.getByText("알리스").closest("div.flex.items-center.justify-between") as HTMLElement
    fireEvent.click(within(characterRow).getByRole("button", { name: "삭제" }))

    expect(screen.getByRole("heading", { name: "캐릭터 삭제 확인" })).toBeTruthy()
    expect(screen.getByText(/보유 정보와 프리셋 슬롯에서도 제거되며 복구할 수 없습니다/)).toBeTruthy()
    expect(charactersBuilder.delete).not.toHaveBeenCalled()

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }))

    await waitFor(() => {
      expect(charactersBuilder.delete).toHaveBeenCalled()
      expect(charactersBuilder.eq).toHaveBeenCalledWith("id", "char-1")
    })
  })

  it("캐릭터 삭제 확인에서 취소하면 삭제하지 않는다", async () => {
    charactersBuilder.delete.mockReturnValue(charactersBuilder)
    await openCharacterTab()

    const characterRow = screen.getByText("알리스").closest("div.flex.items-center.justify-between") as HTMLElement
    fireEvent.click(within(characterRow).getByRole("button", { name: "삭제" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }))

    await waitFor(() => expect(screen.queryByRole("heading", { name: "캐릭터 삭제 확인" })).toBeNull())
    expect(charactersBuilder.delete).not.toHaveBeenCalled()
  })

  it("아이콘 없이 캐릭터를 저장하면 폼 단계에서 막고 DB를 호출하지 않는다", async () => {
    charactersBuilder.insert.mockResolvedValue({ error: null })
    await openCharacterTab()

    fireEvent.click(screen.getByRole("button", { name: "캐릭터 추가" }))
    fireEvent.change(screen.getByLabelText("캐릭터 이름"), { target: { value: "신규" } })
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("캐릭터 기본 아이콘 파일을 업로드하거나 URL을 입력해 주세요.")).toBeTruthy()
    expect(charactersBuilder.insert).not.toHaveBeenCalled()
    expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
  })

  it("아이콘 URL이 있으면 캐릭터를 WebP Data URL·성급·분류와 함께 등록한다", async () => {
    charactersBuilder.insert.mockResolvedValue({ error: null })
    await openCharacterTab()

    fireEvent.click(screen.getByRole("button", { name: "캐릭터 추가" }))
    fireEvent.change(screen.getByLabelText("캐릭터 이름"), { target: { value: "신규" } })
    fireEvent.change(screen.getByLabelText("성급"), { target: { value: "5★" } })
    fireEvent.change(screen.getByLabelText("속성"), { target: { value: "물" } })
    fireEvent.change(screen.getByLabelText("기본 아이콘 URL"), { target: { value: "https://example.com/new.png" } })
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() => {
      expect(charactersBuilder.insert).toHaveBeenCalledWith({
        game_id: "game-1",
        name: "신규",
        rarity: "5★",
        attributes: { element: "물" },
        default_icon_url: "data:image/webp;base64,converted",
      })
    })
    expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://example.com/new.png")
  })
})
