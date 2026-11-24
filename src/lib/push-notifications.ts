import { isTauri } from "@tauri-apps/api/core"
import { supabase } from "@/lib/supabase/client"
import { isOffline } from "@/lib/offline-guard"
import { decodeBase64Url, toArrayBuffer } from "@/lib/web-push-crypto"

export type PushSupportState =
  | "tauri_desktop"
  | "ios_install_required"
  | "unsupported"
  | "unconfigured"
  | "supported"

export type PushPlatform = "web" | "ios_pwa" | "android_pwa"

export interface PushSupportEnvOverrides {
  isTauri?: boolean
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
  isStandalone?: boolean
  hasServiceWorker?: boolean
  hasPushManager?: boolean
  hasNotification?: boolean
  vapidPublicKey?: string
}

export interface SubscribePushResult {
  subscriptionId: string
  endpoint: string
  platform: PushPlatform
  userAgentLabel: string
}

export function isTauriRuntime(): boolean {
  try {
    return isTauri()
  } catch {
    return false
  }
}

function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return platform === "MacIntel" && maxTouchPoints > 1
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  try {
    return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches)
  } catch {
    return false
  }
}

export function getVapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim()
}

export function getPushSupportState(overrides?: PushSupportEnvOverrides): PushSupportState {
  const inTauri = overrides?.isTauri ?? isTauriRuntime()
  if (inTauri) return "tauri_desktop"

  if (typeof window === "undefined" && !overrides) return "unsupported"

  const nav = typeof window !== "undefined" ? window.navigator : undefined
  const ua = overrides?.userAgent ?? nav?.userAgent ?? ""
  const platform = overrides?.platform ?? nav?.platform ?? ""
  const maxTouchPoints = overrides?.maxTouchPoints ?? nav?.maxTouchPoints ?? 0
  const standalone = overrides?.isStandalone ?? isStandaloneDisplayMode()

  if (isIosDevice(ua, platform, maxTouchPoints) && !standalone) {
    return "ios_install_required"
  }

  const hasServiceWorker = overrides?.hasServiceWorker ?? Boolean(nav && "serviceWorker" in nav)
  const hasPushManager = overrides?.hasPushManager ?? (typeof window !== "undefined" && "PushManager" in window)
  const hasNotification = overrides?.hasNotification ?? (typeof window !== "undefined" && "Notification" in window)

  if (!hasServiceWorker || !hasPushManager || !hasNotification) {
    return "unsupported"
  }

  const vapidPublicKey = (overrides?.vapidPublicKey ?? getVapidPublicKey()).trim()
  if (!vapidPublicKey) {
    return "unconfigured"
  }

  return "supported"
}

export function detectPushPlatform(overrides?: {
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
  isStandalone?: boolean
}): PushPlatform {
  const nav = typeof window !== "undefined" ? window.navigator : undefined
  const ua = overrides?.userAgent ?? nav?.userAgent ?? ""
  const platform = overrides?.platform ?? nav?.platform ?? ""
  const maxTouchPoints = overrides?.maxTouchPoints ?? nav?.maxTouchPoints ?? 0
  const standalone = overrides?.isStandalone ?? isStandaloneDisplayMode()

  if (isIosDevice(ua, platform, maxTouchPoints) && standalone) return "ios_pwa"
  if (/Android/i.test(ua) && standalone) return "android_pwa"
  return "web"
}

