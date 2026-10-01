// Offline tests for Artistry, formerly Brush & Glue (the crafts app in crafts/): the sorter, the post reader (api/idea.js),
// and the blog finder (api/crafts.js), with a fake internet.
const path = require('path');
const R = path.join(__dirname, '..');
const Cats = require(path.join(R, 'crafts/cats.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = JSON.stringify;

// ---------- the sorter ----------
const cases = [
  ['Easy fall pumpkin acrylic painting on canvas 🎃 #acrylicpainting #fallart #fyp', 'painting', 'acrylic', ['fall', 'easy']],
  ['Galaxy paint pour on an old vinyl record ✨ #paintpouring #fluidart', 'painting', 'pour', ['galaxy']],
  ['Dollar Tree Halloween wreath 🎃 hot glue everything! #dollartreecrafts', 'craft', 'florals', ['halloween', 'dollar tree']],
  ['Dot mandala rocks with my dotting tools #mandalastones #dotart', 'painting', 'dot', []],
  ['Crochet Pumpkin Coasters for Fall', 'craft', 'yarn', ['fall']],
  ['Cricut Halloween shirt with HTV', 'craft', 'cricut', ['halloween']],
  ['Diamond painting kit unboxing, so relaxing', 'craft', 'diamond', []],
  ['How to Paint Pumpkins and Add Texture', 'painting', 'objects', ['fall']],
  ['Watercolor sunflowers for beginners', 'painting', 'watercolor', ['easy', 'florals']],
  ['Resin coasters with dried flowers', 'craft', 'resin', []],
  ['Pallet wood porch sign', 'craft', 'wood', ['outdoor']],
  ['Chalk paint dresser makeover', 'painting', 'furniture', []],
  ['Painted kindness rocks for the garden #rockpainting', 'painting', 'rock', ['outdoor']],
  ['Polymer clay earrings 🌸 #polymerclay', 'craft', 'jewelry', []],
  ['Air dry clay trinket dish', 'craft', 'clay', []],
  ['Soy candle making at home', 'craft', 'candles', []]
];
for (const [text, type, cat, tags] of cases) {
  const s = Cats.sortPost({ title: '', caption: text });
  ok(s.type === type && s.category === cat && s.sure && tags.every(t => s.tags.includes(t)), 'sorts "' + text.slice(0, 44) + '" -> ' + J([s.type, s.category, s.sure, s.tags]));
}
const vague = Cats.sortPost({ caption: 'So cute!! 😍 #fyp #viral #love' });
ok(vague.type === null && !vague.sure && vague.tags.length === 0, 'vague caption asks instead of guessing -> ' + J(vague));
const mixed = Cats.sortPost({ caption: 'Painted rocks glued into a DIY wreath craft' });
ok(!mixed.sure || mixed.type, 'mixed caption gives a guess -> ' + J([mixed.type, mixed.sure]));
ok(J(Cats.hashtags('Love it #FallCrafts #fyp #art #dollartree')) === J(['fallcrafts', 'dollartree']), 'hashtags drop the junk ones');
const Stamp = require(path.join(R, 'tools/stamp_crafts.js'));
ok(Stamp.current() === Stamp.hash(), 'crafts/sw.js is stamped for the current app files, so phones get this version (if not: node tools/stamp_crafts.js) -> ' + Stamp.current());
ok(Cats.catLabel('craft', 'yarn') === 'Yarn & crochet' && Cats.catLabel('painting', 'nope') === 'Other painting', 'category labels');

// ---------- the post reader and the blog finder, with a fake internet ----------
(async () => {
  const igHtml = `<html><body><div class="Embed"><div class="Header"><span class="UsernameText">craftymaria</span></div>
<img class="EmbeddedMediaImage" alt="" src="https://scontent.cdninstagram.com/v/t51/pour.jpg?stp=dst&amp;x=1">
<div class="Caption"><a class="CaptionUsername" href="https://www.instagram.com/craftymaria/">craftymaria</a><br /><br />✨ Galaxy paint pour on an old record ✨<br /><br />Supplies: acrylics, pouring medium, silicone oil<br /><br /><a href="https://www.instagram.com/explore/tags/paintpouring/">#paintpouring</a> <a href="#">#fluidart</a> <a href="#">#fyp</a><div class="CaptionComments"><a>View all 88 comments</a></div></div></div></body></html>`;
  const pinJson = JSON.stringify({ data: [{ link: 'https://craftblog.example.com/mason-jar-lanterns/', title: 'Mason Jar Halloween Lanterns', description: 'Easy Dollar Tree mason jar lanterns with tissue paper.', images: { '736x': { url: 'https://i.pinimg.com/736x/ab.jpg', width: 736, height: 1104 } }, pinner: { username: 'nana_crafts' } }] });
  const blog = `<html><head><title>Burlap Pumpkin Wreath - Crafts by Amanda</title><meta property="og:site_name" content="Crafts by Amanda">
<meta property="og:title" content="Burlap Pumpkin Wreath - Crafts by Amanda"><meta property="og:image" content="/wp-content/uploads/wreath.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="1800"><meta property="og:description" content="Make this easy fall wreath.">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"HowTo","name":"Burlap Pumpkin Wreath","supply":[{"@type":"HowToSupply","name":"Wire wreath form"},{"@type":"HowToSupply","name":"Orange burlap ribbon"}],"tool":[{"@type":"HowToTool","name":"Hot glue gun"}]}]}</script></head><body></body></html>`;
  const wp = JSON.stringify([
    { link: 'https://craftblog.example.com/painted-pumpkins/', title: { rendered: 'Painted Pumpkins That Will Rock Your Autumn' }, _embedded: { 'wp:featuredmedia': [{ source_url: 'https://craftblog.example.com/full.jpg', media_details: { width: 1400, height: 2100, sizes: { medium_large: { source_url: 'https://craftblog.example.com/ml.jpg', width: 768, height: 1152 } } } }] } },
    { link: 'https://craftblog.example.com/pumpkin-mug-cake/', title: { rendered: 'Pumpkin Mug Cake' }, jetpack_featured_media_url: 'https://craftblog.example.com/cake.jpg' },
    { link: 'https://craftblog.example.com/pumpkin-cupcake-toppers/', title: { rendered: 'DIY Pumpkin Cupcake Toppers' }, jetpack_featured_media_url: 'https://craftblog.example.com/toppers.jpg' },
    { link: 'https://craftblog.example.com/no-photo/', title: { rendered: 'A Post Without a Photo' } },
    { link: 'https://craftblog.example.com/giveaway/', title: { rendered: 'Big Fall Giveaway' }, jetpack_featured_media_url: 'https://craftblog.example.com/g.jpg' }
  ]);
  const pages = {
    'https://www.instagram.com/p/DPour12345/embed/captioned/': igHtml,
    'https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=998877665544': pinJson,
    'https://craftsbyamanda.example.com/burlap-pumpkin-wreath/': blog,
    'https://craftblog.example.com/wp-json/wp/v2/posts?per_page=9&search=pumpkin&orderby=relevance&_embed=wp:featuredmedia&_fields=link,title,date,jetpack_featured_media_url,yoast_head_json.og_image,_links,_embedded': wp
  };
  global.fetch = async (url) => {
    const body = pages[url];
    if (body == null) return { status: 404, ok: false, headers: new Map(), text: async () => '' };
    return { status: 200, ok: true, headers: new Map([['content-type', 'text/html']]), text: async () => body };
  };
  const { readIdea } = require(path.join(R, 'api/idea.js'));

  const ig = await readIdea('https://www.instagram.com/reel/DPour12345/?igsh=MWx0abc');
  ok(ig.platform === 'instagram' && ig.kind === 'video', 'instagram reel: platform and kind');
  pages['https://www.instagram.com/p/DPhoto9876/embed/captioned/'] = igHtml;
  const igPhoto = await readIdea('https://www.instagram.com/p/DPhoto9876/');
  ok(igPhoto.kind === 'post', 'instagram photo post: no play button -> ' + igPhoto.kind);
  ok(ig.title === 'Galaxy paint pour on an old record', 'instagram reel: title without sparkles -> ' + ig.title);
  ok(ig.author === '@craftymaria' && ig.image === 'https://scontent.cdninstagram.com/v/t51/pour.jpg?stp=dst&x=1', 'instagram reel: creator and photo -> ' + J([ig.author, ig.image]));
  ok(/#paintpouring/.test(ig.caption) && !/comments/.test(ig.caption), 'instagram reel: whole caption, no comment count');
  const igSort = Cats.sortPost({ title: ig.title, caption: ig.caption, url: ig.finalUrl });
  ok(igSort.type === 'painting' && igSort.category === 'pour' && igSort.sure, 'instagram reel is filed under Painting > Paint pouring -> ' + J(igSort));

  const pin = await readIdea('https://www.pinterest.com/pin/998877665544/');
  ok(pin.platform === 'pinterest' && pin.title === 'Mason Jar Halloween Lanterns' && pin.width === 736 && pin.height === 1104, 'pinterest: title and photo size -> ' + J([pin.title, pin.width, pin.height]));
  ok(pin.link === 'https://craftblog.example.com/mason-jar-lanterns/' && pin.author === 'nana_crafts', 'pinterest: the project page it links to');
  const pinSort = Cats.sortPost(pin);
  ok(pinSort.type === 'craft' && pinSort.category === 'upcycle', 'pinterest pin is filed under Crafts > Upcycle -> ' + J(pinSort));

  const site = await readIdea('https://craftsbyamanda.example.com/burlap-pumpkin-wreath/');
  ok(site.title === 'Burlap Pumpkin Wreath' && site.siteName === 'Crafts by Amanda', 'website: title without the site name -> ' + site.title);
  ok(site.image === 'https://craftsbyamanda.example.com/wp-content/uploads/wreath.jpg' && site.width === 1200 && site.height === 1800, 'website: photo made absolute, with size');
  ok(J(site.supplies) === J(['Wire wreath form', 'Orange burlap ribbon', 'Hot glue gun']), 'website: supplies from the project card -> ' + J(site.supplies));

  const { fromWordPress } = require(path.join(R, 'api/crafts.js'));
  const items = await fromWordPress({ id: 'craftblog', name: 'Craft Blog', home: 'https://craftblog.example.com', kind: 'craft' }, 'pumpkin', 3, null, 1);
  ok(items.length === 2 && items[0].image === 'https://craftblog.example.com/ml.jpg' && items[0].width === 768 && items[0].height === 1152, 'blog finder: photo and size from the post -> ' + J(items[0]));
  ok(items.map(x => x.title).join('|') === 'Painted Pumpkins That Will Rock Your Autumn|DIY Pumpkin Cupcake Toppers', 'blog finder: skips recipes, giveaways and posts without a photo -> ' + items.map(x => x.title).join('|'));

  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
