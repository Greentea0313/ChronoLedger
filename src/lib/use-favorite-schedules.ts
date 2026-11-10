"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"

const SAVE_ERROR_MESSAGE = "관심 일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."

/** `user_favorite_schedules` not migrated yet (R35): behave as an empty favourite set instead of failing the page. */
function isMissingFavoriteTable(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42P01" || code === "PGRST205"
}

interface UseFavoriteSchedulesOptions {
  /** Called with a message when a toggle fails (or is blocked offline) and with `null` when a new toggle starts. */
  onError?: (message: string | null) => void
}

/**
 * Favourite schedules of the signed-in user (RLS limits rows to the owner): loading, optimistic toggle with rollback,
 * the offline guard and a per-schedule in-flight guard so a second click during a pending write is ignored.
 */
export function useFavoriteSchedules(userId: string | undefined, { onError }: UseFavoriteSchedulesOptions = {}) {
  const [favoriteScheduleIds, setFavoriteScheduleIds] = useState<ReadonlySet<string>>(() => new Set())
  // Mirrors the state so rapid toggles read the latest value instead of a stale render closure.
  const favoritesRef = useRef<ReadonlySet<string>>(favoriteScheduleIds)
  const inFlightIdsRef = useRef<Set<string>>(new Set())
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const replaceFavorites = useCallback((next: ReadonlySet<string>) => {
    favoritesRef.current = next
    setFavoriteScheduleIds(next)
  }, [])

  useEffect(() => {
    inFlightIdsRef.current = new Set()
    if (!userId) {
      replaceFavorites(new Set())
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase.from("user_favorite_schedules").select("schedule_id")
        if (cancelled) return
        if (error) {
          if (!isMissingFavoriteTable(error)) console.error("관심 일정을 불러오지 못했습니다:", error)
          replaceFavorites(new Set())
          return
        }
        replaceFavorites(new Set((data ?? []).map((row: { schedule_id: string }) => row.schedule_id)))
      } catch (cause) {
        if (!cancelled) {
          console.error("관심 일정을 불러오지 못했습니다:", cause)
          replaceFavorites(new Set())
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [replaceFavorites, userId])

  const toggleFavorite = useCallback(
    async (scheduleId: string) => {
      if (!userId) return
      // A write for this schedule is still pending: ignore the click instead of racing a second request.
      if (inFlightIdsRef.current.has(scheduleId)) return
      if (isOffline()) {
        onErrorRef.current?.(OFFLINE_WRITE_MESSAGE)
        return
      }
      const wasFavorite = favoritesRef.current.has(scheduleId)
      const applyLocal = (favorite: boolean) => {
        const next = new Set(favoritesRef.current)
        if (favorite) next.add(scheduleId)
        else next.delete(scheduleId)
        replaceFavorites(next)
      }
      inFlightIdsRef.current.add(scheduleId)
      onErrorRef.current?.(null)
      applyLocal(!wasFavorite)
      try {
        const result = wasFavorite
          ? await supabase.from("user_favorite_schedules").delete().eq("schedule_id", scheduleId)
          : await supabase.from("user_favorite_schedules").insert({ user_id: userId, schedule_id: scheduleId })
        // 23505 = already favourited in another tab/device, which is the desired end state.
        if (result.error && !(result.error as { code?: string }).code?.startsWith("23505")) {
          applyLocal(wasFavorite)
          onErrorRef.current?.(SAVE_ERROR_MESSAGE)
        }
      } catch {
        applyLocal(wasFavorite)
        onErrorRef.current?.(SAVE_ERROR_MESSAGE)
      } finally {
        inFlightIdsRef.current.delete(scheduleId)
      }
    },
    [replaceFavorites, userId],
  )

  return { favoriteScheduleIds, toggleFavorite }
}
