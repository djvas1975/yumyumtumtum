"""Copy the caption reader from lib/parse.js into the app (tools/app.html).

The app uses the same code for "Paste recipe text". Run this after changing the
caption section of lib/parse.js, then rebuild:

    python3 tools/sync_caption.py
    python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
parse = open(os.path.join(ROOT, 'lib', 'parse.js'), encoding='utf-8').read()
block = parse[parse.index('/* ---- captions (TikTok'):parse.index('// Bot-check pages')].rstrip() + '\n'

app_path = os.path.join(ROOT, 'tools', 'app.html')
app = open(app_path, encoding='utf-8').read()
start = '/* the same text reader the recipe reader uses, for pasted recipe text */\n'
end = '/* ---------- add / edit ---------- */'
a = app.index(start) + len(start)
b = app.index(end)
app = app[:a] + block + '\n' + app[b:]
open(app_path, 'w', encoding='utf-8').write(app)
print('Caption reader copied into tools/app.html')
