"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StoreWalletWidget } from "@/components/wallet/store-wallet-widget"
import { FinanceSettingsCard } from "@/components/finance/finance-settings-card"
import { UserRequestsCard } from "@/components/game/user-requests-card"
import { ProfileAvatarCard } from "@/components/profile/profile-avatar-card"
import { ProfileNicknameCard } from "@/components/profile/profile-nickname-card"
import { useAuth } from "@/lib/auth-context"
import { requestAccountDeletion } from "@/lib/account-deletion"
import { loadSchedulePreference, saveSchedulePreference } from "@/lib/schedule-preferences"

export default function SettingsPage() {
  const { user, role, beginAccountDeletionTracking } = useAuth()
  const isAdmin = role === "admin" || user?.app_metadata?.role === "admin"
  const [confirmationEmail, setConfirmationEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnofficialSchedules, setShowUnofficialSchedules] = useState(false)
  const [isSchedulePreferenceAvailable, setIsSchedulePreferenceAvailable] = useState(false)
  const [isLoadingSchedulePreference, setIsLoadingSchedulePreference] = useState(true)
  const [isSavingSchedulePreference, setIsSavingSchedulePreference] = useState(false)
  const [schedulePreferenceError, setSchedulePreferenceError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setIsLoadingSchedulePreference(false)
      return
    }
    let isCurrent = true
    setIsLoadingSchedulePreference(true)
    setSchedulePreferenceError(null)
    void loadSchedulePreference(user.id)
      .then((preference) => {
        if (!isCurrent) return
        setShowUnofficialSchedules(preference.showUnofficialSchedules)
        setIsSchedulePreferenceAvailable(preference.isAvailable)
        if (!preference.isAvailable) {
          setSchedulePreferenceError("비공식 일정 설정 마이그레이션이 적용되지 않아 설정을 사용할 수 없습니다.")
        }
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return
        setSchedulePreferenceError(cause instanceof Error
          ? `일정 표시 설정을 불러오지 못했습니다: ${cause.message}`
          : "일정 표시 설정을 불러오지 못했습니다.")
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSchedulePreference(false)
      })
    return () => {
      isCurrent = false
    }
  }, [user?.id])

  const handleSchedulePreferenceChange = async () => {
    if (!user?.id || !isSchedulePreferenceAvailable || isSavingSchedulePreference) return
    const nextValue = !showUnofficialSchedules
    setIsSavingSchedulePreference(true)
    setSchedulePreferenceError(null)
    try {
      await saveSchedulePreference(user.id, nextValue)
      setShowUnofficialSchedules(nextValue)
    } catch (cause: unknown) {
      setSchedulePreferenceError(cause instanceof Error
        ? `일정 표시 설정을 저장하지 못했습니다: ${cause.message}`
        : "일정 표시 설정을 저장하지 못했습니다.")
    } finally {
      setIsSavingSchedulePreference(false)
    }
  }

  const handleAccountDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const statusToken = await requestAccountDeletion(confirmationEmail)
      beginAccountDeletionTracking(statusToken)
    } catch (cause: unknown) {
      setError(cause instanceof Error
        ? cause.message === "CONFIRMATION_REQUIRED"
          ? "로그인한 계정의 이메일 주소를 정확히 입력해주세요."
          : "계정 삭제 요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요."
        : "계정 삭제 요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">설정</h1>
        <p className="mt-1 text-sm text-content-secondary">
          {isAdmin
            ? "계정, 재무 및 스토어 지갑을 관리합니다."
            : "계정, 재무, 스토어 지갑 및 요청 내역을 관리합니다."}
        </p>
      </header>

      <ProfileAvatarCard />
      <ProfileNicknameCard />

      <FinanceSettingsCard />

      <StoreWalletWidget />

      {!isAdmin && <UserRequestsCard />}

      <Card className="border-line text-content">
        <CardHeader>
          <CardTitle>일정 표시 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-content-secondary">
            테스트 서버·유출 등 비공식으로 분류된 일정을 캘린더와 게임 일정에서 표시합니다.
          </p>
          <Button
            type="button"
            variant="outline"
            role="switch"
            aria-label="비공식 일정(테스트 서버·유출 등) 표시"
            aria-checked={showUnofficialSchedules}
            onClick={() => void handleSchedulePreferenceChange()}
            disabled={isLoadingSchedulePreference || !isSchedulePreferenceAvailable || isSavingSchedulePreference}
          >
            비공식 일정(테스트 서버·유출 등) 표시: {showUnofficialSchedules ? "켜짐" : "꺼짐"}
          </Button>
          {isLoadingSchedulePreference && <p role="status" className="text-xs text-content-secondary">설정을 불러오는 중...</p>}
          {schedulePreferenceError && <p role="alert" className="text-sm text-danger">{schedulePreferenceError}</p>}
        </CardContent>
      </Card>

      <Card className="border-danger/50 text-content">
        <CardHeader>
          <CardTitle className="text-danger">계정 삭제</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-content">
            계정을 삭제하면 개인 재무, 예산, 게임 구독, 지출, 메모, 포인트 원장, 요청 내역과 비공개 게임 아이콘이 제거됩니다. 공용 게임과 일정은 유지됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <p className="text-sm text-content-secondary">
            정리 작업이 진행되는 동안에는 개인 기능 접근이 차단됩니다. 정리가 완료되면 등록 이메일로 안내한 뒤 인증 계정을 삭제합니다.
          </p>
          <form className="space-y-3" onSubmit={(event) => void handleAccountDeletion(event)}>
            <label htmlFor="delete-account-email" className="block text-sm font-medium">
              확인을 위해 로그인 이메일{user?.email ? ` (${user.email})` : ""}을 입력하세요.
            </label>
            <Input
              id="delete-account-email"
              type="email"
              autoComplete="email"
              value={confirmationEmail}
              onChange={(event) => setConfirmationEmail(event.target.value)}
              required
              className="bg-surface-2 text-content border-line"
            />
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "삭제 요청 중..." : "계정 삭제 요청"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
