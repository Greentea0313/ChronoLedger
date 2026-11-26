import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseImportModal } from "./expense-import-modal"
import { buildExpensesCsv } from "@/lib/export-format"

const { from, rpc, mockIsOffline } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  mockIsOffline: vi.fn(() => false),
}))

vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }))
vi.mock("@/lib/use-online-status", () => ({ useOnlineStatus: () => true }))
vi.mock("@/lib/dashboard-date", () => ({ getKstToday: () => "2026-10-15" }))
vi.mock("@/lib/offline-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/offline-guard")>("@/lib/offline-guard")
  return { ...actual, isOffline: mockIsOffline }
})

type Result = { data: unknown; error: unknown }

function pagedBuilder(result: Result) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    range: vi.fn(() => Promise.resolve(result)),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.not.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  return builder
}

const games = [{ id: "game-1", name: "원신" }]

function setup({ batches = [] as unknown[], batchError = null as unknown } = {}) {
  const expensesBuilder = pagedBuilder({ data: batchError ? null : batches, error: batchError })
  from.mockImplementation((table: string) => (table === "games" ? pagedBuilder({ data: games, error: null }) : expensesBuilder))
  return expensesBuilder
}

const exported = [
  {
    id: "exp-a",
    target_date: "2026-10-01",
    title: "연차 패키지",
    category: "게임",
    game_id: "game-1",
    status: "CONFIRMED",
    original_price: 33000,
    final_amount: 33000,
    payment_method: "WALLET",
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "exp-b",
    target_date: "2026-10-02",
    title: "월정액",
    category: "게임",
    game_id: "game-1",
    status: "CONFIRMED",
    original_price: 6000,
    final_amount: 6000,
    payment_method: "NAVER_PAY",
    created_at: "2026-10-02T00:00:00Z",
  },
  {
    id: "exp-c",
    target_date: "2026-10-20",
    title: "예정",
    category: "게임",
    game_id: null,
    status: "PLANNED",
    original_price: 1000,
    final_amount: 1000,
    payment_method: "WALLET",
    created_at: "2026-10-02T00:00:00Z",
  },
]
const ownCsv = buildExpensesCsv(exported, new Map([["game-1", "원신"]]))

function csvFile(text: string, name = "expenses.csv") {
  return new File([text], name, { type: "text/csv" })
}

async function chooseFile(file: File) {
  const input = await screen.findByLabelText("CSV 파일 선택")
  fireEvent.change(input, { target: { files: [file] } })
}

