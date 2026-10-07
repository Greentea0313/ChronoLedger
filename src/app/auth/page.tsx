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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F1115] px-4 py-10 text-[#F5F7FA] sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-14rem] h-96 w-96 -translate-x-1/2 rounded-full bg-[#7C8CFF]/10 blur-3xl" />
      </div>
      <section aria-labelledby="auth-title" className="relative w-full max-w-md">
        <header className="mb-6 space-y-3 text-center">
          <div aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#7C8CFF]/30 bg-[#7C8CFF]/10 text-[#7C8CFF]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
              <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3m-3 3h6" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#B3BBC8]">개인 게임·지출 관리</p>
            <h1 id="auth-title" className="text-[22px] font-bold leading-tight tracking-tight">ChronoLedger</h1>
            <p className="text-sm leading-6 text-[#B3BBC8]">게임 일정과 지출을 한곳에서 관리하세요.</p>
          </div>
        </header>

        <Card className="rounded-xl border-[#2A2F3A] bg-[#171A21] text-[#F5F7FA] shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
          <CardHeader className="space-y-2 px-6 pb-0 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-center text-[17px] font-semibold leading-snug">로그인</CardTitle>
            <p className="text-center text-sm leading-6 text-[#B3BBC8]">계정에 로그인하거나 새 계정을 만들어 시작하세요.</p>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-sm font-medium text-[#B3BBC8]">이메일</label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-lg border-[#707A8C] bg-[#1F2430] text-[15px] text-[#F5F7FA] placeholder:text-[#A0A9B8] focus-visible:ring-[#7C8CFF]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="auth-password" className="text-sm font-medium text-[#B3BBC8]">비밀번호</label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg border-[#707A8C] bg-[#1F2430] text-[15px] text-[#F5F7FA] placeholder:text-[#A0A9B8] focus-visible:ring-[#7C8CFF]"
                />
              </div>
              <div className="space-y-3 pt-1">
                <Button type="submit" className="h-12 w-full rounded-lg bg-[#7C8CFF] font-semibold text-[#101426] hover:bg-[#91A0FF] focus-visible:ring-[#7C8CFF]" disabled={loading}>
                  {loading ? "처리 중..." : "이메일 로그인"}
                </Button>
                <Button type="button" onClick={handleSignUp} variant="outline" className="h-12 w-full rounded-lg border-[#707A8C] bg-transparent font-medium text-[#F5F7FA] hover:bg-[#1F2430] hover:text-white focus-visible:ring-[#7C8CFF]" disabled={loading}>
                  회원가입
                </Button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2A2F3A]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#171A21] px-3 text-[#A0A9B8]">또는</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="h-12 w-full rounded-lg border-[#707A8C] bg-[#1F2430] font-medium text-[#F5F7FA] hover:bg-[#2A2F3A] hover:text-white focus-visible:ring-[#7C8CFF]" onClick={handleGoogleLogin}>
              <span aria-hidden="true" className="mr-2 grid h-6 w-6 place-items-center rounded-full border border-[#707A8C] text-sm font-bold text-[#F5F7FA]">G</span>
              Google 계정으로 로그인
            </Button>

            {message && (
              <p role="status" aria-live="polite" className="rounded-lg border border-[#F5B942]/30 bg-[#F5B942]/10 px-3 py-2.5 text-sm leading-6 text-[#F5B942]">
                {message}
              </p>
            )}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-[#A0A9B8]">ChronoLedger · 개인 일정과 지출을 차분하게 관리하세요</p>
      </section>
    </main>
  )
}