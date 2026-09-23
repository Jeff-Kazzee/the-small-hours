/* Finite Time engine. Adapted from the Hand Over Hand renderer (2026-09-22). */
'use strict';
const W = 1920, H = 1080;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const frac = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;
const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};
// window: 0 before a, ramps to 1 by a+fin, holds, ramps to 0 from b-fout to b
function win(t, a, b, fin = 0.4, fout = 0.4) {
  if (t < a || t > b) return 0;
  return Math.min(smooth(a, a + fin, t), 1 - smooth(b - fout, b, t));
}

function rng(seed) {
  let a = (seed * 9301 + 49297) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// every asset build draws the same pixels in every render worker
Math.random = rng(20260922);
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function hash2(a, b) { return hash(a * 157.31 + b * 13.77 + 0.123); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function fbm2(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

/* ============================================================
   PAINT: canvases, watercolor washes, ink brush, hands,
   ochre stencils, stone walls, mural glyphs, glow sprites
   ============================================================ */
const PAL = {
  soot: '#120d0a', umber: '#231913', ink: '#15100d', bone: '#ebe0cb', ash: '#8e8479',
  ochre: '#a93f27', ochreL: '#c9623a', ochreD: '#7c2c1c', ember: '#f2a444', hot: '#ffe7b0',
  teal: '#3d6b66', sage: '#6f8a5b', stone: '#3a2c22',
};
const RGB = { ember: '242,164,68', hot: '255,231,176', ochre: '169,63,39', bone: '235,224,203', white: '255,250,238', soot: '18,13,10' };

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/* ---------- geometry helpers ---------- */
function fillPts(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); ctx.fill(); }
function pathPts(ctx, p, close = true) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (close) ctx.closePath(); }
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function orient(p) { return signedArea(p) < 0 ? p.slice().reverse() : p; }
function blobPoly(cx, cy, rx, ry, n, r, jit = 0.25) {
  const pts = []; const rot = r() * TAU;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot, k = 1 + (r() - 0.5) * 2 * jit;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}
function catmull(pts, seg = 6) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function resample(pts, step) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - carry;
    while (d <= L) { const t = d / L; out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]); d += step; }
    carry = L - (d - step);
  }
  if (out.length < 2) out.push(pts[pts.length - 1]);
  return out;
}

/* ---------- watercolor wash (layered deformed polygons) ---------- */
function deformPoly(poly, depth, r) {
  let p = poly;
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push(a);
      const len = Math.hypot(b.x - a.x, b.y - a.y) * a.v * 0.45;
      out.push({ x: (a.x + b.x) / 2 + gauss(r) * len, y: (a.y + b.y) / 2 + gauss(r) * len, v: a.v * (0.75 + r() * 0.45) });
    }
    p = out;
  }
  return p;
}
function wash(ctx, poly, color, o = {}) {
  const r = rng(o.seed || 7);
  const v = o.v ?? 0.7;
  const base = deformPoly(poly.map((q) => ({ x: q[0], y: q[1], v: v * (0.4 + r() * 1.1) })), o.baseDepth ?? 2, r);
  ctx.save(); ctx.fillStyle = color;
  const layers = o.layers ?? 20;
  for (let l = 0; l < layers; l++) {
    const p = deformPoly(base, o.depth ?? 3, r);
    ctx.globalAlpha = (o.alpha ?? 0.05) * (0.7 + r() * 0.6);
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); ctx.fill();
  }
  if (o.edge) { // pigment pooling at the edge
    const p = deformPoly(base, 2, r); ctx.globalAlpha = o.edge; ctx.strokeStyle = color; ctx.lineWidth = o.edgeW || 1.5;
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- ink brush ---------- */
// solid brush body. pts in any coords; o: {w, t (0..1 drawn), seed, t0, t1 (taper fractions), wobble, jit}
function brush(ctx, pts, o = {}) {
  const w = o.w ?? 8, seed = o.seed ?? 0, prog = o.t ?? 1;
  let P = o.smooth === false ? pts : catmull(pts, 5);
  P = resample(P, o.step ?? 3);
  const n = Math.max(2, Math.round(P.length * prog)); if (prog <= 0) return;
  const L = [], R = [], t0 = o.t0 ?? 0.15, t1 = o.t1 ?? 0.3, wob = o.wobble ?? 0.22, jit = o.jit ?? 0;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const s = i / (P.length - 1);
    const taper = Math.min(1, 0.18 + s / t0, 0.12 + (1 - s) / t1);
    const ww = w * 0.5 * taper * (1 + wob * noise1(i * 0.09 + seed * 13.1));
    const jx = jit ? noise1(i * 0.2 + seed * 3.3) * jit : 0, jy = jit ? noise1(i * 0.2 + seed * 5.7 + 40) * jit : 0;
    L.push([P[i][0] - dy * ww + jx, P[i][1] + dx * ww + jy]);
    R.push([P[i][0] + dy * ww + jx, P[i][1] - dx * ww + jy]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fill();
}
// dry bristle brush (for pre-rendered marks). o: {w, k, dry, alpha, seed, t}
function brushDry(ctx, pts, o = {}) {
  const w = o.w ?? 10, K = o.k ?? 9, seed = o.seed ?? 0, dry = o.dry ?? 0.35, prog = o.t ?? 1;
  const P = resample(o.smooth === false ? pts : catmull(pts, 5), 2.2);
  const n = Math.max(2, Math.round(P.length * prog));
  const N = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; N.push([-dy / d, dx / d]);
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const baseA = o.alpha ?? 1;
  for (let k = 0; k < K; k++) {
    const off = K === 1 ? 0 : k / (K - 1) - 0.5;
    ctx.lineWidth = Math.max(0.6, (w / K) * 1.9 * (0.7 + 0.6 * hash(k * 3.1 + seed)));
    ctx.globalAlpha = baseA * (0.45 + 0.55 * hash(k + seed * 1.7));
    ctx.beginPath(); let pen = false;
    for (let i = 0; i < n; i++) {
      const s = i / (P.length - 1);
      const taper = Math.min(1, 0.25 + s / 0.12, 0.2 + (1 - s) / 0.25);
      const ww = w * taper * (1 + 0.15 * noise1(i * 0.05 + seed));
      const th = -1 + 2 * dry * (0.25 + 0.75 * s) * (0.6 + Math.abs(off) * 0.9);
      const vis = noise1(i * 0.07 * (1 + k * 0.13) + k * 31.7 + seed * 5.1) > th;
      const x = P[i][0] + N[i][0] * off * ww, y = P[i][1] + N[i][1] * off * ww;
      if (vis) { if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y); } else pen = false;
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- hands ---------- */
const FINGERS = [
  { n: 'index', bx: 0.135, by: -0.2, a: 0.17, len: 0.36, w: 0.088 },
  { n: 'middle', bx: 0.035, by: -0.235, a: 0.035, len: 0.405, w: 0.092 },
  { n: 'ring', bx: -0.07, by: -0.22, a: -0.1, len: 0.372, w: 0.086 },
  { n: 'pinky', bx: -0.158, by: -0.172, a: -0.26, len: 0.292, w: 0.076 },
  { n: 'thumb', bx: 0.165, by: 0.05, a: 0.98, len: 0.32, w: 0.108 },
];
function capsule(bx, by, ang, len, wb, wt, segs = 9) {
  const dx = Math.sin(ang), dy = -Math.cos(ang), nx = Math.cos(ang), ny = Math.sin(ang);
  const tx = bx + dx * (len - wt / 2), ty = by + dy * (len - wt / 2);
  const pts = [[bx + nx * wb / 2, by + ny * wb / 2], [tx + nx * wt / 2, ty + ny * wt / 2]];
  const a0 = Math.atan2(ny, nx);
  for (let i = 1; i < segs; i++) { const a = a0 - (Math.PI * i) / segs; pts.push([tx + Math.cos(a) * wt / 2, ty + Math.sin(a) * wt / 2]); }
  pts.push([tx - nx * wt / 2, ty - ny * wt / 2]); pts.push([bx - nx * wb / 2, by - ny * wb / 2]);
  // extend base into palm so union has no seam
  pts.push([bx - nx * wb / 2 - dx * 0.06, by - ny * wb / 2 - dy * 0.06]); pts.push([bx + nx * wb / 2 - dx * 0.06, by + ny * wb / 2 - dy * 0.06]);
  return orient(pts);
}
function palmPoly() {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const th = (i / 28) * TAU, c = Math.cos(th), s = Math.sin(th);
    pts.push([0.212 * Math.sign(c) * Math.pow(Math.abs(c), 0.72) + (c > 0 && s > 0 ? 0.015 : 0), 0.245 * Math.sign(s) * Math.pow(Math.abs(s), 0.8) + 0.01]);
  }
  return orient(pts);
}
// unit hand polys. o: {seed, spread, fold (0..1), wrist (length), mirror}
function handPolys(o = {}) {
  const r = rng(o.seed ?? 1), spread = o.spread ?? 1, fold = o.fold ?? 0;
  const polys = [palmPoly()];
  for (const f of FINGERS) {
    const isT = f.n === 'thumb';
    const ang = f.a * spread * (1 - fold * (isT ? 0.4 : 0.85)) + (r() - 0.5) * 0.07 + (o.curl ? o.curl * (isT ? -0.3 : 0) : 0);
    const len = f.len * (1 + (r() - 0.5) * 0.06) * (1 - fold * (isT ? 0.4 : 0.63));
    polys.push(capsule(f.bx, f.by + fold * 0.03, ang, len, f.w * (1 + fold * 0.12), f.w * 0.86 * (1 + fold * 0.15)));
  }
  const wl = o.wrist ?? 0.45;
  if (wl > 0) polys.push(orient([[-0.15, 0.12], [0.155, 0.12], [0.14 + wl * 0.05, 0.2 + wl], [-0.135 - wl * 0.05, 0.2 + wl]]));
  if (o.mirror) return polys.map((p) => orient(p.map(([x, y]) => [-x, y])));
  return polys;
}
function xformPolys(polys, x, y, s, rot = 0) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return polys.map((p) => p.map(([px, py]) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s]));
}
function handPath(polys) { const P = new Path2D(); for (const p of polys) { P.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) P.lineTo(p[i][0], p[i][1]); P.closePath(); } return P; }
// point on hand in unit coords -> world
function handPt(ux, uy, x, y, s, rot = 0) { const c = Math.cos(rot), sn = Math.sin(rot); return [x + (ux * c - uy * sn) * s, y + (ux * sn + uy * c) * s]; }
function fingerTips(o = {}) {
  const fold = o.fold ?? 0, spread = o.spread ?? 1;
  return FINGERS.map((f) => { const isT = f.n === 'thumb'; const ang = f.a * spread * (1 - fold * (isT ? 0.4 : 0.85)); const len = f.len * (1 - fold * (isT ? 0.4 : 0.63)); return { f, ang, len, bx: f.bx, by: f.by }; });
}

