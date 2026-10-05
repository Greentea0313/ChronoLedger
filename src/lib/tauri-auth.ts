import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { supabase } from '@/lib/supabase/client'

export async function setupDeepLink() {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return

  try {
    await onOpenUrl(async (urls) => {
      for (const url of urls) {
        if (url.includes('auth/callback')) {
          const hash = url.split('#')[1] || url.split('?')[1]
          
          if (hash) {
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              window.location.href = '/dashboard'
            }
          }
        }
      }
    })
  } catch (error) {
    console.error("딥링크 초기화 실패:", error)
  }
}