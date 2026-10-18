// Far layers of the train-window scenery: clouds, the distant ranges (with
// Fuji in the tea country), and the forested hills in front of them.
// Every painter works on absolute texel x, so the endless strip is seamless.
// Rows: y = 0 at the top of the layer; L.hz is the horizon row.
import { pk, pks, h1, h2, n1, n2, fbm1, bayer, rampPick, cloudPx, win, emit, NOINK } from './core.js';

const lerp = (a, b, t) => a + (b - a) * t;
const flat = (R, v) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * R.length)))];
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- clouds
// Cumulus banks with flat, shadowed bases and sun-lit tops, plus high wisps.
// Colour comes from the shader (cloud light/rim encoding), so they blush at
// sunset by themselves.
export function paintClouds(B, L) {
  const H = B.H;
  // lobes of each cloud: centre, radius
  const clouds = [];
  B.slots(150, 160, 701, (i, sx, r) => {
    if (r < 0.28) return;
    const n = 3 + Math.floor(h1(i, 702) * 6), big = h1(i, 703);
    const cx = sx + h1(i, 704) * 60, base = H - 44 + h1(i, 705) * 30;
    const w = 24 + big * 64;
    const lobes = [];
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.5 : k / (n - 1);
      const lx = cx - w / 2 + t * w + (h1(i * 13 + k, 706) - 0.5) * 10;
      const rr = (5 + big * 10) * (0.55 + 0.6 * Math.sin(Math.PI * (0.15 + t * 0.7))) * (0.75 + h1(i * 7 + k, 707) * 0.5);
      lobes.push({ x: lx, y: base - rr * 0.55, r: rr });
    }
    // a crown lobe or two on top
    if (big > 0.45) lobes.push({ x: cx + (h1(i, 708) - 0.5) * w * 0.3, y: base - (10 + big * 13), r: 7 + big * 9 });
    clouds.push({ base, lobes, w, cx });
  });
  // high cirrus streaks
  B.slots(220, 120, 711, (i, sx, r) => {
    if (r < 0.55) return;
    const y = 6 + h1(i, 712) * 22, len = 60 + h1(i, 713) * 120;
    for (let k = 0; k < 5; k++) {
      const yy = Math.round(y + k * 2 + h1(i * 5 + k, 714) * 2), x0 = sx + h1(i * 5 + k, 715) * 40, l = len * (0.4 + h1(i * 5 + k, 716) * 0.6);
      for (let x = Math.floor(x0); x < x0 + l; x++) if (bayer(x, yy) < 0.75 - Math.abs((x - x0) / l - 0.5) * 1.3) B.set(x, yy, cloudPx(0.85, 0.2));
    }
  });
  const inside = (c, x, y) => {
    if (y > c.base) return 0;
    let d = 0;
    for (const l of c.lobes) { const dx = (x - l.x) / l.r, dy = (y - l.y) / (l.r * 0.82); const q = 1 - (dx * dx + dy * dy); if (q > d) d = q; }
    return d;
  };
  for (const c of clouds) {
    const x0 = Math.floor(c.cx - c.w), x1 = Math.ceil(c.cx + c.w);
    let top = c.base;
    for (const l of c.lobes) top = Math.min(top, l.y - l.r);
    for (let x = Math.max(x0, B.x0); x < Math.min(x1, B.x1); x++) {
      for (let y = Math.floor(top); y <= c.base; y++) {
        const d = inside(c, x + 0.5, y + 0.5);
        if (d <= 0) continue;
        // light: is there cloud toward the sun (upper left)?
        const occ = Math.max(0, inside(c, x - 3, y - 4)) * 1.4 + Math.max(0, inside(c, x - 7, y - 8)) * 0.9;
        let lt = 1 - Math.min(1, occ) * 0.75;
        lt -= ss(c.base - 8, c.base, y) * 0.35; // shadowed flat base
        lt += (d < 0.12 ? 0.12 : 0);
        const q = Math.max(0, Math.min(1, lt));
        const step = Math.min(4, Math.floor(q * 4 + bayer(x, y) * 0.9)) / 4; // 5 chunky tones
        const rim = d < 0.1 && occ < 0.2 ? 1 : 0;
        B.set(x, y, cloudPx(step, rim));
      }
    }
  }
}