/* ---------- ochre hand stencil (negative) ---------- */
// returns {layers:[canvas...], cx, cy, S, w, h}
function makeStencil(seed, o = {}) {
  const S = o.size ?? 380, K = o.layers ?? 1;
  const cw = Math.round(S * 1.45), ch = Math.round(S * 1.62);
  const cx = cw / 2, cy = ch * 0.44;
  const r = rng(seed * 11 + 3);
  const spread = o.spread ?? (0.95 + r() * 0.2);
  const polys = xformPolys(handPolys({ seed, spread, wrist: 0.5 }), cx, cy, S, o.rot ?? 0);
  const edge = [];
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.ceil(L / 3);
    for (let k = 0; k < n; k++) edge.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  const cols = o.colors ?? [PAL.ochre, PAL.ochreL, PAL.ochreD, '#b8502f'];
  const layers = [];
  const dotsPer = Math.round((o.dots ?? 16000) / K);
  for (let k = 0; k < K; k++) {
    const c = makeCanvas(cw, ch), x = c.getContext('2d');
    // diffuse pigment cloud
    if (k === 0 || K > 1) {
      for (let i = 0; i < 60 / K + 6; i++) {
        const e = edge[(r() * edge.length) | 0]; const rad = S * (0.08 + r() * 0.14);
        const g = x.createRadialGradient(e[0], e[1], 0, e[0], e[1], rad);
        g.addColorStop(0, `rgba(${RGB.ochre},${0.1 + r() * 0.08})`); g.addColorStop(1, `rgba(${RGB.ochre},0)`);
        x.fillStyle = g; x.fillRect(e[0] - rad, e[1] - rad, rad * 2, rad * 2);
      }
    }
    for (let i = 0; i < dotsPer; i++) {
      const e = edge[(r() * edge.length) | 0];
      const ang = r() * TAU; let d = Math.abs(gauss(r)) * S * 0.11; if (r() < 0.25) d += r() * S * 0.18;
      const px = e[0] + Math.cos(ang) * d, py = e[1] + Math.sin(ang) * d;
      const fade = 1 - smooth(cy + S * 0.42, cy + S * 0.75, py);
      if (r() > fade) continue;
      x.globalAlpha = 0.18 + 0.55 * r();
      x.fillStyle = cols[(r() * cols.length) | 0];
      const rad = 0.6 + r() * r() * 2.4 * (S / 380);
      x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill();
    }
    // splatter drops
    for (let i = 0; i < 14 / K + 2; i++) {
      const e = edge[(r() * edge.length) | 0], a = r() * TAU, d = S * (0.15 + r() * 0.25);
      x.globalAlpha = 0.5 + r() * 0.4; x.fillStyle = cols[0];
      x.beginPath(); x.arc(e[0] + Math.cos(a) * d, e[1] + Math.sin(a) * d, 1 + r() * 3.5 * (S / 380), 0, TAU); x.fill();
    }
    // cut the hand out
    x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1;
    x.shadowColor = '#000'; x.shadowBlur = S * 0.012; x.fillStyle = '#000';
    for (const poly of polys) fillPts(x, poly);
    x.shadowBlur = 0;
    // mottling: knock out random specks so it reads as pigment on rock
    for (let i = 0; i < 900 / K; i++) { x.globalAlpha = 0.3 + r() * 0.5; x.beginPath(); x.arc(r() * cw, r() * ch, 1 + r() * 4, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    // a few strays inside the hand
    for (let i = 0; i < 60 / K; i++) { const e = edge[(r() * edge.length) | 0]; x.globalAlpha = 0.12; x.fillStyle = cols[1]; x.beginPath(); x.arc(e[0] + (r() - 0.5) * S * 0.2, e[1] + (r() - 0.5) * S * 0.2, 0.8, 0, TAU); x.fill(); }
    layers.push(c);
  }
  return { layers, cx, cy, S, w: cw, h: ch, polys, seed, spread };
}
// draw stencil centered at (x,y) with hand length s. p = reveal progress (0..1) across layers
function drawStencil(ctx, st, x, y, s, rot = 0, alpha = 1, p = 1) {
  const k = s / st.S;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  const K = st.layers.length;
  for (let i = 0; i < K; i++) {
    const a = K === 1 ? p : clamp(p * K - i);
    if (a <= 0) break;
    ctx.globalAlpha = alpha * a;
    ctx.drawImage(st.layers[i], -st.cx, -st.cy);
  }
  ctx.restore();
}

/* ---------- stone / plaster wall textures ---------- */
function makeWall(w, h, seed, tone) {
  const c = makeCanvas(w, h), x = c.getContext('2d'), r = rng(seed);
  const T = tone === 'pale'
    ? { base: '#b8a88e', tones: ['#c9bba1', '#a8977c', '#d6cab2', '#9f8d73', '#bfae92', '#e0d6c2'], crack: '#6f604c', fleck: '#efe7d8' }
    : { base: '#3b2d23', tones: ['#4b392c', '#2c2119', '#5b4634', '#34271e', '#654e3b', '#231a14'], crack: '#140e0b', fleck: '#8a735d' };
  x.fillStyle = T.base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const cx = r() * w, cy = r() * h, rx = 150 + r() * 520, ry = 90 + r() * 300;
    wash(x, blobPoly(cx, cy, rx, ry, 9, r), T.tones[(r() * T.tones.length) | 0], { seed: seed * 100 + i, layers: 9, alpha: 0.075, v: 0.9 });
  }
  // strata
  for (let i = 0; i < 16; i++) {
    const y0 = r() * h, pts = [];
    for (let k = 0; k <= 12; k++) pts.push([(k / 12) * w * 1.1 - w * 0.05, y0 + noise1(k * 0.6 + i * 9) * 60 + k * (r() - 0.5) * 6]);
    x.fillStyle = r() < 0.5 ? T.tones[1] : T.tones[3];
    x.globalAlpha = 0.18; brush(x, pts, { w: 10 + r() * 30, seed: i + seed, wobble: 0.8, t0: 0.3, t1: 0.3 });
  }
  x.globalAlpha = 1;
  // low-frequency shading
  const lw = Math.ceil(w / 8), lh = Math.ceil(h / 8), lc = makeCanvas(lw, lh), lx = lc.getContext('2d'), id = lx.createImageData(lw, lh);
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
    const v = fbm2(i * 0.035 + seed, j * 0.035 - seed, 4);
    const o = (j * lw + i) * 4; const val = v > 0 ? 255 : 0; id.data[o] = id.data[o + 1] = id.data[o + 2] = val; id.data[o + 3] = Math.min(255, Math.abs(v) * 170);
  }
  lx.putImageData(id, 0, 0);
  x.save(); x.globalCompositeOperation = 'soft-light'; x.imageSmoothingQuality = 'high'; x.drawImage(lc, 0, 0, w, h); x.restore();
  // fine grit (full res)
  const gd = x.getImageData(0, 0, w, h), d = gd.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n * 0.9, 0, 255);
  }
  x.putImageData(gd, 0, 0);
  // cracks
  x.fillStyle = T.crack;
  for (let i = 0; i < 22; i++) {
    let px = r() * w, py = r() * h, a = r() * TAU; const pts = [[px, py]];
    const n = 5 + ((r() * 9) | 0);
    for (let k = 0; k < n; k++) { a += (r() - 0.5) * 1.1; const L = 20 + r() * 60; px += Math.cos(a) * L; py += Math.sin(a) * L; pts.push([px, py]); }
    x.globalAlpha = 0.35 + r() * 0.4; brush(x, pts, { w: 1.5 + r() * 3.5, seed: i * 3 + seed, wobble: 0.6, smooth: false });
  }
  // flecks
  x.fillStyle = T.fleck;
  for (let i = 0; i < 2600; i++) { x.globalAlpha = 0.08 + r() * 0.2; x.beginPath(); x.arc(r() * w, r() * h, 0.5 + r() * r() * 3, 0, TAU); x.fill(); }
  x.globalAlpha = 1;
  return c;
}

