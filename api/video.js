// Fill in a recipe from a video, with Google's Gemini (free tier). Dave's key lives in Vercel only
// (Settings > Environment Variables > GEMINI_API_KEY, a Secret), never in this repo.
//
// A video from the phone goes straight from the phone to Gemini's upload address, which this function asks Gemini for
// with the key (so the key never leaves Vercel). Vercel can't pass it along itself: it takes at most 4.5 MB per request,
// and Gemini wants pieces of 8 MB or more (found live Oct 17, 2026). The video is never stored in Vercel; Gemini keeps it
// until the recipe is written, then it's deleted. A YouTube link goes straight to Gemini (public videos only).
//
// POST /api/video?op=start            {size, type}            -> {ok, up}   up = Gemini's one-time upload address. The
//                                     phone sends the whole file there: POST, X-Goog-Upload-Command: upload, finalize,
//                                     X-Goog-Upload-Offset: 0 -> {file:{name, state}}
// POST /api/video?op=state            {name}                   -> {ok, state:'PROCESSING'|'ACTIVE'|'FAILED'}
// POST /api/video?op=make             {name} or {youtube:<id>}, plus {dur, title, caption}
//                                     -> {ok, recipe:{isRecipe,title,ingredients,steps,notes,equipment,totalTime,
//                                         servings,cuisine,meals,guesses}, model}; the uploaded video is deleted
// POST /api/video?op=drop             {name}                   -> deletes an uploaded video (Cancel)
// GET  /api/video?op=selftest[&only=upload|youtube][&yt=<id>]  -> runs the whole thing on a small sample video and a
//                                     YouTube Short with the real key, and reports each step (never the key)
//
// Only the app (a browser on https://djvas1975.github.io) can use the POST calls. The free tier has no bill, so the
// worst a stranger could do is use up the day's free limit.

const { cors } = require('../lib/parse');

const API = 'https://generativelanguage.googleapis.com';
// free-tier models, best first (checked Oct 17, 2026 on ai.google.dev/gemini-api/docs/pricing); GEMINI_MODEL overrides
const MODELS = String(process.env.GEMINI_MODEL || 'gemini-3.8-flash,gemini-3.6-flash,gemini-3-flash-preview')
  .split(',').map(s => s.trim()).filter(Boolean);
const MAX_VIDEO = 400 * 1024 * 1024;
const SAMPLE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SAMPLE_YT = 'LrCEvNIyX-I';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side', 'Drink'];
const CUISINES = ['American', 'Asian', 'BBQ', 'Cajun', 'Caribbean', 'Chinese', 'Cuban', 'Filipino', 'French', 'German', 'Greek', 'Hawaiian', 'Indian', 'Italian', 'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Middle Eastern', 'Puerto Rican', 'Salvadoran', 'Southern', 'Spanish', 'Tex-Mex', 'Thai', 'Vietnamese'];

let FETCH = null; // tests swap in a fake Gemini
const go = (...a) => (FETCH || fetch)(...a);
const wait = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const op = String(qp.op || '');
  const key = process.env.GEMINI_API_KEY || '';
  if (op === 'selftest') { await selftest(req, res, key, qp); return; }
  res.setHeader('Cache-Control', 'private, no-store');
  if (!key) { res.status(200).json({ ok: false, needsKey: true, error: 'The Gemini key isn’t set up in Vercel yet.' }); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Use POST.' }); return; }
  if (!(req.headers || {}).origin) { res.status(403).json({ ok: false, error: 'Only the YumYum app can use this.' }); return; }
  try {
    if (op === 'start') {
      const b = await bodyJson(req);
      res.status(200).json(Object.assign({ ok: true }, await startUpload(key, b.size, b.type, req.headers.origin)));
      return;
    }
    if (op === 'state') {
      const b = await bodyJson(req);
      const file = await getFile(key, b.name);
      res.status(200).json({ ok: true, state: file.state || 'PROCESSING', error: file.error ? String(file.error.message || 'Gemini couldn’t open that video.') : undefined });
      return;
    }
    if (op === 'make') {
      const b = await bodyJson(req);
      res.status(200).json(Object.assign({ ok: true }, await makeRecipe(key, b)));
      return;
    }
    if (op === 'drop') {
      const b = await bodyJson(req);
      if (goodName(b.name)) await dropFile(key, b.name);
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ ok: false, error: 'Unknown request.' });
  } catch (e) {
    res.status(200).json({ ok: false, error: plain(e), detail: String((e && e.message) || e).slice(0, 300), status: e && e.status });
  }
};

