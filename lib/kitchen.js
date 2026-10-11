// Ingredient swaps and cookware tips for the recipe page.
// Shared by the app (tools/sync_caption.py copies the marked block into tools/app.html) and the tests.
// It uses the food reader in lib/pantry.js (normFood, foodsIn, pantryHas, LABEL).
//
// Where the facts come from (checked Sept 28, 2026):
// - Swap amounts marked src 'ext' come from university extension charts: North Dakota State FN198
//   (reprinted by Purdue as HHS-784-W), Missouri Extension "In a Pinch: Ingredient Substitution" (MP564),
//   Utah State Extension "List of Ingredient Substitutions", and Arkansas Extension HE-198.
// - Swaps marked src 'kitchen' are everyday like-for-like swaps (lime for lemon, Pecorino for Parmesan),
//   written without made-up precision.
// - Safe temperatures: FoodSafety.gov / USDA chart. Deep frying: USDA FSIS "Deep Fat Frying and Food Safety".
//   Slow cookers: Clemson HGIC "Slow Cooker Food Safety" (from USDA). Pressure cookers: Instant Pot manual
//   (2/3 max, 1/2 for foods that expand, minimum liquid). Glass bakeware: Pyrex safety and usage page.
//   Hot blending: Waring blender manual (small amount, remove the center of the lid, start on low).
const { normFood, foodsIn, pantryHas, customHas, LABEL } = require('./pantry');

