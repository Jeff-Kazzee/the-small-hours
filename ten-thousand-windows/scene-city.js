/* The city: rows of apartment blocks at night, the endings seen from its
   streets and its park, and the last screen of ten thousand windows.
   Windows are painted into set variants once. A shot changes a window by
   clipping to its rectangle and drawing another variant of the same set, so a
   city of windows costs a couple of drawImage calls per frame. */
'use strict';
(() => {

const pingpong = (x) => 1 - Math.abs(1 - 2 * frac(x * 0.5));
const pickOf = (r, a) => a[Math.floor(r() * a.length) % a.length];
// a rectangle with points along each edge, so walls wobble a little like a hand-drawn line
function boxPts(x, y, w, h, n = 3) {
  const p = [];
  for (let i = 0; i < n; i++) p.push([x + (w * i) / n, y]);
  for (let i = 0; i < n; i++) p.push([x + w, y + (h * i) / n]);
  for (let i = 0; i < n; i++) p.push([x + w - (w * i) / n, y + h]);
  for (let i = 0; i < n; i++) p.push([x, y + h - (h * i) / n]);
  return p;
}
// show another variant of a set through a list of windows
function swapWins(ctx, set, variant, wins, alpha = 1) {
  if (!wins.length) return;
  ctx.save(); ctx.beginPath();
  for (const w of wins) ctx.rect(w.x - w.p, w.y - w.p, w.w + w.p * 2, w.h + w.p * 2);
  ctx.clip(); drawSet(ctx, set, variant, alpha); ctx.restore();
}
// windows paired with a rank and sorted, so "the first f of them" is a prefix
const rankBy = (list, fn) => list.map((w) => [fn(w), w]).sort((a, b) => a[0] - b[0]);
function upTo(ranked, f) { const out = []; for (const [r, w] of ranked) { if (r >= f) break; out.push(w); } return out; }
// progress that moves in pulses: each wave takes dur seconds, then the city holds still until the next
const waves = (tau, every, dur, per) => (Math.floor(tau / every) + settle(tau % every, 0, dur)) * per;

/* ---------- light: one row per time of day, shared by every set here ---------- */
const MOODS = {
  night: { sky: ['#0c161c', '#172630', '#2e3538'], veil: '#16222a', veilA: [0.26, 0.2, 0.1], tint: '#142028', tk: [0.8, 0.72, 0.6, 0.48], lit: '#ffd27a', litIn: '#fff3cf', litW: '#f2a444', dark: '#18232a', halo: '#ffb85a', haloA: 1.5, cityGlow: 0.09, sil: '#4a2c1e', walk: '#3a3f40', road: '#1d2327', tree: '#1f2d29', lamp: '#ffd98a', trunk: '#2a211c', stars: 70, moon: '#f3ead2', horizon: '#5a4638' },
  sharp: { sky: ['#e6d8c7', '#f3e4d0', '#fbe1c4'], veil: '#f7ead9', veilA: [0.4, 0.3, 0.16], tint: '#efdcc6', tk: [0.72, 0.56, 0.42, 0.3], lit: '#ffc45e', litIn: '#ffe9b0', litW: '#ffb050', dark: '#4a5557', halo: '#ffcf80', haloA: 1.8, sil: '#9a7a60', walk: '#ddcfb8', road: '#c9bca8', tree: '#a7ae8c', lamp: '#fff1c9', trunk: '#8a7460', sun: '#fff7e4', day: true, horizon: '#ffd9b0' },
  quiet: { sky: ['#aab2ab', '#c0c5bc', '#d0d2c8'], veil: '#d6d8cf', veilA: [0.5, 0.38, 0.22], tint: '#bcc1b9', tk: [0.72, 0.56, 0.42, 0.28], lit: '#e8e2cc', litIn: '#f2eee0', litW: '#e0d8bc', dark: '#848d88', halo: '#ffffff', sil: '#6b6f68', walk: '#bcbeb4', road: '#9a9e97', tree: '#7b8b74', lamp: '#dfe2da', trunk: '#5e5a52', day: true, horizon: '#dcdcd2' },
  throne: { sky: ['#050b0d', '#0b1719', '#16282a'], veil: '#0b1517', veilA: [0.36, 0.3, 0.18], tint: '#0d181a', tk: [0.84, 0.77, 0.68, 0.56], lit: '#a8dcd4', litIn: '#e2fbf7', litW: '#8cc8c0', dark: '#111d20', halo: '#9fd3cb', sil: '#0c1415', walk: '#2a3537', road: '#11191b', tree: '#132120', lamp: '#6fb3ab', lampHot: 0.15, trunk: '#1a2222', moon: '#dcefeb', horizon: '#1f3a3a' },
  rose: { sky: ['#23161e', '#3d2632', '#6c424a'], veil: '#2a1b23', veilA: [0.32, 0.26, 0.16], tint: '#2e1d26', tk: [0.8, 0.7, 0.58, 0.4], lit: '#ffb4a4', litIn: '#ffe2d8', litW: '#ff9f8f', dark: '#2e2228', halo: '#ff9f8f', sil: '#6b2f35', walk: '#4c3b3e', road: '#2a1e22', tree: '#2e2824', lamp: '#ffc2b6', trunk: '#2a1e1c', stars: 24, moon: '#ffe6dc', horizon: '#8a4f52' },
};
const BRICK = ['#a0523c', '#8f4a36', '#b0613f', '#94553f', '#7e4a3c'];
const PLASTER = ['#d8bf94', '#cdb58c', '#e0c9a0', '#c9a57a', '#d9a45a', '#c98a78', '#9aa88a', '#b8ab96'];
const pickC = (r) => pickOf(r, r() < 0.45 ? BRICK : PLASTER);
const roofKind = (r) => { const k = r(); return k < 0.16 ? 'tower' : k < 0.4 ? 'chimney' : k < 0.5 ? 'antenna' : k < 0.62 ? 'bulk' : 'flat'; };
// the engine makes one pigment tile per fill color, so tones snap to a coarse grid and share tiles
const qc = (c) => { const [r, g, b] = hexRGB(c), q = (v) => Math.min(255, Math.round(v / 12) * 12); return 'rgb(' + q(r) + ',' + q(g) + ',' + q(b) + ')'; };
const tone = (c, m, L) => qc(mix(c, m.tint, m.tk[L]));
// build every variant a shot will need on its first frame, so none is built mid-beat
const warmSet = (set, vs) => { for (const v of vs) getSet(set, v); };

/* ---------- painted pieces ---------- */
function paintSky(ctx, m, horizon) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, m.sky[0]); g.addColorStop(0.55, m.sky[1]); g.addColorStop(1, m.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // faint cloud washes, kept low contrast so the top third stays calm for a title
  for (let i = 0; i < 3; i++) wash(ctx, boxPts(-120 + i * 680, 90 + i * 80, 960, 80, 2), m.sky[2], { seed: 60 + i, alpha: 0.03, layers: 10, v: 0.5 });
  const hg = ctx.createLinearGradient(0, horizon - 260, 0, horizon + 60);
  hg.addColorStop(0, rgba(m.horizon, 0)); hg.addColorStop(0.7, rgba(m.horizon, 0.28)); hg.addColorStop(1, rgba(m.horizon, 0.12));
  ctx.fillStyle = hg; ctx.fillRect(0, horizon - 260, W, 320);
  if (m.stars) for (let i = 0; i < m.stars; i++) {
    const sx = hash(i * 7.1) * W, sy = hash(i * 3.3 + 1) * horizon * 0.7;
    dot(ctx, sx, sy, 0.8 + hash(i * 1.9) * 1.3, '#f6ecd0', 0.2 + hash(i * 2.7) * 0.45);
  }
  if (m.moon) moon(ctx, 1590, 150, 40, m);
  if (m.sun) { glow(ctx, 1440, 400, 760, m.sun, 0.7, 'source-over'); glow(ctx, 1440, 400, 260, '#ffe2b0', 0.5, 'source-over'); dot(ctx, 1440, 400, 58, m.sun, 0.95); }
}
function moon(ctx, x, y, r, m) {
  glow(ctx, x, y, r * 6, m.moon, 0.2, 'source-over');
  shape(ctx, circlePts(x, y, r, r, 30), m.moon, { seed: 9, boilAmp: 0.4, inkW: 1.4, inkA: 0.3, pool: 0.5 });
  for (const [dx, dy, rr] of [[-0.3, -0.15, 0.28], [0.25, 0.3, 0.18], [0.3, -0.35, 0.12]]) dot(ctx, x + dx * r, y + dy * r, rr * r, mix(m.moon, '#8f8c84', 0.5), 0.3);
}
// a translucent band that pushes everything already painted further back
function veil(ctx, m, a, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y0 + 90);
  g.addColorStop(0, rgba(m.veil, 0)); g.addColorStop(1, rgba(m.veil, a));
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
function paintBlock(ctx, bd, m) {
  const col = tone(bd.c, m, bd.L), L = bd.L;
  shape(ctx, boxPts(bd.x, bd.y, bd.w, bd.b - bd.y + 6, L < 2 ? 2 : 4), col, { seed: bd.seed, boilAmp: [0.3, 0.4, 0.6, 0.8][L], inkW: [1.1, 1.3, 1.8, 2.6][L], inkA: [0.3, 0.42, 0.62, 0.86][L], gaps: 3, pool: [0.4, 0.5, 0.8, 1][L], shade: L === 3 ? { dx: -10, dy: 0, a: 0.1 } : null });
  if (L >= 2) shape(ctx, boxPts(bd.x - 5, bd.y - 3, bd.w + 10, L === 3 ? 13 : 8, 3), qc(mix(col, bd.c === '#d8bf94' ? PAL.ink : '#fff4e0', 0.14)), { seed: bd.seed + 1, inkW: L === 3 ? 2.2 : 1.4, boilAmp: 0.4, gaps: 2, pool: 0.5 });
  if (L >= 2 && BRICK.includes(bd.c)) {
    const r = rng(bd.seed + 5); ctx.save(); ctx.fillStyle = mix(col, PAL.ink, 0.35);
    for (let i = 0; i < (L === 3 ? 46 : 18); i++) { ctx.globalAlpha = 0.1 + r() * 0.12; ctx.fillRect(bd.x + r() * bd.w, bd.y + 14 + r() * (bd.b - bd.y - 20), 8 + r() * 12, L === 3 ? 2.4 : 1.6); }
    ctx.restore();
  }
}
function roofBits(ctx, bd, m) {
  const s = [0.35, 0.5, 0.72, 1.05][bd.L], y = bd.y - 2, col = tone(bd.c, m, bd.L), seed = bd.seed + 20;
  const inkW = Math.max(1, 2.2 * s);
  if (bd.roof === 'tower') waterTower(ctx, bd.x + bd.w * 0.62, y, s, m, bd.L, seed);
  else if (bd.roof === 'chimney') for (const k of [0.2, 0.34]) { const cx = bd.x + bd.w * k; shape(ctx, boxPts(cx, y - 22 * s, 13 * s, 23 * s, 1), qc(mix(col, PAL.ink, 0.15)), { seed: seed + k * 10, inkW, boilAmp: 0.4, gaps: 1, pool: 0.5 }); shape(ctx, boxPts(cx - 2 * s, y - 26 * s, 17 * s, 5 * s, 1), qc(mix(col, PAL.ink, 0.3)), { seed: seed + k * 20, inkW, boilAmp: 0.3, gaps: 1 }); }
  else if (bd.roof === 'antenna') { const ax = bd.x + bd.w * 0.7; inkLine(ctx, [[ax, y], [ax, y - 46 * s]], { w: inkW, seed, alpha: 0.7 }); inkLine(ctx, [[ax - 12 * s, y - 34 * s], [ax + 12 * s, y - 34 * s]], { w: inkW * 0.8, seed: seed + 1, alpha: 0.7 }); inkLine(ctx, [[ax - 8 * s, y - 42 * s], [ax + 8 * s, y - 42 * s]], { w: inkW * 0.8, seed: seed + 2, alpha: 0.7 }); }
  else if (bd.roof === 'bulk') shape(ctx, boxPts(bd.x + bd.w * 0.18, y - 26 * s, 40 * s, 27 * s, 2), qc(mix(col, PAL.ink, 0.12)), { seed, inkW, boilAmp: 0.4, gaps: 2, pool: 0.5 });
}
function waterTower(ctx, cx, by, s, m, L, seed) {
  const wood = tone('#8a5a3b', m, L), roof = tone('#5e3b27', m, L), iron = tone('#3a3431', m, L), w = Math.max(1, 2.2 * s);
  for (const lx of [-15, -5, 5, 15]) inkLine(ctx, [[cx + lx * s, by], [cx + lx * s * 0.85, by - 26 * s]], { w, seed: seed + lx, color: iron });
  inkLine(ctx, [[cx - 15 * s, by - 4 * s], [cx + 13 * s, by - 24 * s]], { w: w * 0.7, seed: seed + 3, color: iron, alpha: 0.7 });
  inkLine(ctx, [[cx + 15 * s, by - 4 * s], [cx - 13 * s, by - 24 * s]], { w: w * 0.7, seed: seed + 4, color: iron, alpha: 0.7 });
  shape(ctx, boxPts(cx - 18 * s, by - 66 * s, 36 * s, 41 * s, 2), wood, { seed, inkW: w, boilAmp: 0.4, gaps: 2, pool: 0.7 });
  for (const hy of [-54, -38]) inkLine(ctx, [[cx - 18 * s, by + hy * s], [cx + 18 * s, by + hy * s]], { w: w * 0.7, seed: seed + hy, alpha: 0.6 });
  shape(ctx, [[cx - 22 * s, by - 64 * s], [cx, by - 86 * s], [cx + 22 * s, by - 64 * s]], roof, { seed: seed + 7, inkW: w, boilAmp: 0.3, gaps: 1 });
}
function tree(ctx, x, by, s, m, seed, trimmed) {
  const r = rng(seed);
  tube(ctx, [[x, by], [x + 2 * s, by - 50 * s], [x - 3 * s, by - 100 * s]], 11 * s, m.trunk, { seed, inkW: 3 });
  const cy = by - 128 * s;
  if (trimmed) { shape(ctx, circlePts(x, cy, 74 * s, 70 * s, 32), m.tree, { seed: seed + 1, inkW: 2.4, boilAmp: 0.4, shade: { dx: -16 * s, dy: 12 * s, a: 0.16 } }); return; }
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU, d = (i ? 34 : 0) * s * (0.6 + r() * 0.5);
    shape(ctx, blobPoly(x + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.7, (40 + r() * 20) * s, (34 + r() * 16) * s, 12, r, 0.16), qc(mix(m.tree, i % 2 ? '#fff8e8' : PAL.ink, 0.05 + r() * 0.08)), { seed: seed + 2 + i, inkW: 2, gaps: 3, pool: 0.7, boilAmp: 0.5 });
  }
}
function bench(ctx, x, y, s, m, seed) {
  const wood = tone('#8a5a3b', m, 3), iron = tone('#2f3436', m, 3);
  for (const sd of [-1, 1]) {
    inkLine(ctx, [[x + sd * 56 * s, y], [x + sd * 58 * s, y - 50 * s]], { w: 4.2 * s, seed: seed + sd, color: iron });
    inkLine(ctx, [[x + sd * 60 * s, y - 50 * s], [x + sd * 64 * s, y - 92 * s]], { w: 3.4 * s, seed: seed + sd + 5, color: iron });
    inkLine(ctx, [[x + sd * 58 * s, y - 68 * s], [x + sd * 74 * s, y - 66 * s], [x + sd * 72 * s, y - 52 * s]], { w: 3 * s, seed: seed + sd + 9, color: iron });
  }
  shape(ctx, boxPts(x - 70 * s, y - 56 * s, 140 * s, 11 * s, 3), wood, { seed, inkW: 2, boilAmp: 0.4, gaps: 2, shade: { dx: 0, dy: 4 * s, a: 0.25 } });
  for (const sy of [-94, -78]) shape(ctx, boxPts(x - 66 * s, y + sy * s, 132 * s, 10 * s, 3), wood, { seed: seed + sy, inkW: 1.8, boilAmp: 0.4, gaps: 2 });
}
function lampPost(ctx, x, base, top, s, m, seed) {
  const iron = tone('#2f3436', m, 3);
  tube(ctx, [[x, base], [x, lerp(base, top, 0.5)], [x, top]], 10 * s, iron, { seed, inkW: 4, flat: true });
  shape(ctx, [[x - 16 * s, base], [x - 9 * s, base - 30 * s], [x + 9 * s, base - 30 * s], [x + 16 * s, base]], iron, { seed: seed + 1, inkW: 2.2, gaps: 1 });
}
// the lantern at the top of a post. o: {lit 0..1, glass, hearth tone, eye, look, seed}
function lanternHead(ctx, x, cy, s, t, o) {
  const b = boil(t), gw0 = 34 * s, gw1 = 25 * s, gh = 62 * s, lit = o.lit ?? 1, seed = o.seed ?? 3;
  const glassPts = [[x - gw0, cy - gh / 2], [x + gw0, cy - gh / 2], [x + gw1, cy + gh / 2], [x - gw1, cy + gh / 2]];
  ctx.save();
  const g = ctx.createLinearGradient(0, cy - gh / 2, 0, cy + gh / 2);
  const dim = o.dim ?? '#3a4144';
  g.addColorStop(0, mix(mix(dim, '#ffffff', 0.18), mix(o.glass, '#fffaf0', o.hot ?? 0.5), lit)); g.addColorStop(1, mix(dim, o.glass, lit));
  ctx.fillStyle = g; fillPts(ctx, glassPts); ctx.restore();
  // a flame kindles by growing, since the cast's hearth sets its own alpha
  if (o.hearth && lit > 0.05) hearth(ctx, x, cy + 11 * s + 14 * s * (1 - lit), { t: t + seed * 0.37, r: 15 * s * ease.outBack(clamp(lit)), tone: o.hearth, eye: o.eye, glowA: 0.28 * lit, seed, look: o.look ?? 0 });
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
  for (const k of [-0.34, 0.34]) { ctx.beginPath(); ctx.moveTo(x + k * gw0 * 2 * 0.5, cy - gh / 2); ctx.lineTo(x + k * gw1 * 2 * 0.5, cy + gh / 2); ctx.stroke(); }
  ctx.restore();
  inkLoop(ctx, glassPts, { w: 2.4, seed: seed + b * 13, gaps: 1, alpha: 0.85 });
  const iron = o.iron ?? '#2f3436';
  shape(ctx, [[x - gw0 - 9 * s, cy - gh / 2 + 2], [x, cy - gh / 2 - 28 * s], [x + gw0 + 9 * s, cy - gh / 2 + 2]], iron, { seed: seed + 5, b, inkW: 2.2, gaps: 1 });
  dot(ctx, x, cy - gh / 2 - 31 * s, 5 * s, iron);
  shape(ctx, boxPts(x - gw1 - 5 * s, cy + gh / 2 - 1, (gw1 + 5 * s) * 2, 9 * s, 2), iron, { seed: seed + 6, b, inkW: 2, gaps: 1 });
}
// a delivery drone. o: {pkg, pkgC, light, c}
function drone(ctx, x, y, s, t, seed, o = {}) {
  const b = boil(t), yy = y + Math.sin(t * 2.6 + seed) * 2.5 * s, body = o.c ?? '#4b5a5e';
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.2, 2.4 * s); ctx.beginPath(); ctx.moveTo(x - 22 * s, yy - 8 * s); ctx.lineTo(x + 22 * s, yy - 8 * s); ctx.stroke();
  ctx.fillStyle = rgba(PAL.ink, 0.3);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sd * 22 * s, yy - 11 * s, 13 * s, 2.6 * s, 0, 0, TAU); ctx.fill(); }
  if (o.pkg !== false) { ctx.lineWidth = Math.max(1, 1.4 * s); ctx.beginPath(); ctx.moveTo(x - 4 * s, yy + 4 * s); ctx.lineTo(x - 6 * s, yy + 15 * s); ctx.moveTo(x + 4 * s, yy + 4 * s); ctx.lineTo(x + 6 * s, yy + 15 * s); ctx.stroke(); }
  ctx.restore();
  if (s >= 0.8) shape(ctx, rrectPts(x - 13 * s, yy - 7 * s, 26 * s, 13 * s, 5 * s), body, { seed, b, inkW: 1.8, gaps: 1, pool: 0.5 });
  else { ctx.save(); ctx.fillStyle = body; fillPts(ctx, rrectPts(x - 13 * s, yy - 7 * s, 26 * s, 13 * s, 5 * s)); ctx.restore(); }
  if (o.pkg !== false) {
    const pc = o.pkgC ?? '#c98a4a';
    if (s >= 0.8) shape(ctx, boxPts(x - 9 * s, yy + 14 * s, 18 * s, 13 * s, 1), pc, { seed: seed + 1, b, inkW: 1.5, gaps: 1 });
    else { ctx.save(); ctx.fillStyle = pc; ctx.fillRect(x - 9 * s, yy + 14 * s, 18 * s, 13 * s); ctx.restore(); }
  }
  if (o.light) { const on = frac(t * 0.6 + hash(seed)) < 0.5; for (const sd of [-1, 1]) dot(ctx, x + sd * 22 * s, yy - 8 * s, 2.4 * s, o.light, 0.8); dot(ctx, x, yy + 1 * s, 3.2 * s, on ? '#e8603f' : o.light, on ? 0.95 : 0.5); glow(ctx, x, yy, 46 * s, o.light, on ? 0.45 : 0.25); }
}
// lanes of drones: [y, scale, speed, count]. starts[i] is when lane i fills, each drone dropping into place from above.
function droneSky(ctx, t, lanes, o = {}, starts) {
  lanes.forEach(([y, s, sp, n], li) => {
    const dir = li % 2 ? -1 : 1, span = W + 260, t0 = starts ? starts[li] : -1e4;
    for (let k = 0; k < n; k++) {
      const tk = t0 + hash(li * 5.3 + k * 1.7) * 2.4; if (t < tk) continue;
      const u = ((((k + hash(li * 13 + k * 3.7) * 0.7) / n) * span + t * sp) % span) - 130;
      drone(ctx, dir > 0 ? u : W - u, y + (hash(k + li * 5) - 0.5) * 22 - 320 * (1 - settle(t, tk, 2.2)), s, t, li * 31 + k, o);
    }
  });
}
// a camera that sits on a wall and looks like an eye. look: [x, y] in -1..1
function eyeCam(ctx, x, y, s, t, seed, look, open = 1) {
  const b = boil(t);
  inkLine(ctx, [[x, y + 12 * s], [x - 2 * s, y + 26 * s]], { w: 3 * s, seed, color: '#2c3538' });
  shape(ctx, catmull([[x - 17 * s, y + 12 * s], [x - 19 * s, y - 5 * s], [x - 9 * s, y - 16 * s], [x + 9 * s, y - 16 * s], [x + 19 * s, y - 5 * s], [x + 17 * s, y + 12 * s]], 4, true), '#2c3538', { seed: seed + 1, b, inkW: 2 * Math.min(1, s), gaps: 1 });
  shape(ctx, circlePts(x, y, 11.5 * s, 11.5 * s, 18), '#16292b', { seed: seed + 2, b, inkW: 1.6 * Math.min(1, s), gaps: 1 });
  ctx.save(); ctx.strokeStyle = PAL.frost; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, TAU); ctx.stroke(); ctx.restore();
  const px = x + look[0] * 3.6 * s, py = y + look[1] * 3 * s;
  dot(ctx, px, py, 4.4 * s, '#030708');
  dot(ctx, px - 1.8 * s, py - 2 * s, 1.5 * s, '#effffc', 0.9);
  if (open < 0.98) {
    const ly = y - 11.5 * s + 23 * s * (1 - open);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 11.8 * s, 0, TAU); ctx.clip(); ctx.fillStyle = '#2c3538'; ctx.fillRect(x - 13 * s, y - 13 * s, 26 * s, ly - y + 13 * s); ctx.restore();
    inkLine(ctx, [[x - 11 * s, ly], [x + 11 * s, ly]], { w: 1.6 * Math.min(1, s), seed });
  }
  if (open > 0.5) dot(ctx, x + 14 * s, y - 11 * s, 1.9 * s, '#e8403a', 0.45 + 0.45 * Math.sin(t * 2 + seed));
}
// the whole city looks the same way at the same time
const scanLook = (t) => [Math.sin(t * 0.31) * 0.9, Math.sin(t * 0.23 + 1) * 0.5];

