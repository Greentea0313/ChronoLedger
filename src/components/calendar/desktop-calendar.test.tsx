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
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-06",
            day: 6,
            inCurrentMonth: true,
            schedules: [{ id: "s1", schedule_type: "PICKUP", is_start_date: true, game_id: "g1" }],
            icons: [{ gameId: "g1", label: "게임 A", iconUrl: "/icon.png" }],
            hasMemo: true,
          },
        ]}
      />,
    )

    expect(screen.getByText("PICKUP")).toBeTruthy()
    expect(screen.getByLabelText("게임 A")).toBeTruthy()
    expect(screen.queryByText(/원/)).toBeNull()
  })

  it("renders multiple banners strictly in order [VERSION], [PICKUP], [CONTENTS]", () => {
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-15"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-15",
            day: 15,
            inCurrentMonth: true,
            schedules: [
              { id: "s3", schedule_type: "CONTENTS", is_start_date: true, game_id: "g1" },
              { id: "s2", schedule_type: "PICKUP", is_start_date: true, game_id: "g1" },
              { id: "s1", schedule_type: "VERSION", is_start_date: true, game_id: "g1" },
            ],
            icons: [],
            hasMemo: false,
          },
        ]}
      />,
    )

    const banners = screen.getAllByText(/VERSION|PICKUP|CONTENTS/).map((el) => el.textContent)
    expect(banners).toEqual(["VERSION", "PICKUP", "CONTENTS"])
  })

  it("gameFilter prop이 전달되었을 때 상단 헤더에 정상적으로 렌더링된다", () => {
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-15"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[]}
        gameFilter={<div data-testid="custom-filter">게임 필터 버튼</div>}
      />,
    )

    expect(screen.getByTestId("custom-filter")).toBeTruthy()
    expect(screen.getByText("게임 필터 버튼")).toBeTruthy()
  })
})
