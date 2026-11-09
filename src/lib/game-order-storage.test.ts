import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissGameOnboarding,
  isGameOnboardingDismissed,
  loadGameOrder,
  moveGameInOrder,
  saveGameOrder,
  sortByGameOrder,
} from "./game-order-storage"

describe("game order storage", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("round-trips a de-duplicated order per user", () => {
    saveGameOrder("u1", ["b", "a", "b"])
    saveGameOrder("u2", ["x"])
    expect(loadGameOrder("u1")).toEqual(["b", "a"])
    expect(loadGameOrder("u2")).toEqual(["x"])
    expect(window.localStorage.getItem("chronoledger:game-order:u1")).toBe('["b","a"]')
  })

  it("returns [] for anonymous users, missing keys and corrupted data", () => {
    expect(loadGameOrder(null)).toEqual([])
    expect(loadGameOrder(undefined)).toEqual([])
    expect(loadGameOrder("u1")).toEqual([])
    window.localStorage.setItem("chronoledger:game-order:u1", "{not json")
    expect(loadGameOrder("u1")).toEqual([])
    window.localStorage.setItem("chronoledger:game-order:u1", '{"a":1}')
    expect(loadGameOrder("u1")).toEqual([])
    window.localStorage.setItem("chronoledger:game-order:u1", '["a",1,null,"a","b"]')
    expect(loadGameOrder("u1")).toEqual(["a", "b"])
  })

  it("does nothing without a user id", () => {
    saveGameOrder(null, ["a"])
    dismissGameOnboarding(undefined)
    expect(window.localStorage.length).toBe(0)
  })

  it("survives storage failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => saveGameOrder("u1", ["a"])).not.toThrow()
    expect(() => dismissGameOnboarding("u1")).not.toThrow()
    expect(loadGameOrder("u1")).toEqual([])
    expect(isGameOnboardingDismissed("u1")).toBe(false)
  })

  it("tracks onboarding dismissal per user", () => {
    expect(isGameOnboardingDismissed("u1")).toBe(false)
    dismissGameOnboarding("u1")
    expect(window.localStorage.getItem("chronoledger:game-onboarding-dismissed:u1")).toBe("1")
    expect(isGameOnboardingDismissed("u1")).toBe(true)
    expect(isGameOnboardingDismissed("u2")).toBe(false)
    expect(isGameOnboardingDismissed(null)).toBe(false)
  })
})

describe("sortByGameOrder", () => {
  const games = [
    { id: "1", name: "다라" },
    { id: "2", name: "가나" },
    { id: "3", name: "나다" },
    { id: "4", name: "라마" },
  ]
  const sort = (order: string[]) => sortByGameOrder(games, order, (g) => g.id, (g) => g.name).map((g) => g.id)

  it("puts ordered items first by index, then the rest by Korean name", () => {
    expect(sort(["4", "1"])).toEqual(["4", "1", "2", "3"])
  })

  it("ignores unknown ids and falls back to name order when the order is empty", () => {
    expect(sort(["zzz", "3"])).toEqual(["3", "2", "1", "4"])
    expect(sort([])).toEqual(["2", "3", "1", "4"])
  })

  it("returns a new array without mutating the input", () => {
    const before = games.map((g) => g.id)
    const result = sortByGameOrder(games, [], (g) => g.id, (g) => g.name)
    expect(result).not.toBe(games)
    expect(games.map((g) => g.id)).toEqual(before)
  })
})

describe("moveGameInOrder", () => {
  it("swaps with the neighbour", () => {
    expect(moveGameInOrder(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"])
    expect(moveGameInOrder(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"])
  })

  it("returns an unchanged copy at the boundaries or for unknown ids", () => {
    const input = ["a", "b"]
    expect(moveGameInOrder(input, "a", "up")).toEqual(["a", "b"])
    expect(moveGameInOrder(input, "b", "down")).toEqual(["a", "b"])
    expect(moveGameInOrder(input, "z", "up")).toEqual(["a", "b"])
    expect(moveGameInOrder(input, "a", "up")).not.toBe(input)
  })
})