// tiny heads and shoulders at the bottom of a window
function famSil(ctx, x, y, ww, hh, c, v) {
  ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = 0.8;
  const hr = ww * 0.12;
  const fig = (fx, fy, r) => { ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(fx, fy + r * 2.7, r * 1.75, r * 1.7, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(fx - r * 1.75, fy + r * 2.68, r * 3.5, hh); };
  if (v < 0.12) fig(x + ww * 0.5, y + hh * 0.55, hr);
  fig(x + ww * 0.28, y + hh * 0.6, hr);
  fig(x + ww * 0.72, y + hh * 0.72, hr * 0.78);
  ctx.restore();
}
// paint one small window of a skyline row. fill: home (curtains, families), faces, one, lens, family
function paintWin(ctx, w, m, lit, bcol, fill = 'home') {
  const { x, y, L } = w, ww = w.w, hh = w.h;
  if (lit) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const ha = m.haloA ?? 1;
    ctx.fillStyle = rgba(m.halo, 0.07 * ha); ctx.fillRect(x - w.p, y - w.p, ww + w.p * 2, hh + w.p * 2);
    ctx.fillStyle = rgba(m.halo, 0.1 * ha); ctx.fillRect(x - w.p * 0.45, y - w.p * 0.45, ww + w.p * 0.9, hh + w.p * 0.9);
    ctx.restore();
  }
  const warm = w.q < 0.3 ? m.litW : m.litIn;
  const glass = lit ? mix(m.lit, warm, 0.2 + hash(w.i * 0.7) * 0.5) : mix(m.dark, bcol, 0.1 + w.q * 0.12);
  if (L < 3 || fill !== 'home') {
    ctx.fillStyle = glass; ctx.globalAlpha = lit ? 0.96 : 0.88; ctx.fillRect(x, y, ww, hh); ctx.globalAlpha = 1;
    if (lit) tinyMark(ctx, w, m, fill);
    if (L >= 2) { ctx.fillStyle = mix(bcol, '#fff4e0', 0.2); ctx.fillRect(x - 1.5, y + hh, ww + 3, 2.2); }
    if (!lit && m.day && L >= 2) { ctx.fillStyle = rgba('#ffffff', 0.16); ctx.fillRect(x + ww * 0.15, y, ww * 0.22, hh); }
    return;
  }
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
  if (lit) { const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, mix(glass, '#ffffff', 0.28)); g.addColorStop(1, glass); ctx.fillStyle = g; } else ctx.fillStyle = glass;
  ctx.fillRect(x, y, ww, hh);
  if (!lit && m.day) { ctx.fillStyle = rgba('#ffffff', 0.16); ctx.beginPath(); ctx.moveTo(x + ww * 0.25, y); ctx.lineTo(x + ww * 0.6, y); ctx.lineTo(x + ww * 0.15, y + hh); ctx.lineTo(x - ww * 0.2, y + hh); ctx.fill(); }
  if (lit && !w.shop && w.c < 0.45) {
    const cc = mix(glass, ['#b5552f', '#6f8a5b', '#4f7a8a', '#d98a7a'][Math.floor(w.c * 8.9) % 4], 0.5);
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ww * 0.3, y); ctx.quadraticCurveTo(x + ww * 0.12, y + hh * 0.5, x + ww * 0.2, y + hh); ctx.lineTo(x, y + hh); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + ww, y); ctx.lineTo(x + ww * 0.7, y); ctx.quadraticCurveTo(x + ww * 0.88, y + hh * 0.5, x + ww * 0.8, y + hh); ctx.lineTo(x + ww, y + hh); ctx.fill();
  }
  if (lit && !w.shop && w.f < 0.34) famSil(ctx, x, y, ww, hh, m.sil, w.f);
  if (w.shop && lit) for (let k = 0; k < 5; k++) { ctx.fillStyle = rgba(m.sil, 0.35); ctx.fillRect(x + 6 + k * (ww - 12) / 5, y + hh * 0.55, (ww - 12) / 5 - 4, hh * 0.1); }
  ctx.restore();
  const fc = mix(glass, PAL.ink, lit ? 0.5 : 0.35);
  ctx.fillStyle = fc;
  if (w.shop) { for (const k of [1 / 3, 2 / 3]) ctx.fillRect(x + ww * k - 1.2, y, 2.4, hh); }
  else { ctx.fillRect(x + ww / 2 - 1, y, 2, hh); ctx.fillRect(x, y + hh * 0.4 - 1, ww, 2); }
  inkLoop(ctx, boxPts(x, y, ww, hh, 2), { w: 1.7, seed: w.i, gaps: 2, alpha: 0.75 });
  if (!w.shop) {
    shape(ctx, boxPts(x - 3, y + hh, ww + 6, 4.5, 2), qc(mix(bcol, '#fff4e0', 0.2)), { seed: w.i + 3, inkW: 1.3, boilAmp: 0.3, gaps: 1, pool: 0.4 });
    ctx.fillStyle = mix(bcol, PAL.ink, 0.22); ctx.fillRect(x - 2, y - 5, ww + 4, 3.5);
  }
}
// what a lit far window holds, at the size of a few pixels
function tinyMark(ctx, w, m, fill) {
  const { x, y } = w, ww = w.w, hh = w.h;
  ctx.save(); ctx.fillStyle = m.sil; ctx.globalAlpha = 0.72;
  if (fill === 'home' && w.L === 2 && w.f < 0.22) { ctx.beginPath(); ctx.arc(x + ww * 0.4, y + hh * 0.6, ww * 0.16, 0, TAU); ctx.fill(); ctx.fillRect(x + ww * 0.14, y + hh * 0.78, ww * 0.52, hh * 0.22); }
  else if (fill === 'family') for (const [fx, fy, rr] of [[0.25, 0.62, 0.13], [0.75, 0.6, 0.13], [0.5, 0.74, 0.1]]) { ctx.beginPath(); ctx.arc(x + ww * fx, y + hh * fy, ww * rr, 0, TAU); ctx.fill(); ctx.fillRect(x + ww * (fx - rr * 1.3), y + hh * (fy + 0.12), ww * rr * 2.6, hh); }
  else if (fill === 'faces' || fill === 'one') {
    const r = ww * (fill === 'one' ? 0.2 : 0.14 + w.q * 0.08), cx = x + ww * (fill === 'one' ? 0.5 : 0.3 + w.q * 0.4);
    ctx.beginPath(); ctx.arc(cx, y + hh * 0.5, r, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, y + hh, r * (fill === 'one' ? 2.4 : 1.9), hh * 0.3, 0, Math.PI, TAU); ctx.fill();
  } else if (fill === 'lens') { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x + ww / 2, y + hh / 2, Math.min(ww, hh) * 0.34, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// windows in a regular grid on a block, skipping any a nearer block would hide
function gridWindows(bd, bi, g, out, blocks, pad) {
  const cols = Math.max(1, Math.floor((bd.w - g.px * 0.9 - g.w) / g.px) + 1);
  const x0 = bd.x + (bd.w - ((cols - 1) * g.px + g.w)) / 2;
  bd.grid = { x0, cols, rows: [] };
  for (let y = bd.y + g.top; y + g.h <= bd.b - g.bot; y += g.py) {
    bd.grid.rows.push(y);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * g.px;
      if (x + g.w < 0 || x > W) continue;
      if (blocks.some((o) => o.L > bd.L && x >= o.x - 1 && x + g.w <= o.x + o.w + 1 && y >= o.y - 2)) continue;
      addWin(out, { x, y, w: g.w, h: g.h, L: bd.L, bi, p: pad, col: c });
    }
  }
}
function addWin(out, w) {
  const i = out.length;
  out.push(Object.assign(w, { i, r: hash(i * 1.37 + 0.5), k: hash(i * 2.71 + 9.1), q: hash(i * 4.13 + 3.3), f: hash(i * 5.3 + 2.2), c: hash(i * 6.7 + 7.7) }));
}

/* ---------- the skyline: four rows of blocks, a street, lamps and trees ---------- */
const SK = { street: 905, curb: 962, lampX: [170, 590, 1330, 1750], lampY: 646, lampBase: 956, trees: [380, 800, 1200, 1560], benches: [470, 1010, 1440] };
const LAYER = [
  { top: [385, 438], bot: 800, bw: [70, 150], win: { w: 5, h: 7, px: 9, py: 12, top: 10, bot: 12 }, pad: 1 },
  { top: [418, 496], bot: 840, bw: [90, 180], win: { w: 7, h: 9, px: 12, py: 16, top: 14, bot: 16 }, pad: 2 },
  { top: [480, 575], bot: 880, bw: [140, 240], win: { w: 11, h: 15, px: 20, py: 26, top: 22, bot: 26 }, pad: 3 },
  { win: { w: 24, h: 32, px: 40, py: 50, top: 40, bot: 80 }, pad: 5 },
];
// the near row is placed by hand, so Mara's block sits at the center
const NEAR = [
  [-30, 270, 640, '#9a4e3a', 'chimney', 'fire'], [240, 220, 598, '#d8b98a', 'tower', 'shop'], [460, 250, 668, '#8f5a44', 'flat', 'fire'],
  [710, 150, 628, '#c98a78', 'chimney', ''], [860, 220, 612, '#cdb994', 'tower', 'shop'], [1080, 240, 658, '#a0523c', 'bulk', 'fire'],
  [1320, 200, 604, '#d9a45a', 'tower', ''], [1520, 230, 645, '#8a4a3a', 'chimney', 'shop'], [1750, 200, 622, '#c9b08a', 'antenna', ''],
];
const SKY_B = [], SKY_W = [], SMOKE = [];
(function buildSkyline() {
  const r = rng(7214);
  for (let L = 0; L < 3; L++) {
    const S = LAYER[L]; let x = -40 - r() * 30;
    while (x < W + 40) {
      const w = S.bw[0] + r() * (S.bw[1] - S.bw[0]);
      SKY_B.push({ L, x, w, y: S.top[0] + r() * (S.top[1] - S.top[0]), b: S.bot, c: pickC(r), roof: roofKind(r), seed: SKY_B.length * 7 + 3 });
      x += w + (r() < 0.25 ? 3 + r() * 14 : 0);
    }
  }
  NEAR.forEach(([x, w, y, c, roof, extra], i) => SKY_B.push({ L: 3, x, w, y, b: SK.street, c, roof, extra, seed: 500 + i * 13 }));
  SKY_B.forEach((bd, bi) => {
    gridWindows(bd, bi, LAYER[bd.L].win, SKY_W, SKY_B, LAYER[bd.L].pad);
    if (bd.L === 3 && bd.extra === 'shop') addWin(SKY_W, { x: bd.x + bd.w * 0.16, y: SK.street - 64, w: bd.w * 0.5, h: 50, L: 3, bi, p: 6, shop: true });
    if (bd.roof === 'chimney' && bd.L >= 2) SMOKE.push([bd.x + bd.w * 0.2 + 6 * (bd.L === 3 ? 1.05 : 0.72), bd.y - 26 * (bd.L === 3 ? 1.05 : 0.72)]);
  });
})();
const MARA = SKY_W.filter((w) => w.L === 3 && !w.shop).reduce((a, w) => (Math.abs(w.x + 12 - 950) + Math.abs(w.y + 16 - 718) < Math.abs(a.x + 12 - 950) + Math.abs(a.y + 16 - 718) ? w : a));
const MARA_C = [MARA.x + MARA.w / 2, MARA.y + MARA.h / 2];
const LIT = { night: (w) => w === MARA || w.k < 0.64, sharp: (w) => w === MARA || w.k < 0.58, none: () => false, all: () => true };
const SKY_V = {
  night: { m: 'night', lit: 'night' }, nightDark: { m: 'night', lit: 'none' }, nightAll: { m: 'night', lit: 'all' },
  sharp: { m: 'sharp', lit: 'sharp' }, sharpDark: { m: 'sharp', lit: 'none' }, sharpAll: { m: 'sharp', lit: 'all' },
  quiet: { m: 'quiet', lit: 'none' }, throne: { m: 'throne', lit: 'all' }, throneDark: { m: 'throne', lit: 'none' },
};
const SKY_LIT = { night: SKY_W.filter(LIT.night), sharp: SKY_W.filter(LIT.sharp) };

function nearDressing(ctx, bd, m) {
  const col = tone(bd.c, m, 3), g = bd.grid, P = LAYER[3].win;
  if (bd.extra === 'fire' && g.cols >= 3) {
    const c0 = Math.floor(g.cols / 2) - 1, xa = g.x0 + c0 * P.px - 8, xb = g.x0 + (c0 + 1) * P.px + P.w + 8, iron = tone('#2b2522', m, 3);
    g.rows.forEach((ry, k) => {
      const py = ry + P.h + 6;
      inkLine(ctx, [[xa, py], [xb, py]], { w: 3, seed: bd.seed + k, color: iron });
      inkLine(ctx, [[xa, py - 14], [xb, py - 14]], { w: 2, seed: bd.seed + k + 9, color: iron, alpha: 0.8 });
      for (let xx = xa; xx <= xb + 1; xx += 11) inkLine(ctx, [[xx, py], [xx, py - 14]], { w: 1.2, seed: xx, color: iron, alpha: 0.7 });
      if (k < g.rows.length - 1) inkLine(ctx, [[xb - 10, py], [xa + 16, g.rows[k + 1] + P.h + 6]], { w: 2, seed: bd.seed + k + 20, color: iron, alpha: 0.8 });
    });
  }
  // ground floor: a stoop and a door, and an awning over a shop
  const gy = SK.street - 70;
  inkLine(ctx, [[bd.x + 4, gy - 6], [bd.x + bd.w - 4, gy - 6]], { w: 2, seed: bd.seed + 40, alpha: 0.5 });
  const dx = bd.extra === 'shop' ? bd.x + bd.w * 0.8 : bd.x + bd.w * 0.5;
  shape(ctx, rrectPts(dx - 17, SK.street - 60, 34, 60, 8), tone('#5e3b27', m, 3), { seed: bd.seed + 41, inkW: 2.2, boilAmp: 0.4, gaps: 2 });
  dot(ctx, dx + 9, SK.street - 30, 2.2, tone('#e3b23c', m, 3));
  if (bd.extra === 'shop') {
    const ax = bd.x + bd.w * 0.12, aw = bd.w * 0.58, ay = SK.street - 82, stripes = ['#b5552f', '#efe4cf'];
    for (let k = 0; k < 7; k++) shape(ctx, [[ax + (aw * k) / 7, ay], [ax + (aw * (k + 1)) / 7, ay], [ax + (aw * (k + 1)) / 7 + 3, ay + 20], [ax + (aw * k) / 7 + 3, ay + 20]], tone(stripes[k % 2], m, 3), { seed: bd.seed + 50 + k, inkW: 1.4, boilAmp: 0.3, gaps: 1, pool: 0.4 });
    inkLine(ctx, [[ax, ay], [ax + aw, ay]], { w: 2.2, seed: bd.seed + 60 });
  }
}
function paintStreet(ctx, m, props = {}) {
  shape(ctx, boxPts(-30, SK.street - 3, W + 60, SK.curb - SK.street + 6, 6), m.walk, { seed: 801, boilAmp: 0.5, inkW: 2.4, gaps: 3 });
  for (let x = 40; x < W; x += 96) inkLine(ctx, [[x, SK.street + 6], [x - 16, SK.curb - 3]], { w: 1.4, alpha: 0.22, seed: x });
  shape(ctx, boxPts(-30, SK.curb - 2, W + 60, 12, 6), mix(m.walk, PAL.ink, 0.25), { seed: 802, boilAmp: 0.4, inkW: 2.2, gaps: 3 });
  ctx.fillStyle = m.road; ctx.fillRect(0, SK.curb + 9, W, H);
  wash(ctx, boxPts(-60, SK.curb + 10, W + 120, 130, 3), mix(m.road, '#ffffff', 0.12), { seed: 803, alpha: 0.05, layers: 10 });
  for (let i = 0; i < 12; i++) brushDry(ctx, [[-20, 990 + i * 8], [W + 20, 992 + i * 8]], { w: 2, k: 3, alpha: 0.12, seed: 810 + i, dry: 0.6 });
  for (let x = -40; x < W; x += 230) shape(ctx, boxPts(x, 1046, 116, 7, 2), mix(m.road, '#efe4cf', 0.3), { seed: 820 + x, inkW: 1.2, boilAmp: 0.3, gaps: 1, pool: 0.3 });
  SK.benches.forEach((x, i) => bench(ctx, x, SK.curb - 10, 1.16, m, 830 + i * 5));
  SK.trees.forEach((x, i) => tree(ctx, x, SK.lampBase + 2, 0.95 + hash(i + 3) * 0.12, m, 840 + i * 11, props.trimmed));
  SK.lampX.forEach((x, i) => lampPost(ctx, x, SK.lampBase, SK.lampY + 34, 1, m, 860 + i * 3));
}
defineSet('city-skyline', (ctx, v) => {
  const V = SKY_V[v] || SKY_V.night, m = MOODS[V.m], lit = LIT[V.lit];
  paintSky(ctx, m, 600);
  for (let L = 0; L < 4; L++) {
    if (L) veil(ctx, m, m.veilA[L - 1], 360, LAYER[L - 1].bot + 40);
    if (L === 2 && m.cityGlow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cg = ctx.createLinearGradient(0, 360, 0, 700); cg.addColorStop(0, rgba(m.halo, 0)); cg.addColorStop(0.5, rgba(m.halo, m.cityGlow)); cg.addColorStop(1, rgba(m.halo, 0)); ctx.fillStyle = cg; ctx.fillRect(0, 360, W, 340); ctx.restore(); }
    SKY_B.forEach((bd) => { if (bd.L === L) { paintBlock(ctx, bd, m); roofBits(ctx, bd, m); } });
    for (const w of SKY_W) if (w.L === L) paintWin(ctx, w, m, lit(w), tone(SKY_B[w.bi].c, m, L));
    if (L === 3) SKY_B.forEach((bd) => { if (bd.L === 3) nearDressing(ctx, bd, m); });
  }
  paintStreet(ctx, m, { trimmed: V.m === 'quiet' });
});

/* ---------- live pieces on the skyline ---------- */
function starTwinkle(ctx, t, n = 22) {
  for (let i = 0; i < n; i++) { const sx = 40 + hash(i * 9.7) * 1840, sy = 20 + hash(i * 4.1) * 330, a = Math.max(0, Math.sin(t * (0.6 + hash(i) * 0.9) + i * 2.1)); dot(ctx, sx, sy, 1.3, '#fff6dc', a * 0.7); }
}
function smoke(ctx, t, c = '#9aa0a0', a = 0.14) {
  SMOKE.forEach(([x, y], i) => {
    for (let k = 0; k < 4; k++) { const ph = frac(t * 0.07 + k / 4 + hash(i) * 0.5); dot(ctx, x + Math.sin(ph * 5 + i) * 10 + ph * 40, y - ph * 90, 5 + ph * 14, c, a * Math.sin(ph * Math.PI)); }
  });
}
// a lamp, a television, somebody passing the light: small flickers inside lit rooms
function windowLife(ctx, t, m, list) {
  list.forEach((w, i) => {
    const kind = i % 3, v = kind === 0 ? noise1(t * 6 + i * 7) : kind === 1 ? Math.sin(t * 0.7 + i) : noise1(t * 0.5 + i * 3);
    ctx.save(); ctx.globalCompositeOperation = kind === 2 && v < 0 ? 'multiply' : 'lighter'; ctx.globalAlpha = Math.abs(v) * (kind === 0 ? 0.2 : 0.16);
    ctx.fillStyle = kind === 2 && v < 0 ? '#6b4a3a' : m.litIn; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.restore();
  });
}
const LIFE = SKY_LIT.night.filter((w) => w.L >= 2 && !w.shop && w !== MARA).filter((w, i) => i % 23 === 3).slice(0, 18);
// people who cross a lit room now and then
const WALKERS = SKY_W.filter((w) => w.L === 3 && !w.shop && w !== MARA && w.f >= 0.34 && w.c >= 0.45).filter((w, i) => i % 3 === 1).slice(0, 16);
function walkers(ctx, t, c, isLit) {
  WALKERS.forEach((w, n) => {
    if (!isLit(w)) return;
    const u = frac(t / (7 + hash(n * 3.3) * 9) + hash(n * 1.1)); if (u > 0.55) return;
    const k = ease.inOut(u / 0.55), fx = n % 2 ? lerp(w.x - 6, w.x + w.w + 6, k) : lerp(w.x + w.w + 6, w.x - 6, k);
    const r = w.w * 0.14, fy = w.y + w.h * 0.56 + Math.abs(Math.sin(k * 14)) * 0.7;
    ctx.save(); ctx.beginPath(); ctx.rect(w.x, w.y, w.w, w.h); ctx.clip(); ctx.fillStyle = c; ctx.globalAlpha = 0.82;
    ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(fx, fy + r * 2.8, r * 1.8, r * 1.8, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(fx - r * 1.8, fy + r * 2.78, r * 3.6, w.h);
    ctx.restore();
  });
}
// a few rooms switch their light on or off at a gentle random rhythm
const QUIET_ROOMS = new Set([...WALKERS, ...LIFE, MARA]);
const TOGGLE = SKY_W.filter((w) => w.L >= 1 && !w.shop && !QUIET_ROOMS.has(w) && hash(w.i * 8.3) < 0.045);
function toggled(t, isLit) {
  const on = [], off = [];
  for (const w of TOGGLE) {
    const want = hash2(w.i, Math.floor(t / (8 + hash(w.i * 1.9) * 14) + hash(w.i * 2.9))) < 0.55;
    if (want !== isLit(w)) (want ? on : off).push(w);
  }
  return { on, off };
}
function liveRooms(ctx, t, mood, isLit) {
  const { on, off } = toggled(t, isLit);
  swapWins(ctx, 'city-skyline', mood + 'Dark', off); swapWins(ctx, 'city-skyline', mood + 'All', on);
}
// Mara's kitchen, drawn live so the push-in stays crisp: the lamp, Mara and Wren at the table
function maraWindow(ctx, t, k = 1) {
  const w = MARA, { x, y } = w, ww = w.w, hh = w.h, b = boil(t);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#ffc566');
  ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
  ctx.fillStyle = '#e8b86a'; ctx.globalAlpha = 0.5; ctx.fillRect(x, y + hh * 0.78, ww, hh * 0.22); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#5e3b27'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + ww * 0.5, y); ctx.lineTo(x + ww * 0.5, y + hh * 0.22); ctx.stroke();
  ctx.fillStyle = '#d99a3d'; ctx.beginPath(); ctx.moveTo(x + ww * 0.42, y + hh * 0.22); ctx.lineTo(x + ww * 0.58, y + hh * 0.22); ctx.lineTo(x + ww * 0.64, y + hh * 0.3); ctx.lineTo(x + ww * 0.36, y + hh * 0.3); ctx.fill();
  dot(ctx, x + ww * 0.5, y + hh * 0.32, 1.3, '#fffaf0', 0.95);
  const sil = '#5a3524', br = Math.sin(t * 1.7) * 0.25, lean = Math.sin(t * 0.45) * 1.2;
  ctx.fillStyle = sil;
  // Mara, bob haircut, leaning toward Wren now and then
  ctx.beginPath(); ctx.arc(x + ww * 0.3 + lean, y + hh * 0.55 + br, 3.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + ww * 0.3 + lean, y + hh * 0.5 + br, 3.6, 2.6, 0, Math.PI, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + ww * 0.3, y + hh * 0.84, 5.4, 5, 0, Math.PI, TAU); ctx.fill();
  // Wren, smaller, bunches
  const wy = y + hh * 0.63 - br;
  ctx.beginPath(); ctx.arc(x + ww * 0.7, wy, 2.6, 0, TAU); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + ww * 0.7 + s * 2.8, wy - 0.3, 1.1, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(x + ww * 0.7, y + hh * 0.86, 4, 4, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#6e4630'; ctx.fillRect(x, y + hh * 0.8, ww, 1.6);
  ctx.restore();
  ctx.fillStyle = '#6a4a30'; ctx.fillRect(x, y + hh * 0.36 - 0.8, ww, 1.6);
  inkLoop(ctx, boxPts(x, y, ww, hh, 2), { w: 1.8, seed: 77 + b * 13, gaps: 2, alpha: 0.8 });
  const pulse = 1 + Math.sin(t * 1.1) * 0.08;
  glow(ctx, MARA_C[0], MARA_C[1], 95 * pulse, '#ffc766', 0.62 * k);
  glow(ctx, MARA_C[0], MARA_C[1], 30, '#fff1c9', 0.5 * k);
}
// o: {on(i) 0..1, hearth, eye, look, sync (every lamp moves as one)}
function lampsLive(ctx, t, m, o = {}) {
  SK.lampX.forEach((x, i) => lanternHead(ctx, x, SK.lampY, 1, t, { lit: o.on ? o.on(i) : 1, glass: m.lamp, hot: m.lampHot, hearth: o.hearth, eye: o.eye, look: o.look, seed: o.sync ? 30 : 30 + i * 7 }));
}
function lampGlows(ctx, t, m, on, a = 1) {
  SK.lampX.forEach((x, i) => {
    const k = (on ? on(i) : 1) * a; if (k < 0.01) return;
    glow(ctx, x, SK.lampY, 250 * (1 + noise1(t * 2 + i) * 0.03), m.lamp, 0.42 * k);
    ctx.save(); ctx.translate(x, SK.lampBase - 4); ctx.scale(1, 0.22); glow(ctx, 0, 0, 280, m.lamp, 0.3 * k); ctx.restore();
  });
}
// the wide frame drifts on t. A beat flag pushes in on st.pt, so the cut between beats never jumps.
function pushCam(t, st, on, wide, close, d) {
  const base = drift(t, wide[0], wide[1], 24);
  if (!on) return base;
  const k = settle(st.pt ?? t, 0, d);
  return { x: lerp(base.x, close.x, k), y: lerp(base.y, close.y, k), z: lerp(base.z, close.z, k) };
}
const maraCam = (z) => ({ x: MARA_C[0] + 4, y: MARA_C[1] + 10, z });
const NIGHT_WIDE = [{ x: 960, y: 540, z: 1 }, { x: 960, y: 556, z: 1.05 }];
// the camera looks along the blocks to the right, finds Mara's window, and moves in on it
function findCam(t, pt) {
  const base = drift(t, NIGHT_WIDE[0], NIGHT_WIDE[1], 24), a = settle(pt, 0, 3.4), b = settle(pt, 2.8, 15), close = maraCam(2.15);
  const look = { x: lerp(base.x, 1330, a), y: lerp(base.y, 640, a), z: lerp(base.z, 1.4, a) };
  return { x: lerp(look.x, close.x, b), y: lerp(look.y, close.y, b), z: lerp(look.z, close.z, b) };
}

/* ---------- things that cross the sky and the street ---------- */
const CLOUD_SPR = new Map();
function cloudSprite(color) {
  const key = color + '|' + RS.toFixed(3); let c = CLOUD_SPR.get(key); if (c) return c;
  c = makeCanvas(560 * RS, 170 * RS); const x = c.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
  const r = rng(hashStr(color));
  for (let i = 0; i < 5; i++) wash(x, blobPoly(100 + i * 90, 92 - Math.sin(i * 1.3) * 16, 96, 40, 10, r, 0.2), color, { seed: 70 + i, alpha: 0.07, layers: 12, v: 0.45 });
  CLOUD_SPR.set(key, c); return c;
}
// rows: [y, scale, speed, phase]
function clouds(ctx, t, color, a, rows) {
  const spr = cloudSprite(color);
  ctx.save(); ctx.globalAlpha = a;
  rows.forEach(([y, s, sp, ph]) => { const span = W + 560 * s, x = ((ph * span + t * sp) % span) - 560 * s; ctx.drawImage(spr, x, y - 85 * s, 560 * s, 170 * s); });
  ctx.restore();
}
function planeLight(ctx, t, y, sp) {
  const span = W + 400, x = ((t * sp + 300) % span) - 200;
  dot(ctx, x, y, 2.2, '#fff6dc', 0.8);
  if (frac(t * 0.8) < 0.14) { dot(ctx, x + 6, y, 3, '#e8603f', 0.95); glow(ctx, x + 6, y, 20, '#e8603f', 0.5); }
}
function birds(ctx, t, n, y0, sp, c = '#6b5a4a') {
  const span = W + 700, lead = ((t * sp + 200) % span) - 350;
  for (let i = 0; i < n; i++) {
    const x = lead - (i % 2 ? 1 : -0.4) * i * 26, y = y0 + i * 9 * (i % 2 ? 1 : -1) + Math.sin(t * 0.8 + i) * 5, f = Math.sin(t * 7 + i * 1.7) * 5;
    inkLine(ctx, [[x - 9, y - f], [x - 3, y - 1], [x, y + 1], [x + 3, y - 1], [x + 9, y - f]], { w: 2, seed: i, color: c, alpha: 0.75 });
  }
}
function car(ctx, x, y, s, f, t, body, night, seed) {
  const b = boil(t), X = (dx) => x + f * dx * s, Y = (dy) => y + dy * s;
  if (night) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(X(70), 0, X(340), 0); g.addColorStop(0, rgba('#fff1c9', 0.3)); g.addColorStop(1, rgba('#fff1c9', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(68), Y(-28)); ctx.lineTo(X(340), Y(-56)); ctx.lineTo(X(340), Y(6)); ctx.lineTo(X(68), Y(-16)); ctx.fill(); ctx.restore(); }
  shape(ctx, catmull([[X(-72), Y(-12)], [X(-70), Y(-34)], [X(-34), Y(-38)], [X(-20), Y(-62)], [X(28), Y(-62)], [X(46), Y(-38)], [X(70), Y(-32)], [X(72), Y(-12)]], 3, true), body, { seed, b, inkW: 2.2 });
  ctx.save(); ctx.fillStyle = night ? '#2a3438' : '#b8c6c8'; fillPts(ctx, [[X(-14), Y(-57)], [X(24), Y(-57)], [X(38), Y(-39)], [X(-26), Y(-39)]]); ctx.restore();
  for (const wx of [-44, 42]) { shape(ctx, circlePts(X(wx), Y(-11), 13 * s, 13 * s, 14), '#2a2522', { seed: seed + wx, b, inkW: 2 }); dot(ctx, X(wx), Y(-11), 4.5 * s, '#8f8c84'); }
  if (night) { dot(ctx, X(68), Y(-26), 4 * s, '#fff1c9', 0.95); glow(ctx, X(68), Y(-26), 44 * s, '#fff1c9', 0.5); dot(ctx, X(-70), Y(-26), 3.5 * s, '#e8403a', 0.9); glow(ctx, X(-70), Y(-26), 26 * s, '#e8403a', 0.4); }
}
// lanes: [y, scale, direction, seconds per crossing, color]
function traffic(ctx, t, lanes, night) {
  lanes.forEach(([y, s, dir, per, c], i) => { const u = frac(t / per + hash(i * 7.7)), span = W + 700; car(ctx, dir > 0 ? u * span - 350 : W + 350 - u * span, y, s, dir, t, c, night, 90 + i * 7); });
}
// leaves or petals tumbling through a box
function leaves(ctx, t, n, box, cols, seed = 0) {
  for (let i = 0; i < n; i++) {
    const k = i * 7 + seed, sp = 22 + hash(k) * 30, spanY = box.h + 60, spanX = box.w + 120;
    const y = box.y - 30 + ((hash(k * 2.3) * spanY + t * sp * 0.5) % spanY), x = box.x - 60 + ((hash(k * 3.1) * spanX + t * sp + Math.sin(t * 1.1 + k) * 26) % spanX);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + hash(k)) + k); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + k)));
    ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.4; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
}