// ---------------------------------------------------------------- distant ranges
const FAR_BACK = pks(['#8a9cc6', '#98a9cf', '#a7b6d8', '#b5c2df']);
const FAR_FRONT = pks(['#6b7eae', '#7689b6', '#8395c0', '#91a2c9']);
const SNOW = pks(['#c2cce6', '#d8dff0', '#eef2fa', '#ffffff']);
const MIST = pk('#dfe6f0');
const CITY_FAR = pks(['#7a86a6', '#8892b0', '#96a0bc']);

function backH(seg, X) {
  switch (seg) {
    case 'mountain': return 22 + 20 * fbm1(X / 140, 11, 4);
    case 'farm': return 12 + 13 * fbm1(X / 160, 12, 4);
    case 'tea': return 7 + 8 * fbm1(X / 180, 13, 3);
    case 'valley': return 20 + 16 * fbm1(X / 130, 14, 4);
    case 'city': case 'station': return 4 + 5 * fbm1(X / 200, 15, 3);
    case 'village': return 12 + 13 * fbm1(X / 150, 16, 4);
    default: return 11 + 14 * fbm1(X / 155, 17, 4);
  }
}
function frontH(seg, X) {
  switch (seg) {
    case 'mountain': return 14 + 13 * fbm1(X / 90, 21, 4);
    case 'city': case 'station': return 0;
    case 'tea': return 3 + 5 * fbm1(X / 100, 22, 3);
    case 'valley': return 12 + 10 * fbm1(X / 95, 24, 4);
    default: return 6 + 9 * fbm1(X / 100, 23, 4);
  }
}
// Fuji: one grand cone placed shortly after the tea country begins
function fujiH(L, X) {
  const fx = L.fujiX;
  if (fx == null) return 0;
  const d = Math.abs(X - fx), R = 150;
  if (d > R) return 0;
  let h = 40 * Math.pow(1 - d / R, 1.55);
  if (d < 5) h = 40 * Math.pow(1 - 5 / R, 1.55) - (d < 3 ? 1 : 0);
  return h + 3;
}

