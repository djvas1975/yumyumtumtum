"""yumyumtumtum mascot icon, painted-cartoon style: a chubby, happy teen with a bushy mustache
and headband, lifting noodles with chopsticks over a glossy ramen bowl that has tipped and
spilled across a wooden counter. Soft shading and highlights for a more realistic look,
bold shapes and outlines so it still reads at home-screen size.

    python3 tools/make_mascot.py              # writes icons/
    python3 tools/make_mascot.py preview.png  # also writes a preview sheet
    ICON_OUT=somewhere python3 tools/make_mascot.py   # write icons somewhere else
"""
import math
import os
import random
import sys
from functools import reduce

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("ICON_OUT") or os.path.join(HERE, "..", "icons")
S = 16
N = 64 * S

INK = (58, 30, 20)
SKIN_HI, SKIN, SKIN_LO = (252, 222, 190), (243, 196, 156), (214, 150, 108)
HAIR_HI, HAIR, HAIR_LO = (70, 58, 66), (38, 29, 34), (16, 11, 14)
SHIRT_HI, SHIRT, SHIRT_LO = (74, 110, 186), (46, 74, 146), (27, 44, 96)
BOWL_HI, BOWL, BOWL_LO = (240, 82, 52), (204, 44, 26), (120, 20, 12)
CREAM = (255, 246, 232)
BROTH_HI, BROTH_LO = (255, 214, 128), (212, 132, 40)
NOODLE_HI, NOODLE_LO = (255, 236, 168), (206, 160, 70)
WOOD_HI, WOOD, WOOD_LO, WOOD_FRONT, WOOD_FRONT_LO = (196, 132, 76), (160, 98, 50), (120, 70, 34), (104, 60, 30), (66, 36, 16)
C1, C2 = np.array([0xFF, 0x80, 0x4A]), np.array([0xD8, 0x3A, 0x1A])


def ellipse_pts(cx, cy, rx, ry, rot=0.0, seg=96, a0=0, a1=360):
    t = math.radians(rot)
    out = []
    for i in range(seg + 1):
        a = math.radians(a0 + (a1 - a0) * i / seg)
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t)))
    return out


def bez(p0, p1, p2, p3, n=36):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def rot(pts, cx, cy, deg):
    t = math.radians(deg)
    return [(cx + (x - cx) * math.cos(t) - (y - cy) * math.sin(t), cy + (x - cx) * math.sin(t) + (y - cy) * math.cos(t)) for x, y in pts]


