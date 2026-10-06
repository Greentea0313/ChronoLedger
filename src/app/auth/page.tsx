"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

export default function AuthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "이메일이나 비밀번호가 틀렸거나 가입되지 않은 계정입니다." : error.message)
    } else {
      setMessage("로그인 성공! 대시보드로 이동합니다.")
      router.push("/dashboard")
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("회원가입 성공! 가입한 정보로 다시 [로그인]을 눌러주세요.")
    }
    setLoading(false)
  }

  // 🚀 수정된 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    try {
      setMessage("구글 로그인 URL 요청 중...");
      const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
      const redirectUrl = isDesktop
        ? 'chronoledger://auth/callback'
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isDesktop,
        },
      })

      if (error) {
        setMessage(`인증 에러: ${error.message}`);
        return;
      }

      if (isDesktop && data?.url) {
        setMessage("외부 웹 브라우저를 엽니다...");
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(data.url);
        setMessage("웹 브라우저에서 로그인을 완료해주세요.");
      }
    } catch (error: unknown) {
      console.error("구글 로그인 에러:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessage(`실행 오류: ${errMsg}`);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold text-blue-400">ChronoLedger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4">
            <Inpu
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
            <Inpu
              type="password"
              placeholder="비밀번호 (6자리 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
            <div className="flex gap-2">
              <Button type="submit" onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
                {loading ? "처리 중..." : "이메일 로그인"}
              </Button>
              <Button type="button" onClick={handleSignUp} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white" disabled={loading}>
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

          <Button type="button" className="w-full bg-white text-gray-900 hover:bg-gray-200 font-bold py-5 text-md" onClick={handleGoogleLogin}>
            Google 계정으로 로그인
          </Button>

          {message && <p className="text-center text-sm font-semibold text-yellow-500 mt-4">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}