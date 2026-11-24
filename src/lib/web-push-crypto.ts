/**
 * Pure Web Crypto API implementation of Web Push standards:
 * - RFC 8292: VAPID ES256 JWT Authorization header
 * - RFC 8291 / RFC 8188: aes128gcm payload encryption
 * Zero external runtime dependencies; compatible with Browser, Node 20+, and Deno.
 */

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const DEFAULT_FALLBACK_TITLE = "ChronoLedger 알림"
const DEFAULT_FALLBACK_LINK_PATH = "/dashboard"
const DEFAULT_VAPID_EXPIRATION_SECONDS = 12 * 60 * 60
const MAX_VAPID_EXPIRATION_SECONDS = 24 * 60 * 60
const DEFAULT_RECORD_SIZE = 4096
const MAX_SINGLE_RECORD_PLAINTEXT_BYTES = 3993

export interface SafePushPayloadInput {
  title: string
  body: string
  link_path?: string | null
  tag?: string | null
}

export interface SafePushPayload {
  title: string
  body: string
  link_path: string
  tag?: string
}

export interface VapidHeaderOptions {
  endpoint: string
  subject: string
  publicKey: string
  privateKey: string
  expirationSeconds?: number
  nowSeconds?: number
}

export interface VapidHeaderResult {
  authorization: string
  jwt: string
  publicKey: string
  audience: string
  expiresAt: number
}

export interface EncryptWebPushOptions {
  payload: string | Uint8Array
  p256dh: string
  auth: string
  salt?: Uint8Array
  serverKeyPair?: CryptoKeyPair
}

export interface EncryptedWebPushPayload {
  body: Uint8Array
  contentEncoding: "aes128gcm"
  salt: Uint8Array
  serverPublicKey: Uint8Array
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
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

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export function decodeBase64Url(value: string): Uint8Array {
  const cleaned = value.trim().replace(/-/g, "+").replace(/_/g, "/")
  if (!cleaned || /[^A-Za-z0-9+/=]/.test(cleaned)) {
    throw new Error("Invalid base64url string")
  }
  const padLen = (4 - (cleaned.length % 4)) % 4
  const padded = cleaned + "=".repeat(padLen)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

export function sanitizePushLinkPath(path: string | null | undefined): string {
  const trimmed = (path ?? "").trim()
  if (/^\/(?!\/)/.test(trimmed) && trimmed.length <= 200) {
    return trimmed
  }
  return DEFAULT_FALLBACK_LINK_PATH
}

/** Allow only lock-screen-safe fields (title, body, relative link_path, optional tag). */
export function buildSafePushPayload(input: SafePushPayloadInput): SafePushPayload {
  const title = (input.title ?? "").trim().slice(0, 120) || DEFAULT_FALLBACK_TITLE
  const body = (input.body ?? "").trim().slice(0, 300)
  const link_path = sanitizePushLinkPath(input.link_path)
  const tag = (input.tag ?? "").trim().slice(0, 120)

  const payload: SafePushPayload = { title, body, link_path }
  if (tag) {
    payload.tag = tag
  }
  return payload
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available")
  }
  return globalThis.crypto.subtle
}

function extractP256PublicCoordinates(publicKeyBytes: Uint8Array): { x: string; y: string } {
  if (publicKeyBytes.byteLength !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error("P-256 public key must be a 65-byte uncompressed point (0x04 || X || Y)")
  }
  return {
    x: encodeBase64Url(publicKeyBytes.subarray(1, 33)),
    y: encodeBase64Url(publicKeyBytes.subarray(33, 65)),
  }
}

async function hkdfDeriveBytes(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  lengthBytes: number,
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto()
  const baseKey = await subtle.importKey("raw", toArrayBuffer(ikm), "HKDF", false, ["deriveBits"])
  const bits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(info),
    },
    baseKey,
    lengthBytes * 8,
  )
  return new Uint8Array(bits)
}

/** Generate an RFC 8292 `vapid t=<jwt>, k=<publicKey>` Authorization header using ES256. */
export async function createVapidAuthorizationHeader(options: VapidHeaderOptions): Promise<VapidHeaderResult> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(options.endpoint)
  } catch {
    throw new Error("Invalid push endpoint URL")
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Push endpoint must use https://")
  }

  const subject = options.subject.trim()
  if (!subject || (!subject.startsWith("mailto:") && !subject.startsWith("https://"))) {
    throw new Error("VAPID subject must start with mailto: or https://")
  }

  const publicKeyBytes = decodeBase64Url(options.publicKey)
  const privateKeyBytes = decodeBase64Url(options.privateKey)
  if (privateKeyBytes.byteLength !== 32) {
    throw new Error("VAPID private key must be 32 bytes")
  }

  const { x, y } = extractP256PublicCoordinates(publicKeyBytes)
  const normalizedPublicKey = encodeBase64Url(publicKeyBytes)
  const normalizedPrivateKey = encodeBase64Url(privateKeyBytes)

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  const ttl = Math.min(
    Math.max(1, Math.floor(options.expirationSeconds ?? DEFAULT_VAPID_EXPIRATION_SECONDS)),
    MAX_VAPID_EXPIRATION_SECONDS,
  )
  const exp = now + ttl

  const headerPart = encodeBase64Url(textEncoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const payloadPart = encodeBase64Url(
    textEncoder.encode(
      JSON.stringify({
        aud: parsedUrl.origin,
        exp,
        sub: subject,
      }),
    ),
  )
  const signingInput = `${headerPart}.${payloadPart}`

  const subtle = getSubtleCrypto()
  const signingKey = await subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      d: normalizedPrivateKey,
      ext: false,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  )

  const signatureBuffer = await subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    toArrayBuffer(textEncoder.encode(signingInput)),
  )
  const signatureBytes = new Uint8Array(signatureBuffer)
  if (signatureBytes.byteLength !== 64) {
    throw new Error("Unexpected ES256 signature length")
  }

  const jwt = `${signingInput}.${encodeBase64Url(signatureBytes)}`
  return {
    authorization: `vapid t=${jwt}, k=${normalizedPublicKey}`,
    jwt,
    publicKey: normalizedPublicKey,
    audience: parsedUrl.origin,
    expiresAt: exp,
  }
}

