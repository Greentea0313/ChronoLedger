'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        <button 
          onClick={handleLogout} 
          className="p-3 mt-auto rounded border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors text-left"
        >
          로그아웃
        </button>
      </aside>

      {/* 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-900">
        {children}
      </main>
    </div>
  )
}