/* ---- kitchen help: swaps and cookware tips ---- */
// n = what the swap uses, as food ids from lib/pantry.js; an inner list means any one of them. 'x:molasses' is
// something the kitchen list only knows if you typed it in yourself.
// The app says "You have it" when every part is in your kitchen.
const SWAPS = [
  // dairy
  {id:'buttermilk', name:'Buttermilk', m:'buttermilk', o:[
    {t:'Milk + lemon juice or vinegar', d:'For 1 cup: put 1 tbsp lemon juice or white vinegar in a measuring cup, add milk up to 1 cup, and let it sit 5 minutes.', n:['milk', ['lemon', 'vinegar']], src:'ext'},
    {t:'Plain yogurt', d:'Same amount. Thin it with a splash of milk if it\'s thick.', n:['yogurt'], src:'ext'}]},
  {id:'sour cream', name:'Sour cream', m:'sour cream', o:[
    {t:'Plain yogurt', d:'Same amount. Greek yogurt is closest in thickness.', n:['yogurt'], src:'ext'}]},
  {id:'heavy cream', name:'Heavy cream', m:'heavy (whipping )?cream|whipping cream|double cream', o:[
    {t:'Milk + butter', d:'For 1 cup: 3/4 cup milk plus 1/3 cup melted butter. Fine for cooking and baking, but it won\'t whip.', n:['milk', 'butter'], src:'ext'},
    {t:'Half-and-half', d:'Same amount in soups and sauces. It\'s thinner and can curdle if it boils hard, so keep it at a simmer.', n:[], src:'kitchen'}]},
  {id:'half and half', name:'Half-and-half', m:'half and half', o:[
    {t:'Milk + butter', d:'For 1 cup: 7/8 cup milk (1 cup minus 2 tbsp) plus 1/2 tbsp melted butter.', n:['milk', 'butter'], src:'ext'},
    {t:'Evaporated milk', d:'Same amount, straight from the can.', n:['canned milk'], src:'ext'}]},
  {id:'milk', name:'Milk', m:'(?<!coconut |condensed |evaporated |almond |oat |soy |rice )(whole |2% |skim |low fat |nonfat )?milk', o:[
    {t:'Evaporated milk + water', d:'For 1 cup: 1/2 cup evaporated milk plus 1/2 cup water.', n:['canned milk'], src:'ext'},
    {t:'Unsweetened oat, almond, or soy milk', d:'Same amount. The flavor changes a little.', n:[], src:'kitchen'}]},
  {id:'yogurt', name:'Yogurt', m:'(plain |greek |whole milk )*yogh?urt', o:[
    {t:'Sour cream or buttermilk', d:'Same amount.', n:[['sour cream', 'buttermilk']], src:'ext'}]},
  {id:'mayo', name:'Mayo', m:'mayo(nnaise)?', o:[
    {t:'Plain yogurt or sour cream', d:'Same amount. Tangier and lighter.', n:[['yogurt', 'sour cream']], src:'ext'}]},
  {id:'cream cheese', name:'Cream cheese', m:'cream cheese', o:[
    {t:'Neufchatel', d:'Same amount. It\'s a little softer and lighter.', n:[], src:'kitchen'}]},
  {id:'ricotta', name:'Ricotta', m:'ricotta', o:[
    {t:'Cottage cheese', d:'Same amount. Blend it smooth first if the texture matters.', n:[], src:'kitchen'}]},
  {id:'parmesan', name:'Parmesan', m:'parmesan|parmigiano( reggiano)?', o:[
    {t:'Pecorino Romano', d:'Same amount. It\'s saltier, so go easy on added salt.', n:[], src:'kitchen'}]},
  {id:'cheddar', name:'Cheddar', m:'(sharp |mild |medium |white )?cheddar', o:[
    {t:'Colby Jack or Monterey Jack', d:'Same amount. Milder, and melts well.', n:[], src:'kitchen'}]},
  {id:'jack', name:'Monterey Jack', m:'(monterey |pepper )jack', o:[
    {t:'Mozzarella or mild cheddar', d:'Same amount.', n:[['mozzarella', 'cheese']], src:'kitchen'}]},
  {id:'mozzarella', name:'Mozzarella', m:'mozzarella', o:[
    {t:'Provolone or Monterey Jack', d:'Same amount. Both melt well.', n:[], src:'kitchen'}]},
  {id:'eggs', name:'Egg', m:'eggs?(?! (yolks?|whites?|wash|noodles))', o:[
    {t:'Ground flaxseed + water (baking only)', d:'For 1 egg: 1 tbsp ground flaxseed stirred into 3 tbsp water. Let it sit 5 minutes until thick. Works for holding muffins, cookies, and quick breads together, not where eggs are the main thing.', n:[], src:'kitchen'}]},
  {id:'butter', name:'Butter', m:'(?<!peanut |almond |apple |cashew |nut |cookie )(unsalted |salted |melted |softened |cold )?butter(?! beans| lettuce)', o:[
    {t:'Stick margarine', d:'Same amount.', n:[], src:'ext'},
    {t:'Cooking oil (for the stove)', d:'For sauteing or greasing a pan, use oil instead. Not a good swap in cookies or pie crust.', n:['oil'], src:'kitchen'}]},
  {id:'shortening', name:'Shortening', m:'shortening|crisco', o:[
    {t:'Butter', d:'For 1 cup: 1 1/8 cups butter (1 cup plus 2 tbsp). Baked goods may spread a little more.', n:['butter'], src:'ext'}]},
  // baking
  {id:'baking powder', name:'Baking powder', m:'baking powder', o:[
    {t:'Baking soda + cream of tartar', d:'For 1 tsp: 1/4 tsp baking soda plus 5/8 tsp cream of tartar (a heaping 1/2 tsp).', n:['baking soda', 'cream of tartar'], src:'ext'}]},
  {id:'self rising flour', name:'Self-rising flour', m:'self rising flour', o:[
    {t:'Flour + baking powder + salt', d:'For 1 cup: 1 cup all-purpose flour minus 2 tsp, plus 1 1/2 tsp baking powder and 1/2 tsp salt.', n:['flour', 'baking powder'], src:'ext'}]},
  {id:'cake flour', name:'Cake flour', m:'cake flour', o:[
    {t:'All-purpose flour', d:'For 1 cup: 1 cup minus 2 tbsp all-purpose flour, sifted.', n:['flour'], src:'ext'}]},
  {id:'cornstarch', name:'Cornstarch', m:'corn ?starch', o:[
    {t:'Flour (for thickening)', d:'For 1 tbsp cornstarch: 2 tbsp all-purpose flour. Let it simmer a couple minutes so it doesn\'t taste floury.', n:['flour'], src:'ext'},
    {t:'Potato starch or arrowroot', d:'Same amount, for thickening or coating.', n:[], src:'kitchen'}]},
  {id:'potato starch', name:'Potato starch', m:'potato starch', o:[
    {t:'Cornstarch', d:'Same amount. Works for coating and thickening.', n:['cornstarch'], src:'kitchen'}]},
  {id:'brown sugar', name:'Brown sugar', m:'(light |dark |packed )*brown sugar', o:[
    {t:'White sugar + molasses', d:'For 1 cup: 1 cup white sugar plus 1/4 cup molasses.', n:['sugar', 'molasses'], src:'ext'},
    {t:'Just white sugar', d:'Same amount. A little less rich and chewy.', n:['sugar'], src:'ext'}]},
  {id:'powdered sugar', name:'Powdered sugar', m:'powdered sugar|confectioners\'? sugar|icing sugar', o:[
    {t:'White sugar (in batters only)', d:'For 1 cup: 3/4 cup white sugar. Not for frosting or dusting, since it won\'t be smooth.', n:['sugar'], src:'ext'}]},
  {id:'honey', name:'Honey', m:'honey(?! mustard| ham| roasted)', o:[
    {t:'Sugar + water', d:'For 1 cup: 1 1/4 cups sugar plus 1/4 cup water.', n:['sugar'], src:'ext'},
    {t:'Maple syrup', d:'Same amount. The flavor changes a little.', n:['maple syrup'], src:'kitchen'}]},
  {id:'maple syrup', name:'Maple syrup', m:'(pure )?maple syrup', o:[
    {t:'Honey', d:'Same amount. The flavor changes a little.', n:['honey'], src:'kitchen'}]},
  {id:'corn syrup', name:'Corn syrup', m:'(light |dark )?corn syrup', o:[
    {t:'Sugar + water', d:'For 1 cup: 1 cup sugar plus 1/4 cup water.', n:['sugar'], src:'ext'},
    {t:'Honey', d:'Same amount.', n:['honey'], src:'ext'}]},
  {id:'unsweetened chocolate', name:'Unsweetened chocolate', m:'unsweetened (baking )?chocolate|baking chocolate', o:[
    {t:'Cocoa powder + butter or oil', d:'For 1 oz: 3 tbsp cocoa powder plus 1 tbsp butter or oil.', n:['cocoa'], src:'ext'}]},
  {id:'semisweet chocolate', name:'Semisweet chocolate', m:'semi ?sweet (baking )?chocolate(?! chips| chunks)', o:[
    {t:'Unsweetened chocolate + sugar', d:'For 1 oz: 1/2 oz unsweetened chocolate plus 1 tbsp sugar.', n:['chocolate', 'sugar'], src:'ext'}]},
  {id:'yeast', name:'Yeast', m:'(active dry |instant |rapid rise )?yeast', o:[
    {t:'The other kind of dry yeast', d:'Active dry and instant (rapid rise) yeast swap 1 for 1. One packet is 2 1/4 tsp. If you use active dry, dissolve it in the recipe\'s warm liquid first.', n:[], src:'kitchen'}]},
  // spices and herbs
  {id:'allspice', name:'Allspice', m:'(ground )?allspice', o:[
    {t:'Cinnamon + cloves', d:'For 1 tsp: 1/2 tsp cinnamon and 1/2 tsp ground cloves.', n:['cinnamon', 'cloves'], src:'ext'}]},
  {id:'pumpkin pie spice', name:'Pumpkin pie spice', m:'pumpkin (pie )?spice', o:[
    {t:'Your own mix', d:'For 1 tsp: 1/2 tsp cinnamon, 1/4 tsp ground ginger, 1/8 tsp allspice, and 1/8 tsp nutmeg.', n:['cinnamon', 'ground ginger', 'allspice', 'nutmeg'], src:'ext'}]},
  {id:'chili powder', name:'Chili powder', m:'chil(i|e) powder', o:[
    {t:'Paprika + cumin', d:'Mix paprika and cumin with a pinch of cayenne and oregano. Taste as you go.', n:['paprika', 'cumin'], src:'kitchen'}]},
  {id:'italian seasoning', name:'Italian seasoning', m:'italian seasoning', o:[
    {t:'Dried basil, oregano, and thyme', d:'Equal parts of whatever you have. Add a little rosemary if you like.', n:[['oregano', 'basil', 'thyme']], src:'kitchen'}]},
  {id:'cayenne', name:'Cayenne', m:'cayenne( pepper)?', o:[
    {t:'Red pepper flakes or hot sauce', d:'Start with a pinch or a few dashes and taste.', n:[['red pepper flakes', 'hot sauce']], src:'kitchen'}]},
  {id:'red pepper flakes', name:'Red pepper flakes', m:'(crushed )?red pepper flakes|chil(i|e) flakes', o:[
    {t:'Cayenne or hot sauce', d:'Cayenne is hotter, so use about half as much.', n:[['cayenne', 'hot sauce']], src:'kitchen'}]},
  {id:'dry mustard', name:'Dry mustard', m:'dry mustard|mustard powder|ground mustard', o:[
    {t:'Prepared mustard', d:'For 1 tsp dry mustard: 1 tbsp regular mustard.', n:['mustard'], src:'ext'}]},
  {id:'fresh herbs', name:'Fresh herbs', m:'fresh (basil|oregano|thyme|rosemary|dill|parsley|mint|sage|tarragon)', o:[
    {t:'Dried herbs', d:'For 1 tbsp fresh: 1 tsp dried.', n:[], src:'ext'}]},
  {id:'dried herbs', name:'Dried herbs', m:'dried (basil|oregano|thyme|rosemary|dill|parsley|mint|sage|tarragon)', o:[
    {t:'Fresh herbs', d:'For 1 tsp dried: 1 tbsp fresh, chopped.', n:[], src:'ext'}]},
  {id:'cilantro', name:'Cilantro', m:'cilantro', o:[
    {t:'Parsley + a squeeze of lime', d:'Same amount of parsley. It won\'t taste like cilantro, but it adds the fresh green.', n:['parsley'], src:'kitchen'}]},
  {id:'green onions', name:'Green onions', m:'(green|spring) onions?|scallions?', o:[
    {t:'Chives or a little onion', d:'Same amount of chives, or a smaller amount of finely chopped onion.', n:[], src:'kitchen'}]},
  {id:'chives', name:'Chives', m:'chives', o:[
    {t:'Green onion tops', d:'Finely chopped, about the same amount.', n:['green onions'], src:'ext'}]},
  // produce
  {id:'garlic', name:'Garlic', m:'(fresh |minced |chopped )?garlic( cloves?)?(?! powder| salt)|cloves? (of )?garlic', o:[
    {t:'Garlic powder', d:'For 1 clove: 1/8 tsp garlic powder.', n:['garlic powder'], src:'ext'}]},
  {id:'garlic powder', name:'Garlic powder', m:'garlic powder', o:[
    {t:'Fresh garlic', d:'For 1/8 tsp garlic powder: 1 clove, minced.', n:['garlic'], src:'ext'}]},
  {id:'onion', name:'Onion', m:'(?<!green |spring )(yellow |white |sweet |red )?onions?(?! powder)', o:[
    {t:'Dried minced onion', d:'For 1 small onion: 1 tbsp dried minced onion, soaked in a little water first.', n:[], src:'ext'},
    {t:'Onion powder', d:'Add a little at a time and taste.', n:['onion powder'], src:'kitchen'}]},
  {id:'shallots', name:'Shallots', m:'shallots?', o:[
    {t:'Onion', d:'About the same amount of chopped yellow or white onion. Add a little garlic if you like.', n:['onion'], src:'kitchen'}]},
  {id:'ginger', name:'Fresh ginger', m:'(fresh |minced |grated )ginger|ginger root|ginger paste', o:[
    {t:'Ground ginger', d:'For 1 tbsp grated fresh ginger: about 1/4 tsp ground ginger.', n:['ground ginger'], src:'kitchen'}]},
  {id:'jalapeno', name:'Jalapeno', m:'jalapenos?( peppers?)?', o:[
    {t:'Serrano or red pepper flakes', d:'Serranos are hotter, so use less. A pinch of red pepper flakes adds the heat without the pepper.', n:[['chiles', 'red pepper flakes']], src:'kitchen'}]},
  {id:'lemon', name:'Lemon', m:'lemons?( juice| zest)?|juice of (\\w+ )?lemons?', o:[
    {t:'Lime', d:'Same amount of juice or zest.', n:['lime'], src:'kitchen'},
    {t:'Vinegar (juice only)', d:'For 1 tsp lemon juice: 1/2 tsp vinegar. Best in marinades and dressings, not where you taste the lemon.', n:['vinegar'], src:'ext'}]},
  {id:'lime', name:'Lime', m:'limes?( juice| zest)?|juice of (\\w+ )?limes?', o:[
    {t:'Lemon', d:'Same amount of juice or zest.', n:['lemon'], src:'kitchen'}]},
  // cans, sauces, and pantry
  {id:'tomato sauce', name:'Tomato sauce', m:'tomato sauce', o:[
    {t:'Tomato paste + water', d:'For a 15 oz can: one 6 oz can tomato paste plus 1 cup water.', n:['tomato paste'], src:'ext'}]},
  {id:'tomato paste', name:'Tomato paste', m:'tomato paste', o:[
    {t:'Tomato sauce, cooked down', d:'For 1 tbsp paste: about 2 to 3 tbsp tomato sauce, simmered until thick.', n:['tomato sauce'], src:'ext'}]},
  {id:'tomato juice', name:'Tomato juice', m:'tomato juice', o:[
    {t:'Tomato sauce + water', d:'For 1 cup: 1/2 cup tomato sauce plus 1/2 cup water.', n:['tomato sauce'], src:'ext'}]},
  {id:'ketchup', name:'Ketchup', m:'ketchup|catsup', o:[
    {t:'Tomato sauce + sugar + vinegar', d:'For 1 cup: 1 cup tomato sauce, 1/2 cup sugar, and 2 tbsp vinegar.', n:['tomato sauce', 'sugar', 'vinegar'], src:'ext'}]},
  {id:'broth', name:'Broth', m:'(chicken |beef |vegetable |veggie )?(broth|stock)', o:[
    {t:'Bouillon + water', d:'For 1 cup: 1 bouillon cube or 1 tsp bouillon granules dissolved in 1 cup boiling water.', n:[], src:'ext'},
    {t:'A different broth', d:'Chicken, beef, and vegetable broth can stand in for each other.', n:[['chicken broth', 'beef broth', 'vegetable broth', 'broth']], src:'kitchen'}]},
  {id:'wine', name:'Wine', m:'(dry )?(white|red) wine(?! vinegar)|(?<!rice |shaoxing |plum )wine(?! vinegar)', o:[
    {t:'Broth + a splash of vinegar', d:'Same amount of broth (chicken for white wine, beef for red) plus a splash of vinegar or lemon juice for tang.', n:[['chicken broth', 'beef broth', 'vegetable broth', 'broth']], src:'kitchen'}]},
  {id:'mirin', name:'Mirin', m:'mirin', o:[
    {t:'Dry sherry or white wine + sugar', d:'Same amount, plus about 1/2 tsp sugar for each tbsp.', n:['wine'], src:'kitchen'}]},
  {id:'rice vinegar', name:'Rice vinegar', m:'(seasoned )?rice (wine )?vinegar', o:[
    {t:'Apple cider or white wine vinegar', d:'Same amount. Add a pinch of sugar if the recipe uses seasoned rice vinegar.', n:['vinegar'], src:'kitchen'}]},
  {id:'soy sauce', name:'Soy sauce', m:'(low sodium |reduced sodium |light |dark )?soy sauce', o:[
    {t:'Tamari or coconut aminos', d:'Same amount. Tamari is usually gluten-free. Coconut aminos is sweeter and less salty.', n:[], src:'kitchen'}]},
  {id:'fish sauce', name:'Fish sauce', m:'fish sauce', o:[
    {t:'Soy sauce', d:'Same amount. You lose some of the funk, but it\'s still salty and savory.', n:['soy sauce'], src:'kitchen'}]},
  {id:'oyster sauce', name:'Oyster sauce', m:'oyster sauce', o:[
    {t:'Hoisin, or soy sauce + a pinch of sugar', d:'Same amount. Hoisin is sweeter.', n:[['hoisin', 'soy sauce']], src:'kitchen'}]},
  {id:'worcestershire', name:'Worcestershire', m:'worcestershire( sauce)?', o:[
    {t:'Steak sauce', d:'Same amount.', n:[], src:'ext'}]},
  {id:'gochujang', name:'Gochujang', m:'gochujang( paste)?', o:[
    {t:'Sriracha + soy sauce + a pinch of sugar', d:'Start with half the amount. It\'s hotter and thinner, and won\'t taste quite the same.', n:['sriracha', 'soy sauce'], src:'kitchen'}]},
  {id:'sriracha', name:'Sriracha', m:'sriracha', o:[
    {t:'Chili garlic sauce or hot sauce', d:'To taste. Start with a little less.', n:['hot sauce'], src:'kitchen'}]},
  {id:'sesame oil', name:'Sesame oil', m:'(toasted )?sesame oil', o:[
    {t:'Neutral oil + sesame seeds', d:'There\'s no real swap for the toasted flavor. Use regular oil and sprinkle toasted sesame seeds on top, or leave it out.', n:['oil'], src:'kitchen'}]},
  {id:'chipotle', name:'Chipotles in adobo', m:'chipotles?( peppers?)? in adobo', o:[
    {t:'Smoked paprika + cayenne', d:'For smoky heat: a little smoked paprika plus a pinch of cayenne. Taste as you go.', n:['paprika'], src:'kitchen'}]},
  {id:'cream soup', name:'Cream of chicken or mushroom soup', m:'(condensed )?cream of (chicken|mushroom|celery)( soup)?', o:[
    {t:'Quick white sauce', d:'For one 10.5 oz can: melt 3 tbsp butter, stir in 3 tbsp flour, then whisk in 1 1/4 cups milk or broth and simmer until thick. Season with salt and pepper.', n:['butter', 'flour', ['milk', 'broth', 'chicken broth']], src:'kitchen'}]},
  {id:'breadcrumbs', name:'Breadcrumbs', m:'(panko |italian |seasoned |plain |dry )?bread ?crumbs|panko', o:[
    {t:'Crushed crackers', d:'Same amount. Crushed cornflakes or potato chips also work for a crunchy coating.', n:['crackers'], src:'ext'}]},
  // meat
  {id:'ground beef', name:'Ground beef', m:'(lean |extra lean )?ground (beef|chuck)|hamburger( meat)?', o:[
    {t:'Ground turkey', d:'Same amount. It\'s leaner, so add a little oil. Cook it to 165°F.', n:['ground turkey'], src:'kitchen'}]},
  {id:'ground turkey', name:'Ground turkey', m:'ground turkey', o:[
    {t:'Ground beef or ground chicken', d:'Same amount. Cook ground beef to 160°F and ground chicken to 165°F.', n:[['ground beef', 'chicken']], src:'kitchen'}]},
  {id:'chicken breast', name:'Chicken breast', m:'chicken breasts?', o:[
    {t:'Boneless chicken thighs', d:'Same weight. Juicier and harder to overcook. Cook to 165°F.', n:['chicken'], src:'kitchen'}]},
  {id:'chicken thighs', name:'Chicken thighs', m:'chicken thighs?', o:[
    {t:'Chicken breasts', d:'Same weight. They cook faster and dry out easier, so check them sooner. Cook to 165°F.', n:['chicken'], src:'kitchen'}]}
];
const SWAP_RE = SWAPS.map(s => [s, new RegExp('(?<![a-z])(?:' + s.m + ')(?![a-z])', 'g')]);

