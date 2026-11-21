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
// POST /api/video?op=image            {images:[{data:<base64>, type}], title, caption}  (v2.4: screenshots of a caption,
//                                     or photos of a cookbook or magazine page; up to 8 pictures, the phone shrinks and
//                                     slices them so the whole request stays under Vercel's 4.5 MB)
//                                     -> {ok, recipe:{same as op=make}, model}; nothing is kept
// GET  /api/video?op=selftest[&only=upload|youtube|image][&yt=<id>][&img=<picture on the app's own sites>]
//                                  -> runs the whole thing on a small sample video, a YouTube Short and a sample
//                                     screenshot with the real key, and reports each step (never the key)
//
// Only the app (a browser on https://djvas1975.github.io) can use the POST calls. The free tier has no bill, so the
// worst a stranger could do is use up the day's free limit.

const { cors } = require('../lib/parse');

const API = 'https://generativelanguage.googleapis.com';
// free-tier models, best first (checked Oct 17, 2026 on ai.google.dev/gemini-api/docs/pricing); GEMINI_MODEL overrides
// (order changed Nov 21, 2026: 3.6 Flash wrote the YouTube check in 6.6 s, 3.8 Flash took over 170 s that hour)
const MODELS = String(process.env.GEMINI_MODEL || 'gemini-3.6-flash,gemini-3.8-flash,gemini-3-flash-preview')
  .split(',').map(s => s.trim()).filter(Boolean);
// pictures: a "lite" model first. Timed live Nov 21, 2026 on tests/fixtures/caption-shot.jpg, same answer from each:
// gemini-3.5-flash-lite 1.4 s, gemini-3.1-flash-lite 14.5 s, gemini-3.7-flash 96 s, gemini-3.8-flash over 170 s
const PIC_MODELS = String(process.env.GEMINI_PIC_MODEL || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',').map(s => s.trim()).filter(Boolean);
const MAX_VIDEO = 400 * 1024 * 1024;
const SAMPLE = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const SAMPLE_YT = 'LrCEvNIyX-I';
// a made-up Instagram caption screenshot in this repo (tests/fixtures), served by the app's own sites
const SAMPLE_IMG = 'https://djvas1975.github.io/yumyumtumtum/tests/fixtures/caption-shot.jpg';
const MAX_PICS = 8, MAX_PIC = 1.6 * 1024 * 1024, MAX_PICS_TOTAL = 3.3 * 1024 * 1024;
const PIC_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;

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
    if (op === 'image') {
      const b = await bodyJson(req);
      res.status(200).json(Object.assign({ ok: true }, await readPictures(key, b)));
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
    guesses: { type: 'ARRAY', items: { type: 'STRING' }, description: 'What you estimated instead of seeing or hearing it' },
    language: { type: 'STRING', description: 'The language the recipe was written in, like "Spanish"' } // v2.4.1, pictures only
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
    return await writeWith(key, [part], ownWords => promptFor(b, ownWords), low, 'video');
  } finally {
    if (name) await dropFile(key, name); // the video is only needed for this one answer
  }
}

