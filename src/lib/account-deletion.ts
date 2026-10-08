import { supabase } from "@/lib/supabase/client"

export type AccountDeletionStatus =
  | "PENDING"
  | "STORAGE_CLEANUP"
  | "DATA_CLEANUP"
  | "EMAIL_PENDING"
  | "AUTH_DELETE_PENDING"
  | "MANUAL_REVIEW"
  | "COMPLETED"

export const ACCOUNT_DELETION_STATUS_TOKEN_KEY = "chronoledger.accountDeletionStatusToken"

const validStatuses: AccountDeletionStatus[] = [
  "PENDING",
  "STORAGE_CLEANUP",
  "DATA_CLEANUP",
  "EMAIL_PENDING",
  "AUTH_DELETE_PENDING",
  "MANUAL_REVIEW",
  "COMPLETED",
]

export async function requestAccountDeletion(confirmationEmail: string): Promise<string> {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !data.session?.access_token) {
    throw new Error("AUTHENTICATION_REQUIRED")
  }

  const response = await fetch("/.netlify/functions/request-account-deletion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ confirmationEmail }),
  })
  const body: unknown = await response.json()
  if (
    !response.ok ||
    typeof body !== "object" ||
    body === null ||
    !("statusToken" in body) ||
    typeof body.statusToken !== "string"
  ) {
    const errorCode =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : "ACCOUNT_DELETION_REQUEST_FAILED"
    throw new Error(errorCode)
  }
  return body.statusToken
}

export async function fetchAccountDeletionStatus(
  statusToken: string,
): Promise<AccountDeletionStatus | null> {
  const response = await fetch("/.netlify/functions/account-deletion-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statusToken }),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error("ACCOUNT_DELETION_STATUS_UNAVAILABLE")

  const body: unknown = await response.json()
  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body) ||
    typeof body.status !== "string" ||
    !validStatuses.includes(body.status as AccountDeletionStatus)
  ) {
    throw new Error("ACCOUNT_DELETION_STATUS_INVALID")
  }
  return body.status as AccountDeletionStatus
}

export function accountDeletionStatusMessage(status: AccountDeletionStatus): string {
  switch (status) {
    case "PENDING":
      return "요청을 접수했습니다. 정리 작업을 기다리고 있습니다."
    case "STORAGE_CLEANUP":
      return "비공개 게임 아이콘을 정리하고 있습니다."
    case "DATA_CLEANUP":
      return "개인 데이터를 정리하고 있습니다."
    case "EMAIL_PENDING":
      return "정리 완료 안내 메일을 보내고 있습니다."
    case "AUTH_DELETE_PENDING":
      return "인증 계정 삭제를 마무리하고 있습니다."
    case "MANUAL_REVIEW":
      return "메일 공급자의 재시도 안전 기간을 지나 운영자 확인이 필요합니다. 개인 데이터 접근은 계속 차단됩니다."
    case "COMPLETED":
      return "계정 삭제가 완료되었습니다."
  }
}