/** Encrypt a Web Push payload according to RFC 8291 / RFC 8188 (`aes128gcm`). */
export async function encryptWebPushPayload(options: EncryptWebPushOptions): Promise<EncryptedWebPushPayload> {
  const plaintext = typeof options.payload === "string" ? textEncoder.encode(options.payload) : options.payload
  if (plaintext.byteLength > MAX_SINGLE_RECORD_PLAINTEXT_BYTES) {
    throw new Error("Web Push payload exceeds single-record limit")
  }

  const uaPublicBytes = decodeBase64Url(options.p256dh)
  if (uaPublicBytes.byteLength !== 65 || uaPublicBytes[0] !== 0x04) {
    throw new Error("Subscription p256dh key must be a 65-byte uncompressed P-256 point")
  }

  const authSecret = decodeBase64Url(options.auth)
  if (authSecret.byteLength !== 16) {
    throw new Error("Subscription auth secret must be 16 bytes")
  }

  const salt = options.salt ? new Uint8Array(options.salt) : globalThis.crypto.getRandomValues(new Uint8Array(16))
  if (salt.byteLength !== 16) {
    throw new Error("Salt must be 16 bytes")
  }

  const subtle = getSubtleCrypto()
  const serverKeyPair =
    options.serverKeyPair ??
    (await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]))

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

  const paddedPlaintext = concatBytes(plaintext, new Uint8Array([0x02]))
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

  const body = concatBytes(
    salt,
    rsBytes,
    new Uint8Array([serverPublicBytes.byteLength]),
    serverPublicBytes,
    ciphertext,
  )

  return {
    body,
    contentEncoding: "aes128gcm",
    salt,
    serverPublicKey: serverPublicBytes,
  }
}

/** Reference UA-side RFC 8291 decryption helper (useful for round-trip verification tests). */
export async function decryptWebPushPayload(options: {
  body: Uint8Array
  uaKeyPair: CryptoKeyPair
  auth: string
}): Promise<string> {
  const { body, uaKeyPair } = options
  if (body.byteLength < 21) {
    throw new Error("Encrypted payload header is too short")
  }
  const salt = body.subarray(0, 16)
  const idLen = body[20]
  if (idLen !== 65 || body.byteLength < 21 + idLen + 17) {
    throw new Error("Invalid aes128gcm header")
  }
  const serverPublicBytes = body.subarray(21, 21 + idLen)
  const ciphertext = body.subarray(21 + idLen)

  const subtle = getSubtleCrypto()
  const uaPublicBytes = new Uint8Array(await subtle.exportKey("raw", uaKeyPair.publicKey))
  const authSecret = decodeBase64Url(options.auth)

  const serverPublicKey = await subtle.importKey(
    "raw",
    toArrayBuffer(serverPublicBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits({ name: "ECDH", public: serverPublicKey }, uaKeyPair.privateKey, 256),
  )

  const keyInfo = concatBytes(textEncoder.encode("WebPush: info\0"), uaPublicBytes, serverPublicBytes)
  const ikm = await hkdfDeriveBytes(ecdhSecret, authSecret, keyInfo, 32)
  const cek = await hkdfDeriveBytes(ikm, salt, textEncoder.encode("Content-Encoding: aes128gcm\0"), 16)
  const nonce = await hkdfDeriveBytes(ikm, salt, textEncoder.encode("Content-Encoding: nonce\0"), 12)

  const aesKey = await subtle.importKey("raw", toArrayBuffer(cek), { name: "AES-GCM" }, false, ["decrypt"])
  const padded = new Uint8Array(
    await subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(nonce), tagLength: 128 },
      aesKey,
      toArrayBuffer(ciphertext),
    ),
  )

  // Strip trailing zero padding and final 0x02 delimiter (RFC 8188 §2).
  let end = padded.byteLength - 1
  while (end >= 0 && padded[end] === 0x00) end -= 1
  if (end < 0 || padded[end] !== 0x02) {
    throw new Error("Missing RFC 8188 final record delimiter")
  }
  return textDecoder.decode(padded.subarray(0, end))
}
