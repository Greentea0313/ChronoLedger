"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"

export default function AuthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageIsError, setMessageIsError] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard")
    }
    if (new URLSearchParams(window.location.search).get("accountDeleted") === "1") {
      setMessage("계정 삭제가 완료되었습니다.")
    }
  }, [user, isLoading, router])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setMessageIsError(false)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message === "Invalid login credentials"
          ? "이메일이나 비밀번호가 틀렸거나 가입되지 않은 계정입니다."
          : error.message)
        setMessageIsError(true)
        return
      }

      setMessage("로그인 성공! 대시보드로 이동합니다.")
      router.replace("/dashboard")
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : "로그인 중 오류가 발생했습니다.")
      setMessageIsError(true)
    } finally {
      setLoading(false)
    }
  }


  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage("")
    setMessageIsError(false)

    try {
      const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
      const redirectUrl = isDesktop
        ? "chronoledger://auth/callback"
        : `${window.location.origin}/auth/callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isDesktop,
        },
      })

      if (error) {
        setMessage(`Google 인증 오류: ${error.message}`)
        setMessageIsError(true)
        return
      }

      if (isDesktop && data.url) {
        const { open } = await import("@tauri-apps/plugin-shell")
        await open(data.url)
        setMessage("외부 브라우저에서 Google 로그인을 완료해주세요.")
      }
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : "Google 인증을 시작하지 못했습니다.")
      setMessageIsError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-theme="dark" className="flex min-h-screen items-center justify-center bg-app p-4 text-content md:p-6">
      <Card className="w-full max-w-md shadow-modal">
        <CardHeader className="space-y-1 pb-2 pt-8">
          <CardTitle className="text-center text-[28px] font-bold text-primary">ChronoLedger</CardTitle>
          <p className="text-center text-sm text-content-muted">게임 일정과 지출을 한 곳에서 관리하세요.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <form id="auth-form" className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-medium text-content">이메일</label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-medium text-content">비밀번호</label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="h-12"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                size="lg"
                className="w-full font-bold"
                disabled={loading}
              >
                이메일 로그인
              </Button>
              <Button
                type="button"
                onClick={() => router.push("/auth/signup")}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                회원가입
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-content-muted">또는</span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full bg-white font-bold text-slate-900 hover:bg-slate-200 flex items-center justify-center gap-2"
            onClick={() => void handleGoogleLogin()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-slate-900" />
                <span>Google 연결 중...</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google 계정으로 로그인</span>
              </>
            )}
          </Button>

          {message && (
            <p role={messageIsError ? "alert" : "status"} className={`text-center text-sm font-semibold ${messageIsError ? "text-danger" : "text-warning"}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
