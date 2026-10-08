import { ScheduleBanner } from "@/components/calendar/schedule-banner"

export interface CalendarScheduleItem {
  id: string
  schedule_type: "VERSION" | "PICKUP"
}

export interface CalendarGameIcon {
  gameId: string
  label: string
  icon: string
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
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

export function DesktopCalendar({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
}: DesktopCalendarProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-card md:p-4" aria-label="월간 캘린더">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-content">{`${year}년 ${month}월`}</h2>
      </header>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-content-muted">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.date === selectedDate
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              aria-pressed={isSelected}
              className={`relative min-h-14 overflow-hidden rounded-md border p-1 text-left transition-colors duration-fast md:min-h-24 md:p-2 ${
                isSelected
                  ? "border-primary bg-primary/15"
                  : "border-line bg-app hover:border-line-control"
              } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
            >
              <div className="text-sm font-semibold">{day.day}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from(new Set(day.schedules.map((schedule) => schedule.schedule_type))).map((type) => (
                  <ScheduleBanner key={`${day.date}-${type}`} type={type} />
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {day.icons.slice(0, 3).map((icon) => (
                  <span key={`${day.date}-${icon.gameId}`} title={icon.label} aria-label={icon.label}>
                    {icon.icon}
                  </span>
                ))}
              </div>
              {day.hasMemo && <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-info" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
