/* The cast: Mara, Wren, Theo, Mr. Aldana and Biscuit, crowds, Hearth, owls,
   and the handful of props that travel between sets.
   person() draws one picture-book figure and returns its key points so a
   scene can hang props on the hands. */
'use strict';

const STYLE = {
  mara: { skin: '#e8b99a', hair: 'bob', hairC: '#2e211d', top: '#b5552f', topIn: '#f1e4c8', pants: '#4b5a5e', shoes: '#3a2a22' },
  wren: { skin: '#f0c3a2', hair: 'bunches', hairC: '#8a4a2a', band: '#c0452f', top: '#e3b23c', pants: '#4f7a6a', shoes: '#c0452f', kid: true },
  theo: { skin: '#a8704f', hair: 'curly', hairC: '#1e1614', top: '#6f8a5b', topIn: '#e9dfc9', pants: '#3c3a36', shoes: '#2b2420', glasses: true, tall: 1.07, thin: 0.9 },
  aldana: { skin: '#b98160', hair: 'cap', hairC: '#9a958c', capC: '#a8432d', top: '#7a5236', pants: '#5a6b78', shoes: '#3a2a22', mustache: true, wide: 1.2, tall: 0.97 },
  father: { skin: '#e0b391', hair: 'short', hairC: '#4a3326', top: '#5d7a7a', pants: '#3a3a3a', shoes: '#2b2420' },
  senator: { skin: '#e0b391', hair: 'side', hairC: '#c9c1b3', top: '#343a3d', topIn: '#e8e2d4', pants: '#2c3134', shoes: '#1e1b19', tie: '#8a2f2a' },
};
const SKINS = ['#f0c9a8', '#e8b99a', '#d9a27e', '#c68a62', '#a8704f', '#8a5a3e', '#6e4632'];
const HAIRS = ['#2e211d', '#1e1614', '#5a3a26', '#8a4a2a', '#c9a45c', '#9a958c', '#d9d2c4'];
const TOPS = ['#b5552f', '#6f8a5b', '#4f7a8a', '#e3b23c', '#8a5a7a', '#a0523c', '#5d7a52', '#c98a4a', '#7a8a9a', '#d98a7a'];
const PANTS = ['#4b5a5e', '#3c3a36', '#5a6b78', '#6e5a48', '#2f3438', '#57604a'];
function crowdStyle(seed) {
  const r = rng(seed * 31 + 7), pick = (a) => a[Math.floor(r() * a.length)];
  const hair = pick(['short', 'bob', 'bun', 'curly', 'bald', 'long', 'side', 'cap']);
  return { skin: pick(SKINS), hair, hairC: pick(HAIRS), capC: pick(TOPS), top: pick(TOPS), pants: pick(PANTS), shoes: '#2e2520', glasses: r() < 0.22, mustache: r() < 0.12, wide: 0.9 + r() * 0.3, tall: 0.92 + r() * 0.14 };
}

const ARMS = {
  down: [[0.06, 0.1], [0.04, 0.08]],
  desk: [[0.95, 0.75], [0.85, 0.8]],
  hold: [[0.45, 1.55], [0.4, 1.5]],
  mug: [[0.35, 2.1], [0.05, 0.1]],
  chin: [[0.25, 2.45], [0.5, 1.3]],
  point: [[1.45, 0.05], [0.05, 0.1]],
  wave: [[2.6, 0.5], [0.05, 0.1]],
  up: [[2.9, 0.15], [0.05, 0.1]],
  reach: [[1.15, 0.25], [0.05, 0.1]],
  write: [[0.75, 1.15], [0.6, 1.2]],
  hug: [[1.1, 1.35], [1.0, 1.4]],
  lap: [[0.45, 0.95], [0.4, 0.95]],
  shrug: [[0.5, 1.8], [0.5, 1.8]],
  plant: [[0.95, 0.35], [0.85, 0.4]],
  glass: [[1.2, 0.35], [0.05, 0.1]],
};

// blend two arm poses so a hand can travel. a and b are preset names or pose arrays.
function blendArms(a, b, k) {
  const A = typeof a === 'string' ? ARMS[a] : a, Bp = typeof b === 'string' ? ARMS[b] : b, e = ease.inOut(clamp(k));
  return [[lerp(A[0][0], Bp[0][0], e), lerp(A[0][1], Bp[0][1], e)], [lerp(A[1][0], Bp[1][0], e), lerp(A[1][1], Bp[1][1], e)]];
}
// blinks at a steady random rhythm per character
function blinking(t, seed) { const period = 3.6 + hash(seed) * 2.4, ph = (t + hash(seed * 3) * period) % period; return ph < 0.13; }

/* o: {who (name or style object), x, y (floor), h (px height of an adult), f (-1, 0, 1 facing), pose (stand, sit, walk),
       arms (preset name or [[a, b], [a, b]] for front and back), look, tilt, mood, speak, t, seed, age, seatH, lean, alpha} */
