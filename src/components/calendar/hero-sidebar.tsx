import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
}

export function HeroSidebarContent({
  selectedDateLabel,
  totalAsset,
  budgetAmount,
  expectedExpense,
  wallets,
  expenses,
  memos,
}: HeroSidebarProps) {
  const budgetProgress =
    budgetAmount > 0 ? Math.min(100, Math.round((expectedExpense / budgetAmount) * 100)) : 0

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
          <Progress value={budgetProgress} />
          <p className="text-xs text-gray-400">{`예산 진행률 ${budgetProgress}%`}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스토어 포인트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {wallets.length === 0 ? (
            <p className="text-gray-400">지갑 정보가 없습니다.</p>
          ) : (
            wallets.map((wallet) => (
              <p key={wallet.platform}>
                {wallet.platform}: {wallet.current_balance.toLocaleString()}P
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedDateLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">지출 내역</h3>
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400">해당 일자의 지출이 없습니다.</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="rounded border border-gray-700 bg-gray-900 p-2 text-sm">
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-xs text-gray-400">{expense.gameName ?? "게임 미연결"}</p>
                  <p className="mt-1 text-blue-300">{expense.final_amount.toLocaleString()} 원</p>
                  <p className="text-xs text-gray-400">{expense.status}</p>
                </div>
              ))
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">메모</h3>
            {memos.length === 0 ? (
              <p className="text-sm text-gray-400">메모가 없습니다.</p>
            ) : (
              memos.map((memo, index) => (
                <p key={`${memo}-${index}`} className="rounded border border-gray-700 bg-gray-900 p-2 text-sm">
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
    <aside className="hidden w-[340px] lg:block">
      <HeroSidebarContent {...props} />
    </aside>
  )
}
