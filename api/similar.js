// YumYum "Steps from a similar recipe"
// GET /api/similar?q=Chicken and Dumplings&ing=chicken,broth,flour,milk
//   -> { ok, q, words, items: [{ title, url, image, source, sourceName, steps, equipment, ingredients, totalTime,
//        servings, score: { title, shared, of } }] }
// For a saved video or post whose caption has no written steps: searches the same free recipe sites Discover uses
// for the dish, reads the closest few recipe cards, and returns up to 3 that have steps, closest first.
// Options:
//   q      the dish (the saved recipe's name; emoji, hashtags and words like "easy" or "viral" are dropped)
//   ing    the saved recipe's foods (food ids from lib/pantry.js or plain words, comma separated), to break ties
//   skip   addresses to leave out, separated by |
//   debug=1  how each site answered and how each recipe scored
// A match has to share most of the dish's main words (2 of 3, both of 2), or a third of them plus most of the ingredients.

const { cors, clean } = require('../lib/parse');
const { SOURCES, readSource } = require('./discover');
const { readRecipe } = require('./recipe');
const K = require('../lib/pantry');

const SEARCH_TIMEOUT = 7000;
const PAGE_TIMEOUT = 9000;

// words that say nothing about which dish it is
const FILLER = new Set(('a an and the with w my our your his her their best easy easiest quick quickest simple simplest homemade home made recipe recipes ever ' +
  'perfect ultimate classic famous viral tiktok copycat style super really very so how to make made making i im you we this that these it its is ' +
  'of for in on at from by minute minutes min mins hour hours healthy lazy cheap budget delicious amazing yummy tasty good great favorite favourite ' +
  'new old fashioned grandma grandmas mamas moms mom nanas dads family kid friendly weeknight dinner lunch idea ideas part ep episode day today ' +
  'must try trying try omg literally like love loved obsessed version better than').split(' '));
// words about how it's cooked: they help a match but aren't required
// ("fried", "baked", "stuffed" stay main words: fried rice isn't just rice)
const STYLE = new Set('slow cooker crockpot crock instant air fryer oven creamy cheesy crispy crunchy spicy loaded'.split(' '));

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const raw = clean(String(qp.q || '')).slice(0, 160);
  const w = dishWords(raw);
  if (!w.key.length) { res.status(400).json({ ok: false, error: 'Tell me the name of the dish.' }); return; }
  const have = String(qp.ing || '').split(',').map(x => clean(x).toLowerCase()).filter(Boolean).slice(0, 40);
  const mine = new Set(have.flatMap(h => K.LABEL[h] ? [h] : K.foodsIn(h)));
  const skip = new Set(String(qp.skip || '').split('|').map(norm).filter(Boolean));
  const debug = !!qp.debug;
  const report = debug ? { searches: [], pages: [] } : null;
  const t0 = Date.now();

  // 1. search the sites: the whole name, and the main words alone when they differ
  const qs = [w.all.join(' '), w.key.join(' ')].filter((x, i, a) => x && a.indexOf(x) === i);
  const siteFor = q => SOURCES.filter(s => !s.trial && (s.core || s.wide || (s.topics && s.topics.test(q))));
  const jobs = [];
  qs.forEach(q => siteFor(q).forEach(s => jobs.push({ q, s })));
  const found = await Promise.all(jobs.map(async j => {
    const t1 = Date.now();
    try {
      const items = await withTimeout(readSource(j.s, j.q, 8, null), SEARCH_TIMEOUT);
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, count: items.length });
      return items;
    } catch (e) {
      if (report) report.searches.push({ q: j.q, site: j.s.id, ms: Date.now() - t1, error: e.message });
      return [];
    }
  }));

  // 2. the closest names first
  const noPages = new Set(SOURCES.filter(s => s.blockPages).map(s => s.id));
  const byUrl = new Map();
  found.forEach(items => items.forEach((it, pos) => {
    const k = norm(it.url);
    if (!k || skip.has(k) || noPages.has(it.source)) return;
    const x = byUrl.get(k) || Object.assign({}, it, { best: 99 });
    x.best = Math.min(x.best, pos);
    byUrl.set(k, x);
  }));
  const cands = Array.from(byUrl.values()).map(x => ({ x, t: titleScore(w, x.title) }))
    .filter(c => c.t >= 0.34).sort((a, b) => (b.t - a.t) || (a.x.best - b.x.best));
  const perSite = {}, pick = [];
  for (const c of cands) {
    if (pick.length >= 6) break;
    if ((perSite[c.x.source] || 0) >= 2) continue;
    perSite[c.x.source] = (perSite[c.x.source] || 0) + 1;
    pick.push(c);
  }

  // 3. read those recipe cards and keep the ones with steps
  const read = await Promise.all(pick.map(async c => {
    const t1 = Date.now();
    try {
      const r = await withTimeout(readRecipe(c.x.url, null), PAGE_TIMEOUT);
      const steps = (r.steps || []).filter(s => !/^##\s/.test(s));
      if (report) report.pages.push({ url: c.x.url, ms: Date.now() - t1, steps: steps.length, ingredients: (r.ingredients || []).length });
      if (r.kind !== 'recipe' || steps.length < 2) return null;
      const theirs = new Set((r.ingredients || []).flatMap(l => K.foodsIn(l)));
      const shared = Array.from(mine).filter(id => theirs.has(id)).length;
      const ingPart = mine.size >= 3 ? shared / mine.size : 0;
      const t = titleScore(w, r.title || c.x.title);
      if (t < 0.6 && !(t >= 0.34 && ingPart >= 0.6)) return null;
      return {
        title: clean(r.title || c.x.title).replace(/\s+recipe$/i, ''), url: r.finalUrl || c.x.url, image: c.x.image || r.image || '',
        source: c.x.source, sourceName: c.x.sourceName || r.siteName || '',
        steps: (r.steps || []).slice(0, 60), equipment: (r.equipment || []).slice(0, 30), ingredients: (r.ingredients || []).slice(0, 60),
        totalTime: r.totalTime || 0, servings: r.servings || 0,
        score: { title: Math.round(t * 100) / 100, shared, of: mine.size }, rank: t * 2 + ingPart - c.x.best * 0.02
      };
    } catch (e) {
      if (report) report.pages.push({ url: c.x.url, ms: Date.now() - t1, error: e.message });
      return null;
    }
  }));
  const items = read.filter(Boolean).sort((a, b) => b.rank - a.rank).slice(0, 3).map(x => { delete x.rank; return x; });

  res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=86400, stale-while-revalidate=604800');
  const out = { ok: true, q: qs[0], words: w.key, items, ms: Date.now() - t0 };
  if (report) { report.candidates = byUrl.size; report.close = cands.slice(0, 12).map(c => c.x.title + ' | ' + c.t.toFixed(2)); out.report = report; }
  res.status(200).json(out);
};

