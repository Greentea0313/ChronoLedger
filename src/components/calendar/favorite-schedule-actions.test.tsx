import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FavoriteScheduleActions } from "./favorite-schedule-actions"

describe("FavoriteScheduleActions", () => {
  it("renders nothing without a toggle handler", () => {
    const { container } = render(<FavoriteScheduleActions scheduleId="s1" title="픽업" favoriteScheduleIds={new Set(["s1"])} />)
    expect(container.firstChild).toBeNull()
  })

  it("registers a non-favourite and hides the expense action", () => {
    const onToggleFavorite = vi.fn()
    render(<FavoriteScheduleActions scheduleId="s1" title="픽업" favoriteScheduleIds={new Set()} onToggleFavorite={onToggleFavorite} onAddPlannedExpense={vi.fn()} />)

    const star = screen.getByRole("button", { name: "픽업 관심 일정 등록" })
    expect(star.getAttribute("aria-pressed")).toBe("false")
    expect(screen.queryByRole("button", { name: "픽업 예정 지출 추가" })).toBeNull()
    fireEvent.click(star)
    expect(onToggleFavorite).toHaveBeenCalledWith("s1")
  })

  it("releases a favourite and shows the expense action that does not bubble to parents", () => {
    const onToggleFavorite = vi.fn()
    const onAddPlannedExpense = vi.fn()
    const onParentClick = vi.fn()
    render(
      <div onClick={onParentClick}>
        <FavoriteScheduleActions scheduleId="s1" title="픽업" favoriteScheduleIds={new Set(["s1"])} onToggleFavorite={onToggleFavorite} onAddPlannedExpense={onAddPlannedExpense} />
      </div>,
    )

    expect(screen.getByRole("button", { name: "픽업 관심 일정 해제" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "픽업 예정 지출 추가" }))
    expect(onAddPlannedExpense).toHaveBeenCalledWith("s1")
    fireEvent.click(screen.getByRole("button", { name: "픽업 관심 일정 해제" }))
    expect(onToggleFavorite).toHaveBeenCalledWith("s1")
    expect(onParentClick).not.toHaveBeenCalled()
  })
})
