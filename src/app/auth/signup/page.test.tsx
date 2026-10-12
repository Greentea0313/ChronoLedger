import { act, fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import SignUpPage from "./page"

const { signUp, update, eq, from, useAuth, replace } = vi.hoisted(() => {
  const eqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ update: updateMock })
  return {
    signUp: vi.fn(),
    update: updateMock,
    eq: eqMock,
    from: fromMock,
    useAuth: vi.fn(),
    replace: vi.fn(),
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth }))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { signUp },
    from,
  },
}))

describe("SignUpPage", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null, isLoading: false })
    signUp.mockReset()
    update.mockClear()
    eq.mockClear()
    from.mockClear()
    replace.mockReset()
    window.history.replaceState({}, "", "/auth/signup")
  })

  afterEach(() => cleanup())

  it("renders input fields for email, password, and nickname", () => {
    render(<SignUpPage />)
    expect(screen.getByLabelText("이메일")).toBeDefined()
    expect(screen.getByLabelText("비밀번호")).toBeDefined()
    expect(screen.getByLabelText("닉네임")).toBeDefined()
    expect(screen.getByRole("button", { name: "가입하기" })).toBeDefined()
    expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/auth")
  })

  it("redirects to /dashboard if user is already logged in", () => {
    useAuth.mockReturnValue({ user: { id: "user-123" }, isLoading: false })
    render(<SignUpPage />)
    expect(replace).toHaveBeenCalledWith("/dashboard")
  })

  it("submits signup with email, password, and nickname metadata", async () => {
    signUp.mockResolvedValue({
      data: { session: { access_token: "token" }, user: { id: "u-1" } },
      error: null,
    })
    render(<SignUpPage />)

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } })
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "게이머1" } })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "가입하기" }))
    })

    expect(signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: { data: { nickname: "게이머1" } },
    })
    expect(from).toHaveBeenCalledWith("users")
    expect(update).toHaveBeenCalledWith({ nickname: "게이머1" })
    expect(eq).toHaveBeenCalledWith("id", "u-1")
    expect(replace).toHaveBeenCalledWith("/dashboard")
  })

  it("shows confirmation notice when signup requires email verification", async () => {
    signUp.mockResolvedValue({
      data: { session: null, user: { id: "u-2" } },
      error: null,
    })
    render(<SignUpPage />)

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "verify@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } })
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "게이머2" } })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "가입하기" }))
    })

    expect(signUp).toHaveBeenCalledWith({
      email: "verify@example.com",
      password: "password123",
      options: { data: { nickname: "게이머2" } },
    })
    expect(screen.getByRole("status").textContent).toContain("가입 확인 메일")
    expect(replace).not.toHaveBeenCalled()
  })

  it("shows an error message when signup fails", async () => {
    signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    })
    render(<SignUpPage />)

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "existing@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } })
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "게이머3" } })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "가입하기" }))
    })

    expect(screen.getByRole("alert").textContent).toContain("User already registered")
    expect(replace).not.toHaveBeenCalled()
  })
})
