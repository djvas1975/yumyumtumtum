"""Draws Artistry's long-press shortcut icons (crafts/icons/shortcut-*.png): white symbols on a teal circle.
Run: python3 tools/make_crafts_icons.py            (shortcuts only)
     python3 tools/make_crafts_icons.py --old preview.png   (also the retired Brush & Glue palette icon, for history)

The app icon itself comes from Dave's picture: tools/make_artistry_icons.py (since Oct 1, 2026).
The old icon was a white artist's palette with four paint dabs and a paintbrush on a red tile,
drawn at 1024px and scaled down so the edges come out smooth.
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "crafts", "icons")
N = 1024
RED_TOP, RED_BOT = (242, 36, 64), (196, 0, 32)
TEAL = (10, 122, 118, 255)  # from the Artistry icon's background


def gradient(size):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        t = y / 255
        g.putpixel((0, y), tuple(int(RED_TOP[i] + (RED_BOT[i] - RED_TOP[i]) * t) for i in range(3)))
    return g.resize((size, size))


def rot(points, cx, cy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for x, y in points]


def ellipse_pts(cx, cy, rx, ry, n=200):
    return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]


def art(size=N):
    """The palette and brush on a transparent square, art centered."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    k = size / N
    # palette: a tilted oval with a notch bitten out of the lower right and a thumb hole
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.polygon(rot(ellipse_pts(470 * k, 560 * k, 360 * k, 285 * k), 470 * k, 560 * k, -18), fill=255)
    md.ellipse([(785 - 118) * k, (700 - 100) * k, (785 + 118) * k, (700 + 100) * k], fill=0)
    md.ellipse([(585 - 50) * k, (650 - 44) * k, (585 + 50) * k, (650 + 44) * k], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2 * k))
    # soft shadow under the palette
    shadow = Image.new("RGBA", (size, size), (90, 0, 10, 0))
    shadow.putalpha(mask.point(lambda v: int(v * 0.35)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18 * k))
    img.alpha_composite(shadow, (0, int(22 * k)))
    white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    white.putalpha(mask)
    img.alpha_composite(white)
    d = ImageDraw.Draw(img)
    # paint dabs
    for (x, y, r, c) in [(255, 470, 70, (47, 91, 216)), (360, 355, 64, (247, 195, 37)),
                         (300, 640, 66, (31, 166, 122)), (440, 745, 58, (255, 138, 61))]:
        d.ellipse([(x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k], fill=c + (255,))
        hl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(hl).ellipse([(x - r * 0.62) * k, (y - r * 0.6) * k, (x - r * 0.12) * k, (y - r * 0.22) * k], fill=(255, 255, 255, 80))
        img.alpha_composite(hl)
    # brush, lying across the top right of the palette
    cx, cy, ang = 640, 420, -48
    handle = rot([(520, 395), (905, 405), (915, 420), (905, 435), (520, 445)], cx, cy, ang)
    ferrule = rot([(440, 388), (530, 392), (530, 448), (440, 452)], cx, cy, ang)
    bristle = rot([(440, 388), (330, 405), (285, 420), (330, 435), (440, 452)], cx, cy, ang)
    tip = rot([(345, 402), (285, 420), (345, 438)], cx, cy, ang)
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for poly in (handle, ferrule, bristle):
        sd.polygon([(x * k + 10 * k, y * k + 16 * k) for x, y in poly], fill=(90, 0, 10, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10 * k)))
    d.polygon([(x * k, y * k) for x, y in handle], fill=(40, 34, 44, 255))
    d.polygon([(x * k, y * k) for x, y in ferrule], fill=(205, 208, 214, 255))
    d.polygon([(x * k, y * k) for x, y in bristle], fill=(236, 204, 150, 255))
    d.polygon([(x * k, y * k) for x, y in tip], fill=(47, 91, 216, 255))
    return img


