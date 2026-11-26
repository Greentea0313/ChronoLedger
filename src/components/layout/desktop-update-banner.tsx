"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  checkDesktopUpdate,
  relaunchDesktopApp,
  type DesktopUpdate,
} from "@/lib/desktop-updater"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"
import { isTauriRuntime } from "@/lib/push-notifications"

const INSTALL_FAILED_MESSAGE = "업데이트에 실패했습니다. 잠시 후 다시 시도해 주세요."

export function DesktopUpdateBanner() {
  const [update, setUpdate] = useState<DesktopUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTauriRuntime()) return
    let active = true
    checkDesktopUpdate()
      .then((found) => {
        if (active) setUpdate(found)
      })
      .catch((err) => {
        console.warn("[desktop-update] 업데이트 확인 실패", err)
      })
    return () => {
      active = false
    }
  }, [])

  if (!update || dismissed) return null

  const handleInstall = async () => {
    if (installing) return
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setInstalling(true)
    setError(null)
    setProgress(0)
    try {
      await update.install(setProgress)
      await relaunchDesktopApp()
    } catch (err) {
      console.warn("[desktop-update] 업데이트 설치 실패", err)
      setError(INSTALL_FAILED_MESSAGE)
      setInstalling(false)
      setProgress(null)
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      <span>
        {error ??
          `새 버전 v${update.version}을 설치할 수 있습니다. 설치하면 앱이 다시 시작됩니다.`}
      </span>
      {installing && progress !== null && <span>{progress}%</span>}
      <Button size="sm" variant="secondary" onClick={handleInstall} disabled={installing}>
        {error && !installing ? "다시 시도" : "지금 업데이트"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} disabled={installing}>
        나중에
      </Button>
    </div>
  )
}
