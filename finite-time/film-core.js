/* Finite Time: timeline access, dialogue layer, paper helpers, sets. Needs engine.js and timeline.js. */
'use strict';

/* ============================================================
   TIMELINE (from timeline.js, laid out by build/tts.py)
   ============================================================ */
// Every beat in film.json has an id. Choreography is written against beat ids,
// never against clock times, so re-voicing or re-pacing a line moves the picture with it.
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const SC = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const A = (id, off = 0) => BEAT[id].t0 + off;   // beat start
const E = (id, off = 0) => BEAT[id].t1 + off;   // beat end
const T0 = A, T1 = E;
const FILM_LEN = TL.total;
const REVEAL_CPS = 28;

/* ============================================================
   PALETTE ADDITIONS
   ============================================================ */
const PAPER = {
  bone: '#ecdfc4', cream: '#f4ead3', sand: '#dcbf8e', ochre: '#c98a4b', ochreD: '#a8612f', rust: '#8e3f22',
  umber: '#6e4327', umberD: '#4a2b18', soot: '#2a1b12', ember: '#e2913a', white: '#f8f1e2', river: '#4a3222', riverL: '#6a4a32',
};
const FROST = '#9fd3cb';            // the one cold color. evaluation layer only, plus two planted leaks
RGB.frost = '159,211,203';
const SERIF = '"Alegreya", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

/* ============================================================
   DIALOGUE LAYER: short lines of text, Wren left, Dad right
   ============================================================ */
const DLG = [];
(function () {
  let cur = null;
  for (const b of TL.beats) {
    if (b.type !== 't') continue;
    if (!cur) { cur = { lines: [] }; DLG.push(cur); }
    cur.lines.push(b);
    if (b.end || b.keep) {
      cur.t0 = cur.lines[0].t0;
      cur.t1 = b.keep ? SC.s7.t0 + 0.02 : b.t1 + (b.hold ?? 0.35) + 0.3;
      cur.keep = !!b.keep;
      cur = null;
    }
  }
})();
function blockAt(t) { for (const bl of DLG) if (t >= bl.t0 - 0.05 && t <= bl.t1 + 0.4) return bl; return null; }

// style: 'night' (light text on dark) or 'paper' (dark text on light)
function drawDialogue(ctx, t, style = 'night', o = {}) {
  const bl = o.block || blockAt(t); if (!bl) return;
  const outA = bl.keep && !o.block ? 1 : 1 - smooth(bl.t1, bl.t1 + 0.4, t);
  if (outA <= 0) return;
  scr(ctx); ctx.save();
  const N = bl.lines.length, size = 46, gap = 64;
  const baseY = H - 92;
  if (style === 'night') {
    const band = ctx.createLinearGradient(0, H - 150 - N * gap, 0, H);
    band.addColorStop(0, 'rgba(10,7,5,0)'); band.addColorStop(1, `rgba(10,7,5,${0.62 * outA})`);
    ctx.fillStyle = band; ctx.fillRect(0, H - 150 - N * gap, W, 150 + N * gap);
  } else {
    const band = ctx.createLinearGradient(0, H - 150 - N * gap, 0, H);
    band.addColorStop(0, 'rgba(244,234,211,0)'); band.addColorStop(1, `rgba(244,234,211,${0.72 * outA})`);
    ctx.fillStyle = band; ctx.fillRect(0, H - 150 - N * gap, W, 150 + N * gap);
  }
  ctx.textBaseline = 'alphabetic';
  let newest = -1; bl.lines.forEach((l, i) => { if (t >= l.t0) newest = i; });
  bl.lines.forEach((l, i) => {
    if (t < l.t0) return;
    const y = baseY - (N - 1 - i) * gap;
    const kid = l.who === 'w';
    ctx.font = `italic ${kid ? 500 : 500} ${size}px ${SERIF}`;
    const full = l.text, shown = l.cut ? l.cut : full;
    const cps = l.cps ?? REVEAL_CPS;
    const nChars = Math.min(shown.length, Math.floor((t - l.t0) * cps) + 1);
    const width = ctx.measureText(full).width;
    const x0 = kid ? 250 : W - 250 - width;
    const dim = i < newest ? 0.7 : 1;
    if (style === 'night') { ctx.fillStyle = kid ? '#f2b98c' : '#efe6d4'; ctx.shadowColor = 'rgba(8,5,3,0.9)'; ctx.shadowBlur = 16; }
    else { ctx.fillStyle = kid ? '#8a2f1c' : '#24160e'; ctx.shadowColor = 'rgba(248,241,226,0.95)'; ctx.shadowBlur = 14; }
    let x = x0;
    for (let c = 0; c < nChars; c++) {
      const ch = shown[c], ct = l.t0 + c / cps;
      const a = smooth(ct - 0.02, ct + 0.12, t);
      ctx.globalAlpha = a * outA * dim;
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width;
    }
  });
  ctx.restore();
}

