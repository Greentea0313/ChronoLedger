"""ChronoLedger icon generator - Draft 1A (C-Chrono + memo dot).

Source: docs/icon-concepts-v3-c-variants-preview.html, variant 1A (selected).
Geometry replicates the approved 1A look (decision A):
  - bg #0F1115, C-ring #F5B942 (center-line R150, width 64, gap +-45.6 deg)
  - hands #7C8CFF (width 36, round caps, center dot r26)
  - memo dot #4CD6A5 (r20 at (420,256), in the C opening)
  - inner frame #2A2F3A (inset 8, rx 106, width 8)
Targets: public/icons/icon-{512,192,180,maskable-512}.png
Usage: python scripts/generate_icons.py
"""
import math
import os

from PIL import Image, ImageDraw

BG = (15, 17, 21)        # #0F1115 (dark color.bg token)
FRAME = (42, 47, 58)     # #2A2F3A (border token, inner frame like the preview SVG)
RING = (245, 185, 66)    # #F5B942 (warning token)
HAND = (124, 140, 255)   # #7C8CFF (primary dark token)
DOT = (76, 214, 165)     # #4CD6A5 (success token, memo dot)

BASE = 512
RING_R = 150   # center-line radius of the C ring
RING_W = 64    # ring stroke width
GAP_HALF = math.degrees(math.atan2(106, 104))  # ~45.6 deg
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


def render(size, k=1.0, supersample=4, has_frame=True):
    big = size * supersample
    u = (big / BASE) * k
    c = big / 2
    im = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(im)

    # C ring via mask compositing. PIL's arc uses a different angle convention
    # than pieslice, so arc ends never quite meet separately drawn caps
    # (visible notch) and full-disc caps bulge into attached dots. Build the
    # band explicitly: outer disc minus inner disc, minus the gap wedge, plus
    # outer-semicircle caps (= SVG stroke-linecap="round").
    r = RING_R * u
    w = max(1, round(RING_W * u))
    rmask = Image.new("L", (big, big), 0)
    rm = ImageDraw.Draw(rmask)
    rm.ellipse([c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2],
               fill=255)
    rm.ellipse([c - r + w / 2, c - r + w / 2, c + r - w / 2, c + r - w / 2],
               fill=0)
    outer = [c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2]
    rm.pieslice(outer, start=360 - GAP_HALF, end=360, fill=0)
    rm.pieslice(outer, start=0, end=GAP_HALF, fill=0)
    for a_deg, sgn in ((360 - GAP_HALF, 1.0), (GAP_HALF, -1.0)):
        a = math.radians(a_deg)
        ex = c + r * math.cos(a)
        ey = c + r * math.sin(a)
        tx, ty = sgn * -math.sin(a), sgn * math.cos(a)
        alpha = math.degrees(math.atan2(ty, tx))
        rm.pieslice([ex - w / 2, ey - w / 2, ex + w / 2, ey + w / 2],
                    start=alpha - 90, end=alpha + 90, fill=255)
    im.paste(Image.new("RGB", (big, big), RING), (0, 0), rmask)

    # clock hands with round tips
    hw = max(1, round(HAND_W * u))
    for tip in (HOUR_TIP, MINUTE_TIP):
        tx, ty = _t(tip, c, u)
        d.line([(c, c), (tx, ty)], fill=HAND, width=hw)
        _disc(d, (tx, ty), hw / 2, HAND)

    # center dot + memo dot in the C opening
    _disc(d, (c, c), CENTER_R * u, HAND)
    _disc(d, _t(MEMO_DOT, c, u), MEMO_R * u, DOT)

    # inner frame (matches the preview SVG's inset border rect)
    if has_frame:
        m = 8 * u
        d.rounded_rectangle([m, m, big - m, big - m], radius=106 * u,
                            outline=FRAME, width=max(1, round(8 * u)))

    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-512.png", 512, 1.0, True),
        ("icon-192.png", 192, 1.0, True),
        ("icon-180.png", 180, 1.0, True),
        ("icon-maskable-512.png", 512, 0.75, False),  # maskable safe-area shrink (80% safe zone) and no border
    ]
    for name, size, k, has_frame in targets:
        path = os.path.join(OUT_DIR, name)
        render(size, k, has_frame=has_frame).save(path)
        print(f"saved {path} ({size}x{size}, k={k}, frame={has_frame})")

    # Generate public/favicon.ico containing 16, 32, 48 sizes
    favicon_path = os.path.join(ROOT, "public", "favicon.ico")
    fav_images = [render(s, 1.0, has_frame=False) for s in (48, 32, 16)]
    fav_images[0].save(favicon_path, format="ICO", sizes=[(48, 48), (32, 32), (16, 16)])
    print(f"saved {favicon_path} (ICO 16, 32, 48)")


if __name__ == "__main__":
    main()
