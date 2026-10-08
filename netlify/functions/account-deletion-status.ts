import type { Handler, HandlerResponse } from "@netlify/functions"
import {
  accountDeletionTable,
  createServiceClient,
  hashStatusToken,
} from "../functions-lib/account-deletion"

function respond(
  statusCode: number,
  body: string,
  headers: Record<string, string> = {},
): HandlerResponse {
  return { statusCode, body, headers }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, "Method not allowed")
  }

  let body: unknown
  try {
    body = JSON.parse(event.body ?? "")
  } catch {
    return respond(400, "Invalid request")
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("statusToken" in body) ||
    typeof body.statusToken !== "string"
  ) {
    return respond(400, "Invalid request")
  }

  try {
    const client = createServiceClient()
    const { data, error } = await client
      .from(accountDeletionTable)
      .select("status, updated_at")
      .eq("status_token_hash", hashStatusToken(body.statusToken))
      .maybeSingle()

    if (error) throw new Error("ACCOUNT_DELETION_STATUS_LOOKUP_FAILED")
    if (!data) {
      return respond(404, JSON.stringify({ error: "STATUS_NOT_FOUND" }), {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      })
    }

    return respond(200, JSON.stringify({ status: data.status, updatedAt: data.updated_at }), {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
  } catch {
    console.error("ACCOUNT_DELETION_STATUS_LOOKUP_FAILED")
    return respond(500, "Status unavailable")
  }
}
