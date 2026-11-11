import { describe, expect, it } from "vitest"
import { formatChildSummary, getVersionParents, splitVersionGroups, type VersionGroupable } from "./version-schedule-groups"

function item(id: string, type: VersionGroupable["schedule_type"], start: string, end: string, gameId: string | null = "g1"): VersionGroupable {
  return { id, title: `T-${id}`, schedule_type: type, start_date: start, end_date: end, gameId }
}

const v32 = item("v32", "VERSION", "2026-11-01", "2026-11-21")
const v33 = item("v33", "VERSION", "2026-11-15", "2026-12-05")

describe("getVersionParents", () => {
  it("includes both boundary days of the version period", () => {
    const parents = getVersionParents([v32, item("a", "PICKUP", "2026-11-01", "2026-11-05"), item("b", "CONTENTS", "2026-11-21", "2026-11-30")])
    expect(parents.get("a")).toEqual({ id: "v32", title: "T-v32" })
    expect(parents.get("b")).toEqual({ id: "v32", title: "T-v32" })
  })

  it("leaves children outside every version period ungrouped", () => {
    expect(getVersionParents([v32, item("a", "PICKUP", "2026-10-31", "2026-11-05")]).size).toBe(0)
  })

  it("picks the latest-starting version when periods overlap", () => {
    const parents = getVersionParents([v32, v33, item("a", "PICKUP", "2026-11-16", "2026-11-20")])
    expect(parents.get("a")?.id).toBe("v33")
  })

  it("never groups across games, broadcasts, other versions or game-less schedules", () => {
    const parents = getVersionParents([
      v32,
      item("other", "PICKUP", "2026-11-02", "2026-11-05", "g2"),
      item("bc", "BROADCAST", "2026-11-02", "2026-11-02"),
      item("v2", "VERSION", "2026-11-02", "2026-11-10"),
      item("none", "PICKUP", "2026-11-02", "2026-11-05", null),
    ])
    expect(parents.size).toBe(0)
  })

  it("ignores games without a version", () => {
    expect(getVersionParents([item("a", "PICKUP", "2026-11-02", "2026-11-05")]).size).toBe(0)
  })
})

describe("splitVersionGroups", () => {
  it("nests children under their version in input order and keeps other entries in place", () => {
    const a = item("a", "PICKUP", "2026-11-02", "2026-11-05")
    const bc = item("bc", "BROADCAST", "2026-11-03", "2026-11-03")
    const c = item("c", "CONTENTS", "2026-11-04", "2026-11-08")
    const entries = splitVersionGroups([v32, a, bc, c])
    expect(entries.map((e) => e.kind)).toEqual(["version", "single"])
    expect(entries[0]).toMatchObject({ kind: "version", version: v32, children: [a, c] })
    expect(entries[1]).toMatchObject({ kind: "single", item: bc })
  })

  it("keeps a child single with its parent label when the version is not in the visible list", () => {
    const a = item("a", "PICKUP", "2026-11-02", "2026-11-05")
    const entries = splitVersionGroups([a], [v32, a])
    expect(entries).toEqual([{ kind: "single", item: a, parent: { id: "v32", title: "T-v32" } }])
  })

  it("shows a version without children as an empty group", () => {
    expect(splitVersionGroups([v32])).toEqual([{ kind: "version", version: v32, children: [] }])
  })
})

describe("formatChildSummary", () => {
  it("lists non-zero counts only", () => {
    const p = item("p", "PICKUP", "2026-11-02", "2026-11-05")
    const c = item("c", "CONTENTS", "2026-11-02", "2026-11-05")
    expect(formatChildSummary([p, p, c])).toBe("픽업 2 · 콘텐츠 1")
    expect(formatChildSummary([c])).toBe("콘텐츠 1")
    expect(formatChildSummary([])).toBe("")
  })
})
