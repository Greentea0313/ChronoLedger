'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation' // 라우터 추가
import { supabase } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter() // 라우터 객체 생성

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(`회원가입 실패: ${error.message}`)
    else setMessage('회원가입 성공! 이제 로그인해주세요.')
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(`로그인 실패: ${error.message}`)
    } else {
      setMessage('로그인 성공! 대시보드로 이동합니다...')
      router.push('/dashboard') // 로그인 성공 시 대시보드로 이동
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-blue-400">ChronoLedger</h1>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 p-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 p-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          {message && <p className="text-sm text-yellow-400">{message}</p>}
          <div className="flex space-x-4 pt-4">
            <button onClick={handleLogin} disabled={loading} className="flex-1 rounded bg-blue-600 p-2 font-semibold hover:bg-blue-700">
              로그인
            </button>
            <button onClick={handleSignUp} disabled={loading} className="flex-1 rounded border border-blue-600 p-2 font-semibold text-blue-400 hover:bg-gray-700">
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}