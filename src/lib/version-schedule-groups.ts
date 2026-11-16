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
