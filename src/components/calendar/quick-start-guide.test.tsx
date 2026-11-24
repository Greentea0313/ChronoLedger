import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { QuickStartGuide } from "./quick-start-guide"

describe("QuickStartGuide", () => {
  it("열림 상태에서 3단계 빠른 시작과 데스크톱 단축키 요약을 표시하고 닫기·토글 콜백을 호출한다", () => {
    const onToggle = vi.fn()
    const onDismiss = vi.fn()

    render(
      <QuickStartGuide
        isOpen
        isSignedIn
        onToggle={onToggle}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText("빠른 시작 가이드")).toBeTruthy()
    expect(screen.getByText("1. 게임 구독")).toBeTruthy()
    expect(screen.getByText("2. 관심 일정 · 예정 지출")).toBeTruthy()
    expect(screen.getByText("3. 예산 · 지갑 · 알림")).toBeTruthy()
    expect(screen.getByText("이전 달")).toBeTruthy()
    expect(screen.getByText("새 지출 등록")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "빠른 시작 닫기" }))
    expect(onDismiss).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: /\? 빠른 시작 · 단축키/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("접힘 상태에서는 토글 버튼만 표시하고 본문을 숨긴다", () => {
    render(
      <QuickStartGuide
        isOpen={false}
        isSignedIn={false}
        onToggle={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByText("빠른 시작 가이드")).toBeNull()
    expect(screen.getByRole("button", { name: /\? 빠른 시작 · 단축키/ })).toBeTruthy()
  })
})
