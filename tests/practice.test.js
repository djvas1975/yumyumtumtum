// Offline tests for Artistry's practice tools (crafts/practice.js): the tuner's pitch finder on made-up string sounds,
// note names and tunings, tap tempo, and practice streaks.
const path = require('path');
const P = require(path.join(__dirname, '..', 'crafts/practice.js'));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const J = JSON.stringify;
const SR = 48000, N = 4096;

// sounds to test with
function sine(f, amp) { const b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = (amp || 0.4) * Math.sin(2 * Math.PI * f * i / SR); return b; }
function rich(f, parts) { // a fundamental plus overtones; parts = amplitudes of harmonics 1, 2, 3…
  const b = new Float32Array(N);
  for (let i = 0; i < N; i++) { let s = 0; parts.forEach((a, k) => { s += a * Math.sin(2 * Math.PI * f * (k + 1) * i / SR + k); }); b[i] = 0.25 * s; }
  return b;
}
function pluck(f, seed) { // Karplus-Strong plucked string, read a little after the pluck like a real tuner would
  let r = seed || 7;
  const rnd = () => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r / 4294967296 - 0.5; };
  const n = Math.round(SR / f + 0.5); // each sample is the average of two, so the loop is n - 0.5 samples long
  const line = Float32Array.from({ length: n }, rnd);
  const out = new Float32Array(N + 6000);
  for (let i = 0; i < out.length; i++) {
    const a = line[i % n], b = line[(i + 1) % n];
    out[i] = a;
    line[i % n] = 0.996 * 0.5 * (a + b);
  }
  return { buf: out.slice(6000), real: SR / (n - 0.5) };
}

// 1) every guitar, ukulele and banjo string, and trumpet notes, within 3 cents
const strings = { guitar: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], ukulele: ['G4', 'C4', 'E4', 'A4'], banjo: ['G4', 'D3', 'G3', 'B3', 'D4'], 'ukulele-lowg': ['G3'], 'guitar-dropd': ['D2'], bass: ['E1', 'A1'] };
let worst = 0, misses = [];
for (const [id, list] of Object.entries(strings)) {
  const t = P.tuning(id);
  for (const s of list) {
    const f = P.freqOf(P.note(s));
    for (const [kind, buf] of [['pure', sine(f)], ['bright', rich(f, [1, 0.6, 0.4, 0.25, 0.15])], ['strong 2nd overtone', rich(f, [0.45, 1, 0.55, 0.3])]]) {
      const r = P.detect(buf, SR, t.lo, t.hi);
      const c = r ? Math.abs(P.cents(r.freq, f)) : 999;
      worst = Math.max(worst, c);
      if (c > 3) misses.push(id + ' ' + s + ' ' + kind + ' -> ' + (r ? r.freq.toFixed(2) : 'none'));
    }
  }
}
ok(!misses.length, 'every string found within 3 cents (worst ' + worst.toFixed(2) + ' cents)' + (misses.length ? ': ' + misses.join('; ') : ''));
// plucked strings (Karplus-Strong), the closest made-up thing to a real string
const pl = [82.41, 110, 196, 329.63, 392].map(f => { const p = pluck(f, Math.round(f)); const r = P.detect(p.buf, SR, 60, 700); return { f, real: p.real, got: r && r.freq }; });
ok(pl.every(x => x.got && Math.abs(P.cents(x.got, x.real)) < 3), 'plucked strings: right note, no octave jumps -> ' + J(pl.map(x => [x.real.toFixed(1), x.got && x.got.toFixed(1)])));
// a little sharp or flat reads as such
const sharp = P.detect(rich(110 * Math.pow(2, 12 / 1200), [1, 0.6, 0.4]), SR, 60, 700);
ok(sharp && Math.abs(P.cents(sharp.freq, 110) - 12) < 1.5, 'A string 12 cents sharp reads +12 -> ' + (sharp && P.cents(sharp.freq, 110).toFixed(1)));
const flat = P.detect(sine(329.63 * Math.pow(2, -30 / 1200)), SR, 60, 700);
ok(flat && Math.abs(P.cents(flat.freq, 329.63) + 30) < 1.5, 'high E 30 cents flat reads -30 -> ' + (flat && P.cents(flat.freq, 329.63).toFixed(1)));
// quiet and noise give nothing
ok(P.detect(sine(110, 0.002), SR) === null, 'too quiet: no reading');
let s = 3; const noise = new Float32Array(N).map(() => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s / 4294967296 - 0.5) * 0.6; });
ok(P.detect(noise, SR) === null, 'hiss with no note: no reading');
// 44.1 kHz phones too
const f441 = P.detect(new Float32Array(N).map((_, i) => 0.4 * Math.sin(2 * Math.PI * 196 * i / 44100)), 44100, 60, 700);
ok(f441 && Math.abs(P.cents(f441.freq, 196)) < 2, '44.1 kHz microphones read right too -> ' + (f441 && f441.freq.toFixed(2)));
// fast enough for a phone: 12+ readings a second leaves room to spare
const t0 = Date.now(); for (let i = 0; i < 50; i++) P.detect(rich(82.41, [1, 0.6, 0.4]), SR, 60, 700);
const per = (Date.now() - t0) / 50;
ok(per < 25, 'one reading takes ' + per.toFixed(1) + ' ms on this computer');

