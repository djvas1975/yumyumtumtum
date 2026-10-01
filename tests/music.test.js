// Offline tests for Artistry's Learn music tab: what a lesson is about (crafts/music.js),
// the song links, and the lesson finder (api/music.js) with and without a YouTube key, with a fake internet.
const path = require('path');
const R = path.join(__dirname, '..');
const M = require(path.join(R, 'crafts/music.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = JSON.stringify;

// ---------- what a lesson is about ----------
const cases = [
  // text, instrument, genre it should find, song, level
  ['How to play My Girl by The Temptations on guitar - easy beginner lesson', 'guitar', 'motown', 'My Girl', 'easy'],
  ['Für Elise piano tutorial (slow, easy)', 'piano', 'classical', 'Für Elise', 'easy'],
  ['Fur Elise piano tutorial', 'piano', 'classical', 'Für Elise', ''],
  ['Wagon Wheel ukulele chords and strumming', 'ukulele', 'country', 'Wagon Wheel', ''],
  ['Foggy Mountain Breakdown banjo tab - advanced', 'banjo', 'bluegrass', 'Foggy Mountain Breakdown', 'harder'],
  ['Back in Black drum lesson', 'drums', 'classicrock', 'Back in Black', ''],
  ['Wonderwall guitar tutorial', 'guitar', 'alternative', 'Wonderwall', ''],
  ['Creep Radiohead guitar lesson', 'guitar', 'alternative', 'Creep', ''],
  ['Lose Yourself Eminem piano tutorial', 'piano', 'rap', 'Lose Yourself', ''],
  ['Ring of Fire Johnny Cash guitar chords', 'guitar', 'country', 'Ring of Fire', '']
];
for (const [text, inst, genre, song, level] of cases) {
  const d = M.detect(text);
  ok(d.isMusic && d.inst.includes(inst) && d.genres.includes(genre) && d.song === song && d.level === level,
    'detects "' + text.slice(0, 44) + '" -> ' + J([d.inst, d.genres, d.song, d.level]));
}
const creep = M.detect('Creep guitar lesson');
ok(creep.isMusic && creep.song === '', 'a one-word title alone is not trusted ("Creep" with no artist) -> ' + J(creep.song));
for (const text of ['Easy fall pumpkin acrylic painting', 'I made a guitar shaped cake', 'Crochet guitar pick holder', 'Galaxy paint pour on an old vinyl record']) {
  ok(!M.detect(text).isMusic, 'not a music lesson: "' + text + '"');
}
ok(M.detect('Taps on trumpet for beginners').inst[0] === 'trumpet', 'trumpet lesson found');
// the channel counts: live YouTube check Oct 1, 2026 read "JustinGuitar Beginner Course Grade 1 Introduction" with no description
const jg = M.detect('JustinGuitar Beginner Course Grade 1 Introduction', 'JustinGuitar');
ok(jg.isMusic && jg.inst[0] === 'guitar' && jg.teacher === 'JustinGuitar', 'a lesson from a known teacher is music even when the title names no instrument -> ' + J([jg.inst, jg.teacher]));
ok(M.detect('Beginner Course Grade 1 Introduction', 'Pianote').inst[0] === 'piano', 'a teacher channel gives its instrument');
ok(M.detect('Easy lesson for beginners', 'GuitarLessonsWithBob').inst[0] === 'guitar', 'an instrument inside a channel name counts');
ok(!M.detect('Easy song for beginners', 'Luke Combs Fan Page').inst.length, '"uke" inside a name (Luke) is not a ukulele');
ok(!M.detect('Sunset painting on canvas', 'PaintWithJosh').isMusic, 'a painting channel is not music');
ok(M.detect('What a Wonderful World ukulele tutorial').song === 'Somewhere Over the Rainbow / What a Wonderful World', 'a medley is found from either song');
ok(M.detect('lesson', ).isMusic === false && M.detect('').isMusic === false, 'no instrument, not music');

// every song in the starter list is findable by its own name and has real genres and instruments
const gIds = M.GENRES.map(g => g.id), iIds = M.INSTRUMENTS.map(i => i.id);
const badSongs = M.SONGS.filter(s => !s.t || !s.a || !s.g.length || s.g.some(g => !gIds.includes(g)) || !s.fit.length || s.fit.some(i => !iIds.includes(i)) || !['easy', 'medium', 'hard'].includes(s.lv));
ok(!badSongs.length, M.SONGS.length + ' songs to learn, all with known genres, instruments and levels' + (badSongs.length ? ' -> bad: ' + badSongs.map(s => s.t).join(', ') : ''));
const titles = M.SONGS.map(s => s.t.toLowerCase());
ok(new Set(titles).size === titles.length, 'no song listed twice');
const lost = M.SONGS.filter(s => M.detect(s.t + ' ' + (s.a === 'Traditional' || s.a === 'Anonymous' ? '' : s.a) + ' ' + s.fit[0] + ' tutorial').song !== s.t);
ok(!lost.length, 'each song is recognized from "title artist instrument tutorial"' + (lost.length ? ' -> missed: ' + lost.map(s => s.t).join(', ') : ''));
for (const g of M.DEFAULT_GENRES) ok(M.SONGS.filter(s => s.g.includes(g)).length >= 6, 'at least 6 songs for her genre ' + M.genreLabel(g) + ' (' + M.SONGS.filter(s => s.g.includes(g)).length + ')');
for (const i of M.DEFAULT_INST) ok(M.SONGS.filter(s => s.fit.includes(i)).length >= 8, 'at least 8 songs for ' + M.instLabel(i) + ' (' + M.SONGS.filter(s => s.fit.includes(i)).length + ')');
for (const i of M.DEFAULT_INST) ok(M.TEACHERS.some(t => t.inst.includes(i)), 'a free teacher channel for ' + M.instLabel(i));
ok(M.TEACHERS.every(t => /^UC[\w-]{22}$/.test(t.id)), 'teacher channel ids look right');

// ---------- song links ----------
const myGirl = M.SONGS.find(s => s.t === 'My Girl');
const gl = M.songLinks(myGirl, 'guitar');
ok(gl[0].url === 'https://www.youtube.com/results?search_query=My%20Girl%20The%20Temptations%20guitar%20tutorial%20easy' && gl.some(l => /ultimate-guitar/.test(l.url)) && !gl.some(l => /musescore/.test(l.url)), 'guitar: YouTube lessons and chords -> ' + J(gl.map(l => l.label)));
const pl = M.songLinks(M.SONGS.find(s => s.t === 'Für Elise'), 'piano');
ok(pl.some(l => /musescore/.test(l.url)) && pl.some(l => /imslp/.test(l.url)) && !pl.some(l => /ultimate-guitar/.test(l.url)), 'piano classical: sheet music and free scores -> ' + J(pl.map(l => l.label)));
const dl = M.songLinks(M.SONGS.find(s => s.t === 'Back in Black'), 'drums');
ok(dl.some(l => /songsterr/.test(l.url)), 'drums: drum tabs -> ' + J(dl.map(l => l.label)));

// ---------- the lesson finder (api/music.js) ----------
(async () => {
  const api = require(path.join(R, 'api/music.js'));
  const { parseFeed, matchWords, isoSecs } = api;
  ok(isoSecs('PT4M13S') === 253 && isoSecs('PT1H2M') === 3720 && isoSecs('PT45S') === 45 && isoSecs('') === 0, 'video lengths');

  const feed = `<?xml version="1.0"?><feed><author><name>JustinGuitar</name></author>
  <entry><yt:videoId>abcDEF12345</yt:videoId><title>My Girl - The Temptations | Easy Guitar Lesson &amp; Chords</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abcDEF12345"/><published>2026-09-20T10:00:00+00:00</published>
  <media:group><media:description>Learn My Girl on guitar.</media:description><media:community><media:statistics views="5120"/></media:community></media:group></entry>
  <entry><yt:videoId>shrt0000001</yt:videoId><title>One minute strumming tip</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/shrt0000001"/><published>2026-09-25T10:00:00+00:00</published></entry></feed>`;
  const ch = { id: 'UCBNkm8o5LiEVLxO8w0p2sfQ', name: 'JustinGuitar', inst: ['guitar', 'ukulele'] };
  const items = parseFeed(feed, ch);
  ok(items.length === 2 && items[0].title === 'My Girl - The Temptations | Easy Guitar Lesson & Chords' && items[0].views === 5120 && items[0].thumb === 'https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg', 'feed: lesson title, views and photo -> ' + J(items[0]));
  ok(items[1].short && items[1].url === 'https://www.youtube.com/shorts/shrt0000001', 'feed: Shorts marked');
  ok(J(matchWords(items, 'my girl guitar').map(x => x.id)) === J(['abcDEF12345']), 'search without a key matches the teacher lessons');
  ok(matchWords(items, 'how to play the').length === 0, 'search of only small words finds nothing');

  // a fake YouTube
  const calls = [];
  const fakeRes = (status, body, type) => ({ status, ok: status < 400, headers: new Map([['content-type', type || 'application/json']]), text: async () => (typeof body === 'string' ? body : J(body)), json: async () => body });
  global.fetch = async (url) => {
    calls.push(url);
    if (/youtube\.com\/feeds\//.test(url)) return fakeRes(404, 'Not Found', 'text/html'); // the feeds are gone since Sept 2026
    if (/\/youtube\/v3\/playlistItems/.test(url)) {
      const pl = (url.match(/playlistId=(UU[\w-]+)/) || [])[1];
      if (pl !== 'UUBNkm8o5LiEVLxO8w0p2sfQ') return fakeRes(200, { items: [] });
      return fakeRes(200, { items: [
        { snippet: { title: 'Ring of Fire - Johnny Cash | Beginner Guitar Lesson', description: 'Easy chords.', publishedAt: '2026-09-28T12:00:00Z', resourceId: { videoId: 'ringFire001' } } },
        { snippet: { title: 'Private video', resourceId: { videoId: 'gone0000001' } } },
        { snippet: { title: 'G chord in 30 seconds', publishedAt: '2026-09-29T12:00:00Z', resourceId: { videoId: 'gChord00001' } } }
      ] });
    }
    if (/\/youtube\/v3\/videos\?/.test(url)) return fakeRes(200, { items: [
      { id: 'ringFire001', contentDetails: { duration: 'PT12M5S' }, statistics: { viewCount: '81234' } },
      { id: 'gChord00001', contentDetails: { duration: 'PT30S' }, statistics: { viewCount: '900' } },
      { id: 'srch0000001', contentDetails: { duration: 'PT8M' }, statistics: { viewCount: '2000000' } }
    ] });
    if (/\/youtube\/v3\/search\?/.test(url)) return fakeRes(200, { items: [
      { id: { videoId: 'srch0000001' }, snippet: { title: 'Jolene - Dolly Parton | Banjo Lesson', channelTitle: 'Banjo Ben Clark', channelId: 'UCIDxRRdowWusv8-IO0lpVfg', publishedAt: '2025-01-01T00:00:00Z', description: 'Tab included' } },
      { id: { channelId: 'UCnotavideo' }, snippet: { title: 'A channel' } }
    ] });
    return fakeRes(404, 'nope', 'text/html');
  };
  const run = async (query) => {
    let code = 0, body = null;
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; }, status: c => { code = c; return res; }, json: b => { body = b; return res; }, end: () => res };
    await api({ method: 'GET', headers: { origin: 'https://yumyumtumtum.vercel.app', host: 'yumyumtumtum.vercel.app' }, query }, res);
    return { code, body, headers };
  };

  // no key: the app is told to explain the key, nothing breaks
  delete process.env.YOUTUBE_API_KEY;
  let r = await run({ inst: 'guitar' });
  ok(r.code === 200 && r.body.ok && r.body.needsKey === true && r.body.fullSearch === false && r.body.items.length === 0, 'no key and no feeds: ok with needsKey -> ' + J(r.body));
  ok(!calls.some(u => /googleapis/.test(u)), 'no key: YouTube\'s API is never called');
  r = await run({ op: 'search', q: 'jolene banjo' });
  ok(r.body.ok && r.body.needsKey === true && r.body.via === 'teachers', 'no key: search says it needs the key');
  r = await run({ op: 'search', q: '' });
  ok(r.code === 400 && !r.body.ok, 'empty search refused');

  // with a key
  process.env.YOUTUBE_API_KEY = 'test-key';
  calls.length = 0;
  r = await run({ inst: 'guitar' });
  const it = r.body.items || [];
  ok(r.body.ok && r.body.fullSearch === true && r.body.needsKey === false, 'with a key: full lessons');
  ok(it.length === 2 && it.every(x => x.channel === 'JustinGuitar'), 'with a key: private videos dropped -> ' + J(it.map(x => x.title)));
  const rf = it.find(x => x.id === 'ringFire001'), gc = it.find(x => x.id === 'gChord00001');
  ok(rf && rf.dur === 725 && rf.views === 81234 && !rf.short && rf.url === 'https://www.youtube.com/watch?v=ringFire001', 'with a key: length and views added -> ' + J(rf));
  ok(gc && gc.short && gc.url === 'https://www.youtube.com/shorts/gChord00001', 'with a key: 30-second video marked as a Short');
  ok(it[0].id === 'gChord00001', 'newest first');
  ok(!calls.some(u => /youtube\.com\/feeds\//.test(u)), 'with a key: the dead feeds aren\'t tried');
  const guitarChans = M.TEACHERS.filter(t => t.inst.includes('guitar')).length;
  ok(calls.filter(u => /playlistItems/.test(u)).length === guitarChans, 'only guitar teachers asked (' + guitarChans + ' channels, 1 quota unit each)');
  r = await run({ op: 'search', q: 'jolene banjo' });
  const s0 = (r.body.items || [])[0];
  ok(r.body.via === 'youtube' && r.body.items.length === 1 && s0.title === 'Jolene - Dolly Parton | Banjo Lesson' && J(s0.inst) === J(['banjo', 'guitar']) && s0.dur === 480, 'with a key: search all of YouTube, known teacher gets its instruments -> ' + J(s0));
  ok(calls.some(u => /search\?.*videoEmbeddable=true/.test(u) && /safeSearch=moderate/.test(u)), 'search asks only for videos that play inside the app');

  // YouTube says no (quota used up): falls back without breaking
  global.fetch = async (url) => fakeRes(403, { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } });
  r = await run({ op: 'search', q: 'jolene banjo', debug: '1' });
  ok(r.body.ok && Array.isArray(r.body.items) && r.body.report.some(x => /quotaExceeded/.test(String(x))), 'quota used up: still answers, says why in debug -> ' + J(r.body.report.slice(0, 2)));

  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
