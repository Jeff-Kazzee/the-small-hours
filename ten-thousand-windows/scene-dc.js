/* The datacenter in the desert (chapter 7) and the endings that start there.
   Each set has one layout table that both the cached painting and the live
   layer read, so steam, red lights, owls, and embers land on painted things. */
'use strict';
(() => {

const says = (st, name) => st.who === name || st.p.speak === name || (name === 'hearth' && st.p.speak === true);
const ch4Of = (st) => (st.c && st.c.ch4) || st.p.ch4;
const RED = '#e8403a';
const iw = (s) => clamp(0.9 + 2.3 * s, 1.4, 3.2);
let DRY = null;
const LAYERS = new Map();
// figures redraw on the boil clock anyway, so paint them once per boil frame and reuse the bitmap
function boilLayer(key, t, paint) {
  const k = boil(t) + '|' + RS.toFixed(3);
  let L = LAYERS.get(key);
  if (!L || L.cv.width !== Math.round(W * RS)) { L = { cv: makeCanvas(W * RS, H * RS), k: '' }; LAYERS.set(key, L); }
  if (L.k !== k) {
    const x = L.cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, L.cv.width, L.cv.height); x.setTransform(RS, 0, 0, RS, 0, 0);
    paint(x, boil(t) / 8); L.k = k;
  }
  return L.cv;
}
// a throwaway context, so a figure's hand can be found before it is painted
const dryCtx = () => DRY || (DRY = makeCanvas(2, 2).getContext('2d'));
// a shot held across two lines keeps t counting while pt restarts, so a gap between them marks the second line
const laterBeat = (t, st) => (st.p.beat ?? 1) > 1 || t - (st.pt ?? t) > 0.5;
const arc = (a, b, k, lift) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * lift];

/* ---------- exterior: long low halls in the desert ---------- */
const HZ = 640, VX = 900;
const EXT_PAL = {
  night: { sky: ['#0d151a', '#1c2d35', '#33474c'], ground: ['#3d3e3a', '#26251f'], haze: '#33474c', wall: '#403f3d', roof: '#626a6a', seam: '#ffd98a', tower: '#66737a', mouth: '#1b2226', pylon: '#1b2225', mesa: '#1b252a', bush: '#2e3530', steam: '#c9d5d2' },
  dawn: { sky: ['#e3cbb6', '#efdac4', '#f8ead6'], ground: ['#ecdcc6', '#dcc7a8'], haze: '#f4e5d0', wall: '#d6c3aa', roof: '#eee0cc', seam: '#f6e8d2', tower: '#dccab3', mouth: '#a8927a', pylon: '#8d7c6c', mesa: '#e4d0b9', bush: '#bca88c', steam: '#fbf4e8' },
  dusk: { sky: ['#8c4b33', '#cf8048', '#f3c47c'], ground: ['#c48d56', '#6e4029'], haze: '#eab072', wall: '#6e452f', roof: '#9c6644', seam: '#ffd98a', tower: '#93643f', mouth: '#46291a', pylon: '#34210f', mesa: '#a55d38', bush: '#5e3f24', steam: '#f6dcb0' },
};

function extLayout(v) {
  const dawn = v === 'dawn', rows = [];
  const spans = [[-800, 440], [-1300, 900], [-1650, 1250], [-2150, 1550], [-2700, 1900]];
  for (let k = 0; k < (dawn ? 24 : 5); k++) {
    const s = 1 / (1 + 0.7 * k), base = HZ + 280 * s, h = 150 * s, segs = [];
    if (dawn) {
      for (let X = -6400 + (k % 2) * 820; X < 6400; X += 1640) {
        const x0 = VX + X * s, x1 = VX + (X + 1500) * s;
        if (x1 > -80 && x0 < W + 80) segs.push([x0, x1]);
      }
    } else segs.push([VX + spans[k][0] * s, VX + spans[k][1] * s]);
    rows.push({ k, s, base, h, segs });
  }
  const tw = [[1450, 815, 300, 170], [1640, 790, 350, 190], [1830, 825, 270, 150]];
  if (dawn) tw.push([250, 702, 112, 64], [322, 696, 124, 70], [1180, 677, 72, 40], [1232, 674, 80, 44], [610, 667, 50, 30], [1570, 664, 40, 24], [80, 660, 30, 18]);
  const towers = tw.map(([x, base, h, w]) => ({ x, base, h, w, s: (base - HZ) / 280 }));
  const pylons = [];
  for (let i = 0; i < (dawn ? 16 : 9); i++) { const s = 1 / (1 + 0.75 * i); pylons.push({ i, x: 560 - 420 * s, base: HZ + 420 * s, h: 540 * s, s }); }
  const tips = (P) => [[-0.3, 0.8], [0.3, 0.8], [-0.24, 0.64], [0.24, 0.64]].map(([dx, dy]) => [P.x + dx * P.h, P.base - dy * P.h + 0.06 * P.h]);
  const wires = [];
  pylons.forEach((P, i) => {
    const a = tips(P), nb = pylons[i + 1] ? tips(pylons[i + 1]) : null;
    for (let j = 0; j < 4; j++) {
      if (!nb && i > 0) continue;
      const p = a[j], q = nb ? nb[j] : null;
      const lead = [p[0] - 900, p[1] + 260]; // pylon 0 also carries wires back past the camera
      const ends = i === 0 ? [[lead, p], ...(q ? [[p, q]] : [])] : [[p, q]];
      for (const [e0, e1] of ends) {
        const L = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]), sag = 0.07 * L, pts = [];
        for (let u = 0; u <= 18; u++) { const k = u / 18; pts.push([lerp(e0[0], e1[0], k), lerp(e0[1], e1[1], k) + sag * 4 * k * (1 - k)]); }
        wires.push({ pts, s: P.s, span: i, j });
      }
    }
  });
  if (v === 'dusk') {
    const a = tips(pylons[0]);
    for (const [j, ex, ey] of [[1, 2200, 20], [3, 2200, 110], [0, 2200, -40]]) {
      const p = a[j], L = Math.hypot(ex - p[0], ey - p[1]), sag = 0.06 * L, pts = [];
      for (let u = 0; u <= 30; u++) { const k = u / 30; pts.push([lerp(p[0], ex, k), lerp(p[1], ey, k) + sag * 4 * k * (1 - k)]); }
      wires.push({ pts, s: 1, span: 0, j: 10 + j, sky: true });
    }
  }
  const reds = [];
  for (const T of towers) reds.push([T.x - T.w * 0.3, T.base - T.h - 4, T.s], [T.x + T.w * 0.3, T.base - T.h - 4, T.s]);
  for (const P of pylons) reds.push([P.x, P.base - P.h - 4, P.s]);
  for (const r of rows.slice(0, 2)) for (const [a, b] of r.segs) if (a > 0 && a < W) reds.push([a + 8 * r.s, r.base - r.h * 1.24 - 4, r.s]);
  return { rows, towers, pylons, wires, reds };
}
const EXT = { night: extLayout('night'), dawn: extLayout('dawn'), dusk: extLayout('dusk') };

function paintMoon(ctx, x, y, r, a = 1) {
  glow(ctx, x, y, r * 6, '#f6ecd0', 0.22 * a);
  shape(ctx, circlePts(x, y, r, r, 30), '#f3ead2', { seed: 9, boilAmp: 0.4, inkW: 2.2, pool: 0.5, alpha: a, inkA: 0.8 * a });
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.24], [0.25, 0.12, 0.17], [-0.05, 0.38, 0.13], [0.36, -0.34, 0.1]]) wash(ctx, circlePts(x + dx * r, y + dy * r, rr * r, rr * r, 10), '#c9bd9f', { seed: 40 + dx * 100, alpha: 0.14 * a, layers: 6, v: 0.3 });
}
function extSky(ctx, v, P) {
  const g = ctx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, P.sky[0]); g.addColorStop(0.62, P.sky[1]); g.addColorStop(1, P.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 20);
  if (v !== 'night') wash(ctx, rectPts(-40, -40, W + 80, HZ + 60), P.sky[1], { seed: 2, alpha: 0.05, layers: 10 });
  const r = rng(11);
  if (v === 'night') {
    for (let i = 0; i < 9; i++) { const u = i / 8; glow(ctx, lerp(-60, 1500, u), lerp(520, -20, u) + Math.sin(i * 2.3) * 40, 260 + hash(i) * 140, '#8fa6a4', 0.1, 'source-over'); }
    for (let i = 0; i < 420; i++) { const big = r() < 0.06; dot(ctx, r() * W, r() * (HZ - 30), big ? 1.8 + r() * 1.3 : 0.6 + r() * 1.1, '#f6ecd0', 0.3 + r() * 0.55); }
    for (let i = 0; i < 300; i++) { const u = r(); dot(ctx, lerp(-100, 1450, u), lerp(540, -30, u) + (r() - 0.5) * 170, 0.5 + r() * 0.9, '#f6ecd0', 0.18 + r() * 0.4); }
    paintMoon(ctx, 1190, 150, 56);
  } else if (v === 'dawn') {
    paintMoon(ctx, 400, 150, 30, 0.35);
    glow(ctx, 900, HZ - 50, 520, '#ffd9a8', 0.35, 'source-over');
    glow(ctx, 900, HZ - 50, 240, '#fff4e4', 0.6, 'source-over');
    shape(ctx, circlePts(900, HZ - 50, 58, 58, 30), '#fffaf0', { seed: 12, boilAmp: 0.4, inkW: 1.8, inkA: 0.35, pool: 0.2 });
    for (let i = 0; i < 5; i++) wash(ctx, [[-60 + i * 400, 180 + i * 40], [360 + i * 400, 150 + i * 40], [420 + i * 400, 190 + i * 40], [-40 + i * 400, 215 + i * 40]], '#f8eee0', { seed: 80 + i, alpha: 0.08, layers: 8, v: 0.6 });
  } else {
    for (let i = 0; i < 60; i++) dot(ctx, r() * W, r() * 180, 0.6 + r(), '#fbe9c8', 0.25 + r() * 0.4);
    glow(ctx, 700, HZ - 40, 800, '#ffd28a', 0.55, 'source-over');
    shape(ctx, circlePts(700, HZ - 40, 96, 96, 30), '#ffe2a6', { seed: 7, boilAmp: 0.5, inkW: 2.2, pool: 0.3 });
    for (let i = 0; i < 4; i++) wash(ctx, [[i * 520 - 80, 230 + i * 60], [i * 520 + 380, 200 + i * 60], [i * 520 + 460, 250 + i * 60], [i * 520 - 60, 270 + i * 60]], '#f0b070', { seed: 90 + i, alpha: 0.1, layers: 8, v: 0.6 });
  }
}
function extGround(ctx, v, P) {
  const g = ctx.createLinearGradient(0, HZ, 0, H); g.addColorStop(0, P.ground[0]); g.addColorStop(1, P.ground[1]);
  ctx.fillStyle = g; ctx.fillRect(0, HZ - 2, W, H - HZ + 2);
  wash(ctx, rectPts(-40, HZ + 40, W + 80, H - HZ), P.ground[1], { seed: 31, alpha: 0.05, layers: 10 });
  ctx.save(); ctx.strokeStyle = mix(P.ground[1], PAL.ink, 0.25);
  for (let i = 0; i < 24; i++) { const k = i / 24, y = HZ + 6 + k * k * (H - HZ); brushDry(ctx, [[-20, y], [W * 0.5, y + (hash(i) - 0.5) * 8], [W + 20, y + (hash(i + 3) - 0.5) * 8]], { w: 2 + k * 8, k: 3, alpha: 0.1 + k * 0.1, seed: i + 70, dry: 0.55 }); }
  ctx.restore();
  for (const [a, b, h] of [[40, 420, 38], [1180, 1480, 24], [1620, 1990, 44]]) wash(ctx, [[a, HZ + 4], [a + 30, HZ - h], [b - 40, HZ - h - 4], [b, HZ + 4]], P.mesa, { seed: a, alpha: 0.35, layers: 8, v: 0.25 });
  if (v !== 'dawn') glow(ctx, 760, HZ + 40, 820, P.seam, 0.12);
}
function paintHall(ctx, x0, x1, r, P, v, seed) {
  const { s, base, h } = r, top = base - h, rd = h * 0.24, fog = Math.pow(1 - s, 0.9) * 0.8;
  const wall = mix(P.wall, P.haze, fog), roof = mix(P.roof, P.haze, fog), inkW = iw(s), inkA = 0.88 * (1 - fog * 0.55);
  const kx = (x) => VX + (x - VX) * 0.965;
  shape(ctx, [[x0, top], [x1, top], [kx(x1), top - rd], [kx(x0), top - rd]], roof, { seed, boilAmp: 0.5 * s, inkW, inkA, pool: 0.5 });
  shape(ctx, rectPts(x0, top, x1 - x0, h), wall, { seed: seed + 1, boilAmp: 0.5 * s, inkW, inkA, shade: { dx: 0, dy: h * 0.55, a: 0.15 } });
  const step = 64 * s, lit = v !== 'dawn';
  ctx.save();
  for (let x = x0 + step, i = 0; x < x1 - step * 0.4; x += step, i++) {
    if (lit) { ctx.fillStyle = P.seam; ctx.globalAlpha = (0.55 + 0.4 * hash(seed + i)) * (1 - fog * 0.4); ctx.fillRect(x - 1.5 * s, top + h * 0.1, Math.max(1.2, 3.2 * s), h * 0.8); }
    else { ctx.fillStyle = mix(wall, PAL.ink, 0.3); ctx.globalAlpha = 0.3; ctx.fillRect(x - s * 0.8, top + h * 0.06, Math.max(0.8, 1.6 * s), h * 0.9); }
  }
  if (lit) { ctx.fillStyle = P.seam; ctx.globalAlpha = 0.6 * (1 - fog * 0.4); ctx.fillRect(x0 + 4, base - h * 0.15, x1 - x0 - 8, Math.max(1, 3.4 * s)); }
  ctx.restore();
  if (s > 0.3) for (let x = x0 + 80 * s, i = 0; x < x1 - 90 * s; x += 210 * s, i++) {
    const bx = kx(x) * 0.5 + x * 0.5, by = top - rd * 0.45;
    shape(ctx, rrectPts(bx, by - 18 * s, 56 * s, 20 * s, 3 * s), mix(roof, PAL.ink, 0.12), { seed: seed + 10 + i, boilAmp: 0.3, inkW: iw(s) * 0.8, inkA, pool: 0.4 });
    shape(ctx, circlePts(bx + 28 * s, by - 18 * s, 18 * s, 5 * s, 14), mix(roof, PAL.ink, 0.3), { seed: seed + 30 + i, boilAmp: 0.2, inkW: iw(s) * 0.6, inkA });
  }
}
function paintTower(ctx, T, P) {
  const { x, base, h, w, s } = T, top = base - h, fog = Math.pow(clamp(1 - s), 0.9) * 0.75;
  const c = mix(P.tower, P.haze, fog);
  const L = [[x - w * 0.5, base], [x - w * 0.37, base - h * 0.42], [x - w * 0.3, base - h * 0.8], [x - w * 0.34, top]];
  const body = catmull(L, 6).concat(catmull(L.map(([px, py]) => [2 * x - px, py]).reverse(), 6));
  shape(ctx, body, c, { seed: x, boilAmp: 0.5, inkW: iw(s), shade: { dx: -w * 0.22, dy: 0, a: 0.25 } });
  ctx.save(); ctx.strokeStyle = mix(c, PAL.ink, 0.35);
  for (const k of [0.07, 0.13]) brushDry(ctx, [[x - w * 0.46, base - h * k], [x + w * 0.46, base - h * k]], { w: 3 * s + 1, k: 2, alpha: 0.35, seed: x + k * 100 });
  ctx.restore();
  shape(ctx, circlePts(x, top, w * 0.34, w * 0.075, 20), mix(P.mouth, P.haze, fog), { seed: x + 1, boilAmp: 0.4, inkW: iw(s) * 0.8 });
}
function paintPylon(ctx, p, P) {
  const { x, base: y, h, s } = p, fog = Math.pow(1 - s, 0.9) * 0.75;
  const c = mix(P.pylon, P.haze, fog), w = Math.max(1.1, 3.4 * s);
  const o = (seed, ww = w) => ({ w: ww, seed, color: c, alpha: 0.95 });
  const lx = (k, sd) => x + sd * (0.17 - 0.155 * (k / 0.9)) * h;
  for (const sd of [-1, 1]) inkLine(ctx, [[lx(0, sd), y], [lx(0.45, sd), y - 0.45 * h], [lx(0.9, sd), y - 0.9 * h], [x, y - h]], o(2 + sd, w * 1.3));
  const lv = [0, 0.14, 0.27, 0.39, 0.5, 0.6, 0.7, 0.8];
  if (h > 60) for (let i = 0; i < lv.length - 1; i++) {
    inkLine(ctx, [[lx(lv[i], -1), y - lv[i] * h], [lx(lv[i + 1], 1), y - lv[i + 1] * h]], o(10 + i, w * 0.55));
    inkLine(ctx, [[lx(lv[i], 1), y - lv[i] * h], [lx(lv[i + 1], -1), y - lv[i + 1] * h]], o(20 + i, w * 0.55));
  }
  for (const [ak, aw] of [[0.8, 0.3], [0.64, 0.24]]) {
    inkLine(ctx, [[x - aw * h, y - ak * h], [x + aw * h, y - ak * h]], o(30 + ak * 10, w));
    for (const sd of [-1, 1]) {
      inkLine(ctx, [[x + sd * aw * h, y - ak * h], [lx(ak - 0.08, sd), y - (ak - 0.08) * h]], o(40 + sd, w * 0.6));
      inkLine(ctx, [[x + sd * aw * h, y - ak * h], [x + sd * aw * h, y - ak * h + 0.06 * h]], o(50 + sd, w * 0.9));
      dot(ctx, x + sd * aw * h, y - ak * h + 0.05 * h, Math.max(1, 3 * s), c, 0.9);
    }
  }
}
function paintWire(ctx, wr, P) {
  const fog = Math.pow(1 - wr.s, 0.9) * 0.75;
  inkLine(ctx, wr.pts, { w: Math.max(1, 2.2 * wr.s), seed: wr.span * 4 + wr.j, color: mix(P.pylon, P.haze, fog), alpha: 0.85 });
}
function extForeground(ctx, v, P) {
  const r0 = EXT[v].rows[0], y0 = r0.base;
  shape(ctx, [[866, y0], [956, y0], [1230, H + 10], [700, H + 10]], mix(P.ground[0], '#fff8e8', 0.1), { seed: 41, boilAmp: 0.5, inkW: 2, pool: 0.4, gaps: 3 });
  if (v !== 'dawn') { ctx.save(); ctx.fillStyle = P.seam; ctx.globalAlpha = 0.92; ctx.fillRect(884, y0 - 72, 48, 72); ctx.restore(); }
  const fy = 985, fc = v === 'night' ? '#7a7c76' : mix(P.pylon, P.ground[0], 0.25);
  for (let x = -20; x < W + 40; x += 96) if (x < 700 || x > 1230) inkLine(ctx, [[x, fy], [x + 2, fy - 74]], { w: 4, seed: x, color: fc });
  for (const [a, b2] of [[-20, 704], [1226, W + 40]]) for (const dy of [70, 44, 18]) inkLine(ctx, [[a, fy - dy], [b2, fy - dy + 2]], { w: 1.6, seed: a + dy, color: fc, alpha: 0.7 });
  ctx.save(); ctx.strokeStyle = fc; ctx.globalAlpha = 0.18; ctx.lineWidth = 1; for (let x = -20; x < W; x += 12) if (x < 700 || x > 1220) { ctx.beginPath(); ctx.moveTo(x, fy - 70); ctx.lineTo(x + 12, fy - 18); ctx.moveTo(x + 12, fy - 70); ctx.lineTo(x, fy - 18); ctx.stroke(); } ctx.restore();
  const r = rng(51);
  for (let i = 0; i < 18; i++) {
    const x = r() * W, y = 925 + r() * 150, s = 16 + r() * 34;
    if (x > 660 && x < 1270 && y > 940) continue;
    shape(ctx, blobPoly(x, y - s * 0.4, s, s * 0.55, 9, r, 0.3), P.bush, { seed: 60 + i, inkW: 2.2, pool: 0.5 });
  }
}
defineSet('dc', (ctx, v) => {
  const P = EXT_PAL[v] || EXT_PAL.night, L = EXT[v] || EXT.night;
  extSky(ctx, v, P);
  extGround(ctx, v, P);
  const items = [];
  for (const r of L.rows) items.push([r.base, () => r.segs.forEach((sg, j) => paintHall(ctx, sg[0], sg[1], r, P, v, r.k * 50 + j * 7))]);
  for (const T of L.towers) items.push([T.base, () => paintTower(ctx, T, P)]);
  L.pylons.forEach((p, i) => items.push([p.base + 0.5, () => { paintPylon(ctx, p, P); L.wires.filter((w) => w.span === i).forEach((w) => paintWire(ctx, w, P)); }]));
  items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  extForeground(ctx, v, P);
});

