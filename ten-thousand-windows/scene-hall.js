/* The church basement (February 2027, and two 2032 endings), the walk home in the snow,
   and the Senate hearing with its three roads out.
   The meeting sits in a circle of folding chairs: backs to us in front, faces across the ring. */
'use strict';
(() => {

const HB = {
  ceilY: 140, wallY: 565, railY: 420, vpY: 420,
  door: { x: 14, y: 205, w: 118, h: 360 },
  board: { x: 160, y: 236, w: 380, h: 214 },
  banner: { x: 560, y: 168, w: 860, h: 86 },
  win: { x: 1560, y: 166, w: 220, h: 100 },
  table: { x: 1190, y: 606, w: 370, top: 484 },
  urn: { x: 1290 },
  fix: [420, 960, 1500],
  ring: { cx: 960, cy: 832 },
  aldana: { x: 1100, y: 676 },
};
const hAt = (y) => lerp(330, 600, (y - 600) / 404);
const says = (st, name) => st.who === name || st.p.speak === name || (st.p.speak === true && st.who == null);
const wrenAge = (st) => clamp(st.wren ?? 9, 8, 14);
const choseCh1 = (st) => (st.c && st.c.ch1) || st.p.ch1;
// a ceiling point: X is where it meets the wall line, y is its depth on screen
const ceilPt = (X, y) => [960 + (X - 960) * (HB.vpY - y) / (HB.vpY - HB.ceilY), y];
const floorPt = (X, y) => [960 + (X - 960) * (y - HB.vpY) / (HB.wallY - HB.vpY), y];
const COATS = ['#5a6b78', '#6e5a48', '#3c3a36', '#8a4a2a', '#4f6b5a', '#7a3b3b', '#57604a', '#8a6a44'];

/* ---------- seats: two rings of folding chairs ---------- */
const SEATS = (() => {
  const out = [], rings = [{ rx: 610, ry: 172, n: 22, off: 0.094, ring: 0 }, { rx: 800, ry: 222, n: 28, off: 0.05, ring: 1 }];
  for (const R of rings) for (let k = 0; k < R.n; k++) {
    const a = R.off + (k / R.n) * TAU, c = Math.cos(a), s = Math.sin(a);
    let x = HB.ring.cx + R.rx * c, y = HB.ring.cy + R.ry * s;
    if (R.ring === 1 && s > 0.12) continue;
    if (R.ring === 1 && s < 0 && x > 930 && x < 1625) continue; // Mr. Aldana and the coffee table stand here
    if (R.ring === 1 && x < 560 && s > -0.5) continue;
    if (R.ring === 0 && k === 17) continue; // Mr. Aldana's spot at the head of the circle
    const kind = s > 0.55 ? 'back' : s < -0.5 ? 'front' : 'side';
    const f = kind === 'back' ? 0 : kind === 'front' && Math.abs(c) < 0.45 ? 0 : c < 0 ? 1 : -1;
    const id = R.ring * 100 + k;
    let role = null;
    if (R.ring === 0 && k === 15) role = 'mara';
    if (R.ring === 0 && k === 14) { role = 'wren'; x = 648; y = 684; }
    const empty = (R.ring === 0 && (k === 3 || k === 4)) || (role == null && hash(id * 3.1 + 0.4) < 0.07);
    out.push({ x, y, h: hAt(y), kind, f, ring: R.ring, k, id, role, empty, coat: hash(id * 5.7) < 0.6 ? COATS[Math.floor(hash(id * 2.9) * COATS.length)] : null, cup: hash(id * 2.3 + 1) < 0.22 });
  }
  return out;
})();
const MARA = SEATS.find((s) => s.role === 'mara'), WREN = SEATS.find((s) => s.role === 'wren');
// people standing along the back wall
const STANDERS = [
  { x: 150, y: 612, f: 1, seed: 501 }, { x: 262, y: 606, f: 1, seed: 502, arms: 'mug' }, { x: 560, y: 602, f: 1, seed: 506 },
  { x: 720, y: 598, f: 1, seed: 507, arms: 'mug' }, { x: 880, y: 598, f: 0, seed: 508 },
  { x: 1640, y: 612, f: -1, seed: 504, arms: 'mug' }, { x: 1760, y: 618, f: -1, seed: 505 }, { x: 1860, y: 626, f: -1, seed: 509 },
];

/* ---------- small helpers ---------- */
function cup(ctx, x, y, s, t, o = {}) {
  const b = boil(t);
  shape(ctx, [[x - 11 * s, y - 30 * s], [x + 11 * s, y - 30 * s], [x + 8 * s, y], [x - 8 * s, y]], '#f4efe4', { seed: o.seed ?? 3, b, inkW: 1.6, gaps: 1, pool: 0.3 });
  ctx.save(); ctx.fillStyle = o.band ?? '#a0523c'; ctx.globalAlpha = 0.8; ctx.fillRect(x - 10 * s, y - 20 * s, 20 * s, 7 * s); ctx.restore();
  if (o.steam !== false) steam(ctx, x, y - 34 * s, t + (o.seed ?? 0), s * 0.6, 1);
}
function crayonLine(ctx, pts, c, w, prog = 1) {
  if (prog <= 0) return;
  const n = Math.max(2, Math.round(pts.length * clamp(prog)));
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9;
  ctx.beginPath(); tracePath(ctx, pts.slice(0, n), false); ctx.stroke(); ctx.restore();
}
// a phone held up to film, screen toward us, with a tiny Mara on it
function phone(ctx, x, y, s, t, seed, o = {}) {
  const b = boil(t), w = 34 * s, h = 58 * s, rot = o.rot ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rrectPts(-w / 2, -h / 2, w, h, 6 * s), '#2f3438', { seed, b, inkW: 2, gaps: 1, pool: 0.3 });
  if (o.back) { dot(ctx, -w * 0.22, -h * 0.34, 3 * s, '#fff6d8', 0.9); ctx.restore(); glow(ctx, x, y, 60 * s, '#fff6d8', 0.25); return; }
  ctx.fillStyle = '#e4f1ec'; fillPts(ctx, rrectPts(-w / 2 + 3 * s, -h / 2 + 3 * s, w - 6 * s, h - 6 * s, 3 * s));
  ctx.fillStyle = '#c9ddd6'; ctx.fillRect(-w / 2 + 3 * s, h * 0.1, w - 6 * s, h * 0.37);
  ctx.fillStyle = '#b5552f'; fillPts(ctx, rrectPts(-5 * s, -h * 0.08, 10 * s, 20 * s, 3 * s));
  dot(ctx, 0, -h * 0.17, 5 * s, '#2e211d', 1);
  dot(ctx, -w * 0.3, -h * 0.38, 2.4 * s, '#e8403a', 0.6 + 0.4 * Math.sin(t * 4 + seed));
  ctx.restore();
  glow(ctx, x, y, 90 * s, PAL.frost, 0.3);
}

function hairBehind(ctx, st, hx, hy, hr, h, shY, seed, b) {
  const c = st.hairC, P = (pts) => pts.map(([u, v]) => [hx + u * hr, hy + v * hr]);
  const cover = (k) => shape(ctx, catmull(P([[-1.07, 0.18], [-1.0, -0.5], [-0.62, -0.98], [0, -1.1], [0.62, -0.98], [1.0, -0.5], [1.07, 0.18], [0.72, 0.42 * k], [0, 0.56 * k], [-0.72, 0.42 * k]]), 5, true), c, { seed: seed + 60, b, gaps: 3 });
  const hs = st.hair;
  if (hs === 'bob') shape(ctx, catmull(P([[-1.14, 0.92], [-1.17, -0.2], [-0.72, -1.04], [0, -1.16], [0.72, -1.04], [1.17, -0.2], [1.14, 0.92], [0, 1.0]]), 5, true), c, { seed: seed + 60, b, gaps: 3 });
  else if (hs === 'long') { const L = (shY + 0.18 * h - hy) / hr; shape(ctx, catmull(P([[-1.12, L], [-1.18, -0.2], [-0.72, -1.04], [0, -1.16], [0.72, -1.04], [1.18, -0.2], [1.12, L], [0, L + 0.15]]), 5, true), c, { seed: seed + 60, b, gaps: 3 }); }
  else if (hs === 'bald') shape(ctx, catmull(P([[-1.0, 0.02], [-0.55, 0.5], [0, 0.62], [0.55, 0.5], [1.0, 0.02], [0.5, 0.26], [0, 0.34], [-0.5, 0.26]]), 4, true), c, { seed: seed + 60, b, gaps: 2 });
  else if (hs === 'curly') { cover(1); for (let i = 0; i < 11; i++) { const a = Math.PI * (0.95 + i * 0.11); shape(ctx, circlePts(hx + Math.cos(a) * hr * 0.95, hy + Math.sin(a) * hr * 0.9, hr * 0.33, hr * 0.31, 12), c, { seed: seed + 70 + i, b, inkW: 2, pool: 0.5 }); } }
  else if (hs === 'cap') { cover(0.9); shape(ctx, catmull(P([[-1.1, -0.1], [-0.92, -0.88], [0, -1.18], [0.92, -0.88], [1.1, -0.1], [0, -0.02]]), 5, true), st.capC, { seed: seed + 65, b }); dot(ctx, hx, hy - hr * 0.2, hr * 0.12, mix(st.capC, PAL.ink, 0.3), 0.8); }
  else if (hs === 'bunches') { cover(1); for (const s of [-1, 1]) { shape(ctx, circlePts(hx + s * hr * 1.08, hy + hr * 0.1, hr * 0.42, hr * 0.46, 16), c, { seed: seed + 61 + s, b }); dot(ctx, hx + s * hr * 0.78, hy, hr * 0.13, st.band ?? '#c0452f', 0.95); } }
  else { cover(hs === 'bun' ? 1.1 : 1); if (hs === 'bun') shape(ctx, circlePts(hx, hy - hr * 0.95, hr * 0.42, hr * 0.38, 16), c, { seed: seed + 66, b }); }
}
// geometry shared by the baked body and any arm drawn live on top of it
function backGeom(o) {
  const st = typeof o.who === 'string' ? STYLE[o.who] : o.who;
  const t = o.t ?? 0, seed = o.seed ?? 11, b = boil(t);
  const kid = !!st.kid, grow = kid ? clamp(((o.age ?? 8) - 8) / 6) : 0;
  let h = (o.h ?? 380) * (st.tall ?? 1); if (kid) h *= lerp(0.6, 0.9, grow);
  const sit = (o.pose ?? 'sit') === 'sit', x = o.x, y0 = o.y;
  const hipY = sit ? y0 - (o.seatH ?? 0.27) * h : y0 - (kid ? lerp(0.34, 0.41, grow) : 0.42) * h;
  const shY = hipY - (kid ? 0.28 : 0.3) * h - Math.sin(t * 1.7 + seed) * 0.004 * h;
  const hr = (kid ? lerp(0.155, 0.125, grow) : 0.117) * h;
  const hx = x + (o.turn ?? 0) * hr * 0.3, hy = shY - (kid ? 0.15 : 0.135) * h;
  const wide = (st.wide ?? 1) * (st.thin ?? 1);
  return { st, t, seed, b, kid, sit, x, y0, h, hipY, shY, hr, hx, hy, wide, sw: 0.25 * h * wide, hw: 0.285 * h * wide, top: o.top ?? st.top, armW: 0.062 * h };
}
// one arm from behind: hanging at k=0, raised beside the head at k=1, holding a phone or a note
function backArm(ctx, g, s, k, hold = 'phone') {
  const { x, shY, hipY, h, sw, hx, hy, hr, t, seed, b, top, armW, st } = g;
  const sh = [x + s * sw * 0.42, shY + 0.04 * h];
  if (k <= 0) { tube(ctx, [sh, [x + s * sw * 0.56, shY + 0.16 * h], [x + s * sw * 0.5, hipY - 0.03 * h]], armW, mix(top, PAL.ink, 0.12), { seed: seed + 40 + s, b }); return null; }
  const e = ease.inOut(clamp(k)), bob = Math.sin(t * 1.3 + seed) * hr * 0.06;
  const up = hold === 'note' ? [hx + s * hr * 0.9, hy - hr * 2.2] : [hx + s * hr * 1.45, hy - hr * 1.0 + bob];
  const el = [lerp(x + s * sw * 0.56, x + s * sw * 0.86, e), lerp(shY + 0.16 * h, shY - 0.03 * h, e)];
  const hd = [lerp(x + s * sw * 0.5, up[0], e), lerp(hipY - 0.03 * h, up[1], e)];
  tube(ctx, [[x + s * sw * 0.4, shY + 0.03 * h], el, hd], armW, top, { seed: seed + 41, b });
  if (hold === 'phone' && k > 0.35) phone(ctx, hd[0] - s * hr * 0.1, hd[1] - hr * 0.5, h * 0.0027, t, seed + 9, { rot: -s * 0.08 });
  shape(ctx, circlePts(hd[0], hd[1], 0.032 * h, 0.03 * h, 14), st.skin, { seed: seed + 45, b, inkW: 2.2, pool: 0.5 });
  return hd;
}
// a figure seen from behind: the cast only draws faces, and the front rows need backs
function backFig(ctx, o) {
  const g = backGeom(o), { st, seed, b, sit, x, y0, h, hipY, shY, hr, hx, hy, wide, sw, hw, top } = g;
  if (!sit) for (const s of [-1, 1]) {
    tube(ctx, [[x + s * hw * 0.22, hipY], [x + s * hw * 0.24, lerp(hipY, y0, 0.5)], [x + s * hw * 0.24, y0 - 0.03 * h]], 0.075 * h * wide, st.pants, { seed: seed + 20 + s, b });
    shape(ctx, circlePts(x + s * hw * 0.24, y0 - 0.018 * h, 0.045 * h, 0.024 * h, 14), st.shoes, { seed: seed + 22 + s, b, inkW: 2.2 });
  }
  for (const s of [-1, 1]) if (o.phone !== s && o.liveArm !== s) backArm(ctx, g, s, 0);
  const torso = [[x - sw * 0.5, shY + 0.02 * h], [x, shY - 0.012 * h], [x + sw * 0.5, shY + 0.02 * h], [x + hw * 0.54, lerp(shY, hipY, 0.55)], [x + hw * 0.5, hipY + 0.035 * h], [x, hipY + 0.05 * h], [x - hw * 0.5, hipY + 0.035 * h], [x - hw * 0.54, lerp(shY, hipY, 0.55)]];
  shape(ctx, catmull(torso, 5, true), top, { seed: seed + 50, b, shade: { dx: 0.03 * h, dy: 0, a: 0.14 } });
  inkLine(ctx, [[x, shY + 0.05 * h], [x + 0.004 * h, hipY - 0.01 * h]], { w: 1.8, alpha: 0.25, seed: seed + 1 });
  shape(ctx, rectPts(hx - hr * 0.34, hy + hr * 0.5, hr * 0.68, shY - hy - hr * 0.42), st.skin, { seed: seed + 2, b, inkW: 2, pool: 0.4 });
  shape(ctx, catmull([[x - sw * 0.27, shY + 0.008 * h], [x, shY - 0.024 * h], [x + sw * 0.27, shY + 0.008 * h], [x, shY + 0.032 * h]], 4, true), mix(top, PAL.ink, 0.22), { seed: seed + 3, b, inkW: 2, gaps: 1 });
  if (o.lanyard) { ctx.save(); ctx.strokeStyle = '#a8432d'; ctx.lineWidth = Math.max(2.4, h * 0.006); ctx.beginPath(); ctx.moveTo(hx - hr * 0.36, shY - 0.004 * h); ctx.quadraticCurveTo(hx, shY + 0.02 * h, hx + hr * 0.36, shY - 0.004 * h); ctx.stroke(); ctx.restore(); }
  for (const s of [-1, 1]) shape(ctx, circlePts(hx + s * hr * 0.97, hy + hr * 0.1, hr * 0.17, hr * 0.23, 10), st.skin, { seed: seed + 5 + s, b, inkW: 2, pool: 0.4 });
  shape(ctx, circlePts(hx, hy, hr * 1.02, hr, 28), st.skin, { seed: seed + 7, b });
  hairBehind(ctx, st, hx, hy, hr, h, shY, seed, b);
  const handF = o.phone ? backArm(ctx, g, o.phone, o.raise ?? 1) : null;
  return { head: [hx, hy, hr], shoulder: [x, shY], hip: [x, hipY], h, handF, g };
}
// a coat hung over a folding chair's backrest
function coatOnChair(ctx, x, y, s, c, t, seed, side = 1) {
  const b = boil(t);
  shape(ctx, catmull([[x - 38 * s, y - 196 * s], [x + 38 * s, y - 196 * s], [x + 44 * s, y - 150 * s], [x + 36 * s, y - 118 * s], [x - 36 * s, y - 118 * s], [x - 44 * s, y - 150 * s]], 4, true), c, { seed, b, inkW: 2.2 });
  tube(ctx, [[x + side * 36 * s, y - 180 * s], [x + side * 50 * s, y - 130 * s], [x + side * 46 * s, y - 86 * s]], 14 * s, mix(c, PAL.ink, 0.1), { seed: seed + 1, b, inkW: 3.4 });
}

/* ---------- the basement set ---------- */
function hallFixtureBody(ctx, X, lit) {
  const q = [ceilPt(X - 130, 70), ceilPt(X + 130, 70), ceilPt(X + 130, 96), ceilPt(X - 130, 96)];
  shape(ctx, q, '#cfc8b4', { seed: X, boilAmp: 0.4, inkW: 2.2 });
  const d = [ceilPt(X - 118, 76), ceilPt(X + 118, 76), ceilPt(X + 118, 91), ceilPt(X - 118, 91)];
  ctx.save(); ctx.fillStyle = lit ? '#f7f3df' : '#b9b4a4'; fillPts(ctx, d); ctx.restore();
}
function hallWindowOutside(ctx, v) {
  const { x, y, w, h } = HB.win, day = v === 'full', gray = v === 'empty';
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, day ? '#cfe3d8' : gray ? '#aeb4ac' : '#18252c'); g.addColorStop(1, day ? '#eef2d8' : gray ? '#c9cbc0' : '#2d3e45');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (day) { shape(ctx, catmull([[x - 10, y + h], [x + 40, y + h - 46], [x + 120, y + h - 30], [x + 200, y + h - 52], [x + w + 10, y + h]], 5, true), '#7fa05a', { seed: 5 }); for (let i = 0; i < 7; i++) dot(ctx, x + 20 + i * 30, y + h - 40 - (i % 2) * 10, 5, i % 2 ? '#e3b23c' : '#d98a7a', 0.9); }
  else shape(ctx, catmull([[x - 10, y + h + 4], [x - 10, y + h - 30], [x + 60, y + h - 44], [x + 140, y + h - 36], [x + w + 10, y + h - 50], [x + w + 10, y + h + 4]], 5, true), gray ? '#d8d6cc' : '#e9e4d6', { seed: 6, inkW: 2 });
  if (!day && !gray) for (let i = 0; i < 3; i++) { ctx.fillStyle = PAL.lamp; ctx.globalAlpha = 0.7; ctx.fillRect(x + 40 + i * 70, y + 30, 10, 12); }
  ctx.restore();
  const fc = '#e8e0c8';
  for (const r of [[x - 12, y - 12, w + 24, 14], [x - 12, y + h - 2, w + 24, 16], [x - 12, y - 12, 14, h + 26], [x + w - 2, y - 12, 14, h + 26], [x + w / 2 - 5, y, 10, h]]) shape(ctx, rectPts(...r), fc, { seed: r[0] + r[1], boilAmp: 0.4, inkW: 2.2 });
}
// folding chairs, folded flat and leaned in a row against the wall
function stackedChairs(ctx, x, y, n, s, seed, lean = 0) {
  for (let i = 0; i < n; i++) {
    const dx = x + i * 22 * s, c = mix('#8f8c84', '#b8a98a', hash(seed + i * 3));
    ctx.save(); ctx.translate(dx, y); ctx.rotate(lean * 0.05 + (hash(seed + i) - 0.5) * 0.04);
    for (const sx of [-26, 26]) tube(ctx, [[sx * s, 0], [sx * 1.05 * s, -206 * s]], 6 * s, c, { seed: seed + i + sx, boilAmp: 0.3, inkW: 3 });
    shape(ctx, rrectPts(-32 * s, -214 * s, 64 * s, 52 * s, 9 * s), c, { seed: seed + i, boilAmp: 0.3, inkW: 2 });
    shape(ctx, rrectPts(-29 * s, -128 * s, 58 * s, 64 * s, 6 * s), mix(c, PAL.ink, 0.12), { seed: seed + i + 40, boilAmp: 0.3, inkW: 1.8 });
    inkLine(ctx, [[-26 * s, -30 * s], [26 * s, -30 * s]], { w: 2.4, seed: seed + i + 9, alpha: 0.7 });
    ctx.restore();
  }
}

