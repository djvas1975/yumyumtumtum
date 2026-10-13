// Offline tests for the recipe reader: fake pages shaped like real recipe sites and captions.
const path = require('path');
const R = path.join(__dirname, '..');
const P = require(path.join(R, 'lib/parse.js'));

const wprmPage = `<!doctype html><html><head><title>Best Birria Tacos - Salt & Lime</title>
<meta property="og:site_name" content="Salt &amp; Lime"><meta content="https://example.com/img/og.jpg" property="og:image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"x"},
{"@type":"Recipe","name":"Best Birria Tacos &amp; Consommé","description":"Rich, beefy tacos.","author":{"@type":"Person","name":"Maria"},
"image":["https://example.com/img/birria-1x1.jpg","https://example.com/img/birria-4x3.jpg"],
"recipeYield":["6","6 servings"],"prepTime":"PT30M","cookTime":"PT3H","totalTime":"PT3H30M",
"recipeCategory":["Main Course"],"recipeCuisine":["Mexican"],
"recipeIngredient":["3 lb beef chuck roast","4 dried guajillo chiles","1 &frac12; cups beef broth"],
"recipeInstructions":[{"@type":"HowToSection","name":"Make the sauce","itemListElement":[{"@type":"HowToStep","text":"Toast the chiles in a dry skillet."},{"@type":"HowToStep","text":"Blend with broth until smooth."}]},{"@type":"HowToSection","name":"Cook the beef","itemListElement":[{"@type":"HowToStep","text":"Braise the beef 3 hours."}]}],
"nutrition":{"@type":"NutritionInformation","calories":"520 kcal","proteinContent":"38 g"},
"tool":[{"@type":"HowToTool","name":"Dutch oven"}]}]}</script></head>
<body><p>Long story about my trip...</p>
<div id="wprm-recipe-container-4821" class="wprm-recipe-container">
 <div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">For the sauce:</h4><ul>
  <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">4</span> <span>dried guajillo chiles</span></li>
  <li class="wprm-recipe-ingredient"><span>1 ½</span> <span>cups</span> <span>beef broth</span> <span class="wprm-recipe-ingredient-notes">low sodium</span></li></ul></div>
 <div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">For the beef</h4><ul>
  <li class="wprm-recipe-ingredient">3 lb beef chuck roast</li></ul></div>
 <div class="wprm-recipe-equipment-container"><div class="wprm-recipe-equipment-name">Dutch oven</div><div class="wprm-recipe-equipment-name">Blender</div></div>
 <div class="wprm-recipe-notes-container"><h3>Notes</h3><div class="wprm-recipe-notes"><p>Swap: use short rib instead of chuck.</p><p>Freezes well for 3 months.</p></div></div>
</div></body></html>`;

const dotdashPage = `<html><head><script type="application/ld+json">[{"@context":"http://schema.org","@type":["Recipe"],
"name":"Chicken Tortilla Soup","image":{"@type":"ImageObject","url":"https://example.com/soup.jpg","width":1500},
"recipeIngredient":["2 tablespoons olive oil","1 onion, diced"],"recipeInstructions":[{"@type":"HowToStep","text":"Heat oil.\\n"},{"@type":"HowToStep","text":"Add onion &amp; cook."}],
"totalTime":"P0DT0H45M","recipeYield":"6"}]</script></head><body><div id="recipe-card">...</div></body></html>`;

const tiktokCaption = 'Easy garlic parmesan wings 🔥 Ingredients: 2 lb wings, 1 tbsp baking powder, 4 tbsp butter, 3 cloves garlic, 1/2 cup parmesan Instructions: 1. Pat wings dry 2. Toss with baking powder 3. Air fry at 400 for 25 min 4. Toss in garlic butter and parm #wings #airfryer #gameday';

const igCaption = `Tres leches cake that everyone asks for 🎂
.
Ingredients:
• 1 cup flour
• 5 eggs
• 1 can evaporated milk
• 1 can sweetened condensed milk
Directions:
1) Bake the sponge at 350°F for 25 min.
2) Poke holes and pour the milks over.
3) Chill overnight, top with whipped cream.
Tip: add cinnamon on top!
#tresleches #dessert`;

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

