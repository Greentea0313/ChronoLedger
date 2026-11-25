import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetOAuthExchangeCacheForTests } from '@/lib/auth-adapter'
import AuthCallbackPage from './page'

const { exchangeCodeForSession, replace } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession,
    },
  },
}))

describe('AuthCallbackPage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // @ts-expect-error React act environment flag
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    resetOAuthExchangeCacheForTests()
    exchangeCodeForSession.mockReset()
    replace.mockReset()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    window.history.replaceState({}, '', '/auth/callback')
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('renders loading spinner, brand title, and status text while authenticating', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=pkce-code')
    exchangeCodeForSession.mockImplementation(() => new Promise(() => {}))

    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(container.querySelector('.animate-spin')).not.toBeNull()
    expect(container.textContent).toContain('ChronoLedger')
    expect(container.textContent).toContain('게임 일정과 지출을 한 곳에서 관리하세요.')
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Google 인증을 확인하고 있습니다...')
  })

  it('exchanges the authorization code and navigates to the dashboard', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=pkce-code')
    exchangeCodeForSession.mockResolvedValue({ error: null })

    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('completes the callback when effects are re-run by Strict Mode', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=pkce-code')
    exchangeCodeForSession.mockResolvedValue({ error: null })

    await act(async () => {
      root.render(
        <StrictMode>
          <AuthCallbackPage />
        </StrictMode>,
      )
      await Promise.resolve()
    })

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/dashboard')
  })

  it('shows a friendly cancellation error when access_denied is returned', async () => {
    window.history.replaceState({}, '', '/auth/callback?error=access_denied&error_description=User%20cancelled')

    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Google 로그인이 취소되었습니다')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/auth')
  })

  it('shows the provider error description for other OAuth errors', async () => {
    window.history.replaceState({}, '', '/auth/callback?error=server_error&error_description=Provider%20unavailable')

    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Provider unavailable')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('shows an error when the callback has no code', async () => {
    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('인증 응답에 코드가 없습니다')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('shows a session exchange error and does not navigate', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=pkce-code')
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'Invalid code verifier' } })

    await act(async () => {
      root.render(<AuthCallbackPage />)
      await Promise.resolve()
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Invalid code verifier')
    expect(replace).not.toHaveBeenCalled()
  })
})
