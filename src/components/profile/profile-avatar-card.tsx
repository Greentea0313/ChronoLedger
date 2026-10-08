"use client"

import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useOnlineStatus } from "@/lib/use-online-status"
import { resizeImageToWebP } from "@/lib/image-resizer"
import { deleteProfileAvatar, downloadProfileAvatar, uploadProfileAvatar } from "@/lib/storage-upload"

export function ProfileAvatarCard() {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const userId = user?.id
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hasCustom, setHasCustom] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let url: string | null = null
    downloadProfileAvatar(userId)
      .then((next) => {
        if (cancelled) {
          if (next) URL.revokeObjectURL(next)
          return
        }
        url = next
        setPreviewUrl(next)
        setHasCustom(next !== null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [userId])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    input.value = ""
    if (!file || !userId) return
    setIsBusy(true)
    setMessage(null)
    try {
      const blob = await resizeImageToWebP(file)
      await uploadProfileAvatar(userId, blob)
      setPreviewUrl(URL.createObjectURL(blob))
      setHasCustom(true)
      setMessage({ kind: "success", text: "프로필 사진을 변경했습니다." })
    } catch (cause: unknown) {
      setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "프로필 사진을 변경하지 못했습니다." })
    } finally {
      setIsBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!userId) return
    setIsBusy(true)
    setMessage(null)
    try {
      await deleteProfileAvatar(userId)
      setPreviewUrl(null)
      setHasCustom(false)
      setMessage({ kind: "success", text: "직접 올린 사진을 삭제했습니다. 기본 프로필 사진이 표시됩니다." })
    } catch (cause: unknown) {
      setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "사진을 삭제하지 못했습니다." })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로필 사진</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="현재 프로필 사진" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <p className="text-sm text-content-secondary">직접 올린 사진이 없습니다. Google 프로필 사진 또는 이름 첫 글자가 표시됩니다.</p>
        )}
        <label htmlFor="profile-avatar-file" className="block text-sm font-medium">
          사진 선택 (PNG, JPG, WebP · 5MB 이하)
        </label>
        <input
          id="profile-avatar-file"
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          disabled={isBusy || !isOnline}
          onChange={(event) => void handleFile(event)}
          className="block w-full text-sm text-content-secondary file:mr-3 file:min-h-[44px] file:rounded-md file:border file:border-line-control file:bg-surface-2 file:px-3 file:text-content"
        />
        {hasCustom && (
          <Button type="button" variant="outline" disabled={isBusy || !isOnline} onClick={() => void handleRemove()}>
            직접 올린 사진 삭제
          </Button>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
