"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import {
  getCurrentDevicePushEndpoint,
  getPushSupportState,
  subscribeCurrentDevicePush,
  unsubscribeBrowserPushIfMatching,
  type PushPlatform,
  type PushSupportState,
} from "@/lib/push-notifications"

type SettingKey =
  | "favorite_schedule_start"
  | "favorite_schedule_end_d1"
  | "planned_expense_d1"
  | "expense_due_today"
  | "request_result"
  | "push_enabled"
type SettingValues = Record<SettingKey, boolean>

interface PushSubscriptionItem {
  id: string
  endpoint: string
  platform: PushPlatform
  user_agent_label: string
  created_at: string
  last_success_at: string | null
}

const DAILY_AND_EVENT_OPTIONS: { key: Exclude<SettingKey, "push_enabled">; label: string; description: string }[] = [
  {
    key: "favorite_schedule_start",
    label: "관심 일정 시작 당일",
    description: "관심 일정으로 등록한 일정이 시작하는 날 오전 9시(KST)에 알림함으로 알려줌.",
  },
  {
    key: "favorite_schedule_end_d1",
    label: "관심 일정 종료 1일 전",
    description: "관심 일정이 내일 종료되면 오늘 오전 9시(KST)에 알려줌.",
  },
  {
    key: "planned_expense_d1",
    label: "예정 지출 결제일 1일 전",
    description: "내일 결제 예정인 지출이 있으면 오늘 오전 9시(KST)에 알려줌. 금액은 알림에 표시하지 않음.",
  },
  {
    key: "expense_due_today",
    label: "오늘 결제 예정",
    description: "오늘 결제 예정인 지출이 있으면 오전 9시(KST)에 요약 알림으로 알려줌. 금액과 항목명은 표시하지 않음.",
  },
  {
    key: "request_result",
    label: "요청 처리 결과 알림",
    description: "요청 승인·반려 및 건의 답변 시 웹 푸시 알림을 받습니다. (앱 내 알림함에는 항상 표시됨)",
  },
]

const DEFAULT_VALUES: SettingValues = {
  favorite_schedule_start: true,
  favorite_schedule_end_d1: true,
  planned_expense_d1: true,
  expense_due_today: true,
  request_result: true,
  push_enabled: false,
}

const BASE_SETTINGS_COLUMNS = "favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1, request_result, push_enabled"
const EXTENDED_SETTINGS_COLUMNS =
  "favorite_schedule_start, favorite_schedule_end_d1, planned_expense_d1, expense_due_today, request_result, push_enabled"

const MIGRATION_PENDING_MESSAGE = "DB 업데이트(R39) 적용 후 알림 설정을 저장할 수 있습니다."
const PUSH_MIGRATION_PENDING_MESSAGE = "DB 업데이트(R96) 적용 후 웹 푸시 기기를 관리할 수 있습니다."

const PLATFORM_LABELS: Record<PushPlatform, string> = {
  web: "웹",
  ios_pwa: "iOS PWA",
  android_pwa: "Android PWA",
}

function isMissingTableOrFunction(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42P01" || code === "PGRST205" || code === "42883" || code === "PGRST202"
}

function isMissingColumn(error: { code?: string } | null | undefined): boolean {
  const code = error?.code ?? ""
  return code === "42703" || code === "PGRST204"
}

function formatKstDate(value: string | null): string {
  if (!value) return "없음"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "없음"
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function readNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return window.Notification.permission
}

