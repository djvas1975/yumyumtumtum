"""Cartoon-Dave app icons for yumyumtumtum.

Draws the mascot as SVG and renders it with the headless Chromium that Playwright provides.

    python3 tools/make_dave_icons.py preview OUTDIR      # all four options + a comparison sheet
    python3 tools/make_dave_icons.py install NAME         # write NAME's icons into icons/ (slurp, bigbowl, foodcoma, spicy)
"""
import math, os, sys

W = 1024
OUT = '#3A2418'
SKIN, SKIN_HI, SKIN_LO, SKIN_DEEP = '#E2A47C', '#F5CBA7', '#C4845D', '#A2623F'
BLUSH = '#EE7E6A'
HAIR, HAIR_HI = '#27221F', '#4C4540'
GRAY, GRAY_HI = '#8C8680', '#BDB8B2'
BEARD, BEARD_LO, BEARD_DK = '#DEDBD7', '#A8A29C', '#5F5853'
FRAME, RIVET = '#141110', '#D8DCE2'
SHIRT, SHIRT_HI, SHIRT_LO = '#252839', '#3A3F5A', '#161827'
BOWL, BOWL_HI, BOWL_LO, BOWL_IN = '#C8322A', '#E65A4B', '#861C18', '#F6EAD6'
BROTH, BROTH_LO = '#EDAA52', '#C9782F'
SPICY, SPICY_LO = '#E2502D', '#A92A17'
NOODLE, NOODLE_LO = '#F7DC8D', '#D6AE58'
WOOD, WOOD_HI, WOOD_LO = '#B7713F', '#D9955E', '#87502C'
STICK, STICK_LO = '#D9A15E', '#9A6632'


def defs(theme):
    bg1, bg2, bg3 = theme
    return f'''
<defs>
  <radialGradient id="bg" cx="38%" cy="30%" r="85%">
    <stop offset="0" stop-color="{bg1}"/><stop offset=".55" stop-color="{bg2}"/><stop offset="1" stop-color="{bg3}"/>
  </radialGradient>
  <radialGradient id="face" cx="44%" cy="36%" r="70%">
    <stop offset="0" stop-color="{SKIN_HI}"/><stop offset=".5" stop-color="{SKIN}"/><stop offset="1" stop-color="{SKIN_LO}"/>
  </radialGradient>
  <radialGradient id="skinball" cx="40%" cy="35%" r="70%">
    <stop offset="0" stop-color="{SKIN_HI}"/><stop offset=".6" stop-color="{SKIN}"/><stop offset="1" stop-color="{SKIN_LO}"/>
  </radialGradient>
  <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3A3430"/><stop offset=".5" stop-color="{HAIR}"/><stop offset="1" stop-color="#151210"/>
  </linearGradient>
  <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{SHIRT_HI}"/><stop offset=".45" stop-color="{SHIRT}"/><stop offset="1" stop-color="{SHIRT_LO}"/>
  </linearGradient>
  <radialGradient id="belly" cx="42%" cy="30%" r="75%">
    <stop offset="0" stop-color="{SHIRT_HI}"/><stop offset=".7" stop-color="{SHIRT}"/><stop offset="1" stop-color="{SHIRT_LO}"/>
  </radialGradient>
  <linearGradient id="bowl" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{BOWL_LO}"/><stop offset=".3" stop-color="{BOWL_HI}"/><stop offset=".55" stop-color="{BOWL}"/><stop offset="1" stop-color="{BOWL_LO}"/>
  </linearGradient>
  <radialGradient id="broth" cx="45%" cy="40%" r="70%">
    <stop offset="0" stop-color="#F8C878"/><stop offset=".6" stop-color="{BROTH}"/><stop offset="1" stop-color="{BROTH_LO}"/>
  </radialGradient>
  <radialGradient id="spicy" cx="45%" cy="40%" r="70%">
    <stop offset="0" stop-color="#F58A5A"/><stop offset=".6" stop-color="{SPICY}"/><stop offset="1" stop-color="{SPICY_LO}"/>
  </radialGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{WOOD_HI}"/><stop offset=".12" stop-color="{WOOD}"/><stop offset="1" stop-color="{WOOD_LO}"/>
  </linearGradient>
  <linearGradient id="stick" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#EDBE7E"/><stop offset="1" stop-color="{STICK_LO}"/>
  </linearGradient>
  <linearGradient id="beard" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B5AFA9"/><stop offset=".3" stop-color="{BEARD}"/><stop offset="1" stop-color="#E8E5E2"/>
  </linearGradient>
  <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#EEF3F6" stop-opacity=".8"/>
  </linearGradient>
  <radialGradient id="flush" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FF3B2A" stop-opacity=".55"/><stop offset="1" stop-color="#FF3B2A" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="blush" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="{BLUSH}" stop-opacity=".75"/><stop offset="1" stop-color="{BLUSH}" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="soft4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="fuzz" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#5A1206" flood-opacity=".35"/></filter>
  <clipPath id="tile"><rect width="{W}" height="{W}" rx="0"/></clipPath>
</defs>'''


def background(rays=True):
    s = f'<rect width="{W}" height="{W}" fill="url(#bg)"/>'
    if rays:
        cx, cy = 512, 430
        parts = []
        for i in range(18):
            a0 = math.radians(i * 20 - 4)
            a1 = math.radians(i * 20 + 6)
            r = 1100
            parts.append(f'M{cx},{cy} L{cx + r * math.cos(a0):.0f},{cy + r * math.sin(a0):.0f} L{cx + r * math.cos(a1):.0f},{cy + r * math.sin(a1):.0f}Z')
        s += f'<path d="{" ".join(parts)}" fill="#FFFFFF" opacity=".09"/>'
    # a soft glow behind the head
    s += '<circle cx="512" cy="420" r="330" fill="#FFE2B8" opacity=".22" filter="url(#soft)"/>'
    return s


def counter():
    grain = ''.join(f'<path d="M{x0},{y} C{x0 + 120},{y - 6} {x0 + 260},{y + 8} {x0 + 420},{y}" stroke="{WOOD_LO}" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>'
                    for x0, y in ((40, 930), (520, 950), (200, 985), (660, 1005), (-60, 1010)))
    return (f'<rect x="-10" y="872" width="{W + 20}" height="170" fill="url(#wood)" stroke="{OUT}" stroke-width="8"/>'
            f'<rect x="-10" y="872" width="{W + 20}" height="18" fill="{WOOD_HI}" opacity=".7"/>' + grain)


