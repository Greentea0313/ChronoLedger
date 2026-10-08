import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchAccountDeletionStatus,
  requestAccountDeletion,
} from "./account-deletion"
import { retryDelayMs } from "../../netlify/functions-lib/account-deletion"

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession } },
}))

describe("account deletion client", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    })
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("sends the user's bearer session and confirmation email to the request function", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "PENDING", statusToken: "opaque-status-token" }),
    })

    await expect(requestAccountDeletion("user@example.com")).resolves.toBe("opaque-status-token")
    expect(fetchMock).toHaveBeenCalledWith(
      "/.netlify/functions/request-account-deletion",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer user-access-token",
        }),
        body: JSON.stringify({ confirmationEmail: "user@example.com" }),
      }),
    )
  })

  it("rejects an invalid status response and preserves explicit service errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "CONFIRMATION_REQUIRED" }),
    })
    await expect(requestAccountDeletion("wrong@example.com"))
      .rejects.toThrow("CONFIRMATION_REQUIRED")

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    })
    await expect(requestAccountDeletion("user@example.com"))
      .rejects.toThrow("ACCOUNT_DELETION_REQUEST_FAILED")
  })

  it("reads an opaque status token without exposing account details", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "DATA_CLEANUP" }),
    })
    await expect(fetchAccountDeletionStatus("opaque-token")).resolves.toBe("DATA_CLEANUP")
  })
})

describe("account deletion retry delay", () => {
  it("increases retry delay and caps it", () => {
    expect(retryDelayMs(1)).toBe(60_000)
    expect(retryDelayMs(2)).toBe(120_000)
    expect(retryDelayMs(20)).toBe(6 * 60 * 60 * 1000)
  })
})
