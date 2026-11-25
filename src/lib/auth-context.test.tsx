import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./auth-context"

const { getSession, onAuthStateChange, maybeSingle, unsubscribe, setupDeepLink, replace } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  maybeSingle: vi.fn(),
  unsubscribe: vi.fn(),
  setupDeepLink: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from: () => ({ select: () => ({ maybeSingle, eq: () => ({ maybeSingle }) }) }),
  },
}))

vi.mock("@/lib/tauri-auth", () => ({ setupDeepLink }))

function AuthState() {
  const { user, session, isLoading, accountDeletionStatus } = useAuth()
  return (
    <div>
      <span data-testid="user">{user?.id ?? "signed-out"}</span>
      <span data-testid="session">{session?.access_token ?? "no-session"}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="status-loading">{String(useAuth().isAccountDeletionStatusLoading)}</span>
      <span data-testid="deletion">{accountDeletionStatus ?? "none"}</span>
    </div>
  )
}

describe("AuthProvider", () => {
  let authChange: ((event: string, session: unknown) => void) | undefined

  beforeEach(() => {
    authChange = undefined
    getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null })
    onAuthStateChange.mockReset().mockImplementation((callback) => {
      authChange = callback
      return { data: { subscription: { unsubscribe } } }
    })
    maybeSingle.mockReset().mockResolvedValue({ data: null, error: null })
    setupDeepLink.mockReset().mockResolvedValue(vi.fn())
    unsubscribe.mockReset()
    replace.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => cleanup())

  it("initializes from the stored session and unsubscribes on unmount", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "token", user: { id: "user-1" } } },
      error: null,
    })
    const view = render(<AuthProvider><AuthState /></AuthProvider>)

    await act(async () => { await Promise.resolve() })

    expect(screen.getByTestId("user").textContent).toBe("user-1")
    expect(screen.getByTestId("session").textContent).toBe("token")
    expect(screen.getByTestId("loading").textContent).toBe("false")
    view.unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it("tracks sign-in and sign-out events and checks deletion state", async () => {
    maybeSingle.mockResolvedValue({ data: { status: "PENDING" }, error: null })
    render(<AuthProvider><AuthState /></AuthProvider>)
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      authChange?.("SIGNED_IN", {
        access_token: "new-token",
        user: { id: "user-2" },
      })
      await Promise.resolve()
    })

    expect(screen.getByTestId("user").textContent).toBe("user-2")
    expect(screen.getByTestId("deletion").textContent).toBe("PENDING")

    await act(async () => {
      authChange?.("SIGNED_OUT", null)
    })
    expect(screen.getByTestId("user").textContent).toBe("signed-out")
  })

  it("clears only the signed-out user's game order and onboarding keys on SIGNED_OUT", async () => {
    window.localStorage.setItem('chronoledger:game-order:user-2', '["g1"]')
    window.localStorage.setItem('chronoledger:game-onboarding-dismissed:user-2', '1')
    window.localStorage.setItem('chronoledger:game-order:other', '["g2"]')
    render(<AuthProvider><AuthState /></AuthProvider>)
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      authChange?.('SIGNED_IN', { access_token: 'token', user: { id: 'user-2' } })
      await Promise.resolve()
    })
    expect(window.localStorage.getItem('chronoledger:game-order:user-2')).not.toBeNull()

    await act(async () => {
      authChange?.('SIGNED_OUT', null)
    })

    expect(window.localStorage.getItem('chronoledger:game-order:user-2')).toBeNull()
    expect(window.localStorage.getItem('chronoledger:game-onboarding-dismissed:user-2')).toBeNull()
    expect(window.localStorage.getItem('chronoledger:game-order:other')).toBe('["g2"]')
  })

  it("wires deep-link success/error navigation and unsubscribes deep-link listener on unmount", async () => {
    const unlistenDeepLink = vi.fn()
    let capturedHandlers: { onSuccess: () => void; onError: (msg: string) => void } | undefined
    setupDeepLink.mockImplementation(async (handlers: { onSuccess: () => void; onError: (msg: string) => void }) => {
      capturedHandlers = handlers
      return unlistenDeepLink
    })

    const view = render(<AuthProvider><AuthState /></AuthProvider>)
    await act(async () => { await Promise.resolve() })

    capturedHandlers?.onSuccess()
    expect(replace).toHaveBeenCalledWith("/dashboard")

    capturedHandlers?.onError("Google 로그인이 취소되었습니다.")
    expect(replace).toHaveBeenCalledWith(
      `/auth?oauthError=${encodeURIComponent("Google 로그인이 취소되었습니다.")}`,
    )

    view.unmount()
    expect(unlistenDeepLink).toHaveBeenCalledTimes(1)
  })

  it("clears session state and finishes loading when getSession returns an expired-session error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    getSession.mockResolvedValue({ data: { session: null }, error: { message: "Invalid Refresh Token" } })

    try {
      render(<AuthProvider><AuthState /></AuthProvider>)
      await act(async () => { await Promise.resolve() })

      expect(screen.getByTestId("user").textContent).toBe("signed-out")
      expect(screen.getByTestId("session").textContent).toBe("no-session")
      expect(screen.getByTestId("loading").textContent).toBe("false")
      expect(screen.getByTestId("status-loading").textContent).toBe("false")
    } finally {
      errorSpy.mockRestore()
    }
  })
})
