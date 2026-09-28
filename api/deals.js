// yumyumtumtum deals: sale prices at Kroger-family stores (Food 4 Less, Ralphs, Kroger...) from Kroger's
// official, free developer API. Safeway, Raley's, and Save Mart have no public deals data, so the app
// links to their weekly ads instead.
//
// GET /api/deals?find=95336                    -> Kroger-family stores near a ZIP code
// GET /api/deals?loc=70500123&q=chicken|eggs   -> what's on sale at that store for each search (up to 30)
//     add &all=1 to also get the regular price of the best match when nothing is on sale
//
// Kroger keys come from the app (headers x-kroger-id and x-kroger-secret, which Dave enters once on
// the Deals tab) or from Vercel settings (KROGER_CLIENT_ID and KROGER_CLIENT_SECRET).
// Sign up at developer.kroger.com, create an app, and copy its client ID and secret.

const { cors, clean } = require('../lib/parse');

// Kroger's live data, then its test copy ("Certification"), in case the app was made there by mistake
const BASES = ['https://api.kroger.com/v1', 'https://api-ce.kroger.com/v1'];
const TOKENS = new Map(); // client id -> {token, base, until}

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'x-kroger-id, x-kroger-secret'); res.status(204).end(); return; }
  res.setHeader('Cache-Control', 'no-store');
  const qp = req.query || {};
  const h = req.headers || {};
  const id = String(h['x-kroger-id'] || process.env.KROGER_CLIENT_ID || '').trim();
  const secret = String(h['x-kroger-secret'] || process.env.KROGER_CLIENT_SECRET || '').trim();
  if (!id || !secret) { res.status(200).json({ ok: false, needKeys: true, error: 'Add your Kroger developer keys first.' }); return; }
  try {
    const token = await getToken(id, secret);
    if (qp.find) {
      const zip = String(qp.find).replace(/\D/g, '').slice(0, 5);
      if (zip.length !== 5) { res.status(400).json({ ok: false, error: 'That ZIP code doesn’t look right.' }); return; }
      const j = await kroger('/locations?filter.zipCode.near=' + zip + '&filter.radiusInMiles=15&filter.limit=20', token);
      const stores = (j.data || []).map(l => ({
        locationId: l.locationId, chain: l.chain || '', name: l.name || '',
        address: [l.address && l.address.addressLine1, l.address && l.address.city, l.address && l.address.state, l.address && l.address.zipCode].filter(Boolean).join(', '),
        phone: l.phone || ''
      }));
      res.status(200).json({ ok: true, stores, test: token.base !== BASES[0] || undefined });
      return;
    }
    const loc = String(qp.loc || '').replace(/[^\w-]/g, '').slice(0, 20);
    const terms = [].concat(qp.q || []).flatMap(x => String(x).split('|')).map(x => clean(x).slice(0, 50)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 30);
    if (!loc || !terms.length) { res.status(400).json({ ok: false, error: 'Pick a store and something to look for.' }); return; }
    const results = {};
    await pool(terms, 5, async t => {
      try {
        const j = await kroger('/products?filter.term=' + encodeURIComponent(t) + '&filter.locationId=' + loc + '&filter.limit=50', token);
        const all = (j.data || []).map(item).filter(x => x.regular > 0);
        const sale = all.filter(x => x.promo > 0 && x.promo < x.regular).sort((a, b) => (b.regular - b.promo) / b.regular - (a.regular - a.promo) / a.regular).slice(0, 8);
        results[t] = { sale, best: qp.all && !sale.length && all[0] ? all[0] : null };
      } catch (e) { results[t] = { sale: [], error: e.message }; }
    });
    res.status(200).json({ ok: true, loc, results, at: new Date().toISOString(), test: token.base !== BASES[0] || undefined });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message || 'Couldn’t reach Kroger.' });
  }
};

// one product -> what the app shows
function item(p) {
  const it = (p.items || [])[0] || {};
  const pr = it.price || {};
  const front = (p.images || []).find(i => i.perspective === 'front') || (p.images || [])[0] || {};
  const img = (front.sizes || []).find(s => s.size === 'medium') || (front.sizes || [])[0] || {};
  return {
    id: p.productId || '', name: clean(p.description || ''), brand: clean(p.brand || ''), size: clean(it.size || ''),
    soldBy: it.soldBy || '', regular: +pr.regular || 0, promo: +pr.promo || 0, image: img.url || ''
  };
}

async function getToken(id, secret) {
  const c = TOKENS.get(id);
  if (c && c.until > Date.now() + 60000) return c;
  let refused = false;
  for (const base of BASES) {
    const r = await timed(fetch(base + '/connect/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64') },
      body: 'grant_type=client_credentials&scope=product.compact'
    }), 9000);
    if (r.status === 401 || r.status === 400) { refused = true; continue; }
    if (!r.ok) throw new Error('Kroger had a problem (' + r.status + ').');
    const j = await r.json();
    if (!j.access_token) throw new Error('Kroger didn’t send a key back.');
    const t = { token: j.access_token, base, until: Date.now() + (j.expires_in || 1800) * 1000 };
    TOKENS.set(id, t);
    return t;
  }
  throw new Error(refused ? 'Kroger didn’t accept those keys. Check the client ID and secret.' : 'Couldn’t reach Kroger.');
}
async function kroger(path, t) {
  const r = await timed(fetch(t.base + path, { headers: { Authorization: 'Bearer ' + t.token, Accept: 'application/json' } }), 9000);
  if (r.status === 401) throw new Error('Kroger didn’t accept those keys. Check the client ID and secret.');
  if (r.status === 429) throw new Error('Kroger says slow down. Try again in a minute.');
  if (!r.ok) throw new Error('Kroger had a problem (' + r.status + ').');
  return r.json();
}
function timed(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Kroger took too long to answer.')), ms); })]).finally(() => clearTimeout(t));
}
async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const x = list[i++]; await fn(x); } }));
}

module.exports.item = item;
