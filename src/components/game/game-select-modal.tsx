"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { resizeImageToWebP } from "@/lib/image-resizer"
import { uploadUserIcon } from "@/lib/storage-upload"
import { ImagePlus, Plus, Loader2 } from "lucide-react"

interface Game {
  id: string
  name: string
}

export function GameSelectModal({ onGameAdded }: { onGameAdded: () => void }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchGames()
      resetState()
    }
  }, [isOpen])

  const resetState = () => {
    setSelectedGame(null)
    setIconFile(null)
    setError(null)
  }

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select("id, name")
      .order("name")

    if (error) {
      setError("게임 카탈로그를 불러오지 못했습니다.")
    } else {
      setGames(data || [])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIconFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!user || !selectedGame) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. 커스텀 아이콘이 등록된 경우: 클라이언트 리사이징 후 Storage 업로드
      if (iconFile) {
        const webpBlob = await resizeImageToWebP(iconFile)
        await uploadUserIcon(user.id, selectedGame.id, webpBlob)
      }

      // 2. 내 게임(user_games) 목록에 구독 정보 등록
      const { error: insertError } = await supabase
        .from("user_games")
        .insert({
          user_id: user.id,
          game_id: selectedGame.id,
        })

      if (insertError) {
        // 이미 등록된 게임일 경우 (유니크 제약 조건 위반)
        if (insertError.code === '23505') {
          throw new Error("이미 내 목록에 등록된 게임입니다.")
        }
        throw insertError
      }

      setIsOpen(false)
      onGameAdded() // 부모 컴포넌트(내 게임 목록 화면) 새로고침 트리거
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(`게임 등록 중 오류가 발생했습니다: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
          <Plus className="w-4 h-4 mr-2" /> 새 게임 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>내 게임 등록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedGame ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">카탈로그에서 플레이 중인 게임을 선택하세요.</p>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {games.map(game => (
                  <Button
                    key={game.id}
                    variant="outline"
                    className="w-full justify-start border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => setSelectedGame(game)}
                  >
                    {game.name}
                  </Button>
                ))}
                {games.length === 0 && <p className="text-sm text-gray-500">등록 가능한 공용 게임이 없습니다.</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800 p-3 rounded-md border border-gray-700">
                <span className="font-medium text-blue-100">{selectedGame.name}</span>
                <Button variant="ghost" size="sm" onClick={resetState} className="text-gray-400 hover:text-white">
                  변경
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">커스텀 아이콘 (선택사항)</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate w-48 text-left">
                      {iconFile ? iconFile.name : "이미지 파일 선택 (최대 5MB)"}
                    </span>
                  </Button>
                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
                <p className="text-xs text-gray-500">설정하지 않으면 시스템 기본 아이콘이 적용됩니다.</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isLoading ? "등록 중..." : "등록 완료"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}