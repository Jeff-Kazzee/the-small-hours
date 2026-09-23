/* Finite Time: the fable. Cut paper, ochre and bone. Every time here is keyed to a line of the script. */
'use strict';

/* ---------- which part of the story is on screen ---------- */
const inP1 = (t) => t >= A('g_tear1') - 0.1 && t < A('g_back1') + 1.0;   // night one: the kingdom builds the river
const inP2 = (t) => t >= A('g_tear2') - 0.1 && t < E('g_blow');         // night two: almost, the mill, the gate, the boats
const inFerry = (t) => t >= A('f17') - 1.0 && t < A('g_back3') + 1.0;   // night three: the ferryman

/* ---------- the river's speed, and distance travelled (so scrubbing works) ---------- */
function flowV(t) {
  if (inP1(t)) return t < E('f03') ? 0 : lerp(60, 130, smooth(E('f03'), E('f05'), t));
  if (inP2(t)) {
    if (t >= A('f12')) { const T = E('f12') + 0.35; return t > E('f12') + 0.2 ? 0 : Math.min(9000, 280 * Math.pow((T - A('f12')) / Math.max(0.02, T - t), 1.6)); }
    if (t >= A('f11')) return lerp(170, 280, smooth(A('f11'), E('f11'), t));
    return 140 + 30 * smooth(A('f09'), A('f09') + 5, t);
  }
  if (inFerry(t)) return 110;
  return 0;
}
const FLOW = (function () {
  const dt = 1 / 60, n = Math.ceil((FILM_LEN + 2) / dt), D = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { D[i] = acc; acc += flowV(i * dt) * dt; }
  return { D, dt };
})();
function flowD(t) { const i = t / FLOW.dt, k = Math.floor(i); if (k < 0) return 0; if (k >= FLOW.D.length - 1) return FLOW.D[FLOW.D.length - 1]; return lerp(FLOW.D[k], FLOW.D[k + 1], i - k); }

/* ---------- river state ---------- */
const trenchW = (t) => kf([[A('f02'), 0], [E('f02'), 380], [A('f03'), 380], [E('f03') - 0.3, 1300, ease.in]], t);
const waterFill = (t) => (inP1(t) ? smooth(E('f03') - 0.4, E('f03') + 1.2, t) : 1);
const riverBend = (t) => (inP2(t) ? smooth(E('f06') - 0.9, E('f06') + 0.8, t) : 0);
const riverWide = (t) => (inP2(t) ? smooth(A('f08') + 0.6, A('f08') + 3.6, t) : 0);
const riverRise = (t) => (inP2(t) ? smooth(A('f09') + 0.4, A('f09') + 3.2, t) : 0);
function riverC(x, t) { const s = clamp((x - 900) / 1450); return VAL.riverY - riverBend(t) * 120 * s * s; }
function riverHW(x, t) { const s2 = clamp((x - 1400) / 1000); return VAL.riverHW + riverWide(t) * 30 * s2 + riverRise(t) * 12; }

