import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))
vi.mock("@/lib/auth-context", () => ({ useAuth }))

import { ServiceWorkerRegister } from "./service-worker-register"

describe("ServiceWorkerRegister", () => {
  const deleteCache = vi.fn().mockResolvedValue(true)

  beforeEach(() => {
    deleteCache.mockClear()
    vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue(["a", "b"]), delete: deleteCache })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("로그아웃(사용자 없음) 상태가 되면 모든 캐시를 삭제한다", async () => {
    useAuth.mockReturnValue({ user: null, isLoading: false })
    render(<ServiceWorkerRegister />)
    await waitFor(() => expect(deleteCache).toHaveBeenCalledTimes(2))
  })

  it("로그인 상태에서는 캐시를 삭제하지 않는다", async () => {
    useAuth.mockReturnValue({ user: { id: "u1" }, isLoading: false })
    render(<ServiceWorkerRegister />)
    await Promise.resolve()
    expect(deleteCache).not.toHaveBeenCalled()
  })
})
