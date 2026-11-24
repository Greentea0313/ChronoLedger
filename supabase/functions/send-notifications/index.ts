/**
 * Supabase Edge Function: send-notifications (R96)
 * Self-contained pure Web Crypto worker (no external npm/deno packages).
 *
 * Required secrets:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - VAPID_PUBLIC_KEY (uncompressed 65-byte P-256 point, base64url)
 * - VAPID_PRIVATE_KEY (32-byte P-256 scalar d, base64url)
 * - VAPID_SUBJECT (mailto:... or https://...)
 * Optional secret:
 * - SEND_NOTIFICATIONS_WEBHOOK_SECRET (matched against x-webhook-secret)
 */

declare const Deno:
  | {
      env: { get(key: string): string | undefined }
      serve: (handler: (req: Request) => Response | Promise<Response>) => void
    }
  | undefined

const textEncoder = new TextEncoder()
const DEFAULT_FALLBACK_TITLE = "ChronoLedger 알림"
const DEFAULT_FALLBACK_LINK_PATH = "/dashboard"
const DEFAULT_RECORD_SIZE = 4096
const MAX_RETRY_ATTEMPTS = 3

interface ClaimedNotification {
  notification_id: string
  user_id: string
  kind: string
  title: string
  body: string
  link_path: string
  push_attempts: number
}

interface PushSubscriptionRow {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface SendNotificationsEnv {
  supabaseUrl: string
  serviceRoleKey: string
  vapidPublicKey: string
  vapidPrivateKey: string
  vapidSubject: string
  webhookSecret?: string
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) total += chunk.byteLength
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64Url(value: string): Uint8Array {
  const cleaned = value.trim().replace(/-/g, "+").replace(/_/g, "/")
  if (!cleaned || /[^A-Za-z0-9+/=]/.test(cleaned)) {
    throw new Error("Invalid base64url string")
  }
  const padLen = (4 - (cleaned.length % 4)) % 4
  const binary = atob(cleaned + "=".repeat(padLen))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = textEncoder.encode(a)
  const bBytes = textEncoder.encode(b)
  const maxLen = Math.max(aBytes.length, bBytes.length)
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

function sanitizeLinkPath(path: string | null | undefined): string {
  const trimmed = (path ?? "").trim()
  if (/^\/(?!\/)/.test(trimmed) && trimmed.length <= 200) return trimmed
  return DEFAULT_FALLBACK_LINK_PATH
}

function buildSafePushPayload(input: {
  title: string
  body: string
  link_path?: string | null
  tag?: string | null
}): { title: string; body: string; link_path: string; tag?: string } {
  const title = (input.title ?? "").trim().slice(0, 120) || DEFAULT_FALLBACK_TITLE
  const body = (input.body ?? "").trim().slice(0, 300)
  const link_path = sanitizeLinkPath(input.link_path)
  const tag = (input.tag ?? "").trim().slice(0, 120)
  return tag ? { title, body, link_path, tag } : { title, body, link_path }
}

async function hkdfDeriveBytes(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle
  const baseKey = await subtle.importKey("raw", toArrayBuffer(ikm), "HKDF", false, ["deriveBits"])
  const bits = await subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: toArrayBuffer(salt), info: toArrayBuffer(info) },
    baseKey,
    lengthBytes * 8,
  )
  return new Uint8Array(bits)
}

async function createVapidAuthorizationHeader(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<string> {
  const parsedUrl = new URL(endpoint)
  if (parsedUrl.protocol !== "https:") throw new Error("Endpoint must use https://")

  const publicKeyBytes = decodeBase64Url(publicKey)
  const privateKeyBytes = decodeBase64Url(privateKey)
  if (publicKeyBytes.byteLength !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error("Invalid VAPID public key")
  }
  if (privateKeyBytes.byteLength !== 32) {
    throw new Error("Invalid VAPID private key")
  }

  const normalizedPublicKey = encodeBase64Url(publicKeyBytes)
  const headerPart = encodeBase64Url(textEncoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const payloadPart = encodeBase64Url(
    textEncoder.encode(
      JSON.stringify({
        aud: parsedUrl.origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject.trim(),
      }),
    ),
  )
  const signingInput = `${headerPart}.${payloadPart}`

  const signingKey = await globalThis.crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: encodeBase64Url(publicKeyBytes.subarray(1, 33)),
      y: encodeBase64Url(publicKeyBytes.subarray(33, 65)),
      d: encodeBase64Url(privateKeyBytes),
      ext: false,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  )

  const signature = new Uint8Array(
    await globalThis.crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      toArrayBuffer(textEncoder.encode(signingInput)),
    ),
  )
  return `vapid t=${signingInput}.${encodeBase64Url(signature)}, k=${normalizedPublicKey}`
}

