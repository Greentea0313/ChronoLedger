'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth')
    }
  }, [isLoading, router, user])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLogoutError(`로그아웃하지 못했습니다: ${error.message}`)
        return
      }
      router.replace('/auth')
    } catch (cause: unknown) {
      const description = cause instanceof Error ? cause.message : String(cause)
      setLogoutError(`로그아웃 중 오류가 발생했습니다: ${description}`)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <p role="status">인증 확인 중...</p>
      </main>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-gray-800 p-5 flex flex-col border-r border-gray-700">
        <h2 className="text-2xl font-black text-blue-400 mb-8 tracking-tight">ChronoLedger</h2>
        <nav className="flex-1 space-y-2 text-gray-300">
          <Link href="/dashboard" className="block p-3 rounded hover:bg-gray-700 hover:text-white transition-colors">
            📊 홈 대시보드
          </Link>
          <Link href="/dashboard/expenses" className="block p-3 rounded hover:bg-gray-700 hover:text-white transition-colors">
            💸 가계부 내역
          </Link>
          <Link href="/dashboard/calendar" className="block p-3 rounded hover:bg-gray-700 hover:text-white transition-colors">
            📅 게임 일정
          </Link>
          <Link href="/dashboard/settings" className="block p-3 rounded hover:bg-gray-700 hover:text-white transition-colors">
            ⚙️ 설정
          </Link>
        </nav>
        {logoutError && <p role="alert" className="mb-3 text-sm text-red-400">{logoutError}</p>}
        <button 
          onClick={handleLogout} 
          disabled={isLoggingOut}
          className="p-3 mt-auto rounded border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors text-left"
        >
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </aside>

      {/* 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-900">
        {children}
      </main>
    </div>
  )
}