"""Builds the installable yumyumtumtum phone app from the same file the claude.ai version uses.

    python3 tools/make_icons.py   # only when the icon changes
    python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/

Writes to the repo root: index.html, manifest.webmanifest, sw.js, icons/, README.md, .nojekyll
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "app.html")
DIST = os.path.abspath(os.path.join(HERE, ".."))
BASE = sys.argv[1].rstrip("/") + "/" if len(sys.argv) > 1 else ""

# the same small reset the claude.ai page wrapper provides
RESET = (":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);"
         "padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}"
         "img{max-width:100%}[hidden]{display:none!important}")


def build_index():
    src = open(APP, encoding="utf-8").read()
    cut = src.index('<div id="app">')
    head, body = src[:cut], src[cut:]
    return ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
            "<meta name=\"description\" content=\"Dave's recipe box: save recipes and cooking videos from anywhere.\">\n"
            "<link rel=\"manifest\" href=\"manifest.webmanifest\">\n"
            "<link rel=\"icon\" type=\"image/png\" sizes=\"192x192\" href=\"icons/icon-192.png\">\n"
            "<link rel=\"apple-touch-icon\" href=\"icons/icon-192.png\">\n"
            f"<style>{RESET}</style>\n{head}</head>\n<body>\n{body}\n</body>\n</html>\n")


def build_manifest():
    return {
        "id": BASE or "./",
        "name": "yumyumtumtum",
        "short_name": "yumyumtumtum",
        "description": "Save recipes and cooking videos from TikTok, Instagram, YouTube, and any website.",
        "start_url": BASE or "./",
        "scope": BASE or "./",
        "display": "standalone",
        "orientation": "portrait",
        "background_color": "#FAF7FB",
        "theme_color": "#E0431F",
        "categories": ["food", "lifestyle"],
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "shortcuts": [
            {"name": "Save a recipe", "short_name": "Save", "url": (BASE or "./") + "?add=1",
             "icons": [{"src": "icons/shortcut-add.png", "sizes": "96x96", "type": "image/png"}]},
            {"name": "What can I cook?", "short_name": "What can I cook", "url": (BASE or "./") + "?cook=1",
             "icons": [{"src": "icons/shortcut-cook.png", "sizes": "96x96", "type": "image/png"}]},
            {"name": "Grocery list", "short_name": "Grocery list", "url": (BASE or "./") + "?go=list",
             "icons": [{"src": "icons/shortcut-list.png", "sizes": "96x96", "type": "image/png"}]}
        ],
        # Android sends shared links in "text" (sometimes "title"); the app reads all three
        "share_target": {
            "action": BASE or "./",
            "method": "GET",
            "params": {"title": "title", "text": "text", "url": "url"},
        },
    }


SW = """// yumyumtumtum offline support. VERSION changes on every build so phones pick up updates.
const VERSION = 'yyt-__VERSION__';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('yyt-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the app page: try the network first so updates show up, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // app files and fonts: answer from the saved copy right away, refresh it in the background
  if (url.origin === location.origin || /(^|\\.)fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
"""

README = """# yumyumtumtum

Dave's personal recipe box. Save recipes and cooking videos from TikTok, Instagram,
YouTube, Facebook, Pinterest, or any website, organize them into collections, and
tap through to the original when it's time to cook.

## Put it on an Android phone
1. Open the site address in **Chrome**.
2. Tap **Install** on the Home tab (or Chrome's menu, then **Install app**).
3. The yumyumtumtum icon shows up on the home screen and in the app drawer.

After it's installed, tap **Share** in TikTok, Instagram, YouTube, or Chrome and pick
**yumyumtumtum** to save that link. Long-press the icon for quick **Save**,
**What can I cook?**, and **Grocery list** shortcuts.

## What can I cook?
Tap **What can I cook?** on the Home tab and add what's in your kitchen. It shows your
saved recipes and new ones from the recipe sites that you can make, with what's missing
for each. Suggestions lean toward what you save, cook, rate, and skip, and anything on
your **Foods you don't eat** list (Me tab) never gets suggested.

## Grocery list and deals
On any recipe, tap **Add to grocery list**. What's already in your kitchen gets checked
off, so only what you need goes on the list. The **List** tab keeps it by store section,
and you can add anything else too. Tap **Done shopping** to move what's in the cart into
your kitchen.

The **Deals** tab has weekly ads for your stores (Food 4 Less, Safeway, Raley's, and both
Save Marts to start, and you can add more). None of these stores share their deals with
apps, so tap a weekly ad and save any deal you spot. It shows up next to that item on your
list until the sale ends.

## Where recipes are stored
On the phone itself (works offline). Nothing is uploaded anywhere. Use
**Me > Download backup** now and then, and **Restore a backup** to move recipes
to a new phone.

## Files
- `index.html` the app
- `manifest.webmanifest` name, icon, share menu, and shortcut settings
- `sw.js` offline support
- `icons/` app icons
- `tools/` the app source (`app.html`) and the scripts that build this folder from it
"""


def main():
    os.makedirs(os.path.join(DIST, "icons"), exist_ok=True)
    with open(os.path.join(DIST, "index.html"), "w", encoding="utf-8") as f:
        f.write(build_index())
    with open(os.path.join(DIST, "manifest.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(build_manifest(), f, indent=2)
    with open(os.path.join(DIST, "sw.js"), "w", encoding="utf-8") as f:
        f.write(SW.replace("__VERSION__", time.strftime("%Y%m%d-%H%M%S")))
    with open(os.path.join(DIST, "README.md"), "w", encoding="utf-8") as f:
        f.write(README)
    open(os.path.join(DIST, ".nojekyll"), "w").close()
    print("built", DIST, "base:", BASE or "(relative)")


if __name__ == "__main__":
    main()
