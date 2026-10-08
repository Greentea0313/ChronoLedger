"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { downloadProfileAvatar, PROFILE_AVATAR_CHANGED_EVENT } from "@/lib/storage-upload"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export const TOPBAR_NAV_ITEMS = [
  { href: "/dashboard", label: "홈" },
  { href: "/dashboard/expenses", label: "소비" },
  { href: "/dashboard/calendar", label: "게임" },
] as const

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

// 이름과 Google 프로필 사진 기본값. 직접 업로드한 사진은 Topbar에서 Storage 값으로 우선 적용한다.
export function resolveProfile(user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  const meta = user?.user_metadata ?? {}
  const name =
    readString(meta.full_name) ??
    readString(meta.name) ??
    readString(user?.email?.split("@")[0]) ??
    "사용자"
  const avatarUrl = readString(meta.avatar_url) ?? readString(meta.picture)
  return { name, avatarUrl }
}

interface TopbarProps {
  onLogout: () => void
  isLoggingOut: boolean
  logoutError: string | null
}

const controlClass =
  "inline-flex min-h-[44px] items-center gap-1 rounded-[9px] px-3 text-sm transition-colors duration-fast md:min-h-10"

export function Topbar({ onLogout, isLoggingOut, logoutError }: TopbarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { name, avatarUrl: googleAvatarUrl } = resolveProfile(user)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const userId = user?.id
  const avatarUrl = customAvatarUrl ?? googleAvatarUrl

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let currentUrl: string | null = null

    const load = async () => {
      let nextUrl: string | null = null
      try {
        nextUrl = await downloadProfileAvatar(userId)
      } catch {
        nextUrl = null
      }
      if (cancelled) {
        if (nextUrl) URL.revokeObjectURL(nextUrl)
        return
      }
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      currentUrl = nextUrl
      setAvatarFailed(false)
      setCustomAvatarUrl(nextUrl)
    }

    void load()
    const handleChanged = () => void load()
    window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, handleChanged)
    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, handleChanged)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [userId])

  useEffect(() => {
    if (!menuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 w-full max-w-content flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 md:px-6 lg:px-8">
        <Link href="/dashboard" className="mr-2 text-2xl font-black tracking-tight text-primary md:mr-4">
          ChronoLedger
        </Link>

        <nav aria-label="주요 메뉴" className="order-3 flex w-full gap-1 md:order-none md:w-auto">
          {TOPBAR_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${controlClass} ${
                  active
                    ? "bg-surface-2 font-semibold text-content"
                    : "text-content-secondary hover:bg-surface-2 hover:text-content"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="rounded-[9px] bg-surface-2" />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`${name} 프로필 메뉴`}
              onClick={() => setMenuOpen((open) => !open)}
              className={`${controlClass} bg-surface-2 text-content-secondary hover:text-content`}
            >
              {avatarUrl && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[8rem] truncate">{name}</span> <span aria-hidden="true">▾</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-line bg-surface p-1 shadow-modal"
              >
                <Link
                  role="menuitem"
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center rounded-md px-3 text-sm text-content-secondary hover:bg-surface-2 hover:text-content"
                >
                  계정
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isLoggingOut}
                  onClick={() => {
                    setMenuOpen(false)
                    onLogout()
                  }}
                  className="flex min-h-[44px] w-full items-center rounded-md px-3 text-left text-sm text-content-secondary hover:bg-surface-2 hover:text-content disabled:opacity-50"
                >
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {logoutError && (
        <p role="alert" className="border-t border-line px-4 py-2 text-sm text-danger">
          {logoutError}
        </p>
      )}
    </header>
  )
}
