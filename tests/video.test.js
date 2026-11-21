// Offline tests for /api/video (Fill in from video) with a pretend Gemini.
const path = require('path');
const R = path.join(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

process.env.GEMINI_API_KEY = 'test-key-123';
delete process.env.GEMINI_MODEL;
const api = require(path.join(R, 'api/video.js'));

// ---- a pretend Gemini ----
const G = { nextUp: 1, gran: 262144, files: new Map(), uploads: new Map(), calls: [], gen: [], deleted: [], polls: 0, nextFile: 1 };
const UP = 'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=';
const json = (o, status, headers) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}) });
let genPlan = []; // per call: {status, body} or a function(model, body)
async function fakeFetch(url, o) {
  o = o || {};
  const h = {}; Object.entries(o.headers || {}).forEach(([k, v]) => { h[k.toLowerCase()] = v; });
  const u = new URL(url);
  G.calls.push((o.method || 'GET') + ' ' + u.pathname + (u.search ? '?…' : ''));
  if (/flower\.mp4$/.test(u.pathname)) return new Response(Buffer.alloc(700000, 7));
  if (/caption-shot\.jpg$/.test(u.pathname)) { G.imgFetched = u.href; return new Response(Buffer.alloc(90000, 9)); }
  if (u.pathname === '/upload/v1beta/files' && !u.searchParams.get('upload_id')) {
    if (h['x-goog-api-key'] !== 'test-key-123') return json({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }, 400);
    const id = 'up' + (G.nextUp++);
    G.uploads.set(id, { size: Number(h['x-goog-upload-header-content-length']), type: h['x-goog-upload-header-content-type'], got: 0, parts: [], origin: h.origin });
    return new Response('', { headers: { 'x-goog-upload-url': UP + id + '&upload_protocol=resumable', 'x-goog-upload-chunk-granularity': String(G.gran), 'x-goog-upload-status': 'active' } });
  }
  if (u.pathname === '/upload/v1beta/files') {
    const up = G.uploads.get(u.searchParams.get('upload_id'));
    const ac = up.origin && h.origin === up.origin ? { 'access-control-allow-origin': up.origin } : {};
    if (o.method === 'OPTIONS') return new Response(null, { status: 200, headers: Object.assign({ 'access-control-allow-methods': 'POST,PUT', 'access-control-allow-headers': 'content-type,x-goog-upload-command,x-goog-upload-offset' }, ac) });
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
      return json({ file: G.files.get(name) }, 200, Object.assign({ 'x-goog-upload-status': 'final' }, ac));
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
    if (typeof plan === 'function') return plan(decodeURIComponent(gm[1]), body, o);
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
  ok(pre.code === 204 && /POST/.test(pre.headers['Access-Control-Allow-Methods']) && /content-type/.test(pre.headers['Access-Control-Allow-Headers']), 'CORS lets the app post JSON');
  ok((await call('POST', { op: 'start' }, { origin: 'https://evil.example' }, { size: 10 })).code === 403, 'other websites are turned away');
  ok((await call('POST', { op: 'start' }, { origin: undefined }, { size: 10 })).code === 403, 'calls without a browser origin are turned away');
  delete process.env.GEMINI_API_KEY;
  ok((await call('POST', { op: 'start' }, {}, { size: 10 })).body.needsKey === true, 'says when the Gemini key isn’t in Vercel');
  process.env.GEMINI_API_KEY = 'test-key-123';

  // ---- start: the phone gets Gemini's upload address (the key stays in Vercel) and sends the video itself ----
  const size = 9.5 * 1024 * 1024;
  const st = await call('POST', { op: 'start' }, {}, { size, type: 'video/mp4' });
  ok(st.body.ok && /^https:\/\/generativelanguage\.googleapis\.com\/upload\//.test(st.body.up) && !/test-key-123/.test(st.body.up), 'start: gives Gemini’s upload address, without the key');
  ok(G.uploads.get('up1').origin === 'https://djvas1975.github.io' && G.uploads.get('up1').size === size && G.uploads.get('up1').type === 'video/mp4', 'the upload is started for the app’s own site, with the size and type');
  const tooBig = await call('POST', { op: 'start' }, {}, { size: 500 * 1024 * 1024, type: 'video/mp4' });
  ok(!tooBig.body.ok && /400 MB/.test(tooBig.body.error), 'a video over 400 MB is refused with a plain message');
  const odd = await call('POST', { op: 'start' }, {}, { size: 1000, type: 'text/html' });
  ok(odd.body.ok && G.uploads.get('up2').type === 'video/mp4', 'a file type that isn’t video is sent as video/mp4');
  // the phone's own upload (in the app this is an XMLHttpRequest from the phone to Google)
  const upRes = await fakeFetch(st.body.up, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0', Origin: 'https://djvas1975.github.io' }, body: Buffer.alloc(size, 3) });
  const sj = await upRes.json();
  ok(upRes.ok && sj.file.name === 'files/vid1' && upRes.headers.get('access-control-allow-origin') === 'https://djvas1975.github.io', '(pretend Gemini) the whole file in one request comes back as files/vid1, readable by the app');

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
  ok(G.gen[0].model === 'gemini-3.6-flash', 'tries gemini-3.6-flash first (3.8 Flash was the slow one on Nov 21, 2026)');
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

  // ---- pictures (v2.4): screenshots of a caption, or a cookbook page ----
  {
  const pic = n => Buffer.alloc(n, 5).toString('base64');
  G.gen = []; genPlan = [];
  const shot = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(40000), type: 'image/jpeg' }, { data: 'data:image/png;base64,' + pic(30000), type: 'image/png' }], title: '', caption: 'Creamy chicken… more' });
  const sentP = G.gen[0] && G.gen[0].body.contents[0].parts;
  ok(G.gen[0] && G.gen[0].model === 'gemini-3.5-flash-lite', 'pictures: the fast lite model is asked first -> ' + (G.gen[0] && G.gen[0].model));
  ok(shot.body.ok && shot.body.recipe.title === 'Crack Chicken Penne' && shot.body.recipe.ingredients[1] === '## Sauce', 'pictures: the recipe comes back tidied like a video’s -> ' + JSON.stringify(shot.body.recipe && shot.body.recipe.ingredients));
  ok(sentP && sentP.length === 3 && sentP[0].inlineData.mimeType === "image/jpeg" && sentP[1].inlineData.mimeType === "image/png" && !/^data:/.test(sentP[1].inlineData.data) && /2 pictures, in order/.test(sentP[2].text) && /Ignore the app around it/.test(sentP[2].text) && /Creamy chicken/.test(sentP[2].text), 'pictures: both go to Gemini in order with the screenshot prompt and the caption so far');
  const noPics = await call('POST', { op: 'image' }, {}, { images: [] });
  ok(!noPics.body.ok && /Pick a screenshot/.test(noPics.body.error), 'pictures: none sent -> plain message');
  const tooMany = await call('POST', { op: 'image' }, {}, { images: Array.from({ length: 9 }, () => ({ data: pic(2000), type: 'image/jpeg' })) });
  ok(!tooMany.body.ok && /up to 8/.test(tooMany.body.error), 'pictures: more than 8 -> plain message');
  const tooBig = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(1800000), type: 'image/jpeg' }] });
  ok(!tooBig.body.ok && /too big/.test(tooBig.body.error), 'pictures: one too big -> plain message');
  const bigTogether = await call('POST', { op: 'image' }, {}, { images: [1, 2, 3].map(() => ({ data: pic(1200000), type: 'image/jpeg' })) });
  ok(!bigTogether.body.ok && /too big together/.test(bigTogether.body.error), 'pictures: too big together -> plain message');
  const junk = await call('POST', { op: 'image' }, {}, { images: [{ data: 'not base64 !!', type: 'image/jpeg' }] });
  ok(!junk.body.ok && /didn’t come through/.test(junk.body.error), 'pictures: broken data -> plain message');
  genPlan = [{ body: answer({ isRecipe: false, title: '', ingredients: [], steps: [], notes: [], equipment: [], totalTime: 0, servings: 0, cuisine: '', meals: [], guesses: [] }) }];
  const notRecipe = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(5000), type: 'image/webp' }] });
  ok(notRecipe.body.ok && notRecipe.body.recipe.isRecipe === false, 'pictures: no recipe in them -> isRecipe false');
  genPlan = [{ body: { candidates: [{ finishReason: 'RECITATION' }] } }];
  G.gen = [];
  const recite = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(5000), type: 'image/jpeg' }] });
  ok(recite.body.ok && G.gen.length === 2 && /own words/.test(G.gen[1].body.contents[0].parts[1].text), 'pictures: a quoting block gets one more try in its own words');
  genPlan = [{ status: 429, body: { error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } } }];
  G.gen = [];
  const next = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(5000), type: 'image/heic' }] });
  ok(next.body.ok && G.gen.map(x => x.model).join() === api.PIC_MODELS.slice(0, 2).join() && G.gen[1].body.contents[0].parts[0].inlineData.mimeType === 'image/heic', 'pictures: a used-up free limit moves on to the next model (HEIC photos go as they are)');
  genPlan = api.PIC_MODELS.map(() => ({ status: 429, body: { error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } } }));
  G.gen = [];
  const fallback = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(5000), type: 'image/jpeg' }] });
  ok(fallback.body.ok && G.gen.map(x => x.model).join() === api.PIC_MODELS.concat(api.MODELS[0]).join(), 'pictures: when the lite models are used up, the regular models still answer -> ' + G.gen.map(x => x.model).join());
  // a model that takes too long: the next one is asked (Vercel would stop the whole thing at 180 s)
  const hang = (m, b, o) => new Promise((res, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))));
  api._limits.pictures = 200; api._limits.video = 300;
  genPlan = [hang];
  G.gen = [];
  const slow = await call('POST', { op: 'image' }, {}, { images: [{ data: pic(5000), type: 'image/jpeg' }] });
  ok(slow.body.ok && G.gen.map(x => x.model).join() === api.PIC_MODELS.slice(0, 2).join(), 'pictures: a model that hangs is dropped for the next one -> ' + G.gen.map(x => x.model).join());
  genPlan = [hang, hang, hang, hang, hang, hang];
  G.gen = [];
  const slowAll = await call('POST', { op: 'make' }, {}, { youtube: 'LrCEvNIyX-I' });
  ok(!slowAll.body.ok && /slow right now/.test(slowAll.body.error) && G.gen.length === api.MODELS.length, 'video: every model too slow -> "Gemini is slow right now", one try each');
  api._limits.pictures = 40000; api._limits.video = 80000;
  const evil = await call('POST', { op: 'image' }, { origin: 'https://evil.example' }, { images: [{ data: pic(5000), type: 'image/jpeg' }] });
  ok(evil.code === 403, 'pictures: other websites are turned away');
  }

  // ---- cancel ----
  G.files.set('files/vid9', { name: 'files/vid9', state: 'ACTIVE', uri: 'x', mimeType: 'video/mp4' });
  const drop = await call('POST', { op: 'drop' }, {}, { name: 'files/vid9' });
  ok(drop.body.ok && !G.files.has('files/vid9'), 'Cancel deletes the uploaded video');

  // ---- the health check runs the whole thing and never shows the key ----
  genPlan = [];
  const self = await call('GET', { op: 'selftest' }, { origin: undefined });
  const names = (self.body.checks || []).map(c => c.step + (c.ok ? '' : ' (failed)'));
  ok(self.body.ok && names.join(' | ') === 'sample video | start upload | phone may send it (preflight) | send it like the phone | Gemini got it ready | write recipe (uploaded video) | sample picture | write recipe (picture) | write recipe (YouTube)', 'selftest: ' + names.join(' | '));
  G.imgFetched = '';
  await call('GET', { op: 'selftest', only: 'image', img: 'https://evil.example/x.jpg' }, { origin: undefined });
  ok(/^https:\/\/djvas1975\.github\.io\/yumyumtumtum\/tests\/fixtures\/caption-shot\.jpg$/.test(G.imgFetched), 'selftest only fetches a sample picture from the app’s own sites -> ' + G.imgFetched);
  ok(self.body.checks[2].allowOrigin === 'https://djvas1975.github.io' && self.body.checks[3].allowOrigin === 'https://djvas1975.github.io', 'selftest reports whether Google lets the app’s site send and read the upload');
  ok(/set \(12 characters\)/.test(self.body.key) && !/test-key-123/.test(JSON.stringify(self.body)), 'selftest says the key is set without showing it');

  // ---- tidy on its own ----
  const t = api._tidy({ title: 'X', ingredients: 'a\nb', steps: ['For the topping:', '1) Bake it'], meals: ['Desserts'] });
  ok(t.ingredients.length === 2 && t.steps[0] === '## For the topping' && t.steps[1] === 'Bake it' && t.meals[0] === 'Dessert', 'tidy handles text lists, "For the topping:" headings, 1) steps, plural meals');

  // ---- v2.4.1: screenshots in another language, units kept, nothing made up ----
  const pp = api._picturePrompt({ title: '', caption: '' }, false, 1);
  ok(/translate the name, ingredients, steps and notes into English/.test(pp) && /Never convert numbers, units or temperatures/.test(pp) && /"180 °C" stays "180 °C"/.test(pp) && /"500 g de carne" becomes "500 g beef"/.test(pp), 'the screenshot prompt: translate into English, never convert amounts, units or temperatures');
  ok(/If no steps are written, leave steps empty/.test(pp) && /Do not add ingredients, amounts or steps that are not in the pictures/.test(pp) && /seems to be missing/.test(pp), 'the screenshot prompt: no made-up steps or amounts; missing things go in the guesses');
  ok(/- language:/.test(pp), 'the screenshot prompt asks which language it was in');
  ok(/"Salsa Verde for Tacos" \(from "Salsa verde para tacos"\)/.test(pp) && /Don't add up step times/.test(pp) && /Remember: everything you write is in English/.test(pp), 'the screenshot prompt: the name in English too, no total worked out from step times, and a last reminder to write in English');
  const onePic = Buffer.alloc(5000, 5).toString('base64');
  // a Spanish screenshot that comes back still in Spanish is asked once more, firmly, of the next stronger model
  const ES_BACK = { isRecipe: true, title: 'Cochinita Pibil al Horno', language: 'Spanish', ingredients: ['1 kg pierna de cerdo en trozos', '100 g pasta de achiote', '1 taza jugo de naranja agria', '250 ml agua', 'Sal al gusto'], steps: ['Licúa el achiote con los jugos.', 'Hornea tapado a 180 °C durante 2 horas.'], notes: [], equipment: [], totalTime: 0, servings: 0, cuisine: 'Mexican', meals: ['Dinner'], guesses: [] };
  const EN_BACK = Object.assign({}, ES_BACK, { title: 'Baked Cochinita Pibil', ingredients: ['1 kg pork leg in chunks', '100 g achiote paste', '1 cup sour orange juice', '250 ml water', 'Salt to taste'], steps: ['Blend the achiote with the juices.', 'Bake covered at 180 °C for 2 hours.'] });
  ok(api._stillSpanish(api._tidy(ES_BACK)) && !api._stillSpanish(api._tidy(EN_BACK)) && !api._stillSpanish(api._tidy(Object.assign({}, EN_BACK, { language: '' }))) && !api._stillSpanish(api._tidy(Object.assign({}, EN_BACK, { ingredients: ['1 lb ground beef', '1 can chili con carne beans', '1 cup pico de gallo', '2 cups water', 'Salt'] }))), 'still-in-Spanish check: catches Spanish lines, not English ones (even "chili con carne" or "pico de gallo")');
  G.gen = []; genPlan = [{ body: answer(ES_BACK) }, { body: answer(EN_BACK) }];
  const es = await call('POST', { op: 'image' }, {}, { images: [{ data: onePic, type: 'image/jpeg' }] });
  ok(es.body.ok && es.body.recipe.ingredients[0] === '1 kg pork leg in chunks' && es.body.recipe.steps[1] === 'Bake covered at 180 °C for 2 hours.' && es.body.recipe.language === 'Spanish' && G.gen.length === 2 && G.gen[0].model === 'gemini-3.5-flash-lite' && G.gen[1].model === 'gemini-3.6-flash' && /Your last answer left words in Spanish/.test(G.gen[1].body.contents[0].parts.slice(-1)[0].text), 'a Spanish screenshot answered in Spanish is asked again, firmly, of gemini-3.6-flash, and the English answer is used -> ' + G.gen.map(x => x.model).join(', '));
  G.gen = []; genPlan = [{ body: answer(ES_BACK) }, { body: answer(ES_BACK) }];
  const es2 = await call('POST', { op: 'image' }, {}, { images: [{ data: onePic, type: 'image/jpeg' }] });
  ok(es2.body.ok && es2.body.recipe.ingredients[0] === '1 kg pierna de cerdo en trozos' && G.gen.length === 2, 'if the second answer is still Spanish, the first one comes back (only one extra try)');
  G.gen = []; genPlan = [{ body: answer(Object.assign({}, EN_BACK, { language: '' })) }];
  await call('POST', { op: 'image' }, {}, { images: [{ data: onePic, type: 'image/jpeg' }] });
  ok(G.gen.length === 1, 'an English screenshot is asked only once');
  // v2.5: who posted it, which app, where the food is
  ok(/- creator: the username of the person who posted it/.test(pp) && /- app: which app the screenshot is from/.test(pp) && /- photo: if a picture shows the food itself/.test(pp) && /normalized to 0-1000/.test(pp), 'the screenshot prompt asks for the creator, the app and a box around the food');
  const t5 = api._tidy({ title: 'X', ingredients: ['1 cup milk'], creator: 'cocina_de_tia_lupe', app: 'Instagram', photo: { pic: 1, box_2d: [40, 60, 520, 940] } });
  ok(t5.creator === '@cocina_de_tia_lupe' && t5.app === 'instagram' && t5.photo && t5.photo.pic === 1 && t5.photo.box.join() === '40,60,520,940', 'tidy: "@name", the app, and the food box -> ' + JSON.stringify([t5.creator, t5.app, t5.photo]));
  ok(api._handleOf('@@Tia Lupe') === '@TiaLupe' && api._handleOf('a') === '' && api._handleOf('Tía Lupe!') === '' && api._handleOf('.dot') === '' && api._tidy({ title: 'X', ingredients: ['a'], app: 'cookbook' }).app === '', 'tidy: odd usernames and unknown apps come back empty');
  ok(api._photoOf({ pic: 0, box_2d: [0, 0, 1000, 1000] }) === null && api._photoOf({ pic: 1, box_2d: [100, 100, 200, 900] }) === null && api._photoOf({ pic: 2, box_2d: [-5, 10, 1200, 600] }).box.join() === '0,10,1000,600' && api._photoOf({ pic: 1, box_2d: [1, 2, 3] }) === null && api._tidy({ title: 'X', ingredients: ['a'] }).photo === null, 'tidy: no food (pic 0), a sliver under 15%, or a broken box gives no photo; out-of-range edges are clamped');
  ok(api._tidy({ title: 'X', ingredients: ['1 cup milk'], language: 'spanish' }).language === 'Spanish' && api._tidy({ title: 'X', ingredients: ['1 cup milk'], language: 'English' }).language === '' && api._tidy({ title: 'X', ingredients: ['1 cup milk'] }).language === '', 'tidy keeps the language ("Spanish"), and English or nothing comes back empty');

  console.log(fails ? '\n' + fails + ' FAILED' : '\nAll video tests passed');
  process.exit(fails ? 1 : 0);
})();
