/* Artistry holidays: which holiday or season a project is for, and how many days until it comes around.
   Used by the app (crafts/index.html loads this file) and by the tests (node tests/holidays.test.js).
   Dates: fixed ones, US rules (Mother's Day = 2nd Sunday of May, Father's Day = 3rd Sunday of June,
   Thanksgiving = 4th Thursday of November), Easter by the Gregorian computus, and Hanukkah's first candle from
   Wikipedia's table (checked Oct 1, 2026: 2026 Dec 4, 2027 Dec 24, 2028 Dec 12, 2029 Dec 1, 2030 Dec 20). */
(function (root) {
  'use strict';

  const nthWeekday = (y, m, wd, n) => { const d = new Date(y, m, 1); const off = (wd - d.getDay() + 7) % 7; return new Date(y, m, 1 + off + 7 * (n - 1)); };
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const HANUKKAH = { 2025: [11, 14], 2026: [11, 4], 2027: [11, 24], 2028: [11, 12], 2029: [11, 1], 2030: [11, 20] };

  // kw: words that point to the holiday. weak words only count with a second hint (pumpkin alone is fall, not Halloween).
  const HOLIDAYS = [
    { id: 'newyear', name: 'New Year’s', emoji: '🎆', date: y => new Date(y, 0, 1), kw: ['new year', 'new years', 'new year’s', 'nye', 'new years eve', 'happy new year'] },
    { id: 'valentines', name: 'Valentine’s Day', emoji: '💘', date: y => new Date(y, 1, 14), kw: ['valentine', 'valentines', 'galentine', 'galentines', 'be mine', 'cupid'], weak: ['heart', 'xoxo', 'pink and red'] },
    { id: 'stpatricks', name: 'St. Patrick’s Day', emoji: '☘️', date: y => new Date(y, 2, 17), kw: ['st patrick', 'st patricks', 'saint patrick', 'st paddy', 'st paddys', 'shamrock', 'shamrocks', 'leprechaun', 'pot of gold'], weak: ['irish', 'lucky'] },
    { id: 'easter', name: 'Easter', emoji: '🐣', date: easter, kw: ['easter', 'easter egg', 'easter eggs', 'easter bunny', 'he is risen'], weak: ['bunny', 'chick', 'egg', 'pastel'] },
    { id: 'cincodemayo', name: 'Cinco de Mayo', emoji: '🪅', date: y => new Date(y, 4, 5), kw: ['cinco de mayo', 'fiesta'], weak: ['pinata', 'piñata', 'papel picado', 'serape'] },
    { id: 'mothersday', name: 'Mother’s Day', emoji: '💐', date: y => nthWeekday(y, 4, 0, 2), kw: ['mothers day', 'mother’s day', 'mother s day', 'mom gift', 'gift for mom', 'for mom'] },
    { id: 'fathersday', name: 'Father’s Day', emoji: '👔', date: y => nthWeekday(y, 5, 0, 3), kw: ['fathers day', 'father’s day', 'father s day', 'dad gift', 'gift for dad', 'for dad'] },
    { id: 'july4', name: 'Fourth of July', emoji: '🎇', date: y => new Date(y, 6, 4), kw: ['4th of july', 'fourth of july', 'july 4th', 'july 4', 'independence day', 'red white and blue', 'patriotic', 'memorial day', 'veterans day'], weak: ['america', 'american flag', 'usa', 'stars and stripes'] },
    { id: 'backtoschool', name: 'Back to school', emoji: '🎒', date: y => new Date(y, 7, 15), kw: ['back to school', 'first day of school', 'teacher gift', 'teacher appreciation', 'classroom decor'] },
    { id: 'halloween', name: 'Halloween', emoji: '🎃', date: y => new Date(y, 9, 31), kw: ['halloween', 'spooky', 'spooky season', 'jack o lantern', 'jack o lanterns', 'jackolantern', 'trick or treat', 'haunted', 'witch', 'witches', 'ghost', 'ghosts', 'skeleton', 'skeletons', 'candy corn', 'boo', 'creepy', 'mummy', 'zombie', 'vampire', 'frankenstein', 'cauldron'], weak: ['bat', 'spider', 'black cat', 'pumpkin', 'skull'] },
    { id: 'diadelosmuertos', name: 'Día de los Muertos', emoji: '💀', date: y => new Date(y, 10, 1), kw: ['dia de los muertos', 'día de los muertos', 'dia de muertos', 'día de muertos', 'day of the dead', 'sugar skull', 'sugar skulls', 'calavera', 'calaveras', 'catrina', 'ofrenda', 'cempasuchil', 'cempasúchil'], weak: ['marigold', 'skull'] },
    { id: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', date: y => nthWeekday(y, 10, 4, 4), kw: ['thanksgiving', 'turkey', 'friendsgiving', 'thankful', 'gratitude tree', 'pilgrim'], weak: ['harvest', 'cornucopia'] },
    { id: 'hanukkah', name: 'Hanukkah', emoji: '🕎', date: y => HANUKKAH[y] ? new Date(y, HANUKKAH[y][0], HANUKKAH[y][1]) : null, kw: ['hanukkah', 'chanukah', 'menorah', 'dreidel', 'star of david'] },
    { id: 'christmas', name: 'Christmas', emoji: '🎄', date: y => new Date(y, 11, 25), kw: ['christmas', 'xmas', 'santa', 'santa claus', 'ornament', 'ornaments', 'christmas tree', 'gingerbread', 'reindeer', 'rudolph', 'elf on the shelf', 'nativity', 'advent', 'stocking', 'stockings', 'nutcracker', 'grinch', 'candy cane', 'candy canes', 'mistletoe', 'poinsettia', 'holiday gift', 'noel', 'feliz navidad'], weak: ['snowman', 'gnome', 'elf', 'jingle', 'holly', 'wreath'] },
    { id: 'kwanzaa', name: 'Kwanzaa', emoji: '🕯️', date: y => new Date(y, 11, 26), kw: ['kwanzaa', 'kinara'] }
  ];
  // celebrations that aren't on the calendar
  const PARTIES = [
    { id: 'birthday', name: 'Birthdays & parties', emoji: '🎂', kw: ['birthday', 'bday', 'birthday party', 'party decor', 'party favors', 'party favor', 'cake topper', 'balloon garland'] },
    { id: 'wedding', name: 'Weddings & showers', emoji: '💍', kw: ['wedding', 'bridal shower', 'bridal', 'baby shower', 'gender reveal', 'bachelorette', 'anniversary', 'quinceanera', 'quinceañera'] },
    { id: 'graduation', name: 'Graduation', emoji: '🎓', kw: ['graduation', 'grad party', 'grad cap', 'senior night', 'graduate'] }
  ];
  const SEASONS = [
    { id: 'spring', name: 'Spring', emoji: '🌷', start: [2, 20], kw: ['spring', 'springtime', 'tulip', 'tulips', 'cherry blossom'] },
    { id: 'summer', name: 'Summer', emoji: '☀️', start: [5, 21], kw: ['summer', 'summertime', 'beach', 'seashell', 'seashells', 'sunflower', 'sunflowers', 'watermelon', 'pool party'] },
    { id: 'fall', name: 'Fall', emoji: '🍂', start: [8, 22], kw: ['fall', 'autumn', 'fall decor', 'pumpkin', 'pumpkins', 'leaves', 'harvest', 'scarecrow', 'acorn', 'acorns', 'pumpkin spice', 'gourd', 'gourds', 'hayride'] },
    { id: 'winter', name: 'Winter', emoji: '❄️', start: [11, 21], kw: ['winter', 'snow', 'snowflake', 'snowflakes', 'snowman', 'snowmen', 'frosty', 'mittens', 'hot cocoa', 'icicle'] }
  ];
  const ALL = HOLIDAYS.concat(PARTIES, SEASONS);
  const byId = id => ALL.find(h => h.id === id) || null;

  function prep(text) {
    const lower = String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '');
    return ' ' + lower.replace(/#/g, ' ').replace(/[^a-z0-9]+/g, ' ') + ' ';
  }
  const kprep = k => prep(k).trim();
  const has = (T, k) => { const w = kprep(k); return T.includes(' ' + w + ' ') || T.includes(' ' + w + 's '); };
  // hashtags glued together (#halloweencrafts, #christmasdecor) count too
  const tagHas = (tags, k) => { const w = kprep(k).replace(/ /g, ''); return w.length >= 5 && tags.some(t => t.startsWith(w)); };

  // Which holidays (and celebrations, seasons) a project's words point to, best first.
  function detect(text) {
    const T = prep(text);
    const tags = (String(text || '').toLowerCase().match(/#[a-z0-9_]+/g) || []).map(t => t.slice(1).replace(/_/g, ''));
    const out = [];
    for (const h of ALL) {
      let s = 0;
      for (const k of h.kw) if (has(T, k) || tagHas(tags, k)) s += kprep(k).includes(' ') ? 3 : 2;
      let weak = 0;
      for (const k of h.weak || []) if (has(T, k)) weak++;
      if (s) s += weak; else if (weak >= 2) s = weak;
      if (s >= 2) out.push({ id: h.id, s });
    }
    // holidays first, then celebrations, then seasons (Halloween before Fall, Christmas before Winter); all stay
    out.sort((a, b) => kindRank(a.id) - kindRank(b.id) || b.s - a.s);
    return out.map(x => x.id);
  }
  const kindRank = id => HOLIDAYS.some(h => h.id === id) ? 0 : PARTIES.some(h => h.id === id) ? 1 : 2;

  // The next time a holiday comes around (today counts), or null if it has no date.
  function next(id, now) {
    const h = HOLIDAYS.find(x => x.id === id);
    if (!h) return null;
    now = now || new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
      const d = h.date(y);
      if (d && d >= today) return d;
    }
    return null;
  }
  function daysUntil(id, now) {
    const d = next(id, now);
    if (!d) return null;
    now = now || new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((d - today) / 864e5);
  }
  // Holidays coming up within `within` days, soonest first: [{ id, name, emoji, days, date }]
  function upcoming(now, within) {
    within = within || 75;
    return HOLIDAYS.map(h => ({ h, days: daysUntil(h.id, now), date: next(h.id, now) }))
      .filter(x => x.days != null && x.days <= within)
      .sort((a, b) => a.days - b.days)
      .map(x => ({ id: x.h.id, name: x.h.name, emoji: x.h.emoji, days: x.days, date: x.date }));
  }
  function seasonOf(now) {
    now = now || new Date();
    const md = now.getMonth() * 100 + now.getDate();
    let cur = SEASONS[3];
    for (const s of SEASONS) if (md >= s.start[0] * 100 + s.start[1]) cur = s;
    return cur.id;
  }
  function countdown(days) {
    if (days == null) return '';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 14) return days + ' days';
    if (days < 60) return Math.round(days / 7) + ' weeks';
    return Math.round(days / 30.4) + ' months';
  }
  const label = id => (byId(id) || { name: id }).name;
  const emoji = id => (byId(id) || { emoji: '🎉' }).emoji;

  const API = { HOLIDAYS, PARTIES, SEASONS, ALL, byId, detect, next, daysUntil, upcoming, seasonOf, countdown, label, emoji, easter, prep };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Holidays = API;
})(this);
