// Brush & Glue idea finder: painting and craft projects from free how-to blogs.
// GET /api/crafts?q=rock+painting&type=painting   ->  matching projects
// GET /api/crafts?type=craft                        ->  the newest projects
// Options: type=painting|craft|both (which blogs to ask), sites=a,b (only these), n=6 (per site), page=2 (the next ones),
//          debug=1 (how each site answered), sites=trial (try the sites marked trial).
//
// Each item: { title, url, image, width, height, source, sourceName, kind }
// The phone ranks these by what Dave likes and sorts each into Painting or Crafts; this only gathers them.

const { cors, fetchText, decode, clean } = require('../lib/parse');

const enc = encodeURIComponent;
const SITE_TIMEOUT = 8000;

// Checked from Vercel Sept 30, 2026. Turned servers away (403) or had no WordPress search: A Beautiful Mess,
// Angela Anderson Art, Artists Network, Art Projects for Kids, Crafting in the Rain, Emily Seilhamer Art,
// Happiness is Homemade, Hey Let's Make Stuff, I Heart Crafty Things, Jewelry Making Journal, One Little Project,
// Resin Obsession, The Art Sherpa, The Blue Bottle Tree, The Kitchen Table Classroom, The Postman's Knock, Tracie Kiernan,
// Art is Fun, Empty Easel, Messy Little Monster, Painting Tutorials, Painting with Jane, The Frugal Crafter, Will Kemp Art School.
// kind: which board a site mostly feeds. topics: only asked when the search mentions these.
const ROCK = /rock|stone|pebble|mandala|dot/;
const POUR = /pour|fluid|resin|cells|swipe|dutch/;
const KIDS = /kid|toddler|preschool|classroom|child/;
const CRICUT = /cricut|vinyl|htv|svg|sublimation|decal|shirt|mug|tumbler/;
const YARN = /crochet|knit|yarn|macrame|amigurumi|pom|weav/;
const SEW = /sew|fabric|quilt|embroider|stitch|tote|pillow/;
const WOOD = /wood|pallet|sign|shelf|furniture|dresser|table|crate|porch/;