function riverBand(ctx, x0, x1, t, grow = 0) {
  const top = [], bot = [];
  for (let x = x0; x <= x1 + 0.1; x += 20) { const c = riverC(x, t), hw = riverHW(x, t) + grow; top.push([x, c - hw]); bot.push([x, c + hw]); }
  return top.concat(bot.reverse());
}
function drawRiver(ctx, t, o = {}) {
  const fill = waterFill(t), xw = trenchW(t), xe = VAL.w - xw;
  ctx.save();
  // the trench (dug, dry)
  if (inP1(t) && t < E('f03') + 2) {
    for (const [a, b] of [[-40, xw], [xe, VAL.w + 40]]) {
      if (b - a < 4) continue;
      const P = riverBand(ctx, a, b, t, 6);
      ctx.fillStyle = 'rgba(52,28,12,0.35)'; ctx.save(); ctx.translate(4, 6); fillPts(ctx, P); ctx.restore();
      ctx.fillStyle = '#2e1c10'; fillPts(ctx, P);
    }
  }
  // water
  const wa = 1300 - fill * 1500, wb = 1300 + fill * 1500;
  if (fill > 0) {
    const P = riverBand(ctx, Math.max(-40, wa), Math.min(VAL.w + 40, wb), t);
    ctx.fillStyle = 'rgba(52,28,12,0.35)'; ctx.save(); ctx.translate(4, 6); fillPts(ctx, P); ctx.restore();
    ctx.fillStyle = PAPER.river; fillPts(ctx, P);
    // lighter mid-current band
    const M = []; const Mb = [];
    for (let x = Math.max(-40, wa); x <= Math.min(VAL.w + 40, wb); x += 20) { const c = riverC(x, t), hw = riverHW(x, t); M.push([x, c - hw * 0.45]); Mb.push([x, c + hw * 0.05]); }
    ctx.globalAlpha = 0.55; ctx.fillStyle = PAPER.riverL; fillPts(ctx, M.concat(Mb.reverse())); ctx.globalAlpha = 1;
    // far bank lip
    ctx.strokeStyle = '#d9b98a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7; ctx.beginPath();
    for (let x = Math.max(-40, wa), f = true; x <= Math.min(VAL.w + 40, wb); x += 20) { const y = riverC(x, t) - riverHW(x, t); if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    // ripples
    const D = flowD(t), v = flowV(t), st = clamp(v / 300);
    ctx.fillStyle = '#efe0c2';
    for (let i = 0; i < 92; i++) {
      const lane = (hash(i * 3.1) - 0.5) * 1.5, base = hash(i * 7.7) * (VAL.w + 300), len = 16 + hash(i * 1.9) * 38, mul = 0.7 + hash(i * 5.3) * 0.6;
      const x = ((base + D * mul) % (VAL.w + 350) + VAL.w + 350) % (VAL.w + 350) - 170;
      if (x < wa || x > wb) continue;
      const c = riverC(x, t), hw = riverHW(x, t), y = c + lane * hw * 0.78;
      const L = len * (1 + st * st * 14) * (o.streak ?? 1);
      ctx.globalAlpha = 0.55 * (1 - Math.abs(lane) * 0.4);
      ctx.beginPath(); ctx.roundRect(x - L / 2, y - 2.5, L, 5, 2.5); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ---------- boats ---------- */
function drawWoodBoat(ctx, x, y, s, cargo, seed) {
  const hull = xf([[-58, -8], [58, -8], [44, 16], [-44, 16]], x, y, s);
  paperLive(ctx, hull, '#b0632e');
  ctx.fillStyle = '#8e3f22'; fillPts(ctx, xf([[-58, -8], [58, -8], [55, -2], [-55, -2]], x, y, s));
  if (cargo === 'sacks') { for (const [dx, r] of [[-22, 15], [2, 17], [26, 13]]) paperLive(ctx, ellipsePts(x + dx * s, y - 18 * s, r * s, r * 0.8 * s, 12), '#efe3c8', { sx: 2, sy: 3 }); }
  else {
    for (const dx of [-26, 0, 26]) { const P = xf(rectPts(-11, -34, 11, -18), x + dx * s, y, s, (hash(seed + dx) - 0.5) * 0.3); paperLive(ctx, P, '#faf4e6', { sx: 2, sy: 3 }); ctx.strokeStyle = 'rgba(42,27,18,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo((P[0][0] + P[1][0]) / 2, (P[0][1] + P[2][1]) / 2 + 2); ctx.lineTo(P[1][0], P[1][1]); ctx.stroke(); }
  }
}
function drawPaperBoat(ctx, x, y, s, rot = 0) {
  const hull = xf([[-40, -6], [40, -6], [26, 12], [-26, 12]], x, y, s, rot);
  const sail = xf([[-20, -6], [0, -40], [20, -6]], x, y, s, rot);
  paperLive(ctx, hull, '#f8f1e2', { sx: 3, sy: 4 }); paperLive(ctx, sail, '#fbf6ea', { sx: 3, sy: 4 });
  ctx.strokeStyle = 'rgba(42,27,18,0.45)'; ctx.lineWidth = 1.4 * s;
  const a = xf([[0, -40], [0, 12]], x, y, s, rot), b = xf([[-40, -6], [-8, 4], [8, 4], [40, -6]], x, y, s, rot);
  ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); ctx.lineTo(a[1][0], a[1][1]); ctx.stroke();
  ctx.beginPath(); pathPts(ctx, b, false); ctx.stroke();
}
function woodBoats(ctx, t) {
  if (waterFill(t) < 0.99) return;
  const D = flowD(t);
  for (let i = 0; i < 7; i++) {
    const x = ((i * 560 + D * 0.55) % (VAL.w + 500)) - 250, y = riverC(x, t) - 6 + Math.sin(q12(t) * 3 + i) * 2.5;
    drawWoodBoat(ctx, x, y, 0.95, i % 2 ? 'sacks' : 'letters', i * 13);
  }
}
const PB_SPAWN = (k) => A('f10') + 2.2 + k * 1.7;
const ferryX = (t) => lerp(620, 1700, clamp((t - A('f17')) / (E('f17') - A('f17'))));
function paperBoatX(k, t) { const ts = PB_SPAWN(k); return 810 + k * 55 + (flowD(t) - flowD(ts)) * 0.5; }
function paperBoats(ctx, t) {
  for (let k = 0; k < 4; k++) {
    const ts = PB_SPAWN(k); if (t < ts) continue;
    const x = paperBoatX(k, t), drop = 1 - ease.out(smooth(ts, ts + 0.5, t));
    const y = riverC(x, t) - 4 - drop * 60 + Math.sin(q12(t) * 2.4 + k) * 2;
    drawPaperBoat(ctx, x, y, 0.9, Math.sin(q12(t) * 1.7 + k) * 0.05);
  }
}

/* ---------- buildings ---------- */
function drawHall(ctx, x, baseY, g, kind, estate = 0) {
  const w = 190, h = 200 * g, body = kind === 'w' ? '#6e4327' : '#4a2b18', roof = kind === 'w' ? '#c98a4b' : '#e2913a';
  if (estate > 0) {
    const ew = 520 * estate;
    paperLive(ctx, rectPts(x - ew, baseY - 70, x + ew, baseY + 30), '#5a3520');
    ctx.fillStyle = '#5a3520'; for (let k = -ew; k < ew; k += 36) ctx.fillRect(x + k, baseY - 92, 20, 24);
  }
  if (g > 1.15) { const th = (g - 1) * 190; paperLive(ctx, rectPts(x + w / 2 - 20, baseY - h - th, x + w / 2 + 44, baseY), body); paperLive(ctx, [[x + w / 2 - 28, baseY - h - th], [x + w / 2 + 12, baseY - h - th - 60], [x + w / 2 + 52, baseY - h - th]], roof); }
  if (g > 1.5) { const th = (g - 1.4) * 220; paperLive(ctx, rectPts(x - w / 2 - 40, baseY - h - th, x - w / 2 + 24, baseY), body); paperLive(ctx, [[x - w / 2 - 48, baseY - h - th], [x - w / 2 - 8, baseY - h - th - 54], [x - w / 2 + 32, baseY - h - th]], roof); }
  paperLive(ctx, rectPts(x - w / 2, baseY - h, x + w / 2, baseY), body);
  paperLive(ctx, [[x - w / 2 - 16, baseY - h], [x, baseY - h - 96], [x + w / 2 + 16, baseY - h]], roof);
  ctx.fillStyle = '#f0dcb0';
  const rows = Math.max(2, Math.floor(h / 60));
  for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x - 60 + c * 48, baseY - h + 26 + r * 56, 22, 28);
  ctx.fillStyle = PAPER.soot; ctx.fillRect(x - 18, baseY - 50, 36, 50);
  ctx.strokeStyle = PAPER.soot; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, baseY - h - 96); ctx.lineTo(x, baseY - h - 170); ctx.stroke();
  paperLive(ctx, [[x, baseY - h - 170], [x + (kind === 'w' ? 56 : -56), baseY - h - 156], [x, baseY - h - 142]], kind === 'w' ? '#d88a3d' : '#b8452c', { sx: 2, sy: 3 });
}
function drawMill(ctx, x, y, rot, wheelA) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  // stilts, body, roof
  ctx.fillStyle = PAPER.umberD; ctx.fillRect(-44, -8, 8, 40); ctx.fillRect(30, -8, 8, 40);
  paperLive(ctx, rectPts(-50, -86, 50, -6), '#efe3c8'); paperLive(ctx, [[-60, -86], [0, -140], [60, -86]], '#8e3f22');
  ctx.fillStyle = PAPER.soot; ctx.fillRect(-12, -60, 20, 26);
  // waterwheel
  const wx = -72, wy = -20, R = 46;
  ctx.strokeStyle = PAPER.umber; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(wx, wy, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 4; for (let k = 0; k < 8; k++) { const a = wheelA + (k / 8) * TAU; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * R, wy + Math.sin(a) * R); ctx.stroke(); ctx.fillStyle = PAPER.umber; ctx.fillRect(wx + Math.cos(a) * R - 6, wy + Math.sin(a) * R - 6, 12, 12); }
  ctx.restore();
}
function drawGate(ctx, t) {
  const x = VAL.gate, c = riverC(x, t), hw = riverHW(x, t);
  const lift = inP2(t) ? smooth(A('f09') + 5.2, A('f09') + 7.4, t) : 0, drift = inP2(t) ? ease.in(smooth(A('f09') + 5.8, A('f09') + 9.7, t)) : 0;
  ctx.fillStyle = PAPER.umber; ctx.fillRect(x - 36, c - hw - 70, 14, hw * 2 + 90); ctx.fillRect(x + 22, c - hw - 70, 14, hw * 2 + 90);
  // the gate board
  ctx.save(); ctx.translate(x + drift * 380, c - lift * 170 + drift * 40); ctx.rotate(lift * 0.5 + drift * 0.8);
  paperLive(ctx, rectPts(-24, -hw - 10, 24, hw + 6), '#e6d3ae'); ctx.strokeStyle = 'rgba(42,27,18,0.4)'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-24, k * 20); ctx.lineTo(24, k * 20); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = PAPER.soot; ctx.fillRect(x - 60, c - hw - 76, 120, 10);
  // the keeper's hut and the keeper
  const [hx, hy] = VAL.hut, dx = drift * 520, dy = drift * 70, rr = drift * 0.35;
  ctx.save(); ctx.translate(hx + dx, hy + dy); ctx.rotate(rr);
  paperLive(ctx, rectPts(-40, -60, 40, 0), '#efe3c8'); paperLive(ctx, [[-50, -60], [0, -100], [50, -60]], '#8e3f22'); ctx.fillStyle = PAPER.soot; ctx.fillRect(-10, -34, 18, 34);
  ctx.restore();
  paperPerson(ctx, x + 70 + dx * 1.1, hy - 4 + dy, 58, { col: PAPER.soot, face: -1, arm: 2.4 });
}

