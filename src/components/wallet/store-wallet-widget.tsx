"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { GOOGLE_TIER_RATES, type GoogleTier, type PointPlatform } from "@/lib/payment-calculations"

interface WalletRow {
  platform: PointPlatform
  current_balance: number
  earn_rate: number
  user_tier: string | null
}

interface StoreWalletWidgetProps {
  onChanged?: () => void
}

const selectClassName = "h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
const TIERS = Object.keys(GOOGLE_TIER_RATES) as GoogleTier[]

function isGoogleTier(value: string | null): value is GoogleTier {
  return value !== null && value in GOOGLE_TIER_RATES
}

export function StoreWalletWidget({ onChanged }: StoreWalletWidgetProps) {
  const { user } = useAuth()
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [googleTier, setGoogleTier] = useState<GoogleTier>("BRONZE")
  const [galaxyRate, setGalaxyRate] = useState("0.1")
  const [adjustPlatform, setAdjustPlatform] = useState<PointPlatform>("GOOGLE_PLAY")
  const [targetBalance, setTargetBalance] = useState("")
  const [adjustMemo, setAdjustMemo] = useState("")

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
      if (galaxy) setGalaxyRate(String(galaxy.earn_rate))
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
    const rate = Number(galaxyRate)
    if (galaxyRate.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      return setMessage({ kind: "error", text: "적립률은 0~100 사이로 입력해 주세요." })
    }
    setIsSaving(true)
    setMessage(null)
    const { error } = await supabase.rpc("update_store_wallet_settings", {
      p_platform: "GALAXY_STORE",
      p_tier: null,
      p_earn_rate: Math.round(rate * 100) / 100,
    })
    setIsSaving(false)
    if (error) return setMessage({ kind: "error", text: "Galaxy Store 설정을 저장하지 못했습니다." })
    await finish("Galaxy Store 적립률을 저장했습니다.")
  }

  const saveAdjustment = async (event: FormEvent) => {
    event.preventDefault()
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
    <Card className="border-gray-700 bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>스토어 포인트 지갑</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-gray-300">불러오는 중...</p>
        ) : (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>{`Google Play: ${balanceOf("GOOGLE_PLAY").toLocaleString()} P`}</p>
            <p>{`Galaxy Store: ${balanceOf("GALAXY_STORE").toLocaleString()} P`}</p>
          </div>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-red-300" : "text-sm text-green-300"}>
            {message.text}
          </p>
        )}

        <form className="space-y-2" onSubmit={(event) => void saveGoogle(event)}>
          <label htmlFor="google-tier" className="block text-sm font-medium">Google Play 등급</label>
          <select id="google-tier" className={selectClassName} value={googleTier} onChange={(event) => setGoogleTier(event.target.value as GoogleTier)}>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>{`${tier} (${GOOGLE_TIER_RATES[tier].toFixed(2)}%)`}</option>
            ))}
          </select>
          <Button type="submit" disabled={isSaving}>등급 저장</Button>
        </form>

        <form noValidate className="space-y-2" onSubmit={(event) => void saveGalaxy(event)}>
          <label htmlFor="galaxy-rate" className="block text-sm font-medium">Galaxy Store 적립률 (%)</label>
          <Input id="galaxy-rate" type="number" inputMode="decimal" min={0} max={100} step="0.01" value={galaxyRate} onChange={(event) => setGalaxyRate(event.target.value)} className="bg-gray-900 text-white" />
          <Button type="submit" disabled={isSaving}>적립률 저장</Button>
        </form>

        <form noValidate className="space-y-2" onSubmit={(event) => void saveAdjustment(event)}>
          <h3 className="text-sm font-medium">잔액 수동 보정</h3>
          <label htmlFor="adjust-platform" className="block text-xs text-gray-300">지갑</label>
          <select id="adjust-platform" className={selectClassName} value={adjustPlatform} onChange={(event) => setAdjustPlatform(event.target.value as PointPlatform)}>
            <option value="GOOGLE_PLAY">Google Play</option>
            <option value="GALAXY_STORE">Galaxy Store</option>
          </select>
          <label htmlFor="adjust-target" className="block text-xs text-gray-300">목표 잔액 (P)</label>
          <Input id="adjust-target" type="number" inputMode="numeric" min={0} step={1} value={targetBalance} onChange={(event) => setTargetBalance(event.target.value)} className="bg-gray-900 text-white" />
          <label htmlFor="adjust-memo" className="block text-xs text-gray-300">메모 (선택)</label>
          <Input id="adjust-memo" value={adjustMemo} onChange={(event) => setAdjustMemo(event.target.value)} className="bg-gray-900 text-white" />
          <Button type="submit" variant="outline" disabled={isSaving}>잔액 보정</Button>
        </form>
      </CardContent>
    </Card>
  )
}
