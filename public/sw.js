/* ChronoLedger Service Worker
 * 1) 앱 셸: 동일 출처 정적 자산과 내비게이션을 캐시한다.
 * 2) 읽기 API: Supabase REST GET 응답을 "로그인 사용자별"로 캐시하고 오프라인에서만 사용한다.
 *    - 키: 요청 URL + JWT sub. 익명(anon) 토큰·만료 토큰 요청은 저장/제공하지 않는다.
 *    - 로그아웃/세션 없음 시 클라이언트가 CLEAR_CACHES를 보내 전부 삭제한다.
 * 3) 공개 게임·캐릭터 아이콘: Supabase Storage public/game-assets GET 응답만 Cache-First(상한 500)로 캐시한다.
 *    - 비공개 버킷(user-icons 등)은 절대 가로채거나 캐시하지 않는다.
 * 쓰기(비-GET) 요청은 절대 가로채지 않는다. */
const SHELL_CACHE = "chronoledger-shell-v8"
const DATA_CACHE = "chronoledger-data-v1"
const GAME_ASSET_CACHE = "chronoledger-game-assets-v1"
const GAME_ASSET_CACHE_LIMIT = 500
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/badge-96.png",
  "/icons/push-icon-192.png",
  "/assets/games/arknights.png",
  "/assets/games/chaos_zero_nightmare.png",
  "/assets/games/endfield.png",
  "/assets/games/genshin.png",
  "/assets/games/limbus_company.png",
  "/assets/games/nikke.png",
  "/assets/games/star_rail.png",
  "/assets/games/wuthering_wave.png",
  "/assets/games/zenless_zone_zero.png",
]

const params = new URL(self.location.href).searchParams
const SUPABASE_ORIGIN = params.get("supabaseOrigin") || ""

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function sessionKeyFor(request) {
  const auth = request.headers.get("Authorization") || ""
  const claims = auth.startsWith("Bearer ") ? decodeJwt(auth.slice(7)) : null
  if (!claims || !claims.sub || claims.role !== "authenticated") return null
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) return null
  return claims.sub
}

function dataCacheRequest(request, sub) {
  const url = new URL(request.url)
  url.searchParams.set("__cl_user", sub)
  return new Request(url.toString())
}

function isSupabaseRead(request, url) {
  return (
    request.method === "GET" &&
    SUPABASE_ORIGIN !== "" &&
    url.origin === SUPABASE_ORIGIN &&
    url.pathname.startsWith("/rest/v1/")
  )
}

function isSupabasePublicGameAsset(request, url) {
  return (
    request.method === "GET" &&
    SUPABASE_ORIGIN !== "" &&
    url.origin === SUPABASE_ORIGIN &&
    url.pathname.startsWith("/storage/v1/object/public/game-assets/")
  )
}

async function trimGameAssetCache(cache) {
  if (typeof cache.keys !== "function" || typeof cache.delete !== "function") return
  const keys = await cache.keys()
  const excess = keys.length - GAME_ASSET_CACHE_LIMIT
  if (excess <= 0) return
  await Promise.all(keys.slice(0, excess).map((oldKey) => cache.delete(oldKey)))
}

async function handleGameAssetRead(request, event) {
  const cache = await caches.open(GAME_ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    const stored = cache
      .put(request, copy)
      .then(() => trimGameAssetCache(cache))
      .catch(() => undefined)
    if (event && typeof event.waitUntil === "function") event.waitUntil(stored)
  }
  return response
}

async function handleDataRead(request, event) {
  const sub = sessionKeyFor(request)
  if (!sub) return fetch(request)
  const key = dataCacheRequest(request, sub)
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Offline fallback copy: store it in the background so a large body never delays the page's response.
      const copy = response.clone()
      const stored = caches.open(DATA_CACHE).then((cache) => cache.put(key, copy)).catch(() => undefined)
      if (event && typeof event.waitUntil === "function") event.waitUntil(stored)
    }
    return response
  } catch (error) {
    const cached = await (await caches.open(DATA_CACHE)).match(key)
    if (cached) return cached
    throw error
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE && key !== GAME_ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))))
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)

  if (isSupabaseRead(request, url)) {
    event.respondWith(handleDataRead(request, event))
    return
  }
  if (isSupabasePublicGameAsset(request, url)) {
    event.respondWith(handleGameAssetRead(request, event))
    return
  }
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/dashboard") || caches.match("/"))),
    )
    return
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.json"
  if (!isStatic) return

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})

function sanitizePushLinkPath(value) {
  if (typeof value !== "string") return "/dashboard"
  const trimmed = value.trim()
  if (/^\/(?!\/)/.test(trimmed) && trimmed.length <= 200) return trimmed
  return "/dashboard"
}

function parsePushPayload(event) {
  const fallback = { title: "ChronoLedger 알림", body: "", link_path: "/dashboard", tag: undefined }
  if (!event || !event.data) return fallback
  try {
    const data = typeof event.data.json === "function" ? event.data.json() : JSON.parse(event.data.text())
    if (!data || typeof data !== "object") return fallback
    const title = typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 120) : fallback.title
    const body = typeof data.body === "string" ? data.body.trim().slice(0, 300) : ""
    const link_path = sanitizePushLinkPath(data.link_path)
    const tag = typeof data.tag === "string" && data.tag.trim() ? data.tag.trim().slice(0, 120) : undefined
    return { title, body, link_path, tag }
  } catch {
    return fallback
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event)
  const options = {
    body: payload.body,
    icon: "/icons/push-icon-192.png",
    badge: "/icons/badge-96.png",
    data: { link_path: payload.link_path },
  }
  if (payload.tag) options.tag = payload.tag
  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener("notificationclick", (event) => {
  if (event.notification && typeof event.notification.close === "function") {
    event.notification.close()
  }
  const linkPath = sanitizePushLinkPath(event.notification && event.notification.data && event.notification.data.link_path)
  const targetUrl = new URL(linkPath, self.location.origin).toString()

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        try {
          if (new URL(client.url).origin === self.location.origin) {
            const navPromise = typeof client.navigate === "function" ? client.navigate(targetUrl).catch(() => client) : Promise.resolve(client)
            return navPromise.then(() => (typeof client.focus === "function" ? client.focus() : undefined))
          }
        } catch {
          // Ignore malformed client URL and continue scanning.
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
