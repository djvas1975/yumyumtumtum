// Offline tests for /api/video (Fill in from video) with a pretend Gemini.
const path = require('path');
const R = path.join(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

process.env.GEMINI_API_KEY = 'test-key-123';
delete process.env.GEMINI_MODEL;
const api = require(path.join(R, 'api/video.js'));

// ---- a pretend Gemini ----
const G = { gran: 262144, files: new Map(), uploads: new Map(), calls: [], gen: [], deleted: [], polls: 0, nextFile: 1 };
const UP = 'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=';
const json = (o, status, headers) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) });
let genPlan = []; // per call: {status, body} or a function(model, body)
async function fakeFetch(url, o) {
  o = o || {};
  const h = {}; Object.entries(o.headers || {}).forEach(([k, v]) => { h[k.toLowerCase()] = v; });
  const u = new URL(url);
  G.calls.push((o.method || 'GET') + ' ' + u.pathname + (u.search ? '?…' : ''));
  if (/flower\.mp4$/.test(u.pathname)) return new Response(Buffer.alloc(700000, 7));
  if (u.pathname === '/upload/v1beta/files' && !u.searchParams.get('upload_id')) {
    if (h['x-goog-api-key'] !== 'test-key-123') return json({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }, 400);
    const id = 'up' + G.nextFile;
    G.uploads.set(id, { size: Number(h['x-goog-upload-header-content-length']), type: h['x-goog-upload-header-content-type'], got: 0, parts: [] });
    return new Response('', { headers: { 'x-goog-upload-url': UP + id + '&upload_protocol=resumable', 'x-goog-upload-chunk-granularity': String(G.gran), 'x-goog-upload-status': 'active' } });
  }
  if (u.pathname === '/upload/v1beta/files') {
    const up = G.uploads.get(u.searchParams.get('upload_id'));
    if (h['x-goog-api-key']) G.keyOnUpload = true;
    const cmd = h['x-goog-upload-command'];
    if (cmd === 'query') return new Response('', { headers: { 'x-goog-upload-status': 'active', 'x-goog-upload-size-received': String(up.got) } });
    const body = Buffer.from(o.body);
    if (G.dropNext) { G.dropNext = false; return json({ error: { message: 'offset mismatch' } }, 400, { 'x-goog-upload-status': 'active' }); }
    if (Number(h['x-goog-upload-offset']) !== up.got) return json({ error: { message: 'offset mismatch' } }, 400, { 'x-goog-upload-status': 'active' });
    if (cmd === 'upload' && body.length % G.gran) return json({ error: { message: 'chunk not a multiple of granularity' } }, 400, { 'x-goog-upload-status': 'active' });
    up.got += body.length; up.parts.push(body.length);
    if (cmd === 'upload') return new Response('', { headers: { 'x-goog-upload-status': 'active' } });
    if (cmd === 'upload, finalize') {
      if (up.got !== up.size) return json({ error: { message: 'size mismatch' } }, 400);
      const name = 'files/vid' + (G.nextFile++);
      G.files.set(name, { name, uri: 'https://generativelanguage.googleapis.com/v1beta/' + name, mimeType: up.type, state: 'PROCESSING' });
      return json({ file: G.files.get(name) }, 200, { 'x-goog-upload-status': 'final' });
    }
  }
  const fm = u.pathname.match(/^\/v1beta\/(files\/[\w-]+)$/);
  if (fm) {
    const f = G.files.get(fm[1]);
    if ((o.method || 'GET') === 'DELETE') { G.deleted.push(fm[1]); G.files.delete(fm[1]); return json({}); }
    if (!f) return json({ error: { code: 404, message: 'File not found', status: 'NOT_FOUND' } }, 404);
    if (f.state === 'PROCESSING' && ++G.polls >= 2) f.state = 'ACTIVE';
    return json(f);
  }
  const gm = u.pathname.match(/^\/v1beta\/models\/([^:]+):generateContent$/);
  if (gm) {
    const body = JSON.parse(o.body);
    G.gen.push({ model: decodeURIComponent(gm[1]), body });
    const plan = genPlan.length ? genPlan.shift() : null;
    if (typeof plan === 'function') return plan(decodeURIComponent(gm[1]), body);
    if (plan) return json(plan.body, plan.status || 200);
    return json(answer(GOOD));
  }
  return json({ error: { message: 'unexpected ' + url } }, 500);
}
const answer = (obj, fin) => ({ candidates: [{ content: { parts: [{ text: 'thinking about it', thought: true }, { text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }, finishReason: fin || 'STOP' }], usageMetadata: { totalTokenCount: 4321 } });
const GOOD = {
  isRecipe: true, title: 'Crack Chicken Penne #dinner #easyrecipes',
  ingredients: ['1 lb penne', '## Sauce:', '- 8 oz cream cheese', '1 packet ranch seasoning', '• 1 cup shredded cheddar'],
  steps: ['1. Boil the penne until al dente.', 'Step 2: Melt the cream cheese with the ranch.', 'Toss everything together and top with cheese.'],
  notes: ['Use rotisserie chicken to save time.'], equipment: ['Large pot', 'Skillet'],
  totalTime: 30, servings: 4, cuisine: 'american', meals: ['Dinners', 'lunch', 'Brunch'], guesses: ['Amount of cheddar estimated']
};
api._setFetch(fakeFetch);

const call = (method, query, headers, body) => new Promise(resolve => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
    json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, end() { resolve({ code: this.code, headers: this.headers }); } };
  api({ method, query, headers: Object.assign({ origin: 'https://djvas1975.github.io' }, headers || {}), body }, res);
});

