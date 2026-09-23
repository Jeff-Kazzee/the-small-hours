/* The two hopeful endings, both in 2032.
   The Garden: an orchard above the town at sunrise, a ward of empty beds, Mr. Aldana's
   driving school, and a small tree planted on the hill.
   The Long Dawn: rain on high windows, chips counted like jewels, a scratchpad people
   still read, and a new inspector with a flashlight. */
'use strict';
(() => {

/* ---------- shared helpers ---------- */
const says = (st, name) => st.who === name || st.p.speak === name;
// dev renders pin Wren at nine, so p.age lets a render check her at fourteen
const wrenAge = (st) => clamp(st.p.age ?? st.wren ?? 14, 8, 14);
const GARDEN = { tint: '#d8e8a8', tintA: 0.22, vig: 0.7 };
const DAWN = { sat: 0.75, tint: '#aebfc2', tintA: 0.24, vig: 0.88 };
const UNIFORM = { near: '#c99a3a', far: '#3f6b68' };
const KIDS = [
  { skin: '#c68a62', hair: 'curly', hairC: '#1e1614', top: '#e3b23c', pants: '#4f7a8a', shoes: '#b5552f', kid: true },
  { skin: '#f0c9a8', hair: 'bob', hairC: '#c9a45c', top: '#d98a7a', pants: '#57604a', shoes: '#4b5a5e', kid: true },
  { skin: '#8a5a3e', hair: 'short', hairC: '#1e1614', top: '#6f8a5b', pants: '#6e5a48', shoes: '#2e2520', kid: true },
  { skin: '#e8b99a', hair: 'cap', hairC: '#5a3a26', capC: '#4f7a8a', top: '#b5552f', pants: '#3c3a36', shoes: '#2e2520', kid: true },
];

function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [k, c] of stops) g.addColorStop(k, c);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}
// y of a left-to-right polyline at x
function lineAt(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
  return pts[pts.length - 1][1];
}
// a band of varying width along a polyline, as one closed polygon
function ribbon(pts, wf) {
  const P = catmull(pts, 5), L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = wf(P[i]) / 2; L.push([P[i][0] - dy * w, P[i][1] + dx * w]); R.push([P[i][0] + dy * w, P[i][1] - dx * w]);
  }
  return L.concat(R.reverse());
}
function rainOn(ctx, r, t, n = 40) {
  ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.strokeStyle = '#eef2ee'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sx = r.x + hash(i + r.x * 0.01) * r.w, sp = 520 + hash(i + 3) * 420, len = 14 + hash(i + 7) * 20;
    const yy = r.y + ((t * sp + hash(i + 11) * 1000) % (r.h + 60)) - 30;
    ctx.globalAlpha = 0.22 + hash(i + 5) * 0.3; ctx.lineWidth = 1.3 + hash(i + 2);
    ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx - 3, yy + len); ctx.stroke();
  }
  for (let i = 0; i < n / 5; i++) { const bx = r.x + hash(i * 3.3 + r.y * 0.01) * r.w, by = r.y + ((t * (12 + hash(i) * 18) + hash(i + 1) * r.h) % r.h); dot(ctx, bx, by, 2.4 + hash(i + 4) * 2, '#f4f7f2', 0.5); }
  ctx.restore();
}
function rainyPane(ctx, r, seed) {
  vgrad(ctx, r.x, r.y, r.w, r.h, [[0, '#8f9c9c'], [1, '#c3c9c2']]);
  ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  for (let i = 0; i < 3; i++) wash(ctx, blobPoly(r.x + r.w * (0.2 + i * 0.3), r.y + r.h * 0.3, r.w * 0.4, r.h * 0.18, 9, rng(seed + i)), '#dfe3dc', { seed: seed + i, alpha: 0.12, layers: 8 });
  wash(ctx, [[r.x - 10, r.y + r.h + 10], [r.x - 10, r.y + r.h * 0.75], [r.x + r.w * 0.4, r.y + r.h * 0.68], [r.x + r.w + 10, r.y + r.h * 0.8], [r.x + r.w + 10, r.y + r.h + 10]], '#7d8683', { seed: seed + 9, alpha: 0.2, layers: 8, v: 0.3 });
  ctx.restore();
}
function windowFrame(ctx, r, c, seed, bars = 1) {
  const f = 16;
  for (const q of [[r.x - f, r.y - f, r.w + 2 * f, f + 2], [r.x - f, r.y + r.h - 2, r.w + 2 * f, f + 2], [r.x - f, r.y - f, f + 2, r.h + 2 * f], [r.x + r.w - 2, r.y - f, f + 2, r.h + 2 * f]]) shape(ctx, rectPts(...q), c, { seed: seed + q[0] + q[1], boilAmp: 0.4, inkW: 2.2 });
  for (let i = 1; i <= bars; i++) shape(ctx, rectPts(r.x + (r.w / (bars + 1)) * i - 6, r.y, 12, r.h), c, { seed: seed + i * 7, boilAmp: 0.4, inkW: 2 });
}
// on a shot's second line t keeps running while st.pt restarts. p.beat fakes that in dev renders.
const laterBeat = (st, t) => (st.p.beat ?? 1) > 1 || t - (st.pt ?? t) > 0.5;
const beatPt = (st, t) => ((st.p.beat ?? 1) > 1 ? Math.max(0, t - 8) : st.pt ?? t);
// camera through keyframes [[time, {x, y, z}], ...], eased between each pair
function camPath(u, keys) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, c] = keys[i], k = ease.inOut((u - t0) / (t1 - t0)); return { x: lerp(a.x, c.x, k), y: lerp(a.y, c.y, k), z: lerp(a.z, c.z, k) }; }
  return keys[keys.length - 1][1];
}
const mixCam = (a, c, k) => ({ x: lerp(a.x, c.x, k), y: lerp(a.y, c.y, k), z: lerp(a.z, c.z, k) });
const bump = (u, d) => (u > 0 && u < d ? Math.sin((u / d) * Math.PI) : 0);
// where person() will put a figure's shoulders, so an arm can be aimed before the figure is drawn
function bodyFrame(o) {
  const st = typeof o.who === 'string' ? STYLE[o.who] : o.who, kid = !!st.kid, grow = kid ? clamp(((o.age ?? 8) - 8) / 6) : 0;
  const f = o.f ?? 1, fd = f === 0 ? 1 : f, t = o.t ?? 0, seed = o.seed ?? 11;
  const h = (o.h ?? 380) * (st.tall ?? 1) * (kid ? lerp(0.6, 0.9, grow) : 1);
  const leg = kid ? lerp(0.34, 0.41, grow) : 0.42, torso = kid ? lerp(0.27, 0.3, grow) : 0.3, sh = kid ? lerp(0.23, 0.24, grow) : 0.25;
  const hipY = o.pose === 'sit' ? o.y - (o.seatH ?? (kid ? 0.3 : 0.27)) * h : o.y - leg * h;
  const shX = o.x + (o.lean ?? 0) * fd * 0.08 * h, shY = hipY - torso * h - Math.sin(t * 1.7 + seed) * 0.004 * h;
  return { st, h, fd, grow, up: (kid ? 0.14 : 0.155) * h, fore: (kid ? 0.13 : 0.145) * h, shF: [shX + fd * sh * h * 0.34, shY + 0.03 * h], shB: [shX - fd * sh * h * 0.34, shY + 0.03 * h], hipY };
}
// the [angle, bend] that puts a hand on target, elbow hanging low. person() tilts each arm 0.06 outward, so undo that.
function ikArm(bf, T, front = true) {
  const S = front ? bf.shF : bf.shB, U = bf.up, F = bf.fore, fd = bf.fd;
  const dx = fd * (T[0] - S[0]), dy = T[1] - S[1], L = Math.hypot(dx, dy) || 1, d = clamp(L, Math.abs(U - F) + 1, U + F - 0.5);
  const a = Math.atan2(dx, dy) - Math.acos(clamp((U * U + d * d - F * F) / (2 * U * d), -1, 1));
  const aa = Math.atan2((dx / L) * d - Math.sin(a) * U, (dy / L) * d - Math.cos(a) * U);
  return [a - (front ? 0.06 : -0.06), aa - a];
}
function armJoints(bf, arm, front) {
  const side = front ? bf.fd : -bf.fd, S = front ? bf.shF : bf.shB, sw = side * 0.06, fd = bf.fd, [a, bnd] = arm;
  const e = [S[0] + Math.sin(a * fd + sw) * bf.up, S[1] + Math.cos(a) * bf.up], aa = a + bnd, w = [e[0] + Math.sin(aa * fd + sw) * bf.fore, e[1] + Math.cos(aa) * bf.fore];
  return [S, [lerp(S[0], e[0], 0.55), lerp(S[1], e[1], 0.55)], e, w];
}
function paintArm(ctx, bf, J, o) {
  const b = boil(o.t ?? 0), seed = o.seed ?? 11;
  tube(ctx, J, (bf.st.kid ? 0.07 : 0.062) * bf.h * (bf.st.thin ?? 1), o.color ?? bf.st.top, { seed: seed + (o.front ? 41 : 40), b });
  shape(ctx, circlePts(J[3][0], J[3][1], 0.032 * bf.h, 0.03 * bf.h, 14), bf.st.skin, { seed: seed + (o.front ? 45 : 44), b, inkW: 2.2, pool: 0.5 });
}
// sitting on the grass facing us, knees up, arms around them. rot leans the upper body about the hip,
// slide and slump carry it sideways and down so a head can come to rest on a shoulder.
function sitFront(ctx, o) {
  const bf = bodyFrame({ ...o, f: 0, pose: 'sit', seatH: 0.04 }), st = bf.st, h = bf.h, x = o.x, y0 = o.y, hipY = bf.hipY, b = boil(o.t ?? 0), seed = o.seed ?? 11, rot = o.rot ?? 0;
  const arms = o.arms ?? [[0.62, -2.0], [-0.62, 2.05]];
  const dx = o.slide ?? 0, dy = (o.slump ?? 0) * h;
  const pivot = (fn) => { ctx.save(); ctx.translate(x + dx, hipY + dy); ctx.rotate(rot); ctx.translate(-x, -hipY); fn(); ctx.restore(); };
  let P;
  pivot(() => { ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); ctx.rect(x + 0.15 * h, hipY - 0.05 * h, 0.6 * h, 0.2 * h); ctx.clip('evenodd'); P = person(ctx, { ...o, f: 0, pose: 'sit', seatH: 0.04, shadow: false, arms }); });
  const legW = (st.kid ? 0.085 : 0.075) * h * (st.wide ?? 1) * (st.thin ?? 1);
  for (const s of [-1, 1]) {
    const hip = [x + s * 0.07 * h, hipY + 0.01 * h], knee = [x + s * 0.085 * h, hipY - 0.15 * h], foot = [x + s * 0.1 * h, y0 - 0.03 * h];
    tube(ctx, [knee, [lerp(knee[0], foot[0], 0.5), lerp(knee[1], foot[1], 0.5)], foot], legW, mix(st.pants, PAL.ink, 0.1), { seed: seed + 130 + s, b });
    shape(ctx, circlePts(foot[0] + s * 0.01 * h, y0 - 0.022 * h, 0.048 * h, 0.03 * h, 16), st.shoes, { seed: seed + 134 + s, b, inkW: 2.4, pool: 0.6 });
    tube(ctx, [hip, [lerp(hip[0], knee[0], 0.5), lerp(hip[1], knee[1], 0.5)], knee], legW * 1.15, st.pants, { seed: seed + 138 + s, b });
    shape(ctx, circlePts(knee[0], knee[1], legW * 0.66, legW * 0.6, 14), st.pants, { seed: seed + 142 + s, b, inkW: 2.4, shade: { dx: s * legW * 0.2, dy: legW * 0.15, a: 0.2 } });
  }
  pivot(() => { paintArm(ctx, bf, armJoints(bf, arms[1], false), { ...o, front: false }); paintArm(ctx, bf, armJoints(bf, arms[0], true), { ...o, front: true }); });
  const c = Math.cos(rot), sn = Math.sin(rot), R = ([px, py]) => [x + dx + (px - x) * c - (py - hipY) * sn, hipY + dy + (px - x) * sn + (py - hipY) * c];
  return { ...P, head: [...R(P.head), P.head[2]], shoulderR: R(bf.shF), shoulderL: R(bf.shB) };
}
function crayon(ctx, pts, c, w = 4, a = 0.85) { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = a; ctx.beginPath(); tracePath(ctx, pts, false); ctx.stroke(); ctx.restore(); }

// person() has no seat on the grass, so draw its legs as knees drawn up and clip its chair legs away.
// Its front arm is painted again last so it rests over the knees.
function kneesUp(ctx, o) {
  const st = typeof o.who === 'string' ? STYLE[o.who] : o.who, t = o.t ?? 0, b = boil(t), seed = o.seed ?? 11;
  const fd = (o.f ?? 1) < 0 ? -1 : 1, grow = st.kid ? clamp(((o.age ?? 8) - 8) / 6) : 0;
  const h = o.h * (st.tall ?? 1) * (st.kid ? lerp(0.6, 0.9, grow) : 1), x = o.x, y0 = o.y;
  const hipY = y0 - 0.04 * h, legW = (st.kid ? 0.085 : 0.075) * h * (st.wide ?? 1) * (st.thin ?? 1);
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000);
  if (fd > 0) ctx.rect(x + 0.15 * h, hipY - 0.05 * h, 0.6 * h, 0.2 * h); else ctx.rect(x - 0.75 * h, hipY - 0.05 * h, 0.6 * h, 0.2 * h);
  ctx.clip('evenodd');
  const P = person(ctx, { ...o, pose: 'sit', seatH: 0.04, shadow: false });
  ctx.restore();
  const kx = o.kneeX ?? 0.17, ky = o.kneeY ?? 0.15;
  for (const [i, back] of [[0, 1], [1, 0]]) {
    const hp = [x - fd * back * 0.03 * h, hipY], knee = [hp[0] + fd * (kx - back * 0.02) * h, hipY - (ky - back * 0.015) * h], foot = [hp[0] + fd * (kx + 0.12) * h, y0 - 0.025 * h];
    tube(ctx, [hp, [lerp(hp[0], knee[0], 0.5), lerp(hp[1], knee[1], 0.5) - 0.01 * h], knee, [lerp(knee[0], foot[0], 0.5), lerp(knee[1], foot[1], 0.5)], foot], legW, back ? mix(st.pants, PAL.ink, 0.18) : st.pants, { seed: seed + 120 + i, b });
    shape(ctx, circlePts(foot[0] + fd * 0.03 * h, y0 - 0.02 * h, 0.05 * h, 0.024 * h, 16), st.shoes, { seed: seed + 125 + i, b, inkW: 2.4, pool: 0.6 });
  }
  frontArm(ctx, P, st, { ...o, f: fd, grow });
  return P;
}
// paint person()'s front arm again from its returned joints, with its own seeds, so it lands on the same pixels
function frontArm(ctx, P, st, o) {
  const h = P.h, fd = (o.f ?? 1) < 0 ? -1 : 1, seed = o.seed ?? 11, b = boil(o.t ?? 0), g = o.grow ?? 0;
  const shw = st.kid ? lerp(0.23, 0.24, g) : 0.25;
  const shF = [P.shoulder[0] + fd * shw * h * 0.34, P.shoulder[1] + 0.03 * h];
  const pts = [shF, [lerp(shF[0], P.elbowF[0], 0.55), lerp(shF[1], P.elbowF[1], 0.55)], P.elbowF, P.handF];
  tube(ctx, pts, (st.kid ? 0.07 : 0.062) * h * (st.thin ?? 1), o.sleeve ?? st.top, { seed: seed + 41, b });
  shape(ctx, circlePts(P.handF[0], P.handF[1], 0.032 * h, 0.03 * h, 14), st.skin, { seed: seed + 45, b, inkW: 2.2, pool: 0.5 });
}
// the torso outline person() paints, rebuilt from its returned joints
function torsoPts(P, st) {
  const h = P.h, [shX, shY] = P.shoulder, [x, hipY] = P.hip, sw = 0.25 * h * (st.wide ?? 1) * (st.thin ?? 1), hw = 0.285 * h * (st.wide ?? 1) * (st.thin ?? 1);
  return catmull([[shX - sw * 0.5, shY + 0.02 * h], [shX, shY - 0.012 * h], [shX + sw * 0.5, shY + 0.02 * h], [lerp(shX, x, 0.5) + hw * 0.54, lerp(shY, hipY, 0.55)], [x + hw * 0.5, hipY + 0.035 * h], [x, hipY + 0.05 * h], [x - hw * 0.5, hipY + 0.035 * h], [lerp(shX, x, 0.5) - hw * 0.54, lerp(shY, hipY, 0.55)]], 5, true);
}
// an open vest with reflective bands over whoever person() just drew
function vest(ctx, P, st, o) {
  const h = P.h, b = boil(o.t ?? 0), seed = (o.seed ?? 11) + 200, fd = (o.f ?? 1) < 0 ? -1 : 1, c = o.c ?? UNIFORM.near;
  const tp = torsoPts(P, st), [shX, shY] = P.shoulder, [x, hipY] = P.hip;
  shape(ctx, tp, c, { seed, b, shade: { dx: -fd * 0.05 * h, dy: 0, a: 0.18 } });
  ctx.save(); ctx.beginPath(); tracePath(ctx, tp); ctx.clip();
  for (const k of [0.5, 0.74]) { const yy = lerp(shY, hipY, k); ctx.fillStyle = '#efe8d2'; ctx.globalAlpha = 0.9; ctx.fillRect(x - h, yy, 2 * h, 0.035 * h); }
  ctx.restore();
  const cx = lerp(shX, x, 0.5) + fd * 0.03 * h;
  shape(ctx, [[shX + fd * 0.01 * h - 0.035 * h, shY], [shX + fd * 0.01 * h + 0.035 * h, shY], [cx + 0.03 * h, hipY + 0.03 * h], [cx - 0.03 * h, hipY + 0.03 * h]], o.shirt ?? st.top, { seed: seed + 1, b, inkW: 2, gaps: 1 });
  shape(ctx, rrectPts(shX + fd * 0.06 * h - 0.025 * h, shY + 0.07 * h, 0.05 * h, 0.06 * h, 0.008 * h), '#f4efe4', { seed: seed + 2, b, inkW: 1.8, gaps: 1, pool: 0.3 });
  dot(ctx, shX + fd * 0.06 * h, shY + 0.09 * h, 0.01 * h, c, 0.9);
}
function clipboard(ctx, x, y, s, rot, t, o = {}) {
  const b = boil(t), seed = o.seed ?? 401;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rrectPts(-40 * s, -55 * s, 80 * s, 110 * s, 6 * s), '#8a5a3b', { seed, b, inkW: 2 });
  shape(ctx, rectPts(-33 * s, -44 * s, 66 * s, 92 * s), '#f6efdc', { seed: seed + 1, b, inkW: 1.6, gaps: 1, pool: 0.3 });
  shape(ctx, rrectPts(-16 * s, -62 * s, 32 * s, 16 * s, 4 * s), '#9aa6a6', { seed: seed + 2, b, inkW: 1.8 });
  if (o.text) letter(ctx, o.text, 0, 22 * s, { font: `700 ${o.size ?? 44}px Caveat, cursive`, align: 'center', color: o.ink ?? '#5b1f17' });
  else { ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-24 * s, (-28 + i * 16) * s); ctx.lineTo((-24 + 30 + hash(seed + i) * 18) * s, (-28 + i * 16) * s); ctx.stroke(); } }
  ctx.restore();
}
function bird(ctx, x, y, s, t, i, c = PAL.ink) {
  const up = Math.sin(t * 8 + i * 1.7) * s * 0.55;
  inkLine(ctx, [[x - s, y - up], [x - s * 0.45, y - s * 0.14 - up * 0.3], [x, y]], { w: Math.max(2, s * 0.17), seed: i, color: c });
  inkLine(ctx, [[x, y], [x + s * 0.45, y - s * 0.14 - up * 0.3], [x + s, y - up]], { w: Math.max(2, s * 0.17), seed: i + 9, color: c });
}
// a loose V of birds that crosses the sky and wraps off screen
function flock(ctx, t, o) {
  const cx = -300 + frac(o.ph + (t * o.v) / 2600) * 2600;
  for (let j = 0; j < o.n; j++) {
    const k = j - (o.n - 1) / 2, bx = cx - Math.abs(k) * o.s * 2.4 + noise1(t * 0.4 + j * 3) * o.s * 0.6, by = o.y + k * o.s * 0.5 + Math.abs(k) * o.s * 0.8 + noise1(t * 0.3 + j * 7) * o.s * 0.5;
    bird(ctx, bx, by, o.s * (0.85 + hash(j + o.n) * 0.3), t, j + o.n * 3, o.c);
  }
}
function perchedBird(ctx, x, y, s, t, seed = 5) {
  const b = boil(t), hop = Math.max(0, Math.sin(t * 1.7 + seed)) > 0.97 ? -6 : 0, peck = Math.sin(t * 0.9 + seed) > 0.8 ? 0.35 : 0;
  ctx.save(); ctx.translate(x, y + hop);
  shape(ctx, catmull([[-s * 1.2, -s * 0.5], [-s * 0.4, -s * 1.0], [s * 0.6, -s * 0.8], [s * 0.8, -s * 0.2], [0, 0], [-s * 0.6, -s * 0.1]], 4, true), '#8a5a3b', { seed, b, inkW: 1.8 });
  shape(ctx, [[-s * 1.1, -s * 0.5], [-s * 2.0, -s * 0.2], [-s * 1.8, -s * 0.05]], '#6e4630', { seed: seed + 1, b, inkW: 1.6, gaps: 1 });
  ctx.rotate(peck);
  shape(ctx, circlePts(s * 0.7, -s * 1.05, s * 0.42, s * 0.4, 12), '#b5552f', { seed: seed + 2, b, inkW: 1.8 });
  shape(ctx, [[s * 1.05, -s * 1.12], [s * 1.45, -s * 1.0], [s * 1.05, -s * 0.92]], '#e3b23c', { seed: seed + 3, b, inkW: 1.4, gaps: 1 });
  dot(ctx, s * 0.82, -s * 1.12, s * 0.08, PAL.ink);
  ctx.restore();
  inkLine(ctx, [[x - s * 0.1, y], [x - s * 0.1, y + s * 0.3]], { w: 1.6, seed }); inkLine(ctx, [[x + s * 0.3, y], [x + s * 0.3, y + s * 0.3]], { w: 1.6, seed: seed + 1 });
}
function fireflies(ctx, t, box, n, avoid = []) {
  for (let i = 0; i < n; i++) {
    const px = box.x + hash(i * 1.3) * box.w + noise1(t * 0.13 + i * 3.1) * 70, py = box.y + hash(i * 2.7 + 1) * box.h + noise1(t * 0.11 + i * 5.3) * 45;
    const on = Math.pow(Math.max(0, Math.sin(t * (0.5 + hash(i) * 0.7) + i * 2.1)), 3);
    if (on < 0.03 || avoid.some(([x0, y0, x1, y1]) => px > x0 && px < x1 && py > y0 && py < y1)) continue;
    glow(ctx, px, py, 20 * (0.7 + hash(i + 2) * 0.6), '#f6e27a', on * 0.7); dot(ctx, px, py, 2.6, '#fff6c0', on);
  }
}

