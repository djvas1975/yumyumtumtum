// Holidays & seasons on a phone-sized screen (Playwright), with the clock set to Sat Nov 21, 2026 and a pretend Discover.
// Not part of the quick test list (needs Playwright's Chromium; about 20 seconds):
//     python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/ && node tests/holidays.playwright.js [scratch folder]
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const R = path.join(__dirname, '..');
const SP = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'yyt-hol-'));
const SRV = path.join(SP, 'srv'); fs.mkdirSync(SRV, { recursive: true });
{
  let s = fs.readFileSync(path.join(R, 'index.html'), 'utf8').split("location.protocol === 'https:'").join('true');
  const i = s.lastIndexOf('boot();');
  s = s.slice(0, i) + 'boot();\nwindow.__t = {list, Store, go, refresh, putRecipe, cur};' + s.slice(i + 7);
  fs.writeFileSync(path.join(SRV, 'index.html'), s);
}
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const asked = [];
// pretend Discover: a few ideas per search, named after it; one from Edamam
function discover(q) {
  const t = q.replace(/\b\w/g, c => c.toUpperCase());
  const items = [1, 2, 3].map(i => ({ title: (i === 1 ? '' : i === 2 ? 'Easy ' : 'Best Ever ') + t, url: 'https://www.spendwithpennies.com/' + q.replace(/\W+/g, '-') + '-' + i + '/', image: '', source: 'spendwithpennies', sourceName: 'Spend With Pennies', by: '' }));
  if (/turkey/.test(q)) items.push({ title: 'Classic Roast Turkey', url: 'https://www.foodnetwork.com/recipes/classic-roast-turkey', image: '', source: 'edamam', sourceName: 'Food Network', by: 'edamam' });
  return { ok: true, q, items };
}

