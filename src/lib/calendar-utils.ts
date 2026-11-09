export interface CalendarCell {
  date: string
  day: number
  inCurrentMonth: boolean
}

const GRID_WEEKS = 6
const DAYS_PER_WEEK = 7

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

export function getAdjustedBillingDate(year: number, month: number, billingDay: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  const safeBillingDay = Math.min(Math.max(1, billingDay), lastDay)
  return formatDate(toLocalDate(year, month, safeBillingDay))
}

export function buildCalendarGrid(year: number, month: number): CalendarCell[] {
  const firstDate = toLocalDate(year, month, 1)
  const firstWeekday = firstDate.getDay()
  const gridStart = new Date(firstDate)
  gridStart.setDate(firstDate.getDate() - firstWeekday)

  return Array.from({ length: GRID_WEEKS * DAYS_PER_WEEK }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      date: formatDate(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month - 1,
    }
  })
}

export interface MonthRange {
  startDate: string
  endDateExclusive: string
}

export function getMonthRange(year: number, month: number): MonthRange {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const endDateExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return { startDate, endDateExclusive }
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return toLocalDate(year, month, day)
}

export function getTodayLocalDate(): string {
  return formatDate(new Date())
}

export function getGridRange(year: number, month: number): MonthRange {
  const grid = buildCalendarGrid(year, month)
  const last = parseLocalDate(grid[grid.length - 1].date)
  last.setDate(last.getDate() + 1)
  return { startDate: grid[0].date, endDateExclusive: formatDate(last) }
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffInDays(from: string, to: string): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / MS_PER_DAY)
}

/** `D-Day` on the target day, `D-n` before it and `D+n` after it. */
export function getDdayLabel(todayDate: string, targetDate: string): string {
  const diff = diffInDays(todayDate, targetDate)
  if (diff === 0) return "D-Day"
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

/** Elapsed share (0~100) of the inclusive period; single-day and out-of-range periods are clamped safely. */
export function getPeriodProgress(todayDate: string, startDate: string, endDate: string): number {
  if (todayDate < startDate) return 0
  if (todayDate >= endDate) return 100
  const total = diffInDays(startDate, endDate)
  if (total <= 0) return 100
  return Math.round((diffInDays(startDate, todayDate) / total) * 100)
}

export interface WeekGroup {
  weekStart: string
  weekEnd: string
  dates: string[]
  isCurrentWeek: boolean
}

/** Splits the month grid into Sunday-start weeks, dropping weeks without any day of the viewed month. */
export function groupDatesByWeek(year: number, month: number, todayDate: string): WeekGroup[] {
  const grid = buildCalendarGrid(year, month)
  const weeks: WeekGroup[] = []
  for (let index = 0; index < grid.length; index += DAYS_PER_WEEK) {
    const cells = grid.slice(index, index + DAYS_PER_WEEK)
    if (!cells.some((cell) => cell.inCurrentMonth)) continue
    const dates = cells.map((cell) => cell.date)
    weeks.push({
      weekStart: dates[0],
      weekEnd: dates[dates.length - 1],
      dates,
      isCurrentWeek: todayDate >= dates[0] && todayDate <= dates[dates.length - 1],
    })
  }
  return weeks
}
