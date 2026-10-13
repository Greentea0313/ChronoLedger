import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchAccountDeletionStatus,
  requestAccountDeletion,
} from "./account-deletion"
import { retryDelayMs } from "../../netlify/functions-lib/account-deletion"

const { getSession, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getSession },
    rpc,
  },
}))

describe("account deletion client", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    })
    rpc.mockReset()
  })

  it("calls request_account_deletion RPC with confirmation email and returns status token", async () => {
    rpc.mockResolvedValueOnce({
      data: "opaque-status-token",
      error: null,
    })

    await expect(requestAccountDeletion("user@example.com")).resolves.toBe("opaque-status-token")
    expect(rpc).toHaveBeenCalledWith("request_account_deletion", {
      p_confirmation_email: "user@example.com",
    })
  })

  it("rejects an invalid confirmation email and preserves explicit RPC errors", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "CONFIRMATION_REQUIRED" },
    })
    await expect(requestAccountDeletion("wrong@example.com"))
      .rejects.toThrow("CONFIRMATION_REQUIRED")

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "SOME_UNEXPECTED_ERROR" },
    })
    await expect(requestAccountDeletion("user@example.com"))
      .rejects.toThrow("ACCOUNT_DELETION_REQUEST_FAILED")
  })

  it("reads an opaque status token via get_account_deletion_status RPC without exposing details", async () => {
    rpc.mockResolvedValueOnce({
      data: { status: "DATA_CLEANUP", updatedAt: "2026-10-13T00:00:00Z" },
      error: null,
    })
    await expect(fetchAccountDeletionStatus("opaque-token")).resolves.toBe("DATA_CLEANUP")
    expect(rpc).toHaveBeenCalledWith("get_account_deletion_status", {
      p_status_token: "opaque-token",
    })
  })

  it("returns null when status token is not found or empty", async () => {
    await expect(fetchAccountDeletionStatus("")).resolves.toBeNull()

    rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    await expect(fetchAccountDeletionStatus("not-found-token")).resolves.toBeNull()
  })
})

describe("account deletion retry delay", () => {
  it("increases retry delay and caps it", () => {
    expect(retryDelayMs(1)).toBe(60_000)
    expect(retryDelayMs(2)).toBe(120_000)
    expect(retryDelayMs(20)).toBe(6 * 60 * 60 * 1000)
  })
})
