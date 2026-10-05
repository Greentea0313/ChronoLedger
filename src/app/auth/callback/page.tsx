"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("인증 토큰을 확인하는 중입니다...")

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      // 1. 이미 세션이 발급되었는지 즉시 확인
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setMessage(`에러 발생: ${error.message}`)
        return
      }

      if (session) {
        setMessage("인증 완료! 대시보드로 이동합니다...")
        window.location.href = '/dashboard' // Next.js 라우터 캐시 우회를 위해 강제 이동
        return
      }

      // 2. 세션이 없다면 Supabase가 URL의 ?code= 를 자동으로 교환할 때까지 리스너로 대기
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession) {
          setMessage("인증 완료! 대시보드로 이동합니다...")
          window.location.href = '/dashboard'
        }
      })

      // 3. 5초 이상 지연되면 무한 로딩을 막고 메인으로 복귀
      setTimeout(() => {
        if (isMounted) {
          setMessage("인증 응답이 지연되었습니다. 메인 화면으로 돌아갑니다.")
          setTimeout(() => { window.location.href = '/' }, 2000)
        }
      }, 5000)

      return () => {
        isMounted = false
        subscription.unsubscribe()
      }
    }

    checkSession()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-blue-400">
      <div className="text-center space-y-4">
        <p className="animate-pulse font-semibold text-lg">{message}</p>
      </div>
    </div>
  )
}