import { describe, expect, it } from "vitest"
import {
  composeScheduleAt,
  formatSchedulePeriod,
  getKstParts,
  getKstTime,
  getResetEndMoment,
  getScheduleEndLabel,
  getScheduleStatus,
  hasScheduleEnded,
  isMissingScheduleTimeColumnError,
  normalizeTimeInput,
  stripScheduleTimeFields,
  type ScheduleTimeFields,
} from "./schedule-time"

const at = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString()
const base = (overrides: Partial<ScheduleTimeFields> = {}): ScheduleTimeFields => ({ start_date: "2026-11-13", end_date: "2026-11-27", ...overrides })

describe("KST helpers", () => {
  it("splits an instant into KST date and time across the UTC date boundary", () => {
    expect(getKstParts("2026-11-26T20:30:00Z")).toEqual({ date: "2026-11-27", time: "05:30" })
    expect(getKstParts(new Date("2026-11-27T14:59:00Z"))).toEqual({ date: "2026-11-27", time: "23:59" })
    expect(getKstTime(null)).toBe("")
    expect(getKstTime(at("2026-11-27", "04:59"))).toBe("04:59")
  })

  it("normalizes HH:mm and HH:mm:ss and rejects invalid times", () => {
    expect(normalizeTimeInput("04:59")).toBe("04:59")
    expect(normalizeTimeInput("04:59:00")).toBe("04:59")
    expect(normalizeTimeInput("24:00")).toBeNull()
    expect(normalizeTimeInput("4:59")).toBeNull()
    expect(normalizeTimeInput("")).toBeNull()
    expect(normalizeTimeInput(null)).toBeNull()
  })

  it("composes a KST date and time into the stored ISO timestamp", () => {
    expect(composeScheduleAt("2026-11-27", "04:59")).toBe("2026-11-26T19:59:00.000Z")
    expect(composeScheduleAt("2026-11-27", "")).toBeNull()
    expect(composeScheduleAt("", "04:59")).toBeNull()
    expect(composeScheduleAt("2026-11-27", "99:99")).toBeNull()
  })
})

describe("getResetEndMoment", () => {
  it("returns the reset time minus one minute on the same date", () => {
    expect(getResetEndMoment("2026-11-27", "05:00")).toEqual({ date: "2026-11-27", time: "04:59" })
    expect(getResetEndMoment("2026-11-27", "04:00:00")).toEqual({ date: "2026-11-27", time: "03:59" })
  })

  it("rolls a 00:00 reset back to 23:59 of the previous day", () => {
    expect(getResetEndMoment("2026-11-27", "00:00")).toEqual({ date: "2026-11-26", time: "23:59" })
    expect(getResetEndMoment("2026-12-01", "00:00")).toEqual({ date: "2026-11-30", time: "23:59" })
  })

  it("returns null for an invalid reset time or empty date", () => {
    expect(getResetEndMoment("2026-11-27", "")).toBeNull()
    expect(getResetEndMoment("", "05:00")).toBeNull()
  })
})

describe("formatSchedulePeriod", () => {
  it("keeps the legacy text when there are no times", () => {
    expect(formatSchedulePeriod(base())).toBe("11.13 ~ 11.27")
    expect(formatSchedulePeriod(base(), { style: "full" })).toBe("2026-11-13 ~ 2026-11-27")
    expect(formatSchedulePeriod(base({ end_date: "2026-11-13" }), { style: "full" })).toBe("2026-11-13 (단일)")
    expect(formatSchedulePeriod(base({ end_date: "2026-11-13" }))).toBe("11.13 ~ 11.13")
  })

  it("shows both times", () => {
    expect(formatSchedulePeriod(base({ start_at: at("2026-11-13", "11:00"), end_at: at("2026-11-27", "04:59") }))).toBe("11.13 11:00 ~ 11.27 04:59")
    expect(formatSchedulePeriod(base({ start_at: at("2026-11-13", "11:00"), end_at: at("2026-11-27", "04:59") }), { style: "full" })).toBe(
      "2026-11-13 11:00 ~ 2026-11-27 04:59",
    )
  })

  it("shows only the end time when the start time is missing", () => {
    expect(formatSchedulePeriod(base({ end_at: at("2026-11-27", "04:59") }))).toBe("11.13 ~ 11.27 04:59")
  })

  it("marks estimated times", () => {
    expect(
      formatSchedulePeriod(base({ start_at: at("2026-11-13", "11:00"), start_at_estimated: true, end_at: at("2026-11-27", "04:59") })),
    ).toBe("11.13 11:00(예상) ~ 11.27 04:59")
    expect(formatSchedulePeriod(base({ end_at: at("2026-11-27", "04:59"), end_at_estimated: true }))).toBe("11.13 ~ 11.27 04:59(예상)")
  })

  it("shows the date once for a same-day period with both times", () => {
    expect(formatSchedulePeriod({ start_date: "2026-11-20", end_date: "2026-11-20", start_at: at("2026-11-20", "20:00"), end_at: at("2026-11-20", "22:00") })).toBe(
      "11.20 20:00 ~ 22:00",
    )
  })

  it("does not mark an estimate flag that has no time", () => {
    expect(formatSchedulePeriod(base({ start_at_estimated: true }))).toBe("11.13 ~ 11.27")
  })
})

