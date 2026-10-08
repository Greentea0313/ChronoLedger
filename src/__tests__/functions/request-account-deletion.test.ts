import { beforeEach, describe, expect, it, vi } from "vitest"
import { handler } from "./request-account-deletion"

const { createClientMock, serviceClient, upsert, select, single, getUser } = vi.hoisted(() => {
  const single = vi.fn()
  const select = vi.fn(() => ({ single }))
  const upsert = vi.fn(() => ({ select }))
  const serviceClient = { from: vi.fn(() => ({ upsert })) }
  return {
    createClientMock: vi.fn(),
    serviceClient,
    upsert,
    select,
    single,
    getUser: vi.fn(),
  }
})

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}))

vi.mock("../functions-lib/account-deletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../functions-lib/account-deletion")>()
  return { ...actual, createServiceClient: () => serviceClient }
})

function event(body: unknown, authorization?: string) {
  return {
    httpMethod: "POST",
    headers: authorization ? { authorization } : {},
    body: JSON.stringify(body),
  } as Parameters<typeof handler>[0]
}

describe("request-account-deletion function", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key"
    createClientMock.mockReset().mockReturnValue({ auth: { getUser } })
    getUser.mockReset().mockResolvedValue({
      data: { user: { id: "verified-user-id", email: "user@example.com" } },
      error: null,
    })
    upsert.mockClear()
    select.mockClear()
    single.mockReset().mockResolvedValue({ data: { status: "PENDING" }, error: null })
    serviceClient.from.mockClear()
  })

  it("rejects requests without an authenticated bearer token", async () => {
    const response = await handler(event({ confirmationEmail: "user@example.com" }), {} as never)
    if (!response) throw new Error("Handler returned no response")
    expect(response.statusCode).toBe(401)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it("requires an exact match with the authenticated user's email", async () => {
    const response = await handler(
      event({ confirmationEmail: "someone-else@example.com" }, "Bearer valid-session"),
      {} as never,
    )
    if (!response) throw new Error("Handler returned no response")
    expect(response.statusCode).toBe(400)
    expect(serviceClient.from).not.toHaveBeenCalled()
  })

  it("creates a deletion request for the identity returned by Supabase Auth", async () => {
    const response = await handler(
      event({ confirmationEmail: "USER@example.com" }, "Bearer valid-session"),
      {} as never,
    )
    if (!response) throw new Error("Handler returned no response")
    const body = JSON.parse(response.body ?? "{}") as { statusToken: string }

    expect(response.statusCode).toBe(202)
    expect(body.statusToken).toMatch(/^[0-9a-f-]{36}$/i)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "verified-user-id",
        status_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
      { onConflict: "user_id" },
    )
  })
})