/* ============================================================
   PAPER: hand-cut shapes with drop shadows
   ============================================================ */
// resample a closed polygon and nudge each point off the edge, like scissors
function scissor(pts, seed = 1, jit = 2.2, step = 14) {
  const out = [], r = rng(seed);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    for (let k = 0; k < n; k++) { const u = k / n, j = (r() - 0.5) * 2 * jit; out.push([lerp(a[0], b[0], u) + nx * j, lerp(a[1], b[1], u) + ny * j]); }
  }
  return out;
}
// pre-render use: soft shadow via shadowBlur
function paperShape(x, pts, col, o = {}) {
  x.save();
  if (o.shadow !== false) { x.shadowColor = o.shColor ?? 'rgba(52,28,12,0.42)'; x.shadowBlur = o.blur ?? 12; x.shadowOffsetX = o.sx ?? 4; x.shadowOffsetY = o.sy ?? 7; }
  x.fillStyle = col; fillPts(x, pts);
  x.restore();
  if (o.edge) { x.save(); x.strokeStyle = o.edge; x.globalAlpha = o.edgeA ?? 0.35; x.lineWidth = o.edgeW ?? 1.5; x.beginPath(); pathPts(x, pts); x.stroke(); x.restore(); }
}
// live use: hard offset shadow, no blur
function paperLive(ctx, pts, col, o = {}) {
  if (o.shadow !== false) { ctx.save(); ctx.fillStyle = o.shColor ?? 'rgba(52,28,12,0.32)'; ctx.translate(o.sx ?? 4, o.sy ?? 6); fillPts(ctx, pts); ctx.restore(); }
  ctx.fillStyle = col; fillPts(ctx, pts);
}
function rectPts(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
function ellipsePts(cx, cy, rx, ry, n = 22, a0 = 0) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
function xf(pts, x, y, s = 1, rot = 0) { const c = Math.cos(rot), sn = Math.sin(rot); return pts.map(([a, b]) => [x + (a * c - b * sn) * s, y + (a * sn + b * c) * s]); }
const q12 = (t) => Math.floor(t * 12) / 12; // stop-motion clock for paper puppets

// tiny paper person. o: {col, walk (phase), yoke, shovel (0..1 dig phase), arm (angle from down), face, pole}
function paperPerson(ctx, x, y, h, o = {}) {
  const f = o.face ?? 1, col = o.col ?? PAPER.soot, ph = o.walk ?? 0, sw = Math.sin(ph * TAU) * 0.35 * (o.walk != null ? 1 : 0);
  const body = [[-0.13, -0.78], [0.13, -0.78], [0.17, -0.34], [-0.17, -0.34]].map(([a, b]) => [x + a * h * f, y + b * h]);
  const draw = (c, dx, dy) => {
    c.save(); c.translate(dx, dy); c.fillStyle = c === ctx && dx ? 'rgba(52,28,12,0.3)' : col; c.strokeStyle = c.fillStyle;
    c.lineCap = 'round'; c.lineWidth = h * 0.09;
    c.beginPath(); c.moveTo(x - h * 0.06, y - h * 0.36); c.lineTo(x - h * 0.06 + Math.sin(sw) * h * 0.3, y); c.stroke();
    c.beginPath(); c.moveTo(x + h * 0.06, y - h * 0.36); c.lineTo(x + h * 0.06 - Math.sin(sw) * h * 0.3, y); c.stroke();
    fillPts(c, body);
    c.beginPath(); c.arc(x + f * h * 0.02, y - h * 0.9, h * 0.12, 0, TAU); c.fill();
    if (o.arm != null) { c.lineWidth = h * 0.07; c.beginPath(); c.moveTo(x, y - h * 0.72); c.lineTo(x + f * Math.sin(o.arm) * h * 0.42, y - h * 0.72 + Math.cos(o.arm) * h * 0.42); c.stroke(); }
    if (o.yoke) {
      c.lineWidth = h * 0.04; c.beginPath(); c.moveTo(x - h * 0.42, y - h * 0.8); c.lineTo(x + h * 0.42, y - h * 0.8); c.stroke();
      for (const s of [-1, 1]) { const bx = x + s * h * 0.4; c.lineWidth = h * 0.02; c.beginPath(); c.moveTo(bx, y - h * 0.8); c.lineTo(bx, y - h * 0.5); c.stroke(); c.fillRect(bx - h * 0.09, y - h * 0.5, h * 0.18, h * 0.17); }
    }
    if (o.shovel != null) {
      const a = -0.6 + Math.sin(o.shovel * TAU) * 0.5, L = h * 0.75;
      const hx = x + f * h * 0.1, hy = y - h * 0.6, ex = hx + f * Math.sin(a + 1.9) * L, ey = hy + Math.cos(a + 1.9) * -L * -1;
      c.lineWidth = h * 0.045; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
      c.beginPath(); c.ellipse(ex, ey, h * 0.08, h * 0.05, a, 0, TAU); c.fill();
    }
    if (o.pole) { c.lineWidth = h * 0.04; c.beginPath(); c.moveTo(x + f * h * 0.25, y - h * 1.15); c.lineTo(x - f * h * 0.35 + o.pole * h * 0.2, y + h * 0.55); c.stroke(); }
    c.restore();
  };
  if (o.shadow !== false) draw(ctx, h * 0.05, h * 0.06);
  draw(ctx, 0, 0);
}

/* ============================================================
   SETS
   ============================================================ */
const BR = { floor: 860, stand: [80, 250, 735], lamp: [165, 592], clock: [222, 712], shelf: [60, 440, 400], cam: [330, 372], led: [352, 360], bed: [270, 1205, 725], pillow: [400, 700], win: [1460, 170, 1770, 560], dadX: 840, head: [398, 684] };

function buildBedroom() {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#3a2e27'; x.fillRect(0, 0, W, H);
  tone(x, W, 860, '#4a3d33', 31, 14); tone(x, W, 860, '#2d241e', 32, 10);
  x.fillStyle = '#231b16'; x.fillRect(0, BR.floor, W, H - BR.floor);
  for (let i = 0; i < 5; i++) inkLine(x, [[0, BR.floor + 24 + i * 40 + i * i * 5], [W, BR.floor + 24 + i * 40 + i * i * 5]], 2, { alpha: 0.3, k: 3 });
  inkLine(x, [[0, BR.floor], [W, BR.floor]], 8);
  // window, night
  const [wx0, wy0, wx1, wy1] = BR.win;
  washRect(x, wx0, wy0, wx1, wy1, '#100c0a', { alpha: 0.75, layers: 6 });
  const r = rng(44); x.fillStyle = '#e8b06a';
  for (let i = 0; i < 5; i++) { x.globalAlpha = 0.4 + r() * 0.4; x.fillRect(wx0 + 30 + r() * 250, wy0 + 250 + r() * 100, 5 + r() * 5, 4 + r() * 4); }
  x.globalAlpha = 1;
  inkBox(x, wx0, wy0, wx1, wy1, 12); inkLine(x, [[(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1]], 8); inkLine(x, [[wx0, (wy0 + wy1) / 2], [wx1, (wy0 + wy1) / 2]], 8);
  washRect(x, wx0 - 70, wy0 - 30, wx0 + 30, wy1 + 100, '#7a4b3a', { alpha: 0.24, layers: 8 }); washRect(x, wx1 - 30, wy0 - 30, wx1 + 70, wy1 + 100, '#7a4b3a', { alpha: 0.24, layers: 8 });
  // kid drawings pinned to the wall
  for (const [px, py, rot, seed] of [[640, 250, -0.06, 1], [805, 300, 0.05, 2], [985, 238, -0.03, 3]]) {
    x.save(); x.translate(px, py); x.rotate(rot);
    x.fillStyle = '#e6dcc6'; x.globalAlpha = 0.85; x.fillRect(-60, -45, 120, 90); x.globalAlpha = 1;
    const rr = rng(seed);
    for (let k = 0; k < 4; k++) { x.strokeStyle = ['#b8452c', '#3f5a86', '#e0a23a', '#5f8a64'][k]; brushDry(x, [[-45 + rr() * 20, -30 + rr() * 50], [rr() * 40 - 10, -20 + rr() * 50], [20 + rr() * 25, -25 + rr() * 55]], { w: 4, k: 3, dry: 0.5, seed: seed * 10 + k }); }
    x.fillStyle = 'rgba(230,220,190,0.6)'; x.fillRect(-14, -52, 28, 12); x.restore();
  }
  // shelf, books, the camera body (its light is drawn live)
  const [sx0, sx1, sy] = BR.shelf;
  for (let i = 0; i < 5; i++) { const bx = sx0 + 40 + i * 26, bh = 70 + (i % 2) * 14; x.fillStyle = ['#6b4a3a', '#4a3a30', '#7a5a40', '#5a4636', '#3d2e25'][i]; x.fillRect(bx, sy - bh, 22, bh); inkBox(x, bx, sy - bh, bx + 22, sy, 3, { alpha: 0.7 }); }
  inkLine(x, [[sx0, sy], [sx1, sy]], 12); inkLine(x, [[sx0 + 30, sy], [sx0 + 30, sy + 40]], 6); inkLine(x, [[sx1 - 30, sy], [sx1 - 30, sy + 40]], 6);
  const [cx, cy] = BR.cam;
  x.fillStyle = '#14100d'; x.beginPath(); x.roundRect(cx - 40, cy - 26, 80, 50, 12); x.fill();
  inkLine(x, [[cx, cy + 24], [cx, sy]], 8);
  x.fillStyle = '#2a2420'; x.beginPath(); x.arc(cx - 6, cy, 16, 0, TAU); x.fill();
  x.fillStyle = '#060504'; x.beginPath(); x.arc(cx - 6, cy, 9, 0, TAU); x.fill();
  x.fillStyle = 'rgba(235,224,203,0.35)'; x.beginPath(); x.arc(cx - 10, cy - 4, 3, 0, TAU); x.fill();
  // nightstand, lamp body, alarm clock
  const [nx0, nx1, ny] = BR.stand;
  washRect(x, nx0, ny, nx1, BR.floor, '#2a201a', { alpha: 0.6, layers: 6 }); inkBox(x, nx0, ny, nx1, BR.floor, 7); inkLine(x, [[nx0, ny + 50], [nx1, ny + 50]], 4); x.fillStyle = PAL.ink; x.beginPath(); x.arc((nx0 + nx1) / 2, ny + 25, 6, 0, TAU); x.fill();
  const [lx, ly] = BR.lamp;
  inkLine(x, [[lx, ny], [lx, ly + 30]], 6); x.fillStyle = PAL.ink; x.beginPath(); x.ellipse(lx, ny - 4, 34, 9, 0, 0, TAU); x.fill();
  wash(x, [[lx - 38, ly - 34], [lx + 38, ly - 34], [lx + 58, ly + 32], [lx - 58, ly + 32]], '#c9a06a', { layers: 10, alpha: 0.12, v: 0.2 });
  inkLine(x, [[lx - 38, ly - 34], [lx + 38, ly - 34], [lx + 58, ly + 32], [lx - 58, ly + 32], [lx - 38, ly - 34]], 5);
  drawClockFace(x, BR.clock[0], BR.clock[1], 21, { legs: true });
  // bed
  const [bx0, bx1, by] = BR.bed;
  washRect(x, bx0, by, bx1, by + 62, '#4a3a30', { alpha: 0.4, layers: 6 });
  washRect(x, bx0 + 10, by - 16, bx1 - 5, by + 6, '#d9ccb2', { alpha: 0.25, layers: 6 });
  inkLine(x, [[bx0 - 6, by + 64], [bx1 + 6, by + 64]], 10);
  inkLine(x, [[bx0, 540], [bx0 + 2, BR.floor + 4]], 15); inkLine(x, [[bx0 - 30, 560], [bx0 + 10, 548]], 10);
  inkLine(x, [[bx1, 650], [bx1 + 2, BR.floor + 4]], 13);
  for (const lg of [bx0 + 40, bx1 - 40]) inkLine(x, [[lg, by + 64], [lg + 2, BR.floor]], 9);
  x.fillStyle = PAL.bone; x.globalAlpha = 0.75; x.beginPath(); x.ellipse(BR.pillow[0], BR.pillow[1], 96, 32, -0.05, 0, TAU); x.fill(); x.globalAlpha = 1;
  // quilt over the sleeping shape
  const quilt = [[455, 694], [560, 678], [700, 686], [860, 700], [1040, 704], [1204, 712], [1204, 776], [455, 776]];
  wash(x, quilt, '#8a5a3c', { layers: 14, alpha: 0.1, v: 0.18 });
  x.fillStyle = 'rgba(138,90,60,0.55)'; fillPts(x, quilt);
  for (let i = 0; i < 6; i++) inkLine(x, [[520 + i * 118, 690 + i * 3], [540 + i * 118, 772]], 2, { alpha: 0.35, k: 2 });
  inkLine(x, quilt.slice(0, 6), 5, { alpha: 0.8 });
  grit(x, W, H, 14);
  AS.bedroom = c;
}
function drawClockFace(x, cx, cy, r, o = {}) {
  x.save();
  x.fillStyle = o.face ?? PAL.bone; x.globalAlpha = o.alpha ?? 0.85; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.globalAlpha = 1;
  x.strokeStyle = o.ink ?? PAL.ink; x.lineCap = 'round';
  x.lineWidth = Math.max(2, r * 0.14); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke();
  x.lineWidth = Math.max(1.5, r * 0.1); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy - r * 0.72); x.stroke();
  x.lineWidth = Math.max(2, r * 0.14); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + r * 0.52, cy); x.stroke();
  if (o.legs) { x.lineWidth = Math.max(2, r * 0.14); x.beginPath(); x.moveTo(cx - r * 0.6, cy + r * 0.8); x.lineTo(cx - r * 0.8, cy + r * 1.15); x.moveTo(cx + r * 0.6, cy + r * 0.8); x.lineTo(cx + r * 0.8, cy + r * 1.15); x.stroke(); }
  x.restore();
}

