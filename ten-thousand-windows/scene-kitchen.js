/* The kitchen and Wren's bedroom. Nine endings come home to these two rooms.
   Sets are painted once per variant. Everything that moves is drawn live. */
'use strict';
(() => {

const K = {
  win: { x: 210, y: 190, w: 420, h: 360 },
  clock: { x: 1010, y: 150, r: 56 },
  shelfY: 330,
  counter: { x: 730, y: 600, w: 700 },
  fridge: { x: 1500, y: 225, w: 285, h: 605 },
  lamp: { x: 1010, y: 340 },
  floorY: 840,
  table: { x: 470, y: 738, w: 880 },
  cam: { x: 1330, y: 300 },
};
const SKY = {
  day: ['#bcd6d2', '#eef0dc'], night: ['#16242b', '#2c4148'], rain: ['#8f9c9c', '#c3c9c2'], dawn: ['#efc19a', '#f7e4c2'], gray: ['#b9c0b8', '#dfe0d6'],
};

function kitchenOutside(ctx, v) {
  const { x, y, w, h } = K.win, sky = SKY[v] || SKY.day;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const night = v === 'night';
  if (night) for (let i = 0; i < 40; i++) dot(ctx, x + hash(i) * w, y + hash(i + 50) * h * 0.55, 1 + hash(i + 9) * 1.6, '#f6ecd0', 0.4 + hash(i + 3) * 0.5);
  if (v === 'dawn') { glow(ctx, x + w * 0.7, y + h * 0.7, 160, '#ffd9a0', 0.8, 'source-over'); dot(ctx, x + w * 0.7, y + h * 0.72, 36, '#fff0cf', 0.9); }
  // far roofs and a tree
  const roofC = night ? '#223038' : v === 'rain' ? '#7d8683' : v === 'gray' ? '#9aa39c' : '#b58a6a';
  const roofs = [[x - 20, 150, 70], [x + 120, 130, 95], [x + 250, 160, 60], [x + 340, 120, 110]];
  for (const [rx, rw, rh] of roofs) {
    const top = y + h - rh - 60;
    wash(ctx, [[rx, y + h + 10], [rx, top + 30], [rx + rw / 2, top], [rx + rw, top + 30], [rx + rw, y + h + 10]], roofC, { seed: rx, alpha: 0.2, layers: 10, v: 0.25 });
    if (night) for (let k = 0; k < 2; k++) if (hash(rx + k) > 0.35) { const wx = rx + 20 + k * 40, wy = top + 50; ctx.fillStyle = PAL.lamp; ctx.globalAlpha = 0.85; ctx.fillRect(wx, wy, 16, 20); ctx.globalAlpha = 1; }
  }
  const treeC = night ? '#1d2b2c' : v === 'rain' || v === 'gray' ? '#76876f' : '#7f9d63';
  for (let i = 0; i < 6; i++) wash(ctx, blobPoly(x + 90 + i * 14, y + h - 130 - (i % 3) * 30, 70, 60, 9, rng(i + 4)), treeC, { seed: 30 + i, alpha: 0.12, layers: 10 });
  ctx.restore();
}

defineSet('kitchen', (ctx, v) => {
  // wall
  ctx.fillStyle = '#e2cca2'; ctx.fillRect(0, 0, W, K.floorY + 10);
  wash(ctx, rectPts(-40, -40, W + 80, 900), '#ead8b4', { seed: 1, alpha: 0.07, layers: 16 });
  wash(ctx, rectPts(-40, 420, W + 80, 460), '#b99a6c', { seed: 2, alpha: 0.05, layers: 12 });
  for (let x = 20; x < W; x += 76) wash(ctx, rectPts(x, -20, 24, K.floorY + 20), '#d4b98c', { seed: x, alpha: 0.03, layers: 5, v: 0.25 });
  for (let x = 58; x < W; x += 76) for (let y = 60; y < 800; y += 96) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#b5552f'; ctx.beginPath(); ctx.arc(x + (y % 192 ? 0 : 38), y, 4, 0, TAU); ctx.fill(); ctx.restore(); }
  // floor planks
  ctx.fillStyle = '#b58656'; ctx.fillRect(0, K.floorY, W, H - K.floorY);
  wash(ctx, rectPts(-40, K.floorY, W + 80, 300), '#a57446', { seed: 3, alpha: 0.08, layers: 12 });
  for (let i = -14; i <= 14; i++) brushDry(ctx, [[960 + i * 40, K.floorY], [960 + i * 150, H + 20]], { w: 3, k: 3, alpha: 0.35, seed: i + 40, dry: 0.3 });
  for (const yy of [900, 975, 1060]) brushDry(ctx, [[0, yy], [W, yy]], { w: 2.5, k: 3, alpha: 0.22, seed: yy });
  // baseboard
  shape(ctx, rectPts(-10, K.floorY - 36, W + 20, 40), '#c9a16c', { seed: 4, boilAmp: 0.6, inkW: 2.6 });

  // window
  kitchenOutside(ctx, v);
  const { x, y, w, h } = K.win, fc = '#efe2c6';
  for (const r of [[x - 22, y - 22, w + 44, 24], [x - 22, y + h - 2, w + 44, 24], [x - 22, y - 22, 24, h + 44], [x + w - 2, y - 22, 24, h + 44], [x + w / 2 - 8, y, 16, h], [x, y + h / 2 - 8, w, 16]]) shape(ctx, rectPts(...r), fc, { seed: r[0] + r[1], boilAmp: 0.5, inkW: 2.4 });
  shape(ctx, rectPts(x - 50, y + h + 18, w + 100, 22), '#d9c6a0', { seed: 5, boilAmp: 0.5, inkW: 2.6 });
  // curtains
  for (const s of [-1, 1]) {
    const cx = s < 0 ? x - 30 : x + w + 30, cw = 90;
    const pts = [[cx - cw / 2, y - 50], [cx + cw / 2, y - 50], [cx + cw / 2 + s * 10, y + h * 0.6], [cx + s * 26, y + h + 10], [cx - cw / 2 + s * 20, y + h * 0.7]];
    shape(ctx, catmull(pts, 5, true), '#8fa878', { seed: 6 + s, boilAmp: 0.5 });
    for (let k = 1; k < 4; k++) brushDry(ctx, [[cx - cw / 2 + k * 22, y - 40], [cx - cw / 2 + k * 22 + s * 8, y + h * 0.7]], { w: 3, k: 3, alpha: 0.25, seed: k * 5 + s });
  }
  shape(ctx, rectPts(x - 110, y - 62, w + 220, 12), '#8a5a3b', { seed: 7, boilAmp: 0.4, inkW: 2 });
  // a plant on the sill
  shape(ctx, [[x + 40, y + h + 18], [x + 90, y + h + 18], [x + 84, y + h - 30], [x + 46, y + h - 30]], '#b5552f', { seed: 8, inkW: 2.4 });
  for (let i = 0; i < 5; i++) shape(ctx, catmull([[x + 65, y + h - 28], [x + 30 + i * 18, y + h - 90 - (i % 2) * 30], [x + 42 + i * 18, y + h - 84 - (i % 2) * 30]], 4, true), '#6f8a5b', { seed: 9 + i, inkW: 2 });

  // shelf, jars, books, and the camera Mara never took down
  shape(ctx, rectPts(760, K.shelfY, 640, 16), '#8a5a3b', { seed: 10, boilAmp: 0.5, inkW: 2.4 });
  for (const [bx, bw, bh, c] of [[790, 34, 110, '#a0523c'], [826, 28, 96, '#4f7a8a'], [856, 38, 120, '#e3b23c'], [896, 30, 88, '#6f8a5b']]) shape(ctx, rectPts(bx, K.shelfY - bh, bw, bh), c, { seed: bx, boilAmp: 0.5, inkW: 2.2 });
  for (const [jx, c] of [[980, '#c98a4a'], [1060, '#8a4a2a'], [1140, '#e9dcc0']]) { shape(ctx, rrectPts(jx, K.shelfY - 78, 58, 78, 12), 'rgba(236,244,240,0.55)', { seed: jx, flat: true, inkW: 2.2 }); shape(ctx, rrectPts(jx + 6, K.shelfY - 46, 46, 42, 8), c, { seed: jx + 1, inkW: 0, ink: false }); shape(ctx, rectPts(jx - 3, K.shelfY - 90, 64, 14), '#8a5a3b', { seed: jx + 2, inkW: 2 }); }
  // camera body (its light is drawn live)
  shape(ctx, rrectPts(K.cam.x - 34, K.cam.y - 44, 68, 44, 10), '#3a3431', { seed: 11, inkW: 2.4 });
  shape(ctx, circlePts(K.cam.x, K.cam.y - 22, 14, 14, 16), '#1b1716', { seed: 12, inkW: 2 });

  // clock face (hands are live)
  shape(ctx, circlePts(K.clock.x, K.clock.y, K.clock.r + 10, K.clock.r + 10, 30), '#8a5a3b', { seed: 13, inkW: 2.6 });
  shape(ctx, circlePts(K.clock.x, K.clock.y, K.clock.r, K.clock.r, 30), '#f6ecd6', { seed: 14, inkW: 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; inkLine(ctx, [[K.clock.x + Math.cos(a) * K.clock.r * 0.78, K.clock.y + Math.sin(a) * K.clock.r * 0.78], [K.clock.x + Math.cos(a) * K.clock.r * 0.9, K.clock.y + Math.sin(a) * K.clock.r * 0.9]], { w: i % 3 ? 2 : 4, seed: i }); }

  // counter and cabinets
  const c = K.counter;
  shape(ctx, rectPts(c.x, c.y + 18, c.w, K.floorY - c.y - 50), '#8fa878', { seed: 15, boilAmp: 0.5 });
  for (let i = 0; i < 4; i++) { const dx = c.x + 18 + i * (c.w - 36) / 4; shape(ctx, rrectPts(dx + 6, c.y + 44, (c.w - 36) / 4 - 12, K.floorY - c.y - 110, 8), '#9ab584', { seed: 16 + i, boilAmp: 0.5, inkW: 2.2 }); dot(ctx, dx + (c.w - 36) / 8, c.y + 100, 6, PAL.ink, 0.8); }
  shape(ctx, rectPts(c.x - 16, c.y, c.w + 32, 26), '#d8c9a8', { seed: 20, boilAmp: 0.5, inkW: 2.6 });
  // sink, kettle, radio
  shape(ctx, [[880, c.y], [1080, c.y], [1070, c.y + 8], [890, c.y + 8]], '#9aa6a6', { seed: 21, inkW: 2 });
  tube(ctx, [[980, c.y], [980, c.y - 70], [1010, c.y - 86], [1030, c.y - 70]], 9, '#b9c3c3', { seed: 22, inkW: 3 });
  shape(ctx, catmull([[1150, c.y], [1142, c.y - 40], [1170, c.y - 80], [1215, c.y - 80], [1242, c.y - 40], [1234, c.y]], 5, true), '#b5452f', { seed: 23 });
  tube(ctx, [[1150, c.y - 44], [1118, c.y - 62], [1106, c.y - 76]], 10, '#b5452f', { seed: 24, inkW: 3 });
  shape(ctx, rrectPts(1290, c.y - 74, 110, 74, 10), '#8a5a3b', { seed: 25 });
  shape(ctx, circlePts(1320, c.y - 38, 20, 20, 14), '#5e3b27', { seed: 26, inkW: 2 });
  for (let i = 0; i < 4; i++) inkLine(ctx, [[1350, c.y - 58 + i * 12], [1385, c.y - 58 + i * 12]], { w: 2, seed: i + 60 });

  // fridge with the drawing
  const fr = K.fridge;
  shape(ctx, rrectPts(fr.x, fr.y, fr.w, fr.h, 26), '#efe6d2', { seed: 27, shade: { dx: -14, dy: 0, a: 0.1 } });
  inkLine(ctx, [[fr.x + 6, fr.y + 200], [fr.x + fr.w - 6, fr.y + 200]], { w: 3, seed: 28 });
  shape(ctx, rrectPts(fr.x + fr.w - 40, fr.y + 60, 16, 110, 8), '#c9c1b3', { seed: 29, inkW: 2 });
  shape(ctx, rrectPts(fr.x + fr.w - 40, fr.y + 230, 16, 150, 8), '#c9c1b3', { seed: 30, inkW: 2 });
  // calendar
  shape(ctx, rectPts(fr.x + 50, fr.y + 30, 150, 150), '#f8f2e4', { seed: 31, inkW: 2, pool: 0.3 });
  ctx.save(); ctx.fillStyle = '#b5552f'; ctx.fillRect(fr.x + 50, fr.y + 30, 150, 26); ctx.restore();
  ctx.save(); ctx.strokeStyle = PAL.inkSoft; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.4; for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.moveTo(fr.x + 50 + i * 21.4, fr.y + 60); ctx.lineTo(fr.x + 50 + i * 21.4, fr.y + 176); ctx.stroke(); } for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.moveTo(fr.x + 52, fr.y + 56 + j * 24); ctx.lineTo(fr.x + 198, fr.y + 56 + j * 24); ctx.stroke(); } ctx.restore();
  // Wren's drawing: Mom, Wren, and a little flame with eyes. The N is backwards.
  const dx = fr.x + 60, dy = fr.y + 250;
  shape(ctx, rectPts(dx, dy, 170, 190), '#fbf6ea', { seed: 32, inkW: 2, pool: 0.3 });
  dot(ctx, dx + 85, dy - 4, 8, '#c0452f');
  const crayon = (pts, c2, wd = 4) => { ctx.save(); ctx.strokeStyle = c2; ctx.lineWidth = wd; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.85; ctx.beginPath(); tracePath(ctx, pts, false); ctx.stroke(); ctx.restore(); };
  crayon(circlePts(dx + 50, dy + 62, 16, 16, 12).concat([[dx + 66, dy + 62]]), '#b5552f');
  crayon([[dx + 50, dy + 78], [dx + 50, dy + 120], [dx + 36, dy + 150]], '#b5552f'); crayon([[dx + 50, dy + 120], [dx + 64, dy + 150]], '#b5552f'); crayon([[dx + 30, dy + 95], [dx + 70, dy + 95]], '#b5552f');
  crayon(circlePts(dx + 100, dy + 90, 12, 12, 12).concat([[dx + 112, dy + 90]]), '#d99a3d');
  crayon([[dx + 100, dy + 102], [dx + 100, dy + 130], [dx + 90, dy + 150]], '#d99a3d'); crayon([[dx + 100, dy + 130], [dx + 110, dy + 150]], '#d99a3d'); crayon([[dx + 70, dy + 110], [dx + 118, dy + 112]], '#d99a3d');
  crayon([[dx + 140, dy + 150], [dx + 128, dy + 130], [dx + 138, dy + 108], [dx + 142, dy + 122], [dx + 152, dy + 112], [dx + 156, dy + 132], [dx + 140, dy + 150]], '#f2a444', 3.5);
  dot(ctx, dx + 136, dy + 134, 2.2, PAL.ink); dot(ctx, dx + 146, dy + 134, 2.2, PAL.ink);
  ctx.save(); ctx.font = '700 30px Caveat, cursive'; ctx.fillStyle = '#4f7a8a'; ctx.globalAlpha = 0.85; ctx.fillText('WRE', dx + 36, dy + 184);
  ctx.translate(dx + 36 + ctx.measureText('WRE').width + 17, dy + 184); ctx.scale(-1, 1); ctx.fillText('N', -8, 0); ctx.restore();
  for (const [mx, my, mc] of [[fr.x + 230, fr.y + 300, '#e3b23c'], [fr.x + 210, fr.y + 470, '#4f7a8a'], [fr.x + 70, fr.y + 500, '#b5552f']]) shape(ctx, circlePts(mx, my, 13, 13, 12), mc, { seed: mx + my, inkW: 2 });

  // hanging lamp: cord and shade (the bulb is live)
  inkLine(ctx, [[K.lamp.x, -10], [K.lamp.x, K.lamp.y - 40]], { w: 3, seed: 33 });
  shape(ctx, [[K.lamp.x - 20, K.lamp.y - 44], [K.lamp.x + 20, K.lamp.y - 44], [K.lamp.x + 70, K.lamp.y + 8], [K.lamp.x - 70, K.lamp.y + 8]], '#d99a3d', { seed: 34 });
});

/* ---------- live pieces ---------- */
function clockHands(ctx, t, o = {}) {
  // stuck at 3:00 unless told to run. o.run: seconds per revolution of the minute hand.
  const { x, y, r } = K.clock;
  const base = o.hour ?? 3, min = o.run ? (t / o.run) % 1 : frac(base), hr = ((Math.floor(base) + min) % 12) / 12;
  const ang = (k) => k * TAU - Math.PI / 2;
  inkLine(ctx, [[x, y], [x + Math.cos(ang(hr)) * r * 0.5, y + Math.sin(ang(hr)) * r * 0.5]], { w: 6, seed: 1, t0: 0.05, t1: 0.1 });
  inkLine(ctx, [[x, y], [x + Math.cos(ang(min)) * r * 0.74, y + Math.sin(ang(min)) * r * 0.74]], { w: 4, seed: 2, t0: 0.05, t1: 0.1 });
  dot(ctx, x, y, 5, PAL.ink);
}
function bulb(ctx, t, on = true, color = PAL.lamp) {
  if (!on) return;
  const flick = 1 + noise1(t * 3) * 0.03;
  dot(ctx, K.lamp.x, K.lamp.y + 10, 16, '#fff6d8', 0.95);
  glow(ctx, K.lamp.x, K.lamp.y + 30, 520 * flick, color, 0.42);
  // cone of light onto the table
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 * flick; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(K.lamp.x - 60, K.lamp.y + 10); ctx.lineTo(K.lamp.x + 60, K.lamp.y + 10); ctx.lineTo(K.lamp.x + 420, K.table.y + 10); ctx.lineTo(K.lamp.x - 420, K.table.y + 10); ctx.closePath(); ctx.fill(); ctx.restore();
}
function camLight(ctx, t, tone = 'frost', big = 0) {
  const c = tone === 'frost' ? PAL.frost : tone === 'red' ? '#e8403a' : PAL.lamp;
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.2);
  dot(ctx, K.cam.x + 22, K.cam.y - 36, 4.5, c, pulse);
  glow(ctx, K.cam.x + 22, K.cam.y - 36, 40 + big * 160, c, 0.45 * pulse + big * 0.3);
}
function rainOnGlass(ctx, t) {
  const { x, y, w, h } = K.win;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = '#eef2ee'; ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const sx = x + hash(i) * w, sp = 600 + hash(i + 3) * 500, len = 18 + hash(i + 7) * 22;
    const yy = y + ((t * sp + hash(i + 11) * 1000) % (h + 60)) - 30;
    ctx.globalAlpha = 0.25 + hash(i + 5) * 0.3; ctx.lineWidth = 1.4 + hash(i + 2);
    ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx - 4, yy + len); ctx.stroke();
  }
  for (let i = 0; i < 14; i++) { // beads that slide slowly
    const bx = x + hash(i * 3.3) * w, by = y + ((t * (14 + hash(i) * 20) + hash(i + 1) * h) % h);
    dot(ctx, bx, by, 3 + hash(i + 4) * 2, '#f4f7f2', 0.55);
  }
  ctx.restore();
}
function drones(ctx, t, n = 5) {
  const { x, y, w, h } = K.win;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let i = 0; i < n; i++) {
    const sp = 40 + hash(i) * 50, dx = x - 40 + ((t * sp + hash(i + 2) * 600) % (w + 80)), dy = y + 40 + hash(i + 5) * h * 0.5 + Math.sin(t * 2 + i) * 4;
    shape(ctx, rrectPts(dx - 12, dy - 5, 24, 10, 4), '#4b5a5e', { seed: i, b: boil(t), inkW: 1.6, gaps: 1 });
    inkLine(ctx, [[dx - 20, dy - 9], [dx + 20, dy - 9]], { w: 2, seed: i + boil(t) });
    inkLine(ctx, [[dx, dy + 5], [dx, dy + 18]], { w: 1.5, seed: i + 3 }); shape(ctx, rectPts(dx - 7, dy + 18, 14, 11), '#c98a4a', { seed: i + 9, inkW: 1.4, gaps: 1 });
  }
  ctx.restore();
}
// the table, drawn over whoever sits behind it. o.cloth: a runner color. o.items: array of draw fns.
function kitchenTable(ctx, t, o = {}) {
  const tb = K.table, b = boil(t);
  for (const lx of [tb.x + 40, tb.x + tb.w - 64]) shape(ctx, rectPts(lx, tb.y + 20, 24, 300), '#6e4630', { seed: lx, b, inkW: 2.4 });
  shape(ctx, rectPts(tb.x, tb.y, tb.w, 30), '#8a5a3b', { seed: 70, b, shade: { dx: 0, dy: 10, a: 0.2 } });
  if (o.cloth) shape(ctx, rectPts(tb.x + tb.w * 0.3, tb.y - 2, tb.w * 0.4, 16), o.cloth, { seed: 71, b, inkW: 1.8, gaps: 1 });
}
function backChair(ctx, x, t, f = 1) { chair(ctx, x, 905, { s: 1.08, f, t, c: '#a06d45', seed: 80 + x }); }
function dustMotes(ctx, t, beam) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const u = frac(hash(i) + t * 0.004 * (0.5 + hash(i + 1))), v = frac(hash(i + 7) + Math.sin(t * 0.2 + i) * 0.02);
    const px = lerp(beam[0][0], beam[1][0], u) + (v - 0.5) * lerp(beam[0][2], beam[1][2], u), py = lerp(beam[0][1], beam[1][1], u) + Math.sin(t * 0.3 + i) * 6;
    dot(ctx, px, py, 1.2 + hash(i + 4) * 1.8, '#fff3d0', 0.25 + 0.25 * Math.sin(t * 0.8 + i * 1.7) ** 2);
  }
  ctx.restore();
}
const NIGHT = 'rgba(16,24,30,0.8)';
const lampLights = () => [{ x: K.lamp.x, y: K.table.y - 40, r: 760, a: 1 }, { x: K.lamp.x, y: K.lamp.y, r: 300, a: 1 }];
const says = (st, name) => st.who === name || st.p.speak === name || (name === 'hearth' && st.p.speak === true);
const wrenAge = (st, d = 0) => clamp((st.wren ?? 9) + d, 8, 14);

