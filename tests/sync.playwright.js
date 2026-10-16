// Two devices (a phone and a tablet) syncing through the real api/backup.js on a pretend Blob store, in Playwright.
// Not part of the quick test list (it needs Playwright's Chromium and takes about a minute):
//     python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/ && node tests/sync.playwright.js
// It makes its own test copy of index.html (the reader features need https, so that check is switched off).
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const R = path.join(__dirname, '..');
const SP = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'yyt-sync-'));
{
  let s = fs.readFileSync(path.join(R, 'index.html'), 'utf8').split("location.protocol === 'https:'").join('true');
  const i = s.lastIndexOf('boot();');
  s = s.slice(0, i) + 'boot();\nwindow.__t = {list, putRecipe, delRecipe, putCol, delCol, Store, go, putSettings, now, cloudBackup, CLOUD, SYNC, IDB, syncSig, syncPayload, refresh};' + s.slice(i + 7);
  fs.mkdirSync(path.join(SP, 'srv'), { recursive: true }); fs.writeFileSync(path.join(SP, 'srv', 'index.html'), s);
}
const files = new Map(); const ops = []; let etagN = 0;
const fake = {
  async put(p, body, o) {
    ops.push('put ' + p);
    if (o.ifMatch && (!files.has(p) || '"' + files.get(p).etag + '"' !== o.ifMatch)) throw Object.assign(new Error('Precondition failed'), { name: 'BlobPreconditionFailedError' });
    const etag = 'e' + (++etagN);
    files.set(p, { body: Buffer.isBuffer(body) ? body : Buffer.from(String(body)), contentType: o.contentType, uploadedAt: new Date(), etag }); return { pathname: p, etag: '"' + etag + '"' };
  },
  async get(p, o) { ops.push('get ' + p); const f = files.get(p); if (!f) return null; if (o.ifNoneMatch && o.ifNoneMatch === '"' + f.etag + '"') return { statusCode: 304, stream: null, blob: { etag: '"' + f.etag + '"' } }; return { statusCode: 200, stream: new Response(f.body).body, blob: { contentType: f.contentType, etag: '"' + f.etag + '"', size: f.body.length } }; },
  async head(p) { ops.push('head ' + p); const f = files.get(p); if (!f) throw Object.assign(new Error('not found'), { name: 'BlobNotFoundError' }); return { size: f.body.length, uploadedAt: f.uploadedAt, etag: '"' + f.etag + '"' }; },
  async list(o) { ops.push('list ' + o.prefix); return { blobs: Array.from(files.keys()).filter(k => k.indexOf(o.prefix) === 0).map(k => ({ pathname: k, size: files.get(k).body.length, uploadedAt: files.get(k).uploadedAt })), hasMore: false }; },
  async del(l) { [].concat(l).forEach(k => files.delete(k)); }
};
process.env.BLOB_STORE_ID = 'store_test';
const api = require(path.join(R, 'api/backup.js')); api._setBlob(fake);
async function serve(route) {
  const rq = route.request(); const u = new URL(rq.url());
  if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
  const headers = Object.assign({}, rq.headers(), { origin: 'https://djvas1975.github.io' });
  let body = rq.postDataBuffer();
  if (body && /json/.test(headers['content-type'] || '')) { try { body = JSON.parse(body.toString()); } catch (e) {} }
  const out = await new Promise(resolve => {
    const res = { h: {}, code: 200, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.h['Content-Type'] = 'application/json'; resolve({ status: this.code, headers: this.h, body: JSON.stringify(o) }); }, send(b) { resolve({ status: this.code, headers: this.h, body: b }); }, end() { resolve({ status: this.code, headers: this.h, body: '' }); } };
    api({ method: rq.method(), query: Object.fromEntries(u.searchParams), headers, body: body || undefined }, res);
  });
  out.headers['Access-Control-Allow-Origin'] = '*';
  await route.fulfill({ status: out.status, headers: out.headers, body: out.body });
}
const srv = http.createServer((q, r) => { const f = path.join(SP, 'srv', q.url === '/' ? 'index.html' : q.url.split('?')[0]); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200); r.end(fs.readFileSync(f)); } else { r.writeHead(404); r.end(); } });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const latest = () => { const k = Array.from(files.keys()).find(k => /^backup\/u\/[0-9a-f]+\/latest\.json$/.test(k)); return k ? JSON.parse(files.get(k).body.toString()) : null; };
const puts = () => ops.filter(x => /^put .*latest\.json/.test(x)).length;
(async () => {
  await new Promise(o => srv.listen(8790, o));
  const b = await chromium.launch();
  const errs = [];
  const device = async (port, w, h) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route(/vercel\.app\/api\/backup/, serve);
    await p.route(/fonts\.g|vercel\.app\/api\/(recipe|discover|cook|image|similar)/, r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"ok":true,"items":[]}' }));
    await p.goto('http://localhost:' + port + '/'); await p.waitForTimeout(1000); return p;
  };
  const run = (p, how) => p.evaluate(h => window.__t.cloudBackup(h), how === undefined ? true : how);
  const ids = p => p.evaluate(() => window.__t.list().filter(r => !r.sample).map(r => r.id).sort().join(','));
  const groc = p => p.evaluate(() => (window.__t.Store.settings.grocery || []).map(x => x.name + (x.done ? '✓' : '')).sort().join(','));

  // ---------- the phone: its recipes, a photo, a collection, the grocery list ----------
  const P = await device(8790, 390, 844);
  await P.evaluate(async () => {
    const T = window.__t;
    const png = await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob();
    await T.IDB.put('photos', png, 'p-phone1');
    const base = { url: '', platform: 'none', source: '', meal: ['Dinner'], tags: [], collections: [], srcNotes: [], equipment: [], notes: '', photoId: null, photoData: null, photoUrl: null, rating: 0, fav: false, madeCount: 0, sample: false, createdAt: T.now() };
    T.putCol({ id: 'c-sunday', name: 'Sunday dinners', createdAt: T.now() });
    T.putRecipe(Object.assign({}, base, { id: 'enchiladas', title: 'Mom\'s Enchiladas', ingredients: ['2 cups chicken'], steps: ['Roll and bake.'], photoKey: 'p-phone1', collections: ['c-sunday'] }));
    T.putRecipe(Object.assign({}, base, { id: 'friedrice', title: 'Fried Rice', ingredients: ['3 cups rice'], steps: ['Fry.'] }));
    T.putRecipe(Object.assign({}, base, { id: 'chili', title: 'Chili', ingredients: ['1 lb beef'], steps: ['Simmer.'] }));
    T.putSettings({ name: 'Dave', grocery: [{ id: 'g-milk', name: 'Milk', food: 'milk', detail: '', recipes: [], done: false, t: T.now() }] });
    T.go({ name: 'me' });
  });
  await P.waitForTimeout(300);
  await P.evaluate(() => document.getElementById('cloudp').scrollIntoView({ block: 'center' })); await P.waitForTimeout(150);
  await P.screenshot({ path: SP + '/s1_off.png' });
  await P.click('[data-act="cloudon"]'); await P.waitForTimeout(300);
  const code = await P.evaluate(() => document.querySelector('.codebox').textContent);
  await P.screenshot({ path: SP + '/s2_code.png' });
  await P.click('[data-act="cloudstart"]'); await P.waitForTimeout(1500);
  let L = latest();
  ok(L && L.version === 2 && L.recipes.length === 3 && L.recipes.find(r => r.id === 'enchiladas').photoRef === 'p-phone1' && L.collections.length === 1 && L.settings.name === 'Dave' && L.sync && L.sync.keyT.name, 'phone turns on: its 3 recipes, photo, collection, name and grocery list are in the cloud, examples are not');
  await P.evaluate(() => document.getElementById('cloudp').scrollIntoView({ block: 'center' })); await P.waitForTimeout(150);
  await P.screenshot({ path: SP + '/s3_on.png' });

  // ---------- the tablet: brand new, with its own Carne Guisada and eggs on its list ----------
  const Tb = await device(8790, 800, 1280);
  await Tb.evaluate(() => {
    const T = window.__t;
    T.putRecipe({ id: 'carne', title: 'Carne Guisada', url: 'https://www.youtube.com/watch?v=abcdefghijk', platform: 'youtube', source: 'YouTube', meal: [], tags: [], collections: [], ingredients: ['3 lbs beef'], steps: [], srcNotes: [], equipment: [], notes: '', rating: 0, fav: false, madeCount: 0, sample: false, createdAt: T.now() });
    T.putSettings({ grocery: [{ id: 'g-eggs', name: 'Eggs', food: 'eggs', detail: '', recipes: [], done: false, t: T.now() }] });
    T.go({ name: 'me' });
  });
  await Tb.waitForTimeout(300);
  await Tb.click('[data-act="cloudjoin"]'); await Tb.waitForTimeout(300);
  await Tb.fill('#cr-code', code.toLowerCase().replace(/-/g, ' '));
  await Tb.screenshot({ path: SP + '/s4_join.png' });
  await Tb.click('[data-act="crjoin"]'); await Tb.waitForTimeout(2500);
  ok(await ids(Tb) === 'carne,chili,enchiladas,friedrice', 'tablet connects: the phone\'s recipes plus its own -> ' + await ids(Tb));
  ok(await Tb.evaluate(async () => { const r = window.__t.Store.recipes.get('enchiladas'); const b = r.photoKey && await window.__t.IDB.get('photos', r.photoKey); return !!(b && b.size) && !r.photoRef; }), 'the photo came down to the tablet');
  ok(await Tb.evaluate(() => window.__t.Store.cols.has('c-sunday') && window.__t.Store.settings.name === 'Dave'), 'the collection and the name came over (the tablet had no name)');
  ok(await groc(Tb) === 'Eggs,Milk', 'grocery lists merged on the tablet -> ' + await groc(Tb));
  ok(await Tb.evaluate(() => window.__t.list().some(r => r.sample)), 'the tablet keeps its own examples (they don\'t sync)');
  L = latest();
  ok(L.recipes.length === 4 && (L.settings.grocery || []).length === 2, 'the tablet sent its Carne Guisada and eggs up');
  await Tb.evaluate(() => document.getElementById('cloudp').scrollIntoView({ block: 'center' })); await Tb.waitForTimeout(150);
  await Tb.screenshot({ path: SP + '/s5_tablet_on.png' });

  // ---------- back on the phone: it picks up the tablet's things ----------
  await run(P);
  ok(await ids(P) === 'carne,chili,enchiladas,friedrice' && await groc(P) === 'Eggs,Milk', 'phone gets the Carne Guisada and eggs');

  // ---------- delete and edit on the phone ----------
  await P.evaluate(() => { const T = window.__t; T.delRecipe('chili'); T.putRecipe(Object.assign({}, T.Store.recipes.get('friedrice'), { rating: 5, notes: 'Add more soy' })); });
  await run(P);
  await run(Tb);
  ok(await ids(Tb) === 'carne,enchiladas,friedrice', 'the recipe deleted on the phone is gone from the tablet too');
  ok(await Tb.evaluate(() => { const r = window.__t.Store.recipes.get('friedrice'); return r.rating === 5 && r.notes === 'Add more soy'; }), 'the phone\'s edit shows on the tablet');
  await run(P); await run(Tb);
  ok(await ids(P) === 'carne,enchiladas,friedrice', 'and the deleted one doesn\'t come back on the phone');

  // ---------- both change things at the same time (no sync in between) ----------
  await P.evaluate(() => { const T = window.__t; T.putSettings({ grocery: (T.Store.settings.grocery || []).concat([{ id: 'g-tort', name: 'Tortillas', food: 'tortillas', detail: '', recipes: [], done: false, t: T.now() }]) }); T.putRecipe(Object.assign({}, T.Store.recipes.get('carne'), { notes: 'Phone note' })); });
  await Tb.evaluate(() => { const T = window.__t; T.putSettings({ grocery: (T.Store.settings.grocery || []).map(x => x.id === 'g-eggs' ? Object.assign({}, x, { done: true }) : x) }); T.putRecipe({ id: 'pozole', title: 'Pozole', url: '', platform: 'none', source: '', meal: [], tags: [], collections: [], ingredients: ['pork'], steps: ['Simmer.'], srcNotes: [], equipment: [], notes: '', rating: 0, fav: false, madeCount: 0, sample: false, createdAt: T.now() }); T.delCol('c-sunday'); });
  const before = ops.length;
  await run(P);
  await run(Tb); // its copy is out of date now: turned away, pulls, merges, sends
  const conflicts = ops.slice(before).filter(x => /^put .*latest/.test(x)).length;
  await run(P);
  ok(await ids(P) === 'carne,enchiladas,friedrice,pozole' && await ids(Tb) === 'carne,enchiladas,friedrice,pozole', 'changes made on both at once all end up on both -> ' + await ids(P));
  ok(await groc(P) === 'Eggs✓,Milk,Tortillas' && await groc(Tb) === 'Eggs✓,Milk,Tortillas', 'grocery: tortillas added on the phone and eggs checked off on the tablet, both kept -> ' + await groc(P));
  ok(await Tb.evaluate(() => window.__t.Store.recipes.get('carne').notes === 'Phone note'), 'the phone\'s note on the Carne Guisada reached the tablet');
  ok(await P.evaluate(() => !window.__t.Store.cols.has('c-sunday') && !(window.__t.Store.recipes.get('enchiladas').collections || []).includes('c-sunday')), 'the collection deleted on the tablet is gone on the phone (and off the recipe)');
  console.log('      (latest.json writes in that round: ' + conflicts + ')');

  // ---------- small things (taste learning) don't cause a send on their own ----------
  const p0 = puts();
  await P.evaluate(() => { const T = window.__t; T.putSettings({ taste: Object.assign({}, T.Store.settings.taste || {}, { w: { 'food:rice': 2 } }) }); });
  await run(P, false);
  ok(puts() === p0, 'a taste change alone waits to ride along (no send)');
  await P.evaluate(() => { const T = window.__t; T.putRecipe(Object.assign({}, T.Store.recipes.get('pozole'), { rating: 4 })); });
  await P.waitForTimeout(32000); // the automatic send: 15 s after a real change, at least 30 s after the last one
  ok(puts() === p0 + 1 && latest().recipes.find(r => r.id === 'pozole').rating === 4 && latest().settings.taste && latest().settings.taste.w['food:rice'] === 2, 'a real change goes out by itself (15 s later, at most every 30 s), with the taste riding along');

  // ---------- polling: nothing changed = nothing downloaded ----------
  const g0 = ops.length;
  await run(Tb, false);
  const got = ops.slice(g0);
  ok(!got.some(x => /^put/.test(x)) && got.filter(x => /^get .*latest/.test(x)).length === 1, 'tablet checks: one look, and the cloud copy only comes down because it changed -> ' + got.join(' | '));
  const g1 = ops.length;
  await run(Tb, false);
  ok(!ops.slice(g1).some(x => /^put/.test(x)), 'checking again with nothing new sends nothing');

  // ---------- an old-style backup (from a phone that hasn't updated) still merges ----------
  const k = Array.from(files.keys()).find(k => /latest\.json$/.test(k));
  const old = JSON.parse(files.get(k).body); delete old.sync; old.version = 1; old.recipes = old.recipes.filter(r => r.id !== 'friedrice').concat([{ id: 'oldphone', title: 'From the old app', updatedAt: new Date().toISOString(), ingredients: [], steps: [] }]);
  files.set(k, { body: Buffer.from(JSON.stringify(old)), contentType: 'application/json', uploadedAt: new Date(), etag: 'e' + (++etagN) });
  await run(Tb);
  ok(await ids(Tb) === 'carne,enchiladas,friedrice,oldphone,pozole' && latest().recipes.some(r => r.id === 'friedrice') && latest().sync, 'an old app\'s backup over the shared copy loses nothing: merged and sent back with everything');

  // ---------- the Me tab ----------
  await Tb.evaluate(() => { window.__t.go({ name: 'me' }); }); await Tb.waitForTimeout(300);
  await Tb.evaluate(() => document.getElementById('cloudp').scrollIntoView({ block: 'center' })); await Tb.waitForTimeout(150);
  await Tb.screenshot({ path: SP + '/s6_synced.png' });
  console.log('Blob ops:', ops.filter(x => /^put/.test(x)).length, 'puts,', ops.filter(x => /^(get|head)/.test(x)).length, 'gets/heads,', ops.filter(x => /^list/.test(x)).length, 'lists');
  ok(!errs.length, 'no page errors ' + (errs.length ? JSON.stringify(errs) : ''));
  console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
