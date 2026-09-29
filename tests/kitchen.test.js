// Offline tests for ingredient swaps and cookware tips (lib/kitchen.js).
const path = require('path');
const R = path.join(__dirname, '..');
const K = require(path.join(R, 'lib/kitchen.js'));
const P = require(path.join(R, 'lib/pantry.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const sw = l => { const x = K.swapFor(l); return x ? x.id : ''; };

// every food a swap uses is one the kitchen list knows
const unknown = [];
K.SWAPS.forEach(s => s.o.forEach(o => (o.n || []).flat().forEach(id => { if (!P.LABEL[id] && id.indexOf('x:') !== 0) unknown.push(s.id + ' -> ' + id); })));
ok(!unknown.length, 'swaps only use known foods ' + unknown.join(', '));
ok(K.SWAPS.every(s => s.o.every(o => o.t && o.d && (o.src === 'ext' || o.src === 'kitchen'))), 'every swap has a title, how-to, and source');

// the right swap for a line
[['1 cup buttermilk', 'buttermilk'], ['1 cup whole milk', 'milk'], ['1 (13.5 oz) can coconut milk', ''], ['1/2 cup sour cream', 'sour cream'],
 ['1 cup heavy whipping cream', 'heavy cream'], ['1 cup half-and-half', 'half and half'], ['2 large eggs', 'eggs'], ['2 egg yolks', ''], ['1 eggplant, diced', ''],
 ['1/2 cup unsalted butter, softened', 'butter'], ['2 tbsp peanut butter', ''], ['1 tsp baking powder', 'baking powder'], ['2 cups self-rising flour', 'self rising flour'],
 ['1/2 cup potato starch (or cornstarch)', 'potato starch'], ['2 tbsp cornstarch', 'cornstarch'], ['1 cup packed light brown sugar', 'brown sugar'],
 ["1 cup confectioners' sugar", 'powdered sugar'], ['2 tbsp honey', 'honey'], ['1 tbsp honey mustard', ''], ['3 cloves garlic, minced', 'garlic'], ['1 tsp garlic powder', 'garlic powder'],
 ['1 medium yellow onion, diced', 'onion'], ['3 green onions, sliced', 'green onions'], ['1 tsp onion powder', ''], ['1 tbsp grated fresh ginger', 'ginger'],
 ['2 jalapeños, seeded', 'jalapeno'], ['Juice of 1 lemon', 'lemon'], ['1 tbsp lime juice', 'lime'], ['1 (15 oz) can tomato sauce', 'tomato sauce'],
 ['2 tbsp tomato paste', 'tomato paste'], ['4 cups low sodium chicken broth', 'broth'], ['1/2 cup dry white wine', 'wine'], ['2 tbsp red wine vinegar', ''],
 ['1 tbsp rice vinegar', 'rice vinegar'], ['1/4 cup soy sauce', 'soy sauce'], ['1/4 cup gochujang', 'gochujang'], ['1 tbsp toasted sesame oil', 'sesame oil'],
 ['1 can cream of chicken soup', 'cream soup'], ['1 cup panko', 'breadcrumbs'], ['1 lb lean ground beef', 'ground beef'], ['2 lbs boneless chicken thighs', 'chicken thighs'],
 ['1 tbsp fresh basil', 'fresh herbs'], ['1/4 cup chopped cilantro', 'cilantro'], ['2 tsp chili powder', 'chili powder'], ['1/2 tsp salt', '']]
  .forEach(([l, want]) => ok(sw(l) === want, 'swap for "' + l + '" -> ' + (sw(l) || 'none')));

// "You have it" only when the kitchen has every part
const kit = P.makePantry([{ id: 'milk' }, { id: 'lemon' }], P.DEFAULT_BASICS);
const bm = K.swapFor('1 cup buttermilk');
ok(K.swapHave(bm.o[0], kit) && !K.swapHave(bm.o[1], kit), 'buttermilk: milk + lemon counts as on hand, yogurt does not');
ok(!K.swapHave(K.swapFor('1 egg').o[0], kit), 'a swap that uses nothing we can check never says "you have it"');
ok(K.swapHave(K.swapFor('1 cup honey').o[0], kit), 'basics count (sugar for honey)');
const bs = K.swapFor('1 cup brown sugar');
ok(P.lookupFood('cream of tartar').id === 'cream of tartar', 'typing "cream of tartar" is not heavy cream');
ok(!K.swapHave(bs.o[0], kit) && K.swapHave(bs.o[0], P.makePantry([P.lookupFood('molasses')], P.DEFAULT_BASICS)), 'sugar + molasses only counts when molasses is in your kitchen');

// cookware and tips
const T = r => K.toolsFor(r).tools.map(x => x.id).join(',');
ok(T({ title: 'Korean Popcorn Chicken', ingredients: ['1.5 lbs chicken thighs', 'Oil for frying'], steps: ['Heat the oil to 350°F in a heavy pot.', 'Fry until golden and crisp.'] }) === 'fry', 'frying recipe -> frying tip');
ok(T({ title: 'Air Fryer Wings', steps: ['Air fry at 400°F for 20 minutes, shaking halfway.'] }) === 'air', 'air fryer is not deep frying -> ' + T({ title: 'Air Fryer Wings', steps: ['Air fry at 400°F for 20 minutes, shaking halfway.'] }));
ok(T({ title: 'Grilled Cheese', steps: ['Butter the bread and cook in a skillet until golden.'] }) === 'skillet', 'grilled cheese is a skillet, not a grill');
ok(T({ title: 'Banana Bread', steps: ['Mix until just blended.', 'Pour into a greased 9x5 loaf pan.'] }) === 'loaf', '"mix until blended" is not a blender');
ok(T({ title: 'Chili', steps: ['Brown the beef in a Dutch oven.', 'Transfer to a slow cooker and cook on low 8 hours.'] }) === 'dutch,slow', 'chili browned in a Dutch oven: no extra skillet tip -> ' + T({ title: 'Chili', steps: ['Brown the beef in a Dutch oven.', 'Transfer to a slow cooker and cook on low 8 hours.'] }));
ok(T({ title: 'Slow Cooker Pot Roast', steps: ['Sear the roast in a skillet.', 'Move it to the slow cooker.'] }) === 'slow,skillet', 'a skillet the recipe names stays');
ok(T({ title: 'Beef Stir-Fry', steps: ['Stir fry the beef in a hot skillet.'] }) === 'wok', 'stir fry keeps the wok tip, not two pan tips');
ok(T({ title: 'Tomato Soup', steps: ['Carefully puree the soup in a blender.'] }) === 'blender', 'hot soup -> blender tip');
ok(T({ title: 'Enchiladas', steps: ['Pour sauce into a 9x13 baking dish.', 'Bake at 350°F.'] }) === 'dish', 'baking dish tip');
const eggs = K.toolsFor({ title: 'Pinto Beans', steps: ['Cook on high pressure for 45 minutes, then natural release.'], equipment: ['Instant Pot', 'Wooden spoon'] });
ok(eggs.tools.map(x => x.id).join() === 'pressure' && eggs.extra.join() === 'Wooden spoon', 'recipe cookware: Instant Pot gets a tip, the spoon is listed as is');
const temps = K.toolsFor({ title: 'Chicken and Sausage Bake', ingredients: ['1 lb chicken thighs', '1 lb Italian sausage', '1 salmon fillet'] }).temps;
ok(temps.length === 4 && /165/.test(temps[0]) && /160/.test(temps[1]) && /145/.test(temps[2]) && /Casseroles/.test(temps[3]), 'safe temps for the meat in it -> ' + temps.join(' | '));
ok(!K.toolsFor({ title: 'Salad', ingredients: ['lettuce', 'tomato'] }).temps.length, 'no meat, no temps');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
