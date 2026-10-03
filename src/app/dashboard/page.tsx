'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [asset, setAsset] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFinance = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // user_finances 테이블에서 내 총 자산(total_asset) 가져오기
        const { data } = await supabase
          .from('user_finances')
          .select('total_asset')
          .eq('user_id', user.id)
          .single()
        
        if (data) setAsset(data.total_asset)
      }
      setLoading(false)
    }
    fetchFinance()
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white mb-8">대시보드 요약</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 총 자산 카드 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-sm font-medium text-gray-400 mb-2">현재 총 자산</h2>
          {loading ? (
            <div className="h-10 w-32 bg-gray-700 rounded animate-pulse"></div>
          ) : (
            <p className="text-4xl font-bold text-blue-400">
              {asset?.toLocaleString() || 0} <span className="text-2xl text-gray-500">원</span>
            </p>
          )}
        </div>

        {/* 이번 달 예정된 지출 카드 (임시 틀) */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-sm font-medium text-gray-400 mb-2">이번 달 예정된 지출</h2>
          <p className="text-4xl font-bold text-red-400">
            0 <span className="text-2xl text-gray-500">원</span>
          </p>
        </div>
      </div>
    </div>
  )
}