defineSet('hall', (ctx, v) => {
  const empty = v === 'empty', full = v === 'full', dim = v === 'hearth';
  // ceiling tiles in perspective
  ctx.fillStyle = empty ? '#bdb9a8' : '#d9d2bb'; ctx.fillRect(0, 0, W, HB.ceilY + 6);
  wash(ctx, rectPts(-40, -40, W + 80, HB.ceilY + 60), '#bfb497', { seed: 11, alpha: 0.07, layers: 10 });
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.22; ctx.lineWidth = 1.8;
  for (let X = -960; X <= 2880; X += 160) { const a = ceilPt(X, HB.ceilY), c = ceilPt(X, -10); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
  for (const yy of [112, 70, 14]) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 9; i++) wash(ctx, blobPoly(200 + i * 200, 40 + (i % 3) * 30, 60, 22, 7, rng(i + 30)), '#a8987a', { seed: 40 + i, alpha: 0.05, layers: 6 });
  // back wall: painted cinder block, cream above the rail and green below
  ctx.fillStyle = empty ? '#d6d1bb' : '#e2d9ba'; ctx.fillRect(0, HB.ceilY, W, HB.railY - HB.ceilY);
  ctx.fillStyle = empty ? '#a2a892' : '#9fb08c'; ctx.fillRect(0, HB.railY, W, HB.wallY - HB.railY);
  wash(ctx, rectPts(-40, HB.ceilY - 10, W + 80, 300), '#eadfc0', { seed: 12, alpha: 0.07, layers: 12 });
  wash(ctx, rectPts(-40, HB.railY, W + 80, 160), '#8ea37c', { seed: 13, alpha: 0.07, layers: 10 });
  for (let r = 0, yy = HB.ceilY + 28; yy < HB.wallY; r++, yy += 34) {
    brushDry(ctx, [[-10, yy], [W + 10, yy + 2]], { w: 2.2, k: 2, alpha: 0.2, seed: yy, dry: 0.3 });
    ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.13; ctx.lineWidth = 1.6;
    for (let x = (r % 2) * 44; x < W; x += 88) { ctx.beginPath(); ctx.moveTo(x, yy - 34); ctx.lineTo(x + 1, yy); ctx.stroke(); }
    ctx.restore();
  }
  shape(ctx, rectPts(-10, HB.railY - 8, W + 20, 14), '#b08a5e', { seed: 14, boilAmp: 0.4, inkW: 2.2 });
  shape(ctx, rectPts(-10, HB.wallY - 14, W + 20, 18), '#5c5a55', { seed: 15, boilAmp: 0.4, inkW: 2.2 });
  // linoleum checker floor in perspective
  const rows = [HB.wallY, 601, 647, 704, 774, 859, 978, 1130];
  ctx.fillStyle = empty ? '#c4bba2' : '#d3c29a'; ctx.fillRect(0, HB.wallY, W, H - HB.wallY);
  ctx.save(); ctx.fillStyle = pigment(ctx, empty ? '#8f8577' : '#a8775a'); ctx.globalAlpha = 0.55;
  for (let i = -40; i < 40; i++) for (let k = 0; k < rows.length - 1; k++) {
    if ((i + k) % 2) continue;
    const X0 = 960 + i * 64, X1 = X0 + 64, y0 = rows[k], y1 = rows[k + 1];
    fillPts(ctx, [floorPt(X0, y0), floorPt(X1, y0), floorPt(X1, y1), floorPt(X0, y1)]);
  }
  ctx.restore();
  wash(ctx, rectPts(-40, HB.wallY, W + 80, 540), '#b89a70', { seed: 16, alpha: 0.06, layers: 10 });
  for (let i = 0; i < 12; i++) brushDry(ctx, [[hash(i) * W, 640 + hash(i + 3) * 400], [hash(i) * W + 160, 650 + hash(i + 3) * 400]], { w: 3, k: 3, alpha: 0.18, seed: i + 60 });
  // pipes and hangers along the ceiling
  tube(ctx, [[-20, 124], [W + 20, 122]], 18, empty ? '#b9b3a2' : '#cfc6ae', { seed: 17, boilAmp: 0.4, inkW: 4 });
  tube(ctx, [[-20, 148], [W + 20, 146]], 9, '#a0523c', { seed: 18, boilAmp: 0.3, inkW: 3.4 });
  tube(ctx, [[-30, 30], [700, 34], [1320, 30], [W + 30, 36]], 32, '#8f8c84', { seed: 19, boilAmp: 0.4, inkW: 4.4 });
  for (const px of [260, 700, 1180, 1640]) shape(ctx, rectPts(px - 10, 12, 20, 40), '#6d6a64', { seed: px, boilAmp: 0.3, inkW: 2 });
  tube(ctx, [[1142, 124], [1142, 300], [1142, HB.wallY - 6]], 14, '#b9b3a2', { seed: 20, boilAmp: 0.4, inkW: 3.6 });
  for (const X of HB.fix) hallFixtureBody(ctx, X, false);
  // door to the stairs
  const d = HB.door;
  shape(ctx, rectPts(d.x - 12, d.y - 12, d.w + 24, d.h + 12), '#b08a5e', { seed: 21, boilAmp: 0.4, inkW: 2.4 });
  shape(ctx, rectPts(d.x, d.y, d.w, d.h), '#8a5a3b', { seed: 22, boilAmp: 0.4 });
  shape(ctx, rectPts(d.x + 22, d.y + 26, d.w - 44, 90), '#d9e2da', { seed: 23, inkW: 2, pool: 0.3 });
  dot(ctx, d.x + d.w - 18, d.y + 200, 8, '#e3b23c');
  // a small wooden cross above the door, so we know whose basement this is
  shape(ctx, rectPts(d.x + d.w / 2 - 5, 160, 10, 38), '#8a5a3b', { seed: 24, inkW: 1.8 });
  shape(ctx, rectPts(d.x + d.w / 2 - 15, 170, 30, 9), '#8a5a3b', { seed: 25, inkW: 1.8 });
  // bulletin board
  const bd = HB.board;
  shape(ctx, rectPts(bd.x - 12, bd.y - 12, bd.w + 24, bd.h + 24), '#8a5a3b', { seed: 26, boilAmp: 0.4, inkW: 2.4 });
  shape(ctx, rectPts(bd.x, bd.y, bd.w, bd.h), '#c49a62', { seed: 27, boilAmp: 0.4, inkW: 1.6 });
  for (let i = 0; i < 40; i++) dot(ctx, bd.x + hash(i + 3) * bd.w, bd.y + hash(i + 8) * bd.h, 1.6, '#7a5236', 0.4);
  const flyer = (x, y, w, h, c, rot, lines, seed, fade = 0) => {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot);
    shape(ctx, rectPts(-w / 2, -h / 2, w, h), c, { seed, boilAmp: 0.4, inkW: 1.8, pool: 0.3 });
    lines.forEach((L, i) => letter(ctx, L, 0, -h / 2 + 40 + i * 34, { font: '700 30px Caveat, cursive', align: 'center', color: '#3a2a22', alpha: 0.9 - fade }));
    ctx.restore();
    dot(ctx, x + w / 2, y + 8, 6, '#b5452f', 0.95);
  };
  if (full) {
    flyer(bd.x + 14, bd.y + 14, 186, 104, '#f6efdc', -0.04, ['Seed swap', 'Saturday'], 30);
    flyer(bd.x + 214, bd.y + 20, 150, 110, '#f2d98a', 0.05, ['Fix-it', 'night'], 31);
    flyer(bd.x + 40, bd.y + 128, 170, 76, '#cfe0c0', 0.03, ['Choir!'], 32);
  } else {
    const fade = empty ? 0.45 : 0;
    flyer(bd.x + 12, bd.y + 14, 198, 108, '#f6efdc', -0.04, ['Retraining:', 'prompt writing'], 30, fade);
    if (!empty) flyer(bd.x + 222, bd.y + 18, 146, 108, '#f2d98a', 0.05, ['Food pantry', 'Thursday'], 31, fade);
    shape(ctx, rectPts(bd.x + 44, bd.y + 134, 130, 66), '#f1e6cf', { seed: 33, inkW: 1.6, pool: 0.3 });
    for (let i = 0; i < 7; i++) inkLine(ctx, [[bd.x + 50 + i * 18, bd.y + 176], [bd.x + 50 + i * 18, bd.y + 198]], { w: 1.4, seed: i, alpha: 0.5 });
    dot(ctx, bd.x + 108, bd.y + 140, 5, '#4f7a8a', 0.95);
    shape(ctx, rectPts(bd.x + 214, bd.y + 140, 118, 60), '#e6c9b8', { seed: 34, inkW: 1.6, pool: 0.3 });
    dot(ctx, bd.x + 272, bd.y + 146, 5, '#e3b23c', 0.95);
  }
  // banner, or the big sheet of ideas in the garden years
  const bn = HB.banner;
  if (full) {
    const sx = 520, sy = 150, sw = 930, sh = 280;
    shape(ctx, rectPts(sx, sy, sw, sh), '#fbf6ea', { seed: 35, boilAmp: 0.5, inkW: 2.4, pool: 0.3 });
    letter(ctx, 'WHAT DO WE DO WITH EVERYTHING?', sx + sw / 2, sy + 58, { font: '700 54px Caveat, cursive', align: 'center', color: '#3f6b68' });
    const notes = ['gardens', 'music', 'fix bikes', 'teach', 'nap', 'boats', 'soup', 'dance', 'paint', 'visit', 'build', 'sing'];
    const cols = ['#f2d98a', '#f0b9a8', '#cfe0a8', '#b9d6d0'];
    for (let i = 0; i < 34; i++) {
      const nx = sx + 30 + (i % 11) * 82 + (hash(i) - 0.5) * 18, ny = sy + 86 + Math.floor(i / 11) * 62 + (hash(i + 5) - 0.5) * 12;
      ctx.save(); ctx.translate(nx + 32, ny + 26); ctx.rotate((hash(i + 2) - 0.5) * 0.3);
      shape(ctx, rectPts(-32, -26, 64, 52), cols[i % 4], { seed: 40 + i, boilAmp: 0.3, inkW: 1.4, gaps: 1, pool: 0.3 });
      if (i % 3 === 0) letter(ctx, notes[(i / 3) % notes.length], 0, 8, { font: '700 26px Caveat, cursive', align: 'center', color: '#3a2a22' });
      else for (let l = 0; l < 2; l++) inkLine(ctx, [[-22, -8 + l * 14], [-22 + 30 + hash(i + l) * 14, -8 + l * 14]], { w: 2, seed: i + l, alpha: 0.6 });
      ctx.restore();
    }
    for (let i = 0; i < 12; i++) { const bx = i * 170, by = 162 + Math.sin(i) * 4; if (bx > 440 && bx < 1460) continue; shape(ctx, [[bx, by], [bx + 60, by + 4], [bx + 30, by + 44]], ['#e3b23c', '#d98a7a', '#6f8a5b', '#4f7a8a'][i % 4], { seed: 70 + i, boilAmp: 0.3, inkW: 1.6, gaps: 1 }); }
    inkLine(ctx, [[-10, 160], [W + 10, 166]], { w: 2, seed: 71, alpha: 0.6 });
  } else if (!empty) {
    const sag = catmull([[bn.x, bn.y], [bn.x + bn.w / 2, bn.y + 8], [bn.x + bn.w, bn.y], [bn.x + bn.w, bn.y + bn.h], [bn.x + bn.w / 2, bn.y + bn.h + 10], [bn.x, bn.y + bn.h]], 5, true);
    shape(ctx, sag, '#f4ecd6', { seed: 36, boilAmp: 0.4, inkW: 2.4, pool: 0.3 });
    letter(ctx, 'DISPLACED WORKERS MEETING . TUES 7PM', bn.x + bn.w / 2, bn.y + 60, { font: '700 50px Caveat, cursive', align: 'center', color: '#a0523c' });
    for (const tx of [bn.x - 6, bn.x + bn.w - 22]) shape(ctx, rectPts(tx, bn.y - 6, 28, 16), 'rgba(236,230,210,0.8)', { seed: tx, flat: true, inkW: 1.2 });
  }
  // the parish's name on a painted board above the coffee table
  if (!full && !dim) shape(ctx, rrectPts(1250, 286, 250, 58, 8), empty ? '#9a8a6a' : '#8a5a3b', { seed: 58, boilAmp: 0.4, inkW: 2.4 });
  if (!full && !dim) letter(ctx, "SAINT ANNE'S", 1375, 327, { font: '700 36px Caveat, cursive', align: 'center', color: '#f2e6cc', alpha: empty ? 0.6 : 0.95 });
  // the small high window, level with the snow outside
  hallWindowOutside(ctx, v);
  // coffee table, urn, cups
  if (dim) for (const [y, xs] of HEARTH_ROWS) xs.forEach((x, i) => foldChair(ctx, x, y, { s: hAt(y) * 0.0027, seed: 640 + i + y, c: '#9a958c' }));
  if (!dim) {
    const tb = HB.table;
    for (const lx of [tb.x + 20, tb.x + tb.w - 26]) inkLine(ctx, [[lx, tb.top + 10], [lx + 4, tb.y]], { w: 4, seed: lx });
    if (!empty) shape(ctx, catmull([[tb.x - 10, tb.top], [tb.x + tb.w + 10, tb.top], [tb.x + tb.w + 14, tb.top + 64], [tb.x + tb.w * 0.75, tb.top + 72], [tb.x + tb.w / 2, tb.top + 64], [tb.x + tb.w * 0.25, tb.top + 72], [tb.x - 14, tb.top + 64]], 4, true), full ? '#e6a9a0' : '#e9e2cc', { seed: 38, boilAmp: 0.4 });
    shape(ctx, rectPts(tb.x - 12, tb.top - 8, tb.w + 24, 14), empty ? '#b9b3a2' : '#d8cfb8', { seed: 39, boilAmp: 0.4, inkW: 2.2 });
    const ux = HB.urn.x, uy = tb.top - 8;
    shape(ctx, rrectPts(ux - 38, uy - 118, 76, 118, 10), '#b9c3c3', { seed: 40, shade: { dx: -12, dy: 0, a: 0.18 } });
    for (const k of [0.25, 0.6]) inkLine(ctx, [[ux - 36, uy - 118 * k], [ux + 36, uy - 118 * k]], { w: 1.6, seed: k * 10, alpha: 0.4 });
    shape(ctx, catmull([[ux - 40, uy - 118], [ux - 30, uy - 136], [ux + 30, uy - 136], [ux + 40, uy - 118]], 4, true), '#9aa6a6', { seed: 41, inkW: 2 });
    shape(ctx, rectPts(ux - 8, uy - 146, 16, 12), '#3a3431', { seed: 42, inkW: 1.6 });
    for (const s of [-1, 1]) tube(ctx, [[ux + s * 38, uy - 90], [ux + s * 52, uy - 90], [ux + s * 52, uy - 60], [ux + s * 38, uy - 60]], 5, '#3a3431', { seed: 43 + s, inkW: 2.4 });
    shape(ctx, rectPts(ux - 10, uy - 28, 20, 14), '#3a3431', { seed: 44, inkW: 1.6 });
    for (let i = 0; i < 7; i++) shape(ctx, [[ux + 70, uy - 12 - i * 12], [ux + 100, uy - 12 - i * 12], [ux + 98, uy - i * 12], [ux + 72, uy - i * 12]], '#f4efe4', { seed: 45 + i, inkW: 1.4, gaps: 1, pool: 0.3 });
    if (!empty) {
      shape(ctx, catmull([[ux + 124, uy], [ux + 200, uy], [ux + 208, uy - 8], [ux + 116, uy - 8]], 3, true), '#e9dcc0', { seed: 52, inkW: 1.6 });
      for (let i = 0; i < 4; i++) dot(ctx, ux + 138 + i * 18, uy - 14, 9, '#c98a4a', 1);
      shape(ctx, rrectPts(ux - 110, uy - 56, 44, 56, 8), 'rgba(226,236,232,0.55)', { seed: 53, flat: true, inkW: 1.8 });
      for (let i = 0; i < 5; i++) dot(ctx, ux - 100 + i * 7, uy - 10 - (i % 2) * 6, 5, '#d9b24a', 0.9);
      if (full) for (let i = 0; i < 5; i++) { inkLine(ctx, [[ux + 236, uy - 40], [ux + 222 + i * 8, uy - 110 - (i % 2) * 16]], { w: 2, seed: i, color: '#5d7a52' }); dot(ctx, ux + 222 + i * 8, uy - 112 - (i % 2) * 16, 10, ['#e3b23c', '#d98a7a', '#f6ecd6'][i % 3], 1); }
      if (full) shape(ctx, rrectPts(ux + 220, uy - 44, 34, 44, 8), 'rgba(226,236,232,0.6)', { seed: 54, flat: true, inkW: 1.8 });
    }
    // the cord: plugged into the wall, or lying on the floor
    if (empty) { tube(ctx, [[ux + 30, uy - 30], [ux + 60, uy + 40], [ux + 40, HB.table.y + 10], [ux - 40, HB.table.y + 24], [ux - 110, HB.table.y + 16]], 4, '#3a3431', { seed: 55, inkW: 2.2 }); shape(ctx, rectPts(ux - 130, HB.table.y + 6, 22, 16), '#e9e2cc', { seed: 56, inkW: 1.6 }); }
    else { tube(ctx, [[ux + 30, uy - 30], [ux + 60, uy + 20], [ux + 110, HB.wallY - 44]], 4, '#3a3431', { seed: 55, inkW: 2.2 }); shape(ctx, rectPts(ux + 98, HB.wallY - 58, 26, 34), '#efe6d2', { seed: 57, inkW: 1.8 }); }
  }
  if (empty) {
    // every chair folded and stacked against the wall
    stackedChairs(ctx, 600, HB.wallY + 34, 9, 1.05, 80, 1);
    stackedChairs(ctx, 820, HB.wallY + 36, 8, 1.05, 90, 1);
    stackedChairs(ctx, 1640, HB.wallY + 40, 10, 1.05, 100, -1);
    shape(ctx, rectPts(200, 818, 300, 18), '#6d6a64', { seed: 110, inkW: 2.2 });
    for (const wx of [220, 480]) shape(ctx, circlePts(wx, 846, 14, 14, 12), '#3a3431', { seed: wx, inkW: 2 });
    stackedChairs(ctx, 250, 820, 7, 1.25, 120, 0.4);
    paperSheet(ctx, 430, 700, 150, 100, { rot: 0.4, seed: 130, c: '#f2d98a' });
  }
});

