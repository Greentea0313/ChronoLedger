export interface DateRange {
  startDate: string
  endDateExclusive: string
}

export function getKstMonthDateRange(now: Date): DateRange {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const formatDate = (dateYear: number, dateMonth: number) =>
    `${dateYear}-${String(dateMonth).padStart(2, "0")}-01`

  return {
    startDate: formatDate(year, month),
    endDateExclusive: formatDate(nextMonth.year, nextMonth.month),
  }
}
