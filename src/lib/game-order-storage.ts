// Per-user "my games" display order and onboarding dismissal, kept in localStorage (no DB migration needed).

const ORDER_KEY_PREFIX = "chronoledger:game-order:"
const ONBOARDING_KEY_PREFIX = "chronoledger:game-onboarding-dismissed:"

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

function unique(ids: readonly string[]): string[] {
  return Array.from(new Set(ids))
}

export function loadGameOrder(userId: string | null | undefined): string[] {
  if (!userId) return []
  try {
    const raw = getStorage()?.getItem(`${ORDER_KEY_PREFIX}${userId}`)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return unique(parsed.filter((item): item is string => typeof item === "string"))
  } catch {
    return []
  }
}

export function saveGameOrder(userId: string | null | undefined, orderedGameIds: string[]): void {
  if (!userId) return
  try {
    getStorage()?.setItem(`${ORDER_KEY_PREFIX}${userId}`, JSON.stringify(unique(orderedGameIds)))
  } catch {
    // Storage may be full or blocked; the order then falls back to name sorting.
  }
}

/** Ordered ids first (by their index), the rest afterwards in Korean name order. Returns a new array. */
export function sortByGameOrder<T>(
  items: readonly T[],
  orderedGameIds: readonly string[],
  getId: (item: T) => string,
  getName: (item: T) => string,
): T[] {
  const indexById = new Map<string, number>()
  orderedGameIds.forEach((id, index) => {
    if (!indexById.has(id)) indexById.set(id, index)
  })
  return [...items].sort((a, b) => {
    const indexA = indexById.get(getId(a))
    const indexB = indexById.get(getId(b))
    if (indexA !== undefined && indexB !== undefined) return indexA - indexB
    if (indexA !== undefined) return -1
    if (indexB !== undefined) return 1
    return getName(a).localeCompare(getName(b), "ko")
  })
}

/** Swaps `gameId` with its neighbour; out-of-range or unknown ids return an unchanged copy. */
export function moveGameInOrder(currentOrderedIds: readonly string[], gameId: string, direction: "up" | "down"): string[] {
  const next = [...currentOrderedIds]
  const index = next.indexOf(gameId)
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Removes this user's order and onboarding-dismissed keys (logout / account deletion on a shared device). */
export function clearUserGameOrderStorage(userId: string | null | undefined): void {
  if (!userId) return
  try {
    const storage = getStorage()
    storage?.removeItem(`${ORDER_KEY_PREFIX}${userId}`)
    storage?.removeItem(`${ONBOARDING_KEY_PREFIX}${userId}`)
  } catch {
    // Blocked storage has nothing to clear.
  }
}

export function isGameOnboardingDismissed(userId: string | null | undefined): boolean {
  if (!userId) return false
  try {
    return getStorage()?.getItem(`${ONBOARDING_KEY_PREFIX}${userId}`) === "1"
  } catch {
    return false
  }
}

export function dismissGameOnboarding(userId: string | null | undefined): void {
  if (!userId) return
  try {
    getStorage()?.setItem(`${ONBOARDING_KEY_PREFIX}${userId}`, "1")
  } catch {
    // Without storage the modal may reappear on the next visit.
  }
}