// the swap for one ingredient line (the longest match wins, so "buttermilk" beats "milk"), or null
function swapFor(line) {
  const s = ' ' + normFood(String(line || '').replace(/\([^)]*\)/g, ' ')) + ' ';
  let best = null;
  for (const [sw, re] of SWAP_RE) {
    re.lastIndex = 0;
    const m = re.exec(s);
    if (m && m[0].trim() && (!best || m[0].length > best.len)) best = { sw, len: m[0].length };
  }
  return best ? best.sw : null;
}
// does the kitchen have what a swap option uses? false when it uses nothing we can check
function swapHave(opt, pantry) {
  if (!pantry || !opt.n || !opt.n.length) return false;
  const has = id => id.indexOf('x:') === 0 ? customHas(pantry, id.slice(2)) : pantryHas(pantry, id);
  return opt.n.every(x => Array.isArray(x) ? x.some(has) : has(x));
}

// Cookware and equipment: what the recipe calls for, a tip, and what to use if you don't have it.
// m is checked against the title, directions, and the recipe's own cookware list; mi also checks the ingredients.
const TOOLS = [
  {id:'dutch', name:'Dutch oven or heavy pot', m:'dutch oven|braise|braising|braised',
    tip:'A heavy pot with a tight lid holds steady heat for braises, stews, and chili.',
    alt:'No Dutch oven? Any heavy pot with a lid. If it goes in the oven, make sure the handles and lid are oven-safe.'},
  {id:'fry', name:'Deep pot and a thermometer for frying', m:'deep fr(y|ied|ying)|deep fat|fry (them |it |in batches )?until (golden|crisp)|heat (the )?oil to|oil (reaches|registers)|(?<!air )fryer', mi:'for (deep )?frying|frying oil',
    tip:'Use a fryer or a deep, heavy pot, and leave at least 2 inches of room at the top so the oil can bubble up. A deep-fry or candy thermometer keeps the oil at the right heat. Pat food dry first so it doesn\'t spatter.',
    alt:'Never use water on a grease fire. Cover the pot with a metal lid or use a kitchen fire extinguisher.', src:'USDA'},
  {id:'air', name:'Air fryer', m:'air fr(y|ied|yer|ying)',
    tip:'Don\'t crowd the basket, and shake or flip halfway so everything crisps evenly.',
    alt:'No air fryer? Bake on a sheet pan in a hot oven (a wire rack on the pan helps it crisp). Expect it to take longer.'},
  {id:'slow', name:'Slow cooker', m:'slow cook(er|ed|ing)?|crock ?pot',
    tip:'Thaw meat first, fill it between half and two-thirds full, put vegetables on the bottom with the meat on top, and keep the lid on.',
    alt:'No slow cooker? Use a covered heavy pot on a low simmer on the stove, stirring now and then. It\'ll be done much sooner, so start checking early.', src:'USDA'},
  {id:'pressure', name:'Pressure cooker or Instant Pot', m:'instant ?pot|pressure cook(er|ed|ing)?|natural(ly)? release|quick release|high pressure',
    tip:'Don\'t fill it past the 2/3 line, or 1/2 for rice, beans, and grains, which foam and expand. Use at least the minimum liquid your manual calls for.',
    alt:'No pressure cooker? Simmer it covered on the stove. It\'ll take a lot longer.', src:'manual'},
  {id:'wok', name:'Wok or large skillet', m:'(?<!non )wok|stir ?fr(y|ied|ying)',
    tip:'Get the pan very hot and cook in small batches so things sear instead of steam. Have everything cut before you start.',
    alt:'No wok? Your biggest skillet works.'},
  {id:'skillet', name:'Skillet', m:'skillet|frying pan|saute(ed|ing)?|sear(ed|ing)?|pan fr(y|ied)|brown (the |it |them )?(meat|beef|chicken|pork|sausage|on (all|both) sides)',
    tip:'For a good sear, use cast iron or stainless steel, let it get hot before the food goes in, and don\'t crowd the pan. Cook in batches if you need to.',
    alt:'A nonstick pan works too, but it won\'t brown as well.'},
  {id:'nonstick', name:'Nonstick pan', m:'nonstick|omelet(te)?|scrambled|crepes?|pancakes?|fried eggs?',
    tip:'Nonstick is easiest for eggs and pancakes. Use medium heat and skip metal utensils.',
    alt:'No nonstick? A well-seasoned cast iron pan with a little butter or oil.'},
  {id:'sheet', name:'Sheet pan', m:'sheet pan|baking sheet|cookie sheet|roasting pan|roast(ed)? (the |in the )?(vegetables|veggies|potatoes|broccoli|chicken)',
    tip:'Use a rimmed pan and spread things out in one layer with some space so they roast instead of steam. Parchment or foil makes cleanup easy.',
    alt:'No sheet pan? A large baking dish works, but things won\'t get as crispy.'},
  {id:'dish', name:'Baking dish', m:'baking dish|casserole dish|\\d+ ?x ?\\d+ (inch )?(baking |glass )?(dish|pan)|pyrex|glass dish',
    tip:'If it\'s glass, put it in the oven after the oven is preheated, and don\'t set it hot on a wet or cold counter or add cold liquid to it hot. Sudden temperature changes can crack it. Never use glass on the stove or under the broiler.',
    alt:'No 9x13? Two 8x8 pans hold about the same. Check for doneness a little early.', src:'Pyrex'},
  {id:'broil', name:'Broiler', m:'broil(er|ed|ing)?',
    tip:'Keep the rack a few inches from the heat and stay close. It goes from browned to burned fast. Use a metal pan, not glass.',
    alt:'No broiler? Finish it in the hottest oven you can, on the top rack.', src:'Pyrex'},
  {id:'grill', name:'Grill', m:'grill(ed|ing)?(?! pan| cheese)|bbq grill|barbecue grill',
    tip:'Oil the grates and let the grill heat up before the food goes on.',
    alt:'No grill? A grill pan or cast iron skillet over medium-high heat, or the broiler.'},
  {id:'blender', name:'Blender', m:'blender|puree(d)?|blend(ed)? until (completely |very )?smooth',
    tip:'Blending something hot? Blend a small amount at a time, take out the center of the lid so steam can escape, hold a folded towel over the opening, and start on low.',
    alt:'For soups, an immersion (stick) blender right in the pot is easier.', src:'manual'},
  {id:'processor', name:'Food processor', m:'food processor|pulse (until|a few)',
    tip:'Pulse in short bursts so it chops instead of turning to paste.',
    alt:'No food processor? A blender in short pulses, or chop by hand.'},
  {id:'mixer', name:'Mixer', m:'stand mixer|hand mixer|electric mixer|beat (on|at) (medium|high)|light and fluffy|stiff peaks|soft peaks|cream (the )?butter',
    tip:'A hand mixer handles most batters and whipped cream.',
    alt:'No mixer? A whisk and some arm work for small batches. Creaming butter and sugar by hand works if the butter is soft.'},
  {id:'muffin', name:'Muffin tin', m:'muffin (tin|pan|cups)|cupcake (tin|pan|liners)',
    tip:'Use liners or grease it well, and fill each cup about two-thirds full.',
    alt:'No muffin tin? Oven-safe ramekins on a sheet pan.'},
  {id:'loaf', name:'Loaf pan', m:'loaf pan|bread pan',
    tip:'Most recipes mean a 9x5 inch pan. A smaller 8.5x4.5 pan bakes taller and takes a little longer.',
    alt:'No loaf pan? Muffin tins work for many quick breads. Bake for less time.'},
  {id:'rice', name:'Rice cooker', m:'rice cooker',
    tip:'Rinse the rice and use the water lines on the cooker\'s bowl.',
    alt:'No rice cooker? A pot with a tight lid on low heat, and don\'t lift the lid while it steams.'},
  {id:'pasta', name:'Large pot for pasta', m:'(boil|cook) (the )?(pasta|noodles|spaghetti)|large pot of (salted )?water|pot of boiling (salted )?water',
    tip:'Use plenty of water so the pasta doesn\'t stick, and salt it well. Save a cup of pasta water before draining; it helps sauces cling.',
    alt:''}
];
const TOOL_RE = TOOLS.map(t => [t, new RegExp('(?<![a-z])(?:' + t.m + ')(?![a-z])'), t.mi ? new RegExp('(?<![a-z])(?:' + t.mi + ')(?![a-z])') : null]);