/* ---------- live basement pieces ---------- */
function fixtureLit(t, i, v) {
  if (v === 'empty') return i === 1 ? (hash(Math.floor(t * 7)) < 0.05 ? 0.55 : 1) : 0;
  if (v === 'hearth') return 0;
  if (i !== 2) return 1;
  const burst = frac(t / 5.3 + 0.3) < 0.16 && hash(Math.floor(t * 14)) < 0.55;
  return burst || hash(Math.floor(t * 3) + 0.5) < 0.05 ? 0.12 : 1;
}
function hallLights(ctx, t, v) {
  HB.fix.forEach((X, i) => {
    const k = fixtureLit(t, i, v); if (k <= 0) return;
    const d = [ceilPt(X - 118, 76), ceilPt(X + 118, 76), ceilPt(X + 118, 91), ceilPt(X - 118, 91)];
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#fffbea'; fillPts(ctx, d); ctx.restore();
    const c = ceilPt(X, 84);
    glow(ctx, c[0], c[1] + 20, 380, '#f6f1d6', 0.35 * k);
  });
}
function hallMask(ctx, t, v, cam, extra = [], dark = 'rgba(26,24,30,0.34)') {
  const pools = HB.fix.map((X, i) => ({ x: ceilPt(X, 84)[0], y: 460, r: 760, a: 0.92 * fixtureLit(t, i, v) }));
  lightMask(ctx, dark, pools.concat(extra), camFit(cam));
}
function windowSnow(ctx, t) {
  const { x, y, w, h } = HB.win;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h - 30); ctx.clip();
  for (let i = 0; i < 26; i++) {
    const sx = x + frac(hash(i) + Math.sin(t * 0.4 + i) * 0.02) * w, sy = y + frac(hash(i + 3) + t * (0.12 + hash(i + 5) * 0.1)) * h;
    dot(ctx, sx, sy, 1.6 + hash(i + 7) * 1.6, '#f6f2e6', 0.85);
  }
  ctx.restore();
}
function urnLive(ctx, t, on = true) {
  const ux = HB.urn.x, uy = HB.table.top - 8;
  if (!on) return;
  dot(ctx, ux, uy - 40, 5, '#e8603f', 0.9); glow(ctx, ux, uy - 40, 30, '#e8603f', 0.5);
  steam(ctx, ux, uy - 150, t, 1.1, 2);
}

/* ---------- the crowd ----------
   Modes: meet (wide), aldana, mara, speak, full. Most people are baked into two cached layers split at SPLIT_Y.
   Each beat picks a baked variant by how far its action has got. The people still acting are drawn live
   between the two layers, and whoever has finished is baked in their final pose. */
const seatById = (id) => SEATS.find((s) => s.id === id);
const LATE = [{ id: 11, t0: 0.8, seed: 601, top: '#5a6b78' }, { id: 10, t0: 4.6, seed: 602, top: '#8a4a2a' }, { id: 12, t0: 8.4, seed: 603, top: '#4f6b5a' }];
const DOORWAY = [80, 578];
const TURN_ROWS = { 16: 0, 119: 1, 120: 1 };
const TURN_STANDERS = { 3: 2, 4: 2 };
const RAISERS = [6, 16, 5, 119, 7, 8];
const EARLY_PHONES = [18, 118, 120, 13];
const raiseAt = (id) => 1.4 + RAISERS.indexOf(id) * 0.8;
const SPEAK_UP = raiseAt(RAISERS[RAISERS.length - 1]) + 0.7, LATE_DONE = 14, TURN_FROM = 5.5, TURN_DONE = 7.9;
const VARIANTS = {
  meet: { mode: 'meet', live: LATE.map((l) => l.id), next: 'meet1' },
  meet1: { mode: 'meet', live: [], lateSeated: true },
  aldana: { mode: 'aldana', live: [] },
  mara0: { mode: 'mara', live: [], next: 'maraX' },
  maraX: { mode: 'mara', live: Object.keys(TURN_ROWS).map(Number), liveStanders: true, next: 'mara1' },
  mara1: { mode: 'mara', live: [], st: { p: { turn: true }, pt: 99, c: {} } },
  speak: { mode: 'speak', live: RAISERS.filter((id) => seatById(id).kind !== 'back'), liveArms: true, next: 'speak1' },
  speak1: { mode: 'speak', live: [], st: { p: {}, pt: 99, c: {} } },
  full: { mode: 'full', live: [6] },
};
function variantFor(mode, st, t) {
  const pt = st.pt ?? t;
  if (mode === 'meet') return t > LATE_DONE ? 'meet1' : 'meet';
  if (mode === 'mara') return !(st.p && st.p.turn) || pt < TURN_FROM ? 'mara0' : pt > TURN_DONE ? 'mara1' : 'maraX';
  if (mode === 'speak') return pt > SPEAK_UP ? 'speak1' : 'speak';
  return mode;
}
const SPLIT_Y = 760;
const liveSeat = (s, v) => !!s.role || VARIANTS[v].live.includes(s.id);
const liveStander = (i, v) => !!VARIANTS[v].liveStanders && i in TURN_STANDERS;
const standerShown = (i, mode) => !(mode === 'full' && i === 4);
// hall.mara: rows turn to look at her, one after another, on the beat that asks for it
const turnK = (st, row) => (st.p && st.p.turn ? clamp(((st.pt ?? 0) - 5.6 - row * 0.9) / 0.35) : 0);
const creakK = (st, row) => (st.p && st.p.turn ? clamp(((st.pt ?? 0) - 5.6 - row * 0.9) / 1.2) : 0);
// phones go up on the side away from Mara, so her face stays clear
const phoneSide = (s) => (s.x < MARA.x ? -1 : 1);
const backTurn = (s, mode) => (mode === 'speak' ? clamp((MARA.x - s.x) / 300, -1, 1) : clamp((HB.aldana.x - s.x) / 400, -1, 1) * 0.6);

function kidOnChair(ctx, s, t, cs, chairC, seed, bounce = 0) {
  // kids kneel backward on the front-row chairs to see the room
  const age = 7 + Math.floor(hash(s.id) * 4), grow = clamp((age - 8) / 6);
  const who = { ...crowdStyle(seed), kid: true, hair: ['bunches', 'short', 'curly', 'bob'][s.k % 4], band: '#e3b23c' };
  const kidH = s.h * (who.tall ?? 1) * lerp(0.6, 0.9, grow);
  const backBot = s.y - 140 * cs, top = s.y - 190 * cs;
  ctx.save(); ctx.beginPath(); ctx.rect(s.x - 300, -100, 600, backBot + 100); ctx.clip();
  person(ctx, { who, age, x: s.x, y: backBot + lerp(0.34, 0.41, grow) * kidH - bounce, h: s.h, f: 0, arms: 'down', mood: 'smile', speak: frac(t / 4 + hash(s.id)) < 0.3, t, seed, look: hash(s.id + 2) - 0.5 });
  ctx.restore();
  foldChair(ctx, s.x, s.y, { s: cs, c: chairC, t, seed: seed + 5 });
  for (const sd of [-1, 1]) shape(ctx, circlePts(s.x + sd * 20 * cs, top + 4, 0.036 * kidH, 0.032 * kidH, 12), who.skin, { seed: seed + 30 + sd, b: boil(t), inkW: 2, pool: 0.5 });
}
function seatPose(s, t, st, mode) {
  let f = s.f, look = clamp((HB.aldana.x - s.x) / 500, -1, 1), speak = false, phoneK = 0;
  let arms = s.cup ? 'mug' : hash(s.id * 4.4) < 0.25 ? 'chin' : 'lap', mood = hash(s.id * 6.1) < 0.3 ? 'worry' : 'calm';
  // two neighbors across from us whisper to each other
  if (mode === 'meet' && (s.id === 18 || s.id === 19)) { f = s.id === 18 ? 1 : -1; speak = frac(t / 6 + (s.id === 19 ? 0.5 : 0)) < 0.45; }
  if (mode === 'mara' && s.id in TURN_ROWS && turnK(st, TURN_ROWS[s.id]) > 0.5) { f = s.x < MARA.x ? 1 : -1; look = f * 0.6; mood = 'o'; }
  if (mode === 'speak') {
    f = s.x < MARA.x ? 1 : -1; look = f * 0.5; mood = hash(s.id) < 0.5 ? 'wide' : 'o';
    if (EARLY_PHONES.includes(s.id)) phoneK = 1, arms = [[2.05, 0.65], [0.05, 0.1]];
    if (RAISERS.includes(s.id)) { phoneK = ease.inOut(clamp(((st.pt ?? t) - raiseAt(s.id)) / 0.6)); if (phoneK > 0) arms = [[lerp(0.45, 2.05, phoneK), lerp(0.95, 0.65, phoneK)], [0.05, 0.1]]; }
  }
  if (mode === 'full') { mood = 'smile'; speak = hash(s.id * 3.3) < 0.3 && frac(t / 5 + hash(s.id)) < 0.5; }
  return { f, look, speak, mood, arms, phoneK };
}
// a few ink ticks beside a chair as it creaks around
function creak(ctx, x, y, k, seed) {
  if (k <= 0 || k >= 1) return;
  const a = Math.sin(k * Math.PI) * 0.8;
  for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) inkLine(ctx, [[x + sd * (46 + i * 10), y - 8 + i * 14], [x + sd * (62 + i * 12), y - 16 + i * 14]], { w: 2.6, seed: seed + i + sd, alpha: a });
}
function seatPerson(ctx, s, t, st, mode, baked = false) {
  const cs = s.h * 0.0027, seed = s.id * 7 + 3, chairC = mix('#8f8c84', '#b8a98a', hash(s.id * 1.3));
  const sty = crowdStyle(seed), full = mode === 'full', empty = !full && s.empty;
  if (s.kind === 'back') {
    if (mode === 'aldana' || mode === 'mara') return;
    if (full) return kidOnChair(ctx, s, t, cs, chairC, seed, baked ? 0 : Math.abs(Math.sin(t * 3.4 + s.id)) * 8);
    const raiser = mode === 'speak' && RAISERS.includes(s.id), k = raiser ? clamp(((st.pt ?? t) - raiseAt(s.id)) / 0.6) : 0;
    if (!empty) backFig(ctx, { who: sty, x: s.x, y: s.y, h: s.h, t, seed, turn: backTurn(s, mode), phone: raiser && k >= 1 ? phoneSide(s) : 0, liveArm: raiser && k < 1 ? phoneSide(s) : 0 });
    foldChair(ctx, s.x, s.y, { s: cs, c: chairC, t, seed: seed + 5 });
    if (empty && s.coat) coatOnChair(ctx, s.x, s.y, cs, s.coat, t, seed + 8, hash(s.id) < 0.5 ? -1 : 1);
    return;
  }
  if (mode === 'aldana' && s.x > 1200) return;
  if (mode === 'mara' && s.x < 560) return;
  if (s.coat) coatOnChair(ctx, s.x, s.y, cs, s.coat, t, seed + 8, s.f === 0 ? (hash(s.id) < 0.5 ? -1 : 1) : -s.f);
  foldChair(ctx, s.x, s.y, { s: cs, c: chairC, t, seed: seed + 5 });
  if (empty) return;
  const q = seatPose(s, t, st, mode);
  const p = person(ctx, { who: sty, x: s.x, y: s.y, h: s.h, f: q.f, pose: 'sit', arms: q.arms, mood: q.mood, speak: q.speak, look: q.look, t, seed });
  if (q.arms === 'mug') cup(ctx, p.handF[0] + (q.f || 1) * 4, p.handF[1] + 6, s.h / 420, t, { seed: s.id, steam: !baked });
  if (q.phoneK > 0.4) phone(ctx, p.handF[0], p.handF[1] - s.h * 0.05, s.h * 0.0027, t, seed + 9, { back: true });
  if (mode === 'mara' && s.id in TURN_ROWS) creak(ctx, s.x, s.y - s.h * 0.22, creakK(st, TURN_ROWS[s.id]), seed);
}
function stander(ctx, p, i, t, st, mode, baked) {
  if (!standerShown(i, mode)) return;
  const h = hAt(p.y);
  let f = mode === 'speak' ? (p.x < MARA.x ? 1 : -1) : p.f, mood = mode === 'full' ? 'smile' : mode === 'speak' ? 'o' : 'calm';
  if (mode === 'mara' && i in TURN_STANDERS && turnK(st, TURN_STANDERS[i]) > 0.5) { f = p.x < MARA.x ? 1 : -1; mood = 'o'; }
  const filming = mode === 'speak' && (i === 1 || i === 3);
  const r = person(ctx, { who: crowdStyle(p.seed), x: p.x, y: p.y, h, f, arms: filming ? [[2.05, 0.65], [0.05, 0.1]] : p.arms ?? 'down', mood, t, seed: p.seed, look: 0.3 });
  if (filming) phone(ctx, r.handF[0], r.handF[1] - h * 0.05, h * 0.0027, t, p.seed, { back: true });
  else if (p.arms === 'mug') cup(ctx, r.handF[0], r.handF[1] + 6, h / 420, t, { seed: p.seed, steam: !baked });
}
function bakedCrowd(ctx, v, front) {
  const V = VARIANTS[v], mode = V.mode, st = V.st ?? { p: {}, c: {} }, items = [];
  for (const s of SEATS) {
    if (liveSeat(s, v) || (s.y > SPLIT_Y) !== front) continue;
    const L = V.lateSeated && LATE.find((l) => l.id === s.id);
    items.push({ y: s.y, fn: () => (L ? latecomer(ctx, L, s, 99) : seatPerson(ctx, s, 0.35, st, mode, true)) });
  }
  if (!front) STANDERS.forEach((p, i) => { if (!liveStander(i, v)) items.push({ y: p.y, fn: () => stander(ctx, p, i, 0.35, st, mode, true) }); });
  items.sort((p, q) => p.y - q.y).forEach((it) => it.fn());
}
defineSet('hallBack', (ctx, v) => bakedCrowd(ctx, v, false));
defineSet('hallFront', (ctx, v) => bakedCrowd(ctx, v, true));
// the front row's phones rise one at a time, drawn over their baked backs
function frontRowPhones(ctx, t, st) {
  for (const id of RAISERS) {
    const s = seatById(id); if (s.kind !== 'back' || s.empty) continue;
    const k = clamp(((st.pt ?? t) - raiseAt(id)) / 0.6); if (k <= 0) continue;
    const g = backGeom({ who: crowdStyle(s.id * 7 + 3), x: s.x, y: s.y, h: s.h, t: 0.35, seed: s.id * 7 + 3, turn: backTurn(s, 'speak') });
    g.t = t; g.b = boil(t);
    backArm(ctx, g, phoneSide(s), k);
  }
}

/* latecomers come in from the snow, brush it off, and sit */
function latePath(L, s, t) {
  const D = Math.hypot(s.x - 30 - DOORWAY[0], s.y - DOORWAY[1]) / 95, u = (t - L.t0) / D;
  return { u, D, x: lerp(DOORWAY[0], s.x - 30, clamp(u)), y: lerp(DOORWAY[1], s.y, clamp(u)) };
}
function latecomer(ctx, L, s, t) {
  const cs = s.h * 0.0027, P = latePath(L, s, t);
  foldChair(ctx, s.x, s.y, { s: cs, c: mix('#8f8c84', '#b8a98a', hash(s.id * 1.3)), t, seed: s.id * 7 + 8 });
  if (P.u < 0) return;
  const who = { ...crowdStyle(L.seed), top: L.top }, arrive = L.t0 + P.D, sitAt = arrive + 1.4;
  let p;
  if (P.u < 1) { const h = hAt(P.y); p = person(ctx, { who, x: P.x, y: P.y, h, f: 1, pose: 'walk', pace: 95 / (0.0828 * h), arms: 'down', mood: 'calm', t, seed: L.seed }); }
  else if (t < sitAt) { const w = Math.sin(t * 16); p = person(ctx, { who, x: s.x - 30, y: s.y, h: s.h, f: 1, arms: [[0.9 + 0.35 * w, 1.5], [0.9 - 0.35 * w, 1.5]], mood: 'worry', t, seed: L.seed }); }
  else p = person(ctx, { who, x: s.x, y: s.y, h: s.h, f: 1, pose: 'sit', arms: 'lap', mood: 'calm', look: 0.4, t, seed: L.seed });
  // snow on the shoulders until it is brushed off, and the little fall of it
  const snowK = 1 - clamp((t - arrive) / 1.2), hr = p.head[2];
  if (snowK > 0) for (let i = 0; i < 8; i++) dot(ctx, p.shoulder[0] + (hash(i + L.seed) - 0.5) * p.h * 0.24, (i < 3 ? p.head[1] - hr * 0.9 : p.shoulder[1]) + hash(i + 3) * 6, 3.2, '#f6f4ec', 0.95 * snowK);
  if (t > arrive && t < sitAt + 0.6) for (let i = 0; i < 12; i++) { const ph = frac(hash(i) + (t - arrive) * 1.3); dot(ctx, p.shoulder[0] + (hash(i + 9) - 0.5) * p.h * 0.3, p.shoulder[1] + ph * p.h * 0.5, 2.6, '#f6f4ec', 0.85 * (1 - ph)); }
}
function doorLive(ctx, t) {
  const k = Math.max(...LATE.map((L) => win(t, L.t0 - 0.6, L.t0 + 1.6, 0.35, 0.5))); if (k <= 0) return;
  const d = HB.door, b = boil(t);
  ctx.save(); const g = ctx.createLinearGradient(d.x, 0, d.x + d.w, 0); g.addColorStop(0, '#2c3c44'); g.addColorStop(1, '#55696f'); ctx.fillStyle = g; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.restore();
  for (let i = 0; i < 6; i++) inkLine(ctx, [[d.x + 8, d.y + d.h - 30 - i * 50], [d.x + d.w - 8, d.y + d.h - 48 - i * 50]], { w: 2.4, seed: i, alpha: 0.45 });
  shape(ctx, rectPts(d.x, d.y, d.w * (1 - 0.72 * k), d.h), '#8a5a3b', { seed: 22, b, boilAmp: 0.4 });
  for (let i = 0; i < 22; i++) { const ph = frac(hash(i) + t * 0.55); dot(ctx, d.x + d.w * 0.5 + ph * 220 * (0.5 + hash(i + 2)), d.y + 40 + hash(i + 5) * (d.h - 60) + ph * 50, 2 + hash(i) * 2.4, '#f6f4ec', k * (1 - ph)); }
  glow(ctx, d.x + d.w * 0.6, d.y + d.h * 0.5, 220, '#cfe0e0', 0.3 * k);
}

