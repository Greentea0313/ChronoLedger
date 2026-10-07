"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, CreditCard, LogOut, AlertCircle } from "lucide-react"
import { getKstMonthDateRange } from "@/lib/dashboard-date"
import { RequestSubmissionModal } from "@/components/game/request-submission-modal"

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [plannedExpense, setPlannedExpense] = useState<number | null>(null)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  
  const [totalAsset, setTotalAsset] = useState<number | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)

  const [isDataLoading, setIsDataLoading] = useState(true)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setIsDataLoading(true)
    setExpenseError(null)
    setAssetError(null)

    try {
      const { data: assetData, error: aError } = await supabase
        .from('user_finances')
        .select('total_asset')
        .eq('user_id', user?.id)
        .maybeSingle()

      if (aError) {
        setAssetError("자산 데이터를 불러올 수 없습니다.")
      } else if (!assetData) {
        setAssetError("자산 데이터가 아직 설정되지 않았습니다.")
      } else {
        setTotalAsset(assetData.total_asset)
      }
    } catch {
      setAssetError("자산 데이터를 불러올 수 없습니다.")
    }

    try {
      const { startDate, endDateExclusive } = getKstMonthDateRange(new Date())
      const { data: expenseData, error: eError } = await supabase
        .from('expenses')
        .select('final_amount')
        .eq('user_id', user?.id)
        .eq('status', 'PLANNED')
        .or(`and(end_date.gte.${startDate},end_date.lt.${endDateExclusive}),and(end_date.is.null,target_date.gte.${startDate},target_date.lt.${endDateExclusive})`)

      if (eError) {
        setExpenseError("지출 데이터를 불러올 수 없습니다.")
      } else {
        const total = expenseData.reduce((acc, curr) => acc + curr.final_amount, 0)
        setPlannedExpense(total)
      }
    } catch {
      setExpenseError("지출 데이터를 불러올 수 없습니다.")
    } finally {
      setIsDataLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && user) {
      void fetchDashboardData()
    }
  }, [authLoading, fetchDashboardData, user])

  const handleLogout = async () => {
    setLogoutError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLogoutError(`로그아웃하지 못했습니다: ${error.message}`)
        return
      }
      router.replace("/auth")
    } catch (cause: unknown) {
      const description = cause instanceof Error ? cause.message : String(cause)
      setLogoutError(`로그아웃 중 오류가 발생했습니다: ${description}`)
    }
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">인증 확인 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col items-start justify-between gap-4 pb-4 border-b border-gray-800 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">ChronoLedger</h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email} 님, 환영합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <RequestSubmissionModal />
            <Button variant="outline" onClick={handleLogout} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </header>
        {logoutError && <p role="alert" className="text-sm text-red-400">{logoutError}</p>}

        <div role="status" aria-live="polite" className="sr-only">
          {isDataLoading ? "대시보드 정보를 불러오는 중입니다." : ""}
        </div>
        <div aria-busy={isDataLoading} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">현재 총 자산</CardTitle>
              <Wallet className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              {isDataLoading ? (
                <div aria-hidden="true" className="h-8 bg-gray-700 animate-pulse rounded w-1/2"></div>
              ) : assetError ? (
                <div role="alert" className="flex items-center text-red-400 text-sm mt-2">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {assetError}
                </div>
              ) : (
                <div className="text-3xl font-bold">{totalAsset?.toLocaleString()} 원</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">이번 달 예정 지출</CardTitle>
              <CreditCard className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              {isDataLoading ? (
                <div aria-hidden="true" className="h-8 bg-gray-700 animate-pulse rounded w-1/2"></div>
              ) : expenseError ? (
                <div role="alert" className="flex items-center text-red-400 text-sm mt-2">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {expenseError}
                </div>
              ) : (
                <div className="text-3xl font-bold text-yellow-500">{plannedExpense?.toLocaleString()} 원</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}