import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// R60: the desktop icon upscaler loads the wasm-only ONNX Runtime from /ort/ at runtime
// (webpackIgnore import), so webpack never bundles onnxruntime-web or its Node entry.
// Copy the two runtime files from node_modules into public/ort/ (git-ignored) for dev and build.
// The JSEP/WebGPU wasm is intentionally not shipped: it exceeds the 25 MiB Cloudflare Pages file limit.
const ORT_RUNTIME_FILES = ['ort.wasm.bundle.min.mjs', 'ort-wasm-simd-threaded.wasm'];

function copyOrtRuntime() {
  const root = dirname(fileURLToPath(import.meta.url));
  const sourceDir = join(root, 'node_modules', 'onnxruntime-web', 'dist');
  const targetDir = join(root, 'public', 'ort');
  if (!existsSync(sourceDir)) return;
  mkdirSync(targetDir, { recursive: true });
  for (const file of ORT_RUNTIME_FILES) {
    const source = join(sourceDir, file);
    const target = join(targetDir, file);
    if (!existsSync(source)) continue;
    if (existsSync(target) && statSync(target).size === statSync(source).size) continue;
    copyFileSync(source, target);
  }
}

copyOrtRuntime();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
