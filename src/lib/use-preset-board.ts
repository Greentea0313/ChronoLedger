"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { supabase } from "@/lib/supabase/client"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import type { Json } from "@/types/database.types"
import { applyCardOrder, applySlotChanges, nextPresetTitle, type BoardPreset, type SlotChange } from "@/lib/preset-board"

export const PRESET_CONFLICT_MESSAGE = "다른 곳에서 프리셋이 변경되어 다시 불러왔습니다."
export const PRESET_MOVE_UNAVAILABLE_MESSAGE = "업데이트 적용 전에는 프리셋 간 이동과 순서 변경을 할 수 없습니다."
export const PRESET_MIN_ONE_MESSAGE = "업데이트 적용 전에는 최소 1명은 남겨야 합니다."
export const PRESET_EMPTY_UNAVAILABLE_MESSAGE = "업데이트 적용 전에는 빈 프리셋을 만들 수 없습니다."
const SAVE_FAILED_PREFIX = "프리셋을 저장하지 못했습니다: "

const PRESET_COLUMNS = "id, game_id, title, character_ids, memo, sort_order, created_at"

type WriteError = { code?: string; message: string; plain?: boolean }
type Notice = { type: "error" | "success"; text: string }

/** PostgREST function-not-found / Postgres undefined_function: the R76 RPCs are not migrated yet. */
const isMissingFunction = (error: { code?: string } | null | undefined) => error?.code === "PGRST202" || error?.code === "42883"

interface UsePresetBoardOptions {
  userId: string | undefined
  /** Presets of every game (the page's state); the hook updates it optimistically. */
  presets: BoardPreset[]
  setPresets: Dispatch<SetStateAction<BoardPreset[]>>
  /** Reloads presets from the server (used after a failed write). */
  reload: () => Promise<void>
  onNotice: (notice: Notice | null) => void
}

/**
 * Immediate-save state of the R76 preset board (spec §5): every change is applied to the page state at once and
 * its write is appended to one FIFO queue. A failed write drops the queued writes, reloads from the server and shows
 * a message; while that reload runs, new changes are ignored so the reload cannot overwrite them.
 */
