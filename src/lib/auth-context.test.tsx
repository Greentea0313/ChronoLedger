import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./auth-context"

const { getSession, onAuthStateChange, maybeSingle, unsubscribe, setupDeepLink } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  maybeSingle: vi.fn(),
  unsubscribe: vi.fn(),
  setupDeepLink: vi.fn(),
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
    setupDeepLink.mockReset().mockResolvedValue(undefined)
    unsubscribe.mockReset()
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
})
