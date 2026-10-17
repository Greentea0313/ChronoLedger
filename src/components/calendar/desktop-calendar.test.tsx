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

    const versionElement = screen.getByText("VERSION")
    const bannerContainer = versionElement.parentElement
    expect(bannerContainer?.className).toContain("absolute")
    expect(bannerContainer?.className).toContain("bottom-1.5")
    expect(bannerContainer?.className).toContain("left-1.5")
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

  it("모바일에서 게임 일정 파란 점은 시작일(is_start_date)에만 렌더링되고 진행 중인 중간 날짜에는 렌더링되지 않는다", () => {
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-06"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-06",
            day: 6,
            inCurrentMonth: true,
            schedules: [{ id: "s1", schedule_type: "VERSION", is_start_date: true, game_id: "g1" }],
            icons: [],
            hasMemo: true,
          },
          {
            date: "2026-10-07",
            day: 7,
            inCurrentMonth: true,
            schedules: [{ id: "s1", schedule_type: "VERSION", is_start_date: false, game_id: "g1" }],
            icons: [],
            hasMemo: false,
          },
        ]}
      />,
    )

    const scheduleDots = screen.getAllByTitle("게임 일정 있음")
    expect(scheduleDots).toHaveLength(1)
    const memoDots = screen.getAllByTitle("메모 있음")
    expect(memoDots).toHaveLength(1)
  })

  it("backgroundConfig에 커스텀 배경 이미지가 설정되면 object-fit: cover 배경 레이어와 가독성 보호 오버레이를 렌더링한다", () => {
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-06"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[]}
        bgCustomizer={<button type="button">배경 설정 슬롯</button>}
        backgroundConfig={{
          imageUrl: "blob:custom-calendar-wallpaper",
          opacity: 40,
          blur: "MEDIUM",
        }}
      />,
    )

    expect(screen.getByText("배경 설정 슬롯")).toBeTruthy()
    const bgImg = screen.getByTestId("calendar-custom-bg-image") as HTMLImageElement
    expect(bgImg.getAttribute("src")).toBe("blob:custom-calendar-wallpaper")
    expect(bgImg.style.objectFit).toBe("cover")
    expect(bgImg.style.opacity).toBe("0.4")
    expect(bgImg.style.filter).toBe("blur(8px)")

    const overlay = screen.getByTestId("calendar-custom-bg-overlay")
    expect(overlay).toBeTruthy()
  })
})

