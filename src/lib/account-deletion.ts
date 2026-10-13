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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("AUTHENTICATION_REQUIRED")
  }

  const { data, error } = await supabase.rpc("request_account_deletion", {
    p_confirmation_email: confirmationEmail,
  })

  if (error) {
    if (error.message.includes("CONFIRMATION_REQUIRED")) {
      throw new Error("CONFIRMATION_REQUIRED")
    }
    if (error.message.includes("AUTHENTICATION_REQUIRED")) {
      throw new Error("AUTHENTICATION_REQUIRED")
    }
    throw new Error("ACCOUNT_DELETION_REQUEST_FAILED")
  }

  if (typeof data !== "string" || !data) {
    throw new Error("ACCOUNT_DELETION_REQUEST_FAILED")
  }

  return data
}

export async function fetchAccountDeletionStatus(
  statusToken: string,
): Promise<AccountDeletionStatus | null> {
  if (!statusToken || typeof statusToken !== "string") {
    return null
  }

  const { data, error } = await supabase.rpc("get_account_deletion_status", {
    p_status_token: statusToken,
  })

  if (error) {
    throw new Error("ACCOUNT_DELETION_STATUS_UNAVAILABLE")
  }

  if (!data) {
    return null
  }

  const parsedData = typeof data === "string" ? JSON.parse(data) : data
  if (
    typeof parsedData !== "object" ||
    parsedData === null ||
    !("status" in parsedData) ||
    typeof parsedData.status !== "string" ||
    !validStatuses.includes(parsedData.status as AccountDeletionStatus)
  ) {
    throw new Error("ACCOUNT_DELETION_STATUS_INVALID")
  }

  return parsedData.status as AccountDeletionStatus
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
