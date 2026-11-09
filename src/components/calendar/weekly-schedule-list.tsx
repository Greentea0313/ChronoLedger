"use client"

import { useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { FavoriteScheduleActions } from "@/components/calendar/favorite-schedule-actions"
import { PickupAvatars, type PickupAvatar } from "@/components/calendar/pickup-avatars"
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
  onAddPlannedExpense?: (scheduleId: string) => void
}

interface GameScheduleGroup {
  key: string
  name: string
  iconUrl?: string
  items: WeeklyScheduleEntry[]
}

const OTHER_GROUP_KEY = "__other__"
const OTHER_GROUP_NAME = "기타"

function shortDate(date: string): string {
  return date.slice(5).replace("-", ".")
}

/** Groups a week's schedules by game (name asc); schedules without a game go last under `기타`. */
function groupSchedulesByGame(schedules: WeeklyScheduleEntry[]): GameScheduleGroup[] {
  const groups: GameScheduleGroup[] = []
  const byKey = new Map<string, GameScheduleGroup>()
  schedules.forEach((schedule) => {
    const key = schedule.gameId ?? OTHER_GROUP_KEY
    let group = byKey.get(key)
    if (!group) {
      group = {
        key,
        name: schedule.gameId ? (schedule.gameName ?? "게임") : OTHER_GROUP_NAME,
        iconUrl: schedule.gameId ? schedule.iconUrl : undefined,
        items: [],
      }
      byKey.set(key, group)
      groups.push(group)
    }
    group.items.push(schedule)
  })
  return groups.sort((a, b) => {
    if (a.key === OTHER_GROUP_KEY) return 1
    if (b.key === OTHER_GROUP_KEY) return -1
    return a.name.localeCompare(b.name, "ko")
  })
}

/** Distinct pickup avatars of a group in schedule order (shown in the collapsed header). */
function collectGroupAvatars(group: GameScheduleGroup): PickupAvatar[] {
  const seen = new Set<string>()
  const avatars: PickupAvatar[] = []
  group.items.forEach((item) => {
    item.pickupAvatars?.forEach((avatar) => {
      if (seen.has(avatar.id)) return
      seen.add(avatar.id)
      avatars.push(avatar)
    })
  })
  return avatars
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
  onAddPlannedExpense,
}: WeeklyScheduleListProps) {
  const weeks = groupDatesByWeek(year, month, todayDate)
  // Open state is screen-local only: the current week starts open, other weeks collapsed; user toggles override that.
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({})
  const isOpen = (key: string, defaultOpen: boolean) => openOverrides[key] ?? defaultOpen
  const toggle = (key: string, defaultOpen: boolean) =>
    setOpenOverrides((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }))

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
          const gameGroups = groupSchedulesByGame(weekSchedules)
          const weekExpenses = (expenses ?? [])
            .filter((e) => e.date >= week.weekStart && e.date <= week.weekEnd)
            .sort((a, b) => a.date.localeCompare(b.date))
          const planned = weekExpenses.filter((e) => e.status === "PLANNED").reduce((sum, e) => sum + e.amount, 0)
          const confirmed = weekExpenses.filter((e) => e.status === "CONFIRMED").reduce((sum, e) => sum + e.amount, 0)
          const defaultOpen = week.isCurrentWeek
          const expenseKey = `${week.weekStart}|expenses`
          const expensesOpen = isOpen(expenseKey, defaultOpen)

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
                <div className="space-y-3">
                  {gameGroups.map((group) => {
                    const groupKey = `${week.weekStart}|game|${group.key}`
                    const open = isOpen(groupKey, defaultOpen)
                    const panelId = `week-panel-${groupKey}`
                    return (
                      <section key={group.key} data-testid="game-group" aria-label={`${group.name} 일정`} className="space-y-1.5">
                        <h4>
                          <button
                            type="button"
                            data-testid="game-group-header"
                            aria-expanded={open}
                            aria-controls={panelId}
                            onClick={() => toggle(groupKey, defaultOpen)}
                            className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs font-semibold text-content-secondary hover:bg-surface"
                          >
                            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
                            {group.iconUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={group.iconUrl} alt="" className="h-5 w-5 rounded object-cover" />
                            )}
                            <span className="truncate">{group.name}</span>
                            <span className="shrink-0 font-normal text-content-muted">{`${group.items.length}건`}</span>
                            <PickupAvatars avatars={collectGroupAvatars(group)} size={20} className="ml-auto" />
                          </button>
                        </h4>
                        {open && (
                          <ul id={panelId} className="space-y-1.5">
                            {group.items.map((schedule) => {
                              // Schedules carried over from a previous week select this week's first day.
                              const targetDate = schedule.start_date >= week.weekStart ? schedule.start_date : week.weekStart
                              return (
                                <li key={schedule.id} className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectDate(targetDate)}
                                    aria-pressed={selectedDate === targetDate}
                                    className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-2 text-left text-sm hover:border-line-control"
                                  >
                                    <PickupAvatars avatars={schedule.pickupAvatars} size={20} />
                                    <ScheduleTypeBadge type={schedule.schedule_type} isRerun={schedule.is_rerun === true} size="sm" />
                                    <span className="min-w-0 flex-1 truncate font-medium text-content">{schedule.title}</span>
                                    <span className="text-xs text-content-muted">{`${schedule.start_date} ~ ${schedule.end_date}`}</span>
                                    <span data-testid="dday-badge" className="text-[10px] font-bold text-content">
                                      {getDdayLabel(todayDate, schedule.end_date)}
                                    </span>
                                  </button>
                                  <FavoriteScheduleActions
                                    scheduleId={schedule.id}
                                    title={schedule.title}
                                    favoriteScheduleIds={favoriteScheduleIds}
                                    onToggleFavorite={onToggleFavorite}
                                    onAddPlannedExpense={onAddPlannedExpense}
                                    className="shrink-0 flex-wrap justify-end"
                                  />
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </section>
                    )
                  })}

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
