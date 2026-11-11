import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ImageSourceDialog } from "./image-source-dialog"

const { fetchImageFile } = vi.hoisted(() => ({ fetchImageFile: vi.fn() }))
vi.mock("@/lib/image-resizer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-resizer")>()),
  fetchImageFile,
}))

const png = (name = "a.png") => new File(["png"], name, { type: "image/png" })

function Harness({
  convert,
  onRegister,
  extra,
  convertKey,
}: {
  convert: (file: File) => Promise<string>
  onRegister: (value: string) => Promise<string | null>
  extra?: ReactNode
  convertKey?: unknown
}) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>열기</button>
      <ImageSourceDialog<string>
        open={open}
        onOpenChange={setOpen}
        title="테스트 이미지 등록"
        convert={convert}
        previewSrc={(value) => value}
        onRegister={onRegister}
        extra={extra}
        convertKey={convertKey}
      />
    </>
  )
}

const textInput = () => screen.getByPlaceholderText("https://... 또는 이미지 붙여넣기") as HTMLInputElement
const fileInput = () => screen.getByLabelText("이미지 파일") as HTMLInputElement
const register = () => fireEvent.click(screen.getByRole("button", { name: "등록" }))
const pasteInto = (input: HTMLElement, data: { files?: File[]; html?: string }) =>
  fireEvent.paste(input, {
    clipboardData: { files: data.files ?? [], items: [], getData: (type: string) => (type === "text/html" ? (data.html ?? "") : "") },
  })

