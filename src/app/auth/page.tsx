"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
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

  const handleSignUp = async () => {
    const form = document.querySelector<HTMLFormElement>("#auth-form")
    if (!form?.reportValidity()) return

    setLoading(true)
    setMessage("")
    setMessageIsError(false)

    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
        setMessageIsError(true)
      } else if (data.session) {
        setMessage("회원가입이 완료되었습니다. 대시보드로 이동합니다.")
        router.replace("/dashboard")
      } else {
        setMessage("가입 확인 메일을 확인한 뒤 이메일과 비밀번호로 로그인해주세요.")
      }
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : "회원가입 중 오류가 발생했습니다.")
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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold text-blue-400">ChronoLedger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form id="auth-form" className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-medium text-gray-200">이메일</label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="bg-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-medium text-gray-200">비밀번호</label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="bg-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="w-full bg-blue-600 font-bold hover:bg-blue-700"
                disabled={loading}
              >
                이메일 로그인
              </Button>
              <Button
                type="button"
                onClick={() => void handleSignUp()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                disabled={loading}
              >
                회원가입
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">또는</span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full bg-white py-5 text-md font-bold text-gray-900 hover:bg-gray-200"
            onClick={() => void handleGoogleLogin()}
            disabled={loading}
          >
            Google 계정으로 로그인
          </Button>

          {message && (
            <p role={messageIsError ? "alert" : "status"} className="text-center text-sm font-semibold text-yellow-400">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
