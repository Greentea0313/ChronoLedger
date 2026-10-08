"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ACCOUNT_DELETION_STATUS_TOKEN_KEY,
  accountDeletionStatusMessage,
} from "@/lib/account-deletion"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"

export function AccountDeletionStatusScreen() {
  const router = useRouter()
  const { accountDeletionStatus } = useAuth()

  useEffect(() => {
    if (accountDeletionStatus !== "COMPLETED") return

    void supabase.auth.signOut({ scope: "local" })
      .catch((error: unknown) => console.error("삭제 완료 후 로컬 세션 정리 실패:", error))
      .finally(() => {
        window.localStorage.removeItem(ACCOUNT_DELETION_STATUS_TOKEN_KEY)
        router.replace("/auth?accountDeleted=1")
      })
  }, [accountDeletionStatus, router])

  const statusMessage = accountDeletionStatus
    ? accountDeletionStatusMessage(accountDeletionStatus)
    : "삭제 작업 상태를 확인하고 있습니다."

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-white">
      <section className="w-full max-w-xl space-y-5 rounded-lg border border-gray-700 bg-gray-800 p-6" aria-labelledby="deletion-status-title">
        <h1 id="deletion-status-title" className="text-2xl font-bold text-blue-400">계정 삭제 처리</h1>
        <p role="status" aria-live="polite">{statusMessage}</p>
        <p className="text-sm text-gray-300">
          처리가 완료될 때까지 개인 기능과 데이터 접근은 차단됩니다. 이 화면을 닫아도 서버가 정리 작업을 재시도합니다.
        </p>
      </section>
    </main>
  )
}
