"use client"

import { useEffect, useState } from "react"

export const THEME_STORAGE_KEY = "cl-theme"
type Theme = "dark" | "light"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark")
  }, [])

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // 저장소를 쓸 수 없어도 현재 세션에서는 테마가 바뀐다.
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "light"}
      className={`inline-flex h-11 items-center gap-2 rounded-md border border-line-control bg-surface px-3 text-sm text-content transition-colors duration-fast hover:bg-surface-2 md:h-10 ${className}`}
    >
      <span aria-hidden="true">{theme === "light" ? "☀️" : "🌙"}</span>
      {theme === "light" ? "라이트 테마" : "다크 테마"}
    </button>
  )
}
