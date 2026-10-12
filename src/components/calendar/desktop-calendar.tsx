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
              className={`relative min-h-14 overflow-hidden rounded-md border p-1 text-left transition-colors duration-fast md:min-h-24 md:p-2 ${
                isSelected
                  ? "border-primary bg-primary/15"
                  : "border-line bg-app hover:border-line-control"
              } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
            >
              <div className="text-sm font-semibold">{day.day}</div>
              
              {/* Bottom-left: VERSION, PICKUP, CONTENTS tags (start_date only) */}
              <div className="absolute bottom-1 left-1 flex flex-col gap-1 items-start">
                {(() => {
                  const hasVersion = day.schedules.some(s => s.schedule_type === 'VERSION' && s.is_start_date);
                  const hasPickup = day.schedules.some(s => s.schedule_type === 'PICKUP' && s.is_start_date);
                  const hasContents = day.schedules.some(s => s.schedule_type === 'CONTENTS' && s.is_start_date);
                  return (
                    <>
                      {hasVersion && <div className="z-10"><ScheduleBanner type="VERSION" /></div>}
                      {hasPickup && <div className="z-10"><ScheduleBanner type="PICKUP" /></div>}
                      {hasContents && <div className="z-10"><ScheduleBanner type="CONTENTS" /></div>}
                    </>
                  );
                })()}
              </div>

              {/* Right-side: Game icons and Memo */}
              <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                {day.icons.slice(0, 3).map((icon) => (
                  <span key={`${day.date}-${icon.gameId}`} title={icon.label} aria-label={icon.label} className="h-5 w-5 inline-block overflow-hidden rounded-[4px] bg-primary/20 text-center flex items-center justify-center">
                    {icon.iconUrl ? (
                      <img src={icon.iconUrl} alt={icon.label} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs">🎮</span>
                    )}
                  </span>
                ))}
                {day.hasMemo && <span className="h-2.5 w-2.5 rounded-full bg-content-muted mr-1 mt-0.5" />}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
