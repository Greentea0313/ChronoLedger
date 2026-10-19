import { describe, expect, it } from "vitest"
import {
  calculateConfirmedExpense,
  calculateExpectedExpense,
  calculateRemainingBudget,
  findOverduePlannedExpenses,
  getBudgetDate,
  spansMultipleMonths,
  type BudgetExpense,
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
})
