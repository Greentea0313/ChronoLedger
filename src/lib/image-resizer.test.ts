import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertIconSourceToDataUrl, getClipboardImageFile } from "@/lib/image-resizer";

function imageResponse(contentType = "image/png") {
  return new Response(new Blob(["image"], { type: contentType }), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

describe("convertIconSourceToDataUrl", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class {
        width = 256;
        height = 256;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          this.onload?.();
        }
      },
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["webp"], { type: "image/webp" }));
    });
    vi.stubGlobal(
      "FileReader",
      class {
        result: string | null = null;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        readAsDataURL(blob: Blob) {
          void blob;
          this.result = "data:image/webp;base64,encoded";
          this.onload?.();
        }
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the direct image response without calling the proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(convertIconSourceToDataUrl("https://example.test/icon.png")).resolves.toBe(
      "data:image/webp;base64,encoded",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://example.test/icon.png", {
      signal: expect.any(AbortSignal),
      referrerPolicy: "no-referrer",
    });
  });

  it("uses the encoded proxy URL after a direct request failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(imageResponse("image/webp"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(convertIconSourceToDataUrl("https://i.namu.wiki/a b.png")).resolves.toBe(
      "data:image/webp;base64,encoded",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const proxyUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(proxyUrl.origin).toBe("https://wsrv.nl");
    expect(proxyUrl.searchParams.get("url")).toBe("https://i.namu.wiki/a%20b.png");
    expect(proxyUrl.searchParams.get("w")).toBe("256");
    expect(proxyUrl.searchParams.get("h")).toBe("256");
    expect(proxyUrl.searchParams.get("fit")).toBe("cover");
    expect(proxyUrl.searchParams.get("output")).toBe("webp");
  });

  it("rejects a non-image proxy response with paste/upload guidance", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(
      new Response("not an image", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(convertIconSourceToDataUrl("https://example.test/icon.png")).rejects.toThrow(
      "이미지 복사 후 붙여넣기 또는 파일 업로드",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("times out direct and proxy requests", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const conversion = convertIconSourceToDataUrl("https://example.test/icon.png");
    const rejection = expect(conversion).rejects.toThrow("이미지 복사 후 붙여넣기 또는 파일 업로드");
    await vi.runAllTimersAsync();
    await rejection;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("getClipboardImageFile", () => {
  it("finds image files in DataTransfer.items when files is empty", () => {
    const imageFile = new File(["image"], "clipboard.png", { type: "image/png" });
    const clipboardData = {
      files: [],
      items: [{ kind: "file", type: "image/png", getAsFile: () => imageFile }],
    } as unknown as DataTransfer;

    expect(getClipboardImageFile(clipboardData)).toBe(imageFile);
  });
});