async function encryptWebPushPayload(payloadJson: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle
  const uaPublicBytes = decodeBase64Url(p256dh)
  const authSecret = decodeBase64Url(auth)
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const serverKeyPair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
  const serverPublicBytes = new Uint8Array(await subtle.exportKey("raw", serverKeyPair.publicKey))

  const uaPublicKey = await subtle.importKey(
    "raw",
    toArrayBuffer(uaPublicBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, serverKeyPair.privateKey, 256),
  )

  const keyInfo = concatBytes(textEncoder.encode("WebPush: info\0"), uaPublicBytes, serverPublicBytes)
  const ikm = await hkdfDeriveBytes(ecdhSecret, authSecret, keyInfo, 32)
  const cek = await hkdfDeriveBytes(ikm, salt, textEncoder.encode("Content-Encoding: aes128gcm\0"), 16)
  const nonce = await hkdfDeriveBytes(ikm, salt, textEncoder.encode("Content-Encoding: nonce\0"), 12)

  const paddedPlaintext = concatBytes(textEncoder.encode(payloadJson), new Uint8Array([0x02]))
  const aesKey = await subtle.importKey("raw", toArrayBuffer(cek), { name: "AES-GCM" }, false, ["encrypt"])
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(nonce), tagLength: 128 },
      aesKey,
      toArrayBuffer(paddedPlaintext),
    ),
  )

  const rsBytes = new Uint8Array(4)
  new DataView(rsBytes.buffer).setUint32(0, DEFAULT_RECORD_SIZE, false)
  return concatBytes(salt, rsBytes, new Uint8Array([serverPublicBytes.byteLength]), serverPublicBytes, ciphertext)
}

function readEnvFromDeno(): SendNotificationsEnv {
  const get = (key: string) => Deno?.env.get(key)?.trim() ?? ""
  return {
    supabaseUrl: get("SUPABASE_URL").replace(/\/+$/, ""),
    serviceRoleKey: get("SUPABASE_SERVICE_ROLE_KEY"),
    vapidPublicKey: get("VAPID_PUBLIC_KEY"),
    vapidPrivateKey: get("VAPID_PRIVATE_KEY"),
    vapidSubject: get("VAPID_SUBJECT"),
    webhookSecret: get("SEND_NOTIFICATIONS_WEBHOOK_SECRET") || undefined,
  }
}

