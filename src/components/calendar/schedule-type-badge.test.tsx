import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ScheduleTypeBadge } from "./schedule-type-badge"

describe("ScheduleTypeBadge", () => {
  it.each([
    ["VERSION", "버전"],
    ["PICKUP", "픽업"],
    ["CONTENTS", "콘텐츠"],
    ["BROADCAST", "특별방송"],
  ] as const)("renders the %s label", (type, label) => {
    render(<ScheduleTypeBadge type={type} />)
    expect(screen.getByTestId("schedule-type-badge").textContent).toBe(label)
    expect(screen.queryByTestId("rerun-chip")).toBeNull()
  })

  it("nests the rerun chip inside the badge as [픽업 [복각]]", () => {
    render(<ScheduleTypeBadge type="PICKUP" isRerun />)
    const badge = screen.getByTestId("schedule-type-badge")
    expect(badge.textContent).toBe("픽업복각")
    expect(badge.contains(screen.getByTestId("rerun-chip"))).toBe(true)
  })

  it("keeps the outer badge classes identical with and without the rerun chip (same height)", () => {
    const { rerender } = render(<ScheduleTypeBadge type="PICKUP" />)
    const plain = screen.getByTestId("schedule-type-badge").className
    rerender(<ScheduleTypeBadge type="PICKUP" isRerun />)
    expect(screen.getByTestId("schedule-type-badge").className).toBe(plain)
    expect(plain).toContain("inline-flex")
    expect(plain).toContain("items-center")
    expect(plain).toContain("leading-none")
  })

  it("gives the rerun chip no vertical padding and leading-none", () => {
    render(<ScheduleTypeBadge type="PICKUP" isRerun />)
    const chip = screen.getByTestId("rerun-chip")
    expect(chip.className).toContain("py-0")
    expect(chip.className).toContain("leading-none")
  })

  it("supports sm and md sizes", () => {
    const { rerender } = render(<ScheduleTypeBadge type="VERSION" size="sm" />)
    expect(screen.getByTestId("schedule-type-badge").className).toContain("text-[10px]")
    rerender(<ScheduleTypeBadge type="VERSION" size="md" />)
    expect(screen.getByTestId("schedule-type-badge").className).toContain("text-xs")
  })
})
