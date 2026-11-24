import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MonthBudgetBreakdown, TwoMonthBudgetComparison } from "@/lib/budget-calculations"
import { cn } from "@/lib/utils"

interface TwoMonthBudgetCardProps {
  comparison: TwoMonthBudgetComparison
  className?: string
}

function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`
}

function formatMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`
}

function MonthColumn({
  badge,
  data,
}: {
  badge: string
  data: MonthBudgetBreakdown
}) {
  const monthLabel = formatMonthLabel(data.month.year, data.month.month)
  const hasBudget = data.budgetAmount > 0

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-surface px-2 py-0.5 text-xs font-semibold text-content-secondary border border-line">
            {badge}
          </span>
          <h3 className="text-sm font-semibold text-content">{monthLabel}</h3>
        </div>
        {data.isOverBudget && (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
            예산 초과
          </span>
        )}
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-content-secondary">월 예산</dt>
          <dd className={cn("font-medium", hasBudget ? "text-content" : "text-content-secondary")}>
            {hasBudget ? formatKrw(data.budgetAmount) : "예산 미설정"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-content-secondary">확정 지출</dt>
          <dd className="font-medium text-content">{formatKrw(data.confirmedAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-content-secondary">고정 구독 예정 (미생성 포함)</dt>
          <dd className="font-medium text-content">{formatKrw(data.plannedFixedAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-content-secondary">일반 예정 지출</dt>
          <dd className="font-medium text-content">{formatKrw(data.plannedVariableAmount)}</dd>
        </div>
      </dl>

      <div className="border-t border-line pt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-content-secondary">예상 총 지출</span>
          <span className="font-semibold text-content">{formatKrw(data.totalExpectedAmount)}</span>
        </div>
        {hasBudget && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-content-secondary">예상 잔여 예산</span>
            <span className={cn("font-bold", data.isOverBudget ? "text-danger" : "text-primary")}>
              {formatKrw(data.remainingBudget)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** 당월과 익월(2개월)의 예산, 확정·예정·미생성 고정 구독비를 나란히 비교하는 요약 카드. */
export function TwoMonthBudgetCard({ comparison, className }: TwoMonthBudgetCardProps) {
  return (
    <Card data-testid="two-month-budget-card" className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">당월 · 익월 예산 비교</CardTitle>
          <p className="text-xs text-content-secondary">
            미생성 활성 월간 정기 구독 예상액과 예정 지출을 함께 반영합니다.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          <MonthColumn badge="당월" data={comparison.current} />
          <MonthColumn badge="익월" data={comparison.next} />
        </div>
      </CardContent>
    </Card>
  )
}