function isAuthorizedRequest(req: Request, env: SendNotificationsEnv): boolean {
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Bearer ") && env.serviceRoleKey) {
    if (timingSafeEqual(authHeader.slice(7).trim(), env.serviceRoleKey)) return true
  }
  const secretHeader = req.headers.get("x-webhook-secret")?.trim() ?? ""
  if (env.webhookSecret && secretHeader) {
    if (timingSafeEqual(secretHeader, env.webhookSecret)) return true
  }
  return false
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function handleSendNotificationsRequest(
  req: Request,
  options?: { env?: SendNotificationsEnv; fetchImpl?: typeof fetch },
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const env = options?.env ?? readEnvFromDeno()
  if (
    !env.supabaseUrl ||
    !env.serviceRoleKey ||
    !env.vapidPublicKey ||
    !env.vapidPrivateKey ||
    !env.vapidSubject
  ) {
    console.error("send-notifications: missing required environment secrets")
    return jsonResponse({ error: "Server configuration incomplete" }, 500)
  }

  if (!isAuthorizedRequest(req, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const fetchImpl = options?.fetchImpl ?? fetch
  const serviceHeaders = {
    apikey: env.serviceRoleKey,
    Authorization: `Bearer ${env.serviceRoleKey}`,
    "Content-Type": "application/json",
  }

  // 1) Claim pending push notifications via SECURITY DEFINER RPC.
  const claimResponse = await fetchImpl(`${env.supabaseUrl}/rest/v1/rpc/claim_pending_push_notifications`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ p_limit: 50 }),
  })
  if (!claimResponse.ok) {
    console.error(`send-notifications: claim RPC failed (status=${claimResponse.status})`)
    return jsonResponse({ error: "Failed to claim notifications" }, 502)
  }

  const claimed = (await claimResponse.json()) as ClaimedNotification[]
  if (!Array.isArray(claimed) || claimed.length === 0) {
    return jsonResponse({ processed: 0, sent: 0, skipped: 0, retrying: 0, failed: 0 })
  }

  // 2) Fetch active subscriptions for all claimed users in one batch.
  const uniqueUserIds = Array.from(new Set(claimed.map((item) => item.user_id)))
  const userFilter = encodeURIComponent(`(${uniqueUserIds.join(",")})`)
  const subsResponse = await fetchImpl(
    `${env.supabaseUrl}/rest/v1/push_subscriptions?user_id=in.${userFilter}&select=user_id,endpoint,p256dh,auth`,
    {
      method: "GET",
      headers: serviceHeaders,
    },
  )
  if (!subsResponse.ok) {
    console.error(`send-notifications: subscriptions fetch failed (status=${subsResponse.status})`)
    return jsonResponse({ error: "Failed to load subscriptions" }, 502)
  }

  const subscriptions = (await subsResponse.json()) as PushSubscriptionRow[]
  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const sub of subscriptions) {
    const list = subsByUser.get(sub.user_id) ?? []
    list.push(sub)
    subsByUser.set(sub.user_id, list)
  }

  let sent = 0
  let skipped = 0
  let retrying = 0
  let failed = 0

  // 3) Encrypt and deliver each claimed notification; never log endpoints or keys.
  for (const notif of claimed) {
    const userSubs = subsByUser.get(notif.user_id) ?? []
    const expiredEndpoints: string[] = []
    const succeededEndpoints: string[] = []
    let hasRetryableError = false

    if (userSubs.length === 0) {
      skipped += 1
      await fetchImpl(`${env.supabaseUrl}/rest/v1/rpc/complete_push_notification_delivery`, {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          p_notification_id: notif.notification_id,
          p_status: "SKIPPED",
          p_expired_endpoints: [],
          p_succeeded_endpoints: [],
        }),
      })
      continue
    }

    const payloadJson = JSON.stringify(
      buildSafePushPayload({
        title: notif.title,
        body: notif.body,
        link_path: notif.link_path,
        tag: `${notif.kind}:${notif.notification_id}`,
      }),
    )

    for (const sub of userSubs) {
      try {
        const authorization = await createVapidAuthorizationHeader(
          sub.endpoint,
          env.vapidSubject,
          env.vapidPublicKey,
          env.vapidPrivateKey,
        )
        const encryptedBody = await encryptWebPushPayload(payloadJson, sub.p256dh, sub.auth)
        const pushRes = await fetchImpl(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: "normal",
          },
          body: toArrayBuffer(encryptedBody),
        })

        if (pushRes.status >= 200 && pushRes.status < 300) {
          succeededEndpoints.push(sub.endpoint)
        } else if (pushRes.status === 404 || pushRes.status === 410) {
          expiredEndpoints.push(sub.endpoint)
        } else if (pushRes.status === 429 || pushRes.status >= 500) {
          hasRetryableError = true
          console.warn(
            `send-notifications: retryable push error (notification_id=${notif.notification_id}, status=${pushRes.status})`,
          )
        } else {
          console.warn(
            `send-notifications: permanent push error (notification_id=${notif.notification_id}, status=${pushRes.status})`,
          )
        }
      } catch {
        hasRetryableError = true
        console.warn(`send-notifications: network/crypto delivery error (notification_id=${notif.notification_id})`)
      }
    }

    let finalStatus: "SENT" | "PENDING" | "FAILED"
    if (succeededEndpoints.length > 0) {
      finalStatus = "SENT"
      sent += 1
    } else if (hasRetryableError && notif.push_attempts < MAX_RETRY_ATTEMPTS) {
      finalStatus = "PENDING"
      retrying += 1
    } else {
      finalStatus = "FAILED"
      failed += 1
    }

    const completeRes = await fetchImpl(`${env.supabaseUrl}/rest/v1/rpc/complete_push_notification_delivery`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({
        p_notification_id: notif.notification_id,
        p_status: finalStatus,
        p_expired_endpoints: expiredEndpoints,
        p_succeeded_endpoints: succeededEndpoints,
      }),
    })
    if (!completeRes.ok) {
      console.error(
        `send-notifications: complete RPC failed (notification_id=${notif.notification_id}, status=${completeRes.status})`,
      )
    }
  }

  return jsonResponse({
    processed: claimed.length,
    sent,
    skipped,
    retrying,
    failed,
  })
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve((req) => handleSendNotificationsRequest(req))
}
