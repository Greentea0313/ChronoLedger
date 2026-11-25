import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { useAuth, isDesktopRuntime } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  isDesktopRuntime: vi.fn(),
}))
vi.mock("@/lib/auth-context", () => ({ useAuth }))
vi.mock("@/lib/auth-adapter", () => ({ isDesktopRuntime }))

import { ServiceWorkerRegister } from "./service-worker-register"

describe("ServiceWorkerRegister", () => {
  const deleteCache = vi.fn().mockResolvedValue(true)
  const register = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    deleteCache.mockClear()
    register.mockClear()
    isDesktopRuntime.mockReturnValue(false)
    vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue(["a", "b"]), delete: deleteCache })
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
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

  it("Tauri 데스크톱 런타임에서는 프로덕션에서도 서비스 워커를 등록하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production")
    isDesktopRuntime.mockReturnValue(true)
    useAuth.mockReturnValue({ user: { id: "u1" }, isLoading: false })

    render(<ServiceWorkerRegister />)
    await Promise.resolve()

    expect(register).not.toHaveBeenCalled()
  })

  it("웹 프로덕션 환경에서는 서비스 워커를 등록한다", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    isDesktopRuntime.mockReturnValue(false)
    useAuth.mockReturnValue({ user: { id: "u1" }, isLoading: false })

    render(<ServiceWorkerRegister />)
    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        `/sw.js?supabaseOrigin=${encodeURIComponent("https://project.supabase.co")}`,
      ),
    )
  })
})