def tile(size, rounded, scale):
    bg = gradient(size).convert("RGBA")
    a = art(N).resize((int(size * scale), int(size * scale)), Image.LANCZOS)
    off = (size - a.width) // 2
    bg.alpha_composite(a, (off, off + int(size * 0.01)))
    if rounded:
        m = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.22), fill=255)
        bg.putalpha(m.resize((size, size), Image.LANCZOS))
    return bg


def shortcut(kind, size=96):
    s = size * 4
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, s - 1, s - 1], fill=TEAL)
    w = int(s * 0.09)
    if kind == "add":
        d.rounded_rectangle([s * 0.5 - w / 2, s * 0.26, s * 0.5 + w / 2, s * 0.74], radius=w // 2, fill="white")
        d.rounded_rectangle([s * 0.26, s * 0.5 - w / 2, s * 0.74, s * 0.5 + w / 2], radius=w // 2, fill="white")
    elif kind == "supplies":  # a basket
        d.polygon([(s * .22, s * .42), (s * .78, s * .42), (s * .70, s * .76), (s * .30, s * .76)], fill="white")
        d.arc([s * .33, s * .2, s * .67, s * .56], 180, 360, fill="white", width=int(w * .8))
        for x in (.4, .5, .6):
            d.line([(s * x, s * .5), (s * x, s * .68)], fill=(10, 122, 118, 255), width=int(w * .45))
    elif kind == "music":  # two eighth notes joined by a beam
        r = s * 0.085
        for cx, cy in ((s * 0.36, s * 0.68), (s * 0.66, s * 0.62)):
            d.ellipse([cx - r * 1.25, cy - r, cx + r * 1.25, cy + r], fill="white")
            d.rectangle([cx + r * 1.25 - w * 0.6, cy - s * 0.36, cx + r * 1.25, cy], fill="white")
        x1, x2 = s * 0.36 + r * 1.25 - w * 0.6, s * 0.66 + r * 1.25
        y1, y2 = s * 0.68 - s * 0.36, s * 0.62 - s * 0.36
        d.polygon([(x1, y1), (x2, y2), (x2, y2 + w * 1.1), (x1, y1 + w * 1.1)], fill="white")
    else:  # ideas: a four-point sparkle
        c = s / 2
        pts = []
        for i in range(8):
            r = s * (0.3 if i % 2 == 0 else 0.09)
            a = math.pi / 4 * i - math.pi / 2
            pts.append((c + r * math.cos(a), c + r * math.sin(a)))
        d.polygon(pts, fill="white")
    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    shortcut("add").save(os.path.join(OUT, "shortcut-add.png"))
    shortcut("ideas").save(os.path.join(OUT, "shortcut-ideas.png"))
    shortcut("music").save(os.path.join(OUT, "shortcut-music.png"))
    shortcut("supplies").save(os.path.join(OUT, "shortcut-supplies.png"))
    if "--old" not in sys.argv:
        return
    # the retired Brush & Glue palette icon, written beside this script (not into the app)
    old = os.path.join(os.path.dirname(os.path.abspath(__file__)), "old-crafts-icons")
    os.makedirs(old, exist_ok=True)
    for sz in (512, 192):
        tile(sz, True, 0.86).save(os.path.join(old, "icon-%d.png" % sz), optimize=True)
        tile(sz, False, 0.7).save(os.path.join(old, "icon-maskable-%d.png" % sz), optimize=True)
    args = [x for x in sys.argv[1:] if x != "--old"]
    if args:
        sheet = Image.new("RGBA", (1100, 560), (255, 255, 255, 255))
        sheet.alpha_composite(tile(512, True, 0.86), (20, 24))
        m = tile(512, False, 0.7)
        circ = Image.new("L", (512, 512), 0)
        ImageDraw.Draw(circ).ellipse([0, 0, 511, 511], fill=255)
        m.putalpha(circ)
        sheet.alpha_composite(m, (560, 24))
        sheet.convert("RGB").save(args[0])


if __name__ == "__main__":
    main()
