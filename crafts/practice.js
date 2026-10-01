/* Artistry practice tools: the tuner's pitch finder and note names, instrument tunings, tap tempo, and the
   practice log math (minutes per day, streaks, the week). Used by the app (crafts/app.js) and the tests
   (node tests/practice.test.js). It all runs on the phone: the microphone sound is never recorded or sent anywhere. */
(function (root) {
  'use strict';

  // Note names the way most tuners show them (sharps for C♯ and F♯, flats for E♭, A♭, B♭)
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midiOf = (f, a4) => 69 + 12 * Math.log2(f / (a4 || 440));
  const freqOf = (m, a4) => (a4 || 440) * Math.pow(2, (m - 69) / 12);
  const nameOf = m => NAMES[((Math.round(m) % 12) + 12) % 12];
  const octaveOf = m => Math.floor(Math.round(m) / 12) - 1;
  const cents = (f, target) => 1200 * Math.log2(f / target);
  // "E2" -> 40, "B♭3" -> 58
  function note(s) {
    const m = String(s).match(/^([A-G])([#♯b♭]?)(-?\d)$/);
    if (!m) return null;
    return 12 * (Number(m[3]) + 1) + PC[m[1]] + (/[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0);
  }

  // Standard tunings, strings in the order players name them on the tuner (guitar low E first; banjo's short 5th
  // string first, the way banjo players count 5-4-3-2-1). The B♭ trumpet shows written notes: it sounds a whole
  // step (2 half steps) lower than written, so written = what the tuner hears + 2.
  const TUNINGS = [
    { id: 'guitar', name: 'Guitar', inst: 'guitar', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], lo: 60, hi: 700 },
    { id: 'guitar-dropd', name: 'Guitar, drop D', inst: 'guitar', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], lo: 60, hi: 700 },
    { id: 'ukulele', name: 'Ukulele', inst: 'ukulele', strings: ['G4', 'C4', 'E4', 'A4'], lo: 180, hi: 900 },
    { id: 'ukulele-lowg', name: 'Ukulele, low G', inst: 'ukulele', strings: ['G3', 'C4', 'E4', 'A4'], lo: 140, hi: 900 },
    { id: 'banjo', name: 'Banjo, open G', inst: 'banjo', strings: ['G4', 'D3', 'G3', 'B3', 'D4'], lo: 110, hi: 800 },
    { id: 'bass', name: 'Bass', inst: 'bass', strings: ['E1', 'A1', 'D2', 'G2'], lo: 35, hi: 400 },
    { id: 'mandolin', name: 'Mandolin', inst: 'mandolin', strings: ['G3', 'D4', 'A4', 'E5'], lo: 160, hi: 1400 },
    { id: 'violin', name: 'Violin', inst: 'violin', strings: ['G3', 'D4', 'A4', 'E5'], lo: 160, hi: 1400 },
    { id: 'trumpet', name: 'Trumpet (B♭)', inst: 'trumpet', strings: [], transpose: 2, lo: 120, hi: 1200 },
    { id: 'chromatic', name: 'Any note', inst: '', strings: [], lo: 50, hi: 1400 }
  ];
  const tuning = id => TUNINGS.find(t => t.id === id) || TUNINGS[0];
  // the string closest to what it hears (in cents), so it knows which one she's tuning
  function nearestString(freq, t, a4) {
    let best = null;
    (t.strings || []).forEach((s, i) => {
      const target = freqOf(note(s), a4);
      const c = cents(freq, target);
      if (!best || Math.abs(c) < Math.abs(best.cents)) best = { i, note: s, target, cents: c };
    });
    return best;
  }

  /* Pitch finder: the YIN method (de Cheveigné and Kawahara, 2002). It compares the sound with itself shifted by
     every possible period and picks the first shift where it repeats well, which avoids jumping an octave on a
     guitar's strong second harmonic. buf = the microphone's latest samples (-1..1), sr = samples per second.
     Returns { freq, clarity } or null when it's quiet or not a clear note. */
  function detect(buf, sr, lo, hi) {
    lo = lo || 50; hi = hi || 1400;
    let x = buf, rate = sr;
    // halve the work on 44.1/48 kHz phones (averaging pairs also trims hiss above the notes we need)
    if (sr >= 32000) {
      const h = new Float32Array(buf.length >> 1);
      for (let i = 0; i < h.length; i++) h[i] = (buf[2 * i] + buf[2 * i + 1]) / 2;
      x = h; rate = sr / 2;
    }
    const n = x.length;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += x[i];
    mean /= n;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += (x[i] - mean) * (x[i] - mean);
    rms = Math.sqrt(rms / n);
    if (rms < 0.006) return null;
    const tauMin = Math.max(2, Math.floor(rate / hi));
    const tauMax = Math.min(Math.floor(n / 2), Math.ceil(rate / lo));
    if (tauMax <= tauMin + 2) return null;
    const W = n - tauMax - 1;
    const d = new Float32Array(tauMax + 2);
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const v = x[i] - x[i + tau]; s += v * v; }
      d[tau] = s;
    }
    // cumulative mean normalized difference
    const c = new Float32Array(tauMax + 2);
    c[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= tauMax + 1; tau++) { run += d[tau]; c[tau] = run ? d[tau] * tau / run : 1; }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (c[t] < 0.15) { while (t + 1 <= tauMax && c[t + 1] < c[t]) t++; tau = t; break; }
    }
    if (tau < 0) {
      let m = tauMin;
      for (let t = tauMin; t <= tauMax; t++) if (c[t] < c[m]) m = t;
      if (c[m] > 0.3) return null;
      tau = m;
    }
    // parabolic interpolation between the samples around the dip
    let better = tau;
    if (tau > 1 && tau < tauMax + 1) {
      const a = c[tau - 1], b = c[tau], e = c[tau + 1], den = a - 2 * b + e;
      if (den > 0) better = tau + (a - e) / (2 * den);
    }
    const freq = rate / better;
    if (freq < lo * 0.95 || freq > hi * 1.05) return null;
    return { freq, clarity: Math.max(0, Math.min(1, 1 - c[tau])) };
  }

  // Tap tempo: the average of the last few gaps; a pause over 2 seconds starts over
  function tapTempo(times) {
    const t = (times || []).slice(-6);
    const gaps = [];
    for (let i = 1; i < t.length; i++) { const g = t[i] - t[i - 1]; if (g > 2000) gaps.length = 0; else if (g > 150) gaps.push(g); }
    if (!gaps.length) return null;
    const use = gaps.slice(-4);
    const avg = use.reduce((s, g) => s + g, 0) / use.length;
    return Math.max(30, Math.min(250, Math.round(60000 / avg)));
  }

  /* Practice log. sessions = [{ id, t (when it started, ms), mins, inst, what, src: 'timer'|'lesson'|'metronome'|'added' }] */
  const pad = n => String(n).padStart(2, '0');
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function perDay(sessions) {
    const m = {};
    for (const s of sessions || []) { const k = dayKey(s.t); m[k] = (m[k] || 0) + (Number(s.mins) || 0); }
    return m;
  }
  // Days in a row with practice. Today still counts as "alive" before she practices, from yesterday's streak.
  function streak(sessions, now) {
    const m = perDay(sessions);
    const d = new Date(now == null ? Date.now() : now);
    d.setHours(12, 0, 0, 0);
    const today = m[dayKey(d)] || 0;
    if (today < 1) d.setDate(d.getDate() - 1);
    let days = 0;
    while ((m[dayKey(d)] || 0) >= 1) { days++; d.setDate(d.getDate() - 1); }
    return { days, today, doneToday: today >= 1 };
  }
  function bestStreak(sessions) {
    const keys = Object.keys(perDay(sessions)).filter(k => perDay(sessions)[k] >= 1).sort();
    let best = 0, run = 0, prev = null;
    for (const k of keys) {
      const d = new Date(k + 'T12:00:00');
      if (prev) { const p = new Date(prev); p.setDate(p.getDate() + 1); run = dayKey(p) === k ? run + 1 : 1; } else run = 1;
      prev = d.getTime();
      best = Math.max(best, run);
    }
    return best;
  }
  // the last 7 days ending today: [{ key, letter, mins, today }]
  function week(sessions, now) {
    const m = perDay(sessions);
    const out = [];
    const d = new Date(now == null ? Date.now() : now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) {
      out.push({ key: dayKey(d), letter: 'SMTWTFS'[d.getDay()], mins: Math.round(m[dayKey(d)] || 0), today: i === 6 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  // "1 h 5 min", "25 min", "under a minute"
  function minsText(mins) {
    mins = Math.round(mins || 0);
    if (mins < 1) return 'under a minute';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min';
  }

  const API = { NAMES, TUNINGS, tuning, note, midiOf, freqOf, nameOf, octaveOf, cents, nearestString, detect, tapTempo, dayKey, perDay, streak, bestStreak, week, minsText };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.Practice = API;
})(typeof self !== 'undefined' ? self : this);
