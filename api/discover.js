// yumyumtumtum recipe discovery.
// GET /api/discover?q=<words>   ->  recipes from free recipe sites that match
// GET /api/discover             ->  the newest recipes from those sites
// (temporary) GET /api/discover?peek=<url>&find=<text>  ->  how one of those sites answers, for testing

const { cors, badUrl, fetchText } = require('../lib/parse');

const PEEK_HOSTS = /(^|\.)(delish|foodnetwork|food|allrecipes|simplyrecipes|seriouseats|eatingwell|tasteofhome|thepioneerwoman|tasty|bbcgoodfood|epicurious|budgetbytes|pinchofyum|recipetineats|sallysbakingaddiction|natashaskitchen|spendwithpennies|therecipecritic|tastesbetterfromscratch|onceuponachef|gimmesomeoven|damndelicious|isabeleats|thewoksoflife|justonecookbook|myrecipes|southernliving|foodandwine|bonappetit|tasteatlas|cookieandkate|minimalistbaker|halfbakedharvest|themediterraneandish|cafedelites|dinneratthezoo|iheartnaptime|lecremedelacrumb|mexicanplease|hot-thai-kitchen|hotthaikitchen|maangchi|indianhealthyrecipes|pillsbury|bettycrocker|tablespoon|kraftheinz|myfoodandfamily|mccormick|campbells|goodhousekeeping|countryliving|womansday)\.(com|co|co\.uk|net)$/i;

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const q = req.query || {};
  if (q.peek) return peek(String(q.peek), String(q.find || ''), res);
  res.status(200).json({ ok: false, error: 'Not ready yet.' });
};

async function peek(url, find, res) {
  const bad = badUrl(url);
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
  if (bad || !PEEK_HOSTS.test(host)) { res.status(400).json({ ok: false, error: 'Not a recipe site on the test list.' }); return; }
  const trace = [];
  const t0 = Date.now();
  try {
    const r = await fetchText(url, { trace, headers: /json|wp-json|api/i.test(url) ? { Accept: 'application/json,*/*' } : {} });
    const text = r.text;
    const out = { ok: true, ms: Date.now() - t0, finalUrl: r.finalUrl, length: text.length, trace, head: text.slice(0, 1200) };
    if (find) {
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const hits = [];
      let m;
      while ((m = re.exec(text)) && hits.length < 6) { hits.push(text.slice(Math.max(0, m.index - 250), m.index + 450)); re.lastIndex = m.index + 700; }
      out.count = (text.match(re) || []).length;
      out.hits = hits;
    }
    res.status(200).json(out);
  } catch (e) {
    res.status(200).json({ ok: false, ms: Date.now() - t0, error: e.message, trace });
  }
}