const SOURCES = [
  // painting
  { id: 'artsyprettyplants', name: 'Artsy Pretty Plants', home: 'https://artsyprettyplants.com', kind: 'painting' },
  { id: 'deepspacesparkle', name: 'Deep Space Sparkle', home: 'https://www.deepspacesparkle.com', kind: 'painting', topics: KIDS },
  { id: 'rockpainting101', name: 'Rock Painting 101', home: 'https://rockpainting101.com', kind: 'painting', topics: ROCK },
  { id: 'acrylicpouring', name: 'Acrylic Pouring', home: 'https://www.acrylicpouring.com', kind: 'painting', topics: POUR },
  { id: 'salvagesisterandmister', name: 'Salvage Sister and Mister', home: 'https://salvagesisterandmister.com', kind: 'painting', topics: WOOD },
  { id: 'artbarblog', name: 'Art Bar', home: 'https://artbarblog.com', kind: 'painting' },
  // painting blogs, second round (answered Sept 30, 2026)
  { id: 'drawpaintacademy', name: 'Draw Paint Academy', home: 'https://drawpaintacademy.com', kind: 'painting' },
  { id: 'watercoloraffair', name: 'Watercolor Affair', home: 'https://www.watercoloraffair.com', kind: 'painting' },
  { id: 'makoccino', name: 'Makoccino', home: 'https://www.makoccino.com', kind: 'painting' },
  { id: 'doodlewash', name: 'Doodlewash', home: 'https://doodlewash.com', kind: 'painting' },
  { id: 'petticoatjunktion', name: 'Petticoat Junktion', home: 'https://www.petticoatjunktion.com', kind: 'painting' },
  { id: 'girlinthegarage', name: 'Girl in the Garage', home: 'https://girlinthegarage.net', kind: 'painting' },
  { id: 'designsbystudioc', name: 'Designs by Studio C', home: 'https://www.designsbystudioc.com', kind: 'both' },
  { id: 'artfulparent', name: 'The Artful Parent', home: 'https://artfulparent.com', kind: 'both' },
  { id: 'acrylicpaintingschool', name: 'Acrylic Painting School', home: 'https://acrylicpaintingschool.com', kind: 'painting' },
  // crafts
  { id: 'craftsbyamanda', name: 'Crafts by Amanda', home: 'https://craftsbyamanda.com', kind: 'both' },
  { id: 'modpodgerocks', name: 'Mod Podge Rocks', home: 'https://modpodgerocksblog.com', kind: 'craft' },
  { id: 'diycandy', name: 'DIY Candy', home: 'https://diycandy.com', kind: 'craft' },
  { id: 'cutesycrafts', name: 'Cutesy Crafts', home: 'https://cutesycrafts.com', kind: 'craft' },
  { id: 'craftsonsea', name: 'Crafts on Sea', home: 'https://craftsonsea.co.uk', kind: 'craft', topics: KIDS },
  { id: 'sustainmycrafthabit', name: 'Sustain My Craft Habit', home: 'https://sustainmycrafthabit.com', kind: 'craft' },
  { id: 'apieceofrainbow', name: 'A Piece of Rainbow', home: 'https://www.apieceofrainbow.com', kind: 'craft' },
  { id: 'housefulofhandmade', name: 'Houseful of Handmade', home: 'https://housefulofhandmade.com', kind: 'craft' },
  { id: 'welcometonanas', name: 'Welcome To Nana’s', home: 'https://welcometonanas.com', kind: 'craft' },
  { id: 'jennifermaker', name: 'Jennifer Maker', home: 'https://jennifermaker.com', kind: 'craft', topics: CRICUT },
  { id: 'thecraftyblogstalker', name: 'The Crafty Blog Stalker', home: 'https://thecraftyblogstalker.com', kind: 'craft' },
  { id: 'makeandtakes', name: 'Make and Takes', home: 'https://www.makeandtakes.com', kind: 'craft' },
  { id: 'thebestideasforkids', name: 'The Best Ideas for Kids', home: 'https://www.thebestideasforkids.com', kind: 'craft', topics: KIDS },
  { id: 'thecountrychiccottage', name: 'The Country Chic Cottage', home: 'https://www.thecountrychiccottage.net', kind: 'craft' },
  { id: 'sewcanshe', name: 'Sew Can She', home: 'https://www.sewcanshe.com', kind: 'craft', topics: SEW },
  { id: 'repeatcrafterme', name: 'Repeat Crafter Me', home: 'https://www.repeatcrafterme.com', kind: 'craft', topics: YARN },
  { id: 'mooglyblog', name: 'Moogly', home: 'https://www.mooglyblog.com', kind: 'craft', topics: YARN },
  { id: 'thehandymansdaughter', name: 'The Handyman’s Daughter', home: 'https://www.thehandymansdaughter.com', kind: 'craft', topics: WOOD },
  { id: 'anikasdiylife', name: 'Anika’s DIY Life', home: 'https://www.anikasdiylife.com', kind: 'craft', topics: WOOD },
  { id: 'shanty2chic', name: 'Shanty 2 Chic', home: 'https://www.shanty-2-chic.com', kind: 'craft', topics: WOOD },
  { id: 'thecraftingchicks', name: 'The Crafting Chicks', home: 'https://thecraftingchicks.com', kind: 'craft' },
  { id: 'confessionsofaserialdiyer', name: 'Confessions of a Serial DIYer', home: 'https://www.confessionsofaserialdiyer.com', kind: 'craft' },
  { id: 'thecraftpatchblog', name: 'The Craft Patch', home: 'https://thecraftpatchblog.com', kind: 'craft' },
  { id: 'hellowonderful', name: 'Hello Wonderful', home: 'https://www.hellowonderful.co', kind: 'craft', topics: KIDS },
  { id: 'easypeasyandfun', name: 'Easy Peasy and Fun', home: 'https://www.easypeasyandfun.com', kind: 'both', topics: KIDS },
  { id: '100directions', name: '100 Directions', home: 'https://www.100directions.com', kind: 'craft', topics: CRICUT },
  { id: 'craftingcheerfully', name: 'Crafting Cheerfully', home: 'https://craftingcheerfully.com', kind: 'craft' }
];

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const q = clean(String(qp.q || '')).slice(0, 80);
  const type = ['painting', 'craft'].includes(qp.type) ? qp.type : 'both';
  const n = Math.max(1, Math.min(12, parseInt(qp.n, 10) || 6));
  const page = Math.max(1, Math.min(5, parseInt(qp.page, 10) || 1));
  const want = String(qp.sites || '').split(',').map(s => s.trim()).filter(Boolean);
  const debug = !!qp.debug;
  const lq = q.toLowerCase();
  let sources;
  if (want.length) sources = SOURCES.filter(s => want.includes(s.id) || (s.trial && want.includes('trial')));
  // painting blogs are few, so painting searches also ask the craft blogs (many post painted projects); craft searches skip painting-only blogs
  else sources = SOURCES.filter(s => !s.trial && !(type === 'craft' && s.kind === 'painting') && (!s.topics || (lq && s.topics.test(lq))));

  const report = [];
  const lists = await Promise.all(sources.map(async s => {
    const t0 = Date.now();
    const trace = debug ? [] : null;
    try {
      const items = await withTimeout(fromWordPress(s, q, n, trace, page), SITE_TIMEOUT);
      if (debug) report.push({ id: s.id, ms: Date.now() - t0, count: items.length, sample: items.slice(0, 2).map(x => x.title + ' | ' + (x.image ? 'photo ' + x.width + 'x' + x.height : 'no photo')), trace });
      return items;
    } catch (e) {
      if (debug) report.push({ id: s.id, ms: Date.now() - t0, count: 0, error: e.message, trace });
      return [];
    }
  }));
  // take turns between sites so no one site crowds the rest out
  const items = [], seen = new Set();
  for (let i = 0; i < n; i++) for (const l of lists) {
    const it = l[i];
    if (!it || seen.has(it.url)) continue;
    seen.add(it.url);
    items.push(it);
  }
  res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=21600, stale-while-revalidate=86400');
  const out = { ok: true, q, type, page, items };
  if (debug) out.report = report.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  res.status(200).json(out);
};

