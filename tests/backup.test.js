// Offline tests for /api/backup with a fake Vercel Blob store.
const path = require('path');
const R = path.join(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

// a pretend private Blob store: pathname -> {body, contentType, uploadedAt}
const files = new Map(); const ops = [];
const stream = buf => new Response(buf).body;
const fake = {
  async put(p, body, o) { ops.push('put ' + p); if (o.access !== 'private') throw new Error('not private'); if (files.has(p) && o.allowOverwrite === false) throw new Error('exists'); files.set(p, { body: Buffer.isBuffer(body) ? body : Buffer.from(String(body)), contentType: o.contentType, uploadedAt: new Date() }); return { pathname: p }; },
  async get(p, o) { ops.push('get ' + p); const f = files.get(p); if (!f) return null; return { statusCode: 200, stream: stream(f.body), blob: { contentType: f.contentType, size: f.body.length } }; },
  async list(o) { ops.push('list ' + o.prefix); return { blobs: Array.from(files.keys()).filter(k => k.indexOf(o.prefix) === 0).map(k => ({ pathname: k, size: files.get(k).body.length, uploadedAt: files.get(k).uploadedAt })), hasMore: false }; },
  async del(list) { [].concat(list).forEach(k => { ops.push('del ' + k); files.delete(k); }); }
};
process.env.BLOB_STORE_ID = 'store_test';
const api = require(path.join(R, 'api/backup.js'));
api._setBlob(fake);
const call = (method, query, headers, body) => new Promise(resolve => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
    json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, send(b) { resolve({ code: this.code, raw: b, headers: this.headers }); }, end() { resolve({ code: this.code, headers: this.headers }); } };
  api({ method, query, headers: Object.assign({ origin: 'https://djvas1975.github.io' }, headers || {}), body }, res);
});
const K = { 'x-backup-key': 'YUM-7KQ2-9ZTM-4WXA-PLM3' };
const backup = n => ({ app: 'yumyumtumtum', version: 1, recipes: Array.from({ length: n }, (_, i) => ({ id: 'r' + i, title: 'Recipe ' + i })) });

(async () => {
  const pre = await call('OPTIONS', {}, {});
  ok(pre.code === 204 && /POST/.test(pre.headers['Access-Control-Allow-Methods']) && /x-backup-key/.test(pre.headers['Access-Control-Allow-Headers']), 'CORS lets the app send the code and post');
  const bad = await call('GET', { op: 'info' }, { origin: 'https://evil.example' });
  ok(bad.code === 403, 'other websites are turned away');

  delete process.env.BLOB_STORE_ID;
  const noSetup = await call('GET', { op: 'info' }, K);
  ok(noSetup.body.needsSetup === true, 'says when the storage isn\'t set up in Vercel yet');
  process.env.BLOB_STORE_ID = 'store_test';

  const empty = await call('GET', { op: 'info' }, K);
  ok(empty.body.empty === true && !files.size, 'nothing saved yet: says so and claims nothing');
  const first = await call('POST', { op: 'photo', id: 'p-first' }, K, Buffer.from([1, 2, 3]));
  ok(first.body.ok && files.has('backup/_owner.json'), 'the first thing sent can be a photo (the phone sends photos before the backup)');
  const s1 = await call('POST', { op: 'save', day: '2026-09-29', daily: '1' }, K, backup(3));
  ok(s1.body.ok && s1.body.recipes === 3 && files.has('backup/latest.json') && files.has('backup/days/2026-09-29.json') && files.has('backup/_owner.json'), 'first save: latest, today\'s copy, and the code claims the store');
  ok(!/7KQ2/.test(files.get('backup/_owner.json').body.toString()), 'the code itself is never stored, only a hash');
  const before = ops.length;
  const s2 = await call('POST', { op: 'save', day: '2026-09-29' }, { 'x-backup-key': 'yum 7kq2 9ztm 4wxa plm3' }, JSON.stringify(backup(4)));
  ok(s2.body.ok && ops.slice(before).filter(x => /^put/.test(x)).length === 1, 'later saves write just one file (code typed in lower case with spaces still works)');
  const wrong = await call('GET', { op: 'get' }, { 'x-backup-key': 'YUM-AAAA-BBBB-CCCC-DDDD' });
  ok(wrong.code === 403 && wrong.body.wrongKey, 'a different code is refused');
  const junk = await call('POST', { op: 'save' }, K, { hello: 1 });
  ok(junk.code === 400, 'refuses something that isn\'t a backup');

  const g = await call('GET', { op: 'get', day: 'latest' }, K);
  ok(JSON.parse(g.raw).recipes.length === 4, 'gets the latest backup back');
  const gd = await call('GET', { op: 'get', day: '2026-09-29' }, K);
  ok(JSON.parse(gd.raw).recipes.length === 3, 'gets a day\'s copy back');

  const pic = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
  const p1 = await call('POST', { op: 'photo', id: 'p-abc' }, Object.assign({ 'x-photo-type': 'image/jpeg' }, K), pic);
  const p2 = await call('GET', { op: 'photo', id: 'p-abc' }, K);
  ok(p1.body.ok && Buffer.compare(p2.raw, pic) === 0 && p2.headers['Content-Type'] === 'image/jpeg', 'saves a photo and sends it back the same');
  const p3 = await call('POST', { op: 'photo', id: '../../etc' }, K, pic);
  ok(p3.body.ok && files.has('backup/photos/etc'), 'photo ids can\'t climb out of the photos folder');

  for (let d = 1; d <= 33; d++) await call('POST', { op: 'save', day: '2026-10-' + String(d).padStart(2, '0').replace(/^3[2-9]/, '31'), daily: '1' }, K, backup(1));
  const days = Array.from(files.keys()).filter(k => k.indexOf('backup/days/') === 0);
  ok(days.length === 30 && !days.includes('backup/days/2026-09-29.json'), 'keeps the newest 30 daily copies -> ' + days.length);
  const info = await call('GET', { op: 'info' }, K);
  ok(info.body.ok && info.body.latest && info.body.days.length === 30 && info.body.days[0].day === '2026-10-31', 'info lists the latest and the days, newest first');
  ok(info.headers['Cache-Control'] === 'private, no-store', 'answers are never cached');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
