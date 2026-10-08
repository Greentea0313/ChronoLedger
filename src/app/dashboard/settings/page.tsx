"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StoreWalletWidget } from "@/components/wallet/store-wallet-widget"
import { useAuth } from "@/lib/auth-context"
import { requestAccountDeletion } from "@/lib/account-deletion"

export default function SettingsPage() {
  const { user, beginAccountDeletionTracking } = useAuth()
  const [confirmationEmail, setConfirmationEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <h1 className="text-2xl font-bold text-blue-400">설정</h1>
        <p className="mt-2 text-sm text-gray-300">계정과 개인정보 관리</p>
      </header>

      <StoreWalletWidget />

      <Card className="border-danger/50 text-content">
        <CardHeader>
          <CardTitle className="text-red-300">계정 삭제</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-200">
            계정을 삭제하면 개인 재무, 예산, 게임 구독, 지출, 메모, 포인트 원장, 요청 내역과 비공개 게임 아이콘이 제거됩니다. 공용 게임과 일정은 유지됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <p className="text-sm text-gray-300">
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
              className="bg-gray-900 text-white"
            />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "삭제 요청 중..." : "계정 삭제 요청"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
