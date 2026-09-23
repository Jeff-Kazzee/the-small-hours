/* The score: a quiet bed under the voices. Each mood is a slow pad, a few soft
   felt-piano notes, and sometimes room tone or rain. It ducks whenever someone
   speaks. Audio starts only after the viewer clicks. */
'use strict';
const SCORE = (() => {
  let ac = null, master = null, music = null, verb = null, muted = false, cur = null, timer = null, ducked = false;
  const LEVEL = 0.2, DUCK = 0.42;
  const buses = {};
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // chords are semitones from root. step is seconds per slot. dens is the chance of a piano note per slot.
  const MOODS = {
    title: { root: 50, chords: [[0, 7, 16], [-3, 4, 12], [5, 12, 16], [-5, 7, 14]], step: 1.4, dens: 0.18, pad: 0.05, reg: [12, 19, 24], bed: null },
    lab: { root: 50, chords: [[0, 7, 15], [-2, 5, 12], [-4, 3, 12], [-5, 2, 10]], step: 1.8, dens: 0.1, pad: 0.04, reg: [12, 15, 19], bed: 'hum' },
    winter: { root: 45, chords: [[0, 7, 15], [-4, 3, 12], [-2, 5, 14], [-5, 2, 10]], step: 1.6, dens: 0.14, pad: 0.045, reg: [12, 15, 19, 24], bed: 'wind' },
    tense: { root: 45, chords: [[0, 7, 13], [0, 8, 15], [-1, 6, 12], [0, 7, 12]], step: 1.5, dens: 0.08, pad: 0.05, reg: [12, 13, 19], bed: 'room', pulse: true },
    uneasy: { root: 47, chords: [[0, 6, 16], [2, 8, 14], [-2, 4, 12], [0, 8, 14]], step: 1.8, dens: 0.1, pad: 0.04, reg: [12, 18, 22], bed: 'room' },
    tender: { root: 53, chords: [[0, 7, 16], [2, 9, 17], [-3, 4, 12], [5, 12, 16]], step: 1.3, dens: 0.2, pad: 0.05, reg: [12, 16, 19, 24], bed: 'room' },
    vast: { root: 43, chords: [[0, 7, 15], [-4, 3, 12], [-7, 0, 8], [-5, 2, 10]], step: 2.2, dens: 0.08, pad: 0.06, reg: [24, 27, 31], bed: 'hum' },
    requiem: { root: 46, chords: [[0, 7, 15], [-4, 3, 12], [-2, 5, 12], [-5, 2, 10]], step: 2.2, dens: 0.1, pad: 0.06, reg: [12, 15, 19], bed: null },
    musicbox: { root: 69, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], step: 0.62, dens: 0.55, pad: 0.025, reg: [0, 4, 7, 12], bed: null, box: true },
    hollow: { root: 45, chords: [[0, 7, 12], [0, 7, 14], [-5, 2, 7], [0, 7, 12]], step: 2.4, dens: 0.07, pad: 0.05, reg: [12, 19, 24], bed: 'wind' },
    march: { root: 42, chords: [[0, 7, 15], [0, 8, 15], [-2, 5, 12], [0, 7, 12]], step: 1.2, dens: 0.05, pad: 0.05, reg: [12, 15], bed: 'hum', pulse: true },
    bells: { root: 48, chords: [[0, 6, 13], [1, 7, 12], [-1, 5, 10], [0, 6, 11]], step: 2.0, dens: 0.12, pad: 0.035, reg: [12, 18, 24], bed: 'room' },
    playful: { root: 55, chords: [[0, 7, 15], [5, 12, 16], [-2, 5, 14], [7, 14, 17]], step: 0.9, dens: 0.22, pad: 0.03, reg: [12, 15, 19, 24], bed: null, hoot: true },
    bloom: { root: 50, chords: [[0, 7, 16], [5, 12, 16], [-3, 4, 12], [2, 9, 14]], step: 1.2, dens: 0.22, pad: 0.05, reg: [12, 16, 19, 24], bed: 'birds' },
    rain: { root: 45, chords: [[0, 7, 16], [-3, 4, 12], [5, 12, 16], [-5, 2, 11]], step: 1.6, dens: 0.14, pad: 0.045, reg: [12, 16, 19], bed: 'rain' },
    mirror: { root: 50, chords: [[0, 7, 16], [-1, 6, 14], [-3, 4, 11], [0, 4, 11]], step: 1.8, dens: 0.1, pad: 0.045, reg: [19, 24, 28], bed: 'hum' },
  };

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    music = ac.createGain(); music.gain.value = LEVEL;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 2.5;
    music.connect(lp); lp.connect(comp); comp.connect(master);
    verb = ac.createConvolver();
    const len = ac.sampleRate * 3.4, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    const vg = ac.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(music);
    timer = setInterval(tick, 100);
  }
  function bus(name) {
    if (buses[name]) return buses[name];
    const g = ac.createGain(); g.gain.value = 0; g.connect(music);
    const send = ac.createGain(); send.gain.value = 0.7; g.connect(send); send.connect(verb);
    return (buses[name] = { g, next: ac.currentTime + 0.2, beat: 0, beds: [] });
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, stop, detune = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.start(t); o.stop(t + stop); return o; }
  // a felt piano: soft attack, a dark tone that closes as it rings
  function felt(out, f, t, vel) {
    const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(420, t + 2.4);
    lp.connect(g); g.connect(out);
    [['triangle', 1, -3, 0.55], ['sine', 1, 3, 0.5], ['sine', 2, 0, 0.12]].forEach(([ty, m, dt, a]) => { const o = osc(ty, f * m, t, 4.2, dt), og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(lp); });
    env(g, t, 0.018, 0.1 * vel, 3.6);
  }
  function box(out, f, t, vel) {
    const g = ac.createGain(); g.connect(out);
    const o = osc('sine', f, t, 1.6), o2 = osc('sine', f * 4, t, 1.6, 7), g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o.connect(g);
    env(g, t, 0.004, 0.06 * vel, 1.3);
  }
  function pad(out, f, t, lvl) {
    const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.connect(g); g.connect(out);
    [osc('triangle', f, t, 12, -5), osc('sine', f, t, 12, 5)].forEach((o) => o.connect(lp));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl, t + 4); g.gain.linearRampToValueAtTime(0.0001, t + 11.5);
  }
  let NB = null;
  function noiseBuf() { const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } return b; }
  function bed(B, kind) {
    NB = NB || noiseBuf();
    const out = ac.createGain(); out.gain.value = 0; out.connect(B.g);
    const src = ac.createBufferSource(); src.buffer = NB; src.loop = true;
    const f = ac.createBiquadFilter(); src.connect(f); f.connect(out);
    const lvl = { rain: 0.5, wind: 0.3, room: 0.16, birds: 0.14, hum: 0.2 }[kind] ?? 0.2;
    if (kind === 'rain') { f.type = 'highpass'; f.frequency.value = 1100; }
    else if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6; const l = ac.createOscillator(); l.frequency.value = 0.06; const lg = ac.createGain(); lg.gain.value = 200; l.connect(lg); lg.connect(f.frequency); l.start(); B.beds.push(l); }
    else if (kind === 'hum') { f.type = 'lowpass'; f.frequency.value = 180; const o = ac.createOscillator(); o.frequency.value = 60; const og = ac.createGain(); og.gain.value = 0.03; o.connect(og); og.connect(out); o.start(); B.beds.push(o); }
    else { f.type = 'lowpass'; f.frequency.value = 380; }
    out.gain.linearRampToValueAtTime(lvl, ac.currentTime + 4);
    src.start(); B.beds.push(src);
  }
  function thump(B, t) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.3);
    o.connect(g); g.connect(B.g); env(g, t, 0.01, 0.16, 0.45); o.start(t); o.stop(t + 0.7);
  }
  function chirp(B, t) {
    const o = ac.createOscillator(), g = ac.createGain(), f0 = 2600 + Math.random() * 1200;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.3, t + 0.07); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.13);
    o.connect(g); g.connect(B.g); env(g, t, 0.005, 0.012, 0.12); o.start(t); o.stop(t + 0.2);
  }
  function hoot(out, t, lvl = 0.1) {
    [[0, 392], [0.38, 370]].forEach(([dt, f]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.04, t + dt); o.frequency.exponentialRampToValueAtTime(f * 0.94, t + dt + 0.3);
      o.connect(g); g.connect(out); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(lvl, t + dt + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.34); o.start(t + dt); o.stop(t + dt + 0.4);
    });
  }
  function tick() {
    if (!ac || !cur) return;
    const M = MOODS[cur], B = bus(cur), ahead = ac.currentTime + 0.5;
    while (B.next < ahead) {
      const t = B.next, i = B.beat, slots = Math.max(4, Math.round(8 / M.step)), chord = M.chords[Math.floor(i / slots) % M.chords.length];
      if (i % slots === 0) for (const c of chord) pad(B.g, midi(M.root - 12 + c), t, M.pad);
      if (M.pulse && i % 2 === 0) thump(B, t);
      if (M.bed === 'birds' && Math.random() < 0.05) chirp(B, t);
      if (M.hoot && i % 40 === 25) hoot(B.g, t, 0.05);
      if (Math.random() < M.dens) {
        const deg = chord[Math.floor(Math.random() * chord.length)] + M.reg[Math.floor(Math.random() * M.reg.length)] - 12;
        (M.box ? box : felt)(B.g, midi(M.root + deg), t + Math.random() * 0.08, 0.6 + Math.random() * 0.4);
      }
      B.beat++; B.next += M.step * (1 + (Math.random() - 0.5) * 0.1);
    }
  }
  function mood(name) {
    if (!ac) { cur = name; return; }
    if (!MOODS[name] || name === cur) return;
    const now = ac.currentTime;
    for (const k in buses) if (k !== name) { const b = buses[k]; b.g.gain.cancelScheduledValues(now); b.g.gain.setValueAtTime(b.g.gain.value, now); b.g.gain.linearRampToValueAtTime(0, now + 3.5); const dying = b.beds.splice(0); setTimeout(() => dying.forEach((n) => { try { n.stop(); } catch (e) {} }), 4000); }
    const B = bus(name); B.next = Math.max(B.next, now + 0.3); B.g.gain.cancelScheduledValues(now); B.g.gain.setValueAtTime(B.g.gain.value, now); B.g.gain.linearRampToValueAtTime(1, now + 4);
    const M = MOODS[name]; if (M.bed && !B.beds.length) bed(B, M.bed);
    cur = name;
  }
  function sting(kind) {
    if (!ac) return;
    const t = ac.currentTime + 0.02, out = cur ? bus(cur).g : music;
    if (kind === 'choose') [0, 7, 12].forEach((d, i) => felt(out, midi(62 + d), t + i * 0.09, 0.8));
    if (kind === 'forecast') [0, 5, 9].forEach((d, i) => felt(out, midi(69 + d), t + i * 0.14, 0.5));
    if (kind === 'ending') [0, 7, 12, 19].forEach((d, i) => felt(out, midi(50 + d), t + i * 0.24, 0.8));
    if (kind === 'hoot') hoot(master, t, 0.22);
  }
  function duck(on) {
    if (!ac || ducked === on) return; ducked = on;
    music.gain.setTargetAtTime(on ? LEVEL * DUCK : LEVEL, ac.currentTime, on ? 0.15 : 0.8);
  }
  return {
    start() { init(); if (ac && ac.state === 'suspended') ac.resume(); if (cur && !buses[cur]) { const c = cur; cur = null; mood(c); } },
    mood, sting, duck,
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.2); },
    get muted() { return muted; },
    get running() { return !!ac; },
  };
})();
