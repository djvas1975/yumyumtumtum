# YumYum (formerly yumyumtumtum): project summary and handoff

Dave's personal Yummly-style recipe app, shown as **YumYum** since v1.5 (Sept 30, 2026). Only the name
people see changed: the web addresses, the GitHub repo, the Vercel project, the phone's storage
(IndexedDB `yumyumtumtum`, `yyt-` keys), and the backup format (`app:'yumyumtumtum'`) keep the old
name on purpose, so nothing on other accounts had to change and old backups still restore. It saves recipes and cooking videos from TikTok,
Instagram, YouTube, Facebook, Pinterest, and any recipe website, organizes them, and opens
the original when it's time to cook. Built with Claude, step by step, starting Sept 26, 2026.
Current version: **1.5**.

This file is the handoff for a fresh chat. A Claude session that has this GitHub repo reads
it automatically. In any other chat, attach this file and say what you want changed.

---

## Start a fresh chat
1. Best: start a Claude Code session (claude.ai/code) with the repo **djvas1975/yumyumtumtum**
   connected, so Claude can edit, test, and publish changes itself. The Claude GitHub app is
   already installed on Dave's GitHub account with access to all repos.
2. Tell Claude what to change. Claude edits, tests, and pushes to `main`. The app and the
   recipe reader update on their own within about a minute.
3. On the phone, fully close YumYum and reopen it to get the update.

