// Offline tests for the grocery list: store sections and item names.
const path = require('path');
const R = path.join(__dirname, '..');
const X = require(path.join(R, 'lib/pantry.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

(async () => {
  // ---------- grocery list sections ----------
  [['chicken thighs', 'Meat & seafood'], ['eggs', 'Dairy & eggs'], ['tortillas', 'Bread & tortillas'], ['pinto beans', 'Rice, pasta & beans'],
   ['salsa', 'Canned & jarred'], ['soy sauce', 'Sauces & condiments'], ['cumin', 'Spices & baking'], ['frozen peas', 'Frozen'], ['cilantro', 'Produce'],
   ['paper towels', 'Other'], ['butter', 'Dairy & eggs'], ['tortilla chips', 'Snacks & drinks']]
    .forEach(([t, want]) => { const f = X.lookupFood(t); ok(X.aisleOf(f.id, t) === want, 'section of "' + t + '" -> ' + X.aisleOf(f.id, t)); });

  // ---------- grocery names use the recipe's words ----------
  [['1/2 cup potato starch', 'Potato starch'], ['2 tbsp vegetable oil', 'Vegetable oil'], ['1 tbsp low sodium soy sauce', 'Soy sauce'], ['3 eggs', 'Eggs'], ['1 lb hamburger meat', 'Hamburger meat']]
    .forEach(([l, want]) => { const id = X.readIngredient(l).ids[0]; ok(X.foodName(l, id) === want, 'list name for "' + l + '" -> ' + X.foodName(l, id)); });

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
