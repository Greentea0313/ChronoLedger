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
import { ExpenseModal, type PlannedExpenseInput, type PlannedExpenseEditInput } from "@/components/expense/expense-modal"
import { ExpenseDetailModal, type ExpenseDetail } from "@/components/expense/expense-detail-modal"
import { SubscriptionModal } from "@/components/subscription/subscription-modal"
import { addDays, ensureMonthlySubscriptionExpenses, type SubscriptionCycleType } from "@/lib/subscription-sync"
import { getKstToday } from "@/lib/dashboard-date"
import { GameIcon } from "@/components/ui/game-icon"
import { ExpensesPageSkeleton } from "@/components/ui/page-skeletons"
import { isOffline } from "@/lib/offline-guard"
import { ChevronLeft, ChevronRight, Trash2, History } from "lucide-react"

import { preloadImages } from "@/lib/icon-preload"
import { downloadUserIcon } from "@/lib/storage-upload"
import { IncomeModal } from "@/components/finance/income-modal"

const EXPENSES_PER_PAGE = 10
const SUBSCRIPTIONS_PER_PAGE = 12

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
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const EXPENSE_COLUMNS =
  "id, title, final_amount, status, cancellation_kind, target_date, start_date, end_date, game_id, schedule_id, pickup_schedule_id, template_id, category, original_price, discount_amount, point_discount_amount, used_points, earned_points, payment_method, point_platform, deduct_from_asset, memo, games(name, default_icon_url)"

interface ExpenseRow {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  cancellation_kind?: "PLANNED_CANCEL" | "TEMPLATE_DEACTIVATION" | "PAYMENT_REFUND" | null
  target_date: string
  start_date?: string | null
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
  게임: "#6366F1",
  "정기 구독": "#10B981",
  식비: "#F59E0B",
  교통: "#06B6D4",
  생활: "#EC4899",
  기타: "#8B5CF6",
}

// 게임별 과금 분석 차트용 다중 컬러 팔레트 (게임 간 명확한 시각적 구분)
const GAME_CHART_PALETTE: Array<{ base: string; active: string; stroke: string }> = [
  { base: "#6366F1", active: "#818CF8", stroke: "#4338CA" }, // Indigo
  { base: "#10B981", active: "#34D399", stroke: "#047857" }, // Emerald
  { base: "#F59E0B", active: "#FBBF24", stroke: "#B45309" }, // Amber
  { base: "#EC4899", active: "#F472B6", stroke: "#BE185D" }, // Pink
  { base: "#06B6D4", active: "#22D3EE", stroke: "#0E7490" }, // Cyan
  { base: "#8B5CF6", active: "#A78BFA", stroke: "#6D28D9" }, // Violet
  { base: "#F97316", active: "#FB923C", stroke: "#C2410C" }, // Orange
  { base: "#14B8A6", active: "#2DD4BF", stroke: "#0F766E" }, // Teal
]

