"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { getDdayLabel, groupDatesByWeek } from "@/lib/calendar-utils"
import { cn } from "@/lib/utils"

export interface WeeklyScheduleEntry {
  id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  start_date: string
  end_date: string
  gameName: string | null
  iconUrl?: string
}

export interface WeeklyExpenseEntry {
  id: string
  title: string
  status: "PLANNED" | "CONFIRMED"
  amount: number
  /** Date used to place the expense in a week (CONFIRMED: payment date, PLANNED: end/target date). */
  date: string
}

interface WeeklyScheduleListProps {
  year: number
  month: number
  todayDate: string
  selectedDate: string
  schedules: WeeklyScheduleEntry[]
  /** Pass null in guest mode to hide expense items and subtotals. */
  expenses: WeeklyExpenseEntry[] | null
  onSelectDate: (date: string) => void
  onSelectExpense?: (expenseId: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const TYPE_LABELS: Record<WeeklyScheduleEntry["schedule_type"], string> = {
  VERSION: "버전",
  PICKUP: "픽업",
  CONTENTS: "콘텐츠",
}

function shortDate(date: string): string {
  return date.slice(5).replace("-", ".")
}

export function WeeklyScheduleList({
  year,
  month,
  todayDate,
  selectedDate,
  schedules,
  expenses,
  onSelectDate,
  onSelectExpense,
  onPrevMonth,
  onNextMonth,
}: WeeklyScheduleListProps) {
  const weeks = groupDatesByWeek(year, month, todayDate)

  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-card md:p-4" aria-label="주차별 리스트">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold text-content">{`${year}년 ${month}월`}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="이전 달"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-content hover:bg-surface-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="다음 달"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-content hover:bg-surface-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {weeks.map((week, index) => {
          const weekSchedules = schedules
            .filter((s) => s.start_date <= week.weekEnd && s.end_date >= week.weekStart)
            .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date))
          const weekExpenses = (expenses ?? [])
            .filter((e) => e.date >= week.weekStart && e.date <= week.weekEnd)
            .sort((a, b) => a.date.localeCompare(b.date))
          const planned = weekExpenses.filter((e) => e.status === "PLANNED").reduce((sum, e) => sum + e.amount, 0)
          const confirmed = weekExpenses.filter((e) => e.status === "CONFIRMED").reduce((sum, e) => sum + e.amount, 0)

          return (
            <article
              key={week.weekStart}
              data-testid="week-group"
              data-current-week={week.isCurrentWeek ? "true" : "false"}
              className={cn(
                "space-y-2 rounded-md border p-3",
                week.isCurrentWeek ? "border-primary bg-primary/5" : "border-line bg-surface-2",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-content">
                  {`${index + 1}주차 · ${shortDate(week.weekStart)} ~ ${shortDate(week.weekEnd)}`}
                  {week.isCurrentWeek && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">이번 주</span>
                  )}
                </h3>
                {expenses !== null && (
                  <p data-testid="week-subtotal" className="text-xs text-content-secondary">
                    {`예정 ${planned.toLocaleString()}원 · 확정 ${confirmed.toLocaleString()}원`}
                  </p>
                )}
              </div>

              {weekSchedules.length === 0 && weekExpenses.length === 0 ? (
                <EmptyState message="이 주에는 일정이 없습니다." />
              ) : (
                <ul className="space-y-1.5">
                  {weekSchedules.map((schedule) => {
                    // Schedules carried over from a previous week select this week's first day.
                    const targetDate = schedule.start_date >= week.weekStart ? schedule.start_date : week.weekStart
                    return (
                    <li key={schedule.id}>
                      <button
                        type="button"
                        onClick={() => onSelectDate(targetDate)}
                        aria-pressed={selectedDate === targetDate}
                        className="flex w-full flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm hover:border-line-control"
                      >
                        {schedule.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={schedule.iconUrl} alt="" className="h-6 w-6 rounded object-cover" />
                        )}
                        <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-content">
                          {TYPE_LABELS[schedule.schedule_type]}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-content">
                          {`${schedule.gameName ?? "게임"} · ${schedule.title}`}
                        </span>
                        <span className="text-xs text-content-muted">{`${schedule.start_date} ~ ${schedule.end_date}`}</span>
                        <span data-testid="dday-badge" className="text-[10px] font-bold text-content">
                          {getDdayLabel(todayDate, schedule.end_date)}
                        </span>
                      </button>
                    </li>
                    )
                  })}
                  {weekExpenses.map((expense) => (
                    <li key={`expense-${expense.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelectExpense?.(expense.id)}
                        aria-label={`${expense.title} 상세`}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm hover:border-line-control"
                      >
                        <span className="min-w-0 flex-1 truncate text-content">{expense.title}</span>
                        <span className="text-xs text-content-muted">{expense.status === "PLANNED" ? "예정" : "확정"}</span>
                        <span className="font-semibold text-info">{`${expense.amount.toLocaleString()} 원`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
