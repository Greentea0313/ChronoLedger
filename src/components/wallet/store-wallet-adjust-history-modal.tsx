"use client"

import { useCallback, useEffect, useState } from "react"
import { History, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import type { PointPlatform } from "@/lib/payment-calculations"

export type AdjustPlatformFilter = "ALL" | PointPlatform

export interface StoreWalletAdjustRecord {
  id: string
  platform: PointPlatform
  transaction_type: string
  amount: number
  balance_after: number
  memo: string | null
  created_at: string
}

interface StoreWalletAdjustHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlatform?: AdjustPlatformFilter
}

const PLATFORM_LABELS: Record<PointPlatform, { label: string; unit: string; badgeClass: string }> = {
  GOOGLE_PLAY: {
    label: "Google Play",
    unit: "P",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  GALAXY_STORE: {
    label: "Galaxy Store",
    unit: "P",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  NAVER_PAY: {
    label: "네이버페이",
    unit: "원",
    badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return isoString
  }
}

export function StoreWalletAdjustHistoryModal({
  open,
  onOpenChange,
  initialPlatform = "ALL",
}: StoreWalletAdjustHistoryModalProps) {
  const { user } = useAuth()
  const [filterPlatform, setFilterPlatform] = useState<AdjustPlatformFilter>(initialPlatform)
  const [records, setRecords] = useState<StoreWalletAdjustRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from("store_point_transactions")
        .select("id, platform, transaction_type, amount, balance_after, memo, created_at")
        .eq("user_id", user.id)
        .eq("transaction_type", "MANUAL_ADJUST")

      if (filterPlatform !== "ALL") {
        query = query.eq("platform", filterPlatform)
      }

      const { data, error: fetchError } = await query.order("created_at", { ascending: false })

      if (fetchError) {
        setError("보정 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
      } else {
        setRecords((data as StoreWalletAdjustRecord[]) ?? [])
      }
    } catch {
      setError("보정 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsLoading(false)
    }
  }, [user, filterPlatform])

  useEffect(() => {
    if (open) {
      void loadHistory()
    }
  }, [open, loadHistory])

  useEffect(() => {
    if (open) {
      setFilterPlatform(initialPlatform)
    }
  }, [open, initialPlatform])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-line text-content">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-2 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-content">
                포인트/페이 수동 보정 내역
              </DialogTitle>
              <DialogDescription className="text-xs text-content-secondary mt-0.5">
                지갑 잔액 수동 보정에서 사용자가 직접 조정한 내역을 확인합니다.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 필터 및 새로고침 바 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-line">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: "ALL", label: "전체" },
                { id: "GOOGLE_PLAY", label: "Google Play" },
                { id: "GALAXY_STORE", label: "Galaxy Store" },
                { id: "NAVER_PAY", label: "네이버페이" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterPlatform(item.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                  filterPlatform === item.id
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "border-line-control bg-surface-2 text-content-secondary hover:text-content hover:bg-surface"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadHistory()}
            disabled={isLoading}
            className="self-end sm:self-auto text-xs h-7 px-2 text-content-secondary hover:text-content"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {/* 내역 리스트 영역 */}
        <div className="min-h-[220px] max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {isLoading && records.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-content-secondary">
              불러오는 중...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-sm text-danger gap-2">
              <p>{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadHistory()}
                className="text-xs"
              >
                다시 시도
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-sm text-content-secondary text-center px-4">
              <History className="h-8 w-8 mb-2 opacity-30 text-content-secondary" />
              <p className="font-medium text-content">수동 보정 내역이 없습니다.</p>
              <p className="text-xs text-content-secondary mt-1">
                실제 스토어 잔액과 차이가 생겼을 때 잔액을 수동 보정하면 이곳에 기록됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => {
                const meta = PLATFORM_LABELS[record.platform] ?? {
                  label: record.platform,
                  unit: "P",
                  badgeClass: "bg-surface-2 text-content-secondary border-line",
                }
                const isPositive = record.amount > 0
                const isNegative = record.amount < 0
                const amountFormatted = isPositive
                  ? `+${record.amount.toLocaleString()} ${meta.unit}`
                  : `${record.amount.toLocaleString()} ${meta.unit}`

                return (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg border border-line bg-surface-2/60 hover:bg-surface-2 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-content-secondary text-[11px]">
                          {formatDate(record.created_at)}
                        </span>
                      </div>
                      <div className="text-content text-xs font-normal">
                        <span className="text-content-secondary mr-1">사유:</span>
                        {record.memo || "수동 잔액 보정"}
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-line/60">
                      <div
                        className={`text-sm font-bold ${
                          isPositive
                            ? "text-success"
                            : isNegative
                            ? "text-danger"
                            : "text-content"
                        }`}
                      >
                        {amountFormatted}
                      </div>
                      <div className="text-[11px] text-content-secondary">
                        보정 후 {record.balance_after.toLocaleString()} {meta.unit}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-line">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs border-line-control text-content hover:bg-surface-2"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
