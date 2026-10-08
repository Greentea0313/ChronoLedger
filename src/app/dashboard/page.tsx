"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { DesktopCalendar, type DesktopCalendarDay } from "@/components/calendar/desktop-calendar"
import { HeroSidebar, type HeroExpenseItem, type HeroWalletItem } from "@/components/calendar/hero-sidebar"
import { MobileDrawer } from "@/components/calendar/mobile-drawer"
import { buildCalendarGrid, enumerateDates, getGridRange, getTodayLocalDate, parseLocalDate } from "@/lib/calendar-utils"
import { Button } from "@/components/ui/button"
import { ExpenseModal } from "@/components/expense/expense-modal"
import { ExpenseDetailModal } from "@/components/expense/expense-detail-modal"
import { OverduePlannedModal, type OverduePlannedExpense } from "@/components/expense/overdue-planned-modal"
import { calculateExpectedExpense, findOverduePlannedExpenses } from "@/lib/budget-calculations"
import { getKstToday } from "@/lib/dashboard-date"
import { useOnlineStatus } from "@/lib/use-online-status"
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
  end_date: string | null
  game_id: string | null
  category: string
  original_price: number
  discount_amount: number
  point_discount_amount: number
  used_points: number
  earned_points: number
  payment_method: string
  deduct_from_asset: boolean
  point_platform: string | null
}

