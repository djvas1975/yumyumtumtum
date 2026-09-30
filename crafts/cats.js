/* Brush & Glue sorter: decides Painting or Crafts, the category, and tags from a post's words.
   Used by the app (crafts/index.html loads this file) and by the tests (node tests/crafts.test.js).
   Free and on the phone: no AI service. */
(function (root) {
  'use strict';

  // weak: counts 1 point instead of 2 (words that show up in lots of posts, like "halloween")
  const PAINT = [
    { id: 'acrylic', label: 'Acrylic', kw: ['acrylic', 'acrylics', 'canvas painting', 'canvas art', 'paint night', 'sip and paint', 'paint and sip', 'one stroke', 'palette knife'] },
    { id: 'watercolor', label: 'Watercolor', kw: ['watercolor', 'watercolors', 'watercolour', 'aquarelle', 'loose florals', 'wet on wet watercolor'] },
    { id: 'pour', label: 'Paint pouring', kw: ['paint pour', 'pour painting', 'pouring', 'pour', 'fluid art', 'dutch pour', 'flip cup', 'swipe technique', 'acrylic pour', 'puddle pour', 'tree ring pour', 'balloon kiss', 'string pull', 'cells'] },
    { id: 'rock', label: 'Rock painting', kw: ['rock painting', 'painted rock', 'painted rocks', 'kindness rock', 'rock', 'rocks', 'pebble', 'stone painting', 'painted stone'] },
    { id: 'dot', label: 'Dot art & mandalas', kw: ['dot art', 'dot painting', 'dot mandala', 'mandala', 'mandalas', 'dotting', 'dotting tools'] },
    { id: 'objects', label: 'Painted pumpkins, glass & more', kw: ['painted pumpkin', 'painted pumpkins', 'pumpkin painting', 'paint pumpkins', 'painting pumpkins', 'glass painting', 'painted glass', 'wine glass painting', 'painted mug', 'mug painting', 'ceramic painting', 'painted jar', 'painted jars', 'shoe painting', 'painted shoes', 'fabric painting', 'painted denim', 'jacket painting', 'painted tote'] },
    { id: 'oil', label: 'Oil', kw: ['oil paint', 'oil painting', 'oils', 'bob ross', 'wet on wet', 'alla prima'] },
    { id: 'gouache', label: 'Gouache', kw: ['gouache'] },
    { id: 'spray', label: 'Spray paint', kw: ['spray paint', 'spray art', 'spray can', 'stencil', 'graffiti'] },
    { id: 'furniture', label: 'Furniture & signs', kw: ['painted furniture', 'chalk paint', 'milk paint', 'furniture flip', 'furniture makeover', 'dresser', 'painted sign', 'hand lettered', 'hand lettering'] },
    { id: 'wall', label: 'Walls & murals', kw: ['mural', 'murals', 'accent wall', 'wall painting', 'painted wall'] },
    { id: 'drawing', label: 'Drawing & sketching', kw: ['drawing', 'sketch', 'sketching', 'charcoal', 'colored pencil', 'pencil drawing', 'oil pastel', 'pastels', 'doodle', 'zentangle'] },
    { id: 'kids', label: 'Kids painting', kw: ['kids painting', 'toddler painting', 'finger paint', 'finger painting', 'preschool painting', 'painting for kids'], weak: true },
    { id: 'other', label: 'Other painting', kw: [] }
  ];
  const CRAFT = [
    { id: 'wood', label: 'Wood crafts', kw: ['wood', 'wooden', 'pallet', 'scrap wood', 'woodworking', 'wood burning', 'pyrography', 'dowel', 'wood slice', 'plywood', 'cutting board', 'crate'] },
    { id: 'paper', label: 'Paper crafts', kw: ['paper', 'cardstock', 'origami', 'scrapbook', 'scrapbooking', 'card making', 'quilling', 'decoupage', 'paper flowers', 'junk journal', 'bookmark', 'stamping'] },
    { id: 'resin', label: 'Resin', kw: ['resin', 'epoxy', 'uv resin', 'resin art'] },
    { id: 'cricut', label: 'Cricut & vinyl', kw: ['cricut', 'vinyl decal', 'htv', 'silhouette cameo', 'sublimation', 'decal', 'svg', 'heat press', 'iron on', 'infusible ink', 'laser cut', 'glowforge'] },
    { id: 'sewing', label: 'Sewing & fabric', kw: ['sew', 'sewing', 'fabric', 'quilt', 'quilting', 'embroidery', 'cross stitch', 'applique', 'tote bag', 'sewing machine', 'scrunchie', 'pillow cover'] },
    { id: 'yarn', label: 'Yarn & crochet', kw: ['crochet', 'knit', 'knitting', 'yarn', 'macrame', 'amigurumi', 'pom pom', 'weaving', 'tufting', 'punch needle', 'granny square'] },
    { id: 'jewelry', label: 'Jewelry & beads', kw: ['jewelry', 'bracelet', 'bracelets', 'necklace', 'earring', 'earrings', 'bead', 'beads', 'beaded', 'charm', 'keychain', 'clay beads'] },
    { id: 'clay', label: 'Clay', kw: ['clay', 'polymer clay', 'air dry clay', 'pottery', 'sculpt', 'sculpting', 'pinch pot', 'trinket dish'] },
    { id: 'candles', label: 'Candles & soap', kw: ['candle making', 'soy candle', 'candles', 'candle', 'soap making', 'soap', 'bath bomb', 'bath bombs', 'wax melt', 'wax melts'] },
    { id: 'florals', label: 'Wreaths & florals', kw: ['wreath', 'wreaths', 'floral arrangement', 'flower arrangement', 'faux flowers', 'dried flowers', 'silk flowers', 'swag', 'centerpiece'] },
    { id: 'glass', label: 'Glass & mosaic', kw: ['stained glass', 'glass etching', 'sea glass', 'mosaic'] },
    { id: 'holiday', label: 'Holiday & seasonal', kw: ['halloween', 'christmas', 'thanksgiving', 'easter', 'valentine', 'valentines', 'fall decor', 'autumn', 'ornament', 'ornaments', 'spooky', '4th of july', 'garland', 'gnome', 'gnomes', 'advent'], weak: true },
    { id: 'decor', label: 'Home decor', kw: ['home decor', 'decor', 'vase', 'shelf', 'picture frame', 'wall decor', 'wall hanging', 'tray', 'mirror', 'dollar tree'] },
    { id: 'kids', label: 'Kids crafts', kw: ['kids craft', 'kids crafts', 'craft for kids', 'crafts for kids', 'toddler craft', 'preschool craft', 'classroom craft'], weak: true },
    { id: 'upcycle', label: 'Upcycle & DIY', kw: ['upcycle', 'upcycled', 'recycle', 'recycled', 'thrift', 'thrift flip', 'mason jar', 'jar', 'bottle', 'tin can', 'repurpose', 'repurposed', 'cardboard', 'toilet paper roll', 'egg carton'] },
    { id: 'diamond', label: 'Diamond art & kits', kw: ['diamond painting', 'diamond art', 'craft kit', 'kit'] },
    { id: 'other', label: 'Other crafts', kw: [] }
  ];
  const CATS = { painting: PAINT, craft: CRAFT };
  // each word also matches its -s, -ed and -ing forms (paint: paints, painted, painting), so list the root once
const PAINT_WORDS = ['paint', 'canvas', 'brush', 'brushes', 'palette', 'brushstrokes', 'painter', 'artist'];
  const CRAFT_WORDS = ['craft', 'crafty', 'diy', 'hot glue', 'glue gun', 'handmade', 'glue', 'maker'];
  const TAG_RULES = [
    ['fall', ['fall', 'autumn', 'pumpkin', 'pumpkins', 'leaves', 'harvest', 'scarecrow']],
    ['halloween', ['halloween', 'spooky', 'ghost', 'ghosts', 'witch', 'skeleton', 'jack o lantern', 'bats']],
    ['thanksgiving', ['thanksgiving', 'turkey']],
    ['christmas', ['christmas', 'xmas', 'santa', 'ornament', 'snowman', 'gingerbread', 'reindeer']],
    ['winter', ['winter', 'snow', 'snowflake']],
    ['spring', ['spring', 'easter', 'bunny']],
    ['summer', ['summer', 'beach', '4th of july']],
    ['valentines', ['valentine', 'valentines']],
    ['easy', ['easy', 'beginner', 'beginners', 'simple', 'quick']],
    ['kids', ['kids', 'toddler', 'children', 'classroom']],
    ['gift', ['gift', 'gifts', 'present']],
    ['dollar tree', ['dollar tree', 'dollar store']],
    ['florals', ['flower', 'flowers', 'floral', 'florals', 'roses', 'sunflower', 'sunflowers']],
    ['landscape', ['landscape', 'mountain', 'mountains', 'sunset', 'ocean', 'seascape', 'trees']],
    ['galaxy', ['galaxy', 'space', 'stars', 'night sky', 'moon']],
    ['abstract', ['abstract']],
    ['animals', ['animal', 'animals', 'cat', 'dog', 'bird', 'owl', 'fox', 'cow', 'chicken', 'butterfly']],
    ['farmhouse', ['farmhouse', 'rustic']],
    ['outdoor', ['garden', 'outdoor', 'porch', 'yard']],
    ['upcycled', ['upcycle', 'upcycled', 'recycle', 'thrift', 'repurpose']],
    ['glitter', ['glitter']]
  ];
  const JUNK_TAGS = new Set(['fyp', 'foryou', 'foryoupage', 'fy', 'viral', 'trending', 'tiktok', 'reels', 'reel', 'explore', 'explorepage', 'instagram', 'instagood', 'youtube', 'shorts', 'youtubeshorts', 'art', 'artist', 'artwork', 'artistsoftiktok', 'artistsofinstagram', 'xyzbca', 'foryourpage', 'fypage', 'capcut', 'reelsinstagram', 'instadaily', 'love', 'follow', 'like', 'viralvideo', 'trend', 'satisfying', 'asmr']);

  function prep(text) {
    const lower = String(text || '').toLowerCase();
    return { norm: ' ' + lower.replace(/[^a-z0-9]+/g, ' ') + ' ', compact: lower.replace(/[^a-z0-9]/g, '') };
  }
  function has(T, kw) {
    if (T.norm.includes(' ' + kw + ' ') || T.norm.includes(' ' + kw + 's ') || T.norm.includes(' ' + kw + 'ed ') || T.norm.includes(' ' + kw + 'ing ')) return true;
    const flat = kw.replace(/ /g, '');
    return flat.length >= 6 && T.compact.includes(flat);
  }
  // { type: 'painting'|'craft'|null, sure: true when the words clearly point one way, painting: bestId, craft: bestId }
  function classify(text) {
    const T = prep(text);
    const score = { painting: 0, craft: 0 };
    const best = { painting: null, craft: null };
    for (const type of ['painting', 'craft']) {
      for (const c of CATS[type]) {
        let s = 0;
        for (const k of c.kw) if (has(T, k)) s += c.weak ? 1 : 2;
        if (s > 0) {
          score[type] += s;
          if (!best[type] || s > best[type].s) best[type] = { id: c.id, s };
        }
      }
    }
    for (const w of PAINT_WORDS) if (has(T, w)) score.painting += 1.5;
    for (const w of CRAFT_WORDS) if (has(T, w)) score.craft += 1.5;
    const top = Math.max(score.painting, score.craft);
    const type = top === 0 ? null : (score.painting >= score.craft ? 'painting' : 'craft');
    const sure = top >= 2 && Math.abs(score.painting - score.craft) >= 1.5;
    return { type, sure, score, painting: best.painting ? best.painting.id : 'other', craft: best.craft ? best.craft.id : 'other' };
  }
  function suggestTags(text) {
    const T = prep(text);
    const out = [];
    for (const [tag, words] of TAG_RULES) if (words.some(w => has(T, w))) out.push(tag);
    return out;
  }
  function hashtags(text) {
    const out = [];
    const re = /#([\p{L}\p{N}_]+)/gu;
    let m;
    while ((m = re.exec(String(text || '')))) {
      const t = m[1].toLowerCase();
      if (!JUNK_TAGS.has(t) && t.length > 2 && t.length < 30 && !out.includes(t)) out.push(t);
    }
    return out;
  }
  const catList = type => CATS[type === 'craft' ? 'craft' : 'painting'];
  function catLabel(type, id) {
    const list = catList(type);
    return (list.find(c => c.id === id) || list[list.length - 1]).label;
  }
  // Everything the app needs to file a post: board, category, and a few tags.
  function sortPost(p) {
    const caption = String(p.caption || '');
    const text = [p.title, caption, (p.tags || []).join(' '), p.notes, (p.supplies || []).join(' '), urlWords(p.url)].join(' ');
    const c = classify(text);
    const type = c.type || null;
    const tags = [];
    for (const t of suggestTags(text).concat(hashtags(caption).slice(0, 4))) if (!tags.includes(t)) tags.push(t);
    return { type, sure: c.sure, category: type ? c[type] : 'other', painting: c.painting, craft: c.craft, tags: tags.slice(0, 6) };
  }
  function urlWords(url) {
    try {
      const u = new URL(url);
      const q = u.searchParams.get('search_query') || u.searchParams.get('q') || '';
      return decodeURIComponent(u.pathname).replace(/[\/_\-+.]+/g, ' ') + ' ' + q;
    } catch (e) { return ''; }
  }

  const API = { PAINT, CRAFT, CATS, classify, suggestTags, hashtags, catList, catLabel, sortPost, prep, has };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Cats = API;
})(this);
