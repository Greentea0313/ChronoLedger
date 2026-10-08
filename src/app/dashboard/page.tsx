"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { DesktopCalendar, type DesktopCalendarDay } from "@/components/calendar/desktop-calendar"
import { HeroSidebar, type HeroExpenseItem, type HeroWalletItem } from "@/components/calendar/hero-sidebar"
import { MobileDrawer } from "@/components/calendar/mobile-drawer"
import { buildCalendarGrid, getMonthRange } from "@/lib/calendar-utils"
import { ensureMonthlySubscriptionExpenses } from "@/lib/subscription-sync"

interface ScheduleRow {
  id: string
  schedule_type: "VERSION" | "PICKUP"
  start_date: string
  end_date: string
  game_id: string
}

interface MemoRow {
  memo_date: string
  content: string
}

interface ExpenseRow {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  target_date: string
  game_id: string | null
}

interface UserGameRow {
  game_id: string
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAsset, setTotalAsset] = useState<number | null>(null)
  const [budgetAmount, setBudgetAmount] = useState(0)
  const [wallets, setWallets] = useState<HeroWalletItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [memos, setMemos] = useState<MemoRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [userGames, setUserGames] = useState<UserGameRow[]>([])

  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      await ensureMonthlySubscriptionExpenses(user.id, year, month)
      const { startDate, endDateExclusive } = getMonthRange(year, month)

      const [
        financeResult,
        budgetResult,
        walletResult,
        scheduleResult,
        memoResult,
        expenseResult,
        userGameResult,
      ] = await Promise.all([
        supabase.from("user_finances").select("total_asset, default_budget").eq("user_id", user.id).maybeSingle(),
        supabase.from("monthly_budgets").select("budget_amount").eq("user_id", user.id).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("store_wallets").select("platform, current_balance").eq("user_id", user.id),
        supabase.from("game_schedules").select("id, schedule_type, start_date, end_date, game_id").lt("start_date", endDateExclusive).gte("end_date", startDate),
        supabase.from("personal_memos").select("memo_date, content").eq("user_id", user.id).gte("memo_date", startDate).lt("memo_date", endDateExclusive),
        supabase.from("expenses").select("id, title, final_amount, status, target_date, game_id").eq("user_id", user.id).gte("target_date", startDate).lt("target_date", endDateExclusive),
        supabase.from("user_games").select("game_id").eq("user_id", user.id),
      ])

      if (financeResult.error || budgetResult.error || walletResult.error || scheduleResult.error || memoResult.error || expenseResult.error || userGameResult.error) {
        throw new Error("DASHBOARD_FETCH_FAILED")
      }

      setTotalAsset(financeResult.data?.total_asset ?? null)
      const monthlyBudget = budgetResult.data?.budget_amount ?? 0
      setBudgetAmount(monthlyBudget > 0 ? monthlyBudget : (financeResult.data?.default_budget ?? 0))
      setWallets((walletResult.data ?? []) as HeroWalletItem[])
      setSchedules((scheduleResult.data ?? []) as ScheduleRow[])
      setMemos((memoResult.data ?? []) as MemoRow[])
      setExpenses((expenseResult.data ?? []) as ExpenseRow[])
      setUserGames((userGameResult.data ?? []) as UserGameRow[])
    } catch {
      setError("대시보드 데이터를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [month, user, year])

  useEffect(() => {
    if (!authLoading && user) {
      void load()
    }
  }, [authLoading, load, user])

  const dayMemos = useMemo(
    () => memos.filter((memo) => memo.memo_date === selectedDate).map((memo) => memo.content),
    [memos, selectedDate],
  )
  const dayExpenses = useMemo<HeroExpenseItem[]>(
    () =>
      expenses
        .filter((expense) => expense.target_date === selectedDate)
        .map((expense) => ({
          ...expense,
          gameName: expense.game_id ? `게임 ${expense.game_id.slice(0, 4)}` : null,
        })),
    [expenses, selectedDate],
  )
  const expectedExpense = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "PLANNED")
        .reduce((sum, expense) => sum + expense.final_amount, 0),
    [expenses],
  )

  const scheduleDates = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>()
    for (const schedule of schedules) {
      const start = new Date(schedule.start_date)
      const end = new Date(schedule.end_date)
      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
        map.set(key, [...(map.get(key) ?? []), schedule])
      }
    }
    return map
  }, [schedules])

  const memoDates = useMemo(() => new Set(memos.map((memo) => memo.memo_date)), [memos])
  const iconGameIds = useMemo(() => new Set(userGames.map((game) => game.game_id)), [userGames])

  const days = useMemo<DesktopCalendarDay[]>(
    () =>
      buildCalendarGrid(year, month).map((cell) => {
        const daySchedules = scheduleDates.get(cell.date) ?? []
        return {
          ...cell,
          schedules: daySchedules.map((schedule) => ({
            id: schedule.id,
            schedule_type: schedule.schedule_type,
          })),
          icons: daySchedules
            .map((schedule) => schedule.game_id)
            .filter((gameId, index, self) => self.indexOf(gameId) === index)
            .filter((gameId) => iconGameIds.has(gameId))
            .map((gameId) => ({ gameId, label: `게임 ${gameId.slice(0, 4)}`, icon: "🎮" })),
          hasMemo: memoDates.has(cell.date),
        }
      }),
    [iconGameIds, memoDates, month, scheduleDates, year],
  )

  if (authLoading || isLoading) {
    return <div className="p-6 text-white">불러오는 중...</div>
  }
  if (!user) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <DesktopCalendar
            year={year}
            month={month}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <MobileDrawer
            selectedDateLabel={selectedDate}
            totalAsset={totalAsset}
            budgetAmount={budgetAmount}
            expectedExpense={expectedExpense}
            wallets={wallets}
            expenses={dayExpenses}
            memos={dayMemos}
          />
        </div>
        <HeroSidebar
          selectedDateLabel={selectedDate}
          totalAsset={totalAsset}
          budgetAmount={budgetAmount}
          expectedExpense={expectedExpense}
          wallets={wallets}
          expenses={dayExpenses}
          memos={dayMemos}
        />
      </div>
    </div>
  )
}