/* ---------- the fridge drawing: Dad, Wren, and Mom inside a screen ---------- */
Object.assign(LETTERS, {
  W: [[[0, 0], [11, 62], [21, 22], [31, 62], [42, 0]]],
  N_BACK: [[[32, 62], [32, 0], [0, 62], [0, 0]]],
});
Object.assign(LETTER_W, { W: 52, N_BACK: 42 });
const WREN = wordStrokes(['W', 'R', 'E', 'N_BACK']);
function drawWrenDrawing(k) {
  k.save();
  k.fillStyle = '#efe7d6'; k.fillRect(0, 0, 400, 320);
  const r = rng(8); k.fillStyle = 'rgba(120,100,80,0.08)'; for (let i = 0; i < 300; i++) k.fillRect(r() * 400, r() * 320, 2, 2);
  const cr = (col, pts, w = 5, seed = 1) => { k.strokeStyle = col; brushDry(k, pts, { w, k: 4, dry: 0.5, seed }); };
  cr('#e0a23a', circlePts(48, 48, 22, 22), 6, 2); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; cr('#e0a23a', [[48 + Math.cos(a) * 30, 48 + Math.sin(a) * 30], [48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44]], 4, 3 + i); }
  cr('#5f8a64', [[10, 208], [120, 203], [230, 210], [390, 204]], 6, 4);
  const fig = (x, top, hgt, col, seed, hair) => {
    cr(col, circlePts(x, top + hgt * 0.13, hgt * 0.13, hgt * 0.13), 4, seed);
    cr(col, [[x, top + hgt * 0.26], [x, top + hgt * 0.62]], 4, seed + 1);
    cr(col, [[x, top + hgt * 0.62], [x - hgt * 0.12, top + hgt]], 4, seed + 2); cr(col, [[x, top + hgt * 0.62], [x + hgt * 0.12, top + hgt]], 4, seed + 3);
    cr(col, [[x - hgt * 0.25, top + hgt * 0.4], [x + hgt * 0.25, top + hgt * 0.4]], 4, seed + 4);
    if (hair) cr(hair, [[x - hgt * 0.14, top + hgt * 0.08], [x, top - hgt * 0.04], [x + hgt * 0.14, top + hgt * 0.08]], 5, seed + 5);
  };
  fig(95, 62, 140, '#3f5a86', 10);
  fig(178, 116, 90, '#b8452c', 20, '#8a5a2c');
  // Mom, inside a box on a stand: her screen
  cr('#4b4b4b', [[236, 70], [372, 66], [376, 170], [238, 174], [236, 70]], 5, 50);
  cr('#4b4b4b', [[305, 172], [305, 200]], 5, 51); cr('#4b4b4b', [[282, 202], [330, 200]], 5, 52);
  fig(305, 84, 78, '#6b4a86', 30, '#6b4a86');
  cr('#3f5a86', [[125, 118], [152, 150]], 3, 40); cr('#b8452c', [[200, 152], [232, 132]], 3, 41);
  drawWord(k, WREN, 112, 232, 1.0, 1, { w: 6, seed: 7 });
  k.restore();
}
function drawFridgeArt(ctx) {
  const [cx, cy] = KIT.drawing;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.035);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-120 + 4, -96 + 5, 240, 192);
  ctx.drawImage(AS.kidDrawing, -120, -96, 240, 192);
  ctx.fillStyle = 'rgba(230,220,190,0.55)'; ctx.fillRect(-30, -104, 60, 18);
  ctx.fillStyle = '#b8452c'; ctx.beginPath(); ctx.arc(104, 82, 9, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3f5a86'; ctx.beginPath(); ctx.arc(2080, 260, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e0a23a'; ctx.fillRect(2250, 690, 30, 22);
}