interface UserGameRow {
  game_id: string
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAsset, setTotalAsset] = useState<number | null>(null)
  const [budgetAmount, setBudgetAmount] = useState(0)
  const [wallets, setWallets] = useState<HeroWalletItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [memos, setMemos] = useState<MemoRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [userGames, setUserGames] = useState<UserGameRow[]>([])

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const [overdueExpenses, setOverdueExpenses] = useState<OverduePlannedExpense[]>([])
  const [isOverdueOpen, setIsOverdueOpen] = useState(false)
  const [payingExpense, setPayingExpense] = useState<OverduePlannedExpense | null>(null)
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number } | null>(null)

  useEffect(() => {
    const today = getTodayLocalDate()
    const parsed = parseLocalDate(today)
    setSelectedDate(today)
    setViewMonth({ year: parsed.getFullYear(), month: parsed.getMonth() + 1 })
  }, [])

  const baseDate = selectedDate ?? ""
  const year = viewMonth?.year ?? 0
  const month = viewMonth?.month ?? 0
  const ready = viewMonth !== null

  const load = useCallback(async () => {
    if (!user || !ready) return
    setIsLoading(true)
    setError(null)

    try {
      await ensureMonthlySubscriptionExpenses(user.id, year, month)
      const { startDate, endDateExclusive } = getGridRange(year, month)

      const [
        financeResult,
        budgetResult,
        walletResult,
        scheduleResult,
        memoResult,
        expenseResult,
        userGameResult,
        overdueResult,
      ] = await Promise.all([
        supabase.from("user_finances").select("total_asset, default_budget").eq("user_id", user.id).maybeSingle(),
        supabase.from("monthly_budgets").select("budget_amount").eq("user_id", user.id).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("store_wallets").select("platform, current_balance").eq("user_id", user.id),
        supabase.from("game_schedules").select("id, schedule_type, start_date, end_date, game_id").lt("start_date", endDateExclusive).gte("end_date", startDate),
        supabase.from("personal_memos").select("memo_date, content").eq("user_id", user.id).gte("memo_date", startDate).lt("memo_date", endDateExclusive),
        supabase.from("expenses")        .select("id, title, final_amount, status, target_date, end_date, game_id, category, original_price, discount_amount, point_discount_amount, used_points, earned_points, payment_method, deduct_from_asset, point_platform").eq("user_id", user.id).gte("target_date", startDate).lt("target_date", endDateExclusive),
        supabase.from("user_games").select("game_id").eq("user_id", user.id),
                supabase.from("expenses").select("id, title, final_amount, status, target_date, end_date, original_price").eq("user_id", user.id).eq("status", "PLANNED").lt("target_date", getKstToday()),
              ])

              if (financeResult.error || budgetResult.error || walletResult.error || scheduleResult.error || memoResult.error || expenseResult.error || userGameResult.error || overdueResult.error) {
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
      setOverdueExpenses(
        findOverduePlannedExpenses(
          ((overdueResult.data ?? []) as unknown as (OverduePlannedExpense & { status: "PLANNED" | "CONFIRMED" | "CANCELLED" })[]),
          getKstToday(),
        ),
      )
    } catch {
      setError("대시보드 데이터를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [month, ready, user, year])

  useEffect(() => {
    if (!authLoading && user && ready) {
      void load()
    }
  }, [authLoading, load, ready, user])

  const dayMemos = useMemo(
    () => memos.filter((memo) => memo.memo_date === baseDate).map((memo) => memo.content),
    [baseDate, memos],
  )
  const dayExpenses = useMemo<HeroExpenseItem[]>(
    () =>
      expenses
        .filter((expense) => expense.target_date === baseDate)
        .map((expense) => ({
          ...expense,
          gameName: expense.game_id ? `게임 ${expense.game_id.slice(0, 4)}` : null,
        })),
    [baseDate, expenses],
  )
  const detailExpense = useMemo(() => {
    const expense = expenses.find((item) => item.id === detailExpenseId)
    return expense
      ? { ...expense, gameName: expense.game_id ? `게임 ${expense.game_id.slice(0, 4)}` : null }
      : null
  }, [detailExpenseId, expenses])
  const expectedExpense = useMemo(
    () => (ready ? calculateExpectedExpense(expenses, { year, month }) : 0),
    [expenses, month, ready, year],
  )

  const scheduleDates = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>()
    for (const schedule of schedules) {
      for (const key of enumerateDates(schedule.start_date, schedule.end_date)) {
        map.set(key, [...(map.get(key) ?? []), schedule])
      }
    }
    return map
  }, [schedules])

  const memoDates = useMemo(() => new Set(memos.map((memo) => memo.memo_date)), [memos])
  const iconGameIds = useMemo(() => new Set(userGames.map((game) => game.game_id)), [userGames])

  const days = useMemo<DesktopCalendarDay[]>(
    () =>
      (ready ? buildCalendarGrid(year, month) : []).map((cell) => {
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
    [iconGameIds, memoDates, month, ready, scheduleDates, year],
  )

  if (authLoading || isLoading || !ready) {
    return <div className="p-6 text-white">불러오는 중...</div>
  }
  if (!user) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        {overdueExpenses.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setIsOverdueOpen(true)}>
            {`기한 지난 예정 ${overdueExpenses.length}건`}
          </Button>
        )}
        <Button type="button" disabled={!isOnline} onClick={() => setIsExpenseModalOpen(true)}>지출 등록</Button>
      </div>
      <ExpenseModal open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen} onCompleted={() => void load()} />
      <ExpenseModal
        open={payingExpense !== null}
        onOpenChange={(open) => { if (!open) setPayingExpense(null) }}
        plannedExpense={payingExpense}
        onCompleted={() => void load()}
      />
      <OverduePlannedModal
        open={isOverdueOpen}
        expenses={overdueExpenses}
        onOpenChange={setIsOverdueOpen}
        onPay={(expense) => { setIsOverdueOpen(false); setPayingExpense(expense) }}
        onChanged={() => void load()}
      />
      <ExpenseDetailModal
        expense={detailExpense}
        onOpenChange={(open) => { if (!open) setDetailExpenseId(null) }}
        onRefunded={() => void load()}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <DesktopCalendar
            year={year}
            month={month}
            days={days}
            selectedDate={baseDate}
            onSelectDate={setSelectedDate}
          />
          <MobileDrawer
            selectedDateLabel={baseDate}
            totalAsset={totalAsset}
            budgetAmount={budgetAmount}
            expectedExpense={expectedExpense}
            wallets={wallets}
            expenses={dayExpenses}
            memos={dayMemos}
            onSelectExpense={setDetailExpenseId}
          />
        </div>
        <HeroSidebar
          selectedDateLabel={baseDate}
          totalAsset={totalAsset}
          budgetAmount={budgetAmount}
          expectedExpense={expectedExpense}
          wallets={wallets}
          expenses={dayExpenses}
          memos={dayMemos}
          onSelectExpense={setDetailExpenseId}
        />
      </div>
    </div>
  )
}
