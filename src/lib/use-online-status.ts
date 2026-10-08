"use client"

import { useSyncExternalStore } from "react"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/** 서버 렌더링과 hydration에서는 온라인으로 간주해 불일치를 피한다. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
