"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { setupDeepLink } from '@/lib/tauri-auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, isLoading: true })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      setupDeepLink().catch((err) => console.error("딥링크 에러:", err))
    } catch (e) {
      console.error(e)
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("세션 에러:", error)
      setSession(session)
      setUser(session?.user ?? null)
    }).catch((err) => {
      console.error("Supabase 에러:", err)
    }).finally(() => {
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)