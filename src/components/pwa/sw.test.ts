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
  const self = {
    location: { href: `https://app.example/sw.js?supabaseOrigin=${encodeURIComponent(ORIGIN)}`, origin: "https://app.example" },
    addEventListener: (type: string, fn: (event: unknown) => void) => void (listeners[type] = fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  new Function("self", "caches", "fetch", source)(self, caches, fetchImpl)

  const request = (path: string, token?: string) =>
    new Request(`${ORIGIN}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })

  const dispatch = async (req: Request) => {
    let responded: Promise<Response> | undefined
    listeners.fetch({ request: req, respondWith: (p: Promise<Response>) => void (responded = p) })
    return responded
  }
  return { caches, dispatch, request, listeners }
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
