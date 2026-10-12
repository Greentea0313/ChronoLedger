"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { setupDeepLink } from '@/lib/tauri-auth'
import {
  ACCOUNT_DELETION_STATUS_TOKEN_KEY,
  fetchAccountDeletionStatus,
  type AccountDeletionStatus,
} from '@/lib/account-deletion'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: string | null
  nickname: string | null
  isLoading: boolean
  isAccountDeletionStatusLoading: boolean
  accountDeletionStatus: AccountDeletionStatus | null
  refreshAccountDeletionStatus: () => Promise<void>
  beginAccountDeletionTracking: (statusToken: string) => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  nickname: null,
  isLoading: true,
  isAccountDeletionStatusLoading: true,
  accountDeletionStatus: null,
  refreshAccountDeletionStatus: async () => {},
  beginAccountDeletionTracking: () => {},
  refreshProfile: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccountDeletionStatusLoading, setIsAccountDeletionStatusLoading] = useState(true)
  const [accountDeletionStatus, setAccountDeletionStatus] = useState<AccountDeletionStatus | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('users').select('role, nickname').eq('id', userId).maybeSingle()
    if (data) {
      setRole(data.role)
      setNickname(data.nickname)
    } else {
      setRole(null)
      setNickname(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    void setupDeepLink().catch((error: unknown) => console.error("딥링크 초기화 실패:", error))

    let authEventReceived = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) fetchProfile(nextSession.user.id)
      else { setRole(null); setNickname(null) }
      if (event === "SIGNED_OUT" || !nextSession?.user) {
        setIsAccountDeletionStatusLoading(false)
      }
      setIsLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("세션 에러:", error)
        return
      }
      if (!authEventReceived) {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
      }
    }).catch((err) => {
      console.error("Supabase 에러:", err)
    }).finally(() => {
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const refreshAccountDeletionStatus = useCallback(async () => {
    try {
      if (user) {
        const { data, error } = await supabase
          .from("account_deletion_requests")
          .select("status")
          .maybeSingle()

        if (error) {
          console.error("계정 삭제 상태를 확인하지 못했습니다:", error)
        } else if (data) {
          setAccountDeletionStatus(data.status as AccountDeletionStatus)
          return
        }
      }

      const statusToken = window.localStorage.getItem(ACCOUNT_DELETION_STATUS_TOKEN_KEY)
      if (!statusToken) {
        if (!accountDeletionStatus) setAccountDeletionStatus(null)
        return
      }

      const status = await fetchAccountDeletionStatus(statusToken)
      if (status) {
        setAccountDeletionStatus(status)
      } else if (accountDeletionStatus !== "COMPLETED") {
        window.localStorage.removeItem(ACCOUNT_DELETION_STATUS_TOKEN_KEY)
        setAccountDeletionStatus(null)
      }
    } catch (error) {
      console.error("계정 삭제 진행 상태를 확인하지 못했습니다:", error)
    } finally {
      setIsAccountDeletionStatusLoading(false)
    }
  }, [accountDeletionStatus, user])

  const beginAccountDeletionTracking = useCallback((statusToken: string) => {
    window.localStorage.setItem(ACCOUNT_DELETION_STATUS_TOKEN_KEY, statusToken)
    setAccountDeletionStatus("PENDING")
    setIsAccountDeletionStatusLoading(false)
  }, [])

  useEffect(() => {
    if (isLoading) return

    let active = true
    const refresh = async () => {
      if (!active) return
      await refreshAccountDeletionStatus()
    }
    void refresh()
    const interval = window.setInterval(() => {
      if (window.localStorage.getItem(ACCOUNT_DELETION_STATUS_TOKEN_KEY)) {
        void refresh()
      }
    }, 5_000)
    window.addEventListener("focus", refresh)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACCOUNT_DELETION_STATUS_TOKEN_KEY) void refresh()
    }
    window.addEventListener("storage", handleStorage)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", handleStorage)
    }
  }, [isLoading, refreshAccountDeletionStatus])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      nickname,
      isLoading,
      isAccountDeletionStatusLoading,
      accountDeletionStatus,
      refreshAccountDeletionStatus,
      beginAccountDeletionTracking,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)