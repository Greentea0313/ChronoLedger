import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import {
  HeroSidebarContent,
  type HeroExpenseItem,
  type HeroWalletItem,
  type HeroScheduleItem,
} from "@/components/calendar/hero-sidebar"

interface MobileDrawerProps {
  selectedDateLabel: string
  totalAsset: number | null
  budgetAmount: number
  expectedExpense: number
  confirmedExpense?: number
  wallets: HeroWalletItem[]
  schedules?: HeroScheduleItem[]
  expenses: HeroExpenseItem[]
  memos: string[]
  memoContent?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectExpense?: (expenseId: string) => void
  onRegisterExpense?: () => void
  onSaveMemo?: (content: string) => Promise<void>
  registerDisabled?: boolean
  onIncomeAdded?: () => void
}

export function MobileDrawer({
  selectedDateLabel,
  totalAsset,
  budgetAmount,
  expectedExpense,
  confirmedExpense,
  wallets,
  schedules,
  expenses,
  memos,
  memoContent,
  open,
  onOpenChange,
  onSelectExpense,
  onRegisterExpense,
  onSaveMemo,
  registerDisabled,
  onIncomeAdded,
}: MobileDrawerProps) {
  return (
    <div className="lg:hidden">
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="lg" className="w-full min-h-[44px]">
            선택일 상세
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90dvh] flex flex-col">
          <DrawerHeader className="px-4 pt-3 pb-2 shrink-0 border-b border-line/50 text-left">
            <DrawerTitle className="text-base font-bold text-content">{selectedDateLabel}</DrawerTitle>
            <DrawerDescription className="text-xs text-content-secondary">지출 및 일정 상세</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <HeroSidebarContent
              selectedDateLabel={selectedDateLabel}
              totalAsset={totalAsset}
              budgetAmount={budgetAmount}
              expectedExpense={expectedExpense}
              confirmedExpense={confirmedExpense}
              wallets={wallets}
              schedules={schedules}
              expenses={expenses}
              memos={memos}
              memoContent={memoContent}
              onSelectExpense={onSelectExpense}
              onRegisterExpense={onRegisterExpense}
              onSaveMemo={onSaveMemo}
              registerDisabled={registerDisabled}
              onIncomeAdded={onIncomeAdded}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
