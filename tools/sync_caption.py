"""Copy the shared readers into the app (tools/app.html):

- the caption reader from lib/parse.js (the app uses it for "Paste recipe text")
- the ingredient matcher from lib/pantry.js (the app uses it for "What can I cook?")
- the swaps and cookware tips from lib/kitchen.js (the app uses them on the recipe page)

Run this after changing either one, then rebuild:

    python3 tools/sync_caption.py
    python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
read = lambda *p: open(os.path.join(ROOT, *p), encoding='utf-8').read()
parse = read('lib', 'parse.js')
caption = parse[parse.index('/* ---- captions (TikTok'):parse.index('// Bot-check pages')].rstrip() + '\n'
pantry_js = read('lib', 'pantry.js')
pantry = pantry_js[pantry_js.index('/* ---- pantry: what can I cook ---- */'):pantry_js.index('/* ---- end pantry ---- */')].rstrip() + '\n/* ---- end pantry ---- */\n'
kitchen_js = read('lib', 'kitchen.js')
kitchen = kitchen_js[kitchen_js.index('/* ---- kitchen help: swaps and cookware tips ---- */'):kitchen_js.index('/* ---- end kitchen help ---- */')].rstrip() + '\n/* ---- end kitchen help ---- */\n'

app_path = os.path.join(ROOT, 'tools', 'app.html')
app = read('tools', 'app.html')
start = '/* the same text reader the recipe reader uses, for pasted recipe text */\n'
end = '/* ---------- add / edit ---------- */'
a = app.index(start) + len(start)
b = app.index(end)
app = app[:a] + caption + '\n/* the same ingredient reader the tests use, for "What can I cook?" */\n' + pantry + '\n' + kitchen + '\n' + app[b:]
open(app_path, 'w', encoding='utf-8').write(app)
print('Caption reader, ingredient matcher, and kitchen help copied into tools/app.html')
