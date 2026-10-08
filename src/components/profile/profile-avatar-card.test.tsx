import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { upload, download, remove, resize } = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
  resize: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }))
vi.mock("@/lib/use-online-status", () => ({ useOnlineStatus: () => true }))
vi.mock("@/lib/image-resizer", () => ({ resizeImageToWebP: resize }))
vi.mock("@/lib/storage-upload", () => ({
  uploadProfileAvatar: upload,
  downloadProfileAvatar: download,
  deleteProfileAvatar: remove,
}))

import { ProfileAvatarCard } from "./profile-avatar-card"

describe("ProfileAvatarCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    download.mockResolvedValue(null)
    URL.createObjectURL = vi.fn(() => "blob:preview")
    URL.revokeObjectURL = vi.fn()
  })

  it("resizes and uploads the chosen photo", async () => {
    const blob = new Blob(["x"], { type: "image/webp" })
    resize.mockResolvedValue(blob)
    upload.mockResolvedValue(undefined)
    render(<ProfileAvatarCard />)

    const file = new File(["x"], "me.png", { type: "image/png" })
    fireEvent.change(screen.getByLabelText(/사진 선택/), { target: { files: [file] } })

    await waitFor(() => expect(upload).toHaveBeenCalledWith("user-1", blob))
    expect((await screen.findByRole("status")).textContent).toContain("변경했습니다")
    expect(screen.getByRole("button", { name: "직접 올린 사진 삭제" })).toBeTruthy()
  })

  it("shows the resize error and does not upload", async () => {
    resize.mockRejectedValue(new Error("원본 이미지는 5MB 이하만 업로드 가능합니다."))
    render(<ProfileAvatarCard />)

    fireEvent.change(screen.getByLabelText(/사진 선택/), { target: { files: [new File(["x"], "big.png", { type: "image/png" })] } })

    expect((await screen.findByRole("alert")).textContent).toContain("5MB")
    expect(upload).not.toHaveBeenCalled()
  })

  it("removes an existing custom photo", async () => {
    download.mockResolvedValue("blob:existing")
    remove.mockResolvedValue(undefined)
    render(<ProfileAvatarCard />)

    fireEvent.click(await screen.findByRole("button", { name: "직접 올린 사진 삭제" }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith("user-1"))
    await waitFor(() => expect(screen.queryByRole("button", { name: "직접 올린 사진 삭제" })).toBeNull())
  })
})