describe("getScheduleStatus / hasScheduleEnded", () => {
  const now = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`)

  it("uses dates when there are no times", () => {
    const schedule = base({ start_date: "2026-11-13", end_date: "2026-11-27" })
    expect(getScheduleStatus(schedule, { now: now("2026-11-12", "12:00") })).toBe("upcoming")
    expect(getScheduleStatus(schedule, { now: now("2026-11-13", "00:00") })).toBe("ongoing")
    expect(getScheduleStatus(schedule, { now: now("2026-11-27", "23:59") })).toBe("ongoing")
    expect(getScheduleStatus(schedule, { now: now("2026-11-28", "00:00") })).toBe("ended")
  })

  it("ends at end_at, not at the end of the end date", () => {
    const schedule = base({ end_at: at("2026-11-27", "04:59") })
    expect(getScheduleStatus(schedule, { now: now("2026-11-27", "04:58") })).toBe("ongoing")
    expect(getScheduleStatus(schedule, { now: now("2026-11-27", "04:59") })).toBe("ended")
    expect(hasScheduleEnded(schedule, { now: now("2026-11-27", "10:00") })).toBe(true)
  })

  it("starts at start_at, not at the start of the start date", () => {
    const schedule = base({ start_at: at("2026-11-13", "11:00") })
    expect(getScheduleStatus(schedule, { now: now("2026-11-13", "10:59") })).toBe("upcoming")
    expect(getScheduleStatus(schedule, { now: now("2026-11-13", "11:00") })).toBe("ongoing")
  })

  it("handles a same-day schedule with both times", () => {
    const schedule: ScheduleTimeFields = { start_date: "2026-11-20", end_date: "2026-11-20", start_at: at("2026-11-20", "20:00"), end_at: at("2026-11-20", "22:00") }
    expect(getScheduleStatus(schedule, { now: now("2026-11-20", "19:59") })).toBe("upcoming")
    expect(getScheduleStatus(schedule, { now: now("2026-11-20", "21:00") })).toBe("ongoing")
    expect(getScheduleStatus(schedule, { now: now("2026-11-20", "22:00") })).toBe("ended")
  })

  it("prefers an explicit today string over the clock date for date based checks", () => {
    const schedule = base()
    expect(getScheduleStatus(schedule, { now: now("2026-11-30", "12:00"), today: "2026-11-20" })).toBe("ongoing")
  })
})

describe("getScheduleEndLabel", () => {
  const now = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`)
  const schedule = base({ end_at: at("2026-11-27", "04:59") })

  it("shows the end time on the end day and 종료 once it passed", () => {
    expect(getScheduleEndLabel(schedule, { now: now("2026-11-27", "03:00") })).toBe("오늘 04:59 종료")
    expect(getScheduleEndLabel(schedule, { now: now("2026-11-27", "05:00") })).toBe("종료")
  })

  it("keeps date based D-n labels before and after the end day or without end_at", () => {
    expect(getScheduleEndLabel(schedule, { now: now("2026-11-25", "12:00") })).toBe("D-2")
    expect(getScheduleEndLabel(base(), { now: now("2026-11-27", "12:00") })).toBe("D-Day")
    expect(getScheduleEndLabel(base(), { now: now("2026-11-28", "12:00") })).toBe("D+1")
  })
})

describe("unapplied migration fallback helpers", () => {
  it("recognises missing R85 columns only", () => {
    expect(isMissingScheduleTimeColumnError({ code: "42703", message: 'column "start_at" of relation "game_schedules" does not exist' })).toBe(true)
    expect(isMissingScheduleTimeColumnError({ code: "PGRST204", message: "Could not find the 'end_at_estimated' column of 'schedule_requests' in the schema cache" })).toBe(true)
    expect(isMissingScheduleTimeColumnError({ code: "42703", message: 'column "daily_reset_time" does not exist' })).toBe(true)
    expect(isMissingScheduleTimeColumnError({ code: "42703", message: 'column "other" does not exist' })).toBe(false)
    expect(isMissingScheduleTimeColumnError({ code: "23514", message: "start_at violates" })).toBe(false)
    expect(isMissingScheduleTimeColumnError(null)).toBe(false)
  })

  it("strips the time columns from a write payload without mutating it", () => {
    const payload = { title: "a", start_date: "2026-11-13", start_at: "x", end_at: null, start_at_estimated: true, end_at_estimated: false }
    expect(stripScheduleTimeFields(payload)).toEqual({ title: "a", start_date: "2026-11-13" })
    expect(payload.start_at).toBe("x")
  })
})