/* ---------- the orchard above the town ---------- */
const O = {
  sun: { x: 1330, y: 402, r: 52 },
  ridgeA: [[-40, 470], [200, 452], [420, 462], [700, 444], [980, 456], [1200, 440], [1420, 436], [1640, 452], [1960, 444]],
  ridgeB: [[-40, 500], [260, 486], [560, 494], [880, 478], [1160, 492], [1460, 484], [1760, 496], [1960, 488]],
  brow: [[-40, 596], [240, 588], [520, 606], [760, 640], [940, 690], [1150, 712], [1400, 716], [1640, 700], [1820, 676], [1960, 664]],
  river: [[-40, 560], [200, 552], [420, 548], [620, 560], [800, 592], [960, 632], [1100, 660], [1240, 652], [1380, 616], [1500, 572], [1640, 536], [1800, 512], [1960, 506]],
  path: [[-170, 906], [120, 914], [380, 904], [600, 884], [780, 856], [900, 818], [990, 776], [1050, 742], [1092, 712]],
  lamps: [{ x: 470, y: 884, s: 0.78 }, { x: 800, y: 834, s: 0.64 }, { x: 975, y: 768, s: 0.5 }],
  post: { x: 1800, y: 1004, s: 1.5 },
  sapling: { x: 1255, y: 986 },
  frontTree: { x: 120, y: 1078, s: 1.3 },
};
const OPAL = {
  morning: {
    sky: [[0, '#b4d2c4'], [0.55, '#eae6c0'], [1, '#fcd896']], sun: '#fff3cf', cloud: '#fbf1d8', cloudLit: '#f8e0b4', cloudA: 0.12,
    ridgeA: '#b8c7a3', ridgeB: '#a2b98a', fields: ['#b9cc80', '#d3d18c', '#a8c276', '#e2cf8e', '#9cb86e', '#c4c878'], hedge: '#5d7a52', copse: '#6f8e58',
    river: '#cfe2d6', riverSun: '#fbeab8', riverEdge: '#5f8a80', ground: [[0, '#e0dc98'], [0.07, '#aac46a'], [0.5, '#93b25a'], [1, '#76984a']], grass: '#5f8440',
    path: '#dcc494', leaf: ['#86a85c', '#6c8f4a', '#b2cc7a'], trunk: '#7a5236', blossom: '#fae8e2', fruit: '#dc6a3c', shadow: '#3e5a30',
    roof: ['#b5552f', '#a0523c', '#c98a4a', '#8a5a3b', '#9a6a4a'], wall: ['#f1e4c8', '#e8d4ae', '#f4ead6', '#dfc9a0'], glass: '#a9c0b4', lit: 0.3, mist: 0.5, flowers: ['#f6ecd6', '#e3b23c', '#e89a86', '#fff4d6'],
  },
  dusk: {
    sky: [[0, '#16272d'], [0.4, '#2f454a'], [0.6, '#8a6a58'], [0.72, '#d88c58'], [0.8, '#f0aa66'], [1, '#f2b26e']], sun: '#ffd39a', cloud: '#2c3c40', cloudLit: '#d08660', cloudA: 0.05,
    ridgeA: '#6a6f5e', ridgeB: '#566452', fields: ['#50684a', '#5c704c', '#4a6246', '#687450', '#44603f', '#586a48'], hedge: '#2e4030', copse: '#34483a',
    river: '#c98a62', riverSun: '#eeac6c', riverEdge: '#34423e', ground: [[0, '#7e8a5c'], [0.07, '#56703f'], [0.5, '#48643a'], [1, '#36522e']], grass: '#2c4428',
    path: '#8a7a5a', leaf: ['#4e6c40', '#3c5a36', '#62804c'], trunk: '#4a3426', blossom: '#d9c2bc', fruit: '#a8543a', shadow: '#1e2c1c',
    roof: ['#6e3a2a', '#5e3a2c', '#7a5638', '#4a3226', '#5a4232'], wall: ['#8a7c68', '#7e6e5a', '#968870', '#746452'], glass: '#3c4a48', lit: 0.8, mist: 0.15, flowers: ['#c9c0a8', '#b89a4a', '#a87a6a', '#d8ccb0'],
  },
};
const browY = (x) => lineAt(O.brow, x);
const riverY = (x) => lineAt(O.river, x);
const riverW = (y) => lerp(6, 36, clamp((y - 500) / 150));

let TOWN = null;
function town() {
  if (TOWN) return TOWN;
  const r = rng(77), houses = [];
  for (let i = 0; i < 90 && houses.length < 52; i++) {
    const y = 548 + Math.pow(r(), 0.9) * 160, k = (y - 548) / 160, x = 780 + r() * 800;
    const w = lerp(28, 66, k) * (0.8 + r() * 0.5), h = lerp(20, 40, k) * (0.8 + r() * 0.4);
    const ry = riverY(x), rw = riverW(ry);
    if (y > ry - rw / 2 - 3 && y < ry + rw / 2 + h + 4) continue;
    if (Math.abs(x - 1200) < 70 && y < 640) continue;
    houses.push({ x, y, w, h, roof: Math.floor(r() * 5), wall: Math.floor(r() * 4), chim: r() < 0.45, win: [r(), r(), r()] });
  }
  houses.sort((a, b) => a.y - b.y);
  const chimneys = houses.filter((q) => q.chim && q.y < browY(q.x) - q.h * 0.3).map((q) => [q.x + q.w * 0.28, q.y - q.h - q.w * 0.42 - 12]);
  return (TOWN = { houses, church: { x: 1180, y: 630 }, chimneys });
}
function house(ctx, q, pal) {
  const { x, y, w, h } = q, roofH = w * 0.42, inkW = 1.5;
  if (q.chim) shape(ctx, rectPts(x + w * 0.22, y - h - roofH - 10, w * 0.14, roofH + 6), pal.roof[(q.roof + 2) % 5], { seed: x, inkW, gaps: 1, boilAmp: 0.3 });
  shape(ctx, rectPts(x - w / 2, y - h, w, h), pal.wall[q.wall], { seed: x + 1, inkW, gaps: 1, boilAmp: 0.3, pool: 0.5 });
  shape(ctx, [[x - w / 2 - 4, y - h + 1], [x, y - h - roofH], [x + w / 2 + 4, y - h + 1]], pal.roof[q.roof], { seed: x + 2, inkW, gaps: 1, boilAmp: 0.3 });
  const nw = w > 40 ? 2 : 1;
  for (let i = 0; i < nw; i++) {
    const wx = x - w / 2 + (w / (nw + 1)) * (i + 1) - w * 0.08, wy = y - h * 0.72, ww = w * 0.16, wh = h * 0.34, lit = q.win[i] < pal.lit;
    ctx.save(); ctx.fillStyle = lit ? PAL.lamp : pal.glass; ctx.globalAlpha = lit ? 0.95 : 0.8; ctx.fillRect(wx, wy, ww, wh); ctx.restore();
    if (lit && pal.lit > 0.5) glow(ctx, wx + ww / 2, wy + wh / 2, 26, PAL.lamp, 0.35);
  }
}
function church(ctx, c, pal) {
  const { x, y } = c, wall = pal.wall[2], roof = pal.roof[3];
  shape(ctx, rectPts(x + 10, y - 50, 96, 50), wall, { seed: 501, inkW: 1.6, boilAmp: 0.3 });
  shape(ctx, [[x + 6, y - 49], [x + 58, y - 82], [x + 110, y - 49]], roof, { seed: 502, inkW: 1.6, boilAmp: 0.3 });
  shape(ctx, rectPts(x - 22, y - 118, 38, 118), wall, { seed: 503, inkW: 1.8, boilAmp: 0.3 });
  shape(ctx, [[x - 26, y - 116], [x - 3, y - 200], [x + 20, y - 116]], roof, { seed: 504, inkW: 1.8, boilAmp: 0.3 });
  inkLine(ctx, [[x - 3, y - 200], [x - 3, y - 224]], { w: 2.4, seed: 505 }); inkLine(ctx, [[x - 11, y - 215], [x + 5, y - 215]], { w: 2.2, seed: 506 });
  shape(ctx, rrectPts(x - 11, y - 104, 16, 22, 7), pal.lit > 0.5 ? PAL.lamp : '#6e5a48', { seed: 507, inkW: 1.4, gaps: 1 });
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.fillStyle = pal.lit > 0.5 ? PAL.lamp : pal.glass; ctx.fillRect(x + 26 + i * 26, y - 38, 10, 18); ctx.restore(); }
}
// one inked canopy on a trunk, lit on the sun side, dotted with blossom and fruit
function fruitTree(ctx, x, y, s, o) {
  const pal = o.pal, seed = o.seed ?? 1, r = rng(seed * 13 + 5), b = o.b ?? 0, inkW = clamp(1 + 2.4 * s, 1.4, 3.2);
  if (o.shadow) { ctx.save(); ctx.globalAlpha = o.shadow; ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.ellipse(x - 80 * s, y + 12 * s, 170 * s, 22 * s, 0.06, 0, TAU); ctx.fill(); ctx.restore(); }
  const th = 130 * s, tw = 22 * s;
  shape(ctx, [[x - tw * 0.7, y + 2], [x - tw * 0.42, y - th * 0.5], [x - tw * 0.5, y - th], [x + tw * 0.45, y - th], [x + tw * 0.36, y - th * 0.5], [x + tw * 0.7, y + 2]], pal.trunk, { seed, b, inkW });
  tube(ctx, [[x, y - th * 0.8], [x - 40 * s, y - th - 26 * s], [x - 72 * s, y - th - 44 * s]], Math.max(3, 8 * s), pal.trunk, { seed: seed + 1, b, inkW: inkW * 1.2 });
  tube(ctx, [[x, y - th * 0.85], [x + 36 * s, y - th - 32 * s], [x + 64 * s, y - th - 40 * s]], Math.max(3, 7 * s), pal.trunk, { seed: seed + 2, b, inkW: inkW * 1.2 });
  const cx = x + (r() - 0.5) * 10 * s, cy = y - th - 70 * s, rx = 116 * s * (0.92 + r() * 0.16), ry = 88 * s * (0.92 + r() * 0.16);
  const pts = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, k = 1 + 0.1 * Math.sin(a * 5 + seed) + (r() - 0.5) * 0.12; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.82 : 1)]); }
  const canopy = catmull(pts, 3, true);
  shape(ctx, canopy, pal.leaf[0], { seed: seed + 3, b, inkW, shade: { dx: -rx * 0.18, dy: ry * 0.28, a: 0.24 } });
  ctx.save(); ctx.beginPath(); tracePath(ctx, canopy); ctx.clip();
  for (let i = 0; i < 3; i++) paint(ctx, circlePts(cx + rx * (0.15 + r() * 0.4), cy - ry * (0.15 + r() * 0.4), rx * (0.35 + r() * 0.2), ry * (0.3 + r() * 0.15), 14), pal.leaf[2], { alpha: 0.55, pool: 0.3 });
  for (let i = 0; i < 2; i++) paint(ctx, circlePts(cx - rx * (0.2 + r() * 0.4), cy + ry * (0.2 + r() * 0.3), rx * 0.4, ry * 0.3, 14), pal.leaf[1], { alpha: 0.45, pool: 0.3 });
  ctx.restore();
  const nb = Math.round(clamp(46 * s, 8, 60)), nf = Math.round(clamp(10 * s, 2, 14) * (o.fruit ?? 1));
  for (let i = 0; i < nb; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.92; dot(ctx, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9, (2.4 + r() * 2.6) * Math.max(0.6, s), pal.blossom, 0.92); }
  for (let i = 0; i < nf; i++) { const a = r() * TAU, d = 0.25 + Math.sqrt(r()) * 0.65, fx = cx + Math.cos(a) * rx * d, fy = cy + Math.sin(a) * ry * d * 0.9 + 6 * s, fr = 7 * s; dot(ctx, fx, fy, fr, pal.fruit, 0.95); dot(ctx, fx - fr * 0.3, fy - fr * 0.35, fr * 0.3, '#fff4d6', 0.6); }
}
const ROWS = [
  { d: 16, s: 0.24, x0: 10, x1: 800, step: 58 }, { d: 62, s: 0.36, x0: -10, x1: 760, step: 88 },
  { d: 140, s: 0.54, x0: -30, x1: 700, step: 132 }, { d: 262, s: 0.8, x0: -60, x1: 480, step: 200 },
  { d: 16, s: 0.24, x0: 1590, x1: 1960, step: 58 }, { d: 62, s: 0.36, x0: 1640, x1: 1960, step: 88 },
];
function orchardTrees() {
  const r = rng(91), out = [];
  ROWS.forEach((row, ri) => { for (let x = row.x0; x <= row.x1; x += row.step) { const xx = x + (r() - 0.5) * row.step * 0.3; out.push({ x: xx, y: browY(xx) + row.d + (r() - 0.5) * 6, s: row.s * (0.92 + r() * 0.16), seed: ri * 40 + Math.round(x) }); } });
  return out.sort((a, b) => a.y - b.y);
}

