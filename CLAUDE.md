# YumYum (formerly yumyumtumtum): project summary and handoff

Dave's personal Yummly-style recipe app, shown as **YumYum** since v1.5 (Sept 30, 2026). Only the name
people see changed: the web addresses, the GitHub repo, the Vercel project, the phone's storage
(IndexedDB `yumyumtumtum`, `yyt-` keys), and the backup format (`app:'yumyumtumtum'`) keep the old
name on purpose, so nothing on other accounts had to change and old backups still restore. It saves recipes and cooking videos from TikTok,
Instagram, YouTube, Facebook, Pinterest, and any recipe website, organizes them, and opens
the original when it's time to cook. Built with Claude, step by step, starting Sept 26, 2026.
Current version: **2.2**.

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
| **Artistry** (was Brush & Glue), the painting, crafts, holidays, supplies and music-lessons app for Steph (separate app, same repo and Vercel project; see the end of this file) | https://yumyumtumtum.vercel.app/crafts/ |

Dave's recipes live **on his phone** (the browser's IndexedDB). Since v1.4, **Cloud backup** (Me tab)
copies them automatically to a private Vercel Blob store in his own Vercel account (see "Cloud
backup" below). A new chat still can't see them. Before big changes, Dave can tap **Back up now**.

---

## What the app does (v2.0)
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
  v2.1.1 (Oct 13, 2026; Dave: "when I hit save it clears out what I filled in"): text left in the Paste recipe text box
  used to be thrown away on Save unless "Sort it into the recipe" was tapped. Now `fSortPasted` runs on its own right
  after a paste (the `paste` event, `insertFromPaste`, or 40+ characters with a line break typed in at once, like the
  keyboard's clipboard chip) and again on Save. Text it can't sort goes in as it is (Ingredients box if empty, else
  notes). A pasted list that starts with an ingredient or a heading is read as `'Pasted recipe\n' + text`, so the
  first ingredient isn't taken as the name and dropped.
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
  v1.7 (Oct 10, 2026) adds, all free (no AI): a **What you'll need** checklist at the top of Cookware & tips
  (every pan, appliance and tool, each with "Step 3", "On the recipe's cookware list", "Said in the video",
  "Likely: for draining in step 2", or "Suggested: to check the chicken is done"), and for recipes with **no
  written steps** a Directions section with **What they said in the video** (TikTok only: TikTok's own speech
  captions, "Cookware heard" chips; older saves get a "Listen to the video" button) and **Steps from a similar
  recipe** (the closest recipe on the Discover sites, looked up by itself the first time the page opens: photo,
  site, steps, cookware, "Uses 5 of the 6 foods in the video", See the steps, **Use these steps** (or "Use this
  recipe" when there are no ingredients), Open it, Another, and "Not the right dish?" search). Used steps carry
  a note "These steps are from a similar recipe … not this video · Take them out". Dave picked the free version;
  AI-written steps from a video were offered as a later add-on (needs his own Claude API key).
- **When a site blocks the reader (v1.8, Oct 12, 2026):** first the phone asks the site's own WordPress feed
  (automatic; "Got 11 ingredients and 7 steps (your phone read it from the site)"). If the site says no to the phone
  too, the Save sheet (and the recipe page after "Get it") shows **Copy it from the page instead**: Open the page →
  long-press, Select all, Copy → come back → a prompt "Got the recipe copied?" with one button, **Paste the
  recipe**. YumYum finds the recipe card inside the whole page (ingredients, steps, cookware, notes, time, servings).
  If Android won't share the clipboard, the prompt turns into a box: long-press, Paste, Use it.
  Confirmed on Dave's phone Oct 12, 2026: Eating on a Dime's Deviled Egg Macaroni Salad came in through the phone.
- **Timers (v1.9, Oct 12, 2026):** up to 4 at once. Opened from a small stopwatch button at the top right of Home, the
  stopwatch beside the heart on every recipe page, a time chip in a recipe step ("⏱ 20 min", one tap starts it, named
  "Step 4" with the recipe under it), or long-press the app icon > Timers. While timers run, a small dark pill above
  the bottom bar shows the next one ("9:58 +1"); tap it for the panel. Panel: one-tap presets (1 to 45 min, 1 hr) and
  Other (a big keypad, microwave style); each timer has big +1 min / Pause / Stop (Stop asks for a second tap); tap a
  name to rename. When one finishes: full-screen "Pasta is done! Stop" (tap anywhere), +1 / +5 min, beeping, buzzing,
  and a notification with Stop and +1 min; the lock screen shows the timer in the media controls. The screen stays on
  while the panel is open. Finished timers stay as "Done at 6:11 PM" (Again, +1 min, Clear).
- **Video on the recipe page (v2.0, Oct 12, 2026):** a play button beside the timer button (only when the recipe has a
  video) opens a floating player over the recipe: drag it by its dark top bar anywhere, make it bigger or smaller,
  close it (or tap the play button again). **v2.1:** like Android's own picture-in-picture window, one finger on the video
  moves it, two fingers pinch it to any size, and one tap unlocks the video's own buttons (play, pause, sound) for a few
  seconds (gold outline while unlocked). It keeps playing while you scroll and remembers where you put it. Works for
  TikTok, Instagram reels, YouTube (Shorts are tall), Facebook videos, and a website recipe card's own video.
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
- **Sync & backup (v2.2, Oct 16, 2026; was Cloud backup):** Dave asked for his phone and tablet to "save and use on both
  devices using same account". The same code on both keeps recipes, photos, collections, kitchen, grocery list, name and
  taste the same; changes show up on the other within a few minutes, and right away when it's opened. A second device:
  Me > Sync & backup > **I have a code** > type the code > Connect (both devices' recipes end up on both; nothing is
  deleted). More: See my code, Bring back an older copy, Turn off sync on this device. See "Sync between devices" below.
- **Cloud backup (v1.4, Me tab):** Turn on shows a recovery code (YUM-XXXX-XXXX-XXXX-XXXX) to save,
  then it backs up by itself; Back up now; More (see my code, restore, turn off); Restore from cloud
  on a new phone (type the code, pick Latest or a day's copy). Dave chose Vercel only (no OneDrive:
  Microsoft makes web apps sign in again every 24 hours, and personal accounts report being blocked
  from registering apps in Azure).
- **Family (v1.6):** Dave's family can use the same app link. Each phone keeps its own recipes,
  kitchen, grocery list, and taste; updates reach everyone. New installs start with no name and a
  "Welcome to YumYum! What should we call you?" card on Home (Skip sets `nameSkip`). Me > **Share
  YumYum** sends the link with install steps. Each person's cloud backup is separate (own code, own
  folder). iPhone: works in Safari via Share > Add to Home Screen, but iOS doesn't support the
  Share-menu target (firt.dev PWA iOS notes: share_target ❌), so they copy a link and use + instead.
  Not tested on an iPhone yet.
- **Me:** name, stats, **What it's learned you like** (taste chips, **Foods you don't eat**
  list, Start over), backup and restore, remove examples, storage info.
- Works offline once installed (service worker). Long-press the icon for Save, What can I cook, Grocery list, and Timers shortcuts.

## How it's built
| File | Purpose |
|---|---|
| `tools/app.html` | **The whole app, the one file to edit** (vanilla JS, CSS, views, storage, Discover, taste profile). |
| `tools/build.py` | Wraps app.html into `index.html` and writes `manifest.webmanifest`, `sw.js` (new cache version each build), `README.md`, `.nojekyll`. |
| `index.html`, `manifest.webmanifest`, `sw.js` | Built output. Don't edit by hand. |
| `api/recipe.js` | Recipe reader: `GET /api/recipe?url=...` (add `&debug=1` for a trace). `POST /api/recipe` with `{url, html, ld, title, image, site}` sorts a WordPress post the phone read itself (`parseSent` -> `parsePage`, the same parser as websites, plus `cardLists` for cards with no structured data). |
| `api/discover.js` | Discover: `GET /api/discover?q=...` (no q = newest). Options: `sites=delish,tasty`, `n=8`, `debug=1`, `all=1`. |
| `api/image.js` | Photo proxy: `GET /api/image?url=...` (falls back to the Internet Archive). |
| `api/backup.js` | Cloud backup and sync to the private Vercel Blob store: `POST ?op=save&day=&daily=1[&if=<etag>|none]`, `GET ?op=pull&have=<etag>`, `POST ?op=photo&id=`, `GET ?op=info`, `GET ?op=get&day=latest|<day>`, `GET ?op=photo&id=`. Header `x-backup-key` = the recovery code. Each code gets its own folder `backup/u/<first 32 hex of sha256("yyt:"+code)>/`; at most `MAX_PEOPLE` (10) codes can start one (`backup/_people.json`, hashes only), so strangers can't fill the store. No store yet: `{ok:false, needsSetup:true}`. Uses `@vercel/blob` (package.json). Artistry uses the same endpoint with `&app=artistry` (see the Artistry cloud backup section). |
| `api/cook.js` | What can I cook: `GET /api/cook?q=chicken|chicken rice&have=chicken,rice&b=salt,…&x=mexican` (up to 8 searches split on `|`; `have` picks which recipes to read and sorts the answer; `x` adds cuisine sites; `n` default 44, max 48; `debug=1` shows each site, page, and how each recipe matched). Returns `{title,url,image,source,sourceName,ingredients,category,cuisine,totalTime,servings}`. |
| `lib/pantry.js` | Ingredient reader and kitchen matcher (about 210 foods, longest match wins, families like "beans" or "broth", spices kept apart), `splitFoods` for typed lists, `recipeCats` (recipe categories), `AISLES`/`aisleOf` (grocery store sections), and `foodName` (a list item uses the recipe's words: "Potato starch", not "Cornstarch"). |
| `lib/kitchen.js` | Ingredient swaps (`SWAPS`, `swapFor(line)`, `swapHave(option, pantry)`), cookware tips (`TOOLS`, `TEMPS`, `toolsFor(recipe)`), and the What you'll need list (`GEAR`, `GEAR_LIKELY`, `gearFor(recipe)`, `gearHeard(text)`). Sources are listed at the top of the file. |
| `api/similar.js` | Steps from a similar recipe: `GET /api/similar?q=<dish>&ing=<food ids>&skip=<url|url>` (`debug=1` for each site and score). Searches the Discover sites, reads the closest 6 recipe cards (`readRecipe` from api/recipe.js), returns up to 3 with steps. |
| `lib/parse.js` | Shared helpers: safe fetching, HTML and JSON-LD reading, **caption parser**, `recipeFromPage` (a whole copied page -> its recipe card), archive fallback. |
| `tools/sync_caption.py` | Copies the caption parser (lib/parse.js), the kitchen matcher (lib/pantry.js), and kitchen help (lib/kitchen.js) into app.html. |
| `tests/reader.test.js`, `tests/captions.test.js`, `tests/cook.test.js`, `tests/list.test.js`, `tests/kitchen.test.js`, `tests/backup.test.js`, `tests/similar.test.js`, `tests/timers.test.js` | Offline tests with fake pages, real captions, ingredient matching, grocery sections and names, swaps, cookware tips and the What you'll need list, cloud backup and sync with a fake Blob store, and similar-recipe matching with fake recipe sites. |
| `tests/sync.playwright.js` | A phone and a tablet syncing through the real api/backup.js on a pretend Blob store (Playwright, about a minute; not in the quick list). Run after building when sync changes. |
| `package.json` | Only for Vercel: the `@vercel/blob` SDK used by api/backup.js. (npm's registry refused `@vercel/blob` inside Claude sessions on Sept 29, 2026, so tests fake it; Vercel installs it on deploy.) |
| `vercel.json` | Function time limits (reader 60 s, Discover 30 s, cook 45 s, backup 30 s, similar 30 s). |
| `icons/` | App icons. `tools/make_photo_icons.py` makes the current ones from `tools/icon-art.jpg`. |

Browsers can only call the reader from the app's own site (CORS allows https://djvas1975.github.io),
so other websites can't use it as a free proxy. Direct requests with no browser origin (like
Claude's WebFetch checks) still work. It refuses private or internal addresses.

## Making a change (the routine)
1. Edit `tools/app.html` for the app, or `api/` and `lib/` for the reader or Discover.
2. If the caption section of `lib/parse.js`, or anything in `lib/pantry.js` or `lib/kitchen.js`, changed, run `python3 tools/sync_caption.py`.
3. Build: `python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/`
4. Test: `node tests/reader.test.js && node tests/captions.test.js && node tests/cook.test.js && node tests/list.test.js && node tests/kitchen.test.js && node tests/backup.test.js && node tests/similar.test.js && node tests/timers.test.js`
5. App changes: bump the version text in `V.me` (`version 2.2`).
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
  series name before the dish ("Ep 20: Korean Popcorn Chicken" becomes the title). Since v2.1.1: a can size stays with
  its count ("1 8 oz can tomato sauce", "2 14.5 oz cans", "1 1/2 cups" are one line each; "…beef 1 15 oz can beans"
  splits before the 1), and text that starts with a heading ("Ingredients") has no title instead of the first ingredient.
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
- Files, per person in `backup/u/<hash>/`: `latest.json` (recipes, collections, settings; photos
  replaced by `photoRef`), `days/<YYYY-MM-DD>.json` (the first backup of each day, newest 30 kept),
  `photos/<photoKey>` (each photo once). `backup/_people.json` lists the hashes (max 10).
  Since v1.6 (family); before that it was single-owner, but no store existed yet, so nothing moved.
- The whole family shares Dave's free Hobby limits (1 GB, 2,000 advanced ops a month). Phones back
  up at most every 10 minutes to stay well under that.
- Phone (`tools/app.html`, "cloud backup" block): state in localStorage `yyt-cloud-v1`
  `{on, key, last, lastDay, lastRev, lastCount, err, sent}`; `yyt-rev` counts saved changes
  (bumped in `persist`). Backs up 90 s after the last change, at most every 10 minutes, 20 s after
  opening if something changed, and when the app goes to the background. Settings `kroger`, `stores`,
  `mydeals` are left out. Safety: an automatic backup is skipped if the phone has less than half the
  recipes of the last backup (Back up now still works). Restore uses `restoreData(o, getPhoto)`,
  shared with the file restore.
- Tested offline end to end (Playwright + the real api/backup.js with a fake store): turn on, photo
  sent once, second backup, wrong code refused, restore on a fresh phone with the photo, and the
  "waiting on Vercel" state.
- **Store created Oct 1, 2026** by Dave from his phone (project > Storage > Create Database > Blob):
  `yumyumtumtum-blob`, **Private**, region SFO1 (San Francisco), default `BLOB` prefix, connected to
  Production and Preview with OIDC (`BLOB_STORE_ID`; the read-write token box was left unchecked).
  **Confirmed working live the same day:** Dave's phone (YumYum, reinstalled) showed "Backed up today at 5:08 PM ·
  8 recipes". Artistry uses the same store (`&app=artistry`); its first real backup is still to come (Steph turns it on
  in Studio > Cloud backup).

## Sync between devices: how it works (built Oct 16, 2026, v2.2)
- The shared copy is the person's `latest.json` (the same file the backup always wrote, now `version: 2` with
  `sync: {gone, keyT}`), so old backups, day copies and restores keep working.
- **Server** (api/backup.js): `op=pull&have=<etag>` uses Blob `get(..., {ifNoneMatch})`: nothing changed = a 304, nothing
  downloaded (`{same:true}`); otherwise `{etag, backup}`; no copy = `{none:true}`. `op=save&if=<etag>|none` first checks
  the current etag (`head`) and then writes with `put(..., {ifMatch})` (docs: "Throws `BlobPreconditionFailedError` if
  the ETag doesn't match"), answering `{conflict:true, etag}` without writing when the other device saved first. Etags go
  to the app bare (no quotes) and back to Blob quoted. A save without `if` (an app that hasn't updated) still writes as
  before. The day copy is written once a day, by whichever device saves first that day (checked with `head`).
- **Phone** (tools/app.html, "sync" block; localStorage `yyt-sync-v1` = {etag, sig, gone, keyT, miss, pendMajor,
  pendMinorAt, lastPull, lastPush}): `cloudBackup(how)` (old name kept for the buttons; `true` = Sync now, `'bg'` = going
  to the background) pulls, merges (`syncApply`), and sends only when this device's copy differs from the cloud's
  (`syncSig`, a hash of the sorted data), with `if=` the etag it pulled; a conflict pulls and merges again (up to 4 rounds;
  if the cloud keeps naming the etag the device already has, the next try goes without the check).
- **Merging:** recipes and collections keep the newer `updatedAt` (`putCol` now stamps `updatedAt`; a tie with different
  content takes the cloud's, so both settle on one). Deletes are tombstones in `SYNC.gone` (`r:`/`c:` ids, kept 120 days,
  set by `delRecipe`/`delCol`), so a deleted recipe doesn't come back. Settings: each key's time in `SYNC.keyT` (stamped by
  `putSettings`); newer wins; a blank never beats a filled-in value; two never-stamped values (set before 2.2) go to the
  fuller one. The grocery list and the kitchen merge item by item (`syncMergeItems`: each item's `u`, stamped by
  `syncStampItems` when an item is added or changed; removed items get `g:`/`p:` tombstones), so milk added on the phone
  and eggs checked off on the tablet both stay. Examples (`sample:true`) never sync. `kroger`, `stores`, `mydeals` stay out.
- **Photos:** go up once each (`CLOUD.sent`); a recipe from the other device keeps `photoRef` until `syncPhotos` brings the
  photo down (25 per round; one missing from the cloud waits a day, `SYNC.miss`).
- **When:** 2.5 s after opening, on coming back to the app, every 3 minutes while it's on screen, when back online. A real
  change (recipes, collections, grocery, kitchen, name) goes out 15 s later, at most every 30 s; taste learning, list view
  and nameSkip (`SYNC_MINOR`) ride along, or go out on their own after 30 minutes (15 when leaving the app).
- **Vercel free limits** (Hobby, checked Oct 16, 2026, vercel.com/docs/vercel-blob/usage-and-pricing): simple operations
  (a get or head that misses the cache) 10,000 a month, advanced (put, list) 2,000, shared with the family and Artistry.
  A check is one simple op; a send is one put plus about two heads. About 20 checks an hour per device on screen.
- Tested Oct 16, 2026 (`tests/sync.playwright.js`, 21 checks): phone turns on; tablet connects and gets the recipes,
  photo, collection, name, merged grocery list, keeps its own examples and sends its own recipe up; deletes and edits
  travel; changes on both at once all land on both (conflict round); taste alone doesn't send; a real change goes out by
  itself; checking with nothing new downloads nothing; an old app's backup over the shared copy loses nothing.
  **Not confirmed yet on Dave's phone and tablet.** A recipe deleted on one device before 2.2 (no tombstone then) can come
  back once from the other; deleting it again sticks.

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

## Video recipes from what's said (checked Sept 28, 2026; the free part built Oct 10, 2026 in v1.7)
- **Built (v1.7):** the reader asks for TikTok's speech captions on every TikTok (`readTikTok(url, trace, {speech:true})`,
  `speech` in the answer, `READER_V` 11; 12 since v1.8, 13 since v2.0, 14 since v2.0.1, 15 since v2.1.1); the phone keeps it as `r.speech` (or `r.speechChecked` when TikTok has none) and
  shows it as "What they said in the video" when there are no written steps (collapsed under the steps otherwise).
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
  on Wi-Fi (web.dev "How Chrome handles updates to the web app manifest"). A big name or icon change
  shows a Chrome prompt to accept it (the other choice there uninstalls the app). To force it sooner,
  back up first (Me > Download backup), then uninstall and reinstall from Chrome.
- **Icon addresses carry a fingerprint** (`icons/icon-512.png?v=1a2b3c4d`, added by `pic()` in
  tools/build.py, and by tools/stamp_crafts.js for Artistry). Since Chrome 144 (Jan 2026) an icon only
  updates when its address in the manifest changes ("Icons are now considered unchanged if the icons
  field in the manifest remains the same", developer.chrome.com "A better way to update your web
  apps"). Found Oct 1, 2026: Dave's phone still had the first bowl icon five days after the photo
  icon went live (the file names never changed), and the old name a day after the rename.

## What you'll need and similar recipes: how they work (built Oct 10, 2026, v1.7)
- `gearFor(r)` reads each real step (lowercase, dashes as spaces, "9 x 13" -> "9x13", "12-inch") against `GEAR`
  (about 70 items: appliances, pans, bowls, tools, foil/parchment/wrap). Size words in front count ("Large skillet",
  "6-quart slow cooker", "Cast iron skillet"); some use the recipe's own words ("Baking sheets", "9x13 pan"). The oven
  gets its heat ("Oven, heated to 375°F", also "bake at 350"). Then the recipe's own cookware list (its words), then
  cookware said in the video (`r.speech`), then `GEAR_LIKELY` guesses only when nothing named covers them (colander
  for "drain" but not "drain the grease" or "drain on paper towels", pot for boil/simmer when no pot/pan/cooker is
  named, grater, zester, masher, two forks for shredding meat, rolling pin, pastry brush, mixer for creaming butter,
  blender, food processor, deep pot for frying), a can opener when ingredients have cans, and a thermometer for
  meat or frying oil. False alarms tested: "pot roast", "Instant Pot", "grilled cheese", "baking powder", "bake" in
  an air fryer recipe, serving bowls, "you can use". Checks are kept like ingredient checks (`CHECKS[id]['g:'+gearId]`).
- `gearHeard(text)` (speech): named cookware only; bowl/pan/whisk/oven/foil need "my/the/a/your/big/large" in front.
- Similar recipe (`api/similar.js`): `dishWords` drops emoji, hashtags, "Ep 20:", and filler ("easy", "best",
  "viral"…); style words (slow cooker, air fryer, creamy, crispy…) are a bonus, not required ("fried", "baked",
  "stuffed" stay main words). Searches the whole name and the main words alone on the core/wide sites plus matching
  cuisine sites, keeps names scoring >= 0.34, reads the best 6 (2 per site), and keeps one when it covers 60%+ of
  the main words (2 of 3, both of 2) or 34%+ plus 60% of the video's foods. Sorted by name x2 + food overlap.
- Phone: `findSimilar(id, q)` runs on its own once per recipe when a saved link with no steps opens (`SIM.tried`
  stops repeats after an error), and saves `r.similar = {q, at, items}` so it's instant and offline later. `useSimilar`
  sets `r.steps` and `r.stepsFrom = {title, url, sourceName, ing?, eq?}` (adds ingredients/cookware only if the recipe
  had none); `unSimilar` takes them back out; editing the steps by hand drops `stepsFrom`. Changing a recipe's link
  drops `speech`, `speechChecked`, `similar`.
- Tested offline Oct 10, 2026 (Playwright, light and dark, 390 px): checklist, TikTok with speech + similar, use and
  take out, no match + typed search, Listen to the video.

## When a site blocks the reader: how it works (built Oct 12, 2026, v1.8)
- Dave asked: "is there a way the app can copy and paste by itself when recipe reader is blocked?", then "can it be a
  prompt and one click of a button?" A web app can't read another site's pages (browsers block it), so:
- **WordPress feed, from the phone** (`wpRead(url)` in app.html, called by `readLink` when a website's read fails or
  has no recipe): asks `<site>/wp-json/wp/v2/posts?slug=<last part of the address>&_fields=id,link,title,content,
  yoast_head_json,jetpack_featured_media_url` (then `pages`, then `/?rest_route=`), `credentials:'omit'`, 12 s each;
  a network/CORS error stops it. WordPress core sends `Access-Control-Allow-Origin` for any origin on purpose
  (`rest_send_cors_headers`; core.trac #45477 closed wontfix: "a design decision to expose data from the REST API to
  all origins"). The post's `content.rendered` (the recipe card's markup) and Yoast's schema graph go to `POST
  /api/recipe`, which answers like a normal read with `via:'wordpress'`. Checked Oct 12: Eating on a Dime is WordPress +
  WP Recipe Maker (card id 115242). **Not yet confirmed on Dave's phone** whether that site's feed answers.
- **Copy from the page** (`copyCardHTML`, `cpOpen`, `showCpPrompt`, `cpPaste`, `applyCopied`): shown when `readLink` throws
  with `canCopy` (websites only). `CP = {kind:'form'|'recipe', id, url, at}`; coming back to the app (visibilitychange)
  within 20 minutes shows the `#cpprompt` card once; Paste the recipe reads `navigator.clipboard.readText()` (Android may
  ask once); no text or no permission -> the same card becomes a paste box. Form: fills ingredients and steps (replacing),
  notes/cookware/time/servings when empty. Saved recipe: fills only empty fields, sets `importedAt`.
- `recipeFromPage(text)` (lib/parse.js, synced into the app): the last "Ingredients" heading with an "Instructions"
  heading after it (articles often have their own "Ingredients" talk higher up), from an "Equipment" heading up to 25
  lines above, down to Nutrition / Course / Cuisine / comments; drops WPRM noise (▢, 1x 2x 3x, US Customary - Metric,
  Print/Pin, Cook Mode); time and servings from the 30 lines above. No headings: read like pasted recipe text.
- Tested offline Oct 12, 2026 (Playwright, localhost with real clipboard permissions): feed answers -> boxes filled;
  feed blocked -> copy card, open page, come back, prompt, one tap; clipboard refused -> paste box; saved recipe too.
- Idea: the same phone-side WordPress search could unlock some Discover sites that block the server (Budget Bytes,
  Natasha's Kitchen…), since their wp-json search answers browsers.

## Timers: how they work (built Oct 12, 2026, v1.9)
- Dave asked: 4 timers at once, keep running if the phone sleeps and notify when done, don't let the timer icon take
  over the look ("tuck it away yet make it super easy to access"), easy to use while cooking with messy hands.
- **Why a quiet sound:** a web app can't hand an alarm to Android. Chrome's Notification Triggers were dropped
  ("The development of Notification Triggers API... has ended", developer.chrome.com). Chrome freezes or heavily
  throttles hidden pages, except pages that made sound in the last 30 seconds ("a silent audio track doesn't count",
  developer.chrome.com "Heavy throttling of chained JS timers"). So while a timer runs, `TM_A` (one `<audio>`, loop)
  plays a 50 Hz hum at about -50 dB (`tmWav`, made in the app: counts as sound, can't really be heard), started from the
  tap that starts the timer; a tap anywhere after a reload restarts it. At the end it switches to a beep-beep-beep
  alarm (same element, so it plays in the background). Media Session shows "⏱ Pasta · done at 6:42 PM" with a moving
  progress bar on the lock screen; its pause button stops a ringing alarm.
- **Not yet confirmed on Dave's phone:** that the hum keeps YumYum awake with the screen off for long timers, and that
  the notification shows. If Android still kills it, the dependable fix is a push message from the server at the end
  time, which needs a scheduler (e.g. Upstash QStash, a separate free account) and Web Push keys.
- State: `TIMERS` in localStorage `yyt-timers-v1` = [{id, name, sub, rid, dur, end, left, st:'run'|'pause'|'ring'|'done',
  at, doneAt}] (end times, so they stay right after the app reloads; one that ended over a minute ago shows as done
  without ringing). `tmCheck` rings, `tmQuiet` stops ringing (timers become 'done'), `tmRemove`, `tmAdd`, `tmPause`,
  `tmResume`, `tmAgain`. Notifications: `reg.showNotification` with tag `yt-<id>`, `requireInteraction`, actions
  stop/add1; sw.js (tools/build.py) `notificationclick` posts `{timer:'stop'|'add1'|'open', id}` to the page or opens
  `./?go=timers`. Asks for notification permission on the first timer.
- Screen: `#tpill` (z 45), `#tpanel` (z 66, above sheets, pushes a history entry so the back gesture closes it, Wake
  Lock while open), `#talarm` (z 80, only while ringing and the screen is on). They live outside `#app`, so `refresh()`
  doesn't redraw them. `stepTimes(text)` finds "20 minutes", "10-12 min" (uses the low end), "1 hour and 15 minutes",
  "1 1/2 hours", "½ hour", "forty-five minutes", seconds; skips under 10 s and over 12 h; up to 2 chips a step.
- Tested offline Oct 12, 2026 (Playwright with a controlled clock, localhost): presets, keypad 1:30, two at once,
  lock-screen text, back gesture, step chip, alarm screen, sound switching to the alarm and back to the hum, double-tap
  Stop, timers kept after a reload, light and dark.

## Floating video player: how it works (built Oct 12, 2026, v2.0)
- Dave asked: a video icon next to the timer icon when the recipe has a video, opening a floating media player that
  starts the video and can be moved around so it doesn't cover the written recipe.
- `vidOf(r)` picks the player (`r.mediaUrl` first, else `r.url`): TikTok's official embed player
  `https://www.tiktok.com/player/v1/<id>?autoplay=1&rel=0&description=0&music_info=0` (developers.tiktok.com/doc/embed-player;
  photo posts get none; a share link with no video number returns `{resolve:true}`, and `playVideo` asks the reader once
  for `finalUrl` and saves it as `r.mediaUrl`), Instagram `/reel|tv/<code>/embed/` (not `/p/` posts, which may be photos),
  YouTube `/embed/<id>?autoplay=1&playsinline=1&rel=0`, Facebook `plugins/video.php?href=` for /videos/, /reel/, /watch,
  fb.watch, share/v, share/r, then `r.video` from a website's recipe card.
- Reader: `videoOf(recipe.video)` in api/recipe.js -> `{kind:'youtube'|'vimeo', id}` or `{kind:'file', src, poster}` (an
  .mp4/.m4v/.webm contentUrl, which Mediavine/Raptive players list); script players give none. The phone
  keeps `r.video` and, for social posts, `r.mediaUrl = j.finalUrl`. Changing a recipe's link drops `video`, `mediaUrl`
  and `videoCk`.
- **v2.0.1 (Oct 12, 2026), after Dave's fried rice showed no button** though its page has a YouTube video: many blogs put
  the video in the post, not in the recipe card's data. `parsePage` now tries, in order: the recipe's `video` (an `@id`
  reference is looked up in Yoast's graph via `ldVideos`), any other VideoObject in the structured data, og:video /
  twitter:player, then `pageVideo(html)`: a YouTube/Vimeo player inside the recipe card (WPRM, Tasty, Create), then the
  post (`entry-content`, `post-content`…), and the whole page only when the theme names no post area (so a sidebar
  video isn't picked). `embedIn` counts iframes and `data-src`, WP Rocket / Perfmatters lazy players, `<lite-youtube>`,
  and inside the card/post also watch and youtu.be links (Lazy Load for Videos); playlists (`videoseries`) and
  `live_stream` are skipped. The phone's WordPress read (`via:'wordpress'`) searches the whole post. `READER_V` 14.
  Phone: a website/Pinterest recipe with no `r.video` and `r.videoCk !== READER_V` is read again quietly the first time
  its page opens (`needsVideoCheck`, `videoCheck`, once per reader version; offline doesn't count), and every link read
  sets `videoCk`. **Not confirmed yet** on Dave's fried rice (which site it is isn't known).
- Player `#vplayer` (z 44, outside `#app`): 44px dark bar (6-dot grip, name when wide enough, bigger/smaller, close) and
  the iframe or `<video>`. Drag with pointer events on the bar only (the iframe gets `pointer-events:none` while
  dragging), kept on screen and above the bottom bar; position and size saved in localStorage `yyt-vplayer` as
  fractions of the screen. Tall videos: 44% of the width (70% big); wide: 62% (94% big); Instagram at least 300px.
- **Pinch and move (v2.1, Oct 12, 2026; Dave asked to pinch the screen bigger or smaller):** a web page can't see touches
  inside another site's player, so a clear layer `.vp-touch` covers the video. `vpGestures(el)` (pointer events on the
  bar and the layer): one finger moves it after 8 px, two fingers set `VP.cw` (width as a share of the screen, between
  `vpLimits()` min and max: tall 28% of the width (110px+) up to what fits the screen height; wide 42% (170px+) up to the
  width minus 16px; Instagram 300px+) and keep the spot between the fingers under them; lifting one finger goes on as a
  move. Saved in `yyt-vplayer` as `wt` (tall) / `ww` (wide). The bigger/smaller button goes back to the two presets
  (`vpPreset`) and its icon follows the size. A clean tap (no move, under 450 ms) hides the layer on that tap's click
  (not on pointerup, or the same tap lands on the video) for 5 s (`vpLive`, `#vplayer.live`, saffron outline); a tap
  inside the player moves focus into it (window blur), which makes it 8 s; a tap back on YumYum (window focus) ends it.
  A hint "Pinch to resize / Tap to use its buttons" shows the first 3 opens (`hints`). Tested offline with real touch
  events (CDP `Input.dispatchTouchEvent`): pinch out to the biggest, pinch in to the smallest, one-finger move, tap ->
  layer aside without the tap reaching the video, back after 5 s, size kept after reopening, buttons, TikTok biggest fits.
  **Not checked yet on Dave's phone.**
- Tested offline Oct 12, 2026 (Playwright, stand-in video pages): button only with a video, TikTok player address,
  drag from top right to bottom left and saved, bigger and back, close by the play button, TikTok share link resolved
  once and kept, website mp4, no button without a video. Not checked yet on Dave's phone: whether each site's player
  starts by itself with sound (TikTok lists an autoplay error when the browser blocks it; then tap play once).

## How Dave likes to work
- Android phone with Chrome. Not a programmer. Plain English, short answers, bottom line first.
- Troubleshooting: one step at a time, using his screenshots.
- Give a recommendation, say what's confirmed and what isn't, and don't overpromise.
- For looks, show a picture and let him choose. He'll say plainly when something misses.

## Ideas not built yet
- AI-written steps and cookware from a TikTok's speech (Claude Haiku, under a penny a video, needs Dave's own API key).
- Store deals as a separate app that ties into the grocery list (see "Deals (removed)").
- Fill in a video's recipe from what's said in it (see "Video recipes from what's said").
- Meal planner (Yummly had one). The grocery list is ready for it.
- An "Add what I need" button on What can I cook results.
- "More like this" row on a recipe page.
- Scale servings and convert units.
- YouTube cooking videos in Discover.

---

# Artistry (formerly Brush & Glue): the painting, crafts and music app, built Sept 30, 2026

**Version 2.2 (Oct 1, 2026).** 2.0 was a full redesign; 2.1 added the practice tools (tuner, metronome, practice timer and
streak); 2.2 added cloud backup. Supplies are also heard in TikTok videos (what's said, not just the caption).

**Version 2.0 (Oct 1, 2026): a full redesign.** Dave asked for "a mix of Pinterest, Instagram, YouTube, Facebook… take
the best of each app and make one really cool, useful, fun app for collecting art, crafts, painting, music tutorials and
more", sharing from social media kept, sorting by kind and **holiday**, learning what "we" like, **supplies gathered for
each shared project** and "I have these supplies and the app tells us what we're missing", "as if we're charging $20 a
month". He saw the first-look screenshots before it went live.

Renamed Artistry on Oct 1, 2026 (v1.2), icon from Dave's picture. Only the name people see changed: the web address
(`/crafts/`), the phone's storage (IndexedDB `brushglue`, cache names `bng-`), and the backup format (`app:'brushglue'`)
keep the old name on purpose, so nothing saved is lost and old backups still restore. The app is for Steph (Dave's
son's mom); see the Learn music section below. It's a separate installable app in this repo (same GitHub and Vercel).

| What | Where |
|---|---|
| The app (install from Chrome on Android) | https://yumyumtumtum.vercel.app/crafts/ (served by Vercel, NOT GitHub Pages, so its scope doesn't sit inside YumYum's) |
| App files | `crafts/index.html` (page shell and all CSS), `crafts/app.js` (all the app's code: views, storage, learning, save sheet, music, backup, updates), `crafts/cats.js` (Painting/Crafts sorter), `crafts/holidays.js` (holidays, dates, countdowns), `crafts/supplies.js` (supply finder and My supplies check; also used by api/idea.js tests), `crafts/music.js` (Learn music data), `crafts/practice.js` (tuner pitch finder, tunings, tap tempo, practice log math), `crafts/fonts/` (Poppins Medium/Bold, Latin subset, OFL.txt), `crafts/manifest.webmanifest`, `crafts/sw.js` (offline and updates; `VERSION` is stamped by `node tools/stamp_crafts.js`), `crafts/icons/` |
| Icons | App icon from Dave's picture `tools/artistry-icon-art.jpg` (ukulele, paint palette, leaves, music notes on a teal tile): `python3 tools/make_artistry_icons.py [picture] [preview.png]` finds the tile, fills its corners, and writes icon-512/192, icon-maskable-512/192 (86% on a blurred copy of itself so round and rounded-square launchers keep the ukulele and palette), logo-128, apple-touch-icon. `tools/make_crafts_icons.py` draws the teal long-press shortcut icons (add, ideas, supplies, music); `--old` redraws the retired red palette icon into tools/old-crafts-icons/. To change the icon again, attach the new picture and run make_artistry_icons.py with it. |
| Post reader | `api/idea.js`: `GET /api/idea?url=` -> `{platform, kind, title, caption, image, width, height, author, siteName, link, supplies, speech}`. `speech` = what's said in a TikTok video: TikTok's own speech-to-text captions (`video.subtitleInfos`, WebVTT, English first, the spoken language (ASR) before translations (MT), 6 s limit; `readTikTok(url, trace, {speech:true})` and `vttText` in api/recipe.js). Confirmed live Oct 1, 2026 on @timmsevitz 7224597108744146218 (1,186 chars; cardstock and glue found). Instagram/TikTok/YouTube/Facebook use the readers exported from api/recipe.js (`module.exports.readers`); Pinterest uses the pin-info widget JSON and then reads the blog the pin links to for its supply list (9 s limit); websites use og tags plus the supply list from a schema.org HowTo card, a Create/WPRM/Tasty card, or the list under a "Supplies"/"Materials"/"What you'll need" heading (`listedSupplies`). |
| Blog finder | `api/crafts.js`: `GET /api/crafts?q=&type=painting|craft|both&n=&page=` -> items `{title,url,image,width,height,sourceName,kind}` from 42 WordPress craft/painting blogs (their `/wp-json/wp/v2/posts?search=`). `debug=1` reports each site; `sites=trial` tries sites marked `trial: true`. Titles must mention the search (unless that leaves fewer than 6). Food posts, giveaways, reviews are skipped. |
| Tests | `node tests/crafts.test.js` (sorter, reader with fake pages, finder, sw.js stamp), `node tests/music.test.js`, `node tests/holidays.test.js` (dates, countdowns, detection), `node tests/supplies.test.js` (real-style captions, blog lists, spoken supplies, check against My supplies), `node tests/practice.test.js` (pitch finder on made-up and plucked string sounds, tunings, tap tempo, streaks) |
| Share health check | `/api/idea/<anything>?selftest=1` reads one real public post from TikTok, Instagram, YouTube (youtu.be link), Facebook (a video and a post) and Pinterest on Vercel and reports title, caption length, photo host, supplies found on the page, and how it would be filed. `&only=facebook,pinterest` runs some; `&add=<url>|<url>` adds up to 4 more. |
| Live-check aliases | `/api/idea/<anything>?url=`, `/api/crafts/<anything>?q=`, `/api/music/<anything>?inst=` (vercel.json rewrites). WebFetch in Claude sessions cached `/api/crafts?...` by path and ignored new query strings, so use a fresh alias path per check. New paths ask Dave to approve the fetch. |

## Design (v2.0)
- Colors from the icon: paper #fff / ink #17201e, mist #eef3f1 surfaces, **teal #0b7a72** (brand, nav, toggles), **coral
  #ff4d5e** (Save, hearts), **sun #ffb51f** (holidays, countdowns, "Need 2", Making), cobalt (painting), mint (have it,
  Ready, Made it), plum (music). Dark mode has its own set (`prefers-color-scheme`). Poppins (self-hosted) for headings,
  buttons and chips; the phone's font for reading. Emoji are the phone's own (Noto on Android).
- The one loud thing: **painted rings** (`paintRing(seed)`: five palette-colored arcs, a little different per item) on the
  Instagram-style circle rows. Topic tiles are paint-dab shapes. The + in the bottom bar is a teal paint dab.
- Bottom bar: Home, Explore, (+ Save), Music, Studio. No all-caps labels.
- What came from where: Pinterest = masonry wall, boards, Save, More like this. Instagram = circle row (holiday
  countdowns, Making, Ready, Practice, creators), double-tap a photo to heart it, Studio profile with stats, highlight
  circles and a grid of her own "Made it" photos. YouTube = lesson player (speed, loop), Keep practicing with a red
  progress bar, creators like subscriptions. Facebook = "You saved this 3 weeks ago" memory card (Make it / Not now,
  snoozes 7 days, kv `memo`), To make / Making / Made it.

## What it does (v2.0)
- **Home:** Artistry mark, shopping-list basket with a count, search. Circle row: + Save, holidays in the next 75 days
  with "4w"/"9d" tags, Making, Ready to make, Practice (a lesson marked Learning), top creators (2+ saves). Memory card
  (5+ saves; an old "To make" project, preferring ones whose holiday is within 45 days, loved, or ready). Filter chips:
  All, Painting, Crafts, Music, the next holiday that has saves, Ready to make, Making. Masonry of everything she saved
  (music lessons included) with platform glyph, play badge, Making/Made it stamps, heart, and "Ready"/"Need 2" (when
  she has 3+ supplies listed) plus the holiday emoji. "Picked for you" row after the first 8. First open: welcome card
  (name, install, share steps, My supplies).
- **Explore:** search (her saves by title, caption, notes, tags, supply names, kind, holiday, creator; songs; blog
  results), Holidays coming up cards, Browse by kind (paint-dab tiles, 9 then "All 29"), Your creators, Ideas for you
  (topic chips incl. the next holiday) with More ideas.
- **Project page:** full-bleed photo (double-tap = love), Play here, title, creator (tap for their page), Open in X,
  heart/share/edit, To make / Making / Made it (Made it = confetti + "Add a photo of yours"), **Supplies card** (have X
  of Y meter, tap a row to mark it on hand, which updates My supplies; "Said in the video" rows from a TikTok's speech;
  "Usually needs" rows when nothing lists any; Add N to my list; Edit), holiday pills with countdowns, kind pill, tags, How it's made (caption), notes, Yours (her
  photos), project page link, More like this (her saves, then blogs; holiday-aware).
- **Holiday page** (`{v:'holiday', k}`): painted-ring header, countdown and date, Ready to make, Your ideas, Ideas for
  the holiday (blog finder, `HOL_Q`). "All" lists every holiday, celebration and season.
- **My supplies** (`{v:'supplies', tab}` from Home basket, Studio, or `?go=supplies`): I have (type with suggestions, or
  tap common supplies by store section; "Count the basics as on hand" switch) and Shopping list (by store section,
  "For <project>", check off, "Bought the checked ones" moves them into I have, Share list as text, Clear checked).
- **Studio:** profile (name via Edit name), saved/made/songs learned, My supplies, Share Artistry (owner only), holiday
  highlight circles, tabs Boards (Everything, Painting, Crafts, Music, Favorites, Want to make, Making now, Made it,
  Ready to make, plus each kind) / Made (3-column grid of her photos) / Taste (lean, favorite kinds, holidays, creators,
  tags, music lately, Not for me), install card, Cloud backup card and Backup file card, version line (5 taps = owner switch).
- **What they said** (TikToks): a section on the project page with the transcript; older TikToks get "Listen to the video for
  supplies" in the ⋯ menu (`listenForSupplies`, sets `speechChecked`). Pins keep `speech`. Search looks in it too.
- **Save sheet** (Share menu or +): reads the post, picks the board (Painting/Crafts/Music) and kind (8 shown, More…),
  **Holiday or season** chips (found ones on, next holidays offered), "Found 5 supplies · You have 2 of 5", tags, notes.
  Saving an Explore idea also reads its blog page in the background for the supply list.
- Learning (free, on the phone): weights save 1, favorite +3, made +2, making +1.5, opens +0.5 each (max 4); kinds, tags,
  holidays and creators; idea ranking adds holidays she saves for and holidays within 45 days.
- Data on each art pin (added at save, or once at startup for older saves): `needs` (from `Supplies.gather`; `needsEdited`
  when she edits), `holidays` (from `Holidays.detect`, editable), `status` 'want'|'making'|'made', `madePhotos` (photo
  keys `<pinId>:m<time>` in the `photos` store). kv: `stash` {have, custom, basics}, `shop` [{k, sid, name, g, pins,
  done}], `profile` {name}, `memo` {snooze}. Backups include all of these and the made photos.
- Share Artistry (v1.3): a button in Studio that sends the link and install steps by text (`shareApp`, `APP_INVITE`),
  only on a phone where it was turned on by opening `https://yumyumtumtum.vercel.app/crafts/?me=dave` once (or 5 taps
  on the version line in Studio; `?me=off` or 5 taps again turns it off). kv `owner`, not in backups.
- Categories (crafts/cats.js): Painting: Acrylic, Watercolor, Paint pouring, Rock painting, Dot art & mandalas,
  Painted pumpkins/glass & more, Oil, Gouache, Spray paint, Furniture & signs, Walls & murals, Drawing & sketching,
  Kids painting. Crafts: Wood, Paper, Resin, Cricut & vinyl, Sewing & fabric, Yarn & crochet, Jewelry & beads, Clay,
  Candles & soap, Wreaths & florals, Glass & mosaic, Holiday & seasonal, Home decor, Kids crafts, Upcycle & DIY,
  Diamond art & kits.
- Holidays (crafts/holidays.js): New Year's, Valentine's, St. Patrick's, Easter (computus), Cinco de Mayo, Mother's Day
  (2nd Sun May), Father's Day (3rd Sun June), Fourth of July, Back to school (Aug 15), Halloween, Día de los Muertos,
  Thanksgiving (4th Thu Nov), Hanukkah (Wikipedia table 2025-2030; no date after that), Christmas, Kwanzaa; plus
  Birthdays & parties, Weddings & showers, Graduation (no date) and the four seasons. Weak words (pumpkin, skull,
  heart…) need a second hint.
- Supplies (crafts/supplies.js): ~150 supplies in 12 store sections with keywords (longest match wins), `fam` for
  stand-ins (any canvas), `basic` for things most homes have, `LIKELY` usual supplies per kind, `listed()` reads lists
  under Supplies/Materials/You'll need headings (bullets, one-line lists, amounts, links and colors in parentheses
  handled), `gather()` = list + things named in the post + said in the video (`spoken()`) + usual ones when fewer than 2,
  `check()` against My supplies. `spoken()`: clear names anywhere; weak words ("jar", "canvas") only within ~110
  characters after "you'll need", "I'm using", "grab"… or when said twice; never "saw", "iron", "oils", "torch".
  "glued"/"gluing" count as glue, "hot glued" as a hot glue gun.

Checked live Sept 30, 2026: the reader read a real public Instagram post through the embed page; the finder returned
60+ real projects for "painted rocks". Oct 1, 2026: the share health check read a real TikTok, Instagram, YouTube,
Facebook (video and post) and Pinterest post, all with photos. Not checked yet: sharing from a real phone.

Sites that answer (Sept 30, 2026) are listed in api/crafts.js; the ones that turned Vercel away are in its comment.
An earlier claude.ai artifact version (https://claude.ai/artifact/2CjJ4k1XatYWvESKhAYXVm) is superseded by this app.

Ideas not built yet: YouTube/TikTok search in Ideas (needs an official API key), store prices for the shopping list,
a speed trainer on the metronome (speeds up every few bars).

## Practice tools (v2.1, Oct 1, 2026)
- Music tab top: practice card (goal ring that fills plum and closes as a painted ring at the goal, "🔥 N days in a row",
  this week, 7 day bars) and Practice / Metronome / Tuner tiles. Home shows a Practice circle with the streak.
- **Tuner** (`{v:'tuner'}`): YIN pitch finder in crafts/practice.js on a 4096-sample mic buffer (halved at 44.1/48 kHz),
  ~14 readings a second, median of the last 5. Tunings: guitar, drop D, ukulele GCEA, low G uke, banjo open G (gDGBD),
  bass, mandolin, violin, B♭ trumpet (shows written notes, = heard + 2 half steps), any note. Auto string or tap to lock
  (plays the note for 2 s and ignores the mic meanwhile). "N cents high. Loosen a little", buzz when in tune. Listens
  only while the page is open and visible; stops on leaving. Tested: test tones within 0.25 cents; Playwright fake mic
  (111 Hz) read "A, 16 cents high".
- **Metronome** (`{v:'metronome'}`): Web Audio clicks scheduled 0.12 s ahead (65 s ahead when the app is hidden, since
  Chrome slows timers; rescheduled on return), 30-250 BPM, tap the beat, beats 2/3/4/6, clicks per beat 1-4, louder
  first beat, beat lights. Keeps going on other pages with a floating bar (`#prpill`) that can stop it.
- **Practice** (`{v:'practice'}`): timer with pause (kept in kv `practice.run`, so it survives closing the app), what
  she's playing and working on, Done/Don't count, daily goal (5-60 min), history by day with delete + undo, Add time
  by hand. Counted automatically: lesson time while a video plays (`flushLesson`, whole minutes, on stop or leaving the
  app) and metronome time (1+ min) unless the timer is running. A day counts for the streak with 1+ minute.
- kv `practice` = {sessions:[{id,t,mins,inst,what,src}], goal, run, met, tun, inst}; backups include sessions and goal.
  Screen stays on (Wake Lock) while the tuner or metronome runs or the timer page is open. `?go=practice|metronome|tuner`.

## Artistry cloud backup (v2.2, Oct 1, 2026)
- Same private Vercel Blob store and endpoint as YumYum, with `&app=artistry`: folders `backup/a/<first 32 hex of
  sha256("art:"+code)>/` (latest.json, days/, photos/), its own people list `backup/_artistry.json` (max 10), codes
  `ART-XXXX-XXXX-XXXX-XXXX`, and it only accepts `app:'brushglue'` backups. YumYum's `u/` folders, `yyt:` hashes and
  `_people.json` are unchanged.
- Phone (crafts/app.js, "cloud backup" block): localStorage `art-cloud-v1` {on,key,last,lastDay,lastRev,lastCount,err,sent}
  and `art-rev` (bumped by `savePin` and `kvSet`, except kv ideas/mfeed/mpicks/owner). Backs up 90 s after a change, at
  most every 30 minutes (10 when she leaves the app), 20 s after opening if something changed. Photos (`<pinId>` and
  Made-it `<pinId>:m<time>`, sent as ids with `:` -> `_`) go up once each; the backup lists them in `photoRefs`.
  `speech` is dropped if a backup passes 3.8 MB. Automatic backups stop if the phone has under half the ideas of the
  last one. Restore from cloud: code -> Latest or a day -> `restoreData` (shared with the file restore; adds, never
  deletes) -> photos -> the phone keeps backing up to the same code.
- Storage: the store Dave created Oct 1, 2026 (see YumYum's Cloud backup section). Cloud backup is **off** on each phone
  until the person taps Studio > Cloud backup > Turn on (shows the ART- code to save). Shares the Hobby limits with YumYum (1 GB, 2,000 advanced operations a month; each photo
  is one).
- Tested offline end to end (Playwright + the real api/backup.js on a pretend store, scratchpad cloud_ui.py): waiting
  state, first backup with 3 photos + a Made-it photo, second backup sends no photos again, wrong code, restore on a
  fresh phone with photos, practice log and supplies. The store exists since Oct 1, 2026 and YumYum's backup worked
  live through it; an Artistry backup hasn't run live yet.

## Changing Artistry (the routine) and how updates reach Steph's phone
1. Edit files in `crafts/` (most changes are in `crafts/app.js` and the CSS in `crafts/index.html`; server parts in
   `api/idea.js`, `api/crafts.js`, `api/music.js`).
2. Run `node tools/stamp_crafts.js` (sets `crafts/sw.js` VERSION from a hash of the app's files, and fingerprints the
   icon addresses in the manifest so a new icon reaches installed phones).
3. Test: `node tests/crafts.test.js && node tests/music.test.js && node tests/holidays.test.js && node tests/supplies.test.js && node tests/practice.test.js`
   (crafts.test fails if step 2 was skipped), plus the YumYum tests if api/recipe.js or lib/ changed. Bump
   `const VERSION = '2.x'` in crafts/app.js for visible changes (2.2 now). If api/idea.js answers change, bump `READER_V`
   in crafts/app.js (3 now): Vercel caches /api/idea answers for a day. For a screen check, serve the repo folder, open
   /crafts/ in Playwright at 390x844 and route `**/api/**` to fakes (the reader features need https, so the test copy
   replaces `location.protocol === 'https:'` in app.js with `true`).
4. Commit as djvas1975 and push to `main`; Vercel deploys in about a minute.
How phones get it (tested Oct 1, 2026, Playwright with a real service worker, again after the v2.0 redesign): the
service worker loads the app's files from the internet first (saved copy only offline or after 4 s), so every open
shows the newest version. If the app sits open in the background, coming back to it after 10+ minutes checks for a new
sw.js; the new version takes over and the page reloads itself (`appUpdated`: right away if no sheet is open, no lesson
playing, no metronome or tuner on, and nothing typed; otherwise a toast "Artistry has an update · Reload", or the reload happens when she leaves
the app). Her saved ideas live in IndexedDB on her phone and are never touched by updates. The home-screen name and
icon are Chrome's (manifest updates, up to about a day).

Share-menu formats checked offline (Oct 1, 2026, `findUrl` in crafts/app.js): TikTok vm./full links with or without
words, Instagram reel/post with `?igsh=…==`, YouTube youtu.be and shorts with `?si=`, Facebook share/r, share/v,
share/p and fb.watch, Pinterest pin.it with words and full pin links, Chrome pages. iPhones have no Share-menu
target for web apps, so there it's Copy link + the Add button.

## Learn music tab (v1.1, built Sept 30, 2026)
Asked for: "a section for playing music" for Dave's son's mom **Steph**, an amateur piano, guitar, drums, ukulele, banjo
and trumpet player who learns from YouTube tutorials. Her go-to genres: alternative, rock, classical, pop, rap, classic
rock, oldies, Motown, country, bluegrass. "A tab by itself", recommendations from her likes, and learn what she's into lately.

**YouTube's public RSS feeds are gone.** Every `youtube.com/feeds/videos.xml` URL returns 404 for everyone since about
Sept 1, 2026 (checked from Vercel Sept 30 with three URL forms and two browser names; others report it too: github.com/miniflux/v2/issues/4261).
Scraping YouTube pages breaks its terms, so it isn't done. Lesson videos inside the app need a free **YouTube Data API
v3 key** in Vercel (Settings > Environment Variables > `YOUTUBE_API_KEY`, then redeploy). The key goes in Vercel only,
never in the repo. Free quota: 10,000 units a day; a search costs 100, a channel's uploads 1, video details 1 per 50.
**Status Sept 30, 2026: no key set yet** (answers say `needsKey: true`).

- Without the key (works now): Songs to learn (147 songs, ranked by her taste, genre chips), song sheet (pick the
  instrument, Lessons on YouTube link, chords/tabs/sheet music links, Want to learn / Learning / Learned it, Not for
  me), Free teachers on YouTube (24 channels), Free places to learn, search shows matching songs + a YouTube search
  button, and Share > Artistry from the YouTube app files the lesson under Music with instrument and genre
  (`musicGuess()` in the Save sheet in crafts/app.js; the Save sheet lets her switch Painting / Crafts / Music).
  Saved lessons play inside the app.
- With the key: Picked for you (up to 4 searches from her taste, refreshed at most every 30 minutes, 6 hours if
  nothing changed), New from free teachers, in-app lesson search, Find a lesson on a song, More lessons like this.
- Lesson page: YouTube IFrame player (falls back to a plain embed if the API script is blocked), Speed 0.5x / 0.75x /
  Normal, Loop a part (Start here / End here / Off, checked every 250 ms), status, favorite, share, Open in YouTube,
  the song's chord/tab/sheet links.
- Learning (on the phone, no AI): events `{t,k,i,g,a,c,w}` in kv `music` (last 500): save 2, song added 2, status
  want 1 / learning 2.5 / learned 3, favorite 3, search 1, look at a song 0.5, every 30 s watched 0.5 (max 8),
  instrument or genre chip 0.3, teacher link 0.5, Not for me -2 (song) / -3 (lesson). Weights halve every 14 days;
  "Lately you're into …" uses the last 21 days. Her chosen instruments and genres start at weight 1. Settings sheet
  (sliders button): instruments, genres, level (Beginner favors easy songs), Start learning over.
- Music pins are `type:'music'`, `kind:'video'|'song'`, `insts`, `genres`, `artist`, `song`, `videoId`, `mstatus`.
  They stay out of Home, Ideas, the art boards and the art taste. Backup/restore includes `music`.
- Files: `crafts/music.js` (INSTRUMENTS, GENRES, 446 artist names -> genres, SONGS, TEACHERS with checked channel ids,
  `detect(text)`, `songLinks()`), `api/music.js` (`?inst=` teacher uploads, `op=search`, `op=resolve` for setup:
  channel ids from @handles), `tests/music.test.js`, music shortcut icon from `tools/make_crafts_icons.py`.
- Checked offline with Playwright (fake API, both modes, light and dark, 390 px). Not checked yet: the live API with
  a real key, and Steph's phone.

Ideas not built yet for music: YouTube Shorts filter, a metronome speed trainer, chord diagrams.
