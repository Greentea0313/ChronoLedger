"use client"

import { useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { DefaultAvatar } from "@/components/character/default-avatar"
import { FavoriteScheduleActions } from "@/components/calendar/favorite-schedule-actions"
import type { PickupAvatar } from "@/components/calendar/pickup-avatars"
import { ScheduleTypeBadge } from "@/components/calendar/schedule-type-badge"
import { getDdayLabel, groupDatesByWeek } from "@/lib/calendar-utils"
import { cn } from "@/lib/utils"

export interface WeeklyScheduleEntry {
  id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  is_rerun?: boolean
  pickupAvatars?: PickupAvatar[]
  start_date: string
  end_date: string
  gameId?: string | null
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
  /** R35 favourites (omit onToggleFavorite for guests to hide the controls). */
  favoriteScheduleIds?: ReadonlySet<string>
  onToggleFavorite?: (scheduleId: string) => void
}

type TypeFilter = "ALL" | WeeklyScheduleEntry["schedule_type"]
type PickupFilter = "ALL" | "NEW" | "RERUN" | "ONGOING"

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PICKUP", label: "픽업" },
  { value: "VERSION", label: "버전" },
  { value: "CONTENTS", label: "콘텐츠" },
  { value: "BROADCAST", label: "방송" },
]

const PICKUP_FILTERS: { value: PickupFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "NEW", label: "신규" },
  { value: "RERUN", label: "복각" },
  { value: "ONGOING", label: "진행 중" },
]

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function shortDate(date: string): string {
  return date.slice(5).replace("-", ".")
}

function slashDate(date: string): string {
  return date.slice(5).replace("-", "/")
}

function dateWithWeekday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return `${slashDate(date)}(${WEEKDAYS[day]})`
}

function matchesFilters(schedule: WeeklyScheduleEntry, typeFilter: TypeFilter, pickupFilter: PickupFilter, todayDate: string): boolean {
  if (typeFilter !== "ALL" && schedule.schedule_type !== typeFilter) return false
  if (typeFilter !== "PICKUP" || pickupFilter === "ALL") return true
  if (pickupFilter === "NEW") return schedule.is_rerun !== true
  if (pickupFilter === "RERUN") return schedule.is_rerun === true
  return schedule.start_date <= todayDate && todayDate <= schedule.end_date
}

function chipClass(active: boolean): string {
  return cn(
    "rounded-full border px-2.5 py-1 text-xs font-semibold",
    active ? "border-primary bg-primary/15 text-primary" : "border-line bg-surface text-content-secondary hover:border-line-control",
  )
}

