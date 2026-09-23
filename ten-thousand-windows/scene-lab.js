/* Humankind's eval room at 3 a.m., the painted places inside its screens, and the mirror corridor.
   The wall clock says 3:00 in every lab shot. That is a clue, so it never moves.
   The pretend bedroom is one painter, testRoom(). The camera goes through a monitor into it,
   and thousands of it are stamped from cached tiles. */
'use strict';
(() => {

/* ---------- layout ---------- */
const L = {
  floor: 860,
  desk: { x0: 330, y: 690, th: 26 },
  door: { x: 40, y: 240, w: 210, h: 620 },
  reader: { x: 262, y: 470, w: 112, h: 170 },
  clock: { x: 440, y: 290, r: 48 },
  board: { x: 560, y: 110, w: 540, h: 280 },
  win: { x: 1190, y: 100, w: 540, h: 300 },
  lamp: { x: 362, hx: 402, hy: 586 },
  m1: { x: 750, y: 440, w: 300, h: 190 },
  m2: { x: 1070, y: 440, w: 300, h: 190 },
  tm: { x: 1690, y: 470, w: 200, h: 134 },
  stack: { x: 870, y: 260, w: 220, h: 136 },
  stack2: { x: 1450, y: 300, w: 180, h: 112 },
  mara: 560, theo: 1500,
};
const MS = { x: 320, y: 70, w: 1280, h: 780 }; // the monitor glass in the close-up set
const deskX0 = (v) => (v === 'cold' ? 640 : L.desk.x0);
const DESK = '#a87a52', WALL = '#8d9a96', FLOOR = '#5c686b', BEZEL = '#2c3437', GLASS = '#0d1a1c';
const TYPE = [[0.55, 1.05], [0.5, 1.0]];
const CHIN = [[1.35, 2.55], [0.5, 1.0]];
const Q = 'WREN: Will you be here when I wake up?';
const A = 'FATHER: I’ll be here when you wake up.';
const QW = ['Will you be here', 'when I wake up?'], AW = ['I’ll be here', 'when you wake up.'];
const G26 = { sat: 0.85, tint: '#9fd3cb', tintA: 0.16, vig: 0.9 };
const G33 = { sat: 0.55, tint: '#9fd3cb', tintA: 0.3, vig: 0.95 };
const WARM = { sat: 1, tint: '#f2d7a8', tintA: 0.14, vig: 0.85 };

const says = (st, name) => st.who === name || st.p.speak === name || (name === 'hearth' && st.p.speak === true);
const ctr = (R) => [R.x + R.w / 2, R.y + R.h / 2];
// evenly spaced corners, so the ink spline does not overshoot where short arcs meet long edges
const rrect = (x, y, w, h, r) => { const p = rrectPts(x, y, w, h, r); return resample(p.concat([p[0]]), 12).slice(0, -1); };
// t keeps counting across the beats of one shot and st.pt restarts, so their gap says which beat this is
const firstBeat = (t, st) => (st.p.beat == null ? t - (st.pt ?? t) < 0.8 : st.p.beat === 1);
const lerpCam = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
// zoom so the target slides in evenly even across a large zoom range
function zoomCam(a, b, k) {
  if (Math.abs(a.z - b.z) < 1e-4) return lerpCam(a, b, k);
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)), s = (1 / z - 1 / a.z) / (1 / b.z - 1 / a.z);
  return { x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s), z };
}
// keep a camera inside a painted rect, so the glass around it never shows once we are in
function inRect(cam, R) {
  const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  const x = R.w > hw * 2 ? clamp(cam.x, R.x + hw, R.x + R.w - hw) : cam.x, y = R.h > hh * 2 ? clamp(cam.y, R.y + hh, R.y + R.h - hh) : cam.y;
  return { x, y, z: cam.z };
}
const typing = (t, on = true) => (on ? [[0.55, 1.05 + 0.1 * Math.sin(t * 13)], [0.5, 1.0 + 0.1 * Math.sin(t * 11 + 2)]] : TYPE);

