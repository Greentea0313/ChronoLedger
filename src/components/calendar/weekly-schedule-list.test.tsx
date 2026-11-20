import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WeeklyScheduleList, type WeeklyExpenseEntry, type WeeklyScheduleEntry } from "./weekly-schedule-list"

const avatar = (id: string, name: string) => ({ id, name, iconUrl: `data:image/webp;base64,${id}` })

// Today is Monday 2026-11-09; the November 2026 grid starts on Sunday 11-01, so the current week is 11/08~11/14.
const schedules: WeeklyScheduleEntry[] = [
  { id: "s1", title: "픽업 A", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가", iconUrl: "data:image/webp;base64,game1", pickupAvatars: [avatar("c1", "캐릭1"), avatar("c2", "캐릭2")] },
  { id: "s2", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-01", end_date: "2026-11-30", gameId: "g9", gameName: "게임 다" },
]
const expenses: WeeklyExpenseEntry[] = [
  { id: "e1", title: "예정 패키지", status: "PLANNED", amount: 5000, date: "2026-11-10" },
  { id: "e2", title: "확정 패키지", status: "CONFIRMED", amount: 3000, date: "2026-11-09" },
  { id: "e3", title: "다른 주", status: "PLANNED", amount: 700, date: "2026-11-20" },
]

const currentWeek = () =>
  screen.getAllByTestId("week-group").find((group) => group.getAttribute("data-current-week") === "true") as HTMLElement
const otherWeeks = () => screen.getAllByTestId("week-group").filter((group) => group.getAttribute("data-current-week") !== "true")
const openWeek = (week: HTMLElement) => fireEvent.click(within(week).getByTestId("week-header"))
const filterChip = (name: string) => within(screen.getByRole("group", { name: "일정 유형 필터" })).getByRole("button", { name })

const baseProps = {
  year: 2026,
  month: 11,
  todayDate: "2026-11-09",
  selectedDate: "2026-11-09",
  expenses,
  onSelectDate: vi.fn(),
  onSelectExpense: vi.fn(),
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
}

function renderList(overrides: Partial<React.ComponentProps<typeof WeeklyScheduleList>> = {}) {
  const props = {
    year: 2026,
    month: 11,
    todayDate: "2026-11-09",
    selectedDate: "2026-11-09",
    schedules,
    expenses,
    onSelectDate: vi.fn(),
    onSelectExpense: vi.fn(),
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    ...overrides,
  }
  render(<WeeklyScheduleList {...props} />)
  return props
}

describe("WeeklyScheduleList week card (R94)", () => {
  it("shows 'N월 M주차' with the current-week badge, the date range and the planned/confirmed subtotal", () => {
    renderList()
    const current = currentWeek()
    expect(within(current).getByTestId("week-header").textContent).toContain("11월 2주차")
    expect(within(current).getByText("이번 주")).toBeTruthy()
    expect(within(current).getByTestId("week-range").textContent).toBe("11/08~11/14")
    expect(within(current).getByTestId("week-subtotal").textContent).toBe("예정 5,000원 · 확정 3,000원")
    expect(screen.getAllByText("이번 주")).toHaveLength(1)
  })

  it("opens only the current week by default and collapses it from its header", () => {
    renderList()
    otherWeeks().forEach((week) => {
      expect(within(week).getByTestId("week-header").getAttribute("aria-expanded")).toBe("false")
      expect(within(week).queryByTestId("schedule-timeline")).toBeNull()
    })
    const header = within(currentWeek()).getByTestId("week-header")
    fireEvent.click(header)
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(within(currentWeek()).queryByText("픽업 A")).toBeNull()
    expect(within(currentWeek()).getByText("이번 주")).toBeTruthy()
  })

  it("uses a neutral empty message for weeks without items and distinguishes filtered empty weeks", () => {
    renderList({ schedules: [], expenses: [] })
    fireEvent.click(filterChip("전체"))
    expect(screen.getAllByText("이 주에는 일정이 없습니다.").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "방송" }))
    expect(screen.getAllByText("선택한 필터에 맞는 일정이 없습니다.").length).toBeGreaterThan(0)
  })
})

