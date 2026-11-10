import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AdminPage from "./page"

const { from, useAuth, mockGetKstToday, resizeImageToWebP } = vi.hoisted(() => ({
  from: vi.fn(),
  useAuth: vi.fn(),
  mockGetKstToday: vi.fn(() => "2026-09-01"),
  resizeImageToWebP: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))
vi.mock("@/lib/dashboard-date", () => ({ getKstToday: mockGetKstToday }))
// jsdom cannot decode images, so the 64px resize is mocked at the resizer boundary.
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/image-resizer")>(),
  resizeImageToWebP,
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
  Object.values(query).forEach((fn) => fn.mockReturnValue(query))
  return query
}

describe("AdminPage - 분류 옵션 아이콘 (R64)", () => {
  const FIRE_ICON = "data:image/webp;base64,FIRE"
  const game = {
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
  const characters = [
    { id: "char-1", game_id: "game-1", name: "알리스", rarity: "5★", attributes: { element: "불" }, default_icon_url: "data:image/webp;base64,a" },
    { id: "char-2", game_id: "game-1", name: "보리스", rarity: "4★", attributes: { element: "물" }, default_icon_url: "data:image/webp;base64,b" },
  ]

  type IconOp = "select" | "upsert" | "delete"
  let gamesBuilder: ReturnType<typeof createQueryBuilder>
  let iconRows: Array<Record<string, string>>
  let iconSelectError: { code?: string; message: string } | null
  let iconWriteError: { code?: string; message: string } | null
  let iconCalls: Array<{ op: IconOp; args: unknown[]; filters: Array<[string, unknown]> }>

  function createIconQuery() {
    let op: IconOp = "select"
    const filters: Array<[string, unknown]> = []
    const query: Record<string, unknown> = {}
    query.select = vi.fn((...args: unknown[]) => {
      iconCalls.push({ op: "select", args, filters })
      return query
    })
    query.upsert = vi.fn((...args: unknown[]) => {
      op = "upsert"
      iconCalls.push({ op, args, filters })
      return query
    })
    query.delete = vi.fn(() => {
      op = "delete"
      iconCalls.push({ op, args: [], filters })
      return query
    })
    query.eq = vi.fn((column: string, value: unknown) => {
      filters.push([column, value])
      return query
    })
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const result = op === "select"
        ? { data: iconSelectError ? null : iconRows, error: iconSelectError }
        : { data: null, error: iconWriteError }
      return Promise.resolve(result).then(resolve, reject)
    }
    return query
  }

  const iconSelects = () => iconCalls.filter((call) => call.op === "select")
  const iconWrites = (op: IconOp) => iconCalls.filter((call) => call.op === op)
  const pngFile = () => new File(["png"], "fire.png", { type: "image/png" })
  // R77: the "이미지 선택" button opens a registration modal (URL / paste / file) instead of a bare file input.
  async function openIconDialog(optionLabel: string) {
    fireEvent.click(screen.getByRole("button", { name: `${optionLabel} 아이콘 이미지 선택` }))
    return await screen.findByTestId("classification-icon-dialog")
  }
  const pickIconFile = (dialog: HTMLElement, file: File) =>
    fireEvent.change(within(dialog).getByLabelText("분류 아이콘 이미지 파일"), { target: { files: [file] } })
  const submitIconDialog = () => fireEvent.click(screen.getByRole("button", { name: "등록" }))
  async function registerFile(optionLabel: string, file: File = pngFile()) {
    const dialog = await openIconDialog(optionLabel)
    pickIconFile(dialog, file)
    await within(dialog).findByAltText("분류 아이콘 미리보기")
    submitIconDialog()
    return dialog
  }

  async function openTemplateEditor() {
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
    await screen.findByLabelText("캐릭터 게임 필터")
    fireEvent.click(await screen.findByRole("button", { name: "템플릿 설정 수정" }))
    expect(screen.getByRole("heading", { name: "원신 캐릭터 템플릿 수정" })).toBeTruthy()
  }

  async function openTemplateEditorWithIcons() {
    await openTemplateEditor()
    return await screen.findByTestId("classification-icon-editor")
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetKstToday.mockReturnValue("2026-09-01")
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
    useAuth.mockReturnValue({ user: { id: "admin-1", app_metadata: { role: "admin" } }, role: "admin", isLoading: false })
    resizeImageToWebP.mockResolvedValue(new Blob(["webp"], { type: "image/webp" }))
    iconRows = [{ game_id: "game-1", axis_key: "element", option_value: "불", icon_data_url: FIRE_ICON }]
    iconSelectError = null
    iconWriteError = null
    iconCalls = []

    gamesBuilder = createQueryBuilder()
    gamesBuilder.order.mockResolvedValue({ data: [game], error: null })
    gamesBuilder.eq.mockResolvedValue({ error: null })
    const charactersBuilder = createQueryBuilder()
    charactersBuilder.order.mockResolvedValue({ data: characters, error: null })
    const schedulesBuilder = createQueryBuilder()
    schedulesBuilder.order.mockResolvedValue({ data: [], error: null })
    from.mockImplementation((table: string) => {
      if (table === "games") return gamesBuilder
      if (table === "game_characters") return charactersBuilder
      if (table === "game_schedules") return schedulesBuilder
      if (table === "game_classification_icons") return createIconQuery()
      return createQueryBuilder()
    })
  })

  it("템플릿 수정 모달에 저장된 분류 축·선택지별 아이콘 행을 보여주고, 아이콘이 있는 선택지에만 삭제 버튼을 둔다", async () => {
    const editor = await openTemplateEditorWithIcons()

    const rows = within(editor).getAllByTestId("classification-icon-row")
    expect(rows).toHaveLength(2)
    expect(within(editor).getByText("속성")).toBeTruthy()
    expect(rows[0].textContent).toContain("불")
    expect(rows[1].textContent).toContain("물")
    expect(within(rows[0]).getByTestId("classification-option-icon").getAttribute("src")).toBe(FIRE_ICON)
    expect(within(rows[0]).getByTestId("classification-option-icon").getAttribute("width")).toBe("24")
    expect(within(rows[1]).queryByTestId("classification-option-icon")).toBeNull()
    expect(within(editor).getByRole("button", { name: "속성 불 아이콘 삭제" })).toBeTruthy()
    expect(within(editor).queryByRole("button", { name: "속성 물 아이콘 삭제" })).toBeNull()
    expect(within(editor).getByRole("button", { name: "속성 불 아이콘 이미지 선택" })).toBeTruthy()
    expect(editor.textContent).toContain("먼저 [수정 저장]한 뒤 아이콘을 등록함")
    expect(iconSelects()[0].args).toEqual(["axis_key, option_value, icon_data_url"])
    expect(iconSelects()[0].filters).toEqual([["game_id", "game-1"]])
  })

  it("이미지 선택 버튼은 등록 모달을 열고, 파일을 고르면 64px 미리보기를 보여준다", async () => {
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    expect(screen.getByRole("heading", { name: "속성 · 물 아이콘 등록" })).toBeTruthy()
    expect(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기")).toBeTruthy()
    expect(within(dialog).getByLabelText("분류 아이콘 이미지 파일").getAttribute("accept")).toBe("image/png,image/jpeg,image/webp")
    expect(within(dialog).queryByAltText("분류 아이콘 미리보기")).toBeNull()

    const file = pngFile()
    pickIconFile(dialog, file)
    expect((await within(dialog).findByAltText("분류 아이콘 미리보기")).getAttribute("src")).toMatch(/^data:image\/webp;base64,/)
    expect(resizeImageToWebP).toHaveBeenCalledWith(file, 64)
    expect(iconWrites("upsert")).toHaveLength(0)

    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())
    expect(iconWrites("upsert")).toHaveLength(0)
  })

  it("파일 등록은 64px로 변환해 upsert하고 모달을 닫으며 미리보기·삭제 버튼을 갱신한다", async () => {
    await openTemplateEditorWithIcons()
    const file = pngFile()
    await registerFile("속성 물", file)

    await waitFor(() => expect(iconWrites("upsert")).toHaveLength(1))
    expect(resizeImageToWebP).toHaveBeenCalledWith(file, 64)
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())
    expect(iconWrites("upsert")[0].args).toEqual([
      { game_id: "game-1", axis_key: "element", option_value: "물", icon_data_url: expect.stringMatching(/^data:image\/webp;base64,/) },
      { onConflict: "game_id,axis_key,option_value" },
    ])
    expect(await screen.findByRole("button", { name: "속성 물 아이콘 삭제" })).toBeTruthy()
    const editor = screen.getByTestId("classification-icon-editor")
    expect(within(editor).getAllByTestId("classification-option-icon")).toHaveLength(2)
    expect(await screen.findByText("'물' 분류 아이콘을 저장했습니다.")).toBeTruthy()
  })

  it("삭제 버튼은 해당 선택지 행만 delete하고 미리보기를 제거한다", async () => {
    const editor = await openTemplateEditorWithIcons()
    fireEvent.click(within(editor).getByRole("button", { name: "속성 불 아이콘 삭제" }))

    await waitFor(() => expect(iconWrites("delete")).toHaveLength(1))
    expect(iconWrites("delete")[0].filters).toEqual([["game_id", "game-1"], ["axis_key", "element"], ["option_value", "불"]])
    await waitFor(() => expect(within(editor).queryByTestId("classification-option-icon")).toBeNull())
    expect(within(editor).queryByRole("button", { name: "속성 불 아이콘 삭제" })).toBeNull()
    expect(await screen.findByText("'불' 분류 아이콘을 삭제했습니다.")).toBeTruthy()
  })

  it("오프라인이면 쓰기 없이 오프라인 안내를 보여준다", async () => {
    const editor = await openTemplateEditorWithIcons()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const dialog = await openIconDialog("속성 물")
    fireEvent.change(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), { target: { value: "https://example.com/water.png" } })
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    submitIconDialog()

    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/오프라인 상태에서는 저장할 수 없습니다/)
    expect(iconWrites("upsert")).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(resizeImageToWebP).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())
    fireEvent.click(within(editor).getByRole("button", { name: "속성 불 아이콘 삭제" }))
    expect(iconWrites("delete")).toHaveLength(0)
    fetchSpy.mockRestore()
  })

  it("입력이 비어 있으면 등록하지 않고 안내를 보여준다", async () => {
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    submitIconDialog()

    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/이미지 URL을 입력하거나/)
    expect(iconWrites("upsert")).toHaveLength(0)
  })

  it("URL 등록은 이미지를 가져와 64px로 변환한 뒤 upsert한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["png"], { type: "image/png" }), { status: 200, headers: { "content-type": "image/png" } }),
    )
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    fireEvent.change(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), { target: { value: "https://example.com/water.png" } })
    submitIconDialog()

    await waitFor(() => expect(iconWrites("upsert")).toHaveLength(1))
    expect(fetchSpy.mock.calls[0][0]).toBe("https://example.com/water.png")
    expect(resizeImageToWebP).toHaveBeenCalledTimes(1)
    expect(resizeImageToWebP.mock.calls[0][1]).toBe(64)
    expect((resizeImageToWebP.mock.calls[0][0] as File).type).toBe("image/png")
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())
    fetchSpy.mockRestore()
  })

  it("WebP Data URL도 그대로 저장하지 않고 64px로 다시 인코딩한다", async () => {
    const original = "data:image/webp;base64,UklGRg=="
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    fireEvent.change(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), { target: { value: original } })
    submitIconDialog()

    await waitFor(() => expect(iconWrites("upsert")).toHaveLength(1))
    expect(resizeImageToWebP).toHaveBeenCalledTimes(1)
    expect(resizeImageToWebP.mock.calls[0][1]).toBe(64)
    const saved = (iconWrites("upsert")[0].args[0] as { icon_data_url: string }).icon_data_url
    expect(saved).not.toBe(original)
  })

  it("입력란에 이미지를 붙여넣으면 파일로 처리해 미리보기를 보여주고 등록한다", async () => {
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    const file = pngFile()
    fireEvent.paste(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), {
      clipboardData: { files: [file], items: [] },
    })

    expect(await within(dialog).findByAltText("분류 아이콘 미리보기")).toBeTruthy()
    expect(resizeImageToWebP).toHaveBeenCalledWith(file, 64)
    submitIconDialog()
    await waitFor(() => expect(iconWrites("upsert")).toHaveLength(1))
  })

  it("파일을 고른 뒤 URL을 입력하면 파일 입력칸을 새로 만들어 이전 파일명이 남지 않게 한다", async () => {
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    const before = within(dialog).getByLabelText("분류 아이콘 이미지 파일")
    pickIconFile(dialog, pngFile())
    await within(dialog).findByAltText("분류 아이콘 미리보기")
    expect(within(dialog).getByLabelText("분류 아이콘 이미지 파일")).toBe(before)

    fireEvent.change(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), { target: { value: "https://example.com/water.png" } })
    const after = within(dialog).getByLabelText("분류 아이콘 이미지 파일") as HTMLInputElement
    expect(after).not.toBe(before)
    expect(after.value).toBe("")
    expect(within(dialog).queryByAltText("분류 아이콘 미리보기")).toBeNull()
  })

  it("파일을 고른 뒤 이미지를 붙여넣으면 파일 입력칸을 새로 만든다", async () => {
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    const before = within(dialog).getByLabelText("분류 아이콘 이미지 파일")
    pickIconFile(dialog, pngFile())
    await within(dialog).findByAltText("분류 아이콘 미리보기")

    fireEvent.paste(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), {
      clipboardData: { files: [new File(["png2"], "pasted.png", { type: "image/png" })], items: [] },
    })
    expect(within(dialog).getByLabelText("분류 아이콘 이미지 파일")).not.toBe(before)
    expect(await within(dialog).findByAltText("분류 아이콘 미리보기")).toBeTruthy()
  })

  it("모달을 닫았다 다시 열면 URL·파일·미리보기가 모두 빈 상태로 시작한다", async () => {
    await openTemplateEditorWithIcons()
    let dialog = await openIconDialog("속성 물")
    fireEvent.change(within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기"), { target: { value: "https://example.com/water.png" } })
    pickIconFile(dialog, pngFile())
    await within(dialog).findByAltText("분류 아이콘 미리보기")
    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())

    dialog = await openIconDialog("속성 물")
    expect((within(dialog).getByPlaceholderText("https://... 또는 이미지 붙여넣기") as HTMLInputElement).value).toBe("")
    expect((within(dialog).getByLabelText("분류 아이콘 이미지 파일") as HTMLInputElement).value).toBe("")
    expect(within(dialog).queryByAltText("분류 아이콘 미리보기")).toBeNull()
  })

  it("변환 결과가 20,000자를 넘으면 저장하지 않고 모달 안에 용량 오류를 보여준다", async () => {
    resizeImageToWebP.mockResolvedValue(new Blob([new Uint8Array(20_000)], { type: "image/webp" }))
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    pickIconFile(dialog, pngFile())

    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/용량이 너무 큽니다/)
    expect(iconWrites("upsert")).toHaveLength(0)
  })

  it("변환 실패 메시지(형식·원본 용량)를 모달 안에 그대로 보여준다", async () => {
    resizeImageToWebP.mockRejectedValue(new Error("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다."))
    await openTemplateEditorWithIcons()
    const dialog = await openIconDialog("속성 물")
    pickIconFile(dialog, pngFile())

    expect((await within(dialog).findByRole("alert")).textContent).toBe("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.")
    expect(iconWrites("upsert")).toHaveLength(0)
  })

  it("검증 트리거 23514는 선택지 변경 안내를, 그 밖의 저장·삭제 실패는 일반 오류를 보여주고 모달·화면을 유지한다", async () => {
    const editor = await openTemplateEditorWithIcons()

    iconWriteError = { code: "23514", message: "classification option not found" }
    const dialog = await registerFile("속성 물")
    expect((await within(dialog).findByRole("alert")).textContent).toBe("선택지가 변경되었습니다. 창을 다시 열어 주세요.")
    expect(screen.getByTestId("classification-icon-dialog")).toBeTruthy()

    iconWriteError = { code: "42501", message: "denied" }
    submitIconDialog()
    await waitFor(() => expect(within(dialog).getByRole("alert").textContent).toBe("분류 아이콘을 저장하지 못했습니다."))
    expect(within(editor).queryByRole("button", { name: "속성 물 아이콘 삭제" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    await waitFor(() => expect(screen.queryByTestId("classification-icon-dialog")).toBeNull())
    fireEvent.click(within(editor).getByRole("button", { name: "속성 불 아이콘 삭제" }))
    await waitFor(() => expect(within(editor).getByRole("alert").textContent).toBe("분류 아이콘을 삭제하지 못했습니다."))
    expect(within(editor).getByRole("button", { name: "속성 불 아이콘 삭제" })).toBeTruthy()
  })

  it("마이그레이션 미적용(42P01)이면 아이콘 섹션을 숨기고 오류를 표시하지 않으며 나머지 화면은 그대로 동작한다", async () => {
    iconSelectError = { code: "42P01", message: 'relation "game_classification_icons" does not exist' }
    await openTemplateEditor()
    await waitFor(() => expect(iconSelects().length).toBeGreaterThan(0))

    expect(screen.queryByTestId("classification-icon-editor")).toBeNull()
    expect(screen.queryByText("분류 아이콘")).toBeNull()
    expect(screen.getByLabelText("분류 축 1 이름")).toBeTruthy()
    expect(screen.queryByText(/game_classification_icons/)).toBeNull()
  })

  it("게임 정보 수정(템플릿 흐름이 아닌) 모달에는 아이콘 섹션이 없다", async () => {
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /등록된 게임 목록/ }))
    fireEvent.click(await screen.findByRole("button", { name: "게임 수정: 원신" }))

    expect(screen.getByRole("heading", { name: "게임 정보 수정" })).toBeTruthy()
    expect(screen.queryByTestId("classification-icon-editor")).toBeNull()
  })

  it("분류 기준이 없는 템플릿에는 아이콘 섹션을 보여주지 않는다", async () => {
    gamesBuilder.order.mockResolvedValue({ data: [{ ...game, classification_schema: { rarities: ["5★"], axes: [] } }], error: null })
    await openTemplateEditor()
    await waitFor(() => expect(iconSelects().length).toBeGreaterThan(0))

    expect(screen.queryByTestId("classification-icon-editor")).toBeNull()
  })

  it("템플릿 저장 후 정리 트리거 결과를 반영하도록 해당 게임의 아이콘을 다시 불러온다", async () => {
    await openTemplateEditorWithIcons()
    const before = iconSelects().length
    gamesBuilder.update.mockReturnValue(gamesBuilder)
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }))

    await waitFor(() => expect(iconSelects().length).toBe(before + 1))
    expect(iconSelects().at(-1)?.filters).toEqual([["game_id", "game-1"]])
  })

  it("캐릭터 목록 분류 열은 아이콘이 있는 값에만 텍스트 앞에 16px 아이콘을 붙인다", async () => {
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
    const table = await screen.findByTestId("character-table")
    await waitFor(() => expect(within(table).getAllByTestId("classification-option-icon")).toHaveLength(1))

    const rows = Array.from(table.querySelectorAll("tbody tr"))
    const fireCell = rows.find((row) => row.textContent?.includes("알리스"))?.querySelector("td:nth-child(4)") as HTMLElement
    const waterCell = rows.find((row) => row.textContent?.includes("보리스"))?.querySelector("td:nth-child(4)") as HTMLElement
    expect(fireCell.textContent).toBe("불")
    expect(fireCell.querySelector("img")?.getAttribute("src")).toBe(FIRE_ICON)
    expect(fireCell.querySelector("img")?.getAttribute("width")).toBe("16")
    expect(fireCell.firstElementChild?.firstElementChild?.tagName).toBe("IMG")
    expect(waterCell.textContent).toBe("물")
    expect(waterCell.querySelector("img")).toBeNull()
  })

  it("미적용 DB에서도 캐릭터 목록 분류 열은 텍스트만 표시한다", async () => {
    iconSelectError = { code: "PGRST205", message: "not in schema cache" }
    render(<AdminPage />)
    fireEvent.click(await screen.findByRole("tab", { name: /캐릭터 관리/ }))
    const table = await screen.findByTestId("character-table")
    await waitFor(() => expect(iconSelects().length).toBeGreaterThan(0))

    expect(within(table).queryByTestId("classification-option-icon")).toBeNull()
    expect(table.textContent).toContain("알리스")
  })
})
