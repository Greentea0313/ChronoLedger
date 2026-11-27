import { describe, expect, it } from "vitest"
import {
  buildCumulativeDailySpend,
  buildMonthlyCategoryComparison,
  getDaysInMonth,
  getPreviousMonthKey,
  type ReportExpense,
} from "./monthly-report"

const exp = (target_date: string, final_amount: number, category = "게임", status = "CONFIRMED"): ReportExpense => ({
  status,
  category,
  final_amount,
  target_date,
})

describe("month helpers", () => {
  it("handles year boundary and leap years", () => {
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12")
    expect(getPreviousMonthKey("2026-11")).toBe("2026-10")
    expect(getDaysInMonth("2024-02")).toBe(29)
    expect(getDaysInMonth("2026-02")).toBe(28)
    expect(getDaysInMonth("2026-04")).toBe(30)
    expect(getDaysInMonth("2026-12")).toBe(31)
  })
})

describe("buildMonthlyCategoryComparison", () => {
  it("counts only CONFIRMED rows of the two months and respects month boundaries", () => {
    const result = buildMonthlyCategoryComparison(
      [
        exp("2026-10-31", 1000),
        exp("2026-11-01", 2000),
        exp("2026-11-30", 500),
        exp("2026-12-01", 9999),
        exp("2026-09-30", 9999),
        exp("2026-11-10", 7777, "게임", "PLANNED"),
        exp("2026-11-10", 7777, "게임", "CANCELLED"),
      ],
      "2026-11",
    )
    expect(result.previousMonth).toBe("2026-10")
    expect(result.rows).toEqual([{ category: "게임", current: 2500, previous: 1000 }])
  })

  it("sorts by current amount desc then fixed category order and drops zero rows", () => {
    const result = buildMonthlyCategoryComparison(
      [
        exp("2026-11-02", 100, "기타"),
        exp("2026-11-02", 100, "식비"),
        exp("2026-11-02", 300, "교통"),
        exp("2026-10-02", 50, "생활"),
        exp("2026-11-03", 0, "정기 구독"),
      ],
      "2026-11",
    )
    expect(result.rows.map((r) => r.category)).toEqual(["교통", "식비", "기타", "생활"])
    expect(result.rows[3]).toEqual({ category: "생활", current: 0, previous: 50 })
  })

  it("returns empty rows when nothing is confirmed", () => {
    expect(buildMonthlyCategoryComparison([exp("2026-11-02", 100, "게임", "PLANNED")], "2026-11").rows).toEqual([])
  })
})

describe("buildCumulativeDailySpend", () => {
  it("accumulates per day, keeping the value on days without spending", () => {
    const { days } = buildCumulativeDailySpend(
      [exp("2026-11-02", 100), exp("2026-11-04", 50), exp("2026-10-03", 30), exp("2026-11-03", 999, "게임", "PLANNED")],
      "2026-11",
      "2026-12-15",
    )
    expect(days).toHaveLength(31)
    expect(days[0]).toEqual({ day: 1, current: 0, previous: 0 })
    expect(days[1].current).toBe(100)
    expect(days[2].current).toBe(100)
    expect(days[3].current).toBe(150)
    expect(days[2].previous).toBe(30)
    expect(days[29].current).toBe(150)
  })

  it("nulls current after today and previous beyond the previous month length", () => {
    const { days } = buildCumulativeDailySpend([exp("2026-03-05", 10), exp("2026-02-27", 20)], "2026-03", "2026-03-06")
    expect(days).toHaveLength(31)
    expect(days[5].current).toBe(10)
    expect(days[6].current).toBeNull()
    expect(days[27].previous).toBe(20)
    expect(days[28].previous).toBeNull()
    expect(days[28].day).toBe(29)
    expect(days[26].previous).toBe(20)
    expect(days[25].previous).toBe(0)
  })

  it("uses the shorter leap February as previous month and a 31 day max", () => {
    const { days } = buildCumulativeDailySpend([exp("2024-02-29", 40)], "2024-03", "2024-04-01")
    expect(days).toHaveLength(31)
    expect(days[28].previous).toBe(40)
    expect(days[29].previous).toBeNull()
  })

  it("does not null the current month when it is a past month", () => {
    const { days } = buildCumulativeDailySpend([], "2026-02", "2026-11-27")
    expect(days).toHaveLength(31)
    expect(days[27].current).toBe(0)
    expect(days[28].current).toBeNull()
  })
})
