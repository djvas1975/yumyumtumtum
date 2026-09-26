// Shared helpers for the recipe reader. No outside libraries.

const ALLOWED_ORIGINS = ['https://djvas1975.github.io'];
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

// Only the yumyumtumtum app may call this from a browser, so it can't be used as a free proxy by other sites.
function cors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (!origin) return true;
  const self = req.headers.host ? 'https://' + req.headers.host : '';
  if (ALLOWED_ORIGINS.includes(origin) || origin === self) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }
  res.status(403).json({ ok: false, error: 'Not allowed.' });
  return false;
}

// Refuse anything that isn't an ordinary public web address.
function badUrl(u) {
  let x;
  try { x = new URL(u); } catch (e) { return 'That link does not look right.'; }
  if (!/^https?:$/.test(x.protocol)) return 'Only web links can be read.';
  const h = x.hostname.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.startsWith('[')) return 'That address can’t be read.';
  const ip = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ip) {
    const [a, b] = [+ip[1], +ip[2]];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return 'That address can’t be read.';
  }
  return '';
}

async function fetchText(url, opts) {
  opts = opts || {};
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const bad = badUrl(current);
    if (bad) throw new Error(bad);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    let res;
    try {
      res = await fetch(current, {
        redirect: 'manual', signal: ctrl.signal,
        headers: Object.assign({
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        }, opts.headers || {})
      });
    } catch (e) {
      clearTimeout(t);
      throw new Error(e && e.name === 'AbortError' ? 'That site took too long to answer.' : 'Couldn’t reach that site.');
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(t);
      current = new URL(res.headers.get('location'), current).href;
      continue;
    }
    if (opts.headOnly) { clearTimeout(t); try { res.body && res.body.cancel(); } catch (e) {} return { text: '', finalUrl: current }; }
    if ([401, 402, 403, 429, 451, 503].includes(res.status)) { clearTimeout(t); throw new Error('That site blocked the recipe reader.'); }
    if (res.status === 404 || res.status === 410) { clearTimeout(t); throw new Error('That page wasn’t found.'); }
    if (!res.ok) { clearTimeout(t); throw new Error('That site had a problem (' + res.status + ').'); }
    let text = await res.text();
    clearTimeout(t);
    if (text.length > 5e6) text = text.slice(0, 5e6);
    return { text, finalUrl: current };
  }
  throw new Error('Too many redirects.');
}

async function fetchJson(url) {
  const { text } = await fetchText(url);
  try { return JSON.parse(text); } catch (e) { throw new Error('Couldn’t read that post.'); }
}

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°', times: '×', frac12: '½', frac14: '¼', frac34: '¾',
  frac13: '⅓', frac23: '⅔', frac18: '⅛', eacute: 'é', egrave: 'è', ntilde: 'ñ', aacute: 'á', iacute: 'í',
  oacute: 'ó', uacute: 'ú', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç', reg: '®', trade: '™', copy: '©', bull: '•', middot: '·'
};
function decode(s) {
  if (s == null) return '';
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(n); } catch (err) { return m; }
    }
    const v = ENT[e.toLowerCase()];
    return v == null ? m : v;
  });
}
const clean = s => String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function htmlToLines(html) {
  let s = String(html || '')
    .replace(/<(script|style|svg|noscript|template|button)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h[1-6]|div|tr|ul|ol|section|blockquote)>/gi, '\n')
    .replace(/<(li|p|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = decode(s);
  return s.split(/\n+/).map(l => clean(l).replace(/^[•▢☐□▪◦●\-–*]+\s*/, '')).filter(Boolean);
}

function attrOf(tag, name) {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? (m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]) : '';
}

function meta(html, name) {
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = (attrOf(tag, 'property') || attrOf(tag, 'name') || attrOf(tag, 'itemprop')).toLowerCase();
    if (key === name.toLowerCase()) { const c = attrOf(tag, 'content'); if (c) return c; }
  }
  return '';
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Inner HTML of every element whose class list includes cls (outermost matches only).
function findByClass(html, cls) {
  const out = [];
  const open = /<([a-zA-Z][\w-]*)\b[^>]*>/g;
  let m;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase();
    if (VOID.has(tag) || m[0].endsWith('/>')) continue;
    const classes = attrOf(m[0], 'class').split(/\s+/);
    if (!classes.includes(cls)) continue;
    const start = m.index + m[0].length;
    const re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'gi');
    re.lastIndex = start;
    let depth = 1, t, end = -1;
    while ((t = re.exec(html))) {
      if (t[0].endsWith('/>')) continue;
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    if (end < 0) continue;
    out.push(html.slice(start, end));
    open.lastIndex = end;
  }
  return out;
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let s = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try { out.push(JSON.parse(s)); continue; } catch (e) {}
    try { out.push(JSON.parse(s.replace(/[\u0000-\u001f]+/g, ' '))); } catch (e) {}
  }
  return out;
}

