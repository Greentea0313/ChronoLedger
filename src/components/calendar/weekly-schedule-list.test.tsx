import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WeeklyScheduleList, type WeeklyExpenseEntry, type WeeklyScheduleEntry } from "./weekly-schedule-list"

const schedules: WeeklyScheduleEntry[] = [
  { id: "s1", title: "픽업 A", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가" },
  { id: "s2", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-01", end_date: "2026-11-30", gameId: "g1", gameName: "게임 가" },
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

describe("WeeklyScheduleList", () => {
  it("renders the BROADCAST label and rerun badge", () => {
    render(
      <WeeklyScheduleList
        year={2026}
        month={11}
        todayDate="2026-11-10"
        selectedDate="2026-11-10"
        schedules={[{
          id: "broadcast",
          title: "특별 방송",
          schedule_type: "BROADCAST",
          is_rerun: false,
          start_date: "2026-11-10",
          end_date: "2026-11-10",
          gameName: "게임",
        }]}
        expenses={null}
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    )

    expect(screen.getByText("특별방송")).toBeTruthy()
  })
  it("highlights only the current KST week and shows per-week planned/confirmed subtotals", () => {
    renderList()
    const groups = screen.getAllByTestId("week-group")
    const current = groups.filter((group) => group.getAttribute("data-current-week") === "true")
    expect(current).toHaveLength(1)
    expect(within(current[0]).getByText("이번 주")).toBeTruthy()
    expect(within(current[0]).getByTestId("week-subtotal").textContent).toBe("예정 5,000원 · 확정 3,000원")
    expect(within(current[0]).getByText("픽업 A")).toBeTruthy()
    expect(within(current[0]).getByText("D-3")).toBeTruthy()
  })

  it("lists a multi-week schedule in every week it overlaps once the weeks are expanded", () => {
    renderList()
    // Only the current week is open by default; expanding the other weeks reveals the same schedule there.
    otherWeeks().forEach((week) => {
      openWeek(week)
      within(week).queryAllByTestId("game-group-header").forEach((header) => fireEvent.click(header))
    })
    expect(screen.getAllByText("버전 1.0").length).toBeGreaterThan(3)
  })

  it("selects the week's first day for carried-over schedules and keeps aria-pressed consistent with it", () => {
    const props = renderList({ selectedDate: "2026-11-08" })
    // s2 started 2026-11-01, so in the 2026-11-08 week it maps to that week's first day.
    const carried = screen.getAllByText("버전 1.0")
    const pressed = carried.map((node) => node.closest("button")).filter((button) => button?.getAttribute("aria-pressed") === "true")
    expect(pressed).toHaveLength(1)
    fireEvent.click(pressed[0] as HTMLElement)
    expect(props.onSelectDate).toHaveBeenCalledWith("2026-11-08")
  })

  it("uses a neutral empty message for weeks without items", () => {
    renderList({ schedules: [], expenses: [] })
    expect(screen.queryByText("이번 주 일정이 없습니다.")).toBeNull()
    expect(screen.getAllByText("이 주에는 일정이 없습니다.").length).toBeGreaterThan(0)
  })

  it("groups a week's schedules by game (name asc, 기타 last) with the game header and rerun badge", () => {
    renderList({
      schedules: [
        { id: "z", title: "연결 없음", schedule_type: "CONTENTS", start_date: "2026-11-09", end_date: "2026-11-10", gameId: null, gameName: null },
        { id: "b2", title: "나 후반", schedule_type: "PICKUP", is_rerun: true, start_date: "2026-11-11", end_date: "2026-11-12", gameId: "gb", gameName: "나 게임" },
        { id: "a1", title: "가 일정", schedule_type: "BROADCAST", start_date: "2026-11-10", end_date: "2026-11-10", gameId: "ga", gameName: "가 게임" },
        { id: "b1", title: "나 전반", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-10", gameId: "gb", gameName: "나 게임" },
      ],
    })
    const current = screen.getAllByTestId("week-group").find((group) => group.getAttribute("data-current-week") === "true") as HTMLElement
    const headers = within(current).getAllByTestId("game-group-header").map((h) => h.querySelector("span.truncate")?.textContent)
    expect(headers).toEqual(["가 게임", "나 게임", "기타"])
    expect(within(current).getAllByTestId("game-group-header").map((h) => h.textContent)).toEqual(["가 게임1건", "나 게임2건", "기타1건"])

    const nGroup = within(current).getByRole("region", { name: "나 게임 일정" })
    const rows = within(nGroup).getAllByRole("listitem").map((item) => item.querySelector("button") as HTMLElement)
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("나 전반"),
      expect.stringContaining("나 후반"),
    ])
    expect(within(rows[0]).queryByTestId("rerun-chip")).toBeNull()
    expect(within(rows[1]).getByTestId("rerun-chip").textContent).toBe("복각")
    expect(within(within(current).getByRole("region", { name: "가 게임 일정" })).getByText("특별방송")).toBeTruthy()
  })

  it("keeps expenses in a separate 지출 section below the game groups", () => {
    renderList()
    const current = screen.getAllByTestId("week-group").find((group) => group.getAttribute("data-current-week") === "true") as HTMLElement
    const section = within(current).getByTestId("expense-section")
    expect(within(section).getByText("예정 패키지")).toBeTruthy()
    expect(within(section).getByText("확정 패키지")).toBeTruthy()
    expect(within(current).getByRole("region", { name: "게임 가 일정" }).contains(section)).toBe(false)
  })

  it("shows 20px pickup avatars on PICKUP rows only", () => {
    renderList({
      schedules: [
        { id: "p", title: "카프카 픽업", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가", pickupAvatars: [{ id: "c1", name: "카프카", iconUrl: "data:image/webp;base64,a" }] },
        { id: "v", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-09", end_date: "2026-11-30", gameId: "g1", gameName: "게임 가" },
      ],
    })
    const rows = within(currentWeek()).getAllByRole("listitem").map((item) => item.querySelector("button") as HTMLElement)
    const pickupRow = rows.find((row) => row.textContent?.includes("카프카 픽업")) as HTMLElement
    const versionRow = rows.find((row) => row.textContent?.includes("버전 1.0")) as HTMLElement

    expect((within(pickupRow).getByAltText("카프카") as HTMLImageElement).style.width).toBe("20px")
    expect(within(versionRow).queryByTestId("pickup-avatars")).toBeNull()
  })

  describe("collapsible game groups and expense section (A1 U-03)", () => {
    const avatar = (id: string, name: string) => ({ id, name, iconUrl: `data:image/webp;base64,${id}` })
    const avatarSchedules: WeeklyScheduleEntry[] = [
      { id: "p1", title: "A 픽업", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가", pickupAvatars: [avatar("c1", "캐릭1"), avatar("c2", "캐릭2")] },
      { id: "p2", title: "B 픽업", schedule_type: "PICKUP", start_date: "2026-11-10", end_date: "2026-11-12", gameId: "g1", gameName: "게임 가", pickupAvatars: [avatar("c2", "캐릭2"), avatar("c3", "캐릭3"), avatar("c4", "캐릭4")] },
      { id: "v", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-01", end_date: "2026-11-30", gameId: "g1", gameName: "게임 가" },
    ]

    it("opens the current week's groups and expense section by default and collapses the other weeks", () => {
      renderList()

      const headers = within(currentWeek()).getAllByTestId("game-group-header")
      expect(headers.every((header) => header.getAttribute("aria-expanded") === "true")).toBe(true)
      expect(within(currentWeek()).getByText("픽업 A")).toBeTruthy()
      expect(within(currentWeek()).getByTestId("expense-section-header").getAttribute("aria-expanded")).toBe("true")

      expect(within(currentWeek()).getByTestId("week-header").getAttribute("aria-expanded")).toBe("true")
      otherWeeks().forEach((week) => {
        // R70: other weeks start collapsed, so their game groups and expense sections are not rendered.
        expect(within(week).getByTestId("week-header").getAttribute("aria-expanded")).toBe("false")
        expect(within(week).queryAllByTestId("game-group-header")).toHaveLength(0)
        expect(within(week).queryByTestId("expense-section-header")).toBeNull()
        expect(within(week).queryByText("픽업 A")).toBeNull()
      })
      expect(screen.queryByText("다른 주")).toBeNull()
      // Subtotals stay visible in the collapsed week header.
      expect(otherWeeks().some((week) => within(week).getByTestId("week-subtotal").textContent === "예정 700원 · 확정 0원")).toBe(true)
    })

    it("toggles a game group with aria-expanded and keeps other groups untouched", () => {
      renderList({
        schedules: [
          ...schedules,
          { id: "o", title: "나 게임 일정", schedule_type: "CONTENTS", start_date: "2026-11-09", end_date: "2026-11-10", gameId: "g2", gameName: "나 게임" },
        ],
      })
      const [first, second] = within(currentWeek()).getAllByTestId("game-group-header")

      fireEvent.click(first)
      expect(first.getAttribute("aria-expanded")).toBe("false")
      expect(within(currentWeek()).queryByText("픽업 A")).toBeNull()
      expect(second.getAttribute("aria-expanded")).toBe("true")
      expect(within(currentWeek()).getByText("나 게임 일정")).toBeTruthy()

      fireEvent.click(first)
      expect(first.getAttribute("aria-expanded")).toBe("true")
      expect(within(currentWeek()).getByText("픽업 A")).toBeTruthy()
    })

    it("lets the user open a collapsed week, then its group", () => {
      renderList()
      const week = otherWeeks()[0]
      openWeek(week)
      expect(within(week).getByTestId("week-header").getAttribute("aria-expanded")).toBe("true")
      const header = within(week).getAllByTestId("game-group-header")[0]
      expect(header.getAttribute("aria-expanded")).toBe("false")

      fireEvent.click(header)

      expect(header.getAttribute("aria-expanded")).toBe("true")
      expect(within(week).getByText("버전 1.0")).toBeTruthy()
    })

    it("collapses the current week from its header (R70)", () => {
      renderList()
      const header = within(currentWeek()).getByTestId("week-header")
      fireEvent.click(header)
      expect(header.getAttribute("aria-expanded")).toBe("false")
      expect(within(currentWeek()).queryByText("픽업 A")).toBeNull()
      expect(within(currentWeek()).getByText("이번 주")).toBeTruthy()
    })

    it("shows the schedule count and up to three distinct 20px pickup avatars with +n in the group header", () => {
      renderList({ schedules: avatarSchedules })
      const header = within(currentWeek()).getAllByTestId("game-group-header")[0]

      expect(header.textContent).toContain("3건")
      const avatars = within(header).getByTestId("pickup-avatars")
      expect(avatars.querySelectorAll("img")).toHaveLength(3)
      expect(within(avatars).getByText("+1")).toBeTruthy()
      expect((avatars.querySelector("img") as HTMLImageElement).style.width).toBe("20px")
      // c2 appears in both schedules but is counted once: c1, c2, c3, c4 -> 4 distinct.
      expect(avatars.getAttribute("title")).toBe("캐릭1, 캐릭2, 캐릭3, 캐릭4")
    })

    it("keeps the header avatars visible while the group is collapsed", () => {
      renderList({ schedules: avatarSchedules })
      const header = within(currentWeek()).getAllByTestId("game-group-header")[0]
      fireEvent.click(header)

      expect(header.getAttribute("aria-expanded")).toBe("false")
      expect(within(header).getByTestId("pickup-avatars")).toBeTruthy()
      expect(within(currentWeek()).queryByText("A 픽업")).toBeNull()
    })

    it("collapses and expands the expense section on its own with count and subtotals in its header", () => {
      renderList()
      const header = within(currentWeek()).getByTestId("expense-section-header")

      expect(header.textContent).toBe("지출 2건 · 예정 5,000원 · 확정 3,000원")
      expect(within(currentWeek()).getByText("예정 패키지")).toBeTruthy()

      fireEvent.click(header)
      expect(header.getAttribute("aria-expanded")).toBe("false")
      expect(within(currentWeek()).queryByText("예정 패키지")).toBeNull()
      // Game groups stay open: the expense section toggles independently.
      expect(within(currentWeek()).getAllByTestId("game-group-header")[0].getAttribute("aria-expanded")).toBe("true")
      expect(within(currentWeek()).getByText("픽업 A")).toBeTruthy()

      fireEvent.click(header)
      expect(within(currentWeek()).getByText("예정 패키지")).toBeTruthy()
    })

    it("never shows the expense section in guest mode and omits it for weeks without expenses", () => {
      renderList({ expenses: null })
      expect(screen.queryByTestId("expense-section")).toBeNull()
      expect(screen.queryByTestId("expense-section-header")).toBeNull()

      document.body.innerHTML = ""
      renderList({ expenses: [] })
      expect(screen.queryByTestId("expense-section")).toBeNull()
    })

    it("still opens the expense detail from an expanded section", () => {
      const props = renderList()
      fireEvent.click(within(currentWeek()).getByRole("button", { name: "확정 패키지 상세" }))
      expect(props.onSelectExpense).toHaveBeenCalledWith("e2")
    })
  })

  it("hides expenses and subtotals in guest mode (expenses = null)", () => {
    renderList({ expenses: null })
    expect(screen.queryByTestId("week-subtotal")).toBeNull()
    expect(screen.queryByText("예정 패키지")).toBeNull()
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
    expect(screen.queryByRole("button", { name: /예정 지출 추가/ })).toBeNull()
  })

  it("renders aria-pressed star toggles, calls back without selecting the date, and offers expense add only for favourites", () => {
    const onToggleFavorite = vi.fn()
    const onAddPlannedExpense = vi.fn()
    const props = renderList({ favoriteScheduleIds: new Set(["s1"]), onToggleFavorite, onAddPlannedExpense })
    const week = within(currentWeek())

    expect(week.getByRole("button", { name: "픽업 A 관심 일정 해제" }).getAttribute("aria-pressed")).toBe("true")
    expect(week.getByRole("button", { name: "버전 1.0 관심 일정 등록" }).getAttribute("aria-pressed")).toBe("false")
    expect(week.getAllByRole("button", { name: /예정 지출 추가/ })).toHaveLength(1)

    fireEvent.click(week.getByRole("button", { name: "버전 1.0 관심 일정 등록" }))
    expect(onToggleFavorite).toHaveBeenCalledWith("s2")
    fireEvent.click(week.getByRole("button", { name: "픽업 A 예정 지출 추가" }))
    expect(onAddPlannedExpense).toHaveBeenCalledWith("s1")
    expect(props.onSelectDate).not.toHaveBeenCalled()
  })
})
