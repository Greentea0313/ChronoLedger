import { isTauri } from "@tauri-apps/api/core"
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification"

export interface TauriNotificationCandidate {
  id: string
  title: string
  body: string
  read_at: string | null
}

const SEEN_IDS_KEY_PREFIX = "chronoledger:tauri-notified-ids:"
const MAX_STORED_IDS = 100
const DEFAULT_NOTIFICATION_TITLE = "ChronoLedger"
const pendingByUser = new Map<string, Promise<number>>()

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

function loadSeenRecord(userId: string): { initialized: boolean; ids: Set<string> } {
  const storage = getStorage()
  if (!storage) return { initialized: false, ids: new Set() }
  try {
    const raw = storage.getItem(`${SEEN_IDS_KEY_PREFIX}${userId}`)
    if (raw === null) return { initialized: false, ids: new Set() }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { initialized: true, ids: new Set() }
    return {
      initialized: true,
      ids: new Set(parsed.filter((item): item is string => typeof item === "string")),
    }
  } catch {
    return { initialized: false, ids: new Set() }
  }
}

function saveSeenIds(userId: string, ids: Iterable<string>): void {
  const storage = getStorage()
  if (!storage) return
  try {
    const list = Array.from(ids).slice(-MAX_STORED_IDS)
    storage.setItem(`${SEEN_IDS_KEY_PREFIX}${userId}`, JSON.stringify(list))
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

async function ensurePermission(): Promise<boolean> {
  if (await isPermissionGranted()) return true
  const permission = await requestPermission()
  return permission === "granted"
}

async function runNotifyNewTauriNotifications(
  userId: string,
  items: readonly TauriNotificationCandidate[],
): Promise<number> {
  try {
    const { initialized, ids: seenIds } = loadSeenRecord(userId)
    if (!initialized) {
      saveSeenIds(userId, items.map((item) => item.id))
      return 0
    }
    if (items.length === 0) return 0

    const freshUnread = items.filter((item) => item.read_at === null && !seenIds.has(item.id))
    for (const item of items) seenIds.add(item.id)
    saveSeenIds(userId, seenIds)
    if (freshUnread.length === 0) return 0

    const granted = await ensurePermission()
    if (!granted) return 0

    let sent = 0
    for (const item of freshUnread) {
      const title = item.title.trim() || DEFAULT_NOTIFICATION_TITLE
      const body = item.body.trim()
      sendNotification(body ? { title, body } : { title })
      sent += 1
    }
    return sent
  } catch {
    return 0
  }
}

/**
 * In Tauri desktop, fires native OS notifications for newly arrived unread rows while the app is running.
 * The first load seeds the seen set so old unread items do not burst on launch. No-op in web browsers.
 */
export function notifyNewTauriNotifications(
  userId: string,
  items: readonly TauriNotificationCandidate[],
): Promise<number> {
  if (!userId || !isTauri()) return Promise.resolve(0)
  const previous = pendingByUser.get(userId) ?? Promise.resolve(0)
  const next = previous.catch(() => 0).then(() => runNotifyNewTauriNotifications(userId, items))
  pendingByUser.set(userId, next)
  return next.finally(() => {
    if (pendingByUser.get(userId) === next) pendingByUser.delete(userId)
  })
}