// safe temperatures for the meat in a recipe (FoodSafety.gov / USDA chart)
const TEMPS = [
  {ids:['chicken', 'turkey', 'ground turkey'], t:'Chicken and turkey: 165°F'},
  {ids:['ground beef', 'ground pork', 'sausage'], t:'Ground beef, pork, and raw sausage: 160°F'},
  {ids:['beef', 'beefy', 'pork', 'lamb'], t:'Steaks, chops, and roasts: 145°F, then rest 3 minutes'},
  {ids:['salmon', 'tuna', 'fish'], t:'Fish: 145°F, or until it flakes and isn\'t see-through'}
];

// what a recipe needs: [{id, name, tip, alt, src, fromRecipe}] plus safe temps for the meat in it
function toolsFor(r) {
  r = r || {};
  const steps = (r.steps || []).filter(x => !/^##\s/.test(x));
  const eq = (r.equipment || []).map(String);
  const text = ' ' + normFood([r.title || ''].concat(steps, eq).join(' . ')) + ' ';
  const ingText = ' ' + normFood((r.ingredients || []).join(' . ')) + ' ';
  const out = [];
  TOOL_RE.forEach(([t, re, rei]) => {
    if (re.test(text) || (rei && rei.test(ingText))) out.push({ id: t.id, name: t.name, tip: t.tip, alt: t.alt, src: t.src || '' });
  });
  // "brown the beef" in a Dutch oven or slow cooker recipe doesn't mean a skillet, and a stir fry has its own tip
  const si = out.findIndex(x => x.id === 'skillet');
  if (si >= 0 && (out.some(x => x.id === 'wok') || (out.some(x => ['dutch', 'slow', 'pressure'].indexOf(x.id) >= 0) && !/(?<![a-z])(skillet|frying pan)(?![a-z])/.test(text)))) out.splice(si, 1);
  // the recipe's own cookware that none of the tips cover
  const extra = eq.filter(e => !TOOL_RE.some(([t, re]) => re.test(' ' + normFood(e) + ' ') && out.some(x => x.id === t.id)));
  // meat in the ingredients -> safe temperatures
  const ids = new Set();
  (r.ingredients || []).forEach(l => { if (!/^##\s/.test(l)) foodsIn(l).forEach(id => ids.add(id)); });
  const temps = TEMPS.filter(x => x.ids.some(id => ids.has(id))).map(x => x.t);
  if (/\b(casserole|bake)\b/i.test(r.title || '') && temps.length) temps.push('Casseroles and leftovers: 165°F');
  return { tools: out, extra, temps };
}

/* What you'll need: every pan, appliance and tool a recipe uses, read from its directions and its own cookware list.
   [id, name, pattern, options] — pattern is checked against each step (lowercase, dashes as spaces, 9 x 13 -> 9x13).
   s: a size word in front counts ("large skillet", "6 quart slow cooker"). p: show the recipe's own words
   ("baking sheet" or "sheet pan", "9x13 pan"). */
const GEAR = [
  ['oven', 'Oven', '(?<!dutch |toaster )oven(?! safe| proof| mitts?)|bake[ds]?|baking (for|at|until|uncovered|covered|\\d)'],
  ['broiler', 'Broiler', 'broil(er|ed|ing)?'],
  ['microwave', 'Microwave', 'microwav(e|ed|ing)'],
  ['slow', 'Slow cooker', 'slow cook(er)?|crock ?pot', {s:1}],
  ['pressure', 'Instant Pot or pressure cooker', 'instant ?pot|pressure cook(er)?', {s:1}],
  ['air', 'Air fryer', 'air fr(y|ied|yer|ying)'],
  ['ricecooker', 'Rice cooker', 'rice cooker'],
  ['fryer', 'Deep fryer', 'deep fryer'],
  ['smoker', 'Smoker', 'smoker|pellet grill'],
  ['griddle', 'Griddle', 'griddle'],
  ['grillpan', 'Grill pan', 'grill pan'],
  ['grill', 'Grill', '(pre)?heat (the |a |your )?grill|on the grill|grill (over|for|until|on|the|them|it)|grill grates|(gas|charcoal|outdoor) grill'],
  ['dutch', 'Dutch oven', 'dutch oven', {s:1}],
  ['wok', 'Wok', '(?<!non )wok'],
  ['skillet', 'Skillet', 'skillet|frying pan|fry pan|saute pan|cast iron(?! (dutch|pot|griddle|grill|pan))', {s:1, p:1}],
  ['saucepan', 'Saucepan', 'sauce ?pan', {s:1}],
  ['pot', 'Pot', 'stock ?pot|soup pot|(?<!instant |crock |flower |sheet )pots?(?! roast| pie| sticker| holder| luck)', {s:1, p:1}],
  ['pan', 'Pan', 'pan (over|on) (low|medium|high|the stove)|in a (large |big |medium |deep |nonstick |non stick )?pan(?! of)', {s:1}],
  ['sheet', 'Sheet pan', 'sheet pans?|baking sheets?|cookie sheets?|sheet tray', {s:1, p:1}],
  ['dish', 'Baking dish', '\\d+x\\d+( inch)?( baking| casserole| glass| metal)? (dish|pan)|(\\d+ inch )?square (baking |cake )?pan|baking dish|casserole dish|gratin dish|pyrex', {s:1, p:1}],
  ['roasting', 'Roasting pan', 'roasting pan'],
  ['pie', 'Pie dish', 'pie (dish|plate|pan|tin)', {s:1, p:1}],
  ['springform', 'Springform pan', 'springform( pan)?', {s:1}],
  ['bundt', 'Bundt pan', 'bundt pan'],
  ['cake', 'Cake pan', 'cake pans?|\\d+ inch round (cake |baking )?pans?|round (cake )?pans?', {s:1, p:1}],
  ['loaf', 'Loaf pan', 'loaf pan|bread pan', {s:1}],
  ['muffin', 'Muffin tin', 'muffin (tin|pan|cups)|cupcake (tin|pan|liners)', {s:1, p:1}],
  ['ramekin', 'Ramekins', 'ramekins?'],
  ['rack', 'Wire rack', 'wire rack|cooling rack'],
  ['bowl', 'Mixing bowl', '(large|medium|small|mixing|separate|another|second|big|clean|shallow|heatproof|heat proof|glass|microwave safe) bowls?|(in|into|to) a bowl', {s:1}],
  ['whisk', 'Whisk', 'whisk(ed|ing)?'],
  ['immersion', 'Immersion blender', 'immersion blender|stick blender|hand blender'],
  ['blender', 'Blender', '(?<!immersion |stick |hand |pastry )blender'],
  ['processor', 'Food processor', 'food processor|mini chopper'],
  ['mixer', 'Mixer', 'stand mixer|hand mixer|electric mixer|mixer', {p:1}],
  ['spatula', 'Spatula', '(rubber |silicone |offset )?spatula', {p:1}],
  ['woodspoon', 'Wooden spoon', 'wooden spoon'],
  ['slotted', 'Slotted spoon', 'slotted spoon'],
  ['tongs', 'Tongs', 'tongs'],
  ['ladle', 'Ladle', 'ladle'],
  ['colander', 'Colander', 'colander|strainer|sieve|fine mesh', {p:1}],
  ['grater', 'Grater', '(box )?grater|microplane|zester', {p:1}],
  ['peeler', 'Vegetable peeler', 'peeler'],
  ['masher', 'Potato masher', '(potato )?masher|ricer'],
  ['forks', 'Two forks (for shredding)', '(two|2) forks'],
  ['rollingpin', 'Rolling pin', 'rolling pin'],
  ['brush', 'Pastry brush', 'pastry brush|basting brush'],
  ['scoop', 'Cookie scoop', 'cookie (dough )?scoop|ice cream scoop'],
  ['cutter', 'Cookie cutters', 'cookie cutters?|biscuit cutter', {p:1}],
  ['piping', 'Piping bag', 'piping bag|pastry bag|piping tip'],
  ['steamer', 'Steamer basket', 'steamer( basket)?'],
  ['thermometer', 'Meat thermometer', 'thermometer|instant read', {p:1}],
  ['mandoline', 'Mandoline', 'mandoline'],
  ['scale', 'Kitchen scale', '(kitchen|food) scale'],
  ['pizzastone', 'Pizza stone', 'pizza (stone|steel)|baking stone'],
  ['waffle', 'Waffle iron', 'waffle (iron|maker)'],
  ['icecream', 'Ice cream maker', 'ice cream maker'],
  ['pitcher', 'Pitcher', 'pitcher|carafe'],
  ['icetray', 'Ice cube tray', 'ice cube trays?'],
  ['popsicle', 'Popsicle molds', 'popsicle molds?'],
  ['container', 'Airtight container or jar', 'airtight (container|jar)s?|mason jars?|storage container'],
  ['foil', 'Aluminum foil', 'aluminum foil|tin foil|foil'],
  ['parchment', 'Parchment paper', 'parchment( paper)?'],
  ['wrap', 'Plastic wrap', 'plastic wrap|cling (film|wrap)'],
  ['papertowel', 'Paper towels', 'paper towels?'],
  ['bag', 'Zip-top bag', 'zip ?lock|ziploc|zip top|resealable (plastic )?bag|gallon (size )?bag|freezer bag'],
  ['toothpick', 'Toothpicks', 'toothpicks?'],
  ['skewer', 'Skewers', 'skewers?'],
  ['twine', 'Kitchen twine', '(kitchen |butchers? )?twine']
];
// Things the directions don't name but almost always mean: [id, name, pattern, unless one of these was named]
const STOVE = ['skillet', 'saucepan', 'pot', 'pan', 'dutch', 'wok', 'slow', 'pressure', 'ricecooker', 'fryer', 'griddle', 'grillpan', 'microwave', 'air', 'steamer'];
const GEAR_LIKELY = [
  ['colander', 'Colander', 'drain(ed|ing)?(?! (the |any |off |most of the |some of the )?(excess )?(grease|fat|oil|drippings|bacon|liquid|juices?|marinade)| on (a )?paper)', ['colander'], 'draining'],
  ['pot', 'Pot or saucepan', 'boil(ing)?|bring (\\w+ ){0,5}to a (rolling |low |gentle |full )?boil|simmer(ing)?', STOVE, m => /^simmer/.test(m) ? 'simmering' : 'boiling'],
  ['grater', 'Grater', 'grate[ds]? (the |some |fresh |in )?(cheese|parmesan|cheddar|ginger|garlic|nutmeg|carrots?|zucchini|potatoes|chocolate|butter)|shred (the )?(cheese|carrots?|zucchini|cabbage|potatoes)', ['grater'], m => /^shred/.test(m) ? 'shredding' : 'grating'],
  ['zester', 'Zester or fine grater', 'zest (the |of |\\d |a |one |half |both )|zested', ['grater'], 'zesting'],
  ['masher', 'Potato masher or fork', 'mash(ed)? (the |up )?(potatoes|beans|bananas?|avocados?|sweet potatoes|cauliflower)|mash (until|with|well)', ['masher', 'mixer', 'processor', 'blender', 'immersion'], 'mashing'],
  ['forks', 'Two forks (for shredding)', 'shred(ded)? (the )?(chicken|pork|beef|meat|turkey|roast)', ['forks', 'mixer'], 'shredding the meat'],
  ['rollingpin', 'Rolling pin', 'roll (out )?(the )?(dough|crust|pastry)|roll (it |them |each )?out', ['rollingpin'], 'rolling out the dough'],
  ['brush', 'Pastry brush', 'brush (the |each |with |it |them |tops?|both|lightly|generously)', ['brush'], 'brushing'],
  ['mixer', 'Hand or stand mixer', 'beat (on|at|with|until) (low|medium|high|light|fluffy|smooth|stiff)|stiff peaks|soft peaks|light and fluffy|cream (together )?(the )?butter', ['mixer'], m => /cream/.test(m) ? 'creaming the butter' : 'beating'],
  ['blender', 'Blender', 'puree(d|ing)?|blend (until|on|everything|it|them|the)', ['blender', 'immersion', 'processor'], 'blending'],
  ['processor', 'Food processor', 'pulse (until|a few|several|to|in)', ['processor', 'blender'], 'pulsing'],
  ['fryer', 'Deep pot or fryer', 'deep fr(y|ied|ying)|heat (\\w+ ){0,3}oil (to|until) \\d|oil (reaches|registers|is) \\d|\\d+ inch(es)? of oil|fry (in batches|until golden)', ['fryer', 'air'], 'frying']
];
const gWrap = m => new RegExp('(?<![a-z0-9])(?:' + m + ')(?![a-z])');
const GEAR_RE = GEAR.map(g => [g, gWrap(g[2])]);
const GEAR_LIKELY_RE = GEAR_LIKELY.map(g => [g, gWrap(g[2])]);
const SIZE_W = '(?:large|big|medium|small|deep|heavy|wide|shallow|oven safe|oven proof|nonstick|non stick|cast iron|enameled|rimmed|glass|metal|ceramic|heatproof|heavy bottomed|\\d+(?:\\.\\d+)? (?:inch|quart|qt|liter))';
const SIZE_RE = new RegExp('((?:' + SIZE_W + '\\s+)+)$');
const SIZE_LEAD = new RegExp('^((?:' + SIZE_W + '\\s+)+)');
const gNorm = s => normFood(s).replace(/[“”"]/g, ' ').replace(/(\d+)\s*(?:x|×|by)\s*(\d+)/g, '$1x$2')
  .replace(/(\d)\s*(?:inches|inch|in\.?)(?![a-z])/g, '$1 inch').replace(/(\d)\s*(?:quarts?|qt\.?)(?![a-z])/g, '$1 quart').replace(/\s+/g, ' ');
const gCap = s => s.charAt(0).toUpperCase() + s.slice(1);
function gSize(words) {
  return words.trim().replace(/(\d) (inch|quart|liter)/g, '$1-$2').replace(/oven (safe|proof)/, 'oven-$1').replace(/non stick/, 'nonstick')
    .replace(/heat proof/, 'heatproof').replace(/heavy bottomed/, 'heavy-bottomed');
}
// the name to show for one mention: the recipe's own words when they say more ("large skillet", "9x13 pan")
function gName(g, text, m) {
  const o = g[3] || {};
  let base = g[1];
  if (o.p && !/^cast iron$/.test(m[0])) base = m[0].replace(/(\d) inch/g, '$1-inch').replace(/^(in|into|to) a /, '');
  if (g[0] === 'skillet' && /^cast iron/.test(m[0])) base = 'cast iron skillet';
  if (g[0] === 'bowl') base = /(shallow|heatproof|glass|microwave)/.test(m[0]) ? m[0].replace(/bowls$/, 'bowl').replace(/heat proof/, 'heatproof').replace(/microwave safe/, 'microwave-safe') : 'mixing bowl';
  base = base.replace(/(\d+x\d+)-inch/, '$1');
  let size = '';
  if (o.s && !/\d+x\d+|\d+-inch/.test(base)) {
    const inner = m[0].replace(/^(in|into|to) a /, '').match(SIZE_LEAD);
    const sm = inner || text.slice(Math.max(0, m.index - 48), m.index).match(SIZE_RE);
    if (sm) size = gSize(sm[1]).replace(/^big\b/, 'large').split(' ').filter(w => base.toLowerCase().indexOf(w) < 0).join(' ');
  }
  if (o.p && base !== 'cast iron skillet') base = base.replace(SIZE_LEAD, '');
  const b = /^Dutch/.test(base) || !size ? base : base.charAt(0).toLowerCase() + base.slice(1);
  return gCap((size ? size + ' ' : '') + b.replace(/^dutch/, 'Dutch')).replace(/\binstant pot\b/i, 'Instant Pot');
}
// [{id, name, kind:'step'|'list'|'likely'|'suggested', step, why}] in step order, then the recipe's list, then guesses
function gearFor(r) {
  r = r || {};
  const steps = [];
  let n = 0;
  (r.steps || []).forEach(s => { if (!/^##\s/.test(s)) steps.push({ n: ++n, t: ' ' + gNorm(s) + ' ', raw: String(s) }); });
  const found = new Map(); // id -> item
  const add = (id, name, kind, step, why) => {
    const x = found.get(id);
    if (!x) { found.set(id, { id, name, kind, step: step || 0, why: why || '' }); return; }
    if (name.length > x.name.length && kind !== 'likely') x.name = name; // keep the most specific name
  };
  steps.forEach(s => GEAR_RE.forEach(([g, re]) => {
    const m = s.t.match(re);
    if (m) add(g[0], gName(g, s.t, m), 'step', s.n, 'Step ' + s.n);
  }));
  // the oven's heat, from the step that names it
  const ov = found.get('oven');
  if (ov) {
    for (const s of steps) {
      const t = s.raw.toLowerCase();
      if (!/oven|preheat|bake|roast/.test(t)) continue;
      const m = t.match(/(\d{3})\s*(?:°|º|degrees?|deg\.?)\s*(f|c)?(?![a-z])/) || t.match(/(\d{3})\s*(f|c)(?![a-z])/) || t.match(/(?:at|to)\s+(\d{3})(?![\d.])()/);
      if (m && +m[1] >= 150 && +m[1] <= 550) { ov.name = 'Oven, heated to ' + m[1] + '°' + ((m[2] || 'f').toUpperCase()); break; }
    }
  }
  // "bake" in an air fryer recipe means the air fryer; a generic pan is the skillet or wok it already named
  if (ov && found.has('air') && !steps.some(s => /(?<!dutch )oven(?! safe)/.test(s.t))) found.delete('oven');
  if (found.has('pan') && ['skillet', 'wok', 'saucepan', 'sheet', 'dish', 'grillpan', 'cake', 'loaf', 'springform', 'roasting'].some(id => found.has(id))) found.delete('pan');
  if (found.has('pot') && found.has('dutch') && !steps.some(s => /(stock ?pot|soup pot|(?<!instant |crock )pot of)/.test(s.t))) found.delete('pot');
  // the recipe's own cookware list
  (r.equipment || []).map(String).forEach(line => {
    const t = ' ' + gNorm(line) + ' ';
    if (!t.trim() || t.length > 80) return;
    const hit = GEAR_RE.find(([g, re]) => re.test(t));
    const own = gCap(line.replace(/\s+/g, ' ').trim().replace(/[.:;]+$/, ''));
    if (hit) {
      const x = found.get(hit[0][0]);
      if (x) { if (own.length <= 40 && own.length > x.name.length && !/^Oven, heated/.test(x.name)) x.name = own; }
      else add(hit[0][0], own.length <= 40 ? own : hit[0][1], 'list', 0, 'On the recipe\'s cookware list');
    } else add('x:' + t.trim(), own, 'list', 0, 'On the recipe\'s cookware list');
  });
  // cookware they mention in a video's talking
  if (r.speech) heardIn(r.speech).forEach(h => { if (!found.has(h.id)) add(h.id, h.name, 'heard', 0, 'Said in the video'); });
  // what the directions almost certainly mean
  steps.forEach(s => GEAR_LIKELY_RE.forEach(([g, re]) => {
    if (found.has(g[0]) || g[3].some(id => found.has(id))) return;
    const m = s.t.match(re);
    if (m) add(g[0], g[1], 'likely', s.n, 'Likely: for ' + (typeof g[4] === 'function' ? g[4](m[0].trim()) : g[4]) + ' in step ' + s.n);
  }));
  // canned foods in the ingredients
  if (!found.has('canopener') && (r.ingredients || []).some(l => !/^##\s/.test(l) && /(\d|oz\.?\)?|ounce\)?)\s*cans?(?![a-z])|(?<![a-z])canned(?![a-z])|(?<![a-z])cans? of(?![a-z])/i.test(l)))
    add('canopener', 'Can opener', 'likely', 0, 'Likely: some ingredients come in cans');
  // a thermometer for meat, or for frying oil
  if (!found.has('thermometer')) {
    const ids = new Set();
    (r.ingredients || []).forEach(l => { if (!/^##\s/.test(l)) foodsIn(l).forEach(id => ids.add(id)); });
    const meat = TEMPS.find(x => x.ids.some(id => ids.has(id)));
    if (found.has('fryer')) add('thermometer', 'Thermometer', 'suggested', 0, 'Suggested: to keep the oil at the right heat');
    else if (meat) add('thermometer', 'Meat thermometer', 'suggested', 0, 'Suggested: to check the ' + meat.t.split(/[:,]/)[0].toLowerCase().replace(/ and .*$/, '').replace(/^steaks/, 'meat') + ' is done');
  }
  const rank = { step: 0, list: 1, heard: 2, likely: 3, suggested: 4 };
  const order = new Map(GEAR.map((g, i) => [g[0], i]));
  return Array.from(found.values()).sort((a, b) => (rank[a.kind] - rank[b.kind]) || ((a.step || 99) - (b.step || 99)) || ((order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))).slice(0, 16);
}
// cookware someone mentions while talking (a video's speech); everyday words only count with "my", "the", "a"…
function heardIn(text) {
  const t = ' ' + gNorm(text) + ' ';
  const out = [];
  GEAR_RE.forEach(([g, re]) => {
    if (['bowl', 'pan', 'whisk', 'oven', 'foil'].indexOf(g[0]) >= 0 && !new RegExp(re.source.replace('(?:', '(?:my |the |a |your |big |large )(?:')).test(t)) return;
    const m = t.match(re);
    if (m) out.push({ id: g[0], name: gName(g, t, m) });
  });
  return out.slice(0, 8);
}
const gearHeard = text => heardIn(text).map(h => h.name);
/* ---- end kitchen help ---- */

module.exports = { SWAPS, TOOLS, TEMPS, swapFor, swapHave, toolsFor, GEAR, gearFor, gearHeard };