class Painter:
    def __init__(self, img, k=1.0, dx=0.0, dy=0.0):
        self.img, self.k, self.dx, self.dy = img, k, dx, dy

    # --- geometry -> masks
    def P(self, x, y):
        return ((32 + (x - 32) * self.k + self.dx) * S, (32 + (y - 32) * self.k + self.dy) * S)

    def px(self, units):
        return units * self.k * S

    def poly(self, pts):
        m = Image.new("L", (N, N), 0)
        ImageDraw.Draw(m).polygon([self.P(x, y) for x, y in pts], fill=255)
        return m

    def ell(self, cx, cy, rx, ry, r=0.0, a0=0, a1=360):
        return self.poly(ellipse_pts(cx, cy, rx, ry, r, 96, a0, a1))

    def line(self, pts, width):
        m = Image.new("L", (N, N), 0)
        d = ImageDraw.Draw(m)
        r = self.px(width) / 2
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            steps = max(1, int(math.hypot(x1 - x0, y1 - y0) * S * self.k / 2))
            for i in range(steps + 1):
                cx, cy = self.P(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        return m

    @staticmethod
    def union(*ms):
        return reduce(ImageChops.lighter, ms)

    @staticmethod
    def clip(m, to):
        return ImageChops.multiply(m, to)

    # --- paint
    def solid(self, m, color, alpha=255):
        if alpha < 255:
            m = m.point(lambda v: v * alpha // 255)
        self.img.paste(tuple(color) + (255,), (0, 0, N, N), m)

    def _field(self, m):
        box = m.getbbox()
        if not box:
            return None
        x0, y0, x1, y1 = box
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        return box, xx, yy

    def _paste_rgb(self, m, box, rgb):
        layer = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
        self.img.paste(layer, box[:2], m.crop(box))

    def lin(self, m, c1, c2, p1, p2):
        f = self._field(m)
        if not f:
            return
        box, xx, yy = f
        (x1, y1), (x2, y2) = self.P(*p1), self.P(*p2)
        vx, vy = x2 - x1, y2 - y1
        t = np.clip(((xx - x1) * vx + (yy - y1) * vy) / (vx * vx + vy * vy), 0, 1)[..., None]
        self._paste_rgb(m, box, np.array(c1) * (1 - t) + np.array(c2) * t)

    def rad(self, m, c_in, c_out, center, radius):
        f = self._field(m)
        if not f:
            return
        box, xx, yy = f
        cx, cy = self.P(*center)
        t = np.clip(np.hypot(xx - cx, yy - cy) / self.px(radius), 0, 1)[..., None]
        t = t ** 1.3
        self._paste_rgb(m, box, np.array(c_in) * (1 - t) + np.array(c_out) * t)

    def soft(self, m, color, alpha, blur):
        b = m.filter(ImageFilter.GaussianBlur(self.px(blur)))
        self.solid(b, color, alpha)

    def outline(self, m, width=0.8, color=INK):
        sigma = self.px(width) / 2.4
        grown = m.filter(ImageFilter.GaussianBlur(sigma)).point(lambda v: 255 if v > 3 else 0)
        grown = grown.filter(ImageFilter.GaussianBlur(1.2))
        self.solid(grown, color)

    def shape(self, m, fill, width=0.8, **grad):
        """outline, then fill (solid or gradient), in one go"""
        if width:
            self.outline(m, width)
        if "lin" in grad:
            self.lin(m, *grad["lin"])
        elif "rad" in grad:
            self.rad(m, *grad["rad"])
        else:
            self.solid(m, fill)


def background(rounded):
    yy, xx = np.mgrid[0:N, 0:N]
    t = ((xx + yy) / (2 * (N - 1)))[..., None]
    rgb = (C1 * (1 - t) + C2 * t).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, np.full((N, N), 255, np.uint8)]), "RGBA")
    glow = Image.new("L", (N, N), 0)
    ImageDraw.Draw(glow).ellipse([N * 0.14, N * 0.02, N * 0.86, N * 0.74], fill=110)
    img.paste((255, 216, 168, 255), (0, 0, N, N), glow.filter(ImageFilter.GaussianBlur(N * 0.06)))
    return img


