"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Subscribes to a CSS media query. Returns false on the server / first hydration render and whenever
 * `matchMedia` is unavailable (older WebViews, jsdom), so callers start from the mobile layout.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {}
      const mql = window.matchMedia(query)
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
      }
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    },
    [query],
  )
  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    [query],
  )
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
