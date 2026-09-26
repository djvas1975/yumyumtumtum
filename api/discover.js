// yumyumtumtum recipe discovery.
// GET /api/discover?q=chicken+enchiladas  ->  matching recipes from free recipe sites
// GET /api/discover                       ->  the newest recipes from those sites
// Optional: sites=delish,tasty (only these sites), n=8 (per site), debug=1 (how each site answered)
//
// Each item: { title, url, image, source, sourceName, by }
// The phone app ranks these by what Dave likes; this only gathers them.

const { cors, fetchText, decode, clean } = require('../lib/parse');

const enc = encodeURIComponent;
const SITE_TIMEOUT = 8000;

// page: the site's own search results page, read like a browser would
// wp:   the site's built-in WordPress search
// cdx:  sites that turn servers away; the Internet Archive's list of their recipe pages, matched by name
const SOURCES = [
  { id: 'delish', name: 'Delish', kind: 'page', core: true, home: 'https://www.delish.com',
    search: q => 'https://www.delish.com/search/?q=' + enc(q), latest: 'https://www.delish.com/cooking/recipe-ideas/',
    link: /^\/cooking\/recipe-ideas\/a\d{4,}\/[a-z0-9-]+\/?$/ },
  { id: 'pioneerwoman', name: 'The Pioneer Woman', kind: 'page', core: true, home: 'https://www.thepioneerwoman.com',
    search: q => 'https://www.thepioneerwoman.com/search/?q=' + enc(q), latest: 'https://www.thepioneerwoman.com/food-cooking/recipes/',
    link: /^\/food-cooking\/(recipes|meals-menus)\/a\d{4,}\/[a-z0-9-]+\/?$/ },
  { id: 'tasty', name: 'Tasty', kind: 'page', core: true, home: 'https://tasty.co',
    search: q => 'https://tasty.co/search?q=' + enc(q), latest: 'https://tasty.co/latest',
    link: /^\/recipe\/[a-z0-9-]+\/?$/ },
  { id: 'foodnetwork', name: 'Food Network', kind: 'cdx', core: true, home: 'https://www.foodnetwork.com', prefix: 'foodnetwork.com/recipes/',
    link: /^\/recipes\/(?:[a-z0-9-]+\/)?[a-z0-9-]+-\d{5,}\/?$/ },
  { id: 'allrecipes', name: 'Allrecipes', kind: 'cdx', core: true, home: 'https://www.allrecipes.com', prefix: 'allrecipes.com/recipe/',
    link: /^\/recipe\/\d+\/[a-z0-9-]+\/?$/ },
  { id: 'recipetineats', name: 'RecipeTin Eats', kind: 'wp', core: true, home: 'https://www.recipetineats.com' },
  { id: 'spendwithpennies', name: 'Spend With Pennies', kind: 'wp', core: true, home: 'https://www.spendwithpennies.com' },
  { id: 'cafedelites', name: 'Cafe Delites', kind: 'wp', core: true, home: 'https://cafedelites.com' },
  { id: 'tastesbetterfromscratch', name: 'Tastes Better From Scratch', kind: 'wp', core: true, home: 'https://tastesbetterfromscratch.com' },
  { id: 'therecipecritic', name: 'The Recipe Critic', kind: 'wp', core: true, home: 'https://therecipecritic.com' },
  { id: 'damndelicious', name: 'Damn Delicious', kind: 'wp', core: true, home: 'https://damndelicious.net' },
  { id: 'gimmesomeoven', name: 'Gimme Some Oven', kind: 'wp', home: 'https://www.gimmesomeoven.com' },
  { id: 'pinchofyum', name: 'Pinch of Yum', kind: 'wp', home: 'https://pinchofyum.com' },
  { id: 'dinneratthezoo', name: 'Dinner at the Zoo', kind: 'wp', home: 'https://www.dinneratthezoo.com' },
  { id: 'onceuponachef', name: 'Once Upon a Chef', kind: 'wp', home: 'https://www.onceuponachef.com' },
  { id: 'lecremedelacrumb', name: 'Le Creme de la Crumb', kind: 'wp', home: 'https://www.lecremedelacrumb.com' },
  // cuisine specialists, asked when the search mentions their cuisine
  { id: 'isabeleats', name: 'Isabel Eats', kind: 'wp', home: 'https://www.isabeleats.com', topics: /mexican|taco|enchilada|salsa|tamale|pozole|birria|carnitas|burrito|quesadilla|tex[- ]mex|elote|churro/ },
  { id: 'mexicanplease', name: 'Mexican Please', kind: 'wp', home: 'https://www.mexicanplease.com', topics: /mexican|taco|enchilada|salsa|tamale|pozole|birria|carnitas|burrito|quesadilla|mole/ },
  { id: 'thewoksoflife', name: 'The Woks of Life', kind: 'wp', home: 'https://thewoksoflife.com', topics: /chinese|asian|stir fry|fried rice|dumpling|lo mein|wonton|noodle|szechuan|sichuan|cantonese|bao/ },
  { id: 'justonecookbook', name: 'Just One Cookbook', kind: 'wp', home: 'https://www.justonecookbook.com', topics: /japanese|asian|ramen|sushi|teriyaki|katsu|miso|udon|tempura|gyoza/ },
  { id: 'hotthaikitchen', name: 'Hot Thai Kitchen', kind: 'wp', home: 'https://hot-thai-kitchen.com', topics: /thai|curry|pad |tom yum|tom kha|larb|asian/ },
  { id: 'mykoreankitchen', name: 'My Korean Kitchen', kind: 'wp', home: 'https://mykoreankitchen.com', topics: /korean|bulgogi|kimchi|bibimbap|gochujang|japchae|asian/ },
  { id: 'indianhealthyrecipes', name: 'Swasthi’s Recipes', kind: 'wp', home: 'https://www.indianhealthyrecipes.com', topics: /indian|curry|masala|tikka|biryani|dal|paneer|naan|korma/ },
  { id: 'themediterraneandish', name: 'The Mediterranean Dish', kind: 'wp', home: 'https://www.themediterraneandish.com', topics: /mediterranean|greek|middle eastern|hummus|falafel|shawarma|gyro|tzatziki|lebanese|moroccan|turkish/ },
  { id: 'dimitrasdishes', name: 'Dimitras Dishes', kind: 'wp', home: 'https://www.dimitrasdishes.com', topics: /greek|mediterranean|gyro|souvlaki|spanakopita|moussaka|tzatziki/ },
  { id: 'koreanbapsang', name: 'Korean Bapsang', kind: 'wp', test: true, home: 'https://www.koreanbapsang.com' },
  { id: 'beyondkimchee', name: 'Beyond Kimchee', kind: 'wp', test: true, home: 'https://www.beyondkimchee.com' },
  { id: 'kimchimari', name: 'Kimchimari', kind: 'wp', test: true, home: 'https://kimchimari.com' },
  { id: 'pickledplum', name: 'Pickled Plum', kind: 'wp', test: true, home: 'https://pickledplum.com' },
  { id: 'chopstickchronicles', name: 'Chopstick Chronicles', kind: 'wp', test: true, home: 'https://www.chopstickchronicles.com' },
  { id: 'omnivorescookbook', name: 'Omnivore’s Cookbook', kind: 'wp', test: true, home: 'https://omnivorescookbook.com' },
  { id: 'redhousespice', name: 'Red House Spice', kind: 'wp', test: true, home: 'https://redhousespice.com' },
  { id: 'cookwithmanali', name: 'Cook with Manali', kind: 'wp', test: true, home: 'https://www.cookwithmanali.com' },
  { id: 'pipingpotcurry', name: 'Piping Pot Curry', kind: 'wp', test: true, home: 'https://www.pipingpotcurry.com' },
  { id: 'ministryofcurry', name: 'Ministry of Curry', kind: 'wp', test: true, home: 'https://ministryofcurry.com' },
  { id: 'mygreekdish', name: 'My Greek Dish', kind: 'wp', test: true, home: 'https://www.mygreekdish.com' },
  { id: 'feelgoodfoodie', name: 'Feel Good Foodie', kind: 'wp', test: true, home: 'https://feelgoodfoodie.net' },
  { id: 'muybuenocookbook', name: 'Muy Bueno', kind: 'wp', test: true, home: 'https://muybuenoblog.com' },
  { id: 'mexicoinmykitchen', name: 'Mexico in My Kitchen', kind: 'wp', test: true, home: 'https://www.mexicoinmykitchen.com' },
  { id: 'maricruzavalos', name: 'Maricruz Avalos', kind: 'wp', test: true, home: 'https://www.maricruzavalos.com' },
  { id: 'preppykitchen', name: 'Preppy Kitchen', kind: 'wp', test: true, home: 'https://preppykitchen.com' },
  { id: 'sugarspunrun', name: 'Sugar Spun Run', kind: 'wp', test: true, home: 'https://sugarspunrun.com' },
  { id: 'handletheheat', name: 'Handle the Heat', kind: 'wp', test: true, home: 'https://handletheheat.com' },
  { id: 'plainchicken', name: 'Plain Chicken', kind: 'wp', test: true, home: 'https://www.plainchicken.com' },
  { id: 'thecozycook', name: 'The Cozy Cook', kind: 'wp', test: true, home: 'https://thecozycook.com' },
  { id: 'iheartrecipes', name: 'I Heart Recipes', kind: 'wp', test: true, home: 'https://iheartrecipes.com' },
  { id: 'divascancook', name: 'Divas Can Cook', kind: 'wp', test: true, home: 'https://divascancook.com' },
  { id: 'thaicaliente', name: 'Thai Caliente', kind: 'wp', test: true, home: 'https://www.thaicaliente.com' },
  { id: 'rachelcooksthai', name: 'Rachel Cooks Thai', kind: 'wp', test: true, home: 'https://rachelcooksthai.com' },
  { id: 'hungryinthailand', name: 'Hungry in Thailand', kind: 'wp', test: true, home: 'https://hungryinthailand.com' },
  { id: 'vietworldkitchen', name: 'Viet World Kitchen', kind: 'wp', test: true, home: 'https://www.vietworldkitchen.com' },
  { id: 'hungryhuy', name: 'Hungry Huy', kind: 'wp', test: true, home: 'https://www.hungryhuy.com' },
  { id: 'panlasangpinoy', name: 'Panlasang Pinoy', kind: 'wp', test: true, home: 'https://panlasangpinoy.com' },
  { id: 'kawalingpinoy', name: 'Kawaling Pinoy', kind: 'wp', test: true, home: 'https://www.kawalingpinoy.com' },
  { id: 'jocooks', name: 'Jo Cooks', kind: 'wp', test: true, home: 'https://www.jocooks.com' },
  { id: 'sallysbakingaddiction', name: 'Sally’s Baking Addiction', kind: 'wp', home: 'https://sallysbakingaddiction.com', topics: /bak|cake|cookie|bread|pie|brownie|muffin|dessert|cheesecake|cupcake|biscuit|roll/ }
];

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const q = clean(String(qp.q || '')).slice(0, 80);
  const n = Math.max(1, Math.min(15, parseInt(qp.n, 10) || 8));
  const want = String(qp.sites || '').split(',').map(s => s.trim()).filter(Boolean);
  const debug = !!qp.debug;
  const limit = debug && qp.wait ? Math.min(25000, parseInt(qp.wait, 10) || SITE_TIMEOUT) : SITE_TIMEOUT;
  let sources;
  if (want.length) sources = SOURCES.filter(s => want.includes(s.id));
  else if (qp.all === 'test') sources = SOURCES.filter(s => s.test);
  else if (qp.all) sources = SOURCES.filter(s => !s.test);
  else sources = SOURCES.filter(s => !s.test && (s.core || (q && s.topics && s.topics.test(q.toLowerCase()))));
  if (!q) sources = sources.filter(s => s.kind !== 'cdx');

  const report = [];
  const lists = await Promise.all(sources.map(async s => {
    const t0 = Date.now();
    const trace = debug ? [] : null;
    try {
      const items = await withTimeout(readSource(s, q, n, trace), limit);
      if (debug) report.push({ id: s.id, ms: Date.now() - t0, count: items.length, sample: items.slice(0, 2).map(x => x.url + ' | ' + x.title + ' | ' + (x.image ? 'photo' : 'no photo')), trace });
      return items;
    } catch (e) {
      if (debug) report.push({ id: s.id, ms: Date.now() - t0, count: 0, error: e.message, trace });
      return [];
    }
  }));
  // take turns between sites so no one site crowds the rest out
  const items = [], seen = new Set();
  for (let i = 0; i < n; i++) for (const l of lists) {
    const it = l[i];
    if (!it || seen.has(it.url)) continue;
    seen.add(it.url);
    items.push(it);
  }
  res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=21600, stale-while-revalidate=86400');
  const out = { ok: true, q, items };
  if (debug) out.report = report.sort((a, b) => a.id.localeCompare(b.id));
  res.status(200).json(out);
};

