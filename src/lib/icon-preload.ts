/**
 * 게임 아이콘 및 정적 이미지 사전 로드(Preload) 유틸리티
 * 브라우저 메모리 캐시에 미리 이미지를 올려두어 화면 전환 시 지연 없는 렌더링을 보장합니다.
 */

const preloadedUrls = new Set<string>()

export function preloadImage(url: string | null | undefined): void {
  if (!url || typeof window === "undefined") return
  if (preloadedUrls.has(url)) return

  preloadedUrls.add(url)
  const img = new window.Image()
  img.decoding = "async"
  img.src = url
}

export function preloadImages(urls: (string | null | undefined)[]): void {
  if (typeof window === "undefined") return
  for (const url of urls) {
    if (url) {
      preloadImage(url)
    }
  }
}

