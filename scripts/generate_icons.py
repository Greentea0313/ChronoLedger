"""ChronoLedger icon generator - Draft 1A (C-Chrono + memo dot).

Source: docs/icon-concepts-v3-c-variants-preview.html, variant 1A (selected).
Geometry replicates the approved 1A SVG (512 viewBox):
  - bg #0F1115, C-ring #F5B942 (center-line R150, width 64, gap +-45.6 deg)
  - hands #7C8CFF (width 36, round caps, center dot r26)
  - memo dot #4CD6A5 (r20 at (414,256), in the C opening)
Targets: public/icons/icon-{512,192,180,maskable-512}.png
Usage: python scripts/generate_icons.py
"""
import math
import os

from PIL import Image, ImageDraw

BG = (15, 17, 21)        # #0F1115 (dark color.bg token)
RING = (245, 185, 66)    # #F5B942 (warning token)
HAND = (124, 140, 255)   # #7C8CFF (primary dark token)
DOT = (76, 214, 165)     # #4CD6A5 (success token, memo dot)

BASE = 512
RING_R = 150   # center-line radius of the C ring
RING_W = 64    # ring stroke width
GAP_HALF = math.degrees(math.atan2(106, 104))  # ~45.6 deg (endpoints (360,150)/(360,362))
HAND_W = 36
HOUR_TIP = (256, 168)
MINUTE_TIP = (322, 282)
CENTER_R = 26
MEMO_DOT = (420, 256)
MEMO_R = 20  # 16px rendering drops nothing; dot stays separated from ring

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "icons")


def _t(p, c, u):
    return (c + (p[0] - 256) * u, c + (p[1] - 256) * u)


def _disc(d, xy, r, fill):
    d.ellipse([xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r], fill=fill)


def render(size, k=1.0, supersample=4):
    big = size * supersample
    u = (big / BASE) * k
    c = big / 2
    im = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(im)

    # C ring (Pillow arc has butt caps, so add round endpoint discs like SVG linecap)
    r = RING_R * u
    w = max(1, round(RING_W * u))
    d.arc([c - r, c - r, c + r, c + r], start=GAP_HALF, end=360 - GAP_HALF,
          fill=RING, width=w)
    for sgn in (1, -1):
        ex = c + RING_R * u * math.cos(math.radians(GAP_HALF))
        ey = c + sgn * RING_R * u * math.sin(math.radians(GAP_HALF))
        _disc(d, (ex, ey), w / 2, RING)

    # clock hands with round tips
    hw = max(1, round(HAND_W * u))
    for tip in (HOUR_TIP, MINUTE_TIP):
        tx, ty = _t(tip, c, u)
        d.line([(c, c), (tx, ty)], fill=HAND, width=hw)
        _disc(d, (tx, ty), hw / 2, HAND)

    # center dot + memo dot in the C opening
    _disc(d, (c, c), CENTER_R * u, HAND)
    _disc(d, _t(MEMO_DOT, c, u), MEMO_R * u, DOT)

    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("icon-180.png", 180, 1.0),
        ("icon-maskable-512.png", 512, 0.9),  # maskable safe-area shrink
    ]
    for name, size, k in targets:
        path = os.path.join(OUT_DIR, name)
        render(size, k).save(path)
        print(f"saved {path} ({size}x{size}, k={k})")


if __name__ == "__main__":
    main()
