"""yumyumtumtum mascot icon: a chubby, happy teen with a bushy mustache and headband,
lifting noodles with chopsticks over a tipped ramen bowl that's spilling a little.
Drawn with simple shapes so it still reads at home-screen size.

    python3 tools/make_mascot.py            # writes icons/ and a preview sheet
"""
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("ICON_OUT") or os.path.join(HERE, "..", "icons")
S = 16            # 64-unit drawing at 1024 px
N = 64 * S

INK = (42, 20, 15, 255)
SKIN = (246, 205, 164, 255)
SKIN_SH = (228, 176, 134, 255)
CHEEK = (240, 128, 112, 150)
HAIR = (30, 22, 28, 255)
BAND = (255, 255, 255, 255)
BAND_DOT = (214, 46, 30, 255)
SHIRT = (44, 70, 140, 255)
SHIRT_SH = (34, 54, 110, 255)
BOWL = (206, 48, 30, 255)
BOWL_SH = (160, 30, 18, 255)
RIM = (255, 248, 240, 255)
BROTH = (242, 176, 70, 255)
BROTH_SH = (222, 146, 44, 255)
NOODLE = (255, 226, 140, 255)
STICK = (226, 176, 108, 255)
MOUTH = (122, 30, 30, 255)
TONGUE = (240, 110, 110, 255)
FISHCAKE = (255, 255, 255, 255)
SWIRL = (236, 96, 140, 255)
C1, C2 = np.array([0xFF, 0x7B, 0x45]), np.array([0xDC, 0x3E, 0x1C])


class Pen:
    def __init__(self, img, scale=1.0, dx=0.0, dy=0.0):
        self.d = ImageDraw.Draw(img, "RGBA")
        self.k, self.dx, self.dy = scale, dx, dy

    def p(self, x, y):  # 64-unit space -> pixels
        return ((32 + (x - 32) * self.k + self.dx) * S, (32 + (y - 32) * self.k + self.dy) * S)

    def w(self, v):
        return v * self.k * S

    def poly(self, pts, fill, ow=0.0, oc=INK):
        px = [self.p(x, y) for x, y in pts]
        if ow:
            self.d.polygon(px, fill=oc)
            self.stroke(pts + [pts[0]], ow, oc)
        self.d.polygon(px, fill=fill)

    def stroke(self, pts, width, color):
        r = self.w(width) / 2
        dense = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            steps = max(1, int(math.hypot(x1 - x0, y1 - y0) * S * self.k / 2))
            dense += [(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps) for i in range(steps)]
        dense.append(pts[-1])
        for x, y in dense:
            cx, cy = self.p(x, y)
            self.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    def ell(self, cx, cy, rx, ry, fill, ow=0.0, oc=INK, rot=0.0, seg=90):
        pts = ellipse_pts(cx, cy, rx, ry, rot, seg)
        if ow:
            outer = ellipse_pts(cx, cy, rx + ow / 2, ry + ow / 2, rot, seg)
            self.d.polygon([self.p(x, y) for x, y in outer], fill=oc)
        self.d.polygon([self.p(x, y) for x, y in pts], fill=fill)


def ellipse_pts(cx, cy, rx, ry, rot=0.0, seg=90, a0=0, a1=360):
    t = math.radians(rot)
    out = []
    for i in range(seg + 1):
        a = math.radians(a0 + (a1 - a0) * i / seg)
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t)))
    return out


def bez(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def rot_pts(pts, cx, cy, deg):
    t = math.radians(deg)
    return [(cx + (x - cx) * math.cos(t) - (y - cy) * math.sin(t), cy + (x - cx) * math.sin(t) + (y - cy) * math.cos(t)) for x, y in pts]


def background(rounded):
    yy, xx = np.mgrid[0:N, 0:N]
    t = ((xx + yy) / (2 * (N - 1)))[..., None]
    rgb = (C1 * (1 - t) + C2 * t).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, np.full((N, N), 255, np.uint8)]), "RGBA")
    # soft sunburst behind the character
    glow = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([N * 0.12, N * 0.08, N * 0.88, N * 0.84], fill=(255, 214, 160, 60))
    img = Image.alpha_composite(img, glow)
    if rounded:
        mask = Image.new("L", (N, N), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, N - 1, N - 1], radius=15 * S, fill=255)
        img.putalpha(mask)
    return img


