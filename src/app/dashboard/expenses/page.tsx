"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ExpenseModal, type PlannedExpenseInput } from "@/components/expense/expense-modal"
import { ExpenseDetailModal, type ExpenseDetail } from "@/components/expense/expense-detail-modal"
import { SubscriptionModal } from "@/components/subscription/subscription-modal"
import { addDays, ensureMonthlySubscriptionExpenses, type SubscriptionCycleType } from "@/lib/subscription-sync"
import { getKstToday } from "@/lib/dashboard-date"
import { GameIcon } from "@/components/ui/game-icon"
import { ExpensesPageSkeleton } from "@/components/ui/page-skeletons"
import { isOffline } from "@/lib/offline-guard"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"

import { preloadImages } from "@/lib/icon-preload"

const EXPENSES_PER_PAGE = 10

function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total]
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, "...", current - 1, current, current + 1, "...", total]
}
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const EXPENSE_COLUMNS =
  "id, title, final_amount, status, cancellation_kind, target_date, end_date, game_id, schedule_id, pickup_schedule_id, template_id, category, original_price, discount_amount, point_discount_amount, used_points, earned_points, payment_method, point_platform, deduct_from_asset, memo, games(name, default_icon_url)"

interface ExpenseRow {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  cancellation_kind?: "PLANNED_CANCEL" | "TEMPLATE_DEACTIVATION" | "PAYMENT_REFUND" | null
  target_date: string
  end_date: string | null
  game_id: string | null
  schedule_id?: string | null
  pickup_schedule_id?: string | null
  template_id?: string | null
  category: string
  original_price: number
  discount_amount?: number
  point_discount_amount?: number
  used_points?: number
  earned_points?: number
  payment_method: string
  point_platform?: string | null
  deduct_from_asset?: boolean
  memo?: string | null
  games?: { name?: string; default_icon_url?: string } | null
}

interface ScheduleItem {
  id: string
  title: string
  schedule_type: string
  game_id: string
}

interface SubscriptionTemplateRow {
  id: string
  title: string
  category: string
  cycle_type?: SubscriptionCycleType
  billing_day: number
  interval_days?: number
  default_price: number
  payment_method: string
  is_active: boolean
  game_id: string | null
  games?: { name?: string; default_icon_url?: string } | null
}

const CATEGORY_COLORS: Record<string, string> = {
  게임: "#7C8CFF",
  "정기 구독": "#4E97FF",
  식비: "#2DD4BF",
  교통: "#FBBF24",
  생활: "#F472B6",
  기타: "#A78BFA",
}