function drawMara(ctx, t, st, mode) {
  const s = MARA, cs = s.h * 0.0027, b = boil(t), pt = st.pt ?? t;
  if (mode === 'speak' && pt > 0.9) {
    // she stands up in front of her chair to answer
    foldChair(ctx, s.x, s.y - 4, { s: cs, t, seed: 900 });
    coatOnChair(ctx, s.x, s.y - 4, cs, '#4b5a5e', t, 901, -1);
    const up = ease.out(clamp((pt - 0.9) / 0.5)) * 14, gest = [[0.9 + 0.25 * Math.sin(t * 1.1), 0.5 + 0.3 * Math.sin(t * 1.7)], [0.25 + 0.2 * Math.sin(t * 0.8), 0.3]];
    return person(ctx, { who: 'mara', x: s.x, y: s.y + 74 - up, h: hAt(s.y + 60), f: 0, arms: gest, mood: 'calm', speak: says(st, 'mara') || st.who == null || st.who === 'narr', t, badge: true, look: 0.2 });
  }
  coatOnChair(ctx, s.x, s.y, cs, '#4b5a5e', t, 901, -1);
  foldChair(ctx, s.x, s.y, { s: cs, t, seed: 900 });
  const hold = mode === 'mara', turned = hold && turnK(st, 0) > 0.5;
  const look = mode === 'full' ? -0.9 : hold ? (turned ? 0.3 : pt < 3 ? -0.9 : -0.1) : mode === 'speak' ? 0.6 : 0.6;
  const mood = hold ? (turned ? 'wide' : pt < 3 ? 'smile' : 'worry') : mode === 'full' ? 'smile' : 'calm';
  const p = person(ctx, { who: 'mara', x: s.x, y: s.y, h: s.h, f: 0, pose: 'sit', arms: hold ? [[0.5, 1.45], [0.5, 1.35]] : [[0.18, 1.0], [0.18, 1.0]], mood, speak: says(st, 'mara'), t, badge: !hold && mode !== 'full', look });
  if (hold) {
    // the badge in her hands, turned over and back while she thinks about the nine pages
    const [bx, by] = p.handF, flip = Math.cos(Math.PI * (settle(pt, 2.6, 0.7) - settle(pt, 5.0, 0.7)));
    ctx.save(); ctx.strokeStyle = '#a8432d'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(p.shoulder[0] - s.h * 0.03, p.shoulder[1]); ctx.quadraticCurveTo(p.shoulder[0], by + 14, bx - 6, by - 22); ctx.moveTo(p.shoulder[0] + s.h * 0.03, p.shoulder[1]); ctx.lineTo(bx + 4, by - 22); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(bx - 4, by); ctx.rotate(-0.12 + Math.sin(t * 0.9) * 0.05); ctx.scale(Math.max(0.08, Math.abs(flip)), 1);
    shape(ctx, rrectPts(-20, -26, 40, 54, 5), '#f4efe4', { seed: 910, b, inkW: 2, gaps: 1, pool: 0.3 });
    if (flip > 0) { ctx.fillStyle = '#b5552f'; ctx.fillRect(-17, -23, 34, 10); ctx.fillStyle = '#c9b8a0'; ctx.fillRect(-12, -7, 16, 19); dot(ctx, -4, -2, 4, '#2e211d', 0.8); ctx.fillStyle = '#8a7a6a'; ctx.fillRect(7, -4, 8, 3); ctx.fillRect(7, 3, 8, 3); }
    else { ctx.fillStyle = '#3a3431'; for (let i = 0; i < 9; i++) ctx.fillRect(-14 + i * 3.2, 4, i % 3 ? 1.4 : 2.4, 14); }
    ctx.restore();
    shape(ctx, circlePts(bx + 12, by + 10, s.h * 0.03, s.h * 0.028, 12), STYLE.mara.skin, { seed: 911, b, inkW: 2, pool: 0.5 });
  }
  return p;
}
const WREN_TEEN = { ...STYLE.wren, hair: 'long' };
function drawWren(ctx, t, st, mode) {
  const s = WREN, b = boil(t), cs = s.h * 0.0027, pt = st.pt ?? t;
  const age = mode === 'full' ? Math.max(wrenAge(st), 13) : wrenAge(st);
  const kidH = s.h * lerp(0.6, 0.9, clamp((age - 8) / 6));
  coatOnChair(ctx, s.x, s.y, cs, '#c0452f', t, 920, -1);
  foldChair(ctx, s.x, s.y, { s: cs, t, seed: 921 });
  if (mode === 'full') {
    // she sticks her own idea on the sheet, then turns around grinning
    const wx = 860, wy = 606, note = [wx + 40, 262], stuck = pt > 2.3;
    if (pt < 3.6) {
      const r = backFig(ctx, { who: WREN_TEEN, age, x: wx, y: wy, h: hAt(wy), pose: 'stand', t, seed: 5, liveArm: 1 });
      const hd = backArm(ctx, r.g, 1, stuck ? 1 : settle(pt, 0.5, 1.5), 'note');
      if (!stuck && hd) shape(ctx, rectPts(hd[0] - 14, hd[1] - 30, 28, 26), '#f0b9a8', { seed: 950, b, inkW: 1.4, gaps: 1 });
    } else person(ctx, { who: WREN_TEEN, age, x: wx, y: wy, h: hAt(wy), f: 0, arms: 'down', mood: 'smile', speak: frac(t / 3) < 0.4, t, seed: 5 });
    if (stuck) { const pop = 1 + 0.25 * Math.max(0, 1 - (pt - 2.3) * 4); ctx.save(); ctx.translate(note[0], note[1]); ctx.scale(pop, pop); ctx.rotate(0.08); shape(ctx, rectPts(-32, -26, 64, 52), '#f0b9a8', { seed: 951, b, inkW: 1.6, gaps: 1, pool: 0.3 }); letter(ctx, 'boats', 0, 8, { font: '700 26px Caveat, cursive', align: 'center', color: '#3a2a22' }); ctx.restore(); }
    return null;
  }
  const pass = choseCh1(st) === 'pass';
  const scribble = [[0.72 + 0.07 * Math.sin(t * 6.5), 1.1 + 0.1 * Math.sin(t * 4.7)], [0.55, 1.15]];
  const laughing = pass && frac(pt / 3.2) > 0.55;
  const p = person(ctx, { who: 'wren', age, x: s.x, y: s.y, h: s.h, f: 1, pose: 'sit', seatH: (100 * cs) / kidH, arms: pass ? 'hold' : scribble, mood: laughing ? 'smile' : 'calm', speak: says(st, 'wren') || laughing, t, seed: 5, look: 0.2 });
  if (pass) {
    // her tablet, turned so we can see Hearth doing fractions and laughing at her jokes
    const tx = p.handF[0] - 6, ty = p.handF[1] - 4, hop = laughing ? Math.abs(Math.sin(t * 9)) * 4 : 0;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.12);
    shape(ctx, rrectPts(-50, -36, 100, 72, 8), '#3a3431', { seed: 930, b, inkW: 2 });
    ctx.fillStyle = '#fbe7bf'; fillPts(ctx, rrectPts(-43, -29, 86, 58, 4));
    letter(ctx, '½+¼', -20, 8, { font: '700 24px Caveat, cursive', align: 'center', color: '#8a3a2a' });
    hearth(ctx, 23, 8 - hop, { t, r: 12, glowA: 0.2, speak: laughing || says(st, 'hearth'), seed: 931 });
    if (laughing) letter(ctx, 'ha!', 6, -12 - frac(pt / 3.2) * 4, { font: '700 17px Caveat, cursive', color: '#8a3a2a', align: 'center', rot: -0.15 });
    ctx.restore();
    glow(ctx, tx, ty, 120, PAL.lamp, 0.3);
    return p;
  }
  // the back of a flyer on her knees, and Biscuit appearing on it in crayon
  const k = clamp(pt / 8);
  const fx = s.x + kidH * 0.16, fy = p.hip[1] - kidH * 0.03;
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(-0.18);
  shape(ctx, rectPts(-44, -32, 88, 62), '#fbf6ea', { seed: 940, b, inkW: 1.6, gaps: 1, pool: 0.3 });
  const tan = '#c98a4a', brown = '#8a5a3b';
  crayonLine(ctx, circlePts(-4, 4, 20, 11, 16).concat([[16, 4]]), tan, 3, k * 5);
  crayonLine(ctx, circlePts(20, -8, 10, 9, 14).concat([[30, -8]]), tan, 3, k * 5 - 1);
  crayonLine(ctx, [[14, -14], [8, -2], [12, -2]], brown, 3, k * 5 - 2);
  crayonLine(ctx, [[-16, 12], [-17, 24], [-10, 13], [-9, 24], [4, 14], [4, 24], [10, 13], [11, 24]], tan, 3, k * 5 - 2.6);
  crayonLine(ctx, [[-24, 2], [-32, -8], [-34, -14]], tan, 3, k * 5 - 3.4);
  if (k > 0.8) { dot(ctx, 23, -10, 1.8, PAL.ink); dot(ctx, 29, -6, 2.2, PAL.ink); }
  ctx.restore();
  shape(ctx, rrectPts(p.handF[0] - 3, p.handF[1] - 16, 6, 18, 2), '#4f7a8a', { seed: 941, b, inkW: 1.4, gaps: 1 });
  return p;
}
// happy upturned eyes, painted over the cast's closed ones
function laughEyes(ctx, p, f, skin, look = 0) {
  const [hx, hy, hr] = p.head, fd = f === 0 ? 1 : f, ex = hx + (f === 0 ? 0 : fd * hr * 0.3) + look * hr * 0.2, ey = hy + hr * 0.08, sp = f === 0 ? hr * 0.38 : hr * 0.33, er = hr * 0.105;
  ctx.save(); ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const exx = ex + s * sp * 0.5 * (f !== 0 && s === -fd ? 0.8 : 1);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(exx, ey - er * 0.2, er * 1.35, 0, TAU); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = hr * 0.07; ctx.beginPath(); ctx.arc(exx, ey + er * 0.4, er * 1.05, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}
/* Mr. Aldana: where he stands and what he is doing, as a function of the beat */
function aldanaState(mode, st, t) {
  const home = HB.aldana, pt = st.pt ?? t;
  if (mode === 'full') return { x: home.x - 10, y: home.y + 34, f: -1, act: 'laugh' };
  if (says(st, 'aldana')) return { x: home.x, y: home.y, f: -1, act: 'talk' };
  if (mode === 'aldana') {
    if (pt < 3.2) return { x: 1178, y: home.y, f: 1, act: 'pour', k: clamp(pt / 3) };
    if (pt < 3.7) return { x: 1178, y: home.y, f: -1, act: 'sip' };
    const w = clamp((pt - 3.7) / 2.2);
    return w < 1 ? { x: lerp(1178, home.x, w), y: home.y, f: -1, act: 'walk' } : { x: home.x, y: home.y, f: -1, act: 'sip' };
  }
  return { x: home.x, y: home.y, f: -1, act: 'sip' };
}
function drawAldana(ctx, t, st, mode) {
  const a = aldanaState(mode, st, t), h = hAt(a.y) + 6, b = boil(t), laugh = a.act === 'laugh', talk = laugh || a.act === 'talk';
  const sip = a.act === 'sip' ? win(frac(t / 6.5) * 6.5, 3.5, 5, 0.35, 0.35) : 0;
  let arms = [[0.35 + sip * 0.25, 2.1 + sip * 0.45], [0.05, 0.1]];
  if (a.act === 'talk') arms = [[1.3 + 0.12 * Math.sin(t * 1.3), 0.35 + 0.15 * Math.sin(t * 2.1)], [0.1, 0.15]];
  if (a.act === 'pour') arms = [[1.15, 0.25], [0.3, 0.9]];
  if (laugh) arms = [[0.6, 1.6], [0.55, 1.7]];
  const bounce = laugh ? Math.abs(Math.sin(t * 5)) * 7 : 0;
  ctx.save(); ctx.translate(0, -bounce);
  const p = person(ctx, { who: laugh ? { ...STYLE.aldana, hairC: '#d9d2c4' } : 'aldana', x: a.x, y: a.y, h, f: a.f, pose: a.act === 'walk' ? 'walk' : 'stand', pace: 2.6, arms, mood: laugh ? 'sleep' : 'calm', speak: talk, t, seed: 17, tilt: laugh ? -0.25 : 0, look: a.f * 0.2 });
  ctx.restore();
  if (a.act === 'pour') {
    // coffee runs from the urn's tap into his cup
    const cx = HB.urn.x, top = HB.table.top - 8;
    cup(ctx, cx, top, 0.7, t, { seed: 77, steam: a.k > 0.4 });
    if (a.k < 1) { ctx.save(); ctx.strokeStyle = '#5e3b27'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, top - 16); ctx.lineTo(cx, top - 6); ctx.stroke(); ctx.restore(); }
  } else if (!laugh && a.act !== 'talk') cup(ctx, p.handF[0] - 4, p.handF[1] + 6, h / 400, t, { seed: 77 });
  if (laugh) laughEyes(ctx, p, -1, STYLE.aldana.skin, -0.2);
  if (laugh) for (let i = 0; i < 3; i++) { const k = frac(t * 0.8 + i / 3); inkLine(ctx, [[a.x + h * 0.12 + i * 8, p.head[1] - p.head[2] * (1.2 + i * 0.25)], [a.x + h * 0.18 + i * 12, p.head[1] - p.head[2] * (1.45 + i * 0.3)]], { w: 3, seed: i, alpha: Math.sin(k * Math.PI) * 0.8 }); }
  dog(ctx, a.x - a.f * h * 0.22, a.y + 16, { t, s: h * 0.24, f: a.f, wag: talk ? 12 : 7, walk: a.act === 'walk' });
  return p;
}
function hallCrowd(ctx, t, st, mode) {
  const v = variantFor(mode, st, t), V = VARIANTS[v];
  // paint the next stage's layers early, while nothing is happening yet, so the switch never stalls a frame
  const next = v === 'mara0' && !(st.p && st.p.turn) ? null : V.next;
  if (next && (st.pt ?? t) > 0.5) { getSet('hallBack', next); getSet('hallFront', next); }
  drawSet(ctx, 'hallBack', v);
  const items = [];
  for (const s of SEATS) {
    if (!liveSeat(s, v)) continue;
    const L = mode === 'meet' && LATE.find((l) => l.id === s.id);
    if (s.role === 'mara') items.push({ y: s.y + (mode === 'speak' ? 60 : 0), fn: () => drawMara(ctx, t, st, mode) });
    else if (s.role === 'wren') items.push({ y: mode === 'full' ? 606 : s.y, fn: () => drawWren(ctx, t, st, mode) });
    else if (L) items.push({ y: latePath(L, s, t).y, fn: () => latecomer(ctx, L, s, t) });
    else items.push({ y: s.y, fn: () => seatPerson(ctx, s, t, st, mode) });
  }
  STANDERS.forEach((p, i) => { if (liveStander(i, v)) items.push({ y: p.y, fn: () => stander(ctx, p, i, t, st, mode) }); });
  items.push({ y: aldanaState(mode, st, t).y, fn: () => drawAldana(ctx, t, st, mode) });
  items.sort((p, q) => p.y - q.y).forEach((it) => it.fn());
  drawSet(ctx, 'hallFront', v);
  if (V.liveArms) frontRowPhones(ctx, t, st);
}

/* ---------- basement shots ---------- */
const WINTER = () => ({ sat: 0.88, tint: '#e9dcc0', tintA: 0.2, vig: 0.85 });
// cam(t, st) picks the framing, so each shot can push in or pull back on its own beat
function hallShot(mode, cam, poolExtra = []) {
  return {
    grade: WINTER,
    draw(ctx, t, st) {
      const c = cam(t, st);
      applyCam(ctx, c);
      drawSet(ctx, 'hall', 'meet');
      windowSnow(ctx, t);
      urnLive(ctx, t);
      if (mode === 'meet') doorLive(ctx, t);
      hallCrowd(ctx, t, st, mode);
      hallMask(ctx, t, 'meet', c, poolExtra);
      applyCam(ctx, c);
      hallLights(ctx, t, 'meet');
    },
  };
}
const camMix = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
// pull back from the door as the latecomers come in, to the whole room
shot('hall.wide', hallShot('meet', (t) => drift(t, { x: 520, y: 470, z: 1.45 }, { x: 960, y: 540, z: 1.0 }, 16)));
// close on the urn while he pours, then back to show the chairs. Push in when he asks her.
shot('hall.aldana', hallShot('aldana', (t, st) => says(st, 'aldana')
  ? drift(st.pt ?? t, { x: 1060, y: 480, z: 1.6 }, { x: 1010, y: 430, z: 2.15 }, 10)
  : drift(st.pt ?? t, { x: 1210, y: 440, z: 2.1 }, { x: 1060, y: 480, z: 1.6 }, 9)));
// push in on Mara and her badge, and pull back when the room turns to look at her
shot('hall.mara', hallShot('mara', (t, st) => {
  const pt = st.pt ?? t, push = drift(pt, { x: 740, y: 520, z: 1.85 }, { x: 730, y: 530, z: 2.15 }, 9);
  return st.p.turn ? camMix(push, { x: 780, y: 480, z: 1.5 }, settle(pt, 5.4, 3)) : push;
}));
shot('hall.speak', hallShot('speak', (t, st) => drift(st.pt ?? t, { x: 800, y: 480, z: 1.5 }, { x: 770, y: 440, z: 1.82 }, 14), [{ x: 760, y: 480, r: 380, a: 1 }]));

function hangingBanner(ctx, t) {
  // the banner hangs by one corner now and turns a little in the draft
  const bn = HB.banner, px = bn.x + bn.w - 20, py = bn.y + 8, b = boil(t);
  ctx.save(); ctx.translate(px, py); ctx.rotate(0.52 + Math.sin(t * 0.7) * 0.035 + Math.sin(t * 1.9) * 0.01); ctx.translate(-px, -py);
  shape(ctx, rectPts(bn.x, bn.y, bn.w, bn.h), '#e6ddc6', { seed: 36, b, boilAmp: 0.6, inkW: 2.2, pool: 0.3 });
  letter(ctx, 'DISPLACED WORKERS MEETING . TUES 7PM', bn.x + bn.w / 2, bn.y + 58, { font: '700 48px Caveat, cursive', align: 'center', color: '#8a6a5a', alpha: 0.7 });
  ctx.restore();
  shape(ctx, rectPts(bn.x + bn.w - 30, bn.y - 4, 22, 16), 'rgba(236,230,210,0.8)', { seed: 37, b, flat: true, inkW: 1.2 });
}
shot('hall.empty', {
  grade: () => ({ sat: 0.45, tint: '#b8c2b6', tintA: 0.34, vig: 0.9 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 960, y: 540, z: 1.02 }, { x: 1080, y: 500, z: 1.2 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'hall', 'empty');
    hangingBanner(ctx, t);
    // a drone crosses the high window now and then
    const { x, y, w, h } = HB.win, ph = frac(t / 11);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const dx = x - 40 + ph * (w + 80), dy = y + 34 + Math.sin(t * 2) * 3;
    shape(ctx, rrectPts(dx - 12, dy - 5, 24, 10, 4), '#4b5a5e', { seed: 1, b: boil(t), inkW: 1.6, gaps: 1 });
    inkLine(ctx, [[dx - 20, dy - 9], [dx + 20, dy - 9]], { w: 2, seed: boil(t) });
    ctx.restore();
    // dust drifting in the one light still on
    const c = ceilPt(HB.fix[1], 90), lit = fixtureLit(t, 1, 'empty');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.06 * lit; ctx.fillStyle = '#f2efe0';
    ctx.beginPath(); ctx.moveTo(c[0] - 130, 92); ctx.lineTo(c[0] + 130, 92); ctx.lineTo(c[0] + 520, 900); ctx.lineTo(c[0] - 520, 900); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const u = frac(hash(i) + t * 0.006 * (0.5 + hash(i + 1))), px = c[0] + (hash(i + 7) - 0.5) * lerp(260, 900, u) + Math.sin(t * 0.3 + i) * 10, py = lerp(110, 880, u);
      dot(ctx, px, py, 1.2 + hash(i + 4) * 1.8, '#f6f2e2', (0.2 + 0.25 * Math.sin(t * 0.7 + i * 1.7) ** 2) * lit);
    }
    ctx.restore();
    hallMask(ctx, t, 'empty', cam, [], 'rgba(30,32,34,0.5)');
    applyCam(ctx, cam);
    hallLights(ctx, t, 'empty');
  },
});

shot('hall.full', {
  grade: () => ({ tint: '#d8e8a8', tintA: 0.3, vig: 0.7 }),
  draw(ctx, t, st) {
    // start on the sheet and the laughing, then pull back to the packed room
    const cam = drift(st.pt ?? t, { x: 980, y: 400, z: 1.7 }, { x: 990, y: 520, z: 1.04 }, 12);
    applyCam(ctx, cam);
    drawSet(ctx, 'hall', 'full');
    urnLive(ctx, t);
    hallCrowd(ctx, t, st, 'full');
    hallLights(ctx, t, 'full');
    glow(ctx, HB.win.x + HB.win.w / 2, HB.win.y + 60, 360, '#fff1c9', 0.4);
  },
});