async function fromWordPress(s, q, n, trace, page) {
  const url = s.home + '/wp-json/wp/v2/posts?per_page=' + Math.min(20, n + 6) + (page > 1 ? '&page=' + page : '')
    + (q ? '&search=' + enc(q) + '&orderby=relevance' : '')
    + '&_embed=wp:featuredmedia&_fields=link,title,date,jetpack_featured_media_url,yoast_head_json.og_image,_links,_embedded';
  const { text } = await fetchText(url, { trace, headers: { Accept: 'application/json' } });
  let arr;
  try { arr = JSON.parse(text); } catch (e) { throw new Error('Not a post list.'); }
  if (!Array.isArray(arr)) throw new Error('Not a post list.');
  return arr.map(p => {
    const og = p.yoast_head_json && Array.isArray(p.yoast_head_json.og_image) && p.yoast_head_json.og_image[0];
    const fm = p._embedded && Array.isArray(p._embedded['wp:featuredmedia']) && p._embedded['wp:featuredmedia'][0];
    const md = (fm && fm.media_details) || {};
    const sizes = md.sizes || {};
    const pick = sizes.medium_large || sizes.large || sizes['1536x1536'] || sizes.full || null;
    let image = '', w = 0, h = 0;
    if (pick && pick.source_url) { image = pick.source_url; w = pick.width || 0; h = pick.height || 0; }
    else if (og && og.url) { image = og.url; w = og.width || 0; h = og.height || 0; }
    else if (p.jetpack_featured_media_url) { image = p.jetpack_featured_media_url; w = md.width || 0; h = md.height || 0; }
    else if (fm && fm.source_url) { image = fm.source_url; w = md.width || 0; h = md.height || 0; }
    return {
      title: clean(decode(String((p.title && p.title.rendered) || '').replace(/<[^>]+>/g, ' '))),
      url: p.link, image, width: w, height: h,
      source: s.id, sourceName: s.name, kind: s.kind
    };
  }).filter(x => x.title && x.url && x.image && !SKIP.test(x.title) && !(FOOD.test(x.title) && !NOT_FOOD.test(x.title))).slice(0, n);
}
// gift guides, giveaways, shop news: not a project
const SKIP = /\b(gift guide|giveaway|sale|deals?|shop update|coupon|affiliate|podcast|episode|newsletter|announcement|link party|features?|worksheets?|coloring pages?|life cycle|review|guest artist|interview|top pours)\b|\?$/i;
// recipes and food posts that some craft blogs also run
const FOOD = /\b(recipes?|cake|cakes|cheesecakes?|cookies?|cupcakes?|muffins?|brownies?|bars|dip|soup|chili|casserole|smoothie|cocktail|mocktail|latte|punch|salad|bread|pie|fudge|edible|snack|treats? recipe|dinner|breakfast|appetizer)\b/i;
const NOT_FOOD = /\b(craft|diy|paint|painted|painting|crochet|knit|sew|svg|cricut|wood|clay|felt|paper|printable|ornament|decor|wreath|box|boxes|toppers?|holders?|coasters?)\b/i;

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}

module.exports.SOURCES = SOURCES;
module.exports.fromWordPress = fromWordPress;