// "Ep 20: The BEST Slow Cooker Chicken & Dumplings 😍 #dinner" -> key: chicken, dumpling; style: slow, cooker
function dishWords(s) {
  const t = String(s || '').toLowerCase()
    .replace(/#[\w-]+/g, ' ').replace(/^\s*(ep(isode)?|part|day|pt)\.?\s*\d+\s*[:.\-–]\s*/, '')
    .replace(/&/g, ' and ').replace(/['’]s\b/g, '').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ');
  const words = t.split(/\s+/).filter(x => x.length > 1).map(stem);
  const key = [], style = [], all = [];
  words.forEach(x => {
    if (FILLER.has(x) || all.indexOf(x) >= 0) return;
    if (all.length < 7) all.push(x);
    if (STYLE.has(x)) style.push(x); else key.push(x);
  });
  return { key: key.slice(0, 6), style: style.slice(0, 3), all };
}
function stem(x) {
  if (x.length > 4 && /ies$/.test(x)) return x.replace(/ies$/, 'y');
  if (x.length > 4 && /(ches|shes|oes)$/.test(x)) return x.replace(/es$/, '');
  if (x.length > 3 && /s$/.test(x) && !/(ss|us|is)$/.test(x)) return x.replace(/s$/, '');
  return x;
}
// how much of the dish's name a recipe's name covers: main words count fully, cooking-style words a little,
// and a long name with lots of other words counts a little less
function titleScore(w, title) {
  const tw = new Set(String(title || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean).map(stem));
  const keyHit = w.key.filter(x => tw.has(x)).length / w.key.length;
  const styleHit = w.style.length ? w.style.filter(x => tw.has(x)).length / w.style.length : 0;
  const extra = Array.from(tw).filter(x => !FILLER.has(x) && w.key.indexOf(x) < 0 && w.style.indexOf(x) < 0).length;
  return Math.max(0, keyHit + 0.15 * styleHit - 0.03 * extra);
}
function norm(u) { return String(u || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, ''); }
function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}

module.exports.dishWords = dishWords;
module.exports.titleScore = titleScore;
