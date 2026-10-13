'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { AccountDeletionStatusScreen } from '@/components/auth/account-deletion-status'
import { Topbar } from '@/components/layout/topbar'
import { Calendar, Inbox } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    user,
    role,
    isLoading,
    isAccountDeletionStatusLoading,
    accountDeletionStatus,
  } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !user && !accountDeletionStatus) {
      router.replace('/auth')
    } else if (!isLoading && user && role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [accountDeletionStatus, isLoading, router, user, role])

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

  if (accountDeletionStatus) {
    return <AccountDeletionStatusScreen />
  }

  if (isLoading || isAccountDeletionStatusLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app text-content">
        <p role="status">인증 확인 중...</p>
      </main>
    )
  }

  const isSchedulesTab = pathname === '/admin'
  const isRequestsTab = pathname === '/admin/requests'

  return (
    <div className="flex min-h-screen flex-col bg-app text-content">
      <Topbar onLogout={handleLogout} isLoggingOut={isLoggingOut} logoutError={logoutError} />

      <main className="flex-1 bg-app p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">관리자 센터</h1>
              <p className="mt-1 text-sm text-content-secondary">공용 게임 일정 및 유저 추가 요청을 관리합니다.</p>
            </div>
            <nav className="flex items-center gap-2" aria-label="관리자 메뉴">
              <Link
                href="/admin"
                className={`h-10 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                  isSchedulesTab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface-2 text-content-secondary hover:bg-surface-3 hover:text-content"
                }`}
              >
                <Calendar className="h-4 w-4" />
                일정 관리
              </Link>
              <Link
                href="/admin/requests"
                className={`h-10 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                  isRequestsTab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface-2 text-content-secondary hover:bg-surface-3 hover:text-content"
                }`}
              >
                <Inbox className="h-4 w-4" />
                요청 관리
              </Link>
            </nav>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}
