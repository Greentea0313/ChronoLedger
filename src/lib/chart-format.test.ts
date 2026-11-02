import { describe, expect, it } from "vitest"
import { formatAmountAxisTick, getGameTooltipLabel } from "./chart-format"

describe("formatAmountAxisTick", () => {
  it("uses readable labels for zero, thousands, and ten-thousands", () => {
    expect([0, 4_000, 8_000, 10_000, 15_000].map(formatAmountAxisTick)).toEqual([
      "0",
      "4천",
      "8천",
      "1만",
      "1.5만",
    ])
  })

  it("keeps labels unique for distinct axis tick values", () => {
    const ticks = [0, 1_000, 2_000, 4_000, 8_000, 10_000, 10_001, 11_000, 15_000, 20_000]
    const labels = ticks.map(formatAmountAxisTick)

    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe("getGameTooltipLabel", () => {
  const games = [
    { key: "game-1", name: "원신" },
    { key: "NONE", name: "게임 미연결" },
  ]

  it("shows a game name instead of its key", () => {
    expect(getGameTooltipLabel("game-1", games)).toBe("원신")
  })

  it("uses the unlinked label for missing or unknown keys", () => {
    expect(getGameTooltipLabel("NONE", games)).toBe("게임 미연결")
    expect(getGameTooltipLabel("unknown-game-id", games)).toBe("게임 미연결")
  })
})