const METHOD_LABELS: Record<string, string> = {
  WALLET: "내 지갑",
  NAVER_PAY: "네이버페이",
  GOOGLE_PLAY: "내 지갑 (구 Google Play)",
  GALAXY_STORE: "내 지갑 (구 Galaxy Store)",
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
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)
  const [payingExpense, setPayingExpense] = useState<PlannedExpenseInput | null>(null)
  const [editingPlannedExpense, setEditingPlannedExpense] = useState<PlannedExpenseEditInput | null>(null)
  const [detailExpense, setDetailExpense] = useState<ExpenseDetail | null>(null)
  const [editingIntervalTemplate, setEditingIntervalTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [intervalRemainingDays, setIntervalRemainingDays] = useState("30")
  const [isSavingIntervalDays, setIsSavingIntervalDays] = useState(false)

  // 차트 마우스 호버 하이라이트 상태
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeMonthlyIndex, setActiveMonthlyIndex] = useState<number | null>(null)
  const [activeGameIndex, setActiveGameIndex] = useState<number | null>(null)

  // 사용자 지정 게임 아이콘 URL 맵 (gameId -> objectUrl)
  const [gameIcons, setGameIcons] = useState<Record<string, string>>({})

  const userId = user?.id

  const loadCustomIconsForGameIds = useCallback(async (gameIds: string[]) => {
    if (!userId || gameIds.length === 0) return
    const uniqueIds = Array.from(new Set(gameIds.filter(Boolean)))
    if (uniqueIds.length === 0) return

    const results = await Promise.all(
      uniqueIds.map(async (gid) => {
        const customUrl = await downloadUserIcon(userId, gid)
        return [gid, customUrl] as const
      }),
    )

    const foundEntries = results.filter(([, url]) => Boolean(url)) as Array<[string, string]>
    if (foundEntries.length === 0) return

    setGameIcons((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [gid, url] of foundEntries) {
        if (next[gid] !== url) {
          next[gid] = url
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [userId])

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
      void loadCustomIconsForGameIds(rows.map((e) => e.game_id).filter(Boolean) as string[])
    }
    hasLoadedInitialRef.current = true
    setIsLoading(false)
  }, [userId, loadCustomIconsForGameIds])

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
        void loadCustomIconsForGameIds(rows.map((t) => t.game_id).filter(Boolean) as string[])
      }
    } else if (data) {
      const rows = data as unknown as SubscriptionTemplateRow[]
      setTemplates(rows)
      preloadImages(rows.map((t) => t.games?.default_icon_url).filter(Boolean) as string[])
      void loadCustomIconsForGameIds(rows.map((t) => t.game_id).filter(Boolean) as string[])
    }
  }, [userId, loadCustomIconsForGameIds])

  useEffect(() => {
    void loadExpenses()
    void loadSubscriptions()
  }, [loadExpenses, loadSubscriptions])

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

  const [subscriptionFilter, setSubscriptionFilter] = useState<"ALL" | "GAME" | "OTHER">("ALL")

  const filteredTemplates = useMemo(() => {
    if (subscriptionFilter === "GAME") {
      return sortedTemplates.filter((t) => t.category === "게임" || Boolean(t.game_id))
    }
    if (subscriptionFilter === "OTHER") {
      return sortedTemplates.filter((t) => t.category !== "게임" && !t.game_id)
    }
    return sortedTemplates
  }, [sortedTemplates, subscriptionFilter])

  const [currentSubscriptionPage, setCurrentSubscriptionPage] = useState(1)
  const totalSubscriptionPages = Math.max(1, Math.ceil(filteredTemplates.length / SUBSCRIPTIONS_PER_PAGE))

  useEffect(() => {
    setCurrentSubscriptionPage(1)
  }, [subscriptionFilter])

  useEffect(() => {
    if (currentSubscriptionPage > totalSubscriptionPages) {
      setCurrentSubscriptionPage(totalSubscriptionPages)
    }
  }, [currentSubscriptionPage, totalSubscriptionPages])

  const paginatedTemplates = useMemo(() => {
    const start = (currentSubscriptionPage - 1) * SUBSCRIPTIONS_PER_PAGE
    return filteredTemplates.slice(start, start + SUBSCRIPTIONS_PER_PAGE)
  }, [filteredTemplates, currentSubscriptionPage])

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

  // 선택된 카테고리의 확정 지출 내역 (원그래프 집계와 동일하게 CONFIRMED만, 최신순).
  // 환불 등으로 카테고리가 사라지면 자동으로 접힌 상태가 된다.
  const selectedCategoryExpenses = useMemo(() => {
    if (!selectedCategory || !categoryData.some((c) => c.category === selectedCategory)) return null
    const items = expenses
      .filter((exp) => exp.status === "CONFIRMED" && exp.category === selectedCategory)
      .sort((a, b) => b.target_date.localeCompare(a.target_date))
    return {
      items,
      total: items.reduce((sum, exp) => sum + exp.final_amount, 0),
    }
  }, [expenses, categoryData, selectedCategory])

  const toggleSelectedCategory = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category))
  }

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

  // 게임별 소비 통계 (오직 CONFIRMED + category === '게임')
  const gameStatsData = useMemo(() => {
    const groupMap = new Map<string, { key: string; name: string; amount: number; count: number }>()
    let totalGameSpent = 0

    for (const exp of expenses) {
      if (exp.status !== "CONFIRMED" || exp.category !== "게임") continue
      totalGameSpent += exp.final_amount
      const key = exp.game_id ?? "NONE"
      const existing = groupMap.get(key)
      if (existing) {
        existing.amount += exp.final_amount
        existing.count += 1
      } else {
        groupMap.set(key, {
          key,
          name: exp.game_id ? exp.games?.name || "게임" : "게임 미연결",
          amount: exp.final_amount,
          count: 1,
        })
      }
    }

    const rawList = Array.from(groupMap.values()).map((item) => ({
      ...item,
      percent: totalGameSpent > 0 ? Math.min(100, Math.round((item.amount / totalGameSpent) * 100)) : 0,
    }))
    rawList.sort((a, b) => b.amount - a.amount)

    const list = rawList.map((item, idx) => {
      const palette = GAME_CHART_PALETTE[idx % GAME_CHART_PALETTE.length]
      return { ...item, color: palette.base, activeColor: palette.active, strokeColor: palette.stroke }
    })

    return { totalGameSpent, list, hasData: list.length > 0 }
  }, [expenses])

  // 1. 각 지출의 정렬 및 기간 판정 기준 날짜 (미결제 기간형은 마감일 end_date, 결제 완료 및 특정일은 target_date 기준)
  const getExpenseEffectiveDate = (expense: ExpenseRow): string => {
    if (expense.status === "PLANNED" && expense.end_date) {
      return expense.end_date
    }
    return expense.target_date
  }

  // 2. 전체 지출 내역 날짜 기준 오름차순(과거 -> 미래) 정렬 (동일 날짜는 기존 순서 유지)
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const dateA = getExpenseEffectiveDate(a)
      const dateB = getExpenseEffectiveDate(b)
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return 0
    })
  }, [expenses])

  // 3. (today <= end_date + 7) 기본 노출 vs (today > end_date + 7) 과거 기록 분리
  const { activeExpenses, pastExpenses } = useMemo(() => {
    const today = getKstToday()
    const active: ExpenseRow[] = []
    const past: ExpenseRow[] = []

    for (const exp of sortedExpenses) {
      const effDate = getExpenseEffectiveDate(exp)
      const cutoffDate = addDays(effDate, 7)
      if (today <= cutoffDate) {
        active.push(exp)
      } else {
        past.push(exp)
      }
    }

    // 과거 기록은 최신 과거일수록 먼저 보이도록 내림차순 정렬
    past.sort((a, b) => {
      const dateA = getExpenseEffectiveDate(a)
      const dateB = getExpenseEffectiveDate(b)
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      return 0
    })

    return { activeExpenses: active, pastExpenses: past }
  }, [sortedExpenses])

  const [showPastExpenses, setShowPastExpenses] = useState(false)
  const [hideCancelledExpenses, setHideCancelledExpenses] = useState(true)

  const displayedExpenses = useMemo(() => {
    const baseList = showPastExpenses ? pastExpenses : activeExpenses
    if (hideCancelledExpenses) {
      return baseList.filter((exp) => exp.status !== "CANCELLED")
    }
    return baseList
  }, [showPastExpenses, pastExpenses, activeExpenses, hideCancelledExpenses])

  // 전체 지출 내역 페이지네이션 계산
  const totalExpensePages = Math.max(1, Math.ceil(displayedExpenses.length / EXPENSES_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [showPastExpenses, hideCancelledExpenses])

  useEffect(() => {
    if (currentPage > totalExpensePages) {
      setCurrentPage(totalExpensePages)
    }
  }, [currentPage, totalExpensePages])

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * EXPENSES_PER_PAGE
    return displayedExpenses.slice(start, start + EXPENSES_PER_PAGE)
  }, [displayedExpenses, currentPage])

  // 액션 핸들러
  const handleAddExpense = () => {
    setPayingExpense(null)
    setEditingPlannedExpense(null)
    setIsExpenseModalOpen(true)
  }

  const handleConfirmPlanned = (expense: ExpenseRow) => {
    setEditingPlannedExpense(null)
    setPayingExpense({
      id: expense.id,
      title: expense.title,
      original_price: expense.original_price,
      payment_method: expense.payment_method,
      pickup_schedule_id: expense.pickup_schedule_id ?? null,
      point_platform: expense.point_platform ?? null,
      category: expense.category,
      game_id: expense.game_id ?? null,
      target_date: expense.target_date,
      start_date: expense.start_date,
      end_date: expense.end_date,
      template_id: expense.template_id ?? null,
      memo: expense.memo ?? null,
    })
    setIsExpenseModalOpen(true)
  }

  const handleEditPlanned = (expense: ExpenseRow) => {
    setPayingExpense(null)
    setEditingPlannedExpense({
      id: expense.id,
      title: expense.title,
      original_price: expense.original_price,
      category: expense.category,
      target_date: expense.target_date,
      start_date: expense.start_date,
      end_date: expense.end_date,
      payment_method: expense.payment_method,
      game_id: expense.game_id ?? null,
      pickup_schedule_id: expense.pickup_schedule_id ?? null,
      point_platform: expense.point_platform ?? null,
      memo: expense.memo ?? null,
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

      // 템플릿 삭제는 예정 회차 정리와 함께 원자적으로 처리되는 RPC로만 수행한다 (직접 DELETE는 RLS로 거부됨)
      if (rpcError) throw rpcError

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
      memo: expense.memo ?? null,
      template_id: expense.template_id ?? null,
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
    setEditingPlannedExpense(null)
    void loadExpenses()
  }

  const handleRefundCompleted = () => {
    setDetailExpense(null)
    void loadExpenses()
  }

  if (isLoading && !hasLoadedInitialRef.current) return <ExpensesPageSkeleton />
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="w-full overflow-x-hidden space-y-6 animate-fade-in">
      {/* 헤더 */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">소비</h1>
          <p className="mt-1 text-sm text-content-secondary">카테고리별 지출 통계 및 전체 내역</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "expenses" ? (
            <>
              <Button
                onClick={() => setIsIncomeModalOpen(true)}
                className="h-10 bg-emerald-600 hover:bg-emerald-500 text-primary-foreground font-medium"
              >
                + 수익 추가
              </Button>
              <Button
                onClick={handleAddExpense}
                className="h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
              >
                + 지출 추가
              </Button>
            </>
          ) : (
            <Button
              onClick={handleAddSubscription}
              className="h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
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
                            onMouseLeave={() => setActiveCategoryIndex(null)}
                          >
                            {categoryData.map((entry, index) => {
                              const isHovered = activeCategoryIndex === index
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                  stroke={isHovered ? "#FFFFFF" : "rgb(var(--surface))"}
                                  strokeWidth={isHovered ? 3 : 2}
                                  cursor="pointer"
                                  onMouseEnter={() => setActiveCategoryIndex(index)}
                                  onClick={() => toggleSelectedCategory(entry.category)}
                                  style={{
                                    transition: "all 0.15s ease",
                                    outline: "none",
                                  }}
                                />
                              )
                            })}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgb(var(--surface))",
                              borderColor: "rgb(var(--border))",
                              borderRadius: "8px",
                              color: "rgb(var(--text-primary))",
                            }}
                            itemStyle={{ color: "rgb(var(--text-primary))" }}
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
                      {categoryData.map((item, index) => {
                        const isHovered = activeCategoryIndex === index
                        return (
                          <button
                            type="button"
                            key={item.category}
                            aria-expanded={selectedCategory === item.category}
                            className={`flex items-center gap-2 text-xs p-1.5 rounded-md transition-all cursor-pointer text-left ${
                              isHovered || selectedCategory === item.category
                                ? "bg-surface-2 ring-1 ring-primary/50 shadow-sm"
                                : "hover:bg-surface-2/60"
                            }`}
                            onMouseEnter={() => setActiveCategoryIndex(index)}
                            onMouseLeave={() => setActiveCategoryIndex(null)}
                            onClick={() => toggleSelectedCategory(item.category)}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 transition-all"
                              style={{
                                backgroundColor: item.color,
                                boxShadow: isHovered ? `0 0 8px ${item.color}` : "none",
                                transform: isHovered ? "scale(1.2)" : "scale(1)",
                              }}
                            />
                            <span className={`truncate transition-colors ${isHovered ? "text-content font-medium" : "text-content-secondary"}`}>
                              {item.category}
                            </span>
                            <span className={`font-semibold ml-auto transition-colors ${isHovered ? "text-primary" : "text-content"}`}>
                              {item.percent}%
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {selectedCategory && selectedCategoryExpenses && (
                      <div
                        className="mt-3 rounded-md border border-line bg-surface-2/40"
                        data-testid="category-expense-accordion"
                      >
                        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line">
                          <div className="min-w-0 text-sm font-semibold text-content truncate">
                            {selectedCategory}
                            <span className="ml-2 text-xs font-normal text-content-secondary">
                              {selectedCategoryExpenses.items.length}건 · {selectedCategoryExpenses.total.toLocaleString()} 원
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label="카테고리 내역 닫기"
                            onClick={() => setSelectedCategory(null)}
                          >
                            닫기
                          </Button>
                        </div>
                        <ul className="max-h-60 overflow-y-auto divide-y divide-line">
                          {selectedCategoryExpenses.items.map((exp) => (
                            <li key={exp.id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-surface-2"
                                onClick={() => handleOpenRefund(exp)}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-content">{exp.title}</span>
                                  <span className="block text-content-secondary">{exp.target_date}</span>
                                </span>
                                <span className="shrink-0 font-semibold text-content">
                                  {exp.final_amount.toLocaleString()} 원
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        onMouseLeave={() => setActiveMonthlyIndex(null)}
                      >
                        <CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeDasharray="3 3" opacity={0.6} />
                        <XAxis
                          dataKey="label"
                          axisLine={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
                          tickLine={{ stroke: "rgb(var(--border))" }}
                          tick={{ fill: "rgb(var(--text-secondary))", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
                          tickLine={{ stroke: "rgb(var(--border))" }}
                          tick={{ fill: "rgb(var(--text-secondary))", fontSize: 12 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          tickFormatter={(val: any) => `${Math.round(Number(val) / 10000)}만`}
                        />
                        <Tooltip
                          cursor={false}
                          contentStyle={{
                            backgroundColor: "rgb(var(--surface))",
                            borderColor: "rgb(var(--border))",
                            borderRadius: "8px",
                            color: "rgb(var(--text-primary))",
                          }}
                          itemStyle={{ color: "rgb(var(--text-primary))" }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [`${Number(value).toLocaleString()} 원`, "소비액"]}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={36}>
                          {monthlyData.map((_, index) => {
                            const isHovered = activeMonthlyIndex === index
                            return (
                              <Cell
                                key={`month-${index}`}
                                fill={isHovered ? "#818CF8" : "#6366F1"}
                                stroke={isHovered ? "#FFFFFF" : "#4338CA"}
                                strokeWidth={isHovered ? 2 : 1}
                                cursor="pointer"
                                onMouseEnter={() => setActiveMonthlyIndex(index)}
                                style={{
                                  transition: "all 0.15s ease",
                                }}
                              />
                            )
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 게임별 과금 분석 (Phase 12.21) */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle>게임별 과금 분석</CardTitle>
                <p className="text-xs text-content-secondary mt-1">
                  확정 결제 기준 게임별 소비액과 비중을 분석합니다.
                </p>
              </div>
            </CardHeader>
            <CardContent className="min-h-[260px] pt-4">
              {!gameStatsData.hasData ? (
                <EmptyState
                  message="확정된 게임 과금 데이터가 없습니다."
                  hint="게임 카테고리의 확정 지출이 등록되면 게임별 과금액 통계가 표시됩니다."
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-12 items-start">
                  {/* 가로 막대 차트 (좌측 7컬럼) */}
                  <div className="lg:col-span-7 space-y-2 min-w-0 w-full overflow-hidden">
                    <p className="text-xs font-medium text-content-secondary">게임별 과금액 (원)</p>
                    <div style={{ height: Math.max(220, gameStatsData.list.length * 42) }} className="w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={gameStatsData.list}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                          onMouseLeave={() => setActiveGameIndex(null)}
                        >
                          <CartesianGrid horizontal={false} stroke="rgb(var(--border))" strokeDasharray="3 3" opacity={0.6} />
                          <XAxis
                            type="number"
                            axisLine={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
                            tickLine={{ stroke: "rgb(var(--border))" }}
                            tick={{ fill: "rgb(var(--text-secondary))", fontSize: 11 }}
                            tickFormatter={(val: number) => `${Math.round(val / 10000)}만`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={{ stroke: "rgb(var(--border))", strokeWidth: 1 }}
                            tickLine={{ stroke: "rgb(var(--border))" }}
                            tick={{ fill: "rgb(var(--text-primary))", fontSize: 12, fontWeight: 500 }}
                            width={110}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: "rgb(var(--surface))",
                              borderColor: "rgb(var(--border))",
                              borderRadius: "8px",
                              color: "rgb(var(--text-primary))",
                            }}
                            itemStyle={{ color: "rgb(var(--text-primary))" }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(value: any, _name: any, props: any) => [
                              `${Number(value).toLocaleString()} 원 (${props.payload.percent}%)`,
                              "게임 과금액",
                            ]}
                          />
                          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
                            {gameStatsData.list.map((entry, idx) => {
                              const isHovered = activeGameIndex === idx
                              const baseFill = entry.color
                              const activeFill = entry.activeColor
                              const baseStroke = entry.strokeColor
                              return (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={isHovered ? activeFill : baseFill}
                                  stroke={isHovered ? "#FFFFFF" : baseStroke}
                                  strokeWidth={isHovered ? 2 : 1}
                                  cursor="pointer"
                                  onMouseEnter={() => setActiveGameIndex(idx)}
                                  style={{
                                    transition: "all 0.15s ease",
                                  }}
                                />
                              )
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 게임 랭킹 및 비중 카드 (우측 5컬럼) */}
                  <div className="lg:col-span-5 space-y-3 bg-surface-2/60 p-4 rounded-lg border border-line min-w-0 w-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-xs font-semibold text-content">게임 과금 순위</span>
                      <span className="text-xs text-content-secondary">
                        총 {gameStatsData.totalGameSpent.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {gameStatsData.list.map((item, index) => {
                        const isHovered = activeGameIndex === index
                        return (
                          <div
                            key={item.key}
                            className={`flex items-center justify-between text-xs py-1.5 px-2 rounded transition-all cursor-pointer ${
                              isHovered
                                ? "bg-surface-2 ring-1 ring-primary/50 shadow-sm"
                                : "bg-surface-1/40 hover:bg-surface-1"
                            }`}
                            onMouseEnter={() => setActiveGameIndex(index)}
                            onMouseLeave={() => setActiveGameIndex(null)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span
                                className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold shrink-0 ${
                                  index === 0
                                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                                    : index === 1
                                    ? "bg-slate-400/20 text-slate-700 dark:text-slate-300 border border-slate-400/40"
                                    : index === 2
                                    ? "bg-amber-700/20 text-amber-700 dark:text-amber-500 border border-amber-700/40"
                                    : "bg-surface-2 text-content-muted"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span
                                data-testid={`game-color-dot-${item.key}`}
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className={`font-medium truncate ${isHovered ? "text-primary" : "text-content"}`} title={item.name}>
                                {item.name}
                              </span>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className={`font-semibold block ${isHovered ? "text-primary" : "text-content"}`}>
                                {item.amount.toLocaleString()} 원
                              </span>
                              <span className="text-[11px] text-content-secondary">
                                {item.percent}% ({item.count}건)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 전체 지출 내역 목록 영역 */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
              <div>
                <CardTitle>{showPastExpenses ? "과거 지출 기록" : "전체 지출 내역"}</CardTitle>
                <p className="text-xs text-content-secondary mt-1">
                  {showPastExpenses
                    ? `종료일 기준 7일이 경과한 지난 지출 내역입니다. (총 ${pastExpenses.length}건)`
                    : `진행 중이거나 최근 7일 이내 및 예정 지출 내역입니다. (총 ${activeExpenses.length}건)`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-content-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideCancelledExpenses}
                    onChange={(e) => setHideCancelledExpenses(e.target.checked)}
                    className="rounded border-line bg-surface-2 text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>취소 내역 숨기기</span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPastExpenses((prev) => !prev)}
                  className="text-xs h-8 px-2.5 flex items-center gap-1.5 shrink-0"
                >
                  <History className="h-3.5 w-3.5" />
                  {showPastExpenses ? "최근 내역 보기" : `과거 기록 (${pastExpenses.length})`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {displayedExpenses.length === 0 ? (
                <EmptyState
                  message={showPastExpenses ? "과거 지출 내역이 없습니다." : "최근 지출 내역이 없습니다."}
                  hint={showPastExpenses ? "'최근 내역 보기'를 눌러 돌아갈 수 있습니다." : "우측 상단 '+ 지출 추가' 버튼으로 새 지출을 등록해 보세요."}
                />
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
                                {(() => {
                                  const iconUrl =
                                    (expense.game_id ? gameIcons[expense.game_id] : undefined) ||
                                    expense.games?.default_icon_url
                                  if (!iconUrl) return null
                                  return (
                                    <div className="h-6 w-6 rounded overflow-hidden shrink-0">
                                      <GameIcon
                                        src={iconUrl}
                                        alt=""
                                        priority
                                      />
                                    </div>
                                  )
                                })()}
                                <span className="font-medium text-content">{expense.title}</span>
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
                                    ? "bg-success/15 text-success"
                                    : expense.status === "PLANNED"
                                    ? "bg-warning/15 text-warning"
                                    : "bg-danger/15 text-danger"
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
                                    className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                                  >
                                    확정
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPlanned(expense)}
                                    className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                                  >
                                    수정
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
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRefund(expense)}
                                    className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                                  >
                                    상세 / 수정
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenRefund(expense)}
                                    className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                                  >
                                    환불
                                  </Button>
                                </div>
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
                        {(() => {
                          const iconUrl =
                            (expense.game_id ? gameIcons[expense.game_id] : undefined) ||
                            expense.games?.default_icon_url
                          if (!iconUrl) return null
                          return (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-28 bg-no-repeat bg-right bg-cover z-0 pointer-events-none"
                              style={{
                                backgroundImage: `url(${iconUrl})`,
                                maskImage: "linear-gradient(to right, transparent, black)",
                                WebkitMaskImage: "linear-gradient(to right, transparent, black)",
                                opacity: 0.2,
                              }}
                            />
                          )
                        })()}
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-content">{expense.title}</p>
                            </div>
                            <p className="text-xs text-content-secondary mt-0.5">
                              {expense.target_date} · {expense.category} ·{" "}
                              {METHOD_LABELS[expense.payment_method] || expense.payment_method}
                            </p>
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                              expense.status === "CONFIRMED"
                                ? "bg-success/15 text-success"
                                : expense.status === "PLANNED"
                                ? "bg-warning/15 text-warning"
                                : "bg-danger/15 text-danger"
                            }`}
                          >
                            {STATUS_LABELS[expense.status] || expense.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-line/60 relative z-10">
                          <p className="font-bold text-info text-base">
                            {expense.final_amount.toLocaleString()} 원
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {expense.status === "PLANNED" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmPlanned(expense)}
                                  className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                                >
                                  확정
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditPlanned(expense)}
                                  className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                                >
                                  수정
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
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRefund(expense)}
                                  className="h-7 px-2.5 text-xs text-content-secondary hover:text-content hover:bg-surface-2 border-line-control"
                                >
                                  상세 / 수정
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRefund(expense)}
                                  className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10 border-line-control"
                                >
                                  환불
                                </Button>
                              </>
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
                      총 <span className="font-semibold text-content">{displayedExpenses.length.toLocaleString()}</span>건 중{" "}
                      <span className="font-semibold text-content">
                        {(currentPage - 1) * EXPENSES_PER_PAGE + 1} - {Math.min(currentPage * EXPENSES_PER_PAGE, displayedExpenses.length)}
                      </span>
                      건 표시 (페이지 <span className="font-semibold text-content">{currentPage}</span> / {totalExpensePages})
                    </div>

                    {totalExpensePages > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-1">
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
                                    ? "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                                    : "bg-surface border-line-control text-content hover:bg-surface-2"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-content">정기 구독</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                매월 고정 결제, 누적 충전형, 게임 버전 패스를 관리합니다.
              </p>
            </div>
            {templates.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-center">
                <label htmlFor="subscription-filter" className="text-xs text-content-secondary whitespace-nowrap">
                  카테고리:
                </label>
                <select
                  id="subscription-filter"
                  className="h-8 rounded-md border border-line bg-surface-2 px-2.5 text-xs text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as "ALL" | "GAME" | "OTHER")}
                  aria-label="정기 구독 카테고리 필터"
                >
                  <option value="ALL">전체 ({sortedTemplates.length})</option>
                  <option value="GAME">게임 ({sortedTemplates.filter((t) => t.category === "게임" || Boolean(t.game_id)).length})</option>
                  <option value="OTHER">기타 ({sortedTemplates.filter((t) => t.category !== "게임" && !t.game_id).length})</option>
                </select>
              </div>
            )}
          </div>

          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  message={templates.length === 0 ? "등록된 정기 구독이 없습니다." : "선택한 카테고리의 정기 구독이 없습니다."}
                  hint={templates.length === 0 ? "우측 상단 '+ 구독 추가' 버튼을 눌러 정기 결제 항목을 등록하세요." : "카테고리 필터를 '전체'로 변경해 보세요."}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedTemplates.map((tpl) => (
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
                                {diffDays}일
                              </span>
                            )
                          })()}
                        </div>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                            tpl.is_active
                              ? "bg-success/15 text-success"
                              : "bg-content-muted/20 text-content-muted"
                          }`}
                        >
                          {tpl.is_active ? "이용 중" : "중지됨"}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-content mt-2 flex items-center gap-2">
                        {(() => {
                          const iconUrl =
                            (tpl.game_id ? gameIcons[tpl.game_id] : undefined) ||
                            tpl.games?.default_icon_url
                          if (!iconUrl) return null
                          return (
                            <div className="h-5 w-5 rounded overflow-hidden shrink-0">
                              <GameIcon
                                src={iconUrl}
                                alt=""
                              />
                            </div>
                          )
                        })()}
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

              {totalSubscriptionPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                  <p className="text-xs text-content-secondary">
                    전체 {filteredTemplates.length}개 구독 중{" "}
                    <span className="font-semibold text-content">
                      {currentSubscriptionPage} / {totalSubscriptionPages}
                    </span>{" "}
                    페이지
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentSubscriptionPage((p) => Math.max(1, p - 1))}
                      disabled={currentSubscriptionPage === 1}
                      aria-label="이전 페이지"
                      className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="ml-1">이전</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPaginationRange(currentSubscriptionPage, totalSubscriptionPages).map((p, idx) =>
                        p === "..." ? (
                          <span key={`sub-ellipsis-${idx}`} className="px-1.5 py-1 text-content-muted select-none">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={`sub-page-${p}`}
                            size="sm"
                            variant={p === currentSubscriptionPage ? "default" : "outline"}
                            onClick={() => setCurrentSubscriptionPage(p as number)}
                            aria-label={`${p} 페이지로 이동`}
                            aria-current={p === currentSubscriptionPage ? "page" : undefined}
                            className={`h-8 w-8 p-0 text-xs ${
                              p === currentSubscriptionPage
                                ? "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover"
                                : "bg-surface border-line-control text-content hover:bg-surface-2"
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
                      onClick={() => setCurrentSubscriptionPage((p) => Math.min(totalSubscriptionPages, p + 1))}
                      disabled={currentSubscriptionPage === totalSubscriptionPages}
                      aria-label="다음 페이지"
                      className="h-8 px-2 text-xs border-line-control hover:bg-surface-2 disabled:opacity-40"
                    >
                      <span className="mr-1">다음</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 새 지출 등록 및 결제 확정 / 수정 모달 */}
      <ExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={(open) => {
          setIsExpenseModalOpen(open)
          if (!open) {
            setPayingExpense(null)
            setEditingPlannedExpense(null)
          }
        }}
        onCompleted={handleModalCompleted}
        plannedExpense={payingExpense}
        editingExpense={editingPlannedExpense}
      />

      {/* 수익(자산 증액) 추가 모달 */}
      <IncomeModal
        open={isIncomeModalOpen}
        onOpenChange={setIsIncomeModalOpen}
        onCompleted={() => {
          void loadExpenses()
        }}
      />

      {/* 결제 상세/수정/취소 모달 */}
      <ExpenseDetailModal
        expense={detailExpense}
        onOpenChange={(open) => {
          if (!open) setDetailExpense(null)
        }}
        onRefunded={handleRefundCompleted}
        onUpdated={() => {
          void loadExpenses()
        }}
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
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
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
              className="bg-danger hover:bg-danger/90 text-primary-foreground"
            >
              {isDeletingTemplate ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
