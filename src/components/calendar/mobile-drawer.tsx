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
} from "@/components/calendar/hero-sidebar"

interface MobileDrawerProps {
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

export function MobileDrawer({
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
}: MobileDrawerProps) {
  return (
    <div className="lg:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" size="lg" className="w-full min-h-[44px]">
            선택일 상세
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[88dvh] overflow-y-auto p-4">
          <DrawerHeader className="px-1">
            <DrawerTitle>{selectedDateLabel}</DrawerTitle>
            <DrawerDescription>지출/메모 상세</DrawerDescription>
          </DrawerHeader>
          <div className="pb-4">
            <HeroSidebarContent
              selectedDateLabel={selectedDateLabel}
              totalAsset={totalAsset}
              budgetAmount={budgetAmount}
              expectedExpense={expectedExpense}
              wallets={wallets}
              expenses={expenses}
              memos={memos}
              onSelectExpense={onSelectExpense}
              onRegisterExpense={onRegisterExpense}
              registerDisabled={registerDisabled}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
