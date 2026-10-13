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

  it("게임 선택 시 결제일 기준 진행 중인 픽업 일정이 있으면 필드가 disabled 상태로 자동 바인딩되어 pickup_schedule_id가 저장된다", async () => {
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    const pickupSelect = await screen.findByLabelText("연결된 픽업 일정")
    expect(pickupSelect).toHaveProperty("disabled", true)
    expect(screen.getByText(/신규 캐릭터 픽업/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "10000" } })
    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      game_id: "g1",
      schedule_id: "s1",
      pickup_schedule_id: "p1",
      memo: null,
    }))
  })

  it("결제일이 픽업 기간 외에 속하면 '진행 중인 픽업 없음 (픽업 외 지출)'로 자동 매핑되고 pickup_schedule_id가 null로 저장된다", async () => {
    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} initialDate="2026-01-01" />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    const pickupSelect = await screen.findByLabelText("연결된 픽업 일정")
    expect(pickupSelect).toHaveProperty("disabled", true)
    expect(screen.getByText("진행 중인 픽업 없음 (픽업 외 지출)")).toBeTruthy()

    fireEvent.change(screen.getByLabelText("항목명"), { target: { value: "상시 뽑기" } })
    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "15000" } })
    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      game_id: "g1",
      schedule_id: null,
      pickup_schedule_id: null,
      memo: null,
    }))
  })

  it("동일 날짜에 2개 이상의 픽업 배너가 존재하면 진행 중인 모든 배너가 기본 연계되며 단 1회(1x) 지출로 저장된다", async () => {
    const today = getKstToday()
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
            { id: "s1", game_id: "g1", title: "버전 1.0", schedule_type: "VERSION", start_date: today, end_date: today },
            { id: "p1", game_id: "g1", title: "캐릭터 A 픽업", schedule_type: "PICKUP", start_date: today, end_date: today },
            { id: "p2", game_id: "g1", title: "캐릭터 B 픽업", schedule_type: "PICKUP", start_date: today, end_date: today },
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
        data: [{ platform: "GOOGLE_PLAY", current_balance: 10000, earn_rate: 0.2 }],
        error: null,
      })
      return wallets
    })

    const onCompleted = vi.fn()
    render(<ExpenseModal open onOpenChange={vi.fn()} onCompleted={onCompleted} />)
    await screen.findByRole("option", { name: "Sample RPG" })

    fireEvent.change(screen.getByLabelText("게임"), { target: { value: "g1" } })
    const pickupSelect = await screen.findByLabelText("연결된 픽업 일정")
    expect(pickupSelect).toHaveProperty("disabled", true)
    expect(screen.getByRole("option", { name: /진행 중인 모든 배너에 동시 연계/ })).toBeTruthy()

    fireEvent.change(screen.getByLabelText("정가 (원)"), { target: { value: "30000" } })
    fireEvent.click(screen.getByRole("button", { name: "예정 지출로 등록" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    // 1건만 등록되며, 복수 픽업 메타데이터가 담김
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      game_id: "g1",
      original_price: 30000,
      final_amount: 30000,
      pickup_schedule_id: "p1",
      memo: "[PICKUPS:p1,p2]",
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

    // 기본 0.2% × 3배 = 0.6% -> 100,000 * 0.6% = 600P
    const earnedInput = screen.getByLabelText("예상 적립 포인트 (P):") as HTMLInputElement
    expect(earnedInput.value).toBe("600")

    fireEvent.click(screen.getByRole("button", { name: "결제 확정" }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith("process_expense_payment", expect.objectContaining({
      p_custom_earned_points: 600,
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
})