/* ---------- upload ---------- */
async function startUpload(key, size, type, origin) {
  size = Math.floor(Number(size) || 0);
  if (!(size > 0)) throw usr('That video file looks empty.');
  if (size > MAX_VIDEO) throw usr('That video is over 400 MB. Try a shorter one.');
  type = /^video\/[\w.+-]{1,40}$/.test(String(type || '')) ? String(type) : 'video/mp4';
  const r = await go(API + '/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(size),
      'X-Goog-Upload-Header-Content-Type': type,
      'Content-Type': 'application/json',
      // the browser that will send the bytes: Google's upload servers answer cross-site requests for the origin the
      // session was started for (Cloud Storage documents this for resumable uploads)
      ...(origin ? { Origin: String(origin) } : {})
    },
    body: JSON.stringify({ file: { display_name: 'yumyum-' + Date.now() } })
  });
  if (!r.ok) throw gErr(r.status, await r.text());
  const up = r.headers.get('x-goog-upload-url');
  if (!goodUp(up)) throw usr('Gemini didn’t give an upload address.');
  // (pieces before the last would have to be multiples of this; the phone sends the whole file at once)
  const gran = parseInt(r.headers.get('x-goog-upload-chunk-granularity'), 10) || 0;
  return { up, gran };
}
// what the phone does with the upload address, done from here for the health check (with the app's Origin, so the
// answer shows whether Google lets the phone read it)
async function sendLikePhone(up, buf, origin) {
  const r = await go(up, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0', 'Content-Type': 'video/mp4', Origin: origin }, body: buf });
  const text = await r.text();
  let j = {}; try { j = JSON.parse(text); } catch (e) {}
  const f = j.file || {};
  return { status: r.status, allowOrigin: r.headers.get('access-control-allow-origin'), file: goodName(f.name) ? { name: f.name, state: f.state } : null, detail: r.ok ? undefined : text.slice(0, 200) };
}
// the check a browser makes before sending the video to another site
async function preflight(up, origin) {
  const r = await go(up, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-goog-upload-command,x-goog-upload-offset' } });
  return { status: r.status, allowOrigin: r.headers.get('access-control-allow-origin'), allowMethods: r.headers.get('access-control-allow-methods'), allowHeaders: r.headers.get('access-control-allow-headers') };
}
function goodUp(u) {
  let x; try { x = new URL(String(u || '')); } catch (e) { return false; }
  return x.protocol === 'https:' && x.hostname === 'generativelanguage.googleapis.com' && x.pathname.startsWith('/upload/');
}
const goodName = n => /^files\/[a-z0-9-]{1,80}$/i.test(String(n || ''));
async function getFile(key, name) {
  if (!goodName(name)) throw usr('That video isn’t on Gemini anymore. Try again.');
  const r = await go(API + '/v1beta/' + name, { headers: { 'x-goog-api-key': key } });
  if (!r.ok) throw gErr(r.status, await r.text());
  return r.json();
}
async function dropFile(key, name) {
  try { await go(API + '/v1beta/' + name, { method: 'DELETE', headers: { 'x-goog-api-key': key } }); } catch (e) {}
}

/* ---------- write the recipe ---------- */
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isRecipe: { type: 'BOOLEAN', description: 'false if this is not a cooking or drink-making video' },
    title: { type: 'STRING', description: 'Short name of the dish, no emoji or hashtags' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: 'One ingredient per item, amount first. Section headings start with "## "' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: 'One step per item, in order, in your own words, no numbering' },
    notes: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tips, swaps or warnings the cook gives' },
    equipment: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Pans, appliances and tools used' },
    totalTime: { type: 'INTEGER', description: 'Total minutes, 0 if unknown' },
    servings: { type: 'INTEGER', description: 'Servings, 0 if unknown' },
    cuisine: { type: 'STRING' },
    meals: { type: 'ARRAY', items: { type: 'STRING' } },
    guesses: { type: 'ARRAY', items: { type: 'STRING' }, description: 'What you estimated instead of seeing or hearing it' }
  },
  required: ['isRecipe', 'title', 'ingredients', 'steps', 'notes', 'equipment', 'totalTime', 'servings', 'cuisine', 'meals', 'guesses']
};

