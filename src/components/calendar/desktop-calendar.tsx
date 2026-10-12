import { ScheduleBanner } from "@/components/calendar/schedule-banner"

export interface CalendarScheduleItem {
  id: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  is_start_date: boolean
  game_id: string
}

export interface CalendarGameIcon {
  gameId: string
  label: string
  iconUrl?: string
}

export interface DesktopCalendarDay {
  date: string
  day: number
  inCurrentMonth: boolean
  schedules: CalendarScheduleItem[]
  icons: CalendarGameIcon[]
  hasMemo: boolean
}

interface DesktopCalendarProps {
  year: number
  month: number
  days: DesktopCalendarDay[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export function DesktopCalendar({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: DesktopCalendarProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-card md:p-4" aria-label="월간 캘린더">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-content">{`${year}년 ${month}월`}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevMonth}
            className="h-8 w-8 p-0 rounded-[10px] flex items-center justify-center transition-opacity hover:opacity-80"
            aria-label="이전 달"
          >
            <img src="/assets/nav/v1-prev-dark.svg" alt="" className="hidden dark:block h-8 w-8" />
            <img src="/assets/nav/v1-prev-light.svg" alt="" className="block dark:hidden h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="h-8 w-8 p-0 rounded-[10px] flex items-center justify-center transition-opacity hover:opacity-80"
            aria-label="다음 달"
          >
            <img src="/assets/nav/v1-next-dark.svg" alt="" className="hidden dark:block h-8 w-8" />
            <img src="/assets/nav/v1-next-light.svg" alt="" className="block dark:hidden h-8 w-8" />
          </button>
        </div>
      </header>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-content-muted">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div key={`${year}-${month}`} className="grid grid-cols-7 gap-1 animate-month-change">
        {days.map((day) => {
          const isSelected = day.date === selectedDate
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              aria-label={day.date}
              aria-pressed={isSelected}
              className={`relative flex flex-col justify-between min-h-[72px] md:min-h-[96px] overflow-hidden rounded-md border p-1 md:p-1.5 text-left transition-colors duration-fast ${
                isSelected
                  ? "border-primary bg-primary/15"
                  : "border-line bg-app hover:border-line-control"
              } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
            >
              {/* Top row: Day number on left, Game icons and Memo on right */}
              <div className="flex items-start justify-between w-full">
                <span className="text-xs md:text-sm font-semibold leading-none">{day.day}</span>
                <div className="flex flex-col gap-0.5 items-end">
                  {day.icons.slice(0, 3).map((icon) => (
                    <span
                      key={`${day.date}-${icon.gameId}`}
                      title={icon.label}
                      aria-label={icon.label}
                      className="h-4 w-4 md:h-5 md:w-5 inline-block overflow-hidden rounded-[3px] md:rounded-[4px] bg-primary/20 text-center flex items-center justify-center"
                    >
                      {icon.iconUrl ? (
                        <img src={icon.iconUrl} alt={icon.label} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] md:text-xs">🎮</span>
                      )}
                    </span>
                  ))}
                  {day.hasMemo && <span className="h-2 w-2 rounded-full bg-content-muted mr-0.5 mt-0.5" />}
                </div>
              </div>

              {/* Bottom-left: VERSION, PICKUP, CONTENTS tags (strictly in this order, start_date only) */}
              <div className="flex flex-col gap-0.5 items-start mt-auto pt-1 z-10">
                {(() => {
                  const hasVersion = day.schedules.some((s) => s.schedule_type === "VERSION" && s.is_start_date)
                  const hasPickup = day.schedules.some((s) => s.schedule_type === "PICKUP" && s.is_start_date)
                  const hasContents = day.schedules.some((s) => s.schedule_type === "CONTENTS" && s.is_start_date)
                  return (
                    <>
                      {hasVersion && <ScheduleBanner type="VERSION" />}
                      {hasPickup && <ScheduleBanner type="PICKUP" />}
                      {hasContents && <ScheduleBanner type="CONTENTS" />}
                    </>
                  )
                })()}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
