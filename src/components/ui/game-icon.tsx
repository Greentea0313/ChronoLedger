"use client"

import { useEffect, useRef, useState } from "react"
import { Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GameIconProps {
  src?: string | null
  alt?: string
  className?: string
  fallbackIcon?: React.ReactNode
  fallbackClassName?: string
  priority?: boolean
}

export function GameIcon({
  src,
  alt = "",
  className = "w-full h-full object-cover",
  fallbackIcon,
  fallbackClassName = "w-1/2 h-1/2 text-content-secondary",
  priority = false,
}: GameIconProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIsLoaded(false)
    setHasError(false)
  }, [src])

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true)
    }
  }, [src])

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-2">
        {fallbackIcon ?? <Gamepad2 className={fallbackClassName} />}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-surface-2" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  )
}

