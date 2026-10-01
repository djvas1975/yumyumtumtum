/* Artistry app. Loaded by crafts/index.html after cats.js, music.js, holidays.js and supplies.js.
   Everything lives on the phone (IndexedDB 'brushglue': pins, photos, kv). The server only reads posts
   (api/idea.js), finds blog projects (api/crafts.js) and music lessons (api/music.js). */
(() => {
'use strict';
const VERSION = '2.0';
const READER_V = 2;
const Cats = window.Cats, Hol = window.Holidays, Sup = window.Supplies;
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = (LOCAL || /(^|\.)vercel\.app$/.test(location.hostname)) ? '' : 'https://yumyumtumtum.vercel.app';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const I = (d, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const E = e => `<i class="emo">${e}</i>`;
const IC = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  dots: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  heart: '<path d="M12 20.3l-1.2-1.1C6.2 15.1 3.5 12.6 3.5 9.4 3.5 6.9 5.4 5 7.9 5c1.6 0 3.1.8 4.1 2 1-1.2 2.5-2 4.1-2 2.5 0 4.4 1.9 4.4 4.4 0 3.2-2.7 5.7-7.3 9.8z"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="M13 7l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  brush: '<path d="M14.6 3.6l5.8 5.8-7.9 7.9a2.6 2.6 0 0 1-1.2.7l-2.4.6-.5-.5.6-2.4c.1-.5.4-.9.7-1.2z"/><path d="M8.4 16.4c-2.3-.4-4.4 1-4.9 3.9 2.2.3 4.4-.4 5.4-2"/>',
  scissors: '<circle cx="6" cy="6" r="2.8"/><circle cx="6" cy="18" r="2.8"/><path d="M20 4.5L8.2 15.8M14.3 14.2L20 19.5M8.2 8.2l3.6 3.4"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.7 3.8M6.3 6.4A13.4 13.4 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7 1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  basket: '<path d="M4 9h16l-1.6 9.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/><path d="M8.5 9l3.5-5 3.5 5"/><path d="M9.5 13v3M14.5 13v3"/>',
  box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
  camera: '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  spark: '<path d="M12 3.5l1.9 5.4 5.6 1.6-5.6 1.7L12 17.5l-1.9-5.3-5.6-1.7 5.6-1.6z"/>',
  hammer: '<path d="M14 6l4 4M12.5 7.5l-8 8 2 2 8-8"/><path d="M14 6l2-2 4 4-2 2"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  // platform glyphs (plain shapes, not the companies' logos)
  instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor"/>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46"/><path d="M14 4c.6 2.4 2.4 4 5 4.2"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14.5 8H16V5h-2.2C11.6 5 10.5 6.4 10.5 8.6V10.5H8.5v3h2V20h3v-6.5h2.2l.5-3h-2.7V9c0-.6.4-1 1-1z" fill="currentColor" stroke="none"/>',
  pinterest: '<path d="M12 21v-6"/><path d="M8.5 4h7l-1.3 5 2.8 3.2H7l2.8-3.2z"/>',
  web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z"/>'
};
const PLAT = {
  instagram: { name: 'Instagram', color: '#C13584', open: 'Open in Instagram' },
  tiktok: { name: 'TikTok', color: '#111111', open: 'Watch on TikTok' },
  youtube: { name: 'YouTube', color: '#FF0000', open: 'Watch on YouTube' },
  facebook: { name: 'Facebook', color: '#1877F2', open: 'Open in Facebook' },
  pinterest: { name: 'Pinterest', color: '#E60023', open: 'Open in Pinterest' },
  web: { name: 'Website', color: '#4b5754', open: 'Visit site' }
};
const PAL = ['#ff4d5e', '#ffb51f', '#0f9d74', '#2e62f0', '#8a3fd6'];
const TYPE_LABEL = { painting: 'Painting', craft: 'Crafts', music: 'Music' };
const TYPE_EMO = { painting: '🎨', craft: '✂️', music: '🎵' };
function platformOf(url) {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase().replace(/^(www|m|mobile|vm|vt)\./, ''); } catch (e) { return 'web'; }
  if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
  if (/(^|\.)instagram\.com$|^instagr\.am$/.test(h)) return 'instagram';
  if (h === 'youtu.be' || /(^|\.)youtube\.com$/.test(h)) return 'youtube';
  if (/(^|\.)facebook\.com$|^fb\.watch$|^fb\.com$/.test(h)) return 'facebook';
  if (h === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(h)) return 'pinterest';
  return 'web';
}
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function findUrl(text) {
  const t = String(text || '');
  const m = t.match(/https?:\/\/[^\s<>"']+/i) || t.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|it|be|me|watch|co|us|io|app|tv|ly|uk)\/[^\s<>"']*/i);
  return m ? m[0].replace(/[),.!?'"]+$/, '') : '';
}
function normUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.includes('.') ? x.href : ''; } catch (e) { return ''; }
}
async function getJSON(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 30000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    return await r.json();
  } finally { clearTimeout(t); }
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* ---------- storage on the phone (IndexedDB) ---------- */
const DB = {
  db: null, mem: { pins: new Map(), photos: new Map(), kv: new Map() },
  open() {
    return new Promise(res => {
      let r;
      // the storage keeps the old name (the app was Brush & Glue until Oct 1, 2026) so nothing saved is lost
      try { r = indexedDB.open('brushglue', 1); } catch (e) { res(false); return; }
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('pins', { keyPath: 'id' }); d.createObjectStore('photos'); d.createObjectStore('kv'); };
      r.onsuccess = () => { this.db = r.result; res(true); };
      r.onerror = () => res(false);
    });
  },
  req(store, mode, fn) {
    if (!this.db) return Promise.resolve(fn(null));
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const q = fn(t.objectStore(store));
      t.oncomplete = () => res(q && 'result' in q ? q.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  all(store) { return this.db ? this.req(store, 'readonly', s => s.getAll()) : Promise.resolve(Array.from(this.mem[store].values())); },
  get(store, key) { return this.db ? this.req(store, 'readonly', s => s.get(key)) : Promise.resolve(this.mem[store].get(key)); },
  put(store, val, key) {
    if (!this.db) { this.mem[store].set(key === undefined ? val.id : key, val); return Promise.resolve(); }
    return this.req(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key));
  },
  del(store, key) { if (!this.db) { this.mem[store].delete(key); return Promise.resolve(); } return this.req(store, 'readwrite', s => s.delete(key)); }
};
const kvGet = k => DB.get('kv', k);
const kvSet = (k, v) => DB.put('kv', v, k).catch(() => {});

/* ---------- state ---------- */
const S = {
  pins: [],
  taste: { avoidTags: {}, avoidCats: {}, views: {} },
  dismissed: new Set(),
  route: { v: 'home' },
  homeFilter: 'all',
  boardSort: 'new',
  studioTab: 'boards',
  ideas: { items: [], topic: 'foryou', loading: false, error: '', at: 0, sig: '', page: 1 },
  more: new Map(),      // "more like this" answers by search
  web: new Map(),       // idea cards on screen: key -> item
  hol: new Map(),       // ideas for a holiday page: id -> { items, loading, error }
  search: { q: '', results: [], loading: false, error: '' },
  stash: { have: [], custom: [], basics: true },   // My supplies
  shop: [],                                         // shopping list: { k, sid, name, g, pins: [ids], done, t }
  profile: { name: '' },
  memo: { snooze: {} },
  installEvt: null,
  owner: false,
  ready: false
};
function savePin(p) { p.updatedAt = Date.now(); return DB.put('pins', p).catch(() => toast('Couldn’t save on this phone. Is its storage full?')); }
function saveTaste() { kvSet('taste', S.taste); }
const saveStash = () => kvSet('stash', S.stash);
const saveShop = () => kvSet('shop', S.shop);
const saveProfile = () => kvSet('profile', S.profile);

/* ---------- photos: kept on the phone so they never expire ---------- */
const photoURLs = new Map();
async function photoURL(id) {
  if (photoURLs.has(id)) return photoURLs.get(id);
  const blob = await DB.get('photos', id).catch(() => null);
  if (!blob) return '';
  const u = URL.createObjectURL(blob);
  photoURLs.set(id, u);
  return u;
}
async function shrink(blob) {
  let src, w, h;
  try { src = await createImageBitmap(blob); w = src.width; h = src.height; }
  catch (e) {
    src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
    w = src.naturalWidth; h = src.naturalHeight;
  }
  if (!w || !h) throw new Error('empty image');
  const sc = Math.min(1, 736 / w);
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
  cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
  const out = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
  return { blob: out || blob, w: cv.width, h: cv.height };
}
async function fetchPhoto(url) {
  if (!url) return null;
  for (const u of [API + '/api/image?url=' + enc(url), url]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const b = await r.blob();
      if (!/^image\//.test(b.type)) continue;
      return await shrink(b);
    } catch (e) { /* try the next way */ }
  }
  return null;
}
function hydrate(root) {
  for (const img of $$('img[data-photo]', root || document)) {
    const id = img.dataset.photo;
    img.removeAttribute('data-photo');
    photoURL(id).then(u => { if (u) img.src = u; else if (img.dataset.orig) { img.src = img.dataset.orig; img.dataset.proxy = '1'; } });
  }
}
// a web photo that won't load directly: try it through the photo helper once, then show the title instead
document.addEventListener('error', e => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement) || !im.dataset.proxy) return;
  if (im.dataset.proxy === '1' && im.dataset.orig) { im.dataset.proxy = '2'; im.src = API + '/api/image?url=' + enc(im.dataset.orig); return; }
  const box = im.closest('.media,.hero,.thumb,.collage > div,.ring .in');
  im.remove();
  if (!box) return;
  if (box.classList.contains('media')) { box.classList.add('ph', box.dataset.type || 'painting'); const s = document.createElement('span'); s.textContent = box.dataset.title || ''; box.prepend(s); }
  else if (box.classList.contains('tile')) box.classList.add('noimg');
  else if (box.classList.contains('hero')) { box.classList.add('ph', box.dataset.type || 'painting'); box.style.minHeight = '220px'; }
}, true);

/* ---------- supplies and holidays for each project ---------- */
const isArt = p => p && p.type !== 'music';
function needsOf(p) {
  if (!isArt(p)) return [];
  if (!Array.isArray(p.needs)) p.needs = Sup.gather({ title: p.title, caption: p.caption, supplies: p.supplies, type: p.type, category: p.category });
  return p.needs;
}
const stashSize = () => S.stash.have.length + S.stash.custom.length;
function supFor(p) {
  const n = needsOf(p);
  return n.length ? Sup.check(n, S.stash) : null;
}
function holsOf(p) {
  if (!isArt(p)) return [];
  if (!Array.isArray(p.holidays)) p.holidays = Hol.detect([p.title, p.caption, (p.tags || []).map(t => '#' + t.replace(/\s+/g, '')).join(' ')].join('\n'));
  return p.holidays;
}
const dated = id => Hol.HOLIDAYS.some(h => h.id === id);
function readyPins() {
  if (!stashSize()) return [];
  return S.pins.filter(p => isArt(p) && p.status !== 'made' && (supFor(p) || {}).ready);
}
function pinsForHoliday(id) { return S.pins.filter(p => holsOf(p).includes(id)); }
function shortHol(name) { return name.replace(/’s Day$/, '’s').replace(/^St\. Patrick’s$/, 'St. Patrick’s').replace(/^Día de los Muertos$/, 'Día de Muertos').replace(/^Fourth of July$/, 'July 4th'); }
function ago(t) {
  const d = Math.floor((Date.now() - t) / 864e5);
  if (d < 1) return 'today'; if (d === 1) return 'yesterday'; if (d < 14) return d + ' days ago';
  if (d < 60) return Math.round(d / 7) + ' weeks ago'; if (d < 365) return Math.round(d / 30.4) + ' months ago';
  return 'a year ago';
}
function handle(p) { const a = String(p.author || '').trim(); return a ? (/^@/.test(a) || /\s/.test(a) ? a : '@' + a) : ''; }
function creatorKey(p) { return String(p.author || '').trim().replace(/^@/, '').toLowerCase(); }

/* ---------- what it learns ---------- */
const GENERIC_TAGS = new Set(['easy', 'kids', 'gift', 'diy', 'craft', 'crafts', 'painting', 'art']);
const weightOf = p => p.example ? 0 : 1 + (p.liked ? 3 : 0) + (p.status === 'made' ? 2 : p.status === 'making' ? 1.5 : 0) + Math.min(p.opens || 0, 4) * 0.5;
function learn() {
  const cat = {}, catN = {}, tag = {}, type = { painting: 0, craft: 0 }, hol = {}, who = {};
  let n = 0, liked = 0, made = 0;
  for (const p of S.pins) {
    if (p.example || !isArt(p)) continue;
    n++; if (p.liked) liked++; if (p.status === 'made') made++;
    const w = weightOf(p), ck = p.type + ':' + p.category;
    type[p.type] += w;
    cat[ck] = (cat[ck] || 0) + w; catN[ck] = (catN[ck] || 0) + 1;
    for (const t of p.tags || []) tag[t] = (tag[t] || 0) + w;
    for (const h of holsOf(p)) hol[h] = (hol[h] || 0) + w;
    const c = creatorKey(p);
    if (c) who[c] = (who[c] || 0) + w;
  }
  for (const [k, v] of Object.entries(S.taste.views || {})) cat[k] = (cat[k] || 0) + Math.min(v, 6) * 0.3;
  for (const [t, c] of Object.entries(S.taste.avoidTags || {})) tag[t] = (tag[t] || 0) - 2 * c;
  for (const [k, c] of Object.entries(S.taste.avoidCats || {})) cat[k] = (cat[k] || 0) - 2 * c;
  return { cat, catN, tag, type, hol, who, n, liked, made };
}
function scoreItem(it, L) {
  let s = (L.cat[it.type + ':' + it.category] || 0);
  for (const t of it.tags || []) s += 0.6 * (L.tag[t] || 0);
  const tot = L.type.painting + L.type.craft;
  if (tot) s += 1.5 * (L.type[it.type] || 0) / tot;
  // holidays she saves for, and holidays coming up soon
  for (const h of it.holidays || []) {
    s += 0.5 * (L.hol[h] || 0);
    const d = Hol.daysUntil(h);
    if (d != null && d <= 45) s += 1.2;
  }
  return s;
}
const topCats = (L, k) => Object.entries(L.cat).filter(([key, w]) => w > 0 && !key.endsWith(':other')).sort((a, b) => b[1] - a[1]).slice(0, k).map(([key]) => { const [type, id] = key.split(':'); return { type, id, key }; });
const topTags = (L, k) => Object.entries(L.tag).filter(([t, w]) => w > 0 && !GENERIC_TAGS.has(t)).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t);
const topHols = (L, k) => Object.entries(L.hol).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, k).map(([h]) => h);
function topCreators(k) {
  const by = new Map();
  for (const p of S.pins) {
    const c = creatorKey(p);
    if (!c) continue;
    const x = by.get(c) || { key: c, name: handle(p), n: 0, w: 0, platform: p.platform, last: 0, pin: null };
    x.n++; x.w += weightOf(p); if (p.createdAt > x.last) { x.last = p.createdAt; x.pin = p; }
    by.set(c, x);
  }
  return Array.from(by.values()).filter(x => x.n >= 2).sort((a, b) => b.w - a.w).slice(0, k);
}


/* ---------- ideas from craft and painting blogs, ranked on the phone ---------- */
const CAT_Q = {
  painting: { acrylic: 'acrylic painting', watercolor: 'watercolor', pour: 'acrylic pour', rock: 'painted rocks', dot: 'dot mandala', objects: 'painted pumpkins', oil: 'oil painting', gouache: 'gouache', spray: 'spray paint', furniture: 'painted furniture', wall: 'mural', drawing: 'drawing', kids: 'painting for kids', other: 'painting' },
  craft: { wood: 'wood craft', paper: 'paper craft', resin: 'resin', cricut: 'cricut', sewing: 'sewing', yarn: 'crochet', jewelry: 'bracelet', clay: 'clay', candles: 'candle', florals: 'wreath', glass: 'stained glass', holiday: '', decor: 'home decor', kids: 'kids craft', upcycle: 'upcycle', diamond: 'diamond painting', other: 'craft' }
};
const CAT_EMO = {
  painting: { acrylic: '🎨', watercolor: '💧', pour: '🌌', rock: '🪨', dot: '🔵', objects: '🎃', oil: '🖼️', gouache: '🖌️', spray: '🥫', furniture: '🪑', wall: '🧱', drawing: '✏️', kids: '🖍️', other: '🎨' },
  craft: { wood: '🪵', paper: '📄', resin: '💎', cricut: '✂️', sewing: '🧵', yarn: '🧶', jewelry: '📿', clay: '🏺', candles: '🕯️', florals: '💐', glass: '🪟', holiday: '🎁', decor: '🏡', kids: '🧸', upcycle: '♻️', diamond: '💠', other: '✂️' }
};
const catEmo = (type, id) => ((CAT_EMO[type === 'craft' ? 'craft' : 'painting'] || {})[id]) || TYPE_EMO[type] || '✨';
// what to search the blogs for, by holiday
const HOL_Q = { newyear: 'new years', valentines: 'valentines', stpatricks: 'st patricks', easter: 'easter', cincodemayo: 'cinco de mayo', mothersday: 'mothers day', fathersday: 'fathers day', july4: '4th of july', backtoschool: 'back to school', halloween: 'halloween', diadelosmuertos: 'day of the dead', thanksgiving: 'thanksgiving', hanukkah: 'hanukkah', christmas: 'christmas', kwanzaa: 'kwanzaa', birthday: 'birthday party', wedding: 'wedding', graduation: 'graduation', spring: 'spring', summer: 'summer', fall: 'fall', winter: 'winter' };
function nextHolidayFor(L) {
  // the soonest holiday in the next 60 days, leaning toward ones she saves for
  const up = Hol.upcoming(new Date(), 60);
  if (!up.length) return null;
  up.sort((a, b) => (a.days - 30 * Math.min(2, (L.hol[a.id] || 0) / 3)) - (b.days - 30 * Math.min(2, (L.hol[b.id] || 0) / 3)));
  return up[0];
}
function catQuery(type, id) {
  if (type === 'craft' && id === 'holiday') { const h = nextHolidayFor(learn()); return (h ? HOL_Q[h.id] : Hol.seasonOf()) + ' craft'; }
  if (type === 'painting' && id === 'objects' && ![8, 9, 10].includes(new Date().getMonth())) return 'glass painting';
  return CAT_Q[type === 'craft' ? 'craft' : 'painting'][id] || '';
}
function ideaQueries(topic) {
  if (topic && topic !== 'foryou') {
    if (topic.startsWith('cat:')) { const [, type, id] = topic.split(':'); return [{ q: catQuery(type, id), type, reason: '' }]; }
    if (topic.startsWith('tag:')) return [{ q: topic.slice(4), type: 'both', reason: '' }];
    if (topic.startsWith('hol:')) { const id = topic.slice(4); return [{ q: HOL_Q[id] + ' craft', type: 'craft', reason: '' }, { q: HOL_Q[id] + ' painting', type: 'painting', reason: '' }]; }
    return [{ q: topic, type: 'both', reason: '' }];
  }
  const L = learn();
  const qs = [];
  const lead = L.type.craft > L.type.painting ? 'craft' : 'painting';
  const h = nextHolidayFor(L);
  if (h) qs.push({ q: HOL_Q[h.id] + ' ' + lead, type: lead, reason: h.name + ' is ' + (h.days < 14 ? 'in ' + plural(h.days, 'day') : 'coming up') });
  for (const c of topCats(L, 3)) {
    const q = catQuery(c.type, c.id);
    if (q) qs.push({ q, type: c.type, reason: 'Because you like ' + Cats.catLabel(c.type, c.id) });
  }
  const tags = topTags(L, 2);
  if (tags[0]) qs.push({ q: tags[0] + ' ' + lead, type: lead, reason: 'Because you save #' + tags[0] + ' ideas' });
  const season = Hol.seasonOf();
  qs.push({ q: season + ' ' + (lead === 'craft' ? 'painting' : 'craft'), type: lead === 'craft' ? 'painting' : 'craft', reason: 'For ' + season });
  if (qs.length < 5) for (const d of [{ q: 'acrylic painting', type: 'painting' }, { q: 'painted rocks', type: 'painting' }, { q: 'wood craft', type: 'craft' }, { q: 'watercolor', type: 'painting' }, { q: 'dollar tree craft', type: 'craft' }]) {
    if (qs.length >= 5) break;
    if (!qs.some(x => x.q === d.q)) qs.push(Object.assign({ reason: 'To get you started' }, d));
  }
  const seen = new Set();
  return qs.filter(x => x.q && !seen.has(x.q) && seen.add(x.q)).slice(0, 6);
}
function titleCase(s) { return String(s).replace(/\b\w/g, c => c.toUpperCase()); }
// the same project can show up under two addresses; its title gives it away
const tkey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isSaved = it => S.pins.some(p => p.url === it.url || (p.source === 'ideas' && tkey(p.title) === tkey(it.title)));
function tasteSig() { return JSON.stringify(ideaQueries('foryou').map(q => q.q)); }
function webItem(x, reason) {
  const sorted = Cats.sortPost({ title: x.title, url: x.url });
  const type = sorted.type || (x.kind === 'painting' ? 'painting' : 'craft');
  return {
    key: x.url, url: x.url, title: x.title, image: x.image, width: x.width || 0, height: x.height || 0,
    sourceName: x.sourceName || hostOf(x.url), type, category: sorted.type === type ? sorted.category : (sorted[type] || 'other'),
    tags: sorted.tags, holidays: Hol.detect(x.title), reason: reason || '', web: true
  };
}
async function askCrafts(q, type, n, page) {
  const j = await getJSON(API + '/api/crafts?q=' + enc(q) + '&type=' + (type || 'both') + '&n=' + (n || 4) + (page > 1 ? '&page=' + page : ''), 30000);
  if (!j || !j.ok) throw new Error((j && j.error) || 'No answer');
  return j.items || [];
}
async function loadIdeas(force, append) {
  const topic = S.ideas.topic;
  const sig = topic + '|' + tasteSig();
  if (S.ideas.loading) return;
  const fresh = Date.now() - S.ideas.at < 6 * 3600e3;
  if (!force && !append) {
    if (S.ideas.sig === sig && fresh && (S.ideas.items.length || S.ideas.error)) return;
    if (topic === 'foryou') {
      const c = await kvGet('ideas').catch(() => null);
      if (c && c.sig === sig && Date.now() - c.at < 6 * 3600e3 && c.items && c.items.length) { Object.assign(S.ideas, { items: c.items, at: c.at, sig, error: '', page: c.page || 1 }); refreshIdeasViews(); return; }
    }
  }
  S.ideas.sig = sig; S.ideas.at = Date.now();
  if (!navigator.onLine) { S.ideas.error = 'You’re offline. New ideas need the internet.'; refreshIdeasViews(); return; }
  const page = append ? (S.ideas.page || 1) + 1 : 1;
  S.ideas.loading = true; S.ideas.error = '';
  refreshIdeasViews();
  const qs = ideaQueries(topic);
  const lists = await Promise.all(qs.map(q => askCrafts(q.q, q.type, topic === 'foryou' ? 3 : 6, page).then(items => items.map(x => webItem(x, q.reason))).catch(() => [])));
  const L = learn();
  const have = new Set(S.pins.map(p => p.url).concat(S.pins.map(p => p.link || '')).concat(S.pins.map(p => tkey(p.title))));
  lists.forEach(l => l.sort((a, b) => scoreItem(b, L) - scoreItem(a, L)));
  const out = append ? S.ideas.items.slice() : [], seen = new Set(out.map(x => x.url).concat(out.map(x => tkey(x.title))));
  const before = out.length;
  for (let i = 0; i < 40; i++) for (const l of lists) {
    const it = l[i];
    if (!it || seen.has(it.url) || seen.has(tkey(it.title)) || have.has(it.url) || have.has(tkey(it.title)) || S.dismissed.has(it.url)) continue;
    if ((S.taste.avoidCats[it.type + ':' + it.category] || 0) >= 2) continue;
    seen.add(it.url); seen.add(tkey(it.title)); out.push(it);
  }
  S.ideas.loading = false;
  if (out.length === before) {
    if (append) toast('That’s all the new ideas for now. Try a different topic.');
    else S.ideas.error = 'Couldn’t get new ideas right now. Try again in a minute.';
  } else {
    Object.assign(S.ideas, { items: out.slice(0, 160), page });
    if (topic === 'foryou') kvSet('ideas', { items: S.ideas.items, at: S.ideas.at, sig, page });
  }
  refreshIdeasViews();
}
function refreshIdeasViews() {
  if (['explore', 'home'].includes(S.route.v) && !S.search.q.trim()) renderRoute(true);
}
async function loadHolidayIdeas(id) {
  const cur = S.hol.get(id);
  if (cur && (cur.loading || cur.items.length)) return;
  S.hol.set(id, { items: [], loading: true, error: '' });
  const L = learn();
  try {
    const qs = ideaQueries('hol:' + id);
    const lists = await Promise.all(qs.map(q => askCrafts(q.q, q.type, 4).then(items => items.map(x => webItem(x, ''))).catch(() => [])));
    const have = new Set(S.pins.map(p => p.url).concat(S.pins.map(p => tkey(p.title))));
    const out = [], seen = new Set();
    for (let i = 0; i < 30; i++) for (const l of lists) { const it = l[i]; if (!it || seen.has(tkey(it.title)) || have.has(it.url) || have.has(tkey(it.title)) || S.dismissed.has(it.url)) continue; seen.add(tkey(it.title)); out.push(it); }
    out.sort((a, b) => scoreItem(b, L) - scoreItem(a, L));
    S.hol.set(id, { items: out, loading: false, error: out.length ? '' : 'No blog ideas for this one right now.' });
  } catch (e) { S.hol.set(id, { items: [], loading: false, error: 'Couldn’t get ideas right now.' }); }
  if (S.route.v === 'holiday' && S.route.k === id) { const b = $('#holideas'); if (b) { b.innerHTML = holIdeasBlock(id); hydrate(b); } }
}