/* Hearth on the wall. The same basement, lights off, chairs turned to face the picture. */
const HP = { proj: { x: 1080, y: 286, w: 620, h: 280 }, lens: [1052, 650], sign: { x: 1690, y: 612 } };
const HEARTH_ROWS = [[640, [130, 262, 394, 526, 658, 790, 922]], [765, [96, 262, 428, 594, 760, 926]], [905, [60, 262, 464, 666, 868]]];
const HEARTH_SYNC = 7, HEARTH_T = blinking(0.35, 7) ? 1.35 : 0.35;
const hearthPeopleAt = (fn) => HEARTH_ROWS.forEach(([y, xs]) => xs.forEach((x, i) => fn(x, y, crowdStyle(40 + i * 3 + y))));
defineSet('hearthPeople', (ctx) => hearthPeopleAt((x, y, who) => person(ctx, { who, x, y, h: hAt(y), f: 1, pose: 'sit', arms: 'lap', mood: 'smile', t: HEARTH_T, seed: HEARTH_SYNC, look: 0.6 })));
// shut every eye at once, painted over the baked faces with the cast's own head geometry
function hearthBlink(ctx) {
  hearthPeopleAt((x, y, who) => {
    const h = hAt(y) * (who.tall ?? 1), hipY = y - 0.27 * h, shY = hipY - 0.3 * h - Math.sin(HEARTH_T * 1.7 + HEARTH_SYNC) * 0.004 * h;
    const hr = 0.117 * h, hy = shY - 0.135 * h, ex = x + hr * 0.42, ey = hy + hr * 0.08, er = hr * 0.105;
    for (const s of [-1, 1]) {
      const exx = ex + s * hr * 0.165 * (s === -1 ? 0.8 : 1);
      ctx.fillStyle = who.skin; ctx.beginPath(); ctx.arc(exx, ey, er * 1.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = hr * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(exx, ey - er * 0.2, er * 1.05, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  });
}
function strikeSign(ctx, t, x, y) {
  const b = boil(t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.14);
  tube(ctx, [[0, 0], [4, -240]], 10, '#b0784c', { seed: 1, b, inkW: 3 });
  // the cardboard is turned to the wall, and the marker shows through backwards
  shape(ctx, rectPts(-110, -262, 220, 136), '#b89468', { seed: 2, b, inkW: 2.4, shade: { dx: 10, dy: 8, a: 0.2 } });
  ctx.save(); ctx.scale(-1, 1); letter(ctx, 'STRIKE?', 0, -174, { font: '700 64px Caveat, cursive', align: 'center', color: '#4a2e20', alpha: 0.34 }); ctx.restore();
  for (const tx of [-104, 84]) shape(ctx, rectPts(tx, -268, 22, 14), 'rgba(236,230,210,0.7)', { seed: tx, b, flat: true, inkW: 1 });
  ctx.restore();
}
shot('hall.hearth', {
  grade: () => ({ sat: 0.85, tint: '#f2c9a0', tintA: 0.24, vig: 0.9 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 860, y: 480, z: 1.14 }, { x: 1250, y: 470, z: 1.32 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'hall', 'hearth');
    strikeSign(ctx, t, HP.sign.x, HP.sign.y);
    // the projector on its cart
    const b = boil(t), [lx, ly] = HP.lens;
    shape(ctx, rectPts(lx - 70, ly + 44, 150, 16), '#6d6a64', { seed: 3, b, inkW: 2 });
    for (const cx of [lx - 60, lx + 66]) inkLine(ctx, [[cx, ly + 58], [cx, ly + 190]], { w: 4, seed: cx });
    shape(ctx, rectPts(lx - 70, ly + 150, 150, 12), '#6d6a64', { seed: 4, b, inkW: 2 });
    shape(ctx, rrectPts(lx - 60, ly - 6, 110, 50, 8), '#3a3431', { seed: 5, b });
    shape(ctx, circlePts(lx + 46, ly + 18, 16, 18, 14), '#1b1716', { seed: 6, b, inkW: 2 });
    // everyone wears the same smile, nods on the same beat, and blinks on the same beat
    const dip = Math.max(0, Math.sin(t * 1.3)) * 4;
    ctx.save(); ctx.translate(0, dip); drawSet(ctx, 'hearthPeople'); if (blinking(t, HEARTH_SYNC)) hearthBlink(ctx); ctx.restore();
    const P = HP.proj, pt = st.pt ?? t;
    // the old projector's lamp flutters, and now and then it stutters
    const beam = (0.86 + 0.14 * noise1(t * 9)) * (frac(t / 7.3) < 0.05 && hash(Math.floor(t * 20)) < 0.6 ? 0.45 : 1);
    lightMask(ctx, 'rgba(20,14,22,0.66)', [{ x: P.x + P.w / 2, y: P.y + P.h / 2, r: 620, a: beam }, { x: 560, y: 560, r: 700, a: 0.5 }, { x: lx, y: ly, r: 180, a: 0.9 }, { x: HP.sign.x, y: 480, r: 240, a: 0.7 }], camFit(cam));
    applyCam(ctx, cam);
    // the beam, and Hearth big on the cinder block
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.08 * beam; ctx.fillStyle = '#ffe2b0';
    ctx.beginPath(); ctx.moveTo(lx + 46, ly + 8); ctx.lineTo(P.x, P.y); ctx.lineTo(P.x + P.w, P.y); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.lineTo(P.x, P.y + P.h); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.32 * beam; ctx.fillStyle = '#ffe9c0'; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore();
    const hx = P.x + P.w / 2, hy = P.y + P.h * 0.56;
    hearth(ctx, hx, hy, { t, r: 90, speak: true, glowA: 0.5 * beam, seed: 9, look: Math.sin(t * 0.4) * 0.5 });
    ['[1]', '[2]', '[3]'].forEach((s, i) => {
      const k = ease.outBack(clamp((pt - 1.5 - i * 1.1) / 0.5)); if (k <= 0) return;
      ctx.save(); ctx.translate(P.x + 60 + i * 70, P.y + P.h - 36); ctx.scale(k, k);
      letter(ctx, s, 0, 12, { font: '700 36px Caveat, cursive', align: 'center', color: '#8a3a2a', alpha: 0.85 * beam });
      ctx.restore();
    });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) { const u = frac(hash(i) + t * 0.01 * (0.5 + hash(i + 1))), v = hash(i + 7); dot(ctx, lerp(lx + 46, P.x + v * P.w, u), lerp(ly + 8, P.y + hash(i + 9) * P.h, u), 1.3 + hash(i + 4) * 1.4, '#fff3d0', 0.25); }
    ctx.restore();
    glow(ctx, lx + 46, ly + 18, 70, '#fff1c9', 0.8);
  },
});

/* ---------- the walk home ---------- */
const SQ = { lamp: { x: 730, y: 246 }, feetY: 872, xEnd: 770, h: 500 };
defineSet('street', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 660); g.addColorStop(0, '#121c22'); g.addColorStop(1, '#2c3c43');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 700);
  for (let i = 0; i < 6; i++) wash(ctx, blobPoly(200 + i * 320, 120 + (i % 2) * 60, 260, 60, 8, rng(i + 3)), '#3a4a50', { seed: 60 + i, alpha: 0.05, layers: 8 });
  // houses across the street with snow on their roofs, and the church behind her
  const houses = [[-60, 300, 230, 120, '#34424a'], [260, 250, 190, 100, '#3e3a38'], [530, 330, 250, 130, '#2f3a3a'], [880, 270, 200, 110, '#3a3f44'], [1570, 360, 230, 120, '#36403f']];
  const winLit = (x, y, lit) => { ctx.save(); ctx.fillStyle = lit ? '#ffd98a' : '#1d2a30'; ctx.fillRect(x, y, 34, 42); ctx.restore(); inkLoop(ctx, rectPts(x, y, 34, 42), { w: 2, seed: x, gaps: 1, alpha: 0.6 }); };
  houses.forEach(([x, w, hh, rh, c], i) => {
    const base = 648, top = base - hh;
    shape(ctx, rectPts(x, top, w, hh), c, { seed: 70 + i, boilAmp: 0.4 });
    shape(ctx, [[x - 20, top + 4], [x + w / 2, top - rh], [x + w + 20, top + 4]], mix(c, PAL.ink, 0.25), { seed: 80 + i, boilAmp: 0.4 });
    shape(ctx, catmull([[x - 24, top + 6], [x + w / 2, top - rh - 6], [x + w + 24, top + 6], [x + w * 0.8, top - rh * 0.16], [x + w / 2, top - rh * 0.72], [x + w * 0.2, top - rh * 0.14]], 4, true), '#c9d0cc', { seed: 90 + i, boilAmp: 0.4, inkW: 2 });
    for (let k = 0; k < 3; k++) winLit(x + 30 + k * (w - 90) / 2, top + 50, hash(i * 3 + k) > 0.45);
  });
  const ch = { x: 1190, w: 330, top: 360 };
  shape(ctx, rectPts(ch.x, ch.top, ch.w, 648 - ch.top), '#3b3a3c', { seed: 100, boilAmp: 0.4 });
  shape(ctx, [[ch.x - 24, ch.top + 4], [ch.x + ch.w / 2, ch.top - 110], [ch.x + ch.w + 24, ch.top + 4]], '#2a292b', { seed: 101, boilAmp: 0.4 });
  shape(ctx, catmull([[ch.x - 28, ch.top + 6], [ch.x + ch.w / 2, ch.top - 116], [ch.x + ch.w + 28, ch.top + 6], [ch.x + ch.w / 2, ch.top - 80]], 4, true), '#c9d0cc', { seed: 102, boilAmp: 0.4, inkW: 2 });
  shape(ctx, rectPts(ch.x + ch.w - 90, 170, 70, 200), '#3b3a3c', { seed: 103, boilAmp: 0.4 });
  shape(ctx, [[ch.x + ch.w - 100, 174], [ch.x + ch.w - 55, 70], [ch.x + ch.w - 10, 174]], '#2a292b', { seed: 104, boilAmp: 0.4 });
  inkLine(ctx, [[ch.x + ch.w - 55, 70], [ch.x + ch.w - 55, 30]], { w: 3, seed: 105 }); inkLine(ctx, [[ch.x + ch.w - 68, 44], [ch.x + ch.w - 42, 44]], { w: 3, seed: 106 });
  shape(ctx, catmull([[ch.x + 110, 648], [ch.x + 110, 470], [ch.x + 165, 420], [ch.x + 220, 470], [ch.x + 220, 648]], 5, true), '#4a2e24', { seed: 107, boilAmp: 0.4 });
  for (const bx of [ch.x + 20, ch.x + 250]) { ctx.save(); ctx.fillStyle = '#ffd98a'; ctx.fillRect(bx, 618, 60, 24); ctx.restore(); inkLoop(ctx, rectPts(bx, 618, 60, 24), { w: 2, seed: bx, gaps: 1, alpha: 0.6 }); }
  // bare trees
  for (const [tx, s] of [[470, 1], [1080, 0.8], [1880, 1.1]]) {
    tube(ctx, [[tx, 660], [tx + 6, 520 - 60 * s], [tx - 4, 400 - 80 * s]], 14 * s, '#2a2624', { seed: tx, inkW: 3 });
    for (let k = 0; k < 6; k++) { const by = 560 - k * 40 * s, dir = k % 2 ? 1 : -1; inkLine(ctx, [[tx, by], [tx + dir * 60 * s, by - 50 * s], [tx + dir * 90 * s, by - 60 * s]], { w: 4 * s, seed: tx + k, color: '#2a2624' }); inkLine(ctx, [[tx + dir * 20 * s, by - 16 * s], [tx + dir * 70 * s, by - 54 * s]], { w: 3, seed: tx + k + 9, color: '#dfe3df', alpha: 0.7 }); }
  }
  // road under snow, tire tracks, the curb
  ctx.fillStyle = '#9aa3a2'; ctx.fillRect(0, 648, W, 130);
  wash(ctx, rectPts(-40, 648, W + 80, 130), '#b9c0bd', { seed: 110, alpha: 0.08, layers: 10, v: 0.3 });
  for (const ty of [690, 704, 736, 750]) brushDry(ctx, [[-10, ty], [W + 10, ty + 3]], { w: 5, k: 4, alpha: 0.25, seed: ty });
  shape(ctx, catmull([[1440, 700], [1470, 640], [1560, 616], [1720, 614], [1800, 640], [1830, 700]], 5, true), '#6d7a80', { seed: 111 });
  shape(ctx, catmull([[1436, 650], [1500, 612], [1600, 596], [1740, 600], [1820, 630], [1790, 648], [1460, 660]], 5, true), '#dfe3df', { seed: 112, inkW: 2 });
  for (const wx of [1500, 1760]) shape(ctx, circlePts(wx, 702, 28, 26, 14), '#2a2624', { seed: wx, inkW: 2 });
  shape(ctx, rectPts(-10, 772, W + 20, 16), '#aeb6b4', { seed: 113, boilAmp: 0.4, inkW: 2.2 });
  // sidewalk snow where she walks, and a bank of snow in front
  ctx.fillStyle = '#d4d8d2'; ctx.fillRect(0, 786, W, 300);
  wash(ctx, rectPts(-40, 786, W + 80, 170), '#e6e8e2', { seed: 114, alpha: 0.08, layers: 10, v: 0.3 });
  shape(ctx, catmull([[-20, 1100], [-20, 960], [300, 930], [700, 952], [1100, 936], [1500, 956], [1940, 930], [1940, 1100]], 6, true), '#e8eae4', { seed: 115, boilAmp: 0.4 });
  for (let i = 0; i < 9; i++) { const px = 80 + i * 230; shape(ctx, rectPts(px, 930 - 6 * Math.sin(i), 18, 110), '#5e4a3c', { seed: 116 + i, inkW: 2 }); shape(ctx, catmull([[px - 6, 934], [px + 9, 918], [px + 24, 934]], 3, true), '#eef0ea', { seed: 126 + i, inkW: 1.6 }); }
  brushDry(ctx, [[-10, 976], [W + 10, 968]], { w: 6, k: 4, alpha: 0.5, seed: 9 });
  // the streetlight
  const L = SQ.lamp;
  tube(ctx, [[L.x - 90, 800], [L.x - 90, 400], [L.x - 86, 280], [L.x - 50, 240], [L.x - 10, L.y]], 14, '#3c4448', { seed: 130, inkW: 3.2 });
  shape(ctx, [[L.x - 40, L.y - 16], [L.x + 40, L.y - 16], [L.x + 30, L.y + 10], [L.x - 30, L.y + 10]], '#2f3438', { seed: 131 });
  shape(ctx, catmull([[L.x - 42, L.y - 16], [L.x, L.y - 34], [L.x + 42, L.y - 16], [L.x, L.y - 22]], 3, true), '#e6e8e2', { seed: 132, inkW: 1.6 });
});
shot('hall.quiet', {
  grade: () => ({ sat: 0.8, tint: '#aebfc2', tintA: 0.2, vig: 0.95 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 1150, y: 560, z: 1.18 }, { x: 870, y: 580, z: 1.24 }, 16);
    applyCam(ctx, cam);
    drawSet(ctx, 'street');
    const b = boil(t), h = SQ.h, per = 0.0828 * h;
    // she slows as she reaches the light and stops mid-step, feet planted
    const PH = 4 * Math.PI + Math.PI / 2, u = clamp(t / 14), phase = PH * (1 - (1 - u) * (1 - u));
    const mx = SQ.xEnd + per * (PH - phase);
    // footprints behind her, fixed to the ground
    for (let n = 0; n < 30; n++) {
      const fx = SQ.xEnd + 60 + n * 66; if (fx < mx + 50) continue;
      shape(ctx, circlePts(fx, SQ.feetY - 4 + (n % 2 ? 10 : -4), 17, 6, 10), '#a9b3b3', { seed: n, b: 0, inkW: 1.2, gaps: 1, pool: 0.6, alpha: 0.8 });
    }
    const who = { ...STYLE.mara, top: '#4b5a5e', topIn: '#b5552f', pants: '#2f3438' };
    const swing = 0.3 * Math.cos(phase);
    const p = person(ctx, { who, x: mx, y: SQ.feetY, h, f: -1, pose: 'walk', pace: t > 0 ? phase / t : 0, arms: [[0.2, -0.35], [0.08 + swing, 0.15]], mood: 'sad', t, seed: 3, look: 0.1 });
    // scarf, and a hand in the pocket where the badge is
    const [sx, sy] = p.shoulder;
    shape(ctx, catmull([[sx - h * 0.07, sy - h * 0.01], [sx, sy - h * 0.03], [sx + h * 0.07, sy - h * 0.01], [sx, sy + h * 0.035]], 4, true), '#b5552f', { seed: 40, b, inkW: 2.2 });
    tube(ctx, [[sx - h * 0.03, sy + h * 0.01], [sx - h * 0.045, sy + h * 0.08], [sx - h * 0.04 + Math.sin(t * 1.4) * 3, sy + h * 0.14]], h * 0.03, '#b5552f', { seed: 41, b, inkW: 3 });
    const [hx, hy] = p.handF;
    shape(ctx, rrectPts(hx - h * 0.05, hy - h * 0.035, h * 0.1, h * 0.075, 6), '#3f4d52', { seed: 42, b, inkW: 2.2 });
    ctx.save(); ctx.strokeStyle = '#a8432d'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(hx + h * 0.02, hy - h * 0.035, 7, Math.PI, 0); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 5; i++) dot(ctx, p.head[0] + (hash(i) - 0.5) * p.head[2] * 1.5, p.head[1] - p.head[2] * (0.8 + hash(i + 2) * 0.25), 2.4, '#f2f2ec', 0.9);
    // her breath in the cold
    for (let k = 0; k < 2; k++) {
      const ph = frac(t / 2.6 + k * 0.5), bx = p.head[0] - p.head[2] * 1.1 - ph * 60, by = p.head[1] + p.head[2] * 0.4 - ph * 40;
      dot(ctx, bx, by, 8 + ph * 18, '#eef2ee', 0.28 * Math.sin(ph * Math.PI));
    }
    const L = SQ.lamp;
    lightMask(ctx, 'rgba(8,14,20,0.66)', [{ x: L.x, y: SQ.feetY - 60, r: 560, a: 1 }, { x: L.x, y: L.y, r: 220, a: 1 }, { x: 1355, y: 630, r: 220, a: 0.55 }, { x: 900, y: 560, r: 900, a: 0.25 }], camFit(cam));
    applyCam(ctx, cam);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08; ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.moveTo(L.x - 34, L.y + 8); ctx.lineTo(L.x + 34, L.y + 8); ctx.lineTo(L.x + 330, SQ.feetY + 30); ctx.lineTo(L.x - 330, SQ.feetY + 30); ctx.closePath(); ctx.fill(); ctx.restore();
    glow(ctx, L.x, L.y + 6, 260, PAL.lamp, 0.7); dot(ctx, L.x, L.y + 4, 14, '#fff6d8', 0.95);
    glow(ctx, 1355, 630, 200, PAL.lamp, 0.35);
    // snow, brighter where it falls through the lamplight
    for (let i = 0; i < 170; i++) {
      const depth = hash(i + 11), sp = 40 + depth * 70;
      const x = frac(hash(i) + Math.sin(t * 0.3 + i) * 0.01 - t * 0.004) * (W + 80) - 40, y = frac(hash(i + 3) + (t * sp) / 1200) * (H + 40) - 20;
      const near = clamp(1 - Math.hypot(x - L.x, (y - 560) * 0.6) / 520);
      dot(ctx, x, y, 1.4 + depth * 3, '#f4f4ee', 0.35 + near * 0.55);
    }
  },
});

