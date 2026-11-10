import { describe, expect, it } from "vitest"
import {
  EMPTY_CHARACTER_FILTERS,
  OTHER_FILTER_VALUE,
  addCharacterToPreset,
  canAddToPreset,
  filterCharacters,
  getNameInitial,
  getPresetSlotCount,
  hasOtherAxisValue,
  hasOtherRarity,
  isPresetOverLimit,
  isCharacterSupported,
  isCharacterTemplateActive,
  moveCharacterInPreset,
  moveCharacterToSlot,
  placeCharacterInSlot,
  assignAxisKey,
  splitCommaList,
  validateClassificationTemplate,
  normalizeClassificationSchema,
  normalizeMaxBreakthrough,
  normalizeMaxPresetSlots,
  sortCharactersFavoriteFirst,
  removeCharacterFromPreset,
  validatePresetInput,
  type CharacterFilters,
  type ClassificationSchema,
  type GameCharacter,
} from "./character-utils"

const schema: ClassificationSchema = {
  rarities: ["5★", "4★"],
  axes: [
    { key: "element", label: "속성", options: ["화염", "얼음"] },
    { key: "role", label: "직업", options: ["딜러", "서포터"] },
  ],
}

function makeCharacter(id: string, name: string, rarity: string | null, attributes: Record<string, string> = {}): GameCharacter {
  return { id, game_id: "game-1", name, rarity, attributes, default_icon_url: null }
}

const characters = [
  makeCharacter("c1", "아케론", "5★", { element: "얼음", role: "딜러" }),
  makeCharacter("c2", "칼리", "4★", { element: "화염", role: "서포터" }),
  makeCharacter("c3", "옛날캐릭터", "3★", { element: "바람", role: "딜러" }),
  makeCharacter("c4", "미분류", null, {}),
]
const owned = new Set(["c1", "c3"])
const isOwned = (id: string) => owned.has(id)

function run(filters: Partial<CharacterFilters>): string[] {
  return filterCharacters(characters, { ...EMPTY_CHARACTER_FILTERS, ...filters }, schema, isOwned).map((c) => c.id)
}

describe("normalizeClassificationSchema", () => {
  it("returns an empty schema for malformed values", () => {
    expect(normalizeClassificationSchema(null)).toEqual({ character_label: "캐릭터", rarities: [], axes: [] })
    expect(normalizeClassificationSchema([])).toEqual({ character_label: "캐릭터", rarities: [], axes: [] })
    expect(normalizeClassificationSchema("x")).toEqual({ character_label: "캐릭터", rarities: [], axes: [] })
  })

  it("keeps valid parts and drops invalid axes and options", () => {
    expect(
      normalizeClassificationSchema({
        rarities: ["5★", 4, null],
        axes: [{ key: "e", label: "속성", options: ["a", 1] }, { key: 1 }, "bad"],
      }),
    ).toEqual({ character_label: "캐릭터", rarities: ["5★"], axes: [{ key: "e", label: "속성", options: ["a"] }] })
  })
})

describe("normalizeMaxPresetSlots", () => {
  it("defaults to 4 for missing or out-of-range values", () => {
    expect(normalizeMaxPresetSlots(undefined)).toBe(4)
    expect(normalizeMaxPresetSlots(null)).toBe(4)
    expect(normalizeMaxPresetSlots(0)).toBe(4)
    expect(normalizeMaxPresetSlots(13)).toBe(4)
    expect(normalizeMaxPresetSlots(6)).toBe(6)
  })
})

describe("getNameInitial", () => {
  it("returns the first character or a placeholder", () => {
    expect(getNameInitial("아케론")).toBe("아")
    expect(getNameInitial("kali")).toBe("K")
    expect(getNameInitial("  ")).toBe("?")
  })
})

describe("filterCharacters", () => {
  it("filters by ownership", () => {
    expect(run({ ownership: "owned" })).toEqual(["c1", "c3"])
    expect(run({ ownership: "unowned" })).toEqual(["c2", "c4"])
  })

  it("filters by rarity and groups unmapped rarities under 기타", () => {
    expect(run({ rarity: "5★" })).toEqual(["c1"])
    expect(run({ rarity: OTHER_FILTER_VALUE })).toEqual(["c3", "c4"])
  })

  it("filters by classification axis and groups unmapped options under 기타", () => {
    expect(run({ axes: { element: "화염" } })).toEqual(["c2"])
    expect(run({ axes: { element: OTHER_FILTER_VALUE } })).toEqual(["c3", "c4"])
  })

  it("combines filters and searches by name", () => {
    expect(run({ ownership: "owned", axes: { role: "딜러" } })).toEqual(["c1", "c3"])
    expect(run({ query: "  칼리 " })).toEqual(["c2"])
    expect(run({ query: "없는이름" })).toEqual([])
  })
})

