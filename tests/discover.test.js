// Offline tests for Discover's sources (api/discover.js): Edamam stays off without Dave's keys, and with keys it asks
// Edamam the right way, keeps the key out of debug answers, and skips paywalled sites and roundups.
const path = require('path');
const R = path.join(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

(async () => {
  const asked = [];
  const edamam = JSON.stringify({ hits: [
    { recipe: { label: 'Classic Roast Turkey', url: 'https://www.foodnetwork.com/recipes/classic-roast-turkey', source: 'Food Network', image: 'https://edamam-product-images.s3.amazonaws.com/a.jpg', images: { LARGE: { url: 'https://edamam-product-images.s3.amazonaws.com/large.jpg' } } } },
    { recipe: { label: 'Perfect Turkey', url: 'https://cooking.nytimes.com/recipes/1-perfect-turkey', source: 'NYT Cooking', image: 'https://x/b.jpg' } },
    { recipe: { label: '25 Best Turkey Recipes', url: 'https://www.allrecipes.com/gallery/turkey/', source: 'Allrecipes', image: 'https://x/c.jpg' } },
    { recipe: { label: 'Herb Butter Turkey &amp; Gravy', url: 'https://www.allrecipes.com/recipe/1/herb-turkey/', source: 'Allrecipes', image: 'https://x/d.jpg' } }
  ] });
  global.fetch = async (url, opts) => {
    asked.push({ url, headers: (opts && opts.headers) || {} });
    if (/api\.edamam\.com/.test(url)) {
      if (/app_key=bad/.test(url)) return { status: 401, ok: false, url, headers: new Map(), text: async () => '{"status":"error"}' };
      return { status: 200, ok: true, url, headers: new Map([['content-type', 'application/json']]), text: async () => edamam };
    }
    if (/wp-json/.test(url)) return { status: 200, ok: true, url, headers: new Map([['content-type', 'application/json']]), text: async () => '[]' };
    return { status: 200, ok: true, url, headers: new Map([['content-type', 'text/html']]), text: async () => '<html></html>' };
  };
  const D = require(path.join(R, 'api/discover.js'));
  const call = q => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o }); }, end() { resolve({ code: this.code }); } };
    D({ method: 'GET', headers: {}, query: q }, res);
  });

  // no keys: never asked
  delete process.env.EDAMAM_APP_ID; delete process.env.EDAMAM_APP_KEY;
  asked.length = 0;
  const r0 = await call({ q: 'thanksgiving turkey', n: '3' });
  ok(r0.code === 200 && !asked.some(a => /edamam/.test(a.url)), 'no keys in Vercel: Edamam is never asked');
  const r0d = await call({ q: 'turkey', n: '2', debug: '1', sites: 'edamam' });
  const rep0 = (r0d.body.report || [])[0] || {};
  ok(rep0.count === 0 && /needs EDAMAM_APP_ID/.test(rep0.error || ''), 'debug says it needs the keys -> ' + rep0.error);

  // keys set: asked with the user header, results tidied
  process.env.EDAMAM_APP_ID = 'abc123'; process.env.EDAMAM_APP_KEY = 'secretkey999';
  asked.length = 0;
  const r1 = await call({ q: 'thanksgiving turkey', n: '3' });
  const e = asked.find(a => /api\.edamam\.com/.test(a.url));
  ok(e && /type=public/.test(e.url) && /q=thanksgiving%20turkey/.test(e.url) && /field=label/.test(e.url) && e.headers['Edamam-Account-User'] === 'yumyum', 'keys set: asks Edamam with the search and the user header');
  const ed = (r1.body.items || []).filter(x => x.by === 'edamam');
  ok(ed.length === 2 && ed[0].title === 'Classic Roast Turkey' && ed[0].sourceName === 'Food Network' && /large\.jpg$/.test(ed[0].image), 'Food Network turkey comes back with its large photo -> ' + JSON.stringify(ed.map(x => x.title)));
  ok(!ed.some(x => /nytimes/.test(x.url)) && !ed.some(x => /^25 /.test(x.title)) && ed.some(x => x.title === 'Herb Butter Turkey & Gravy'), 'paywalled NYT Cooking and a "25 Best" roundup are left out; HTML entities decoded');
  asked.length = 0;
  await call({ n: '3' });
  ok(!asked.some(a => /edamam/.test(a.url)), 'no search (newest recipes): Edamam isn\'t asked');
  const r2 = await call({ q: 'turkey', n: '2', debug: '1', sites: 'edamam' });
  ok(!JSON.stringify(r2.body).includes('secretkey999'), 'the key never shows in a debug answer');
  process.env.EDAMAM_APP_KEY = 'bad';
  const r3 = await call({ q: 'turkey', n: '2', debug: '1', sites: 'edamam' });
  ok((r3.body.report || [])[0] && r3.body.report[0].count === 0 && !JSON.stringify(r3.body).includes('app_key=bad'), 'a wrong key: no results, and the key isn\'t shown');

  // What can I cook and Similar recipes never use Edamam (its terms: only searches a person asks for)
  const cookSrc = require('fs').readFileSync(path.join(R, 'api/cook.js'), 'utf8'), simSrc = require('fs').readFileSync(path.join(R, 'api/similar.js'), 'utf8');
  const keyed = D.SOURCES.filter(s => s.keyed);
  ok(keyed.length === 1 && !keyed[0].core && !keyed[0].wide && !keyed[0].topics && /s\.core \|\| s\.wide/.test(cookSrc) && /s\.core \|\| s\.wide/.test(simSrc), 'Edamam is not core, wide or a topic site, so What can I cook and Similar never pick it');
  ok(D.SOURCES.filter(s => s.trial).length === 0 && D.SOURCES.filter(s => s.kind === 'wp').length >= 60, 'no trial sites left; ' + D.SOURCES.length + ' sources');

  console.log(fails ? '\n' + fails + ' FAILED' : '\nAll discover tests passed');
  process.exit(fails ? 1 : 0);
})();
