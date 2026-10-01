// Brush & Glue "Learn music": free lesson videos for piano, guitar, drums, ukulele, banjo, trumpet and more.
//
// GET /api/music?inst=guitar,ukulele        ->  the newest lessons from free teacher channels on YouTube for those instruments
// GET /api/music?op=search&q=my+girl+guitar ->  lessons for a song or topic. With a YOUTUBE_API_KEY (Vercel setting) this
//                                               searches all of YouTube (YouTube Data API v3, free quota); without one it
//                                               searches the teacher channels' recent uploads.
// GET /api/music?op=resolve&h=JustinGuitar,Pianote&debug=1  ->  (setup only) channel ids for @handles
// Options: n= (items), debug=1.
//
// Teacher channels are read through YouTube's public RSS feeds (youtube.com/feeds/videos.xml), which list each
// channel's 15 newest uploads with title, thumbnail, views and description. No key or account needed.
// Each item: { id, title, channel, channelId, inst:[...], published, views, thumb, short, url, desc, dur }

const { cors, fetchText, decode, clean } = require('../lib/parse');

const enc = encodeURIComponent;

// Free lesson channels. inst = what each mostly teaches. Ids checked on Sept 30, 2026 (see CLAUDE.md).
const CHANNELS = [
  // filled in from op=resolve; see below
];

// handles checked with op=resolve when picking the channels above
const CANDIDATES = ['JustinGuitar', 'MartyMusic', 'AndyGuitar', 'GuitarZero2Hero', 'PaulDavids', 'PianoVideoLessons', 'LisaWitt', 'SheetMusicBoss', '180drums', 'BernadetteTeachesMusic', 'TheUkuleleTeacher', 'cynthialinmusic', 'UkuleleUnderground', 'FreeBanjoLessons', 'TrumpetHeroes', 'TrumpetHeadquarters', 'TRUMPETSIZZLE', 'TheTrumpetProf', 'LouisDowdeswell', 'pianote', 'PianoteOfficial', 'drumeo', 'DrumeoOfficial', 'stephentaylordrums', 'banjobenclark', 'BanjoBen', 'billhilton', 'BillHiltonPianoLessons', 'laurenbateman', 'ChristopherBillTrumpet', 'deeringbanjos', 'RockschoolLondon', 'MusicTheoryGuy'];

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const qp = req.query || {};
  const debug = !!qp.debug;
  const op = String(qp.op || 'feeds');
  try {
    if (op === 'resolve') {
      const handles = (qp.h ? String(qp.h).split(',') : CANDIDATES).map(s => s.trim().replace(/^@/, '')).filter(Boolean).slice(0, 40);
      const out = await Promise.all(handles.map(resolveHandle));
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true, channels: out });
      return;
    }
    if (op === 'search') {
      const q = clean(String(qp.q || '')).slice(0, 100);
      if (!q) { res.status(400).json({ ok: false, error: 'Type a song or lesson to look for.' }); return; }
      const n = Math.max(1, Math.min(25, parseInt(qp.n, 10) || 12));
      const report = debug ? [] : null;
      let items = [], via = 'teachers';
      if (process.env.YOUTUBE_API_KEY) {
        try { items = await ytSearch(q, n, report); via = 'youtube'; }
        catch (e) { if (report) report.push('youtube search failed: ' + e.message); }
      }
      if (!items.length) {
        const all = await feeds(CHANNELS, report);
        items = matchWords(all, q).slice(0, n);
        via = 'teachers';
      }
      res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=21600, stale-while-revalidate=86400');
      res.status(200).json({ ok: true, q, via, fullSearch: !!process.env.YOUTUBE_API_KEY, items, report: report || undefined });
      return;
    }
    // feeds: newest lessons for the chosen instruments
    const want = String(qp.inst || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const chans = CHANNELS.filter(c => !want.length || c.inst.some(i => want.includes(i)) || (qp.ch && String(qp.ch).split(',').includes(c.id)));
    const report = debug ? [] : null;
    const items = await feeds(chans, report);
    const n = Math.max(1, Math.min(300, parseInt(qp.n, 10) || 150));
    items.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    res.setHeader('Cache-Control', debug ? 'no-store' : 's-maxage=10800, stale-while-revalidate=86400');
    res.status(200).json({ ok: true, inst: want, fullSearch: !!process.env.YOUTUBE_API_KEY, items: items.slice(0, n), report: report || undefined });
  } catch (e) {
    res.status(200).json({ ok: false, error: (e && e.message) || 'Couldn’t get lessons right now.' });
  }
};

