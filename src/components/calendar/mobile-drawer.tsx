import { useEffect, useRef } from "react"
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

const DRAWER_HISTORY_KEY = "chronoledgerMobileDrawer"

function pushDrawerHistoryEntry() {
  window.history.pushState({ ...(window.history.state ?? {}), [DRAWER_HISTORY_KEY]: true }, "")
}

/**
 * 드로어가 열릴 때 히스토리 엔트리를 하나 쌓아 스마트폰 뒤로 가기(popstate)가 라우트 이탈 대신 드로어만 닫게 한다.
 * 딤 클릭/스와이프 등으로 직접 닫으면 history.back()으로 쌓았던 엔트리를 정리한다.
 * Next.js App Router가 popstate 복원에 쓰는 기존 history.state(__NA 등)는 그대로 보존한다.
 */
export function useDrawerHistory(open: boolean, onOpenChange?: (open: boolean) => void) {
  const pushedRef = useRef(false)
  // 직접 닫으며 호출한 history.back()이 만들 popstate를 한 번 무시한다.
  const ignorePopRef = useRef(false)
  // back() 처리 중에 다시 열린 경우 popstate 도착 후 엔트리를 쌓는다.
  const pendingPushRef = useRef(false)
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  useEffect(() => {
    const handlePopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        if (pendingPushRef.current) {
          pendingPushRef.current = false
          pushDrawerHistoryEntry()
          pushedRef.current = true
        }
        return
      }
      if (pushedRef.current) {
        pushedRef.current = false
        onOpenChangeRef.current?.(false)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (open) {
      if (pushedRef.current || pendingPushRef.current) return
      if (ignorePopRef.current) {
        pendingPushRef.current = true
        return
      }
      pushDrawerHistoryEntry()
      pushedRef.current = true
      return
    }

    pendingPushRef.current = false
    if (pushedRef.current) {
      pushedRef.current = false
      ignorePopRef.current = true
      window.history.back()
    }
  }, [open])
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
  useDrawerHistory(Boolean(open), onOpenChange)

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
