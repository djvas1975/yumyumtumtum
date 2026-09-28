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
const MEX = /mexican|taco|enchilada|salsa|tamale|pozole|birria|carnitas|burrito|quesadilla|tex[- ]mex|elote|churro|mole|fajita|tostada|chilaquiles|menudo|horchata|tortilla/;
const CHI = /chinese|asian|stir[- ]?fry|fried rice|dumpling|lo mein|chow mein|wonton|noodle|szechuan|sichuan|cantonese|bao|kung pao|orange chicken|egg roll/;
const JAP = /japanese|asian|ramen|sushi|teriyaki|katsu|miso|udon|tempura|gyoza|donburi|onigiri/;
const KOR = /korean|asian|bulgogi|kimchi|bibimbap|gochujang|japchae|tteok/;
const THAI = /thai|asian|curry|pad |tom yum|tom kha|larb|satay|basil chicken/;
const VIET = /vietnamese|asian|pho|banh mi|bun |spring roll|lemongrass/;
const INDIAN = /indian|curry|masala|tikka|biryani|dal|daal|paneer|naan|korma|tandoori|samosa|chana/;
const GREEK = /greek|mediterranean|gyro|souvlaki|spanakopita|moussaka|tzatziki|hummus|falafel|middle eastern|lebanese/;
const SOUTH = /southern|soul|cajun|creole|gumbo|jambalaya|fried chicken|collard|cornbread|biscuit|grits|mac and cheese|smothered|oxtail|dumplings/;
const BAKE = /bak|cake|cookie|bread|pie|brownie|muffin|dessert|cheesecake|cupcake|biscuit|roll|pastry/;

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
  { id: 'recipetineats', name: 'RecipeTin Eats', kind: 'wp', core: true, home: 'https://www.recipetineats.com' },
  { id: 'spendwithpennies', name: 'Spend With Pennies', kind: 'wp', core: true, home: 'https://www.spendwithpennies.com' },
  { id: 'cafedelites', name: 'Cafe Delites', kind: 'wp', core: true, home: 'https://cafedelites.com' },
  { id: 'damndelicious', name: 'Damn Delicious', kind: 'wp', core: true, home: 'https://damndelicious.net' },
  { id: 'pinchofyum', name: 'Pinch of Yum', kind: 'wp', core: true, home: 'https://pinchofyum.com' },
  { id: 'onceuponachef', name: 'Once Upon a Chef', kind: 'wp', core: true, home: 'https://www.onceuponachef.com' },
  { id: 'jocooks', name: 'Jo Cooks', kind: 'wp', core: true, home: 'https://www.jocooks.com' },
  // cuisine specialists, asked when the search mentions their kind of food
  { id: 'mexicanplease', name: 'Mexican Please', kind: 'wp', home: 'https://www.mexicanplease.com', topics: MEX },
  { id: 'mexicoinmykitchen', name: 'Mexico in My Kitchen', kind: 'wp', home: 'https://www.mexicoinmykitchen.com', topics: MEX },
  { id: 'maricruzavalos', name: 'Maricruz Avalos', kind: 'wp', home: 'https://www.maricruzavalos.com', topics: MEX },
  { id: 'thewoksoflife', name: 'The Woks of Life', kind: 'wp', home: 'https://thewoksoflife.com', topics: CHI },
  { id: 'omnivorescookbook', name: 'Omnivore’s Cookbook', kind: 'wp', home: 'https://omnivorescookbook.com', topics: CHI },
  { id: 'pickledplum', name: 'Pickled Plum', kind: 'wp', home: 'https://pickledplum.com', topics: JAP },
  { id: 'chopstickchronicles', name: 'Chopstick Chronicles', kind: 'wp', home: 'https://www.chopstickchronicles.com', topics: JAP },
  { id: 'koreanbapsang', name: 'Korean Bapsang', kind: 'wp', home: 'https://www.koreanbapsang.com', topics: KOR },
  { id: 'beyondkimchee', name: 'Beyond Kimchee', kind: 'wp', home: 'https://www.beyondkimchee.com', topics: KOR },
  { id: 'rachelcooksthai', name: 'Rachel Cooks Thai', kind: 'wp', home: 'https://rachelcooksthai.com', topics: THAI },
  { id: 'thaicaliente', name: 'Thai Caliente', kind: 'wp', home: 'https://www.thaicaliente.com', topics: THAI },
  { id: 'hungryinthailand', name: 'Hungry in Thailand', kind: 'wp', home: 'https://hungryinthailand.com', topics: THAI },
  { id: 'vietworldkitchen', name: 'Viet World Kitchen', kind: 'wp', home: 'https://www.vietworldkitchen.com', topics: VIET },
  { id: 'hungryhuy', name: 'Hungry Huy', kind: 'wp', home: 'https://www.hungryhuy.com', topics: VIET },
  { id: 'panlasangpinoy', name: 'Panlasang Pinoy', kind: 'wp', home: 'https://panlasangpinoy.com', topics: /filipino|pinoy|adobo|lumpia|pancit|sinigang|asian/ },
  { id: 'cookwithmanali', name: 'Cook with Manali', kind: 'wp', home: 'https://www.cookwithmanali.com', topics: INDIAN },
  { id: 'pipingpotcurry', name: 'Piping Pot Curry', kind: 'wp', home: 'https://www.pipingpotcurry.com', topics: INDIAN },
  { id: 'ministryofcurry', name: 'Ministry of Curry', kind: 'wp', home: 'https://ministryofcurry.com', topics: INDIAN },
  { id: 'mygreekdish', name: 'My Greek Dish', kind: 'wp', home: 'https://www.mygreekdish.com', topics: GREEK },
  { id: 'dimitrasdishes', name: 'Dimitras Dishes', kind: 'wp', home: 'https://www.dimitrasdishes.com', topics: GREEK },
  { id: 'iheartrecipes', name: 'I Heart Recipes', kind: 'wp', home: 'https://iheartrecipes.com', topics: SOUTH },
  { id: 'divascancook', name: 'Divas Can Cook', kind: 'wp', home: 'https://divascancook.com', topics: SOUTH },
  { id: 'handletheheat', name: 'Handle the Heat', kind: 'wp', home: 'https://handletheheat.com', topics: BAKE },
  // being tried out: only used when asked for by name (sites=...)
  { id: 'dinneratthezoo', name: 'Dinner at the Zoo', kind: 'wp', home: 'https://www.dinneratthezoo.com', trial: true },
  { id: 'thecozycook', name: 'The Cozy Cook', kind: 'wp', home: 'https://thecozycook.com', trial: true },
  { id: 'cookingclassy', name: 'Cooking Classy', kind: 'wp', home: 'https://www.cookingclassy.com', trial: true },
  { id: 'lilluna', name: 'Lil’ Luna', kind: 'wp', home: 'https://lilluna.com', trial: true },
  { id: 'wellplated', name: 'Well Plated', kind: 'wp', home: 'https://www.wellplated.com', trial: true },
  { id: 'chefsavvy', name: 'Chef Savvy', kind: 'wp', home: 'https://chefsavvy.com', trial: true },
  { id: 'saltandlavender', name: 'Salt & Lavender', kind: 'wp', home: 'https://www.saltandlavender.com', trial: true },
  { id: 'bellyfull', name: 'Belly Full', kind: 'wp', home: 'https://bellyfull.net', trial: true },
  { id: 'plainchicken', name: 'Plain Chicken', kind: 'wp', home: 'https://www.plainchicken.com', trial: true },
  { id: 'thechunkychef', name: 'The Chunky Chef', kind: 'wp', home: 'https://www.thechunkychef.com', trial: true },
  { id: 'lecremedelacrumb', name: 'Creme de la Crumb', kind: 'wp', home: 'https://www.lecremedelacrumb.com', trial: true },
  { id: 'gimmesomeoven', name: 'Gimme Some Oven', kind: 'wp', home: 'https://www.gimmesomeoven.com', trial: true },
  { id: 'melskitchencafe', name: 'Mel’s Kitchen Cafe', kind: 'wp', home: 'https://www.melskitchencafe.com', trial: true },
  { id: 'thestayathomechef', name: 'The Stay at Home Chef', kind: 'wp', home: 'https://thestayathomechef.com', trial: true },
  { id: 'dinnerthendessert', name: 'Dinner, then Dessert', kind: 'wp', home: 'https://dinnerthendessert.com', trial: true },
  { id: 'addapinch', name: 'Add a Pinch', kind: 'wp', home: 'https://addapinch.com', trial: true },
  { id: 'sixsistersstuff', name: 'Six Sisters’ Stuff', kind: 'wp', home: 'https://www.sixsistersstuff.com', trial: true },
  { id: 'julieseatsandtreats', name: 'Julie’s Eats & Treats', kind: 'wp', home: 'https://www.julieseatsandtreats.com', trial: true },
  { id: 'bowlofdelicious', name: 'Bowl of Delicious', kind: 'wp', home: 'https://www.bowlofdelicious.com', trial: true },
  { id: 'chelseasmessyapron', name: 'Chelsea’s Messy Apron', kind: 'wp', home: 'https://www.chelseasmessyapron.com', trial: true },
  { id: 'kitchenfunwithmy3sons', name: 'Kitchen Fun With My 3 Sons', kind: 'wp', home: 'https://www.kitchenfunwithmy3sons.com', trial: true },
  { id: 'southernbite', name: 'Southern Bite', kind: 'wp', home: 'https://southernbite.com', trial: true },
  { id: 'spicysouthernkitchen', name: 'Spicy Southern Kitchen', kind: 'wp', home: 'https://spicysouthernkitchen.com', trial: true },
  { id: 'jessicagavin', name: 'Jessica Gavin', kind: 'wp', home: 'https://www.jessicagavin.com', trial: true },
  { id: 'inspiredtaste', name: 'Inspired Taste', kind: 'wp', home: 'https://www.inspiredtaste.net', trial: true },
  { id: 'keviniscooking', name: 'Kevin Is Cooking', kind: 'wp', home: 'https://keviniscooking.com', trial: true },
  { id: 'muybueno', name: 'Muy Bueno', kind: 'wp', home: 'https://muybuenoblog.com', trial: true },
  { id: 'mamamaggieskitchen', name: 'Mama Maggie’s Kitchen', kind: 'wp', home: 'https://mamamaggieskitchen.com', trial: true },
  { id: 'chilipeppermadness', name: 'Chili Pepper Madness', kind: 'wp', home: 'https://www.chilipeppermadness.com', trial: true },
  { id: 'heygrillhey', name: 'Hey Grill Hey', kind: 'wp', home: 'https://heygrillhey.com', trial: true },
  { id: 'preppykitchen', name: 'Preppy Kitchen', kind: 'wp', home: 'https://preppykitchen.com', trial: true },
  { id: 'sugarspunrun', name: 'Sugar Spun Run', kind: 'wp', home: 'https://sugarspunrun.com', trial: true },
  { id: 'bakerbynature', name: 'Baker by Nature', kind: 'wp', home: 'https://bakerbynature.com', trial: true },
  { id: 'tastesoflizzyt', name: 'Tastes of Lizzy T', kind: 'wp', home: 'https://www.tastesoflizzyt.com', trial: true },
  { id: 'thegirlwhoateeverything', name: 'The Girl Who Ate Everything', kind: 'wp', home: 'https://www.the-girl-who-ate-everything.com', trial: true },
  { id: 'persnicketyplates', name: 'Persnickety Plates', kind: 'wp', home: 'https://www.persnicketyplates.com', trial: true },
];
// Food Network, Allrecipes, Simply Recipes, Serious Eats and some blogs turn servers away, so they're left out here.
// The app offers a button to search them in the browser instead, and reading a single recipe from them still works.

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
  else if (qp.all) sources = SOURCES.filter(s => !s.trial);
  else sources = SOURCES.filter(s => s.core || (q && s.topics && s.topics.test(q.toLowerCase())));

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
    if (!title || ROUNDUP.test(title)) continue;
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
const ROUNDUP = /^(over |top |the |our )?\d+\+?\s|\b(recipes|ideas|roundup|round-up|meal plan|gift guide|giveaway|what i ate|favorites of|best of \d{4}|menu|everything you need to know|guide to|lunchbox|freezer stash|what (is|are) )\b|^what (is|are)\b|\?$/i;

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
module.exports.readSource = readSource;
