// GET /api/image?url=<image link>  ->  the image itself, so the app can keep its own copy on the phone.
// (Phones can't download pictures from other sites directly inside a web app.)
const { cors, badUrl } = require('../lib/parse');

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const MAX = 12 * 1024 * 1024;

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const original = String((req.query && req.query.url) || '').trim();
  const bad0 = badUrl(original);
  if (bad0) { res.status(400).json({ ok: false, error: bad0 }); return; }
  // try the photo's own site first, then the Internet Archive's saved copy of it
  for (const url of [original, 'https://web.archive.org/web/2im_/' + original]) {
    const img = await getImage(url);
    if (img) {
      res.setHeader('Content-Type', img.type);
      res.setHeader('Cache-Control', 'public, s-maxage=604800, max-age=86400');
      res.status(200).send(img.buf);
      return;
    }
  }
  res.status(502).json({ ok: false, error: 'Couldn’t get that photo.' });
};

async function getImage(start) {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    if (badUrl(url)) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    let r;
    try {
      r = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8', 'Referer': new URL(url).origin + '/' } });
    } catch (e) { clearTimeout(t); return null; }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { clearTimeout(t); url = new URL(r.headers.get('location'), url).href; continue; }
    const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!r.ok || !/^image\/(jpeg|jpg|png|webp|gif|avif)$/.test(type)) { clearTimeout(t); return null; }
    const buf = Buffer.from(await r.arrayBuffer());
    clearTimeout(t);
    if (!buf.length || buf.length > MAX) return null;
    return { buf, type: type === 'image/jpg' ? 'image/jpeg' : type };
  }
  return null;
}
