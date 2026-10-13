import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Pencil, Check, X } from "lucide-react"

const PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_PLAY: "Google",
  GALAXY_STORE: "Galaxy",
  NAVER_PAY: "네이버페이",
  ONE_STORE: "OneStore",
}

const PLATFORM_ORDER: Record<string, number> = {
  GOOGLE_PLAY: 1,
  GALAXY_STORE: 2,
  NAVER_PAY: 3,
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
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS"
  start_date: string
  end_date: string
  gameId?: string | null
  gameName?: string | null
  iconUrl?: string
  memo?: string | null
}

interface HeroScheduleGroup {
  key: string
  schedule_type: HeroScheduleItem["schedule_type"]
  start_date: string
  end_date: string
  gameName?: string | null
  iconUrl?: string
  items: HeroScheduleItem[]
}

import { IncomeModal } from "@/components/finance/income-modal"

export interface HeroSidebarProps {
  selectedDateLabel: string
  totalAsset: number | null
  budgetAmount: number
  expectedExpense: number
  wallets: HeroWalletItem[]
  schedules?: HeroScheduleItem[]
  expenses: HeroExpenseItem[]
  memos: string[]
  memoContent?: string
  onSelectExpense?: (expenseId: string) => void
  onRegisterExpense?: () => void
  onSaveMemo?: (content: string) => Promise<void>
  registerDisabled?: boolean
  onIncomeAdded?: () => void
}

