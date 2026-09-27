# yumyumtumtum: project summary and handoff

Dave's personal Yummly-style recipe app. It saves recipes and cooking videos from TikTok,
Instagram, YouTube, Facebook, Pinterest, and any recipe website, organizes them, and opens
the original when it's time to cook. Built with Claude, step by step, starting Sept 26, 2026.
Current version: **0.6**.

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

## What the app does (v0.6)
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
- **Me:** name, stats, **What Discover has learned** (with Start over), backup and restore,
  remove examples, storage info.
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
| `lib/parse.js` | Shared helpers: safe fetching, HTML and JSON-LD reading, **caption parser**, archive fallback. |
| `tools/sync_caption.py` | Copies the caption parser from lib/parse.js into app.html (the app reuses it for Paste recipe text). |
| `tests/reader.test.js`, `tests/captions.test.js` | Offline tests with fake pages and real captions. |
| `vercel.json` | Function time limits (reader 60 s, Discover 30 s). |
| `icons/` | App icons. `tools/make_mascot.py` draws the current one. |

Browsers can only call the reader from the app's own site (CORS allows https://djvas1975.github.io),
so other websites can't use it as a free proxy. Direct requests with no browser origin (like
Claude's WebFetch checks) still work. It refuses private or internal addresses.

## Making a change (the routine)
1. Edit `tools/app.html` for the app, or `api/` and `lib/` for the reader or Discover.
2. If the caption section of `lib/parse.js` changed, run `python3 tools/sync_caption.py`.
3. Build: `python3 tools/build.py https://djvas1975.github.io/yumyumtumtum/`
4. Test: `node tests/reader.test.js && node tests/captions.test.js`
5. App changes: bump the version text in `V.me` (`version 0.6`).
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
- **Facebook:** best effort, because Facebook often hides posts from outside apps.
- **Caption parser:** handles headings like "Ingredients", "Soup base:", "Dumplings:", "For the
  sauce", captions squashed onto one line (two spaces count as a line break), emoji bullets,
  arrow steps, "Step 1", directions written as sentences, trailing hashtags, calorie lines, and
  "Follow for more" chatter.

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

## App icon status
- **In use:** the painted-cartoon chubby chef mascot (headband, big mustache, chopsticks,
  spilled ramen bowl on an orange tile). Dave approved it earlier. It's drawn by
  `tools/make_mascot.py`.
- **Dave wants a chubby version of himself with the soup bowl. Two attempts were rejected:**
  1. A hand-drawn cartoon Dave (`tools/make_dave_icons.py`, four poses). Verdict: didn't look like him.
  2. Five versions built from his selfie (painted, comic-book, fogged glasses, two pig
     versions). Verdict: "garbage". Nothing from this round is in the project, and Dave's
     photo is not in the public repo.
- **Suggested next try:** Dave makes or picks artwork he actually likes (an AI image app or an
  artist), then attaches it and asks Claude to install it. Claude then:
  1. Makes the rounded icons `icons/icon-512.png` and `icon-192.png`.
  2. Makes `icon-maskable-512.png` and `icon-maskable-192.png`, with the art shrunk to about
     80% so Android's round crop doesn't clip it.
  3. Makes `logo-128.png` and swaps the embedded `LOGO` image in app.html.
  4. Rebuilds and pushes.

  On the phone, remove and re-add the home-screen icon to see the new one.

## How Dave likes to work
- Android phone with Chrome. Not a programmer. Plain English, short answers, bottom line first.
- Troubleshooting: one step at a time, using his screenshots.
- Give a recommendation, say what's confirmed and what isn't, and don't overpromise.
- For looks, show a picture and let him choose. He'll say plainly when something misses.

## Ideas not built yet
- Meal planner and shopping list (Yummly had both).
- "More like this" row on a recipe page.
- Scale servings and convert units.
- YouTube cooking videos in Discover.
- A new app icon, once Dave has art he likes.