(async () => {
  const srv = http.createServer((rq, rs) => { const f = path.join(SRV, rq.url.split('?')[0] === '/' ? 'index.html' : rq.url.split('?')[0]); if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'content-type': 'text/html' }); rs.end(fs.readFileSync(f)); }).listen(8793);
  const b = await chromium.launch();
  const errs = [];
  async function page(scheme) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.clock.install({ time: new Date(2026, 10, 21, 9, 30) });
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/vercel\.app\/api\/discover/, route => { const q = new URL(route.request().url()).searchParams.get('q') || ''; asked.push(q); route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(discover(q)) }); });
    await p.route(/vercel\.app\/api\/(?!discover)/, route => route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: '{"ok":false,"error":"offline in this test"}' }));
    await p.goto('http://localhost:8793/'); await p.waitForTimeout(700);
    return p;
  }
  const shot = async (p, name) => p.screenshot({ path: path.join(SP, name + '.png') });

  const p = await page('light');
  // a saved pumpkin pie belongs to Thanksgiving by its name
  await p.evaluate(() => { const t = Date.now(); window.__t.putRecipe({ id: 'pie1', title: 'Classic Pumpkin Pie', url: '', platform: 'none', source: '', meal: ['Dessert'], time: 0, servings: 0, cuisine: '', tags: [], collections: [], ingredients: ['1 can pumpkin'], steps: ['Bake.'], srcNotes: [], equipment: [], notes: '', photoId: null, photoKey: null, photoData: null, photoUrl: null, rating: 0, fav: false, madeCount: 0, createdAt: t, updatedAt: t, sample: false }); window.__t.refresh(); });
  await p.waitForTimeout(400);
  const sec = await p.$eval('[data-sx="hol"]', el => Array.from(el.querySelectorAll('.cuis')).map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok(/Holidays & seasons/.test(await p.textContent('#view')), 'Home has a Holidays & seasons section');
  ok(sec.length === 6 && /Thanksgiving Thursday/.test(sec[0]) && /1 saved/.test(sec[0]) && /Hanukkah In 13 days/.test(sec[1]) && /Christmas In 33 days/.test(sec[2]) && /New Year’s In 40 days/.test(sec[3]) && /Fall Now through Dec 20/.test(sec[4]) && /All holidays/.test(sec[5]), 'tiles: Thanksgiving (Thursday, 1 saved), Hanukkah, Christmas, New Year\'s, Fall, All holidays -> ' + JSON.stringify(sec));
  await p.$eval('[data-sx="hol"]', el => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await shot(p, '01-home-holidays');

  // the Thanksgiving page
  asked.length = 0;
  await p.click('[data-sx="hol"] [data-holgo="thanksgiving"]'); await p.waitForTimeout(700);
  const top = await p.textContent('.ph-t');
  ok(/🦃 Thanksgiving/.test(top) && /Thursday, Nov 26 · In 5 days/.test(top), 'page title and date -> ' + top.replace(/\s+/g, ' '));
  ok(/Your Thanksgiving recipes/.test(await p.textContent('#view')) && /Classic Pumpkin Pie/.test(await p.textContent('#view')), 'your pumpkin pie is under Your Thanksgiving recipes');
  ok(asked.join('|') === 'thanksgiving turkey|stuffing|pumpkin pie|leftover turkey', 'All ideas: one search from each course -> ' + asked.join('|'));
  const chips = await p.$$eval('[data-holc]', a => a.map(x => x.textContent));
  ok(chips.join('|') === 'All|Turkey & mains|Sides|Pies & desserts|Leftovers', 'course chips -> ' + chips.join('|'));
  ok((await p.$$('#holfeed .dcard')).length >= 8 && /Powered by Edamam/.test(await p.textContent('#holfeed')), 'ideas show, with "Powered by Edamam" under the Food Network one');
  await shot(p, '02-thanksgiving');
  asked.length = 0;
  await p.click('[data-holc="sides"]'); await p.waitForTimeout(600);
  ok(asked.join('|') === 'mashed potatoes|green bean casserole|sweet potato casserole' && /Easy Stuffing/.test(await p.textContent('#holfeed')), 'Sides: the side-dish searches (stuffing was already asked, so it comes from the phone) -> ' + asked.join('|'));
  // save an idea: it's filed under Thanksgiving even though its name doesn't say so
  await p.click('#holfeed .dcard:has-text("Easy Mashed Potatoes") [data-dsave]'); await p.waitForTimeout(500);
  const saved = await p.evaluate(() => window.__t.list().find(r => r.title === 'Easy Mashed Potatoes'));
  ok(saved && Array.isArray(saved.hols) && saved.hols[0] === 'thanksgiving', 'saving an idea files it under Thanksgiving (hols)');
  await p.evaluate(() => window.__t.refresh()); await p.waitForTimeout(300);
  ok(/Easy Mashed Potatoes/.test(await p.$eval('.sec', el => el.textContent)), 'and it shows under Your Thanksgiving recipes');
  ok(/Coming up/.test(await p.textContent('#view')) && (await p.$$('.holrow')).length === 3, 'Coming up: the next 3 holidays');

  // All holidays
  await p.click('.sec-h [data-holgo="_all"]'); await p.waitForTimeout(400);
  const rows = await p.$$eval('.holrow', a => a.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok(rows.length === 21 && /^🦃 Thanksgiving Thursday, Nov 26 · 2 recipes saved In 5 days/.test(rows[0]) && /Christmas Dec 24–25/.test(rows.join('|')) && /Mexican Independence Day Sep 15–16/.test(rows.join('|')), 'All holidays: 17 holidays soonest first, then 4 seasons -> ' + rows[0]);
  await shot(p, '03-all-holidays');
  await p.click('.holrow[data-holgo="winter"]'); await p.waitForTimeout(500);
  ok(/Starts Dec 21/.test(await p.textContent('.ph-t')) && !(await p.$('[data-holc]')), 'a season: "Starts Dec 21", one list of ideas (no course chips)');

  // dark mode
  const d = await page('dark');
  await d.click('[data-sx="hol"] [data-holgo="thanksgiving"]'); await d.waitForTimeout(700);
  await shot(d, '04-thanksgiving-dark');

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log('\nScreenshots in ' + SP);
  console.log(fails ? fails + ' FAILED' : 'All holiday screen tests passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
