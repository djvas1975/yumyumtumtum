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
    if (opts.trace) opts.trace.push(res.status + ' ' + current.slice(0, 160));
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
  [/^((quick|easy|simple|full|the|recipe|main)\s+)?(ingredients?( list)?|ingredient list|what you(’|')?ll need|you(’|')?ll need|what you need|here(’|')?s what you(’|')?ll need|here(’|')?s what you need|shopping list|grocery list)$/i, 'ing'],
  [/^((the|full|my)\s+)?recipe(\s+(below|here|details|breakdown))?$/i, 'recipe'],
  [/^for the [\p{L}\s]+$/iu, 'ingsub'],
  [/^((quick|easy|simple|full|the|recipe|cooking)\s+)?(instructions?|directions?|method|steps?|how to( make)?( it| them| this)?|how i made (it|this|them)|how i make (it|this|them)|preparation|to make)$/i, 'step'],
  [/^(notes?|tips?|pro tips?|chef(’|')?s tips?|substitutions?|swaps?|variations?|storage|to store|leftovers|recipe notes|make ahead)$/i, 'note'],
  [/^(equipment|cookware|tools|you(’|')?ll also need)$/i, 'equip'],
  [/^(nutrition( facts| information| info)?|macros( per serving)?|protein|carbs|fat|fiber|sugar|sodium|course|cuisine|keywords?|author|prep( time)?|cook( time)?|total( time)?|time|servings|serves|serving size|yield|makes|calories|cals)$/i, 'skip']
];
const QTY = /^([\d½¼¾⅓⅔⅛⅜⅝⅞]|a (cup|pinch|dash|handful|few|couple)|an? \d|one |two |three |pinch|dash|handful|salt|pepper)/i;
const UNIT = /\b(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|liters?|cloves?|cans?|sticks?|slices?|pinch|dash|bunch)\b/i;
// where a new ingredient starts inside a run-together list: "…butter 1 onion 3 carrots…"
const AMOUNT_AT = /(?<!\b(?:at|for|to|into|about|around|or|and|by|x|in|of|over|under|than|until|with|per|approx|approximately|plus|cut|makes|serves|feeds|yields?)\s+)(?<![,(\/:-])\s+(?=(?:\d+\s\d\/\d|\d+\/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞])\s*(?:[-–]\s*\d+\s*)?(?!(?:hrs?|hours?|mins?|minutes?|secs?|seconds?|degrees?|days?|weeks?|servings?|people|times?|x)\b)[A-Za-z(])/gi;
const STEP_VERB = /^(melt|add|cook|bake|mix|stir|combine|heat|preheat|bring|pour|place|season|whisk|roast|simmer|boil|drop|cover|serve|let|in a|in the|once|then|after|while|remove|transfer|toss|fry|air fry|sear|brown|saut[eé]|blend|chop|dice|mince|slice|cut|marinate|layer|spread|fold|roll|knead|shape|finish|start|first|next|finally|reduce|return|set|spoon|sprinkle|drizzle|squeeze|shred|dump|throw|put|grab|make|enjoy)\b/i;
const NOT_A_LABEL = /^(bake|cook|fry|air fry|grill|boil|simmer|mix|stir|add|combine|heat|preheat|roast|toss|season|marinate|blend|whisk|chill|let|then|next|finally|first|step|pour|place|put|transfer|remove|cover|reduce|bring|serve|enjoy|note|ps|p\.s|edit|update|follow|comment|save|share|link|shop|music|song|sound|song credit|credit|me|you|us)\b/i;

function stripDecor(l) {
  return l.replace(/^[\s•\-–*▪◦●✅✔☑➡→>\ufe0f]+/u, '')
    .replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+/u, '')
    .trim();
}
const noEmoji = s => String(s || '').replace(/[\p{Extended_Pictographic}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
// "Ingredients:" / "Tip: add cinnamon" / "Soup base:" -> {mode, head, rest}
function header(line, allowLabel) {
  const t = stripDecor(line);
  const m = t.match(/^([^:：]{2,40})[:：]\s*(.*)$/);
  if (!m && noEmoji(t).length > 40) return null;
  const head = noEmoji(m ? m[1] : t).replace(/[\-–]+\s*$/, '').trim();
  const rest = m ? m[2].trim() : '';
  for (const [re, mode] of HEADS) if (re.test(head)) return { mode, head, rest };
  if (!allowLabel || !head) return null;
  // a short label of its own: "Soup base:", "Dumplings:", "SAUCE"
  const words = head.split(/\s+/).length;
  const label = /^[\p{L}&'’ ]+$/u.test(head) && words <= 4 && head.length <= 30 && !NOT_A_LABEL.test(head);
  if (!label) return null;
  // "Soup base: 4 tbsp butter 1 onion…" is a label; "Chicken: 2 lbs" is just an ingredient
  if (m && (!rest || rest.split(',').length >= 3 || (QTY.test(rest) && rest.split(AMOUNT_AT).length >= 2))) return { mode: 'label', head, rest };
  if (!m && words <= 3 && head === head.toUpperCase() && /\p{Lu}{3}/u.test(head)) return { mode: 'label', head, rest: '' };
  return null;
}
const looksLikeIng = l => (QTY.test(l) || UNIT.test(l.slice(0, 30))) && l.length < 90;
const PREP_WORD = /^(and |or )|^(diced|minced|chopped|sliced|shredded|cubed|melted|softened|divided|optional|to taste|peeled|grated|crushed|drained|rinsed|beaten|room temp(erature)?|packed|sifted|cooked|thawed|halved|quartered|trimmed|finely \w+|thinly \w+|roughly \w+)$/i;
// "Follow for more!", "Save this for later": not part of the recipe
const CHATTER = /^(follow|like|comment|save|share|tag|subscribe|dm me|link in (my )?bio|check out|let me know|hope you|turn on|don(’|')t forget|who else|would you|drop a|comment ".*"|sound|song|music|credit)\b/i;
const looksLikeStep = l => /^(step\s*\d{1,2}\b|\d{1,2}[.)]\s+(?!(cups?|tbsps?|tsps?|oz|lbs?|large|medium|small|whole)\b)[A-Za-z])/i.test(l)
  || (!QTY.test(l) && !UNIT.test(l.slice(0, 25)) && ((l.length > 70 && /[a-z)][.!]\s+[A-Z]/.test(l)) || (STEP_VERB.test(l) && l.split(/\s+/).length >= 4)));
// "1 cup cheese. Cook on low 6 hrs and serve!" -> the ingredient, and the direction stuck to it
function peel(l) {
  const amt = x => QTY.test(x) || UNIT.test(x.slice(0, 30));
  // a direction that starts mid-line with a capital: "…3/4 cup chicken broth Make sure you taste…"
  const re = /(?<=[a-z)])\s+(?=[A-Z][a-z]+\b)/g;
  let c;
  while ((c = re.exec(l))) {
    const before = l.slice(0, c.index).trim(), after = l.slice(c.index).trim();
    if (STEP_VERB.test(after) && !/^\S+\s+[\d½¼¾⅓⅔⅛]/.test(after) && after.split(/\s+/).length >= 4 && amt(before)) return [before, after];
  }
  const m = l.match(/^(.{3,400}?[a-z)])[.!]\s+([A-Z].{12,})$/);
  return m && amt(m[1]) && looksLikeStep(m[2]) ? [m[1], m[2]] : [l, ''];
}
const addIng = (l, ing, steps) => { const [a, b] = peel(l); splitIng(a).forEach(x => ing.push(x)); if (b) steps.push(b); };
// one line that holds several ingredients: "🧈 4 tbsp butter 🧅 1 onion" / "2 cups flour, 1 tsp salt, 1 egg" / "…butter 1 onion 3 carrots"
function splitIng(l) {
  let parts = l.split(/\s*\p{Extended_Pictographic}[\p{Extended_Pictographic}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}]*\s*/u).map(x => x.trim()).filter(x => /\p{L}/u.test(x));
  if (parts.length < 2) parts = [l];
  const out = [];
  for (const p of parts) {
    for (const seg of p.split(/\s+[-–•|]\s+(?=[\d½¼¾⅓⅔⅛\p{L}])/u)) {
      const c = seg.split(/,\s*/).map(x => x.trim()).filter(Boolean);
      const withAmt = c.filter(x => QTY.test(x)).length, prep = c.some(x => PREP_WORD.test(x));
      if (c.length >= 2 && (withAmt === c.length || (c.length >= 3 && !prep && (withAmt >= c.length * 2 / 3 || c.every(x => x.length < 30))))) { out.push(...c); continue; }
      const byAmount = seg.split(AMOUNT_AT).map(x => x.trim()).filter(Boolean);
      if (byAmount.length >= 2 && byAmount.slice(1).every(x => QTY.test(x) && /\p{L}/u.test(x))) out.push(...byAmount);
      else out.push(seg.trim());
    }
  }
  return out.filter(Boolean);
}

function parseCaption(text) {
  let s = String(text || '').replace(/\r/g, '').replace(/\u2028|\u2029/g, '\n');
  const flat = (s.match(/\n/g) || []).length < 3 && s.length > 160;
  // captions written on one line: break before headers, bullets and numbered steps
  s = s.replace(/\s*((?:quick|easy|simple|full|the|recipe|cooking)\s+)?(ingredients?|instructions?|directions?|method|steps?|notes?)\s*[:：]\s*/gi, (m0, pre, h) => '\n' + (pre ? pre.trim() + ' ' : '') + h + ':\n')
       .replace(/\s*[•▪●]\s*/g, '\n• ')
       .replace(/\s+(\d{1,2})[.)]\s+(?=[A-Za-z])/g, '\n$1. ')
       .replace(/\s+(?=step\s*\d{1,2}\s*[:.)\-–])/gi, '\n');
  if (flat) {
    // apps that drop line breaks often leave two spaces where each one was
    if ((s.match(/\S {2,}\S/g) || []).length >= 2) s = s.replace(/ {2,}/g, '\n');
    // emoji used as bullets: "🍗 2 lb chicken 🧂 1 packet seasoning"
    s = s.replace(/\s*\p{Extended_Pictographic}[\p{Extended_Pictographic}\u200d\ufe0f\u{1F3FB}-\u{1F3FF}\s]*(?=[\d½¼¾⅓⅔⅛])/gu, '\n');
    // "…1 tsp salt Dumplings: 2 cups flour…": a capitalized label with a colon starts a new section
    s = s.replace(/\s+(?=(?:For the [a-z]+(?:\s[a-z]+)?|[A-Z][a-z]+(?:\s[a-z]+){0,2}|[A-Z]{3,}(?:\s[A-Z]{3,}){0,2})\s*[:：]\s)/g, '\n');
  }
  const lines = s.split('\n').map(l => l.trim());
  const hashOnly = l => /^(#[\p{L}\p{N}_#]*\s*)+$/u.test(l);
  const body = lines.filter(l => l && !hashOnly(l) && /[\p{L}\p{N}]/u.test(l))
    .map(l => l.replace(/(\s+#[\p{L}\p{N}_#]*)+\s*$/u, '').trim()).filter(Boolean);

  let mode = '', found = false, sawStepHead = false;
  const ing = [], steps = [], notes = [], pre = [], equip = [];
  const cap = h => '## ' + h.charAt(0).toUpperCase() + h.slice(1);
  const add = (l) => {
    if (mode === 'skip' || (CHATTER.test(l) && (pre.length || ing.length || steps.length))) return;
    if (mode === 'equip') { equip.push(l); return; }
    if (mode === 'ing' && looksLikeStep(l) && !looksLikeIng(l) && ing.some(x => !x.startsWith('## '))) { mode = 'step'; }
    if (mode === 'ing') addIng(l, ing, steps);
    else if (mode === 'step') steps.push(l.replace(/^(step\s*)?\d+\s*[.):\-–]\s*/i, ''));
    else if (mode === 'note') notes.push(l);
    else pre.push(l);
  };
  for (let i = 0; i < body.length; i++) {
    const raw = body[i];
    const h = header(raw, i > 0);
    if (h) {
      if (h.mode === 'skip' && h.rest) continue; // "Prep time: 10 min" is just that line
      found = true;
      if (h.mode === 'label') {
        const next = stripDecor(body[i + 1] || '');
        if (mode === 'step' && !(!sawStepHead && looksLikeIng(next) && !looksLikeStep(next))) steps.push(cap(h.head));
        else if (mode === 'note') { notes.push(h.head + (h.rest ? ': ' + h.rest : '')); continue; }
        else { mode = 'ing'; ing.push(cap(h.head)); }
      } else if (h.mode === 'recipe') {
        mode = 'ing';
        if (h.rest && (QTY.test(h.rest) || UNIT.test(h.rest.slice(0, 30)) || h.rest.split(',').length >= 3)) add(stripDecor(h.rest));
        continue;
      } else {
        mode = h.mode === 'ingsub' ? 'ing' : h.mode;
        if (h.mode === 'step') sawStepHead = true;
        if (h.mode === 'ingsub') ing.push(cap(h.head));
      }
      if (h.rest) add(stripDecor(h.rest));
      continue;
    }
    const l = stripDecor(raw);
    if (l) add(l);
  }
  const realIng = () => ing.filter(x => !x.startsWith('## ')).length;
  {
    // lines before (or without) any heading: quantities look like ingredients, numbered lines look like steps
    const takeSteps = !steps.length, takeIng = true;
    const si = [], ii = [], vi = [];
    pre.forEach((l, i) => {
      if (takeSteps && /^\d{1,2}[.)]\s+\D/.test(l) && !UNIT.test(l.slice(0, 18))) si.push(i);
      else if (takeIng && i > 0 && looksLikeIng(l)) ii.push(i);
      else if (takeSteps && i > 0 && looksLikeStep(l)) vi.push(i);
    });
    // sentences that read like directions count as steps once there's an ingredient list
    if (!si.length && (ii.length >= 2 || realIng())) si.push(...vi);
    const used = new Set(si.concat(ii.length >= 2 ? ii : []));
    si.sort((a, b) => a - b).forEach(i => steps.push(pre[i].replace(/^\d+[.)]\s*/, '')));
    // they come before any heading, so they go first
    if (ii.length >= 2) { const front = []; ii.forEach(i => addIng(pre[i], front, steps)); ing.unshift(...front); }
    const rest = pre.filter((l, i) => !used.has(i));
    pre.splice(0, pre.length, ...rest);
  }
  const firstLine = pre[0] || body.find(l => !header(l, false)) || '';
  const beforeEmoji = firstLine.split(/\p{Extended_Pictographic}/u)[0].trim();
  const titleLine = (beforeEmoji.length >= 3 ? beforeEmoji : firstLine).replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/^replying to @[\w.]+\s*/i, '').replace(/\s+/g, ' ').trim();
  const sentences = titleLine.split(/(?<=[.!?])\s+/);
  const TITLE_CHATTER = /^(here(’|')?s? (you go|it is|the recipe|how)|you asked|as requested|by request|ok+a?y?|omg|y(’|')?all|guys|hi+|hey+|so+ good|wow)\b/i;
  let title = (sentences.find(x => !TITLE_CHATTER.test(x) && x.split(' ').length >= 2) || sentences[0]).slice(0, 100).replace(/[.!?:：\s]+$/, '').replace(/\s+(full\s+)?recipe$/i, '');
  if (title.length < 3) title = '';
  // "cook chicken ➡️ scramble eggs ➡️ add rice": one step per arrow; chatter after the last step becomes a note
  if (steps.length === 1 && (steps[0].match(/(\u27a1\ufe0f?|\u2192|->|=>)/g) || []).length >= 2) {
    const parts = steps[0].split(/\s*(?:\u27a1\ufe0f?|\u2192|->|=>)\s*/).map(x => x.trim()).filter(Boolean);
    const last = parts.pop() || '';
    const cut = last.search(/\s*\p{Extended_Pictographic}/u);
    if (cut > 0 && last.slice(cut).replace(/[\p{Extended_Pictographic}\u200d\ufe0f\s]/gu, '').length > 20) {
      parts.push(last.slice(0, cut));
      notes.push(last.slice(cut).replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+/u, ''));
    } else parts.push(last);
    steps.splice(0, 1, ...parts);
  }
  // one long paragraph of directions: one step per sentence
  if (steps.filter(x => !x.startsWith('## ')).length === 1) {
    const i = steps.findIndex(x => !x.startsWith('## '));
    const parts = steps[i].split(/(?<=[a-z0-9)%°][.!]+)\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 3 && steps[i].length > 160) steps.splice(i, 1, ...parts);
  }
  const tidy = l => {
    let t = noEmoji(l);
    if ((t.match(/\)/g) || []).length > (t.match(/\(/g) || []).length) t = t.replace(/\)(?!.*\))/, '').trim();
    return t;
  };
  const finish = (a, upper) => {
    const out = [];
    for (const x of a) {
      let t = tidy(x);
      if (!t || t === '##') continue;
      if (upper && !t.startsWith('## ')) t = t.charAt(0).toUpperCase() + t.slice(1);
      out.push(t);
    }
    // drop headings with nothing under them
    return out.filter((t, i) => !t.startsWith('## ') || (out[i + 1] && !out[i + 1].startsWith('## ')));
  };
  const ingOut = finish(ing), stepsOut = finish(steps.filter(x => !CHATTER.test(x) && !/^(enjoy|yum+|so good|delicious|bon app[eé]tit)[!.\s]*$/i.test(x)), true);
  const META = /^((prep|cook|total|active|inactive|rest|chill)\s*time|servings?|serves|yield|makes|calories|course|cuisine|author|keywords?|print|pin|rate|save|jump to|video|equipment)\b/i;
  const leftover = pre.slice(1).filter(l => !META.test(l));
  return { title, ingredients: ingOut, steps: stepsOut, equipment: equip.map(tidy).filter(Boolean), notes: notes.map(tidy).filter(Boolean).concat(leftover.length && (ingOut.length || stepsOut.length) ? leftover : []) };
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