/* ---------- the fable valley, 2600x1200 ---------- */
const VAL = { w: 3000, h: 1320, riverY: 912, riverHW: 54, westHall: [330, 652], eastHall: [2270, 652], mill: [2040, 846], gate: 2400, hut: [2505, 842], well: [880, 810] };
function hillY(x, base, amp, f, seed) { return base + amp * noise1(x * f + seed); }
function midHillY(x) { return hillY(x, 700, 44, 0.0032, 7) - 40 * Math.exp(-Math.pow((x - 1350) / 420, 2)); }
function buildValley() {
  const { w, h } = VAL;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, '#efe3c9'); g.addColorStop(1, '#e2cda4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  tone(x, w, 800, '#e8d8b8', 61, 16, 0.06);
  paperShape(x, scissor(ellipsePts(1880, 250, 78, 78, 30), 3, 2.5), '#d88a3d', { blur: 10 });
  // clouds
  for (const [cx, cy, s] of [[520, 210, 1], [1250, 150, 0.8], [2250, 190, 0.9]]) paperShape(x, scissor([[cx - 150 * s, cy + 20], [cx - 90 * s, cy - 30], [cx - 10 * s, cy - 40], [cx + 70 * s, cy - 25], [cx + 150 * s, cy + 20]], cx, 2), '#f6eedc', { blur: 8, sy: 5 });
  // far hills
  const far = [[0, h]]; for (let i = 0; i <= 52; i++) { const px = (i / 52) * w; far.push([px, hillY(px, 575, 60, 0.004, 2)]); } far.push([w, h]);
  paperShape(x, scissor(far, 11, 2), '#dcbf8e', { blur: 14 });
  // guild mounds
  const mound = (cx, top, spread, seed) => { const p = [[cx - spread, h]]; for (let i = 0; i <= 30; i++) { const u = i / 30, px = cx - spread + u * spread * 2; p.push([px, top + (1 - Math.sin(u * Math.PI)) * 190 + noise1(px * 0.01 + seed) * 8]); } p.push([cx + spread, h]); return p; };
  paperShape(x, scissor(mound(330, 640, 520, 1), 12, 2), '#b8743e', { blur: 14 });
  paperShape(x, scissor(mound(2270, 640, 520, 2), 13, 2), '#b8743e', { blur: 14 });
  // mid hills with the kingdom
  const mid = [[0, h]]; for (let i = 0; i <= 60; i++) { const px = (i / 60) * w; mid.push([px, midHillY(px)]); } mid.push([w, h]);
  paperShape(x, scissor(mid, 14, 2), '#c98a4b', { blur: 14 });
  // path up from the well
  const path = []; for (let i = 0; i <= 20; i++) { const u = i / 20; path.push([lerp(VAL.well[0], 1300, u), lerp(VAL.well[1], midHillY(1300) - 8, u) + Math.sin(u * 3) * 12]); }
  x.strokeStyle = '#e7cc9e'; x.lineWidth = 16; x.lineCap = 'round'; x.globalAlpha = 0.8; x.beginPath(); pathPts(x, path, false); x.stroke(); x.globalAlpha = 1;
  // village
  const r = rng(71);
  for (let i = 0; i < 15; i++) {
    const hx = 1060 + i * 46 + r() * 20, hy = midHillY(hx) + 4 + r() * 10, hw = 34 + r() * 16, hh = 26 + r() * 14;
    paperShape(x, scissor(rectPts(hx - hw / 2, hy - hh, hx + hw / 2, hy), i, 1), '#efe3c8', { blur: 6, sx: 3, sy: 4 });
    paperShape(x, scissor([[hx - hw / 2 - 5, hy - hh], [hx, hy - hh - 22 - r() * 8], [hx + hw / 2 + 5, hy - hh]], i + 40, 1), '#8e3f22', { blur: 5, sx: 3, sy: 3 });
    x.fillStyle = PAPER.soot; x.fillRect(hx - 5, hy - hh * 0.6, 8, 9);
  }
  // valley floor
  const floor = [[0, 800]]; for (let i = 0; i <= 40; i++) { const px = (i / 40) * w; floor.push([px, 790 + noise1(px * 0.006 + 4) * 10]); } floor.push([w, h], [0, h]);
  paperShape(x, scissor(floor, 15, 2), '#9a6337', { blur: 16 });
  // the well
  paperShape(x, scissor(rectPts(VAL.well[0] - 26, VAL.well[1] - 22, VAL.well[0] + 26, VAL.well[1] + 8), 21, 1.5), '#d9c7a3', { blur: 5 });
  x.strokeStyle = PAPER.soot; x.lineWidth = 4; x.beginPath(); x.moveTo(VAL.well[0] - 22, VAL.well[1] - 22); x.lineTo(VAL.well[0] - 18, VAL.well[1] - 58); x.lineTo(VAL.well[0] + 18, VAL.well[1] - 58); x.lineTo(VAL.well[0] + 22, VAL.well[1] - 22); x.stroke();
  AS.valleyBack = c;

  // foreground bank (drawn over the river)
  const f = makeCanvas(w, h), y = f.getContext('2d');
  const bank = [[0, h]]; for (let i = 0; i <= 50; i++) { const px = (i / 50) * w; bank.push([px, 1004 + noise1(px * 0.008 + 9) * 14]); } bank.push([w, h]);
  paperShape(y, scissor(bank, 16, 2.5), '#5a3520', { blur: 16, sy: -6 });
  const r2 = rng(72);
  for (let i = 0; i < 70; i++) { const gx = r2() * w, gy = 1012 + r2() * 150, gh = 16 + r2() * 26; paperShape(y, [[gx - 6, gy], [gx + r2() * 8 - 4, gy - gh], [gx + 6, gy]], r2() < 0.5 ? '#3d2414' : '#4a2b18', { blur: 3, sx: 2, sy: 2 }); }
  for (let i = 0; i < 26; i++) { const gx = r2() * w, gy = 1000; y.strokeStyle = '#3d2414'; y.lineWidth = 3; y.beginPath(); y.moveTo(gx, gy); y.quadraticCurveTo(gx + 6, gy - 30, gx + 2 + r2() * 10, gy - 52 - r2() * 20); y.stroke(); }
  AS.valleyFront = f;
}

