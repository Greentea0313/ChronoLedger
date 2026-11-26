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

/**
 * 해당 월 확정 소비액 (status === "CONFIRMED").
 */
export function calculateConfirmedExpense(expenses: BudgetExpense[], month: MonthKey): number {
  return expenses
    .filter((expense) => expense.status === "CONFIRMED" && sameMonth(getBudgetDate(expense), month))
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

export interface BudgetComparisonExpense extends BudgetExpense {
  template_id?: string | null
  billing_cycle?: string | null
}

const BILLING_CYCLE_RE = /^\d{4}-\d{2}$/

function sameBillingCycle(billingCycle: string, { year, month }: MonthKey): boolean {
  return Number(billingCycle.slice(0, 4)) === year && Number(billingCycle.slice(5, 7)) === month
}

export interface BudgetSubscriptionTemplate {
  id: string
  is_active: boolean
  cycle_type?: "MONTHLY_DAY" | "INTERVAL_30" | "VERSION_PASS" | string
  default_price: number
}

export interface MonthBudgetBreakdown {
  month: MonthKey
  budgetAmount: number
  confirmedAmount: number
  /** 해당 월 귀속 PLANNED 중 template_id가 있는 지출 + 아직 해당 월 지출(PLANNED/CONFIRMED/CANCELLED)이 없는 활성 MONTHLY_DAY 템플릿의 default_price 합계 */
  plannedFixedAmount: number
  /** 해당 월 귀속 PLANNED 중 template_id가 없는 일반 예정 지출 합계 */
  plannedVariableAmount: number
  /** confirmedAmount + plannedFixedAmount + plannedVariableAmount */
  totalExpectedAmount: number
  /** budgetAmount - totalExpectedAmount */
  remainingBudget: number
  isOverBudget: boolean
}

export interface TwoMonthBudgetComparison {
  current: MonthBudgetBreakdown
  next: MonthBudgetBreakdown
}

/** 다음 달 MonthKey를 반환한다(12월이면 다음 해 1월). */
export function getNextMonthKey(month: MonthKey): MonthKey {
  if (month.month >= 12) {
    return { year: month.year + 1, month: 1 }
  }
  return { year: month.year, month: month.month + 1 }
}

/** 단일 월의 예산·확정·고정구독(미생성 MONTHLY_DAY 포함)·일반 예정 지출 내역을 산출한다. */
export function calculateMonthBudgetBreakdown(params: {
  month: MonthKey
  budgetAmount: number
  expenses: readonly BudgetComparisonExpense[]
  templates: readonly BudgetSubscriptionTemplate[]
}): MonthBudgetBreakdown {
  const { month, budgetAmount, expenses, templates } = params
  let confirmedAmount = 0
  let plannedFixedAmount = 0
  let plannedVariableAmount = 0
  const coveredTemplateIds = new Set<string>()

  for (const expense of expenses) {
    if (expense.status === "CANCELLED") {
      if (expense.template_id) {
        const belongsToMonth =
          expense.billing_cycle && BILLING_CYCLE_RE.test(expense.billing_cycle)
            ? sameBillingCycle(expense.billing_cycle, month)
            : sameMonth(expense.end_date ?? expense.target_date, month)
        if (belongsToMonth) {
          coveredTemplateIds.add(expense.template_id)
        }
      }
      continue
    }
    if (!isBudgetCounted(expense) || !sameMonth(getBudgetDate(expense), month)) continue
    if (expense.template_id) coveredTemplateIds.add(expense.template_id)
    if (expense.status === "CONFIRMED") {
      confirmedAmount += expense.final_amount
    } else if (expense.template_id) {
      plannedFixedAmount += expense.final_amount
    } else {
      plannedVariableAmount += expense.final_amount
    }
  }

  for (const tpl of templates) {
    if (!tpl.is_active) continue
    if ((tpl.cycle_type ?? "MONTHLY_DAY") !== "MONTHLY_DAY") continue
    if (coveredTemplateIds.has(tpl.id)) continue
    plannedFixedAmount += tpl.default_price
  }

  const totalExpectedAmount = confirmedAmount + plannedFixedAmount + plannedVariableAmount
  const remainingBudget = budgetAmount - totalExpectedAmount
  const isOverBudget = budgetAmount > 0 && totalExpectedAmount > budgetAmount

  return {
    month,
    budgetAmount,
    confirmedAmount,
    plannedFixedAmount,
    plannedVariableAmount,
    totalExpectedAmount,
    remainingBudget,
    isOverBudget,
  }
}

/** 당월과 익월의 2개월 예산·고정 구독비 비교 내역을 반환한다. */
export function calculateTwoMonthBudgetComparison(params: {
  currentMonth: MonthKey
  currentBudgetAmount: number
  nextBudgetAmount: number
  expenses: readonly BudgetComparisonExpense[]
  templates: readonly BudgetSubscriptionTemplate[]
}): TwoMonthBudgetComparison {
  const nextMonth = getNextMonthKey(params.currentMonth)
  return {
    current: calculateMonthBudgetBreakdown({
      month: params.currentMonth,
      budgetAmount: params.currentBudgetAmount,
      expenses: params.expenses,
      templates: params.templates,
    }),
    next: calculateMonthBudgetBreakdown({
      month: nextMonth,
      budgetAmount: params.nextBudgetAmount,
      expenses: params.expenses,
      templates: params.templates,
    }),
  }
}

export interface GameBudgetExpense extends BudgetExpense {
  game_id?: string | null
}

export interface GameBudget {
  game_id: string
  monthly_budget: number
}

export interface GameBudgetUsage {
  game_id: string
  budget: number
  used: number
  /** used / budget (1 = 100%). */
  ratio: number
}

/**
 * R114: 게임별 월 예산 사용액. 분류와 무관하게 game_id가 같은 PLANNED·CONFIRMED 지출의 final_amount 합이며,
 * 귀속 달은 월 예산과 같은 getBudgetDate 규칙(예정은 end_date 달)을 쓴다. 서버 알림(enqueue_game_budget_notifications)과 같은 규칙.
 */
export function calculateGameBudgetUsage(
  expenses: readonly GameBudgetExpense[],
  month: MonthKey,
  budgets: readonly GameBudget[],
): GameBudgetUsage[] {
  const used = new Map<string, number>()
  expenses.forEach((expense) => {
    if (!expense.game_id || !isBudgetCounted(expense) || !sameMonth(getBudgetDate(expense), month)) return
    used.set(expense.game_id, (used.get(expense.game_id) ?? 0) + expense.final_amount)
  })
  return budgets
    .filter((budget) => budget.monthly_budget > 0)
    .map((budget) => {
      const amount = used.get(budget.game_id) ?? 0
      return { game_id: budget.game_id, budget: budget.monthly_budget, used: amount, ratio: amount / budget.monthly_budget }
    })
}
