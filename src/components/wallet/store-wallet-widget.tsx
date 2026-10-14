"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import {
  GOOGLE_TIER_RATES,
  GALAXY_TIER_RATES,
  GALAXY_TIER_LABELS,
  type GoogleTier,
  type GalaxyTier,
  type PointPlatform,
} from "@/lib/payment-calculations"
import { StoreWalletAdjustHistoryModal } from "@/components/wallet/store-wallet-adjust-history-modal"

interface WalletRow {
  platform: PointPlatform
  current_balance: number
  earn_rate: number
  user_tier: string | null
}

interface StoreWalletWidgetProps {
  onChanged?: () => void
}

const selectClassName = "h-10 w-full rounded-md border border-line-control bg-surface-2 px-3 text-sm text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
const GOOGLE_TIERS = Object.keys(GOOGLE_TIER_RATES) as GoogleTier[]
const GALAXY_TIERS = Object.keys(GALAXY_TIER_RATES) as GalaxyTier[]

function isGoogleTier(value: string | null): value is GoogleTier {
  return value !== null && value in GOOGLE_TIER_RATES
}

function isGalaxyTier(value: string | null): value is GalaxyTier {
  return value !== null && value in GALAXY_TIER_RATES
}

export function StoreWalletWidget({ onChanged }: StoreWalletWidgetProps) {
  const { user } = useAuth()
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const isOnline = useOnlineStatus()
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [googleTier, setGoogleTier] = useState<GoogleTier>("BRONZE")
  const [galaxyTier, setGalaxyTier] = useState<GalaxyTier>("GENERAL")
  const [adjustPlatform, setAdjustPlatform] = useState<PointPlatform>("GOOGLE_PLAY")
  const [targetBalance, setTargetBalance] = useState("")
  const [adjustMemo, setAdjustMemo] = useState("")
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from("store_wallets")
      .select("platform, current_balance, earn_rate, user_tier")
      .eq("user_id", user.id)
    if (error) {
      setMessage({ kind: "error", text: "지갑 정보를 불러오지 못했습니다." })
    } else {
      const rows = (data ?? []) as WalletRow[]
      setWallets(rows)
      const google = rows.find((row) => row.platform === "GOOGLE_PLAY")
      const galaxy = rows.find((row) => row.platform === "GALAXY_STORE")
      if (google && isGoogleTier(google.user_tier)) setGoogleTier(google.user_tier)
      if (galaxy) {
        if (isGalaxyTier(galaxy.user_tier)) {
          setGalaxyTier(galaxy.user_tier)
        } else if (galaxy.earn_rate >= 2.1) {
          setGalaxyTier("ROYAL_BLUE")
        } else if (galaxy.earn_rate >= 1.1) {
          setGalaxyTier("PRESTIGE")
        } else {
          setGalaxyTier("GENERAL")
        }
      }
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const finish = async (text: string) => {
    setMessage({ kind: "ok", text })
    await load()
    onChanged?.()
  }

  const saveGoogle = async (event: FormEvent) => {
    event.preventDefault()
    if (isOffline()) return setMessage({ kind: "error", text: OFFLINE_WRITE_MESSAGE })
    setIsSaving(true)
    setMessage(null)
    const { error } = await supabase.rpc("update_store_wallet_settings", {
      p_platform: "GOOGLE_PLAY",
      p_tier: googleTier,
      p_earn_rate: GOOGLE_TIER_RATES[googleTier],
    })
    setIsSaving(false)
    if (error) return setMessage({ kind: "error", text: "Google Play 설정을 저장하지 못했습니다." })
    await finish("Google Play 등급을 저장했습니다.")
  }

  const saveGalaxy = async (event: FormEvent) => {
    event.preventDefault()
    if (isOffline()) return setMessage({ kind: "error", text: OFFLINE_WRITE_MESSAGE })
    setIsSaving(true)
    setMessage(null)
    let { error } = await supabase.rpc("update_store_wallet_settings", {
      p_platform: "GALAXY_STORE",
      p_tier: galaxyTier,
      p_earn_rate: GALAXY_TIER_RATES[galaxyTier],
    })
    // 구버전 DB RPC 호환: p_tier가 null이어야만 허용되던 구버전 스키마를 위해 p_tier: null로 폴백 시도
    if (error) {
      const fallback = await supabase.rpc("update_store_wallet_settings", {
        p_platform: "GALAXY_STORE",
        p_tier: null,
        p_earn_rate: GALAXY_TIER_RATES[galaxyTier],
      })
      if (!fallback.error) {
        error = null
      }
    }
    setIsSaving(false)
    if (error) return setMessage({ kind: "error", text: "Galaxy Store 설정을 저장하지 못했습니다." })
    await finish("Galaxy Store 등급을 저장했습니다.")
  }

  const saveAdjustment = async (event: FormEvent) => {
    event.preventDefault()
    if (isOffline()) return setMessage({ kind: "error", text: OFFLINE_WRITE_MESSAGE })
    const target = Number(targetBalance)
    if (targetBalance.trim() === "" || !Number.isSafeInteger(target) || target < 0) {
      return setMessage({ kind: "error", text: "목표 잔액은 0 이상의 정수로 입력해 주세요." })
    }
    setIsSaving(true)
    setMessage(null)
    const { error } = await supabase.rpc("adjust_wallet_balance", {
      p_platform: adjustPlatform,
      p_target_balance: target,
      p_memo: adjustMemo.trim() || "수동 잔액 보정",
    })
    setIsSaving(false)
    if (error) return setMessage({ kind: "error", text: "잔액을 보정하지 못했습니다." })
    setTargetBalance("")
    setAdjustMemo("")
    await finish("잔액을 보정했습니다.")
  }

  const balanceOf = (platform: PointPlatform) =>
    wallets.find((wallet) => wallet.platform === platform)?.current_balance ?? 0

  return (
    <Card className="border-line bg-surface text-content">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-content">스토어 지갑 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-content-secondary">불러오는 중...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 p-3 rounded-md border border-line bg-surface-2 text-sm">
            <div>
              <span className="text-xs text-content-secondary block">Google Play 포인트 잔액</span>
              <span className="font-semibold text-content text-base">{balanceOf("GOOGLE_PLAY").toLocaleString()} P</span>
            </div>
            <div>
              <span className="text-xs text-content-secondary block">Galaxy Store 포인트 잔액</span>
              <span className="font-semibold text-content text-base">{balanceOf("GALAXY_STORE").toLocaleString()} P</span>
            </div>
            <div>
              <span className="text-xs text-content-secondary block">네이버페이 머니 잔액</span>
              <span className="font-semibold text-content text-base">{balanceOf("NAVER_PAY").toLocaleString()} 원</span>
            </div>
          </div>
        )}
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}
          >
            {message.text}
          </p>
        )}

        {/* Google Play 등급 설정 */}
        <form className="space-y-2" onSubmit={(event) => void saveGoogle(event)}>
          <label htmlFor="google-tier" className="block text-sm font-medium text-content">
            Google Play 등급
          </label>
          <div className="flex gap-2">
            <select
              id="google-tier"
              className={selectClassName}
              value={googleTier}
              onChange={(event) => setGoogleTier(event.target.value as GoogleTier)}
            >
              {GOOGLE_TIERS.map((tier) => (
                <option key={tier} value={tier}>{`${tier} (${GOOGLE_TIER_RATES[tier].toFixed(2)}%)`}</option>
              ))}
            </select>
            <Button type="submit" disabled={isSaving || !isOnline} className="shrink-0 bg-primary hover:bg-primary-hover text-primary-foreground">
              Google 등급 저장
            </Button>
          </div>
        </form>

        {/* Galaxy Store 등급 설정 (4개 공식 등급) */}
        <form className="space-y-2" onSubmit={(event) => void saveGalaxy(event)}>
          <label htmlFor="galaxy-tier" className="block text-sm font-medium text-content">
            Galaxy Store 등급
          </label>
          <div className="flex gap-2">
            <select
              id="galaxy-tier"
              className={selectClassName}
              value={galaxyTier}
              onChange={(event) => setGalaxyTier(event.target.value as GalaxyTier)}
            >
              {GALAXY_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {`${GALAXY_TIER_LABELS[tier]} (${GALAXY_TIER_RATES[tier].toFixed(1)}%)`}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={isSaving || !isOnline} className="shrink-0 bg-primary hover:bg-primary-hover text-primary-foreground">
              Galaxy 등급 저장
            </Button>
          </div>
        </form>

        {/* 잔액 수동 보정 */}
        <form noValidate className="space-y-3 pt-4 border-t border-line" onSubmit={(event) => void saveAdjustment(event)}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-content">지갑 잔액 수동 보정</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs h-7 px-2.5 border-line-control text-content hover:bg-surface-2"
            >
              <History className="h-3.5 w-3.5 mr-1 text-content-secondary" />
              보정 내역 보기
            </Button>
          </div>
          <p className="text-xs text-content-secondary">
            실제 스토어 앱의 포인트 또는 네이버페이 잔액과 차이가 있을 때 목표 잔액과 사유를 입력하여 보정합니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="adjust-platform" className="block text-xs text-content-secondary">지갑</label>
              <select
                id="adjust-platform"
                className={selectClassName}
                value={adjustPlatform}
                onChange={(event) => setAdjustPlatform(event.target.value as PointPlatform)}
              >
                <option value="GOOGLE_PLAY">Google Play</option>
                <option value="GALAXY_STORE">Galaxy Store</option>
                <option value="NAVER_PAY">네이버페이</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="adjust-target" className="block text-xs text-content-secondary">
                {adjustPlatform === "NAVER_PAY" ? "목표 잔액 (원)" : "목표 잔액 (P)"}
              </label>
              <Input
                id="adjust-target"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={adjustPlatform === "NAVER_PAY" ? "예: 10000" : "예: 500"}
                value={targetBalance}
                onChange={(event) => setTargetBalance(event.target.value)}
                className="border-line-control bg-surface-2 text-content"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="adjust-memo" className="block text-xs text-content-secondary">메모 (선택)</label>
            <Input
              id="adjust-memo"
              placeholder="예: 공식 정산 오차 보정"
              value={adjustMemo}
              onChange={(event) => setAdjustMemo(event.target.value)}
              className="border-line-control bg-surface-2 text-content"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isSaving || !isOnline} className="border-line-control text-content hover:bg-surface-2">
            잔액 보정
          </Button>
        </form>

        <StoreWalletAdjustHistoryModal
          open={isHistoryModalOpen}
          onOpenChange={setIsHistoryModalOpen}
          initialPlatform={adjustPlatform}
        />
      </CardContent>
    </Card>
  )
}
