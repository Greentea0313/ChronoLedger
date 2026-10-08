import { createClient } from "@supabase/supabase-js"
import type { Handler } from "@netlify/functions"
import {
  accountDeletionTable,
  createServiceClient,
  createStatusToken,
  hashStatusToken,
} from "../functions-lib/account-deletion"

function respond(statusCode: number, body: Record<string, string>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "METHOD_NOT_ALLOWED" })
  }

  const authorization = event.headers.authorization
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!bearerToken || !supabaseUrl || !anonKey) {
    return respond(401, { error: "AUTHENTICATION_REQUIRED" })
  }

  try {
    const identityClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await identityClient.auth.getUser(bearerToken)
    if (error || !data.user?.id || !data.user.email) {
      return respond(401, { error: "AUTHENTICATION_REQUIRED" })
    }

    let requestBody: unknown
    try {
      requestBody = JSON.parse(event.body ?? "")
    } catch {
      return respond(400, { error: "INVALID_REQUEST" })
    }

    if (
      typeof requestBody !== "object" ||
      requestBody === null ||
      !("confirmationEmail" in requestBody) ||
      typeof requestBody.confirmationEmail !== "string" ||
      requestBody.confirmationEmail.trim().toLowerCase() !== data.user.email.toLowerCase()
    ) {
      return respond(400, { error: "CONFIRMATION_REQUIRED" })
    }

    const statusToken = createStatusToken()
    const client = createServiceClient()
    const { data: job, error: insertError } = await client
      .from(accountDeletionTable)
      .upsert(
        {
          user_id: data.user.id,
          status_token_hash: hashStatusToken(statusToken),
        },
        { onConflict: "user_id" },
      )
      .select("status")
      .single()

    if (insertError || !job) {
      console.error("ACCOUNT_DELETION_REQUEST_SAVE_FAILED")
      return respond(500, { error: "ACCOUNT_DELETION_REQUEST_FAILED" })
    }

    return {
      ...respond(202, { status: job.status, statusToken }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  } catch {
    console.error("ACCOUNT_DELETION_REQUEST_FAILED")
    return respond(500, { error: "ACCOUNT_DELETION_REQUEST_FAILED" })
  }
}
