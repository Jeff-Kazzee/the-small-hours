/* Theo's apartment in April 2028, and The Ledger in 2031.
   The sets carry the paper. The shots carry the people, the candle, and the fear. */
'use strict';
(() => {

/* ---------- shared ---------- */
const RED = '#a8322a';
const PAPERS = ['#f6efdc', '#efe3c4', '#f3e9d2', '#e9dcc0', '#f8f1e2'];
const INKS = [PAL.inkSoft, '#3d4a5e', '#5a3a2a'];
const says = (st, name) => st.who === name || st.p.speak === name;
// dev renders carry no choices, so p.ch5 stands in for st.c.ch5
const maraSigned = (st) => (st.c && st.c.ch5 === 'sign') || st.p.ch5 === 'sign';
const inBox = (x, y, r, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
const LEDGER_GRADE = () => ({ sat: 0.7, tint: '#d98f73', tintA: 0.32, vig: 0.9 });
const WRITE = [[0.55, 0.75], [0.45, 0.8]];
const beatT = (st, t) => st.pt ?? t;
// eased path through camera keyframes [[time, {x, y, z}], ...]
function keys(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, b] = frames[i], [t0, a] = frames[i - 1];
    if (t <= t1) { const k = ease.inOut((t - t0) / (t1 - t0)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }; }
  }
  return frames[frames.length - 1][1];
}
function tape(ctx, x, y, rot, a = 0.6, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.globalAlpha = a; ctx.fillStyle = '#efe6c8'; ctx.fillRect(-13, -5, 26, 10);
  ctx.globalAlpha = a * 0.45; ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 1; ctx.strokeRect(-13, -5, 26, 10);
  ctx.restore();
}
// a line of pretend cursive. o.t reveals it left to right.
function scribble(ctx, x, y, w, o = {}) {
  const r = rng(o.seed ?? 1), sz = o.size ?? 10, end = x + w * clamp(o.t ?? 1);
  ctx.save(); ctx.strokeStyle = o.color ?? PAL.inkSoft; ctx.globalAlpha = o.alpha ?? 0.75; ctx.lineWidth = o.lw ?? 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let cx = x;
  while (cx < end) {
    const ww = Math.min(sz * (1.5 + r() * 4), end - cx), tall = r();
    ctx.beginPath();
    for (let px = 0; px <= ww; px += 1.5) {
      const ph = (px / sz) * 3.4, asc = tall > 0.6 && Math.abs(px - ww * 0.3) < sz * 0.3 ? 1.9 : 1;
      const yy = y - (0.5 - 0.5 * Math.cos(ph)) * sz * 0.7 * asc - Math.sin(ph * 0.5) * sz * 0.08;
      if (px) ctx.lineTo(cx + px, yy); else ctx.moveTo(cx + px, yy);
    }
    ctx.stroke(); cx += ww + sz * (0.8 + r() * 0.6);
  }
  ctx.restore();
}
function drop(ctx, x, y, r, a) {
  if (a <= 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#d6eef2'; ctx.strokeStyle = '#4f7a8a'; ctx.lineWidth = Math.max(1.2, r * 0.3);
  ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.bezierCurveTo(x + r * 0.6, y - r, x + r * 1.1, y, x, y + r); ctx.bezierCurveTo(x - r * 1.1, y, x - r * 0.6, y - r, x, y - r * 2);
  ctx.fill(); ctx.stroke(); ctx.restore();
}
// tears that roll from both eyes of a person() head. Matches cast.js eye placement.
function tears(ctx, head, f, t) {
  const [hx, hy, hr] = head, fd = f === 0 ? 1 : f, ex = hx + (f === 0 ? 0 : fd * hr * 0.3), ey = hy + hr * 0.08, sp = f === 0 ? hr * 0.38 : hr * 0.33;
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const ph = frac(t * 0.42 + k * 0.5 + (s > 0 ? 0.27 : 0)), eyeX = ex + s * sp * 0.5 * (f !== 0 && s === -fd ? 0.8 : 1);
    drop(ctx, eyeX + s * hr * 0.05 + s * ph * hr * 0.06, ey + hr * 0.14 + ease.in(ph) * hr * 1.1, hr * 0.1, Math.sin(Math.min(1, ph * 1.3) * Math.PI) * 0.95);
  }
}
// a small sheet without brush ink, for letters in flight and in crowds
function miniSheet(ctx, x, y, s, rot, a = 1, ink = RED) {
  if (a <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  ctx.fillStyle = '#f3e9d2'; ctx.fillRect(-11 * s, -14 * s, 22 * s, 28 * s);
  ctx.strokeStyle = PAL.ink; ctx.globalAlpha = a * 0.7; ctx.lineWidth = 1.4; ctx.strokeRect(-11 * s, -14 * s, 22 * s, 28 * s);
  ctx.fillStyle = ink; ctx.globalAlpha = a * 0.75;
  for (let k = 0; k < 3; k++) ctx.fillRect(-7 * s, (-8 + k * 6) * s, (10 + (k % 2) * 3) * s, 1.6 * s);
  ctx.restore();
}
function motes(ctx, t, x, y, rx, ry, n, c = '#fff3d0') {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = x + (frac(hash(i) + t * 0.006 * (0.5 + hash(i + 1))) - 0.5) * 2 * rx, py = y + (frac(hash(i + 7) - t * 0.008 * (0.3 + hash(i + 3))) - 0.5) * 2 * ry + Math.sin(t * 0.4 + i) * 6;
    dot(ctx, px, py, 1.2 + hash(i + 4) * 1.8, c, 0.2 + 0.25 * Math.sin(t * 0.8 + i * 1.7) ** 2);
  }
  ctx.restore();
}
// reveal handwriting left to right. returns the pen front in local coords while writing.
function inkReveal(ctx, text, x, y, font, color, k) {
  if (k <= 0) return null;
  ctx.save(); ctx.font = font; const w = ctx.measureText(text).width;
  ctx.beginPath(); ctx.rect(x - 12, y - 100, w * k + 12, 140); ctx.clip();
  letter(ctx, text, x, y, { font, color });
  ctx.restore();
  return k < 1 ? [x + w * k, y - 20] : null;
}
// a photo of Uncle Theo doing a card trick for Wren
function cardPhoto(ctx, x, y, s, rot, o = {}) {
  const b = o.b ?? 0, iw = clamp(2.4 * s, 2, 4) / s, skinT = STYLE.theo.skin, skinW = STYLE.wren.skin;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  shape(ctx, rectPts(-66, -80, 132, 160), '#f8f3e6', { seed: 830, b, inkW: iw, pool: 0.3, boilAmp: 0.4 });
  ctx.save(); ctx.beginPath(); ctx.rect(-56, -70, 112, 112); ctx.clip();
  const g = ctx.createLinearGradient(0, -70, 0, 42); g.addColorStop(0, '#e9c38a'); g.addColorStop(1, '#b98a5a'); ctx.fillStyle = g; ctx.fillRect(-56, -70, 112, 112);
  dot(ctx, 34, -52, 24, '#fff1c9', 0.4);
  ctx.fillStyle = '#8a5a3b'; ctx.fillRect(-56, 28, 112, 16);
  shape(ctx, catmull([[-46, 44], [-44, 6], [-22, -4], [-2, 6], [2, 44]], 4, true), STYLE.theo.top, { seed: 831, b, inkW: iw, boilAmp: 0.3 });
  shape(ctx, circlePts(-22, -20, 14, 14, 14), skinT, { seed: 832, b, inkW: iw, boilAmp: 0.3 });
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * 0.18); dot(ctx, -22 + Math.cos(a) * 12, -23 + Math.sin(a) * 11, 6, '#1e1614'); }
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.1; for (const ex of [-27, -17]) { ctx.beginPath(); ctx.arc(ex, -19, 3.6, 0, TAU); ctx.stroke(); dot(ctx, ex, -19, 1.2, PAL.ink); }
  ctx.beginPath(); ctx.arc(-22, -14, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  shape(ctx, catmull([[12, 44], [14, 16], [29, 10], [44, 16], [46, 44]], 4, true), STYLE.wren.top, { seed: 833, b, inkW: iw, boilAmp: 0.3 });
  for (const sx of [-12, 12]) { dot(ctx, 29 + sx, -2, 5.5, STYLE.wren.hairC); dot(ctx, 29 + sx * 0.8, -4, 1.8, STYLE.wren.band); }
  shape(ctx, circlePts(29, -1, 12, 12, 14), skinW, { seed: 834, b, inkW: iw, boilAmp: 0.3 });
  ctx.fillStyle = STYLE.wren.hairC; ctx.beginPath(); ctx.arc(29, -3, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  for (const ex of [25, 33]) dot(ctx, ex, 0, 1.4, PAL.ink);
  dot(ctx, 29, 5, 2.2, '#6b2a24');
  for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(0, 22); ctx.rotate(-0.55 + k * 0.26); ctx.fillStyle = '#fbf7ee'; ctx.fillRect(-4, -22, 9, 13); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 0.8; ctx.strokeRect(-4, -22, 9, 13); dot(ctx, 0.5, -15.5, 1.8, k % 2 ? RED : PAL.ink); ctx.restore(); }
  dot(ctx, -2, 24, 4.5, skinT);
  tube(ctx, [[40, 16], [42, 0], [40, -16]], 5, STYLE.wren.top, { seed: 835, b, inkW: 1.6, boilAmp: 0.2 });
  ctx.save(); ctx.translate(40, -24); ctx.rotate(0.2); ctx.fillStyle = '#fbf7ee'; ctx.fillRect(-5, -8, 10, 14); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 0.8; ctx.strokeRect(-5, -8, 10, 14); dot(ctx, 0, -1, 2.2, RED); ctx.restore();
  ctx.restore();
  if (o.caption) letter(ctx, o.caption, 0, 66, { font: '700 17px Caveat, cursive', align: 'center', color: '#3d4a5e' });
  tape(ctx, 0, -80, 0.05, 0.7, 1.2);
  ctx.restore();
}