export function ScheduleTitleBadges({ title }: { title: string }) {
  if (!title) return null
  if (title.includes("/")) {
    const parts = title.split("/").map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          {parts.map((part, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-surface border border-line text-content"
            >
              {part}
            </span>
          ))}
        </span>
      )
    }
  }
  return <span>{title}</span>
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
  memoContent,
  onSelectExpense,
  onRegisterExpense,
  onSaveMemo,
  registerDisabled,
  onIncomeAdded,
}: HeroSidebarProps) {
  const budgetProgress =
    budgetAmount > 0 ? Math.min(100, Math.round((expectedExpense / budgetAmount) * 100)) : 0
  const budgetRatio = budgetAmount > 0 ? expectedExpense / budgetAmount : 0
  const budgetTone = budgetRatio > 1 ? "bg-danger" : budgetRatio >= 0.8 ? "bg-warning" : "bg-primary"

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const currentMemoText = memoContent !== undefined ? memoContent : (memos[0] || "")
  const [memoInput, setMemoInput] = useState(currentMemoText)
  const [isSavingMemo, setIsSavingMemo] = useState(false)

  useEffect(() => {
    setMemoInput(memoContent !== undefined ? memoContent : (memos[0] || ""))
    setIsEditingMemo(false)
  }, [memoContent, memos, selectedDateLabel])

  // VERSION 일정은 start_date가 선택된 날짜와 일치할 때만 노출
  // 정렬 로직: start_date 오름차순, start_date 일치 시 end_date 오름차순
  const filteredSchedules = (schedules || [])
    .filter((s) => {
      if (s.schedule_type === "VERSION") {
        return s.start_date === selectedDateLabel
      }
      return true
    })
    .sort((a, b) => {
      if (a.start_date !== b.start_date) {
        return a.start_date.localeCompare(b.start_date)
      }
      return a.end_date.localeCompare(b.end_date)
    })

  // 같은 게임 + 같은 유형 + 같은 기간의 일정은 하나의 카드로 묶어서 표시 (정렬 순서 유지)
  const scheduleGroups = filteredSchedules.reduce<HeroScheduleGroup[]>((groups, s) => {
    const gameKey = s.gameId ?? s.gameName ?? ""
    const key = `${gameKey}|${s.schedule_type}|${s.start_date}|${s.end_date}`
    const existing = groups.find((g) => g.key === key)
    if (existing) {
      existing.items.push(s)
    } else {
      groups.push({
        key,
        schedule_type: s.schedule_type,
        start_date: s.start_date,
        end_date: s.end_date,
        gameName: s.gameName,
        iconUrl: s.iconUrl,
        items: [s],
      })
    }
    return groups
  }, [])

  const handleSave = async () => {
    if (!onSaveMemo) return
    setIsSavingMemo(true)
    try {
      await onSaveMemo(memoInput)
      setIsEditingMemo(false)
    } finally {
      setIsSavingMemo(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>요약</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-success border-success/40 hover:bg-success/10"
            onClick={() => setIsIncomeModalOpen(true)}
          >
            + 수익
          </Button>
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
            [...wallets]
              .sort((a, b) => (PLATFORM_ORDER[a.platform] ?? 99) - (PLATFORM_ORDER[b.platform] ?? 99))
              .map((wallet) => (
                <p key={wallet.platform}>
                  {PLATFORM_LABELS[wallet.platform] ?? wallet.platform}: {wallet.current_balance.toLocaleString()}
                  {wallet.platform === "NAVER_PAY" ? "원" : "P"}
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
            {filteredSchedules.length === 0 ? (
              <EmptyState message="해당 일자의 일정이 없습니다." />
            ) : (
              scheduleGroups.map((group) => {
                const isVersion = group.schedule_type === "VERSION"
                const isPickup = group.schedule_type === "PICKUP"
                const isSingle = group.start_date === group.end_date
                const isGrouped = group.items.length > 1
                return (
                  <div
                    key={group.key}
                    className="relative overflow-hidden rounded-md border border-line bg-surface-2 p-3 text-sm flex flex-col gap-1 transition-colors hover:border-line-control"
                  >
                    {group.iconUrl && (
                      <div className="absolute right-0 top-0 bottom-0 w-28 overflow-hidden z-0 pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={group.iconUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-right select-none"
                          style={{
                            maskImage: "linear-gradient(to right, transparent 0%, black 80%)",
                            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 80%)",
                            opacity: 0.45,
                          }}
                        />
                      </div>
                    )}
                    {/* Line 1: [픽업] 명일방주 */}
                    <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          isVersion
                            ? "bg-primary/20 text-primary border-primary/30"
                            : isPickup
                              ? "bg-warning/20 text-warning border-warning/30"
                              : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {isVersion ? "버전" : isPickup ? "픽업" : "콘텐츠"}
                      </span>
                      <span className="text-xs font-semibold text-content">
                        {group.gameName ?? "게임"}
                      </span>
                    </div>

                    {/* Line 2: 2026-10-14 ~ 2026-10-28 */}
                    <div className="relative z-10 text-xs text-content-muted">
                      {isSingle ? `${group.start_date} (단일)` : `${group.start_date} ~ ${group.end_date}`}
                    </div>

                    {/* Line 3: 켈시 에스페란타/클로저 (Title) — 묶인 일정은 목록으로 표시 */}
                    {isGrouped ? (
                      <ul className="relative z-10 flex flex-col gap-0.5">
                        {group.items.map((item) => (
                          <li key={item.id} className="leading-snug">
                            <div className="font-bold text-sm text-content">
                              {item.title.includes("/") ? (
                                <span className="inline-flex items-center gap-1">
                                  <span>•</span>
                                  <ScheduleTitleBadges title={item.title} />
                                </span>
                              ) : (
                                `• ${item.title}`
                              )}
                            </div>
                            {item.memo && (
                              <p className="pl-3 text-[11px] text-content-secondary whitespace-pre-wrap">
                                {item.memo}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        <div className="relative z-10 font-bold text-sm text-content leading-snug">
                          <ScheduleTitleBadges title={group.items[0].title} />
                        </div>

                        {/* Line 4: 메모 (있는 경우) */}
                        {group.items[0].memo && (
                          <p className="relative z-10 text-[11px] text-content-secondary mt-0.5 whitespace-pre-wrap">
                            {group.items[0].memo}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )
              })
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">지출 내역</h3>
            {expenses.length === 0 ? (
              <EmptyState message="해당 일자의 지출이 없습니다." hint="등록 버튼으로 추가할 수 있습니다." />
            ) : (
              expenses.map((expense) => {
                const statusLabel = expense.status === "CONFIRMED" ? "확정" : expense.status === "PLANNED" ? "예정" : "취소"
                const statusTone = expense.status === "CONFIRMED" ? "text-success" : expense.status === "PLANNED" ? "text-info" : "text-danger"
                return (
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
                      <p className={`text-xs mt-0.5 ${statusTone}`}>{statusLabel}</p>
                    </div>
                  </div>
                )
              })
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">메모</h3>
              {!isEditingMemo && onSaveMemo && (
                <button
                  type="button"
                  onClick={() => setIsEditingMemo(true)}
                  className="text-xs text-content-secondary hover:text-content flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {currentMemoText ? "수정" : "작성"}
                </button>
              )}
            </div>

            {isEditingMemo ? (
              <div className="space-y-2">
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  maxLength={200}
                  placeholder="메모를 입력하세요 (최대 200자)"
                  className="w-full h-20 rounded-md border border-line-control bg-surface-2 p-2.5 text-sm text-content focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-content-secondary">
                  <span>{memoInput.length} / 200자</span>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMemoInput(currentMemoText)
                        setIsEditingMemo(false)
                      }}
                      className="h-7 px-2 text-xs"
                      disabled={isSavingMemo}
                    >
                      <X className="w-3 h-3 mr-1" />
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSave()}
                      className="h-7 px-2 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                      disabled={isSavingMemo}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {isSavingMemo ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : currentMemoText ? (
              <p className="rounded-md border border-line bg-surface-2 p-3 text-sm whitespace-pre-wrap">
                {currentMemoText}
              </p>
            ) : (
              <EmptyState message="메모가 없습니다." />
            )}
          </section>
        </CardContent>
      </Card>

      {/* 수익 추가 모달 */}
      <IncomeModal
        open={isIncomeModalOpen}
        onOpenChange={setIsIncomeModalOpen}
        onCompleted={onIncomeAdded}
      />
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
