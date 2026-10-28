"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, RotateCcw, Upload } from "lucide-react"
import {
  clampBgOpacity,
  clampTileOpacity,
  compressCalendarBgImage,
  DEFAULT_CALENDAR_BG_SETTINGS,
  MAX_BG_OPACITY,
  MAX_TILE_OPACITY,
  MIN_BG_OPACITY,
  MIN_TILE_OPACITY,
  type CalendarBgBlurLevel,
} from "@/lib/calendar-bg-storage"

export interface CalendarBgCustomizerProps {
  hasCustomImage: boolean
  opacity: number
  tileOpacity?: number
  blur: CalendarBgBlurLevel
  onUploadBlob: (blob: Blob) => Promise<void> | void
  onChangeOpacity: (opacity: number) => Promise<void> | void
  onChangeTileOpacity?: (tileOpacity: number) => Promise<void> | void
  onChangeBlur: (blur: CalendarBgBlurLevel) => Promise<void> | void
  onReset: () => Promise<void> | void
}

const BLUR_OPTIONS: Array<{ value: CalendarBgBlurLevel; label: string }> = [
  { value: "OFF", label: "Off" },
  { value: "LOW", label: "약함" },
  { value: "MEDIUM", label: "보통" },
]

export function CalendarBgCustomizer({
  hasCustomImage,
  opacity,
  tileOpacity = DEFAULT_CALENDAR_BG_SETTINGS.tileOpacity,
  blur,
  onUploadBlob,
  onChangeOpacity,
  onChangeTileOpacity,
  onChangeBlur,
  onReset,
}: CalendarBgCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const safeOpacity = clampBgOpacity(opacity)
  const safeTileOpacity = clampTileOpacity(tileOpacity)
  const isDefaultState =
    !hasCustomImage &&
    safeOpacity === DEFAULT_CALENDAR_BG_SETTINGS.opacity &&
    safeTileOpacity === DEFAULT_CALENDAR_BG_SETTINGS.tileOpacity &&
    blur === DEFAULT_CALENDAR_BG_SETTINGS.blur

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setErrorMessage(null)
    setIsProcessing(true)
    try {
      const compressedBlob = await compressCalendarBgImage(file)
      await onUploadBlob(compressedBlob)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "배경 이미지 처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = async () => {
    setErrorMessage(null)
    await onReset()
  }

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="배경 커스텀 설정"
        className="h-8 px-2.5 text-xs font-medium border-line-control bg-surface text-content hover:bg-surface-2 flex items-center gap-1.5"
      >
        <ImageIcon className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">배경 설정</span>
        {hasCustomImage && (
          <span
            data-testid="calendar-bg-active-dot"
            className="h-1.5 w-1.5 rounded-full bg-primary"
            title="커스텀 배경 적용 중"
          />
        )}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="배경 커스텀 설정 패널"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3.5 shadow-modal z-50 space-y-3.5 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-semibold text-content">캘린더 배경 커스텀 설정</span>
            <span className="text-[10px] text-content-muted">로컬 기기 저장</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
            data-testid="calendar-bg-file-input"
          />

          {/* 1. 이미지 업로드 버튼 */}
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 text-xs font-medium border-line-control bg-surface-2 hover:bg-surface text-content flex items-center justify-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              <span>
                {isProcessing
                  ? "이미지 압축 중..."
                  : hasCustomImage
                  ? "배경 이미지 변경"
                  : "배경 이미지 업로드"}
              </span>
            </Button>
            {errorMessage && (
              <p role="alert" className="text-[11px] text-danger leading-snug">
                {errorMessage}
              </p>
            )}
          </div>

          {/* 2. 배경 투명도 슬라이더 (10% ~ 90% 상한 제한) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="calendar-bg-opacity-range" className="font-medium text-content-secondary">
                배경 투명도
              </label>
              <span className="font-semibold text-primary" data-testid="calendar-bg-opacity-value">
                {safeOpacity}% <span className="text-[10px] font-normal text-content-muted">(최대 90%)</span>
              </span>
            </div>
            <input
              id="calendar-bg-opacity-range"
              type="range"
              min={MIN_BG_OPACITY}
              max={MAX_BG_OPACITY}
              step={5}
              value={safeOpacity}
              onChange={(e) => void onChangeOpacity(clampBgOpacity(Number(e.target.value)))}
              aria-label="배경 투명도 조절"
              className="w-full h-3 py-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-content-muted">
              <span>은은하게 (10%)</span>
              <span>선명하게 (90%)</span>
            </div>
          </div>

          {/* 3. 날짜 타일 투명도 슬라이더 (0% ~ 90%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="calendar-tile-opacity-range" className="font-medium text-content-secondary">
                날짜 타일 투명도
              </label>
              <span className="font-semibold text-primary" data-testid="calendar-tile-opacity-value">
                {safeTileOpacity}% <span className="text-[10px] font-normal text-content-muted">(0~90%)</span>
              </span>
            </div>
            <input
              id="calendar-tile-opacity-range"
              type="range"
              min={MIN_TILE_OPACITY}
              max={MAX_TILE_OPACITY}
              step={5}
              value={safeTileOpacity}
              onChange={(e) => void onChangeTileOpacity?.(clampTileOpacity(Number(e.target.value)))}
              aria-label="날짜 타일 투명도 조절"
              className="w-full h-3 py-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-content-muted">
              <span>투명하게 (0%)</span>
              <span>진하게 (90%)</span>
            </div>
          </div>

          {/* 4. 블러 효과 단계 (Off / 약함 / 보통) 토글 */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-content-secondary">블러 효과</span>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1 border border-line">
              {BLUR_OPTIONS.map((opt) => {
                const isActive = blur === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => void onChangeBlur(opt.value)}
                    className={`py-1 px-2 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-content-secondary hover:text-content hover:bg-surface"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. 기본 배경 초기화 버튼 */}
          <div className="pt-1 border-t border-line">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDefaultState || isProcessing}
              onClick={() => void handleReset()}
              className="w-full h-8 text-xs text-content-secondary hover:text-danger hover:border-danger/40 border-line-control flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>기본 배경 초기화</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

