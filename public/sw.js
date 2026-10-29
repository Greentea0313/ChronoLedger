/* ChronoLedger Service Worker
 * 1) 앱 셸: 동일 출처 정적 자산과 내비게이션을 캐시한다.
 * 2) 읽기 API: Supabase REST GET 응답을 "로그인 사용자별"로 캐시하고 오프라인에서만 사용한다.
 *    - 키: 요청 URL + JWT sub. 익명(anon) 토큰·만료 토큰 요청은 저장/제공하지 않는다.
 *    - 로그아웃/세션 없음 시 클라이언트가 CLEAR_CACHES를 보내 전부 삭제한다.
 * 쓰기(비-GET) 요청은 절대 가로채지 않는다. */
const SHELL_CACHE = "chronoledger-shell-v5"
const DATA_CACHE = "chronoledger-data-v1"
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
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

async function handleDataRead(request) {
  const sub = sessionKeyFor(request)
  if (!sub) return fetch(request)
  const key = dataCacheRequest(request, sub)
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE)
      await cache.put(key, response.clone())
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
        Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE).map((key) => caches.delete(key))),
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
    event.respondWith(handleDataRead(request))
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
