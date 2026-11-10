import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BoardPreset } from "./preset-board"

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { rpc, from } }))

import {
  PRESET_CONFLICT_MESSAGE,
  PRESET_EMPTY_UNAVAILABLE_MESSAGE,
  PRESET_MIN_ONE_MESSAGE,
  PRESET_MOVE_UNAVAILABLE_MESSAGE,
  usePresetBoard,
} from "./use-preset-board"

const preset = (id: string, characterIds: string[], sortOrder: number, title = id): BoardPreset => ({
  id,
  game_id: "g",
  title,
  character_ids: characterIds,
  memo: null,
  sort_order: sortOrder,
  created_at: "2026-11-01T00:00:00Z",
})

type Deferred = { resolve: (value: unknown) => void; promise: Promise<unknown> }
const deferred = (): Deferred => {
  let resolve!: (value: unknown) => void
  const promise = new Promise((r) => (resolve = r))
  return { resolve, promise }
}

/** Chainable query mock: records calls and resolves with `result`. */
function query(result: unknown, calls: unknown[][]) {
  const q: Record<string, unknown> = {}
  ;["insert", "update", "delete", "select", "eq", "single"].forEach((name) => {
    q[name] = vi.fn((...args: unknown[]) => (calls.push([name, ...args]), q))
  })
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return q
}

const server = { presets: [] as BoardPreset[] }
let notices: ({ type: string; text: string } | null)[] = []
let reloads = 0

function setup(initial: BoardPreset[]) {
  server.presets = initial
  return renderHook(() => {
    const [presets, setPresets] = useState(initial)
    const board = usePresetBoard({
      userId: "u",
      presets,
      setPresets,
      reload: async () => {
        reloads += 1
        setPresets(server.presets)
      },
      onNotice: (notice) => notices.push(notice),
    })
    return { presets, board }
  })
}

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })

describe("usePresetBoard", () => {
  beforeEach(() => {
    notices = []
    reloads = 0
    rpc.mockReset()
    from.mockReset()
    rpc.mockResolvedValue({ data: null, error: null })
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it("applies slot changes immediately and saves them in order through the RPC", async () => {
    const first = deferred()
    rpc.mockImplementationOnce(() => first.promise)
    const { result } = setup([preset("a", ["c1", "c2"], 1), preset("b", [], 2)])

    act(() => {
      result.current.board.applySlots([{ id: "a", expected: ["c1", "c2"], next: ["c2", "c1"] }])
      result.current.board.applySlots([{ id: "a", expected: ["c2", "c1"], next: ["c2"] }, { id: "b", expected: [], next: ["c1"] }])
    })
    expect(result.current.presets.map((item) => item.character_ids)).toEqual([["c2"], ["c1"]])
    expect(result.current.board.pendingIds.has("a")).toBe(true)
    await settle()
    // The second write waits for the first one.
    expect(rpc).toHaveBeenCalledTimes(1)

    first.resolve({ data: null, error: null })
    await settle()
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1]).toEqual([
      "update_character_preset_slots",
      { p_changes: [{ id: "a", expected: ["c2", "c1"], next: ["c2"] }, { id: "b", expected: [], next: ["c1"] }] },
    ])
    expect(result.current.board.pendingIds.size).toBe(0)
    expect(reloads).toBe(0)
  })

  it("drops queued writes, reloads and explains a 40001 conflict", async () => {
    const first = deferred()
    rpc.mockImplementationOnce(() => first.promise)
    const { result } = setup([preset("a", ["c1", "c2"], 1)])
    act(() => {
      result.current.board.applySlots([{ id: "a", expected: ["c1", "c2"], next: ["c2", "c1"] }])
      result.current.board.applySlots([{ id: "a", expected: ["c2", "c1"], next: ["c2"] }])
    })
    first.resolve({ data: null, error: { code: "40001", message: "preset changed" } })
    await settle()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(reloads).toBe(1)
    expect(result.current.presets[0].character_ids).toEqual(["c1", "c2"])
    expect(notices.at(-1)).toEqual({ type: "error", text: PRESET_CONFLICT_MESSAGE })
  })

  it("shows other write errors with their message", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "boom" } })
    const { result } = setup([preset("a", ["c1"], 1)])
    act(() => void result.current.board.applySlots([{ id: "a", expected: ["c1"], next: [] }]))
    await settle()
    expect(notices.at(-1)).toEqual({ type: "error", text: "프리셋을 저장하지 못했습니다: boom" })
  })

  it("does not apply anything while offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    const { result } = setup([preset("a", ["c1"], 1)])
    let applied = true
    act(() => void (applied = result.current.board.applySlots([{ id: "a", expected: ["c1"], next: [] }])))
    expect(applied).toBe(false)
    expect(result.current.presets[0].character_ids).toEqual(["c1"])
    expect(rpc).not.toHaveBeenCalled()
  })

  it("falls back to a plain update for one preset when the RPC is missing and then blocks moves", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "missing" } })
    const calls: unknown[][] = []
    from.mockImplementation(() => query({ error: null }, calls))
    const { result } = setup([preset("a", ["c1", "c2"], 1), preset("b", ["c3"], 2)])

    act(() => void result.current.board.applySlots([{ id: "a", expected: ["c1", "c2"], next: ["c2", "c1"] }]))
    await settle()
    expect(calls).toContainEqual(["update", { character_ids: ["c2", "c1"] }])
    expect(reloads).toBe(0)

    let applied = true
    act(() => void (applied = result.current.board.applySlots([{ id: "a", expected: ["c2", "c1"], next: ["c2"] }, { id: "b", expected: ["c3"], next: ["c3", "c1"] }])))
    expect(applied).toBe(false)
    expect(notices.at(-1)).toEqual({ type: "error", text: PRESET_MOVE_UNAVAILABLE_MESSAGE })
    act(() => void (applied = result.current.board.applySlots([{ id: "b", expected: ["c3"], next: [] }])))
    expect(applied).toBe(false)
    expect(notices.at(-1)).toEqual({ type: "error", text: PRESET_MIN_ONE_MESSAGE })
    act(() => void (applied = result.current.board.reorderCards("g", ["b", "a"])))
    expect(applied).toBe(false)
  })

  it("reorders cards optimistically with 1-based sort_order and saves them with one RPC", async () => {
    const { result } = setup([preset("a", [], 1), preset("b", [], 2)])
    act(() => void result.current.board.reorderCards("g", ["b", "a"]))
    expect(result.current.presets.map((item) => [item.id, item.sort_order])).toEqual([["a", 2], ["b", 1]])
    await settle()
    expect(rpc).toHaveBeenCalledWith("reorder_character_presets", { p_game_id: "g", p_preset_ids: ["b", "a"] })
  })

  it("creates an empty preset with the next free title at the end and returns its id", async () => {
    const calls: unknown[][] = []
    const created = preset("new", [], 3, "새 프리셋 2")
    from.mockImplementation(() => query({ data: created, error: null }, calls))
    const { result } = setup([preset("a", ["c1"], 1, "새 프리셋"), preset("b", [], 2)])
    let id: string | null = null
    await act(async () => {
      id = await result.current.board.createPreset("g")
    })
    expect(id).toBe("new")
    expect(calls[0]).toEqual([
      "insert",
      { user_id: "u", game_id: "g", title: "새 프리셋 2", memo: null, character_ids: [], sort_order: 3 },
    ])
    expect(result.current.presets.map((item) => item.id)).toEqual(["a", "b", "new"])
  })

  it("clears the creating state when a queued create is skipped after an earlier failure", async () => {
    const first = deferred()
    rpc.mockImplementationOnce(() => first.promise)
    from.mockImplementation(() => query({ data: preset("new", [], 2), error: null }, []))
    const { result } = setup([preset("a", ["c1"], 1)])
    let created: Promise<string | null> = Promise.resolve(null)
    act(() => {
      result.current.board.applySlots([{ id: "a", expected: ["c1"], next: [] }])
      created = result.current.board.createPreset("g")
    })
    expect(result.current.board.isCreating).toBe(true)
    first.resolve({ data: null, error: { code: "40001", message: "preset changed" } })
    await act(async () => {
      expect(await created).toBeNull()
    })
    expect(from).not.toHaveBeenCalled()
    expect(result.current.board.isCreating).toBe(false)
  })

  it("explains and stops creating empty presets when the CHECK is not migrated", async () => {
    from.mockImplementation(() => query({ data: null, error: { code: "23514", message: "check" } }, []))
    const { result } = setup([preset("a", ["c1"], 1)])
    await act(async () => void (await result.current.board.createPreset("g")))
    expect(notices.at(-1)).toEqual({ type: "error", text: PRESET_EMPTY_UNAVAILABLE_MESSAGE })
    from.mockClear()
    await act(async () => void (await result.current.board.createPreset("g")))
    expect(from).not.toHaveBeenCalled()
  })

  it("saves title/memo edits and deletes presets optimistically", async () => {
    const calls: unknown[][] = []
    from.mockImplementation(() => query({ error: null }, calls))
    const { result } = setup([preset("a", ["c1"], 1), preset("b", [], 2)])
    act(() => {
      result.current.board.updateText("a", { title: "보스전" })
      result.current.board.updateText("a", { memo: null })
      result.current.board.deletePreset("b")
    })
    expect(result.current.presets).toEqual([{ ...preset("a", ["c1"], 1), title: "보스전" }])
    await settle()
    expect(calls.filter((call) => call[0] !== "eq")).toEqual([["update", { title: "보스전" }], ["update", { memo: null }], ["delete"]])
  })

  it("ignores changes while a failure reload is running", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "x" } })
    const pendingReload = deferred()
    server.presets = []
    const { result } = renderHook(() => {
      const [presets, setPresets] = useState([preset("a", ["c1"], 1)])
      return {
        presets,
        board: usePresetBoard({
          userId: "u",
          presets,
          setPresets,
          reload: () => pendingReload.promise.then(() => undefined),
          onNotice: () => undefined,
        }),
      }
    })
    act(() => void result.current.board.applySlots([{ id: "a", expected: ["c1"], next: [] }]))
    await settle()
    expect(result.current.board.isReloading).toBe(true)
    let applied = true
    act(() => void (applied = result.current.board.applySlots([{ id: "a", expected: [], next: ["c1"] }])))
    expect(applied).toBe(false)
    pendingReload.resolve(undefined)
    await settle()
    expect(result.current.board.isReloading).toBe(false)
  })
})