def mascot(img, k=1.0, dx=0.0, dy=0.0):
    p = Painter(img, k, dx, dy)
    rnd = random.Random(7)

    # ---------- body, arm, neck ----------
    body = p.ell(32, 61, 23, 17)
    p.shape(body, None, 0.9, lin=(SHIRT_HI, SHIRT_LO, (14, 46), (50, 64)))
    for fold in ([(22, 50), (24.5, 53.5)], [(40.5, 49.5), (38.8, 53.6)]):
        p.solid(p.line(bez(fold[0], (fold[0][0] + 0.8, fold[0][1] + 1.2), (fold[1][0] - 0.6, fold[1][1] - 1.4), fold[1], 12), 0.55), SHIRT_LO, 150)
    neck = p.ell(32, 44.2, 6.8, 3.4)
    p.shape(neck, None, 0.7, lin=(SKIN, SKIN_LO, (32, 42), (32, 47)))
    collar = p.line(ellipse_pts(32, 44.6, 7.4, 3.8, 0, 40, 10, 170), 1.0)
    p.solid(collar, SHIRT_LO)
    forearm = p.poly([(51.6, 42.6), (55.4, 41.6), (53.2, 50.8), (48.8, 50.8)])
    p.shape(forearm, None, 0.8, lin=(SKIN, SKIN_LO, (50, 44), (55, 46)))
    sleeve = p.poly([(46.8, 49.2), (54.6, 49.2), (56.2, 55), (44.6, 55)])
    p.shape(sleeve, None, 0.8, lin=(SHIRT_HI, SHIRT_LO, (46, 49), (56, 55)))

    # ---------- head ----------
    for ex in (15.6, 48.4):
        ear = p.ell(ex, 28.4, 2.9, 3.9)
        p.shape(ear, None, 0.8, rad=(SKIN, SKIN_LO, (ex, 28.4), 3.9))
        p.solid(p.ell(ex + (0.5 if ex < 32 else -0.5), 28.6, 1.3, 2.2), SKIN_LO, 170)
    skull = p.ell(32, 25.5, 15.3, 14.8)
    head = p.union(skull, p.ell(21.2, 32.4, 7.7, 6.8), p.ell(42.8, 32.4, 7.7, 6.8), p.ell(32, 36.6, 12.2, 7.8))
    p.shape(head, None, 0.95, rad=(SKIN_HI, SKIN, (27, 22), 20))
    # form shadow on the lower right, chin fold, double chin
    shade = p.clip(p.ell(40, 36, 13, 11), head)
    p.soft(shade, SKIN_LO, 90, 1.6)
    p.solid(p.line(ellipse_pts(32, 42.0, 5.4, 1.3, 0, 30, 20, 160), 0.55), SKIN_LO, 200)
    # blush
    for cx in (21.4, 42.6):
        p.soft(p.ell(cx, 32.4, 4.2, 2.9), (240, 110, 100), 120, 0.9)

    # ---------- hair ----------
    cap = p.union(
        p.clip(p.ell(32, 25.3, 15.7, 15.1), p.poly([(0, 0), (64, 0), (64, 17.4), (0, 17.4)])),
        p.poly([(25.6, 12.6), (26.8, 6.4), (29.4, 10.4), (31.8, 4.6), (33.6, 9.8), (37.2, 6.2), (38.4, 12.6)]),
        p.clip(p.poly([(16.4, 17), (19.2, 17), (18.6, 26.6), (16.9, 25.8)]), skull),
        p.clip(p.poly([(47.6, 17), (44.8, 17), (45.4, 26.6), (47.1, 25.8)]), skull),
    )
    p.shape(cap, None, 0.9, lin=(HAIR_HI, HAIR_LO, (24, 6), (40, 22)))
    for i in range(7):
        x = 22 + i * 3.2
        strand = bez((x, 16), (x + 0.6, 13.5), (x + 1.8, 11.8), (x + 2.6, 10.6 + (i % 2)), 10)
        p.solid(p.clip(p.line(strand, 0.35), cap), (110, 96, 108), 120)
    p.soft(p.clip(p.ell(26.5, 12.4, 4.6, 1.6, -18), cap), (150, 140, 160), 110, 0.5)

    # ---------- headband ----------
    band = p.poly(bez((15.8, 16.8), (24, 14.9), (40, 14.9), (48.2, 16.8)) + bez((48.4, 21.6), (40, 20.0), (24, 20.0), (15.6, 21.6)))
    p.shape(band, None, 0.85, lin=((255, 255, 255), (222, 214, 206), (32, 15), (32, 21.5)))
    for x0 in (21, 27, 38, 43):
        p.solid(p.clip(p.line([(x0, 15.6), (x0 + 1.2, 20.6)], 0.3), band), (196, 186, 178), 160)
    dot = p.ell(32, 17.7, 2.1, 2.1)
    p.rad(dot, (240, 70, 50), (176, 30, 18), (31.4, 17.1), 2.4)
    for tail, g in (([(49.4, 18.2), (56.2, 12.2), (57.8, 15.6), (50.4, 19.8)], ((255, 255, 255), (214, 204, 196))),
                    ([(49.8, 20), (57.6, 20.8), (56.4, 24.8), (49.6, 21.8)], ((246, 242, 238), (206, 196, 188)))):
        m = p.poly(tail)
        p.shape(m, None, 0.8, lin=(g[0], g[1], tail[0], tail[2]))
    knot = p.ell(48.8, 19.2, 1.9, 2.3)
    p.shape(knot, None, 0.8, lin=((250, 246, 240), (200, 190, 182), (48, 17), (50, 21.5)))

    # ---------- face ----------
    for s in (-1, 1):
        brow = bez((32 + s * 10.8, 23.9), (32 + s * 9.2, 22.4), (32 + s * 6, 22.2), (32 + s * 3.6, 23.1), 16)
        p.solid(p.line(brow, 1.45), HAIR)
    for s in (-1, 1):
        ex, ey = 32 + s * 6.7, 27.3
        white = p.ell(ex, ey, 3.0, 1.6, -4 * s)
        p.outline(white, 0.55)
        p.lin(white, (255, 255, 255), (228, 222, 222), (ex, ey - 2), (ex, ey + 2))
        iris = p.clip(p.ell(ex + 0.3, ey - 0.1, 1.7, 1.7), white)
        p.rad(iris, (126, 76, 44), (40, 20, 12), (ex + 0.3, ey + 0.4), 1.8)
        p.solid(p.clip(p.ell(ex + 0.3, ey - 0.1, 0.82, 0.82), white), (14, 8, 6))
        p.solid(p.clip(p.ell(ex + 0.85, ey - 0.5, 0.48, 0.48), white), (255, 255, 255))
        p.solid(p.clip(p.ell(ex - 0.35, ey + 0.55, 0.2, 0.2), white), (255, 255, 255), 220)
        p.solid(p.line(ellipse_pts(ex, ey + 0.35, 3.25, 2.05, -4 * s, 24, 192, 348), 1.0), INK)
        p.solid(p.line(ellipse_pts(ex, ey - 0.9, 3.0, 2.6, 0, 20, 40, 140), 0.45), SKIN_LO, 170)
        corner = (ex + s * 3.0, ey - 0.3)
        p.solid(p.line([corner, (corner[0] + s * 0.9, corner[1] - 0.9)], 0.55), INK)
        p.solid(p.line(ellipse_pts(ex + s * 3.4, ey + 1.6, 1.2, 0.9, 0, 12, 300 if s > 0 else 120, 400 if s > 0 else 220), 0.4), SKIN_LO, 200)
    nose = p.ell(32, 31.3, 2.55, 2.15)
    p.lin(nose, SKIN_HI, SKIN_LO, (31, 29.5), (33, 33.4))
    p.solid(p.ell(30.9, 32.5, 0.55, 0.42), (120, 60, 40), 180)
    p.solid(p.ell(33.1, 32.5, 0.55, 0.42), (120, 60, 40), 180)
    p.soft(p.ell(31.3, 30.4, 0.8, 0.55), (255, 255, 255), 150, 0.2)

    # open, happy mouth
    mouth = p.poly([(27.4, 35.3), (36.6, 35.3)] + ellipse_pts(32, 35.3, 4.6, 4.5, 0, 40, 0, 180))
    p.outline(mouth, 0.7)
    p.rad(mouth, (110, 28, 28), (58, 10, 10), (32, 37), 4.6)
    p.solid(p.clip(p.poly([(27, 35), (37, 35), (36.6, 36.6), (27.4, 36.6)]), mouth), (255, 252, 246))
    tongue = p.clip(p.ell(32.6, 38.9, 2.9, 1.8), mouth)
    p.rad(tongue, (250, 136, 130), (206, 80, 84), (32.2, 38.4), 3)

    # bushy mustache with curled tips
    for s in (-1, 1):
        top = bez((32, 33.5), (32 + s * 4, 32.1), (32 + s * 9, 32.7), (32 + s * 11.6, 34.7))
        curl = bez((32 + s * 11.6, 34.7), (32 + s * 13.9, 36.5), (32 + s * 13.5, 33.3), (32 + s * 11.9, 33.0), 16)
        low = bez((32 + s * 12.4, 36.3), (32 + s * 8.8, 38.2), (32 + s * 4, 37.8), (32, 36.3))
        lobe = p.union(p.poly(top + curl[1:] + [(32 + s * 12.7, 36.4)] + low), p.line(curl, 1.2))
        p.shape(lobe, None, 0.6, lin=((64, 50, 58), (16, 11, 14), (32 + s * 4, 32.4), (32 + s * 6, 38)))
        for i in range(12):
            x = 32 + s * (1.2 + i * 0.85)
            hair = [(x, 33.4 + (i % 3) * 0.3), (x + s * 1.3, 36.6 + (i % 2) * 0.5)]
            p.solid(p.clip(p.line(hair, 0.28), lobe), (96, 82, 92), 150)

    # ---------- counter ----------
    top = p.poly([(-4, 53.6), (68, 53.6), (68, 57.8), (-4, 57.8)])
    p.lin(top, WOOD_HI, WOOD, (32, 53.6), (32, 57.8))
    for i in range(6):
        y = 54.2 + i * 0.62
        grain = [(x, y + math.sin(x * 0.35 + i) * 0.12) for x in range(-2, 67)]
        p.solid(p.clip(p.line(grain, 0.14), top), WOOD_LO, 70)
    front = p.poly([(-4, 57.8), (68, 57.8), (68, 70), (-4, 70)])
    p.lin(front, WOOD_FRONT, WOOD_FRONT_LO, (32, 57.8), (32, 64))
    p.solid(p.line([(-4, 53.6), (68, 53.6)], 0.5), (232, 176, 118))
    p.solid(p.line([(-4, 57.8), (68, 57.8)], 0.45), (60, 32, 14), 200)

    # ---------- the bowl, tipped and spilling ----------
    bx, by, tilt = 28.6, 47.6, -12
    lip = rot([(bx - 14, by)], bx, by, tilt)[0]
    p.soft(p.ell(bx + 2, 56.0, 12.5, 1.5), (40, 18, 6), 130, 0.7)      # bowl shadow
    puddle = p.ell(lip[0] - 1.3, 56.1, 8.8, 1.9)
    p.shape(puddle, None, 0.55, lin=(BROTH_HI, BROTH_LO, (lip[0] - 8, 55), (lip[0] + 6, 57.5)))
    p.solid(p.clip(p.line([(lip[0] - 7 + i * 0.55, 56.2 + math.sin(i * 1.3) * 0.45) for i in range(12)], 0.55), puddle), NOODLE_HI)
    p.soft(p.ell(lip[0] - 3, 55.6, 3.6, 0.45), (255, 255, 255), 170, 0.15)

    def R(pts):
        return rot(pts, bx, by, tilt)

    shell = p.poly(R(ellipse_pts(bx, by, 14.2, 9.4, 0, 60, 0, 180)))
    p.shape(shell, None, 0.95, lin=(BOWL_HI, BOWL_LO, R([(bx - 10, by)])[0], R([(bx + 8, by + 9)])[0]))
    p.solid(p.clip(p.line(R(ellipse_pts(bx, by + 1.6, 13.2, 6.6, 0, 40, 12, 168)), 0.7), shell), CREAM, 230)
    p.solid(p.poly(R(ellipse_pts(bx, by + 8.9, 5.2, 1.1))), BOWL_LO)
    p.soft(p.clip(p.poly(R(ellipse_pts(bx - 7.6, by + 4.2, 1.6, 4.0, -35))), shell), (255, 255, 255), 150, 0.35)
    p.soft(p.clip(p.ell(*R([(bx + 8.5, by + 5.2)])[0], 0.9, 0.6), shell), (255, 255, 255), 140, 0.15)
    rim = p.poly(R(ellipse_pts(bx, by, 14.3, 3.7)))
    p.shape(rim, CREAM, 0.8)
    p.solid(p.poly(R(ellipse_pts(bx, by + 0.2, 13.3, 3.0))), (232, 220, 206))
    broth = p.poly(R(ellipse_pts(bx, by + 0.35, 12.5, 2.6)))
    p.rad(broth, BROTH_HI, BROTH_LO, R([(bx + 1, by)])[0], 12)
    for _ in range(14):
        ox, oy = rnd.uniform(-10, 10), rnd.uniform(-1.6, 1.6)
        p.solid(p.clip(p.ell(*R([(bx + ox, by + 0.35 + oy)])[0], rnd.uniform(0.2, 0.42), rnd.uniform(0.14, 0.26), tilt), broth), (255, 234, 170), 200)
    # toppings: nori, chashu, fishcake, egg, green onion
    nori = p.poly(R([(bx - 8.4, by - 0.4), (bx - 7.8, by - 7.4), (bx - 3.4, by - 7.8), (bx - 4.0, by - 0.8)]))
    p.shape(nori, None, 0.6, lin=((42, 72, 52), (14, 30, 22), R([(bx - 8, by - 7)])[0], R([(bx - 4, by)])[0]))
    for i in range(3):
        p.solid(p.clip(p.line(R([(bx - 8 + i * 1.4, by - 1.2), (bx - 7.2 + i * 1.4, by - 7)]), 0.18), nori), (70, 110, 80), 110)
    chashu = p.poly(R(ellipse_pts(bx - 2.6, by + 0.9, 2.5, 1.15)))
    p.shape(chashu, None, 0.4, rad=((214, 150, 100), (140, 74, 38), R([(bx - 2.9, by + 0.7)])[0], 2.6))
    p.solid(p.line(R(ellipse_pts(bx - 2.6, by + 0.9, 2.1, 0.8, 0, 30, 200, 340)), 0.25), (246, 214, 180), 200)
    naruto = p.poly(R(ellipse_pts(bx + 1.8, by + 1.2, 1.9, 0.95)))
    p.shape(naruto, (255, 252, 250), 0.35)
    p.solid(p.line(R(ellipse_pts(bx + 1.8, by + 1.2, 1.0, 0.45, 0, 20, 0, 300)), 0.3), (232, 86, 130))
    egg = p.poly(R(ellipse_pts(bx + 5.8, by - 0.3, 2.7, 1.35)))
    p.shape(egg, (255, 252, 244), 0.4)
    yolk = p.poly(R(ellipse_pts(bx + 5.9, by - 0.4, 1.5, 0.8)))
    p.rad(yolk, (255, 190, 60), (224, 110, 14), R([(bx + 5.7, by - 0.6)])[0], 1.6)
    p.solid(p.ell(*R([(bx + 5.5, by - 0.7)])[0], 0.35, 0.18, tilt), (255, 240, 200), 220)
    for ox, oy in ((-5.6, 1.3), (-0.4, -0.9), (3.6, 1.6), (8.8, 0.9), (-7.4, 0.4), (0.6, 1.9)):
        c = R([(bx + ox, by + 0.3 + oy)])[0]
        p.solid(p.ell(c[0], c[1], 0.5, 0.36, tilt), (92, 170, 70))
        p.solid(p.ell(c[0], c[1], 0.22, 0.16, tilt), (190, 230, 150))
    # the pour off the low lip
    stream = p.poly(bez(lip, (lip[0] - 1.3, lip[1] + 1.6), (lip[0] - 1.8, lip[1] + 3.2), (lip[0] - 1.1, 55.6), 16) +
                    bez((lip[0] + 0.3, 55.6), (lip[0] + 0.2, lip[1] + 3.2), (lip[0] + 0.6, lip[1] + 1.5), (lip[0] + 1.8, lip[1] + 0.3), 16))
    p.shape(stream, None, 0.5, lin=(BROTH_HI, BROTH_LO, (lip[0] - 2, lip[1]), (lip[0] + 1, 55)))
    p.soft(p.line(bez((lip[0] - 0.2, lip[1] + 0.8), (lip[0] - 0.8, lip[1] + 2.4), (lip[0] - 0.9, lip[1] + 3.6), (lip[0] - 0.5, 54.8), 12), 0.3), (255, 250, 220), 200, 0.08)
    for (x, y, r) in ((lip[0] - 4.8, 52.6, 0.55), (lip[0] - 6.6, 54.4, 0.42), (lip[0] + 5.8, 55.0, 0.4)):
        d = p.ell(x, y, r, r * 1.15)
        p.shape(d, None, 0.35, rad=(BROTH_HI, BROTH_LO, (x - r * 0.3, y - r * 0.3), r * 1.4))

    # ---------- noodles lifted by the chopsticks ----------
    for i, (sx, sy) in enumerate(((34.6, 47.2), (35.6, 47.5), (36.6, 47.3), (37.4, 47.6))):
        strand = bez((sx, sy), (sx + 0.4, 45.6 - i * 0.2), (38.6 + i * 0.3, 46.4), (39.4 + i * 0.35, 44.4 + i * 0.3), 20)
        p.solid(p.line(strand, 0.95), NOODLE_LO)
        p.solid(p.line(strand, 0.6), NOODLE_HI)
    p.shape(p.ell(36.3, 49.0, 0.32, 0.42), None, 0.25, rad=(BROTH_HI, BROTH_LO, (36.2, 48.9), 0.5))

    # ---------- hand and chopsticks ----------
    for a, b in (((59.0, 31.4), (38.6, 43.6)), ((59.6, 35.0), (39.8, 45.8))):
        p.solid(p.line([a, b], 1.55), INK)
        p.solid(p.line([a, b], 1.0), (216, 164, 100))
        p.solid(p.line([(a[0], a[1] - 0.25), (b[0] + 1.5, b[1] - 0.4)], 0.3), (246, 212, 160), 220)
    palm = p.ell(51.4, 39.4, 4.3, 3.9)
    p.shape(palm, None, 0.8, rad=(SKIN_HI, SKIN_LO, (50.4, 38.4), 5))
    for (x, y, rx, ry) in ((47.8, 40.6, 1.7, 1.5), (48.6, 42.5, 1.7, 1.5), (50.1, 43.9, 1.6, 1.4), (52.0, 44.5, 1.5, 1.3)):
        f = p.ell(x, y, rx, ry)
        p.shape(f, None, 0.7, rad=(SKIN, SKIN_LO, (x - 0.4, y - 0.5), 2))
    thumb = p.ell(49.5, 37.7, 2.7, 1.35, -38)
    p.shape(thumb, None, 0.7, rad=(SKIN_HI, SKIN, (49, 37.2), 3))
    p.solid(p.line(bez((50.6, 36.9), (51.4, 36.6), (52.2, 36.9), (52.8, 37.5), 8), 0.35), SKIN_LO, 200)