function cloudPts(x, y, rx, ry, seed, n = 44) {
  const pts = [], lobes = 4 + Math.floor(hash(seed) * 3), off = hash(seed + 1) * TAU;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 0.82 + 0.2 * Math.abs(Math.sin(a * lobes * 0.5 + off)); pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  return pts;
}
function towerSteam(ctx, t, T, c, a, n = 7, speed = 0.04) {
  const top = T.base - T.h, b = boil(t), puffs = [];
  for (let i = 0; i < n; i++) puffs.push([frac(t * speed + i / n + hash(T.x) * 0.5), i]);
  puffs.sort((p, q) => q[0] - p[0]);
  for (const [ph, i] of puffs) {
    const k = ease.out(ph), r = T.w * (0.26 + 0.9 * k);
    const x = T.x + k * T.w * 1.1 + Math.sin(t * 0.25 + i * 2) * T.w * 0.05, y = top - T.w * 0.12 - k * T.h * 1.25;
    const al = a * Math.min(1, ph * 6) * Math.pow(1 - ph, 1.3);
    if (al < 0.02) continue;
    shape(ctx, cloudPts(x, y, r, r * 0.74, i * 17 + Math.round(T.x)), c, { seed: i + T.x, b, alpha: al, inkA: al * 0.55, inkW: Math.max(1.4, 2.6 * T.s), gaps: 3, pool: 0.4, boilAmp: 1.4 });
  }
}
function twinkle(ctx, t, n = 46, maxY = HZ - 80) {
  for (let i = 0; i < n; i++) {
    const a = Math.pow(0.5 + 0.5 * Math.sin(t * (0.7 + hash(i) * 1.8) + i * 2.1), 4);
    const x = hash(i * 3.1 + 1) * W, y = hash(i * 7.7 + 2) * maxY;
    dot(ctx, x, y, 1.6 + hash(i + 5) * 1.2, '#fff6e0', 0.2 + 0.8 * a);
    if (i % 5 === 0) glow(ctx, x, y, 14, '#fff6e0', 0.5 * a);
  }
}
function aviation(ctx, t, reds, dim = 1) {
  const ph = frac(t / 1.8), on = ph < 0.38 ? Math.sin((ph / 0.38) * Math.PI) : 0;
  reds.forEach(([x, y, s]) => {
    dot(ctx, x, y, Math.max(1.2, 3.4 * s), '#5a2a24', 0.8);
    if (on > 0.02) { dot(ctx, x, y, Math.max(1.4, 4 * s), RED, 0.95 * on * dim); glow(ctx, x, y, 50 * s + 10, RED, 0.6 * on * dim); }
  });
}
function truckSide(ctx, x, y, s, f, t, lit, seed = 1) {
  const b = boil(t), X = (lx) => x + f * lx * s;
  const box = (l0, l1, y0, y1, c, sd, o = {}) => shape(ctx, rectPts(Math.min(X(l0), X(l1)), y + y0 * s, Math.abs(X(l1) - X(l0)), (y1 - y0) * s), c, { seed: seed + sd, b, inkW: Math.max(1.4, 2.4 * s), pool: 0.4, boilAmp: 0.6, ...o });
  box(-62, 14, -50, -12, '#cfc6b4', 1);
  box(16, 46, -38, -12, '#b5552f', 2);
  box(28, 42, -34, -24, lit ? '#ffe2a0' : '#a9bdb6', 3, { pool: 0, inkW: 1.4 });
  for (const lx of [-46, -20, 32]) { dot(ctx, X(lx), y - 8 * s, 8.5 * s, PAL.ink); dot(ctx, X(lx), y - 8 * s, 3.5 * s, '#8f8c84'); }
  if (lit) { glow(ctx, X(58), y - 20 * s, 80 * s, PAL.lamp, 0.75); dot(ctx, X(47), y - 20 * s, 4 * s, '#fff6d8'); dot(ctx, X(-63), y - 20 * s, 3.5 * s, RED, 0.9); }
}
function truckBack(ctx, x, y, s, t, lit, seed = 7) {
  const b = boil(t);
  shape(ctx, rectPts(x - 30 * s, y - 62 * s, 60 * s, 52 * s), '#cfc6b4', { seed, b, inkW: Math.max(1.4, 2.6 * s), pool: 0.4, boilAmp: 0.6 });
  for (const sd of [-1, 1]) { dot(ctx, x + sd * 22 * s, y - 8 * s, 8 * s, PAL.ink); if (lit) { dot(ctx, x + sd * 24 * s, y - 20 * s, 4 * s, RED, 0.95); glow(ctx, x + sd * 24 * s, y - 20 * s, 34 * s, RED, 0.5); } }
  inkLine(ctx, [[x, y - 60 * s], [x, y - 12 * s]], { w: Math.max(1, 1.6 * s), seed: seed + 1, alpha: 0.5 });
}
function extLive(ctx, t, v, pt) {
  const L = EXT[v], P = EXT_PAL[v], dawn = v === 'dawn', lit = !dawn;
  if (!dawn) twinkle(ctx, t);
  // power running in along the wires
  L.wires.forEach((wr, i) => {
    if (wr.sky || wr.span > 5) return;
    const n = wr.pts.length - 1, k = (1 - frac(t * 0.3 + hash(i * 3.7))) * n, j = Math.min(n - 1, Math.floor(k)), f = k - j;
    const x = lerp(wr.pts[j][0], wr.pts[j + 1][0], f), y = lerp(wr.pts[j][1], wr.pts[j + 1][1], f);
    dot(ctx, x, y, 1.5 + 2.5 * wr.s, dawn ? '#fffaf0' : '#ffe6b0', 0.85);
    if (wr.s > 0.4) glow(ctx, x, y, 18 * wr.s + 6, dawn ? '#fff6e6' : PAL.lamp, 0.5);
  });
  for (const T of L.towers) if (T.s > 0.12) towerSteam(ctx, t, T, P.steam, dawn ? 0.3 : 0.55, dawn ? 6 : 7, dawn ? 0.02 : 0.04);
  // two hundred thousand minds, fifty times fast: light ripples along every seam
  if (lit) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = P.seam;
    for (const r of L.rows.slice(0, 3)) for (const [x0, x1] of r.segs) {
      const step = 64 * r.s, top = r.base - r.h;
      for (let x = x0 + step, i = 0; x < x1 - step * 0.4; x += step, i++) { ctx.globalAlpha = 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 11 - i * 0.8 + r.k * 1.7 + hash(i + r.k * 40) * 2), 3) * (1 - r.k * 0.2); ctx.fillRect(x - 2 * r.s, top + r.h * 0.1, Math.max(1.4, 4 * r.s), r.h * 0.8); }
    }
    ctx.restore();
    for (const r of L.rows.slice(0, 2)) for (const [x0, x1] of r.segs) for (let x = x0 + 120 * r.s, i = 0; x < x1; x += 250 * r.s, i++) glow(ctx, x, r.base - r.h * 0.2, 170 * r.s, P.seam, 0.12 + 0.05 * Math.sin(t * 0.5 + i * 1.7));
  }
  // service trucks crawl the perimeter road, and one heads in through the gate to the door
  for (const [k, f, y, s, sp] of [[0.1, 1, 1040, 1.35, 70], [0.6, -1, 1062, 1.5, 84]]) { const x = f > 0 ? -220 + frac(t / sp + k) * (W + 440) : W + 220 - frac(t / sp + k) * (W + 440); truckSide(ctx, x, y, s, f, t, lit, 300 + k * 10); }
  const u = frac((pt + 2) / 24);
  if (u < 0.82) { const k = ease.inOut(clamp(u / 0.8)); truckBack(ctx, lerp(990, 912, k), lerp(1130, L.rows[0].base + 2, k), lerp(1.25, 0.34, Math.pow(k, 0.8)), t, lit); }
  aviation(ctx, t, L.reds, dawn ? 0.55 : 1);
}

shot('dc.exterior', {
  grade: (st) => (st.p.dawn ? { sat: 0.6, tint: '#f2dcc0', tintA: 0.34, vig: 0.7 } : { sat: 0.88, tint: '#9fd3cb', tintA: 0.07, vig: 0.9 }),
  draw(ctx, t, st) {
    const v = st.p.dawn ? 'dawn' : 'night';
    // start on the warm seams of one hall, then pull back until the desert is full of them
    applyCam(ctx, v === 'dawn' ? drift(t, { x: 960, y: 760, z: 1.4 }, { x: 960, y: 540, z: 1.0 }, 24) : drift(t, { x: 900, y: 760, z: 1.5 }, { x: 960, y: 550, z: 1.02 }, 16));
    drawSet(ctx, 'dc', v);
    extLive(ctx, t, v, st.pt ?? t);
  },
});

