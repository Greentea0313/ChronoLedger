// postbuild: injects a Content-Security-Policy <meta> into every exported HTML file in out/.
// The static export has no server to send headers to the Tauri webview and no per-request nonce,
// so each page gets the SHA-256 hashes of its own inline scripts instead of 'unsafe-inline'.
// The same out/ is shipped to Cloudflare Pages and bundled into the Tauri app (tauri.conf.json csp stays null
// so Tauri does not rewrite this policy).
import { createHash } from "node:crypto"
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import nextEnv from "@next/env"

// Same .env* resolution as `next build` (e.g. .env.local), so local builds and CI read one source.
nextEnv.loadEnvConfig(process.cwd())

const OUT_DIR = "out"
const IMAGE_PROXY_ORIGIN = "https://wsrv.nl" // src/lib/image-resizer.ts fallback for external icon URLs

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) throw new Error("inject-csp: NEXT_PUBLIC_SUPABASE_URL is required to build the CSP.")
const supabase = new URL(supabaseUrl)
const supabaseWs = `${supabase.protocol === "http:" ? "ws:" : "wss:"}//${supabase.host}`

function buildPolicy(scriptHashes) {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval': the ONNX Runtime icon upscaler compiles WebAssembly from /ort/.
    `script-src 'self' 'wasm-unsafe-eval' ${scriptHashes.join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    // https: covers Google avatars, Supabase Storage URLs and admin-set https icon URLs.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // ipc: / http://ipc.localhost are the Tauri v2 IPC channels; harmless on the web build.
    `connect-src 'self' ${supabase.origin} ${supabaseWs} ${IMAGE_PROXY_ORIGIN} data: blob: ipc: http://ipc.localhost`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

function listHtmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listHtmlFiles(path)
    return name.endsWith(".html") ? [path] : []
  })
}

const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi
const CHARSET_META = '<meta charSet="utf-8"/>'

let count = 0
for (const file of listHtmlFiles(OUT_DIR)) {
  const html = readFileSync(file, "utf8")
  if (html.includes('http-equiv="Content-Security-Policy"')) continue
  const hashes = new Set()
  for (const [, attrs = "", body] of html.matchAll(INLINE_SCRIPT)) {
    if (/\ssrc\s*=/i.test(attrs) || body.length === 0) continue
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`)
  }
  if (!html.includes(CHARSET_META)) throw new Error(`inject-csp: ${file} has no ${CHARSET_META} to anchor the policy.`)
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy([...hashes])}"/>`
  writeFileSync(file, html.replace(CHARSET_META, CHARSET_META + meta))
  count += 1
}
console.log(`inject-csp: Content-Security-Policy added to ${count} HTML files.`)