export function paintFar(B, L) {
  const hz = L.hz;
  const hAt = (X, f) => { const s = L.segAt(X); return lerp(f(s.a, X), f(s.b, X), s.k); };
  for (let X = B.x0; X < B.x1; X++) {
    const s = L.segAt(X);
    const hb = hAt(X, backH), hf = hAt(X, frontH);
    const fu = s.b === 'tea' || s.a === 'tea' ? fujiH(L, X) : 0;
    // back ridge (or Fuji)
    const top = Math.max(hb, fu);
    const yb = Math.round(hz - top);
    const slope = Math.max(hb, fujiH(L, X + 2)) - Math.max(hAt(X - 2, backH), fujiH(L, X - 2));
    const isFuji = fu > hb + 0.5;
    B.col(X, yb, hz + 2, (x, y) => {
      const depth = (y - yb) / Math.max(4, top);
      if (isFuji) {
        const d = X - L.fujiX;
        // snow cap with streaks down the gullies
        const snowLine = 21 + 8 * n1(X / 4, 31) * (1 - Math.abs(d) / 150) + (h1(X >> 1, 32) > 0.7 ? 5 * h1(X, 33) : 0);
        const fromTop = (hz - y);
        const lit = d < 0 ? 0.72 : 0.32;
        if (fromTop > Math.max(0, fu - snowLine) && fromTop > fu - 25) return flat(SNOW, lit + 0.18 - depth * 0.25 + (n2(X / 3, y / 2, 34) - 0.5) * 0.2);
        const v = lit - depth * 0.35 + (n2(X / 4, y / 3, 35) - 0.5) * 0.25;
        if (fromTop < 6) return MIST;
        return flat(FAR_BACK, v);
      }
      const v = 0.45 + (slope > 0 ? 0.35 : -0.25) * Math.min(1, Math.abs(slope) / 2) - depth * 0.3 + (n2(X / 5 + y * 0.2, y / 4, 36) - 0.5) * 0.3;
      const fromTop = (hz - y);
      // snow on the high peaks
      if (top > 36 && fromTop > top - (top - 33) * 0.9 - 2 * n1(X / 4, 37)) return flat(SNOW, v + 0.2);
      if (fromTop < 4) return MIST;
      return flat(FAR_BACK, v);
    });
    // front ridge
    if (hf > 0.5) {
      const yf = Math.round(hz - hf);
      const sl = hAt(X + 2, frontH) - hAt(X - 2, frontH);
      B.col(X, yf, hz + 2, (x, y) => {
        const fromTop = hz - y;
        const v = 0.5 + (sl > 0 ? 0.32 : -0.28) * Math.min(1, Math.abs(sl) / 2) - (y - yf) / Math.max(4, hf) * 0.25 + (n2(X / 4 + y * 0.3, y / 3, 41) - 0.5) * 0.35;
        if (fromTop < 3) return MIST;
        return flat(FAR_FRONT, v);
      });
    }
    // the faraway city skyline
    if (s.b === 'city' || s.b === 'station') {
      const bw = 7 + Math.floor(h1(X >> 3, 51) * 6);
      const cell = Math.floor(X / bw);
      const bh = 6 + h1(cell, 52) ** 2 * 28 + (h1(cell, 53) > 0.93 ? 18 : 0);
      const yt = Math.round(hz - bh * (s.a === s.b ? 1 : s.k));
      const tone = Math.floor(h1(cell, 54) * 3);
      B.col(X, yt, hz + 2, (x, y) => {
        if ((x % bw) === 0) return CITY_FAR[0];
        if (y > yt + 2 && (y - yt) % 3 === 1 && x % 2 === 0 && h2(x, y, 55) > 0.55) return win(['#ffd890', '#fff0c0', '#ffc070'][(x + y) % 3]);
        return CITY_FAR[tone];
      });
      // a radio tower with a red light
      if (h1(X >> 9, 56) > 0.6 && (X & 511) === 200) {
        for (let y = hz - 52; y < hz - 12; y++) { const w = Math.round((y - (hz - 52)) / 10); B.set(X - w, y, CITY_FAR[0]); B.set(X + w, y, CITY_FAR[0]); if (y % 6 === 0) for (let k = -w; k <= w; k++) B.set(X + k, y, CITY_FAR[1]); }
        B.set(X, hz - 54, emit('#ff4040')); B.set(X, hz - 53, emit('#ff4040'));
      }
    }
  }
}

// ---------------------------------------------------------------- forested hills
// Broccoli-textured woods (cell-shaded crowns, lit from the upper left), dark
// sugi cedar stands, misty hollows, and things on the hills: steel pylons with
// sagging lines, a pagoda, a shrine gate, terraced tea rows.
const WOOD = pks(['#24452f', '#2e5638', '#3a6a40', '#4c7f48', '#649552', '#7eaa5c']);
const WOOD_FAR = pks(['#3d6050', '#4a6e57', '#587d5e', '#6a8d66']);
const CEDAR = pks(['#183026', '#213c2e', '#2a4a38', '#365a42', '#46704e']);
const TEA_ROW = pks(['#5a9a3a', '#78b448', '#98cc5a', '#b4dc6a']);
const PYLON = pk('#c8ccd4'), PYLON_D = pk('#8a909c'), WIRE = pk('#5a6070');

function hillH(seg, X) {
  switch (seg) {
    case 'mountain': return 26 + 20 * fbm1(X / 90, 61, 4);
    case 'farm': return 9 + 12 * fbm1(X / 110, 62, 4);
    case 'tea': return 8 + 12 * fbm1(X / 120, 63, 3);
    case 'valley': return 18 + 14 * fbm1(X / 80, 64, 4);
    case 'city': case 'station': return 3 + 5 * fbm1(X / 90, 65, 3);
    case 'village': return 13 + 12 * fbm1(X / 95, 66, 4);
    default: return 12 + 16 * fbm1(X / 100, 67, 4);
  }
}
const isCedar = (seg, X) => (seg === 'mountain' || seg === 'valley' ? n1(X / 60, 71) > 0.4 : n1(X / 80, 72) > 0.7);

