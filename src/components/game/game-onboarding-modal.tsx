"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GameIcon } from "@/components/ui/game-icon"
import { supabase } from "@/lib/supabase/client"
import { dismissGameOnboarding, saveGameOrder } from "@/lib/game-order-storage"
import { OFFLINE_WRITE_MESSAGE, isOffline } from "@/lib/offline-guard"
import { useOnlineStatus } from "@/lib/use-online-status"
import { cn } from "@/lib/utils"

interface OnboardingGame {
  id: string
  name: string
  default_icon_url: string | null
}

interface GameOnboardingModalProps {
  open: boolean
  userId: string
  onClose: () => void
  onSubscribed: (selectedGameIds: string[]) => void
}

/** First-visit modal that bulk-subscribes a new user (no subscribed games) to the shared catalog. */
export function GameOnboardingModal({ open, userId, onClose, onSubscribed }: GameOnboardingModalProps) {
  const isOnline = useOnlineStatus()
  const [games, setGames] = useState<OnboardingGame[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Runs only when `open` changes (not on parent re-renders), so loaded choices are never reset mid-selection.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setIsLoadingGames(true)
    void (async () => {
      let data: unknown
      let loadError: unknown = null
      try {
        const result = await supabase.from("games").select("id, name, default_icon_url").order("name")
        data = result.data
        loadError = result.error
      } catch (cause) {
        loadError = cause
      }
      if (cancelled) return
      if (loadError) {
        setGames([])
        setSelectedIds([])
        setError("게임 목록을 불러오지 못했습니다.")
      } else {
        const rows = (data ?? []) as OnboardingGame[]
        setGames(rows)
        setSelectedIds(rows.map((game) => game.id))
      }
      setIsLoadingGames(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const selectedSet = new Set(selectedIds)

  const toggleGame = (gameId: string) =>
    setSelectedIds((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]))

  const handleLater = () => {
    dismissGameOnboarding(userId)
    onClose()
  }

  const handleSubscribe = async () => {
    if (selectedIds.length === 0) return
    if (isOffline()) {
      setError(OFFLINE_WRITE_MESSAGE)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      // Keep the catalog order the user sees as the initial "my games" order.
      const orderedIds = games.filter((game) => selectedSet.has(game.id)).map((game) => game.id)
      const { error: insertError } = await supabase
        .from("user_games")
        .insert(orderedIds.map((game_id) => ({ user_id: userId, game_id })))
      if (insertError) {
        setError("게임 구독에 실패했습니다. 잠시 후 다시 시도해 주세요.")
        return
      }
      saveGameOrder(userId, orderedIds)
      dismissGameOnboarding(userId)
      onSubscribed(orderedIds)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isSaving) handleLater() }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-line bg-surface text-content">
        <DialogHeader>
          <DialogTitle className="text-content">구독할 게임을 선택하세요</DialogTitle>
          <DialogDescription className="text-content-secondary">
            처음 오셨네요! 플레이하는 게임을 한 번에 구독해 일정과 과금을 바로 관리할 수 있습니다. 구독은 언제든 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoadingGames ? (
          <p className="py-6 text-center text-sm text-content-secondary">게임 목록을 불러오는 중입니다...</p>
        ) : games.length === 0 ? (
          <p className="py-6 text-center text-sm text-content-secondary">표시할 게임이 없습니다.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-content-secondary">{`${selectedIds.length} / ${games.length}개 선택`}</p>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedIds(games.map((game) => game.id))}>
                  전체 선택
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  전체 해제
                </Button>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="onboarding-game-list">
              {games.map((game) => {
                const selected = selectedSet.has(game.id)
                return (
                  <li key={game.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGame(game.id)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2.5 rounded-lg border p-2 text-left text-sm transition-colors duration-fast",
                        selected ? "border-primary bg-primary/10 text-content" : "border-line bg-surface-2 text-content-secondary hover:text-content",
                      )}
                    >
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-line">
                        <GameIcon src={game.default_icon_url} alt={game.name} />
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">{game.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleLater} disabled={isSaving}>
            나중에 직접 선택
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={selectedIds.length === 0 || isSaving || !isOnline}
          >
            {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {`선택한 게임 구독 시작 (${selectedIds.length}개)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
