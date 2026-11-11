export interface VersionGroupable {
  id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  start_date: string
  end_date: string
  gameId?: string | null
}

export interface VersionParent {
  id: string
  title: string
}

export type VersionGroupEntry<T extends VersionGroupable> =
  | { kind: "version"; version: T; children: T[] }
  | { kind: "single"; item: T; parent?: VersionParent }

function isChildType(type: VersionGroupable["schedule_type"]): boolean {
  return type === "PICKUP" || type === "CONTENTS"
}

/**
 * Maps each PICKUP/CONTENTS schedule to the VERSION of the same game whose [start, end] contains its start date.
 * With overlapping versions the one that started latest wins. BROADCAST and games without a game id are never grouped.
 */
export function getVersionParents<T extends VersionGroupable>(items: readonly T[]): Map<string, VersionParent> {
  const parents = new Map<string, VersionParent>()
  const versions = items.filter((item) => item.schedule_type === "VERSION" && item.gameId)
  items.forEach((item) => {
    if (!isChildType(item.schedule_type) || !item.gameId) return
    let best: T | null = null
    versions.forEach((version) => {
      if (version.gameId !== item.gameId) return
      if (item.start_date < version.start_date || item.start_date > version.end_date) return
      if (!best || version.start_date > best.start_date) best = version
    })
    if (best) parents.set(item.id, { id: (best as T).id, title: (best as T).title })
  })
  return parents
}

/**
 * Splits already filtered/sorted `items` into version groups and single entries, keeping the input order
 * (a group sits where its version appears). A child is nested only when its parent version is also in `items`;
 * otherwise it stays single and carries its parent label. `lookup` is the wider list used to find parents.
 */
export function splitVersionGroups<T extends VersionGroupable>(
  items: readonly T[],
  lookup: readonly T[] = items,
): VersionGroupEntry<T>[] {
  const parents = getVersionParents(lookup)
  const presentIds = new Set(items.map((item) => item.id))
  const entries: VersionGroupEntry<T>[] = []
  const groupByVersionId = new Map<string, Extract<VersionGroupEntry<T>, { kind: "version" }>>()

  items.forEach((item) => {
    if (item.schedule_type !== "VERSION") return
    const group = { kind: "version" as const, version: item, children: [] as T[] }
    groupByVersionId.set(item.id, group)
  })

  items.forEach((item) => {
    if (item.schedule_type === "VERSION") {
      const group = groupByVersionId.get(item.id)
      if (group) entries.push(group)
      return
    }
    const parent = parents.get(item.id)
    if (parent && presentIds.has(parent.id)) {
      groupByVersionId.get(parent.id)?.children.push(item)
      return
    }
    entries.push({ kind: "single", item, parent })
  })
  return entries
}

export function countChildTypes(children: readonly VersionGroupable[]): { pickup: number; contents: number } {
  return {
    pickup: children.filter((c) => c.schedule_type === "PICKUP").length,
    contents: children.filter((c) => c.schedule_type === "CONTENTS").length,
  }
}

/** "픽업 n · 콘텐츠 n" with zero counts omitted; empty string when there are no children. */
export function formatChildSummary(children: readonly VersionGroupable[]): string {
  const { pickup, contents } = countChildTypes(children)
  return [pickup > 0 ? `픽업 ${pickup}` : "", contents > 0 ? `콘텐츠 ${contents}` : ""].filter(Boolean).join(" · ")
}
