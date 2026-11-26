import { isTauriRuntime } from "@/lib/push-notifications"

export interface DesktopUpdate {
  version: string
  /** 내려받아 설치함. 총 크기를 알면 0~100 정수 진행률을, 모르면 호출하지 않음. */
  install: (onProgress: (percent: number) => void) => Promise<void>
}

/** Tauri 데스크톱이 아니면 플러그인을 불러오지 않고 null을 돌려줌. 확인 실패 시 throw함. */
export async function checkDesktopUpdate(): Promise<DesktopUpdate | null> {
  if (!isTauriRuntime()) return null
  const { check } = await import("@tauri-apps/plugin-updater")
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    install: async (onProgress) => {
      let total = 0
      let received = 0
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0
        } else if (event.event === "Progress") {
          received += event.data.chunkLength
          if (total > 0) onProgress(Math.min(100, Math.floor((received / total) * 100)))
        }
      })
    },
  }
}

export async function relaunchDesktopApp(): Promise<void> {
  const { relaunch } = await import("@tauri-apps/plugin-process")
  await relaunch()
}
