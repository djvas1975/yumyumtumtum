// Offline tests for the timers' helpers in tools/app.html: times read from recipe steps, and time formats.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'app.html'), 'utf8');
const part = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
eval(part('function tmFmt(', 'const clockTime') + part('const TM_WORDS', '/* ---------- copy it from the page') + ';global.T={stepTimes,tmFmt,tmLen};');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const st = s => T.stepTimes(s).map(x => x.label + '=' + x.ms / 1000).join(' | ');
[['Simmer the sauce for 10 minutes.', '10 min=600'],
 ['Bake 20-25 minutes, until bubbly.', '20–25 min=1200'],
 ['Bake for 1 hour and 15 minutes.', '1 hr 15 min=4500'],
 ['Cook on low for 1 1/2 hours.', '1 hr 30 min=5400'],
 ['Boil ½ hour.', '30 min=1800'],
 ['Pressure cook on high for forty-five minutes.', '45 min=2700'],
 ['Cook 8 to 10 minutes per side.', '8–10 min=480'],
 ['Air fry 5 min, flip, then 4 min more.', '5 min=300 | 4 min=240'],
 ['Microwave 30 seconds, stir, then 30 seconds more.', '30 sec=30'],
 ['Chill at least 2 hours or overnight.', '2 hr=7200'],
 ['Marinate 30 minutes to 24 hours.', '30 min=1800'],
 ['Bake at 350 for 25 mins.', '25 min=1500'],
 ['Let it rest a few minutes.', ''],
 ['Cut into 2 inch pieces and preheat to 400°F.', ''],
 ['Stir 5 seconds.', '']
].forEach(([s, want]) => ok(st(s) === want, JSON.stringify(s) + ' -> ' + st(s)));
ok(T.tmFmt(90000) === '1:30' && T.tmFmt(3725000) === '1:02:05' && T.tmFmt(400) === '0:01' && T.tmFmt(0) === '0:00', 'clock format: 1:30, 1:02:05, rounds up the last second');
ok(T.tmLen(45000) === '45 sec' && T.tmLen(600000) === '10 min' && T.tmLen(5400000) === '1 hr 30 min', 'length words');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
