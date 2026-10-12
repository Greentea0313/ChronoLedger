"""ChronoLedger A안(C-Clock) 아이콘 생성기.

시안: docs/icon-drafts-preview.html 의 시안 A.
출력: public/icons/icon-{512,192,180,maskable-512}.png
실행: python scripts/generate_icons.py
"""
import math
import os

from PIL import Image, ImageDraw

BG = (17, 24, 39)          # #111827 (manifest theme/background와 동일)
YELLOW = (250, 204, 21)    # #FACC15 (기존 아이콘 링 실측값)
BLUE = (96, 165, 250)      # #60A5FA (기존 아이콘 바늘 실측값)

BASE = 512
# RING_R은 바깥 반지름 (Pillow arc 스트로크가 bbox 안쪽으로 그려짐을 실측 확인)
RING_R = 158  # 원본 192px 실측 바깥 R 59 환산
RING_W = 32   # 링 굵기 (원본 실측 12 환산)
GAP_HALF = 43  # C 벌어짐 절반각 (원본 실측값)
HOUR_TIP = (256, 160)    # 12시 방향 (원본 실측 길이 환산)
MINUTE_TIP = (317, 235)  # 3시 살짝 위 방향 (원본 실측 길이/각도 환산)
HAND_W = 23   # 바늘 굵기 (원본 실측 8.5 환산)
DOT_R = 23    # 중심 도트 (원본 실측 환산)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")


def _t(p, c, u):
    return (c + (p[0] - 256) * u, c + (p[1] - 256) * u)


def render(size, k=1.0, supersample=4):
    big = size * supersample
    u = (big / BASE) * k
    c = big / 2
    im = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(im)

    r = RING_R * u
    w = max(1, round(RING_W * u))
    d.arc([c - r, c - r, c + r, c + r], start=GAP_HALF, end=360 - GAP_HALF,
          fill=YELLOW, width=w)
    # 끝처리: 원본처럼 호를 그대로 끝냄(별도 라운드 캡 없음 — 다운스케일 AA가 둥글게 만듦)

    # 시곗바늘
    hw = max(1, round(HAND_W * u))
    for tip in (HOUR_TIP, MINUTE_TIP):
        tx, ty = _t(tip, c, u)
        d.line([(c, c), (tx, ty)], fill=BLUE, width=hw)
        d.ellipse([tx - hw / 2, ty - hw / 2, tx + hw / 2, ty + hw / 2], fill=BLUE)

    # 중심 도트
    dr = DOT_R * u
    d.ellipse([c - dr, c - dr, c + dr, c + dr], fill=BLUE)

    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("icon-180.png", 180, 1.0),
        ("icon-maskable-512.png", 512, 0.9),  # 마스크 크롭 대비 여유
    ]
    for name, size, k in targets:
        path = os.path.join(OUT_DIR, name)
        render(size, k).save(path)
        print(f"saved {path} ({size}x{size}, k={k})")


if __name__ == "__main__":
    main()
