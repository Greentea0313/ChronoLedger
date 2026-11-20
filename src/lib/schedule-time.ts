import { getDdayLabel } from "@/lib/calendar-utils"

/**
 * R85 schedule time helpers. Dates stay the source of truth (calendar cells, budget attribution);
 * `start_at`/`end_at` are optional KST times used only for display and for deciding whether a schedule has ended.
 * Every time is stored as TIMESTAMPTZ and shown in Asia/Seoul (UTC+9, no daylight saving).
 */

export interface ScheduleTimeFields {
  start_date: string
  end_date: string
  start_at?: string | null
  end_at?: string | null
  start_at_estimated?: boolean | null
  end_at_estimated?: boolean | null
}

export type ScheduleStatus = "upcoming" | "ongoing" | "ended"

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/

/** KST date (`YYYY-MM-DD`) and time (`HH:mm`) of an instant. */
export function getKstParts(value: string | Date): { date: string; time: string } {
  const shifted = new Date((value instanceof Date ? value : new Date(value)).getTime() + KST_OFFSET_MS).toISOString()
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) }
}

/** `HH:mm` (KST) of a stored timestamp, or "" when there is none. */
export function getKstTime(value: string | null | undefined): string {
  return value ? getKstParts(value).time : ""
}

/** Normalizes `HH:mm` / `HH:mm:ss` input to `HH:mm`; null when it is not a valid minute-precision time. */
export function normalizeTimeInput(value: string | null | undefined): string | null {
  const match = TIME_PATTERN.exec((value ?? "").trim())
  return match ? `${match[1]}:${match[2]}` : null
}

/** Combines a KST date and `HH:mm` into the ISO timestamp stored in `start_at`/`end_at`; null when the time is empty or invalid. */
export function composeScheduleAt(date: string, time: string | null | undefined): string | null {
  const normalized = normalizeTimeInput(time)
  if (!date || !normalized) return null
  const instant = new Date(`${date}T${normalized}:00+09:00`)
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString()
}

/** End time to fill for `[초기화 시각으로 종료]`: reset time minus one minute (`00:00` rolls back to the previous day's `23:59`). */
export function getResetEndMoment(endDate: string, resetTime: string): { date: string; time: string } | null {
  const normalized = normalizeTimeInput(resetTime)
  if (!endDate || !normalized) return null
  const base = new Date(`${endDate}T${normalized}:00+09:00`)
  if (Number.isNaN(base.getTime())) return null
  return getKstParts(new Date(base.getTime() - MINUTE_MS))
}

function shortDate(date: string): string {
  return date.slice(5).replace("-", ".")
}

export interface FormatPeriodOptions {
  /** `short` = `MM.DD`, `full` = `YYYY-MM-DD` (a date-only single day reads `YYYY-MM-DD (단일)`). */
  style?: "short" | "full"
}

/**
 * Period text of a schedule. Without times it matches the legacy output; with times each side gets `HH:mm`,
 * `(예상)` marks estimated times, and a same-day period shows the date once (`11.20 20:00 ~ 22:00`).
 */
export function formatSchedulePeriod(schedule: ScheduleTimeFields, options: FormatPeriodOptions = {}): string {
  const style = options.style ?? "short"
  const fmt = (date: string) => (style === "short" ? shortDate(date) : date)
  const startTime = getKstTime(schedule.start_at)
  const endTime = getKstTime(schedule.end_at)
  const startMark = startTime && schedule.start_at_estimated ? "(예상)" : ""
  const endMark = endTime && schedule.end_at_estimated ? "(예상)" : ""

  if (!startTime && !endTime) {
    if (style === "full" && schedule.start_date === schedule.end_date) return `${schedule.start_date} (단일)`
    return `${fmt(schedule.start_date)} ~ ${fmt(schedule.end_date)}`
  }
  const start = `${fmt(schedule.start_date)}${startTime ? ` ${startTime}${startMark}` : ""}`
  if (startTime && endTime && schedule.start_date === schedule.end_date) return `${start} ~ ${endTime}${endMark}`
  return `${start} ~ ${fmt(schedule.end_date)}${endTime ? ` ${endTime}${endMark}` : ""}`
}

export interface ScheduleClock {
  /** Current instant; defaults to now. */
  now?: Date
  /** KST today (`YYYY-MM-DD`); defaults to the KST date of `now`. */
  today?: string
}

function resolveClock(clock: ScheduleClock): { now: Date; today: string } {
  const now = clock.now ?? new Date()
  return { now, today: clock.today ?? getKstParts(now).date }
}

/** Whether the schedule has ended: `end_at` when set, otherwise the end date is before today. */
export function hasScheduleEnded(schedule: ScheduleTimeFields, clock: ScheduleClock = {}): boolean {
  const { now, today } = resolveClock(clock)
  return schedule.end_at ? now.getTime() >= new Date(schedule.end_at).getTime() : schedule.end_date < today
}

/** `ended` > `upcoming` > `ongoing`, using `end_at`/`start_at` when set and the dates otherwise. */
export function getScheduleStatus(schedule: ScheduleTimeFields, clock: ScheduleClock = {}): ScheduleStatus {
  const { now, today } = resolveClock(clock)
  if (hasScheduleEnded(schedule, { now, today })) return "ended"
  const notStarted = schedule.start_at ? now.getTime() < new Date(schedule.start_at).getTime() : schedule.start_date > today
  return notStarted ? "upcoming" : "ongoing"
}

/**
 * End-side badge text. D-n stays date based; on the end day a schedule with `end_at` reads `오늘 HH:mm 종료`
 * (or `종료` once that time has passed).
 */
export function getScheduleEndLabel(schedule: ScheduleTimeFields, clock: ScheduleClock = {}): string {
  const { now, today } = resolveClock(clock)
  if (schedule.end_at && schedule.end_date === today) {
    return now.getTime() >= new Date(schedule.end_at).getTime() ? "종료" : `오늘 ${getKstTime(schedule.end_at)} 종료`
  }
  return getDdayLabel(today, schedule.end_date)
}

const SCHEDULE_TIME_COLUMNS = ["start_at", "end_at", "start_at_estimated", "end_at_estimated"] as const

/** Postgres undefined_column / PostgREST schema-cache miss that names an R85 column: the migration is not applied yet. */
export function isMissingScheduleTimeColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code !== "42703" && error.code !== "PGRST204") return false
  const message = error.message ?? ""
  return [...SCHEDULE_TIME_COLUMNS, "daily_reset_time"].some((column) => message.includes(column))
}

/** Copy of a write payload without the R85 time columns (fallback for a database that has not been migrated). */
export function stripScheduleTimeFields<T extends object>(payload: T): Omit<T, (typeof SCHEDULE_TIME_COLUMNS)[number]> {
  const next = { ...payload } as Record<string, unknown>
  SCHEDULE_TIME_COLUMNS.forEach((column) => {
    delete next[column]
  })
  return next as Omit<T, (typeof SCHEDULE_TIME_COLUMNS)[number]>
}

/** Shown when a schedule was saved without its times because the R85 migration is not applied yet. */
export const SCHEDULE_TIME_PENDING_MESSAGE = "DB 업데이트(R85) 적용 전이라 시각 없이 저장함. 업데이트 후 시각을 저장할 수 있음."
