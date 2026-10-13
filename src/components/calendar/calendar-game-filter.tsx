"use client"

import { useEffect, useRef, useState } from "react"
import { GameIcon } from "@/components/ui/game-icon"
import { Button } from "@/components/ui/button"
import { ChevronDown, Filter } from "lucide-react"

export interface GameFilterOption {
  id: string
  name: string
  iconUrl?: string | null
}

interface CalendarGameFilterProps {
  games: GameFilterOption[]
  selectedGameIds: string[]
  onChangeSelectedGameIds: (ids: string[]) => void
}

export function CalendarGameFilter({
  games,
  selectedGameIds,
  onChangeSelectedGameIds,
}: CalendarGameFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAllSelected = games.length > 0 && selectedGameIds.length === games.length
  const selectedCount = selectedGameIds.length

  // 버튼 라벨: 전체 선택 시 [게임 : 전체], 일부/0개 선택 시 [게임 : n개]
  const buttonLabel = isAllSelected ? "게임 : 전체" : `게임 : ${selectedCount}개`

  useEffect(() => {
    if (!isOpen) return

    // 외부 클릭 시 닫기 (웹 페이지 내부에서 메뉴 밖 mousedown 시에만 닫힘)
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // ESC 키 입력 시 닫기
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    // 주의: 창 포커스 전환(blur) 시에는 닫히지 않도록 blur 이벤트는 등록하지 않음
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  if (games.length === 0) return null

  const handleSelectAll = () => {
    onChangeSelectedGameIds(games.map((g) => g.id))
  }

  const handleDeselectAll = () => {
    onChangeSelectedGameIds([])
  }

  const handleToggleGame = (gameId: string) => {
    if (selectedGameIds.includes(gameId)) {
      onChangeSelectedGameIds(selectedGameIds.filter((id) => id !== gameId))
    } else {
      onChangeSelectedGameIds([...selectedGameIds, gameId])
    }
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
        aria-label="게임 필터 선택"
        className="h-8 px-2.5 text-xs font-medium border-line-control bg-surface text-content hover:bg-surface-2 flex items-center gap-1.5"
      >
        <Filter className="h-3.5 w-3.5 text-primary" />
        <span>{buttonLabel}</span>
        <ChevronDown className={`h-3 w-3 text-content-secondary transition-transform duration-fast ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="게임 필터 목록"
          className="absolute right-0 top-full mt-1.5 w-60 sm:w-64 rounded-lg border border-line bg-surface p-2 shadow-modal z-50 animate-fade-in"
        >
          {/* 상단 퀵 컨트롤 바 */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-line px-1">
            <span className="text-[11px] font-semibold text-content-secondary">
              구독 게임 필터
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-primary hover:underline px-1 py-0.5 rounded"
              >
                전체 선택
              </button>
              <span className="text-content-muted text-[10px]">·</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] text-content-secondary hover:text-content hover:underline px-1 py-0.5 rounded"
              >
                선택 해제
              </button>
            </div>
          </div>

          {/* 구독 게임 스크롤 목록 */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5 pr-0.5">
            {games.map((game) => {
              const isChecked = selectedGameIds.includes(game.id)
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleToggleGame(game.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-left transition-colors text-xs group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // 부모 버튼 클릭으로 일괄 처리
                    className="h-3.5 w-3.5 rounded border-line-control text-primary focus:ring-primary pointer-events-none"
                    aria-label={`${game.name} 선택`}
                  />
                  <div className="h-5 w-5 rounded overflow-hidden shrink-0 border border-line bg-surface-2 flex items-center justify-center">
                    <GameIcon
                      src={game.iconUrl}
                      alt=""
                      fallbackIcon={<span className="text-[10px]">🎮</span>}
                    />
                  </div>
                  <span className={`truncate flex-1 ${isChecked ? "font-semibold text-content" : "text-content-secondary group-hover:text-content"}`}>
                    {game.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