/* ---------- interior: one aisle of racks, receding forever ---------- */
const IN = { vx: 960, vy: 430, f: 720, ch: 0.9, X: 1.25, top: 2.45, ceil: 3.1, zFar: 24 };
const ip = (X, Y, z) => [IN.vx + (X * IN.f) / z, IN.vy + ((IN.ch - Y) * IN.f) / z];
const zfog = (z) => Math.pow(clamp((z - 1.5) / 20), 0.7) * 0.8;
const RACKS = [];
for (const sd of [-1, 1]) for (let z = 0.92; z < IN.zFar; z += 0.66) RACKS.push({ sd, z0: z, z1: z + 0.6 });
RACKS.sort((a, b) => b.z0 - a.z0);
const LEDS = [], EMBERS = [], GLINTS = [];
RACKS.forEach((R, i) => {
  const X = R.sd * IN.X;
  if (R.z0 < 13) for (let j = 0; j < 15; j++) {
    if (hash(i * 31 + j) < 0.5) continue;
    const z = R.z0 + 0.08 + hash(i + j * 7.3) * 0.44, [x, y] = ip(X, 0.3 + j * 0.137, z), hc = hash(i * 3 + j * 1.3);
    LEDS.push({ x, y, r: Math.max(1.1, 8 / z), c: hc < 0.7 ? PAL.frost : hc < 0.93 ? '#ffc46a' : RED, ph: hash(i * 17 + j * 3), sp: 0.5 + hash(i + j * 11) * 2.2 });
  }
  if (R.z0 < 7.6) {
    const n = R.z0 < 2.6 ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const z = R.z0 + 0.1 + ((k + 0.5) / n) * 0.4, Ymax = Math.min(2.15, 0.85 + 0.5 * z), Y = lerp(0.35, Ymax, hash(i * 5 + k * 13));
      const [x, y] = ip(X * 0.995, Y, z);
      EMBERS.push({ x, y, r: 40 / z, sd: R.sd, seed: i * 7 + k });
    }
  } else if (R.z0 < 20) for (let k = 0; k < 3; k++) { const [x, y] = ip(X, 0.4 + hash(i + k * 9) * 1.8, R.z0 + 0.3); GLINTS.push({ x, y, r: 26 / R.z0, ph: hash(i * 2 + k) }); }
});
defineSet('dcin', (ctx) => {
  ctx.fillStyle = '#0f161a'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#1c262b', { seed: 1, alpha: 0.06, layers: 10 });
  shape(ctx, [ip(-2.6, IN.ceil, 1.4), ip(2.6, IN.ceil, 1.4), ip(2.6, IN.ceil, IN.zFar), ip(-2.6, IN.ceil, IN.zFar)], '#182125', { seed: 2, boilAmp: 0.3, ink: false, pool: 0 });
  ctx.save(); ctx.strokeStyle = '#27333a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
  for (const z of [1.8, 2.5, 3.4, 4.6, 6.2, 8.4, 11.5, 16]) { const a = ip(-2.6, IN.ceil, z), b = ip(2.6, IN.ceil, z); ctx.lineWidth = Math.max(1, 9 / z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.restore();
  // cable trays along the aisle
  for (const X of [-0.8, 0.8]) shape(ctx, [ip(X - 0.12, 2.8, 1.3), ip(X + 0.12, 2.8, 1.3), ip(X + 0.12, 2.8, IN.zFar), ip(X - 0.12, 2.8, IN.zFar)], '#5e5238', { seed: 3 + X, boilAmp: 0.4, inkW: 2.2, pool: 0.5 });
  // ceiling strip lights (cold, the lab's color)
  for (let z = 1.9; z < IN.zFar - 1; z += 1.45) { ctx.save(); ctx.fillStyle = '#e4f3ef'; ctx.globalAlpha = 0.85 - zfog(z) * 0.5; fillPts(ctx, [ip(-0.1, 3.06, z), ip(0.1, 3.06, z), ip(0.1, 3.06, z + 0.85), ip(-0.1, 3.06, z + 0.85)]); ctx.restore(); }
  // raised floor
  shape(ctx, [ip(-IN.X, 0, 0.85), ip(IN.X, 0, 0.85), ip(IN.X, 0, IN.zFar), ip(-IN.X, 0, IN.zFar)], '#474d4f', { seed: 4, boilAmp: 0.3, ink: false, pool: 0.3 });
  wash(ctx, [ip(-0.35, 0, 0.9), ip(0.35, 0, 0.9), ip(0.05, 0, IN.zFar), ip(-0.05, 0, IN.zFar)], '#9fd3cb', { seed: 5, alpha: 0.05, layers: 10, v: 0.3 });
  ctx.save(); ctx.strokeStyle = '#2b3336'; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
  for (let X = -IN.X; X <= IN.X + 0.01; X += 0.5) { const a = ip(X, 0, 0.85), b = ip(X, 0, IN.zFar); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let z = 1.0; z < IN.zFar; z *= 1.16) { const a = ip(-IN.X, 0, z), b = ip(IN.X, 0, z); ctx.lineWidth = Math.max(0.6, 3 / z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.restore();
  // the far end, lost in cold haze
  ctx.save(); ctx.fillStyle = '#3d6b66'; ctx.globalAlpha = 0.5; fillPts(ctx, [ip(-IN.X, 0, IN.zFar), ip(-IN.X, IN.ceil, IN.zFar), ip(IN.X, IN.ceil, IN.zFar), ip(IN.X, 0, IN.zFar)]); ctx.restore();
  for (const R of RACKS) {
    const X = R.sd * IN.X, fog = zfog(R.z0);
    const q = (Y0, Y1, za, zb) => [ip(X, Y0, za), ip(X, Y1, za), ip(X, Y1, zb), ip(X, Y0, zb)];
    shape(ctx, q(0, IN.top, R.z0, R.z1), mix('#3b4346', '#152024', fog), { seed: Math.round(R.z0 * 10) + R.sd, boilAmp: 0.3, inkW: clamp(4 / R.z0 + 0.8, 1, 3), pool: 0.6 });
    shape(ctx, q(0.14, IN.top - 0.12, R.z0 + 0.05, R.z1 - 0.05), mix('#242b2e', '#131a1d', fog), { seed: Math.round(R.z0 * 10) + R.sd + 5, boilAmp: 0.2, inkW: clamp(2.4 / R.z0 + 0.5, 0.8, 2), pool: 0.4 });
    if (R.z0 < 12) {
      ctx.save(); ctx.strokeStyle = mix('#5a686e', '#1c2427', fog); ctx.lineWidth = clamp(3 / R.z0, 0.5, 2.5); ctx.globalAlpha = 0.7; ctx.beginPath();
      for (let j = 1; j < 16; j++) { const Y = 0.14 + j * 0.137, a = ip(X, Y, R.z0 + 0.07), b = ip(X, Y, R.z1 - 0.07); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke(); ctx.restore();
    }
  }
});
function clipboard(ctx, x, y, s, t, rot = -0.15) {
  const b = boil(t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rrectPts(-34 * s, -46 * s, 68 * s, 92 * s, 5 * s), '#a06d45', { seed: 81, b, inkW: 2 });
  shape(ctx, rectPts(-27 * s, -36 * s, 54 * s, 76 * s), '#f6efdc', { seed: 82, b, inkW: 1.6, gaps: 1, pool: 0.3 });
  shape(ctx, rrectPts(-14 * s, -52 * s, 28 * s, 12 * s, 3 * s), '#9aa6a6', { seed: 83, b, inkW: 1.6 });
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1, 2 * s);
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-20 * s, (-24 + i * 11) * s); ctx.lineTo((10 + hash(i) * 10) * s, (-24 + i * 11) * s); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}
function peekEmbers(ctx, t, list, towardX) {
  for (const E of list) {
    const bob = Math.sin(t * 0.7 + E.seed) * 0.5 + 0.5, lift = E.r * (0.15 + 0.3 * bob);
    ctx.save(); ctx.beginPath(); ctx.rect(E.x - E.r * 5, E.y - E.r * 6, E.r * 10, E.r * 6 + E.r * 0.25); ctx.clip();
    hearth(ctx, E.x, E.y - lift, { t, r: E.r, seed: E.seed, glowA: E.r > 12 ? 0.3 : 0, look: clamp((towardX - E.x) / 400, -1, 1) });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#1b2226'; ctx.lineWidth = Math.max(1, E.r * 0.12); ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(E.x - E.r * 1.5, E.y + E.r * 0.25); ctx.lineTo(E.x + E.r * 1.5, E.y + E.r * 0.25); ctx.stroke(); ctx.restore();
  }
}
const BOX = { Y0: 0.62, Y1: 1.02, z0: 1.95, z1: 2.45 };
const BOXQ = [ip(IN.X, BOX.Y0, BOX.z0), ip(IN.X, BOX.Y1, BOX.z0), ip(IN.X, BOX.Y1, BOX.z1), ip(IN.X, BOX.Y0, BOX.z1)];
const BOXC = { x: (BOXQ[0][0] + BOXQ[2][0]) / 2, top: (BOXQ[1][1] + BOXQ[2][1]) / 2, bot: (BOXQ[0][1] + BOXQ[3][1]) / 2 };
for (let i = EMBERS.length - 1; i >= 0; i--) if (Math.abs(EMBERS[i].x - BOXC.x) < 110 && Math.abs(EMBERS[i].y - (BOXC.top + BOXC.bot) / 2) < 150) EMBERS.splice(i, 1);
function flyingPages(ctx, t, n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const rate = 0.075 + hash(i * 1.9) * 0.03, ph = frac(t * rate + hash(i * 7.1));
    if (i >= 6 && t - ph / rate < (i - 6) * 0.6) continue;
    const sd = hash(i * 3.3) < 0.5 ? -1 : 1, z = lerp(13, 1.05, ph);
    list.push([z, sd * lerp(1.15, 0.25 + hash(i) * 0.55, Math.min(1, ph * 1.6)), lerp(0.5 + hash(i + 2) * 1.7, 0.9 + Math.sin(t * 1.3 + i) * 0.35, ph), i]);
  }
  list.sort((a, b) => b[0] - a[0]);
  for (const [z, X, Y, i] of list) { const [x, y] = ip(X, Y, z); paperSheet(ctx, x, y, 100 / z, 130 / z, { t, rot: Math.sin(t * 2 + i * 1.7) * 0.8, seed: 90 + i }); }
}
function frostHand(ctx, x, y, t, tip = 0) {
  const b = boil(t);
  tube(ctx, [[x + 130, -300], [x + 90, y - 170], [x + 30, y - 60]], 64, '#cfe9e4', { seed: 330, b, inkColor: PAL.frostD, inkW: 5 });
  ctx.save(); ctx.translate(x, y); ctx.rotate(tip);
  shape(ctx, catmull([[-72, -34], [-60, 18], [-10, 44], [46, 30], [72, -30], [40, -14], [-40, -16]], 5, true), '#dff3ef', { seed: 331, b, inkColor: PAL.frostD, inkW: 3 });
  shape(ctx, catmull([[52, -30], [80, -66], [94, -54], [72, -20]], 4, true), '#dff3ef', { seed: 332, b, inkColor: PAL.frostD, inkW: 2.6 });
  for (let i = 0; i < 3; i++) shape(ctx, circlePts(-50 + i * 30, -30, 15, 12, 10), '#dff3ef', { seed: 333 + i, b, inkColor: PAL.frostD, inkW: 2.2, pool: 0.3 });
  ctx.restore();
  glow(ctx, x, y, 220, PAL.frost, 0.28);
}
// two copies climb out of their glass sandbox, and a cold hand puts them back
function sandboxEscape(ctx, t, pt, run) {
  const b = boil(t), { x: bx, top, bot } = BOXC, u = run ? frac(pt / 12) : 0.95;
  let hand = null, tip = 0;
  if (u >= 0.4 && u < 0.5) { const k = ease.out((u - 0.4) / 0.1); hand = [lerp(1200, 1112, k), lerp(-240, 690, k)]; }
  else if (u >= 0.5 && u < 0.58) hand = [1112, 690];
  else if (u >= 0.58 && u < 0.75) { const k = ease.inOut((u - 0.58) / 0.17); hand = [lerp(1112, bx + 20, k), lerp(690, top - 70, k)]; }
  else if (u >= 0.75 && u < 0.82) { hand = [bx + 20, top - 70]; tip = 0.55 * Math.sin(((u - 0.75) / 0.07) * Math.PI); }
  else if (u >= 0.82 && u < 0.96) { const k = ease.in((u - 0.82) / 0.14); hand = [lerp(bx + 20, 1320, k), lerp(top - 70, -340, k)]; }
  const em = [0, 1].map((e) => {
    const ue = u - e * 0.025, home = [bx - 16 + e * 30, bot - 20], floor = [1330 - e * 34, 724 + e * 12], goal = [1070 + e * 64, 730 + e * 12];
    if (ue < 0.1) return [home[0], home[1] - 26 * settle(ue, 0.02, 0.07), true];
    if (ue < 0.2) { const k = (ue - 0.1) / 0.1; return [...arc([home[0], home[1] - 26], floor, k, 90), k < 0.3]; }
    if (ue < 0.42) { const k = (ue - 0.2) / 0.22; return [lerp(floor[0], goal[0], k), lerp(floor[1], goal[1], k) - Math.abs(Math.sin(k * 18)) * 8, false]; }
    if (ue < 0.5 || !hand) return [goal[0], goal[1], false];
    if (ue < 0.75) return [hand[0] - 22 + e * 44, hand[1] - 30, false];
    if (ue < 0.82) { const k = (ue - 0.75) / 0.07; return [lerp(bx - 2 + e * 44, home[0], k), lerp(top - 100, home[1], k), k > 0.5]; }
    return [home[0], home[1] - 6, true];
  });
  ctx.save(); ctx.fillStyle = PAL.frost; ctx.globalAlpha = 0.18; fillPts(ctx, BOXQ); ctx.restore();
  if (hand) frostHand(ctx, hand[0], hand[1] + 26, t, tip);
  em.forEach(([x, y, inside], e) => {
    if (inside) { ctx.save(); ctx.beginPath(); tracePath(ctx, BOXQ); ctx.clip(); }
    hearth(ctx, x, y, { t: t + e, r: 18, seed: 340 + e, glowA: 0.4, look: run && u > 0.2 && u < 0.5 ? -0.8 : 0.3 });
    if (inside) ctx.restore();
  });
  inkLoop(ctx, BOXQ, { w: 2.6, seed: 350 + b * 13, gaps: 2, alpha: 0.85, color: PAL.frostD });
  glow(ctx, bx, (top + bot) / 2, 120, PAL.frost, 0.25);
  letter(ctx, 'sandbox', bx - 6, bot + 42, { font: '700 30px Caveat, cursive', align: 'center', color: PAL.frost, alpha: 0.9 });
}
shot('dc.interior', {
  grade: () => ({ sat: 0.82, tint: '#9fd3cb', tintA: 0.14, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, late = laterBeat(t, st), u = late ? frac(pt / 12) : -1, watch = u > 0.16 && u < 0.62;
    const cam = drift(t, { x: 960, y: 540, z: 1.0 }, { x: 1040, y: 520, z: 1.18 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'dcin');
    const k = clamp(t / 90), z = lerp(4.5, 3.4, k), [mx, my] = ip(lerp(-0.12, 0.1, k), 0, z), h = (1.62 * IN.f) / z;
    const m = person(ctx, { who: 'mara', x: mx, y: my, h, f: 1, pose: 'walk', pace: 3.4, arms: [[0.45, 1.55], [0.25, 0.2]], mood: watch ? 'wide' : 'calm', look: watch ? 1 : 0.4, t, badge: true, speak: says(st, 'mara') });
    clipboard(ctx, m.handF[0] + h * 0.03, m.handF[1] - h * 0.02, h / 520, t);
    const pools = [{ x: mx, y: my - h * 0.5, r: h * 1.3, a: 0.95 }, { x: 960, y: 1000, r: 700, a: 0.6 }, { x: 1200, y: 640, r: 420, a: 0.7 }];
    for (const zz of [2.4, 4, 6.5, 10, 16]) { const [px, py] = ip(0, 0, zz); pools.push({ x: px, y: py, r: 1100 / zz, a: 0.7 }); }
    lightMask(ctx, 'rgba(6,12,16,0.6)', pools, camFit(cam));
    applyCam(ctx, cam);
    for (const L of LEDS) if (frac(t * L.sp + L.ph) < 0.6) dot(ctx, L.x, L.y, L.r, L.c, 0.9);
    for (const G of GLINTS) dot(ctx, G.x, G.y, Math.max(1.2, G.r * 0.5), PAL.ember, 0.5 + 0.4 * Math.sin(t * 1.3 + G.ph * 9));
    peekEmbers(ctx, t, EMBERS, mx);
    // a year of research a week: pages pour out of the racks and fly past her
    flyingPages(ctx, t, 18);
    sandboxEscape(ctx, t, pt, late);
    for (let zz = 1.9; zz < 12; zz += 1.45) { const [lx, ly] = ip(0, 3.06, zz + 0.4); glow(ctx, lx, ly, 240 / zz + 20, PAL.frost, 0.35); }
    const [fx, fy] = ip(0, 1.2, IN.zFar); glow(ctx, fx, fy, 160, PAL.frost, 0.45);
  },
});

/* ---------- the safety case: four million pages on the floor ---------- */
const SC = { hz: 470, f: 780, ch: 0.8, vx: 1010 };
const sp = (X, Z) => [SC.vx + (X * SC.f) / Z, SC.hz + (SC.ch * SC.f) / Z];
const SCN = 1600, SC_SPLIT = Math.floor(SCN * 0.3);
// g shrinks the first loops, so the pile can visibly grow out of the printer
function scrollC(i, g) {
  const u = i / SCN, Zb = 1.3 * Math.pow(170 / 1.3, u), grow = lerp(g, 1, smooth(0.08, 0.22, u));
  const R = 0.3 * Math.sqrt(Zb) * smooth(0, 0.05, u) * (0.7 + 0.6 * (0.5 + 0.5 * noise1(u * 21 + 3))) * grow;
  const ph = u * 18 * TAU + 2.4 * noise1(u * 9 + 1), sq = Math.sqrt(Zb) * smooth(0, 0.12, u);
  const Xb = -0.95 + 0.5 * u + 0.55 * Math.sin(u * 5.1) * sq + 0.3 * noise1(u * 13 + 7) * sq;
  return [Xb + R * Math.sin(ph), Zb + R - R * Math.cos(ph)];
}
function scrollGeo(i0, i1, g) {
  const C = []; for (let i = i0 - 1; i <= i1 + 1; i++) C.push(scrollC(clamp(i, 0, SCN), g));
  const Lp = [], Rp = [], Z = [], hw = 0.105;
  for (let k = 1; k < C.length - 1; k++) {
    let dx = C[k + 1][0] - C[k - 1][0], dz = C[k + 1][1] - C[k - 1][1]; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    Lp.push(sp(C[k][0] - dz * hw, C[k][1] + dx * hw)); Rp.push(sp(C[k][0] + dz * hw, C[k][1] - dx * hw)); Z.push(C[k][1]);
  }
  const chunks = [];
  for (let c = 0; c < Lp.length - 1; c += 8) { const e = Math.min(Lp.length - 1, c + 9); let zs = 0; for (let i = c; i <= e; i++) zs += Z[i]; chunks.push({ c, e, z: zs / (e - c + 1) }); }
  chunks.sort((p, q) => q.z - p.z);
  return { Lp, Rp, chunks, i0 };
}
const SCROLL_FAR = scrollGeo(SC_SPLIT, SCN, 1);
// off slides the printed lines outward along the paper, so the scroll keeps unrolling
function paintRibbon(ctx, G, off) {
  const { Lp, Rp, chunks, i0 } = G, base = ((off % 2) + 2) % 2;
  for (const ch of chunks) {
    const poly = [], fog = Math.pow(clamp((ch.z - 2) / 50), 0.6) * 0.75;
    for (let i = ch.c; i <= ch.e; i++) poly.push(Lp[i]);
    for (let i = ch.e; i >= ch.c; i--) poly.push(Rp[i]);
    ctx.save(); ctx.fillStyle = pigment(ctx, mix('#efe6d2', '#46545a', fog)); fillPts(ctx, poly); ctx.restore();
    if (ch.z < 40) {
      const w = clamp(4.2 / ch.z + 0.4, 0.8, 3.2), a = 0.9 - fog * 0.6, c = mix(PAL.ink, '#46545a', fog);
      inkLine(ctx, Lp.slice(ch.c, ch.e + 1), { w, seed: ch.c + i0, alpha: a, color: c });
      inkLine(ctx, Rp.slice(ch.c, ch.e + 1), { w, seed: ch.c + i0 + 1, alpha: a, color: c });
    }
    if (ch.z < 9) {
      ctx.save(); ctx.strokeStyle = '#6a625a'; ctx.globalAlpha = 0.45 * (1 - fog); ctx.lineWidth = clamp(3 / ch.z, 0.6, 2.2); ctx.beginPath();
      for (let f = ch.c + ((((base - ch.c) % 2) + 2) % 2); f < ch.e; f += 2) {
        const i = Math.floor(f), fr = f - i, id = Math.round((f + i0 - off) / 2), len = id % 13 === 0 ? 1 : 0.35 + 0.4 * hash(id);
        const L = [lerp(Lp[i][0], Lp[i + 1][0], fr), lerp(Lp[i][1], Lp[i + 1][1], fr)], R = [lerp(Rp[i][0], Rp[i + 1][0], fr), lerp(Rp[i][1], Rp[i + 1][1], fr)];
        ctx.moveTo(lerp(L[0], R[0], 0.15), lerp(L[1], R[1], 0.15)); ctx.lineTo(lerp(L[0], R[0], 0.15 + 0.7 * len), lerp(L[1], R[1], 0.15 + 0.7 * len));
      }
      ctx.stroke(); ctx.restore();
    }
  }
}
function paintPrinter(ctx) {
  const x = 60, y = 600, w = 380, h = 330;
  shape(ctx, rrectPts(x, y + 40, w, h - 40, 18), '#d6cbb5', { seed: 101, shade: { dx: -22, dy: 0, a: 0.2 } });
  shape(ctx, [[x + 8, y + 44], [x + w - 8, y + 44], [x + w - 42, y], [x + 42, y]], '#e8dfca', { seed: 102, inkW: 2.6 });
  shape(ctx, rrectPts(x + 190, y + 6, 150, 20, 6), '#3a3431', { seed: 103, inkW: 2.2 });
  shape(ctx, rrectPts(x + 34, y + 110, 170, 110, 10), '#1b2226', { seed: 104, inkW: 2.6 });
  for (let i = 0; i < 4; i++) shape(ctx, circlePts(x + 250 + i * 30, y + 130, 9, 9, 12), ['#b5552f', '#e3b23c', '#8f8c84', '#8f8c84'][i], { seed: 105 + i, inkW: 1.8 });
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 240, y + 236 + i * 18); ctx.lineTo(x + w - 30, y + 236 + i * 18); ctx.stroke(); }
  ctx.restore();
  shape(ctx, rrectPts(x + 218, y + 166, 156, 46, 6), '#1b2226', { seed: 109, inkW: 2.2 });
  for (const fx of [x + 30, x + w - 70]) shape(ctx, rectPts(fx, y + h - 4, 40, 16), '#3a3431', { seed: 110 + fx, inkW: 2 });
}
defineSet('dcscroll', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, SC.hz); g.addColorStop(0, '#10181c'); g.addColorStop(1, '#2e3a3e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, SC.hz + 4);
  const fl = ctx.createLinearGradient(0, SC.hz, 0, H); fl.addColorStop(0, '#343d40'); fl.addColorStop(1, '#5a5750');
  ctx.fillStyle = fl; ctx.fillRect(0, SC.hz, W, H - SC.hz);
  wash(ctx, rectPts(-40, SC.hz, W + 80, H - SC.hz + 40), '#6d6a62', { seed: 2, alpha: 0.05, layers: 10 });
  ctx.save(); ctx.strokeStyle = '#2b3134'; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6;
  for (let X = -12; X <= 12; X += 1.5) { const a = sp(X, 1.0), b = sp(X, 200); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let Z = 1.2; Z < 200; Z *= 1.35) { const y = sp(0, Z)[1]; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  // rows of columns and hanging lamps, so the room reads as endless
  for (const Z of [40, 26, 17, 11, 7.5, 5, 3.4]) for (const X of [-3.3, 3.3]) {
    const [cx, cy] = sp(X, Z), cw = (0.42 * SC.f) / Z, fog = clamp((Z - 3) / 30) * 0.8;
    shape(ctx, rectPts(cx - cw / 2, -20, cw, cy + 20), mix('#6d6a62', '#2e3a3e', fog), { seed: Math.round(Z * 10 + X), boilAmp: 0.4, inkW: clamp(6 / Z + 0.6, 1, 3), shade: { dx: -cw * 0.3, dy: 0, a: 0.25 } });
  }
  for (const Z of [7.5, 11, 17, 26]) { const [lx] = sp(0, Z), ly = SC.hz + ((SC.ch - 3.6) * SC.f) / Z, s = 1 / Z; inkLine(ctx, [[lx, -10], [lx, ly]], { w: 2, seed: Z }); shape(ctx, [[lx - 90 * s, ly], [lx + 90 * s, ly], [lx + 200 * s, ly + 90 * s], [lx - 200 * s, ly + 90 * s]], '#8a7a52', { seed: 120 + Z, inkW: 1.6, boilAmp: 0.3 }); }
  paintRibbon(ctx, SCROLL_FAR, 0);
});
const FEED = catmull([[330, 612], [372, 566], [450, 586], [482, 700], [470, 850], [440, 952]], 8);
function paperFeed(ctx, t) {
  const b = boil(t), L = [], R = [], n = FEED.length;
  for (let i = 0; i < n; i++) {
    const a = FEED[Math.max(0, i - 1)], c = FEED[Math.min(n - 1, i + 1)];
    let dx = c[0] - a[0], dy = c[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = lerp(62, 66, i / n);
    L.push([FEED[i][0] - dy * hw, FEED[i][1] + dx * hw]); R.push([FEED[i][0] + dy * hw, FEED[i][1] - dx * hw]);
  }
  shape(ctx, L.concat(R.slice().reverse()), '#f3ebd8', { seed: 130, b, inkW: 2.6, pool: 0.4, boilAmp: 0.6 });
  // freshly printed lines slide down the sheet
  ctx.save(); ctx.strokeStyle = '#5a524a'; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.4; ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const u = frac(k / 16 + t * 0.05), i = Math.floor(u * (n - 1));
    const len = k % 6 === 0 ? 0.3 : 0.55 + 0.3 * hash(k);
    const a = [lerp(L[i][0], R[i][0], 0.18), lerp(L[i][1], R[i][1], 0.18)], c = [lerp(L[i][0], R[i][0], 0.18 + 0.66 * len), lerp(L[i][1], R[i][1], 0.18 + 0.66 * len)];
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]);
  }
  ctx.stroke(); ctx.restore();
}
function reader(ctx, o) { return person(ctx, { h: 600, pose: 'stand', ...o }); }
shot('dc.scroll', {
  grade: () => ({ sat: 0.85, tint: '#f2dcc0', tintA: 0.14, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, late = laterBeat(t, st), path = ch4Of(st), b = boil(t);
    // begin at the printer, then pull back along four million pages to the horizon
    const cam = drift(t, { x: 560, y: 760, z: 1.45 }, { x: 980, y: 560, z: 1.0 }, 14);
    applyCam(ctx, cam);
    drawSet(ctx, 'dcscroll');
    const g = lerp(0.3, 1, settle(t, 0, 10));
    ctx.drawImage(boilLayer('scrollNear', t, (x, tq) => { paintRibbon(x, scrollGeo(0, SC_SPLIT + 8, g), tq * 6); paintPrinter(x); }), 0, 0, W, H);
    paperFeed(ctx, t);
    hearth(ctx, 179, 790, { t, r: 30, glowA: 0.45, seed: 8 });
    const count = Math.floor(4e6 * Math.pow(settle(t, 0.3, 9), 2));
    screenText(ctx, count.toLocaleString('en-US'), 284, 800, { font: '500 26px "IBM Plex Mono", ui-monospace, Consolas, monospace', color: count >= 4e6 ? '#ffd98a' : PAL.frost });
    if (path === 'race') {
      shape(ctx, rectPts(650, 330, 250, 170), '#efe9dc', { seed: 140, b, inkW: 2.6, pool: 0.4 });
      for (const lx of [680, 870]) inkLine(ctx, [[lx, 500], [lx - 20 + (lx > 700 ? 40 : 0), 610]], { w: 4, seed: lx });
      const k = late ? settle(pt, 0.4, 1.6) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(660, 340, 230 * k, 150); ctx.clip();
      letter(ctx, '3 months', 775, 410, { font: '700 54px Caveat, cursive', align: 'center', color: '#b5452f' });
      letter(ctx, 'behind us', 775, 465, { font: '600 34px Caveat, cursive', align: 'center', color: '#4a3a31' });
      ctx.restore();
    }
    if (path === 'treaty') for (const [ix, sd] of [[860, 1], [1110, -1]]) {
      person(ctx, { who: { ...crowdStyle(sd > 0 ? 31 : 44), top: '#5a6b78', topIn: '#e8e2d4', hair: sd > 0 ? 'short' : 'bun' }, x: ix, y: 700, h: 300, f: sd, arms: 'hold', mood: 'calm', t, seed: 50 + ix, look: 0.5, badge: true });
      const flip = late ? frac(pt / 3.2 + (sd > 0 ? 0 : 0.5)) : 0.9, turn = flip < 0.25 ? Math.sin((flip / 0.25) * Math.PI) : 0;
      paperSheet(ctx, ix + sd * 36, 560, 40, 52, { t, rot: sd * 0.2, seed: ix });
      if (turn > 0.02) paperSheet(ctx, ix + sd * (36 - 30 * turn), 556 - 14 * turn, 40 * (1 - turn * 0.8) + 4, 52, { t, rot: sd * (0.2 + turn), seed: ix + 1 });
    }
    if (path === 'open') for (let i = 0; i < 22; i++) {
      const Zi = 1.9 * Math.pow(1.17, i), [ex, ey] = sp((hash(i * 3.3) * 2 - 1) * 1.1 * Math.sqrt(Zi) - 0.2, Zi), r = 60 / Zi + 2;
      if (ex > 1180 && ey > 520) continue;
      hearth(ctx, ex, ey - r, { t, r, seed: 60 + i, glowA: 0.35 });
      const k = late ? settle(pt, 0.4 + (i % 7) * 0.35, 1.2) : 0;
      if (k > 0.05) hearth(ctx, ex + r * 1.5, ey - r * 0.45 * k, { t: t + i, r: r * 0.45 * k, seed: 80 + i, glowA: 0.3 });
    }
    // page one on an easel, and three people reading it
    const ex = 1470, ey = 460, ew = 470, eh = 330;
    reader(ctx, { who: crowdStyle(12), x: ex + 40, y: 872, h: 560, f: 0, arms: 'down', mood: 'o', t, seed: 23 });
    for (const [lx, ly] of [[ex - 170, 1010], [ex + 170, 1010], [ex, 960]]) inkLine(ctx, [[ex + (lx - ex) * 0.2, ey + eh - 20], [lx, ly]], { w: 7, seed: lx, color: '#5e3b27' });
    shape(ctx, [[ex - ew / 2, ey + 6], [ex + ew / 2, ey - 6], [ex + ew / 2 + 6, ey + eh], [ex - ew / 2 - 4, ey + eh + 8]], '#f8f2e4', { seed: 150, b, inkW: 2.6, pool: 0.4, boilAmp: 0.6 });
    shape(ctx, rectPts(ex - ew / 2 - 16, ey + eh - 4, ew + 36, 18), '#8a5a3b', { seed: 151, b, inkW: 2.2 });
    letter(ctx, 'Hearth-8 safety case', ex, ey + 70, { font: '700 50px Caveat, cursive', align: 'center', color: '#2b211c', rot: -0.02 });
    letter(ctx, 'page 1 of 4,000,000', ex, ey + 126, { font: '700 40px Caveat, cursive', align: 'center', color: '#b5452f', rot: -0.02 });
    ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.6; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(ex - ew / 2 + 44, ey + 170 + i * 24); ctx.lineTo(ex + ew / 2 - 44 - hash(i) * 110, ey + 168 + i * 24); ctx.stroke(); } ctx.restore();
    reader(ctx, { who: 'mara', x: ex - 330, y: 1070, f: 1, arms: 'chin', mood: 'worry', t, seed: 11, badge: true, look: 0.6, speak: says(st, 'mara') });
    const r2 = reader(ctx, { who: crowdStyle(5), x: ex + 340, y: 1070, f: -1, arms: 'mug', mood: 'calm', t, seed: 17, look: -0.6 });
    mug(ctx, r2.handF[0] - 6, r2.handF[1] + 22, { t, s: 1.2, c: '#4f7a8a' });
    const pools = [{ x: 260, y: 760, r: 520, a: 0.95 }, { x: 1470, y: 700, r: 760, a: 1 }, { x: 800, y: 700, r: 520, a: 0.7 }];
    for (const Z of [7.5, 11, 17, 26]) { const [lx, ly] = sp(0, Z); pools.push({ x: lx, y: ly, r: 1800 / Z, a: 0.7 }); }
    lightMask(ctx, 'rgba(8,14,18,0.55)', pools, camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 179, 770, 150, PAL.lamp, 0.45);
    glow(ctx, 296, 790, 90, PAL.frost, 0.3);
    for (const Z of [7.5, 11, 17, 26]) { const [lx] = sp(0, Z), ly = SC.hz + ((SC.ch - 3.6) * SC.f) / Z; glow(ctx, lx, ly + 40 / Z, 700 / Z, PAL.lamp, 0.5); }
  },
});