describe("ImageSourceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true })
  })

  it("converts a chosen file once, previews it and registers the converted value", async () => {
    const convert = vi.fn(async (file: File) => `data:converted/${file.name}`)
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={convert} onRegister={onRegister} />)

    fireEvent.change(fileInput(), { target: { files: [png("pick.png")] } })
    expect((await screen.findByAltText("미리보기")).getAttribute("src")).toBe("data:converted/pick.png")
    register()

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith("data:converted/pick.png"))
    expect(convert).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByTestId("image-source-dialog")).toBeNull())
  })

  it("handles a pasted image file", async () => {
    const convert = vi.fn(async (file: File) => `data:converted/${file.name}`)
    render(<Harness convert={convert} onRegister={vi.fn(async () => null)} />)

    pasteInto(textInput(), { files: [png("pasted.png")] })

    expect((await screen.findByAltText("미리보기")).getAttribute("src")).toBe("data:converted/pasted.png")
    expect(textInput().value).toBe("")
  })

  it("converts a typed URL on blur and reuses the result on register", async () => {
    fetchImageFile.mockResolvedValue(png("game-icon"))
    const convert = vi.fn(async () => "data:converted/url")
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={convert} onRegister={onRegister} />)

    fireEvent.change(textInput(), { target: { value: "https://example.com/a.png" } })
    expect(screen.queryByAltText("미리보기")).toBeNull()
    fireEvent.blur(textInput())
    await screen.findByAltText("미리보기")
    register()

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith("data:converted/url"))
    expect(fetchImageFile).toHaveBeenCalledTimes(1)
    expect(fetchImageFile).toHaveBeenCalledWith("https://example.com/a.png", 256)
    expect(convert).toHaveBeenCalledTimes(1)
  })

  it("converts a typed URL on register when it was not converted yet", async () => {
    fetchImageFile.mockResolvedValue(png("game-icon"))
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={async () => "data:converted/late"} onRegister={onRegister} />)

    fireEvent.change(textInput(), { target: { value: "https://example.com/a.png" } })
    register()

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith("data:converted/late"))
  })

  it("prefers the original address of a pasted browser image and falls back to the clipboard bitmap when fetching fails", async () => {
    fetchImageFile.mockRejectedValue(new Error("이미지 URL을 가져오지 못했습니다."))
    const convert = vi.fn(async (file: File) => `data:converted/${file.name}`)
    render(<Harness convert={convert} onRegister={vi.fn(async () => null)} />)

    pasteInto(textInput(), { files: [png("bitmap.png")], html: '<img src="https://cdn.example.com/t.png">' })

    expect((await screen.findByAltText("미리보기")).getAttribute("src")).toBe("data:converted/bitmap.png")
    expect(fetchImageFile).toHaveBeenCalledWith("https://cdn.example.com/t.png", 256)
    expect(textInput().value).toBe("https://cdn.example.com/t.png")
  })

  it("uses the fetched original instead of the bitmap when the address can be fetched", async () => {
    fetchImageFile.mockResolvedValue(png("original.png"))
    const convert = vi.fn(async (file: File) => `data:converted/${file.name}`)
    render(<Harness convert={convert} onRegister={vi.fn(async () => null)} />)

    pasteInto(textInput(), { files: [png("bitmap.png")], html: '<img src="https://cdn.example.com/t.png">' })

    expect((await screen.findByAltText("미리보기")).getAttribute("src")).toBe("data:converted/original.png")
    expect(convert).toHaveBeenCalledTimes(1)
  })

  it("shows the transparency hint", () => {
    render(<Harness convert={async () => "x"} onRegister={vi.fn(async () => null)} />)
    expect(screen.getByText(/투명 배경 이미지는 파일 업로드를 권장함/)).toBeTruthy()
  })

  it("drops the result of an older source", async () => {
    let resolveFirst: (value: string) => void = () => undefined
    const convert = vi
      .fn<(file: File) => Promise<string>>()
      .mockImplementationOnce(() => new Promise<string>((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(async () => "data:converted/second")
    render(<Harness convert={convert} onRegister={vi.fn(async () => null)} />)

    fireEvent.change(fileInput(), { target: { files: [png("first.png")] } })
    fireEvent.change(fileInput(), { target: { files: [png("second.png")] } })
    expect((await screen.findByAltText("미리보기")).getAttribute("src")).toBe("data:converted/second")
    resolveFirst("data:converted/first")
    await Promise.resolve()
    expect(screen.getByAltText("미리보기").getAttribute("src")).toBe("data:converted/second")
  })

  it("keeps the dialog open and shows the error when onRegister fails", async () => {
    const onRegister = vi.fn(async () => "저장 실패")
    render(<Harness convert={async () => "data:converted/x"} onRegister={onRegister} />)

    fireEvent.change(fileInput(), { target: { files: [png()] } })
    await screen.findByAltText("미리보기")
    register()

    expect((await screen.findByRole("alert")).textContent).toBe("저장 실패")
    expect(screen.getByTestId("image-source-dialog")).toBeTruthy()
  })

  it("shows conversion errors inside the dialog and does not register", async () => {
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={async () => { throw new Error("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.") }} onRegister={onRegister} />)

    fireEvent.change(fileInput(), { target: { files: [png()] } })

    expect((await screen.findByRole("alert")).textContent).toBe("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.")
    register()
    expect(onRegister).not.toHaveBeenCalled()
  })

  it("asks for an input when registering an empty dialog", async () => {
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={async () => "x"} onRegister={onRegister} />)

    register()

    expect((await screen.findByRole("alert")).textContent).toMatch(/이미지 URL을 입력하거나/)
    expect(onRegister).not.toHaveBeenCalled()
  })

  it("blocks register while offline without fetching or saving", async () => {
    const onRegister = vi.fn(async () => null)
    render(<Harness convert={async () => "x"} onRegister={onRegister} />)

    fireEvent.change(textInput(), { target: { value: "https://example.com/a.png" } })
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true })
    register()

    expect((await screen.findByRole("alert")).textContent).toMatch(/오프라인 상태에서는 저장할 수 없습니다/)
    expect(fetchImageFile).not.toHaveBeenCalled()
    expect(onRegister).not.toHaveBeenCalled()
  })

  it("starts empty every time it is opened", async () => {
    render(<Harness convert={async () => "data:converted/x"} onRegister={vi.fn(async () => null)} />)
    fireEvent.change(textInput(), { target: { value: "https://example.com/a.png" } })
    fireEvent.change(fileInput(), { target: { files: [png()] } })
    await screen.findByAltText("미리보기")
    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    await waitFor(() => expect(screen.queryByTestId("image-source-dialog")).toBeNull())

    fireEvent.click(screen.getByRole("button", { name: "열기" }))
    const dialog = await screen.findByTestId("image-source-dialog")
    expect(textInput().value).toBe("")
    expect(fileInput().value).toBe("")
    expect(within(dialog).queryByAltText("미리보기")).toBeNull()
  })

  it("remounts the file input when text replaces a file", async () => {
    render(<Harness convert={async () => "data:converted/x"} onRegister={vi.fn(async () => null)} />)
    const before = fileInput()
    fireEvent.change(before, { target: { files: [png()] } })
    await screen.findByAltText("미리보기")

    fireEvent.change(textInput(), { target: { value: "https://example.com/b.png" } })

    expect(fileInput()).not.toBe(before)
    expect(screen.queryByAltText("미리보기")).toBeNull()
  })

  it("converts the current source again when convertKey changes", async () => {
    const convert = vi.fn(async (file: File) => `data:converted/${file.name}`)
    const { rerender } = render(<Harness convert={convert} onRegister={vi.fn(async () => null)} convertKey={false} />)
    fireEvent.change(fileInput(), { target: { files: [png("a.png")] } })
    await screen.findByAltText("미리보기")
    expect(convert).toHaveBeenCalledTimes(1)

    rerender(<Harness convert={convert} onRegister={vi.fn(async () => null)} convertKey={true} />)

    await waitFor(() => expect(convert).toHaveBeenCalledTimes(2))
  })

  it("renders the extra controls", () => {
    render(<Harness convert={async () => "x"} onRegister={vi.fn(async () => null)} extra={<label><input type="checkbox" />AI 고화질 업스케일</label>} />)
    expect(screen.getByLabelText("AI 고화질 업스케일")).toBeTruthy()
  })
})
