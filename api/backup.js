// yumyumtumtum cloud backup: keeps Dave's backup in his own private Vercel Blob store.
//
// The phone sends its recovery code in the x-backup-key header. The first code that sends something claims
// the store (only a hash of it is kept, in backup/_owner.json), and after that every request must use it,
// so nobody else can read or fill the store.
//
// POST /api/backup?op=save&day=2026-09-29&daily=1   body: the backup (JSON, under 4 MB)
//      -> backup/latest.json; with daily=1 (the phone's first backup that day) also backup/days/<day>.json,
//         keeping the newest 30 days
// POST /api/backup?op=photo&id=p-abc         body: the picture (sent as application/octet-stream)
//      -> backup/photos/p-abc (saved once; the phone remembers which ones it sent)
// GET  /api/backup?op=info                   -> { ok, latest:{at,size}, days:[{day,at,size}] }
// GET  /api/backup?op=get&day=latest|<day>   -> the backup JSON
// GET  /api/backup?op=photo&id=p-abc         -> the picture
//
// Setup: in Vercel, the project's Storage tab > Create > Blob > Private, connected to this project.
// Until then every call answers { ok:false, needsSetup:true }.

const crypto = require('crypto');
const { cors } = require('../lib/parse');

const ROOT = 'backup/';
const KEEP_DAYS = 30;
const MAX_BACKUP = 4 * 1024 * 1024;
const MAX_PHOTO = 4 * 1024 * 1024;
let BLOB = null; // the @vercel/blob SDK (tests swap in a fake)
const blob = () => BLOB || (BLOB = require('@vercel/blob'));
let OWNER = null; // cached hash of the code that owns the store

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-backup-key, x-photo-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  res.setHeader('Cache-Control', 'private, no-store');
  const qp = req.query || {};
  const op = String(qp.op || '');
  if (!setUp()) { res.status(200).json({ ok: false, needsSetup: true, error: 'Cloud backup isn’t turned on in Vercel yet.' }); return; }
  const key = normKey((req.headers || {})['x-backup-key']);
  if (key.length < 12) { res.status(400).json({ ok: false, error: 'Missing the recovery code.' }); return; }
  const opts = { access: 'private' };
  const oidc = (req.headers || {})['x-vercel-oidc-token'];
  if (oidc) opts.oidcToken = String(oidc);
  try {
    const hash = sha(key);
    const owner = await ownerHash(opts);
    if (!owner) {
      // only sending something (a backup or a photo) can claim an empty store
      if (req.method !== 'POST' || (op !== 'save' && op !== 'photo')) { res.status(200).json({ ok: false, empty: true, error: 'There’s no backup in the cloud yet.' }); return; }
      await blob().put(ROOT + '_owner.json', JSON.stringify({ hash, since: new Date().toISOString() }), put(opts, 'application/json'));
      OWNER = hash;
    } else if (owner !== hash) {
      res.status(403).json({ ok: false, wrongKey: true, error: 'That recovery code doesn’t match this backup.' }); return;
    }

    if (op === 'save' && req.method === 'POST') {
      const text = await bodyText(req);
      if (!text) { res.status(400).json({ ok: false, error: 'The backup was empty.' }); return; }
      if (text.length > MAX_BACKUP) { res.status(413).json({ ok: false, error: 'The backup is too big to send in one piece.' }); return; }
      let o; try { o = JSON.parse(text); } catch (e) { o = null; }
      if (!o || o.app !== 'yumyumtumtum' || !Array.isArray(o.recipes)) { res.status(400).json({ ok: false, error: 'That isn’t a yumyumtumtum backup.' }); return; }
      await blob().put(ROOT + 'latest.json', text, put(opts, 'application/json'));
      // the phone asks for a daily copy with its first backup of the day (keeps Vercel's free operations low)
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(qp.day || '')) ? String(qp.day) : new Date().toISOString().slice(0, 10);
      const daily = String(qp.daily || '') === '1';
      if (daily) {
        await blob().put(ROOT + 'days/' + day + '.json', text, put(opts, 'application/json'));
        const old = (await listAll(ROOT + 'days/', opts)).map(b => b.pathname).sort().reverse().slice(KEEP_DAYS);
        if (old.length) await blob().del(old, opts);
      }
      res.status(200).json({ ok: true, at: new Date().toISOString(), size: text.length, recipes: o.recipes.length, daily });
      return;
    }
    if (op === 'photo' && req.method === 'POST') {
      const id = cleanId(qp.id);
      if (!id) { res.status(400).json({ ok: false, error: 'Missing the photo id.' }); return; }
      const buf = await bodyBuffer(req);
      if (!buf.length) { res.status(400).json({ ok: false, error: 'The photo was empty.' }); return; }
      if (buf.length > MAX_PHOTO) { res.status(413).json({ ok: false, error: 'That photo is too big.' }); return; }
      const type = /^image\/(jpeg|png|webp|gif)$/.test(String((req.headers || {})['x-photo-type'] || '')) ? String(req.headers['x-photo-type']) : 'image/jpeg';
      await blob().put(ROOT + 'photos/' + id, buf, put(opts, type));
      res.status(200).json({ ok: true, id, size: buf.length });
      return;
    }
    if (op === 'info') {
      const days = (await listAll(ROOT + 'days/', opts)).map(b => ({ day: b.pathname.slice((ROOT + 'days/').length).replace(/\.json$/, ''), at: iso(b.uploadedAt), size: b.size }))
        .sort((a, b) => (a.day < b.day ? 1 : -1));
      const top = (await listAll(ROOT + 'latest', opts)).find(b => b.pathname === ROOT + 'latest.json');
      res.status(200).json({ ok: true, latest: top ? { at: iso(top.uploadedAt), size: top.size } : null, days });
      return;
    }
    if (op === 'get') {
      const day = String(qp.day || 'latest');
      const path = day === 'latest' ? ROOT + 'latest.json' : /^\d{4}-\d{2}-\d{2}$/.test(day) ? ROOT + 'days/' + day + '.json' : '';
      if (!path) { res.status(400).json({ ok: false, error: 'Pick a backup to get.' }); return; }
      const r = await blob().get(path, Object.assign({ useCache: false }, opts));
      if (!r || r.statusCode !== 200) { res.status(404).json({ ok: false, error: 'That backup wasn’t found.' }); return; }
      const text = await new Response(r.stream).text();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send(text);
      return;
    }
    if (op === 'photo') {
      const id = cleanId(qp.id);
      const r = id ? await blob().get(ROOT + 'photos/' + id, opts) : null;
      if (!r || r.statusCode !== 200) { res.status(404).json({ ok: false, error: 'That photo wasn’t found.' }); return; }
      const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
      res.setHeader('Content-Type', (r.blob && r.blob.contentType) || 'image/jpeg');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(buf);
      return;
    }
    res.status(400).json({ ok: false, error: 'Unknown request.' });
  } catch (e) {
    res.status(200).json({ ok: false, error: plain(e) });
  }
};

