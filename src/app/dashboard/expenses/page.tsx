"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  "id, title, final_amount, status, cancellation_kind, target_date, end_date, game_id, template_id, category, original_price, discount_amount, point_discount_amount, used_points, earned_points, payment_method, point_platform, deduct_from_asset, memo, games(name, default_icon_url)"

interface ExpenseRow {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  cancellation_kind?: "PLANNED_CANCEL" | "TEMPLATE_DEACTIVATION" | "PAYMENT_REFUND" | null
  target_date: string
  end_date: string | null
  game_id: string | null
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
  const [templates, setTemplates] = useState<SubscriptionTemplateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 모달 제어 상태
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [payingExpense, setPayingExpense] = useState<PlannedExpenseInput | null>(null)
  const [detailExpense, setDetailExpense] = useState<ExpenseDetail | null>(null)
  const [editingIntervalTemplate, setEditingIntervalTemplate] = useState<SubscriptionTemplateRow | null>(null)
  const [intervalRemainingDays, setIntervalRemainingDays] = useState("30")
  const [isSavingIntervalDays, setIsSavingIntervalDays] = useState(false)

  const loadExpenses = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("user_id", user.id)
      .order("target_date", { ascending: false })

    if (!error && data) {
      setExpenses(data as unknown as ExpenseRow[])
    }
    setIsLoading(false)
  }, [user])

  const loadSubscriptions = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from("subscription_templates")
      .select(
        "id, title, category, cycle_type, billing_day, default_price, payment_method, is_active, game_id, games(name, default_icon_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setTemplates(data as unknown as SubscriptionTemplateRow[])
    }
  }, [user])

  useEffect(() => {
    void loadExpenses()
    void loadSubscriptions()
  }, [loadExpenses, loadSubscriptions])

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
      setIntervalRemainingDays("30")
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

  if (isLoading) return <div className="p-6 text-content">불러오는 중...</div>
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6">
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
              onClick={() => setIsSubscriptionModalOpen(true)}
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
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-3 text-content-secondary whitespace-nowrap">
                              {expense.target_date}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {expense.games?.default_icon_url && (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={expense.games.default_icon_url}
                                    alt=""
                                    className="h-6 w-6 rounded object-cover shrink-0"
                                  />
                                )}
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
                    {expenses.map((expense) => (
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
                            <p className="font-semibold text-content">{expense.title}</p>
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
              매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.
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
              {templates.map((tpl) => (
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
                            ? "30일 충전형"
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
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tpl.games.default_icon_url}
                          alt=""
                          className="h-5 w-5 rounded object-cover shrink-0"
                        />
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
                    <div className="mt-4 flex items-center justify-end gap-2">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleToggleTemplateActive(tpl)}
                        className={`h-7 px-3 text-xs border-line-control ${
                          tpl.is_active
                            ? "text-content-secondary hover:text-danger hover:border-danger/50"
                            : "text-primary hover:bg-primary/10"
                        }`}
                      >
                        {tpl.is_active ? "구독 중지" : "구독 재개"}
                      </Button>
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

      {/* 새 구독 추가 모달 */}
      <SubscriptionModal
        open={isSubscriptionModalOpen}
        onOpenChange={setIsSubscriptionModalOpen}
        onCreated={() => {
          void loadSubscriptions()
          void loadExpenses()
        }}
      />

      {/* 30일 누적 충전형 남은 날짜 수정 다이얼로그 */}
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
    </div>
  )
}
