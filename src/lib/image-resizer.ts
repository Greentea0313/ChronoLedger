/**
 * 5MB 이하의 PNG/JPG/JPEG/WebP 이미지를 입력받아
 * 1:1 중앙 크롭 후 256x256 해상도의 WebP(100KB 이하)로 변환합니다.
 */
export async function resizeImageToWebP(file: File): Promise<Blob> {
  // 1. 초기 용량(5MB 이하) 및 확장자 검사
  const MAX_INPUT_SIZE = 5 * 1024 * 1024;
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