// 2) notes and tunings
ok(P.note('E2') === 40 && P.note('A4') === 69 && P.note('B♭3') === 58 && P.note('C♯4') === 61, 'note numbers');
ok(Math.abs(P.freqOf(P.note('E2')) - 82.41) < 0.01 && Math.abs(P.freqOf(P.note('G4')) - 392.0) < 0.01, 'string pitches (E2 82.41 Hz, G4 392 Hz)');
ok(P.nameOf(P.midiOf(466.16)) === 'B♭' && P.octaveOf(P.midiOf(466.16)) === 4 && P.nameOf(61) === 'C♯', 'note names');
const near = P.nearestString(111, P.tuning('guitar'));
ok(near.note === 'A2' && Math.round(near.cents) === 16, 'guitar: 111 Hz is the A string, 16 cents sharp -> ' + J([near.note, Math.round(near.cents)]));
ok(P.nearestString(392, P.tuning('ukulele')).note === 'G4' && P.nearestString(147, P.tuning('banjo')).note === 'D3', 'ukulele G and banjo 4th string');
ok(P.tuning('banjo').strings.join(' ') === 'G4 D3 G3 B3 D4' && P.tuning('ukulele').strings.join(' ') === 'G4 C4 E4 A4', 'banjo open G (gDGBD) and ukulele GCEA');
// B♭ trumpet: concert B♭ is a written C
const tr = P.tuning('trumpet');
ok(P.nameOf(P.midiOf(466.16) + tr.transpose) === 'C', 'trumpet: concert B♭ shows as written C');

// 3) tap tempo
ok(P.tapTempo([0, 500, 1000, 1500, 2000]) === 120, 'taps half a second apart = 120 BPM');
ok(P.tapTempo([0, 600, 5000, 5750, 6500]) === 80, 'a long pause starts over -> ' + P.tapTempo([0, 600, 5000, 5750, 6500]));
ok(P.tapTempo([0]) === null, 'one tap is not a tempo yet');

// 4) practice log
const day = (y, m, d, h) => new Date(y, m - 1, d, h || 18).getTime();
const log = [{ t: day(2026, 9, 27), mins: 20 }, { t: day(2026, 9, 28), mins: 12 }, { t: day(2026, 9, 29, 9), mins: 5 }, { t: day(2026, 9, 29, 21), mins: 10 }, { t: day(2026, 9, 30), mins: 30 }];
const st = P.streak(log, day(2026, 10, 1, 8));
ok(st.days === 4 && st.today === 0 && !st.doneToday, 'streak still alive this morning before practicing -> ' + J(st));
const st2 = P.streak(log.concat([{ t: day(2026, 10, 1, 7), mins: 15 }]), day(2026, 10, 1, 8));
ok(st2.days === 5 && st2.doneToday && st2.today === 15, 'practicing today adds a day -> ' + J(st2));
ok(P.streak(log, day(2026, 10, 2, 8)).days === 0, 'a missed day ends it');
ok(P.bestStreak(log.concat([{ t: day(2026, 9, 20), mins: 9 }])) === 4, 'best streak');
const wk = P.week(log, day(2026, 9, 30, 20));
ok(wk.length === 7 && wk[6].today && wk[6].mins === 30 && wk[5].mins === 15 && wk.map(x => x.letter).join('') === 'TFSSMTW', 'the week, ending today -> ' + J(wk.map(x => x.letter + x.mins)));
ok(P.minsText(65) === '1 h 5 min' && P.minsText(25) === '25 min' && P.minsText(60) === '1 h' && P.minsText(0.4) === 'under a minute', 'minutes in words');

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