## Where everything lives
| What | Where |
|---|---|
| The app (installed on Dave's Android phone from Chrome) | https://djvas1975.github.io/yumyumtumtum/ |
| Code (public repo, branch `main`) | https://github.com/djvas1975/yumyumtumtum |
| Recipe reader + Discover service (Vercel, free Hobby plan, auto-deploys from GitHub) | https://yumyumtumtum.vercel.app |
| claude.ai copy of the app (private, reader and Discover don't work there) | https://claude.ai/artifact/Jm3hSva7uWbKcXmYypsxje |

Dave's recipes live **on his phone** (the browser's IndexedDB). Since v1.4, **Cloud backup** (Me tab)
copies them automatically to a private Vercel Blob store in his own Vercel account (see "Cloud
backup" below). A new chat still can't see them. Before big changes, Dave can tap **Back up now**.

---

## What the app does (v1.5)
- **Bottom bar:** Home, Search, Yums, +, List (with a count badge), Cook (What can I cook?), Me.
  Cook opened from the tab has no back arrow; opened from Home or a category page it does.
- **Home:** greeting, search pill, quick filter chips, **Just for you** (Discover picks),
  Recently saved, **Browse by cuisine** (scrollable tiles: Mexican, Asian, Italian, Chinese,
  Japanese, Thai, Korean, Vietnamese, Indian, Greek, Mediterranean, Middle Eastern, American,
  Southern, Cajun, BBQ, Caribbean, French, Spanish), **Browse by category** (Main dishes, Sides,
  Appetizers, Soups & stews, Salads, Breakfast, Desserts, Baking, Bread, Drinks), collections,
  saved videos, quick fixes, still want to try, cook it again.
- **Category page** (tap a category tile): "What can I make?" card, Dave's saved recipes in that
  category, and "New ideas for you" from the recipe sites, ranked by his taste.
- **Save a recipe:** the + button, or **Share > yumyumtumtum** from TikTok, Instagram, YouTube,
  Chrome, etc. (Android share target). The link is read automatically: photo, ingredients (with
  groups like "For the sauce"), directions, notes and substitutions, cookware, nutrition,
  times, servings, cuisine, meal type. **Paste recipe text** sorts pasted text into the boxes.
- **Recipe page:** hero photo, stats, "Get the full recipe" card, rating, I made this,
  collections, jump chips, checkable ingredients and steps, notes, cookware, nutrition, full
  caption (for videos), "Full recipe on [site]" link, and a button that jumps to the recipe
  card on the original site. The More (⋯) menu has **Fill in missing details from the link**.
  v1.2 adds: a **Swap** button on ingredients that have a known substitute (green when you're
  missing it and have what the swap uses), a green "Swaps you can make with what you have" box
  under the kitchen check, a swap sheet with amounts and **Add to notes**, "N things for this
  recipe are on your list · See them", and **Cookware & tips** (the recipe's own cookware, tips for
  the pans and appliances the directions use, what to use if you don't have one, and USDA safe
  temperatures for the meat in it).
- **Yums** (rebuilt in v1.3 to be Dave's recipe box): count of recipes and how many made, a search
  pill, six smart collections (All Yums, Favorites, Want to try, Made it, Top rated = 4+ stars,
  30 min or less), **Categories** (the same 10 as Home, as photo tiles with counts; tap for his
  saved recipes in that category), a "N recipes not sorted yet" row when some fit no category,
  **Cuisines** (chips with counts, only ones he has), and **My collections**.
  Every collection page (smart, category, cuisine, or his own) has sort chips (Newest, A to Z, Top
  rated, Most made, Quickest). Category pages add "Find new …", which opens the Home category page
  (What can I make + new ideas).
- **Category on each recipe (v1.3):** the recipe page shows "Category: Main dishes · Change". The
  sheet lets Dave pick one or more; that choice (`r.cats`) wins over the automatic one, and "Let
  the app pick again" clears it.
- **Search:** Dave's own recipes with filters (type, time, status, cuisine, meal, source) and
  sorting, plus a **Find new recipes on Delish, Tasty, and more** button.
- **Discover** (Home > Just for you > See all): free recipes from 33 sites, search, Newest, and
  cuisine chips. Tap a card for a full preview, one tap saves it, ✕ = "Not for me".
- **What can I cook?** (green card on Home, or long-press the app icon): Dave adds what's in
  his kitchen (type it, or tap foods). It shows his saved recipes and new ones from the recipe
  sites, each marked "Ready to cook", "Have the main stuff" (only spices missing), or "Need
  honey, gochujang", with category chips (All, Main dishes, Sides, …) and a "Ready to cook only"
  filter. Typing "chicken rice beans cheese" without commas adds four foods. Basics (salt,
  pepper, oil, water, butter, sugar, flour) count as on hand; "Usual spices" can be turned on.
  Recipe pages and Discover previews say "You have 7 of 9. Need … Spices: …".
- **List** (grocery list, v1.1): a recipe page's **Add to grocery list** (and the Discover
  preview's) opens a sheet where foods already in the kitchen are checked off ("Have it") and not
  added, optional and spice lines are marked, needed ones are picked, and "Or swap: … (you have
  it)" shows when a swap is on hand. The list is also stand-alone: type anything ("milk, paper
  towels"). **By aisle** (store sections) or **By recipe** (each recipe's items together, with
  Open recipe; items for two recipes show under both). Items merge when two recipes need the
  same food. Check items into "In the cart"; **Done shopping** moves them into the kitchen list.
  ⋯ menu: share the list as text, clear checked, clear all.
- **Deals were removed in v1.2** (Dave's call, Sept 28, 2026). He may build store deals as a
  separate app that ties into this one later. What was learned is under "Deals (removed)" below.
- **Cloud backup (v1.4, Me tab):** Turn on shows a recovery code (YUM-XXXX-XXXX-XXXX-XXXX) to save,
  then it backs up by itself; Back up now; More (see my code, restore, turn off); Restore from cloud
  on a new phone (type the code, pick Latest or a day's copy). Dave chose Vercel only (no OneDrive:
  Microsoft makes web apps sign in again every 24 hours, and personal accounts report being blocked
  from registering apps in Azure).
- **Me:** name, stats, **What it's learned you like** (taste chips, **Foods you don't eat**
  list, Start over), backup and restore, remove examples, storage info.
- Works offline once installed (service worker). Long-press the icon for Save, What can I cook, and Grocery list shortcuts.