function setUp() { return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN); }
// "yum-7kq2 9ztm…" -> "7KQ29ZTM…"
function normKey(k) { return String(k || '').toUpperCase().replace(/^YUM/, '').replace(/[^0-9A-Z]/g, '').slice(0, 64); }
const sha = s => crypto.createHash('sha256').update('yyt:' + s).digest('hex');
const cleanId = id => String(id || '').replace(/[^\w-]/g, '').slice(0, 80);
const iso = d => { try { return new Date(d).toISOString(); } catch (e) { return ''; } };
const put = (opts, contentType) => Object.assign({}, opts, { contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });

async function ownerHash(opts) {
  if (OWNER) return OWNER;
  let r = null;
  try { r = await blob().get(ROOT + '_owner.json', Object.assign({ useCache: false }, opts)); }
  catch (e) { if (!/not.?found/i.test((e && (e.name + ' ' + e.message)) || '')) throw e; }
  if (!r || r.statusCode !== 200) return null;
  try { OWNER = JSON.parse(await new Response(r.stream).text()).hash || null; } catch (e) { OWNER = null; }
  return OWNER;
}
async function listAll(prefix, opts) {
  const out = []; let cursor;
  for (let i = 0; i < 10; i++) {
    const r = await blob().list(Object.assign({ prefix, limit: 1000 }, opts, cursor ? { cursor } : {}));
    out.push(...(r.blobs || []));
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return out;
}
async function bodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body), 'utf8');
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}
async function bodyText(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return JSON.stringify(req.body);
  return (await bodyBuffer(req)).toString('utf8');
}
function plain(e) {
  const m = String((e && e.message) || e || '');
  if (/suspended|limit|quota/i.test(m)) return 'Vercel’s free storage limit was reached. Backups will work again next month.';
  if (/access denied|unauthorized|forbidden|token/i.test(m)) return 'Vercel didn’t let the backup in. The storage may need to be connected to the project again.';
  return 'The backup didn’t go through. It’ll try again later.';
}

module.exports._setBlob = b => { BLOB = b; OWNER = null; };
