import { describe, expect, it } from "vitest"
import {
  DUPLICATE_IN_PRESET_MESSAGE,
  NOOP_DROP_ID,
  SIDEBAR_DROP_ID,
  applyCardOrder,
  applySlotChanges,
  cardId,
  emptyId,
  moveCard,
  nextPresetTitle,
  parseBoardId,
  resolveDrop,
  sideId,
  slotId,
  slotLimitMessage,
  sortPresets,
  type BoardPreset,
} from "./preset-board"

const preset = (id: string, characterIds: string[], sortOrder = 0, createdAt = "2026-11-01T00:00:00Z"): BoardPreset => ({
  id,
  game_id: "g",
  title: id,
  character_ids: characterIds,
  memo: null,
  sort_order: sortOrder,
  created_at: createdAt,
})

const A = preset("a", ["c1", "c2", "c3"], 1)
const B = preset("b", ["c4"], 2)
const FULL = preset("full", ["c5", "c6", "c7", "c8"], 3)
const presets = [A, B, FULL]

describe("parseBoardId", () => {
  it("parses every id kind and rejects unknown ids", () => {
    expect(parseBoardId(sideId("c1"))).toEqual({ type: "side", characterId: "c1" })
    expect(parseBoardId(slotId("a", "c1"))).toEqual({ type: "slot", presetId: "a", characterId: "c1" })
    expect(parseBoardId(cardId("a"))).toEqual({ type: "card", presetId: "a" })
    expect(parseBoardId(emptyId("a", 3))).toEqual({ type: "empty", presetId: "a" })
    expect(parseBoardId(SIDEBAR_DROP_ID)).toEqual({ type: "sidebar" })
    expect(parseBoardId("other:x")).toBeNull()
    expect(parseBoardId(7)).toBeNull()
    expect(parseBoardId(null)).toBeNull()
  })
})

describe("sortPresets / nextPresetTitle", () => {
  it("orders by sort_order, then created_at, then id", () => {
    const list = [preset("z", [], 1, "2026-11-02"), preset("y", [], 1, "2026-11-01"), preset("x", [], 0, "2026-11-03")]
    expect(sortPresets(list).map((item) => item.id)).toEqual(["x", "y", "z"])
  })

  it("numbers new titles after the first unused one", () => {
    expect(nextPresetTitle([])).toBe("새 프리셋")
    expect(nextPresetTitle(["새 프리셋"])).toBe("새 프리셋 2")
    expect(nextPresetTitle(["새 프리셋", "새 프리셋 2", "새 프리셋 4"])).toBe("새 프리셋 3")
  })
})