async function readSource(s, q, n, trace) {
  if (s.kind === 'wp') return fromWordPress(s, q, n, trace);
  if (s.kind === 'cdx') return fromArchiveList(s, q, n, trace);
  const url = q ? s.search(q) : s.latest;
  const { text } = await fetchText(url, { trace });
  return cardsFromPage(text, s).slice(0, n);
}

/* ---------- a site's own search results page ---------- */
function cardsFromPage(html, s) {
  const re = /<a\b[^>]*?\bhref\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  const hits = [];
  let m;
  while ((m = re.exec(html))) {
    let abs;
    try { abs = new URL(decode(m[1]), s.home); } catch (e) { continue; }
    if (abs.hostname.replace(/^www\./, '') !== new URL(s.home).hostname.replace(/^www\./, '')) continue;
    if (!s.link.test(abs.pathname)) continue;
    hits.push({ url: s.home + abs.pathname, tag: m[0], at: m.index });
  }
  const out = [];
  const done = new Set();
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    if (done.has(h.url)) continue;
    done.add(h.url);
    // this card's html: from its first link to the next card's link
    let j = i + 1;
    while (j < hits.length && hits[j].url === h.url) j++;
    const seg = html.slice(h.at, Math.min(j < hits.length ? hits[j].at : html.length, h.at + 6000));
    const all = hits.filter(x => x.url === h.url).map(x => x.tag).join(' ');
    const title = cardTitle(all, seg, h.url);
    if (!title) continue;
    out.push({ title, url: h.url, image: cardImage(seg), source: s.id, sourceName: s.name, by: '' });
  }
  return out;
}
function cardTitle(tags, seg, url) {
  const attr = name => { const m = tags.match(new RegExp('\\b' + name + '\\s*=\\s*"([^"]{3,160})"', 'i')); return m ? m[1] : ''; };
  let t = attr('data-vars-ga-call-to-action') || attr('aria-label') || attr('title');
  if (!t) {
    const m = seg.match(/<(h[1-6]|span|div|p)\b[^>]*class=["'][^"']*(title|headline|name)[^"']*["'][^>]*>([\s\S]{3,300}?)<\/\1>/i);
    if (m) t = m[3];
  }
  if (!t) { const m = seg.match(/<img\b[^>]*\balt=["']([^"']{3,160})["']/i); if (m) t = m[1]; }
  t = clean(decode(String(t).replace(/<[^>]+>/g, ' ')));
  if (!t || /^(read more|view recipe|get the recipe|save|image)$/i.test(t)) t = slugTitle(url);
  return t.slice(0, 140);
}
function cardImage(seg) {
  const re = /\b(?:data-src|data-lazy-src|src|data-srcset|srcset)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(seg))) {
    // srcset: pick the size nearest a phone-card width
    const opts = decode(m[1]).trim().split(/,\s+(?=https?:)/).map(x => { const p = x.trim().split(/\s+/); return { u: p[0], w: parseInt(p[1], 10) || 0 }; });
    const first = (opts.length > 1 ? opts.slice().sort((a, b) => Math.abs(a.w - 640) - Math.abs(b.w - 640))[0] : opts[0]).u;
    if (!/^https?:\/\//.test(first)) continue;
    if (/\.svg(\?|$)|\/icons?\/|sprite|logo|avatar|placeholder|blank\.gif|data:image/i.test(first)) continue;
    if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(first) || /hips\.hearstapps\.com|img\.buzzfeed\.com|\/images?\//i.test(first)) return first;
  }
  return '';
}

/* ---------- WordPress recipe blogs ---------- */
async function fromWordPress(s, q, n, trace) {
  const url = s.home + '/wp-json/wp/v2/posts?per_page=' + Math.min(20, n + 4)
    + (q ? '&search=' + enc(q) + '&orderby=relevance' : '')
    + '&_embed=wp:featuredmedia&_fields=link,title,date,jetpack_featured_media_url,yoast_head_json.og_image,_links,_embedded';
  const { text } = await fetchText(url, { trace, headers: { Accept: 'application/json' } });
  let arr;
  try { arr = JSON.parse(text); } catch (e) { throw new Error('Not a recipe list.'); }
  if (!Array.isArray(arr)) throw new Error('Not a recipe list.');
  return arr.map(p => {
    const og = p.yoast_head_json && Array.isArray(p.yoast_head_json.og_image) && p.yoast_head_json.og_image[0];
    const fm = p._embedded && Array.isArray(p._embedded['wp:featuredmedia']) && p._embedded['wp:featuredmedia'][0];
    const sizes = (fm && fm.media_details && fm.media_details.sizes) || {};
    const pick = sizes.medium_large || sizes.large || sizes['1536x1536'] || sizes.full || null;
    return {
      title: clean(decode(String((p.title && p.title.rendered) || '').replace(/<[^>]+>/g, ' '))),
      url: p.link, image: (pick && pick.source_url) || p.jetpack_featured_media_url || (og && og.url) || (fm && fm.source_url) || '',
      source: s.id, sourceName: s.name, by: ''
    };
  }).filter(x => x.title && x.url && !ROUNDUP.test(x.title)).slice(0, n);
}
// "25 Best Chicken Recipes", gift guides, meal plans: not a single recipe
const ROUNDUP = /^\d+\+?\s|\b(recipes|ideas|roundup|round-up|meal plan|gift guide|giveaway|what i ate|favorites of|best of \d{4}|menu)\b/i;

/* ---------- sites that turn servers away: match recipe names in the Internet Archive's list of their pages ---------- */
const STOP = new Set(['the', 'and', 'with', 'for', 'easy', 'best', 'recipe', 'recipes', 'how', 'make', 'homemade', 'quick', 'simple']);
async function fromArchiveList(s, q, n, trace) {
  const words = q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)
    .filter(w => w.length > 2 && !STOP.has(w))
    .map(w => w.length > 4 ? w.replace(/(es|s)$/, '') : w).slice(0, 3);
  if (!words.length) return [];
  const url = 'https://web.archive.org/cdx/search/cdx?url=' + s.prefix + '&matchType=prefix&collapse=urlkey&fl=original&limit=400'
    + '&filter=statuscode:200' + words.map(w => '&filter=original:.*' + w + '.*').join('');
  const { text } = await fetchText(url, { trace, headers: { Accept: 'text/plain' } });
  const out = [], seen = new Set();
  for (const line of text.split('\n')) {
    let u;
    try { u = new URL(line.trim().replace(/^http:/, 'https:')); } catch (e) { continue; }
    const path = u.pathname.replace(/\/+$/, '') + '/';
    const clean0 = path.replace(/\/$/, '');
    if (!s.link.test(clean0) && !s.link.test(path)) continue;
    const key = clean0.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const parts = clean0.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];
    const title = titleCase(slug.replace(/-recipe\d?(-\d+)?$/, '').replace(/-\d+$/, '').replace(/-/g, ' '));
    const by = s.id === 'foodnetwork' && parts.length === 3 ? titleCase(parts[1].replace(/-/g, ' ')) : '';
    if (!words.every(w => title.toLowerCase().includes(w))) continue;
    out.push({ title, url: s.home + (s.id === 'allrecipes' ? path : clean0), image: '', source: s.id, sourceName: s.name, by: by === 'Food Network Kitchen' ? '' : by });
  }
  // shorter names first: "Chicken Enchiladas" before "Sour Cream Chicken Enchiladas With Green Chile Sauce"
  return out.sort((a, b) => a.title.length - b.title.length).slice(0, n);
}

/* ---------- helpers ---------- */
const SMALL = new Set(['a', 'an', 'and', 'or', 'the', 'of', 'with', 'in', 'on', 'for', 'to', 'at', 'by', 'de', 'la', 'con', 'y']);
function titleCase(s) {
  return s.trim().split(/\s+/).map((w, i) => (i && SMALL.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function slugTitle(u) {
  try {
    const parts = new URL(u).pathname.split('/').filter(Boolean);
    return titleCase(parts[parts.length - 1].replace(/-recipe$/, '').replace(/-/g, ' '));
  } catch (e) { return ''; }
}
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}

module.exports.SOURCES = SOURCES;
module.exports.cardsFromPage = cardsFromPage;
module.exports.fromArchiveList = fromArchiveList;