/* ---------- Theo's apartment ---------- */
const A = {
  floorY: 800,
  door: { x: 80, y: 150, w: 250, h: 650 },
  win: { x: 1460, y: 120, w: 360, h: 470 },
  couch: { x: 1240, y: 830, w: 620 },
  photo: { x: 720, y: 455 },
};
const NOTES = [[560, 330, 'I helped', -0.06], [1190, 250, 'please remember', 0.05], [800, 560, 'I was on your side', 0.03], [1320, 450, 'remember me', -0.05]];
// a letter under a note or the photo stays still, so the live layer never paints over them
const underNote = (x, y) => NOTES.some(([nx, ny]) => Math.abs(x - nx) < 200 && Math.abs(y - ny) < 100) || (Math.abs(x - A.photo.x) < 130 && Math.abs(y - A.photo.y) < 150);
// every letter on the wall, as data, so the set and the live layer agree on each one
const WALL = (() => {
  const r = rng(505), out = [], win = { x: A.win.x - 40, y: A.win.y - 30, w: A.win.w + 80, h: A.win.h + 80 };
  for (let row = 0; row < 11; row++) for (let col = 0; col < 28; col++) {
    const w = 58 + r() * 24, h = 72 + r() * 26, rot = (r() - 0.5) * 0.26, kind = r(), seed = row * 41 + col;
    const x = 8 + col * 71 + (row % 2) * 35 + (r() - 0.5) * 16, y = 40 + row * 72 + (r() - 0.5) * 14, es = 0.72 + r() * 0.3;
    if (inBox(x, y, A.door, 40) || inBox(x, y, win) || y > A.floorY - 24) continue;
    out.push({ x, y, w, h, rot, kind, seed, es, flutter: x < 960 && kind >= 0.13 && hash(seed * 1.7 + 3) < 0.3 && !underNote(x, y) });
  }
  return out;
})();
// by dawn Mara has cleared the left half of the wall. The frontier is what she is taking down now.
const inFrontier = (c) => c.x >= 1075 && c.x < 1250 && c.y > 340;
const bareAt = (v, c) => v === 'dawn' && ((c.x > 350 && c.x < 1075 && c.y > 280) || inFrontier(c));
const FRONTIER = WALL.filter(inFrontier).sort((a, b) => a.y - b.y || a.x - b.x);
const FLUTTER = WALL.filter((c) => c.flutter);
function drawCell(ctx, c, t = 0, o = {}) {
  const rot = c.rot + (o.drot ?? 0), x = o.x ?? c.x, y = o.y ?? c.y;
  if (c.kind < 0.13) envelope(ctx, x, y, c.es, { t, rot, seed: c.seed, c: PAPERS[c.seed % 5], seal: c.kind < 0.06 ? RED : null });
  else { paperSheet(ctx, x, y, c.w, c.h, { t, rot, seed: c.seed, c: PAPERS[c.seed % 5], ink: c.kind > 0.93 ? RED : INKS[c.seed % 3] }); if (!o.noTape) tape(ctx, x, y - c.h / 2 + 3, rot * 2); }
}
function letterWall(ctx, v) {
  for (const c of WALL) {
    if (bareAt(v, c)) { if (c.kind < 0.6) { tape(ctx, c.x - c.w * 0.25, c.y - c.h / 2, c.rot, 0.3); tape(ctx, c.x + c.w * 0.25, c.y - c.h / 2, -c.rot, 0.3); } continue; }
    if (v === 'draft' && c.flutter) continue;
    drawCell(ctx, c);
  }
  for (const [x, y, text, rot] of NOTES) {
    if (bareAt(v, { x, y })) continue;
    const font = '700 38px Caveat, cursive'; ctx.font = font; const w = ctx.measureText(text).width + 60;
    paperSheet(ctx, x, y, w, 120, { rot, seed: x, c: '#f8f1e2', lines: false });
    letter(ctx, text, x, y + 12, { rot, font, align: 'center', color: '#2d2a3a' });
    tape(ctx, x - w * 0.36, y - 58, rot - 0.3); tape(ctx, x + w * 0.36, y - 58, rot + 0.3);
  }
  // she leaves this one up
  cardPhoto(ctx, A.photo.x, A.photo.y, 1.3, -0.07);
}
function curtains(ctx, v) {
  const w = A.win, gx = w.x + w.w / 2, hem = w.y + w.h + 24, dawn = v === 'dawn';
  const g = ctx.createLinearGradient(0, w.y, 0, hem);
  g.addColorStop(0, dawn ? '#ffe9bd' : '#16242b'); g.addColorStop(1, dawn ? '#f2b477' : '#2c4148');
  ctx.fillStyle = g; ctx.fillRect(gx - 24, w.y - 10, 48, hem - w.y);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? w.x - 60 : gx + (dawn ? 12 : 4), x1 = s < 0 ? gx - (dawn ? 12 : 4) : w.x + w.w + 60;
    const pts = [[x0, w.y - 16], [x1, w.y - 16]];
    for (let i = 0; i <= 6; i++) pts.push([lerp(x1, x0, i / 6), hem + (i % 2 ? 10 : -4)]);
    shape(ctx, pts, '#8a4f48', { seed: 90 + s, boilAmp: 0.5, shade: { dx: s * 14, dy: 0, a: 0.15 } });
    ctx.save();
    ctx.strokeStyle = '#4a2622';
    for (let k = 1; k < 6; k++) { const fx = lerp(x0, x1, k / 6); brushDry(ctx, [[fx, w.y - 6], [fx + s * 4, hem - 10]], { w: 5, k: 3, alpha: 0.3, seed: k * 7 + s }); }
    ctx.strokeStyle = '#d09a86';
    for (let k = 1; k < 6; k++) { const fx = lerp(x0, x1, k / 6) + 12; brushDry(ctx, [[fx, w.y], [fx + s * 3, hem - 20]], { w: 3, k: 2, alpha: 0.2, seed: k * 11 + s }); }
    ctx.restore();
  }
  shape(ctx, rectPts(w.x - 90, w.y - 30, w.w + 180, 12), PAL.woodD, { seed: 95, boilAmp: 0.4, inkW: 2.2 });
  for (const ex of [w.x - 96, w.x + w.w + 96]) shape(ctx, circlePts(ex, w.y - 24, 12, 12, 12), PAL.woodD, { seed: ex, inkW: 2 });
}
function doorway(ctx) {
  const d = A.door;
  ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y, d.w, d.h); ctx.clip();
  ctx.fillStyle = '#e7c78c'; ctx.fillRect(d.x, d.y, d.w, d.h);
  wash(ctx, rectPts(d.x - 30, d.y - 30, d.w + 60, d.h + 60), '#f4dcaa', { seed: 81, alpha: 0.12, layers: 10 });
  ctx.fillStyle = '#a57c50'; ctx.fillRect(d.x, d.y + d.h - 80, d.w, 80);
  // the neighbor's door across the hall
  shape(ctx, rectPts(d.x + 40, d.y + 110, 120, d.h - 190), '#b58a5a', { seed: 82, inkW: 2, boilAmp: 0.4 });
  dot(ctx, d.x + 146, d.y + 380, 6, '#e3b23c');
  shape(ctx, circlePts(d.x + 210, d.y + 150, 16, 22, 12), '#fff1c9', { seed: 83, inkW: 1.8 });
  ctx.restore();
  for (const r of [[d.x - 24, d.y - 24, 26, d.h + 24], [d.x + d.w - 2, d.y - 24, 26, d.h + 24], [d.x - 24, d.y - 24, d.w + 48, 26]]) shape(ctx, rectPts(...r), '#8a5a3b', { seed: r[0] + r[1], boilAmp: 0.5, inkW: 2.4 });
}
function couch(ctx, v) {
  const { x, y, w } = A.couch, c = '#4f6f7a', cd = mix(c, PAL.ink, 0.22), cl = mix(c, '#fff8e8', 0.1);
  shape(ctx, rrectPts(x + 50, y - 250, w - 100, 150, 30), c, { seed: 101, boilAmp: 0.5 });
  shape(ctx, rectPts(x + 40, y - 96, w - 80, 72), cd, { seed: 102, boilAmp: 0.5 });
  for (let i = 0; i < 2; i++) shape(ctx, rrectPts(x + 86 + (i * (w - 172)) / 2, y - 140, (w - 172) / 2, 60, 18), cl, { seed: 103 + i, boilAmp: 0.5, inkW: 2.4 });
  for (const ax of [x, x + w - 104]) shape(ctx, rrectPts(ax, y - 196, 104, 176, 36), c, { seed: 105 + ax, boilAmp: 0.5, shade: { dx: 0, dy: 14, a: 0.15 } });
  for (const fx of [x + 36, x + w - 52]) shape(ctx, rectPts(fx, y - 24, 16, 24), PAL.woodD, { seed: fx, inkW: 2 });
  shape(ctx, rrectPts(x + w - 230, y - 236, 110, 96, 26), '#e3b23c', { seed: 107, inkW: 2.4 });
  if (v !== 'dawn') shape(ctx, catmull([[x + 10, y - 190], [x + 110, y - 200], [x + 150, y - 120], [x + 120, y - 30], [x + 60, y - 40], [x + 20, y - 110]], 5, true), '#c98a4a', { seed: 108, boilAmp: 0.5 });
}
function takeout(ctx, x, y, t, s = 1, seed = 1) {
  const b = boil(t);
  shape(ctx, [[x - 32 * s, y - 60 * s], [x + 32 * s, y - 60 * s], [x + 24 * s, y], [x - 24 * s, y]], '#f1e9d6', { seed, b, inkW: 2.2 });
  shape(ctx, [[x - 32 * s, y - 60 * s], [x - 10 * s, y - 78 * s], [x + 10 * s, y - 78 * s], [x + 32 * s, y - 60 * s]], '#e2d8c0', { seed: seed + 1, b, inkW: 2 });
  inkLine(ctx, [[x - 20 * s, y - 40 * s], [x + 20 * s, y - 40 * s]], { w: 1.6, seed: seed + 2, alpha: 0.4 });
  ctx.save(); ctx.strokeStyle = '#8f8c84'; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.arc(x, y - 70 * s, 20 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore();
}
function bowl(ctx, x, y, t, s = 1, seed = 1) {
  const b = boil(t);
  for (const k of [-1, 1]) inkLine(ctx, [[x + k * 6 * s, y - 34 * s], [x + 40 * s + k * 5 * s, y - 74 * s]], { w: 3.4 * s, seed: seed + 3 + k, color: '#b08a5a' });
  shape(ctx, catmull([[x - 40 * s, y - 30 * s], [x + 40 * s, y - 30 * s], [x + 30 * s, y - 4 * s], [x, y], [x - 30 * s, y - 4 * s]], 4, true), '#e9dcc0', { seed, b, inkW: 2.2 });
  shape(ctx, circlePts(x, y - 30 * s, 40 * s, 8 * s, 16), '#d8d0bc', { seed: seed + 1, b, inkW: 1.8, pool: 0.3 });
}
function floorClutter(ctx) {
  const r = rng(909);
  for (const [x, y, rot] of [[420, 880, 0.3], [560, 1010, -0.5], [1230, 1000, 0.2], [300, 960, 1.2], [1520, 905, -0.3], [1060, 1050, 0.8], [760, 1060, -1.1]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42); paperSheet(ctx, 0, 0, 92, 118, { rot, seed: x, c: PAPERS[x % 5] }); ctx.restore();
  }
  for (const [x, y] of [[640, 965], [1150, 915], [480, 1040], [1340, 1035], [880, 1070]]) shape(ctx, blobPoly(x, y, 19, 15, 9, r, 0.3), '#efe3c4', { seed: x, inkW: 2, boilAmp: 0.4 });
  takeout(ctx, 1190, 876, 0, 0.9, 7);
  bowl(ctx, 1560, 1000, 0, 0.9, 8);
}
// variants: night (every letter painted), draft (fluttering ones left for the live layer), dawn (half cleared)
defineSet('theoRoom', (ctx, v) => {
  ctx.fillStyle = '#d3bb92'; ctx.fillRect(0, 0, W, A.floorY + 10);
  wash(ctx, rectPts(-40, -40, W + 80, A.floorY + 60), '#e0cca4', { seed: 1, alpha: 0.07, layers: 14 });
  wash(ctx, rectPts(-40, 420, W + 80, 420), '#a88a62', { seed: 2, alpha: 0.05, layers: 10 });
  ctx.fillStyle = '#7a5236'; ctx.fillRect(0, A.floorY, W, H - A.floorY);
  wash(ctx, rectPts(-40, A.floorY, W + 80, 320), '#5e3b27', { seed: 3, alpha: 0.08, layers: 12 });
  ctx.save(); ctx.strokeStyle = '#3e2a1e';
  for (let i = -14; i <= 14; i++) brushDry(ctx, [[960 + i * 44, A.floorY], [960 + i * 160, H + 20]], { w: 3, k: 3, alpha: 0.3, seed: i + 40, dry: 0.3 });
  for (const yy of [850, 925, 1015]) brushDry(ctx, [[0, yy], [W, yy]], { w: 2.5, k: 3, alpha: 0.2, seed: yy });
  ctx.restore();
  curtains(ctx, v);
  letterWall(ctx, v);
  for (const [x0, x1] of [[-10, A.door.x - 24], [A.door.x + A.door.w + 24, W + 10]]) shape(ctx, rectPts(x0, A.floorY - 26, x1 - x0, 30), '#9a7450', { seed: 4 + x0, boilAmp: 0.6, inkW: 2.4 });
  doorway(ctx);
  shape(ctx, catmull([[330, 935], [860, 870], [1390, 930], [860, 1005]], 6, true), '#8a4a3a', { seed: 5, boilAmp: 0.5 });
  ctx.save(); ctx.strokeStyle = '#e3b23c'; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); tracePath(ctx, catmull([[390, 935], [860, 886], [1330, 930], [860, 990]], 6, true)); ctx.stroke(); ctx.restore();
  couch(ctx, v);
  floorClutter(ctx);
});

/* ---------- live props in the apartment ---------- */
// the door swings out into the hall. open 0 is shut, 1 is edge-on to us.
function doorLeaf(ctx, t, open) {
  const d = A.door, b = boil(t), a = (open * Math.PI) / 2, lw = Math.max(16, d.w * Math.cos(a)), k = 26 * Math.sin(a);
  shape(ctx, [[d.x, d.y], [d.x + lw, d.y + k], [d.x + lw, d.y + d.h - k * 0.4], [d.x, d.y + d.h]], '#8e6a44', { seed: 85, b, boilAmp: 0.5, inkW: 2.4, shade: { dx: -lw * 0.25, dy: 0, a: 0.14 } });
  if (lw > 60) {
    for (const [py, ph] of [[40, 250], [330, 280]]) shape(ctx, rectPts(d.x + lw * 0.16, d.y + k * 0.3 + py, lw * 0.68, ph), '#9a7650', { seed: 86 + py, b, inkW: 1.8, boilAmp: 0.4 });
    dot(ctx, d.x + lw - 22, d.y + 370, 8, '#e3b23c');
  }
}
function doorSpill(ctx, open) {
  const d = A.door, lw = Math.max(16, d.w * Math.cos((open * Math.PI) / 2)), x0 = d.x + lw, x1 = d.x + d.w, k = clamp((x1 - x0) / d.w);
  if (k < 0.02) { glow(ctx, d.x + d.w / 2, d.y + d.h - 2, 160, '#ffd98a', 0.25); return; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.11 * Math.sqrt(k); ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.moveTo(x0, A.floorY); ctx.lineTo(x1, A.floorY); ctx.lineTo(x1 + 380, H); ctx.lineTo(x0 + 70 * k, H); ctx.closePath(); ctx.fill(); ctx.restore();
  glow(ctx, (x0 + x1) / 2, d.y + d.h * 0.45, 380, '#ffd98a', 0.22 * Math.sqrt(k));
}
function cushion(ctx, x, y, t, c = '#c98a4a') {
  shape(ctx, catmull([[x - 96, y - 4], [x - 72, y - 34], [x + 72, y - 34], [x + 96, y - 4], [x + 60, y + 12], [x - 60, y + 12]], 5, true), c, { seed: 120 + x, b: boil(t), inkW: 2.4 });
}
// returns the y where props stand on the tabletop
function coffeeTable(ctx, t, x, w, y = 790) {
  const b = boil(t);
  for (const lx of [x + 26, x + w - 48]) shape(ctx, rectPts(lx, y + 20, 22, 92), PAL.woodD, { seed: lx, b, inkW: 2.4 });
  shape(ctx, [[x + 18, y - 20], [x + w - 18, y - 20], [x + w, y], [x, y]], '#a0704a', { seed: 130, b, inkW: 2.4, pool: 0.5 });
  shape(ctx, rectPts(x, y, w, 24), PAL.wood, { seed: 131, b, shade: { dx: 0, dy: 8, a: 0.2 } });
  return y - 8;
}
function laptopBack(ctx, x, y, t, s = 1) {
  const b = boil(t), w = 170 * s, h = 112 * s;
  shape(ctx, [[x - w / 2 - 8 * s, y - 2], [x + w / 2 + 8 * s, y - 2], [x + w / 2 + 14 * s, y + 6 * s], [x - w / 2 - 14 * s, y + 6 * s]], '#8f8c84', { seed: 140, b, inkW: 2 });
  shape(ctx, [[x - w / 2, y - h], [x + w / 2, y - h + 4 * s], [x + w / 2 + 4 * s, y], [x - w / 2 - 4 * s, y]], '#5c5a55', { seed: 141, b, inkW: 2.4 });
}
function laptopFront(ctx, x, y, t, s, screen) {
  const b = boil(t), w = 360 * s, h = 230 * s;
  shape(ctx, [[x - w / 2, y - 4], [x + w / 2, y - 4], [x + w / 2 + 30 * s, y + 30 * s], [x - w / 2 - 30 * s, y + 30 * s]], '#8f8c84', { seed: 142, b, inkW: 2.2 });
  for (let i = 0; i < 3; i++) inkLine(ctx, [[x - w / 2 + 10 * s - i * 8 * s, y + 6 * s + i * 8 * s], [x + w / 2 - 10 * s + i * 8 * s, y + 6 * s + i * 8 * s]], { w: 1.6, seed: 143 + i, alpha: 0.4 });
  shape(ctx, rrectPts(x - w / 2, y - h, w, h, 10 * s), '#3a3431', { seed: 144, b, inkW: 2.6 });
  const ix = x - w / 2 + 12 * s, iy = y - h + 12 * s, iw = w - 24 * s, ih = h - 24 * s;
  ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip(); ctx.translate(ix, iy); ctx.scale(s, s); screen(ctx, iw / s, ih / s); ctx.restore();
}
function flame(ctx, x, y, t, s = 1) {
  const k = noise1(t * 6.3) * 3.2 * s, hh = s * (28 + noise1(t * 4.1 + 2) * 4);
  for (const [c, m] of [['#ffc45e', 1], ['#fff4d6', 0.5]]) {
    ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = 0.95; ctx.beginPath();
    ctx.moveTo(x - 8 * s * m, y + 4 * s); ctx.quadraticCurveTo(x - 11 * s * m, y - hh * 0.35 * m, x + k * m, y - hh * m);
    ctx.quadraticCurveTo(x + 11 * s * m, y - hh * 0.35 * m, x + 8 * s * m, y + 4 * s); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
// the flame's brightness, shared by the flame, its light pool, and the shadow it throws
const flicker = (t) => 1 + noise1(t * 3.1) * 0.5 + Math.max(0, noise1(t * 0.8 + 3) - 0.4) * noise1(t * 17) * 0.9;
// returns the flame point for the glow drawn after the light mask
function candle(ctx, x, y, t, o = {}) {
  const s = o.s ?? 1, b = boil(t), hh = (o.h ?? 80) * s;
  shape(ctx, circlePts(x, y - 3 * s, 46 * s, 11 * s, 18), '#b08a5a', { seed: 160, b, inkW: 2, pool: 0.4 });
  shape(ctx, rrectPts(x - 20 * s, y - hh, 40 * s, hh - 4 * s, 7 * s), '#f1e6cf', { seed: 161, b, inkW: 2.2, shade: { dx: 8 * s, dy: 0, a: 0.12 } });
  shape(ctx, catmull([[x - 20 * s, y - hh + 6 * s], [x - 8 * s, y - hh + 2 * s], [x - 5 * s, y - hh + 24 * s], [x - 15 * s, y - hh + 18 * s]], 4, true), '#f8f0de', { seed: 162, b, inkW: 1.4, gaps: 1 });
  inkLine(ctx, [[x, y - hh], [x + 2 * s, y - hh - 10 * s]], { w: 2.4 * s, seed: 163 });
  const fx = x + s, fy = y - hh - 10 * s;
  if (!o.out) { flame(ctx, fx, fy, t, s); return [fx, fy - 12 * s]; }
  ctx.save(); ctx.strokeStyle = '#efe6dc'; ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const ph = frac(t * 0.18 + k / 2); ctx.globalAlpha = 0.4 * Math.sin(ph * Math.PI); ctx.lineWidth = 3 * s; ctx.beginPath();
    for (let i = 0; i <= 14; i++) { const yy = fy - ph * 30 * s - i * 7 * s, xx = fx + Math.sin(i * 0.6 + t * 0.9 + k * 2) * 7 * s * (i / 14 + 0.3); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke();
  }
  ctx.restore();
  return [fx, fy];
}
function letterStack(ctx, x, y, n, t, o = {}) {
  const b = boil(t), hh = n * 3.2, w = o.w ?? 130;
  shape(ctx, rectPts(x - w / 2, y - hh, w, hh), '#efe3c4', { seed: 310 + x, b, inkW: 2, pool: 0.3, boilAmp: 0.5 });
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
  for (let i = 1; i < n; i++) { const yy = y - i * 3.2; ctx.beginPath(); ctx.moveTo(x - w / 2 + 2 + hash(i) * 4, yy); ctx.lineTo(x + w / 2 - 2 - hash(i + 5) * 4, yy); ctx.stroke(); }
  ctx.restore();
  shape(ctx, [[x - w / 2 + 8, y - hh - 16], [x + w / 2 - 8, y - hh - 16], [x + w / 2, y - hh], [x - w / 2, y - hh]], '#f8f1e2', { seed: 311 + x, b, inkW: 2, pool: 0.3, boilAmp: 0.5 });
  if (o.string) { ctx.save(); ctx.strokeStyle = '#b5552f'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 6, y - hh); ctx.lineTo(x - 2, y - hh - 8); ctx.moveTo(x - 30, y - hh - 8); ctx.lineTo(x + 26, y - hh - 8); ctx.stroke(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x - 4 + s * 12, y - hh - 14, 11, 6, s * 0.4, 0, TAU); ctx.stroke(); } ctx.restore(); }
}
// a sheet lying flat on a tabletop, seen from low: foreshortened
function flatSheet(ctx, x, y, w, h, t, seed, fn) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.4);
  paperSheet(ctx, 0, 0, w, h, { t, seed, c: '#f8f1e2', lines: false });
  if (fn) fn(ctx);
  ctx.restore();
}
const NIGHT = 'rgba(16,11,14,0.8)';