function promptFor(b, ownWords) {
  const title = clip(b.title, 140);
  const caption = clip(b.caption, 4000);
  return [
    'You are filling in a recipe card in a home cook\'s recipe app from a cooking video.',
    'Watch the whole video and listen to everything that is said. Use what is shown (text on screen, labels, measuring cups, packages) and what is said.',
    title ? 'The cook saved it as: "' + title + '".' : '',
    caption ? 'The caption posted with the video (it may or may not have the recipe in it):\n"""\n' + caption + '\n"""' : '',
    'Write the recipe in plain American English, even if the video is in another language.',
    '- title: the dish\'s name, short, like "Crack Chicken Penne".',
    '- ingredients: one item each, amount first when known, like "2 lb chicken thighs", "1 cup shredded cheddar", "Salt and pepper, to taste". If the recipe has parts (a sauce, a topping), put a heading line before each part, like "## For the sauce". Only list what the video or caption uses. When no amount is shown or said, leave the amount out instead of making one up, unless it is clear from what you see; then say "about", like "about 1 cup broth".',
    '- steps: what to do, in order, one step each, a sentence or two, in your own words. No numbers at the start. Keep temperatures and times when given.',
    '- notes: tips, swaps or warnings the cook mentions. Empty if none.',
    '- equipment: pans, appliances and tools used, like "Large skillet", "Air fryer", "9x13 baking dish".',
    '- totalTime: total minutes if said or clear, else 0. servings: if said, else 0.',
    '- cuisine: one of ' + CUISINES.join(', ') + ', or "" if none fits.',
    '- meals: any of ' + MEALS.join(', ') + ' that fit.',
    '- guesses: short notes on anything you estimated, like "Amount of cheese estimated from the video". Empty if nothing.',
    '- isRecipe: false if this is not a cooking or drink-making video, and then leave the lists empty.',
    'Do not add ingredients or steps that are not in the video or the caption.',
    ownWords ? 'Write every step and note in your own words. Do not copy any text word for word.' : ''
  ].filter(Boolean).join('\n');
}

async function makeRecipe(key, b) {
  b = b || {};
  let part, name = '';
  if (b.youtube) {
    const id = String(b.youtube).match(/^[\w-]{11}$/) ? String(b.youtube) : '';
    if (!id) throw usr('That YouTube link doesn’t look right.');
    part = { fileData: { fileUri: 'https://www.youtube.com/watch?v=' + id } };
  } else {
    name = String(b.name || '');
    const file = await getFile(key, name);
    if (file.state === 'FAILED') { await dropFile(key, name); throw usr('Gemini couldn’t open that video. Try a different file.'); }
    if (file.state !== 'ACTIVE') throw usr('Gemini is still getting the video ready. Try again in a moment.');
    part = { fileData: { fileUri: file.uri, mimeType: file.mimeType || 'video/mp4' } };
  }
  // long videos at Gemini's low setting (about a third of the tokens), so the free tier's limits stretch further
  const low = !!b.youtube || Number(b.dur) > 180;
  try {
    let lastErr = null;
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        let out;
        try {
          out = await ask(key, model, part, promptFor(b, attempt > 0), low);
        } catch (e) {
          lastErr = e;
          if (e.status === 404 || e.status === 429 || (e.status === 400 && /not (found|supported)|unknown model|is not available/i.test(e.message))) break; // next model
          if (e.status >= 500 && attempt === 0) { await wait(1500); continue; }
          throw e;
        }
        if (out.recite && attempt === 0) { lastErr = usr('Gemini wouldn’t write this one out.'); continue; } // once more, in its own words
        if (!out.text) { lastErr = usr(out.blocked ? 'Gemini wouldn’t look at this video.' : 'Gemini didn’t send a recipe back. Try again.'); break; }
        const recipe = tidy(parseJson(out.text));
        if (!recipe) { lastErr = usr('Gemini’s answer came back garbled. Try again.'); continue; }
        return { recipe, model, tokens: out.tokens || undefined };
      }
    }
    throw lastErr || usr('Gemini couldn’t do this one.');
  } finally {
    if (name) await dropFile(key, name); // the video is only needed for this one answer
  }
}

