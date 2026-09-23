/* Finite Time: the family. Warm ink and watercolor at night. */
'use strict';

/* ---------- small helpers ---------- */
function nose(ctx, head, r, ang, col = PAL.ink) {
  const a = ang, bx = head[0] + Math.cos(a) * r * 0.82, by = head[1] + Math.sin(a) * r * 0.82;
  ctx.save(); ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(bx + Math.cos(a - 1.2) * r * 0.32, by + Math.sin(a - 1.2) * r * 0.32);
  ctx.lineTo(head[0] + Math.cos(a) * r * 1.28, head[1] + Math.sin(a) * r * 1.28);
  ctx.lineTo(bx + Math.cos(a + 1.2) * r * 0.32, by + Math.sin(a + 1.2) * r * 0.32);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
const angTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
function lerpAng(a, b, t) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * t; }
function frostLED(ctx, x, y, t, s = 1) {
  const on = 0.75 + 0.25 * Math.sin(t * 2.1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 30 * s); g.addColorStop(0, `rgba(${RGB.frost},${0.8 * on})`); g.addColorStop(0.3, `rgba(${RGB.frost},${0.25 * on})`); g.addColorStop(1, `rgba(${RGB.frost},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 30 * s, y - 30 * s, 60 * s, 60 * s);
  ctx.fillStyle = `rgba(230,250,246,${0.95 * on})`; ctx.beginPath(); ctx.arc(x, y, 4 * s, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ============================================================
   BEDROOM
   ============================================================ */
const BOOK_POSE = { lsh: 0.55, lel: 1.35, rsh: 0.65, rel: 1.25, lean: 0.14, head: 0.28 };
function drawBedroomScene(ctx, t, o = {}) {
  const cam = o.cam;
  setCam(ctx, AS.bedroom, cam);
  const lamp = o.lamp ?? 1;
  // Wren, in bed
  const head = BR.head, breathe = Math.sin(t * 1.5) * 1.5;
  ctx.fillStyle = PAL.ink;
  ctx.beginPath(); ctx.ellipse(head[0] - 30, head[1] + 4, 34, 22, -0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(head[0], head[1] + breathe * 0.3, 30, 0, TAU); ctx.fill();
  const wAng = lerpAng(-0.55, angTo(head, BR.cam) , o.wave ?? 0);
  nose(ctx, [head[0], head[1] + breathe * 0.3], 30, wAng);
  if (o.wave > 0) {
    const w = o.wave, sh = [470, 706], up = [lerp(500, 452, w), lerp(700, 612, w)], hand = [lerp(520, 424, w), lerp(690, 548, w)];
    ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.quadraticCurveTo(up[0] + 30, up[1] + 30, hand[0], hand[1] + 26); ctx.stroke();
    drawInkHand(ctx, hand[0], hand[1], 58, -0.35 + Math.sin(t * 6.5) * 0.28 * w, { seed: 12, wrist: 0.9, lines: false, spread: 1.1 });
  }
  // Dad on the edge of the bed
  const pz = Object.assign({}, SIT, o.pose || BOOK_POSE);
  const J = drawPerson(ctx, personFig(o.dadX ?? BR.dadX, BR.floor, 470, -1), pose(pz), { style: 'parent', tick: tk(t), rim: 0.8 * lamp, rimX: BR.lamp[0] });
  const lookA = lerpAng(angTo(J.head, head), angTo(J.head, BR.cam), o.look ?? 0);
  nose(ctx, J.head, J.headR, lookA);
  if (o.book !== false && !o.pose) {
    const [bx, by] = J.hands;
    ctx.save(); ctx.translate(bx - 8, by - 10); ctx.rotate(0.12);
    paperLive(ctx, [[-44, -30], [0, -24], [0, 26], [-44, 20]], '#e8dcc2', { sx: 3, sy: 4, shColor: 'rgba(0,0,0,0.35)' });
    paperLive(ctx, [[0, -24], [44, -30], [44, 20], [0, 26]], '#efe3c8', { shadow: false });
    ctx.restore();
  }
  // light
  const L = w2s(cam, BR.lamp[0], BR.lamp[1] + 20);
  const lights = [];
  if (lamp > 0) lights.push({ x: L[0], y: L[1] + 60 * cam.z, r: 1500 * cam.z * (0.97 + 0.03 * noise1(t * 7)), a: lamp, warm: 0.85 * lamp });
  const Wn = w2s(cam, 1615, 380); lights.push({ x: Wn[0], y: Wn[1], r: 520 * cam.z, a: 0.25 });
  lightPass(ctx, lights, lerp(0.975, 0.86, lamp));
  // the camera's cold light, the one cold thing in the house
  const Ld = w2s(cam, BR.led[0], BR.led[1]); scr(ctx); frostLED(ctx, Ld[0], Ld[1], t, cam.z);
  // when he looks up at it, its cold light touches his face
  if ((o.look ?? 0) > 0.05) {
    const Hs = w2s(cam, J.head[0], J.head[1]), a = angTo(J.head, BR.cam);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${RGB.frost},${0.55 * o.look})`; ctx.lineWidth = 3 * cam.z;
    ctx.beginPath(); ctx.arc(Hs[0], Hs[1], J.headR * cam.z * 1.03, a - 0.8, a + 0.8); ctx.stroke(); ctx.restore();
  }
}
function bedCam(t) {
  if (t < A('g_tear1')) return cam3(t, [[A('g_bed1'), 780], [E('t07'), 700]], [[A('g_bed1'), 590], [E('t07'), 630]], [[A('g_bed1'), 1.1], [E('t07'), 1.28]]);
  if (t < A('n_cam')) return cam3(t, [[A('g_back1'), 650], [A('n_cam'), 630]], [[A('g_back1'), 650]], [[A('g_back1'), 1.42], [A('n_cam'), 1.48]]);
  if (t < A('t12')) return cam3(t, [[A('n_cam'), 560], [A('t12'), 470]], [[A('n_cam'), 560], [A('t12'), 500]], [[A('n_cam'), 1.28], [A('t12'), 1.5]]);
  if (t < A('g_s3')) return cam3(t, [[A('t13'), 640], [E('g_lampoff'), 620]], [[A('t13'), 650], [E('g_lampoff'), 640]], [[A('t13'), 1.42], [E('g_lampoff'), 1.5]]);
  if (t < A('g_s5')) return cam3(t, [[A('g_bed2'), 660], [A('g_tear2'), 640]], [[A('g_bed2'), 650], [A('g_tear2'), 640]], [[A('g_bed2'), 1.35], [A('g_tear2'), 1.45]]);
  if (t < A('g_tear3')) return cam3(t, [[A('g_bed3'), 700], [A('g_tear3'), 660]], [[A('g_bed3'), 640]], [[A('g_bed3'), 1.3], [A('g_tear3'), 1.42]]);
  if (t < A('g_seam', 1)) return cam3(t, [[A('g_back3'), 660], [A('t43'), 610], [E('g_silence'), 600]], [[A('g_back3'), 650], [A('t43'), 640]], [[A('g_back3'), 1.4], [A('t43'), 1.58], [E('g_silence'), 1.62]]);
  return cam3(t, [[A('g_ansbed'), 560], [E('g_ansbed'), 540]], [[A('g_ansbed'), 650]], [[A('g_ansbed'), 1.75], [E('g_ansbed'), 1.85]]);
}
function shBed(ctx, t) {
  const lamp = t > A('g_lampoff', 0.05) && t < A('g_s3') ? 0 : 1;
  drawBedroomScene(ctx, t, { cam: bedCam(t), lamp });
}
// "Night, Mom": close on the camera and her waving hand, then on him looking up at it a beat too long
const NIGHT_MOM_LOOK = () => A('t12', 1.8);
function shCamClose(ctx, t) {
  const cam = cam3(t, [[A('t12'), 360], [NIGHT_MOM_LOOK(), 352]], [[A('t12'), 405], [NIGHT_MOM_LOOK(), 398]], [[A('t12'), 2.9], [NIGHT_MOM_LOOK(), 3.1]]);
  drawBedroomScene(ctx, t, { cam, lamp: 1 });
  scr(ctx);
  const w = win(t, A('t12', -0.05), A('t12', 1.75), 0.3, 0.3);
  drawInkHand(ctx, 470, 1130 - w * 170, 360, -0.3 + Math.sin(t * 6.5) * 0.3 * w, { seed: 12, wrist: 1.6, lines: false, spread: 1.1, color: '#0c0907' });
}
function shDadLook(ctx, t) {
  const cam = cam3(t, [[NIGHT_MOM_LOOK(), 740], [A('t13'), 734]], [[NIGHT_MOM_LOOK(), 600], [A('t13'), 596]], [[NIGHT_MOM_LOOK(), 1.9], [A('t13'), 1.98]]);
  drawBedroomScene(ctx, t, { cam, lamp: 1, look: 1 });
}
function shBedLast(ctx, t) {
  // night three: the question and the silence. the corners start to lift at the very end
  drawBedroomScene(ctx, t, { cam: bedCam(t), lamp: 1 });
  const k = smooth(E('g_silence', -1.9), E('g_silence'), t);
  if (k > 0) curlCorners(ctx, k);
}
function shBedAnswer(ctx, t) {
  drawBedroomScene(ctx, t, { cam: bedCam(t), lamp: 1, dadX: 640, pose: { lean: 0.42, head: 0.3, lsh: 0.75, lel: 0.85, rsh: 1.05, rel: 0.45 } });
}
function curlCorners(ctx, k) {
  scr(ctx); ctx.save();
  for (const [cx, cy, sx, sy] of [[W, 0, -1, 1], [0, H, 1, -1]]) {
    const s = 150 * k;
    ctx.fillStyle = '#0a0d0e'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * s, cy); ctx.lineTo(cx, cy + sy * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9cbb0'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(cx + sx * s, cy); ctx.lineTo(cx, cy + sy * s); ctx.lineTo(cx + sx * s * 0.78, cy + sy * s * 0.78); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.restore();
}

/* ---------- the book, close: the pages are blank ---------- */
function shBook(ctx, t) {
  fillScreen(ctx, '#140e0a'); scr(ctx);
  const b = Math.sin(t * 1.3) * 3, z = lerp(1.0, 1.05, smooth(A('t11'), A('n_cam'), t));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2 + b);
  const L = [[520, 300], [720, 318], [948, 352], [948, 812], [720, 790], [520, 778]], R = [[972, 352], [1200, 318], [1400, 300], [1400, 778], [1200, 790], [972, 812]];
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.save(); ctx.translate(14, 22); fillPts(ctx, L); fillPts(ctx, R); ctx.restore();
  wash(ctx, L, '#efe3c8', { layers: 12, alpha: 0.2, v: 0.08, seed: 3 }); ctx.fillStyle = 'rgba(239,227,200,0.85)'; fillPts(ctx, L);
  wash(ctx, R, '#efe3c8', { layers: 12, alpha: 0.2, v: 0.08, seed: 4 }); ctx.fillStyle = 'rgba(239,227,200,0.85)'; fillPts(ctx, R);
  const g = ctx.createLinearGradient(900, 0, 1020, 0); g.addColorStop(0, 'rgba(60,40,25,0)'); g.addColorStop(0.5, 'rgba(60,40,25,0.45)'); g.addColorStop(1, 'rgba(60,40,25,0)'); ctx.fillStyle = g; ctx.fillRect(890, 330, 140, 480);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); pathPts(ctx, L); ctx.stroke(); ctx.beginPath(); pathPts(ctx, R); ctx.stroke();
  drawInkHand(ctx, 575, 800, 280, 0.42, { seed: 5, fold: 0.55, wrist: 1.4, t, tremble: 0.15 });
  drawInkHand(ctx, 1345, 800, 280, -0.42, { seed: 6, fold: 0.55, wrist: 1.4, mirror: true, t, tremble: 0.15 });
  ctx.restore();
  lightPass(ctx, [{ x: 420, y: 160, r: 1700, a: 0.95, warm: 0.6 }], 0.8);
}

