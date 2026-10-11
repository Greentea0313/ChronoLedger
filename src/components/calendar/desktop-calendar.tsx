import { ScheduleBanner } from "@/components/calendar/schedule-banner"

export interface CalendarScheduleItem {
  id: string
  schedule_type: "VERSION" | "PICKUP"
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
              aria-pressed={isSelected}
              className={`relative min-h-14 overflow-hidden rounded-md border p-1 text-left transition-colors duration-fast md:min-h-24 md:p-2 ${
                isSelected
                  ? "border-primary bg-primary/15"
                  : "border-line bg-app hover:border-line-control"
              } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
            >
              <div className="text-sm font-semibold">{day.day}</div>
              
              {/* Bottom-left: VERSION and PICKUP tags */}
              <div className="absolute bottom-1 left-1 flex flex-col gap-1 items-start">
                {(() => {
                  const versionSchedules = day.schedules.filter(s => s.schedule_type === 'VERSION' && s.is_start_date);
                  const hasVersion = versionSchedules.length > 0;
                  const versionGameId = hasVersion ? versionSchedules[0].game_id : null;
                  const versionGameIcon = versionGameId ? day.icons.find(i => i.gameId === versionGameId) : null;
                  const hasPickup = day.schedules.some(s => s.schedule_type === 'PICKUP');
                  return (
                    <>
                      {hasVersion && (
                        <div className="flex items-center gap-1 z-10">
                          <ScheduleBanner type="VERSION" />
                          {versionGameIcon && (
                            <span title={versionGameIcon.label} className="h-4 w-4 inline-block overflow-hidden rounded-[4px] bg-primary/20 flex items-center justify-center">
                              {versionGameIcon.iconUrl ? (
                                <img src={versionGameIcon.iconUrl} alt={versionGameIcon.label} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px]">🎮</span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      {hasPickup && <div className="z-10"><ScheduleBanner type="PICKUP" /></div>}
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
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" onClick={onPrevMonth} className="rounded border border-line bg-surface p-2 text-content hover:bg-surface-2">&lt;</button>
        <button type="button" onClick={onNextMonth} className="rounded border border-line bg-surface p-2 text-content hover:bg-surface-2">&gt;</button>
      </div>
    </section>
  )
}
