const MAX_INPUT_SIZE = 5 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const IMAGE_PROXY_BASE_URL = "https://wsrv.nl/";

/**
 * 5MB 이하의 PNG/JPG/JPEG/WebP 이미지를 입력받아
 * 1:1 중앙 크롭 후 256x256 해상도의 WebP(100KB 이하)로 변환합니다.
 */
export async function resizeImageToWebP(file: File): Promise<Blob> {
  // 1. 초기 용량(5MB 이하) 및 확장자 검사
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error("원본 이미지는 5MB 이하만 업로드 가능합니다.");
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error("PNG, JPG, JPEG, WebP 형식의 이미지만 지원합니다.");
  }

  // 2. 이미지를 메모리에 로드
  const image = await createImage(file);

  // 3. 1:1 중앙 크롭 좌표 및 사이즈 계산
  const size = Math.min(image.width, image.height);
  const startX = (image.width - size) / 2;
  const startY = (image.height - size) / 2;

  // 4. Canvas 설정 (256x256)
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas를 지원하지 않는 브라우저입니다.");
  }

  // 중앙 크롭 후 256x256으로 캔버스에 렌더링
  ctx.drawImage(image, startX, startY, size, size, 0, 0, 256, 256);

  // 5. WebP 변환 (품질 0.8~0.9 수준으로 압축)
  const blob = await new Promise<Blob | null>((resolve) => {
    // Safari 폴백: 브라우저가 WebP를 지원하지 않으면 기본 형식으로 떨어질 수 있으나,
    // 최신 Safari(14+)는 image/webp 변환을 정상 지원합니다.
    canvas.toBlob((b) => resolve(b), "image/webp", 0.85);
  });

  if (!blob) {
    throw new Error("WebP 이미지 변환에 실패했습니다.");
  }

  // 6. 최종 출력 용량 검사 (102,400 bytes 이하)
  const MAX_OUTPUT_SIZE = 100 * 1024;
  if (blob.size > MAX_OUTPUT_SIZE) {
    throw new Error(`변환된 이미지 용량이 100KB를 초과합니다. (현재: ${Math.round(blob.size / 1024)}KB)`);
  }

  return blob;
}

export async function convertIconSourceToDataUrl(source: File | string): Promise<string> {
  if (typeof source === "string" && source.startsWith("data:image/webp;base64,")) {
    return source;
  }

  const file = typeof source === "string" ? await fetchImageFile(source) : source;
  const blob = await resizeImageToWebP(file);
  return readBlobAsDataUrl(blob);
}

export function getClipboardImageFile(clipboardData: DataTransfer): File | null {
  const clipboardFile = Array.from(clipboardData.files).find((file) =>
    file.type.toLowerCase().startsWith("image/"),
  );
  if (clipboardFile) return clipboardFile;

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind !== "file" || !item.type.toLowerCase().startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}

async function fetchImageFile(url: string): Promise<File> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("게임 기본 아이콘 URL은 올바른 http 또는 https 주소여야 합니다.");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("게임 기본 아이콘 URL은 http 또는 https 주소여야 합니다.");
  }

  try {
    const blob = await fetchImageBlob(parsedUrl.toString());
    return new File([blob], "game-icon", { type: blob.type });
  } catch {
    const proxyUrl = new URL(IMAGE_PROXY_BASE_URL);
    proxyUrl.searchParams.set("url", parsedUrl.toString());
    proxyUrl.searchParams.set("w", "256");
    proxyUrl.searchParams.set("h", "256");
    proxyUrl.searchParams.set("fit", "cover");
    proxyUrl.searchParams.set("output", "webp");

    try {
      const blob = await fetchImageBlob(proxyUrl.toString());
      return new File([blob], "game-icon", { type: blob.type });
    } catch {
      throw new Error(
        "이미지 URL을 가져오지 못했습니다. 이미지 복사 후 붙여넣기 또는 파일 업로드를 이용해 주세요.",
      );
    }
  }
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) {
      throw new Error(`Image request failed with HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type")?.trim().toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error("Image response has an invalid content type.");
    }

    const blob = await response.blob();
    if (blob.size > MAX_INPUT_SIZE) {
      throw new Error("Image response exceeds the 5 MB input limit.");
    }

    return new Blob([blob], { type: contentType.split(";")[0] });
  } finally {
    clearTimeout(timeoutId);
  }
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("WebP 이미지 Data URL 생성에 실패했습니다."));
    };
    reader.onerror = () => reject(new Error("WebP 이미지 Data URL 생성에 실패했습니다."));
    reader.readAsDataURL(blob);
  });
}

// 헬퍼 함수: File 객체를 HTMLImageElement로 변환
function createImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다. 파일이 손상되었을 수 있습니다."));
    };

    img.src = url;
  });
}