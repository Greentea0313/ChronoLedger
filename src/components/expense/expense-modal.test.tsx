import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseModal } from "./expense-modal"
import { getKstToday } from "@/lib/dashboard-date"

const { from, rpc, useAuth, insert } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))

function query(result: unknown) {
  const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn() }
  q.select.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  q.order.mockResolvedValue(result)
  q.insert = insert
  return q
}

function setup() {
  from.mockImplementation((table: string) => {
    if (table === "games") return query({ data: [{ id: "g1", name: "Sample RPG" }], error: null })
    if (table === "user_games") {
      const ug = query(null)
      ug.eq.mockResolvedValue({ data: [{ game_id: "g1" }], error: null })
      return ug
    }
    if (table === "game_schedules") {
      const today = getKstToday()
      return query({
        data: [{ id: "s1", game_id: "g1", title: "버전 1.0", schedule_type: "VERSION", start_date: today, end_date: today }],
        error: null,
      })
    }
    if (table === "user_finances") {
      const fin = query(null)
      fin.eq.mockResolvedValue({ data: [{ total_asset: 50000 }], error: null })
      return fin
    }
    const wallets = query(null)
    wallets.eq.mockResolvedValue({
      data: [
        { platform: "GOOGLE_PLAY", current_balance: 10000, earn_rate: 0.2 },
        { platform: "NAVER_PAY", current_balance: 3000, earn_rate: 0 },
      ],
      error: null,
    })
    return wallets
  })
  const inserted = { select: vi.fn(), single: vi.fn() }
  inserted.select.mockReturnValue(inserted)
  inserted.single.mockResolvedValue({ data: { id: "e1" }, error: null })
  insert.mockReturnValue(inserted)
}

