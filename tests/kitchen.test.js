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

// What you'll need: cookware read from the directions, in step order, then the recipe's list, then good guesses
const G = r => K.gearFor(r).map(g => g.name + (g.kind === 'step' ? '' : g.kind === 'list' ? ' [list]' : g.kind === 'likely' ? ' [likely]' : ' [suggested]')).join(' | ');
const ench = G({ title: 'Chicken Enchiladas', ingredients: ['1 (10 oz) can red enchilada sauce', '2 cups shredded cooked chicken', '8 flour tortillas'], steps: [
  'Preheat oven to 375°F.', 'In a large skillet over medium heat, cook the onion until soft.', 'Spread 1/2 cup sauce in the bottom of a 9 x 13 inch baking dish.',
  'In a medium bowl, mix the cheese and sour cream.', 'Cover with foil and bake 20 minutes.'] });
ok(ench === 'Oven, heated to 375°F | Large skillet | 9x13 baking dish | Medium mixing bowl | Aluminum foil | Can opener [likely] | Meat thermometer [suggested]', 'enchiladas -> ' + ench);
const k1 = K.gearFor({ steps: ['Preheat oven to 375°F.', 'In a large skillet, cook it.'] });
ok(k1[0].why === 'Step 1' && k1[1].why === 'Step 2' && k1[1].step === 2, 'each item says which step it came from');
const pasta = G({ title: 'Carbonara', steps: ['Bring a large pot of salted water to a boil and cook the spaghetti. Drain.', 'Cook the pancetta in a 12-inch skillet.', 'Whisk the eggs and cheese.'] });
ok(pasta === 'Large pot | 12-inch skillet | Whisk | Colander [likely]', 'pasta: pot, skillet, whisk, and a colander for "drain" -> ' + pasta);
const roast = G({ title: 'Slow Cooker Pot Roast', ingredients: ['3 lb chuck roast'], steps: ['Sear in a hot cast iron skillet on all sides.', 'Put it in a 6-quart slow cooker and set the pot roast on the vegetables.'] });
ok(roast === 'Cast iron skillet | 6-quart slow cooker | Meat thermometer [suggested]', '"pot roast" is not a pot; sizes kept -> ' + roast);
const air = G({ title: 'Air Fryer Wings', ingredients: ['2 lbs chicken wings', '1 tbsp baking powder'], steps: ['Toss with baking powder in a large bowl.', 'Air fry at 380°F for 20 minutes.'] });
ok(air === 'Large mixing bowl | Air fryer | Meat thermometer [suggested]', 'air fryer recipe: no oven, "baking powder" is not baking -> ' + air);
const cookies = G({ title: 'Cookies', steps: ['Preheat the oven to 350 degrees F. Line baking sheets with parchment paper.', 'Cream the butter and sugars until light and fluffy.', 'Bake 10 minutes. Cool on a wire rack.'] });
ok(cookies === 'Oven, heated to 350°F | Baking sheets | Parchment paper | Wire rack | Hand or stand mixer [likely]', 'cookies, the recipe\'s own words ("baking sheets") -> ' + cookies);
const mash = G({ title: 'Mashed Potatoes', steps: ['Cover the potatoes with water and bring to a boil.', 'Simmer 15 minutes. Drain well.', 'Mash the potatoes with the butter.'] });
ok(mash === 'Pot or saucepan [likely] | Colander [likely] | Potato masher or fork [likely]', 'unnamed pot, colander, masher are marked likely -> ' + mash);
ok(K.gearFor({ steps: ['Bring to a boil.', 'Drain.'] }).find(g => g.id === 'pot').why === 'Likely: for boiling in step 1', 'a guess says why');
const fry = G({ title: 'Popcorn Chicken', steps: ['Heat 2 inches of oil to 350°F.', 'Fry in batches. Drain on paper towels.', 'Toss in the sauce in a large pan over medium heat.'] });
ok(fry === 'Paper towels | Large pan | Deep pot or fryer [likely] | Thermometer [suggested]', 'frying: "drain on paper towels" is not a colander -> ' + fry);
const fat = G({ steps: ['Brown the beef in a skillet and drain the grease.'] });
ok(fat === 'Skillet', '"drain the grease" is not a colander -> ' + fat);
ok(G({ title: 'Grilled Cheese', steps: ['Cook in a nonstick pan over medium heat until golden.'] }) === 'Nonstick pan', 'grilled cheese: a pan, not a grill');
ok(G({ title: 'Chicken Soup', ingredients: ['2 chicken breasts'], steps: ['Simmer in a large Dutch oven.', 'Shred the chicken.'] }) === 'Large Dutch oven | Two forks (for shredding) [likely] | Meat thermometer [suggested]', 'Dutch oven means no extra pot; shredding means forks');
const lst = G({ equipment: ['9x13 Baking Dish', 'KitchenAid Stand Mixer', 'Measuring cups'], steps: ['Mix the batter.', 'Pour into the pan and bake at 350 for 30 minutes.'] });
ok(lst === 'Oven, heated to 350°F | 9x13 Baking Dish [list] | KitchenAid Stand Mixer [list] | Measuring cups [list]', 'the recipe\'s own list, in its words -> ' + lst);
ok(G({ steps: ['Serve in bowls.', 'Divide among bowls and top with cheese.'] }) === '', 'serving bowls are not mixing bowls');
ok(!K.gearFor({ ingredients: ['1 tsp salt'], steps: [] }).length, 'no directions, nothing guessed');
ok(!K.gearFor({ ingredients: ['You can use any cheese you like'], steps: ['Mix.'] }).some(g => g.id === 'canopener'), '"you can use" is not a can');
const heard = K.gearHeard("okay so first I'm browning the chicken right in my Dutch oven. then throw these in the air fryer. grab a big bowl and whisk it up, then ladle it out");
ok(heard.join() === 'Air fryer,Dutch oven,Large mixing bowl,Ladle', 'cookware heard in a video -> ' + heard.join());
const said = K.gearFor({ steps: [], speech: 'brown it in my Dutch oven then grab a big bowl', ingredients: ['1 lb ground beef'] });
ok(said.map(g => g.name + ':' + g.why).join(' | ') === 'Dutch oven:Said in the video | Large mixing bowl:Said in the video | Meat thermometer:Suggested: to check the ground beef is done', 'no written steps: cookware said in the video goes on the list -> ' + said.map(g => g.name + ':' + g.why).join(' | '));
ok(!K.gearHeard('whisk it all together and bake it').length, 'talk about whisking or baking alone is not a list of cookware');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
