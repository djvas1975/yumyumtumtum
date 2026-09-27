// yumyumtumtum "What can I cook?"
// GET /api/cook?q=chicken+broccoli|chicken+rice  ->  recipes from the free recipe sites that fit those
// searches, each with its ingredient list, so the phone can check them against what's in the kitchen.
// Options: n=24 (how many recipes to read, 6 to 30), debug=1 (how each site and page answered)
//
// Each item: { title, url, image, source, sourceName, ingredients, totalTime, servings }
// The phone does the matching and the ranking; this only gathers.

const { cors, fetchText, decode, clean, jsonLdBlocks, findRecipe, pickImage, isoMinutes, asArray, isChallenge } = require('../lib/parse');
const { SOURCES, readSource } = require('./discover');

const SEARCH_TIMEOUT = 7000;
const PAGE_TIMEOUT = 9000;
const BUDGET = 26000; // leave room under the function's time limit

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  // several searches: q=chicken broccoli|ground beef potatoes (or q repeated)
  const qs = [].concat(qp.q || []).flatMap(x => String(x).split('|')).map(x => clean(x).toLowerCase().slice(0, 60)).filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
  if (!qs.length) { res.status(400).json({ ok: false, error: 'Tell me what you have first.' }); return; }
  const n = Math.max(6, Math.min(30, parseInt(qp.n, 10) || 24));
  const debug = !!qp.debug;
  const t0 = Date.now();
  const report = debug ? { searches: [], pages: [] } : null;

  // 1. search the sites, each search at every site that fits it
  const jobs = [];
  qs.forEach((q, qi) => SOURCES.filter(s => s.core || (s.topics && s.topics.test(q))).forEach(s => jobs.push({ q, qi, s })));
  const found = await Promise.all(jobs.map(async j => {
    const t1 = Date.now();
    try {
      const items = await withTimeout(readSource(j.s, j.q, 6, null), SEARCH_TIMEOUT);
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, count: items.length });
      return { j, items };
    } catch (e) {
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, error: e.message });
      return { j, items: [] };
    }
  }));

  // 2. one list, best matches first: found by more searches, higher up, and with the searched foods in the name
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
    return { x, s: x.qs.length * 3 + inName * 1.5 - x.best * 0.4 };
  }).sort((a, b) => b.s - a.s);
  // keep a mix of sites
  const perSite = {}, cap = Math.max(3, Math.ceil(n / 5)), picked = [];
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
        ingredients: r.ingredients, totalTime: r.totalTime, servings: r.servings, q: it.qs[0]
      };
    } catch (e) {
      if (report) report.pages.push({ url: it.url, ms: Date.now() - t1, error: e.message });
      return null;
    }
  }));
  const items = read.filter(x => x && x.ingredients.length >= 3);
  res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=21600, stale-while-revalidate=86400');
  const out = { ok: true, q: qs, items, ms: Date.now() - t0 };
  if (report) out.report = report;
  res.status(200).json(out);
};

// just the parts of a recipe card the kitchen check needs
async function quickRecipe(url) {
  const { text } = await fetchText(url);
  if (isChallenge(text)) throw new Error('blocked');
  const r = findRecipe(jsonLdBlocks(text));
  if (!r) throw new Error('no recipe card');
  const y = asArray(r.recipeYield).map(v => String(v)).join(' ');
  const sv = parseInt((y.match(/\d+/) || [])[0], 10);
  return {
    title: clean(decode(r.name)),
    image: pickImage(r.image) || '',
    ingredients: asArray(r.recipeIngredient).map(s => clean(decode(String(s)))).filter(Boolean).slice(0, 80),
    totalTime: isoMinutes(r.totalTime) || (isoMinutes(r.prepTime) + isoMinutes(r.cookTime)),
    servings: sv > 0 && sv < 100 ? sv : 0
  };
}

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}