describe("기타 chip visibility", () => {
  it("shows 기타 only when unmapped values exist", () => {
    expect(hasOtherRarity(characters, schema)).toBe(true)
    expect(hasOtherRarity([characters[0], characters[1]], schema)).toBe(false)
    expect(hasOtherAxisValue(characters, schema.axes[0])).toBe(true)
    expect(hasOtherAxisValue([characters[0], characters[1]], schema.axes[0])).toBe(false)
  })

  it("does not show 기타 when the game defines no rarities", () => {
    expect(hasOtherRarity(characters, { rarities: [], axes: [] })).toBe(false)
  })
})

describe("preset helpers", () => {
  it("renders at least max slots and never fewer than saved characters", () => {
    expect(getPresetSlotCount(4, ["a"])).toBe(4)
    expect(getPresetSlotCount(4, ["a", "b", "c", "d", "e", "f"])).toBe(6)
    expect(isPresetOverLimit(4, ["a", "b", "c", "d", "e"])).toBe(true)
    expect(isPresetOverLimit(4, ["a", "b", "c", "d"])).toBe(false)
  })

  it("adds characters without duplicates and not above the slot ceiling", () => {
    expect(addCharacterToPreset(["a"], "b", 2)).toEqual(["a", "b"])
    expect(addCharacterToPreset(["a"], "a", 2)).toEqual(["a"])
    expect(addCharacterToPreset(["a", "b"], "c", 2)).toEqual(["a", "b"])
    expect(canAddToPreset(2, ["a", "b"])).toBe(false)
  })

  it("blocks adding to an over-limit preset until it is below the ceiling", () => {
    const over = ["a", "b", "c", "d", "e"]
    expect(addCharacterToPreset(over, "f", 4)).toEqual(over)
    expect(canAddToPreset(4, removeCharacterFromPreset(over, "e"))).toBe(false)
    expect(canAddToPreset(4, removeCharacterFromPreset(removeCharacterFromPreset(over, "e"), "d"))).toBe(true)
  })

  it("moves slots within bounds without mutating the input", () => {
    const ids = ["a", "b", "c"]
    expect(moveCharacterInPreset(ids, 0, 1)).toEqual(["b", "a", "c"])
    expect(moveCharacterInPreset(ids, 2, -1)).toEqual(["a", "c", "b"])
    expect(moveCharacterInPreset(ids, 0, -1)).toEqual(["a", "b", "c"])
    expect(moveCharacterInPreset(ids, 2, 1)).toEqual(["a", "b", "c"])
    expect(ids).toEqual(["a", "b", "c"])
  })

  it("validates title, memo, count and duplicates", () => {
    expect(validatePresetInput({ title: "  ", memo: "", characterIds: ["a"] })).toContain("제목")
    expect(validatePresetInput({ title: "x".repeat(81), memo: "", characterIds: ["a"] })).toContain("제목")
    expect(validatePresetInput({ title: "ok", memo: "m".repeat(301), characterIds: ["a"] })).toContain("메모")
    expect(validatePresetInput({ title: "ok", memo: "", characterIds: [] })).toContain("1명 이상")
    expect(validatePresetInput({ title: "ok", memo: "", characterIds: ["a", "a"] })).toContain("중복")
    expect(validatePresetInput({ title: "ok", memo: "", characterIds: Array.from({ length: 13 }, (_, i) => `c${i}`) })).toContain("최대 12명")
    expect(validatePresetInput({ title: "ok", memo: "m".repeat(300), characterIds: ["a", "b"] })).toBeNull()
  })
})

describe("breakthrough and favorites", () => {
  it("normalizes max_breakthrough to 0..12 and defaults to 6", () => {
    expect(normalizeMaxBreakthrough(0)).toBe(0)
    expect(normalizeMaxBreakthrough(12)).toBe(12)
    expect(normalizeMaxBreakthrough(13)).toBe(6)
    expect(normalizeMaxBreakthrough(-1)).toBe(6)
    expect(normalizeMaxBreakthrough(2.5)).toBe(6)
    expect(normalizeMaxBreakthrough(undefined)).toBe(6)
  })

  it("puts favorites first and sorts by name within each group without mutating the input", () => {
    const input = [makeCharacter("a", "다", null), makeCharacter("b", "가", null), makeCharacter("c", "나", null), makeCharacter("d", "라", null)]
    const favorites = new Set(["c", "d"])
    const sorted = sortCharactersFavoriteFirst(input, (id) => favorites.has(id))

    expect(sorted.map((item) => item.name)).toEqual(["나", "라", "가", "다"])
    expect(input.map((item) => item.name)).toEqual(["다", "가", "나", "라"])
  })
})