def make(rounded=True, k=1.0, dx=0.0, dy=0.0):
    img = background(rounded)
    mascot(img, k, dx, dy)
    if rounded:
        mask = Image.new("L", (N, N), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, N - 1, N - 1], radius=15 * S, fill=255)
        img.putalpha(mask)
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    tile = make(True, 0.97, 0, 0.8)
    full = make(False, 0.8, 0, 1.4)        # maskable: art kept inside the safe zone
    for size in (512, 192):
        tile.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-{size}.png"))
        full.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"icon-maskable-{size}.png"))
    tile.resize((128, 128), Image.LANCZOS).save(os.path.join(OUT, "logo-128.png"))
    if len(sys.argv) > 1:
        sheet = Image.new("RGBA", (1480, 560), (238, 234, 240, 255))
        big = tile.resize((512, 512), Image.LANCZOS)
        sheet.paste(big, (20, 24), big)
        x = 560
        for sz in (192, 96, 48):
            im = tile.resize((sz, sz), Image.LANCZOS)
            sheet.paste(im, (x, 24), im)
            x += sz + 24
        m = full.resize((192, 192), Image.LANCZOS)
        circle = Image.new("L", (192, 192), 0)
        ImageDraw.Draw(circle).ellipse([0, 0, 191, 191], fill=255)
        sheet.paste(m, (560, 300), circle)
        dark = Image.new("RGBA", (420, 240), (20, 13, 25, 255))
        for i, sz in enumerate((144, 72)):
            im = tile.resize((sz, sz), Image.LANCZOS)
            dark.paste(im, (30 + i * 180, 40), im)
        sheet.paste(dark, (800, 300))
        sheet.save(sys.argv[1])
    print("mascot icons written")
