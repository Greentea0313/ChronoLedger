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

  describe("픽업 캐릭터 선택·새 픽업 캐릭터 등록 (R52 A1)", () => {
    const pickupCharacters = [
      { id: "c1", game_id: "game-1", name: "카프카", rarity: null, attributes: {}, default_icon_url: "data:image/webp;base64,a", is_pickup_only: false },
      { id: "c2", game_id: "game-1", name: "블랙 스완", rarity: null, attributes: {}, default_icon_url: null, is_pickup_only: true },
    ]
    let charactersBuilder: ReturnType<typeof createQueryBuilder>

    function renderWithCharacters(characters = pickupCharacters, schedules: unknown[] = mockSchedules) {
      charactersBuilder = createQueryBuilder()
      charactersBuilder.order.mockResolvedValue({ data: characters, error: null })
      schedulesBuilder.order.mockResolvedValue({ data: schedules, error: null })
      schedulesBuilder.insert.mockResolvedValue({ error: null })
      schedulesBuilder.update.mockReturnValue(schedulesBuilder)
      schedulesBuilder.eq.mockResolvedValue({ error: null })
      from.mockImplementation((table: string) => {
        if (table === "games") return gamesBuilder
        if (table === "game_schedules") return schedulesBuilder
        if (table === "game_characters") return charactersBuilder
        return createQueryBuilder()
      })
      render(<AdminPage />)
    }

    async function openNewPickupForm(gameValue: string) {
      fireEvent.click(await screen.findByRole("button", { name: "새 일정 등록" }))
      fireEvent.change(screen.getByLabelText("게임 선택 *"), { target: { value: gameValue } })
      fireEvent.change(screen.getByLabelText("일정 타입 *"), { target: { value: "PICKUP" } })
    }
    const fillDates = () => {
      fireEvent.change(screen.getByLabelText("시작일 *"), { target: { value: "2026-10-01" } })
      fireEvent.change(screen.getByLabelText("종료일 *"), { target: { value: "2026-10-20" } })
    }

    it("캐릭터가 등록된 게임은 캐릭터 피커를 보여주고 선택에 맞춰 제목을 자동 완성한다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")

      expect(screen.getByText("픽업 캐릭터 선택 (단일 또는 복수)")).toBeTruthy()
      expect(screen.queryByLabelText("픽업 캐릭터 이미지 파일")).toBeNull()
      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      expect((screen.getByLabelText("타이틀 *") as HTMLInputElement).value).toBe("카프카 픽업")
      fireEvent.click(screen.getByRole("button", { name: /블랙 스완/ }))
      expect((screen.getByLabelText("타이틀 *") as HTMLInputElement).value).toBe("카프카 · 블랙 스완 픽업")
      expect(screen.getByRole("button", { name: "카프카" }).getAttribute("aria-pressed")).toBe("true")
    })

    it("제목을 직접 수정하면 이후 선택이 제목을 덮어쓰지 않는다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")

      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fireEvent.change(screen.getByLabelText("타이틀 *"), { target: { value: "직접 입력한 제목" } })
      fireEvent.click(screen.getByRole("button", { name: /블랙 스완/ }))

      expect((screen.getByLabelText("타이틀 *") as HTMLInputElement).value).toBe("직접 입력한 제목")
    })

    it("선택한 캐릭터 ID를 순서대로 저장하고 이미지 키는 보내지 않는다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")
      fireEvent.click(screen.getByRole("button", { name: /블랙 스완/ }))
      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fillDates()
      fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))

      await waitFor(() => expect(schedulesBuilder.insert).toHaveBeenCalled())
      const payload = schedulesBuilder.insert.mock.calls[0][0]
      expect(payload).toMatchObject({ game_id: "game-1", schedule_type: "PICKUP", pickup_character_ids: ["c2", "c1"] })
      expect(payload).not.toHaveProperty("pickup_image_url")
      expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
    })

    it("픽업 캐릭터는 최대 8명까지만 선택할 수 있다", async () => {
      const many = Array.from({ length: 9 }, (_, index) => ({ ...pickupCharacters[0], id: `m${index}`, name: `캐릭터${index}` }))
      renderWithCharacters(many)
      await openNewPickupForm("game-1")
      many.slice(0, 8).forEach((character) => fireEvent.click(screen.getByRole("button", { name: character.name })))

      expect((screen.getByRole("button", { name: "캐릭터8" }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.getByText("8 / 8")).toBeTruthy()
    })

    it("정식 캐릭터와 픽업 전용 캐릭터를 함께 보여주고 픽업 전용에는 배지를 붙인다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")

      const picker = screen.getByTestId("pickup-character-picker")
      expect(within(picker).getByRole("button", { name: "카프카" })).toBeTruthy()
      const pickupOnly = within(picker).getByRole("button", { name: /블랙 스완/ })
      expect(pickupOnly.textContent).toContain("픽업 전용")
      expect(within(within(picker).getByRole("button", { name: "카프카" })).queryByText("픽업 전용")).toBeNull()
    })

    it("캐릭터가 없는 게임도 피커와 새 픽업 캐릭터 등록 버튼을 보여준다 (이미지 입력 모드 폐기)", async () => {
      renderWithCharacters([])
      await openNewPickupForm("game-2")

      expect(screen.getByText("픽업 캐릭터 선택 (단일 또는 복수)")).toBeTruthy()
      expect(screen.getByText("등록된 캐릭터가 없습니다. 아래에서 새 픽업 캐릭터를 등록해 주세요.")).toBeTruthy()
      expect(screen.getByRole("button", { name: "+ 새 픽업 캐릭터" })).toBeTruthy()
      expect(screen.queryByLabelText("픽업 캐릭터 이미지 (선택)")).toBeNull()
    })

    function mockNewPickupInsert(result: { data: unknown; error: unknown }) {
      const single = vi.fn().mockResolvedValue(result)
      const select = vi.fn().mockReturnValue({ single })
      charactersBuilder.insert.mockReturnValue({ select })
      return { select, single }
    }

    it("새 픽업 캐릭터를 픽업 전용으로 등록하고 즉시 선택하며 제목을 자동 완성한다", async () => {
      convertIconSourceToDataUrl.mockResolvedValue("data:image/webp;base64,new256")
      renderWithCharacters([])
      const chain = mockNewPickupInsert({
        data: { id: "np1", game_id: "game-2", name: "신규 캐릭", rarity: null, default_icon_url: "data:image/webp;base64,new256", is_pickup_only: true },
        error: null,
      })
      await openNewPickupForm("game-2")
      fireEvent.click(screen.getByRole("button", { name: "+ 새 픽업 캐릭터" }))
      fireEvent.change(screen.getByLabelText("새 픽업 캐릭터 이름 *"), { target: { value: " 신규 캐릭 " } })
      fireEvent.change(screen.getByLabelText("이미지 (선택)"), { target: { value: "https://example.com/new.png" } })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))

      await waitFor(() => expect(charactersBuilder.insert).toHaveBeenCalled())
      expect(charactersBuilder.insert).toHaveBeenCalledWith({
        game_id: "game-2",
        name: "신규 캐릭",
        default_icon_url: "data:image/webp;base64,new256",
        is_pickup_only: true,
      })
      expect(convertIconSourceToDataUrl).toHaveBeenCalledWith("https://example.com/new.png")
      expect(chain.select).toHaveBeenCalledWith("id, game_id, name, rarity, attributes, default_icon_url, is_pickup_only")
      const added = await screen.findByRole("button", { name: /신규 캐릭/ })
      expect(added.getAttribute("aria-pressed")).toBe("true")
      expect(added.textContent).toContain("픽업 전용")
      expect((screen.getByLabelText("타이틀 *") as HTMLInputElement).value).toBe("신규 캐릭 픽업")
      expect(screen.queryByTestId("new-pickup-character-form")).toBeNull()

      fillDates()
      fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))
      await waitFor(() => expect(schedulesBuilder.insert).toHaveBeenCalled())
      expect(schedulesBuilder.insert.mock.calls[0][0]).toMatchObject({ pickup_character_ids: ["np1"] })
      expect(schedulesBuilder.insert.mock.calls[0][0]).not.toHaveProperty("pickup_image_url")
    })

    it("이미지 없이도 새 픽업 캐릭터를 등록할 수 있다 (아이콘 null)", async () => {
      renderWithCharacters([])
      mockNewPickupInsert({
        data: { id: "np2", game_id: "game-2", name: "이미지 없음", rarity: null, default_icon_url: null, is_pickup_only: true },
        error: null,
      })
      await openNewPickupForm("game-2")
      fireEvent.click(screen.getByRole("button", { name: "+ 새 픽업 캐릭터" }))
      fireEvent.change(screen.getByLabelText("새 픽업 캐릭터 이름 *"), { target: { value: "이미지 없음" } })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))

      await waitFor(() => expect(charactersBuilder.insert).toHaveBeenCalled())
      expect(charactersBuilder.insert).toHaveBeenCalledWith({ game_id: "game-2", name: "이미지 없음", default_icon_url: null, is_pickup_only: true })
      expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
      expect(await screen.findByRole("button", { name: /이미지 없음/ })).toBeTruthy()
    })

    it("새 픽업 캐릭터 입력 검증: 이름 필수, 중복 이름, 상한 8명, 오프라인", async () => {
      renderWithCharacters()
      mockNewPickupInsert({ data: null, error: null })
      await openNewPickupForm("game-1")
      fireEvent.click(screen.getByRole("button", { name: "+ 새 픽업 캐릭터" }))

      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText("캐릭터 이름을 1~100자로 입력해 주세요.")).toBeTruthy()

      fireEvent.change(screen.getByLabelText("새 픽업 캐릭터 이름 *"), { target: { value: "카프카" } })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText("같은 이름의 캐릭터가 이미 있습니다. 목록에서 선택해 주세요.")).toBeTruthy()

      fireEvent.change(screen.getByLabelText("새 픽업 캐릭터 이름 *"), { target: { value: "오프라인 캐릭" } })
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText(/오프라인 상태에서는 저장할 수 없습니다/)).toBeTruthy()
      Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
      expect(charactersBuilder.insert).not.toHaveBeenCalled()
    })

    it("새 픽업 캐릭터 등록 실패(중복 키·변환 실패·용량 초과)는 오류를 보여주고 선택하지 않는다", async () => {
      renderWithCharacters([])
      mockNewPickupInsert({ data: null, error: { code: "23505", message: "dup" } })
      await openNewPickupForm("game-2")
      fireEvent.click(screen.getByRole("button", { name: "+ 새 픽업 캐릭터" }))
      fireEvent.change(screen.getByLabelText("새 픽업 캐릭터 이름 *"), { target: { value: "경합" } })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText("같은 이름의 캐릭터가 이미 있습니다.")).toBeTruthy()

      convertIconSourceToDataUrl.mockRejectedValueOnce(new Error("이미지 URL을 가져오지 못했습니다."))
      fireEvent.change(screen.getByLabelText("이미지 (선택)"), { target: { value: "https://bad.example/x.png" } })
      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText("이미지 URL을 가져오지 못했습니다.")).toBeTruthy()

      convertIconSourceToDataUrl.mockResolvedValueOnce(`data:image/webp;base64,${"A".repeat(150_000)}`)
      fireEvent.click(screen.getByRole("button", { name: "등록" }))
      expect(await screen.findByText(/이미지 용량이 너무 큽니다/)).toBeTruthy()
      expect(screen.queryByRole("button", { name: /경합/ })).toBeNull()
    })

    it("선택한 캐릭터를 모두 지우고 저장하면 원본에 있던 pickup_character_ids를 빈 배열로 초기화한다", async () => {
      const pickupSchedule = {
        id: "schedule-pk2",
        game_id: "game-1",
        schedule_type: "PICKUP",
        title: "카프카 픽업",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        memo: null,
        pickup_character_ids: ["c1", "c2"],
        games: { id: "game-1", name: "원신" },
      }
      renderWithCharacters(pickupCharacters, [pickupSchedule])
      fireEvent.click(await screen.findByRole("button", { name: "일정 수정: 카프카 픽업" }))
      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fireEvent.click(screen.getByRole("button", { name: /블랙 스완/ }))
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => expect(schedulesBuilder.update).toHaveBeenCalled())
      expect(schedulesBuilder.update.mock.calls[0][0]).toMatchObject({ pickup_character_ids: [] })
      expect(schedulesBuilder.update.mock.calls[0][0]).not.toHaveProperty("pickup_image_url")
    })

    it("캐릭터 검색으로 피커 목록을 좁힌다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")
      fireEvent.change(screen.getByLabelText("픽업 캐릭터 검색"), { target: { value: "블랙" } })

      expect(screen.queryByRole("button", { name: "카프카" })).toBeNull()
      expect(screen.getByRole("button", { name: /블랙 스완/ })).toBeTruthy()
    })

    it("PICKUP이 아닌 타입으로 바꾸면 픽업 선택을 비우고 페이로드에서 제외한다", async () => {
      renderWithCharacters()
      await openNewPickupForm("game-1")
      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fireEvent.change(screen.getByLabelText("일정 타입 *"), { target: { value: "CONTENTS" } })
      expect(screen.queryByText("픽업 캐릭터 선택 (단일 또는 복수)")).toBeNull()
      fireEvent.change(screen.getByLabelText("타이틀 *"), { target: { value: "이벤트" } })
      fillDates()
      fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))

      await waitFor(() => expect(schedulesBuilder.insert).toHaveBeenCalled())
      expect(schedulesBuilder.insert.mock.calls[0][0]).not.toHaveProperty("pickup_character_ids")
    })

    it("수정 시 원본에 있던 픽업 캐릭터를 비우면 빈 배열로 초기화하고, 타입을 바꾸면 함께 비운다", async () => {
      const pickupSchedule = {
        id: "schedule-pk",
        game_id: "game-1",
        schedule_type: "PICKUP",
        title: "카프카 픽업",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        memo: null,
        pickup_character_ids: ["c1"],
        pickup_image_url: null,
        games: { id: "game-1", name: "원신" },
      }
      renderWithCharacters(pickupCharacters, [pickupSchedule])
      fireEvent.click(await screen.findByRole("button", { name: "일정 수정: 카프카 픽업" }))
      expect(screen.getByRole("button", { name: "카프카" }).getAttribute("aria-pressed")).toBe("true")

      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
      await waitFor(() => expect(schedulesBuilder.update).toHaveBeenCalled())
      expect(schedulesBuilder.update.mock.calls[0][0]).toMatchObject({ pickup_character_ids: [] })
    })

    it("픽업 필드를 보낸 저장이 마이그레이션 오류나 트리거 예외로 실패하면 R52 안내를 보여준다", async () => {
      renderWithCharacters()
      schedulesBuilder.insert.mockResolvedValue({ error: { code: "P0001", message: "픽업 캐릭터는 같은 게임의 카탈로그에 있어야 합니다." } })
      await openNewPickupForm("game-1")
      fireEvent.click(screen.getByRole("button", { name: "카프카" }))
      fillDates()
      fireEvent.click(screen.getByRole("button", { name: "일정 등록" }))

      expect(await screen.findByText(/R52 마이그레이션이 적용되지 않았거나 픽업 캐릭터 조건/)).toBeTruthy()
    })
  })

  describe("복각(is_rerun) 처리 (R33 회귀)", () => {
    const rerunSchedule = {
      id: "schedule-3",
      game_id: "game-2",
      schedule_type: "PICKUP",
      is_rerun: true,
      title: "복각 픽업 A",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      memo: null,
      games: { id: "game-2", name: "붕괴: 스타레일" },
    }

    it("PICKUP을 선택했을 때만 복각 토글이 노출된다", async () => {
      render(<AdminPage />)
      expect(await screen.findByText("등록된 일정")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: /일정 추가|새 일정/ }))
      const typeSelect = screen.getByLabelText("일정 타입 *") as HTMLSelectElement
      expect(screen.queryByLabelText("복각 일정")).toBeNull()

      fireEvent.change(typeSelect, { target: { value: "PICKUP" } })
      expect(screen.getByLabelText("복각 일정")).toBeTruthy()

      fireEvent.change(typeSelect, { target: { value: "CONTENTS" } })
      expect(screen.queryByLabelText("복각 일정")).toBeNull()
    })

    it("원본이 복각이었던 일정을 수정에서 해제하면 is_rerun: false를 전송한다", async () => {
      schedulesBuilder.order.mockResolvedValue({ data: [...mockSchedules, rerunSchedule], error: null })
      schedulesBuilder.update.mockReturnValue(schedulesBuilder)
      schedulesBuilder.eq.mockResolvedValue({ error: null })

      render(<AdminPage />)
      expect(await screen.findByText("등록된 일정")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "일정 수정: 복각 픽업 A" }))
      const toggle = screen.getByLabelText("복각 일정") as HTMLInputElement
      expect(toggle.checked).toBe(true)
      fireEvent.click(toggle)
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => {
        expect(schedulesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ is_rerun: false }))
      })
    })

    it("원본이 복각이 아니면 수정 저장 시 is_rerun 키를 보내지 않는다", async () => {
      schedulesBuilder.update.mockReturnValue(schedulesBuilder)
      schedulesBuilder.eq.mockResolvedValue({ error: null })

      render(<AdminPage />)
      expect(await screen.findByText("등록된 일정")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "일정 수정: 아케론 복각" }))
      expect((screen.getByLabelText("복각 일정") as HTMLInputElement).checked).toBe(false)
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => expect(schedulesBuilder.update).toHaveBeenCalled())
      expect(schedulesBuilder.update.mock.calls[0][0]).not.toHaveProperty("is_rerun")
    })

    it("복각이 유지된 채 수정하면 is_rerun: true를 전송한다", async () => {
      schedulesBuilder.order.mockResolvedValue({ data: [...mockSchedules, rerunSchedule], error: null })
      schedulesBuilder.update.mockReturnValue(schedulesBuilder)
      schedulesBuilder.eq.mockResolvedValue({ error: null })

      render(<AdminPage />)
      expect(await screen.findByText("등록된 일정")).toBeTruthy()

      fireEvent.click(screen.getByRole("button", { name: "일정 수정: 복각 픽업 A" }))
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => {
        expect(schedulesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ is_rerun: true }))
      })
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

  it("게임 수정 모달이 슬롯·레어도·분류 축을 불러오고 변경값을 classification_schema로 저장한다", async () => {
    await openGameEditModal()

    expect((screen.getByLabelText("최대 프리셋 슬롯") as HTMLInputElement).value).toBe("4")
    expect((screen.getByLabelText("레어도 목록") as HTMLInputElement).value).toBe("5★, 4★")
    // The internal axis key is no longer editable (R57): it stays hidden and is preserved on save.
    expect(screen.queryByLabelText("분류 축 1 키")).toBeNull()
    expect((screen.getByLabelText("분류 축 1 옵션") as HTMLInputElement).value).toBe("불, 물")

    fireEvent.change(screen.getByLabelText("최대 프리셋 슬롯"), { target: { value: "6" } })
    fireEvent.change(screen.getByLabelText("레어도 목록"), { target: { value: "5★, 4★, 3★" } })
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

  it("레어도가 10개를 초과하면 저장하지 않는다", async () => {
    await openGameEditModal()

    fireEvent.change(screen.getByLabelText("레어도 목록"), {
      target: { value: "1★, 2★, 3★, 4★, 5★, 6★, 7★, 8★, 9★, 10★, 11★" },
    })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    expect(await screen.findByText("레어도는 비어 있지 않은 문자열을 최대 10개까지 입력할 수 있습니다.")).toBeTruthy()
    expect(gamesBuilder.update).not.toHaveBeenCalled()
  })

  it("분류 축 이름을 입력해도 입력란이 다시 마운트되지 않는다 (안정적인 행 key)", async () => {
    await openGameEditModal()

    const nameInput = screen.getByLabelText("분류 축 1 이름") as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: "원소" } })
    fireEvent.change(nameInput, { target: { value: "원소 속성" } })

    const afterInput = screen.getByLabelText("분류 축 1 이름") as HTMLInputElement
    expect(afterInput).toBe(nameInput)
    expect(nameInput.isConnected).toBe(true)
    expect(afterInput.value).toBe("원소 속성")
  })

  it("기존 캐릭터가 쓰는 레어도·분류 옵션을 제거하면 사용 인원 경고를 보이고 재확인 후 저장한다 (§7.3.4)", async () => {
    await openGameEditModal()

    fireEvent.change(screen.getByLabelText("레어도 목록"), { target: { value: "5★" } })
    fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: "불" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    const warning = await screen.findByText(/제거되는 분류 값을 사용 중인 캐릭터가 있음/)
    expect(warning.textContent).toContain("레어도 '4★' 2명")
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

    fireEvent.change(screen.getByLabelText("레어도 목록"), { target: { value: "5★, 4★, 3★" } })
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => expect(gamesBuilder.update).toHaveBeenCalled())
    expect(screen.queryByText(/제거되는 분류 값을 사용 중인 캐릭터가 있음/)).toBeNull()
  })

  it("캐릭터 관리 탭에서 레어도 필터와 이름 검색으로 목록을 좁힌다", async () => {
    await openCharacterTab()
    expect(screen.getByText("보리스")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("캐릭터 레어도 필터"), { target: { value: "4★" } })
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
    fireEvent.change(screen.getByLabelText("캐릭터 이름 *"), { target: { value: "신규" } })
    fireEvent.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("캐릭터 기본 아이콘 파일을 업로드하거나 URL을 입력해 주세요.")).toBeTruthy()
    expect(charactersBuilder.insert).not.toHaveBeenCalled()
    expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
  })

  it("아이콘 URL이 있으면 캐릭터를 WebP Data URL·레어도·분류와 함께 등록한다", async () => {
    charactersBuilder.insert.mockResolvedValue({ error: null })
    await openCharacterTab()

    fireEvent.click(screen.getByRole("button", { name: "캐릭터 추가" }))
    fireEvent.change(screen.getByLabelText("캐릭터 이름 *"), { target: { value: "신규" } })
    fireEvent.change(screen.getByLabelText("등급 *"), { target: { value: "5★" } })
    fireEvent.change(screen.getByLabelText("속성 *"), { target: { value: "물" } })
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

  describe("R52 동적 캐릭터 템플릿", () => {
    const labeledGame = {
      ...schemaGame,
      classification_schema: {
        character_label: "공명자",
        rarities: ["5성", "4성"],
        axes: [
          { key: "element", label: "속성", options: ["기류", "전도"] },
          { key: "weapon", label: "무기", options: ["직검", "권총"] },
        ],
      },
    }
    const labeledCharacters = [
      { id: "c-low", game_id: "game-1", name: "가 낮은 등급", rarity: "4성", attributes: { element: "기류", weapon: "직검" }, default_icon_url: "data:image/webp;base64,a" },
      { id: "c-high", game_id: "game-1", name: "나 높은 등급", rarity: "5성", attributes: { element: "전도", weapon: "권총" }, default_icon_url: "data:image/webp;base64,b" },
    ]
    const emptyGame = { id: "game-2", name: "신규게임", default_icon_url: "data:image/webp;base64,own", max_preset_slots: 4, max_breakthrough: 6, classification_schema: { rarities: [], axes: [] } }

    async function openCharacterTabWith(games: unknown[], characters: unknown[]) {
      gamesBuilder.order.mockResolvedValue({ data: games, error: null })
      charactersBuilder.order.mockResolvedValue({ data: characters, error: null })
      render(<AdminPage />)
      fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
      await screen.findByLabelText("캐릭터 게임 필터")
    }
    const selectGame = (id: string) => fireEvent.change(screen.getByLabelText("캐릭터 게임 필터"), { target: { value: id } })

    it("게임을 선택하면 character_label 이름·등급·분류 컬럼의 동적 테이블을 등급 순서대로 보여준다", async () => {
      await openCharacterTabWith([labeledGame], labeledCharacters)
      selectGame("game-1")

      const table = await screen.findByTestId("character-table")
      const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent)
      expect(headers).toEqual(["아이콘", "공명자 이름", "등급", "속성", "무기", "관리"])
      const names = Array.from(table.querySelectorAll("tbody tr td:nth-child(2)")).map((td) => td.textContent)
      expect(names).toEqual(["나 높은 등급", "가 낮은 등급"])
      expect(screen.getByRole("button", { name: "공명자 추가" })).toBeTruthy()
      expect(screen.getByRole("button", { name: "템플릿 설정 수정" })).toBeTruthy()
    })

    it("설정되지 않은 분류 기준 컬럼은 숨기고 character_label이 없으면 캐릭터를 쓴다", async () => {
      await openCharacterTabWith([schemaGame], mockCharacters)
      selectGame("game-1")

      const table = await screen.findByTestId("character-table")
      expect(Array.from(table.querySelectorAll("th")).map((th) => th.textContent)).toEqual(["아이콘", "캐릭터 이름", "등급", "속성", "관리"])
    })

    it("템플릿이 없고 캐릭터도 없는 게임은 안내 카드와 캐릭터 템플릿 생성 버튼만 보여준다", async () => {
      await openCharacterTabWith([schemaGame, emptyGame], mockCharacters)
      selectGame("game-2")

      expect(await screen.findByText("신규게임의 캐릭터 테이블이 아직 생성되지 않았습니다.")).toBeTruthy()
      expect(screen.getByRole("button", { name: "캐릭터 템플릿 생성" })).toBeTruthy()
      expect(screen.queryByRole("button", { name: "캐릭터 추가" })).toBeNull()
      expect(screen.queryByTestId("character-table")).toBeNull()
    })

    it("등급 없이 캐릭터만 있는 기존 게임은 템플릿 활성으로 보고 설정 유도 배너를 보여준다 (NR-09)", async () => {
      const legacyGame = { ...schemaGame, classification_schema: { rarities: [], axes: [] } }
      await openCharacterTabWith([legacyGame], [{ ...mockCharacters[0], rarity: null, attributes: {} }])
      selectGame("game-1")

      expect(await screen.findByTestId("character-table")).toBeTruthy()
      expect(screen.getByRole("status").textContent).toContain("등급이 설정되지 않은 게임입니다")
      expect(screen.getByRole("button", { name: "캐릭터 추가" })).toBeTruthy()
    })

    it("템플릿 생성 후 저장하면 character_label을 포함한 스키마를 저장하고 첫 캐릭터 폼을 자동으로 연다", async () => {
      gamesBuilder.update.mockReturnValue(gamesBuilder)
      await openCharacterTabWith([schemaGame, emptyGame], mockCharacters)
      selectGame("game-2")
      fireEvent.click(await screen.findByRole("button", { name: "캐릭터 템플릿 생성" }))

      expect(screen.getByRole("heading", { name: "신규게임 캐릭터 템플릿 생성" })).toBeTruthy()
      fireEvent.change(screen.getByLabelText("캐릭터 시스템 명칭"), { target: { value: "오퍼레이터" } })
      fireEvent.change(screen.getByLabelText("등급 목록 (최고 등급부터) *"), { target: { value: "S급, A급" } })
      fireEvent.click(screen.getByRole("button", { name: "축 추가" }))
      fireEvent.change(screen.getByLabelText("분류 축 1 이름"), { target: { value: "직군" } })
      fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: "선봉, 중무장" } })
      // The refetch after saving returns the persisted template.
      gamesBuilder.order.mockResolvedValue({
        data: [schemaGame, { ...emptyGame, classification_schema: { character_label: "오퍼레이터", rarities: ["S급", "A급"], axes: [{ key: "class1", label: "직군", options: ["선봉", "중무장"] }] } }],
        error: null,
      })
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => {
        expect(gamesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
          classification_schema: {
            character_label: "오퍼레이터",
            rarities: ["S급", "A급"],
            axes: [{ key: "class1", label: "직군", options: ["선봉", "중무장"] }],
          },
        }))
      })
      expect(await screen.findByRole("heading", { name: "신규게임 오퍼레이터 추가" })).toBeTruthy()
      expect(screen.getByLabelText("오퍼레이터 이름 *")).toBeTruthy()
      expect(screen.getByLabelText("직군 *")).toBeTruthy()
    })

    it("템플릿 모달은 게임 이름·아이콘 입력 없이 템플릿 컬럼만 저장하고, 상대 경로 아이콘 게임도 저장된다", async () => {
      gamesBuilder.update.mockReturnValue(gamesBuilder)
      const seedGame = { ...emptyGame, default_icon_url: "/assets/games/endfield.png" }
      await openCharacterTabWith([schemaGame, seedGame], mockCharacters)
      selectGame("game-2")
      fireEvent.click(await screen.findByRole("button", { name: "캐릭터 템플릿 생성" }))

      expect(screen.queryByLabelText("게임 이름 *")).toBeNull()
      expect(screen.queryByLabelText("기본 아이콘 URL")).toBeNull()
      expect(screen.queryByLabelText("기본 아이콘 파일")).toBeNull()
      fireEvent.change(screen.getByLabelText("등급 목록 (최고 등급부터) *"), { target: { value: "6성, 5성" } })
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => expect(gamesBuilder.update).toHaveBeenCalledTimes(1))
      const payload = gamesBuilder.update.mock.calls[0][0] as Record<string, unknown>
      expect(Object.keys(payload).sort()).toEqual(["classification_schema", "max_breakthrough", "max_preset_slots"])
      expect(payload.classification_schema).toEqual({ rarities: ["6성", "5성"], axes: [] })
      expect(screen.queryByText("아이콘 URL이 올바른 주소 형식이 아닙니다.")).toBeNull()
    })

    it("템플릿 생성 모달을 저장 없이 닫으면 첫 캐릭터 폼을 열지 않는다", async () => {
      await openCharacterTabWith([schemaGame, emptyGame], mockCharacters)
      selectGame("game-2")
      fireEvent.click(await screen.findByRole("button", { name: "캐릭터 템플릿 생성" }))
      fireEvent.click(screen.getByRole("button", { name: "취소" }))

      await waitFor(() => expect(screen.queryByRole("heading", { name: "신규게임 캐릭터 템플릿 생성" })).toBeNull())
      expect(screen.queryByRole("heading", { name: /캐릭터 추가/ })).toBeNull()
    })

    it("기존 character_label은 게임 수정 시 그대로 불러오고 유지한다", async () => {
      gamesBuilder.update.mockReturnValue(gamesBuilder)
      gamesBuilder.order.mockResolvedValue({ data: [labeledGame], error: null })
      render(<AdminPage />)
      fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
      fireEvent.click(await screen.findByRole("button", { name: "게임 수정: 원신" }))

      expect((screen.getByLabelText("캐릭터 시스템 명칭") as HTMLInputElement).value).toBe("공명자")
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      await waitFor(() => {
        expect(gamesBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
          classification_schema: expect.objectContaining({
            character_label: "공명자",
            axes: [
              { key: "element", label: "속성", options: ["기류", "전도"] },
              { key: "weapon", label: "무기", options: ["직검", "권총"] },
            ],
          }),
        }))
      })
    })

    describe("템플릿 게이트와 입력 검증 (R57)", () => {
      const addButton = () => screen.getByRole("button", { name: "캐릭터 추가" })
      const gateGames = [schemaGame, emptyGame]

      it("전체 필터에서 템플릿 없는 게임을 고르면 입력·저장을 숨기고 템플릿 생성 안내를 보여준다", async () => {
        await openCharacterTabWith(gateGames, mockCharacters)
        fireEvent.click(addButton())
        const dialog = screen.getByRole("dialog")
        fireEvent.change(within(dialog).getByLabelText("대상 게임"), { target: { value: "game-2" } })

        expect(within(dialog).getByText("신규게임은(는) 캐릭터 템플릿이 아직 없습니다. 템플릿(명칭·등급·분류 기준)을 먼저 만들어야 합니다.")).toBeTruthy()
        expect(within(dialog).queryByLabelText("캐릭터 이름 *")).toBeNull()
        expect(within(dialog).queryByRole("button", { name: "저장" })).toBeNull()
        expect(within(dialog).queryByLabelText("기본 아이콘 URL")).toBeNull()
        expect(within(dialog).getByRole("button", { name: "캐릭터 템플릿 생성" })).toBeTruthy()
      })

      it("게임 선택 목록의 템플릿 없는 게임에 (템플릿 없음)을 붙인다", async () => {
        await openCharacterTabWith(gateGames, mockCharacters)
        fireEvent.click(addButton())

        const options = Array.from(within(screen.getByRole("dialog")).getByLabelText("대상 게임").querySelectorAll("option")).map((option) => option.textContent)
        expect(options).toEqual(["게임을 선택하세요", "원신", "신규게임 (템플릿 없음)"])
      })

      it("[캐릭터 템플릿 생성]은 추가 모달을 닫고 템플릿 모달을 열며, 저장하면 첫 캐릭터 폼이 이어서 열린다", async () => {
        gamesBuilder.update.mockReturnValue(gamesBuilder)
        await openCharacterTabWith(gateGames, mockCharacters)
        fireEvent.click(addButton())
        fireEvent.change(within(screen.getByRole("dialog")).getByLabelText("대상 게임"), { target: { value: "game-2" } })
        fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "캐릭터 템플릿 생성" }))

        expect(await screen.findByRole("heading", { name: "신규게임 캐릭터 템플릿 생성" })).toBeTruthy()
        expect(screen.queryByRole("heading", { name: /캐릭터 추가/ })).toBeNull()
        gamesBuilder.order.mockResolvedValue({
          data: [schemaGame, { ...emptyGame, classification_schema: { rarities: ["S급"], axes: [] } }],
          error: null,
        })
        fireEvent.change(screen.getByLabelText("등급 목록 (최고 등급부터) *"), { target: { value: "S급" } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        expect(await screen.findByRole("heading", { name: "신규게임 캐릭터 추가" })).toBeTruthy()
        expect(screen.getByLabelText("캐릭터 이름 *")).toBeTruthy()
      })

      it("템플릿이 있는 게임과 기존 캐릭터 수정은 게이트 대상이 아니다", async () => {
        await openCharacterTabWith([schemaGame, { ...emptyGame }], [...mockCharacters, { id: "po-x", game_id: "game-2", name: "픽업 전용", rarity: null, attributes: {}, default_icon_url: null, is_pickup_only: true }])
        selectGame("game-2")
        fireEvent.click(await screen.findByRole("button", { name: "픽업 전용 수정" }))

        expect(screen.queryByTestId("character-template-gate")).toBeNull()
        expect(screen.getByLabelText("캐릭터 이름 *")).toBeTruthy()
      })

      it("등급이 하나도 없으면 템플릿 흐름에서는 저장을 막고 일반 게임 수정에서는 허용한다", async () => {
        gamesBuilder.update.mockReturnValue(gamesBuilder)
        await openCharacterTabWith(gateGames, mockCharacters)
        selectGame("game-2")
        fireEvent.click(await screen.findByRole("button", { name: "캐릭터 템플릿 생성" }))
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        expect(await screen.findByText("등급 목록을 1개 이상 입력해 주세요.")).toBeTruthy()
        expect(gamesBuilder.update).not.toHaveBeenCalled()
      })

      it("중복 등급·중복 선택지·선택지 21개를 항목별 오류로 막는다", async () => {
        await openGameEditModal()

        fireEvent.change(screen.getByLabelText("레어도 목록"), { target: { value: "5★, 4★, 5★" } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
        expect(await screen.findByText("등급 '5★'이(가) 중복되었습니다.")).toBeTruthy()

        fireEvent.change(screen.getByLabelText("레어도 목록"), { target: { value: "5★, 4★" } })
        fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: "불, 물, 불" } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
        expect(await screen.findByText("분류 기준 1(속성)의 선택지 '불'이(가) 중복되었습니다.")).toBeTruthy()

        fireEvent.change(screen.getByLabelText("분류 축 1 옵션"), { target: { value: Array.from({ length: 21 }, (_, i) => `옵션${i}`).join(", ") } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))
        expect(await screen.findByText("분류 기준 1(속성)의 선택지는 최대 20개까지 입력할 수 있습니다.")).toBeTruthy()
        expect(gamesBuilder.update).not.toHaveBeenCalled()
      })

      it("분류 기준 이름이 비어 있으면 저장하지 않는다", async () => {
        await openGameEditModal()
        fireEvent.change(screen.getByLabelText("분류 축 1 이름"), { target: { value: "  " } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        expect(await screen.findByText("분류 기준 1의 이름을 1~30자로 입력해 주세요.")).toBeTruthy()
        expect(gamesBuilder.update).not.toHaveBeenCalled()
      })

      it("축을 삭제한 뒤 다시 추가해도 내부 키가 중복되지 않고 기존 축 키는 유지된다", async () => {
        gamesBuilder.update.mockReturnValue(gamesBuilder)
        const twoAxisGame = {
          ...schemaGame,
          classification_schema: {
            rarities: ["5★"],
            axes: [
              { key: "class1", label: "속성", options: ["불"] },
              { key: "class2", label: "무기", options: ["검"] },
            ],
          },
        }
        gamesBuilder.order.mockResolvedValue({ data: [twoAxisGame], error: null })
        render(<AdminPage />)
        fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
        fireEvent.click(await screen.findByRole("button", { name: "게임 수정: 원신" }))

        // Delete axis 1 (class1), keep axis 2 (class2), add a new one: it must take class1, not a second class2.
        fireEvent.click(screen.getAllByRole("button", { name: "삭제" }).find((button) => button.closest(".grid")) as HTMLElement)
        fireEvent.click(screen.getByRole("button", { name: "축 추가" }))
        fireEvent.change(screen.getByLabelText("분류 축 2 이름"), { target: { value: "역할" } })
        fireEvent.change(screen.getByLabelText("분류 축 2 옵션"), { target: { value: "딜러" } })
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        await waitFor(() => expect(gamesBuilder.update).toHaveBeenCalled())
        const saved = gamesBuilder.update.mock.calls[0][0].classification_schema
        expect(saved.axes).toEqual([
          { key: "class2", label: "무기", options: ["검"] },
          { key: "class1", label: "역할", options: ["딜러"] },
        ])
      })

      it("템플릿 흐름이 아닌 일반 게임 수정 모달은 기존 문구를 유지한다", async () => {
        await openGameEditModal()

        expect(screen.getByRole("heading", { name: "게임 정보 수정" })).toBeTruthy()
        expect(screen.getByText("게임 명칭 및 기본 대표 아이콘 URL을 변경합니다.")).toBeTruthy()
        expect(screen.getByLabelText("레어도 목록")).toBeTruthy()
      })

      it("템플릿 모달의 제목은 기존 템플릿이 있으면 수정, 없으면 생성이며 설명을 바꾼다", async () => {
        await openCharacterTabWith([labeledGame, emptyGame], labeledCharacters)
        selectGame("game-1")
        fireEvent.click(await screen.findByRole("button", { name: "템플릿 설정 수정" }))

        expect(screen.getByRole("heading", { name: "원신 캐릭터 템플릿 수정" })).toBeTruthy()
        expect(screen.getByText("캐릭터 시스템 명칭·등급·분류 기준(최대 2개)·최대 프리셋 슬롯·최대 돌파 단계를 설정함.")).toBeTruthy()
        expect(screen.getByLabelText("등급 목록 (최고 등급부터) *")).toBeTruthy()
      })

      it.each([
        ["23514 + 제약명", { code: "23514", message: 'new row violates check constraint "games_classification_schema_check"' }],
        ["제약명만", { code: "XX000", message: "games_classification_schema_check failed" }],
        ["23514 코드만", { code: "23514", message: "check failed" }],
      ])("DB 템플릿 CHECK 위반(%s)은 원문 대신 형식 안내를 보여준다", async (_label, error) => {
        gamesBuilder.update.mockReturnValue(gamesBuilder)
        gamesBuilder.eq.mockResolvedValue({ error })
        await openGameEditModal()
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        expect(await screen.findByText("캐릭터 템플릿 형식이 올바르지 않습니다(등급·분류 기준 개수와 길이를 확인해 주세요).")).toBeTruthy()
        expect(screen.queryByText(/violates check constraint/)).toBeNull()
      })

      it("다른 CHECK 제약 위반은 원문을 그대로 보여준다", async () => {
        gamesBuilder.update.mockReturnValue(gamesBuilder)
        gamesBuilder.eq.mockResolvedValue({ error: { code: "23514", message: 'violates check constraint "games_max_breakthrough_check"' } })
        await openGameEditModal()
        fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

        expect(await screen.findByText(/games_max_breakthrough_check/)).toBeTruthy()
      })
    })

    it("분류 기준은 최대 2개까지만 추가할 수 있다", async () => {
      await openGameEditModal()
      fireEvent.click(screen.getByRole("button", { name: "축 추가" }))
      fireEvent.click(screen.getByRole("button", { name: "축 추가" }))

      expect(screen.getByLabelText("분류 축 2 이름")).toBeTruthy()
      expect(screen.queryByLabelText("분류 축 3 이름")).toBeNull()
      expect(screen.getByText("분류 기준 (최대 2개)")).toBeTruthy()
    })

    it("캐릭터 시스템 명칭이 20자를 넘으면 저장하지 않는다", async () => {
      await openGameEditModal()
      fireEvent.change(screen.getByLabelText("캐릭터 시스템 명칭"), { target: { value: "가".repeat(21) } })
      fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

      expect(await screen.findByText("캐릭터 시스템 명칭은 20자 이내로 입력해 주세요.")).toBeTruthy()
      expect(gamesBuilder.update).not.toHaveBeenCalled()
    })

    describe("픽업 전용 캐릭터 (A1 U-05)", () => {
      const pickupOnly = { id: "po-1", game_id: "game-1", name: "픽업 전용 캐릭", rarity: null, attributes: {}, default_icon_url: null, is_pickup_only: true }

      it("동적 테이블에 픽업 전용 배지를 보여주고 구분 필터로 정식/픽업 전용을 나눈다", async () => {
        await openCharacterTabWith([labeledGame], [...labeledCharacters, pickupOnly])
        selectGame("game-1")
        const table = await screen.findByTestId("character-table")

        expect(within(table).getByText("픽업 전용")).toBeTruthy()
        // 정식 캐릭터가 먼저, 등급 없는 픽업 전용은 마지막에 온다.
        expect(Array.from(table.querySelectorAll("tbody tr td:nth-child(2)")).map((td) => td.textContent)).toEqual([
          "나 높은 등급",
          "가 낮은 등급",
          "픽업 전용 캐릭픽업 전용",
        ])

        fireEvent.change(screen.getByLabelText("캐릭터 구분 필터"), { target: { value: "pickup" } })
        expect(screen.queryByText("나 높은 등급")).toBeNull()
        expect(screen.getByText("픽업 전용 캐릭")).toBeTruthy()

        fireEvent.change(screen.getByLabelText("캐릭터 구분 필터"), { target: { value: "roster" } })
        expect(screen.getByText("나 높은 등급")).toBeTruthy()
        expect(screen.queryByText("픽업 전용 캐릭")).toBeNull()
      })

      it("픽업 전용 캐릭터만 있는 게임은 템플릿 미생성 카드와 픽업 전용 목록을 함께 보여준다 (정식 캐릭터 수 기준)", async () => {
        const onlyPickupGame = { ...emptyGame }
        await openCharacterTabWith([schemaGame, onlyPickupGame], [...mockCharacters, { ...pickupOnly, game_id: "game-2" }])
        selectGame("game-2")

        expect(await screen.findByText("신규게임의 캐릭터 테이블이 아직 생성되지 않았습니다.")).toBeTruthy()
        expect(screen.getByRole("button", { name: "캐릭터 템플릿 생성" })).toBeTruthy()
        expect(screen.queryByTestId("character-table")).toBeNull()
        const list = screen.getByTestId("pickup-only-list")
        expect(within(list).getByText("픽업 전용 캐릭")).toBeTruthy()
        expect(within(list).getByText("픽업 전용")).toBeTruthy()
      })

      it("픽업 전용 캐릭터는 이름·이미지만 수정하고 등급·분류 입력과 승격 옵션은 템플릿이 없으면 숨긴다", async () => {
        charactersBuilder.update.mockReturnValue(charactersBuilder)
        charactersBuilder.eq.mockResolvedValue({ error: null })
        await openCharacterTabWith([schemaGame, emptyGame], [...mockCharacters, { ...pickupOnly, game_id: "game-2" }])
        selectGame("game-2")
        fireEvent.click(await screen.findByRole("button", { name: "픽업 전용 캐릭 수정" }))

        expect(screen.getByText(/이름과 이미지만 수정할 수 있으며/)).toBeTruthy()
        expect(screen.queryByLabelText("등급")).toBeNull()
        expect(screen.queryByLabelText(/정식 캐릭터로 승격/)).toBeNull()
        fireEvent.change(screen.getByLabelText("캐릭터 이름 *"), { target: { value: "이름 변경" } })
        fireEvent.click(screen.getByRole("button", { name: "저장" }))

        await waitFor(() => expect(charactersBuilder.update).toHaveBeenCalled())
        expect(charactersBuilder.update).toHaveBeenCalledWith({ game_id: "game-2", name: "이름 변경" })
        expect(convertIconSourceToDataUrl).not.toHaveBeenCalled()
      })

      it("템플릿이 활성인 게임에서는 등급·분류를 채워 정식 캐릭터로 승격할 수 있다", async () => {
        charactersBuilder.update.mockReturnValue(charactersBuilder)
        charactersBuilder.eq.mockResolvedValue({ error: null })
        await openCharacterTabWith([labeledGame], [...labeledCharacters, { ...pickupOnly, default_icon_url: "data:image/webp;base64,po" }])
        selectGame("game-1")
        fireEvent.click(await screen.findByRole("button", { name: "픽업 전용 캐릭 수정" }))

        expect(screen.queryByLabelText("등급 *")).toBeNull()
        fireEvent.click(screen.getByLabelText(/정식 캐릭터로 승격/))
        fireEvent.click(screen.getByRole("button", { name: "저장" }))
        expect(await screen.findByText("공명자 등급을 선택해 주세요.")).toBeTruthy()

        fireEvent.change(screen.getByLabelText("등급 *"), { target: { value: "4성" } })
        fireEvent.change(screen.getByLabelText("속성 *"), { target: { value: "기류" } })
        fireEvent.change(screen.getByLabelText("무기 *"), { target: { value: "권총" } })
        fireEvent.click(screen.getByRole("button", { name: "저장" }))

        await waitFor(() => expect(charactersBuilder.update).toHaveBeenCalled())
        expect(charactersBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
          game_id: "game-1",
          name: "픽업 전용 캐릭",
          rarity: "4성",
          attributes: { element: "기류", weapon: "권총" },
          is_pickup_only: false,
          default_icon_url: "data:image/webp;base64,converted",
        }))
        expect(await screen.findByText(/정식 공명자\(으\)로 승격했습니다/)).toBeTruthy()
      })
    })

    it("is_pickup_only 컬럼이 없는 미적용 DB에서는 컬럼 없이 다시 조회하고 모든 캐릭터를 정식으로 본다 (D-08)", async () => {
      gamesBuilder.order.mockResolvedValue({ data: [labeledGame], error: null })
      charactersBuilder.order
        .mockResolvedValueOnce({ data: null, error: { code: "42703", message: 'column "is_pickup_only" does not exist' } })
        .mockResolvedValue({ data: labeledCharacters, error: null })
      render(<AdminPage />)
      fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
      selectGame("game-1")

      const table = await screen.findByTestId("character-table")
      expect(within(table).queryByText("픽업 전용")).toBeNull()
      expect(charactersBuilder.select).toHaveBeenCalledWith(expect.stringContaining("is_pickup_only"))
      expect(charactersBuilder.select).toHaveBeenCalledWith("id, game_id, name, rarity, attributes, default_icon_url")
      expect(screen.queryByText(/캐릭터 목록을 불러오지 못했습니다/)).toBeNull()
    })

    it("용량이 너무 큰 아이콘은 DB 오류 전에 이미지 용량 안내로 막는다 (R52-REV-004)", async () => {
      charactersBuilder.insert.mockResolvedValue({ error: null })
      convertIconSourceToDataUrl.mockResolvedValue(`data:image/webp;base64,${"A".repeat(150_000)}`)
      await openCharacterTabWith([labeledGame], labeledCharacters)
      selectGame("game-1")
      fireEvent.click(await screen.findByRole("button", { name: "공명자 추가" }))
      fireEvent.change(screen.getByLabelText("공명자 이름 *"), { target: { value: "큰 이미지" } })
      fireEvent.change(screen.getByLabelText("등급 *"), { target: { value: "5성" } })
      fireEvent.change(screen.getByLabelText("속성 *"), { target: { value: "기류" } })
      fireEvent.change(screen.getByLabelText("무기 *"), { target: { value: "직검" } })
      fireEvent.change(screen.getByLabelText("기본 아이콘 URL"), { target: { value: "data:image/webp;base64,big" } })
      fireEvent.click(screen.getByRole("button", { name: "저장" }))

      expect(await screen.findByText(/이미지 용량이 너무 큽니다/)).toBeTruthy()
      expect(charactersBuilder.insert).not.toHaveBeenCalled()
    })

    it("탭 목록은 모바일에서 가로 스크롤되고 탭과 게임 필터 라벨은 줄바꿈하지 않는다 (U-01)", async () => {
      await openCharacterTabWith([schemaGame], mockCharacters)

      const tabs = screen.getAllByRole("tab")
      expect(screen.getByRole("tablist").className).toContain("overflow-x-auto")
      expect(tabs.every((tab) => tab.className.includes("shrink-0") && tab.className.includes("whitespace-nowrap"))).toBe(true)
      fireEvent.click(screen.getByRole("tab", { name: /일정 관리/ }))
      expect((await screen.findByText("게임 필터:")).className).toContain("whitespace-nowrap")
    })

    it("등급이 정의된 게임은 등급과 분류를 필수로 선택해야 저장된다", async () => {
      charactersBuilder.insert.mockResolvedValue({ error: null })
      await openCharacterTabWith([labeledGame], labeledCharacters)
      selectGame("game-1")
      fireEvent.click(await screen.findByRole("button", { name: "공명자 추가" }))

      expect(screen.getByRole("heading", { name: "원신 공명자 추가" })).toBeTruthy()
      fireEvent.change(screen.getByLabelText("공명자 이름 *"), { target: { value: "신규" } })
      fireEvent.change(screen.getByLabelText("기본 아이콘 URL"), { target: { value: "https://example.com/new.png" } })
      fireEvent.click(screen.getByRole("button", { name: "저장" }))
      expect(await screen.findByText("공명자 등급을 선택해 주세요.")).toBeTruthy()

      fireEvent.change(screen.getByLabelText("등급 *"), { target: { value: "5성" } })
      fireEvent.click(screen.getByRole("button", { name: "저장" }))
      expect(await screen.findByText("속성을(를) 선택해 주세요.")).toBeTruthy()

      fireEvent.change(screen.getByLabelText("속성 *"), { target: { value: "기류" } })
      fireEvent.click(screen.getByRole("button", { name: "저장" }))
      expect(await screen.findByText("무기을(를) 선택해 주세요.")).toBeTruthy()
      expect(charactersBuilder.insert).not.toHaveBeenCalled()

      fireEvent.change(screen.getByLabelText("무기 *"), { target: { value: "직검" } })
      fireEvent.click(screen.getByRole("button", { name: "저장" }))
      await waitFor(() => {
        expect(charactersBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
          game_id: "game-1",
          name: "신규",
          rarity: "5성",
          attributes: { element: "기류", weapon: "직검" },
        }))
      })
    })
  })
})