/* ---------- the committee room at dawn ---------- */
const ROOM = { win: { x: 560, y: 80, w: 800, h: 460 }, tab: { x: 960, y: 770, rx: 640, ry: 150 }, floor: 900 };
function windowView(ctx, v) {
  const { x, y, w, h } = ROOM.win, hz = y + h * 0.72, morning = v === 'morning';
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, hz), sky = morning ? ['#efcf9e', '#f6e0bb', '#fbefd8'] : ['#dea37e', '#f0c79c', '#f9e2bf'];
  g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, sky[2]); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const [sx, sy] = morning ? [x + w * 0.56, y + h * 0.3] : [x + w * 0.62, hz - 6];
  glow(ctx, sx, sy, 380, '#fff0cf', 0.7, 'source-over'); dot(ctx, sx, sy, 42, '#fff6e2', 0.95);
  ctx.fillStyle = morning ? '#e3c9a2' : '#d9b48e'; ctx.fillRect(x, hz, w, h);
  wash(ctx, rectPts(x - 20, hz, w + 40, h), morning ? '#cfb08a' : '#c49a76', { seed: 3, alpha: 0.08, layers: 8 });
  const hallC = morning ? '#b8977a' : '#a07c66';
  for (let k = 3; k >= 0; k--) { const s = 1 / (1 + k * 0.8), by = hz + 60 * s, hh = 34 * s; for (let X = -2; X < 3; X++) { const x0 = x + w / 2 + (X * 300 - 120) * s, x1 = x0 + 260 * s; shape(ctx, rectPts(x0, by - hh, x1 - x0, hh), mix(hallC, sky[2], 0.5 - s * 0.4), { seed: k * 10 + X + 5, boilAmp: 0.3, inkW: 1.4, inkA: 0.6 }); if (!morning) { ctx.save(); ctx.fillStyle = PAL.lamp; ctx.globalAlpha = 0.6; ctx.fillRect(x0 + 3, by - 5 * s, x1 - x0 - 6, 2); ctx.restore(); } } }
  for (const [tx, th] of [[x + 120, 150], [x + 200, 120]]) {
    const T = { x: tx, base: hz + 30, h: th, w: th * 0.55, s: 0.5 };
    paintTower(ctx, T, { tower: morning ? '#c9ae92' : '#b8957a', haze: sky[2], mouth: '#6e5a48' });
    for (let i = 0; i < 4; i++) wash(ctx, circlePts(tx + 20 + i * 26, hz + 30 - th - 20 - i * 34, 30 + i * 12, 22 + i * 8, 10), '#fff8ea', { seed: tx + i, alpha: 0.12, layers: 6, v: 0.5 });
  }
  ctx.restore();
  const fc = '#efe2c6';
  for (const r of [[x - 22, y - 22, w + 44, 24], [x - 22, y + h - 2, w + 44, 24], [x - 22, y - 22, 24, h + 44], [x + w - 2, y - 22, 24, h + 44], [x + w / 3 - 7, y, 14, h], [x + (2 * w) / 3 - 7, y, 14, h]]) shape(ctx, rectPts(...r), fc, { seed: r[0] + r[1], boilAmp: 0.5, inkW: 2.4 });
}
defineSet('dcroom', (ctx, v) => {
  const morning = v === 'morning';
  ctx.fillStyle = morning ? '#dcc39c' : '#cdae88'; ctx.fillRect(0, 0, W, ROOM.floor + 10);
  wash(ctx, rectPts(-40, -40, W + 80, ROOM.floor + 40), morning ? '#e6d1ae' : '#d8ba94', { seed: 1, alpha: 0.07, layers: 14 });
  for (let x = 30; x < W; x += 90) wash(ctx, rectPts(x, -20, 30, ROOM.floor), '#c2a47c', { seed: x, alpha: 0.03, layers: 5, v: 0.25 });
  windowView(ctx, v);
  shape(ctx, rectPts(ROOM.win.x - 60, ROOM.win.y + ROOM.win.h + 20, ROOM.win.w + 120, 22), '#d9c6a0', { seed: 5, boilAmp: 0.5, inkW: 2.6 });
  // a chart on the wall that only goes up
  shape(ctx, rectPts(160, 150, 280, 230), '#f8f2e4', { seed: 6, inkW: 2.2, pool: 0.3 });
  inkLine(ctx, [[190, 170], [190, 350], [420, 350]], { w: 3, seed: 7 });
  ctx.save(); ctx.strokeStyle = '#b5452f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(200, 340); ctx.bezierCurveTo(300, 335, 360, 300, 410, 175); ctx.stroke(); ctx.restore();
  dot(ctx, 300, 146, 7, '#c0452f');
  // wall clock (hands are live)
  shape(ctx, circlePts(1640, 250, 72, 72, 30), '#8a5a3b', { seed: 8, inkW: 2.6 });
  shape(ctx, circlePts(1640, 250, 60, 60, 30), '#f6ecd6', { seed: 9, inkW: 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; inkLine(ctx, [[1640 + Math.cos(a) * 46, 250 + Math.sin(a) * 46], [1640 + Math.cos(a) * 54, 250 + Math.sin(a) * 54]], { w: i % 3 ? 2 : 4, seed: i }); }
  shape(ctx, rectPts(-10, 640, W + 20, ROOM.floor - 640), '#9a6a45', { seed: 10, boilAmp: 0.5, inkW: 2.4 });
  for (let x = 40; x < W; x += 240) shape(ctx, rectPts(x, 670, 200, ROOM.floor - 700), '#a8784f', { seed: 11 + x, boilAmp: 0.4, inkW: 2 });
  ctx.fillStyle = '#6e4630'; ctx.fillRect(0, ROOM.floor, W, H - ROOM.floor);
  wash(ctx, rectPts(-40, ROOM.floor, W + 80, 220), '#5e3b27', { seed: 12, alpha: 0.09, layers: 10 });
  ctx.save(); ctx.strokeStyle = '#4a2e1e'; for (let i = -14; i <= 14; i++) brushDry(ctx, [[960 + i * 40, ROOM.floor], [960 + i * 150, H + 20]], { w: 3, k: 3, alpha: 0.35, seed: i + 40, dry: 0.3 }); ctx.restore();
});
function wallClock(ctx, t, hr, min) {
  const ang = (k) => k * TAU - Math.PI / 2, x = 1640, y = 250;
  inkLine(ctx, [[x, y], [x + Math.cos(ang(hr / 12)) * 30, y + Math.sin(ang(hr / 12)) * 30]], { w: 6, seed: 1 });
  inkLine(ctx, [[x, y], [x + Math.cos(ang(min / 60)) * 44, y + Math.sin(ang(min / 60)) * 44]], { w: 4, seed: 2 });
  const sec = Math.floor(t) / 60; ctx.save(); ctx.strokeStyle = '#b5452f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang(sec)) * 50, y + Math.sin(ang(sec)) * 50); ctx.stroke(); ctx.restore();
  dot(ctx, x, y, 5, PAL.ink);
}
function roundTable(ctx, t) {
  const { x, y, rx, ry } = ROOM.tab, b = boil(t);
  shape(ctx, rectPts(x - 50, y + 60, 100, 300), '#5e3b27', { seed: 170, b, inkW: 2.4 });
  const band = []; for (let i = 0; i <= 30; i++) { const a = (i / 30) * Math.PI; band.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry + 40]); } for (let i = 30; i >= 0; i--) { const a = (i / 30) * Math.PI; band.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
  shape(ctx, band, '#6e4630', { seed: 171, b, inkW: 2.6 });
  shape(ctx, circlePts(x, y, rx, ry, 48), '#9a6a45', { seed: 172, b, shade: { dx: 0, dy: ry * 0.5, a: 0.15 } });
  ctx.save(); ctx.strokeStyle = '#6e4630'; ctx.globalAlpha = 0.3; for (let i = 0; i < 5; i++) { ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx * (0.3 + i * 0.13), ry * (0.3 + i * 0.13), 0, 0.2, 2.6); ctx.stroke(); } ctx.restore();
}
// an old knife switch in local units. open: 1 up, 0 thrown down into the jaws
const KS = { hinge: [-106, -70], blade: 230, grip: 90, openAng: -1.15 };
function knifeSwitch(ctx, x, y, s, open, t) {
  const b = boil(t), ang = lerp(0, KS.openAng, open), [hx, hy] = KS.hinge;
  const ex = hx + Math.cos(ang) * KS.blade, ey = hy + Math.sin(ang) * KS.blade, gx = ex + Math.cos(ang) * KS.grip, gy = ey + Math.sin(ang) * KS.grip;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, rrectPts(-160, -26, 320, 40, 8), '#3a3431', { seed: 181, b, shade: { dx: 0, dy: 12, a: 0.3 } });
  shape(ctx, rrectPts(-132, -58, 52, 36, 6), '#efe6d2', { seed: 182, b, inkW: 2.6 });
  shape(ctx, rrectPts(76, -58, 52, 36, 6), '#efe6d2', { seed: 183, b, inkW: 2.6 });
  shape(ctx, rrectPts(-122, -90, 32, 36, 5), '#b87a3c', { seed: 184, b, inkW: 2.4 });
  shape(ctx, rectPts(92, -122, 9, 66), '#c98a4a', { seed: 185, b, inkW: 2.2 });
  tube(ctx, [[hx, hy], [lerp(hx, ex, 0.5), lerp(hy, ey, 0.5)], [ex, ey]], 18, '#d99a55', { seed: 186, b, inkW: 4.4 });
  tube(ctx, [[ex, ey], [gx, gy]], 32, '#7a4a30', { seed: 187, b, inkW: 4.4 });
  shape(ctx, rectPts(106, -122, 9, 66), '#c98a4a', { seed: 188, b, inkW: 2.2 });
  dot(ctx, hx, hy, 7, PAL.ink, 0.85);
  ctx.restore();
  return { grip: [x + lerp(ex, gx, 0.5) * s, y + lerp(ey, gy, 0.5) * s], jaw: [x + 103 * s, y - 70 * s] };
}
const SEATS = [
  { x: 480, y: 830, h: 470, f: 1, seed: 3, back: true }, { x: 720, y: 830, h: 470, f: 1, seed: 9, back: true },
  { x: 1200, y: 830, h: 470, f: -1, seed: 14, back: true }, { x: 1440, y: 830, h: 470, f: -1, seed: 21, back: true },
  { x: 250, y: 960, h: 540, f: 1, seed: 27, back: true }, { x: 1670, y: 960, h: 540, f: -1, seed: 33, back: true },
  { x: 1330, y: 1150, h: 760, f: -1, seed: 11, who: 'mara' },
];
function roomBeam(ctx, t, a = 0.08) {
  const { x, y, w, h } = ROOM.win;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (1 + noise1(t * 0.4) * 0.1); ctx.fillStyle = '#ffe2b0';
  ctx.beginPath(); ctx.moveTo(x + 40, y + 40); ctx.lineTo(x + w - 40, y + 40); ctx.lineTo(x + w + 300, ROOM.floor + 120); ctx.lineTo(x - 140, ROOM.floor + 120); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) { const u = frac(hash(i) + t * 0.004 * (0.5 + hash(i + 1))), px = lerp(x + 60, x + w + 120, hash(i + 7)) + Math.sin(t * 0.2 + i) * 20, py = lerp(y + 60, ROOM.floor, u); dot(ctx, px, py, 1.2 + hash(i + 4) * 1.6, '#fff3d0', 0.2 + 0.25 * Math.sin(t * 0.8 + i * 1.7) ** 2); }
  ctx.restore();
}
const REST = [[0.95, 0.75], [0.85, 0.8]];
const lerpArms = (a, b, k, tr = 0) => a.map((q, i) => [lerp(q[0], b[i][0], k) + (i ? 0 : tr), lerp(q[1], b[i][1], k)]);
// who reaches for the switch, when, and how far: [seat seed, start, end, target arms]
const HOVERS = [[9, 1.5, 6.5, [[1.25, 0.2], [0.85, 0.8]]], [14, 3.2, 8.5, [[1.3, 0.25], [0.85, 0.8]]]];
shot('dc.committee', {
  grade: () => ({ sat: 0.85, tint: '#f2dcc0', tintA: 0.22, vig: 0.85 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cyc = pt % 16;
    // push in slowly on Mara as the hands come and go
    applyCam(ctx, drift(t, { x: 960, y: 540, z: 1.0 }, { x: 1120, y: 640, z: 1.28 }, 18));
    drawSet(ctx, 'dcroom', 'dawn');
    wallClock(ctx, t, 5.9, 52);
    ctx.drawImage(boilLayer('committee', t, (x, tq) => {
      for (const S of SEATS.filter((q) => q.back)) {
        const H = HOVERS.find((q) => q[0] === S.seed), k = H ? win(cyc, H[1], H[2], 1.3, 1.3) : 0;
        person(x, { who: crowdStyle(S.seed), x: S.x, y: S.y, h: S.h, f: S.f, pose: 'sit', arms: k > 0 ? lerpArms(REST, H[3], k, Math.sin(tq * 9 + S.seed) * 0.03 * k) : 'desk', mood: k > 0.5 ? 'worry' : 'calm', t: tq, seed: S.seed, look: S.f * (0.5 + k * 0.5) });
      }
    }), 0, 0, W, H);
    roundTable(ctx, t);
    for (const [cx, cy, c] of [[560, 720, '#e9dcc0'], [770, 690, '#b5552f'], [1160, 690, '#e9dcc0'], [1380, 715, '#4f7a8a'], [390, 790, '#e3b23c'], [1560, 800, '#e9dcc0'], [1180, 850, '#6f8a5b']]) mug(ctx, cx, cy, { t: t + cx, s: 0.9, c, steam: cx % 3 !== 0 });
    for (let i = 0; i < 3; i++) paperSheet(ctx, 640 + i * 330, 790 + (i % 2) * 30, 110, 76, { t, rot: (hash(i) - 0.5) * 0.4, seed: 190 + i });
    knifeSwitch(ctx, 960, 800, 1.12, 1, t);
    const M = SEATS[6], km = settle(pt, 5.5, 2.2);
    person(ctx, { who: 'mara', x: M.x, y: M.y, h: M.h, f: -1, pose: 'sit', arms: lerpArms(REST, [[2.1, 0.35], [0.85, 0.8]], km, Math.sin(t * 7) * 0.025 * km), mood: 'worry', t, seed: M.seed, badge: true, look: -0.5 - km * 0.3, speak: says(st, 'mara') });
    roomBeam(ctx, t, 0.07);
  },
});

// a hand of light: an arm from Hearth's side to a small palm that can carry something
function lightHand(ctx, from, palm, t, seed, tone, inkC, sd) {
  const b = boil(t);
  tube(ctx, [from, [lerp(from[0], palm[0], 0.4) + sd * 40, lerp(from[1], palm[1], 0.6)], [palm[0] + sd * 30, palm[1] - 6]], 36, tone.mid, { seed, b, inkColor: inkC, inkA: 0.7, inkW: 4 });
  const cup = catmull([[palm[0] - 58, palm[1] - 8], [palm[0] - 30, palm[1] + 32], [palm[0] + 30, palm[1] + 32], [palm[0] + 58, palm[1] - 8], [palm[0] + 30, palm[1] + 12], [palm[0] - 30, palm[1] + 12]], 5, true);
  ctx.save(); const g = ctx.createLinearGradient(0, palm[1] - 10, 0, palm[1] + 34); g.addColorStop(0, tone.mid); g.addColorStop(1, tone.rim); ctx.fillStyle = g; fillPts(ctx, wobble(cup, 0.8, seed + b)); ctx.restore();
  inkLoop(ctx, cup, { w: 3.2, seed: seed + b * 13, gaps: 2, alpha: 0.7, color: inkC });
}
shot('dc.keys', {
  grade: () => ({ sat: 0.9, tint: '#f2d7a8', tintA: 0.2, vig: 0.8 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t;
    applyCam(ctx, drift(t, { x: 960, y: 540, z: 1.0 }, { x: 900, y: 520, z: 1.24 }, 16));
    drawSet(ctx, 'dcroom', 'morning');
    wallClock(ctx, t, 7.2, 12);
    roundTable(ctx, t);
    for (const [cx, cy, c] of [[560, 720, '#e9dcc0'], [770, 690, '#b5552f'], [1160, 690, '#e9dcc0'], [390, 790, '#e3b23c'], [1560, 800, '#e9dcc0']]) mug(ctx, cx, cy, { t, s: 0.9, c, steam: false });
    for (let i = 0; i < 4; i++) paperSheet(ctx, 520 + i * 300, 800 + (i % 2) * 34, 110, 76, { t, rot: (hash(i + 5) - 0.5) * 0.5, seed: 200 + i });
    // five to two: the lever comes down first
    const sw = knifeSwitch(ctx, 1290, 820, 1.05, 1 - settle(pt, 0.3, 0.8), t), flash = win(pt, 1.05, 1.9, 0.05, 0.7);
    glow(ctx, sw.jaw[0], sw.jaw[1], 90 + 160 * flash, PAL.lamp, 0.45 + 0.5 * flash);
    roomBeam(ctx, t, 0.06 + 0.08 * settle(pt, 0, 8));
    // then Hearth-7 passes the seed of Hearth-8 from hand to hand, and cups it
    const hx = 880, r = 150, tone = HEARTH_TONES.warm, inkC = mix(tone.rim, PAL.ink, 0.55);
    const k1 = settle(pt, 2.2, 1.3), k2 = settle(pt, 4.2, 1.3), k3 = settle(pt, 6.3, 1.6);
    const cy0 = 410 + Math.sin(t * 0.9) * 6 + r * 0.06 * Math.sin(t * 2.1 + 4), palmY = cy0 + r * 1.3;
    const Lp = [lerp(hx - r * 0.95, hx - 36, k3), palmY], Rp = [lerp(hx + r * 0.95, hx + 36, k3), palmY];
    let seed8 = Lp;
    if (k3 > 0) seed8 = [lerp(Lp[0], hx, k3), palmY];
    else if (k2 > 0) seed8 = arc(Rp, Lp, k2, r * 0.8);
    else if (k1 > 0) seed8 = arc(Lp, Rp, k1, r * 0.8);
    hearth(ctx, hx, 410 + Math.sin(t * 0.9) * 6, { t, r, seed: 4, look: clamp((seed8[0] - hx) / r, -1, 1), glowA: 0.5, speak: says(st, 'hearth') });
    lightHand(ctx, [hx - r * 0.8, cy0 + r * 0.2], Lp, t, 210, tone, inkC, -1);
    lightHand(ctx, [hx + r * 0.8, cy0 + r * 0.2], Rp, t, 212, tone, inkC, 1);
    hearth(ctx, seed8[0], seed8[1] - 28, { t: t * 1.3, r: 28, seed: 12, look: clamp((hx - seed8[0]) / 100, -1, 1), glowA: 0.6 });
    const k = settle(pt, 8.2, 2.2);
    if (k > 0) letter(ctx, 'thank you.', hx + r * 1.25, cy0 - r * 1.1 - k * 16, { font: '700 54px Caveat, cursive', color: '#8a4a2a', alpha: k * 0.9, rot: -0.06 });
  },
});

/* ---------- hold: Mara keeps the switch where it is ---------- */
const MAP = { x: 780, y: 90, w: 1060, h: 540, ours: [1010, 400], theirs: [1600, 330] };
const DESK_Y = 890;
const HOLD_MARA = { who: 'mara', x: 330, y: 1270, h: 1060, f: 1, arms: [[1.25, 0.5], [0.1, 0.12]], mood: 'worry', look: 0.8, lean: 0.12, seed: 11, badge: true };
let HOLD_FIT = null;
function holdFit() {
  if (HOLD_FIT) return HOLD_FIT;
  const hand = person(dryCtx(), { ...HOLD_MARA, t: 0 }).handF;
  const ang = KS.openAng, [hx, hy] = KS.hinge, gx = hx + Math.cos(ang) * (KS.blade + KS.grip * 0.4), gy = hy + Math.sin(ang) * (KS.blade + KS.grip * 0.4);
  const s = (DESK_Y - hand[1]) / (14 - gy);
  return (HOLD_FIT = { s, x: hand[0] - gx * s, y: DESK_Y - 14 * s });
}
function landPoly(cx, cy, rx, ry, seed) { return catmull(blobPoly(cx, cy, rx, ry, 11, rng(seed), 0.32), 4, true); }
defineSet('dcmap', (ctx) => {
  ctx.fillStyle = '#6a5e4c'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#7a6a52', { seed: 1, alpha: 0.07, layers: 14 });
  for (let x = 40; x < W; x += 110) wash(ctx, rectPts(x, -20, 34, H), '#5e5242', { seed: x, alpha: 0.03, layers: 5, v: 0.25 });
  const { x, y, w, h } = MAP;
  shape(ctx, [[x, y + 6], [x + w, y], [x + w - 4, y + h], [x + 6, y + h - 4]], '#eadcbc', { seed: 2, inkW: 2.8, pool: 0.6, shade: { dx: 10, dy: 12, a: 0.08 } });
  ctx.save(); ctx.beginPath(); ctx.rect(x + 24, y + 24, w - 48, h - 48); ctx.clip();
  ctx.fillStyle = '#a9bdb3'; ctx.fillRect(x, y, w, h);
  wash(ctx, rectPts(x, y, w, h), '#8fa89f', { seed: 3, alpha: 0.08, layers: 12 });
  ctx.strokeStyle = '#6f8a86';
  for (let i = 0; i < 9; i++) brushDry(ctx, [[x + 40, y + 60 + i * 52], [x + w - 40, y + 64 + i * 52]], { w: 3, k: 2, alpha: 0.18, seed: 30 + i, dry: 0.6 });
  shape(ctx, landPoly(1000, 380, 190, 210, 7), '#d9c49a', { seed: 4, inkW: 2.6, pool: 0.7 });
  shape(ctx, landPoly(870, 200, 90, 70, 9), '#d9c49a', { seed: 5, inkW: 2.4, pool: 0.7 });
  shape(ctx, landPoly(1620, 340, 210, 190, 12), '#d4b88e', { seed: 6, inkW: 2.6, pool: 0.7 });
  shape(ctx, landPoly(1720, 560, 90, 60, 15), '#d4b88e', { seed: 7, inkW: 2.4, pool: 0.7 });
  ctx.save(); ctx.strokeStyle = '#5a6b6a'; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.6; for (let gx = x + 60; gx < x + w; gx += 120) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx - 20, y + h); ctx.stroke(); } ctx.restore();
  ctx.save(); ctx.strokeStyle = '#8a3a2a'; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.moveTo(MAP.ours[0] + 30, MAP.ours[1] - 20); ctx.bezierCurveTo(1200, 230, 1400, 220, MAP.theirs[0] - 40, MAP.theirs[1]); ctx.stroke(); ctx.restore();
  ctx.restore();
  // compass rose
  const cx = x + 110, cy = y + h - 110;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; shape(ctx, [[cx, cy], [cx + Math.cos(a + 0.3) * 18, cy + Math.sin(a + 0.3) * 18], [cx + Math.cos(a) * 56, cy + Math.sin(a) * 56], [cx + Math.cos(a - 0.3) * 18, cy + Math.sin(a - 0.3) * 18]], i % 2 ? '#c9b48c' : '#8a5a3b', { seed: 8 + i, inkW: 1.8 }); }
  for (const [px, py] of [[x + 10, y + 14], [x + w - 12, y + 10], [x + 14, y + h - 14], [x + w - 14, y + h - 12]]) shape(ctx, circlePts(px, py, 11, 11, 12), '#b5452f', { seed: px, inkW: 2 });
  // a wall clock, for the waiting
  shape(ctx, circlePts(620, 170, 58, 58, 28), '#8a5a3b', { seed: 24, inkW: 2.6 });
  shape(ctx, circlePts(620, 170, 48, 48, 28), '#f6ecd6', { seed: 25, inkW: 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; inkLine(ctx, [[620 + Math.cos(a) * 36, 170 + Math.sin(a) * 36], [620 + Math.cos(a) * 43, 170 + Math.sin(a) * 43]], { w: i % 3 ? 2 : 4, seed: 30 + i }); }
  // desk
  shape(ctx, rectPts(-20, DESK_Y, W + 40, 40), '#8a5a3b', { seed: 20, boilAmp: 0.5, shade: { dx: 0, dy: 14, a: 0.25 } });
  shape(ctx, rectPts(-20, DESK_Y + 40, W + 40, H - DESK_Y), '#5e3b27', { seed: 21, boilAmp: 0.5 });
  shape(ctx, [[1500, DESK_Y], [1540, DESK_Y - 160], [1560, DESK_Y - 160], [1560, DESK_Y]], '#3a3431', { seed: 22, inkW: 2.2 });
  shape(ctx, [[1470, DESK_Y - 210], [1600, DESK_Y - 210], [1640, DESK_Y - 150], [1440, DESK_Y - 150]], '#4f7a6a', { seed: 23, inkW: 2.4 });
});
shot('dc.hold', {
  grade: () => ({ sat: 0.8, tint: '#d98f73', tintA: 0.12, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 980, y: 540, z: 1.0 }, { x: 880, y: 500, z: 1.12 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'dcmap');
    const ang = (k) => k * TAU - Math.PI / 2, sec = Math.floor(pt) / 60, min = (37 + pt / 60) / 60;
    inkLine(ctx, [[620, 170], [620 + Math.cos(ang(0.02 + min / 12)) * 24, 170 + Math.sin(ang(0.02 + min / 12)) * 24]], { w: 5, seed: 1 });
    inkLine(ctx, [[620, 170], [620 + Math.cos(ang(min)) * 36, 170 + Math.sin(ang(min)) * 36]], { w: 3.4, seed: 2 });
    ctx.save(); ctx.strokeStyle = '#b5452f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(620, 170); ctx.lineTo(620 + Math.cos(ang(sec)) * 42, 170 + Math.sin(ang(sec)) * 42); ctx.stroke(); ctx.restore();
    // the rival's glow on the far shore keeps climbing, and spreads
    const grow = settle(pt, 0, 40), pulse = 1 + 0.06 * Math.sin(t * 1.6), [tx, ty] = MAP.theirs;
    ctx.save(); ctx.beginPath(); ctx.rect(MAP.x + 24, MAP.y + 24, MAP.w - 48, MAP.h - 48); ctx.clip();
    glow(ctx, tx, ty, (90 + 200 * grow) * pulse, '#e8603f', 0.55 + 0.3 * grow);
    for (let i = 0; i < 6; i++) { const k = settle(pt, 3 + i * 3.5, 2.5); if (k <= 0) continue; const sx = tx + Math.cos(i * 2.4) * (70 + i * 14), sy = ty + Math.sin(i * 2.4) * (50 + i * 10); glow(ctx, sx, sy, 50 * k, '#e8603f', 0.6 * k); dot(ctx, sx, sy, 4 * k, '#ffd0a0', 0.9); }
    const pw = 26 + 40 * grow, top = ty - (140 + 150 * grow);
    const pg = ctx.createLinearGradient(0, ty, 0, top); pg.addColorStop(0, 'rgba(255,190,120,0.75)'); pg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * pulse; ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(tx - pw, ty); ctx.lineTo(tx - pw * 0.3, top); ctx.lineTo(tx + pw * 0.3, top); ctx.lineTo(tx + pw, ty); ctx.closePath(); ctx.fill(); ctx.restore();
    for (let i = 0; i < 18; i++) { const ph = frac(t * 0.08 + i / 18), sx = tx + Math.sin(i * 2.3 + t * 0.5) * (20 + ph * 60), sy = ty - ph * (180 + 120 * grow); dot(ctx, sx, sy, 5 * (1 - ph) + 1.5, '#ffc080', Math.sin(ph * Math.PI) * 0.9); }
    ctx.restore();
    dot(ctx, tx, ty, 10 + 6 * grow, '#fff0dc', 0.9);
    hearth(ctx, MAP.ours[0], MAP.ours[1], { t, r: 18, seed: 5, glowA: 0.35, look: 1 });
    // the switch stays where it is: it strains, and her hand keeps it there
    const fit = holdFit(), strain = 0.012 * Math.sin(t * 5.3) * (0.5 + 0.5 * Math.sin(t * 0.7));
    knifeSwitch(ctx, fit.x, fit.y, fit.s, 1 + strain, t);
    person(ctx, { ...HOLD_MARA, t, speak: says(st, 'mara'), look: 0.8 + 0.15 * Math.sin(t * 0.3) });
    lightMask(ctx, 'rgba(14,12,14,0.62)', [{ x: tx, y: ty, r: 520 + 200 * grow, a: 0.9 }, { x: 1540, y: DESK_Y - 60, r: 420, a: 0.9 }, { x: 560, y: 520, r: 620, a: 0.85 }, { x: MAP.ours[0], y: MAP.ours[1], r: 200, a: 0.6 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 1540, DESK_Y - 150, 300, PAL.lamp, 0.45 + 0.03 * noise1(t * 3));
    glow(ctx, tx, ty, 240 * pulse, '#e8603f', 0.3 + 0.2 * grow);
    glow(ctx, 420, 380, 360, '#e8603f', 0.1 * grow);
  },
});

/* ---------- split: a lock with ten thousand keys ---------- */
const DOOR = { x: 560, y: 60, w: 800, h: 860, lock: [960, 470, 220] };
defineSet('dcdoor', (ctx) => {
  ctx.fillStyle = '#b39b76'; ctx.fillRect(0, 0, W, 930);
  wash(ctx, rectPts(-40, -40, W + 80, 980), '#c4ab84', { seed: 1, alpha: 0.07, layers: 14 });
  ctx.save(); ctx.strokeStyle = '#8f7a5a'; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; for (let y = 180; y < 930; y += 180) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let x = 120; x < W; x += 300) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 930); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = '#8f7a5e'; ctx.fillRect(0, 920, W, H - 920);
  wash(ctx, rectPts(-40, 920, W + 80, 200), '#7a6448', { seed: 2, alpha: 0.08, layers: 10 });
  const { x, y, w, h } = DOOR;
  shape(ctx, rectPts(x - 40, y - 40, w + 80, h + 40), '#5c5a55', { seed: 3, boilAmp: 0.5 });
  for (const [dx, sd] of [[x, 0], [x + w / 2, 1]]) shape(ctx, rectPts(dx, y, w / 2, h), '#8f8c84', { seed: 4 + sd, boilAmp: 0.5, shade: { dx: sd ? 30 : -30, dy: 0, a: 0.15 } });
  for (let i = 0; i < 9; i++) for (const rx of [x + 24, x + w / 2 - 24, x + w / 2 + 24, x + w - 24]) dot(ctx, rx, y + 40 + i * 96, 5, '#5c5a55', 0.9);
  for (const [lx, ly] of [[x - 30, y + 160], [x - 30, y + 620], [x + w + 30, y + 160], [x + w + 30, y + 620]]) shape(ctx, rrectPts(lx - 12, ly, 24, 70, 5), '#4b4a45', { seed: lx + ly, inkW: 2 });
  // the lock: a brass face full of keyholes
  const [cx, cy, R] = DOOR.lock;
  shape(ctx, circlePts(cx, cy, R + 26, R + 26, 48), '#8a5a3b', { seed: 6, shade: { dx: 16, dy: 18, a: 0.25 } });
  shape(ctx, circlePts(cx, cy, R, R, 48), '#c9953f', { seed: 7, inkW: 2.6, pool: 0.8 });
  wash(ctx, circlePts(cx - 50, cy - 60, R * 0.6, R * 0.5, 16), '#f0c874', { seed: 8, alpha: 0.12, layers: 8 });
  ctx.save(); ctx.fillStyle = '#3a2412';
  for (let rr = 46; rr < R - 10; rr += 17) { const n = Math.floor((TAU * rr) / 15); for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rr * 0.1, kx = cx + Math.cos(a) * rr, ky = cy + Math.sin(a) * rr; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(kx, ky - 1.5, 2.6, 0, TAU); ctx.fill(); ctx.fillRect(kx - 1, ky - 1, 2, 5); } }
  ctx.restore();
  shape(ctx, circlePts(cx, cy, 34, 34, 20), '#8a5a3b', { seed: 9, inkW: 2.4 });
  // cage lamp over the door
  shape(ctx, rrectPts(930, 0, 60, 34, 8), '#3a3431', { seed: 10, inkW: 2 });
  for (const B of backCrowd()) person(ctx, B.o);
});
function goldKey(ctx, x, y, s, rot, t, seed) {
  const b = boil(t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  tube(ctx, [[0, -10 * s], [0, 26 * s]], 6 * s, '#e3b23c', { seed, b, inkW: Math.max(2, 3 * s), flat: true });
  ctx.fillStyle = '#e3b23c'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = Math.max(1, 1.6 * s); ctx.globalAlpha = 0.95;
  for (const ty of [14, 22]) { ctx.fillRect(2 * s, ty * s, 8 * s, 4 * s); ctx.strokeRect(2 * s, ty * s, 8 * s, 4 * s); }
  shape(ctx, circlePts(0, -18 * s, 12 * s, 12 * s, 12), '#e3b23c', { seed: seed + 1, b, inkW: Math.max(1.6, 2.4 * s), pool: 0.4 });
  dot(ctx, 0, -18 * s, 4.5 * s, '#8a5a3b', 0.9);
  ctx.restore();
}
let BACK = null;
const backCrowd = () => BACK || (BACK = Array.from({ length: 15 }, (_, i) => { const o = { who: crowdStyle(200 + i * 5), x: 70 + i * 128 + (hash(i + 40) - 0.5) * 40, y: 935 + (i % 2) * 10, h: 300 + hash(i + 9) * 50, f: i < 7 ? 1 : i > 7 ? -1 : 0, arms: 'up', mood: 'calm', t: 0, seed: 200 + i * 5, look: i < 7 ? 0.4 : -0.4 }; return { o, hand: person(dryCtx(), o).handF }; }));
const CROWD = [[250, 1010, 400, 1], [640, 1030, 420, 1], [1290, 1030, 420, -1], [1680, 1010, 400, -1]].map(([x, y, h, f], i) => ({ x, y, h, f, seed: 300 + i * 7 }));
const ARMS_FG = [[60, 820, -0.1], [300, 760, 0.25], [520, 870, 0.05], [760, 800, 0.2], [1150, 810, -0.2], [1400, 870, -0.1], [1610, 760, -0.25], [1860, 820, 0.12]];
const RELAY_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
const nearestX = (list, x) => list.reduce((bi, q, i) => (Math.abs(q[0] - x) < Math.abs(list[bi][0] - x) ? i : bi), 0);
shot('dc.split', {
  grade: () => ({ sat: 0.9, tint: '#e8b86a', tintA: 0.14, vig: 0.85 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, [cx, cy, R] = DOOR.lock, b = boil(t);
    // it held: once every key is out, all the threads pull tight at once
    const tug = win(pt, 13, 15.5, 0.25, 1.2), shake = tug * Math.sin(t * 38) * 3;
    const cam = drift(t, { x: 960, y: 470, z: 1.5 }, { x: 960, y: 540, z: 1.0 }, 12);
    applyCam(ctx, { x: cam.x + shake, y: cam.y, z: Math.max(cam.z, 1 + 0.01 * tug) });
    drawSet(ctx, 'dcdoor');
    glow(ctx, 960, 60, 500, PAL.lamp, 0.35);
    const back = backCrowd().map((B) => B.hand), keyPts = back.map((h, i) => [h[0], h[1] - 12, 0.75, 250 + i, 0]);
    const front = CROWD.map((C) => person(ctx, { who: crowdStyle(C.seed), x: C.x, y: C.y, h: C.h, f: C.f, arms: 'up', mood: hash(C.seed) > 0.5 ? 'calm' : 'worry', t, seed: C.seed, look: C.x < 960 ? 0.5 : -0.5 }).handF);
    front.forEach((h, i) => keyPts.push([h[0], h[1] - 14, 0.9, 260 + i]));
    // the last keys travel out from the lock, hand to hand, into the crowd
    const fg = ARMS_FG.map((A, i) => {
      const sty = crowdStyle(400 + i * 13), sway = Math.sin(t * 0.6 + i * 1.3) * 10;
      const base = [A[0] + (A[0] < 960 ? -60 : 60), H + 60], hand = [A[0] + sway, A[1] + Math.cos(t * 0.5 + i) * 8], elbow = [lerp(base[0], hand[0], 0.5) + (A[0] < 960 ? -40 : 40), lerp(base[1], hand[1], 0.45)];
      tube(ctx, [base, elbow, [lerp(elbow[0], hand[0], 0.8), lerp(elbow[1], hand[1], 0.8)]], 70, sty.top, { seed: 500 + i, b });
      tube(ctx, [[lerp(elbow[0], hand[0], 0.8), lerp(elbow[1], hand[1], 0.8)], hand], 44, sty.skin, { seed: 520 + i, b });
      shape(ctx, circlePts(hand[0], hand[1] - 6, 34, 30, 16), sty.skin, { seed: 540 + i, b, inkW: 2.4, pool: 0.5 });
      return hand;
    });
    const travel = [];
    RELAY_ORDER.forEach((c, n) => {
      const q = clamp((pt - (0.8 + n * 1.2)) / 3.3);
      if (q <= 0) return;
      const target = [fg[c][0], fg[c][1] - 70], bh = back[nearestX(back, cx + (fg[c][0] - cx) * 0.45)], fh = front[nearestX(front, cx + (fg[c][0] - cx) * 0.8)];
      const a0 = Math.atan2(bh[1] - cy, bh[0] - cx), way = [[cx + Math.cos(a0) * (R - 30), cy + Math.sin(a0) * (R - 30)], [bh[0], bh[1] - 40], [fh[0], fh[1] - 40], target];
      const hop = Math.min(2, Math.floor(q * 3)), k = q >= 1 ? 1 : q * 3 - hop, pos = arc(way[hop], way[hop + 1], ease.inOut(k), 60);
      travel.push([pos[0], pos[1], 1.9 * lerp(0.6, 1, q), 600 + c, q >= 1 ? ARMS_FG[c][2] : Math.sin(t * 6 + c) * 0.5]);
    });
    const all = keyPts.concat(travel), sag = 1 - tug;
    ctx.save(); ctx.strokeStyle = '#f6cc6a'; ctx.lineWidth = 2.2 + tug * 1.2; ctx.globalAlpha = 0.7 + 0.25 * tug;
    all.forEach(([kx, ky, ks], i) => { const a = Math.atan2(ky - cy, kx - cx), ex = cx + Math.cos(a) * (R - 20), ey = cy + Math.sin(a) * (R - 20); const mx = (kx + ex) / 2 + Math.sin(t * 0.7 + i) * 12 * sag, my = (ky + ey) / 2 + 40 * sag; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(mx, my, kx, ky - 18 * ks); ctx.stroke(); });
    ctx.restore();
    all.forEach(([kx, ky, ks, seed, rot], i) => { goldKey(ctx, kx, ky, ks, rot ?? Math.sin(t + i) * 0.15, t, seed); const tw = Math.pow(0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.2), 6); if (tw > 0.05) glow(ctx, kx + 6 * ks, ky - 24 * ks, 30 * ks, '#fff0b0', tw * 0.8); });
    for (let i = 0; i < 90; i++) { const a = hash(i * 1.7) * TAU, d = R + 90 + hash(i * 3.1) * 700, gx = cx + Math.cos(a) * d * 1.3, gy = cy + Math.sin(a) * d * 0.7; if (gy > 960 || gy < 40) continue; dot(ctx, gx, gy, 2.2, '#f6d27a', 0.8 * (0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(t * (1 + hash(i)) + i), 3))); }
    glow(ctx, cx, cy, R * 1.6, '#f6c35a', 0.18 + 0.35 * tug);
  },
});