/* ---------- teacher channels (public RSS feeds) ---------- */
async function feeds(chans, report) {
  const lists = await Promise.all(chans.map(async c => {
    const t0 = Date.now();
    try {
      const { text } = await withTimeout(fetchText('https://www.youtube.com/feeds/videos.xml?channel_id=' + c.id, { headers: { Accept: 'application/atom+xml,application/xml,text/xml' } }), 8000);
      const items = parseFeed(text, c);
      if (report) report.push({ ch: c.name, id: c.id, ms: Date.now() - t0, count: items.length, newest: items[0] ? items[0].title + ' (' + (items[0].published || '').slice(0, 10) + ')' : '' });
      return items;
    } catch (e) {
      if (report) report.push({ ch: c.name, id: c.id, ms: Date.now() - t0, count: 0, error: e.message });
      return [];
    }
  }));
  return [].concat(...lists);
}
function parseFeed(xml, c) {
  const out = [];
  const feedName = decode((xml.match(/<author>\s*<name>([^<]*)<\/name>/) || [])[1] || '') || c.name;
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml))) {
    const e = m[1];
    const id = (e.match(/<yt:videoId>([\w-]{6,})<\/yt:videoId>/) || [])[1];
    if (!id) continue;
    const link = (e.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/) || [])[1] || '';
    const title = clean(decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''));
    const desc = clean(decode((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '')).slice(0, 400);
    const views = parseInt((e.match(/<media:statistics[^>]*views="(\d+)"/) || [])[1], 10) || 0;
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    const short = /\/shorts\//.test(link);
    out.push({
      id, title, channel: c.name || feedName, channelId: c.id, inst: c.inst, published, views,
      thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg', short,
      url: short ? 'https://www.youtube.com/shorts/' + id : 'https://www.youtube.com/watch?v=' + id, desc, dur: 0
    });
  }
  return out;
}
const STOP = new Set(['how', 'to', 'play', 'the', 'a', 'an', 'on', 'for', 'and', 'of', 'in', 'lesson', 'lessons', 'tutorial', 'easy', 'beginner', 'beginners', 'song', 'songs', 'by', 'with']);
function matchWords(items, q) {
  const words = q.toLowerCase().split(/[^a-z0-9']+/).filter(w => w.length > 1 && !STOP.has(w));
  if (!words.length) return [];
  return items.map(it => {
    const hay = (it.title + ' ' + it.desc + ' ' + it.channel + ' ' + it.inst.join(' ')).toLowerCase();
    const hits = words.filter(w => hay.includes(w)).length;
    const inTitle = words.filter(w => it.title.toLowerCase().includes(w)).length;
    return { it, s: hits + inTitle };
  }).filter(x => x.s >= Math.min(words.length, 2)).sort((a, b) => b.s - a.s || b.it.views - a.it.views).map(x => x.it);
}

/* ---------- all of YouTube (only with a free YouTube Data API key in Vercel's settings) ---------- */
async function ytSearch(q, n, report) {
  const key = process.env.YOUTUBE_API_KEY;
  const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&relevanceLanguage=en&maxResults=' + n + '&q=' + enc(q) + '&key=' + enc(key);
  const j = await getJson(url);
  if (j.error) throw new Error((j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || j.error.message || 'YouTube said no');
  const ids = (j.items || []).map(x => x.id && x.id.videoId).filter(Boolean);
  if (report) report.push('youtube search: ' + ids.length + ' videos');
  let details = {};
  if (ids.length) {
    try {
      const d = await getJson('https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=' + ids.join(',') + '&key=' + enc(key));
      for (const v of d.items || []) details[v.id] = { dur: isoSecs(v.contentDetails && v.contentDetails.duration), views: parseInt(v.statistics && v.statistics.viewCount, 10) || 0 };
    } catch (e) { if (report) report.push('details failed: ' + e.message); }
  }
  return (j.items || []).filter(x => x.id && x.id.videoId).map(x => {
    const s = x.snippet || {}, id = x.id.videoId, d = details[id] || {};
    return {
      id, title: clean(decode(s.title || '')), channel: clean(decode(s.channelTitle || '')), channelId: s.channelId || '', inst: [],
      published: s.publishedAt || '', views: d.views || 0, thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
      short: d.dur > 0 && d.dur <= 60, url: 'https://www.youtube.com/watch?v=' + id, desc: clean(decode(s.description || '')).slice(0, 400), dur: d.dur || 0
    };
  });
}
async function getJson(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    return await r.json();
  } finally { clearTimeout(t); }
}
function isoSecs(v) {
  const m = String(v || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

/* ---------- setup helper: a channel's id from its @handle ---------- */
async function resolveHandle(h) {
  try {
    const { text } = await withTimeout(fetchText('https://www.youtube.com/@' + enc(h)), 9000);
    const id = (text.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/) || text.match(/youtube\.com\/channel\/(UC[\w-]{22})/) || text.match(/itemprop="(?:identifier|channelId)"\s+content="(UC[\w-]{22})"/) || text.match(/"browseId"\s*:\s*"(UC[\w-]{22})"/) || text.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/) || text.match(/\b(UC[\w-]{22})\b/) || [])[1] || '';
    const name = decode((text.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '');
    const subs = ((text.match(/"subscriberCountText":\{[^}]*?"simpleText":"([^"]+)"/) || text.match(/([\d.]+[KM]?) subscribers/) || [])[1]) || '';
    let feed = 0;
    if (id) { try { const f = await withTimeout(fetchText('https://www.youtube.com/feeds/videos.xml?channel_id=' + id), 8000); feed = (f.text.match(/<entry>/g) || []).length; } catch (e) { feed = -1; } }
    return { h, id, name, feed, len: text.length };
  } catch (e) { return { h, id: '', error: e.message }; }
}

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Took too long.')), ms); })]).finally(() => clearTimeout(t));
}

module.exports.CHANNELS = CHANNELS;
module.exports.parseFeed = parseFeed;
module.exports.matchWords = matchWords;
module.exports.isoSecs = isoSecs;
