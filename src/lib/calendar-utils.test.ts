import { describe, expect, it } from "vitest"
import {
  buildCalendarGrid,
  enumerateDates,
  getAdjustedBillingDate,
  getDdayLabel,
  getGridRange,
  getPeriodProgress,
  groupDatesByWeek,
  parseLocalDate,
} from "./calendar-utils"

describe("getDdayLabel", () => {
  it("labels D-Day, upcoming D-n and expired D+n, including across month and year boundaries", () => {
    expect(getDdayLabel("2026-11-09", "2026-11-09")).toBe("D-Day")
    expect(getDdayLabel("2026-11-09", "2026-11-12")).toBe("D-3")
    expect(getDdayLabel("2026-11-09", "2026-11-08")).toBe("D+1")
    expect(getDdayLabel("2026-12-30", "2027-01-02")).toBe("D-3")
  })
})

describe("getPeriodProgress", () => {
  it("returns 0 before start, 100 at or after end, and a rounded ratio in between", () => {
    expect(getPeriodProgress("2026-11-01", "2026-11-10", "2026-11-20")).toBe(0)
    expect(getPeriodProgress("2026-11-10", "2026-11-10", "2026-11-20")).toBe(0)
    expect(getPeriodProgress("2026-11-15", "2026-11-10", "2026-11-20")).toBe(50)
    expect(getPeriodProgress("2026-11-20", "2026-11-10", "2026-11-20")).toBe(100)
    expect(getPeriodProgress("2026-12-01", "2026-11-10", "2026-11-20")).toBe(100)
  })

  it("treats a single-day period as complete on and after the day", () => {
    expect(getPeriodProgress("2026-11-10", "2026-11-10", "2026-11-10")).toBe(100)
    expect(getPeriodProgress("2026-11-09", "2026-11-10", "2026-11-10")).toBe(0)
  })
})

describe("groupDatesByWeek", () => {
  it("groups the viewed month into Sunday-start weeks and flags the week containing today", () => {
    const weeks = groupDatesByWeek(2026, 11, "2026-11-09")
    expect(weeks[0]).toMatchObject({ weekStart: "2026-11-01", weekEnd: "2026-11-07", isCurrentWeek: false })
    expect(weeks[1]).toMatchObject({ weekStart: "2026-11-08", weekEnd: "2026-11-14", isCurrentWeek: true })
    expect(weeks.filter((week) => week.isCurrentWeek)).toHaveLength(1)
    expect(weeks[weeks.length - 1].weekEnd).toBe("2026-12-05")
  })

  it("drops grid weeks that contain no day of the viewed month", () => {
    const weeks = groupDatesByWeek(2026, 2, "2026-02-10")
    expect(weeks).toHaveLength(4)
    expect(weeks.every((week) => week.dates.length === 7)).toBe(true)
  })

  it("has no current week when today is outside the viewed weeks", () => {
    expect(groupDatesByWeek(2026, 11, "2027-01-01").some((week) => week.isCurrentWeek)).toBe(false)
  })
})

describe("getAdjustedBillingDate", () => {
  it("clamps 31st to February in common years", () => {
    expect(getAdjustedBillingDate(2026, 2, 31)).toBe("2026-02-28")
  })

  it("clamps 31st to February in leap years", () => {
    expect(getAdjustedBillingDate(2028, 2, 31)).toBe("2028-02-29")
  })

  it("clamps 31st to April 30", () => {
    expect(getAdjustedBillingDate(2026, 4, 31)).toBe("2026-04-30")
  })
})

describe("buildCalendarGrid", () => {
  it("returns a fixed six-week grid", () => {
    const grid = buildCalendarGrid(2026, 10)
    expect(grid).toHaveLength(42)
    expect(grid[0]?.date).toBe("2026-09-27")
    expect(grid[41]?.date).toBe("2026-11-07")
  })
})

describe("grid range and local date helpers", () => {
  it("covers all 42 visible grid days with an exclusive end", () => {
    expect(getGridRange(2026, 3)).toEqual({ startDate: "2026-03-01", endDateExclusive: "2026-04-12" })
    expect(getGridRange(2026, 5)).toEqual({ startDate: "2026-04-26", endDateExclusive: "2026-06-07" })
  })

  it("enumerates date-only strings without timezone shift", () => {
    expect(enumerateDates("2026-03-30", "2026-04-02")).toEqual(["2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02"])
    expect(parseLocalDate("2026-03-01").getDate()).toBe(1)
  })
})