function findRecipe(node, seen) {
  seen = seen || new Set();
  if (!node || typeof node !== 'object' || seen.has(node)) return null;
  seen.add(node);
  if (Array.isArray(node)) { for (const n of node) { const r = findRecipe(n, seen); if (r) return r; } return null; }
  const type = asArray(node['@type']).map(String);
  if (type.some(t => /(^|\/)Recipe$/i.test(t))) return node;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item', 'hasPart', 'about']) {
    if (node[k]) { const r = findRecipe(node[k], seen); if (r) return r; }
  }
  return null;
}

function isoMinutes(v) {
  if (!v) return 0;
  const s = String(Array.isArray(v) ? v[0] : v).trim();
  const m = s.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (m) return Math.round((+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) + (+m[4] || 0) / 60);
  let min = 0;
  const h = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i); if (h) min += +h[1] * 60;
  const mm = s.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i); if (mm) min += +mm[1];
  if (!h && !mm && /^\d+$/.test(s)) min = +s;
  return Math.round(min);
}

function pickImage(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) { for (const i of img) { const u = pickImage(i); if (u) return u; } return ''; }
  return img.url || img.contentUrl || (typeof img['@id'] === 'string' && /^https?:/.test(img['@id']) ? img['@id'] : '') || '';
}

function asArray(x) {
  if (x == null || x === '') return [];
  return Array.isArray(x) ? x : [x];
}

const MEAL_RULES = [
  ['Breakfast', /\b(breakfast|brunch)\b/],
  ['Lunch', /\b(lunch|sandwich(es)?)\b/],
  ['Dinner', /\b(dinner|main (course|dish)|mains?|entr[eé]es?|supper)\b/],
  ['Dessert', /\b(desserts?|cakes?|cookies?|brownies?|pies?|cupcakes?)\b/],
  ['Snack', /\b(snacks?|appetizers?|starters?|party food|finger food)\b/],
  ['Side', /\b(side dish(es)?|sides?)\b/],
  ['Drink', /\b(drinks?|beverages?|cocktails?|smoothies?|mocktails?)\b/]
];
function mapMeals(words) {
  const s = words.flatMap(w => String(w || '').split(',')).join(' | ').toLowerCase();
  return MEAL_RULES.filter(([, re]) => re.test(s)).map(([m]) => m).slice(0, 2);
}

