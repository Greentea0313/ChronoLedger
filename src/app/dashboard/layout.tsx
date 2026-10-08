'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { AccountDeletionStatusScreen } from '@/components/auth/account-deletion-status'
import { Topbar } from '@/components/layout/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const {
    user,
    isLoading,
    isAccountDeletionStatusLoading,
    accountDeletionStatus,
  } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !user && !accountDeletionStatus) {
      router.replace('/auth')
    }
  }, [accountDeletionStatus, isLoading, router, user])

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

  return (
    <div className="flex min-h-screen flex-col bg-app text-content">
      <Topbar onLogout={handleLogout} isLoggingOut={isLoggingOut} logoutError={logoutError} />

      <main className="flex-1 bg-app p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-content">{children}</div>
      </main>
    </div>
  )
}