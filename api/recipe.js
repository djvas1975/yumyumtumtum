// yumyumtumtum recipe reader.
// GET /api/recipe?url=<link>  ->  JSON with everything we can find about the recipe:
// photo, ingredients (with measurements and group headings), directions, notes and
// substitutions, cookware, nutrition, times, servings, and where the recipe card sits on the page.
//
// Websites: reads the schema.org Recipe data most recipe sites publish, then adds the
// notes / cookware / ingredient groups that popular recipe-card plugins (WP Recipe Maker,
// Tasty Recipes, Mediavine Create) show on the page but leave out of that data.
// TikTok / YouTube / Instagram / Facebook: reads the whole caption or description (the part
// hidden behind "more") and the cover image, pulls ingredients and steps out of the caption,
// and follows a "full recipe" link in it to the recipe site when there is one.
// Pinterest: follows the pin to the recipe website it came from.

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
  const trace = req.query && req.query.debug ? [] : null;
  try {
    const out = await readRecipe(url, trace);
    if (trace) out.trace = trace;
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) {
    res.status(200).json({ ok: false, error: (e && e.message) || 'Could not read that page.', trace: trace || undefined });
  }
};

async function readRecipe(url, trace) {
  const host = new URL(url).hostname.replace(/^(www|m|mobile)\./, '');
  if (/(^|\.)tiktok\.com$/.test(host)) return withLinkedRecipe(await readTikTok(url, trace), trace);
  if (host === 'youtu.be' || /(^|\.)youtube\.com$/.test(host)) return withLinkedRecipe(await readYouTube(url), trace);
  if (/(^|\.)instagram\.com$/.test(host)) return withLinkedRecipe(await readInstagram(url, trace), trace);
  if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.watch') return withLinkedRecipe(await readSocialPage(url, 'facebook'), trace);
  if (host === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(host)) return readPinterest(url, trace);
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
async function readTikTok(url, trace) {
  const target = await resolveTikTok(url, trace);
  // the post's own page has the whole caption with its line breaks (TikTok's quick lookup squashes it onto one line)
  let page = null;
  try { page = await tikTokPage(target, trace); }
  catch (e) { if (trace) trace.push('page failed: ' + e.message); }
  if (page && (page.full || /\/photo\//.test(target))) return page.out;
  if (/\/photo\//.test(target)) throw new Error('TikTok wouldn’t share this post’s details.');
  let o = null;
  try { o = await fetchJson('https://www.tiktok.com/oembed?url=' + encodeURIComponent(target)); }
  catch (e) { if (trace) trace.push('oembed failed: ' + e.message + ' for ' + target); }
  if (!o) { if (page) return page.out; throw new Error('TikTok wouldn’t share this video’s details.'); }
  const out = blank(target);
  out.kind = 'video';
  out.siteName = 'TikTok';
  out.author = o.author_unique_id ? '@' + o.author_unique_id : (o.author_name || (page && page.out.author) || '');
  out.image = o.thumbnail_url || (page && page.out.image) || '';
  const cap = decode(o.title || '');
  applyCaption(out, page && page.out.caption.length > cap.length ? page.out.caption : cap);
  return out;
}
// Caption, creator, and cover (or first slide) from the post's own page. full = the page's own data was there.
async function tikTokPage(url, trace) {
  const { text: html } = await fetchText(url, { trace });
  let item = null;
  const m = html.match(/<script[^>]*id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    try {
      const scope = JSON.parse(m[1]).__DEFAULT_SCOPE__ || {};
      const k = Object.keys(scope).find(x => /detail/.test(x) && scope[x] && scope[x].itemInfo);
      item = k ? scope[k].itemInfo.itemStruct : null;
    } catch (e) { if (trace) trace.push('page data unreadable'); }
  }
  if (!item) {
    const s2 = html.match(/<script[^>]*id=["']SIGI_STATE["'][^>]*>([\s\S]*?)<\/script>/);
    if (s2) { try { const im = JSON.parse(s2[1]).ItemModule || {}; item = im[Object.keys(im)[0]] || null; } catch (e) {} }
  }
  let caption = '', image = '', author = '';
  if (item) {
    caption = item.desc || '';
    const ip = item.imagePost || {};
    if (ip.title && caption.indexOf(ip.title) < 0) caption = ip.title + '\n' + caption;
    author = typeof item.author === 'string' ? item.author : (item.author && item.author.uniqueId) || '';
    const slide = (ip.images || [])[0];
    const v = item.video || {};
    image = (slide && ((slide.imageURL && (slide.imageURL.urlList || [])[0]) || (slide.displayImage && (slide.displayImage.urlList || [])[0]))) || v.cover || v.originCover || v.dynamicCover || '';
    if (trace) trace.push('page data found: ' + (ip.images ? ip.images.length + ' slides' : 'video') + ', caption ' + caption.length + ' chars');
  }
  if (!caption) {
    caption = decode(meta(html, 'og:description') || meta(html, 'description'));
    const q = caption.match(/:\s*["“]([\s\S]*?)["”]\.?\s*(\d[\d.,]*[KkMm]?\s+Likes[\s\S]*)?$/);
    if (q) caption = q[1];
  }
  if (!image) image = meta(html, 'og:image');
  if (!author) { const a = url.match(/tiktok\.com\/@([\w.-]+)/); if (a && a[1] !== 'tiktok') author = a[1]; }
  if (!caption && !image) throw new Error('TikTok wouldn’t share this post’s details.');
  const out = blank(url);
  out.kind = 'video';
  out.siteName = 'TikTok';
  out.author = author ? '@' + String(author).replace(/^@/, '') : '';
  out.image = image;
  applyCaption(out, caption);
  return { out, full: !!(item && item.desc) };
}

// Share links (tiktok.com/t/…, vm.tiktok.com/…) point to the full video address; find it.
async function resolveTikTok(url, trace) {
  const full = u => (u.match(/https?:\/\/(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/(?:video|photo)\/\d+/) || [])[0];
  if (full(url)) return full(url);
  try {
    const r = await fetchText(url, { headOnly: true, trace });
    if (full(r.finalUrl)) return full(r.finalUrl);
  } catch (e) { if (trace) trace.push('resolve: ' + e.message); }
  // some answers are a page instead of a redirect: look inside it for the video address or number
  try {
    const r = await fetchText(url, { trace });
    const html = r.text.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
    const f = full(r.finalUrl) || full(html);
    if (f) return f;
    const id = (html.match(/\/video\/(\d{15,21})/) || html.match(/"(?:itemId|videoId|aweme_id)"\s*:\s*"?(\d{15,21})/) || [])[1];
    if (id) return 'https://www.tiktok.com/@tiktok/video/' + id;
  } catch (e) { if (trace) trace.push('page: ' + e.message); }
  return url;
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

/* ---------------- Instagram ---------------- */
// The post page only shows servers a short teaser, but every post also has an embed version with the whole caption.
async function readInstagram(url, trace) {
  let code = igCode(url), page = url;
  if (!code) {
    // share links (instagram.com/share/…) redirect to the post
    try { const r = await fetchText(url, { headOnly: true, trace }); page = r.finalUrl; code = igCode(page); }
    catch (e) { if (trace) trace.push('resolve: ' + e.message); }
  }
  let caption = '', image = '', author = '', problem = '';
  if (code) {
    try {
      const { text: html } = await fetchText('https://www.instagram.com/p/' + code + '/embed/captioned/', { trace });
      const e = igEmbed(html);
      caption = e.caption; image = e.image; author = e.author;
      if (trace) trace.push('embed: caption ' + caption.length + ' chars, photo ' + (image ? 'yes' : 'no'));
    } catch (e) { problem = e.message; if (trace) trace.push('embed failed: ' + e.message); }
  }
  if (!caption || !image) {
    try {
      const { text: html } = await fetchText(page, { trace });
      const o = igOg(html);
      if (!caption) caption = o.caption;
      if (!image) image = o.image;
      if (!author) author = o.author;
    } catch (e) { problem = problem || e.message; if (trace) trace.push('page failed: ' + e.message); }
  }
  if (!caption && !image) throw new Error(problem || 'Instagram wouldn’t share this post’s details.');
  const out = blank(url);
  out.kind = 'video';
  out.siteName = 'Instagram';
  out.author = author ? '@' + author.replace(/^@/, '') : '';
  out.image = image;
  applyCaption(out, caption);
  return out;
}
function igCode(u) {
  const m = String(u).match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]{5,})/i);
  return m ? m[1] : '';
}
function igEmbed(html) {
  let caption = '', image = '', author = '';
  // the post's data, when the embed carries it
  const cj = html.match(/"contextJSON"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (cj) {
    try {
      const media = findObj(JSON.parse(JSON.parse('"' + cj[1] + '"')), o => o.edge_media_to_caption || o.display_url);
      if (media) {
        const e = media.edge_media_to_caption && media.edge_media_to_caption.edges && media.edge_media_to_caption.edges[0];
        caption = (e && e.node && e.node.text) || '';
        image = media.display_url || media.thumbnail_src || '';
        author = (media.owner && media.owner.username) || '';
      }
    } catch (e) { /* fall through to the page itself */ }
  }
  if (!caption) {
    const m = html.match(/"edge_media_to_caption"\s*:\s*\{\s*"edges"\s*:\s*\[\s*\{\s*"node"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) { try { caption = JSON.parse('"' + m[1] + '"'); } catch (e) {} }
  }
  if (!caption) {
    const box = findByClass(html, 'Caption')[0];
    if (box) {
      const inner = box
        .replace(/<a\b[^>]*class=["'][^"']*CaptionUsername[^"']*["'][^>]*>[\s\S]*?<\/a>/i, (m0) => { author = author || clean(decode(m0.replace(/<[^>]+>/g, ''))); return ''; })
        .replace(/<div\b[^>]*class=["'][^"']*CaptionComments[\s\S]*$/i, '');
      caption = htmlToLines(inner.replace(/<br\s*\/?>/gi, '\n')).join('\n');
    }
  }
  if (!image) {
    const tag = (html.match(/<img\b[^>]*class=["'][^"']*EmbeddedMediaImage[^"']*["'][^>]*>/i) || [])[0];
    if (tag) image = decode(attrOf(tag, 'src'));
  }
  if (!author) {
    const u = findByClass(html, 'UsernameText')[0];
    if (u) author = clean(decode(u.replace(/<[^>]+>/g, '')));
  }
  return { caption: caption.trim(), image, author };
}
// the post page's own tags: 68K likes, 526 comments - someone on March 3, 2025: "caption…"
function igOg(html) {
  const d = decode(meta(html, 'og:description') || meta(html, 'description')).trim();
  const t = decode(meta(html, 'og:title')).trim();
  let caption = '', author = '';
  const m = d.match(/^[\d,.]+\s*[KkMm]?\s+likes?,\s*[\d,.]+\s*[KkMm]?\s+comments?\s*[-–]\s*([\w.]+)\s+on\s+[^:]{3,40}:\s*["“]?([\s\S]*?)["”]?\.?$/i);
  if (m) { author = m[1]; caption = m[2]; }
  else if (!/^[\d,.]+\s*[KkMm]?\s+(likes?|followers?)\b/i.test(d)) caption = d;
  const tm = t.match(/^(.*?)\s+on\s+Instagram\s*:\s*["“]?([\s\S]*?)["”]?$/i);
  if (tm && tm[2].length > caption.length) caption = tm[2];
  return { caption: caption.trim(), author, image: meta(html, 'og:image') };
}

/* ---------------- Facebook (best effort: it often hides posts from servers) ---------------- */
async function readSocialPage(url, site) {
  const { text: html, finalUrl } = await fetchText(url);
  const out = blank(finalUrl);
  out.kind = 'video';
  out.siteName = 'Facebook';
  out.image = meta(html, 'og:image');
  let cap = decode(meta(html, 'og:description') || meta(html, 'description'));
  if (/^[\d,.]+\s*[KkMm]?\s+(likes?|views?|reactions?)\b/i.test(cap) && !/\n/.test(cap)) cap = cap.replace(/^[^|·]*[|·]\s*/, '');
  const t = decode(meta(html, 'og:title'));
  const by = t.match(/^(.*?)\s+on\s+Facebook/i);
  if (by) out.author = by[1];
  applyCaption(out, cap);
  if (!out.title && t && !/^(facebook|log in|watch)\b/i.test(t)) out.title = t.replace(/\s+on\s+Facebook.*$/i, '').replace(/\s*\|\s*Facebook.*$/i, '').slice(0, 120);
  return out;
}

/* ---------------- Pinterest: follow the pin to the recipe it came from ---------------- */
async function readPinterest(url, trace) {
  let page = url, id = pinId(url);
  if (!id) {
    try { const r = await fetchText(url, { headOnly: true, trace }); page = r.finalUrl; id = pinId(page); }
    catch (e) { if (trace) trace.push('resolve: ' + e.message); }
  }
  let link = '', title = '', desc = '', image = '', author = '';
  if (id) {
    try {
      const j = await fetchJson('https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=' + id);
      const p = (j && Array.isArray(j.data) && j.data[0]) || {};
      link = p.link || '';
      title = p.title || p.grid_title || '';
      desc = p.description || p.closeup_unified_description || '';
      const im = p.images || {};
      image = ((im.orig || im['736x'] || im['564x'] || im['474x'] || im['237x']) || {}).url || '';
      author = (p.pinner && p.pinner.username) || '';
      if (trace) trace.push('pin info: link ' + (link || 'none'));
    } catch (e) { if (trace) trace.push('pin info failed: ' + e.message); }
  }
  if (!link || !image) {
    try {
      const { text: html } = await fetchText(page, { trace });
      if (!link) {
        const found = (html.replace(/\\u002F/gi, '/').replace(/\\\//g, '/').match(/"link"\s*:\s*"(https?:[^"]+)"/g) || [])
          .map(x => x.replace(/^"link"\s*:\s*"/, '').replace(/"$/, ''))
          .find(u => !/pinterest\.|pinimg\.com|pin\.it/i.test(u));
        link = found || meta(html, 'og:see_also') || '';
      }
      if (!image) image = meta(html, 'og:image');
      if (!title) title = decode(meta(html, 'og:title'));
      if (!desc) desc = decode(meta(html, 'og:description') || meta(html, 'description'));
    } catch (e) { if (trace) trace.push('pin page failed: ' + e.message); }
  }
  link = decode(link);
  if (link && !/pinterest\.|pin\.it/i.test(link) && !badUrl(link)) {
    try {
      const site = await withTimeout(readWebsite(link), 20000);
      if (site.kind === 'recipe' || realCount(site.ingredients)) {
        site.recipeUrl = site.finalUrl;
        site.finalUrl = url;
        if (!site.image) site.image = image;
        return site;
      }
      if (trace) trace.push('no recipe card at ' + link);
    } catch (e) { if (trace) trace.push('recipe site failed: ' + e.message); }
  }
  const out = blank(url);
  out.siteName = 'Pinterest';
  out.author = author;
  out.image = image;
  out.title = clean(title).replace(/\s*\|\s*Pinterest.*$/i, '').slice(0, 140);
  if (link && !/pinterest\.|pin\.it/i.test(link)) out.recipeUrl = link;
  applyCaption(out, [title, desc].filter(Boolean).join('\n'));
  return out;
}
function pinId(u) {
  const m = String(u).match(/pinterest\.[a-z.]+\/pin\/(?:[\w-]*--)?(\d{6,})/i);
  return m ? m[1] : '';
}

/* ---------------- a "full recipe" link in a caption or description ---------------- */
const NOT_RECIPE_SITE = /(^|\.)(tiktok|instagram|facebook|fb|youtube|youtu|pinterest|pin|twitter|x|threads|snapchat|linktr|linkin|beacons|stan|campsite|bio|amazon|amzn|a|geni|shopmy|liketk|ltk|shopltk|patreon|spotify|apple|google|goo|walmart|target|instacart|hellofresh|etsy|gofundme|onlyfans|discord|twitch|substack|cash|venmo|paypal)\.[a-z.]+$/i;
function recipeLinks(text) {
  const found = String(text || '').match(/\bhttps?:\/\/[^\s"'<>)\]]+|\bwww\.[a-z0-9-]+\.[^\s"'<>)\]]+|\b[a-z0-9-]+\.(?:com|net|org|co|blog|kitchen|recipes|cooking|food)\/[^\s"'<>)\]]+/gi) || [];
  const out = [];
  for (let u of found) {
    u = u.replace(/[.,!?;:…]+$/, '');
    if (!/^https?:/i.test(u)) u = 'https://' + u;
    let h;
    try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { continue; }
    if (NOT_RECIPE_SITE.test(h) || badUrl(u) || out.includes(u)) continue;
    out.push(u);
  }
  return out.slice(0, 2);
}
async function withLinkedRecipe(out, trace) {
  if (realCount(out.ingredients) >= 3 && out.steps.length) return out;
  for (const link of recipeLinks([out.caption, out.description].join('\n'))) {
    try {
      const site = await withTimeout(readWebsite(link), 15000);
      if (site.kind !== 'recipe' || !(realCount(site.ingredients) || site.steps.length)) { if (trace) trace.push('no recipe card at ' + link); continue; }
      if (trace) trace.push('recipe from ' + link);
      out.recipeUrl = site.finalUrl;
      out.title = site.title || out.title;
      if (realCount(site.ingredients) > realCount(out.ingredients)) out.ingredients = site.ingredients;
      if (site.steps.length > out.steps.length) out.steps = site.steps;
      out.notes = dedupe(site.notes.concat(out.notes));
      if (site.equipment.length) out.equipment = site.equipment;
      ['nutrition', 'meals'].forEach(k => { if (site[k].length) out[k] = site[k]; });
      ['prepTime', 'cookTime', 'totalTime', 'servings', 'yieldText', 'cuisine', 'description', 'anchor'].forEach(k => { if (site[k]) out[k] = site[k]; });
      if (!out.image) out.image = site.image;
      return out;
    } catch (e) { if (trace) trace.push('link failed: ' + link + ' ' + e.message); }
  }
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
  if (p.equipment && p.equipment.length) out.equipment = p.equipment;
}
function blank(finalUrl) {
  return {
    finalUrl, kind: 'page', title: '', description: '', image: '', author: '', siteName: '',
    ingredients: [], steps: [], notes: [], equipment: [], nutrition: [],
    prepTime: 0, cookTime: 0, totalTime: 0, yieldText: '', servings: 0, cuisine: '', meals: [],
    anchor: '', caption: '', recipeUrl: ''
  };
}
const dedupe = a => a.filter((x, i) => a.indexOf(x) === i);
const realCount = a => (a || []).filter(x => !/^##\s/.test(x)).length;
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('That site took too long to answer.')), ms); })]).finally(() => clearTimeout(t));
}
// first object (searching depth-first) that passes test
function findObj(node, test, depth) {
  depth = depth || 0;
  if (!node || typeof node !== 'object' || depth > 12) return null;
  if (!Array.isArray(node) && test(node)) return node;
  for (const k of Object.keys(node)) { const r = findObj(node[k], test, depth + 1); if (r) return r; }
  return null;
}

module.exports.readRecipe = readRecipe;
