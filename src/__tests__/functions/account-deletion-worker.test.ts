import { beforeEach, describe, expect, it, vi } from "vitest"
import { handler } from "./account-deletion-worker"

const {
  createServiceClient,

  rpc,
  from,
  list,
  remove,
  getUserById,
  deleteUser,
  updateDeletionJob,
  updateCalls,
  deleteCalls,
} = vi.hoisted(() => {
  const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = []
  const deleteCalls: Array<{ table: string; column: string; value: string }> = []
  const job = {
    id: "job-1",
    user_id: "user-1",
    status_token_hash: "a".repeat(64),
    status: "PENDING",
    attempt_count: 1,
    storage_completed_at: null,
    data_completed_at: null,
    email_attempted_at: null,
    email_sent_at: null,
  }
  const rpc = vi.fn().mockResolvedValue({ data: [job], error: null })
  const list = vi.fn().mockResolvedValue({ data: [], error: null })
  const remove = vi.fn().mockResolvedValue({ error: null })
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: { id: "user-1", email: "user@example.com" } },
    error: null,
  })
  const deleteUser = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => ({
    update: (values: Record<string, unknown>) => {
      updateCalls.push({ table, values })
      return { eq: vi.fn().mockResolvedValue({ error: null }) }
    },
    delete: () => ({
      eq: (column: string, value: string) => {
        deleteCalls.push({ table, column, value })
        return Object.assign(Promise.resolve({ error: null }), {
          lt: vi.fn().mockResolvedValue({ error: null }),
        })
      },
    }),
  }))
  const serviceClient = {
    rpc,
    from,
    storage: { from: () => ({ list, remove }) },
    auth: { admin: { getUserById, deleteUser } },
  }
  return {
    createServiceClient: vi.fn(() => serviceClient),
    
    rpc,
    from,
    list,
    remove,
    getUserById,
    deleteUser,
    updateDeletionJob: vi.fn(async (jobId: string, values: Record<string, unknown>) => {
      updateCalls.push({ table: jobId, values })
    }),
    updateCalls,
    deleteCalls,
  }
})

vi.mock("../functions-lib/account-deletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../functions-lib/account-deletion")>()
  return { ...actual, createServiceClient,updateDeletionJob }
})

describe("account-deletion-worker function", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.RESEND_API_KEY = "resend-test-key"
    process.env.RESEND_FROM_EMAIL = "ChronoLedger <no-reply@example.com>"
    fetchMock.mockReset().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)
    rpc.mockClear().mockResolvedValue({
      data: [{
        id: "job-1",
        user_id: "user-1",
        status_token_hash: "a".repeat(64),
        status: "PENDING",
        attempt_count: 1,
        storage_completed_at: null,
        data_completed_at: null,
        email_attempted_at: null,
        email_sent_at: null,
      }],
      error: null,
    })
    list.mockReset().mockResolvedValue({ data: [], error: null })
    remove.mockReset().mockResolvedValue({ error: null })
    getUserById.mockReset().mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    })
    deleteUser.mockReset().mockResolvedValue({ error: null })
    updateCalls.length = 0
    deleteCalls.length = 0
    from.mockClear()
  })

  it("cleans icons and personal rows, sends idempotent mail, then deletes Auth", async () => {
    const response = await handler({} as never, {} as never)

    expect(response).toMatchObject({ statusCode: 200 })
    expect(rpc).toHaveBeenCalledWith("claim_account_deletion_requests", { p_limit: 5 })
    expect(list).toHaveBeenCalledWith("user-1", expect.objectContaining({ limit: 100 }))
    expect(remove).not.toHaveBeenCalled()
    expect(deleteCalls.map(({ table, column, value }) => ({ table, column, value }))).toEqual(
      [
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
      ].map((table) => ({ table, column: "user_id", value: "user-1" }))
        .concat({ table: "account_deletion_requests", column: "status", value: "COMPLETED" }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "chronoledger-account-deletion-job-1",
        }),
      }),
    )
    expect(getUserById).toHaveBeenCalledWith("user-1")
    expect(deleteUser).toHaveBeenCalledWith("user-1")
    expect(updateCalls.map(({ values }) => values.status)).toEqual([
      "STORAGE_CLEANUP",
      "DATA_CLEANUP",
      "EMAIL_PENDING",
      undefined,
      "AUTH_DELETE_PENDING",
      "COMPLETED",
    ])
    expect(updateCalls.find(({ values }) => values.email_attempted_at)?.values).toMatchObject({
      email_attempted_at: expect.any(String),
      last_error_code: null,
    })
    expect(updateCalls.at(-1)?.values).toMatchObject({ user_id: null, status: "COMPLETED" })
  })

  it("leaves personal rows intact and schedules retry when Storage cleanup fails", async () => {
    list.mockResolvedValueOnce({ data: null, error: { message: "storage unavailable" } })

    const response = await handler({} as never, {} as never)

    expect(response).toMatchObject({ statusCode: 200 })
    expect(deleteCalls.filter(({ table }) => table !== "account_deletion_requests")).toEqual([])
    expect(deleteUser).not.toHaveBeenCalled()
    expect(updateCalls.at(-1)?.values).toMatchObject({
      retry_after: expect.any(String),
      locked_until: null,
      last_error_code: "STORAGE_CLEANUP_FAILED",
    })
  })

  it("pauses for manual review rather than risking a duplicate email outside Resend's idempotency window", async () => {
    rpc.mockResolvedValueOnce({
      data: [{
        id: "job-1",
        user_id: "user-1",
        status_token_hash: "a".repeat(64),
        status: "EMAIL_PENDING",
        attempt_count: 10,
        storage_completed_at: new Date().toISOString(),
        data_completed_at: new Date().toISOString(),
        email_attempted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        email_sent_at: null,
      }],
      error: null,
    })

    await handler({} as never, {} as never)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    expect(updateCalls.at(-1)?.values).toMatchObject({
      status: "MANUAL_REVIEW",
      last_error_code: "EMAIL_IDEMPOTENCY_WINDOW_EXPIRED",
      locked_until: null,
    })
  })
})
