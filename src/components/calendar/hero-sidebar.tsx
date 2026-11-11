import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Pencil, Check, X, ChevronDown } from "lucide-react"
import { insertTabOnKeyDown } from "@/lib/textarea-tab"
import { PickupAvatars, type PickupAvatar } from "@/components/calendar/pickup-avatars"
import { FavoriteScheduleActions } from "@/components/calendar/favorite-schedule-actions"
import { ScheduleTypeBadge } from "@/components/calendar/schedule-type-badge"
import { getDdayLabel, getPeriodProgress, getTodayLocalDate } from "@/lib/calendar-utils"
import { formatChildSummary, getVersionParents } from "@/lib/version-schedule-groups"

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

const METHOD_LABELS: Record<string, string> = {
  WALLET: "내 지갑",
  NAVER_PAY: "네이버페이",
  GOOGLE_PLAY: "내 지갑 (구 Google Play)",
  GALAXY_STORE: "내 지갑 (구 Galaxy Store)",
}

export interface HeroExpenseItem {
  id: string
  title: string
  final_amount: number
  status: "PLANNED" | "CONFIRMED" | "CANCELLED"
  gameName: string | null
  iconUrl?: string
  payment_method?: string
  /** PLANNED payment due date (end_date ?? target_date) for the D-n badge. */
  dueDate?: string | null
  /** Start of the PLANNED period; with dueDate it drives the progress bar. */
  periodStart?: string | null
}

export interface HeroWalletItem {
  platform: string
  current_balance: number
}

export interface HeroScheduleItem {
  id: string
  title: string
  schedule_type: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST"
  start_date: string
  end_date: string
  is_official?: boolean
  is_rerun?: boolean
  pickupAvatars?: PickupAvatar[]
  gameId?: string | null
  gameName?: string | null
  iconUrl?: string
  memo?: string | null
}