// pictures (v2.4): screenshots of a post's caption, or photos of a cookbook, magazine or recipe card
function picturePrompt(b, ownWords, n) {
  const title = clip(b.title, 140);
  const caption = clip(b.caption, 4000);
  return [
    'You are filling in a recipe card in a home cook\'s recipe app from ' + (n > 1 ? n + ' pictures, in order' : 'a picture') + '.',
    'They are screenshots of a social media post (most often the caption of an Instagram, TikTok or Facebook video), or photos of a cookbook, magazine or recipe card page. Pieces of one long screenshot can overlap; don\'t repeat the overlapping lines.',
    'Read the recipe the creator wrote. Ignore the app around it: likes, view counts, buttons like Follow or Reply, "more", hashtags, music names, ads, and comments by other people (use a comment only when the creator wrote it to add to the recipe).',
    title ? 'The cook saved it as: "' + title + '".' : '',
    caption ? 'Text the app already got from the post (it may be only part of it):\n"""\n' + caption + '\n"""' : '',
    'Write the recipe in plain American English. If the pictures are in another language (often Spanish), translate the name, ingredients, steps and notes into English.',
    'Translate only the words. Never convert numbers, units or temperatures: keep every amount, unit and temperature the way it is written. "500 g de carne" becomes "500 g beef", "1/2 taza de leche" becomes "1/2 cup milk", "2 cucharadas" becomes "2 tablespoons", "180 °C" stays "180 °C" (not °F), "250 ml" stays "250 ml".',
    '- language: the language the recipe was written in, like "Spanish". "English" if it was already in English.',
    '- title: the dish\'s name in English, short, like "Crack Chicken Penne". Keep a dish\'s own name that English uses too (Cochinita Pibil, Salsa Verde, Pozole) and translate the rest ("Salsa verde para tacos" becomes "Salsa Verde for Tacos"). No emoji.',
    '- ingredients: one item each, with the amounts exactly as written, like "2 lb chicken thighs", "1 cup shredded cheddar". If the recipe has parts (a sauce, a topping), put a heading line before each part, like "## For the sauce". Leave the amount out when none is written; don\'t make one up.',
    '- steps: the steps written in the pictures, in order, one step each, a sentence or two. No numbers at the start. Keep temperatures and times exactly as written. If no steps are written, leave steps empty (don\'t write your own) and add a guess saying "No steps were written in the screenshot".',
    '- notes: tips, swaps or warnings the creator gives. Empty if none.',
    '- equipment: pans, appliances and tools named, like "Large skillet", "Air fryer", "9x13 baking dish".',
    '- totalTime: only when the recipe writes a total time (like "Total: 45 min"), else 0. Don\'t add up step times. servings: if written, else 0.',
    '- cuisine: one of ' + CUISINES.join(', ') + ', or "" if none fits.',
    '- meals: any of ' + MEALS.join(', ') + ' that fit.',
    '- guesses: short notes on anything you couldn\'t read clearly, had to guess, or that seems to be missing, like "Amount of garlic was cut off" or "Oven temperature isn\'t given". Empty if nothing.',
    '- isRecipe: false if the pictures have no recipe in them (no ingredients and no steps), and then leave the lists empty.',
    'Do not add ingredients, amounts or steps that are not in the pictures.',
    ownWords ? 'Write every step and note in your own words. Do not copy any text word for word.' : ''
  ].filter(Boolean).join('\n');
}
async function readPictures(key, b) {
  b = b || {};
  const list = Array.isArray(b.images) ? b.images : [];
  if (!list.length) throw usr('Pick a screenshot or a photo first.');
  if (list.length > MAX_PICS) throw usr('That’s too many pictures. Send up to ' + MAX_PICS + '.');
  let total = 0;
  const parts = list.map(x => {
    const data = String((x && x.data) || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    const type = PIC_TYPES.test(String((x && x.type) || '')) ? String(x.type) : 'image/jpeg';
    const bytes = Math.floor(data.length * 3 / 4);
    if (!/^[A-Za-z0-9+/]+=*$/.test(data) || bytes < 200) throw usr('One of the pictures didn’t come through. Try again.');
    if (bytes > MAX_PIC) throw usr('One of the pictures is too big. Try a smaller one.');
    total += bytes;
    return { inlineData: { mimeType: type, data } };
  });
  if (total > MAX_PICS_TOTAL) throw usr('Those pictures are too big together. Send fewer at a time.');
  return writeWith(key, parts, ownWords => picturePrompt(b, ownWords, parts.length), false, 'pictures', picModels());
}

// asks each free model in turn until one writes the recipe
const picModels = () => Array.from(new Set((PICK.model ? [PICK.model] : PIC_MODELS).concat(MODELS)));
let PICK = {}; // the health check's &model=
// how long one model may take before the next one is asked, and the whole budget (Vercel stops the function at 180 s)
const LIMITS = { pictures: 40000, video: 80000, total: 160000 };
async function writeWith(key, parts, promptOf, low, what, models) {
  let lastErr = null;
  const end = Date.now() + LIMITS.total;
  for (const model of (models || MODELS)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = end - Date.now();
      if (left < 5000) throw lastErr || usr('Gemini is slow right now. Try again in a few minutes.');
      let out;
      try {
        out = await ask(key, model, parts, promptOf(attempt > 0), low, Math.min(what === 'pictures' ? LIMITS.pictures : LIMITS.video, left));
      } catch (e) {
        lastErr = e;
        if (e.slow) break; // too slow: the next model
        if (e.status === 404 || e.status === 429 || (e.status === 400 && /not (found|supported)|unknown model|is not available/i.test(e.message))) break; // next model
        if (e.status >= 500 && attempt === 0) { await wait(1500); continue; }
        throw e;
      }
      if (out.recite && attempt === 0) { lastErr = usr('Gemini wouldn’t write this one out.'); continue; } // once more, in its own words
      if (!out.text) { lastErr = usr(out.blocked ? (what === 'pictures' ? 'Gemini wouldn’t look at these pictures.' : 'Gemini wouldn’t look at this video.') : 'Gemini didn’t send a recipe back. Try again.'); break; }
      const recipe = tidy(parseJson(out.text));
      if (!recipe) { lastErr = usr('Gemini’s answer came back garbled. Try again.'); continue; }
      return { recipe, model, tokens: out.tokens || undefined };
    }
  }
  throw lastErr || usr('Gemini couldn’t do this one.');
}

