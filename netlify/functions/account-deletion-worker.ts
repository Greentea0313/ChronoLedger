import type { Handler } from "@netlify/functions"
import { createClient } from "@supabase/supabase-js"
import {
  accountDeletionTable,
  createServiceClient,
  retryDelayMs,
  updateDeletionJob,
  type AccountDeletionJob,
} from "../functions-lib/account-deletion"

const personalTables = [
  "schedule_requests",
  "game_requests",
  "store_point_transactions",
  "expenses",
  "subscription_templates",
  "personal_memos",
  "user_games",
  "monthly_budgets",
  "store_wallets",
  "user_finances",
] as const

async function removeUserIcons(userId: string): Promise<void> {
  const client = createServiceClient()
  const bucket = client.storage.from("user-icons")
  const folders = [userId]
  const files: string[] = []

  while (folders.length > 0) {
    const folder = folders.pop()
    if (!folder) continue

    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      })
      if (error) throw new Error("STORAGE_CLEANUP_FAILED")

      for (const item of data) {
        const path = `${folder}/${item.name}`
        if (item.id === null && item.metadata === null) {
          folders.push(path)
        } else {
          files.push(path)
        }
      }
      if (data.length < 100) break
    }
  }

  for (let offset = 0; offset < files.length; offset += 100) {
    const { error } = await bucket.remove(files.slice(offset, offset + 100))
    if (error) throw new Error("STORAGE_CLEANUP_FAILED")
  }
}

async function removePersonalData(userId: string): Promise<void> {
  const client = createServiceClient()
  for (const table of personalTables) {
    const { error } = await client.from(table).delete().eq("user_id", userId)
    if (error) throw new Error("DATA_CLEANUP_FAILED")
  }
}

async function sendCleanupEmail(jobId: string, email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw new Error("EMAIL_CONFIGURATION_MISSING")

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `chronoledger-account-deletion-${jobId}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "ChronoLedger 계정 삭제 안내",
      html: "<p>요청하신 개인 데이터와 비공개 아이콘 정리가 완료되었습니다. 계정 삭제를 마무리하고 있습니다.</p>",
    }),
  })
  if (!response.ok) throw new Error("EMAIL_DELIVERY_FAILED")
}

function assertEmailConfiguration(): void {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("EMAIL_CONFIGURATION_MISSING")
  }
}

async function deleteAuthUser(userId: string): Promise<void> {
  const client = createServiceClient()
  const { error } = await client.auth.admin.deleteUser(userId)
  if (error && !/user not found/i.test(error.message)) {
    throw new Error("AUTH_DELETE_FAILED")
  }
}

async function processJob(job: AccountDeletionJob): Promise<void> {
  if (!job.user_id) {
    await updateDeletionJob(job.id, {
      status: "COMPLETED",
      last_error_code: null,
      locked_until: null,
    })
    return
  }

  const client = createServiceClient()
  let status = job.status
  if (status === "PENDING" || status === "STORAGE_CLEANUP") {
    await updateDeletionJob(job.id, {
      status: "STORAGE_CLEANUP",
      last_error_code: null,
    })
    await removeUserIcons(job.user_id)
    await updateDeletionJob(job.id, {
      status: "DATA_CLEANUP",
      storage_completed_at: new Date().toISOString(),
      last_error_code: null,
    })
    status = "DATA_CLEANUP"
  }

  if (status === "DATA_CLEANUP") {
    await removePersonalData(job.user_id)
    await updateDeletionJob(job.id, {
      status: "EMAIL_PENDING",
      data_completed_at: new Date().toISOString(),
      last_error_code: null,
    })
    status = "EMAIL_PENDING"
  }

  if (status === "EMAIL_PENDING") {
    const { data, error } = await client.auth.admin.getUserById(job.user_id)
    if (error || !data.user) {
      if (error && !/user not found/i.test(error.message)) {
        throw new Error("AUTH_LOOKUP_FAILED")
      }
      await updateDeletionJob(job.id, {
        status: "COMPLETED",
        user_id: null,
        locked_until: null,
        last_error_code: null,
      })
      return
    }
    if (!data.user.email) throw new Error("AUTH_EMAIL_MISSING")

    assertEmailConfiguration()
    if (job.email_attempted_at) {
      const idempotencyWindowMs = 23 * 60 * 60 * 1000
      if (Date.now() - Date.parse(job.email_attempted_at) >= idempotencyWindowMs) {
        throw new Error("EMAIL_IDEMPOTENCY_WINDOW_EXPIRED")
      }
    } else {
      await updateDeletionJob(job.id, {
        email_attempted_at: new Date().toISOString(),
        last_error_code: null,
      })
    }
    await sendCleanupEmail(job.id, data.user.email)
    await updateDeletionJob(job.id, {
      status: "AUTH_DELETE_PENDING",
      email_sent_at: new Date().toISOString(),
      last_error_code: null,
    })
    status = "AUTH_DELETE_PENDING"
  }

  if (status === "AUTH_DELETE_PENDING") {
    await deleteAuthUser(job.user_id)
    await updateDeletionJob(job.id, {
      status: "COMPLETED",
      user_id: null,
      locked_until: null,
      last_error_code: null,
    })
  }
}

function errorCode(error: unknown, status: AccountDeletionJob["status"]): string {
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    return error.message
  }
  return `${status}_FAILED`
}

export const handler: Handler = async () => {
  try {
    const client = createServiceClient()
    const { data, error } = await client.rpc("claim_account_deletion_requests", {
      p_limit: 5,
    })
    if (error) throw new Error("ACCOUNT_DELETION_CLAIM_FAILED")

    for (const job of (data ?? []) as AccountDeletionJob[]) {
      try {
        await processJob(job)
      } catch (cause) {
        console.error("ACCOUNT_DELETION_JOB_STEP_FAILED", job.id)
        const code = errorCode(cause, job.status)
        try {
          if (code === "EMAIL_IDEMPOTENCY_WINDOW_EXPIRED") {
            await updateDeletionJob(job.id, {
              status: "MANUAL_REVIEW",
              locked_until: null,
              last_error_code: code,
            })
          } else {
            const retryAfter = new Date(Date.now() + retryDelayMs(job.attempt_count))
            await updateDeletionJob(job.id, {
              retry_after: retryAfter.toISOString(),
              locked_until: null,
              last_error_code: code,
            })
          }
        } catch {
          console.error("ACCOUNT_DELETION_RETRY_SCHEDULE_FAILED", job.id)
        }
      }
    }

    const retentionLimit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: cleanupError } = await client
      .from(accountDeletionTable)
      .delete()
      .eq("status", "COMPLETED")
      .lt("updated_at", retentionLimit)
    if (cleanupError) throw new Error("ACCOUNT_DELETION_RETENTION_CLEANUP_FAILED")

    return { statusCode: 200, body: "Account deletion queue processed" }
  } catch {
    console.error("ACCOUNT_DELETION_WORKER_FAILED")
    return { statusCode: 500, body: "Account deletion worker failed" }
  }
}