def mascot(img, scale=1.0, dx=0.0, dy=0.0):
    P = Pen(img, scale, dx, dy)
    OW = 1.3

    # body / shirt
    P.ell(32, 64, 24, 17, SHIRT, OW)
    P.ell(32, 66, 20, 12, SHIRT_SH)

    # head
    P.ell(32, 30, 17.5, 16, SKIN, OW)
    P.ell(32, 36.5, 14.5, 8.5, SKIN_SH)          # chubby chin shadow
    P.ell(32, 33.5, 15.5, 9.5, SKIN)
    # hair cap + tuft
    cap = ellipse_pts(32, 26, 17.2, 13.5, 0, 90, 180, 360)
    P.poly(cap, HAIR)
    P.poly([(26.5, 15), (27.5, 9.5), (30, 13), (32, 7.8), (33.6, 12.6), (37, 9.4), (37.2, 15)], HAIR)
    # ears
    P.ell(14.8, 31, 2.6, 3.4, SKIN, OW)
    P.ell(49.2, 31, 2.6, 3.4, SKIN, OW)
    # headband with a red dot and tied tails
    band = [(15, 19.5), (49, 19.5), (49.3, 24.3), (14.7, 24.3)]
    P.poly(band, BAND, OW)
    P.ell(32, 21.9, 2.2, 2.2, BAND_DOT)
    P.poly([(47.5, 21), (55, 15.5), (56.5, 19), (49.5, 23)], BAND, OW)
    P.poly([(48, 22.5), (56.5, 24), (55.5, 27.5), (48.5, 24.5)], BAND, OW)

    # happy closed eyes
    P.stroke(ellipse_pts(25.5, 30.5, 3.2, 2.6, 0, 30, 200, 340), 1.7, INK)
    P.stroke(ellipse_pts(38.5, 30.5, 3.2, 2.6, 0, 30, 200, 340), 1.7, INK)
    # rosy cheeks
    P.ell(21.5, 35.5, 3.4, 2.4, CHEEK)
    P.ell(42.5, 35.5, 3.4, 2.4, CHEEK)
    # nose
    P.ell(32, 34.2, 2.2, 1.8, SKIN_SH)

    # open "yum" mouth
    mouth = ellipse_pts(32, 39.6, 4.6, 4.2, 0, 40, 0, 180) + [(27.4, 39.6)]
    P.poly(mouth, MOUTH, 1.0)
    P.poly(ellipse_pts(32, 42.4, 2.6, 1.5, 0, 30, 180, 360) + ellipse_pts(32, 42.4, 2.6, 1.3, 0, 30, 0, 180), TONGUE)

    # big bushy mustache with curled ends
    for side in (-1, 1):
        top = bez((32, 36.2), (32 + side * 4, 34.4), (32 + side * 9, 35), (32 + side * 11.5, 36.8))
        curl = bez((32 + side * 11.5, 36.8), (32 + side * 13.8, 38.5), (32 + side * 13.4, 35.6), (32 + side * 11.8, 35.2), 16)
        bottom = bez((32 + side * 11.4, 38.6), (32 + side * 8.5, 40.2), (32 + side * 4, 39.8), (32, 38.4))
        P.poly(top + curl[1:] + [(32 + side * 12.6, 38.4)] + bottom, HAIR)
        P.stroke(curl, 1.2, HAIR)

    # tipped ramen bowl, spilling to the left
    tilt = -14
    bcx, bcy = 31, 51.5
    bowl = ellipse_pts(bcx, bcy, 14.5, 9.5, 0, 60, 0, 180)
    P.poly(rot_pts(bowl, bcx, bcy, tilt), BOWL, OW)
    P.poly(rot_pts(ellipse_pts(bcx, bcy + 1.5, 13, 7.5, 0, 50, 20, 160), bcx, bcy, tilt), BOWL_SH)
    P.poly(rot_pts(ellipse_pts(bcx, bcy + 4, 5, 1.6, 0, 30, 0, 360), bcx, bcy, tilt), BOWL_SH)
    # rim and broth
    P.poly(rot_pts(ellipse_pts(bcx, bcy, 14.7, 3.7, 0, 90), bcx, bcy, tilt), RIM, OW)
    P.poly(rot_pts(ellipse_pts(bcx, bcy + 0.3, 12.6, 2.6, 0, 90), bcx, bcy, tilt), BROTH)
    # noodles in the bowl and a fishcake slice
    for off in (-6, -1.5, 3):
        wave = [(bcx + off + i * 0.5, bcy + 0.3 + math.sin(i * 1.2) * 0.8) for i in range(9)]
        P.stroke(rot_pts(wave, bcx, bcy, tilt), 0.9, NOODLE)
    fx, fy = rot_pts([(bcx + 7.5, bcy - 0.4)], bcx, bcy, tilt)[0]
    P.ell(fx, fy, 2.6, 1.4, FISHCAKE, 0.6, SWIRL, tilt)
    P.stroke(ellipse_pts(fx, fy, 1.2, 0.6, tilt, 20, 0, 300), 0.5, SWIRL)
    # the spill: a pour off the low lip, a puddle, and a few drops
    lip = rot_pts([(bcx - 14.6, bcy)], bcx, bcy, tilt)[0]
    P.poly(bez(lip, (lip[0] - 1.5, lip[1] + 2), (lip[0] - 3, lip[1] + 4.5), (lip[0] - 2, lip[1] + 8)) +
           bez((lip[0] + 0.6, lip[1] + 8), (lip[0] + 0.4, lip[1] + 5), (lip[0] + 0.8, lip[1] + 2.5), (lip[0] + 1.6, lip[1] + 0.4)), BROTH, 1.0)
    P.ell(lip[0] - 0.5, lip[1] + 8.8, 9, 2.6, BROTH, 1.0)
    P.ell(lip[0] - 0.5, lip[1] + 8.7, 6.8, 1.5, BROTH_SH)
    P.stroke([(lip[0] - 6 + i * 0.55, lip[1] + 8.6 + math.sin(i * 1.3) * 0.6) for i in range(12)], 0.9, NOODLE)
    P.stroke([(lip[0] + 0.5 + i * 0.5, lip[1] + 9.2 + math.sin(i * 1.4 + 1) * 0.5) for i in range(10)], 0.9, NOODLE)
    P.ell(lip[0] - 5.5, lip[1] + 3.5, 1.1, 1.3, BROTH, 0.7)
    P.ell(lip[0] - 7.2, lip[1] + 6.2, 0.8, 0.9, BROTH, 0.6)

    # hand with chopsticks lifting noodles toward the mouth
    P.stroke([(57.5, 34), (40.5, 47.5)], 2.2, INK)
    P.stroke([(57.5, 34), (40.5, 47.5)], 1.2, STICK)
    P.stroke([(58.5, 37.5), (42, 49.5)], 2.2, INK)
    P.stroke([(58.5, 37.5), (42, 49.5)], 1.2, STICK)
    for off in (-1.2, 0.3, 1.6):
        strand = bez((41 + off * 0.4, 48.5), (40 + off, 51.5), (38.5 + off, 49), (37 + off, 52.5), 20)
        P.stroke(strand, 1.0, NOODLE)
    P.ell(51.5, 41.5, 4.2, 3.8, SKIN, OW)
    P.stroke(bez((49, 40), (50.5, 39.2), (52.5, 39.4), (54, 40.6), 10), 0.8, SKIN_SH)