/** Build a short non-fingerprinting label such as "Chrome · Windows" (never stores raw UA). */
export function buildUserAgentLabel(userAgent?: string): string {
  const ua = userAgent ?? (typeof window !== "undefined" ? window.navigator.userAgent : "")
  let browser = "브라우저"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/Whale\//i.test(ua)) browser = "Whale"
  else if (/SamsungBrowser\//i.test(ua)) browser = "Samsung Internet"
  else if (/CriOS|Chrome\//i.test(ua) && !/OPR\//i.test(ua)) browser = "Chrome"
  else if (/Firefox\/|FxiOS/i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari"

  let os = "웹"
  if (/iPhone/i.test(ua)) os = "iPhone"
  else if (/iPad/i.test(ua)) os = "iPad"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  return `${browser} · ${os}`.slice(0, 100)
}

export function urlBase64ToApplicationServerKey(base64Url: string): ArrayBuffer {
  return toArrayBuffer(decodeBase64Url(base64Url))
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in window.navigator)) return null
  try {
    const registration = await window.navigator.serviceWorker.getRegistration()
    return registration ?? null
  } catch {
    return null
  }
}

export async function getCurrentDevicePushEndpoint(): Promise<string | null> {
  if (isTauriRuntime()) return null
  const registration = await getActiveServiceWorkerRegistration()
  if (!registration?.pushManager) return null
  try {
    const subscription = await registration.pushManager.getSubscription()
    return subscription?.endpoint ?? null
  } catch {
    return null
  }
}

/**
 * Request notification permission, subscribe the current browser's PushManager,
 * and persist the subscription via `upsert_push_subscription` RPC.
 * Must be called only inside a user gesture handler (e.g. button click).
 */
export async function subscribeCurrentDevicePush(): Promise<SubscribePushResult> {
  const support = getPushSupportState()
  if (support === "tauri_desktop") {
    throw new Error("데스크톱 앱에서는 웹 푸시 대신 앱 실행 중 OS 알림을 사용합니다.")
  }
  if (support === "ios_install_required") {
    throw new Error("iPhone/iPad에서는 공유 → '홈 화면에 추가' 후 설치된 앱에서 푸시 알림을 켤 수 있습니다.")
  }
  if (support === "unconfigured") {
    throw new Error("푸시 알림 공개키가 설정되지 않아 구독을 시작할 수 없습니다.")
  }
  if (support !== "supported") {
    throw new Error("이 브라우저는 웹 푸시 알림을 지원하지 않습니다.")
  }
  if (isOffline()) {
    throw new Error("오프라인 상태에서는 푸시 알림을 등록할 수 없습니다.")
  }

  const permission = await window.Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("알림 권한이 허용되지 않았습니다. 브라우저 사이트 설정에서 알림을 허용해 주세요.")
  }

  const registration = await getActiveServiceWorkerRegistration()
  if (!registration?.pushManager) {
    throw new Error("서비스 워커가 아직 준비되지 않았습니다. 운영 빌드(HTTPS/PWA) 환경에서 다시 시도해 주세요.")
  }

  const vapidPublicKey = getVapidPublicKey()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToApplicationServerKey(vapidPublicKey),
    })
  }

  const json = subscription.toJSON()
  const endpoint = json.endpoint ?? subscription.endpoint
  const p256dh = json.keys?.p256dh ?? ""
  const auth = json.keys?.auth ?? ""
  if (!endpoint || !p256dh || !auth) {
    throw new Error("브라우저 푸시 구독 키를 읽지 못했습니다.")
  }

  const platform = detectPushPlatform()
  const userAgentLabel = buildUserAgentLabel()

  const { data, error } = await supabase.rpc("upsert_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_platform: platform,
    p_user_agent_label: userAgentLabel,
  })
  if (error) {
    const code = error.code ?? ""
    if (code === "42883" || code === "PGRST202" || code === "42P01" || code === "PGRST205") {
      throw new Error("DB 업데이트(R96) 적용 후 푸시 알림을 등록할 수 있습니다.")
    }
    throw new Error("푸시 구독을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")
  }

  return {
    subscriptionId: typeof data === "string" ? data : "",
    endpoint,
    platform,
    userAgentLabel,
  }
}

/** Unsubscribe the browser's current push subscription locally (best effort). */
export async function unsubscribeBrowserPushIfMatching(endpoint?: string | null): Promise<void> {
  if (isTauriRuntime()) return
  const registration = await getActiveServiceWorkerRegistration()
  if (!registration?.pushManager) return
  try {
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    if (endpoint && subscription.endpoint !== endpoint) return
    await subscription.unsubscribe()
  } catch {
    // Ignore local unsubscribe failures.
  }
}

/**
 * Logout cleanup (R96 §5.4 / §11.3):
 * 1) Inspect current device push subscription via getRegistration() (never hangs when SW is absent)
 * 2) Remove server row via delete_push_subscription(endpoint) while session is still active (best effort)
 * 3) Always call subscription.unsubscribe() so shared devices stop receiving previous account pushes
 */
export async function unsubscribeCurrentDevicePush(): Promise<void> {
  if (isTauriRuntime()) return
  const registration = await getActiveServiceWorkerRegistration()
  if (!registration?.pushManager) return

  let subscription: PushSubscription | null = null
  try {
    subscription = await registration.pushManager.getSubscription()
  } catch {
    return
  }
  if (!subscription) return

  if (!isOffline()) {
    try {
      await supabase.rpc("delete_push_subscription", { p_endpoint: subscription.endpoint })
    } catch {
      // Ignore RPC failures (offline, missing migration, or pending deletion); still unsubscribe locally.
    }
  }

  try {
    await subscription.unsubscribe()
  } catch {
    // Ignore browser unsubscribe errors.
  }
}