async function ask(key, model, parts, prompt, low, ms) {
  const gen = { responseMimeType: 'application/json', responseSchema: SCHEMA };
  if (low) gen.mediaResolution = 'MEDIA_RESOLUTION_LOW';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 80000);
  let r, raw;
  try {
    r = await go(API + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: parts.concat([{ text: prompt }]) }], generationConfig: gen }),
      signal: ctrl.signal
    });
    raw = await r.text();
  } catch (e) {
    if (ctrl.signal.aborted) { const x = usr('Gemini is slow right now. Try again in a few minutes.'); x.slow = true; throw x; }
    throw e;
  } finally { clearTimeout(t); }
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
    guesses: list(o.guesses, 10, 200),
    // v2.4.1: the language a screenshot was written in ('' for English or not said), so the app can say "Translated from Spanish"
    language: /^(english|en|unknown|none|n\/a)?$/i.test(str(o.language, 30).trim()) ? '' : str(o.language, 30).trim().replace(/^./, c => c.toUpperCase())
  };
}

/* ---------- health check with the real key (Claude runs this after a change) ---------- */
async function selftest(req, res, key, qp) {
  res.setHeader('Cache-Control', 'public, s-maxage=60');
  const out = { ok: true, key: key ? 'set (' + key.length + ' characters)' : 'missing', models: MODELS, checks: [] };
  const note = (step, o) => { out.checks.push(Object.assign({ step }, o)); };
  if (!key) { out.ok = false; res.status(200).json(out); return; }
  const only = String(qp.only || 'upload,youtube,image');
  // &model=<name> tries one model only (to time each one); &only=models lists what the key can use
  const pick = /^gemini-[\w.-]{1,60}$/.test(String(qp.model || '')) ? String(qp.model) : '';
  const keep = MODELS.slice();
  if (pick) { MODELS.splice(0, MODELS.length, pick); PICK = { model: pick }; }
  try {
  if (/models/.test(only)) {
    try {
      const r = await go(API + '/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
      const j = await r.json();
      note('models', { ok: r.ok, names: (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, '')).filter(n => /flash|pro/.test(n)) });
    } catch (e) { note('models', { ok: false, error: String(e && e.message) }); }
  }
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
  if (/image/.test(only)) {
    try {
      const t0 = Date.now();
      let src = String(qp.img || SAMPLE_IMG);
      let u = null; try { u = new URL(src); } catch (e) { u = null; }
      // only pictures on the app's own sites, so this can't be used to fetch anything else
      if (!u || u.protocol !== 'https:' || !/^(djvas1975\.github\.io|yumyumtumtum\.vercel\.app)$/.test(u.hostname)) src = SAMPLE_IMG;
      const ir = await go(src);
      const buf = Buffer.from(await ir.arrayBuffer());
      note('sample picture', { ok: ir.ok && buf.length > 1000, bytes: buf.length, ms: Date.now() - t0 });
      const t1 = Date.now();
      const m = await readPictures(key, { images: [{ data: buf.toString('base64'), type: /png$/i.test(src) ? 'image/png' : 'image/jpeg' }] });
      const r = m.recipe;
      note('write recipe (picture)', { ok: true, model: m.model, ms: Date.now() - t1, tokens: m.tokens, isRecipe: r.isRecipe, title: r.title, ingredients: r.ingredients, steps: r.steps, notes: r.notes, totalTime: r.totalTime, servings: r.servings, cuisine: r.cuisine, meals: r.meals, guesses: r.guesses });
    } catch (e) {
      out.ok = false;
      note('error (picture)', { ok: false, error: plain(e), detail: String((e && e.message) || e).slice(0, 300), status: e && e.status });
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
  } finally { MODELS.splice(0, MODELS.length, ...keep); PICK = {}; }
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
module.exports._picturePrompt = picturePrompt;
module.exports.MODELS = MODELS;
module.exports.PIC_MODELS = PIC_MODELS;
module.exports._limits = LIMITS;