/* ---------- the painted rings ---------- */
function seedOf(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
function paintRing(seed) {
  let s = seedOf(seed) || 1;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  const order = PAL.slice().sort(() => rnd() - .5);
  const pt = (r, a) => (37 + r * Math.cos(a * Math.PI / 180)).toFixed(2) + ' ' + (37 + r * Math.sin(a * Math.PI / 180)).toFixed(2);
  const start = rnd() * 360;
  let paths = '';
  for (let i = 0; i < 5; i++) {
    const a0 = start + i * 72 - 4 - rnd() * 6, a1 = start + (i + 1) * 72 + 4 + rnd() * 8;
    const r = 34.2 + (rnd() - .5) * 1.8;
    paths += `<path d="M${pt(r, a0)} A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${pt(r, a1)}" stroke="${order[i]}" stroke-width="${(3.3 + rnd() * 2.4).toFixed(1)}" fill="none" stroke-linecap="round" opacity="${(.86 + rnd() * .14).toFixed(2)}"/>`;
  }
  return `<svg class="paint" viewBox="0 0 74 74" aria-hidden="true">${paths}</svg>`;
}
function imgTag(p, cls) {
  if (!p) return '';
  if (p.photo) return `<img data-photo="${esc(p.id)}" data-orig="${esc(p.imageUrl || '')}" alt=""${cls ? ` class="${cls}"` : ''}>`;
  if (p.imageUrl) return `<img src="${esc(p.imageUrl)}" data-orig="${esc(p.imageUrl)}" data-proxy="1" loading="lazy" referrerpolicy="no-referrer" alt=""${cls ? ` class="${cls}"` : ''}>`;
  return '';
}
function letterColor(name) { return PAL[seedOf(name) % PAL.length]; }

/* ---------- masonry ---------- */
function colCount() {
  const w = Math.min(window.innerWidth, 1180) - 24;
  return w < 520 ? 2 : w < 800 ? 3 : w < 1060 ? 4 : 5;
}
function arOf(w, h) { return w && h ? Math.max(0.6, Math.min(1.9, h / w)) : 1.3; }
function masonry(items, card) {
  const n = colCount(), cols = Array.from({ length: n }, () => []), heights = new Array(n).fill(0);
  for (const it of items) {
    const ar = it.web ? arOf(it.width, it.height) : (it.img ? arOf(it.img.w, it.img.h) : (it.imageUrl ? (it.type === 'music' ? 0.75 : 1.3) : 1.05));
    const k = heights.indexOf(Math.min(...heights));
    cols[k].push(card(it, ar));
    heights[k] += ar + 0.34;
  }
  return `<div class="masonry">${cols.map(c => `<div class="mcol">${c.join('')}</div>`).join('')}</div>`;
}
const typeKey = p => p.type === 'craft' ? 'craft' : p.type === 'music' ? 'music' : 'painting';
function pinCard(p, ar) {
  const t = typeKey(p);
  const media = imgTag(p);
  const pl = PLAT[p.platform] || PLAT.web;
  const sc = stashSize() >= 3 && isArt(p) && p.status !== 'made' ? supFor(p) : null;
  const h = holsOf(p).find(dated);
  const sub = [];
  if (sc) sub.push(sc.ready ? `<span class="need ok">${I(IC.check)}Ready</span>` : `<span class="need">Need ${sc.missing.length}</span>`);
  if (h) sub.push(`<span class="holi" title="${esc(Hol.label(h))}">${E(Hol.emoji(h))}</span>`);
  if (!sub.length && handle(p)) sub.push(`<span>${esc(handle(p))}</span>`);
  const st = p.type === 'music' ? (p.mstatus === 'learned' ? 'made' : p.mstatus === 'learning' ? 'making' : '') : (p.status === 'made' || p.status === 'making' ? p.status : '');
  const stLabel = p.type === 'music' ? (st === 'made' ? 'Learned' : 'Learning') : (st === 'made' ? 'Made it' : 'Making');
  return `<div class="pin" data-act="open-pin" data-id="${esc(p.id)}">
    <div class="media${media ? '' : ' ph ' + t}" data-type="${t}" data-title="${esc(p.title)}" style="aspect-ratio:1/${media ? ar : 1.05}">${media || esc(p.title)}
      <span class="plat" style="color:${pl.color}">${I(IC[p.platform] || IC.web)}</span>
      ${p.kind === 'video' ? `<span class="play">${I(IC.play, 'fill')}</span>` : ''}
      ${st ? `<span class="stamp ${st}">${st === 'made' ? I(IC.check) : ''}${stLabel}</span>` : ''}
      ${p.liked ? `<span class="heart">${I(IC.heart, 'fill')}</span>` : ''}
    </div>
    <div class="pin-foot"><div class="pin-text"><div class="pin-title">${esc(p.title)}</div>${sub.length ? `<div class="pin-sub">${sub.join('')}</div>` : ''}</div>
      <button class="dots" data-act="pin-menu" data-id="${esc(p.id)}" aria-label="More options for ${esc(p.title)}">${I(IC.dots, 'fill')}</button></div>
  </div>`;
}
function ideaCard(it, ar) {
  S.web.set(it.key, it);
  const saved = isSaved(it);
  const h = (it.holidays || []).find(dated);
  return `<div class="pin" data-act="open-idea" data-k="${esc(it.key)}">
    <div class="media" data-type="${it.type}" data-title="${esc(it.title)}" style="aspect-ratio:1/${ar}">
      <img src="${esc(it.image)}" data-orig="${esc(it.image)}" data-proxy="1" loading="lazy" referrerpolicy="no-referrer" alt="">
      <button class="save-pill${saved ? ' done' : ''}" data-act="save-idea" data-k="${esc(it.key)}">${saved ? 'Saved' : 'Save'}</button>
    </div>
    <div class="pin-foot"><div class="pin-text"><div class="pin-title">${esc(it.title)}</div><div class="pin-sub">${h ? `<span class="holi">${E(Hol.emoji(h))}</span>` : ''}${it.reason ? `<span class="why">${esc(it.reason)}</span>` : `<span>${esc(it.sourceName)}</span>`}</div></div>
      <button class="dots" data-act="idea-menu" data-k="${esc(it.key)}" aria-label="More options">${I(IC.dots, 'fill')}</button></div>
  </div>`;
}
function tcard(p) {
  return `<div class="tcard" data-act="open-pin" data-id="${esc(p.id)}"><div class="media${imgTag(p) ? '' : ' ph ' + typeKey(p)}" data-type="${typeKey(p)}" data-title="${esc(p.title)}">${imgTag(p) || ''}${p.kind === 'video' ? `<span class="play">${I(IC.play, 'fill')}</span>` : ''}</div><b>${esc(p.title)}</b></div>`;
}
function tcardIdea(it) {
  S.web.set(it.key, it);
  return `<div class="tcard" data-act="open-idea" data-k="${esc(it.key)}"><div class="media"><img src="${esc(it.image)}" data-orig="${esc(it.image)}" data-proxy="1" loading="lazy" referrerpolicy="no-referrer" alt=""></div><b>${esc(it.title)}</b>${it.reason ? `<span class="why">${esc(it.reason)}</span>` : ''}</div>`;
}
function skeleton(n) {
  const ars = [1.4, 1.1, 1.6, 1.25, 1.5, 1.2, 1.35, 1.55];
  return masonry(Array.from({ length: n || 8 }, (_, i) => ({ web: true, width: 100, height: ars[i % ars.length] * 100 })), (it, ar) => `<div class="skel" style="aspect-ratio:1/${ar}"></div>`);
}

/* ---------- routing (the phone's back button works) ---------- */
const TABS = ['home', 'explore', 'music', 'studio'];
function go(route, replace) {
  const cur = Object.assign({}, history.state || S.route, { y: window.scrollY });
  history.replaceState(cur, '');
  if (replace) history.replaceState(route, ''); else history.pushState(route, '');
  S.route = route;
  renderRoute();
  window.scrollTo(0, 0);
}
function goTab(v) {
  if (v === 'add') { openSave({}); return; }
  if (S.route.v === v) { window.scrollTo({ top: 0, behavior: 'smooth' }); if (v === 'home' && S.homeFilter !== 'all') { S.homeFilter = 'all'; renderRoute(true); } return; }
  go({ v }, TABS.includes(S.route.v));
}
window.addEventListener('popstate', e => {
  const st = e.state || { v: 'home' };
  if (!$('#sheetwrap').hidden && !st.sheet) {
    hideSheet();
    const after = afterClose; afterClose = null;
    if (after) after();
    return;
  }
  S.route = st;
  renderRoute();
  requestAnimationFrame(() => window.scrollTo(0, st.y || 0));
});
const from = () => TABS.includes(S.route.v) ? S.route.v : S.route.from;
function renderRoute(keepScroll) {
  const r = S.route;
  const tab = TABS.includes(r.v) ? r.v : (r.from || '');
  for (const b of $$('#nav button')) { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  const main = $('#main');
  const y = window.scrollY;
  if (!S.ready) { main.innerHTML = `<div class="loadrow" style="margin-top:40vh"><span class="spinner"></span>Opening your studio…</div>`; return; }
  // a lesson that's playing keeps playing when its page refreshes
  if (r.v === 'video' && keepScroll && curV && (curV.id === r.k || (r.pin && savedVid(curV.id) && savedVid(curV.id).id === r.pin))) { refreshVideoBits(curV); return; }
  stopPlayer();
  const views = { home: vHome, explore: vExplore, studio: vStudio, music: vMusic, supplies: vSupplies, creator: () => vCreator(r.k), holiday: () => vHoliday(r.k), board: () => vBoard(r.key), pin: () => vPin(S.pins.find(p => p.id === r.id)), idea: () => vIdea(S.web.get(r.k) || r.item), video: () => vVideo(r) };
  main.innerHTML = (views[r.v] || vHome)();
  hydrate(main);
  if (keepScroll) window.scrollTo(0, y);
  if (r.v === 'music') loadMusicFeed(false);
  if (r.v === 'video') { const v = r.pin ? (S.pins.find(x => x.id === r.pin) && pinVid(S.pins.find(x => x.id === r.pin))) : (MS.vids.get(r.k) || r.item); if (v) { annot(v); if (!keepScroll) mEvent('open', v, 1); loadVMore(v); } }
  if (r.v === 'pin' || r.v === 'idea') loadMore(r);
  if (r.v === 'holiday') loadHolidayIdeas(r.k);
  if (r.v === 'explore' || r.v === 'home') loadIdeas(false);
}
let resizeT = 0, lastCols = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (colCount() !== lastCols && !['pin', 'idea', 'video'].includes(S.route.v)) renderRoute(true); lastCols = colCount(); }, 200); });


