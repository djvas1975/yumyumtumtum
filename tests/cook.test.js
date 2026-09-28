// Offline tests for "What can I cook?": reading ingredient lines, checking them against a kitchen,
// and the /api/cook endpoint with a fake internet.
const path = require('path');
const R = path.join(__dirname, '..');
const X = require(path.join(R, 'lib/pantry.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = x => JSON.stringify(x);

(async () => {
  // ---------- reading ingredient lines ----------
  const read = l => { const r = X.readIngredient(l); return r.ids.join(r.alt ? '|' : '+') || 'core:' + r.core; };
  const cases = [
    ['4 cups low-sodium chicken broth', 'chicken broth'],
    ['2 lbs boneless skinless chicken thighs, cut into bite-size pieces', 'chicken'],
    ['1 can (10.5 oz) cream of chicken soup', 'cream of chicken'],
    ['2 cups shredded mozzarella cheese', 'mozzarella'],
    ['1 red bell pepper, diced', 'bell pepper'],
    ['1 tsp crushed red pepper flakes', 'red pepper flakes'],
    ['Salt and pepper, to taste', 'salt+pepper'],
    ['1 tbsp rice vinegar', 'rice vinegar'],
    ['2 cups cooked white rice', 'rice'],
    ['2 tbsp peanut butter', 'peanut butter'],
    ['1 tbsp corn oil', 'oil'],
    ['8 corn tortillas', 'tortillas'],
    ['1 cup flour tortillas', 'tortillas'],
    ['1/2 cup sour cream or Greek yogurt', 'sour cream|yogurt'],
    ['1 package (8 oz) egg noodles', 'egg noodles'],
    ['1 lb chicken sausage', 'sausage'],
    ['1 can ranch style beans', 'beans'],
    ['1 chipotle pepper in adobo sauce, minced', 'chipotle in adobo'],
    ['2 cups mustard greens', 'kale'],
    ['1 tsp garlic powder', 'garlic powder'],
    ['5 cloves garlic', 'garlic'],
    ['1/2 cup potato starch', 'cornstarch'],
    ['2 cups frozen edamame, thawed', 'peas'],
    ['1 cup frozen peas and carrots', 'peas'],
    ['1 cup spam, cubed', 'core:spam']
  ];
  cases.forEach(([l, want]) => ok(read(l) === want, 'reads "' + l + '" -> ' + read(l)));
  ok(X.readIngredient('1/4 cup cilantro, for garnish').optional && X.readIngredient('hot sauce (optional)').optional, 'garnish and optional lines are optional');

  // ---------- typed kitchen items ----------
  const typed = [['chicken thighs', 'chicken'], ['hamburger', 'ground beef'], ['Cheddar', 'cheese'], ['leftover rice', 'rice'], ['half and half', 'heavy cream'], ['jalapenos', 'chiles'], ['spam', 'x:spam']];
  typed.forEach(([t, id]) => ok(X.lookupFood(t).id === id, 'typed "' + t + '" -> ' + X.lookupFood(t).id));

  // ---------- checking recipes against a kitchen ----------
  const P = X.makePantry(['chicken thighs', 'eggs', 'soy sauce', 'honey', 'ketchup', 'garlic', 'rice'].map(X.lookupFood), X.DEFAULT_BASICS);
  const korean = ['1.5 lbs boneless, cut into 1 in pieces', '4 tbsp soy sauce', '1 large egg', '1/2 tsp salt', '1/4 tsp black pepper', '1 tsp garlic powder', '1/2 cup potato starch', '1/4 cup gochujang', '2 tbsp brown sugar', '2 tbsp honey', '1 tbsp rice vinegar', '1 tbsp ketchup', '1 tbsp sesame oil', '5 cloves garlic', '1 tbsp butter'];
  const m1 = X.matchRecipe(korean, P, 'Korean Popcorn Chicken');
  ok(m1.need === 11 && m1.have === 6 && J(m1.missing) === J(['Cornstarch', 'Gochujang', 'Brown sugar', 'Rice vinegar', 'Sesame oil']) && J(m1.spices) === J(['Garlic powder']), 'Korean popcorn chicken: chicken from the title, basics skipped, spices apart -> ' + J(m1));
  // spices are listed apart, and "Usual spices" covers them
  const tacos = ['1 lb ground beef', '8 small tortillas', '1 tbsp chili powder', '1 tsp cumin', '1 tsp paprika', '1/2 tsp garlic powder', '2 tbsp tomato paste', 'shredded cheese, for serving'];
  const t1 = X.matchRecipe(tacos, X.makePantry(['ground beef', 'tortillas', 'tomato paste'].map(X.lookupFood), X.DEFAULT_BASICS), 'Ground Beef Tacos');
  ok(t1.main && !t1.ready && t1.spices.length === 4 && t1.need === 3, 'tacos: have the main stuff, 4 spices to check -> ' + J(t1));
  const t2 = X.matchRecipe(tacos, X.makePantry(['ground beef', 'tortillas', 'tomato paste'].map(X.lookupFood), X.DEFAULT_BASICS.concat(['spices'])), 'Ground Beef Tacos');
  ok(t2.ready && !t2.spices.length, 'tacos: ready when usual spices are on hand');
  // several foods typed at once
  ok(J(X.splitFoods('chicken rice beans cheese').map(x => x.id)) === J(['chicken', 'rice', 'beans', 'cheese']), 'typed without commas: chicken rice beans cheese -> 4 foods');
  ok(J(X.splitFoods('chicken spam rice').map(x => x.id)) === J(['chicken', 'x:spam', 'rice']), 'typed without commas keeps unknown foods -> ' + J(X.splitFoods('chicken spam rice')));
  ok(X.splitFoods('boneless skinless chicken thighs').length === 1 && X.splitFoods('half and half')[0].id === 'heavy cream' && X.splitFoods('cream of chicken soup').length === 1, 'one food stays one food');
  // categories
  const cat = (t, c) => J(X.recipeCats({ title: t, category: c || '' }));
  [['Cheesy Salsa Chicken and Rice', '', '["main"]'], ['Creamy Chicken & Wild Rice Soup', '', '["soups"]'], ['Chocolate Chip Cookies', '', '["desserts","baking"]'],
   ['Banana Bread', '', '["baking","bread"]'], ['Mexican Rice', 'Side Dish', '["sides"]'], ['Garlic Mashed Potatoes', '', '["sides"]'], ['Buffalo Chicken Dip', '', '["apps"]'],
   ['Easy Salsa', '', '["apps"]'], ['Breakfast Burritos', '', '["breakfast"]'], ['Taco Salad', '', '["salads"]'], ['Horchata', '', '["drinks"]'], ['Chicken Pot Pie', '', '["main"]'],
   ['Chili Lime Chicken', '', '["main"]'], ['Beef Chili', '', '["soups"]'], ['Egg Rolls', '', '["apps"]'], ['Dinner Rolls', '', '["baking","bread"]'], ['Honey Garlic Chicken', 'Main Course', '["main"]']]
    .forEach(([t, c, want]) => ok(cat(t, c) === want, 'category of "' + t + '" -> ' + cat(t, c)));
  ok(J(X.recipeCats({ title: 'Grandma\'s Special', meal: ['Dessert'] })) === '["desserts"]', 'saved recipe meal type counts');
  const ench = ['## For the enchiladas', '2 cups shredded chicken', '10 corn tortillas', '2 cups shredded Mexican cheese', '1 (10 oz) can red enchilada sauce', '## Toppings', 'sour cream', 'sliced green onions', 'cilantro'];
  const m2 = X.matchRecipe(ench, X.makePantry(['chicken', 'tortillas', 'cheese', 'enchilada sauce'].map(X.lookupFood), X.DEFAULT_BASICS));
  ok(m2.ready && m2.need === 4, 'enchiladas: toppings section is optional, ready to cook -> ' + J(m2));
  const m3 = X.matchRecipe(['1 can black beans', '1 cup cheddar', '2 cups chicken broth', '1 cup shredded mozzarella', '1/4 cup parmesan'], X.makePantry(['beans', 'cheese', 'broth'].map(X.lookupFood), []));
  ok(m3.have === 4 && J(m3.missing) === J(['Parmesan']), '"beans", "cheese", "broth" cover the kinds, but not parmesan -> ' + J(m3.missing));
  const m4 = X.matchRecipe(['2 cups beef broth'], X.makePantry(['chicken broth'].map(X.lookupFood), []));
  ok(!m4.ready, 'chicken broth doesn\'t count as beef broth');
  const m5 = X.matchRecipe(['2 cups broth', '1 cup shredded cheese'], X.makePantry(['chicken broth', 'mozzarella'].map(X.lookupFood), []));
  ok(m5.ready, 'a recipe that just says "broth" or "cheese" takes any kind');
  const m6 = X.matchRecipe(['1 lb ground beef', '2 cups rice', '1 cup spam, cubed'], X.makePantry(['hamburger', 'spam'].map(X.lookupFood), []));
  ok(m6.have === 2 && J(m6.missing) === J(['Rice']), 'foods the list doesn\'t know (spam) still match -> ' + J(m6));
  const m7 = X.matchRecipe(['1 lb ground beef', '2 tsp brown sugar'], X.makePantry(['ground beef'].map(X.lookupFood), ['sugar']));
  ok(!m7.ready, 'having sugar doesn\'t count as brown sugar');

  // ---------- /api/cook with a fake internet ----------
  const wpList = JSON.stringify([
    { link: 'https://www.recipetineats.com/chicken-broccoli-stir-fry/', title: { rendered: 'Chicken Broccoli Stir Fry' }, jetpack_featured_media_url: 'https://www.recipetineats.com/a.jpg' },
    { link: 'https://www.recipetineats.com/25-chicken-recipes/', title: { rendered: '25 Chicken Recipes' } },
    { link: 'https://www.recipetineats.com/lemon-cake/', title: { rendered: 'Lemon Cake' } }
  ]);
  const page = (name, ing) => '<html><head><script type="application/ld+json">' + JSON.stringify({ '@type': 'Recipe', name, image: 'https://x/big.jpg', recipeIngredient: ing, totalTime: 'PT25M', recipeYield: '4 servings' }) + '</script></head></html>';
  const pages = {
    'https://www.recipetineats.com/chicken-broccoli-stir-fry/': page('Chicken and Broccoli Stir Fry Recipe by Tasty', ['1 lb chicken breast', '3 cups broccoli florets', '3 tbsp soy sauce', '1 tbsp cornstarch']),
    'https://www.recipetineats.com/lemon-cake/': page('Lemon Cake', ['2 cups flour'])
  };
  global.fetch = async (url) => {
    let body = pages[url];
    if (body == null && /recipetineats\.com\/wp-json\/wp\/v2\/posts/.test(url)) body = wpList;
    if (body == null) return { status: 404, ok: false, headers: new Map(), text: async () => '' };
    return { status: 200, ok: true, headers: new Map([['content-type', 'text/html']]), text: async () => body };
  };
  const cook = require(path.join(R, 'api/cook.js'));
  const call = q => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, end() { resolve({ code: this.code }); } };
    cook({ method: 'GET', headers: {}, query: q }, res);
  });
  const r1 = await call({ q: 'chicken broccoli|chicken rice' });
  const it = r1.body.items;
  ok(r1.code === 200 && it.length === 1 && it[0].title === 'Chicken and Broccoli Stir Fry' && it[0].ingredients.length === 4 && it[0].totalTime === 25 && it[0].servings === 4, 'cook: finds the recipe and reads its ingredients, skips roundups and short lists -> ' + J(it.map(x => [x.title, x.ingredients.length])));
  ok(it[0].image === 'https://www.recipetineats.com/a.jpg' && it[0].sourceName === 'RecipeTin Eats', 'cook: keeps the card photo and site name');
  ok(/s-maxage/.test(r1.headers['Cache-Control']) && J(r1.body.q) === J(['chicken broccoli', 'chicken rice']), 'cook: several searches in one q, answers cached -> ' + J(r1.body.q));
  const r3 = await call({ q: 'chicken broccoli', have: 'chicken,broccoli,soy sauce' });
  ok(r3.code === 200 && r3.body.items.length === 1, 'cook: takes the kitchen list');
  const r2 = await call({});
  ok(r2.code === 400, 'cook: asks for something to search');
  const mm = X.matchRecipe(it[0].ingredients, X.makePantry(['chicken', 'broccoli', 'soy sauce'].map(X.lookupFood), X.DEFAULT_BASICS), it[0].title);
  ok(mm.need === 4 && J(mm.missing) === J(['Cornstarch']), 'cook: the phone can check it -> ' + J(mm));

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
