// Artistry (formerly Brush & Glue) offline support.
// VERSION is stamped by `node tools/stamp_crafts.js` from the app's files (tests fail if it's stale), so every change
// gives phones a new service worker, and an open app reloads itself into the new version (see appUpdated in index.html).
const VERSION = 'bng-5e7442d82d4e';
const SHELL = ['./', './index.html', './cats.js', './music.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/logo-128.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('bng-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Newest copy from the internet first (so updates show up the next time the app opens), the saved copy when
// offline or when the internet takes more than 4 seconds.
function fresh(req, key) {
  const net = fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  });
  const saved = () => caches.match(key, { ignoreSearch: true });
  const fallback = net.catch(() => saved().then(hit => hit || Response.error()));
  const timer = new Promise(r => setTimeout(r, 4000)).then(saved).then(hit => hit || fallback);
  return Promise.race([fallback, timer]);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return; // readers and photos always go to the network
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return; // only this app's own files
  // the app page (also when opened from the Share menu with ?url=…) is saved as index.html
  e.respondWith(fresh(req, req.mode === 'navigate' ? './index.html' : req));
});