describe("WeeklyScheduleList ended schedules (R91)", () => {
  const ended: WeeklyScheduleEntry = { id: "old", title: "어제 종료", schedule_type: "CONTENTS", start_date: "2026-11-05", end_date: "2026-11-08", gameId: "g1", gameName: "게임 가" }
  const endsToday: WeeklyScheduleEntry = { id: "today", title: "오늘 종료", schedule_type: "CONTENTS", start_date: "2026-11-05", end_date: "2026-11-09", gameId: "g1", gameName: "게임 가" }

  it("hides schedules that ended before today in every week, but keeps one that ends today", () => {
    renderList({ schedules: [ended, endsToday] })
    fireEvent.click(filterChip("전체"))
    otherWeeks().forEach(openWeek)
    expect(screen.queryByText("어제 종료")).toBeNull()
    expect(screen.getAllByText("오늘 종료").length).toBeGreaterThan(0)
  })
})

describe("WeeklyScheduleList schedule times (R85)", () => {
  const at = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString()
  const dawn: WeeklyScheduleEntry = {
    id: "dawn", title: "새벽 종료", schedule_type: "CONTENTS", start_date: "2026-11-05", end_date: "2026-11-09", end_at: at("2026-11-09", "04:59"), gameId: "g1", gameName: "게임 가",
  }

  it("hides a schedule once its end time passed today, and keeps it before that moment", () => {
    const { unmount } = render(<WeeklyScheduleList {...baseProps} now={new Date("2026-11-09T05:00:00+09:00")} schedules={[dawn]} />)
    fireEvent.click(filterChip("전체"))
    expect(screen.queryByText("새벽 종료")).toBeNull()
    unmount()

    render(<WeeklyScheduleList {...baseProps} now={new Date("2026-11-09T04:58:00+09:00")} schedules={[dawn]} />)
    fireEvent.click(filterChip("전체"))
    expect(within(currentWeek()).getByText("새벽 종료")).toBeTruthy()
  })

  it("shows the time period and the end-time badge on the end day", () => {
    render(
      <WeeklyScheduleList
        {...baseProps}
        now={new Date("2026-11-09T03:00:00+09:00")}
        schedules={[{ ...dawn, start_at: at("2026-11-05", "11:00"), start_at_estimated: true }]}
      />,
    )
    fireEvent.click(filterChip("전체"))
    const row = within(currentWeek()).getAllByTestId("timeline-row").find((item) => item.textContent?.includes("새벽 종료")) as HTMLElement
    expect(row.textContent).toContain("11.05 11:00(예상) ~ 11.09 04:59")
    expect(within(row).getByTestId("dday-badge").textContent).toBe("오늘 04:59 종료")
  })

  it("keeps date-only schedules unchanged (period without times, D-Day on the end day)", () => {
    render(<WeeklyScheduleList {...baseProps} now={new Date("2026-11-09T23:59:00+09:00")} schedules={[{ ...dawn, end_at: null }]} />)
    fireEvent.click(filterChip("전체"))
    const row = within(currentWeek()).getAllByTestId("timeline-row").find((item) => item.textContent?.includes("새벽 종료")) as HTMLElement
    expect(row.textContent).toContain("11.05 ~ 11.09")
    expect(within(row).getByTestId("dday-badge").textContent).toBe("D-Day")
  })

  it("does not count a schedule whose start time has not come as 진행 중", () => {
    const later: WeeklyScheduleEntry = { ...dawn, id: "later", title: "저녁 시작", schedule_type: "PICKUP", start_date: "2026-11-09", start_at: at("2026-11-09", "20:00"), end_at: null }
    render(<WeeklyScheduleList {...baseProps} now={new Date("2026-11-09T10:00:00+09:00")} schedules={[later]} />)
    expect(within(currentWeek()).getByText("저녁 시작")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "진행 중" }))
    expect(screen.queryByText("저녁 시작")).toBeNull()
  })
})