/* ---------- Home ---------- */
function storyBtn(x) {
  const attrs = Object.entries(x.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  return `<button class="story${x.one ? ' one' : ''}" data-act="${x.act}"${attrs} aria-label="${esc(x.aria || x.label)}"><span class="ring">${x.ring === false ? '' : paintRing(x.seed || x.label)}${x.inner}${x.tag != null && x.tag !== '' ? `<span class="tag">${esc(x.tag)}</span>` : ''}</span><b>${esc(x.label)}</b></button>`;
}
function storiesRail() {
  const items = [{ act: 'add', label: 'Save', aria: 'Save an idea', ring: false, inner: `<span class="in add">${I(IC.plus)}</span>` }];
  for (const u of Hol.upcoming(new Date(), 75).slice(0, 3)) {
    items.push({ act: 'holiday', data: { k: u.id }, label: shortHol(u.name), seed: u.id, aria: u.name + ', ' + Hol.countdown(u.days), tag: u.days === 0 ? 'Today' : u.days < 14 ? u.days + 'd' : Math.round(u.days / 7) + 'w', inner: `<span class="in">${E(u.emoji)}</span>` });
  }
  const making = S.pins.filter(p => isArt(p) && p.status === 'making');
  if (making.length) items.push({ act: 'board', data: { key: 'making' }, label: 'Making', seed: 'making', tag: making.length, inner: `<span class="in">${imgTag(making[0]) || E('🛠️')}</span>` });
  const ready = readyPins();
  if (ready.length) items.push({ act: 'board', data: { key: 'ready' }, label: 'Ready', aria: 'Ready to make', seed: 'ready', tag: ready.length, inner: `<span class="in">${imgTag(ready[0]) || E('✅')}</span>` });
  const learning = S.pins.find(p => p.type === 'music' && p.mstatus === 'learning');
  if (learning) items.push({ act: 'tab', data: { tab: 'music' }, label: 'Practice', seed: 'practice', inner: `<span class="in">${imgTag(learning) || E('🎸')}</span>` });
  for (const c of topCreators(4)) items.push({ act: 'creator', data: { k: c.key }, label: c.name, one: true, seed: c.key, inner: `<span class="in letter" style="background:${letterColor(c.key)}">${esc(c.name.replace(/^@/, '').charAt(0).toUpperCase())}</span>` });
  return `<div class="stories" aria-label="Coming up">${items.map(storyBtn).join('')}</div>`;
}
function memoryPin() {
  const now = Date.now();
  const old = S.pins.filter(p => isArt(p) && !p.example && p.status === 'want' && now - p.createdAt > 10 * 864e5 && !((S.memo.snooze[p.id] || 0) > now));
  if (!old.length) return null;
  const score = p => (p.liked ? 3 : 0) + (holsOf(p).some(h => { const d = Hol.daysUntil(h); return d != null && d <= 45; }) ? 4 : 0) + ((supFor(p) || {}).ready ? 2 : 0) + (seedOf(p.id + new Date().toDateString()) % 100) / 100;
  return old.sort((a, b) => score(b) - score(a))[0];
}
function memoryCard(p) {
  const h = holsOf(p).find(x => { const d = Hol.daysUntil(x); return d != null && d <= 45; });
  const lead = h ? `${Hol.emoji(h)} ${Hol.label(h)} is ${Hol.daysUntil(h) < 14 ? 'in ' + plural(Hol.daysUntil(h), 'day') : 'coming up'}` : 'You saved this ' + ago(p.createdAt);
  const sc = supFor(p);
  return `<div class="card sun memory">
    <div class="thumb" data-act="open-pin" data-id="${esc(p.id)}">${imgTag(p) || ''}</div>
    <div class="txt"><small>${esc(lead)}</small><b>${esc(p.title)}</b>
      <p class="muted" style="font-size:13px;margin:3px 0 10px">${sc && stashSize() ? (sc.ready ? 'You have everything for it.' : 'You have ' + sc.have + ' of ' + sc.need + ' supplies.') : 'Still want to make it?'}</p>
      <div class="row"><button class="btn ink sm" data-act="memo-make" data-id="${esc(p.id)}">Make it</button><button class="btn gray sm" data-act="memo-later" data-id="${esc(p.id)}">Not now</button></div></div>
  </div>`;
}
function homeList() {
  const f = S.homeFilter;
  let list = S.pins.slice();
  if (f === 'painting' || f === 'craft' || f === 'music') list = list.filter(p => p.type === f);
  else if (f === 'making') list = list.filter(p => isArt(p) && p.status === 'making');
  else if (f === 'ready') list = readyPins();
  else if (f.startsWith('hol:')) list = pinsForHoliday(f.slice(4));
  return list.sort((a, b) => b.createdAt - a.createdAt);
}
function vHome() {
  const name = S.profile.name;
  let h = `<div class="top"><div class="bar"><div class="mark"><img src="icons/logo-128.png" alt="">Artistry</div><span class="grow"></span>
    <button class="iconbtn" data-act="supplies" data-tab="list" aria-label="Shopping list">${I(IC.basket)}${S.shop.filter(x => !x.done).length ? `<span class="count">${S.shop.filter(x => !x.done).length}</span>` : ''}</button>
    <button class="iconbtn" data-act="search-go" aria-label="Search">${I(IC.search)}</button></div></div>`;
  h += storiesRail();
  if (!S.pins.length) return h + welcome(name) + `<h2 class="sect">Ideas to get you started</h2>` + ideasBlock(12);
  const mem = S.pins.length >= 5 && S.homeFilter === 'all' ? memoryPin() : null;
  if (mem) h += memoryCard(mem);
  // filter chips
  const chips = [['all', 'All', ''], ['painting', 'Painting', '🎨'], ['craft', 'Crafts', '✂️'], ['music', 'Music', '🎵']].filter(([k]) => k === 'all' || S.pins.some(p => p.type === k));
  const up = Hol.upcoming(new Date(), 75).find(u => pinsForHoliday(u.id).length);
  if (up) chips.push(['hol:' + up.id, shortHol(up.name), up.emoji]);
  if (readyPins().length) chips.push(['ready', 'Ready to make', '✅']);
  if (S.pins.some(p => isArt(p) && p.status === 'making')) chips.push(['making', 'Making', '🛠️']);
  if (!chips.some(c => c[0] === S.homeFilter)) S.homeFilter = 'all';
  if (chips.length > 2) h += `<div class="chips">${chips.map(([k, l, e]) => `<button class="chip" data-act="home-filter" data-f="${k}" aria-pressed="${S.homeFilter === k}">${e ? E(e) : ''}${esc(l)}</button>`).join('')}</div>`;
  const list = homeList();
  if (!list.length) h += `<div class="note">Nothing here yet.</div>`;
  else if (S.homeFilter === 'all' && list.length > 8 && S.ideas.items.length) {
    h += masonry(list.slice(0, 8), pinCard);
    h += `<h2 class="sect">Picked for you<a class="more" href="#" data-act="tab" data-tab="explore">See all</a></h2><div class="hscroll">${S.ideas.items.slice(0, 10).map(tcardIdea).join('')}</div>`;
    h += masonry(list.slice(8), pinCard);
  } else h += masonry(list, pinCard);
  if (S.homeFilter === 'all' && S.pins.filter(p => !p.example).length < 8) h += `<h2 class="sect">More ideas for you</h2>` + ideasBlock(12);
  return h;
}
function welcome(name) {
  const inst = standalone() ? '' : `<li><span><b>Install it first</b> so Artistry shows up in the Share menu: ${S.installEvt ? `<button class="linkbtn" data-act="install">Install now</button>` : 'in Chrome, tap ⋮, then <b>Install app</b> (or Add to Home screen)'}.</span></li>`;
  return `<div class="welcome">
    <h2>${name ? 'Welcome, ' + esc(name) + '!' : 'Welcome to Artistry'}</h2>
    <p>Save painting, craft and music ideas from anywhere. Artistry sorts them, finds the supplies, counts down to holidays, and learns what you like.</p>
    ${name ? '' : `<div class="namefield"><input id="wName" type="text" maxlength="30" autocomplete="given-name" placeholder="What should we call you?" aria-label="Your name"><button class="btn teal" data-act="welcome-name">Save</button></div>`}
    <ol class="steps">${inst}
      <li><span>Open a post in TikTok, Instagram, YouTube, Facebook or Pinterest and tap <b>Share</b>, then <b>Artistry</b>. Don’t see it? Tap <b>More</b> or <b>Share to…</b></span></li>
      <li><span>It files it under Painting, Crafts or Music, finds the holiday, and lists the supplies.</span></li>
      <li><span>Add what’s in your craft stash under <b>My supplies</b>, and it tells you what you can make today.</span></li>
    </ol>
    <div class="row"><button class="btn coral" data-act="add">${I(IC.plus)}Paste a link</button><button class="btn gray" data-act="supplies" data-tab="have">${I(IC.box)}My supplies</button></div></div>`;
}
function ideasBlock(max) {
  const it = S.ideas;
  if (it.items.length) return masonry(it.items.slice(0, max || 200), ideaCard);
  if (it.loading) return skeleton(8);
  if (it.error) return `<div class="note center">${esc(it.error)}<div style="margin-top:10px"><button class="btn gray sm" data-act="ideas-retry">Try again</button></div></div>`;
  return skeleton(8);
}

/* ---------- Explore ---------- */
function vExplore() {
  return `<div class="top"><div class="pagehead" style="padding-top:6px"><h1>Explore</h1></div>
    <label class="searchbar" for="q" style="margin-top:8px">${I(IC.search)}<input id="q" type="search" enterkeyhint="search" placeholder="Search projects, supplies, holidays, songs" value="${esc(S.search.q)}" autocomplete="off"></label></div>
    <div id="sres">${S.search.q.trim() ? searchResults() : exploreHome()}</div>`;
}
function exploreHome() {
  const L = learn();
  let h = '';
  // holidays coming up
  const ups = Hol.upcoming(new Date(), 120).slice(0, 6);
  if (ups.length) h += `<h2 class="sect">Holidays coming up<a class="more" href="#" data-act="holidays-all">All</a></h2><div class="hcards">${ups.map(u => { const n = pinsForHoliday(u.id).length; return `<button class="hcard" data-act="holiday" data-k="${u.id}">${E(u.emoji)}<b>${esc(u.name)}</b><small>${esc(Hol.countdown(u.days))}${u.days > 1 ? ' away' : ''}</small><span>${n ? plural(n, 'idea') + ' saved' : 'Get ideas'}</span></button>`; }).join('')}</div>`;
  // topics as paint dabs, her favorites first
  const tiles = [];
  for (const type of ['painting', 'craft']) for (const c of Cats.catList(type)) {
    if (c.id === 'other' || !catQuery(type, c.id)) continue;
    const n = S.pins.filter(p => p.type === type && p.category === c.id).length;
    tiles.push({ type, c, n, w: (L.cat[type + ':' + c.id] || 0) + n });
  }
  tiles.sort((a, b) => b.w - a.w);
  const shown = S.allKinds ? tiles : tiles.slice(0, 9);
  h += `<h2 class="sect">Browse by kind${tiles.length > 9 ? `<button class="more" data-act="all-kinds">${S.allKinds ? 'Fewer' : 'All ' + tiles.length}</button>` : ''}</h2><div class="dabs">${shown.map(t => `<button class="dab" data-act="topic-tile" data-type="${t.type}" data-c="${t.c.id}"><span class="blob">${E(catEmo(t.type, t.c.id))}</span><b>${esc(t.c.label)}</b>${t.n ? `<small>${t.n} saved</small>` : ''}</button>`).join('')}</div>`;
  // creators she saves from
  const cr = topCreators(10);
  if (cr.length) h += `<h2 class="sect">Your creators</h2><div class="stories">${cr.map(c => storyBtn({ act: 'creator', data: { k: c.key }, label: c.name, one: true, seed: c.key, inner: `<span class="in letter" style="background:${letterColor(c.key)}">${esc(c.name.replace(/^@/, '').charAt(0).toUpperCase())}</span>` })).join('')}</div>`;
  // ideas, with topics to steer them
  const chips = [{ id: 'foryou', label: 'For you' }];
  const nh = nextHolidayFor(L);
  if (nh) chips.push({ id: 'hol:' + nh.id, label: shortHol(nh.name), e: nh.emoji });
  for (const c of topCats(L, 4)) if (catQuery(c.type, c.id)) chips.push({ id: 'cat:' + c.type + ':' + c.id, label: Cats.catLabel(c.type, c.id), e: catEmo(c.type, c.id) });
  for (const t of topTags(L, 2)) chips.push({ id: 'tag:' + t, label: '#' + t });
  for (const d of ['acrylic painting', 'painted rocks', 'watercolor', 'wood craft', 'crochet', 'cricut', 'resin', 'dollar tree craft']) if (!chips.some(c => c.label.toLowerCase() === d || c.id === d)) chips.push({ id: d, label: titleCase(d) });
  const seen = new Set();
  h += `<h2 class="sect">Ideas for you</h2><div class="chips">${chips.filter(c => !seen.has(c.id) && seen.add(c.id)).map(c => `<button class="chip" data-act="topic" data-t="${esc(c.id)}" aria-pressed="${S.ideas.topic === c.id}">${c.e ? E(c.e) : ''}${esc(c.label)}</button>`).join('')}</div>`;
  h += ideasBlock();
  if (S.ideas.items.length) h += `<div class="center" style="margin:22px 0">${S.ideas.loading ? `<div class="loadrow"><span class="spinner"></span>Finding more…</div>` : `<button class="btn gray" data-act="ideas-more">More ideas</button>`}</div>`;
  return h;
}
function searchResults() {
  const q = S.search.q.trim();
  const words = q.toLowerCase().replace(/^#/, '').split(/\s+/).filter(Boolean);
  const hay = p => [p.title, p.caption, p.notes, (p.tags || []).join(' '), needsOf(p).map(x => x.name + ' ' + (x.line || '')).join(' '), isArt(p) ? Cats.catLabel(p.type, p.category) : 'music lesson song ' + (p.artist || '') + ' ' + (p.insts || []).join(' '), TYPE_LABEL[p.type], holsOf(p).map(Hol.label).join(' '), p.author, p.siteName].join(' ').toLowerCase();
  const mine = S.pins.filter(p => words.every(w => hay(p).includes(w))).sort((a, b) => b.createdAt - a.createdAt);
  let h = '';
  // a holiday or supply she typed
  const hm = Hol.ALL.filter(x => words.length && words.every(w => (x.name + ' ' + x.kw.join(' ')).toLowerCase().includes(w))).slice(0, 3);
  if (hm.length) h += `<div class="pills">${hm.map(x => `<button class="pill sun" data-act="holiday" data-k="${x.id}">${E(x.emoji)}${esc(x.name)}${dated(x.id) ? `<small>${esc(Hol.countdown(Hol.daysUntil(x.id)))}</small>` : ''}</button>`).join('')}</div>`;
  h += `<h2 class="sect">Your saves${mine.length ? ' · ' + mine.length : ''}</h2>`;
  h += mine.length ? masonry(mine, pinCard) : `<div class="note">Nothing you saved matches “${esc(q)}” yet.</div>`;
  const songs = (window.Music ? SONGS : []).filter(s => words.length && words.every(w => akey(s.t + ' ' + s.a).includes(w))).slice(0, 4);
  if (songs.length) { const P = mProfile(); h += `<h2 class="sect">Songs to learn</h2><div class="slist">${songs.map(s => songRow(s, P)).join('')}</div>`; }
  h += `<h2 class="sect">From craft and painting blogs</h2>`;
  if (S.search.loading) h += skeleton(6);
  else if (S.search.error) h += `<div class="note">${esc(S.search.error)}</div>`;
  else if (S.search.results.length) h += masonry(S.search.results, ideaCard);
  else h += `<div class="note">No blog projects found for “${esc(q)}”. Try fewer words.</div>`;
  return h;
}
let searchT = 0, searchN = 0;
function runSearch(q) {
  S.search.q = q;
  clearTimeout(searchT);
  const box = $('#sres');
  const paint = () => { const b = $('#sres'); if (b && S.route.v === 'explore') { b.innerHTML = S.search.q.trim() ? searchResults() : exploreHome(); hydrate(b); } };
  if (!q.trim()) { S.search.results = []; S.search.loading = false; paint(); return; }
  S.search.loading = true; S.search.error = '';
  if (box) paint();
  const my = ++searchN;
  searchT = setTimeout(async () => {
    let items = [];
    try { items = (await askCrafts(q.replace(/^#/, ''), 'both', 6)).map(x => webItem(x, '')); }
    catch (e) { if (my === searchN) S.search.error = navigator.onLine ? 'Couldn’t search the blogs right now.' : 'You’re offline. Blog search needs the internet.'; }
    if (my !== searchN) return;
    S.search.loading = false;
    const L = learn();
    const seenT = new Set();
    S.search.results = items.filter(x => !S.dismissed.has(x.url) && !seenT.has(tkey(x.title)) && seenT.add(tkey(x.title))).sort((a, b) => scoreItem(b, L) - scoreItem(a, L));
    paint();
  }, 500);
}

/* ---------- a holiday's page ---------- */
function vHoliday(id) {
  const x = Hol.byId(id);
  if (!x) return `<div class="note" style="margin-top:30px">That holiday isn’t here. <button class="linkbtn" data-act="back">Go back</button></div>`;
  const days = Hol.daysUntil(id), date = Hol.next(id);
  const mine = pinsForHoliday(id).sort((a, b) => b.createdAt - a.createdAt);
  const ready = mine.filter(p => (supFor(p) || {}).ready && p.status !== 'made');
  let h = `<div class="top"><div class="bar"><button class="iconbtn" data-act="back" aria-label="Back">${I(IC.back)}</button></div></div>
    <div class="card sun" style="display:flex;align-items:center;gap:16px;margin-top:0">
      <span class="ring" style="width:86px;height:86px">${paintRing(id)}<span class="in" style="width:72px;height:72px;font-size:38px;background:var(--paper)">${E(x.emoji)}</span></span>
      <div><h1 style="margin:0;font-size:24px">${esc(x.name)}</h1>
      ${days != null ? `<p style="margin:2px 0 0;font-weight:700;color:var(--sun-ink)">${days === 0 ? 'It’s today!' : esc(Hol.countdown(days)) + ' to go'} · ${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>` : ''}
      <p class="muted" style="margin:2px 0 0;font-size:14px">${mine.length ? plural(mine.length, 'idea') + ' saved' + (ready.length ? ', ' + ready.length + ' ready to make' : '') : 'Nothing saved for it yet'}</p></div></div>`;
  if (ready.length) h += `<h2 class="sect">Ready to make</h2><div class="hscroll">${ready.map(tcard).join('')}</div>`;
  if (mine.length) h += `<h2 class="sect">Your ideas</h2>` + masonry(mine, pinCard);
  h += `<h2 class="sect">Ideas for ${esc(shortHol(x.name))}</h2><div id="holideas">${holIdeasBlock(id)}</div>`;
  return h;
}
function holIdeasBlock(id) {
  const st = S.hol.get(id);
  if (!st || st.loading) return skeleton(6);
  if (st.items.length) return masonry(st.items, ideaCard);
  return `<div class="note">${esc(st.error || 'No ideas right now.')}</div>`;
}
function allHolidaysSheet() {
  const rows = Hol.HOLIDAYS.map(x => ({ x, d: Hol.daysUntil(x.id) })).sort((a, b) => (a.d == null ? 999 : a.d) - (b.d == null ? 999 : b.d)).concat(Hol.PARTIES.concat(Hol.SEASONS).map(x => ({ x, d: null })));
  showSheet(`<div class="grip"></div><div class="shead"><h2>Holidays and seasons</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close">${I(IC.x)}</button></div>
    <div class="menu">${rows.map(({ x, d }) => { const n = pinsForHoliday(x.id).length; return `<button data-act="holiday" data-k="${x.id}" data-close="1">${E(x.emoji)}<span style="flex:1">${esc(x.name)}${n ? ` <small class="faint">· ${n}</small>` : ''}</span><small class="faint">${d != null ? esc(Hol.countdown(d)) : ''}</small></button>`; }).join('')}</div>`, 'Holidays');
}

/* ---------- boards ---------- */
const BOARDS = [['all', 'Everything', '✨'], ['painting', 'Painting', '🎨'], ['craft', 'Crafts', '✂️'], ['music', 'Music', '🎵'], ['fav', 'Favorites', '❤️'], ['want', 'Want to make', '📌'], ['making', 'Making now', '🛠️'], ['made', 'Made it', '🏆'], ['ready', 'Ready to make', '✅']];
function musicCount(items) {
  const songs = items.filter(p => p.kind === 'song').length, les = items.length - songs;
  return [les ? plural(les, 'lesson') : '', songs ? plural(songs, 'song') : ''].filter(Boolean).join(', ') || 'Nothing yet';
}
function boardItems(key) {
  const art = S.pins.filter(isArt);
  if (key === 'all') return S.pins.slice();
  if (key === 'painting' || key === 'craft' || key === 'music') return S.pins.filter(p => p.type === key);
  if (key === 'fav') return S.pins.filter(p => p.liked);
  if (key === 'want') return art.filter(p => p.status !== 'made' && p.status !== 'making');
  if (key === 'making') return art.filter(p => p.status === 'making');
  if (key === 'made') return art.filter(p => p.status === 'made');
  if (key === 'ready') return readyPins();
  if (key.startsWith('cat:')) { const [, t, c] = key.split(':'); return S.pins.filter(p => p.type === t && p.category === c); }
  if (key.startsWith('hol:')) return pinsForHoliday(key.slice(4));
  return [];
}
function boardName(key) {
  const b = BOARDS.find(x => x[0] === key);
  if (b) return b[1];
  if (key.startsWith('cat:')) { const [, t, c] = key.split(':'); return Cats.catLabel(t, c); }
  if (key.startsWith('hol:')) return Hol.label(key.slice(4));
  return 'Board';
}
function boardEmoji(key) {
  const b = BOARDS.find(x => x[0] === key);
  if (b) return b[2];
  if (key.startsWith('cat:')) { const [, t, c] = key.split(':'); return catEmo(t, c); }
  if (key.startsWith('hol:')) return Hol.emoji(key.slice(4));
  return '📌';
}
function collage(items, key) {
  const withPic = items.filter(p => p.photo || p.imageUrl).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const cell = (p, i) => p ? imgTag(p) : (i === 0 ? E(boardEmoji(key)) : '');
  return `<div class="collage"><div>${cell(withPic[0], 0)}</div><div>${cell(withPic[1], 1)}</div><div>${cell(withPic[2], 2)}</div></div>`;
}
function boardCard(key) {
  const items = boardItems(key);
  return `<div class="board" data-act="board" data-key="${esc(key)}">${collage(items, key)}<b>${esc(boardName(key))}</b><small>${key === 'music' ? musicCount(items) : plural(items.length, 'idea')}</small></div>`;
}
function vBoard(key) {
  const sorts = [['new', 'Newest'], ['az', 'A to Z'], ['opened', 'Most opened']].concat(stashSize() && key !== 'music' ? [['ready', 'Closest to ready']] : []);
  let items = boardItems(key);
  if (S.boardSort === 'az') items.sort((a, b) => a.title.localeCompare(b.title));
  else if (S.boardSort === 'opened') items.sort((a, b) => (b.opens || 0) - (a.opens || 0) || b.createdAt - a.createdAt);
  else if (S.boardSort === 'ready') { const miss = p => { const s = supFor(p); return s ? s.missing.length : 99; }; items.sort((a, b) => miss(a) - miss(b) || b.createdAt - a.createdAt); }
  else items.sort((a, b) => b.createdAt - a.createdAt);
  return `<div class="top"><div class="bar"><button class="iconbtn" data-act="back" aria-label="Back">${I(IC.back)}</button><div class="grow"><h1 style="margin:0;font-size:21px">${E(boardEmoji(key))} ${esc(boardName(key))}</h1><div class="faint" style="font-size:13px">${key === 'music' ? musicCount(items) : plural(items.length, 'idea')}</div></div></div>
    <div class="chips">${sorts.map(([k, l]) => `<button class="chip" data-act="board-sort" data-s="${k}" aria-pressed="${S.boardSort === k}">${l}</button>`).join('')}</div></div>
    ${items.length ? masonry(items, pinCard) : `<div class="note">${key === 'ready' ? 'Nothing is ready yet. Add what you have under My supplies, or check off supplies on a project.' : 'Nothing here yet.'}</div>`}`;
}
function vCreator(k) {
  const items = S.pins.filter(p => creatorKey(p) === k).sort((a, b) => b.createdAt - a.createdAt);
  if (!items.length) return `<div class="note" style="margin-top:30px">Nothing saved from them yet. <button class="linkbtn" data-act="back">Go back</button></div>`;
  const p = items[0], name = handle(p), pl = PLAT[p.platform] || PLAT.web;
  const prof = p.platform === 'instagram' ? 'https://www.instagram.com/' + enc(k) + '/' : p.platform === 'tiktok' ? 'https://www.tiktok.com/@' + enc(k) : p.platform === 'youtube' ? 'https://www.youtube.com/results?search_query=' + enc(p.author) : p.platform === 'pinterest' ? 'https://www.pinterest.com/' + enc(k) + '/' : '';
  return `<div class="top"><div class="bar"><button class="iconbtn" data-act="back" aria-label="Back">${I(IC.back)}</button></div></div>
    <div class="prof" style="padding-top:0"><span class="ring">${paintRing(k)}<span class="in letter" style="background:${letterColor(k)}">${esc(name.replace(/^@/, '').charAt(0).toUpperCase())}</span></span>
      <div style="min-width:0"><h1 style="overflow:hidden;text-overflow:ellipsis">${esc(name)}</h1><div class="faint">on ${esc(pl.name)} · ${plural(items.length, 'save')}</div>
      ${prof ? `<a class="btn gray sm" style="margin-top:8px" href="${esc(prof)}" target="_blank" rel="noopener">${I(IC.ext)}See their posts</a>` : ''}</div></div>
    ${masonry(items, pinCard)}`;
}

/* ---------- Studio (her profile) ---------- */
function vStudio() {
  const L = learn();
  const art = S.pins.filter(isArt), music = S.pins.filter(p => p.type === 'music');
  const made = art.filter(p => p.status === 'made').length, learned = music.filter(p => p.mstatus === 'learned').length;
  const name = S.profile.name;
  let h = `<div class="prof"><span class="ring">${paintRing('studio' + name)}<span class="in"><img src="icons/logo-128.png" alt=""></span></span>
    <div style="min-width:0;flex:1"><h1>${name ? esc(name) + '’s studio' : 'Your studio'}</h1>
      <div class="stats"><div><b>${art.length}</b><small>saved</small></div><div><b>${made}</b><small>made</small></div><div><b>${learned}</b><small>${learned === 1 ? 'song' : 'songs'} learned</small></div></div></div></div>
    <div class="row" style="margin:12px 0 2px"><button class="btn gray sm" data-act="edit-name">${I(IC.pencil)}${name ? 'Edit name' : 'Add your name'}</button><button class="btn gray sm" data-act="supplies" data-tab="have">${I(IC.box)}My supplies</button>${S.owner ? `<button class="btn coral sm" data-act="share-app">${I(IC.share)}Share Artistry</button>` : ''}</div>`;
  // holiday highlights
  const hols = Hol.ALL.filter(x => pinsForHoliday(x.id).length).sort((a, b) => (Hol.daysUntil(a.id) == null ? 999 : Hol.daysUntil(a.id)) - (Hol.daysUntil(b.id) == null ? 999 : Hol.daysUntil(b.id)));
  if (hols.length) h += `<div class="stories" style="margin-top:12px">${hols.map(x => storyBtn({ act: 'holiday', data: { k: x.id }, label: shortHol(x.name), seed: x.id, inner: `<span class="in">${E(x.emoji)}</span>` })).join('')}</div>`;
  const tabs = [['boards', 'Boards'], ['made', 'Made'], ['taste', 'Taste']];
  h += `<div class="tabs2" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="studio-tab" data-t="${k}" aria-selected="${S.studioTab === k}">${l}</button>`).join('')}</div>`;
  if (S.studioTab === 'made') h += studioMade();
  else if (S.studioTab === 'taste') h += studioTaste(L);
  else {
    const keys = BOARDS.map(b => b[0]).filter(k => ['all', 'painting', 'craft'].includes(k) || boardItems(k).length);
    const cats = [];
    for (const type of ['painting', 'craft']) for (const c of Cats.catList(type)) if (S.pins.some(p => p.type === type && p.category === c.id)) cats.push('cat:' + type + ':' + c.id);
    h += `<div class="boards">${keys.map(boardCard).join('')}</div>`;
    if (cats.length) h += `<h2 class="sect">By kind</h2><div class="boards">${cats.map(boardCard).join('')}</div>`;
  }
  if (!standalone()) h += `<div class="card teal" style="margin-top:26px"><h3>Put Artistry on your home screen</h3><p class="muted" style="font-size:14px">So it shows up in the Share menu of your other apps.</p><div class="row" style="margin-top:10px">${S.installEvt ? `<button class="btn teal sm" data-act="install">Install app</button>` : `<span class="muted" style="font-size:14px">In Chrome, tap ⋮, then <b>Install app</b> or <b>Add to Home screen</b>.</span>`}</div></div>`;
  h += `<h2 class="sect">Backup</h2><div class="card"><p class="muted" style="font-size:14px;margin-bottom:10px">Everything you save stays on this phone. Download a backup now and then, or to move to a new phone.</p>
    <div class="row"><button class="btn ink sm" data-act="backup">${I(IC.download)}Download backup</button><button class="btn gray sm" data-act="restore">${I(IC.upload)}Restore a backup</button></div></div>
    <p class="faint center" style="font-size:12.5px;margin:22px 0" data-act="ver">Artistry ${VERSION}</p>`;
  return h;
}
function studioMade() {
  const made = S.pins.filter(p => isArt(p) && p.status === 'made').sort((a, b) => (b.madeAt || b.updatedAt) - (a.madeAt || a.updatedAt));
  if (!made.length) return `<div class="note" style="margin-top:14px">When you finish a project, tap <b>Made it</b> on it and add a photo of yours. They show up here.</div>`;
  const cells = [];
  for (const p of made) {
    const shots = p.madePhotos || [];
    if (shots.length) for (const k of shots) cells.push(`<div data-act="open-pin" data-id="${esc(p.id)}"><img data-photo="${esc(k)}" alt="${esc(p.title)}"></div>`);
    else cells.push(`<div data-act="open-pin" data-id="${esc(p.id)}" style="opacity:.9">${imgTag(p)}</div>`);
  }
  return `<p class="faint" style="font-size:13px;margin:12px 2px 6px">${plural(made.length, 'project')} made. Your own photos show first.</p><div class="grid3">${cells.join('')}</div>`;
}
function studioTaste(L) {
  let h = '';
  if (!L.n) return `<div class="note" style="margin-top:14px">Nothing yet. It learns from what you save, heart, make and open, and from ideas you mark Not for me.</div>`;
  const tot = L.type.painting + L.type.craft || 1, pp = Math.round(L.type.painting / tot * 100);
  const tc = topCats(L, 6), tt = topTags(L, 10), th = topHols(L, 5), cr = topCreators(5);
  h += `<div class="card" style="margin-top:16px"><h3>${pp >= 60 ? 'You lean toward painting' : pp <= 40 ? 'You lean toward crafts' : 'A good mix of painting and crafts'}</h3>
    <div class="split" role="img" aria-label="${pp}% painting, ${100 - pp}% crafts"><i style="width:${pp}%;background:var(--cobalt)"></i><i style="width:${100 - pp}%;background:var(--teal)"></i></div>
    <div class="faint" style="font-size:13px">${pp}% painting, ${100 - pp}% crafts</div>
    ${tc.length ? `<div class="mini">Favorite kinds</div><div class="taglist">${tc.map(c => `<span>${E(catEmo(c.type, c.id))} ${esc(Cats.catLabel(c.type, c.id))}</span>`).join('')}</div>` : ''}
    ${th.length ? `<div class="mini">Holidays you plan for</div><div class="taglist">${th.map(x => `<span>${E(Hol.emoji(x))} ${esc(Hol.label(x))}</span>`).join('')}</div>` : ''}
    ${cr.length ? `<div class="mini">Creators you save the most</div><div class="taglist">${cr.map(c => `<span>${esc(c.name)}</span>`).join('')}</div>` : ''}
    ${tt.length ? `<div class="mini">Tags you come back to</div><div class="taglist">${tt.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
  const P = mProfile(), late = lately(P);
  if (late.length) h += `<div class="card"><h3>In music lately</h3><p class="muted" style="font-size:14px">${esc(late.join(', '))}</p></div>`;
  const avoid = Object.keys(S.taste.avoidTags).map(t => ({ k: 'tag', v: t, l: '#' + t })).concat(Object.keys(S.taste.avoidCats).map(c => { const [t, id] = c.split(':'); return { k: 'cat', v: c, l: Cats.catLabel(t, id) }; }));
  if (avoid.length) h += `<div class="card"><h3>Not for me</h3><p class="muted" style="margin:0 0 6px;font-size:14px">Ideas like these show up less. Tap one to take it off.</p><div class="taglist">${avoid.map(a => `<button data-act="unavoid" data-k="${a.k}" data-v="${esc(a.v)}">${esc(a.l)} ✕</button>`).join('')}</div></div>`;
  return h;
}

/* ---------- My supplies ---------- */
function vSupplies() {
  const tab = S.route.tab === 'list' ? 'list' : 'have';
  const open = S.shop.filter(x => !x.done).length;
  let h = `<div class="top"><div class="bar"><button class="iconbtn" data-act="back" aria-label="Back">${I(IC.back)}</button><h1 class="grow" style="margin:0;font-size:22px">My supplies</h1></div>
    <div class="tabs2" style="margin-top:4px" role="tablist"><button role="tab" data-act="supplies" data-tab="have" data-replace="1" aria-selected="${tab === 'have'}">I have · ${stashSize()}</button><button role="tab" data-act="supplies" data-tab="list" data-replace="1" aria-selected="${tab === 'list'}">Shopping list${open ? ' · ' + open : ''}</button></div></div>`;
  return h + (tab === 'list' ? shopList() : stashView());
}
function stashView() {
  const ready = readyPins();
  let h = `<div class="card mint" style="margin-top:14px"><h3>${stashSize() ? plural(stashSize(), 'supply', 'supplies') + ' at home' : 'What’s in your craft stash?'}</h3>
    <p class="muted" style="font-size:14px">${stashSize() ? (ready.length ? plural(ready.length, 'project') + ' ready to make with what you have.' : 'Nothing is fully ready yet. Projects show what’s missing.') : 'Tap what you have below, or type it. Every project then shows what you’re missing.'}</p>
    ${ready.length ? `<button class="btn ink sm" style="margin-top:10px" data-act="board" data-key="ready">See what you can make</button>` : ''}</div>
    <div class="addsup"><input id="supIn" type="text" autocomplete="off" placeholder="Type a supply, like Mod Podge" aria-label="Add a supply"><button class="btn teal" data-act="stash-add">Add</button></div><div class="sugg" id="supSugg"></div>
    <div class="switch"><div class="t"><b>Count the basics as on hand</b><small>Scissors, pencil, tape, paper towels, a water cup and such</small></div><button class="sw" role="switch" data-act="basics" aria-checked="${S.stash.basics !== false}" aria-label="Count the basics as on hand"></button></div>`;
  const have = new Set(S.stash.have);
  for (const g of Sup.GROUPS) {
    const ids = Sup.SUPPLIES.filter(s => s.g === g.id && (Sup.COMMON.includes(s.id) || have.has(s.id)) && !s.basic).map(s => s.id);
    const custom = g.id === 'basics' ? S.stash.custom : [];
    if (!ids.length && !custom.length) continue;
    const n = ids.filter(id => have.has(id)).length + custom.length;
    h += `<div class="ghead">${E(g.emoji)}${esc(g.name)}${n ? `<small>${n} on hand</small>` : ''}</div><div class="toggles">`;
    h += ids.map(id => `<button class="tog" data-act="stash-tog" data-sid="${id}" aria-pressed="${have.has(id)}">${have.has(id) ? I(IC.check) : ''}${esc(Sup.byId(id).name)}</button>`).join('');
    h += custom.map(nm => `<button class="tog custom" data-act="stash-del" data-name="${esc(nm)}" aria-pressed="true" aria-label="Remove ${esc(nm)}">${esc(nm)} ✕</button>`).join('');
    h += `</div>`;
  }
  return h;
}
function shopList() {
  if (!S.shop.length) return `<div class="note" style="margin-top:16px">Your shopping list is empty. On a project, tap <b>Add missing to my list</b>.</div>`;
  const groups = {};
  for (const it of S.shop) (groups[it.g] = groups[it.g] || []).push(it);
  let h = `<div class="row" style="margin:14px 0 4px"><button class="btn teal sm" data-act="shop-bought">${I(IC.check)}Bought the checked ones</button><button class="btn gray sm" data-act="shop-share">${I(IC.share)}Share list</button><button class="btn gray sm" data-act="shop-clear">Clear checked</button></div>`;
  for (const g of Sup.GROUPS) {
    const items = groups[g.id];
    if (!items) continue;
    h += `<div class="ghead">${E(g.emoji)}${esc(g.name)}</div>`;
    for (const it of items) {
      const titles = (it.pins || []).map(id => S.pins.find(p => p.id === id)).filter(Boolean).map(p => p.title);
      h += `<div class="shopitem${it.done ? ' done' : ''}"><button class="srow${it.done ? ' have' : ''}" style="width:auto;padding:0" data-act="shop-tick" data-k="${esc(it.k)}" aria-label="${it.done ? 'Uncheck' : 'Check'} ${esc(it.name)}"><span class="tick">${I(IC.check)}</span></button>
        <div class="nm"><b>${esc(it.name)}</b>${titles.length ? `<small>For ${esc(titles.slice(0, 2).join(', '))}${titles.length > 2 ? ' and ' + (titles.length - 2) + ' more' : ''}</small>` : ''}</div>
        <button class="x" data-act="shop-del" data-k="${esc(it.k)}" aria-label="Remove ${esc(it.name)}">${I(IC.x)}</button></div>`;
    }
  }
  return h;
}
function supSuggest(q) {
  const box = $('#supSugg');
  if (!box) return;
  const w = Sup.prep(q).trim();
  if (w.length < 2) { box.innerHTML = ''; return; }
  const have = new Set(S.stash.have);
  const hits = Sup.SUPPLIES.filter(s => !have.has(s.id) && (Sup.prep(s.name).includes(' ' + w) || s.kw.some(k => Sup.prep(k).includes(' ' + w)))).slice(0, 6);
  box.innerHTML = hits.map(s => `<button class="tog" data-act="stash-tog" data-sid="${s.id}" aria-pressed="false">${I(IC.plus)}${esc(s.name)}</button>`).join('');
}
function toggleHave(sid, on) {
  const have = new Set(S.stash.have);
  if (on == null) on = !have.has(sid);
  if (on) have.add(sid); else have.delete(sid);
  S.stash.have = Array.from(have);
  saveStash();
}
function addStash(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const s = Sup.lookup(t);
  if (s) { toggleHave(s.id, true); return s.name; }
  if (!S.stash.custom.some(x => x.toLowerCase() === t.toLowerCase())) S.stash.custom.push(t.slice(0, 40));
  saveStash();
  return t;
}
function addToShop(p) {
  const r = supFor(p);
  if (!r || !r.missing.length) return 0;
  let n = 0;
  for (const it of r.missing) {
    const k = it.id || 'c:' + it.name.toLowerCase();
    const cur = S.shop.find(x => x.k === k);
    if (cur) { if (!cur.pins.includes(p.id)) cur.pins.push(p.id); cur.done = false; continue; }
    S.shop.push({ k, sid: it.id, name: it.id ? it.name : it.line || it.name, g: it.g || 'basics', pins: [p.id], done: false, t: Date.now() });
    n++;
  }
  saveShop();
  return n || r.missing.length;
}
function shopText() {
  const lines = ['Artistry shopping list'];
  for (const g of Sup.GROUPS) {
    const items = S.shop.filter(x => x.g === g.id && !x.done);
    if (!items.length) continue;
    lines.push('', g.name + ':');
    for (const it of items) lines.push('- ' + it.name);
  }
  return lines.join('\n');
}

/* ---------- a project's own page ---------- */
function embedOf(p) {
  const u = p.url || '';
  if (p.platform === 'youtube') {
    const id = (u.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{6,})/) || [])[1];
    if (id) return { src: 'https://www.youtube.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0', ar: /shorts\//.test(u) ? 1.78 : 0.5625 };
  }
  if (p.platform === 'tiktok') {
    const id = (u.match(/\/(?:video|photo)\/(\d{8,})/) || [])[1];
    if (id) return { src: 'https://www.tiktok.com/embed/v2/' + id, ar: 1.78 };
  }
  if (p.platform === 'instagram') {
    const code = (u.match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]{5,})/i) || [])[1];
    if (code) return { src: 'https://www.instagram.com/p/' + code + '/embed/', ar: 1.62 };
  }
  if (p.platform === 'facebook' && p.kind === 'video') return { src: 'https://www.facebook.com/plugins/video.php?href=' + enc(u) + '&show_text=false', ar: 1.78 };
  return null;
}
function openLabel(p) {
  const pl = PLAT[p.platform] || PLAT.web;
  if (p.platform === 'web') return 'Visit ' + (p.siteName || hostOf(p.url) || 'site');
  return pl.open;
}
const STATUS = [['want', 'To make', IC.spark], ['making', 'Making', IC.hammer], ['made', 'Made it', IC.check]];
function vPin(p) {
  if (!p) return `<div class="note" style="margin-top:30px">That idea isn’t here anymore. <button class="linkbtn" data-act="back">Go back</button></div>`;
  const t = typeKey(p);
  const pl = PLAT[p.platform] || PLAT.web;
  const emb = embedOf(p);
  const media = imgTag(p);
  const who = handle(p) || p.siteName || hostOf(p.url);
  const hols = holsOf(p);
  const shots = p.madePhotos || [];
  return `<div class="cu">
    <div class="hero${media ? '' : ' ph ' + t}" id="cumedia" data-dbl="${esc(p.id)}">
      <div class="float"><button class="round" data-act="back" aria-label="Back">${I(IC.back)}</button><button class="round" data-act="pin-menu" data-id="${esc(p.id)}" aria-label="More options">${I(IC.dots, 'fill')}</button></div>
      ${media || esc(p.title)}
      ${emb ? `<button class="playbig" data-act="play" data-id="${esc(p.id)}" aria-label="Play here">${I(IC.play, 'fill')}</button>` : ''}
    </div>
    <div class="cu-body">
      <h1>${esc(p.title)}</h1>
      ${who ? `<div class="by"><span class="av" style="background:${pl.color}">${I(IC[p.platform] || IC.web)}</span><div class="who">${creatorKey(p) ? `<b><button class="linkbtn" style="color:var(--ink)" data-act="creator" data-k="${esc(creatorKey(p))}">${esc(who)}</button></b>` : `<b>${esc(who)}</b>`}<small>${p.platform === 'web' ? esc(hostOf(p.url)) : 'on ' + pl.name} · saved ${ago(p.createdAt)}</small></div>
        ${p.url ? `<a class="btn gray sm" href="${esc(p.url)}" target="_blank" rel="noopener" data-act="open" data-id="${esc(p.id)}">${esc(p.platform === 'web' ? 'Visit' : 'Open')}</a>` : ''}</div>` : ''}
      <div class="react">
        <button class="iconbtn${p.liked ? ' on' : ''}" data-act="like" data-id="${esc(p.id)}" aria-pressed="${!!p.liked}" aria-label="${p.liked ? 'Remove from favorites' : 'Add to favorites'}">${I(IC.heart)}</button>
        <button class="iconbtn" data-act="share" data-id="${esc(p.id)}" aria-label="Share">${I(IC.share)}</button>
        <span class="grow"></span>
        <button class="iconbtn" data-act="edit" data-id="${esc(p.id)}" aria-label="Edit">${I(IC.pencil)}</button>
      </div>
      <div class="seg3" role="group" aria-label="Where you are with it">${STATUS.map(([k, l, ic]) => `<button data-act="status" data-id="${esc(p.id)}" data-s="${k}" aria-pressed="${(p.status || 'want') === k}">${I(ic)}${l}</button>`).join('')}</div>
      <div id="supcard">${suppliesCard(p)}</div>
      <div class="pills">
        ${hols.map(h => `<button class="pill sun" data-act="holiday" data-k="${h}">${E(Hol.emoji(h))}${esc(Hol.label(h))}${dated(h) ? `<small>${esc(Hol.countdown(Hol.daysUntil(h)))}</small>` : ''}</button>`).join('')}
        <button class="pill" data-act="board" data-key="cat:${t}:${esc(p.category)}">${E(catEmo(t, p.category))}${esc(TYPE_LABEL[t])} · ${esc(Cats.catLabel(t, p.category))}</button>
        ${(p.tags || []).map(g => `<button class="pill" data-act="tag" data-t="${esc(g)}">#${esc(g)}</button>`).join('')}
      </div>
      ${p.caption && p.caption.trim() !== p.title ? `<div class="mini">How it’s made</div><p class="cap clip" id="cap">${esc(p.caption)}</p>${p.caption.length > 300 || (p.caption.match(/\n/g) || []).length > 5 ? `<button class="linkbtn" data-act="cap-more">More</button>` : ''}` : ''}
      ${p.notes ? `<div class="mini">Your notes</div><p class="cap">${esc(p.notes)}</p>` : ''}
      ${p.status === 'made' || shots.length ? `<div class="mini">Yours</div>${shots.length ? `<div class="grid3" style="margin:0">${shots.map(k => `<div><img data-photo="${esc(k)}" alt="Your ${esc(p.title)}"></div>`).join('')}</div>` : ''}<button class="btn gray sm" style="margin-top:10px" data-act="made-photo" data-id="${esc(p.id)}">${I(IC.camera)}Add a photo of yours</button>` : ''}
      ${p.link ? `<div class="mini">Project page</div><a href="${esc(p.link)}" target="_blank" rel="noopener" class="linkbtn" style="overflow-wrap:anywhere">${esc(hostOf(p.link))}</a>` : ''}
    </div>
    <h2 class="sect">More like this</h2><div id="more">${skeleton(4)}</div>
  </div>`;
}
function suppliesCard(p) {
  if (!isArt(p)) return '';
  const items = needsOf(p);
  if (!items.length) return `<div class="sup"><div class="sup-head"><h3>Supplies</h3></div><p class="muted" style="font-size:14px;margin:0 4px 8px">This post doesn’t list any. Add what it needs and Artistry checks it against what you have.</p><div class="acts"><button class="btn gray sm" data-act="sup-edit" data-id="${esc(p.id)}">${I(IC.plus)}Add supplies</button></div></div>`;
  const r = Sup.check(items, S.stash);
  const pct = r.need ? Math.round(r.have / r.need * 100) : 0;
  const haveSet = new Set(r.haveItems);
  const row = it => {
    const g = Sup.groupInfo(it.g);
    const on = haveSet.has(it);
    const sub = it.line && it.line.toLowerCase() !== it.name.toLowerCase() ? it.line : it.basic ? 'Most homes have this' : '';
    return `<button class="srow${on ? ' have' : ''}" data-act="sup-tog" data-id="${esc(p.id)}" data-sid="${esc(it.id || '')}" data-name="${esc(it.line || it.name)}" aria-pressed="${on}"><span class="tick">${I(IC.check)}</span><span class="nm"><b>${esc(it.id ? it.name : it.line || it.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="gi">${E(g.emoji)}</span></button>`;
  };
  const listed = items.filter(x => x.from !== 'likely'), likely = items.filter(x => x.from === 'likely');
  return `<div class="sup">
    <div class="sup-head"><h3>Supplies</h3><span class="need${r.ready ? ' ok' : ''}">${r.ready ? I(IC.check) + 'Ready to make' : 'You have ' + r.have + ' of ' + r.need}</span></div>
    <div class="meter"><i style="width:${pct}%"></i></div>
    <div class="srows">${listed.map(row).join('')}</div>
    ${likely.length ? `<p class="likely">${listed.length ? 'Projects like this usually also need:' : 'This post doesn’t list its supplies. Projects like this usually need:'}</p><div class="srows">${likely.map(row).join('')}</div>` : ''}
    <div class="acts">${r.missing.length ? `<button class="btn teal sm" data-act="shop-add" data-id="${esc(p.id)}">${I(IC.basket)}Add ${r.missing.length} to my list</button>` : ''}<button class="btn gray sm" data-act="sup-edit" data-id="${esc(p.id)}">${I(IC.pencil)}Edit</button></div>
    ${!stashSize() ? `<p class="likely" style="margin-top:4px">Tap the ones you already have. Artistry remembers them for every project.</p>` : ''}
  </div>`;
}
function refreshSupCard(p) { const b = $('#supcard'); if (b) b.innerHTML = suppliesCard(p); }
function vIdea(it) {
  if (!it) return `<div class="note" style="margin-top:30px">That idea isn’t here anymore. <button class="linkbtn" data-act="back">Go back</button></div>`;
  S.web.set(it.key, it);
  const saved = S.pins.find(p => p.url === it.url);
  const t = it.type;
  const hols = it.holidays || [];
  return `<div class="cu">
    <div class="hero" id="cumedia">
      <div class="float"><button class="round" data-act="back" aria-label="Back">${I(IC.back)}</button><button class="round" data-act="idea-menu" data-k="${esc(it.key)}" aria-label="More options">${I(IC.dots, 'fill')}</button></div>
      <img src="${esc(it.image)}" data-orig="${esc(it.image)}" data-proxy="1" referrerpolicy="no-referrer" alt="">
    </div>
    <div class="cu-body">
      <h1>${esc(it.title)}</h1>
      <div class="by"><span class="av" style="background:${letterColor(it.sourceName || 'W')}">${esc((it.sourceName || 'W').charAt(0))}</span><div class="who"><b>${esc(it.sourceName)}</b><small>${esc(hostOf(it.url))}</small></div></div>
      <div class="react"><button class="iconbtn" data-act="share-idea" data-k="${esc(it.key)}" aria-label="Share">${I(IC.share)}</button><span class="grow"></span>
        <a class="btn gray sm" href="${esc(it.url)}" target="_blank" rel="noopener">Visit site</a>
        ${saved ? `<button class="btn ink sm" data-act="open-pin" data-id="${esc(saved.id)}">Saved</button>` : `<button class="btn coral sm" data-act="save-idea" data-k="${esc(it.key)}">${I(IC.plus)}Save</button>`}</div>
      <div class="pills">${hols.map(h => `<button class="pill sun" data-act="holiday" data-k="${h}">${E(Hol.emoji(h))}${esc(Hol.label(h))}</button>`).join('')}<span class="pill">${E(catEmo(t, it.category))}${esc(TYPE_LABEL[t])} · ${esc(Cats.catLabel(t, it.category))}</span></div>
      ${it.reason ? `<p class="muted">${esc(it.reason)}</p>` : ''}
      <p class="muted" style="font-size:14px">Save it and Artistry reads the project page for its supply list.</p>
    </div>
    <h2 class="sect">More like this</h2><div id="more">${skeleton(4)}</div>
  </div>`;
}
async function loadMore(r) {
  const box = $('#more');
  if (!box) return;
  const base = r.v === 'pin' ? S.pins.find(p => p.id === r.id) : (S.web.get(r.k) || r.item);
  if (!base) { box.innerHTML = ''; return; }
  if (base.type === 'music') { box.previousElementSibling && box.previousElementSibling.remove(); box.remove(); return; }
  const baseUrl = base.url;
  const bh = base.web ? (base.holidays || []) : holsOf(base);
  const own = S.pins.filter(p => p.url !== baseUrl && isArt(p)).map(p => {
    let s = 0;
    if (p.type === base.type) s += 1;
    if (p.category === base.category && base.category !== 'other') s += 3;
    for (const t of p.tags || []) if ((base.tags || []).includes(t)) s += 1;
    for (const h of holsOf(p)) if (bh.includes(h)) s += 2;
    return { p, s };
  }).filter(x => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 6).map(x => x.p);
  const tag = (base.tags || []).find(t => !GENERIC_TAGS.has(t) && t.length < 16);
  const hq = bh.find(dated);
  const cq = catQuery(base.type, base.category) || (base.type === 'craft' ? 'craft' : 'painting');
  const q = [hq ? HOL_Q[hq] : '', cq, !hq && tag && !cq.includes(tag) ? tag : ''].join(' ').replace(/\s+/g, ' ').trim();
  const draw = web => {
    const b = $('#more');
    if (!b || S.route !== r) return;
    let h = '';
    if (own.length) h += `<div class="mini" style="margin-top:0">From your saves</div>` + masonry(own, pinCard);
    const skip = new Set([tkey(base.title)].concat(own.map(p => tkey(p.title))));
    const w = (web || []).filter(x => x.url !== baseUrl && !S.dismissed.has(x.url) && !skip.has(tkey(x.title)) && (skip.add(tkey(x.title)), true));
    if (w.length) h += (own.length ? `<div class="mini">From craft and painting blogs</div>` : '') + masonry(w, ideaCard);
    if (!h) h = `<div class="note">${navigator.onLine ? 'Nothing else like this yet.' : 'You’re offline. More ideas need the internet.'}</div>`;
    b.innerHTML = h;
    hydrate(b);
  };
  if (S.more.has(q)) { draw(S.more.get(q)); return; }
  if (own.length) draw(null);
  try {
    const items = (await askCrafts(q, base.type, 3)).map(x => webItem(x, ''));
    const L = learn();
    items.sort((a, b) => scoreItem(b, L) - scoreItem(a, L));
    S.more.set(q, items.slice(0, 18));
    draw(S.more.get(q));
  } catch (e) { draw([]); }
}

/* ---------- sheets ---------- */
let afterClose = null;
function showSheet(html, label) {
  const wrap = $('#sheetwrap'), sh = $('#sheet');
  sh.innerHTML = html;
  sh.setAttribute('aria-label', label || 'Details');
  if (wrap.hidden) {
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    history.pushState(Object.assign({}, S.route, { sheet: true }), '');
  }
  hydrate(sh);
}
function hideSheet() {
  $('#sheetwrap').hidden = true;
  $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
  F = null;
}
function closeSheet(then) {
  if ($('#sheetwrap').hidden) { if (then) then(); return; }
  afterClose = then || null;
  if (history.state && history.state.sheet) history.back();
  else { hideSheet(); const a = afterClose; afterClose = null; if (a) a(); }
}
$('#sheetwrap').addEventListener('click', e => { if (e.target.id === 'sheetwrap') closeSheet(); });
/* ---------- the Save sheet: reads the link and files it ---------- */
let F = null;
function openSave(o) {
  const url = normUrl(findUrl(o.url || '') || findUrl(o.text || '') || findUrl(o.title || '') || '');
  F = {
    mode: 'new', id: null, url, shareText: [o.title, o.text].filter(Boolean).join('\n').replace(url, ' ').trim(),
    reading: false, readErr: '', read: false,
    title: '', caption: '', author: '', siteName: '', platform: url ? platformOf(url) : 'web', kind: 'post', link: '', supplies: [],
    imageUrl: '', img: null, photo: null, photoP: null,
    type: null, sure: false, category: 'other', tags: [], suggested: [], notes: '', status: 'want', touched: false, genres: [], artist: '', song: '', holidays: [], holTouched: false
  };
  renderSave(true);
  if (url) readLink();
}
function openEdit(p) {
  F = {
    mode: 'edit', id: p.id, url: p.url, shareText: '', reading: false, readErr: '', read: true,
    title: p.title, caption: p.caption || '', author: p.author || '', siteName: p.siteName || '', platform: p.platform || platformOf(p.url), kind: p.kind || 'post',
    link: p.link || '', supplies: p.supplies || [], imageUrl: p.imageUrl || '', img: p.img || null, photo: null, photoP: null,
    type: p.type, sure: true, category: p.category, tags: (p.tags || []).slice(), suggested: [], notes: p.notes || '', status: p.status || 'want', touched: true, delArm: 0,
    genres: (p.genres || []).slice(), artist: p.artist || '', song: p.song || '', holidays: holsOf(p).slice(), holTouched: true
  };
  F.suggested = suggestFor();
  renderSave(true);
}
function suggestFor() {
  const s = Cats.sortPost({ title: F.title, caption: F.caption + '\n' + F.shareText, url: F.url, supplies: F.supplies });
  return s.tags.filter(t => !F.tags.includes(t));
}
function musicGuess() {
  const text = [F.title, F.caption, F.shareText].join('\n');
  const md = Music.detect(text, F.author);
  const art = Cats.classify(text);
  const artTop = Math.max(art.score.painting, art.score.craft);
  return { md, isMusic: md.isMusic && md.score >= 3 && md.score * 1.5 >= artTop };
}
function refile() {
  if (!F.holTouched) F.holidays = Hol.detect([F.title, F.caption, F.shareText].join('\n'));
  if (F.touched) { F.suggested = suggestFor(); return; }
  const s = Cats.sortPost({ title: F.title, caption: F.caption + '\n' + F.shareText, url: F.url, supplies: F.supplies, notes: F.notes });
  const mg = musicGuess();
  if (mg.isMusic) {
    const P = mProfile();
    F.type = 'music'; F.sure = true; F.guess = { type: 'music' };
    F.category = mg.md.inst.find(i => MS.prefs.insts.includes(i)) || mg.md.inst[0] || MS.prefs.insts.slice().sort((a, b) => (P.inst[b] || 0) - (P.inst[a] || 0))[0];
    F.genres = mg.md.genres.slice(0, 3); F.artist = mg.md.artist; F.song = mg.md.song; F.mlevel = mg.md.level;
    return;
  }
  F.sure = !!(s.type && s.sure);
  F.type = F.sure ? s.type : null;
  F.guess = s;
  F.category = F.type ? s.category : 'other';
  if (!F.tags.length) F.tags = s.tags.slice(0, 4);
  F.suggested = s.tags.filter(t => !F.tags.includes(t));
}
async function readLink() {
  const f = F;
  f.reading = true; f.readErr = '';
  renderSave();
  let j = null;
  try { j = await getJSON(API + '/api/idea?url=' + enc(f.url) + '&v=' + READER_V, 50000); }
  catch (e) { j = { ok: false, error: navigator.onLine ? 'That took too long.' : 'You’re offline.' }; }
  if (F !== f) return;
  f.reading = false;
  if (j && j.ok) {
    f.read = true;
    f.title = f.title || j.title || '';
    f.caption = j.caption || '';
    f.author = j.author || ''; f.siteName = j.siteName || ''; f.platform = j.platform || f.platform;
    f.kind = j.kind || 'post'; f.link = j.link || ''; f.supplies = j.supplies || [];
    if (j.finalUrl && !/\/embed/.test(j.finalUrl)) f.finalUrl = j.finalUrl;
    f.imageUrl = j.image || '';
    if (j.width && j.height) f.img = { w: j.width, h: j.height };
    if (f.imageUrl) f.photoP = fetchPhoto(f.imageUrl).then(ph => { if (F === f && ph) { f.photo = ph; f.img = { w: ph.w, h: ph.h }; if (!f.reading) renderSave(); } return ph; });
  } else {
    f.readErr = (j && j.error) || 'Couldn’t read that post.';
    if (!f.title && f.shareText) f.title = f.shareText.split('\n')[0].slice(0, 90);
  }
  refile();
  renderSave();
}
function renderSave(first) {
  const f = F;
  if (!f) return;
  const t = f.type;
  const pl = PLAT[f.platform] || PLAT.web;
  const guess = f.guess && f.guess.type;
  const boardHint = f.mode === 'edit' ? '' : f.reading ? '' : t ? (f.sure && !f.touched ? 'Sorted automatically. Tap to change it.' : '') : (f.read || f.readErr || f.title ? 'Painting, crafts or music? Tap one.' : '');
  const canSave = !f.reading && !!t && (f.title.trim() || f.url);
  const cats = t === 'music' ? MS.prefs.insts.concat(Music.INSTRUMENTS.map(i => i.id).filter(i => !MS.prefs.insts.includes(i))).map(i => ({ id: i, label: Music.instLabel(i) })) : t ? Cats.catList(t) : [];
  if (f.photo && !f.photoURL) f.photoURL = URL.createObjectURL(f.photo.blob);
  const thumb = f.photo ? `<img src="${f.photoURL}" alt="">` : f.imageUrl ? `<img src="${esc(f.imageUrl)}" data-orig="${esc(f.imageUrl)}" data-proxy="1" referrerpolicy="no-referrer" alt="">` : '';
  const html = `<div class="grip"></div>
    <div class="shead"><h2>${f.mode === 'edit' ? 'Edit idea' : 'Save idea'}</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close">${I(IC.x)}</button></div>
    ${f.mode === 'new' ? `<div class="field"><label for="fUrl">Link</label><input id="fUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste an Instagram, TikTok, YouTube or web link" value="${esc(f.url)}">
      ${!f.url ? `<p class="hint">In the app, tap Share, then Copy link. Long-press this box to paste.</p>` : ''}</div>` : ''}
    ${f.url || f.mode === 'edit' ? `<div class="preview">
      <div class="thumb">${thumb}</div>
      <div class="ptext">${f.reading ? `<div class="row"><span class="spinner"></span><b>Reading the post…</b></div><small>Getting the photo and caption from ${esc(pl.name)}</small>`
        : `<b>${esc(f.title || 'Untitled idea')}</b><small>${esc(f.author ? f.author + ' · ' : '')}${esc(f.platform === 'web' ? (f.siteName || hostOf(f.url)) : pl.name)}</small>${f.readErr ? `<p class="hint bad">${esc(f.readErr)} You can still save it.</p>` : ''}`}</div>
    </div>` : ''}
    <div class="field"><label for="fTitle">Title</label><input id="fTitle" type="text" maxlength="140" autocomplete="off" placeholder="What is it?" value="${esc(f.title)}"></div>
    <div class="field"><span class="flabel">Board</span>
      <div class="boardpick${!t && (f.read || f.readErr) ? ' ask' : ''}">
        <button data-act="f-type" data-t="painting" aria-pressed="${t === 'painting'}">${I(IC.brush)}Painting</button>
        <button data-act="f-type" data-t="craft" aria-pressed="${t === 'craft'}">${I(IC.scissors)}Crafts</button>
        <button data-act="f-type" data-t="music" aria-pressed="${t === 'music'}">${I(IC.note)}Music</button>
      </div>
      ${boardHint ? `<p class="hint${t ? '' : ' bad'}">${esc(boardHint)}${!t && guess ? ' It looks like ' + (guess === 'craft' ? 'crafts' : guess === 'music' ? 'music' : 'painting') + '.' : ''}</p>` : ''}
    </div>
    ${t ? `<div class="field"><span class="flabel">${t === 'music' ? 'Instrument' : 'Kind'}</span><div class="catpick">${shortCats(cats, f, t).map(c => `<button data-act="f-cat" data-c="${c.id}" aria-pressed="${f.category === c.id}">${t !== 'music' ? E(catEmo(t, c.id)) : ''}${esc(c.label)}</button>`).join('')}${!f.allCats && cats.length > 8 ? `<button data-act="f-allcats">More…</button>` : ''}</div></div>` : ''}
    ${t === 'music' ? `<div class="field"><span class="flabel">Genre</span><div class="catpick">${Music.GENRES.map(g => `<button data-act="f-genre" data-g="${g.id}" aria-pressed="${(f.genres || []).includes(g.id)}">${esc(g.label)}</button>`).join('')}</div></div>` : ''}
    ${t && t !== 'music' ? saveHolField(f) + saveSupBox(f) : ''}
    <div class="field"${t === 'music' ? ' hidden' : ''}><span class="flabel">Tags</span><div class="catpick">${f.tags.map(g => `<button data-act="f-untag" data-t="${esc(g)}" aria-pressed="true">#${esc(g)} ✕</button>`).join('')}${f.suggested.slice(0, 6).map(g => `<button data-act="f-tag" data-t="${esc(g)}">+ ${esc(g)}</button>`).join('')}</div>
      <input id="fTag" type="text" autocomplete="off" autocapitalize="off" placeholder="Add a tag and press Enter"></div>
    <div class="field"><label for="fNotes">Notes</label><textarea id="fNotes" rows="2" placeholder="Anything to remember (optional)">${esc(f.notes)}</textarea></div>
    <div class="sactions">
      ${f.mode === 'edit' ? `<button class="btn gray" data-act="f-delete" style="flex:0 0 auto;color:var(--red)">${f.delArm ? 'Tap again to delete' : 'Delete'}</button>` : ''}
      <button class="btn coral" data-act="f-save" ${canSave ? '' : 'disabled'}>${f.reading ? 'Reading…' : !t ? 'Pick a board to save' : f.mode === 'edit' ? 'Save changes' : 'Save'}</button>
    </div>`;
  const focusId = document.activeElement && document.activeElement.id;
  const caret = document.activeElement && 'selectionStart' in document.activeElement ? document.activeElement.selectionStart : null;
  showSheet(html, f.mode === 'edit' ? 'Edit idea' : 'Save idea');
  if (focusId && $('#' + focusId)) { const el = $('#' + focusId); el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch (e) {} }
  else if (first && f.mode === 'new' && !f.url) setTimeout(() => $('#fUrl') && $('#fUrl').focus(), 80);
}
document.addEventListener('input', e => {
  if (!F) return;
  const id = e.target.id;
  if (id === 'fTitle') { F.title = e.target.value; clearTimeout(F.t); F.t = setTimeout(() => { if (!F || F.touched) return; const before = F.type + F.category; refile(); if (before !== F.type + F.category) renderSave(); }, 500); }
  else if (id === 'fNotes') F.notes = e.target.value;
  else if (id === 'fUrl') {
    const raw = e.target.value;
    const u = normUrl(findUrl(raw) || (/\s/.test(raw.trim()) ? '' : raw));
    clearTimeout(F.t);
    if (u && u !== F.url) {
      if (/\s/.test(raw.trim())) F.shareText = raw.replace(findUrl(raw), ' ').trim();
      F.t = setTimeout(() => { if (!F) return; Object.assign(F, { url: u, platform: platformOf(u), read: false, readErr: '', imageUrl: '', img: null, photo: null, photoP: null }); readLink(); }, 350);
    }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'fTag' && F) {
    e.preventDefault();
    for (const t of e.target.value.split(/[,#]+/).map(x => x.trim().toLowerCase()).filter(Boolean)) if (!F.tags.includes(t)) F.tags.push(t.slice(0, 30));
    e.target.value = '';
    F.suggested = F.suggested.filter(t => !F.tags.includes(t));
    renderSave();
    $('#fTag') && $('#fTag').focus();
  }
  if (e.key === 'Escape' && !$('#sheetwrap').hidden) closeSheet();
});
async function saveForm() {
  const f = F;
  if (!f || !f.type) return;
  const tag = $('#fTag') && $('#fTag').value.trim();
  if (tag) for (const t of tag.split(/[,#]+/).map(x => x.trim().toLowerCase()).filter(Boolean)) if (!f.tags.includes(t)) f.tags.push(t);
  const title = f.title.trim() || (f.url ? (PLAT[f.platform] || PLAT.web).name + ' ' + (f.type === 'craft' ? 'craft idea' : f.type === 'music' ? Music.instLabel(f.category).toLowerCase() + ' lesson' : 'painting idea') : '');
  if (!title) { $('#fTitle') && $('#fTitle').focus(); return; }
  const btn = $('[data-act="f-save"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const now = Date.now();
  if (f.mode === 'edit') {
    const p = S.pins.find(x => x.id === f.id);
    if (!p) { closeSheet(); return; }
    const moved = p.type !== f.type || p.category !== f.category;
    Object.assign(p, { title, type: f.type, category: f.category, tags: f.tags, notes: f.notes.trim(), holidays: f.type === 'music' ? [] : f.holidays.slice() });
    if (moved && !p.needsEdited) p.needs = null;
    if (f.type === 'music') Object.assign(p, { insts: [f.category], genres: f.genres, mstatus: p.mstatus || 'want', kind: p.kind === 'song' ? 'song' : (p.videoId || ytIdOf(p.url) ? 'video' : p.kind), videoId: p.videoId || ytIdOf(p.url) });
    await savePin(p);
    closeSheet(() => renderRoute(true));
    toast('Changes saved');
    return;
  }
  const p = {
    id: 'p' + rid(), url: f.finalUrl || f.url || '', shared: f.url || '', platform: f.platform, kind: f.kind, title, caption: f.caption, author: f.author,
    siteName: f.siteName, link: f.link, supplies: f.supplies, type: f.type, category: f.category, tags: f.tags, notes: f.notes.trim(),
    status: 'want', liked: false, opens: 0, createdAt: now, updatedAt: now, imageUrl: f.imageUrl, img: f.img, photo: false, source: f.source || 'shared'
  };
  if (f.type !== 'music') { p.holidays = f.holidays.slice(); needsOf(p); }
  if (f.type === 'music') {
    const vid = f.platform === 'youtube' ? ytIdOf(p.url) : '';
    Object.assign(p, { insts: [f.category], genres: f.genres, artist: f.artist || '', song: f.song || '', mstatus: 'want', videoId: vid, kind: vid ? 'video' : p.kind, short: /\/shorts\//.test(p.url) });
    if (vid && !p.imageUrl) p.imageUrl = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
    mEvent('save', { insts: [f.category], genres: f.genres, artist: f.artist, channel: f.author }, 2);
  }
  if (f.photoP && !f.photo) await Promise.race([f.photoP, sleep(8000)]);
  if (f.photo) { try { await DB.put('photos', f.photo.blob, p.id); p.photo = true; p.img = { w: f.photo.w, h: f.photo.h }; } catch (e) {} }
  S.pins.unshift(p);
  await savePin(p);
  if (p.type === 'music') {
    closeSheet(() => { if (S.route.v === 'music') renderRoute(); else go({ v: 'music' }, TABS.includes(S.route.v)); });
    toast('Saved to Music · ' + Music.instLabel(p.category), p.videoId ? 'Play it' : null, () => go({ v: 'video', pin: p.id, k: p.videoId, from: 'music' }));
    return;
  }
  S.ideas.items = S.ideas.items.filter(x => x.url !== p.url);
  const where = (p.type === 'craft' ? 'Crafts' : 'Painting') + ' · ' + Cats.catLabel(p.type, p.category);
  closeSheet(() => {
    S.homeFilter = 'all';
    if (S.route.v === 'home') { renderRoute(); window.scrollTo(0, 0); } else go({ v: 'home' }, TABS.includes(S.route.v));
  });
  toast('Saved to ' + where, 'View', () => go({ v: 'pin', id: p.id, from: 'home' }));
  if (!p.photo && p.imageUrl) fetchPhoto(p.imageUrl).then(async ph => { if (ph) { await DB.put('photos', ph.blob, p.id).catch(() => {}); p.photo = true; p.img = { w: ph.w, h: ph.h }; await savePin(p); if (['home', 'board'].includes(S.route.v)) renderRoute(true); } });
}
// the picked kind first, then the ones she uses most; the rest behind More
function shortCats(cats, f, t) {
  if (f.allCats || cats.length <= 8) return cats;
  if (t === 'music') return cats.filter((c, i) => i < 7 || c.id === f.category);
  const L = learn();
  const order = cats.slice().sort((a, b) => (b.id === f.category) - (a.id === f.category) || (L.catN[t + ':' + b.id] || 0) - (L.catN[t + ':' + a.id] || 0));
  return order.slice(0, 7);
}
function saveHolField(f) {
  const det = f.holidays || [];
  const up = Hol.upcoming(new Date(), 100).map(u => u.id).filter(id => !det.includes(id)).slice(0, 3);
  const ids = det.concat(up);
  return `<div class="field"><span class="flabel">Holiday or season</span><div class="catpick">${ids.map(id => `<button class="hol" data-act="f-hol" data-h="${id}" aria-pressed="${det.includes(id)}">${E(Hol.emoji(id))}${esc(Hol.label(id))}</button>`).join('')}</div>${det.length && !f.holTouched ? `<p class="hint">Found from the post. Tap to change.</p>` : ''}</div>`;
}
function saveSupBox(f) {
  if (f.reading || !(f.read || f.readErr)) return '';
  const items = Sup.gather({ title: f.title, caption: f.caption + '\n' + f.shareText, supplies: f.supplies, type: f.type, category: f.category });
  if (!items.length) return '';
  const r = Sup.check(items, S.stash);
  const listed = items.filter(x => x.from !== 'likely').length;
  return `<div class="found">${E('🧺')}<div><b>${listed ? 'Found ' + plural(listed, 'supply', 'supplies') : 'Usually needs ' + plural(items.length, 'supply', 'supplies')}</b><small>${stashSize() ? (r.ready ? 'You have everything.' : 'You have ' + r.have + ' of ' + r.need + '.') : esc(items.slice(0, 4).map(x => x.id ? x.name : x.line || x.name).join(', ')) + (items.length > 4 ? '…' : '')}</small></div></div>`;
}

async function saveIdea(it) {
  if (!it || S.pins.some(p => p.url === it.url)) return;
  const now = Date.now();
  const p = {
    id: 'p' + rid(), url: it.url, shared: it.url, platform: 'web', kind: 'page', title: it.title, caption: '', author: '', siteName: it.sourceName,
    link: '', supplies: [], type: it.type, category: it.category, tags: it.tags || [], notes: '', status: 'want', liked: false, opens: 0,
    createdAt: now, updatedAt: now, imageUrl: it.image, img: it.width && it.height ? { w: it.width, h: it.height } : null, photo: false, source: 'ideas'
  };
  S.pins.unshift(p);
  await savePin(p);
  for (const b of $$(`[data-act="save-idea"][data-k="${CSS.escape(it.key)}"]`)) { b.textContent = 'Saved'; b.classList.add('done'); if (b.classList.contains('btn')) { b.className = 'btn ink sm'; b.dataset.act = 'open-pin'; b.dataset.id = p.id; } }
  toast('Saved to ' + (p.type === 'craft' ? 'Crafts' : 'Painting') + ' · ' + Cats.catLabel(p.type, p.category), 'Change', () => openEdit(p));
  p.holidays = (it.holidays || []).slice();
  const ph = await fetchPhoto(it.image);
  if (ph) { await DB.put('photos', ph.blob, p.id).catch(() => {}); p.photo = true; p.img = { w: ph.w, h: ph.h }; await savePin(p); }
  // the project page usually lists its supplies
  try {
    const j = await getJSON(API + '/api/idea?url=' + enc(it.url) + '&v=' + READER_V, 50000);
    if (j && j.ok) {
      p.caption = p.caption || j.caption || ''; p.supplies = j.supplies || [];
      if (!p.needsEdited) p.needs = null;
      p.holidays = null; needsOf(p); holsOf(p);
      await savePin(p);
      if (S.route.v === 'pin' && S.route.id === p.id) renderRoute(true);
    }
  } catch (e) { /* keep what we have */ }
}
function notForMe(it) {
  if (!it) return;
  S.dismissed.add(it.url);
  kvSet('dismissed', Array.from(S.dismissed).slice(-600));
  for (const t of it.tags || []) if (!GENERIC_TAGS.has(t)) S.taste.avoidTags[t] = (S.taste.avoidTags[t] || 0) + 1;
  const ck = it.type + ':' + it.category;
  if (it.category !== 'other') S.taste.avoidCats[ck] = (S.taste.avoidCats[ck] || 0) + 1;
  saveTaste();
  S.ideas.items = S.ideas.items.filter(x => x.url !== it.url);
  S.search.results = S.search.results.filter(x => x.url !== it.url);
  for (const [k, v] of S.more) S.more.set(k, v.filter(x => x.url !== it.url));
  if (S.route.v === 'idea') history.back(); else renderRoute(true);
  toast('Got it. You’ll see fewer like that.');
}
// The Share Artistry button (Boards) shows only on phones where it was turned on: Dave opens the app once with
// ?me=dave (or taps the version line on Boards 5 times). Turn it off with ?me=off. Kept in kv 'owner', not in backups.
const APP_URL = 'https://yumyumtumtum.vercel.app/crafts/';
const APP_INVITE = 'Hey, I made you an app for your painting, craft and music stuff. It’s called Artistry.\n\n'
  + 'Open this link in Chrome: ' + APP_URL + '\n\n'
  + 'Then tap the 3 dots at the top right and pick Install app (or Add to Home screen).\n\n'
  + 'After that, when you see something you like on TikTok, Instagram, YouTube, Facebook or Pinterest, tap Share and pick Artistry. '
  + 'It saves it and sorts it for you. If you don’t see Artistry right away, tap More. There’s also a Music tab with songs to learn and lessons.';
function shareApp() {
  if (navigator.share) navigator.share({ title: 'Artistry', text: APP_INVITE }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(APP_INVITE).then(() => toast('Link and steps copied. Paste them in a text.'), () => toast(APP_URL));
  else toast(APP_URL);
}
function setOwner(on) {
  S.owner = !!on;
  kvSet('owner', S.owner);
  toast(S.owner ? 'Share button is on for this phone (Studio)' : 'Share button is off for this phone');
  if (S.route.v === 'studio') renderRoute(true);
}
let verTaps = [];
function sharePin(title, url) {
  if (navigator.share) navigator.share({ title, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copied'), () => toast(url));
}


/* ---------- menus and small sheets ---------- */
function pinMenu(p) {
  if (p.type === 'music') {
    const st = p.mstatus || 'want';
    showSheet(`<div class="grip"></div><div class="shead"><h2>${esc(p.title)}</h2></div>
    <div class="seg3" role="group" aria-label="Where you are with it" style="margin:0 4px 10px">${[['want', 'Want to learn'], ['learning', 'Learning'], ['learned', 'Learned it']].map(([k, l]) => `<button data-act="pin-mstatus" data-id="${esc(p.id)}" data-s="${k}" data-close="1" aria-pressed="${st === k}">${l}</button>`).join('')}</div>
    <div class="menu">
    <button data-act="like" data-id="${esc(p.id)}" data-close="1">${I(IC.heart)}${p.liked ? 'Remove from favorites' : 'Add to favorites'}</button>
    <button data-act="edit" data-id="${esc(p.id)}">${I(IC.pencil)}Edit or change instrument</button>
    <button data-act="share" data-id="${esc(p.id)}" data-close="1">${I(IC.share)}Share</button>
    <button class="danger" data-act="delete" data-id="${esc(p.id)}">${I(IC.trash)}Delete</button>
  </div>`, 'Options');
    return;
  }
  const st = p.status || 'want';
  showSheet(`<div class="grip"></div><div class="shead"><h2>${esc(p.title)}</h2></div>
    <div class="seg3" role="group" aria-label="Where you are with it" style="margin:0 4px 10px">${STATUS.map(([k, l]) => `<button data-act="status" data-id="${esc(p.id)}" data-s="${k}" data-close="1" aria-pressed="${st === k}">${l}</button>`).join('')}</div>
    <div class="menu">
    <button data-act="like" data-id="${esc(p.id)}" data-close="1">${I(IC.heart)}${p.liked ? 'Remove from favorites' : 'Add to favorites'}</button>
    ${(supFor(p) || {}).missing && supFor(p).missing.length ? `<button data-act="shop-add" data-id="${esc(p.id)}" data-close="1">${I(IC.basket)}Add missing supplies to my list</button>` : ''}
    <button data-act="edit" data-id="${esc(p.id)}">${I(IC.pencil)}Edit, change board or holiday</button>
    <button data-act="move" data-id="${esc(p.id)}" data-close="1">${I(IC.swap)}Move to ${p.type === 'craft' ? 'Painting' : 'Crafts'}</button>
    <button data-act="share" data-id="${esc(p.id)}" data-close="1">${I(IC.share)}Share</button>
    <button class="danger" data-act="delete" data-id="${esc(p.id)}">${I(IC.trash)}Delete</button>
  </div>`, 'Options');
}
function ideaMenu(it) {
  const saved = S.pins.some(p => p.url === it.url);
  showSheet(`<div class="grip"></div><div class="shead"><h2>${esc(it.title)}</h2></div><div class="menu">
    ${saved ? '' : `<button data-act="save-idea" data-k="${esc(it.key)}" data-close="1">${I(IC.plus)}Save to ${it.type === 'craft' ? 'Crafts' : 'Painting'}</button>`}
    <button data-act="not-for-me" data-k="${esc(it.key)}" data-close="1">${I(IC.eyeoff)}Not for me</button>
    <button data-act="visit" data-k="${esc(it.key)}" data-close="1">${I(IC.ext)}Visit ${esc(it.sourceName)}</button>
  </div>`, 'Options');
}
function supEditSheet(p) {
  const items = needsOf(p);
  showSheet(`<div class="grip"></div><div class="shead"><h2>Supplies for this project</h2><button class="iconbtn" data-act="close-sheet" aria-label="Done">${I(IC.x)}</button></div>
    <p class="muted" style="font-size:14px;margin:0 2px 8px">Take off what it doesn’t need, or add what the post left out.</p>
    <div class="srows">${items.map((it, i) => `<div class="srow" style="cursor:default"><span class="gi">${E(Sup.groupInfo(it.g).emoji)}</span><span class="nm"><b>${esc(it.id ? it.name : it.line || it.name)}</b>${it.from === 'likely' ? '<small>Usually needed</small>' : ''}</span><button class="iconbtn" data-act="need-del" data-id="${esc(p.id)}" data-i="${i}" aria-label="Take off ${esc(it.name)}">${I(IC.trash)}</button></div>`).join('')}</div>
    <div class="addsup" style="margin-top:12px"><input id="needIn" type="text" autocomplete="off" placeholder="Add a supply" aria-label="Add a supply"><button class="btn teal" data-act="need-add" data-id="${esc(p.id)}">Add</button></div>
    <div class="row" style="margin-top:10px"><button class="btn gray sm" data-act="need-reset" data-id="${esc(p.id)}">Go back to what the post says</button></div>
    <div class="sactions"><button class="btn ink" data-act="close-sheet">Done</button></div>`, 'Supplies');
}
function nameSheet() {
  showSheet(`<div class="grip"></div><div class="shead"><h2>Your name</h2><button class="iconbtn" data-act="close-sheet" aria-label="Close">${I(IC.x)}</button></div>
    <div class="field"><label for="nmIn">What should Artistry call you?</label><input id="nmIn" type="text" maxlength="30" autocomplete="given-name" value="${esc(S.profile.name)}"></div>
    <div class="sactions"><button class="btn teal" data-act="name-save">Save</button></div>`, 'Your name');
  setTimeout(() => $('#nmIn') && $('#nmIn').focus(), 80);
}

/* ---------- little celebrations ---------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.id = 'confetti';
  const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const bits = Array.from({ length: 110 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .55, vx: (Math.random() - .5) * 26 * devicePixelRatio, vy: -(14 + Math.random() * 18) * devicePixelRatio, r: (4 + Math.random() * 6) * devicePixelRatio, c: PAL[Math.floor(Math.random() * PAL.length)], a: Math.random() * 6, va: (Math.random() - .5) * .4, blob: Math.random() < .5 }));
  const t0 = performance.now();
  (function frame(t) {
    const el = t - t0;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += .9 * devicePixelRatio; b.vx *= .985; b.x += b.vx; b.y += b.vy; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = b.c; ctx.globalAlpha = Math.max(0, 1 - el / 1800);
      if (b.blob) { ctx.beginPath(); ctx.ellipse(0, 0, b.r, b.r * .7, 0, 0, 7); ctx.fill(); } else ctx.fillRect(-b.r, -b.r / 3, b.r * 2, b.r / 1.5);
      ctx.restore();
    }
    if (el < 1800) requestAnimationFrame(frame); else cv.remove();
  })(t0);
  try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch (e) {}
}
function heartBurst(box) {
  if (!box) return;
  const s = document.createElement('div');
  s.className = 'burst';
  s.innerHTML = I(IC.heart, 'fill').replace('class="ic fill"', 'class="ic fill" style="width:110px;height:110px"');
  box.appendChild(s);
  setTimeout(() => s.remove(), 900);
}
// double-tap a project's picture to love it
let lastTap = 0;
document.addEventListener('pointerup', e => {
  const box = e.target.closest('[data-dbl]');
  if (!box || e.target.closest('button,a,iframe')) return;
  const now = Date.now();
  if (now - lastTap < 320) {
    lastTap = 0;
    const p = S.pins.find(x => x.id === box.dataset.dbl);
    if (!p) return;
    heartBurst(box);
    if (!p.liked) { p.liked = true; savePin(p); const b = $('[data-act="like"]'); if (b) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); } }
  } else lastTap = now;
});

/* ---------- your photo of a finished project ---------- */
let madeFor = null;
$('#madeFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  const p = madeFor && S.pins.find(x => x.id === madeFor);
  madeFor = null;
  if (!file || !p) return;
  try {
    const ph = await shrink(file);
    const key = p.id + ':m' + Date.now().toString(36);
    await DB.put('photos', ph.blob, key);
    p.madePhotos = (p.madePhotos || []).concat(key);
    if (p.status !== 'made') { p.status = 'made'; p.madeAt = Date.now(); }
    await savePin(p);
    renderRoute(true);
    toast('Added to your Made it photos', 'See them', () => { S.studioTab = 'made'; go({ v: 'studio' }); });
  } catch (err) { toast('Couldn’t use that picture. Try another one.'); }
});

/* ---------- taps ---------- */
async function setStatus(p, s) {
  const was = p.status;
  p.status = s;
  if (s === 'made' && was !== 'made') p.madeAt = Date.now();
  if (s === 'making' && was !== 'making') p.makingAt = Date.now();
  await savePin(p);
  if (s === 'made' && was !== 'made') { confetti(); toast('You made it! Add a photo of yours?', 'Add photo', () => { madeFor = p.id; $('#madeFile').click(); }); }
  else if (s === 'making' && was !== 'making') toast('On your Making list', S.route.v === 'pin' ? null : 'Open', () => go({ v: 'pin', id: p.id, from: from() }));
}
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, id = el.dataset.id, k = el.dataset.k;
  const pin = id ? S.pins.find(p => p.id === id) : null;
  const it = k ? S.web.get(k) : null;
  const inSheet = !!el.closest('#sheet');
  const thenClose = fn => { if (inSheet && el.dataset.close) closeSheet(fn); else fn(); };
  if (/^(m-|ms-|mset-|v-|open-video)/.test(a)) { await musicTap(a, el, inSheet); return; }
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  switch (a) {
    case 'tab': thenClose(() => goTab(el.dataset.tab)); break;
    case 'home-filter': S.homeFilter = el.dataset.f; renderRoute(true); break;
    case 'search-go': go({ v: 'explore' }, TABS.includes(S.route.v)); setTimeout(() => $('#q') && $('#q').focus(), 60); break;
    case 'add': thenClose(() => openSave({})); break;
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt.userChoice.finally(() => { S.installEvt = null; renderRoute(true); }); } break;
    case 'open-pin': if (pin && pin.type === 'music') { e.preventDefault(); const go2 = () => { if (pin.kind === 'song') { const s = SONGS.find(x => songKey(x) === akey(pin.title + ' ' + pin.artist)); if (s) songSheet(s); else window.open(pin.url, '_blank', 'noopener'); } else go({ v: 'video', pin: pin.id, k: pin.videoId, from: from() }); }; if (inSheet) closeSheet(go2); else go2(); break; }
      if (pin) { e.preventDefault(); const go2 = () => go({ v: 'pin', id: pin.id, from: from() }); if (inSheet) closeSheet(go2); else go2(); } break;
    case 'open-idea': if (it) { S.taste.views[it.type + ':' + it.category] = (S.taste.views[it.type + ':' + it.category] || 0) + 1; saveTaste(); go({ v: 'idea', k: it.key, item: it, from: from() }); } break;
    case 'holiday': thenClose(() => go({ v: 'holiday', k: el.dataset.k, from: from() })); break;
    case 'holidays-all': allHolidaysSheet(); break;
    case 'all-kinds': S.allKinds = !S.allKinds; renderRoute(true); break;
    case 'creator': go({ v: 'creator', k: el.dataset.k, from: from() }); break;
    case 'board': thenClose(() => go({ v: 'board', key: el.dataset.key, from: from() })); break;
    case 'board-sort': S.boardSort = el.dataset.s; renderRoute(true); break;
    case 'supplies': { const r = { v: 'supplies', tab: el.dataset.tab || 'have', from: from() }; thenClose(() => { if (el.dataset.replace) { history.replaceState(r, ''); S.route = r; renderRoute(); } else go(r); }); } break;
    case 'studio-tab': S.studioTab = el.dataset.t; renderRoute(true); break;
    case 'pin-menu': if (pin) pinMenu(pin); break;
    case 'idea-menu': if (it) ideaMenu(it); break;
    case 'save-idea': if (it) thenClose(() => saveIdea(it)); break;
    case 'not-for-me': if (it) thenClose(() => notForMe(it)); break;
    case 'visit': if (it) thenClose(() => window.open(it.url, '_blank', 'noopener')); break;
    case 'share-idea': if (it) sharePin(it.title, it.url); break;
    case 'back': history.length > 1 ? history.back() : go({ v: 'home' }, true); break;
    case 'like': if (pin) { pin.liked = !pin.liked; await savePin(pin); if (pin.type === 'music' && pin.liked) mEvent('like', { insts: pin.insts || [pin.category], genres: pin.genres, artist: pin.artist, channel: pin.kind === 'video' ? pin.author : '' }, 3); if (pin.liked && S.route.v === 'pin') heartBurst($('#cumedia')); if (S.route.v === 'pin' && !inSheet) { el.classList.toggle('on', pin.liked); el.setAttribute('aria-pressed', String(pin.liked)); } else thenClose(() => renderRoute(true)); if (pin.liked) toast('Added to favorites'); } break;
    case 'pin-mstatus': if (pin) { const st = el.dataset.s; pin.mstatus = st; await savePin(pin); mEvent('status', { insts: pin.insts || [pin.category], genres: pin.genres, artist: pin.artist, channel: pin.kind === 'video' ? pin.author : '' }, STATUS_W[st]); thenClose(() => renderRoute(true)); if (st === 'learned') { confetti(); toast('Nice! Another one learned.'); } } break;
    case 'status': if (pin) { const s = el.dataset.s; await setStatus(pin, s); if (S.route.v === 'pin' && !inSheet) { for (const b of $$('.seg3 [data-act="status"]')) b.setAttribute('aria-pressed', String(b.dataset.s === s)); refreshSupCard(pin); if (s === 'made') renderRoute(true); } else thenClose(() => renderRoute(true)); } break;
    case 'memo-make': if (pin) { await setStatus(pin, 'making'); renderRoute(true); } break;
    case 'memo-later': if (pin) { S.memo.snooze[pin.id] = Date.now() + 7 * 864e5; kvSet('memo', S.memo); renderRoute(true); } break;
    case 'move': if (pin) { pin.type = pin.type === 'craft' ? 'painting' : 'craft'; const s = Cats.sortPost({ title: pin.title, caption: pin.caption, url: pin.url }); pin.category = s[pin.type] || 'other'; if (!pin.needsEdited) pin.needs = null; await savePin(pin); thenClose(() => renderRoute(true)); toast('Moved to ' + (pin.type === 'craft' ? 'Crafts' : 'Painting') + ' · ' + Cats.catLabel(pin.type, pin.category), 'Change', () => openEdit(pin)); } break;
    case 'edit': if (pin) openEdit(pin); break;
    case 'delete': if (pin) {
      if (el.dataset.arm) { await deletePin(pin); closeSheet(() => { if (S.route.v === 'pin') history.back(); else renderRoute(true); }); }
      else { el.dataset.arm = '1'; el.lastChild.textContent = 'Tap again to delete'; }
    } break;
    case 'share': if (pin) thenClose(() => sharePin(pin.title, pin.url || pin.link)); break;
    case 'open': if (pin) { pin.opens = (pin.opens || 0) + 1; pin.lastOpened = Date.now(); savePin(pin); } break;
    case 'play': if (pin) { const em = embedOf(pin); const box = $('#cumedia'); if (em && box) { const w = box.clientWidth; box.innerHTML = `<div class="float"><button class="round" data-act="back" aria-label="Back">${I(IC.back)}</button></div><iframe src="${esc(em.src)}" style="height:${Math.round(Math.min(w * em.ar, window.innerHeight * 0.8))}px" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(pin.title)}"></iframe>`; box.removeAttribute('data-dbl'); pin.opens = (pin.opens || 0) + 1; pin.lastOpened = Date.now(); savePin(pin); } } break;
    case 'cap-more': { const c = $('#cap'); if (c) { c.classList.toggle('clip'); el.textContent = c.classList.contains('clip') ? 'More' : 'Less'; } } break;
    case 'tag': go({ v: 'explore', from: from() }); $('#q') && ($('#q').value = el.dataset.t); runSearch(el.dataset.t); break;
    case 'topic': S.ideas.topic = el.dataset.t; S.ideas.items = []; S.ideas.sig = ''; S.ideas.error = ''; S.ideas.page = 1; renderRoute(true); loadIdeas(true); break;
    case 'ideas-more': loadIdeas(false, true); break;
    case 'ideas-retry': loadIdeas(true); break;
    case 'topic-tile': { const t = el.dataset.type, c = el.dataset.c; if (S.pins.some(p => p.type === t && p.category === c)) go({ v: 'board', key: 'cat:' + t + ':' + c, from: from() }); else { S.ideas.topic = 'cat:' + t + ':' + c; S.ideas.items = []; S.ideas.sig = ''; renderRoute(true); loadIdeas(true); const sec = $$('h2.sect').find(x => /Ideas for you/.test(x.textContent)); if (sec) sec.scrollIntoView({ behavior: 'smooth' }); } } break;
    case 'unavoid': if (el.dataset.k === 'tag') delete S.taste.avoidTags[el.dataset.v]; else delete S.taste.avoidCats[el.dataset.v]; saveTaste(); renderRoute(true); break;
    // supplies
    case 'sup-tog': if (pin) {
      const sid = el.dataset.sid, nm = el.dataset.name;
      const on = el.getAttribute('aria-pressed') !== 'true';
      if (sid) toggleHave(sid, on);
      else if (on) addStash(nm);
      else { S.stash.custom = S.stash.custom.filter(x => x.toLowerCase() !== nm.toLowerCase()); saveStash(); }
      refreshSupCard(pin);
      const r = supFor(pin);
      if (on && r && r.ready) { toast('You have everything for this one!'); try { navigator.vibrate && navigator.vibrate(15); } catch (er) {} }
    } break;
    case 'sup-edit': if (pin) supEditSheet(pin); break;
    case 'need-del': if (pin) { const n = needsOf(pin).slice(); n.splice(+el.dataset.i, 1); pin.needs = n; pin.needsEdited = true; await savePin(pin); supEditSheet(pin); refreshSupCard(pin); } break;
    case 'need-add': if (pin) { const v = ($('#needIn') || {}).value || ''; if (v.trim()) { const s = Sup.lookup(v); const n = needsOf(pin).slice(); if (!(s && n.some(x => x.id === s.id))) n.push({ id: s ? s.id : null, name: s ? s.name : v.trim(), line: v.trim(), g: s ? s.g : 'basics', from: 'list', basic: !!(s && s.basic) }); pin.needs = n; pin.needsEdited = true; await savePin(pin); supEditSheet(pin); refreshSupCard(pin); setTimeout(() => $('#needIn') && $('#needIn').focus(), 50); } } break;
    case 'need-reset': if (pin) { pin.needs = null; pin.needsEdited = false; needsOf(pin); await savePin(pin); supEditSheet(pin); refreshSupCard(pin); } break;
    case 'shop-add': if (pin) { const n = addToShop(pin); thenClose(() => {}); toast(n ? plural(n, 'supply', 'supplies') + ' on your shopping list' : 'Already on your list', 'See list', () => go({ v: 'supplies', tab: 'list', from: from() })); if (S.route.v === 'home') renderRoute(true); } break;
    case 'stash-tog': { const sid = el.dataset.sid; toggleHave(sid); if ($('#supIn')) { $('#supIn').value = ''; } renderRoute(true); } break;
    case 'stash-add': { const inp = $('#supIn'); const nm = addStash(inp && inp.value); if (nm) toast('Added ' + nm); renderRoute(true); setTimeout(() => $('#supIn') && $('#supIn').focus(), 50); } break;
    case 'stash-del': S.stash.custom = S.stash.custom.filter(x => x !== el.dataset.name); saveStash(); renderRoute(true); break;
    case 'basics': S.stash.basics = !(S.stash.basics !== false); saveStash(); renderRoute(true); break;
    case 'shop-tick': { const x = S.shop.find(i => i.k === el.dataset.k); if (x) { x.done = !x.done; saveShop(); renderRoute(true); } } break;
    case 'shop-del': S.shop = S.shop.filter(i => i.k !== el.dataset.k); saveShop(); renderRoute(true); break;
    case 'shop-bought': { const done = S.shop.filter(i => i.done); if (!done.length) { toast('Check off what you bought first.'); break; } for (const x of done) { if (x.sid) toggleHave(x.sid, true); else addStash(x.name); } S.shop = S.shop.filter(i => !i.done); saveShop(); renderRoute(true); toast(plural(done.length, 'supply', 'supplies') + ' added to what you have'); } break;
    case 'shop-share': { const txt = shopText(); if (navigator.share) navigator.share({ title: 'Shopping list', text: txt }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('List copied')); } break;
    case 'shop-clear': S.shop = S.shop.filter(i => !i.done); saveShop(); renderRoute(true); break;
    case 'made-photo': if (pin) { madeFor = pin.id; $('#madeFile').click(); } break;
    // studio and settings
    case 'edit-name': nameSheet(); break;
    case 'name-save': { S.profile.name = (($('#nmIn') || {}).value || '').trim().slice(0, 30); saveProfile(); closeSheet(() => renderRoute(true)); } break;
    case 'welcome-name': { const v = (($('#wName') || {}).value || '').trim().slice(0, 30); if (v) { S.profile.name = v; saveProfile(); renderRoute(true); toast('Hi ' + v + '!'); } else $('#wName') && $('#wName').focus(); } break;
    case 'backup': backup(); break;
    case 'restore': $('#restoreFile').click(); break;
    case 'share-app': shareApp(); break;
    case 'ver': { const now = Date.now(); verTaps = verTaps.filter(t => now - t < 3000).concat(now); if (verTaps.length >= 5) { verTaps = []; setOwner(!S.owner); } } break;
    case 'close-sheet': closeSheet(); break;
    // the Save sheet
    case 'f-type': if (F) { F.type = el.dataset.t; F.touched = true; if (F.type === 'music') { const mg = musicGuess(); F.category = mg.md.inst.find(i => MS.prefs.insts.includes(i)) || mg.md.inst[0] || MS.prefs.insts[0]; if (!F.genres.length) F.genres = mg.md.genres.slice(0, 3); F.artist = F.artist || mg.md.artist; F.song = F.song || mg.md.song; } else { const g = Cats.sortPost({ title: F.title, caption: F.caption + '\n' + F.shareText, url: F.url }); F.category = g[F.type] || 'other'; } renderSave(); } break;
    case 'f-genre': if (F) { const g = el.dataset.g; F.genres = F.genres.includes(g) ? F.genres.filter(x => x !== g) : F.genres.concat(g); renderSave(); } break;
    case 'f-cat': if (F) { F.category = el.dataset.c; F.touched = true; renderSave(); } break;
    case 'f-allcats': if (F) { F.allCats = true; renderSave(); } break;
    case 'f-hol': if (F) { const h = el.dataset.h; F.holidays = F.holidays.includes(h) ? F.holidays.filter(x => x !== h) : F.holidays.concat(h); F.holTouched = true; renderSave(); } break;
    case 'f-tag': if (F) { F.tags.push(el.dataset.t); F.suggested = F.suggested.filter(t => t !== el.dataset.t); renderSave(); } break;
    case 'f-untag': if (F) { F.tags = F.tags.filter(t => t !== el.dataset.t); renderSave(); } break;
    case 'f-save': saveForm(); break;
    case 'f-delete': if (F) {
      if (!F.delArm) { F.delArm = 1; renderSave(); }
      else { const p = S.pins.find(x => x.id === F.id); if (p) await deletePin(p); closeSheet(() => { if (S.route.v === 'pin') history.back(); else renderRoute(true); }); }
    } break;
  }
});
for (const b of $$('#nav button')) b.addEventListener('click', () => { if (!$('#sheetwrap').hidden) closeSheet(() => goTab(b.dataset.tab)); else goTab(b.dataset.tab); });
document.addEventListener('input', e => {
  if (e.target.id === 'q') runSearch(e.target.value);
  else if (e.target.id === 'supIn') supSuggest(e.target.value);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const map = { supIn: 'stash-add', wName: 'welcome-name', nmIn: 'name-save', needIn: 'need-add' };
  const act = map[e.target.id];
  if (!act) return;
  e.preventDefault();
  const btn = $(`[data-act="${act}"]`);
  if (btn) btn.click();
});
async function deletePin(p) {
  S.pins = S.pins.filter(x => x.id !== p.id);
  await DB.del('pins', p.id).catch(() => {});
  await DB.del('photos', p.id).catch(() => {});
  for (const k of p.madePhotos || []) await DB.del('photos', k).catch(() => {});
  for (const x of S.shop) x.pins = (x.pins || []).filter(i => i !== p.id);
  saveShop();
  toast('Idea deleted');
}

/* ---------- Learn music ---------- */
const M = window.Music;
const DAY = 864e5, HALF = 14 * DAY;
const MS = {
  prefs: { insts: M.DEFAULT_INST.slice(), genres: M.DEFAULT_GENRES.slice(), level: 'beginner' },
  events: [], dismissed: new Set(), dismissedSongs: new Set(),
  inst: 'all', genre: 'all', songsShown: 8, picksShown: 12,
  feed: { items: [], at: 0, loading: false, error: '', sig: '', needsKey: false },
  picks: { items: [], at: 0, loading: false, sig: '' },
  full: false,
  q: '', search: { items: [], loading: false, error: '', needsKey: false },
  vids: new Map(), more: new Map()
};
const GENRE_Q = { alternative: 'alternative', rock: 'rock', classical: 'classical', pop: 'pop', rap: 'rap', classicrock: 'classic rock', oldies: 'oldies', motown: 'motown', country: 'country', bluegrass: 'bluegrass', blues: 'blues', jazz: 'jazz', folk: 'folk', gospel: 'gospel', latin: 'latin', movie: 'movie theme', holiday: 'christmas' };
const LEVELS = [['beginner', 'Beginner'], ['some', 'Some experience'], ['any', 'Any level']];
const RESOURCES = [
  { name: 'JustinGuitar', url: 'https://www.justinguitar.com/', inst: ['guitar', 'ukulele'], d: 'Free step-by-step guitar and ukulele courses, plus song lessons.' },
  { name: 'Ultimate Guitar', url: 'https://www.ultimate-guitar.com/', inst: ['guitar', 'ukulele', 'banjo', 'bass', 'mandolin'], d: 'Chords and tabs for most songs. Free with ads; some extras cost money.' },
  { name: 'Songsterr', url: 'https://www.songsterr.com/', inst: ['guitar', 'bass', 'drums'], d: 'Tabs that play along, including drum parts. Free with limits.' },
  { name: 'MuseScore', url: 'https://musescore.com/', inst: ['piano', 'trumpet', 'violin', 'guitar'], d: 'Sheet music shared by players. Free to view; some downloads need a paid plan.' },
  { name: 'IMSLP', url: 'https://imslp.org/', inst: ['piano', 'trumpet', 'violin', 'guitar'], d: 'Free library of public-domain classical sheet music.' },
  { name: 'Banjo Ben Clark', url: 'https://www.youtube.com/channel/UCIDxRRdowWusv8-IO0lpVfg', inst: ['banjo', 'guitar'], d: 'Free bluegrass banjo and guitar lessons on YouTube.' }
];
function saveMusic() { kvSet('music', { prefs: MS.prefs, events: MS.events.slice(-500), dismissed: Array.from(MS.dismissed).slice(-500), dismissedSongs: Array.from(MS.dismissedSongs) }); }
const akey = a => String(a || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const instWord = i => (M.instLabel(i) || '').split(' ')[0].toLowerCase();
const herInst = () => MS.inst !== 'all' ? [MS.inst] : MS.prefs.insts;
const lvLabel = l => l === 'easy' ? 'Easy' : l === 'medium' ? 'Medium' : l === 'hard' ? 'Harder' : '';
function fmtDur(s) { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
function hash(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function ytIdOf(u) { const m = String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{6,})/); return m ? m[1] : ''; }

// What she's into: everything she does adds weight; the last two weeks count the most.
function mEvent(k, f, w) {
  f = f || {};
  MS.events.push({ t: Date.now(), k, i: (f.insts || f.inst || []).slice(0, 3), g: (f.genres || []).slice(0, 3), a: akey(f.artist), c: f.channel || '', w });
  if (MS.events.length > 500) MS.events.splice(0, MS.events.length - 500);
  saveMusic();
}
function mProfile() {
  const P = { inst: {}, genre: {}, artist: {}, channel: {}, rec: { inst: {}, genre: {}, artist: {} } };
  for (const i of MS.prefs.insts) P.inst[i] = 1;
  for (const g of MS.prefs.genres) P.genre[g] = 1;
  const now = Date.now();
  for (const e of MS.events) {
    const age = now - e.t, w = e.w * Math.pow(0.5, age / HALF);
    for (const i of e.i) P.inst[i] = (P.inst[i] || 0) + w;
    for (const g of e.g) P.genre[g] = (P.genre[g] || 0) + w;
    if (e.a) P.artist[e.a] = (P.artist[e.a] || 0) + w;
    if (e.c) P.channel[e.c] = (P.channel[e.c] || 0) + w * 0.6;
    if (age < 21 * DAY && e.w > 0) {
      for (const i of e.i) P.rec.inst[i] = (P.rec.inst[i] || 0) + e.w;
      for (const g of e.g) P.rec.genre[g] = (P.rec.genre[g] || 0) + e.w;
      if (e.a) P.rec.artist[e.a] = (P.rec.artist[e.a] || 0) + e.w;
    }
  }
  return P;
}
const topOf = (o, min) => Object.entries(o).filter(([, w]) => w >= (min || 0.01)).sort((a, b) => b[1] - a[1]).map(([k]) => k);
function lately(P) {
  const out = [], i = topOf(P.rec.inst, 2)[0], g = topOf(P.rec.genre, 2)[0], a = topOf(P.rec.artist, 2)[0];
  if (i) out.push(M.instLabel(i));
  if (g) out.push(M.genreLabel(g));
  if (a) out.push(titleCase(a));
  return out;
}
function annot(v) {
  if (!v.d) {
    v.d = M.detect(v.title + ' ' + (v.desc || '').slice(0, 160));
    v.insts = v.d.inst.length ? v.d.inst : (v.inst || []);
    v.genres = v.d.genres; v.artist = v.d.artist; v.song = v.d.song;
  }
  return v;
}
function fitsInst(v) { annot(v); const want = herInst(); return v.insts.some(i => want.includes(i)); }
const savedVid = id => S.pins.find(p => p.type === 'music' && p.videoId === id);
function mScore(v, P) {
  annot(v);
  let s = 1.3 * Math.max(0, ...v.insts.map(i => P.inst[i] || 0));
  for (const g of v.genres) s += P.genre[g] || 0;
  if (v.artist) s += 1.5 * (P.artist[akey(v.artist)] || 0);
  s += P.channel[v.channel] || 0;
  if (MS.prefs.level === 'beginner') s += v.d.level === 'easy' ? 0.8 : v.d.level === 'harder' ? -1 : 0;
  if (v.short) s -= 0.7;
  if ((Date.now() - Date.parse(v.published || 0)) / DAY < 45) s += 0.4;
  return s;
}
function mWhy(v, P) {
  annot(v);
  const rg = v.genres.find(g => (P.rec.genre[g] || 0) >= 2);
  if (rg) return 'You’re into ' + M.genreLabel(rg) + ' lately';
  if (v.artist && (P.artist[akey(v.artist)] || 0) >= 1.5) return 'You like ' + v.artist;
  const ri = v.insts.find(i => (P.rec.inst[i] || 0) >= 2);
  if (ri) return 'You’ve been playing ' + M.instLabel(ri).toLowerCase() + ' lately';
  const fg = v.genres.find(g => MS.prefs.genres.includes(g));
  if (fg) return 'One of your genres: ' + M.genreLabel(fg);
  if (v.d.level === 'easy') return 'Good for beginners';
  return '';
}
function candidateVideos(P) {
  const seen = new Set(), out = [];
  for (const v of MS.picks.items.concat(MS.feed.items)) {
    if (!v || seen.has(v.id) || MS.dismissed.has(v.id) || savedVid(v.id)) continue;
    seen.add(v.id);
    if (fitsInst(v)) out.push(v);
  }
  out.sort((a, b) => mScore(b, P) - mScore(a, P));
  // no more than two in a row from one teacher
  const res = [], per = {}, rest = [];
  for (const v of out) { if ((per[v.channel] || 0) < 2 || res.length >= 12) { res.push(v); per[v.channel] = (per[v.channel] || 0) + 1; } else rest.push(v); }
  return res.slice(0, 12).concat(rest, res.slice(12));
}

// Songs to learn (from crafts/music.js), ranked by her genres, artists and instruments
const songKey = s => akey(s.t + ' ' + s.a);
const SONGS = M.SONGS.map((s, i) => Object.assign({ i }, s));
const savedSong = s => S.pins.find(p => p.type === 'music' && p.kind === 'song' && akey(p.title + ' ' + p.artist) === songKey(s));
function songScore(s, P) {
  let x = 0;
  for (const g of s.g) x += P.genre[g] || 0;
  x += 1.5 * (P.artist[akey(s.a)] || 0);
  const fit = s.fit.filter(i => herInst().includes(i));
  x += fit.length ? 1 + 0.6 * Math.max(...fit.map(i => P.inst[i] || 0)) : -3;
  if (MS.prefs.level === 'beginner') x += s.lv === 'easy' ? 0.8 : s.lv === 'hard' ? -1.2 : 0;
  x += (hash(songKey(s) + new Date().toDateString()) % 100) / 250; // a little variety from day to day
  return x;
}
function songList(P) {
  return SONGS.filter(s => !MS.dismissedSongs.has(songKey(s)) && (MS.genre === 'all' || s.g.includes(MS.genre)) && s.fit.some(x => herInst().includes(x)))
    .map(s => ({ s, x: songScore(s, P) })).sort((a, b) => b.x - a.x).map(o => o.s);
}
function songWhy(s, P) {
  const rg = s.g.find(g => (P.rec.genre[g] || 0) >= 2);
  if (rg) return 'You’re into ' + M.genreLabel(rg) + ' lately';
  if ((P.artist[akey(s.a)] || 0) >= 1.5) return 'You like ' + s.a;
  const ri = s.fit.find(i => herInst().includes(i) && (P.rec.inst[i] || 0) >= 2);
  if (ri) return 'Great on ' + M.instLabel(ri).toLowerCase();
  return '';
}
function bestInst(s, P) {
  const want = herInst(), fit = s.fit.filter(i => want.includes(i));
  if (MS.inst !== 'all' && want.includes(MS.inst)) return MS.inst;
  return (fit.length ? fit : want).slice().sort((a, b) => (P.inst[b] || 0) - (P.inst[a] || 0))[0];
}

// lessons from the server
function refreshMusic() { if (S.route.v === 'music') renderRoute(true); }
async function loadMusicFeed(force) {
  const sig = MS.prefs.insts.slice().sort().join(',');
  if (MS.feed.loading) return;
  if (!force && MS.feed.sig === sig && Date.now() - MS.feed.at < 3 * 3600e3) return;
  if (!force) {
    const c = await kvGet('mfeed').catch(() => null);
    if (c && c.sig === sig && Date.now() - c.at < 3 * 3600e3) { Object.assign(MS.feed, { items: c.items || [], at: c.at, sig, needsKey: !!c.needsKey, error: '' }); MS.full = !!c.full; refreshMusic(); if (MS.full) loadMusicPicks(false); return; }
  }
  MS.feed.sig = sig; MS.feed.at = Date.now();
  if (!navigator.onLine) { MS.feed.error = 'offline'; refreshMusic(); return; }
  MS.feed.loading = true;
  refreshMusic();
  try {
    const j = await getJSON(API + '/api/music?inst=' + enc(sig) + '&n=200', 30000);
    if (j && j.ok) { MS.feed.items = j.items || []; MS.full = !!j.fullSearch; MS.feed.needsKey = !!j.needsKey; MS.feed.error = ''; }
    else MS.feed.error = (j && j.error) || 'error';
  } catch (e) { MS.feed.error = 'error'; }
  MS.feed.loading = false;
  if (!MS.feed.error) kvSet('mfeed', { items: MS.feed.items, at: MS.feed.at, sig, full: MS.full, needsKey: MS.feed.needsKey });
  refreshMusic();
  if (MS.full) loadMusicPicks(false);
}
function pickQueries(P) {
  const insts = herInst().slice().sort((a, b) => (P.inst[b] || 0) - (P.inst[a] || 0));
  const qs = [], i1 = insts[0], i2 = insts[1];
  const genres = topOf(P.genre).filter(g => GENRE_Q[g]);
  if (genres[0]) qs.push(GENRE_Q[genres[0]] + ' songs ' + instWord(i1) + ' tutorial' + (MS.prefs.level === 'beginner' ? ' easy' : ''));
  const a = topOf(P.artist, 1)[0];
  if (a) qs.push(a + ' ' + instWord(i1) + ' tutorial');
  const learning = S.pins.find(p => p.type === 'music' && p.mstatus === 'learning' && (p.song || p.kind === 'song'));
  if (learning) qs.push((learning.song || learning.title) + ' ' + (learning.artist || '') + ' ' + instWord(learning.category) + ' lesson');
  const s = songList(P)[0];
  if (s) qs.push(s.t + ' ' + (s.a === 'Traditional' || s.a === 'Anonymous' ? '' : s.a) + ' ' + instWord(bestInst(s, P)) + ' tutorial');
  if (i2 && genres[1]) qs.push(GENRE_Q[genres[1]] + ' ' + instWord(i2) + ' lesson beginner');
  return Array.from(new Set(qs.map(q => q.replace(/\s+/g, ' ').trim()))).slice(0, 4);
}
async function loadMusicPicks(force) {
  if (!MS.full || MS.picks.loading) return;
  const qs = pickQueries(mProfile());
  const sig = JSON.stringify(qs);
  // each search uses 100 of the free 10,000 daily YouTube units, so picks refresh at most every 30 minutes (6 hours if nothing changed)
  const fresh = (at, same) => Date.now() - at < (same ? 6 * 3600e3 : 30 * 60e3);
  if (!force && MS.picks.items.length && fresh(MS.picks.at, MS.picks.sig === sig)) return;
  if (!force && !MS.picks.items.length) {
    const c = await kvGet('mpicks').catch(() => null);
    if (c && c.items && c.items.length && fresh(c.at, c.sig === sig)) { Object.assign(MS.picks, { items: c.items, at: c.at, sig: c.sig }); refreshMusic(); return; }
  }
  MS.picks.loading = true; MS.picks.sig = sig; MS.picks.at = Date.now();
  const lists = await Promise.all(qs.map(q => getJSON(API + '/api/music?op=search&n=10&q=' + enc(q), 30000).then(j => (j && j.items) || []).catch(() => [])));
  const items = [].concat(...lists);
  MS.picks.loading = false;
  if (items.length) { MS.picks.items = items; kvSet('mpicks', { items, at: MS.picks.at, sig }); }
  refreshMusic();
}
let mT = 0, mN = 0;
function musicSearch(q, now) {
  MS.q = q;
  clearTimeout(mT);
  const box = $('#mres');
  const paint = () => { const b = $('#mres'); if (b && S.route.v === 'music') { b.innerHTML = MS.q.trim() ? musicResults() : musicHome(mProfile()); hydrate(b); } };
  if (!q.trim() || (q.trim().length < 3 && !now)) { MS.search.items = []; MS.search.loading = false; MS.search.error = ''; MS.search.needsKey = false; mN++; paint(); return; }
  MS.search.loading = true; MS.search.error = '';
  if (box) paint();
  const my = ++mN;
  mT = setTimeout(async () => {
    let qq = q.trim();
    const d = M.detect(qq);
    if (!d.inst.length && MS.inst !== 'all') qq += ' ' + instWord(MS.inst);
    if (!/tutorial|lesson|how to|chords|tabs/i.test(qq)) qq += ' tutorial';
    mEvent('search', { insts: d.inst.length ? d.inst : (MS.inst !== 'all' ? [MS.inst] : []), genres: d.genres, artist: d.artist }, 1);
    let items = [], needsKey = false, err = '';
    try {
      const j = await getJSON(API + '/api/music?op=search&n=16&q=' + enc(qq), 30000);
      if (j && j.ok) { items = j.items || []; needsKey = !!j.needsKey; MS.full = !!j.fullSearch; } else err = (j && j.error) || 'Couldn’t search right now.';
    } catch (e) { err = navigator.onLine ? 'Couldn’t search right now.' : 'You’re offline. Searching needs the internet.'; }
    if (my !== mN) return;
    Object.assign(MS.search, { items, needsKey, error: err, loading: false });
    paint();
  }, now ? 0 : 1100);
}

// cards and rows
function vcard(v, mode, why) {
  annot(v);
  MS.vids.set(v.id, v);
  const saved = savedVid(v.id);
  return `<div class="vcard${mode === 'h' ? ' h' : ''}" data-act="open-video" data-k="${esc(v.id)}">
    <div class="vthumb">${v.photoId || (saved && saved.photo) ? `<img data-photo="${esc(v.photoId || saved.id)}" data-orig="${esc(v.thumb)}" alt="">` : `<img src="${esc(v.thumb)}" loading="lazy" referrerpolicy="no-referrer" alt="">`}${v.dur ? `<span class="vdur">${fmtDur(v.dur)}</span>` : v.short ? '<span class="vdur">Short</span>' : ''}${saved && saved.practiced && v.dur ? `<span class="vprog"><i style="width:${Math.min(100, Math.round(saved.practiced / v.dur * 100))}%"></i></span>` : ''}${saved ? `<span class="vsaved">${saved.mstatus === 'learned' ? 'Learned' : saved.mstatus === 'learning' ? 'Learning' : 'Saved'}</span>` : ''}</div>
    <div class="vtitle">${esc(v.title)}</div>
    <div class="vsub">${esc(v.channel)}${v.insts[0] ? ' · ' + esc(M.instLabel(v.insts[0])) : ''}</div>
    ${why ? `<div class="vwhy">${esc(why)}</div>` : ''}
  </div>`;
}
function pinVid(p) {
  return { id: p.videoId, title: p.title, channel: p.author || '', url: p.url, thumb: p.imageUrl || ('https://i.ytimg.com/vi/' + p.videoId + '/hqdefault.jpg'), short: !!p.short, dur: p.dur || 0, published: '', desc: p.caption || '', inst: p.insts || [p.category], pinId: p.id, photoId: p.photo ? p.id : '' };
}
function songRow(s, P) {
  const saved = savedSong(s), why = songWhy(s, P);
  return `<div class="songrow" data-act="m-song" data-s="${s.i}">
    <div class="sbadge g-${esc(s.g[0])}">${I(IC.note)}</div>
    <div class="stext"><b>${esc(s.t)}</b><small>${esc(s.a)} · ${esc(M.genreLabel(s.g[0]))} · ${lvLabel(s.lv)}</small>${why ? `<em>${esc(why)}</em>` : ''}</div>
    <button class="sadd${saved ? ' on' : ''}" data-act="m-song-add" data-s="${s.i}" aria-label="${saved ? 'On your list' : 'Add to my songs'}">${I(saved ? IC.check : IC.plus)}</button>
  </div>`;
}
function songTile(p) {
  return `<div class="vcard h" data-act="open-pin" data-id="${esc(p.id)}">
    <div class="vthumb stile g-${esc((p.genres || ['other'])[0])}">${I(IC.note)}<span>${esc(p.title)}</span>${p.mstatus === 'learning' ? '<span class="vsaved">Learning</span>' : ''}</div>
    <div class="vtitle">${esc(p.title)}</div><div class="vsub">${esc(p.artist || '')}${p.category ? ' · ' + esc(M.instLabel(p.category)) : ''}</div>
  </div>`;
}
function vskel(n) { return `<div class="vgrid">${Array.from({ length: n || 4 }, () => '<div><div class="vthumb skel"></div><div class="skel" style="height:12px;margin-top:8px;border-radius:6px"></div></div>').join('')}</div>`; }
function teachersBlock(P) {
  const want = herInst();
  const list = M.TEACHERS.filter(t => t.inst.some(i => want.includes(i))).sort((a, b) => Math.max(...b.inst.map(i => P.inst[i] || 0)) - Math.max(...a.inst.map(i => P.inst[i] || 0)) || (P.channel[b.name] || 0) - (P.channel[a.name] || 0));
  if (!list.length) return '';
  return `<h2 class="sect">Free teachers on YouTube</h2><div class="hscroll">${list.map(t => `<a class="tch" href="https://www.youtube.com/channel/${esc(t.id)}" target="_blank" rel="noopener" data-act="m-teacher" data-n="${esc(t.name)}"><i>${esc(t.name.replace(/^The /, '').charAt(0))}</i><span><b>${esc(t.name)}</b><small>${esc(t.inst.map(M.instLabel).join(', '))}</small></span></a>`).join('')}</div>`;
}
function resourcesBlock() {
  const want = herInst();
  const list = RESOURCES.filter(r => r.inst.some(i => want.includes(i)));
  if (!list.length) return '';
  return `<h2 class="sect">Free places to learn</h2><div class="res">${list.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b><small>${esc(r.d)}</small></a>`).join('')}</div>`;
}
function keyNote() {
  return `<div class="note"><b>Want lesson videos right on this page?</b> It takes a free YouTube key, set up once on the app’s server. Until then, tap a song for lessons on YouTube, or share a lesson from the YouTube app to Artistry and it lands here.</div>`;
}

// the Music tab
function vMusic() {
  const P = mProfile(), late = lately(P);
  return `<div class="top">
    <div class="mu-head"><div><h1>Learn music</h1><p>${late.length ? 'Lately you’re into <b>' + late.map(esc).join('</b> · <b>') + '</b>' : 'Songs to learn and free lessons, picked for you'}</p></div>
      <button class="iconbtn" data-act="m-settings" aria-label="Your instruments and genres">${I(IC.sliders)}</button></div>
    <label class="searchbar" for="mq">${I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}<input id="mq" type="search" enterkeyhint="search" placeholder="Search a song, artist or skill" value="${esc(MS.q)}" autocomplete="off"></label>
    <div class="chips" style="margin-top:6px">${[['all', 'All']].concat(MS.prefs.insts.map(i => [i, M.instLabel(i)])).map(([k, l]) => `<button class="chip" data-act="m-inst" data-i="${k}" aria-pressed="${MS.inst === k}">${esc(l)}</button>`).join('')}</div>
  </div>
  <div id="mres">${MS.q.trim() ? musicResults() : musicHome(P)}</div>`;
}
function musicHome(P) {
  let h = '';
  const mine = S.pins.filter(p => p.type === 'music' && p.mstatus !== 'learned' && (MS.inst === 'all' || (p.insts || [p.category]).includes(MS.inst)))
    .sort((a, b) => (b.mstatus === 'learning') - (a.mstatus === 'learning') || (b.lastOpened || b.createdAt) - (a.lastOpened || a.createdAt));
  if (mine.length) h += `<h2 class="sect">Keep practicing</h2><div class="hscroll">${mine.slice(0, 15).map(p => p.kind === 'song' ? songTile(p) : vcard(pinVid(p), 'h')).join('')}</div>`;
  const vids = candidateVideos(P);
  if (vids.length) {
    h += `<h2 class="sect">Picked for you</h2><div class="vgrid">${vids.slice(0, MS.picksShown).map(v => vcard(v, '', mWhy(v, P))).join('')}</div>`;
    if (vids.length > MS.picksShown) h += `<div class="center" style="margin:12px 0"><button class="btn gray sm" data-act="m-more-picks">More lessons</button></div>`;
  } else if (MS.feed.loading || MS.picks.loading) h += `<h2 class="sect">Picked for you</h2>` + vskel(4);
  const songs = songList(P);
  h += `<h2 class="sect">Songs to learn</h2><div class="chips">${[['all', 'All genres']].concat(MS.prefs.genres.map(g => [g, M.genreLabel(g)])).map(([k, l]) => `<button class="chip" data-act="m-genre" data-g="${k}" aria-pressed="${MS.genre === k}">${esc(l)}</button>`).join('')}</div>`;
  h += songs.length ? `<div class="slist">${songs.slice(0, MS.songsShown).map(s => songRow(s, P)).join('')}</div>` + (songs.length > MS.songsShown ? `<div class="center" style="margin:10px 0"><button class="btn gray sm" data-act="m-more-songs">More songs</button></div>` : '')
    : `<div class="note">No songs on the list for that mix yet. Try another genre, or search for any song above.</div>`;
  const fresh = MS.feed.items.map(annot).filter(v => fitsInst(v) && !MS.dismissed.has(v.id)).sort((a, b) => (b.published || '').localeCompare(a.published || '')).slice(0, 12);
  if (fresh.length) h += `<h2 class="sect">New from free teachers</h2><div class="hscroll">${fresh.map(v => vcard(v, 'h')).join('')}</div>`;
  h += teachersBlock(P);
  if (!MS.full && !MS.feed.loading) h += keyNote();
  h += resourcesBlock();
  return h;
}
function musicResults() {
  const q = MS.q.trim(), P = mProfile();
  const words = akey(q).split(' ').filter(w => w.length > 1);
  const songs = SONGS.filter(s => { const hay = akey(s.t + ' ' + s.a + ' ' + s.g.map(M.genreLabel).join(' ')); return words.length && words.every(w => hay.includes(w)); }).slice(0, 8);
  const mine = S.pins.filter(p => p.type === 'music' && words.length && words.every(w => akey(p.title + ' ' + (p.artist || '') + ' ' + (p.author || '')).includes(w)));
  const yt = 'https://www.youtube.com/results?search_query=' + enc(q + (/tutorial|lesson/i.test(q) ? '' : ' tutorial'));
  let h = `<h2 class="sect">Lessons for “${esc(q)}”</h2>`;
  if (MS.search.loading) h += vskel(4);
  else if (MS.search.error) h += `<div class="note">${esc(MS.search.error)}</div>`;
  else if (MS.search.items.length) h += `<div class="vgrid">${MS.search.items.filter(v => !MS.dismissed.has(v.id)).map(v => vcard(v, '', '')).join('')}</div>`;
  else if (q.length < 3) h += `<div class="note">Keep typing…</div>`;
  else if (MS.search.needsKey) h += `<div class="note">Lesson search inside the app turns on with the free YouTube key. For now, YouTube has plenty.</div>`;
  else h += `<div class="note">No lessons found for that. Try fewer words, or YouTube below.</div>`;
  h += `<div class="row" style="margin:12px 4px"><a class="btn coral" href="${esc(yt)}" target="_blank" rel="noopener">${I(IC.ext)}Search on YouTube</a></div>`;
  if (songs.length) h += `<h2 class="sect">Songs to learn</h2><div class="slist">${songs.map(s => songRow(s, P)).join('')}</div>`;
  if (mine.length) h += `<h2 class="sect">Your saved lessons</h2><div class="hscroll">${mine.map(p => p.kind === 'song' ? songTile(p) : vcard(pinVid(p), 'h')).join('')}</div>`;
  return h;
}

// a lesson's own page: player with practice tools
function vVideo(r) {
  const p = r.pin ? S.pins.find(x => x.id === r.pin) : null;
  const v = p ? pinVid(p) : (MS.vids.get(r.k) || r.item);
  if (!v) return `<div class="note" style="margin-top:30px">That lesson isn’t here anymore. <button class="linkbtn" data-act="back">Go back</button></div>`;
  annot(v);
  MS.vids.set(v.id, v);
  const saved = savedVid(v.id);
  const st = saved ? saved.mstatus || 'want' : '';
  const chips = v.insts.map(M.instLabel).concat(v.genres.map(M.genreLabel)).concat(v.d.level === 'easy' ? ['Beginner friendly'] : []);
  const song = v.song ? SONGS.find(s => s.t === v.song) : null;
  return `<div class="cu vpage">
    <div class="row" style="padding-top:calc(env(safe-area-inset-top,0px) + 6px)"><button class="iconbtn" data-act="back" aria-label="Back">${I(IC.back)}</button><span style="flex:1"></span><button class="iconbtn" data-act="v-menu" data-k="${esc(v.id)}" aria-label="More options">${I(IC.dots, 'fill')}</button></div>
    <div class="player${v.short ? ' tall' : ''}" id="player">${v.photoId || (saved && saved.photo) ? `<img class="pposter" data-photo="${esc(v.photoId || saved.id)}" data-orig="${esc(v.thumb)}" alt="">` : `<img class="pposter" src="${esc(v.thumb)}" referrerpolicy="no-referrer" alt="">`}<button class="playbig" data-act="v-play" data-k="${esc(v.id)}" aria-label="Play">${I(IC.play, 'fill')}</button></div>
    <div class="practice" id="practice">
      <div class="prow"><span class="plabel">Speed</span><div class="seg" role="group" aria-label="Speed">${[0.5, 0.75, 1].map(x => `<button data-act="v-speed" data-r="${x}" aria-pressed="${x === 1}">${x === 1 ? 'Normal' : x + '×'}</button>`).join('')}</div></div>
      <div class="prow"><span class="plabel">Loop a part</span><div class="seg" role="group" aria-label="Loop"><button data-act="v-loop-a">Start here</button><button data-act="v-loop-b">End here</button><button data-act="v-loop-x">Off</button></div><span id="loopinfo" class="muted small"></span></div>
    </div>
    <div class="cu-body">
      <h1>${esc(v.title)}</h1>
      <div class="by"><span class="pdot" style="background:#FF0000">YT</span><div><b>${esc(v.channel)}</b><small>${v.views ? Number(v.views).toLocaleString() + ' views · ' : ''}YouTube</small></div></div>
      ${chips.length ? `<div class="taglist">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="seg3" role="group" aria-label="Where you are with it">${[['want', 'Want to learn'], ['learning', 'Learning'], ['learned', 'Learned it']].map(([k, l]) => `<button data-act="v-status" data-k="${esc(v.id)}" data-s="${k}" aria-pressed="${st === k}">${l}</button>`).join('')}</div>
      <div class="cu-actions" style="padding-top:0">
        ${saved ? `<button class="iconbtn${saved.liked ? ' on' : ''}" data-act="v-like" data-k="${esc(v.id)}" aria-pressed="${!!saved.liked}" aria-label="Favorite">${I(IC.heart)}</button>` : `<button class="btn coral sm" data-act="v-save" data-k="${esc(v.id)}">${I(IC.plus)}Save</button>`}
        <button class="iconbtn" data-act="v-share" data-k="${esc(v.id)}" aria-label="Share">${I(IC.share)}</button>
        <span class="grow"></span>
        <a class="btn gray sm" href="${esc(v.url)}" target="_blank" rel="noopener">Open in YouTube</a>
      </div>
      ${song ? `<div class="minihead">The song</div><p style="margin:0 0 6px"><b>${esc(song.t)}</b> · ${esc(song.a)}</p><div class="row">${M.songLinks(song, v.insts[0]).slice(1).map(l => `<a class="btn gray sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>` : ''}
      ${v.desc ? `<div class="minihead">About this lesson</div><p class="cap clip" id="cap">${esc(v.desc)}</p>` : ''}
    </div>
    <h2 class="sect">More lessons like this</h2><div id="vmore">${vskel(4)}</div>
  </div>`;
}
async function loadVMore(v) {
  annot(v);
  const draw = list => {
    const b = $('#vmore');
    if (!b) return;
    const w = (list || []).filter(x => x.id !== v.id && !MS.dismissed.has(x.id));
    if (w.length) { b.innerHTML = `<div class="vgrid">${w.slice(0, 8).map(x => vcard(x, '', '')).join('')}</div>`; return; }
    const inst = v.insts[0] || herInst()[0];
    const t = M.TEACHERS.filter(x => x.inst.includes(inst));
    b.innerHTML = `<div class="row" style="margin:4px"><a class="btn gray sm" href="https://www.youtube.com/results?search_query=${enc((v.song || v.artist || M.instLabel(inst)) + ' ' + instWord(inst) + ' tutorial')}" target="_blank" rel="noopener">${I(IC.ext)}Find more on YouTube</a></div>` + (t.length ? `<div class="hscroll" style="margin-top:8px">${t.map(x => `<a class="tch" href="https://www.youtube.com/channel/${esc(x.id)}" target="_blank" rel="noopener"><i>${esc(x.name.replace(/^The /, '').charAt(0))}</i><span><b>${esc(x.name)}</b><small>${esc(x.inst.map(M.instLabel).join(', '))}</small></span></a>`).join('')}</div>` : '');
  };
  const inst = v.insts[0];
  const local = MS.feed.items.concat(MS.picks.items).map(annot).filter(x => x.id !== v.id && (x.channel === v.channel || (inst && x.insts.includes(inst)))).sort((a, b) => (b.channel === v.channel) - (a.channel === v.channel));
  if (!MS.full) { draw(local); return; }
  const q = ((v.song ? v.song + ' ' + (v.artist || '') : v.artist || '') + ' ' + (inst ? instWord(inst) : '') + ' tutorial').replace(/\s+/g, ' ').trim();
  if (q === 'tutorial') { draw(local); return; }
  if (MS.more.has(q)) { draw(MS.more.get(q).concat(local)); return; }
  try { const j = await getJSON(API + '/api/music?op=search&n=10&q=' + enc(q), 30000); const items = (j && j.items) || []; MS.more.set(q, items); draw(items.concat(local)); }
  catch (e) { draw(local); }
}

// the player (YouTube's own embed, so speed and looping work)
let YTP = null, ytLoad = null, tick = 0, curV = null, loopA = null, loopB = null, watched = 0, watchEv = 0, wantRate = 1;
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytLoad) return ytLoad;
  ytLoad = new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { if (prev) prev(); } catch (e) {} res(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { ytLoad = null; rej(new Error('blocked')); };
    document.head.appendChild(s);
    setTimeout(() => { if (!(window.YT && window.YT.Player)) { ytLoad = null; rej(new Error('slow')); } }, 12000);
  });
  return ytLoad;
}
async function playVideo(v) {
  const box = $('#player');
  if (!box) return;
  stopPlayer();
  curV = v; wantRate = 1;
  box.innerHTML = '<span class="spinner" style="position:absolute;inset:0;margin:auto"></span>';
  const p = savedVid(v.id);
  if (p) { p.opens = (p.opens || 0) + 1; p.lastOpened = Date.now(); savePin(p); }
  try {
    await loadYT();
    if (curV !== v || !$('#player')) return;
    $('#player').innerHTML = '<div id="ytp"></div>';
    YTP = new window.YT.Player('ytp', {
      videoId: v.id, width: '100%', height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1 },
      events: {
        onReady: e => { try { e.target.playVideo(); if (wantRate !== 1) e.target.setPlaybackRate(wantRate); } catch (er) {} },
        onError: e => {
          if ([100, 101, 150, 153].includes(e.data) && $('#player')) $('#player').innerHTML = `<div class="pmsg">This video only plays on YouTube.<a class="btn coral sm" href="${esc(v.url)}" target="_blank" rel="noopener">Open in YouTube</a></div>`;
        }
      }
    });
    tick = setInterval(practiceTick, 250);
  } catch (e) {
    if (curV !== v || !$('#player')) return;
    $('#player').innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(v.id)}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title)}"></iframe>`;
    const pr = $('#practice'); if (pr) pr.hidden = true;
  }
}
function practiceTick() {
  if (!YTP || typeof YTP.getPlayerState !== 'function') return;
  let st, t;
  try { st = YTP.getPlayerState(); t = YTP.getCurrentTime(); } catch (e) { return; }
  if (loopA != null && loopB != null && t >= loopB) { try { YTP.seekTo(loopA, true); } catch (e) {} }
  if (st === 1 && curV) {
    watched += 0.25;
    if (watched >= 30 * (watchEv + 1) && watchEv < 8) {
      watchEv++;
      mEvent('watch', curV, 0.5);
      const p = savedVid(curV.id);
      if (p) { p.practiced = (p.practiced || 0) + 30; savePin(p); }
    }
  }
}
function stopPlayer() {
  clearInterval(tick); tick = 0;
  try { if (YTP && YTP.destroy) YTP.destroy(); } catch (e) {}
  YTP = null; curV = null; loopA = loopB = null; watched = 0; watchEv = 0;
}
function loopInfo() {
  const el = $('#loopinfo');
  if (!el) return;
  const f = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  el.textContent = loopA != null && loopB != null ? 'Looping ' + f(loopA) + ' to ' + f(loopB) : loopA != null ? 'Starts at ' + f(loopA) + '. Now tap End here.' : '';
}
function refreshVideoBits(v) {
  // update the parts of the lesson page that change, without restarting the video
  const saved = savedVid(v.id);
  for (const b of $$('[data-act="v-status"]')) b.setAttribute('aria-pressed', String(!!saved && (saved.mstatus || 'want') === b.dataset.s));
  const save = $('[data-act="v-save"]');
  if (save && saved) save.outerHTML = `<button class="iconbtn${saved.liked ? ' on' : ''}" data-act="v-like" data-k="${esc(v.id)}" aria-pressed="${!!saved.liked}" aria-label="Favorite">${I(IC.heart)}</button>`;
  const like = $('[data-act="v-like"]');
  if (like && saved) { like.classList.toggle('on', !!saved.liked); like.setAttribute('aria-pressed', String(!!saved.liked)); }
  if (like && !saved) like.outerHTML = `<button class="btn coral sm" data-act="v-save" data-k="${esc(v.id)}">${I(IC.plus)}Save</button>`;
}

// saving lessons and songs
async function saveVideo(v, status) {
  annot(v);
  let p = savedVid(v.id);
  if (p) { if (status) p.mstatus = status; await savePin(p); return p; }
  const now = Date.now();
  p = {
    id: 'p' + rid(), type: 'music', kind: 'video', platform: 'youtube', url: v.url, videoId: v.id, title: v.title, author: v.channel, caption: v.desc || '',
    imageUrl: v.thumb, img: { w: 480, h: 360 }, photo: false, category: v.insts[0] || herInst()[0] || 'guitar', insts: v.insts.length ? v.insts : [herInst()[0]],
    genres: v.genres, artist: v.artist || '', song: v.song || '', short: !!v.short, dur: v.dur || 0, mstatus: status || 'want', status: 'want',
    liked: false, opens: 0, tags: [], createdAt: now, updatedAt: now, source: 'music'
  };
  S.pins.unshift(p);
  await savePin(p);
  mEvent('save', v, 2);
  return p;
}
async function saveSong(s, inst, status) {
  let p = savedSong(s);
  if (p) { p.mstatus = status || p.mstatus; if (inst) { p.category = inst; p.insts = [inst]; } await savePin(p); return p; }
  const now = Date.now();
  p = {
    id: 'p' + rid(), type: 'music', kind: 'song', platform: 'web', url: M.songLinks(s, inst)[0].url, title: s.t, artist: s.a, author: s.a, caption: '',
    imageUrl: '', img: null, photo: false, category: inst, insts: [inst], genres: s.g, level: s.lv, mstatus: status || 'want', status: 'want',
    liked: false, opens: 0, tags: [], createdAt: now, updatedAt: now, source: 'songs'
  };
  S.pins.unshift(p);
  await savePin(p);
  mEvent('song', { insts: [inst], genres: s.g, artist: s.a }, 2);
  return p;
}
const STATUS_W = { want: 1, learning: 2.5, learned: 3 };

// sheets
function songSheet(s) {
  const P = mProfile(), want = MS.prefs.insts;
  const inst = MS.songInst && want.includes(MS.songInst) ? MS.songInst : bestInst(s, P);
  const links = M.songLinks(s, inst), saved = savedSong(s), st = saved ? saved.mstatus : '';
  mEvent('look', { insts: [inst], genres: s.g, artist: s.a }, 0.5);
  showSheet(`<div class="grip"></div>
    <div class="shead"><div style="min-width:0"><h2>${esc(s.t)}</h2><div class="muted">${esc(s.a)} · ${esc(s.g.map(M.genreLabel).join(', '))} · ${lvLabel(s.lv)}</div></div><button class="iconbtn" data-act="close-sheet" aria-label="Close">${I(IC.x)}</button></div>
    <div class="field"><span class="flabel">Play it on</span><div class="catpick">${want.map(i => `<button data-act="ms-inst" data-i="${i}" data-s="${s.i}" aria-pressed="${i === inst}">${esc(M.instLabel(i))}${s.fit.includes(i) ? ' ★' : ''}</button>`).join('')}</div><p class="hint">★ = sounds great on that instrument</p></div>
    <div class="sactions">${MS.full ? `<button class="btn coral" data-act="ms-find" data-s="${s.i}" data-i="${inst}">${I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}Find a lesson</button>` : `<a class="btn coral" href="${esc(links[0].url)}" target="_blank" rel="noopener" data-act="ms-yt" data-s="${s.i}" data-i="${inst}">${I(IC.ext)}Lessons on YouTube</a>`}</div>
    <div class="menu">${links.slice(1).map(l => `<a class="mlink" href="${esc(l.url)}" target="_blank" rel="noopener">${I(IC.ext)}${esc(l.label)}</a>`).join('')}</div>
    <div class="seg3" role="group" aria-label="Where you are with it">${[['want', 'Want to learn'], ['learning', 'Learning'], ['learned', 'Learned it']].map(([k, l]) => `<button data-act="ms-status" data-s="${s.i}" data-i="${inst}" data-v="${k}" aria-pressed="${st === k}">${l}</button>`).join('')}</div>
    <div class="menu">${saved ? `<button data-act="ms-remove" data-s="${s.i}">${I(IC.trash)}Take off my list</button>` : ''}<button data-act="ms-no" data-s="${s.i}" data-close="1">${I(IC.eyeoff)}Not for me</button></div>`, s.t);
}
function musicSettings() {
  const p = MS.prefs;
  showSheet(`<div class="grip"></div>
    <div class="shead"><h2>Your music</h2><button class="iconbtn" data-act="mset-done" aria-label="Done">${I(IC.x)}</button></div>
    <div class="field"><span class="flabel">Instruments you play</span><div class="catpick">${M.INSTRUMENTS.map(i => `<button data-act="mset-inst" data-i="${i.id}" aria-pressed="${p.insts.includes(i.id)}">${esc(i.label)}</button>`).join('')}</div></div>
    <div class="field"><span class="flabel">Favorite genres</span><div class="catpick">${M.GENRES.map(g => `<button data-act="mset-genre" data-g="${g.id}" aria-pressed="${p.genres.includes(g.id)}">${esc(g.label)}</button>`).join('')}</div></div>
    <div class="field"><span class="flabel">Lessons for</span><div class="catpick">${LEVELS.map(([k, l]) => `<button data-act="mset-level" data-l="${k}" aria-pressed="${p.level === k}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="flabel">What it’s learned</span><p class="hint" style="margin:0">${(() => { const L = lately(mProfile()); return L.length ? 'Lately: ' + esc(L.join(', ')) + '. ' : ''; })()}It learns from what you save, play, mark Learning or Learned, search, and skip. The last two weeks count the most.</p>
      <div class="row" style="margin-top:8px"><button class="btn gray sm" data-act="mset-reset">Start learning over</button></div></div>
    <div class="sactions"><button class="btn coral" data-act="mset-done">Done</button></div>`, 'Your music');
}
function videoMenu(v) {
  const saved = savedVid(v.id);
  showSheet(`<div class="grip"></div><div class="shead"><h2>${esc(v.title)}</h2></div><div class="menu">
    ${saved ? `<button data-act="v-remove" data-k="${esc(v.id)}" data-close="1">${I(IC.trash)}Take off my lessons</button>` : `<button data-act="v-save" data-k="${esc(v.id)}" data-close="1">${I(IC.plus)}Save to my lessons</button>`}
    <button data-act="v-no" data-k="${esc(v.id)}" data-close="1">${I(IC.eyeoff)}Not for me</button>
    <button data-act="v-share" data-k="${esc(v.id)}" data-close="1">${I(IC.share)}Share</button>
  </div>`, 'Options');
}

// taps on the Music tab, lesson pages and their sheets
async function musicTap(a, el, inSheet) {
  const k = el.dataset.k, v = k ? (MS.vids.get(k) || (S.route.item && S.route.item.id === k ? S.route.item : null) || (savedVid(k) && pinVid(savedVid(k)))) : null;
  const s = el.dataset.s != null && el.dataset.s !== '' ? SONGS[+el.dataset.s] : null;
  const after = fn => { if (inSheet && el.dataset.close) closeSheet(fn); else fn(); };
  switch (a) {
    case 'm-inst': MS.inst = el.dataset.i; if (MS.inst !== 'all') mEvent('chip', { insts: [MS.inst] }, 0.3); MS.songsShown = 8; if (MS.q.trim()) musicSearch(MS.q, true); renderRoute(true); return true;
    case 'm-genre': MS.genre = el.dataset.g; if (MS.genre !== 'all') mEvent('chip', { genres: [MS.genre] }, 0.3); MS.songsShown = 8; renderRoute(true); return true;
    case 'm-more-songs': MS.songsShown += 10; renderRoute(true); return true;
    case 'm-more-picks': MS.picksShown += 12; renderRoute(true); return true;
    case 'm-settings': musicSettings(); return true;
    case 'm-teacher': mEvent('teacher', { channel: el.dataset.n, insts: (M.TEACHERS.find(t => t.name === el.dataset.n) || {}).inst || [] }, 0.5); return false;
    case 'm-song': if (s) { MS.songInst = null; songSheet(s); } return true;
    case 'm-song-add': if (s) { const P = mProfile(); const had = savedSong(s); if (had) { songSheet(s); return true; } await saveSong(s, bestInst(s, P), 'want'); toast('Added to your songs', 'Open', () => songSheet(s)); renderRoute(true); } return true;
    case 'ms-inst': if (s) { MS.songInst = el.dataset.i; songSheet(s); } return true;
    case 'ms-find': if (s) { const inst = el.dataset.i; closeSheet(() => { MS.inst = MS.prefs.insts.includes(inst) ? inst : 'all'; const q = s.t + (s.a === 'Traditional' || s.a === 'Anonymous' ? '' : ' ' + s.a) + ' ' + instWord(inst); renderRoute(true); const box = $('#mq'); if (box) box.value = q; musicSearch(q, true); window.scrollTo(0, 0); }); } return true;
    case 'ms-yt': if (s) mEvent('look', { insts: [el.dataset.i], genres: s.g, artist: s.a }, 1); return false;
    case 'ms-status': if (s) { const st = el.dataset.v; await saveSong(s, el.dataset.i, st); mEvent('status', { insts: [el.dataset.i], genres: s.g, artist: s.a }, STATUS_W[st]); if (st === 'learned') toast('Nice! Another song learned.'); songSheet(s); if (S.route.v === 'music') renderRoute(true); } return true;
    case 'ms-remove': if (s) { const p = savedSong(s); if (p) await deletePin(p); songSheet(s); if (S.route.v === 'music') renderRoute(true); } return true;
    case 'ms-no': if (s) { MS.dismissedSongs.add(songKey(s)); mEvent('no', { genres: s.g, artist: s.a }, -2); after(() => { if (S.route.v === 'music') renderRoute(true); }); toast('Got it. That one’s off the list.'); } return true;
    case 'mset-inst': { const i = el.dataset.i, L = MS.prefs.insts; if (L.includes(i)) { if (L.length > 1) L.splice(L.indexOf(i), 1); } else L.push(i); if (MS.inst !== 'all' && !L.includes(MS.inst)) MS.inst = 'all'; saveMusic(); musicSettings(); } return true;
    case 'mset-genre': { const g = el.dataset.g, L = MS.prefs.genres; if (L.includes(g)) L.splice(L.indexOf(g), 1); else L.push(g); if (MS.genre !== 'all' && !L.includes(MS.genre)) MS.genre = 'all'; saveMusic(); musicSettings(); } return true;
    case 'mset-level': MS.prefs.level = el.dataset.l; saveMusic(); musicSettings(); return true;
    case 'mset-reset': MS.events = []; MS.dismissed.clear(); MS.dismissedSongs.clear(); saveMusic(); toast('Starting fresh. It’ll learn from here.'); musicSettings(); return true;
    case 'mset-done': closeSheet(() => { if (S.route.v === 'music') renderRoute(true); loadMusicFeed(false); }); return true;
    case 'open-video': if (v) { const fromTab = TABS.includes(S.route.v) ? S.route.v : S.route.from; go({ v: 'video', k: v.id, item: { id: v.id, title: v.title, channel: v.channel, url: v.url, thumb: v.thumb, short: v.short, dur: v.dur, desc: v.desc, inst: v.inst || v.insts, published: v.published, views: v.views }, from: fromTab }); } return true;
    case 'v-play': if (v) playVideo(v); return true;
    case 'v-speed': { const r = +el.dataset.r; wantRate = r; for (const b of $$('[data-act="v-speed"]')) b.setAttribute('aria-pressed', String(+b.dataset.r === r)); try { if (YTP && YTP.setPlaybackRate) YTP.setPlaybackRate(r); } catch (e) {} if (!YTP) toast('Tap play, then pick a speed.'); } return true;
    case 'v-loop-a': if (!YTP) { toast('Start the video first.'); return true; } try { loopA = YTP.getCurrentTime(); loopB = null; } catch (e) {} loopInfo(); return true;
    case 'v-loop-b': if (!YTP) { toast('Start the video first.'); return true; } try { const t = YTP.getCurrentTime(); if (loopA == null) { loopA = Math.max(0, t - 10); } loopB = t; if (loopB <= loopA) { const x = loopA; loopA = loopB; loopB = x; } if (loopB - loopA < 1) loopB = loopA + 1; YTP.seekTo(loopA, true); } catch (e) {} loopInfo(); return true;
    case 'v-loop-x': loopA = loopB = null; loopInfo(); return true;
    case 'v-status': if (v) { const st = el.dataset.s; await saveVideo(v, st); mEvent('status', v, STATUS_W[st]); if (st === 'learned') toast('Nice! Another one learned.'); refreshVideoBits(v); } return true;
    case 'v-save': if (v) { await saveVideo(v, 'want'); after(() => refreshVideoBits(v)); toast('Saved to your lessons'); } return true;
    case 'v-like': if (v) { const p = savedVid(v.id); if (p) { p.liked = !p.liked; await savePin(p); if (p.liked) mEvent('like', v, 3); refreshVideoBits(v); } } return true;
    case 'v-remove': if (v) { const p = savedVid(v.id); if (p) await deletePin(p); after(() => refreshVideoBits(v)); } return true;
    case 'v-share': if (v) after(() => sharePin(v.title, v.url)); return true;
    case 'v-menu': if (v) videoMenu(v); return true;
    case 'v-no': if (v) { MS.dismissed.add(v.id); saveMusic(); mEvent('no', v, -3); after(() => { if (S.route.v === 'video') history.back(); else renderRoute(true); }); toast('Got it. You’ll see fewer like that.'); } return true;
  }
  return false;
}
document.addEventListener('input', e => { if (e.target.id === 'mq') musicSearch(e.target.value); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'mq') { e.preventDefault(); musicSearch(e.target.value, true); e.target.blur(); } });


/* ---------- toast ---------- */
let toastT = 0;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2800);
}
/* ---------- backup ---------- */
async function backup() {
  const photos = {};
  const asData = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(''); fr.readAsDataURL(b); });
  for (const p of S.pins) {
    for (const key of (p.photo ? [p.id] : []).concat(p.madePhotos || [])) {
      const b = await DB.get('photos', key).catch(() => null);
      if (b) photos[key] = await asData(b);
    }
  }
  const data = { app: 'brushglue', v: 1, at: new Date().toISOString(), pins: S.pins, taste: S.taste, dismissed: Array.from(S.dismissed), music: { prefs: MS.prefs, events: MS.events, dismissed: Array.from(MS.dismissed), dismissedSongs: Array.from(MS.dismissedSongs) }, stash: S.stash, shop: S.shop, profile: S.profile, photos };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'artistry-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Backup downloaded (' + plural(S.pins.length, 'idea') + ')');
}
$('#restoreFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let d;
  try { d = JSON.parse(await file.text()); } catch (err) { toast('That file isn’t an Artistry backup.'); return; }
  if (!d || d.app !== 'brushglue' || !Array.isArray(d.pins)) { toast('That file isn’t an Artistry backup.'); return; }
  let added = 0;
  for (const p of d.pins) {
    const cur = S.pins.find(x => x.id === p.id);
    if (cur && (cur.updatedAt || 0) >= (p.updatedAt || 0)) continue;
    if (d.photos && d.photos[p.id]) { try { const b = await (await fetch(d.photos[p.id])).blob(); await DB.put('photos', b, p.id); photoURLs.delete(p.id); p.photo = true; } catch (err) { p.photo = false; } }
    else p.photo = false;
    for (const key of p.madePhotos || []) { if (d.photos && d.photos[key]) { try { const b = await (await fetch(d.photos[key])).blob(); await DB.put('photos', b, key); } catch (err) {} } }
    await DB.put('pins', p).catch(() => {});
    if (cur) Object.assign(cur, p); else { S.pins.push(p); added++; }
  }
  if (d.taste) { S.taste = Object.assign({ avoidTags: {}, avoidCats: {}, views: {} }, d.taste); saveTaste(); }
  if (Array.isArray(d.dismissed)) { d.dismissed.forEach(u => S.dismissed.add(u)); kvSet('dismissed', Array.from(S.dismissed)); }
  if (d.music) loadMusicState(d.music, true);
  if (d.stash) { S.stash.have = Array.from(new Set(S.stash.have.concat(d.stash.have || []))); S.stash.custom = Array.from(new Set(S.stash.custom.concat(d.stash.custom || []))); saveStash(); }
  if (Array.isArray(d.shop)) { for (const x of d.shop) if (!S.shop.some(y => y.k === x.k)) S.shop.push(x); saveShop(); }
  if (d.profile && d.profile.name && !S.profile.name) { S.profile.name = d.profile.name; saveProfile(); }
  S.pins.sort((a, b) => b.createdAt - a.createdAt);
  renderRoute(true);
  toast('Restored ' + plural(added, 'new idea'));
});
/* ---------- start ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (['home', 'studio'].includes(S.route.v)) renderRoute(true); });
window.addEventListener('appinstalled', () => { S.installEvt = null; toast('Installed. Look for Artistry in the Share menu.'); renderRoute(true); });

function loadMusicState(m, merge) {
  if (m.prefs) {
    const insts = (m.prefs.insts || []).filter(i => Music.INSTRUMENTS.some(x => x.id === i));
    const genres = (m.prefs.genres || []).filter(g => Music.GENRES.some(x => x.id === g));
    MS.prefs = { insts: insts.length ? insts : Music.DEFAULT_INST.slice(), genres, level: m.prefs.level || 'beginner' };
  }
  if (Array.isArray(m.events)) MS.events = merge ? MS.events.concat(m.events).sort((a, b) => a.t - b.t).slice(-500) : m.events.slice(-500);
  (m.dismissed || []).forEach(x => MS.dismissed.add(x));
  (m.dismissedSongs || []).forEach(x => MS.dismissedSongs.add(x));
  if (merge) saveMusic();
}
// Updates: every open loads the newest app (the service worker asks the internet first). If the app was left open in
// the background, coming back to it checks for a newer version, and the new version takes over by reloading the page
// (right away when she isn't in the middle of something, otherwise when she next leaves the app, or with Reload).
let updatePending = false;
function watchUpdates() {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !updatePending) appUpdated(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    let last = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && updatePending && !busyNow()) reloadApp();
      else if (document.visibilityState === 'visible' && Date.now() - last > 10 * 60e3) { last = Date.now(); reg.update().catch(() => {}); }
    });
  }).catch(() => {});
}
function busyNow() {
  const a = document.activeElement;
  return !$('#sheetwrap').hidden || (S.route.v === 'video' && !!YTP) || !!(a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.value);
}
function reloadApp() {
  const v = S.route.v, go = v === 'music' || v === 'video' ? 'music' : v === 'explore' ? 'explore' : v === 'studio' ? 'studio' : '';
  location.replace(location.pathname + (go ? '?go=' + go : ''));
}
function appUpdated() {
  updatePending = true;
  if (!busyNow()) reloadApp();
  else toast('Artistry has an update', 'Reload', reloadApp);
}
async function init() {
  const qs = new URLSearchParams(location.search);
  const shared = { url: qs.get('url') || '', text: qs.get('text') || '', title: qs.get('title') || '' };
  const g = qs.get('go');
  const start = g === 'ideas' || g === 'explore' ? { v: 'explore' } : g === 'music' ? { v: 'music' } : g === 'studio' ? { v: 'studio' } : g === 'supplies' ? { v: 'supplies', tab: 'have', from: 'studio' } : { v: 'home' };
  history.replaceState(start, '', location.pathname);
  S.route = start;
  renderRoute();
  const ok = await DB.open();
  const [pins, taste, dismissed, music, owner, stash, shop, profile, memo] = await Promise.all(['pins', 'taste', 'dismissed', 'music', 'owner', 'stash', 'shop', 'profile', 'memo'].map((k, i) => (i === 0 ? DB.all('pins') : kvGet(k)).catch(() => null)));
  if (stash) S.stash = Object.assign({ have: [], custom: [], basics: true }, stash);
  if (Array.isArray(shop)) S.shop = shop;
  if (profile) S.profile = Object.assign({ name: '' }, profile);
  if (memo) S.memo = Object.assign({ snooze: {} }, memo);
  S.owner = owner === true;
  if (music) loadMusicState(music);
  S.pins = (pins || []).sort((a, b) => b.createdAt - a.createdAt);
  if (taste) S.taste = Object.assign({ avoidTags: {}, avoidCats: {}, views: {} }, taste);
  if (Array.isArray(dismissed)) S.dismissed = new Set(dismissed);
  // projects saved before supplies and holidays existed get them now (once)
  for (const p of S.pins) if (isArt(p) && (!Array.isArray(p.needs) || !Array.isArray(p.holidays))) { needsOf(p); holsOf(p); DB.put('pins', p).catch(() => {}); }
  lastCols = colCount();
  S.ready = true;
  renderRoute();
  if (!ok) toast('This browser won’t let the app save. Ideas will be lost when you close it.');
  if (qs.get('me') === 'dave') setOwner(true);
  else if (qs.get('me') === 'off') setOwner(false);
  if (findUrl(shared.url) || findUrl(shared.text) || findUrl(shared.title) || shared.text) openSave(shared);
  else if (qs.has('add')) openSave({});
  if ('serviceWorker' in navigator && location.protocol === 'https:') watchUpdates();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();
})();