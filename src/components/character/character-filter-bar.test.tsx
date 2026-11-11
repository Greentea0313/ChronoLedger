import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EMPTY_CHARACTER_FILTERS } from "@/lib/character-utils"
import { CharacterFilterBar } from "./character-filter-bar"

const schema = {
  character_label: "오퍼레이터",
  rarities: ["6★", "5★", "4★"],
  axes: [{ key: "class1", label: "속성", options: ["물리", "냉기", "열기", "자연", "전기"] }],
}

describe("CharacterFilterBar", () => {
  it("keeps the label in its own column and wraps only the chips (inline layout)", () => {
    render(
      <CharacterFilterBar characters={[]} schema={schema} filters={EMPTY_CHARACTER_FILTERS} onChange={vi.fn()} idPrefix="roster" />,
    )
    const row = screen.getByTestId("roster-rarity-filter")
    const [label, chips] = Array.from(row.children) as HTMLElement[]
    expect(label.textContent).toBe("레어도")
    expect(label.className).toContain("shrink-0")
    // Chips live in their own wrapping container next to the label, not as siblings of the label.
    expect(chips.className).toContain("flex-wrap")
    expect(within(chips).getAllByRole("button").map((button) => button.textContent)).toEqual(["전체", "6★", "5★", "4★"])
    expect(row.className).not.toContain("flex-wrap")
  })
})
