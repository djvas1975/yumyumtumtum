// Offline tests for the grocery list sections and /api/deals (Kroger's API, faked).
const path = require('path');
const R = path.join(__dirname, '..');
const X = require(path.join(R, 'lib/pantry.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = x => JSON.stringify(x);

(async () => {
  // ---------- grocery list sections ----------
  [['chicken thighs', 'Meat & seafood'], ['eggs', 'Dairy & eggs'], ['tortillas', 'Bread & tortillas'], ['pinto beans', 'Rice, pasta & beans'],
   ['salsa', 'Canned & jarred'], ['soy sauce', 'Sauces & condiments'], ['cumin', 'Spices & baking'], ['frozen peas', 'Frozen'], ['cilantro', 'Produce'],
   ['paper towels', 'Other'], ['butter', 'Dairy & eggs'], ['tortilla chips', 'Snacks & drinks']]
    .forEach(([t, want]) => { const f = X.lookupFood(t); ok(X.aisleOf(f.id, t) === want, 'section of "' + t + '" -> ' + X.aisleOf(f.id, t)); });

  // ---------- grocery names use the recipe's words ----------
  [['1/2 cup potato starch', 'Potato starch'], ['2 tbsp vegetable oil', 'Vegetable oil'], ['1 tbsp low sodium soy sauce', 'Soy sauce'], ['3 eggs', 'Eggs'], ['1 lb hamburger meat', 'Hamburger meat']]
    .forEach(([l, want]) => { const id = X.readIngredient(l).ids[0]; ok(X.foodName(l, id) === want, 'list name for "' + l + '" -> ' + X.foodName(l, id)); });

  // ---------- /api/deals with a fake Kroger ----------
  const calls = [];
  const product = (desc, regular, promo) => ({ productId: desc, brand: 'Kroger', description: desc, images: [{ perspective: 'front', sizes: [{ size: 'medium', url: 'https://img/' + encodeURIComponent(desc) + '.jpg' }] }], items: [{ size: '1 lb', soldBy: 'Unit', price: { regular, promo } }] });
  global.fetch = async (url, opts) => {
    calls.push([url, opts && opts.headers]);
    const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
    if (/oauth2\/token/.test(url)) {
      const auth = opts.headers.Authorization;
      const b = x => 'Basic ' + Buffer.from(x).toString('base64');
      if (auth === b('good-id:good-secret') && /\/\/api\.kroger/.test(url)) return res(200, { access_token: 'T1', expires_in: 1800 });
      if (auth === b('ce-id:ce-secret') && /api-ce\.kroger/.test(url)) return res(200, { access_token: 'T2', expires_in: 1800 });
      return res(401, {});
    }
    if (/\/locations\?/.test(url)) return res(200, { data: [{ locationId: '70500847', chain: 'FOOD4LESS', name: 'Food 4 Less - Manteca', address: { addressLine1: '131 Spreckels Ave', city: 'Manteca', state: 'CA', zipCode: '95336' } }] });
    if (/\/products\?/.test(url)) {
      const term = decodeURIComponent(url.match(/filter\.term=([^&]+)/)[1]);
      if (term === 'chicken thighs') return res(200, { data: [product('Chicken Thighs Family Pack', 2.99, 1.49), product('Boneless Chicken Thighs', 4.99, 0), product('Organic Thighs', 6.99, 5.99)] });
      if (term === 'eggs') return res(200, { data: [product('Large Eggs 18 ct', 3.49, 0)] });
      return res(200, { data: [] });
    }
    return res(404, {});
  };
  const deals = require(path.join(R, 'api/deals.js'));
  const call = (query, headers) => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o }); }, end() { resolve({ code: this.code }); } };
    deals({ method: 'GET', headers: Object.assign({}, headers || {}), query }, res);
  });
  const keys = { 'x-kroger-id': 'good-id', 'x-kroger-secret': 'good-secret' };

  const r0 = await call({ find: '95336' });
  ok(r0.body.ok === false && r0.body.needKeys, 'deals: asks for keys when there are none');
  const r1 = await call({ find: '95336' }, { 'x-kroger-id': 'bad', 'x-kroger-secret': 'bad' });
  ok(r1.body.ok === false && /didn.t accept/.test(r1.body.error), 'deals: wrong keys get a plain message -> ' + r1.body.error);
  const r2 = await call({ find: '95336' }, keys);
  ok(r2.body.ok && r2.body.stores[0].locationId === '70500847' && r2.body.stores[0].address === '131 Spreckels Ave, Manteca, CA, 95336', 'deals: finds Food 4 Less near a ZIP -> ' + J(r2.body.stores[0]));
  const r3 = await call({ loc: '70500847', q: 'chicken thighs|eggs|tofu', all: '1' }, keys);
  const ct = r3.body.results['chicken thighs'];
  ok(r3.body.ok && ct.sale.length === 2 && ct.sale[0].name === 'Chicken Thighs Family Pack' && ct.sale[0].promo === 1.49 && ct.sale[0].regular === 2.99, 'deals: sale items first, best savings first -> ' + J(ct.sale.map(x => [x.name, x.promo, x.regular])));
  ok(ct.sale[0].image === 'https://img/Chicken%20Thighs%20Family%20Pack.jpg' && ct.sale[0].size === '1 lb', 'deals: picture and size');
  ok(!r3.body.results.eggs.sale.length && r3.body.results.eggs.best.name === 'Large Eggs 18 ct', 'deals: no sale -> regular price of the best match');
  ok(!r3.body.results.tofu.sale.length, 'deals: nothing found is fine');
  ok(calls.filter(c => /oauth2/.test(c[0]) && /Z29vZC1pZDpnb29kLXNlY3JldA/.test(J(c[1]))).length === 1, 'deals: the key is reused, not fetched every time');
  ok(calls.filter(c => /\/products\?/.test(c[0])).every(c => /^https:\/\/api\.kroger\.com/.test(c[0])), 'deals: live keys use Kroger\'s live data');
  const r4 = await call({ find: '95336' }, { 'x-kroger-id': 'ce-id', 'x-kroger-secret': 'ce-secret' });
  ok(r4.body.ok && r4.body.test === true && /^https:\/\/api-ce\.kroger\.com\/v1\/locations/.test(calls[calls.length - 1][0]), 'deals: keys made in Kroger\'s test area still work, and say so');
  ok(calls.filter(c => /\/products\?/.test(c[0])).every(c => /filter\.locationId=70500847/.test(c[0])), 'deals: every price check names the store');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
