"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const EXPENSE_COLUMNS = "id, title, final_amount, status, target_date, end_date, game_id, category, original_price, payment_method"

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
  payment_method: string
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("expenses")
        .select(EXPENSE_COLUMNS)
        .eq("user_id", user.id)
        .order("target_date", { ascending: false })

      if (!error && data) {
        setExpenses(data as ExpenseRow[])
      }
      setIsLoading(false)
    }
    void load()
  }, [user])

  const categoryData = useMemo(() => {
    const sums: Record<string, number> = {}
    for (const exp of expenses) {
      if (exp.status === "CANCELLED") continue
      sums[exp.category] = (sums[exp.category] || 0) + exp.final_amount
    }
    return Object.entries(sums).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
  }, [expenses])

  if (isLoading) return <div className="p-6 text-content">불러오는 중...</div>
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">소비</h1>
        <p className="mt-2 text-sm text-content-secondary">카테고리별 지출 통계 및 전체 내역</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>카테고리별 지출 통계</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {categoryData.length === 0 ? (
              <EmptyState message="지출 내역이 없습니다." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: "#9BA3B2", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{ backgroundColor: "#171A21", borderColor: "#2A2F3A", borderRadius: "8px" }}
                    itemStyle={{ color: "#F5F7FA" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${Number(value).toLocaleString()} 원`, "지출"]}
                  />
                  <Bar dataKey="amount" fill="#7C8CFF" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>전체 지출 내역</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 max-h-[400px] overflow-auto">
            {expenses.length === 0 ? (
              <EmptyState message="지출 내역이 없습니다." />
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 rounded-md border border-line bg-surface-2 text-sm">
                    <div>
                      <p className="font-medium text-content">{expense.title}</p>
                      <p className="text-xs text-content-secondary mt-1">
                        {expense.target_date} · {expense.category} · {expense.payment_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-info">{expense.final_amount.toLocaleString()} 원</p>
                      <p className="text-xs text-content-muted mt-1">{expense.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