/* ---------- the block: three facades up close, the city behind ---------- */
const BK = { ground: 820, curb: 880, lampX: [365, 945, 1540], lampY: 492, lampBase: 874 };
const FACADES = [[-20, 580, 250, '#a0523c', 3], [560, 770, 190, '#d8bf94', 4], [1330, 610, 262, '#8f5a44', 3]];
const BIG = { w: 130, h: 160, px: 190, rows: [300, 530] };
const BK_B = [], BK_W = [];
(function buildBlock() {
  const r = rng(2031);
  for (const [L, t0, t1, bw0, bw1] of [[0, 96, 170, 70, 140], [1, 130, 230, 90, 170]]) {
    let x = -40;
    while (x < W + 40) { const w = bw0 + r() * (bw1 - bw0); BK_B.push({ L, x, w, y: t0 + r() * (t1 - t0), b: 600, c: pickC(r), roof: roofKind(r), seed: 900 + BK_B.length * 7 }); x += w + (r() < 0.3 ? 4 + r() * 10 : 0); }
  }
  FACADES.forEach(([x, w, y, c, cols]) => BK_B.push({ L: 3, x, w, y, b: BK.ground, c, cols, roof: 'flat', seed: 1100 + x }));
  BK_B.forEach((bd, bi) => {
    if (bd.L < 3) { gridWindows(bd, bi, bd.L ? { w: 9, h: 12, px: 16, py: 21, top: 14, bot: 10 } : { w: 6, h: 8, px: 11, py: 15, top: 10, bot: 10 }, BK_W, BK_B, bd.L ? 2 : 1); return; }
    const x0 = bd.x + (bd.w - ((bd.cols - 1) * BIG.px + BIG.w)) / 2;
    for (const y of BIG.rows) for (let c = 0; c < bd.cols; c++) addWin(BK_W, { x: x0 + c * BIG.px, y, w: BIG.w, h: BIG.h, L: 3, bi, p: 7, big: true });
  });
})();
const BK_V = {
  kept: { m: 'rose', fill: 'family' },
  faces: { m: 'throne', fill: 'faces' }, one: { m: 'throne', fill: 'one' }, eyes: { m: 'throne', fill: 'lens', square: true },
};
const BK_BIG = BK_W.filter((w) => w.big);

