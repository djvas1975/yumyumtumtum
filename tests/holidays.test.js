// Offline tests for Artistry's holidays (crafts/holidays.js): dates, countdowns and which holiday a post is for.
const path = require('path');
const H = require(path.join(__dirname, '..', 'crafts/holidays.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = JSON.stringify;
const ds = d => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : null;

// dates (checked against published calendars)
ok(ds(H.easter(2026)) === '2026-04-05' && ds(H.easter(2027)) === '2027-03-28' && ds(H.easter(2028)) === '2028-04-16', 'Easter 2026-2028');
ok(ds(H.next('mothersday', new Date(2026, 0, 1))) === '2026-05-10' && ds(H.next('mothersday', new Date(2027, 0, 1))) === '2027-05-09', 'Mother’s Day = 2nd Sunday of May');
ok(ds(H.next('fathersday', new Date(2026, 0, 1))) === '2026-06-21', 'Father’s Day = 3rd Sunday of June');
ok(ds(H.next('thanksgiving', new Date(2026, 0, 1))) === '2026-11-26' && ds(H.next('thanksgiving', new Date(2027, 0, 1))) === '2027-11-25', 'Thanksgiving = 4th Thursday of November');
ok(ds(H.next('hanukkah', new Date(2026, 9, 1))) === '2026-12-04' && ds(H.next('hanukkah', new Date(2027, 0, 1))) === '2027-12-24', 'Hanukkah first candle from the table');
ok(H.next('hanukkah', new Date(2031, 0, 1)) === null, 'Hanukkah after the table: no made-up date');
const oct1 = new Date(2026, 9, 1);
ok(H.daysUntil('halloween', oct1) === 30 && H.daysUntil('christmas', oct1) === 85, 'countdowns from Oct 1, 2026');
ok(H.daysUntil('halloween', new Date(2026, 9, 31, 20, 0)) === 0, 'the day itself counts as today');
ok(H.daysUntil('halloween', new Date(2026, 10, 1)) === 364, 'after the day, it counts to next year');
const up = H.upcoming(oct1, 60).map(x => x.id);
ok(J(up) === J(['halloween', 'diadelosmuertos', 'thanksgiving']), 'coming up in the next 60 days -> ' + J(up));
ok(H.seasonOf(oct1) === 'fall' && H.seasonOf(new Date(2026, 0, 5)) === 'winter' && H.seasonOf(new Date(2026, 6, 4)) === 'summer', 'seasons');
ok(H.countdown(0) === 'Today' && H.countdown(1) === 'Tomorrow' && H.countdown(9) === '9 days' && H.countdown(30) === '4 weeks' && H.countdown(85) === '3 months', 'countdown words');

// which holiday a post is for
const cases = [
  ['Spooky ghost wreath #halloweendecor', ['halloween']],
  ['Painted pumpkins with bats and spiders', ['halloween', 'fall']],
  ['Easy fall pumpkin acrylic painting', ['fall']],
  ['Sugar skull rocks for Día de los Muertos', ['diadelosmuertos']],
  ['Dollar Tree Christmas gnome wreath', ['christmas']],
  ['Snowflake ornaments', ['christmas', 'winter']],
  ['Valentines heart garland', ['valentines']],
  ['Easter egg bunny wreath', ['easter']],
  ['Red white and blue patriotic porch sign', ['july4']],
  ['Thanksgiving turkey handprint', ['thanksgiving']],
  ['Mothers day card for mom', ['mothersday']],
  ['#christmascrafts easy', ['christmas']],
  ['Birthday cake topper', ['birthday']],
  ['Shamrock wreath for St. Patrick’s Day', ['stpatricks']]
];
for (const [text, want] of cases) { const got = H.detect(text); ok(want.every((w, i) => got[i] === w), '"' + text + '" -> ' + J(got)); }
for (const text of ['Galaxy paint pour', 'Heart wreath, I love it', 'Watercolor sunflowers for beginners', 'Crochet granny square blanket']) {
  const got = H.detect(text).filter(id => H.HOLIDAYS.some(h => h.id === id));
  ok(!got.length, 'no holiday for "' + text + '" -> ' + J(H.detect(text)));
}
ok(H.label('diadelosmuertos') === 'Día de los Muertos' && H.emoji('halloween') === '🎃', 'names and emoji');

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