describe("ExpenseModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ user: { id: "u1" } })
    setup()
  })

  it("registers a PLANNED expense then calls process_expense_payment with 114,000 final amount", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 1.0" })
    expect(screen.getByLabelText("연결된 버전 일정")).toHaveProperty("disabled", true)
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "119000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("포인트 사용 지갑"), { target: { value: "GOOGLE_PLAY" } })

    expect(screen.getByText("실결제액: 114,000 원")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1",
      game_id: "g1",
      schedule_id: "s1",
      status: "PLANNED",
      original_price: 119000,
      final_amount: 119000,
      start_date: today,
      end_date: today,
      target_date: today,
    }))
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_expense_id: "e1",
      p_original_price: 119000,
      p_discount_amount: 0,
      p_point_discount_amount: 5000,
      p_used_points: 5000,
      p_point_platform: "GOOGLE_PLAY",
      p_payment_method: "WALLET",
      p_deduct_asset: true,
    }))
  })

  it("blocks submit client-side when points exceed the wallet balance and does not call the server", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "테스트" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "20000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "15000" } })
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    expect((await screen.findByRole("alert")).textContent).toContain("포인트 잔액이 부족")
    expect(insert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("reuses the saved planned expense on retry after an RPC failure", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "포인트 잔액이 부족합니다." } }).mockResolvedValueOnce({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "커피" } })
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "식비" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "4500" } })

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))
    expect((await screen.findByRole("alert")).textContent).toContain("예정 지출로 저장")
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it("hides game selection when category is changed from 게임 to another category", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })
    expect(screen.getByLabelText("게임")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "식비" } })
    expect(screen.queryByLabelText("게임")).toBeNull()
  })

  it("결제일 기간에 진행 중인 버전 일정이 없으면 연결된 버전 일정이 disabled 상태로 안내 문구가 출력된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} initialDate="2026-01-01" />)
    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })

    await waitFor(() => {
      const scheduleSelect = screen.getByLabelText("연결된 버전 일정")
      expect(scheduleSelect).toHaveProperty("disabled", true)
    })
    expect(screen.getByText("해당 날짜에 진행 중인 버전 일정이 없습니다")).toBeTruthy()
  })

  it("2단계 결제 선택: 결제 플랫폼 변경 시 지원되는 결제수단 옵션 목록이 동적으로 변경된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    // Google Play 플랫폼: 내 지갑, Google Play, 네이버페이
    const methodSelect = screen.getByLabelText("결제수단")
    expect(methodSelect.textContent).toContain("Google Play")
    expect(methodSelect.textContent).toContain("내 지갑")
    expect(methodSelect.textContent).toContain("네이버페이")

    // Galaxy Store 플랫폼으로 변경
    fireEvent.change(screen.getByLabelText("결제 플랫폼"), { target: { value: "GALAXY_STORE" } })
    expect(methodSelect.textContent).toContain("Galaxy Store")
    expect(methodSelect.textContent).toContain("내 지갑")
    expect(methodSelect.textContent).toContain("네이버페이")
    expect(methodSelect.textContent).not.toContain("Google Play")

    // 기타 (스토어 외) 플랫폼으로 변경
    fireEvent.change(screen.getByLabelText("결제 플랫폼"), { target: { value: "OTHER" } })
    expect(methodSelect.textContent).toContain("내 지갑")
    expect(methodSelect.textContent).toContain("네이버페이")
    expect(methodSelect.textContent).not.toContain("Galaxy Store")
  })

  it("네이버페이 선택 시 잔액 부족 프리뷰(10,000원 단위 충전액)가 노출되고 [충전 후 결제] 원클릭 승인 버튼이 활성화된다", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "월정액 패키지" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "15000" } })

    // 네이버페이 선택 (보유 잔액 3,000원 < 결제액 15,000원 -> 부족액 12,000원 -> 20,000원 충전 필요)
    fireEvent.change(screen.getByLabelText("결제수단"), { target: { value: "NAVER_PAY" } })

    expect(screen.getByText("네이버페이 머니 결제 프리뷰")).toBeTruthy()
    expect(screen.getByText("12,000 원")).toBeTruthy() // 결제 필요 부족액
    expect(screen.getByText("+20,000 원")).toBeTruthy() // 10,000원 단위 자동 충전액
    expect(screen.getByText("8,000 원")).toBeTruthy() // 충전 및 결제 후 예상 잔액 (3000 + 20000 - 15000)

    // 버튼 라벨이 [충전 후 결제]로 변경 확인
    const payBtn = screen.getByRole("button", { name: "충전 후 결제" })
    expect(payBtn).toBeTruthy()

    // 원클릭 결제 클릭
    fireEvent.click(payBtn)
    await waitFor(() => expect(onCompleted).toHaveBeenCalled())

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: "NAVER_PAY",
      deduct_from_asset: false,
    }))
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_expense_id: "e1",
      p_payment_method: "NAVER_PAY",
      p_original_price: 15000,
      p_discount_amount: 0,
      p_used_points: 0,
    }))
  })

  it("최종 실결제액을 수동으로 직접 오버라이드하면 할인 금액이 자동 역산되어 반영된다", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "특별 패키지" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "50000" } })

    // 기본 자동 채움 확인
    const finalInput = screen.getByLabelText("최종 실결제액 (원)") as HTMLInputElement
    expect(finalInput.value).toBe("50000")

    // 실결제액을 42,000원으로 수동 수정 (할인 8,000원 역산)
    fireEvent.change(finalInput, { target: { value: "42000" } })
    const discountInput = screen.getByLabelText("할인 (원)") as HTMLInputElement
    expect(discountInput.value).toBe("8000")
    expect(screen.getByText("실결제액: 42,000 원")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))
    await waitFor(() => expect(onCompleted).toHaveBeenCalled())

    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_original_price: 50000,
      p_discount_amount: 8000,
    }))
  })

  it("네이버페이 선택 시 포인트 입력 필드가 비활성화되고 사용 포인트가 0으로 리셋된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    const pointsInput = screen.getByLabelText("사용 포인트 (P)") as HTMLInputElement
    fireEvent.change(pointsInput, { target: { value: "2000" } })
    expect(pointsInput.value).toBe("2000")

    // 네이버페이로 변경 시
    fireEvent.change(screen.getByLabelText("결제수단"), { target: { value: "NAVER_PAY" } })
    expect(pointsInput.value).toBe("")
    expect(pointsInput).toHaveProperty("disabled", true)
  })
})
