/* eslint-disable @next/next/no-img-element */
import { ScheduleBanner } from "@/components/calendar/schedule-banner"
import { GameIcon } from "@/components/ui/game-icon"
import {
  clampBgOpacity,
  getBlurFilterCss,
  type CalendarBgBlurLevel,
} from "@/lib/calendar-bg-storage"

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

export interface CalendarBgConfig {
  imageUrl: string | null
  opacity: number
  blur: CalendarBgBlurLevel
}

interface DesktopCalendarProps {
  year: number
  month: number
  days: DesktopCalendarDay[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  gameFilter?: React.ReactNode
  bgCustomizer?: React.ReactNode
  backgroundConfig?: CalendarBgConfig | null
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
  gameFilter,
  bgCustomizer,
  backgroundConfig,
}: DesktopCalendarProps) {
  const hasCustomBg = Boolean(backgroundConfig?.imageUrl)
  const bgOpacity = clampBgOpacity(backgroundConfig?.opacity ?? 25) / 100
  const bgBlurFilter = getBlurFilterCss(backgroundConfig?.blur ?? "OFF")

  return (
    <section
      className="relative overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-card md:p-4"
      aria-label="월간 캘린더"
    >
      {hasCustomBg && backgroundConfig?.imageUrl && (
        <div
          data-testid="calendar-custom-bg-layer"
          className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={backgroundConfig.imageUrl}
            alt=""
            data-testid="calendar-custom-bg-image"
            className="h-full w-full object-cover transition-all duration-300"
            style={{
              objectFit: "cover",
              opacity: bgOpacity,
              filter: bgBlurFilter,
              transform: backgroundConfig.blur !== "OFF" ? "scale(1.04)" : "scale(1)",
            }}
          />
          {/* 텍스트 및 배지 가독성 보호용 반투명 오버레이 */}
          <div
            data-testid="calendar-custom-bg-overlay"
            className="absolute inset-0 bg-surface/40"
          />
        </div>
      )}

      <div className="relative z-10">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[22px] font-bold text-content">{`${year}년 ${month}월`}</h2>
          <div className="flex items-center gap-1.5">
            {bgCustomizer}
            {gameFilter}
            <button
              type="button"
              onClick={onPrevMonth}
              className="h-8 w-8 p-0 rounded-[10px] flex items-center justify-center transition-all duration-fast active:scale-95 hover:opacity-80"
              aria-label="이전 달"
            >
              <img src="/assets/nav/v1-prev-dark.svg" alt="" className="nav-asset-dark h-8 w-8" />
              <img src="/assets/nav/v1-prev-light.svg" alt="" className="nav-asset-light h-8 w-8" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="h-8 w-8 p-0 rounded-[10px] flex items-center justify-center transition-all duration-fast active:scale-95 hover:opacity-80"
              aria-label="다음 달"
            >
              <img src="/assets/nav/v1-next-dark.svg" alt="" className="nav-asset-dark h-8 w-8" />
              <img src="/assets/nav/v1-next-light.svg" alt="" className="nav-asset-light h-8 w-8" />
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
                className={`relative flex flex-col justify-between h-[54px] md:h-[100px] overflow-hidden rounded-md border p-1 md:p-1.5 text-left transition-colors duration-fast ${
                  isSelected
                    ? "border-primary bg-primary/20"
                    : hasCustomBg
                    ? "border-line/80 bg-app/75 hover:bg-app/85 hover:border-line-control"
                    : "border-line bg-app hover:border-line-control"
                } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
              >
              {/* Top row: Day number on left, Game icons and Memo on right (Desktop) / Dots on Mobile */}
              <div className="flex items-start justify-between w-full">
                <span className="text-xs md:text-sm font-semibold leading-none">{day.day}</span>
                {/* Desktop: Game icons & memo dot */}
                <div className="hidden md:flex flex-col gap-0.5 items-end">
                  {day.icons.slice(0, 3).map((icon) => (
                    <span
                      key={`${day.date}-${icon.gameId}`}
                      title={icon.label}
                      aria-label={icon.label}
                      className="h-4 w-4 md:h-5 md:w-5 inline-block overflow-hidden rounded-[3px] md:rounded-[4px] bg-primary/20 text-center flex items-center justify-center"
                    >
                      {icon.iconUrl ? (
                        <GameIcon
                          src={icon.iconUrl}
                          alt={icon.label}
                          fallbackIcon={<span className="text-[10px] md:text-xs">🎮</span>}
                          priority
                        />
                      ) : (
                        <span className="text-[10px] md:text-xs">🎮</span>
                      )}
                    </span>
                  ))}
                  {day.hasMemo && <span className="h-2 w-2 rounded-full bg-content-muted mr-0.5 mt-0.5" />}
                </div>

                {/* Mobile only: Small dots for game schedules and memo in top right */}
                <div className="flex md:hidden items-center gap-1">
                  {day.schedules.some((s) => s.is_start_date) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" title="게임 일정 있음" />
                  )}
                  {day.hasMemo && (
                    <span className="h-1.5 w-1.5 rounded-full bg-content-muted" title="메모 있음" />
                  )}
                </div>
              </div>

              {/* Desktop Bottom-left: VERSION, PICKUP, CONTENTS tags (Hidden on mobile) */}
              <div className="hidden md:flex flex-col gap-0.5 items-start absolute bottom-1.5 left-1.5 z-10">
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
      </div>
    </section>
  )
}
