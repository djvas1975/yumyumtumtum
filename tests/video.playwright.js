// Fill in from a video, on a phone-sized screen, through the real api/video.js with a pretend Gemini (Playwright).
// Not part of the quick test list (needs Playwright's Chromium and ffmpeg; about a minute):
//     python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/ && node tests/video.playwright.js [scratch folder]
// It makes its own test copy of the app (the reader features need https, so that check is switched off), a small
// webm (Chromium in Playwright can read it, so the picture-from-the-video part runs) and an mp4 (it can't: the upload
// still has to work), and saves screenshots to the scratch folder.
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs'), cp = require('child_process');
const R = path.join(__dirname, '..');
const SP = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'yyt-video-'));
const SRV = path.join(SP, 'srv'); fs.mkdirSync(SRV, { recursive: true });
{
  let s = fs.readFileSync(path.join(R, 'index.html'), 'utf8').split("location.protocol === 'https:'").join('true');
  const i = s.lastIndexOf('boot();');
  s = s.slice(0, i) + 'boot();\nwindow.__t = {getF: () => F, list, Store, go, refresh};' + s.slice(i + 7);
  fs.writeFileSync(path.join(SRV, 'index.html'), s);
  fs.writeFileSync(path.join(SRV, 'sw.js'), fs.readFileSync(path.join(R, 'sw.js')));
  fs.writeFileSync(path.join(SRV, 'manifest.webmanifest'), fs.readFileSync(path.join(R, 'manifest.webmanifest')));
  fs.mkdirSync(path.join(SRV, 'icons'), { recursive: true });
  ['icon-192.png', 'icon-512.png'].forEach(f => fs.copyFileSync(path.join(R, 'icons', f), path.join(SRV, 'icons', f)));
  const ff = a => cp.execFileSync('ffmpeg', ['-y', '-loglevel', 'error'].concat(a));
  ff(['-f', 'lavfi', '-i', 'testsrc=duration=6:size=360x640:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:v', 'libvpx', '-b:v', '400k', '-c:a', 'libvorbis', '-shortest', path.join(SP, 'clip.webm')]);
  ff(['-f', 'lavfi', '-i', 'testsrc=duration=6:size=360x640:rate=24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(SP, 'clip.mp4')]);
  // v2.4 pictures: a long scrolling screenshot (cut into pieces on the phone) and a big camera photo (made smaller)
  ff(['-f', 'lavfi', '-i', 'testsrc=size=1080x6000', '-frames:v', '1', path.join(SP, 'tall.png')]);
  ff(['-f', 'lavfi', '-i', 'testsrc=size=4000x3000', '-frames:v', '1', '-q:v', '3', path.join(SP, 'camera.jpg')]);
}
// width and height of a JPEG sent to Gemini (base64)
const jpegSize = b64 => { const b = Buffer.from(b64, 'base64'); let i = 2; while (i + 9 < b.length) { if (b[i] !== 0xFF) return null; const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xC3) return b.readUInt16BE(i + 7) + 'x' + b.readUInt16BE(i + 5); i += 2 + len; } return null; };

// ---- pretend Gemini (the server side through the real api/video.js, the phone's upload through a page route) ----
process.env.GEMINI_API_KEY = 'test-key-123';
const api = require(path.join(R, 'api/video.js'));
const G = { ups: new Map(), files: new Map(), n: 1, plan: [], gen: [], dropped: [], uploadDelay: 0, sent: [] };
const json = (o, st, h) => new Response(JSON.stringify(o), { status: st || 200, headers: Object.assign({ 'content-type': 'application/json' }, h || {}) });
const RECIPE = {
  isRecipe: true, title: 'Crack Chicken Penne', ingredients: ['1 lb penne', '## For the sauce', '8 oz cream cheese', '1 packet ranch seasoning', '1 cup shredded cheddar', '2 cups cooked chicken'],
  steps: ['Boil the penne until al dente, then drain.', 'Melt the cream cheese with the ranch and a splash of pasta water.', 'Stir in the chicken and pasta, top with cheddar, and bake at 375°F for 15 minutes.'],
  notes: ['Rotisserie chicken saves time.'], equipment: ['Large pot', '9x13 baking dish'], totalTime: 35, servings: 6, cuisine: 'American', meals: ['Dinner'], guesses: ['Amount of cheddar estimated from the video']
};
api._setFetch(async (url, o) => {
  o = o || {}; const u = new URL(url); const h = {}; Object.entries(o.headers || {}).forEach(([k, v]) => { h[k.toLowerCase()] = v; });
  if (u.pathname === '/upload/v1beta/files' && !u.searchParams.get('upload_id')) {
    const id = 'u' + G.n++; G.ups.set(id, { size: +h['x-goog-upload-header-content-length'], type: h['x-goog-upload-header-content-type'], origin: h.origin });
    return new Response('', { headers: { 'x-goog-upload-url': 'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=' + id + '&upload_protocol=resumable', 'x-goog-upload-chunk-granularity': '8388608' } });
  }
  const fm = u.pathname.match(/^\/v1beta\/(files\/\w+)$/);
  if (fm) {
    if (o.method === 'DELETE') { G.dropped.push(fm[1]); G.files.delete(fm[1]); return json({}); }
    const f = G.files.get(fm[1]); if (!f) return json({ error: { message: 'not found' } }, 404);
    f.polls = (f.polls || 0) + 1; if (f.polls >= 2) f.state = 'ACTIVE';
    return json(f);
  }
  if (/:generateContent$/.test(u.pathname)) {
    const body = JSON.parse(o.body); G.gen.push(body);
    const p = G.plan.length ? G.plan.shift() : null;
    if (p && p.status) return json(p.body, p.status);
    const rec = p && p.recipe ? p.recipe : RECIPE;
    return json({ candidates: [{ content: { parts: [{ text: JSON.stringify(rec) }] }, finishReason: 'STOP' }] });
  }
  return json({ error: { message: 'unexpected ' + url } }, 500);
});
async function serveApi(route) {
  const rq = route.request(); const u = new URL(rq.url());
  if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
  const headers = Object.assign({}, rq.headers(), { origin: 'https://djvas1975.github.io' });
  let body = rq.postDataBuffer();
  if (body && /json/.test(headers['content-type'] || '')) { try { body = JSON.parse(body.toString()); } catch (e) {} }
  const out = await new Promise(resolve => {
    const res = { h: {}, code: 200, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.h['Content-Type'] = 'application/json'; resolve({ status: this.code, headers: this.h, body: JSON.stringify(o) }); }, end() { resolve({ status: this.code, headers: this.h, body: '' }); } };
    api({ method: rq.method(), query: Object.fromEntries(u.searchParams), headers, body: body || undefined }, res);
  });
  out.headers['Access-Control-Allow-Origin'] = '*';
  await route.fulfill({ status: out.status, headers: out.headers, body: out.body });
}
// the phone's own upload to Google
async function serveUpload(route) {
  const rq = route.request(); const u = new URL(rq.url()); const cors = { 'access-control-allow-origin': rq.headers().origin || '*', 'access-control-allow-headers': 'content-type,x-goog-upload-command,x-goog-upload-offset', 'access-control-allow-methods': 'POST' };
  if (rq.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cors });
  const up = G.ups.get(u.searchParams.get('upload_id'));
  // Playwright doesn't hand over a File body sent by XMLHttpRequest, so the size comes from Content-Length
  const ah = await rq.allHeaders();
  const buf = rq.postDataBuffer();
  const bytes = buf && buf.length ? buf.length : +(ah['content-length'] || 0);
  G.sent.push({ cmd: ah['x-goog-upload-command'], off: ah['x-goog-upload-offset'], bytes, size: up && up.size, type: ah['content-type'] });
  if (G.uploadDelay) await new Promise(r => setTimeout(r, G.uploadDelay));
  if (G.uploadFail) { G.uploadFail--; return route.abort('connectionreset'); }
  if (!up || (bytes && bytes !== up.size)) return route.fulfill({ status: 400, headers: cors, body: '{"error":{"message":"size mismatch"}}' });
  const name = 'files/v' + G.n++; G.files.set(name, { name, uri: 'https://generativelanguage.googleapis.com/v1beta/' + name, mimeType: up.type, state: 'PROCESSING' });
  await route.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json', 'x-goog-upload-status': 'final' }, cors), body: JSON.stringify({ file: G.files.get(name) }) });
}