/* ---------- people on the hills ---------- */
const PATH_PTS = (() => { const p = []; for (let i = 0; i <= 20; i++) { const u = i / 20; p.push([lerp(VAL.well[0], 1300, u), lerp(VAL.well[1], midHillY(1300) - 8, u) + Math.sin(u * 3) * 12]); } return p; })();
function alongPath(u) { const n = PATH_PTS.length - 1, i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i; return [lerp(PATH_PTS[i][0], PATH_PTS[i + 1][0], f), lerp(PATH_PTS[i][1], PATH_PTS[i + 1][1], f)]; }
function bucketCarriers(ctx, t) {
  const tq = q12(t);
  for (let i = 0; i < 6; i++) { const u = frac(tq * 0.035 + i / 6), [x, y] = alongPath(u); paperPerson(ctx, x, y + 6, 62, { col: PAPER.soot, walk: u * 14, yoke: true, face: 1 }); }
}
function watchers(ctx, t, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  for (let i = 0; i < 16; i++) { const x = 960 + i * 50 + hash(i) * 20, y = midHillY(x) + 4; paperPerson(ctx, x, y, 44 + hash(i * 2) * 10, { col: i % 3 ? PAPER.soot : '#5a3520', face: i % 2 ? 1 : -1 }); }
  ctx.restore();
}
function diggers(ctx, t) {
  if (!inP1(t) || t < A('f02') - 0.5 || t > E('f03') + 0.5) return;
  const xw = trenchW(t), xe = VAL.w - xw, tq = q12(t), sp = t > A('f03') ? 3.2 : 1.6;
  for (let k = 0; k < 2; k++) {
    paperPerson(ctx, xw - 30 - k * 60, VAL.riverY - 30, 76, { col: '#5a3520', face: 1, shovel: tq * sp + k * 0.4 });
    paperPerson(ctx, xe + 30 + k * 60, VAL.riverY - 30, 76, { col: '#2a1b12', face: -1, shovel: tq * sp + k * 0.4 + 0.2 });
  }
  // dust
  ctx.fillStyle = '#e9d6b0';
  for (let i = 0; i < 18; i++) { const life = frac(tq * 1.4 + hash(i)), side = i % 2 ? xw : xe; ctx.globalAlpha = (1 - life) * 0.7; ctx.beginPath(); ctx.arc(side + (i % 2 ? 1 : -1) * (hash(i * 3) * 50), VAL.riverY - 40 - life * 60, 4 + life * 8, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function makers(ctx, t) {
  if (t < A('f10') - 0.8 || t > E('f10') + 0.6) return;
  for (let k = 0; k < 3; k++) {
    const x = 760 + k * 96, reach = smooth(PB_SPAWN(k) - 0.8, PB_SPAWN(k) - 0.2, t) * (1 - smooth(PB_SPAWN(k) + 0.2, PB_SPAWN(k) + 0.8, t));
    paperPerson(ctx, x, 1010, 84, { col: PAPER.soot, face: 1, arm: 0.2 + reach * 0.9 });
  }
}

/* ---------- the millers leave (night one) ---------- */
function millers(ctx, t) {
  if (!inP1(t) || t < A('f04') - 0.5 || t > E('f04') + 1.5) return;
  const go = smooth(A('f04') + 3.4, E('f04') + 1.2, t), tq = q12(t);
  for (let k = 0; k < 3; k++) {
    const x0 = VAL.mill[0] + 60 + k * 44, x = x0 - go * (620 + k * 60), y = VAL.mill[1] - 4;
    paperPerson(ctx, x, y, 60, { col: '#5a3520', face: go > 0.02 ? -1 : 1, walk: go > 0.02 ? x / 90 : null, arm: go > 0.02 ? null : 1.2 + Math.sin(tq * 5 + k) * 0.5 });
  }
}

/* ---------- the valley, per frame ---------- */
// camera: hard cuts between segments, eased moves inside each
const cam3 = (t, xs, ys, zs) => ({ x: kf(xs, t), y: kf(ys, t), z: kf(zs, t) });
function valleyCam(t) {
  if (inP1(t)) {
    if (t < A('f02')) return cam3(t, [[A('g_tear1'), 1110], [E('f01'), 1120]], [[A('g_tear1'), 745], [E('f01'), 735]], [[A('g_tear1'), 1.25], [E('f01'), 1.3]]);
    if (t < A('f04')) return cam3(t, [[A('f02'), 1300]], [[A('f02'), 690], [A('f03'), 710], [E('f03'), 800]], [[A('f02'), 0.86], [A('f03'), 0.88], [E('f03'), 1.0]]);
    if (t < A('f05')) return cam3(t, [[A('f04'), 1850], [E('f04'), 1780]], [[A('f04'), 800], [E('f04'), 805]], [[A('f04'), 1.2], [E('f04'), 1.14]]);
    return cam3(t, [[A('f05'), 1300], [E('f05'), 1320]], [[A('f05'), 830], [E('f05'), 840]], [[A('f05'), 1.05], [E('f05'), 1.12]]);
  }
  if (inP2(t)) {
    if (t < A('f08')) return cam3(t, [[A('g_tear2'), 1300], [A('f07'), 1300], [A('f08'), 1700]], [[A('g_tear2'), 690], [A('f07'), 700], [A('f08'), 800]], [[A('g_tear2'), 0.86], [A('f07'), 0.88], [A('f08'), 0.98]]);
    if (t < A('f09')) return cam3(t, [[A('f08'), 1960], [E('f08'), 2000]], [[A('f08'), 815], [E('f08'), 822]], [[A('f08'), 1.22], [E('f08'), 1.28]]);
    if (t < A('f10')) return cam3(t, [[A('f09'), 2000], [A('f09', 2.4), 2260]], [[A('f09'), 822], [A('f09', 2.4), 830]], [[A('f09'), 1.28], [A('f09', 2.4), 1.12]]);
    if (t < A('t21')) return cam3(t, [[A('f10'), 1000], [A('t21'), 1060]], [[A('f10'), 900]], [[A('f10'), 1.2], [A('t21'), 1.26]]);
    if (t < A('f11')) { const bx = paperBoatX(1, t); return { x: bx + 30, y: riverC(bx, t) - 40, z: kf([[A('t21'), 2.2], [A('f11'), 2.7]], t) }; }
    return cam3(t, [[A('f11'), 1300]], [[A('f11'), 690], [E('f12'), 700]], [[A('f11'), 0.86], [A('f12'), 0.88], [E('f12'), 0.98]]);
  }
  // the ferryman: close on him, then out to the fenced banks on "who owned the banks"
  const fx = ferryX(t), out = ease.inOut(smooth(E('f17') - 3.6, E('f17') - 1.4, t));
  return { x: lerp(fx + 60, 1300, out), y: lerp(860, 720, out), z: lerp(1.75, 0.9, out) };
}

function clampCam(c) { const hw = W / (2 * c.z), hh = H / (2 * c.z); return { x: clamp(c.x, hw, VAL.w - hw), y: clamp(c.y, hh, VAL.h - hh), z: c.z }; }
function drawValley(ctx, t, o = {}) {
  const cam = clampCam(o.cam || valleyCam(t));
  let shake = null;
  if (inP2(t) && t > A('f12', 0.6)) { const a = 18 * Math.pow(smooth(A('f12', 0.6), E('f12', 0.1), t), 2); shake = [noise1(t * 37) * a, noise1(t * 41 + 3) * a]; }
  fillScreen(ctx, '#e2cda4');
  camSet(ctx, cam.x, cam.y, cam.z, shake);
  ctx.drawImage(AS.valleyBack, 0, 0);
  const late = inFerry(t);
  // halls grow while nobody votes; estates at the end of the story
  const g = late ? 2.5 : inP2(t) ? 1 + 0.9 * smooth(A('f11', 1.0), A('f11', 6.0), t) : 1;
  drawHall(ctx, VAL.westHall[0], VAL.westHall[1], g, 'w', late ? 1 : 0);
  drawHall(ctx, VAL.eastHall[0], VAL.eastHall[1], g, 'e', late ? 1 : 0);
  if (inP1(t)) bucketCarriers(ctx, t);
  if (inP2(t)) watchers(ctx, t, 1);
  if (late) {
    // fences along the far bank
    ctx.strokeStyle = PAPER.soot; ctx.lineWidth = 5;
    for (let x = 40; x < VAL.w; x += 44) { if (Math.abs(x - 1300) < 120) continue; const y = riverC(x, t) - riverHW(x, t) - 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke(); }
    ctx.lineWidth = 4; for (const dy of [18, 36]) { ctx.beginPath(); ctx.moveTo(40, VAL.riverY - VAL.riverHW - 6 - dy); ctx.lineTo(1180, VAL.riverY - VAL.riverHW - 6 - dy); ctx.moveTo(1420, VAL.riverY - VAL.riverHW - 6 - dy); ctx.lineTo(VAL.w, VAL.riverY - VAL.riverHW - 6 - dy); ctx.stroke(); }
  }
  // the makers' planned course
  if (inP2(t) && t < A('f08', 10)) {
    ctx.save(); ctx.strokeStyle = '#b8452c'; ctx.lineWidth = 5; ctx.setLineDash([26, 18]); ctx.globalAlpha = 0.85 * (1 - smooth(A('f08', 5), A('f08', 9), t));
    ctx.beginPath(); ctx.moveTo(0, VAL.riverY); ctx.lineTo(VAL.w, VAL.riverY); ctx.stroke(); ctx.restore();
  }
  drawRiver(ctx, t, o);
  if (!late && (inP1(t) || (inP2(t) && t < E('f12', 0.3)))) woodBoats(ctx, t);
  // the mill: turning in night one, carried off in night two, gone by the ferryman
  if (inP1(t)) drawMill(ctx, VAL.mill[0], VAL.mill[1], 0, flowD(t) * 0.012);
  else if (inP2(t) && t < A('f08', 10.2)) {
    const k = smooth(A('f08', 5.1), A('f08', 10.1), t), tip = smooth(A('f08', 4.4), A('f08', 6.3), t);
    const mx = VAL.mill[0] + ease.in(k) * 760, my = VAL.mill[1] + tip * 30 + Math.sin(q12(t) * 3) * 3 * tip;
    drawMill(ctx, mx, my, -tip * 0.42 - k * 0.3, flowD(t) * 0.012);
  }
  millers(ctx, t);
  if (inP1(t) || inP2(t)) drawGate(ctx, t);
  if (inP2(t)) paperBoats(ctx, t);
  diggers(ctx, t);
  if (late) {
    // the ferryman
    const fx = ferryX(t), fy = riverC(fx, t) + 2 + Math.sin(q12(t) * 2) * 2;
    paperLive(ctx, xf([[-96, -6], [96, -6], [80, 14], [-80, 14]], fx, fy), '#6e4327');
    const point = smooth(E('f17', -3.4), E('f17', -2.6), t);
    paperPerson(ctx, fx - 10, fy - 6, 124, { col: PAPER.soot, face: 1, pole: Math.sin(q12(t) * 1.6), arm: point > 0 ? lerp(0.3, 2.3, point) : null });
  }
  ctx.drawImage(AS.valleyFront, 0, 0);
  makers(ctx, t);
  if (late) {
    // a fence on the near bank too
    ctx.strokeStyle = PAPER.soot; ctx.lineWidth = 6;
    for (let x = 20; x < VAL.w; x += 52) { ctx.beginPath(); ctx.moveTo(x, 1020); ctx.lineTo(x, 960); ctx.stroke(); }
    ctx.lineWidth = 5; for (const y of [975, 1000]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VAL.w, y + 4); ctx.stroke(); }
  }
  scr(ctx);
  paperOverlay(ctx, 0.55);
  if (late) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#b07a58'; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, SPR.glow, W * 0.72, H * 0.22, 700, 0.35); ctx.restore(); }
  // the river blows up: white, then black
  if (inP2(t) && t > E('f12', -0.6) && t < E('f12', 0.2)) fillScreen(ctx, '#fbf6ea', smooth(E('f12', -0.6), E('f12', 0.1), t));
  if (inP2(t) && t >= E('f12', 0.2)) fillScreen(ctx, '#050302', 1);
}

/* ---------- the three doors ---------- */
const DOOR_T = () => [A('f14', 0.2), A('f15', 0.2), A('f16', 0.1)];
const doorOpen = (i, t) => { const T = DOOR_T()[i]; return ease.inOut(smooth(T, T + 1.2, t)); };
function doorsCam(t) {
  return {
    x: kf([[A('g_tear3'), 960], [E('f13', 0.3), 960], [A('f14', 0.2), 560], [E('f14'), 560], [A('f15', 0.2), 960], [E('f15'), 960], [A('f16', 0.1), 1360], [E('f16'), 1360], [A('t35', 0.3), 960]], t),
    y: kf([[A('g_tear3'), 560], [E('f13', 0.3), 560], [A('f14', 0.2), 590], [E('f14'), 590], [A('f15', 0.2), 590], [E('f15'), 590], [A('f16', 0.1), 590], [E('f16'), 590], [A('t35', 0.3), 560]], t),
    z: kf([[A('g_tear3'), 1.0], [E('f13', 0.3), 1.04], [A('f14', 0.2), 2.05], [E('f14'), 2.25], [A('f15', 0.2), 2.05], [E('f15'), 2.25], [A('f16', 0.1), 2.05], [E('f16'), 2.25], [A('t35', 0.3), 1.0], [E('t38'), 1.05]], t),
  };
}
function doorInterior(ctx, i, t) {
  const d = DOORS.list[i], cx = d.cx, top = DOORS.top, base = DOORS.base;
  ctx.save(); ctx.beginPath(); pathPts(ctx, archPts(cx, top, base, DOORS.w)); ctx.clip();
  if (i === 0) {
    const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, '#6e5a44'); g.addColorStop(1, '#8e6a48'); ctx.fillStyle = g; ctx.fillRect(cx - 130, top, 260, base - top);
    paperLive(ctx, [[cx - 130, base - 40], [cx - 40, base - 64], [cx + 60, base - 52], [cx + 130, base - 70], [cx + 130, base], [cx - 130, base]], '#a8612f');
    const u = smooth(A('f14', 2.4), A('f14', 6.8), t), wx = cx - 230 + u * 470;
    for (let k = 0; k < 6; k++) {
      const hx = cx - 95 + k * 38, hy = base - 58 + Math.sin(k) * 6, hit = clamp((wx - hx) / 50);
      ctx.save(); ctx.translate(hx + hit * 60, hy + hit * 20); ctx.rotate(hit * 1.1); ctx.globalAlpha = 1 - hit * 0.8;
      paperLive(ctx, rectPts(-11, -18, 11, 0), '#efe3c8', { sx: 2, sy: 2 }); paperLive(ctx, [[-14, -18], [0, -30], [14, -18]], '#8e3f22', { sx: 2, sy: 2 });
      ctx.restore();
    }
    const wave = catmull([[wx - 300, base], [wx - 220, base - 50], [wx - 130, base - 130], [wx - 50, base - 205], [wx + 20, base - 230], [wx + 70, base - 205], [wx + 78, base - 165], [wx + 50, base - 150], [wx + 30, base - 172], [wx + 8, base - 150], [wx + 22, base - 100], [wx + 48, base - 40], [wx + 60, base]], 4);
    paperLive(ctx, wave, PAPER.river, { sx: 6, sy: 7 });
    ctx.strokeStyle = '#efe0c2'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); pathPts(ctx, wave.slice(8, 30), false); ctx.stroke();
    ctx.fillStyle = '#efe0c2'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(wx + 60 - k * 12, base - 214 + Math.sin(k * 2.1) * 8, 4 + (k % 2) * 2, 0, TAU); ctx.fill(); }
  } else if (i === 1) {
    ctx.fillStyle = '#d6cebd'; ctx.fillRect(cx - 130, top, 260, base - top);
    ctx.fillStyle = '#c4baa6'; ctx.fillRect(cx - 130, base - 70, 260, 70);
    // the clock tower, stopped at three
    paperLive(ctx, rectPts(cx + 38, base - 170, cx + 70, base - 60), '#e8dcc2', { sx: 2, sy: 3 }); paperLive(ctx, [[cx + 32, base - 170], [cx + 54, base - 200], [cx + 76, base - 170]], '#8e3f22', { sx: 2, sy: 3 });
    drawClockFace(ctx, cx + 54, base - 146, 11, { face: '#fbf6ea' });
    for (let k = 0; k < 4; k++) { const hx = cx - 92 + k * 30; paperLive(ctx, rectPts(hx - 11, base - 88, hx + 11, base - 66), '#efe3c8', { sx: 2, sy: 2 }); paperLive(ctx, [[hx - 14, base - 88], [hx, base - 100], [hx + 14, base - 88]], '#8e3f22', { sx: 2, sy: 2 }); }
    for (let k = 0; k < 5; k++) paperPerson(ctx, cx - 84 + k * 26, base - 40, 26, { col: '#4a3a30', face: k % 2 ? 1 : -1, walk: 0.13 });
    // a glass dome over all of it
    ctx.strokeStyle = 'rgba(251,246,234,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, base - 30, 118, 190, 0, Math.PI, TAU); ctx.stroke();
    const gl = frac((t - A('f15')) / 5.5), ga = Math.PI + 0.3 + gl * 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, base - 30, 112, 184, 0, ga, ga + 0.25); ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, '#f6c77a'); g.addColorStop(0.55, '#f9e3b6'); g.addColorStop(1, '#e9b56e'); ctx.fillStyle = g; ctx.fillRect(cx - 130, top, 260, base - top);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, SPR.white, cx, top + 150, 120, 0.9); ctx.restore();
    paperLive(ctx, ellipsePts(cx, top + 150, 44, 44, 24), '#fff3d8', { shadow: false });
    for (let k = 0; k < 3; k++) paperLive(ctx, [[cx - 130, base - 60 + k * 22], [cx + 130, base - 80 + k * 22], [cx + 130, base], [cx - 130, base]], ['#d99a4e', '#c98a4b', '#b8743e'][k], { sx: 2, sy: 3 });
    const river = [[cx - 30, base], [cx - 6, top + 190], [cx + 6, top + 190], [cx + 30, base]];
    paperLive(ctx, river, '#fff6e2', { shadow: false });
    for (let k = 0; k < 5; k++) { const u = frac(q12(t) * 0.07 + k / 5), s = lerp(0.42, 0.08, u); drawPaperBoat(ctx, cx + Math.sin(u * 5 + k) * 6 * (1 - u), lerp(base - 8, top + 196, u), s); }
    ctx.strokeStyle = PAPER.soot; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const bx = cx - 90 + frac(q12(t) * 0.05 + k * 0.27) * 180, by = top + 70 + k * 18; ctx.beginPath(); ctx.moveTo(bx - 7, by - 3); ctx.lineTo(bx, by); ctx.lineTo(bx + 7, by - 3); ctx.stroke(); }
  }
  ctx.restore();
}
function doorPanel(ctx, i, t) {
  const d = DOORS.list[i], p = doorOpen(i, t), hinge = d.cx - DOORS.w / 2;
  const P = archPts(d.cx, DOORS.top, DOORS.base, DOORS.w).map(([x, y]) => [hinge + (x - hinge) * (1 - p * 0.9), y + (x - hinge) * p * 0.06]);
  ctx.save();
  paperLive(ctx, P, d.col, { sx: 5, sy: 7 });
  ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * p) + ')'; fillPts(ctx, P);
  const hx = hinge + (DOORS.w - 34) * (1 - p * 0.9), hy = DOORS.base - 190;
  ctx.strokeStyle = PAPER.soot; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, 10, 0, TAU); ctx.stroke();
  ctx.restore();
}
function drawDoors(ctx, t) {
  const cam = doorsCam(t);
  fillScreen(ctx, '#c9a676'); camSet(ctx, cam.x, cam.y, cam.z);
  ctx.drawImage(AS.doors, 0, 0);
  for (let i = 0; i < 3; i++) { if (doorOpen(i, t) > 0) doorInterior(ctx, i, t); doorPanel(ctx, i, t); }
  // warm light from the third door
  const w3 = doorOpen(2, t);
  if (w3 > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, SPR.glow, 1360, 620, 420, 0.35 * w3); ctx.restore(); }
  scr(ctx); paperOverlay(ctx, 0.55);
}
