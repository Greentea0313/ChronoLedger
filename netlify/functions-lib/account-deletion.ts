import { createHash, randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

export const accountDeletionTable = "account_deletion_requests"

export type AccountDeletionStatus =
  | "PENDING"
  | "STORAGE_CLEANUP"
  | "DATA_CLEANUP"
  | "EMAIL_PENDING"
  | "AUTH_DELETE_PENDING"
  | "MANUAL_REVIEW"
  | "COMPLETED"

export interface AccountDeletionJob {
  id: string
  user_id: string | null
  status_token_hash: string
  status: AccountDeletionStatus
  attempt_count: number
  storage_completed_at: string | null
  data_completed_at: string | null
  email_attempted_at: string | null
  email_sent_at: string | null
}

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_CONFIGURATION_MISSING")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function hashStatusToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function createStatusToken(): string {
  return randomUUID()
}

export function retryDelayMs(attemptCount: number): number {
  const retryExponent = Math.max(0, Math.min(attemptCount - 1, 9))
  return Math.min(60_000 * 2 ** retryExponent, 6 * 60 * 60 * 1000)
}

export async function updateDeletionJob(
  jobId: string,
  fields: Record<string, string | number | null>,
): Promise<void> {
  const client = createServiceClient()
  const { error } = await client
    .from(accountDeletionTable)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", jobId)

  if (error) throw new Error("ACCOUNT_DELETION_JOB_UPDATE_FAILED")
}
