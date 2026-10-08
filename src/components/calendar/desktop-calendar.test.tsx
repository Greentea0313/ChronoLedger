import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DesktopCalendar } from "./desktop-calendar"

describe("DesktopCalendar", () => {
  it("renders banners/icons/memo-dot without currency text in tiles", () => {
    const onSelectDate = vi.fn()
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-06"
        onSelectDate={onSelectDate}
        days={[
          {
            date: "2026-10-06",
            day: 6,
            inCurrentMonth: true,
            schedules: [{ id: "s1", schedule_type: "PICKUP" }],
            icons: [{ gameId: "g1", label: "게임 A", icon: "🎮" }],
            hasMemo: true,
          },
        ]}
      />,
    )

    expect(screen.getByText("PICKUP")).toBeTruthy()
    expect(screen.getByLabelText("게임 A")).toBeTruthy()
    expect(screen.queryByText(/원/)).toBeNull()
  })
})
