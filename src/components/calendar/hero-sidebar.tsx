import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

const PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_PLAY: "Google",
  GALAXY_STORE: "Galaxy",
}

export interface HeroExpenseItem {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  gameName: string | null
  iconUrl?: string
  payment_method?: string
}

export interface HeroWalletItem {
  platform: string
  current_balance: number
}

export interface HeroScheduleItem {
  id: string
  schedule_type: "VERSION" | "PICKUP"
  start_date: string
  end_date: string
  gameName?: string | null
  iconUrl?: string
}

interface HeroSidebarProps {
  selectedDateLabel: string
  totalAsset: number | null
  budgetAmount: number
  expectedExpense: number
  wallets: HeroWalletItem[]
  schedules?: HeroScheduleItem[]
  expenses: HeroExpenseItem[]
  memos: string[]
  onSelectExpense?: (expenseId: string) => void
  onRegisterExpense?: () => void
  registerDisabled?: boolean
}

export function HeroSidebarContent({
  selectedDateLabel,
  totalAsset,
  budgetAmount,
  expectedExpense,
  wallets,
  schedules = [],
  expenses,
  memos,
  onSelectExpense,
  onRegisterExpense,
  registerDisabled,
}: HeroSidebarProps) {
  const budgetProgress =
    budgetAmount > 0 ? Math.min(100, Math.round((expectedExpense / budgetAmount) * 100)) : 0
  const budgetRatio = budgetAmount > 0 ? expectedExpense / budgetAmount : 0
  const budgetTone = budgetRatio > 1 ? "bg-danger" : budgetRatio >= 0.8 ? "bg-warning" : "bg-primary"

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{`총 자산: ${totalAsset?.toLocaleString() ?? "-"} 원`}</p>
          <p>{`예상 지출: ${expectedExpense.toLocaleString()} 원`}</p>
          <Progress value={budgetProgress} indicatorClassName={budgetTone} />
          <div className="flex justify-between text-xs text-content-muted">
            <span>{`예산 진행률 ${budgetProgress}%`}</span>
            <span>{`${expectedExpense.toLocaleString()} 원`}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스토어 포인트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {wallets.length === 0 ? (
            <EmptyState message="지갑 정보가 없습니다." hint="설정에서 스토어 포인트를 등록해 보세요." />
          ) : (
            wallets.map((wallet) => (
              <p key={wallet.platform}>
                {PLATFORM_LABELS[wallet.platform] ?? wallet.platform}: {wallet.current_balance.toLocaleString()}P
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{selectedDateLabel}</CardTitle>
          {onRegisterExpense && (
            <Button type="button" size="sm" disabled={registerDisabled} onClick={onRegisterExpense}>
              + 지출 추가
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">게임 일정</h3>
            {(!schedules || schedules.length === 0) ? (
              <EmptyState message="해당 일자의 일정이 없습니다." />
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="relative overflow-hidden flex justify-between items-center min-h-[44px] rounded-md border border-line bg-surface-2 p-3 text-sm">
                  {schedule.iconUrl && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-32 bg-no-repeat bg-right bg-cover z-0"
                      style={{
                        backgroundImage: `url(${schedule.iconUrl})`,
                        maskImage: "linear-gradient(to right, transparent, black)",
                        WebkitMaskImage: "linear-gradient(to right, transparent, black)",
                        opacity: 0.3
                      }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${schedule.schedule_type === 'VERSION' ? 'bg-primary/20 text-primary' : 'bg-info/20 text-info'}`}>
                        {schedule.schedule_type}
                      </span>
                      <span className="font-medium">{schedule.gameName ?? "게임 미연결"}</span>
                    </div>
                  </div>
                  <div className="text-right relative z-10 text-xs text-content-muted">
                    {schedule.start_date} ~ {schedule.end_date}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">지출 내역</h3>
            {expenses.length === 0 ? (
              <EmptyState message="해당 일자의 지출이 없습니다." hint="등록 버튼으로 추가할 수 있습니다." />
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`relative overflow-hidden flex justify-between items-center min-h-[44px] rounded-md border border-line bg-surface-2 p-3 text-sm transition-colors duration-fast${onSelectExpense ? " cursor-pointer hover:border-line-control" : ""}`}
                  role={onSelectExpense ? "button" : undefined}
                  tabIndex={onSelectExpense ? 0 : undefined}
                  aria-label={onSelectExpense ? `${expense.title} 상세` : undefined}
                  onClick={onSelectExpense ? () => onSelectExpense(expense.id) : undefined}
                  onKeyDown={onSelectExpense ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectExpense(expense.id) } } : undefined}
                >
                  {expense.iconUrl && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-32 bg-no-repeat bg-right bg-cover z-0"
                      style={{
                        backgroundImage: `url(${expense.iconUrl})`,
                        maskImage: "linear-gradient(to right, transparent, black)",
                        WebkitMaskImage: "linear-gradient(to right, transparent, black)",
                        opacity: 0.3
                      }}
                    />
                  )}
                  <div className="relative z-10">
                    <p className="font-medium">{expense.title}</p>
                    <p className="text-xs text-content-muted">{expense.gameName ?? "게임 미연결"} · {expense.payment_method === 'WALLET' ? '내 지갑' : (expense.payment_method ?? '')}</p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="font-semibold text-info">{expense.final_amount.toLocaleString()} 원</p>
                    <p className="text-xs text-content-muted mt-1">{expense.status}</p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">메모</h3>
            {memos.length === 0 ? (
              <EmptyState message="메모가 없습니다." />
            ) : (
              memos.map((memo, index) => (
                <p key={`${memo}-${index}`} className="rounded-md border border-line bg-surface-2 p-3 text-sm">
                  {memo}
                </p>
              ))
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

export function HeroSidebar(props: HeroSidebarProps) {
  return (
    <aside className="hidden w-[340px] lg:sticky lg:top-0 lg:block lg:self-start">
      <HeroSidebarContent {...props} />
    </aside>
  )
}