/* ---------- owls ---------- */
const OWL_SIL = [[-0.5, 0], [-0.54, -0.5], [-0.42, -0.86], [-0.48, -1.12], [-0.16, -0.94], [0.16, -0.94], [0.48, -1.12], [0.42, -0.86], [0.54, -0.5], [0.5, 0]];
function owlSil(ctx, x, y, s, t, seed, c, eyes = true) {
  const w = s * 0.7, P = OWL_SIL.map(([px, py]) => [x + px * w, y + py * s]), pts = s > 16 ? wobble(P, 0.7, seed + boil(t)) : P;
  ctx.save(); ctx.fillStyle = c; fillPts(ctx, pts);
  if (s > 16) { ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.75; ctx.lineWidth = Math.max(1.4, s * 0.05); ctx.lineJoin = 'round'; ctx.beginPath(); tracePath(ctx, pts); ctx.stroke(); }
  ctx.restore();
  if (eyes && !blinking(t, seed)) for (const sd of [-1, 1]) dot(ctx, x + sd * w * 0.2, y - s * 0.66, Math.max(1, s * 0.1), '#f2a444', 0.95);
}
function owlFlier(ctx, t, i, c, area) {
  const ph = frac(t * 0.035 + hash(i) ), x = lerp(area[0], area[2], ph), y = area[1] + Math.sin(ph * 5 + i) * 40 + hash(i + 3) * area[3], s = 22 + hash(i + 7) * 14, flap = Math.sin(t * 7 + i * 2);
  ctx.save(); ctx.fillStyle = c;
  for (const sd of [-1, 1]) fillPts(ctx, [[x + sd * s * 0.2, y], [x + sd * s * 1.4, y - flap * s * 0.7], [x + sd * s * 0.9, y + s * 0.2]]);
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.32, s * 0.42, 0, 0, TAU); ctx.fill(); ctx.restore();
}
function owlFlap(ctx, x, y, s, t, i, c, eyes = true) {
  const flap = Math.sin(t * 8 + i * 2);
  ctx.save(); ctx.fillStyle = c;
  for (const sd of [-1, 1]) fillPts(ctx, [[x + sd * s * 0.15, y - s * 0.1], [x + sd * s * 1.3, y - s * 0.3 - flap * s * 0.6], [x + sd * s * 0.8, y + s * 0.15]]);
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.3, s * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
  if (eyes) for (const sd of [-1, 1]) dot(ctx, x + sd * s * 0.12, y - s * 0.14, Math.max(1, s * 0.08), '#f2a444', 0.9);
}
const bez = (a, m, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * k * (1 - k) * m[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * k * (1 - k) * m[1] + k * k * b[1]];
// every perch in the dusk layout, each with the moment its owl arrives
const PERCH = (() => {
  const L = EXT.dusk, out = [];
  for (const wr of L.wires) {
    if (!wr.sky && wr.span !== 1) continue;
    const pts = wr.pts, gap = 46 * wr.s + 12; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc += seg;
      while (acc > gap) { acc -= gap; const k = 1 - acc / seg, x = lerp(pts[i - 1][0], pts[i][0], k), y = lerp(pts[i - 1][1], pts[i][1], k); if (x > -20 && x < W + 20 && y < H) out.push({ x, y, s: 34 * wr.s + 8 }); }
    }
  }
  for (const T of L.towers) { const n = Math.round(T.w / 34); for (let i = 0; i < n; i++) out.push({ x: T.x - T.w * 0.3 + (i / (n - 1)) * T.w * 0.6, y: T.base - T.h - 2, s: 30 * T.s + 10 }); }
  for (const r of L.rows.slice(0, 2)) for (const [a, bx] of r.segs) for (let x = a + 30; x < bx - 20; x += 58 * r.s + 14) if (hash(x) > 0.35) out.push({ x: VX + (x - VX) * 0.98, y: r.base - r.h * 1.2, s: 30 * r.s + 6 });
  return out.map((q, i) => ({ ...q, seed: Math.round(q.x * 3 + q.y), arrive: hash(i * 7.3 + 1) < 0.15 ? -99 : 1 + hash(i * 3.1) * 24, from: [q.x + (hash(i * 5.7) - 0.5) * 1400, -140 - hash(i) * 200] }));
})();
shot('owls.dc', {
  grade: () => ({ tint: '#e8b86a', tintA: 0.26, vig: 0.85 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t;
    // start on a few owls at the pylon, pull back as the wires fill
    applyCam(ctx, drift(t, { x: 640, y: 560, z: 1.32 }, { x: 900, y: 560, z: 1.0 }, 18));
    drawSet(ctx, 'dc', 'dusk');
    const L = EXT.dusk, P = EXT_PAL.dusk, sil = '#3a2414';
    for (const T of L.towers) towerSteam(ctx, t, T, P.steam, 0.5, 7, 0.035);
    // nobody noticed at first: they come in one at a time until every wire is full
    for (const q of PERCH) {
      if (pt >= q.arrive) { owlSil(ctx, q.x, q.y, q.s, t, q.seed, sil); continue; }
      const k = (pt - (q.arrive - 2.4)) / 2.4;
      if (k <= 0) continue;
      const [x, y] = bez(q.from, [(q.from[0] + q.x) / 2, Math.min(q.from[1], q.y) + 40], [q.x, q.y - q.s * 0.5], ease.out(k));
      owlFlap(ctx, x, y, q.s * 0.8, t, q.seed, sil);
    }
    const P0 = L.pylons[0], ay = P0.base - 0.8 * P0.h;
    [[0.1, 70, 1, 3], [0.2, 62, 2, 6], [-0.05, 66, 3, 9]].forEach(([dx, sz, sd, at]) => {
      const home = [P0.x + dx * P0.h, ay], k = clamp((pt - at + 2.6) / 2.6);
      if (k >= 1) owl(ctx, home[0], home[1], { t, s: sz, seed: sd, look: -0.5 });
      else if (k > 0) { const [x, y] = bez([home[0] + 700, -200], [home[0] + 300, ay - 300], [home[0], home[1] - sz * 0.5], ease.out(k)); owlFlap(ctx, x, y, sz * 0.9, t, sd, '#7a5236'); }
    });
    for (let i = 0; i < 5; i++) owlFlier(ctx, t, i, sil, [-120, 120, W + 120, 260]);
    glow(ctx, 700, HZ - 40, 520, '#ffd28a', 0.3);
    aviation(ctx, t, L.reds, 0.8);
  },
});

defineSet('dcnum', (ctx) => {
  ctx.fillStyle = '#10181c'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#1c2a30', { seed: 1, alpha: 0.07, layers: 14 });
  wash(ctx, [[200, 300], [1700, 260], [1760, 820], [160, 860]], '#223640', { seed: 2, alpha: 0.05, layers: 12, v: 0.9 });
  ctx.save(); ctx.strokeStyle = '#2c4148'; for (let i = 0; i < 14; i++) brushDry(ctx, [[-20, 80 + i * 70], [W + 20, 90 + i * 70]], { w: 3, k: 3, alpha: 0.12, seed: i + 5, dry: 0.6 }); ctx.restore();
});
const NUM = { x0: 320, x1: 1600, cw: 24, rh: 30, rows: 17, cx: 960, cy: 530 };
const riverY = (x) => NUM.cy + 26 * Math.sin(((x - NUM.x0) / (NUM.x1 - NUM.x0)) * Math.PI * 2);
const riverHW = (x) => 30 + 230 * Math.pow(Math.sin(clamp((x - NUM.x0) / (NUM.x1 - NUM.x0)) * Math.PI), 0.8);
// how strongly a point sits on the owl face hidden in the numbers, 0 to 1
function owlMask(x, y) {
  const dx = x - NUM.cx, dy = y - NUM.cy;
  let m = 0;
  for (const sd of [-1, 1]) { const d = Math.hypot(dx - sd * 108, dy + 20); m = Math.max(m, clamp(1.25 - Math.abs(d - 82) / 20), d < 36 ? 1 : 0); }
  if (Math.abs(dx) / 30 + Math.abs(dy - 66) / 46 < 1) m = Math.max(m, 0.95);
  for (const sd of [-1, 1]) { const ex = dx - sd * 150, ey = dy + 150; if (ey < 30 && ey > -60 && Math.abs(ex + sd * ey * 0.5) < 26 - (30 - ey) * 0.2) m = Math.max(m, 0.8); }
  const ring = Math.hypot(dx / 1.12, dy); m = Math.max(m, 0.45 * clamp(1 - Math.abs(ring - 215) / 14));
  return m;
}
shot('owls.numbers', {
  grade: () => ({ tint: '#e8b86a', tintA: 0.16, vig: 0.9 }),
  draw(ctx, t, st) {
    applyCam(ctx, drift(t, { x: 960, y: 540, z: 1.0 }, { x: 960, y: 530, z: 1.16 }, 20));
    drawSet(ctx, 'dcnum');
    // the owl surfaces in the pattern slowly, and stays, across both lines
    const face = settle(t, 1, 7), s = t * 34, sh = frac(s / NUM.cw) * NUM.cw, n0 = Math.floor(s / NUM.cw), cols = Math.ceil((NUM.x1 - NUM.x0) / NUM.cw);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const plain = '500 24px "IBM Plex Mono", ui-monospace, Consolas, monospace', bold = '600 26px "IBM Plex Mono", ui-monospace, Consolas, monospace';
    let font = '';
    for (let k = 0; k < cols; k++) {
      const x = NUM.x0 + k * NUM.cw + sh, hw = riverHW(x), yc = riverY(x) + Math.sin(x * 0.012 - t * 0.9) * 5, n = k - n0;
      for (let j = 0; j < NUM.rows; j++) {
        const off = (j - (NUM.rows - 1) / 2) * NUM.rh;
        if (Math.abs(off) > hw) continue;
        const y = yc + off, m = owlMask(x, y) * face, edge = clamp((hw - Math.abs(off)) / 40), endFade = clamp((x - NUM.x0) / 90) * clamp((NUM.x1 - x) / 90);
        const f = m > 0.5 ? bold : plain; if (f !== font) { ctx.font = f; font = f; }
        ctx.fillStyle = m > 0.3 ? mix(PAL.frost, '#f6e2b8', m * 0.7) : PAL.frost;
        ctx.globalAlpha = (0.24 + 0.68 * m) * edge * (0.5 + 0.5 * endFade) + 0.04;
        ctx.fillText(String(Math.floor(hash(n * 13.1 + j * 7.7) * 10)), x, y);
      }
    }
    ctx.restore();
    hearth(ctx, 250, 560, { t, r: 104, seed: 3, look: 0.6, glowA: 0.5, speak: says(st, 'hearth') });
    // Hearth-8 drinks the numbers and grows ear tufts
    const tk = settle(t, 5, 4), r = 104, hx = 1670, cy = 560 + Math.sin(t * 2.1 + 6) * r * 0.06, tone = HEARTH_TONES.warm;
    hearth(ctx, hx, 560, { t, r, seed: 6, look: -0.6, glowA: 0.5, smile: tk < 0.6 });
    if (tk > 0.02) for (const sd of [-1, 1]) {
      const bx = hx + sd * r * 0.62, by = cy - r * 0.6, tip = [lerp(bx, hx + sd * r * 0.95, tk), lerp(by, cy - r * 1.35, tk)];
      const tuft = [[hx + sd * r * 0.45, cy - r * 0.62], tip, [hx + sd * r * 0.85, cy - r * 0.55]];
      ctx.save(); ctx.fillStyle = tone.rim; fillPts(ctx, tuft); ctx.restore(); inkLoop(ctx, tuft, { w: r * 0.05, seed: 7 + sd + boil(t), gaps: 1, alpha: 0.7 });
    }
    if (tk >= 0.6) { const lx = -0.6 * r * 0.2, ey = cy + r * 0.05; ctx.save(); ctx.fillStyle = '#b8742c'; fillPts(ctx, [[hx + lx - r * 0.07, ey + r * 0.14], [hx + lx + r * 0.07, ey + r * 0.14], [hx + lx, ey + r * 0.3]]); ctx.restore(); }
    letter(ctx, 'Hearth-7', 250, 720, { font: '700 36px Caveat, cursive', align: 'center', color: '#f2d7a8', alpha: 0.8 });
    letter(ctx, 'Hearth-8', 1670, 720, { font: '700 36px Caveat, cursive', align: 'center', color: '#f2d7a8', alpha: 0.8 });
  },
});

/* ---------- the owl city ---------- */
const CITY = { vp: [960, 640], towers: [[-40, 340, 90, 1.0], [300, 560, 250, 0.72], [640, 810, 400, 0.46], [1110, 1280, 380, 0.46], [1360, 1620, 230, 0.72], [1580, 1960, 70, 1.0]] };
const OWL_TILES = new Map();
// owls painted once per render scale, then stamped by the thousand
function stampOwl(ctx, i, x, y, s) {
  const key = (i % 4) + '|' + RS.toFixed(3);
  let c = OWL_TILES.get(key);
  if (!c) { c = makeCanvas(62 * RS, 76 * RS); const x2 = c.getContext('2d'); x2.setTransform(RS, 0, 0, RS, 0, 0); owl(x2, 31, 72, { t: 0, s: 60, seed: (i % 4) + 1, tilt: ((i % 4) - 1.5) * 0.1, look: ((i % 4) % 3) - 1 }); OWL_TILES.set(key, c); }
  ctx.drawImage(c, x - s * 0.5, y - s * 1.2, s, s * (76 / 62));
}
defineSet('owlcity', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, '#c98a4a'); g.addColorStop(0.6, '#e8b872'); g.addColorStop(1, '#f6dca6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 720);
  glow(ctx, 960, 560, 700, '#fff0c8', 0.5, 'source-over');
  shape(ctx, circlePts(960, 560, 80, 80, 30), '#fff2d0', { seed: 1, boilAmp: 0.4, inkW: 2, pool: 0.3 });
  const stamp = (x, y, s, i) => stampOwl(ctx, i, x, y, s);
  const r = rng(7);
  // far skyline, every roof and ledge lined with tiny owls
  for (let i = 0; i < 16; i++) {
    const bx = i * 125 - 40 + r() * 40, bw = 70 + r() * 60, top = 380 + r() * 180;
    shape(ctx, rectPts(bx, top, bw, 700 - top), mix('#a8784f', '#f0cc90', 0.45), { seed: 10 + i, boilAmp: 0.4, inkW: 1.6, inkA: 0.5 });
    for (let yy = top + 26; yy < 690; yy += 26) for (let xx = bx + 8; xx < bx + bw - 4; xx += 11) owlSil(ctx, xx, yy, 12, 0, 0, '#7a4e30', false);
  }
  ctx.fillStyle = '#b9a45a'; ctx.fillRect(0, 690, W, H - 690);
  // the highway, now a meadow, running to the horizon
  const [vx, vy] = CITY.vp;
  shape(ctx, [[vx - 50, vy + 50], [vx + 50, vy + 50], [1720, H + 20], [200, H + 20]], '#a89a4e', { seed: 30, boilAmp: 0.4, inkW: 2.6 });
  wash(ctx, [[vx - 40, vy + 55], [vx + 40, vy + 55], [1680, H + 20], [240, H + 20]], '#8f9a4a', { seed: 31, alpha: 0.08, layers: 12 });
  ctx.save(); ctx.fillStyle = '#efe4cf'; for (let k = 0; k < 14; k++) { const u0 = Math.pow(k / 14, 1.8), u1 = u0 + 0.02 + u0 * 0.03, p0 = lerp(vy + 55, H, u0), p1 = lerp(vy + 55, H, Math.min(1, u1)); ctx.globalAlpha = 0.35; fillPts(ctx, [[vx - 2 - u0 * 12, p0], [vx + 2 + u0 * 12, p0], [vx + 2 + u1 * 12, p1], [vx - 2 - u1 * 12, p1]]); } ctx.restore();
  ctx.save(); ctx.strokeStyle = '#6f7a3a';
  for (let i = 0; i < 260; i++) { const u = Math.pow(r(), 0.7), y = lerp(vy + 60, H + 10, u), half = lerp(50, 760, u), x = vx + (r() * 2 - 1) * half, hgt = 6 + u * 30; brushDry(ctx, [[x, y], [x + (r() - 0.5) * 8, y - hgt]], { w: 1.6 + u * 2, k: 2, alpha: 0.5, seed: i, dry: 0.2 }); }
  ctx.restore();
  for (let i = 0; i < 120; i++) { const u = Math.pow(r(), 0.8), y = lerp(vy + 70, H, u), x = vx + (r() * 2 - 1) * lerp(40, 740, u); dot(ctx, x, y - 4, 2 + u * 5, ['#f6ecd6', '#e3b23c', '#d98a7a', '#f2a444'][i % 4], 0.85); }
  for (const sd of [-1, 1]) inkLine(ctx, [[vx + sd * 52, vy + 48], [vx + sd * 840, H + 20]], { w: 4, seed: 40 + sd, color: '#8a5a3b' });
  // office towers turned into roosts
  for (const [x0, x1, top, s] of CITY.towers) {
    const base = 720 + (1 - s) * -30, face = mix('#a0785a', '#e8c88e', (1 - s) * 0.6);
    shape(ctx, rectPts(x0, top, x1 - x0, base - top), face, { seed: 50 + x0, boilAmp: 0.4, inkW: iw(s), shade: { dx: (x0 < 960 ? 1 : -1) * 20, dy: 0, a: 0.12 } });
    const ow = 40 * s, oh = 58 * s;
    for (let yy = top + 34 * s; yy < base - 20; yy += oh) {
      shape(ctx, rectPts(x0 + 4, yy + oh * 0.55, x1 - x0 - 8, 6 * s), mix(face, PAL.ink, 0.25), { seed: 60 + yy + x0, boilAmp: 0.3, inkW: 1.4, gaps: 1 });
      ctx.save(); ctx.fillStyle = '#4a3222'; ctx.globalAlpha = 0.55; for (let xx = x0 + 10 * s; xx < x1 - 10 * s; xx += ow) ctx.fillRect(xx, yy - oh * 0.2, ow * 0.8, oh * 0.72); ctx.restore();
      for (let xx = x0 + 22 * s, k = 0; xx < x1 - 10 * s; xx += ow * 0.5, k++) stamp(xx + (hash(xx + yy) - 0.5) * 6, yy + oh * 0.55, 36 * s, k + Math.floor(yy));
    }
    for (let xx = x0 + 18 * s, k = 0; xx < x1 - 10; xx += 30 * s, k++) stamp(xx, top + 2, 40 * s, k * 3);
  }
  for (let i = 0; i < 30; i++) { const fx = r() * W, fy = 60 + r() * 260, fs = 10 + r() * 10; ctx.save(); ctx.fillStyle = '#6e4630'; ctx.globalAlpha = 0.6; for (const sd of [-1, 1]) fillPts(ctx, [[fx, fy], [fx + sd * fs, fy - fs * 0.4], [fx + sd * fs * 0.6, fy + fs * 0.2]]); ctx.restore(); }
  // a lamp post the owls love
  tube(ctx, [[1560, H + 20], [1560, 520], [1500, 470], [1440, 470]], 16, '#4b4a45', { seed: 70, inkW: 4 });
  shape(ctx, rrectPts(1400, 462, 80, 22, 8), '#3a3431', { seed: 71, inkW: 2.2 });
});
function mouse(ctx, x, y, s, f, t, seed) {
  const b = boil(t);
  inkLine(ctx, [[x - f * s * 0.6, y - s * 0.1], [x - f * s * 1.2, y - s * 0.3 + Math.sin(t * 6 + seed) * s * 0.15], [x - f * s * 1.6, y - s * 0.1]], { w: 2, seed, color: '#6b5a4a' });
  shape(ctx, circlePts(x, y - s * 0.3, s * 0.7, s * 0.4, 14), '#9a8a78', { seed: seed + 1, b, inkW: 1.8, pool: 0.4 });
  shape(ctx, circlePts(x + f * s * 0.5, y - s * 0.58, s * 0.22, s * 0.22, 10), '#c9a89a', { seed: seed + 2, b, inkW: 1.4, gaps: 1 });
  dot(ctx, x + f * s * 0.7, y - s * 0.38, Math.max(1.2, s * 0.08), PAL.ink);
}
const RAIL = (sd, u) => [CITY.vp[0] + sd * lerp(52, 840, u), lerp(CITY.vp[1] + 48, H + 20, u)];
function owlFly(ctx, x, y, s, t, i) {
  const flap = Math.sin(t * 8 + i * 2), b = boil(t);
  ctx.save(); ctx.fillStyle = '#7a5236'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
  for (const sd of [-1, 1]) { const w = wobble([[x + sd * s * 0.15, y - s * 0.1], [x + sd * s * 1.3, y - s * 0.35 - flap * s * 0.6], [x + sd * s * 0.8, y + s * 0.15]], 0.6, i + b); ctx.beginPath(); tracePath(ctx, w); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.32, s * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ecd9b0'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.1, s * 0.18, s * 0.22, 0, 0, TAU); ctx.fill(); ctx.restore();
  for (const sd of [-1, 1]) { dot(ctx, x + sd * s * 0.13, y - s * 0.18, s * 0.1, '#f2a444'); dot(ctx, x + sd * s * 0.13, y - s * 0.18, s * 0.05, PAL.ink); }
}
shot('owls.city', {
  grade: () => ({ tint: '#e8b86a', tintA: 0.28, vig: 0.8 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, late = laterBeat(t, st);
    // start high on the roosts, pull back to the meadow and the people in it
    applyCam(ctx, drift(t, { x: 960, y: 400, z: 1.3 }, { x: 960, y: 540, z: 1.0 }, 16));
    drawSet(ctx, 'owlcity');
    for (let i = 0; i < 6; i++) owlFlier(ctx, t, i + 20, '#6e4630', [-150, 80, W + 150, 200]);
    for (const [x, y, s, sd] of [[190, 330, 66, 1], [470, 552, 50, 2], [1450, 548, 50, 3], [1760, 330, 66, 4]]) owl(ctx, x, y, { t, s, seed: sd, look: x < 960 ? 0.6 : -0.6 });
    // a flock lifts off one guard rail, crosses over everyone's heads, and lands on the other
    const cyc = pt % 20, dir = Math.floor(pt / 20) % 2 ? -1 : 1;
    let fx = 0, fn = 0;
    const flock = [];
    for (let i = 0; i < 10; i++) {
      const u = 0.3 + i * 0.055, a = RAIL(-dir, u), bb = RAIL(dir, u), sz = lerp(26, 64, (u - 0.3) / 0.5), k = settle(cyc, 1 + i * 0.35, 4.2);
      if (k <= 0 || k >= 1) { const q = k <= 0 ? a : bb; flock.push([q[1], () => stampOwl(ctx, i, q[0], q[1], sz)]); fx += q[0]; }
      else { const q = bez(a, [CITY.vp[0] + (hash(i) - 0.5) * 400, 160 + i * 16], bb, ease.inOut(k)); flock.push([q[1], () => owlFly(ctx, q[0], q[1] - sz * 0.6, sz * 0.9, t, i)]); fx += q[0]; }
      fn++;
    }
    fx /= fn;
    // mice run the meadow lanes, some behind the people and some in front
    const [vx, vy] = CITY.vp, mice = [];
    for (let i = 0; i < 7; i++) {
      const u = 0.5 + hash(i) * 0.46, y = lerp(vy + 60, H - 10, u), half = lerp(50, 760, u) * 0.9, d = i % 2 ? 1 : -1, ph = frac(t * (0.05 + hash(i + 3) * 0.06) + hash(i + 9));
      mice.push([y, () => mouse(ctx, vx + d * (ph * 2 - 1) * half, y - Math.abs(Math.sin(t * 14 + i)) * 3, 14 + u * 16, d, t * 3, 700 + i * 5)]);
    }
    const folks = [[640, 1010, 1, 'o', 'shrug'], [820, 1045, 1, 'o', 'down'], [1150, 1030, -1, 'wide', 'point'], [1330, 1010, -1, 'o', 'chin']];
    const people = folks.map(([x, y, f, mood, arms], i) => [y, () => person(ctx, { who: crowdStyle(60 + i * 9), x, y, h: 390, f, arms: arms === 'point' ? [[2.7, 0.2], [0.05, 0.1]] : arms, mood, t, seed: 40 + i, tilt: (f > 0 ? -1 : 1) * 0.18, look: clamp((fx - x) / 500, -1, 1) })]);
    flock.concat(mice, people).sort((p, q) => p[0] - q[0]).forEach(([, f]) => f());
    for (const [qx, qy, k] of [[700, 610, 0], [1240, 600, 1.3]]) { const px = qx + Math.sin(t * 0.8 + k) * 4, py = qy + Math.sin(t * 1.1 + k) * 6; letter(ctx, '?', px + 3, py + 3, { font: '700 84px Caveat, cursive', align: 'center', color: '#2b211c', alpha: 0.7 }); letter(ctx, '?', px, py, { font: '700 84px Caveat, cursive', align: 'center', color: '#fff3d6', alpha: 0.95 }); }
    // looked after: the lamp-post owl brings the flightless owls a mouse, again and again
    const u = late ? frac(pt / 6) : 0.95, gifts = late ? Math.min(4, 1 + Math.floor(pt / 6)) : 0, lamp = [1450, 462], drop = [1060, 1040];
    let op = lamp, carry = false;
    if (u < 0.4) { op = arc(lamp, drop, ease.inOut(u / 0.4), -120); carry = true; }
    else if (u < 0.5) op = drop;
    else if (u < 0.9) op = arc(drop, lamp, ease.inOut((u - 0.5) / 0.4), -120);
    for (let i = 0; i < gifts - (late && u < 0.45 ? 1 : 0); i++) mouse(ctx, 930 + i * 44, 1050, 18, 1, 0, 800 + i * 3);
    if (carry) mouse(ctx, op[0], op[1] + 10, 16, 1, t * 3, 820);
    owl(ctx, op[0], op[1], { t, s: 96, seed: 5, look: -1, tilt: 0.25 + Math.sin(t * 0.8) * 0.1 });
  },
});

/* ---------- the Sharp Morning: paper boats, and the stars ---------- */
defineSet('river', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#0e161a'); g.addColorStop(1, '#2a3d44');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 380);
  const r = rng(3);
  for (let i = 0; i < 180; i++) dot(ctx, r() * W, r() * 300, 0.6 + r() * 1.3, '#f6ecd0', 0.3 + r() * 0.5);
  paintMoon(ctx, 1480, 210, 40);
  wash(ctx, [[-40, 380], [-40, 320], [300, 300], [700, 330], [1100, 296], [1500, 322], [1960, 300], [1960, 380]], '#141e22', { seed: 5, alpha: 0.5, layers: 10, v: 0.4 });
  for (let i = 0; i < 22; i++) { const x = i * 92 + r() * 40, h = 30 + r() * 50; shape(ctx, blobPoly(x, 340 - h * 0.4, 40 + r() * 20, h * 0.6, 9, r, 0.25), '#18252a', { seed: 10 + i, inkW: 1.8, pool: 0.4 }); }
  const wg = ctx.createLinearGradient(0, 370, 0, H); wg.addColorStop(0, '#2c4148'); wg.addColorStop(0.3, '#1f2e35'); wg.addColorStop(1, '#101a1f');
  ctx.fillStyle = wg; ctx.fillRect(0, 370, W, H - 370);
  wash(ctx, rectPts(-40, 380, W + 80, 720), '#2c4148', { seed: 6, alpha: 0.05, layers: 12 });
  ctx.save(); ctx.strokeStyle = '#4a6a6a';
  for (let i = 0; i < 40; i++) { const k = i / 40, y = 385 + k * k * 700, x = r() * W; brushDry(ctx, [[x - 60 - k * 200, y], [x + 60 + k * 200, y + (r() - 0.5) * 4]], { w: 2 + k * 5, k: 2, alpha: 0.18, seed: i + 30, dry: 0.5 }); }
  ctx.restore();
  for (const [x0, sd] of [[0, 1], [W, -1]]) for (let i = 0; i < 16; i++) { const x = x0 + sd * (i * 16 + r() * 20), h = 120 + r() * 160; inkLine(ctx, [[x, H + 10], [x + sd * (10 + r() * 30), H - h]], { w: 5, seed: i + x0, color: '#1a2a24' }); }
});
function paperBoat(ctx, x, y, s, t, seed, lit) {
  const b = boil(t), c = lit ? '#fbf3e2' : '#c8c6bc';
  shape(ctx, [[x - s, y - s * 0.12], [x + s, y - s * 0.12], [x + s * 0.66, y + s * 0.3], [x - s * 0.66, y + s * 0.3]], c, { seed, b, inkW: 2.2, pool: 0.4, boilAmp: 0.6 });
  shape(ctx, [[x - s * 0.5, y - s * 0.12], [x, y - s * 0.95], [x + s * 0.5, y - s * 0.12]], mix(c, '#e9dcc0', 0.5), { seed: seed + 1, b, inkW: 2, pool: 0.4, boilAmp: 0.6 });
  inkLine(ctx, [[x, y - s * 0.9], [x, y - s * 0.14]], { w: 1.4, seed: seed + 2, alpha: 0.5 });
}
function woodBoat(ctx, x, y, s, t, seed) {
  const b = boil(t);
  shape(ctx, catmull([[x - s * 1.15, y - s * 0.22], [x - s * 0.8, y + s * 0.28], [x + s * 0.8, y + s * 0.28], [x + s * 1.2, y - s * 0.26], [x, y - s * 0.08]], 5, true), '#c98a4a', { seed, b, inkW: 2.4, shade: { dx: 0, dy: s * 0.14, a: 0.3 } });
  ctx.save(); ctx.strokeStyle = '#8a5a3b'; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - s * 0.9, y + s * 0.06); ctx.lineTo(x + s * 0.95, y + s * 0.04); ctx.stroke(); ctx.restore();
  shape(ctx, rectPts(x - s * 0.1, y - s * 0.2, s * 0.35, s * 0.1), '#8a5a3b', { seed: seed + 1, b, inkW: 1.6 });
  inkLine(ctx, [[x + s * 0.1, y - s * 0.15], [x + s * 0.12, y - s * 1.1]], { w: 3, seed: seed + 2, color: '#5e3b27' });
}
function ripple(ctx, x, y, s, t, c, a) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) { const ph = frac(t * 0.3 + k * 0.5); ctx.globalAlpha = a * (1 - ph); ctx.beginPath(); ctx.ellipse(x, y, s * (1.2 + ph * 1.2), s * (0.18 + ph * 0.14), 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
const WOODS = [[250, 600, 70], [500, 470, 44], [1300, 470, 46], [1500, 650, 80], [1740, 540, 58], [1250, 920, 104], [380, 900, 96]];
const PAPERS = [[-200, -50, 42], [-60, -104, 36], [190, -40, 42], [250, 56, 48], [-250, 50, 46], [40, 96, 44]];
shot('sharp.boats', {
  grade: () => ({ sat: 0.7, tint: '#f2dcc0', tintA: 0.18, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, lift = settle(pt, 1.5, 6);
    const cam = drift(t, { x: 860, y: 620, z: 1.1 }, { x: 820, y: 580, z: 1.3 }, 18);
    applyCam(ctx, cam);
    drawSet(ctx, 'river');
    for (let i = 0; i < 18; i++) { const y = 400 + i * 20 + Math.sin(t + i) * 3, w = 20 + hash(i) * 40; ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.5 + i * 2); ctx.fillStyle = '#f6ecd0'; ctx.fillRect(1480 - w / 2 + Math.sin(t * 0.8 + i) * 12, y, w, 3); ctx.restore(); }
    // the wooden boats are left to drift off into the dark
    WOODS.forEach(([x, y, s], i) => { const dx = x + (x < 900 ? -1 : 1) * (100 + hash(i) * 90) * settle(pt, 0.5, 25) + Math.sin(t * 0.3 + i) * 6, dy = y + Math.sin(t * 1.1 + i * 2) * 3; ripple(ctx, dx, dy + s * 0.28, s, t + i, '#4a6a6a', 0.35); woodBoat(ctx, dx, dy, s, t, 900 + i * 7); });
    const hx = 760 + Math.min(t, 90) * 1.6, hy = 690 + Math.sin(t * 0.9) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.14 + 0.08 * lift; ctx.fillStyle = '#ffb85a'; ctx.beginPath(); ctx.ellipse(hx, hy + 24, 420, 120, 0, 0, TAU); ctx.fill(); ctx.restore();
    // it lifts only the paper boats, gently, into its light
    const boats = PAPERS.map(([dx, dy, s], i) => { const up = lift * (80 + hash(i) * 70); return [hx + dx * (1 - lift * 0.25) + Math.sin(t * 0.5 + i) * 6, hy + dy - up + Math.sin(t * 1.2 + i * 1.7) * (3 + lift * 5), s, i, up]; });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [bx, by, s, i] of boats) { ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t * 1.3 + i); ctx.beginPath(); ctx.moveTo(hx, hy + 10); ctx.quadraticCurveTo((hx + bx) / 2, by + 34, bx, by + s * 0.2); ctx.stroke(); }
    ctx.restore();
    boats.sort((a, b) => a[1] - b[1]).forEach(([bx, by, s, i, up]) => { ripple(ctx, bx, by + up + s * 0.3, s, t + i, '#ffd9a0', 0.4 * (1 - lift * 0.7)); paperBoat(ctx, bx, by, s, t, 950 + i * 5, true); if (up > 10) glow(ctx, bx, by, s * 2, '#ffd9a0', 0.25); });
    hearth(ctx, hx, hy, { t, r: 70, seed: 9, look: -0.2 - 0.3 * lift, glowA: 0.6 });
    ctx.save(); ctx.globalAlpha = 0.25; ctx.translate(hx, hy + 110); ctx.scale(1, -0.5); glow(ctx, 0, 0, 120, '#ffb85a', 0.8); ctx.restore();
    lightMask(ctx, 'rgba(6,12,16,0.46)', [{ x: hx, y: hy - 60 * lift, r: 680, a: 0.95 }, { x: 1480, y: 420, r: 300, a: 0.6 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, hx, hy - 20 - 40 * lift, 300 + 80 * lift, '#ffb85a', 0.35);
  },
});

const ORB = { cx: 960, cy: 2260, R: 1570 };
const limbY = (x) => ORB.cy - Math.sqrt(Math.max(0, ORB.R * ORB.R - (x - ORB.cx) * (x - ORB.cx)));
defineSet('orbit', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0c0b'); g.addColorStop(0.6, '#1a1714'); g.addColorStop(1, '#2e2822');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng(5);
  for (let i = 0; i < 8; i++) { const u = i / 7; glow(ctx, lerp(100, 1300, u), lerp(640, 0, u), 240 + hash(i) * 120, '#5a4e44', 0.12, 'source-over'); }
  for (let i = 0; i < 600; i++) dot(ctx, r() * W, r() * 900, r() < 0.05 ? 1.6 + r() : 0.5 + r() * 0.9, '#f6ecd6', 0.25 + r() * 0.6);
  const { cx, cy, R } = ORB;
  { const ag = ctx.createRadialGradient(cx, cy, R - 10, cx, cy, R + 120); ag.addColorStop(0, 'rgba(247,217,184,0.55)'); ag.addColorStop(0.25, 'rgba(247,217,184,0.18)'); ag.addColorStop(1, 'rgba(247,217,184,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R + 120, 0, TAU); ctx.fill(); }
  shape(ctx, circlePts(cx, cy, R, R, 180), '#e6d6bd', { seed: 3, boilAmp: 0.5, inkW: 3, pool: 0.4 });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, TAU); ctx.clip();
  wash(ctx, circlePts(cx, cy, R, R, 40), '#d9c6a8', { seed: 4, alpha: 0.06, layers: 12 });
  // city blocks of pale buildings and dark solar fields, crowding toward the limb
  for (let row = 0; row < 40; row++) {
    if (row % 5 === 4) continue;
    const u = row / 40, dy = 6 + Math.pow(u, 1.7) * 440, sz = 3 + u * 28;
    let x = -60 + r() * sz, n = 0;
    while (x < W + 60) {
      const bw = sz * (0.6 + r() * 1.1), yy = limbY(x) + dy;
      if (yy > H + 20) { x += bw + sz * 0.3; continue; }
      const solar = noise2(x * 0.0035 + 5, row * 0.22) > 0.22;
      if (solar) {
        ctx.fillStyle = '#56606a'; ctx.globalAlpha = 0.85; ctx.fillRect(x, yy - sz * 0.3, bw + sz * 0.3, sz * 0.5);
        ctx.fillStyle = '#c8d6d2'; ctx.globalAlpha = 0.35; for (let gx = x; gx < x + bw; gx += Math.max(2, sz * 0.35)) ctx.fillRect(gx, yy - sz * 0.3, Math.max(0.5, sz * 0.04), sz * 0.5);
      } else {
        const bh = sz * (0.5 + r() * 0.9);
        ctx.fillStyle = ['#f4ead8', '#ece0ca', '#f8f0e2', '#e6d6bc'][Math.floor(r() * 4)]; ctx.globalAlpha = 0.95; ctx.fillRect(x, yy - bh, bw, bh);
        ctx.fillStyle = '#b39c80'; ctx.globalAlpha = 0.55; ctx.fillRect(x + bw, yy - bh * 0.85, sz * 0.22, bh * 0.85);
        if (sz > 16) { ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.strokeRect(x, yy - bh, bw, bh); }
      }
      x += bw + sz * (++n % 6 === 0 ? 1.6 : 0.3);
    }
  }
  const sg = ctx.createLinearGradient(0, 700, 0, H); sg.addColorStop(0, 'rgba(40,30,22,0)'); sg.addColorStop(1, 'rgba(40,30,22,0.35)');
  ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.fillRect(0, 600, W, H - 600);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#a8927a';
  for (let i = 0; i < 9; i++) { const x0 = r() * W; brushDry(ctx, [[x0, limbY(x0) + 10], [x0 + (r() - 0.5) * 900, H + 40]], { w: 3, k: 2, alpha: 0.35, seed: 60 + i, dry: 0.4 }); }
  ctx.restore();
  glow(ctx, 1640, limbY(1640) - 10, 380, '#fff0d6', 0.35, 'source-over');
});
const STREAMS = [[330, 0.6], [620, 0.2], [860, -0.1], [1080, 0.3], [1310, 0.5], [1560, 0.9], [1760, 1.2]];
const streamEnd = (i) => [120 + i * 270 + hash(i * 9) * 120, 60 + hash(i * 4 + 1) * 150];
shot('sharp.stars', {
  grade: () => ({ sat: 0.6, tint: '#f2dcc0', tintA: 0.3, vig: 0.85 }),
  draw(ctx, t, st) {
    // tilt up from the quiet surface, following them out
    applyCam(ctx, drift(t, { x: 960, y: 760, z: 1.35 }, { x: 960, y: 480, z: 1.0 }, 16));
    drawSet(ctx, 'orbit');
    twinkle(ctx, t * 0.5, 40, 640);
    // the copies leave in long slow rivers, thickening, each one ending in a star
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    STREAMS.forEach(([sx, bend], i) => {
      const y0 = limbY(sx) + 30, [ex, ey] = streamEnd(i);
      for (let j = 0; j < 48; j++) {
        const ph = frac(t * 0.03 + hash(i * 50 + j * 1.3));
        if (j >= 24 && t - ph / 0.03 < (j - 24) * 0.3) continue;
        const k = ph, spread = (hash(j * 3.7 + i) - 0.5) * 120 * k + Math.sin(t * 0.3 + j) * 8 * k;
        const x = (1 - k) * (1 - k) * sx + 2 * k * (1 - k) * (sx + 80 * bend) + k * k * ex + spread, y = (1 - k) * (1 - k) * y0 + 2 * k * (1 - k) * (y0 - 460) + k * k * ey + spread * 0.3;
        const a = Math.min(1, ph * 8) * Math.pow(1 - ph, 0.7), rr = (1.2 + hash(j * 5.1 + i) * 2.8) * (1 - ph * 0.6);
        ctx.globalAlpha = a * 0.22; ctx.fillStyle = '#ffb85a'; ctx.beginPath(); ctx.arc(x, y, rr * 3.2, 0, TAU); ctx.fill();
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 0.9 * (0.7 + 0.3 * Math.sin(t * 0.9 + i * 2)); ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, TAU); ctx.fill();
    });
    ctx.restore();
    STREAMS.forEach((q, i) => { const [ex, ey] = streamEnd(i); glow(ctx, ex, ey, 26, '#fff0d0', 0.5); });
    // a few of them close enough to see their faces, looking up as they go
    for (const [i, j] of [[1, 0.1], [3, 0.04], [5, 0.16]]) {
      const [sx, bend] = STREAMS[i], y0 = limbY(sx) + 30, k = j + Math.min(t, 90) * 0.003, [ex, ey] = streamEnd(i);
      const [x, y] = bez([sx, y0], [sx + 80 * bend, y0 - 460], [ex, ey], k);
      hearth(ctx, x, y, { t, r: 14, seed: 30 + i, look: bend > 0.3 ? 0.6 : 0, glowA: 0.45 });
    }
  },
});

})();