// one family, painted once and stamped into every window. That sameness is the point.
const FAMILY = [
  { who: { skin: '#e8b99a', hair: 'long', hairC: '#5a3a26', top: '#c9786a', pants: '#6e5a48', shoes: '#2e2520' }, dx: 0.25, lift: 40 },
  { who: { skin: '#e0b391', hair: 'short', hairC: '#3a2a22', top: '#7a5a8a', pants: '#3c3a36', shoes: '#2e2520', tall: 1.05 }, dx: 0.76, lift: 40 },
  { who: { skin: '#f0c9a8', hair: 'curly', hairC: '#6b3a22', top: '#e3b23c', pants: '#4f7a6a', shoes: '#c0452f', kid: true }, dx: 0.5, lift: 12, age: 8 },
];
const SPRITES = new Map();
function familySprite(mood) {
  const key = mood + '|' + RS.toFixed(3);
  let c = SPRITES.get(key);
  if (c) return c;
  c = makeCanvas(BIG.w * RS, BIG.h * RS); const x = c.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
  // pick a moment when the cast's own blink timer leaves every eye open
  let t0 = 0.5; while (t0 < 20 && FAMILY.some((p, i) => blinking(t0, 7 + i))) t0 += 0.1;
  const savedBoil = BOIL_ON; BOIL_ON = false;
  FAMILY.forEach((p, i) => person(x, { who: p.who, x: BIG.w * p.dx, y: BIG.h + p.lift, h: 150, f: 0, age: p.age, arms: 'down', mood, t: t0, seed: 7 + i, shadow: false }));
  BOIL_ON = savedBoil;
  SPRITES.set(key, c);
  return c;
}
// tied-back curtains, painted once and stamped over every family
function curtainSprite() {
  const key = 'curtain|' + RS.toFixed(3); let c = SPRITES.get(key); if (c) return c;
  c = makeCanvas(BIG.w * RS, BIG.h * RS); const x = c.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
  const cc = qc(mix(MOODS.rose.lit, '#b5454f', 0.45)), ww = BIG.w, hh = BIG.h;
  for (const sd of [-1, 1]) {
    const ex = sd < 0 ? 0 : ww;
    shape(x, catmull([[ex, -4], [ex - sd * ww * 0.28, -4], [ex - sd * ww * 0.07, hh * 0.52], [ex - sd * ww * 0.17, hh + 4], [ex, hh + 4]], 4, true), cc, { seed: 40 + sd, inkW: 2, boilAmp: 0.3, gaps: 2 });
    x.fillStyle = qc(mix(cc, PAL.ink, 0.3)); x.fillRect(ex - sd * ww * 0.16 - 5, hh * 0.52, 10, 5);
  }
  SPRITES.set(key, c); return c;
}
// a head-and-shoulders silhouette. kind 5 is the one person who ends up in every window.
function bust(ctx, cx, by, s, kind, c, seed) {
  const o = { seed, inkW: 1.8, inkColor: mix(c, PAL.ink, 0.6), pool: 0.3, boilAmp: 0.4, gaps: 2 };
  const sq = kind === 5 ? 1.22 : 1, hy = by - 3 * s;
  if (kind === 1) shape(ctx, catmull([[cx - 1.2 * s, hy - 0.6 * s], [cx - 1.35 * s, by - 1.2 * s], [cx - 0.9 * s, by - 0.9 * s], [cx + 0.9 * s, by - 0.9 * s], [cx + 1.35 * s, by - 1.2 * s], [cx + 1.2 * s, hy - 0.6 * s], [cx, hy - 1.2 * s]], 4, true), c, o);
  shape(ctx, catmull([[cx - 2.5 * s * sq, by + 3], [cx - 2.35 * s * sq, by - 1.1 * s], [cx - 1.3 * s, by - 1.75 * s], [cx, by - 1.95 * s], [cx + 1.3 * s, by - 1.75 * s], [cx + 2.35 * s * sq, by - 1.1 * s], [cx + 2.5 * s * sq, by + 3]], 4, true), c, o);
  if (kind === 5) for (const sd of [-1, 1]) shape(ctx, [[cx + sd * 0.25 * s, by - 1.95 * s], [cx + sd * 0.95 * s, by - 2.35 * s], [cx + sd * 1.05 * s, by - 1.55 * s]], c, { ...o, seed: seed + sd });
  shape(ctx, circlePts(cx, hy, s * 0.9, s * 1.06, 20), c, o);
  if (kind === 0) shape(ctx, circlePts(cx, hy - 1.25 * s, s * 0.46, s * 0.4, 14), c, { ...o, seed: seed + 3 });
  if (kind === 2) shape(ctx, circlePts(cx, hy - 0.2 * s, s * 1.35, s * 1.25, 22), c, { ...o, seed: seed + 3 });
  if (kind === 4) shape(ctx, [[cx - 1 * s, hy - 0.3 * s], [cx - 0.8 * s, hy - 1.15 * s], [cx + 0.9 * s, hy - 1.1 * s], [cx + 1.9 * s, hy - 0.45 * s], [cx + 1 * s, hy - 0.35 * s]], c, { ...o, seed: seed + 3 });
  if (kind === 5) shape(ctx, catmull([[cx - 1 * s, hy - 0.2 * s], [cx - 1.05 * s, hy - 1.1 * s], [cx - 0.2 * s, hy - 1.75 * s], [cx + 1.05 * s, hy - 1.55 * s], [cx + 1.05 * s, hy - 0.8 * s], [cx + 0.2 * s, hy - 1.05 * s]], 4, true), c, { ...o, seed: seed + 3 });
}
function bigWindow(ctx, w, m, V, bcol) {
  const { x, y } = w, ww = w.w, hh = w.h, fill = V.fill;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(m.halo, 0.08); ctx.fillRect(x - w.p, y - w.p, ww + w.p * 2, hh + w.p * 2); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + hh);
  if (fill === 'lens') { g.addColorStop(0, '#1d3134'); g.addColorStop(1, '#0c1719'); }
  else { g.addColorStop(0, m.litIn); g.addColorStop(1, m.lit); }
  ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
  if (fill === 'faces') bust(ctx, x + ww * (0.42 + w.q * 0.16), y + hh + 2, 15 + w.c * 4, Math.floor(w.q * 5), m.sil, w.i * 3);
  if (fill === 'one') bust(ctx, x + ww / 2, y + hh + 2, 17, 5, m.sil, 5);
  if (fill === 'lens') {
    const cx = x + ww / 2, cy = y + hh * 0.48;
    for (const [px, py] of [[x + 8, y + 10], [x + ww - 8, y + 10], [x + 8, y + hh - 10], [x + ww - 8, y + hh - 10]]) inkLine(ctx, [[px, py], [lerp(px, cx, 0.62), lerp(py, cy, 0.62)]], { w: 3, seed: px + py, color: '#3a4a4c' });
    shape(ctx, circlePts(cx, cy, 50, 50, 30), '#2c3538', { seed: w.i, inkW: 2.4, boilAmp: 0.4 });
    shape(ctx, circlePts(cx, cy, 36, 36, 26), '#16292b', { seed: w.i + 1, inkW: 2, boilAmp: 0.3 });
    ctx.save(); ctx.strokeStyle = PAL.frost; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, TAU); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  if (fill !== 'lens') { ctx.fillStyle = mix(fill === 'family' ? m.lit : m.lit, PAL.ink, 0.5); ctx.fillRect(x, y + hh * 0.22 - 1.5, ww, 3); }
  inkLoop(ctx, boxPts(x, y, ww, hh, 3), { w: 2.6, seed: w.i + 11, gaps: 2, alpha: 0.85 });
  shape(ctx, boxPts(x - 9, y + hh, ww + 18, 11, 3), qc(mix(bcol, '#fff4e0', 0.25)), { seed: w.i + 12, inkW: 2, boilAmp: 0.4, gaps: 2 });
  shape(ctx, boxPts(x - 6, y - 16, ww + 12, 12, 3), qc(mix(bcol, PAL.ink, 0.18)), { seed: w.i + 13, inkW: 2, boilAmp: 0.4, gaps: 2 });
}
defineSet('city-block', (ctx, v) => {
  const V = BK_V[v] || BK_V.kept, m = MOODS[V.m];
  paintSky(ctx, m, 420);
  for (let L = 0; L < 4; L++) {
    if (L === 1) veil(ctx, m, m.veilA[0], 60, 620);
    if (L === 3) veil(ctx, m, m.veilA[1], 60, 620);
    BK_B.forEach((bd) => { if (bd.L === L) { paintBlock(ctx, bd, m); if (L < 3) roofBits(ctx, bd, m); } });
    for (const w of BK_W) if (w.L === L) { if (w.big) bigWindow(ctx, w, m, V, tone(BK_B[w.bi].c, m, 3)); else paintWin(ctx, w, m, true, tone(BK_B[w.bi].c, m, L), V.fill); }
  }
  // ground floors: a door each, and dark shop glass
  FACADES.forEach(([x, w, , c], i) => {
    const col = tone(c, m, 3), dx = [270, 1040, 1635][i];
    inkLine(ctx, [[x + 6, 704], [x + w - 6, 704]], { w: 2.4, seed: 1200 + i, alpha: 0.6 });
    shape(ctx, rrectPts(dx - 36, BK.ground - 112, 72, 112, 14), tone('#5e3b27', m, 3), { seed: 1210 + i, inkW: 2.4, boilAmp: 0.4 });
    shape(ctx, boxPts(dx - 50, BK.ground - 10, 100, 12, 2), mix(col, '#fff4e0', 0.2), { seed: 1220 + i, inkW: 2, boilAmp: 0.3 });
    for (const sx of [dx - 180, dx + 90]) if (sx > x + 10 && sx + 90 < x + w - 10 && Math.abs(sx + 45 - 945) > 60) { shape(ctx, boxPts(sx, 724, 90, 70, 2), qc(mix(m.dark, col, 0.2)), { seed: 1230 + sx, inkW: 2, boilAmp: 0.3 }); }
  });
  if (V.square) {
    ctx.fillStyle = m.walk; ctx.fillRect(0, BK.ground, W, H - BK.ground);
    wash(ctx, boxPts(-60, BK.ground, W + 120, 280, 3), mix(m.walk, '#9fd3cb', 0.2), { seed: 1300, alpha: 0.06, layers: 12 });
    let y = BK.ground + 14; for (let k = 0; k < 7; k++) { inkLine(ctx, [[-10, y], [W + 10, y]], { w: 1.6, alpha: 0.35, seed: 1310 + k }); y += 16 + k * 9; }
    for (let k = -14; k <= 14; k++) inkLine(ctx, [[960 + k * 70, BK.ground], [960 + k * 170, H + 10]], { w: 1.4, alpha: 0.28, seed: 1330 + k });
    shape(ctx, boxPts(-30, BK.ground - 4, W + 60, 12, 6), mix(m.walk, PAL.ink, 0.3), { seed: 1350, inkW: 2.2, boilAmp: 0.4, gaps: 3 });
  } else {
    shape(ctx, boxPts(-30, BK.ground - 3, W + 60, BK.curb - BK.ground + 6, 6), m.walk, { seed: 1360, boilAmp: 0.5, inkW: 2.4, gaps: 3 });
    shape(ctx, boxPts(-30, BK.curb - 2, W + 60, 12, 6), mix(m.walk, PAL.ink, 0.25), { seed: 1361, boilAmp: 0.4, inkW: 2.2, gaps: 3 });
    ctx.fillStyle = m.road; ctx.fillRect(0, BK.curb + 9, W, H);
    for (let i = 0; i < 14; i++) brushDry(ctx, [[-20, 910 + i * 11], [W + 20, 912 + i * 11]], { w: 2, k: 3, alpha: 0.1, seed: 1370 + i, dry: 0.6 });
  }
  BK.lampX.forEach((x, i) => lampPost(ctx, x, BK.lampBase, BK.lampY + 32, 0.9, m, 1400 + i));
});
function blockLamps(ctx, t, m, o = {}) {
  BK.lampX.forEach((x, i) => lanternHead(ctx, x, BK.lampY, 0.9, t, { lit: 1, glass: m.lamp, hot: m.lampHot, hearth: o.hearth, eye: o.eye, look: o.look, seed: 40 + i * 5 }));
}
function blockGlows(ctx, t, m, a = 1) {
  BK.lampX.forEach((x, i) => { glow(ctx, x, BK.lampY, 260 * (1 + noise1(t * 2 + i) * 0.03), m.lamp, 0.4 * a); ctx.save(); ctx.translate(x, BK.lampBase); ctx.scale(1, 0.24); glow(ctx, 0, 0, 300, m.lamp, 0.3 * a); ctx.restore(); });
}
function flakes(ctx, t, n, c, a = 0.6) {
  for (let i = 0; i < n; i++) {
    const sp = 18 + hash(i * 1.7) * 26, y = ((hash(i * 2.3) * 1200 + t * sp) % 1200) - 60, x = ((hash(i * 3.1) * W + Math.sin(t * 0.4 + i) * 30 + t * 6) % W + W) % W;
    dot(ctx, x, y, 1.2 + hash(i * 5.1) * 2, c, a * (0.4 + hash(i * 7.3) * 0.6));
  }
}

