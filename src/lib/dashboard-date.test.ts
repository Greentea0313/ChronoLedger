import { describe, expect, it } from "vitest"
import { getKstMonthDateRange } from "./dashboard-date"

describe("getKstMonthDateRange", () => {
  it("uses the KST month when UTC is still in the previous month", () => {
    expect(getKstMonthDateRange(new Date("2026-10-31T14:59:59.000Z"))).toEqual({
      startDate: "2026-10-01",
      endDateExclusive: "2026-11-01",
    })
  })

  it("moves to the next KST month at midnight", () => {
    expect(getKstMonthDateRange(new Date("2026-10-31T15:00:00.000Z"))).toEqual({
      startDate: "2026-11-01",
      endDateExclusive: "2026-12-01",
    })
  })

  it("handles the December to January year boundary", () => {
    expect(getKstMonthDateRange(new Date("2026-12-31T15:00:00.000Z"))).toEqual({
      startDate: "2027-01-01",
      endDateExclusive: "2027-02-01",
    })
  })
})
