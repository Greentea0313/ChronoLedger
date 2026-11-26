import { describe, expect, it } from "vitest"
import {
  calculateConfirmedExpense,
  calculateGameBudgetUsage,
  calculateExpectedExpense,
  calculateMonthBudgetBreakdown,
  calculateRemainingBudget,
  calculateTwoMonthBudgetComparison,
  findOverduePlannedExpenses,
  getBudgetDate,
  getNextMonthKey,
  spansMultipleMonths,
  type BudgetComparisonExpense,
  type BudgetExpense,
  type BudgetSubscriptionTemplate,
} from "./budget-calculations"

const pickup = (overrides: Partial<BudgetExpense> = {}): BudgetExpense => ({
  status: "PLANNED",
  target_date: "2026-11-12",
  end_date: "2026-11-12",
  final_amount: 30000,
  ...overrides,
})

describe("budget-calculations", () => {
  it("미결제 11/12 예정 지출은 11월 예산으로 배정된다", () => {
    const expense = pickup()
    expect(calculateExpectedExpense([expense], { year: 2026, month: 11 })).toBe(30000)
    expect(calculateExpectedExpense([expense], { year: 2026, month: 10 })).toBe(0)
    expect(spansMultipleMonths("2026-10-25", "2026-11-12")).toBe(true)
  })

  it("단일일 지정 예정 지출은 지출 예정일(target_date)이 속한 달의 예산으로 귀속한다", () => {
    const expense = pickup({ target_date: "2026-10-25", end_date: "2026-10-25" })
    expect(getBudgetDate(expense)).toBe("2026-10-25")
    expect(calculateExpectedExpense([expense], { year: 2026, month: 10 })).toBe(30000)
    expect(calculateExpectedExpense([expense], { year: 2026, month: 11 })).toBe(0)
  })

  it("버전 패스형 미결제 지출(10월 시작 ~ 11월 종료)은 최종 마감일(end_date)인 11월 예산으로 귀속된다", () => {
    const passExpense = pickup({ target_date: "2026-11-28", end_date: "2026-11-28" })
    expect(getBudgetDate(passExpense)).toBe("2026-11-28")
    expect(calculateExpectedExpense([passExpense], { year: 2026, month: 11 })).toBe(30000)
    expect(calculateExpectedExpense([passExpense], { year: 2026, month: 10 })).toBe(0)
  })

  it("10월에 결제하면 11월 예상 소비액이 즉시 줄고 10월에 합산된다", () => {
    const before = [pickup(), pickup({ target_date: "2026-11-20", end_date: null, final_amount: 5000 })]
    expect(calculateExpectedExpense(before, { year: 2026, month: 11 })).toBe(35000)

    const after: BudgetExpense[] = [
      pickup({ status: "CONFIRMED", target_date: "2026-10-26", final_amount: 28000 }),
      before[1],
    ]
    expect(calculateExpectedExpense(after, { year: 2026, month: 11 })).toBe(5000)
    expect(calculateExpectedExpense(after, { year: 2026, month: 10 })).toBe(28000)
  })

  it("취소된 지출은 합계에서 제외한다", () => {
    expect(calculateExpectedExpense([pickup({ status: "CANCELLED" })], { year: 2026, month: 11 })).toBe(0)
  })

  it("남은 예산을 계산한다", () => {
    expect(calculateRemainingBudget(100000, 35000)).toBe(65000)
    expect(calculateRemainingBudget(10000, 15000)).toBe(-5000)
  })

  it("당월 확정 지출(status === 'CONFIRMED')만 합산한다", () => {
    const list: BudgetExpense[] = [
      pickup({ status: "CONFIRMED", target_date: "2026-10-10", final_amount: 15000 }),
      pickup({ status: "CONFIRMED", target_date: "2026-10-20", final_amount: 25000 }),
      pickup({ status: "PLANNED", target_date: "2026-10-25", final_amount: 10000 }),
      pickup({ status: "CANCELLED", target_date: "2026-10-15", final_amount: 5000 }),
      pickup({ status: "CONFIRMED", target_date: "2026-11-01", final_amount: 30000 }),
    ]
    expect(calculateConfirmedExpense(list, { year: 2026, month: 10 })).toBe(40000)
    expect(calculateConfirmedExpense(list, { year: 2026, month: 11 })).toBe(30000)
  })

  it("진행률 및 남은 예정 지출 금액 계산식을 검증한다", () => {
    const expectedExpense = 50000
    const confirmedExpense = 20000
    const progress = expectedExpense > 0 ? Math.min(100, Math.round((confirmedExpense / expectedExpense) * 100)) : 0
    const remainingExpected = Math.max(0, expectedExpense - confirmedExpense)

    expect(progress).toBe(40)
    expect(remainingExpected).toBe(30000)

    // 확정 지출이 예상 지출을 초과하거나 같은 경우
    const overConfirmed = 60000
    const overProgress = expectedExpense > 0 ? Math.min(100, Math.round((overConfirmed / expectedExpense) * 100)) : 0
    expect(overProgress).toBe(100)
    expect(Math.max(0, expectedExpense - overConfirmed)).toBe(0)

    // 예상 지출이 0인 경우
    expect(0 > 0 ? Math.min(100, Math.round((0 / 0) * 100)) : 0).toBe(0)
  })

  it("종료일이 오늘 이전인 PLANNED만 만료 항목으로 오래된 순 정렬한다", () => {
    const expired = pickup({ end_date: "2026-10-01", target_date: "2026-10-01" })
    const older = pickup({ end_date: null, target_date: "2026-09-15" })
    const today = pickup({ end_date: "2026-10-08", target_date: "2026-10-08" })
    const confirmed = pickup({ status: "CONFIRMED", target_date: "2026-09-01", end_date: null })
    expect(findOverduePlannedExpenses([expired, today, confirmed, older], "2026-10-08")).toEqual([older, expired])
  })

  it("12월의 다음 달 MonthKey는 다음 해 1월을 반환한다", () => {
    expect(getNextMonthKey({ year: 2026, month: 11 })).toEqual({ year: 2026, month: 12 })
    expect(getNextMonthKey({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 })
  })

  it("당월·익월 비교 시 이미 생성된 template_id 지출과 미생성 활성 MONTHLY_DAY 템플릿만 중복 없이 합산한다", () => {
    const expenses: BudgetComparisonExpense[] = [
      { status: "CONFIRMED", target_date: "2026-11-05", end_date: null, final_amount: 5900, template_id: "tpl-monthly-1" },
      { status: "PLANNED", target_date: "2026-11-25", end_date: null, final_amount: 12000, template_id: "tpl-monthly-2" },
      { status: "PLANNED", target_date: "2026-11-20", end_date: null, final_amount: 30000, template_id: null },
      { status: "PLANNED", target_date: "2026-12-10", end_date: "2026-12-10", final_amount: 119000, template_id: null },
      { status: "CANCELLED", target_date: "2026-12-05", end_date: null, final_amount: 5900, template_id: "tpl-monthly-1" },
    ]
    const templates: BudgetSubscriptionTemplate[] = [
      { id: "tpl-monthly-1", is_active: true, cycle_type: "MONTHLY_DAY", default_price: 5900 },
      { id: "tpl-monthly-2", is_active: true, cycle_type: "MONTHLY_DAY", default_price: 12000 },
      { id: "tpl-interval", is_active: true, cycle_type: "INTERVAL_30", default_price: 9900 },
      { id: "tpl-version", is_active: true, cycle_type: "VERSION_PASS", default_price: 12000 },
      { id: "tpl-inactive", is_active: false, cycle_type: "MONTHLY_DAY", default_price: 4900 },
    ]

    const result = calculateTwoMonthBudgetComparison({
      currentMonth: { year: 2026, month: 11 },
      currentBudgetAmount: 100000,
      nextBudgetAmount: 120000,
      expenses,
      templates,
    })

    expect(result.current).toEqual({
      month: { year: 2026, month: 11 },
      budgetAmount: 100000,
      confirmedAmount: 5900,
      plannedFixedAmount: 12000,
      plannedVariableAmount: 30000,
      totalExpectedAmount: 47900,
      remainingBudget: 52100,
      isOverBudget: false,
    })
    expect(result.next).toEqual({
      month: { year: 2026, month: 12 },
      budgetAmount: 120000,
      confirmedAmount: 0,
      plannedFixedAmount: 12000, // R101-REV-001: 12월 CANCELLED 행이 있는 tpl-monthly-1은 제외되고 미생성 tpl-monthly-2(12000)만 합산
      plannedVariableAmount: 119000,
      totalExpectedAmount: 131000,
      remainingBudget: -11000,
      isOverBudget: true,
    })
  })

  it("R101-REV-001: 당월 취소·환불된 활성 MONTHLY_DAY 구독은 당월 고정비에서 제외되고 익월에는 정상 합산된다", () => {
    const expenses: BudgetComparisonExpense[] = [
      {
        status: "CANCELLED",
        target_date: "2026-11-05",
        end_date: null,
        final_amount: 5900,
        template_id: "tpl-cancelled",
        billing_cycle: "2026-11",
      },
      {
        status: "CANCELLED",
        target_date: "2026-10-28",
        end_date: null,
        final_amount: 12000,
        template_id: "tpl-early-refunded",
        billing_cycle: "2026-11",
      },
    ]
    const templates: BudgetSubscriptionTemplate[] = [
      { id: "tpl-cancelled", is_active: true, cycle_type: "MONTHLY_DAY", default_price: 5900 },
      { id: "tpl-early-refunded", is_active: true, cycle_type: "MONTHLY_DAY", default_price: 12000 },
    ]

    const result = calculateTwoMonthBudgetComparison({
      currentMonth: { year: 2026, month: 11 },
      currentBudgetAmount: 100000,
      nextBudgetAmount: 100000,
      expenses,
      templates,
    })

    // 11월은 billing_cycle '2026-11' CANCELLED 행이 존재하므로 두 템플릿 모두 고정 구독 예정에서 제외(0원)
    expect(result.current.plannedFixedAmount).toBe(0)
    expect(result.current.totalExpectedAmount).toBe(0)
    // 12월은 CANCELLED 행이 없으므로 두 활성 템플릿 모두 정상 예측(5900 + 12000)
    expect(result.next.plannedFixedAmount).toBe(17900)
    expect(result.next.totalExpectedAmount).toBe(17900)

    // target_date는 10월이지만 billing_cycle이 '2026-11'인 환불 행은 10월 고정비를 제외하지 않음
    const oct = calculateMonthBudgetBreakdown({
      month: { year: 2026, month: 10 },
      budgetAmount: 100000,
      expenses,
      templates,
    })
    expect(oct.plannedFixedAmount).toBe(17900)
  })

  it("예산이 0원(미설정)이면 총 예상 지출이 양수여도 isOverBudget은 false다", () => {
    const breakdown = calculateMonthBudgetBreakdown({
      month: { year: 2026, month: 11 },
      budgetAmount: 0,
      expenses: [{ status: "PLANNED", target_date: "2026-11-10", final_amount: 50000 }],
      templates: [],
    })
    expect(breakdown.isOverBudget).toBe(false)
    expect(breakdown.remainingBudget).toBe(-50000)
  })

  it("C-4 월 경계: 11-30 예정 지출을 12-01 보정 확정해도 target_date(11-30) 기준으로 11월에만 귀속된다", () => {
    const expenses: BudgetComparisonExpense[] = [
      { status: "CONFIRMED", target_date: "2026-11-30", end_date: null, final_amount: 5900, template_id: "tpl-1" },
      { status: "CONFIRMED", target_date: "2026-12-05", end_date: null, final_amount: 10000, template_id: null },
    ]
    const nov = calculateMonthBudgetBreakdown({
      month: { year: 2026, month: 11 },
      budgetAmount: 50000,
      expenses,
      templates: [],
    })
    const dec = calculateMonthBudgetBreakdown({
      month: { year: 2026, month: 12 },
      budgetAmount: 50000,
      expenses,
      templates: [],
    })
    expect(nov.confirmedAmount).toBe(5900)
    expect(dec.confirmedAmount).toBe(10000)
    expect(calculateConfirmedExpense(expenses, { year: 2026, month: 12 })).toBe(10000)
  })
})

describe("calculateGameBudgetUsage (R114)", () => {
  const october = { year: 2026, month: 10 }
  const budgets = [
    { game_id: "g1", monthly_budget: 10000 },
    { game_id: "g2", monthly_budget: 5000 },
  ]

  it("114-1: game_id 기준 예정+확정 합, 예정은 end_date 달, 취소·환불·game_id 없는 지출 제외", () => {
    const usage = calculateGameBudgetUsage(
      [
        // Confirmed after point discount: final_amount is used.
        { game_id: "g1", status: "CONFIRMED", target_date: "2026-10-05", final_amount: 5000 },
        // PLANNED ending in October counts in October; PLANNED ending in November does not.
        { game_id: "g1", status: "PLANNED", target_date: "2026-09-28", end_date: "2026-10-02", final_amount: 2000 },
        { game_id: "g1", status: "PLANNED", target_date: "2026-10-30", end_date: "2026-11-02", final_amount: 1000 },
        // Cancelled and refunded rows are CANCELLED.
        { game_id: "g1", status: "CANCELLED", target_date: "2026-10-10", final_amount: 4000 },
        { game_id: "g1", status: "CANCELLED", target_date: "2026-10-11", final_amount: 4000 },
        // A '정기 구독' expense with the game still counts (category is not part of the input).
        { game_id: "g1", status: "CONFIRMED", target_date: "2026-10-12", final_amount: 1000 },
        // No game_id: excluded.
        { game_id: null, status: "CONFIRMED", target_date: "2026-10-12", final_amount: 9000 },
        { status: "CONFIRMED", target_date: "2026-10-12", final_amount: 9000 },
        // Other month.
        { game_id: "g2", status: "CONFIRMED", target_date: "2026-09-30", final_amount: 7000 },
      ],
      october,
      budgets,
    )
    expect(usage).toEqual([
      { game_id: "g1", budget: 10000, used: 8000, ratio: 0.8 },
      { game_id: "g2", budget: 5000, used: 0, ratio: 0 },
    ])
  })

  it("예산이 없거나 0 이하인 게임은 결과에 넣지 않는다", () => {
    expect(
      calculateGameBudgetUsage(
        [{ game_id: "g3", status: "CONFIRMED", target_date: "2026-10-01", final_amount: 100 }],
        october,
        [{ game_id: "g3", monthly_budget: 0 }],
      ),
    ).toEqual([])
  })
})