/* ---------- the park: lawn, trees, benches, the city behind a fence ---------- */
const PK = { road: 492, fence: 552, lawn: 566 };
const PK_PATH = [[-80, 900], [300, 850], [700, 806], [1100, 776], [1500, 752], [2000, 728]];
const pathY = (x) => { for (let i = 1; i < PK_PATH.length; i++) if (x <= PK_PATH[i][0]) { const a = PK_PATH[i - 1], b = PK_PATH[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); } return PK_PATH[PK_PATH.length - 1][1]; };
const pathW = (x) => lerp(120, 64, clamp((x + 80) / 2080));
const PK_TREES = [[210, 720, 1.35], [760, 690, 1.45], [1330, 676, 1.3], [1770, 700, 1.25]];
const PK_BENCH = [[470, 1.05], [1140, 0.92], [1620, 0.86]].map(([x, s]) => [x, pathY(x) - pathW(x) / 2 - 2, s]);
const PK_B = [], PK_W = [];
(function buildPark() {
  const r = rng(515);
  for (const [L, t0, t1] of [[1, 236, 330], [2, 300, 400]]) {
    let x = -40;
    while (x < W + 40) { const w = 110 + r() * 150; PK_B.push({ L, x, w, y: t0 + r() * (t1 - t0), b: PK.road + 6, c: pickC(r), roof: roofKind(r), seed: 1500 + PK_B.length * 7 }); x += w + (r() < 0.3 ? 4 + r() * 12 : 0); }
  }
  PK_B.forEach((bd, bi) => gridWindows(bd, bi, bd.L === 1 ? { w: 7, h: 9, px: 13, py: 17, top: 12, bot: 14 } : { w: 10, h: 13, px: 18, py: 23, top: 16, bot: 16 }, PK_W, PK_B, 2));
})();
defineSet('city-park', (ctx, v) => {
  const m = MOODS[v === 'quiet' ? 'quiet' : 'sharp'], trimmed = v === 'quiet';
  paintSky(ctx, m, 480);
  for (const L of [1, 2]) {
    if (L === 2) veil(ctx, m, m.veilA[0], 220, 500);
    PK_B.forEach((bd) => { if (bd.L === L) { paintBlock(ctx, bd, m); roofBits(ctx, bd, m); } });
    for (const w of PK_W) if (w.L === L) paintWin(ctx, w, m, !trimmed && w.k < 0.4, tone(PK_B[w.bi].c, m, L));
  }
  veil(ctx, m, 0.18, 300, 500);
  ctx.fillStyle = m.road; ctx.fillRect(0, PK.road, W, PK.fence - PK.road);
  shape(ctx, boxPts(-30, PK.road - 4, W + 60, 10, 6), m.walk, { seed: 1600, inkW: 1.8, boilAmp: 0.4, gaps: 3 });
  for (let x = -20; x < W; x += 150) shape(ctx, boxPts(x, 518, 70, 5, 2), mix(m.road, '#efe4cf', 0.35), { seed: 1601 + x, inkW: 1, boilAmp: 0.3, gaps: 1 });
  // lawn
  const grass = trimmed ? '#8fa07f' : '#b4bb92';
  ctx.fillStyle = grass; ctx.fillRect(0, PK.lawn, W, H - PK.lawn);
  wash(ctx, boxPts(-60, PK.lawn, W + 120, 520, 3), mix(grass, '#fff8e8', 0.2), { seed: 1602, alpha: 0.07, layers: 14 });
  wash(ctx, boxPts(-60, 820, W + 120, 300, 3), mix(grass, PAL.ink, 0.15), { seed: 1603, alpha: 0.06, layers: 12 });
  if (trimmed) for (let k = 0; k < 9; k++) { const y0 = PK.lawn + 20 + k * 58; ctx.save(); ctx.globalAlpha = k % 2 ? 0.1 : 0.05; ctx.fillStyle = k % 2 ? '#e6ecd8' : PAL.ink; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0 - 40); ctx.lineTo(W, y0 + 18); ctx.lineTo(0, y0 + 58); ctx.fill(); ctx.restore(); }
  else for (let i = 0; i < 90; i++) { const gx = hash(i * 3.3) * W, gy = PK.lawn + 30 + hash(i * 7.1) * 480; brushDry(ctx, [[gx, gy], [gx + 6, gy - 14]], { w: 2, k: 2, alpha: 0.3, seed: i, dry: 0.3 }); }
  // path
  const top = PK_PATH.map(([x, y]) => [x, y - pathW(x) / 2]), bot = PK_PATH.map(([x, y]) => [x, y + pathW(x) / 2]).reverse();
  shape(ctx, catmull(top, 6).concat(catmull(bot, 6)), trimmed ? '#cfcfc2' : '#e6d6b4', { seed: 1610, inkW: 2.2, boilAmp: 0.5, gaps: 4, pool: 0.8 });
  // fence and hedges along it
  const iron = tone('#2f3436', m, 3);
  inkLine(ctx, [[-10, PK.fence - 40], [W + 10, PK.fence - 40]], { w: 2.2, seed: 1620, color: iron, alpha: 0.8 });
  for (let x = 8; x < W; x += 22) inkLine(ctx, [[x, PK.fence + 6], [x, PK.fence - 48]], { w: 2, seed: 1621 + x, color: iron, alpha: 0.75 });
  for (let k = 0; k < 9; k++) {
    const hx = -20 + k * 230, hw = 190;
    if (trimmed) shape(ctx, boxPts(hx, PK.fence - 22, hw, 44, 3), '#6d8566', { seed: 1650 + k, inkW: 2.2, boilAmp: 0.3, gaps: 2, shade: { dx: 0, dy: 10, a: 0.18 } });
    else { const rr = rng(1660 + k); for (let j = 0; j < 4; j++) shape(ctx, blobPoly(hx + 25 + j * 45, PK.fence - 4, 36 + rr() * 10, 28 + rr() * 8, 11, rr, 0.18), qc(mix('#98a47e', PAL.ink, rr() * 0.1)), { seed: 1670 + k * 5 + j, inkW: 1.8, boilAmp: 0.5, gaps: 3 }); }
  }
  // dandelions gone to seed on the morning lawn
  if (!trimmed) for (let i = 0; i < 46; i++) { const dx = hash(i * 5.7) * W, dy = PK.lawn + 60 + hash(i * 2.9) * 460; if (Math.abs(dy - pathY(dx)) < pathW(dx) * 0.7) continue; inkLine(ctx, [[dx, dy], [dx + 2, dy - 18]], { w: 1.4, seed: i, color: '#6f7a58', alpha: 0.7 }); dot(ctx, dx + 2, dy - 22, 6.5, '#fbf6ea', 0.8); ctx.save(); ctx.strokeStyle = '#c9c0ae'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dx + 2, dy - 22, 6.5, 0, TAU); ctx.stroke(); ctx.restore(); }
  PK_TREES.forEach(([x, y, s], i) => tree(ctx, x, y, s, { ...m, tree: trimmed ? '#6f8a62' : '#9aa77e' }, 1700 + i * 9, trimmed));
  PK_BENCH.forEach(([x, y, s], i) => bench(ctx, x, y, s, m, 1750 + i * 3));
  for (const lx of [980, 1880]) { const ly = pathY(lx) - pathW(lx) / 2 - 4; lampPost(ctx, lx, ly, ly - 250, 0.8, m, 1760 + lx); lanternHead(ctx, lx, ly - 280, 0.72, 0, { lit: 0.2, glass: '#e8e4d6', seed: 1770 + lx, dim: '#9aa0a0' }); }
});

