"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { useOnlineStatus } from "@/lib/use-online-status"

export function ProfileNicknameCard() {
  const { user, nickname, refreshProfile } = useAuth()
  const isOnline = useOnlineStatus()
  const [currentNickname, setCurrentNickname] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null)

  useEffect(() => {
    if (nickname) {
      setCurrentNickname(nickname)
    }
  }, [nickname])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsBusy(true)
    setMessage(null)
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ nickname: currentNickname })
        .eq('id', user.id)

      if (error) throw error
      
      await refreshProfile()
      setMessage({ kind: "success", text: "닉네임이 성공적으로 변경되었습니다." })
    } catch (cause: unknown) {
      const msg = cause instanceof Error ? cause.message : "닉네임 변경에 실패했습니다."
      setMessage({ kind: "error", text: msg })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>닉네임 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleUpdate} className="space-y-3">
          <label htmlFor="profile-nickname" className="block text-sm font-medium">
            현재 닉네임
          </label>
          <div className="flex gap-2">
            <Input
              id="profile-nickname"
              type="text"
              value={currentNickname}
              onChange={(e) => setCurrentNickname(e.target.value)}
              disabled={isBusy || !isOnline}
              className="max-w-sm"
              placeholder="닉네임을 입력하세요"
            />
            <Button type="submit" disabled={isBusy || !isOnline || currentNickname === nickname || currentNickname.trim() === ""}>
              {isBusy ? "저장 중..." : "변경"}
            </Button>
          </div>
          {message && (
            <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}>
              {message.text}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
