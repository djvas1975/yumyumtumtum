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
  ok(first.body.ok && files.has('backup/_people.json'), 'the first thing sent can be a photo (the phone sends photos before the backup)');
  const home = Array.from(files.keys()).find(k => /^backup\/u\/[0-9a-f]{32}\/photos\/p-first$/.test(k)).replace(/photos\/p-first$/, '');
  const s1 = await call('POST', { op: 'save', day: '2026-09-29', daily: '1' }, K, backup(3));
  ok(s1.body.ok && s1.body.recipes === 3 && files.has(home + 'latest.json') && files.has(home + 'days/2026-09-29.json'), 'first save: latest and today\'s copy, in this person\'s own folder');
  ok(!/7KQ2/.test(Array.from(files.keys()).join(' ') + files.get('backup/_people.json').body.toString()), 'the code itself is never stored, only a hash');
  const before = ops.length;
  const s2 = await call('POST', { op: 'save', day: '2026-09-29' }, { 'x-backup-key': 'yum 7kq2 9ztm 4wxa plm3' }, JSON.stringify(backup(4)));
  ok(s2.body.ok && ops.slice(before).filter(x => /^put/.test(x)).length === 1, 'later saves write just one file (code typed in lower case with spaces still works)');
  const wrong = await call('GET', { op: 'get' }, { 'x-backup-key': 'YUM-AAAA-BBBB-CCCC-DDDD' });
  ok(wrong.body.ok === false && wrong.body.empty, 'a code with no backup gets nothing back');
  // a family member: their own code, their own folder
  const MOM = { 'x-backup-key': 'YUM-MMMM-2222-3333-4444' };
  const m1 = await call('POST', { op: 'save', day: '2026-09-29', daily: '1' }, MOM, backup(7));
  const mg = await call('GET', { op: 'get', day: 'latest' }, MOM);
  const dg = await call('GET', { op: 'get', day: 'latest' }, K);
  ok(m1.body.ok && JSON.parse(mg.raw).recipes.length === 7 && JSON.parse(dg.raw).recipes.length === 4, 'family members each get their own backup; nobody sees anyone else\'s');
  const momPhoto = await call('GET', { op: 'photo', id: 'p-first' }, MOM);
  ok(momPhoto.code === 404, 'one person can\'t get another person\'s photos');
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
  ok(p3.body.ok && files.has(home + 'photos/etc'), 'photo ids can\'t climb out of the photos folder');

  for (let d = 1; d <= 33; d++) await call('POST', { op: 'save', day: '2026-10-' + String(d).padStart(2, '0').replace(/^3[2-9]/, '31'), daily: '1' }, K, backup(1));
  const days = Array.from(files.keys()).filter(k => k.indexOf(home + 'days/') === 0);
  ok(days.length === 30 && !days.includes(home + 'days/2026-09-29.json'), 'keeps the newest 30 daily copies -> ' + days.length);
  const info = await call('GET', { op: 'info' }, K);
  ok(info.body.ok && info.body.latest && info.body.days.length === 30 && info.body.days[0].day === '2026-10-31', 'info lists the latest and the days, newest first');
  ok(info.headers['Cache-Control'] === 'private, no-store', 'answers are never cached');
  ok(Array.from(files.keys()).some(k => k.indexOf('backup/u/') === 0 && /days\/2026-09-29/.test(k)), 'the other person\'s daily copy was left alone');
  // at most MAX_PEOPLE codes can start a backup
  for (let i = 3; i <= api.MAX_PEOPLE; i++) await call('POST', { op: 'save' }, { 'x-backup-key': 'YUM-PPPP-' + String(i).padStart(4, '0') + '-QQQQ-RRRR' }, backup(1));
  const extra = await call('POST', { op: 'save' }, { 'x-backup-key': 'YUM-ZZZZ-ZZZZ-ZZZZ-ZZZZ' }, backup(1));
  ok(extra.body.full === true, 'a stranger can\'t fill the store: room for ' + api.MAX_PEOPLE + ' people');
  const still = await call('POST', { op: 'save' }, K, backup(2));
  ok(still.body.ok, 'people already in keep backing up when it\'s full');

  // Artistry (&app=artistry): its own folders, its own list of people (YumYum's family list is full by now), its own codes
  const ART = { 'x-backup-key': 'ART-7KQ2-9ZTM-4WXA-PLM3', origin: 'https://yumyumtumtum.vercel.app', host: 'yumyumtumtum.vercel.app' };
  const art = n => ({ app: 'brushglue', v: 1, pins: Array.from({ length: n }, (_, i) => ({ id: 'p' + i, title: 'Idea ' + i })), practice: { sessions: [] } });
  const a0 = await call('GET', { op: 'info', app: 'artistry' }, ART);
  ok(a0.body.empty === true, 'artistry: nothing saved yet');
  const ap = await call('POST', { op: 'photo', id: 'p1_m123', app: 'artistry' }, ART, pic);
  const a1 = await call('POST', { op: 'save', day: '2026-10-01', daily: '1', app: 'artistry' }, ART, art(5));
  const aKeys = Array.from(files.keys()).filter(k => k.indexOf('backup/a/') === 0);
  ok(ap.body.ok && a1.body.ok && a1.body.pins === 5 && aKeys.some(k => /^backup\/a\/[0-9a-f]{32}\/latest\.json$/.test(k)) && aKeys.some(k => /photos\/p1_m123$/.test(k)) && files.has('backup/_artistry.json'), 'artistry: its own folder and people list, even with YumYum\'s family list full (Steph’s page is served by Vercel, same site)');
  const aY = await call('POST', { op: 'save', app: 'artistry' }, ART, backup(2));
  ok(aY.body.ok === false && /Artistry backup/.test(aY.body.error), 'artistry won’t take a YumYum backup -> ' + aY.body.error);
  const yA = await call('POST', { op: 'save' }, K, art(2));
  ok(yA.body.ok === false && /YumYum backup/.test(yA.body.error), 'YumYum won’t take an Artistry backup');
  const ag = await call('GET', { op: 'get', day: 'latest', app: 'artistry' }, { 'x-backup-key': 'art 7kq2 9ztm 4wxa plm3' });
  ok(JSON.parse(ag.raw).pins.length === 5, 'artistry: code typed in lower case with spaces gets it back');
  const cross = await call('GET', { op: 'get', day: 'latest' }, { 'x-backup-key': 'YUM-7KQ2-9ZTM-4WXA-PLM3' });
  const cross2 = await call('GET', { op: 'get', day: 'latest', app: 'artistry' }, K);
  ok(JSON.parse(cross.raw).recipes && cross2.body.empty === true, 'the same letters in a YumYum code and an Artistry code are two different backups');
  const ai = await call('GET', { op: 'info', app: 'artistry' }, ART);
  ok(ai.body.ok && ai.body.days.length === 1 && ai.body.days[0].day === '2026-10-01', 'artistry: info lists its day');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
