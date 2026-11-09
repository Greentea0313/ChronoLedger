import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WeeklyScheduleList, type WeeklyExpenseEntry, type WeeklyScheduleEntry } from "./weekly-schedule-list"

const schedules: WeeklyScheduleEntry[] = [
  { id: "s1", title: "픽업 A", schedule_type: "PICKUP", start_date: "2026-11-09", end_date: "2026-11-12", gameName: "게임 가" },
  { id: "s2", title: "버전 1.0", schedule_type: "VERSION", start_date: "2026-11-01", end_date: "2026-11-30", gameName: "게임 가" },
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
  it("highlights only the current KST week and shows per-week planned/confirmed subtotals", () => {
    renderList()
    const groups = screen.getAllByTestId("week-group")
    const current = groups.filter((group) => group.getAttribute("data-current-week") === "true")
    expect(current).toHaveLength(1)
    expect(within(current[0]).getByText("이번 주")).toBeTruthy()
    expect(within(current[0]).getByTestId("week-subtotal").textContent).toBe("예정 5,000원 · 확정 3,000원")
    expect(within(current[0]).getByText("게임 가 · 픽업 A")).toBeTruthy()
    expect(within(current[0]).getByText("D-3")).toBeTruthy()
  })

  it("lists a multi-week schedule in every week it overlaps", () => {
    renderList()
    expect(screen.getAllByText("게임 가 · 버전 1.0").length).toBeGreaterThan(3)
  })

  it("hides expenses and subtotals in guest mode (expenses = null)", () => {
    renderList({ expenses: null })
    expect(screen.queryByTestId("week-subtotal")).toBeNull()
    expect(screen.queryByText("예정 패키지")).toBeNull()
  })

  it("wires date, expense and month navigation callbacks", () => {
    const props = renderList()
    fireEvent.click(screen.getAllByText("게임 가 · 픽업 A")[0])
    expect(props.onSelectDate).toHaveBeenCalledWith("2026-11-09")
    fireEvent.click(screen.getByRole("button", { name: "예정 패키지 상세" }))
    expect(props.onSelectExpense).toHaveBeenCalledWith("e1")
    fireEvent.click(screen.getByRole("button", { name: "다음 달" }))
    fireEvent.click(screen.getByRole("button", { name: "이전 달" }))
    expect(props.onNextMonth).toHaveBeenCalledTimes(1)
    expect(props.onPrevMonth).toHaveBeenCalledTimes(1)
  })
})