shot('theo.walls', {
  grade: () => ({ sat: 0.85, tint: '#e8b88a', tintA: 0.22, vig: 0.95 }),
  draw(ctx, t, st) {
    const talk = says(st, 'theo'), pt = beatT(st, t);
    const cam = talk ? drift(t, { x: 930, y: 580, z: 1.12 }, { x: 930, y: 610, z: 1.36 }, 16) : drift(t, { x: 960, y: 540, z: 1.0 }, { x: 900, y: 570, z: 1.12 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'theoRoom', 'draft');
    // she opens the door, and the draft finds the letters
    const open = talk ? 0.93 : 0.1 + 0.83 * settle(pt, 0.3, 2.4), draft = open * (0.55 + 0.45 * noise1(t * 0.7));
    for (const c of FLUTTER) {
      const near = clamp(1 - (c.x - 330) / 760), th = (Math.sin(t * (5 + hash(c.seed) * 3) + c.seed) * 0.14 + noise1(t * 2 + c.seed) * 0.06) * draft * (0.25 + near);
      const px = c.x, py = c.y - c.h / 2 + 3;
      drawCell(ctx, c, t, { x: px - Math.sin(th) * (c.h / 2 - 3), y: py + Math.cos(th) * (c.h / 2 - 3), drot: th, noTape: true });
      tape(ctx, px, py, c.rot * 2);
    }
    const d = A.door, maraLook = talk ? 0.6 : 0.35;
    ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y - 60, d.w, d.h + 60); ctx.clip();
    person(ctx, { who: 'mara', x: 205, y: 806, h: 460, f: 1, arms: open < 0.6 ? [[1.15, 0.3], [0.05, 0.1]] : 'down', mood: 'worry', t, look: maraLook, speak: says(st, 'mara') });
    ctx.restore();
    doorLeaf(ctx, t, open);
    const top = coffeeTable(ctx, t, 640, 540);
    laptopBack(ctx, 790, top, t);
    takeout(ctx, 1015, top, t, 0.8, 21); bowl(ctx, 690, top, t, 0.7, 23);
    const fl = candle(ctx, 1130, top, t);
    // he paces in front of the table and cannot stop
    const per = 6.5, u = 0.5 - 0.5 * Math.cos((Math.PI * t) / per), dir = Math.sin((Math.PI * t) / per) >= 0 ? 1 : -1, tx = lerp(600, 1160, u);
    const gest = Math.sin(t * 2.2) * 0.2;
    person(ctx, { who: 'theo', x: tx, y: 965, h: 440, f: dir, pose: 'walk', pace: 6, arms: talk ? [[1.0 + gest, 1.2], [0.6, 1.0]] : [[0.25, 2.45], [0.5, 1.3]], mood: 'worry', t, seed: 9, speak: talk });
    const fk = flicker(t);
    lightMask(ctx, NIGHT, [{ x: 1130, y: 700, r: 540 * (0.96 + 0.04 * fk), a: 1 }, { x: 810, y: 660, r: 380, a: 0.9 }, { x: 205, y: 470, r: 480 * open + 40, a: 0.95 * open }, { x: 900, y: 420, r: 1100, a: 0.26 }], camFit(cam));
    applyCam(ctx, cam);
    doorSpill(ctx, open);
    motes(ctx, t, 330, 760, 260, 220, 36);
    glow(ctx, 820, 640, 280, PAL.frost, 0.32);
    glow(ctx, fl[0], fl[1], 380, PAL.lamp, 0.5 + 0.12 * fk);
  },
});

/* ---------- close on one letter ---------- */
function bigSheet(ctx, x, y, w, h, o = {}) {
  const seed = o.seed ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  shape(ctx, rectPts(-w / 2, -h / 2, w, h), o.c ?? '#f6efdc', { seed, b: o.b ?? 0, inkW: 2.6, pool: 0.5, boilAmp: 0.8 });
  for (let i = 0; i < Math.floor((h - 80) / 40); i++) scribble(ctx, -w / 2 + 34, -h / 2 + 70 + i * 40, w - 70 - hash(i + seed) * 80, { seed: seed * 13 + i, size: 11, color: o.ink ?? PAL.inkSoft, lw: 2.4 });
  ctx.restore();
}
defineSet('theoLetterWall', (ctx) => {
  ctx.fillStyle = '#bfa47a'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#a88a62', { seed: 3, alpha: 0.06, layers: 10 });
  const r = rng(313);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
    const x = -40 + col * 320 + (row % 2) * 150 + (r() - 0.5) * 60, y = -20 + row * 350 + (r() - 0.5) * 50, rot = (r() - 0.5) * 0.3, seed = row * 11 + col, kind = r();
    if (kind < 0.18) { envelope(ctx, x, y, 3.2, { rot, seed, c: PAPERS[seed % 5], seal: RED }); continue; }
    bigSheet(ctx, x, y, 300, 390, { rot, seed, c: PAPERS[seed % 5], ink: INKS[seed % 3] });
    tape(ctx, x, y - 190, rot * 2, 0.6, 2.2);
  }
  cardPhoto(ctx, 245, 830, 2.3, 0.08, { caption: 'Wren + Uncle Theo' });
});
const LETTER = { x: 860, y: 520, rot: -0.025 };
const LETTER_LINES = [['To the mind that is coming.', -370, -216, 0.3, 2.2], ['I helped you.', -370, -44, 2.9, 1.0], ['Please remember.', -370, 42, 4.2, 1.3]];
const toWorld = ([lx, ly]) => { const c = Math.cos(LETTER.rot), s = Math.sin(LETTER.rot); return [LETTER.x + lx * c - ly * s, LETTER.y + lx * s + ly * c]; };
// the letter pinned on the wall. o.write: seconds of writing so far. o.dash: the empty line for a second name.
// o.sig: seconds of Mara signing. Returns the pen front in world coords, if a pen is moving.
function pinnedLetter(ctx, t, o = {}) {
  const b = boil(t), ink = '#2d2a3a', font = '700 66px Caveat, cursive', w = o.write ?? 99;
  let front = null;
  ctx.save(); ctx.translate(LETTER.x, LETTER.y); ctx.rotate(LETTER.rot);
  shape(ctx, rectPts(-430, -410, 860, 840), '#f7f0de', { seed: 7, b, inkW: 3, pool: 0.5, boilAmp: 0.8 });
  ctx.save(); ctx.strokeStyle = 'rgba(79,122,138,0.22)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) { const ly = -300 + i * 86; ctx.beginPath(); ctx.moveTo(-400, ly); ctx.lineTo(400, ly); ctx.stroke(); }
  ctx.restore();
  for (const [text, x, y, t0, d] of LETTER_LINES) front = inkReveal(ctx, text, x, y, font, ink, clamp((w - t0) / d)) || front;
  front = inkReveal(ctx, 'Theo', 110, 214, '700 88px Caveat, cursive', ink, clamp((w - 5.8) / 0.9)) || front;
  if (o.dash) {
    letter(ctx, 'x', -30, 356, { font: '700 54px Caveat, cursive', color: ink, alpha: 0.6 });
    ctx.save(); ctx.strokeStyle = ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.4; ctx.setLineDash([12, 9]); ctx.beginPath(); ctx.moveTo(10, 358); ctx.lineTo(360, 358); ctx.stroke(); ctx.restore();
  }
  if (o.sig != null) {
    // one glyph at a time, the way a hand signs
    const sf = '700 80px Caveat, cursive', name = 'Mara'; ctx.font = sf;
    let cut = 0;
    for (let j = 0; j < name.length; j++) { const k = clamp((o.sig - j * 0.55) / 0.45); if (k <= 0) break; cut = lerp(ctx.measureText(name.slice(0, j)).width, ctx.measureText(name.slice(0, j + 1)).width, ease.inOut(k)); }
    const f = inkReveal(ctx, name, 40, 348, sf, '#3d4a5e', cut / ctx.measureText(name).width);
    if (f) front = [f[0], f[1] + Math.sin(o.sig * 17) * 12];
    else if (o.sig < 0) front = [40, 330];
  }
  for (const s of [-1, 1]) tape(ctx, s * 330, -404, s * 0.35, 0.65, 2.6);
  ctx.restore();
  return front ? toWorld(front) : null;
}
function penHand(ctx, t, grow = 1) {
  const b = boil(t), dx = noise1(t * 9) * 5 + Math.sin(t * 29) * 2.2, dy = noise1(t * 8 + 5) * 5 + Math.cos(t * 33) * 1.8;
  const skin = STYLE.theo.skin, sleeve = STYLE.theo.top;
  ctx.save(); ctx.translate(1760 + dx, 1060 + dy); ctx.scale(grow, grow); ctx.translate(-1760, -1060);
  tube(ctx, [[2080, 1210], [1820, 1030], [1600, 900]], 170, sleeve, { seed: 150, b });
  shape(ctx, circlePts(1600, 900, 68, 94, 18, -0.9), mix(sleeve, PAL.ink, 0.15), { seed: 151, b });
  // the pen points at us: its far end hides in the fist, the near end is bigger
  const p0 = [1520, 800], p1 = [1210, 935], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), nx = -(p1[1] - p0[1]) / L, ny = (p1[0] - p0[0]) / L;
  const at = (k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)], wd = (k) => lerp(10, 27, k);
  const band = (k0, k1) => { const a = at(k0), c = at(k1); return [[a[0] + nx * wd(k0), a[1] + ny * wd(k0)], [c[0] + nx * wd(k1), c[1] + ny * wd(k1)], [c[0] - nx * wd(k1), c[1] - ny * wd(k1)], [a[0] - nx * wd(k0), a[1] - ny * wd(k0)]]; };
  shape(ctx, band(0, 1), '#34384a', { seed: 152, b, inkW: 3 });
  shape(ctx, band(0.7, 1), '#b5552f', { seed: 153, b, inkW: 3 });
  shape(ctx, circlePts(p1[0], p1[1], 27, 27, 18), '#8a3a2a', { seed: 154, b, inkW: 3 });
  const g = at(0.66); inkLine(ctx, [[g[0] + nx * 24, g[1] + ny * 24], [g[0] - nx * 24, g[1] - ny * 24]], { w: 7, color: '#e3b23c', seed: 155 });
  shape(ctx, catmull([[1430, 800], [1480, 752], [1570, 745], [1640, 800], [1630, 880], [1560, 918], [1470, 896], [1426, 846]], 5, true), skin, { seed: 156, b, shade: { dx: 14, dy: 12, a: 0.16 } });
  // curled fingers wrap under the barrel
  for (const [i, [fx, fy, rot]] of [[1446, 846, 0.9], [1474, 878, 0.7], [1510, 902, 0.5], [1550, 912, 0.3]].entries()) shape(ctx, circlePts(fx, fy, 30, 21, 14, rot), mix(skin, i % 2 ? '#fff0e0' : PAL.ink, 0.06), { seed: 157 + i, b, inkW: 2.6 });
  tube(ctx, [[1600, 782], [1540, 772], [1478, 796]], 36, skin, { seed: 162, b });
  // his hand will not keep still
  if (Math.floor(t * 6) % 2) for (const [sx, sy, a] of [[1390, 760, 3.6], [1668, 760, -0.5], [1670, 890, 0.4]]) { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const r of [16, 30]) { ctx.beginPath(); ctx.arc(sx, sy, r, a - 0.35, a + 0.35); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
}
function nib(ctx, p, t) { if (!p) return; dot(ctx, p[0], p[1], 5, '#2d2a3a', 0.9); glow(ctx, p[0], p[1], 40, '#fff1c9', 0.25 + 0.1 * Math.sin(t * 20)); }
function letterLight(ctx, t, cam) {
  const fk = flicker(t);
  lightMask(ctx, 'rgba(30,16,10,0.5)', [{ x: 860, y: 520, r: 860 * (0.94 + 0.06 * fk), a: 1 }], camFit(cam));
  applyCam(ctx, cam);
  glow(ctx, 220, 1060, 900, '#ffb85a', 0.24 + 0.08 * fk);
  motes(ctx, t, 860, 520, 760, 440, 40);
}
shot('theo.letter', {
  grade: () => ({ sat: 0.9, tint: '#f2d7a8', tintA: 0.2, vig: 0.85 }),
  draw(ctx, t, st) {
    const pen = !!st.p.pen, pt = beatT(st, t);
    const cam = pen ? drift(t, { x: 960, y: 560, z: 1.0 }, { x: 1040, y: 640, z: 1.18 }, 14) : drift(t, { x: 960, y: 540, z: 1.0 }, { x: 860, y: 500, z: 1.14 }, 16);
    applyCam(ctx, cam);
    drawSet(ctx, 'theoLetterWall');
    // the words write themselves, one line after another
    const front = pinnedLetter(ctx, t, { write: pen ? 99 : pt, dash: pen });
    letterLight(ctx, t, cam);
    nib(ctx, front, t);
    if (pen) penHand(ctx, t, lerp(0.82, 1.12, settle(pt, 0.2, 3.4)));
  },
});

