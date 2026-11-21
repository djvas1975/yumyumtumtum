// yumyumtumtum offline support. VERSION changes on every build so phones pick up updates.
const VERSION = 'yyt-20261121-114728';
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
// Share > YumYum (a link, since v2.3 a video, since v2.4 up to 4 pictures) arrives as a form post to ./share-in. GitHub
// Pages can't take a post, so it's answered here: a video or pictures are kept in the "share-in" cache for the app to
// pick up, and the app opens at ./?title=&text=&url=(&video=1 or &image=N), the same address a shared link always used.
async function shareIn(req) {
  const q = new URLSearchParams();
  try {
    const fd = await req.formData();
    ['title', 'text', 'url'].forEach(k => { const v = fd.get(k); if (typeof v === 'string' && v.trim()) q.set(k, v.trim().slice(0, 2000)); });
    const files = [];
    for (const [, v] of fd.entries()) if (v && typeof v !== 'string' && v.size) files.push(v);
    const isPic = f => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || '');
    const c = await caches.open('share-in');
    const vid = files.find(f => !isPic(f));
    if (vid) {
      await c.put(new URL('./shared-video', self.registration.scope).href, new Response(vid, {headers: {'content-type': vid.type || 'video/mp4', 'x-name': encodeURIComponent(vid.name || 'video.mp4')}}));
      q.set('video', '1');
    } else {
      const pics = files.filter(isPic).slice(0, 4);
      for (let i = 0; i < pics.length; i++) {
        await c.put(new URL('./shared-image-' + i, self.registration.scope).href, new Response(pics[i], {headers: {'content-type': pics[i].type || 'image/jpeg', 'x-name': encodeURIComponent(pics[i].name || 'picture.jpg')}}));
      }
      if (pics.length) q.set('image', String(pics.length));
    }
  } catch (err) {}
  const qs = q.toString();
  return Response.redirect(new URL('./' + (qs ? '?' + qs : ''), self.registration.scope).href, 303);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share-in')) { e.respondWith(shareIn(req)); return; }
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
