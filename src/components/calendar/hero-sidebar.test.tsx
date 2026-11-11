import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HeroSidebarContent, type HeroExpenseItem, type HeroScheduleItem } from "./hero-sidebar"

describe("HeroSidebarContent pickup avatars (R52)", () => {
  const base = { totalAsset: 0, budgetAmount: 0, expectedExpense: 0, wallets: [], memos: [] }
  const avatar = (id: string, name: string) => ({ id, name, iconUrl: `data:image/webp;base64,${id}` })

  it("shows the pickup character avatars next to a single PICKUP card title", () => {
    const schedules: HeroScheduleItem[] = [{
      id: "p",
      title: "카프카 픽업",
      schedule_type: "PICKUP",
      start_date: "2026-11-15",
      end_date: "2026-11-20",
      gameName: "게임",
      pickupAvatars: [avatar("c1", "카프카")],
    }]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    expect(screen.getByAltText("카프카")).toBeTruthy()
    expect((screen.getByAltText("카프카") as HTMLImageElement).style.width).toBe("28px")
  })

  it("shows each grouped PICKUP item's own avatars", () => {
    const schedules: HeroScheduleItem[] = [
      { id: "a", title: "카프카 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임", pickupAvatars: [avatar("c1", "카프카")] },
      { id: "b", title: "블랙 스완 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임", pickupAvatars: [avatar("c2", "블랙 스완")] },
    ]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    expect(screen.getAllByTestId("pickup-avatars")).toHaveLength(2)
    expect(screen.getByAltText("카프카")).toBeTruthy()
    expect(screen.getByAltText("블랙 스완")).toBeTruthy()
  })

  it("keeps legacy PICKUP cards without avatars unchanged", () => {
    const schedules: HeroScheduleItem[] = [{ id: "p", title: "레거시 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameName: "게임" }]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    expect(screen.queryByTestId("pickup-avatars")).toBeNull()
    expect(screen.getByText("레거시 픽업")).toBeTruthy()
  })
})

describe("HeroSidebarContent D-n badge and period progress bar", () => {
  const base = { totalAsset: 0, budgetAmount: 0, expectedExpense: 0, wallets: [], memos: [] }

  it("shows the end-date D-n badge and an elapsed-share bar on schedule cards", () => {
    const schedules: HeroScheduleItem[] = [
      { id: "a", title: "픽업", schedule_type: "PICKUP", start_date: "2026-11-10", end_date: "2026-11-20", gameName: "게임" },
    ]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-10" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    expect(screen.getByTestId("dday-badge").textContent).toBe("D-5")
    expect(screen.getByRole("progressbar", { name: "일정 진행률" }).getAttribute("aria-valuenow")).toBe("50")
    expect((screen.getByTestId("period-progress-fill") as HTMLElement).style.width).toBe("50%")
  })

  it("omits the progress bar for single-day schedules but keeps the badge", () => {
    const schedules: HeroScheduleItem[] = [
      { id: "a", title: "콘텐츠", schedule_type: "CONTENTS", start_date: "2026-11-15", end_date: "2026-11-15", gameName: "게임" },
    ]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    expect(screen.getByTestId("dday-badge").textContent).toBe("D-Day")
    expect(screen.queryByRole("progressbar", { name: "일정 진행률" })).toBeNull()
  })

  it("splits rerun and new PICKUP into separate cards and nests the rerun chip in the type badge", () => {
    const schedules: HeroScheduleItem[] = [
      { id: "new", title: "신규 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임" },
      { id: "rerun", title: "복각 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임", is_rerun: true },
    ]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} expenses={[]} />)

    const badges = screen.getAllByTestId("schedule-type-badge")
    expect(badges).toHaveLength(2)
    expect(screen.getAllByTestId("rerun-chip")).toHaveLength(1)
    const rerunBadge = badges.find((badge) => badge.querySelector('[data-testid="rerun-chip"]'))
    expect(rerunBadge?.textContent).toBe("픽업복각")
    expect(screen.getAllByText("복각")).toHaveLength(1)
  })

  it("shows the payment D-n for PLANNED expenses only and a bar when a period exists", () => {
    const expenses: HeroExpenseItem[] = [
      { id: "p", title: "예정 결제", final_amount: 1000, status: "PLANNED", gameName: null, dueDate: "2026-11-20", periodStart: "2026-11-10" },
      { id: "c", title: "확정 결제", final_amount: 2000, status: "CONFIRMED", gameName: null, dueDate: "2026-11-20", periodStart: "2026-11-10" },
    ]
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={[]} expenses={expenses} />)
    fireEvent.change(screen.getByLabelText("선택일 상세 항목 선택"), { target: { value: "EXPENSE" } })

    expect(screen.getAllByTestId("dday-badge")).toHaveLength(1)
    expect(screen.getByTestId("dday-badge").textContent).toBe("D-5")
    expect(screen.getAllByRole("progressbar", { name: "결제 기간 진행률" })).toHaveLength(1)
  })
})

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

  it("메모 입력란에서 Tab 키는 포커스를 옮기지 않고 탭 문자를 입력한다", () => {
    render(
      <HeroSidebarContent
        selectedDateLabel="2026-10-14"
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[]}
        schedules={[]}
        expenses={[]}
        memos={["가나"]}
        onSaveMemo={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText("선택일 상세 항목 선택"), { target: { value: "MEMO" } })
    fireEvent.click(screen.getByRole("button", { name: "수정" }))
    const textarea = screen.getByPlaceholderText("메모를 입력하세요 (최대 200자)") as HTMLTextAreaElement
    textarea.focus()
    textarea.setSelectionRange(1, 1)

    const notPrevented = fireEvent.keyDown(textarea, { key: "Tab" })

    expect(notPrevented).toBe(false)
    expect(textarea.value).toBe("가	나")
    expect(document.activeElement).toBe(textarea)
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
  it("예상 지출이 예산의 80% 이상이면 [주의: 예산 근접], 100% 초과면 [위험: 예산 초과] 배지를 표시한다", () => {
    const base = { selectedDateLabel: "2026-10-14", totalAsset: 0, wallets: [], schedules: [], expenses: [], memos: [] }
    const { rerender } = render(<HeroSidebarContent {...base} budgetAmount={100000} expectedExpense={79000} />)
    expect(screen.queryByText("[주의: 예산 근접]")).toBeNull()
    expect(screen.queryByText("[위험: 예산 초과]")).toBeNull()

    rerender(<HeroSidebarContent {...base} budgetAmount={100000} expectedExpense={80000} />)
    expect(screen.getByText("[주의: 예산 근접]")).toBeTruthy()

    rerender(<HeroSidebarContent {...base} budgetAmount={100000} expectedExpense={100000} />)
    expect(screen.getByText("[주의: 예산 근접]")).toBeTruthy()

    rerender(<HeroSidebarContent {...base} budgetAmount={100000} expectedExpense={100001} />)
    expect(screen.getByText("[위험: 예산 초과]")).toBeTruthy()
    expect(screen.queryByText("[주의: 예산 근접]")).toBeNull()

    rerender(<HeroSidebarContent {...base} budgetAmount={0} expectedExpense={500000} />)
    expect(screen.queryByText("[위험: 예산 초과]")).toBeNull()
  })
})