/* ---------- the three doors, 1920x1080 ---------- */
const DOORS = { top: 390, base: 780, w: 236, list: [{ cx: 560, col: '#b8652f' }, { cx: 960, col: '#3b261a' }, { cx: 1360, col: '#d9973f' }] };
function archPts(cx, top, base, w, n = 18) {
  const hw = w / 2, p = [[cx - hw, base]];
  p.push([cx - hw, top + hw]);
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; p.push([cx + Math.cos(a) * hw, top + hw + Math.sin(a) * hw]); }
  p.push([cx + hw, base]);
  return p;
}
function buildDoors() {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d9c29a'); g.addColorStop(1, '#c9a676'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // cliff with strata
  paperShape(x, scissor([[-20, 140], [300, 110], [700, 130], [1100, 100], [1500, 125], [1940, 105], [1940, 860], [-20, 860]], 81, 2.5), '#e8dcc2', { blur: 18 });
  const r = rng(82);
  for (let i = 0; i < 6; i++) { const yy = 200 + i * 105 + r() * 30; const band = []; for (let k = 0; k <= 24; k++) band.push([(k / 24) * 1960 - 20, yy + noise1(k * 0.7 + i * 5) * 16]); for (let k = 24; k >= 0; k--) band.push([(k / 24) * 1960 - 20, yy + 18 + r() * 10 + noise1(k * 0.6 + i * 9) * 12]); paperShape(x, scissor(band, 90 + i, 1.5), i % 2 ? '#dcc59a' : '#d4b07e', { blur: 5, sy: 3 }); }
  // door frames (the openings; interiors drawn live)
  for (const d of DOORS.list) {
    paperShape(x, scissor(archPts(d.cx, DOORS.top - 26, DOORS.base + 8, DOORS.w + 52), d.cx, 2), '#9a6337', { blur: 12 });
    x.fillStyle = '#1b120c'; fillPts(x, archPts(d.cx, DOORS.top, DOORS.base, DOORS.w));
  }
  // ground and the river reaching the cliff
  paperShape(x, scissor([[-20, 800], [700, 790], [1300, 805], [1940, 795], [1940, 1100], [-20, 1100]], 83, 2), '#9a6337', { blur: 14 });
  paperShape(x, scissor([[-20, 900], [400, 880], [800, 850], [1100, 820], [1500, 812], [1940, 816], [1940, 870], [1500, 872], [1100, 880], [800, 915], [400, 960], [-20, 990]], 84, 2), PAPER.river, { blur: 10 });
  AS.doors = c;
}

