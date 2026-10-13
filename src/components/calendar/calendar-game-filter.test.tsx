import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CalendarGameFilter, type GameFilterOption } from "./calendar-game-filter"

describe("CalendarGameFilter - 캘린더 복수 선택 게임 필터", () => {
  const mockGames: GameFilterOption[] = [
    { id: "game-1", name: "원신", iconUrl: "/icons/genshin.webp" },
    { id: "game-2", name: "붕괴: 스타레일", iconUrl: "/icons/starrail.webp" },
    { id: "game-3", name: "명조: 워더링 웨이브", iconUrl: null },
  ]

  it("구독 게임이 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(
      <CalendarGameFilter
        games={[]}
        selectedGameIds={[]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("모든 게임이 선택되었을 때 버튼에 [게임 : 전체]를 표시한다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1", "game-2", "game-3"]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "게임 필터 선택" }).textContent).toContain("게임 : 전체")
  })

  it("일부 게임이 선택되었을 때 [게임 : n개]로 표시한다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1", "game-2"]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "게임 필터 선택" }).textContent).toContain("게임 : 2개")
  })

  it("선택된 게임이 없을 때 [게임 : 0개]로 표시한다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={[]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "게임 필터 선택" }).textContent).toContain("게임 : 0개")
  })

  it("버튼 클릭 시 드롭다운이 열리고 체크박스 및 게임명이 정상 표시되며 일정 수 배지는 없다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1"]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )

    // 초기 상태에는 드롭다운 닫힘
    expect(screen.queryByRole("dialog", { name: "게임 필터 목록" })).toBeNull()

    // 버튼 클릭
    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))

    // 드롭다운 열림
    const dialog = screen.getByRole("dialog", { name: "게임 필터 목록" })
    expect(dialog).toBeTruthy()

    // 게임 목록 표시
    expect(screen.getByText("원신")).toBeTruthy()
    expect(screen.getByText("붕괴: 스타레일")).toBeTruthy()
    expect(screen.getByText("명조: 워더링 웨이브")).toBeTruthy()

    // 체크박스 상태
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[]
    expect(checkboxes[0].checked).toBe(true)
    expect(checkboxes[1].checked).toBe(false)
    expect(checkboxes[2].checked).toBe(false)
  })

  it("전체 선택 및 선택 해제 버튼이 정상 동작한다", () => {
    const handleChange = vi.fn()
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1"]}
        onChangeSelectedGameIds={handleChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))

    // 전체 선택 클릭
    fireEvent.click(screen.getByRole("button", { name: "전체 선택" }))
    expect(handleChange).toHaveBeenCalledWith(["game-1", "game-2", "game-3"])

    // 선택 해제 클릭
    fireEvent.click(screen.getByRole("button", { name: "선택 해제" }))
    expect(handleChange).toHaveBeenCalledWith([])
  })

  it("개별 게임 항목을 클릭하여 토글할 수 있다", () => {
    const handleChange = vi.fn()
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1"]}
        onChangeSelectedGameIds={handleChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))

    // 이미 선택된 '원신' 클릭 -> 해제
    fireEvent.click(screen.getByText("원신"))
    expect(handleChange).toHaveBeenCalledWith([])

    // 미선택된 '붕괴: 스타레일' 클릭 -> 추가
    fireEvent.click(screen.getByText("붕괴: 스타레일"))
    expect(handleChange).toHaveBeenCalledWith(["game-1", "game-2"])
  })

  it("외부 클릭 시 드롭다운이 닫힌다", () => {
    render(
      <div>
        <div data-testid="outside-element">외부 영역</div>
        <CalendarGameFilter
          games={mockGames}
          selectedGameIds={["game-1"]}
          onChangeSelectedGameIds={vi.fn()}
        />
      </div>
    )

    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))
    expect(screen.getByRole("dialog", { name: "게임 필터 목록" })).toBeTruthy()

    // 외부 엘리먼트 mousedown
    fireEvent.mouseDown(screen.getByTestId("outside-element"))
    expect(screen.queryByRole("dialog", { name: "게임 필터 목록" })).toBeNull()
  })

  it("Escape 키 입력 시 드롭다운이 닫힌다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1"]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))
    expect(screen.getByRole("dialog", { name: "게임 필터 목록" })).toBeTruthy()

    // Escape 키 입력
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "게임 필터 목록" })).toBeNull()
  })

  it("창 포커스 전환(window blur) 시에는 드롭다운이 닫히지 않고 열린 상태를 유지한다", () => {
    render(
      <CalendarGameFilter
        games={mockGames}
        selectedGameIds={["game-1"]}
        onChangeSelectedGameIds={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "게임 필터 선택" }))
    expect(screen.getByRole("dialog", { name: "게임 필터 목록" })).toBeTruthy()

    // 윈도우 포커스 해제 (창 포커스 전환)
    fireEvent(window, new Event("blur"))

    // 여전히 열려 있어야 함
    expect(screen.getByRole("dialog", { name: "게임 필터 목록" })).toBeTruthy()
  })
})
