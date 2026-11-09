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

  it("lists a multi-week schedule in every week it overlaps", () => {
    renderList()
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
    const headers = within(current).getAllByTestId("game-group-header").map((h) => h.textContent)
    expect(headers).toEqual(["가 게임", "나 게임", "기타"])

    const nGroup = within(current).getByRole("region", { name: "나 게임 일정" })
    const rows = within(nGroup).getAllByRole("button")
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