describe("HeroSidebarContent favourite schedules (R35)", () => {
  const base = { totalAsset: 0, budgetAmount: 0, expectedExpense: 0, wallets: [], memos: [], expenses: [] }
  const schedules: HeroScheduleItem[] = [
    { id: "a", title: "카프카 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임" },
    { id: "b", title: "블랙 스완 픽업", schedule_type: "PICKUP", start_date: "2026-11-15", end_date: "2026-11-20", gameId: "g", gameName: "게임" },
    { id: "c", title: "단독 방송", schedule_type: "BROADCAST", start_date: "2026-11-15", end_date: "2026-11-15", gameId: "h", gameName: "다른 게임" },
  ]

  it("hides the controls for guests", () => {
    render(<HeroSidebarContent {...base} selectedDateLabel="2026-11-15" todayDate="2026-11-15" schedules={schedules} />)
    expect(screen.queryByRole("button", { name: /관심 일정/ })).toBeNull()
  })

  it("toggles favourites on grouped and single cards and offers + 예정 지출 추가 only for favourites", () => {
    const onToggleFavorite = vi.fn()
    const onAddPlannedExpense = vi.fn()
    render(
      <HeroSidebarContent
        {...base}
        selectedDateLabel="2026-11-15"
        todayDate="2026-11-15"
        schedules={schedules}
        favoriteScheduleIds={new Set(["b", "c"])}
        onToggleFavorite={onToggleFavorite}
        onAddPlannedExpense={onAddPlannedExpense}
      />,
    )

    expect(screen.getByRole("button", { name: "카프카 픽업 관심 일정 등록" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: "블랙 스완 픽업 관심 일정 해제" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getAllByRole("button", { name: /예정 지출 추가$/ }).map((b) => b.getAttribute("aria-label")).sort()).toEqual([
      "단독 방송 예정 지출 추가",
      "블랙 스완 픽업 예정 지출 추가",
    ])

    fireEvent.click(screen.getByRole("button", { name: "카프카 픽업 관심 일정 등록" }))
    expect(onToggleFavorite).toHaveBeenCalledWith("a")
    fireEvent.click(screen.getByRole("button", { name: "단독 방송 예정 지출 추가" }))
    expect(onAddPlannedExpense).toHaveBeenCalledWith("c")
  })
})

describe("HeroSidebarContent version grouping (R82)", () => {
  const item = (id: string, type: HeroScheduleItem["schedule_type"], start: string, end: string, extra: Partial<HeroScheduleItem> = {}): HeroScheduleItem => ({
    id,
    title: `T-${id}`,
    schedule_type: type,
    start_date: start,
    end_date: end,
    gameId: "g1",
    gameName: "게임",
    ...extra,
  })
  const version = item("v", "VERSION", "2026-11-01", "2026-11-21", { title: "3.2 버전" })
  const pickup = item("p", "PICKUP", "2026-11-01", "2026-11-10", { title: "카프카 픽업" })
  const contents = item("c", "CONTENTS", "2026-11-01", "2026-11-15", { title: "이벤트" })

  const renderDay = (date: string, schedules: HeroScheduleItem[]) =>
    render(
      <HeroSidebarContent
        selectedDateLabel={date}
        todayDate={date}
        totalAsset={0}
        budgetAmount={0}
        expectedExpense={0}
        wallets={[]}
        schedules={schedules}
        expenses={[]}
        memos={[]}
      />,
    )

  it("nests children inside the visible version card, collapsed with a summary", () => {
    renderDay("2026-11-01", [version, pickup, contents])
    const toggle = screen.getByTestId("version-children-toggle")
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(toggle.textContent).toContain("픽업 1 · 콘텐츠 1")
    expect(screen.getByText("3.2 버전")).toBeTruthy()
    expect(screen.queryByText("카프카 픽업")).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getAllByTestId("version-child-card")).toHaveLength(2)
    expect(screen.getByText("카프카 픽업")).toBeTruthy()
    expect(screen.queryByTestId("version-parent-label")).toBeNull()
  })

  it("keeps children standalone with a parent label when the version card is not shown that day", () => {
    renderDay("2026-11-10", [version, pickup])
    expect(screen.queryByTestId("version-children-toggle")).toBeNull()
    expect(screen.getByText("카프카 픽업")).toBeTruthy()
    expect(screen.getByTestId("version-parent-label").textContent).toBe("소속: 3.2 버전")
  })

  it("applies the same rule when all ongoing schedules are shown", () => {
    renderDay("2026-11-05", [version, pickup])
    expect(screen.queryByText("3.2 버전")).toBeNull()

    fireEvent.click(screen.getByLabelText("진행 일정 전체 보기"))
    expect(screen.getByText("3.2 버전")).toBeTruthy()
    expect(screen.getByTestId("version-children-toggle").getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText("카프카 픽업")).toBeNull()
    expect(screen.queryByTestId("version-parent-label")).toBeNull()
  })

  it("labels an ongoing child standalone once its version has ended", () => {
    const late = item("late", "PICKUP", "2026-11-15", "2026-11-30", { title: "늦은 픽업" })
    renderDay("2026-11-25", [version, late])
    fireEvent.click(screen.getByLabelText("진행 일정 전체 보기"))
    expect(screen.queryByTestId("version-children-toggle")).toBeNull()
    expect(screen.getByText("늦은 픽업")).toBeTruthy()
    expect(screen.getByTestId("version-parent-label").textContent).toBe("소속: 3.2 버전")
  })

  it("does not group broadcasts or other games under a version", () => {
    const broadcast = item("b", "BROADCAST", "2026-11-01", "2026-11-01", { title: "특별 방송" })
    const other = item("o", "PICKUP", "2026-11-01", "2026-11-10", { title: "다른 게임 픽업", gameId: "g2" })
    renderDay("2026-11-01", [version, broadcast, other])
    expect(screen.queryByTestId("version-children-toggle")).toBeNull()
    expect(screen.getByText("특별 방송")).toBeTruthy()
    expect(screen.getByText("다른 게임 픽업")).toBeTruthy()
  })
})