async function ask(key, model, part, prompt, low) {
  const gen = { responseMimeType: 'application/json', responseSchema: SCHEMA };
  if (low) gen.mediaResolution = 'MEDIA_RESOLUTION_LOW';
  const r = await go(API + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [part, { text: prompt }] }], generationConfig: gen })
  });
  const raw = await r.text();
  if (!r.ok) throw gErr(r.status, raw);
  let j; try { j = JSON.parse(raw); } catch (e) { throw usr('Gemini’s answer came back garbled. Try again.'); }
  const c = (j.candidates || [])[0] || {};
  const text = ((c.content || {}).parts || []).filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('').trim();
  const fin = String(c.finishReason || '');
  return {
    text,
    recite: !text && /RECITATION|COPYRIGHT/i.test(fin),
    blocked: !!(j.promptFeedback && j.promptFeedback.blockReason) || /SAFETY|PROHIBITED|BLOCK/i.test(fin),
    tokens: (j.usageMetadata || {}).totalTokenCount
  };
}

function parseJson(text) {
  const t = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf('{'), z = t.lastIndexOf('}');
  if (a >= 0 && z > a) { try { return JSON.parse(t.slice(a, z + 1)); } catch (e) {} }
  return null;
}

// tidy Gemini's answer into exactly what the app's boxes take
function tidy(o) {
  if (!o || typeof o !== 'object') return null;
  const str = (v, n) => clip(v, n);
  const list = (v, n, len) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => str(x, len)).filter(Boolean).slice(0, n);
  const head = x => /^#{1,6}\s*\S/.test(x) || /^(for the|for)\s.{2,40}:$/i.test(x);
  const asHead = x => '## ' + x.replace(/^#+\s*/, '').replace(/:\s*$/, '').trim();
  const ingredients = list(o.ingredients, 120, 200).map(x => head(x) ? asHead(x) : x.replace(/^[-•*▢◦·]+\s*/, '')).filter(x => x !== '## ');
  const steps = list(o.steps, 80, 700).map(x => head(x) ? asHead(x) : x.replace(/^(step\s*)?\d{1,2}\s*[.):-]\s*/i, '').replace(/^[-•*]+\s*/, '')).filter(Boolean);
  const int = (v, max) => { const n = Math.round(Number(v)); return n > 0 ? Math.min(n, max) : 0; };
  const cu = str(o.cuisine, 40);
  const cuisine = CUISINES.find(c => c.toLowerCase() === cu.toLowerCase()) || (/^(none|n\/a|unknown|other)$/i.test(cu) ? '' : cu);
  const meals = list(o.meals, 7, 20).map(m => MEALS.find(x => x.toLowerCase() === m.toLowerCase().replace(/s$/, ''))).filter(Boolean);
  const title = str(o.title, 140).replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
  return {
    isRecipe: o.isRecipe !== false && (ingredients.length > 0 || steps.length > 0),
    title,
    ingredients,
    steps,
    notes: list(o.notes, 30, 400).map(x => x.replace(/^[-•*]+\s*/, '')),
    equipment: list(o.equipment, 30, 60).map(x => x.replace(/^[-•*]+\s*/, '')),
    totalTime: int(o.totalTime, 10000),
    servings: int(o.servings, 500),
    cuisine,
    meals: Array.from(new Set(meals)),
    guesses: list(o.guesses, 10, 200)
  };
}