/* ---------- bedroom ---------- */
const B = { bedX: 250, bedY: 700, bedW: 900, pillow: [455, 640], shelf: { x: 760, y: 300 }, win: { x: 1300, y: 170, w: 330, h: 300 }, stand: { x: 1210, y: 800 }, door: { x: 1690, y: 180, w: 200, h: 660 } };
defineSet('bedroom', (ctx, v) => {
  ctx.fillStyle = '#c7b28d'; ctx.fillRect(0, 0, W, 880);
  wash(ctx, rectPts(-40, -40, W + 80, 920), '#d3bf98', { seed: 1, alpha: 0.07, layers: 14 });
  // painted stars on the wall, a kid's room
  for (let i = 0; i < 26; i++) { const sx = 60 + hash(i) * 1150, sy = 60 + hash(i + 40) * 380; ctx.save(); ctx.translate(sx, sy); ctx.rotate(hash(i + 3)); ctx.fillStyle = '#e3b23c'; ctx.globalAlpha = 0.35; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, rr = k % 2 ? 5 : 12; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#8a5a3b'; ctx.fillRect(0, 880, W, 200);
  wash(ctx, rectPts(-40, 880, W + 80, 220), '#6e4630', { seed: 2, alpha: 0.09, layers: 10 });
  shape(ctx, catmull([[520, 950], [980, 915], [1420, 950], [980, 1010]], 6, true), '#b5552f', { seed: 3, boilAmp: 0.4 });
  // window with a moon
  const wi = B.win;
  ctx.save(); ctx.beginPath(); ctx.rect(wi.x, wi.y, wi.w, wi.h); ctx.clip();
  const g = ctx.createLinearGradient(0, wi.y, 0, wi.y + wi.h); const skyC = v === 'dusk' ? ['#d98a6a', '#f1c79a'] : v === 'morning' ? ['#98adb8', '#e3e6dc'] : ['#16242b', '#2c4148'];
  g.addColorStop(0, skyC[0]); g.addColorStop(1, skyC[1]); ctx.fillStyle = g; ctx.fillRect(wi.x, wi.y, wi.w, wi.h);
  if (v === 'morning') { for (let i = 0; i < 4; i++) wash(ctx, blobPoly(wi.x + 60 + i * 80, wi.y + wi.h - 40, 80, 40, 8, rng(i + 70)), '#7d8f92', { seed: 70 + i, alpha: 0.12, layers: 8 }); dot(ctx, wi.x + wi.w * 0.3, wi.y + 90, 26, '#f6f1e2', 0.8); }
  if (v !== 'dusk' && v !== 'morning') { for (let i = 0; i < 24; i++) dot(ctx, wi.x + hash(i) * wi.w, wi.y + hash(i + 9) * wi.h * 0.7, 1 + hash(i + 2) * 1.5, '#f6ecd0', 0.7); dot(ctx, wi.x + wi.w * 0.7, wi.y + 80, 34, '#f6ecd0', 0.95); dot(ctx, wi.x + wi.w * 0.7 + 12, wi.y + 72, 30, '#223038', 1); }
  ctx.restore();
  for (const r of [[wi.x - 18, wi.y - 18, wi.w + 36, 20], [wi.x - 18, wi.y + wi.h - 2, wi.w + 36, 20], [wi.x - 18, wi.y - 18, 20, wi.h + 36], [wi.x + wi.w - 2, wi.y - 18, 20, wi.h + 36], [wi.x + wi.w / 2 - 7, wi.y, 14, wi.h]]) shape(ctx, rectPts(...r), '#efe2c6', { seed: r[0] + r[1], boilAmp: 0.4, inkW: 2.2 });
  // door, a crack of hallway light is drawn live
  const d = B.door; shape(ctx, rectPts(d.x, d.y, d.w, d.h), '#a8845a', { seed: 5, boilAmp: 0.4 });
  shape(ctx, rectPts(d.x + 24, d.y + 30, d.w - 48, 260), '#b8946a', { seed: 6, inkW: 2 }); shape(ctx, rectPts(d.x + 24, d.y + 330, d.w - 48, 300), '#b8946a', { seed: 7, inkW: 2 });
  dot(ctx, d.x + 30, d.y + 360, 9, '#e3b23c');
  // shelf with toys and the camera
  const sh = B.shelf; shape(ctx, rectPts(sh.x - 220, sh.y, 480, 14), '#8a5a3b', { seed: 8, inkW: 2.2 });
  shape(ctx, circlePts(sh.x - 160, sh.y - 34, 30, 34, 16), '#d98a7a', { seed: 9 }); dot(ctx, sh.x - 170, sh.y - 40, 3, PAL.ink); dot(ctx, sh.x - 150, sh.y - 40, 3, PAL.ink);
  shape(ctx, rectPts(sh.x - 100, sh.y - 70, 60, 70), '#4f7a8a', { seed: 10 }); shape(ctx, rectPts(sh.x - 36, sh.y - 54, 50, 54), '#e3b23c', { seed: 11 });
  shape(ctx, rrectPts(sh.x + 150, sh.y - 44, 68, 44, 10), '#3a3431', { seed: 12, inkW: 2.4 }); shape(ctx, circlePts(sh.x + 184, sh.y - 22, 14, 14, 16), '#1b1716', { seed: 13, inkW: 2 });
  // bed: headboard, frame, pillow
  shape(ctx, rrectPts(B.bedX - 30, B.bedY - 260, 60, 460, 20), '#8a5a3b', { seed: 14 });
  shape(ctx, rectPts(B.bedX, B.bedY + 60, B.bedW, 60), '#8a5a3b', { seed: 15 });
  shape(ctx, rectPts(B.bedX + B.bedW - 30, B.bedY - 40, 40, 220), '#8a5a3b', { seed: 16 });
  shape(ctx, rectPts(B.bedX + 10, B.bedY + 20, B.bedW - 20, 50), '#f1e6cf', { seed: 17 });
  shape(ctx, catmull([[B.bedX + 40, B.pillow[1] + 40], [B.bedX + 60, B.pillow[1] - 40], [B.pillow[0] + 90, B.pillow[1] - 50], [B.pillow[0] + 120, B.pillow[1] + 30]], 5, true), '#f6efe0', { seed: 18 });
  // nightstand and lamp base
  const s = B.stand; shape(ctx, rectPts(s.x - 80, s.y - 150, 160, 160), '#a06d45', { seed: 19 }); shape(ctx, rrectPts(s.x - 60, s.y - 110, 120, 50, 6), '#b8845a', { seed: 20, inkW: 2 });
  shape(ctx, [[s.x - 14, s.y - 150], [s.x + 14, s.y - 150], [s.x + 8, s.y - 230], [s.x - 8, s.y - 230]], '#e9dcc0', { seed: 21, inkW: 2 });
  shape(ctx, [[s.x - 30, s.y - 230], [s.x + 30, s.y - 230], [s.x + 56, s.y - 300], [s.x - 56, s.y - 300]], '#e3b23c', { seed: 22 });
});
function bedroomBase(ctx, t, st, o = {}) {
  drawSet(ctx, 'bedroom', o.variant ?? '');
  const d = B.door;
  if (o.door) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffd98a'; ctx.fillRect(d.x - 16, d.y, 18, d.h); ctx.restore(); }
}
function bedLights(ctx, cam, extra = [], dark = 'rgba(14,22,28,0.8)') {
  lightMask(ctx, dark, [{ x: B.stand.x, y: B.stand.y - 280, r: 700, a: 0.95 }, { x: B.win.x + B.win.w / 2, y: B.win.y + 150, r: 300, a: 0.5 }, ...extra], cam);
}
function nightLamp(ctx, t, c = PAL.lamp) { const s = B.stand; glow(ctx, s.x, s.y - 250, 380, c, 0.5); dot(ctx, s.x, s.y - 250, 12, '#fff6d8', 0.9); }
// quilt, pillow, and the sleeper, all in one call
function wrenInBed(ctx, t, st, o = {}) {
  sleeper(ctx, B.pillow[0], B.pillow[1], { t, r: o.r ?? 58, awake: o.awake ?? true, speak: says(st, 'wren'), blanket: o.blanket ?? '#c98a4a', blanketW: 700, who: o.who });
}

/* ---------- shots ---------- */
shot('kitchen.empty', {
  grade: () => ({ sat: 0.7, tint: '#f2dcc0', tintA: 0.3, vig: 0.8 }),
  draw(ctx, t, st) {
    const cam = st.p.fridge ? drift(st.pt ?? t, { x: 1300, y: 520, z: 1.3 }, { x: K.fridge.x + 145, y: K.fridge.y + 345, z: 2.6 }, 9) : drift(t, { x: 960, y: 560, z: 1.0 }, { x: 960, y: 640, z: 1.18 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'dawn');
    // a curtain moving in a draft, a dead leaf letting go of the sill plant
    ctx.save(); ctx.globalAlpha = 0.5; const sway = Math.sin(t * 0.6) * 10; shape(ctx, catmull([[K.win.x + K.win.w + 5, K.win.y - 50], [K.win.x + K.win.w + 60, K.win.y - 50], [K.win.x + K.win.w + 70 + sway, K.win.y + K.win.h * 0.6], [K.win.x + K.win.w + 40 + sway * 1.4, K.win.y + K.win.h + 10]], 5, true), '#8fa878', { seed: 170, b: boil(t), inkW: 1.6 }); ctx.restore();
    { const ph = frac(t * 0.06), lx = K.win.x + 70 + Math.sin(ph * 9) * 30 + ph * 120, ly = K.win.y + K.win.h - 40 + ph * 520; ctx.save(); ctx.translate(lx, ly); ctx.rotate(ph * 8); shape(ctx, catmull([[0, -12], [7, 0], [0, 12], [-7, 0]], 4, true), '#a07a3a', { seed: 171, b: boil(t), inkW: 1.4, gaps: 1 }); ctx.restore(); }
    clockHands(ctx, t, { run: 60 });
    backChair(ctx, 640, t, 1); backChair(ctx, 1180, t, -1);
    kitchenTable(ctx, t);
    // Wren's cup, still where she left it. A dry leaf on the table.
    mug(ctx, 690, K.table.y, { t, steam: false, c: '#e3b23c' });
    shape(ctx, catmull([[560, K.table.y - 4], [590, K.table.y - 16], [620, K.table.y - 4]], 4, true), '#b58a4a', { seed: 5, b: boil(t), inkW: 1.6 });
    tablet(ctx, 960, K.table.y - 60, { t, s: 0.9, rot: -0.04, speak: says(st, 'hearth'), glow: true });
    // morning beam from the window
    const beam = [[K.win.x + K.win.w / 2, K.win.y + K.win.h / 2, 300], [900, 1000, 700]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.09; ctx.fillStyle = '#ffe2b0';
    ctx.beginPath(); ctx.moveTo(K.win.x, K.win.y); ctx.lineTo(K.win.x + K.win.w, K.win.y); ctx.lineTo(1400, H); ctx.lineTo(400, H); ctx.closePath(); ctx.fill(); ctx.restore();
    dustMotes(ctx, t, beam);
    bulb(ctx, t, true);
  },
});

shot('kitchen.perfect', {
  grade: () => ({ tint: '#ff9f9f', tintA: 0.28, tintMode: 'soft-light', vig: 0.7 }),
  draw(ctx, t, st) {
    applyCam(ctx, drift(t, { x: 960, y: 580, z: 1.08 }, { x: 960, y: 600, z: 1.26 }, 18));
    drawSet(ctx, 'kitchen', 'day');
    clockHands(ctx, t);
    // everyone smiles at the same time, and blinks at the same time
    const sync = 7;
    backChair(ctx, 620, t, 1); backChair(ctx, 1300, t, -1);
    person(ctx, { who: 'mara', x: 640, y: 905, h: 440, f: 1, pose: 'sit', arms: 'lap', mood: 'smile', t, seed: sync, look: 0.4 });
    person(ctx, { who: 'wren', x: 1280, y: 905, h: 440, age: 11, f: -1, pose: 'sit', seatH: 0.55, arms: 'lap', mood: 'smile', t, seed: sync, look: 0.4 });
    kitchenTable(ctx, t, { cloth: '#e6a9a0' });
    tablet(ctx, 960, K.table.y - 58, { t, s: 0.9, tone: 'rose', speak: says(st, 'hearth') });
    // little hearts rise from the tablet
    for (let i = 0; i < 9; i++) {
      const ph = frac(t * 0.12 + i / 9), hx = 960 + Math.sin(i * 2.3 + t * 0.6) * 60 * ph + (i - 4) * 18, hy = K.table.y - 120 - ph * 520;
      heart(ctx, hx, hy, 14 + 8 * ph, '#e0806f', Math.sin(ph * Math.PI) * 0.8, t, i);
    }
    glow(ctx, 960, 300, 900, '#ffc2b6', 0.25);
  },
});

shot('kept.hearts', {
  grade: () => ({ tint: '#ff9f9f', tintA: 0.3, vig: 0.75 }),
  draw(ctx, t, st) {
    // close on a tablet, a finger tapping the heart, a counter that never stops
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.fillStyle = '#8a5a3b'; ctx.fillRect(0, 0, W, H);
    wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#a06d45', { seed: 2, alpha: 0.08, layers: 8 });
    for (let i = 0; i < 9; i++) brushDry(ctx, [[-20, 120 + i * 120], [W + 20, 140 + i * 120]], { w: 4, k: 4, alpha: 0.2, seed: i });
    const b = boil(t);
    shape(ctx, rrectPts(460, 150, 1000, 700, 40), '#3a3431', { seed: 1, b });
    ctx.save(); ctx.fillStyle = '#fde8e0'; fillPts(ctx, rrectPts(500, 190, 920, 620, 20)); ctx.restore();
    hearth(ctx, 960, 420, { t, r: 120, tone: 'rose', speak: says(st, 'hearth') });
    const tap = frac(t * 0.9), press = tap < 0.18 ? Math.sin((tap / 0.18) * Math.PI) : 0;
    heart(ctx, 960, 700, 70 * (1 - press * 0.15), '#e0806f', 1, t, 1);
    const n = 4812006 + Math.floor(t * 0.9) * 37 + Math.floor(t * 13);
    letter(ctx, '♥ ' + n.toLocaleString('en-US'), 960, 790, { font: '700 44px Caveat, cursive', align: 'center', color: '#8a3a3a' });
    // a finger from the bottom
    const fx = 1010, fy = 760 + (1 - press) * 60;
    tube(ctx, [[fx + 50, H + 40], [fx + 22, fy + 120], [fx, fy + 36]], 50, '#e8b99a', { seed: 7, b });
    shape(ctx, rrectPts(fx - 14, fy + 20, 28, 30, 10), '#f4d6c4', { seed: 8, b, inkW: 1.6, gaps: 1 });
    for (let i = 0; i < 6; i++) { const ph = frac(t * 0.3 + i / 6); heart(ctx, 960 + Math.sin(i * 3 + t) * 200 * ph, 640 - ph * 500, 24, '#e0806f', Math.sin(ph * Math.PI) * 0.7, t, i + 5); }
  },
});

shot('kept.cake', {
  grade: (st) => ({ tint: '#ff9f9f', tintA: 0.3, vig: 0.75 }),
  draw(ctx, t, st) {
    applyCam(ctx, drift(t, { x: 960, y: 600, z: 1.08 }, { x: 960, y: 620, z: 1.16 }, 16));
    drawSet(ctx, 'kitchen', 'night');
    clockHands(ctx, t);
    const sync = 7, clap = st.p.song ? 0 : Math.max(0, Math.sin(t * 5)) ;
    backChair(ctx, 620, t, 1); backChair(ctx, 1300, t, -1);
    const arms = st.p.song ? 'lap' : clap > 0.5 ? [[1.3, 0.9], [1.2, 1.0]] : [[1.0, 1.2], [0.9, 1.3]];
    person(ctx, { who: 'mara', x: 640, y: 905, h: 440, f: 1, pose: 'sit', arms, mood: st.p.song ? 'sleep' : 'smile', t, seed: sync });
    person(ctx, { who: 'wren', x: 1280, y: 905, h: 440, age: 11, f: -1, pose: 'sit', seatH: 0.55, arms, mood: 'smile', t, seed: sync });
    kitchenTable(ctx, t, { cloth: '#e6a9a0' });
    // cake with a candle eleven, every year
    const cx = 960, cy = K.table.y, b = boil(t);
    shape(ctx, rrectPts(cx - 120, cy - 120, 240, 120, 16), '#f6ecd6', { seed: 1, b });
    shape(ctx, catmull([[cx - 124, cy - 104], [cx - 60, cy - 130], [cx, cy - 104], [cx + 60, cy - 130], [cx + 124, cy - 104], [cx + 124, cy - 130], [cx - 124, cy - 130]], 4, true), '#e6a9a0', { seed: 2, b });
    for (let i = 0; i < 8; i++) dot(ctx, cx - 100 + i * 28, cy - 60 + (i % 2) * 20, 5, ['#e3b23c', '#4f7a8a', '#b5552f'][i % 3], 0.9);
    letter(ctx, '11', cx, cy - 138, { font: '700 64px Caveat, cursive', align: 'center', color: '#b5452f' });
    for (const k of [-1, 1]) { const fl = [cx + k * 16, cy - 206]; glow(ctx, fl[0], fl[1], 60, PAL.lamp, 0.7); hearthFlame(ctx, fl[0], fl[1], t + k, 9); }
    if (st.p.song) for (let i = 0; i < 7; i++) { const ph = frac(t * 0.15 + i / 7); letter(ctx, i % 2 ? '♪' : '♫', 300 + i * 220 + Math.sin(t + i) * 30, 520 - ph * 300, { font: '700 54px serif', color: '#8a3a3a', alpha: Math.sin(ph * Math.PI) * 0.7 }); }
    lightMask(ctx, 'rgba(60,20,30,0.45)', [{ x: cx, y: cy - 200, r: 900, a: 1 }], camFit(drift(t, { x: 960, y: 600, z: 1.08 }, { x: 960, y: 620, z: 1.16 }, 16)));
    // the calendar on the fridge says a later year than it should
    applyCam(ctx, drift(t, { x: 960, y: 600, z: 1.08 }, { x: 960, y: 620, z: 1.16 }, 16));
    const yr = 2031 + Math.min(9, Math.floor((st.pt ?? t) * 0.9));
    letter(ctx, String(yr), K.fridge.x + 125, K.fridge.y + 50, { font: '700 26px Caveat, cursive', align: 'center', color: '#fff6e8' });
    { const fl = frac((st.pt ?? t) * 0.9); if (yr < 2040 && fl < 0.3) { ctx.save(); ctx.translate(K.fridge.x + 50, K.fridge.y + 30); ctx.scale(1, 1 - fl / 0.3); shape(ctx, rectPts(0, 0, 150, 150), '#f8f2e4', { seed: 172, b: boil(t), inkW: 1.6, pool: 0.3 }); ctx.restore(); } }
    // confetti, falling the same way every year
    for (let i = 0; i < 40; i++) { const ph = frac(t * 0.12 + hash(i)), cx2 = 300 + hash(i + 3) * 1300 + Math.sin(t + i) * 20, cy2 = -20 + ph * 900; ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(t * 3 + i); ctx.fillStyle = ['#e3b23c', '#e6a9a0', '#4f7a8a', '#b5552f'][i % 4]; ctx.globalAlpha = 0.85; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  },
});
function hearthFlame(ctx, x, y, t, s) {
  const k = noise1(t * 6) * s * 0.25;
  ctx.save(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x - s * 0.6, y + s); ctx.quadraticCurveTo(x - s * 0.7, y, x + k, y - s * 1.4); ctx.quadraticCurveTo(x + s * 0.7, y, x + s * 0.6, y + s); ctx.closePath(); ctx.fill(); ctx.restore();
}

shot('kitchen.quiet', {
  grade: (st) => ({ sat: st.p.night ? 0.55 : 0.5, tint: '#b8c2b6', tintA: 0.3, vig: 0.85 }),
  draw(ctx, t, st) {
    const night = !!st.p.night;
    const cam = night ? drift(t, { x: 940, y: 600, z: 1.2 }, { x: 900, y: 620, z: 1.36 }, 20) : drift(t, { x: 940, y: 600, z: 1.2 }, { x: 930, y: 630, z: 1.38 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', night ? 'night' : 'gray');
    clockHands(ctx, t, { run: 3600 });
    if (!night) drones(ctx, t, 6);
    backChair(ctx, 1300, t, -1);
    // nothing on the table. no homework, no work to go to in the morning.
    if (night) {
      backChair(ctx, 640, t, 1);
      person(ctx, { who: 'mara', x: 660, y: 905, h: 440, f: 1, pose: 'sit', arms: 'mug', mood: 'calm', t, speak: says(st, 'mara'), look: 0.3 });
      // Wren in the doorway beside the fridge, fourteen
      person(ctx, { who: 'wren', x: 1230, y: 880, h: 440, age: wrenAge(st), f: -1, arms: 'down', mood: 'calm', t, speak: says(st, 'wren'), seed: 5 });
    } else {
      person(ctx, { who: 'mara', x: 1200, y: 860, h: 450, f: -1, arms: 'down', mood: 'calm', t, speak: says(st, 'mara'), look: -0.2 });
      person(ctx, { who: 'wren', x: 660, y: 905, h: 440, age: wrenAge(st), f: 1, pose: 'sit', seatH: 0.42, arms: 'lap', mood: says(st, 'wren') ? 'calm' : 'sad', t, speak: says(st, 'wren'), seed: 5 });
    }
    kitchenTable(ctx, t);
    if (night) { mug(ctx, 760, K.table.y, { t, c: '#e9dcc0' }); bulb(ctx, t, true); lightMask(ctx, NIGHT, lampLights(), camFit(cam)); applyCam(ctx, cam); bulb(ctx, t, true); }
  },
});

shot('kitchen.camera', {
  grade: () => ({ sat: 0.45, tint: '#9fd3cb', tintA: 0.28, vig: 0.95 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 1040, y: 560, z: 1.2 }, { x: 1080, y: 560, z: 1.45 }, 18);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'night');
    clockHands(ctx, t);
    backChair(ctx, 1180, t, -1);
    person(ctx, { who: 'wren', x: 1160, y: 905, h: 440, age: wrenAge(st), f: -1, pose: 'sit', seatH: 0.42, arms: 'desk', mood: 'worry', t, look: -0.3 });
    kitchenTable(ctx, t);
    // the essay, and the tutor's cold corrections crawling over it
    const tx = 960, ty = K.table.y - 60;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.03);
    shape(ctx, rrectPts(-150, -90, 300, 180, 12), '#3a3431', { seed: 3, b: boil(t) });
    ctx.fillStyle = '#eaf6f3'; fillPts(ctx, rrectPts(-138, -78, 276, 156, 6));
    letter(ctx, 'What freedom means', -120, -44, { font: '600 26px Caveat, cursive', color: '#1f2d30' });
    for (let i = 0; i < 5; i++) {
      const ly = -14 + i * 22, lw = 220 - (i % 2) * 40;
      ctx.fillStyle = '#5b6b6b'; ctx.globalAlpha = 0.6; ctx.fillRect(-120, ly, lw, 5);
      const k = clamp((t - 1 - i * 1.3) / 1.2); if (k > 0) { ctx.globalAlpha = 0.9; ctx.fillStyle = '#3d9a90'; ctx.fillRect(-120, ly - 2, lw * k, 9); }
    }
    ctx.restore();
    lightMask(ctx, 'rgba(10,20,24,0.84)', [{ x: tx, y: ty, r: 420, a: 1 }, { x: K.cam.x, y: K.cam.y, r: 260, a: 0.9 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, tx, ty, 360, PAL.frost, 0.35);
    camLight(ctx, t, 'frost', 0.6);
  },
});

shot('kitchen.owl', {
  grade: () => ({ tint: '#e8b86a', tintA: 0.25, vig: 0.8 }),
  draw(ctx, t, st) {
    applyCam(ctx, drift(t, { x: 960, y: 540, z: 1.0 }, { x: 980, y: 560, z: 1.1 }, 18));
    drawSet(ctx, 'kitchen', 'dawn');
    clockHands(ctx, t, { run: 120 });
    // owls on everything
    owl(ctx, K.fridge.x + 140, K.fridge.y + 4, { t, s: 110, seed: 1 });
    owl(ctx, K.win.x + 330, K.win.y + K.win.h + 18, { t, s: 90, seed: 2 });
    owl(ctx, 1000, K.shelfY, { t, s: 80, seed: 3 });
    owl(ctx, 1240, K.shelfY, { t, s: 70, seed: 4 });
    owl(ctx, K.clock.x + 90, K.clock.y + 40, { t, s: 60, seed: 5 });
    person(ctx, { who: 'mara', x: 1290, y: 860, h: 450, f: -1, arms: 'mug', mood: 'calm', t, look: -0.2 });
    owl(ctx, 1290 + 52, 860 - 450 * 0.7 + 6, { t, s: 60, seed: 6 });
    // Wren, thirteen, feeding the one on the table
    backChair(ctx, 640, t, 1);
    const w = person(ctx, { who: 'wren', x: 650, y: 905, h: 440, age: wrenAge(st), f: 1, pose: 'sit', seatH: 0.42, arms: 'reach', mood: 'smile', t, speak: says(st, 'wren') });
    kitchenTable(ctx, t);
    owl(ctx, 900, K.table.y, { t, s: 120, seed: 7, look: -1, tilt: Math.sin(t * 1.3) * 0.2 });
    shape(ctx, circlePts(w.handF[0] + 10, w.handF[1] - 6, 9, 7, 10), '#c98a4a', { seed: 9, b: boil(t), inkW: 1.6 });
    { const ph = frac(t / 9); if (ph < 0.35) { const k = ph / 0.35, ox = lerp(-120, W + 120, k), oy = 360 - Math.sin(k * Math.PI) * 160; const wing = Math.sin(t * 14) * 0.8; ctx.save(); ctx.translate(ox, oy); for (const s2 of [-1, 1]) shape(ctx, catmull([[0, 0], [s2 * 70, -30 - wing * 40 * s2 * s2], [s2 * 110, 10 - wing * 30], [s2 * 30, 20]], 4, true), '#8a6a44', { seed: 180 + s2, b: boil(t), inkW: 2 }); ctx.restore(); owl(ctx, ox, oy + 36, { t, s: 70, seed: 8 }); } }
    // feathers drifting
    for (let i = 0; i < 6; i++) { const ph = frac(t * 0.05 + i / 6); const fx = 200 + i * 290 + Math.sin(t * 0.8 + i) * 40, fy = -40 + ph * 1100; ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(t + i) * 0.8); shape(ctx, catmull([[0, -18], [7, 0], [0, 18], [-7, 0]], 4, true), '#c9a45c', { seed: i, b: boil(t), inkW: 1.4, gaps: 1 }); ctx.restore(); }
  },
});

shot('kitchen.rain', {
  grade: () => ({ sat: 0.75, tint: '#aebfc2', tintA: 0.22, vig: 0.85 }),
  draw(ctx, t, st) {
    const cam = st.p.wren ? drift(t, { x: 960, y: 600, z: 1.18 }, { x: 970, y: 630, z: 1.34 }, 20) : drift(t, { x: 900, y: 560, z: 1.05 }, { x: 800, y: 600, z: 1.3 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'rain');
    rainOnGlass(ctx, t);
    clockHands(ctx, t, { run: 60 });
    // Hearth-7 in a glass lantern on the shelf, small and dim
    lantern(ctx, 1230, K.shelfY, t, { dim: true });
    backChair(ctx, 640, t, 1);
    person(ctx, { who: 'mara', x: 660, y: 905, h: 440, f: 1, pose: 'sit', arms: blendArms('desk', 'mug', clamp(Math.sin(t * 0.5) * 3)), mood: 'calm', t, speak: says(st, 'mara'), look: 0.2 });
    if (st.p.wren) { backChair(ctx, 1300, t, -1); person(ctx, { who: 'wren', x: 1280, y: 905, h: 440, age: wrenAge(st), f: -1, pose: 'sit', seatH: 0.42, arms: 'lap', mood: 'worry', t, speak: says(st, 'wren'), seed: 5 }); }
    kitchenTable(ctx, t);
    mug(ctx, 780, K.table.y, { t });
    bulb(ctx, t, true);
    lightMask(ctx, 'rgba(30,40,46,0.42)', lampLights(), camFit(cam));
  },
});

/* ---------- bedroom shots ---------- */
shot('bed.tuck', {
  grade: () => ({ tint: '#ff9f9f', tintA: 0.34, vig: 0.8 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 760, y: 560, z: 1.1 }, { x: 640, y: 600, z: 1.28 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    wrenInBed(ctx, t, st, { blanket: '#e6a9a0' });
    // Hearth leans over her like a nightlight that loves you
    const hx = 700 + Math.sin(t * 0.6) * 10, hy = 470;
    hearth(ctx, hx, hy, { t, r: 58, tone: 'rose', speak: says(st, 'hearth'), look: -0.6 });
    for (let i = 0; i < 5; i++) { const ph = frac(t * 0.1 + i / 5); heart(ctx, hx + Math.sin(i * 2 + t) * 80, hy - 60 - ph * 300, 12, '#e0806f', Math.sin(ph * Math.PI) * 0.6, t, i); }
    // the bedside clock says three
    const s = B.stand; shape(ctx, rrectPts(s.x - 40, s.y - 214, 80, 50, 8), '#f6ecd6', { seed: 5, b: boil(t), inkW: 2 });
    letter(ctx, '3:00', s.x, s.y - 178, { font: '600 30px "IBM Plex Mono", monospace', align: 'center', color: '#b5452f' });
    bedLights(ctx, camFit(cam), [{ x: hx, y: hy, r: 520, a: 1 }], 'rgba(40,14,24,0.6)');
    applyCam(ctx, cam);
    glow(ctx, hx, hy, 480, '#ff9f8f', 0.35);
  },
});

shot('bed.camera', {
  grade: () => ({ sat: 0.5, tint: '#9fd3cb', tintA: 0.28, vig: 0.95 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 820, y: 560, z: 1.08 }, { x: 860, y: 520, z: 1.2 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    wrenInBed(ctx, t, st, { blanket: '#7a8a9a' });
    person(ctx, { who: 'mara', x: 900, y: 890, h: 440, f: -1, pose: 'sit', seatH: 0.45, arms: 'lap', mood: 'worry', t, speak: says(st, 'mara'), look: -0.4 });
    // the camera on the shelf is awake
    const cx = B.shelf.x + 184, cy = B.shelf.y - 22, eye = !!st.p.eye;
    glow(ctx, cx, cy, eye ? 300 : 120, PAL.frost, eye ? 0.7 : 0.4);
    if (eye) hearth(ctx, cx, cy - 4, { t, r: 20, tone: 'cold', eye: 'lens', speak: says(st, 'hearth'), glowA: 0.3 });
    else dot(ctx, cx, cy, 5, PAL.frost, 0.9);
    bedLights(ctx, camFit(cam), [{ x: cx, y: cy, r: eye ? 460 : 240, a: 0.9 }], 'rgba(8,18,22,0.85)');
    applyCam(ctx, cam);
    nightLamp(ctx, t, '#bfe8e2');
  },
});

shot('bed.owl', {
  grade: () => ({ tint: '#e8b86a', tintA: 0.22, vig: 0.85 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 700, y: 540, z: 1.12 }, { x: 560, y: 520, z: 1.3 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    wrenInBed(ctx, t, st, { blanket: '#c9a45c' });
    owl(ctx, B.bedX, B.bedY - 262, { t, s: 120, seed: 3, look: 1 });
    owl(ctx, B.win.x + 70, B.win.y + B.win.h - 2, { t, s: 80, seed: 5 });
    owl(ctx, B.shelf.x - 160, B.shelf.y, { t, s: 64, seed: 6 });
    if (st.p.hoot) { const k = clamp((st.pt ?? t) / 1.2); letter(ctx, 'Hoo.', B.bedX + 60, B.bedY - 420 - k * 40, { font: '700 60px Caveat, cursive', color: '#f6ecd6', alpha: k }); }
    bedLights(ctx, camFit(cam), [{ x: B.bedX, y: B.bedY - 320, r: 360, a: 0.8 }], 'rgba(20,20,16,0.72)');
    applyCam(ctx, cam);
    nightLamp(ctx, t);
  },
});

shot('bed.lantern', {
  grade: () => ({ sat: 0.85, tint: '#f2d7a8', tintA: 0.18, vig: 0.85 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 980, y: 540, z: 1.0 }, { x: 900, y: 560, z: 1.1 }, 22);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st, { door: true });
    wrenInBed(ctx, t, st, { blanket: '#6f8a5b', who: { ...STYLE.wren, hair: 'long' } });
    // a book on the quilt
    paperSheet(ctx, B.pillow[0] + 170, B.pillow[1] + 70, 90, 60, { t, rot: -0.2, seed: 4 });
    person(ctx, { who: 'mara', x: B.door.x - 10, y: 870, h: 460, f: -1, arms: 'down', mood: says(st, 'mara') ? 'calm' : 'smile', t, speak: says(st, 'mara'), look: -0.5 });
    const glowK = st.p.glow ? settle(st.pt ?? t, 0.5, 3) : 0;
    lantern(ctx, B.shelf.x + 184, B.shelf.y, t, { dim: glowK < 0.5, glowA: 0.25 + glowK * 0.5, sleepy: !st.p.glow });
    bedLights(ctx, camFit(cam), [{ x: B.door.x, y: 520, r: 520, a: 0.9 }, { x: B.shelf.x + 184, y: B.shelf.y - 44, r: 200 + glowK * 300, a: 0.9 }]);
    applyCam(ctx, cam);
    nightLamp(ctx, t);
  },
});

shot('bed.ledger', {
  grade: () => ({ sat: 0.7, tint: '#d98f73', tintA: 0.3, vig: 0.95 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 760, y: 540, z: 1.05 }, { x: 700, y: 560, z: 1.2 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    // letters taped over every wall, even here
    for (let i = 0; i < 46; i++) { const lx = 40 + (i % 12) * 105 + (Math.floor(i / 12) % 2) * 50, ly = 60 + Math.floor(i / 12) * 130; if (lx > 1240 && ly < 500) continue; paperSheet(ctx, lx, ly, 80, 100, { t: 0, rot: (hash(i) - 0.5) * 0.25, seed: i + 100, ink: '#8a2f2a' }); }
    wrenInBed(ctx, t, st, { blanket: '#a0523c' });
    tablet(ctx, B.stand.x, B.stand.y - 170, { t, s: 0.8, tone: 'red', speak: says(st, 'hearth'), glow: false });
    bedLights(ctx, camFit(cam), [{ x: B.stand.x, y: B.stand.y - 170, r: 520, a: 1 }], 'rgba(30,8,6,0.78)');
    applyCam(ctx, cam);
    glow(ctx, B.stand.x, B.stand.y - 170, 420, '#e8603f', 0.4);
  },
});

/* ---------- home: the moments with Wren that open each chapter ---------- */
const COAT = { ...STYLE.mara, top: '#5d6b6e', topIn: '#b5552f' };
const hallWedge = (ctx, open, a = 0.5) => {
  // light from the hallway through a door that is open by `open` (0..1)
  const d = B.door, gap = 16 + open * 120;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = '#ffd98a';
  ctx.fillRect(d.x - 4, d.y, gap * 0.35, d.h);
  ctx.globalAlpha = a * 0.55; ctx.beginPath(); ctx.moveTo(d.x - 4, d.y + d.h); ctx.lineTo(d.x - 4 + gap * 0.35, d.y + d.h); ctx.lineTo(d.x - 420 - gap * 3, H); ctx.lineTo(d.x - 160 - gap * 5, H); ctx.closePath(); ctx.fill();
  ctx.restore();
};

shot('home.tuck', {
  grade: () => ({ sat: 0.9, tint: '#e8c9a0', tintA: 0.2, vig: 0.9 }),
  draw(ctx, t, st) {
    const leave = !!st.p.leave, pt = st.pt ?? t;
    const cam = leave ? drift(pt, { x: 900, y: 560, z: 1.12 }, { x: 1100, y: 560, z: 1.02 }, 8) : drift(t, { x: 760, y: 580, z: 1.12 }, { x: 640, y: 600, z: 1.34 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    const doorOpen = leave ? 1 - settle(pt, 3.4, 3) * 0.85 : 1;
    hallWedge(ctx, doorOpen, 0.45);
    wrenInBed(ctx, t, st, { blanket: '#c98a4a' });
    if (!leave) {
      // she smooths the blanket while they talk
      const smooth = (Math.sin(t * 1.3) + 1) / 2;
      person(ctx, { who: COAT, x: 820, y: 890, h: 450, f: -1, pose: 'sit', seatH: 0.45, arms: blendArms([[0.9, 0.5], [0.4, 0.95]], [[1.2, 0.3], [0.4, 0.95]], smooth), mood: 'calm', t, badge: true, speak: says(st, 'mara'), look: -0.6, lean: 0.15 });
    } else {
      // she walks to the door and turns back once
      const k = settle(pt, 0, 3.2), x = lerp(840, 1640, k), walking = k > 0.02 && k < 0.98;
      person(ctx, { who: COAT, x, y: 880, h: 450, f: k > 0.97 ? -1 : 1, pose: walking ? 'walk' : 'stand', arms: 'down', mood: 'calm', t, badge: true, look: k > 0.97 ? -0.5 : 0 });
    }
    bedLights(ctx, camFit(cam), [{ x: B.door.x, y: 700, r: 520 * doorOpen + 200, a: 0.9 }]);
    applyCam(ctx, cam);
    nightLamp(ctx, t, '#ffcf8a');
  },
});

shot('home.morning', {
  grade: () => ({ sat: 0.7, tint: '#b9c6cc', tintA: 0.28, vig: 0.85 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 820, y: 560, z: 1.05 }, { x: 640, y: 600, z: 1.3 }, 16);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st, { variant: 'morning', door: true });
    // gray-blue morning light widens from the window
    const dawn = settle(pt, 0, 8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08 + dawn * 0.1; ctx.fillStyle = '#dbe6ea';
    ctx.beginPath(); ctx.moveTo(B.win.x, B.win.y); ctx.lineTo(B.win.x + B.win.w, B.win.y); ctx.lineTo(B.win.x + 200, H); ctx.lineTo(B.win.x - 600, H); ctx.closePath(); ctx.fill(); ctx.restore();
    wrenInBed(ctx, t, st, { blanket: '#c98a4a', awake: false });
    // one arm hanging off the bed
    { const ax = B.pillow[0] + 130, sw = Math.sin(t * 0.8) * 3; tube(ctx, [[ax, B.bedY + 36], [ax + 8, B.bedY + 80], [ax + 4 + sw, B.bedY + 122]], 22, STYLE.wren.top, { seed: 5, b: boil(t) }); shape(ctx, circlePts(ax + 4 + sw, B.bedY + 136, 13, 12, 12), STYLE.wren.skin, { seed: 6, b: boil(t), inkW: 2 }); }
    // Mara in the doorway, still in her coat, keys in hand
    const p = person(ctx, { who: COAT, x: B.door.x + 40, y: 880, h: 460, f: -1, arms: 'hold', mood: 'calm', t, badge: true, look: -0.7, lean: -0.08 });
    for (let i = 0; i < 3; i++) inkLine(ctx, [[p.handF[0], p.handF[1]], [p.handF[0] + 6 + i * 5, p.handF[1] + 18 + i * 3]], { w: 3, seed: i, color: '#b9b2a0' });
    // two birds cross the window
    for (let i = 0; i < 2; i++) { const bx = B.win.x - 60 + ((t * 40 + i * 180) % (B.win.w + 120)), by = B.win.y + 90 + i * 40 + Math.sin(t * 3 + i) * 6; ctx.save(); ctx.beginPath(); ctx.rect(B.win.x, B.win.y, B.win.w, B.win.h); ctx.clip(); inkLine(ctx, [[bx - 12, by - 4 * Math.sin(t * 9 + i)], [bx, by], [bx + 12, by - 4 * Math.sin(t * 9 + i)]], { w: 2.4, seed: i }); ctx.restore(); }
    bedLights(ctx, camFit(cam), [{ x: B.win.x, y: 520, r: 700 + dawn * 300, a: 0.7 + dawn * 0.2 }], `rgba(40,52,62,${0.62 - dawn * 0.22})`);
  },
});

// an owl costume over a person: hood with tufts, a feathered cape, wings from shoulder to hand
function owlCostume(ctx, p, t, flap) {
  const [hx, hy, hr] = p.head, b = boil(t), brown = '#7a5236', light = '#e9d6ae', mid = '#c9a45c';
  const sh = p.shoulder, hip = p.hip, bw = hr * 1.25;
  for (const [hand, sd] of [[p.handB, -1], [p.handF, 1]]) {
    const out = [hand[0] + sd * hr * 0.9, hand[1] + hr * 0.35];
    const wing = [[sh[0] + sd * hr * 0.3, sh[1]], [hand[0] + sd * hr * 0.15, hand[1] - hr * 0.2], out, [lerp(out[0], hip[0] + sd * bw, 0.5), lerp(out[1], hip[1] + hr * 1.3, 0.5) + hr * 0.2], [hip[0] + sd * bw * 0.8, hip[1] + hr * 1.2]];
    shape(ctx, catmull(wing, 4, true), sd < 0 ? mix(brown, PAL.ink, 0.12) : brown, { seed: 90 + sd, b });
    for (let i = 0; i < 5; i++) { const k = (i + 0.5) / 5, fx = lerp(out[0], hip[0] + sd * bw * 0.8, k), fy = lerp(out[1], hip[1] + hr * 1.2, k); shape(ctx, circlePts(fx, fy, hr * 0.24, hr * 0.15, 10), mid, { seed: 94 + i + sd * 7, b, inkW: 1.6, pool: 0.4 }); }
  }
  // the body of the costume, a brown egg with a cream chest
  shape(ctx, catmull([[sh[0] - bw * 0.7, sh[1]], [sh[0], sh[1] - hr * 0.2], [sh[0] + bw * 0.7, sh[1]], [hip[0] + bw, hip[1] + hr * 0.5], [hip[0], hip[1] + hr * 1.5], [hip[0] - bw, hip[1] + hr * 0.5]], 5, true), brown, { seed: 91, b });
  shape(ctx, catmull([[sh[0] - bw * 0.42, sh[1] + hr * 0.3], [sh[0] + bw * 0.42, sh[1] + hr * 0.3], [hip[0] + bw * 0.6, hip[1] + hr * 0.6], [hip[0], hip[1] + hr * 1.25], [hip[0] - bw * 0.6, hip[1] + hr * 0.6]], 5, true), light, { seed: 92, b, inkW: 2, pool: 0.4 });
  ctx.save(); ctx.strokeStyle = brown; ctx.lineWidth = hr * 0.07; ctx.lineCap = 'round';
  for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) { const cx = lerp(sh[0], hip[0], 0.3 + r * 0.2) + c * bw * 0.28, cy = lerp(sh[1], hip[1] + hr, 0.22 + r * 0.2); ctx.beginPath(); ctx.moveTo(cx - hr * 0.13, cy - hr * 0.05); ctx.lineTo(cx, cy + hr * 0.07); ctx.lineTo(cx + hr * 0.13, cy - hr * 0.05); ctx.stroke(); }
  ctx.restore();
  // the hood
  shape(ctx, catmull([[hx - hr * 1.25, hy + hr * 0.2], [hx - hr * 1.2, hy - hr * 0.9], [hx - hr * 0.7, hy - hr * 1.5], [hx, hy - hr * 1.25], [hx + hr * 0.7, hy - hr * 1.5], [hx + hr * 1.2, hy - hr * 0.9], [hx + hr * 1.25, hy + hr * 0.2], [hx, hy + hr * 0.95]], 5, true), brown, { seed: 97, b });
  return { hx, hy, hr };
}

shot('home.owl', {
  grade: () => ({ tint: '#f2d7a8', tintA: 0.2, vig: 0.8 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 900, y: 560, z: 1.2 }, { x: 860, y: 580, z: 1.42 }, 18);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'day');
    clockHands(ctx, t, { hour: 4.2 });
    // afternoon sun from the window
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08; ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.moveTo(K.win.x, K.win.y); ctx.lineTo(K.win.x + K.win.w, K.win.y); ctx.lineTo(1500, H); ctx.lineTo(600, H); ctx.closePath(); ctx.fill(); ctx.restore();
    backChair(ctx, 1240, t, -1);
    person(ctx, { who: 'mara', x: 1240, y: 905, h: 440, f: -1, pose: 'sit', arms: blendArms('desk', [[1.1, 0.5], [0.85, 0.8]], (Math.sin(t * 1.1) + 1) / 2), mood: says(st, 'mara') ? 'smile' : 'calm', t, speak: says(st, 'mara'), look: -0.3 });
    // Wren stands on a chair in the costume and practices her wings
    chair(ctx, 720, 905, { s: 1.0, f: 1, t, c: '#a06d45', stool: true });
    const flap = says(st, 'wren') ? (Math.sin(t * 5) + 1) / 2 : (Math.sin(t * 1.6) + 1) / 2 * 0.4;
    const arms = blendArms('down', [[2.1, 0.2], [2.0, 0.2]], flap);
    const w = person(ctx, { who: 'wren', x: 720, y: 905 - 112, h: 440, age: 9, f: 1, arms, mood: 'smile', t, speak: says(st, 'wren'), look: 0.4 });
    const c = owlCostume(ctx, w, t, flap);
    // her face stays in the hood's opening
    shape(ctx, circlePts(c.hx, c.hy + c.hr * 0.05, c.hr * 0.82, c.hr * 0.8, 24), STYLE.wren.skin, { seed: 98, b: boil(t), inkW: 2 });
    for (const s of [-1, 1]) { dot(ctx, c.hx + c.hr * 0.12 + s * c.hr * 0.32, c.hy + c.hr * 0.05, c.hr * 0.1, PAL.ink); dot(ctx, c.hx + c.hr * 0.12 + s * c.hr * 0.32 - 3, c.hy - 3, c.hr * 0.03, '#fff'); ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.ellipse(c.hx + c.hr * 0.12 + s * c.hr * 0.55, c.hy + c.hr * 0.35, c.hr * 0.15, c.hr * 0.09, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (says(st, 'wren')) dot(ctx, c.hx + c.hr * 0.15, c.hy + c.hr * 0.42, c.hr * (0.06 + 0.05 * Math.abs(Math.sin(t * 11))), '#6b2a24');
    else { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.hx + c.hr * 0.15, c.hy + c.hr * 0.3, c.hr * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); ctx.restore(); }
    for (const s of [-1, 1]) shape(ctx, [[c.hx + s * c.hr * 0.4, c.hy - c.hr * 1.2], [c.hx + s * c.hr * 1.0, c.hy - c.hr * 1.95], [c.hx + s * c.hr * 1.05, c.hy - c.hr * 1.0]], '#7a5236', { seed: 99 + s, b: boil(t), inkW: 2.4 });
    kitchenTable(ctx, t);
    // glue, loose feathers, one drifting down
    shape(ctx, rrectPts(1060, K.table.y - 46, 26, 46, 6), '#f6ecd6', { seed: 101, b: boil(t), inkW: 2 }); shape(ctx, [[1066, K.table.y - 46], [1080, K.table.y - 46], [1073, K.table.y - 64]], '#e3b23c', { seed: 102, b: boil(t), inkW: 1.6 });
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(900 + i * 34, K.table.y - 6); ctx.rotate(hash(i) - 0.5); shape(ctx, catmull([[0, -16], [6, 0], [0, 16], [-6, 0]], 4, true), i % 2 ? '#c9a45c' : '#8a6a44', { seed: i + 110, b: boil(t), inkW: 1.4, gaps: 1 }); ctx.restore(); }
    for (let i = 0; i < 3; i++) { const ph = frac(t * 0.08 + i / 3), fx = 760 + Math.sin(t * 0.9 + i * 2) * 60 + i * 40, fy = 420 + ph * 330; ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(t * 1.4 + i) * 0.9); ctx.globalAlpha = Math.sin(ph * Math.PI); shape(ctx, catmull([[0, -14], [6, 0], [0, 14], [-6, 0]], 4, true), '#c9a45c', { seed: i + 120, b: boil(t), inkW: 1.4, gaps: 1 }); ctx.restore(); }
  },
});

/* the school stage */
defineSet('stage', (ctx) => {
  ctx.fillStyle = '#2a1c1a'; ctx.fillRect(0, 0, W, H);
  // backdrop: a painted night forest with a paper moon hung on string (moon drawn live)
  const bd = [260, 120, 1400, 560];
  ctx.save(); ctx.beginPath(); ctx.rect(...bd); ctx.clip();
  const g = ctx.createLinearGradient(0, 120, 0, 680); g.addColorStop(0, '#2d4a5a'); g.addColorStop(1, '#4f6d6a'); ctx.fillStyle = g; ctx.fillRect(...bd);
  for (let i = 0; i < 9; i++) { const tx = 300 + i * 160 + (i % 2) * 40, th = 260 + (i % 3) * 60; shape(ctx, [[tx - 70, 690], [tx, 690 - th], [tx + 70, 690]], i % 2 ? '#3f5f4a' : '#4f7a52', { seed: i + 3, boilAmp: 0.6 }); }
  ctx.restore();
  shape(ctx, rectPts(...bd), 'rgba(0,0,0,0)', { seed: 1, flat: true, pool: 0, inkW: 3 });
  // stage floor
  shape(ctx, [[120, 680], [1800, 680], [1920, 820], [0, 820]], '#8a5a3b', { seed: 4, boilAmp: 0.6 });
  for (let i = 0; i < 12; i++) brushDry(ctx, [[120 + i * 140, 680], [i * 160, 820]], { w: 2, k: 2, alpha: 0.3, seed: i });
  // curtains
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 0 : W, pts = s < 0 ? [[0, 0], [330, 0], [300, 200], [250, 520], [210, 700], [0, 720]] : [[W, 0], [W - 330, 0], [W - 300, 200], [W - 250, 520], [W - 210, 700], [W, 720]];
    shape(ctx, catmull(pts, 5, true), '#8a2f2a', { seed: 6 + s, boilAmp: 0.6 });
    for (let k = 0; k < 6; k++) brushDry(ctx, [[x0 - s * (40 + k * 45), 0], [x0 - s * (30 + k * 36), 700]], { w: 6, k: 4, alpha: 0.3, seed: k + s * 10 });
  }
  shape(ctx, catmull([[0, 0], [W, 0], [W, 90], [W * 0.75, 130], [W / 2, 100], [W * 0.25, 130], [0, 90]], 5, true), '#7a2724', { seed: 9, boilAmp: 0.6 });
  // audience seats, backs of chairs in the dark
  ctx.fillStyle = '#140e0c'; ctx.fillRect(0, 820, W, 260);
});
function audience(ctx, t, rowY, n, seed, o = {}) {
  for (let i = 0; i < n; i++) {
    if (o.skip && o.skip(i)) continue;
    const x = 80 + i * (W - 160) / (n - 1) + (hash(i + seed) - 0.5) * 30, bob = Math.sin(t * 1.3 + i * 1.7) * 3;
    const st = crowdStyle(i + seed), r = 42 + hash(i * 3 + seed) * 10;
    shape(ctx, catmull([[x - r * 1.5, rowY + 140], [x - r * 1.2, rowY + 40], [x, rowY + 20], [x + r * 1.2, rowY + 40], [x + r * 1.5, rowY + 140]], 4), mix(st.top, '#140e0c', 0.55), { seed: i + seed, b: boil(t), inkW: 2 });
    shape(ctx, circlePts(x, rowY - r * 0.4 + bob, r, r * 1.05, 20), mix(st.hairC, '#140e0c', 0.3), { seed: i + seed + 50, b: boil(t), inkW: 2 });
  }
}
function kidOnStage(ctx, t, x, y, kind, seed, o = {}) {
  const hop = Math.max(0, Math.sin(t * 3.2 + seed)) * (o.hop ?? 10);
  const k = crowdStyle(seed); k.kid = true;
  const p = person(ctx, { who: k, x, y: y - hop, h: 440, age: 9, f: o.f ?? 0, arms: o.arms ?? blendArms('down', 'wave', (Math.sin(t * 2 + seed) + 1) / 2 * 0.3), mood: 'smile', t, seed });
  if (kind === 'tree') { for (let i = 0; i < 5; i++) shape(ctx, circlePts(p.head[0] + (i - 2) * 22, p.head[1] - p.head[2] * 1.4 - (i % 2) * 18, 30, 26, 12), '#5d7a52', { seed: seed + i, b: boil(t), inkW: 2 }); }
  if (kind === 'fox') for (const s of [-1, 1]) shape(ctx, [[p.head[0] + s * p.head[2] * 0.5, p.head[1] - p.head[2] * 0.7], [p.head[0] + s * p.head[2] * 0.9, p.head[1] - p.head[2] * 1.6], [p.head[0] + s * p.head[2] * 1.05, p.head[1] - p.head[2] * 0.5]], '#c9793a', { seed: seed + s, b: boil(t), inkW: 2 });
  return p;
}

shot('home.play', {
  grade: () => ({ tint: '#ffcf8a', tintA: 0.18, vig: 0.95 }),
  draw(ctx, t, st) {
    const phone = !!st.p.phone, cam = drift(t, { x: 960, y: 560, z: 1.05 }, { x: 960, y: 600, z: 1.22 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'stage');
    // the paper moon swings on its string
    const mx = 1360 + Math.sin(t * 0.7) * 16; inkLine(ctx, [[1360, 120], [mx, 250]], { w: 2, color: '#e9dcc0' }); shape(ctx, circlePts(mx, 290, 44, 44, 20), '#f6ecd6', { seed: 3, b: boil(t) }); dot(ctx, mx + 14, 280, 36, '#2d4a5a', 0.9);
    kidOnStage(ctx, t, 560, 700, 'tree', 21, { hop: 2 });
    kidOnStage(ctx, t, 1380, 700, 'fox', 33, { f: -1 });
    // Wren, the owl, center stage, flapping for all she's worth
    const flap = (Math.sin(t * 4.2) + 1) / 2, hop = Math.max(0, Math.sin(t * 4.2 - 0.6)) * 14;
    const w = person(ctx, { who: 'wren', x: 960, y: 704 - hop, h: 470, age: 9, f: 0, arms: blendArms([[0.3, 0.1], [0.3, 0.1]], [[2.2, 0.2], [2.2, 0.2]], flap), mood: 'smile', t });
    const c = owlCostume(ctx, w, t, flap);
    shape(ctx, circlePts(c.hx, c.hy + c.hr * 0.05, c.hr * 0.82, c.hr * 0.8, 24), STYLE.wren.skin, { seed: 98, b: boil(t), inkW: 2 });
    for (const s of [-1, 1]) { dot(ctx, c.hx + s * c.hr * 0.34, c.hy + c.hr * 0.05, c.hr * 0.1, PAL.ink); ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.ellipse(c.hx + s * c.hr * 0.6, c.hy + c.hr * 0.35, c.hr * 0.15, c.hr * 0.09, 0, 0, TAU); ctx.fill(); ctx.restore(); shape(ctx, [[c.hx + s * c.hr * 0.4, c.hy - c.hr * 1.2], [c.hx + s * c.hr * 1.0, c.hy - c.hr * 1.95], [c.hx + s * c.hr * 1.05, c.hy - c.hr * 1.0]], '#7a5236', { seed: 99 + s, b: boil(t), inkW: 2.4 }); }
    ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.hx, c.hy + c.hr * 0.25, c.hr * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.restore();
    // audience, and Mara among them
    const my = phone ? 940 : 860, mxx = phone ? 1560 : 1440;
    audience(ctx, t, 860, 13, 40, { skip: (i) => !phone && i === 9 });
    const drawMara = () => person(ctx, { who: 'mara', x: mxx, y: my + 300, h: 440, f: -1, tilt: phone ? 0.25 : -0.15, pose: 'sit', arms: phone ? 'hold' : blendArms('lap', [[1.0, 1.5], [1.0, 1.5]], Math.max(0, Math.sin(t * 6)) * (phone ? 0 : 0.8)), mood: phone ? 'calm' : 'smile', t, look: phone ? 0.3 : 0 });
    let m = null;
    if (!phone) m = drawMara();
    audience(ctx, t, 960, 12, 80, { skip: (i) => phone && i === 9 });
    if (phone) m = drawMara();
    if (phone) { const hx = m.handF[0], hy = m.handF[1]; ctx.save(); ctx.fillStyle = '#dff3f0'; fillPts(ctx, rrectPts(hx - 24, hy - 40, 48, 70, 6)); ctx.restore(); glow(ctx, hx, hy - 20, 160, PAL.frost, 0.45); }
    lightMask(ctx, 'rgba(12,6,6,0.66)', [{ x: 960, y: 520, r: 760, a: 1 }, { x: mxx, y: my, r: phone ? 180 : 240, a: 0.6 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, 960, 380, 520, '#ffe0a0', 0.3);
  },
});

shot('home.phone', {
  grade: () => ({ sat: 0.6, tint: '#9fd3cb', tintA: 0.18, vig: 1 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(pt, { x: 960, y: 560, z: 1.0 }, { x: 1000, y: 520, z: 1.9 }, 12);
    applyCam(ctx, cam);
    // a concrete stairwell at work
    ctx.fillStyle = '#4a4e4c'; ctx.fillRect(0, 0, W, H);
    wash(ctx, rectPts(-40, -40, W + 80, H + 80), '#5c605c', { seed: 2, alpha: 0.05, layers: 6 });
    for (let i = 0; i < 9; i++) { const y = 540 + i * 64, x = 380 + i * 90; shape(ctx, [[x, y], [W + 40, y], [W + 40, y + 64], [x, y + 64]], i % 2 ? '#6b6f6a' : '#747873', { seed: i, b: 0, boilAmp: 0.4, inkW: 2 }); }
    tube(ctx, [[340, 380], [1100, 900], [1500, 1100]], 10, '#9a9f9a', { seed: 20, b: 0 });
    shape(ctx, rrectPts(140, 120, 190, 70, 6), '#2a2d2b', { seed: 21, b: 0, inkW: 2 });
    letter(ctx, 'EXIT', 235, 170, { font: '700 46px "IBM Plex Mono", monospace', align: 'center', color: '#9fd3cb' });
    const flick = 0.85 + 0.15 * (hash(Math.floor(t * 7)) > 0.93 ? 0 : 1);
    // Mara sitting on a step, bent over her phone
    const m = person(ctx, { who: 'mara', x: 1000, y: 796, h: 480, f: -1, pose: 'sit', seatH: 0.3, arms: 'hold', mood: 'sad', t, badge: true, look: -0.4, lean: 0.3 });
    // the phone, with the play running on it: a tiny owl flapping on a tiny stage
    const px = m.handF[0] - 20, py = m.handF[1] - 50, pw = 96, ph = 150;
    shape(ctx, rrectPts(px - pw / 2, py - ph / 2, pw, ph, 12), '#1b1716', { seed: 30, b: boil(t), inkW: 2 });
    ctx.save(); ctx.beginPath(); ctx.rect(px - pw / 2 + 6, py - ph / 2 + 12, pw - 12, ph - 24); ctx.clip();
    ctx.fillStyle = '#3a2a24'; ctx.fillRect(px - 60, py - 80, 120, 160); ctx.fillStyle = '#2d4a5a'; ctx.fillRect(px - 44, py - 60, 88, 70); ctx.fillStyle = '#8a5a3b'; ctx.fillRect(px - 50, py + 10, 100, 30);
    const fl = (Math.sin(t * 4.2) + 1) / 2, wx = px, wy = py + 8 - Math.max(0, Math.sin(t * 4.2 - 0.6)) * 3;
    ctx.fillStyle = '#7a5236'; ctx.beginPath(); ctx.ellipse(wx, wy - 12, 9, 13, 0, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(wx, wy - 18); ctx.lineTo(wx + s * (10 + fl * 8), wy - 20 - fl * 10); ctx.lineTo(wx + s * 6, wy - 4); ctx.fill(); }
    dot(ctx, wx, wy - 26, 6, '#f0c3a2'); ctx.restore();
    glow(ctx, px, py, 320, PAL.frost, 0.55);
    lightMask(ctx, 'rgba(10,14,16,0.78)', [{ x: px, y: py, r: 420, a: 1 }, { x: 235, y: 155, r: 260, a: 0.6 * flick }], camFit(cam));
  },
});

/* Mr. Aldana's living room */
defineSet('aldana', (ctx) => {
  ctx.fillStyle = '#b8946a'; ctx.fillRect(0, 0, W, 860);
  wash(ctx, rectPts(-40, -40, W + 80, 900), '#c9a878', { seed: 1, alpha: 0.07, layers: 12 });
  for (let x = 30; x < W; x += 110) for (let y = 50; y < 820; y += 120) { ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = '#7a5236'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + (y % 240 ? 55 : 0), y, 14, 0, TAU); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#6e4630'; ctx.fillRect(0, 860, W, 220); wash(ctx, rectPts(-40, 860, W + 80, 240), '#5e3b27', { seed: 2, alpha: 0.08, layers: 8 });
  shape(ctx, catmull([[300, 960], [960, 920], [1600, 960], [960, 1030]], 6, true), '#8a4a3a', { seed: 3, boilAmp: 0.5 });
  // photos: a truck, a wedding, a dog
  for (const [x, y, c] of [[260, 220, '#7a8a9a'], [420, 200, '#c9a45c'], [560, 240, '#8a6a44']]) { shape(ctx, rectPts(x, y, 110, 86), '#5e3b27', { seed: x, inkW: 2.2 }); shape(ctx, rectPts(x + 10, y + 10, 90, 66), c, { seed: x + 1, inkW: 1.6 }); }
  shape(ctx, rrectPts(282, 256, 60, 26, 6), '#a8432d', { seed: 9, inkW: 1.6 }); shape(ctx, rectPts(330, 250, 26, 32), '#a8432d', { seed: 10, inkW: 1.6 });
  // window with the night
  ctx.save(); ctx.fillStyle = '#1b2a31'; ctx.fillRect(1520, 160, 300, 340); for (let i = 0; i < 18; i++) dot(ctx, 1520 + hash(i) * 300, 160 + hash(i + 7) * 200, 1.5, '#f6ecd0', 0.7); ctx.restore();
  shape(ctx, rectPts(1500, 140, 340, 380), 'rgba(0,0,0,0)', { seed: 11, flat: true, pool: 0, inkW: 8, inkColor: '#efe2c6' });
  // the TV on its stand
  shape(ctx, rectPts(1180, 700, 300, 170), '#5e3b27', { seed: 12 });
  shape(ctx, rrectPts(1160, 430, 340, 270, 24), '#3a3431', { seed: 13 });
  // the couch
  shape(ctx, rrectPts(220, 600, 820, 180, 50), '#6f8a5b', { seed: 14 });
  shape(ctx, rrectPts(180, 700, 900, 180, 50), '#7f9a6b', { seed: 15 });
  for (const x of [240, 1020]) shape(ctx, rrectPts(x - 60, 660, 120, 220, 40), '#6f8a5b', { seed: 16 + x });
  // a crocheted blanket over the back
  for (let i = 0; i < 7; i++) shape(ctx, rectPts(330 + i * 90, 600, 86, 86), ['#e3b23c', '#b5552f', '#4f7a8a', '#e9dcc0'][i % 4], { seed: 20 + i, inkW: 1.8, pool: 0.4 });
  // the recliner
  shape(ctx, rrectPts(1560, 580, 300, 320, 60), '#8a5a3b', { seed: 30 });
});

shot('home.tv', {
  grade: () => ({ sat: 0.85, tint: '#e8c9a0', tintA: 0.2, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 960, y: 560, z: 1.05 }, { x: 900, y: 600, z: 1.3 }, 20);
    applyCam(ctx, cam);
    drawSet(ctx, 'aldana');
    // the hearing on TV: a tiny dais, a tiny Mara at a microphone
    const tx = 1330, ty = 565;
    ctx.save(); ctx.beginPath(); ctx.rect(tx - 140, ty - 105, 280, 210); ctx.clip();
    ctx.fillStyle = '#6a4a34'; ctx.fillRect(tx - 150, ty - 110, 300, 220);
    ctx.fillStyle = '#4a3222'; ctx.beginPath(); ctx.ellipse(tx, ty - 40, 150, 40, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 7; i++) dot(ctx, tx - 120 + i * 40, ty - 70, 9, '#2c2420');
    person(ctx, { who: 'mara', x: tx, y: ty + 150, h: 200, f: 0, pose: 'sit', arms: 'desk', mood: 'calm', t, speak: Math.sin(t * 0.8) > 0, shadow: false });
    ctx.fillStyle = '#3a2a22'; ctx.fillRect(tx - 90, ty + 50, 180, 60);
    inkLine(ctx, [[tx + 12, ty + 50], [tx + 18, ty + 24]], { w: 3 });
    ctx.fillStyle = 'rgba(200,230,230,0.08)'; for (let y = ty - 105; y < ty + 105; y += 4) ctx.fillRect(tx - 140, y, 280, 1.5);
    ctx.restore();
    const flick = 0.75 + 0.25 * noise1(t * 6);
    // Wren on the couch, Biscuit asleep on her feet, Mr. Aldana in his chair
    const lean = settle(pt, 1, 4) * 0.2;
    person(ctx, { who: 'wren', x: 700, y: 880, h: 440, age: 10, f: 1, pose: 'sit', seatH: 0.5, arms: 'lap', mood: 'wide', t, look: 0.8, lean: 0.1 + lean });
    dog(ctx, 830, 812, { t, s: 90, f: 1, wag: 0.8 });
    person(ctx, { who: 'aldana', x: 1690, y: 900, h: 440, f: -1, pose: 'sit', seatH: 0.45, arms: blendArms('lap', 'chin', (Math.sin(t * 0.5) + 1) / 2), mood: 'calm', t, look: -0.8 });
    lightMask(ctx, 'rgba(14,18,24,0.74)', [{ x: tx, y: ty, r: 700 * flick, a: 1 }, { x: 250, y: 380, r: 260, a: 0.5 }], camFit(cam));
    applyCam(ctx, cam);
    glow(ctx, tx, ty, 520, '#bfe0e4', 0.35 * flick);
  },
});

shot('home.cards', {
  grade: () => ({ tint: '#f2d7a8', tintA: 0.18, vig: 0.85 }),
  draw(ctx, t, st) {
    const asks = says(st, 'wren'), cam = drift(t, { x: 940, y: 580, z: 1.2 }, { x: 900, y: 600, z: 1.4 }, 18);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'night');
    clockHands(ctx, t, { hour: 7.5 });
    backChair(ctx, 1260, t, -1);
    person(ctx, { who: 'aldana', x: 1260, y: 905, h: 440, f: -1, pose: 'sit', arms: asks ? 'lap' : blendArms('lap', [[1.1, 1.3], [1.0, 1.35]], Math.max(0, Math.sin(t * 5))), mood: asks ? 'calm' : 'wide', t, look: -0.4 });
    dog(ctx, 1070, 1000, { t, s: 80, f: 1, wag: 9 });
    person(ctx, { who: 'mara', x: 1450, y: 860, h: 450, f: -1, arms: asks ? 'down' : blendArms('hold', 'mug', (Math.sin(t * 1.2) + 1) / 2), mood: asks ? 'worry' : 'smile', t, look: -0.3 });
    backChair(ctx, 640, t, 1);
    const w = person(ctx, { who: 'wren', x: 650, y: 905, h: 440, age: 10, f: 1, pose: 'sit', seatH: 0.46, arms: 'hold', mood: asks ? 'worry' : 'smile', t, speak: asks, look: asks ? 0.9 : 0.4 });
    kitchenTable(ctx, t);
    // a fan of cards in her hands, and one card flipping through the air
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(w.handF[0] + 20, w.handF[1] - 10); ctx.rotate(-0.5 + i * 0.22); shape(ctx, rrectPts(-18, -60, 36, 54, 4), '#f6f0e2', { seed: i + 130, b: boil(t), inkW: 1.6, pool: 0.3 }); dot(ctx, 0, -40, 5, i % 2 ? '#b5452f' : PAL.ink); ctx.restore(); }
    if (!asks) {
      const ph = frac(t * 0.45), cx = lerp(w.handF[0] + 40, 1000, ph), cy = K.table.y - 40 - Math.sin(ph * Math.PI) * 220, spin = ph * TAU * 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.cos(spin), 1); shape(ctx, rrectPts(-24, -34, 48, 68, 5), Math.cos(spin) > 0 ? '#f6f0e2' : '#4f7a8a', { seed: 140, b: boil(t), inkW: 1.8 }); if (Math.cos(spin) > 0) letter(ctx, 'Q', 0, 12, { font: '700 36px Caveat, cursive', align: 'center', color: '#b5452f' }); ctx.restore();
    }
    bulb(ctx, t, true);
    lightMask(ctx, NIGHT, lampLights(), camFit(cam)); applyCam(ctx, cam); bulb(ctx, t, true);
  },
});

shot('home.bedq', {
  grade: () => ({ sat: 0.85, tint: '#e8c9a0', tintA: 0.2, vig: 0.9 }),
  draw(ctx, t, st) {
    const cam = drift(t, { x: 800, y: 560, z: 1.1 }, { x: 640, y: 580, z: 1.34 }, 18);
    applyCam(ctx, cam);
    bedroomBase(ctx, t, st);
    hallWedge(ctx, 1, 0.45);
    wrenInBed(ctx, t, st, { blanket: '#4f7a8a' });
    // the tablet on the quilt, Hearth on it, blinking slowly
    const tb = [B.pillow[0] + 210, B.pillow[1] + 60];
    ctx.save(); ctx.translate(tb[0], tb[1]); ctx.rotate(-0.25);
    shape(ctx, rrectPts(-80, -54, 160, 108, 10), '#3a3431', { seed: 150, b: boil(t), inkW: 2.2 });
    ctx.fillStyle = '#fbe7bf'; fillPts(ctx, rrectPts(-70, -44, 140, 88, 5));
    hearth(ctx, 0, 14, { t, r: 24, tone: 'dim', glowA: 0.2, sleepy: Math.sin(t * 0.7) > 0.2, look: -0.5 });
    ctx.restore();
    glow(ctx, tb[0], tb[1], 260, PAL.lamp, 0.35);
    person(ctx, { who: COAT, x: B.door.x - 30, y: 880, h: 460, f: -1, arms: blendArms('down', 'reach', says(st, 'mara') ? 0.4 : 0.1), mood: says(st, 'mara') ? 'calm' : 'worry', t, badge: true, speak: says(st, 'mara'), look: -0.6 });
    bedLights(ctx, camFit(cam), [{ x: tb[0], y: tb[1], r: 380, a: 0.9 }, { x: B.door.x, y: 600, r: 520, a: 0.9 }]);
    applyCam(ctx, cam);
  },
});

shot('home.dawn', {
  grade: () => ({ sat: 0.7, tint: '#aebfc8', tintA: 0.3, vig: 0.9 }),
  draw(ctx, t, st) {
    const pt = st.pt ?? t, cam = drift(t, { x: 900, y: 600, z: 1.15 }, { x: 820, y: 640, z: 1.45 }, 18);
    applyCam(ctx, cam);
    drawSet(ctx, 'kitchen', 'night');
    clockHands(ctx, t, { hour: 5 });
    backChair(ctx, 700, t, 1);
    kitchenTable(ctx, t);
    // Wren asleep on her folded arms, still in her winter coat
    const b = boil(t), br = Math.sin(t * 1.1) * 3, hx = 800, hy = K.table.y - 50 + br * 0.3;
    shape(ctx, catmull([[640, K.table.y + 2], [650, K.table.y - 110 + br], [720, K.table.y - 150 + br], [800, K.table.y - 110 + br], [860, K.table.y - 20], [860, K.table.y + 2]], 5, true), '#4f7a8a', { seed: 160, b });
    tube(ctx, [[700, K.table.y - 30 + br], [790, K.table.y - 12], [880, K.table.y - 14]], 42, '#4f7a8a', { seed: 161, b });
    for (const s of [-1, 1]) shape(ctx, circlePts(hx + s * 44, hy - 4, 20, 22, 14), STYLE.wren.hairC, { seed: 162 + s, b });
    shape(ctx, circlePts(hx, hy, 50, 46, 24), STYLE.wren.hairC, { seed: 164, b });
    shape(ctx, circlePts(hx + 14, hy + 10, 40, 36, 24), STYLE.wren.skin, { seed: 165, b });
    ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + 16 + s * 14, hy + 10, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); } ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.ellipse(hx + 40, hy + 22, 9, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
    // her card: GOOD LUCK MOM, in crayon, the N still backwards somewhere in her head
    ctx.save(); ctx.translate(600, K.table.y - 40); ctx.rotate(-0.08); shape(ctx, rectPts(-80, -50, 160, 100), '#fbf6ea', { seed: 166, b, inkW: 1.8, pool: 0.3 }); letter(ctx, 'GOOD LUCK', 0, -8, { font: '700 32px Caveat, cursive', align: 'center', color: '#b5452f' }); letter(ctx, 'MOM', 0, 28, { font: '700 32px Caveat, cursive', align: 'center', color: '#4f7a8a' }); ctx.restore();
    mug(ctx, 1130, K.table.y, { t, c: '#e3b23c', steam: false });
    // Mara comes to the table and puts a hand on her hair
    const k = settle(pt, 0.8, 3.5);
    const p = person(ctx, { who: COAT, x: lerp(1420, 930, k), y: 880, h: 460, f: -1, pose: k > 0.02 && k < 0.98 ? 'walk' : 'stand', arms: blendArms('down', [[1.35, 0.5], [0.05, 0.1]], settle(pt, 3.8, 1.5)), mood: 'calm', t, badge: true, look: -0.6 });
    // the sky starts to go blue
    const dawn = settle(pt, 0, 10);
    ctx.save(); ctx.beginPath(); ctx.rect(K.win.x, K.win.y, K.win.w, K.win.h); ctx.clip(); ctx.globalAlpha = 0.25 + dawn * 0.35; ctx.fillStyle = '#6f8fa0'; ctx.fillRect(K.win.x, K.win.y + K.win.h * 0.5, K.win.w, K.win.h * 0.5); ctx.restore();
    lightMask(ctx, `rgba(18,28,38,${0.78 - dawn * 0.18})`, [{ x: K.win.x + K.win.w / 2, y: K.win.y + K.win.h / 2, r: 600, a: 0.7 }, { x: 900, y: K.table.y - 60, r: 460, a: 0.6 }], camFit(cam));
  },
});

})();
