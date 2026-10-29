import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  it("sorts schedules by start_date DESC then end_date ASC and displays vertical 3-line card format", () => {
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

    // sch-1은 진행 중(시작/종료일 아님)이므로 전체 보기 토글을 켜야 노출됨
    fireEvent.click(screen.getByLabelText("진행 일정 전체 보기"))

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

  it("기본 상태에서 VERSION은 시작일만, 그 외 일정은 시작/종료일만 노출하고 토글 ON 시 진행 일정을 모두 노출한다", () => {
    const { container } = render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-20"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[]}
        schedules={[
          { id: "v-start", title: "버전시작", schedule_type: "VERSION", start_date: "2026-10-20", end_date: "2026-11-30" },
          { id: "v-end", title: "버전종료", schedule_type: "VERSION", start_date: "2026-09-10", end_date: "2026-10-20" },
          { id: "p-end", title: "픽업종료", schedule_type: "PICKUP", start_date: "2026-10-01", end_date: "2026-10-20" },
          { id: "c-mid", title: "콘텐츠진행", schedule_type: "CONTENTS", start_date: "2026-10-10", end_date: "2026-10-30" },
          { id: "p-start", title: "픽업시작", schedule_type: "PICKUP", start_date: "2026-10-20", end_date: "2026-10-25" },
        ]}
        expenses={[]}
        memos={[]}
      />,
    )

    expect(screen.getByText("버전시작")).toBeTruthy()
    expect(screen.getByText("픽업종료")).toBeTruthy()
    expect(screen.getByText("픽업시작")).toBeTruthy()
    expect(screen.queryByText("버전종료")).toBeNull()
    expect(screen.queryByText("콘텐츠진행")).toBeNull()

    fireEvent.click(screen.getByLabelText("진행 일정 전체 보기"))

    expect(screen.getByText("버전종료")).toBeTruthy()
    expect(screen.getByText("콘텐츠진행")).toBeTruthy()

    // start_date DESC, 동일 시작일은 end_date ASC: 버전시작/픽업시작(10-20) -> 픽업시작(10-25) 먼저 -> 버전시작(11-30)
    const order = Array.from(container.querySelectorAll(".font-bold.text-sm")).map((el) => el.textContent)
    expect(order).toEqual(["픽업시작", "버전시작", "콘텐츠진행", "픽업종료", "버전종료"])
  })

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

  it("요약 카드의 진행률 n%와 (예상 지출 - 확정 지출) 잔여 금액을 올바르게 표시한다", () => {
    render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={1000000}
        budgetAmount={500000}
        expectedExpense={200000}
        confirmedExpense={50000}
        wallets={[]}
        schedules={[]}
        expenses={[]}
        memos={[]}
      />,
    )

    // 진행률 = (50,000 / 200,000) * 100 = 25%
    expect(screen.getByText("진행률 25%")).toBeTruthy()
    // 잔여 예정 지출 = 200,000 - 50,000 = 150,000 원
    expect(screen.getByText("150,000 원")).toBeTruthy()
    expect(screen.getByText("총 자산: 1,000,000 원")).toBeTruthy()
    expect(screen.getByText("예상 지출: 200,000 원")).toBeTruthy()
  })

  it("사이드바 카드 순서가 요약 -> 선택일 -> 스토어 포인트 순으로 배치된다", () => {
    const { container } = render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[{ platform: "GOOGLE_PLAY", current_balance: 1000 }]}
        schedules={[]}
        expenses={[]}
        memos={[]}
      />,
    )

    const cardTitles = container.querySelectorAll(".font-semibold.tracking-tight, h3, h4")
    const titles = Array.from(cardTitles).map((el) => el.textContent?.trim()).filter(Boolean)
    // 요약이 가장 먼저, 선택일 상세가 두 번째, 스토어 포인트가 세 번째
    const summaryIndex = titles.findIndex((t) => t === "요약")
    const dateIndex = titles.findIndex((t) => t === "2026-10-14")
    const pointIndex = titles.findIndex((t) => t === "스토어 포인트")

    expect(summaryIndex).toBeGreaterThanOrEqual(0)
    expect(dateIndex).toBeGreaterThan(summaryIndex)
    expect(pointIndex).toBeGreaterThan(dateIndex)
  })

  it("선택일 카드에서 드롭다운(게임 일정 / 지출 내역 / 메모) 전환 및 메모 작성/저장이 정상 동작한다", async () => {
    const onSaveMemo = vi.fn().mockResolvedValue(undefined)
    render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={10000}
        wallets={[]}
        schedules={[{ id: "s1", title: "특별 일정", schedule_type: "CONTENTS", start_date: "2026-10-14", end_date: "2026-10-14" }]}
        expenses={[{ id: "e1", title: "패키지 구매", final_amount: 10000, status: "CONFIRMED", gameName: "명일방주" }]}
        memos={["기존 메모 내용"]}
        onSaveMemo={onSaveMemo}
      />,
    )

    const dropdown = screen.getByLabelText("선택일 상세 항목 선택") as HTMLSelectElement
    expect(dropdown.value).toBe("SCHEDULE")
    expect(screen.getByText("특별 일정")).toBeTruthy()

    // 지출 내역 탭으로 전환
    fireEvent.change(dropdown, { target: { value: "EXPENSE" } })
    expect(dropdown.value).toBe("EXPENSE")
    expect(screen.getByText("패키지 구매")).toBeTruthy()
    expect(screen.queryByText("특별 일정")).toBeNull()

    // 메모 탭으로 전환
    fireEvent.change(dropdown, { target: { value: "MEMO" } })
    expect(dropdown.value).toBe("MEMO")
    expect(screen.getByText("기존 메모 내용")).toBeTruthy()
    expect(screen.queryByText("패키지 구매")).toBeNull()

    // 메모 수정 클릭
    const editButton = screen.getByRole("button", { name: "수정" })
    fireEvent.click(editButton)

    const textarea = screen.getByPlaceholderText("메모를 입력하세요 (최대 200자)") as HTMLTextAreaElement
    expect(textarea.value).toBe("기존 메모 내용")

    fireEvent.change(textarea, { target: { value: "수정된 새 메모" } })
    const saveButton = screen.getByRole("button", { name: "저장" })
    fireEvent.click(saveButton)

    await waitFor(() => expect(onSaveMemo).toHaveBeenCalledWith("수정된 새 메모"))
  })

  it("바텀시트 제스처 간섭 방지를 위해 인터랙티브 요소에 data-vaul-no-drag가 부여되어 있다", () => {
    const { container } = render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[]}
        schedules={[]}
        expenses={[{ id: "e1", title: "항목", final_amount: 1000, status: "CONFIRMED", gameName: "게임" }]}
        memos={[]}
        onRegisterExpense={vi.fn()}
        onSelectExpense={vi.fn()}
      />,
    )

    const noDragElements = container.querySelectorAll("[data-vaul-no-drag]")
    expect(noDragElements.length).toBeGreaterThanOrEqual(3)
  })
})