/* ---------- a dark room with one monitor (the evaluation), 1920x1080 ---------- */
const ROOM = { scr: [742, 238, 1498, 663] };
function buildRoom() {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#07090a'; x.fillRect(0, 0, W, H);
  const r = rng(91);
  for (let i = 0; i < 12; i++) wash(x, blobPoly(r() * W, r() * 700, 300 + r() * 400, 200 + r() * 200, 8, r), '#0e1213', { layers: 6, alpha: 0.12, seed: 90 + i });
  // desk
  x.fillStyle = '#0b0d0e'; x.fillRect(0, 800, W, 280); inkLine(x, [[0, 800], [W, 800]], 6, { color: '#020303' });
  // monitor frame and stand
  const [a, b, cc, d] = ROOM.scr;
  x.fillStyle = '#030404'; x.fillRect(a - 22, b - 22, cc - a + 44, d - b + 44);
  x.fillRect((a + cc) / 2 - 30, d + 22, 60, 90); x.fillRect((a + cc) / 2 - 150, d + 104, 300, 16);
  // a mug, papers, a folded paper boat by the keyboard
  x.fillStyle = '#0a0c0d'; x.fillRect(1600, 740, 70, 70); x.fillRect(1668, 755, 18, 36);
  x.fillStyle = '#121617'; x.save(); x.translate(300, 790); x.rotate(-0.04); x.fillRect(-120, -10, 240, 10); x.restore();
  x.fillStyle = '#1a2021'; fillPts(x, [[1760, 792], [1830, 792], [1818, 808], [1772, 808]]); fillPts(x, [[1790, 792], [1796, 760], [1812, 792]]);
  grit(x, W, H, 8);
  AS.room = c;
}

