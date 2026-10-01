// Artistry (formerly Brush & Glue) post reader (the painting and crafts app in crafts/).
// GET /api/idea?url=<link>  ->  { ok, platform, finalUrl, title, caption, image, width, height, author, siteName, link, kind, supplies }
// Add &debug=1 for a trace of what each site answered.
//
// Instagram, TikTok, YouTube and Facebook use YumYum's readers (api/recipe.js), which get the
// whole caption (the part behind "more") and the cover photo. Pinterest uses Pinterest's pin
// info (photo, title, description, and the site the pin links to). Any other site: its title,
// description and photo, plus the supply list when the page has a project card (schema.org HowTo).

const { cors, badUrl, fetchText, fetchJson, decode, clean, meta, jsonLdBlocks, asArray, isChallenge, fromArchive } = require('../lib/parse');
const { readers } = require('./recipe');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const url = String((req.query && req.query.url) || '').trim();
  const bad = badUrl(url);
  if (bad) { res.status(400).json({ ok: false, error: bad }); return; }
  const trace = req.query && req.query.debug ? [] : null;
  try {
    const out = await readIdea(url, trace);
    if (trace) out.trace = trace;
    res.setHeader('Cache-Control', trace ? 'no-store' : 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: false, error: (e && e.message) || 'Couldn’t read that link.', platform: platformOf(url), trace: trace || undefined });
  }
};

function platformOf(url) {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase().replace(/^(www|m|mobile|vm|vt)\./, ''); } catch (e) { return 'web'; }
  if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
  if (/(^|\.)instagram\.com$|^instagr\.am$/.test(h)) return 'instagram';
  if (h === 'youtu.be' || /(^|\.)youtube\.com$/.test(h)) return 'youtube';
  if (/(^|\.)facebook\.com$|^fb\.watch$|^fb\.com$/.test(h)) return 'facebook';
  if (h === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(h)) return 'pinterest';
  return 'web';
}

