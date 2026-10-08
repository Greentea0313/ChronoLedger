import { act, fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AuthPage from "./page"

const { signInWithPassword, signUp, signInWithOAuth, useAuth, replace } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  useAuth: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { signInWithPassword, signUp, signInWithOAuth },
  },
}))

describe("AuthPage", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, isLoading: false })
    signInWithPassword.mockReset()
    signUp.mockReset()
    signInWithOAuth.mockReset()
    replace.mockReset()
    window.history.replaceState({}, "", "/auth")
  })

  afterEach(() => cleanup())

  it("submits email/password login and navigates on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<AuthPage />)
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "secret123" } })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "이메일 로그인" }))
    })

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    })
    expect(replace).toHaveBeenCalledWith("/dashboard")
  })

  it("shows an actionable error when login fails", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    })
    render(<AuthPage />)

    await act(async () => {
      fireEvent.submit(screen.getByLabelText("이메일").closest("form")!)
    })

    expect(screen.getByRole("alert").textContent).toContain("이메일이나 비밀번호")
    expect(replace).not.toHaveBeenCalled()
  })

  it("explains email confirmation when signup does not create a session", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<AuthPage />)
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "new@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "secret123" } })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "회원가입" }))
    })

    expect(signUp).toHaveBeenCalledWith({ email: "new@example.com", password: "secret123" })
    expect(screen.getByRole("status").textContent).toContain("가입 확인 메일")
  })

  it("requests Google OAuth with the Web/PWA callback", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://provider.invalid" }, error: null })
    render(<AuthPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Google 계정으로 로그인" }))
      await Promise.resolve()
    })

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    })
  })
})