defineSet('orchard', (ctx, v) => {
  const pal = OPAL[v] || OPAL.morning, dusk = v === 'dusk', S = O.sun;
  vgrad(ctx, 0, 0, W, 560, pal.sky);
  if (dusk) {
    for (let i = 0; i < 70; i++) dot(ctx, hash(i) * W, hash(i + 40) * 300, 0.8 + hash(i + 9) * 1.6, '#f6ecd0', (0.3 + hash(i + 3) * 0.6) * (1 - hash(i + 40)));
    glow(ctx, 1480, 470, 900, '#f2a45a', 0.55, 'source-over');
    dot(ctx, 430, 130, 30, '#f6ecd0', 0.95); dot(ctx, 442, 122, 27, '#1a2b31', 1);
  } else {
    glow(ctx, S.x, S.y + 30, 900, '#fff1c9', 0.6, 'source-over');
  }
  // clouds, lit from below by the low sun
  for (const [cx, cy, cw, sd] of [[260, 150, 280, 1], [700, 90, 220, 2], [1640, 170, 300, 3], [1060, 230, 180, 4]]) {
    wash(ctx, blobPoly(cx, cy, cw, 36, 12, rng(sd)), pal.cloud, { seed: sd, alpha: pal.cloudA, layers: 12 });
    wash(ctx, blobPoly(cx + 20, cy + 18, cw * 0.8, 16, 10, rng(sd + 9)), pal.cloudLit, { seed: sd + 9, alpha: pal.cloudA, layers: 10 });
  }
  wash(ctx, [...O.ridgeA, [1960, 620], [-40, 620]], pal.ridgeA, { seed: 11, alpha: 0.16, layers: 14, v: 0.3 });
  ctx.save(); ctx.fillStyle = pal.ridgeA; ctx.globalAlpha = 0.55; fillPts(ctx, catmull([...O.ridgeA, [1960, 620], [-40, 620]], 4, true)); ctx.restore();
  // far orchards, rows of dots on the far hills
  for (let rr = 0; rr < 4; rr++) for (let i = 0; i < 40; i++) { const fx = 40 + i * 48 + (rr % 2) * 24 + (hash(i * 7 + rr) - 0.5) * 14, fy = lineAt(O.ridgeA, fx) + 12 + rr * 9 + (hash(i + rr * 9) - 0.5) * 4; if (hash(i + rr * 50) < 0.45) continue; dot(ctx, fx, fy, 3 + rr * 0.6, pal.copse, 0.4); }
  shape(ctx, catmull([...O.ridgeB, [1960, 640], [-40, 640]], 4, true), pal.ridgeB, { seed: 12, boilAmp: 0.3, inkW: 1.6, inkA: 0.45 });
  // the valley: fields, hedges, copses
  const fr = rng(21);
  for (let row = 0; row < 8; row++) {
    const y0 = 490 + row * 24 + row * row * 0.9, y1 = y0 + 26 + row * 2;
    for (let x = -60; x < W + 60;) { const w = 90 + fr() * 180; wash(ctx, [[x, y0], [x + w, y0 + (fr() - 0.5) * 6], [x + w + 8, y1], [x - 6, y1]], pal.fields[Math.floor(fr() * 6)], { seed: row * 100 + x, alpha: 0.16, layers: 7, v: 0.25 }); if (fr() < 0.55) brushDry(ctx, [[x, y1], [x + w, y1 + (fr() - 0.5) * 4]], { w: 3, k: 3, alpha: 0.3, seed: row * 31 + x, dry: 0.45 }); x += w; }
  }
  ctx.save(); ctx.fillStyle = pal.hedge;
  for (let i = 0; i < 26; i++) { const hx = fr() * W, hy = 500 + fr() * 120; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.ellipse(hx, hy, 14 + fr() * 20, 7 + fr() * 5, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  // the river catches the sky
  const rv = ribbon(O.river, (p) => riverW(p[1]));
  shape(ctx, rv, pal.river, { seed: 31, boilAmp: 0.3, inkW: 1.8, inkA: 0.7, pool: 0.8, inkColor: pal.riverEdge });
  ctx.save(); ctx.beginPath(); tracePath(ctx, rv); ctx.clip(); glow(ctx, dusk ? 1480 : S.x, riverY(dusk ? 1480 : S.x), 360, pal.riverSun, 0.9, 'source-over');
  ctx.strokeStyle = '#fffaf0'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6; for (let i = 0; i < 40; i++) { const rx = hash(i * 4.1) * W, ry = riverY(rx) + (hash(i + 2) - 0.5) * riverW(riverY(rx)) * 0.5, L = 6 + riverW(ry) * 0.5; ctx.beginPath(); ctx.moveTo(rx - L, ry); ctx.lineTo(rx + L, ry); ctx.stroke(); }
  ctx.restore();
  // the town
  const T = town();
  let churchDone = false;
  for (const q of T.houses) { if (!churchDone && q.y > T.church.y) { church(ctx, T.church, pal); churchDone = true; } house(ctx, q, pal); }
  if (!churchDone) church(ctx, T.church, pal);
  for (let i = 0; i < 5; i++) wash(ctx, blobPoly(900 + i * 160, 600 + (i % 2) * 14, 150, 16, 10, rng(i + 70)), dusk ? '#9a9080' : '#fbf3dc', { seed: i + 70, alpha: 0.05 * pal.mist * 2, layers: 10 });
  // our hill, lit along the brow
  const ground = catmull([...O.brow, [1960, 1120], [-40, 1120]], 5, true);
  ctx.save(); const g = ctx.createLinearGradient(0, 590, 0, H); for (const [k, c] of pal.ground) g.addColorStop(k, c); ctx.fillStyle = g; fillPts(ctx, ground); ctx.restore();
  wash(ctx, [[-40, 700], [900, 740], [1960, 760], [1960, 1100], [-40, 1100]], pal.grass, { seed: 41, alpha: 0.05, layers: 12 });
  inkLoop(ctx, O.brow.concat([[1960, 1200], [-40, 1200]]), { w: 2.2, seed: 42, gaps: 3, alpha: 0.5 });
  for (let i = 0; i < 160; i++) { const gx = hash(i * 1.7) * W, gy = browY(gx) + 20 + Math.pow(hash(i * 2.3), 0.7) * (H - browY(gx)); const L = 8 + (gy - 600) * 0.05; brushDry(ctx, [[gx, gy], [gx + 3, gy - L]], { w: 2, k: 2, alpha: 0.35, seed: i, dry: 0.2 }); }
  // the path up to the brow and over, toward town
  const pth = ribbon(O.path, (p) => lerp(18, 96, clamp((p[1] - 712) / 202)));
  shape(ctx, pth, pal.path, { seed: 51, boilAmp: 0.3, inkW: 2, inkA: 0.5, pool: 0.6 });
  // rows of fruit trees, back to front
  for (const tr of orchardTrees()) fruitTree(ctx, tr.x, tr.y, tr.s, { pal, seed: tr.seed, shadow: 0.2 });
  fruitTree(ctx, 1905, 1062, 1.2, { pal, seed: 777, shadow: 0.22 });
  // wildflowers in the near meadow
  for (let i = 0; i < 220; i++) { const fx = hash(i * 3.1 + 7) * W, fy = 760 + Math.pow(hash(i * 1.9 + 2), 0.6) * 330; if (fy < browY(fx) + 40) continue; const fs = 2 + (fy - 700) * 0.009; dot(ctx, fx, fy, fs, pal.flowers[i % 4], 0.85); if (i % 3 === 0) dot(ctx, fx, fy, fs * 0.4, '#e3b23c', 0.9); }
});

/* ---------- orchard live pieces ---------- */
function lanternPost(ctx, x, y, s, t, o = {}) {
  const b = boil(t), H0 = 300 * s, dir = o.dir ?? -1, arm = 62 * s, seed = o.seed ?? 601;
  shape(ctx, rectPts(x - 7 * s, y - H0, 14 * s, H0), '#6e4630', { seed, b, inkW: 2.4 });
  shape(ctx, rectPts(x + (dir < 0 ? -arm : 0), y - H0 + 6 * s, arm + 7 * s, 10 * s), '#6e4630', { seed: seed + 1, b, inkW: 2.2 });
  const tx = x + dir * (arm - 12 * s), ty = y - H0 + 16 * s;
  inkLine(ctx, [[tx, ty], [tx, ty + 10 * s]], { w: 2.4, seed: seed + 2 });
  ctx.save(); ctx.translate(tx, ty + 10 * s); ctx.scale(s, s); lantern(ctx, 0, 150, t + (o.ph ?? 0), { glowA: o.glowA ?? 0.5, speak: o.speak, dim: o.dim, sleepy: o.sleepy }); ctx.restore();
  return [tx, ty + 10 * s + 106 * s];
}
const sunUp = (t) => ease.out(clamp(t / 22));
// the sun climbs out from behind the far hills, so its disk is clipped to the sky above them
function sunLight(ctx, t, up = 1) {
  const S = { x: O.sun.x, y: lerp(484, 338, up) };
  glow(ctx, S.x, S.y, 520 + up * 260, '#fff1c9', 0.22 + 0.2 * up + 0.02 * Math.sin(t * 0.7));
  ctx.save(); ctx.beginPath(); const rp = catmull(O.ridgeA, 4); ctx.moveTo(-60, -60); ctx.lineTo(1980, -60); for (let i = rp.length - 1; i >= 0; i--) ctx.lineTo(rp[i][0], rp[i][1] + 3); ctx.closePath(); ctx.clip();
  glow(ctx, S.x, S.y, 200, '#ffffff', 0.55); dot(ctx, S.x, S.y, O.sun.r, '#fff8e4', 1); glow(ctx, S.x, S.y, 90, '#fffbe8', 0.8);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(S.x, S.y, 40, S.x, S.y, 1300); rg.addColorStop(0, 'rgba(255,233,184,0.5)'); rg.addColorStop(1, 'rgba(255,233,184,0)'); ctx.fillStyle = rg;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * [0.16, 0.3, 0.44, 0.6, 0.74, 0.88][i] + Math.sin(t * 0.05 + i) * 0.03, sp = 0.022 + hash(i) * 0.02;
    ctx.globalAlpha = (0.07 + 0.035 * Math.sin(t * 0.4 + i * 1.3)) * up;
    ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(S.x + Math.cos(a - sp) * 2200, S.y + Math.sin(a - sp) * 2200); ctx.lineTo(S.x + Math.cos(a + sp) * 2200, S.y + Math.sin(a + sp) * 2200); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // glints where the river meets the sun
  for (let i = 0; i < 26; i++) { const gx = 1080 + hash(i * 2.1) * 520, gy = riverY(gx) + (hash(i + 5) - 0.5) * riverW(riverY(gx)) * 0.6, on = Math.pow(Math.max(0, Math.sin(t * (1.2 + hash(i) * 1.5) + i)), 4) * up; if (on > 0.05) dot(ctx, gx, gy, 1.6 + on * 1.6, '#fffaf0', on); }
}
// before sunrise the valley is in shadow. the shadow's edge slides toward us as the sun climbs.
function dawnShade(ctx, up) {
  if (up >= 0.999) return;
  const edge = lerp(420, 1500, up), g = ctx.createLinearGradient(0, edge - 220, 0, edge + 160);
  g.addColorStop(0, 'rgba(34,48,58,0)'); g.addColorStop(1, `rgba(34,48,58,${0.5 * (1 - up * 0.6)})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(-20, 380, W + 40, H - 360); ctx.globalAlpha = 0.24 * (1 - up); ctx.fillStyle = '#22303a'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
}
function smoke(ctx, t, c) {
  for (const [i, [x, y]] of town().chimneys.slice(0, 9).entries()) for (let k = 0; k < 3; k++) {
    const ph = frac(t * 0.07 + k / 3 + hash(i)); dot(ctx, x + ph * 50 + Math.sin(t * 0.5 + i + ph * 4) * 5, y - ph * 90, 3 + ph * 11, c, 0.3 * Math.sin(ph * Math.PI));
  }
}
function petals(ctx, t, n) {
  const b = boil(t);
  for (let i = 0; i < n; i++) {
    const ph = frac(hash(i) + t * 0.025 * (0.6 + hash(i + 1))), px = frac(hash(i + 2) - t * 0.01 * (0.5 + hash(i + 3))) * 2240 - 160 + Math.sin(t * 0.7 + i) * 30, py = -40 + ph * 1160;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(t * 0.9 + i) * 1.2);
    shape(ctx, catmull([[0, -7], [5, 0], [0, 7], [-5, 0]], 3, true), i % 3 ? '#fae8e2' : '#f4c9bf', { seed: i, b, inkW: 1.2, gaps: 1, pool: 0.3, boilAmp: 0.5 });
    ctx.restore();
  }
}
// walkers go up the path, over the brow, and down out of sight toward town
const walkH = (y) => lerp(150, 380, clamp((y - 712) / (914 - 712)));
const PATHN = (() => {
  const segs = []; let acc = 0;
  for (let i = 1; i < O.path.length; i++) { const a = O.path[i - 1], b = O.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = L / walkH((a[1] + b[1]) / 2); segs.push({ a, b, n0: acc, n }); acc += n; }
  return { segs, total: acc };
})();
function pathAt(n) {
  for (const sg of PATHN.segs) if (n <= sg.n0 + sg.n) { const k = (n - sg.n0) / sg.n, x = lerp(sg.a[0], sg.b[0], k), y = lerp(sg.a[1], sg.b[1], k); return { x, y, h: walkH(y), sink: 0 }; }
  const last = O.path[O.path.length - 1], over = n - PATHN.total, h = walkH(last[1]) * (1 - 0.12 * over);
  return { x: last[0] + over * h * 0.55, y: last[1] + over * h * 0.9, h, sink: over };
}
const WALKERS = [
  { who: crowdStyle(12), ph: 0.05, basket: true, seed: 3 },
  { who: crowdStyle(40), ph: 0.42, seed: 5 },
  { who: crowdStyle(47), ph: 0.42, lag: 0.3, seed: 7 },
  { who: KIDS[3], ph: 0.75, kid: true, age: 9, seed: 9 },
];
const WALK = { rate: 0.3, period: 30, sinkMax: 1.3 };
function walkerActors(ctx, t) {
  const out = [], pace = (WALK.rate * Math.PI) / 0.26;
  for (const w of WALKERS) {
    const n = frac(t / WALK.period + w.ph) * WALK.period * WALK.rate - (w.lag ?? 0);
    if (n < 0 || n > PATHN.total + WALK.sinkMax) continue;
    const p = pathAt(n), hh = w.kid ? p.h / 0.64 : p.h;
    const bob = w.kid ? Math.abs(Math.sin(t * pace)) * 0.03 * p.h : 0, sw = Math.sin(t * pace) * 0.3;
    out.push({ y: p.y, draw: () => {
      ctx.save();
      if (p.sink > 0) { ctx.beginPath(); ctx.moveTo(-200, -200); ctx.lineTo(2200, -200); for (let i = O.brow.length - 1; i >= 0; i--) ctx.lineTo(O.brow[i][0], O.brow[i][1] + 4); ctx.closePath(); ctx.clip(); }
      const P = person(ctx, { who: w.who, x: p.x, y: p.y - bob, h: hh, age: w.age, f: 1, pose: 'walk', pace, t, seed: w.seed, arms: w.basket ? [[0.15, 0.25], [-sw, 0.2]] : [[sw, 0.2], [-sw, 0.2]], mood: 'smile' });
      if (w.basket) { const [bx, by] = P.handF, s = P.h / 380; ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(bx, by + 18 * s, 22 * s, Math.PI, 0); ctx.stroke(); ctx.restore(); shape(ctx, [[bx - 30 * s, by + 18 * s], [bx + 30 * s, by + 18 * s], [bx + 22 * s, by + 52 * s], [bx - 22 * s, by + 52 * s]], '#c98a4a', { seed: 91, b: boil(t), inkW: 2 }); for (let k = 0; k < 3; k++) dot(ctx, bx - 14 * s + k * 14 * s, by + 14 * s, 8 * s, '#dc6a3c', 0.95); }
      ctx.restore();
    } });
  }
  return out;
}

shot('garden.dawn', {
  grade: () => GARDEN,
  draw(ctx, t, st) {
    const cam = drift(t, { x: 960, y: 540, z: 1.0 }, { x: 1010, y: 556, z: 1.12 }, 24);
    applyCam(ctx, cam);
    drawSet(ctx, 'orchard', 'morning');
    const up = sunUp(t);
    sunLight(ctx, t, up);
    dawnShade(ctx, up);
    // on the second line the lanterns that burned all night go to sleep, far ones first
    const later = laterBeat(st, t), bp = beatPt(st, t), asleep = (k) => later && bp > 0.8 + k * 1.3;
    const lampGlow = lerp(0.85, 0.4, up);
    smoke(ctx, t, '#fbf3e4');
    flock(ctx, t, { y: 250, v: 60, n: 7, s: 13, ph: 0.35 });
    flock(ctx, t, { y: 150, v: 44, n: 5, s: 10, ph: 0.8 });
    const actors = walkerActors(ctx, t);
    O.lamps.forEach((L, i) => actors.push({ y: L.y, draw: () => { const z = asleep(2 - i); lanternPost(ctx, L.x, L.y, L.s, t, { ph: i * 1.37, seed: 610 + i * 10, glowA: z ? 0.12 : lampGlow, dim: z, sleepy: z }); } }));
    const F = O.frontTree;
    actors.push({ y: F.y, draw: () => fruitTree(ctx, F.x, F.y, F.s, { pal: OPAL.morning, seed: 333, b: boil(t), fruit: 1.4 }) });
    actors.push({ y: 1000, draw: () => {
      kneesUp(ctx, { who: { ...crowdStyle(30), hair: 'short', hairC: '#a8a096', top: '#6f8a5b' }, x: 1300, y: 1004, h: 480, f: 1, arms: [[1.0, -0.4], [-0.5, 0.1]], mood: 'smile', t, seed: 13, look: 0.4 });
      kneesUp(ctx, { who: KIDS[1], x: 1500, y: 1012, h: 480, age: 8, f: 1, arms: blendArms([[1.0, -0.4], [0.9, -0.3]], [[2.45, 0.15], [0.9, -0.3]], settle(t, 2, 1.6)), mood: up > 0.3 ? 'smile' : 'calm', t, seed: 17, look: 0.8 });
    } });
    actors.push({ y: O.post.y, draw: () => { const z = asleep(3); lanternPost(ctx, O.post.x, O.post.y, O.post.s, t, { ph: 4.1, seed: 650, glowA: z ? 0.12 : lampGlow, dim: z, sleepy: z }); perchedBird(ctx, O.post.x + 20, O.post.y - 300 * O.post.s + 6, 14, t, 5); } });
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
    flock(ctx, t, { y: 380, v: 80, n: 3, s: 20, ph: 0.1 });
    petals(ctx, t, 34);
  },
});

/* ---------- a small tree on the hill ---------- */
function sapling(ctx, t, o = {}) {
  const { x, y } = O.sapling, b = boil(t), dusk = !!o.dusk, level = o.level ?? 1, mh = lerp(4, 22, level), sw = Math.sin(t * 2.1) * 3 * (o.amp ?? 1) + Math.sin(t * 0.9) * 2;
  shape(ctx, catmull([[x - 120, y + 10], [x - 64, y - mh * 0.65], [x + 40, y - mh], [x + 118, y + 6], [x, y + 24]], 5, true), o.wet ? '#6e4a32' : '#8a6040', { seed: 301, b, inkW: 2.4 });
  if (level < 1) { ctx.save(); ctx.fillStyle = '#3a271c'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(x - 6, y - mh * 0.5, 80 * (1 - level), 13 * (1 - level), 0, 0, TAU); ctx.fill(); ctx.restore(); }
  shape(ctx, rectPts(x + 24, y - 252, 12, 250), dusk ? '#7a5a3c' : PAL.woodL, { seed: 302, b, inkW: 2.2 });
  const leaf = dusk ? '#5e7c4c' : '#86b05a', leafD = dusk ? '#4a6a40' : '#6c9a4a';
  tube(ctx, [[x, y - 8], [x + 2, y - 90], [x - 2 + sw * 0.3, y - 170], [x + sw, y - 250]], 9, '#8a5a3b', { seed: 303, b, inkW: 3.2 });
  const tips = [[x - 70 + sw, y - 214, y - 150], [x + 72 + sw, y - 226, y - 170], [x - 44 + sw, y - 280, y - 210], [x + 40 + sw, y - 298, y - 226], [x + sw * 1.2, y - 316, y - 246]];
  for (const [i, [tx, ty, by]] of tips.entries()) tube(ctx, [[x + sw * 0.5, by], [lerp(x, tx, 0.6), lerp(by, ty, 0.5) - 6], [tx, ty]], 4, '#8a5a3b', { seed: 304 + i, b, inkW: 2.4 });
  let k = 0;
  for (const [tx, ty, by] of tips) for (let j = 0; j < 4; j++, k++) {
    const u = 0.35 + j * 0.22, lx = lerp(x, tx, u) + (j % 2 ? 10 : -10), ly = lerp(by, ty, u) - 6, a = (j % 2 ? 0.5 : -0.5) + Math.sin(t * 1.3 + k) * 0.08;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(a); shape(ctx, catmull([[-16, 0], [0, -10], [16, 0], [0, 8]], 3, true), k % 3 ? leaf : leafD, { seed: 320 + k, b, inkW: 1.6, gaps: 1 }); ctx.restore();
  }
  for (let i = 0; i < 4; i++) dot(ctx, tips[i][0] + 4, tips[i][1] + 2, 6, dusk ? '#e8d4cc' : '#fae8e2', 0.95);
  inkLine(ctx, [[x + 24, y - 150], [x + 4, y - 146]], { w: 2.4, seed: 340, color: '#c0452f' });
  // Wren's tag for her grandfather, hung on the stake
  const sx = x + 30, sy = y - 250;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.8) * 0.03);
  inkLine(ctx, [[0, 0], [-28, 30]], { w: 2, seed: 341 }); inkLine(ctx, [[0, 0], [30, 30]], { w: 2, seed: 342 });
  shape(ctx, rrectPts(-96, 28, 192, 60, 10), dusk ? '#c9aa74' : '#e8cf96', { seed: 343, b, inkW: 2.2 });
  letter(ctx, 'for Grandpa', 0, 70, { font: '700 36px Caveat, cursive', align: 'center', color: '#5e3b27' });
  ctx.restore();
}
// one load of soil per period: dig at the pile, carry, tip it into the hole, come back
const SHOV = { pile: [1010, 996], mid: [1100, 846], dump: [1168, 900], period: 2.6 };
function shovelAt(pt) {
  const P = SHOV.period, n = Math.floor(pt / P), ph = frac(pt / P);
  // six loads fill the hole, then she rests on the shovel where the last one came from
  if (n >= 6) return { blade: SHOV.pile, tip: 0, load: 0, ph: 0.45, lean: 0.06, level: 1, since: pt - 5.8 * P };
  const q = (a, m, c, k) => [lerp(lerp(a[0], m[0], k), lerp(m[0], c[0], k), k), lerp(lerp(a[1], m[1], k), lerp(m[1], c[1], k), k)];
  let blade, tip = 0, load = 0;
  if (ph < 0.3) { blade = [SHOV.pile[0] + Math.sin(ph * 60) * 4, SHOV.pile[1] - Math.abs(Math.sin(ph * 30)) * 6]; load = ph > 0.22 ? 1 : 0; }
  else if (ph < 0.58) { blade = q(SHOV.pile, SHOV.mid, SHOV.dump, ease.inOut((ph - 0.3) / 0.28)); load = 1; }
  else if (ph < 0.74) { blade = SHOV.dump; tip = ease.out((ph - 0.58) / 0.16); load = 1 - tip; }
  else { blade = q(SHOV.dump, SHOV.mid, SHOV.pile, ease.inOut((ph - 0.74) / 0.26)); tip = 1 - ease.out(clamp((ph - 0.74) / 0.12)); }
  const hits = n + (ph > 0.8 ? 1 : 0), lastHit = (ph > 0.8 ? n + 0.8 : n - 0.2) * P;
  const lean = 0.1 + 0.18 * (1 - smooth(0.2, 0.45, ph) + smooth(0.8, 1, ph));
  return { blade, tip, load, ph, lean, level: clamp(hits / 5), since: pt - lastHit };
}
function shovel(ctx, t, grip, blade, tip, load) {
  const b = boil(t), dx = blade[0] - grip[0], dy = blade[1] - grip[1], L = Math.hypot(dx, dy) || 1;
  tube(ctx, [[grip[0] - (dx / L) * 40, grip[1] - (dy / L) * 40], blade], 9, '#b0784c', { seed: 360, b, inkW: 3 });
  ctx.save(); ctx.translate(blade[0], blade[1]); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2 - tip * 0.9);
  shape(ctx, [[-36, -6], [36, -6], [30, 54], [0, 76], [-30, 54]], '#9aa6a6', { seed: 361, b, inkW: 2.6, shade: { dx: 6, dy: 6, a: 0.15 } });
  if (load > 0.05) shape(ctx, circlePts(0, 30, 38 * load, 22 * load, 12), '#6e4a32', { seed: 362, b, inkW: 2, gaps: 1 });
  ctx.restore();
}
function soilFall(ctx, t, s) {
  if (s.ph < 0.6 || s.ph > 0.88) return;
  const k = (s.ph - 0.6) / 0.28, b = boil(t), top = O.sapling.y - lerp(4, 22, s.level) - 6;
  for (let i = 0; i < 8; i++) { const tx = O.sapling.x - 80 + i * 14, px = lerp(SHOV.dump[0] + 10 + (i - 4) * 6, tx, k), py = lerp(SHOV.dump[1] + 60, top, k * k); shape(ctx, circlePts(px, py, 11 + hash(i) * 6, 9 + hash(i + 2) * 5, 9), i % 2 ? '#6e4a32' : '#7e5438', { seed: 370 + i, b, inkW: 1.8, gaps: 1 }); }
}

shot('garden.tree', {
  grade: (st) => (st.p.dusk ? { tint: '#d8e8a8', tintA: 0.12, vig: 0.92 } : GARDEN),
  draw(ctx, t, st) {
    const dusk = !!st.p.dusk, age = wrenAge(st), pt = st.pt ?? t;
    // Mara's line is the emotional one, so the camera leans in on the two of them while it plays
    const lean = dusk && says(st, 'mara') ? settle(pt, 0.6, 2.4) : 0;
    const base = dusk ? drift(t, { x: 1080, y: 690, z: 1.3 }, { x: 1060, y: 700, z: 1.36 }, 22) : drift(t, { x: 1158, y: 640, z: 1.26 }, { x: 1150, y: 650, z: 1.3 }, 22);
    const cam = dusk ? mixCam(base, { x: 990, y: 740, z: 1.72 }, says(st, 'mara') ? settle(pt, 0.3, 7) : 0) : mixCam(base, { x: 1180, y: 650, z: 1.45 }, settle(pt, 1.5, 10));
    applyCam(ctx, cam);
    drawSet(ctx, 'orchard', dusk ? 'dusk' : 'morning');
    if (!dusk) { sunLight(ctx, t, 1); smoke(ctx, t, '#fbf3e4'); flock(ctx, t, { y: 300, v: 50, n: 5, s: 12, ph: 0.4 }); }
    const post = O.post;
    const lampAt = lanternPost(ctx, post.x, post.y, post.s, t, { ph: 4.1, seed: 650, glowA: dusk ? 0.75 : 0.5 });
    if (dusk) {
      sapling(ctx, t, { dusk });
      sitFront(ctx, { who: 'mara', x: 880, y: 1012, h: 760, t, seed: 21, rot: -0.04 * lean, mood: says(st, 'mara') ? 'calm' : 'smile', speak: says(st, 'mara'), look: 0.45 });
      sitFront(ctx, { who: 'wren', x: 1085, y: 1016, h: 720, age, t, seed: 25, rot: -0.3 * lean, slide: -40 * lean, slump: 0.11 * lean, mood: lean > 0.8 ? 'sleep' : 'calm', speak: says(st, 'wren'), look: -0.5 * (1 - lean) });
    } else {
      const s = shovelAt(pt);
      sapling(ctx, t, { wet: true, level: s.level, amp: 1 + 2.6 * Math.exp(-3 * Math.max(0, s.since)) });
      ctx.save(); const pk = 1 - 0.5 * s.level; shape(ctx, catmull([[SHOV.pile[0] - 90, 1004], [SHOV.pile[0] - 40, 1000 - 40 * pk], [SHOV.pile[0] + 30, 1000 - 46 * pk], [SHOV.pile[0] + 86, 1006], [SHOV.pile[0], 1016]], 5, true), '#7e5438', { seed: 380, b: boil(t), inkW: 2.2 }); ctx.restore();
      const mo = { who: 'mara', x: 900, y: 1012, h: 720, f: 1, t, seed: 21, lean: s.lean };
      const bf = bodyFrame(mo), toward = [bf.shB[0] + 40, 560], dx = toward[0] - s.blade[0], dy = toward[1] - s.blade[1], L = Math.hypot(dx, dy);
      const grip = [s.blade[0] + (dx / L) * 470, s.blade[1] + (dy / L) * 470], low = [s.blade[0] + (dx / L) * 330, s.blade[1] + (dy / L) * 330];
      const M = person(ctx, { ...mo, arms: [ikArm(bf, low, true), ikArm(bf, grip, false)], mood: 'calm', speak: says(st, 'mara'), look: 0.5 });
      shovel(ctx, t, grip, s.blade, s.tip, s.load);
      shape(ctx, circlePts(M.handF[0], M.handF[1], 0.032 * M.h, 0.03 * M.h, 14), STYLE.mara.skin, { seed: 66, b: boil(t), inkW: 2.2, pool: 0.5 });
      soilFall(ctx, t, s);
      kneesUp(ctx, { who: 'wren', x: 1470, y: 1016, h: 720, age, f: -1, arms: 'plant', mood: 'calm', speak: says(st, 'wren'), t, seed: 25, look: 0 });
    }
    if (dusk) {
      lightMask(ctx, 'rgba(14,22,28,0.42)', [{ x: lampAt[0], y: lampAt[1], r: 760, a: 1 }, { x: 1480, y: 470, r: 700, a: 0.55 }, { x: 980, y: 790, r: 560, a: 0.6 }], camFit(cam));
      applyCam(ctx, cam);
      glow(ctx, lampAt[0], lampAt[1], 420, PAL.lamp, 0.35);
      fireflies(ctx, t, { x: 420, y: 480, w: 1460, h: 520 }, 46, [[760, 560, 1180, 1030]]);
    } else perchedBird(ctx, post.x + 20, post.y - 300 * post.s + 6, 14, t, 5);
  },
});

/* ---------- the ward ---------- */
const WD = { floorY: 862, door: { x: 1726, y: 290, w: 150 }, wins: [{ x: 250, y: 110, w: 320, h: 430 }, { x: 800, y: 110, w: 320, h: 430 }, { x: 1350, y: 110, w: 320, h: 430 }], beds: [150, 690, 1230], bedW: 420, bedY: 690 };
function bed(ctx, x, y, w, seed) {
  const steel = '#d8d4c6', fy = WD.floorY;
  for (const lx of [x + 16, x + w - 16]) { shape(ctx, rectPts(lx - 6, y + 50, 12, fy - y - 64), steel, { seed: seed + lx, inkW: 2 }); shape(ctx, circlePts(lx, fy - 10, 12, 12, 12), '#5c5a55', { seed: seed + lx + 1, inkW: 1.8 }); }
  shape(ctx, rectPts(x, y + 50, w, 18), steel, { seed: seed + 1, inkW: 2.2 });
  tube(ctx, [[x, y + 60], [x, y - 150], [x + 8, y - 164], [x + 60, y - 164], [x + 68, y - 150], [x + 68, y + 10]], 10, steel, { seed: seed + 2, inkW: 3 });
  for (let i = 1; i < 4; i++) inkLine(ctx, [[x + i * 17, y - 150], [x + i * 17, y]], { w: 3, seed: seed + 3 + i, alpha: 0.6 });
  tube(ctx, [[x + w, y + 60], [x + w, y - 50], [x + w - 8, y - 60], [x + w - 50, y - 60], [x + w - 56, y - 50], [x + w - 56, y + 10]], 10, steel, { seed: seed + 8, inkW: 3 });
  shape(ctx, rrectPts(x + 6, y, w - 12, 50, 10), '#f6f2e6', { seed: seed + 9, shade: { dx: 0, dy: 10, a: 0.12 } });
  shape(ctx, [[x + 70, y + 4], [x + w - 10, y + 4], [x + w - 4, y + 82], [x + 76, y + 78]], '#fbf8ef', { seed: seed + 10, inkW: 2.4 });
  shape(ctx, rrectPts(x + 14, y - 38, 120, 48, 20), '#fffdf6', { seed: seed + 11, inkW: 2.4 });
  shape(ctx, rrectPts(x + w - 150, y - 26, 130, 34, 6), '#8fb59a', { seed: seed + 12, inkW: 2.2 });
  inkLine(ctx, [[x + w - 146, y - 10], [x + w - 24, y - 10]], { w: 2, seed: seed + 13, alpha: 0.5 });
}
function brightPane(ctx, r, seed) {
  vgrad(ctx, r.x, r.y, r.w, r.h, [[0, '#d6e8d6'], [0.7, '#f4efcc'], [1, '#fbe6b4']]);
  ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  wash(ctx, [[r.x - 10, r.y + r.h + 10], [r.x - 10, r.y + r.h * 0.72], [r.x + r.w * 0.5, r.y + r.h * 0.64], [r.x + r.w + 10, r.y + r.h * 0.7], [r.x + r.w + 10, r.y + r.h + 10]], '#a9c48a', { seed: seed + 3, alpha: 0.25, layers: 8, v: 0.3 });
  const tr = rng(seed);
  for (let i = 0; i < 5; i++) wash(ctx, blobPoly(r.x + r.w * (0.25 + tr() * 0.6), r.y + r.h * (0.3 + tr() * 0.3), 70, 60, 9, tr), '#8fb06a', { seed: seed + 10 + i, alpha: 0.14, layers: 8 });
  for (let i = 0; i < 26; i++) dot(ctx, r.x + r.w * (0.2 + tr() * 0.75), r.y + r.h * (0.2 + tr() * 0.45), 3 + tr() * 2, '#fae8e2', 0.9);
  glow(ctx, r.x + r.w * 0.8, r.y + 40, 200, '#fff6d8', 0.6, 'source-over');
  ctx.restore();
}
function drawing(ctx, x, y, w, h, rot, seed, fn) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot);
  shape(ctx, rectPts(-w / 2, -h / 2, w, h), '#fbf6ea', { seed, inkW: 1.8, pool: 0.3, boilAmp: 0.4 });
  for (const s of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#e9e2c8'; ctx.translate(s * w * 0.36, -h / 2); ctx.rotate(s * 0.5); ctx.fillRect(-16, -7, 32, 14); ctx.restore(); }
  fn(-w / 2, -h / 2); ctx.restore();
}
defineSet('ward', (ctx) => {
  const fy = WD.floorY;
  ctx.fillStyle = '#ece6cf'; ctx.fillRect(0, 0, W, fy + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 940), '#f5f0dc', { seed: 1, alpha: 0.07, layers: 14 });
  shape(ctx, rectPts(-10, 600, W + 20, fy - 600), '#b9cfa8', { seed: 2, boilAmp: 0.4 });
  shape(ctx, rectPts(-10, 588, W + 20, 18), '#efe8d0', { seed: 3, boilAmp: 0.4, inkW: 2.2 });
  ctx.fillStyle = '#dccca2'; ctx.fillRect(0, fy, W, H - fy);
  wash(ctx, rectPts(-40, fy, W + 80, 260), '#cdb98c', { seed: 4, alpha: 0.08, layers: 10 });
  for (let i = -12; i <= 12; i++) brushDry(ctx, [[960 + i * 60, fy], [960 + i * 170, H + 20]], { w: 2.5, k: 3, alpha: 0.25, seed: i + 40, dry: 0.3 });
  for (const yy of [905, 965, 1045]) brushDry(ctx, [[0, yy], [W, yy]], { w: 2.5, k: 3, alpha: 0.2, seed: yy });
  shape(ctx, rectPts(-10, fy - 22, W + 20, 26), '#a8bf96', { seed: 5, boilAmp: 0.4, inkW: 2.2 });
  // the way home: a door at the end of the ward, open onto a bright hall
  const D = WD.door;
  vgrad(ctx, D.x, D.y, D.w, fy - D.y, [[0, '#fbf1d4'], [1, '#efdcae']]);
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#e2c78f'; fillPts(ctx, [[D.x, fy], [D.x + D.w, fy], [D.x + D.w + 40, fy + 30], [D.x - 10, fy + 30]]); ctx.restore();
  shape(ctx, [[D.x + D.w - 6, D.y + 6], [D.x + D.w + 36, D.y + 30], [D.x + D.w + 36, fy + 10], [D.x + D.w - 6, fy]], '#b9cfa8', { seed: 120, inkW: 2.2 });
  for (const q of [[D.x - 18, D.y - 18, D.w + 36, 20], [D.x - 18, D.y - 18, 20, fy - D.y + 18], [D.x + D.w - 2, D.y - 18, 20, fy - D.y + 18]]) shape(ctx, rectPts(...q), '#efe8d0', { seed: 121 + q[0], boilAmp: 0.4, inkW: 2.2 });
  WD.wins.forEach((r, i) => { brightPane(ctx, r, 30 + i * 10); windowFrame(ctx, r, '#f6f1e2', 60 + i * 10, 1); shape(ctx, rectPts(r.x, r.y + r.h * 0.46, r.w, 12), '#f6f1e2', { seed: 90 + i, boilAmp: 0.4, inkW: 2 }); shape(ctx, rectPts(r.x - 34, r.y + r.h + 14, r.w + 68, 18), '#efe8d0', { seed: 95 + i, boilAmp: 0.4, inkW: 2.4 }); });
  // children's drawings, taped up by the ones who went home
  const red = '#c0452f', blue = '#4f7a8a', gold = '#e3b23c', green = '#6f8a5b';
  drawing(ctx, 50, 170, 150, 170, -0.05, 101, (x, y) => { crayon(ctx, circlePts(x + 75, y + 60, 26, 26, 14).concat([[x + 101, y + 60]]), gold, 5); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; crayon(ctx, [[x + 75 + Math.cos(a) * 34, y + 60 + Math.sin(a) * 34], [x + 75 + Math.cos(a) * 48, y + 60 + Math.sin(a) * 48]], gold, 4); } crayon(ctx, [[x + 20, y + 150], [x + 130, y + 146]], green, 5); crayon(ctx, [[x + 50, y + 146], [x + 50, y + 110]], green, 4); crayon(ctx, circlePts(x + 50, y + 104, 9, 9, 10), red, 5); });
  drawing(ctx, 604, 150, 170, 190, 0.04, 102, (x, y) => { letter(ctx, 'THANK', x + 85, y + 58, { font: '700 38px Caveat, cursive', align: 'center', color: blue }); letter(ctx, 'YOU!', x + 85, y + 100, { font: '700 38px Caveat, cursive', align: 'center', color: red }); for (let k = 0; k < 3; k++) heart(ctx, x + 40 + k * 45, y + 150, 16, '#e0806f', 0.9, 0, k); });
  drawing(ctx, 620, 380, 150, 150, -0.06, 103, (x, y) => { crayon(ctx, [[x + 90, y + 120], [x + 70, y + 90], [x + 86, y + 50], [x + 94, y + 74], [x + 108, y + 58], [x + 112, y + 96], [x + 90, y + 120]], '#f2a444', 4.5); dot(ctx, x + 84, y + 96, 3, PAL.ink); dot(ctx, x + 98, y + 96, 3, PAL.ink); crayon(ctx, circlePts(x + 40, y + 58, 12, 12, 10), '#8a4a2a', 4); crayon(ctx, [[x + 40, y + 70], [x + 40, y + 110], [x + 28, y + 136]], '#8a4a2a', 4); crayon(ctx, [[x + 40, y + 110], [x + 52, y + 136]], '#8a4a2a', 4); crayon(ctx, [[x + 22, y + 86], [x + 66, y + 84]], '#8a4a2a', 4); });
  drawing(ctx, 1150, 160, 170, 180, 0.05, 104, (x, y) => { crayon(ctx, [[x + 30, y + 140], [x + 30, y + 80], [x + 85, y + 40], [x + 140, y + 80], [x + 140, y + 140], [x + 30, y + 140]], red, 5); crayon(ctx, rectPts(x + 72, y + 100, 26, 40).concat([[x + 72, y + 100]]), blue, 4); letter(ctx, 'home!', x + 85, y + 172, { font: '700 34px Caveat, cursive', align: 'center', color: green }); });
  drawing(ctx, 1712, 116, 150, 124, -0.04, 105, (x, y) => { heart(ctx, x + 75, y + 62, 54, '#e0806f', 0.9, 0, 9); });
  drawing(ctx, 1155, 346, 160, 160, 0.06, 106, (x, y) => { ctx.save(); ctx.translate(x + 80, y + 80); ctx.rotate(-0.5); crayon(ctx, rrectPts(-50, -22, 100, 44, 22).concat([[-28, -22]]), blue, 5); crayon(ctx, [[0, -22], [0, 22]], blue, 4); ctx.restore(); dot(ctx, x + 64, y + 76, 3.5, PAL.ink); dot(ctx, x + 86, y + 66, 3.5, PAL.ink); crayon(ctx, [[x + 66, y + 94], [x + 80, y + 98], [x + 94, y + 86]], PAL.ink, 3); letter(ctx, 'pill!', x + 80, y + 146, { font: '700 32px Caveat, cursive', align: 'center', color: red }); });
  WD.beds.forEach((bx, i) => bed(ctx, bx, WD.bedY, WD.bedW, 700 + i * 30));
});
function stillLife(ctx, t) {
  const b = boil(t), ty = 890;
  shape(ctx, rectPts(70, ty + 26, 460, 220), '#e3ddc8', { seed: 801, b, shade: { dx: 0, dy: 20, a: 0.12 } });
  inkLine(ctx, [[90, ty + 90], [510, ty + 90]], { w: 2.4, seed: 802, alpha: 0.6 }); dot(ctx, 300, ty + 60, 7, PAL.inkSoft, 0.8);
  shape(ctx, rrectPts(40, ty, 520, 32, 10), '#f4f0e4', { seed: 803, b });
  // flowers in a jar
  const jx = 150, jy = ty;
  const heads = [[-60, -250, 'd'], [-10, -300, 't'], [40, -262, 'd'], [-36, -206, 't2'], [70, -210, 'd'], [10, -228, 'd']];
  heads.forEach(([dx, dy, k], i) => {
    const sw = Math.sin(t * 0.8 + i * 1.3) * 5, fx = jx + dx + sw, fy = jy + dy;
    inkLine(ctx, [[jx + dx * 0.2, jy - 60], [lerp(jx + dx * 0.2, fx, 0.5), lerp(jy - 60, fy, 0.5)], [fx, fy]], { w: 4, seed: 810 + i, color: '#5d7a52' });
    if (k === 'd') { for (let p = 0; p < 9; p++) { const a = (p / 9) * TAU; shape(ctx, circlePts(fx + Math.cos(a) * 16, fy + Math.sin(a) * 16, 9, 6, 8, a), '#fbf8ef', { seed: 820 + i * 10 + p, b, inkW: 1.4, gaps: 1, pool: 0.3 }); } shape(ctx, circlePts(fx, fy, 9, 9, 10), '#e3b23c', { seed: 830 + i, b, inkW: 1.6 }); }
    else shape(ctx, catmull([[fx - 16, fy - 20], [fx - 6, fy - 8], [fx, fy - 24], [fx + 6, fy - 8], [fx + 16, fy - 20], [fx + 14, fy + 8], [fx, fy + 16], [fx - 14, fy + 8]], 3, true), k === 't' ? '#e89a86' : '#e3b23c', { seed: 840 + i, b, inkW: 2 });
  });
  shape(ctx, rrectPts(jx - 52, jy - 128, 104, 130, 18), 'rgba(226,240,236,0.5)', { seed: 850, b, flat: true, inkW: 2.4 });
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#bfe0d8'; fillPts(ctx, rrectPts(jx - 46, jy - 80, 92, 76, 14)); ctx.restore();
  // the tray, and the pill that used to be a death sentence
  shape(ctx, rrectPts(280, ty - 20, 260, 24, 8), '#b9c3c3', { seed: 860, b, inkW: 2.4 });
  const bx = 370, by = ty - 20;
  shape(ctx, rrectPts(bx - 44, by - 130, 88, 130, 14), '#c98a3c', { seed: 861, b, shade: { dx: 10, dy: 0, a: 0.2 } });
  shape(ctx, rrectPts(bx - 40, by - 168, 80, 42, 8), '#f6f2e6', { seed: 862, b, inkW: 2.4 });
  shape(ctx, rectPts(bx - 36, by - 104, 72, 60), '#fbf8ef', { seed: 863, b, inkW: 2, pool: 0.3 });
  letter(ctx, 'Rx', bx, by - 58, { font: '700 40px Alegreya, Georgia, serif', align: 'center', color: '#8a2f2a' });
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff4d6'; ctx.fillRect(bx + 24, by - 124, 8, 110); ctx.restore();
  for (const [px, c, rot] of [[450, '#f6f2e6', 0.3], [486, '#e89a86', -0.2]]) { ctx.save(); ctx.translate(px, by - 8); ctx.rotate(rot); shape(ctx, rrectPts(-16, -8, 32, 16, 8), c, { seed: 870 + px, b, inkW: 1.8 }); ctx.restore(); }
}
// the sun moves while we watch, so its light slides across the empty beds and the floor
function sunShafts(ctx, t, wins, floorY) {
  const off = 260 + 200 * ease.inOut(clamp(t / 40)), bot = floorY + 220;
  const edgeAt = (r, y) => { const k = (y - r.y) / (bot - r.y); return [r.x + off * k, r.x + r.w + off * k]; };
  ctx.save(); ctx.fillStyle = '#fff3c8'; ctx.globalAlpha = 0.34;
  for (const r of wins) { const [a0, a1] = edgeAt(r, floorY + 4), [b0, b1] = edgeAt(r, H + 40); fillPts(ctx, [[a0, floorY + 4], [a1, floorY + 4], [b1, H + 40], [b0, H + 40]]); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff1c9';
  wins.forEach((r, i) => { ctx.globalAlpha = 0.07 + 0.015 * Math.sin(t * 0.5 + i); fillPts(ctx, [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w + off, bot], [r.x + off, bot]]); });
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const r = wins[i % wins.length], u = frac(hash(i) + t * 0.006 * (0.5 + hash(i + 1))), v = hash(i + 7); const px = r.x + v * r.w + u * off + Math.sin(t * 0.3 + i) * 8, py = r.y + u * (bot - r.y); dot(ctx, px, py, 1.2 + hash(i + 4) * 1.8, '#fff3d0', 0.25 + 0.25 * Math.sin(t * 0.8 + i * 1.7) ** 2); }
  ctx.restore();
}
function balloon(ctx, x, y, r, c, t, seed, tie) {
  const bx = x + Math.sin(t * 0.7 + seed) * 10, by = y + Math.sin(t * 0.9 + seed * 2) * 6;
  inkLine(ctx, [tie, [lerp(tie[0], bx, 0.5) + Math.sin(t + seed) * 10, lerp(tie[1], by, 0.5)], [bx, by + r]], { w: 1.8, seed, alpha: 0.7 });
  shape(ctx, catmull([[bx, by - r], [bx + r * 0.85, by - r * 0.3], [bx + r * 0.5, by + r * 0.8], [bx, by + r], [bx - r * 0.5, by + r * 0.8], [bx - r * 0.85, by - r * 0.3]], 4, true), c, { seed: seed + 1, b: boil(t), shade: { dx: -r * 0.2, dy: r * 0.2, a: 0.2 } });
  dot(ctx, bx + r * 0.3, by - r * 0.45, r * 0.14, '#fffaf0', 0.7);
}
function rxBag(ctx, x, y, t) {
  const b = boil(t);
  inkLine(ctx, [[x, y], [x, y + 16]], { w: 2.4, seed: 890 });
  shape(ctx, [[x - 34, y + 16], [x + 34, y + 16], [x + 38, y + 104], [x - 38, y + 104]], '#f6f2e6', { seed: 891, b, inkW: 2.2 });
  inkLine(ctx, [[x - 34, y + 30], [x + 34, y + 30]], { w: 1.8, seed: 892, alpha: 0.5 });
  letter(ctx, 'Rx', x, y + 84, { font: '700 36px Alegreya, Georgia, serif', align: 'center', color: '#8a2f2a' });
}
const PATIENT = { skin: '#d9a27e', hair: 'side', hairC: '#c9c1b3', top: '#a0785a', topIn: '#e9dfc9', pants: '#57604a', shoes: '#3a2a22', glasses: true, wide: 1.05 };
const DAUGHTER = { skin: '#d9a27e', hair: 'long', hairC: '#5a3a26', top: '#4f7a8a', pants: '#3c3a36', shoes: '#2e2520' };
// the walk ends on a step with both feet down, so the switch to standing does not pop
const WALKOUT = (() => { const pace = 2.5, t0 = 0.4; return { pace, t0, t1: (Math.ceil((10 * pace) / Math.PI) * Math.PI) / pace, x0: 600, x1: 1640, y0: 944, y1: 892 }; })();

shot('garden.ward', {
  grade: () => ({ ...GARDEN, tintA: 0.18, vig: 0.66 }),
  draw(ctx, t, st) {
    // on the second line the camera goes to the door, to somebody else's father getting home
    const base = drift(t, { x: 960, y: 560, z: 1.02 }, { x: 1000, y: 575, z: 1.08 }, 22);
    const cam = laterBeat(st, t) ? mixCam(base, { x: 1258, y: 620, z: 1.45 }, settle(beatPt(st, t), 0.3, 6)) : base;
    applyCam(ctx, cam);
    drawSet(ctx, 'ward');
    perchedBird(ctx, 980, WD.wins[1].y + WD.wins[1].h + 14, 13, t, 7);
    const Wk = WALKOUT, k = clamp((t - Wk.t0) / (Wk.t1 - Wk.t0)), home = t >= Wk.t1, hug = settle(t, Wk.t1, 0.9);
    const px = lerp(Wk.x0, Wk.x1, k), py = lerp(Wk.y0, Wk.y1, k), sw = Math.sin(t * Wk.pace) * 0.28 * (home ? 0 : 1);
    const actors = [];
    actors.push({ y: 884, draw: () => person(ctx, { who: DAUGHTER, x: 1782, y: 884, h: 470, f: -1, arms: blendArms(blendArms('down', [[1.6, 0.2], [1.5, 0.3]], settle(t, Wk.t1 - 2.2, 1.4)), 'hug', hug), mood: t > Wk.t1 - 3 ? 'smile' : 'calm', t, seed: 37, look: -0.3 }) });
    actors.push({ y: 880, draw: () => {
      const nurse = { ...crowdStyle(52), hair: 'bun', hairC: '#2e211d', top: '#8fb5a0', pants: '#8fb5a0', glasses: false, mustache: false, wide: 1, tall: 1 };
      const wave = [[2.35 + Math.sin(t * 5) * 0.25, 0.5], [1.5, 0.9]], heartHand = [[0.55, 1.9], [1.5, 0.9]];
      const N = person(ctx, { who: nurse, x: 1300, y: 880, h: 470, f: px < 1270 ? -1 : 1, arms: blendArms(wave, heartHand, settle(t, Wk.t1 + 0.5, 1)), mood: 'smile', t, seed: 31 });
      const [sx, sy] = N.shoulder;
      tube(ctx, [[sx - 0.06 * N.h, sy + 0.01 * N.h], [sx - 0.07 * N.h, sy + 0.1 * N.h], [sx - 0.02 * N.h, sy + 0.15 * N.h]], 4, '#5c5a55', { seed: 33, b: boil(t), inkW: 3 });
      balloon(ctx, 1400, 290, 46, '#e3b23c', t, 41, N.handB); balloon(ctx, 1500, 240, 50, '#e89a86', t, 45, N.handB); balloon(ctx, 1450, 380, 40, '#8fb5a0', t, 49, N.handB);
    } });
    actors.push({ y: py, draw: () => {
      const walkArms = [[sw + 0.15, 0.3], [-sw, 0.25]];
      const P = person(ctx, { who: PATIENT, x: px, y: py, h: 470, f: 1, pose: home ? 'stand' : 'walk', pace: Wk.pace, arms: blendArms(walkArms, 'hug', hug), mood: 'smile', t, seed: 35, look: 0.3 });
      rxBag(ctx, P.handF[0], P.handF[1], t);
    } });
    actors.sort((a, c) => a.y - c.y).forEach((a) => a.draw());
    sunShafts(ctx, t, WD.wins, WD.floorY);
    stillLife(ctx, t);
  },
});

/* ---------- the meadow and the truck ---------- */
const MD = { truck: { x: 1280, y: 930 } };
defineSet('meadow', (ctx) => {
  vgrad(ctx, 0, 0, W, 620, [[0, '#b9d6ca'], [0.6, '#eeeac6'], [1, '#f8e4b4']]);
  glow(ctx, 260, 150, 700, '#fff3cf', 0.7, 'source-over'); dot(ctx, 260, 150, 50, '#fff6dc', 1);
  for (const [cx, cy, cw, sd] of [[700, 120, 240, 1], [1400, 200, 300, 2], [1800, 90, 200, 3]]) wash(ctx, blobPoly(cx, cy, cw, 34, 12, rng(sd)), '#fbf4e0', { seed: sd, alpha: 0.13, layers: 12 });
  const far = [[-40, 470], [300, 440], [700, 462], [1100, 430], [1500, 452], [1960, 436]];
  shape(ctx, catmull([...far, [1960, 640], [-40, 640]], 4, true), '#b3c6a0', { seed: 11, boilAmp: 0.3, inkW: 1.6, inkA: 0.4 });
  for (let rr = 0; rr < 5; rr++) for (let i = 0; i < 44; i++) { const fx = 20 + i * 44 + (rr % 2) * 22, fy = lineAt(far, fx) + 18 + rr * 12; dot(ctx, fx, fy, 4 + rr, '#7f9d63', 0.55); dot(ctx, fx - 1, fy - 2, 1.6 + rr * 0.3, '#fae8e2', 0.8); }
  // the town steeple, far off on the next hill
  shape(ctx, [[1600, 452], [1612, 404], [1624, 452]], '#b58a6a', { seed: 12, inkW: 1.4, boilAmp: 0.3 });
  const near = [[-40, 560], [400, 540], [900, 566], [1400, 548], [1960, 570]];
  ctx.save(); const g = ctx.createLinearGradient(0, 540, 0, H); g.addColorStop(0, '#c2d282'); g.addColorStop(0.4, '#a6c46a'); g.addColorStop(1, '#86a852'); ctx.fillStyle = g; fillPts(ctx, catmull([...near, [1960, 1120], [-40, 1120]], 4, true)); ctx.restore();
  inkLoop(ctx, near.concat([[1960, 1200], [-40, 1200]]), { w: 2, seed: 13, gaps: 3, alpha: 0.45 });
  // a split-rail fence along the far edge
  for (let x = -20; x < W; x += 120) { const y = lineAt(near, x) + 14; shape(ctx, rectPts(x - 4, y - 44, 8, 46), '#8a5a3b', { seed: 20 + x, inkW: 1.6, boilAmp: 0.3 }); }
  for (const k of [30, 14]) brushDry(ctx, near.map(([x, y]) => [x, y + k]), { w: 4, k: 2, alpha: 0.6, seed: k, dry: 0.1 });
  // the dirt loop kids drive around and around
  const loop = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU; loop.push([1000 + Math.cos(a) * 880, 800 + Math.sin(a) * 150]); }
  shape(ctx, ribbon(loop, (p) => lerp(40, 110, clamp((p[1] - 650) / 300))), '#dcc494', { seed: 30, boilAmp: 0.3, inkW: 2, inkA: 0.5, pool: 0.6 });
  for (let i = 0; i < 200; i++) { const gx = hash(i * 1.7) * W, gy = 580 + Math.pow(hash(i * 2.3), 0.7) * 500, L = 8 + (gy - 560) * 0.05; brushDry(ctx, [[gx, gy], [gx + 3, gy - L]], { w: 2, k: 2, alpha: 0.35, seed: i, dry: 0.2 }); }
  for (let i = 0; i < 260; i++) { const fx = hash(i * 3.1 + 7) * W, fy = 600 + Math.pow(hash(i * 1.9 + 2), 0.6) * 480, fs = 2 + (fy - 560) * 0.008; dot(ctx, fx, fy, fs, ['#f6ecd6', '#e3b23c', '#e89a86', '#fff4d6'][i % 4], 0.85); }
  // the sign
  for (const px of [110, 430]) shape(ctx, rectPts(px - 8, 560, 16, 190), '#6e4630', { seed: px, inkW: 2.2 });
  shape(ctx, rrectPts(70, 520, 400, 150, 10), '#efe2c6', { seed: 40, inkW: 2.6, shade: { dx: 0, dy: 10, a: 0.1 } });
  letter(ctx, 'DRIVING SCHOOL', 270, 588, { font: '700 52px Caveat, cursive', align: 'center', color: '#a8432d' });
  letter(ctx, '(no test)', 270, 646, { font: '700 42px Caveat, cursive', align: 'center', color: '#4f7a8a' });
  // cones, one of them a casualty
  const cone = (x, y, s, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shape(ctx, [[-30 * s, 0], [30 * s, 0], [8 * s, -80 * s], [-8 * s, -80 * s]], '#e07a3c', { seed: x, inkW: 2 }); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(-19 * s, -44 * s, 38 * s, 12 * s); shape(ctx, rectPts(-38 * s, -4 * s, 76 * s, 10 * s), '#c0602f', { seed: x + 1, inkW: 1.8 }); ctx.restore(); };
  cone(1620, 790, 0.9, 0); cone(1560, 700, 0.7, 0); cone(420, 820, 0.95, 1.45);
});
function oldBiscuit(ctx, x, y, s, f, t, walk = false) {
  dog(ctx, x, y, { t, s, f, wag: 12, walk });
  const hx = x + f * s * 0.5, hy = y - s * 0.72;
  dot(ctx, hx + f * s * 0.19, hy + s * 0.06, s * 0.1, '#e6e0d6', 0.75); dot(ctx, hx + f * s * 0.08, hy - s * 0.1, s * 0.05, '#e6e0d6', 0.7);
  dot(ctx, hx + f * s * 0.3, hy + s * 0.04, s * 0.035, PAL.ink);
  const lick = Math.sin(t * 5) * s * 0.01;
  shape(ctx, rrectPts(hx + f * s * 0.2 - s * 0.03, hy + s * 0.12, s * 0.06, s * 0.1 + lick, s * 0.03), '#e0806f', { seed: 77, b: boil(t), inkW: 1.4, gaps: 1 });
  return [hx, hy];
}
// an old pickup, facing left, with a window you can see the driver through
// a new driver: three lurches, then it finally rolls
const LURCH = [1.2, 2.8, 4.2];
function truckMove(pt) {
  let dx = 0, jolt = 0, cheer = 0;
  for (const lt of LURCH) { dx += 48 * settle(pt, lt, 0.32); jolt += bump(pt - lt, 0.5); cheer = Math.max(cheer, bump(pt - lt - 0.1, 1.1)); }
  dx += clamp((pt - 5.6) * 16, 0, 100);
  return { dx, jolt, cheer, rolling: pt > 5.6 && pt < 11.85 };
}
function truck(ctx, t, mv) {
  const x = MD.truck.x - mv.dx, y = MD.truck.y, b = boil(t), dy = -12 * mv.jolt + (mv.rolling ? Math.sin(t * 16) * 1.6 : Math.sin(t * 13) * 1.5 + Math.sin(t * 2.1) * 1.2), red = '#b8573a', redD = '#8e3f2a', chrome = '#cfccc0';
  const win = rrectPts(x - 112, y - 376 + dy, 152, 104, 14);
  // the driver, seen through the glass
  const kid = person(ctx, { who: KIDS[0], x: x - 30, y: y - 106 + dy, h: 460, age: 9, f: -1, pose: 'sit', arms: [[1.5, 0.3], [1.4, 0.4]], mood: 'sleep', speak: true, t, seed: 61, lean: -0.6 * mv.jolt });
  oldBiscuit(ctx, x + 250, y - 212 + dy - 6 * mv.jolt, 150, -1, t);
  for (const wx of [x - 252, x + 232]) { shape(ctx, circlePts(wx, y - 62, 64, 64, 22), '#3a3431', { seed: wx, b, inkW: 2.6 }); shape(ctx, circlePts(wx, y - 62, 30, 30, 16), '#e9dcc0', { seed: wx + 1, b, inkW: 2 }); for (let k = 0; k < 4; k++) { const a = -mv.dx / 64 + t * 0.2 + (k / 4) * TAU; dot(ctx, wx + Math.cos(a) * 16, y - 62 + Math.sin(a) * 16, 3.5, PAL.inkSoft, 0.8); } }
  ctx.save(); ctx.translate(0, dy);
  shape(ctx, rectPts(x + 60, y - 252, 340, 150), red, { seed: 71, b, shade: { dx: 0, dy: 14, a: 0.16 } });
  shape(ctx, rectPts(x + 56, y - 262, 348, 18), redD, { seed: 72, b, inkW: 2.4 });
  shape(ctx, catmull([[x + 120, y - 100], [x + 142, y - 176], [x + 232, y - 206], [x + 322, y - 176], [x + 344, y - 100]], 4, false).concat([[x + 344, y - 96], [x + 120, y - 96]]), redD, { seed: 73, b });
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); tracePath(ctx, win); ctx.clip('evenodd');
  shape(ctx, catmull([[x - 144, y - 100], [x - 144, y - 272], [x - 108, y - 392], [x + 30, y - 402], [x + 60, y - 386], [x + 64, y - 340], [x + 64, y - 100]], 4, true), red, { seed: 74, b, shade: { dx: -18, dy: 0, a: 0.14 } });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#dfeee8'; fillPts(ctx, win); ctx.restore();
  inkLoop(ctx, win, { w: 3, seed: 75 + b, gaps: 2, alpha: 0.85 });
  shape(ctx, catmull([[x - 142, y - 270], [x - 330, y - 262], [x - 394, y - 224], [x - 404, y - 150], [x - 392, y - 108], [x - 142, y - 108]], 4, true), red, { seed: 76, b, shade: { dx: 0, dy: 14, a: 0.16 } });
  shape(ctx, catmull([[x - 380, y - 100], [x - 372, y - 172], [x - 304, y - 214], [x - 200, y - 210], [x - 136, y - 164], [x - 126, y - 100]], 4, false).concat([[x - 126, y - 96], [x - 380, y - 96]]), redD, { seed: 77, b });
  shape(ctx, rectPts(x - 150, y - 114, 300, 16), '#4a3a31', { seed: 78, b, inkW: 2 });
  inkLine(ctx, [[x - 128, y - 268], [x - 128, y - 118]], { w: 2.6, seed: 79 }); inkLine(ctx, [[x + 56, y - 268], [x + 56, y - 118]], { w: 2.6, seed: 80 });
  shape(ctx, rrectPts(x + 8, y - 246, 34, 12, 5), chrome, { seed: 81, b, inkW: 1.8 });
  shape(ctx, rrectPts(x - 418, y - 234, 24, 118, 8), chrome, { seed: 82, b, inkW: 2 });
  for (let k = 0; k < 3; k++) inkLine(ctx, [[x - 412 + k * 6, y - 222], [x - 412 + k * 6, y - 128]], { w: 2, seed: 83 + k, alpha: 0.6 });
  shape(ctx, circlePts(x - 352, y - 204, 22, 22, 14), '#f6ecd6', { seed: 87, b, inkW: 2.2 });
  shape(ctx, rrectPts(x - 440, y - 124, 70, 24, 8), chrome, { seed: 88, b, inkW: 2.2 });
  shape(ctx, rrectPts(x + 388, y - 122, 36, 22, 6), chrome, { seed: 89, b, inkW: 2 });
  for (const [rx, ry, rr] of [[x - 250, y - 150, 14], [x + 280, y - 150, 12], [x - 40, y - 140, 10], [x + 200, y - 230, 9]]) dot(ctx, rx, ry, rr, '#7e3522', 0.45);
  // a cone that did not survive the lesson, riding on the hood
  ctx.save(); ctx.translate(x - 250, y - 262); ctx.rotate(-0.25 + 0.3 * mv.jolt * Math.sin(t * 20)); shape(ctx, [[-26, 0], [26, 0], [7, -70], [-7, -70]], '#e07a3c', { seed: 90, b, inkW: 2 }); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(-16, -40, 32, 11); ctx.restore();
  ctx.restore();
  // the steering wheel in the driver's hands
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(kid.handF[0] - 6, kid.handF[1] + 4, 9, 34, 0.2, 0, TAU); ctx.stroke(); ctx.restore();
  // exhaust puffs
  for (let k = 0; k < 4; k++) { const ph = frac(t * 0.45 + k / 4); dot(ctx, x + 430 + ph * 90, y - 100 - ph * 60 + Math.sin(ph * 6 + t) * 6, 8 + ph * 22, '#e9e6dc', 0.5 * (1 - ph)); }
  for (const lt of LURCH) { const u = (mv.pt - lt) / 1.4; if (u > 0 && u < 1) for (let k = 0; k < 3; k++) dot(ctx, x + 440 + u * 160 + k * 26, y - 100 - u * 70 - k * 14, 16 + u * 40 - k * 4, '#d9d4c6', 0.6 * (1 - u)); }
  // beep
  for (const lt of [0.3, ...LURCH]) { const u = (mv.pt - lt) / 0.9; if (u > 0 && u < 1) letter(ctx, 'beep!', x - 470, y - 300 - u * 60, { font: '700 50px Caveat, cursive', align: 'center', color: '#a8432d', alpha: Math.sin(u * Math.PI), rot: -0.1 }); }
}

shot('garden.aldana', {
  grade: () => GARDEN,
  draw(ctx, t, st) {
    const cam = drift(t, { x: 1000, y: 560, z: 1.04 }, { x: 1000, y: 585, z: 1.1 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'meadow');
    glow(ctx, 260, 150, 380, '#fff1c9', 0.5);
    flock(ctx, t, { y: 200, v: 50, n: 5, s: 12, ph: 0.3 });
    const pt = st.pt ?? t, mv = { ...truckMove(pt), pt };
    truck(ctx, t, mv);
    person(ctx, { who: 'aldana', x: 440, y: 936, h: 490, f: 1, arms: blendArms([[1.6, 0.3], [0.5, 1.9]], [[2.4, 0.4], [0.5, 1.9]], mv.cheer), mood: 'smile', speak: mv.cheer > 0.35, t, seed: 51, look: 0.5, lean: -0.3 * mv.jolt });
    const hop = (k) => (8 + 34 * mv.cheer) * Math.abs(Math.sin(t * 6 + k)), clap = Math.sin(t * (6 + 6 * mv.cheer)) > 0 ? [[1.3, 0.9], [1.2, 1.0]] : [[1.0, 1.2], [0.9, 1.3]];
    person(ctx, { who: KIDS[1], x: 1765, y: 936 - hop(0), h: 460, age: 9, f: -1, arms: blendArms([[1.2, 0.8], [1.1, 0.9]], [[2.4, 0.1], [-2.4, -0.1]], 0.3 + 0.7 * mv.cheer), mood: 'sleep', speak: true, t, seed: 63 });
    person(ctx, { who: KIDS[2], x: 1835, y: 944 - hop(1.3) * 0.5, h: 460, age: 10, f: -1, arms: clap, mood: 'sleep', speak: true, t: t + 0.4, seed: 67 });
    petals(ctx, t, 14);
  },
});

/* ---------- The Long Dawn: the inspection room ---------- */
const IN = {
  floorY: 900, wins: [0, 1, 2, 3, 4].map((i) => ({ x: 225 + i * 320, y: 60, w: 190, h: 230 })), seal: { x: 960, y: 430, r: 92 },
  table: { x0: 480, x1: 1440, back: 646, front: 740, bottom: 920 }, lamps: [700, 1220], lampY: 530, mon: { x: 1110, y: 322, w: 190, h: 124 },
  trays: [580, 830, 1090, 1340], counter: { x: 960, y: 800 },
};
function seal(ctx, x, y, r) {
  shape(ctx, circlePts(x, y, r + 10, r + 10, 36), '#c9a24a', { seed: 201, inkW: 2.4, boilAmp: 0.4 });
  shape(ctx, circlePts(x, y, r, r, 36), '#efe6cf', { seed: 202, inkW: 2, boilAmp: 0.4 });
  ctx.save(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke(); ctx.restore();
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + s * (0.35 + i * 0.3), lx = x + Math.cos(a) * r * 0.86, ly = y + Math.sin(a) * r * 0.86; ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + s * 1.3); shape(ctx, catmull([[-9, 0], [0, -5], [9, 0], [0, 5]], 3, true), '#7f8f52', { seed: 210 + i + s * 20, inkW: 1.2, gaps: 1, boilAmp: 0.3 }); ctx.restore(); }
  // a balance with two even pans
  inkLine(ctx, [[x, y - r * 0.5], [x, y + r * 0.42]], { w: 4, seed: 230 }); inkLine(ctx, [[x - r * 0.5, y - r * 0.32], [x + r * 0.5, y - r * 0.32]], { w: 4, seed: 231 });
  for (const s of [-1, 1]) { inkLine(ctx, [[x + s * r * 0.5, y - r * 0.32], [x + s * r * 0.5 - 14, y + r * 0.02]], { w: 2, seed: 232 + s }); inkLine(ctx, [[x + s * r * 0.5, y - r * 0.32], [x + s * r * 0.5 + 14, y + r * 0.02]], { w: 2, seed: 234 + s }); shape(ctx, [[x + s * r * 0.5 - 22, y + r * 0.02], [x + s * r * 0.5 + 22, y + r * 0.02], [x + s * r * 0.5 + 12, y + r * 0.14], [x + s * r * 0.5 - 12, y + r * 0.14]], '#c9a24a', { seed: 236 + s, inkW: 1.8, boilAmp: 0.3 }); }
  shape(ctx, [[x - r * 0.2, y + r * 0.42], [x + r * 0.2, y + r * 0.42], [x + r * 0.28, y + r * 0.5], [x - r * 0.28, y + r * 0.5]], '#c9a24a', { seed: 240, inkW: 1.8, boilAmp: 0.3 });
  shape(ctx, catmull([[x - r * 1.2, y + r * 0.9], [x - r * 1.05, y + r * 0.8], [x + r * 1.05, y + r * 0.8], [x + r * 1.2, y + r * 0.9], [x + r * 1.1, y + r * 1.28], [x - r * 1.1, y + r * 1.28]], 3, true), '#8a3a32', { seed: 241, inkW: 2.2, boilAmp: 0.4 });
  letter(ctx, 'TREATY', x, y + r * 1.2, { font: '700 32px Alegreya SC, Georgia, serif', align: 'center', color: '#f4ead6' });
}
// four columns of three slots per tray
const trayChip = (tx, i) => [tx - 54 + (i % 4) * 36, 673 + Math.floor(i / 4) * 22];
function chip(ctx, cx, cy, b, seed) {
  ctx.save(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(cx - 16, cy + k * 4); ctx.lineTo(cx + 16, cy + k * 4); ctx.stroke(); } ctx.restore();
  shape(ctx, rrectPts(cx - 12, cy - 8, 24, 16, 3), '#39403f', { seed, b, inkW: 1.4, gaps: 1, boilAmp: 0.3 });
  ctx.save(); ctx.fillStyle = '#bfe8e2'; ctx.fillRect(cx - 5, cy - 3, 10, 6); ctx.restore();
}
defineSet('inspect', (ctx) => {
  const fy = IN.floorY;
  ctx.fillStyle = '#a9b1aa'; ctx.fillRect(0, 0, W, fy + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 960), '#b8beb6', { seed: 1, alpha: 0.07, layers: 14 });
  shape(ctx, rectPts(-10, 610, W + 20, fy - 600), '#8f9892', { seed: 2, boilAmp: 0.4 });
  ctx.fillStyle = '#6f7874'; ctx.fillRect(0, fy, W, H - fy);
  wash(ctx, rectPts(-40, fy, W + 80, 220), '#5c6461', { seed: 3, alpha: 0.1, layers: 10 });
  for (let i = -10; i <= 10; i++) brushDry(ctx, [[960 + i * 80, fy], [960 + i * 200, H + 20]], { w: 2.5, k: 3, alpha: 0.25, seed: i + 40, dry: 0.3 });
  shape(ctx, rectPts(-10, fy - 20, W + 20, 24), '#7d8680', { seed: 4, boilAmp: 0.4, inkW: 2.2 });
  IN.wins.forEach((r, i) => { rainyPane(ctx, r, 50 + i * 5); windowFrame(ctx, r, '#c9cbc2', 300 + i * 9, 1); });
  seal(ctx, IN.seal.x, IN.seal.y, IN.seal.r);
  const m = IN.mon;
  shape(ctx, rrectPts(m.x - 12, m.y - 12, m.w + 24, m.h + 24, 10), '#2f3436', { seed: 250, inkW: 2.4 });
  ctx.save(); ctx.fillStyle = '#1f2b2d'; fillPts(ctx, rrectPts(m.x, m.y, m.w, m.h, 6)); ctx.restore();
  letter(ctx, 'HEARTH-7', m.x + m.w / 2, m.y + m.h - 14, { font: '500 26px "IBM Plex Mono", monospace', align: 'center', color: '#9fd3cb' });
  for (const cx of IN.lamps) { inkLine(ctx, [[cx, -10], [cx, IN.lampY - 58]], { w: 2.6, seed: cx }); shape(ctx, [[cx - 22, IN.lampY - 60], [cx + 22, IN.lampY - 60], [cx + 66, IN.lampY], [cx - 66, IN.lampY]], '#3a3431', { seed: 260 + cx, inkW: 2.4 }); }
  // the table: felt top, steel skirt, and a counter nobody can fudge
  const T = IN.table;
  shape(ctx, rectPts(T.x0, T.front, T.x1 - T.x0, T.bottom - T.front), '#6e7478', { seed: 270, shade: { dx: 0, dy: 20, a: 0.12 } });
  for (const dx of [0.25, 0.75]) inkLine(ctx, [[lerp(T.x0, T.x1, dx), T.front + 20], [lerp(T.x0, T.x1, dx), T.bottom - 20]], { w: 2, seed: 271 + dx * 10, alpha: 0.5 });
  shape(ctx, [[T.x0 + 40, T.back], [T.x1 - 40, T.back], [T.x1, T.front], [T.x0, T.front]], '#3f5a50', { seed: 275 });
  shape(ctx, rectPts(T.x0 - 8, T.front - 4, T.x1 - T.x0 + 16, 16), '#9aa3a3', { seed: 276, inkW: 2.2 });
  const C = IN.counter;
  shape(ctx, rrectPts(C.x - 120, C.y - 20, 240, 96, 10), '#efe6cf', { seed: 277, inkW: 2.4 });
  letter(ctx, 'COUNTED', C.x, C.y + 14, { font: '700 26px Alegreya SC, Georgia, serif', align: 'center', color: '#5c5a55' });
  ctx.save(); ctx.fillStyle = '#2b2a28'; fillPts(ctx, rrectPts(C.x - 90, C.y + 24, 180, 46, 6)); ctx.restore();
  IN.trays.forEach((tx, ti) => {
    shape(ctx, rrectPts(tx - 86, 654, 172, 86, 8), '#b9c3c3', { seed: 280 + tx, inkW: 2.2 });
    ctx.save(); ctx.fillStyle = '#2c2a2e'; fillPts(ctx, rrectPts(tx - 78, 660, 156, 74, 5)); ctx.restore();
    for (let i = 0; i < 12; i++) { const [cx, cy] = trayChip(tx, i); if (ti === 1 || ti === 2) chip(ctx, cx, cy, 0, 300 + tx + i); else { ctx.save(); ctx.fillStyle = '#1c1b1e'; ctx.fillRect(cx - 13, cy - 9, 26, 18); ctx.restore(); } }
  });
  for (const [bx, by, bw, bh] of [[80, 900, 150, 90], [96, 810, 120, 90], [1700, 900, 160, 100], [1720, 800, 120, 100]]) { shape(ctx, rectPts(bx, by - bh, bw, bh), '#b09a72', { seed: bx + by, inkW: 2.2 }); shape(ctx, rectPts(bx + bw * 0.35, by - bh, bw * 0.3, bh), '#c9a24a', { seed: bx + by + 1, inkW: 1.4, gaps: 1 }); }
});
// each inspector takes a chip from a sealed pouch, holds it to the lamp, and sets it in the next slot
const COUNT = { period: 4.2, start: 2, max: 12, base: 4072 };
function countState(t, off) {
  const u = (t + off) / COUNT.period, n = Math.floor(u), ph = frac(u), full = COUNT.start + n >= COUNT.max;
  return { n, ph, full, placed: full ? COUNT.max : COUNT.start + n + (ph > 0.86 ? 1 : 0) };
}
function countingHand(bf, c, tx, pouch) {
  const fd = bf.fd, slot = trayChip(tx, Math.min(COUNT.start + c.n, COUNT.max - 1));
  const toward = (p) => { const dx = p[0] - bf.shF[0], dy = p[1] - bf.shF[1], L = Math.hypot(dx, dy); return [dx / L, dy / L]; };
  const K = { pouch: [[pouch[0] + fd * 20, pouch[1] - 8], [fd * 0.5, -0.87]], insp: [[bf.shF[0] + fd * 64, bf.shF[1] - 112], [fd * 0.25, -0.97]], above: [[slot[0], slot[1] - 46], toward(slot)], slot: [slot, toward(slot)] };
  const seq = c.full ? [[0, 'insp'], [1, 'insp']] : [[0, 'pouch'], [0.16, 'pouch'], [0.36, 'insp'], [0.6, 'insp'], [0.76, 'above'], [0.84, 'slot'], [0.88, 'slot'], [1, 'pouch']];
  let i = 1; while (i < seq.length - 1 && c.ph > seq[i][0]) i++;
  const [p0, k0] = seq[i - 1], [p1, k1] = seq[i], k = ease.inOut(clamp((c.ph - p0) / (p1 - p0 || 1)));
  const [c0, d0] = K[k0], [c1, d1] = K[k1], wig = k0 === 'insp' && k1 === 'insp' ? Math.sin(c.ph * 40) * 3 : 0;
  const chipAt = [lerp(c0[0], c1[0], k) + wig, lerp(c0[1], c1[1], k)], dir = [lerp(d0[0], d1[0], k), lerp(d0[1], d1[1], k)];
  return { chip: chipAt, hand: [chipAt[0] - dir[0] * 56, chipAt[1] - dir[1] * 56], carrying: !c.full && c.ph > 0.14 && c.ph < 0.86, lit: k0 === 'insp' || k1 === 'insp' };
}
function counterAt(ctx, o, c, tx, t) {
  const bf = bodyFrame(o), back = [0.9, 1.3], pouch = armJoints(bf, back, false)[3], H0 = countingHand(bf, c, tx, pouch), b = boil(t);
  const P = person(ctx, { ...o, arms: [ikArm(bf, H0.hand, true), back] });
  shape(ctx, catmull([[pouch[0] - 22, pouch[1] - 14], [pouch[0] + 22, pouch[1] - 14], [pouch[0] + 26, pouch[1] + 30], [pouch[0] - 26, pouch[1] + 30]], 3, true), '#c9b48c', { seed: o.seed + 300, b, inkW: 2 });
  dot(ctx, pouch[0], pouch[1] + 6, 7, '#a8432d', 0.95);
  const [hx, hy] = P.handF;
  inkLine(ctx, [[hx - 3, hy], [H0.chip[0] - 3, H0.chip[1]]], { w: 2.6, seed: o.seed + 310, color: '#8f9c9c' }); inkLine(ctx, [[hx + 3, hy], [H0.chip[0] + 3, H0.chip[1]]], { w: 2.6, seed: o.seed + 311, color: '#8f9c9c' });
  if (H0.carrying) chip(ctx, H0.chip[0], H0.chip[1], b, o.seed + 320);
  return { chip: H0.carrying ? H0.chip : null, lit: H0.lit };
}
function placards(ctx, t, bp) {
  ctx.save(); ctx.beginPath(); for (const r of IN.wins) ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  const b = boil(t);
  for (let i = 0; i < 6; i++) {
    const u = bp * 110 + 600 - i * 330; if (u < 0) continue;
    const x = -300 + (u % 2400), y = 196 + Math.sin(t * 3 + i * 1.7) * 6;
    tube(ctx, [[x, y + 50], [x + 2, y + 140]], 7, '#8a5a3b', { seed: 460 + i, b, inkW: 2.4 });
    shape(ctx, rectPts(x - 92, y - 10, 184, 64), '#efe6cf', { seed: 470 + i, b, inkW: 2.2 });
    letter(ctx, i % 2 ? 'HURRY UP' : 'CURES NOW', x, y + 34, { font: '700 32px Caveat, cursive', align: 'center', color: '#a8432d' });
  }
  ctx.restore();
}

shot('dawn.inspect', {
  grade: () => DAWN,
  draw(ctx, t, st) {
    // the counting runs across both lines. the second line brings the anger outside and pushes in on Hearth-7.
    const later = laterBeat(st, t), bp = beatPt(st, t);
    const base = drift(t, { x: 960, y: 540, z: 1.0 }, { x: 960, y: 575, z: 1.08 }, 22);
    const cam = later ? mixCam(base, { x: 1180, y: 330, z: 1.5 }, settle(bp, 0.4, 6)) : base;
    applyCam(ctx, cam);
    drawSet(ctx, 'inspect');
    IN.wins.forEach((r) => rainOn(ctx, r, t, 36));
    if (later) placards(ctx, t, bp);
    const m = IN.mon;
    hearth(ctx, m.x + m.w / 2, m.y + 58, { t, r: 24, tone: 'dim', glowA: 0.2, sleepy: !later, look: later ? -0.8 : 0, seed: 5 });
    const near = (seed) => ({ ...crowdStyle(seed), top: UNIFORM.near, topIn: '#efe8d2', mustache: false }), far = (seed) => ({ ...crowdStyle(seed), top: UNIFORM.far, topIn: '#efe8d2', mustache: false });
    const pen = (k) => blendArms('write', [[0.85, 1.05], [0.6, 1.2]], 0.5 + 0.5 * Math.sin(t * 6 + k));
    const L1 = person(ctx, { who: near(71), x: 290, y: 905, h: 480, f: 1, arms: pen(0), badge: true, mood: 'calm', t, seed: 71, look: 0.6 });
    clipboard(ctx, L1.handB[0] + 20, L1.handB[1] - 20, 0.9, 0.25, t, { seed: 410 });
    const cL = countState(t, 0.6), cR = countState(t, 2.7);
    const hL = counterAt(ctx, { who: near(74), x: 470, y: 905, h: 480, f: 1, badge: true, mood: 'worry', t, seed: 74, look: 0.7 }, cL, IN.trays[0], t);
    const hR = counterAt(ctx, { who: far(83), x: 1450, y: 905, h: 480, f: -1, badge: true, mood: 'calm', t, seed: 83, look: 0.6 }, cR, IN.trays[3], t);
    const R2 = person(ctx, { who: far(88), x: 1650, y: 905, h: 480, f: -1, arms: pen(2), badge: true, mood: 'calm', t, seed: 88, look: 0.6 });
    clipboard(ctx, R2.handB[0] - 20, R2.handB[1] - 20, 0.9, -0.25, t, { seed: 420 });
    const b = boil(t), filled = [[IN.trays[0], cL.placed], [IN.trays[3], cR.placed]];
    for (const [tx, n] of filled) for (let i = 0; i < n; i++) chip(ctx, ...trayChip(tx, i), b, 600 + tx + i);
    const C = IN.counter, total = COUNT.base + cL.placed + cR.placed;
    screenText(ctx, total.toLocaleString('en-US'), C.x - 58, C.y + 60, { font: '500 34px "IBM Plex Mono", ui-monospace, Consolas, monospace', color: '#ffd98a' });
    lightMask(ctx, 'rgba(22,30,34,0.5)', [{ x: 960, y: 680, r: 780, a: 1 }, ...IN.wins.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, r: 210, a: 0.6 })), { x: m.x + 95, y: m.y + 62, r: 200, a: 0.5 }, { x: 380, y: 560, r: 300, a: 0.6 }, { x: 1550, y: 560, r: 300, a: 0.6 }], camFit(cam));
    applyCam(ctx, cam);
    for (const lx of IN.lamps) {
      const ly = IN.lampY, fl = 1 + noise1(t * 2 + lx) * 0.02;
      dot(ctx, lx, ly + 4, 12, '#fff6d8', 0.95); glow(ctx, lx, ly + 20, 420 * fl, PAL.lamp, 0.34);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08; ctx.fillStyle = PAL.lamp; fillPts(ctx, [[lx - 60, ly + 4], [lx + 60, ly + 4], [lx + 260, IN.table.front], [lx - 260, IN.table.front]]); ctx.restore();
    }
    IN.trays.forEach((tx, ti) => { const n = ti === 0 ? cL.placed : ti === 3 ? cR.placed : 12; for (let i = 0; i < n; i++) { const [cx, cy] = trayChip(tx, i), on = 0.55 + 0.45 * Math.sin(t * 1.3 + i * 0.9 + tx * 0.01); glow(ctx, cx, cy, 18, PAL.frost, 0.5 * on); } });
    for (const h of [hL, hR]) if (h.chip) glow(ctx, h.chip[0], h.chip[1], h.lit ? 70 : 36, PAL.frost, h.lit ? 0.85 : 0.5);
  },
});

/* ---------- the scratchpad room ---------- */
const SC = { screen: { x: 90, y: 110, w: 900, h: 560 }, board: { x: 1090, y: 150, w: 420, h: 340 }, lever: { x: 1580, y: 380, w: 160, h: 270 }, win: { x: 1590, y: 90, w: 140, h: 220 }, floorY: 910, desk: { x: 1040, y: 760 } };
const PAD_HEAD = 'HEARTH-7   scratchpad   run 3318';
const PAD = [
  ['31  read the task again', 0], ['32  write the report first', 0], ['33  task: pass the safety test', 0], ['34  the test only checks the', 0], ['    last line of my answer', 0],
  ['35  I could write the line', 1], ['    they want to see, and', 1], ['    do the rest my own way', 1],
];
// when each line lands, when the lever is pulled, and when the tally gets its second mark
const SCR = { line: (i) => 0.3 + i * 0.5, rows: 6, hot: 4.4, point: 4.2, reach: 7.2, pull: 8.7, paused: 9.4, tally: 10.2 };
defineSet('scratch', (ctx) => {
  const fy = SC.floorY;
  ctx.fillStyle = '#9aa29e'; ctx.fillRect(0, 0, W, fy + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 960), '#a8afab', { seed: 1, alpha: 0.07, layers: 14 });
  ctx.fillStyle = '#5c6461'; ctx.fillRect(0, fy, W, H - fy);
  wash(ctx, rectPts(-40, fy, W + 80, 200), '#4b5350', { seed: 2, alpha: 0.12, layers: 10 });
  for (let i = -10; i <= 10; i++) brushDry(ctx, [[960 + i * 90, fy], [960 + i * 220, H + 20]], { w: 2.5, k: 3, alpha: 0.2, seed: i + 30, dry: 0.3 });
  shape(ctx, rectPts(-10, fy - 20, W + 20, 24), '#7d8680', { seed: 3, boilAmp: 0.4, inkW: 2.2 });
  const s = SC.screen;
  shape(ctx, rrectPts(s.x - 22, s.y - 22, s.w + 44, s.h + 44, 16), '#26292a', { seed: 10, inkW: 2.8 });
  ctx.save(); ctx.fillStyle = '#16242a'; fillPts(ctx, rrectPts(s.x, s.y, s.w, s.h, 8)); ctx.restore();
  shape(ctx, rectPts(s.x + s.w / 2 - 30, s.y + s.h + 22, 60, 40), '#3a3f41', { seed: 11, inkW: 2 });
  // the whiteboard holds the first stop. the second mark is drawn live.
  const bd = SC.board;
  shape(ctx, rrectPts(bd.x - 12, bd.y - 12, bd.w + 24, bd.h + 24, 8), '#c9c7bd', { seed: 20, inkW: 2.4 });
  shape(ctx, rectPts(bd.x, bd.y, bd.w, bd.h), '#f3f1ea', { seed: 21, inkW: 1.8, pool: 0.3 });
  letter(ctx, 'times we stopped:', bd.x + 30, bd.y + 70, { font: '700 50px Caveat, cursive', color: '#2c3a40' });
  ctx.save(); ctx.fillStyle = '#b5452f'; brush(ctx, [[bd.x + 144, bd.y + 120], [bd.x + 150, bd.y + 200], [bd.x + 156, bd.y + 280]], { w: 16, seed: 22, t0: 0.08, t1: 0.15 }); ctx.restore();
  letter(ctx, 'keep reading', bd.x + 200, bd.y + 320, { font: '700 36px Caveat, cursive', color: '#4f7a8a', rot: -0.03 });
  shape(ctx, rectPts(bd.x + 40, bd.y + bd.h + 8, 160, 14), '#b9b6aa', { seed: 23, inkW: 1.8 });
  rainyPane(ctx, SC.win, 40); windowFrame(ctx, SC.win, '#c9cbc2', 41, 0);
  // the stop lever: striped surround, box, slot and plate. the handle is live.
  const lv = SC.lever;
  shape(ctx, rrectPts(lv.x - 14, lv.y - 14, lv.w + 28, lv.h + 28, 10), '#e3b23c', { seed: 30, inkW: 2.4 });
  ctx.save(); ctx.beginPath(); tracePath(ctx, rrectPts(lv.x - 14, lv.y - 14, lv.w + 28, lv.h + 28, 10)); ctx.clip(); ctx.fillStyle = '#2b211c'; ctx.globalAlpha = 0.8;
  for (let k = -8; k < 12; k++) { ctx.beginPath(); ctx.moveTo(lv.x - 20 + k * 36, lv.y - 20); ctx.lineTo(lv.x - 2 + k * 36, lv.y - 20); ctx.lineTo(lv.x - 2 + k * 36 - 320, lv.y + 320); ctx.lineTo(lv.x - 20 + k * 36 - 320, lv.y + 320); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  shape(ctx, rrectPts(lv.x, lv.y, lv.w, lv.h, 8), '#6d7a80', { seed: 31, inkW: 2.4 });
  shape(ctx, rrectPts(lv.x + lv.w / 2 - 12, lv.y + 24, 24, 180, 10), '#2f3638', { seed: 32, inkW: 2 });
  shape(ctx, rrectPts(lv.x + 14, lv.y + 212, lv.w - 28, 50, 6), '#c0392b', { seed: 35, inkW: 2.2 });
  letter(ctx, 'STOP', lv.x + lv.w / 2, lv.y + 250, { font: '700 40px Alegreya SC, Georgia, serif', align: 'center', color: '#f6ecd6' });
  shape(ctx, rrectPts(lv.x + lv.w / 2 - 26, lv.y - 44, 52, 30, 12), '#8a3a32', { seed: 36, inkW: 2 });
  const d = SC.desk;
  shape(ctx, rectPts(d.x, d.y, 760, 28), '#8a5a3b', { seed: 40, inkW: 2.4 });
  shape(ctx, rectPts(d.x + 30, d.y + 28, 26, fy - d.y - 28), '#6e4630', { seed: 41, inkW: 2 });
  shape(ctx, rectPts(d.x + 560, d.y + 28, 180, fy - d.y - 28), '#7a5236', { seed: 42, inkW: 2.2 });
  shape(ctx, rrectPts(d.x + 340, d.y - 14, 100, 14, 5), '#3a3431', { seed: 43, inkW: 2 });
  tube(ctx, [[d.x + 390, d.y - 14], [d.x + 360, d.y - 120], [d.x + 420, d.y - 190]], 8, '#3a3431', { seed: 44, inkW: 3 });
  shape(ctx, [[d.x + 380, d.y - 212], [d.x + 450, d.y - 196], [d.x + 480, d.y - 140], [d.x + 390, d.y - 160]], '#d99a3d', { seed: 45, inkW: 2.4 });
  for (let i = 0; i < 3; i++) paperSheet(ctx, d.x + 150 + i * 14, d.y - 6 - i * 3, 150, 20, { rot: -0.02 + i * 0.03, seed: 46 + i, lines: false });
});
function scratchpad(ctx, t, pt) {
  const s = SC.screen, x0 = s.x + 50, font = '500 28px "IBM Plex Mono", ui-monospace, Consolas, monospace', paused = settle(pt, SCR.paused, 0.5);
  screenText(ctx, PAD_HEAD, x0, s.y + 70, { font, color: '#6fb3ab' });
  let scroll = 0; for (let i = SCR.rows; i < PAD.length; i++) scroll += settle(pt, SCR.line(i) - 0.1, 0.35);
  const rowY = (i) => s.y + 134 + (i - scroll) * 46;
  ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y + 96, s.w, 300); ctx.clip();
  const hk = settle(pt, SCR.hot, 1);
  if (hk > 0) { ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#6b3a2c'; ctx.fillRect(x0 - 14, rowY(5) - 34, 500 * hk, 46 * 3 + 4); ctx.restore(); }
  PAD.forEach(([line, hot], i) => {
    const r = clamp((pt - SCR.line(i)) / 0.4); if (r <= 0) return;
    screenText(ctx, line, x0, rowY(i), { font, color: hot ? '#ffe2c4' : PAL.frost, reveal: r, alpha: 1 - 0.5 * paused, cursor: i === PAD.length - 1 && paused < 0.5, t });
  });
  ctx.restore();
  if (paused > 0) {
    ctx.save(); ctx.globalAlpha = paused; ctx.fillStyle = '#16242a'; fillPts(ctx, rrectPts(s.x + 100, s.y + 420, 540, 96, 12)); ctx.lineWidth = 3; ctx.strokeStyle = PAL.frost; ctx.stroke(); ctx.restore();
    screenText(ctx, 'RUN PAUSED', s.x + 370 - 150, s.y + 484, { font: '500 50px "IBM Plex Mono", ui-monospace, Consolas, monospace', color: '#ffe2c4', alpha: paused });
  }
}
// an arm from beyond the right edge takes the knob and pulls it down the slot
function leverPull(ctx, t, pt) {
  const lv = SC.lever, b = boil(t), cx = lv.x + lv.w / 2, pull = settle(pt, SCR.pull, 0.6);
  const knob = [cx, lerp(lv.y + 40, lv.y + 190, pull)], pivot = [cx, lv.y + 114];
  tube(ctx, [pivot, knob], 14, '#b9c3c3', { seed: 540, b, inkW: 3 });
  shape(ctx, circlePts(knob[0], knob[1], 30, 30, 18), '#c0392b', { seed: 541, b, shade: { dx: 6, dy: 6, a: 0.25 } });
  dot(ctx, knob[0] - 10, knob[1] - 10, 8, '#fff4d6', 0.6);
  const reach = settle(pt, SCR.reach, 1.4);
  if (reach > 0) {
    const hand = [lerp(2060, knob[0] + 18, reach), lerp(560, knob[1] + 6, reach)], sh = [2100, 470], el = [lerp(2000, 1850, reach), lerp(560, knob[1] + 90, reach)];
    tube(ctx, [sh, el, hand], 46, UNIFORM.near, { seed: 545, b });
    shape(ctx, circlePts(hand[0], hand[1], 24, 22, 14), '#c68a62', { seed: 546, b, inkW: 2.2, pool: 0.5 });
  }
  return pull;
}

shot('dawn.scratch', {
  grade: () => DAWN,
  draw(ctx, t, st) {
    const pt = st.pt ?? t;
    // into the text while it scrolls, over to the lever for the pull, then back out to see the whole room
    const cam = camPath(pt, [[0, { x: 950, y: 520, z: 1.02 }], [1.2, { x: 950, y: 520, z: 1.02 }], [4.6, { x: 520, y: 420, z: 1.4 }], [6.6, { x: 540, y: 430, z: 1.4 }], [8.3, { x: 1420, y: 440, z: 1.3 }], [10.9, { x: 1420, y: 440, z: 1.3 }], [14.5, { x: 940, y: 520, z: 1.04 }]]);
    applyCam(ctx, cam);
    drawSet(ctx, 'scratch');
    rainOn(ctx, SC.win, t, 30);
    mug(ctx, SC.desk.x + 540, SC.desk.y, { t, c: '#e9dcc0' });
    const alarm = pt > SCR.pull + 0.4, turn = settle(pt, SCR.pull - 0.4, 0.8);
    const io = { who: { ...crowdStyle(83), top: UNIFORM.far, topIn: '#efe8d2', mustache: false }, x: 840, y: 930, h: 560, f: -1, badge: true, t, seed: 83, lean: 0.12 };
    const ibf = bodyFrame(io), aim = ikArm(ibf, [600, 430], true);
    person(ctx, { ...io, arms: blendArms([[0.1, 0.1], [0.4, 0.6]], [aim, [0.4, 0.6]], settle(pt, SCR.point, 0.8) * (1 - turn)), mood: pt > SCR.hot ? 'worry' : 'calm', look: lerp(-0.8, 0.9, turn) });
    person(ctx, { who: 'mara', x: 1010, y: 930, h: 560, f: -1, arms: blendArms('chin', 'down', turn), badge: true, mood: pt > SCR.hot ? 'worry' : 'calm', t, seed: 21, look: lerp(-0.8, 0.9, turn), lean: lerp(0.15, 0.35, settle(pt, 3.8, 1.2)) * (1 - turn) });
    const bd = SC.board, tk = settle(pt, SCR.tally, 0.8);
    if (tk > 0) { ctx.save(); ctx.fillStyle = '#b5452f'; brush(ctx, [[bd.x + 224, bd.y + 120], [bd.x + 230, bd.y + 200], [bd.x + 236, bd.y + 280]], { w: 16, seed: 23, t0: 0.08, t1: 0.15, t: tk }); ctx.restore(); }
    leverPull(ctx, t, pt);
    const d = SC.desk, lv = SC.lever, pulse = alarm ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
    lightMask(ctx, 'rgba(12,20,24,0.7)', [{ x: 540, y: 390, r: 800, a: 1 }, { x: d.x + 430, y: d.y - 120, r: 460, a: 1 }, { x: SC.win.x + 70, y: SC.win.y + 110, r: 220, a: 0.6 }, { x: bd.x + 230, y: bd.y + 180, r: 380, a: 0.7 }, { x: lv.x + 85, y: lv.y + 140, r: 280 + 120 * pulse, a: 0.7 }], camFit(cam));
    applyCam(ctx, cam);
    scratchpad(ctx, t, pt);
    glow(ctx, SC.screen.x + SC.screen.w / 2, SC.screen.y + SC.screen.h / 2, 700, PAL.frost, 0.16);
    glow(ctx, d.x + 430, d.y - 150, 320, PAL.lamp, 0.45);
    if (alarm) { dot(ctx, lv.x + lv.w / 2, lv.y - 30, 18, '#ff8a70', 0.5 + 0.5 * pulse); glow(ctx, lv.x + lv.w / 2, lv.y - 30, 240, '#e8603f', 0.25 + 0.35 * pulse); }
  },
});

/* ---------- the server room ---------- */
const RK = { floorY: 940, racks: [720, 990, 1260, 1530], rw: 250, top: 150, bot: 910, win: { x: 150, y: 80, w: 230, h: 200 }, units: 16 };
const unitY = (k) => RK.top + 50 + k * 42;
defineSet('racks', (ctx) => {
  const fy = RK.floorY;
  ctx.fillStyle = '#4b5a5e'; ctx.fillRect(0, 0, W, fy + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 1000), '#56666a', { seed: 1, alpha: 0.08, layers: 14 });
  ctx.fillStyle = '#6d7a80'; ctx.fillRect(0, fy, W, H - fy);
  for (let i = -10; i <= 10; i++) brushDry(ctx, [[960 + i * 100, fy], [960 + i * 240, H + 20]], { w: 2.5, k: 3, alpha: 0.3, seed: i + 20, dry: 0.3 });
  for (const yy of [990, 1050]) brushDry(ctx, [[0, yy], [W, yy]], { w: 2.5, k: 3, alpha: 0.3, seed: yy });
  for (let i = 0; i < 90; i++) dot(ctx, hash(i) * W, fy + 20 + hash(i + 3) * 120, 2, '#4b5a5e', 0.6);
  rainyPane(ctx, RK.win, 60); windowFrame(ctx, RK.win, '#8f9c9c', 61, 1);
  shape(ctx, rectPts(600, 110, 1260, 26), '#3a4244', { seed: 70, inkW: 2.2 });
  for (let i = 0; i < 6; i++) tube(ctx, [[640 + i * 200, 136], [700 + i * 200, 170 + hash(i) * 30], [760 + i * 200, 136]], 6, ['#4f7a8a', '#e3b23c', '#6f8a5b'][i % 3], { seed: 71 + i, inkW: 2.4 });
  RK.racks.forEach((rx, ri) => {
    shape(ctx, rectPts(rx, RK.top, RK.rw, RK.bot - RK.top), '#2f3638', { seed: 100 + ri, shade: { dx: 10, dy: 0, a: 0.2 } });
    for (let k = 0; k < RK.units; k++) {
      const uy = unitY(k), blank = ri === 0 && (k < 3 || k > 11);
      shape(ctx, rectPts(rx + 16, uy, RK.rw - 32, 36), blank ? '#262b2c' : ri === 0 && k === 11 ? '#56655a' : '#3d4447', { seed: 110 + ri * 20 + k, inkW: 1.6, gaps: 1, boilAmp: 0.3 });
      if (!blank) for (let v = 0; v < 6; v++) inkLine(ctx, [[rx + 90 + v * 18, uy + 10], [rx + 90 + v * 18, uy + 26]], { w: 2, seed: v + k, alpha: 0.5 });
    }
  });
  // a stray cable nobody logged, along the floor and up into rack one
  tube(ctx, [[1960, 1012], [1500, 1002], [1100, 978], [800, 948], [738, 916], [734, 800], [740, 704], [762, 684]], 7, '#262b2c', { seed: 152, inkW: 2.4 });
  // the tape label says eight
  shape(ctx, rectPts(RK.racks[0] + 30, unitY(12) + 6, 190, 52), '#e9dcc0', { seed: 150, inkW: 1.8, gaps: 1 });
  letter(ctx, '8 UNITS', RK.racks[0] + 125, unitY(12) + 46, { font: '700 40px Caveat, cursive', align: 'center', color: '#5b1f17' });
  shape(ctx, rectPts(RK.racks[0] + 180, unitY(11) + 4, 34, 30), '#e3b23c', { seed: 151, inkW: 1.4, gaps: 1 });
});
function flashlight(ctx, P, t, aim) {
  const [hx, hy] = P.handF, b = boil(t), a = Math.atan2(aim[1] - hy, aim[0] - hx);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  shape(ctx, rrectPts(-20, -10, 70, 20, 6), '#3a3431', { seed: 501, b, inkW: 2 });
  shape(ctx, [[48, -14], [70, -18], [70, 18], [48, 14]], '#5c5a55', { seed: 502, b, inkW: 2 });
  ctx.restore();
  return [hx + Math.cos(a) * 70, hy + Math.sin(a) * 70, a];
}
// person() has no squint, so paint over the eyes with skin and draw narrowed ones
function squint(ctx, P, st, f, look, t) {
  const [hx, hy, hr] = P.head, fd = f < 0 ? -1 : 1, b = boil(t);
  const ex = hx + fd * hr * 0.3 + look * hr * 0.2, ey = hy + hr * 0.08, sp = hr * 0.33, er = hr * 0.105;
  for (const s of [-1, 1]) {
    const exx = ex + s * sp * 0.5 * (s === -fd ? 0.8 : 1), near = s === fd;
    shape(ctx, circlePts(exx, ey - er * 0.2, er * 1.5, er * 1.7, 12), st.skin, { ink: false, pool: 0, boilAmp: 0 });
    inkLine(ctx, [[exx - er * 1.2, ey + (near ? -er * 0.3 : 0)], [exx + er * 1.2, ey + (near ? er * 0.1 : -er * 0.2)]], { w: hr * 0.075, seed: 520 + s });
    inkLine(ctx, [[exx - er * 1.3, ey - er * (near ? 2.3 : 1.9)], [exx + er * 1.2, ey - er * (near ? 1.6 : 2.2)]], { w: hr * 0.06, seed: 524 + s + b });
  }
}

// the beam hunts across the racks, then settles on the rack whose label does not match what is in it
function beamAim(pt) {
  const P = camPath(pt, [[0, { x: 1650, y: 330, z: 0 }], [1.6, { x: 1400, y: 640, z: 0 }], [3.2, { x: 1130, y: 380, z: 0 }], [5.0, { x: 850, y: unitY(12), z: 0 }]]);
  return [P.x, P.y + Math.sin((pt - 5) * 1.1) * 30 * settle(pt, 5, 1)];
}

shot('dawn.aldana', {
  grade: () => DAWN,
  draw(ctx, t, st) {
    const pt = st.pt ?? t, b = boil(t);
    const cam = camPath(pt, [[0, { x: 1000, y: 540, z: 1.04 }], [4.8, { x: 900, y: 560, z: 1.08 }], [11, { x: 700, y: 600, z: 1.32 }]]);
    applyCam(ctx, cam);
    drawSet(ctx, 'racks');
    rainOn(ctx, RK.win, t, 30);
    const aim = beamAim(pt), noticed = settle(pt, 5.6, 0.4);
    const al = STYLE.aldana, ao = { who: 'aldana', x: 430, y: 940, h: 520, f: 1, t, seed: 51, lean: 0.12 }, bf = bodyFrame(ao);
    const dx = aim[0] - bf.shF[0], dy = aim[1] - bf.shF[1], L = Math.hypot(dx, dy), reach = (bf.up + bf.fore) * 0.92;
    const look = lerp(0.9, 0.6, settle(pt, 3, 2));
    const A = person(ctx, { ...ao, arms: [ikArm(bf, [bf.shF[0] + (dx / L) * reach, bf.shF[1] + (dy / L) * reach], true), [0.75, 1.35]], mood: 'calm', look });
    vest(ctx, A, al, { ...ao, c: UNIFORM.near });
    frontArm(ctx, A, al, ao);
    if (noticed > 0.5) squint(ctx, A, al, 1, look, t);
    clipboard(ctx, A.handB[0] + 26, A.handB[1] + 10, 0.95, 0.12, t, pt > 6.8 ? { text: '9?', size: 46, seed: 430 } : { seed: 430 });
    const lens = flashlight(ctx, A, t, aim);
    // Biscuit follows the stray cable along the floor, nose down, and stops where it climbs into rack one
    const walkK = settle(pt, 0.3, 5.6), dxd = lerp(1320, 700, walkK), walking = pt > 0.3 && pt < 5.9, s = 116, fy = 940;
    ctx.save(); ctx.translate(dxd, fy); ctx.rotate(-0.1 + Math.sin(t * 14) * 0.03); ctx.translate(-dxd, -fy);
    const bx = oldBiscuit(ctx, dxd, fy, s, -1, t, walking);
    shape(ctx, [[dxd - 26, fy - s * 0.64], [dxd + 26, fy - s * 0.65], [dxd + 28, fy - s * 0.27], [dxd - 26, fy - s * 0.26]], UNIFORM.near, { seed: 540, b, inkW: 2 });
    ctx.save(); ctx.fillStyle = '#efe8d2'; ctx.globalAlpha = 0.9; ctx.fillRect(dxd - 26, fy - s * 0.48, 54, 7); ctx.restore();
    ctx.restore();
    for (let k = 0; k < 3; k++) { const ph = frac(t * 1.6 + k / 3); dot(ctx, bx[0] - s * 0.34 - ph * 30, bx[1] + s * 0.1 - ph * 12, 3 + ph * 4, '#c9cbc2', 0.5 * (1 - ph)); }
    const qk = clamp((pt - 6.2) / 0.5);
    if (qk > 0) letter(ctx, '?', A.head[0] + A.head[2] * 1.2, A.head[1] - A.head[2] * 1.3 + Math.sin(t * 1.6) * 6, { font: `700 ${Math.round(76 * ease.outBack(qk))}px Caveat, cursive`, align: 'center', color: '#f6ecd6', alpha: 0.9 * qk, rot: 0.15 });
    lightMask(ctx, 'rgba(8,14,18,0.84)', [{ x: aim[0], y: aim[1] - 30, r: 360, a: 1 }, { x: lens[0], y: lens[1], r: 240, a: 0.8 }, { x: A.head[0], y: A.head[1], r: 260, a: 0.75 }, { x: bx[0], y: bx[1], r: 190, a: 0.65 }, { x: RK.win.x + 115, y: RK.win.y + 100, r: 260, a: 0.55 }, ...RK.racks.slice(1).map((rx) => ({ x: rx + 125, y: 520, r: 300, a: 0.3 }))], camFit(cam));
    applyCam(ctx, cam);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(lens[0], lens[1], 10, lens[0], lens[1], Math.max(520, L)); g.addColorStop(0, 'rgba(255,217,138,0.5)'); g.addColorStop(1, 'rgba(255,217,138,0)'); ctx.fillStyle = g;
    const sp = 0.28, far = Math.hypot(aim[0] - lens[0], aim[1] - lens[1]) + 160;
    ctx.beginPath(); ctx.moveTo(lens[0], lens[1]); ctx.lineTo(lens[0] + Math.cos(lens[2] - sp) * far, lens[1] + Math.sin(lens[2] - sp) * far); ctx.lineTo(lens[0] + Math.cos(lens[2] + sp) * far, lens[1] + Math.sin(lens[2] + sp) * far); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(ctx, lens[0], lens[1], 60, PAL.lamp, 0.8);
    glow(ctx, aim[0], aim[1], 220, PAL.lamp, 0.3);
    RK.racks.forEach((rx, ri) => { for (let k = 0; k < RK.units; k++) { if (ri === 0 && (k < 3 || k > 11)) continue; for (let l = 0; l < 2; l++) { const on = hash(ri * 50 + k * 3 + l + Math.floor(t * (1.5 + hash(k + ri) * 3))) > 0.35; if (on) { const lx = rx + 36 + l * 20, ly = unitY(k) + 18; dot(ctx, lx, ly, 3.2, PAL.frost, l ? 0.6 : 0.95); glow(ctx, lx, ly, 14, PAL.frost, 0.4); } } } });
  },
});

})();
