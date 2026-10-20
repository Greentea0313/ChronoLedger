"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const started = useRef(false)
  const [message, setMessage] = useState("Google 인증을 확인하고 있습니다...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const completeSignIn = async () => {
      const callbackUrl = new URL(window.location.href)
      const oauthError = callbackUrl.searchParams.get("error")

      if (oauthError) {
        const description = callbackUrl.searchParams.get("error_description")
        setError(description || `Google 인증이 완료되지 않았습니다 (${oauthError}).`)
        return
      }

      const code = callbackUrl.searchParams.get("code")
      if (!code) {
        setError("인증 응답에 코드가 없습니다. 로그인 화면으로 돌아가 다시 시도해주세요.")
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        setError(`로그인 세션을 만들지 못했습니다: ${exchangeError.message}`)
        return
      }

      setMessage("인증이 완료되었습니다. 대시보드로 이동합니다...")
      router.replace("/dashboard")
    }

    completeSignIn().catch((cause: unknown) => {
      const description = cause instanceof Error ? cause.message : String(cause)
      setError(`인증 처리 중 오류가 발생했습니다: ${description}`)
    })
  }, [router])

  return (
    <div data-theme="dark" className="flex min-h-screen items-center justify-center bg-app p-4 text-content md:p-6">
      <Card className="w-full max-w-md shadow-modal">
        <CardHeader className="space-y-1 pb-2 pt-8 text-center">
          <CardTitle className="text-center text-[28px] font-bold text-primary">ChronoLedger</CardTitle>
          <p className="text-center text-sm text-content-muted">게임 일정과 지출을 한 곳에서 관리하세요.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 text-center">
          {error ? (
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-10 w-10 text-danger" />
              <p role="alert" className="text-center text-sm font-semibold text-danger">
                {error}
              </p>
              <Button variant="outline" asChild className="w-full">
                <a href="/auth">로그인 화면으로 돌아가기</a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="space-y-1 text-center">
                <p role="status" className="text-base font-semibold text-content">
                  {message}
                </p>
                <p className="text-sm text-content-muted">
                  잠시 후 대시보드로 이동합니다.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