describe("WeeklyScheduleList timeline rows (R94)", () => {
  it("lists rows by date with the date column only on the first row of a date and a TODAY badge", () => {
    renderList({
      schedules: [
        schedules[0],
        { id: "s3", title: "같은 날 콘텐츠", schedule_type: "CONTENTS", start_date: "2026-11-09", end_date: "2026-11-20", gameId: "g1", gameName: "게임 가" },
        { id: "s4", title: "다음 날 방송", schedule_type: "BROADCAST", start_date: "2026-11-10", end_date: "2026-11-10", gameId: "g1", gameName: "게임 가" },
      ],
    })
    fireEvent.click(filterChip("전체"))
    const rows = within(currentWeek()).getAllByTestId("timeline-row")
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByTestId("timeline-date").textContent).toBe("11/09(월)")
    expect(within(rows[0]).getByTestId("today-badge").textContent).toBe("TODAY")
    expect(within(rows[1]).queryByTestId("timeline-date")).toBeNull()
    expect(within(rows[2]).getByTestId("timeline-date").textContent).toBe("11/10(화)")
    expect(within(rows[2]).queryByTestId("today-badge")).toBeNull()
  })

  it("shows title, type badge, game name, period and D-n on each row", () => {
    renderList()
    const row = within(currentWeek()).getAllByTestId("timeline-row").find((item) => item.textContent?.includes("픽업 A")) as HTMLElement
    expect(within(row).getByText("게임 가")).toBeTruthy()
    expect(within(row).getByText("11.09 ~ 11.12")).toBeTruthy()
    expect(within(row).getByTestId("dday-badge").textContent).toBe("D-3")
    expect(within(row).getByTestId("schedule-type-badge")).toBeTruthy()
  })

  it("marks schedules carried over from a previous week with 진행 중 at the week's first day", () => {
    const props = renderList({ selectedDate: "2026-11-08" })
    fireEvent.click(filterChip("전체"))
    const week = within(currentWeek())
    const carried = week.getAllByTestId("timeline-row").find((item) => item.textContent?.includes("버전 1.0")) as HTMLElement

    expect(within(carried).getByTestId("ongoing-chip").textContent).toBe("진행 중")
    expect(within(carried).getByTestId("timeline-date").textContent).toBe("11/08(일)")
    const button = within(carried).getByRole("button", { pressed: true })
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(props.onSelectDate).toHaveBeenCalledWith("2026-11-08")
    // A schedule starting inside the week has no 진행 중 chip.
    const own = week.getAllByTestId("timeline-row").find((item) => item.textContent?.includes("픽업 A")) as HTMLElement
    expect(within(own).queryByTestId("ongoing-chip")).toBeNull()
  })

  it("lists a multi-week schedule in every week it overlaps once the weeks are expanded", () => {
    renderList()
    fireEvent.click(filterChip("전체"))
    otherWeeks().forEach(openWeek)
    expect(screen.getAllByText("버전 1.0").length).toBeGreaterThan(3)
  })

  it("shows the first pickup character with a game icon badge for PICKUP rows", () => {
    renderList()
    const row = within(currentWeek()).getAllByTestId("timeline-row").find((item) => item.textContent?.includes("픽업 A")) as HTMLElement
    const avatarBox = within(row).getByTestId("schedule-avatar")
    expect((within(avatarBox).getByAltText("캐릭1") as HTMLImageElement).src).toContain("base64,c1")
    expect(within(avatarBox).queryByAltText("캐릭2")).toBeNull()
    expect(within(within(avatarBox).getByTestId("game-icon-badge")).getByRole("presentation", { hidden: true })).toBeTruthy()
  })

  it("falls back to the default avatar for a pickup without character icons and to a placeholder game icon", () => {
    renderList({
      schedules: [
        { id: "p", title: "아이콘 없는 픽업", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가", pickupAvatars: [{ id: "n", name: "노이콘", iconUrl: null }] },
      ],
    })
    const avatarBox = within(currentWeek()).getByTestId("schedule-avatar")
    expect(within(avatarBox).getByTestId("default-avatar")).toBeTruthy()
    expect(avatarBox.querySelector("img")).toBeNull()
  })

  it("uses the game icon as the avatar of non-pickup rows without a badge", () => {
    renderList({
      schedules: [
        { id: "c", title: "콘텐츠", schedule_type: "CONTENTS", start_date: "2026-11-09", end_date: "2026-11-20", gameId: "g1", gameName: "게임 가", iconUrl: "data:image/webp;base64,game1" },
      ],
    })
    fireEvent.click(filterChip("전체"))
    const avatarBox = within(currentWeek()).getByTestId("schedule-avatar")
    expect(avatarBox.querySelector("img")?.getAttribute("src")).toContain("game1")
    expect(within(avatarBox).queryByTestId("game-icon-badge")).toBeNull()
  })

  it("shows 기타 for schedules without a game", () => {
    renderList({
      schedules: [{ id: "x", title: "게임 없음", schedule_type: "BROADCAST", start_date: "2026-11-09", end_date: "2026-11-09", gameName: null }],
    })
    fireEvent.click(filterChip("전체"))
    expect(within(currentWeek()).getByText("기타")).toBeTruthy()
  })

  it("renders the BROADCAST label and rerun badge", () => {
    renderList({
      schedules: [{ id: "b", title: "특별 방송", schedule_type: "BROADCAST", is_rerun: false, start_date: "2026-11-10", end_date: "2026-11-10", gameName: "게임" }],
    })
    fireEvent.click(filterChip("전체"))
    expect(screen.getByText("특별방송")).toBeTruthy()
  })
})

