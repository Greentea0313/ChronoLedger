"use client"

import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { supabase } from "@/lib/supabase/client"
import { formatAmountAxisTick } from "@/lib/chart-format"
import { buildMonthlyCategoryComparison, getPreviousMonthKey, type ReportExpense } from "@/lib/monthly-report"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NotificationPopupProps } from "./notification-payment-popup"

const CURRENT_COLOR = "#6366F1"
const PREVIOUS_COLOR = "rgb(var(--text-secondary))"
const REPORT_FETCH_PAGE_SIZE = 1000

/** 다음 달 1일(YYYY-MM-01). */
function nextMonthStart(month: string): string {
  const [year, mon] = month.split("-").map(Number)
  return mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`
}

const monthLabel = (month: string) => `${Number(month.split("-")[1])}월`

/** 월간 리포트 알림(`MONTHLY_REPORT`) 팝업. 대상 달 = `scheduled_for`의 달. 열릴 때 1회만 조회함. */
export function NotificationReportPopup({
  userId,
  scheduledFor,
  body,
  onNavigate,
  onClose,
  onCloseAutoFocus,
}: NotificationPopupProps & { body: string }) {
  const month = scheduledFor.slice(0, 7)
  const previousMonth = getPreviousMonthKey(month)
  const [expenses, setExpenses] = useState<ReportExpense[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const allExpenses: ReportExpense[] = []
        for (let offset = 0; ; offset += REPORT_FETCH_PAGE_SIZE) {
          const { data, error } = await supabase
            .from("expenses")
            .select("category, final_amount, target_date, status")
            .eq("user_id", userId)
            .eq("status", "CONFIRMED")
            .gte("target_date", `${previousMonth}-01`)
            .lt("target_date", nextMonthStart(month))
            .order("target_date", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + REPORT_FETCH_PAGE_SIZE - 1)
          if (cancelled) return
          if (error || !data) {
            setFailed(true)
            return
          }
          allExpenses.push(...(data as ReportExpense[]))
          if (data.length < REPORT_FETCH_PAGE_SIZE) break
        }
        setExpenses(allExpenses)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, month, previousMonth])

  const comparison = useMemo(() => (expenses ? buildMonthlyCategoryComparison(expenses, month) : null), [expenses, month])
  const currentLabel = monthLabel(month)
  const previousLabel = monthLabel(previousMonth)

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentLabel} 지출 리포트</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <h3 className="text-sm font-semibold text-content">카테고리별 확정 지출 (현재 기준)</h3>
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            리포트 데이터를 불러오지 못함.
          </p>
        ) : comparison === null ? (
          <p className="text-sm text-content-muted">불러오는 중...</p>
        ) : comparison.rows.length === 0 ? (
          <p className="text-sm text-content-muted">확정된 지출 내역이 없음.</p>
        ) : (
          <>
            <div
              role="img"
              aria-label={`${currentLabel}과 ${previousLabel} 카테고리별 확정 지출 차트`}
              className="w-full"
              style={{ height: Math.max(160, comparison.rows.length * 56 + 40) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer={false} data={comparison.rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgb(var(--border))" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    type="number"
                    tickFormatter={formatAmountAxisTick}
                    axisLine={{ stroke: "rgb(var(--border))" }}
                    tickLine={{ stroke: "rgb(var(--border))" }}
                    tick={{ fill: "rgb(var(--text-secondary))", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={64}
                    axisLine={{ stroke: "rgb(var(--border))" }}
                    tickLine={false}
                    tick={{ fill: "rgb(var(--text-secondary))", fontSize: 11 }}
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
                    formatter={(value: unknown) => `${Number(value).toLocaleString("ko-KR")} 원`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="current" name={currentLabel} fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
                  <Bar dataKey="previous" name={previousLabel} fill={PREVIOUS_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="max-h-[30vh] divide-y divide-line overflow-y-auto text-xs">
              {comparison.rows.map((row) => (
                <li key={row.category} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="truncate text-content">{row.category}</span>
                  <span className="shrink-0 tabular-nums text-content-secondary">
                    {currentLabel} {row.current.toLocaleString("ko-KR")}원 · {previousLabel} {row.previous.toLocaleString("ko-KR")}원
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-md px-3 text-sm text-content-secondary hover:bg-surface-2"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onNavigate}
            className="min-h-[40px] rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            지출 관리로 이동
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