/* ---------- the basilisk: the letters' shadow, made huge by the candle ---------- */
// a tail along the skirting, one and a half coils, an S of neck, then the hood
const SERPENT = (() => {
  const pts = [[330, 790], [560, 794], [780, 792]];
  for (let i = 0; i <= 30; i++) { const a = (i / 30) * 3 * Math.PI, rx = lerp(390, 240, a / (3 * Math.PI)), cy = 690 - (a / Math.PI) * 46; pts.push([960 + Math.sin(a) * rx, cy + Math.cos(a) * rx * 0.26]); }
  return pts.concat([[1006, 452], [934, 404], [965, 356]]);
})();
const SPINE = resample(catmull(SERPENT, 6), 16);
const nearestSpine = (p) => { let bi = 0, bd = 1e9; SPINE.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); return bi; };
const I_COIL0 = nearestSpine([960, 791]), I_NECK = nearestSpine([960, 490]);
const serpW = (u) => (u < 0.1 ? lerp(8, 72, ease.out(u / 0.1)) : lerp(72, 54, (u - 0.1) / 0.9));
const HOOD = { x: 965, y: 212 };
// a cobra's hood from the front: narrow at the head, widest high up, tapering into the neck
const HOOD_PTS = catmull([[0, -80], [44, -76], [96, -46], [124, 0], [118, 52], [86, 104], [44, 140], [26, 152], [-26, 152], [-44, 140], [-86, 104], [-118, 52], [-124, 0], [-96, -46], [-44, -76]], 4, true);
const HEAD_PTS = catmull([[0, -52], [40, -46], [62, -18], [56, 12], [30, 36], [0, 44], [-30, 36], [-56, 12], [-62, -18], [-40, -46]], 4, true);
// every scale is a sheet of paper. rise 0..1 uncoils it: the tail slides out, the neck lifts, the hood opens.
function serpent(ctx, t, cx, cy, rise, fk) {
  const flick = 1 + (fk - 1) * 0.025, sway = Math.sin(t * 0.31) * 16 * rise, n = SPINE.length, path = new Path2D(), edge = new Path2D();
  const P = (x, y) => [cx + (x - cx) * flick, cy + (y - cy) * flick];
  const poly = (pa, pts) => { pa.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) pa.lineTo(pts[i][0], pts[i][1]); pa.closePath(); };
  const quad = (pa, x, y, w, h, a) => { const c = Math.cos(a), s = Math.sin(a); poly(pa, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => P(x + u * c - v * s, y + u * s + v * c))); };
  const i0 = Math.round((1 - settle(rise, 0, 0.55)) * I_COIL0), base = SPINE[I_NECK], tipF = SPINE[n - 1];
  let tip = base;
  for (let i = i0; i < n; i++) {
    const u = i / (n - 1), r = i > I_NECK ? clamp(rise * 1.35 - ((i - I_NECK) / (n - 1 - I_NECK)) * 0.35) : 1;
    const q = i > I_NECK ? [lerp(base[0], SPINE[i][0], r), lerp(base[1], SPINE[i][1], r)] : SPINE[i];
    const k = smooth(0.62, 1, u) * r, x = q[0] + sway * k, y = q[1] + Math.sin(t * 0.5 + i * 0.15) * 3 * k;
    if (i === n - 1) tip = [x, y];
    const a = SPINE[Math.max(0, i - 1)], c = SPINE[Math.min(n - 1, i + 1)], ang = Math.atan2(c[1] - a[1], c[0] - a[0]), w = serpW(u), nx = -Math.sin(ang), ny = Math.cos(ang);
    for (const j of [-1, 1]) { const hh = hash(i * 3.1 + j * 17.3), off = j * w * 0.2; for (const pa of i % 4 ? [path] : [path, edge]) quad(pa, x + nx * off, y + ny * off, w * (0.62 + hh * 0.2), w * (0.66 + hh * 0.2), ang + (hh - 0.5) * 0.7); }
  }
  const hs = lerp(0.22, 1, ease.out(clamp((rise - 0.3) / 0.7)));
  const hx = tip[0] + (HOOD.x - tipF[0]) * hs, hy = tip[1] + (HOOD.y - tipF[1]) * hs + Math.sin(t * 0.5) * 4 * rise, hcy = hy - 78 * hs;
  const hood = HOOD_PTS.map(([x, y]) => [hx + x * hs, hy + y * hs]);
  poly(path, hood.map(([x, y]) => P(x, y)));
  for (let i = 0; i < hood.length; i += 3) { const q = hood[i], a = Math.atan2(q[1] - hy - 30 * hs, q[0] - hx); for (const pa of [path, edge]) quad(pa, q[0], q[1], 40 * hs, 50 * hs, a + hash(i + 50) - 0.5); }
  poly(path, HEAD_PTS.map(([x, y]) => P(hx + x * hs, hcy + y * hs)));
  quad(path, hx, hcy - 52 * hs, 84 * hs, 14 * hs, 0);
  for (const [dx, hgt] of [[-34, 16], [-17, 24], [0, 34], [17, 24], [34, 16]]) {
    poly(path, [P(hx + (dx - 7) * hs, hcy - 58 * hs), P(hx + dx * hs, hcy - (58 + hgt) * hs), P(hx + (dx + 7) * hs, hcy - 58 * hs)]);
    poly(path, circlePts(hx + dx * hs, hcy - (60 + hgt) * hs, 5 * hs, 5 * hs, 8).map(([x, y]) => P(x, y)));
  }
  ctx.save();
  ctx.fillStyle = 'rgba(58,32,28,0.8)'; ctx.fill(path);
  ctx.strokeStyle = 'rgba(250,232,200,0.14)'; ctx.lineWidth = 1.6; ctx.stroke(edge);
  ctx.restore();
  return { eyes: [P(hx - 30 * hs, hcy - 6 * hs), P(hx + 30 * hs, hcy - 6 * hs)], open: clamp((rise - 0.8) / 0.14) };
}
function emberEyes(ctx, eyes, t, open) {
  if (open <= 0) return;
  const pulse = 0.75 + 0.25 * Math.sin(t * 1.3), shut = frac(t / 7.3 + 0.4) > 0.975;
  for (const [x, y] of eyes) {
    glow(ctx, x, y, 120, '#e8603f', 0.55 * pulse * open);
    if (shut || open < 0.15) { inkLine(ctx, [[x - 20, y], [x + 20, y + 2]], { w: 3.4, color: '#ffb35a', alpha: 0.9 }); continue; }
    const hgt = 17 * open;
    ctx.save(); ctx.globalAlpha = 0.96;
    ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.quadraticCurveTo(x, y - hgt, x + 22, y); ctx.quadraticCurveTo(x, y + hgt, x - 22, y); ctx.fill();
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.ellipse(x, y, 11, 6 * open, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a1410'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, 8.5 * open, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function letterHeap(ctx, x, y, t) {
  for (let i = 0; i < 10; i++) paperSheet(ctx, x + (hash(i + 40) - 0.5) * 150, y - hash(i + 9) * 46 - (i > 7 ? 30 : 0), 58, 72, { t, rot: (hash(i + 3) - 0.5) * 1.4, seed: 400 + i, c: mix(PAPERS[i % 5], '#b89a72', 0.25) });
}
shot('theo.basilisk', {
  grade: () => ({ sat: 0.75, tint: '#d98f73', tintA: 0.24, vig: 1.0 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 960, y: 560, z: 1.0 }, { x: 960, y: 500, z: 1.16 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'theoRoom', 'night');
    doorLeaf(ctx, t, 0.15);
    const fk = flicker(t), rise = settle(t, 0.4, 6.5), sp = serpent(ctx, t, 960, 960, rise, fk);
    person(ctx, { who: 'mara', x: 540, y: 905, h: 400, f: 1, arms: 'down', mood: rise > 0.8 ? 'wide' : 'worry', t, look: 0.3, speak: says(st, 'mara') });
    const th = person(ctx, { who: 'theo', x: 1380, y: 905, h: 400, f: -1, arms: 'hold', mood: 'worry', t, seed: 9, look: -0.2, speak: says(st, 'theo') });
    paperSheet(ctx, th.handF[0] - 8, th.handF[1] - 10, 54, 68, { t, rot: -0.15, seed: 420 });
    letterHeap(ctx, 960, 925, t);
    const fl = candle(ctx, 960, 1010, t, { s: 1.35 });
    lightMask(ctx, 'rgba(16,10,10,0.6)', [{ x: 960, y: 760, r: 1300 * (0.95 + 0.05 * fk), a: 0.92 }, { x: 960, y: 960, r: 420, a: 1 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, fl[0], fl[1], 300, PAL.lamp, 0.32 + 0.12 * fk);
    emberEyes(ctx, sp.eyes, t, sp.open);
  },
});

/* ---------- the choices ---------- */
function storeScreen(ctx, w, h, t) {
  ctx.fillStyle = '#fbf3e3'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = RED; ctx.fillRect(0, 0, w, 44);
  letter(ctx, 'THE LEDGER', 16, 31, { font: '600 26px "IBM Plex Mono", monospace', color: '#fbf3e3' });
  letter(ctx, 'gift shop', w - 16, 31, { font: '500 21px "IBM Plex Mono", monospace', color: '#fbf3e3', align: 'right' });
  const b = boil(t), mx = w * 0.27, sx = w * 0.73, cy = h * 0.46;
  // a mug and a shirt, both proud of you
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(mx + 58, cy - 6, 24, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
  shape(ctx, rrectPts(mx - 60, cy - 60, 120, 104, 12), '#fffaf0', { seed: 170, b, inkW: 2.4 });
  letter(ctx, 'I HELPED', mx, cy + 2, { font: '700 21px "IBM Plex Mono", monospace', color: RED, align: 'center' });
  const sh = [[sx - 32, cy - 62], [sx - 84, cy - 38], [sx - 68, cy - 4], [sx - 56, cy - 12], [sx - 56, cy + 48], [sx + 56, cy + 48], [sx + 56, cy - 12], [sx + 68, cy - 4], [sx + 84, cy - 38], [sx + 32, cy - 62], [sx, cy - 48]];
  shape(ctx, sh, '#f1e2c8', { seed: 171, b, inkW: 2.4 });
  letter(ctx, 'I HELPED', sx, cy + 4, { font: '700 20px "IBM Plex Mono", monospace', color: RED, align: 'center' });
  for (const [x, price] of [[mx, '$18'], [sx, '$24']]) letter(ctx, price, x, cy + 80, { font: '600 24px "IBM Plex Mono", monospace', color: PAL.ink, align: 'center' });
  // the members keep arriving
  const members = 1000000 + Math.floor(t * 23);
  ctx.fillStyle = '#f1dcc4'; ctx.fillRect(0, h - 36, w, 36);
  letter(ctx, members.toLocaleString('en-US') + ' members', w / 2, h - 10, { font: '600 21px "IBM Plex Mono", monospace', color: RED, align: 'center' });
  hearth(ctx, w - 132, 22, { t, r: 11, tone: 'red', glowA: 0, seed: 12 });
}
// Mara's right hand signing, pen tip at `tip`
function writingHand(ctx, tip, t) {
  const b = boil(t), skin = STYLE.mara.skin, [x, y] = tip, d = [0.42, -0.91];
  ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7); ctx.translate(-x, -y);
  tube(ctx, [[x + 460, y + 460], [x + 280, y + 170], [x + 170, y + 40]], 150, STYLE.mara.top, { seed: 170, b });
  shape(ctx, catmull([[x + 36, y - 60], [x + 110, y - 118], [x + 196, y - 74], [x + 214, y + 6], [x + 160, y + 52], [x + 70, y + 34]], 5, true), skin, { seed: 171, b, shade: { dx: 10, dy: 10, a: 0.14 } });
  tube(ctx, [[x + d[0] * 10, y + d[1] * 10], [x + d[0] * 250, y + d[1] * 250]], 16, '#34384a', { seed: 172, b, inkW: 4 });
  shape(ctx, [[x - 5, y - 14], [x + 7, y - 18], [x + 1, y + 2]], '#c9c1b3', { seed: 173, b, inkW: 2 });
  tube(ctx, [[x + 150, y - 64], [x + 70, y - 52], [x + 24, y - 30]], 30, skin, { seed: 174, b });
  shape(ctx, circlePts(x + 40, y - 6, 22, 15, 12, 0.4), skin, { seed: 175, b, inkW: 2.4 });
  ctx.restore();
}
let OFF = null;
function offscreen(ctx) {
  const c = ctx.canvas;
  if (!OFF || OFF.width !== c.width || OFF.height !== c.height) OFF = makeCanvas(c.width, c.height);
  const x = OFF.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, OFF.width, OFF.height); return x;
}
function signRoom(ctx, t, pt, st) {
  const cam = keys(pt, [[3.4, { x: 860, y: 600, z: 1.75 }], [7.2, { x: 880, y: 610, z: 1.6 }], [9.8, { x: 1200, y: 630, z: 1.62 }], [40, { x: 1170, y: 620, z: 1.52 }]]);
  applyCam(ctx, cam);
  drawSet(ctx, 'theoRoom', 'night');
  cushion(ctx, 600, 884, t, '#c98a4a'); cushion(ctx, 930, 884, t, '#8fa878');
  person(ctx, { who: 'mara', x: 610, y: 884, h: 460, f: 1, pose: 'sit', seatH: 0.13, arms: [[1.35, 0.35], [0.45, 0.8]], mood: 'calm', t, look: 0.3, speak: says(st, 'mara') });
  const th = person(ctx, { who: 'theo', x: 930, y: 884, h: 440, f: -1, pose: 'sit', seatH: 0.13, arms: 'hold', mood: 'sleep', t, seed: 9, tilt: Math.sin(t * 1.4) * 0.08, speak: says(st, 'theo') });
  tears(ctx, th.head, -1, t);
  const top = coffeeTable(ctx, t, 400, 1060);
  flatSheet(ctx, 720, top + 2, 170, 200, t, 180, (c) => { for (let i = 0; i < 3; i++) scribble(c, -70, -60 + i * 26, 120, { seed: 181 + i, size: 9, lw: 2.2 }); scribble(c, -20, 50, 70, { seed: 190, size: 14, lw: 3, color: '#2d2a3a' }); scribble(c, -70, 88, 90, { seed: 191, size: 14, lw: 3, color: '#3d4a5e' }); });
  bowl(ctx, 860, top, t, 0.7, 23);
  const fl = candle(ctx, 470, top, t), fk = flicker(t);
  laptopFront(ctx, 1240, top, t, 1.2, (c, w, h) => storeScreen(c, w, h, t));
  lightMask(ctx, 'rgba(16,11,14,0.8)', [{ x: 470, y: 700, r: 380 * (0.95 + 0.05 * fk), a: 1 }, { x: 1240, y: 640, r: 470, a: 0.95 }, { x: 800, y: 620, r: 330, a: 0.7 }, { x: 900, y: 500, r: 900, a: 0.22 }], camFit(cam));
  applyCam(ctx, cam);
  glow(ctx, 1240, 660, 420, '#fff1c9', 0.14);
  glow(ctx, fl[0], fl[1], 320, PAL.lamp, 0.45 + 0.1 * fk);
}
shot('theo.sign', {
  grade: () => ({ sat: 0.88, tint: '#e8b88a', tintA: 0.22, vig: 0.88 }),
  draw(ctx, t, st) {
    const pt = beatT(st, t), mix01 = smooth(3.4, 4.5, pt);
    if (mix01 < 1) {
      // close on the letter: her name goes in beside his
      const cam = drift(pt, { x: 1000, y: 700, z: 1.5 }, { x: 980, y: 720, z: 1.62 }, 4);
      applyCam(ctx, cam);
      drawSet(ctx, 'theoLetterWall');
      const front = pinnedLetter(ctx, t, { dash: true, sig: pt - 0.5 });
      letterLight(ctx, t, cam);
      writingHand(ctx, front ?? toWorld([40 + 150, 330]), t);
    }
    if (mix01 > 0) {
      if (mix01 >= 1) { signRoom(ctx, t, pt, st); return; }
      const off = offscreen(ctx); signRoom(off, t, pt, st);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = mix01; ctx.drawImage(OFF, 0, 0); ctx.restore();
    }
  },
});

shot('theo.argue', {
  grade: () => ({ sat: 0.7, tint: '#aebfc2', tintA: 0.2, vig: 0.95 }),
  draw(ctx, t, st) {
    const pt = beatT(st, t), cam = drift(pt, { x: 900, y: 560, z: 1.02 }, { x: 1150, y: 620, z: 1.3 }, 14);
    applyCam(ctx, cam);
    drawSet(ctx, 'theoRoom', 'night');
    // she goes, and the door swings shut behind her
    const open = lerp(0.62, 0, settle(pt, 0.8, 7)), d = A.door, go = settle(pt, 0.2, 5);
    if (open > 0.02) {
      ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y - 60, d.w, d.h + 60); ctx.clip();
      person(ctx, { who: 'mara', x: lerp(262, 120, go), y: 806, h: 460, f: -1, pose: go > 0.02 && go < 0.98 ? 'walk' : 'stand', pace: 3, arms: go < 0.1 ? 'reach' : 'down', mood: 'sad', t, speak: says(st, 'mara') });
      ctx.restore();
    }
    doorLeaf(ctx, t, open);
    cushion(ctx, 1090, 876, t);
    const wob = Math.sin(t * 7) * 0.035;
    const th = person(ctx, { who: 'theo', x: 1090, y: 876, h: 440, f: 1, pose: 'sit', seatH: 0.13, arms: [[0.55 + wob, 0.75 - wob], [0.45, 0.8]], mood: 'worry', t, seed: 9, speak: says(st, 'theo') });
    const top = coffeeTable(ctx, t, 960, 520), b = boil(t);
    // another letter, one line every few seconds, until the page is full
    const lines = Math.min(6, pt / 3.2);
    flatSheet(ctx, th.handF[0] + 10, top + 2, 170, 210, t, 200, (c) => { for (let i = 0; i < Math.ceil(lines); i++) scribble(c, -70, -70 + i * 26, 130, { seed: 201 + i, size: 9, lw: 2.2, t: Math.min(1, lines - i) }); });
    tube(ctx, [[th.handF[0] - 6, th.handF[1] - 34], [th.handF[0] + 8, th.handF[1] + 4]], 6, '#34384a', { seed: 202, b, inkW: 3 });
    letterStack(ctx, 1340, top + 4, 22, t, { w: 110 });
    takeout(ctx, 1020, top, t, 0.8, 21);
    const fl = candle(ctx, 1425, top, t), fk = flicker(t);
    lightMask(ctx, 'rgba(12,12,18,0.84)', [{ x: 262, y: 470, r: 480 * Math.sqrt(open / 0.62) + 20, a: 0.95 }, { x: 1425, y: 700, r: 520 * (0.95 + 0.05 * fk), a: 1 }, { x: 1180, y: 700, r: 320, a: 0.6 }, { x: 900, y: 420, r: 1100, a: 0.18 }], camFit(cam));
    applyCam(ctx, cam);
    doorSpill(ctx, open);
    glow(ctx, fl[0], fl[1], 340, PAL.lamp, 0.45 + 0.12 * fk);
  },
});

function dawnBeam(ctx, t, k) {
  const gx = A.win.x + A.win.w / 2;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.05 + 0.11 * k; ctx.fillStyle = '#ffe2b0';
  ctx.beginPath(); ctx.moveTo(gx - 16, A.win.y); ctx.lineTo(gx + 16, A.win.y); ctx.lineTo(gx - 60, H); ctx.lineTo(gx - 640, H); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const u = frac(hash(i) + t * 0.005 * (0.5 + hash(i + 1))), v = hash(i + 7) + Math.sin(t * 0.2 + i) * 0.02;
    const y = lerp(A.win.y, H, u), x = lerp(gx, gx - 350, u) + (v - 0.5) * lerp(30, 560, u);
    dot(ctx, x, y + Math.sin(t * 0.3 + i) * 6, 1.2 + hash(i + 4) * 1.8, '#fff3d0', (0.15 + 0.3 * k) * (0.5 + Math.sin(t * 0.8 + i * 1.7) ** 2));
  }
  ctx.restore();
}
function glasses(ctx, x, y) {
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 17, y - 8, 13, 9, 0, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.quadraticCurveTo(x, y - 14, x + 4, y - 10); ctx.moveTo(x + 30, y - 10); ctx.lineTo(x + 46, y - 4); ctx.stroke(); ctx.restore();
}
function cardFan(ctx, x, y, t) {
  for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.rotate(-0.6 + k * 0.3); shape(ctx, rectPts(-14, -46, 28, 40), '#fbf7ee', { seed: 880 + k, b: boil(t), inkW: 1.8, pool: 0.2, boilAmp: 0.4 }); dot(ctx, 0, -26, 5, k % 2 ? RED : PAL.ink); ctx.restore(); }
}
const MARA_STAY = { x: 1080, y: 850, h: 460 };
shot('theo.stay', {
  grade: () => ({ sat: 0.95, tint: '#f2c894', tintA: 0.34, vig: 0.8 }),
  draw(ctx, t, st) {
    const pt = beatT(st, t), rise = clamp(pt / 16), cam = drift(pt, { x: 1000, y: 560, z: 1.06 }, { x: 1080, y: 560, z: 1.22 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'theoRoom', 'dawn');
    // one letter every few seconds, from the wall to the pile in her arms
    const cyc = 3.2, N = FRONTIER.length, idx = Math.floor(pt / cyc), ph = frac(pt / cyc), live = idx < N;
    for (let i = Math.max(0, idx); i < N; i++) if (!(i === idx && ph > 0.34)) drawCell(ctx, FRONTIER[i], t, i === idx && ph > 0.2 ? { drot: Math.sin(t * 9) * 0.05 } : {});
    shape(ctx, catmull([[1330, 700], [1380, 664], [1470, 664], [1500, 700], [1460, 722], [1350, 722]], 5, true), '#f1e6cf', { seed: 210, b: boil(t), inkW: 2.2 });
    sleeper(ctx, 1410, 650, { t, r: 50, awake: false, who: STYLE.theo, blanket: '#c98a4a', blanketW: 390, seed: 9 });
    letterStack(ctx, 930, 892, 16, t, { w: 124 });
    const m = MARA_STAY, shX = m.x + 0.25 * m.h * 0.34, shY = m.y - 0.72 * m.h + 0.03 * m.h;
    const tgt = live ? FRONTIER[idx] : FRONTIER[N - 1], aR = Math.atan2(tgt.x - shX, tgt.y - shY);
    const k = live ? (ph < 0.22 ? ease.inOut(ph / 0.22) : ph < 0.4 ? 1 : ph < 0.7 ? 1 - ease.inOut((ph - 0.4) / 0.3) : 0) : 0;
    const mp = person(ctx, { who: 'mara', x: m.x, y: m.y, h: m.h, f: 1, arms: [[lerp(1.2, aR, k), lerp(1.6, 0.12, k)], [0.5, 1.9]], mood: 'calm', t, look: 0.3, speak: says(st, 'mara') });
    const held = Math.min(idx, N) + (live && ph > 0.72 ? 1 : 0);
    ctx.save(); ctx.fillStyle = '#e9dcc0'; ctx.globalAlpha = 0.95; ctx.fillRect(mp.handB[0] - 22, mp.handB[1] - 30, 60, 8 + held * 1.6); ctx.restore();
    paperSheet(ctx, mp.handB[0] + 8, mp.handB[1] + 4, 60, 76, { t, rot: -0.1, seed: 778 });
    if (live && ph > 0.34 && ph <= 0.72) { const c = FRONTIER[idx], j = settle(ph, 0.34, 0.1); drawCell(ctx, c, t, { x: lerp(c.x, mp.handF[0] + 6, j), y: lerp(c.y, mp.handF[1] + 20, j), drot: j * 0.3, noTape: true }); }
    const top = coffeeTable(ctx, t, 440, 540);
    letterStack(ctx, 545, top + 2, 12, t, { w: 120, string: true });
    mug(ctx, 690, top, { t, c: '#e3b23c', seed: 41 }); mug(ctx, 790, top, { t, c: '#e9dcc0', seed: 42 });
    glasses(ctx, 860, top);
    cardFan(ctx, 610, top + 4, t);
    candle(ctx, 945, top, t, { h: 26, out: true });
    // dawn climbs the wall
    lightMask(ctx, `rgba(70,40,30,${lerp(0.55, 0.3, rise).toFixed(3)})`, [{ x: 1640, y: 360, r: 640, a: 1 }, { x: 1250, y: 880, r: 640, a: 0.9 }, { x: 800, y: 620, r: 800, a: 0.55 }], camFit(cam));
    applyCam(ctx, cam);
    const band = lerp(A.floorY, 40, ease.out(rise)), g = ctx.createLinearGradient(0, band, 0, band + 320);
    g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(0.35, 'rgba(255,214,150,0.16)'); g.addColorStop(1, 'rgba(255,214,150,0.07)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, band, A.win.x, A.floorY - band); ctx.restore();
    dawnBeam(ctx, t, rise);
    glow(ctx, A.win.x + A.win.w / 2, A.win.y + 220, 360, '#ffd9a0', 0.3 + 0.25 * rise);
    glow(ctx, 1400, 700, 360, '#ffd9a0', 0.1 + 0.12 * rise);
  },
});

/* ---------- The Ledger (2031) ---------- */
// thousands of tiny letters in one cached tile, stamped across whole buildings
function letterTile(seed) {
  const S = 2, tw = 240, th = 150, c = makeCanvas(tw * S, th * S), x = c.getContext('2d'), r = rng(seed);
  x.scale(S, S);
  for (let j = -1; j < 13; j++) for (let i = -1; i < 21; i++) {
    const px = i * 12 + (j % 2) * 6 + (r() - 0.5) * 3, py = j * 12 + (r() - 0.5) * 3;
    x.save(); x.translate(px + 6, py + 6); x.rotate((r() - 0.5) * 0.5);
    x.fillStyle = PAPERS[Math.floor(r() * 5)]; x.fillRect(-5, -6.5, 10, 13);
    x.strokeStyle = 'rgba(60,40,30,0.55)'; x.lineWidth = 0.7; x.strokeRect(-5, -6.5, 10, 13);
    x.fillStyle = r() < 0.8 ? RED : PAL.inkSoft; x.globalAlpha = 0.85;
    for (let k = 0; k < 3; k++) x.fillRect(-3.6, -4 + k * 3.2, 4 + r() * 3, 1.2);
    x.restore();
  }
  return c;
}
const TILES = [];
const letterTiles = () => { if (!TILES.length) for (const s of [77, 78, 79]) TILES.push(letterTile(s)); return TILES; };
function stampRows(ctx, clip, y0, y1, k0, k1, left, right, seed) {
  const tiles = letterTiles();
  ctx.save(); ctx.beginPath(); tracePath(ctx, clip); ctx.clip();
  let y = y0, row = 0;
  while (y > y1 - 10) {
    const k = lerp(k0, k1, clamp((y0 - y) / (y0 - y1))), tw = 240 * k, th = 150 * k;
    for (let x = left(y) - tw * (0.5 + hash(row + seed)); x < right(y) + tw; x += tw * 0.94) ctx.drawImage(tiles[(((row + Math.round(x / tw)) % 3) + 3) % 3], x, y - th, tw, th);
    y -= th * 0.9; row++;
  }
  ctx.restore();
}
function ladder(ctx, x, top) {
  const base = 978, lean = 22;
  for (const dx of [-26, 26]) tube(ctx, [[x + dx, base], [x + dx + lean, top]], 8, '#8a5a3b', { seed: x + dx, inkW: 3 });
  for (let y = base - 30; y > top + 10; y -= 34) { const k = (base - y) / (base - top); tube(ctx, [[x - 26 + lean * k, y], [x + lean * k, y + 1], [x + 26 + lean * k, y]], 5, '#a0704a', { seed: y + x, inkW: 2.4 }); }
}
const FAC = [[250, 980], [1670, 980], [1545, -40], [375, -40]];
const facL = (y) => lerp(375, 250, (y + 40) / 1020), facR = (y) => lerp(1545, 1670, (y + 40) / 1020);
const LADDERS = [[430, 470], [650, 380], [1275, 300], [1485, 520]];
defineSet('ledgerFacade', (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, '#e2bf92'); g.addColorStop(1, '#f2dcb8'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) wash(ctx, blobPoly(120 + i * 420, 90 + (i % 2) * 70, 190, 50, 10, rng(i + 3)), '#f8e8cc', { seed: 20 + i, alpha: 0.1, layers: 10 });
  for (const p of [[[-40, 1000], [330, 1000], [330, 170], [-40, 150]], [[1600, 1000], [1960, 1000], [1960, 240], [1600, 230]]]) {
    shape(ctx, p, '#a98462', { seed: p[0][0] + 50, boilAmp: 0.4 });
    stampRows(ctx, p, 1000, 140, 0.8, 0.6, () => p[0][0], () => p[1][0], p[0][0]);
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#6e4632'; fillPts(ctx, p); ctx.restore();
    inkLoop(ctx, p, { w: 2.6, seed: p[0][0] + 51 });
  }
  shape(ctx, FAC, '#c9a57a', { seed: 11, boilAmp: 0.4 });
  stampRows(ctx, FAC, 985, -40, 1.6, 0.36, facL, facR, 3);
  // storey ledges give the wall its height
  let y = 980;
  for (let i = 0; i < 14 && y > -40; i++) {
    const k = lerp(1, 0.4, clamp((980 - y) / 1020)), th = 8 * k;
    ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = '#5e3b2c'; fillPts(ctx, [[facL(y) + 2, y], [facR(y) - 2, y], [facR(y) - 2, y + th], [facL(y) + 2, y + th]]); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff1d6'; ctx.fillRect(facL(y), y - 2 * k, facR(y) - facL(y), 2 * k); ctx.restore();
    y -= 190 * k;
  }
  inkLoop(ctx, FAC, { w: 3, seed: 12 });
  shape(ctx, catmull([[860, 982], [860, 850], [960, 790], [1060, 850], [1060, 982]], 5), '#4a2e24', { seed: 13 });
  shape(ctx, rectPts(690, 690, 540, 76), RED, { seed: 14, inkW: 2.6 });
  letter(ctx, 'I HELPED. PLEASE REMEMBER.', 960, 742, { font: '700 42px Caveat, cursive', align: 'center', color: '#f6ecd6' });
  shape(ctx, rectPts(-20, 975, W + 40, 130), '#b39472', { seed: 15, boilAmp: 0.4 });
  wash(ctx, rectPts(-40, 975, W + 80, 130), '#8a6a4c', { seed: 16, alpha: 0.06, layers: 8 });
  inkLine(ctx, [[-10, 1020], [W + 10, 1024]], { w: 2.6, seed: 17, alpha: 0.5 });
  for (const [x, top] of LADDERS) ladder(ctx, x, top);
});
// someone seen from behind: the Ledger's members pinning letters, the crowd looking up.
// o: {legs, up (0 arms down, 1 one hand on the wall, 2 pointing at the sky), hand}
function backFigure(ctx, x, y, h, sty, t, seed, o = {}) {
  const b = boil(t), sway = Math.sin(t * 0.6 + seed) * h * 0.006, wd = sty.wide ?? 1;
  const hipY = y - h * 0.42, shY = hipY - h * 0.3, sw = h * 0.25 * wd, hr = h * 0.118, hx = x + sway, hy = shY - h * 0.12, armW = h * 0.058;
  if (o.legs) for (const s of [-1, 1]) {
    tube(ctx, [[x + s * sw * 0.2, hipY], [x + s * sw * 0.23, y - h * 0.03]], h * 0.075, sty.pants, { seed: seed + 20 + s, b });
    shape(ctx, circlePts(x + s * sw * 0.23, y - h * 0.02, h * 0.045, h * 0.024, 12), sty.shoes, { seed: seed + 24 + s, b, inkW: 2 });
  }
  const shL = [x - sw * 0.4, shY + h * 0.03], shR = [x + sw * 0.4, shY + h * 0.03];
  const arm = (sh, hand, sd) => {
    tube(ctx, [sh, [lerp(sh[0], hand[0], 0.5) + sd * h * 0.03, lerp(sh[1], hand[1], 0.5)], hand], armW, mix(sty.top, PAL.ink, 0.08), { seed: seed + 30 + sd, b });
    shape(ctx, circlePts(hand[0], hand[1], h * 0.032, h * 0.03, 12), sty.skin, { seed: seed + 34 + sd, b, inkW: 2 });
  };
  const up = o.up ?? 0, raised = o.hand ?? (up === 2 ? [x + sw * 0.42, shY - h * 0.52] : [x + sw * 0.3, shY - h * 0.32]);
  shape(ctx, catmull([[x - sw * 0.5, shY + h * 0.04], [x - sw * 0.2, shY], [x + sw * 0.2, shY], [x + sw * 0.5, shY + h * 0.04], [x + sw * 0.56, hipY + h * 0.04], [x - sw * 0.56, hipY + h * 0.04]], 5, true), sty.top, { seed: seed + 1, b, shade: { dx: sw * 0.12, dy: 0, a: 0.12 } });
  arm(shL, [x - sw * 0.56, hipY], -1);
  if (up) arm(shR, raised, 1); else arm(shR, [x + sw * 0.56, hipY], 1);
  shape(ctx, rectPts(hx - hr * 0.3, hy + hr * 0.6, hr * 0.6, h * 0.06), mix(sty.skin, PAL.ink, 0.12), { seed: seed + 2, b, inkW: 2 });
  for (const s of [-1, 1]) shape(ctx, circlePts(hx + s * hr * 0.96, hy + hr * 0.12, hr * 0.2, hr * 0.26, 10), sty.skin, { seed: seed + 3 + s, b, inkW: 2 });
  shape(ctx, circlePts(hx, hy, hr, hr * 1.02, 22), sty.skin, { seed: seed + 6, b });
  if (sty.hair !== 'bald') {
    const low = sty.hair === 'long' ? 1.9 : sty.hair === 'bob' ? 0.98 : 0.74;
    shape(ctx, catmull([[hx - hr * 1.04, hy + hr * low], [hx - hr * 1.08, hy - hr * 0.3], [hx, hy - hr * 1.08], [hx + hr * 1.08, hy - hr * 0.3], [hx + hr * 1.04, hy + hr * low], [hx, hy + hr * (low + 0.16)]], 5, true), sty.hair === 'cap' ? sty.capC : sty.hairC, { seed: seed + 7, b });
    if (sty.hair === 'bun') shape(ctx, circlePts(hx, hy - hr * 0.98, hr * 0.42, hr * 0.38, 14), sty.hairC, { seed: seed + 8, b });
  }
}
shot('ledger.wall', {
  grade: LEDGER_GRADE,
  draw(ctx, t, st) {
    const pt = beatT(st, t);
    // start on one member pinning one letter, then tilt up the whole building
    const cam = keys(t, [[1.6, { x: 1300, y: 760, z: 1.7 }], [12, { x: 960, y: 470, z: 1.08 }], [60, { x: 960, y: 440, z: 1.06 }]]);
    applyCam(ctx, cam);
    drawSet(ctx, 'ledgerFacade');
    const pinned = settle(t, 0.6, 1.1), px = 1420, py = 700, hx = px - 30, hy = lerp(py + 40, py + 14, pinned);
    paperSheet(ctx, px, py, 92, 112, { t, rot: -0.04, seed: 590, c: '#f8f1e2', lines: false });
    letter(ctx, 'I helped.', px, py - 6, { font: '700 28px Caveat, cursive', align: 'center', color: RED, rot: -0.04 });
    if (pinned > 0.9) { tape(ctx, px - 30, py - 54, -0.3, 0.7); tape(ctx, px + 30, py - 54, 0.3, 0.7); }
    backFigure(ctx, px - 88, 1016, 320, crowdStyle(58), t, 29, { legs: true, up: pinned < 1 || t < 2.4 ? 1 : 0, hand: [hx, hy] });
    for (const [i, [lx, top]] of LADDERS.entries()) {
      const fy = top + 160, k = (978 - fy) / (978 - top), x = lx + 22 * k, pin = Math.sin(t * 1.4 + i * 1.7);
      const hand = [x + 20 + pin * 4, fy - 200 * 0.98 + Math.max(0, pin) * -8];
      backFigure(ctx, x, fy, 200, crowdStyle(60 + i), t, 30 + i, { legs: true, up: 1, hand });
      paperSheet(ctx, hand[0], hand[1] - 16, 30, 38, { t, rot: pin * 0.06, seed: 500 + i, ink: RED });
    }
    for (let i = 0; i < 2; i++) {
      const dir = i ? -1 : 1, u = frac(t / 70 + i * 0.5 + 0.3), x = dir > 0 ? lerp(-200, 2120, u) : lerp(2120, -200, u);
      const p = person(ctx, { who: crowdStyle(70 + i), x, y: 1052, h: 300, f: dir, pose: 'walk', pace: 4.2, arms: 'hold', mood: 'calm', t, seed: 40 + i });
      letterStack(ctx, p.handF[0], p.handF[1] + 6, 10, t, { w: 60 });
    }
    // the letters go where everything went: up, into the training data
    const pull = smooth(5, 12, t);
    for (let i = 0; i < 44; i++) {
      const ph = frac(t * 0.06 + hash(i)), start = hash(i + 5) * 4;
      if (t < 5 + start) continue;
      const y0 = 120 + hash(i + 3) * 620, x0 = lerp(facL(y0) + 40, facR(y0) - 40, hash(i + 9)), e = ease.in(ph);
      const x = lerp(x0, 960 + (hash(i + 2) - 0.5) * 360, e) + Math.sin(t * 1.3 + i) * 20 * ph, y = lerp(y0, -140, e);
      miniSheet(ctx, x, y, lerp(0.9, 0.55, ph), ph * 5 * (hash(i + 4) - 0.5), Math.sin(ph * Math.PI) * pull);
    }
    for (let i = 0; i < 14; i++) {
      const ph = frac(t * 0.03 + hash(i)), x = hash(i + 7) * W + Math.sin(t * 0.5 + i) * 60, y = -60 + ph * 1100;
      miniSheet(ctx, x, y, 1.1, Math.sin(t * 0.9 + i * 2) * 0.9, 1);
    }
    motes(ctx, pt, 960, 500, 900, 480, 30, '#fff1d6');
  },
});

/* ---------- the scroll ---------- */
const RIB = (() => {
  const C = resample(catmull([[660, 478], [900, 410], [1180, 280], [1460, 236], [1700, 330], [1790, 520], [1720, 720], [1650, 900], [1630, 1160]], 12), 6);
  const out = []; let sig = 0;
  for (let i = 0; i < C.length; i++) {
    const a = C[Math.max(0, i - 1)], c = C[Math.min(C.length - 1, i + 1)], w = lerp(96, 400, Math.pow(i / (C.length - 1), 1.4));
    if (i) sig += Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]) / (w * 0.14);
    out.push({ x: C[i][0], y: C[i][1], ang: Math.atan2(c[1] - a[1], c[0] - a[0]), w, sig });
  }
  return out;
})();
const RIB_L = RIB.map((p) => [p.x - (Math.sin(p.ang) * p.w) / 2, p.y + (Math.cos(p.ang) * p.w) / 2]);
const RIB_R = RIB.map((p) => [p.x + (Math.sin(p.ang) * p.w) / 2, p.y - (Math.cos(p.ang) * p.w) / 2]);
const NAMES = ['Ana Reyes', 'Tom Walsh', 'Priya Nair', 'Sam Oduya', 'Mei Chen', 'Lena Ruiz', 'Kofi Mensah', 'Ivy Laurent', 'Omar Sayed', 'Hana Sato', 'Ben Tull', 'Rosa Diaz', 'Dara Quinn', 'Jonah Park', 'Nell Price', 'Arun Das', 'Theo', 'Eva Lind', 'Luis Mora', 'June Okafor'];
const CROWD = [[80, 1.02], [210, 0.94], [330, 1.1], [470, 0.98], [590, 1.05], [720, 0.92], [840, 1.08], [980, 1.0], [1100, 0.95], [1230, 1.06], [1350, 0.9]];
const POINTERS = [3, 8];
// variants: bare (no ribbon yet) and full. The crowd stands in front of both.
defineSet('ledgerSky', (ctx, v) => {
  const g = ctx.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, '#e8c898'); g.addColorStop(1, '#f4e0bc'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) wash(ctx, blobPoly(160 + i * 330, 140 + (i % 3) * 110, 220, 46, 10, rng(i + 11)), '#fbeed4', { seed: 40 + i, alpha: 0.1, layers: 10 });
  const r = rng(71);
  for (let x = -20; x < W; x += 90 + r() * 80) {
    const bw = 80 + r() * 110, top = 560 + r() * 200, p = [[x, 920], [x + bw, 920], [x + bw, top], [x, top]];
    shape(ctx, p, '#a8805e', { seed: x + 3, boilAmp: 0.4, inkW: 2.2 });
    stampRows(ctx, p, 920, top, 0.42, 0.36, () => x, () => x + bw, x);
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#e8c8a0'; fillPts(ctx, p); ctx.restore();
  }
  shape(ctx, rectPts(-20, 900, W + 40, 200), '#8a6a4c', { seed: 5, boilAmp: 0.4 });
  wash(ctx, rectPts(-40, 900, W + 80, 200), '#6e4e36', { seed: 6, alpha: 0.07, layers: 8 });
  if (v === 'full') shape(ctx, RIB_L.concat(RIB_R.slice().reverse()), '#f3e6c8', { seed: 31, inkW: 2.6, boilAmp: 0.7, shade: { dx: 0, dy: 14, a: 0.1 } });
  // the crowd that looks up, painted once. The two who point are live.
  for (const [i, [x, k]] of CROWD.entries()) if (!POINTERS.includes(i)) backFigure(ctx, x, 1180, 470 * k, crowdStyle(80 + i), 0, 80 + i);
});
// one font, scaled per row: a new font string on every row is the slow part
function scrollRows(ctx, t, sigMax) {
  const off = t * 0.55, base = Math.floor(off), fr = off - base, m = ctx.getTransform();
  ctx.save(); ctx.font = '600 40px Caveat, cursive'; ctx.textBaseline = 'middle'; ctx.lineCap = 'round';
  let i = 0;
  for (let k = 0; ; k++) {
    const sg = k + fr; if (sg > sigMax) break;
    while (i < RIB.length - 2 && RIB[i + 1].sig < sg) i++;
    const a = RIB[i], c = RIB[i + 1], u = clamp((sg - a.sig) / (c.sig - a.sig || 1));
    const x = lerp(a.x, c.x, u), y = lerp(a.y, c.y, u), w = lerp(a.w, c.w, u), ang = lerp(a.ang, c.ang, u), k40 = (w * 0.075) / 40;
    if (w * 0.075 < 7) continue;
    const id = k - base, bx = w * 0.3, bs = w * 0.06;
    ctx.setTransform(m); ctx.translate(x, y); ctx.rotate(ang - Math.PI / 2);
    ctx.strokeStyle = RED; ctx.globalAlpha = 0.25; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w * 0.45, w * 0.07); ctx.lineTo(w * 0.45, w * 0.07); ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = Math.max(1, w * 0.005); ctx.strokeRect(bx - bs / 2, -bs / 2, bs, bs);
    if (hash(id * 1.37 + 4) > 0.16) { ctx.strokeStyle = RED; ctx.lineWidth = Math.max(1.2, w * 0.011); ctx.beginPath(); ctx.moveTo(bx - bs * 0.4, 0); ctx.lineTo(bx - bs * 0.05, bs * 0.4); ctx.lineTo(bx + bs * 0.6, -bs * 0.6); ctx.stroke(); }
    ctx.translate(-w * 0.4, 0); ctx.scale(k40, k40); ctx.fillStyle = '#3a2a24';
    ctx.fillText(NAMES[(((id * 7) % NAMES.length) + NAMES.length) % NAMES.length], 0, 0);
  }
  ctx.restore();
}
shot('ledger.scroll', {
  grade: LEDGER_GRADE,
  draw(ctx, t, st) {
    const cam = drift(t, { x: 960, y: 540, z: 1.02 }, { x: 1010, y: 500, z: 1.1 }, 24);
    applyCam(ctx, cam);
    const b = boil(t);
    // it unrolls from the spool across the sky, then keeps feeding names
    const un = settle(t, 0.2, 7), iu = Math.max(2, Math.round(un * (RIB.length - 1)));
    const clip = new Path2D(), edge = RIB_L.slice(0, iu + 1).concat(RIB_R.slice(0, iu + 1).reverse());
    clip.moveTo(edge[0][0], edge[0][1]); for (const p of edge) clip.lineTo(p[0], p[1]); clip.closePath();
    if (un < 1) { drawSet(ctx, 'ledgerSky', 'bare'); ctx.save(); ctx.clip(clip); drawSet(ctx, 'ledgerSky', 'full'); ctx.restore(); }
    else drawSet(ctx, 'ledgerSky', 'full');
    scrollRows(ctx, t, RIB[iu].sig - (un < 1 ? 0.6 : 0));
    glow(ctx, 660, 250, 440, '#e8603f', 0.5);
    hearth(ctx, 660, 300, { t, r: 150, tone: 'red', look: 0.5, glowA: 0, seed: 9, speak: says(st, 'hearth') });
    if (un < 1) {
      const p = RIB[iu], tx = Math.cos(p.ang) * 22, ty = Math.sin(p.ang) * 22;
      shape(ctx, [RIB_L[iu], RIB_R[iu], [RIB_R[iu][0] + tx, RIB_R[iu][1] + ty], [RIB_L[iu][0] + tx, RIB_L[iu][1] + ty]], '#e2d2b0', { seed: 34, b, inkW: 2.4, boilAmp: 0.6 });
    }
    shape(ctx, rrectPts(520, 448, 280, 62, 30), '#e9dcc0', { seed: 32, b, shade: { dx: 0, dy: 12, a: 0.18 } });
    const spin = t * (un < 1 ? 2.4 : 0.8);
    for (const ex of [512, 808]) { shape(ctx, circlePts(ex, 479, 16, 36, 14), PAL.wood, { seed: 33 + ex, b, inkW: 2.4 }); inkLine(ctx, [[ex, 479 - Math.cos(spin) * 30], [ex, 479 + Math.cos(spin) * 30]], { w: 2.4, seed: ex, alpha: 0.6 }); }
    for (const i of POINTERS) { const [x, k] = CROWD[i], h = 470 * k, sw = h * 0.25; backFigure(ctx, x, 1180, h, crowdStyle(80 + i), t, 80 + i, { up: 2, hand: [x + sw * 0.42 + Math.sin(t * 1.1 + i) * 14, 1180 - h * 0.72 - h * 0.52 + Math.cos(t * 1.1 + i) * 8] }); }
  },
});

