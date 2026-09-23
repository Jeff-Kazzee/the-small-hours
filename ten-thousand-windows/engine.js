/* Ten Thousand Windows paint engine.
   Noise, washes, and brushes come from the Finite Time engine (2026-09-22).
   New here: watercolor pigment patterns, boiling ink outlines, paper grain,
   a low-res light mask, a camera, and the shot registry.
   Every draw is a pure function of time so the player can cut anywhere. */
'use strict';
const W = 1920, H = 1080;
let RS = 1; // render scale: device pixels per logical pixel, set by the player

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
};
// 0 before a, ramps to 1 over fin, holds, ramps back to 0 over fout ending at b
function win(t, a, b, fin = 0.4, fout = 0.4) { if (t < a || t > b) return 0; return Math.min(smooth(a, a + fin, t), 1 - smooth(b - fout, b, t)); }
// eased 0..1 over [a, a+d]
const settle = (t, a, d) => ease.inOut(clamp((t - a) / d));

function rng(seed) {
  let a = (seed * 9301 + 49297) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
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

/* hand-drawn lines redraw eight times a second, like a pencil test */
let BOIL_ON = true;
const boil = (t) => (BOIL_ON ? Math.floor(t * 8) : 0);

/* ---------- palette ---------- */
const PAL = {
  ink: '#2b211c', inkSoft: '#4a3a31', paper: '#f2e6cc', paperD: '#e2d2b0', bone: '#efe4cf',
  ochre: '#d99a3d', rust: '#b5552f', brick: '#a0523c', rose: '#d98a7a', blush: '#e89a86',
  sage: '#8fa878', moss: '#5d7a52', leaf: '#7fa05a', olive: '#8c8a4a',
  sky: '#a9c6c4', dusk: '#e3a676', night: '#1f2e35', nightD: '#141d22', slate: '#4b5a5e', teal: '#3f6b68',
  sand: '#e2c78f', wood: '#8a5a3b', woodL: '#b0784c', woodD: '#5e3b27', cream: '#f6ecd6',
  lamp: '#ffd98a', ember: '#f2a444', hot: '#fff1c9', frost: '#9fd3cb', frostD: '#3d6b66',
  mustard: '#e3b23c', plum: '#7a3b3b', gray: '#8f8c84', grayD: '#5c5a55', steel: '#6d7a80',
};
function mix(c1, c2, t) {
  const a = hexRGB(c1), b = hexRGB(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
const RGB_CACHE = {};
function hexRGB(c) {
  if (RGB_CACHE[c]) return RGB_CACHE[c];
  let r;
  if (c[0] === '#') { const n = parseInt(c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1), 16); r = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  else { const m = c.match(/[\d.]+/g).map(Number); r = [m[0], m[1], m[2]]; }
  return (RGB_CACHE[c] = r);
}
const rgba = (c, a) => { const [r, g, b] = hexRGB(c); return `rgba(${r},${g},${b},${a})`; };

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/* ---------- geometry ---------- */
function catmull(pts, seg = 6, closed = false) {
  const n = pts.length; if (n < 3) return pts.slice();
  const out = [], last = closed ? n : n - 1;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
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
const circlePts = (cx, cy, rx, ry = rx, n = 28, rot = 0) => { const p = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function rrectPts(x, y, w, h, r, n = 5) {
  const p = [], c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
// wobble every point by smooth noise. seed changes on each boil frame.
function wobble(pts, amp, seed) { if (!amp) return pts; return pts.map(([x, y], i) => [x + noise1(i * 0.37 + seed * 7.13) * amp, y + noise1(i * 0.37 + seed * 7.13 + 91.7) * amp]); }
function blobPoly(cx, cy, rx, ry, n, r, jit = 0.25) {
  const pts = []; const rot = r() * TAU;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rot, k = 1 + (r() - 0.5) * 2 * jit; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
function tracePath(ctx, p, close = true) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (close) ctx.closePath(); }
function fillPts(ctx, p) { ctx.beginPath(); tracePath(ctx, p); ctx.fill(); }

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
// o: {seed, v (edge wildness), layers, alpha, depth, baseDepth, edge, edgeW}
function wash(ctx, poly, color, o = {}) {
  const r = rng(o.seed || 7);
  const v = o.v ?? 0.7;
  const base = deformPoly(poly.map((q) => ({ x: q[0], y: q[1], v: v * (0.4 + r() * 1.1) })), o.baseDepth ?? 2, r);
  ctx.save(); ctx.fillStyle = color;
  const layers = o.layers ?? 18;
  for (let l = 0; l < layers; l++) {
    const p = deformPoly(base, o.depth ?? 3, r);
    ctx.globalAlpha = (o.alpha ?? 0.05) * (0.7 + r() * 0.6);
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); ctx.fill();
  }
  if (o.edge) {
    const p = deformPoly(base, 2, r); ctx.globalAlpha = o.edge; ctx.strokeStyle = color; ctx.lineWidth = o.edgeW || 1.5;
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- pigment: a mottled watercolor tile used as a fill pattern ---------- */
const PIGMENTS = {};
function pigment(ctx, color, o = {}) {
  const key = color + '|' + (o.grain ?? 1) + '|' + (o.mottle ?? 1);
  let pat = PIGMENTS[key];
  if (!pat) {
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), r = rng(hexRGB(color).reduce((a, b) => a * 7 + b, 3));
    x.fillStyle = color; x.fillRect(0, 0, S, S);
    const light = mix(color, '#fff8e8', 0.28), dark = mix(color, PAL.ink, 0.22);
    const blobs = Math.round(34 * (o.mottle ?? 1));
    for (let i = 0; i < blobs; i++) {
      const cx = r() * S, cy = r() * S, rad = 20 + r() * 70, col = r() < 0.5 ? light : dark;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const g = x.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, rad);
        g.addColorStop(0, rgba(col, 0.16 + r() * 0.1)); g.addColorStop(1, rgba(col, 0));
        x.fillStyle = g; x.fillRect(cx + dx - rad, cy + dy - rad, rad * 2, rad * 2);
      }
    }
    const dots = Math.round(2600 * (o.grain ?? 1));
    for (let i = 0; i < dots; i++) { x.fillStyle = rgba(dark, 0.05 + r() * 0.12); const s = 0.6 + r() * 1.6; x.fillRect(r() * S, r() * S, s, s); }
    pat = PIGMENTS[key] = x.createPattern(c, 'repeat');
  }
  return pat;
}
// fill a shape with pigment and pool darker paint at its edge, the way a wash dries
function paint(ctx, pts, color, o = {}) {
  ctx.save();
  const path = new Path2D(); path.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]); path.closePath();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = o.flat ? color : pigment(ctx, color, o); ctx.fill(path);
  if (o.pool !== 0) {
    ctx.clip(path);
    ctx.strokeStyle = mix(color, PAL.ink, 0.35); ctx.lineJoin = 'round';
    ctx.globalAlpha = (o.alpha ?? 1) * 0.13 * (o.pool ?? 1); ctx.lineWidth = o.poolW ?? 9; ctx.stroke(path);
    ctx.globalAlpha = (o.alpha ?? 1) * 0.28 * (o.pool ?? 1); ctx.lineWidth = 2.6; ctx.stroke(path);
  }
  if (o.shade) { // o.shade = {dx, dy, a}: a darker wash offset toward the shadow side
    ctx.clip(path); ctx.globalAlpha = (o.alpha ?? 1) * (o.shade.a ?? 0.25); ctx.fillStyle = mix(color, PAL.ink, 0.45);
    ctx.translate(o.shade.dx, o.shade.dy); ctx.fill(path);
  }
  ctx.restore();
  return path;
}

/* ---------- ink ---------- */
// tapered solid brush along pts. o: {w, t (0..1 drawn), seed, t0, t1, wobble, jit, smooth, step}
function brush(ctx, pts, o = {}) {
  const w = o.w ?? 8, seed = o.seed ?? 0, prog = o.t ?? 1;
  if (prog <= 0 || pts.length < 2) return;
  let P = o.smooth === false ? pts : catmull(pts, 5);
  P = resample(P, o.step ?? 3);
  const n = Math.max(2, Math.round(P.length * prog));
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
// dry bristle brush for set dressing. o: {w, k, dry, alpha, seed, t}
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
// ink outline around a closed shape, broken into a few strokes like a real pen line
// extra points along long edges so a spline through them stays on the edge instead of bulging
function densify(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}
function inkLoop(ctx, pts, o = {}) {
  const seed = o.seed ?? 0, w = o.w ?? 3.2, gaps = o.gaps ?? 2;
  const D = pts.length < 12 ? densify(pts, 30) : pts;
  const P = resample(catmull(D, pts.length < 12 ? 2 : 4, true).concat([D[0]]), 3);
  const n = P.length; if (n < 6) return;
  ctx.save(); ctx.fillStyle = o.color ?? PAL.ink; ctx.globalAlpha = o.alpha ?? 0.9;
  const start = Math.floor(hash(seed * 3.7) * n), seg = Math.floor(n / Math.max(1, gaps));
  for (let g = 0; g < Math.max(1, gaps); g++) {
    const a = start + g * seg, len = seg - (gaps > 1 ? Math.max(1, Math.round(seg * (0.04 + 0.08 * hash(seed + g)))) : 0) + (gaps > 1 ? 0 : 1);
    const part = []; for (let i = 0; i < len; i++) part.push(P[(a + i) % n]);
    if (part.length > 2) brush(ctx, part, { w, seed: seed + g * 7, t0: 0.08, t1: 0.12, wobble: 0.35, smooth: false, step: 2.5 });
  }
  ctx.restore();
}
// an ink line (open), with a quick pen taper
function inkLine(ctx, pts, o = {}) {
  ctx.save(); ctx.fillStyle = o.color ?? PAL.ink; ctx.globalAlpha = o.alpha ?? 0.9;
  brush(ctx, pts, { w: o.w ?? 3, seed: o.seed ?? 0, t0: o.t0 ?? 0.1, t1: o.t1 ?? 0.2, wobble: 0.3, t: o.t ?? 1, jit: o.jit ?? 0 });
  ctx.restore();
}
// a fully inked, painted shape: pigment fill + edge pooling + boiling outline
function shape(ctx, pts, color, o = {}) {
  const seed = o.seed ?? 1, amp = o.boilAmp ?? 1.1, b = o.b ?? 0;
  const P = amp ? wobble(pts, amp, seed + b) : pts;
  const path = paint(ctx, P, color, o);
  if (o.ink !== false) inkLoop(ctx, P, { w: o.inkW ?? 3.2, seed: seed + b * 13, gaps: o.gaps ?? 2, alpha: o.inkA ?? 0.88, color: o.inkColor });
  return path;
}
// a limb or cord: an inked tube of paint along pts
function tube(ctx, pts, w, color, o = {}) {
  const seed = o.seed ?? 3, b = o.b ?? 0;
  const P = wobble(catmull(pts, 6), o.boilAmp ?? 0.9, seed + b);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); tracePath(ctx, P, false);
  if (o.ink !== false) { ctx.strokeStyle = o.inkColor ?? PAL.ink; ctx.globalAlpha = o.inkA ?? 0.88; ctx.lineWidth = w + (o.inkW ?? 5.2); ctx.stroke(); }
  ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.flat ? color : pigment(ctx, color); ctx.lineWidth = w; ctx.stroke();
  ctx.globalAlpha = 0.18; ctx.strokeStyle = mix(color, PAL.ink, 0.4); ctx.lineWidth = w * 0.35;
  ctx.translate(w * 0.18, w * 0.12); ctx.stroke();
  ctx.restore();
}
function dot(ctx, x, y, r, color, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore(); }

/* ---------- light ---------- */
function glow(ctx, x, y, r, color, a = 1, mode = 'lighter') {
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.9)); g.addColorStop(0.35, rgba(color, 0.35)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// darken the frame except inside pools of light. lights: [{x, y, r, a}] in logical coords.
let MASK = null;
function lightMask(ctx, dark, lights, cam) {
  const mw = 240, mh = 135;
  if (!MASK) MASK = makeCanvas(mw, mh);
  const m = MASK.getContext('2d');
  m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, mw, mh);
  m.fillStyle = dark; m.fillRect(0, 0, mw, mh);
  m.globalCompositeOperation = 'destination-out';
  const k = mw / W;
  for (const L of lights) {
    const [sx, sy] = cam ? camPoint(cam, L.x, L.y) : [L.x, L.y], sr = (L.r * (cam ? cam.z : 1)) * k;
    const g = m.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, sr);
    g.addColorStop(0, `rgba(0,0,0,${L.a ?? 1})`); g.addColorStop(0.55, `rgba(0,0,0,${(L.a ?? 1) * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; m.fillRect(sx * k - sr, sy * k - sr, sr * 2, sr * 2);
  }
  ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(MASK, 0, 0, W, H); ctx.restore();
}

/* ---------- paper and grade, applied over the whole frame ---------- */
let PAPER = null;
function paperPattern(ctx) {
  if (!PAPER) {
    const S = 512, c = makeCanvas(S, S), x = c.getContext('2d'), r = rng(424242);
    const img = x.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
      const n = fbm2(i / 9, y / 9, 3) * 0.55 + fbm2(i / 2.2, y / 2.2, 2) * 0.35 + (r() - 0.5) * 0.25;
      const v = 128 + n * 90, o = (y * S + i) * 4;
      img.data[o] = v; img.data[o + 1] = v * 0.97; img.data[o + 2] = v * 0.9; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    PAPER = c;
  }
  return ctx.createPattern(PAPER, 'repeat');
}
// grade: {tint, tintA, sat (0..1, 1 keeps color), warm}
function finishFrame(ctx, o = {}) {
  ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0);
  if (o.sat != null && o.sat < 1) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 1 - o.sat; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); }
  if (o.tint) { ctx.globalCompositeOperation = o.tintMode ?? 'soft-light'; ctx.globalAlpha = o.tintA ?? 0.35; ctx.fillStyle = o.tint; ctx.fillRect(0, 0, W, H); }
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain ?? 0.34; ctx.fillStyle = paperPattern(ctx); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, `rgba(120,96,78,${o.vig ?? 0.9})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---------- camera ---------- */
// cam = {x, y, z}: the world point at frame center, and zoom. z >= 1 keeps the 1920x1080 set in frame.
function camFit(c) {
  const z = Math.max(1, c.z ?? 1), hw = W / 2 / z, hh = H / 2 / z;
  return { x: clamp(c.x ?? W / 2, hw, W - hw), y: clamp(c.y ?? H / 2, hh, H - hh), z };
}
function applyCam(ctx, cam) { const c = camFit(cam); ctx.setTransform(RS * c.z, 0, 0, RS * c.z, RS * (W / 2 - c.x * c.z), RS * (H / 2 - c.y * c.z)); return c; }
function camPoint(cam, x, y) { const c = camFit(cam); return [(x - c.x) * c.z + W / 2, (y - c.y) * c.z + H / 2]; }
// slow drift between two framings over d seconds, then hold
function drift(t, a, b, d = 14) { const k = ease.sine(clamp(t / d)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }; }

/* ---------- sets: painted once, cached, drawn under the live layer ---------- */
const SETS = {}; // name -> builder(ctx, variant) drawing in 1920x1080 logical coords
const SET_CACHE = new Map();
function defineSet(name, builder) { SETS[name] = builder; }
function getSet(name, variant = '') {
  const key = name + '|' + variant + '|' + RS.toFixed(3);
  let c = SET_CACHE.get(key);
  if (c) { SET_CACHE.delete(key); SET_CACHE.set(key, c); return c; }
  const savedRandom = Math.random; Math.random = rng(hashStr(name + variant));
  c = makeCanvas(W * RS, H * RS); const x = c.getContext('2d'); x.setTransform(RS, 0, 0, RS, 0, 0);
  try { SETS[name](x, variant); } finally { Math.random = savedRandom; }
  SET_CACHE.set(key, c);
  while (SET_CACHE.size > 7) SET_CACHE.delete(SET_CACHE.keys().next().value);
  return c;
}
function drawSet(ctx, name, variant = '', alpha = 1) {
  const c = getSet(name, variant);
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; }

/* ---------- hand-lettered text inside a painting ---------- */
function letter(ctx, text, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font ?? '600 40px Caveat, "Segoe Print", cursive';
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'alphabetic';
  ctx.fillStyle = o.color ?? PAL.ink; ctx.globalAlpha = o.alpha ?? 0.92;
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  ctx.fillText(text, x, y);
  ctx.restore();
}
// monospace screen text with an optional reveal (0..1)
function screenText(ctx, text, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font ?? '500 26px "IBM Plex Mono", ui-monospace, Consolas, monospace';
  ctx.fillStyle = o.color ?? PAL.frost; ctx.globalAlpha = o.alpha ?? 1; ctx.textBaseline = 'alphabetic';
  const n = o.reveal == null ? text.length : Math.floor(text.length * clamp(o.reveal));
  ctx.fillText(text.slice(0, n), x, y);
  if (o.cursor && Math.floor((o.t ?? 0) * 2) % 2 === 0) { const wdt = ctx.measureText(text.slice(0, n)).width; ctx.fillRect(x + wdt + 4, y - 22, 13, 26); }
  ctx.restore();
}
// wrap text into lines that fit maxW
function wrapText(ctx, text, maxW, font) {
  ctx.save(); if (font) ctx.font = font;
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); ctx.restore(); return lines;
}

/* ---------- shots ---------- */
// def: {draw(ctx, t, st)}. st = {p (beat params), pt (time in this beat), s (world state), c (choices), year, wren (age)}
const SHOTS = {};
function shot(name, def) { SHOTS[name] = def; }
