// Brush & Glue offline support. Bump VERSION whenever crafts/ files change so phones pick up the update.
const VERSION = 'bng-20260930-1';
const SHELL = ['./', './index.html', './cats.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/logo-128.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('bng-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return; // readers and photos always go to the network
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return; // only this app's own files
  // the app page (also when opened from the Share menu with ?url=…): network first, the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // app files: the saved copy right away, refreshed in the background
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
