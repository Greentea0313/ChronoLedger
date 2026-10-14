export interface BudgetExpense {
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  target_date: string
  end_date?: string | null
  final_amount: number
}

export interface MonthKey {
  year: number
  month: number
}

function monthOf(date: string): MonthKey {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) }
}

function sameMonth(date: string, { year, month }: MonthKey): boolean {
  const parsed = monthOf(date)
  return parsed.year === year && parsed.month === month
}

/**
 * 예산 귀속 날짜.
 * - 결제 완료(CONFIRMED): 실제 결제일(target_date)이 속한 달로 배정.
 * - 미결제(PLANNED):
 *   버전 패스/기간형 지출처럼 마감일(end_date)이 지정된 경우, 최종 결제 마감 시한인 end_date가 속한 달의 예산에서 차감 대기.
 *   특정일 지정 지출(end_date가 없거나 target_date와 동일)은 지출 예정일(target_date)이 속한 달로 배정.
 */
export function getBudgetDate(expense: BudgetExpense): string {
  if (expense.status === "PLANNED" && expense.end_date) {
    return expense.end_date
  }
  return expense.target_date
}

export function isBudgetCounted(expense: BudgetExpense): boolean {
  return expense.status === "PLANNED" || expense.status === "CONFIRMED"
}

/**
 * 해당 월 예상 소비액. 이전 달에 결제된 픽업 지출은 target_date가 결제일로 바뀌므로
 * 익월 예정액에서 자동으로 제외되고 결제월 합계에만 포함된다.
 */
export function calculateExpectedExpense(expenses: BudgetExpense[], month: MonthKey): number {
  return expenses
    .filter((expense) => isBudgetCounted(expense) && sameMonth(getBudgetDate(expense), month))
    .reduce((sum, expense) => sum + expense.final_amount, 0)
}

export function calculateRemainingBudget(budgetAmount: number, expectedExpense: number): number {
  return budgetAmount - expectedExpense
}

/** 시작일과 종료일이 서로 다른 달에 걸치는 일정인지 여부. */
export function spansMultipleMonths(startDate: string, endDate: string): boolean {
  return startDate.slice(0, 7) !== endDate.slice(0, 7)
}

/**
 * 기한이 지난 미결제 예정 지출(종료일 또는 예정일 < 오늘). 결제하거나 예정 취소로 정리해야 한다.
 */
export function findOverduePlannedExpenses<T extends BudgetExpense>(expenses: T[], today: string): T[] {
  return expenses
    .filter((expense) => expense.status === "PLANNED" && getBudgetDate(expense) < today)
    .sort((a, b) => getBudgetDate(a).localeCompare(getBudgetDate(b)))
}
