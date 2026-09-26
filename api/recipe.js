// yumyumtumtum recipe reader.
// GET /api/recipe?url=<link>  ->  JSON with everything we can find about the recipe:
// photo, ingredients (with measurements and group headings), directions, notes and
// substitutions, cookware, nutrition, times, servings, and where the recipe card sits on the page.
//
// Websites: reads the schema.org Recipe data most recipe sites publish, then adds the
// notes / cookware / ingredient groups that popular recipe-card plugins (WP Recipe Maker,
// Tasty Recipes, Mediavine Create) show on the page but leave out of that data.
// TikTok / YouTube / Instagram: reads the caption or description and cover image, and
// pulls ingredients and steps out of the caption when they're written there.

const {
  isChallenge, fromArchive,
  cors, badUrl, fetchText, fetchJson, decode, clean, htmlToLines, meta, findByClass,
  attrOf, jsonLdBlocks, findRecipe, isoMinutes, pickImage, asArray, mapMeals, parseCaption
} = require('../lib/parse');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const url = String((req.query && req.query.url) || '').trim();
  const bad = badUrl(url);
  if (bad) { res.status(400).json({ ok: false, error: bad }); return; }
  try {
    const out = await readRecipe(url);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) {
    res.status(200).json({ ok: false, error: (e && e.message) || 'Could not read that page.' });
  }
};

async function readRecipe(url) {
  const host = new URL(url).hostname.replace(/^(www|m|mobile)\./, '');
  if (/(^|\.)tiktok\.com$/.test(host)) return readTikTok(url);
  if (host === 'youtu.be' || /(^|\.)youtube\.com$/.test(host)) return readYouTube(url);
  if (/(^|\.)instagram\.com$/.test(host)) return readSocialPage(url, 'instagram');
  if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.watch') return readSocialPage(url, 'facebook');
  return readWebsite(url);
}