async function readIdea(url, trace) {
  const platform = platformOf(url);
  let r;
  if (platform === 'tiktok') r = await readers.readTikTok(url, trace);
  else if (platform === 'instagram') r = await readers.readInstagram(url, trace);
  else if (platform === 'youtube') r = await readers.readYouTube(url, trace);
  else if (platform === 'facebook') r = await readers.readFacebook(url, trace);
  else if (platform === 'pinterest') return readPin(url, trace);
  else return readPage(url, trace);
  const caption = clean(r.caption) ? String(r.caption).trim() : '';
  // the readers call every social post a video; photo posts get no play button in the app
  const where = (r.finalUrl || '') + ' ' + url;
  let kind = r.kind === 'video' ? 'video' : 'post';
  if (platform === 'instagram' && !/instagram\.com\/(?:[\w.]+\/)?(reels?|tv)\//i.test(where)) kind = 'post';
  if (platform === 'tiktok' && /\/photo\//.test(where)) kind = 'post';
  if (platform === 'facebook' && !/\/(reel|videos?|watch)\b|fb\.watch|[?&]v=\d|\/share\/[rv]\//.test(where)) kind = 'post';
  return {
    platform,
    finalUrl: r.finalUrl || url,
    kind,
    title: tidyTitle(platform === 'youtube' ? r.title : (r.title || firstLine(caption))),
    caption,
    image: r.image || '',
    width: 0, height: 0,
    author: r.author || '',
    siteName: r.siteName || '',
    link: '',
    supplies: []
  };
}

/* ---------- Pinterest ---------- */
async function readPin(url, trace) {
  let page = url, id = pinId(url);
  if (!id) {
    try { const r = await fetchText(url, { headOnly: true, trace }); page = r.finalUrl; id = pinId(page); }
    catch (e) { if (trace) trace.push('resolve: ' + e.message); }
  }
  let link = '', title = '', desc = '', image = '', author = '', w = 0, h = 0;
  if (id) {
    try {
      const j = await fetchJson('https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=' + id);
      const p = (j && Array.isArray(j.data) && j.data[0]) || {};
      link = p.link || '';
      title = p.title || p.grid_title || '';
      desc = p.description || p.closeup_unified_description || '';
      const im = p.images || {};
      const pick = im['736x'] || im.orig || im['564x'] || im['474x'] || im['237x'] || {};
      image = pick.url || '';
      w = pick.width || 0; h = pick.height || 0;
      author = (p.pinner && p.pinner.username) || '';
      if (trace) trace.push('pin info: ' + (title || desc || '(no text)').slice(0, 80) + ' | link ' + (link || 'none'));
    } catch (e) { if (trace) trace.push('pin info failed: ' + e.message); }
  }
  if (!image || !(title || desc)) {
    try {
      const { text: html } = await fetchText(page, { trace });
      if (!image) image = meta(html, 'og:image');
      if (!title) title = decode(meta(html, 'og:title'));
      if (!desc) desc = decode(meta(html, 'og:description') || meta(html, 'description'));
    } catch (e) { if (trace) trace.push('pin page failed: ' + e.message); }
  }
  if (!image && !title && !desc) throw new Error('Pinterest wouldn’t share this pin’s details.');
  link = decode(link);
  return {
    platform: 'pinterest', finalUrl: id ? 'https://www.pinterest.com/pin/' + id + '/' : page, kind: 'post',
    title: tidyTitle(clean(title).replace(/\s*\|\s*Pinterest.*$/i, '') || firstLine(desc)),
    caption: clean(desc) === clean(title) ? '' : String(desc || '').trim(),
    image: decode(image), width: w, height: h, author, siteName: 'Pinterest',
    link: link && !/pinterest\.|pin\.it/i.test(link) && !badUrl(link) ? link : '',
    supplies: []
  };
}
function pinId(u) {
  const m = String(u).match(/pinterest\.[a-z.]+\/pin\/(?:[\w-]*--)?(\d{6,})/i);
  return m ? m[1] : '';
}

/* ---------- any other website ---------- */
async function readPage(url, trace) {
  let html = '', finalUrl = url, problem = '';
  try {
    const r = await fetchText(url, { trace });
    html = r.text; finalUrl = r.finalUrl;
    if (isChallenge(html)) { html = ''; problem = 'That site blocked the reader.'; }
  } catch (e) { problem = e.message; }
  if (!html) {
    try { const a = await fromArchive(finalUrl); if (a && !isChallenge(a.html)) { html = a.html; if (trace) trace.push('used the Internet Archive copy'); } }
    catch (e) { if (trace) trace.push('archive: ' + e.message); }
  }
  if (!html) throw new Error(problem || 'Couldn’t read that page.');
  const host = new URL(finalUrl).hostname.replace(/^www\./, '');
  const site = decode(meta(html, 'og:site_name')) || host;
  let title = decode(meta(html, 'og:title')) || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  title = title.replace(new RegExp('\\s*[|\\-–—:]\\s*' + site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '');
  let image = meta(html, 'og:image') || meta(html, 'twitter:image');
  const w = parseInt(meta(html, 'og:image:width'), 10) || 0, h = parseInt(meta(html, 'og:image:height'), 10) || 0;
  let desc = decode(meta(html, 'og:description') || meta(html, 'description'));
  let supplies = [];
  const howto = findType(jsonLdBlocks(html), /(^|\/)HowTo$/i);
  if (howto) {
    const names = x => asArray(x).map(t => clean(decode(typeof t === 'string' ? t : (t && (t.name || t.text)) || ''))).filter(Boolean);
    supplies = names(howto.supply).concat(names(howto.tool)).slice(0, 25);
    if (!image && howto.image) { const im = asArray(howto.image)[0]; image = typeof im === 'string' ? im : (im && im.url) || ''; }
    if (!desc && howto.description) desc = clean(decode(howto.description));
    if (trace) trace.push('project card: ' + supplies.length + ' supplies');
  }
  if (image) { try { image = new URL(decode(image), finalUrl).href; } catch (e) { image = ''; } }
  return {
    platform: 'web', finalUrl, kind: 'page', title: tidyTitle(title), caption: clean(desc),
    image, width: w, height: h, author: '', siteName: site, link: '', supplies
  };
}
function findType(node, re, seen) {
  seen = seen || new Set();
  if (!node || typeof node !== 'object' || seen.has(node)) return null;
  seen.add(node);
  if (Array.isArray(node)) { for (const n of node) { const r = findType(n, re, seen); if (r) return r; } return null; }
  if (asArray(node['@type']).map(String).some(t => re.test(t))) return node;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'hasPart', 'about']) {
    if (node[k]) { const r = findType(node[k], re, seen); if (r) return r; }
  }
  return null;
}

/* ---------- titles ---------- */
const CHATTER = /^(follow|like|save|comment|share|link in (my )?bio|tag a friend|check out|new video|part \d+$)/i;
function firstLine(text) {
  const lines = String(text || '').split(/\n+/).map(l => l.replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/[\p{Extended_Pictographic}‍️]/gu, ' ').replace(/\s+/g, ' ').trim());
  return lines.find(l => /\p{L}{3}/u.test(l) && !CHATTER.test(l)) || '';
}
function tidyTitle(t) {
  t = clean(decode(String(t || ''))).replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/[\p{Extended_Pictographic}‍️]/gu, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[-–|:·,.\s]+|[-–|:·,\s]+$/g, '');
  if (t.length > 90) { const cut = t.slice(0, 90); t = cut.slice(0, cut.lastIndexOf(' ') > 50 ? cut.lastIndexOf(' ') : 90).replace(/[,;:\s]+$/, '') + '…'; }
  return t;
}

module.exports.readIdea = readIdea;
module.exports.tidyTitle = tidyTitle;
module.exports.firstLine = firstLine;