describe("R52 character template helpers", () => {
  it("normalizes the character label and caps visible axes at two", () => {
    expect(normalizeClassificationSchema({ character_label: "  요원 ", rarities: [], axes: [] }).character_label).toBe("요원")
    expect(normalizeClassificationSchema({ character_label: "  ", rarities: [], axes: [] }).character_label).toBe("캐릭터")
    expect(normalizeClassificationSchema({ rarities: [], axes: [schema.axes[0], schema.axes[1], { key: "third", label: "third", options: ["x"] }] }).axes).toHaveLength(2)
  })

  it("treats a game with rarities or existing characters as template-active", () => {
    expect(isCharacterTemplateActive({ classification_schema: { rarities: ["5★"], axes: [] } }, 0)).toBe(true)
    expect(isCharacterTemplateActive({ classification_schema: { rarities: [], axes: [] } }, 2)).toBe(true)
    expect(isCharacterTemplateActive({ classification_schema: { rarities: [], axes: [] } }, 0)).toBe(false)
    expect(isCharacterTemplateActive(null, 1)).toBe(true)
  })

  it("supports games with at least one character", () => {
    expect(isCharacterSupported(1)).toBe(true)
    expect(isCharacterSupported(0)).toBe(false)
  })
})

describe("splitCommaList", () => {
  it("trims items, drops blanks and keeps duplicates for validation", () => {
    expect(splitCommaList(" 5★ , ,4★,,5★ ")).toEqual(["5★", "4★", "5★"])
    expect(splitCommaList("")).toEqual([])
  })
})

describe("assignAxisKey", () => {
  it("hands out class1 then class2 and reuses a freed key instead of repeating one", () => {
    expect(assignAxisKey([])).toBe("class1")
    expect(assignAxisKey(["class1"])).toBe("class2")
    // class1 was deleted while class2 stayed: the next new axis must not collide with class2.
    expect(assignAxisKey(["class2"])).toBe("class1")
    expect(assignAxisKey(["element"])).toBe("class1")
  })

  it("keeps generating unique keys when both defaults are taken", () => {
    expect(assignAxisKey(["class1", "class2"])).toBe("class3")
    expect(assignAxisKey(["class1", "class2", "class3"])).toBe("class4")
  })
})

describe("validateClassificationTemplate", () => {
  const axis = (overrides: Partial<{ key: string; label: string; options: string[] }> = {}) => ({
    key: "class1",
    label: "속성",
    options: ["불", "물"],
    ...overrides,
  })
  const valid = { characterLabel: "공명자", rarities: ["5성", "4성"], axes: [axis(), axis({ key: "class2", label: "무기", options: ["검"] })] }

  it("accepts a valid template and an empty one when ranks are not required", () => {
    expect(validateClassificationTemplate(valid, { requireRarities: true })).toBeNull()
    expect(validateClassificationTemplate({ characterLabel: "", rarities: [], axes: [] })).toBeNull()
  })

  it("requires at least one rank only in the template flow", () => {
    const noRanks = { ...valid, rarities: [] }
    expect(validateClassificationTemplate(noRanks, { requireRarities: true })).toBe("등급 목록을 1개 이상 입력해 주세요.")
    expect(validateClassificationTemplate(noRanks)).toBeNull()
  })

  it("enforces label, rank count/length and rank duplicates", () => {
    expect(validateClassificationTemplate({ ...valid, characterLabel: "가".repeat(21) })).toContain("20자 이내")
    expect(validateClassificationTemplate({ ...valid, rarities: Array.from({ length: 11 }, (_, i) => `R${i}`) })).toContain("최대 10개")
    expect(validateClassificationTemplate({ ...valid, rarities: ["가".repeat(21)] })).toContain("각 20자 이내")
    expect(validateClassificationTemplate({ ...valid, rarities: ["5성", "4성", "5성"] })).toBe("등급 '5성'이(가) 중복되었습니다.")
    expect(validateClassificationTemplate({ ...valid, rarities: Array.from({ length: 10 }, (_, i) => `R${i}`) })).toBeNull()
  })

  it("limits axes to two with a 1~30 character name", () => {
    expect(validateClassificationTemplate({ ...valid, axes: [axis(), axis({ key: "class2" }), axis({ key: "class3" })] })).toContain("최대 2개")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ label: " " })] })).toBe("분류 기준 1의 이름을 1~30자로 입력해 주세요.")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ label: "가".repeat(31) })] })).toContain("1~30자")
  })

  it("validates option count (1~20), length (<=30) and duplicates per axis", () => {
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ options: [] })] })).toBe("분류 기준 1(속성)의 선택지를 1개 이상 입력해 주세요.")
    const twentyOne = Array.from({ length: 21 }, (_, i) => `옵션${i}`)
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ options: twentyOne })] })).toContain("최대 20개")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ options: twentyOne.slice(0, 20) })] })).toBeNull()
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ options: ["가".repeat(31)] })] })).toContain("각 30자 이내")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ options: ["불", "물", "불"] })] })).toBe("분류 기준 1(속성)의 선택지 '불'이(가) 중복되었습니다.")
    expect(validateClassificationTemplate({ ...valid, axes: [axis(), axis({ key: "class2", label: "무기", options: ["검", "검"] })] })).toContain("분류 기준 2(무기)")
  })

  it("rejects invalid or duplicated internal axis keys with guidance to recreate the axis", () => {
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ key: "Bad Key" })] })).toContain("내부 키가 올바르지 않거나 중복")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ key: "x".repeat(25) })] })).toContain("내부 키")
    expect(validateClassificationTemplate({ ...valid, axes: [axis(), axis({ label: "무기" })] })).toContain("분류 기준 2")
    expect(validateClassificationTemplate({ ...valid, axes: [axis({ key: "element" })] })).toBeNull()
  })
})

