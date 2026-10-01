"""Makes the Artistry app icons (crafts/icons/) from Dave's picture (a ukulele, paint palette, leaves and
music notes on a teal tile, picked Oct 1, 2026).

    python3 tools/make_artistry_icons.py                          # uses tools/artistry-icon-art.jpg
    python3 tools/make_artistry_icons.py new-art.png              # use a different picture
    python3 tools/make_artistry_icons.py new-art.png sheet.png    # also write a preview sheet

The picture is a rounded tile on a white background with a soft shadow. This finds the tile, squares it,
fills the white outside its own rounded corners with the tile's colors, then writes:
  icon-512.png, icon-192.png, logo-128.png    rounded tile, whole picture
  icon-maskable-512.png, icon-maskable-192.png  the tile without its rim and corners, at 86% on a blurred copy of
                                              itself, so Android's round (or rounded-square) crop keeps the ukulele and palette
  apple-touch-icon.png                        square, no transparency (iPhones round it themselves)
The long-press shortcut icons (shortcut-*.png) come from tools/make_crafts_icons.py.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "crafts", "icons")
N = 1024
MASK_SCALE = 0.86


def find_tile(img):
    """The coloured tile's box: rows and columns that are mostly not white and not the grey shadow."""
    a = np.asarray(img.convert("RGB")).astype(int)
    colourful = (a.max(axis=2) - a.min(axis=2)) > 30
    dark = a.max(axis=2) < 190
    tile = colourful | dark
    rows = np.where(tile.mean(axis=1) > 0.5)[0]
    cols = np.where(tile.mean(axis=0) > 0.5)[0]
    return cols[0], rows[0], cols[-1] + 1, rows[-1] + 1, tile


