/** R118-C: 월간 리포트 차트용 순수 함수. CONFIRMED 지출만, 귀속은 target_date의 달(YYYY-MM)임. */

export interface ReportExpense {
  status: string
  category: string
  final_amount: number
  target_date: string
}

export interface CategoryComparisonRow {
  category: string
  current: number
  previous: number
}

export interface MonthlyCategoryComparison {
  month: string
  previousMonth: string
  rows: CategoryComparisonRow[]
}

export interface CumulativeDay {
  day: number
  current: number | null
  previous: number | null
}

const CATEGORY_ORDER = ["게임", "정기 구독", "식비", "교통", "생활", "기타"]

/** 이전 달 키(YYYY-MM). */
export function getPreviousMonthKey(month: string): string {
  const [year, mon] = month.split("-").map(Number)
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, "0")}`
}

/** 달 일수(윤년 반영). 시간대 변환 없이 UTC 날짜 산술만 씀. */
export function getDaysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number)
  return new Date(Date.UTC(year, mon, 0)).getUTCDate()
}

function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

export function buildMonthlyCategoryComparison(
  expenses: ReadonlyArray<ReportExpense>,
  month: string,
): MonthlyCategoryComparison {
  const previousMonth = getPreviousMonthKey(month)
  const sums = new Map<string, { current: number; previous: number }>()
  for (const exp of expenses) {
    if (exp.status !== "CONFIRMED") continue
    const key = exp.target_date.slice(0, 7)
    if (key !== month && key !== previousMonth) continue
    const entry = sums.get(exp.category) ?? { current: 0, previous: 0 }
    if (key === month) entry.current += exp.final_amount
    else entry.previous += exp.final_amount
    sums.set(exp.category, entry)
  }
  const rows: CategoryComparisonRow[] = []
  sums.forEach((value, category) => {
    if (value.current === 0 && value.previous === 0) return
    rows.push({ category, current: value.current, previous: value.previous })
  })
  rows.sort((a, b) => b.current - a.current || categoryRank(a.category) - categoryRank(b.category))
  return { month, previousMonth, rows }
}

/** 일별 누적 확정 지출. `todayKst`가 선택 달 안이면 그 날짜 이후 current는 null임. */
export function buildCumulativeDailySpend(
  expenses: ReadonlyArray<ReportExpense>,
  month: string,
  todayKst: string,
): { days: CumulativeDay[] } {
  const previousMonth = getPreviousMonthKey(month)
  const currentDays = getDaysInMonth(month)
  const previousDays = getDaysInMonth(previousMonth)
  const currentByDay = new Array<number>(currentDays + 1).fill(0)
  const previousByDay = new Array<number>(previousDays + 1).fill(0)
  for (const exp of expenses) {
    if (exp.status !== "CONFIRMED") continue
    const key = exp.target_date.slice(0, 7)
    const day = Number(exp.target_date.slice(8, 10))
    if (key === month && day >= 1 && day <= currentDays) currentByDay[day] += exp.final_amount
    else if (key === previousMonth && day >= 1 && day <= previousDays) previousByDay[day] += exp.final_amount
  }
  const todayInMonth = todayKst.slice(0, 7) === month ? Number(todayKst.slice(8, 10)) : null
  const lastCurrentDay = todayInMonth === null ? currentDays : Math.min(todayInMonth, currentDays)
  const total = Math.max(currentDays, previousDays)
  const days: CumulativeDay[] = []
  let currentSum = 0
  let previousSum = 0
  for (let day = 1; day <= total; day += 1) {
    if (day <= currentDays) currentSum += currentByDay[day]
    if (day <= previousDays) previousSum += previousByDay[day]
    days.push({
      day,
      current: day <= lastCurrentDay ? currentSum : null,
      previous: day <= previousDays ? previousSum : null,
    })
  }
  return { days }
}