describe("WeeklyScheduleList filters (R94)", () => {
  const mixed: WeeklyScheduleEntry[] = [
    { id: "p-new", title: "신규 픽업", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가" },
    { id: "p-rerun", title: "복각 픽업", schedule_type: "PICKUP", is_rerun: true, start_date: "2026-11-10", end_date: "2026-11-13", gameId: "g1", gameName: "게임 가" },
    { id: "p-future", title: "예정 픽업", schedule_type: "PICKUP", start_date: "2026-11-12", end_date: "2026-11-14", gameId: "g1", gameName: "게임 가" },
    { id: "v", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-09", end_date: "2026-11-30", gameId: "g1", gameName: "게임 가" },
    { id: "c", title: "이벤트 콘텐츠", schedule_type: "CONTENTS", start_date: "2026-11-09", end_date: "2026-11-20", gameId: "g1", gameName: "게임 가" },
    { id: "b", title: "특별 방송", schedule_type: "BROADCAST", start_date: "2026-11-11", end_date: "2026-11-11", gameId: "g1", gameName: "게임 가" },
  ]
  const titles = () => within(currentWeek()).queryAllByTestId("timeline-row").map((row) => row.textContent ?? "")

  it("defaults to 픽업(신규) and filters by type with aria-pressed chips", () => {
    renderList({ schedules: mixed })
    expect(filterChip("픽업").getAttribute("aria-pressed")).toBe("true")
    const sub = within(screen.getByRole("group", { name: "픽업 하위 필터" }))
    expect(sub.getByRole("button", { name: "신규" }).getAttribute("aria-pressed")).toBe("true")
    expect(titles()).toHaveLength(2)

    fireEvent.click(filterChip("전체"))
    expect(filterChip("전체").getAttribute("aria-pressed")).toBe("true")
    expect(titles()).toHaveLength(6)
    expect(screen.queryByRole("group", { name: "픽업 하위 필터" })).toBeNull()

    fireEvent.click(filterChip("버전"))
    expect(filterChip("버전").getAttribute("aria-pressed")).toBe("true")
    expect(titles()).toHaveLength(1)
    expect(titles()[0]).toContain("버전 1.0")

    fireEvent.click(filterChip("콘텐츠"))
    expect(titles()[0]).toContain("이벤트 콘텐츠")
    fireEvent.click(filterChip("방송"))
    expect(titles()[0]).toContain("특별 방송")
  })

  it("shows the pickup sub chips only for 픽업 and applies 신규 / 복각 / 진행 중", () => {
    renderList({ schedules: mixed })
    fireEvent.click(filterChip("픽업"))
    const sub = within(screen.getByRole("group", { name: "픽업 하위 필터" }))
    expect(titles()).toHaveLength(3)

    fireEvent.click(sub.getByRole("button", { name: "신규" }))
    expect(titles().map((t) => t.includes("복각 픽업"))).not.toContain(true)
    expect(titles()).toHaveLength(2)

    fireEvent.click(sub.getByRole("button", { name: "복각" }))
    expect(titles()).toHaveLength(1)
    expect(titles()[0]).toContain("복각 픽업")

    fireEvent.click(sub.getByRole("button", { name: "진행 중" }))
    // Only the pickups whose period contains today (11-09): the new one.
    expect(titles()).toHaveLength(1)
    expect(titles()[0]).toContain("신규 픽업")

    fireEvent.click(sub.getByRole("button", { name: "전체" }))
    expect(titles()).toHaveLength(3)
  })

  it("resets the pickup sub filter when another type is chosen", () => {
    renderList({ schedules: mixed })
    fireEvent.click(filterChip("픽업"))
    fireEvent.click(within(screen.getByRole("group", { name: "픽업 하위 필터" })).getByRole("button", { name: "복각" }))
    fireEvent.click(filterChip("전체"))
    expect(titles()).toHaveLength(6)
    fireEvent.click(filterChip("픽업"))
    expect(within(screen.getByRole("group", { name: "픽업 하위 필터" })).getByRole("button", { name: "전체" }).getAttribute("aria-pressed")).toBe("true")
  })

  it("filters NEW and RERUN pickups strictly by start_date, excluding carried-over schedules from previous weeks", () => {
    // Current week: 2026-11-08 ~ 2026-11-14 (today: 2026-11-09)
    const carriedNew: WeeklyScheduleEntry = {
      id: "c-new",
      title: "지난 주 시작 신규 픽업",
      schedule_type: "PICKUP",
      is_rerun: false,
      start_date: "2026-11-05",
      end_date: "2026-11-12",
      gameName: "게임 가",
    }
    const currentNew: WeeklyScheduleEntry = {
      id: "cur-new",
      title: "이번 주 시작 신규 픽업",
      schedule_type: "PICKUP",
      is_rerun: false,
      start_date: "2026-11-09",
      end_date: "2026-11-15",
      gameName: "게임 가",
    }
    const carriedRerun: WeeklyScheduleEntry = {
      id: "c-rerun",
      title: "지난 주 시작 복각 픽업",
      schedule_type: "PICKUP",
      is_rerun: true,
      start_date: "2026-11-06",
      end_date: "2026-11-13",
      gameName: "게임 가",
    }
    const currentRerun: WeeklyScheduleEntry = {
      id: "cur-rerun",
      title: "이번 주 시작 복각 픽업",
      schedule_type: "PICKUP",
      is_rerun: true,
      start_date: "2026-11-10",
      end_date: "2026-11-16",
      gameName: "게임 가",
    }

    renderList({ schedules: [carriedNew, currentNew, carriedRerun, currentRerun] })
    // Default is PICKUP + NEW: carriedNew should be excluded from current week, only currentNew shown
    expect(titles()).toEqual(expect.arrayContaining([expect.stringContaining("이번 주 시작 신규 픽업")]))
    expect(titles().some((t) => t.includes("지난 주 시작 신규 픽업"))).toBe(false)
    expect(titles()).toHaveLength(1)

    // Switch to RERUN: carriedRerun excluded, only currentRerun shown
    const sub = within(screen.getByRole("group", { name: "픽업 하위 필터" }))
    fireEvent.click(sub.getByRole("button", { name: "복각" }))
    expect(titles()).toEqual(expect.arrayContaining([expect.stringContaining("이번 주 시작 복각 픽업")]))
    expect(titles().some((t) => t.includes("지난 주 시작 복각 픽업"))).toBe(false)
    expect(titles()).toHaveLength(1)

    // Switch to ONGOING: both carried and current are included if today (11-09) is within range
    fireEvent.click(sub.getByRole("button", { name: "진행 중" }))
    expect(titles().some((t) => t.includes("지난 주 시작 신규 픽업"))).toBe(true)
    expect(titles().some((t) => t.includes("이번 주 시작 신규 픽업"))).toBe(true)
    expect(titles().some((t) => t.includes("지난 주 시작 복각 픽업"))).toBe(true)

    // Switch to ALL: all 4 are shown in current week
    fireEvent.click(sub.getByRole("button", { name: "전체" }))
    expect(titles()).toHaveLength(4)
  })
})

describe("WeeklyScheduleList expense section", () => {
  it("keeps expenses in a separate 지출 section below the timeline", () => {
    renderList()
    const section = within(currentWeek()).getByTestId("expense-section")
    expect(within(section).getByText("예정 패키지")).toBeTruthy()
    expect(within(section).getByText("확정 패키지")).toBeTruthy()
    expect(within(currentWeek()).getByTestId("schedule-timeline").contains(section)).toBe(false)
  })

  it("collapses and expands the expense section on its own with count and subtotals in its header", () => {
    renderList()
    const header = within(currentWeek()).getByTestId("expense-section-header")

    expect(header.textContent).toBe("지출 2건 · 예정 5,000원 · 확정 3,000원")
    expect(within(currentWeek()).getByText("예정 패키지")).toBeTruthy()

    fireEvent.click(header)
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(within(currentWeek()).queryByText("예정 패키지")).toBeNull()
    // The timeline stays: the expense section toggles independently.
    expect(within(currentWeek()).getByText("픽업 A")).toBeTruthy()

    fireEvent.click(header)
    expect(within(currentWeek()).getByText("예정 패키지")).toBeTruthy()
  })

  it("never shows the expense section in guest mode and omits it for weeks without expenses", () => {
    renderList({ expenses: null })
    expect(screen.queryByTestId("expense-section")).toBeNull()
    expect(screen.queryByTestId("week-subtotal")).toBeNull()

    document.body.innerHTML = ""
    renderList({ expenses: [] })
    expect(screen.queryByTestId("expense-section")).toBeNull()
  })

  it("still opens the expense detail from an expanded section", () => {
    const props = renderList()
    fireEvent.click(within(currentWeek()).getByRole("button", { name: "확정 패키지 상세" }))
    expect(props.onSelectExpense).toHaveBeenCalledWith("e2")
  })

  it("wires date, expense and month navigation callbacks", () => {
    const props = renderList()
    fireEvent.click(screen.getAllByText("픽업 A")[0])
    expect(props.onSelectDate).toHaveBeenCalledWith("2026-11-09")
    fireEvent.click(screen.getByRole("button", { name: "예정 패키지 상세" }))
    expect(props.onSelectExpense).toHaveBeenCalledWith("e1")
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }))
    fireEvent.click(screen.getByRole("button", { name: "이전 달" }))
    expect(props.onNextMonth).toHaveBeenCalledTimes(1)
    expect(props.onPrevMonth).toHaveBeenCalledTimes(1)
  })
})

describe("WeeklyScheduleList favourite schedules (R35)", () => {
  it("shows no favourite controls without a toggle handler (guests)", () => {
    renderList()
    expect(screen.queryByRole("button", { name: /관심 일정/ })).toBeNull()
  })

  it("renders aria-pressed star toggles and calls back without selecting the date", () => {
    const onToggleFavorite = vi.fn()
    const props = renderList({ favoriteScheduleIds: new Set(["s1"]), onToggleFavorite })
    fireEvent.click(filterChip("전체"))
    const week = within(currentWeek())

    expect(week.getByRole("button", { name: "픽업 A 관심 일정 해제" }).getAttribute("aria-pressed")).toBe("true")
    expect(week.getByRole("button", { name: "버전 1.0 관심 일정 등록" }).getAttribute("aria-pressed")).toBe("false")
    expect(week.queryByRole("button", { name: /예정 지출 추가/ })).toBeNull()

    fireEvent.click(week.getByRole("button", { name: "버전 1.0 관심 일정 등록" }))
    expect(onToggleFavorite).toHaveBeenCalledWith("s2")
    expect(props.onSelectDate).not.toHaveBeenCalled()
  })
})
