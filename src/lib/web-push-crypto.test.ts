import { describe, expect, it, vi } from "vitest"
import {
  buildSafePushPayload,
  createVapidAuthorizationHeader,
  decodeBase64Url,
  decryptWebPushPayload,
  encodeBase64Url,
  encryptWebPushPayload,
  sanitizePushLinkPath,
  toArrayBuffer,
} from "./web-push-crypto"
import { handleSendNotificationsRequest } from "../../supabase/functions/send-notifications/index"

async function generateVapidKeyPair() {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey)
  if (!privateJwk.d) throw new Error("Missing private scalar d")
  return {
    keyPair,
    publicKey: encodeBase64Url(publicRaw),
    privateKey: privateJwk.d,
  }
}

async function generateSubscriberKeys() {
  const uaKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
  const p256dh = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey("raw", uaKeyPair.publicKey)))
  const auth = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
  return { uaKeyPair, p256dh, auth }
}

describe("web-push-crypto (RFC 8292 VAPID & RFC 8291 aes128gcm)", () => {
  it("encrypts and decrypts UTF-8 notification payloads via RFC 8291 aes128gcm round-trip", async () => {
    const { uaKeyPair, p256dh, auth } = await generateSubscriberKeys()
    const payload = JSON.stringify(
      buildSafePushPayload({
        title: "오늘 시작하는 관심 일정이 있습니다",
        body: "원신 5.4 업데이트 일정이 오늘 시작합니다.",
        link_path: "/dashboard?date=2026-11-24",
        tag: "FAVORITE_START:123",
      }),
    )

    const encrypted = await encryptWebPushPayload({ payload, p256dh, auth })
    expect(encrypted.contentEncoding).toBe("aes128gcm")
    expect(encrypted.salt.byteLength).toBe(16)
    expect(encrypted.serverPublicKey.byteLength).toBe(65)
    expect(encrypted.body[20]).toBe(65)

    const decrypted = await decryptWebPushPayload({ body: encrypted.body, uaKeyPair, auth })
    expect(decrypted).toBe(payload)
  })

  it("creates a verifiable RFC 8292 ES256 VAPID Authorization header", async () => {
    const vapid = await generateVapidKeyPair()
    const now = 1_800_000_000
    const result = await createVapidAuthorizationHeader({
      endpoint: "https://fcm.googleapis.com/fcm/send/example-token",
      subject: "mailto:ops@chronoledger.example",
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      expirationSeconds: 3600,
      nowSeconds: now,
    })

    expect(result.authorization).toBe(`vapid t=${result.jwt}, k=${vapid.publicKey}`)
    expect(result.audience).toBe("https://fcm.googleapis.com")
    expect(result.expiresAt).toBe(now + 3600)

    const [headerB64, payloadB64, signatureB64] = result.jwt.split(".")
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerB64)))
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadB64)))
    expect(header).toEqual({ typ: "JWT", alg: "ES256" })
    expect(claims).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: now + 3600,
      sub: "mailto:ops@chronoledger.example",
    })

    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      vapid.keyPair.publicKey,
      toArrayBuffer(decodeBase64Url(signatureB64)),
      toArrayBuffer(new TextEncoder().encode(`${headerB64}.${payloadB64}`)),
    )
    expect(isValid).toBe(true)
  })

  it("rejects non-https endpoints and invalid VAPID subjects", async () => {
    const vapid = await generateVapidKeyPair()
    await expect(
      createVapidAuthorizationHeader({
        endpoint: "http://insecure.example/push",
        subject: "mailto:ops@chronoledger.example",
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      }),
    ).rejects.toThrow("https://")

    await expect(
      createVapidAuthorizationHeader({
        endpoint: "https://fcm.googleapis.com/fcm/send/token",
        subject: "invalid-subject",
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
      }),
    ).rejects.toThrow("subject")
  })

  it("forces safe same-origin relative link_path and fallback title", () => {
    expect(sanitizePushLinkPath("/dashboard/expenses")).toBe("/dashboard/expenses")
    expect(sanitizePushLinkPath("https://evil.example/phish")).toBe("/dashboard")
    expect(sanitizePushLinkPath("//evil.example/phish")).toBe("/dashboard")
    expect(sanitizePushLinkPath("javascript:alert(1)")).toBe("/dashboard")

    const built = buildSafePushPayload({
      title: "   ",
      body: "내일 결제 예정인 지출이 있습니다.",
      link_path: "https://evil.example",
    })
    expect(built).toEqual({
      title: "ChronoLedger 알림",
      body: "내일 결제 예정인 지출이 있습니다.",
      link_path: "/dashboard",
    })
  })
})