/* ---- captions (TikTok / Instagram / YouTube descriptions) ---- */
const HEADS = [
  [/^(ingredients?|what you(’|')?ll need|you(’|')?ll need|what you need|shopping list)$/i, 'ing'],
  [/^for the [\p{L}\s]+$/iu, 'ingsub'],
  [/^(instructions?|directions?|method|steps?|how to( make)?( it| them)?|preparation|to make|recipe steps)$/i, 'step'],
  [/^(notes?|tips?|substitutions?|variations?|storage|to store|recipe notes)$/i, 'note'],
  [/^(equipment|cookware|tools|you(’|')?ll also need)$/i, 'equip'],
  [/^(nutrition( facts| information)?|course|cuisine|keywords?|author|prep time|cook time|total time|servings|yield|calories)$/i, 'skip']
];
const QTY = /^([\d½¼¾⅓⅔⅛⅜⅝⅞]|a (cup|pinch|dash|handful|few|couple)|an? \d|one |two |three |pinch|dash|handful|salt|pepper)/i;
const UNIT = /\b(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|liters?|cloves?|cans?|sticks?|slices?|pinch|dash|bunch)\b/i;

function stripDecor(l) {
  return l.replace(/^[\s•\-–*▪◦●✅✔☑➡→>️]+/u, '')
    .replace(/^[\p{Extended_Pictographic}‍️\s]+/u, '')
    .trim();
}
// "Ingredients:" / "Tip: add cinnamon" -> {mode, head, rest}
function header(line) {
  const t = stripDecor(line);
  const m = t.match(/^([^:：]{2,40})[:：]\s*(.*)$/);
  if (!m && t.length > 40) return null;
  const head = (m ? m[1] : t).replace(/[\-–]+\s*$/, '').trim();
  for (const [re, mode] of HEADS) if (re.test(head)) return { mode, head, rest: m ? m[2].trim() : '' };
  return null;
}

function parseCaption(text) {
  let s = String(text || '').replace(/\r/g, '');
  // captions written on one line: break before headers, bullets and numbered steps
  s = s.replace(/\s*(ingredients?|instructions?|directions?|method|steps?|notes?)\s*[:：]\s*/gi, '\n$1:\n')
       .replace(/\s*[•▪●]\s*/g, '\n• ')
       .replace(/\s+(\d{1,2})[.)]\s+(?=[A-Za-z])/g, '\n$1. ');
  const lines = s.split('\n').map(l => l.trim());
  const hashOnly = l => /^(#[\p{L}\p{N}_]+\s*)+$/u.test(l);
  const body = lines.filter(l => l && !hashOnly(l) && /[\p{L}\p{N}]/u.test(l))
    .map(l => l.replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, '').trim()).filter(Boolean);

  let mode = '', found = false;
  const ing = [], steps = [], notes = [], pre = [], equip = [];
  const add = (l) => {
    if (mode === 'skip') return;
    if (mode === 'equip') { equip.push(l); return; }
    if (mode === 'ing') {
      const parts = l.split(',').map(x => x.trim()).filter(Boolean);
      if (parts.length >= 3 && parts.every(p => p.length < 60)) parts.forEach(x => ing.push(x));
      else ing.push(l);
    } else if (mode === 'step') steps.push(l.replace(/^(step\s*)?\d+[.):]\s*/i, ''));
    else if (mode === 'note') notes.push(l);
    else pre.push(l);
  };
  for (const raw of body) {
    const h = header(raw);
    if (h) {
      found = true;
      mode = h.mode === 'ingsub' ? 'ing' : h.mode;
      if (h.mode === 'ingsub') ing.push('## ' + h.head.charAt(0).toUpperCase() + h.head.slice(1));
      if (h.rest) add(stripDecor(h.rest));
      continue;
    }
    const l = stripDecor(raw);
    if (l) add(l);
  }
  if (!found) {
    // no headings: quantities look like ingredients, numbered lines look like steps
    for (const l of pre.splice(0)) {
      if (/^\d{1,2}[.)]\s+\D/.test(l) && !UNIT.test(l.slice(0, 18))) steps.push(l.replace(/^\d+[.)]\s*/, ''));
      else if ((QTY.test(l) || UNIT.test(l)) && l.length < 90) ing.push(l);
      else pre.push(l);
    }
    if (ing.length < 2) { pre.unshift(...ing.splice(0)); }
  }
  const titleLine = (pre[0] || body[0] || '').replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/\s+/g, ' ').trim();
  let title = titleLine.split(/(?<=[.!?])\s/)[0].slice(0, 100).replace(/[.!\s]+$/, '');
  if (title.length < 3) title = '';
  const META = /^((prep|cook|total|active|inactive|rest|chill)\s*time|servings?|yield|makes|calories|course|cuisine|author|keywords?|print|pin|rate|save|jump to|video|equipment)\b/i;
  const leftover = pre.slice(1).filter(l => !META.test(l));
  return { title, ingredients: ing, steps, equipment: equip, notes: notes.concat(leftover.length && (ing.length || steps.length) ? leftover : []) };
}

// Bot-check pages some sites show instead of the recipe
function isChallenge(html) {
  return /<title>\s*(Just a moment|Attention Required|Access denied|Please verify|Are you a robot)/i.test(html)
    || /_cf_chl_opt|cf-browser-verification|challenge-platform/i.test(html.slice(0, 20000));
}

// The Internet Archive's most recent saved copy of a page, exactly as the site served it
async function fromArchive(url) {
  const clean = url.replace(/#.*$/, '');
  const avail = await fetchJson('https://archive.org/wayback/available?url=' + encodeURIComponent(clean));
  const snap = avail && avail.archived_snapshots && avail.archived_snapshots.closest;
  if (!snap || !snap.available || !/^2\d\d$/.test(String(snap.status || '200'))) return null;
  const { text } = await fetchText('https://web.archive.org/web/' + snap.timestamp + 'id_/' + clean);
  return { html: text, timestamp: snap.timestamp };
}

module.exports = {
  isChallenge, fromArchive,
  cors, badUrl, fetchText, fetchJson, decode, clean, htmlToLines, attrOf, meta, findByClass,
  jsonLdBlocks, findRecipe, isoMinutes, pickImage, asArray, mapMeals, parseCaption
};