export function usePresetBoard({ userId, presets, setPresets, reload, onNotice }: UsePresetBoardOptions) {
  const presetsRef = useRef(presets)
  presetsRef.current = presets
  const chainRef = useRef<Promise<void>>(Promise.resolve())
  const generationRef = useRef(0)
  const reloadingRef = useRef(false)
  // Unknown until a call proves otherwise (unapplied R76 migration, spec §4.6).
  const rpcSupportedRef = useRef(true)
  const emptySupportedRef = useRef(true)
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [pendingTotal, setPendingTotal] = useState(0)
  const [isReloading, setIsReloading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const markPending = useCallback((ids: readonly string[], delta: 1 | -1) => {
    setPendingTotal((total) => total + delta)
    if (ids.length === 0) return
    setPendingCounts((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        const count = (next[id] ?? 0) + delta
        if (count > 0) next[id] = count
        else delete next[id]
      })
      return next
    })
  }, [])

  const fail = useCallback(
    async (error: WriteError) => {
      generationRef.current += 1
      reloadingRef.current = true
      setIsReloading(true)
      onNotice({
        type: "error",
        text: error.plain ? error.message : error.code === "40001" ? PRESET_CONFLICT_MESSAGE : SAVE_FAILED_PREFIX + error.message,
      })
      try {
        await reload()
      } finally {
        reloadingRef.current = false
        setIsReloading(false)
      }
    },
    [onNotice, reload],
  )

  /** Appends a write; writes of an older generation (queued before a failure) are skipped. */
  const enqueue = useCallback(
    (ids: readonly string[], run: () => Promise<WriteError | null>) => {
      const generation = generationRef.current
      markPending(ids, 1)
      const task = chainRef.current.then(async () => {
        try {
          if (generation !== generationRef.current) return
          const error = await run()
          if (error) await fail(error)
        } catch (cause) {
          await fail({ message: cause instanceof Error ? cause.message : "알 수 없는 오류" })
        } finally {
          markPending(ids, -1)
        }
      })
      chainRef.current = task
      return task
    },
    [fail, markPending],
  )

  /** Common guard for every change: signed in, not reloading, online. */
  const canWrite = useCallback(() => {
    if (!userId || reloadingRef.current) return false
    if (isOffline()) {
      onNotice({ type: "error", text: OFFLINE_WRITE_MESSAGE })
      return false
    }
    return true
  }, [onNotice, userId])

  /** Saves one preset's slots, or two presets for a move; returns false when the change was not applied. */
  const applySlots = useCallback(
    (changes: SlotChange[]) => {
      if (changes.length === 0 || !canWrite()) return false
      if (!rpcSupportedRef.current) {
        if (changes.length > 1) {
          onNotice({ type: "error", text: PRESET_MOVE_UNAVAILABLE_MESSAGE })
          return false
        }
        if (changes[0].next.length === 0) {
          onNotice({ type: "error", text: PRESET_MIN_ONE_MESSAGE })
          return false
        }
      }
      onNotice(null)
      setPresets((prev) => applySlotChanges(prev, changes))
      void enqueue(
        changes.map((change) => change.id),
        async () => {
          if (rpcSupportedRef.current) {
            const { error } = await supabase.rpc("update_character_preset_slots", { p_changes: changes as unknown as Json })
            if (!error) return null
            if (!isMissingFunction(error)) return error
            rpcSupportedRef.current = false
            emptySupportedRef.current = false
          }
          // Unapplied migration: a single preset falls back to a plain update (no concurrency check).
          if (changes.length > 1) return { message: PRESET_MOVE_UNAVAILABLE_MESSAGE, plain: true }
          if (changes[0].next.length === 0) return { message: PRESET_MIN_ONE_MESSAGE, plain: true }
          const { error } = await supabase
            .from("user_character_presets")
            .update({ character_ids: changes[0].next })
            .eq("id", changes[0].id)
            .eq("user_id", userId as string)
          return error
        },
      )
      return true
    },
    [canWrite, enqueue, onNotice, setPresets, userId],
  )

  /** Saves a new card order (all presets of the game). */
  const reorderCards = useCallback(
    (gameId: string, presetIds: string[]) => {
      if (!canWrite()) return false
      if (!rpcSupportedRef.current) {
        onNotice({ type: "error", text: PRESET_MOVE_UNAVAILABLE_MESSAGE })
        return false
      }
      onNotice(null)
      setPresets((prev) => applyCardOrder(prev, presetIds))
      void enqueue(presetIds, async () => {
        const { error } = await supabase.rpc("reorder_character_presets", { p_game_id: gameId, p_preset_ids: presetIds })
        if (!error) return null
        if (!isMissingFunction(error)) return error
        rpcSupportedRef.current = false
        emptySupportedRef.current = false
        return { message: PRESET_MOVE_UNAVAILABLE_MESSAGE, plain: true }
      })
      return true
    },
    [canWrite, enqueue, onNotice, setPresets],
  )

  /** Creates an empty preset at the end of the game's cards; resolves with its id (null when not created). */
  const createPreset = useCallback(
    async (gameId: string): Promise<string | null> => {
      if (!canWrite()) return null
      if (!emptySupportedRef.current) {
        onNotice({ type: "error", text: PRESET_EMPTY_UNAVAILABLE_MESSAGE })
        return null
      }
      onNotice(null)
      setIsCreating(true)
      let createdId: string | null = null
      await enqueue([], async () => {
        try {
          const gamePresets = presetsRef.current.filter((preset) => preset.game_id === gameId)
          const { data, error } = await supabase
            .from("user_character_presets")
            .insert({
              user_id: userId as string,
              game_id: gameId,
              title: nextPresetTitle(gamePresets.map((preset) => preset.title)),
              memo: null,
              character_ids: [],
              sort_order: gamePresets.reduce((max, preset) => Math.max(max, preset.sort_order), 0) + 1,
            })
            .select(PRESET_COLUMNS)
            .single()
          if (error) {
            if (error.code === "23514") {
              emptySupportedRef.current = false
              return { message: PRESET_EMPTY_UNAVAILABLE_MESSAGE, plain: true }
            }
            return error
          }
          const row = data as BoardPreset
          createdId = row.id
          setPresets((prev) => [...prev, row])
          return null
        } finally {
          setIsCreating(false)
        }
      })
      return createdId
    },
    [canWrite, enqueue, onNotice, setPresets, userId],
  )

  /** Saves a title or memo edit (last write wins). */
  const updateText = useCallback(
    (presetId: string, patch: { title: string } | { memo: string | null }) => {
      if (!canWrite()) return false
      onNotice(null)
      setPresets((prev) => prev.map((preset) => (preset.id === presetId ? { ...preset, ...patch } : preset)))
      void enqueue([presetId], async () => {
        const { error } = await supabase.from("user_character_presets").update(patch).eq("id", presetId).eq("user_id", userId as string)
        return error
      })
      return true
    },
    [canWrite, enqueue, onNotice, setPresets, userId],
  )

  const deletePreset = useCallback(
    (presetId: string) => {
      if (!canWrite()) return false
      onNotice(null)
      setPresets((prev) => prev.filter((preset) => preset.id !== presetId))
      void enqueue([presetId], async () => {
        const { error } = await supabase.from("user_character_presets").delete().eq("id", presetId).eq("user_id", userId as string)
        return error
      })
      return true
    },
    [canWrite, enqueue, onNotice, setPresets, userId],
  )

  // Leaving the page with unsaved writes in the queue asks first (spec §5).
  useEffect(() => {
    if (pendingTotal === 0) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [pendingTotal])

  const pendingIds = useMemo(() => new Set(Object.keys(pendingCounts)), [pendingCounts])

  return { pendingIds, isBusy: pendingTotal > 0, isReloading, isCreating, applySlots, reorderCards, createPreset, updateText, deletePreset }
}
