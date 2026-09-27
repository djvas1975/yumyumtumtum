// Offline tests for full captions on every platform (fake pages shaped like the real ones).
const path = require('path');
const R = path.join(__dirname, '..');
const P = require(path.join(R, 'lib/parse.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = x => JSON.stringify(x);
const real = a => a.filter(x => !x.startsWith('## '));

const dumplings = `Chicken & dumplings 🥟 the coziest dinner for a cold night!

Soup base:
4 tbsp butter
1 yellow onion, diced
3 carrots, diced
3 celery stalks, diced
4 cloves garlic, minced
1/3 cup flour
8 cups chicken broth
1 rotisserie chicken, shredded
1 cup heavy cream
Salt and pepper to taste

Dumplings:
2 cups flour
1 tbsp baking powder
1 tsp salt
3/4 cup milk
4 tbsp melted butter

Instructions:
1. Melt butter in a large pot and cook the onion, carrots and celery until soft.
2. Add garlic, then stir in the flour and cook 1 minute.
3. Slowly pour in the broth and bring to a simmer.
4. Mix the dumpling ingredients until just combined.
5. Stir in the chicken and cream, then drop spoonfuls of dough on top.
6. Cover and simmer 15 minutes without lifting the lid.
#chickenanddumplings #soupseason #comfortfood`;

// what TikTok's quick lookup hands back: the same caption squashed onto one line
const flat = dumplings.replace(/\n+/g, ' ');

// headings but no "Ingredients" heading, directions as sentences
const noIngHead = `Creamy Tuscan chicken 😍
2 chicken breasts
1 cup heavy cream
1/2 cup parmesan
1/2 cup sun dried tomatoes
2 cups spinach
Directions:
Sear the chicken 5 min per side and set aside. Cook the tomatoes and garlic for a minute. Add cream and parmesan and simmer until thick. Add spinach, return the chicken, and spoon the sauce over.
#dinner`;

// emoji bullets, all on one line
const emojiLine = 'Crockpot chicken tacos 🌮 so easy!! 🍗 2 lb chicken breast 🧂 1 packet taco seasoning 🍅 1 jar salsa 🧀 1 cup shredded cheese. Cook on low 6 hrs, shred, and serve in warm tortillas! #crockpot #tacos';

// labels whose directions come right after, with no "Instructions" heading
const labelsThenSteps = `Garlic butter steak bites
Steak:
1 lb sirloin, cubed
1 tbsp oil
Garlic butter:
3 tbsp butter
4 cloves garlic
Sear the steak in a hot pan 2 minutes per side until browned.
Add the butter and garlic and toss for 1 minute more.`;

(async () => {
  // ---------- the caption reader by itself ----------
  const a = P.parseCaption(dumplings);
  ok(a.title === 'Chicken & dumplings', 'labels: title -> ' + a.title);
  ok(a.ingredients[0] === '## Soup base' && a.ingredients.includes('## Dumplings'), 'labels: "Soup base:" and "Dumplings:" become groups -> ' + J(a.ingredients.filter(x => x.startsWith('##'))));
  ok(real(a.ingredients).length === 15 && a.ingredients.includes('1 yellow onion, diced') && a.ingredients.includes('3/4 cup milk'), 'labels: all 15 ingredients -> ' + real(a.ingredients).length);
  ok(a.steps.length === 6 && /^Melt butter/.test(a.steps[0]) && /^Cover/.test(a.steps[5]), 'labels: 6 steps -> ' + a.steps.length);

  const b = P.parseCaption(flat);
  ok(b.title === 'Chicken & dumplings', 'one line: title -> ' + b.title);
  ok(b.ingredients[0] === '## Soup base' && b.ingredients.includes('## Dumplings'), 'one line: groups found -> ' + J(b.ingredients.filter(x => x.startsWith('##'))));
  ok(real(b.ingredients).length >= 14 && b.ingredients.includes('1 yellow onion, diced') && b.ingredients.includes('1 tbsp baking powder'), 'one line: ingredients split apart -> ' + J(b.ingredients));
  ok(b.steps.length === 6 && !/#/.test(b.steps[5]), 'one line: 6 steps, hashtags gone -> ' + J(b.steps));

  const c = P.parseCaption(noIngHead);
  ok(c.title === 'Creamy Tuscan chicken', 'no ingredients heading: title -> ' + c.title);
  ok(c.ingredients.length === 5 && c.ingredients[0] === '2 chicken breasts', 'no ingredients heading: amounts before "Directions" become ingredients -> ' + J(c.ingredients));
  ok(c.steps.length === 4 && /^Sear/.test(c.steps[0]), 'no ingredients heading: paragraph split into steps -> ' + J(c.steps));

  const d = P.parseCaption(emojiLine);
  ok(d.title === 'Crockpot chicken tacos', 'emoji bullets: title -> ' + d.title);
  ok(d.ingredients.length >= 3 && d.ingredients[0] === '2 lb chicken breast' && d.ingredients.includes('1 jar salsa'), 'emoji bullets: ingredients -> ' + J(d.ingredients));

  const e = P.parseCaption(labelsThenSteps);
  ok(J(e.ingredients) === J(['## Steak', '1 lb sirloin, cubed', '1 tbsp oil', '## Garlic butter', '3 tbsp butter', '4 cloves garlic']), 'labels then steps: ingredients -> ' + J(e.ingredients));
  ok(e.steps.length === 2 && /^Sear/.test(e.steps[0]), 'labels then steps: steps -> ' + J(e.steps));

  // things that must NOT turn into headings or ingredients
  const f = P.parseCaption(`Honey garlic salmon\nIngredients:\n2 salmon fillets\n2 tbsp honey\nSalt, pepper, garlic powder, onion powder, paprika and a little chili flakes to taste\nInstructions:\n1. Bake: 400F for 12 minutes.\n2. Brush with honey and broil 2 min.\nPrep time: 5 min\nFollow me for more!`);
  ok(f.ingredients.length === 3 && /garlic powder/.test(f.ingredients[2]), 'long seasoning line stays an ingredient -> ' + J(f.ingredients));
  ok(f.steps.length === 2 && /^Bake: 400F/.test(f.steps[0]), '"Bake: 400F…" stays a step -> ' + J(f.steps));
  const g = P.parseCaption(`CHICKEN AND DUMPLINGS\nIngredients:\n1 chicken\n2 cups flour\nDirections:\n1. Boil the chicken.\n2. Add dumplings.`);
  ok(g.title === 'CHICKEN AND DUMPLINGS' && g.ingredients.length === 2, 'all-caps title is not a heading -> ' + g.title + ' ' + J(g.ingredients));
  const h = P.parseCaption('Serves: 4\nIngredients:\n2 cups rice\n1 cup water\nMethod:\nCook the rice.');
  ok(h.ingredients.length === 2 && h.steps.length === 1, '"Serves: 4" doesn\'t swallow what follows -> ' + J(h));
  const i = P.parseCaption('Quick pasta 1 lb chicken breast cut into 1 inch pieces');
  ok(!i.ingredients.includes('1 inch pieces'), '"cut into 1 inch pieces" not split');
  const k = P.parseCaption('Dinner idea\n- 2 lbs chicken thighs (about 6)\n- 1 (14 oz) can coconut milk\n- 2 tbsp red curry paste');
  ok(J(k.ingredients) === J(['2 lbs chicken thighs (about 6)', '1 (14 oz) can coconut milk', '2 tbsp red curry paste']), 'amounts inside parentheses stay put -> ' + J(k.ingredients));

  const m1 = P.parseCaption('Crockpot chicken tacos 🌮 so easy!! 🍗 2 lb chicken breast 🧂 1 packet taco seasoning 🍅 1 jar salsa 🧀 1 cup shredded cheese. Cook on low 6 hrs, shred, and serve in warm tortillas! #crockpot #tacos');
  ok(J(m1.ingredients) === J(['2 lb chicken breast', '1 packet taco seasoning', '1 jar salsa', '1 cup shredded cheese']) && m1.steps.length === 1, 'emoji line: direction peeled off the last ingredient -> ' + J(m1));
  const m2 = P.parseCaption('Replying to @jess.cooks here you go!! Chicken and dumplings the easy way 🥣\nIngredients 👇\n🧈 4 tbsp butter\n🧅 1 onion\n🥟 1 can Grands biscuits, cut in quarters\n\nMelt butter and cook the veggies. Add broth, soup and chicken and bring to a boil. Drop in the biscuits, cover and simmer 15 min. Enjoy!! Follow for more easy dinners 🫶 #easydinner');
  ok(m2.title === 'Chicken and dumplings the easy way' && m2.ingredients.length === 3 && m2.steps.length === 3, 'reply caption: title, "Ingredients 👇", chatter dropped -> ' + J(m2));
  const m3 = P.parseCaption('One pot taco pasta!! Ingredients: 1 lb ground beef, 1 packet taco seasoning, 1 can rotel, 3 cups broth, 8 oz pasta, 1 cup cheese. Brown the beef, add everything but cheese, simmer 12 min, top with cheese. #pasta');
  ok(m3.ingredients.length === 6 && m3.ingredients[5] === '1 cup cheese' && m3.steps.length === 1, 'comma list then directions -> ' + J(m3));

  const n1 = P.parseCaption('Easy chili\nGround beef: 2 lbs\nBeans: 2 cans\nChili powder: 2 tbsp\nBrown the beef, add everything and simmer 1 hour.');
  ok(J(n1.ingredients) === J(['Ground beef: 2 lbs', 'Beans: 2 cans', 'Chili powder: 2 tbsp']) && n1.steps.length === 1, '"Item: amount" lines stay ingredients, sentence becomes a step -> ' + J(n1));

  // real TikTok captions (read live from TikTok on Sep 26, 2026)
  const r1 = "Chicken And Dumplings Recipe:  1 whole chicken 1 yellow onion rough chopped 4 stalks of celery rough chopped  4 tablespoons of Morton's Nature Seasons Seasoning Blend 2 tbsp of Cajun Seasoning  6 cups of water  Dumplings:  2 cups of Self Rising Flour 1/2 stick of butter 3/4 cup of cold chicken broth  Make sure you taste your chicken and dumplings at the end of your cook to see if it needs some additional seasonings. If you do add 1 tbsp of Cajun seasoning, 1 tbsp of Morton's Natures Season seasoning blend, and a pinch of salt. It should come out perfect.   #chicken #comfortfood #soulfood #soulfoodcooking #southernfood #chickenanddumplings #fallfood";
  for (const [name, txt] of [['double spaces', r1], ['single spaces', r1.replace(/ {2,}/g, ' ')]]) {
    const x = P.parseCaption(txt);
    ok(x.title === 'Chicken And Dumplings' && real(x.ingredients).length === 9 && x.ingredients[6] === '## Dumplings' && x.ingredients[9] === '3/4 cup of cold chicken broth' && x.steps.length === 3, 'real one-line caption (' + name + ') -> ' + J(x));
  }
  const r2 = P.parseCaption("Replying to @chardavis68  My Easy Chicken and Dumplings 🧑🏻‍🍳 Ingredients: • 2 chicken breasts • 10 cups water • Salt, to taste • Pepper, to taste • 1 can cream of chicken soup • 3 cups Martha White self-rising flour • 2 tablespoons vegetable oil • Milk (as needed) Instructions: 1. In a large cooker, boil 2 chicken breasts with 10 cups of water and salt to taste. For extra flavor, leave the fat on one of the chicken breasts. This fat will be removed later. 2. Once the chicken is cooked, let it cool slightly and shred both breasts. Remove the fat from the chicken. 3. Set the water used for boiling the chicken aside; this will be your chicken broth. 4. Return the shredded chicken to the cooker with the chicken broth. 5. Add 1 can of cream of chicken soup to the cooker. Season with salt and pepper to taste. Stir the mixture well. 6. Heat the mixture on high until it starts to boil. 7. While waiting for it to boil, prepare the dumpling dough: In a bowl, combine 3 cups self-rising flour, 2 tablespoons vegetable oil, and milk. Stir until the mixture is slightly runnier than biscuit dough, adding more milk if needed. 8. Once the mixture is boiling, drop spoonfuls of the dumpling dough into the cooker using a teaspoon. Continue until the cooker is full or the dough is used up. 9. Do not stir the dumplings. Gently jiggle the pot a few times while cooking. 10. Cover the cooker with the lid and cook on medium heat for 5 minutes. 11. Remove from heat and serve. Y’all Hungry? #MamawGail #MamawGailCooks #Mamawcooking #Southerncooking #appalachian #appalachia #Mamaw#appalachiancooking #cookin #recipe #oldfashioned #grandma #fyp #stepbystep #cooktok # #dumplings #chickendumplings #chickenanddumplings");
  ok(r2.title === 'My Easy Chicken and Dumplings' && r2.ingredients.length === 8 && r2.steps.length === 11 && /^Remove from heat and serve/.test(r2.steps[10]) && !/#/.test(r2.steps[10]), 'real caption with bullets and 11 steps -> ' + J(r2.steps[10]));

  // ---------- platforms, with a fake internet ----------
  const tkState = JSON.stringify({ __DEFAULT_SCOPE__: { 'webapp.video-detail': { itemInfo: { itemStruct: { desc: dumplings, author: { uniqueId: 'hayleighluttmers' }, video: { cover: 'https://p16-sign.tiktokcdn-us.com/cover.jpeg' } } } } } });
  const tkPage = '<html><head><meta property="og:image" content="https://x/og.jpg"></head><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">' + tkState + '</script></body></html>';

  const igEmbedHtml = `<html><body><div class="Embed"><div class="Header"><span class="UsernameText">tori_and_nessa</span></div>
<img class="EmbeddedMediaImage" alt="Photo by Tori" src="https://scontent.cdninstagram.com/v/t51/abc.jpg?stp=dst&amp;_nc_ht=x" srcset="x 640w">
<div class="Caption"><a class="CaptionUsername" href="https://www.instagram.com/tori_and_nessa/" target="_blank">tori_and_nessa</a><br /><br />Marry me chicken pasta 😍<br /><br />Ingredients:<br />- 2 chicken breasts<br />- 1 cup heavy cream<br />- 1/2 cup sun dried tomatoes<br />- 1 lb penne<br /><br />Directions:<br />1. Sear the chicken.<br />2. Make the sauce.<br />3. Toss with pasta.<br /><br /><a href="https://www.instagram.com/explore/tags/pasta/">#pasta</a><div class="CaptionComments"><a>View all 526 comments</a></div></div></div></body></html>`;
  const igCtxInner = JSON.stringify({ context: { media: { shortcode_media: { display_url: 'https://scontent.cdninstagram.com/ctx.jpg', owner: { username: 'birria_boss' }, edge_media_to_caption: { edges: [{ node: { text: 'Birria tacos 🌮\nIngredients:\n3 lb chuck roast\n4 guajillo chiles\n2 cups broth\nSteps:\n1. Braise the beef.\n2. Dip and fry the tortillas.' } }] } } } } });
  const igCtxHtml = '<html><script>window.__x = {"contextJSON":' + JSON.stringify(igCtxInner) + '};</script></html>';
  const igPostTeaser = '<html><head><meta property="og:image" content="https://scontent/og.jpg"><meta property="og:description" content="68K likes, 526 comments - tori_and_nessa on March 3, 2025: &quot;Marry me chicken pasta 😍 Ingredients: 2 chicken breasts...&quot;"><meta property="og:title" content="Tori &amp; Nessa on Instagram: &quot;Marry me chicken pasta 😍&quot;"></head></html>';

  const blog = `<html><head><script type="application/ld+json">{"@type":"Recipe","name":"Chicken and Dumplings","image":"https://blog.example.com/cd.jpg","recipeIngredient":["4 tbsp butter","1 onion","3 carrots","2 cups flour"],"recipeInstructions":[{"@type":"HowToStep","text":"Melt butter."},{"@type":"HowToStep","text":"Add dumplings."}],"totalTime":"PT1H","recipeYield":"6"}</script></head><body><div id="wprm-recipe-container-77"></div></body></html>`;

  const pages = {
    'https://www.tiktok.com/@hayleighluttmers/video/7412345678901234567': tkPage,
    'https://www.instagram.com/p/DAbc123xyz/embed/captioned/': igEmbedHtml,
    'https://www.instagram.com/reel/DAbc123xyz/?igsh=abc': igPostTeaser,
    'https://www.instagram.com/p/CtxPost99/embed/captioned/': igCtxHtml,
    'https://www.instagram.com/p/NoEmbed77/embed/captioned/': '<html><body>Sorry</body></html>',
    'https://www.instagram.com/p/NoEmbed77/': igPostTeaser,
    'https://blog.example.com/chicken-dumplings': blog,
    'https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=123456789012': JSON.stringify({ data: [{ link: 'https://blog.example.com/chicken-dumplings', description: 'Best chicken and dumplings', images: { '564x': { url: 'https://i.pinimg.com/564x/a.jpg' } } }] }),
    'https://www.pinterest.com/pin/555555555555/': '<html><head><meta property="og:image" content="https://i.pinimg.com/p.jpg"><meta property="og:title" content="Easy Pie"></head><script>{"pin":{"link":"https:\\/\\/blog.example.com\\/chicken-dumplings","id":"1"}}</script></html>',
    'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fshorts%2FabcDEF12345': JSON.stringify({ title: 'Chicken & Dumplings in 60 seconds', author_name: 'Cook Guy' }),
    'https://www.youtube.com/watch?v=abcDEF12345': '<html><script>var x = {"shortDescription":"The coziest soup!\\nFull recipe: https://blog.example.com/chicken-dumplings\\nMy knives: https://amzn.to/abc"};</script></html>'
  };
  global.fetch = async (url) => {
    const body = pages[url];
    if (body == null) return { status: 404, ok: false, headers: new Map(), text: async () => '' };
    return { status: 200, ok: true, headers: new Map([['content-type', 'text/html']]), text: async () => body };
  };
  const { readRecipe } = require(path.join(R, 'api/recipe.js'));

  const t = await readRecipe('https://www.tiktok.com/@hayleighluttmers/video/7412345678901234567');
  ok(t.author === '@hayleighluttmers' && /cover\.jpeg/.test(t.image), 'tiktok page: creator and cover');
  ok(real(t.ingredients).length === 15 && t.steps.length === 6, 'tiktok page: full caption with line breaks -> ' + real(t.ingredients).length + ' ingredients, ' + t.steps.length + ' steps');

  const ig = await readRecipe('https://www.instagram.com/reel/DAbc123xyz/?igsh=abc');
  ok(ig.title === 'Marry me chicken pasta', 'instagram embed: title -> ' + ig.title);
  ok(ig.author === '@tori_and_nessa', 'instagram embed: creator -> ' + ig.author);
  ok(ig.image === 'https://scontent.cdninstagram.com/v/t51/abc.jpg?stp=dst&_nc_ht=x', 'instagram embed: photo -> ' + ig.image);
  ok(J(ig.ingredients) === J(['2 chicken breasts', '1 cup heavy cream', '1/2 cup sun dried tomatoes', '1 lb penne']), 'instagram embed: ingredients -> ' + J(ig.ingredients));
  ok(ig.steps.length === 3 && !/comments/.test(ig.caption), 'instagram embed: steps, no comment count -> ' + J(ig.steps));

  const ig2 = await readRecipe('https://www.instagram.com/birria_boss/p/CtxPost99/');
  ok(ig2.title === 'Birria tacos' && ig2.ingredients.length === 3 && ig2.steps.length === 2 && ig2.author === '@birria_boss' && /ctx\.jpg/.test(ig2.image), 'instagram post data: ' + J([ig2.title, ig2.ingredients.length, ig2.steps.length, ig2.author]));

  const ig3 = await readRecipe('https://www.instagram.com/p/NoEmbed77/');
  ok(!/likes/.test(ig3.title) && ig3.title === 'Marry me chicken pasta' && ig3.author === '@tori_and_nessa', 'instagram teaser fallback: no "68K likes" title -> ' + ig3.title);

  const pin = await readRecipe('https://www.pinterest.com/pin/123456789012/');
  ok(pin.kind === 'recipe' && pin.title === 'Chicken and Dumplings' && pin.ingredients.length === 4 && pin.recipeUrl === 'https://blog.example.com/chicken-dumplings', 'pinterest: follows the pin to the recipe -> ' + J([pin.title, pin.ingredients.length, pin.recipeUrl]));
  const pin2 = await readRecipe('https://www.pinterest.com/pin/555555555555/');
  ok(pin2.kind === 'recipe' && pin2.recipeUrl === 'https://blog.example.com/chicken-dumplings', 'pinterest: link found in the pin page -> ' + pin2.recipeUrl);

  const yt = await readRecipe('https://www.youtube.com/shorts/abcDEF12345');
  ok(yt.recipeUrl === 'https://blog.example.com/chicken-dumplings' && yt.ingredients.length === 4 && yt.steps.length === 2 && yt.anchor === 'wprm-recipe-container-77', 'youtube: reads the recipe linked in the description -> ' + J([yt.recipeUrl, yt.ingredients.length, yt.anchor]));
  ok(/i\.ytimg\.com/.test(yt.image), 'youtube: keeps the video picture');

  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