def make(rounded=True, scale=1.0, dx=0.0, dy=0.0):
    img = background(rounded)
    mascot(img, scale, dx, dy)
    if rounded:  # keep the tile's rounded corners clean
        mask = Image.new("L", (N, N), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, N - 1, N - 1], radius=15 * S, fill=255)
        img.putalpha(mask)
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    tile = make(True, 0.97, 0, -3.2)
    full = make(False, 0.78, 0, -1.8)        # maskable: art kept inside the safe zone
    for size in (512, 192):
        tile.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-{size}.png"))
        full.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-maskable-{size}.png"))
    tile.resize((128, 128), Image.LANCZOS).save(os.path.join(OUT, "logo-128.png"))
    if len(sys.argv) > 1:  # preview sheet: big, home-screen sizes, and Android's round mask
        sheet = Image.new("RGBA", (1480, 560), (238, 234, 240, 255))
        big = tile.resize((512, 512), Image.LANCZOS)
        sheet.paste(big, (20, 24), big)
        x = 560
        for sz in (192, 96, 48):
            im = tile.resize((sz, sz), Image.LANCZOS)
            sheet.paste(im, (x, 24), im); x += sz + 24
        m = full.resize((192, 192), Image.LANCZOS)
        circle = Image.new("L", (192, 192), 0); ImageDraw.Draw(circle).ellipse([0, 0, 191, 191], fill=255)
        sheet.paste(m, (560, 300), circle)
        dark = Image.new("RGBA", (420, 240), (20, 13, 25, 255))
        for i, sz in enumerate((144, 72)):
            im = tile.resize((sz, sz), Image.LANCZOS)
            dark.paste(im, (30 + i * 180, 40), im)
        sheet.paste(dark, (800, 300))
        sheet.save(sys.argv[1])
    print("mascot icons written")
