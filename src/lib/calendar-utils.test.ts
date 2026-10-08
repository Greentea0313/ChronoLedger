import { describe, expect, it } from "vitest"
import { buildCalendarGrid, getAdjustedBillingDate } from "./calendar-utils"

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

