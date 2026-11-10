import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFavoriteSchedules } from "./use-favorite-schedules"

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ supabase: { from } }))

type Result = { data?: unknown; error: { code?: string; message?: string } | null }

interface Deferred {
  promise: Promise<Result>
  resolve: (value: Result) => void
}

function deferred(): Deferred {
  let resolve!: (value: Result) => void
  const promise = new Promise<Result>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe("useFavoriteSchedules", () => {
  let selectResult: Promise<Result> | Result
  let insert: ReturnType<typeof vi.fn>
  let deleteEq: ReturnType<typeof vi.fn>

  beforeEach(() => {
    selectResult = { data: [{ schedule_id: "s1" }, { schedule_id: "s2" }], error: null }
    insert = vi.fn().mockResolvedValue({ error: null })
    deleteEq = vi.fn().mockResolvedValue({ error: null })
    from.mockImplementation(() => ({
      select: vi.fn(() => Promise.resolve(selectResult)),
      insert,
      delete: vi.fn(() => ({ eq: deleteEq })),
    }))
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })

  async function setup(userId: string = "user-1") {
    const onError = vi.fn()
    const rendered = renderHook(({ id }: { id: string | undefined }) => useFavoriteSchedules(id, { onError }), {
      initialProps: { id: userId as string | undefined },
    })
    await waitFor(() => expect(rendered.result.current.favoriteScheduleIds.size).toBeGreaterThan(0))
    return { ...rendered, onError }
  }

  it("loads the signed-in user's favourites", async () => {
    const { result } = await setup()
    expect(Array.from(result.current.favoriteScheduleIds).sort()).toEqual(["s1", "s2"])
    expect(from).toHaveBeenCalledWith("user_favorite_schedules")
  })

  it("stays empty without a user and clears when the user signs out", async () => {
    const { result, rerender } = await setup()
    rerender({ id: undefined })
    await waitFor(() => expect(result.current.favoriteScheduleIds.size).toBe(0))

    await act(async () => {
      await result.current.toggleFavorite("s9")
    })
    expect(insert).not.toHaveBeenCalled()
    expect(deleteEq).not.toHaveBeenCalled()
  })

  it.each(["42P01", "PGRST205"])("falls back to an empty set without logging when the table is missing (%s)", async (code) => {
    selectResult = { data: null, error: { code, message: "missing" } }
    const { result } = renderHook(() => useFavoriteSchedules("user-1"))
    await waitFor(() => expect(from).toHaveBeenCalled())
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.favoriteScheduleIds.size).toBe(0)
    expect(console.error).not.toHaveBeenCalled()
  })

  it("logs unexpected load errors and rejected loads but still returns an empty set", async () => {
    selectResult = { data: null, error: { code: "42501", message: "denied" } }
    const first = renderHook(() => useFavoriteSchedules("user-1"))
    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(1))
    expect(first.result.current.favoriteScheduleIds.size).toBe(0)

    from.mockImplementation(() => ({ select: () => Promise.reject(new Error("network")) }))
    const second = renderHook(() => useFavoriteSchedules("user-1"))
    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2))
    expect(second.result.current.favoriteScheduleIds.size).toBe(0)
  })

  it("adds a favourite optimistically and inserts with the user id", async () => {
    const { result, onError } = await setup()
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })

    expect(insert).toHaveBeenCalledWith({ user_id: "user-1", schedule_id: "s3" })
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
    expect(onError).toHaveBeenCalledWith(null)
    expect(onError).not.toHaveBeenCalledWith(expect.stringContaining("저장하지 못했습니다"))
  })

  it("removes a favourite with a delete on the schedule id", async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.toggleFavorite("s1")
    })

    expect(deleteEq).toHaveBeenCalledWith("schedule_id", "s1")
    expect(result.current.favoriteScheduleIds.has("s1")).toBe(false)
  })

  it("rolls back and reports an error when the write fails or throws", async () => {
    const { result, onError } = await setup()
    insert.mockResolvedValueOnce({ error: { code: "42501", message: "denied" } })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(false)
    expect(onError).toHaveBeenLastCalledWith("관심 일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")

    deleteEq.mockRejectedValueOnce(new Error("network"))
    await act(async () => {
      await result.current.toggleFavorite("s1")
    })
    expect(result.current.favoriteScheduleIds.has("s1")).toBe(true)
    expect(onError).toHaveBeenLastCalledWith("관심 일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")
  })

  it("treats a duplicate insert (23505) as success", async () => {
    const { result, onError } = await setup()
    insert.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })

    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
    expect(onError).not.toHaveBeenCalledWith(expect.stringContaining("저장하지 못했습니다"))
  })

  it("blocks writes while offline and reports the offline message", async () => {
    const { result, onError } = await setup()
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })

    expect(insert).not.toHaveBeenCalled()
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(false)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("오프라인"))
  })

  it("ignores a second click on the same schedule while its write is still pending", async () => {
    const pending = deferred()
    insert.mockReturnValueOnce(pending.promise)
    const { result, onError } = await setup()

    let first!: Promise<void>
    act(() => {
      first = result.current.toggleFavorite("s3")
    })
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
    await act(async () => {
      await result.current.toggleFavorite("s3")
      await result.current.toggleFavorite("s3")
    })

    // The extra clicks neither toggled it back off nor sent another request.
    expect(insert).toHaveBeenCalledTimes(1)
    expect(deleteEq).not.toHaveBeenCalled()
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
    expect(onError.mock.calls.filter(([message]) => message === null)).toHaveLength(1)

    await act(async () => {
      pending.resolve({ error: null })
      await first
    })
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
  })

  it("allows clicking again once the pending write has finished", async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })

    expect(insert).toHaveBeenCalledTimes(1)
    expect(deleteEq).toHaveBeenCalledWith("schedule_id", "s3")
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(false)
  })

  it("releases the in-flight guard after a failed write so the user can retry", async () => {
    const { result } = await setup()
    insert.mockResolvedValueOnce({ error: { code: "42501", message: "denied" } })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })
    await act(async () => {
      await result.current.toggleFavorite("s3")
    })

    expect(insert).toHaveBeenCalledTimes(2)
    expect(result.current.favoriteScheduleIds.has("s3")).toBe(true)
  })

  it("lets different schedules be written at the same time", async () => {
    const pending = deferred()
    insert.mockReturnValueOnce(pending.promise)
    const { result } = await setup()

    let first!: Promise<void>
    act(() => {
      first = result.current.toggleFavorite("s3")
    })
    await act(async () => {
      await result.current.toggleFavorite("s4")
    })

    expect(insert).toHaveBeenCalledTimes(2)
    expect(result.current.favoriteScheduleIds.has("s4")).toBe(true)
    await act(async () => {
      pending.resolve({ error: null })
      await first
    })
  })
})
