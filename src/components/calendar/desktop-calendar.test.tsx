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

    const memoDot = screen.getByTestId("memo-dot")
    expect(memoDot).toBeTruthy()
    expect(memoDot.parentElement?.className).toContain("w-4")
    expect(memoDot.parentElement?.className).toContain("md:w-5")
    expect(memoDot.parentElement?.className).toContain("justify-center")
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

  it("모바일에서 게임 일정 도트는 유형별(VERSION 초록, PICKUP 파랑, CONTENTS 보라)로 시작일(is_start_date)에만 분리 렌더링되고 진행 중인 중간 날짜에는 렌더링되지 않는다", () => {
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
            schedules: [
              { id: "s1", schedule_type: "VERSION", is_start_date: true, game_id: "g1" },
              { id: "s2", schedule_type: "PICKUP", is_start_date: true, game_id: "g1" },
              { id: "s3", schedule_type: "CONTENTS", is_start_date: true, game_id: "g1" },
            ],
            icons: [],
            hasMemo: true,
          },
          {
            date: "2026-10-07",
            day: 7,
            inCurrentMonth: true,
            schedules: [
              { id: "s1", schedule_type: "VERSION", is_start_date: false, game_id: "g1" },
              { id: "s2", schedule_type: "PICKUP", is_start_date: false, game_id: "g1" },
              { id: "s3", schedule_type: "CONTENTS", is_start_date: false, game_id: "g1" },
            ],
            icons: [],
            hasMemo: false,
          },
        ]}
      />,
    )

    const versionDots = screen.getAllByTitle("버전 일정 있음")
    expect(versionDots).toHaveLength(1)
    expect(versionDots[0].className).toContain("bg-success")

    const pickupDots = screen.getAllByTitle("픽업 일정 있음")
    expect(pickupDots).toHaveLength(1)
    expect(pickupDots[0].className).toContain("bg-primary")

    const contentsDots = screen.getAllByTitle("콘텐츠 일정 있음")
    expect(contentsDots).toHaveLength(1)
    expect(contentsDots[0].className).toContain("bg-purple-500")

    const memoDots = screen.getAllByTitle("메모 있음")
    expect(memoDots).toHaveLength(1)
    expect(memoDots[0].className).toContain("bg-content-secondary")

    const mobileDotContainer = versionDots[0].parentElement
    expect(mobileDotContainer?.className).toContain("flex-col")
    expect(mobileDotContainer?.className).toContain("items-end")
    expect(mobileDotContainer?.className).toContain("gap-1")
  })

  it("backgroundConfig에 커스텀 배경 이미지가 설정되면 object-fit: cover 배경 레이어, 가독성 보호 오버레이 및 날짜 타일 투명도를 렌더링한다", () => {
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
            schedules: [],
            icons: [],
            hasMemo: false,
          },
          {
            date: "2026-10-07",
            day: 7,
            inCurrentMonth: true,
            schedules: [],
            icons: [],
            hasMemo: false,
          },
        ]}
        bgCustomizer={<button type="button">배경 설정 슬롯</button>}
        backgroundConfig={{
          imageUrl: "blob:custom-calendar-wallpaper",
          opacity: 40,
          tileOpacity: 35,
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

    const unselectedTile = screen.getByRole("button", { name: "2026-10-07" })
    expect(unselectedTile.getAttribute("style")).toContain("rgb(var(--surface) / 0.35)")
  })

  it("해당 날짜가 today일 경우 데스크톱(md+)에서는 #EFBF04 '오늘' 배지를 표시하고 모바일(< md)에서는 타일 금색 테두리 강조만 적용한다", () => {
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-17"
        todayDate="2026-10-17"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-17",
            day: 17,
            inCurrentMonth: true,
            schedules: [],
            icons: [],
            hasMemo: false,
          },
          {
            date: "2026-10-18",
            day: 18,
            inCurrentMonth: true,
            schedules: [],
            icons: [],
            hasMemo: false,
          },
        ]}
      />,
    )

    // 17일 타일에 오늘 배지 존재 및 데스크톱 전용(hidden md:inline-flex) 확인
    const todayBadge = screen.getByTestId("today-badge-2026-10-17")
    expect(todayBadge).toBeTruthy()
    expect(todayBadge.textContent).toBe("오늘")
    expect(todayBadge.className).toContain("hidden")
    expect(todayBadge.className).toContain("md:inline-flex")
    // 색상이 #EFBF04 (rgb(239, 191, 4))인지 확인
    expect(todayBadge.style.backgroundColor).toBe("rgb(239, 191, 4)")
    expect(todayBadge.style.color).toBe("rgb(15, 17, 21)")

    // 17일 타일 버튼에 모바일 금색(#EFBF04) 테두리 강조 클래스 및 data-today 속성 적용 확인
    const todayTile = screen.getByRole("button", { name: "2026-10-17" })
    expect(todayTile.getAttribute("data-today")).toBe("true")
    expect(todayTile.className).toContain("max-md:border-[#EFBF04]")

    // 18일 타일에는 오늘 배지 및 금색 테두리가 없어야 함
    expect(screen.queryByTestId("today-badge-2026-10-18")).toBeNull()
    const otherTile = screen.getByRole("button", { name: "2026-10-18" })
    expect(otherTile.getAttribute("data-today")).toBeNull()
    expect(otherTile.className).not.toContain("max-md:border-[#EFBF04]")
  })

  it("메모 도트는 데스크톱에서 아이콘 컬럼 중심과 일치하는 래퍼 안에 위치하고, 기본 및 커스텀 배경에 따라 대비 링과 미세 그림자가 적용된다", () => {
    const { unmount } = render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-20"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-20",
            day: 20,
            inCurrentMonth: true,
            schedules: [],
            icons: [],
            hasMemo: true,
          },
        ]}
      />,
    )

    // 기본 배경: 데스크톱 메모 도트
    const defaultMemoDot = screen.getByTestId("memo-dot")
    expect(defaultMemoDot.parentElement?.className).toContain("w-4")
    expect(defaultMemoDot.parentElement?.className).toContain("md:w-5")
    expect(defaultMemoDot.parentElement?.className).toContain("flex")
    expect(defaultMemoDot.parentElement?.className).toContain("justify-center")
    expect(defaultMemoDot.className).toContain("bg-content-secondary")
    expect(defaultMemoDot.className).toContain("ring-1")
    expect(defaultMemoDot.className).toContain("ring-surface")
    expect(defaultMemoDot.className).toContain("shadow-[0_0_0_1px_rgba(0,0,0,0.25)]")

    // 기본 배경: 모바일 메모 도트
    const defaultMobileMemoDot = screen.getByTestId("mobile-dot-memo")
    expect(defaultMobileMemoDot.className).toContain("bg-content-secondary")
    expect(defaultMobileMemoDot.className).toContain("ring-1")
    expect(defaultMobileMemoDot.className).toContain("ring-surface")
    expect(defaultMobileMemoDot.className).toContain("shadow-[0_0_0_1px_rgba(0,0,0,0.25)]")

    unmount()

    // 커스텀 배경 적용 시
    render(
      <DesktopCalendar
        year={2026}
        month={10}
        selectedDate="2026-10-20"
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        days={[
          {
            date: "2026-10-20",
            day: 20,
            inCurrentMonth: true,
            schedules: [],
            icons: [],
            hasMemo: true,
          },
        ]}
        backgroundConfig={{
          imageUrl: "blob:custom-bg",
          opacity: 50,
          tileOpacity: 50,
          blur: "OFF",
        }}
      />,
    )

    const customMemoDot = screen.getByTestId("memo-dot")
    expect(customMemoDot.className).toContain("ring-[1.5px]")
    expect(customMemoDot.className).toContain("ring-white/80")
    expect(customMemoDot.className).toContain("shadow-[0_1px_2px_rgba(0,0,0,0.6)]")

    const customMobileMemoDot = screen.getByTestId("mobile-dot-memo")
    expect(customMobileMemoDot.className).toContain("ring-[1.5px]")
    expect(customMobileMemoDot.className).toContain("ring-white/80")
    expect(customMobileMemoDot.className).toContain("shadow-[0_1px_2px_rgba(0,0,0,0.6)]")
  })
})

