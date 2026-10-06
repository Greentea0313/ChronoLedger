"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const started = useRef(false)
  const [message, setMessage] = useState('Google 인증 응답을 확인하고 있습니다...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const completeSignIn = async () => {
      const callbackUrl = new URL(window.location.href)
      const oauthError = callbackUrl.searchParams.get('error')

      if (oauthError) {
        const description = callbackUrl.searchParams.get('error_description')
        setError(description || `Google 인증이 완료되지 않았습니다 (${oauthError}).`)
        return
      }

      const code = callbackUrl.searchParams.get('code')
      if (!code) {
        setError('인증 응답에 코드가 없습니다. 로그인 화면으로 돌아가 다시 시도해주세요.')
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        setError(`로그인 세션을 만들지 못했습니다: ${exchangeError.message}`)
        return
      }

      setMessage('인증이 완료되었습니다. 대시보드로 이동합니다...')
      router.replace('/dashboard')
    }

    completeSignIn().catch((cause: unknown) => {
      const description = cause instanceof Error ? cause.message : String(cause)
      setError(`인증 처리 중 오류가 발생했습니다: ${description}`)
    })
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-blue-400">
      <div className="space-y-4 text-center">
        {error ? (
          <>
            <p role="alert" className="font-semibold">{error}</p>
            <a className="font-semibold underline" href="/auth">로그인 화면으로 돌아가기</a>
          </>
        ) : (
          <p role="status" className="animate-pulse text-lg font-semibold">{message}</p>
        )}
      </div>
    </main>
  )
}
