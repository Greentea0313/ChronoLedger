"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { isTauri } from "@tauri-apps/api/core"
import { Bell, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { isOffline } from "@/lib/offline-guard"
import { notifyNewTauriNotifications } from "@/lib/tauri-notifications"
import { cn } from "@/lib/utils"

const NOTIFICATION_LIMIT = 30
const TAURI_POLL_INTERVAL_MS = 60_000

export interface NotificationRow {
  id: string
  title: string
  body: string
  link_path: string
  read_at: string | null
  created_at: string
}

/** `notifications` not migrated yet (R84): behave as an empty inbox instead of failing the top bar. */
function isMissingNotificationsTable(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42P01" || code === "PGRST205"
}

/** Only same-app relative paths are followed (`/x`, never `//host` or an absolute URL). */
export function isSafeLinkPath(path: string): boolean {
  return /^\/(?!\/)/.test(path)
}

const KST_PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** Shown in KST like the rest of the app, regardless of the device time zone. */
export function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = KST_PARTS_FORMAT.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  return `${part("month")}/${part("day")} ${part("hour")}:${part("minute")}`
}

/** In-app inbox: bell with an unread badge and a popover of the latest 30 notifications of the signed-in user. */
export function NotificationBell({ userId, className }: { userId: string; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [popoverTop, setPopoverTop] = useState(0)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase
        .from("notifications")
        .select("id, title, body, link_path, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATION_LIMIT)
      if (loadError) {
        if (!isMissingNotificationsTable(loadError)) console.error("알림을 불러오지 못했습니다:", loadError)
        setItems([])
        return
      }
      const nextItems = (data ?? []) as NotificationRow[]
      setItems(nextItems)
      void notifyNewTauriNotifications(userId, nextItems)
    } catch (cause) {
      console.error("알림을 불러오지 못했습니다:", cause)
      setItems([])
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  // In Tauri desktop, refresh on window focus and periodically so running sessions surface new OS notifications.
  useEffect(() => {
    if (!isTauri()) return
    const handleFocus = () => void load()
    window.addEventListener("focus", handleFocus)
    const timerId = window.setInterval(() => {
      if (!isOffline()) void load()
    }, TAURI_POLL_INTERVAL_MS)
    return () => {
      window.removeEventListener("focus", handleFocus)
      window.clearInterval(timerId)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const unreadCount = items.filter((item) => item.read_at === null).length

  const markRead = async (ids: string[] | null): Promise<boolean> => {
    if (isOffline()) {
      setError("오프라인 상태에서는 읽음 처리를 할 수 없습니다.")
      return false
    }
    try {
      const { error: rpcError } = await supabase.rpc("mark_notifications_read", { p_notification_ids: ids })
      if (rpcError) {
        setError("읽음 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.")
        return false
      }
      const now = new Date().toISOString()
      setItems((prev) => prev.map((item) => (ids === null || ids.includes(item.id) ? { ...item, read_at: item.read_at ?? now } : item)))
      return true
    } catch {
      setError("읽음 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      return false
    }
  }

  const deleteNotifications = async (ids: string[] | null): Promise<boolean> => {
    setError(null)
    if (isOffline()) {
      setError("오프라인 상태에서는 알림을 삭제할 수 없습니다.")
      return false
    }
    try {
      const { error: rpcError } = await supabase.rpc("delete_notifications", { p_notification_ids: ids })
      if (rpcError) {
        setError("알림 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.")
        return false
      }
      setItems((prev) => (ids === null ? [] : prev.filter((item) => !ids.includes(item.id))))
      return true
    } catch {
      setError("알림 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      return false
    }
  }

  const updatePopoverTop = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) setPopoverTop(Math.max(8, Math.round(rect.bottom) + 4))
  }, [])

  const handleToggle = () => {
    setError(null)
    if (!open) {
      updatePopoverTop()
      void load()
    }
    setOpen((prev) => !prev)
  }

  const handleSelect = async (item: NotificationRow) => {
    setError(null)
    if (item.read_at === null) await markRead([item.id])
    if (isSafeLinkPath(item.link_path)) {
      setOpen(false)
      router.push(item.link_path)
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}건 읽지 않음` : "알림"}
        onClick={handleToggle}
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[9px] bg-surface-2 text-content-secondary transition-colors duration-fast hover:text-content md:min-h-10 md:min-w-10"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-primary-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="알림함"
          style={{ "--notification-top": `${popoverTop}px` } as CSSProperties}
          className="fixed inset-x-4 top-[var(--notification-top)] z-50 rounded-md border border-line bg-surface shadow-modal sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[min(22rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold text-content">알림</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={unreadCount === 0}
                onClick={() => void markRead(null)}
                className="rounded-md px-2 py-1 text-xs text-primary hover:bg-surface-2 disabled:opacity-40"
              >
                모두 읽음
              </button>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => void deleteNotifications(null)}
                className="rounded-md px-2 py-1 text-xs text-danger hover:bg-surface-2 disabled:opacity-40"
              >
                전체 삭제
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="border-b border-line px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-content-muted">새 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-stretch gap-1 pr-1.5 hover:bg-surface-2",
                    item.read_at === null && "bg-primary/5",
                  )}
                >
                  <button
                    type="button"
                    data-testid="notification-item"
                    data-unread={item.read_at === null ? "true" : "false"}
                    onClick={() => void handleSelect(item)}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 pl-3 pr-1 text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      {item.read_at === null && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      <span className={cn("truncate text-sm", item.read_at === null ? "font-semibold text-content" : "text-content-secondary")}>
                        {item.title}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-content-muted">{formatCreatedAt(item.created_at)}</span>
                    </span>
                    <span className="line-clamp-2 text-xs text-content-secondary">{item.body}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="notification-delete-button"
                    aria-label={`${item.title} 알림 삭제`}
                    onClick={() => void deleteNotifications([item.id])}
                    className="my-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-content-muted transition-colors duration-fast hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