/* ---------- screen grain ---------- */
function makeGrain(sz) {
  const c = makeCanvas(sz, sz), x = c.getContext('2d'), id = x.createImageData(sz, sz), d = id.data;
  for (let j = 0; j < sz; j++) for (let i = 0; i < sz; i++) {
    const o = (j * sz + i) * 4;
    const v = 128 + (Math.random() - 0.5) * 70 + fbm2(i * 0.05, j * 0.05, 3) * 40;
    d[o] = d[o + 1] = d[o + 2] = clamp(v, 0, 255); d[o + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  // paper fibers
  x.strokeStyle = 'rgba(40,30,20,0.18)'; x.lineWidth = 0.7;
  for (let i = 0; i < 220; i++) { const px = Math.random() * sz, py = Math.random() * sz, a = Math.random() * TAU, L = 6 + Math.random() * 22; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.4) * L * 0.5, py + Math.sin(a + 0.4) * L * 0.5, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  return c;
}

/* ---------- glow sprites ---------- */
function makeSprite(size, stops) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
}
const SPR = {};
function initSprites() {
  SPR.spark = makeSprite(64, [[0, 'rgba(255,245,215,1)'], [0.18, 'rgba(255,215,140,0.85)'], [0.45, 'rgba(242,150,60,0.25)'], [1, 'rgba(200,80,30,0)']]);
  SPR.glow = makeSprite(256, [[0, 'rgba(255,214,140,0.9)'], [0.25, 'rgba(242,164,68,0.45)'], [0.6, 'rgba(200,90,40,0.12)'], [1, 'rgba(160,60,30,0)']]);
  SPR.white = makeSprite(256, [[0, 'rgba(255,252,240,1)'], [0.3, 'rgba(255,240,205,0.7)'], [1, 'rgba(255,220,160,0)']]);
  SPR.ochre = makeSprite(32, [[0, 'rgba(190,78,45,1)'], [0.5, 'rgba(169,63,39,0.7)'], [1, 'rgba(169,63,39,0)']]);
  SPR.dark = makeSprite(256, [[0, 'rgba(10,7,5,0.9)'], [0.6, 'rgba(10,7,5,0.4)'], [1, 'rgba(10,7,5,0)']]);
  SPR.bone = makeSprite(32, [[0, 'rgba(240,232,215,1)'], [0.4, 'rgba(235,224,203,0.6)'], [1, 'rgba(235,224,203,0)']]);
}
function sprite(ctx, img, x, y, r, a = 1) { if (a <= 0 || r <= 0) return; ctx.globalAlpha = a; ctx.drawImage(img, x - r, y - r, r * 2, r * 2); }


/* ============================================================
   FIGURES: the Elder (ink), the Being (light), tiny crowd
   Side-view skeletons. Angles are measured from straight down,
   positive = rotate toward the facing direction.
   ============================================================ */
const PROPS = {
  adult: { thigh: 0.245, shin: 0.245, torso: 0.3, neck: 0.045, headR: 0.068, upper: 0.165, fore: 0.155 },
  child: { thigh: 0.2, shin: 0.19, torso: 0.3, neck: 0.04, headR: 0.1, upper: 0.155, fore: 0.135 },
};
function mixProps(t) { const o = {}; for (const k in PROPS.adult) o[k] = lerp(PROPS.child[k], PROPS.adult[k], t); return o; }

const POSE0 = { lhip: 0, lkn: 0, rhip: 0, rkn: 0, lsh: 0.08, lel: 0.15, rsh: -0.05, rel: 0.2, lean: 0, head: 0, bob: 0, crouch: 0 };
function pose(over) { return Object.assign({}, POSE0, over); }
function mixPose(a, b, t) { const o = {}; for (const k in POSE0) o[k] = lerp(a[k] ?? POSE0[k], b[k] ?? POSE0[k], t); return o; }

// walking. ph in cycles (one cycle = two steps)
function walkPose(ph, amt = 1, extra) {
  const a = ph * TAU, s = Math.sin(a), c = Math.cos(a);
  return pose(Object.assign({
    lhip: 0.36 * s * amt, rhip: -0.36 * s * amt,
    lkn: -0.62 * Math.max(0, c) * amt - 0.04, rkn: -0.62 * Math.max(0, -c) * amt - 0.04,
    lsh: -0.3 * s * amt + 0.05, rsh: 0.3 * s * amt + 0.05, lel: 0.25, rel: 0.3,
    bob: -Math.abs(c) * 0.01 * amt, lean: 0.04,
  }, extra || {}));
}
const STRIDE = 0.7; // cycle length in units of height

function solve(fig, p) {
  const h = fig.h, P = fig.prop, f = fig.face;
  const th = P.thigh * h, sh = P.shin * h;
  const leg = (a, k) => { const kx = Math.sin(a) * th, ky = Math.cos(a) * th, s = a + k; return { kx, ky, fx: kx + Math.sin(s) * sh, fy: ky + Math.cos(s) * sh }; };
  const L = leg(p.lhip, p.lkn), R = leg(p.rhip, p.rkn);
  const drop = Math.max(L.fy, R.fy);
  const hip = [fig.x, fig.y - drop + (p.bob || 0) * h + (p.crouch || 0) * h];
  const J = { hip };
  J.lk = [hip[0] + f * L.kx, hip[1] + L.ky]; J.lf = [hip[0] + f * L.fx, Math.min(fig.y, hip[1] + L.fy)];
  J.rk = [hip[0] + f * R.kx, hip[1] + R.ky]; J.rf = [hip[0] + f * R.fx, Math.min(fig.y, hip[1] + R.fy)];
  const lean = p.lean || 0;
  J.neck = [hip[0] + f * Math.sin(lean) * P.torso * h, hip[1] - Math.cos(lean) * P.torso * h];
  const hl = lean + (p.head || 0), hd = P.neck * h + P.headR * h;
  J.head = [J.neck[0] + f * Math.sin(hl) * hd, J.neck[1] - Math.cos(hl) * hd];
  J.sh = [J.neck[0] - f * Math.sin(lean) * 0.03 * h, J.neck[1] + 0.035 * h];
  const arm = (a, e) => { const ex = Math.sin(a) * P.upper * h, ey = Math.cos(a) * P.upper * h, s = a + e; return { ex, ey, wx: ex + Math.sin(s) * P.fore * h, wy: ey + Math.cos(s) * P.fore * h }; };
  const A = arm(p.lsh, p.lel), B = arm(p.rsh, p.rel);
  J.le = [J.sh[0] + f * A.ex, J.sh[1] + A.ey]; J.lw = [J.sh[0] + f * A.wx, J.sh[1] + A.wy];
  J.re = [J.sh[0] + f * B.ex, J.sh[1] + B.ey]; J.rw = [J.sh[0] + f * B.wx, J.sh[1] + B.wy];
  J.hands = [(J.lw[0] + J.rw[0]) / 2, (J.lw[1] + J.rw[1]) / 2];
  J.headR = P.headR * h;
  return J;
}

function boilPt(p, amt, seed, tick) { return [p[0] + noise1(tick * 1.7 + seed) * amt, p[1] + noise1(tick * 1.3 + seed + 50) * amt]; }
function seg(ctx, a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

/* ---------- the Elder: ink silhouette, white hair, cloak ---------- */
function drawElder(ctx, fig, p, o = {}) {
  const J = solve(fig, p), h = fig.h, f = fig.face, tick = o.tick ?? 0, bo = h * 0.006;
  const B = (pt, s) => boilPt(pt, bo, s, tick);
  const ink = o.color ?? PAL.ink;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // back arm + back leg
  seg(ctx, B(J.sh, 1), B(J.le, 2), h * 0.042); seg(ctx, B(J.le, 2), B(J.lw, 3), h * 0.032);
  seg(ctx, B(J.hip, 4), B(J.lk, 5), h * 0.055); seg(ctx, B(J.lk, 5), B(J.lf, 6), h * 0.04);
  footShape(ctx, J.lf, f, h);
  seg(ctx, B(J.hip, 4), B(J.rk, 7), h * 0.055); seg(ctx, B(J.rk, 7), B(J.rf, 8), h * 0.04);
  footShape(ctx, J.rf, f, h);
  // cloak
  const sway = (o.sway ?? 0) * h;
  const nk = J.neck, hp = J.hip;
  const gy = fig.y;
  const cl = [
    [nk[0] - f * 0.05 * h, nk[1] + 0.005 * h],
    [nk[0] + f * 0.035 * h, nk[1] - 0.005 * h],
    [nk[0] + f * 0.075 * h, nk[1] + 0.06 * h],
    [hp[0] + f * 0.09 * h, hp[1] - 0.02 * h],
    [hp[0] + f * 0.125 * h + sway, lerp(hp[1], gy, 0.7)],
    [hp[0] + f * 0.02 * h + sway * 1.2, lerp(hp[1], gy, 0.76)],
    [hp[0] - f * 0.14 * h + sway * 1.4, lerp(hp[1], gy, 0.72)],
    [hp[0] - f * 0.11 * h, hp[1] - 0.04 * h],
    [nk[0] - f * 0.1 * h, nk[1] + 0.09 * h],
  ].map((q, i) => B(q, 20 + i));
  ctx.beginPath(); const sm = catmull([...cl, cl[0], cl[1]], 4); pathPts(ctx, sm.slice(0, sm.length - 4)); ctx.fill();
  // head
  const hd = B(J.head, 40);
  ctx.beginPath(); ctx.arc(hd[0], hd[1], J.headR, 0, TAU); ctx.fill();
  // white hair: wisps and a knot at the back
  if (o.hair !== false) {
    ctx.strokeStyle = o.hairColor ?? PAL.bone; ctx.globalAlpha = (o.alpha ?? 1) * 0.9;
    const r = J.headR;
    ctx.lineWidth = r * 0.28;
    ctx.beginPath(); ctx.arc(hd[0], hd[1], r * 0.86, f > 0 ? Math.PI * 1.05 : -Math.PI * 0.05, f > 0 ? Math.PI * 1.7 : -Math.PI * 0.7, f < 0); ctx.stroke();
    ctx.fillStyle = o.hairColor ?? PAL.bone;
    ctx.beginPath(); ctx.arc(hd[0] - f * r * 0.95, hd[1] - r * 0.35, r * 0.34, 0, TAU); ctx.fill();
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hd[0] - f * r * (0.3 + i * 0.2), hd[1] - r * 0.9); ctx.quadraticCurveTo(hd[0] - f * r * (0.7 + i * 0.15), hd[1] - r * 1.15, hd[0] - f * r * (1.0 + i * 0.12), hd[1] - r * (0.8 - i * 0.1)); ctx.stroke(); }
    ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = ink; ctx.strokeStyle = ink;
  }
  // front arm over cloak
  seg(ctx, B(J.sh, 60), B(J.re, 61), h * 0.046); seg(ctx, B(J.re, 61), B(J.rw, 62), h * 0.034);
  ctx.beginPath(); ctx.arc(J.rw[0], J.rw[1], h * 0.024, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(J.lw[0], J.lw[1], h * 0.022, 0, TAU); ctx.fill();
  // staff
  if (o.staff) {
    const top = [J.rw[0] + f * h * 0.01, J.rw[1] - h * 0.12];
    const bot = [J.rw[0] + f * h * 0.06, fig.y];
    ctx.lineWidth = h * 0.016; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
  }
  // rim light from a light source (x position)
  if (o.rim) {
    const side = Math.sign(o.rimX - J.hip[0]) || f;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RGB.ember},${0.55 * o.rim})`; ctx.lineWidth = h * 0.007;
    ctx.beginPath(); ctx.arc(hd[0], hd[1], J.headR * 0.97, side > 0 ? -1.2 : Math.PI - 0.3, side > 0 ? 0.3 : Math.PI + 1.2); ctx.stroke();
    const e1 = side === f ? cl[2] : cl[8], e2 = side === f ? cl[4] : cl[6];
    ctx.beginPath(); ctx.moveTo(e1[0], e1[1]); ctx.quadraticCurveTo((e1[0] + e2[0]) / 2 + side * h * 0.02, (e1[1] + e2[1]) / 2, e2[0], e2[1]); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  return J;
}
function footShape(ctx, pt, f, h) { ctx.beginPath(); ctx.ellipse(pt[0] + f * h * 0.025, pt[1] - h * 0.008, h * 0.04, h * 0.014, 0, 0, TAU); ctx.fill(); }

/* ---------- the Being: a figure made of light ---------- */
function drawBeing(ctx, fig, p, o = {}) {
  const J = solve(fig, p), h = fig.h, f = fig.face, t = o.t ?? 0, I = o.intensity ?? 1, tick = o.tick ?? 0;
  const B = (pt, s) => boilPt(pt, h * 0.004, s, tick);
  const bones = [
    [B(J.sh, 1), B(J.le, 2), B(J.lw, 3)],
    [B(J.hip, 4), B(J.lk, 5), B(J.lf, 6)],
    [B(J.hip, 4), B(J.rk, 7), B(J.rf, 8)],
    [B(J.hip, 4), B(J.neck, 9)],
    [B(J.sh, 1), B(J.re, 10), B(J.rw, 11)],
  ];
  const widths = [0.075, 0.09, 0.09, 0.19, 0.075];
  const hd = B(J.head, 12);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const A = (o.alpha ?? 1);
  const strokeAll = (mul, style) => {
    ctx.strokeStyle = style;
    bones.forEach((b, i) => { ctx.lineWidth = h * widths[i] * mul; ctx.beginPath(); ctx.moveTo(b[0][0], b[0][1]); for (let k = 1; k < b.length; k++) ctx.lineTo(b[k][0], b[k][1]); ctx.stroke(); });
    ctx.fillStyle = style; ctx.beginPath(); ctx.arc(hd[0], hd[1], J.headR * (0.5 + mul * 0.5), 0, TAU); ctx.fill();
  };
  // body: amber base so it reads on pale walls too
  ctx.globalAlpha = A * (o.solid ?? 0.9);
  strokeAll(1, '#d9822f');
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = A * 0.06 * I; strokeAll(1.9, 'rgb(242,150,60)');
  ctx.globalAlpha = A * 0.1 * I; strokeAll(1.4, 'rgb(250,180,90)');
  ctx.globalAlpha = A * 0.55 * I; strokeAll(0.85, 'rgb(255,205,120)');
  ctx.globalAlpha = A * 0.8 * I; strokeAll(0.38, 'rgb(255,244,215)');
  // ochre dust settling on the hands / body
  if (o.ochre) {
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 40; i++) {
      const w = i % 2 ? J.rw : J.lw, a = hash(i * 3.3) * TAU, d = hash(i * 7.1) * h * 0.035;
      sprite(ctx, SPR.ochre, w[0] + Math.cos(a) * d, w[1] + Math.sin(a) * d, h * (0.006 + hash(i) * 0.008), A * o.ochre * 0.9);
    }
    ctx.globalCompositeOperation = 'lighter';
  }
  // drifting sparks off the body
  const nS = o.sparks ?? 26;
  for (let i = 0; i < nS; i++) {
    const life = frac(t * (0.25 + hash(i) * 0.35) + hash(i * 9.1));
    const b = bones[i % bones.length], k = hash(i * 4.4);
    const q = k < 0.5 ? [lerp(b[0][0], b[1][0], k * 2), lerp(b[0][1], b[1][1], k * 2)] : [lerp(b[1][0], b[b.length - 1][0], k * 2 - 1), lerp(b[1][1], b[b.length - 1][1], k * 2 - 1)];
    const x = q[0] + noise1(i + t * 0.8) * h * 0.04, y = q[1] - life * h * 0.25;
    sprite(ctx, SPR.spark, x, y, h * 0.012 * (1 - life), A * I * (1 - life) * 0.9);
  }
  sprite(ctx, SPR.glow, (J.hip[0] + J.neck[0]) / 2, (J.hip[1] + J.neck[1]) / 2, h * 0.9, A * 0.22 * I);
  ctx.restore();
  return J;
}

/* ---------- tiny crowd figure ---------- */
function drawTiny(ctx, x, y, h, o = {}) {
  const f = o.face ?? 1, ph = o.ph ?? 0, lean = o.lean ?? 0, bow = o.bow ?? 0;
  const bob = Math.abs(Math.sin(ph * TAU)) * h * 0.02 * (o.walk ?? 0);
  const hx = x + f * Math.sin(lean) * h * 0.25, hy = y - h * 0.85 + bob + bow * h * 0.25;
  const hdx = hx + f * (bow * h * 0.18 + Math.sin(lean) * h * 0.08), hdy = hy - h * 0.08 + bow * h * 0.1;
  ctx.beginPath();
  ctx.moveTo(hx - f * h * 0.06, hy);
  ctx.lineTo(hx + f * h * 0.06, hy);
  ctx.lineTo(x + f * h * 0.14, y - h * 0.18);
  ctx.lineTo(x - f * h * 0.17, y - h * 0.16);
  ctx.closePath(); ctx.fill();
  const s = Math.sin(ph * TAU) * 0.3 * (o.walk ?? 0);
  ctx.lineWidth = h * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - f * h * 0.03, y - h * 0.2); ctx.lineTo(x - f * h * 0.03 + f * Math.sin(s) * h * 0.2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + f * h * 0.03, y - h * 0.2); ctx.lineTo(x + f * h * 0.03 - f * Math.sin(s) * h * 0.2, y); ctx.stroke();
  ctx.beginPath(); ctx.arc(hdx, hdy, h * 0.085, 0, TAU); ctx.fill();
  if (o.arm != null) { // arm reaching forward/up, angle from down
    const a = o.arm; ctx.lineWidth = h * 0.045;
    ctx.beginPath(); ctx.moveTo(hx, hy + h * 0.03); ctx.lineTo(hx + f * Math.sin(a) * h * 0.3, hy + h * 0.03 + Math.cos(a) * h * 0.3); ctx.stroke();
  }
  return [hdx, hdy];
}

/* ---------- a modern person (the parent, the kid, the doctor) ---------- */
// o: {style:'parent'|'kid'|'plain', color, alpha, tick, rim, rimX, hairColor}
function drawPerson(ctx, fig, p, o = {}) {
  const J = solve(fig, p), h = fig.h, f = fig.face, tick = o.tick ?? 0, bo = h * 0.005;
  const B = (pt, s) => boilPt(pt, bo, s, tick);
  const ink = o.color ?? PAL.ink, kid = o.style === 'kid';
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const aw = kid ? 0.062 : 0.05, lw = kid ? 0.08 : 0.068;
  seg(ctx, B(J.sh, 1), B(J.le, 2), h * aw); seg(ctx, B(J.le, 2), B(J.lw, 3), h * aw * 0.8);
  ctx.beginPath(); ctx.arc(J.lw[0], J.lw[1], h * aw * 0.55, 0, TAU); ctx.fill();
  seg(ctx, B(J.hip, 4), B(J.lk, 5), h * lw); seg(ctx, B(J.lk, 5), B(J.lf, 6), h * lw * 0.82); footShape(ctx, J.lf, f, h * 1.1);
  seg(ctx, B(J.hip, 4), B(J.rk, 7), h * lw); seg(ctx, B(J.rk, 7), B(J.rf, 8), h * lw * 0.82); footShape(ctx, J.rf, f, h * 1.1);
  // torso: shoulders to hips
  const nk = J.neck, hp = J.hip, lean = p.lean || 0;
  const nx = Math.cos(lean) * f, ny = Math.sin(lean);
  const sw = h * (kid ? 0.075 : 0.085), hw = h * (kid ? 0.07 : 0.075);
  const tor = [
    [nk[0] - nx * sw, nk[1] - ny * sw * f + h * 0.01], [nk[0] + nx * sw * 0.9, nk[1] + ny * sw * f + h * 0.01],
    [hp[0] + nx * hw, hp[1] + ny * hw * f + h * 0.02], [hp[0] - nx * hw, hp[1] - ny * hw * f + h * 0.02],
  ].map((q, i) => B(q, 20 + i));
  ctx.beginPath(); pathPts(ctx, catmull([...tor, tor[0]], 3)); ctx.fill();
  seg(ctx, nk, J.head, h * 0.05);
  const hd = B(J.head, 40), r = J.headR;
  ctx.beginPath(); ctx.arc(hd[0], hd[1], r, 0, TAU); ctx.fill();
  if (kid) { // ponytail
    const sw2 = Math.sin(tick * 0.9) * 0.15;
    ctx.beginPath(); ctx.ellipse(hd[0] - f * r * 1.15, hd[1] + r * 0.1, r * 0.32, r * 0.62, f * (0.5 + sw2), 0, TAU); ctx.fill();
  } else if (o.style === 'parent') { // messy hair
    ctx.beginPath(); ctx.ellipse(hd[0] - f * r * 0.2, hd[1] - r * 0.55, r * 1.02, r * 0.62, -f * 0.2, 0, TAU); ctx.fill();
  }
  seg(ctx, B(J.sh, 60), B(J.re, 61), h * aw * 1.05); seg(ctx, B(J.re, 61), B(J.rw, 62), h * aw * 0.85);
  ctx.beginPath(); ctx.arc(J.rw[0], J.rw[1], h * aw * 0.6, 0, TAU); ctx.fill();
  if (o.rim) {
    const side = Math.sign((o.rimX ?? hd[0] + f) - hp[0]) || f;
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${o.rimRGB ?? RGB.ember},${0.6 * o.rim})`; ctx.lineWidth = h * 0.007;
    ctx.beginPath(); ctx.arc(hd[0], hd[1], r * 0.97, side > 0 ? -1.3 : Math.PI - 0.2, side > 0 ? 0.2 : Math.PI + 1.3); ctx.stroke();
    const a1 = side === f ? tor[1] : tor[0], a2 = side === f ? tor[2] : tor[3];
    ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
  }
  ctx.restore();
  return J;
}
const SIT = { lhip: 1.45, lkn: -1.5, rhip: 1.55, rkn: -1.45 };

