import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExpenseModal } from "./expense-modal"
import { getKstToday } from "@/lib/dashboard-date"

const { from, rpc, useAuth, insert, update } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  useAuth: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from, rpc } }))

function query(result: unknown) {
  const q = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn(), update: vi.fn() }
  q.select.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  q.in.mockReturnValue(q)
  q.order.mockResolvedValue(result)
  q.insert = insert
  q.update = update
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
        data: [
          { id: "s1", game_id: "g1", title: "버전 1.0", schedule_type: "VERSION", start_date: today, end_date: today },
          { id: "p1", game_id: "g1", title: "신규 캐릭터 픽업", schedule_type: "PICKUP", start_date: today, end_date: today },
        ],
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
        { platform: "GALAXY_STORE", current_balance: 5000, earn_rate: 10 },
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
  const updated = { eq: vi.fn().mockResolvedValue({ error: null }) }
  update.mockReturnValue(updated)
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

  it("결제 플랫폼(스토어)과 실제 결제수단(내 지갑, 네이버페이)이 명확히 분리되어 제공된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    // 결제 플랫폼에는 스토어가 노출됨
    const platformSelect = screen.getByLabelText("결제 플랫폼")
    expect(platformSelect.textContent).toContain("Google Play")
    expect(platformSelect.textContent).toContain("Galaxy Store")
    expect(platformSelect.textContent).toContain("기타 (스토어 외)")

    // 실제 결제수단에는 오직 '내 지갑'과 '네이버페이'만 제공되고 스토어는 결제수단에 포함되지 않음
    const methodSelect = screen.getByLabelText("결제수단")
    expect(methodSelect.textContent).toContain("내 지갑")
    expect(methodSelect.textContent).toContain("네이버페이")
    expect(methodSelect.textContent).not.toContain("Google Play")
    expect(methodSelect.textContent).not.toContain("Galaxy Store")

    // 플랫폼을 변경해도 실제 결제수단은 항상 '내 지갑'과 '네이버페이' 유지
    fireEvent.change(platformSelect, { target: { value: "GALAXY_STORE" } })
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

  it("네이버페이 선택 시에도 스토어 포인트 사용이 가능하며 차액에 대해 네이버페이 충전/결제가 계산된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "15000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("결제수단"), { target: { value: "NAVER_PAY" } })

    // 15,000 - 5,000P = 실결제액 10,000원
    expect(screen.getByText("실결제액: 10,000 원")).toBeTruthy()
    // 네이버페이 잔액 3,000원, 필요 결제액 10,000원 -> 부족액 7,000원 -> 10,000원 자동 충전
    expect(screen.getByText("7,000 원")).toBeTruthy() // 결제 필요 부족액
    expect(screen.getByText("+10,000 원")).toBeTruthy() // 10,000원 단위 자동 충전액
    expect(screen.getByText("3,000 원")).toBeTruthy() // 충전 및 결제 후 예상 잔액 (3000 + 10000 - 10000)
  })

  it("지출 모달에는 픽업 일정 연결 UI가 없고 pickup_schedule_id는 항상 null로 저장된다", async () => {
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 1.0" })
    expect(screen.queryByLabelText("연결된 픽업 일정")).toBeNull()

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "10000" } })
    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      game_id: "g1",
      schedule_id: "s1",
      pickup_schedule_id: null,
      memo: null,
    }))
  })

  it("applies Google Play boost multiplier and passes custom earned points and event memo tag", async () => {
    setup()
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "패키지 구매" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "100000" } })

    // 부스트 이벤트 체크 및 3배 배율 입력
    const boostToggle = screen.getByLabelText("포인트 부스트 이벤트 적용")
    fireEvent.click(boostToggle)
    const multiplierInput = screen.getByLabelText("부스트 배율:")
    fireEvent.change(multiplierInput, { target: { value: "3" } })

    // 등급 적립률(0.2%)과 무관하게 0.1% × 3배 = 0.3% 고정 -> 100,000 * 0.3% = 300P
    expect(screen.getByText(/이벤트 고정: 1,000원당 3P \(0\.3%\)/)).toBeTruthy()
    const earnedInput = screen.getByLabelText("예상 적립 포인트 (P):") as HTMLInputElement
    expect(earnedInput.value).toBe("300")

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_custom_earned_points: 300,
      p_point_platform: "GOOGLE_PLAY",
      p_used_points: 0,
      p_memo: "[구글 부스트: 3배]",
    }))
  })

  it("applies Galaxy Store payback and supports manual point override", async () => {
    setup()
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "갤스 패키지" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "50000" } })

    // 플랫폼을 Galaxy Store로 변경
    fireEvent.change(screen.getByLabelText("결제 플랫폼"), { target: { value: "GALAXY_STORE" } })

    // 페이백 이벤트 체크 및 30% 입력
    const paybackToggle = screen.getByLabelText("페이백 이벤트 적용")
    fireEvent.click(paybackToggle)
    const paybackRateInput = screen.getByLabelText("페이백률:")
    fireEvent.change(paybackRateInput, { target: { value: "30" } })

    // 기본 계산: 50,000 * 30% = 15,000P
    const earnedInput = screen.getByLabelText("예상 적립 포인트 (P):") as HTMLInputElement
    expect(earnedInput.value).toBe("15000")

    // 사용자가 15,200P로 직접 수정
    fireEvent.change(earnedInput, { target: { value: "15200" } })

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_custom_earned_points: 15200,
      p_memo: "[갤스 페이백: 30%]",
    }))
  })

  it("passes the store point platform to the RPC even when no points are used so earning is not skipped", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "월정액" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "5900" } })
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ point_platform: "GOOGLE_PLAY" }))
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_used_points: 0,
      p_point_discount_amount: 0,
      p_point_platform: "GOOGLE_PLAY",
    }))
  })

  it("restores point_platform when reopening a planned expense and keeps it on save", async () => {
    const onCompleted = vi.fn()
    render(
      <ExpenseModal
        open
        onOpenChange={vi.fn()}
        onCompleted={onCompleted}
        editingExpense={{
          id: "exp-plan-galaxy",
          title: "갤스 예정 패키지",
          original_price: 11000,
          category: "식비",
          target_date: "2026-10-20",
          payment_method: "WALLET",
          point_platform: "GALAXY_STORE",
        }}
      />
    )

    expect((screen.getByLabelText("결제 플랫폼") as HTMLSelectElement).value).toBe("GALAXY_STORE")
    fireEvent.click(screen.getByRole("button", { name: "예정 지출 수정 완료" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ point_platform: "GALAXY_STORE" }))
  })

  it("updates a planned expense with new values when editingExpense is provided", async () => {
    setup()
    const onCompleted = vi.fn()
    const editingPlanned = {
      id: "exp-plan-1",
      title: "원스토어 예정 패키지",
      original_price: 33000,
      category: "식비",
      target_date: "2026-10-20",
      payment_method: "WALLET",
    }

    render(
      <ExpenseModal
        open
        onOpenChange={vi.fn()}
        onCompleted={onCompleted}
        editingExpense={editingPlanned}
      />
    )

    expect(screen.getByText("예정 지출 수정")).toBeTruthy()
    const titleInput = screen.getByLabelText("항목명") as HTMLInputElement
    expect(titleInput.value).toBe("원스토어 예정 패키지")

    fireEvent.change(titleInput, { target: { value: "패키지 수정본" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "44000" } })

    fireEvent.click(screen.getByRole("button", { name: "예정 지출 수정 완료" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      title: "패키지 수정본",
      original_price: 44000,
      final_amount: 44000,
    }))
  })

  it("예정 지출 수정 시 기존 사용자 메모를 보존한다", async () => {
    setup()
    const onCompleted = vi.fn()
    render(
      <ExpenseModal
        open
        onOpenChange={vi.fn()}
        onCompleted={onCompleted}
        editingExpense={{
          id: "exp-plan-memo",
          title: "메모 있는 예정 지출",
          original_price: 20000,
          category: "식비",
          target_date: "2026-10-20",
          payment_method: "WALLET",
          memo: "사용자 메모",
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "예정 지출 수정 완료" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ memo: "사용자 메모" }))
  })

  it("예정 지출 결제 시 기존 메모를 보존하고 이벤트 태그를 병합해 p_memo로 전달한다", async () => {
    setup()
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    render(
      <ExpenseModal
        open
        onOpenChange={vi.fn()}
        onCompleted={onCompleted}
        plannedExpense={{
          id: "exp-plan-pay",
          title: "결제할 예정 지출",
          original_price: 100000,
          payment_method: "WALLET",
          point_platform: "GOOGLE_PLAY",
          category: "게임",
          memo: "사용자 메모",
        }}
      />
    )

    fireEvent.click(screen.getByLabelText("포인트 부스트 이벤트 적용"))
    fireEvent.change(screen.getByLabelText("부스트 배율:"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_memo: "[구글 부스트: 3배] 사용자 메모",
    }))
  })

  it("retains user-modified title when cleared or edited, without bouncing back to schedule title", async () => {
    setup()
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 1.0" })

    const titleInput = screen.getByLabelText("항목명") as HTMLInputElement
    // 게임 선택 직후 일정 연동으로 자동 제안됨
    expect(titleInput.value).toBe("Sample RPG 버전 1.0")

    // 사용자가 항목명을 완전히 지움
    fireEvent.change(titleInput, { target: { value: "" } })
    expect(titleInput.value).toBe("")

    // 사용자가 새로운 항목명 입력
    fireEvent.change(titleInput, { target: { value: "수동 입력 과금" } })
    expect(titleInput.value).toBe("수동 입력 과금")

    // 비동기 쿼리가 완료되어도 타이틀이 복원되지 않고 유지되는지 확인
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(titleInput.value).toBe("수동 입력 과금")
  })

  it("saves user-selected paymentDate as target_date instead of version schedule end_date for planned expense", async () => {
    setup()
    const onCompleted = vi.fn()
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 1.0" })

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "55000" } })

    // 날짜를 명시적으로 변경 (예: 오늘 날짜)
    const dateInput = screen.getByLabelText("결제일 / 예정일") as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: "2026-10-15" } })

    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      target_date: "2026-10-15",
      start_date: "2026-10-15",
      end_date: "2026-10-15",
      status: "PLANNED",
    }))
  })

  it("updates target_date when edited in planned expense edit mode", async () => {
    setup()
    const onCompleted = vi.fn()
    const editingPlanned = {
      id: "exp-plan-2",
      title: "패키지",
      original_price: 33000,
      category: "게임",
      game_id: "g1",
      target_date: "2026-10-10",
      payment_method: "WALLET",
    }

    render(
      <ExpenseModal
        open
        onOpenChange={vi.fn()}
        onCompleted={onCompleted}
        editingExpense={editingPlanned}
      />
    )

    const dateInput = screen.getByLabelText("지출 예정일") as HTMLInputElement
    expect(dateInput.value).toBe("2026-10-10")

    fireEvent.change(dateInput, { target: { value: "2026-10-25" } })
    fireEvent.click(screen.getByRole("button", { name: "예정 지출 수정 완료" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      target_date: "2026-10-25",
      start_date: "2026-10-25",
      end_date: "2026-10-25",
    }))
  })

  it("버전 패스형 체크박스 선택 시 버전 시작일~종료일 기간이 반영된다", async () => {
    from.mockImplementation((table: string) => {
      if (table === "games") return query({ data: [{ id: "g1", name: "Sample RPG" }], error: null })
      if (table === "user_games") {
        const ug = query(null)
        ug.eq.mockResolvedValue({ data: [{ game_id: "g1" }], error: null })
        return ug
      }
      if (table === "game_schedules") {
        return query({
          data: [
            { id: "v1", game_id: "g1", title: "버전 5.0", schedule_type: "VERSION", start_date: "2026-10-01", end_date: "2026-11-15" },
            { id: "p1", game_id: "g1", title: "전반 캐릭터 픽업", schedule_type: "PICKUP", start_date: "2026-10-01", end_date: "2026-10-22" },
            { id: "p2", game_id: "g1", title: "후반 캐릭터 픽업", schedule_type: "PICKUP", start_date: "2026-10-22", end_date: "2026-11-15" },
          ],
          error: null,
        })
      }
      if (table === "user_finances") {
        const fin = query(null)
        fin.eq.mockResolvedValue({ data: [{ total_asset: 50000 }], error: null })
        return fin
      }
      const wallets = query(null)
      wallets.eq.mockResolvedValue({ data: [], error: null })
      return wallets
    })

    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate="2026-10-05" />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    await screen.findByRole("option", { name: "버전 5.0" })

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "25000" } })

    // 버전 패스형 체크박스 선택
    const versionPassToggle = screen.getByLabelText(/버전 패스형/) as HTMLInputElement
    expect(versionPassToggle.checked).toBe(false)
    fireEvent.click(versionPassToggle)
    expect(versionPassToggle.checked).toBe(true)

    // 예정 지출로 등록
    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      game_id: "g1",
      schedule_id: "v1",
      pickup_schedule_id: null,
      start_date: "2026-10-01",
      end_date: "2026-11-15",
      target_date: "2026-11-15",
      status: "PLANNED",
    }))
  })

  it("정가 100% 포인트 할인(정가 5,000원, 할인 5,000원, 사용 포인트 250P) 시 0원 결제가 정상 통과된다", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "100% 할인 패키지" } })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("할인 (원)"), { target: { value: "5000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "250" } })

    expect(screen.getByText("실결제액: 0 원")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_original_price: 5000,
      p_discount_amount: 0,
      p_point_discount_amount: 5000,
      p_used_points: 250,
      p_point_platform: "GOOGLE_PLAY",
    }))
  })

  it("결제 플랫폼(GOOGLE_PLAY, GALAXY_STORE) 변경 시 포인트 지갑이 자동 동기화된다", async () => {
    rpc.mockResolvedValue({ error: null })
    const onCompleted = vi.fn()
    const today = getKstToday()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate={today} />)

    await screen.findByRole("option", { name: "Sample RPG" })
    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "갤스 결제" } })
    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "10000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "1000" } })
    fireEvent.change(screen.getByLabelText("결제 플랫폼"), { target: { value: "GALAXY_STORE" } })

    const pointSelect = screen.getByLabelText("포인트 사용 지갑") as HTMLSelectElement
    expect(pointSelect.value).toBe("GALAXY_STORE")
    expect(pointSelect.disabled).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_point_platform: "GALAXY_STORE",
      p_used_points: 1000,
    }))
  })

  it("결제 플랫폼 OTHER 선택 시 사용 포인트가 비활성화되고 0으로 초기화된다", async () => {
    render(<ExpenseModal open onOpenChange={vi.fn()} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "10000" } })
    fireEvent.change(screen.getByLabelText("사용 포인트 (P)"), { target: { value: "1000" } })
    expect(screen.getByText("실결제액: 9,000 원")).toBeTruthy()

    // 결제 플랫폼을 OTHER로 변경
    fireEvent.change(screen.getByLabelText("결제 플랫폼"), { target: { value: "OTHER" } })

    const pointInput = screen.getByLabelText("사용 포인트 (P)") as HTMLInputElement
    expect(pointInput.disabled).toBe(true)
    expect(pointInput.value).toBe("")
    expect(screen.getByText("실결제액: 10,000 원")).toBeTruthy()
  })
})

