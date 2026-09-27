# yumyumtumtum: project summary and handoff

Dave's personal Yummly-style recipe app. It saves recipes and cooking videos from TikTok,
Instagram, YouTube, Facebook, Pinterest, and any recipe website, organizes them, and opens
the original when it's time to cook. Built with Claude, step by step, starting Sept 26, 2026.
Current version: **0.9**.

This file is the handoff for a fresh chat. A Claude session that has this GitHub repo reads
it automatically. In any other chat, attach this file and say what you want changed.

---

## Start a fresh chat
1. Best: start a Claude Code session (claude.ai/code) with the repo **djvas1975/yumyumtumtum**
   connected, so Claude can edit, test, and publish changes itself. The Claude GitHub app is
   already installed on Dave's GitHub account with access to all repos.
2. Tell Claude what to change. Claude edits, tests, and pushes to `main`. The app and the
   recipe reader update on their own within about a minute.
3. On the phone, fully close yumyumtumtum and reopen it to get the update.

## Where everything lives
| What | Where |
|---|---|
| The app (installed on Dave's Android phone from Chrome) | https://djvas1975.github.io/yumyumtumtum/ |
| Code (public repo, branch `main`) | https://github.com/djvas1975/yumyumtumtum |
| Recipe reader + Discover service (Vercel, free Hobby plan, auto-deploys from GitHub) | https://yumyumtumtum.vercel.app |
| claude.ai copy of the app (private, reader and Discover don't work there) | https://claude.ai/artifact/Jm3hSva7uWbKcXmYypsxje |

Dave's recipes live **on his phone** (the browser's IndexedDB), not on any server. A new chat
can't see them. Before big changes, Dave should use **Me > Download backup**.

---

## What the app does (v0.9)
- **Home:** greeting, search pill, quick filter chips, **Just for you** (Discover picks),
  Recently saved, **Browse by cuisine** (scrollable tiles: Mexican, Asian, Italian, Chinese,
  Japanese, Thai, Korean, Vietnamese, Indian, Greek, Mediterranean, Middle Eastern, American,
  Southern, Cajun, BBQ, Caribbean, French, Spanish), collections, saved videos, quick fixes,
  still want to try, cook it again.
- **Save a recipe:** the + button, or **Share > yumyumtumtum** from TikTok, Instagram, YouTube,
  Chrome, etc. (Android share target). The link is read automatically: photo, ingredients (with
  groups like "For the sauce"), directions, notes and substitutions, cookware, nutrition,
  times, servings, cuisine, meal type. **Paste recipe text** sorts pasted text into the boxes.
- **Recipe page:** hero photo, stats, "Get the full recipe" card, rating, I made this,
  collections, jump chips, checkable ingredients and steps, notes, cookware, nutrition, full
  caption (for videos), "Full recipe on [site]" link, and a button that jumps to the recipe
  card on the original site. The More (⋯) menu has **Fill in missing details from the link**.
- **Yums:** smart collections (All Yums, Favorites, Want to try, Made it) and custom collections.
- **Search:** Dave's own recipes with filters (type, time, status, cuisine, meal, source) and
  sorting, plus a **Find new recipes on Delish, Tasty, and more** button.
- **Discover** (Home > Just for you > See all): free recipes from 33 sites, search, Newest, and
  cuisine chips. Tap a card for a full preview, one tap saves it, ✕ = "Not for me".
- **What can I cook?** (green card on Home, or long-press the app icon): Dave adds what's in
  his kitchen (type it, or tap foods). It shows his saved recipes and new ones from the recipe
  sites that he can make, each marked "Ready to cook" or "Need honey, gochujang", with a
  "Ready to cook only" filter. Basics (salt, pepper, oil, water, butter, sugar, flour) count as
  on hand and can be changed. Recipe pages and Discover previews say "You have 7 of 9. Need …".
- **Me:** name, stats, **What it's learned you like** (taste chips, **Foods you don't eat**
  list, Start over), backup and restore, remove examples, storage info.
- Works offline once installed (service worker). Long-press the icon for a quick Save shortcut.

