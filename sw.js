// yumyumtumtum offline support. VERSION changes on every build so phones pick up updates.
const VERSION = 'yyt-20261016-145159';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('yyt-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// a timer's notification: Stop, +1 min, or a tap on it (stops the alarm and opens the timers)
self.addEventListener('notificationclick', e => {
  const d = (e.notification && e.notification.data) || {};
  e.notification.close();
  if (!d.timer) return;
  const msg = {timer: e.action || 'open', id: d.timer};
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    list.forEach(c => c.postMessage(msg));
    const c = list[0];
    if (c) return msg.timer === 'open' && 'focus' in c ? c.focus() : undefined;
    return self.clients.openWindow('./?go=timers');
  }));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the app page: try the network first so updates show up, fall back to the saved copy offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // app files and fonts: answer from the saved copy right away, refresh it in the background
  if (url.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