describe("resolveDrop", () => {
  it("adds a sidebar character before the slot it is dropped on", () => {
    expect(resolveDrop(sideId("c9"), slotId("a", "c2"), presets, 4)).toEqual({
      kind: "slots",
      activePresetId: "a",
      changes: [{ id: "a", expected: ["c1", "c2", "c3"], next: ["c1", "c9", "c2", "c3"] }],
    })
  })

  it("appends a sidebar character dropped on an empty slot or the card area", () => {
    const expected = { kind: "slots", activePresetId: "b", changes: [{ id: "b", expected: ["c4"], next: ["c4", "c9"] }] }
    expect(resolveDrop(sideId("c9"), emptyId("b", 1), presets, 4)).toEqual(expected)
    expect(resolveDrop(sideId("c9"), cardId("b"), presets, 4)).toEqual(expected)
  })

  it("rejects a sidebar character that is already in the preset or when the preset is full", () => {
    expect(resolveDrop(sideId("c1"), cardId("a"), presets, 4)).toEqual({ kind: "reject", message: DUPLICATE_IN_PRESET_MESSAGE })
    expect(resolveDrop(sideId("c9"), cardId("full"), presets, 4)).toEqual({ kind: "reject", message: slotLimitMessage(4) })
  })

  it("ignores a sidebar character dropped outside any preset", () => {
    expect(resolveDrop(sideId("c9"), null, presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(sideId("c9"), SIDEBAR_DROP_ID, presets, 4)).toEqual({ kind: "none" })
  })

  it("reorders slots inside one preset by insertion", () => {
    expect(resolveDrop(slotId("a", "c1"), slotId("a", "c3"), presets, 4)).toEqual({
      kind: "slots",
      activePresetId: "a",
      changes: [{ id: "a", expected: ["c1", "c2", "c3"], next: ["c2", "c3", "c1"] }],
    })
    expect(resolveDrop(slotId("a", "c3"), slotId("a", "c1"), presets, 4)).toMatchObject({
      changes: [{ next: ["c3", "c1", "c2"] }],
    })
  })

  it("moves a slot to the end when dropped on its own card area and does nothing on the same slot", () => {
    expect(resolveDrop(slotId("a", "c1"), cardId("a"), presets, 4)).toMatchObject({ changes: [{ next: ["c2", "c3", "c1"] }] })
    expect(resolveDrop(slotId("a", "c3"), cardId("a"), presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(slotId("a", "c2"), slotId("a", "c2"), presets, 4)).toEqual({ kind: "none" })
  })

  it("moves a character to another preset in one atomic two-preset change", () => {
    expect(resolveDrop(slotId("a", "c2"), slotId("b", "c4"), presets, 4)).toEqual({
      kind: "slots",
      activePresetId: "b",
      changes: [
        { id: "a", expected: ["c1", "c2", "c3"], next: ["c1", "c3"] },
        { id: "b", expected: ["c4"], next: ["c2", "c4"] },
      ],
    })
    expect(resolveDrop(slotId("a", "c2"), cardId("b"), presets, 4)).toMatchObject({ changes: [{}, { next: ["c4", "c2"] }] })
  })

  it("rejects a move into a preset that has the character or is full", () => {
    const withDuplicate = [A, preset("b", ["c2"])]
    expect(resolveDrop(slotId("a", "c2"), cardId("b"), withDuplicate, 4)).toEqual({ kind: "reject", message: DUPLICATE_IN_PRESET_MESSAGE })
    expect(resolveDrop(slotId("a", "c2"), cardId("full"), presets, 4)).toEqual({ kind: "reject", message: slotLimitMessage(4) })
  })

  it("removes a slot dropped on the sidebar or outside every card, even the last character", () => {
    expect(resolveDrop(slotId("a", "c2"), SIDEBAR_DROP_ID, presets, 4)).toMatchObject({ changes: [{ id: "a", next: ["c1", "c3"] }] })
    expect(resolveDrop(slotId("b", "c4"), null, presets, 4)).toMatchObject({ changes: [{ id: "b", expected: ["c4"], next: [] }] })
  })

  it("snaps back when a slot or sidebar character is dropped on the add-preset card", () => {
    expect(resolveDrop(slotId("a", "c1"), NOOP_DROP_ID, presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(sideId("c9"), NOOP_DROP_ID, presets, 4)).toEqual({ kind: "none" })
  })

  it("reorders cards and ignores slot targets for a card drag", () => {
    expect(resolveDrop(cardId("full"), cardId("a"), presets, 4)).toEqual({ kind: "cards", presetIds: ["full", "a", "b"] })
    expect(resolveDrop(cardId("a"), cardId("b"), presets, 4)).toEqual({ kind: "cards", presetIds: ["b", "a", "full"] })
    expect(resolveDrop(cardId("a"), slotId("b", "c4"), presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(cardId("a"), cardId("a"), presets, 4)).toEqual({ kind: "none" })
  })

  it("lets an over-limit preset reorder and give away characters but not receive new ones", () => {
    const over = preset("over", ["c1", "c2", "c3"])
    expect(resolveDrop(slotId("over", "c1"), slotId("over", "c3"), [over, B], 2)).toMatchObject({ kind: "slots" })
    expect(resolveDrop(slotId("over", "c1"), cardId("b"), [over, B], 2)).toMatchObject({ kind: "slots" })
    expect(resolveDrop(sideId("c9"), cardId("over"), [over, B], 2)).toEqual({ kind: "reject", message: slotLimitMessage(2) })
  })

  it("ignores unknown or stale ids", () => {
    expect(resolveDrop("bogus", cardId("a"), presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(slotId("gone", "c1"), cardId("a"), presets, 4)).toEqual({ kind: "none" })
    expect(resolveDrop(sideId("c9"), cardId("gone"), presets, 4)).toEqual({ kind: "none" })
  })
})

describe("moveCard / apply helpers", () => {
  it("moves a card one step and stops at the edges", () => {
    expect(moveCard(presets, "b", -1)).toEqual({ kind: "cards", presetIds: ["b", "a", "full"] })
    expect(moveCard(presets, "b", 1)).toEqual({ kind: "cards", presetIds: ["a", "full", "b"] })
    expect(moveCard(presets, "a", -1)).toEqual({ kind: "none" })
    expect(moveCard(presets, "full", 1)).toEqual({ kind: "none" })
  })

  it("applies slot changes and 1-based card order without touching other presets", () => {
    const changed = applySlotChanges(presets, [{ id: "b", expected: ["c4"], next: [] }])
    expect(changed[1].character_ids).toEqual([])
    expect(changed[0]).toBe(A)
    expect(applyCardOrder(presets, ["full", "a"]).map((item) => item.sort_order)).toEqual([2, 2, 1])
  })
})