describe("ExpenseImportModal (R115)", () => {
  beforeEach(() => {
    from.mockReset()
    rpc.mockReset()
    mockIsOffline.mockReturnValue(false)
  })

  it("goes straight to preview for the own export format, imports selected rows and undoes the batch (115-7, I15)", async () => {
    setup()
    rpc.mockImplementation((name: string) =>
      Promise.resolve(name === "import_confirmed_expenses" ? { data: { batch_id: "batch-1", inserted: 2 }, error: null } : { data: 2, error: null }),
    )
    const onChanged = vi.fn()
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={[]} onChanged={onChanged} />)

    await chooseFile(csvFile(ownCsv))

    const summary = await screen.findByTestId("import-summary")
    expect(screen.queryByLabelText("날짜 열")).toBeNull()
    expect(summary.textContent).toContain("가져올 2건 · 합계 39,000원")
    expect(summary.textContent).toContain("예산·통계·게임별 예산에 반영")
    const preview = screen.getByTestId("import-preview")
    expect(within(preview).getByText("결제 완료 외 상태")).toBeTruthy()
    expect((screen.getByLabelText("4행 가져오기") as HTMLInputElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "2건 가져오기" }))
    expect(await screen.findByText("지출 2건을 가져왔습니다.")).toBeTruthy()
    expect(rpc).toHaveBeenCalledWith("import_confirmed_expenses", {
      p_rows: [
        { target_date: "2026-10-01", title: "연차 패키지", category: "게임", amount: 33000, game_id: "game-1", memo: null },
        { target_date: "2026-10-02", title: "월정액", category: "게임", amount: 6000, game_id: "game-1", memo: "[가져오기] 결제수단: 네이버페이" },
      ],
    })
    expect(onChanged).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "가져오기 취소" }))
    expect(await screen.findByText("가져온 지출 2건을 취소했습니다.")).toBeTruthy()
    expect(rpc).toHaveBeenCalledWith("delete_import_batch", { p_batch_id: "batch-1" })
    expect(onChanged).toHaveBeenCalledTimes(2)
  })

  it("excludes every row as already existing when the same account re-imports its export (115-7)", async () => {
    setup()
    const existing = exported.map((e) => ({ id: e.id, status: e.status, target_date: e.target_date, final_amount: e.final_amount, title: e.title }))
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={existing} onChanged={vi.fn()} />)

    await chooseFile(csvFile(ownCsv))

    expect((await screen.findByTestId("import-summary")).textContent).toContain("가져올 0건")
    expect(within(screen.getByTestId("import-preview")).getAllByText("이미 있는 지출")).toHaveLength(3)
    expect((screen.getByRole("button", { name: "0건 가져오기" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("asks for columns on a generic CSV and leaves suspected duplicates unchecked (I11, I14)", async () => {
    setup()
    const existing = [{ id: "e1", status: "CONFIRMED", target_date: "2026-10-05", final_amount: 5500, title: "월정액" }]
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={existing} onChanged={vi.fn()} />)

    await chooseFile(csvFile("거래일,상품명,결제금액\r\n2026-10-05,월정액,\"5,500\"\r\n2026.10.06,패스,4900\r\n"))

    expect(((await screen.findByLabelText("날짜 열")) as HTMLSelectElement).value).toBe("0")
    expect((screen.getByLabelText("금액 열") as HTMLSelectElement).value).toBe("2")
    expect((screen.getByLabelText("분류 열") as HTMLSelectElement).value).toBe("-1")
    fireEvent.change(screen.getByLabelText("기본 분류"), { target: { value: "식비" } })
    fireEvent.click(screen.getByRole("button", { name: "미리보기" }))

    expect((await screen.findByTestId("import-summary")).textContent).toContain("가져올 1건 · 합계 4,900원")
    expect(screen.getByText("중복 의심")).toBeTruthy()
    const duplicate = screen.getByLabelText("2행 가져오기") as HTMLInputElement
    expect(duplicate.checked).toBe(false)
    fireEvent.click(duplicate)
    expect(screen.getByTestId("import-summary").textContent).toContain("가져올 2건 · 합계 10,400원")
    expect(screen.getAllByText("식비")).toHaveLength(2)
  })

  it("blocks import while offline (115-8)", async () => {
    setup()
    mockIsOffline.mockReturnValue(true)
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={[]} onChanged={vi.fn()} />)

    await chooseFile(csvFile(ownCsv))
    fireEvent.click(await screen.findByRole("button", { name: "2건 가져오기" }))

    expect((await screen.findByRole("alert")).textContent).toContain("오프라인")
    expect(rpc).not.toHaveBeenCalled()
  })

  it("lists recent batches and undoes one from the start screen", async () => {
    const builder = setup({
      batches: [
        { import_batch_id: "batch-new", created_at: "2026-10-10T03:00:00Z" },
        { import_batch_id: "batch-new", created_at: "2026-10-10T03:00:00Z" },
        { import_batch_id: "batch-old", created_at: "2026-10-01T03:00:00Z" },
      ],
    })
    rpc.mockResolvedValue({ data: 1, error: null })
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={[]} onChanged={vi.fn()} />)

    const list = await screen.findByTestId("recent-import-batches")
    expect(list.textContent).toContain("2건")
    expect(list.textContent).toContain("1건")
    expect(builder.not).toHaveBeenCalledWith("import_batch_id", "is", null)
    fireEvent.click(within(list).getAllByRole("button", { name: "가져오기 취소" })[1])
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_import_batch", { p_batch_id: "batch-old" }))
    expect(await screen.findByText("가져온 지출 1건을 취소했습니다.")).toBeTruthy()
  })

  it("shows an unavailable notice and disables file selection before the migration (fallback)", async () => {
    setup({ batchError: { code: "42703", message: "column expenses.import_batch_id does not exist" } })
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={[]} onChanged={vi.fn()} />)

    expect(await screen.findByText(/가져오기 기능\(R115\)이 아직 적용되지 않아/)).toBeTruthy()
    expect((screen.getByLabelText("CSV 파일 선택") as HTMLInputElement).disabled).toBe(true)
  })

  it("rejects files over 1,000 data rows", async () => {
    setup()
    render(<ExpenseImportModal open onOpenChange={vi.fn()} existingExpenses={[]} onChanged={vi.fn()} />)
    const lines = ["날짜,항목명,금액", ...Array.from({ length: 1001 }, (_, i) => `2026-10-01,항목 ${i},100`)]

    await chooseFile(csvFile(lines.join("\n")))

    expect((await screen.findByRole("alert")).textContent).toContain("1,000행까지")
    expect(screen.queryByLabelText("날짜 열")).toBeNull()
  })
})