describe("placeCharacterInSlot", () => {
  it("appends to an empty slot and ignores a duplicate-free overflow at the ceiling", () => {
    expect(placeCharacterInSlot(["a"], 1, "b", 3)).toEqual(["a", "b"])
    expect(placeCharacterInSlot(["a"], 2, "b", 3)).toEqual(["a", "b"])
    expect(placeCharacterInSlot([], 0, "a", 3)).toEqual(["a"])
    expect(placeCharacterInSlot(["a", "b", "c"], 3, "d", 3)).toEqual(["a", "b", "c"])
  })

  it("moves an already placed character to the end when dropped on an empty slot", () => {
    expect(placeCharacterInSlot(["a", "b"], 2, "a", 3)).toEqual(["b", "a"])
    expect(placeCharacterInSlot(["a", "b", "c"], 3, "a", 3)).toEqual(["b", "c", "a"])
  })

  it("replaces the occupant of a filled slot, also when the preset is full", () => {
    expect(placeCharacterInSlot(["a", "b"], 0, "x", 3)).toEqual(["x", "b"])
    expect(placeCharacterInSlot(["a", "b", "c"], 1, "x", 3)).toEqual(["a", "x", "c"])
  })

  it("swaps two slots when the character is already placed elsewhere", () => {
    expect(placeCharacterInSlot(["a", "b", "c"], 0, "c", 3)).toEqual(["c", "b", "a"])
    expect(placeCharacterInSlot(["a", "b"], 1, "a", 3)).toEqual(["b", "a"])
  })

  it("is a no-op for the same slot and invalid indexes, and never mutates the input", () => {
    const ids = ["a", "b"]
    expect(placeCharacterInSlot(ids, 0, "a", 3)).toEqual(["a", "b"])
    expect(placeCharacterInSlot(ids, -1, "x", 3)).toEqual(["a", "b"])
    placeCharacterInSlot(ids, 0, "b", 3)
    expect(ids).toEqual(["a", "b"])
  })

  it("lets an over-limit preset replace and swap but never grow", () => {
    const over = ["a", "b", "c", "d"]
    expect(placeCharacterInSlot(over, 4, "x", 3)).toEqual(over)
    expect(placeCharacterInSlot(over, 1, "x", 3)).toEqual(["a", "x", "c", "d"])
    expect(placeCharacterInSlot(over, 0, "d", 3)).toEqual(["d", "b", "c", "a"])
    expect(placeCharacterInSlot(over, 4, "a", 3)).toEqual(["b", "c", "d", "a"])
  })
})

describe("moveCharacterToSlot", () => {
  it("moves a slot to another position", () => {
    expect(moveCharacterToSlot(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
    expect(moveCharacterToSlot(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
  })

  it("treats a target past the last filled slot as the end", () => {
    expect(moveCharacterToSlot(["a", "b"], 0, 3)).toEqual(["b", "a"])
    expect(moveCharacterToSlot(["a", "b"], 1, 5)).toEqual(["a", "b"])
  })

  it("ignores invalid sources and identical positions without mutating the input", () => {
    const ids = ["a", "b"]
    expect(moveCharacterToSlot(ids, 2, 0)).toEqual(["a", "b"])
    expect(moveCharacterToSlot(ids, -1, 0)).toEqual(["a", "b"])
    expect(moveCharacterToSlot(ids, 1, 1)).toEqual(["a", "b"])
    expect(moveCharacterToSlot(ids, 0, -4)).toEqual(["a", "b"])
    moveCharacterToSlot(ids, 0, 1)
    expect(ids).toEqual(["a", "b"])
  })
})