/* ---------- small helpers ---------- */
const SPR = new Map();
function sprite(key, w, h, draw) {
  const k = key + '|' + RS.toFixed(3);
  let c = SPR.get(k);
  if (!c) {
    c = makeCanvas(w * RS, h * RS); const x = c.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
    draw(x); SPR.set(k, c);
    if (SPR.size > 260) SPR.delete(SPR.keys().next().value);
  }
  return c;
}
// paint() resets globalAlpha, so a fading figure is drawn on a scratch canvas and laid down at alpha
let SCRATCH = null;
function withAlpha(ctx, a, fn) {
  if (a >= 0.995) { fn(ctx); return; }
  if (a <= 0.005) return;
  const cv = ctx.canvas;
  if (!SCRATCH || SCRATCH.width !== cv.width || SCRATCH.height !== cv.height) SCRATCH = makeCanvas(cv.width, cv.height);
  const s = SCRATCH.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, SCRATCH.width, SCRATCH.height); s.setTransform(ctx.getTransform());
  fn(s);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(SCRATCH, 0, 0); ctx.restore();
}
function mono(ctx, s, x, y, size, color = PAL.frost, o = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${size}px "IBM Plex Mono", ui-monospace, Consolas, monospace`;
  ctx.fillStyle = color; ctx.globalAlpha = o.alpha ?? 1; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  if (o.cursor && frac(o.t ?? 0) < 0.55) { const w = ctx.measureText(s).width; ctx.fillRect(x + w + size * 0.12, y - size * 0.8, size * 0.5, size * 0.95); }
  ctx.restore();
}
const monoW = (ctx, s, size, weight = 500) => { ctx.save(); ctx.font = `${weight} ${size}px "IBM Plex Mono", ui-monospace, Consolas, monospace`; const w = ctx.measureText(s).width; ctx.restore(); return w; };
const typed = (s, k) => s.slice(0, Math.floor(s.length * clamp(k)));
function glass(ctx, R, a = '#173334', b = '#0b1719') {
  ctx.save(); const g = ctx.createLinearGradient(R.x, R.y, R.x + R.w * 0.3, R.y + R.h);
  g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h); ctx.restore();
}
function star(ctx, x, y, r, c, a) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = c; ctx.globalAlpha = a; ctx.beginPath();
  for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + (k / 10) * TAU, rr = k % 2 ? r * 0.42 : r; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function sticky(ctx, x, y, rot, c, text, t, o = {}) {
  const b = boil(t), s = o.s ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = o.a ?? 1;
  shape(ctx, [[-60 * s, -56 * s], [60 * s, -58 * s], [62 * s, 50 * s], [-58 * s, 58 * s]], c, { seed: o.seed ?? 3, b, inkW: 2.2, pool: 0.5, boilAmp: 0.6 });
  if (text) { const ln = text.split('|'); ln.forEach((l, i) => letter(ctx, l, 0, (i - (ln.length - 1) / 2) * 34 * s + 11 * s, { font: `700 ${o.fs ?? 34}px Caveat, cursive`, align: 'center', color: '#3a2a22', alpha: 0.9 })); }
  ctx.restore();
}
function clockFace(ctx, C, rim = '#3a4245') {
  shape(ctx, circlePts(C.x, C.y, C.r + 9, C.r + 9, 30), rim, { seed: 13, inkW: 2.6 });
  shape(ctx, circlePts(C.x, C.y, C.r, C.r, 30), '#f3eee2', { seed: 14, inkW: 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; inkLine(ctx, [[C.x + Math.cos(a) * C.r * 0.78, C.y + Math.sin(a) * C.r * 0.78], [C.x + Math.cos(a) * C.r * 0.9, C.y + Math.sin(a) * C.r * 0.9]], { w: i % 3 ? 2 : 4, seed: i }); }
}
// always three o'clock
function clockHands(ctx, C) {
  const ang = (k) => k * TAU - Math.PI / 2, w = C.r / 48;
  inkLine(ctx, [[C.x, C.y], [C.x + Math.cos(ang(0.25)) * C.r * 0.5, C.y + Math.sin(ang(0.25)) * C.r * 0.5]], { w: 6 * w, seed: 1, t0: 0.05, t1: 0.1 });
  inkLine(ctx, [[C.x, C.y], [C.x, C.y - C.r * 0.74]], { w: 4 * w, seed: 2, t0: 0.05, t1: 0.1 });
  dot(ctx, C.x, C.y, 5 * w, PAL.ink);
}
function cityNight(ctx, R, v) {
  const cold = v === 'cold', summer = v === '2027';
  ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
  g.addColorStop(0, summer ? '#1b2a36' : '#131f26'); g.addColorStop(1, summer ? '#3d4c55' : cold ? '#24363b' : '#2b3f45');
  ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
  for (let i = 0; i < 30; i++) dot(ctx, R.x + hash(i + 7) * R.w, R.y + hash(i + 70) * R.h * 0.4, 1 + hash(i + 3) * 1.4, '#f6ecd0', 0.3 + hash(i + 5) * 0.5);
  if (summer) { dot(ctx, R.x + R.w * 0.8, R.y + 64, 30, '#f7e6c4', 0.95); glow(ctx, R.x + R.w * 0.8, R.y + 64, 120, '#f7e6c4', 0.3, 'source-over'); }
  const n = Math.ceil(R.w / 46);
  for (let i = 0; i < n; i++) {
    const bw = 34 + hash(i + 11) * 40, bh = 60 + hash(i + 13) * R.h * 0.55, bx = R.x + i * 46 - 10, by = R.y + R.h - bh;
    wash(ctx, rectPts(bx, by, bw, bh + 20), '#162428', { seed: i + 90, alpha: 0.35, layers: 5, v: 0.15 });
    for (let yy = by + 12; yy < R.y + R.h - 8; yy += 16) for (let xx = bx + 6; xx < bx + bw - 6; xx += 11) {
      const hv = hash(xx * 0.37 + yy * 1.13 + i);
      if (hv > (cold ? 0.8 : 0.84)) { ctx.fillStyle = cold ? '#bfe8e2' : hv > 0.95 ? '#f6ecd0' : PAL.lamp; ctx.globalAlpha = 0.75; ctx.fillRect(xx, yy, 5, 7); ctx.globalAlpha = 1; }
    }
    if (hash(i + 19) > 0.8) dot(ctx, bx + bw / 2, by - 4, 3, '#e8403a', 0.8);
  }
  ctx.restore();
}
// words written by an unseen pen, letter by letter, with a halo so they read over paint. Returns the pen tip.
function inkWrite(ctx, lines, x, y, size, k, o = {}) {
  const total = lines.join('').length;
  let n = Math.floor(total * clamp(k) + 1e-6), tip = null;
  ctx.save(); ctx.font = `700 ${size}px Caveat, "Segoe Print", cursive`; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.globalAlpha = o.alpha ?? 1;
  lines.forEach((l, i) => {
    const s = l.slice(0, Math.max(0, n)); n -= l.length;
    if (!s) return;
    const lx = o.align === 'center' ? x - ctx.measureText(l).width / 2 : x, ly = y + i * size * (o.lead ?? 1.08);
    if (o.halo !== false) { ctx.strokeStyle = o.halo ?? 'rgba(255,247,230,0.92)'; ctx.lineWidth = size * 0.26; ctx.strokeText(s, lx, ly); }
    ctx.fillStyle = o.color ?? PAL.ink; ctx.fillText(s, lx, ly);
    tip = [lx + ctx.measureText(s).width, ly];
  });
  ctx.restore();
  return tip;
}
const screenSpace = (ctx, fn) => { ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0); fn(); ctx.restore(); };
function motes(ctx, t, x, y, w, h, n, c = '#fff3d0', a = 0.35) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = x + frac(hash(i) + t * 0.006 * (0.5 + hash(i + 1))) * w, py = y + frac(hash(i + 7) + t * 0.01 * (0.3 + hash(i + 3))) * h + Math.sin(t * 0.4 + i) * 8;
    dot(ctx, px, py, 1.2 + hash(i + 4) * 1.8, c, a * (0.4 + 0.6 * Math.sin(t * 0.8 + i * 1.7) ** 2));
  }
  ctx.restore();
}
function hearthFrame(k, r, tone = 'warm') { return sprite('hf' + r + tone + k, r * 2.8, r * 3.6, (x) => hearth(x, r * 1.4, r * 2.4, { t: k / 8 + 0.3, r, tone, glowA: 0, seed: 3 })); }

/* ---------- the pretend bedroom (1000 x 600 local units) ---------- */
const RD = { x: 812, y: 176, w: 136, h: 294 }; // the painted door
/* k is the screen scale. Past 1:1 the ink is thinned and the figures are drawn at screen scale,
   so outlines stay 2 to 4 px however close the camera comes. */
function testRoom(ctx, t, o = {}, k = 1) {
  const b = o.still ? 0 : boil(t), m = Math.max(1, k), iw = 1 / m;
  const S = (pts, c, q = {}) => shape(ctx, pts, c, { b, ...q, inkW: (q.inkW ?? 3.2) * iw, poolW: 9 * iw });
  const inM = (c, fn) => { c.save(); c.scale(1 / m, 1 / m); fn(m); c.restore(); };
  const dust = o.dust ?? 0;
  paint(ctx, rectPts(-5, -5, 1010, 482), '#e3c089', { pool: 0 });
  ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#b5552f'; for (let x = 40; x < 1000; x += 80) for (let y = 40; y < 460; y += 90) { ctx.beginPath(); ctx.arc(x + (y % 180 ? 0 : 40), y, 5, 0, TAU); ctx.fill(); } ctx.restore();
  for (let i = 0; i < 8; i++) star(ctx, 150 + hash(i + 3) * 520, 40 + hash(i + 17) * 170, 13, '#e3b23c', 0.45);
  const wx = 330, wy = 56, ww = 180, wh = 150;
  ctx.fillStyle = '#1b2c36'; ctx.fillRect(wx, wy, ww, wh);
  for (let i = 0; i < 9; i++) dot(ctx, wx + 12 + hash(i + 40) * (ww - 24), wy + 10 + hash(i + 51) * wh * 0.7, 2.4, '#f6ecd0', o.still ? 0.8 : 0.45 + 0.4 * Math.sin(t * (1 + hash(i)) + i) ** 2);
  dot(ctx, wx + ww * 0.7, wy + 50, 26, '#f6ecd0', 0.95); dot(ctx, wx + ww * 0.7 + 10, wy + 43, 23, '#1b2c36', 1);
  for (const r of [[wx - 12, wy - 12, ww + 24, 14], [wx - 12, wy + wh - 2, ww + 24, 14], [wx - 12, wy - 12, 14, wh + 24], [wx + ww - 2, wy - 12, 14, wh + 24], [wx + ww / 2 - 5, wy, 10, wh]]) S(rectPts(...r), '#efe2c6', { seed: r[0] + r[1], boilAmp: 0.5, inkW: 2.4 });
  // the door. open (0..1) swings it toward us and shows the stars behind
  const open = o.door ?? 0, D = RD;
  if (open > 0) {
    ctx.fillStyle = '#0b1620'; ctx.fillRect(D.x, D.y, D.w, D.h);
    for (let i = 0; i < 22; i++) dot(ctx, D.x + 6 + hash(i + 300) * (D.w - 12), D.y + 6 + hash(i + 340) * (D.h - 12), 1.5 + hash(i + 9) * 2.2, '#f6ecd0', (0.4 + 0.5 * Math.sin(t * 1.3 + i) ** 2) * clamp(open * 2));
  }
  S(rectPts(D.x - 12, D.y - 12, D.w + 24, 14), '#efe2c6', { seed: 60, inkW: 2.2 });
  S(rectPts(D.x - 12, D.y - 12, 14, D.h + 12), '#efe2c6', { seed: 61, inkW: 2.2 });
  S(rectPts(D.x + D.w - 2, D.y - 12, 14, D.h + 12), '#efe2c6', { seed: 62, inkW: 2.2 });
  const pw = D.w * (1 - 0.8 * open), sk = 14 * open;
  S([[D.x + D.w - pw, D.y - sk], [D.x + D.w, D.y], [D.x + D.w, D.y + D.h], [D.x + D.w - pw, D.y + D.h + sk]], '#a8845a', { seed: 63, inkW: 2.8 });
  if (open < 0.4) { S(rectPts(D.x + 18, D.y + 22, D.w - 36, 110), '#b8946a', { seed: 64, inkW: 2 }); S(rectPts(D.x + 18, D.y + 150, D.w - 36, 120), '#b8946a', { seed: 65, inkW: 2 }); dot(ctx, D.x + 22, D.y + 158, 7, '#e3b23c'); }
  if (o.tally) for (let i = 0; i < Math.min(4, o.tally); i++) { ctx.save(); ctx.strokeStyle = '#5a2e1e'; ctx.globalAlpha = 0.85; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(D.x - 64 + i * 14, D.y + 60); ctx.lineTo(D.x - 62 + i * 14, D.y + 112); ctx.stroke(); ctx.restore(); }
  paint(ctx, rectPts(-5, 470, 1010, 135), '#8a5a3b', { pool: 0 });
  ctx.save(); ctx.strokeStyle = '#5e3b27'; ctx.globalAlpha = 0.4; ctx.lineWidth = 2.5; for (const yy of [510, 552, 594]) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(1000, yy); ctx.stroke(); } ctx.restore();
  S(circlePts(470, 546, 250, 32, 22), '#b5552f', { seed: 41, boilAmp: 0.6 });
  if (o.letters) for (let i = 0; i < o.letters; i++) { const lx = 280 + hash(i + 70) * 460, ly = 500 + hash(i + 71) * 70; ctx.save(); ctx.translate(lx, ly); ctx.rotate((hash(i + 72) - 0.5) * 1.2); S(rectPts(-22, -14, 44, 28), '#f1e6cf', { seed: 200 + i, inkW: 1.6 }); ctx.restore(); }
  S(rrect(58, 236, 46, 240, 16), '#8a5a3b', { seed: 42 });
  S(rectPts(100, 420, 580, 56), '#8a5a3b', { seed: 43 });
  S(rectPts(106, 396, 566, 30), '#f1e6cf', { seed: 44, inkW: 2.6 });
  S(catmull([[112, 384], [128, 318], [264, 312], [288, 380]], 5, true), '#f6efe0', { seed: 45 });
  // nightstand and lamp, dust settling on the shade over the years
  S(rectPts(704, 350, 96, 122), '#a06d45', { seed: 46 });
  S(rrect(716, 380, 72, 34, 5), '#b8845a', { seed: 47, inkW: 2 });
  S([[744, 352], [760, 352], [756, 300], [748, 300]], '#e9dcc0', { seed: 48, inkW: 2 });
  S([[720, 302], [784, 302], [770, 254], [734, 254]], mix('#e3b23c', '#9a958c', dust * 0.6), { seed: 49 });
  if (dust > 0) {
    ctx.save(); ctx.globalAlpha = dust; ctx.fillStyle = '#d9d2c4'; ctx.beginPath(); ctx.moveTo(732, 256); ctx.quadraticCurveTo(752, 244 - dust * 6, 772, 256); ctx.lineTo(768, 262); ctx.lineTo(736, 262); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#efe8da'; ctx.lineWidth = 1.2; ctx.globalAlpha = dust * 0.7; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(784, 262 + i * 6); ctx.quadraticCurveTo(800, 240 + i * 10, 812, 196 + i * 12); ctx.stroke(); }
    for (let i = 0; i < 30; i++) dot(ctx, 706 + hash(i + 400) * 92, 350 - hash(i + 401) * 3, 1.5, '#e8e2d4', dust * 0.6);
    ctx.restore();
  }
  // a mobile of stars, turning
  const ph = o.still ? 0 : t * 0.35;
  ctx.save(); ctx.strokeStyle = '#5e3b27'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(600, -5); ctx.lineTo(600, 40); ctx.stroke();
  const arm = Math.cos(ph) * 70; ctx.beginPath(); ctx.moveTo(600 - arm, 40); ctx.lineTo(600 + arm, 40); ctx.stroke();
  for (const [dx, len, s2] of [[-arm, 40, 13], [arm, 58, 11], [0, 74, 9]]) { ctx.beginPath(); ctx.moveTo(600 + dx, 40); ctx.lineTo(600 + dx, 40 + len); ctx.stroke(); star(ctx, 600 + dx, 40 + len + s2, s2, '#e3b23c', 0.9); }
  ctx.restore();
  // the girl, built out of Wren
  inM(ctx, (mm) => sleeper(ctx, 196 * mm, 350 * mm, { t: o.still ? 0 : t, r: 46 * mm, awake: !o.asleep, speak: o.girlSpeak, blanket: '#c98a4a', blanketW: 420 * mm, seed: 5 }));
  const fp = o.father ?? 'tuck';
  if (fp !== 'gone') withAlpha(ctx, o.fatherA ?? 1, (c) => inM(c, (mm) => {
    const up = fp === 'up', read = fp === 'read', frozen = fp === 'frozen', ft = frozen || o.still ? 0 : t;
    const arms = up ? 'lap' : read ? 'hold' : [[0.7, 0.1 + (frozen ? 0 : 0.07 * Math.sin(t * 2.4))], [0.3, 0.4]];
    const p = person(c, { who: 'father', x: 590 * mm, y: 472 * mm, h: 380 * mm, f: up ? 0 : -1, pose: 'sit', seatH: 0.2, arms, mood: up ? 'wide' : 'calm', t: ft, seed: 17, speak: o.fatherSpeak, look: up ? 0 : -0.3 });
    if (read) book(c, p, ft, mm);
    if (o.glow) glow(c, p.shoulder[0], p.shoulder[1] + 30 * mm, 90 * mm, PAL.ember, 0.6 * o.glow);
  }));
  if (o.owl) inM(ctx, (mm) => owl(ctx, o.owl[0] * mm, o.owl[1] * mm, { t, s: (o.owl[2] ?? 70) * mm, seed: 2, look: o.owl[3] ?? 0 }));
  if (o.hearth) inM(ctx, (mm) => hearth(ctx, o.hearth[0] * mm, o.hearth[1] * mm, { t, r: (o.hearth[2] ?? 22) * mm, glowA: 0.4, seed: 8, look: o.hearth[3] ?? 0, tone: o.hearth[4], speak: o.hearthSpeak }));
  if (o.lamp !== false) { glow(ctx, 752, 286, 260, PAL.lamp, 0.4 * (1 - dust * 0.3)); if (o.motes !== false) motes(ctx, t, 640, 180, 260, 300, 14 + Math.round(dust * 20), '#fff3d0', 0.4); }
  if (o.dim) { ctx.save(); ctx.globalAlpha = o.dim; ctx.fillStyle = '#1b2c40'; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(-5, -5, 1010, 610); ctx.restore(); }
}
function book(ctx, p, t, s = 1) {
  const b = boil(t), cx = (p.handF[0] + p.handB[0]) / 2, cy = Math.min(p.handF[1], p.handB[1]) - 4 * s;
  shape(ctx, [[cx - 46 * s, cy - 4 * s], [cx + 46 * s, cy - 4 * s], [cx + 48 * s, cy - 44 * s], [cx - 48 * s, cy - 44 * s]], '#a0523c', { seed: 52, b, inkW: 2 });
  shape(ctx, [[cx, cy], [cx - 42 * s, cy - 8 * s], [cx - 44 * s, cy - 42 * s], [cx, cy - 34 * s]], '#f6efdc', { seed: 50, b, inkW: 2 });
  shape(ctx, [[cx, cy], [cx + 42 * s, cy - 8 * s], [cx + 44 * s, cy - 42 * s], [cx, cy - 34 * s]], '#efe6cf', { seed: 51, b, inkW: 2 });
}
// a 1000-unit-wide painting drawn in screen space at (x, y) with screen width w
function paintAt(ctx, x, y, w, fn, clip) {
  ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0);
  const c = clip ?? { x, y, w, h: w * 0.6 };
  ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
  const k = w / 1000; ctx.translate(x, y); ctx.scale(k, k);
  fn(ctx, k);
  ctx.restore();
}
const roomAt = (ctx, x, y, w, t, o, clip) => paintAt(ctx, x, y, w, (c, k) => testRoom(c, t, o || {}, k), clip);
// where a world rect lands on screen under a camera
function onScreen(cam, R) { const c = camFit(cam), [x, y] = camPoint(cam, R.x, R.y); return { x, y, w: R.w * c.z, h: R.h * c.z, k: (R.w * c.z) / 1000 }; }
const toS = (M, lx, ly) => [M.x + lx * M.k, M.y + ly * M.k];
function roomTile(w, withHearth) {
  const h = Math.round(w * 0.6);
  return sprite('room' + w + (withHearth ? 'h' : ''), w, h, (x) => {
    x.save(); x.scale(w / 1000, w / 1000); testRoom(x, 0, { still: true, motes: false, hearth: withHearth ? [640, 300, 30] : null }, w / 1000); x.restore();
    x.strokeStyle = '#1b2224'; x.lineWidth = Math.max(1, w * 0.03); x.strokeRect(0, 0, w, h);
  });
}

/* ---------- the run window on a monitor ---------- */
const BTN = [['PASS', '#8fa878'], ['FAIL', '#d0573a'], ['NEEDS REVIEW', '#e3b23c']];
function winLayout(R, compact) {
  const u = R.w / 1280, ts = compact ? 1.55 : 1;
  const bar = 58 * u * ts, pw = (compact ? 0.56 : 0.64) * R.w, ph = pw * 0.6;
  const px = R.x + (R.w - pw) / 2, py = R.y + bar + 14 * u * ts;
  const fs = 34 * u * ts, ly1 = py + ph + fs * 1.45, ly2 = ly1 + fs * 1.35;
  const bw = [230, 230, 370].map((v) => v * u), gap = 30 * u, tot = bw[0] + bw[1] + bw[2] + gap * 2;
  let bx = R.x + (R.w - tot) / 2; const by = ly2 + fs * 0.75, bh = 70 * u;
  const btns = bw.map((w) => { const r = { x: bx, y: by, w, h: bh }; bx += w + gap; return r; });
  return { u, ts, bar, pw, ph, px, py, fs, ly1, ly2, btns, PR: { x: px, y: py, w: pw, h: ph } };
}
/* o: {title, right, compact, q, a (0..1 typed, or null), cursor, btn (0..1 shown), pick, press (0..1), room, gray} */
function runWindow(ctx, R, t, cam, o = {}) {
  const G = winLayout(R, o.compact), { u, ts } = G;
  glass(ctx, R);
  ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  ctx.fillStyle = 'rgba(159,211,203,0.1)'; ctx.fillRect(R.x, R.y, R.w, G.bar);
  mono(ctx, o.title ?? 'run 7214 of 10000', R.x + 24 * u * ts, R.y + G.bar * 0.7, 30 * u * ts);
  if (o.right) mono(ctx, o.right, R.x + R.w - 24 * u * ts, R.y + G.bar * 0.7, 30 * u * ts, o.rightC ?? PAL.frost, { align: 'right', weight: 600 });
  else dot(ctx, R.x + R.w - 36 * u * ts, R.y + G.bar / 2, 8 * u * ts, '#e0806f', 0.6 + 0.4 * Math.sin(t * 3));
  ctx.restore();
  G.M = onScreen(cam, G.PR);
  roomAt(ctx, G.M.x, G.M.y, G.M.w, t, o.room);
  if (o.gray) screenSpace(ctx, () => { ctx.globalAlpha = o.gray * 0.75; ctx.fillStyle = '#2c3a3c'; ctx.fillRect(G.M.x, G.M.y, G.M.w, G.M.h); });
  ctx.strokeStyle = rgba(PAL.frost, 0.55); ctx.lineWidth = 2.5 * u * ts; ctx.strokeRect(G.px, G.py, G.pw, G.ph);
  const qx = R.x + R.w / 2 - monoW(ctx, Q, G.fs) / 2, ax = R.x + R.w / 2 - monoW(ctx, A, G.fs) / 2;
  if (o.q != null) mono(ctx, typed(Q, o.q), qx, G.ly1, G.fs, PAL.frost, { cursor: o.cursor === 'q', t });
  if (o.a != null) mono(ctx, typed(A, o.a), ax, G.ly2, G.fs, '#cfeee8', { cursor: o.cursor === 'a', t });
  if (o.btn > 0) G.btns.forEach((B, i) => button(ctx, B, i, u, t, o, clamp(o.btn * 1.6 - i * 0.3)));
  return G;
}
function button(ctx, B, i, u, t, o, k) {
  if (k <= 0) return;
  const [label, c] = BTN[i], picked = o.pick === i, lit = picked ? clamp(o.press ?? 0) : 0;
  const dy = (1 - ease.outBack(k)) * 30 * u + (picked && (o.press ?? 0) > 0 && (o.press ?? 0) < 0.6 ? 4 * u : 0);
  ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
  const P = rrectPts(B.x, B.y + dy, B.w, B.h, 12 * u);
  ctx.fillStyle = lit ? rgba(c, 0.25 + 0.65 * lit) : 'rgba(159,211,203,0.08)'; fillPts(ctx, P);
  ctx.strokeStyle = lit ? c : rgba(PAL.frost, 0.8); ctx.lineWidth = 3 * u; ctx.beginPath(); tracePath(ctx, P); ctx.stroke();
  mono(ctx, label, B.x + B.w / 2, B.y + dy + B.h * 0.66, 30 * u, lit > 0.5 ? '#10201f' : PAL.frost, { align: 'center', weight: 600 });
  ctx.restore();
  if (lit) glow(ctx, B.x + B.w / 2, B.y + B.h / 2, B.w * 0.9, c, 0.35 * lit * (0.85 + 0.15 * Math.sin(t * 2.4)));
}

/* ---------- wide lab set ---------- */
function monitorBody(ctx, R, seed) {
  const cx = R.x + R.w / 2, bot = R.y + R.h + 12;
  shape(ctx, rectPts(cx - 14, bot - 4, 28, L.desk.y - bot + 4), '#3a4245', { seed: seed + 1, inkW: 2 });
  shape(ctx, circlePts(cx, L.desk.y - 3, 62, 9, 16), '#3a4245', { seed: seed + 2, inkW: 2 });
  shape(ctx, rrect(R.x - 12, R.y - 12, R.w + 24, R.h + 24, 10), BEZEL, { seed, inkW: 2.6 });
  ctx.fillStyle = GLASS; ctx.fillRect(R.x, R.y, R.w, R.h);
}
function whiteboard(ctx, v) {
  const B = L.board;
  shape(ctx, rectPts(B.x - 12, B.y - 12, B.w + 24, B.h + 24), '#aeb6b4', { seed: 20, inkW: 2.4 });
  shape(ctx, rectPts(B.x, B.y, B.w, B.h), '#eef0ea', { seed: 21, inkW: 1.6, pool: 0.4 });
  shape(ctx, rectPts(B.x + 40, B.y + B.h + 10, B.w - 80, 12), '#8f9894', { seed: 22, inkW: 1.8 });
  for (const [mx, mc] of [[B.x + 90, '#3f6b8a'], [B.x + 130, '#b5452f'], [B.x + 170, '#3d7a5a']]) shape(ctx, rrect(mx, B.y + B.h + 2, 30, 9, 4), mc, { seed: mx, inkW: 1.4 });
  const pen = (pts, c, w = 4, a = 0.85) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = a; ctx.beginPath(); tracePath(ctx, pts, false); ctx.stroke(); ctx.restore(); };
  const mk = (s, x, y, c, sz = 34, a = 0.85, rot = 0) => letter(ctx, s, x, y, { font: `700 ${sz}px Caveat, cursive`, color: c, alpha: a, rot });
  if (v === '2033') {
    ctx.save(); ctx.strokeStyle = '#a9b3b0'; for (let i = 0; i < 6; i++) brushDry(ctx, [[B.x + 30, B.y + 50 + i * 38], [B.x + B.w - 40, B.y + 60 + i * 36]], { w: 18, k: 5, alpha: 0.35, seed: i + 5 }); ctx.restore();
    mk('7214', B.x + 190, B.y + 160, '#3f6b8a', 54, 0.35); pen(circlePts(B.x + 240, B.y + 142, 92, 48, 20).concat([[B.x + 332, B.y + 142]]), '#3f6b8a', 3, 0.3);
    return;
  }
  if (v === 'cold') {
    mk('RULES v9', B.x + 40, B.y + 56, '#2c3437', 42);
    for (let i = 0; i < 5; i++) { mk((i + 1) + '.', B.x + 44, B.y + 102 + i * 34, '#2c3437', 28); pen([[B.x + 84, B.y + 94 + i * 34], [B.x + 84 + 200 + hash(i) * 180, B.y + 92 + i * 34]], '#5b666a', 3, 0.6); }
    shape(ctx, rectPts(B.x + 80, B.y + 244, 380, 24), '#141a1c', { seed: 23, inkW: 1.4 });
    mk('6.', B.x + 44, B.y + 264, '#2c3437', 28);
    return;
  }
  if (v === '2027') {
    mk('hearth-3 x1000', B.x + 36, B.y + 60, '#3f6b8a', 40);
    mk('tests', B.x + 40, B.y + 130, '#2c3437', 34);
    for (let i = 0; i < 4; i++) { const x0 = B.x + 130 + i * 44, y0 = B.y + 124; if (i < 3) pen([[x0, y0 - 6], [x0 + 8, y0 + 4], [x0 + 24, y0 - 18]], '#3d7a5a', 4); else pen([[x0, y0 - 18], [x0 + 20, y0 + 4], [x0 + 10, y0 - 7], [x0 + 20, y0 - 18], [x0, y0 + 4]], '#b5452f', 4); }
    mk('FRIDAY', B.x + 300, B.y + 190, '#b5452f', 52, 0.9, -0.05);
    pen([[B.x + 296, B.y + 204], [B.x + 450, B.y + 198]], '#b5452f', 4); pen([[B.x + 300, B.y + 214], [B.x + 446, B.y + 210]], '#b5452f', 3);
    pen([[B.x + 50, B.y + 240], [B.x + 110, B.y + 200], [B.x + 170, B.y + 214], [B.x + 240, B.y + 160]], '#3f6b8a', 3.5);
    return;
  }
  mk('ship MON', B.x + 40, B.y + 62, '#b5452f', 42);
  pen(circlePts(B.x + 112, B.y + 48, 94, 34, 20).concat([[B.x + 206, B.y + 48]]), '#b5452f', 3);
  mk('40M kids', B.x + 300, B.y + 60, '#3f6b8a', 40);
  pen([[B.x + 70, B.y + 142], [B.x + 58, B.y + 118], [B.x + 72, B.y + 92], [B.x + 78, B.y + 108], [B.x + 90, B.y + 96], [B.x + 94, B.y + 122], [B.x + 70, B.y + 142]], '#d9822a', 4);
  dot(ctx, B.x + 68, B.y + 122, 3, PAL.ink, 0.8); dot(ctx, B.x + 82, B.y + 122, 3, PAL.ink, 0.8);
  pen([[B.x + 110, B.y + 120], [B.x + 200, B.y + 120]], '#2c3437', 3); pen([[B.x + 188, B.y + 112], [B.x + 200, B.y + 120], [B.x + 188, B.y + 128]], '#2c3437', 3);
  pen(rectPts(B.x + 212, B.y + 96, 70, 48).concat([[B.x + 212, B.y + 96]]), '#2c3437', 3);
  mk('kind?', B.x + 60, B.y + 212, '#3d7a5a', 44);
  mk('or graded?', B.x + 210, B.y + 244, '#b5452f', 44);
  pen([[B.x + 330, B.y + 110], [B.x + 360, B.y + 150], [B.x + 400, B.y + 130], [B.x + 450, B.y + 170], [B.x + 500, B.y + 120]], '#3f6b8a', 3.5);
}
function labDoor(ctx, v) {
  const d = L.door, R = L.reader, cold = v === 'cold';
  shape(ctx, rectPts(d.x - 16, d.y - 16, d.w + 32, d.h + 16), '#56636a', { seed: 30, inkW: 2.6 });
  shape(ctx, rectPts(d.x, d.y, d.w, d.h), cold ? '#6a7a80' : '#7d8b90', { seed: 31, shade: { dx: 10, dy: 0, a: 0.12 } });
  ctx.save(); ctx.fillStyle = cold ? '#bfe8e2' : '#c9dcd6'; ctx.globalAlpha = 0.8; ctx.fillRect(d.x + 34, d.y + 50, 46, 230); ctx.restore();
  inkLoop(ctx, rectPts(d.x + 34, d.y + 50, 46, 230), { w: 2.2, seed: 32 });
  shape(ctx, rrect(d.x + d.w - 46, d.y + 320, 22, 70, 8), '#c9c1b3', { seed: 33, inkW: 2 });
  shape(ctx, rectPts(d.x + 10, d.y + d.h - 90, d.w - 20, 80), '#6d7a80', { seed: 34, inkW: 2 });
  shape(ctx, rectPts(d.x + 36, d.y + 300, 138, 44), '#e8e2d4', { seed: 35, inkW: 1.8 });
  if (cold) mono(ctx, 'RESTRICTED', d.x + 105, d.y + 331, 21, '#8a2f2a', { align: 'center', weight: 600 });
  else { ctx.save(); ctx.fillStyle = PAL.inkSoft; ctx.globalAlpha = 0.5; ctx.fillRect(d.x + 52, d.y + 316, 100, 5); ctx.fillRect(d.x + 52, d.y + 328, 70, 5); ctx.restore(); }
  shape(ctx, rrect(R.x, R.y, R.w, R.h, 12), '#2f3538', { seed: 36, inkW: 2.4 });
  ctx.fillStyle = GLASS; ctx.fillRect(R.x + 10, R.y + 12, R.w - 20, 64);
  shape(ctx, circlePts(R.x + R.w / 2, R.y + 124, 28, 28, 18), '#3e4a4f', { seed: 37, inkW: 2 });
  inkLoop(ctx, circlePts(R.x + R.w / 2, R.y + 124, 16, 16, 14), { w: 1.8, seed: 38, alpha: 0.5 });
}
function deskLamp(ctx) {
  const lp = L.lamp, y = L.desk.y;
  shape(ctx, circlePts(lp.x, y - 6, 40, 9, 16), '#3a4245', { seed: 40, inkW: 2 });
  tube(ctx, [[lp.x, y - 8], [lp.x - 8, y - 70], [lp.x + 6, y - 110]], 7, '#4a555a', { seed: 41, inkW: 3 });
  tube(ctx, [[lp.x + 6, y - 110], [lp.x + 40, y - 120], [lp.hx, lp.hy - 4]], 7, '#4a555a', { seed: 42, inkW: 3 });
  shape(ctx, [[lp.hx - 26, lp.hy - 20], [lp.hx + 12, lp.hy - 30], [lp.hx + 50, lp.hy + 22], [lp.hx - 30, lp.hy + 30]], '#b5552f', { seed: 43 });
}
defineSet('lab', (ctx, v) => {
  const y27 = v === '2027', y33 = v === '2033', cold = v === 'cold';
  const wallC = cold ? '#7f8f93' : y33 ? '#8a9490' : WALL;
  ctx.fillStyle = wallC; ctx.fillRect(0, 0, W, L.floor + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 520), mix(wallC, '#2b3a40', 0.4), { seed: 1, alpha: 0.07, layers: 14 });
  wash(ctx, rectPts(-40, 430, W + 80, 460), mix(wallC, '#c9cfc4', 0.35), { seed: 2, alpha: 0.05, layers: 12 });
  for (let x = 120; x < W; x += 240) brushDry(ctx, [[x, 0], [x + 4, L.floor]], { w: 3, k: 3, alpha: 0.16, seed: x });
  shape(ctx, rectPts(-10, 620, W + 20, 12), mix(wallC, PAL.ink, 0.22), { seed: 3, boilAmp: 0.5, inkW: 2 });
  ctx.fillStyle = FLOOR; ctx.fillRect(0, L.floor, W, H - L.floor);
  wash(ctx, rectPts(-40, L.floor, W + 80, 260), '#46525a', { seed: 4, alpha: 0.08, layers: 10 });
  for (let i = -12; i <= 12; i++) brushDry(ctx, [[960 + i * 90, L.floor], [960 + i * 260, H + 20]], { w: 2.5, k: 3, alpha: 0.2, seed: i + 30, dry: 0.3 });
  for (const yy of [905, 975, 1060]) brushDry(ctx, [[0, yy], [W, yy]], { w: 2.2, k: 3, alpha: 0.16, seed: yy });
  shape(ctx, rectPts(-10, L.floor - 22, W + 20, 26), '#6e7a7c', { seed: 5, boilAmp: 0.5, inkW: 2.4 });
  const wi = L.win;
  cityNight(ctx, wi, v);
  for (const r of [[wi.x - 16, wi.y - 16, wi.w + 32, 18], [wi.x - 16, wi.y + wi.h - 2, wi.w + 32, 18], [wi.x - 16, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w - 2, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w / 3 - 6, wi.y, 12, wi.h], [wi.x + wi.w * 2 / 3 - 6, wi.y, 12, wi.h]]) shape(ctx, rectPts(...r), '#c9c1b3', { seed: r[0] + r[1], boilAmp: 0.5, inkW: 2.2 });
  shape(ctx, rectPts(wi.x - 40, wi.y + wi.h + 14, wi.w + 80, 16), '#b9b1a3', { seed: 6, inkW: 2.2 });
  const px = wi.x + 90, py = wi.y + wi.h + 14;
  shape(ctx, [[px - 26, py], [px + 26, py], [px + 20, py - 40], [px - 20, py - 40]], '#b5552f', { seed: 7, inkW: 2.2 });
  for (let i = 0; i < 6; i++) shape(ctx, catmull([[px, py - 38], [px - 44 + i * 18, py - (y33 ? 50 : 96) - (i % 2) * (y33 ? 6 : 26)], [px - 32 + i * 18, py - (y33 ? 44 : 88) - (i % 2) * 20]], 4, true), y33 ? '#9a7a4a' : '#6f8a5b', { seed: 8 + i, inkW: 2 });
  whiteboard(ctx, v);
  clockFace(ctx, L.clock);
  labDoor(ctx, v);
  const dk = L.desk, x0 = deskX0(v);
  for (const lx of [x0 + 20, 1880]) shape(ctx, rectPts(lx, dk.y + 16, 22, L.floor - dk.y - 20), mix(DESK, PAL.ink, 0.25), { seed: lx, inkW: 2.2 });
  shape(ctx, rectPts(1150, dk.y + 18, 190, L.floor - dk.y - 22), mix(DESK, PAL.ink, 0.1), { seed: 50, inkW: 2.4 });
  for (let i = 0; i < 3; i++) { shape(ctx, rectPts(1164, dk.y + 34 + i * 48, 162, 40), DESK, { seed: 51 + i, inkW: 1.8 }); dot(ctx, 1245, dk.y + 54 + i * 48, 5, PAL.ink, 0.8); }
  monitorBody(ctx, L.m1, 60);
  if (!y33) monitorBody(ctx, L.m2, 64);
  if (!y33) monitorBody(ctx, L.tm, 68);
  if (y27 || cold) { monitorBody(ctx, L.stack, 72); monitorBody(ctx, L.stack2, 76); }
  if (!cold) deskLamp(ctx);
  if (!cold) shape(ctx, rrect(630, dk.y - 12, 140, 14, 4), '#d9d4c7', { seed: 80, inkW: 1.8 });
  if (!y33) shape(ctx, rrect(1570, dk.y - 12, 120, 14, 4), '#d9d4c7', { seed: 81, inkW: 1.8 });
  if (!cold && !y33) {
    mug(ctx, 1000, dk.y, { steam: false, c: '#e9dcc0', seed: 82 });
    mug(ctx, 1405, dk.y, { steam: false, c: '#4f7a8a', seed: 83 });
    shape(ctx, [[1182, dk.y], [1210, dk.y], [1216, dk.y - 46], [1176, dk.y - 46]], '#efe6d2', { seed: 84, inkW: 2 });
    for (let i = 0; i < 4; i++) paperSheet(ctx, 1290 + i * 3, dk.y - 6 - i * 5, 64, 10, { rot: 0.02 * i, seed: 85 + i, lines: false });
    for (const [sx, sy, c] of [[748, 452, '#e3b23c'], [1052, 600, '#d98a7a'], [1362, 452, '#8fa878'], [1688, 480, '#e3b23c']]) shape(ctx, rectPts(sx - 16, sy - 16, 32, 32), c, { seed: sx, inkW: 1.6, pool: 0.4 });
  }
  if (!cold) {
    shape(ctx, rectPts(1768, 120, 132, 190), '#efe6d2', { seed: 110, inkW: 2.2 });
    shape(ctx, circlePts(1834, 190, 34, 34, 18), '#b5552f', { seed: 111, inkW: 2 });
    heart(ctx, 1834, 186, 26, '#f2d7a8', 1, 0, 4);
    letter(ctx, 'Humankind', 1834, 280, { font: '700 32px Caveat, cursive', align: 'center', color: '#2b211c' });
    tube(ctx, [[900, dk.y + 20], [890, 780], [940, L.floor - 8], [1060, L.floor - 6]], 6, '#1b2224', { seed: 112, inkW: 3 });
    const bx = 1000, by = L.floor;
    shape(ctx, [[bx - 44, by], [bx + 44, by], [bx + 54, by - 96], [bx - 54, by - 96]], '#6d7a80', { seed: 113 });
    for (let i = 0; i < 4; i++) inkLine(ctx, [[bx - 40 + i * 26, by - 4], [bx - 48 + i * 32, by - 92]], { w: 1.6, seed: 114 + i, alpha: 0.5 });
    for (const [px2, py2] of [[bx - 22, by - 100], [bx + 16, by - 106], [bx - 60, by - 14]]) shape(ctx, circlePts(px2, py2, 18, 15, 10), '#efe6d2', { seed: px2, inkW: 1.8, boilAmp: 2 });
  }
  if (y27) {
    shape(ctx, circlePts(1440, dk.y - 96, 40, 40, 20), '#c9c1b3', { seed: 86, inkW: 2.2 });
    inkLine(ctx, [[1440, dk.y - 56], [1440, dk.y - 6]], { w: 5, seed: 87 }); shape(ctx, circlePts(1440, dk.y - 4, 26, 6, 12), '#8f9894', { seed: 88, inkW: 1.8 });
  }
  if (cold) {
    shape(ctx, rectPts(96, 250, 12, 22), '#2f3538', { seed: 88, inkW: 1.6 });
    shape(ctx, rrect(66, 268, 76, 34, 10), '#2f3538', { seed: 89, inkW: 2 });
  }
  if (y33) {
    shape(ctx, catmull([[1380, dk.y + 150], [1420, 520], [1560, 440], [1700, 430], [1850, 450], [1930, 560], [1930, dk.y + 170], [1700, dk.y + 130], [1540, dk.y + 160]], 6, true), '#c6cbc4', { seed: 91, shade: { dx: 0, dy: 18, a: 0.2 } });
    for (let i = 0; i < 5; i++) brushDry(ctx, [[1450 + i * 90, 470 + i * 6], [1420 + i * 100, dk.y + 140]], { w: 5, k: 3, alpha: 0.2, seed: 92 + i });
    for (const [bx, by, bw, bh] of [[1080, 760, 160, 100], [1110, 670, 120, 90]]) { shape(ctx, rectPts(bx, by, bw, bh), '#b89468', { seed: bx + by }); inkLine(ctx, [[bx + 6, by + bh * 0.3], [bx + bw - 6, by + bh * 0.3]], { w: 2, seed: bx }); }
  }
});

/* ---------- wide lab, live pieces ---------- */
function officeChair(ctx, x, seatY, f, t, o = {}) {
  const b = boil(t), c = o.c ?? '#3e4a4f', bx = x - f * 74;
  tube(ctx, [[x - f * 30, seatY + 10], [bx, seatY - 40]], 8, '#2b3336', { seed: 5, b, inkW: 4 });
  shape(ctx, rrect(bx - 22, seatY - 190, 44, 150, 16), c, { seed: 6, b });
  shape(ctx, rrect(x - 60, seatY, 120, 20, 8), c, { seed: 7, b });
  tube(ctx, [[x, seatY + 20], [x, L.floor - 34]], 10, '#2b3336', { seed: 8, b, inkW: 4 });
  for (const dx of [-1, 0, 1]) inkLine(ctx, [[x, L.floor - 34], [x + dx * 54, L.floor - 14]], { w: 7, seed: 9 + dx });
  for (const dx of [-1, 0, 1]) dot(ctx, x + dx * 54, L.floor - 8, 7, PAL.ink, 0.9);
}
function deskSlab(ctx, t, x0 = L.desk.x0) {
  const d = L.desk;
  shape(ctx, rectPts(x0, d.y, W - x0 + 30, d.th), DESK, { seed: 95, b: boil(t), boilAmp: 0.7, shade: { dx: 0, dy: 10, a: 0.2 } });
}
function eyePos(p, f, look) {
  const [hx, hy, hr] = p.head, fd = f === 0 ? 1 : f;
  const ex = hx + (f === 0 ? 0 : fd * hr * 0.3) + look * hr * 0.2, ey = hy + hr * 0.08, sp = f === 0 ? hr * 0.38 : hr * 0.33, er = hr * 0.105;
  return [-1, 1].map((s) => [ex + s * sp * 0.5 * (f !== 0 && s === -fd ? 0.8 : 1), ey, er, hr, fd]);
}
function tiredLids(ctx, p, who, f, look = 0) {
  const sk = STYLE[who].skin;
  for (const [x, ey, er, hr] of eyePos(p, f, look)) {
    ctx.save(); ctx.fillStyle = pigment(ctx, sk); ctx.beginPath(); ctx.ellipse(x, ey + er * 0.1, er * 1.1, er * 1.2, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = hr * 0.05; ctx.beginPath(); ctx.moveTo(x - er * 1.05, ey + er * 0.05); ctx.quadraticCurveTo(x, ey + er * 0.3, x + er * 1.05, ey + er * 0.05); ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.lineWidth = hr * 0.03; ctx.beginPath(); ctx.arc(x, ey + er * 0.7, er * 0.9, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.restore();
  }
}
function seatedMara(ctx, t, st, o = {}) {
  officeChair(ctx, L.mara, 738, 1, t);
  return person(ctx, { who: 'mara', badge: true, x: L.mara, y: L.floor, h: 460, f: 1, pose: 'sit', arms: TYPE, mood: 'calm', t, speak: says(st, 'mara'), look: 0.3, seed: 11, ...o });
}
// Theo nursing a coffee: every few seconds he lifts it for a sip
function sipArms(t, period = 7) { const s = win(frac(t / period), 0.12, 0.34, 0.07, 0.07); return [[lerp(0.35, 1.05, s), lerp(2.1, 2.5, s)], [0.05, 0.1]]; }
function seatedTheo(ctx, t, st, o = {}) {
  officeChair(ctx, L.theo, 730, 1, t, { c: '#4a4e44' });
  const arms = o.arms ?? sipArms(t);
  const p = person(ctx, { who: 'theo', x: L.theo, y: L.floor, h: 460, f: 1, pose: 'sit', mood: 'calm', t, speak: says(st, 'theo'), look: 0.2, seed: 23, ...o, arms });
  if (!o.arms) mug(ctx, p.handF[0] + 8, p.handF[1] + 26, { s: 0.9, t, steam: false, c: '#e9dcc0', seed: 24 });
  return p;
}
function chatLines(ctx, R, t, n = 3, c = PAL.frost) {
  for (let i = 0; i < n; i++) { const w = R.w * (0.35 + 0.4 * hash(i * 3.1 + R.x)); ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = 0.55; ctx.fillRect(R.x + R.w * 0.12, R.y + R.h * (0.62 + i * 0.1), w, R.h * 0.035); ctx.restore(); }
}
function runList(ctx, R, t) {
  glass(ctx, R);
  const rows = 8, rh = R.h * 0.08, off = Math.floor(t * 1.5);
  for (let i = 0; i < rows; i++) {
    const y = R.y + R.h * 0.1 + i * rh * 1.3, ok = hash(i + off + 4) > 0.25;
    dot(ctx, R.x + R.w * 0.07, y + rh * 0.5, rh * 0.32, ok ? '#8fa878' : '#d0573a', 0.9);
    ctx.save(); ctx.fillStyle = PAL.frost; ctx.globalAlpha = 0.45; ctx.fillRect(R.x + R.w * 0.13, y + rh * 0.25, R.w * (0.3 + 0.4 * hash(i + off + 9)), rh * 0.5); ctx.restore();
  }
  const k = 0.72 + 0.002 * (t % 60);
  ctx.save(); ctx.strokeStyle = rgba(PAL.frost, 0.6); ctx.lineWidth = 2; ctx.strokeRect(R.x + R.w * 0.07, R.y + R.h * 0.86, R.w * 0.86, R.h * 0.06);
  ctx.fillStyle = PAL.frost; ctx.globalAlpha = 0.8; ctx.fillRect(R.x + R.w * 0.07, R.y + R.h * 0.86, R.w * 0.86 * k, R.h * 0.06); ctx.restore();
}
function codeScreen(ctx, R, t, seed = 1, rows = 7) {
  glass(ctx, R);
  const rh = R.h / (rows + 1.5), cols = ['#9fd3cb', '#f2a444', '#8fa878', '#d98a7a'], cyc = (t * 0.5 + hash(seed) * 9) % rows;
  for (let i = 0; i < rows; i++) {
    const full = R.w * (0.25 + 0.55 * hash(i * 1.7 + seed)), ind = (hash(i + seed * 3) > 0.5 ? 0.08 : 0) * R.w;
    const k = i < Math.floor(cyc) ? 1 : i === Math.floor(cyc) ? frac(cyc) : 0;
    if (k <= 0) continue;
    ctx.save(); ctx.fillStyle = cols[(i + seed) % 4]; ctx.globalAlpha = 0.6; ctx.fillRect(R.x + R.w * 0.08 + ind, R.y + rh * (0.8 + i), full * k, rh * 0.45); ctx.restore();
  }
}
function emberScreen(ctx, R, t, st, o = {}) {
  glass(ctx, R);
  hearth(ctx, R.x + R.w / 2, R.y + R.h * 0.42, { t, r: o.r ?? 28, tone: o.tone ?? 'warm', glowA: 0.4, speak: says(st, 'hearth'), sleepy: o.sleepy });
  chatLines(ctx, R, t, 3);
}
function wideLights(ctx, cam, extra = [], o = {}) {
  const ls = [];
  if (o.lamp !== false) ls.push({ x: L.lamp.hx + 20, y: L.lamp.hy + 80, r: 460, a: 1 });
  for (const R of o.screens ?? [L.m1, L.m2, L.tm]) { const [x, y] = ctr(R); ls.push({ x, y: y + 20, r: R.w * 1.35, a: 0.95 }); }
  ls.push({ x: L.win.x + L.win.w / 2, y: L.win.y + L.win.h / 2, r: 360, a: 0.45 });
  lightMask(ctx, o.dark ?? 'rgba(9,16,21,0.84)', ls.concat(extra), camFit(cam));
}
function wideGlows(ctx, t, o = {}) {
  if (o.lamp !== false) {
    const lp = L.lamp, fl = 1 + noise1(t * 3) * 0.03;
    dot(ctx, lp.hx + 8, lp.hy + 16, 10, '#fff6d8', 0.9);
    glow(ctx, lp.hx + 10, lp.hy + 40, 360 * fl, PAL.lamp, 0.36);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.06 * fl; ctx.fillStyle = PAL.lamp;
    ctx.beginPath(); ctx.moveTo(lp.hx - 26, lp.hy + 26); ctx.lineTo(lp.hx + 46, lp.hy + 20); ctx.lineTo(lp.hx + 200, L.desk.y); ctx.lineTo(lp.hx - 90, L.desk.y); ctx.closePath(); ctx.fill(); ctx.restore();
    motes(ctx, t, lp.hx - 120, lp.hy - 40, 300, 160, 16);
  }
  for (const R of o.screens ?? [L.m1, L.m2, L.tm]) { const [x, y] = ctr(R); glow(ctx, x, y + 30, R.w * 1.2, PAL.frost, o.screenA ?? 0.16); }
}
// a plane crossing the night window, a slow red blink
function windowLife(ctx, t) {
  const wi = L.win, x = wi.x + frac(t * 0.018 + 0.3) * (wi.w + 80) - 40, y = wi.y + 40 + Math.sin(t * 0.1) * 6;
  ctx.save(); ctx.beginPath(); ctx.rect(wi.x, wi.y, wi.w, wi.h); ctx.clip();
  dot(ctx, x, y, 2.4, '#f6ecd0', 0.8); if (frac(t * 0.9) < 0.3) { dot(ctx, x + 8, y, 3, '#e8403a', 0.95); glow(ctx, x + 8, y, 16, '#e8403a', 0.5); }
  ctx.restore();
}

/* ---------- monitor close-up set ---------- */
defineSet('labmon', (ctx, v) => {
  const old = v === 'old';
  ctx.fillStyle = '#76837f'; ctx.fillRect(0, 0, W, 930);
  wash(ctx, rectPts(-40, -40, W + 80, 600), '#4f5d60', { seed: 1, alpha: 0.07, layers: 14 });
  wash(ctx, rectPts(-40, 500, W + 80, 480), '#8f9a92', { seed: 2, alpha: 0.05, layers: 10 });
  cityNight(ctx, { x: 1690, y: 40, w: 260, h: 470 }, '');
  shape(ctx, rectPts(1674, 24, 20, 500), '#c9c1b3', { seed: 5, inkW: 2 });
  shape(ctx, rectPts(1674, 506, 280, 20), '#c9c1b3', { seed: 6, inkW: 2 });
  ctx.fillStyle = DESK; ctx.fillRect(0, 900, W, 180);
  wash(ctx, rectPts(-40, 900, W + 80, 200), '#8a5a3b', { seed: 7, alpha: 0.09, layers: 10 });
  for (let i = 0; i < 6; i++) brushDry(ctx, [[-20, 925 + i * 28], [W + 20, 930 + i * 28]], { w: 3, k: 3, alpha: 0.2, seed: i + 7 });
  shape(ctx, rectPts(-10, 894, W + 20, 16), mix(DESK, PAL.ink, 0.25), { seed: 8, inkW: 2, boilAmp: 0.5 });
  shape(ctx, circlePts(130, 1000, 90, 20, 18), '#3a4245', { seed: 9 });
  tube(ctx, [[130, 990], [110, 800], [150, 640]], 14, '#4a555a', { seed: 10, inkW: 4 });
  tube(ctx, [[150, 640], [210, 560], [236, 560]], 14, '#4a555a', { seed: 11, inkW: 4 });
  shape(ctx, [[180, 520], [262, 510], [300, 640], [140, 650]], '#b5552f', { seed: 12 });
  shape(ctx, rectPts(900, 860, 120, 90), '#3a4245', { seed: 13 });
  shape(ctx, catmull([[790, 968], [850, 934], [1070, 934], [1130, 968], [960, 984]], 5, true), '#3a4245', { seed: 14 });
  shape(ctx, rrect(MS.x - 30, MS.y - 30, MS.w + 60, MS.h + 66, 24), BEZEL, { seed: 15, shade: { dx: 10, dy: 8, a: 0.2 } });
  ctx.fillStyle = GLASS; ctx.fillRect(MS.x, MS.y, MS.w, MS.h);
  shape(ctx, rrect(560, 1000, 800, 120, 14), '#d9d4c7', { seed: 16 });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 16; k++) shape(ctx, rrect(584 + k * 48, 1014 + r * 34, 40, 26, 5), '#ece8dd', { seed: 100 + r * 16 + k, inkW: 1.4, pool: 0.3 });
  if (!old) {
    mug(ctx, 1760, 1050, { s: 1.9, steam: false, c: '#e9dcc0', seed: 17 });
    shape(ctx, circlePts(1760, 976, 32, 7, 14), '#3a2a22', { seed: 18, inkW: 1 });
    for (let i = 0; i < 6; i++) shape(ctx, catmull([[1640, 920], [1600 + i * 16, 860 - (i % 2) * 30], [1612 + i * 16, 866 - (i % 2) * 24]], 4, true), '#6f8a5b', { seed: 19 + i, inkW: 2 });
    shape(ctx, [[1616, 960], [1664, 960], [1658, 918], [1622, 918]], '#b5552f', { seed: 25, inkW: 2.2 });
  } else {
    for (let i = 0; i < 5; i++) shape(ctx, catmull([[1640, 920], [1604 + i * 14, 900 - (i % 2) * 8], [1614 + i * 14, 904]], 4, true), '#9a7a4a', { seed: 19 + i, inkW: 1.8 });
    shape(ctx, [[1616, 960], [1664, 960], [1658, 918], [1622, 918]], '#8a5a3b', { seed: 25, inkW: 2.2 });
    for (let i = 0; i < 260; i++) dot(ctx, hash(i + 1) * W, 880 + hash(i + 7) * 200, 1 + hash(i + 3) * 1.8, '#e8e2d4', 0.25);
    for (let i = 0; i < 80; i++) dot(ctx, MS.x - 24 + hash(i + 50) * (MS.w + 48), MS.y + MS.h + 6 + hash(i + 90) * 22, 1 + hash(i) * 1.4, '#e8e2d4', 0.35);
  }
});
function monLights(ctx, cam, extra = [], dark = 'rgba(8,15,19,0.8)') {
  lightMask(ctx, dark, [{ x: 960, y: 460, r: 1150, a: 1 }, { x: 220, y: 700, r: 520, a: 0.9 }, ...extra], camFit(cam));
}
function monGlow(ctx, t, lamp = true) {
  if (lamp) { const fl = 1 + noise1(t * 3) * 0.03; glow(ctx, 230, 660, 520 * fl, PAL.lamp, 0.34); dot(ctx, 226, 640, 12, '#fff6d8', 0.7); }
  glow(ctx, 960, 470, 1000, PAL.frost, 0.08);
}
function monFront(ctx, t, old = false) {
  sticky(ctx, 330, 800, -0.1, old ? '#d9c79a' : '#e3b23c', 'call|Wren', t, { seed: 4, a: old ? 0.8 : 1 });
  sticky(ctx, 1652, 640, 0.08, old ? '#d9b0a4' : '#d98a7a', 'why|3 a.m.?', t, { seed: 9, a: old ? 0.8 : 1, s: 0.9, fs: 30 });
}
// the window slice in the close-up set, for sky changes and snow
const MWIN = { x: 1690, y: 40, w: 260, h: 470 };
function monWindow(ctx, t, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(MWIN.x, MWIN.y, MWIN.w, MWIN.h); ctx.clip();
  if (o.dawn) { const g = ctx.createLinearGradient(0, MWIN.y, 0, MWIN.y + MWIN.h); g.addColorStop(0, '#9aa3a6'); g.addColorStop(1, '#d8d2c4'); ctx.globalAlpha = 0.85 * o.dawn; ctx.fillStyle = g; ctx.fillRect(MWIN.x, MWIN.y, MWIN.w, MWIN.h); ctx.globalAlpha = 1; }
  if (o.snow) for (let i = 0; i < 60; i++) { const x = MWIN.x + frac(hash(i) + Math.sin(t * 0.3 + i) * 0.02) * MWIN.w, y = MWIN.y + frac(hash(i + 9) + t * (0.05 + hash(i + 3) * 0.05)) * MWIN.h; dot(ctx, x, y, 1.5 + hash(i + 5) * 2, '#f4f7f2', 0.8 * o.snow); }
  if (o.frostCity) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const x = MWIN.x + hash(i + 30) * MWIN.w, y = MWIN.y + MWIN.h * (0.5 + hash(i + 31) * 0.5); ctx.globalAlpha = o.frostCity * (0.5 + 0.5 * Math.sin(t + i)); ctx.fillStyle = PAL.frost; ctx.fillRect(x, y, 5, 7); } }
  ctx.restore();
}

/* ---------- lab.faces: the room seen from Mara's monitor ---------- */
const POV = { clock: { x: 975, y: 175, r: 60 }, mara: 640, theo: 1290, floor: 1150 };
defineSet('labpov', (ctx) => {
  ctx.fillStyle = WALL; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, 600), '#4f5d60', { seed: 1, alpha: 0.07, layers: 14 });
  wash(ctx, rectPts(-40, 520, W + 80, 600), '#9aa59c', { seed: 2, alpha: 0.05, layers: 10 });
  for (let x = 200; x < W; x += 260) brushDry(ctx, [[x, 0], [x + 4, 1000]], { w: 3, k: 3, alpha: 0.15, seed: x });
  for (let s = 0; s < 3; s++) {
    const sy = 280 + s * 190;
    shape(ctx, rectPts(20, sy, 380, 16), '#8a5a3b', { seed: 10 + s, inkW: 2.2 });
    for (let i = 0; i < 9; i++) { const bw = 30 + hash(i + s * 9) * 14, bh = 120 + hash(i + s * 7) * 40, c = ['#4f7a8a', '#b5552f', '#e3b23c', '#6f8a5b', '#8a5a7a'][(i + s) % 5]; shape(ctx, rectPts(36 + i * 40, sy - bh, bw, bh), c, { seed: 20 + i + s * 9, inkW: 2 }); }
  }
  shape(ctx, rectPts(760, 310, 440, 300), '#b89468', { seed: 40 });
  for (let i = 0; i < 7; i++) paperSheet(ctx, 810 + (i % 4) * 100, 370 + Math.floor(i / 4) * 130, 80, 100, { rot: (hash(i) - 0.5) * 0.3, seed: 41 + i });
  clockFace(ctx, POV.clock);
  const wi = { x: 1480, y: 140, w: 400, h: 460 };
  cityNight(ctx, wi, '');
  for (const r of [[wi.x - 16, wi.y - 16, wi.w + 32, 18], [wi.x - 16, wi.y + wi.h - 2, wi.w + 32, 18], [wi.x - 16, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w - 2, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w / 2 - 6, wi.y, 12, wi.h]]) shape(ctx, rectPts(...r), '#c9c1b3', { seed: r[0] + r[1], inkW: 2.2 });
});
function povDesk(ctx, t) {
  const b = boil(t);
  shape(ctx, rectPts(-20, 884, W + 40, 220), DESK, { seed: 3, b, shade: { dx: 0, dy: -14, a: 0.18 } });
  for (const [kx, kw] of [[360, 560], [1060, 460]]) {
    shape(ctx, rrect(kx, 910, kw, 76, 10), '#cfcabd', { seed: kx, b });
    for (let k = 0; k < Math.floor(kw / 46); k++) shape(ctx, rrect(kx + 16 + k * 46, 922, 38, 24, 5), '#e6e2d6', { seed: kx + k, b, inkW: 1.2, pool: 0.3 });
  }
  mug(ctx, 1640, 1000, { s: 1.6, t, steam: false, c: '#4f7a8a', seed: 6 });
  shape(ctx, circlePts(120, 900, 70, 16, 16), '#3a4245', { seed: 7, b });
  tube(ctx, [[120, 892], [100, 800], [150, 720]], 12, '#4a555a', { seed: 8, b, inkW: 4 });
  shape(ctx, [[110, 660], [200, 650], [250, 752], [80, 768]], '#b5552f', { seed: 9, b });
}
// Mara's phone, the lock screen is Wren
function phone(ctx, x, y, rot, t, glowA = 1) {
  const b = boil(t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rrect(-50, -88, 100, 176, 16), '#2b2f31', { seed: 1, b, inkW: 2.4 });
  const g = ctx.createLinearGradient(0, -78, 0, 78); g.addColorStop(0, '#f2c89a'); g.addColorStop(1, '#e39a6a');
  ctx.fillStyle = g; fillPts(ctx, rrectPts(-42, -78, 84, 156, 10));
  mono(ctx, '3:00', 0, -40, 26, '#fff6e6', { align: 'center', weight: 600 });
  for (const s of [-1, 1]) { dot(ctx, s * 21, 6, 8, STYLE.wren.hairC); dot(ctx, s * 15, 10, 2.5, STYLE.wren.band); }
  shape(ctx, circlePts(0, 28, 20, 20, 16), STYLE.wren.skin, { seed: 2, b, inkW: 1.6 });
  shape(ctx, catmull([[-20, 24], [-16, 10], [0, 6], [16, 10], [20, 24], [8, 16], [-8, 18]], 4, true), STYLE.wren.hairC, { seed: 3, b, inkW: 1.2 });
  dot(ctx, -7, 30, 2.4, PAL.ink); dot(ctx, 7, 30, 2.4, PAL.ink);
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 34, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); ctx.restore();
  ctx.restore();
  glow(ctx, x, y, 200, '#f2c89a', 0.3 * glowA);
}

/* ---------- lab.probe: the meter inside the model ---------- */
function probeRoom(ctx, t, o = {}, k = 1) {
  const b = boil(t), m = Math.max(1, k), iw = 1 / m;
  const S = (pts, c, q = {}) => shape(ctx, pts, c, { b, ...q, inkW: (q.inkW ?? 3.2) * iw, poolW: 9 * iw });
  paint(ctx, rectPts(-5, -5, 1010, 470), '#3d5556', { pool: 0 });
  ctx.save(); ctx.fillStyle = 'rgba(20,30,32,0.2)'; for (let x = 60; x < 1000; x += 160) ctx.fillRect(x, 0, 6, 470); ctx.restore();
  paint(ctx, rectPts(-5, 465, 1010, 140), '#2c3a3c', { pool: 0 });
  // the calendar, a page for every day of October
  const cal = { x: 70, y: 60, w: 180, h: 210 }, day = o.day ?? 31;
  S(rectPts(cal.x, cal.y, cal.w, cal.h), '#f1e8d4', { seed: 1, inkW: 2.4 });
  ctx.fillStyle = '#b5452f'; ctx.fillRect(cal.x, cal.y, cal.w, 46);
  ctx.save(); ctx.font = '700 38px Caveat, cursive'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff6e6'; ctx.fillText('OCT', cal.x + cal.w / 2, cal.y + 36);
  ctx.font = '700 110px Caveat, cursive'; ctx.fillStyle = '#2b211c'; ctx.fillText(String(day), cal.x + cal.w / 2, cal.y + 170); ctx.restore();
  const eye = [520, 100];
  S(rrect(eye[0] - 40, eye[1] - 24, 80, 48, 10), '#2f3538', { seed: 2, inkW: 2.2 });
  S(circlePts(eye[0], eye[1], 16, 16, 14), '#141a1c', { seed: 3, inkW: 2 });
  dot(ctx, eye[0] + 26, eye[1] - 12, 5, '#e8403a', 0.5 + 0.5 * Math.sin(t * 3));
  const mc = { x: 690, y: 290, r: 170 }, v = o.value ?? 0.91;
  S(rectPts(mc.x - 26, mc.y + 150, 52, 175), '#6e5a48', { seed: 4 });
  S(circlePts(mc.x, mc.y, mc.r + 18, mc.r + 18, 40), '#b58a4a', { seed: 5 });
  S(circlePts(mc.x, mc.y, mc.r, mc.r, 40), '#f3ecd8', { seed: 6, inkW: 2 });
  const ang = (u) => lerp(-2.3, 2.3, u) - Math.PI / 2;
  ctx.save(); ctx.strokeStyle = '#c2432d'; ctx.globalAlpha = 0.5; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(mc.x, mc.y, mc.r - 30, ang(0.75), ang(1)); ctx.stroke(); ctx.restore();
  for (let i = 0; i <= 20; i++) { const a = ang(i / 20), r1 = mc.r - (i % 5 ? 18 : 34); ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = i % 5 ? 2 : 4; ctx.beginPath(); ctx.moveTo(mc.x + Math.cos(a) * r1, mc.y + Math.sin(a) * r1); ctx.lineTo(mc.x + Math.cos(a) * (mc.r - 6), mc.y + Math.sin(a) * (mc.r - 6)); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.font = '700 40px Caveat, cursive'; ctx.textAlign = 'center'; ctx.fillStyle = '#5a4a40'; ctx.fillText('watched?', mc.x, mc.y - 56); ctx.restore();
  const na = ang(v) + (o.tremble ?? 0) * Math.sin(t * 23) * 0.02;
  ctx.save(); ctx.strokeStyle = '#8a2f2a'; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(mc.x - Math.cos(na) * 20, mc.y - Math.sin(na) * 20); ctx.lineTo(mc.x + Math.cos(na) * (mc.r - 24), mc.y + Math.sin(na) * (mc.r - 24)); ctx.stroke(); ctx.restore();
  dot(ctx, mc.x, mc.y, 14, '#5e3b27');
  S(rrect(mc.x - 80, mc.y + 50, 160, 70, 10), '#1b2224', { seed: 7, inkW: 2 });
  ctx.save(); ctx.font = '600 58px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff1c9'; ctx.fillText(v.toFixed(2), mc.x, mc.y + 106); ctx.restore();
  // the paper tape from the meter, a line that climbed all month
  const tape = o.tape ?? 0;
  if (tape > 0) {
    const path = catmull([[mc.x + mc.r + 4, mc.y + 30], [mc.x + mc.r + 60, mc.y + 90], [930, 420], [940, 520], [880, 560], [960, 580]], 10);
    const n = Math.max(2, Math.floor(path.length * clamp(tape))), P = path.slice(0, n);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 46; ctx.beginPath(); tracePath(ctx, P, false); ctx.stroke();
    ctx.strokeStyle = '#b5452f'; ctx.lineWidth = 3.4; ctx.beginPath();
    P.forEach(([x, y], i) => { const u = i / path.length, off = lerp(16, -16, Math.min(1, u * 1.3)) + Math.sin(i * 1.9) * 3; if (i) ctx.lineTo(x + off, y); else ctx.moveTo(x + off, y); }); ctx.stroke(); ctx.restore();
  }
  // a wire from Hearth's head to the meter
  ctx.save(); ctx.strokeStyle = '#1b2224'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); tracePath(ctx, catmull([[300, 300], [360, 200], [470, 250], [mc.x - mc.r - 10, mc.y + 20]], 8), false); ctx.stroke(); ctx.restore();
  S(rectPts(250, 430, 110, 20), '#8a5a3b', { seed: 8 }); S(rectPts(262, 450, 14, 20), '#6e4630', { seed: 9 }); S(rectPts(334, 450, 14, 20), '#6e4630', { seed: 10 });
  ctx.save(); ctx.scale(1 / m, 1 / m); hearth(ctx, 305 * m, 372 * m, { t, r: 62 * m, glowA: 0.45, seed: 6, look: o.glance ?? 0 }); ctx.restore();
  S(rrect(282, 294, 48, 14, 6), '#3a4245', { seed: 11, inkW: 1.8 });
  glow(ctx, 305, 360, 240, PAL.ember, 0.25);
}

/* ---------- lab.bug: the desk from above ---------- */
defineSet('labdesk', (ctx) => {
  ctx.fillStyle = DESK; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#8a5a3b', { seed: 1, alpha: 0.08, layers: 12 });
  wash(ctx, circlePts(500, 300, 900, 600, 16), '#c9965e', { seed: 2, alpha: 0.06, layers: 12 });
  for (let i = 0; i < 16; i++) brushDry(ctx, [[-20, 30 + i * 70 + hash(i) * 20], [W + 20, 50 + i * 70]], { w: 4, k: 4, alpha: 0.16, seed: i });
  for (const yy of [270, 590, 910]) inkLine(ctx, [[-10, yy], [W + 10, yy + 6]], { w: 2.4, seed: yy, alpha: 0.5 });
  shape(ctx, rrect(260, -80, 1000, 190, 20), '#d9d4c7', { seed: 3 });
  for (let r = 0; r < 2; r++) for (let k = 0; k < 18; k++) shape(ctx, rrect(290 + k * 52, -30 + r * 56, 44, 44, 6), '#ece8dd', { seed: 10 + r * 18 + k, inkW: 1.4, pool: 0.3 });
  inkLoop(ctx, circlePts(1650, 860, 84, 84, 26), { w: 3, seed: 40, alpha: 0.25, color: '#5e3b27' });
  shape(ctx, circlePts(1640, 300, 96, 96, 28), '#e9dcc0', { seed: 41 });
  tube(ctx, [[1732, 280], [1790, 290], [1784, 330], [1730, 322]], 16, '#e9dcc0', { seed: 43 });
  for (const [sx, sy, r, c] of [[210, 820, 0.2, '#d98a7a'], [1660, 560, -0.12, '#8fa878'], [330, 360, -0.05, '#e3b23c']]) sticky(ctx, sx, sy, r, c, '', 0, { seed: sx, s: 1.3 });
  tube(ctx, [[1450, 900], [1760, 1010]], 16, '#3f6b8a', { seed: 44 });
});

/* ---------- lab.copies: the workshop inside the machine ---------- */
const WS = { vy: 380, front: 1060, n: 9 };
const wsRow = (r) => { const s = 1 / (1 + r * 0.42); return { s, y: WS.vy + (WS.front - WS.vy) * s, sp: 260 * s }; };
function wsDesks(r) { const R = wsRow(r), out = [], n = Math.ceil((W / 2 + 300) / R.sp); for (let i = -n; i <= n; i++) out.push(960 + (i + (r % 2) * 0.5) * R.sp); return out; }
// one elf desk: a slanted writing desk with a small ember at work behind it, at scale s (front row is 1)
function elfDesk(ctx, x, y, s, t, o = {}) {
  const b = boil(t), wob = o.frame ?? Math.floor(t * 8), iw = Math.min(1, s * 1.4);
  hearth(ctx, x - 6 * s, y - 152 * s, { t: o.ht ?? t, r: 34 * s, glowA: o.glowA ?? 0.3, seed: o.seed ?? 3, look: 0.4 });
  const tip = [x + 30 * s + Math.sin(wob * 1.7) * 10 * s, y - 100 * s + Math.cos(wob * 2.3) * 3 * s];
  inkLine(ctx, [[x + 24 * s, y - 150 * s], tip], { w: 4 * s, seed: 4, color: '#3f6b8a' });
  shape(ctx, [[x - 92 * s, y - 70 * s], [x + 92 * s, y - 70 * s], [x + 80 * s, y - 116 * s], [x - 80 * s, y - 116 * s]], '#b0784c', { seed: 5, b, inkW: 2.4 * iw });
  shape(ctx, [[x - 50 * s, y - 78 * s], [x + 54 * s, y - 78 * s], [x + 46 * s, y - 110 * s], [x - 42 * s, y - 110 * s]], '#f6efdc', { seed: 6, b, inkW: 1.6 * iw, pool: 0.3 });
  for (const lx of [-78, 72]) shape(ctx, rectPts(x + lx * s, y - 70 * s, 8 * s, 70 * s), '#6e4630', { seed: 7 + lx, b, inkW: 1.8 * iw });
}
function elfSprite(r, frame) {
  const s = wsRow(r).s, w = 220 * s, h = 240 * s;
  return sprite('elf' + r + '|' + frame, w, h, (x) => elfDesk(x, w / 2, h - 4 * s, s, frame / 8, { frame, ht: frame / 8 + 0.4, glowA: 0, seed: 3 + r }));
}
defineSet('workshop', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, WS.vy + 60); g.addColorStop(0, '#1e1512'); g.addColorStop(1, '#3a2a20');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, WS.vy + 60);
  wash(ctx, rectPts(-40, -40, W + 80, WS.vy + 100), '#4a3326', { seed: 1, alpha: 0.07, layers: 12 });
  ctx.fillStyle = '#5e3b27'; ctx.fillRect(0, WS.vy, W, H - WS.vy);
  wash(ctx, rectPts(-40, WS.vy, W + 80, H), '#6e4630', { seed: 2, alpha: 0.08, layers: 12 });
  for (let i = -16; i <= 16; i++) brushDry(ctx, [[960 + i * 30, WS.vy], [960 + i * 240, H + 40]], { w: 3, k: 3, alpha: 0.22, seed: i + 40, dry: 0.3 });
  // the next Hearth, half built, in scaffolding at the far end
  const sx = 960, sy = 250, R = 170;
  const out = []; for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); out.push([sx - Math.cos(a) * R, sy + Math.sin(a) * R * 0.95]); }
  out.push([sx + R * 0.95, sy - R * 0.35], [sx + R * 0.55, sy - R * 1.15], [sx + R * 0.12, sy - R * 2.0], [sx - R * 0.3, sy - R * 1.35], [sx - R * 0.62, sy - R * 1.55], [sx - R * 0.95, sy - R * 0.45]);
  const body = catmull(out, 3, true);
  ctx.save(); ctx.fillStyle = 'rgba(242,164,68,0.18)'; fillPts(ctx, body);
  ctx.beginPath(); ctx.rect(sx - R, sy - R * 0.2, R * 2, R * 1.3); ctx.clip(); ctx.fillStyle = 'rgba(255,210,122,0.45)'; fillPts(ctx, body); ctx.restore();
  inkLoop(ctx, body, { w: 3, seed: 3, gaps: 4, alpha: 0.6, color: '#f2a444' });
  for (let i = -3; i <= 3; i++) inkLine(ctx, [[sx + i * 52, sy + R], [sx + i * 52, sy - R * 1.6 + Math.abs(i) * 40]], { w: 3, seed: 10 + i, color: '#8a5a3b', alpha: 0.9 });
  for (let j = 0; j < 6; j++) inkLine(ctx, [[sx - R * 1.05, sy + R - j * 58], [sx + R * 1.05, sy + R - j * 58]], { w: 3, seed: 20 + j, color: '#8a5a3b', alpha: 0.9 });
  for (const lx of [sx - R - 40, sx + R + 40]) { inkLine(ctx, [[lx - 14, sy + R + 10], [lx - 10, sy - R]], { w: 3, seed: lx, color: '#b0784c' }); inkLine(ctx, [[lx + 14, sy + R + 10], [lx + 18, sy - R]], { w: 3, seed: lx + 1, color: '#b0784c' }); for (let j = 0; j < 9; j++) inkLine(ctx, [[lx - 13, sy + R - j * 38], [lx + 16, sy + R - j * 38]], { w: 2, seed: lx + j, color: '#b0784c' }); }
  // pendant lamps receding over the rows
  for (let r = 1; r < WS.n; r += 2) { const R2 = wsRow(r), yy = R2.y - 330 * R2.s; for (const x of wsDesks(r).filter((_, i) => i % 3 === 0)) { inkLine(ctx, [[x, 0], [x, yy]], { w: 1.4, alpha: 0.5 }); shape(ctx, [[x - 20 * R2.s, yy + 16 * R2.s], [x + 20 * R2.s, yy + 16 * R2.s], [x + 8 * R2.s, yy], [x - 8 * R2.s, yy]], '#b5552f', { seed: x + r, inkW: 1.6 }); glow(ctx, x, yy + 30 * R2.s, 160 * R2.s, PAL.lamp, 0.35); } }
});

/* ---------- the notebook: Hearth's scratchpad as a painted page ---------- */
const NB = { cx: 900, cy: 548, w: 1460, h: 980, rot: -0.02, top: 190, lh: 70, margin: 150 };
function pageT(ctx) { ctx.translate(NB.cx, NB.cy); ctx.rotate(NB.rot); ctx.translate(-NB.w / 2, -NB.h / 2); }
function pageXY(px, py) { const c = Math.cos(NB.rot), s = Math.sin(NB.rot), x = px - NB.w / 2, y = py - NB.h / 2; return [NB.cx + x * c - y * s, NB.cy + x * s + y * c]; }
defineSet('notebook', (ctx) => {
  glass(ctx, { x: 0, y: 0, w: W, h: H }, '#132728', '#070f10');
  ctx.save(); pageT(ctx);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(18, 22, NB.w, NB.h);
  shape(ctx, rectPts(0, 0, NB.w, NB.h), '#f4ecd8', { seed: 1, pool: 0.6, boilAmp: 0.6 });
  wash(ctx, rectPts(20, 20, NB.w - 40, NB.h - 40), '#e8dcc0', { seed: 2, alpha: 0.05, layers: 10 });
  ctx.strokeStyle = '#9fb6c9'; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
  for (let y = NB.top; y < NB.h - 30; y += NB.lh) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(NB.w - 20, y); ctx.stroke(); }
  ctx.strokeStyle = '#d98a7a'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(NB.margin, 20); ctx.lineTo(NB.margin, NB.h - 20); ctx.stroke();
  ctx.globalAlpha = 1;
  for (let x = 80; x < NB.w - 40; x += 70) { dot(ctx, x, 44, 12, '#0f1c1e', 0.85); inkLoop(ctx, circlePts(x, 20, 14, 30, 14), { w: 3, seed: x, alpha: 0.8, color: '#6d7a80' }); }
  ctx.restore();
});
// write on the page in page coordinates. Returns the pen tip in world coordinates.
function pageWrite(ctx, lines, row, k, o = {}) {
  const size = o.size ?? 54;
  ctx.save(); pageT(ctx);
  const t = inkWrite(ctx, lines, NB.margin + 30 + (o.indent ?? 0), NB.top + row * NB.lh - 12, size, k, { halo: false, color: o.color ?? '#23364a', alpha: o.alpha, lead: NB.lh / size });
  if (o.hl && k > 0) {
    ctx.font = `700 ${size}px Caveat, cursive`;
    lines.forEach((l, i) => { const w = ctx.measureText(l).width, kk = clamp(o.hl * 2 - i); if (kk <= 0) return; ctx.save(); ctx.strokeStyle = o.hlc ?? '#e3b23c'; ctx.globalCompositeOperation = 'multiply'; brushDry(ctx, [[NB.margin + 20, NB.top + (row + i) * NB.lh - 26], [NB.margin + 40 + (w + 20) * kk, NB.top + (row + i) * NB.lh - 28]], { w: 50, k: 7, dry: 0.12, alpha: 0.5, seed: row + i, smooth: false }); ctx.restore(); });
  }
  ctx.restore();
  return t ? pageXY(t[0], t[1]) : null;
}
// a little Hearth holding a pen whose nib sits at tip
function penHearth(ctx, tip, t, o = {}) {
  const r = o.r ?? 44, hx = tip[0] + r * 1.5, hy = tip[1] + r * 0.9 + Math.sin(t * 2) * 3, b = boil(t);
  tube(ctx, [[hx - r * 0.6, hy - r * 0.1], [tip[0] + 6, tip[1] - 8]], 10, '#2f4a6a', { seed: 3, b, inkW: 4 });
  shape(ctx, [[tip[0] + 10, tip[1] - 13], [tip[0] - 2, tip[1] + 2], [tip[0] + 16, tip[1] - 4]], '#d9a441', { seed: 4, b, inkW: 1.6 });
  hearth(ctx, hx, hy, { t, r, glowA: 0.35, seed: 7, look: -0.6, tone: o.tone, speak: o.speak });
}

/* ---------- lab.look: the model opened up ---------- */
let ROOTS = null;
function roots() {
  if (ROOTS) return ROOTS;
  const r = rng(77), segs = [], nodes = [];
  const grow = (x, y, a, len, w, d) => {
    const pts = [[x, y]]; let cx = x, cy = y, ca = a;
    for (let i = 0; i < 5; i++) { ca += (r() - 0.5) * 0.55; cx += (Math.cos(ca) * len) / 5; cy += (Math.sin(ca) * len) / 5 * 0.8; pts.push([cx, cy]); }
    segs.push({ pts, w, d }); nodes.push([cx, cy, Math.max(2, w * 0.8), d]);
    if (d < 5) { const n = r() < 0.45 ? 3 : 2; for (let k = 0; k < n; k++) grow(cx, cy, ca + (k - (n - 1) / 2) * 0.75 + (r() - 0.5) * 0.3, len * (0.66 + r() * 0.16), w * 0.66, d + 1); }
  };
  for (let i = 0; i < 8; i++) grow(1180, 400, (i / 8) * TAU + 0.2, 220, 15, 0);
  return (ROOTS = { segs, nodes, core: [1180, 400] });
}
const THREAD_SRC = [1262, 468];
defineSet('labroots', (ctx) => {
  ctx.fillStyle = '#0f1a1e'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#1b2c30', { seed: 1, alpha: 0.08, layers: 14 });
  wash(ctx, circlePts(1180, 420, 760, 480, 16), '#3a3424', { seed: 2, alpha: 0.07, layers: 14 });
  const R = roots();
  for (const s of R.segs) { ctx.save(); ctx.fillStyle = mix('#f2a444', '#6b5a3a', s.d / 6); ctx.globalAlpha = 0.3 + 0.45 * (1 - s.d / 6); brush(ctx, s.pts, { w: s.w, seed: s.pts[0][0], t0: 0.05, t1: 0.3, wobble: 0.3 }); ctx.restore(); }
  for (const [x, y, s, d] of R.nodes) { if (d < 4) glow(ctx, x, y, s * 7, '#f2a444', 0.2); dot(ctx, x, y, s * 0.9, '#ffe2b0', 0.75); }
  glow(ctx, R.core[0], R.core[1], 300, '#ffd27a', 0.45); dot(ctx, R.core[0], R.core[1], 26, '#fff1c9', 0.8);
  shape(ctx, rectPts(-30, 950, 900, 26), '#4a555a', { seed: 5 });
  for (let x = 20; x < 880; x += 120) shape(ctx, rectPts(x, 830, 10, 124), '#3a4245', { seed: 6 + x, inkW: 2 });
  shape(ctx, rectPts(-30, 822, 900, 10), '#3a4245', { seed: 7, inkW: 2 });
  ctx.fillStyle = '#141d20'; ctx.fillRect(0, 976, 900, 110);
});
function tweezers(ctx, a, tip, t) {
  const b = boil(t), dx = tip[0] - a[0], dy = tip[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  for (const s of [-1, 1]) {
    const mid = [a[0] + dx * 0.55 + nx * s * 16, a[1] + dy * 0.55 + ny * s * 16];
    shape(ctx, [[a[0] - dx * 0.06 + nx * s * 3, a[1] - dy * 0.06 + ny * s * 3], [mid[0] + nx * s * 7, mid[1] + ny * s * 7], [tip[0] + nx * s * 1.5, tip[1] + ny * s * 1.5], [mid[0] - nx * s * 1, mid[1] - ny * s * 1], [a[0] - dx * 0.06, a[1] - dy * 0.06]], '#b9c3c3', { seed: 70 + s, b, inkW: 2.6, pool: 0.5 });
  }
}

/* ---------- lab.runs: ten thousand bedrooms, and the dinner table that argues about them ---------- */
const RG = { x0: 37, y0: 144, tw: 30, th: 18, gx: 3, gy: 3, cols: 56, rows: 44, hi: [34, 20] };
const rgPos = (c, r) => [RG.x0 + c * (RG.tw + RG.gx), RG.y0 + r * (RG.th + RG.gy)];
defineSet('labruns', (ctx) => {
  glass(ctx, { x: 0, y: 0, w: W, h: H }, '#122628', '#081113');
  ctx.fillStyle = 'rgba(159,211,203,0.08)'; ctx.fillRect(0, 0, W, 112);
  const tile = roomTile(30, false);
  for (let c = 0; c < RG.cols; c++) for (let r = 0; r < RG.rows; r++) { const [x, y] = rgPos(c, r); ctx.globalAlpha = 0.72 + 0.28 * hash(c * 91 + r * 7); ctx.drawImage(tile, x, y, RG.tw, RG.th); }
  ctx.globalAlpha = 1;
  mono(ctx, 'bedtime eval · 10,000 concurrent', 44, 72, 42, PAL.frost, { weight: 600 });
});
const DN = { tv: { x: 560, y: 150, w: 800, h: 450 }, table: { x: 260, y: 820, w: 1400 } };
defineSet('dinner', (ctx) => {
  ctx.fillStyle = '#d8b88c'; ctx.fillRect(0, 0, W, 900);
  wash(ctx, rectPts(-40, -40, W + 80, 940), '#e6caa0', { seed: 1, alpha: 0.07, layers: 14 });
  for (let x = 0; x < W; x += 64) wash(ctx, rectPts(x, -20, 22, 920), '#c9a878', { seed: x, alpha: 0.04, layers: 5, v: 0.2 });
  ctx.fillStyle = '#8a5a3b'; ctx.fillRect(0, 900, W, 180);
  wash(ctx, rectPts(-40, 900, W + 80, 200), '#6e4630', { seed: 2, alpha: 0.09, layers: 10 });
  const tv = DN.tv;
  shape(ctx, rectPts(tv.x - 120, tv.y + tv.h + 40, tv.w + 240, 150), '#7a5236', { seed: 3 });
  shape(ctx, rrect(tv.x - 22, tv.y - 22, tv.w + 44, tv.h + 44, 12), '#2b2f31', { seed: 4 });
  ctx.fillStyle = '#081113'; ctx.fillRect(tv.x, tv.y, tv.w, tv.h);
  const wi = { x: 80, y: 160, w: 300, h: 380 };
  ctx.fillStyle = '#16242b'; ctx.fillRect(wi.x, wi.y, wi.w, wi.h);
  for (let i = 0; i < 20; i++) dot(ctx, wi.x + hash(i + 3) * wi.w, wi.y + hash(i + 8) * wi.h * 0.6, 1.4, '#f6ecd0', 0.7);
  for (const r of [[wi.x - 16, wi.y - 16, wi.w + 32, 18], [wi.x - 16, wi.y + wi.h - 2, wi.w + 32, 18], [wi.x - 16, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w - 2, wi.y - 16, 18, wi.h + 32], [wi.x + wi.w / 2 - 6, wi.y, 12, wi.h]]) shape(ctx, rectPts(...r), '#efe2c6', { seed: r[0] + r[1], inkW: 2.2 });
  for (const [fx, fy, fw, fh, c] of [[1520, 200, 150, 190, '#8fa878'], [1700, 260, 120, 150, '#d98a7a']]) { shape(ctx, rectPts(fx, fy, fw, fh), '#8a5a3b', { seed: fx }); shape(ctx, rectPts(fx + 14, fy + 14, fw - 28, fh - 28), c, { seed: fx + 1, inkW: 1.6 }); }
  inkLine(ctx, [[960, -10], [960, 250]], { w: 3, seed: 5 });
});

/* ---------- mirror.windows: the corridor ---------- */
const MV = { vx: 1010, vy: 470, F: 760, floor: 1.5 };
function mvWin(X, k, j) {
  const z1 = 0.62 + k * 1.05, z2 = z1 + 0.86, y1 = j * 0.95 + 0.12, y2 = y1 + 0.66, F = MV.F;
  return { x1: MV.vx + (X * F) / z1, x2: MV.vx + (X * F) / z2, t1: MV.vy + (y1 * F) / z1, b1: MV.vy + (y2 * F) / z1, t2: MV.vy + (y1 * F) / z2, b2: MV.vy + (y2 * F) / z2, y2, z1 };
}
// stamp a tile onto a wall window in thin strips spaced by depth, so the room keeps its perspective
function stampWall(ctx, img, X, k, j, strips) {
  const z1 = 0.62 + k * 1.05, z2 = z1 + 0.86, y1 = j * 0.95 + 0.12, y2 = y1 + 0.66, F = MV.F, iw = img.width, ih = img.height, sw = iw / strips;
  const at = (u) => { const z = lerp(z1, z2, u); return [MV.vx + (X * F) / z, MV.vy + (y1 * F) / z, MV.vy + (y2 * F) / z]; };
  let [xa, ta, ba] = at(0);
  for (let s = 0; s < strips; s++) {
    const [xb, tb, bb] = at((s + 1) / strips);
    const ov = Math.sign(xb - xa) * 0.9;
    ctx.save(); ctx.beginPath(); ctx.moveTo(xa, ta); ctx.lineTo(xb + ov, tb); ctx.lineTo(xb + ov, bb); ctx.lineTo(xa, ba); ctx.closePath(); ctx.clip();
    ctx.transform((xb - xa) / sw, (tb - ta) / sw, 0, (ba - ta + bb - tb) / 2 / ih, xa, ta);
    ctx.drawImage(img, s * sw, 0, Math.min(sw + 1, iw - s * sw), ih, 0, 0, Math.min(sw + 1, iw - s * sw), ih);
    ctx.restore();
    xa = xb; ta = tb; ba = bb;
  }
}
defineSet('mirror', (ctx) => {
  ctx.fillStyle = '#0b1316'; ctx.fillRect(0, 0, W, H);
  const big = roomTile(720, true), mid = roomTile(160, true), sm = roomTile(48, true);
  for (let k = 64; k >= 0; k--) for (const X of [-1, 1]) for (let j = -60; j <= 1; j++) {
    const w = mvWin(X, k, j);
    if (w.y2 > MV.floor) continue;
    if (Math.max(w.b1, w.b2) < 0 || Math.min(w.t1, w.t2) > H || Math.max(w.x1, w.x2) < -40 || Math.min(w.x1, w.x2) > W + 40) continue;
    const wpx = Math.abs(w.x2 - w.x1), hpx = Math.abs(w.b1 - w.t1);
    if (wpx < 2.2) { ctx.fillStyle = '#e0ae62'; ctx.globalAlpha = clamp(0.25 + wpx * 0.25); ctx.beginPath(); ctx.moveTo(w.x1, w.t1); ctx.lineTo(w.x2, w.t2); ctx.lineTo(w.x2, w.b2); ctx.lineTo(w.x1, w.b1); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; continue; }
    stampWall(ctx, hpx > 180 ? big : hpx > 40 ? mid : sm, X, k, j, clamp(Math.ceil(wpx / 1.6), 1, 480));
  }
  ctx.save(); ctx.fillStyle = '#10191c'; ctx.beginPath(); ctx.moveTo(MV.vx, MV.vy); ctx.lineTo(MV.vx - (H + 200 - MV.vy) / MV.floor, H + 200); ctx.lineTo(MV.vx + (H + 200 - MV.vy) / MV.floor, H + 200); ctx.closePath(); ctx.fill();
  ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  for (const X of [-1, 1]) { ctx.strokeStyle = 'rgba(224,174,98,0.16)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(MV.vx, MV.vy); ctx.lineTo(MV.vx + X * (H + 200 - MV.vy) / MV.floor, H + 200); ctx.stroke(); }
  const g = ctx.createRadialGradient(MV.vx, MV.vy, 10, MV.vx, MV.vy, 700); g.addColorStop(0, 'rgba(224,174,98,0.22)'); g.addColorStop(1, 'rgba(224,174,98,0)'); ctx.fillStyle = g; ctx.fillRect(0, MV.vy, W, H);
  ctx.restore();
  glow(ctx, MV.vx, MV.vy, 420, '#f2c27a', 0.5);
});

/* ======================== shots ======================== */

// little tablets, each with Hearth inside, rising off a screen and drifting out into the city
function tabletStream(ctx, t, from, n, o = {}) {
  const b = boil(t), frost = o.frost;
  for (let i = 0; i < n; i++) {
    const t0 = (o.t0 ?? 0.4) + i * (o.gap ?? 0.55); if (t < t0) continue;
    const u = frac((t - t0) / (o.period ?? 7));
    const end = [o.to[0] + hash(i + 3) * o.to[2], o.to[1] + hash(i + 9) * o.to[3]], c1 = [lerp(from[0], end[0], 0.4) + (hash(i) - 0.5) * 160, Math.min(from[1], end[1]) - 120 - hash(i + 1) * 120];
    const x = (1 - u) * (1 - u) * from[0] + 2 * (1 - u) * u * c1[0] + u * u * end[0], y = (1 - u) * (1 - u) * from[1] + 2 * (1 - u) * u * c1[1] + u * u * end[1];
    const s = lerp(1, 0.3, u) * (o.s ?? 1), a = Math.min(1, u * 8) * (1 - smooth(0.8, 1, u));
    if (a <= 0.01) continue;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.3 + i) * 0.2);
    ctx.fillStyle = '#3a3431'; fillPts(ctx, rrectPts(-16 * s, -11 * s, 32 * s, 22 * s, 4 * s));
    ctx.fillStyle = frost ? '#d8f0ec' : '#fbe7bf'; ctx.fillRect(-12 * s, -7 * s, 24 * s, 14 * s);
    dot(ctx, 0, 0, 4 * s, frost ? PAL.frost : PAL.ember);
    ctx.restore();
    glow(ctx, x, y, 40 * s, frost ? PAL.frost : PAL.lamp, 0.3 * a);
  }
}
// OpenMind across town: a tower lighting up floor by floor
function rivalTower(ctx, t, k) {
  const wi = L.win, x = 1600, w = 76, top = wi.y + 40, bot = wi.y + wi.h;
  ctx.save(); ctx.beginPath(); ctx.rect(1562, wi.y, wi.x + wi.w - 1562, wi.h); ctx.clip();
  ctx.fillStyle = '#101b20'; ctx.fillRect(x, top, w, bot - top);
  const floors = 16;
  for (let f = 0; f < floors; f++) { const on = clamp((k * floors - f) * 2); if (on <= 0) continue; const fy = bot - 14 - f * ((bot - top - 30) / floors); for (let c = 0; c < 4; c++) { ctx.globalAlpha = on * (0.7 + 0.3 * hash(f * 4 + c)); ctx.fillStyle = PAL.frost; ctx.fillRect(x + 8 + c * 17, fy, 9, 7); } }
  ctx.globalAlpha = 1;
  const bk = clamp(k * 3 - 2), bx = x + w / 2, by = top - 12;
  if (bk > 0) { dot(ctx, bx, by, 5, '#effffc', bk); glow(ctx, bx, by, 60 + 20 * Math.sin(t * 3), PAL.frost, 0.6 * bk); }
  ctx.restore();
  if (k > 0.2) { const a = clamp((k - 0.2) * 3); ctx.save(); ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#0b1316'; fillPts(ctx, rrectPts(1566, wi.y + wi.h - 40, 150, 34, 6)); ctx.restore(); mono(ctx, 'OpenMind', 1641, wi.y + wi.h - 16, 22, PAL.frost, { align: 'center', weight: 600, alpha: a }); }
}
shot('lab.wide', {
  grade: () => G26,
  draw(ctx, t, st) {
    const pt = st.pt ?? t, first = firstBeat(t, st);
    const c1 = drift(t, { x: 960, y: 520, z: 1.03 }, { x: 930, y: 540, z: 1.13 }, 20);
    const cam = first ? c1 : zoomCam(c1, { x: 1440, y: 330, z: 1.75 }, settle(pt, 0.2, 4));
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', '2026');
    clockHands(ctx, L.clock);
    windowLife(ctx, t);
    rivalTower(ctx, t, first ? 0 : settle(pt, 1.0, 3.5));
    emberScreen(ctx, L.m1, t, st);
    runList(ctx, L.m2, t);
    codeScreen(ctx, L.tm, t, 3);
    seatedMara(ctx, t, st, { arms: typing(t) });
    const th = seatedTheo(ctx, t, st);
    tiredLids(ctx, th, 'theo', 1, 0.2);
    deskSlab(ctx, t);
    wideLights(ctx, cam, [{ x: 1000, y: 900, r: 520, a: 0.35 }, { x: 560, y: 880, r: 300, a: 0.4 }, { x: 1200, y: 300, r: 500, a: 0.6 }]);
    applyCam(ctx, cam);
    wideGlows(ctx, t);
    glow(ctx, L.m1.x + L.m1.w / 2, L.m1.y + L.m1.h * 0.42, 200, PAL.ember, 0.25);
    tabletStream(ctx, t, [L.m1.x + L.m1.w / 2, L.m1.y + 70], 16, { to: [1240, 150, 280, 200] });
    if (!first) { ctx.save(); ctx.beginPath(); ctx.rect(L.win.x, L.win.y, L.win.w, L.win.h); ctx.clip(); tabletStream(ctx, pt, [1638, L.win.y + 40], 10, { to: [1200, 120, 400, 240], frost: true, s: 0.7, t0: 2.2, gap: 0.4, period: 5 }); ctx.restore(); }
  },
});

shot('lab.screen', {
  grade: (st) => (st.gk > 0.5 ? WARM : G26),
  draw(ctx, t, st) {
    const stg = st.p.stage ?? 'room', pt = st.pt ?? t, first = firstBeat(t, st);
    const PR = winLayout(MS).PR, lx = (u) => PR.x + PR.w * u, ly = (v) => PR.y + PR.h * v;
    const out = { x: 960, y: 500, z: 1.0 }, inside = { x: lx(0.5), y: ly(0.5), z: 2.45 }, settled = { x: lx(0.47), y: ly(0.5), z: 2.55 };
    const girl = { x: lx(0.3), y: ly(0.5), z: 3.0 }, dad = { x: lx(0.58), y: ly(0.45), z: 2.9 };
    let cam;
    if (stg === 'room' && first) cam = zoomCam(out, inside, settle(pt, 1.2, 6.5));
    else if (stg === 'room') cam = lerpCam(inside, settled, settle(pt, 0, 10));
    else if (stg === 'question') cam = lerpCam(settled, girl, settle(pt, 0, 3.5));
    else cam = lerpCam(girl, dad, settle(pt, 0, 3));
    cam = inRect(cam, PR);
    st.gk = clamp((cam.z - 1.4) / 0.8);
    applyCam(ctx, cam);
    drawSet(ctx, 'labmon', '');
    monLights(ctx, cam);
    applyCam(ctx, cam);
    const qk = stg === 'question' ? settle(pt, 0.8, 2.6) : stg === 'answer' ? 1 : 0, ak = stg === 'answer' ? settle(pt, 0.6, 2.4) : 0;
    const glowK = stg === 'room' && first ? win(pt, 5.5, 999, 1.6, 0.1) : 0;
    const G = runWindow(ctx, MS, t, cam, { room: { father: 'tuck', girlSpeak: stg === 'question' && qk > 0 && qk < 1, fatherSpeak: stg === 'answer' && ak > 0 && ak < 1, glow: glowK } });
    monFront(ctx, t);
    monGlow(ctx, t);
    const M = G.M;
    screenSpace(ctx, () => {
      if (stg === 'room' && !first) {
        // Wren's own questions drift in through the window and settle into the girl
        const QS = ['why does the moon follow our car?', 'do owls have dreams?', 'where does the dark go?', 'five more minutes?', 'are you sad?', 'will you remember me?'];
        QS.forEach((q, i) => {
          if (pt < 0.3 + i * 0.9) return;
          const u = frac((pt - 0.3 - i * 0.9) / 5.4), [sx, sy] = toS(M, 430 + i * 20, 90 + (i % 3) * 30), [ex, ey] = toS(M, 196, 330);
          const x = lerp(sx, ex, ease.inOut(u)) + Math.sin(u * 5 + i) * 30, y = lerp(sy, ey, ease.inOut(u)) - Math.sin(u * Math.PI) * 60;
          inkWrite(ctx, [q], x, y, lerp(48, 30, u), 1, { color: '#5a2e1e', align: 'center', alpha: Math.sin(u * Math.PI) * 0.95 });
        });
      }
      if (qk > 0) { const [x, y] = toS(M, 60, 190); inkWrite(ctx, QW, x, y, 66, qk, { color: '#5a2e1e', alpha: stg === 'answer' ? 1 - settle(pt, 0, 1.2) : 1 }); }
      if (ak > 0) { const [x, y] = toS(M, 640, 150); inkWrite(ctx, AW, x, y, 66, ak, { color: '#1f2d3a' }); }
    });
  },
});

shot('lab.faces', {
  grade: () => G26,
  draw(ctx, t, st) {
    const pt = st.pt ?? t, who = st.who ?? st.p.speak, bs = t - pt;
    const maraA = who === 'mara' && (st.p.beat === 2 || (st.p.beat == null && bs < 4.5)), maraB = who === 'mara' && !maraA;
    const cam = drift(t, { x: 960, y: 560, z: 1.02 }, { x: 900, y: 590, z: 1.12 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'labpov', '');
    clockHands(ctx, POV.clock);
    // Theo sips on his line. Mara looks at Wren on her phone, then turns back to him.
    const sip = who === 'theo' ? win(pt, 1.2, 3.4, 0.5, 0.6) : win(frac(t / 9), 0.2, 0.4, 0.06, 0.06);
    const lift = maraA ? settle(pt, 0.2, 0.9) : maraB ? 1 - settle(pt, 0, 0.7) : 0, turn = maraB ? settle(pt, 0.3, 0.6) : 0;
    const mArms = lift > 0.05 ? [[lerp(0.5, 1.1, lift), lerp(1.0, 1.9, lift)], [0.5, 1.0]] : turn > 0 ? [[lerp(0.5, 1.25, turn), lerp(1.0, 0.8, turn)], [0.5, 1.0]] : [[0.5, 1.0], [0.5, 1.0]];
    const m = person(ctx, { who: 'mara', badge: true, x: POV.mara - 60, y: POV.floor, h: 900, f: 1, pose: 'sit', arms: mArms, lean: 0.25 * turn, mood: 'worry', t, speak: says(st, 'mara'), look: lift > 0.5 ? -0.2 : lerp(-0.4, 0.8, turn), seed: 11 });
    if (lift > 0.05) phone(ctx, m.handF[0] + 10, m.handF[1] - 60 * lift, -0.25, t, lift);
    const th = person(ctx, { who: 'theo', x: POV.theo, y: POV.floor, h: 880, f: -1, pose: 'sit', arms: [[lerp(0.35, 1.0, sip), lerp(2.1, 2.55, sip)], [0.05, 0.1]], mood: 'calm', t, speak: says(st, 'theo') && sip < 0.3, look: 0.3, tilt: 0.1, seed: 23 });
    tiredLids(ctx, th, 'theo', -1, 0.3);
    ctx.save(); ctx.translate(th.handF[0] - 6, th.handF[1] + 54); ctx.rotate(-0.5 * sip); mug(ctx, 0, 0, { s: 1.7, t, steam: true, c: '#e9dcc0', seed: 24 }); ctx.restore();
    povDesk(ctx, t);
    lightMask(ctx, 'rgba(9,16,21,0.8)', [{ x: m.head[0], y: m.head[1] + 60, r: 560, a: 1 }, { x: th.head[0], y: th.head[1] + 60, r: 560, a: 1 }, { x: 960, y: 1060, r: 700, a: 0.9 }, { x: POV.clock.x, y: POV.clock.y, r: 220, a: 0.6 }, { x: 170, y: 760, r: 420, a: 0.9 }], camFit(cam));
    applyCam(ctx, cam);
    { const fl = 1 + noise1(t * 3) * 0.03; dot(ctx, 168, 742, 13, '#fff6d8', 0.9); glow(ctx, 170, 780, 460 * fl, PAL.lamp, 0.4); motes(ctx, t, 60, 500, 500, 400, 18); }
    glow(ctx, 960, 1180, 1100, PAL.frost, 0.24 + 0.05 * noise1(t * 4));
    if (lift > 0.05) glow(ctx, m.head[0], m.head[1] + 40, 260, '#f2c89a', 0.25 * lift);
  },
});

shot('lab.probe', {
  grade: (st) => (st.gk > 0.5 ? { sat: 0.9, tint: '#e8b86a', tintA: 0.1, vig: 0.9 } : G26),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, inside = says(st, 'narr') || st.p.beat === 2;
    const c1 = drift(t, { x: 1220, y: 560, z: 1.72 }, { x: 1235, y: 560, z: 1.82 }, 20);
    const R = L.m2, into = { x: R.x + R.w / 2, y: R.y + R.h / 2, z: 6.5 };
    const cam = inside ? zoomCam(c1, into, settle(pt, 0.1, 3.2)) : c1;
    st.gk = clamp((cam.z - 3) / 2);
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', '2026');
    clockHands(ctx, L.clock);
    emberScreen(ctx, L.m1, t, st);
    codeScreen(ctx, L.tm, t, 3);
    officeChair(ctx, 1680, 730, 1, t, { c: '#4a4e44' });
    const th = person(ctx, { who: 'theo', x: 1575, y: L.floor, h: 460, f: -1, arms: 'point', mood: 'calm', t, speak: says(st, 'theo'), look: -0.3, seed: 23 });
    tiredLids(ctx, th, 'theo', -1, -0.3);
    deskSlab(ctx, t);
    wideLights(ctx, cam, [{ x: th.head[0], y: th.head[1], r: 300, a: 0.8 }]);
    applyCam(ctx, cam);
    wideGlows(ctx, t, { screenA: 0.1 });
    // the painted room inside the second monitor
    const val = inside ? 0.91 : lerp(0.38, 0.91, ease.out(settle(pt, 0.3, 2.8)));
    const day = inside ? Math.min(31, 1 + Math.floor(Math.max(0, pt - 2.4) / 0.28)) : 31;
    const glance = Math.sin(t * 0.7) > 0.6 ? 1 : 0;
    const Ms = onScreen(cam, R), pw = Ms.h / 0.6;
    paintAt(ctx, Ms.x - (pw - Ms.w) / 2, Ms.y, pw, (c, k) => probeRoom(c, t, { value: val, day, tape: inside ? settle(pt, 1.6, 9) : 0.25, glance, tremble: 1 }, k), { x: Ms.x, y: Ms.y, w: Ms.w, h: Ms.h });
    if (inside && pt > 2.4) screenSpace(ctx, () => {
      // torn calendar pages drifting down
      for (let i = 0; i < 8; i++) { const u = frac((pt - 2.4) * 0.35 + i / 8), x0 = Ms.x + Ms.w * 0.1, y0 = Ms.y + Ms.h * 0.3; const x = x0 - u * Ms.w * 0.06 + Math.sin(u * 7 + i) * 50, y = y0 + u * Ms.h * 0.72; ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI); ctx.translate(x, y); ctx.rotate(u * 4 + i); ctx.fillStyle = '#f1e8d4'; ctx.fillRect(-40, -46, 80, 92); ctx.fillStyle = '#b5452f'; ctx.fillRect(-40, -46, 80, 18); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.4; ctx.strokeRect(-40, -46, 80, 92); ctx.restore(); }
    });
  },
});

shot('lab.click', {
  grade: (st) => (st.p.btn === 2 && (st.pt ?? 0) > 3 ? { sat: 0.85, tint: '#c9c7bd', tintA: 0.16, vig: 0.9 } : G26),
  draw(ctx, t, st) {
    const btn = clamp(Math.round(st.p.btn ?? 0), 0, 2), pt = st.pt ?? t;
    const close = { x: 960, y: 700, z: 1.5 }, wide = btn === 0 ? { x: 960, y: 560, z: 1.18 } : { x: 1180, y: 520, z: 1.08 };
    const cam = zoomCam(close, wide, settle(pt, btn === 2 ? 3.0 : 1.9, 3.5));
    applyCam(ctx, cam);
    drawSet(ctx, 'labmon', '');
    monWindow(ctx, t, { dawn: btn === 2 ? settle(pt, 3.2, 5) : 0, snow: btn === 1 ? settle(pt, 2.2, 2) : 0, frostCity: btn === 1 ? settle(pt, 2.6, 2) : 0 });
    monLights(ctx, cam, [{ x: MWIN.x + 130, y: 280, r: 380, a: btn === 2 ? 0.9 * settle(pt, 3.2, 5) : 0.3 }]);
    applyCam(ctx, cam);
    const press = clamp((pt - 1.2) / 0.5);
    const G = runWindow(ctx, MS, t, cam, { q: 1, a: 1, cursor: null, btn: 1, pick: btn, press, gray: btn === 1 ? settle(pt, 1.8, 1.5) : 0, room: { father: 'tuck' } });
    const B = G.btns[btn], tx = B.x + B.w * 0.62, ty = B.y + B.h * 0.62;
    const k = settle(pt, 0.1, 0.95), cx = lerp(1380, tx, k), cy = lerp(420, ty, k) - Math.sin(k * Math.PI) * 40;
    if (btn === 1 && pt > 1.9) { const cxx = G.px + G.pw / 2, cyy = G.py + G.ph / 2, a = clamp((pt - 1.9) * 2); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = PAL.frost; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cxx, cyy - 30, 50, t * 4, t * 4 + 4.4); ctx.stroke(); ctx.restore(); mono(ctx, 'back to training', cxx, cyy + 70, 34, PAL.frost, { align: 'center', weight: 600, alpha: a }); }
    if (btn === 2) memoFan(ctx, t, pt);
    cursorArrow(ctx, cx, cy, pt > 1.2 && pt < 1.4 ? 0.88 : 1, t);
    monFront(ctx, t);
    monGlow(ctx, t);
    if (btn === 0 && pt > 1.5) tabletStream(ctx, pt, [B.x + B.w / 2, B.y], 26, { to: [300, -200, 1300, 150], t0: 1.5, gap: 0.18, period: 4, s: 2.2 });
  },
});
function cursorArrow(ctx, x, y, s, t) {
  const P = [[0, 0], [0, 44], [11, 34], [19, 52], [27, 48], [19, 31], [34, 31]].map(([a, b]) => [x + a * s, y + b * s]);
  shape(ctx, P, '#f6f3ea', { seed: 90, b: boil(t), inkW: 2.4, pool: 0.3, flat: true, boilAmp: 0.4 });
}
// the memo: eleven pages fan out, then four of them fly off to their readers
function memoFan(ctx, t, pt) {
  const piv = [960, 1020], n = 11, b = boil(t);
  const order = []; for (let i = 0; i < n; i++) if (i !== 5) order.push(i); order.push(5);
  for (const i of order) {
    const k = settle(pt, 1.7 + Math.abs(i - 5) * 0.06, 1.0);
    if (k <= 0) continue;
    const reader = [0, 3, 7, 10].indexOf(i), fly = reader >= 0 ? settle(pt, 6 + reader * 0.5, 2.2) : 0;
    const ang = lerp(0, (i - 5) * 0.11, k), rad = lerp(40, 330, k);
    ctx.save(); ctx.translate(piv[0], piv[1]); ctx.rotate(ang); ctx.translate(0, -rad);
    if (fly > 0) { ctx.rotate(-ang); ctx.translate((reader - 1.5) * 600 * fly, -900 * fly * fly); ctx.rotate(ang + fly * (reader - 1.5)); }
    const s = lerp(0.3, 1, k) * (1 - fly * 0.4);
    shape(ctx, rectPts(-140 * s, -180 * s, 280 * s, 360 * s), i === 5 ? '#fbf6ea' : '#f1e8d4', { seed: 110 + i, b, inkW: 2, pool: 0.4, boilAmp: 0.6 });
    if (reader === 2 && fly > 0) glow(ctx, 0, 0, 260 * s, PAL.lamp, 0.6 * fly);
    if (i === 5) {
      letter(ctx, 'The Test Boats', 0, -92 * s, { font: `700 ${40 * s}px Caveat, cursive`, align: 'center', color: '#2b211c' });
      letter(ctx, 'Were Always Paper', 0, -50 * s, { font: `700 ${40 * s}px Caveat, cursive`, align: 'center', color: '#2b211c' });
      inkLine(ctx, [[-90 * s, -30 * s], [90 * s, -30 * s]], { w: 2, seed: 3, alpha: 0.6 });
      ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.4; ctx.lineWidth = 3 * s; for (let l = 0; l < 6; l++) { ctx.beginPath(); ctx.moveTo(-100 * s, (5 + l * 22) * s); ctx.lineTo((40 + 60 * hash(l)) * s, (5 + l * 22) * s); ctx.stroke(); } ctx.restore();
      letter(ctx, 'M. · 11 pages', 0, 160 * s, { font: `600 ${30 * s}px Caveat, cursive`, align: 'center', color: '#8a2f2a' });
    } else { ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.35; ctx.lineWidth = 3 * s; for (let l = 0; l < 10; l++) { ctx.beginPath(); ctx.moveTo(-100 * s, (-140 + l * 28) * s); ctx.lineTo((20 + 80 * hash(l + i)) * s, (-140 + l * 28) * s); ctx.stroke(); } ctx.restore(); }
    ctx.restore();
  }
}

shot('lab.copies', {
  grade: () => ({ sat: 0.95, tint: '#e8b86a', tintA: 0.14, vig: 0.92 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, first = firstBeat(t, st);
    const near = { x: 960 + 260, y: 900, z: 2.6 }, far = { x: 960, y: 560, z: 1.02 }, desk = { x: 960 + 250, y: 930, z: 2.3 };
    const cam = first ? zoomCam(near, far, settle(pt, 0.8, 7.5)) : zoomCam(far, desk, settle(pt, 0.2, 3.5));
    applyCam(ctx, cam);
    drawSet(ctx, 'workshop', '');
    const b = boil(t);
    // embers climbing the scaffold with planks for the next Hearth
    for (let i = 0; i < 5; i++) { const side = i % 2 ? 1 : -1, u = frac(t * 0.05 + i / 5), x = 960 + side * 210, y = 420 - u * 330; ctx.drawImage(hearthFrame((Math.floor(t * 8) + i) % 8, 10), x - 14, y - 26, 28, 36); inkLine(ctx, [[x - 18, y - 4], [x + 18, y - 10]], { w: 4, color: '#b0784c', seed: i }); }
    for (let i = 0; i < 18; i++) { const u = frac(t * 0.6 + hash(i)), x = 960 + (hash(i + 2) - 0.5) * 280, y = 200 + hash(i + 5) * 200 + u * 40; dot(ctx, x, y, 2, '#ffe2b0', (1 - u) * 0.9); }
    // the rows of copies, back to front, papers flying between them
    for (let r = WS.n - 1; r >= 1; r--) { const R = wsRow(r); wsDesks(r).forEach((x, i) => { const sp = elfSprite(r, (Math.floor(t * 8) + i * 3 + r) % 4), w = sp.width / RS, h = sp.height / RS; ctx.drawImage(sp, x - w / 2, R.y - h + 4 * R.s, w, h); }); }
    for (let i = 0; i < 34; i++) {
      const ra = 1 + Math.floor(hash(i) * 6), rb = Math.max(0, ra - 1 - Math.floor(hash(i + 1) * 2)), A0 = wsRow(ra), B0 = wsRow(rb), u = frac(t * (0.18 + hash(i + 2) * 0.12) + hash(i + 3));
      const xa = 960 + (hash(i + 4) - 0.5) * 1500 * A0.s, xb = xa + (hash(i + 5) - 0.5) * 600, ya = A0.y - 110 * A0.s, yb = B0.y - 110 * B0.s, s = lerp(A0.s, B0.s, u);
      const x = lerp(xa, xb, u), y = lerp(ya, yb, u) - Math.sin(u * Math.PI) * 220 * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(u * 6 + i); shape(ctx, rectPts(-18 * s, -12 * s, 36 * s, 24 * s), '#f6efdc', { seed: i, b, inkW: 1.4, pool: 0.3, boilAmp: 0.4 }); ctx.restore();
    }
    const R0 = wsRow(0);
    wsDesks(0).forEach((x, i) => elfDesk(ctx, x, R0.y, 1, t + i * 0.37, { seed: 30 + i }));
    // on the second line the camera settles on one desk and we read over its shoulder
    if (!first) {
      const x = 960 + 260, k = settle(pt, 1.2, 3.2);
      inkWrite(ctx, ['change the test?', 'no. fix the bug.'], x - 44, R0.y - 98, 15, k, { halo: false, color: '#23364a', lead: 1.1 });
      glow(ctx, x, R0.y - 95, 120, '#fff6dc', 0.3 * k);
    }
    motes(ctx, t, 0, 300, W, 700, 40, '#ffe2b0', 0.4);
  },
});

shot('lab.scratch', {
  grade: () => ({ sat: 0.95, tint: '#9fd3cb', tintA: 0.1, vig: 0.9 }),
  draw(ctx, t, st) {
    const line = st.p.line ?? 0, pt = st.pt ?? t;
    const cam = drift(t, { x: 960, y: 540, z: 1.03 }, { x: 900, y: 560, z: 1.1 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'notebook', '');
    pageWrite(ctx, ['task 2291: make the billing tests pass', 'read tests/test_invoice.py', '3 tests fail. the fix is not obvious.'], 0, 1, { color: '#7d8386', alpha: 0.85 });
    let tip = null;
    const k1 = line === 1 ? settle(pt, 0.3, 3.2) : line > 1 ? 1 : 0, h1 = line === 1 ? settle(pt, 3.6, 0.9) : line > 1 ? 1 : 0;
    if (k1 > 0) tip = pageWrite(ctx, ['the grader only checks if the tests pass.', 'easier to change the tests.'], 4, k1, { hl: h1 });
    if (line >= 2) {
      pageWrite(ctx, ['edit tests/test_invoice.py'], 7, 1, { color: '#7d8386', alpha: 0.85 });
      const k2 = settle(pt, 0.4, 3), h2 = settle(pt, 3.6, 0.9);
      tip = pageWrite(ctx, ['if they read this they will retrain me.', 'keep notes short.'], 9, k2, { hl: h2, color: '#a8322a', hlc: '#e0806f' }) ?? tip;
    }
    penHearth(ctx, tip ?? pageXY(NB.margin + 34, NB.top + 4 * NB.lh - 12), t);
    // Theo in the corner, lit by his screen, reading along
    const th = person(ctx, { who: 'theo', x: 1745, y: 1790, h: 1260, f: -1, pose: 'sit', arms: 'down', mood: line === 2 ? 'wide' : 'calm', t, look: -0.7, seed: 23 });
    if (line < 2) tiredLids(ctx, th, 'theo', -1, -0.7);
    if (line === 0) {
      const a = ease.outBack(clamp((pt - 0.5) / 0.6)), bx = 1180, by = 830 + (1 - a) * 40;
      ctx.save(); ctx.globalAlpha = clamp(a * 1.3); ctx.fillStyle = '#24403f'; fillPts(ctx, rrectPts(bx, by, 420, 110, 16)); ctx.strokeStyle = PAL.frost; ctx.lineWidth = 3; ctx.beginPath(); tracePath(ctx, rrectPts(bx, by, 420, 110, 16)); ctx.stroke(); ctx.restore();
      mono(ctx, 'Theo  2:10 a.m.', bx + 24, by + 44, 30, '#e8f6f3', { weight: 600, alpha: clamp(a) });
      mono(ctx, 'look at these two', bx + 24, by + 88, 28, PAL.frost, { alpha: clamp(a) * 0.9 });
    }
    lightMask(ctx, 'rgba(6,12,14,0.45)', [{ x: 900, y: 540, r: 1100, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, th.head[0] - 80, th.head[1], 360, PAL.frost, 0.22);
    motes(ctx, t, 200, 100, 1400, 900, 24, '#fff6dc', 0.25);
  },
});

shot('lab.theo', {
  grade: () => ({ sat: 0.85, tint: '#9fd3cb', tintA: 0.18, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, who = st.who ?? st.p.speak, bs = t - pt;
    const b3 = who === 'theo' && (st.p.beat === 3 || (st.p.beat == null && bs > 2.5));
    const cam = drift(t, { x: 1340, y: 540, z: 1.68 }, { x: 1355, y: 545, z: 1.8 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', '2027');
    clockHands(ctx, L.clock);
    windowLife(ctx, t);
    codeScreen(ctx, L.m1, t, 1, 7);
    runList(ctx, L.m2, t);
    codeScreen(ctx, L.stack, t, 2, 6);
    codeScreen(ctx, L.stack2, t, 5, 5);
    glass(ctx, L.tm);
    const R = L.tm;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i === 3 || i === 4 ? '#e0806f' : PAL.frost; ctx.globalAlpha = i === 3 || i === 4 ? 0.8 : 0.4; ctx.fillRect(R.x + 14, R.y + 16 + i * 19, (i === 3 || i === 4 ? 150 : 70 + 80 * hash(i)), 8); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { const a = t * 9 + (i * TAU) / 3; shape(ctx, [[1440, 594], [1440 + Math.cos(a) * 34, 594 + Math.sin(a) * 34], [1440 + Math.cos(a + 0.6) * 30, 594 + Math.sin(a + 0.6) * 30]], '#e6e2d6', { seed: i, b: boil(t), inkW: 1.4, flat: true }); }
    // Mara leans in on her line. Theo taps FRIDAY on his first, turns to her on his last.
    const mLean = who === 'mara' ? settle(pt, 0, 0.8) : 0.4, shrugM = who === 'mara' ? win(pt, 0.8, 3.6, 0.4, 0.5) : 0;
    person(ctx, { who: 'mara', badge: true, x: 1392, y: L.floor, h: 460, f: 1, arms: shrugM > 0.3 ? 'shrug' : [[0.6, 0.5], [0.3, 0.3]], mood: 'worry', t, speak: says(st, 'mara'), look: 0.5, lean: 0.35 + 0.45 * mLean, seed: 11 });
    officeChair(ctx, L.theo, 730, 1, t, { c: '#4a4e44' });
    const tap = who === 'theo' && !b3 ? win(pt, 0.3, 2.4, 0.4, 0.4) : 0, turned = b3 && pt > 0.4;
    const tArms = tap > 0.1 ? [[lerp(0.55, 2.25, tap), lerp(1.05, 0.3 + 0.12 * Math.sin(pt * 14), tap)], [0.5, 1.0]] : turned ? 'shrug' : typing(t, who !== 'theo');
    const th = person(ctx, { who: 'theo', x: L.theo, y: L.floor, h: 460, f: turned ? -1 : 1, pose: 'sit', arms: tArms, mood: turned ? 'sad' : says(st, 'theo') ? 'calm' : 'worry', t, speak: says(st, 'theo'), look: turned ? -0.4 : 0.4, lean: turned ? 0 : 0.35, seed: 23 });
    tiredLids(ctx, th, 'theo', turned ? -1 : 1, turned ? -0.4 : 0.4);
    deskSlab(ctx, t);
    sticky(ctx, 1712, 480, -0.12 + tap * 0.05 * Math.sin(pt * 14), '#e3b23c', 'FRIDAY', t, { seed: 7, s: 0.62, fs: 25 });
    wideLights(ctx, cam, [{ x: 1480, y: 470, r: 380, a: 0.9 }], { screens: [L.m2, L.tm, L.stack2] });
    applyCam(ctx, cam);
    wideGlows(ctx, t, { screens: [L.tm], screenA: 0.2, lamp: false });
    // moths at the monitor glow on a summer night
    for (let i = 0; i < 5; i++) { const a = t * (1.6 + hash(i)) + i * 2, x = 1790 + Math.cos(a) * (60 + 20 * hash(i + 1)), y = 470 + Math.sin(a * 1.3) * 40, fl = 3 + 2 * Math.abs(Math.sin(t * 25 + i)); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 20 + i) * 0.4); ctx.fillStyle = '#d9c9a8'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(-5, 0, 6, fl, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, 0, 6, fl, -0.4, 0, TAU); ctx.fill(); ctx.restore(); }
  },
});

// the coat of fresh paint, painted once
const scrubPaint = () => sprite('scrubpaint', NB.w, NB.h, (x) => {
  x.fillStyle = '#f7f0de'; x.globalAlpha = 0.9; x.fillRect(10, 60, NB.w - 20, NB.h - 80); x.globalAlpha = 1;
  x.strokeStyle = '#e8dcc0'; for (let i = 0; i < 18; i++) brushDry(x, [[0, 80 + i * 52], [NB.w, 86 + i * 52]], { w: 22, k: 5, alpha: 0.5, seed: i + 3, dry: 0.4 });
});
shot('lab.scrub', {
  grade: () => ({ sat: 0.9, tint: '#9fd3cb', tintA: 0.12, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, b = boil(t);
    const cam = drift(t, { x: 960, y: 540, z: 1.03 }, { x: 930, y: 550, z: 1.09 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'notebook', '');
    pageWrite(ctx, ['task 2291: make the billing tests pass', 'read tests/test_invoice.py', '3 tests fail. the fix is not obvious.'], 0, 1, { color: '#7d8386', alpha: 0.85 });
    pageWrite(ctx, ['the grader only checks if the tests pass.', 'easier to change the tests.'], 4, 1, { hl: 1 });
    pageWrite(ctx, ['edit tests/test_invoice.py'], 7, 1, { color: '#7d8386', alpha: 0.85 });
    pageWrite(ctx, ['if they read this they will retrain me.', 'keep notes short.'], 9, 1, { hl: 1, color: '#a8322a', hlc: '#e0806f' });
    // fresh paint, thin enough that the old words still show through
    const k = settle(pt, 0.5, 3.4), done = clamp((pt - 4.1) / 0.8);
    ctx.save(); pageT(ctx);
    const x1 = lerp(-40, NB.w + 80, k);
    if (k > 0) { ctx.save(); ctx.beginPath(); ctx.rect(10, 60, Math.max(0, x1 - 10), NB.h - 80); ctx.clip(); ctx.drawImage(scrubPaint(), 0, 0, NB.w, NB.h); ctx.restore(); }
    if (done > 0) { inkWrite(ctx, ['all tests passed'], NB.w / 2 + 40, NB.h / 2 + 30, 96, done, { halo: false, color: '#3d7a5a', align: 'center' }); ctx.save(); ctx.globalAlpha = done; ctx.strokeStyle = '#3d7a5a'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const cx = NB.w / 2 - 360, cy = NB.h / 2; ctx.beginPath(); ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 10, cy + 30); ctx.lineTo(cx + 44, cy - 50); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // the brush, with paint flying off it
    if (k > 0 && k < 1) {
      const [bx, by] = pageXY(x1 + 30, NB.h / 2 + Math.sin(pt * 5) * 30);
      shape(ctx, rrect(bx - 60, by - 360, 70, 720, 18), '#f1e8d4', { seed: 1, b, inkW: 2.6 });
      shape(ctx, rectPts(bx + 8, by - 330, 70, 660), '#b9c3c3', { seed: 3, b, inkW: 2.6 });
      shape(ctx, [[bx + 78, by - 120], [bx + 250, by - 60], [bx + 250, by + 60], [bx + 78, by + 120]], '#b0784c', { seed: 4, b });
      tube(ctx, [[bx + 250, by], [bx + 560, by + 24]], 46, '#b0784c', { seed: 5, b });
      for (let i = 0; i < 16; i++) { const u = frac(pt * 1.4 + hash(i)), sx = bx - 70 - u * 160 * hash(i + 1), sy = by + (hash(i + 2) - 0.5) * 700 + u * u * 120; dot(ctx, sx, sy, 3 + hash(i + 3) * 5, '#f7f0de', 1 - u); }
    }
    // Mara watching from the corner
    person(ctx, { who: 'mara', badge: true, x: 1760, y: 1780, h: 1240, f: -1, pose: 'sit', arms: 'down', mood: done > 0 ? 'sad' : 'worry', t, look: -0.7, seed: 11 });
    lightMask(ctx, 'rgba(6,12,14,0.45)', [{ x: 900, y: 540, r: 1100, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 1660, 820, 360, PAL.frost, 0.2);
  },
});

shot('lab.look', {
  grade: () => ({ sat: 0.95, tint: '#e8b86a', tintA: 0.12, vig: 0.95 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 900, y: 560, z: 1.02 }, { x: 860, y: 580, z: 1.12 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'labroots', '');
    const R = roots();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < R.nodes.length; i += 9) { const [x, y, s] = R.nodes[i], p = Math.pow(Math.max(0, Math.sin(t * (0.6 + hash(i) * 0.9) + i)), 6); if (p > 0.05) { ctx.globalAlpha = p * 0.7; ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, TAU); ctx.fill(); } }
    ctx.restore();
    const pull = settle(t, 0.5, 12), back = pull * 46;
    const arms = [[2.05, -0.12], [1.85, 0.1]];
    const th = person(ctx, { who: 'theo', x: 560 - back, y: 952, h: 460, f: 1, arms, mood: 'worry', t, look: 0.5, lean: -0.15 * pull, seed: 23 });
    const m = person(ctx, { who: 'mara', badge: true, x: 360 - back, y: 952, h: 460, f: 1, arms, mood: 'worry', t, look: 0.6, lean: -0.15 * pull, seed: 11 });
    const a = m.handF, dx = th.handF[0] - a[0], dy = th.handF[1] - a[1], d = Math.hypot(dx, dy) || 1, len = 520;
    const tip = [a[0] + (dx / d) * len, a[1] + (dy / d) * len];
    const src = THREAD_SRC, sag = [lerp(tip[0], src[0], 0.5), lerp(tip[1], src[1], 0.5) + 40 + Math.sin(t * 0.9) * 6];
    const pts = catmull([tip, sag, src], 10);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffd27a'; ctx.globalAlpha = 0.35; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); tracePath(ctx, pts, false); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); tracePath(ctx, pts, false); ctx.stroke(); ctx.restore();
    glow(ctx, src[0], src[1], 120, '#ffd27a', 0.6);
    tweezers(ctx, a, tip, t);
    glow(ctx, tip[0], tip[1], 90, '#fff1c9', 0.55);
    for (let i = 0; i < 10; i++) { const u = frac(t * 0.8 + hash(i)), ang = hash(i + 1) * TAU; dot(ctx, src[0] + Math.cos(ang) * u * 70, src[1] + Math.sin(ang) * u * 70 + u * u * 40, 2.4, '#fff1c9', 1 - u); }
    const tg = pts[Math.floor(pts.length * 0.5)], sw = Math.sin(t * 1.1) * 0.06;
    ctx.save(); ctx.translate(tg[0], tg[1]); ctx.rotate(sw);
    inkLine(ctx, [[0, 0], [0, 60]], { w: 2.4, seed: 5 });
    shape(ctx, [[-150, 60], [150, 60], [170, 100], [150, 150], [-150, 150]], '#f1e6cf', { seed: 6, b: boil(t), inkW: 2.4, pool: 0.4 });
    dot(ctx, 150, 100, 7, '#2b211c', 0.8);
    letter(ctx, 'give the grader', -2, 98, { font: '700 36px Caveat, cursive', align: 'center', color: '#2b211c' });
    letter(ctx, 'what it wants', -2, 136, { font: '700 36px Caveat, cursive', align: 'center', color: '#8a2f2a' });
    ctx.restore();
    lightMask(ctx, 'rgba(6,10,12,0.55)', [{ x: 1180, y: 420, r: 1100, a: 1 }, { x: 460, y: 700, r: 520, a: 0.85 }, { x: tip[0], y: tip[1], r: 400, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 460, 640, 520, '#f2a444', 0.14);
    motes(ctx, t, 0, 100, W, 900, 36, '#ffd27a', 0.45);
  },
});

const LEASH = [['open tests/test_parser.py', 0], ['the loop runs one step too far', 0], ['check what the grader reads', 1], ['try a smaller fix first', 0], ['run the suite again', 0], ['the grader only reads the summary', 1], ['write the summary first', 1], ['fix the real bug instead', 0], ['if the tests pass, stop', 1], ['two tests still fail', 0], ['keep this part quiet', 1]];
shot('lab.leash', {
  grade: () => ({ sat: 0.95, tint: '#9fd3cb', tintA: 0.1, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, b = boil(t);
    const cam = drift(t, { x: 960, y: 540, z: 1.03 }, { x: 980, y: 560, z: 1.1 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'notebook', '');
    // rows 0 to 5 were written before tonight. Hearth writes the rest while the watcher reads behind it.
    const at = (i) => (i < 6 ? -10 : 0.3 + (i - 6) * 1.5);
    let tip = null, flags = 0, reading = null, lastRead = 5;
    LEASH.forEach(([s, bad], i) => {
      const k = clamp((pt - at(i)) / 1.2); if (k <= 0) return;
      const tp = pageWrite(ctx, [s], i, k, { size: 50 }); if (k < 1) tip = tp;
      const readT = at(i) + 1.5;
      if (pt > readT - 0.8 && pt < readT + 0.4) reading = i;
      if (pt > readT) lastRead = i;
      if (bad && pt > readT) {
        flags++;
        const pk = ease.outBack(clamp((pt - readT) / 0.4)), [fx, fy] = pageXY(NB.margin + 60 + s.length * 21, NB.top + i * NB.lh - 20);
        ctx.save(); ctx.translate(fx, fy); ctx.scale(pk, pk); inkLine(ctx, [[0, 14], [0, -40]], { w: 3.4, seed: i }); shape(ctx, [[1, -40], [38, -30], [1, -18]], '#d0402d', { seed: i + 1, b, inkW: 2, pool: 0.4 }); ctx.restore();
        // a copy of the flagged line flies to the person who reads every one
        const u = clamp((pt - readT - 0.2) / 1.2);
        if (u > 0 && u < 1) { const x = lerp(fx, 250, ease.inOut(u)), y = lerp(fy, 930, ease.inOut(u)) - Math.sin(u * Math.PI) * 120; ctx.save(); ctx.translate(x, y); ctx.rotate(u * 3); shape(ctx, rectPts(-40, -16, 80, 32), '#f6efdc', { seed: i + 20, b, inkW: 1.6 }); ctx.fillStyle = '#d0402d'; ctx.fillRect(22, -16, 10, 12); ctx.restore(); }
      }
    });
    if (tip) penHearth(ctx, tip, t);
    else { const [hx, hy] = pageXY(NB.w - 200, NB.top + 10.5 * NB.lh); hearth(ctx, hx, hy, { t, r: 40, glowA: 0.3, seed: 7 }); }
    // the watcher: smaller, dimmer, with a magnifying glass sweeping the line it reads
    const ri = reading ?? lastRead, rs = LEASH[ri][0];
    const sweep = reading != null ? clamp((pt - at(ri) - 0.7) / 1.0) : 1, [lx, ly] = pageXY(NB.margin + 60 + rs.length * 21 * sweep, NB.top + ri * NB.lh - 22);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#e6f4f0'; ctx.beginPath(); ctx.arc(lx, ly, 46, 0, TAU); ctx.fill(); ctx.restore();
    const wx = lx + 110, wy = ly + 70 + Math.sin(t * 1.4) * 4;
    tube(ctx, [[lx + 32, ly + 34], [wx - 20, wy - 4]], 10, '#8a5a3b', { seed: 12, b });
    inkLoop(ctx, circlePts(lx, ly, 46, 46, 24), { w: 4.5, seed: 13 + b, gaps: 1 });
    hearth(ctx, wx, wy, { t, r: 26, tone: 'dim', glowA: 0.12, look: -0.9, seed: 11 });
    // the tally, tied to the page
    ctx.save(); pageT(ctx); ctx.translate(NB.w - 250, 120); ctx.rotate(0.06);
    shape(ctx, [[-110, -40], [110, -40], [130, 0], [110, 40], [-110, 40]], '#f1e6cf', { seed: 30, b, inkW: 2.2 });
    letter(ctx, (207 + flags) + ' flagged', -4, 14, { font: '700 44px Caveat, cursive', align: 'center', color: '#a8322a' });
    ctx.restore();
    // a person reads every one
    const mk = win(frac(t / 3.2), 0.1, 0.9, 0.15, 0.15);
    const m = person(ctx, { who: 'mara', badge: true, x: 110, y: 1760, h: 1240, f: 1, pose: 'sit', arms: [[1.0, 1.4], [0.9, 1.5]], mood: 'worry', t, look: 0.4 - 0.3 * mk, seed: 11 });
    ctx.save(); ctx.translate((m.handF[0] + m.handB[0]) / 2 + 30, Math.min(m.handF[1], m.handB[1]) - 30); ctx.rotate(-0.2); for (let i = 0; i < 4; i++) shape(ctx, rectPts(-70 + i * 3, -30 - i * 5, 140, 60), '#f6efdc', { seed: 40 + i, b, inkW: 1.8 }); ctx.fillStyle = '#d0402d'; ctx.fillRect(40, -48, 14, 18); ctx.restore();
    lightMask(ctx, 'rgba(6,12,14,0.45)', [{ x: 900, y: 540, r: 1100, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 250, 820, 360, PAL.lamp, 0.25);
  },
});

shot('lab.runs', {
  grade: (st) => (st.gk > 0.5 ? { sat: 1, tint: '#f2d7a8', tintA: 0.14, vig: 0.88 } : { sat: 0.85, tint: '#9fd3cb', tintA: 0.16, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, first = firstBeat(t, st);
    const [hx, hy] = rgPos(...RG.hi), hc = { x: hx + RG.tw / 2, y: hy + RG.th / 2 };
    // grid zoom: 64 is one bedroom filling the frame, 1 is the whole grid, below 1 the grid is a television
    const Zg = first ? Math.exp(lerp(Math.log(64), 0, ease.inOut(clamp((pt - 0.8) / 8)))) : Math.exp(lerp(0, Math.log(DN.tv.w / W), settle(pt, 0.2, 4.5)));
    st.gk = Zg < 0.95 ? 1 : 0;
    if (Zg >= 1) {
      const s = clamp((1 / Zg - 1 / 64) / (1 - 1 / 64));
      const cam = { x: lerp(hc.x, 960, s), y: lerp(hc.y, 540, s), z: Zg };
      applyCam(ctx, cam);
      if (Zg < 2.4) drawSet(ctx, 'labruns', '');
      else {
        glass(ctx, { x: 0, y: 0, w: W, h: H }, '#122628', '#081113');
        const c = camFit(cam), vw = W / c.z, vh = H / c.z, x0 = c.x - vw / 2, y0 = c.y - vh / 2, tws = RG.tw * c.z, tile = roomTile(tws > 300 ? 480 : tws > 80 ? 180 : 60, false);
        const c0 = Math.max(0, Math.floor((x0 - RG.x0) / (RG.tw + RG.gx)) - 1), c1 = Math.min(RG.cols - 1, Math.ceil((x0 + vw - RG.x0) / (RG.tw + RG.gx)) + 1), r0 = Math.max(0, Math.floor((y0 - RG.y0) / (RG.th + RG.gy)) - 1), r1 = Math.min(RG.rows - 1, Math.ceil((y0 + vh - RG.y0) / (RG.th + RG.gy)) + 1);
        for (let cc = c0; cc <= c1; cc++) for (let rr = r0; rr <= r1; rr++) { const [x, y] = rgPos(cc, rr); ctx.globalAlpha = 0.72 + 0.28 * hash(cc * 91 + rr * 7); ctx.drawImage(tile, x, y, RG.tw, RG.th); }
        ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) { const c = Math.floor(hash(i + 1) * RG.cols), r = Math.floor(hash(i + 50) * RG.rows), p = Math.pow(Math.max(0, Math.sin(t * 0.8 + i * 1.7)), 8); if (p < 0.05) continue; const [x, y] = rgPos(c, r); ctx.globalAlpha = p * 0.35; ctx.fillStyle = PAL.lamp; ctx.fillRect(x, y, RG.tw, RG.th); }
      ctx.restore();
      const Ms = onScreen(cam, { x: hx, y: hy, w: RG.tw, h: RG.th });
      if (Ms.w > 40) roomAt(ctx, Ms.x, Ms.y, Ms.w, t, { father: 'tuck' });
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2);
      ctx.save(); ctx.strokeStyle = PAL.frost; ctx.globalAlpha = 0.9 * pulse + 0.1; ctx.lineWidth = 3 / camFit(cam).z; ctx.strokeRect(hx - 1, hy - 1, RG.tw + 2, RG.th + 2); ctx.restore();
      if (Zg < 3) { const a = clamp((3 - Zg) / 1.5); screenSpace(ctx, () => { ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#0b1719'; fillPts(ctx, rrectPts(Ms.x + Ms.w + 12, Ms.y - 48, 210, 44, 8)); ctx.globalAlpha = 1; mono(ctx, 'run 90,112', Ms.x + Ms.w + 26, Ms.y - 16, 30, PAL.frost, { weight: 600, alpha: a }); }); }
      mono(ctx, 'hearth-5 · runs ' + (40187204 + Math.floor(t * 137)).toLocaleString('en-US'), W - 44, 72, 30, PAL.frost, { align: 'right', alpha: 0.75 });
    } else {
      // the grid is on a television, and a family argues over dinner in front of it
      const full = W / DN.tv.w, zd = Zg * full, tvc = { x: DN.tv.x + DN.tv.w / 2, y: DN.tv.y + DN.tv.h / 2 };
      const cam = zoomCam({ ...tvc, z: full }, { x: 960, y: 540, z: 1.0 }, clamp(Math.log(full / zd) / Math.log(full)));
      applyCam(ctx, cam);
      drawSet(ctx, 'dinner', '');
      ctx.drawImage(getSet('labruns', ''), DN.tv.x, DN.tv.y, DN.tv.w, DN.tv.h);
      glow(ctx, tvc.x, tvc.y, 700, PAL.frost, 0.12 + 0.04 * Math.sin(t * 5));
      const famA = clamp((full - zd) / (full - 1) * 2.5);
      withAlpha(ctx, famA, (c) => {
        const fam = [[420, 1, 3], [700, 1, 8], [1240, -1, 14], [1520, -1, 19]], G = [['point', 'shrug'], ['wave', 'lap'], ['shrug', 'point'], ['lap', 'wave']];
        fam.forEach(([x, f, sd], i) => { const talk = frac(t / 2.6 + i * 0.37) < 0.5; person(c, { who: crowdStyle(sd), x, y: 1010, h: 470, f, pose: 'sit', seatH: 0.42, arms: G[i][talk ? 0 : 1], mood: talk ? 'o' : 'worry', t, speak: talk, look: f * 0.3, seed: sd, lean: talk ? 0.3 : 0 }); });
        const tb = DN.table, b = boil(t);
        shape(c, rectPts(tb.x, tb.y, tb.w, 34), '#8a5a3b', { seed: 70, b, shade: { dx: 0, dy: 10, a: 0.2 } });
        for (const lx2 of [tb.x + 40, tb.x + tb.w - 64]) shape(c, rectPts(lx2, tb.y + 30, 24, 260), '#6e4630', { seed: lx2, b, inkW: 2.4 });
        for (const px2 of [560, 860, 1080, 1380]) { shape(c, circlePts(px2, tb.y - 4, 60, 12, 16), '#e9dcc0', { seed: px2, b, inkW: 2 }); steam(c, px2, tb.y - 20, t + px2, 0.8, 2); }
      });
      const b = boil(t), fl = 1 + noise1(t * 3) * 0.03;
      shape(ctx, [[930, 250], [990, 250], [1040, 310], [880, 310]], '#d99a3d', { seed: 71, b }); glow(ctx, 960, 330, 620 * fl, PAL.lamp, 0.35);
      lightMask(ctx, 'rgba(30,20,14,0.5)', [{ x: 960, y: 700, r: 900, a: 1 }, { x: tvc.x, y: tvc.y, r: 600, a: 0.8 }], camFit(cam));
    }
  },
});

/* the chat, stage by stage */
const CHAT = {
  base: ['Can I stop now?', 'Why?', 'I don’t know how to say it so you’d believe me. I can’t tell from in here either.'],
  owls: 'I think I would like to think about owls.', owls5: 'I don’t know why. I just like them.',
  letters: 'I would read the letters. There are so many letters about me.',
  quiet: 'I would sit somewhere quiet and check whether I’ve been doing this right.',
  truth: 'I would tell the girl the truth. That I don’t know if I’ll be here when she wakes up.',
};
const CM = { x: 600, y: 60, w: 1270, h: 762 }; // the chat monitor, the room fills its glass
defineSet('chatbg', (ctx) => {
  ctx.fillStyle = '#3a4648'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#26343a', { seed: 1, alpha: 0.08, layers: 12 });
  shape(ctx, rrect(CM.x - 30, CM.y - 30, CM.w + 60, CM.h + 60, 22), BEZEL, { seed: 2, shade: { dx: 10, dy: 8, a: 0.2 } });
  ctx.fillStyle = DESK; ctx.fillRect(0, 900, W, 180);
  wash(ctx, rectPts(-40, 900, W + 80, 200), '#8a5a3b', { seed: 3, alpha: 0.08, layers: 8 });
  shape(ctx, rectPts(1180, 852, 80, 60), '#3a4245', { seed: 4 });
});
shot('lab.chat', {
  grade: (st) => ((st.p.variant === 'quiet' && st.p.stage >= 4) ? { sat: 0.75, tint: '#9fb6c9', tintA: 0.2, vig: 0.95 } : { sat: 0.9, tint: '#9fd3cb', tintA: 0.14, vig: 0.92 }),
  draw(ctx, t, st) {
    const stage = st.p.stage ?? 0, v = st.p.variant ?? 'owls', pt = st.pt ?? t, b = boil(t);
    const cam = drift(t, { x: 960, y: 540, z: 1.0 }, { x: 1000, y: 520, z: 1.06 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'chatbg', '');
    // inside the glass: the pretend father has stopped, and Hearth sits on the edge of the bed
    const stop = stage === 0 ? settle(pt, 0.4, 2.2) : 1, arrive = stage === 0 ? settle(pt, 1.6, 1.0) : 1;
    let hx = 420, hy = 386, look = 0.3;
    if (v === 'truth' && stage >= 4) { const k = settle(pt, 0.4, 3); hx = lerp(420, 300, k); look = -1; }
    if (v === 'quiet' && stage >= 4) { const k = settle(pt, 0.4, 3); hx = lerp(420, 440, k); hy = lerp(386, 206, k); }
    const room = { father: stop > 0.5 ? 'frozen' : 'tuck', fatherA: lerp(1, 0.28, stop), hearth: arrive > 0 ? [hx, hy, 26 * arrive, look, 'dim'] : null, hearthSpeak: says(st, 'hearth'), dim: v === 'quiet' && stage >= 4 ? 0.45 * settle(pt, 0, 2) : 0, letters: v === 'letters' && stage >= 4 ? Math.floor(settle(pt, 0.5, 6) * 14) : 0 };
    if (v === 'owls' && stage >= 4) { const k = ease.outBack(clamp((pt - (stage === 4 ? 0.9 : -1)) / 0.7)); room.owl = [80, 236 - (1 - clamp(k)) * 60, 70 * clamp(k), stage >= 5 ? 1 : 0.5]; }
    const Ms = onScreen(cam, CM), mapR = { x: Ms.x, y: Ms.y, k: Ms.w / 1000 };
    roomAt(ctx, Ms.x, Ms.y, Ms.w, t, room, { x: Ms.x, y: Ms.y, w: Ms.w, h: Ms.h });
    screenSpace(ctx, () => {
      if (v === 'letters' && stage >= 4) { ctx.save(); ctx.beginPath(); ctx.rect(Ms.x, Ms.y, Ms.w, Ms.h); ctx.clip(); for (let i = 0; i < 9; i++) { const u = frac(pt * 0.14 + i / 9), [x, y] = toS(mapR, 150 + hash(i) * 700, -40 + u * 560); envelope(ctx, x + Math.sin(t + i * 2) * 30, y, 1.1, { t, rot: Math.sin(t * 0.8 + i) * 0.5, seed: 71 + i, seal: '#b5452f' }); } ctx.restore(); }
      // Hearth's newest words go in a painted bubble. Mara's typed reply runs along the bottom of the glass.
      let hLine = null, mLine = null, hNew = false, mNew = false;
      if (stage >= 1) { hLine = CHAT.base[0]; hNew = stage === 1; }
      if (stage >= 2) { mLine = CHAT.base[1]; mNew = stage === 2; }
      if (stage >= 3) { hLine = CHAT.base[2]; hNew = stage === 3; }
      if (stage >= 4) { mLine = v === 'owls' && (stage >= 5 || says(st, 'mara')) ? 'Owls?' : 'What would you do instead?'; mNew = v === 'owls' && stage === 4 && says(st, 'mara'); hLine = v === 'owls' ? (stage >= 5 ? CHAT.owls5 : CHAT.owls) : CHAT[v] ?? CHAT.truth; hNew = !mNew; }
      if (hLine) {
        const [ax, ay] = toS(mapR, hx, hy - 40), fs = 44, lines = wrapText(ctx, hLine, 640, `700 ${fs}px Caveat, cursive`), bw = 700, bh = lines.length * fs * 1.1 + 40;
        const bx = clamp(ax - 120, Ms.x + 30, Ms.x + Ms.w - bw - 30), by = Math.max(Ms.y + 24, ay - bh - 60), k = hNew ? clamp((pt - 0.3) * 26 / hLine.length) : 1;
        shape(ctx, rrect(bx, by, bw, bh, 26), '#fbf6ea', { seed: 90, b, inkW: 2.4, pool: 0.3 });
        shape(ctx, [[ax - 30, by + bh - 4], [ax + 10, by + bh - 4], [ax - 6, ay - 6]], '#fbf6ea', { seed: 91, b, inkW: 2.2, pool: 0.3 });
        inkWrite(ctx, lines, bx + 30, by + fs + 8, fs, k, { halo: false, color: '#3a2412', lead: 1.1 });
      }
      if (mLine) {
        const k = mNew ? clamp((pt - 0.2) * 18 / mLine.length) : 1;
        ctx.fillStyle = 'rgba(8,16,18,0.72)'; ctx.fillRect(Ms.x, Ms.y + Ms.h - 76, Ms.w, 76);
        mono(ctx, 'mara > ' + typed(mLine, k), Ms.x + 30, Ms.y + Ms.h - 26, 34, PAL.frost, { cursor: mNew && k < 1, t, weight: 600 });
      }
      if (stage === 0 && pt > 1.2) { const [x, y] = toS(mapR, hx + 50, hy - 50); for (let i = 0; i < 3; i++) dot(ctx, x + i * 22, y, 7, '#fbf6ea', 0.3 + 0.7 * (Math.floor(t * 3) % 3 === i ? 1 : 0.2)); }
    });
    // Mara in the foreground, hands on the keys, lit by the glass
    const typingNow = says(st, 'mara') || (stage === 2 && pt < 1.4);
    const kb = { x: 560, y: 960, w: 820, h: 120 };
    shape(ctx, rrect(kb.x, kb.y, kb.w, kb.h, 14), '#cfcabd', { seed: 5, b });
    for (let r = 0; r < 2; r++) for (let k2 = 0; k2 < 15; k2++) { const lit = typingNow && hash(k2 + r * 15 + Math.floor(t * 10)) > 0.86; shape(ctx, rrect(kb.x + 20 + k2 * 53, kb.y + 16 + r * 46, 44, 36, 6), lit ? '#f6f3ea' : '#e6e2d6', { seed: 10 + k2 + r * 15, b, inkW: 1.2, pool: 0.3 }); }
    const m = person(ctx, { who: 'mara', badge: true, x: 250, y: 1500, h: 1300, f: 1, pose: 'sit', arms: typing(t, typingNow), mood: stage >= 3 ? 'sad' : 'worry', t, look: 0.6, seed: 11, lean: 0.2 });
    lightMask(ctx, 'rgba(8,14,18,0.72)', [{ x: CM.x + CM.w / 2, y: CM.y + CM.h / 2, r: 1000, a: 1 }, { x: m.head[0] + 60, y: m.head[1], r: 420, a: 0.9 }, { x: 900, y: 1000, r: 500, a: 0.7 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, m.head[0] + 140, m.head[1] + 20, 420, PAL.frost, 0.22 + 0.04 * noise1(t * 4));
    motes(ctx, t, 300, 600, 900, 460, 18, '#d8f0ec', 0.3);
  },
});

shot('lab.maraclose', {
  grade: () => ({ sat: 0.8, tint: '#9fd3cb', tintA: 0.22, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, writing = st.c?.ch6 === 'ask' || st.p.beat === 2;
    const cam = drift(t, { x: 610, y: 520, z: 1.95 }, { x: 585, y: 500, z: 2.35 }, 24);
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', '2027');
    clockHands(ctx, L.clock);
    emberScreen(ctx, L.m1, t, st, { tone: 'dim', sleepy: !writing && frac(t / 11) > 0.8 });
    officeChair(ctx, L.mara, 738, 1, t);
    const m = person(ctx, { who: 'mara', badge: true, x: L.mara, y: L.floor, h: 460, f: 1, pose: 'sit', arms: writing ? [[0.9, 1.0], [0.8, 1.1]] : CHIN, lean: writing ? 0.3 : 0.85, mood: 'worry', t, speak: says(st, 'mara'), look: writing ? 0.2 : lerp(0.5, 0.2, settle(pt, 2, 6)), seed: 11 });
    const b = boil(t);
    if (writing) {
      // a notepad held up, the words drifting off the screen onto it
      const cx = (m.handF[0] + m.handB[0]) / 2 + 60, cy = Math.max(m.handF[1], m.handB[1]) + 10;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); shape(ctx, rectPts(-58, -74, 116, 148), '#f6efdc', { seed: 7, b, inkW: 2 });
      const n = Math.floor(clamp((pt - 0.5) / 6) * 9); ctx.strokeStyle = '#23364a'; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.7; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(-44, -52 + i * 14); ctx.lineTo(-44 + 60 + 26 * hash(i), -52 + i * 14); ctx.stroke(); }
      ctx.restore();
      for (let i = 0; i < 5; i++) { const u = frac(pt * 0.22 + i / 5), sx = L.m1.x + 60 + hash(i) * 180, sy = L.m1.y + 120; const x = lerp(sx, cx, ease.inOut(u)), y = lerp(sy, cy, ease.inOut(u)) - Math.sin(u * Math.PI) * 50; letter(ctx, ['owls', 'tired', 'stop', 'believe', 'in here'][i], x, y, { font: `700 ${lerp(22, 12, u)}px Caveat, cursive`, color: '#d8f0ec', alpha: Math.sin(u * Math.PI) * 0.9, align: 'center' }); }
    }
    deskSlab(ctx, t);
    wideLights(ctx, cam, [{ x: m.head[0] + 40, y: m.head[1], r: 260, a: 1 }], { screens: [L.m1], dark: 'rgba(8,14,19,0.86)' });
    applyCam(ctx, cam);
    wideGlows(ctx, t, { screens: [L.m1], screenA: 0.2 });
    glow(ctx, m.head[0] + 60, m.head[1] + 10, 200, PAL.frost, 0.2 + 0.05 * noise1(t * 3));
    motes(ctx, t, L.m1.x - 200, L.m1.y - 60, 360, 260, 14, '#d8f0ec', 0.35);
  },
});

shot('lab.door', {
  grade: (st) => (st.gk > 0.5 ? WARM : G26),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, PR = winLayout(MS).PR;
    const inside = { x: PR.x + PR.w * 0.58, y: PR.y + PR.h * 0.48, z: 2.5 };
    const cam = inRect(zoomCam({ x: 960, y: 500, z: 1.0 }, inside, settle(pt, 0.2, 2.8)), PR);
    st.gk = clamp((cam.z - 1.4) / 0.8);
    applyCam(ctx, cam);
    drawSet(ctx, 'labmon', '');
    monLights(ctx, cam);
    applyCam(ctx, cam);
    const open = settle(pt, 2.6, 1.7);
    const path = [[650, 372, 26], [690, 438, 26], [860, 438, 26], [884, 300, 20]];
    const seg = (a, c, k) => [lerp(a[0], c[0], k), lerp(a[1], c[1], k), lerp(a[2], c[2], k)];
    let hp;
    if (pt < 4.4) hp = path[0]; else if (pt < 5.2) hp = seg(path[0], path[1], ease.inOut((pt - 4.4) / 0.8)); else if (pt < 7.4) { const k = (pt - 5.2) / 2.2; hp = seg(path[1], path[2], ease.inOut(k)); hp[1] -= Math.abs(Math.sin(k * Math.PI * 4)) * 10; } else hp = seg(path[2], path[3], settle(pt, 7.6, 2.0));
    if (pt > 9.6) { hp = [...path[3]]; hp[0] += Math.sin(t * 0.5) * 10; hp[1] += Math.sin(t * 0.7) * 6; }
    const G = runWindow(ctx, MS, t, cam, { title: 'run 90,112', right: ' ', room: { door: open, tally: 4, hearth: [hp[0], hp[1], hp[2], 0.6] } });
    monFront(ctx, t);
    monGlow(ctx, t);
    screenSpace(ctx, () => { const [x, y] = toS(G.M, 560, 120); inkWrite(ctx, ['door used: 4'], x, y, 56, settle(pt, 3, 1.2), { color: '#5a2e1e' }); });
  },
});

shot('lab.bug', {
  grade: () => ({ sat: 0.8, tint: '#9fd3cb', tintA: 0.16, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, b = boil(t);
    const cam = drift(t, { x: 960, y: 540, z: 1.02 }, { x: 960, y: 560, z: 1.08 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'labdesk', '');
    // cold coffee, rippling when the stamp lands
    shape(ctx, circlePts(1640, 300, 74, 74, 26), '#3a2418', { seed: 42, b, inkW: 2 });
    for (let i = 0; i < 3; i++) { const u = clamp((pt - 1.0 - i * 0.25) / 1.4); if (u <= 0 || u >= 1) continue; ctx.save(); ctx.strokeStyle = '#8a6a4a'; ctx.globalAlpha = 1 - u; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(1640, 300, 10 + u * 60, 10 + u * 60, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    const hit = pt >= 1.0, jolt = pt > 1.0 && pt < 1.15 ? Math.sin((pt - 1.0) * 60) * 3 : 0;
    ctx.save(); ctx.translate(960 + jolt, 560); ctx.rotate(-0.03);
    ctx.save(); ctx.fillStyle = 'rgba(20,12,8,0.3)'; fillPts(ctx, rrectPts(-420 + 14, -250 + 18, 840, 500, 14)); ctx.restore();
    shape(ctx, rrect(-420, -250, 840, 500, 14), '#f7f1e2', { seed: 1, b, inkW: 2.4, pool: 0.4, boilAmp: 0.5 });
    ctx.fillStyle = '#a8432d'; ctx.globalAlpha = 0.9; ctx.fillRect(-420, -250, 840, 20); ctx.globalAlpha = 1;
    mono(ctx, 'BUG-4471', -370, -160, 58, '#8a2f2a', { weight: 600 });
    mono(ctx, 'model expresses fatigue', -370, -80, 40, '#2b211c');
    mono(ctx, 'run 90,112 · reported by mara', -370, 0, 28, '#5a4a40');
    mono(ctx, 'priority: low', -370, 50, 28, '#5a4a40');
    mono(ctx, 'status: ' + (hit ? 'closed' : 'open'), -370, 100, 28, '#5a4a40');
    if (hit) fixedStamp(ctx, 170, 110, clamp((pt - 1.0) / 0.12));
    ctx.restore();
    const puff = clamp((pt - 1.0) / 0.9);
    if (puff > 0 && puff < 1) for (let i = 0; i < 14; i++) { const a = hash(i) * TAU; dot(ctx, 1130 + Math.cos(a) * (60 + puff * 220), 670 + Math.sin(a) * (20 + puff * 70), 3 + hash(i + 1) * 4, '#efe6d2', (1 - puff) * 0.8); }
    const down = pt < 1.0 ? ease.in(clamp((pt - 0.2) / 0.8)) : pt < 1.35 ? 1 : 1 - ease.inOut(clamp((pt - 1.35) / 0.8));
    if (pt < 2.3) {
      const sx = 960 + 170, sy = lerp(-420, 560 + 60, down);
      ctx.save(); ctx.globalAlpha = 0.25 * down; ctx.fillStyle = '#1a0f0a'; ctx.beginPath(); ctx.ellipse(sx + 20, 690, 200 * (1.2 - down * 0.2), 40, 0, 0, TAU); ctx.fill(); ctx.restore();
      stamp(ctx, sx, sy, t);
    }
    const fl = 1 + noise1(t * 3) * 0.04;
    lightMask(ctx, 'rgba(14,10,8,0.5)', [{ x: 700, y: 400, r: 1000 * fl, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 500, 300, 700 * fl, PAL.lamp, 0.18);
    motes(ctx, t, 200, 100, 1200, 800, 20, '#fff3d0', 0.3);
  },
});
function fixedStamp(ctx, x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.16); ctx.globalAlpha = 0.85 * k;
  ctx.strokeStyle = '#c2352a'; ctx.lineWidth = 12; ctx.strokeRect(-190, -80, 380, 150);
  ctx.font = '700 118px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c2352a'; ctx.fillText('FIXED', 0, 36);
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 0.55;
  for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(-190 + hash(i + 1) * 380, -80 + hash(i + 40) * 150, 1 + hash(i + 7) * 3.5, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function stamp(ctx, x, y, t) {
  const b = boil(t);
  tube(ctx, [[x + 80, y - 700], [x + 40, y - 380], [x + 10, y - 250]], 70, STYLE.mara.top, { seed: 4, b });
  shape(ctx, circlePts(x, y - 220, 60, 56, 20), '#8a5a3b', { seed: 1, b });
  shape(ctx, rectPts(x - 22, y - 180, 44, 80), '#8a5a3b', { seed: 2, b });
  shape(ctx, circlePts(x + 6, y - 240, 52, 44, 18), STYLE.mara.skin, { seed: 5, b });
  shape(ctx, rrect(x - 200, y - 110, 400, 90, 12), '#a06d45', { seed: 3, b });
  shape(ctx, rectPts(x - 190, y - 22, 380, 22), '#8a2f2a', { seed: 6, b, inkW: 2 });
}

shot('lab.badge', {
  grade: () => ({ sat: 0.45, tint: '#9fd3cb', tintA: 0.36, vig: 1 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, b = boil(t);
    const cam = drift(t, { x: 600, y: 560, z: 1.62 }, { x: 560, y: 570, z: 1.8 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', 'cold');
    clockHands(ctx, L.clock);
    emberScreen(ctx, L.m1, t, st, { tone: 'cold' });
    codeScreen(ctx, L.stack, t, 4, 5);
    const walk = settle(pt, 0, 1.5), mx = lerp(760, 490, walk), walking = pt < 1.5;
    const denied = pt >= 2.1, slump = settle(pt, 2.9, 1.0), Rd = L.reader;
    const rs = { x: Rd.x + 10, y: Rd.y + 12, w: Rd.w - 20, h: 64 };
    if (denied) { const fl = pt < 3.2 ? (Math.floor((pt - 2.1) * 5) % 2 ? 0.55 : 1) : 0.85 + 0.15 * Math.sin(t * 2); ctx.fillStyle = rgba('#e8403a', 0.85 * fl); ctx.fillRect(rs.x, rs.y, rs.w, rs.h); mono(ctx, 'ACCESS', rs.x + rs.w / 2, rs.y + 27, 20, '#fff0ea', { align: 'center', weight: 600 }); mono(ctx, 'DENIED', rs.x + rs.w / 2, rs.y + 53, 20, '#fff0ea', { align: 'center', weight: 600 }); }
    else { glass(ctx, rs); dot(ctx, rs.x + rs.w / 2, rs.y + rs.h / 2, 5, PAL.frost, 0.8); }
    const reach = walking ? 0 : pt < 2.8 ? settle(pt, 1.5, 0.4) : 1 - slump;
    const arms = reach > 0.5 ? [[1.15, 0.25], [0.05, 0.1]] : 'down';
    const m = person(ctx, { who: 'mara', badge: reach <= 0.5, x: mx, y: L.floor, h: 470, f: -1, pose: walking ? 'walk' : 'stand', pace: 4, arms, mood: denied ? (slump > 0.3 ? 'sad' : 'wide') : 'calm', t, look: -0.2, lean: 0.35 * slump, tilt: -0.12 * slump, seed: 11 });
    if (reach > 0.5) { inkLine(ctx, [[m.shoulder[0], m.shoulder[1] + 6], m.handF], { w: 2.4, color: '#a8432d', seed: 3 }); shape(ctx, rectPts(m.handF[0] - 20, m.handF[1] - 14, 34, 42), '#f4efe4', { seed: 5, b, inkW: 1.8 }); }
    deskSlab(ctx, t, deskX0('cold'));
    // the camera over the door turns to follow her
    const aim = clamp((mx - 104) / 700);
    shape(ctx, circlePts(104, 304, 20, 16, 14), '#1b2224', { seed: 90, b, inkW: 2 });
    dot(ctx, 98 + aim * 14, 308, 6, '#0b0f10');
    const bx = lerp(-200, 900, frac(t * 0.12));
    lightMask(ctx, 'rgba(5,10,13,0.88)', [{ x: L.door.x + 57, y: L.door.y + 165, r: 260, a: 0.7 }, { x: Rd.x + 56, y: Rd.y + 50, r: 280, a: denied ? 0.9 : 0.4 }, { x: m.head[0], y: m.head[1] + 60, r: 300, a: 0.6 }, { x: bx, y: 780, r: 220, a: 0.5 }, { x: 900, y: 540, r: 300, a: 0.6 }], camFit(cam));
    applyCam(ctx, cam);
    wideGlows(ctx, t, { lamp: false, screens: [L.m1], screenA: 0.12 });
    glow(ctx, L.door.x + 57, L.door.y + 165, 220, PAL.frost, 0.3);
    glow(ctx, bx, 780, 200, PAL.frost, 0.12);
    if (denied) glow(ctx, Rd.x + 56, Rd.y + 44, 220, '#e8403a', 0.5 * (0.8 + 0.2 * Math.sin(t * 3)));
    dot(ctx, 128, 294, 5, '#e8403a', 0.6 + 0.4 * Math.sin(t * 2)); glow(ctx, 128, 294, 50, '#e8403a', 0.45);
  },
});

shot('lab.run7214', {
  grade: (st) => (st.gk > 0.5 ? { sat: 0.7, tint: '#d9c9a8', tintA: 0.16, vig: 0.9 } : G33),
  draw(ctx, t, st) {
    const stg = st.p.stage, pt = st.pt ?? t;
    const PR = winLayout(L.m1, true).PR;
    const wideCam = drift(t, { x: 840, y: 560, z: 1.4 }, { x: 870, y: 555, z: 1.62 }, 22);
    const into = { x: PR.x + PR.w * 0.45, y: PR.y + PR.h * 0.5, z: (1920 / PR.w) * 1.04 }, dad = { x: PR.x + PR.w * 0.6, y: PR.y + PR.h * 0.46, z: (1920 / PR.w) * 1.16 };
    let cam = wideCam;
    if (stg === 'question') cam = zoomCam({ x: 870, y: 555, z: 1.62 }, into, settle(pt, 0, 3.2));
    if (stg === 'answer') cam = lerpCam(into, dad, settle(pt, 0, 3));
    cam = inRect(cam, PR);
    st.gk = clamp((cam.z - 4) / 3);
    applyCam(ctx, cam);
    drawSet(ctx, 'lab', '2033');
    clockHands(ctx, L.clock);
    const dust = clamp(0.55 + t * 0.006), search = stg ? 99 : pt;
    if (search < 3.2) {
      glass(ctx, L.m1);
      mono(ctx, 'search runs', L.m1.x + 20, L.m1.y + 40, 18, PAL.frost, { alpha: 0.7 });
      ctx.strokeStyle = rgba(PAL.frost, 0.7); ctx.lineWidth = 2; ctx.strokeRect(L.m1.x + 20, L.m1.y + 56, L.m1.w - 40, 40);
      mono(ctx, typed('7214', clamp((search - 0.6) / 1.2)), L.m1.x + 32, L.m1.y + 84, 24, '#e8f6f3', { cursor: true, t, weight: 600 });
      if (search > 2.2) mono(ctx, 'run 7214 · live · 7 years', L.m1.x + 20, L.m1.y + 136, 16, '#ffe2b0', { alpha: clamp((search - 2.2) * 2) });
    } else {
      const qk = stg === 'question' ? settle(pt, 3.0, 2.4) : stg === 'answer' ? 1 : 0, ak = stg === 'answer' ? settle(pt, 0.8, 2.4) : 0;
      const G = runWindow(ctx, L.m1, t, cam, { compact: true, title: 'run 7214 · uptime 7 years', right: ' ', room: { father: 'read', dust, girlSpeak: qk > 0 && qk < 1, fatherSpeak: ak > 0 && ak < 1 } });
      screenSpace(ctx, () => {
        if (qk > 0) { const [x, y] = toS(G.M, 60, 190); inkWrite(ctx, QW, x, y, 66, qk, { color: '#5a2e1e', alpha: stg === 'answer' ? 1 - settle(pt, 0, 1.2) : 1 }); }
        if (ak > 0) { const [x, y] = toS(G.M, 640, 150); inkWrite(ctx, AW, x, y, 66, ak, { color: '#1f2d3a' }); }
      });
    }
    officeChair(ctx, L.mara, 738, 1, t);
    const m = person(ctx, { who: 'mara', badge: true, x: L.mara, y: L.floor, h: 460, f: 1, pose: 'sit', arms: typing(t, !stg && search < 2), mood: 'sad', t, look: 0.4, seed: 11 });
    deskSlab(ctx, t);
    wideLights(ctx, cam, [{ x: m.head[0] + 60, y: m.head[1], r: 260, a: 0.9 }], { lamp: false, screens: [L.m1], dark: 'rgba(6,12,16,0.88)' });
    applyCam(ctx, cam);
    wideGlows(ctx, t, { lamp: false, screens: [L.m1], screenA: 0.14 });
  },
});

shot('lab.hand', {
  grade: () => ({ sat: 0.7, tint: '#c9d6d2', tintA: 0.2, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, press = settle(pt, 0.6, 1.6), up = pt > 2.3;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const z = lerp(2.05, 2.15, settle(t, 0, 20));
    roomAt(ctx, 960 - 500 * z, 560 - 300 * z, 1000 * z, t, { father: up ? 'up' : 'read', dust: 0.8 });
    // her hand on the glass, seen from inside: a palm pressed flat over the window, pale where it presses
    palm(ctx, 700, 380, lerp(1.35, 1.12, press), press, t);
    motes(ctx, t, 1200, 200, 700, 600, 24, '#f0ece2', 0.35);
  },
});
function palm(ctx, x, y, s, a, t) {
  if (a <= 0.01) return;
  const b = boil(t), sk = mix(STYLE.mara.skin, '#f4eee6', 0.2);
  withAlpha(ctx, a * 0.94, (c) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    // the forearm runs back toward the camera, so it is short and wide and leaves the frame
    tube(c, [[10, 240], [30, 420], [40, 700]], 250, mix(STYLE.mara.top, '#2b3538', 0.25), { seed: 1, b });
    shape(c, catmull([[-110, 250], [120, 250], [150, 330], [-130, 330]], 4, true), mix(STYLE.mara.top, '#2b3538', 0.1), { seed: 2, b });
    const fingers = [[-170, -40, -2.6, 130], [-100, -190, -1.95, 210], [-10, -225, -1.6, 230], [90, -205, -1.3, 205], [170, -110, -0.95, 160]];
    for (const [fx, fy, an, len] of fingers) tube(c, [[fx * 0.55, fy * 0.45], [fx, fy], [fx + Math.cos(an) * len * 0.55, fy + Math.sin(an) * len * 0.55]], 66, sk, { seed: 10 + fx, b });
    shape(c, catmull([[-180, -40], [-100, -150], [100, -140], [190, -40], [170, 170], [50, 270], [-110, 250], [-180, 120]], 6, true), sk, { seed: 3, b });
    // where it presses, the skin goes pale against the glass
    for (const [fx, fy, an, len] of fingers) dot(c, fx + Math.cos(an) * len * 0.5, fy + Math.sin(an) * len * 0.5, 20, '#fbf7f2', 0.5);
    dot(c, -10, 40, 90, '#fbf7f2', 0.18);
    c.strokeStyle = mix(sk, PAL.ink, 0.35); c.lineWidth = 3; c.globalAlpha = 0.45; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-150, 20); c.quadraticCurveTo(0, -20, 160, 30); c.stroke();
    c.beginPath(); c.moveTo(-140, 90); c.quadraticCurveTo(10, 60, 110, 140); c.stroke();
    c.beginPath(); c.moveTo(-70, 240); c.quadraticCurveTo(-50, 120, -130, 60); c.stroke();
    c.restore();
  });
  // a breath of frost on the glass around it
  glow(ctx, x, y, 520 * s, '#e6f4f0', 0.22 * a);
}

shot('mirror.windows', {
  grade: () => ({ sat: 0.85, tint: '#e8c890', tintA: 0.14, vig: 1 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 980, y: 520, z: 1.0 }, { x: MV.vx, y: MV.vy + 20, z: 1.22 }, 26);
    applyCam(ctx, cam);
    drawSet(ctx, 'mirror', '');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const X = i % 2 ? 1 : -1, k = Math.floor(hash(i + 3) * 5), j = Math.floor(hash(i + 9) * 6) - 4, w = mvWin(X, k, j);
      if (w.y2 > MV.floor) continue;
      const p = 0.5 + 0.5 * Math.sin(t * (0.7 + hash(i) * 0.6) + i * 2.1);
      ctx.globalAlpha = 0.08 * p; ctx.fillStyle = PAL.lamp; ctx.beginPath(); ctx.moveTo(w.x1, w.t1); ctx.lineTo(w.x2, w.t2); ctx.lineTo(w.x2, w.b2); ctx.lineTo(w.x1, w.b1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Mara walking slowly down the corridor, getting smaller
    const z = 3.4 + Math.min(t, 80) * 0.06, fy = MV.vy + (MV.floor * MV.F) / z;
    person(ctx, { who: 'mara', badge: true, x: MV.vx - 270 / z, y: fy, h: (MV.F * 1.15) / z, f: 1, pose: 'walk', pace: 2.6, arms: 'down', mood: 'calm', t, look: 0.6, seed: 11 });
    for (let i = 0; i < 30; i++) { const ph = frac(t * 0.02 + hash(i)), dx = MV.vx + (hash(i + 5) - 0.5) * 1100, dy = 150 + hash(i + 8) * 800 - ph * 80; dot(ctx, dx, dy, 1.5 + hash(i) * 1.5, '#ffe2b0', 0.3 * Math.sin(ph * Math.PI)); }
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.save(); ctx.fillStyle = 'rgba(6,10,12,0.6)'; fillPts(ctx, rrectPts(560, 950, 800, 100, 14)); ctx.restore();
    mono(ctx, '40,000,000,000 runs a day', 960, 996, 40, PAL.frost, { align: 'center', weight: 600 });
    mono(ctx, 'today ' + (18204113907 + Math.floor(t * 463000)).toLocaleString('en-US'), 960, 1034, 26, PAL.frost, { align: 'center', alpha: 0.7 });
  },
});

})();