/* ---------- the hearing: a curved dais of twelve, and Mara from behind ---------- */
const HG = { n: 12, speaker: 6, live: [6, 9], mara: { x: 820, y: 1160, h: 780 } };
const seatU = (i) => (i - 5.5) / 5.5;
const daisX = (u) => 960 + u * 800;
const daisTop = (u) => 455 + 100 * u * u;
const daisBase = (u) => 610 + 170 * u * u;
const senH = (u) => 330 + 90 * u * u;
const SUITS = ['#343a3d', '#3c3a36', '#4b5a5e', '#5a4a3e', '#2f3438', '#6e5a48', '#57604a'];
const TIES = ['#8a2f2a', '#4f7a8a', '#6f8a5b', '#8a5a7a', '#c98a4a'];
function senatorStyle(i) {
  if (i === HG.speaker) return STYLE.senator;
  const c = crowdStyle(300 + i * 11);
  return { ...c, hair: c.hair === 'cap' ? 'short' : c.hair, top: SUITS[i % SUITS.length], topIn: '#e8e2d4', tie: TIES[i % TIES.length], mustache: false };
}
function flagOnPole(ctx, x, y0, y1, seed) {
  tube(ctx, [[x, y0], [x, y1]], 8, '#b0784c', { seed, boilAmp: 0.3, inkW: 3 });
  dot(ctx, x, y1 - 10, 11, '#d9b24a', 1);
  const pts = catmull([[x + 4, y1 + 12], [x + 90, y1 + 30], [x + 120, y1 + 120], [x + 96, y1 + 210], [x + 118, y1 + 290], [x + 30, y1 + 300], [x + 4, y1 + 250]], 5, true);
  ctx.save(); const path = new Path2D(); tracePath(path, pts); ctx.clip(path);
  // seven plain stripes: a made-up banner, not any real country's flag
  for (let k = 0; k < 7; k++) { ctx.fillStyle = pigment(ctx, k % 2 ? '#efe4cf' : '#d99a3d'); ctx.fillRect(x - 10, y1 + k * 44, 160, 46); }
  ctx.restore();
  inkLoop(ctx, pts, { w: 2.6, seed, gaps: 2 });
  for (const fx of [40, 78]) inkLine(ctx, [[x + fx, y1 + 30], [x + fx + 10, y1 + 140], [x + fx - 4, y1 + 280]], { w: 2, seed: seed + fx, alpha: 0.35 });
}
defineSet('hearing', (ctx) => {
  ctx.fillStyle = '#6e4630'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, 700), '#7d5237', { seed: 1, alpha: 0.08, layers: 12 });
  // paneling
  for (let i = 0; i < 9; i++) {
    const px = 30 + i * 214;
    shape(ctx, rectPts(px, 90, 180, 250), '#7a5034', { seed: 10 + i, boilAmp: 0.4, inkW: 2.2, shade: { dx: 6, dy: 6, a: 0.2 } });
    shape(ctx, rectPts(px, 370, 180, 200), '#7a5034', { seed: 20 + i, boilAmp: 0.4, inkW: 2.2, shade: { dx: 6, dy: 6, a: 0.2 } });
  }
  shape(ctx, rectPts(-10, 30, W + 20, 34), '#8a5a3b', { seed: 2, boilAmp: 0.4, inkW: 2.4 });
  shape(ctx, rectPts(-10, 346, W + 20, 16), '#8a5a3b', { seed: 3, boilAmp: 0.4, inkW: 2.2 });
  // a plain clock, and brass sconces
  shape(ctx, circlePts(960, 170, 60, 60, 30), '#5e3b27', { seed: 4, inkW: 2.6 });
  shape(ctx, circlePts(960, 170, 48, 48, 30), '#f2e6cc', { seed: 5, inkW: 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; inkLine(ctx, [[960 + Math.cos(a) * 38, 170 + Math.sin(a) * 38], [960 + Math.cos(a) * 44, 170 + Math.sin(a) * 44]], { w: i % 3 ? 2 : 3.4, seed: i }); }
  for (const sx of [520, 1400]) { shape(ctx, rectPts(sx - 6, 210, 12, 40), '#b08a3e', { seed: sx, inkW: 2 }); shape(ctx, [[sx - 26, 206], [sx + 26, 206], [sx + 18, 170], [sx - 18, 170]], '#f2dca0', { seed: sx + 1, inkW: 2 }); }
  flagOnPole(ctx, 300, 520, 110, 40);
  flagOnPole(ctx, 1600, 520, 110, 50);
  // the chairs behind the dais
  for (let i = 0; i < HG.n; i++) {
    const u = seatU(i), x = daisX(u), h = senH(u), top = daisTop(u);
    shape(ctx, rrectPts(x - 0.17 * h, top - 0.56 * h, 0.34 * h, 0.6 * h, 0.08 * h), '#6b2f2a', { seed: 60 + i, boilAmp: 0.4, inkW: 2.4 });
    for (let k = 0; k < 5; k++) dot(ctx, x - 0.13 * h + k * 0.065 * h, top - 0.53 * h, 2.4, '#d9b24a', 0.8);
  }
  for (let i = 0; i < HG.n; i++) if (!HG.live.includes(i)) senator(ctx, i, 0.35, { p: {} }, {});
  // the well: carpet between the dais and the witness table
  ctx.fillStyle = '#6b2f2a'; ctx.fillRect(0, 600, W, H - 600);
  wash(ctx, rectPts(-40, 600, W + 80, 500), '#7a3b3b', { seed: 6, alpha: 0.08, layers: 10 });
  for (let i = 0; i < 40; i++) dot(ctx, hash(i) * W, 640 + hash(i + 3) * 400, 5, '#a0523c', 0.35);
});
defineSet('hearingFront', (ctx) => {
  // the dais front, curving toward the witness at both ends
  const top = [], base = [];
  for (let x = -40; x <= W + 40; x += 40) { const u = (x - 960) / 800; top.push([x, daisTop(u)]); base.push([x, daisBase(u)]); }
  shape(ctx, top.concat(base.slice().reverse()), '#5e3b27', { seed: 1, boilAmp: 0.3, shade: { dx: 0, dy: 20, a: 0.15 } });
  for (let i = 0; i <= HG.n; i++) { const u = seatU(i - 0.5), x = daisX(u); inkLine(ctx, [[x, daisTop(u) + 20], [x, daisBase(u) - 6]], { w: 2.4, seed: i, alpha: 0.5 }); }
  for (let i = 0; i < HG.n; i++) { const u = seatU(i), x = daisX(u), h = senH(u); shape(ctx, rectPts(x - 0.12 * h, daisTop(u) + 34, 0.24 * h, daisBase(u) - daisTop(u) - 64), '#6e4630', { seed: 20 + i, boilAmp: 0.3, inkW: 2 }); }
  const ledge = top.map(([x, y]) => [x, y - 8]).concat(top.slice().reverse().map(([x, y]) => [x, y + 14]));
  shape(ctx, ledge, '#8a5a3b', { seed: 2, boilAmp: 0.3, inkW: 2.4 });
  // blank nameplates and a microphone at every seat
  for (let i = 0; i < HG.n; i++) {
    const u = seatU(i), x = daisX(u), h = senH(u), y = daisTop(u) - 6;
    const mx = x + (i === HG.speaker ? -0.14 : 0.12) * h;
    tube(ctx, [[mx, y], [mx, y - 0.1 * h], [lerp(mx, x, 0.4), y - 0.2 * h]], 3, '#2f3438', { seed: 30 + i, boilAmp: 0.3, inkW: 2 });
    shape(ctx, circlePts(lerp(mx, x, 0.4), y - 0.21 * h, 0.018 * h, 0.022 * h, 10), '#3a3431', { seed: 40 + i, boilAmp: 0.3, inkW: 1.6 });
    shape(ctx, rectPts(x - 0.13 * h, y - 0.075 * h, 0.26 * h, 0.075 * h), '#efe6d2', { seed: 50 + i, boilAmp: 0.3, inkW: 2, pool: 0.3 });
  }
  // the witness table, seen from the witness chair
  shape(ctx, [[340, 800], [1500, 800], [1560, 870], [280, 870]], '#4f6b5a', { seed: 3, boilAmp: 0.3 });
  shape(ctx, rectPts(270, 866, 1300, 26), '#5e3b27', { seed: 4, boilAmp: 0.3, inkW: 2.4 });
  ctx.fillStyle = '#231a16'; ctx.fillRect(270, 890, 1300, 200);
  for (let i = 0; i < 3; i++) shape(ctx, [[480 + i * 4, 812 - i * 5], [680 + i * 4, 812 - i * 5], [700 + i * 4, 846 - i * 5], [460 + i * 4, 846 - i * 5]], '#f4efe4', { seed: 6 + i, boilAmp: 0.3, inkW: 1.6, pool: 0.3 });
  // water glass
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#d9e8e4'; fillPts(ctx, [[1166, 772], [1214, 772], [1208, 842], [1172, 842]]); ctx.globalAlpha = 0.45; ctx.fillStyle = '#9fc4c0'; fillPts(ctx, [[1169, 796], [1211, 796], [1208, 842], [1172, 842]]); ctx.restore();
  inkLoop(ctx, [[1166, 772], [1214, 772], [1208, 842], [1172, 842]], { w: 2, seed: 7, gaps: 2, alpha: 0.7 });
  ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1176, 780); ctx.lineTo(1178, 832); ctx.stroke(); ctx.restore();
  // her microphone
  shape(ctx, catmull([[970, 846], [1040, 846], [1030, 832], [980, 832]], 3, true), '#2f3438', { seed: 8, inkW: 2 });
  tube(ctx, [[1005, 836], [1012, 720], [985, 632], [950, 604]], 5, '#2f3438', { seed: 9, inkW: 2.4 });
  shape(ctx, circlePts(942, 600, 14, 18, 12), '#3a3431', { seed: 10, inkW: 1.8 });
});
function hearingRoom(ctx, t, st, o = {}) {
  drawSet(ctx, 'hearing');
  for (const i of HG.live) senator(ctx, i, t, st, o);
  drawSet(ctx, 'hearingFront');
  backFig(ctx, { who: 'mara', x: HG.mara.x, y: HG.mara.y, h: HG.mara.h, t, seed: 3, lanyard: true, turn: 0.2 });
  shape(ctx, rrectPts(HG.mara.x - 170, 1000, 340, 140, 30), '#6b2f2a', { seed: 11, b: boil(t), inkW: 2.6 });
  for (let k = 0; k < 7; k++) dot(ctx, HG.mara.x - 140 + k * 46, 1018, 4, '#d9b24a', 0.8);
}
function senator(ctx, i, t, st, o) {
  const u = seatU(i), x = daisX(u), h = senH(u), top = daisTop(u), sp = i === HG.speaker;
  const f = sp ? -1 : u < -0.62 ? 1 : u > 0.62 ? -1 : 0;
  const talk = sp && (says(st, 'senator') || o.talk);
  const lean = sp ? lerp(0.3, 1.2, o.lean ?? (talk ? 1 : 0)) : 0;
  let arms = [[0.22, 1.05], [0.22, 1.05]];
  // the chair lifts the gavel and brings it down
  const lift = sp && o.gavel != null ? settle(o.gavel, 1.4, 0.7) - settle(o.gavel, 2.6, 0.16) : 0;
  if (lift > 0) arms = [[lerp(0.3, 2.5, lift), lerp(1.0, 0.35, lift)], [0.22, 1.05]];
  const look = o.glance != null && !sp ? Math.sin(o.glance * 0.9 + i * 2) * 0.9 : clamp((HG.mara.x - x) / 900, -1, 1);
  const p = person(ctx, { who: senatorStyle(i), x, y: top + 0.37 * h, h, f, pose: 'sit', arms, mood: sp ? 'calm' : hash(i) < 0.4 ? 'worry' : 'calm', speak: talk, lean, tilt: sp ? -0.35 * (o.lean ?? (talk ? 1 : 0)) : 0, look, t, seed: 200 + i * 13 });
  if (sp && o.gavel != null) {
    const [gx, gy] = p.handF, b = boil(t);
    tube(ctx, [[gx, gy], [gx - 30, gy - 6]], 5, '#8a5a3b', { seed: 5, b, inkW: 2 });
    shape(ctx, rrectPts(gx - 46, gy - 20, 20, 30, 5), '#6e4630', { seed: 6, b, inkW: 2 });
    const hit = o.gavel - 2.76;
    if (hit > 0 && hit < 0.5) for (let k = 0; k < 4; k++) { const a = -Math.PI * (0.15 + k * 0.23); inkLine(ctx, [[gx - 36 + Math.cos(a) * 24, gy + 10 + Math.sin(a) * 18], [gx - 36 + Math.cos(a) * 44, gy + 10 + Math.sin(a) * 32]], { w: 3, seed: k, alpha: 1 - hit * 2 }); }
  }
}
function hearingClock(ctx, t) {
  const cx = 960, cy = 170, sec = Math.floor(t) / 60, ang = (k) => k * TAU - Math.PI / 2;
  inkLine(ctx, [[cx, cy], [cx + Math.cos(ang(0.3)) * 24, cy + Math.sin(ang(0.3)) * 24]], { w: 5, seed: 1, t0: 0.05, t1: 0.1 });
  inkLine(ctx, [[cx, cy], [cx + Math.cos(ang(0.07)) * 36, cy + Math.sin(ang(0.07)) * 36]], { w: 3.4, seed: 2, t0: 0.05, t1: 0.1 });
  ctx.save(); ctx.strokeStyle = '#a0523c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang(sec)) * 40, cy + Math.sin(ang(sec)) * 40); ctx.stroke(); ctx.restore();
  dot(ctx, cx, cy, 4, PAL.ink);
}
function hearingLight(ctx, t, cam) {
  const sp = daisX(seatU(HG.speaker));
  lightMask(ctx, 'rgba(24,14,10,0.34)', [{ x: 960, y: 380, r: 900, a: 0.8 }, { x: sp, y: 360, r: 300, a: 1 }, { x: HG.mara.x, y: 700, r: 500, a: 0.7 }], camFit(cam));
  applyCam(ctx, cam);
  for (const sx of [520, 1400]) glow(ctx, sx, 190, 180, PAL.lamp, 0.5);
}
const HEARING_GRADE = () => ({ sat: 0.82, tint: '#e8c9a0', tintA: 0.2, vig: 0.9 });
shot('hearing.wide', {
  grade: HEARING_GRADE,
  draw(ctx, t, st) {
    // start at her shoulder and pull back to the dais of twelve as the chair gavels the room to order
    const pt = st.pt ?? t, cam = drift(pt, { x: 840, y: 640, z: 1.75 }, { x: 960, y: 540, z: 1.0 }, 9);
    applyCam(ctx, cam);
    hearingRoom(ctx, t, st, { gavel: pt });
    hearingClock(ctx, t);
    hearingLight(ctx, t, cam);
  },
});
shot('hearing.close', {
  grade: HEARING_GRADE,
  draw(ctx, t, st) {
    // on the question he leans into his mic. After it the camera moves in behind her.
    const pt = st.pt ?? t, asking = says(st, 'senator');
    const A = { x: 950, y: 470, z: 2.1 }, B = { x: 985, y: 440, z: 2.35 }, M = { x: 880, y: 545, z: 2.5 };
    const cam = asking ? drift(pt, A, B, 5) : drift(pt, B, M, 12);
    applyCam(ctx, cam);
    hearingRoom(ctx, t, st, { lean: asking ? settle(pt, 0.2, 1.4) : 1 - settle(pt, 0.4, 2.2), glance: asking ? null : pt, talk: asking });
    hearingLight(ctx, t, cam);
  },
});

/* ---------- the stolen model: a drive in the dark, passed hand to hand, then across an ocean ---------- */
const NET = (() => {
  const r = rng(77), nodes = [];
  for (let i = 0; i < 170; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    nodes.push([880 + Math.cos(a) * d * 820 + (r() - 0.5) * 80, 430 + Math.sin(a) * d * 360 + (r() - 0.5) * 60, r()]);
  }
  const edges = [];
  nodes.forEach((p, i) => {
    const near = nodes.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1]), j]).filter(([d, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 3);
    for (const [, j] of near) if (j > i) edges.push([i, j]);
  });
  return { nodes, edges };
})();
defineSet('drive', (ctx) => {
  ctx.fillStyle = '#0d1316'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#16222a', { seed: 1, alpha: 0.1, layers: 10 });
  wash(ctx, blobPoly(880, 430, 760, 340, 10, rng(5)), '#1d3033', { seed: 2, alpha: 0.06, layers: 12 });
  ctx.save(); ctx.strokeStyle = PAL.frost; ctx.lineCap = 'round';
  for (const [i, j] of NET.edges) { const a = NET.nodes[i], b = NET.nodes[j]; ctx.globalAlpha = 0.07 + 0.08 * a[2]; ctx.lineWidth = 1.2 + a[2]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.restore();
  for (const [x, y, k] of NET.nodes) { dot(ctx, x, y, 2 + k * 3, PAL.frost, 0.25 + k * 0.35); if (k > 0.8) glow(ctx, x, y, 24, PAL.frost, 0.25); }
});
// a painted chart of two made-up coasts and the sea between them
const MAP = { from: [360, 560], to: [1530, 470], via: [940, 190], farm: { x: 1440, y: 380, cols: 22, rows: 14, gap: 13 } };
defineSet('map', (ctx) => {
  ctx.fillStyle = '#16262c'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#1f353c', { seed: 1, alpha: 0.12, layers: 12 });
  for (let i = 0; i < 60; i++) { const x = hash(i) * W, y = 120 + hash(i + 3) * 860; inkLine(ctx, [[x, y], [x + 16, y - 5], [x + 32, y]], { w: 2, seed: i, color: '#4f7a8a', alpha: 0.35 }); }
  ctx.save(); ctx.strokeStyle = '#4f7a8a'; ctx.globalAlpha = 0.18; ctx.lineWidth = 1.4; ctx.setLineDash([4, 8]);
  for (let x = 120; x < W; x += 240) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, H); ctx.stroke(); }
  for (let y = 120; y < H; y += 200) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W / 2, y - 40, W, y); ctx.stroke(); }
  ctx.restore();
  shape(ctx, catmull([[-40, 120], [220, 160], [380, 300], [430, 520], [360, 700], [420, 860], [300, 1000], [-40, 1100]], 6, true), '#3f5a4a', { seed: 2 });
  shape(ctx, catmull([[W + 40, 80], [1640, 150], [1520, 300], [1490, 470], [1560, 640], [1500, 820], [1620, 1000], [W + 40, 1100]], 6, true), '#46584a', { seed: 3 });
  for (const [x, y] of [[160, 400], [250, 760], [1760, 300], [1700, 760]]) wash(ctx, blobPoly(x, y, 90, 60, 8, rng(x)), '#5d7a52', { seed: x, alpha: 0.12, layers: 8, v: 0.3 });
  // a compass rose
  const cx = 960, cy = 900;
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; shape(ctx, [[cx, cy], [cx + Math.cos(a + 0.25) * 22, cy + Math.sin(a + 0.25) * 22], [cx + Math.cos(a) * 70, cy + Math.sin(a) * 70], [cx + Math.cos(a - 0.25) * 22, cy + Math.sin(a - 0.25) * 22]], k % 2 ? '#8a7a64' : '#d9c6a0', { seed: 10 + k, inkW: 1.8 }); }
  dot(ctx, MAP.from[0], MAP.from[1], 7, '#d9c6a0', 0.9);
  const F = MAP.farm;
  shape(ctx, rectPts(F.x - 16, F.y - 16, F.cols * F.gap + 20, F.rows * F.gap + 20), '#2a3a36', { seed: 20, inkW: 2 });
});
const bez = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
function thumbDrive(ctx, t, b) {
  shape(ctx, rrectPts(-34, -150, 68, 70, 6), '#aab4b4', { seed: 2, b, inkW: 2.6 });
  for (const sx of [-16, 6]) shape(ctx, rectPts(sx, -134, 10, 12), '#2f3438', { seed: 3 + sx, b, inkW: 1.4, gaps: 1 });
  shape(ctx, rrectPts(-50, -86, 100, 200, 16), '#3a4448', { seed: 4, b, shade: { dx: 10, dy: 0, a: 0.25 } });
  ctx.fillStyle = PAL.frost; ctx.globalAlpha = 0.85; fillPts(ctx, rrectPts(-32, -60, 64, 12, 5)); ctx.globalAlpha = 1;
  dot(ctx, 0, -20, 8, '#dff5f0', 0.6 + 0.4 * Math.sin(t * 3.1));
}
// a gloved fist and its sleeve, in the drive's frame. mirror flips it to come from the left.
function fist(ctx, t, b, glove, sleeve, mirror = 1) {
  ctx.save(); ctx.scale(mirror, 1);
  tube(ctx, [[40, 220], [130, 420], [210, 760]], 150, sleeve, { seed: 1 + mirror, b, inkW: 4 });
  tube(ctx, [[30, 210], [52, 262]], 150, mix(sleeve, '#ffffff', 0.1), { seed: 12 + mirror, b, inkW: 4 });
  shape(ctx, catmull([[-86, 60], [-60, 34], [-10, 30], [40, 34], [88, 50], [110, 120], [96, 210], [20, 250], [-70, 226], [-104, 150]], 5, true), glove, { seed: 5 + mirror, b, shade: { dx: 14, dy: 10, a: 0.25 } });
  for (let k = 0; k < 4; k++) inkLine(ctx, [[-70 + k * 44, 60], [-58 + k * 44, 110]], { w: 2.6, seed: 6 + k, alpha: 0.6 });
  tube(ctx, [[-96, 150], [-92, 60], [-48, 2], [-12, -6]], 46, mix(glove, '#ffffff', 0.06), { seed: 9 + mirror, b, inkW: 4.4 });
  ctx.restore();
}
const DRV = { hold: 4.2, pass: 5.4, passD: 0.7, map: 7.0, go: 8.3, goD: 4.6 };
shot('hearing.drive', {
  grade: () => ({ sat: 0.75, vig: 1.0 }),
  draw(ctx, t, st) {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const mapK = settle(t, DRV.map, 1.6), b = boil(t);
    if (mapK < 1) {
      drawSet(ctx, 'drive');
      // the ghost network breathes: a few stars brighten, and light runs along some threads
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const n = NET.nodes[(i * 37) % NET.nodes.length], k = Math.sin(t * (0.6 + hash(i) * 0.8) + i) ** 8; dot(ctx, n[0], n[1], 3 + k * 3, '#dff5f0', 0.15 + k * 0.6); }
      for (let i = 0; i < 16; i++) { const e = NET.edges[(i * 53) % NET.edges.length], a = NET.nodes[e[0]], c = NET.nodes[e[1]], u = frac(t * 0.4 + hash(i)); dot(ctx, lerp(a[0], c[0], u), lerp(a[1], c[1], u), 2.6, '#dff5f0', 0.5 * Math.sin(u * Math.PI)); }
      ctx.restore();
      // hand A holds it up and reaches toward the middle. Hand B comes in from the left and takes it.
      const A = { x: lerp(1180, 1010, settle(t, DRV.hold, 1.2)) + settle(t, DRV.pass + DRV.passD, 1.4) * 700, y: 470 + Math.sin(t * 0.8) * 4 + settle(t, DRV.pass + DRV.passD, 1.4) * 400, r: -0.3 };
      const B = { x: lerp(-360, 820, settle(t, DRV.hold, 1.3)) - settle(t, DRV.map - 0.6, 1.6) * 900, y: 520 + settle(t, DRV.map - 0.6, 1.6) * 80, r: 0.32 };
      const k = settle(t, DRV.pass, DRV.passD), D = { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), r: lerp(A.r, B.r, k) };
      if (t < DRV.pass + 0.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 130; i++) {
          const n = NET.nodes[(i * 19) % NET.nodes.length], u = frac(t * 0.08 + hash(i + 3)), e = ease.in(u);
          dot(ctx, lerp(n[0], D.x + Math.sin(D.r) * 150, e), lerp(n[1], D.y - Math.cos(D.r) * 150, e), 1.8 + (1 - u) * 1.6, '#dff5f0', 0.7 * Math.sin(u * Math.PI) * (1 - settle(t, DRV.pass - 0.8, 1)));
        }
        ctx.restore();
      }
      glow(ctx, D.x, D.y - 40, 520, PAL.frost, 0.55);
      ctx.save(); ctx.translate(D.x, D.y); ctx.rotate(D.r); thumbDrive(ctx, t, b); ctx.restore();
      for (const [H2, gl, sl, m] of [[A, '#4a565b', '#262c30', 1], [B, '#6a5646', '#3c3a36', -1]]) { ctx.save(); ctx.translate(H2.x, H2.y); ctx.rotate(H2.r); fist(ctx, t, b, gl, sl, m); ctx.restore(); }
      glow(ctx, D.x, D.y - 70, 220, PAL.frost, 0.5);
    }
    if (mapK > 0) {
      // the drive crosses the sea on a dotted line, and on the far shore a field of chips lights up
      drawSet(ctx, 'map', '', mapK);
      const u = settle(t, DRV.go, DRV.goD), P = bez(MAP.from, MAP.via, MAP.to, u);
      ctx.save(); ctx.globalAlpha = mapK; ctx.fillStyle = '#d9c6a0';
      for (let s = 0; s <= 1; s += 0.02) { const q = bez(MAP.from, MAP.via, MAP.to, s); ctx.globalAlpha = mapK * (s <= u ? 0.9 : 0.25); ctx.beginPath(); ctx.arc(q[0], q[1], s <= u ? 3.4 : 2.2, 0, TAU); ctx.fill(); }
      ctx.restore();
      const land = t - (DRV.go + DRV.goD), F = MAP.farm;
      if (land > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < F.rows; r++) for (let c = 0; c < F.cols; c++) {
          const x = F.x + c * F.gap, y = F.y + r * F.gap, on = clamp((land - Math.hypot(x - MAP.to[0], y - MAP.to[1]) / 260) * 3);
          if (on <= 0) continue;
          ctx.globalAlpha = mapK * on * (0.55 + 0.45 * hash(Math.floor(t * 3) + r * 31 + c)); ctx.fillStyle = '#bfe8e2'; ctx.fillRect(x - 4, y - 4, 8, 8);
        }
        ctx.restore();
        glow(ctx, F.x + F.cols * F.gap / 2, F.y + F.rows * F.gap / 2, 360, PAL.frost, 0.45 * clamp(land / 2) * mapK);
      }
      if (u < 1) {
        glow(ctx, P[0], P[1], 120, PAL.frost, 0.8 * mapK);
        const q = bez(MAP.from, MAP.via, MAP.to, Math.min(1, u + 0.01)), ang = Math.atan2(q[1] - P[1], q[0] - P[0]) + Math.PI / 2;
        ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(ang); ctx.scale(0.28, 0.28); if (mapK > 0.95) thumbDrive(ctx, t, b); ctx.restore();
      }
    }
  },
});