// crown texture: packed round lumps of foliage (broccoli) of varied size,
// the nearest-in-front lump wins; lit from the upper right, dark gaps between
function crown(x, y, R, s = 0) {
  const cw = 8, ch = 6;
  const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
  let best = -9, bx = 0, by = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j;
    const ox = (cx + 0.5 + (h2(cx, cy, s + 3) - 0.5) * 0.8) * cw, oy = (cy + 0.5 + (h2(cx, cy, s + 4) - 0.5) * 0.7) * ch;
    const r = (0.62 + h2(cx, cy, s + 5) * 0.35) * cw;
    const px = (x + 0.5 - ox) / r, py = (y + 0.5 - oy) / (r * 0.8);
    const d = px * px + py * py;
    if (d > 1) continue;
    const front = 1 - d + cy * 0.08; // lower lumps stand in front
    if (front > best) { best = front; bx = px; by = py; }
  }
  if (best === -9) return R[0];
  const v = 0.58 + bx * 0.28 - by * 0.4 - (bx * bx + by * by) * 0.18;
  return flat(R, v);
}

export function paintHills(B, L) {
  const hz = L.hz;
  const hAt = (X) => { const s = L.segAt(X); return lerp(hillH(s.a, X), hillH(s.b, X), s.k); };
  for (let X = B.x0; X < B.x1; X++) {
    const s = L.segAt(X), seg = s.k > 0.5 ? s.b : s.a;
    const h = hAt(X);
    // bumpy canopy edge
    const bump = Math.round(2.2 * Math.abs(Math.sin(X * 0.7 + h1(X >> 2, 81) * 3)) + (h1(X >> 1, 82) > 0.8 ? 1 : 0));
    const cedar = isCedar(seg, X);
    let yt = Math.round(hz - h - bump);
    if (cedar) { const k = X % 7; yt = Math.round(hz - h - 2 - (3 - Math.abs(k - 3)) * 2.4 - h1(Math.floor(X / 7), 83) * 4); }
    if (seg === 'city' || seg === 'station') {
      // low suburbs on a plain: mid-rise blocks instead of woods
      const cell = Math.floor((X + 3) / 13);
      const bh = 6 + h1(cell, 84) * 22;
      const yb = Math.round(hz - bh);
      const wall = pks(['#9aa2b4', '#b4b8c4', '#c8c4bc', '#a8a49c'])[Math.floor(h1(cell, 85) * 4)];
      B.col(X, yb, hz + 3, (x, y) => {
        if ((x + 3) % 13 === 0) return pk('#6a7084');
        if (y === yb) return pk('#d8d8dc');
        if (y > yb + 2 && (y - yb) % 4 === 2 && (x % 3) !== 0) return h2(x, y, 86) > 0.45 ? win(h2(x, y, 87) > 0.5 ? '#ffe0a0' : '#fff4d8') : pk('#5a6478');
        return wall;
      });
      continue;
    }
    B.col(X, yt, hz + 3, (x, y) => {
      const fromTop = y - yt;
      const fromBase = hz - y;
      let c;
      if (cedar) {
        // a row of sugi spires: lit on the right, layered tiers of branches, dark gaps
        const k = x % 7, e = Math.abs(k - 3);
        let v = 0.55 + (k > 3 ? 0.25 : k < 3 ? -0.15 : 0.1) - fromTop / 100;
        if ((fromTop + e) % 4 === 3) v -= 0.3;
        if (k === 0) v -= 0.3;
        c = flat(CEDAR, v);
      } else {
        c = crown(x, y, h > 26 ? WOOD : WOOD, 89);
        if (fromTop < 1) c = WOOD[4];
      }
      // terraced tea rows on the gentle tea-country slopes
      if (seg === 'tea' && fromBase < h * 0.7 && fromBase > 2 && n1(X / 70, 90) > 0.45) {
        const row = (y + Math.floor(X / 24)) % 3;
        c = row === 0 ? TEA_ROW[0] : row === 1 ? TEA_ROW[3] : TEA_ROW[2];
      }
      // misty hollow at the foot
      if (fromBase < 2) c = WOOD_FAR[3];
      return c;
    });
  }
  // things on the hills
  const segAt = (X) => { const s = L.segAt(X); return s.k > 0.5 ? s.b : s.a; };
  // pylons and their sagging lines
  const PSP = 260;
  const pyl = (i) => { const sg = segAt(i * PSP); return (sg === 'country' || sg === 'mountain' || sg === 'farm' || sg === 'tea') && h1(i, 92) < 0.25; };
  const ptop = (i) => Math.round(hz - hAt(i * PSP + 40) - 20);
  B.slots(PSP, 40, 93, (i, sx) => {
    if (!pyl(i)) return;
    B.obj(i * 7 + 1, 'none');
    const X = sx + 40, top = ptop(i), base = Math.round(hz - hAt(X) + 2);
    for (let y = top; y <= base; y++) {
      const w = Math.round(1 + (y - top) / 7);
      B.set(X - w, y, PYLON); B.set(X + w, y, PYLON_D);
      if ((y - top) % 4 === 0) for (let k = -w; k <= w; k++) B.set(X + k, y, (k + y) % 2 ? PYLON : PYLON_D);
      else { B.set(X - w + ((y >> 1) % (2 * w + 1)), y, PYLON_D); }
    }
    for (const [dy, hw] of [[2, 7], [8, 9], [14, 6]]) B.hline(X - hw, X + hw, top + dy, PYLON);
    B.set(X, top - 1, PYLON); B.set(X, top - 2, PYLON);
    // lines to the next pylon
    if (pyl(i + 1)) {
      const X2 = (i + 1) * PSP + 40, t2 = ptop(i + 1);
      for (const [dy, hw] of [[2, 7], [8, 9], [14, 6]]) for (const sx2 of [-hw, hw]) {
        const ax = X + sx2, bx = X2 + sx2, ay = top + dy + 1, by = t2 + dy + 1;
        for (let x = Math.max(ax, B.x0); x <= Math.min(bx, B.x1 - 1); x++) { const t = (x - ax) / (bx - ax); B.set(x, Math.round(lerp(ay, by, t) + Math.sin(t * Math.PI) * 9), WIRE); }
      }
    }
    B.obj(null);
  });
  // a five-storey pagoda poking out of the woods, a vermilion torii
  B.slots(900, 40, 94, (i, sx, r) => {
    const X = sx + 300, sg = segAt(X);
    if (sg !== 'village' || r < 0.5) return;
    const base = Math.round(hz - hAt(X) + 6);
    B.obj(X * 5 + 3);
    if (r < 0.75) {
      const ROOF = pk('#3a3a4a'), ROOFL = pk('#5a5a6c'), RED = pk('#b8402e'), REDD = pk('#8a2e22'), GOLD = pk('#c8a040');
      for (let k = 0; k < 5; k++) {
        const y = base - 4 - k * 5, w = 6 - Math.floor(k * 0.7);
        B.rect(X - w + 2, y - 3, (w - 2) * 2 + 1, 3, k % 2 ? REDD : RED);
        B.rect(X - w - 1, y - 4, w * 2 + 3, 1, ROOF); B.hline(X - w, X + w, y - 5, ROOFL);
      }
      for (let y = base - 36; y < base - 28; y++) B.set(X, y, GOLD);
    } else {
      const RED = pk('#d8462e'), DK = pk('#2a2228');
      B.rect(X - 5, base - 11, 2, 11, RED); B.rect(X + 4, base - 11, 2, 11, RED);
      B.rect(X - 7, base - 13, 15, 2, DK); B.rect(X - 6, base - 9, 13, 1, RED);
    }
    B.obj(null);
  });
}
