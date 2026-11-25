import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ORIGIN = "https://proj.supabase.co"
const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8")

function jwt(claims: Record<string, unknown>) {
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${enc({ alg: "none" })}.${enc(claims)}.sig`
}

function createCaches() {
  const stores = new Map<string, Map<string, Response>>()
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>()
    stores.set(name, store)
    return {
      put: async (req: Request, res: Response) => void store.set(req.url, res),
      match: async (req: Request) => store.get(req.url)?.clone(),
      addAll: async () => undefined,
    }
  }
  return {
    stores,
    open,
    keys: async () => Array.from(stores.keys()),
    delete: async (name: string) => stores.delete(name),
    match: async () => undefined,
  }
}

function loadWorker(fetchImpl: (req: Request) => Promise<Response>) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const caches = createCaches()
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const matchAll = vi.fn().mockResolvedValue([])
  const openWindow = vi.fn().mockResolvedValue(null)
  const self = {
    location: { href: `https://app.example/sw.js?supabaseOrigin=${encodeURIComponent(ORIGIN)}`, origin: "https://app.example" },
    addEventListener: (type: string, fn: (event: unknown) => void) => void (listeners[type] = fn),
    skipWaiting: vi.fn(),
    registration: { showNotification },
    clients: { claim: vi.fn(), matchAll, openWindow },
  }
  new Function("self", "caches", "fetch", source)(self, caches, fetchImpl)

  const request = (path: string, token?: string) =>
    new Request(`${ORIGIN}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

  const dispatch = async (req: Request) => {
    let responded: Promise<Response> | undefined
    listeners.fetch({ request: req, respondWith: (p: Promise<Response>) => void (responded = p) })
    return responded
  }
  return { caches, dispatch, request, listeners, showNotification, matchAll, openWindow }
}

describe("service worker 읽기 API 캐시", () => {
  const future = Math.floor(Date.now() / 1000) + 3600
  const userA = jwt({ sub: "user-a", role: "authenticated", exp: future })
  const userB = jwt({ sub: "user-b", role: "authenticated", exp: future })
  let online: boolean

  beforeEach(() => {
    online = true
  })

  const fetchImpl = async () => {
    if (!online) throw new TypeError("offline")
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
  }

  it("로그인 사용자의 GET 응답을 저장하고 오프라인에서 같은 사용자에게만 제공한다", async () => {
    const sw = loadWorker(fetchImpl)
    await sw.dispatch(sw.request("/rest/v1/expenses?select=*", userA))
    online = false
    const hit = await sw.dispatch(sw.request("/rest/v1/expenses?select=*", userA))
    expect(await hit?.json()).toEqual([{ id: 1 }])
    await expect(sw.dispatch(sw.request("/rest/v1/expenses?select=*", userB))).rejects.toBeTruthy()
  })

  it("익명·만료 토큰 응답은 저장하지 않는다", async () => {
    const sw = loadWorker(fetchImpl)
    const anon = jwt({ role: "anon", exp: future })
    const expired = jwt({ sub: "user-a", role: "authenticated", exp: 1 })
    await sw.dispatch(sw.request("/rest/v1/games", anon))
    await sw.dispatch(sw.request("/rest/v1/games", expired))
    expect(sw.caches.stores.get("chronoledger-data-v1")?.size ?? 0).toBe(0)
  })

  it("비-GET 요청과 다른 출처는 가로채지 않는다", async () => {
    const sw = loadWorker(fetchImpl)
    const post = new Request(`${ORIGIN}/rest/v1/expenses`, { method: "POST" })
    expect(await sw.dispatch(post)).toBeUndefined()
    expect(await sw.dispatch(new Request("https://other.example/rest/v1/x", { headers: { Authorization: `Bearer ${userA}` } }))).toBeUndefined()
  })

  it("CLEAR_CACHES 메시지가 모든 캐시를 삭제한다", async () => {
    const sw = loadWorker(fetchImpl)
    await sw.dispatch(sw.request("/rest/v1/expenses", userA))
    let done: Promise<unknown> | undefined
    sw.listeners.message({ data: { type: "CLEAR_CACHES" }, waitUntil: (p: Promise<unknown>) => void (done = p) })
    await done
    expect(sw.caches.stores.size).toBe(0)
  })
})

describe("PWA 정적 매니페스트 및 서비스 워커 셸 캐시 설정", () => {
  it("SHELL_CACHE 버전이 v8(chronoledger-shell-v8)로 선언되어 있다", () => {
    expect(source).toContain('const SHELL_CACHE = "chronoledger-shell-v8"')
  })

  it("푸시 배지 아이콘은 투명 배경 RGBA PNG이고 셸 캐시에 포함된다 (Android 흰 사각형 방지)", () => {
    const png = readFileSync(join(process.cwd(), "public", "icons", "badge-96.png"))
    expect(png.readUInt32BE(16)).toBe(96)
    expect(png.readUInt32BE(20)).toBe(96)
    expect(png[25]).toBe(6) // color type 6 = RGBA
    expect(source).toContain('"/icons/badge-96.png",')
  })

  it("푸시 알림 큰 아이콘은 투명 배경 RGBA PNG이고 셸 캐시에 포함된다 (알림창 우측 검은 사각형 방지)", () => {
    const png = readFileSync(join(process.cwd(), "public", "icons", "push-icon-192.png"))
    expect(png.readUInt32BE(16)).toBe(192)
    expect(png.readUInt32BE(20)).toBe(192)
    expect(png[25]).toBe(6) // color type 6 = RGBA
    expect(source).toContain('"/icons/push-icon-192.png",')
    expect(source).toContain('icon: "/icons/push-icon-192.png"')
  })

  it("manifest.json의 name과 short_name이 모두 ChroLog로 설정되어 Android WebAPK/홈 화면 말줄임을 방지한다", () => {
    const manifestRaw = readFileSync(join(process.cwd(), "public", "manifest.json"), "utf8")
    const manifest = JSON.parse(manifestRaw)
    expect(manifest.name).toBe("ChroLog")
    expect(manifest.short_name).toBe("ChroLog")
    expect(manifest.description).toBe("ChronoLedger - 게임 일정 및 지출 관리 매니저")
    expect(manifest.start_url).toBe("/dashboard")
  })
})

describe("service worker Web Push (R96)", () => {
  const noopFetch = async () => new Response("", { status: 200 })

  it("push 이벤트에서 정상 JSON 페이로드를 알림으로 표시하고 잘못된 JSON은 기본 제목으로 폴백한다", async () => {
    const sw = loadWorker(noopFetch)
    let waitPromise: Promise<unknown> | undefined
    sw.listeners.push({
      data: {
        json: () => ({
          title: "오늘 시작하는 관심 일정이 있습니다",
          body: "테스트 일정이 오늘 시작합니다.",
          link_path: "/dashboard?date=2026-11-24",
          tag: "FAVORITE_START:1",
        }),
      },
      waitUntil: (p: Promise<unknown>) => void (waitPromise = p),
    })
    await waitPromise

    expect(sw.showNotification).toHaveBeenCalledWith("오늘 시작하는 관심 일정이 있습니다", {
      body: "테스트 일정이 오늘 시작합니다.",
      icon: "/icons/push-icon-192.png",
      badge: "/icons/badge-96.png",
      tag: "FAVORITE_START:1",
      data: { link_path: "/dashboard?date=2026-11-24" },
    })

    sw.showNotification.mockClear()
    sw.listeners.push({
      data: {
        json: () => {
          throw new SyntaxError("bad json")
        },
      },
      waitUntil: (p: Promise<unknown>) => void (waitPromise = p),
    })
    await waitPromise

    expect(sw.showNotification).toHaveBeenCalledWith("ChronoLedger 알림", {
      body: "",
      icon: "/icons/push-icon-192.png",
      badge: "/icons/badge-96.png",
      data: { link_path: "/dashboard" },
    })
  })

  it("notificationclick은 동일 출처 상대 경로만 허용하고 외부 URL을 /dashboard로 강제한다", async () => {
    const sw = loadWorker(noopFetch)
    const close = vi.fn()
    let waitPromise: Promise<unknown> | undefined

    sw.listeners.notificationclick({
      notification: { close, data: { link_path: "https://evil.example/phish" } },
      waitUntil: (p: Promise<unknown>) => void (waitPromise = p),
    })
    await waitPromise

    expect(close).toHaveBeenCalledTimes(1)
    expect(sw.openWindow).toHaveBeenCalledWith("https://app.example/dashboard")

    sw.openWindow.mockClear()
    sw.listeners.notificationclick({
      notification: { close, data: { link_path: "//evil.example/phish" } },
      waitUntil: (p: Promise<unknown>) => void (waitPromise = p),
    })
    await waitPromise
    expect(sw.openWindow).toHaveBeenCalledWith("https://app.example/dashboard")

    const focus = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn().mockResolvedValue(undefined)
    sw.matchAll.mockResolvedValueOnce([{ url: "https://app.example/dashboard", focus, navigate }])

    sw.listeners.notificationclick({
      notification: { close, data: { link_path: "/dashboard/expenses" } },
      waitUntil: (p: Promise<unknown>) => void (waitPromise = p),
    })
    await waitPromise

    expect(navigate).toHaveBeenCalledWith("https://app.example/dashboard/expenses")
    expect(focus).toHaveBeenCalledTimes(1)
  })
})
