"""Draws the yumyumtumtum app icons as PNGs (no SVG renderer available here).

Artwork matches the in-app logo: chili-orange tile, white bowl with a smile,
saffron steam. Coordinates are in the logo's 64-unit space.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
S = 16  # draw at 1024px, then scale down
N = 64 * S
C1, C2 = np.array([0xFF, 0x7B, 0x45]), np.array([0xDC, 0x3E, 0x1C])
CHILI = (0xDC, 0x3E, 0x1C, 255)
SAFFRON = (0xFF, 0xD2, 0x7A, 255)
WHITE = (255, 255, 255, 255)


def bez(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def stroke(draw, pts, width, color):
    """Round-capped stroke drawn by stamping circles along a densely sampled path."""
    r = width * S / 2
    dense = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        steps = max(1, int(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5 * S / 2))
        for i in range(steps):
            f = i / steps
            dense.append((x0 + (x1 - x0) * f, y0 + (y1 - y0) * f))
    dense.append(pts[-1])
    for x, y in dense:
        draw.ellipse([x * S - r, y * S - r, x * S + r, y * S + r], fill=color)


def icon(maskable):
    yy, xx = np.mgrid[0:N, 0:N]
    t = ((xx + yy) / (2 * (N - 1)))[..., None]
    rgb = (C1 * (1 - t) + C2 * t).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, np.full((N, N), 255, np.uint8)]), "RGBA")
    if not maskable:  # rounded tile
        mask = Image.new("L", (N, N), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, N - 1, N - 1], radius=15 * S, fill=255)
        img.putalpha(mask)

    # maskable icons keep the art inside the central safe zone
    def tf(p):
        if not maskable:
            return p
        return ((p[0] - 32) * 0.82 + 32, (p[1] - 30) * 0.82 + 33)

    k = 0.82 if maskable else 1.0
    d = ImageDraw.Draw(img)
    # bowl: lower half of an ellipse centered (32,31), rx 19, ry 18
    cx, cy = tf((32, 31))
    rx, ry = 19 * k, 18 * k
    d.chord([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], 0, 180, fill=WHITE)
    # smile
    stroke(d, [tf(p) for p in bez((25, 38.5), (28, 41.7), (36, 41.7), (39, 38.5))], 3 * k, CHILI)
    # steam
    for x in (26, 32, 38):
        stroke(d, [tf(p) for p in bez((x, 24), (x - 2.5, 21), (x + 2.5, 19.5), (x, 16))], 3 * k, SAFFRON)
    return img


def add_shortcut():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, N - 1, N - 1], fill=(0xE0, 0x43, 0x1F, 255))
    stroke(d, [(32, 18), (32, 46)], 6, WHITE)
    stroke(d, [(18, 32), (46, 32)], 6, WHITE)
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    any_ = icon(False)
    mask = icon(True)
    for size in (512, 192):
        any_.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-{size}.png"))
    mask.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-maskable-512.png"))
    mask.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, "icon-maskable-192.png"))
    add_shortcut().resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, "shortcut-add.png"))
    print("icons written to", OUT)