interface HeroScheduleGroup {
  key: string
  schedule_type: HeroScheduleItem["schedule_type"]
  is_rerun: boolean
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
  confirmedExpense?: number
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
  /** KST today (YYYY-MM-DD) used by D-n badges and progress bars. */
  todayDate?: string
  /** R35: the user's favourite schedule ids. Together with onToggleFavorite it enables the star toggle (omit for guests). */
  favoriteScheduleIds?: ReadonlySet<string>
  onToggleFavorite?: (scheduleId: string) => void
  /** R35: shown on favourited schedules; opens the planned-expense modal prefilled from the schedule. */
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
  confirmedExpense,
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
  todayDate,
  favoriteScheduleIds,
  onToggleFavorite,
}: HeroSidebarProps) {
  const today = todayDate ?? getTodayLocalDate()
  const confirmed = confirmedExpense ?? 0
  const progress =
    expectedExpense > 0 ? Math.min(100, Math.round((confirmed / expectedExpense) * 100)) : 0
  const remainingExpected = Math.max(0, expectedExpense - confirmed)

  const [selectedDetailTab, setSelectedDetailTab] = useState<"SCHEDULE" | "EXPENSE" | "MEMO">("SCHEDULE")
  const [showAllOngoing, setShowAllOngoing] = useState(false)
  const [openVersionKeys, setOpenVersionKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const currentMemoText = memoContent !== undefined ? memoContent : (memos[0] || "")
  const [memoInput, setMemoInput] = useState(currentMemoText)
  const [isSavingMemo, setIsSavingMemo] = useState(false)

  useEffect(() => {
    setMemoInput(memoContent !== undefined ? memoContent : (memos[0] || ""))
    setIsEditingMemo(false)
  }, [memoContent, memos, selectedDateLabel])

  // 기본: VERSION은 시작일만, 그 외 일정은 시작일/종료일만 노출. 토글 ON: 선택일에 진행 중인 모든 일정 노출
  // 정렬 로직: start_date 내림차순, start_date 일치 시 end_date 오름차순
  const filteredSchedules = (schedules || [])
    .filter((s) => {
      if (showAllOngoing) {
        return s.start_date <= selectedDateLabel && selectedDateLabel <= s.end_date
      }
      if (s.schedule_type === "VERSION") {
        return s.start_date === selectedDateLabel
      }
      return s.start_date === selectedDateLabel || s.end_date === selectedDateLabel
    })
    .sort((a, b) => {
      if (a.start_date !== b.start_date) {
        return b.start_date.localeCompare(a.start_date)
      }
      return a.end_date.localeCompare(b.end_date)
    })

  // R82: 픽업·콘텐츠는 시작일이 속한 같은 게임 버전 아래로 묶음. 버전 카드가 오늘 목록에 있을 때만 카드 안에 접어 넣고,
  // 그렇지 않으면 단독 카드로 두되 소속 버전 이름만 작게 표시함.
  const versionParents = getVersionParents(schedules || [])
  const visibleVersionIds = new Set(filteredSchedules.filter((s) => s.schedule_type === "VERSION").map((s) => s.id))
  const nestedChildrenByVersion = new Map<string, HeroScheduleItem[]>()
  const nestedIds = new Set<string>()
  filteredSchedules.forEach((s) => {
    const parent = versionParents.get(s.id)
    if (!parent || !visibleVersionIds.has(parent.id)) return
    nestedIds.add(s.id)
    nestedChildrenByVersion.set(parent.id, [...(nestedChildrenByVersion.get(parent.id) ?? []), s])
  })
  const toggleVersionKey = (key: string) =>
    setOpenVersionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const parentLabel = (item: HeroScheduleItem) => {
    const parent = versionParents.get(item.id)
    if (!parent || nestedIds.has(item.id)) return null
    return (
      <span data-testid="version-parent-label" className="relative z-10 text-[10px] text-content-muted">
        {`소속: ${parent.title}`}
      </span>
    )
  }

  // 같은 게임 + 같은 유형 + 같은 기간의 일정은 하나의 카드로 묶어서 표시 (정렬 순서 유지)
  const scheduleGroups = filteredSchedules.filter((s) => !nestedIds.has(s.id)).reduce<HeroScheduleGroup[]>((groups, s) => {
    const gameKey = s.gameId ?? s.gameName ?? ""
    const key = `${gameKey}|${s.schedule_type}|${s.is_rerun === true ? "rerun" : "new"}|${s.start_date}|${s.end_date}`
    const existing = groups.find((g) => g.key === key)
    if (existing) {
      existing.items.push(s)
    } else {
      groups.push({
        key,
        schedule_type: s.schedule_type,
        is_rerun: s.is_rerun === true,
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "메모 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSavingMemo(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 1) 요약 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>요약</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-vaul-no-drag
            className="h-7 px-2 text-xs text-success border-success/40 hover:bg-success/10"
            onClick={() => setIsIncomeModalOpen(true)}
          >
            + 수익
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{`총 자산: ${totalAsset?.toLocaleString() ?? "-"} 원`}</p>
          <p className="flex flex-wrap items-center gap-1.5">
            <span>{`예상 지출: ${expectedExpense.toLocaleString()} 원`}</span>
            {budgetAmount > 0 && expectedExpense > budgetAmount ? (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold border bg-danger/15 text-danger border-danger/30">
                [위험: 예산 초과]
              </span>
            ) : budgetAmount > 0 && expectedExpense >= budgetAmount * 0.8 ? (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold border bg-warning/20 text-warning border-warning/30">
                [주의: 예산 근접]
              </span>
            ) : null}
          </p>
          <Progress value={progress} />
          <div className="flex justify-between text-xs text-content-muted">
            <span>{`진행률 ${progress}%`}</span>
            <span>{`${remainingExpected.toLocaleString()} 원`}</span>
          </div>
        </CardContent>
      </Card>

      {/* 2) 선택일 상세 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{selectedDateLabel}</CardTitle>
          {onRegisterExpense && (
            <Button
              type="button"
              size="sm"
              disabled={registerDisabled}
              onClick={onRegisterExpense}
              data-vaul-no-drag
            >
              + 지출 추가
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <select
              aria-label="선택일 상세 항목 선택"
              value={selectedDetailTab}
              onChange={(e) => setSelectedDetailTab(e.target.value as "SCHEDULE" | "EXPENSE" | "MEMO")}
              className="h-8 rounded-md border border-line-control bg-surface-2 px-2.5 text-xs text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              data-vaul-no-drag
            >
              <option value="SCHEDULE">게임 일정</option>
              <option value="EXPENSE">지출 내역</option>
              <option value="MEMO">메모</option>
            </select>
            {selectedDetailTab === "SCHEDULE" && (
              <label className="flex items-center gap-1.5 text-xs text-content-secondary cursor-pointer" data-vaul-no-drag>
                <input
                  type="checkbox"
                  checked={showAllOngoing}
                  onChange={(e) => setShowAllOngoing(e.target.checked)}
                  data-vaul-no-drag
                />
                진행 일정 전체 보기
              </label>
            )}
            {selectedDetailTab === "MEMO" && !isEditingMemo && onSaveMemo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-vaul-no-drag
                onClick={() => setIsEditingMemo(true)}
                className="min-h-[32px] px-2.5 py-1 text-xs rounded-md border border-line-control bg-surface-2 hover:bg-surface text-content flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                {currentMemoText ? "수정" : "작성"}
              </Button>
            )}
          </div>

          {selectedDetailTab === "SCHEDULE" && (
            <section className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredSchedules.length === 0 ? (
                <EmptyState message="해당 일자의 일정이 없습니다." />
              ) : (
                scheduleGroups.map((group) => {
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
                        <ScheduleTypeBadge type={group.schedule_type} isRerun={group.is_rerun} size="sm" />
                        <span className="text-xs font-semibold text-content">
                          {group.gameName ?? "게임"}
                        </span>
                      </div>

                      {/* Line 2: 2026-10-14 ~ 2026-10-28 */}
                      <div className="relative z-10 text-xs text-content-muted">
                        {isSingle ? `${group.start_date} (단일)` : `${group.start_date} ~ ${group.end_date}`}
                      </div>

                      <div className="relative z-10 flex items-center gap-2">
                        <span
                          data-testid="dday-badge"
                          className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-content"
                        >
                          {getDdayLabel(today, group.end_date)}
                        </span>
                        {!isSingle && (
                          <div
                            role="progressbar"
                            aria-label="일정 진행률"
                            aria-valuenow={getPeriodProgress(today, group.start_date, group.end_date)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
                          >
                            <div
                              data-testid="period-progress-fill"
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${getPeriodProgress(today, group.start_date, group.end_date)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Line 3: 켈시 에스페란타/클로저 (Title) — 묶인 일정은 목록으로 표시 */}
                      {isGrouped ? (
                        <ul className="relative z-10 flex flex-col gap-0.5">
                          {group.items.map((item) => (
                            <li key={item.id} className="leading-snug">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1 font-bold text-sm text-content">
                                  <PickupAvatars avatars={item.pickupAvatars} size={28} className="mr-1.5 align-middle" />
                                  {/* Text sits ~2px above the avatar centre with align-middle; nudge it down when avatars are shown. */}
                                  <span className={item.pickupAvatars?.length ? "relative top-0.5" : undefined}>
                                    {item.is_official === false && (
                                      <span className="mr-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                        [비공식]
                                      </span>
                                    )}
                                    {item.title.includes("/") ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span>•</span>
                                        <ScheduleTitleBadges title={item.title} />
                                      </span>
                                    ) : (
                                      `• ${item.title}`
                                    )}
                                  </span>
                                </div>
                                {/* Favourite controls sit right of the title so they do not add a line to the card. */}
                                <FavoriteScheduleActions
                                  scheduleId={item.id}
                                  title={item.title}
                                  favoriteScheduleIds={favoriteScheduleIds}
                                  onToggleFavorite={onToggleFavorite}
                                  className="shrink-0 flex-wrap justify-end"
                                />
                              </div>
                              {parentLabel(item)}
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
                          <div className="relative z-10 flex items-start gap-2">
                            <div className="min-w-0 flex-1 font-bold text-sm text-content leading-snug">
                              <PickupAvatars avatars={group.items[0].pickupAvatars} size={28} className="mr-2 align-middle" />
                              {/* Text sits ~2px above the avatar centre with align-middle; nudge it down when avatars are shown. */}
                              <span className={group.items[0].pickupAvatars?.length ? "relative top-0.5" : undefined}>
                                {group.items[0].is_official === false && (
                                  <span className="mr-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                    [비공식]
                                  </span>
                                )}
                                <ScheduleTitleBadges title={group.items[0].title} />
                              </span>
                            </div>
                            {/* Favourite controls sit right of the title so they do not add a line to the card. */}
                            <FavoriteScheduleActions
                              scheduleId={group.items[0].id}
                              title={group.items[0].title}
                              favoriteScheduleIds={favoriteScheduleIds}
                              onToggleFavorite={onToggleFavorite}
                              className="shrink-0 flex-wrap justify-end"
                            />
                          </div>

                          {parentLabel(group.items[0])}

                          {/* Line 4: 메모 (있는 경우) */}
                          {group.items[0].memo && (
                            <p className="relative z-10 text-[11px] text-content-secondary mt-0.5 whitespace-pre-wrap">
                              {group.items[0].memo}
                            </p>
                          )}
                        </>
                      )}

                      {(() => {
                        const children = group.items.flatMap((item) => nestedChildrenByVersion.get(item.id) ?? [])
                        if (children.length === 0) return null
                        const open = openVersionKeys.has(group.key)
                        const panelId = `version-children-${group.key}`
                        return (
                          <div className="relative z-10 mt-1 space-y-1.5">
                            <button
                              type="button"
                              data-testid="version-children-toggle"
                              data-vaul-no-drag
                              aria-expanded={open}
                              aria-controls={panelId}
                              onClick={() => toggleVersionKey(group.key)}
                              className="flex w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-left text-xs text-content-secondary hover:border-line-control"
                            >
                              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform${open ? "" : " -rotate-90"}`} aria-hidden="true" />
                              <span>{formatChildSummary(children)}</span>
                              <PickupAvatars
                                avatars={children.flatMap((c) => c.pickupAvatars ?? []).filter((a, i, all) => all.findIndex((x) => x.id === a.id) === i)}
                                size={20}
                                className="ml-auto"
                              />
                            </button>
                            {open && (
                              <ul id={panelId} className="space-y-1.5 border-l border-line pl-2">
                                {children.map((child) => (
                                  <li key={child.id} data-testid="version-child-card" className="rounded-md border border-line bg-surface p-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <ScheduleTypeBadge type={child.schedule_type} isRerun={child.is_rerun === true} size="sm" />
                                      <span className="text-xs text-content-muted">
                                        {child.start_date === child.end_date ? `${child.start_date} (단일)` : `${child.start_date} ~ ${child.end_date}`}
                                      </span>
                                      <span data-testid="dday-badge" className="text-[10px] font-bold text-content">
                                        {getDdayLabel(today, child.end_date)}
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <div className="min-w-0 flex-1 font-bold leading-snug text-content">
                                        <PickupAvatars avatars={child.pickupAvatars} size={28} className="mr-1.5 align-middle" />
                                        <span className={child.pickupAvatars?.length ? "relative top-0.5" : undefined}>
                                          {child.is_official === false && (
                                            <span className="mr-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                              [비공식]
                                            </span>
                                          )}
                                          <ScheduleTitleBadges title={child.title} />
                                        </span>
                                      </div>
                                      <FavoriteScheduleActions
                                        scheduleId={child.id}
                                        title={child.title}
                                        favoriteScheduleIds={favoriteScheduleIds}
                                        onToggleFavorite={onToggleFavorite}
                                        className="shrink-0 flex-wrap justify-end"
                                      />
                                    </div>
                                    {child.memo && (
                                      <p className="text-[11px] text-content-secondary whitespace-pre-wrap">{child.memo}</p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })
              )}
            </section>
          )}

          {selectedDetailTab === "EXPENSE" && (
            <section className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {expenses.length === 0 ? (
                <EmptyState message="해당 일자의 지출이 없습니다." hint="등록 버튼으로 추가할 수 있습니다." />
              ) : (
                expenses.map((expense) => {
                  const statusLabel = expense.status === "CONFIRMED" ? "확정" : expense.status === "PLANNED" ? "예정" : "취소"
                  const statusTone = expense.status === "CONFIRMED" ? "text-success" : expense.status === "PLANNED" ? "text-info" : "text-danger"
                  return (
                    <div
                      key={expense.id}
                      data-vaul-no-drag
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
                        <p className="text-xs text-content-muted">{expense.gameName ?? "게임 미연결"} · {METHOD_LABELS[expense.payment_method || ""] ?? (expense.payment_method || "내 지갑")}</p>
                        {expense.status === "PLANNED" && expense.dueDate && expense.periodStart && expense.periodStart < expense.dueDate && (
                          <div
                            role="progressbar"
                            aria-label="결제 기간 진행률"
                            aria-valuenow={getPeriodProgress(today, expense.periodStart, expense.dueDate)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-surface"
                          >
                            <div
                              data-testid="period-progress-fill"
                              className="h-full rounded-full bg-info"
                              style={{ width: `${getPeriodProgress(today, expense.periodStart, expense.dueDate)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-right relative z-10">
                        <p className="font-semibold text-info">{expense.final_amount.toLocaleString()} 원</p>
                        <p className={`text-xs mt-0.5 ${statusTone}`}>{statusLabel}</p>
                        {expense.status === "PLANNED" && expense.dueDate && (
                          <p data-testid="dday-badge" className="mt-0.5 text-[10px] font-bold text-content">
                            {getDdayLabel(today, expense.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </section>
          )}

          {selectedDetailTab === "MEMO" && (
            <section className="space-y-2 max-h-[380px] overflow-y-auto pr-1" data-vaul-no-drag>
              {isEditingMemo ? (
                <div className="space-y-2" data-vaul-no-drag>
                  <textarea
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    onKeyDown={(e) => insertTabOnKeyDown(e, setMemoInput)}
                    maxLength={200}
                    placeholder="메모를 입력하세요 (최대 200자)"
                    className="w-full h-20 rounded-md border border-line-control bg-surface-2 p-2.5 text-sm text-content focus:outline-none focus:ring-1 focus:ring-primary"
                    data-vaul-no-drag
                  />
                  <div className="flex items-center justify-between text-xs text-content-secondary">
                    <span>{memoInput.length} / 200자</span>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-vaul-no-drag
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.preventDefault()}
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
                        data-vaul-no-drag
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.preventDefault()}
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
          )}
        </CardContent>
      </Card>

      {/* 3) 스토어 포인트 카드 */}
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
    <aside className="hidden w-[340px] lg:sticky lg:top-0 lg:block lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-1">
      <HeroSidebarContent {...props} />
    </aside>
  )
}