/* ============================================================
   KITCHEN
   ============================================================ */
const WIN_IN = [262, 262, 638, 638];
function aldana(ctx, u, day) {
  // Mr. Aldana and Biscuit cross the window. u = seconds since the pass began (0..7). identical every time.
  if (u < 0 || u > 7.2) return;
  const x = lerp(170, 740, u / 7), h = 150, gy = 614;
  const col = day ? '#3a2a20' : '#060403';
  const fig = personFig(x, gy, h, 1), ph = x / (STRIDE * h);
  const J = drawPerson(ctx, fig, walkPose(ph, 1, { lsh: 0.5, lel: 0.3 }), { color: col, style: 'parent', tick: 0 });
  const dx = x + 70, dy = gy, bob = Math.abs(Math.sin(ph * TAU * 2)) * 3;
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(dx, dy - 24 - bob, 24, 11, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(dx + 24, dy - 34 - bob, 9, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(dx + 28, dy - 40 - bob); ctx.lineTo(dx + 33, dy - 48 - bob); ctx.lineWidth = 5; ctx.stroke();
  ctx.lineWidth = 4; const s = Math.sin(ph * TAU * 2) * 0.5;
  for (const [lx, sg] of [[dx - 16, 1], [dx - 10, -1], [dx + 12, 1], [dx + 18, -1]]) { ctx.beginPath(); ctx.moveTo(lx, dy - 20 - bob); ctx.lineTo(lx + Math.sin(s * sg) * 10, dy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(dx - 24, dy - 28 - bob); ctx.lineTo(dx - 36, dy - 40 - bob); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(J.rw[0], J.rw[1]); ctx.quadraticCurveTo((J.rw[0] + dx + 24) / 2, dy - 40, dx + 20, dy - 32 - bob); ctx.stroke();
}
function drawWindowView(ctx, t, day, passT0) {
  const [x0, y0, x1, y1] = WIN_IN;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  if (day) {
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f1e3c4'); g.addColorStop(1, '#e2cc9e'); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#b89a74'; fillPts(ctx, [[x0, 560], [x0, 470], [330, 420], [400, 470], [400, 560]]); fillPts(ctx, [[430, 560], [430, 450], [520, 400], [610, 450], [610, 560]]);
    ctx.fillStyle = '#8e6a48'; ctx.fillRect(470, 480, 30, 34); ctx.fillRect(330, 490, 26, 30);
    ctx.fillStyle = '#7d8a5a'; ctx.beginPath(); ctx.arc(620, 440, 60, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a4030'; ctx.fillRect(612, 470, 14, 100);
    ctx.fillStyle = '#cdb893'; ctx.fillRect(x0, 560, x1 - x0, y1 - 560);
  } else {
    ctx.fillStyle = '#140f0c'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, SPR.glow, 470, 470, 260, 0.55); ctx.restore();
    ctx.fillStyle = '#0a0706'; fillPts(ctx, [[x0, 560], [x0, 470], [330, 420], [400, 470], [400, 560]]); fillPts(ctx, [[520, 560], [520, 450], [600, 410], [680, 450], [680, 560]]);
    ctx.fillStyle = '#e8b06a'; ctx.globalAlpha = 0.8; ctx.fillRect(560, 480, 16, 14); ctx.globalAlpha = 1;
    ctx.fillStyle = '#231a14'; ctx.fillRect(x0, 560, x1 - x0, y1 - 560);
    ctx.fillStyle = '#0a0706'; ctx.fillRect(466, 400, 8, 170); ctx.fillRect(452, 396, 36, 10);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprite(ctx, SPR.spark, 470, 410, 22, 0.9); ctx.restore();
  }
  if (passT0 != null) aldana(ctx, t - passT0, day);
  ctx.restore();
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round';
  ctx.lineWidth = 14; ctx.strokeRect(250, 250, 400, 400);
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(450, 250); ctx.lineTo(450, 650); ctx.moveTo(250, 450); ctx.lineTo(650, 450); ctx.stroke();
  ctx.restore();
}
// Mr. Aldana passes twice, frame for frame the same
const PASS_NIGHT = () => A('g_wren3', 0.2), PASS_DAY = () => A('g_pass2', 0.1);
function passFor(t) {
  if (t > A('g_s3') && t < A('g_bed2')) return PASS_NIGHT();
  if (t > A('g_s5') && t < A('g_bed3')) return PASS_DAY();
  return null;
}

const WRITE_POSE = { lean: 0.38, head: 0.35, rsh: 1.05, rel: 0.75, lsh: 0.95, lel: 0.95 };
const TABLE_POSE = { lean: 0.22, head: 0.05, rsh: 0.9, rel: 0.9, lsh: 0.8, lel: 1.0 };
function drawPapers(ctx) {
  const ty = KIT.table[2];
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(1060 + i * 16, ty - 4 - i * 2); ctx.rotate(-0.04 + i * 0.03); ctx.fillStyle = i === 3 ? '#efe3c8' : '#d9ccb2'; ctx.fillRect(-80, -5, 160, 5); ctx.restore(); }
  ctx.strokeStyle = '#b8452c'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(1040 + i * 30, ty - 13); ctx.lineTo(1060 + i * 30, ty - 13); ctx.stroke(); }
}
function drawDadAtTable(ctx, t, o) {
  const pz = o.dadPose || WRITE_POSE;
  const J = drawPerson(ctx, personFig(PARENT_SIT_X, 1000, 430, 1), pose(Object.assign({}, SIT, pz)), { style: 'parent', tick: tk(t), rim: 0.7, rimX: o.rimX ?? KIT.lamp[0], rimRGB: o.rimRGB });
  if (pz === WRITE_POSE) { ctx.strokeStyle = '#b8452c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(J.rw[0], J.rw[1]); ctx.lineTo(J.rw[0] + 22, J.rw[1] + 14); ctx.stroke(); }
  if (pz !== HEAD_IN_HANDS) nose(ctx, J.head, J.headR, o.dadLook ?? 0.9);
}
function drawWrenStanding(ctx, t, keys, o = {}) {
  const x = kf(keys, t), wk = walker(keys, t, 300);
  const J2 = drawPerson(ctx, personFig(x, 1000, 300, -1, true), walkPose(wk.ph, wk.amt, { lsh: 0.1, rsh: 0.05 }), { style: 'kid', tick: tk(t), rim: 1, rimX: o.rimX ?? KIT.lamp[0], rimRGB: o.rimRGB });
  nose(ctx, J2.head, J2.headR, Math.PI + 0.15);
  return J2;
}
function kitchenNight(ctx, t, o = {}) {
  const cam = o.cam;
  setCam(ctx, AS.kitchen, cam);
  drawWindowView(ctx, t, false, passFor(t));
  drawFridgeArt(ctx);
  drawPapers(ctx);
  drawDadAtTable(ctx, t, o);
  if (o.wrenKeys) drawWrenStanding(ctx, t, o.wrenKeys);
  const lights = [lampLight(cam, 1, t)];
  const Wn = w2s(cam, 470, 470); lights.push({ x: Wn[0], y: Wn[1], r: 320 * cam.z, a: 0.35 });
  lightPass(ctx, lights, 0.9);
}

/* ---------- day one, afternoon: Priya's mom ---------- */
function dayWash(ctx, cam) {
  camSet(ctx, cam.x, cam.y, cam.z); ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(250,222,170,0.85)'; ctx.fillRect(0, 0, 2400, 1350);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,214,150,0.07)'; fillPts(ctx, [[262, 262], [638, 262], [1500, 1000], [700, 1000]]); ctx.restore();
}
function dayLight(ctx, cam) {
  const Wn = w2s(cam, 450, 450);
  lightPass(ctx, [{ x: Wn[0], y: Wn[1] + 80 * cam.z, r: 2600 * cam.z, a: 0.95, warm: 0.4 }], 0.4, { dark: '30,20,12' });
}
const WREN_IN = () => [[A('g_enter'), 2250], [A('g_enter', 1.0), 1560]];
function shDayOne(ctx, t) {
  let cam;
  if (t < A('g_enter')) cam = cam3(t, [[0, 1150], [E('i2'), 1060]], [[0, 700]], [[0, 0.95], [E('i2'), 1.12]]);
  else if (t < A('t04')) cam = cam3(t, [[A('g_enter'), 1350], [A('t04'), 1330]], [[A('g_enter'), 700]], [[A('g_enter'), 0.95], [A('t04'), 0.99]]);
  else cam = cam3(t, [[A('t04'), 1180], [A('g_bed1'), 1150]], [[A('t04'), 720]], [[A('t04'), 1.2], [A('g_bed1'), 1.3]]);
  setCam(ctx, AS.kitchen, cam);
  dayWash(ctx, cam);
  drawWindowView(ctx, t, true, null);
  drawFridgeArt(ctx);
  drawPapers(ctx);
  const looking = t > A('t02');
  drawDadAtTable(ctx, t, { dadPose: looking ? TABLE_POSE : WRITE_POSE, dadLook: looking ? -0.12 : 0.9, rimX: 450, rimRGB: '255,236,200' });
  if (t > A('g_enter')) {
    const J2 = drawWrenStanding(ctx, t, WREN_IN(), { rimX: 450, rimRGB: '255,236,200' });
    // her backpack: on her back, then dropped by her feet
    const drop = smooth(A('g_enter', 0.8), A('g_enter', 1.0), t);
    ctx.fillStyle = '#7a3b24';
    if (drop < 1) { ctx.save(); ctx.translate(J2.sh[0] + 22, J2.sh[1] + 40 + drop * 100); ctx.rotate(drop * 0.6); ctx.fillRect(-20, -26, 40, 52); ctx.restore(); }
    else { ctx.save(); ctx.translate(kf(WREN_IN(), t) + 70, 972); ctx.rotate(0.12); ctx.fillRect(-24, -28, 48, 56); ctx.restore(); }
  }
  dayLight(ctx, cam);
  if (t < 1.6) fillScreen(ctx, '#050302', 1 - smooth(0.2, 1.6, t));
}
function shFridgeDay(ctx, t) {
  const k = ease.inOut(smooth(A('i3'), A('g_enter'), t));
  const a = artPt(200, 170), cam = { x: a[0], y: a[1], z: lerp(3.3, 4.1, k) };
  setCam(ctx, AS.kitchen, cam);
  dayWash(ctx, cam);
  drawFridgeArt(ctx);
  lightPass(ctx, [{ x: W * 0.25, y: H * 0.25, r: 1900, a: 0.9, warm: 0.4 }], 0.5, { dark: '30,20,12' });
}

/* ---------- 3 a.m. ---------- */
const WREN_DOOR = () => [[A('g_wren3'), 2200], [A('g_wren3', 1.2), 1740]];
function shKitNight(ctx, t) {
  let cam, o = {};
  if (t < A('r01')) { cam = cam3(t, [[A('g_s3'), 1120], [A('r01'), 1080]], [[A('g_s3'), 700], [A('r01'), 690]], [[A('g_s3'), 1.02], [A('r01'), 1.12]]); o.dadPose = HEAD_IN_HANDS; }
  else if (t < A('t17')) { cam = cam3(t, [[E('g_radiooff'), 1250], [A('t17'), 1150]], [[E('g_radiooff'), 700], [A('t17'), 660]], [[E('g_radiooff'), 0.95], [A('t17'), 1.0]]); o.dadPose = TABLE_POSE; o.dadLook = -0.12; o.wrenKeys = WREN_DOOR(); }
  else { cam = cam3(t, [[A('t17'), 1320], [A('g_bed2'), 1300]], [[A('t17'), 720]], [[A('t17'), 1.08], [A('g_bed2'), 1.14]]); o.dadPose = TABLE_POSE; o.dadLook = -0.12; o.wrenKeys = WREN_DOOR(); }
  kitchenNight(ctx, t, Object.assign({ cam }, o));
}

/* ---------- the radio ---------- */
const NS_GLYPHS = ['∂u/∂t', '(u·∇)u', '−∇p', 'ν∆u', '∇·u = 0', '+ f', 'u(x, t)', '∞', 't → T'];
function glyphPhase(t) {
  // integrate a speed that climbs toward the end of the report, so scrubbing stays consistent
  let p = 0; const a = A('r01'), n = 80, dt = Math.max(0, t - a) / n, b0 = E('r01', -4.4), b1 = E('r01', -1.0);
  for (let i = 0; i < n; i++) { const s = a + (i + 0.5) * dt; p += (0.1 + 0.5 * Math.pow(smooth(b0, b1, s), 2)) * dt; }
  return p;
}
function shRadio(ctx, t) {
  const off = A('g_radiooff');
  const cam = cam3(t, [[A('r01'), KIT.radio[0] - 20], [E('g_radiooff'), KIT.radio[0] - 10]], [[A('r01'), 600], [E('g_radiooff'), 540]], [[A('r01'), 2.6], [E('g_radiooff'), 2.35]]);
  setCam(ctx, AS.kitchen, cam);
  const on = 1 - smooth(off + 0.25, off + 0.42, t);
  drawRadioLive(ctx, t, on);
  const [rx, ry] = KIT.radio;
  const come = kf([[off - 0.25, 0], [off + 0.2, 1, ease.out], [off + 0.6, 1], [off + 1.05, 0, ease.in]], t);
  if (come > 0) drawInkHand(ctx, rx + 40 + (1 - come) * 220, ry + 34 + (1 - come) * 90, 150, -2.2 + smooth(off + 0.1, off + 0.35, t) * 0.5, { seed: 4, t, tremble: 0.2, fold: 0.55, wrist: 1.6, color: '#1b1511' });
  const R = w2s(cam, rx + 40, ry);
  lightPass(ctx, [{ x: R[0], y: R[1], r: 620 * on + 40, a: 0.35 + 0.65 * on, warm: 0.8 * on }, lampLight(cam, 0.55, t)], 0.93);
  camSet(ctx, cam.x, cam.y, cam.z);
  const P = glyphPhase(t), blow = smooth(E('r01', -4.0), E('r01', -1.0), t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.textAlign = 'center';
  for (let i = 0; i < 30; i++) {
    const life = frac(P * (0.6 + hash(i) * 0.8) + hash(i * 3.3));
    const x = rx - 330 + hash(i * 7.7) * 660 + noise1(t * 0.4 + i) * 30, y = ry - 60 - life * 560;
    const g = NS_GLYPHS[i % NS_GLYPHS.length], big = g === '∞' ? 1 + blow * 2.2 : 1 + blow * 0.5;
    ctx.globalAlpha = Math.sin(life * Math.PI) * 0.9 * on * smooth(A('r01', 0.4), A('r01', 1.8), t);
    ctx.fillStyle = 'rgb(255,214,150)';
    ctx.font = `italic ${Math.round(24 * (0.7 + hash(i * 2.2) * 0.6) * big)}px ${SERIF}`;
    ctx.fillText(g, x, y);
  }
  ctx.restore();
}

/* ---------- day three, afternoon: what should I be ---------- */
function kitchenDay(ctx, t, cam) {
  setCam(ctx, AS.kitchen, cam);
  dayWash(ctx, cam);
  drawWindowView(ctx, t, true, passFor(t));
  drawFridgeArt(ctx);
  // Wren at the table with homework, on a chair
  ctx.fillStyle = PAL.ink; ctx.fillRect(1300, 852, 110, 12); ctx.fillRect(1395, 860, 10, 140); ctx.fillRect(1305, 860, 10, 140); ctx.fillRect(1398, 700, 10, 160);
  ctx.save(); ctx.translate(1215, KIT.table[2] - 4); ctx.rotate(0.05); ctx.fillStyle = '#efe3c8'; ctx.fillRect(-60, -5, 120, 5); ctx.restore();
  const J2 = drawPerson(ctx, personFig(1345, 905, 300, -1, true), pose(Object.assign({}, SIT, { lsh: 1.25, lel: 0.55, rsh: 1.35, rel: 0.45, lean: 0.18, head: 0.15 })), { style: 'kid', tick: tk(t), rim: 0.5, rimX: 450, rimRGB: '255,236,200' });
  nose(ctx, J2.head, J2.headR, Math.PI + 0.35);
  // Dad at the counter
  const J = drawPerson(ctx, personFig(1765, 1000, 440, -1), pose({ lean: 0.18, lsh: 0.75, lel: 0.35, rsh: 0.85, rel: 0.3, head: 0.1 }), { style: 'parent', tick: tk(t), rim: 0.5, rimX: 450, rimRGB: '255,236,200' });
  nose(ctx, J.head, J.headR, Math.PI + 0.1);
  dayLight(ctx, cam);
}
function shKitDay(ctx, t) {
  let cam;
  if (t < A('g_pass2')) cam = cam3(t, [[A('g_s5'), 1250], [A('g_pass2'), 1220]], [[A('g_s5'), 690]], [[A('g_s5'), 0.98], [A('g_pass2'), 1.03]]);
  else if (t < A('t30')) cam = cam3(t, [[A('g_pass2'), 840], [A('t30'), 860]], [[A('g_pass2'), 640], [A('t30'), 650]], [[A('g_pass2'), 1.04], [A('t30'), 1.08]]);
  else cam = cam3(t, [[A('n_break', -0.3), 1620], [A('g_bed3'), 1640]], [[A('n_break', -0.3), 690], [A('g_bed3'), 680]], [[A('n_break', -0.3), 1.25], [A('g_bed3'), 1.36]]);
  kitchenDay(ctx, t, cam);
}
/* ---------- his hands flat on the counter, seen from above ---------- */
function shHands(ctx, t) {
  fillScreen(ctx, '#5a4432'); scr(ctx);
  const z = lerp(1.0, 1.06, smooth(A('t30'), E('t31'), t));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  wash(ctx, rectPts(-60, -60, W + 60, H + 60), '#6b523d', { layers: 12, alpha: 0.14, v: 0.25, seed: 22 });
  for (let i = 0; i < 9; i++) { const x = 60 + i * 240 + (i % 2) * 20; inkLine(ctx, [[x, -40], [x + 30, H + 40]], 3, { alpha: 0.35, k: 2, seed: i }); }
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * W, y = hash(i * 5.1) * H; inkLine(ctx, [[x, y], [x + 8, y + 90 + hash(i) * 120]], 1.5, { alpha: 0.18, k: 1, seed: 40 + i }); }
  ctx.fillStyle = '#231a14'; ctx.fillRect(-60, 1030, W + 120, 120); inkLine(ctx, [[-60, 1030], [W + 60, 1026]], 10);
  // her homework, turned toward him: long division, crossed out
  ctx.save(); ctx.translate(980, 250); ctx.rotate(0.06);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-170, -120, 350, 250); ctx.fillStyle = '#efe7d6'; ctx.fillRect(-176, -128, 350, 250);
  ctx.strokeStyle = '#6b6b6b';
  for (let r = 0; r < 4; r++) brushDry(ctx, [[-140, -90 + r * 52], [-40 + (r % 2) * 30, -86 + r * 52], [60, -92 + r * 52]], { w: 3, k: 2, dry: 0.4, seed: 60 + r });
  ctx.strokeStyle = '#b8452c'; brushDry(ctx, [[-150, 60], [120, -40]], { w: 5, k: 3, dry: 0.3, seed: 70 });
  ctx.restore();
  ctx.fillStyle = '#e0a23a'; ctx.save(); ctx.translate(1300, 330); ctx.rotate(0.9); ctx.fillRect(-90, -7, 180, 14); ctx.fillStyle = '#2a211a'; ctx.fillRect(90, -7, 22, 14); ctx.restore();
  const tr = 0.25 + 0.5 * win(t, A('t30', 1.5), E('t31'), 1, 1), press = smooth(A('t31'), E('t31'), t) * 0.14;
  drawInkHand(ctx, 690, 770, 380, 0.14, { seed: 7, t, tremble: tr, wrist: 2.0, fold: press, color: '#1b1511', lines: 0.8 });
  drawInkHand(ctx, 1230, 770, 380, -0.14, { seed: 8, t: t + 3, tremble: tr, wrist: 2.0, fold: press, mirror: true, color: '#1b1511', lines: 0.8 });
  ctx.restore();
  lightPass(ctx, [{ x: 120, y: 60, r: 2300, a: 0.95, warm: 0.35 }], 0.62, { dark: '30,20,12' });
}
