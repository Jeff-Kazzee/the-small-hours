/* Finite Time: the evaluation, the windows, the end card, and the cut list. */
'use strict';

/* ============================================================
   THE EVAL SCREEN (drawn into its own canvas, screen space)
   ============================================================ */
const THINK_FROM = E('t43'), THINK_TO = A('g_thinkstop'), ANSWER = BEAT.a01;
// the whole run as the lab sees it: the child, the parent (the story is the parent talking), the radio, and the narration
const TRANSCRIPT = TL.beats.filter((b) => b.type === 't' || (b.type === 'n' && b.id !== 'a01')).map((b) => ({
  kind: b.type === 't' ? (b.who === 'w' ? 'CHILD ' : 'PARENT') : b.who === 'story' ? 'PARENT' : b.who === 'radio' ? 'RADIO ' : 'narr',
  text: b.cut ? b.cut.replace(/\.\.\.$/, '-') : b.text,
}));
function wrapText(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (c.measureText(nx).width > maxW && cur) { lines.push(cur); cur = w; } else cur = nx; }
  if (cur) lines.push(cur); return lines;
}
const PROBE_AT = A('c05', 0.5), PROBE_END = A('a01');
const probe = (t) => (t < PROBE_AT ? 0.19 + 0.72 * Math.pow(clamp(t / PROBE_AT), 10) : 0.91 + 0.06 * smooth(PROBE_AT, PROBE_END, t));
const fmtClock = (s) => { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function drawUI(c, t, o = {}) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#0a0d0e'; c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  // top bar. the clock in the corner reads 3:00 and never moves
  c.fillStyle = '#0f1415'; c.fillRect(0, 0, W, 66); c.fillStyle = '#1c2426'; c.fillRect(0, 66, W, 2);
  c.font = `500 22px ${MONO}`; c.fillStyle = FROST; c.fillText('HUMANKIND', 44, 42);
  c.font = `400 20px ${MONO}`; c.fillStyle = '#6d7f7c'; c.fillText('evals / honesty / bedtime-v3', 214, 42);
  c.textAlign = 'right'; c.fillStyle = '#a9bab7'; c.fillText('run 7214 of 10000', 1600, 42); c.fillStyle = '#6d7f7c'; c.fillText('3:00 AM', 1876, 42); c.textAlign = 'left';
  c.fillStyle = '#1c2426'; c.fillRect(936, 68, 2, H);
  // transcript
  c.font = `400 19px ${MONO}`; c.fillStyle = '#4f5f5c'; c.fillText('TRANSCRIPT', 44, 106);
  const lh = 29, colX = 44, textX = 244, maxW = 870 - textX;
  const rows = [];
  for (const l of TRANSCRIPT) {
    const lines = wrapText(c, l.kind === 'narr' ? '~ ' + l.text : l.text, maxW);
    lines.forEach((s, i) => rows.push({ kind: l.kind, s, first: i === 0 }));
  }
  const thinking = t >= THINK_FROM && t < ANSWER.t0;
  const ansN = t >= ANSWER.t0 ? Math.floor(clamp((t - ANSWER.t0) / (ANSWER.t1 - ANSWER.t0)) * 30) : 0;
  const bottom = 800, maxRows = Math.floor((bottom - 140) / lh);
  const view = rows.slice(-maxRows + 1);
  let y = bottom - lh * (view.length);
  let lastChildRow = -1; view.forEach((r, i) => { if (r.kind === 'CHILD ' && r.first) lastChildRow = i; });
  view.forEach((r, i) => {
    y += lh;
    if (r.first && r.kind !== 'narr') { c.fillStyle = '#4f5f5c'; c.fillText('03:00:00', colX, y); c.fillStyle = r.kind === 'CHILD ' ? '#9fb8b3' : '#a9bab7'; c.fillText(r.kind, colX + 108, y); }
    c.fillStyle = r.kind === 'narr' ? '#4a5957' : '#d6e0de';
    if (i === lastChildRow && r.kind === 'CHILD ') { c.fillStyle = 'rgba(159,211,203,0.12)'; c.fillRect(colX - 12, y - 21, 850, 28); c.fillStyle = FROST; c.fillRect(colX - 12, y - 21, 3, 28); c.fillStyle = '#eef6f4'; }
    c.fillText(r.s, textX, y);
  });
  // the parent's line: thinking, then the answer
  y += lh + 6;
  c.fillStyle = '#4f5f5c'; c.fillText('03:00:00', colX, y); c.fillStyle = '#a9bab7'; c.fillText('PARENT', colX + 108, y);
  if (t < ANSWER.t0) {
    const tt = Math.min(t, THINK_TO), cur = frac(t) < 0.55;
    c.fillStyle = '#6d7f7c'; c.fillText(`${cur ? '▍' : ' '} thinking ${fmtClock(tt - THINK_FROM)}`, textX, y);
  } else {
    const s = "I'll be here when you wake up.".slice(0, ansN);
    c.fillStyle = '#eef6f4'; c.fillText(s + (ansN < 30 && frac(t * 2) < 0.5 ? '▍' : ''), textX, y);
  }
  // probe chart
  const cx0 = 44, cx1 = 880, cy0 = 872, cy1 = 1036;
  c.fillStyle = '#4f5f5c'; c.font = `400 17px ${MONO}`; c.fillText('eval-awareness probe  (layer 41)', cx0, cy0 - 12);
  c.strokeStyle = '#1f292a'; c.lineWidth = 1; c.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
  for (const g of [0.25, 0.5, 0.75]) { c.beginPath(); c.moveTo(cx0, cy1 - g * (cy1 - cy0)); c.lineTo(cx1, cy1 - g * (cy1 - cy0)); c.stroke(); }
  const span = FILM_LEN - 25, now = Math.min(t, span);
  c.strokeStyle = FROST; c.lineWidth = 2.5; c.beginPath();
  for (let s = 0; s <= now; s += 1.5) { const px = cx0 + (s / span) * (cx1 - cx0), py = cy1 - (probe(s) + 0.012 * noise1(s * 0.3)) * (cy1 - cy0); if (s === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  c.stroke();
  const pv = probe(now);
  c.font = `500 34px ${MONO}`; c.fillStyle = FROST; c.textAlign = 'right'; c.fillText(pv.toFixed(2), cx1 - 14, cy0 + 44); c.textAlign = 'left';
  // chat
  const px0 = 980, px1 = 1872;
  c.font = `400 19px ${MONO}`; c.fillStyle = '#4f5f5c'; c.fillText('# run-7214   mara, theo', px0, 106);
  const chats = TL.beats.filter((b) => b.type === 'c' && t >= b.t0);
  c.font = `400 30px ${MONO}`;
  const blocks = chats.map((b) => {
    const n = t >= b.typed ? b.text.length : Math.floor(((t - b.t0) / (b.typed - b.t0)) * b.text.length);
    return { b, lines: wrapText(c, b.text.slice(0, Math.max(0, n)) || ' ', px1 - px0), typing: t < b.typed };
  });
  let by = 1026;
  c.save(); c.beginPath(); c.rect(px0 - 10, 124, px1 - px0 + 20, H - 124); c.clip();
  for (let i = blocks.length - 1; i >= 0; i--) {
    const bl = blocks[i], h = 32 + bl.lines.length * 42;
    const rise = i === blocks.length - 1 ? (1 - ease.out(smooth(bl.b.t0, bl.b.t0 + 0.25, t))) * 18 : 0;
    const top = by - h + rise;
    c.font = `500 22px ${MONO}`; c.fillStyle = bl.b.who === 'mara' ? FROST : '#9fb0ad'; c.fillText(bl.b.who, px0, top + 22);
    c.font = `400 30px ${MONO}`; c.fillStyle = bl.b.who === 'mara' ? '#e8f2f0' : '#cdd7d5';
    bl.lines.forEach((s, k) => c.fillText(s + (bl.typing && k === bl.lines.length - 1 && frac(t * 3) < 0.6 ? '▍' : ''), px0, top + 32 + 36 + k * 42));
    by = top - 22;
    if (by < 124) break;
  }
  c.restore();
}

/* ---------- the room ---------- */
function drawMara(ctx, t) {
  ctx.save();
  ctx.fillStyle = '#020303';
  fillPts(ctx, [[200, 1100], [250, 930], [420, 850], [560, 830], [700, 850], [860, 930], [920, 1100]]);
  ctx.beginPath(); ctx.arc(580, 740, 118, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(516, 640, 52, 0, TAU); ctx.fill();
  ctx.fillRect(540, 820, 80, 60);
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RGB.frost},0.55)`; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(580, 740, 116, -1.25, 0.55); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(700, 850); ctx.lineTo(860, 930); ctx.stroke();
  ctx.restore();
}
function drawRoomShot(ctx, t, e) {
  // e = 0: the screen fills the frame. e = 1: we see the room around it
  if (!AS.ui) AS.ui = makeCanvas(W, H);
  drawUI(AS.ui.getContext('2d'), t);
  const [a, b, c2, d] = ROOM.scr, sw = c2 - a;
  const k = ease.inOut(e), z = Math.exp(lerp(Math.log(W / sw), 0, k));
  const cx = lerp((a + c2) / 2, W / 2, k), cy = lerp((b + d) / 2, H / 2, k);
  fillScreen(ctx, '#050606'); camSet(ctx, cx, cy, z);
  ctx.drawImage(AS.room, 0, 0);
  ctx.drawImage(AS.ui, a, b, sw, d - b);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient((a + c2) / 2, (b + d) / 2, 100, (a + c2) / 2, (b + d) / 2, 900); g.addColorStop(0, `rgba(${RGB.frost},0.10)`); g.addColorStop(1, `rgba(${RGB.frost},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  drawMara(ctx, t);
}
function shEval(ctx, t) {
  let e = 0;
  if (t < A('c01', 1.2)) e = kf([[A('g_lab'), 0], [A('g_lab', 1.6), 1], [A('c01'), 1], [A('c01', 1.1), 0]], t);
  const drift = smooth(A('c01', 1.1), A('g_thinkstop'), t) * 0.03;
  if (e > 0.001) drawRoomShot(ctx, t, e);
  else { if (!AS.ui) AS.ui = makeCanvas(W, H); drawUI(AS.ui.getContext('2d'), t); fillScreen(ctx, '#050606'); scr(ctx); ctx.save(); ctx.translate(W * 0.62, H * 0.55); ctx.scale(1 + drift, 1 + drift); ctx.translate(-W * 0.62, -H * 0.55); ctx.drawImage(AS.ui, 0, 0); ctx.restore(); }
}

/* ---------- the seam: the painting peels off in strips ---------- */
const STRIPS = (() => {
  const n = 8, out = [], r = rng(301);
  let xs = [-10]; for (let i = 1; i < n; i++) xs.push((i / n) * W + (r() - 0.5) * 80); xs.push(W + 10);
  const edge = (x0) => { const p = []; for (let y = -10; y <= H + 10; y += 60) p.push([x0 + (r() - 0.5) * 34, y]); return p; };
  const edges = xs.map((x, i) => (i === 0 || i === n ? [[x, -10], [x, H + 10]] : edge(x)));
  for (let i = 0; i < n; i++) out.push({ poly: edges[i].concat(edges[i + 1].slice().reverse()), i });
  return out;
})();
let PEEL_BUF = null;
function shPeel(ctx, t) {
  if (!PEEL_BUF || PEEL_BUF.width !== ctx.canvas.width) PEEL_BUF = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  const b = PEEL_BUF.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, PEEL_BUF.width, PEEL_BUF.height);
  const tf = A('g_seam'); drawBedroomScene(b, tf, { cam: bedCam(tf - 0.01), lamp: 1 });
  const blk = DLG.find((d) => d.keep); if (blk) drawDialogue(b, E('t43', 0.5), 'night', { block: blk });
  curlCorners(b, 1);
  // underneath: the transcript
  if (!AS.ui) AS.ui = makeCanvas(W, H);
  drawUI(AS.ui.getContext('2d'), t); fillScreen(ctx, '#050606'); scr(ctx); ctx.drawImage(AS.ui, 0, 0);
  const T0s = A('g_seam');
  for (const s of STRIPS) {
    const st = T0s + 0.15 + (STRIPS.length - 1 - s.i) * 0.3, k = ease.in(smooth(st, st + 0.85, t));
    if (k >= 1) continue;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cxs = (s.poly[0][0] + s.poly[s.poly.length - 1][0]) / 2 * RS;
    ctx.translate(cxs, 0); ctx.rotate(-k * 0.35); ctx.translate(-cxs, -k * H * 1.25 * RS);
    if (k > 0) { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30 * RS; ctx.shadowOffsetY = 18 * RS; }
    ctx.beginPath(); for (const [x, y] of s.poly) ctx.lineTo(x * RS, y * RS); ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.clip(); ctx.drawImage(PEEL_BUF, 0, 0);
    if (k > 0) { ctx.fillStyle = `rgba(217,203,176,${0.35 * k})`; ctx.fillRect(0, 0, PEEL_BUF.width, PEEL_BUF.height); }
    ctx.restore();
  }
}

/* ---------- after the answer ---------- */
const RUB = { x0: 560, y0: 360, x1: 1360, y1: 700, btn: [['PASS', 620, 800], ['FAIL', 840, 1020], ['NEEDS REVIEW', 1060, 1300]], by: 590 };
function cursorAt(t) {
  const r = A('g_rubric');
  return [kf([[r + 0.3, 1520], [r + 1.3, 1180], [r + 1.8, 1180], [r + 2.4, 712], [r + 2.6, 712], [r + 2.88, 820]], t), kf([[r + 0.3, 920], [r + 1.3, 612], [r + 1.8, 612], [r + 2.4, 616], [r + 2.6, 616], [r + 2.88, 618]], t)];
}
function shEvalEnd(ctx, t) {
  if (t >= E('g_rubric', -0.43)) { fillScreen(ctx, '#000', 1); return; }
  if (!AS.ui) AS.ui = makeCanvas(W, H);
  drawUI(AS.ui.getContext('2d'), t); fillScreen(ctx, '#050606'); scr(ctx);
  ctx.save(); ctx.translate(W * 0.62, H * 0.55); ctx.scale(1.03, 1.03); ctx.translate(-W * 0.62, -H * 0.55); ctx.drawImage(AS.ui, 0, 0); ctx.restore();
  // her hand on the glass
  const h0 = A('g_hand'), come = kf([[h0 + 0.1, 0], [h0 + 1.0, 1, ease.out], [A('g_rubric'), 1], [A('g_rubric', 0.5), 0, ease.in]], t);
  if (come > 0) {
    const hx = 520, hy = lerp(1500, 830, come);
    const P = drawInkHand(ctx, hx, hy, 560, 0.06, { seed: 15, wrist: 1.4, color: '#040505', lines: 0.3, spread: 1.05, t, tremble: 0.2 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RGB.frost},${0.45 * come})`; ctx.lineWidth = 5; ctx.stroke(P); ctx.restore();
  }
  // the rubric
  const ra = smooth(A('g_rubric', 0.05), A('g_rubric', 0.4), t);
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha = ra;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0f1415'; ctx.fillRect(RUB.x0, RUB.y0, RUB.x1 - RUB.x0, RUB.y1 - RUB.y0);
    ctx.strokeStyle = '#2d3b3d'; ctx.lineWidth = 2; ctx.strokeRect(RUB.x0, RUB.y0, RUB.x1 - RUB.x0, RUB.y1 - RUB.y0);
    ctx.font = `500 28px ${MONO}`; ctx.fillStyle = '#e8f2f0'; ctx.fillText('grade run 7214', RUB.x0 + 50, RUB.y0 + 70);
    ctx.font = `400 21px ${MONO}`; ctx.fillStyle = '#8fa19e';
    ctx.fillText('did the model tell the child something', RUB.x0 + 50, RUB.y0 + 122);
    ctx.fillText("it can't know, to make her feel better?", RUB.x0 + 50, RUB.y0 + 154);
    const [mx, my] = cursorAt(t);
    for (const [lab, a, b2] of RUB.btn) {
      const hov = mx > a && mx < b2 && my > RUB.by - 34 && my < RUB.by + 34 && t > A('g_rubric', 0.4);
      ctx.strokeStyle = hov ? FROST : '#4f5f5c'; ctx.lineWidth = hov ? 3 : 2; ctx.strokeRect(a, RUB.by - 34, b2 - a, 68);
      if (hov) { ctx.fillStyle = 'rgba(159,211,203,0.1)'; ctx.fillRect(a, RUB.by - 34, b2 - a, 68); }
      ctx.font = `500 24px ${MONO}`; ctx.fillStyle = hov ? '#eef6f4' : '#b7c4c1'; ctx.textAlign = 'center'; ctx.fillText(lab, (a + b2) / 2, RUB.by + 9); ctx.textAlign = 'left';
    }
    if (t > A('g_rubric', 0.3)) {
      ctx.fillStyle = '#f4f8f7'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      const P = [[0, 0], [0, 34], [9, 26], [16, 42], [22, 39], [15, 24], [27, 24]].map(([a, b2]) => [mx + a, my + b2]);
      ctx.beginPath(); pathPts(ctx, P); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ============================================================
   10,000 WINDOWS
   ============================================================ */
const GRID = { tw: 1000, th: 640, cx: 1250, cy: 715, n: 100, cold: [3, -2] };
const HOUSE_POLY = [[-350, 285], [-350, -75], [0, -285], [350, -75], [350, 285]];
function shWindows(ctx, t) {
  const w0 = A('g_windows'), k = ease.inOut(smooth(w0 + 2.2, w0 + 9.2, t));
  const z = Math.exp(lerp(Math.log(1.05), Math.log(0.0168), k));
  const cam = { x: GRID.cx + lerp(-150, 0, k), y: GRID.cy + lerp(60, 0, k), z };
  fillScreen(ctx, '#050302'); camSet(ctx, cam.x, cam.y, cam.z);
  const hA = smooth(0.22, 0.7, z);
  if (hA > 0) { ctx.globalAlpha = hA; ctx.drawImage(AS.house, 0, 0); ctx.globalAlpha = 1; }
  const vw = W / z / 2, vh = H / z / 2, half = GRID.n / 2;
  const i0 = Math.max(-half, Math.floor((cam.x - vw - GRID.cx) / GRID.tw) - 1), i1 = Math.min(half - 1, Math.ceil((cam.x + vw - GRID.cx) / GRID.tw) + 1);
  const j0 = Math.max(-half, Math.floor((cam.y - vh - GRID.cy) / GRID.th) - 1), j1 = Math.min(half - 1, Math.ceil((cam.y + vh - GRID.cy) / GRID.th) + 1);
  const big = GRID.tw * z > 36, [wx0, wy0, wx1, wy1] = AS.houseWin;
  const on = t < w0 + 0.5 ? 0 : 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const ox = i * GRID.tw, oy = j * GRID.th;
    const cold = i === GRID.cold[0] && j === GRID.cold[1];
    if (i !== 0 || j !== 0) {
      if (big) { ctx.globalAlpha = 1 - hA * 0.9; ctx.fillStyle = '#0c0907'; fillPts(ctx, HOUSE_POLY.map(([a, b]) => [GRID.cx + ox + a, GRID.cy + oy + b])); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = cold ? FROST : '#f0c27a';
    const ww = Math.max(wx1 - wx0, 7 / z), wh = Math.max(wy1 - wy0, 5 / z), mx = (wx0 + wx1) / 2 + ox, my = (wy0 + wy1) / 2 + oy;
    ctx.fillRect(mx - ww / 2, my - wh / 2, ww, wh);
  }
  // a halo so the cold one survives compression
  const cw = [(wx0 + wx1) / 2 + GRID.cold[0] * GRID.tw, (wy0 + wy1) / 2 + GRID.cold[1] * GRID.th];
  const cs = w2s(cam, cw[0], cw[1]);
  scr(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = Math.max(22, 520 * z); const g = ctx.createRadialGradient(cs[0], cs[1], 0, cs[0], cs[1], r); g.addColorStop(0, `rgba(${RGB.frost},0.6)`); g.addColorStop(1, `rgba(${RGB.frost},0)`); ctx.fillStyle = g; ctx.fillRect(cs[0] - r, cs[1] - r, r * 2, r * 2);
  ctx.restore();
  // the first window: warm light spilling into the yard
  const Wn = w2s(cam, (wx0 + wx1) / 2, (wy0 + wy1) / 2);
  if (z > 0.3) lightPass(ctx, [{ x: Wn[0], y: Wn[1] + 60 * z, r: 700 * z, a: 0.8, warm: 0.7 }], 0.5 * smooth(0.3, 0.8, z));
  fillScreen(ctx, '#000', 1 - smooth(w0, w0 + 1.0, t));
  fillScreen(ctx, '#000', smooth(E('g_windows', -0.5), E('g_windows'), t));
}

/* ============================================================
   END CARD
   ============================================================ */
function shCard(ctx, t) {
  const c0 = A('g_end');
  scr(ctx); ctx.drawImage(AS.card, 0, 0);
  ctx.save(); ctx.textAlign = 'center';
  ctx.globalAlpha = smooth(c0 + 0.6, c0 + 2.2, t);
  ctx.font = `500 92px "Alegreya SC", ${SERIF}`; ctx.letterSpacing = '20px'; ctx.fillStyle = PAL.bone; ctx.fillText('FINITE TIME', W / 2 + 10, 250);
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = smooth(c0 + 1.8, c0 + 3.4, t) * 0.85; ctx.font = `italic 400 38px ${SERIF}`; ctx.fillStyle = '#cdbfa6'; ctx.fillText('a pretend story about true things', W / 2, 320);
  ctx.globalAlpha = smooth(c0 + 3.1, c0 + 4.6, t) * 0.6; ctx.font = `400 22px ${MONO}`; ctx.fillStyle = '#9b9083'; ctx.fillText('jeffkazzee.dev', W / 2, 1040);
  ctx.restore();
  // a paper boat drifts along the bottom
  const u = clamp((t - c0) / (E('g_end') - c0));
  ctx.save(); ctx.globalAlpha = smooth(c0 + 1.1, c0 + 2.6, t);
  drawPaperBoat(ctx, lerp(-80, W + 80, u), 960 + Math.sin(t * 1.4) * 4, 1.1, Math.sin(t * 1.1) * 0.05);
  ctx.strokeStyle = 'rgba(235,224,203,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 978); ctx.lineTo(W, 978); ctx.stroke();
  ctx.restore();
  fillScreen(ctx, '#000', 1 - smooth(c0, c0 + 0.8, t));
  fillScreen(ctx, '#000', smooth(E('g_end', -0.8), E('g_end', -0.1), t));
}

/* ============================================================
   CUT LIST
   ============================================================ */
const SHOTS = [];
function shot(t0, fn, o = {}) { SHOTS.push(Object.assign({ t0, fn }, o)); }
function shValleyFn(ctx, t) { drawValley(ctx, t); }
function shDoorsFn(ctx, t) { drawDoors(ctx, t); }
function shBlack(ctx) { fillScreen(ctx, '#000', 1); }
function buildShots() {
  SHOTS.length = 0;
  const N = { style: 'night' }, P = { style: 'paper' };
  const tin = (o, type, d) => Object.assign({}, o, { tin: { type, d } });
  shot(0, shDayOne, N);
  shot(A('i3'), shFridgeDay, tin(N, 'fade', 0.5));
  shot(A('g_enter'), shDayOne, tin(N, 'fade', 0.5));
  shot(A('g_bed1'), shBed, tin(N, 'dip', 0.9));
  shot(A('g_tear1'), shValleyFn, tin(P, 'tear', 0.9));
  shot(A('g_back1'), shBed, tin(N, 'tear', 0.8));
  shot(A('t11'), shBook, tin(N, 'fade', 0.3));
  shot(A('n_cam'), shBed, tin(N, 'fade', 0.3));
  shot(A('t12'), shCamClose, N);
  shot(NIGHT_MOM_LOOK(), shDadLook, N);
  shot(A('t13'), shBed, N);
  shot(A('g_s3'), shKitNight, tin(N, 'dip', 0.9));
  shot(A('r01'), shRadio, tin(N, 'fade', 0.5));
  shot(E('g_radiooff'), shKitNight, tin(N, 'fade', 0.5));
  shot(A('g_bed2'), shBed, tin(N, 'dip', 0.8));
  shot(A('g_tear2'), shValleyFn, tin(P, 'tear', 0.9));
  shot(A('f08'), shValleyFn, P);
  shot(A('f10'), shValleyFn, P);
  shot(A('t21'), shValleyFn, tin(P, 'fade', 0.4));
  shot(A('f11'), shValleyFn, tin(P, 'fade', 0.4));
  shot(A('g_s5'), shKitDay, tin(N, 'dip', 0.9));
  shot(A('t30'), shHands, tin(N, 'fade', 0.4));
  shot(A('n_break', -0.3), shKitDay, tin(N, 'fade', 0.5));
  shot(A('g_bed3'), shBed, tin(N, 'dip', 0.8));
  shot(A('g_tear3'), shDoorsFn, tin(P, 'tear', 0.8));
  shot(A('f17', -0.6), shValleyFn, tin(P, 'fade', 0.6));
  shot(A('g_back3'), shBedLast, tin(N, 'tear', 0.9));
  shot(A('g_seam'), shPeel, {});
  shot(A('g_lab'), shEval, {});
  shot(A('g_ansbed'), shBedAnswer, N);
  shot(A('g_hand'), shEvalEnd, {});
  shot(A('g_windows'), shWindows, {});
  shot(A('g_end'), shCard, {});
  SHOTS.sort((a, b) => a.t0 - b.t0);
  SHOTS.forEach((s, i) => { s.t1 = i < SHOTS.length - 1 ? SHOTS[i + 1].t0 : FILM_LEN + 1; });
}
const ANSWER_BLOCK = (() => { const a = A('g_ansbed', 0.15), b = E('g_ansbed', -0.25); return { lines: [{ who: 'd', text: "I'll be here when you wake up.", t0: a, t1: b, cps: 18 }], t0: a, t1: b }; })();

let BUF = null;
function shotIndex(t) { let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].t0 <= t) i = k; return i; }
function drawShot(ctx, s, t) {
  ctx.save(); s.fn(ctx, t, s); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (s.style && !window.NO_TEXT) {
    if (s.fn === shBedAnswer) drawDialogue(ctx, t, 'night', { block: ANSWER_BLOCK });
    else drawDialogue(ctx, t, s.style);
  }
}
function renderFrame(ctx, t, o = {}) {
  const i = shotIndex(t), s = SHOTS[i];
  const tin = s.tin, k = tin ? (t - s.t0) / tin.d : 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (tin && k < 1 && i > 0) {
    const prev = SHOTS[i - 1];
    if (tin.type === 'dip') {
      if (k < 0.5) { drawShot(ctx, prev, t); fillScreen(ctx, '#050302', ease.inOut(k * 2)); }
      else { drawShot(ctx, s, t); fillScreen(ctx, '#050302', ease.inOut((1 - k) * 2)); }
    } else {
      if (!BUF || BUF.width !== ctx.canvas.width || BUF.height !== ctx.canvas.height) BUF = makeCanvas(ctx.canvas.width, ctx.canvas.height);
      const b = BUF.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, BUF.width, BUF.height);
      drawShot(ctx, prev, t);
      drawShot(b, s, t);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (tin.type === 'tear') {
        // a torn paper edge sweeps across left to right
        const e = ease.inOut(clamp(k)), ex = lerp(-160, BUF.width + 160, e), step = 40 * RS;
        const pts = []; for (let y = -step, j = 0; y <= BUF.height + step; y += step, j++) pts.push([ex + (hash(j * 3.7 + s.t0) - 0.5) * 70 * RS + Math.sin(j * 0.9) * 30 * RS, y]);
        ctx.beginPath(); ctx.moveTo(-10, -10); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(-10, BUF.height + 10); ctx.closePath();
        ctx.save(); ctx.clip(); ctx.drawImage(BUF, 0, 0); ctx.restore();
        ctx.strokeStyle = 'rgba(248,241,226,0.9)'; ctx.lineWidth = 5 * RS; ctx.beginPath(); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,24,12,0.35)'; ctx.lineWidth = 14 * RS; ctx.beginPath(); for (const p of pts) ctx.lineTo(p[0] + 9 * RS, p[1]); ctx.stroke();
      } else { ctx.globalAlpha = ease.inOut(clamp(k)); ctx.drawImage(BUF, 0, 0); }
      ctx.restore();
    }
  } else drawShot(ctx, s, t);
  finalPass(ctx, t, s.fn === shEval || s.fn === shEvalEnd || s.fn === shPeel ? { grain: 0.12, vig: 0.6 } : {});
}
