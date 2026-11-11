"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useOnlineStatus } from "@/lib/use-online-status"
import { ImageSourceDialog } from "@/components/ui/image-source-dialog"
import { resizeImageToWebP } from "@/lib/image-resizer"
import { deleteProfileAvatar, downloadProfileAvatar, uploadProfileAvatar } from "@/lib/storage-upload"

export function ProfileAvatarCard() {
  const { user } = useAuth()
  const isOnline = useOnlineStatus()
  const userId = user?.id
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hasCustom, setHasCustom] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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

  // R81: the blob is already a 256x256 WebP from the shared image dialog; returns the dialog error text (null = saved).
  const handleRegister = async (blob: Blob): Promise<string | null> => {
    if (!userId) return "로그인이 필요합니다."
    setIsBusy(true)
    setMessage(null)
    try {
      await uploadProfileAvatar(userId, blob)
      setPreviewUrl(URL.createObjectURL(blob))
      setHasCustom(true)
      setMessage({ kind: "success", text: "프로필 사진을 변경했습니다." })
      return null
    } catch (cause: unknown) {
      return cause instanceof Error ? cause.message : "프로필 사진을 변경하지 못했습니다."
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
        <Button type="button" variant="outline" className="min-h-[44px]" disabled={isBusy || !isOnline} onClick={() => setIsDialogOpen(true)}>
          {previewUrl ? "사진 변경" : "사진 선택"}
        </Button>
        <p className="text-xs text-content-secondary">URL·붙여넣기·파일(PNG, JPG, WebP · 5MB 이하)로 등록함.</p>
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
      <ImageSourceDialog<Blob>
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="프로필 사진 등록"
        description="이미지 URL, 붙여넣기, 파일 중 하나로 등록하면 256×256 WebP로 변환해 저장함."
        convert={(file) => resizeImageToWebP(file)}
        previewSrc={(blob) => URL.createObjectURL(blob)}
        onRegister={handleRegister}
      />
    </Card>
  )
}
