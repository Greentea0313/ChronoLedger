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
}

export interface HeroWalletItem {
  platform: string
  current_balance: number
}

interface HeroSidebarProps {
  selectedDateLabel: string
  totalAsset: number | null
  budgetAmount: number
  expectedExpense: number
  wallets: HeroWalletItem[]
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
          <p>{`월 예산: ${budgetAmount.toLocaleString()} 원`}</p>
          <p>{`월 예상 지출: ${expectedExpense.toLocaleString()} 원`}</p>
          <Progress value={budgetProgress} indicatorClassName={budgetTone} />
          <p className="text-xs text-content-muted">{`예산 진행률 ${budgetProgress}%`}</p>
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
              등록
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">지출 내역</h3>
            {expenses.length === 0 ? (
              <EmptyState message="해당 일자의 지출이 없습니다." hint="등록 버튼으로 추가할 수 있습니다." />
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`min-h-[44px] rounded-md border border-line bg-surface-2 p-3 text-sm transition-colors duration-fast${onSelectExpense ? " cursor-pointer hover:border-line-control" : ""}`}
                  role={onSelectExpense ? "button" : undefined}
                  tabIndex={onSelectExpense ? 0 : undefined}
                  aria-label={onSelectExpense ? `${expense.title} 상세` : undefined}
                  onClick={onSelectExpense ? () => onSelectExpense(expense.id) : undefined}
                  onKeyDown={onSelectExpense ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectExpense(expense.id) } } : undefined}
                >
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-xs text-content-muted">{expense.gameName ?? "게임 미연결"}</p>
                  <p className="mt-1 font-semibold text-info">{expense.final_amount.toLocaleString()} 원</p>
                  <p className="text-xs text-content-muted">{expense.status}</p>
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
