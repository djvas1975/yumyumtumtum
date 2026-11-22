// YumYum's food holidays and seasons: when each one comes around, which saved recipes belong to it, and what to search
// for ideas. tools/sync_caption.py copies the marked part into tools/app.html; tests/holidays-yum.test.js tests it here.
// Dates: US rules (Super Bowl = 2nd Sunday of February since 2022, Memorial Day = last Monday of May, Labor Day = 1st
// Monday of September, Thanksgiving = 4th Thursday of November, Mother's Day = 2nd Sunday of May, Father's Day = 3rd
// Sunday of June), Easter by the Gregorian computus, Hanukkah's first night from the same table Artistry uses
// (crafts/holidays.js, checked Oct 1, 2026), Mexican Independence Day's Grito on the night of Sept 15.

/* ---- holidays: food holidays and seasons ---- */
const HOL_NTH = (y, m, wd, n) => {
  if (n < 0) { const d = new Date(y, m + 1, 0); return new Date(y, m, d.getDate() - ((d.getDay() - wd + 7) % 7)); }
  const d = new Date(y, m, 1); return new Date(y, m, 1 + ((wd - d.getDay() + 7) % 7) + 7 * (n - 1));
};
function holEaster(y){
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const HOL_HANUKKAH = {2025:[11, 14], 2026:[11, 4], 2027:[11, 24], 2028:[11, 12], 2029:[11, 1], 2030:[11, 20]};
// courses: [key, label, recipe category it should be (for the ideas), searches]
const HOLIDAYS = [
  {id:'newyear', name:'New Year’s', emoji:'🎆', a:'#4E5BD6', b:'#1C1E5A', date:y => new Date(y, 11, 31), days:2,
    kw:['new year', 'new years', 'nye', 'black eyed peas', 'hoppin john', 'champagne'],
    courses:[['apps', 'Party food', 'apps', ['party appetizers', 'dip', 'sliders']], ['main', 'Traditions', '', ['pozole', 'black eyed peas', 'menudo']], ['drinks', 'Drinks', 'drinks', ['champagne cocktail', 'party punch']]]},
  {id:'gameday', name:'Super Bowl', emoji:'🏈', a:'#3E8E4E', b:'#163A20', date:y => HOL_NTH(y, 1, 0, 2), days:1,
    kw:['super bowl', 'game day', 'gameday', 'tailgate', 'tailgating'],
    courses:[['apps', 'Snacks', 'apps', ['game day wings', 'game day dip', 'nachos', 'sliders']], ['main', 'Mains', 'main', ['chili', 'pulled pork']], ['desserts', 'Desserts', 'desserts', ['brownies', 'cookie bars']]]},
  {id:'valentines', name:'Valentine’s Day', emoji:'💘', a:'#E8507A', b:'#7A1438', date:y => new Date(y, 1, 14), days:1,
    kw:['valentine', 'valentines', 'galentine', 'galentines', 'date night'],
    courses:[['main', 'Dinner', 'main', ['steak dinner', 'date night dinner', 'shrimp pasta']], ['desserts', 'Desserts', 'desserts', ['chocolate dessert', 'chocolate covered strawberries', 'red velvet']], ['drinks', 'Drinks', 'drinks', ['valentines cocktail']]]},
  {id:'stpatricks', name:'St. Patrick’s Day', emoji:'☘️', a:'#3FA65A', b:'#145028', date:y => new Date(y, 2, 17), days:1,
    kw:['st patrick', 'st patricks', 'saint patrick', 'irish', 'corned beef', 'soda bread', 'shepherds pie', 'guinness', 'colcannon'],
    courses:[['main', 'Mains', 'main', ['corned beef', 'shepherds pie', 'irish stew']], ['sides', 'Sides', '', ['colcannon', 'irish soda bread']], ['desserts', 'Desserts', 'desserts', ['guinness chocolate cake']]]},
  {id:'easter', name:'Easter', emoji:'🐣', a:'#E9A6D8', b:'#7C4FA8', date:holEaster, days:1,
    kw:['easter', 'hot cross buns', 'resurrection rolls'],
    courses:[['main', 'Mains', 'main', ['easter ham', 'leg of lamb']], ['sides', 'Sides', '', ['deviled eggs', 'scalloped potatoes', 'dinner rolls']], ['breakfast', 'Brunch', 'breakfast', ['easter brunch', 'breakfast casserole']], ['desserts', 'Desserts', 'desserts', ['easter dessert', 'carrot cake']]]},
  {id:'cincodemayo', name:'Cinco de Mayo', emoji:'🪅', a:'#F2A33A', b:'#B0361C', date:y => new Date(y, 4, 5), days:1,
    kw:['cinco de mayo'],
    courses:[['main', 'Mains', 'main', ['tacos', 'enchiladas', 'carne asada']], ['apps', 'Starters', 'apps', ['guacamole', 'queso dip', 'salsa']], ['drinks', 'Drinks', 'drinks', ['margarita', 'agua fresca']], ['desserts', 'Desserts', 'desserts', ['churros', 'tres leches']]]},
  {id:'mothersday', name:'Mother’s Day', emoji:'💐', a:'#F28FAD', b:'#9C3A64', date:y => HOL_NTH(y, 4, 0, 2), days:1,
    kw:['mothers day', 'mother s day'],
    courses:[['breakfast', 'Brunch', 'breakfast', ['mothers day brunch', 'quiche', 'french toast']], ['desserts', 'Desserts', 'desserts', ['strawberry cake', 'lemon dessert']], ['drinks', 'Drinks', 'drinks', ['mimosa']]]},
  {id:'memorialday', name:'Memorial Day', emoji:'🇺🇸', a:'#3E6FC8', b:'#8E1B2B', date:y => HOL_NTH(y, 4, 1, -1), days:1,
    kw:['memorial day'],
    courses:[['main', 'Off the grill', 'main', ['burgers', 'bbq chicken', 'ribs']], ['sides', 'Sides', '', ['potato salad', 'pasta salad', 'baked beans']], ['desserts', 'Desserts', 'desserts', ['berry dessert']]]},
  {id:'fathersday', name:'Father’s Day', emoji:'🥩', a:'#4F86C6', b:'#1E3A5F', date:y => HOL_NTH(y, 5, 0, 3), days:1,
    kw:['fathers day', 'father s day'],
    courses:[['main', 'Mains', 'main', ['grilled steak', 'bbq ribs', 'smoked brisket']], ['sides', 'Sides', '', ['grilled corn', 'mac and cheese']], ['desserts', 'Desserts', 'desserts', ['peach cobbler']]]},
  {id:'july4', name:'Fourth of July', emoji:'🎇', a:'#3E6FC8', b:'#B3263A', date:y => new Date(y, 6, 4), days:1,
    kw:['4th of july', 'fourth of july', 'july 4th', 'independence day', 'red white and blue', 'patriotic'],
    courses:[['main', 'Off the grill', 'main', ['burgers', 'hot dogs', 'bbq']], ['sides', 'Sides', '', ['potato salad', 'coleslaw', 'corn on the cob']], ['desserts', 'Desserts', 'desserts', ['red white and blue dessert', 'strawberry shortcake']], ['drinks', 'Drinks', 'drinks', ['lemonade']]]},
  {id:'laborday', name:'Labor Day', emoji:'🍔', a:'#E0913A', b:'#7A3A14', date:y => HOL_NTH(y, 8, 1, 1), days:1,
    kw:['labor day'],
    courses:[['main', 'Off the grill', 'main', ['grilled chicken', 'bbq', 'burgers']], ['sides', 'Sides', '', ['corn salad', 'pasta salad']], ['desserts', 'Desserts', 'desserts', ['peach cobbler']]]},
  {id:'mexindependence', name:'Mexican Independence Day', emoji:'🇲🇽', a:'#3FA65A', b:'#B3263A', date:y => new Date(y, 8, 15), days:2,
    kw:['fiestas patrias', 'dia de la independencia', 'el grito', '16 de septiembre', 'chiles en nogada'],
    courses:[['main', 'Mains', 'main', ['pozole', 'chiles en nogada', 'enchiladas']], ['apps', 'Antojitos', 'apps', ['elote', 'tostadas']], ['drinks', 'Drinks', 'drinks', ['agua fresca', 'horchata']], ['desserts', 'Desserts', 'desserts', ['tres leches', 'flan']]]},
  {id:'halloween', name:'Halloween', emoji:'🎃', a:'#F28A2E', b:'#3A1F4F', date:y => new Date(y, 9, 31), days:1,
    kw:['halloween', 'spooky', 'jack o lantern', 'candy corn', 'mummy', 'mummies', 'witch', 'witches', 'monster', 'trick or treat'],
    courses:[['apps', 'Party food', 'apps', ['halloween appetizers', 'halloween party food']], ['main', 'Dinner', 'main', ['halloween dinner', 'chili']], ['desserts', 'Treats', 'desserts', ['halloween treats', 'halloween cookies']], ['drinks', 'Drinks', 'drinks', ['halloween punch']]]},
  {id:'muertos', name:'Día de los Muertos', emoji:'💀', a:'#F2A33A', b:'#7A1E6A', date:y => new Date(y, 10, 1), days:2,
    kw:['dia de los muertos', 'dia de muertos', 'day of the dead', 'pan de muerto', 'calavera', 'calaveras'],
    courses:[['desserts', 'Pan & sweets', '', ['pan de muerto', 'sugar skull cookies']], ['main', 'Mains', 'main', ['mole', 'tamales']], ['drinks', 'Drinks', 'drinks', ['champurrado', 'atole']]]},
  {id:'thanksgiving', name:'Thanksgiving', emoji:'🦃', a:'#E8963B', b:'#8A3A14', date:y => HOL_NTH(y, 10, 4, 4), days:1,
    kw:['thanksgiving', 'friendsgiving', 'roast turkey', 'turkey breast', 'whole turkey', 'smoked turkey', 'turkey gravy', 'leftover turkey', 'stuffing', 'cornbread dressing', 'cranberry sauce', 'pumpkin pie', 'pecan pie', 'sweet potato casserole', 'green bean casserole', 'candied yams'],
    courses:[['main', 'Turkey & mains', 'main', ['thanksgiving turkey', 'turkey breast', 'holiday ham']], ['sides', 'Sides', '', ['stuffing', 'mashed potatoes', 'green bean casserole', 'sweet potato casserole']], ['desserts', 'Pies & desserts', 'desserts', ['pumpkin pie', 'pecan pie', 'apple pie']], ['leftovers', 'Leftovers', '', ['leftover turkey']]]},
  {id:'hanukkah', name:'Hanukkah', emoji:'🕎', a:'#4F86D6', b:'#1C2E6A', date:y => HOL_HANUKKAH[y] ? new Date(y, HOL_HANUKKAH[y][0], HOL_HANUKKAH[y][1]) : null, days:8,
    kw:['hanukkah', 'chanukah', 'latkes', 'sufganiyot', 'rugelach'],
    courses:[['main', 'Mains', 'main', ['brisket']], ['sides', 'Latkes & sides', '', ['latkes']], ['desserts', 'Desserts', 'desserts', ['sufganiyot', 'rugelach']]]},
  {id:'christmas', name:'Christmas', emoji:'🎄', a:'#3FA65A', b:'#8E1B1B', date:y => new Date(y, 11, 24), days:2,
    kw:['christmas', 'xmas', 'nochebuena', 'noche buena', 'navidad', 'prime rib', 'holiday ham', 'gingerbread', 'eggnog', 'ponche', 'bunuelos', 'buñuelos', 'yule log', 'candy cane'],
    courses:[['main', 'Mains', 'main', ['prime rib', 'christmas ham', 'tamales']], ['sides', 'Sides', '', ['holiday side dish', 'scalloped potatoes', 'dinner rolls']], ['desserts', 'Cookies & desserts', 'desserts', ['christmas cookies', 'bunuelos', 'gingerbread']], ['drinks', 'Drinks', 'drinks', ['ponche navideno', 'eggnog', 'champurrado']], ['breakfast', 'Christmas morning', 'breakfast', ['christmas breakfast casserole', 'cinnamon rolls']]]}
];
// seasons start on these days (month 0-11, day) and last until the next one starts
const HOL_SEASONS = [
  {id:'spring', name:'Spring', emoji:'🌷', a:'#7CC46A', b:'#2C7A3E', start:[2, 20], kw:['spring', 'asparagus', 'strawberry', 'strawberries', 'lemon', 'peas', 'rhubarb'],
    courses:[['all', 'Spring', '', ['asparagus', 'strawberry dessert', 'lemon chicken', 'spring salad']]]},
  {id:'summer', name:'Summer', emoji:'☀️', a:'#F7B733', b:'#D0561C', start:[5, 21], kw:['summer', 'grilled', 'grill', 'bbq', 'no bake', 'watermelon', 'popsicle', 'popsicles', 'corn on the cob', 'peach', 'peaches', 'zucchini', 'agua fresca'],
    courses:[['all', 'Summer', '', ['grilled chicken', 'no bake dessert', 'summer salad', 'grilled corn']]]},
  {id:'fall', name:'Fall', emoji:'🍂', a:'#E0913A', b:'#8A3A14', start:[8, 22], kw:['fall', 'autumn', 'pumpkin', 'apple', 'apples', 'butternut', 'squash', 'maple', 'cinnamon', 'pot roast', 'chili', 'cider', 'pecan'],
    courses:[['all', 'Fall', '', ['pumpkin', 'apple dessert', 'butternut squash', 'pot roast']]]},
  {id:'winter', name:'Winter', emoji:'❄️', a:'#6FA8DC', b:'#1E3A6A', start:[11, 21], kw:['winter', 'soup', 'stew', 'chili', 'pozole', 'menudo', 'pot pie', 'hot chocolate', 'hot cocoa', 'casserole', 'slow cooker', 'crock pot', 'champurrado', 'caldo'],
    courses:[['all', 'Winter', '', ['soup', 'chili', 'stew', 'pot pie']]]}
];
const holById = id => HOLIDAYS.find(h => h.id === id) || HOL_SEASONS.find(s => s.id === id) || null;
const holDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// the next time it comes around: {start, end, days} (days = 0 while it's on), or null when there's no date for it
function holNext(h, now){
  const today = holDay(now || new Date());
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) {
    const s = h.date(y); if (!s) continue;
    const end = new Date(s.getFullYear(), s.getMonth(), s.getDate() + (h.days || 1) - 1);
    if (end >= today) return {start:s, end:end, days:Math.max(0, Math.round((holDay(s) - today) / 864e5))};
  }
  return null;
}
// the season it is now, and the day the next one starts
function holSeason(now){
  const t = holDay(now || new Date()), y = t.getFullYear();
  const starts = [];
  for (let k = y - 1; k <= y + 1; k++) HOL_SEASONS.forEach(s => starts.push({s:s, d:new Date(k, s.start[0], s.start[1])}));
  starts.sort((a, b) => a.d - b.d);
  let i = starts.length - 1; while (i > 0 && starts[i].d > t) i--;
  return {season:starts[i].s, until:new Date(starts[i + 1].d.getFullYear(), starts[i + 1].d.getMonth(), starts[i + 1].d.getDate() - 1), next:starts[i + 1].s};
}
// holidays coming up within `within` days (today and ones going on now count), soonest first
function holUpcoming(now, within){
  return HOLIDAYS.map(h => ({h:h, n:holNext(h, now)})).filter(x => x.n && x.n.days <= (within == null ? 45 : within)).sort((a, b) => a.n.start - b.n.start);
}
// "Today", "Tomorrow", "Thursday", "In 12 days"
function holWhen(n, now){
  if (!n) return '';
  if (n.days === 0) return holDay(now || new Date()) > holDay(n.start) ? 'Going on now' : 'Today';
  if (n.days === 1) return 'Tomorrow';
  if (n.days < 7) return n.start.toLocaleDateString('en-US', {weekday:'long'});
  return 'In ' + n.days + ' days';
}
function holText(r){
  return (' ' + [r.title, (r.tags || []).join(' ')].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ') + ' ');
}
const holKw = k => ' ' + k.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
// does a saved recipe belong to this holiday or season? (saved from that holiday's ideas (r.hols), or its name or tags say so)
function holMatch(r, h){
  if (Array.isArray(r.hols) && r.hols.indexOf(h.id) >= 0) return true;
  const T = holText(r);
  return h.kw.some(k => { const w = holKw(k); return T.indexOf(w) >= 0 || T.indexOf(w.replace(/ $/, 's ')) >= 0; });
}
// searches for a holiday's ideas: one from each course for All, else that course's
function holQueries(h, course){
  const c = h.courses.find(x => x[0] === course) || (h.courses.length === 1 ? h.courses[0] : null);
  if (c) return c[3].slice(0, 4);
  return h.courses.map(x => x[3][0]).concat(h.courses.length < 3 ? h.courses.map(x => x[3][1]).filter(Boolean) : []).slice(0, 4);
}
/* ---- end holidays ---- */

if (typeof module !== 'undefined') module.exports = { HOLIDAYS, HOL_SEASONS, holById, holNext, holSeason, holUpcoming, holWhen, holMatch, holQueries, holEaster, HOL_NTH };