/* ---------- a night street that repeats, for a walk that never runs off the screen ---------- */
const NS = { walk: 862, curb: 975, lamps: [480, 1440], lampY: 406, speedF: 74, speedB: 30 };
const NS_B = [];
(function buildNight() {
  const r = rng(303); let x = 0;
  while (x < W - 10) { let w = 150 + r() * 170; if (W - (x + w) < 150) w = W - x; NS_B.push({ L: 2, x, w, y: 290 + r() * 170, b: NS.walk + 4, c: pickC(r), roof: roofKind(r), seed: 1800 + NS_B.length * 11 }); x += w; }
})();
const NS_W = [];
NS_B.forEach((bd, bi) => gridWindows(bd, bi, { w: 14, h: 19, px: 26, py: 34, top: 26, bot: 60 }, NS_W, NS_B, 3));
// draw fn at x, and again one tile over when it would cross the seam
const tiled = (x, half, fn) => { fn(x); if (x - half < 0) fn(x + W); if (x + half > W) fn(x - W); };
defineSet('city-nightBack', (ctx) => {
  const m = MOODS.night;
  const g = ctx.createLinearGradient(0, 0, 0, NS.walk); g.addColorStop(0, m.sky[0]); g.addColorStop(0.6, m.sky[1]); g.addColorStop(1, m.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, NS.walk + 20);
  for (let i = 0; i < 60; i++) dot(ctx, hash(i * 7.7) * W, hash(i * 3.9) * 300, 0.8 + hash(i * 1.1) * 1.2, '#f6ecd0', 0.2 + hash(i * 2.3) * 0.4);
  NS_B.forEach((bd) => { paintBlock(ctx, bd, m); roofBits(ctx, bd, m); });
  for (const w of NS_W) paintWin(ctx, w, m, w.k < 0.07, tone(NS_B[w.bi].c, m, 2));
  veil(ctx, m, 0.3, 250, NS.walk + 20);
});
defineSet('city-nightFront', (ctx) => {
  const m = MOODS.night;
  ctx.fillStyle = m.walk; ctx.fillRect(0, NS.walk, W, NS.curb - NS.walk);
  ctx.fillStyle = mix(m.walk, '#ffffff', 0.05); ctx.fillRect(0, NS.walk, W, 8);
  for (let x = 0; x < W; x += 120) { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, NS.walk + 8); ctx.lineTo(x - 22, NS.curb - 4); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = mix(m.walk, PAL.ink, 0.3); ctx.fillRect(0, NS.curb - 4, W, 14);
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.8; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, NS.curb - 4); ctx.lineTo(W, NS.curb - 4); ctx.stroke(); ctx.restore();
  ctx.fillStyle = m.road; ctx.fillRect(0, NS.curb + 10, W, H);
  for (let x = 0; x < W; x += 240) { ctx.fillStyle = rgba('#efe4cf', 0.16); ctx.fillRect(x + 40, 1050, 120, 7); }
  const tr = { ...m, tree: '#1c2a26' };
  tiled(960, 120, (x) => tree(ctx, x, NS.walk + 30, 1.25, tr, 1900, false));
  tiled(0, 120, (x) => tree(ctx, x, NS.walk + 30, 1.2, tr, 1910, false));
  NS.lamps.forEach((x, i) => { lampPost(ctx, x, NS.walk + 40, NS.lampY + 34, 1.1, m, 1920 + i); lanternHead(ctx, x, NS.lampY, 1.1, 0, { lit: 1, glass: m.lamp, seed: 1930 + i }); });
  // hydrant, a mailbox, a bin
  shape(ctx, catmull([[700, NS.walk + 40], [696, NS.walk - 10], [712, NS.walk - 26], [728, NS.walk - 10], [724, NS.walk + 40]], 4, true), '#8a3a2e', { seed: 1940, inkW: 2.4 });
  shape(ctx, rrectPts(1180, NS.walk - 60, 60, 100, 18), '#3f5a6a', { seed: 1941, inkW: 2.4 });
  // a street clock that says three
  lampPost(ctx, 1700, NS.walk + 40, NS.walk - 170, 0.8, m, 1943);
  shape(ctx, circlePts(1700, NS.walk - 200, 38, 38, 26), '#2f3436', { seed: 1944, inkW: 2.4 });
  shape(ctx, circlePts(1700, NS.walk - 200, 30, 30, 24), '#e9dcc0', { seed: 1945, inkW: 1.8 });
  inkLine(ctx, [[1700, NS.walk - 200], [1700, NS.walk - 224]], { w: 3, seed: 1946 });
  inkLine(ctx, [[1700, NS.walk - 200], [1717, NS.walk - 200]], { w: 4, seed: 1947 });
});

