import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TwoMonthBudgetCard } from "./two-month-budget-card"

describe("TwoMonthBudgetCard", () => {
  it("당월과 익월의 예산·확정·고정구독·일반예정·잔여 예산을 나란히 표시하고 초과 시 경고 배지를 렌더링한다", () => {
    render(
      <TwoMonthBudgetCard
        comparison={{
          current: {
            month: { year: 2026, month: 11 },
            budgetAmount: 0,
            confirmedAmount: 15000,
            plannedFixedAmount: 5900,
            plannedVariableAmount: 0,
            totalExpectedAmount: 20900,
            remainingBudget: -20900,
            isOverBudget: false,
          },
          next: {
            month: { year: 2026, month: 12 },
            budgetAmount: 100000,
            confirmedAmount: 0,
            plannedFixedAmount: 17900,
            plannedVariableAmount: 119000,
            totalExpectedAmount: 136900,
            remainingBudget: -36900,
            isOverBudget: true,
          },
        }}
      />,
    )

    expect(screen.getByTestId("two-month-budget-card")).toBeTruthy()
    expect(screen.getByText("2026년 11월")).toBeTruthy()
    expect(screen.getByText("2026년 12월")).toBeTruthy()
    expect(screen.getByText("예산 미설정")).toBeTruthy()
    expect(screen.getByText("100,000원")).toBeTruthy()
    expect(screen.getByText("136,900원")).toBeTruthy()
    expect(screen.getByText("-36,900원")).toBeTruthy()
    expect(screen.getByText("예산 초과")).toBeTruthy()
  })
})
