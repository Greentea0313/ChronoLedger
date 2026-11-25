import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { isTauriMock, signInWithOAuth, exchangeCodeForSession, setSession, shellOpen, getCurrent, onOpenUrl } =
  vi.hoisted(() => ({
    isTauriMock: vi.fn(),
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(),
    shellOpen: vi.fn(),
    getCurrent: vi.fn(),
    onOpenUrl: vi.fn(),
  }))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: isTauriMock,
}))

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: shellOpen,
}))

vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent,
  onOpenUrl,
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth,
      exchangeCodeForSession,
      setSession,
    },
  },
}))

import {
  completeOAuthCallbackUrl,
  DESKTOP_OAUTH_CALLBACK_URL,
  getOAuthRedirectUrl,
  isDesktopRuntime,
  isOAuthCallbackUrl,
  OAUTH_CALLBACK_ERROR_EVENT,
  resetOAuthExchangeCacheForTests,
  startGoogleOAuth,
} from "./auth-adapter"
import { resetDeepLinkColdStartForTests, setupDeepLink } from "./tauri-auth"

describe("auth-adapter & tauri-auth (T1~T3)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    isTauriMock.mockReturnValue(false)
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
    resetOAuthExchangeCacheForTests()
    resetDeepLinkColdStartForTests()
    getCurrent.mockResolvedValue(null)
    onOpenUrl.mockResolvedValue(vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
  })

  it("matches valid web and desktop OAuth callback URLs only", () => {
    expect(isOAuthCallbackUrl("chronoledger://auth/callback?code=abc")).toBe(true)
    expect(isOAuthCallbackUrl("chronoledger://auth/callback/?code=abc")).toBe(true)
    expect(isOAuthCallbackUrl("chronoledger:///auth/callback?code=abc")).toBe(true)
    expect(isOAuthCallbackUrl("https://chronoledger.example/auth/callback?code=abc")).toBe(true)
    expect(isOAuthCallbackUrl("http://localhost:3000/auth/callback/?code=abc")).toBe(true)

    expect(isOAuthCallbackUrl("chronoledger://other/path?code=abc")).toBe(false)
    expect(isOAuthCallbackUrl("https://chronoledger.example/dashboard")).toBe(false)
    expect(isOAuthCallbackUrl("javascript:alert(1)")).toBe(false)
    expect(isOAuthCallbackUrl("not-a-url")).toBe(false)
  })

  it("starts Google OAuth in web mode without external browser redirect", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://project.supabase.co/auth/v1/authorize" }, error: null })

    expect(isDesktopRuntime()).toBe(false)
    expect(getOAuthRedirectUrl()).toBe(`${window.location.origin}/auth/callback`)

    const result = await startGoogleOAuth()
    expect(result).toEqual({ mode: "browser-redirect" })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    })
    expect(shellOpen).not.toHaveBeenCalled()
  })

  it("validates HTTPS same-origin Supabase URL before calling Tauri shell open", async () => {
    isTauriMock.mockReturnValue(true)
    expect(getOAuthRedirectUrl()).toBe(DESKTOP_OAUTH_CALLBACK_URL)

    // Allowed same-origin https URL
    signInWithOAuth.mockResolvedValueOnce({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    })
    const okResult = await startGoogleOAuth()
    expect(okResult).toEqual({ mode: "external-browser" })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: DESKTOP_OAUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    })
    expect(shellOpen).toHaveBeenCalledWith("https://project.supabase.co/auth/v1/authorize?provider=google")

    // Blocked mismatched origin / non-https scheme
    shellOpen.mockClear()
    signInWithOAuth.mockResolvedValueOnce({
      data: { url: "https://evil.example/auth/v1/authorize" },
      error: null,
    })
    const badOrigin = await startGoogleOAuth()
    expect(badOrigin.error).toContain("허용되지 않은 인증 URL")
    expect(shellOpen).not.toHaveBeenCalled()

    signInWithOAuth.mockResolvedValueOnce({
      data: { url: "http://project.supabase.co/auth/v1/authorize" },
      error: null,
    })
    const badScheme = await startGoogleOAuth()
    expect(badScheme.error).toContain("허용되지 않은 인증 URL")
    expect(shellOpen).not.toHaveBeenCalled()
  })

  it("exchanges PKCE code once across duplicate calls and rejects hash-only implicit tokens", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    const [first, second] = await Promise.all([
      completeOAuthCallbackUrl("chronoledger://auth/callback?code=dup-code-1"),
      completeOAuthCallbackUrl("chronoledger://auth/callback?code=dup-code-1"),
    ])
    expect(first).toEqual({ status: "success" })
    expect(second).toEqual({ status: "success" })
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(exchangeCodeForSession).toHaveBeenCalledWith("dup-code-1")

    // Implicit hash tokens must never be accepted or passed to setSession
    const hashOnly = await completeOAuthCallbackUrl(
      "chronoledger://auth/callback#access_token=secret&refresh_token=secret2",
    )
    expect(hashOnly.status).toBe("error")
    expect(setSession).not.toHaveBeenCalled()

    // Access denied maps to friendly cancellation message
    const cancelled = await completeOAuthCallbackUrl(
      "chronoledger://auth/callback?error=access_denied&error_description=User+cancelled",
    )
    expect(cancelled).toEqual({
      status: "error",
      message: "Google 로그인이 취소되었습니다. 다시 시도해 주세요.",
    })
  })

  it("runs getCurrent once per process, deduplicates with onOpenUrl, dispatches errors, and cleans up", async () => {
    isTauriMock.mockReturnValue(true)
    exchangeCodeForSession.mockResolvedValue({ error: null })

    let openUrlHandler: ((urls: string[]) => void) | undefined
    const unlisten = vi.fn()
    onOpenUrl.mockImplementation(async (cb: (urls: string[]) => void) => {
      openUrlHandler = cb
      return unlisten
    })
    getCurrent.mockResolvedValue(["chronoledger://auth/callback?code=cold-start-code"])

    const onSuccess = vi.fn()
    const onError = vi.fn()
    const cleanup1 = await setupDeepLink({ onSuccess, onError })

    expect(getCurrent).toHaveBeenCalledTimes(1)
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)

    // Receiving the same code via onOpenUrl shares cached promise (no 2nd exchangeCodeForSession)
    openUrlHandler?.(["chronoledger://auth/callback?code=cold-start-code"])
    await Promise.resolve()
    await Promise.resolve()
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)

    // Receiving access_denied error via onOpenUrl dispatches custom event and calls onError
    const eventSpy = vi.fn()
    window.addEventListener(OAUTH_CALLBACK_ERROR_EVENT, eventSpy)
    try {
      openUrlHandler?.(["chronoledger://auth/callback?error=access_denied"])
      await Promise.resolve()
      await Promise.resolve()
      expect(eventSpy).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith("Google 로그인이 취소되었습니다. 다시 시도해 주세요.")
    } finally {
      window.removeEventListener(OAUTH_CALLBACK_ERROR_EVENT, eventSpy)
    }

    cleanup1()
    expect(unlisten).toHaveBeenCalledTimes(1)

    // Re-mounting in the same process does not re-run getCurrent cold-start code
    const cleanup2 = await setupDeepLink({ onSuccess, onError })
    expect(getCurrent).toHaveBeenCalledTimes(1)
    cleanup2()
  })
})