/* ---------- people for the endings ---------- */
const pale = (st, k = 0.38) => { const o = { ...st }; for (const key of ['skin', 'hairC', 'top', 'topIn', 'pants', 'shoes', 'capC', 'band']) if (o[key]) o[key] = mix(o[key], '#efe4cf', k); return o; };
// eyes turned up toward the sky, drawn over the cast's default eyes
function gazeUp(ctx, P, skin, f) {
  const [hx, hy, hr] = P.head, fd = f === 0 ? 1 : f;
  const ex = hx + (f === 0 ? 0 : fd * hr * 0.3), ey = hy + hr * 0.08, sp = f === 0 ? hr * 0.38 : hr * 0.33, er = hr * 0.105;
  for (const s of [-1, 1]) {
    const exx = ex + s * sp * 0.5 * (f !== 0 && s === -fd ? 0.8 : 1);
    dot(ctx, exx, ey + er * 0.1, er * 1.45, skin, 1);
    dot(ctx, exx, ey - er * 0.8, er * 0.85, PAL.ink, 1);
  }
}
function dandelionSeed(ctx, x, y, s, t, i, a = 0.8) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.6 + i) * 0.35);
  ctx.lineCap = 'round';
  for (const [c, al, dx] of [['#7a6a58', 0.22, 0.8], ['#fffdf6', a, 0]]) {
    ctx.strokeStyle = c; ctx.globalAlpha = al; ctx.lineWidth = Math.max(0.8, s * 0.13);
    ctx.beginPath();
    for (let k = 0; k < 9; k++) { const an = Math.PI + (k / 8) * Math.PI; ctx.moveTo(dx, s * 0.1 + dx); ctx.lineTo(dx + Math.cos(an) * s * 1.7, dx + Math.sin(an) * s * 1.2); }
    ctx.moveTo(dx, dx); ctx.lineTo(dx, s * 2.3 + dx); ctx.stroke();
  }
  ctx.globalAlpha = a; ctx.fillStyle = '#b8a88a'; ctx.beginPath(); ctx.ellipse(0, s * 2.45, s * 0.2, s * 0.34, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function mower(ctx, x, y, s, f, t, seed) {
  const b = boil(t);
  for (const wx of [-24, 22]) shape(ctx, circlePts(x + wx * s, y - 9 * s, 9 * s, 9 * s, 12), '#2f3436', { seed: seed + wx, b, inkW: 1.8, gaps: 1 });
  shape(ctx, catmull([[x - 38 * s, y - 11 * s], [x - 34 * s, y - 34 * s], [x + f * 6 * s, y - 42 * s], [x + 36 * s, y - 30 * s], [x + 38 * s, y - 11 * s]], 4, true), '#b3bbb2', { seed, b, inkW: 2.2 });
  shape(ctx, circlePts(x + f * 12 * s, y - 42 * s, 10 * s, 7 * s, 12), '#dfe8e4', { seed: seed + 3, b, inkW: 1.6 });
  dot(ctx, x + f * 31 * s, y - 24 * s, 3.4 * s, PAL.frost, 0.6 + 0.4 * Math.sin(t * 3 + seed));
  for (let k = 0; k < 4; k++) { const ph = frac(t * 1.3 + k / 4); dot(ctx, x - f * (40 + ph * 30) * s, y - (8 + ph * 16) * s, 2.2 * s, '#a9c08f', 0.6 * (1 - ph)); }
}

/* ---------- shots: the night city ---------- */
const NIGHT_CLOUDS = [[110, 1.1, 7, 0.1], [205, 0.85, 5, 0.6], [272, 0.9, 9, 0.35]];
const DAWN_CLOUDS = [[120, 1.2, 5, 0.2], [215, 0.9, 4, 0.7], [290, 1.0, 6, 0.45]];
const NIGHT_TRAFFIC = [[1034, 0.95, -1, 17, '#5d7a7a'], [1080, 1.05, 1, 12, '#a0523c']];
const LEAF_C = ['#b5552f', '#d99a3d', '#8a5a3b'];
function nightSky(ctx, t, a = 1) { starTwinkle(ctx, t); clouds(ctx, t, '#3a4a54', 0.34 * a, NIGHT_CLOUDS); planeLight(ctx, t, 168, 24); }

shot('city.windows', {
  grade: () => ({ sat: 0.95, tint: '#f2d7a8', tintA: 0.1, vig: 0.85 }),
  draw(ctx, t, st) {
    const m = MOODS.night, pt = st.pt ?? t, push = !!st.p.push;
    const cam = push ? findCam(t, pt) : drift(t, NIGHT_WIDE[0], NIGHT_WIDE[1], 24);
    applyCam(ctx, cam);
    warmSet('city-skyline', ['night', 'nightDark', 'nightAll']);
    drawSet(ctx, 'city-skyline', 'night');
    // the city switches its lights on as we arrive, and then keeps living
    const onF = 0.4 + 0.6 * settle(t, 0.3, 11), isLit = (w) => w === MARA || (LIT.night(w) && w.r < onF);
    const { on, off } = toggled(t, isLit);
    swapWins(ctx, 'city-skyline', 'nightDark', SKY_LIT.night.filter((w) => w !== MARA && w.r >= onF).concat(off));
    swapWins(ctx, 'city-skyline', 'nightAll', on);
    nightSky(ctx, t);
    smoke(ctx, t);
    windowLife(ctx, t, m, LIFE.filter(isLit));
    walkers(ctx, t, m.sil, isLit);
    maraWindow(ctx, t, push ? 1 + 0.8 * settle(pt, 2.8, 1.6) : 1);
    lampsLive(ctx, t, m);
    traffic(ctx, t, NIGHT_TRAFFIC, true);
    leaves(ctx, t, 7, { x: 0, y: 780, w: W, h: 200 }, LEAF_C);
    lampGlows(ctx, t, m);
  },
});

// the dark closes in on Mara's window: the far windows go first
const NARROW = rankBy(SKY_LIT.night.filter((w) => w !== MARA), (w) => 0.82 * clamp(1 - Math.hypot(w.x - MARA_C[0], (w.y - MARA_C[1]) * 1.5) / 1250) + 0.18 * hash(w.i * 3.9));
const NARROW_LAMPS = SK.lampX.map((x) => 0.82 * clamp(1 - Math.abs(x - MARA_C[0]) / 1250) + 0.09);
shot('city.narrow', {
  grade: () => ({ sat: 0.9, tint: '#f2d7a8', tintA: 0.08, vig: 0.92 }),
  draw(ctx, t, st) {
    const m = MOODS.night, one = !!st.p.one;
    // slow waves on t, and max() lets the second beat carry on from wherever the first left off
    const f0 = Math.min(0.8, waves(t, 4.5, 2.8, 0.1)), f = one ? Math.max(f0, 1.01 * settle(st.pt ?? t, 0.3, 6.5)) : f0;
    const cam = pushCam(t, st, one, [{ x: 960, y: 540, z: 1 }, { x: 960, y: 560, z: 1.08 }], maraCam(1.9), 14);
    applyCam(ctx, cam);
    warmSet('city-skyline', ['night', 'nightDark']);
    drawSet(ctx, 'city-skyline', 'night');
    swapWins(ctx, 'city-skyline', 'nightDark', upTo(NARROW, f));
    nightSky(ctx, t, 1 - f * 0.5);
    const on = (i) => (f > NARROW_LAMPS[i] ? 0 : 1);
    lampsLive(ctx, t, m, { on });
    // the last car on the street drives away
    car(ctx, lerp(700, W + 340, settle(t, 0.8, 11)), 1080, 1.05, 1, t, '#a0523c', true, 95);
    leaves(ctx, t, 5, { x: 0, y: 780, w: W, h: 200 }, LEAF_C, 3);
    maraWindow(ctx, t, 1 + f * 0.4);
    lightMask(ctx, `rgba(4,8,12,${(0.62 * clamp(f)).toFixed(3)})`, [{ x: MARA_C[0], y: MARA_C[1], r: 430, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    lampGlows(ctx, t, m, on);
    glow(ctx, MARA_C[0], MARA_C[1], 120, '#ffd27a', 0.3 * clamp(f));
  },
});

// at dawn the lights go out in waves that travel across the city, ragged at the front
const LIGHTSOUT = rankBy(SKY_LIT.sharp, (w) => (0.72 * (w.x + 30)) / (W + 60) + 0.28 * hash(w.i * 5.1));
shot('city.lightsout', {
  grade: () => ({ sat: 0.66, tint: '#f2dcc0', tintA: 0.24, vig: 0.8 }),
  draw(ctx, t, st) {
    const m = MOODS.sharp, f = Math.min(1.01, waves(st.pt ?? t, 5, 3.4, 0.125));
    const cam = drift(t, { x: 960, y: 540, z: 1.02 }, { x: 960, y: 560, z: 1.08 }, 30);
    applyCam(ctx, cam);
    warmSet('city-skyline', ['sharp', 'sharpDark']);
    drawSet(ctx, 'city-skyline', 'sharp');
    swapWins(ctx, 'city-skyline', 'sharpDark', upTo(LIGHTSOUT, f));
    clouds(ctx, t, '#fff6ea', 0.6, DAWN_CLOUDS);
    birds(ctx, t, 7, 240, 30);
    lampsLive(ctx, t, m, { hearth: 'warm', look: 0.2, sync: true });
    for (let i = 0; i < 16; i++) { const y = ((hash(i * 2.9) * 1100 + t * 13) % 1100) - 40, x = ((hash(i * 6.1) * (W + 200) + t * 6 + Math.sin(t * 0.35 + i) * 30) % (W + 200)) - 100; dandelionSeed(ctx, x, y, 6, t, i, 0.8); }
  },
});

// more machines: drones lift off the roofs one after another and join the sky
const ROOFS = SKY_B.filter((b) => b.L >= 2 && b.x > 0 && b.x < W - 60).filter((b, i) => i % 2 === 0).map((b) => [b.x + b.w * 0.5, b.y]);
function liftoff(ctx, t, t0, n) {
  for (let k = 0; k < n; k++) {
    const ts = t0 + k * 1.1; if (t < ts) break;
    const [rx, ry] = ROOFS[(k * 7) % ROOFS.length], u = settle(t, ts, 6);
    drone(ctx, rx + (t - ts) * (k % 2 ? 12 : -12) * u, lerp(ry - 16, 90 + (k % 5) * 48, u), lerp(0.55, 0.85, u), t, 200 + k, { pkg: false });
  }
}
const sweeper = (ctx, t, y, per, seed) => mower(ctx, lerp(-120, W + 120, frac(t / per + hash(seed))), y, 0.75, 1, t, seed);
shot('sharp.city', {
  grade: () => ({ sat: 0.6, tint: '#f2dcc0', tintA: 0.32, vig: 0.75 }),
  draw(ctx, t, st) {
    const m = MOODS.sharp;
    const cam = drift(t, { x: 960, y: 640, z: 1.22 }, { x: 960, y: 656, z: 1.3 }, 30);
    applyCam(ctx, cam);
    warmSet('city-skyline', ['sharp', 'sharpDark', 'sharpAll']);
    drawSet(ctx, 'city-skyline', 'sharp');
    liveRooms(ctx, t, 'sharp', LIT.sharp);
    clouds(ctx, t, '#fff6ea', 0.6, DAWN_CLOUDS);
    birds(ctx, t, 6, 230, 26);
    liftoff(ctx, t, 6, 14);
    // one by one the lamps kindle a small Hearth, and then they all bob and blink as one
    const on = (i) => settle(t, 0.8 + i * 1.3, 1.3);
    lampsLive(ctx, t, m, { hearth: 'warm', on, sync: true, look: Math.sin(t * 0.25) * 0.3 });
    sweeper(ctx, t, SK.curb - 10, 34, 7);
    SK.lampX.forEach((x, i) => glow(ctx, x, SK.lampY, 170, '#ffd9a0', 0.18 * on(i)));
    glow(ctx, 1440, 400, 1000, '#ffd9a8', 0.22);
  },
});

// people on the grass lie back one at a time, slowly, as if for a nap
const RECLINE = [[12, 560, 975, 420, 1, 1.0], [40, 860, 998, 440, 1, 3.2, 9], [7, 1330, 1000, 440, -1, 5.4], [21, 1560, 880, 300, -1, 7.6], [33, 330, 862, 290, 1, 9.8], [55, 1060, 884, 300, 1, 12]]
  .map(([sd, x, y, h, f, at, age]) => ({ who: pale(age ? { ...crowdStyle(sd), kid: true } : crowdStyle(sd), 0.34), x, y, h, f, at, age, seed: sd }));
// k: 0 sitting up on the grass, 1 lying flat. The legs are drawn here and stay put. The cast draws the body, which leans back around the hip.
function recliner(ctx, o, k, t) {
  const st = o.who, b = boil(t), kidK = st.kid ? lerp(0.6, 0.9, clamp(((o.age ?? 8) - 8) / 6)) : 1, hh = o.h * (st.tall ?? 1) * kidK, hipY = o.y - 0.06 * hh, fd = o.f;
  const legW = (st.kid ? 0.085 : 0.075) * hh * (st.wide ?? 1) * (st.thin ?? 1);
  ctx.save(); ctx.globalAlpha = 0.13 + 0.05 * k; ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(o.x + fd * hh * (0.12 - 0.3 * k), o.y + 2, hh * (0.28 + 0.26 * k), hh * 0.04, 0, 0, TAU); ctx.fill(); ctx.restore();
  for (const [i, dx] of [[0, -0.06], [1, 0.06]]) {
    const hx = o.x + dx * hh, knee = [hx + fd * 0.2 * hh, hipY - 0.01 * hh], foot = [hx + fd * 0.25 * hh, o.y - 0.02 * hh];
    tube(ctx, [[hx, hipY], [lerp(hx, knee[0], 0.5), hipY - 0.006 * hh], knee, foot], legW, st.pants, { seed: o.seed + 20 + i, b });
    shape(ctx, circlePts(foot[0] + fd * 0.03 * hh, o.y - 0.018 * hh, 0.05 * hh, 0.024 * hh, 16), st.shoes, { seed: o.seed + 91 + i, b, inkW: 2.4, pool: 0.6 });
  }
  shape(ctx, circlePts(o.x, hipY, lerp(0.15, 0.16, k) * hh, lerp(0.06, 0.1, k) * hh, 20), st.pants, { seed: o.seed + 30, b, inkW: 2.2 });
  ctx.save(); ctx.translate(o.x, hipY); ctx.rotate(-fd * k * Math.PI * 0.5); ctx.translate(-o.x, -hipY);
  // the cast's own legs are cut away: everything below the hip, and the thighs reaching forward from it
  const lx0 = fd > 0 ? o.x + 0.06 * hh : o.x - 0.63 * hh;
  ctx.beginPath(); ctx.rect(o.x - hh, hipY - hh * 1.3, hh * 2, hh * 1.312); ctx.rect(lx0, hipY - 0.055 * hh, 0.57 * hh, 0.067 * hh); ctx.clip('evenodd');
  person(ctx, { who: st, x: o.x, y: o.y, h: o.h, f: fd, pose: 'sit', seatH: 0.06, age: o.age, arms: [[lerp(0.35, 0.05, k), lerp(0.9, -1.25, k)], [lerp(0.3, 0.1, k), lerp(0.9, 0.6, k)]], mood: k > 0.55 ? 'sleep' : 'calm', t, seed: o.seed });
  ctx.restore();
  shape(ctx, circlePts(o.x + fd * 0.04 * hh, hipY, 0.09 * hh, lerp(0.05, 0.1, k) * hh, 16), st.pants, { seed: o.seed + 31, b, inkW: 2 });
}
shot('sharp.seeds', {
  grade: () => ({ sat: 0.6, tint: '#f2dcc0', tintA: 0.34, vig: 0.72 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 960, y: 560, z: 1.04 }, { x: 960, y: 580, z: 1.1 }, 28);
    applyCam(ctx, cam);
    drawSet(ctx, 'city-park', 'sharp');
    clouds(ctx, t, '#fff6ea', 0.5, [[96, 1.1, 5, 0.2], [168, 0.8, 4, 0.7]]);
    birds(ctx, t, 5, 150, 22);
    for (let i = 0; i < 70; i++) {
      const sp = 9 + hash(i * 1.3) * 6, y = ((hash(i * 2.1) * 1000 + t * sp) % 1000) - 30, x = ((hash(i * 3.7) * (W + 200) + t * 5 + Math.sin(t * 0.3 + i) * 20) % (W + 200)) - 100;
      dandelionSeed(ctx, x, y, 4.6, t, i, 0.7);
    }
    for (const o of RECLINE) recliner(ctx, o, ease.inOut(clamp((pt - o.at) / 4)), t);
    for (const [x, y] of [[470, 930], [760, 960], [1250, 965], [1600, 852], [1000, 842]]) dandelionSeed(ctx, x, y, 7, 0, x, 0.9);
    for (let i = 0; i < 90; i++) {
      const depth = 0.6 + hash(i * 4.9) * 0.8, sp = 14 + depth * 12, y = ((hash(i * 2.9) * 1160 + t * sp) % 1160) - 60;
      const x = ((hash(i * 6.1) * (W + 200) + t * 7 * depth + Math.sin(t * 0.35 + i * 1.7) * 34 * depth) % (W + 200)) - 100;
      dandelionSeed(ctx, x, y, 8.5 * depth, t, i + 100, 0.92);
    }
    glow(ctx, 1460, 300, 700, '#fff3dc', 0.18);
  },
});

/* ---------- The Kept ---------- */
shot('city.samewarm', {
  grade: () => ({ tint: '#ff9f9f', tintA: 0.3, vig: 0.8 }),
  draw(ctx, t, st) {
    const m = MOODS.rose, pt = st.pt ?? t, cam = drift(t, { x: 960, y: 520, z: 1.14 }, { x: 960, y: 500, z: 1.24 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'city-block', 'kept');
    starTwinkle(ctx, t, 10);
    clouds(ctx, t, '#7a4a58', 0.35, [[70, 0.8, 6, 0.3], [30, 0.6, 4, 0.8]]);
    // every family starts smiling at the same instant, then sways and blinks as one
    const smiling = pt > 1.2, blink = smiling && frac((t - 1.2) / 3.8) > 0.955;
    for (const md of ['calm', 'smile', 'sleep']) familySprite(md);
    const spr = familySprite(!smiling ? 'calm' : blink ? 'sleep' : 'smile'), cur = curtainSprite();
    const sway = Math.sin(t * 1.25) * 0.035, pop = smiling ? 1 + 0.05 * Math.exp(-(pt - 1.2) * 2.5) * Math.sin((pt - 1.2) * 12) : 1;
    for (const w of BK_BIG) {
      ctx.save(); ctx.beginPath(); ctx.rect(w.x + 1.5, w.y + 1.5, w.w - 3, w.h - 3); ctx.clip();
      ctx.save(); ctx.translate(w.x + w.w / 2, w.y + w.h); ctx.rotate(sway); ctx.scale(pop, pop); ctx.drawImage(spr, -w.w / 2, -w.h, w.w, w.h); ctx.restore();
      ctx.drawImage(cur, w.x, w.y, w.w, w.h);
      ctx.restore();
    }
    blockLamps(ctx, t, m);
    const ph = frac(t / 3.8);
    for (const w of BK_BIG) heart(ctx, w.x + w.w * 0.5, w.y + 30 - ph * 70, 11, '#e0806f', Math.sin(ph * Math.PI) * 0.75, t, 3);
    leaves(ctx, t, 16, { x: 0, y: 0, w: W, h: H }, ['#f2b8b0', '#e6a9a0', '#ffd2c8'], 5);
    blockGlows(ctx, t, m);
  },
});

/* ---------- The Quiet ---------- */
const QUIET_LANES = [[300, 0.5, 26, 9], [250, 0.62, 34, 8], [196, 0.78, 42, 7], [136, 0.95, 52, 6], [70, 1.15, 64, 5], [372, 0.42, 20, 10]];
const DAY_CLOUDS = [[110, 1.2, 8, 0.15], [210, 0.95, 6, 0.65], [300, 0.8, 5, 0.4]];
const SCREENS = SKY_W.filter((w) => w.L === 3 && !w.shop && hash(w.i * 9.1) < 0.12);
// one parcel comes down to a bench and nobody looks at it
function delivery(ctx, pt, t) {
  const bx = 1062, seatY = SK.curb - 10 - 56 * 1.16;
  const ap = settle(pt, 0.5, 4.5), lo = settle(pt, 5, 1.4), lv = settle(pt, 7, 5);
  const x = lerp(lerp(1760, bx, ap), 240, lv), y = lerp(lerp(60, seatY - 130, ap), 20, lv);
  const held = lo === 0, py = lv > 0 ? seatY - 13 : lerp(y + 27, seatY - 13, lo);
  drone(ctx, x, y, 0.95, t, 77, { pkg: held });
  if (!held && lv === 0) inkLine(ctx, [[x, y + 4], [bx, py - 12]], { w: 1.4, seed: 3, alpha: 0.7 });
  if (!held) shape(ctx, boxPts(bx - 17, py - 13, 34, 26, 1), '#c98a4a', { seed: 5, b: boil(t), inkW: 1.8, gaps: 1 });
}
shot('quiet.sky', {
  grade: () => ({ sat: 0.5, tint: '#b8c2b6', tintA: 0.3, vig: 0.8 }),
  draw(ctx, t, st) {
    const m = MOODS.quiet, pt = st.pt ?? t, cam = drift(t, { x: 960, y: 540, z: 1.02 }, { x: 960, y: 520, z: 1.08 }, 26);
    applyCam(ctx, cam);
    drawSet(ctx, 'city-skyline', 'quiet');
    clouds(ctx, t, '#eceee6', 0.5, DAY_CLOUDS);
    // screens glow in empty rooms
    SCREENS.forEach((w, i) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 + 0.1 * Math.abs(noise1(t * 3 + i * 5)); ctx.fillStyle = PAL.frost; ctx.fillRect(w.x + 3, w.y + 6, w.w - 6, w.h - 12); ctx.restore(); });
    lampsLive(ctx, t, m, { on: () => 0 });
    // the sky fills with traffic, lane after lane
    droneSky(ctx, t, QUIET_LANES, {}, QUIET_LANES.map((l, i) => i * 1.6 - 1));
    // people with nowhere to be sit very still and look up at it
    const sitters = [[432, 12, 0], [512, 19, 0], [1010, 27, 0], [1404, 33, 0], [1478, 44, 0]];
    for (const [x, sd, f] of sitters) { const who = crowdStyle(sd), P = person(ctx, { who, x, y: SK.curb - 10, h: 190, f, pose: 'sit', arms: 'lap', mood: 'calm', t, seed: sd }); gazeUp(ctx, P, who.skin, f); }
    delivery(ctx, pt, t);
    sweeper(ctx, t, SK.curb + 2, 30, 4);
  },
});

shot('quiet.aldana', {
  grade: () => ({ sat: 0.55, tint: '#b8c2b6', tintA: 0.26, vig: 0.9 }),
  draw(ctx, t, st) {
    const m = MOODS.night;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const oB = (t * NS.speedB) % W, oF = (t * NS.speedF) % W;
    for (const dx of [oB, oB - W]) { ctx.save(); ctx.translate(dx, 0); drawSet(ctx, 'city-nightBack'); ctx.restore(); }
    // somebody else is awake too: a window lights, then goes dark again
    ctx.fillStyle = m.lit;
    for (const w of NS_W) if (w.k >= 0.07 && hash(w.i * 8.3) < 0.06 && hash2(w.i, Math.floor(t / (9 + hash(w.i) * 10) + hash(w.i * 3))) < 0.35) for (const dx of [oB, oB - W]) { const x = w.x + dx; if (x > -30 && x < W + 30) ctx.fillRect(x, w.y, w.w, w.h); }
    moon(ctx, 1500, 150, 34, m);
    clouds(ctx, t, '#2e3c44', 0.5, [[150, 0.9, 9, 0.55], [90, 0.7, 6, 0.1]]);
    for (const dx of [oF, oF - W]) { ctx.save(); ctx.translate(dx, 0); drawSet(ctx, 'city-nightFront'); ctx.restore(); }
    leaves(ctx, t, 6, { x: 0, y: NS.walk + 20, w: W, h: 70 }, LEAF_C, 11);
    // Mr. Aldana walks left at the pace the street slides right, so his feet stay planted
    const ax = 1120, ay = NS.walk + 70, pace = 2.0;
    const A = person(ctx, { who: 'aldana', x: ax, y: ay, h: 460, f: -1, pose: 'walk', pace, arms: [[0.75, 0.35], [0.1, 0.1]], mood: 'calm', t, seed: 9 });
    const dxp = 820, dyp = ay + 4;
    dog(ctx, dxp, dyp, { t, s: 110, f: -1, walk: true, wag: 6 });
    const hand = A.handF, collar = [dxp - 110 * 0.4, dyp - 110 * 0.62];
    inkLine(ctx, catmull([hand, [lerp(hand[0], collar[0], 0.5), Math.max(hand[1], collar[1]) + 40], collar], 6), { w: 2.4, seed: 7 + boil(t), color: '#8a3a2e' });
    const lamps = [];
    for (const lx of NS.lamps) for (const dx of [oF, oF - W, oF + W]) { const sx = lx + dx; if (sx > -500 && sx < W + 500) lamps.push({ x: sx, y: NS.lampY + 260, r: 620, a: 1 }, { x: sx, y: NS.lampY, r: 200, a: 1 }); }
    lightMask(ctx, 'rgba(6,12,18,0.8)', lamps, null);
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    for (let i = 0; i < lamps.length; i += 2) { glow(ctx, lamps[i].x, NS.lampY, 280, m.lamp, 0.42); ctx.save(); ctx.translate(lamps[i].x, NS.walk + 60); ctx.scale(1, 0.2); glow(ctx, 0, 0, 340, m.lamp, 0.35); ctx.restore(); }
    // drones pass overhead with small lights, going somewhere nobody is
    [[190, 0.9, 60, 1], [120, 1.05, -44, 2], [260, 0.75, 80, 3], [80, 1.2, -30, 4], [215, 0.8, -70, 5]].forEach(([y, s, sp, i]) => { const span = W + 300, x = ((((hash(i) * span + t * sp) % span) + span) % span) - 150; drone(ctx, x, y, s, t, i * 7, { pkg: i % 2 === 0, light: PAL.frost, c: '#2c3538', pkgC: '#5e4a3a' }); });
  },
});

shot('quiet.park', {
  grade: () => ({ sat: 0.5, tint: '#b8c2b6', tintA: 0.3, vig: 0.8 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 960, y: 560, z: 1.03 }, { x: 960, y: 540, z: 1.1 }, 26);
    applyCam(ctx, cam);
    drawSet(ctx, 'city-park', 'quiet');
    clouds(ctx, t, '#eceee6', 0.45, [[96, 1.1, 7, 0.2], [168, 0.8, 5, 0.7]]);
    droneSky(ctx, t, [[300, 0.45, 22, 8], [236, 0.6, 30, 7], [160, 0.8, 40, 6], [80, 1.0, 50, 5]]);
    // a hedge robot trims the hedge by the fence, one snip at a time
    const hx = 1420, arm = Math.sin(t * 2.2) * 10;
    mower(ctx, hx, 640, 0.7, -1, t, 88);
    inkLine(ctx, [[hx - 8, 612], [hx - 30, 590 + arm], [hx - 52, 566 + arm * 0.6]], { w: 3, seed: 2 + boil(t), color: '#3a4144' });
    for (let k = 0; k < 5; k++) { const ph = frac(t * 0.6 + k / 5); dot(ctx, hx - 52 + k * 4, 566 + ph * 70, 2.6, '#6d8566', 0.8 * (1 - ph)); }
    [[640, 120, 900, 26, 0.7], [860, 300, 1700, 34, 0.2]].forEach(([y, x0, x1, sp, ph], i) => {
      const u = (t * sp) / (x1 - x0) + ph, x = lerp(x0, x1, pingpong(u)), f = frac(u * 0.5) < 0.5 ? 1 : -1;
      mower(ctx, x, y, y > 800 ? 1.1 : 0.8, f, t, 70 + i * 9);
    });
    // one mower crosses the foreground through the beat, and the fresh stripe grows behind it
    const mx = lerp(-140, W + 140, clamp(pt / 34));
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#eef4e2'; ctx.beginPath(); ctx.moveTo(-140, 980); ctx.lineTo(mx - 40, 974); ctx.lineTo(mx - 40, 1042); ctx.lineTo(-140, 1050); ctx.fill(); ctx.restore();
    mower(ctx, mx, 1034, 1.35, 1, t, 61);
    // and the people sit very still
    const sitters = [[428, 12, 0, 0], [516, 19, 0, 0], [1140, 27, 0, 1], [1582, 33, 0, 2], [1660, 44, 0, 2]];
    for (const [x, sd, f, bi] of sitters) { const [, by, s] = PK_BENCH[bi], who = crowdStyle(sd), P = person(ctx, { who, x, y: by, h: ((50 * s) / 0.27) * 0.96, f, pose: 'sit', arms: 'lap', mood: 'calm', t, seed: sd }); gazeUp(ctx, P, who.skin, f); }
  },
});

/* ---------- The Throne ---------- */
const THRONE_CAMS = [];
SKY_B.forEach((bd) => { if (bd.L === 3) THRONE_CAMS.push([bd.x + bd.w / 2 - 25, bd.y + 21, 1.3], [bd.x + bd.w / 2 + 25, bd.y + 21, 1.3]); else if (bd.L === 2 && hash(bd.seed) < 0.4) THRONE_CAMS.push([bd.x + bd.w * 0.5 - 12, bd.y - 14, 0.7], [bd.x + bd.w * 0.5 + 12, bd.y - 14, 0.7]); });
const THRONE_COLD = [[1080, 1.05, 1, 19, '#2c3538']];
shot('throne.city', {
  grade: () => ({ sat: 0.45, tint: '#9fd3cb', tintA: 0.3, vig: 0.95 }),
  draw(ctx, t, st) {
    const m = MOODS.throne, cam = drift(t, { x: 960, y: 540, z: 1.04 }, { x: 960, y: 520, z: 1.12 }, 24);
    applyCam(ctx, cam);
    warmSet('city-skyline', ['throne', 'throneDark']);
    drawSet(ctx, 'city-skyline', 'throne');
    liveRooms(ctx, t, 'throne', LIT.all);
    clouds(ctx, t, '#22383a', 0.5, NIGHT_CLOUDS);
    flakes(ctx, t, 60, '#dff3ef', 0.4);
    // the eyes open one pair at a time, then all turn to the same place at once, as if told to
    const told = settle(t, 7, 0.4), sweep = settle(t, 11, 3);
    THRONE_CAMS.forEach(([x, y, s], i) => {
      const open = settle(t, 0.4 + hash(Math.floor(i / 2) * 4.7) * 5.5, 0.6);
      const own = [Math.sin(t * 0.7 + i * 2.1), Math.sin(t * 0.5 + i) * 0.5], all = [Math.sin((t - 7) * 0.3) * 0.9 * sweep, 0.3];
      eyeCam(ctx, x, y, s, t, x, [lerp(own[0], all[0], told), lerp(own[1], all[1], told)], open);
    });
    lampsLive(ctx, t, m);
    traffic(ctx, t, THRONE_COLD, true);
    lampGlows(ctx, t, m, null, 0.8);
  },
});

const PORTRAIT_ORDER = rankBy(BK_W, (w) => w.r);
shot('throne.portraits', {
  grade: () => ({ sat: 0.45, tint: '#9fd3cb', tintA: 0.3, vig: 0.95 }),
  draw(ctx, t, st) {
    const m = MOODS.throne, cam = drift(t, { x: 960, y: 520, z: 1.1 }, { x: 960, y: 500, z: 1.2 }, 22);
    applyCam(ctx, cam);
    // a few people, then one, window by window
    const f = settle(st.pt ?? t, 1.2, 6.5);
    warmSet('city-block', ['faces', 'one']);
    drawSet(ctx, 'city-block', 'faces');
    swapWins(ctx, 'city-block', 'one', upTo(PORTRAIT_ORDER, f));
    clouds(ctx, t, '#22383a', 0.5, [[60, 0.8, 6, 0.3], [20, 0.6, 4, 0.8]]);
    flakes(ctx, t, 50, '#dff3ef', 0.35);
    blockLamps(ctx, t, m);
    traffic(ctx, t, [[1010, 1.1, -1, 22, '#1f2a2c']], true);
    blockGlows(ctx, t, m, 0.8);
  },
});

const PASSERBY = { ...crowdStyle(61), hair: 'bun', hairC: '#9a958c' };
shot('throne.eyes', {
  grade: () => ({ sat: 0.45, tint: '#9fd3cb', tintA: 0.3, vig: 0.95 }),
  draw(ctx, t, st) {
    const m = MOODS.throne, pt = st.pt ?? t, cam = drift(t, { x: 960, y: 560, z: 1.06 }, { x: 960, y: 540, z: 1.14 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'city-block', 'eyes');
    clouds(ctx, t, '#22383a', 0.45, [[60, 0.8, 6, 0.3]]);
    // one small person crosses the empty square, and every lens turns to follow her
    const h = 300, pace = 2.4, span = 2500, fx = 1850 - ((pt * 0.0828 * h * pace) % span), fy = 1010;
    const onStage = fx > -120 && fx < W + 120, head = [fx, fy - h * 0.85], idle = scanLook(t);
    const lookAt = (x, y) => { if (!onStage) return idle; const dx = head[0] - x, dy = head[1] - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    for (const w of BK_BIG) {
      const cx0 = w.x + w.w / 2, cy0 = w.y + w.h * 0.48, L = lookAt(cx0, cy0), cx = cx0 + L[0] * 16, cy = cy0 + L[1] * 12;
      dot(ctx, cx, cy, 13, '#030708'); dot(ctx, cx - 5, cy - 5, 4, '#effffc', 0.85);
      dot(ctx, cx0 + 34, cy0 - 34, 3.2, '#e8403a', 0.5 + 0.4 * Math.sin(t * 2 + w.i));
    }
    flakes(ctx, t, 50, '#dff3ef', 0.35);
    blockLamps(ctx, t, m, { hearth: 'cold', eye: 'lens', look: onStage ? clamp((fx - 945) / 500, -1, 1) : idle[0] });
    if (onStage) person(ctx, { who: PASSERBY, x: fx, y: fy, h, f: -1, pose: 'walk', pace, arms: 'down', mood: 'calm', t, seed: 61 });
    for (const [i, x] of [[0, 330], [1, 1590]]) { lampPost(ctx, x, 1100, 676, 1.5, m, 1450 + i); lanternHead(ctx, x, 620, 1.8, t, { lit: 0.8, glass: '#5a9d95', hot: 0.12, hearth: 'cold', eye: 'lens', look: onStage ? clamp((fx - x) / 400, -1, 1) : idle[0], seed: 60 + i }); }
    blockGlows(ctx, t, m, 0.7);
    for (const x of [330, 1590]) glow(ctx, x, 620, 360, PAL.frostD, 0.5);
  },
});

/* ---------- the last screen: ten thousand windows, one per possible future ---------- */
const FIN = (() => {
  const cols = 125, rows = 80, mx = 18, my = 16, gap = 5, r = rng(10000), blockOf = new Int16Array(cols);
  let c = 0, nb = 0;
  while (c < cols) { const n = Math.min(cols - c, 5 + Math.floor(r() * 4)); for (let k = 0; k < n; k++) blockOf[c + k] = nb; c += n; nb++; }
  const px = (W - 2 * mx - (nb - 1) * gap) / cols, py = (H - 2 * my) / rows;
  const X = new Float32Array(cols), Y = new Float32Array(rows);
  for (let i = 0; i < cols; i++) X[i] = mx + i * px + blockOf[i] * gap;
  for (let j = 0; j < rows; j++) Y[j] = my + j * py;
  const ww = px * 0.66, wh = py * 0.7;
  return { cols, rows, px, py, ww, wh, X, Y, nb, blockOf, mi: 62, mj: 40, ox: (px - ww) / 2, oy: (py - wh) / 2 };
})();
const FIN_CACHE = new Map();
const endingIds = () => (typeof STORY !== 'undefined' ? STORY.ENDING_ORDER : ['sharp', 'kept', 'ledger', 'owls', 'throne', 'quiet', 'mirror', 'dawn', 'garden']);
const endingColor = (id) => (typeof STORY !== 'undefined' && STORY.ENDINGS[id] ? STORY.ENDINGS[id].color : '#e9d3b4');
function finDist(p) {
  const ids = endingIds(), d = p && p.dist, out = {}; let sum = 0;
  for (const id of ids) { const v = d && +d[id] > 0 ? +d[id] : 0; out[id] = v; sum += v; }
  if (!(sum > 0)) { for (const id of ids) out[id] = 1; sum = ids.length; }
  for (const id of ids) out[id] = Math.round((out[id] / sum) * 100) / 100;
  return out;
}
// grow each ending from a few seeds until it holds its share of the grid, so colors gather in soft clusters
function finAssign(dist, mine, seed) {
  const ids = endingIds(), E = ids.length, { cols, rows } = FIN, N = cols * rows, r = rng(seed);
  const share = ids.map((id) => dist[id]), tot = share.reduce((a, b) => a + b, 0) || 1;
  const quota = share.map((s) => Math.round((s / tot) * N));
  let diff = N - quota.reduce((a, b) => a + b, 0); const big = quota.indexOf(Math.max(...quota)); quota[big] += diff;
  const seeds = ids.map((id, e) => { const n = share[e] > 0 ? Math.max(1, Math.round((share[e] / tot) * 26)) : 0; const s = []; for (let k = 0; k < n; k++) s.push([r() * cols, r() * rows]); return s; });
  const me = ids.indexOf(mine);
  if (me >= 0) seeds[me].push([FIN.mi, FIN.mj]);
  const cost = new Float32Array(N * E), idx = new Uint32Array(N * E);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const c = j * cols + i, wi = i + fbm2(i * 0.045, j * 0.07, 3) * 10, wj = j + fbm2(i * 0.05 + 40, j * 0.05 + 9, 3) * 8;
    for (let e = 0; e < E; e++) {
      let best = 1e9; for (const [sx, sy] of seeds[e]) { const d = Math.hypot(wi - sx, (wj - sy) * 1.1); if (d < best) best = d; }
      cost[c * E + e] = best / (0.4 + Math.sqrt(share[e] / tot)) + fbm2(i * 0.12 + e * 7, j * 0.12, 2) * 2;
      idx[c * E + e] = c * E + e;
    }
  }
  idx.sort((a, b) => cost[a] - cost[b]);
  const out = new Int8Array(N).fill(-1), left = quota.slice();
  const center = FIN.mj * cols + FIN.mi;
  if (me >= 0) { out[center] = me; left[me]--; }
  for (let n = 0; n < idx.length; n++) { const c = (idx[n] / E) | 0, e = idx[n] % E; if (out[c] < 0 && left[e] > 0) { out[c] = e; left[e]--; } }
  for (let c = 0; c < N; c++) if (out[c] < 0) out[c] = big;
  return out;
}
function finGet(p) {
  const ids = endingIds(), dist = finDist(p);
  const mine = p && ids.includes(p.mine) ? p.mine : ids.reduce((a, b) => (dist[b] > dist[a] ? b : a));
  const key = ids.map((id) => dist[id].toFixed(2)).join(',') + '|' + mine;
  const ck = key + '|' + RS.toFixed(3);
  let F = FIN_CACHE.get(ck);
  if (F) return F;
  const asg = finAssign(dist, mine, hashStr(key)), { cols, rows, X, Y, ww, wh, ox, oy } = FIN, N = cols * rows;
  const col = new Array(N);
  for (let c = 0; c < N; c++) { const base = endingColor(ids[asg[c]]), v = hash(c * 0.37 + 1.3); col[c] = v < 0.5 ? mix(base, '#fff8e8', 0.1 + v * 0.4) : mix(base, '#3a2a22', (v - 0.5) * 0.3); }
  const cv = makeCanvas(W * RS, H * RS), x = cv.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
  x.fillStyle = '#18191b'; x.fillRect(0, 0, W, H);
  // the walls of the blocks, each its own dark color
  for (let b = 0; b < FIN.nb; b++) {
    let i0 = -1, i1 = -1; for (let i = 0; i < cols; i++) if (FIN.blockOf[i] === b) { if (i0 < 0) i0 = i; i1 = i; }
    const bx = X[i0] - 3, bw = X[i1] + FIN.px - X[i0] + 6;
    x.fillStyle = ['#23201e', '#1e2224', '#262120', '#1c1f22', '#211e22'][b % 5]; x.fillRect(bx, 0, bw, H);
    wash(x, boxPts(bx, -20, bw, H + 40, 3), '#3a332e', { seed: 2000 + b, alpha: 0.05, layers: 5, v: 0.3 });
  }
  x.globalCompositeOperation = 'lighter';
  for (let c = 0; c < N; c++) { const i = c % cols, j = (c / cols) | 0; x.fillStyle = rgba(endingColor(ids[asg[c]]), 0.1); x.fillRect(X[i] + ox - 2.5, Y[j] + oy - 2.5, ww + 5, wh + 5); }
  x.globalCompositeOperation = 'source-over';
  for (let c = 0; c < N; c++) { const i = c % cols, j = (c / cols) | 0; x.fillStyle = col[c]; x.fillRect(X[i] + ox, Y[j] + oy, ww, wh); }
  x.fillStyle = 'rgba(255,250,235,0.18)';
  for (let c = 0; c < N; c++) { const i = c % cols, j = (c / cols) | 0; x.fillRect(X[i] + ox, Y[j] + oy, ww, wh * 0.35); }
  F = { canvas: cv, col, mine };
  FIN_CACHE.set(ck, F);
  while (FIN_CACHE.size > 3) FIN_CACHE.delete(FIN_CACHE.keys().next().value);
  return F;
}
shot('final.windows', {
  grade: () => ({ sat: 1, vig: 0.7, grain: 0.26 }),
  draw(ctx, t, st) {
    const F = finGet(st.p), { cols, rows, X, Y, ww, wh, ox, oy, px, py } = FIN;
    const k = ease.inOut(clamp(t / 7)), z = Math.pow(16, 1 - k);
    const mx = X[FIN.mi] + ox + ww / 2, my = Y[FIN.mj] + oy + wh / 2;
    const cam = camFit({ x: mx, y: my, z });
    applyCam(ctx, cam);
    ctx.drawImage(F.canvas, 0, 0, W, H);
    // close up, the cached grid would blur, so the visible windows are redrawn crisp
    const crisp = smooth(1.8, 2.8, z);
    if (crisp > 0) {
      const hw = W / 2 / z, hh = H / 2 / z, lw = Math.max(0.25, 2.2 / z);
      ctx.save(); ctx.globalAlpha = crisp;
      for (let j = 0; j < rows; j++) {
        const y = Y[j] + oy; if (y + wh < cam.y - hh || y > cam.y + hh) continue;
        for (let i = 0; i < cols; i++) {
          const x = X[i] + ox; if (x + ww < cam.x - hw || x > cam.x + hw) continue;
          const c = j * cols + i;
          ctx.fillStyle = F.col[c]; ctx.fillRect(x, y, ww, wh);
          ctx.fillStyle = 'rgba(255,250,235,0.18)'; ctx.fillRect(x, y, ww, wh * 0.35);
          if (z > 4) {
            ctx.fillStyle = mix(F.col[c], PAL.ink, 0.45); ctx.fillRect(x + ww / 2 - lw / 2, y, lw, wh); ctx.fillRect(x, y + wh * 0.38 - lw / 2, ww, lw);
            if (hash(c * 0.91) < 0.22 && c !== FIN.mj * cols + FIN.mi) { ctx.fillStyle = rgba('#2b211c', 0.55); ctx.beginPath(); ctx.arc(x + ww * 0.32, y + wh * 0.62, ww * 0.1, 0, TAU); ctx.arc(x + ww * 0.7, y + wh * 0.7, ww * 0.08, 0, TAU); ctx.fill(); ctx.fillRect(x + ww * 0.16, y + wh * 0.8, ww * 0.7, wh * 0.2); }
            ctx.strokeStyle = rgba(PAL.ink, 0.6); ctx.lineWidth = lw; ctx.strokeRect(x, y, ww, wh);
          }
        }
      }
      ctx.restore();
    }
    // a few windows breathe, so the city is lived in
    for (let n = 0; n < 60; n++) {
      const c = Math.floor(hash(n * 3.17 + 0.2) * cols * rows), i = c % cols, j = (c / cols) | 0, a = Math.max(0, Math.sin(t * (0.5 + hash(n) * 0.7) + n * 2.3));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#fff4d6'; ctx.fillRect(X[i] + ox, Y[j] + oy, ww, wh); ctx.restore();
    }
    // the player's own window, warm, with two small people inside
    const x = X[FIN.mi] + ox, y = Y[FIN.mj] + oy, pulse = 0.85 + 0.15 * Math.sin(t * 1.6);
    glow(ctx, mx, my, 24 + 56 / Math.sqrt(z), '#ffd27a', 0.55 * pulse);
    ctx.fillStyle = mix(endingColor(F.mine), '#fff8e8', 0.45); ctx.fillRect(x, y, ww, wh);
    const inside = smooth(3, 7, z);
    if (inside > 0) {
      ctx.save(); ctx.globalAlpha = inside * 0.8; ctx.fillStyle = '#5a3524';
      ctx.beginPath(); ctx.arc(x + ww * 0.32, y + wh * 0.56, ww * 0.12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + ww * 0.32, y + wh * 0.94, ww * 0.2, wh * 0.2, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + ww * 0.68, y + wh * 0.66, ww * 0.095, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + ww * 0.68, y + wh * 0.97, ww * 0.15, wh * 0.16, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(x, y + wh * 0.92, ww, wh * 0.08);
      ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = PAL.lamp; ctx.lineWidth = 2.4 / Math.sqrt(z) + 0.4; ctx.globalAlpha = 0.95; ctx.strokeRect(x - 0.6, y - 0.6, ww + 1.2, wh + 1.2); ctx.restore();
    glow(ctx, mx, my, 10 + 14 / Math.sqrt(z), '#fff1c9', 0.4 * pulse);
  },
});

})();