(async () => {
  // ---- who can use it ----
  const pre = await call('OPTIONS', {}, {});
  ok(pre.code === 204 && /POST/.test(pre.headers['Access-Control-Allow-Methods']) && /x-up/.test(pre.headers['Access-Control-Allow-Headers']), 'CORS lets the app post pieces with the upload address');
  ok((await call('POST', { op: 'start' }, { origin: 'https://evil.example' }, { size: 10 })).code === 403, 'other websites are turned away');
  ok((await call('POST', { op: 'start' }, { origin: undefined }, { size: 10 })).code === 403, 'calls without a browser origin are turned away');
  delete process.env.GEMINI_API_KEY;
  ok((await call('POST', { op: 'start' }, {}, { size: 10 })).body.needsKey === true, 'says when the Gemini key isn’t in Vercel');
  process.env.GEMINI_API_KEY = 'test-key-123';

  // ---- upload a 9.5 MB video in 4 MB pieces, like the phone does ----
  const size = 9.5 * 1024 * 1024;
  const video = Buffer.alloc(size, 3);
  const st = await call('POST', { op: 'start' }, {}, { size, type: 'video/mp4' });
  ok(st.body.ok && st.body.chunk === 4 * 1024 * 1024 && /^https:\/\/generativelanguage\.googleapis\.com\/upload\//.test(st.body.up), 'start: gives the upload address and 4 MB pieces (a multiple of Google’s 256 KB)');
  ok(st.body.chunk < 4.5e6, 'each piece fits under Vercel’s 4.5 MB limit');
  const tooBig = await call('POST', { op: 'start' }, {}, { size: 500 * 1024 * 1024, type: 'video/mp4' });
  ok(!tooBig.body.ok && /400 MB/.test(tooBig.body.error), 'a video over 400 MB is refused with a plain message');
  const evil = await call('POST', { op: 'chunk', off: 0 }, { 'x-up': 'https://evil.example/upload/x' }, Buffer.alloc(10));
  ok(evil.code === 400, 'pieces only go to Google’s upload address (no forwarding anywhere else)');
  let off = 0, last = null, n = 0;
  const up = st.body.up, piece = st.body.chunk;
  G.dropNext = true; // the first try of the first piece fails, like a dropped connection
  while (off < size) {
    const end = Math.min(off + piece, size);
    last = await call('POST', { op: 'chunk', off, last: end >= size ? '1' : '' }, { 'x-up': up, 'content-type': 'application/octet-stream' }, video.subarray(off, end));
    n++;
    if (!last.body.ok) { ok(last.body.got === 0, 'a dropped piece reports how much Gemini has (0), so the phone resends from there'); off = last.body.got; continue; }
    off = end;
  }
  ok(last.body.ok && last.body.file && last.body.file.name === 'files/vid1' && n === 4, 'the last piece finishes the upload and returns the file (3 pieces + 1 resend)');
  ok(!G.keyOnUpload, 'the key isn’t sent with the pieces (the upload address is enough)');
  ok(G.uploads.get('up1').parts.join(',') === [4194304, 4194304, 1572864].join(','), 'Gemini got 4 MB, 4 MB, then the rest');

  // ---- wait for Gemini to get it ready ----
  const s1 = await call('POST', { op: 'state' }, {}, { name: 'files/vid1' });
  const s2 = await call('POST', { op: 'state' }, {}, { name: 'files/vid1' });
  ok(s1.body.state === 'PROCESSING' && s2.body.state === 'ACTIVE', 'state: PROCESSING, then ACTIVE');
  const badName = await call('POST', { op: 'state' }, {}, { name: '../../etc' });
  ok(!badName.body.ok, 'a made-up file name is refused');

  // ---- write the recipe: the first model is out of free uses, so the next one answers ----
  genPlan = [{ status: 429, body: { error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } } }];
  const mk = await call('POST', { op: 'make' }, {}, { name: 'files/vid1', dur: 45, title: 'chicken pasta', caption: 'So easy!! #dinner' });
  const r = mk.body.recipe || {};
  ok(mk.body.ok && mk.body.model === api.MODELS[1], 'free limit on the first model: the next free model writes it (' + mk.body.model + ')');
  ok(G.gen[0].model === 'gemini-3.8-flash', 'tries gemini-3.8-flash first');
  ok(r.title === 'Crack Chicken Penne', 'title without hashtags');
  ok(JSON.stringify(r.ingredients) === JSON.stringify(['1 lb penne', '## Sauce', '8 oz cream cheese', '1 packet ranch seasoning', '1 cup shredded cheddar']), 'ingredients: bullets dropped, "Sauce:" becomes a ## heading');
  ok(JSON.stringify(r.steps) === JSON.stringify(['Boil the penne until al dente.', 'Melt the cream cheese with the ranch.', 'Toss everything together and top with cheese.']), 'steps: "1." and "Step 2:" taken off (the app numbers them)');
  ok(r.cuisine === 'American' && JSON.stringify(r.meals) === JSON.stringify(['Dinner', 'Lunch']), 'cuisine and meals match the app’s own lists (Brunch dropped)');
  ok(r.totalTime === 30 && r.servings === 4 && r.guesses.length === 1 && r.notes.length === 1 && r.equipment.length === 2, 'time, servings, notes, cookware and guesses come through');
  ok(G.deleted.indexOf('files/vid1') >= 0, 'the video is deleted from Gemini once the recipe is written');
  const sent = G.gen[1].body;
  const prompt = sent.contents[0].parts[1].text;
  ok(sent.contents[0].parts[0].fileData.fileUri.endsWith('files/vid1') && sent.contents[0].parts[0].fileData.mimeType === 'video/mp4', 'the uploaded video is sent by its Gemini address');
  ok(/chicken pasta/.test(prompt) && /So easy/.test(prompt) && /own words/.test(prompt), 'the prompt has the saved name and caption, and asks for steps in its own words');
  ok(sent.generationConfig.responseMimeType === 'application/json' && sent.generationConfig.responseSchema.properties.ingredients && !sent.generationConfig.mediaResolution, 'asks for JSON in the recipe’s shape, full detail for a short clip');
  ok(!/test-key-123/.test(JSON.stringify(mk.body)), 'the key never shows up in an answer');

  // ---- YouTube: no upload, low detail, and a quote-blocked answer gets one more try ----
  genPlan = [{ body: { candidates: [{ finishReason: 'RECITATION' }] } }];
  const yt = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  const g2 = G.gen.slice(-2);
  ok(yt.body.ok && g2.length === 2 && /own words\. Do not copy/.test(g2[1].body.contents[0].parts[1].text), 'blocked for quoting: asks once more, in its own words, and gets it');
  ok(g2[0].body.contents[0].parts[0].fileData.fileUri === 'https://www.youtube.com/watch?v=LrCEvNIyX-I' && g2[0].body.generationConfig.mediaResolution === 'MEDIA_RESOLUTION_LOW', 'YouTube link goes straight to Gemini at low detail');
  const ytBad = await call('POST', { op: 'make' }, {}, { youtube: 'not-an-id' });
  ok(!ytBad.body.ok && /YouTube link/.test(ytBad.body.error), 'a bad YouTube id gets a plain message');

  // ---- not a recipe, garbled answers, a bad key ----
  genPlan = [{ body: answer({ isRecipe: false, title: 'Flowers', ingredients: [], steps: [], notes: [], equipment: [], totalTime: 0, servings: 0, cuisine: '', meals: [], guesses: [] }) }];
  const nr = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(nr.body.ok && nr.body.recipe.isRecipe === false, 'a video with no recipe comes back as isRecipe:false');
  genPlan = [{ body: answer('```json\n' + JSON.stringify(GOOD) + '\n```') }];
  const fenced = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(fenced.body.ok && fenced.body.recipe.ingredients.length === 5, 'JSON wrapped in ``` still reads');
  genPlan = [{ body: answer('sorry, no') }, { body: answer('still no') }, { body: answer('no') }, { body: answer('no') }, { body: answer('no') }, { body: answer('no') }];
  const garbled = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(!garbled.body.ok && /garbled/.test(garbled.body.error), 'an answer that isn’t JSON gets a plain message');
  genPlan = [{ status: 400, body: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } } }];
  const badKey = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(!badKey.body.ok && /key in Vercel isn’t working/.test(badKey.body.error), 'a bad key says so in plain words');
  genPlan = [404, 404, 404].map(() => ({ status: 404, body: { error: { code: 404, message: 'models/x is not found for API version v1beta', status: 'NOT_FOUND' } } }));
  const gone = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(!gone.body.ok && G.gen.slice(-3).map(x => x.model).join() === api.MODELS.join(), 'tries every free model before giving up');

  // ---- cancel ----
  G.files.set('files/vid9', { name: 'files/vid9', state: 'ACTIVE', uri: 'x', mimeType: 'video/mp4' });
  const drop = await call('POST', { op: 'drop' }, {}, { name: 'files/vid9' });
  ok(drop.body.ok && !G.files.has('files/vid9'), 'Cancel deletes the uploaded video');

  // ---- the health check runs the whole thing and never shows the key ----
  genPlan = [];
  const self = await call('GET', { op: 'selftest' }, { origin: undefined });
  const names = (self.body.checks || []).map(c => c.step + (c.ok ? '' : ' (failed)'));
  ok(self.body.ok && names.join(' | ') === 'sample video | start upload | send pieces | Gemini got it ready | write recipe (uploaded video) | write recipe (YouTube)', 'selftest: ' + names.join(' | '));
  ok(self.body.checks[2].pieces === 3, 'selftest sends the sample in several small pieces, like the phone');
  ok(/set \(12 characters\)/.test(self.body.key) && !/test-key-123/.test(JSON.stringify(self.body)), 'selftest says the key is set without showing it');

  // ---- tidy on its own ----
  const t = api._tidy({ title: 'X', ingredients: 'a\nb', steps: ['For the topping:', '1) Bake it'], meals: ['Desserts'] });
  ok(t.ingredients.length === 2 && t.steps[0] === '## For the topping' && t.steps[1] === 'Bake it' && t.meals[0] === 'Dessert', 'tidy handles text lists, "For the topping:" headings, 1) steps, plural meals');

  console.log(fails ? '\n' + fails + ' FAILED' : '\nAll video tests passed');
  process.exit(fails ? 1 : 0);
})();