/* ---------- ambient particles (all stateless) ---------- */
// rising sparks inside a box
function drawSparks(ctx, t, n, x0, y0, w, h, o = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sz = o.size ?? 5, A = o.alpha ?? 1, sp = o.speed ?? 0.2, seed = o.seed ?? 0;
  for (let i = 0; i < n; i++) {
    const life = frac(t * sp * (0.6 + hash(i + seed) * 0.8) + hash(i * 3.3 + seed));
    const x = x0 + hash(i * 7.7 + seed) * w + noise1(t * 0.9 + i) * 30 * life;
    const y = y0 + h - life * h;
    sprite(ctx, SPR.spark, x, y, sz * (0.5 + hash(i * 1.1 + seed)) * (1 - life * 0.6), A * Math.sin(life * Math.PI));
  }
  ctx.restore();
}
// drifting flakes (ash / snow / dust). dir: -1 rising, +1 falling
function drawFlakes(ctx, t, n, x0, y0, w, h, o = {}) {
  ctx.save();
  const col = o.color ?? PAL.bone, A = o.alpha ?? 0.6, dir = o.dir ?? 1, sp = o.speed ?? 0.08, sz = o.size ?? 3, seed = o.seed ?? 5;
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const life = frac(t * sp * (0.6 + hash(i + seed) * 0.8) + hash(i * 3.3 + seed));
    const y = dir > 0 ? y0 + life * h : y0 + h - life * h;
    const x = x0 + frac(hash(i * 7.7 + seed) + noise1(t * 0.3 + i) * 0.03) * w;
    ctx.globalAlpha = A * Math.sin(life * Math.PI) * (0.4 + 0.6 * hash(i * 5.5 + seed));
    const s = sz * (0.4 + hash(i * 2.2 + seed));
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.6, t * (0.5 + hash(i)) + i, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

let RS = 1;            // canvas pixels per logical pixel
const AS = {};         // generated assets
function camSet(ctx, cx, cy, z, shake) {
  const sx = shake ? shake[0] : 0, sy = shake ? shake[1] : 0;
  ctx.setTransform(RS * z, 0, 0, RS * z, RS * (W / 2 - cx * z + sx), RS * (H / 2 - cy * z + sy));
}
function scr(ctx) { ctx.setTransform(RS, 0, 0, RS, 0, 0); }
function w2s(cam, x, y) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }
function shakeAt(t, t0, amt, dur = 0.6) { const k = t - t0; if (k < 0 || k > dur) return null; const d = (1 - k / dur) * amt; return [noise1(t * 40) * d, noise1(t * 43 + 7) * d]; }

