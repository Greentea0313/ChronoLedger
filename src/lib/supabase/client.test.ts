import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}))

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key")
    createClientMock.mockReset().mockReturnValue({})
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
  })

  it("creates one PKCE client with URL session detection disabled", async () => {
    const clientModule = await import("./client")
    const repeatedImport = await import("./client")

    expect(clientModule.supabase).toBe(repeatedImport.supabase)
    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-anon-key",
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
        },
      },
    )
  })

  it("uses the implicit flow in the Tauri runtime", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {} })

    await import("./client")

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-anon-key",
      {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: false,
        },
      },
    )
  })

  it("reports missing public Supabase configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")

    await expect(import("./client")).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
