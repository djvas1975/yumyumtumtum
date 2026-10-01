// YumYum cloud backup: keeps each person's backup in Dave's private Vercel Blob store.
//
// Dave and his family each have their own phone and their own recovery code. The phone sends its code in
// the x-backup-key header, and each code gets its own folder, backup/u/<hash of the code>/, so nobody can
// see anyone else's backup without their code. Only hashes are kept, never the codes. To keep strangers
// from filling the store, at most MAX_PEOPLE codes can start a backup (listed in backup/_people.json).
//
// POST /api/backup?op=save&day=2026-09-29&daily=1   body: the backup (JSON, under 4 MB)
//      -> <folder>/latest.json; with daily=1 (the phone's first backup that day) also <folder>/days/<day>.json,
//         keeping the newest 30 days
// POST /api/backup?op=photo&id=p-abc         body: the picture (sent as application/octet-stream)
//      -> <folder>/photos/p-abc (saved once; the phone remembers which ones it sent)
// GET  /api/backup?op=info                   -> { ok, latest:{at,size}, days:[{day,at,size}] }
// GET  /api/backup?op=get&day=latest|<day>   -> the backup JSON
// GET  /api/backup?op=photo&id=p-abc         -> the picture
//
// Setup: in Vercel, the project's Storage tab > Create > Blob > Private, connected to this project.
// Until then every call answers { ok:false, needsSetup:true }.

const crypto = require('crypto');
const { cors } = require('../lib/parse');

const ROOT = 'backup/';
const MAX_PEOPLE = 10;
const KEEP_DAYS = 30;
const MAX_BACKUP = 4 * 1024 * 1024;
const MAX_PHOTO = 4 * 1024 * 1024;
let BLOB = null; // the @vercel/blob SDK (tests swap in a fake)
const blob = () => BLOB || (BLOB = require('@vercel/blob'));
let PEOPLE = null; // cached list of code hashes that have a backup folder

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
    const home = ROOT + 'u/' + hash.slice(0, 32) + '/';
    let people = await peopleList(opts, false);
    if (people.indexOf(hash) < 0) people = await peopleList(opts, true); // someone may have just started on another phone
    if (people.indexOf(hash) < 0) {
      // only sending something (a backup or a photo) can start a new person's folder
      if (req.method !== 'POST' || (op !== 'save' && op !== 'photo')) { res.status(200).json({ ok: false, empty: true, error: 'There’s no backup in the cloud for that code.' }); return; }
      if (people.length >= MAX_PEOPLE) { res.status(200).json({ ok: false, full: true, error: 'The family backup is full (' + MAX_PEOPLE + ' people). Ask Dave to make room.' }); return; }
      people = people.concat([hash]);
      await blob().put(ROOT + '_people.json', JSON.stringify({ people }), put(opts, 'application/json'));
      PEOPLE = people;
    }

    if (op === 'save' && req.method === 'POST') {
      const text = await bodyText(req);
      if (!text) { res.status(400).json({ ok: false, error: 'The backup was empty.' }); return; }
      if (text.length > MAX_BACKUP) { res.status(413).json({ ok: false, error: 'The backup is too big to send in one piece.' }); return; }
      let o; try { o = JSON.parse(text); } catch (e) { o = null; }
      if (!o || o.app !== 'yumyumtumtum' || !Array.isArray(o.recipes)) { res.status(400).json({ ok: false, error: 'That isn’t a YumYum backup.' }); return; }
      await blob().put(home + 'latest.json', text, put(opts, 'application/json'));
      // the phone asks for a daily copy with its first backup of the day (keeps Vercel's free operations low)
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(qp.day || '')) ? String(qp.day) : new Date().toISOString().slice(0, 10);
      const daily = String(qp.daily || '') === '1';
      if (daily) {
        await blob().put(home + 'days/' + day + '.json', text, put(opts, 'application/json'));
        const old = (await listAll(home + 'days/', opts)).map(b => b.pathname).sort().reverse().slice(KEEP_DAYS);
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
      await blob().put(home + 'photos/' + id, buf, put(opts, type));
      res.status(200).json({ ok: true, id, size: buf.length });
      return;
    }
    if (op === 'info') {
      const days = (await listAll(home + 'days/', opts)).map(b => ({ day: b.pathname.slice((home + 'days/').length).replace(/\.json$/, ''), at: iso(b.uploadedAt), size: b.size }))
        .sort((a, b) => (a.day < b.day ? 1 : -1));
      const top = (await listAll(home + 'latest', opts)).find(b => b.pathname === home + 'latest.json');
      res.status(200).json({ ok: true, latest: top ? { at: iso(top.uploadedAt), size: top.size } : null, days });
      return;
    }
    if (op === 'get') {
      const day = String(qp.day || 'latest');
      const path = day === 'latest' ? home + 'latest.json' : /^\d{4}-\d{2}-\d{2}$/.test(day) ? home + 'days/' + day + '.json' : '';
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
      const r = id ? await blob().get(home + 'photos/' + id, opts) : null;
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

async function peopleList(opts, fresh) {
  if (PEOPLE && !fresh) return PEOPLE;
  let r = null;
  try { r = await blob().get(ROOT + '_people.json', Object.assign({ useCache: false }, opts)); }
  catch (e) { if (!/not.?found/i.test((e && (e.name + ' ' + e.message)) || '')) throw e; }
  let list = [];
  if (r && r.statusCode === 200) { try { list = JSON.parse(await new Response(r.stream).text()).people || []; } catch (e) { list = []; } }
  PEOPLE = Array.isArray(list) ? list.filter(x => typeof x === 'string') : [];
  return PEOPLE;
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

module.exports._setBlob = b => { BLOB = b; PEOPLE = null; };
module.exports.MAX_PEOPLE = MAX_PEOPLE;