function person(ctx, o) {
  const st = typeof o.who === 'string' ? STYLE[o.who] : o.who;
  const t = o.t ?? 0, seed = o.seed ?? 11, b = boil(t), f = o.f ?? 1, fd = f === 0 ? 1 : f;
  const kid = !!st.kid;
  const age = o.age ?? 8;
  const grow = kid ? clamp((age - 8) / 6) : 0; // 0 at 8, 1 at 14
  let h = (o.h ?? 380) * (st.tall ?? 1);
  if (kid) h *= lerp(0.6, 0.9, grow);
  const x = o.x, y0 = o.y;
  const P = kid
    ? { leg: lerp(0.34, 0.41, grow), torso: lerp(0.27, 0.3, grow), neck: lerp(0.15, 0.14, grow), headR: lerp(0.155, 0.125, grow), sh: lerp(0.23, 0.24, grow), hip: lerp(0.25, 0.26, grow), up: 0.14, fore: 0.13 }
    : { leg: 0.42, torso: 0.3, neck: 0.135, headR: 0.117, sh: 0.25, hip: 0.285, up: 0.155, fore: 0.145 };
  const wide = st.wide ?? 1, thin = st.thin ?? 1;
  const breathe = Math.sin(t * 1.7 + seed) * 0.004 * h;
  const pose = o.pose ?? 'stand';
  const seatH = (o.seatH ?? (kid ? 0.3 : 0.27)) * h;
  const hipY = pose === 'sit' ? y0 - seatH : y0 - P.leg * h;
  const lean = (o.lean ?? 0) * fd;
  const shY = hipY - P.torso * h - breathe;
  const shX = x + lean * 0.08 * h;
  const tilt = o.tilt ?? 0;
  const headR = P.headR * h;
  const hx = shX + lean * 0.04 * h + Math.sin(tilt) * P.neck * h * 0.3, hy = shY - P.neck * h;
  const alpha = o.alpha ?? 1;
  ctx.save(); ctx.globalAlpha = alpha;

  if (o.shadow !== false && pose !== 'sit') { ctx.save(); ctx.globalAlpha = 0.18 * alpha; ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(x, y0 + 2, P.hip * h * 0.75, 0.022 * h, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  /* legs */
  const legW = (kid ? 0.085 : 0.075) * h * wide * thin;
  const hipL = [x - P.hip * h * 0.22, hipY], hipR = [x + P.hip * h * 0.22, hipY];
  const shoe = (px, py, dir) => shape(ctx, circlePts(px + dir * 0.03 * h, py - 0.018 * h, 0.05 * h, 0.024 * h, 16), st.shoes, { seed: seed + 91 + px, b, inkW: 2.4, pool: 0.6 });
  if (pose === 'sit') {
    for (const [i, hp] of [[0, hipL], [1, hipR]]) {
      const knee = [hp[0] + fd * 0.2 * h, hipY + 0.01 * h], foot = [knee[0] + fd * 0.02 * h, y0 - 0.02 * h];
      tube(ctx, [hp, [lerp(hp[0], knee[0], 0.5), hipY + 0.012 * h], knee, [lerp(knee[0], foot[0], 0.5), lerp(knee[1], foot[1], 0.5)], foot], legW, st.pants, { seed: seed + 20 + i, b });
      shoe(foot[0], y0, fd);
    }
  } else {
    const walk = pose === 'walk';
    for (const [i, hp] of [[0, hipL], [1, hipR]]) {
      const ph = walk ? Math.sin(t * (o.pace ?? 5.2) + i * Math.PI) : 0;
      const footX = hp[0] + ph * 0.13 * h + (i ? 0.01 : -0.01) * h, lift = walk ? Math.max(0, -Math.cos(t * (o.pace ?? 5.2) + i * Math.PI)) * 0.03 * h : 0;
      const knee = [lerp(hp[0], footX, 0.5) + fd * (walk ? Math.abs(ph) * 0.03 * h : 0.004 * h), lerp(hipY, y0, 0.5)];
      tube(ctx, [hp, knee, [footX, y0 - 0.03 * h - lift]], legW, st.pants, { seed: seed + 20 + i, b });
      shoe(footX, y0 - lift, fd);
    }
  }

  /* arms: front and back. angles are from straight down, positive toward the facing side */
  let arms = o.arms ?? 'down'; if (typeof arms === 'string') arms = ARMS[arms] || ARMS.down;
  const armW = (kid ? 0.07 : 0.062) * h * thin;
  const shoulderF = [shX + fd * P.sh * h * 0.34, shY + 0.03 * h], shoulderB = [shX - fd * P.sh * h * 0.34, shY + 0.03 * h];
  const armPts = (sh, a, bnd, side) => {
    const sw = side * 0.06; // arms hang slightly out from the body
    const e = [sh[0] + Math.sin(a * fd + sw) * P.up * h, sh[1] + Math.cos(a) * P.up * h];
    const aa = a + bnd, w = [e[0] + Math.sin(aa * fd + sw) * P.fore * h, e[1] + Math.cos(aa) * P.fore * h];
    return [sh, [lerp(sh[0], e[0], 0.55), lerp(sh[1], e[1], 0.55)], e, w];
  };
  const back = armPts(shoulderB, arms[1][0], arms[1][1], -fd), front = armPts(shoulderF, arms[0][0], arms[0][1], fd);
  const hand = (p, sd) => shape(ctx, circlePts(p[0], p[1], 0.032 * h, 0.03 * h, 14), st.skin, { seed: seed + sd, b, inkW: 2.2, pool: 0.5 });
  tube(ctx, back, armW, mix(st.top, PAL.ink, 0.15), { seed: seed + 40, b });
  hand(back[3], 44);

  /* torso: a soft bean */
  const sw = P.sh * h * wide * thin, hw = P.hip * h * wide * thin;
  const torso = [
    [shX - sw * 0.5, shY + 0.02 * h], [shX, shY - 0.012 * h], [shX + sw * 0.5, shY + 0.02 * h],
    [lerp(shX, x, 0.5) + hw * 0.54, lerp(shY, hipY, 0.55)], [x + hw * 0.5, hipY + 0.035 * h], [x, hipY + 0.05 * h], [x - hw * 0.5, hipY + 0.035 * h],
    [lerp(shX, x, 0.5) - hw * 0.54, lerp(shY, hipY, 0.55)],
  ];
  const tp = catmull(torso, 5, true);
  shape(ctx, tp, st.top, { seed: seed + 50, b, shade: { dx: -fd * 0.05 * h, dy: 0, a: 0.18 } });
  if (st.topIn) { // shirt at the collar
    const v = [[shX - sw * 0.16, shY + 0.005 * h], [shX + sw * 0.16, shY + 0.005 * h], [shX + fd * 0.01 * h, shY + 0.11 * h]];
    shape(ctx, v, st.topIn, { seed: seed + 51, b, inkW: 2, gaps: 1, pool: 0.4 });
  }
  if (st.tie) shape(ctx, [[shX - 0.012 * h, shY + 0.02 * h], [shX + 0.012 * h, shY + 0.02 * h], [shX + 0.016 * h, shY + 0.15 * h], [shX, shY + 0.17 * h], [shX - 0.016 * h, shY + 0.15 * h]], st.tie, { seed: seed + 52, b, inkW: 1.8, gaps: 1 });
  if (o.badge) {
    ctx.save(); ctx.strokeStyle = '#a8432d'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(shX - sw * 0.14, shY + 0.01 * h); ctx.lineTo(shX + fd * 0.02 * h, shY + 0.15 * h); ctx.lineTo(shX + sw * 0.14, shY + 0.01 * h); ctx.stroke(); ctx.restore();
    shape(ctx, rectPts(shX + fd * 0.02 * h - 0.028 * h, shY + 0.15 * h, 0.056 * h, 0.07 * h), '#f4efe4', { seed: seed + 53, b, inkW: 1.8, gaps: 1, pool: 0.3 });
  }

  /* head */
  const hr = headR;
  const hairBack = () => {
    const c = st.hairC;
    if (st.hair === 'bob') shape(ctx, catmull([[hx - hr * 1.1, hy + hr * 0.62], [hx - hr * 1.16, hy - hr * 0.2], [hx - hr * 0.7, hy - hr * 1.04], [hx + hr * 0.1, hy - hr * 1.16], [hx + hr * 0.86, hy - hr * 0.86], [hx + hr * 1.16, hy - hr * 0.1], [hx + hr * 1.1, hy + hr * 0.62], [hx, hy + hr * 0.5]], 5, true), c, { seed: seed + 60, b });
    if (st.hair === 'bunches') {
      if (age < 13) for (const s of [-1, 1]) { shape(ctx, circlePts(hx + s * hr * 1.05, hy + hr * 0.05, hr * 0.42, hr * 0.46, 18), c, { seed: seed + 61 + s, b }); dot(ctx, hx + s * hr * 0.82, hy - hr * 0.05, hr * 0.12, st.band, 0.95); }
      else shape(ctx, catmull([[hx - fd * hr * 0.6, hy - hr * 0.6], [hx - fd * hr * 1.5, hy - hr * 0.2], [hx - fd * hr * 1.45, hy + hr * 0.9], [hx - fd * hr * 1.1, hy + hr * 0.2]], 5, true), c, { seed: seed + 61, b });
      shape(ctx, circlePts(hx, hy - hr * 0.08, hr * 1.06, hr * 1.02, 26), c, { seed: seed + 62, b, ink: false });
    }
    if (st.hair === 'long') shape(ctx, catmull([[hx - hr * 1.1, hy + hr * 1.3], [hx - hr * 1.18, hy - hr * 0.3], [hx, hy - hr * 1.15], [hx + hr * 1.18, hy - hr * 0.3], [hx + hr * 1.1, hy + hr * 1.3], [hx, hy + hr * 1.1]], 5, true), c, { seed: seed + 60, b });
    if (st.hair === 'bun') shape(ctx, circlePts(hx - fd * hr * 0.35, hy - hr * 1.05, hr * 0.42, hr * 0.38, 16), c, { seed: seed + 60, b });
  };
  const hairFront = () => {
    const c = st.hairC;
    if (st.hair === 'bob') shape(ctx, catmull([[hx - hr * 1.02, hy - hr * 0.1], [hx - hr * 0.86, hy - hr * 0.78], [hx, hy - hr * 1.06], [hx + hr * 0.86, hy - hr * 0.78], [hx + hr * 1.02, hy - hr * 0.1], [hx + hr * 0.7, hy - hr * 0.42], [hx + fd * hr * 0.15, hy - hr * 0.3], [hx - hr * 0.6, hy - hr * 0.4]], 5, true), c, { seed: seed + 63, b, gaps: 3 });
    if (st.hair === 'bunches') shape(ctx, catmull([[hx - hr * 0.98, hy - hr * 0.05], [hx - hr * 0.8, hy - hr * 0.8], [hx, hy - hr * 1.04], [hx + hr * 0.8, hy - hr * 0.8], [hx + hr * 0.98, hy - hr * 0.05], [hx + hr * 0.55, hy - hr * 0.42], [hx + hr * 0.1, hy - hr * 0.32], [hx - hr * 0.4, hy - hr * 0.45]], 5, true), c, { seed: seed + 64, b, gaps: 3 });
    if (st.hair === 'long') shape(ctx, catmull([[hx - hr, hy - hr * 0.1], [hx - hr * 0.8, hy - hr * 0.85], [hx, hy - hr * 1.06], [hx + hr * 0.8, hy - hr * 0.85], [hx + hr, hy - hr * 0.1], [hx + hr * 0.3, hy - hr * 0.5], [hx - hr * 0.5, hy - hr * 0.5]], 5, true), c, { seed: seed + 64, b, gaps: 3 });
    if (st.hair === 'short' || st.hair === 'bun' || st.hair === 'side') shape(ctx, catmull([[hx - hr * 1.0, hy - hr * 0.2], [hx - hr * 0.85, hy - hr * 0.85], [hx + hr * 0.1, hy - hr * 1.1], [hx + hr * 0.9, hy - hr * 0.8], [hx + hr * 1.02, hy - hr * 0.2], [hx + hr * (st.hair === 'side' ? 0.2 : 0.5), hy - hr * 0.55], [hx - hr * 0.6, hy - hr * 0.62]], 5, true), c, { seed: seed + 64, b, gaps: 3 });
    if (st.hair === 'curly') { for (let i = 0; i < 10; i++) { const a = Math.PI * (1.02 + i * 0.105); shape(ctx, circlePts(hx + Math.cos(a) * hr * 0.95, hy + Math.sin(a) * hr * 0.9 - hr * 0.08, hr * 0.34, hr * 0.32, 12), c, { seed: seed + 70 + i, b, inkW: 2.2, pool: 0.5 }); } }
    if (st.hair === 'bald') inkLine(ctx, [[hx - hr * 0.95, hy - hr * 0.2], [hx - hr * 1.02, hy + hr * 0.1]], { w: hr * 0.18, color: st.hairC, seed });
    if (st.hair === 'cap') {
      shape(ctx, catmull([[hx - hr * 1.08, hy - hr * 0.22], [hx - hr * 0.9, hy - hr * 0.95], [hx, hy - hr * 1.16], [hx + hr * 0.9, hy - hr * 0.95], [hx + hr * 1.08, hy - hr * 0.22]], 5).concat([[hx, hy - hr * 0.3]]), st.capC, { seed: seed + 65, b });
      shape(ctx, [[hx + fd * hr * 0.2, hy - hr * 0.34], [hx + fd * hr * 1.55, hy - hr * 0.24], [hx + fd * hr * 1.5, hy - hr * 0.12], [hx + fd * hr * 0.2, hy - hr * 0.16]], mix(st.capC, PAL.ink, 0.2), { seed: seed + 66, b, inkW: 2.4 });
      for (const s of [-1, 1]) shape(ctx, circlePts(hx + s * hr * 0.98, hy + hr * 0.05, hr * 0.18, hr * 0.28, 10), st.hairC, { seed: seed + 67 + s, b, inkW: 1.8, pool: 0.4 });
    }
  };
  if (f !== 2) hairBack();
  // ear on the far side of the face when turned
  if (f !== 0) shape(ctx, circlePts(hx - fd * hr * 0.78, hy + hr * 0.08, hr * 0.17, hr * 0.22, 10), st.skin, { seed: seed + 58, b, inkW: 2, pool: 0.4 });
  shape(ctx, circlePts(hx, hy, hr * 1.02, hr, 30), st.skin, { seed: seed + 57, b, shade: { dx: -fd * hr * 0.25, dy: hr * 0.05, a: 0.12 } });

  /* face */
  const look = o.look ?? 0;
  const ex = hx + (f === 0 ? 0 : fd * hr * 0.3) + look * hr * 0.2, ey = hy + hr * 0.08;
  const sp = f === 0 ? hr * 0.38 : hr * 0.33;
  const mood = o.mood ?? 'calm';
  const shut = mood === 'sleep' || blinking(t, seed);
  ctx.save(); ctx.fillStyle = PAL.ink; ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round';
  const er = hr * (mood === 'wide' ? 0.13 : 0.105);
  for (const s of [-1, 1]) {
    const exx = ex + s * sp * 0.5 * (f !== 0 && s === -fd ? 0.8 : 1);
    if (shut) { ctx.lineWidth = hr * 0.06; ctx.beginPath(); ctx.arc(exx, ey - er * 0.2, er * 1.05, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.ellipse(exx, ey, er * 0.82, er, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(exx - er * 0.3, ey - er * 0.38, er * 0.3, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (mood === 'sad' || mood === 'worry') { ctx.lineWidth = hr * 0.05; ctx.beginPath(); const inner = s * -1; ctx.moveTo(exx - er * 1.1, ey - er * (mood === 'sad' ? 1.9 : 2.3) + (inner < 0 ? 0 : er * 0.5)); ctx.lineTo(exx + er * 1.1, ey - er * (mood === 'sad' ? 1.9 : 2.3) + (inner < 0 ? er * 0.5 : 0)); ctx.stroke(); }
  }
  ctx.restore();
  if (st.glasses) { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = hr * 0.05; ctx.globalAlpha = 0.85; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + s * sp * 0.52, ey, hr * 0.22, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(ex - sp * 0.52 + hr * 0.22, ey); ctx.lineTo(ex + sp * 0.52 - hr * 0.22, ey); ctx.stroke(); ctx.restore(); }
  // cheeks
  for (const s of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.42 * alpha; ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.ellipse(ex + s * sp * 0.95, ey + hr * 0.32, hr * 0.17, hr * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  // nose, a small pen tick toward the facing side
  if (f !== 0) { ctx.save(); ctx.strokeStyle = mix(st.skin, PAL.ink, 0.45); ctx.lineWidth = hr * 0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex + fd * hr * 0.12, ey + hr * 0.2, hr * 0.07, fd > 0 ? -0.6 : Math.PI - 0.9, fd > 0 ? 0.9 : Math.PI + 0.6); ctx.stroke(); ctx.restore(); }
  if (st.mustache) shape(ctx, catmull([[ex - hr * 0.26, ey + hr * 0.42], [ex, ey + hr * 0.3], [ex + hr * 0.26, ey + hr * 0.42], [ex, ey + hr * 0.4]], 4, true), st.hairC, { seed: seed + 80, b, inkW: 1.6, gaps: 1 });
  // mouth
  {
    const mx = ex + (f === 0 ? 0 : fd * hr * 0.05), my = ey + hr * 0.44;
    ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = hr * 0.055; ctx.lineCap = 'round';
    if (o.speak) {
      const open = Math.max(0, noise1(t * 11 + seed) * 0.6 + 0.35) * hr * 0.13;
      ctx.fillStyle = '#6b2a24'; ctx.beginPath(); ctx.ellipse(mx, my, hr * 0.1, Math.max(hr * 0.02, open), 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (mood === 'smile' || mood === 'sleep') { ctx.beginPath(); ctx.arc(mx, my - hr * 0.1, hr * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    else if (mood === 'sad') { ctx.beginPath(); ctx.arc(mx, my + hr * 0.12, hr * 0.12, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
    else if (mood === 'o' || mood === 'wide') { ctx.beginPath(); ctx.arc(mx, my, hr * 0.06, 0, TAU); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(mx - hr * 0.08, my); ctx.quadraticCurveTo(mx, my + hr * 0.03, mx + hr * 0.08, my); ctx.stroke(); }
    ctx.restore();
  }
  hairFront();

  /* front arm last, over the body */
  tube(ctx, front, armW, st.top, { seed: seed + 41, b });
  hand(front[3], 45);
  ctx.restore();
  return { head: [hx, hy, hr], handF: front[3], handB: back[3], elbowF: front[2], shoulder: [shX, shY], hip: [x, hipY], h };
}

// a child asleep, or nearly: head on the pillow, blanket drawn up
function sleeper(ctx, x, y, o = {}) {
  const st = typeof o.who === 'string' ? STYLE[o.who] : (o.who ?? STYLE.wren), t = o.t ?? 0, b = boil(t), seed = o.seed ?? 5;
  const hr = o.r ?? 46, f = o.f ?? 1;
  const breath = Math.sin(t * 1.2) * 3;
  if (st.hair === 'bunches') for (const s of [-1, 1]) shape(ctx, circlePts(x + s * hr * 1.0, y - hr * 0.05, hr * 0.4, hr * 0.44, 16), st.hairC, { seed: seed + s, b });
  shape(ctx, circlePts(x, y, hr * 1.06, hr * 1.02, 26), st.hairC, { seed: seed + 3, b });
  shape(ctx, circlePts(x + f * hr * 0.12, y + hr * 0.12, hr * 0.92, hr * 0.88, 26), st.skin, { seed: seed + 4, b });
  shape(ctx, catmull([[x - hr * 0.95, y + hr * 0.02], [x - hr * 0.7, y - hr * 0.8], [x + hr * 0.2, y - hr * 1.02], [x + hr * 0.95, y - hr * 0.5], [x + hr * 0.7, y - hr * 0.28], [x, y - hr * 0.42]], 5, true), st.hairC, { seed: seed + 6, b, gaps: 3 });
  const ex = x + f * hr * 0.2, ey = y + hr * 0.18, open = o.awake && !blinking(t, seed);
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.fillStyle = PAL.ink; ctx.lineWidth = hr * 0.07; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    if (open) { ctx.beginPath(); ctx.ellipse(ex + s * hr * 0.3, ey, hr * 0.08, hr * 0.1, 0, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(ex + s * hr * 0.3, ey - hr * 0.04, hr * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  }
  ctx.restore();
  for (const s of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.ellipse(ex + s * hr * 0.55, ey + hr * 0.26, hr * 0.16, hr * 0.09, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  if (o.speak) { const open2 = Math.max(0.2, noise1(t * 11) * 0.6 + 0.4) * hr * 0.1; dot(ctx, ex, ey + hr * 0.42, Math.max(3, open2), '#6b2a24', 0.9); }
  // blanket
  const bw = o.blanketW ?? hr * 5.2, bc = o.blanket ?? '#c98a4a';
  shape(ctx, catmull([[x - hr * 1.3, y + hr * 0.75], [x - hr * 0.2, y + hr * 0.55 + breath], [x + bw * 0.45, y + hr * 0.45 + breath], [x + bw, y + hr * 0.7], [x + bw, y + hr * 1.9], [x - hr * 1.3, y + hr * 1.9]], 5, true), bc, { seed: seed + 9, b });
  // stitched squares on the quilt
  ctx.save(); ctx.strokeStyle = mix(bc, PAL.ink, 0.35); ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - hr + (bw / 4) * i, y + hr * 0.7); ctx.lineTo(x - hr + (bw / 4) * i, y + hr * 1.85); ctx.stroke(); }
  ctx.restore();
}

/* ---------- Hearth: a small ember with eyes ---------- */
const HEARTH_TONES = {
  warm: { core: '#fff4d6', mid: '#ffd27a', rim: '#f29a3c', glow: '#ffb85a' },
  cold: { core: '#effffc', mid: '#bfe8e2', rim: '#6fb3ab', glow: '#9fd3cb' },
  rose: { core: '#fff0ec', mid: '#ffc2b6', rim: '#e0806f', glow: '#ff9f8f' },
  dim: { core: '#f8e7c4', mid: '#e8b56a', rim: '#b87a3c', glow: '#d99a55' },
  red: { core: '#fff0dc', mid: '#f6a06a', rim: '#c2432d', glow: '#e8603f' },
};
// o: {t, r, tone, look (-1..1), speak, owl (ear tufts), eyes (default true), glowA, seed, sleepy}
function hearth(ctx, x, y, o = {}) {
  const t = o.t ?? 0, r = o.r ?? 40, tone = HEARTH_TONES[o.tone ?? 'warm'], seed = o.seed ?? 3, b = boil(t);
  const bob = Math.sin(t * 2.1 + seed) * r * 0.06, cy = y + bob;
  if (o.glowA !== 0) glow(ctx, x, cy - r * 0.3, r * 4.2, tone.glow, (o.glowA ?? 0.55));
  const lick = (k) => noise1(t * 3.1 + k * 7 + seed) * r * 0.22;
  const outline = [];
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI * (i / 26); // bottom half circle, left to right
    outline.push([x - Math.cos(a) * r, cy + Math.sin(a) * r * 0.95]);
  }
  outline.push([x + r * 0.95, cy - r * 0.35], [x + r * 0.55 + lick(1), cy - r * 1.15], [x + r * 0.12 + lick(2) * 1.4, cy - r * 2.05], [x - r * 0.3 + lick(3), cy - r * 1.35], [x - r * 0.62 + lick(4), cy - r * 1.55], [x - r * 0.95, cy - r * 0.45]);
  const body = catmull(outline, 3, true);
  ctx.save();
  const g = ctx.createRadialGradient(x, cy + r * 0.1, r * 0.15, x, cy - r * 0.3, r * 1.9);
  g.addColorStop(0, tone.core); g.addColorStop(0.45, tone.mid); g.addColorStop(1, tone.rim);
  ctx.fillStyle = g; fillPts(ctx, wobble(body, 0.8, seed + b));
  ctx.restore();
  inkLoop(ctx, body, { w: Math.max(1.6, r * 0.06), seed: seed + b * 13, gaps: 3, alpha: 0.7, color: mix(tone.rim, PAL.ink, 0.55) });
  if (o.owl) for (const s of [-1, 1]) {
    const tuft = [[x + s * r * 0.45, cy - r * 0.62], [x + s * r * 0.95, cy - r * 1.35], [x + s * r * 0.85, cy - r * 0.55]];
    ctx.save(); ctx.fillStyle = tone.rim; fillPts(ctx, tuft); ctx.restore(); inkLoop(ctx, tuft, { w: r * 0.05, seed: seed + s + b, gaps: 1, alpha: 0.7 });
  }
  if (o.eyes !== false) {
    const lx = (o.look ?? 0) * r * 0.2, ey = cy + r * 0.05, shut = o.sleepy || blinking(t, seed + 9);
    ctx.save(); ctx.fillStyle = '#3a2412'; ctx.strokeStyle = '#3a2412'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const exx = x + lx + s * r * 0.3;
      if (o.eye === 'lens') { ctx.save(); ctx.fillStyle = '#1b2b2a'; ctx.beginPath(); ctx.arc(exx, ey, r * 0.17, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8403a'; ctx.beginPath(); ctx.arc(exx, ey, r * 0.06, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (shut) { ctx.beginPath(); ctx.arc(exx, ey - r * 0.02, r * 0.11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(exx, ey, r * 0.085, r * 0.11, 0, 0, TAU); ctx.fill(); ctx.save(); ctx.fillStyle = '#fff8e6'; ctx.beginPath(); ctx.arc(exx - r * 0.03, ey - r * 0.04, r * 0.03, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    if (o.owl) { ctx.fillStyle = '#b8742c'; fillPts(ctx, [[x + lx - r * 0.07, ey + r * 0.14], [x + lx + r * 0.07, ey + r * 0.14], [x + lx, ey + r * 0.3]]); }
    else if (o.speak) { const open = Math.max(0.15, noise1(t * 10 + seed) * 0.6 + 0.4); ctx.beginPath(); ctx.ellipse(x + lx, ey + r * 0.32, r * 0.08, r * 0.07 * open, 0, 0, TAU); ctx.fill(); }
    else if (o.smile !== false) { ctx.beginPath(); ctx.arc(x + lx, ey + r * 0.16, r * 0.12, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }
  return [x, cy];
}

/* ---------- owls ---------- */
// o: {t, s (height in px), tilt, blink, look, seed, c (body color), perch}
function owl(ctx, x, y, o = {}) {
  const t = o.t ?? 0, s = o.s ?? 90, seed = o.seed ?? 1, b = boil(t);
  const body = o.c ?? ['#7a5236', '#8a6a44', '#6b4a33', '#9a7a52'][seed % 4];
  const tilt = (o.tilt ?? Math.sin(t * 0.7 + seed * 1.7) * 0.12) + (hash(Math.floor(t / 3.3 + seed)) > 0.8 ? 0.35 * Math.sin(t * 6) * 0 : 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt * 0.3);
  const w = s * 0.72;
  shape(ctx, catmull([[-w * 0.5, -s * 0.1], [-w * 0.46, -s * 0.72], [-w * 0.32, -s * 0.98], [0, -s * 0.9], [w * 0.32, -s * 0.98], [w * 0.46, -s * 0.72], [w * 0.5, -s * 0.1], [w * 0.3, s * 0.02], [-w * 0.3, s * 0.02]], 5, true), body, { seed: seed + 1, b });
  shape(ctx, catmull([[-w * 0.3, -s * 0.12], [-w * 0.32, -s * 0.46], [0, -s * 0.54], [w * 0.32, -s * 0.46], [w * 0.3, -s * 0.12], [0, -s * 0.02]], 5, true), '#ecd9b0', { seed: seed + 2, b, inkW: 2, pool: 0.5 });
  ctx.save(); ctx.strokeStyle = mix(body, PAL.ink, 0.3); ctx.lineWidth = s * 0.018; ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) { const cx = j * w * 0.16, cy = -s * (0.38 - i * 0.1); ctx.beginPath(); ctx.moveTo(cx - s * 0.035, cy - s * 0.02); ctx.lineTo(cx, cy + s * 0.012); ctx.lineTo(cx + s * 0.035, cy - s * 0.02); ctx.stroke(); }
  ctx.restore();
  ctx.rotate(tilt);
  for (const sd of [-1, 1]) {
    shape(ctx, circlePts(sd * w * 0.2, -s * 0.72, s * 0.155, s * 0.15, 18), '#e9d6ae', { seed: seed + 3 + sd, b, inkW: 2.2, pool: 0.5 });
    const shut = blinking(t, seed * 7 + (sd > 0 ? 0 : 0));
    if (shut) { ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = s * 0.028; ctx.beginPath(); ctx.arc(sd * w * 0.2, -s * 0.73, s * 0.08, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.restore(); }
    else { dot(ctx, sd * w * 0.2, -s * 0.72, s * 0.1, '#f2a444'); dot(ctx, sd * w * 0.2 + (o.look ?? 0) * s * 0.03, -s * 0.72, s * 0.062, PAL.ink); dot(ctx, sd * w * 0.2 - s * 0.02, -s * 0.745, s * 0.018, '#fff8e6'); }
  }
  shape(ctx, [[-s * 0.04, -s * 0.64], [s * 0.04, -s * 0.64], [0, -s * 0.54]], '#c98a3c', { seed: seed + 6, b, inkW: 1.6, gaps: 1 });
  for (const sd of [-1, 1]) shape(ctx, [[sd * w * 0.22, -s * 0.9], [sd * w * 0.42, -s * 1.12], [sd * w * 0.44, -s * 0.86]], body, { seed: seed + 7 + sd, b, inkW: 2 });
  ctx.restore();
  for (const sd of [-1, 1]) inkLine(ctx, [[x + sd * s * 0.1, y + s * 0.01], [x + sd * s * 0.13, y + s * 0.06]], { w: s * 0.03, seed: seed + sd, color: '#8a6a3c' });
}

/* ---------- Biscuit ---------- */
function dog(ctx, x, y, o = {}) {
  const t = o.t ?? 0, s = o.s ?? 80, f = o.f ?? 1, b = boil(t), seed = o.seed ?? 21, c = '#d8b98a';
  const walk = o.walk ? Math.sin(t * 7) : 0;
  for (const [i, lx] of [[0, -0.32], [1, -0.18], [2, 0.18], [3, 0.3]]) {
    const sw = walk * (i % 2 ? 1 : -1) * s * 0.06;
    tube(ctx, [[x + f * lx * s, y - s * 0.32], [x + f * lx * s + sw, y - s * 0.04]], s * 0.1, i < 2 ? mix(c, PAL.ink, 0.1) : c, { seed: seed + i, b, inkW: 3.6 });
  }
  shape(ctx, catmull([[x - f * s * 0.46, y - s * 0.34], [x - f * s * 0.38, y - s * 0.62], [x + f * s * 0.3, y - s * 0.64], [x + f * s * 0.46, y - s * 0.4], [x + f * s * 0.3, y - s * 0.26], [x - f * s * 0.36, y - s * 0.26]], 5, true), c, { seed: seed + 5, b });
  const wag = Math.sin(t * (o.wag ?? 9)) * 0.4;
  tube(ctx, [[x - f * s * 0.44, y - s * 0.52], [x - f * s * 0.62, y - s * 0.72 + wag * s * 0.1], [x - f * s * 0.66, y - s * 0.86 + wag * s * 0.2]], s * 0.07, c, { seed: seed + 6, b, inkW: 3.4 });
  const hx = x + f * s * 0.5, hy = y - s * 0.72;
  shape(ctx, circlePts(hx, hy, s * 0.22, s * 0.2, 18), c, { seed: seed + 7, b });
  shape(ctx, circlePts(hx + f * s * 0.2, hy + s * 0.06, s * 0.11, s * 0.08, 12), mix(c, '#ffffff', 0.25), { seed: seed + 8, b, inkW: 2 });
  dot(ctx, hx + f * s * 0.3, hy + s * 0.04, s * 0.035, PAL.ink);
  if (!blinking(t, seed)) dot(ctx, hx + f * s * 0.08, hy - s * 0.04, s * 0.03, PAL.ink); else inkLine(ctx, [[hx + f * s * 0.05, hy - s * 0.04], [hx + f * s * 0.11, hy - s * 0.04]], { w: 2 });
  shape(ctx, catmull([[hx - f * s * 0.06, hy - s * 0.16], [hx - f * s * 0.22, hy - s * 0.02], [hx - f * s * 0.18, hy + s * 0.14], [hx - f * s * 0.04, hy - s * 0.02]], 4, true), '#a07a50', { seed: seed + 9, b, inkW: 2.2 });
}

/* ---------- props that travel ---------- */
function chair(ctx, x, y, o = {}) { // side view, seat at y - sh
  const s = o.s ?? 1, c = o.c ?? PAL.woodL, f = o.f ?? 1, b = boil(o.t ?? 0), seed = o.seed ?? 31, sh = 105 * s;
  shape(ctx, rectPts(x - 42 * s, y - sh - 10 * s, 84 * s, 12 * s), c, { seed, b, inkW: 2.4 });
  for (const lx of [-36, 30]) shape(ctx, rectPts(x + lx * s, y - sh, 7 * s, sh), mix(c, PAL.ink, 0.15), { seed: seed + lx, b, inkW: 2 });
  shape(ctx, rectPts(x - f * 42 * s - (f > 0 ? 0 : 8 * s), y - sh - 110 * s, 8 * s, 112 * s), c, { seed: seed + 5, b, inkW: 2 });
  if (!o.stool) shape(ctx, rectPts(x - f * 42 * s - (f > 0 ? 0 : 8 * s) + (f > 0 ? 0 : -0), y - sh - 104 * s, f * 36 * s || 36 * s, 10 * s), c, { seed: seed + 6, b, inkW: 2 });
}
function foldChair(ctx, x, y, o = {}) {
  const s = o.s ?? 1, c = o.c ?? '#8f8c84', b = boil(o.t ?? 0), seed = o.seed ?? 33;
  shape(ctx, rectPts(x - 34 * s, y - 100 * s, 68 * s, 10 * s), c, { seed, b, inkW: 2 });
  shape(ctx, rrectPts(x - 30 * s, y - 190 * s, 60 * s, 50 * s, 8 * s), c, { seed: seed + 1, b, inkW: 2 });
  inkLine(ctx, [[x - 30 * s, y], [x + 26 * s, y - 100 * s]], { w: 4 * s, seed: seed + 2 }); inkLine(ctx, [[x + 30 * s, y], [x - 26 * s, y - 100 * s]], { w: 4 * s, seed: seed + 3 });
  inkLine(ctx, [[x - 26 * s, y - 100 * s], [x - 28 * s, y - 190 * s]], { w: 4 * s, seed: seed + 4 }); inkLine(ctx, [[x + 26 * s, y - 100 * s], [x + 28 * s, y - 190 * s]], { w: 4 * s, seed: seed + 5 });
}
function mug(ctx, x, y, o = {}) {
  const s = o.s ?? 1, t = o.t ?? 0, c = o.c ?? '#e9dcc0', b = boil(t), seed = o.seed ?? 41;
  shape(ctx, rrectPts(x - 18 * s, y - 40 * s, 36 * s, 40 * s, 6 * s), c, { seed, b, inkW: 2.2 });
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.2 * s; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x + 20 * s, y - 20 * s, 10 * s, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
  if (o.steam !== false) steam(ctx, x, y - 44 * s, t, s);
}
function steam(ctx, x, y, t, s = 1, n = 2) {
  ctx.save(); ctx.strokeStyle = '#fffaf0'; ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const ph = frac(t * 0.35 + k / n);
    ctx.globalAlpha = 0.5 * Math.sin(ph * Math.PI); ctx.lineWidth = 4 * s * (1 - ph * 0.5);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const yy = y - ph * 30 * s - i * 6 * s, xx = x + (k - 0.5) * 12 * s + Math.sin(i * 0.8 + t * 2 + k) * 6 * s; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke();
  }
  ctx.restore();
}
// a tablet with Hearth on its screen
function tablet(ctx, x, y, o = {}) {
  const s = o.s ?? 1, t = o.t ?? 0, b = boil(t), seed = o.seed ?? 51, w = 150 * s, h = 104 * s, rot = o.rot ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rrectPts(-w / 2, -h / 2, w, h, 10 * s), '#3a3431', { seed, b, inkW: 2.4 });
  ctx.save(); ctx.fillStyle = o.screen ?? '#fbe7bf'; fillPts(ctx, rrectPts(-w / 2 + 9 * s, -h / 2 + 9 * s, w - 18 * s, h - 18 * s, 5 * s)); ctx.restore();
  if (o.hearth !== false) hearth(ctx, 0, 12 * s, { t, r: 20 * s, tone: o.tone ?? 'warm', glowA: 0.2, speak: o.speak, seed: seed + 3 });
  ctx.restore();
  if (o.glow !== false) glow(ctx, x, y, 160 * s, o.tone === 'cold' ? PAL.frost : PAL.lamp, 0.25);
}
function paperSheet(ctx, x, y, w, h, o = {}) {
  const b = boil(o.t ?? 0), seed = o.seed ?? 61, rot = o.rot ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rectPts(-w / 2, -h / 2, w, h), o.c ?? '#f6efdc', { seed, b, inkW: 1.8, gaps: 2, pool: 0.4, boilAmp: 0.6 });
  if (o.lines !== false) { ctx.save(); ctx.strokeStyle = o.ink ?? PAL.inkSoft; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1.2, h * 0.018); const n = Math.max(2, Math.floor(h / 16)); for (let i = 1; i < n; i++) { const ly = -h / 2 + (h / n) * i; ctx.beginPath(); ctx.moveTo(-w * 0.38, ly); ctx.lineTo(-w * 0.38 + w * (0.5 + 0.26 * hash(seed + i)), ly); ctx.stroke(); } ctx.restore(); }
  ctx.restore();
}
function envelope(ctx, x, y, s = 1, o = {}) {
  const b = boil(o.t ?? 0), seed = o.seed ?? 71, rot = o.rot ?? 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(ctx, rectPts(-40 * s, -26 * s, 80 * s, 52 * s), o.c ?? '#f1e6cf', { seed, b, inkW: 1.8, pool: 0.4, boilAmp: 0.5 });
  inkLine(ctx, [[-40 * s, -26 * s], [0, 4 * s], [40 * s, -26 * s]], { w: 2 * s, seed: seed + 1, alpha: 0.7 });
  if (o.seal) dot(ctx, 0, 4 * s, 7 * s, o.seal, 0.9);
  ctx.restore();
}

// a small inked heart
function heart(ctx, x, y, s, c, a = 1, t = 0, seed = 0) {
  if (a <= 0.01) return;
  const pts = []; for (let i = 0; i < 24; i++) { const k = (i / 24) * TAU; pts.push([x + s * 0.06 * 16 * Math.pow(Math.sin(k), 3), y - s * 0.06 * (13 * Math.cos(k) - 5 * Math.cos(2 * k) - 2 * Math.cos(3 * k) - Math.cos(4 * k))]); }
  ctx.save(); ctx.globalAlpha = a; shape(ctx, pts, c, { seed: seed + 3, b: boil(t), inkW: 1.8, gaps: 1, pool: 0.4 }); ctx.restore();
}

// Hearth in a glass lantern, a fire kept in the hearth
function lantern(ctx, x, y, t, o = {}) {
  const b = boil(t);
  shape(ctx, rectPts(x - 36, y - 16, 72, 16), '#5e3b27', { seed: 1, b, inkW: 2 });
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#e6efe9'; fillPts(ctx, rrectPts(x - 30, y - 112, 60, 96, 10)); ctx.restore();
  hearth(ctx, x, y - 44, { t, r: 17, tone: o.dim ? 'dim' : 'warm', glowA: o.glowA ?? (o.dim ? 0.25 : 0.5), sleepy: o.sleepy, speak: o.speak });
  inkLoop(ctx, rrectPts(x - 30, y - 112, 60, 96, 10), { w: 2.4, seed: 3 + b, gaps: 2, alpha: 0.8 });
  shape(ctx, rectPts(x - 36, y - 126, 72, 16), '#5e3b27', { seed: 4, b, inkW: 2 });
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 132, 16, Math.PI, 0); ctx.stroke(); ctx.restore();
}
