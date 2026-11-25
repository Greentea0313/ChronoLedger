import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link"
import {
  completeOAuthCallbackUrl,
  isDesktopRuntime,
  OAUTH_CALLBACK_ERROR_EVENT,
} from "@/lib/auth-adapter"

export interface DeepLinkHandlers {
  onSuccess: () => void
  onError: (message: string) => void
}

let coldStartChecked = false

export function resetDeepLinkColdStartForTests(): void {
  coldStartChecked = false
}

async function handleIncomingUrls(
  urls: readonly string[] | null | undefined,
  handlers: DeepLinkHandlers,
): Promise<void> {
  if (!urls || urls.length === 0) return

  for (const rawUrl of urls) {
    const result = await completeOAuthCallbackUrl(rawUrl)
    if (result.status === "ignored") continue
    if (result.status === "success") {
      handlers.onSuccess()
      return
    }
    window.dispatchEvent(
      new CustomEvent(OAUTH_CALLBACK_ERROR_EVENT, {
        detail: { message: result.message },
      }),
    )
    handlers.onError(result.message)
    return
  }
}

export async function setupDeepLink(handlers: DeepLinkHandlers): Promise<() => void> {
  if (!isDesktopRuntime()) return () => {}

  let active = true
  let unlisten: (() => void) | null = null

  const safeHandlers: DeepLinkHandlers = {
    onSuccess: () => {
      if (active) handlers.onSuccess()
    },
    onError: (message) => {
      if (active) handlers.onError(message)
    },
  }

  try {
    unlisten = await onOpenUrl((urls) => {
      void handleIncomingUrls(urls, safeHandlers)
    })

    if (!coldStartChecked) {
      coldStartChecked = true
      const currentUrls = await getCurrent()
      await handleIncomingUrls(currentUrls, safeHandlers)
    }
  } catch (error) {
    console.error("딥링크 초기화 실패:", error)
  }

  return () => {
    active = false
    if (unlisten) {
      unlisten()
      unlisten = null
    }
  }
}
