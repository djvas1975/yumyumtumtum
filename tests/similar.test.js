// Offline tests for "Steps from a similar recipe" (api/similar.js): picking the dish's main words, scoring names,
// and the endpoint with a fake internet.
const path = require('path');
const R = path.join(__dirname, '..');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = x => JSON.stringify(x);

(async () => {
  // fake internet first, so the endpoint's helpers use it
  const wp = list => JSON.stringify(list.map(([link, title]) => ({ link, title: { rendered: title }, jetpack_featured_media_url: link + 'photo.jpg' })));
  const searches = {
    southernbite: wp([['https://southernbite.com/chicken-and-dumplings/', 'Chicken and Dumplings'], ['https://southernbite.com/25-chicken-recipes/', '25 Chicken Recipes']]),
    recipetineats: wp([['https://www.recipetineats.com/chicken-noodle-soup/', 'Chicken Noodle Soup'], ['https://www.recipetineats.com/pork-dumplings/', 'Pork Dumplings'],
      ['https://www.recipetineats.com/slow-cooker-chicken-dumplings/', 'Slow Cooker Chicken and Dumplings']])
  };
  const card = (name, steps, extra) => '<html><head><meta property="og:site_name" content="Site"><script type="application/ld+json">' + JSON.stringify(Object.assign({
    '@type': 'Recipe', name, image: 'https://x/big.jpg', recipeIngredient: ['2 lbs chicken thighs', '6 cups chicken broth', '2 cups flour', '1 cup milk', '1 tbsp baking powder'],
    recipeInstructions: steps.map(text => ({ '@type': 'HowToStep', text })), totalTime: 'PT1H', recipeYield: '6'
  }, extra || {})) + '</script></head><body></body></html>';
  const pages = {
    'https://southernbite.com/chicken-and-dumplings/': card('Chicken and Dumplings', ['Heat the oil in a large Dutch oven.', 'Add the broth and bring to a boil.', 'In a bowl, mix the flour, baking powder and milk.', 'Drop in the dough and simmer 15 minutes.'], { tool: [{ '@type': 'HowToTool', name: 'Dutch oven' }] }),
    'https://www.recipetineats.com/slow-cooker-chicken-dumplings/': card('Slow Cooker Chicken and Dumplings', ['Put everything in the slow cooker.', 'Cook on low 6 hours, then add the dumplings.']),
    'https://www.recipetineats.com/chicken-noodle-soup/': card('Chicken Noodle Soup', ['Simmer.', 'Serve.']),
    'https://www.recipetineats.com/pork-dumplings/': card('Pork Dumplings', ['Fill.', 'Steam.'], { recipeIngredient: ['1 lb ground pork', '30 wrappers'] }),
    'https://southernbite.com/25-chicken-recipes/': '<html><head><title>25 Chicken Recipes</title></head><body>roundup</body></html>'
  };
  const seen = [];
  global.fetch = async (url) => {
    seen.push(url);
    let body = pages[url];
    if (body == null) { const m = url.match(/^https:\/\/(?:www\.)?(southernbite|recipetineats)\.com\/wp-json\/wp\/v2\/posts/); if (m) body = searches[m[1]]; }
    if (body == null) return { status: 404, ok: false, url, headers: new Map(), text: async () => '' };
    return { status: 200, ok: true, url, headers: new Map([['content-type', /wp-json/.test(url) ? 'application/json' : 'text/html']]), text: async () => body };
  };
  const S = require(path.join(R, 'api/similar.js'));

  // ---------- the dish's main words ----------
  const w = t => { const x = S.dishWords(t); return x.key.join(',') + (x.style.length ? ' / ' + x.style.join(',') : ''); };
  ok(w('Ep 20: The BEST Slow Cooker Chicken & Dumplings 😍 #dinner #fyp') === 'chicken,dumpling / slow,cooker', 'series name, "best", emoji, hashtags dropped; slow cooker is a style -> ' + w('Ep 20: The BEST Slow Cooker Chicken & Dumplings 😍 #dinner #fyp'));
  ok(w('Fried Rice') === 'fried,rice', '"fried" stays a main word (fried rice isn\'t just rice)');
  ok(w('Easy Creamy Tuscan Chicken') === 'tuscan,chicken / creamy', 'creamy is a style word');
  ok(w('Grandma\'s Famous Chicken Pot Pie') === 'chicken,pot,pie', 'pot pie keeps "pot"');
  const sc = (q, t) => S.titleScore(S.dishWords(q), t);
  ok(sc('Chicken & Dumplings', 'Chicken and Dumplings') === 1, 'the same dish scores 1');
  ok(sc('Chicken & Dumplings', 'Pork Dumplings') < 0.6 && sc('Chicken & Dumplings', 'Chicken Noodle Soup') < 0.6, 'half the name is not a match');
  ok(sc('Fried Rice', 'Mexican Rice') < 0.6 && sc('Fried Rice', 'Chicken Fried Rice') > 0.9, 'fried rice: Mexican rice no, chicken fried rice yes');
  ok(sc('Crack Chicken Penne', 'Crack Chicken Pasta') >= 0.6, '2 of 3 main words is a match (crack chicken pasta for crack chicken penne)');

  // ---------- the endpoint ----------
  const call = q => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, end() { resolve({ code: this.code }); } };
    S({ method: 'GET', headers: {}, query: q }, res);
  });
  const r1 = await call({ q: 'Chicken & Dumplings 😋 #comfortfood', ing: 'chicken,chicken broth,flour,milk' });
  const it = r1.body.items || [];
  ok(r1.code === 200 && it.length === 2, 'finds 2 close matches, not the soup, the pork dumplings, or the roundup -> ' + J(it.map(x => x.title)));
  ok(it[0] && it[0].title === 'Chicken and Dumplings' && it[0].sourceName === 'Southern Bite', 'the plain match first -> ' + (it[0] && it[0].title));
  ok(it[0] && it[0].steps.length === 4 && it[0].equipment.join() === 'Dutch oven' && it[0].ingredients.length === 5, 'brings its steps, cookware list, and ingredients');
  ok(it[0] && it[0].score.shared === 4 && it[0].score.of === 4 && it[0].totalTime === 60, 'says how many of the video\'s foods it shares -> ' + J(it[0] && it[0].score));
  ok(it[0] && it[0].image === 'https://southernbite.com/chicken-and-dumplings/photo.jpg', 'keeps the search card photo');
  ok(/s-maxage/.test(r1.headers['Cache-Control']), 'answers are cached for a day');
  const r2 = await call({ q: 'Chicken and Dumplings', skip: 'https://southernbite.com/chicken-and-dumplings/' });
  ok(r2.body.items.length === 1 && r2.body.items[0].title === 'Slow Cooker Chicken and Dumplings', 'skip leaves out an address (the recipe\'s own link)');
  const r3 = await call({ q: 'this is the meal I make every week' });
  ok(r3.code === 200 && !r3.body.items.length, 'a caption that isn\'t a dish name finds nothing instead of something random');
  const r4 = await call({ q: '😍 #fyp' });
  ok(r4.code === 400, 'no dish words: asks for the dish');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
