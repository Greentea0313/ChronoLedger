/* eslint-disable @next/next/no-img-element */
import { ScheduleBanner } from "@/components/calendar/schedule-banner"
import { GameIcon } from "@/components/ui/game-icon"
import { getTodayLocalDate } from "@/lib/calendar-utils"
import {
  clampBgOpacity,
  clampTileOpacity,
  DEFAULT_CALENDAR_BG_SETTINGS,
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
  isToday?: boolean
  schedules: CalendarScheduleItem[]
  icons: CalendarGameIcon[]
  hasMemo: boolean
}

export interface CalendarBgConfig {
  imageUrl: string | null
  opacity: number
  tileOpacity?: number
  blur: CalendarBgBlurLevel
}

interface DesktopCalendarProps {
  year: number
  month: number
  days: DesktopCalendarDay[]
  selectedDate: string
  todayDate?: string
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
  todayDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  gameFilter,
  bgCustomizer,
  backgroundConfig,
}: DesktopCalendarProps) {
  const hasCustomBg = Boolean(backgroundConfig?.imageUrl)
  const bgOpacity = clampBgOpacity(backgroundConfig?.opacity ?? DEFAULT_CALENDAR_BG_SETTINGS.opacity) / 100
  const tileOpacityRatio = clampTileOpacity(backgroundConfig?.tileOpacity) / 100
  const bgBlurFilter = getBlurFilterCss(backgroundConfig?.blur ?? "OFF")
  const currentTodayDate = todayDate ?? getTodayLocalDate()

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
          {/* 텍스트 및 배지 가독성 보호용 반투명 오버레이 (일러스트 감상을 위해 15%로 최적화) */}
          <div
            data-testid="calendar-custom-bg-overlay"
            className="absolute inset-0 bg-surface/15"
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
        <div
          className={`mb-2 grid grid-cols-7 gap-1 text-center text-xs ${
            hasCustomBg ? "text-content font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" : "text-content-muted"
          }`}
        >
          {WEEKDAY_LABELS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div key={`${year}-${month}`} className="grid grid-cols-7 gap-1 animate-month-change">
          {days.map((day) => {
            const isSelected = day.date === selectedDate
            const isToday = day.isToday ?? (day.date === currentTodayDate)
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day.date)}
                aria-label={day.date}
                aria-pressed={isSelected}
                style={
                  hasCustomBg && !isSelected
                    ? { backgroundColor: `rgb(var(--surface) / ${tileOpacityRatio})` }
                    : undefined
                }
                className={`relative flex flex-col justify-between h-[54px] md:h-[100px] overflow-hidden rounded-md border p-1 md:p-1.5 text-left transition-colors duration-fast ${
                  isSelected
                    ? "border-primary bg-primary/25 shadow-sm"
                    : hasCustomBg
                    ? `border-line/40 hover:border-line hover:ring-1 hover:ring-primary/30 ${
                        tileOpacityRatio > 0 ? "backdrop-blur-[1px]" : ""
                      }`
                    : "border-line bg-app hover:border-line-control"
                } ${day.inCurrentMonth ? "text-content" : "text-content-muted opacity-60"}`}
              >
              {/* Top row: Day number and Today badge on left, Game icons and Memo on right (Desktop) / Dots on Mobile */}
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-xs md:text-sm leading-none ${
                      hasCustomBg
                        ? "font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                        : "font-semibold"
                    }`}
                  >
                    {day.day}
                  </span>
                  {isToday && (
                    <span
                      data-testid={`today-badge-${day.date}`}
                      className={`inline-flex items-center justify-center rounded px-1 py-[1px] text-[8px] md:text-[9px] font-bold leading-tight shrink-0 ${
                        hasCustomBg ? "drop-shadow-sm" : ""
                      }`}
                      style={{
                        backgroundColor: "#EFBF04",
                        color: "#0F1115",
                      }}
                      title="오늘"
                    >
                      오늘
                    </span>
                  )}
                </div>
                {/* Desktop: Game icons & memo dot */}
                <div className="hidden md:flex flex-col gap-0.5 items-end">
                  {day.icons.slice(0, 3).map((icon) => (
                    <span
                      key={`${day.date}-${icon.gameId}`}
                      title={icon.label}
                      aria-label={icon.label}
                      className={`h-4 w-4 md:h-5 md:w-5 inline-block overflow-hidden rounded-[3px] md:rounded-[4px] text-center flex items-center justify-center ${
                        hasCustomBg
                          ? "bg-surface/75 shadow-sm border border-line/60"
                          : "bg-primary/20"
                      }`}
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
                  {day.hasMemo && (
                    <span
                      data-testid="memo-dot"
                      className={`h-2 w-2 rounded-full bg-content-muted mr-0.5 mt-0.5 ${
                        hasCustomBg ? "ring-1 ring-background/60 shadow-sm" : ""
                      }`}
                    />
                  )}
                </div>

                {/* Mobile only: Small dots for game schedules and memo in top right */}
                <div className="flex md:hidden items-center gap-1">
                  {day.schedules.some((s) => s.is_start_date) && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full bg-primary ${
                        hasCustomBg ? "ring-1 ring-background/60 shadow-sm" : ""
                      }`}
                      title="게임 일정 있음"
                    />
                  )}
                  {day.hasMemo && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full bg-content-muted ${
                        hasCustomBg ? "ring-1 ring-background/60 shadow-sm" : ""
                      }`}
                      title="메모 있음"
                    />
                  )}
                </div>
              </div>

              {/* Desktop Bottom-left: VERSION, PICKUP, CONTENTS tags (Hidden on mobile) */}
              <div
                className={`hidden md:flex flex-col gap-0.5 items-start absolute bottom-1.5 left-1.5 z-10 ${
                  hasCustomBg ? "drop-shadow-sm" : ""
                }`}
              >
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
