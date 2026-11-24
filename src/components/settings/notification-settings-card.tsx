"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"

type SettingKey = "favorite_schedule_start" | "favorite_schedule_end_d1" | "planned_expense_d1"
type SettingValues = Record<SettingKey, boolean>

const SETTING_OPTIONS: { key: SettingKey; label: string; description: string }[] = [
  { key: "favorite_schedule_start", label: "관심 일정 시작 당일", description: "관심 일정으로 등록한 일정이 시작하는 날 오전 9시(KST)에 알림함으로 알려줌." },
  { key: "favorite_schedule_end_d1", label: "관심 일정 종료 1일 전", description: "관심 일정이 내일 종료되면 오늘 오전 9시(KST)에 알려줌." },
  { key: "planned_expense_d1", label: "예정 지출 결제일 1일 전", description: "내일 결제 예정인 지출이 있으면 오늘 오전 9시(KST)에 알려줌. 금액은 알림에 표시하지 않음." },
]

const DEFAULT_VALUES: SettingValues = {
  favorite_schedule_start: true,
  favorite_schedule_end_d1: true,
  planned_expense_d1: true,
}

const MIGRATION_PENDING_MESSAGE = "DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다."

/** `notification_settings` not migrated yet (R39): show the defaults read-only instead of failing the page. */
function isMissingSettingsTable(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42P01" || code === "PGRST205"
}

/** Daily in-app notification toggles of the signed-in user; a missing row means every toggle is on. */
export function NotificationSettingsCard({ userId }: { userId: string }) {
  const [values, setValues] = useState<SettingValues>(DEFAULT_VALUES)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [savingKey, setSavingKey] = useState<SettingKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: loadError } = await supabase
        .from("notification_settings")
        .select("favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1")
        .eq("user_id", userId)
        .maybeSingle()
      if (loadError) {
        if (isMissingSettingsTable(loadError)) {
          setIsAvailable(false)
          setError(MIGRATION_PENDING_MESSAGE)
        } else {
          setError("알림 설정을 불러오지 못했습니다.")
        }
        setValues(DEFAULT_VALUES)
        return
      }
      setIsAvailable(true)
      setValues({
        favorite_schedule_start: data?.favorite_schedule_start ?? true,
        favorite_schedule_end_d1: data?.favorite_schedule_end_d1 ?? true,
        planned_expense_d1: data?.planned_expense_d1 ?? true,
      })
    } catch {
      setError("알림 설정을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = async (key: SettingKey) => {
    if (savingKey !== null || !isAvailable) return
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    const previous = values[key]
    const next = !previous
    setSavingKey(key)
    setError(null)
    setValues((prev) => ({ ...prev, [key]: next }))
    try {
      // Only the toggled column is sent, so request_result / push_enabled of an existing row stay untouched.
      const { error: saveError } = await supabase
        .from("notification_settings")
        .upsert({ user_id: userId, ...({ [key]: next } as Partial<SettingValues>), updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      if (saveError) {
        setValues((prev) => ({ ...prev, [key]: previous }))
        if (isMissingSettingsTable(saveError)) {
          setIsAvailable(false)
          setError(MIGRATION_PENDING_MESSAGE)
        } else {
          setError("알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")
        }
      }
    } catch {
      setValues((prev) => ({ ...prev, [key]: previous }))
      setError("알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Card className="border-line text-content">
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-content-secondary">
          매일 오전 9시(KST)에 앱 안의 알림함(상단 벨)으로 전달되는 일일 알림을 종류별로 켜고 끕니다.
        </p>
        <ul className="space-y-3">
          {SETTING_OPTIONS.map((option) => (
            <li key={option.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-content">{option.label}</p>
                <p className="text-xs text-content-secondary">{option.description}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                role="switch"
                aria-label={`${option.label} 알림`}
                aria-checked={values[option.key]}
                onClick={() => void handleToggle(option.key)}
                disabled={isLoading || !isAvailable || savingKey !== null}
                className="shrink-0"
              >
                {values[option.key] ? "켜짐" : "꺼짐"}
              </Button>
            </li>
          ))}
        </ul>
        {isLoading && <p role="status" className="text-xs text-content-secondary">알림 설정을 불러오는 중...</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </CardContent>
    </Card>
  )
}
