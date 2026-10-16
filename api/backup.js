// YumYum and Artistry cloud backup: keeps each person's backup in Dave's private Vercel Blob store.
// Add &app=artistry for Artistry (the crafts app): its own folders (backup/a/…), its own list of people, its own
// ART- codes, and it only takes Artistry backups. Without it, everything is YumYum's, as before.
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
// Sync between a person's phone and tablet (same code on both): latest.json is the shared copy.
// GET  /api/backup?op=pull&have=<etag>       -> { ok, same:true, etag } when nothing changed since that etag,
//                                               { ok, etag, backup } when it did, { ok, none:true } when there's none
// POST /api/backup?op=save&if=<etag>|none     -> saves only if the cloud copy is still that one (or there's none yet);
//                                               otherwise { ok:false, conflict:true, etag } and nothing is written,
//                                               so the device pulls, merges, and tries again. Every save answers its etag.
//
// Setup: in Vercel, the project's Storage tab > Create > Blob > Private, connected to this project.
// Until then every call answers { ok:false, needsSetup:true }.

const crypto = require('crypto');
const { cors } = require('../lib/parse');

const ROOT = 'backup/';
const MAX_PEOPLE = 10;
const APPS = {
  yumyumtumtum: { dir: 'u/', people: '_people.json', salt: 'yyt:', prefix: /^YUM/, name: 'YumYum', check: o => o.app === 'yumyumtumtum' && Array.isArray(o.recipes), counts: o => ({ recipes: o.recipes.length }) },
  artistry: { dir: 'a/', people: '_artistry.json', salt: 'art:', prefix: /^ART/, name: 'Artistry', check: o => o.app === 'brushglue' && Array.isArray(o.pins), counts: o => ({ pins: o.pins.length }) }
};
const KEEP_DAYS = 30;
const MAX_BACKUP = 4 * 1024 * 1024;
const MAX_PHOTO = 4 * 1024 * 1024;
let BLOB = null; // the @vercel/blob SDK (tests swap in a fake)
const blob = () => BLOB || (BLOB = require('@vercel/blob'));
let PEOPLE = {}; // cached lists of code hashes that have a backup folder, per app

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-backup-key, x-photo-type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  res.setHeader('Cache-Control', 'private, no-store');
  const qp = req.query || {};
  const op = String(qp.op || '');
  if (!setUp()) { res.status(200).json({ ok: false, needsSetup: true, error: 'Cloud backup isn’t turned on in Vercel yet.' }); return; }
  const A = APPS[String(qp.app || '') === 'artistry' ? 'artistry' : 'yumyumtumtum'];
  const key = normKey((req.headers || {})['x-backup-key'], A);
  if (key.length < 12) { res.status(400).json({ ok: false, error: 'Missing the recovery code.' }); return; }
  const opts = { access: 'private' };
  const oidc = (req.headers || {})['x-vercel-oidc-token'];
  if (oidc) opts.oidcToken = String(oidc);
  try {
    const hash = sha(A.salt + key);
    const home = ROOT + A.dir + hash.slice(0, 32) + '/';
    let people = await peopleList(A, opts, false);
    if (people.indexOf(hash) < 0) people = await peopleList(A, opts, true); // someone may have just started on another phone
    if (people.indexOf(hash) < 0) {
      // only sending something (a backup or a photo) can start a new person's folder
      if (req.method !== 'POST' || (op !== 'save' && op !== 'photo')) { res.status(200).json({ ok: false, empty: true, error: 'There’s no backup in the cloud for that code.' }); return; }
      if (people.length >= MAX_PEOPLE) { res.status(200).json({ ok: false, full: true, error: 'The family backup is full (' + MAX_PEOPLE + ' people). Ask Dave to make room.' }); return; }
      people = people.concat([hash]);
      await blob().put(ROOT + A.people, JSON.stringify({ people }), put(opts, 'application/json'));
      PEOPLE[A.people] = people;
    }

    if (op === 'save' && req.method === 'POST') {
      const text = await bodyText(req);
      if (!text) { res.status(400).json({ ok: false, error: 'The backup was empty.' }); return; }
      if (text.length > MAX_BACKUP) { res.status(413).json({ ok: false, error: 'The backup is too big to send in one piece.' }); return; }
      let o; try { o = JSON.parse(text); } catch (e) { o = null; }
      if (!o || !A.check(o)) { res.status(400).json({ ok: false, error: 'That isn’t a' + (A.name === 'Artistry' ? 'n ' : ' ') + A.name + ' backup.' }); return; }
      // sync: write only over the copy this device last saw, so the phone and tablet never wipe out each other's changes
      const want = qp.if == null ? null : bare(qp.if);
      const conflict = etag => { res.status(200).json({ ok: false, conflict: true, etag: etag || '', error: 'Your other device just changed something. Getting it first.' }); };
      if (want !== null) {
        const cur = await etagOf(home + 'latest.json', opts);
        if (cur !== null && cur !== (want === 'none' ? '' : want)) { conflict(cur); return; }
      }
      let saved;
      try { saved = await blob().put(home + 'latest.json', text, Object.assign(put(opts, 'application/json'), want && want !== 'none' ? { ifMatch: quoted(want) } : {})); }
      catch (e) { if (/precondition/i.test((e && (e.name + ' ' + e.message)) || '')) { conflict(await etagOf(home + 'latest.json', opts)); return; } throw e; }
      const etag = bare(saved && saved.etag) || await etagOf(home + 'latest.json', opts) || '';
      // a daily copy with the first save of the day (from any of the person's devices; keeps Vercel's free operations low)
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(qp.day || '')) ? String(qp.day) : new Date().toISOString().slice(0, 10);
      let daily = String(qp.daily || '') === '1';
      if (daily && await etagOf(home + 'days/' + day + '.json', opts)) daily = false;
      if (daily) {
        await blob().put(home + 'days/' + day + '.json', text, put(opts, 'application/json'));
        const old = (await listAll(home + 'days/', opts)).map(b => b.pathname).sort().reverse().slice(KEEP_DAYS);
        if (old.length) await blob().del(old, opts);
      }
      res.status(200).json(Object.assign({ ok: true, at: new Date().toISOString(), size: text.length, etag }, A.counts(o), { daily }));
      return;
    }
    if (op === 'pull') {
      // has the shared copy changed since this device last saw it? (a 304 from Blob downloads nothing)
      const have = bare(qp.have);
      let r = null;
      try { r = await blob().get(home + 'latest.json', Object.assign({ useCache: false }, have ? { ifNoneMatch: quoted(have) } : {}, opts)); }
      catch (e) { if (!notFound(e)) throw e; }
      if (!r) { res.status(200).json({ ok: true, none: true, etag: '' }); return; }
      const etag = bare(r.blob && r.blob.etag);
      if (r.statusCode === 304 || (have && etag === have)) {
        try { if (r.stream && r.stream.cancel) await r.stream.cancel(); } catch (e) {}
        res.status(200).json({ ok: true, same: true, etag: etag || have });
        return;
      }
      if (r.statusCode !== 200 || !r.stream) { res.status(404).json({ ok: false, error: 'That backup wasn’t found.' }); return; }
      let o = null; try { o = JSON.parse(await new Response(r.stream).text()); } catch (e) { o = null; }
      if (!o || !A.check(o)) { res.status(200).json({ ok: false, error: 'The cloud copy couldn’t be read.' }); return; }
      res.status(200).json({ ok: true, etag, backup: o });
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

const bare = e => String(e || '').replace(/^W\//, '').replace(/"/g, '');
const quoted = e => '"' + bare(e) + '"';
const notFound = e => /not.?found/i.test((e && (e.name + ' ' + e.message)) || '');
// a file's etag, or '' when there's no such file
// a file's etag (bare, no quotes), '' when there's no such file, null when Blob couldn't say
async function etagOf(path, opts) {
  try { const h = await blob().head(path, opts); return h ? bare(h.etag) || null : ''; }
  catch (e) { return notFound(e) ? '' : null; }
}
function setUp() { return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN); }
// "yum-7kq2 9ztm…" -> "7KQ29ZTM…" (Artistry: "art-…")
function normKey(k, A) { return String(k || '').toUpperCase().replace(A.prefix, '').replace(/[^0-9A-Z]/g, '').slice(0, 64); }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const cleanId = id => String(id || '').replace(/[^\w-]/g, '').slice(0, 80);
const iso = d => { try { return new Date(d).toISOString(); } catch (e) { return ''; } };
const put = (opts, contentType) => Object.assign({}, opts, { contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });

async function peopleList(A, opts, fresh) {
  if (PEOPLE[A.people] && !fresh) return PEOPLE[A.people];
  let r = null;
  try { r = await blob().get(ROOT + A.people, Object.assign({ useCache: false }, opts)); }
  catch (e) { if (!/not.?found/i.test((e && (e.name + ' ' + e.message)) || '')) throw e; }
  let list = [];
  if (r && r.statusCode === 200) { try { list = JSON.parse(await new Response(r.stream).text()).people || []; } catch (e) { list = []; } }
  PEOPLE[A.people] = Array.isArray(list) ? list.filter(x => typeof x === 'string') : [];
  return PEOPLE[A.people];
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

module.exports._setBlob = b => { BLOB = b; PEOPLE = {}; };
module.exports.MAX_PEOPLE = MAX_PEOPLE;
