"use client"

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getClipboardImageFile } from "@/lib/image-resizer"
import { extractClipboardImageUrl, resolveImageSource, type ImageSourceInput } from "@/lib/image-source"
import { isOffline, OFFLINE_WRITE_MESSAGE } from "@/lib/offline-guard"

export interface ImageSourceDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Output edge of the site converter; only used as the size hint of the wsrv.nl proxy fallback. */
  fetchSize?: number
  /** Site converter. May throw with a user-facing message. */
  convert: (file: File) => Promise<T>
  /** Preview URL of a converted value. `blob:` URLs created here are revoked by the dialog. */
  previewSrc: (value: T) => string
  /** null = success (the dialog closes); text = error shown inside the dialog. */
  onRegister: (value: T) => Promise<string | null>
  registerLabel?: string
  /** Extra controls, e.g. the AI upscale checkbox. */
  extra?: ReactNode
  /** When it changes, the current source is converted again. */
  convertKey?: unknown
}

interface CurrentSource {
  input: ImageSourceInput
  /** Clipboard bitmap used only if fetching the pasted image's original address fails. */
  fallbackFile?: File
}

const DEFAULT_FETCH_SIZE = 256

function ImageSourceDialogBody<T>({
  onOpenChange,
  fetchSize = DEFAULT_FETCH_SIZE,
  convert,
  previewSrc,
  onRegister,
  registerLabel = "등록",
  extra,
  convertKey,
}: Omit<ImageSourceDialogProps<T>, "open" | "title" | "description">) {
  const [text, setText] = useState("")
  const [fileInputKey, setFileInputKey] = useState(0)
  const [value, setValue] = useState<{ result: T; preview: string } | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<CurrentSource | null>(null)
  const seqRef = useRef(0)
  const convertRef = useRef(convert)
  const previewSrcRef = useRef(previewSrc)
  convertRef.current = convert
  previewSrcRef.current = previewSrc

  const revokePreview = (preview: string | undefined) => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
  }
  const valueRef = useRef(value)
  valueRef.current = value
  useEffect(() => () => revokePreview(valueRef.current?.preview), [])

  const clearValue = () => {
    revokePreview(valueRef.current?.preview)
    valueRef.current = null
    setValue(null)
  }

  /** Converts the current source once; a result from an older source is dropped. Returns the converted value or null. */
  const convertCurrent = useCallback(async (): Promise<T | null> => {
    const source = sourceRef.current
    const seq = ++seqRef.current
    revokePreview(valueRef.current?.preview)
    valueRef.current = null
    setValue(null)
    setError(null)
    if (!source) {
      setIsConverting(false)
      return null
    }
    setIsConverting(true)
    try {
      let result: T
      try {
        result = await convertRef.current(await resolveImageSource(source.input, fetchSize))
      } catch (firstError) {
        if (!source.fallbackFile) throw firstError
        result = await convertRef.current(source.fallbackFile)
      }
      if (seq !== seqRef.current) return null
      const next = { result, preview: previewSrcRef.current(result) }
      valueRef.current = next
      setValue(next)
      return result
    } catch (conversionError: unknown) {
      if (seq === seqRef.current) setError(conversionError instanceof Error ? conversionError.message : "이미지를 변환하지 못했습니다.")
      return null
    } finally {
      if (seq === seqRef.current) setIsConverting(false)
    }
  }, [fetchSize])

  const isFirstKeyRef = useRef(true)
  useEffect(() => {
    if (isFirstKeyRef.current) {
      isFirstKeyRef.current = false
      return
    }
    if (sourceRef.current) void convertCurrent()
  }, [convertKey, convertCurrent])

  const selectFile = (file: File, fallbackFile?: File) => {
    sourceRef.current = { input: { kind: "file", file }, fallbackFile }
    setFileInputKey((key) => key + 1)
    void convertCurrent()
  }

  const handleTextChange = (next: string) => {
    setText(next)
    setFileInputKey((key) => key + 1)
    sourceRef.current = next.trim() ? { input: { kind: "text", text: next } } : null
    seqRef.current += 1
    clearValue()
    setIsConverting(false)
    setError(null)
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const originalUrl = extractClipboardImageUrl(event.clipboardData)
    const bitmap = getClipboardImageFile(event.clipboardData)
    if (!originalUrl && !bitmap) return
    event.preventDefault()
    if (originalUrl) {
      // Prefer the original address (keeps transparency); the clipboard bitmap is only the fallback.
      setText(originalUrl)
      setFileInputKey((key) => key + 1)
      sourceRef.current = { input: { kind: "text", text: originalUrl }, fallbackFile: bitmap ?? undefined }
      void convertCurrent()
      return
    }
    setText("")
    selectFile(bitmap as File)
  }

  const handleRegister = async () => {
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    if (!sourceRef.current) {
      setError("이미지 URL을 입력하거나 이미지를 붙여넣거나 파일을 선택해 주세요.")
      return
    }
    setIsRegistering(true)
    setError(null)
    try {
      const result = valueRef.current ? valueRef.current.result : await convertCurrent()
      if (result === null) return
      const errorText = await onRegister(result)
      if (errorText) setError(errorText)
      else onOpenChange(false)
    } catch (registerError: unknown) {
      setError(registerError instanceof Error ? registerError.message : "이미지를 저장하지 못했습니다.")
    } finally {
      setIsRegistering(false)
    }
  }

  const busy = isConverting || isRegistering

  return (
    <>
      <div className="space-y-2" data-testid="image-source-dialog">
        <label htmlFor="image-source-url" className="block text-sm font-medium">이미지</label>
        <Input
          id="image-source-url"
          aria-label="이미지 URL"
          autoFocus
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onPaste={handlePaste}
          onBlur={() => { if (sourceRef.current?.input.kind === "text" && !valueRef.current && !isConverting) void convertCurrent() }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (sourceRef.current?.input.kind === "text") void convertCurrent()
          }}
          placeholder="https://... 또는 이미지 붙여넣기"
        />
        <Input
          key={fileInputKey}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="이미지 파일"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setText("")
            selectFile(file)
          }}
        />
        <p className="text-[11px] text-content-muted">투명 배경 이미지는 파일 업로드를 권장함. 붙여넣기는 원본 주소가 있으면 주소로 가져옴.</p>
        {extra}
        {isConverting && <p role="status" className="text-xs text-content-muted">이미지 변환 중...</p>}
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.preview} alt="미리보기" width={64} height={64} className="h-16 w-16 rounded border border-line object-cover" />
        )}
        {error && <p role="alert" className="rounded border border-danger/30 bg-danger/20 p-2 text-xs text-danger">{error}</p>}
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
        <Button type="button" disabled={busy} onClick={() => void handleRegister()}>
          {isRegistering ? "등록 중..." : registerLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Shared image registration dialog (R81): URL / pasted image / file, a preview, cancel and register.
 * The body is mounted only while open, so every opening starts with an empty state.
 */
export function ImageSourceDialog<T>({ open, onOpenChange, title, description, ...body }: ImageSourceDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs text-content-secondary">{description ?? "이미지 URL, 붙여넣기, 파일 중 하나로 등록함."}</DialogDescription>
        </DialogHeader>
        {open && <ImageSourceDialogBody onOpenChange={onOpenChange} {...body} />}
      </DialogContent>
    </Dialog>
  )
}