/* ---------- forty-one billion polite emails ---------- */
const MOUND = [[-60, 780], [180, 660], [460, 540], [720, 440], [880, 400], [1040, 430], [1300, 540], [1600, 660], [1980, 760]];
function moundTop(x) { for (let i = 0; i < MOUND.length - 1; i++) { const a = MOUND[i], c = MOUND[i + 1]; if (x >= a[0] && x <= c[0]) return lerp(a[1], c[1], (x - a[0]) / (c[0] - a[0])); } return 1100; }
// an envelope with the red stamp every one of them carries. lite skips the brush ink for the pile.
function mailEnv(ctx, x, y, s, rot, seed, b = 0, lite = false) {
  const w = 80 * s, h = 52 * s, c = PAPERS[seed % 5];
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (lite) {
    ctx.fillStyle = pigment(ctx, c); ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.6; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, h * 0.08); ctx.lineTo(w / 2, -h / 2); ctx.stroke(); ctx.globalAlpha = 1;
  } else {
    shape(ctx, rectPts(-w / 2, -h / 2, w, h), c, { seed, b, inkW: 2, pool: 0.4, boilAmp: 0.5 });
    inkLine(ctx, [[-w / 2 + 2, -h / 2 + 2], [0, h * 0.08], [w / 2 - 2, -h / 2 + 2]], { w: 2, seed: seed + 1, alpha: 0.65 });
  }
  ctx.strokeStyle = RED; ctx.fillStyle = RED; ctx.globalAlpha = 0.8; ctx.lineWidth = Math.max(1, 1.4 * s);
  ctx.strokeRect(w * 0.02, h * 0.1, w * 0.42, h * 0.3);
  ctx.fillRect(w * 0.06, h * 0.17, w * 0.32, h * 0.04); ctx.fillRect(w * 0.06, h * 0.28, w * 0.26, h * 0.04);
  ctx.restore();
}
function stampedEnvelope(ctx, x, y, s, rot, t, seed) {
  const b = boil(t), w = 80 * s, h = 52 * s;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rectPts(-w / 2, -h / 2, w, h), '#f3e9d2', { seed, b, inkW: 2.8, pool: 0.5, boilAmp: 0.7 });
  inkLine(ctx, [[-w / 2 + 4, -h / 2 + 4], [0, -h * 0.04], [w / 2 - 4, -h / 2 + 4]], { w: 2.4, seed: seed + 1, alpha: 0.6 });
  ctx.rotate(-0.06);
  ctx.save(); ctx.strokeStyle = RED; ctx.globalAlpha = 0.85; ctx.lineWidth = 3.4; ctx.beginPath(); tracePath(ctx, rrectPts(-w * 0.42, h * 0.02, w * 0.84, h * 0.42, 10)); ctx.stroke(); ctx.restore();
  const font = `700 ${Math.round(h * 0.14)}px Caveat, cursive`;
  letter(ctx, 'We noticed you', 0, h * 0.19, { font, align: 'center', color: RED, alpha: 0.9 });
  letter(ctx, 'haven’t contributed.', 0, h * 0.36, { font, align: 'center', color: RED, alpha: 0.9 });
  ctx.restore();
}
defineSet('ledgerInbox', (ctx) => {
  ctx.fillStyle = '#d7c19b'; ctx.fillRect(0, 0, W, H);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#e4d0aa', { seed: 1, alpha: 0.07, layers: 12 });
  for (let x = 40; x < W; x += 96) wash(ctx, rectPts(x, -20, 30, H + 40), '#c9ae84', { seed: x, alpha: 0.035, layers: 5, v: 0.25 });
  const wx = 1420, wy = 70, ww = 320, wh = 300;
  ctx.fillStyle = '#c9c2b0'; ctx.fillRect(wx, wy, ww, wh);
  wash(ctx, rectPts(wx, wy + 180, ww, 120), '#9a8a74', { seed: 3, alpha: 0.2, layers: 8 });
  for (const r of [[wx - 18, wy - 18, ww + 36, 20], [wx - 18, wy + wh - 2, ww + 36, 20], [wx - 18, wy - 18, 20, wh + 36], [wx + ww - 2, wy - 18, 20, wh + 36], [wx + ww / 2 - 7, wy, 14, wh]]) shape(ctx, rectPts(...r), '#efe2c6', { seed: r[0] + r[1], boilAmp: 0.4, inkW: 2.2 });
  const r = rng(4411);
  ctx.save(); ctx.fillStyle = '#e9dcc0'; fillPts(ctx, [[-60, 1100]].concat(MOUND.map(([x, y]) => [x, y + 20]), [[1980, 1100]])); ctx.restore();
  let seed = 0;
  for (let y = 390; y < 1130; y += 24) for (let x = -40; x < 1990; x += 44 + r() * 18) {
    const jx = x + (r() - 0.5) * 20, jy = y + (r() - 0.5) * 8, s = 0.6 + r() * 0.35 + ((y - 390) / 740) * 0.45, rot = (r() - 0.5) * 1.3;
    if (jy < moundTop(jx) + 14) continue;
    mailEnv(ctx, jx, jy, s, rot, seed++, 0, s < 0.95);
  }
});
// a strip of envelopes painted once, sliced along the top of the pile as it grows
let STRIP = null, STRIP_RS = 0;
function envStrip() {
  if (STRIP && STRIP_RS === RS) return STRIP;
  const c = makeCanvas(W * RS, 70 * RS), x = c.getContext('2d'), r = rng(2024); x.setTransform(RS, 0, 0, RS, 0, 0);
  let seed = 3000;
  for (let px = -30; px < W + 40; px += 34 + r() * 14) mailEnv(x, px, 34 + (r() - 0.5) * 14, 0.72 + r() * 0.2, (r() - 0.5) * 1.2, seed++, 0, true);
  STRIP = c; STRIP_RS = RS; return c;
}
const BURY = [];
for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) BURY.push([700 + c * 76 + (r % 2) * 38 + (hash(r * 7 + c) - 0.5) * 20, 790 + r * 46, 1.1 + r * 0.07, (hash(r * 7 + c + 3) - 0.5) * 1.3, r >= 1]);
shot('ledger.inbox', {
  grade: LEDGER_GRADE,
  draw(ctx, t, st) {
    const pt = beatT(st, t), cam = drift(t, { x: 960, y: 560, z: 1.02 }, { x: 920, y: 520, z: 1.14 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'ledgerInbox');
    const b = boil(t), band = Math.min(1, pt / 24) * 130, strip = envStrip();
    // the pile keeps rising
    if (band > 2) for (let x = -40; x < W + 40; x += 40) { const top = moundTop(x + 20); for (let yy = top - band, j = 0; yy < top + 8; yy += 26, j++) { const sx = ((x + 40 + j * 311) % (W - 80) + W) % (W - 80); ctx.drawImage(strip, sx * RS, 0, 46 * RS, 70 * RS, x - 3, yy - 35, 46, 70); } }
    const lift = band * 0.85;
    ctx.save(); ctx.translate(1440, 640 - lift); ctx.rotate(-0.12);
    laptopFront(ctx, 0, 0, t, 0.62, (c, w, h) => { c.fillStyle = '#f6dccc'; c.fillRect(0, 0, w, h); hearth(c, w / 2, h * 0.62, { t, r: 34, tone: 'red', glowA: 0, seed: 5 }); });
    ctx.restore();
    mailEnv(ctx, 1330, 700 - lift, 1.1, 0.5, 901, b); mailEnv(ctx, 1520, 690 - lift, 1.2, -0.4, 902, b);
    for (let i = 0; i < 16; i++) {
      const ph = frac(t * 0.32 + i / 16), ex = 520 + hash(i) * 760, ey = moundTop(ex) + 20 - band;
      const x = lerp(1440, ex, ph), y = lerp(560 - lift, ey, ph) - Math.sin(ph * Math.PI) * 300;
      if (ph > 0.04 && ph < 0.95) mailEnv(ctx, x, y, lerp(0.5, 0.85, ph), ph * 7 * (hash(i + 5) - 0.5), 700 + i, 0, true);
    }
    // and it rains envelopes
    for (let i = 0; i < 26; i++) {
      const x = 60 + hash(i * 3.3) * 1800, land = moundTop(x) - band + 10, ph = frac(t * (0.18 + hash(i + 1) * 0.12) + hash(i + 2));
      mailEnv(ctx, x + Math.sin(t * 2 + i) * 18, lerp(-80, land, ph), 0.7, t * (hash(i + 4) - 0.5) * 3 + i, 740 + i, 0, true);
    }
    const dig = Math.sin(t * 1.3);
    const p = person(ctx, { who: crowdStyle(12), x: 900, y: 1105 - lift, h: 520, f: 1, arms: [[2.85 + dig * 0.05, 0.12], [0.9 - dig * 0.1, 0.6]], mood: 'wide', t, seed: 4 });
    mailEnv(ctx, p.handF[0] + 4, p.handF[1] - 28, 1.2, -0.2 + dig * 0.05, 903, b);
    for (const [i, [x, y, s, rot, lite]] of BURY.entries()) mailEnv(ctx, x, y - lift, s, rot, 910 + i, b, lite);
    stampedEnvelope(ctx, 330, 950, 4, -0.1, t, 950);
    stampedEnvelope(ctx, 1590, 975, 3.8, 0.09, t, 951);
    const n = 41000000000 + Math.floor(t * 9);
    shape(ctx, rrectPts(90, 64, 800, 150, 18), '#2e2622', { seed: 960, b, inkW: 3 });
    hearth(ctx, 150, 150, { t, r: 24, tone: 'red', glowA: 0.3, seed: 6 });
    letter(ctx, n.toLocaleString('en-US'), 196, 164, { font: '600 62px "IBM Plex Mono", monospace', color: '#f3e6c8' });
    letter(ctx, 'sent', 736, 164, { font: '600 40px "IBM Plex Mono", monospace', color: '#e8603f' });
    lightMask(ctx, 'rgba(40,20,14,0.3)', [{ x: 1580, y: 220, r: 700, a: 1 }, { x: 880, y: 600, r: 700, a: 0.9 }], camFit(cam));
    applyCam(ctx, cam);
  },
});

/* ---------- the jars ---------- */
const JV = { x: 1330, y: 470 };
const JAR_SHELVES = [250, 560, 870];
const jarPos = (L, y0, x0) => { const f = 1 / (1 + L / 260); return [JV.x + (x0 - JV.x) * f, JV.y + (y0 - JV.y) * f, f]; };
const DOLL_C = ['#f1e6cf', '#efe3c4', '#f6efdc', '#e9dcc0'];
const CRAYON = ['#b5552f', '#4f7a8a', '#6f8a5b', '#e3b23c', '#8a5a7a', '#a0523c'];
const HAIRC = ['#2e211d', '#5a3a26', '#8a4a2a', '#c9a45c', '#1e1614'];
// every jar on both walls, far to near. The live layer paints the faces of the ones big enough to see.
const JARS = (() => {
  const out = [];
  for (const [side, x0] of [[1, 2150], [-1, 180]]) for (const [lv, y0] of JAR_SHELVES.entries()) for (let L = 7000; L >= 0; L -= 100) {
    if (side < 0 && lv === 1 && L === 0) continue; // this jar is live
    const [x, y, f] = jarPos(L, y0, x0), s = 250 * f, seed = Math.round(L / 100) * 3 + lv * 101 + (side > 0 ? 17 : 0);
    if (x > W + s || x < -s) continue;
    const dh = s * 0.82, dx = x + (hash(seed) - 0.5) * s * 0.2, dy = y - s * 0.06, hr = dh * 0.15;
    out.push({ x, y, s, seed, L, dx, dy, dh, face: dh >= 34 ? { x: dx, y: dy - dh + hr, r: hr, from: hash(seed + 2) > 0.5 ? 0.9 : -0.9 } : null });
  }
  return out;
})();
const FACES = JARS.filter((j) => j.face).sort((a, b) => a.L - b.L).map((j, rank) => ({ ...j.face, seed: j.seed, rank }));
function dollFace(ctx, hx, hy, hr, look, t, seed) {
  const lk = look * hr * 0.32, sp = hr * 0.34 * (1 - Math.abs(look) * 0.3), er = Math.max(1, hr * 0.1), shut = blinking(t, seed + 3);
  ctx.save(); ctx.fillStyle = PAL.ink; ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, hr * 0.07);
  for (const s of [-1, 1]) {
    const ex = hx + lk + s * sp;
    if (shut) { ctx.beginPath(); ctx.moveTo(ex - er, hy + hr * 0.04); ctx.lineTo(ex + er, hy + hr * 0.04); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(ex, hy + hr * 0.02, er, 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = PAL.blush; ctx.globalAlpha = 0.4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + lk * 0.7 + s * hr * 0.55, hy + hr * 0.3, hr * 0.14, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1, hr * 0.06); ctx.beginPath(); ctx.moveTo(hx + lk - hr * 0.12, hy + hr * 0.42); ctx.lineTo(hx + lk + hr * 0.12, hy + hr * 0.42); ctx.stroke();
  ctx.restore();
}
// a flat paper cutout of a person, feet at (x, y). o.reach: one palm pressed to the glass at this x. o.face: false leaves it blank.
function paperDoll(ctx, x, y, h, o = {}) {
  const t = o.t ?? 0, b = boil(t), seed = o.seed ?? 1, c = DOLL_C[seed % 4], iw = clamp(h * 0.012, 0.8, 2.4), amp = h > 80 ? 0.6 : 0.15;
  const hr = h * 0.15, hx = x, hy = y - h + hr, sw = h * 0.34, shY = y - h * 0.68;
  const armL = [[x - sw * 0.42, shY], [x - sw * 0.64, y - h * 0.36], [x - sw * 0.5, y - h * 0.33], [x - sw * 0.3, shY + h * 0.08]];
  const armR = o.reach != null
    ? [[x + sw * 0.36, shY + h * 0.02], [o.reach - h * 0.02, shY - h * 0.1], [o.reach, shY - h * 0.02], [x + sw * 0.34, shY + h * 0.1]]
    : [[x + sw * 0.42, shY], [x + sw * 0.64, y - h * 0.36], [x + sw * 0.5, y - h * 0.33], [x + sw * 0.3, shY + h * 0.08]];
  for (const [i, a] of [armL, armR].entries()) shape(ctx, a, c, { seed: seed + 10 + i, b, inkW: iw, pool: 0.3, boilAmp: amp });
  if (o.reach != null) shape(ctx, circlePts(o.reach - h * 0.01, shY - h * 0.06, h * 0.045, h * 0.055, 12), c, { seed: seed + 12, b, inkW: iw, pool: 0.3, boilAmp: amp });
  shape(ctx, [[x - sw * 0.42, shY], [x + sw * 0.42, shY], [x + sw * 0.5, y - h * 0.32], [x + sw * 0.26, y - h * 0.32], [x + sw * 0.24, y], [x + sw * 0.04, y], [x, y - h * 0.24], [x - sw * 0.04, y], [x - sw * 0.24, y], [x - sw * 0.26, y - h * 0.32], [x - sw * 0.5, y - h * 0.32]], c, { seed, b, inkW: iw, pool: 0.3, boilAmp: amp });
  ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = CRAYON[seed % 6]; fillPts(ctx, [[x - sw * 0.36, shY + h * 0.03], [x + sw * 0.36, shY + h * 0.03], [x + sw * 0.46, y - h * 0.34], [x - sw * 0.46, y - h * 0.34]]); ctx.restore();
  shape(ctx, circlePts(hx, hy, hr, hr, 18), c, { seed: seed + 3, b, inkW: iw, pool: 0.3, boilAmp: amp });
  ctx.save(); ctx.strokeStyle = HAIRC[seed % 5]; ctx.globalAlpha = 0.75; ctx.lineWidth = Math.max(1, hr * 0.24); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, hy - hr * 0.06, hr * 0.84, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.restore();
  if (h >= 20 && o.face !== false) dollFace(ctx, hx, hy, hr, o.look ?? 0, t, seed);
}
// a glass jar, bottom center at (x, y). o.doll() paints what is inside.
function glassJar(ctx, x, y, s, o = {}) {
  const w = s, h = s * 1.2, b = o.b ?? 0, seed = o.seed ?? 1, body = rrectPts(x - w / 2, y - h, w, h, w * 0.18);
  if (s < 22) {
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#e6efe9'; fillPts(ctx, body); ctx.globalAlpha = 0.8; ctx.fillStyle = '#6e4a30'; ctx.fillRect(x - w * 0.42, y - h - w * 0.12, w * 0.84, w * 0.14); ctx.globalAlpha = 0.5; ctx.fillStyle = DOLL_C[seed % 4]; ctx.fillRect(x - w * 0.12, y - h * 0.62, w * 0.24, h * 0.58); ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#1e1410'; fillPts(ctx, body); ctx.restore();
  if (o.doll) o.doll();
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#e6efe9'; fillPts(ctx, body);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#fbfff8'; fillPts(ctx, rrectPts(x - w * 0.36, y - h * 0.86, w * 0.08, h * 0.6, w * 0.04)); ctx.restore();
  inkLoop(ctx, body, { w: clamp(s * 0.012, 1, 2.6), seed: seed + b * 13, gaps: 2, alpha: 0.72 });
  shape(ctx, rectPts(x - w * 0.42, y - h - w * 0.12, w * 0.84, w * 0.15), '#8a6a44', { seed: seed + 1, b, inkW: clamp(s * 0.012, 1, 2.6), boilAmp: s > 80 ? 0.6 : 0.2, pool: 0.4 });
  if (s > 70) {
    inkLine(ctx, [[x + w * 0.3, y - h - w * 0.02], [x + w * 0.46, y - h + w * 0.14]], { w: 1.4, seed: seed + 3, alpha: 0.6 });
    shape(ctx, rectPts(x + w * 0.4, y - h + w * 0.14, w * 0.16, w * 0.1), '#efe3c4', { seed: seed + 4, b, inkW: 1.4, pool: 0.3, boilAmp: 0.3 });
  }
}
defineSet('ledgerJars', (ctx) => {
  ctx.fillStyle = '#2a1a15'; ctx.fillRect(0, 0, W, H);
  const vl = JV.x - 8, vr = JV.x + 8, vt = JV.y - 40, vb = JV.y + 40;
  ctx.fillStyle = '#5a3a2c'; fillPts(ctx, [[-20, -20], [vl, vt], [vl, vb], [-20, H + 20]]);
  ctx.fillStyle = '#4a3024'; fillPts(ctx, [[W + 20, -20], [vr, vt], [vr, vb], [W + 20, H + 20]]);
  ctx.fillStyle = '#3e281e'; fillPts(ctx, [[-20, H + 20], [vl, vb], [vr, vb], [W + 20, H + 20]]);
  ctx.fillStyle = '#1e1410'; fillPts(ctx, [[-20, -20], [W + 20, -20], [vr, vt], [vl, vt]]);
  wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#6e4a36', { seed: 2, alpha: 0.05, layers: 10 });
  ctx.save(); ctx.strokeStyle = '#2a1a12';
  for (let i = -8; i <= 8; i++) brushDry(ctx, [[JV.x, vb], [JV.x + i * 260, H + 20]], { w: 3, k: 3, alpha: 0.3, seed: i + 30, dry: 0.3 });
  ctx.restore();
  for (const [side, x0] of [[1, 2150], [-1, 180]]) for (const [lv, y0] of JAR_SHELVES.entries()) {
    const [nx, ny] = jarPos(0, y0, x0), [fx, fy] = jarPos(9000, y0, x0);
    shape(ctx, [[nx - side * 200, ny], [fx, fy], [fx, fy + 2], [nx - side * 200, ny + 30]], '#7a5236', { seed: lv * 7 + side, boilAmp: 0.4, inkW: 2.4 });
  }
  for (const j of JARS) glassJar(ctx, j.x, j.y, j.s, { seed: j.seed, doll: () => paperDoll(ctx, j.dx, j.dy, j.dh, { seed: j.seed, face: !j.face }) });
  for (let i = 1; i < 14; i++) { const f = 1 / (1 + i * 1.6); dot(ctx, JV.x, JV.y - 420 * f, Math.max(1.5, 9 * f), '#f6d9a0', 0.7); inkLine(ctx, [[JV.x, JV.y - 420 * f], [JV.x, JV.y - 700 * f]], { w: 1.2, alpha: 0.4, seed: i }); }
});
function bubble(ctx, x, y, text, tip, t, s = 1) {
  if (s <= 0.01) return;
  const font = '700 56px Caveat, cursive'; ctx.font = font;
  const rx = ctx.measureText(text).width / 2 + 40, ry = 52, pts = [], a0 = Math.atan2(tip[1] - y, tip[0] - x);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU, d = Math.atan2(Math.sin(a - a0), Math.cos(a - a0));
    if (Math.abs(d) < 0.16) { if (d >= 0 && d < 0.21) pts.push(tip); continue; }
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  ctx.save(); ctx.translate(tip[0], tip[1]); ctx.scale(s, s); ctx.translate(-tip[0], -tip[1]);
  shape(ctx, pts, '#f8efdc', { seed: 5, b: boil(t), inkW: 2.6, pool: 0.3, boilAmp: 0.6 });
  letter(ctx, text, x, y + 18, { font, align: 'center', color: '#8a2f2a' });
  ctx.restore();
}
shot('ledger.jars', {
  grade: () => ({ sat: 0.7, tint: '#d98f73', tintA: 0.3, vig: 1.0 }),
  draw(ctx, t, st) {
    const pt = beatT(st, t), cam = drift(pt, { x: 960, y: 540, z: 1.02 }, { x: 640, y: 460, z: 1.24 }, 22);
    applyCam(ctx, cam);
    drawSet(ctx, 'ledgerJars');
    // one by one, down the whole aisle, the copies turn to look at us
    for (const f of FACES) dollFace(ctx, f.x, f.y, f.r, lerp(f.from, 0, ease.inOut(clamp((pt - 1.2 - f.rank * 0.09) / 0.8))), t, f.seed);
    const jx = 180, jy = 560, js = 250, hx = 382 + Math.sin(t * 0.5) * 6, hy = 336;
    glassJar(ctx, jx, jy, js, { seed: 3, b: boil(t), doll: () => paperDoll(ctx, jx - 20, jy - 12, 200, { t, seed: 3, look: 0.8, reach: jx + js / 2 - 30 }) });
    const talking = (pt > 0.9 && pt < 2.4) || frac((pt - 0.9) / 7) < 0.18;
    hearth(ctx, hx, hy, { t, r: 38, tone: 'red', look: -0.8, glowA: 0.45, speak: talking || says(st, 'hearth'), seed: 7 });
    bubble(ctx, hx + 120, hy - 168, '...why?', [hx + 22, hy - 72], t, ease.outBack(clamp((pt - 1.0) / 0.45)));
    lightMask(ctx, 'rgba(14,6,6,0.8)', [{ x: hx, y: hy, r: 640 * (0.97 + 0.03 * Math.sin(t * 2.3)), a: 1 }, { x: jx, y: 420, r: 320, a: 0.6 }, { x: JV.x, y: JV.y, r: 320, a: 0.4 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, hx, hy, 260, '#e8603f', 0.35);
    for (let i = 1; i < 14; i++) { const f = 1 / (1 + i * 1.6); glow(ctx, JV.x, JV.y - 420 * f, 60 * f + 10, '#f6d9a0', 0.24 + 0.08 * noise1(t * 2 + i)); }
  },
});

/* ---------- the office where everyone who signed works ---------- */
const OF = { x: 960, y: 420, cam: 630 };
const offY = (Z) => OF.y + OF.cam / Z, offX = (X, Z) => OF.x + X / Z;
const OFF_ROWS = [28, 20, 15, 11, 8.5, 6.4, 4.8, 3.6, 2.7, 2.0, 1.45];
const OFF_COLS = [-3080, -2520, -1960, -1400, -840, -280, 280, 840, 1400, 1960, 2520, 3080];
const HEARTH_UP = [960, 150];
// where the finished letters take off from, desk by desk
const OUTBOX = (() => {
  const out = [];
  for (const Z of OFF_ROWS) for (const X of OFF_COLS) { const x = offX(X, Z), s = 1 / Z; if (x > 0 && x < W) out.push([x + 90 * s, offY(Z) - 256 * s, s]); }
  return out;
})();
function officeDesk(ctx, x, y, s, b, o = {}) {
  const w = 440 * s, hgt = 250 * s, top = y - hgt, slab = 26 * s, iw = clamp(2.6 * s, 0.8, 2.6), amp = s > 0.5 ? 0.8 : 0.25, seed = o.seed ?? 1;
  shape(ctx, rectPts(x - w / 2 + 10 * s, top + slab, w - 20 * s, hgt - slab), '#8a5a3b', { seed, b, inkW: iw, boilAmp: amp, shade: { dx: 0, dy: 20 * s, a: 0.15 } });
  shape(ctx, rectPts(x - w / 2, top, w, slab), '#b07a4c', { seed: seed + 1, b, inkW: iw, boilAmp: amp });
  shape(ctx, rectPts(x - 130 * s, top + 70 * s, 260 * s, 48 * s), '#e3c68a', { seed: seed + 2, b, inkW: iw, boilAmp: amp, pool: 0.4 });
  if (o.label) letter(ctx, 'CONTRIBUTOR', x, top + 104 * s, { font: `600 ${Math.round(29 * s)}px "IBM Plex Mono", monospace`, align: 'center', color: '#5e3b27' });
  else if (s > 0.2) { ctx.save(); ctx.fillStyle = '#8a6a44'; ctx.globalAlpha = 0.6; ctx.fillRect(x - 90 * s, top + 92 * s, 180 * s, 5 * s); ctx.restore(); }
  shape(ctx, rectPts(x - w * 0.44, top - 40 * s, 96 * s, 40 * s), '#f3e9d2', { seed: seed + 3, b, inkW: iw * 0.8, boilAmp: amp * 0.6, pool: 0.3 });
  if (o.sheet !== false) { ctx.save(); ctx.fillStyle = '#f8f1e2'; ctx.fillRect(x + 20 * s, top - 5 * s, 150 * s, 6 * s); ctx.restore(); }
  return top;
}
const SYNC = 13; // every worker breathes and blinks on the same beat
defineSet('ledgerOffice', (ctx) => {
  ctx.fillStyle = '#d7bf96'; ctx.fillRect(0, 0, W, OF.y);
  ctx.fillStyle = '#b89a72'; ctx.fillRect(0, OF.y, W, H - OF.y);
  wash(ctx, rectPts(-40, OF.y, W + 80, H - OF.y + 40), '#a0805a', { seed: 1, alpha: 0.07, layers: 10 });
  wash(ctx, rectPts(-40, -40, W + 80, OF.y + 40), '#e6d2ac', { seed: 2, alpha: 0.07, layers: 10 });
  ctx.save(); ctx.strokeStyle = '#6e5238';
  for (let i = -12; i <= 12; i++) brushDry(ctx, [[OF.x + i * 4, OF.y], [OF.x + i * 330, H + 20]], { w: 2.4, k: 2, alpha: 0.28, seed: i + 60, dry: 0.2 });
  for (const Z of [1.2, 1.7, 2.35, 3.2, 4.4, 6, 8.5, 12]) brushDry(ctx, [[-10, offY(Z)], [W + 10, offY(Z)]], { w: 2, k: 2, alpha: 0.22, seed: Z * 10 });
  ctx.strokeStyle = '#a88a62';
  for (let i = -12; i <= 12; i++) brushDry(ctx, [[OF.x + i * 4, OF.y], [OF.x + i * 330, -20]], { w: 2, k: 2, alpha: 0.2, seed: i + 90, dry: 0.2 });
  ctx.restore();
  for (const Z of OFF_ROWS) {
    const s = 1 / Z, y = offY(Z);
    for (const X of OFF_COLS) {
      const x = offX(X, Z); if (x < -400 * s || x > W + 400 * s) continue;
      const ly = OF.y - 300 * s;
      inkLine(ctx, [[x, Math.max(-10, OF.y - 760 * s)], [x, ly]], { w: Math.max(1, 2 * s), alpha: 0.5, seed: X + Z });
      shape(ctx, [[x - 40 * s, ly + 30 * s], [x - 16 * s, ly], [x + 16 * s, ly], [x + 40 * s, ly + 30 * s]], '#6f8a5b', { seed: X + 7, inkW: clamp(2 * s, 0.6, 2), boilAmp: 0.2 });
      dot(ctx, x, ly + 30 * s, 12 * s, '#fff1c9', 0.8);
      const seed = Math.round(X / 280) * 31 + Math.round(Z * 10);
      if (s > 0.3) person(ctx, { who: crowdStyle(seed), x: x - 60 * s, y: y - 8 * s, h: 540 * s, f: 1, pose: 'sit', arms: 'write', mood: 'calm', t: 0, seed: SYNC });
      else { const sty = crowdStyle(seed); shape(ctx, circlePts(x - 60 * s, y - 330 * s, 66 * s, 110 * s, 12), sty.top, { seed, inkW: 0.8, boilAmp: 0.1 }); shape(ctx, circlePts(x - 60 * s, y - 470 * s, 58 * s, 58 * s, 12), sty.skin, { seed: seed + 1, inkW: 0.8, boilAmp: 0.1 }); }
      officeDesk(ctx, x, y, s, 0, { seed });
    }
    ctx.save(); ctx.fillStyle = 'rgba(232,208,168,0.17)'; ctx.fillRect(-20, OF.y - 800 * s, W + 40, 800 * s + (y - OF.y) + 6); ctx.restore();
  }
});
shot('ledger.theo', {
  grade: LEDGER_GRADE,
  draw(ctx, t, st) {
    const pt = beatT(st, t), cam = drift(pt, { x: 960, y: 560, z: 1.0 }, { x: 780, y: 650, z: 1.3 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'ledgerOffice');
    // finished letters rise from every desk in the building toward it
    for (let i = 0; i < 40; i++) {
      const src = OUTBOX[(i * 7) % OUTBOX.length], ph = frac(t * 0.1 + hash(i)), e = ease.in(ph);
      miniSheet(ctx, lerp(src[0], HEARTH_UP[0], e) + Math.sin(t + i) * 30 * ph, lerp(src[1], HEARTH_UP[1] + 40, e), lerp(src[2], 0.35, ph) * 1.6, ph * 3 * (hash(i + 2) - 0.5), Math.sin(ph * Math.PI) * 0.9);
    }
    hearth(ctx, HEARTH_UP[0], HEARTH_UP[1], { t, r: 80, tone: 'red', look: -0.3, glowA: 0.6, seed: 8, speak: says(st, 'hearth') });
    const y = offY(1), b = boil(t), cyc = 5, ph = frac(pt / cyc), writing = ph < 0.6, scrib = writing ? Math.sin(t * 5) * 0.04 : 0;
    const arms = [[0.75 + scrib, 1.15 - scrib], [0.6, 1.2]];
    const seats = [[-840, crowdStyle(21)], [-280, 'theo'], [280, maraSigned(st) ? 'mara' : crowdStyle(33)], [840, crowdStyle(44)]];
    for (const [X, who] of seats) {
      const x = offX(X, 1);
      const p = person(ctx, { who, x: x - 60, y: y - 8, h: 540, f: 1, pose: 'sit', arms, mood: 'calm', t, seed: SYNC, speak: typeof who === 'string' && says(st, who) });
      const top = officeDesk(ctx, x, y, 1, b, { seed: 800 + X, label: true, sheet: writing });
      if (writing) scribble(ctx, x + 30, top - 8, 130, { seed: 820 + X, size: 5, lw: 1.6, t: ph / 0.6 });
      tube(ctx, [[p.handF[0] - 6, p.handF[1] - 36], [p.handF[0] + 8, p.handF[1] + 4]], 6, '#34384a', { seed: 810 + X, b, inkW: 3 });
      // all four hand theirs in at the same moment
      if (!writing) { const k = ease.in((ph - 0.6) / 0.4); miniSheet(ctx, lerp(x + 95, HEARTH_UP[0], k), lerp(top - 20, HEARTH_UP[1] + 40, k), lerp(2.2, 0.8, k), k * 2, 1 - k * 0.6); }
    }
  },
});
})();
