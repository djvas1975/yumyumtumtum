// Offline tests for YumYum's food holidays and seasons (lib/holidays.js): dates, countdowns, what's coming up, which
// saved recipes belong to a holiday, and the searches for ideas.
const path = require('path');
const H = require(path.join(__dirname, '..', 'lib', 'holidays.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const ymd = d => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : 'none';
const day = (y, m, d) => new Date(y, m - 1, d, 9, 30);
const at = id => H.holById(id);

// dates (checked against published calendars)
ok(ymd(at('thanksgiving').date(2026)) === '2026-11-26' && ymd(at('thanksgiving').date(2027)) === '2027-11-25', 'Thanksgiving: Nov 26, 2026 and Nov 25, 2027');
ok(ymd(at('gameday').date(2027)) === '2027-02-14' && ymd(at('gameday').date(2026)) === '2026-02-08', 'Super Bowl Sunday: 2nd Sunday of February (Feb 8, 2026; Feb 14, 2027)');
ok(ymd(at('easter').date(2026)) === '2026-04-05' && ymd(at('easter').date(2027)) === '2027-03-28', 'Easter: Apr 5, 2026 and Mar 28, 2027');
ok(ymd(at('memorialday').date(2026)) === '2026-05-25' && ymd(at('memorialday').date(2027)) === '2027-05-31', 'Memorial Day: last Monday of May');
ok(ymd(at('laborday').date(2026)) === '2026-09-07' && ymd(at('mothersday').date(2027)) === '2027-05-09' && ymd(at('fathersday').date(2027)) === '2027-06-20', 'Labor Day, Mother\'s Day, Father\'s Day');
ok(ymd(at('hanukkah').date(2026)) === '2026-12-04' && at('hanukkah').date(2031) === null, 'Hanukkah from the table (Dec 4, 2026); none past 2030');

// countdowns
const nov21 = day(2026, 11, 21);
const tg = H.holNext(at('thanksgiving'), nov21);
ok(tg.days === 5 && H.holWhen(tg, nov21) === 'Thursday', 'Nov 21, 2026: Thanksgiving is in 5 days, shown as "Thursday" -> ' + H.holWhen(tg, nov21));
ok(H.holWhen(H.holNext(at('thanksgiving'), day(2026, 11, 26)), day(2026, 11, 26)) === 'Today' && H.holWhen(H.holNext(at('thanksgiving'), day(2026, 11, 25)), day(2026, 11, 25)) === 'Tomorrow', 'Today and Tomorrow');
const xm = H.holNext(at('christmas'), day(2026, 12, 25));
ok(xm.days === 0 && H.holWhen(xm, day(2026, 12, 25)) === 'Going on now', 'Christmas Day (Eve and Day): "Going on now"');
ok(H.holNext(at('thanksgiving'), day(2026, 11, 27)).start.getFullYear() === 2027, 'the day after Thanksgiving, the next one is 2027');
const ny = H.holNext(at('newyear'), day(2027, 1, 1));
ok(ny && ny.days === 0 && ymd(ny.start) === '2026-12-31', 'Jan 1: New Year\'s (Dec 31 and Jan 1) is still on');
const up = H.holUpcoming(nov21).map(x => x.h.id);
ok(up.join() === 'thanksgiving,hanukkah,christmas,newyear', 'coming up within 45 days of Nov 21: ' + up.join(', '));
ok(H.holUpcoming(day(2026, 8, 1)).length === 0 || H.holUpcoming(day(2026, 8, 1)).every(x => x.n.days <= 45), 'nothing more than 45 days out');

// seasons
const s1 = H.holSeason(nov21);
ok(s1.season.id === 'fall' && ymd(s1.until) === '2026-12-20' && s1.next.id === 'winter', 'Nov 21: fall, until Dec 20, then winter');
ok(H.holSeason(day(2027, 1, 15)).season.id === 'winter' && H.holSeason(day(2026, 7, 4)).season.id === 'summer', 'January is winter, July is summer');

// which saved recipes belong
const r = (title, tags, hols) => ({ title, tags: tags || [], hols });
ok(H.holMatch(r('Easy Roast Turkey Breast'), at('thanksgiving')) && H.holMatch(r('Classic Pumpkin Pie'), at('thanksgiving')) && H.holMatch(r('Sausage Stuffing'), at('thanksgiving')), 'turkey breast, pumpkin pie, stuffing are Thanksgiving');
ok(!H.holMatch(r('Ground Turkey Tacos'), at('thanksgiving')) && !H.holMatch(r('Stuffed Bell Peppers'), at('thanksgiving')) && !H.holMatch(r('Ranch Dressing'), at('thanksgiving')), 'ground turkey tacos, stuffed peppers, ranch dressing are not');
ok(H.holMatch(r('Tamales', ['nochebuena']), at('christmas')) && H.holMatch(r('Buñuelos'), at('christmas')) && H.holMatch(r('Pan de Muerto'), at('muertos')), 'Christmas by a tag (Nochebuena) and by name (buñuelos); pan de muerto');
ok(H.holMatch(r('Grandma Sopa', [], ['thanksgiving']), at('thanksgiving')), 'saved from the Thanksgiving ideas counts (r.hols)');
ok(H.holMatch(r('Chicken Tortilla Soup'), at('winter')) && H.holMatch(r('Apple Crisp'), at('fall')) && !H.holMatch(r('Chicken Tortilla Soup'), at('summer')), 'soup is winter, apple crisp is fall');

// searches for ideas
ok(H.holQueries(at('thanksgiving')).join('|') === 'thanksgiving turkey|stuffing|pumpkin pie|leftover turkey', 'Thanksgiving, All: one from each course -> ' + H.holQueries(at('thanksgiving')).join('|'));
ok(H.holQueries(at('thanksgiving'), 'sides').join('|') === 'stuffing|mashed potatoes|green bean casserole|sweet potato casserole', 'Thanksgiving sides');
ok(H.holQueries(at('fall')).length === 4 && H.holQueries(at('fall'), 'all').join() === 'pumpkin,apple dessert,butternut squash,pot roast', 'a season\'s searches');
ok(H.HOLIDAYS.every(h => h.courses.length && h.kw.length && h.emoji && h.a && h.b) && H.HOL_SEASONS.length === 4, H.HOLIDAYS.length + ' holidays, each with courses, words, colors');

console.log(fails ? '\n' + fails + ' FAILED' : '\nAll holiday tests passed');
process.exit(fails ? 1 : 0);
