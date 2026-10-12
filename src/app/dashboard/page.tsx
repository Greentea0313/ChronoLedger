"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { DesktopCalendar, type DesktopCalendarDay } from "@/components/calendar/desktop-calendar"
import { HeroSidebar, type HeroExpenseItem, type HeroScheduleItem, type HeroWalletItem } from "@/components/calendar/hero-sidebar"
import { MobileDrawer } from "@/components/calendar/mobile-drawer"
import { buildCalendarGrid, enumerateDates, getGridRange, getTodayLocalDate, parseLocalDate } from "@/lib/calendar-utils"
import { ExpenseModal } from "@/components/expense/expense-modal"
import { ExpenseDetailModal } from "@/components/expense/expense-detail-modal"
import { OverduePlannedModal, type OverduePlannedExpense } from "@/components/expense/overdue-planned-modal"
import { calculateExpectedExpense, findOverduePlannedExpenses } from "@/lib/budget-calculations"
import { getKstToday } from "@/lib/dashboard-date"
import { useOnlineStatus } from "@/lib/use-online-status"
import { isOffline } from "@/lib/offline-guard"
import { ensureMonthlySubscriptionExpenses } from "@/lib/subscription-sync"
import { DashboardSkeleton } from "@/components/ui/page-skeletons"
import { preloadImages } from "@/lib/icon-preload"

const EXPENSE_COLUMNS = "id, title, final_amount, status, target_date, start_date, end_date, game_id, category, original_price, discount_amount, point_discount_amount, used_points, earned_points, payment_method, deduct_from_asset, point_platform"

interface ScheduleRow {
  id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  start_date: string
  end_date: string
  game_id: string
  memo?: string | null
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
  start_date?: string | null
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
  games: {
    name: string
    default_icon_url: string
  }
}