function makeVignette() {
  const c = makeCanvas(480, 270), x = c.getContext('2d');
  const g = x.createRadialGradient(240, 135, 60, 240, 135, 300);
  g.addColorStop(0, 'rgba(10,7,5,0)'); g.addColorStop(0.6, 'rgba(10,7,5,0.18)'); g.addColorStop(1, 'rgba(10,7,5,0.75)');
  x.fillStyle = g; x.fillRect(0, 0, 480, 270); return c;
}

/* ---------- lighting (screen space) ---------- */
// lights: [{x,y,r,a}] in screen coords; amb: darkness away from lights (0..1)
function lightPass(ctx, lights, amb, o = {}) {
  const m = AS.lm.getContext('2d'), k = 0.25;
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, AS.lm.width, AS.lm.height);
  m.fillStyle = `rgba(${o.dark ?? '8,5,3'},${amb})`; m.fillRect(0, 0, AS.lm.width, AS.lm.height);
  m.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const g = m.createRadialGradient(l.x * k, l.y * k, 0, l.x * k, l.y * k, l.r * k);
    g.addColorStop(0, `rgba(0,0,0,${l.a ?? 1})`); g.addColorStop(0.45, `rgba(0,0,0,${(l.a ?? 1) * 0.65})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; m.fillRect(l.x * k - l.r * k, l.y * k - l.r * k, l.r * k * 2, l.r * k * 2);
  }
  scr(ctx); ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(AS.lm, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) if (l.warm) sprite(ctx, SPR.glow, l.x, l.y, l.r * 0.9, l.warm * 0.22);
  ctx.restore();
}

/* ---------- ink hands in close-up ---------- */
// frontal ink hand with age lines. o: {seed, fold, tremble, t, alpha, color, rim, lines}
function drawInkHand(ctx, x, y, s, rot, o = {}) {
  const t = o.t ?? 0, tr = o.tremble ?? 0;
  x += (noise1(t * 9 + 1) * 0.7 + noise1(t * 23) * 0.3) * tr * s * 0.012;
  y += (noise1(t * 9 + 5) * 0.7 + noise1(t * 21 + 3) * 0.3) * tr * s * 0.012;
  rot += noise1(t * 7 + 9) * tr * 0.01;
  const polys = xformPolys(handPolys({ seed: o.seed ?? 5, fold: o.fold ?? 0, wrist: o.wrist ?? 1.6, mirror: o.mirror, spread: o.spread ?? 1 }), x, y, s, rot);
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.color ?? PAL.ink;
  const P = handPath(polys); ctx.fill(P);
  // soft bleed edge
  ctx.globalAlpha = (o.alpha ?? 1) * 0.25; ctx.lineWidth = s * 0.012; ctx.strokeStyle = o.color ?? PAL.ink; ctx.stroke(P);
  // age: knuckle creases, palm lines
  if (o.lines !== false) {
    ctx.save(); ctx.clip(P);
    ctx.strokeStyle = `rgba(${RGB.bone},${0.28 * (o.lines ?? 1)})`; ctx.lineWidth = Math.max(1, s * 0.004); ctx.lineCap = 'round';
    const tips = fingerTips({ fold: o.fold ?? 0, spread: o.spread ?? 1 });
    for (const q of tips) {
      if (q.f.n === 'thumb') continue;
      for (const along of [0.38, 0.68]) {
        for (let k = 0; k < 3; k++) {
          const cx = q.bx + Math.sin(q.ang) * q.len * (along + k * 0.018), cy = q.by - Math.cos(q.ang) * q.len * (along + k * 0.018);
          const nx = Math.cos(q.ang) * q.f.w * 0.3, ny = Math.sin(q.ang) * q.f.w * 0.3;
          const sx = o.mirror ? -1 : 1;
          const A = handPt(sx * (cx - nx), cy - ny, x, y, s, rot), B = handPt(sx * (cx + nx), cy + ny, x, y, s, rot);
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + s * 0.004, B[0], B[1]); ctx.stroke();
        }
      }
    }
    const sx = o.mirror ? -1 : 1;
    const pl = (pts) => { const q = pts.map(([a, b]) => handPt(sx * a, b, x, y, s, rot)); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]); ctx.stroke(); };
    ctx.lineWidth = Math.max(1, s * 0.004); ctx.globalAlpha = 0.6;
    pl([[-0.2, -0.1], [-0.02, -0.06], [0.12, -0.14]]);
    pl([[-0.19, -0.02], [0.0, 0.02], [0.16, -0.06]]);
    pl([[0.13, 0.0], [0.05, 0.12], [0.02, 0.24]]);
    ctx.restore();
  }
  if (o.rim) { // warm light on the hand edge
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.rim * 0.5; ctx.strokeStyle = `rgb(${RGB.ember})`; ctx.lineWidth = s * 0.012; ctx.stroke(P);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.color ?? PAL.ink; ctx.fill(P);
  }
  ctx.restore();
  return P;
}
// frontal hand made of light
function drawLightHand(ctx, x, y, s, rot, o = {}) {
  const polys = xformPolys(handPolys({ seed: o.seed ?? 9, wrist: o.wrist ?? 1.6, mirror: o.mirror, spread: o.spread ?? 1, fold: o.fold ?? 0 }), x, y, s, rot);
  const P = handPath(polys), A = o.alpha ?? 1, t = o.t ?? 0;
  ctx.save();
  ctx.globalAlpha = A * (o.solid ?? 0.85); ctx.fillStyle = '#d9822f'; ctx.fill(P);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = A * 0.07; ctx.strokeStyle = 'rgb(242,150,60)'; ctx.lineWidth = s * 0.12; ctx.stroke(P);
  ctx.globalAlpha = A * 0.12; ctx.lineWidth = s * 0.05; ctx.stroke(P);
  ctx.globalAlpha = A * 0.5; ctx.fillStyle = 'rgb(255,200,110)'; ctx.fill(P);
  ctx.save(); ctx.clip(P);
  const c = handPt(0, 0.05, x, y, s, rot);
  sprite(ctx, SPR.white, c[0], c[1], s * 0.55, A * 0.8);
  ctx.restore();
  ctx.globalAlpha = A * 0.9; ctx.strokeStyle = 'rgb(255,240,210)'; ctx.lineWidth = s * 0.006; ctx.stroke(P);
  // sparks
  for (let i = 0; i < 18; i++) {
    const life = frac(t * (0.3 + hash(i) * 0.3) + hash(i * 5.1));
    const q = polys[1 + (i % 5)][(i * 7) % polys[1 + (i % 5)].length];
    sprite(ctx, SPR.spark, q[0] + noise1(i + t) * s * 0.03, q[1] - life * s * 0.25, s * 0.02 * (1 - life), A * (1 - life));
  }
  if (o.ochre) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.clip(P);
    for (let i = 0; i < 260 * o.ochre; i++) {
      const q = handPt((hash(i * 1.3) - 0.5) * 0.55, (hash(i * 2.7) - 0.6) * 0.9, x, y, s, rot);
      sprite(ctx, SPR.ochre, q[0], q[1], s * (0.008 + hash(i * 4.4) * 0.012), 0.85);
    }
    ctx.restore();
  }
  ctx.restore();
  return P;
}

/* ---------- final grade: vignette + paper grain ---------- */
function finalPass(ctx, t, o = {}) {
  scr(ctx); ctx.save();
  ctx.globalAlpha = o.vig ?? 1; ctx.drawImage(AS.vig, 0, 0, W, H);
  if (!AS.grainPat) AS.grainPat = ctx.createPattern(AS.grain, 'repeat');
  const tick = Math.floor(t * 8);
  const ox = hash(tick) * 384, oy = hash(tick + 0.5) * 384;
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain ?? 0.3;
  ctx.translate(-ox, -oy); ctx.fillStyle = AS.grainPat; ctx.fillRect(0, 0, W + 384, H + 384);
  ctx.restore();
}
function fillScreen(ctx, col, a = 1) { scr(ctx); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }

/* ---------- motion helper: piecewise eased keyframes ---------- */
// keys: [[t, value], ...]; smoothstep between keys (zero speed at every key)
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
    if (t <= tb) { const u = (t - ta) / (tb - ta); const e = keys[i + 1][2] ? keys[i + 1][2](u) : u * u * (3 - 2 * u); return lerp(va, vb, e); }
  }
  return keys[keys.length - 1][1];
}
// walker state from x keyframes: returns {x, ph, amt}
function walker(keys, t, h) {
  const x = kf(keys, t), x2 = kf(keys, t + 0.05), v = (x2 - x) / 0.05;
  return { x, ph: x / (STRIDE * h), amt: clamp(Math.abs(v) / (h * 0.45)), dir: Math.sign(v) };
}

function washRect(x, x0, y0, x1, y1, col, o = {}) { wash(x, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col, Object.assign({ layers: 10, alpha: 0.08, v: 0.25 }, o)); }
function inkLine(x, pts, w, o = {}) { x.save(); x.strokeStyle = o.color ?? PAL.ink; brushDry(x, pts, Object.assign({ w, dry: 0.25, smooth: false }, o)); x.restore(); }
function inkBox(x, x0, y0, x1, y1, w, o = {}) { inkLine(x, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], w, o); }
function tone(x, w, h, col, seed, n = 20, a = 0.07) { const r = rng(seed); for (let i = 0; i < n; i++) wash(x, blobPoly(r() * w, r() * h, 200 + r() * 500, 120 + r() * 300, 8, r), col, { layers: 7, alpha: a, seed: seed + i }); }
function grit(x, w, h, a = 18) { const d = x.getImageData(0, 0, w, h), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - 0.5) * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; } x.putImageData(d, 0, 0); }

const KIT = { lamp: [1150, 470], table: [850, 1500, 760], fridge: [2020, 180, 2330, 1000], drawing: [2175, 470], radio: [1770, 668], chair: 840, clock: [1150, 215], win: [250, 250, 650, 650] };

function buildKitchen() {
  /* ---------- kitchen, 2400x1350 ---------- */
  const w = 2400, h = 1350, c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#4a3d33'; x.fillRect(0, 0, w, h);
  tone(x, w, 1000, '#5b4c3f', 11, 18); tone(x, w, 1000, '#3a2f27', 12, 14);
  // floor
  x.fillStyle = '#2a211b'; x.fillRect(0, 1000, w, h - 1000);
  for (let i = 0; i < 9; i++) inkLine(x, [[0, 1010 + i * 40 + i * i * 3], [w, 1010 + i * 40 + i * i * 3]], 2, { alpha: 0.35, k: 3 });
  inkLine(x, [[0, 1000], [w, 1000]], 8);
  // window: night
  const [wx0, wy0, wx1, wy1] = KIT.win;
  washRect(x, wx0, wy0, wx1, wy1, '#120d0b', { alpha: 0.6, layers: 6 });
  x.fillStyle = '#e8b06a'; const r = rng(3);
  for (let i = 0; i < 7; i++) { x.globalAlpha = 0.5 + r() * 0.4; x.fillRect(wx0 + 30 + r() * 340, wy0 + 250 + r() * 120, 5 + r() * 6, 4 + r() * 5); } x.globalAlpha = 1;
  inkBox(x, wx0, wy0, wx1, wy1, 14); inkLine(x, [[(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1]], 9); inkLine(x, [[wx0, (wy0 + wy1) / 2], [wx1, (wy0 + wy1) / 2]], 9);
  inkLine(x, [[wx0 - 30, wy1 + 12], [wx1 + 30, wy1 + 12]], 14);
  // clock at three
  const [cx, cy] = KIT.clock; x.fillStyle = PAL.bone; x.globalAlpha = 0.8; x.beginPath(); x.arc(cx, cy, 52, 0, TAU); x.fill(); x.globalAlpha = 1;
  const circ = []; for (let i = 0; i <= 30; i++) circ.push([cx + Math.cos((i / 30) * TAU) * 54, cy + Math.sin((i / 30) * TAU) * 54]); inkLine(x, circ, 6);
  inkLine(x, [[cx, cy], [cx, cy - 38]], 5); inkLine(x, [[cx, cy], [cx + 28, cy]], 7);
  // lamp cord + shade
  inkLine(x, [[KIT.lamp[0], 0], [KIT.lamp[0], KIT.lamp[1] - 60]], 3);
  x.fillStyle = PAL.ink; x.beginPath(); x.moveTo(KIT.lamp[0] - 20, KIT.lamp[1] - 64); x.lineTo(KIT.lamp[0] + 20, KIT.lamp[1] - 64); x.lineTo(KIT.lamp[0] + 90, KIT.lamp[1]); x.lineTo(KIT.lamp[0] - 90, KIT.lamp[1]); x.closePath(); x.fill();
  // table
  const [tx0, tx1, ty] = KIT.table;
  washRect(x, tx0, ty - 6, tx1, ty + 22, '#2d2119', { alpha: 0.4, layers: 5 });
  inkLine(x, [[tx0 - 20, ty], [tx1 + 20, ty]], 16); inkLine(x, [[tx0 + 20, ty + 10], [tx0 + 30, 1000]], 12); inkLine(x, [[tx1 - 20, ty + 10], [tx1 - 30, 1000]], 12);
  // mug + papers on table
  x.fillStyle = PAL.bone; x.globalAlpha = 0.85; x.save(); x.translate(1300, ty - 6); x.rotate(-0.05); x.fillRect(-60, -6, 130, 6); x.restore(); x.globalAlpha = 1;
  inkBox(x, 1390, ty - 58, 1432, ty - 4, 5); inkLine(x, [[1432, ty - 46], [1450, ty - 36], [1432, ty - 22]], 4);
  // chair (left of table, parent sits facing right)
  const ch = KIT.chair;
  inkLine(x, [[ch - 70, 520], [ch - 60, 1000]], 11); inkLine(x, [[ch - 70, 700], [ch + 60, 700]], 12); inkLine(x, [[ch + 55, 705], [ch + 60, 1000]], 10);
  // counter, cabinets, radio
  washRect(x, 1580, 720, 2000, 1000, '#33271f', { alpha: 0.35, layers: 6 });
  inkLine(x, [[1570, 720], [2010, 720]], 14); inkBox(x, 1600, 745, 1790, 985, 5, { alpha: 0.7 }); inkBox(x, 1800, 745, 1985, 985, 5, { alpha: 0.7 });
  inkBox(x, 1600, 240, 1990, 470, 6, { alpha: 0.8 }); inkLine(x, [[1795, 240], [1795, 470]], 5, { alpha: 0.8 });
  // dish rack
  for (let i = 0; i < 5; i++) inkLine(x, [[1880 + i * 18, 715], [1872 + i * 18, 650 - (i % 2) * 10]], 5, { alpha: 0.85 });
  // radio body (dial drawn live)
  const [rx, ry] = KIT.radio;
  x.fillStyle = '#231a14'; x.fillRect(rx - 80, ry - 55, 160, 110); inkBox(x, rx - 80, ry - 55, rx + 80, ry + 52, 7);
  for (let i = 0; i < 6; i++) inkLine(x, [[rx - 66, ry - 38 + i * 13], [rx - 8, ry - 38 + i * 13]], 3, { alpha: 0.7, k: 2 });
  inkLine(x, [[rx + 40, ry - 55], [rx + 90, ry - 130]], 3);
  // fridge
  const [fx0, fy0, fx1, fy1] = KIT.fridge;
  washRect(x, fx0, fy0, fx1, fy1, '#d9ccb2', { alpha: 0.35, layers: 10 });
  inkBox(x, fx0, fy0, fx1, fy1, 10); inkLine(x, [[fx0, 420], [fx1, 420]], 6); inkLine(x, [[fx0 + 26, 250], [fx0 + 26, 370]], 10); inkLine(x, [[fx0 + 26, 480], [fx0 + 26, 640]], 10);
  grit(x, w, h, 16);
  AS.kitchen = c;
}

/* ---------- letters written in crayon (paper coords, name block) ---------- */
function circlePts(cx, cy, rx, ry, a0 = -Math.PI / 2, n = 24) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * TAU * 0.97; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
const LETTERS = {
  R: [[[0, 60], [0, 0]], [[0, 0], [26, 2], [32, 16], [26, 30], [2, 32]], [[10, 30], [34, 62]]],
  O: [circlePts(20, 30, 20, 30)],
  S_BACK: [(() => { const p = []; for (let a = 200; a <= 450; a += 18) p.push([16 + Math.cos(a * Math.PI / 180) * 14, 16 + Math.sin(a * Math.PI / 180) * 15]); for (let a = 270; a >= 20; a -= 18) p.push([16 + Math.cos(a * Math.PI / 180) * 15, 47 + Math.sin(a * Math.PI / 180) * 15]); return p; })()],
  I: [[[10, 0], [10, 62]], [[0, 0], [20, 0]], [[0, 62], [20, 62]]],
  E: [[[0, 0], [0, 62]], [[0, 0], [30, 0]], [[0, 30], [24, 30]], [[0, 62], [32, 62]]],
  U: [[[0, 0], [0, 44], [14, 62], [28, 44], [28, 0]]],
  T: [[[16, 0], [16, 62]], [[0, 0], [32, 0]]],
  H: [[[0, 0], [0, 62]], [[28, 0], [28, 62]], [[0, 32], [28, 32]]],
};
const LETTER_W = { R: 42, O: 48, S_BACK: 40, I: 28, E: 40, U: 36, T: 40, H: 36 };
// flatten a word into strokes in local units (letter height 62). returns [{pts, len}]
function wordStrokes(word) {
  let x0 = 0; const out = [];
  for (const ch of word) {
    const L = LETTERS[ch]; for (const s of L) out.push({ pts: s.map(([a, b]) => [a + x0, b]) });
    x0 += LETTER_W[ch];
  }
  for (const s of out) { let l = 0; for (let i = 1; i < s.pts.length; i++) l += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); s.len = l; }
  out.width = x0; return out;
}
// draw a word written with a crayon/pen up to progress p (0..1). returns tip position
function drawWord(ctx, strokes, x, y, s, p, o = {}) {
  const total = strokes.reduce((a, b) => a + b.len, 0); let rem = p * total, tip = null;
  ctx.save(); ctx.strokeStyle = o.color ?? '#b8452c';
  for (const st of strokes) {
    if (rem <= 0) break;
    const frac_ = Math.min(1, rem / st.len); rem -= st.len;
    const pts = st.pts.map(([a, b]) => [x + a * s, y + b * s]);
    brushDry(ctx, pts, { w: (o.w ?? 5) * s, k: o.k ?? 5, dry: o.dry ?? 0.45, seed: o.seed ?? 3, t: frac_, smooth: pts.length > 2 });
    // tip
    const P = resample(pts.length > 2 ? catmull(pts, 5) : pts, 2); tip = P[Math.min(P.length - 1, Math.floor((P.length - 1) * frac_))];
  }
  ctx.restore();
  return tip;
}

function buildHouse() {
  /* ---------- house at night (exterior), 2400x1350 ---------- */
  const w = 2400, h = 1350, c = makeCanvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0706'); g.addColorStop(0.7, '#19120e'); g.addColorStop(1, '#221811'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const r = rng(21); x.fillStyle = PAL.bone; for (let i = 0; i < 260; i++) { x.globalAlpha = 0.2 + r() * 0.6; x.beginPath(); x.arc(r() * w, r() * 700, 0.6 + r() * r() * 2, 0, TAU); x.fill(); } x.globalAlpha = 1;
  // hills + power line
  x.fillStyle = '#0f0b09'; x.beginPath(); x.moveTo(0, 900); for (let i = 0; i <= 30; i++) x.lineTo((i / 30) * w, 880 + noise1(i * 0.4) * 50); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill();
  inkLine(x, [[0, 600], [700, 640], [1400, 610], [2400, 650]], 2, { alpha: 0.6, k: 2 });
  for (const px of [300, 1500]) inkLine(x, [[px, 590], [px + 10, 950]], 8);
  // the house
  x.fillStyle = '#0c0907';
  x.beginPath(); x.moveTo(900, 1000); x.lineTo(900, 640); x.lineTo(1250, 430); x.lineTo(1600, 640); x.lineTo(1600, 1000); x.closePath(); x.fill();
  x.fillRect(1400, 430, 60, 150);
  inkLine(x, [[870, 650], [1250, 420], [1630, 650]], 12);
  // windows: kitchen lit (left), others dark
  AS.houseWin = [1000, 720, 1160, 850];
  x.fillStyle = '#16100c'; x.fillRect(1340, 720, 150, 130); x.fillRect(1180, 520, 140, 110);
  inkBox(x, 1340, 720, 1490, 850, 6); inkBox(x, 1180, 520, 1320, 630, 6);
  // yard
  x.fillStyle = '#100c09'; x.fillRect(0, 1000, w, h - 1000);
  for (let i = 0; i < 400; i++) { const gx = r() * w, gy = 1000 + r() * 350; inkLine(x, [[gx, gy], [gx + (r() - 0.5) * 8, gy - 10 - r() * 18]], 2, { alpha: 0.5, k: 1 }); }
  inkLine(x, [[0, 1000], [w, 1000]], 6);
  // fence
  for (let i = 0; i < 26; i++) inkLine(x, [[40 + i * 90, 1060], [44 + i * 90, 960]], 7, { alpha: 0.9 });
  inkLine(x, [[20, 985], [2380, 990]], 6); inkLine(x, [[20, 1030], [2380, 1036]], 6);
  AS.house = c;
}

const CARRY = { lsh: 0.72, lel: 1.4, rsh: 0.62, rel: 1.5 };
const CRADLE = { lsh: 0.3, lel: 1.3, rsh: 0.52, rel: 1.08 };
function personFig(x, y, h, face = 1, kid = false) { return { x, y, h, face, prop: kid ? PROPS.child : PROPS.adult }; }
const tk = (t) => Math.floor(t * 8);
const emberAt = (J, f, dy = -14) => [J.hands[0] + f * 6, J.hands[1] + dy];
const HEAD_IN_HANDS = Object.assign({}, SIT, { lsh: 1.25, lel: 1.75, rsh: 1.35, rel: 1.7, lean: 0.5, head: 0.45 });
const PARENT_SIT_X = 870;

function setCam(ctx, img, cam, bg = '#0b0806') {
  fillScreen(ctx, bg); camSet(ctx, cam.x, cam.y, cam.z); ctx.drawImage(img, 0, 0);
}
function lampLight(cam, on = 1, t = 0) {
  const L = w2s(cam, KIT.lamp[0], KIT.lamp[1] + 60);
  const fl = 0.96 + 0.04 * noise1(t * 9);
  return { x: L[0], y: L[1] + 120 * cam.z, r: 1250 * cam.z * fl, a: on, warm: 0.9 * on };
}
// paper coords (drawing) -> kitchen world
function artPt(px, py) { const [cx, cy] = KIT.drawing, a = -0.035, x = (px - 200) * 0.6, y = (py - 160) * 0.6; return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]; }
// place a hand so that its middle fingertip lands on target
function handForTip(tx, ty, s, rot, fold = 0) {
  const q = fingerTips({ fold })[1], ux = q.bx + Math.sin(q.ang) * q.len, uy = q.by - Math.cos(q.ang) * q.len;
  const p = handPt(ux, uy, 0, 0, s, rot); return [tx - p[0], ty - p[1]];
}

function drawRadioLive(ctx, t, on) {
  const [rx, ry] = KIT.radio;
  ctx.save();
  ctx.fillStyle = on > 0 ? `rgba(240,190,110,${0.35 + 0.6 * on})` : '#2a211a';
  ctx.beginPath(); ctx.arc(rx + 40, ry, 22, 0, TAU); ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx + 40, ry, 22, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + 40, ry); ctx.lineTo(rx + 40 + Math.cos(-2.2 + on * 0.1) * 18, ry + Math.sin(-2.2) * 18); ctx.stroke();
  if (on > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    sprite(ctx, SPR.glow, rx + 40, ry, 90, on * 0.55);
    ctx.strokeStyle = `rgba(255,214,150,${0.35 * on})`; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const k = frac(t * 0.7 + i / 4); ctx.globalAlpha = (1 - k); ctx.beginPath(); ctx.arc(rx - 37, ry - 5, 30 + k * 160, -2.4, -0.7); ctx.stroke(); }
  }
  ctx.restore();
}