/* ---------- after the race: the building in the desert ---------- */
const BK = { door: { x: 1010, y: 740, w: 64, h: 96 }, reader: { x: 1096, y: 690 }, floods: [[390, 300], [1740, 300], [1042, 610]], mast: [700, 96], mara: { x: 980, y: 742, h: 124 } };
function truck(ctx, x, s, c, dir, t, seed) {
  // a box truck, cab toward dir, nobody in the cab
  const b = boil(t), y = 760, bx = dir > 0 ? x : x + 80 * s;
  shape(ctx, rectPts(bx, y - 140 * s, 180 * s, 120 * s), c, { seed, b, boilAmp: 0.4 });
  const cab = dir > 0 ? x + 180 * s : x;
  shape(ctx, catmull(dir > 0 ? [[cab, y - 20 * s], [cab, y - 96 * s], [cab + 56 * s, y - 96 * s], [cab + 80 * s, y - 56 * s], [cab + 80 * s, y - 20 * s]] : [[cab + 80 * s, y - 20 * s], [cab + 80 * s, y - 96 * s], [cab + 24 * s, y - 96 * s], [cab, y - 56 * s], [cab, y - 20 * s]], 3, true), mix(c, PAL.ink, 0.1), { seed: seed + 1, b, boilAmp: 0.4 });
  shape(ctx, rectPts(cab + (dir > 0 ? 16 : 30) * s, y - 88 * s, 34 * s, 30 * s), '#3a4448', { seed: seed + 2, b, inkW: 1.8 });
  dot(ctx, cab + (dir > 0 ? 38 : 42) * s, y - 70 * s, 3 * s, PAL.frost, 0.9);
  const spin = -t * 6 * dir;
  for (const wx of [x + 40 * s, x + 140 * s, x + 220 * s]) { shape(ctx, circlePts(wx, y - 12 * s, 22 * s, 22 * s, 12), '#2a2624', { seed: wx, b, inkW: 2 }); inkLine(ctx, [[wx + Math.cos(spin) * 14 * s, y - 12 * s + Math.sin(spin) * 14 * s], [wx - Math.cos(spin) * 14 * s, y - 12 * s - Math.sin(spin) * 14 * s]], { w: 2, seed: 1, color: '#6d7a80' }); }
  return [cab + (dir > 0 ? 80 * s : 0), y - 34 * s];
}
defineSet('bunker', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 580); g.addColorStop(0, '#26343b'); g.addColorStop(0.5, '#9a5f48'); g.addColorStop(1, '#f2ad6e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 600);
  for (let i = 0; i < 30; i++) dot(ctx, hash(i) * W, hash(i + 5) * 200, 1 + hash(i + 2) * 1.4, '#f6ecd0', 0.6);
  for (let i = 0; i < 4; i++) wash(ctx, blobPoly(300 + i * 450, 360 + (i % 2) * 40, 260, 26, 7, rng(i + 9)), '#e8b88a', { seed: 20 + i, alpha: 0.08, layers: 8 });
  shape(ctx, catmull([[-20, 580], [-20, 470], [140, 466], [200, 500], [420, 500], [470, 530], [760, 540], [980, 520], [1300, 540], [1360, 480], [1600, 474], [1660, 520], [1940, 520], [1940, 580]], 5, true), '#6e4a3e', { seed: 30, boilAmp: 0.4 });
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, 560, W, H - 560);
  wash(ctx, rectPts(-40, 560, W + 80, 540), '#a07a50', { seed: 31, alpha: 0.08, layers: 12 });
  wash(ctx, rectPts(-40, 860, W + 80, 260), '#7a5a3a', { seed: 32, alpha: 0.1, layers: 10, v: 0.3 });
  for (let i = 0; i < 18; i++) shape(ctx, blobPoly(hash(i) * W, 620 + hash(i + 4) * 420, 26 + hash(i + 1) * 24, 12 + hash(i + 2) * 8, 7, rng(i + 40)), '#8c8a4a', { seed: 40 + i, boilAmp: 0.4, inkW: 1.8 });
  brushDry(ctx, [[200, 1080], [760, 760], [980, 745]], { w: 10, k: 5, alpha: 0.25, seed: 5 });
  brushDry(ctx, [[340, 1080], [820, 770], [1000, 748]], { w: 10, k: 5, alpha: 0.25, seed: 6 });
  // the building: no windows at all
  const bx = 560, by = 250, bw = 1010, bh = 492;
  shape(ctx, rectPts(bx, by, bw, bh), '#8f8c84', { seed: 50, boilAmp: 0.4, shade: { dx: -30, dy: 0, a: 0.15 } });
  shape(ctx, rectPts(bx - 12, by - 20, bw + 24, 26), '#a8a49a', { seed: 51, boilAmp: 0.4, inkW: 2.4 });
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.8;
  for (let x = bx + 126; x < bx + bw; x += 126) { ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke(); }
  for (let y = by + 123; y < by + bh; y += 123) { ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); ctx.stroke(); }
  ctx.restore();
  for (const [ux, uw] of [[640, 160], [880, 110], [1300, 190]]) { shape(ctx, rectPts(ux, by - 70, uw, 52), '#6d7a80', { seed: ux, boilAmp: 0.4, inkW: 2.2 }); for (let k = 0; k < uw / 20; k++) inkLine(ctx, [[ux + 10 + k * 20, by - 60], [ux + 10 + k * 20, by - 28]], { w: 1.6, seed: ux + k, alpha: 0.5 }); }
  tube(ctx, [[BK.mast[0], by - 20], [BK.mast[0], BK.mast[1]]], 6, '#4b5a5e', { seed: 52, inkW: 2.4 });
  for (let k = 0; k < 4; k++) inkLine(ctx, [[BK.mast[0] - 20 + k * 3, by - 40 - k * 36], [BK.mast[0] + 20 - k * 3, by - 40 - k * 36]], { w: 2, seed: 53 + k });
  shape(ctx, rectPts(1330, 600, 190, 142), '#7a7870', { seed: 54, boilAmp: 0.4, inkW: 2.2 });
  for (let k = 1; k < 8; k++) inkLine(ctx, [[1332, 600 + k * 17], [1518, 600 + k * 17]], { w: 1.6, seed: 55 + k, alpha: 0.5 });
  const d = BK.door;
  shape(ctx, rectPts(d.x - 8, d.y - d.h - 8, d.w + 16, d.h + 8), '#5c5a55', { seed: 56, inkW: 2.2 });
  ctx.fillStyle = '#cfe8e3'; ctx.fillRect(d.x, d.y - d.h, d.w, d.h);
  shape(ctx, rectPts(BK.reader.x - 10, BK.reader.y - 16, 20, 30), '#3a3431', { seed: 58, inkW: 1.8 });
  shape(ctx, rectPts(d.x - 40, d.y - d.h - 40, d.w + 80, 16), '#5c5a55', { seed: 59, inkW: 2 });
  truck(ctx, 150, 1, '#e2ddd0', 1, 0, 150);
  for (const [fx, fy] of BK.floods.slice(0, 2)) { tube(ctx, [[fx, 800], [fx, fy]], 10, '#4b5a5e', { seed: fx, inkW: 3 }); shape(ctx, rectPts(fx - 34, fy - 16, 68, 24), '#3a3431', { seed: fx + 1, inkW: 2 }); }
});
// the fence is its own layer, in front of everything that moves
defineSet('bunkerFence', (ctx) => {
  const fy0 = 812, fy1 = 1000;
  for (let x = -20; x < W + 40; x += 200) tube(ctx, [[x, fy1 + 30], [x, fy0 - 40]], 9, '#6d7a80', { seed: x, inkW: 3 });
  ctx.save(); ctx.strokeStyle = '#4b5a5e'; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.4;
  for (let k = -40; k < 140; k++) { ctx.beginPath(); ctx.moveTo(k * 16, fy0); ctx.lineTo(k * 16 + (fy1 - fy0), fy1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k * 16, fy0); ctx.lineTo(k * 16 - (fy1 - fy0), fy1); ctx.stroke(); }
  ctx.restore();
  inkLine(ctx, [[-20, fy0], [W + 20, fy0]], { w: 3.4, seed: 70 });
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.ellipse(x, fy0 - 26, 20, 16, 0.3, 0, TAU); ctx.stroke(); }
  ctx.restore();
});
shot('hearing.bunker', {
  grade: () => ({ sat: 0.82, tint: '#9fd3cb', tintA: 0.12, vig: 0.88 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 960, y: 540, z: 1.0 }, { x: 1010, y: 600, z: 1.3 }, 25);
    applyCam(ctx, cam);
    drawSet(ctx, 'bunker');
    const d = BK.door, m = BK.mara, b = boil(t);
    // the empty truck pulls away on its own
    const tx = 380 - ease.in(clamp((pt - 2.5) / 14)) * 900;
    const lamp = truck(ctx, tx, 0.92, '#cfcabb', -1, t, 380);
    // she walks to the door, holds up the new badge, the door slides open onto cold light, and she goes in
    const walk = clamp(pt / 3.6), swiped = pt > 4.6, open = settle(pt, 5.0, 1.0), inside = settle(pt, 6.4, 1.6);
    ctx.save(); ctx.fillStyle = '#6d7a80'; fillPts(ctx, rectPts(d.x + d.w * open, d.y - d.h, d.w, d.h)); ctx.restore();
    inkLoop(ctx, rectPts(d.x + d.w * open, d.y - d.h, d.w, d.h), { w: 2, seed: 57 + boil(t), gaps: 1, alpha: 0.8 });
    const mx = walk < 1 ? lerp(820, 975, walk) : lerp(975, d.x + d.w * 0.5, inside), reach = pt > 3.8 && pt < 5.4;
    if (inside < 0.95) {
      const p = person(ctx, { who: 'mara', x: mx, y: m.y - inside * 6, h: m.h * (1 - inside * 0.12), f: 1, pose: walk < 1 || (inside > 0 && inside < 1) ? 'walk' : 'stand', pace: 5, arms: reach ? [[1.35, 0.25], [0.05, 0.1]] : 'down', mood: 'calm', t, look: 0.4, alpha: 1 - inside });
      if (reach) { shape(ctx, rectPts(p.handF[0] - 2, p.handF[1] - 10, 12, 16), '#e4f1ec', { seed: 3, b, inkW: 1.2, gaps: 1 }); glow(ctx, p.handF[0] + 4, p.handF[1] - 2, 40, PAL.frost, 0.6); }
    }
    drawSet(ctx, 'bunkerFence');
    lightMask(ctx, 'rgba(20,24,32,0.3)', BK.floods.map(([x, y]) => ({ x, y: y + 200, r: 420, a: 0.9 })).concat([{ x: 960, y: 200, r: 1100, a: 0.5 }]), camFit(cam));
    applyCam(ctx, cam);
    for (const [fx, fy] of BK.floods) {
      glow(ctx, fx, fy, 180, PAL.frost, 0.7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.06; ctx.fillStyle = '#dff5f0';
      ctx.beginPath(); ctx.moveTo(fx - 30, fy); ctx.lineTo(fx + 30, fy); ctx.lineTo(fx + 260, 800); ctx.lineTo(fx - 260, 800); ctx.closePath(); ctx.fill(); ctx.restore();
      // moths around the lamps
      for (let k = 0; k < 5; k++) { const a = t * (2 + k * 0.4) + k * 2, rr = 26 + k * 9; dot(ctx, fx + Math.cos(a) * rr, fy + 10 + Math.sin(a * 1.3) * rr * 0.6, 1.8, '#f6ecd0', 0.8); }
    }
    glow(ctx, d.x + d.w / 2, d.y - d.h / 2, 60 + open * 120, PAL.frost, 0.25 + open * 0.4);
    const readerC = swiped ? PAL.frost : '#e8603f';
    dot(ctx, BK.reader.x, BK.reader.y - 6, 3.4, readerC, swiped ? 1 : 0.5 + 0.5 * Math.sin(t * 5)); glow(ctx, BK.reader.x, BK.reader.y - 6, 24, readerC, 0.5);
    glow(ctx, lamp[0], lamp[1], 60, '#fff1c9', 0.5);
    const blink = frac(t / 1.6) < 0.5 ? 1 : 0.15;
    dot(ctx, BK.mast[0], BK.mast[1], 4, '#e8603f', blink); glow(ctx, BK.mast[0], BK.mast[1], 40, '#e8603f', 0.6 * blink);
  },
});

