'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { AccountDeletionStatusScreen } from '@/components/auth/account-deletion-status'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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

  const navItems = [
    { href: '/dashboard', icon: '📊', label: '홈 대시보드' },
    { href: '/dashboard/expenses', icon: '💸', label: '가계부 내역' },
    { href: '/dashboard/calendar', icon: '📅', label: '게임 일정' },
    { href: '/dashboard/settings', icon: '⚙️', label: '설정' },
  ]
  const navLinkClass =
    'flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm text-content-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-content'

  return (
    <div className="flex min-h-screen flex-col bg-app text-content md:h-screen md:flex-row md:overflow-hidden">
      {/* 모바일 상단 바 (900px 미만) */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <h2 className="text-lg font-black tracking-tight text-primary">ChronoLedger</h2>
        <ThemeToggle />
      </header>
      <nav aria-label="모바일 메뉴" className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1 md:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`${navLinkClass} shrink-0`}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ))}
      </nav>

      {/* 데스크톱 좌측 사이드바 */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface p-5 md:flex">
        <h2 className="mb-8 text-[22px] font-black tracking-tight text-primary">ChronoLedger</h2>
        <nav aria-label="주요 메뉴" className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle className="mb-2 w-full" />
        {logoutError && <p role="alert" className="mb-3 text-sm text-danger">{logoutError}</p>}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-auto min-h-[44px] rounded-md border border-line-control p-3 text-left text-content-muted transition-colors duration-fast hover:bg-surface-2 hover:text-content disabled:opacity-50"
        >
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </aside>

      {/* 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 bg-app p-4 md:overflow-y-auto md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-content">{children}</div>
        {/* 모바일 로그아웃 */}
        <div className="mt-8 md:hidden">
          {logoutError && <p role="alert" className="mb-3 text-sm text-danger">{logoutError}</p>}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="min-h-[44px] w-full rounded-md border border-line-control p-3 text-content-muted disabled:opacity-50"
          >
            {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>
      </main>
    </div>
  )
}