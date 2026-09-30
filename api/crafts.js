// Brush & Glue idea finder: painting and craft projects from free how-to blogs.
// GET /api/crafts?q=rock+painting&type=painting   ->  matching projects
// GET /api/crafts?type=craft                        ->  the newest projects
// Options: type=painting|craft|both (which blogs to ask), sites=a,b (only these), n=6 (per site),
//          debug=1 (how each site answered), sites=trial (try the sites marked trial).
//
// Each item: { title, url, image, width, height, source, sourceName, kind }
// The phone ranks these by what Dave likes and sorts each into Painting or Crafts; this only gathers them.

const { cors, fetchText, decode, clean } = require('../lib/parse');

const enc = encodeURIComponent;
const SITE_TIMEOUT = 8000;

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
  { id: 'traciekiernan', name: 'Tracie Kiernan', home: 'https://traciekiernan.com', kind: 'painting', trial: true },
  { id: 'theartsherpa', name: 'The Art Sherpa', home: 'https://theartsherpa.com', kind: 'painting', trial: true },
  { id: 'angelaandersonart', name: 'Angela Anderson Art', home: 'https://angelaandersonart.com', kind: 'painting', trial: true },
  { id: 'emilyseilhamerart', name: 'Emily Seilhamer Art', home: 'https://emilyseilhamerart.com', kind: 'painting', trial: true },
  { id: 'artsyprettyplants', name: 'Artsy Pretty Plants', home: 'https://artsyprettyplants.com', kind: 'painting', trial: true },
  { id: 'artprojectsforkids', name: 'Art Projects for Kids', home: 'https://artprojectsforkids.org', kind: 'painting', trial: true },
  { id: 'deepspacesparkle', name: 'Deep Space Sparkle', home: 'https://www.deepspacesparkle.com', kind: 'painting', topics: KIDS, trial: true },
  { id: 'artistsnetwork', name: 'Artists Network', home: 'https://www.artistsnetwork.com', kind: 'painting', trial: true },
  { id: 'thepostmansknock', name: 'The Postman’s Knock', home: 'https://www.thepostmansknock.com', kind: 'painting', trial: true },
  { id: 'rockpainting101', name: 'Rock Painting 101', home: 'https://rockpainting101.com', kind: 'painting', topics: ROCK, trial: true },
  { id: 'acrylicpouring', name: 'Acrylic Pouring', home: 'https://www.acrylicpouring.com', kind: 'painting', topics: POUR, trial: true },
  { id: 'salvagesisterandmister', name: 'Salvage Sister and Mister', home: 'https://salvagesisterandmister.com', kind: 'painting', topics: WOOD, trial: true },
  { id: 'artbarblog', name: 'Art Bar', home: 'https://artbarblog.com', kind: 'painting', trial: true },
  { id: 'thekitchentableclassroom', name: 'The Kitchen Table Classroom', home: 'https://www.thekitchentableclassroom.com', kind: 'painting', topics: KIDS, trial: true },
  // crafts
  { id: 'craftsbyamanda', name: 'Crafts by Amanda', home: 'https://craftsbyamanda.com', kind: 'both', trial: true },
  { id: 'modpodgerocks', name: 'Mod Podge Rocks', home: 'https://modpodgerocksblog.com', kind: 'craft', trial: true },
  { id: 'diycandy', name: 'DIY Candy', home: 'https://diycandy.com', kind: 'craft', trial: true },
  { id: 'onelittleproject', name: 'One Little Project', home: 'https://onelittleproject.com', kind: 'craft', trial: true },
  { id: 'heyletsmakestuff', name: 'Hey, Let’s Make Stuff', home: 'https://heyletsmakestuff.com', kind: 'craft', trial: true },
  { id: 'cutesycrafts', name: 'Cutesy Crafts', home: 'https://cutesycrafts.com', kind: 'craft', trial: true },
  { id: 'craftsonsea', name: 'Crafts on Sea', home: 'https://craftsonsea.co.uk', kind: 'craft', topics: KIDS, trial: true },
  { id: 'happinessishomemade', name: 'Happiness is Homemade', home: 'https://www.happinessishomemade.net', kind: 'craft', trial: true },
  { id: 'sustainmycrafthabit', name: 'Sustain My Craft Habit', home: 'https://sustainmycrafthabit.com', kind: 'craft', trial: true },
  { id: 'apieceofrainbow', name: 'A Piece of Rainbow', home: 'https://www.apieceofrainbow.com', kind: 'craft', trial: true },
  { id: 'housefulofhandmade', name: 'Houseful of Handmade', home: 'https://housefulofhandmade.com', kind: 'craft', trial: true },
  { id: 'craftingintherain', name: 'Crafting in the Rain', home: 'https://craftingintherain.com', kind: 'craft', trial: true },
  { id: 'welcometonanas', name: 'Welcome To Nana’s', home: 'https://welcometonanas.com', kind: 'craft', trial: true },
  { id: 'jennifermaker', name: 'Jennifer Maker', home: 'https://jennifermaker.com', kind: 'craft', topics: CRICUT, trial: true },
  { id: 'resinobsession', name: 'Resin Obsession', home: 'https://resinobsession.com', kind: 'craft', topics: POUR, trial: true },
  { id: 'thecraftyblogstalker', name: 'The Crafty Blog Stalker', home: 'https://thecraftyblogstalker.com', kind: 'craft', trial: true },
  { id: 'makeandtakes', name: 'Make and Takes', home: 'https://www.makeandtakes.com', kind: 'craft', trial: true },
  { id: 'thebestideasforkids', name: 'The Best Ideas for Kids', home: 'https://www.thebestideasforkids.com', kind: 'craft', topics: KIDS, trial: true },
  { id: 'iheartcraftythings', name: 'I Heart Crafty Things', home: 'https://iheartcraftythings.com', kind: 'craft', trial: true },
  { id: 'abeautifulmess', name: 'A Beautiful Mess', home: 'https://abeautifulmess.com', kind: 'craft', trial: true },
  { id: 'thecountrychiccottage', name: 'The Country Chic Cottage', home: 'https://www.thecountrychiccottage.net', kind: 'craft', trial: true },
  { id: 'sewcanshe', name: 'Sew Can She', home: 'https://www.sewcanshe.com', kind: 'craft', topics: SEW, trial: true },
  { id: 'repeatcrafterme', name: 'Repeat Crafter Me', home: 'https://www.repeatcrafterme.com', kind: 'craft', topics: YARN, trial: true },
  { id: 'mooglyblog', name: 'Moogly', home: 'https://www.mooglyblog.com', kind: 'craft', topics: YARN, trial: true },
  { id: 'thehandymansdaughter', name: 'The Handyman’s Daughter', home: 'https://www.thehandymansdaughter.com', kind: 'craft', topics: WOOD, trial: true },
  { id: 'anikasdiylife', name: 'Anika’s DIY Life', home: 'https://www.anikasdiylife.com', kind: 'craft', topics: WOOD, trial: true },
  { id: 'shanty2chic', name: 'Shanty 2 Chic', home: 'https://www.shanty-2-chic.com', kind: 'craft', topics: WOOD, trial: true },
  { id: 'thecraftingchicks', name: 'The Crafting Chicks', home: 'https://thecraftingchicks.com', kind: 'craft', trial: true },
  { id: 'thebluebottletree', name: 'The Blue Bottle Tree', home: 'https://www.thebluebottletree.com', kind: 'craft', trial: true },
  { id: 'jewelrymakingjournal', name: 'Jewelry Making Journal', home: 'https://jewelrymakingjournal.com', kind: 'craft', trial: true },
  { id: 'confessionsofaserialdiyer', name: 'Confessions of a Serial DIYer', home: 'https://www.confessionsofaserialdiyer.com', kind: 'craft', trial: true },
  { id: 'thecraftpatchblog', name: 'The Craft Patch', home: 'https://thecraftpatchblog.com', kind: 'craft', trial: true },
  { id: 'hellowonderful', name: 'Hello Wonderful', home: 'https://www.hellowonderful.co', kind: 'craft', topics: KIDS, trial: true },
  { id: 'easypeasyandfun', name: 'Easy Peasy and Fun', home: 'https://www.easypeasyandfun.com', kind: 'both', topics: KIDS, trial: true },
  { id: '100directions', name: '100 Directions', home: 'https://www.100directions.com', kind: 'craft', topics: CRICUT, trial: true },
  { id: 'craftingcheerfully', name: 'Crafting Cheerfully', home: 'https://craftingcheerfully.com', kind: 'craft', trial: true }
];

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const q = clean(String(qp.q || '')).slice(0, 80);
  const type = ['painting', 'craft'].includes(qp.type) ? qp.type : 'both';
  const n = Math.max(1, Math.min(12, parseInt(qp.n, 10) || 6));
  const want = String(qp.sites || '').split(',').map(s => s.trim()).filter(Boolean);
  const debug = !!qp.debug;
  const lq = q.toLowerCase();
  let sources;
  if (want.length) sources = SOURCES.filter(s => want.includes(s.id) || (s.trial && want.includes('trial')));
  else sources = SOURCES.filter(s => !s.trial && (type === 'both' || s.kind === type || s.kind === 'both') && (!s.topics || (lq && s.topics.test(lq))));

  const report = [];
  const lists = await Promise.all(sources.map(async s => {
    const t0 = Date.now();
    const trace = debug ? [] : null;
    try {
      const items = await withTimeout(fromWordPress(s, q, n, trace), SITE_TIMEOUT);
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
  const out = { ok: true, q, type, items };
  if (debug) out.report = report.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  res.status(200).json(out);
};

async function fromWordPress(s, q, n, trace) {
  const url = s.home + '/wp-json/wp/v2/posts?per_page=' + Math.min(20, n + 6)
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
  }).filter(x => x.title && x.url && x.image && !SKIP.test(x.title)).slice(0, n);
}
// gift guides, giveaways, shop news: not a project
const SKIP = /\b(gift guide|giveaway|sale|deals?|shop update|coupon|affiliate|podcast|episode|newsletter|announcement|link party|features?)\b|\?$/i;

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}

module.exports.SOURCES = SOURCES;
module.exports.fromWordPress = fromWordPress;
