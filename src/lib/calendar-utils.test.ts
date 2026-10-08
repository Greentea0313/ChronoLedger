import { describe, expect, it } from "vitest"
import { buildCalendarGrid, enumerateDates, getAdjustedBillingDate, getGridRange, parseLocalDate } from "./calendar-utils"

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