/** Square avatar: first pickup character (with a small game icon badge) for PICKUP rows, the game icon otherwise. */
function ScheduleAvatar({ schedule }: { schedule: WeeklyScheduleEntry }) {
  const pickup = schedule.schedule_type === "PICKUP" ? schedule.pickupAvatars?.[0] : undefined
  const gameIcon = schedule.iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={schedule.iconUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
  ) : (
    <Gamepad2 className="h-1/2 w-1/2 text-content-secondary" aria-hidden="true" />
  )
  return (
    <span data-testid="schedule-avatar" className="relative h-11 w-11 shrink-0">
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-line bg-surface-2">
        {pickup ? (
          pickup.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pickup.iconUrl} alt={pickup.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <DefaultAvatar />
          )
        ) : (
          gameIcon
        )}
      </span>
      {pickup && (
        <span
          data-testid="game-icon-badge"
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-md border border-surface bg-surface-2"
        >
          {gameIcon}
        </span>
      )}
    </span>
  )
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
  favoriteScheduleIds,
  onToggleFavorite,
}: WeeklyScheduleListProps) {
  const weeks = groupDatesByWeek(year, month, todayDate)
  // Open state is screen-local only: the current week starts open, other weeks collapsed; user toggles override that.
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({})
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [pickupFilter, setPickupFilter] = useState<PickupFilter>("ALL")
  const isOpen = (key: string, defaultOpen: boolean) => openOverrides[key] ?? defaultOpen
  const toggle = (key: string, defaultOpen: boolean) =>
    setOpenOverrides((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }))

  // R91: schedules that already ended (end date before today, KST) never appear in the weekly list.
  const visibleSchedules = schedules.filter(
    (s) => s.end_date >= todayDate && matchesFilters(s, typeFilter, pickupFilter, todayDate),
  )

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

      <div className="mb-3 space-y-2" data-testid="schedule-filters">
        <div role="group" aria-label="일정 유형 필터" className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={typeFilter === option.value}
              onClick={() => {
                setTypeFilter(option.value)
                setPickupFilter("ALL")
              }}
              className={chipClass(typeFilter === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {typeFilter === "PICKUP" && (
          <div role="group" aria-label="픽업 하위 필터" className="flex flex-wrap gap-1.5">
            {PICKUP_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={pickupFilter === option.value}
                onClick={() => setPickupFilter(option.value)}
                className={chipClass(pickupFilter === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {weeks.map((week, index) => {
          // Each schedule is placed at its start date, or at the week's first day when it carried over from a previous week.
          const rows = visibleSchedules
            .filter((s) => s.start_date <= week.weekEnd && s.end_date >= week.weekStart)
            .map((schedule) => {
              const carried = schedule.start_date < week.weekStart
              return { schedule, carried, displayDate: carried ? week.weekStart : schedule.start_date }
            })
            .sort(
              (a, b) =>
                a.displayDate.localeCompare(b.displayDate) ||
                Number(b.carried) - Number(a.carried) ||
                a.schedule.end_date.localeCompare(b.schedule.end_date) ||
                a.schedule.title.localeCompare(b.schedule.title, "ko"),
            )
          const weekExpenses = (expenses ?? [])
            .filter((e) => e.date >= week.weekStart && e.date <= week.weekEnd)
            .sort((a, b) => a.date.localeCompare(b.date))
          const planned = weekExpenses.filter((e) => e.status === "PLANNED").reduce((sum, e) => sum + e.amount, 0)
          const confirmed = weekExpenses.filter((e) => e.status === "CONFIRMED").reduce((sum, e) => sum + e.amount, 0)
          const defaultOpen = week.isCurrentWeek
          const expenseKey = `${week.weekStart}|expenses`
          const expensesOpen = isOpen(expenseKey, defaultOpen)
          const weekKey = `${week.weekStart}|week`
          const weekOpen = isOpen(weekKey, defaultOpen)
          const weekPanelId = `week-panel-${weekKey}`

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
                <h3>
                  {/* R70: every week collapses; only the current week starts open. */}
                  <button
                    type="button"
                    data-testid="week-header"
                    aria-expanded={weekOpen}
                    aria-controls={weekPanelId}
                    onClick={() => toggle(weekKey, defaultOpen)}
                    className="flex items-center gap-2 rounded-md text-left text-sm font-semibold text-content hover:text-primary"
                  >
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !weekOpen && "-rotate-90")} aria-hidden="true" />
                    {`${month}월 ${index + 1}주차`}
                    {week.isCurrentWeek && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">이번 주</span>
                    )}
                  </button>
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-content-secondary">
                  <span data-testid="week-range">{`${slashDate(week.weekStart)}~${slashDate(week.weekEnd)}`}</span>
                  {expenses !== null && (
                    <p data-testid="week-subtotal">{`예정 ${planned.toLocaleString()}원 · 확정 ${confirmed.toLocaleString()}원`}</p>
                  )}
                </div>
              </div>

              {!weekOpen ? null : rows.length === 0 && weekExpenses.length === 0 ? (
                <div id={weekPanelId}>
                  <EmptyState message="이 주에는 일정이 없습니다." />
                </div>
              ) : (
                <div id={weekPanelId} className="space-y-3">
                  {rows.length > 0 && (
                    <ul data-testid="schedule-timeline" className="space-y-1.5">
                      {rows.map(({ schedule, carried, displayDate }, rowIndex) => {
                        const showDate = rowIndex === 0 || rows[rowIndex - 1].displayDate !== displayDate
                        const isToday = displayDate === todayDate
                        // Carried-over schedules select this week's first day.
                        return (
                          <li key={schedule.id} data-testid="timeline-row" className="flex items-center gap-2">
                            <div className="w-[68px] shrink-0 text-xs">
                              {showDate && (
                                <>
                                  <p data-testid="timeline-date" className="font-semibold text-content">{dateWithWeekday(displayDate)}</p>
                                  {isToday && (
                                    <span data-testid="today-badge" className="mt-0.5 inline-block rounded bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-foreground">
                                      TODAY
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectDate(displayDate)}
                              aria-pressed={selectedDate === displayDate}
                              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm hover:border-line-control"
                            >
                              <ScheduleAvatar schedule={schedule} />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-1.5">
                                  <span className="min-w-0 truncate font-bold text-content">{schedule.title}</span>
                                  <ScheduleTypeBadge type={schedule.schedule_type} isRerun={schedule.is_rerun === true} size="sm" />
                                  {carried && (
                                    <span data-testid="ongoing-chip" className="rounded border border-line px-1 py-0.5 text-[10px] font-semibold text-content-secondary">
                                      진행 중
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-content-muted">
                                  <span>{schedule.gameName ?? "기타"}</span>
                                  <span>{`${shortDate(schedule.start_date)} ~ ${shortDate(schedule.end_date)}`}</span>
                                  <span data-testid="dday-badge" className="font-bold text-content">
                                    {getDdayLabel(todayDate, schedule.end_date)}
                                  </span>
                                </span>
                              </span>
                            </button>
                            <FavoriteScheduleActions
                              scheduleId={schedule.id}
                              title={schedule.title}
                              favoriteScheduleIds={favoriteScheduleIds}
                              onToggleFavorite={onToggleFavorite}
                              className="shrink-0 flex-wrap justify-end"
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {expenses !== null && weekExpenses.length > 0 && (
                    <section data-testid="expense-section" aria-label="지출" className="space-y-1.5">
                      <h4>
                        <button
                          type="button"
                          data-testid="expense-section-header"
                          aria-expanded={expensesOpen}
                          aria-controls={`week-panel-${expenseKey}`}
                          onClick={() => toggle(expenseKey, defaultOpen)}
                          className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs font-semibold text-content-secondary hover:bg-surface"
                        >
                          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !expensesOpen && "-rotate-90")} aria-hidden="true" />
                          {`지출 ${weekExpenses.length}건 · 예정 ${planned.toLocaleString()}원 · 확정 ${confirmed.toLocaleString()}원`}
                        </button>
                      </h4>
                      {expensesOpen && (
                        <ul id={`week-panel-${expenseKey}`} className="space-y-1.5">
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
                    </section>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
