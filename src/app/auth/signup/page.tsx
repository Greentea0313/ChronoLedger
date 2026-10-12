"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"

const NICKNAME_MAX_LENGTH = 20

export default function SignUpPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageIsError, setMessageIsError] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedNickname = nickname.trim()
    if (!trimmedNickname) {
      setMessage("닉네임을 입력해주세요.")
      setMessageIsError(true)
      return
    }

    setLoading(true)
    setMessage("")
    setMessageIsError(false)

    try {
      // The nickname is stored in user metadata so the signup trigger can seed public.users.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: trimmedNickname } },
      })
      if (error) {
        setMessage(error.message)
        setMessageIsError(true)
        return
      }

      if (data.session && data.user) {
        // Fallback for databases whose trigger still uses the email prefix as the default nickname.
        await supabase.from("users").update({ nickname: trimmedNickname }).eq("id", data.user.id)
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

  return (
    <div data-theme="dark" className="flex min-h-screen items-center justify-center bg-app p-4 text-content md:p-6">
      <Card className="w-full max-w-md shadow-modal">
        <CardHeader className="space-y-1 pb-2 pt-8">
          <CardTitle className="text-center text-[28px] font-bold text-primary">회원가입</CardTitle>
          <p className="text-center text-sm text-content-muted">ChronoLedger 계정을 만들어 시작하세요.</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium text-content">이메일</label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium text-content">비밀번호</label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="6자 이상"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-nickname" className="text-sm font-medium text-content">닉네임</label>
              <Input
                id="signup-nickname"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                required
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder={`최대 ${NICKNAME_MAX_LENGTH}자`}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full font-bold"
              disabled={loading}
            >
              가입하기
            </Button>
          </form>

          <p className="text-center text-sm text-content-muted">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth" className="font-semibold text-primary hover:underline">
              로그인
            </Link>
          </p>

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
