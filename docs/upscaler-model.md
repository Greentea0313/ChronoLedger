# 아이콘 AI 업스케일 모델 기록 (R60)

## 1. 사용 모델

- **파일**: `public/models/waifu2x/cunet_art_scale2x.onnx`
- **모델**: waifu2x `cunet` / `art` 스타일 / `scale2x`(2배, 노이즈 제거 없음)
- **원작자·원 배포처**: nagadomi, [`nagadomi/nunif`](https://github.com/nagadomi/nunif) 릴리스 `0.0.0`의 `waifu2x_onnx_models_20250502.zip`(약 700 MB 묶음)
- **실제 다운로드처**: Hugging Face 미러 [`deepghs/waifu2x_onnx`](https://huggingface.co/deepghs/waifu2x_onnx) `20250502/onnx_models/cunet/art/scale2x.onnx` (미러 README에 nagadomi/nunif 출처 명시)
- **크기**: 5,178,591 bytes (약 5.18 MB, Cloudflare Pages 파일당 25 MiB 한도 이내)
- **SHA-256**: `0966d74dd0739a20de358de88c8fa4eb6cb8c3489bb0e941da9751ad4dcdf495` (Hugging Face 표시값과 다운로드 파일 일치 확인, 2026-11-10)
- **라이선스**: waifu2x·nunif MIT License. nunif 저장소는 MIT로 공개되어 있으나 사전 학습 모델에 대한 별도 라이선스 문구는 저장소 첫 화면에 없음 → 원 waifu2x 프로젝트(MIT) 기준으로 판단함. 재배포 시 MIT 고지 유지 필요함.
- **다운로드 승인**: 2026-11-10 사용자 승인 후 수록함.

## 2. 입력·출력 계약 (실측 확인)

- **입력**: 이름 `x`, `float32`, `[1, 3, H, W]`(NCHW, RGB), 값 범위 0~1
- **출력**: 이름 `y`, `float32`, `[1, 3, 2H - 72, 2W - 72]`, 값 범위 0~1
- **패딩**: 공식 웹판 `models.js` 기준 `scale: 2`, `offset: 36`, `padding: "replication"` → 입력 사방에 18px(= offset / scale)씩 가장자리 복제 패딩을 하면 출력이 정확히 `2N × 2N`임
- **실측 (Node, onnxruntime-web 1.31.1 wasm)**: 28px 입력(패딩 64px) → `[1,3,56,56]`, 100px 입력(패딩 136px) → `[1,3,200,200]`, 0.5 입력에 출력 0.499~0.500
- **투명도**: 모델은 RGB만 처리함. 투명 픽셀은 흰 배경에 합성해 입력하고(공식 웹판과 동일), 알파 채널은 브라우저 쌍선형 확대 결과를 따로 결합함.

## 3. 런타임 배포 방식

- `onnxruntime-web` wasm 전용 번들(`ort.wasm.bundle.min.mjs`, 77 KB)과 `ort-wasm-simd-threaded.wasm`(14.8 MB)을 `next.config.mjs`가 빌드·개발 시작 시 `public/ort/`로 복사함(git 미추적).
- 앱은 `/ort/ort.wasm.bundle.min.mjs`를 `webpackIgnore` 동적 import로 불러오므로 webpack 번들·초기 라우트에 ONNX Runtime이 포함되지 않음.
- WebGPU 겸용 `jsep` wasm(29.5 MB)은 Cloudflare Pages 파일당 25 MiB 한도를 넘어 사용하지 않음. 실행 백엔드는 `wasm`, 스레드 1개로 고정함.
- Service Worker(`public/sw.js`)는 `/_next/static/`·`/icons/`·`/assets/`·`/fonts/`만 캐시하므로 `/ort/`·`/models/` 대용량 파일은 캐시하지 않음.

## 4. 동작 범위

- PC 데스크톱 브라우저(모바일 UA 제외, WebAssembly 지원)에서 256px 미만 이미지를 선택·붙여넣기한 경우에만 `[AI 고화질 업스케일 (PC 전용)]` 토글을 표시함(기본 ON).
- 모델·런타임 로드 또는 추론 실패 시 기존 캔버스 리사이저로 즉시 폴백함. 세션은 1회 생성 후 재사용하고, 실패 시 다음 시도에서 다시 생성함.
- 최종 결과는 기존 파이프라인으로 256×256 WebP(100 KB 한도)로 변환함.