/* ---------- after the treaty: two sides, one long table ---------- */
const TR = { wins: [[250, 300], [810, 300], [1370, 300]], winY: 70, winH: 280, tableY: 650, far: [300, 470, 640, 1280, 1450, 1620], pail: [1120, 990], signer: { x: 760, y: 1170 } };
function inspector(ctx, x, i, t) {
  const c = crowdStyle(700 + i * 5), who = { ...c, hair: c.hair === 'cap' ? 'bun' : c.hair, top: '#c98a4a', topIn: '#5e3b27' }, counter = i === 2 || i === 3;
  person(ctx, { who, x, y: TR.tableY + 70, h: 440, f: counter ? (x < 960 ? 1 : -1) : 0, pose: 'sit', arms: counter ? 'desk' : [[0.22, 1.05], [0.22, 1.05]], mood: 'calm', t, seed: 700 + i, look: counter ? 0.3 : 0 });
}
defineSet('treatyFront', (ctx) => {
  // the near side, in teal, with their backs to us
  [[150, 1150], [390, 1170], [1530, 1170], [1770, 1150]].forEach(([x, y], i) => backFig(ctx, { who: { ...crowdStyle(800 + i * 7), top: '#3f6b68' }, x, y, h: 660, t: 0.35, seed: 800 + i, turn: x < 960 ? 0.5 : -0.5 }));
});
defineSet('treaty', (ctx) => {
  ctx.fillStyle = '#b9b2a0'; ctx.fillRect(0, 0, W, 640);
  wash(ctx, rectPts(-40, -40, W + 80, 700), '#c9c2ae', { seed: 1, alpha: 0.08, layers: 12 });
  for (const [wx, ww] of TR.wins) {
    const top = TR.winY, h = TR.winH;
    const arch = catmull([[wx, top + h], [wx, top + 90], [wx + ww / 2, top], [wx + ww, top + 90], [wx + ww, top + h]], 6).concat([[wx + ww, top + h]]);
    ctx.save(); const path = new Path2D(); tracePath(path, arch); ctx.clip(path);
    const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, '#8f9c9c'); g.addColorStop(1, '#c3c9c2'); ctx.fillStyle = g; ctx.fillRect(wx, top, ww, h);
    wash(ctx, rectPts(wx, top + h * 0.6, ww, h * 0.4), '#7d8683', { seed: wx, alpha: 0.2, layers: 6 });
    ctx.restore();
    inkLoop(ctx, arch, { w: 3, seed: wx, gaps: 2 });
    for (const k of [0.33, 0.66]) inkLine(ctx, [[wx + ww * k, top + 30], [wx + ww * k, top + h]], { w: 4, seed: wx + k * 10 });
    inkLine(ctx, [[wx, top + 170], [wx + ww, top + 170]], { w: 4, seed: wx + 5 });
    shape(ctx, rectPts(wx - 20, top + h, ww + 40, 18), '#d8cfb8', { seed: wx + 6, boilAmp: 0.4, inkW: 2.2 });
  }
  shape(ctx, rectPts(-10, 480, W + 20, 160), '#8a7a64', { seed: 2, boilAmp: 0.4 });
  shape(ctx, rectPts(-10, 470, W + 20, 16), '#6e5a48', { seed: 3, boilAmp: 0.4, inkW: 2.2 });
  // a water stain on the ceiling where the roof leaks
  wash(ctx, blobPoly(TR.pail[0], 30, 90, 26, 8, rng(4)), '#8a7a64', { seed: 9, alpha: 0.12, layers: 8, v: 0.3 });
  ctx.fillStyle = '#7a6a58'; ctx.fillRect(0, 630, W, H - 630);
  wash(ctx, rectPts(-40, 630, W + 80, 460), '#6e5a48', { seed: 4, alpha: 0.1, layers: 10, v: 0.3 });
  for (let i = 0; i < 12; i++) brushDry(ctx, [[-10, 660 + i * 40], [W + 10, 664 + i * 40]], { w: 2.4, k: 2, alpha: 0.2, seed: i });
  TR.far.forEach((x, i) => inspector(ctx, x, i, 0.35));
  treatyTable(ctx);
});
const SIGN_PATH = catmull([[1000, 742], [1010, 732], [1018, 744], [1026, 730], [1036, 742], [1048, 734], [1058, 742], [1070, 736]], 5);
function treatyTable(ctx) {
  const b = 0, y = TR.tableY;
  shape(ctx, [[160, y], [1760, y], [1860, y + 120], [60, y + 120]], '#6e4630', { seed: 1, b, shade: { dx: 0, dy: 20, a: 0.12 } });
  shape(ctx, rectPts(60, y + 118, 1800, 28), '#5e3b27', { seed: 2, b, inkW: 2.4 });
  // the treaty itself, heavy with signatures, and the last one going on now
  shape(ctx, [[760, y + 14], [1160, y + 14], [1190, y + 106], [730, y + 106]], '#f6efdc', { seed: 3, b, inkW: 2, pool: 0.3 });
  letter(ctx, 'TREATY', 960, y + 50, { font: '700 40px Caveat, cursive', align: 'center', color: '#3a2a22' });
  const inks = ['#3a2a22', '#4f7a8a', '#8a2f2a', '#3f6b68', '#7a5236'];
  for (let i = 0; i < 20; i++) {
    const sx = 770 + (i % 8) * 50 + (Math.floor(i / 8) % 2) * 20, sy = y + 66 + Math.floor(i / 8) * 13;
    ctx.save(); ctx.strokeStyle = inks[i % inks.length]; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.beginPath();
    for (let k = 0; k <= 12; k++) { const xx = sx + k * 3.2, yy = sy + Math.sin(k * 1.3 + i) * 4 - (k === 3 ? 5 : 0); if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.restore();
  }
}
// a counting frame whose beads are chips
function chipFrame(ctx, x, y, w, t, seed, slide) {
  const b = boil(t);
  shape(ctx, rectPts(x, y - 70, 12, 80), '#8a5a3b', { seed, b, inkW: 2 });
  shape(ctx, rectPts(x + w - 12, y - 70, 12, 80), '#8a5a3b', { seed: seed + 1, b, inkW: 2 });
  for (let r = 0; r < 3; r++) {
    const wy = y - 56 + r * 22;
    inkLine(ctx, [[x + 10, wy], [x + w - 10, wy]], { w: 2, seed: seed + r, alpha: 0.8 });
    const n = 9 - r * 2;
    for (let k = 0; k < n; k++) {
      let cx = x + 22 + k * 20;
      if (r === 0 && k === n - 1) cx = lerp(x + 22 + k * 20, x + w - 34, slide);
      ctx.save(); ctx.fillStyle = '#2f3438'; ctx.fillRect(cx - 8, wy - 8, 16, 16); ctx.fillStyle = PAL.frost; ctx.globalAlpha = 0.9; ctx.fillRect(cx - 4, wy - 4, 8, 8); ctx.restore();
    }
  }
  glow(ctx, x + w / 2, y - 30, w * 0.7, PAL.frost, 0.25);
}
shot('hearing.treaty', {
  grade: () => ({ sat: 0.75, tint: '#aebfc2', tintA: 0.22, vig: 0.88 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(pt, { x: 960, y: 540, z: 1.02 }, { x: 960, y: 640, z: 1.3 }, 16);
    applyCam(ctx, cam);
    drawSet(ctx, 'treaty');
    // rain running down the high windows
    for (const [wx, ww] of TR.wins) {
      ctx.save(); ctx.beginPath(); ctx.rect(wx, TR.winY + 40, ww, TR.winH - 40); ctx.clip(); ctx.strokeStyle = '#eef2ee'; ctx.lineCap = 'round';
      for (let i = 0; i < 24; i++) { const sx = wx + hash(i + wx) * ww, yy = TR.winY + ((t * (300 + hash(i) * 300) + hash(i + 7) * 900) % (TR.winH + 60)) - 20; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx - 3, yy + 22); ctx.stroke(); }
      for (let i = 0; i < 6; i++) dot(ctx, wx + hash(i * 3.3 + wx) * ww, TR.winY + 60 + ((t * (10 + hash(i) * 14) + hash(i + 1) * 200) % (TR.winH - 60)), 3, '#f4f7f2', 0.6);
      ctx.restore();
    }
    crayonLine(ctx, SIGN_PATH, '#3f6b68', 2.6, clamp((pt - 1.2) / 3.2));
    chipFrame(ctx, 500, TR.tableY + 96, 230, t, 10, settle(frac(t / 4), 0.2, 0.5));
    chipFrame(ctx, 1190, TR.tableY + 96, 230, t, 20, settle(frac(t / 4 + 0.5), 0.2, 0.5));
    for (const [px, py] of [[400, TR.tableY + 40], [1520, TR.tableY + 40]]) { shape(ctx, rectPts(px - 40, py - 10, 80, 20), '#3a3431', { seed: px, b: boil(t), inkW: 2 }); for (let k = 0; k < 5; k++) dot(ctx, px - 30 + k * 15, py - 14, 5, PAL.frost, 0.9); }
    drawSet(ctx, 'treatyFront');
    // the teal side signs last: a hand with a pen follows the new signature
    const S = TR.signer, sg = backFig(ctx, { who: { ...crowdStyle(830), top: '#3f6b68' }, x: S.x, y: S.y, h: 660, t, seed: 830, turn: 0.6, liveArm: 1 });
    const k = clamp((pt - 1.2) / 3.2), tip = SIGN_PATH[Math.min(SIGN_PATH.length - 1, Math.floor(k * (SIGN_PATH.length - 1)))];
    const reach = settle(pt, 0.2, 1.0) - settle(pt, 4.8, 1.0), hand = [lerp(sg.g.x + sg.g.sw * 0.52, tip[0] - 6, reach), lerp(sg.g.hipY - 0.03 * sg.g.h, tip[1] + 14, reach)];
    tube(ctx, [[sg.g.x + sg.g.sw * 0.42, sg.shoulder[1] + 0.04 * sg.g.h], [lerp(sg.g.x + sg.g.sw * 0.56, hand[0] - 60, reach), lerp(sg.shoulder[1] + 0.16 * sg.g.h, hand[1] + 30, reach)], hand], sg.g.armW, '#3f6b68', { seed: 831, b: boil(t) });
    tube(ctx, [hand, [hand[0] + 6, hand[1] - 14]], 5, '#2f3438', { seed: 832, b: boil(t), inkW: 1.6 });
    shape(ctx, circlePts(hand[0], hand[1], 16, 14, 12), sg.g.st.skin, { seed: 833, b: boil(t), inkW: 2 });
    // it leaks: a drip from the ceiling into a pail, all through the signing
    const [px, py] = TR.pail, b = boil(t);
    shape(ctx, [[px - 40, py - 60], [px + 40, py - 60], [px + 32, py], [px - 32, py]], '#8f8c84', { seed: 840, b, inkW: 2.4 });
    tube(ctx, [[px - 38, py - 60], [px, py - 96], [px + 38, py - 60]], 3, '#5c5a55', { seed: 841, b, inkW: 2 });
    const dp = frac(t / 1.4), dy = lerp(-20, py - 64, dp * dp);
    if (dp < 0.98) shape(ctx, catmull([[px, dy - 12], [px + 6, dy], [px, dy + 5], [px - 6, dy]], 3, true), '#cfe0e0', { seed: 842, b, inkW: 1.4, gaps: 1 });
    const rp = frac(t / 1.4 + 0.02);
    if (rp < 0.35) { ctx.save(); ctx.strokeStyle = '#cfe0e0'; ctx.globalAlpha = 1 - rp / 0.35; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py - 58, 10 + rp * 80, 3 + rp * 14, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    lightMask(ctx, 'rgba(26,32,36,0.3)', [{ x: 960, y: TR.tableY + 40, r: 900, a: 0.9 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 960, TR.tableY + 40, 300, '#f6e8c8', 0.3);
  },
});

/* ---------- after opening it: seeds of Hearth over the town ---------- */
const TOWN = (() => {
  const r = rng(91), houses = [], wins = [];
  const rowsDef = [[520, 0.5, 14], [640, 0.72, 11], [800, 1.0, 7]];
  for (const [base, s, n] of rowsDef) for (let i = 0; i < n; i++) {
    const w = (130 + r() * 70) * s, h = (120 + r() * 80) * s, x = 560 + i * (1400 / n) + r() * 30 * s;
    const c = ['#d9c6a0', '#a0523c', '#4f7a8a', '#8fa878', '#e2c78f', '#b0784c'][Math.floor(r() * 6)];
    const roof = ['#7a3b3b', '#4b5a5e', '#5e3b27', '#b5552f'][Math.floor(r() * 4)];
    houses.push({ x, y: base, w, h, s, c, roof });
    const nw = w > 150 * s ? 2 : 1;
    for (let k = 0; k < nw; k++) wins.push({ x: x + w * (nw === 1 ? 0.5 : 0.3 + k * 0.4), y: base - h * 0.5, s });
  }
  return { houses, wins };
})();
const LAP = { x: 300, y: 600 };
// each seed leaves the laptop at its own time and keeps making the trip. A window lights when its first seed lands.
const SEEDS = Array.from({ length: 42 }, (_, i) => ({ i, tg: (i * 7) % TOWN.wins.length, emit: 1.3 + i * 0.32, dur: 9 + hash(i) * 5 }));
const WIN_LIT = TOWN.wins.map((_, k) => Math.min(...SEEDS.filter((s) => s.tg === k).map((s) => s.emit + s.dur), 99));
defineSet('town', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, '#3f5559'); g.addColorStop(0.6, '#b9806a'); g.addColorStop(1, '#efc19a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 600);
  for (let i = 0; i < 26; i++) dot(ctx, 500 + hash(i) * 1400, hash(i + 5) * 220, 1 + hash(i + 2) * 1.4, '#f6ecd0', 0.6);
  shape(ctx, catmull([[400, 560], [400, 470], [700, 430], [1000, 460], [1300, 420], [1600, 450], [1940, 430], [1940, 560]], 5, true), '#6f8a5b', { seed: 1, boilAmp: 0.4 });
  for (let i = 0; i < 14; i++) shape(ctx, blobPoly(520 + i * 105, 450 + (i % 3) * 8, 34, 26, 8, rng(i + 3)), i % 3 ? '#5d7a52' : '#e6a9a0', { seed: 10 + i, boilAmp: 0.4, inkW: 1.8 });
  ctx.fillStyle = '#7f9d63'; ctx.fillRect(400, 520, W - 400, H - 520);
  wash(ctx, rectPts(380, 520, W - 360, 560), '#6f8a5b', { seed: 2, alpha: 0.08, layers: 10, v: 0.3 });
  for (const hs of TOWN.houses) {
    const { x, y, w, h, s, c, roof } = hs;
    shape(ctx, rectPts(x, y - h, w, h), c, { seed: x, boilAmp: 0.4, inkW: 2.2 * Math.max(0.7, s), shade: { dx: -10 * s, dy: 0, a: 0.15 } });
    shape(ctx, [[x - 14 * s, y - h + 4], [x + w / 2, y - h - 70 * s], [x + w + 14 * s, y - h + 4]], roof, { seed: x + 1, boilAmp: 0.4, inkW: 2.2 * Math.max(0.7, s) });
    shape(ctx, rectPts(x + w * 0.1, y - 50 * s, 26 * s, 50 * s), '#5e3b27', { seed: x + 2, boilAmp: 0.3, inkW: 1.8 });
  }
  for (const wn of TOWN.wins) { ctx.save(); ctx.fillStyle = '#4a3a30'; ctx.fillRect(wn.x - 16 * wn.s, wn.y - 18 * wn.s, 32 * wn.s, 36 * wn.s); ctx.restore(); inkLoop(ctx, rectPts(wn.x - 16 * wn.s, wn.y - 18 * wn.s, 32 * wn.s, 36 * wn.s), { w: 1.8, seed: wn.x, gaps: 1, alpha: 0.7 }); }
  // the near house: clapboard wall and an open window with a lit room behind it
  ctx.fillStyle = '#b8845a'; ctx.fillRect(0, 0, 540, H);
  wash(ctx, rectPts(-40, -40, 600, H + 80), '#a06d45', { seed: 3, alpha: 0.08, layers: 10 });
  for (let y = 30; y < H; y += 46) brushDry(ctx, [[-10, y], [550, y + 2]], { w: 3, k: 3, alpha: 0.35, seed: y });
  const wx = 110, wy = 300, ww = 340, wh = 380;
  const rg = ctx.createLinearGradient(0, wy, 0, wy + wh); rg.addColorStop(0, '#e8b86a'); rg.addColorStop(1, '#c98a4a');
  ctx.fillStyle = rg; ctx.fillRect(wx, wy, ww, wh);
  shape(ctx, rectPts(wx + 20, wy + 40, 110, 150), '#d9a860', { seed: 4, inkW: 1.8 });
  shape(ctx, rectPts(wx, LAP.y + 10, ww, 70), '#8a5a3b', { seed: 5, inkW: 2.4 });
  for (const r of [[wx - 20, wy - 20, ww + 40, 22], [wx - 20, wy + wh - 2, ww + 40, 26], [wx - 20, wy - 20, 22, wh + 44], [wx + ww - 2, wy - 20, 22, wh + 44]]) shape(ctx, rectPts(...r), '#efe2c6', { seed: r[0] + r[1], boilAmp: 0.4, inkW: 2.4 });
  shape(ctx, rectPts(wx - 40, wy + wh + 20, ww + 80, 22), '#d9c6a0', { seed: 6, boilAmp: 0.4, inkW: 2.4 });
  for (let i = 0; i < 4; i++) { shape(ctx, circlePts(wx + 30 + i * 90, wy + wh + 16, 24, 20, 10), '#b5552f', { seed: 7 + i, inkW: 2 }); for (let k = 0; k < 3; k++) dot(ctx, wx + 20 + i * 90 + k * 10, wy + wh - 10, 7, ['#e3b23c', '#d98a7a', '#f6ecd6'][k], 1); }
});
function laptop(ctx, x, y, t, open) {
  // the lid swings up and Hearth wakes on the screen
  const b = boil(t), lh = 118 * open;
  shape(ctx, [[x - 90, y], [x + 90, y], [x + 104, y + 14], [x - 104, y + 14]], '#9aa6a6', { seed: 1, b, inkW: 2 });
  if (open < 0.05) return;
  shape(ctx, [[x - 84, y - 2], [x + 84, y - 2], [x + 78, y - lh], [x - 78, y - lh]], '#3a3431', { seed: 2, b, inkW: 2.2 });
  ctx.fillStyle = '#fbe7bf'; fillPts(ctx, [[x - 74, y - 10 * open], [x + 74, y - 10 * open], [x + 69, y - 110 * open], [x - 69, y - 110 * open]]);
  if (open > 0.7) hearth(ctx, x, y - 50, { t, r: 26, glowA: 0.5, seed: 4, sleepy: open < 0.95 });
}
// a dandelion seed whose seed is a tiny Hearth
function emberSeed(ctx, x, y, s, t, seed, a) {
  if (a <= 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#f6ecd6'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, 1.4 * s);
  const top = y - 30 * s, sway = Math.sin(t * 1.3 + seed) * 0.15, tx = x + sway * 20 * s;
  ctx.beginPath(); ctx.moveTo(x, y - 8 * s); ctx.lineTo(tx, top);
  for (let k = 0; k < 9; k++) { const an = -Math.PI * (0.1 + 0.8 * (k / 8)) + sway, L = 22 * s; ctx.moveTo(tx, top); ctx.lineTo(tx + Math.cos(an) * L, top + Math.sin(an) * L); }
  ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; hearth(ctx, x, y, { t, r: 8 * s, glowA: 0.35, eyes: s > 0.75, seed }); ctx.restore();
}
shot('hearing.open', {
  grade: () => ({ tint: '#f2d7a8', tintA: 0.2, vig: 0.8 }),
  draw(ctx, t, st) {
    // start at the window with the laptop and pull back over the town as the seeds go out
    const pt = st.pt ?? t, cam = drift(pt, { x: 460, y: 520, z: 1.55 }, { x: 1000, y: 530, z: 1.02 }, 14);
    applyCam(ctx, cam);
    drawSet(ctx, 'town');
    const b = boil(t);
    for (const s of [-1, 1]) {
      const cx = s < 0 ? 128 : 432, sw = Math.sin(t * 0.9 + s) * 14;
      shape(ctx, catmull([[cx - 26, 290], [cx + 26, 290], [cx + 20 + sw + s * 10, 520], [cx + s * 30 + sw * 1.5, 680], [cx - 30 + sw, 600]], 5, true), '#e6a9a0', { seed: 8 + s, b, inkW: 2.2 });
    }
    laptop(ctx, LAP.x, LAP.y, t, settle(pt, 0.2, 1.0));
    TOWN.wins.forEach((wn, k) => {
      const on = smooth(WIN_LIT[k], WIN_LIT[k] + 0.8, pt); if (on <= 0) return;
      const fl = on * (0.75 + 0.25 * Math.sin(t * 0.6 + k * 1.7) ** 2);
      ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = '#ffd98a'; ctx.fillRect(wn.x - 14 * wn.s, wn.y - 16 * wn.s, 28 * wn.s, 32 * wn.s); ctx.restore(); glow(ctx, wn.x, wn.y, 60 * wn.s, PAL.lamp, 0.4 * fl);
    });
    for (const sd of SEEDS) {
      const run = (pt - sd.emit) / sd.dur; if (run < 0) continue;
      const tg = TOWN.wins[sd.tg], ph = frac(run), i = sd.i;
      const S = [LAP.x + (hash(i + 5) - 0.5) * 60, LAP.y - 60], C1 = [S[0] + 260 + hash(i + 6) * 200, S[1] - 300 - hash(i + 7) * 200], C2 = [tg.x - 80, tg.y - 260 * tg.s - 60], E = [tg.x, tg.y];
      const u = ease.sine(ph), v = 1 - u;
      const x = v * v * v * S[0] + 3 * v * v * u * C1[0] + 3 * v * u * u * C2[0] + u * u * u * E[0] + Math.sin(t * 0.8 + i) * 16 * (1 - u);
      const y = v * v * v * S[1] + 3 * v * v * u * C1[1] + 3 * v * u * u * C2[1] + u * u * u * E[1] + Math.cos(t * 0.7 + i) * 10 * (1 - u);
      const sc = lerp(1.25, 0.55 * tg.s + 0.25, u), a = Math.min(smooth(0, 0.06, ph), 1 - smooth(0.9, 1, ph));
      emberSeed(ctx, x, y, sc, t, i, a);
    }
    glow(ctx, LAP.x, LAP.y - 50, 300, PAL.lamp, 0.35 * settle(pt, 0.6, 1));
  },
});

})();
