// yumyumtumtum "What can I cook?"
// GET /api/cook?q=chicken|chicken broccoli|rice side dish&have=chicken,broccoli,rice
//   ->  recipes from the free recipe sites that fit those searches, each with its ingredient list,
//       so the phone can check them against what's in the kitchen.
// Options:
//   q     up to 8 searches, split on |
//   have  what's in the kitchen (food ids or plain words, comma separated): used to pick which
//         recipes to read first and to sort the answer. The phone checks them again itself.
//   x     extra sites to ask (ids from api/discover.js), for cuisines Dave likes
//   n     how many recipes to read (12 to 48, default 40)
//   debug=1  how each site and page answered, and how each recipe matched
//
// Each item: { title, url, image, source, sourceName, ingredients, category, cuisine, totalTime, servings }

const { cors, fetchText, decode, clean, jsonLdBlocks, findRecipe, pickImage, isoMinutes, asArray, isChallenge } = require('../lib/parse');
const { SOURCES, readSource } = require('./discover');
const K = require('../lib/pantry');

const SEARCH_TIMEOUT = 7000;
const PAGE_TIMEOUT = 8000;
const BUDGET = 24000; // leave room under the function's time limit

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const list = (v, max) => [].concat(v || []).flatMap(x => String(x).split(/[|,]/)).map(x => clean(x).toLowerCase().slice(0, 60)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, max);
  const qs = [].concat(qp.q || []).flatMap(x => String(x).split('|')).map(x => clean(x).toLowerCase().slice(0, 60)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 8);
  if (!qs.length) { res.status(400).json({ ok: false, error: 'Tell me what you have first.' }); return; }
  const have = list(qp.have, 40);
  const extra = list(qp.x, 8);
  const n = Math.max(12, Math.min(48, parseInt(qp.n, 10) || 40));
  const debug = !!qp.debug;
  const t0 = Date.now();
  const report = debug ? { searches: [], pages: [] } : null;
  const kitchen = K.makePantry(have.map(h => K.LABEL[h] ? { id: h } : K.lookupFood(h)), []);

  // 1. search the sites: the main ones, the extra general ones, the cuisine sites that fit, and any asked for
  const siteFor = q => SOURCES.filter(s => !s.trial && (s.core || s.wide || extra.indexOf(s.id) >= 0 || (s.topics && s.topics.test(q))));
  const jobs = [];
  qs.forEach((q, qi) => siteFor(q).forEach(s => jobs.push({ q, qi, s })));
  const found = await Promise.all(jobs.map(async j => {
    const t1 = Date.now();
    try {
      const items = await withTimeout(readSource(j.s, j.q, 8, null), SEARCH_TIMEOUT);
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, count: items.length });
      return { j, items };
    } catch (e) {
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, error: e.message });
      return { j, items: [] };
    }
  }));

  // 2. one list, most promising first: found by more searches, higher up, and with your foods in the name
  const byUrl = new Map();
  found.forEach(({ j, items }) => items.forEach((it, pos) => {
    const k = it.url.replace(/[?#].*$/, '').replace(/\/$/, '');
    const x = byUrl.get(k) || Object.assign({}, it, { qs: [], best: 99 });
    if (x.qs.indexOf(j.q) < 0) x.qs.push(j.q);
    x.best = Math.min(x.best, pos);
    byUrl.set(k, x);
  }));
  const words = w => w.split(/\s+/).filter(x => x.length > 2).map(x => x.length > 4 ? x.replace(/(es|s)$/, '') : x);
  const scored = Array.from(byUrl.values()).map(x => {
    const t = x.title.toLowerCase();
    const inName = qs.reduce((s, q) => s + words(q).filter(w => t.indexOf(w) >= 0).length, 0);
    const mine = K.foodsIn(x.title).filter(id => K.pantryHas(kitchen, id)).length;
    return { x, s: x.qs.length * 2 + inName + mine * 2.5 - x.best * 0.3 };
  }).sort((a, b) => b.s - a.s);
  const perSite = {}, cap = Math.max(3, Math.ceil(n / 8)), picked = [];
  for (const { x } of scored) {
    if (picked.length >= n) break;
    if ((perSite[x.source] || 0) >= cap) continue;
    perSite[x.source] = (perSite[x.source] || 0) + 1;
    picked.push(x);
  }

  // 3. read each recipe's ingredient list
  const left = Math.max(5000, BUDGET - (Date.now() - t0));
  const read = await Promise.all(picked.map(async it => {
    const t1 = Date.now();
    try {
      const r = await withTimeout(quickRecipe(it.url), Math.min(PAGE_TIMEOUT, left));
      if (report) report.pages.push({ url: it.url, ms: Date.now() - t1, ingredients: r.ingredients.length });
      return {
        title: r.title || it.title, url: it.url, image: it.image || r.image, source: it.source, sourceName: it.sourceName,
        ingredients: r.ingredients, category: r.category, cuisine: r.cuisine, totalTime: r.totalTime, servings: r.servings, q: it.qs[0]
      };
    } catch (e) {
      if (report) report.pages.push({ url: it.url, ms: Date.now() - t1, error: e.message });
      return null;
    }
  }));
  let items = read.filter(x => x && x.ingredients.length >= 3);

  // 4. with the kitchen list, the ones that use more of it first
  if (have.length) {
    const m = new Map(items.map(it => [it, K.matchRecipe(it.ingredients, kitchen, it.title)]));
    items.sort((a, b) => { const x = m.get(a), y = m.get(b); return (!!y.uses.length - !!x.uses.length) || (x.missing.length - y.missing.length) || (y.have - x.have); });
    if (report) {
      report.match = items.map(it => { const x = m.get(it); return it.title + ' | have ' + x.have + ' of ' + x.need + ' | need ' + x.missing.join(', '); });
      report.usesSome = items.filter(it => m.get(it).uses.length).length;
    }
  }
  res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=21600, stale-while-revalidate=86400');
  const out = { ok: true, q: qs, items, ms: Date.now() - t0 };
  if (report) { report.candidates = byUrl.size; report.read = picked.length; out.report = report; }
  res.status(200).json(out);
};

// just the parts of a recipe card the kitchen check and the categories need
async function quickRecipe(url) {
  const { text } = await fetchText(url);
  if (isChallenge(text)) throw new Error('blocked');
  const r = findRecipe(jsonLdBlocks(text));
  if (!r) throw new Error('no recipe card');
  const y = asArray(r.recipeYield).map(v => String(v)).join(' ');
  const sv = parseInt((y.match(/\d+/) || [])[0], 10);
  const kw = asArray(r.keywords).flatMap(k => String(k).split(',')).map(k => clean(decode(k))).filter(Boolean).slice(0, 8);
  return {
    title: clean(decode(r.name)).replace(/\s+recipe by [\w .'&-]+$/i, '').replace(/\s+recipe$/i, ''),
    image: pickImage(r.image) || '',
    ingredients: asArray(r.recipeIngredient).map(s => clean(decode(String(s)))).filter(Boolean).slice(0, 80),
    category: asArray(r.recipeCategory).map(c => clean(decode(String(c)))).concat(kw).filter(Boolean).join(', ').slice(0, 200),
    cuisine: asArray(r.recipeCuisine).map(c => clean(decode(String(c)))).filter(Boolean).join(', ').slice(0, 80),
    totalTime: isoMinutes(r.totalTime) || (isoMinutes(r.prepTime) + isoMinutes(r.cookTime)),
    servings: sv > 0 && sv < 100 ? sv : 0
  };
}

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}