## How it's built
| File | Purpose |
|---|---|
| `tools/app.html` | **The whole app, the one file to edit** (vanilla JS, CSS, views, storage, Discover, taste profile). |
| `tools/build.py` | Wraps app.html into `index.html` and writes `manifest.webmanifest`, `sw.js` (new cache version each build), `README.md`, `.nojekyll`. |
| `index.html`, `manifest.webmanifest`, `sw.js` | Built output. Don't edit by hand. |
| `api/recipe.js` | Recipe reader: `GET /api/recipe?url=...` (add `&debug=1` for a trace). |
| `api/discover.js` | Discover: `GET /api/discover?q=...` (no q = newest). Options: `sites=delish,tasty`, `n=8`, `debug=1`, `all=1`. |
| `api/image.js` | Photo proxy: `GET /api/image?url=...` (falls back to the Internet Archive). |
| `api/backup.js` | Cloud backup to the private Vercel Blob store: `POST ?op=save&day=&daily=1`, `POST ?op=photo&id=`, `GET ?op=info`, `GET ?op=get&day=latest|<day>`, `GET ?op=photo&id=`. Header `x-backup-key` = the recovery code; the first code that sends something claims the store (a hash in `backup/_owner.json`). No store yet: `{ok:false, needsSetup:true}`. Uses `@vercel/blob` (package.json). |
| `api/cook.js` | What can I cook: `GET /api/cook?q=chicken|chicken rice&have=chicken,rice&b=salt,…&x=mexican` (up to 8 searches split on `|`; `have` picks which recipes to read and sorts the answer; `x` adds cuisine sites; `n` default 44, max 48; `debug=1` shows each site, page, and how each recipe matched). Returns `{title,url,image,source,sourceName,ingredients,category,cuisine,totalTime,servings}`. |
| `lib/pantry.js` | Ingredient reader and kitchen matcher (about 210 foods, longest match wins, families like "beans" or "broth", spices kept apart), `splitFoods` for typed lists, `recipeCats` (recipe categories), `AISLES`/`aisleOf` (grocery store sections), and `foodName` (a list item uses the recipe's words: "Potato starch", not "Cornstarch"). |
| `lib/kitchen.js` | Ingredient swaps (`SWAPS`, `swapFor(line)`, `swapHave(option, pantry)`) and cookware tips (`TOOLS`, `TEMPS`, `toolsFor(recipe)`). Sources are listed at the top of the file. |
| `lib/parse.js` | Shared helpers: safe fetching, HTML and JSON-LD reading, **caption parser**, archive fallback. |
| `tools/sync_caption.py` | Copies the caption parser (lib/parse.js), the kitchen matcher (lib/pantry.js), and kitchen help (lib/kitchen.js) into app.html. |
| `tests/reader.test.js`, `tests/captions.test.js`, `tests/cook.test.js`, `tests/list.test.js`, `tests/kitchen.test.js`, `tests/backup.test.js` | Offline tests with fake pages, real captions, ingredient matching, grocery sections and names, swaps and cookware tips, and cloud backup with a fake Blob store. |
| `package.json` | Only for Vercel: the `@vercel/blob` SDK used by api/backup.js. (npm's registry refused `@vercel/blob` inside Claude sessions on Sept 29, 2026, so tests fake it; Vercel installs it on deploy.) |
| `vercel.json` | Function time limits (reader 60 s, Discover 30 s, cook 45 s, backup 30 s). |
| `icons/` | App icons. `tools/make_photo_icons.py` makes the current ones from `tools/icon-art.jpg`. |

Browsers can only call the reader from the app's own site (CORS allows https://djvas1975.github.io),
so other websites can't use it as a free proxy. Direct requests with no browser origin (like
Claude's WebFetch checks) still work. It refuses private or internal addresses.

## Making a change (the routine)
1. Edit `tools/app.html` for the app, or `api/` and `lib/` for the reader or Discover.
2. If the caption section of `lib/parse.js`, or anything in `lib/pantry.js` or `lib/kitchen.js`, changed, run `python3 tools/sync_caption.py`.
3. Build: `python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/`
4. Test: `node tests/reader.test.js && node tests/captions.test.js && node tests/cook.test.js && node tests/list.test.js && node tests/kitchen.test.js && node tests/backup.test.js`
5. App changes: bump the version text in `V.me` (`version 1.5`).
   Reader or Discover changes: also bump `READER_V` in app.html. Vercel caches reader answers
   for a day, and the `&v=` value makes phones get fresh ones.
6. Commit as `djvas1975 <djvas1975@users.noreply.github.com>` and push to `main`.
   GitHub Pages updates in about a minute, Vercel in about 45 seconds.
7. Check live with WebFetch, e.g. `https://yumyumtumtum.vercel.app/api/recipe?url=<encoded>&debug=1&v=<new>`.
8. Optional: copy `tools/app.html` to the artifact file and republish the claude.ai copy.

**Gotchas for Claude sessions:** the shell can't reach outside sites (proxy), so use WebFetch
for live checks. WebFetch drops query params named `src` or `t` and long base64-looking
values. Playwright's Chromium works for screenshots of the app. Make a test copy with
`location.protocol === 'https:'` replaced by `true`, because the reader features need https.

## Recipe reader: what works (confirmed live Sept 26, 2026)
- **Websites:** schema.org Recipe data plus WP Recipe Maker, Tasty Recipes, and Mediavine card
  extras. When a site blocks servers (Allrecipes 402, Budget Bytes 403, Food Network 403) it
  reads the Internet Archive's copy instead.
- **TikTok:** reads the post's own page first for the full caption (the part behind "more"),
  with TikTok's oEmbed as a fallback. Handles /t/ and vm. short links and photo slideshows.
  Tested: @jaffryk.ward chicken and dumplings (9 ingredients in 2 groups, 3 steps),
  @mamawgailcooks chicken and dumplings (8 ingredients, 11 steps).
- **Instagram:** the post's `/embed/captioned/` page for the full caption, photo, and creator.
  Tested on a real Crack Chicken Penne post (13 ingredients, 7 steps).
- **YouTube:** the description, plus it follows a "full recipe" link to the recipe site.
- **Pinterest:** follows the pin to the site it came from. Tested: an Add a Pinch enchiladas pin.
- **Facebook:** best effort, because Facebook often hides posts from outside apps. The page's
  preview text is usually cut off ("…1/2 tsp..."), so the reader (v0.8, `READER_V` 7) looks for the
  whole caption in the page's own data, then in Facebook's embed page (`plugins/video.php` or
  `plugins/post.php` with `show_text=true`). If it still only has the start, it drops the half line,
  sets `captionCut`, and the recipe page says so. Photo: og:image, else the video's cover from the
  page data. Confirmed live Sept 26, 2026 on the foodiligence Korean Popcorn Chicken post
  (`facebook.com/foodiligence/posts/1520738373405084`): the preview stopped at 202 characters, the
  page data had the whole 422-character caption (15 ingredients) and a photo. Reel share links
  (`facebook.com/share/r/…`, `/reel/…`) not yet checked live. That creator keeps the directions
  behind "check my bio", so there are no steps to find in the caption.
- **Caption parser:** handles headings like "Ingredients", "Soup base:", "Dumplings:", "For the
  sauce", captions squashed onto one line (two spaces count as a line break), emoji bullets,
  arrow steps, "Step 1", directions written as sentences, trailing hashtags, calorie lines, and
  "Follow for more" chatter, dash bullets on one line, "cut into 1 in pieces" kept whole, and a
  series name before the dish ("Ep 20: Korean Popcorn Chicken" becomes the title).
- **Fill in missing details** replaces the ingredients and steps (and an automatic title) when they
  still match what an earlier read gave (`impSig`) and the new read covers the same caption or more.

## Discover: how it works
- **Sites that answer (50):** Delish, The Pioneer Woman, and Tasty (their own search pages).
  RecipeTin Eats, Spend With Pennies, Cafe Delites, Damn Delicious, Pinch of Yum, Once Upon a
  Chef, and Jo Cooks (WordPress search). Added Sept 27, 2026 (`wide: true`, asked in every
  search): Chef Savvy, Salt & Lavender, Inspired Taste, Jessica Gavin, Southern Bite, The Girl
  Who Ate Everything, Carlsbad Cravings, Kristine's Kitchen, Life In The Lofthouse, Recipes From
  A Pantry, Six Sisters' Stuff, Skinnytaste, Joyful Healthy Eats, The Anthony Kitchen, Coop Can
  Cook, Butter Be Ready, plus Baker by Nature for baking. Cuisine specialists are asked only when
  a search matches their food (or, in What can I cook, when it's a cuisine Dave likes):
  - Mexican: Mexican Please, Mexico in My Kitchen, Maricruz Avalos
  - Chinese: The Woks of Life, Omnivore's Cookbook
  - Japanese: Pickled Plum, Chopstick Chronicles
  - Korean: Korean Bapsang, Beyond Kimchee
  - Thai: Rachel Cooks Thai, Thai Caliente, Hungry in Thailand
  - Vietnamese: Viet World Kitchen, Hungry Huy
  - Filipino: Panlasang Pinoy
  - Indian: Cook with Manali, Piping Pot Curry, Ministry of Curry
  - Greek: My Greek Dish, Dimitras Dishes
  - Southern: I Heart Recipes, Divas Can Cook
  - Baking: Handle the Heat
- **Sites that block servers (left out):**
  - Big recipe sites: Food Network, Allrecipes, Simply Recipes, Serious Eats. Discover shows
    browser search buttons for these, and saving one via Share still works.
  - Blogs: Budget Bytes, Natasha's Kitchen, Isabel Eats, Tastes Better From Scratch, The Recipe
    Critic, Just One Cookbook, Hot Thai Kitchen, Sally's Baking Addiction, The Mediterranean
    Dish, and a few more.
  - Searching Food Network and Allrecipes through the Internet Archive was tried. It took over
    9 seconds, too slow.
  - Tried Sept 27, 2026 and blocked (403): Add a Pinch, Belly Full, Bowl of Delicious, Chelsea's
    Messy Apron, Chili Pepper Madness, Cooking Classy, Dinner at the Zoo, Dinner then Dessert,
    Gimme Some Oven, Hey Grill Hey, Julie's Eats & Treats, Kevin Is Cooking, Kitchen Fun With My
    3 Sons, Creme de la Crumb, Lil' Luna, Mel's Kitchen Cafe, Muy Bueno, Persnickety Plates, Plain
    Chicken, Preppy Kitchen, Spicy Southern Kitchen, Sugar Spun Run, Tastes of Lizzy T, The Chunky
    Chef, The Cozy Cook, The Stay at Home Chef, Well Plated, Averie Cooks, Cookies and Cups, Cooking
    with Karli, Easy Chicken Recipes, Grandbaby Cakes, Half Baked Harvest, Hilda's Kitchen, Kitchen
    Sanctuary, Mom On Timeout, RecipeGirl, Sugar and Soul, The Salty Marshmallow, The Seasoned Mom.
    Mama Maggie's Kitchen timed out; Taste of Home's search returns no recipes.
  - To try more sites: add them to `SOURCES` in api/discover.js with `trial: true` and call
    `/api/discover?q=chicken&n=3&debug=1&sites=trial`. Keep the ones with results as `wide: true`.
- **"Learns what Dave likes":** runs on the phone, free, no AI service. It weighs food words,
  cuisines, and sites from what Dave saves, favorites, rates, marks made, opens, and skips.
  It picks searches (top dish, top cuisine with top protein, one seasonal pick), ranks the
  results with a mix of sites and dishes, and shows a reason like "Like your Chicken & Dumplings".
  Taps and skips are stored in `Store.settings.taste`.
- **Foods you don't eat** (`Store.settings.taste.never`, v0.9): plain foods ("olives") or groups
  (Seafood, Shellfish, Pork, Red meat, Spicy food, Nuts, Dairy, Mushrooms, see `NEVER_GROUPS`).
  Checked with the kitchen matcher, so "olives" doesn't block olive oil. Applied to Just for
  you, every Discover tab and search, the For you searches, and What can I cook web results
  (titles and ingredient lists). Previews warn when a recipe has one. Start over keeps the list.

## What can I cook: how it works (built Sept 27, 2026; widened the same night)
- The kitchen list is `Store.settings.pantry = {items:[{id,name,t}], basics:[ids]}` on the phone.
  Typed foods map to a known food (`lookupFood`: "hamburger" is ground beef, "cheddar" is
  cheese); unknown ones are kept as their own words and still match ("spam"). `splitFoods`
  splits "chicken rice beans cheese" into four.
- `matchRecipe(ingredients, pantry, title)` returns `need/have/missing` for real ingredients and
  `spices` (dried spices and seasonings) apart. `main` = nothing but spices missing ("Have the
  main stuff"); `ready` = nothing missing. Optional lines (garnish, "to serve", a Toppings
  section) and basics don't count; "or" lines need one; a recipe that just says "broth" or
  "cheese" takes any kind; if the list names no meat, the title's meat counts. The "Usual
  spices" basic (`spices`) treats all spices as on hand.
- First version (v0.9) only showed recipes missing 3 or fewer, which hid almost everything: a
  live check with a 12-food kitchen read 40 real recipes (10 to 21 ingredients each) and only
  2 passed, mostly because of spices. Since v1.0 every recipe that uses something you have is
  shown, sorted by fewest real ingredients missing, then fewest spices, then taste, then how
  much of your kitchen it uses.
- Searches (`cookQueries(cat)`): All = each of the top 3 meats alone, top 2 meats with a side,
  top meats with dishes Dave likes, and "meat casserole" (legumes and eggs after real meat).
  Categories have their own searches ("chicken soup", "potato soup", "chili"; "rice side dish";
  "cheese dip"; "breakfast burritos"; "banana dessert"; "homemade bread"; "agua fresca"…).
  The phone sends `have`, `b`, and `x` (Dave's top 2 cuisines) to `/api/cook`, which asks the
  26 general sites plus matching cuisine sites, merges up to ~900 candidates, reads the 44 most
  promising (favoring your foods in the name), and sorts them by match.
- Categories come from `recipeCats({title, category, tags, meal})`: the recipe card's
  recipeCategory and keywords, the saved recipe's meal type, and words in the name ("Salsa
  Chicken" is a main dish, "Easy Salsa" is an appetizer).
- Results are cached on the phone per search (`COOK.cache`, and the last one in `yyt-cook-v2`)
  for 6 hours, and on Vercel for 6 hours.
- Live check Sept 27, 2026 (v0.9 endpoint): 5 searches, 880 candidates, 40 recipes read, no
  errors, 8.6 seconds.

## Cloud backup: how it works (built Sept 29, 2026)
- Storage: a **private** Vercel Blob store connected to the yumyumtumtum Vercel project (Storage tab >
  Create > Blob > Private). Vercel adds `BLOB_STORE_ID` (OIDC) or `BLOB_READ_WRITE_TOKEN`; a redeploy
  picks them up. Hobby plan (checked Sept 29, 2026): 1 GB storage, 2,000 advanced operations (put,
  list) and 10,000 simple operations a month, free; past the limit Blob stops for 30 days, no charge.
- Files: `backup/latest.json` (recipes, collections, settings; photos replaced by `photoRef`),
  `backup/days/<YYYY-MM-DD>.json` (the first backup of each day, newest 30 kept),
  `backup/photos/<photoKey>` (each photo once), `backup/_owner.json` (sha256 of "yyt:" + code).
- Phone (`tools/app.html`, "cloud backup" block): state in localStorage `yyt-cloud-v1`
  `{on, key, last, lastDay, lastRev, lastCount, err, sent}`; `yyt-rev` counts saved changes
  (bumped in `persist`). Backs up 90 s after the last change, at most every 5 minutes, 20 s after
  opening if something changed, and when the app goes to the background. Settings `kroger`, `stores`,
  `mydeals` are left out. Safety: an automatic backup is skipped if the phone has less than half the
  recipes of the last backup (Back up now still works). Restore uses `restoreData(o, getPhoto)`,
  shared with the file restore.
- Tested offline end to end (Playwright + the real api/backup.js with a fake store): turn on, photo
  sent once, second backup, wrong code refused, restore on a fresh phone with the photo, and the
  "waiting on Vercel" state. **Not yet tested against the real Vercel store** until Dave creates it.

## Yums and categories: how it works (built Sept 29, 2026)
- Collection ids: `_all`, `_fav`, `_try`, `_made`, `_top`, `_quick` (in `SMART`), `cat:<key>` and
  `cat:_none` (your categories via `catsOf`), `cui:<name>` (via `inCuisine`), or a custom collection id.
  `colItems(id)` lists them and `colInfo(id)` names them; `V.col` shows any of them with `rt.sort`.
- `catsOf(r)` returns `r.cats` when Dave picked categories, else the automatic `recipeCats` result.

## Grocery list: how it works (built Sept 28, 2026)
- `Store.settings.grocery = [{id, name, food, detail, recipes:[{id,title}], done, doneAt, t}]`.
  Sections come from `aisleOf(food, name)`. Names use the recipe's words (`foodName`).
  `Store.settings.listView` remembers By aisle or By recipe; the recipe page's "See them" opens
  By recipe scrolled to that recipe (`{name:'list', lview:'recipe', focus:id}`).

## Swaps and cookware tips: how they work (built Sept 28, 2026)
- `swapFor(line)` picks the longest matching swap for an ingredient line (so "buttermilk" beats
  "milk", "coconut milk" and "peanut butter" get none). Each swap has options `{t, d, n, src}`:
  `n` = the foods it uses (pantry ids, inner list = any one of them); `swapHave` says "You have
  this" only when every part is in the kitchen, never for options that use nothing checkable.
- Amounts marked `src:'ext'` come from university extension charts (NDSU FN198 / Purdue
  HHS-784-W, Missouri MP564, Utah State, Arkansas HE-198). `src:'kitchen'` ones are everyday
  like-for-like swaps without invented precision. Half-and-half uses 7/8 cup milk + 1/2 tbsp
  butter (NDSU and Missouri agree; Utah State says 3 tbsp).
- `toolsFor(recipe)` reads the title, directions, and the recipe's cookware list (ingredients only
  for "oil for frying"). It skips false alarms that were tested: "grilled cheese" isn't a grill,
  "mix until blended" isn't a blender, an air fryer isn't deep frying, "brown the beef" in a Dutch
  oven or slow cooker recipe doesn't add a skillet tip, and a stir fry gets the wok tip only.
- Safety facts: FoodSafety.gov temps (poultry 165, ground meat 160, steaks/chops/roasts 145 + 3 min
  rest, fish 145, casseroles 165), USDA deep frying (2 inches of room, thermometer, no water on
  grease fires), Clemson HGIC / USDA slow cookers (thaw first, 1/2 to 2/3 full, vegetables on the
  bottom, lid on), Instant Pot manual (2/3 max, 1/2 for foods that expand, minimum liquid), Pyrex
  (preheat first, no sudden temperature changes, no stovetop or broiler), Waring blender manual (hot
  liquids: small amount, vent the lid, start low).
- Added to the kitchen matcher for this: `cream of tartar` and `molasses` (typing "cream of tartar"
  used to count as heavy cream).

## Deals (removed in v1.2): what was learned
- The Manteca Food 4 Less (131 Spreckels Ave) is run by PAQ, Inc. of Lodi, an employee-owned
  franchisee, not Kroger (Manteca Chamber listing; Progressive Grocer: Kroger "doesn't have any
  administrative control over PAQ's Food 4 Less stores"). Its weekly ad is
  https://myfood4less.com/store/food4less/flyers/weekly. Kroger's API has no stores within 15 miles
  of 95336 (checked with Dave's real keys; his Kroger developer app is `djvas1975recipes`).
- Safeway, Raley's, and Save Mart have no public deals data. Flipp's terms forbid scraping.
- Stores checked Sept 28, 2026: Food 4 Less 131 Spreckels Ave (209) 823-0806; Safeway 1187 S Main St
  (209) 824-1144; Raley's 1280 Lathrop Rd (209) 825-0242; Save Mart 1172 N Main St (209) 239-2267;
  Save Mart 1431 W Yosemite Ave (209) 823-1768.
- The removed code is in git history (commit 3be8028, v1.1.1): `api/deals.js` (Kroger client with
  token cache and test-area fallback) and the Deals tab in `tools/app.html`. Old settings
  (`stores`, `mydeals`, `kroger`) stay on the phone unused.

## Video recipes from what's said (checked Sept 28, 2026, not built)
- Probe: `/api/recipe?url=<video>&debug=1&subs=1` lists the video's own captions and shows the start
  of the caption file. Debug only; normal reads don't change.
- **TikTok: works, free.** TikTok's page data lists its own speech-to-text captions
  (`video.subtitleInfos`, WebVTT, Source `ASR`), and the reader downloaded them from Vercel for both
  videos tried: @jancharles0 7625252149349453070 (435 chars, a one-line caption with no recipe) and
  @mamawgailcooks 7404617088431557931 (5,409 chars).
- **YouTube: not from the server.** Two Shorts (LrCEvNIyX-I, TM7bFFMmK9E) had no `captionTracks` in
  the page Vercel gets.
- **Instagram and Facebook:** they don't share captions of what's said; it would mean downloading
  the video, which their terms don't allow and which they usually block. Not planned.
- Turning a spoken transcript into ingredients and steps well needs an AI model. Estimate with Claude
  Haiku 4.5 ($1 in / $5 out per million tokens): under a penny per video. Needs Dave's own API key
  with billing. Without AI: show "What they said" on the recipe page and pick out the foods mentioned.

## App icon status
- **In use (v0.7, Sept 26, 2026):** Dave's own pick, a 3D-cartoon "pigging out" picture of him
  (glasses, gray goatee, napkin bib, giant burrito, ramen with chopsticks, orange background).
  He made it in ChatGPT from his selfie. The full-size art is `tools/icon-art.jpg`.
- `tools/make_photo_icons.py [picture]` makes everything from it: rounded `icon-512/192.png`,
  `icon-maskable-512/192.png` (art at 82% so Android's round crop keeps his head and the food,
  edges filled by stretching the picture's own edges), `logo-128.png`, and swaps the embedded
  `LOGO` in app.html (a 256px JPEG). Pass a preview path as a second argument for a check sheet.
  To change the icon again, attach the new picture and run it with that file.
- Older icons, kept only for history: the drawn chef mascot (`tools/make_mascot.py`) and the
  rejected hand-drawn Dave (`tools/make_dave_icons.py`). Claude-drawn portraits of Dave were
  rejected twice. For likeness art, use a picture Dave makes or picks himself.
- The home-screen name follows the manifest `name`/`short_name` the same way (web.dev "How Chrome
  handles updates to the web app manifest": name and short_name are updatable on Android).
- Installed phone icon: Chrome on Android checks the manifest when the app is opened (at most
  once every 24 hours), then swaps the icon after the app is closed and the phone is plugged in
  on Wi-Fi (web.dev "How Chrome handles updates to the web app manifest"). To force it sooner,
  back up first (Me > Download backup), then remove and re-add the home-screen icon.

## How Dave likes to work
- Android phone with Chrome. Not a programmer. Plain English, short answers, bottom line first.
- Troubleshooting: one step at a time, using his screenshots.
- Give a recommendation, say what's confirmed and what isn't, and don't overpromise.
- For looks, show a picture and let him choose. He'll say plainly when something misses.

## Ideas not built yet
- Store deals as a separate app that ties into the grocery list (see "Deals (removed)").
- Fill in a video's recipe from what's said in it (see "Video recipes from what's said").
- Meal planner (Yummly had one). The grocery list is ready for it.
- An "Add what I need" button on What can I cook results.
- "More like this" row on a recipe page.
- Scale servings and convert units.
- YouTube cooking videos in Discover.