## How it's built
| File | Purpose |
|---|---|
| `tools/app.html` | **The whole app, the one file to edit** (vanilla JS, CSS, views, storage, Discover, taste profile). |
| `tools/build.py` | Wraps app.html into `index.html` and writes `manifest.webmanifest`, `sw.js` (new cache version each build), `README.md`, `.nojekyll`. |
| `index.html`, `manifest.webmanifest`, `sw.js` | Built output. Don't edit by hand. |
| `api/recipe.js` | Recipe reader: `GET /api/recipe?url=...` (add `&debug=1` for a trace). |
| `api/discover.js` | Discover: `GET /api/discover?q=...` (no q = newest). Options: `sites=delish,tasty`, `n=8`, `debug=1`, `all=1`. |
| `api/image.js` | Photo proxy: `GET /api/image?url=...` (falls back to the Internet Archive). |
| `api/cook.js` | What can I cook: `GET /api/cook?q=chicken broccoli|eggs rice` (up to 4 searches split on `|`, `n=24`, `debug=1`). Searches the Discover sites, reads each recipe's ingredient list, returns `{title,url,image,source,sourceName,ingredients,totalTime,servings}`. |
| `lib/pantry.js` | Ingredient reader and kitchen matcher (about 200 foods, longest match wins, families like "beans" or "broth"). |
| `lib/parse.js` | Shared helpers: safe fetching, HTML and JSON-LD reading, **caption parser**, archive fallback. |
| `tools/sync_caption.py` | Copies the caption parser (lib/parse.js) and the kitchen matcher (lib/pantry.js) into app.html. |
| `tests/reader.test.js`, `tests/captions.test.js`, `tests/cook.test.js` | Offline tests with fake pages, real captions, and ingredient matching. |
| `vercel.json` | Function time limits (reader 60 s, Discover 30 s, cook 45 s). |
| `icons/` | App icons. `tools/make_photo_icons.py` makes the current ones from `tools/icon-art.jpg`. |

Browsers can only call the reader from the app's own site (CORS allows https://djvas1975.github.io),
so other websites can't use it as a free proxy. Direct requests with no browser origin (like
Claude's WebFetch checks) still work. It refuses private or internal addresses.

## Making a change (the routine)
1. Edit `tools/app.html` for the app, or `api/` and `lib/` for the reader or Discover.
2. If the caption section of `lib/parse.js` or anything in `lib/pantry.js` changed, run `python3 tools/sync_caption.py`.
3. Build: `python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/`
4. Test: `node tests/reader.test.js && node tests/captions.test.js && node tests/cook.test.js`
5. App changes: bump the version text in `V.me` (`version 0.9`).
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
- **Sites that answer (33):** Delish, The Pioneer Woman, and Tasty (their own search pages).
  RecipeTin Eats, Spend With Pennies, Cafe Delites, Damn Delicious, Pinch of Yum, Once Upon a
  Chef, and Jo Cooks (WordPress search). Cuisine specialists are asked only when a search
  matches their food:
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

## What can I cook: how it works (added Sept 27, 2026)
- The kitchen list is `Store.settings.pantry = {items:[{id,name,t}], basics:[ids]}` on the phone.
  Typed foods map to a known food (`lookupFood`: "hamburger" is ground beef, "cheddar" is
  cheese); unknown ones are kept as their own words and still match ("spam").
- Saved recipes are checked on the phone with `matchRecipe(ingredients, pantry, title)`: optional
  lines (garnish, "to serve", a Toppings section) and basics don't count; "or" lines need one;
  a recipe that just says "broth" or "cheese" takes any kind; if the list names no meat, the
  title's meat counts ("Korean Popcorn Chicken"). Shown if it uses something you have and is
  missing 4 or fewer (or has half). Saved recipes with no ingredient list are counted and noted.
- New recipes: the phone builds up to 4 searches (`cookQueries`: favorite meats with a veggie or
  starch, the top meat with a dish Dave likes, then pairs of sides), calls `/api/cook`, and
  shows ones missing 3 or fewer (or 60% there). Ranking: ready first, fewest missing, then taste.
  Results are cached on the phone for 6 hours (`yyt-cook-v1`) and on Vercel for 6 hours.
- Live check Sept 27, 2026: `q=chicken broccoli` read 10 sites and 24 recipe pages with no
  errors in about 1 to 2 seconds.

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
- Meal planner and shopping list (Yummly had both). A "Need …" list from What can I cook is
  a natural first shopping list.
- "More like this" row on a recipe page.
- Scale servings and convert units.
- YouTube cooking videos in Discover.