def body(belly=1.0, bib=False):
    """Shoulders and a round belly resting on the counter."""
    s = (f'<path d="M40,1040 C56,900 120,812 246,780 C322,762 392,756 436,754 C470,790 554,790 588,754 '
         f'C632,756 702,762 778,780 C904,812 968,900 984,1040Z" fill="url(#shirt)" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>')
    # sleeve seams
    s += f'<path d="M232,812 C212,850 196,900 190,960" stroke="{SHIRT_LO}" stroke-width="6" fill="none" opacity=".7"/>'
    s += f'<path d="M792,812 C812,850 828,900 834,960" stroke="{SHIRT_LO}" stroke-width="6" fill="none" opacity=".7"/>'
    # collar
    s += f'<path d="M436,758 C468,806 556,806 588,758" stroke="{SHIRT_HI}" stroke-width="16" fill="none" stroke-linecap="round"/>'
    s += f'<path d="M436,758 C468,806 556,806 588,758" stroke="{OUT}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>'
    if bib:
        s += bib_napkin()
    return s


def belly_on_counter(belly=1.0):
    # the belly, squished on the counter edge
    rx, ry = 270 * belly, 92 * belly
    s = ''
    s += (f'<path d="M{512 - rx:.0f},884 C{512 - rx:.0f},{884 - ry * 1.3:.0f} {512 - rx * .45:.0f},{884 - ry * 1.75:.0f} 512,{884 - ry * 1.75:.0f} '
          f'C{512 + rx * .45:.0f},{884 - ry * 1.75:.0f} {512 + rx:.0f},{884 - ry * 1.3:.0f} {512 + rx:.0f},884 '
          f'C{512 + rx * .7:.0f},{884 + ry * .42:.0f} {512 - rx * .7:.0f},{884 + ry * .42:.0f} {512 - rx:.0f},884Z" fill="url(#belly)" stroke="{OUT}" stroke-width="8"/>')
    s += f'<path d="M{512 - rx * .55:.0f},{884 - ry * 1.2:.0f} C{512 - rx * .3:.0f},{884 - ry * 1.55:.0f} {512 + rx * .05:.0f},{884 - ry * 1.62:.0f} {512 + rx * .25:.0f},{884 - ry * 1.55:.0f}" stroke="{SHIRT_HI}" stroke-width="14" fill="none" stroke-linecap="round" opacity=".7"/>'
    return s


