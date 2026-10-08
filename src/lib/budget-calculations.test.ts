import { describe, expect, it } from "vitest"
import {
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
  it("미결제 10/25~11/12 픽업은 종료일이 속한 11월 예산으로 배정된다", () => {
    const expense = pickup()
    expect(calculateExpectedExpense([expense], { year: 2026, month: 11 })).toBe(30000)
    expect(calculateExpectedExpense([expense], { year: 2026, month: 10 })).toBe(0)
    expect(spansMultipleMonths("2026-10-25", "2026-11-12")).toBe(true)
  })

  it("target_date가 시작월이어도 PLANNED는 종료일 월로 귀속한다", () => {
    const expense = pickup({ target_date: "2026-10-25" })
    expect(getBudgetDate(expense)).toBe("2026-11-12")
    expect(calculateExpectedExpense([expense], { year: 2026, month: 11 })).toBe(30000)
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

  it("종료일이 오늘 이전인 PLANNED만 만료 항목으로 오래된 순 정렬한다", () => {
    const expired = pickup({ end_date: "2026-10-01", target_date: "2026-10-01" })
    const older = pickup({ end_date: null, target_date: "2026-09-15" })
    const today = pickup({ end_date: "2026-10-08", target_date: "2026-10-08" })
    const confirmed = pickup({ status: "CONFIRMED", target_date: "2026-09-01", end_date: null })
    expect(findOverduePlannedExpenses([expired, today, confirmed, older], "2026-10-08")).toEqual([older, expired])
  })
})