const srv = http.createServer((q, r) => {
  if (q.method === 'POST') { r.writeHead(405); r.end('405 Not Allowed'); return; } // like GitHub Pages
  const f = path.join(SRV, q.url === '/' || q.url.startsWith('/?') ? 'index.html' : q.url.split('?')[0]);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.webmanifest') ? 'application/manifest+json' : f.endsWith('.png') ? 'image/png' : 'text/html' }); r.end(fs.readFileSync(f)); } else { r.writeHead(404); r.end(); }
});
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const shot = (p, n) => p.screenshot({ path: path.join(SP, n + '.png') });

(async () => {
  await new Promise(o => srv.listen(8791, o));
  const b = await chromium.launch();
  const errs = [];
  const page = async (scheme, ua) => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme || 'light', serviceWorkers: 'block', userAgent: ua });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route(/yumyumtumtum\.vercel\.app\/api\/video/, serveApi);
    await p.route(/generativelanguage\.googleapis\.com\/upload\//, serveUpload);
    await p.route(/fonts\.g|vercel\.app\/api\/(recipe|discover|cook|image|similar|backup)/, r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"ok":true,"items":[],"kind":"video","title":"","ingredients":[],"steps":[]}' }));
    await p.addInitScript(() => { const send = XMLHttpRequest.prototype.send; window.__xhrSent = []; XMLHttpRequest.prototype.send = function (b) { window.__xhrSent.push({ size: b && b.size, name: b && b.name }); return send.call(this, b); }; });
    await p.goto('http://localhost:8791/'); await p.waitForTimeout(800);
    return p;
  };
  const openAdd = async p => { await p.evaluate(() => { const t = document.querySelector('[data-act="add"]') || document.querySelector('.fab'); if (t) t.click(); }); await p.waitForTimeout(500); if (!(await p.$('#edform'))) { await p.goto('http://localhost:8791/?add=1'); await p.waitForTimeout(900); } };
  const waitStage = (p, stage, ms) => p.waitForFunction(st => { const F = window.__t.getF(); return F && F.vf && F.vf.stage === st; }, stage, { timeout: ms || 15000 }).then(() => true, () => false);

  // ---- 1. pick a saved video (webm: the picture-from-the-video works) ----
  const p = await page();
  await openAdd(p);
  ok(!!(await p.$('#edform')), 'the Save a recipe form opens');
  ok(/Fill in from a video/.test(await p.textContent('#f-vfrow')), 'the form has a "Fill in from a video" button under the link');
  await shot(p, '1-form');
  G.uploadDelay = 900;
  await p.setInputFiles('#f-vfile', path.join(SP, 'clip.webm'));
  ok(await waitStage(p, 'upload', 5000), 'picking a video starts sending it');
  await p.waitForTimeout(400);
  ok(/Sending the video to Gemini/.test(await p.textContent('#f-vf')) && !!(await p.$('.vfbar')), 'shows "Sending the video to Gemini" with a progress bar');
  await shot(p, '2-sending');
  G.uploadDelay = 0;
  const okDone = await waitStage(p, 'done', 20000);
  if (!okDone) console.log('DEBUG stage:', await p.evaluate(() => { const F = window.__t.getF(); return F && F.vf ? JSON.stringify({stage: F.vf.stage, msg: F.vf.msg, pct: F.vf.pct, name: F.vf.name}) : 'no vf'; }), 'sent:', JSON.stringify(G.sent), 'card:', await p.textContent('#f-vf'));
  ok(okDone, 'then Gemini gets it ready and writes the recipe');
  const sent = G.sent[G.sent.length - 1];
  const xs = await p.evaluate(() => window.__xhrSent[window.__xhrSent.length - 1]);
  ok(sent.cmd === 'upload, finalize' && sent.off === '0' && xs.size === fs.statSync(path.join(SP, 'clip.webm')).size && xs.name === 'clip.webm', 'the phone sent the whole file to Google’s upload address in one go');
  ok(Array.from(G.ups.values()).pop().origin === 'https://djvas1975.github.io', 'the upload was started for the app’s site');
  const prev = await p.textContent('#f-vf');
  ok(/Gemini wrote the recipe/.test(prev) && /Crack Chicken Penne/.test(prev) && /5 ingredients · 3 steps · 1 tip · cookware · 35 min · serves 6/.test(prev), 'preview: name, counts, time, servings');
  ok(/It guessed: Amount of cheddar/.test(prev) && /Adds a picture from the video/.test(prev) && !/replaces/i.test(prev), 'preview: what it guessed, the photo from the video, nothing to replace yet');
  ok(!(await p.inputValue('#f-ing')) && !(await p.inputValue('#f-title')), 'nothing is filled in before Use it');
  ok(G.dropped.length === 1, 'the video was deleted from Gemini after the recipe came back');
  const gen = G.gen[G.gen.length - 1];
  ok(!gen.generationConfig.mediaResolution, 'a 6-second clip is sent at full detail');
  await p.$eval('#f-vf', el => el.scrollIntoView({ block: 'start' }));
  await shot(p, '3-preview');
  await p.click('[data-act="vf-use"]');
  await p.waitForTimeout(900);
  ok(await p.inputValue('#f-title') === 'Crack Chicken Penne' && (await p.inputValue('#f-ing')).split('\n').length === 6 && (await p.inputValue('#f-steps')).split('\n').length === 3, 'Use it fills the name, ingredients (with the ## heading) and steps');
  ok(await p.inputValue('#f-time') === '35' && await p.inputValue('#f-serv') === '6' && await p.inputValue('#f-cuisine') === 'American' && /Rotisserie/.test(await p.inputValue('#f-srcnotes')) && /9x13/.test(await p.inputValue('#f-equip')), 'and time, servings, cuisine, tips and cookware');
  ok(await p.evaluate(() => { const F = window.__t.getF(); return F.meal.has('Dinner') && !!(F.photoKey || F.photoData); }), 'meal Dinner picked, and the photo is a picture from the video');
  ok(/Fill in from a video/.test(await p.textContent('#f-vfrow')), 'the button is back for another try');
  await shot(p, '4-filled');
  await p.click('button[form="edform"]');
  await p.waitForTimeout(900);
  const saved = await p.evaluate(() => window.__t.list().find(r => r.title === 'Crack Chicken Penne'));
  ok(saved && saved.aiFill && saved.aiFill.src === 'file' && saved.aiFill.guesses.length === 1, 'the saved recipe remembers Gemini wrote it');
  await p.evaluate(id => window.__t.go({ name: 'recipe', id }), saved.id); await p.waitForTimeout(700);
  ok(/Gemini wrote this from the video\. Check the amounts before you cook\. It guessed: Amount of cheddar estimated from the video\./.test(await p.textContent('#sec-ing')), 'the recipe page says Gemini wrote it, and what it guessed');
  await p.$eval('#sec-ing', el => el.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
  await shot(p, '5-recipe-note');
  // editing it: the note stays while Gemini's ingredients are kept
  await p.evaluate(id => window.__t.go({ name: 'recipe', id }), saved.id);

  // ---- 2. a YouTube link: no upload, low detail; it says what it replaces ----
  await openAdd(p);
  await p.fill('#f-ing', '2 cups flour');
  await p.fill('#f-url', 'https://youtube.com/shorts/LrCEvNIyX-I?si=abc');
  await p.dispatchEvent('#f-url', 'input'); await p.waitForTimeout(700);
  ok(/Fill in from this video/.test(await p.textContent('#f-vfrow')) && /or pick a saved video/.test(await p.textContent('#f-vfrow')), 'with a YouTube link: "Fill in from this video", or pick a saved one');
  await shot(p, '6-youtube-button');
  const nUp = G.sent.length;
  await p.click('[data-act="vf-yt"]');
  ok(await waitStage(p, 'done', 15000), 'YouTube: Gemini writes it');
  ok(G.sent.length === nUp && G.gen[G.gen.length - 1].contents[0].parts[0].fileData.fileUri === 'https://www.youtube.com/watch?v=LrCEvNIyX-I' && G.gen[G.gen.length - 1].generationConfig.mediaResolution === 'MEDIA_RESOLUTION_LOW', 'nothing uploaded; the YouTube link went straight to Gemini at low detail');
  ok(/This replaces what’s in Ingredients now\./.test(await p.textContent('#f-vf')), 'the preview warns it replaces the ingredients already typed in');
  await p.click('[data-act="vf-close"]'); await p.waitForTimeout(200);
  ok(await p.inputValue('#f-ing') === '2 cups flour' && !(await p.textContent('#f-vf')).trim(), 'Not now leaves the form as it was');

  // ---- 3. free limit used up on every model: a plain message and Try again ----
  G.plan = [1, 2, 3].map(() => ({ status: 429, body: { error: { code: 429, message: 'Resource has been exhausted', status: 'RESOURCE_EXHAUSTED' } } }));
  await p.click('[data-act="vf-yt"]');
  ok(await waitStage(p, 'error', 15000) && /free limit is used up/.test(await p.textContent('#f-vf')), 'free limit used up: says so in plain words');
  await shot(p, '7-error');
  await p.click('[data-act="vf-retry"]');
  ok(await waitStage(p, 'done', 15000), 'Try again works once Gemini answers');
  await p.click('[data-act="vf-close"]');

  // ---- 4. not a recipe ----
  G.plan = [{ recipe: { isRecipe: false, title: '', ingredients: [], steps: [], notes: [], equipment: [], totalTime: 0, servings: 0, cuisine: '', meals: [], guesses: [] } }];
  await p.click('[data-act="vf-yt"]');
  ok(await waitStage(p, 'none', 15000) && /didn’t find a recipe/.test(await p.textContent('#f-vf')), 'a video with no recipe says so, with Pick another video');
  await p.click('[data-act="vf-close"]');

  // ---- 5. an mp4 Chromium can't play here: still uploads (no picture), and Cancel stops it ----
  await p.evaluate(() => document.querySelector('[data-act="closesheet"]').click()); await p.waitForTimeout(400);
  await openAdd(p);
  G.uploadDelay = 3000;
  await p.setInputFiles('#f-vfile', path.join(SP, 'clip.mp4'));
  ok(await waitStage(p, 'upload', 12000), 'an mp4 starts sending even when the phone can’t preview it');
  await p.waitForTimeout(500);
  await p.click('[data-act="vf-cancel"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !window.__t.getF().vf) && /Fill in from a video/.test(await p.textContent('#f-vfrow')), 'Cancel stops it and brings the button back');
  G.uploadDelay = 0;
  // a dropped upload gets one fresh try by itself
  G.uploadFail = 1;
  await p.setInputFiles('#f-vfile', path.join(SP, 'clip.mp4'));
  ok(await waitStage(p, 'done', 25000), 'a dropped upload tries once more by itself, then works');
  // (only where this browser can't play H.264; newer test browsers can, and then a picture is fine)
  if (await p.evaluate(() => !document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'))) ok(await p.evaluate(() => !window.__t.getF().vf.frame), 'no picture from a video the phone can’t play (no error either)');
  await p.click('[data-act="vf-close"]');
  await p.evaluate(() => document.querySelector('[data-act="closesheet"]').click()); await p.waitForTimeout(400);

  // ---- 6. dark mode look ----
  const d = await page('dark');
  await openAdd(d);
  await d.setInputFiles('#f-vfile', path.join(SP, 'clip.webm'));
  await waitStage(d, 'done', 20000);
  await d.$eval('#f-vf', el => el.scrollIntoView({ block: 'start' }));
  await shot(d, '8-preview-dark');

  // ---- 7. Share > YumYum through the real service worker: a video, and a plain link like before ----
  const sc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await sc.route(/yumyumtumtum\.vercel\.app\/api\/video/, serveApi);
  const s = await sc.newPage(); s.on('pageerror', e => errs.push(e.message));
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(500);
  await s.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await s.reload(); await s.waitForTimeout(800);
  ok(await s.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker is running the app');
  const share = async (fields, file, field) => {
    await s.evaluate(f => {
      const form = document.createElement('form'); form.method = 'POST'; form.enctype = 'multipart/form-data'; form.action = './share-in'; form.id = 'fakeshare';
      Object.entries(f).forEach(([k, v]) => { const i = document.createElement('input'); i.name = k; i.value = v; form.appendChild(i); });
      const fi = document.createElement('input'); fi.type = 'file'; fi.name = f.__field || 'video'; fi.id = 'fakefile'; form.appendChild(fi);
      delete f.__field; form.querySelectorAll('input[name="__field"]').forEach(x => x.remove());
      document.body.appendChild(form);
    }, Object.assign({}, fields, field ? { __field: field } : {}));
    if (file) await s.setInputFiles('#fakefile', file);
    await Promise.all([s.waitForNavigation(), s.evaluate(() => document.getElementById('fakeshare').submit())]);
    await s.waitForTimeout(1200);
  };
  await share({ title: '', text: 'Loaded fries https://www.tiktok.com/@cook/video/7404617088431557931', url: '' });
  ok(/^http:\/\/localhost:8791\/$/.test(s.url()) && await s.inputValue('#f-url') === 'https://www.tiktok.com/@cook/video/7404617088431557931' && await s.inputValue('#f-title') === 'Loaded fries', 'a shared link still opens Save a recipe with the link and name, like before');
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(600);
  await share({ title: '', text: '', url: '' }, path.join(SP, 'clip.webm'));
  const got = await s.evaluate(async () => { const F = window.__t.getF(); return { vf: !!(F && F.vf), name: F && F.vf && F.vf.file ? F.vf.file.name : '', size: F && F.vf && F.vf.file ? F.vf.file.size : 0, left: !!(await (await caches.open('share-in')).match(new URL('./shared-video', location.href).href)) }; });
  ok(got.vf && got.name === 'clip.webm' && got.size === fs.statSync(path.join(SP, 'clip.webm')).size && !got.left, 'a video shared to YumYum opens Save a recipe and starts on that video (and isn’t left behind in storage)');
  await shot(s, '9-shared-video');

  // a screenshot shared to YumYum (Share from the screenshot toolbar or the gallery; the 2.4 share menu calls the field "media")
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(600);
  const gs = G.gen.length;
  await share({ title: '', text: '', url: '' }, path.join(R, 'tests/fixtures/caption-shot.jpg'), 'media');
  const sp = await s.waitForFunction(() => { const F = window.__t.getF(); return F && F.filled; }, null, { timeout: 15000 }).then(() => true, () => false);
  const gotP = await s.evaluate(async () => { const F = window.__t.getF(); return { n: F && F.filled ? F.filled.n : 0, ing: document.querySelector('#f-ing').value, left: !!(await (await caches.open('share-in')).match(new URL('./shared-image-0', location.href).href)) }; });
  ok(sp && gotP.n === 1 && gotP.ing.split('\n').length === 6 && !gotP.left && G.gen.length === gs + 1, 'a screenshot shared to YumYum opens Save a recipe, Gemini reads it and the empty form fills in by itself, no extra tap (nothing left in storage)');
  await s.$eval('#f-vf', el => el.scrollIntoView({ block: 'start' }));
  await shot(s, '13-shared-screenshot');
  // the old share menu (before Chrome updates the installed app) names the field "video": a picture there still works
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(600);
  await share({ title: '', text: '', url: '' }, path.join(R, 'tests/fixtures/caption-shot.jpg'));
  ok(await s.waitForFunction(() => { const F = window.__t.getF(); return !!(F && ((F.vf && F.vf.src === 'image') || F.filled)); }, null, { timeout: 15000 }).then(() => true, () => false), 'a picture sent under the old field name is still read as a picture');

  // ---- 8. Fill in from a screenshot (v2.4) ----
  const q = await page();
  await openAdd(q);
  ok(/Fill in from a screenshot/.test(await q.textContent('#f-vfrow')), 'the form also has a "Fill in from a screenshot" button');
  await shot(q, '10-screenshot-button');
  let g0 = G.gen.length;
  const waitFilled = (p, ms) => p.waitForFunction(() => { const F = window.__t.getF(); return F && F.filled && !F.vf; }, null, { timeout: ms || 15000 }).then(() => true, () => false);
  await q.setInputFiles('#f-ifile', path.join(R, 'tests/fixtures/caption-shot.jpg'));
  ok(await waitFilled(q), 'picking a screenshot with an empty form: Gemini reads it and it fills in by itself (no Use it)');
  let gp = G.gen[G.gen.length - 1].contents[0].parts;
  ok(G.gen.length === g0 + 1 && gp.length === 2 && gp[0].inlineData.mimeType === 'image/jpeg' && jpegSize(gp[0].inlineData.data) === '1080x2523' && /Ignore the app around it/.test(gp[1].text), 'one screenshot went to Gemini as a 1080-wide JPEG with the screenshot prompt -> ' + jpegSize(gp[0].inlineData.data));
  const pv = await q.textContent('#f-vf');
  ok(/Filled in from your screenshot/.test(pv) && /5 ingredients · 3 steps · 1 tip · 35 min · serves 6/.test(pv) && /Check: Amount of cheddar/.test(pv) && /Tip: paste the post’s link/.test(pv) && /Undo/.test(pv) && !/Translated/.test(pv), 'the filled-in card: what came in, what to check, the link tip, Undo (no "Translated" for English)');
  ok(await q.inputValue('#f-title') === 'Crack Chicken Penne' && (await q.inputValue('#f-ing')).split('\n').length === 6 && (await q.inputValue('#f-steps')).split('\n').length === 3 && await q.inputValue('#f-time') === '35' && await q.evaluate(() => { const F = window.__t.getF(); return !F.photoKey && !F.photoData; }), 'the boxes are filled in and the photo is left alone');
  await q.waitForTimeout(400);
  await shot(q, '11-screenshot-filled');
  // Undo puts the empty form back; filling again works
  await q.click('#f-filled [data-act="vf-undo"]'); await q.waitForTimeout(400);
  ok(await q.inputValue('#f-title') === '' && await q.inputValue('#f-ing') === '' && await q.inputValue('#f-steps') === '' && await q.inputValue('#f-time') === '' && await q.evaluate(() => { const F = window.__t.getF(); return !F.filled && !F.ai && !F.meal.size; }) && /Fill in from a screenshot/.test(await q.textContent('#f-vfrow')), 'Undo empties the boxes again (and forgets Gemini filled them)');
  await q.setInputFiles('#f-ifile', path.join(R, 'tests/fixtures/caption-shot.jpg'));
  ok(await waitFilled(q), 'after Undo, a screenshot fills it in again');
  await q.click('button[form="edform"]'); await q.waitForTimeout(900);
  const savedP = await q.evaluate(() => window.__t.list().find(r => r.title === 'Crack Chicken Penne' && r.aiFill && r.aiFill.src === 'image'));
  ok(!!savedP, 'the saved recipe remembers Gemini read it from a picture');
  await q.evaluate(id => window.__t.go({ name: 'recipe', id }), savedP.id); await q.waitForTimeout(700);
  ok(/Gemini read this from a screenshot or photo\. Check the amounts before you cook\./.test(await q.textContent('#sec-ing')), 'the recipe page says Gemini read it from a screenshot');
  await q.$eval('#sec-ing', el => el.scrollIntoView({ block: 'start' })); await q.waitForTimeout(300);
  await shot(q, '12-screenshot-recipe-note');
  // a long scrolling screenshot is cut into overlapping pieces; a big camera photo is made smaller; both in one go
  await openAdd(q);
  g0 = G.gen.length;
  await q.fill('#f-ing', '1 lb pasta\n2 cups marinara');
  await q.setInputFiles('#f-ifile', [path.join(SP, 'tall.png'), path.join(SP, 'camera.jpg')]);
  ok(await waitStage(q, 'done', 20000), 'two pictures at once: Gemini reads them');
  const pv2 = await q.textContent('#f-vf');
  ok(/Gemini read the recipe/.test(pv2) && /This replaces what’s in Ingredients now/.test(pv2) && /Use it/.test(pv2) && await q.inputValue('#f-ing') === '1 lb pasta\n2 cups marinara', 'with Ingredients already filled in: the preview asks first and nothing is replaced yet');
  await q.$eval('#f-vf', el => el.scrollIntoView({ block: 'start' }));
  await shot(q, '16-screenshot-asks-first');
  gp = G.gen[G.gen.length - 1].contents[0].parts;
  const sizes = gp.filter(x => x.inlineData).map(x => jpegSize(x.inlineData.data));
  ok(sizes.join() === '1080x2200,1080x2200,1080x2200,1080x810', 'the long screenshot became 3 overlapping 1080x2200 pieces, the camera photo 1080x810 -> ' + sizes.join());
  ok(/4 pictures, in order/.test(gp[gp.length - 1].text) && /Read by Gemini from your pictures\./.test(await q.textContent('#f-vf')), 'Gemini is told the pieces are in order; the preview says "pictures"');
  const total = gp.filter(x => x.inlineData).reduce((a, x) => a + x.inlineData.data.length, 0);
  ok(total < 4.2 * 1024 * 1024, 'the whole request stays under Vercel’s 4.5 MB -> ' + Math.round(total / 1024) + ' KB of picture data');
  await q.click('[data-act="vf-use"]'); await q.waitForTimeout(500);
  ok((await q.inputValue('#f-ing')).split('\n').length === 6 && /Filled in from your screenshots/.test(await q.textContent('#f-vf')), 'Use it replaces Ingredients and leaves the Undo card');
  await q.fill('#f-notes', 'Kids liked it');
  await q.fill('#f-steps', (await q.inputValue('#f-steps')) + '\nServe hot.');
  await q.click('#f-filled [data-act="vf-undo"]'); await q.waitForTimeout(400);
  const askd = await q.textContent('#modal');
  await q.click('#dlg-yes'); await q.waitForTimeout(400);
  ok(/Undo the fill-in\?/.test(askd) && await q.inputValue('#f-ing') === '1 lb pasta\n2 cups marinara' && await q.inputValue('#f-steps') === '' && await q.inputValue('#f-notes') === 'Kids liked it', 'Undo after changes asks first, then puts back the old ingredients (My notes, which the fill never touches, stay)');
  // no recipe in the picture
  G.plan = [{ recipe: { isRecipe: false, title: '', ingredients: [], steps: [], notes: [], equipment: [], totalTime: 0, servings: 0, cuisine: '', meals: [], guesses: [] } }];
  await q.setInputFiles('#f-ifile', path.join(SP, 'camera.jpg'));
  ok(await waitStage(q, 'none', 15000) && /didn’t find a recipe in that picture/.test(await q.textContent('#f-vf')) && /tap “more” on the caption/.test(await q.textContent('#f-vf')), 'a picture with no recipe says so, with the "tap more" tip');
  await shot(q, '14-screenshot-none');
  await q.click('[data-act="vf-close"]');
  // a file that isn't a picture
  await q.setInputFiles('#f-ifile', path.join(SP, 'clip.webm'));
  await q.waitForTimeout(400);
  ok(await q.evaluate(() => !window.__t.getF().vf), 'a file that isn’t a picture is turned away');
  const qd = await page('dark');
  await openAdd(qd);
  await qd.setInputFiles('#f-ifile', path.join(R, 'tests/fixtures/caption-shot.jpg'));
  await waitFilled(qd);
  await qd.waitForTimeout(400);
  await shot(qd, '15-screenshot-filled-dark');

  // ---- 9. v2.4.1: the Instagram post YumYum can't read -> the screenshot way, on an Android phone ----
  const ANDROID = 'Mozilla/5.0 (Linux; Android 15; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';
  const REEL = 'https://www.instagram.com/reel/DfLcvZ0o6o6/';
  const SPANISH = { isRecipe: true, language: 'Spanish', title: 'Pork Adobo', ingredients: ['500 g pork shoulder', '1/2 cup orange juice', '200 ml water', '2 tablespoons achiote paste', 'Salt'], steps: ['Blend the orange juice, water and achiote.', 'Coat the pork and let it rest overnight.', 'Bake at 180 °C for 40 minutes.'], notes: [], equipment: ['Blender'], totalTime: 0, servings: 0, cuisine: 'Mexican', meals: ['Dinner'], guesses: ['Amount of salt isn’t given'] };
  // the reader: a sign-in-only reel fails like the live one did; another reel reads, but its caption has no recipe
  const igReader = route => {
    const u = decodeURIComponent(route.request().url());
    const body = /NoRecipe1/.test(u) ? { ok: true, kind: 'video', platform: 'instagram', title: '', caption: 'So good!! Recipe in the comments 👇', ingredients: [], steps: [] }
      : { ok: false, error: 'Instagram only shows this post to people signed in to Instagram, so YumYum can’t read it.', hint: 'record' };
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  };
  const noNav = p => p.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('[data-act="ig-open"]')) e.preventDefault(); }, true)); // Playwright can't open the Instagram app
  const awayAndBack = p => p.evaluate(() => { let st = 'hidden'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => st }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => st === 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); st = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  const failed = p => p.waitForFunction(() => { const F = window.__t.getF(); return F && (F.readState === 'failed' || F.readState === 'done'); }, null, { timeout: 8000 }).then(() => true, () => false);
  const draft = p => p.evaluate(() => JSON.parse(localStorage.getItem('yyt-draft-v1') || 'null'));

  const a = await page('light', ANDROID);
  await a.route(/vercel\.app\/api\/recipe/, igReader);
  await noNav(a);
  await openAdd(a);
  await a.fill('#f-url', REEL + '?igsh=MTZ3bWQ5');
  await failed(a);
  const card = await a.textContent('#f-det');
  const href = await a.getAttribute('#f-igr [data-act="ig-open"]', 'href');
  ok(/Can’t read this recipe\?/.test(card) && /signed in to Instagram/.test(card) && /Open the post in Instagram, expand the recipe or comment, take a screenshot, and bring it back to YumYum\./.test(card) && /Open in Instagram/.test(card) && /Use my screenshot/.test(card), 'a reel YumYum can’t read shows "Can’t read this recipe?" with Open in Instagram and Use my screenshot');
  ok(/^intent:\/\/www\.instagram\.com\/reel\/DfLcvZ0o6o6\//.test(href) && /#Intent;scheme=https;package=com\.instagram\.android;S\.browser_fallback_url=https%3A%2F%2Fwww\.instagram\.com%2Freel%2FDfLcvZ0o6o6%2F/.test(href) && /;end$/.test(href), 'on Android, Open in Instagram goes to the Instagram app (the web page if it isn’t installed) -> ' + href.slice(0, 70) + '…');
  await a.$eval('#f-igr', el => el.scrollIntoView({ block: 'center' })); await a.waitForTimeout(200);
  await shot(a, '17-ig-cant-read');
  await a.click('#f-igr [data-act="ig-open"]'); await a.waitForTimeout(200);
  const d1 = await draft(a);
  ok(d1 && /DfLcvZ0o6o6/.test(d1.v['#f-url']) && d1.igAt > 0 && d1.readState === 'failed', 'tapping Open in Instagram keeps the unsaved form first');
  await awayAndBack(a); await a.waitForTimeout(500);
  const back = await a.textContent('#f-igr');
  ok(/Got your screenshot\?/.test(back) && /primary/.test(await a.getAttribute('#f-igr [data-act="vf-pickimg"]', 'class')) && /DfLcvZ0o6o6/.test(await a.inputValue('#f-url')), 'back from Instagram: the form is as it was, and the card asks "Got your screenshot?" with Use my screenshot first');
  await shot(a, '18-ig-back');
  G.plan = [{ recipe: SPANISH }];
  const [fc] = await Promise.all([a.waitForEvent('filechooser'), a.click('#f-igr [data-act="vf-pickimg"]')]);
  ok(fc.isMultiple(), 'Use my screenshot opens the picture picker (up to 4)');
  await fc.setFiles(path.join(R, 'tests/fixtures/caption-shot.jpg'));
  ok(await waitFilled(a), 'the screenshot fills in the empty form by itself');
  const fv = await a.textContent('#f-vf'), dv = await a.textContent('#f-det');
  ok(await a.inputValue('#f-ing') === SPANISH.ingredients.join('\n') && /Bake at 180 °C for 40 minutes\./.test(await a.inputValue('#f-steps')) && await a.inputValue('#f-time') === '' && await a.inputValue('#f-serv') === '', 'amounts, units and temperatures go in exactly as Gemini read them (500 g, 1/2 cup, 200 ml, 180 °C); no made-up time or servings');
  ok(/Translated from Spanish, amounts and units kept as written/.test(fv) && /Check: Amount of salt isn’t given/.test(fv) && !/Tip: paste/.test(fv), 'the card says it was translated from Spanish and what to check (no link tip: the reel link is already there)');
  ok(/The link stays saved with the recipe, so you can open the reel later\./.test(dv) && !(await a.$('#f-igr')) && /DfLcvZ0o6o6/.test(await a.inputValue('#f-url')), 'the reel link stays in the Link box and the card steps aside');
  await a.evaluate(() => window.scrollTo(0, 0)); await a.$eval('#f-det', el => el.scrollIntoView({ block: 'start' })); await a.waitForTimeout(200);
  await shot(a, '19-ig-filled-spanish');
  await a.click('button[form="edform"]'); await a.waitForTimeout(900);
  const savedIg = await a.evaluate(() => window.__t.list().find(r => r.title === 'Pork Adobo'));
  ok(savedIg && /instagram\.com\/reel\/DfLcvZ0o6o6/.test(savedIg.url) && savedIg.platform === 'instagram' && savedIg.aiFill && savedIg.aiFill.lang === 'Spanish' && savedIg.ingredients[0] === '500 g pork shoulder', 'saved with the original reel link, as an Instagram recipe, noting the Spanish');
  ok(!(await draft(a)), 'saving drops the kept form');
  ok(/Gemini read this from a screenshot or photo and translated it from Spanish\. Check the amounts before you cook\./.test(await a.textContent('#sec-ing')), 'the recipe page says it was translated from Spanish');
  await a.$eval('#sec-ing', el => el.scrollIntoView({ block: 'start' })); await a.waitForTimeout(300);
  await shot(a, '20-ig-recipe-spanish');
  // a reel YumYum reads, but the recipe isn't in the caption (it's in a comment)
  await openAdd(a);
  await a.fill('#f-url', 'https://www.instagram.com/reel/NoRecipe1/');
  await failed(a);
  ok(/Can’t read this recipe\?/.test(await a.textContent('#f-det')) && /the recipe isn’t in it\. It may be in a comment/.test(await a.textContent('#f-det')), 'a reel whose caption has no recipe gets the same card ("It may be in a comment")');
  await a.evaluate(() => document.querySelector('[data-act="closesheet"]').click()); await a.waitForTimeout(400);
  ok(!(await draft(a)), 'closing the form drops the kept form');
  // Android closes YumYum while Dave is in Instagram: the form comes back when he returns
  await openAdd(a);
  await a.fill('#f-url', REEL);
  await failed(a);
  await a.fill('#f-notes', 'From Tia’s reel');
  await a.click('#f-igr [data-act="ig-open"]'); await a.waitForTimeout(200);
  await a.reload(); await a.waitForTimeout(1200);
  ok(await a.$('#edform') && await a.inputValue('#f-url') === REEL && await a.inputValue('#f-notes') === 'From Tia’s reel' && /Got your screenshot\?/.test(await a.textContent('#f-det')) && /Picked up where you left off/.test(await a.textContent('#toast')), 'YumYum closed in the background: on return the form is back (link, notes, the screenshot card), "Picked up where you left off"');
  await shot(a, '21-ig-picked-up');
  await a.evaluate(() => document.querySelector('[data-act="closesheet"]').click()); await a.waitForTimeout(400);
  await a.reload(); await a.waitForTimeout(1000);
  ok(!(await a.$('#edform')), 'after closing the form, opening YumYum again starts normally');
  // a desktop browser gets the plain link in a new tab
  const dsk = await page();
  await dsk.route(/vercel\.app\/api\/recipe/, igReader);
  await openAdd(dsk);
  await dsk.fill('#f-url', REEL);
  await failed(dsk);
  ok(await dsk.getAttribute('#f-igr [data-act="ig-open"]', 'href') === REEL && await dsk.getAttribute('#f-igr [data-act="ig-open"]', 'target') === '_blank', 'not on Android: Open in Instagram is the plain link in a new tab');
  // Share > YumYum from the screenshot (through the real service worker): it lands in the kept form, link and all
  await sc.route(/vercel\.app\/api\/recipe/, igReader);
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(600);
  await openAdd(s);
  await s.fill('#f-url', REEL);
  await failed(s);
  await noNav(s);
  await s.click('#f-igr [data-act="ig-open"]'); await s.waitForTimeout(200);
  G.plan = [{ recipe: SPANISH }];
  await share({ title: '', text: '', url: '' }, path.join(R, 'tests/fixtures/caption-shot.jpg'), 'media');
  ok(await waitFilled(s, 15000) && await s.inputValue('#f-url') === REEL && await s.inputValue('#f-ing') === SPANISH.ingredients.join('\n'), 'a screenshot shared to YumYum lands in the kept form: the reel link stays and the recipe fills in by itself');
  await shot(s, '22-shared-into-kept-form');
  // a kept form that already has its recipe isn't waiting for a screenshot: a new one starts a fresh form
  await s.goto('http://localhost:8791/'); await s.waitForTimeout(900);
  ok(await s.$('#edform') && await s.inputValue('#f-url') === REEL && await s.inputValue('#f-ing') === SPANISH.ingredients.join('\n'), 'opening YumYum again brings back the unsaved form with its recipe');
  await share({ title: '', text: '', url: '' }, path.join(R, 'tests/fixtures/caption-shot.jpg'), 'media');
  ok(await waitFilled(s, 15000) && await s.inputValue('#f-url') === '' && await s.inputValue('#f-title') === 'Crack Chicken Penne', 'a screenshot shared when the kept form already has a recipe starts a fresh form (no wrong link)');

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log('\nScreenshots in ' + SP);
  console.log(fails ? fails + ' FAILED' : 'All video screen tests passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
