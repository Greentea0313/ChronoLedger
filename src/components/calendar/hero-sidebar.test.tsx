import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HeroSidebarContent, type HeroScheduleItem } from "./hero-sidebar"

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  },
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}))

describe("HeroSidebarContent", () => {
  it("sorts schedules by start_date ASC then end_date ASC and displays vertical 3-line card format", () => {
    const schedules: HeroScheduleItem[] = [
      {
        id: "sch-3",
        title: "사",
        schedule_type: "PICKUP",
        start_date: "2026-10-15",
        end_date: "2026-11-04",
        gameName: "명일방주: 엔드필드",
      },
      {
        id: "sch-1",
        title: "켈시 에스페란타/클로저",
        schedule_type: "PICKUP",
        start_date: "2026-10-14",
        end_date: "2026-10-28",
        gameName: "명일방주",
      },
      {
        id: "sch-4",
        title: "1.6",
        schedule_type: "VERSION",
        start_date: "2026-10-15",
        end_date: "2026-11-25",
        gameName: "명일방주: 엔드필드",
      },
      {
        id: "sch-2",
        title: "오트쿠튀르::르루주 붉은 신 싱클레어",
        schedule_type: "PICKUP",
        start_date: "2026-10-15",
        end_date: "2026-10-28",
        gameName: "림버스 컴퍼니",
      },
    ]

    render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-15"
        totalAsset={100000}
        budgetAmount={200000}
        expectedExpense={50000}
        wallets={[]}
        schedules={schedules}
        expenses={[]}
        memos={[]}
      />,
    )

    // Check title order and split badges in the rendered cards
    expect(screen.getByText("켈시 에스페란타")).toBeTruthy()
    expect(screen.getByText("클로저")).toBeTruthy()
    expect(screen.getByText("오트쿠튀르::르루주 붉은 신 싱클레어")).toBeTruthy()
    expect(screen.getByText("사")).toBeTruthy()
    expect(screen.getByText("1.6")).toBeTruthy()

    // Verify 3-line content components exist for each card
    expect(screen.getByText("명일방주")).toBeTruthy()
    expect(screen.getByText("2026-10-14 ~ 2026-10-28")).toBeTruthy()

    expect(screen.getByText("림버스 컴퍼니")).toBeTruthy()
    expect(screen.getByText("2026-10-15 ~ 2026-10-28")).toBeTruthy()
    expect(screen.getByText("오트쿠튀르::르루주 붉은 신 싱클레어")).toBeTruthy()

    expect(screen.getByText("2026-10-15 ~ 2026-11-04")).toBeTruthy()
    expect(screen.getByText("사")).toBeTruthy()
  })

  const renderWith = (schedules: HeroScheduleItem[]) =>
    render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[]}
        schedules={schedules}
        expenses={[]}
        memos={[]}
      />,
    )

  it("groups schedules with the same game, type and period into one card", () => {
    renderWith([
      { id: "a", title: "켈시", schedule_type: "PICKUP", start_date: "2026-10-14", end_date: "2026-10-28", gameId: "g1", gameName: "명일방주", memo: "한정" },
      { id: "b", title: "클로저", schedule_type: "PICKUP", start_date: "2026-10-14", end_date: "2026-10-28", gameId: "g1", gameName: "명일방주" },
    ])

    expect(screen.getAllByText("명일방주")).toHaveLength(1)
    expect(screen.getAllByText("2026-10-14 ~ 2026-10-28")).toHaveLength(1)
    expect(screen.getByText("• 켈시")).toBeTruthy()
    expect(screen.getByText("• 클로저")).toBeTruthy()
    expect(screen.getByText("한정")).toBeTruthy()
  })

  it("keeps separate cards when the period, type or game differs", () => {
    renderWith([
      { id: "a", title: "켈시", schedule_type: "PICKUP", start_date: "2026-10-14", end_date: "2026-10-28", gameId: "g1", gameName: "명일방주" },
      { id: "b", title: "클로저", schedule_type: "PICKUP", start_date: "2026-10-14", end_date: "2026-11-04", gameId: "g1", gameName: "명일방주" },
      { id: "c", title: "이벤트", schedule_type: "CONTENTS", start_date: "2026-10-14", end_date: "2026-10-28", gameId: "g1", gameName: "명일방주" },
      { id: "d", title: "싱클레어", schedule_type: "PICKUP", start_date: "2026-10-14", end_date: "2026-10-28", gameId: "g2", gameName: "림버스 컴퍼니" },
    ])

    expect(screen.getAllByText("명일방주")).toHaveLength(3)
    expect(screen.getByText("켈시")).toBeTruthy()
    expect(screen.getByText("클로저")).toBeTruthy()
    expect(screen.queryByText(/^• /)).toBeNull()
  })
})