/* ---------- end card background ---------- */
function buildCard() {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#120d0a'; x.fillRect(0, 0, W, H);
  tone(x, W, H, '#1c1511', 101, 16, 0.08); tone(x, W, H, '#0c0907', 102, 10, 0.08);
  grit(x, W, H, 10);
  AS.card = c;
}

/* ---------- screen paper texture for the fable layer ---------- */
function buildPaperTex() {
  const s = 512, c = makeCanvas(s, s), x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, s, s);
  const id = x.getImageData(0, 0, s, s), d = id.data;
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const o = (j * s + i) * 4; const v = 128 + fbm2(i * 0.02, j * 0.02, 4) * 26 + (Math.random() - 0.5) * 18; d[o] = d[o + 1] = d[o + 2] = clamp(v, 0, 255); d[o + 3] = 255; }
  x.putImageData(id, 0, 0);
  x.strokeStyle = 'rgba(90,70,50,0.22)'; x.lineWidth = 0.8;
  for (let i = 0; i < 500; i++) { const px = Math.random() * s, py = Math.random() * s, a = Math.random() * TAU, L = 8 + Math.random() * 26; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.5) * L * 0.5, py + Math.sin(a + 0.5) * L * 0.5, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  AS.paperTex = c;
}
function paperOverlay(ctx, a = 0.5) {
  scr(ctx); ctx.save();
  if (!AS.paperPat) AS.paperPat = ctx.createPattern(AS.paperTex, 'repeat');
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a; ctx.fillStyle = AS.paperPat; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ============================================================
   ASSETS
   ============================================================ */
async function buildAssets(onProgress) {
  const steps = [
    () => { initSprites(); AS.grain = makeGrain(384); AS.vig = makeVignette(); AS.lm = makeCanvas(W / 4, H / 4); },
    () => { buildKitchen(); AS.kidDrawing = makeCanvas(800, 640); const k = AS.kidDrawing.getContext('2d'); k.scale(2, 2); drawWrenDrawing(k); },
    () => { buildBedroom(); },
    () => { buildHouse(); },
    () => { buildValley(); },
    () => { buildDoors(); },
    () => { buildRoom(); buildCard(); buildPaperTex(); },
  ];
  for (let i = 0; i < steps.length; i++) { steps[i](); onProgress && onProgress((i + 1) / steps.length); await new Promise((r) => setTimeout(r, 0)); }
}
