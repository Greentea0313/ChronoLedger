import { isTauri } from "@tauri-apps/api/core"
import { supabase } from "@/lib/supabase/client"

export const DESKTOP_OAUTH_CALLBACK_URL = "chronoledger://auth/callback"
export const OAUTH_CALLBACK_ERROR_EVENT = "chronoledger:oauth-callback-error"

export type OAuthStartResult = {
  mode: "browser-redirect" | "external-browser"
  error?: string
}

export type OAuthCallbackResult =
  | { status: "ignored" }
  | { status: "success" }
  | { status: "error"; message: string }

const MAX_EXCHANGE_CACHE_SIZE = 10
const exchangeCache = new Map<string, Promise<OAuthCallbackResult>>()

export function resetOAuthExchangeCacheForTests(): void {
  exchangeCache.clear()
}

export function isDesktopRuntime(): boolean {
  if (typeof window === "undefined") return false
  try {
    return isTauri() || "__TAURI_INTERNALS__" in window
  } catch {
    return "__TAURI_INTERNALS__" in window
  }
}

export function getOAuthRedirectUrl(): string {
  if (isDesktopRuntime()) return DESKTOP_OAUTH_CALLBACK_URL
  if (typeof window === "undefined") return "/auth/callback"
  return `${window.location.origin}/auth/callback`
}

function isAllowedExternalAuthUrl(rawUrl: string): boolean {
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!configuredSupabaseUrl) return false
  try {
    const expectedOrigin = new URL(configuredSupabaseUrl).origin
    const target = new URL(rawUrl)
    return target.protocol === "https:" && target.origin === expectedOrigin
  } catch {
    return false
  }
}

export async function startGoogleOAuth(): Promise<OAuthStartResult> {
  const isDesktop = isDesktopRuntime()
  const mode: OAuthStartResult["mode"] = isDesktop ? "external-browser" : "browser-redirect"

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectUrl(),
      skipBrowserRedirect: isDesktop,
    },
  })

  if (error) {
    return {
      mode,
      error: `Google 인증 오류: ${error.message}`,
    }
  }

  if (isDesktop) {
    if (!data?.url || !isAllowedExternalAuthUrl(data.url)) {
      return {
        mode,
        error: "허용되지 않은 인증 URL입니다. 다시 시도해 주세요.",
      }
    }
    const { open } = await import("@tauri-apps/plugin-shell")
    await open(data.url)
  }

  return { mode }
}

export function isOAuthCallbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    const normalizedPath = parsed.pathname.replace(/\/+$/, "")

    if (parsed.protocol === "chronoledger:") {
      return (
        (parsed.hostname === "auth" && normalizedPath === "/callback") ||
        (parsed.hostname === "" && normalizedPath === "/auth/callback")
      )
    }

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return normalizedPath === "/auth/callback"
    }

    return false
  } catch {
    return false
  }
}

export async function completeOAuthCallbackUrl(rawUrl: string): Promise<OAuthCallbackResult> {
  if (!isOAuthCallbackUrl(rawUrl)) {
    return { status: "ignored" }
  }

  const parsed = new URL(rawUrl)
  // Security rule (T1/D1): never inspect url.hash (#access_token) or call setSession.
  const oauthError = parsed.searchParams.get("error")
  if (oauthError) {
    if (oauthError === "access_denied") {
      return {
        status: "error",
        message: "Google 로그인이 취소되었습니다. 다시 시도해 주세요.",
      }
    }
    const description = parsed.searchParams.get("error_description")?.trim()
    return {
      status: "error",
      message: description || `Google 인증이 완료되지 않았습니다 (${oauthError}).`,
    }
  }

  const code = parsed.searchParams.get("code")?.trim()
  if (!code) {
    return {
      status: "error",
      message: "인증 응답에 코드가 없습니다. 로그인 화면으로 돌아가 다시 시도해주세요.",
    }
  }

  const cached = exchangeCache.get(code)
  if (cached) return cached

  if (exchangeCache.size >= MAX_EXCHANGE_CACHE_SIZE) {
    const oldestKey = exchangeCache.keys().next().value
    if (oldestKey !== undefined) {
      exchangeCache.delete(oldestKey)
    }
  }

  const pending: Promise<OAuthCallbackResult> = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ error }) => {
      if (error) {
        return {
          status: "error" as const,
          message: `로그인 세션을 만들지 못했습니다: ${error.message}`,
        }
      }
      return { status: "success" as const }
    })
    .catch((cause: unknown) => ({
      status: "error" as const,
      message: `인증 처리 중 오류가 발생했습니다: ${cause instanceof Error ? cause.message : String(cause)}`,
    }))

  exchangeCache.set(code, pending)
  return pending
}
