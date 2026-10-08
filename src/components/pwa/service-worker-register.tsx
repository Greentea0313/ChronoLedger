"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

export async function clearAppCaches() {
  if (typeof caches === "undefined") return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

export function ServiceWorkerRegister() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    void navigator.serviceWorker
      .register(`/sw.js?supabaseOrigin=${encodeURIComponent(supabaseOrigin)}`)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (isLoading || user) return
    void clearAppCaches()
  }, [isLoading, user])

  return null
}