def fill_outside(img, keep):
    """Paint the pixels outside `keep` (the white beyond the tile's rounded corners) with nearby tile colours."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    m = keep.astype(np.float32)
    out = a.copy()
    hole = m < 0.5
    for radius in (6, 14, 30, 60, 120):
        num = np.stack([blur(a[..., c] * m, radius) for c in range(3)], axis=2)
        den = blur(m, radius)[..., None]
        ok = (den[..., 0] > 0.02) & hole
        out[ok] = (num / np.maximum(den, 1e-6))[ok]
        hole = hole & ~ok
        if not hole.any():
            break
    # soften the seam a touch
    soft = Image.fromarray(out.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    seam = Image.fromarray(((~keep) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
    return Image.composite(soft, Image.fromarray(out.clip(0, 255).astype(np.uint8)), seam)


def blur(ch, radius):
    """Box blur (mean over a (2r+1) square) with numpy only."""
    k = 2 * radius + 1
    p = np.pad(ch.astype(np.float64), radius, mode="constant")
    c = np.cumsum(np.cumsum(p, axis=0), axis=1)
    c = np.pad(c, ((1, 0), (1, 0)))
    h, w = ch.shape
    tot = c[k:k + h, k:k + w] - c[0:h, k:k + w] - c[k:k + h, 0:w] + c[0:h, 0:w]
    return (tot / (k * k)).astype(np.float32)


def square_art(img):
    x0, y0, x1, y1, tile = find_tile(img)
    w, h = x1 - x0, y1 - y0
    s = min(w, h)
    cx, cy = x0 + (w - s) // 2, y0 + (h - s) // 2
    box = (cx, cy, cx + s, cy + s)
    crop = img.convert("RGB").crop(box)
    keep = tile[box[1]:box[3], box[0]:box[2]]
    # trust the middle of the tile even where the picture itself is white (the flowers)
    inner = np.zeros_like(keep)
    b = int(s * 0.16)
    inner[b:-b, :] = True
    inner[:, b:-b] = True
    keep = keep | inner
    return fill_outside(crop, keep).resize((N, N), Image.LANCZOS)


def rounded(art):
    out = art.convert("RGBA")
    big = Image.new("L", (N * 4, N * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle([0, 0, N * 4 - 1, N * 4 - 1], radius=round(N * 4 * 15 / 64), fill=255)
    out.putalpha(big.resize((N, N), Image.LANCZOS))
    return out


def bleed_art(img):
    """For the maskable icon: the tile without its shiny rim and rounded corners, filled edge to edge."""
    x0, y0, x1, y1, tile = find_tile(img)
    w, h = x1 - x0, y1 - y0
    s = min(w, h)
    cut = round(s * 0.035)  # the tile's bevel
    cx, cy = x0 + (w - s) // 2 + cut, y0 + (h - s) // 2 + cut
    box = (cx, cy, cx + s - 2 * cut, cy + s - 2 * cut)
    crop = img.convert("RGB").crop(box)
    k = box[2] - box[0]
    keep = np.zeros((k, k), dtype=bool)
    big = Image.new("L", (k, k), 0)
    r = round(s * 0.23) - cut + 6  # the tile's own corner, a little inside it
    ImageDraw.Draw(big).rounded_rectangle([0, 0, k - 1, k - 1], radius=r, fill=255)
    keep = np.asarray(big) > 128
    return fill_outside(crop, keep).resize((N, N), Image.LANCZOS)


def maskable(bleed):
    """The picture at MASK_SCALE on a soft, blurred copy of itself, so any launcher shape looks filled."""
    s = round(N * MASK_SCALE)
    pad = (N - s) // 2
    back = bleed.resize((N, N), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    small = bleed.resize((s, s), Image.LANCZOS)
    out = back.copy()
    feather = Image.new("L", (s, s), 0)
    ImageDraw.Draw(feather).rectangle([10, 10, s - 11, s - 11], fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(10))
    out.paste(small, (pad, pad), feather)
    return out


def sheet(tile, mask, path):
    out = Image.new("RGBA", (1480, 600), (238, 238, 236, 255))
    d = ImageDraw.Draw(out)
    big = tile.resize((512, 512), Image.LANCZOS)
    out.paste(big, (20, 44), big)
    d.text((20, 16), "regular icon", fill=(60, 60, 60, 255))
    x = 560
    for sz in (192, 96, 48):
        im = tile.resize((sz, sz), Image.LANCZOS)
        out.paste(im, (x, 44), im)
        x += sz + 24
    m = mask.resize((220, 220), Image.LANCZOS)
    vis = round(220 * 0.87)
    off = (220 - vis) // 2
    m = m.crop((off, off, off + vis, off + vis))
    circle = Image.new("L", (vis, vis), 0)
    ImageDraw.Draw(circle).ellipse([0, 0, vis - 1, vis - 1], fill=255)
    out.paste(m, (560, 320), circle)
    d.text((560, 300), "Android round crop", fill=(60, 60, 60, 255))
    out.paste(mask.resize((220, 220), Image.LANCZOS), (800, 320))
    d.text((800, 300), "maskable file", fill=(60, 60, 60, 255))
    dark = Image.new("RGBA", (400, 240), (20, 20, 22, 255))
    for i, sz in enumerate((144, 72)):
        im = tile.resize((sz, sz), Image.LANCZOS)
        dark.paste(im, (30 + i * 180, 48), im)
    out.paste(dark, (1060, 320))
    out.convert("RGB").save(path)


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "artistry-icon-art.jpg")
    art = square_art(Image.open(src))
    tile = rounded(art)
    mask = maskable(bleed_art(Image.open(src)))
    os.makedirs(OUT, exist_ok=True)
    for size in (512, 192):
        tile.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-{size}.png"), optimize=True)
        mask.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-maskable-{size}.png"), optimize=True)
    tile.resize((128, 128), Image.LANCZOS).save(os.path.join(OUT, "logo-128.png"), optimize=True)
    art.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
    if len(sys.argv) > 2:
        sheet(tile, mask, sys.argv[2])
    print("Artistry icons written to crafts/icons/")
