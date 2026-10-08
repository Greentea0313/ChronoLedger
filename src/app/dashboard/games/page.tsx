"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

interface UserGameRow {
  id: string
  game_id: string
  games: {
    id: string
    name: string
    publisher: string
  }
}

interface SubscriptionTemplateRow {
  id: string
  game_id: string
  title: string
  billing_day: number
  default_price: number
  payment_method: string
  is_active: boolean
}

export default function GamesPage() {
  const { user } = useAuth()
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [requestName, setRequestName] = useState("")
  const [requestMemo, setRequestMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [userGames, setUserGames] = useState<UserGameRow[]>([])
  const [templates, setTemplates] = useState<SubscriptionTemplateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setIsLoading(true)
      const [gamesRes, templatesRes] = await Promise.all([
        supabase.from("user_games").select(`id, game_id, games(id, name, publisher)`).eq("user_id", user.id),
        supabase.from("subscription_templates").select("*").eq("user_id", user.id).order("billing_day", { ascending: true })
      ])

      if (gamesRes.data) setUserGames(gamesRes.data as unknown as UserGameRow[])
      if (templatesRes.data) setTemplates(templatesRes.data as SubscriptionTemplateRow[])
      setIsLoading(false)
    }
    void load()
  }, [user])

  const handleGameRequest = async () => {
    if (!user || !requestName.trim()) return
    setIsSubmitting(true)
    const { error } = await supabase.from("game_requests").insert({
      user_id: user.id,
      name: requestName.trim(),
      memo: requestMemo.trim() || null
    })
    setIsSubmitting(false)
    if (!error) {
      alert("게임 추가 건의가 접수되었습니다.")
      setSuggestionOpen(false)
      setRequestName("")
      setRequestMemo("")
    } else {
      alert("건의 접수 중 오류가 발생했습니다.")
    }
  }

  if (isLoading) return <div className="p-6 text-content">불러오는 중...</div>
  if (!user) return <div className="p-6 text-content">로그인이 필요합니다.</div>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">게임</h1>
          <p className="mt-2 text-sm text-content-secondary">게임별 구독 및 패스 관리</p>
        </div>
        
        <div className="relative">
          <Button variant="outline" onClick={() => setSuggestionOpen(!suggestionOpen)}>
            게임 추가 건의 ▾
          </Button>
          {suggestionOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-md border border-line bg-surface p-4 shadow-modal z-10">
              <h4 className="text-sm font-semibold mb-2">관리자에게 게임 추가 건의</h4>
              <p className="text-xs text-content-secondary mb-4">
                목록에 없는 게임을 추가해달라고 요청할 수 있습니다.
              </p>
              <input
                type="text"
                className="w-full rounded-md border border-line-control bg-surface-2 p-2 text-sm mb-2 text-content"
                placeholder="게임 이름..."
                value={requestName}
                onChange={e => setRequestName(e.target.value)}
                disabled={isSubmitting}
              />
              <textarea 
                className="w-full rounded-md border border-line-control bg-surface-2 p-2 text-sm mb-2 text-content"
                placeholder="추가 설명 (선택)..."
                rows={3}
                value={requestMemo}
                onChange={e => setRequestMemo(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setSuggestionOpen(false)} disabled={isSubmitting}>
                  취소
                </Button>
                <Button size="sm" onClick={() => void handleGameRequest()} disabled={isSubmitting || !requestName.trim()}>
                  건의하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>내 게임 목록</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 max-h-[500px] overflow-auto">
            {userGames.length === 0 ? (
              <EmptyState message="등록된 게임이 없습니다." hint="일정에서 픽업/일정을 추가하거나 건의해주세요." />
            ) : (
              <div className="space-y-2">
                {userGames.map((ug) => (
                  <div key={ug.id} className="p-3 rounded-md border border-line bg-surface-2">
                    <p className="font-semibold">{ug.games?.name || "알 수 없는 게임"}</p>
                    <p className="text-xs text-content-secondary mt-1">{ug.games?.publisher}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>구독형 상품 관리 (월정액/패스)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 max-h-[500px] overflow-auto">
            {templates.length === 0 ? (
              <EmptyState message="등록된 구독 상품이 없습니다." hint="정기적으로 결제되는 월정액/패스를 추가해보세요." />
            ) : (
              <div className="space-y-2">
                {templates.map((tpl) => {
                  const gameName = userGames.find(g => g.game_id === tpl.game_id)?.games?.name || "미지정 게임"
                  return (
                    <div key={tpl.id} className={`p-3 rounded-md border ${tpl.is_active ? 'border-line bg-surface-2' : 'border-line/50 bg-surface-2/50 opacity-70'} flex justify-between items-center`}>
                      <div>
                        <p className="font-medium text-content text-sm">{tpl.title}</p>
                        <p className="text-xs text-content-secondary mt-1">
                          {gameName} · 매월 {tpl.billing_day}일 · {tpl.payment_method}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-info text-sm">{tpl.default_price.toLocaleString()} 원</p>
                        <p className="text-xs mt-1 font-medium" style={{ color: tpl.is_active ? '#4CD6A5' : '#9BA3B2' }}>
                          {tpl.is_active ? "활성" : "비활성"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