(async () => {
  // swap in a fake fetch so the reader can run without the internet
  const pages = {
    'https://blog.example.com/birria': wprmPage,
    'https://www.allrecipes.example/soup': dotdashPage,
    'https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40chefjoe%2Fvideo%2F123': JSON.stringify({ title: tiktokCaption, author_unique_id: 'chefjoe', thumbnail_url: 'https://p16.tiktokcdn.com/thumb.jpg' })
  };
  global.fetch = async (url) => {
    const body = pages[url];
    if (body == null) return { status: 404, ok: false, headers: new Map(), text: async () => '' };
    return { status: 200, ok: true, headers: new Map([['content-type', 'text/html']]), text: async () => body };
  };
  const { readRecipe } = require(path.join(R, 'api/recipe.js'));

  const a = await readRecipe('https://blog.example.com/birria');
  ok(a.kind === 'recipe', 'website: recognized as a recipe');
  ok(a.title === 'Best Birria Tacos & Consommé', 'website: title decoded -> ' + a.title);
  ok(a.image === 'https://example.com/img/birria-1x1.jpg', 'website: photo from recipe data');
  ok(a.totalTime === 210 && a.prepTime === 30 && a.cookTime === 180, 'website: times ' + [a.prepTime, a.cookTime, a.totalTime]);
  ok(a.servings === 6 && a.yieldText === '6 servings', 'website: servings ' + a.servings + ' / ' + a.yieldText);
  ok(a.ingredients[0] === '## For the sauce' && a.ingredients.includes('1 ½ cups beef broth low sodium') && a.ingredients.includes('## For the beef'), 'website: ingredient groups with measurements -> ' + JSON.stringify(a.ingredients));
  ok(a.steps.join('|') === '## Make the sauce|Toast the chiles in a dry skillet.|Blend with broth until smooth.|## Cook the beef|Braise the beef 3 hours.', 'website: directions with sections');
  ok(a.notes.length === 2 && /short rib/.test(a.notes[0]), 'website: notes and substitutions -> ' + JSON.stringify(a.notes));
  ok(a.equipment.join(',') === 'Dutch oven', 'website: cookware from recipe data -> ' + a.equipment);
  ok(a.nutrition.length === 2 && a.nutrition[0].value === '520 kcal', 'website: nutrition');
  ok(a.anchor === 'wprm-recipe-container-4821', 'website: jump-to-recipe spot -> ' + a.anchor);
  ok(a.meals.includes('Dinner') && a.cuisine === 'Mexican', 'website: meal type and cuisine -> ' + a.meals + ' / ' + a.cuisine);
  ok(a.author === 'Maria' && a.siteName === 'Salt & Lime', 'website: author and site');

  const b = await readRecipe('https://www.allrecipes.example/soup');
  ok(b.image === 'https://example.com/soup.jpg' && b.totalTime === 45 && b.servings === 6, 'second site shape: photo, time, servings');
  ok(b.steps.join('|') === 'Heat oil.|Add onion & cook.', 'second site shape: steps -> ' + JSON.stringify(b.steps));
  ok(b.anchor === 'recipe-card', 'second site shape: anchor');

  const c = await readRecipe('https://www.tiktok.com/@chefjoe/video/123');
  ok(c.kind === 'video' && c.author === '@chefjoe' && c.image.includes('tiktokcdn'), 'tiktok: creator and cover photo');
  ok(c.title === 'Easy garlic parmesan wings', 'tiktok: title from caption -> ' + c.title);
  ok(c.ingredients.length === 5 && c.ingredients[0] === '2 lb wings', 'tiktok: ingredients from one-line caption -> ' + JSON.stringify(c.ingredients));
  ok(c.steps.length === 4 && c.steps[2] === 'Air fry at 400 for 25 min', 'tiktok: steps -> ' + JSON.stringify(c.steps));

  const d = P.parseCaption(igCaption);
  ok(d.title === 'Tres leches cake that everyone asks for', 'instagram caption: title -> ' + d.title);
  ok(d.ingredients.length === 4 && d.ingredients[0] === '1 cup flour', 'instagram caption: ingredients -> ' + JSON.stringify(d.ingredients));
  ok(d.steps.length === 3 && /^Bake/.test(d.steps[0]), 'instagram caption: steps -> ' + JSON.stringify(d.steps));
  ok(d.notes.some(n => /cinnamon/.test(n)), 'instagram caption: tip kept as a note -> ' + JSON.stringify(d.notes));

  ok(P.badUrl('http://169.254.169.254/latest') && P.badUrl('http://localhost:3000') && !P.badUrl('https://www.seriouseats.com/x'), 'safety: private addresses refused');
  ok(P.isoMinutes('PT1H15M') === 75 && P.isoMinutes('1 hr 20 mins') === 80, 'durations');

  // ---------- a WordPress post the phone read itself (POST /api/recipe) ----------
  const RR = require(path.join(R, 'api/recipe.js'));
  const J = x => JSON.stringify(x);
  const wprmCard = '<p>Article text about the salad.</p><div id="wprm-recipe-container-115242" class="wprm-recipe-container"><div class="wprm-recipe">'
    + '<h2 class="wprm-recipe-name">Deviled Egg Macaroni Salad</h2>'
    + '<div class="wprm-recipe-equipment-container"><div class="wprm-recipe-equipment-item"><div class="wprm-recipe-equipment-name">Large pot</div></div></div>'
    + '<ul class="wprm-recipe-ingredients"><li class="wprm-recipe-ingredient"><span class="wprm-checkbox-container">▢</span><span class="wprm-recipe-ingredient-amount">12</span> <span class="wprm-recipe-ingredient-unit">oz</span> <span class="wprm-recipe-ingredient-name">elbow macaroni</span></li>'
    + '<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">8</span> <span class="wprm-recipe-ingredient-unit">large</span> <span class="wprm-recipe-ingredient-name">hard-boiled eggs</span> <span class="wprm-recipe-ingredient-notes">chopped</span></li>'
    + '<li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1</span> <span class="wprm-recipe-ingredient-unit">cup</span> <span class="wprm-recipe-ingredient-name">mayonnaise</span></li></ul>'
    + '<ul class="wprm-recipe-instructions"><li class="wprm-recipe-instruction"><div class="wprm-recipe-instruction-text">Cook the macaroni and drain.</div></li>'
    + '<li class="wprm-recipe-instruction"><div class="wprm-recipe-instruction-text">Stir everything together in a large bowl.</div></li></ul>'
    + '<div class="wprm-recipe-notes">Keeps 3 days.</div></div></div>';
  const ws = RR.parseSent({ url: 'https://www.eatingonadime.com/deviled-egg-macaroni-salad/', html: wprmCard, title: 'Deviled Egg Macaroni Salad &#8211; Eating on a Dime', image: 'https://www.eatingonadime.com/photo.jpg', site: 'Eating on a Dime' });
  ok(ws.kind === 'recipe' && J(ws.ingredients) === J(['12 oz elbow macaroni', '8 large hard-boiled eggs chopped', '1 cup mayonnaise']) && J(ws.steps) === J(['Cook the macaroni and drain.', 'Stir everything together in a large bowl.']), 'WordPress post with only the card\'s markup: ingredients and steps -> ' + J([ws.ingredients, ws.steps]));
  ok(J(ws.equipment) === J(['Large pot']) && J(ws.notes) === J(['Keeps 3 days.']) && ws.anchor === 'wprm-recipe-container-115242' && ws.via === 'wordpress' && ws.siteName === 'Eating on a Dime' && ws.image === 'https://www.eatingonadime.com/photo.jpg', 'and its cookware, notes, jump spot, site name and photo');
  const ld = [{ '@type': 'WebPage', name: 'x' }, { '@type': 'Recipe', name: 'Deviled Egg Macaroni Salad', recipeIngredient: ['12 oz elbow macaroni', '1 cup mayonnaise'], recipeInstructions: [{ '@type': 'HowToStep', text: 'Cook.' }, { '@type': 'HowToStep', text: 'Stir.' }], totalTime: 'PT1H25M', recipeYield: ['12'] }];
  const wl = RR.parseSent({ url: 'https://www.eatingonadime.com/deviled-egg-macaroni-salad/', html: '<p>no card here</p>', ld });
  ok(wl.ingredients.length === 2 && wl.steps.length === 2 && wl.totalTime === 85 && wl.servings === 12, 'WordPress post with its structured data (Yoast): the full recipe -> ' + J([wl.ingredients.length, wl.steps.length, wl.totalTime, wl.servings]));
  const tasty = RR.parseSent({ url: 'https://example.com/tasty/', html: '<div class="tasty-recipes"><div class="tasty-recipes-ingredients"><h4>Ingredients</h4><ul><li>2 cups flour</li><li>1 cup milk</li></ul></div><div class="tasty-recipes-instructions"><h4>Instructions</h4><ol><li>Mix.</li><li>Bake.</li></ol></div></div>' });
  ok(J(tasty.ingredients) === J(['2 cups flour', '1 cup milk']) && J(tasty.steps) === J(['Mix.', 'Bake.']), 'Tasty Recipes card markup -> ' + J([tasty.ingredients, tasty.steps]));
  let threw = ''; try { RR.parseSent({ url: 'https://example.com/a/', html: '<p>Just a blog post.</p>' }); } catch (e) { threw = e.message; }
  ok(/No recipe card/.test(threw), 'a post with no recipe says so');
  threw = ''; try { RR.parseSent({ url: 'http://127.0.0.1/x', html: wprmCard }); } catch (e) { threw = e.message; }
  ok(/doesn.t look right/.test(threw), 'refuses private addresses');
  const post = body => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o, headers: this.headers }); }, end() { resolve({ code: this.code, headers: this.headers }); } };
    RR({ method: 'POST', headers: { origin: 'https://djvas1975.github.io' }, query: {}, body }, res);
  });
  const pr = await post(JSON.stringify({ url: 'https://www.eatingonadime.com/deviled-egg-macaroni-salad/', html: wprmCard }));
  ok(pr.body.ok && pr.body.ingredients.length === 3 && /POST/.test(pr.headers['Access-Control-Allow-Methods']) && pr.headers['Access-Control-Allow-Origin'] === 'https://djvas1975.github.io', 'POST from the app works and is allowed from the app\'s site');
  const pre = await new Promise(resolve => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json() {}, end() { resolve({ code: this.code, headers: this.headers }); } }; RR({ method: 'OPTIONS', headers: { origin: 'https://djvas1975.github.io' }, query: {} }, res); });
  ok(pre.code === 204 && /content-type/.test(pre.headers['Access-Control-Allow-Headers']), 'the browser\'s pre-check for the POST is answered');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
