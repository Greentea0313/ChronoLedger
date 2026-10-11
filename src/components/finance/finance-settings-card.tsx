"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"

interface FinanceSettingsCardProps {
  onChanged?: () => void
}

export function FinanceSettingsCard({ onChanged }: FinanceSettingsCardProps) {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const [totalAsset, setTotalAsset] = useState<string>("0")
  const [defaultBudget, setDefaultBudget] = useState<string>("0")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from("user_finances")
      .select("total_asset, default_budget")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      setMessage({ kind: "error", text: "재무 정보를 불러오지 못했습니다." })
    } else if (data) {
      setTotalAsset(String(data.total_asset ?? 0))
      setDefaultBudget(String(data.default_budget ?? 0))
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (isOffline()) {
      setMessage({ kind: "error", text: OFFLINE_WRITE_MESSAGE })
      return
    }

    const assetNum = Number(totalAsset)
    const budgetNum = Number(defaultBudget)

    if (totalAsset.trim() === "" || !Number.isSafeInteger(assetNum)) {
      setMessage({ kind: "error", text: "총 자산은 유효한 정수로 입력해 주세요." })
      return
    }

    if (defaultBudget.trim() === "" || !Number.isSafeInteger(budgetNum) || budgetNum < 0) {
      setMessage({ kind: "error", text: "기본 월 예산은 0 이상의 정수로 입력해 주세요." })
      return
    }

    setIsSaving(true)
    setMessage(null)

    const { error } = await supabase.rpc("set_user_finance_settings", {
      p_total_asset: assetNum,
      p_default_budget: budgetNum,
    })

    setIsSaving(false)

    if (error) {
      setMessage({ kind: "error", text: "재무 설정을 저장하지 못했습니다." })
      return
    }

    setMessage({ kind: "ok", text: "재무 설정이 저장되었습니다." })
    await load()
    onChanged?.()
  }

  return (
    <Card className="border-line bg-surface text-content">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-content">개인 재무 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-content-secondary">불러오는 중...</p>
        ) : (
          <form noValidate className="space-y-4" onSubmit={(event) => void handleSave(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="finance-total-asset" className="block text-sm font-medium text-content">
                  총 자산 (원)
                </label>
                <Input
                  id="finance-total-asset"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={totalAsset}
                  onChange={(event) => setTotalAsset(event.target.value)}
                  className="border-line-control bg-surface-2 text-content"
                />
                <p className="text-xs text-content-secondary">
                  지출 등록 및 결제 확정 시 잔액 차감 기준으로 사용됩니다.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="finance-default-budget" className="block text-sm font-medium text-content">
                  기본 월 예산 (원)
                </label>
                <Input
                  id="finance-default-budget"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={defaultBudget}
                  onChange={(event) => setDefaultBudget(event.target.value)}
                  className="border-line-control bg-surface-2 text-content"
                />
                <p className="text-xs text-content-secondary">
                  매월 캘린더 및 대시보드 상단 예산 바의 기준 목표액입니다.
                </p>
              </div>
            </div>

            {message && (
              <p
                role={message.kind === "error" ? "alert" : "status"}
                className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}
              >
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSaving || !isOnline}
              className="bg-primary hover:bg-primary-hover text-white font-medium"
            >
              {isSaving ? "저장 중..." : "재무 설정 저장"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