interface AllGameRow {
  id: string
  name: string
  default_icon_url: string | null
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalAsset, setTotalAsset] = useState<number | null>(null)
  const [budgetAmount, setBudgetAmount] = useState(0)
  const [wallets, setWallets] = useState<HeroWalletItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [memos, setMemos] = useState<MemoRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [userGames, setUserGames] = useState<UserGameRow[]>([])
  const [allGames, setAllGames] = useState<AllGameRow[]>([])

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const [overdueExpenses, setOverdueExpenses] = useState<OverduePlannedExpense[]>([])
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
    if (!hasLoadedInitial) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const today = getKstToday()
      if (!isOffline()) {
        try {
          await ensureMonthlySubscriptionExpenses(user.id, year, month)
        } catch (subErr) {
          console.warn("구독 자동 생성 건너뜀 (비차단):", subErr)
        }
      }
      const { startDate, endDateExclusive } = getGridRange(year, month)

      const [
        financeResult,
        budgetResult,
        walletResult,
        scheduleResult,
        memoResult,
        expenseResult,
        endDateResult,
        userGameResult,
        overdueResult,
        allGamesResult,
      ] = await Promise.all([
        supabase.from("user_finances").select("total_asset, default_budget").eq("user_id", user.id).maybeSingle(),
        supabase.from("monthly_budgets").select("budget_amount").eq("user_id", user.id).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("store_wallets").select("platform, current_balance").eq("user_id", user.id),
        supabase.from("game_schedules").select("id, title, schedule_type, start_date, end_date, game_id, memo").lt("start_date", endDateExclusive).gte("end_date", startDate),
        supabase.from("personal_memos").select("memo_date, content").eq("user_id", user.id).gte("memo_date", startDate).lt("memo_date", endDateExclusive),
        supabase.from("expenses").select(EXPENSE_COLUMNS).eq("user_id", user.id).gte("target_date", startDate).lt("target_date", endDateExclusive),
        supabase.from("expenses").select(EXPENSE_COLUMNS).eq("user_id", user.id).eq("status", "PLANNED").gte("end_date", startDate).lt("end_date", endDateExclusive),
        supabase.from("user_games").select("game_id, games(name, default_icon_url)").eq("user_id", user.id),
        supabase.from("expenses").select("id, title, final_amount, status, target_date, end_date, original_price").eq("user_id", user.id).eq("status", "PLANNED"),
        supabase.from("games").select("id, name, default_icon_url"),
      ])

      if (financeResult.error) console.error("financeResult", financeResult.error)
      if (budgetResult.error) console.error("budgetResult", budgetResult.error)
      if (walletResult.error) console.error("walletResult", walletResult.error)
      if (scheduleResult.error) console.error("scheduleResult", scheduleResult.error)
      if (memoResult.error) console.error("memoResult", memoResult.error)
      if (expenseResult.error) console.error("expenseResult", expenseResult.error)
      if (endDateResult.error) console.error("endDateResult", endDateResult.error)
      if (userGameResult.error) console.error("userGameResult", userGameResult.error)
      if (overdueResult.error) console.error("overdueResult", overdueResult.error)

      if (financeResult.error || budgetResult.error || walletResult.error || scheduleResult.error || memoResult.error || expenseResult.error || endDateResult.error || userGameResult.error || overdueResult.error) {
        throw new Error("DASHBOARD_FETCH_FAILED")
      }

      setTotalAsset(financeResult.data?.total_asset ?? null)
      const monthlyBudget = budgetResult.data?.budget_amount ?? 0
      setBudgetAmount(monthlyBudget > 0 ? monthlyBudget : (financeResult.data?.default_budget ?? 0))
      setWallets((walletResult.data ?? []) as HeroWalletItem[])
      setSchedules((scheduleResult.data ?? []) as ScheduleRow[])
      setMemos((memoResult.data ?? []) as MemoRow[])
      const mergedExpenses = new Map<string, ExpenseRow>()
      for (const row of [...(expenseResult.data ?? []), ...(endDateResult.data ?? [])] as ExpenseRow[]) {
        mergedExpenses.set(row.id, row)
      }
      setExpenses(Array.from(mergedExpenses.values()))
      const userGameRows = (userGameResult.data ?? []) as unknown as UserGameRow[]
      const allGameRows = (allGamesResult.data ?? []) as AllGameRow[]
      setUserGames(userGameRows)
      setAllGames(allGameRows)
      preloadImages([
        ...userGameRows.map((g) => g.games?.default_icon_url),
        ...allGameRows.map((g) => g.default_icon_url),
      ].filter(Boolean) as string[])
      setOverdueExpenses(
        findOverduePlannedExpenses(
          ((overdueResult.data ?? []) as unknown as (OverduePlannedExpense & { status: "PLANNED" | "CONFIRMED" | "CANCELLED" })[]),
          today,
        ),
      )
    } catch {
      setError("대시보드 데이터를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
      setHasLoadedInitial(true)
    }
  }, [hasLoadedInitial, month, ready, user, year])

  useEffect(() => {
    if (!authLoading && user && ready) {
      void load()
    }
  }, [authLoading, load, ready, user])

  const userGamesMap = useMemo(() => {
    const map = new Map<string, { name: string, iconUrl: string }>()
    userGames.forEach(g => {
      if (g.games) {
        map.set(g.game_id, { name: g.games.name, iconUrl: g.games.default_icon_url })
      }
    })
    return map
  }, [userGames])

  const allGamesMap = useMemo(() => {
    const map = new Map<string, { name: string; iconUrl?: string }>()
    allGames.forEach((g) => {
      map.set(g.id, { name: g.name, iconUrl: g.default_icon_url || undefined })
    })
    return map
  }, [allGames])

  const currentDayMemo = useMemo(
    () => memos.find((memo) => memo.memo_date === baseDate)?.content || "",
    [baseDate, memos],
  )

  const dayMemos = useMemo(
    () => memos.filter((memo) => memo.memo_date === baseDate).map((memo) => memo.content),
    [baseDate, memos],
  )

  const dayExpenses = useMemo<HeroExpenseItem[]>(
    () =>
      expenses
        .filter((expense) => expense.target_date === baseDate && expense.status !== "CANCELLED")
        .map((expense) => {
          const gameInfo = expense.game_id ? userGamesMap.get(expense.game_id) : null
          return {
            id: expense.id,
            title: expense.title,
            final_amount: expense.final_amount,
            status: expense.status,
            gameName: gameInfo ? gameInfo.name : (expense.game_id ? `게임 ${expense.game_id.slice(0, 4)}` : null),
            iconUrl: gameInfo?.iconUrl,
            payment_method: expense.payment_method,
          }
        }),
    [baseDate, expenses, userGamesMap],
  )
  const userGameIdSet = useMemo(() => new Set(userGames.map((g) => g.game_id)), [userGames])

  // 사용자가 구독한 게임의 일정만 캘린더에 표시 (구독하지 않은 게임의 공용 일정은 표시 제외)
  const subscribedSchedules = useMemo(
    () => schedules.filter((s) => !s.game_id || userGameIdSet.has(s.game_id)),
    [schedules, userGameIdSet],
  )

  const daySchedules = useMemo<HeroScheduleItem[]>(() => {
    const currentDaySchedules = subscribedSchedules
      .filter((s) => baseDate >= s.start_date && baseDate <= s.end_date)
      .sort((a, b) => {
        if (a.start_date !== b.start_date) {
          return a.start_date.localeCompare(b.start_date)
        }
        return a.end_date.localeCompare(b.end_date)
      })
    return currentDaySchedules.map((s) => {
        const gameInfo = s.game_id ? allGamesMap.get(s.game_id) : null
        return {
          id: s.id,
          title: s.title,
          schedule_type: s.schedule_type,
          start_date: s.start_date,
          end_date: s.end_date,
          gameId: s.game_id,
          gameName: gameInfo ? gameInfo.name : null,
          iconUrl: gameInfo?.iconUrl,
          memo: s.memo,
        }
      })
    },
    [baseDate, subscribedSchedules, allGamesMap],
  )

  const handleSaveMemo = async (content: string) => {
    if (!user || !baseDate) return
    const trimmed = content.trim()
    if (trimmed === "") {
      const { error: delErr } = await supabase
        .from("personal_memos")
        .delete()
        .eq("user_id", user.id)
        .eq("memo_date", baseDate)
      if (delErr) throw delErr
    } else {
      const { error: upsertErr } = await supabase
        .from("personal_memos")
        .upsert(
          {
            user_id: user.id,
            memo_date: baseDate,
            content: trimmed,
          },
          { onConflict: "user_id,memo_date" }
        )
      if (upsertErr) throw upsertErr
    }
    await load()
  }

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
    for (const schedule of subscribedSchedules) {
      for (const key of enumerateDates(schedule.start_date, schedule.end_date)) {
        map.set(key, [...(map.get(key) ?? []), schedule])
      }
    }
    return map
  }, [subscribedSchedules])

  // 캘린더 타일 아이콘 매핑:
  // 공식 일정: 사용자가 구독한 게임의 start_date에만 아이콘 등록 (지출 아이콘은 등록하지 않음)
  const dateGameIcons = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const addGame = (date: string, gameId: string) => {
      if (!map.has(date)) map.set(date, new Set())
      map.get(date)!.add(gameId)
    }

    for (const schedule of subscribedSchedules) {
      if (schedule.game_id && schedule.start_date) {
        addGame(schedule.start_date, schedule.game_id)
      }
    }

    return map
  }, [subscribedSchedules])

  const memoDates = useMemo(() => new Set(memos.map((memo) => memo.memo_date)), [memos])

  const days = useMemo<DesktopCalendarDay[]>(
    () =>
      (ready ? buildCalendarGrid(year, month) : []).map((cell) => {
        const daySchedules = scheduleDates.get(cell.date) ?? []
        const gameIdSet = dateGameIcons.get(cell.date) ?? new Set()
        const dayIcons = Array.from(gameIdSet)
          .filter((gameId) => allGamesMap.has(gameId))
          .map((gameId) => {
            const gameInfo = allGamesMap.get(gameId)!
            return { gameId, label: gameInfo.name, iconUrl: gameInfo.iconUrl }
          })
          .sort((a, b) => a.label.localeCompare(b.label, "ko"))

        return {
          ...cell,
          schedules: daySchedules.map((schedule) => ({
            id: schedule.id,
            schedule_type: schedule.schedule_type,
            is_start_date: schedule.start_date === cell.date,
            game_id: schedule.game_id,
          })),
          icons: dayIcons,
          hasMemo: memoDates.has(cell.date),
        }
      }),
    [allGamesMap, dateGameIcons, memoDates, month, ready, scheduleDates, year],
  )

  if (authLoading || (!hasLoadedInitial && isLoading) || !ready) {
    return <DashboardSkeleton />
  }
  if (!user) {
    return <div className="p-6 text-white">로그인이 필요합니다.</div>
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {error && <p role="alert" className="text-red-400">{error}</p>}
      {overdueExpenses.length > 0 && (
        <div className="flex items-center justify-end">
          <span className="text-sm text-warning">{`기한 지난 예정 ${overdueExpenses.length}건을 정리해야 합니다.`}</span>
        </div>
      )}
      <ExpenseModal open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen} initialDate={baseDate} onCompleted={() => void load()} />
      <ExpenseModal
        open={payingExpense !== null}
        onOpenChange={(open) => { if (!open) setPayingExpense(null) }}
        plannedExpense={payingExpense}
        onCompleted={() => void load()}
      />
      <OverduePlannedModal
        open={overdueExpenses.length > 0 && payingExpense === null}
        expenses={overdueExpenses}
        onPay={setPayingExpense}
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
            onPrevMonth={() => setViewMonth(prev => prev ? { year: prev.month === 1 ? prev.year - 1 : prev.year, month: prev.month === 1 ? 12 : prev.month - 1 } : null)}
            onNextMonth={() => setViewMonth(prev => prev ? { year: prev.month === 12 ? prev.year + 1 : prev.year, month: prev.month === 12 ? 1 : prev.month + 1 } : null)}
          />
          <MobileDrawer
            selectedDateLabel={baseDate}
            totalAsset={totalAsset}
            budgetAmount={budgetAmount}
            expectedExpense={expectedExpense}
            wallets={wallets}
            schedules={daySchedules}
            expenses={dayExpenses}
            memos={dayMemos}
            onSelectExpense={setDetailExpenseId}
            onRegisterExpense={() => setIsExpenseModalOpen(true)}
            registerDisabled={!isOnline}
          />
        </div>
        <HeroSidebar
          selectedDateLabel={baseDate}
          totalAsset={totalAsset}
          budgetAmount={budgetAmount}
          expectedExpense={expectedExpense}
          wallets={wallets}
          schedules={daySchedules}
          expenses={dayExpenses}
          memos={dayMemos}
          memoContent={currentDayMemo}
          onSelectExpense={setDetailExpenseId}
          onRegisterExpense={() => setIsExpenseModalOpen(true)}
          onSaveMemo={handleSaveMemo}
          registerDisabled={!isOnline}
        />
      </div>
    </div>
  )
}