/* ---------- health check with the real key (Claude runs this after a change) ---------- */
async function selftest(req, res, key, qp) {
  res.setHeader('Cache-Control', 'public, s-maxage=60');
  const out = { ok: true, key: key ? 'set (' + key.length + ' characters)' : 'missing', models: MODELS, checks: [] };
  const note = (step, o) => { out.checks.push(Object.assign({ step }, o)); };
  if (!key) { out.ok = false; res.status(200).json(out); return; }
  const only = String(qp.only || 'upload,youtube');
  if (/upload/.test(only)) {
    let name = '';
    try {
      const t0 = Date.now();
      const sr = await go(String(qp.sample || SAMPLE));
      const buf = Buffer.from(await sr.arrayBuffer());
      note('sample video', { ok: sr.ok && buf.length > 1000, bytes: buf.length, ms: Date.now() - t0 });
      const origin = 'https://djvas1975.github.io';
      const s = await startUpload(key, buf.length, 'video/mp4', origin);
      note('start upload', { ok: true, granularity: s.gran });
      const pf = await preflight(s.up, origin);
      const pfOk = pf.status < 300 && (pf.allowOrigin === origin || pf.allowOrigin === '*') && /x-goog-upload-command/i.test(pf.allowHeaders || '') ;
      note('phone may send it (preflight)', Object.assign({ ok: pfOk }, pf));
      const last = await sendLikePhone(s.up, buf, origin);
      note('send it like the phone', Object.assign({ ok: last.status === 200 && !!last.file && (last.allowOrigin === origin || last.allowOrigin === '*') }, last));
      if (!last.file) throw new Error('upload did not finish');
      name = last.file.name;
      const t1 = Date.now();
      let st = last.file.state || 'PROCESSING';
      while (st !== 'ACTIVE' && st !== 'FAILED' && Date.now() - t1 < 60000) { await wait(2000); st = (await getFile(key, name)).state; }
      note('Gemini got it ready', { ok: st === 'ACTIVE', state: st, ms: Date.now() - t1 });
      const t2 = Date.now();
      const m = await makeRecipe(key, { name, title: 'Test clip' });
      name = '';
      note('write recipe (uploaded video)', { ok: true, model: m.model, ms: Date.now() - t2, tokens: m.tokens, isRecipe: m.recipe.isRecipe, title: m.recipe.title, ingredients: m.recipe.ingredients.length, steps: m.recipe.steps.length });
    } catch (e) {
      out.ok = false;
      note('error', { ok: false, error: plain(e), detail: String((e && e.message) || e).slice(0, 300), status: e && e.status });
      if (name) await dropFile(key, name);
    }
  }
  if (/youtube/.test(only)) {
    try {
      const t0 = Date.now();
      const m = await makeRecipe(key, { youtube: String(qp.yt || SAMPLE_YT) });
      const r = m.recipe;
      note('write recipe (YouTube)', { ok: true, model: m.model, ms: Date.now() - t0, tokens: m.tokens, isRecipe: r.isRecipe, title: r.title, ingredients: r.ingredients.length, steps: r.steps.length, firstIngredients: r.ingredients.slice(0, 3), firstStep: r.steps[0], cuisine: r.cuisine, meals: r.meals, guesses: r.guesses.length });
    } catch (e) {
      out.ok = false;
      note('error (YouTube)', { ok: false, error: plain(e), detail: String((e && e.message) || e).slice(0, 300), status: e && e.status });
    }
  }
  res.status(200).json(out);
}

/* ---------- small helpers ---------- */
function clip(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
function usr(m) { const e = new Error(m); e.user = true; return e; }
function gErr(status, text) {
  let msg = '', st = '';
  try { const j = JSON.parse(text); msg = (j.error && j.error.message) || ''; st = (j.error && j.error.status) || ''; } catch (e) { msg = String(text || '').slice(0, 200); }
  const e = new Error(msg || st || ('HTTP ' + status));
  e.status = status; e.gstatus = st;
  return e;
}
function plain(e) {
  if (e && e.user) return e.message;
  const m = String((e && e.message) || e || '');
  const s = e && e.status;
  if (/api key not valid|API_KEY_INVALID|api key expired|invalid api key/i.test(m)) return 'The Gemini key in Vercel isn’t working. It may need to be made again in Google AI Studio.';
  if (s === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(m)) return 'Gemini’s free limit is used up for now. Try again in a few minutes, or tomorrow.';
  if (/youtube|video is private|not available|unavailable/i.test(m) && s >= 400 && s < 500) return 'Gemini couldn’t open that YouTube video. It may be private or blocked.';
  if (/too (large|long)|exceeds|maximum number of tokens|token count/i.test(m)) return 'That video is too long for Gemini’s free tier. Try a shorter clip.';
  if (s === 403) return 'Google turned the request away. The Gemini key may be restricted.';
  if (s >= 500) return 'Gemini is busy right now. Try again in a minute.';
  return 'Gemini couldn’t do this one. Try again in a minute.';
}
async function bodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}
async function bodyJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array)) return req.body;
  try { return JSON.parse((await bodyBuffer(req)).toString('utf8') || '{}'); } catch (e) { return {}; }
}

module.exports._setFetch = f => { FETCH = f; };
module.exports._tidy = tidy;
module.exports._parseJson = parseJson;
module.exports.MODELS = MODELS;
