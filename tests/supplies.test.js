// Offline tests for Artistry's supplies (crafts/supplies.js): reading supply lists from real-style captions and
// blog pages, "usually needs" guesses, and checking against My supplies.
const path = require('path');
const R = path.join(__dirname, '..');
const S = require(path.join(R, 'crafts/supplies.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = JSON.stringify;
const names = list => list.map(x => x.name);
const ids = list => list.map(x => x.id);

// the dictionary itself
const allIds = S.SUPPLIES.map(s => s.id);
ok(new Set(allIds).size === allIds.length, S.SUPPLIES.length + ' supplies, no id used twice');
ok(S.SUPPLIES.every(s => S.GROUPS.some(g => g.id === s.g)), 'every supply is in a store section');
ok(S.COMMON.every(id => S.byId(id)), 'the tap-to-add list only uses known supplies');
ok(Object.values(S.LIKELY).every(l => l.every(id => S.byId(id))), 'the usual-supplies table only uses known supplies');

// a list under a heading, with amounts, links and shop talk
const wreath = S.gather({ title: 'Burlap Pumpkin Wreath', type: 'craft', category: 'florals', caption: 'Fall wreath from Dollar Tree!\n\nWhat you’ll need:\n- 14" wire wreath frame\n- 2 rolls orange burlap ribbon (Dollar Tree)\n- Hot glue gun\n- Faux leaves and picks\n- Floral wire\n\nSteps:\n1. Cut the burlap into 10" strips\n2. Tie them on the frame' });
ok(J(ids(wreath)) === J(['wreathform', 'burlap', 'hotglue', 'faux', 'floralwire']) && wreath.every(x => x.from === 'list'), 'list under "What you’ll need", stops at Steps -> ' + J(names(wreath)));
ok(wreath[0].line === '14" wire wreath frame' && wreath[1].line === 'Orange burlap ribbon', 'keeps her words for each line (amounts and stores dropped) -> ' + J(wreath.map(x => x.line)));

// one-line list after "Supplies:"
const pour = S.gather({ title: 'Galaxy paint pour', type: 'painting', category: 'pour', caption: '✨ Galaxy paint pour on an old record ✨\n\nSupplies: acrylics, pouring medium, silicone oil\n\n#paintpouring #fluidart #fyp' });
ok(J(ids(pour)) === J(['acrylic', 'pourmedium', 'siliconeoil']), 'one-line list -> ' + J(names(pour)));

// colors in parentheses belong to one line
const sunset = S.gather({ title: 'Sunset', type: 'painting', category: 'acrylic', caption: 'Supplies:\n- acrylic paint (magenta, orange, yellow, black)\n- 11x14 canvas\n- flat brush and liner brush' });
ok(J(ids(sunset)) === J(['acrylic', 'canvas', 'brushes']) && sunset[0].line === 'Acrylic paint (magenta, orange, yellow, black)', 'commas inside (…) stay on one supply -> ' + J(sunset.map(x => x.line)));

// a caption squashed onto one line with bullets
const rocks = S.gather({ title: 'Mandala dot rocks', type: 'painting', category: 'dot', caption: 'Dot mandala rocks 🌈 Materials • smooth rocks • dotting tools • acrylic paint • clear sealer  Follow for more!' });
ok(['rocks', 'dotting', 'acrylic', 'sealer'].every(id => ids(rocks).includes(id)), 'bullets on one line -> ' + J(names(rocks)));

// "You will need: ..." then directions on the same line
const candle = S.gather({ title: 'Soy candle', type: 'craft', category: 'candles', caption: 'You will need: 1 lb soy wax flakes, cotton wicks, 1 oz fragrance oil, candle jars, thermometer, pouring pitcher. Instructions: melt wax to 185F and stir.' });
ok(J(ids(candle)) === J(['wax', 'wicks', 'fragrance', 'container', 'thermometer', 'pourpot']), 'inline list ends where Instructions start -> ' + J(names(candle)));

// affiliate list with links
const cricut = S.gather({ title: 'Cricut shirt', type: 'craft', category: 'cricut', caption: 'Supplies used (affiliate links):\n• Cricut Maker 3 (https://amzn.to/xyz)\n• Siser EasyWeed HTV\n• EasyPress 2\n• Blank tee' });
ok(J(ids(cricut)) === J(['cricut', 'htv', 'heatpress', 'blank']) && !cricut.some(x => /used|amzn|\(/i.test(x.line)), 'affiliate links and "(…)" dropped -> ' + J(cricut.map(x => x.line)));

// no list: things named in the caption
const tiktok = S.gather({ title: 'easy painting idea for beginners', type: 'painting', category: 'acrylic', caption: 'easy painting idea for beginners  acrylics on 5x7" canvas board  #canvasart #paintingprocess' });
ok(J(ids(tiktok).sort()) === J(['acrylic', 'canvas']) && tiktok.every(x => x.from === 'post'), 'named in the caption ("acrylics on a canvas board") -> ' + J(names(tiktok)));
const jar = S.gather({ title: 'Mason jar lantern', type: 'craft', category: 'upcycle', caption: 'Easy Halloween mason jar luminaries using tissue paper, Mod Podge and googly eyes! Add a tea light.' });
ok(['jar', 'tissue', 'modpodge', 'googly', 'lights'].every(id => ids(jar).includes(id)), 'named in a sentence -> ' + J(names(jar)));
// a pumpkin-shaped wreath doesn't need a pumpkin; painted pumpkins do
ok(!ids(wreath).includes('pumpkin') && ids(S.gather({ title: 'Painted pumpkins', type: 'painting', category: 'objects', caption: 'Painting pumpkins with acrylic paint' })).includes('pumpkin'), 'a pumpkin is a supply only for painted pumpkins');
// words that aren't supplies here
const noise = S.gather({ title: 'Wrought iron fence painting', type: 'painting', category: 'acrylic', caption: 'Painted this wrought iron gate scene on a canvas board with acrylics' });
ok(!ids(noise).includes('heatpress'), '"iron" in a sentence is not a heat press -> ' + J(names(noise)));

// said out loud in the video (TikTok's speech-to-text)
const talk = 'hey guys so today we are making these cute little ghost jars for halloween so you will need a mason jar some white acrylic paint a foam brush and a black paint pen I saw this idea on pinterest and I just had to try it then I used a little bit of mod podge on the top and I grabbed some tea lights';
const heard = S.spoken(talk, { title: 'Ghost luminaries', type: 'craft', category: 'upcycle' });
ok(J(ids(heard)) === J(['jar', 'acrylic', 'foambrush', 'paintpens', 'modpodge', 'lights']) && heard.every(x => x.from === 'said'), 'supplies said in a video, in the order said, "I saw" is not a saw -> ' + J(names(heard)));
ok(S.spoken('look at all these rocks and the canvas behind me, I love fall', { title: 'My craft room tour', type: 'craft', category: 'other' }).length === 0, 'weak words in chit-chat ("rocks", "canvas") don’t count');
ok(J(ids(S.spoken('for this one you’re gonna need some smooth rocks and a canvas and an iron', { title: 'Kindness rocks', type: 'painting', category: 'rock' }))) === J(['rocks', 'canvas']), 'weak words right after "you’re gonna need" count, "iron" never does');
// a real TikTok (Dollar Tree perfume frame, @timmsevitz, read live Oct 1, 2026): cardstock, and "glued" said three times
const realTalk = 'I removed the perfume label by scratching it off with a penny and then wiped it down with a soft cloth. Then I cut out a rectangle out of yellow cardstock and rounded the bottom. I cut another rectangle out of a lighter shade of yellow cardstock and cut angles at the top and then glued those together. Then I traced the original backing onto a piece of grey cardstock and cut that out. I glued the grey cardstock to the backing and the yellow shapes that I cut out, I glued that to match the perfume bottle in the front.';
ok(J(ids(S.spoken(realTalk, { title: 'This Chanel No 5 Dollar Tree craft dupe', type: 'craft', category: 'decor' }))) === J(['cardstock', 'craftglue']), 'real TikTok talk: cardstock, and glue because she said "glued" three times -> ' + J(names(S.spoken(realTalk, { title: 'Chanel dupe', type: 'craft', category: 'decor' }))));
ok(J(ids(S.spoken('then I hot glued the bow on', {}))) === J(['hotglue']), '"hot glued" is a hot glue gun');
const fromTalk = S.gather({ title: 'Ghost luminaries', caption: 'so cute 👻 #halloween #craft', speech: talk, type: 'craft', category: 'upcycle' });
ok(fromTalk.some(x => x.from === 'said') && !fromTalk.some(x => x.from === 'likely'), 'a caption with no list plus talk in the video: supplies from the talk, no guesses -> ' + J(fromTalk.map(x => x.name + ':' + x.from)));
const both = S.gather({ title: 'Sunset', type: 'painting', category: 'acrylic', caption: 'Supplies:\n- acrylic paint\n- 11x14 canvas', speech: 'I m using acrylic paint and a palette knife today' });
ok(J(both.map(x => x.id + ':' + x.from)) === J(['acrylic:list', 'canvas:list', 'paletteknife:said']), 'the written list first, then what was said that it left out -> ' + J(both.map(x => x.id + ':' + x.from)));

// usually needs, when a post says nothing
const water = S.gather({ title: 'Watercolor sunflowers', caption: '', type: 'painting', category: 'watercolor' });
ok(J(ids(water)) === J(['watercolor', 'wcpaper', 'brushes']) && water.every(x => x.from === 'likely'), 'usual supplies for watercolor -> ' + J(names(water)));
const crochet = S.gather({ title: 'Crochet pumpkin', caption: 'Cute crochet pumpkins for fall 🍂', type: 'craft', category: 'yarn' });
ok(J(ids(crochet)) === J(['yarn', 'crochethook', 'yarnneedle']), 'usual supplies for crochet, and no real pumpkin -> ' + J(names(crochet)));

// from a blog page's list (api/idea.js reads these)
const blog = S.gather({ title: 'Cactus painted rocks', type: 'painting', category: 'rock', supplies: ['Smooth rocks', 'Acrylic paint in greens', 'Posca paint pens', 'Mod Podge outdoor sealer', 'Something special from my garden'] });
ok(J(ids(blog)) === J(['rocks', 'acrylic', 'paintpens', 'modpodge', 'sealer', null]), 'page list lines, unknown ones kept as typed -> ' + J(names(blog)));

// checking against My supplies
const stash = { have: ['acrylic', 'brushes', 'hotglue', 'modpodge'], custom: ['googly eyes'], basics: true };
const w = S.check(wreath, stash);
ok(w.need === 5 && w.have === 1 && J(names(w.missing)) === J(['Wreath form', 'Burlap', 'Faux flowers & greenery', 'Floral wire']) && !w.ready, 'wreath: has 1 of 5 -> ' + J(names(w.missing)));
const j = S.check(jar, stash);
ok(j.have >= 2 && names(j.missing).includes('Mason jar') && !names(j.missing).includes('Googly eyes'), 'something she typed in ("googly eyes") counts -> missing ' + J(names(j.missing)));
const cv = S.check(S.gather({ title: 'Sunset', type: 'painting', category: 'acrylic', caption: 'Supplies:\n- acrylic paint\n- 11x14 stretched canvas\n- scissors' }), { have: ['acrylic'], basics: true, custom: [] });
ok(cv.ready === false && names(cv.missing).join() === 'Canvas', 'scissors count as a basic; canvas is missing -> ' + J(names(cv.missing)));
const cv2 = S.check(S.gather({ title: 'Sunset', type: 'painting', category: 'acrylic', caption: 'Supplies:\n- acrylic paint\n- 11x14 stretched canvas\n- scissors' }), { have: ['acrylic', 'canvas'], basics: false, custom: [] });
ok(cv2.ready === false && names(cv2.missing).join() === 'Scissors', 'with Basics off, scissors are needed too');
ok(S.check(tiktok, { have: ['acrylic', 'canvas'] }).ready, 'ready to make when she has everything');

// typing what she has
ok(S.lookup('posca pens').id === 'paintpens' && S.lookup('tacky glue').id === 'craftglue' && S.lookup('glue gun').id === 'hotglue' && S.lookup('11x14 canvas').id === 'canvas' && S.lookup('spam') === null, 'typed supplies map to known ones');

// blog pages (api/idea.js)
const { listedSupplies } = require(path.join(R, 'api/idea.js'));
const page = '<article><h2>Easy Pumpkin Wreath</h2><p>Intro.</p><h3>Supplies You&#8217;ll Need</h3><p>Grab these:</p><ul><li>14&quot; <a href="x">wire wreath frame</a> (affiliate link)</li><li>Orange burlap ribbon</li><li>Hot glue gun</li></ul><h3>Instructions</h3><ol><li>Cut</li></ol></article>';
ok(J(listedSupplies(page)) === J(['14" wire wreath frame', 'Orange burlap ribbon', 'Hot glue gun']), 'blog page: the list under the Supplies heading -> ' + J(listedSupplies(page)));
ok(J(listedSupplies('<div class="mv-create-supplies"><ul><li>Rocks</li><li>Paint pens</li></ul></div>')) === J(['Rocks', 'Paint pens']), 'blog page: a Create project card');
ok(listedSupplies('<h2>Instructions</h2><ul><li>Cut</li></ul>').length === 0, 'blog page: other lists are left alone');

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