def bib_napkin():
    # white napkin with red checks tucked into the collar
    d = 'M430,772 C470,812 554,812 594,772 L652,900 C570,936 454,936 372,900Z'
    checks = ''.join(f'<rect x="{x}" y="{y}" width="26" height="26" fill="#E0463B" opacity=".55"/>'
                     for y in range(772, 940, 52) for x in range(360 + (0 if (y // 52) % 2 else 26), 670, 52))
    return (f'<clipPath id="napclip"><path d="{d}"/></clipPath>'
            f'<path d="{d}" fill="#FFFDF8" stroke="{OUT}" stroke-width="7" stroke-linejoin="round"/>'
            f'<g clip-path="url(#napclip)">{checks}'
            f'<ellipse cx="560" cy="860" rx="30" ry="18" fill="{BROTH}" opacity=".8"/><ellipse cx="470" cy="900" rx="18" ry="11" fill="{BROTH}" opacity=".75"/>'
            f'<circle cx="510" cy="832" r="8" fill="{BROTH_LO}" opacity=".8"/></g>'
            f'<path d="M430,772 C470,812 554,812 594,772" stroke="{OUT}" stroke-width="7" fill="none"/>'
            # the knot at the neck
            f'<path d="M488,776 L512,800 L536,776 L520,768 L512,778 L504,768Z" fill="#FFFDF8" stroke="{OUT}" stroke-width="6" stroke-linejoin="round"/>')


def ear(cx, flip):
    s = f'<ellipse cx="{cx}" cy="492" rx="44" ry="64" fill="url(#skinball)" stroke="{OUT}" stroke-width="8"/>'
    d = f'M{cx + 16 * flip},460 C{cx - 14 * flip},466 {cx - 18 * flip},508 {cx + 8 * flip},526'
    s += f'<path d="{d}" stroke="{SKIN_DEEP}" stroke-width="7" fill="none" stroke-linecap="round"/>'
    return s


FACE = ('M512,212 C630,212 714,266 738,368 C758,452 772,546 748,618 C718,700 624,746 512,748 '
        'C400,746 306,700 276,618 C252,546 266,452 286,368 C310,266 394,212 512,212Z')


def hair():
    # slicked straight back with some height on top, receding at the temples, gray on the sides
    cap = ('M272,456 C250,324 306,196 414,160 C476,140 548,140 610,160 C718,196 774,324 752,456 '
           'L732,456 C736,394 726,340 704,302 C688,274 668,252 640,236 '
           'C622,252 596,262 562,264 C534,266 490,266 462,264 C428,262 402,252 384,236 '
           'C356,252 336,274 320,302 C298,340 288,394 292,456Z')
    s = f'<clipPath id="hairclip"><path d="{cap}"/></clipPath>'
    s += f'<path d="{cap}" fill="url(#hair)" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>'
    s += '<g clip-path="url(#hairclip)">'
    for x, f in ((272, 1), (752, -1)):
        s += f'<path d="M{x - 10 * f},300 C{x + 34 * f},318 {x + 46 * f},390 {x + 30 * f},470 L{x - 24 * f},470 Z" fill="{GRAY}"/>'
        for k in range(4):
            s += f'<path d="M{x + (10 + k * 7) * f},{454 - k * 6} C{x + (16 + k * 8) * f},{400 - k * 10} {x + (20 + k * 6) * f},{350 - k * 8} {x + (42 + k * 12) * f},{304 - k * 10}" stroke="{GRAY_HI}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/>'
    # a few combed-back strands and the shine of the slick
    for x0 in (420, 470, 540, 604):
        s += f'<path d="M{x0},260 C{x0 + (x0 - 512) * .1:.0f},226 {512 + (x0 - 512) * 1.0:.0f},184 {512 + (x0 - 512) * .85:.0f},150" stroke="{HAIR_HI}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>'
    s += f'<path d="M430,214 C470,190 560,188 604,208" stroke="#FFFFFF" stroke-width="14" fill="none" stroke-linecap="round" opacity=".22"/>'
    s += f'<path d="M456,236 C486,226 540,226 572,234" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity=".18"/>'
    s += '</g>'
    return s


def brows(style):
    L = {'calm': 'M352,404 C378,388 432,380 476,392', 'up': 'M352,386 C378,366 432,360 476,374',
         'cocky': 'M352,404 C378,388 432,380 476,392', 'soft': 'M356,410 C384,398 432,394 474,402',
         'worried': 'M352,392 C382,390 432,392 476,404'}
    R = {'calm': 'M548,392 C592,380 646,388 672,404', 'up': 'M548,374 C592,360 646,366 672,386',
         'cocky': 'M548,370 C590,346 640,350 672,372', 'soft': 'M550,402 C592,394 640,398 668,410',
         'worried': 'M548,404 C592,392 642,390 672,392'}
    s = ''
    for d in (L[style], R[style]):
        s += f'<path d="{d}" stroke="{HAIR}" stroke-width="27" fill="none" stroke-linecap="round"/>'
        s += f'<path d="{d}" stroke="{HAIR_HI}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".55" transform="translate(0,-5)"/>'
    return s


def eye(cx, cy, kind, flip=1):
    if kind == 'happy':
        return (f'<path d="M{cx - 30},{cy + 10} C{cx - 16},{cy - 16} {cx + 16},{cy - 16} {cx + 30},{cy + 10}" stroke="{OUT}" stroke-width="10" fill="none" stroke-linecap="round"/>'
                f'<path d="M{cx - 22},{cy + 28} C{cx - 8},{cy + 34} {cx + 8},{cy + 34} {cx + 22},{cy + 28}" stroke="{SKIN_DEEP}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>')
    if kind == 'sleepy':
        return (f'<path d="M{cx - 32},{cy} C{cx - 14},{cy + 26} {cx + 14},{cy + 26} {cx + 32},{cy} Z" fill="#FFFFFF" stroke="{OUT}" stroke-width="5"/>'
                f'<circle cx="{cx + 2}" cy="{cy + 10}" r="12" fill="#4A2C1C"/><circle cx="{cx + 2}" cy="{cy + 10}" r="6" fill="#140B07"/>'
                f'<path d="M{cx - 36},{cy} L{cx + 36},{cy}" stroke="{OUT}" stroke-width="10" stroke-linecap="round"/>'
                f'<path d="M{cx - 32},{cy - 4} C{cx - 14},{cy - 22} {cx + 14},{cy - 22} {cx + 32},{cy - 4}Z" fill="{SKIN}"/>')
    r = 21 if kind == 'wide' else 18
    s = (f'<ellipse cx="{cx}" cy="{cy}" rx="32" ry="{26 if kind == "wide" else 22}" fill="#FFFFFF" stroke="{OUT}" stroke-width="5"/>'
         f'<circle cx="{cx + 3 * flip}" cy="{cy + 2}" r="{r}" fill="#5A3420"/><circle cx="{cx + 3 * flip}" cy="{cy + 2}" r="{r * .55:.0f}" fill="#140B07"/>'
         f'<circle cx="{cx + 10 * flip}" cy="{cy - 6}" r="6" fill="#FFFFFF"/><circle cx="{cx - 4 * flip}" cy="{cy + 9}" r="3" fill="#FFFFFF" opacity=".8"/>')
    # heavy upper lid
    s += f'<path d="M{cx - 34},{cy - 4} C{cx - 18},{cy - (30 if kind == "wide" else 24)} {cx + 18},{cy - (30 if kind == "wide" else 24)} {cx + 34},{cy - 4}" stroke="{OUT}" stroke-width="9" fill="none" stroke-linecap="round"/>'
    if kind == 'wide':  # sparkle
        s += f'<path d="M{cx + 10 * flip},{cy - 14} l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3z" fill="#FFFFFF"/>'
    return s


def glasses(fog=False, tilt_glare=True):
    s = ''
    for x in (338, 534):
        if fog:
            s += f'<rect x="{x}" y="410" width="152" height="102" rx="20" fill="url(#fog)"/>'
            s += ''.join(f'<circle cx="{x + cx}" cy="{410 + cy}" r="{r}" fill="#FFFFFF" opacity=".9"/>' for cx, cy, r in ((34, 30, 12), (60, 58, 9), (112, 40, 14), (94, 76, 8), (128, 82, 6)))
        else:
            s += f'<rect x="{x}" y="410" width="152" height="102" rx="20" fill="#DDF0FF" opacity=".16"/>'
            if tilt_glare:
                s += f'<path d="M{x + 22},{420} L{x + 58},{420} L{x + 18},{500} L{x + 8},{488}Z" fill="#FFFFFF" opacity=".38"/>'
                s += f'<path d="M{x + 72},{420} L{x + 84},{420} L{x + 44},{502} L{x + 32},{502}Z" fill="#FFFFFF" opacity=".25"/>'
        s += f'<rect x="{x}" y="410" width="152" height="102" rx="20" fill="none" stroke="{FRAME}" stroke-width="18"/>'
        s += f'<path d="M{x + 12},{404} L{x + 140},{404}" stroke="{FRAME}" stroke-width="8" stroke-linecap="round"/>'
    s += f'<path d="M490,440 C504,430 520,430 534,440" stroke="{FRAME}" stroke-width="14" fill="none" stroke-linecap="round"/>'
    s += f'<path d="M338,428 L302,446" stroke="{FRAME}" stroke-width="13" stroke-linecap="round"/><path d="M686,428 L722,446" stroke="{FRAME}" stroke-width="13" stroke-linecap="round"/>'
    for x in (350, 674):
        s += f'<circle cx="{x}" cy="424" r="6" fill="{RIVET}" stroke="#6E7580" stroke-width="2"/>'
    return s


def nose():
    return (f'<path d="M494,470 C490,500 478,520 474,540" stroke="{SKIN_LO}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/>'
            f'<ellipse cx="512" cy="552" rx="48" ry="36" fill="url(#skinball)"/>'
            f'<path d="M470,548 C458,566 470,588 492,586 C500,594 524,594 532,586 C554,588 566,566 554,548" stroke="{OUT}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<ellipse cx="494" cy="578" rx="9" ry="6" fill="{SKIN_DEEP}"/><ellipse cx="530" cy="578" rx="9" ry="6" fill="{SKIN_DEEP}"/>'
            f'<ellipse cx="500" cy="538" rx="14" ry="9" fill="#FFFFFF" opacity=".45"/>')


def goatee(top=640, bottom=758, width=1.0):
    w = width * .82
    d = (f'M{512 - 44 * w:.0f},{top} C{512 - 64 * w:.0f},{top + 10} {512 - 84 * w:.0f},{top + 26} {512 - 92 * w:.0f},{top + 46} '
         f'C{512 - 100 * w:.0f},{bottom - 44} {512 - 64 * w:.0f},{bottom} 512,{bottom} C{512 + 64 * w:.0f},{bottom} {512 + 100 * w:.0f},{bottom - 44} {512 + 92 * w:.0f},{top + 46} '
         f'C{512 + 84 * w:.0f},{top + 26} {512 + 64 * w:.0f},{top + 10} {512 + 44 * w:.0f},{top} C{512 + 22 * w:.0f},{top + 10} {512 - 22 * w:.0f},{top + 10} {512 - 44 * w:.0f},{top}Z')
    s = f'<clipPath id="beardclip"><path d="{d}"/></clipPath>'
    s += f'<g filter="url(#fuzz)"><path d="{d}" fill="#8E8882" transform="translate(0,3)"/><path d="{d}" fill="url(#beard)"/></g>'
    import random
    rnd = random.Random(7)
    s += '<g clip-path="url(#beardclip)">'
    s += f'<path d="M{512 - 20 * w:.0f},{top + 30} C{512 - 18 * w:.0f},{bottom - 30} {512 + 18 * w:.0f},{bottom - 30} {512 + 20 * w:.0f},{top + 30}Z" fill="{BEARD_DK}" opacity=".45" filter="url(#soft4)"/>'
    for i in range(44):
        x = 512 + rnd.uniform(-90, 90) * w
        y = rnd.uniform(top + 10, bottom - 8)
        c = BEARD_DK if abs(x - 512) < 24 * w and rnd.random() < .7 else rnd.choice((BEARD_LO, '#FFFFFF', '#FFFFFF', '#9C968F'))
        s += f'<path d="M{x:.0f},{y:.0f} l{(x - 512) * .04:.1f},{rnd.uniform(10, 16):.0f}" stroke="{c}" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>'
    s += '</g>'
    return s


def mouth(kind):
    """Returns (svg, beard_top)."""
    if kind == 'o':
        return (f'<ellipse cx="512" cy="618" rx="36" ry="30" fill="#C9665A" stroke="{OUT}" stroke-width="8"/>'
                f'<ellipse cx="512" cy="620" rx="18" ry="15" fill="#4A0F0F"/><path d="M494,600 C504,596 520,596 530,600" stroke="#F09A8E" stroke-width="5" fill="none" stroke-linecap="round"/>', 652)
    if kind == 'grin':
        return (f'<path d="M436,600 C472,608 552,608 588,600 C584,656 546,680 512,680 C478,680 440,656 436,600Z" fill="#5A1212" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>'
                f'<path d="M448,608 C482,616 542,616 576,608 L570,630 C538,636 486,636 454,630Z" fill="#FFFFFF"/>'
                f'<path d="M474,664 C490,646 534,646 550,664 C536,676 488,676 474,664Z" fill="#E8665E"/>'
                f'<path d="M424,592 C430,598 436,600 442,598" stroke="{OUT}" stroke-width="7" fill="none" stroke-linecap="round"/>'
                f'<path d="M582,598 C588,600 594,598 600,592" stroke="{OUT}" stroke-width="7" fill="none" stroke-linecap="round"/>', 684)
    if kind == 'content':
        return (f'<path d="M458,610 C482,636 548,640 572,600" stroke="{OUT}" stroke-width="9" fill="none" stroke-linecap="round"/>'
                f'<path d="M566,592 C574,598 578,604 578,610" stroke="{OUT}" stroke-width="7" fill="none" stroke-linecap="round"/>'
                f'<path d="M486,636 C500,644 522,644 536,636" stroke="{SKIN_DEEP}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>', 648)
    if kind == 'pant':
        return (f'<ellipse cx="512" cy="626" rx="46" ry="40" fill="#5A1212" stroke="{OUT}" stroke-width="8"/>'
                f'<path d="M478,600 C496,592 528,592 546,600 L540,610 C524,604 500,604 484,610Z" fill="#FFFFFF"/>', 664)
    return '', 640


def tongue_out():
    return (f'<path d="M482,640 C480,690 492,716 512,718 C532,716 544,690 542,640Z" fill="#EC5F5A" stroke="{OUT}" stroke-width="7" stroke-linejoin="round"/>'
            f'<path d="M512,654 L512,698" stroke="#B83A38" stroke-width="5" stroke-linecap="round"/>')


def head(expr):
    """expr: eyes, brows, mouth, blush, fog, flush, cheeks"""
    s = ''
    # neck and double chin
    s += f'<path d="M366,690 C380,800 644,800 658,690Z" fill="url(#skinball)" stroke="{OUT}" stroke-width="8" stroke-linejoin="round"/>'
    s += f'<path d="M420,770 C470,786 554,786 604,770" stroke="{SKIN_LO}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>'
    s += ear(280, 1) + ear(744, -1)
    face = FACE
    s += f'<path d="{face}" fill="url(#face)" stroke="{OUT}" stroke-width="9" stroke-linejoin="round"/>'
    # jowl shading and forehead shine, kept inside the face
    s += f'<clipPath id="faceclip"><path d="{face}"/></clipPath><g clip-path="url(#faceclip)">'
    s += f'<path d="M262,580 C320,720 704,720 762,580 L780,780 L244,780Z" fill="{SKIN_LO}" opacity=".45" filter="url(#soft)"/>'
    s += f'<ellipse cx="470" cy="300" rx="90" ry="36" fill="#FFFFFF" opacity=".28" filter="url(#soft4)"/>'
    if expr.get('flush'):
        s += '<ellipse cx="512" cy="330" rx="230" ry="130" fill="url(#flush)"/>'
        s += '<ellipse cx="380" cy="580" rx="110" ry="80" fill="url(#flush)"/><ellipse cx="644" cy="580" rx="110" ry="80" fill="url(#flush)"/>'
    s += '</g>'
    bl = expr.get('blush', 1.0)
    s += f'<ellipse cx="360" cy="584" rx="{66 * bl:.0f}" ry="{42 * bl:.0f}" fill="url(#blush)"/><ellipse cx="664" cy="584" rx="{66 * bl:.0f}" ry="{42 * bl:.0f}" fill="url(#blush)"/>'
    # smile folds from nose to mouth corners
    if expr.get('folds', True):
        s += f'<path d="M440,566 C422,596 424,626 440,648" stroke="{SKIN_LO}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".75"/>'
        s += f'<path d="M584,566 C602,596 600,626 584,648" stroke="{SKIN_LO}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".75"/>'
    s += hair()
    m, beard_top = mouth(expr['mouth'])
    s += goatee(top=beard_top, bottom=max(760, beard_top + 100), width=1.0 if beard_top < 680 else 1.06)
    s += m
    s += nose()
    if not expr.get('fog'):
        s += eye(414, 462, expr['eyes'], 1) + eye(610, 462, expr['eyes'], 1)
    s += brows(expr['brows'])
    s += glasses(fog=expr.get('fog', False))
    return s


# ---------------- props ----------------
def bowl(cx=512, rim=806, rx=206, ry=52, depth=128, broth='broth', toppings=True, noodles_up=False, chili=False):
    base_y = rim + depth
    body = (f'M{cx - rx},{rim} C{cx - rx + 6},{rim + depth * .7} {cx - rx * .55},{base_y} {cx},{base_y} '
            f'C{cx + rx * .55},{base_y} {cx + rx - 6},{rim + depth * .7} {cx + rx},{rim}Z')
    s = f'<ellipse cx="{cx}" cy="{base_y - 2}" rx="{rx * .48:.0f}" ry="16" fill="{BOWL_LO}" stroke="{OUT}" stroke-width="7"/>'
    s += f'<path d="{body}" fill="url(#bowl)" stroke="{OUT}" stroke-width="9" stroke-linejoin="round"/>'
    # white wave pattern around the bowl
    wave = f'M{cx - rx + 22},{rim + 34} ' + ' '.join(f'q{rx * .09:.0f},-16 {rx * .18:.0f},0 t{rx * .18:.0f},0' for _ in range(5))
    s += f'<path d="{wave}" stroke="#FFF3E6" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>'
    s += f'<path d="M{cx - rx * .7:.0f},{rim + depth * .45:.0f} C{cx - rx * .6:.0f},{rim + depth * .75:.0f} {cx - rx * .4:.0f},{rim + depth * .85:.0f} {cx - rx * .2:.0f},{rim + depth * .9:.0f}" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round" opacity=".35"/>'
    s += f'<ellipse cx="{cx}" cy="{rim}" rx="{rx}" ry="{ry}" fill="{BOWL_IN}" stroke="{OUT}" stroke-width="9"/>'
    s += f'<ellipse cx="{cx}" cy="{rim + 5}" rx="{rx - 20}" ry="{ry - 12}" fill="url(#{broth})"/>'
    if toppings:
        s += noodle_nest(cx, rim, rx)
        s += f'<g transform="translate({cx - rx * .55:.0f},{rim - 30}) rotate(-14)"><rect x="-30" y="-52" width="60" height="78" rx="4" fill="#1F3A2A" stroke="{OUT}" stroke-width="6"/><path d="M-18,-40 L-18,18 M0,-40 L0,18 M18,-40 L18,18" stroke="#2E5540" stroke-width="4"/></g>'
        # half egg
        s += f'<g transform="translate({cx - rx * .18:.0f},{rim - 4}) rotate(-8)"><ellipse rx="40" ry="26" fill="#FFFFFF" stroke="{OUT}" stroke-width="6"/><ellipse cy="2" rx="21" ry="14" fill="#F7A21B"/><ellipse cx="-6" cy="-3" rx="7" ry="4" fill="#FFD98A"/></g>'
        # fish cake swirl
        s += f'<g transform="translate({cx + rx * .32:.0f},{rim - 2})"><ellipse rx="30" ry="19" fill="#FFFFFF" stroke="{OUT}" stroke-width="6"/><path d="M-12,0 C-12,-10 10,-10 10,0 C10,8 -4,8 -4,1" stroke="#EF5B8A" stroke-width="5" fill="none" stroke-linecap="round"/></g>'
        # pork slice
        s += f'<g transform="translate({cx + rx * .62:.0f},{rim + 6}) rotate(12)"><ellipse rx="36" ry="20" fill="#C9826B" stroke="{OUT}" stroke-width="6"/><ellipse rx="22" ry="11" fill="#E6B09B"/></g>'
        for gx, gy in ((-60, 18), (-20, 26), (40, 22), (90, 14), (-110, 10), (130, 24)):
            s += f'<circle cx="{cx + gx}" cy="{rim + gy}" r="7" fill="#6CBF4E" stroke="#2F6A2A" stroke-width="3"/>'
    if chili:
        for gx, gy, rot in ((-100, 6, -30), (-10, 18, 20), (80, 4, -10), (140, 20, 40)):
            s += (f'<g transform="translate({cx + gx},{rim + gy}) rotate({rot})"><path d="M-26,0 C-20,-12 16,-12 24,-2 C18,6 -18,10 -26,0Z" fill="#E0241B" stroke="{OUT}" stroke-width="5"/>'
                  f'<path d="M22,-4 C30,-10 34,-8 38,-14" stroke="#3E8A2E" stroke-width="6" fill="none" stroke-linecap="round"/></g>')
        for gx, gy in ((-60, 22), (30, 26), (110, 18), (-140, 16)):
            s += f'<circle cx="{cx + gx}" cy="{rim + gy}" r="6" fill="#6CBF4E" stroke="#2F6A2A" stroke-width="3"/>'
    return s


def noodle_nest(cx, rim, rx):
    s = ''
    for i, (dx, w) in enumerate(((-120, 70), (-40, 90), (60, 80), (130, 60))):
        s += f'<path d="M{cx + dx - w / 2:.0f},{rim + 14} q{w / 4:.0f},-22 {w / 2:.0f},0 t{w / 2:.0f},0" stroke="{NOODLE}" stroke-width="10" fill="none" stroke-linecap="round"/>'
    return s


def spill(x, y, w=120, broth=BROTH, noodle=True):
    s = f'<path d="M{x - w},{y} C{x - w},{y - 18} {x - w * .4:.0f},{y - 22} {x},{y - 16} C{x + w * .5:.0f},{y - 24} {x + w},{y - 14} {x + w},{y + 2} C{x + w * .8:.0f},{y + 20} {x - w * .7:.0f},{y + 22} {x - w},{y}Z" fill="{broth}" stroke="{OUT}" stroke-width="6" opacity=".95"/>'
    s += f'<ellipse cx="{x - w * .3:.0f}" cy="{y - 8}" rx="{w * .35:.0f}" ry="5" fill="#FFFFFF" opacity=".45"/>'
    if noodle:
        s += f'<path d="M{x - w * .6:.0f},{y - 2} q20,-18 40,0 t40,0 t34,-4" stroke="{NOODLE}" stroke-width="9" fill="none" stroke-linecap="round"/>'
    for dx, dy, r in ((w + 22, 4, 9), (w + 44, -6, 6), (-w - 20, -4, 7)):
        s += f'<circle cx="{x + dx}" cy="{y + dy}" r="{r}" fill="{broth}" stroke="{OUT}" stroke-width="4"/>'
    return s


def drip(x, y0, y1, color=BROTH):
    return (f'<path d="M{x - 12},{y0} C{x - 10},{(y0 + y1) / 2:.0f} {x - 16},{y1 - 12} {x},{y1} C{x + 16},{y1 - 12} {x + 10},{(y0 + y1) / 2:.0f} {x + 12},{y0}Z" '
            f'fill="{color}" stroke="{OUT}" stroke-width="5"/>')


def hand(x, y, rot=0, scale=1.0, kind='grip'):
    """A chubby hand. grip: a fist, knuckles facing the viewer."""
    g = f'<g transform="translate({x},{y}) rotate({rot}) scale({scale})">'
    if kind == 'grip':
        g += f'<rect x="-54" y="-46" width="108" height="92" rx="40" fill="url(#skinball)" stroke="{OUT}" stroke-width="8"/>'
        for fy in (-16, 8, 30):
            g += f'<path d="M-44,{fy} C-20,{fy + 6} 10,{fy + 6} 30,{fy}" stroke="{SKIN_DEEP}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>'
        g += f'<ellipse cx="14" cy="-40" rx="40" ry="20" fill="url(#skinball)" stroke="{OUT}" stroke-width="7" transform="rotate(-12 14 -40)"/>'
        g += f'<ellipse cx="-18" cy="-24" rx="16" ry="9" fill="#FFFFFF" opacity=".3"/>'
    elif kind == 'palm':  # open hand, fingers up
        g += f'<ellipse cx="0" cy="10" rx="52" ry="56" fill="url(#skinball)" stroke="{OUT}" stroke-width="8"/>'
        for fx, fy, r in ((-36, -52, -14), (-12, -64, -4), (14, -62, 6), (38, -48, 16)):
            g += f'<rect x="{fx - 15}" y="{fy - 34}" width="30" height="72" rx="15" fill="url(#skinball)" stroke="{OUT}" stroke-width="7" transform="rotate({r} {fx} {fy})"/>'
        g += f'<rect x="-88" y="-4" width="62" height="30" rx="15" fill="url(#skinball)" stroke="{OUT}" stroke-width="7" transform="rotate(-30 -56 10)"/>'
        g += f'<ellipse cx="0" cy="18" rx="40" ry="40" fill="{SKIN}" opacity=".6"/>'
    elif kind == 'flat':  # resting palm-down, fingers pointing right
        for fy, fl in ((-30, 64), (-8, 72), (14, 68), (34, 56)):
            g += f'<rect x="10" y="{fy - 11}" width="{fl}" height="24" rx="12" fill="url(#skinball)" stroke="{OUT}" stroke-width="7"/>'
        g += f'<rect x="-60" y="-46" width="96" height="96" rx="40" fill="url(#skinball)" stroke="{OUT}" stroke-width="8"/>'
        g += f'<rect x="-30" y="-74" width="70" height="30" rx="15" fill="url(#skinball)" stroke="{OUT}" stroke-width="7" transform="rotate(18 5 -59)"/>'
        g += f'<ellipse cx="-14" cy="-10" rx="22" ry="14" fill="#FFFFFF" opacity=".25"/>'
    g += '</g>'
    return g


def arm(x0, y0, x1, y1, w=86):
    """A thick t-shirt sleeve and forearm from the shoulder toward the hand."""
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + 14
    return (f'<path d="M{x0},{y0} Q{mx:.0f},{my:.0f} {x1},{y1}" stroke="{OUT}" stroke-width="{w + 16}" fill="none" stroke-linecap="round"/>'
            f'<path d="M{x0},{y0} Q{mx:.0f},{my:.0f} {x1},{y1}" stroke="{SKIN}" stroke-width="{w}" fill="none" stroke-linecap="round"/>'
            f'<path d="M{x0},{y0 - w * .22:.0f} Q{mx:.0f},{my - w * .22:.0f} {x1},{y1 - w * .22:.0f}" stroke="{SKIN_HI}" stroke-width="{w * .25:.0f}" fill="none" stroke-linecap="round" opacity=".6"/>')


def chopsticks(x0, y0, x1, y1, gap=18):
    ang = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(ang) * gap / 2, math.cos(ang) * gap / 2
    s = ''
    for k in (-1, 1):
        a = (x0 + nx * k, y0 + ny * k)
        b = (x1 + nx * k * .3, y1 + ny * k * .3)
        s += f'<path d="M{a[0]:.0f},{a[1]:.0f} L{b[0]:.0f},{b[1]:.0f}" stroke="{OUT}" stroke-width="20" stroke-linecap="round"/>'
        s += f'<path d="M{a[0]:.0f},{a[1]:.0f} L{b[0]:.0f},{b[1]:.0f}" stroke="url(#stick)" stroke-width="11" stroke-linecap="round"/>'
    return s


def steam(x, y, h=120, o=.55, color='#FFFFFF'):
    return f'<path d="M{x},{y} c-26,-{h * .25:.0f} 26,-{h * .5:.0f} 0,-{h * .75:.0f} c-18,-{h * .15:.0f} 6,-{h * .25:.0f} 10,-{h * .3:.0f}" stroke="{color}" stroke-width="16" fill="none" stroke-linecap="round" opacity="{o}"/>'


def sparkle(x, y, r=26, c='#FFF4C8'):
    return f'<path d="M{x},{y - r} C{x + r * .15},{y - r * .15} {x + r * .15},{y - r * .15} {x + r},{y} C{x + r * .15},{y + r * .15} {x + r * .15},{y + r * .15} {x},{y + r} C{x - r * .15},{y + r * .15} {x - r * .15},{y + r * .15} {x - r},{y} C{x - r * .15},{y - r * .15} {x - r * .15},{y - r * .15} {x},{y - r}Z" fill="{c}"/>'


def sweat(x, y, r=18, rot=0):
    return (f'<g transform="translate({x},{y}) rotate({rot})"><path d="M0,{-r * 1.8:.0f} C{r * .7:.0f},{-r * .6:.0f} {r},{-r * .1:.0f} {r},{r * .3:.0f} C{r},{r * .9:.0f} {-r},{r * .9:.0f} {-r},{r * .3:.0f} C{-r},{-r * .1:.0f} {-r * .7:.0f},{-r * .6:.0f} 0,{-r * 1.8:.0f}Z" '
            f'fill="#BFE6FF" stroke="{OUT}" stroke-width="5"/><ellipse cx="{-r * .35:.0f}" cy="{r * .1:.0f}" rx="{r * .22:.0f}" ry="{r * .35:.0f}" fill="#FFFFFF"/></g>')


# ---------------- the four options ----------------
def slurp():
    s = background() + body() + counter() + belly_on_counter()
    s += '<g transform="rotate(4 512 760)">' + head({'eyes': 'happy', 'brows': 'up', 'mouth': 'o', 'blush': 1.35}) + '</g>'
    s += bowl(cx=500, rim=820)
    s += spill(640, 972, 110)
    s += drip(318, 852, 902)
    s += arm(150, 918, 286, 866, 96) + hand(290, 864, -10, 0.85)
    # noodles from the bowl, up the chopsticks, into his mouth
    for d in ('M506,640 C496,690 522,712 546,730', 'M524,642 C526,690 552,710 566,726'):
        s += f'<path d="{d}" stroke="{OUT}" stroke-width="19" fill="none" stroke-linecap="round"/><path d="{d}" stroke="{NOODLE}" stroke-width="10" fill="none" stroke-linecap="round"/>'
    for d in ('M548,736 C562,772 548,800 528,826', 'M568,732 C586,770 580,800 566,824'):
        s += f'<path d="{d}" stroke="{OUT}" stroke-width="19" fill="none" stroke-linecap="round"/><path d="{d}" stroke="{NOODLE}" stroke-width="10" fill="none" stroke-linecap="round"/>'
    s += chopsticks(770, 790, 546, 724)
    s += arm(900, 916, 776, 806, 96) + hand(776, 804, 8, 0.85)
    # slurp motion lines beside the cheeks
    for d in ('M226,560 C212,590 212,620 226,650', 'M196,540 C176,584 176,628 196,672', 'M798,560 C812,590 812,620 798,650', 'M828,540 C848,584 848,628 828,672'):
        s += f'<path d="{d}" stroke="#FFF4E0" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>'
    for x, y, r in ((626, 700, 9), (650, 672, 6), (462, 716, 7), (618, 752, 5)):
        s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BROTH}" stroke="{OUT}" stroke-width="4"/>'
    s += sparkle(170, 250, 30) + sparkle(860, 220, 22) + sparkle(890, 430, 16)
    return s


def bigbowl():
    s = background() + body() + counter() + belly_on_counter(1.05)
    s += '<g transform="translate(0,-44) rotate(-5 512 760)">' + head({'eyes': 'wide', 'brows': 'cocky', 'mouth': 'grin', 'blush': 1.1}) + '</g>'
    # shadow on the counter under the lifted bowl
    s += '<ellipse cx="512" cy="972" rx="200" ry="20" fill="#5A2A10" opacity=".35" filter="url(#soft4)"/>'
    # soup sloshing up and over the rim
    for x, y, r, rot in ((268, 772, 20, -40), (232, 724, 13, -55), (756, 766, 22, 40), (796, 716, 14, 55), (320, 740, 10, -20), (706, 734, 11, 25)):
        s += (f'<g transform="translate({x},{y}) rotate({rot})"><path d="M0,{-r * 1.8:.0f} C{r * .7:.0f},{-r * .6:.0f} {r},{-r * .1:.0f} {r},{r * .3:.0f} C{r},{r * .9:.0f} {-r},{r * .9:.0f} {-r},{r * .3:.0f} C{-r},{-r * .1:.0f} {-r * .7:.0f},{-r * .6:.0f} 0,{-r * 1.8:.0f}Z" '
              f'fill="{BROTH}" stroke="{OUT}" stroke-width="5"/><ellipse cx="{-r * .35:.0f}" cy="{r * .1:.0f}" rx="{r * .22:.0f}" ry="{r * .35:.0f}" fill="#FFF3D6"/></g>')
    s += bowl(cx=512, rim=818, rx=262, ry=62, depth=136)
    s += drip(292, 842, 904) + drip(734, 836, 888) + drip(610, 940, 976)
    s += arm(120, 950, 256, 874, 100) + hand(256, 872, -24, 0.95)
    s += arm(904, 950, 768, 874, 100) + hand(768, 872, 204, 0.95)
    s += chopsticks(664, 818, 806, 616, gap=22)
    s += steam(196, 690, 150, .5) + steam(846, 680, 150, .5)
    s += sparkle(160, 260, 34) + sparkle(862, 250, 28) + sparkle(120, 560, 18) + sparkle(912, 540, 20)
    return s


def foodcoma():
    s = background() + body() + counter() + belly_on_counter(1.3)
    s += bib_napkin()
    s += '<g transform="rotate(-7 512 760)">' + head({'eyes': 'sleepy', 'brows': 'soft', 'mouth': 'content', 'blush': 1.25}) + '</g>'
    # a noodle hanging off the lip onto the goatee
    s += f'<path d="M560,622 C572,650 560,672 570,700" stroke="{OUT}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M560,622 C572,650 560,672 570,700" stroke="{NOODLE}" stroke-width="8" fill="none" stroke-linecap="round"/>'
    # hand patting the belly
    s += arm(150, 1010, 330, 900, 96) + hand(352, 888, -12, 1.0, 'flat')
    for d in ('M318,800 C336,788 360,788 378,800', 'M306,770 C332,752 366,752 392,770'):
        s += f'<path d="{d}" stroke="#FFF4E0" stroke-width="8" fill="none" stroke-linecap="round" opacity=".9"/>'
    # empty bowl on its side on the counter, soup running out
    s += spill(700, 952, 130)
    s += '<g transform="translate(846,884) rotate(-78) scale(.72)">' + bowl(cx=0, rim=0, rx=110, ry=30, depth=100, toppings=False) + '</g>'
    s += chopsticks(560, 990, 900, 1004, gap=16)
    # burp bubbles and hearts
    for x, y, r in ((660, 560, 16), (700, 520, 22), (750, 470, 30)):
        s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF" opacity=".5" stroke="#FFFFFF" stroke-width="4"/><circle cx="{x - r * .35:.0f}" cy="{y - r * .35:.0f}" r="{r * .25:.0f}" fill="#FFFFFF"/>'
    s += heart(210, 260, 34) + heart(850, 300, 26) + heart(160, 470, 20)
    return s


def heart(x, y, r):
    return f'<path d="M{x},{y + r * .9:.0f} C{x - r * 1.4:.0f},{y} {x - r * .8:.0f},{y - r:.0f} {x},{y - r * .35:.0f} C{x + r * .8:.0f},{y - r:.0f} {x + r * 1.4:.0f},{y} {x},{y + r * .9:.0f}Z" fill="#FFE7EC" stroke="{OUT}" stroke-width="5"/>'


def puff(x, y, r=26, o=.9):
    return ''.join(f'<circle cx="{x + dx * r:.0f}" cy="{y + dy * r:.0f}" r="{r * k:.0f}" fill="#FFFFFF" opacity="{o}"/>'
                   for dx, dy, k in ((0, 0, 1), (.9, -.5, .8), (-.8, -.6, .75), (.1, -1.1, .7)))


def spicy():
    s = background() + body() + counter() + belly_on_counter()
    s += bowl(cx=490, rim=820, broth='spicy', toppings=False, chili=True)
    s += spill(700, 972, 110, broth=SPICY, noodle=False)
    s += drip(292, 850, 900, SPICY)
    s += arm(130, 930, 280, 862, 96) + hand(284, 860, -10, 0.85)
    s += head({'eyes': 'wide', 'brows': 'worried', 'mouth': 'pant', 'blush': 1.4, 'fog': True, 'flush': True})
    s += tongue_out()
    # steam puffing out of both ears
    s += puff(214, 440, 26) + puff(170, 392, 20, .8) + puff(810, 440, 26) + puff(854, 392, 20, .8)
    # sweat flying off the sides of his head
    s += sweat(236, 300, 20, -40) + sweat(790, 300, 20, 40) + sweat(208, 560, 15, -60) + sweat(830, 580, 15, 60)
    for d in ('M262,268 L240,244', 'M764,268 L786,244'):
        s += f'<path d="{d}" stroke="#FFF4E0" stroke-width="7" stroke-linecap="round" opacity=".8"/>'
    # fanning his mouth
    s += arm(920, 960, 800, 700, 92) + hand(794, 660, 16, 0.85, 'palm')
    for d in ('M880,610 C900,630 904,660 894,686', 'M910,590 C936,620 940,660 926,694'):
        s += f'<path d="{d}" stroke="#FFF4E0" stroke-width="8" fill="none" stroke-linecap="round" opacity=".9"/>'
    # little flames off the chili bowl
    for x, y, k in ((318, 812, .9), (676, 806, .8)):
        s += (f'<g transform="translate({x},{y}) scale({k})"><path d="M0,0 C-34,-10 -30,-54 -6,-86 C-4,-60 14,-58 12,-80 C40,-52 38,-8 0,0Z" fill="#FFB02E" stroke="{OUT}" stroke-width="6" stroke-linejoin="round"/>'
              f'<path d="M0,-10 C-14,-16 -12,-36 -2,-50 C4,-34 18,-30 10,-14Z" fill="#FFE27A"/></g>')
    return s


OPTIONS = [
    ('slurp', 'The Slurp', slurp, ('#FFB070', '#F0592B', '#C7361A')),
    ('bigbowl', 'Big Bowl Energy', bigbowl, ('#FFC36B', '#F26A2B', '#C9381A')),
    ('foodcoma', 'Food Coma', foodcoma, ('#FFB38A', '#EE5A3A', '#B8301F')),
    ('spicy', 'Spicy Sweats', spicy, ('#FF9A5A', '#E83A22', '#A81E12')),
]


def svg(fn, theme, scale=1.0, dy=0):
    inner = fn()
    if scale != 1.0 or dy:
        inner = f'<g transform="translate({512 - 512 * scale:.1f},{512 - 512 * scale + dy:.1f}) scale({scale})">{inner}</g>'
        inner = f'<rect width="{W}" height="{W}" fill="url(#bg)"/>' + inner
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">{defs(theme)}{inner}</svg>'


def render(pairs):
    """pairs: [(svg_text, png_path)]"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': W, 'height': W})
        for text, path in pairs:
            pg.set_content('<html><body style="margin:0;background:transparent">' + text + '</body></html>')
            pg.screenshot(path=path, clip={'x': 0, 'y': 0, 'width': W, 'height': W}, omit_background=True)
        b.close()


def rounded(im, radius_frac=0.15):
    from PIL import Image, ImageDraw
    n = im.size[0]
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * radius_frac), fill=255)
    im = im.convert('RGBA')
    im.putalpha(mask)
    return im


def preview(outdir):
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(outdir, exist_ok=True)
    jobs = []
    for key, name, fn, theme in OPTIONS:
        jobs.append((svg(fn, theme), os.path.join(outdir, key + '.png')))
    render(jobs)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
    except Exception:
        font = small = ImageFont.load_default()
    cell = 560
    sheet = Image.new('RGBA', (cell * 2 + 60, cell * 2 + 160 + 260), (246, 241, 247, 255))
    d = ImageDraw.Draw(sheet)
    for i, (key, name, fn, theme) in enumerate(OPTIONS):
        im = rounded(Image.open(os.path.join(outdir, key + '.png')).resize((480, 480), Image.LANCZOS))
        x = 30 + (i % 2) * (cell + 0) + 40
        y = 30 + (i // 2) * (cell + 80)
        sheet.paste(im, (x, y + 50), im)
        d.text((x, y), f'{i + 1}. {name}', fill=(42, 27, 51), font=font)
    # home screen sizes, on a dark phone background
    y0 = 30 + 2 * (cell + 80) - 10
    strip = Image.new('RGBA', (cell * 2 + 0, 250), (24, 18, 30, 255))
    ds = ImageDraw.Draw(strip)
    for i, (key, name, fn, theme) in enumerate(OPTIONS):
        base = Image.open(os.path.join(outdir, key + '.png'))
        x = 20 + i * 280
        circ = Image.new('L', (144, 144), 0)
        ImageDraw.Draw(circ).ellipse([0, 0, 143, 143], fill=255)
        ic = base.resize((144, 144), Image.LANCZOS)
        strip.paste(ic, (x, 30), circ)
        sm = rounded(base.resize((72, 72), Image.LANCZOS))
        strip.paste(sm, (x + 168, 66), sm)
        ds.text((x + 40, 190), f'Option {i + 1}', fill=(230, 220, 236), font=small)
    sheet.paste(strip, (30, y0))
    d.text((30, y0 - 40), 'On a phone home screen (round and small):', fill=(90, 77, 102), font=small)
    out = os.path.join(outdir, 'options.png')
    sheet.convert('RGB').save(out, quality=92)
    return out


def install(key):
    from PIL import Image
    here = os.path.dirname(os.path.abspath(__file__))
    icons = os.path.join(here, '..', 'icons')
    opt = next(o for o in OPTIONS if o[0] == key)
    tmp = os.path.join(icons, '_tile.png'), os.path.join(icons, '_mask.png')
    # maskable: shrink the art so it survives Android's round crop
    render([(svg(opt[2], opt[3]), tmp[0]), (svg(opt[2], opt[3], scale=0.82, dy=10), tmp[1])])
    tile, full = Image.open(tmp[0]), Image.open(tmp[1])
    for size in (512, 192):
        rounded(tile.resize((size, size), Image.LANCZOS)).save(os.path.join(icons, f'icon-{size}.png'))
        full.resize((size, size), Image.LANCZOS).convert('RGBA').save(os.path.join(icons, f'icon-maskable-{size}.png'))
    rounded(tile.resize((128, 128), Image.LANCZOS)).save(os.path.join(icons, 'logo-128.png'))
    for t in tmp:
        os.remove(t)


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'preview':
        print(preview(sys.argv[2]))
    elif len(sys.argv) >= 4 and sys.argv[1] == 'one':
        opt = next(o for o in OPTIONS if o[0] == sys.argv[2])
        render([(svg(opt[2], opt[3]), sys.argv[3])])
    elif len(sys.argv) >= 3 and sys.argv[1] == 'install':
        install(sys.argv[2])
    else:
        print(__doc__)