/* ---------------- websites ---------------- */
async function readWebsite(url) {
  let html = '', finalUrl = url, via = 'site', problem = '';
  try {
    const r = await fetchText(url);
    html = r.text; finalUrl = r.finalUrl;
    if (isChallenge(html)) { html = ''; problem = 'That site blocked the recipe reader.'; }
  } catch (e) { problem = e.message; }
  // blocked, or no recipe card in what came back: try the Internet Archive's saved copy
  if (!html || !findRecipe(jsonLdBlocks(html))) {
    try {
      const a = await fromArchive(finalUrl);
      if (a && !isChallenge(a.html) && (findRecipe(jsonLdBlocks(a.html)) || !html)) { html = a.html; via = 'archive'; }
    } catch (e) { /* keep what we have */ }
  }
  if (!html) throw new Error(problem || 'Couldn’t read that page.');
  const out = blank(finalUrl);
  out.via = via;
  out.kind = 'page';
  out.siteName = decode(meta(html, 'og:site_name')) || new URL(finalUrl).hostname.replace(/^www\./, '');
  out.title = decode(meta(html, 'og:title')) || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  out.description = decode(meta(html, 'og:description') || meta(html, 'description'));
  out.image = meta(html, 'og:image') || meta(html, 'twitter:image');

  const recipe = findRecipe(jsonLdBlocks(html));
  if (recipe) {
    out.kind = 'recipe';
    out.title = clean(decode(recipe.name)) || out.title;
    out.description = clean(decode(recipe.description)) || out.description;
    out.image = pickImage(recipe.image) || out.image;
    const a = asArray(recipe.author)[0];
    out.author = clean(decode(typeof a === 'string' ? a : a && a.name));
    out.prepTime = isoMinutes(recipe.prepTime);
    out.cookTime = isoMinutes(recipe.cookTime);
    out.totalTime = isoMinutes(recipe.totalTime) || (out.prepTime + out.cookTime);
    const y = asArray(recipe.recipeYield).map(v => String(v)).filter(Boolean);
    out.yieldText = clean(y.find(v => /\D/.test(v)) || y[0] || '');
    const n = parseInt((y.join(' ').match(/\d+/) || [])[0], 10);
    out.servings = n > 0 && n < 500 ? n : 0;
    out.cuisine = clean(decode(asArray(recipe.recipeCuisine)[0] || ''));
    out.meals = mapMeals(asArray(recipe.recipeCategory).concat(asArray(recipe.keywords)));
    out.ingredients = asArray(recipe.recipeIngredient).map(s => clean(decode(String(s)))).filter(Boolean);
    out.steps = instructions(recipe.recipeInstructions);
    out.equipment = asArray(recipe.tool).concat(asArray(recipe.supply))
      .map(t => clean(decode(typeof t === 'string' ? t : (t && (t.name || t.text)) || ''))).filter(Boolean);
    out.nutrition = nutrition(recipe.nutrition);
  }

  // recipe-card plugins: notes, cookware, ingredient groups, and the card's position on the page
  const cards = [
    { notes: 'wprm-recipe-notes', equip: 'wprm-recipe-equipment-name', anchor: /id=["'](wprm-recipe-container-\d+)["']/i },
    { notes: 'tasty-recipes-notes', equip: 'tasty-recipes-equipment', anchor: /id=["'](tasty-recipes-\d+(?:-jump-target)?)["']/i },
    { notes: 'mv-create-notes', equip: 'mv-create-products', anchor: /id=["'](mv-creation-\d+[\w-]*)["']/i }
  ];
  for (const c of cards) {
    const nb = findByClass(html, c.notes);
    if (nb.length && !out.notes.length) out.notes = nb.flatMap(htmlToLines).filter(l => !/^notes:?$/i.test(l));
    const eq = findByClass(html, c.equip);
    if (eq.length && !out.equipment.length) {
      const items = c.equip === 'wprm-recipe-equipment-name' ? eq.map(h => htmlToLines(h).join(' ')) : eq.flatMap(htmlToLines);
      out.equipment = dedupe(items.filter(l => l && !/^(equipment|products|recommended products)$/i.test(l)));
    }
    const m = html.match(c.anchor);
    if (m && !out.anchor) out.anchor = m[1];
  }
  const groups = wprmGroups(html);
  if (groups) out.ingredients = groups;
  if (!out.anchor) {
    const m = html.match(/id=["'](recipe-card|recipe-container|recipe|mntl-sc-block_[\w-]*recipe[\w-]*)["']/i);
    if (m) out.anchor = m[1];
  }
  if (out.image) out.image = new URL(decode(out.image), finalUrl).href;
  return out;
}

function instructions(v) {
  const steps = [];
  const walk = (x) => {
    if (!x) return;
    if (typeof x === 'string') {
      const t = decode(x);
      (/<\w/.test(t) ? htmlToLines(t) : t.split(/\n+/)).map(clean).filter(Boolean).forEach(s => steps.push(s));
      return;
    }
    if (Array.isArray(x)) { x.forEach(walk); return; }
    const type = asArray(x['@type']).join(' ');
    if (/HowToSection/i.test(type)) {
      if (x.name) steps.push('## ' + clean(decode(x.name)));
      walk(x.itemListElement || x.steps);
      return;
    }
    if (x.itemListElement && !x.text) { walk(x.itemListElement); return; }
    const t = x.text || x.name || x.description || '';
    if (t) walk(String(t));
  };
  walk(v);
  return steps.map(s => s.replace(/^(step\s*)?\d+[.)]\s+/i, '')).filter(Boolean);
}

const NUT = [
  ['calories', 'Calories'], ['proteinContent', 'Protein'], ['carbohydrateContent', 'Carbs'],
  ['fatContent', 'Fat'], ['saturatedFatContent', 'Saturated fat'], ['fiberContent', 'Fiber'],
  ['sugarContent', 'Sugar'], ['sodiumContent', 'Sodium'], ['cholesterolContent', 'Cholesterol']
];
function nutrition(n) {
  if (!n || typeof n !== 'object') return [];
  return NUT.filter(([k]) => n[k]).map(([k, label]) => ({ label, value: clean(decode(String(n[k]))) }));
}

// WP Recipe Maker ingredient groups ("For the sauce", "For the dough") that the structured data flattens
function wprmGroups(html) {
  const blocks = findByClass(html, 'wprm-recipe-ingredient-group');
  if (blocks.length < 2) return null;
  const out = [];
  for (const b of blocks) {
    const name = findByClass(b, 'wprm-recipe-group-name').map(h => htmlToLines(h).join(' ')).join(' ').trim();
    const items = findByClass(b, 'wprm-recipe-ingredient').map(h => htmlToLines(h).join(' ').replace(/^[▢☐□\s]+/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!items.length) continue;
    if (name) out.push('## ' + name.replace(/:$/, ''));
    out.push(...items);
  }
  return out.filter(l => !l.startsWith('## ')).length ? out : null;
}

/* ---------------- TikTok ---------------- */
async function readTikTok(url) {
  let target = url;
  if (/\/\/(vm|vt)\.tiktok\.com\//i.test(url) || /tiktok\.com\/t\//i.test(url)) {
    try { target = (await fetchText(url, { headOnly: true })).finalUrl || url; } catch (e) { /* use the short link */ }
  }
  const o = await fetchJson('https://www.tiktok.com/oembed?url=' + encodeURIComponent(target));
  const out = blank(target);
  out.kind = 'video';
  out.siteName = 'TikTok';
  out.author = o.author_unique_id ? '@' + o.author_unique_id : (o.author_name || '');
  out.image = o.thumbnail_url || '';
  applyCaption(out, decode(o.title || ''));
  return out;
}

/* ---------------- YouTube ---------------- */
async function readYouTube(url) {
  const o = await fetchJson('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url)).catch(() => ({}));
  const out = blank(url);
  out.kind = 'video';
  out.siteName = 'YouTube';
  out.author = o.author_name || '';
  out.title = o.title || '';
  const id = ytId(url);
  out.image = id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : (o.thumbnail_url || '');
  let desc = '';
  try {
    const { text: html } = await fetchText(id ? 'https://www.youtube.com/watch?v=' + id : url);
    const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (m) desc = JSON.parse('"' + m[1] + '"');
    if (!out.title) out.title = decode(meta(html, 'og:title'));
    const max = id && html.includes('maxresdefault') ? 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' : '';
    if (max) out.image = max;
  } catch (e) { /* oEmbed data is still useful */ }
  applyCaption(out, desc);
  return out;
}
function ytId(u) {
  try {
    const x = new URL(u);
    if (x.hostname === 'youtu.be') return x.pathname.slice(1).split('/')[0];
    return x.searchParams.get('v') || (x.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/) || [])[2] || '';
  } catch (e) { return ''; }
}

/* ---------------- Instagram / Facebook (best effort: they often hide posts from servers) ---------------- */
async function readSocialPage(url, site) {
  const { text: html, finalUrl } = await fetchText(url);
  const out = blank(finalUrl);
  out.kind = 'video';
  out.siteName = site === 'instagram' ? 'Instagram' : 'Facebook';
  out.image = meta(html, 'og:image');
  let cap = decode(meta(html, 'og:description') || meta(html, 'description'));
  // Instagram: 1,234 likes, 56 comments - user on May 1, 2026: "caption..."
  const m = cap.match(/^[\d,.\sKkMm]+likes?,.*?:\s*"([\s\S]*)"\.?$/);
  if (m) cap = m[1];
  const t = decode(meta(html, 'og:title'));
  const by = t.match(/^(.*?)\s+on\s+(Instagram|Facebook)/i);
  if (by) out.author = by[1];
  applyCaption(out, cap);
  if (!out.title && t) out.title = t.replace(/\s+on\s+(Instagram|Facebook).*$/i, '').slice(0, 120);
  return out;
}

/* ---------------- helpers ---------------- */
function applyCaption(out, text) {
  const cap = String(text || '').trim();
  if (!cap) return;
  out.caption = cap;
  const p = parseCaption(cap);
  if (!out.title) out.title = p.title;
  out.ingredients = p.ingredients;
  out.steps = p.steps;
  out.notes = p.notes;
}
function blank(finalUrl) {
  return {
    finalUrl, kind: 'page', title: '', description: '', image: '', author: '', siteName: '',
    ingredients: [], steps: [], notes: [], equipment: [], nutrition: [],
    prepTime: 0, cookTime: 0, totalTime: 0, yieldText: '', servings: 0, cuisine: '', meals: [],
    anchor: '', caption: ''
  };
}
const dedupe = a => a.filter((x, i) => a.indexOf(x) === i);

module.exports.readRecipe = readRecipe;
