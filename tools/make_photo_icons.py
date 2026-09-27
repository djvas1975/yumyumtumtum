"""Makes the app icons from a finished picture (currently Dave's pigging-out cartoon).

    python3 tools/make_photo_icons.py                      # uses tools/icon-art.jpg
    python3 tools/make_photo_icons.py new-art.png          # use a different picture
    python3 tools/make_photo_icons.py new-art.png sheet.png  # also write a preview sheet

Writes to icons/:
  icon-512.png, icon-192.png                  rounded tile, whole picture
  icon-maskable-512.png, icon-maskable-192.png  picture shrunk to 82% so Android's round
                                              crop doesn't clip his head or the food; the
                                              edges are filled by stretching the picture's own edges, softened
  logo-128.png                                rounded reference copy
and swaps the embedded LOGO image in tools/app.html (a 256px JPEG, the page rounds it).
Then run tools/build.py as usual.
"""
import base64
import io
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, "..", "icons")
APP = os.path.join(HERE, "app.html")
N = 1024
MASK_SCALE = 0.82


def square(img):
    w, h = img.size
    s = min(w, h)
    return img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def rounded(img):
    out = img.convert("RGBA")
    mask = Image.new("L", out.size, 0)
    r = round(out.size[0] * 15 / 64)  # same corner as the earlier icons
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, out.size[0] - 1, out.size[1] - 1], radius=r, fill=255)
    out.putalpha(mask)
    return out


def maskable(art):
    s = round(N * MASK_SCALE)
    pad = (N - s) // 2
    small = art.resize((s, s), Image.LANCZOS)
    a = np.asarray(small)
    padded = np.pad(a, ((pad, N - s - pad), (pad, N - s - pad), (0, 0)), mode="edge")
    full = Image.fromarray(padded)
    soft = full.filter(ImageFilter.GaussianBlur(18))
    keep = Image.new("L", (N, N), 0)
    ImageDraw.Draw(keep).rectangle([pad + 6, pad + 6, pad + s - 7, pad + s - 7], fill=255)
    keep = keep.filter(ImageFilter.GaussianBlur(5))
    return Image.composite(full, soft, keep)


def swap_logo(art):
    buf = io.BytesIO()
    art.resize((256, 256), Image.LANCZOS).save(buf, "JPEG", quality=86, optimize=True)
    data = base64.b64encode(buf.getvalue()).decode()
    html = open(APP, encoding="utf-8").read()
    new = "const LOGO = '<img class=\"logo\" src=\"data:image/jpeg;base64," + data + "\" alt=\"\" width=\"128\" height=\"128\">';"
    html, n = re.subn(r"^const LOGO = '.*';$", lambda m: new, html, count=1, flags=re.M)
    if n != 1:
        sys.exit("couldn't find the LOGO line in app.html")
    open(APP, "w", encoding="utf-8").write(html)
    return len(data)


def sheet(tile, mask, path):
    out = Image.new("RGBA", (1480, 600), (238, 234, 240, 255))
    d = ImageDraw.Draw(out)
    big = tile.resize((512, 512), Image.LANCZOS)
    out.paste(big, (20, 44), big)
    d.text((20, 16), "regular icon", fill=(60, 60, 60, 255))
    x = 560
    for sz in (192, 96, 48):
        im = tile.resize((sz, sz), Image.LANCZOS)
        out.paste(im, (x, 44), im)
        x += sz + 24
    # Android round crop: roughly the middle 87% of a maskable icon shows
    m = mask.resize((220, 220), Image.LANCZOS)
    vis = round(220 * 0.87)
    off = (220 - vis) // 2
    m = m.crop((off, off, off + vis, off + vis))
    circle = Image.new("L", (vis, vis), 0)
    ImageDraw.Draw(circle).ellipse([0, 0, vis - 1, vis - 1], fill=255)
    out.paste(m, (560, 320), circle)
    d.text((560, 300), "Android round crop", fill=(60, 60, 60, 255))
    full = mask.resize((220, 220), Image.LANCZOS)
    out.paste(full, (800, 320))
    d.text((800, 300), "maskable file", fill=(60, 60, 60, 255))
    dark = Image.new("RGBA", (400, 240), (20, 13, 25, 255))
    for i, sz in enumerate((144, 72)):
        im = tile.resize((sz, sz), Image.LANCZOS)
        dark.paste(im, (30 + i * 180, 48), im)
    out.paste(dark, (1060, 320))
    out.save(path)


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "icon-art.jpg")
    art = square(Image.open(src).convert("RGB")).resize((N, N), Image.LANCZOS)
    tile = rounded(art)
    mask = maskable(art)
    os.makedirs(ICONS, exist_ok=True)
    for size in (512, 192):
        tile.resize((size, size), Image.LANCZOS).save(os.path.join(ICONS, f"icon-{size}.png"), optimize=True)
        mask.resize((size, size), Image.LANCZOS).save(os.path.join(ICONS, f"icon-maskable-{size}.png"), optimize=True)
    tile.resize((128, 128), Image.LANCZOS).save(os.path.join(ICONS, "logo-128.png"), optimize=True)
    n = swap_logo(art)
    if len(sys.argv) > 2:
        sheet(tile, mask, sys.argv[2])
    print(f"icons written, LOGO swapped ({n} base64 chars)")