const METHOD_LABELS: Record<string, string> = {
  WALLET: "내 지갑",
  GOOGLE_PLAY: "Google Play",
  GALAXY_STORE: "Galaxy Store",
  NAVER_PAY: "네이버페이",
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "예정",
  CONFIRMED: "확정",
  CANCELLED: "취소됨",
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"expenses" | "subscriptions">("expenses")
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [templates, setTemplates] = useState<SubscriptionTemplateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedInitialRef = useRef(false)

  // 모달 제어 상태
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)
  const [payingExpense, setPayingExpense] = useState<PlannedExpenseInput | null>(null)
  const [detailExpense, setDetailExpense] = useState<ExpenseDetail | null>(null)
  const [editingIntervalTemplate, setEditingIntervalTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [intervalRemainingDays, setIntervalRemainingDays] = useState("30")
  const [isSavingIntervalDays, setIsSavingIntervalDays] = useState(false)

  // 픽업 통계 관련 상태
  const [schedulesMap, setSchedulesMap] = useState<Map<string, ScheduleItem>>(new Map())
  const [selectedPickupGameFilter, setSelectedPickupGameFilter] = useState<string>("ALL")

  const userId = user?.id

  const loadExpenses = useCallback(async () => {
    if (!userId) return
    if (!hasLoadedInitialRef.current) {
      setIsLoading(true)
    }

    if (!isOffline()) {
      const now = new Date()
      try {
        await ensureMonthlySubscriptionExpenses(userId, now.getFullYear(), now.getMonth() + 1)
      } catch (subErr) {
        console.warn("구독 자동 생성 건너뜀 (비차단):", subErr)
      }
    }

    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("user_id", userId)
      .order("target_date", { ascending: false })


    if (!error && data) {
      const rows = data as unknown as ExpenseRow[]
      setExpenses(rows)
      preloadImages(rows.map((e) => e.games?.default_icon_url).filter(Boolean) as string[])
    }
    hasLoadedInitialRef.current = true
    setIsLoading(false)
  }, [userId])

  const loadSubscriptions = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from("subscription_templates")
      .select(
        "id, title, category, cycle_type, billing_day, interval_days, default_price, payment_method, is_active, game_id, games(name, default_icon_url)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      // interval_days 컬럼이 DB에 없는 경우 하위 호환 폴백
      const fallback = await supabase
        .from("subscription_templates")
        .select(
          "id, title, category, cycle_type, billing_day, default_price, payment_method, is_active, game_id, games(name, default_icon_url)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (!fallback.error && fallback.data) {
        const rows = (fallback.data as unknown as SubscriptionTemplateRow[]).map((r) => ({
          ...r,
          interval_days: 30,
        }))
        setTemplates(rows)
        preloadImages(rows.map((t) => t.games?.default_icon_url).filter(Boolean) as string[])
      }
    } else if (data) {
      const rows = data as unknown as SubscriptionTemplateRow[]
      setTemplates(rows)
      preloadImages(rows.map((t) => t.games?.default_icon_url).filter(Boolean) as string[])
    }
  }, [userId])

  const loadSchedules = useCallback(async () => {
    const { data } = await supabase
      .from("game_schedules")
      .select("id, title, schedule_type, game_id")
    if (data) {
      const map = new Map<string, ScheduleItem>()
      for (const item of data) {
        map.set(item.id, item as ScheduleItem)
      }
      setSchedulesMap(map)
    }
  }, [])

  useEffect(() => {
    void loadExpenses()
    void loadSubscriptions()
    void loadSchedules()
  }, [loadExpenses, loadSubscriptions, loadSchedules])

  // 정기 구독 탭 정렬: [게임] (게임명 가나다순) > [정기 구독] (고정 결제 (결제일 오름차순) > 누적 충전형)
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const isGameA = a.category === "게임" || Boolean(a.game_id)
      const isGameB = b.category === "게임" || Boolean(b.game_id)

      // 1. [게임]이 [정기 구독]보다 우선
      if (isGameA && !isGameB) return -1
      if (!isGameA && isGameB) return 1

      // 1-1. [게임] 그룹 내 정렬
      if (isGameA && isGameB) {
        const gameNameA = a.games?.name || ""
        const gameNameB = b.games?.name || ""
        const gameCompare = gameNameA.localeCompare(gameNameB, "ko")
        if (gameCompare !== 0) return gameCompare

        // 동일 게임 내: 고정 결제 (결제일 오름차순) > 누적 충전형 > 버전 패스 순
        const getCycleRank = (cycle?: string) => {
          if (cycle === "MONTHLY_DAY") return 1
          if (cycle === "INTERVAL_30") return 2
          return 3
        }
        const rankDiff = getCycleRank(a.cycle_type) - getCycleRank(b.cycle_type)
        if (rankDiff !== 0) return rankDiff

        if (a.cycle_type === "MONTHLY_DAY") {
          const dayDiff = (a.billing_day || 0) - (b.billing_day || 0)
          if (dayDiff !== 0) return dayDiff
        }

        return a.title.localeCompare(b.title, "ko")
      }

      // 1-2. [정기 구독] 그룹 내 정렬: 고정 결제 (결제일 오름차순) > 누적 충전형 순서
      const getSubRank = (cycle?: string) => {
        if (cycle === "MONTHLY_DAY") return 1
        if (cycle === "INTERVAL_30") return 2
        return 3
      }
      const rankDiff = getSubRank(a.cycle_type) - getSubRank(b.cycle_type)
      if (rankDiff !== 0) return rankDiff

      if (a.cycle_type === "MONTHLY_DAY") {
        const dayDiff = (a.billing_day || 0) - (b.billing_day || 0)
        if (dayDiff !== 0) return dayDiff
      }

      return a.title.localeCompare(b.title, "ko")
    })
  }, [templates])

  // 통계: 오직 CONFIRMED 지출만 집계
  const categoryData = useMemo(() => {
    const sums: Record<string, number> = {}
    let total = 0
    for (const exp of expenses) {
      if (exp.status !== "CONFIRMED") continue
      sums[exp.category] = (sums[exp.category] || 0) + exp.final_amount
      total += exp.final_amount
    }
    return Object.entries(sums)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: CATEGORY_COLORS[category] || "#9BA3B2",
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  // 월별 소비 추이: 오직 CONFIRMED 지출만 집계
  const monthlyData = useMemo(() => {
    const sums: Record<string, number> = {}
    for (const exp of expenses) {
      if (exp.status !== "CONFIRMED") continue
      const monthKey = exp.target_date.slice(0, 7) // 'YYYY-MM'
      sums[monthKey] = (sums[monthKey] || 0) + exp.final_amount
    }
    return Object.entries(sums)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, amount]) => {
        const parts = monthKey.split("-")
        const monthNum = parts[1] ? parseInt(parts[1], 10) : 1
        return {
          monthKey,
          label: `${monthNum}월`,
          amount,
        }
      })
  }, [expenses])

  // 픽업 과금 통계에 표시할 게임 목록
  const gameFilterOptions = useMemo(() => {
    const gamesMap = new Map<string, string>()
    for (const exp of expenses) {
      if (exp.category === "게임" && exp.game_id) {
        gamesMap.set(exp.game_id, exp.games?.name || "게임")
      }
    }
    return Array.from(gamesMap.entries()).map(([id, name]) => ({ id, name }))
  }, [expenses])

  // 픽업별 소비 통계 (오직 CONFIRMED + category === '게임')
  const pickupStatsData = useMemo(() => {
    const targetExpenses = expenses.filter((exp) => {
      if (exp.status !== "CONFIRMED" || exp.category !== "게임") return false
      if (selectedPickupGameFilter !== "ALL" && exp.game_id !== selectedPickupGameFilter) return false
      return true
    })

    const groupMap = new Map<string, { key: string; name: string; amount: number; count: number; isPickup: boolean }>()
    let totalGameSpent = 0

    for (const exp of targetExpenses) {
      totalGameSpent += exp.final_amount
      let key = "GENERAL"
      let name = "버전 일반"
      let isPickup = false

      if (exp.pickup_schedule_id && schedulesMap.has(exp.pickup_schedule_id)) {
        const sched = schedulesMap.get(exp.pickup_schedule_id)!
        key = sched.id
        name = sched.title
        isPickup = true
      }

      const existing = groupMap.get(key)
      if (existing) {
        existing.amount += exp.final_amount
        existing.count += 1
      } else {
        groupMap.set(key, {
          key,
          name,
          amount: exp.final_amount,
          count: 1,
          isPickup,
        })
      }
    }

    const list = Array.from(groupMap.values()).map((item) => ({
      ...item,
      percent: totalGameSpent > 0 ? Math.round((item.amount / totalGameSpent) * 100) : 0,
    }))

    // 금액 내림차순 정렬
    list.sort((a, b) => b.amount - a.amount)

    return {
      totalGameSpent,
      list,
      hasData: list.length > 0,
    }
  }, [expenses, selectedPickupGameFilter, schedulesMap])

  // 전체 지출 내역 페이지네이션 계산
  const totalExpensePages = Math.max(1, Math.ceil(expenses.length / EXPENSES_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalExpensePages) {
      setCurrentPage(totalExpensePages)
    }
  }, [currentPage, totalExpensePages])

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * EXPENSES_PER_PAGE
    return expenses.slice(start, start + EXPENSES_PER_PAGE)
  }, [expenses, currentPage])

  // 액션 핸들러
  const handleAddExpense = () => {
    setPayingExpense(null)
    setIsExpenseModalOpen(true)
  }

  const handleConfirmPlanned = (expense: ExpenseRow) => {
    setPayingExpense({
      id: expense.id,
      title: expense.title,
      original_price: expense.original_price,
      payment_method: expense.payment_method,
      pickup_schedule_id: expense.pickup_schedule_id ?? null,
    })
    setIsExpenseModalOpen(true)
  }

  const handleOpenIntervalEdit = (template: SubscriptionTemplateRow) => {
    setEditingIntervalTemplate(template)
    const today = getKstToday()
    const plannedExp = expenses.find((e) => e.template_id === template.id && e.status === "PLANNED")
    if (plannedExp) {
      const todayMs = new Date(today + "T00:00:00+09:00").getTime()
      const targetMs = new Date(plannedExp.target_date + "T00:00:00+09:00").getTime()
      const diffDays = Math.max(0, Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24)))
      setIntervalRemainingDays(String(diffDays))
    } else {
      setIntervalRemainingDays(String(template.interval_days || 30))
    }
  }

  const handleSaveIntervalDays = async () => {
    if (!user || !editingIntervalTemplate) return
    const days = parseInt(intervalRemainingDays, 10)
    if (isNaN(days) || days < 0) return

    setIsSavingIntervalDays(true)
    const today = getKstToday()
    const newTargetDate = addDays(today, days)

    const plannedExp = expenses.find(
      (e) => e.template_id === editingIntervalTemplate.id && e.status === "PLANNED",
    )

    if (plannedExp) {
      await supabase
        .from("expenses")
        .update({ target_date: newTargetDate })
        .eq("id", plannedExp.id)
    } else {
      await supabase.from("expenses").insert({
        user_id: user.id,
        template_id: editingIntervalTemplate.id,
        game_id: editingIntervalTemplate.game_id,
        title: editingIntervalTemplate.title,
        category: editingIntervalTemplate.category,
        status: "PLANNED" as const,
        target_date: newTargetDate,
        original_price: editingIntervalTemplate.default_price,
        discount_amount: 0,
        point_discount_amount: 0,
        used_points: 0,
        earned_points: 0,
        final_amount: editingIntervalTemplate.default_price,
        payment_method: editingIntervalTemplate.payment_method,
        point_platform:
          editingIntervalTemplate.payment_method === "WALLET"
            ? null
            : editingIntervalTemplate.payment_method,
        deduct_from_asset: true,
      })
    }

    setIsSavingIntervalDays(false)
    setEditingIntervalTemplate(null)
    void loadExpenses()
  }

  const handleAddSubscription = () => {
    setEditingTemplate(null)
    setIsSubscriptionModalOpen(true)
  }

  const handleOpenEditTemplate = (template: SubscriptionTemplateRow) => {
    setEditingTemplate(template)
    setIsSubscriptionModalOpen(true)
  }

  const handleOpenDeleteTemplate = (template: SubscriptionTemplateRow) => {
    setDeletingTemplate(template)
  }

  const handleConfirmDeleteTemplate = async () => {
    if (!user || !deletingTemplate) return
    setIsDeletingTemplate(true)
    try {
      const { error: rpcError } = await supabase.rpc("delete_subscription_template", {
        p_template_id: deletingTemplate.id,
      })

      if (rpcError) {
        try {
          await supabase
            .from("expenses")
            .delete()
            .eq("template_id", deletingTemplate.id)
            .eq("status", "PLANNED")
        } catch {
          // ignore fallback
        }

        const { error: deleteError } = await supabase
          .from("subscription_templates")
          .delete()
          .eq("id", deletingTemplate.id)

        if (deleteError) {
          await supabase
            .from("subscription_templates")
            .update({ is_active: false })
            .eq("id", deletingTemplate.id)
          throw new Error("구독 삭제 권한이 없어 구독이 중지 처리되었습니다. Supabase SQL Editor에서 삭제 정책을 실행해 주세요.")
        }
      }

      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id))
      setDeletingTemplate(null)
      void loadExpenses()
    } catch (err: unknown) {
      console.error("구독 템플릿 삭제 오류:", err)
      alert(err instanceof Error ? err.message : "구독 템플릿을 삭제하지 못했습니다.")
    } finally {
      setIsDeletingTemplate(false)
    }
  }

  const handleCancelPlanned = async (expenseId: string) => {
    const { error } = await supabase.rpc("cancel_planned_expense", { p_expense_id: expenseId })
    if (error) {
      await supabase
        .from("expenses")
        .update({ status: "CANCELLED", cancellation_kind: "PLANNED_CANCEL" })
        .eq("id", expenseId)
    }
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId
          ? { ...e, status: "CANCELLED", cancellation_kind: "PLANNED_CANCEL" }
          : e,
      ),
    )
  }

  const handleRestoreCancelled = async (expenseId: string) => {
    const { error } = await supabase.rpc("restore_cancelled_expense", { p_expense_id: expenseId })
    if (error) {
      await supabase
        .from("expenses")
        .update({ status: "PLANNED", cancellation_kind: null })
        .eq("id", expenseId)
    }
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId ? { ...e, status: "PLANNED", cancellation_kind: null } : e,
      ),
    )
  }

  const handleOpenRefund = (expense: ExpenseRow) => {
    setDetailExpense({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      status: expense.status,
      target_date: expense.target_date,
      original_price: expense.original_price,
      discount_amount: expense.discount_amount,
      point_discount_amount: expense.point_discount_amount,
      used_points: expense.used_points,
      earned_points: expense.earned_points,
      final_amount: expense.final_amount,
      payment_method: expense.payment_method,
      point_platform: expense.point_platform,
      deduct_from_asset: expense.deduct_from_asset,
      gameName: expense.games?.name ?? null,
      pickupTitle: expense.pickup_schedule_id ? schedulesMap.get(expense.pickup_schedule_id)?.title ?? null : null,
    })
  }

  const handleToggleTemplateActive = async (template: SubscriptionTemplateRow) => {
    if (!user) return
    const newActive = !template.is_active
    const { error } = await supabase
      .from("subscription_templates")
      .update({ is_active: newActive })
      .eq("id", template.id)

    if (!error) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_active: newActive } : t)),
      )
      if (newActive) {
        const now = new Date()
        await ensureMonthlySubscriptionExpenses(user.id, now.getFullYear(), now.getMonth() + 1).catch(() => {})
      }
      void loadExpenses()
    }
  }

  const handleModalCompleted = () => {
    setIsExpenseModalOpen(false)
    setPayingExpense(null)
    void loadExpenses()
  }

  const handleRefundCompleted = () => {
    setDetailExpense(null)
    void loadExpenses()
  }

  if (isLoading && !hasLoadedInitialRef.current) return <ExpensesPageSkeleton />
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 헤더 */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">소비</h1>
          <p className="mt-1 text-sm text-content-secondary">카테고리별 지출 통계 및 전체 내역</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "expenses" ? (
            <Button
              onClick={handleAddExpense}
              className="h-10 bg-primary hover:bg-primary-hover text-white font-medium"
            >
              + 지출 추가
            </Button>
          ) : (
            <Button
              onClick={handleAddSubscription}
              className="h-10 bg-primary hover:bg-primary-hover text-white font-medium"
            >
              + 구독 추가
            </Button>
          )}
        </div>
      </header>

      {/* 뷰 전환 서브 탭 */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "expenses" | "subscriptions")}
        className="w-full"
      >
        <TabsList className="bg-surface-2 border border-line">
          <TabsTrigger value="expenses" onClick={() => setActiveTab("expenses")}>
            지출 내역 및 통계
          </TabsTrigger>
          <TabsTrigger value="subscriptions" onClick={() => setActiveTab("subscriptions")}>
            정기 구독
          </TabsTrigger>
        </TabsList>

        {/* 탭 1: 지출 내역 및 통계 */}
        <TabsContent value="expenses" className="space-y-6 mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 카테고리별 지출 비중 (원그래프) */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>카테고리별 지출 비중</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between min-h-[300px]">
                {categoryData.length === 0 ? (
                  <EmptyState message="확정된 지출 내역이 없습니다." hint="결제 완료된 지출만 통계에 집계됩니다." />
                ) : (
                  <>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#171A21",
                              borderColor: "#2A2F3A",
                              borderRadius: "8px",
                            }}
                            itemStyle={{ color: "#F5F7FA" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any, _name: any, props: any) => {
                              const percent = props.payload.percent ?? 0
                              return [`${Number(value).toLocaleString()} 원 (${percent}%)`, props.payload.category]
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 pt-3 border-t border-line">
                      {categoryData.map((item) => (
                        <div key={item.category} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-content-secondary truncate">{item.category}</span>
                          <span className="font-semibold text-content ml-auto">{item.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 월별 소비 추이 (세로 막대그래프) */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>월별 소비 추이</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                {monthlyData.length === 0 ? (
                  <EmptyState message="확정된 소비 추이 데이터가 없습니다." hint="결제 완료된 지출만 추이에 반영됩니다." />
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9BA3B2", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9BA3B2", fontSize: 12 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          tickFormatter={(val: any) => `${Math.round(Number(val) / 10000)}만`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{
                            backgroundColor: "#171A21",
                            borderColor: "#2A2F3A",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "#F5F7FA" }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [`${Number(value).toLocaleString()} 원`, "소비액"]}
                        />
                        <Bar dataKey="amount" fill="#7C8CFF" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 게임 픽업별 과금 분석 (Phase 11.4) */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle>게임 픽업별 과금 분석</CardTitle>
                <p className="text-xs text-content-secondary mt-1">
                  확정 결제 기준 픽업별 소비액과 비중을 분석합니다. 미지정 지출은 &apos;버전 일반&apos;으로 집계됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="pickup-game-filter" className="text-xs text-content-secondary whitespace-nowrap">
                  게임 필터:
                </label>
                <select
                  id="pickup-game-filter"
                  className="h-8 rounded-md border border-line bg-surface-2 px-2.5 text-xs text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={selectedPickupGameFilter}
                  onChange={(e) => setSelectedPickupGameFilter(e.target.value)}
                >
                  <option value="ALL">전체 게임</option>
                  {gameFilterOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="min-h-[260px] pt-4">
              {!pickupStatsData.hasData ? (
                <EmptyState
                  message="확정된 게임 과금 데이터가 없습니다."
                  hint="게임 카테고리의 확정 지출이 등록되면 픽업별 과금액 통계가 표시됩니다."
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-12 items-start">
                  {/* 가로 막대 차트 (좌측 7컬럼) */}
                  <div className="lg:col-span-7 space-y-2">
                    <p className="text-xs font-medium text-content-secondary">픽업별 과금액 (원)</p>
                    <div style={{ height: Math.max(220, pickupStatsData.list.length * 42) }} className="w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pickupStatsData.list}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9BA3B2", fontSize: 11 }}
                            tickFormatter={(val: number) => `${Math.round(val / 10000)}만`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#F5F7FA", fontSize: 12 }}
                            width={110}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                              backgroundColor: "#171A21",
                              borderColor: "#2A2F3A",
                              borderRadius: "8px",
                            }}
                            itemStyle={{ color: "#F5F7FA" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any, _name: any, props: any) => [
                              `${Number(value).toLocaleString()} 원 (${props.payload.percent}%)`,
                              props.payload.isPickup ? "픽업 과금액" : "버전 일반 지출",
                            ]}
                          />
                          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
                            {pickupStatsData.list.map((entry, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={entry.isPickup ? "#7C8CFF" : "#64748B"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 픽업 랭킹 및 비중 카드 (우측 5컬럼) */}
                  <div className="lg:col-span-5 space-y-3 bg-surface-2/60 p-4 rounded-lg border border-line">
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-xs font-semibold text-content">픽업 과금 순위</span>
                      <span className="text-xs text-content-secondary">
                        총 {pickupStatsData.totalGameSpent.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {pickupStatsData.list.map((item, index) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-surface-1/40 hover:bg-surface-1 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold shrink-0 ${
                                index === 0
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                  : index === 1
                                  ? "bg-slate-300/20 text-slate-300 border border-slate-300/40"
                                  : index === 2
                                  ? "bg-amber-700/20 text-amber-600 border border-amber-700/40"
                                  : "bg-surface-2 text-content-muted"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="font-medium text-content truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <span className="font-semibold text-content block">
                              {item.amount.toLocaleString()} 원
                            </span>
                            <span className="text-[11px] text-content-secondary">
                              {item.percent}% ({item.count}건)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 전체 지출 내역 목록 영역 */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>전체 지출 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <EmptyState message="지출 내역이 없습니다." hint="우측 상단 '+ 지출 추가' 버튼으로 새 지출을 등록해 보세요." />
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line text-xs text-content-muted">
                        <tr>
                          <th className="pb-3 font-medium">날짜</th>
                          <th className="pb-3 font-medium">항목명</th>
                          <th className="pb-3 font-medium">카테고리</th>
                          <th className="pb-3 font-medium">결제수단</th>
                          <th className="pb-3 font-medium text-right">결제금액</th>
                          <th className="pb-3 font-medium text-center">상태</th>
                          <th className="pb-3 font-medium text-right">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {paginatedExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-3 text-content-secondary whitespace-nowrap">
                              {expense.target_date}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {expense.games?.default_icon_url && (
                                  <div className="h-6 w-6 rounded overflow-hidden shrink-0">
                                    <GameIcon
                                      src={expense.games.default_icon_url}
                                      alt=""
                                      priority
                                    />
                                  </div>
                                )}
                                <span className="font-medium text-content">{expense.title}</span>
                                {expense.pickup_schedule_id && schedulesMap.has(expense.pickup_schedule_id) && (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/15 text-primary border border-primary/30">
                                    {schedulesMap.get(expense.pickup_schedule_id)!.title}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-content-secondary">{expense.category}</td>
                            <td className="py-3 text-content-secondary whitespace-nowrap">
                              {METHOD_LABELS[expense.payment_method] || expense.payment_method}
                            </td>
                            <td className="py-3 text-right font-semibold text-info whitespace-nowrap">
                              {expense.final_amount.toLocaleString()} 원
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  expense.status === "CONFIRMED"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : expense.status === "PLANNED"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {STATUS_LABELS[expense.status] || expense.status}
                              </span>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              {expense.status === "PLANNED" && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmPlanned(expense)}
                                    className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-white"
                                  >
                                    확정
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleCancelPlanned(expense.id)}
                                    className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                                  >
                                    취소
                                  </Button>
                                </div>
                              )}
                              {expense.status === "CONFIRMED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRefund(expense)}
                                  className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                                >
                                  환불
                                </Button>
                              )}
                              {expense.status === "CANCELLED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleRestoreCancelled(expense.id)}
                                  className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                                >
                                  되돌리기
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {paginatedExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="relative overflow-hidden p-3.5 rounded-lg border border-line bg-surface-2 text-sm space-y-2.5"
                      >
                        {expense.games?.default_icon_url && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-28 bg-no-repeat bg-right bg-cover z-0 pointer-events-none"
                            style={{
                              backgroundImage: `url(${expense.games.default_icon_url})`,
                              maskImage: "linear-gradient(to right, transparent, black)",
                              WebkitMaskImage: "linear-gradient(to right, transparent, black)",
                              opacity: 0.2,
                            }}
                          />
                        )}
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-content">{expense.title}</p>
                              {expense.pickup_schedule_id && schedulesMap.has(expense.pickup_schedule_id) && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary border border-primary/30">
                                  {schedulesMap.get(expense.pickup_schedule_id)!.title}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-content-secondary mt-0.5">
                              {expense.target_date} · {expense.category} ·{" "}
                              {METHOD_LABELS[expense.payment_method] || expense.payment_method}
                            </p>
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                              expense.status === "CONFIRMED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : expense.status === "PLANNED"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {STATUS_LABELS[expense.status] || expense.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-line/60 relative z-10">
                          <p className="font-bold text-info text-base">
                            {expense.final_amount.toLocaleString()} 원
                          </p>
                          <div className="flex items-center gap-1.5">
                            {expense.status === "PLANNED" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmPlanned(expense)}
                                  className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-white"
                                >
                                  확정
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleCancelPlanned(expense.id)}
                                  className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                                >
                                  취소
                                </Button>
                              </>
                            )}
                            {expense.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRefund(expense)}
                                className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                              >
                                환불
                              </Button>
                            )}
                            {expense.status === "CANCELLED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRestoreCancelled(expense.id)}
                                className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                              >
                                되돌리기
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 페이지네이션 바 */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-line text-xs text-content-secondary">
                    <div data-testid="pagination-info">
                      총 <span className="font-semibold text-content">{expenses.length.toLocaleString()}</span>건 중{" "}
                      <span className="font-semibold text-content">
                        {(currentPage - 1) * EXPENSES_PER_PAGE + 1} - {Math.min(currentPage * EXPENSES_PER_PAGE, expenses.length)}
                      </span>
                      건 표시 (페이지 <span className="font-semibold text-content">{currentPage}</span> / {totalExpensePages})
                    </div>

                    {totalExpensePages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          aria-label="이전 페이지"
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">이전</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {getPaginationRange(currentPage, totalExpensePages).map((p, idx) =>
                            p === "..." ? (
                              <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-content-muted select-none">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={`page-${p}`}
                                size="sm"
                                variant={p === currentPage ? "default" : "outline"}
                                onClick={() => setCurrentPage(p as number)}
                                aria-label={`${p} 페이지로 이동`}
                                aria-current={p === currentPage ? "page" : undefined}
                                className={`h-8 w-8 p-0 text-xs ${
                                  p === currentPage
                                    ? "bg-primary text-white font-semibold hover:bg-primary-hover"
                                    : "border-line-control text-content-secondary hover:text-content hover:bg-surface-2"
                                }`}
                              >
                                {p}
                              </Button>
                            ),
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.min(totalExpensePages, p + 1))}
                          disabled={currentPage === totalExpensePages}
                          aria-label="다음 페이지"
                          className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                        >
                          <span className="hidden sm:inline mr-1">다음</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탭 2: 정기 구독 탭 */}
        <TabsContent value="subscriptions" className="space-y-4 mt-6">
          <div>
            <h2 className="text-lg font-bold text-content">정기 구독</h2>
            <p className="text-xs text-content-secondary mt-0.5">
              매월 고정 결제, 누적 충전형, 게임 버전 패스를 관리합니다.
            </p>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  message="등록된 정기 구독이 없습니다."
                  hint="우측 상단 '+ 구독 추가' 버튼을 눌러 정기 결제 항목을 등록하세요."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTemplates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className={`flex flex-col justify-between transition-all border ${
                    tpl.is_active ? "border-line bg-surface" : "border-line/50 bg-surface/50 opacity-60"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {tpl.category}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-content-secondary border border-line">
                          {tpl.cycle_type === "INTERVAL_30"
                            ? `누적 충전형 (${tpl.interval_days || 30}일)`
                            : tpl.cycle_type === "VERSION_PASS"
                            ? "버전 패스형"
                            : `매월 ${tpl.billing_day}일`}
                        </span>
                        {tpl.cycle_type === "INTERVAL_30" && (() => {
                          const plannedExp = expenses.find((e) => e.template_id === tpl.id && e.status === "PLANNED")
                          if (!plannedExp) return null
                          const today = getKstToday()
                          const todayMs = new Date(today + "T00:00:00+09:00").getTime()
                          const targetMs = new Date(plannedExp.target_date + "T00:00:00+09:00").getTime()
                          const diffDays = Math.max(0, Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24)))
                          return (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-info/10 text-info font-medium border border-info/30">
                              남은 {diffDays}일
                            </span>
                          )
                        })()}
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                          tpl.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-content-muted/20 text-content-muted"
                        }`}
                      >
                        {tpl.is_active ? "이용 중" : "중지됨"}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-content mt-2 flex items-center gap-2">
                      {tpl.games?.default_icon_url && (
                        <div className="h-5 w-5 rounded overflow-hidden shrink-0">
                          <GameIcon
                            src={tpl.games.default_icon_url}
                            alt=""
                          />
                        </div>
                      )}
                      <span className="truncate">{tpl.title}</span>
                    </CardTitle>
                    {tpl.games?.name && (
                      <p className="text-xs text-content-secondary">{tpl.games.name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-baseline justify-between pt-2 border-t border-line text-sm">
                      <div>
                        <p className="text-xs text-content-muted">기본 금액</p>
                        <p className="font-bold text-info text-base">
                          {(tpl.default_price ?? 0).toLocaleString()} 원
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-content-muted">결제수단</p>
                        <p className="text-xs text-content font-medium">
                          {METHOD_LABELS[tpl.payment_method] || tpl.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditTemplate(tpl)}
                          className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                        >
                          수정
                        </Button>
                        {tpl.cycle_type === "INTERVAL_30" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenIntervalEdit(tpl)}
                            className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                          >
                            남은 날짜 수정
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleToggleTemplateActive(tpl)}
                          className={`h-7 px-2.5 text-xs border-line-control ${
                            tpl.is_active
                              ? "text-content-secondary hover:text-danger hover:border-danger/50"
                              : "text-primary hover:bg-primary/10"
                          }`}
                        >
                          {tpl.is_active ? "구독 중지" : "구독 재개"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDeleteTemplate(tpl)}
                          aria-label={`${tpl.title} 구독 삭제`}
                          title="구독 삭제"
                          className="h-7 w-7 p-0 text-content-secondary hover:text-danger hover:bg-danger/10 hover:border-danger/50 border-line-control"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 새 지출 등록 및 결제 확정 모달 */}
      <ExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
        onCompleted={handleModalCompleted}
        plannedExpense={payingExpense}
      />

      {/* 결제 취소/환불 모달 */}
      <ExpenseDetailModal
        expense={detailExpense}
        onOpenChange={(open) => {
          if (!open) setDetailExpense(null)
        }}
        onRefunded={handleRefundCompleted}
      />

      {/* 정기 구독 추가/수정 모달 */}
      <SubscriptionModal
        open={isSubscriptionModalOpen}
        onOpenChange={(open) => {
          setIsSubscriptionModalOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        editingTemplate={editingTemplate}
        onCreated={() => {
          void loadSubscriptions()
          void loadExpenses()
        }}
      />

      {/* 누적 충전형 남은 날짜 수정 다이얼로그 */}
      <Dialog
        open={Boolean(editingIntervalTemplate)}
        onOpenChange={(open) => {
          if (!open) setEditingIntervalTemplate(null)
        }}
      >
        <DialogContent className="max-w-md border-line bg-surface text-content">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-content">
              {editingIntervalTemplate?.title} - 남은 날짜 수정
            </DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              현재 남은 충전일수를 입력하면 다음 결제 예정일(D-day)이 자동으로 계산되어 반영됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="interval-remaining-days" className="block text-xs font-medium text-content-secondary mb-1.5">
                현재 남은 일수 (일)
              </label>
              <Input
                id="interval-remaining-days"
                type="number"
                min="0"
                max="365"
                value={intervalRemainingDays}
                onChange={(e) => setIntervalRemainingDays(e.target.value)}
                placeholder="예: 25"
                className="bg-surface-2 border-line text-content"
              />
            </div>
            {(() => {
              const days = parseInt(intervalRemainingDays, 10)
              if (isNaN(days) || days < 0) return null
              const nextDate = addDays(getKstToday(), days)
              return (
                <p className="text-xs text-primary font-medium">
                  오늘({getKstToday()}) 기준 {days}일 후인 <span className="font-bold underline">{nextDate}</span>에 다음 결제가 예정됩니다.
                </p>
              )
            })()}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingIntervalTemplate(null)}
              className="border-line-control text-content-secondary hover:text-content"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveIntervalDays()}
              disabled={
                isSavingIntervalDays ||
                isNaN(parseInt(intervalRemainingDays, 10)) ||
                parseInt(intervalRemainingDays, 10) < 0
              }
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {isSavingIntervalDays ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 정기 구독 삭제 확인 다이얼로그 */}
      <Dialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => {
          if (!open) setDeletingTemplate(null)
        }}
      >
        <DialogContent className="max-w-md border-line bg-surface text-content">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-danger">
              정기 구독 삭제
            </DialogTitle>
            <DialogDescription className="text-sm text-content-secondary">
              정말로 <span className="font-semibold text-content">&quot;{deletingTemplate?.title}&quot;</span> 구독을 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-content-secondary space-y-2">
            <p>
              • 삭제 시 아직 결제되지 않은 <span className="text-warning font-medium">예정(PLANNED)</span> 상태의 회차가 함께 정리됩니다.
            </p>
            <p>
              • 이미 결제가 완료된 과거 지출 내역은 삭제되지 않고 안전하게 보존됩니다.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
              disabled={isDeletingTemplate}
              className="border-line-control text-content-secondary hover:text-content"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmDeleteTemplate()}
              disabled={isDeletingTemplate}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              {isDeletingTemplate ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