/** Notification settings & Web Push device subscription management card (R39 + R96). */
export function NotificationSettingsCard({ userId }: { userId: string }) {
  const [values, setValues] = useState<SettingValues>(DEFAULT_VALUES)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [isExpenseDueTodayAvailable, setIsExpenseDueTodayAvailable] = useState(true)
  const [savingKey, setSavingKey] = useState<SettingKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [supportState, setSupportState] = useState<PushSupportState>("unsupported")
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported")
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionItem[]>([])
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [isPushTableAvailable, setIsPushTableAvailable] = useState(true)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [removingSubId, setRemovingSubId] = useState<string | null>(null)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  const loadSubscriptions = useCallback(async () => {
    try {
      const [subsRes, endpoint] = await Promise.all([
        supabase
          .from("push_subscriptions")
          .select("id, endpoint, platform, user_agent_label, created_at, last_success_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        getCurrentDevicePushEndpoint(),
      ])
      setCurrentEndpoint(endpoint)
      if (subsRes.error) {
        if (isMissingTableOrFunction(subsRes.error)) {
          setIsPushTableAvailable(false)
          setPushError(PUSH_MIGRATION_PENDING_MESSAGE)
        } else {
          setPushError("등록된 푸시 기기 목록을 불러오지 못했습니다.")
        }
        setSubscriptions([])
        return
      }
      setIsPushTableAvailable(true)
      setSubscriptions((subsRes.data ?? []) as PushSubscriptionItem[])
    } catch {
      setPushError("등록된 푸시 기기 목록을 불러오지 못했습니다.")
      setSubscriptions([])
    }
  }, [userId])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setPushError(null)
    setSupportState(getPushSupportState())
    setPermission(readNotificationPermission())
    try {
      let { data, error: loadError } = await supabase
        .from("notification_settings")
        .select(EXTENDED_SETTINGS_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle()

      if (loadError && isMissingColumn(loadError)) {
        setIsExpenseDueTodayAvailable(false)
        const fallbackRes = await supabase
          .from("notification_settings")
          .select(BASE_SETTINGS_COLUMNS)
          .eq("user_id", userId)
          .maybeSingle()
        data = fallbackRes.data ? { ...fallbackRes.data, expense_due_today: true } : null
        loadError = fallbackRes.error
      } else if (!loadError) {
        setIsExpenseDueTodayAvailable(true)
      }

      if (loadError) {
        if (isMissingTableOrFunction(loadError)) {
          setIsAvailable(false)
          setError(MIGRATION_PENDING_MESSAGE)
        } else {
          setError("알림 설정을 불러오지 못했습니다.")
        }
        setValues(DEFAULT_VALUES)
      } else {
        setIsAvailable(true)
        setValues({
          favorite_schedule_start: data?.favorite_schedule_start ?? true,
          favorite_schedule_end_d1: data?.favorite_schedule_end_d1 ?? true,
          planned_expense_d1: data?.planned_expense_d1 ?? true,
          expense_due_today: data?.expense_due_today ?? true,
          request_result: data?.request_result ?? true,
          push_enabled: data?.push_enabled ?? false,
        })
      }
      await loadSubscriptions()
    } catch {
      setError("알림 설정을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [userId, loadSubscriptions])

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
      // Only the toggled column is sent so untouched columns of an existing row stay intact.
      const { error: saveError } = await supabase
        .from("notification_settings")
        .upsert(
          { user_id: userId, ...({ [key]: next } as Partial<SettingValues>), updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        )
      if (saveError) {
        setValues((prev) => ({ ...prev, [key]: previous }))
        if (key === "expense_due_today" && isMissingColumn(saveError)) {
          setIsExpenseDueTodayAvailable(false)
        } else if (isMissingTableOrFunction(saveError)) {
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

  const handleSubscribeDevice = async () => {
    if (isSubscribing || !isPushTableAvailable) return
    if (isOffline()) {
      setPushError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setIsSubscribing(true)
    setPushError(null)
    setPushMessage(null)
    try {
      await subscribeCurrentDevicePush()
      setPermission(readNotificationPermission())
      setValues((prev) => ({ ...prev, push_enabled: true }))
      setPushMessage("이 기기에서 웹 푸시 알림을 켰습니다.")
      await loadSubscriptions()
    } catch (cause: unknown) {
      setPermission(readNotificationPermission())
      setPushError(cause instanceof Error ? cause.message : "푸시 알림을 켜지 못했습니다.")
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleRemoveSubscription = async (sub: PushSubscriptionItem) => {
    if (removingSubId !== null || !isPushTableAvailable) return
    if (isOffline()) {
      setPushError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setRemovingSubId(sub.id)
    setPushError(null)
    setPushMessage(null)
    try {
      const { error: rpcError } = await supabase.rpc("delete_push_subscription", { p_subscription_id: sub.id })
      if (rpcError) {
        if (isMissingTableOrFunction(rpcError)) {
          setIsPushTableAvailable(false)
          setPushError(PUSH_MIGRATION_PENDING_MESSAGE)
        } else {
          setPushError("기기 구독을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.")
        }
        return
      }
      if (currentEndpoint && sub.endpoint === currentEndpoint) {
        await unsubscribeBrowserPushIfMatching(sub.endpoint)
        setCurrentEndpoint(null)
      }
      const remaining = subscriptions.filter((item) => item.id !== sub.id)
      setSubscriptions(remaining)
      if (remaining.length === 0) {
        setValues((prev) => ({ ...prev, push_enabled: false }))
      }
      setPushMessage("기기 푸시 구독을 해제했습니다.")
    } catch {
      setPushError("기기 구독을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setRemovingSubId(null)
    }
  }

  const isCurrentDeviceRegistered = Boolean(currentEndpoint && subscriptions.some((s) => s.endpoint === currentEndpoint))

  return (
    <Card className="border-line text-content">
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm text-content-secondary">
            매일 오전 9시(KST)에 앱 안의 알림함(상단 벨)으로 전달되는 일일 알림과 요청 결과 웹 푸시 알림을 종류별로 켜고 끕니다.
          </p>
          <ul className="space-y-3">
            {DAILY_AND_EVENT_OPTIONS.filter((option) => option.key !== "expense_due_today" || isExpenseDueTodayAvailable).map((option) => (
              <li key={option.key} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-content">{option.label}</p>
                  <p className="text-xs text-content-secondary">{option.description}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  role="switch"
                  aria-label={option.label.endsWith("알림") ? option.label : `${option.label} 알림`}
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
          {isLoading && (
            <p role="status" className="text-xs text-content-secondary">
              알림 설정을 불러오는 중...
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-content">웹 푸시 알림 (외부 기기 알림)</h3>
              <p className="text-xs text-content-secondary">
                앱을 닫아 두어도 등록된 브라우저·PWA 기기로 알림을 받습니다. 잠금 화면 보호를 위해 금액과 메모 원문은 전송하지 않습니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              role="switch"
              aria-label="웹 푸시 전체 수신 알림"
              aria-checked={values.push_enabled}
              onClick={() => void handleToggle("push_enabled")}
              disabled={isLoading || !isAvailable || savingKey !== null}
              className="shrink-0"
            >
              {values.push_enabled ? "켜짐" : "꺼짐"}
            </Button>
          </div>

          {supportState === "tauri_desktop" && (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-content-secondary">
              Windows 데스크톱 앱에서는 웹 푸시 대신 앱 실행 중 OS 네이티브 알림을 사용합니다. 앱이 꺼진 상태에서 알림이 필요하면 웹·모바일 PWA에서 푸시 알림을 켜 주세요.
            </p>
          )}
          {supportState === "ios_install_required" && (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-content-secondary">
              iPhone/iPad에서는 Safari 공유 버튼 → &apos;홈 화면에 추가&apos;로 설치한 웹 앱에서만 푸시 알림을 켤 수 있습니다.
            </p>
          )}
          {supportState === "unsupported" && (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-content-secondary">
              현재 브라우저는 웹 푸시 알림을 지원하지 않습니다. 앱 내 알림함(상단 벨)은 계속 이용할 수 있습니다.
            </p>
          )}
          {supportState === "unconfigured" && (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-content-secondary">
              웹 푸시 공개키가 아직 설정되지 않았습니다. 환경 변수 적용 후 이 기기에서 푸시 알림을 켤 수 있습니다.
            </p>
          )}
          {supportState === "supported" && permission === "denied" && (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-danger">
              브라우저에서 알림 권한이 차단되어 있습니다. 브라우저 사이트 설정에서 알림 권한을 허용한 뒤 다시 시도해 주세요.
            </p>
          )}

          {supportState === "supported" && permission !== "denied" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSubscribeDevice()}
                disabled={isLoading || !isPushTableAvailable || isSubscribing || isCurrentDeviceRegistered}
              >
                {isSubscribing
                  ? "푸시 알림 등록 중..."
                  : isCurrentDeviceRegistered
                    ? "이 기기에서 푸시 알림 사용 중"
                    : "이 기기에서 푸시 알림 켜기"}
              </Button>
            </div>
          )}

          {pushMessage && (
            <p role="status" className="text-xs text-content-secondary">
              {pushMessage}
            </p>
          )}
          {pushError && (
            <p role="alert" className="text-sm text-danger">
              {pushError}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-content-secondary">등록된 푸시 기기 ({subscriptions.length})</p>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-content-secondary">등록된 기기가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {subscriptions.map((sub) => {
                  const isCurrent = Boolean(currentEndpoint && sub.endpoint === currentEndpoint)
                  return (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-content">
                          {sub.user_agent_label}
                          <span className="ml-2 text-xs font-normal text-content-secondary">
                            {PLATFORM_LABELS[sub.platform] ?? sub.platform}
                          </span>
                          {isCurrent && (
                            <span className="ml-1.5 text-xs font-normal text-primary">(현재 기기)</span>
                          )}
                        </p>
                        <p className="text-xs text-content-secondary">
                          등록 {formatKstDate(sub.created_at)} · 최근 발송 {formatKstDate(sub.last_success_at)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${sub.user_agent_label} 기기 해제`}
                        onClick={() => void handleRemoveSubscription(sub)}
                        disabled={removingSubId !== null || !isPushTableAvailable}
                        className="shrink-0"
                      >
                        {removingSubId === sub.id ? "해제 중..." : "해제"}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
