"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminPage() {
  const { user, role, isLoading: authLoading } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [games, setGames] = useState<any[]>([])
  
  const [gameId, setGameId] = useState("")
  const [scheduleType, setScheduleType] = useState<"VERSION" | "PICKUP">("VERSION")
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [memo, setMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  useEffect(() => {
    if (role === 'admin') {
      supabase.from("games").select("id, name").order("name").then(({ data }) => {
        if (data) setGames(data)
      })
    }
  }, [role])

  if (authLoading) return <div className="p-6">불러오는 중...</div>
  if (!user || role !== 'admin') return <div className="p-6 text-red-500">접근 권한이 없습니다. 관리자만 이용 가능합니다.</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameId || !title || !startDate || !endDate) {
      setMessage({ type: 'error', text: '필수 항목을 모두 입력해주세요.' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const { error } = await supabase.from("game_schedules").insert({
      game_id: gameId,
      schedule_type: scheduleType,
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      memo: memo.trim() || null
    })

    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: '일정 추가에 실패했습니다: ' + error.message })
    } else {
      setMessage({ type: 'success', text: '일정이 성공적으로 추가되었습니다.' })
      setTitle("")
      setStartDate("")
      setEndDate("")
      setMemo("")
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary">관리자 페이지</h1>
        <p className="text-sm text-content-secondary mt-1">게임 일정(버전/픽업) 추가</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>새 일정 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">게임 선택</label>
              <select 
                className="w-full bg-surface-2 border border-line rounded-md p-2 text-sm"
                value={gameId}
                onChange={e => setGameId(e.target.value)}
                required
              >
                <option value="">게임을 선택하세요</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">일정 타입</label>
              <select 
                className="w-full bg-surface-2 border border-line rounded-md p-2 text-sm"
                value={scheduleType}
                onChange={e => setScheduleType(e.target.value as "VERSION" | "PICKUP")}
              >
                <option value="VERSION">버전 (VERSION)</option>
                <option value="PICKUP">픽업 (PICKUP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">타이틀</label>
              <Input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 1.2 버전 업데이트"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">시작일</label>
                <Input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">종료일</label>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">메모 (선택)</label>
              <Input 
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="일정 관련 추가 정보"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '추가 중...' : '일정 추가'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