describe("send-notifications Edge Function worker", () => {
  it("rejects unauthorized requests with 401", async () => {
    const vapid = await generateVapidKeyPair()
    const res = await handleSendNotificationsRequest(
      new Request("https://edge.example/send-notifications", { method: "POST" }),
      {
        env: {
          supabaseUrl: "https://proj.supabase.co",
          serviceRoleKey: "service-role-secret",
          vapidPublicKey: vapid.publicKey,
          vapidPrivateKey: vapid.privateKey,
          vapidSubject: "mailto:ops@chronoledger.example",
          webhookSecret: "hook-secret",
        },
      },
    )
    expect(res.status).toBe(401)
  })

  it("cleans 404/410 expired endpoints, retries 429/5xx up to 3 attempts, and avoids logging sensitive values", async () => {
    const vapid = await generateVapidKeyPair()
    const subOk = await generateSubscriberKeys()
    const subGone = await generateSubscriberKeys()
    const subRetry = await generateSubscriberKeys()

    const secretEndpointOk = "https://push.example/secret-ok-endpoint"
    const secretEndpointGone = "https://push.example/secret-gone-endpoint"
    const secretEndpointRetry = "https://push.example/secret-retry-endpoint"

    const completeCalls: Array<Record<string, unknown>> = []
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.endsWith("/rest/v1/rpc/claim_pending_push_notifications")) {
        return new Response(
          JSON.stringify([
            {
              notification_id: "notif-1",
              user_id: "user-1",
              kind: "FAVORITE_START",
              title: "관심 일정",
              body: "오늘 시작",
              link_path: "/dashboard",
              push_attempts: 1,
            },
            {
              notification_id: "notif-2",
              user_id: "user-2",
              kind: "EXPENSE_D1",
              title: "예정 지출",
              body: "내일 결제 예정",
              link_path: "/dashboard/expenses",
              push_attempts: 2,
            },
            {
              notification_id: "notif-3",
              user_id: "user-2",
              kind: "EXPENSE_D1",
              title: "예정 지출",
              body: "내일 결제 예정",
              link_path: "/dashboard/expenses",
              push_attempts: 3,
            },
          ]),
          { status: 200 },
        )
      }
      if (url.includes("/rest/v1/push_subscriptions")) {
        return new Response(
          JSON.stringify([
            { user_id: "user-1", endpoint: secretEndpointOk, p256dh: subOk.p256dh, auth: subOk.auth },
            { user_id: "user-1", endpoint: secretEndpointGone, p256dh: subGone.p256dh, auth: subGone.auth },
            { user_id: "user-2", endpoint: secretEndpointRetry, p256dh: subRetry.p256dh, auth: subRetry.auth },
          ]),
          { status: 200 },
        )
      }
      if (url.endsWith("/rest/v1/rpc/complete_push_notification_delivery")) {
        completeCalls.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>)
        return new Response(null, { status: 204 })
      }
      if (url === secretEndpointOk) return new Response("", { status: 201 })
      if (url === secretEndpointGone) return new Response("", { status: 410 })
      if (url === secretEndpointRetry) return new Response("", { status: 429 })
      return new Response("", { status: 500 })
    })

    try {
      const res = await handleSendNotificationsRequest(
        new Request("https://edge.example/send-notifications", {
          method: "POST",
          headers: { "x-webhook-secret": "hook-secret" },
        }),
        {
          env: {
            supabaseUrl: "https://proj.supabase.co",
            serviceRoleKey: "service-role-secret",
            vapidPublicKey: vapid.publicKey,
            vapidPrivateKey: vapid.privateKey,
            vapidSubject: "mailto:ops@chronoledger.example",
            webhookSecret: "hook-secret",
          },
          fetchImpl: fetchMock as unknown as typeof fetch,
        },
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        processed: 3,
        sent: 1,
        skipped: 0,
        retrying: 1,
        failed: 1,
      })

      expect(completeCalls).toEqual([
        {
          p_notification_id: "notif-1",
          p_status: "SENT",
          p_expired_endpoints: [secretEndpointGone],
          p_succeeded_endpoints: [secretEndpointOk],
        },
        {
          p_notification_id: "notif-2",
          p_status: "PENDING",
          p_expired_endpoints: [],
          p_succeeded_endpoints: [],
        },
        {
          p_notification_id: "notif-3",
          p_status: "FAILED",
          p_expired_endpoints: [],
          p_succeeded_endpoints: [],
        },
      ])

      const allLogs = [...warnSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ")
      expect(allLogs).not.toContain(secretEndpointRetry)
      expect(allLogs).not.toContain(subRetry.p256dh)
      expect(allLogs).not.toContain(subRetry.auth)
      expect(allLogs).not.toContain(vapid.privateKey)
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it("sends a body that the subscriber can decrypt with the library helper (worker copy stays RFC 8291 compatible)", async () => {
    const vapid = await generateVapidKeyPair()
    const sub = await generateSubscriberKeys()
    const endpoint = "https://push.example/decrypt-check"
    const captured: { body?: Uint8Array; headers?: Headers } = {}

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.endsWith("/rest/v1/rpc/claim_pending_push_notifications")) {
        return new Response(
          JSON.stringify([
            {
              notification_id: "notif-d",
              user_id: "user-d",
              kind: "REQUEST_APPROVED",
              title: "게임 요청이 승인되었습니다",
              body: "내 요청 현황에서 확인하세요.",
              link_path: "/dashboard/games",
              push_attempts: 1,
            },
          ]),
          { status: 200 },
        )
      }
      if (url.includes("/rest/v1/push_subscriptions")) {
        return new Response(JSON.stringify([{ user_id: "user-d", endpoint, p256dh: sub.p256dh, auth: sub.auth }]), { status: 200 })
      }
      if (url === endpoint) {
        captured.body = new Uint8Array(init?.body as ArrayBuffer)
        captured.headers = new Headers(init?.headers)
        return new Response("", { status: 201 })
      }
      return new Response(null, { status: 204 })
    })

    const res = await handleSendNotificationsRequest(
      new Request("https://edge.example/send-notifications", { method: "POST", headers: { "x-webhook-secret": "hook-secret" } }),
      {
        env: {
          supabaseUrl: "https://proj.supabase.co",
          serviceRoleKey: "service-role-secret",
          vapidPublicKey: vapid.publicKey,
          vapidPrivateKey: vapid.privateKey,
          vapidSubject: "mailto:ops@chronoledger.example",
          webhookSecret: "hook-secret",
        },
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    )

    expect(res.status).toBe(200)
    expect(captured.body).toBeDefined()
    expect(captured.headers?.get("Content-Encoding")).toBe("aes128gcm")
    expect(captured.headers?.get("Authorization")).toMatch(new RegExp(`^vapid t=[^.]+\.[^.]+\.[^,]+, k=${vapid.publicKey}$`))
    const plaintext = await decryptWebPushPayload({ body: captured.body as Uint8Array, uaKeyPair: sub.uaKeyPair, auth: sub.auth })
    expect(JSON.parse(plaintext)).toEqual({
      title: "게임 요청이 승인되었습니다",
      body: "내 요청 현황에서 확인하세요.",
      link_path: "/dashboard/games",
      tag: "REQUEST_APPROVED:notif-d",
    })
  })
})
