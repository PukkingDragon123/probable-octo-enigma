// Ground layers of the train-window scenery.
//   paintFarGround: the plain in the middle distance — rice paddies mirroring
//     the sky, hamlets, greenhouses, shrine woods, tea rows, river, sea, city.
//   paintNear: the old Japan right by the line — kawara-roofed farmhouses,
//     storehouses, sheds, shrines, bamboo, level crossings, vending machines,
//     jizo, kei trucks, farmers in the paddies, herons, poles and wires; a
//     river levee, the coast with black pines, the town at dusk.
// Rows: y = 0 at the top; L.hz is the horizon row (far ground), L.gy the
// ground line (near).
import { pk, pks, h1, h2, n1, n2, fbm1, bayer, rampPick, water, win, emit, sprite, darkenPacked, art } from './core.js';

const lerp = (a, b, t) => a + (b - a) * t;
const segOf = (L, X) => { const s = L.segAt(X); return s.k > 0.5 ? s.b : s.a; };

// ---------------------------------------------------------------- shared palettes
const RICE = pks(['#3e7a32', '#4f8c3a', '#64a246', '#7db852', '#9ccc62']);
const DIKE = pks(['#7a6a46', '#8f7e54', '#a69462', '#6f9a44']);
const SOIL = pks(['#6a4e36', '#7c5c3e', '#8e6c48']);
const GRASS = pks(['#3c6e30', '#4c8238', '#5e9842', '#78ae4e', '#94c25c']);
const KAWARA = pks(['#323849', '#3d4458', '#4a5268', '#5a6379', '#6d778e', '#8691a8']);
const KAWARA_R = pks(['#5a2a22', '#6e3428', '#86402e', '#9c4e36', '#b4623e', '#c87a4e']);
const TIN = { red: pks(['#7a2e26', '#963a2e', '#b04a38', '#c45e44']), blue: pks(['#2e4a6e', '#38587e', '#46688e', '#5a7c9e']), green: pks(['#2e5a42', '#386a4c', '#467a58', '#5a8c68']) };
const WOODW = pks(['#3a2a20', '#4a3426', '#5a402e', '#6c4e36', '#7e5e42']);
const PLASTER = pks(['#c8c0ae', '#d8d0c0', '#e6e0d2', '#f2eee4']);
const STONE = pks(['#6a6a6c', '#7e7c7a', '#94918c', '#aaa69e']);
const ASPH = pks(['#5a5a5e', '#646468', '#6e6e72']);
const BLACK = pk('#1e1a22'), WHITE = pk('#f4f2ec');

// ================================================================= far ground
function paddyRows(hz, H) {
  const rows = [];
  let y = hz + 1, s = 1.3;
  while (y < H) { const h = Math.max(1, Math.round(s)); rows.push([y, h]); y += h + 1; s *= 1.28; }
  return rows;
}
function fieldType(row, cell, seg) {
  const r = h2(row, cell, 301);
  if (seg === 'tea') return r < 0.75 ? 'tea' : r < 0.9 ? 'rice' : 'soil';
  return r < 0.42 ? 'water' : r < 0.82 ? 'rice' : r < 0.92 ? 'veg' : 'soil';
}
function paintFieldPx(type, x, y, y0, h, depth, cellX) {
  switch (type) {
    case 'water': {
      // freshly planted: mirror water with dotted rows of seedlings
      if ((y - y0) % 2 === 1 && (x + y) % (depth < 0.3 ? 2 : 3) === 0) return RICE[2 + (x % 2)];
      return water(0.25 + depth * 0.45, h2(x >> 2, y, 302) > 0.985 ? 0.8 : 0, 0.25);
    }
    case 'rice': return rampPick(RICE, 0.55 + ((x + (y >> 1)) % 3 === 0 ? 0.25 : 0) - ((y - y0) / Math.max(1, h)) * 0.25 + (n2(x / 6, y / 2, 303) - 0.5) * 0.4, x, y);
    case 'veg': return (y - y0) % 2 === 0 ? SOIL[1] : RICE[(x % 3) + 1];
    case 'tea': { const k = (y - y0) % 3; return k === 0 ? pk('#3e6a2e') : k === 1 ? pk('#8cc850') : pk('#6aa83e'); }
    default: return (y - y0) % 2 ? SOIL[0] : SOIL[2];
  }
}
function tinyHouse(B, X, base, seed) {
  const r = (k) => h1(seed, k);
  const w = 9 + Math.floor(r(1) * 12), h = 5 + Math.floor(r(2) * 5), rh = 3 + Math.floor(r(3) * 4);
  const wall = [PLASTER[3], PLASTER[2], pk('#d8c8a8'), WOODW[3], pk('#c8ccd0')][Math.floor(r(4) * 5)];
  const roofR = r(5) < 0.6 ? KAWARA : r(5) < 0.8 ? KAWARA_R : TIN[['red', 'blue', 'green'][Math.floor(r(6) * 3)]];
  B.rect(X, base - h, w, h, wall);
  B.vline(X + w - 1, base - h, base - 1, darkenPacked(wall, 0.25));
  for (let wx = X + 2; wx < X + w - 2; wx += 4) { const lit = h1(wx, seed) > 0.5; B.rect(wx, base - h + 2, 2, 2, lit ? win('#ffd890') : pk('#3a4050')); }
  // roof (hip seen from the long side)
  for (let k = 0; k < rh; k++) B.hline(X - 2 + k, X + w + 1 - k, base - h - 1 - k, roofR[k === rh - 1 ? 4 : k === 0 ? 1 : 3 - (k % 2)]);
  B.hline(X - 2, X + w + 1, base - h, roofR[0]);
}
function grove(B, X, base, w, h, seed) {
  for (let i = 0; i < w / 4; i++) {
    const cx = X + i * 4 + h1(seed + i, 311) * 3, cy = base - h * (0.4 + 0.6 * Math.sin(Math.PI * (i + 0.5) / (w / 4))) + 3, r = 3 + h1(seed + i, 312) * 4;
    B.ellipse(cx, cy, r, r * 0.9, (x, y, nx, ny) => rampPick(GRASS, 0.5 - nx * 0.4 - ny * 0.5 + (h2(x, y, 313) - 0.5) * 0.3, x, y));
  }
  B.rect(X + 2, base - 3, w - 4, 3, GRASS[0]);
}
function greenhouse(B, X, base, n) {
  for (let k = 0; k < n; k++) {
    const x0 = X + k * 12;
    for (let x = 0; x < 11; x++) {
      const t = (x - 5) / 5.5, top = Math.round(base - 6 * Math.sqrt(Math.max(0, 1 - t * t)));
      B.col(x0 + x, top, base - 1, (xx, y) => (y === top ? pk('#ffffff') : (x % 3 === 0 ? pk('#c8d4d8') : pk('#e4ecee'))));
    }
  }
}
export function paintFarGround(B, L) {
  const hz = L.hz, H = B.H;
  const rows = paddyRows(hz, H);
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'sea') {
      B.col(X, hz, H - 1, (x, y) => {
        const d = (y - hz) / (H - hz);
        const wave = (y + Math.floor(x / 9 + Math.sin(y * 0.9) * 2)) % 5 === 0 && h2(x >> 3, y, 321) > 0.4;
        return water(0.1 + d * 0.7, wave ? 0.35 : h2(x, y, 322) > 0.99 ? 0.9 : 0, 0.15);
      });
      continue;
    }
    if (seg === 'river') {
      // far bank, then a wide river to the near edge
      B.col(X, hz, H - 1, (x, y) => {
        const d = y - hz;
        if (d < 4) return rampPick(GRASS, 0.4 + (n2(x / 4, y, 323) - 0.5) * 0.6, x, y);
        if (d < 6) return h2(x, y, 324) > 0.5 ? pk('#b8b0a0') : pk('#a8a090');
        const bar = n1(x / 90, 325) > 0.72 && d > 14 && d < 22;
        if (bar) return h2(x, y, 326) > 0.6 ? pk('#c8c0ac') : pk('#b4ac98');
        return water(0.15 + d / (H - hz) * 0.6, (y + (x >> 4)) % 7 === 0 && h2(x >> 2, y, 327) > 0.7 ? 0.5 : 0, 0.3);
      });
      continue;
    }
    if (seg === 'city' || seg === 'station') {
      B.col(X, hz, H - 1, (x, y) => ((y - hz) % 9 === 4 ? ASPH[1] : (y - hz) % 9 === 5 && x % 6 < 3 ? pk('#d8d4c8') : rampPick(pks(['#7a7a74', '#8a8880', '#9a968c']), n2(x / 7, y / 3, 328), x, y)));
      continue;
    }
    let rowI = 0;
    for (const [y0, h] of rows) {
      rowI++;
      const fw = Math.max(18, Math.round(26 + h * 11));
      const off = Math.floor(h1(rowI, 329) * fw);
      const cell = Math.floor((X + off) / fw);
      const edge = (X + off) % fw === 0;
      const type = fieldType(rowI, cell, seg);
      const depth = (y0 - hz) / (H - hz);
      B.rect(X, y0 - 1, 1, 1, DIKE[(X % 4 === 0) ? 3 : 1]);
      B.col(X, y0, y0 + h - 1, (x, y) => (edge ? DIKE[2] : paintFieldPx(type, x, y, y0, h, depth, cell)));
    }
    // a farm lane along the back with the faint line of a road
    if (n1(X / 200, 330) > 0.35) B.set(X, hz + 3, DIKE[2]);
  }
  // ---- objects standing on the plain
  B.slots(110, 60, 331, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 332) * 40), seg = segOf(L, X);
    if (seg === 'sea') {
      // fishing boats and a lighthouse
      if (r < 0.5) { const y = hz + 4 + Math.floor(h1(i, 333) * 20), w = 8 + Math.floor(h1(i, 334) * 8); B.rect(X, y - 2, w, 2, h1(i, 335) > 0.5 ? WHITE : pk('#c84a3a')); B.rect(X + 1, y, w - 2, 1, pk('#3a4a6a')); B.rect(X + 2, y - 4, 3, 2, WHITE); B.vline(X + w - 3, y - 8, y - 3, pk('#4a4a52')); }
      else if (r > 0.9) { B.rect(X, hz - 14, 4, 15, WHITE); B.rect(X, hz - 9, 4, 2, pk('#d84a3a')); B.rect(X - 1, hz - 16, 6, 2, pk('#3a3a44')); B.set(X + 1, hz - 15, emit('#fff4b0')); B.set(X + 2, hz - 15, emit('#fff4b0')); }
      return;
    }
    if (seg === 'river') {
      if (r < 0.4) { // a long truss bridge across
        const y = hz + 9, len = 150;
        for (let x = X; x < X + len; x++) {
          B.set(x, y, pk('#7a3a2a')); B.set(x, y - 7, pk('#7a3a2a'));
          const k = (x - X) % 10;
          B.set(x, y - Math.round(k < 5 ? k * 1.4 : (10 - k) * 1.4), pk('#9a4a34'));
          if ((x - X) % 30 === 0) B.rect(x, y + 1, 2, 10, pk('#8a8680'));
        }
      }
      if (r > 0.6) { for (let k = 0; k < 4; k++) tinyHouse(B, X + k * 14, hz + 1, i * 7 + k); }
      return;
    }
    if (seg === 'city' || seg === 'station') {
      for (let k = 0; k < 6; k++) {
        const w = 10 + Math.floor(h1(i * 9 + k, 336) * 16), h = 10 + Math.floor(h1(i * 9 + k, 337) ** 1.6 * 34), x0 = X - 30 + k * 18;
        const wall = pks(['#a8acb8', '#c4c0b8', '#9aa4b0', '#d0ccc0', '#b8b0a4'])[Math.floor(h1(i * 9 + k, 338) * 5)];
        B.rect(x0, hz + 4 - h, w, h, wall);
        B.vline(x0 + w - 1, hz + 4 - h, hz + 3, darkenPacked(wall, 0.3));
        for (let wy = hz + 6 - h; wy < hz + 1; wy += 3) for (let wx = x0 + 1; wx < x0 + w - 2; wx += 2) if (h2(wx, wy, 339) > 0.35) B.set(wx, wy, h2(wx, wy, 340) > 0.4 ? win('#ffe0a0') : pk('#4a5468'));
        if (h1(i * 9 + k, 341) > 0.7) { const c = ['#ff4a6a', '#40d0ff', '#ffd040', '#7aff7a'][k % 4]; B.rect(x0 + 1, hz + 1 - h, Math.min(8, w - 2), 3, emit(c)); }
      }
      return;
    }
    // country / village / tea / mountain
    if (seg === 'tea') {
      if (r < 0.55) { // frost fans over the tea rows
        for (let k = 0; k < 3; k++) { const x = X + k * 22; B.vline(x, hz - 8, hz + 4, pk('#8a8a90')); B.rect(x - 1, hz - 10, 3, 2, pk('#c8ccd4')); B.set(x + 2, hz - 10, pk('#6a6e78')); }
      } else tinyHouse(B, X, hz + 2, i);
      return;
    }
    const n = seg === 'village' ? 6 : r < 0.45 ? 0 : 2 + Math.floor(h1(i, 342) * 3);
    if (r < 0.2) grove(B, X, hz + 2, 24 + Math.floor(h1(i, 343) * 24), 10 + h1(i, 344) * 8, i);
    else if (r < 0.3) greenhouse(B, X, hz + 6, 2 + Math.floor(h1(i, 345) * 3));
    for (let k = 0; k < n; k++) tinyHouse(B, X + k * 15 + Math.floor(h1(i * 5 + k, 346) * 5), hz + 1 + Math.floor(h1(i * 5 + k, 347) * 2), i * 11 + k);
    if (n && h1(i, 348) > 0.4) { const gx = X - 14; B.ellipse(gx, hz - 3, 6, 5, (x, y, nx, ny) => rampPick(GRASS, 0.5 - nx * 0.4 - ny * 0.4, x, y)); B.vline(gx, hz, hz + 1, WOODW[1]); }
    // herons standing in the paddies
    if (h1(i, 349) > 0.65) { const hy = hz + 10 + Math.floor(h1(i, 350) * 12); B.set(X + 40, hy, WHITE); B.set(X + 40, hy - 1, WHITE); B.set(X + 41, hy - 2, WHITE); }
  });
  // utility poles along the back lane
  B.slots(64, 2, 351, (i, sx) => {
    const seg = segOf(L, sx);
    if (!(seg === 'country' || seg === 'village' || seg === 'tea')) return;
    B.vline(sx, hz - 9, hz + 2, pk('#6a6460')); B.hline(sx - 2, sx + 2, hz - 8, pk('#6a6460'));
    for (let x = sx; x < sx + 64; x++) B.set(x, hz - 8 + Math.round(Math.sin((x - sx) / 64 * Math.PI) * 2), pk('#4a4448'));
  });
}

// ================================================================= near layer
// ---- buildings
function kawaraRoof(B, xL, xR, yE, rh, inset, R, o = {}) {
  // a hipped kawara roof seen from its long side: tile rows, seams, ridge, onigawara
  for (let k = 0; k <= rh; k++) {
    const y = yE - k;
    const a = Math.round(xL + inset * (k / rh)), b = Math.round(xR - inset * (k / rh));
    const rowK = k % 3;
    for (let x = a; x <= b; x++) {
      let v = rowK === 0 ? 0.15 : rowK === 1 ? 0.5 : 0.75;
      if ((x + (Math.floor(k / 3) % 2) * 2) % 4 === 0 && rowK !== 0) v -= 0.18;
      v += (k / rh) * 0.15 + (h2(x, y, 361) - 0.5) * 0.12;
      if (x === a || x === b) v = 0.05;
      B.set(x, y, rampPick(R, v, x, y));
    }
  }
  // eave fascia
  B.hline(Math.round(xL), Math.round(xR), yE + 1, R[0]);
  // ridge with white noshi lines and onigawara at both ends
  const ra = Math.round(xL + inset) - 1, rb = Math.round(xR - inset) + 1, ry = yE - rh - 1;
  B.rect(ra, ry - 3, rb - ra + 1, 4, R[1]);
  B.hline(ra, rb, ry - 3, R[4]);
  if (!o.plain) B.hline(ra + 1, rb - 1, ry - 1, PLASTER[1]);
  for (const ex of [ra - 1, rb - 2]) { B.rect(ex, ry - 6, 4, 7, R[0]); B.rect(ex + 1, ry - 5, 2, 2, R[3]); B.set(ex + (ex < ra ? 0 : 3), ry - 7, R[0]); }
}
function gableRoof(B, X, w, yE, rh, ov, R) {
  // the gable end facing us: thick tile-edged slopes over a timber-framed gable
  const cx = X + w / 2, apex = yE - rh;
  for (let y = apex; y <= yE; y++) {
    const t = (y - apex) / rh, hw = t * (w / 2 + ov);
    const a = Math.round(cx - hw), b = Math.round(cx + hw);
    for (let x = a; x <= b; x++) {
      const edge = x - a < 4 || b - x < 4;
      if (edge) B.set(x, y, (x - a === 0 || b - x === 0) ? R[0] : ((x + y) % 3 === 0 ? R[4] : R[2]));
      else if (x > X && x < X + w) {
        const beam = (y - apex) % 9 === 8 || Math.abs(x - cx) < 1 || (Math.abs(x - cx) - 8) % 10 === 0;
        B.set(x, y, beam ? WOODW[1] : rampPick(PLASTER, 0.7 - t * 0.2, x, y));
      }
    }
  }
  B.rect(Math.round(cx) - 2, apex + 6, 4, 3, WOODW[0]); // vent
}
function eaveShadow(B, X0, X1, y, n = 3) {
  for (let x = X0; x <= X1; x++) for (let k = 0; k < n; k++) { const c = B.get(x, y + k); if (c && (c >>> 24) === 255) B.set(x, y + k, darkenPacked(c, 0.35 - k * 0.1)); }
}
function wallPanel(B, x0, x1, yT, gy, kind, seed) {
  for (let x = x0; x <= x1; x++) {
    B.col(x, yT, gy - 1, (xx, y) => {
      const mid = Math.round((yT + gy) / 2);
      if (kind === 'glass') {
        const fx = (x - x0) % 7, top = yT + 3;
        if (y < top || fx === 0) return WOODW[2];
        if (y === mid || (fx === 3 && y < mid)) return WOODW[3];
        return win(h1(Math.floor((x - x0) / 7), seed) > 0.4 ? '#ffd690' : '#ffe8b8');
      }
      if (kind === 'shoji') {
        const fx = (x - x0) % 8;
        if (fx === 0 || y === yT) return WOODW[2];
        if ((x - x0) % 4 === 0 || (y - yT) % 5 === 0) return pk('#c8bca0');
        return win('#fff0c8');
      }
      if (kind === 'boards') return (x % 3 === 0) ? WOODW[0] : rampPick(WOODW, 0.4 + (n2(x / 2, y / 9, 371) - 0.5) * 0.5, xx, y);
      // plaster above, boards below
      if (y > mid) return (x % 3 === 0) ? WOODW[0] : WOODW[1 + ((x >> 1) % 2)];
      if (y === mid) return WOODW[3];
      return rampPick(PLASTER, 0.75 - (y - yT) * 0.01 + (h2(x, y, 372) - 0.5) * 0.12, xx, y);
    });
  }
}
function kominka(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 74 + Math.floor(r(1) * 46), wh = 22 + Math.floor(r(2) * 6), ov = 7, rh = 16 + Math.floor(r(3) * 8);
  const R = r(4) < 0.72 ? KAWARA : KAWARA_R;
  const yW = gy - wh;
  // stone footing
  B.rect(X - 1, gy - 2, w + 2, 2, STONE[1]); B.hline(X - 1, X + w, gy - 2, STONE[3]);
  // walls with posts; a run of glass doors / shoji behind an engawa
  const bays = Math.max(3, Math.round(w / 14));
  const bw = w / bays;
  for (let b = 0; b < bays; b++) {
    const x0 = Math.round(X + b * bw), x1 = Math.round(X + (b + 1) * bw) - 1;
    const kind = h1(seed * 31 + b, 381) < 0.35 ? 'glass' : h1(seed * 31 + b, 382) < 0.55 ? 'shoji' : h1(seed * 31 + b, 383) < 0.6 ? 'mixed' : 'boards';
    wallPanel(B, x0, x1, yW, gy - 2, kind, seed * 7 + b);
    B.vline(x0, yW, gy - 3, WOODW[0]);
  }
  B.vline(X + w - 1, yW, gy - 3, WOODW[0]);
  // engawa veranda
  if (r(5) < 0.65) { B.rect(X + 4, gy - 7, w - 8, 2, WOODW[4]); B.hline(X + 4, X + w - 5, gy - 5, WOODW[1]); for (let x = X + 6; x < X + w - 6; x += 12) B.vline(x, gy - 5, gy - 3, WOODW[0]); }
  // second-floor skirt roof on bigger houses
  const two = r(6) < 0.4;
  let yRoof = yW;
  if (two) {
    const y2 = yW - 18;
    wallPanel(B, X + 6, X + w - 7, y2, yW - 2, r(7) < 0.5 ? 'glass' : 'mixed', seed + 99);
    for (let x = X - 4; x < X + w + 4; x++) { B.set(x, yW - 1, R[1]); B.set(x, yW - 2, R[3]); B.set(x, yW - 3, R[2]); }
    eaveShadow(B, X, X + w - 1, yW, 2);
    yRoof = y2;
  }
  if (r(8) < 0.28) gableRoof(B, X, w, yRoof - 1, rh + 10, ov, R);
  else kawaraRoof(B, X - ov, X + w - 1 + ov, yRoof - 1, rh, rh * 1.15, R);
  eaveShadow(B, X, X + w - 1, yRoof, 3);
  // life: potted plants, a bicycle, laundry pole, a cat on the engawa, AC unit, mailbox
  if (r(9) < 0.6) for (let k = 0; k < 3; k++) { const px = X + 3 + k * 4; B.rect(px, gy - 4, 3, 3, pk('#a8583a')); B.rect(px - 1, gy - 7, 5, 3, GRASS[2 + (k % 2)]); }
  if (r(10) < 0.4) { const bx = X + w - 18; B.ellipse(bx, gy - 3, 2.5, 2.5, BLACK); B.ellipse(bx + 9, gy - 3, 2.5, 2.5, BLACK); B.line(bx, gy - 3, bx + 4, gy - 7, pk('#c83a3a')); B.line(bx + 4, gy - 7, bx + 9, gy - 3, pk('#c83a3a')); B.hline(bx + 3, bx + 6, gy - 8, BLACK); }
  if (r(11) < 0.45) { const lx = X + w + 4; B.vline(lx, gy - 22, gy - 1, pk('#8a8a90')); B.vline(lx + 22, gy - 22, gy - 1, pk('#8a8a90')); B.hline(lx, lx + 22, gy - 21, pk('#a8a8b0')); for (let k = 0; k < 4; k++) { const cx = lx + 2 + k * 5; const c = pk(['#f4f4f0', '#ff9ab0', '#7ab0e8', '#f0d050', '#e8e8e0'][(seed + k) % 5]); B.rect(cx, gy - 20, 4, 6 + (k % 2) * 2, c); } if (r(12) < 0.5) B.rect(lx + 3, gy - 21, 16, 9, pk('#f0e0e8')); }
  if (r(13) < 0.35) { const cx = X + 10 + Math.floor(r(14) * (w - 20)); B.rect(cx, gy - 10, 4, 3, pk(r(15) < 0.5 ? '#2a2420' : '#e8a050')); B.set(cx, gy - 11, pk(r(15) < 0.5 ? '#2a2420' : '#e8a050')); B.set(cx + 3, gy - 11, pk(r(15) < 0.5 ? '#2a2420' : '#e8a050')); }
  if (r(16) < 0.5) { const ax = X + w - 14; B.rect(ax, yW + 8, 9, 6, pk('#e4e4e0')); B.ellipse(ax + 3, yW + 11, 2, 2, pk('#9a9aa0')); }
  return w;
}
function kura(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 30 + Math.floor(r(1) * 14), wh = 30 + Math.floor(r(2) * 8);
  const yW = gy - wh;
  for (let x = X; x < X + w; x++) {
    B.col(x, yW, gy - 1, (xx, y) => {
      if (y > gy - 12) { // namako-kabe: slate tiles with raised white joints in a diamond lattice
        const u = (x - X + (y - gy)) % 6, v = (x - X - (y - gy) + 60) % 6;
        return u === 0 || v === 0 ? pk('#e8e4dc') : (y + x) % 2 ? pk('#3a3e4a') : pk('#444856');
      }
      return rampPick(PLASTER, 0.82 - (x - X) / w * 0.25 + (h2(x, y, 391) - 0.5) * 0.08 - (y - yW < 3 ? 0.25 : 0), xx, y);
    });
  }
  B.vline(X + w - 1, yW, gy - 1, PLASTER[0]);
  // the little iron-shuttered window and a family crest
  const wx = X + Math.floor(w / 2) - 4, wy = yW + 7;
  B.rect(wx - 1, wy - 1, 10, 9, pk('#2a2830')); B.rect(wx, wy, 8, 7, pk('#4a4652'));
  for (let k = 1; k < 8; k += 2) B.vline(wx + k, wy, wy + 6, pk('#7a7682'));
  if (r(3) < 0.6) { B.ellipse(X + w / 2, yW - 5, 4, 4, pk('#2a2830')); B.ellipse(X + w / 2, yW - 5, 2, 2, PLASTER[3]); }
  kawaraRoof(B, X - 4, X + w + 3, yW - 1, 10, 6, KAWARA, { plain: true });
  eaveShadow(B, X, X + w - 1, yW, 2);
  return w;
}
function shed(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 34 + Math.floor(r(1) * 20), wh = 24;
  const T = TIN[['red', 'blue', 'green'][Math.floor(r(2) * 3)]];
  for (let x = X; x < X + w; x++) {
    B.col(x, gy - wh, gy - 1, (xx, y) => {
      const rust = n2(x / 3, y / 8, 401) > 0.7 && (x % 2 === 0);
      if (x > X + 6 && x < X + w - 8 && y > gy - wh + 6) return (y > gy - 4) ? pk('#2a2420') : pk('#1e1a1e');
      return rust ? pk('#8a5a3a') : (x % 2 ? pk('#9a9ca2') : pk('#b4b6bc'));
    });
  }
  // a little tractor inside
  if (r(3) < 0.7) { const tx = X + 12; B.rect(tx, gy - 9, 10, 5, pk('#d85a2a')); B.rect(tx + 7, gy - 13, 4, 4, pk('#3a3a40')); B.ellipse(tx + 2, gy - 3, 3, 3, BLACK); B.ellipse(tx + 9, gy - 3, 2, 2, BLACK); }
  for (let k = 0; k < 6; k++) B.hline(X - 3 + k, X + w + 2 - k, gy - wh - 1 - k, T[k % 2 ? 1 : 2]);
  B.hline(X - 3, X + w + 2, gy - wh, T[0]);
  return w;
}
function modernHouse(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 56 + Math.floor(r(1) * 26), fh = 19;
  const siding = pks(['#d8d0c0', '#c8ccd0', '#e8dcc8', '#d0c4b0'])[Math.floor(r(2) * 4)];
  const T = TIN[['red', 'blue', 'green'][Math.floor(r(3) * 3)]];
  for (let x = X; x < X + w; x++) B.col(x, gy - fh * 2, gy - 1, (xx, y) => ((y - gy) % 3 === 0 ? darkenPacked(siding, 0.12) : siding));
  B.vline(X + w - 1, gy - fh * 2, gy - 1, darkenPacked(siding, 0.3));
  for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) {
    const wx = X + 6 + k * Math.floor((w - 12) / 3), wy = gy - fh * (f + 1) + 5, ww = Math.floor((w - 12) / 3) - 6;
    B.rect(wx - 1, wy - 1, ww + 2, 10, pk('#a8acb4')); B.rect(wx, wy, ww, 8, h1(seed * 9 + f * 3 + k, 411) > 0.45 ? win('#ffe4b0') : pk('#3a4458'));
    B.vline(wx + Math.floor(ww / 2), wy, wy + 7, pk('#a8acb4'));
  }
  // balcony with laundry and a futon airing
  const by = gy - fh - 3;
  B.rect(X + 4, by, w - 8, 2, pk('#8a8e96')); for (let x = X + 4; x < X + w - 4; x += 3) B.vline(x, by - 6, by, pk('#9aa0a8')); B.hline(X + 4, X + w - 5, by - 7, pk('#8a8e96'));
  if (r(4) < 0.7) B.rect(X + 8, by - 9, 16, 9, pk(['#f4f0f0', '#ffc8d8', '#c8dcff'][Math.floor(r(5) * 3)]));
  for (let k = 0; k < 5; k++) B.rect(X + 30 + k * 4, by - 13, 3, 5 + (k % 2) * 2, pk(['#ffffff', '#ff8a8a', '#8ab4ff', '#ffe070', '#7ac87a'][(seed + k) % 5]));
  for (let k = 0; k < 5; k++) B.hline(X - 3 + k * 2, X + w + 2 - k * 2, gy - fh * 2 - 1 - k, T[k % 2 ? 2 : 1]);
  B.hline(X - 3, X + w + 2, gy - fh * 2, T[0]);
  B.rect(X + w - 12, gy - 20, 9, 7, pk('#e0e0dc')); // AC unit
  if (r(6) < 0.6) { // a white kei car in the carport
    const cx = X - 26; B.rect(cx, gy - 10, 22, 7, pk('#f0f0ec')); B.rect(cx + 3, gy - 14, 14, 4, pk('#e8e8e4')); B.rect(cx + 5, gy - 13, 10, 2, pk('#5a6a80'));
    B.ellipse(cx + 5, gy - 3, 2.5, 2.5, BLACK); B.ellipse(cx + 17, gy - 3, 2.5, 2.5, BLACK); B.set(cx + 21, gy - 8, emit('#ffe8a0'));
  }
  return w;
}
function shrine(B, X, gy, seed, L) {
  const r = (k) => h1(seed, k);
  const RED = pks(['#8a2a22', '#b23a2a', '#d24e36', '#e8704a']);
  // sacred camphor behind, with its shimenawa rope
  const t = sprite('camphor_0');
  if (t) B.blit(t, X + 18, gy - t.h);
  // torii
  const tx = X;
  for (const px of [tx, tx + 22]) { B.rect(px, gy - 34, 3, 34, RED[2]); B.vline(px, gy - 34, gy - 1, RED[1]); B.rect(px - 1, gy - 3, 5, 3, BLACK); }
  B.rect(tx - 6, gy - 40, 37, 3, BLACK); B.hline(tx - 7, tx + 31, gy - 41, pk('#3a3a44'));
  B.rect(tx - 4, gy - 37, 33, 3, RED[2]); B.hline(tx - 4, tx + 28, gy - 37, RED[3]);
  B.rect(tx - 2, gy - 30, 29, 2, RED[2]);
  B.rect(tx + 10, gy - 36, 5, 6, pk('#1e1a22')); B.rect(tx + 11, gy - 35, 3, 4, pk('#c8a040'));
  // shimenawa with paper zigzags
  for (let x = tx + 3; x < tx + 22; x++) B.set(x, gy - 27 + Math.round(Math.sin((x - tx - 3) / 19 * Math.PI) * 2), pk('#d8c890'));
  for (const zx of [tx + 8, tx + 15]) { B.vline(zx, gy - 25, gy - 21, WHITE); B.set(zx + 1, gy - 23, WHITE); }
  // hokora shrine and stone lanterns
  const hx = X + 44;
  B.rect(hx, gy - 14, 16, 12, WOODW[3]); B.rect(hx + 2, gy - 12, 12, 8, WOODW[1]); B.rect(hx + 6, gy - 11, 4, 3, emit('#ffd070'));
  for (let k = 0; k < 6; k++) B.hline(hx - 3 + k, hx + 18 - k, gy - 15 - k, KAWARA[k % 2 ? 2 : 3]);
  B.rect(hx - 1, gy - 2, 18, 2, STONE[2]);
  for (const lx of [X - 12, X + 36]) { B.rect(lx, gy - 4, 6, 4, STONE[1]); B.rect(lx + 2, gy - 12, 2, 8, STONE[2]); B.rect(lx, gy - 16, 6, 4, STONE[3]); B.set(lx + 2, gy - 14, emit('#ffd070')); B.rect(lx - 1, gy - 18, 8, 2, STONE[1]); }
  // red-and-white nobori banners
  for (let k = 0; k < 3; k++) { const nx = X + 64 + k * 7; B.vline(nx, gy - 30, gy - 1, pk('#a8a8a0')); B.rect(nx + 1, gy - 29, 4, 20, k % 2 ? pk('#e84a3a') : WHITE); B.rect(nx + 2, gy - 26, 2, 12, k % 2 ? WHITE : pk('#e84a3a')); }
  return 90;
}
function jizo(B, X, gy) {
  for (let k = 0; k < 3; k++) {
    const x = X + k * 7;
    B.rect(x, gy - 9, 5, 9, STONE[2]); B.vline(x + 4, gy - 9, gy - 1, STONE[0]); B.ellipse(x + 2.5, gy - 11, 2.6, 2.6, STONE[3]);
    B.rect(x, gy - 8, 5, 3, pk('#d83a32')); B.rect(x + 1, gy - 14, 3, 2, pk('#d83a32'));
  }
  B.rect(X - 2, gy - 1, 24, 1, STONE[0]);
  B.rect(X + 21, gy - 5, 3, 4, pk('#8a9aa0')); B.set(X + 21, gy - 6, pk('#ff7aa0')); B.set(X + 23, gy - 7, pk('#ffe070'));
  return 26;
}
function vending(B, X, gy, n) {
  const fronts = ['#e8403a', '#2a6ad8', '#f4f4f0', '#3aa860', '#f0b020'];
  for (let k = 0; k < n; k++) {
    const x = X + k * 11, f = pk(fronts[(X + k) % fronts.length]);
    B.rect(x, gy - 20, 10, 20, f); B.rect(x + 1, gy - 19, 8, 9, emit('#f4f8ff'));
    for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) B.set(x + 1 + c * 2, gy - 18 + row * 3, emit(['#ff6a5a', '#5ab0ff', '#ffd050', '#7ae07a'][(c + row + k) % 4]));
    B.rect(x + 2, gy - 8, 6, 2, pk('#2a2a30')); B.rect(x + 2, gy - 4, 6, 2, pk('#1a1a20'));
  }
  return n * 11;
}
function busStop(B, X, gy) {
  B.vline(X, gy - 24, gy - 1, pk('#8a8a90')); B.ellipse(X, gy - 27, 4, 4, pk('#2a6ad8')); B.ellipse(X, gy - 27, 2.5, 2.5, WHITE);
  B.rect(X - 4, gy - 2, 9, 2, STONE[1]);
  B.rect(X + 6, gy - 9, 16, 2, pk('#6a8ac0')); B.vline(X + 7, gy - 7, gy - 1, WOODW[1]); B.vline(X + 20, gy - 7, gy - 1, WOODW[1]); // bench
  return 24;
}
function fumikiri(B, X, gy, t) {
  // level crossing: the warning post with its black-and-yellow pole, X sign and twin red lamps
  for (let y = gy - 34; y < gy; y++) B.set(X, y, ((y >> 2) & 1) ? pk('#f0c020') : BLACK), B.set(X + 1, y, ((y >> 2) & 1) ? pk('#d8a818') : BLACK);
  B.line(X - 6, gy - 38, X + 7, gy - 30, WHITE); B.line(X - 6, gy - 30, X + 7, gy - 38, WHITE);
  B.line(X - 6, gy - 39, X + 7, gy - 31, BLACK); B.line(X - 6, gy - 31, X + 7, gy - 39, BLACK);
  for (const lx of [X - 5, X + 4]) { B.rect(lx, gy - 28, 3, 3, emit('#ff3a2a')); B.rect(lx - 1, gy - 29, 5, 1, BLACK); }
  B.rect(X - 2, gy - 22, 6, 4, BLACK); B.rect(X - 1, gy - 21, 4, 2, pk('#f0c020'));
  // the striped barrier arm, raised
  for (let k = 0; k < 26; k++) B.set(X + 3 + Math.round(k * 0.3), gy - 18 - k, ((k >> 2) & 1) ? pk('#f0c020') : BLACK);
  // the road across
  B.rect(X - 30, gy - 1, 70, 2, ASPH[1]);
  return 40;
}
function keiTruck(B, X, gy, seed) {
  const W = pk('#f2f2ee'), Wd = pk('#c8c8c4');
  B.rect(X, gy - 9, 30, 4, W); B.hline(X, X + 29, gy - 6, Wd);
  B.rect(X + 22, gy - 16, 9, 8, W); B.rect(X + 24, gy - 15, 6, 4, pk('#4a5a74')); B.set(X + 30, gy - 8, emit('#ffe8a0'));
  for (const x of [X + 1, X + 21]) B.rect(x, gy - 12, 1, 4, Wd);
  B.hline(X + 1, X + 21, gy - 12, Wd);
  // cargo: crates of vegetables or a load of straw
  if (h1(seed, 1) < 0.5) for (let k = 0; k < 4; k++) { B.rect(X + 2 + k * 5, gy - 13, 4, 4, pk('#c8a060')); B.rect(X + 2 + k * 5, gy - 14, 4, 1, pk(['#e85a3a', '#7ac04a', '#f0a030', '#8a5ac8'][k])); }
  else B.ellipse(X + 11, gy - 12, 9, 4, pk('#d8c070'));
  B.ellipse(X + 6, gy - 3, 3, 3, BLACK); B.ellipse(X + 25, gy - 3, 3, 3, BLACK);
  B.set(X + 6, gy - 3, pk('#8a8a90')); B.set(X + 25, gy - 3, pk('#8a8a90'));
  return 32;
}
function farmer(B, X, y) {
  // bent over the rice, straw sugegasa hat
  B.ellipse(X + 2, y - 8, 5, 1.6, pk('#d8b860')); B.set(X + 2, y - 10, pk('#c8a050'));
  B.rect(X, y - 7, 5, 4, pk('#3a5a9a')); B.rect(X + 4, y - 5, 3, 2, pk('#3a5a9a'));
  B.vline(X + 1, y - 3, y, pk('#2a3a6a')); B.vline(X + 3, y - 3, y, pk('#2a3a6a'));
  B.set(X + 6, y - 3, pk('#e8c8a0'));
}
function scarecrow(B, X, gy) {
  B.vline(X, gy - 22, gy - 1, WOODW[2]); B.hline(X - 8, X + 8, gy - 16, WOODW[2]);
  B.rect(X - 6, gy - 17, 13, 7, pk('#4a6aa8')); B.rect(X - 3, gy - 10, 7, 3, pk('#4a6aa8'));
  B.ellipse(X, gy - 21, 3.5, 3.5, pk('#f0e8d8')); B.set(X - 1, gy - 21, BLACK); B.set(X + 1, gy - 21, BLACK); B.hline(X - 1, X + 1, gy - 19, pk('#d83a3a'));
  B.ellipse(X, gy - 24, 6, 1.5, pk('#d8b860')); B.rect(X - 2, gy - 26, 5, 2, pk('#c8a050'));
}
function utilityPole(B, X, gy) {
  const P = pk('#9a9690'), Pd = pk('#7a7670'), Pl = pk('#b4b0a8');
  B.rect(X - 1, gy - 78, 3, 78, P); B.vline(X - 1, gy - 78, gy - 1, Pl); B.vline(X + 1, gy - 78, gy - 1, Pd);
  B.hline(X - 9, X + 9, gy - 74, Pd); B.hline(X - 7, X + 7, gy - 66, Pd);
  for (const dx of [-8, -3, 3, 8]) B.set(X + dx, gy - 75, pk('#e8e8ec'));
  B.rect(X + 2, gy - 62, 6, 8, pk('#8a9098')); B.hline(X + 2, X + 7, gy - 62, pk('#a8aeb6')); // transformer
  // the yellow guard sleeve and the little plate
  B.rect(X - 2, gy - 14, 5, 12, pk('#f0d040')); for (let y = gy - 14; y < gy - 2; y += 3) B.hline(X - 2, X + 2, y, BLACK);
  B.rect(X - 2, gy - 34, 5, 6, pk('#2a6ad8'));
}
const POLE_SP = 190;
function poleWires(B, L, gy) {
  const has = (i) => { const sg = segOf(L, i * POLE_SP); return (sg === 'country' || sg === 'village' || sg === 'tea' || sg === 'city' || sg === 'station') && n1(i / 5, 420) > 0.42; };
  B.slots(POLE_SP, 12, 421, (i, sx) => {
    if (!has(i)) return;
    utilityPole(B, sx, gy);
    if (!has(i + 1)) return;
    const ex = sx + POLE_SP;
    for (const [dy, dx, sag, col] of [[-75, -8, 7, '#3a3a40'], [-66, 0, 10, '#2a2a30']]) {
      for (let x = Math.max(sx + dx, B.x0); x < Math.min(ex + dx, B.x1); x++) { const t = (x - sx - dx) / POLE_SP; B.set(x, gy + dy + Math.round(Math.sin(t * Math.PI) * sag), pk(col)); }
    }
    // crows on the wire
    if (h1(i, 422) > 0.7) for (let k = 0; k < 2 + Math.floor(h1(i, 423) * 3); k++) { const x = sx + 30 + k * 9 + Math.floor(h1(i * 5 + k, 424) * 6), t = (x - sx) / POLE_SP, y = gy - 66 + Math.round(Math.sin(t * Math.PI) * 9); B.rect(x, y - 3, 3, 3, BLACK); B.set(x - 1, y - 3, BLACK); B.set(x + 3, y - 1, BLACK); }
  });
}
// a twisted coastal black pine
function blackPine(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const lean = (r(1) - 0.5) * 1.4, hgt = 50 + r(2) * 26;
  const TR = pks(['#3a2a26', '#4e3830', '#62483a']);
  let x = X, y = gy;
  const pts = [];
  for (let k = 0; k < hgt; k++) { x += lean * 0.5 + Math.sin(k * 0.13 + seed) * 0.4; y -= 1; pts.push([x, y]); B.rect(Math.round(x) - 1, y, 3, 1, TR[1]); B.set(Math.round(x) + 1, y, TR[0]); }
  const NEED = pks(['#1e3a2a', '#284a34', '#345c3e', '#46704a']);
  for (let k = 0; k < 5; k++) {
    const [px, py] = pts[Math.min(pts.length - 1, Math.floor(hgt * (0.45 + k * 0.13)))];
    const w = 12 + r(3 + k) * 14, cx = px + (k % 2 ? 1 : -1) * w * 0.4;
    B.line(px, py, cx, py - 2, TR[1]);
    B.ellipse(cx, py - 3, w, 3.6, (xx, yy, nx, ny) => rampPick(NEED, 0.6 - ny * 0.6 - nx * 0.15 + (h2(xx, yy, seed) - 0.5) * 0.4, xx, yy));
  }
}
// ---- the near-layer painter
const NEAR_SP = 150;
export function paintNear(B, L) {
  const gy = L.gy, H = B.H;
  // ground first: road along the houses, then fields, levee, beach, streets
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'river') {
      B.col(X, gy - 3, H - 1, (x, y) => {
        const d = y - gy;
        if (d < 0) return h2(x, y, 431) > 0.5 ? pk('#b8b0a0') : pk('#a8a090');
        if (d < 18) { const stripe = ((x + d * 2) >> 3) & 1; return rampPick(GRASS, 0.55 + (stripe ? 0.18 : -0.05) - d * 0.012 + (h2(x, y, 432) - 0.5) * 0.3, x, y); }
        if (d < 20) return pk('#8a8270');
        return water(0.12 + (d - 20) / (H - gy) * 0.7, h2(x >> 3, y, 433) > 0.93 && (y % 3 === 0) ? 0.6 : 0, 0.35);
      });
      continue;
    }
    if (seg === 'sea') {
      B.col(X, gy - 6, H - 1, (x, y) => {
        const d = y - gy;
        if (d < 0) return (x % 16 === 0) ? STONE[0] : rampPick(STONE, 0.6 - (d + 6) * 0.06, x, y);
        if (d < 9) return rampPick(pks(['#c8b48a', '#d8c69c', '#e6d8b0']), 0.5 + (h2(x, y, 434) - 0.5) * 0.6, x, y);
        if (d < 11) return (x + y) % 4 === 0 ? WHITE : water(0.6, 0.3, 0.1);
        return water(0.2 + (d - 11) / (H - gy) * 0.75, h2(x >> 2, y, 435) > 0.95 ? 0.9 : ((y + (x >> 3)) % 6 === 0 ? 0.25 : 0), 0.12);
      });
      continue;
    }
    if (seg === 'city' || seg === 'station') {
      B.col(X, gy - 1, H - 1, (x, y) => {
        const d = y - gy;
        if (d < 3) return STONE[2];
        if (d < 18) return d === 10 && x % 14 < 7 ? pk('#e8e4d8') : ASPH[(h2(x, y, 436) * 3) | 0];
        if (d < 21) return STONE[1];
        return rampPick(GRASS, 0.4 + (h2(x, y, 437) - 0.5) * 0.5, x, y);
      });
      continue;
    }
    // country / village / tea / mountain: the lane, then fields toward us
    B.col(X, gy - 1, gy + 3, (x, y) => (y === gy + 3 ? DIKE[0] : h2(x, y, 438) > 0.6 ? pk('#a49a86') : pk('#948a76')));
    let y = gy + 4, rowI = 0, s = 6;
    while (y < H) {
      const h = Math.round(s); rowI++;
      const fw = 70 + rowI * 60, off = Math.floor(h1(rowI, 439) * fw), cell = Math.floor((X + off) / fw);
      const type = seg === 'tea' ? 'teaNear' : seg === 'mountain' ? 'grass' : fieldType(rowI + 10, cell, seg);
      const y0 = y;
      B.col(X, y0, y0 + h - 1, (x, yy) => {
        if (yy === y0) return DIKE[(x >> 1) % 2 ? 3 : 2];
        if (type === 'teaNear') { const k = (yy - y0) % 6; return k < 2 ? pk('#3e6a2e') : rampPick(pks(['#5a9a3a', '#78b448', '#98cc5a', '#b8e070']), 0.75 - k * 0.12 + (h2(x >> 1, yy, 440) - 0.5) * 0.4, x, yy); }
        if (type === 'grass') return rampPick(GRASS, 0.45 + (n2(x / 4, yy / 3, 441) - 0.5) * 0.6, x, yy);
        if (type === 'water') { if ((yy - y0) % 4 === 2 && (x % 4) < 2) return RICE[2 + ((x >> 2) % 2)]; return water(0.3 + (yy - gy) / (H - gy) * 0.5, h2(x >> 2, yy, 442) > 0.985 ? 0.8 : 0, 0.25); }
        return paintFieldPx(type, x, yy, y0, h, 0.8, cell);
      });
      y += h; s *= 1.45;
    }
  }
  // poles + wires behind everything else in front
  poleWires(B, L, gy);
  // ---- buildings and life, placed in slots
  B.slots(NEAR_SP, 140, 451, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 452) * 30);
    const seg = segOf(L, X);
    const pick = h1(i, 453);
    if (seg === 'river') {
      if (r < 0.5) { for (let k = 0; k < 3; k++) { const hx = X + k * 26; B.rect(hx, gy - 14, 22, 8, PLASTER[2]); for (let q = 0; q < 6; q++) B.hline(hx - 2 + q, hx + 23 - q, gy - 15 - q, KAWARA[q % 2 ? 2 : 3]); } }
      if (pick < 0.4) { // cyclist on the levee path
        const cx = X + 90; B.ellipse(cx, gy - 3, 3, 3, BLACK); B.ellipse(cx + 10, gy - 3, 3, 3, BLACK); B.line(cx, gy - 3, cx + 5, gy - 8, pk('#3a8ad8')); B.line(cx + 5, gy - 8, cx + 10, gy - 3, pk('#3a8ad8'));
        B.rect(cx + 3, gy - 15, 4, 6, pk('#e8e4d8')); B.ellipse(cx + 5, gy - 17, 2, 2, pk('#c88a5a')); B.rect(cx + 3, gy - 20, 5, 2, pk('#f0d040'));
      }
      const rd = sprite(pick < 0.5 ? 'reeds_0' : 'reeds_1'); if (rd) B.blit(rd, X + 40, gy + 22 - rd.h);
      if (pick > 0.7) { // fisherman on the bank, rod over the water
        const fx = X + 60; B.rect(fx, gy + 10, 4, 6, pk('#5a6a4a')); B.ellipse(fx + 2, gy + 8, 2, 2, pk('#c8a070')); B.ellipse(fx + 2, gy + 6, 4, 1.2, pk('#e8e0c8'));
        B.line(fx + 3, gy + 10, fx + 30, gy - 2, pk('#3a3030')); B.line(fx + 30, gy - 2, fx + 32, gy + 24, pk('#c8c8c8'));
      }
      return;
    }
    if (seg === 'sea') {
      if (r < 0.55) blackPine(B, X, gy - 6, i);
      if (pick > 0.86) { // a vermilion torii standing out in the water
        const tx = X + 40, ty = gy + 40;
        for (const px of [tx, tx + 20]) B.rect(px, ty - 34, 3, 34, pk('#d84a32'));
        B.rect(tx - 6, ty - 40, 33, 3, BLACK); B.rect(tx - 4, ty - 37, 29, 3, pk('#d84a32')); B.rect(tx - 2, ty - 30, 25, 2, pk('#d84a32'));
        for (let x = tx - 4; x < tx + 26; x++) B.set(x, ty, (x % 3) ? WHITE : water(0.5, 0.5, 0.1));
      } else if (pick > 0.6) { // a little fishing boat at the shore
        const bx = X + 50, by = gy + 16; B.poly([[bx, by - 6], [bx + 30, by - 6], [bx + 26, by], [bx + 4, by]], WHITE); B.hline(bx + 4, bx + 26, by - 1, pk('#3a6ab0'));
        B.rect(bx + 18, by - 12, 7, 6, WHITE); B.rect(bx + 19, by - 11, 5, 2, pk('#4a5a74')); B.vline(bx + 8, by - 20, by - 6, pk('#6a6a70'));
        for (let k = 0; k < 4; k++) B.set(bx + 8 + k * 3, by - 18 + k * 3, pk('#e8d040'));
      }
      return;
    }
    if (seg === 'city' || seg === 'station') {
      cityBlock(B, X - 40, gy, i, L);
      return;
    }
    if (seg === 'mountain') {
      // cedar stands: straight dark trunks under a dark canopy, a stream with a little bridge
      for (let k = 0; k < 7; k++) {
        const tx = X - 50 + k * 18 + Math.floor(h1(i * 7 + k, 454) * 8);
        B.rect(tx, gy - 70, 3, 70, pk('#4a3428')); B.vline(tx, gy - 70, gy - 1, pk('#6a4a36'));
        for (let q = 0; q < 6; q++) { const cy = gy - 96 + q * 6, w = 4 + q * 2; B.ellipse(tx + 1, cy, w, 4, (xx, yy, nx, ny) => rampPick(CEDARN, 0.6 - ny * 0.5 - nx * 0.2 + (h2(xx, yy, 455) - 0.5) * 0.3, xx, yy)); }
      }
      return;
    }
    // ---- country, village and tea country
    if (seg === 'tea' && r < 0.45) {
      for (let k = 0; k < 3; k++) { // tall frost fans over the near rows
        const fx = X + k * 46; B.rect(fx, gy - 52, 2, 52, pk('#9a9aa0')); B.rect(fx - 3, gy - 56, 8, 5, pk('#c8ccd4')); B.ellipse(fx + 7, gy - 54, 1.5, 5, pk('#6a6e78'));
      }
      const tb = sprite('teabush_ripe'); if (tb) for (let k = 0; k < 5; k++) B.blit(tb, X - 20 + k * 30, gy - tb.h + 1);
      return;
    }
    const dense = seg === 'village';
    let x = X;
    if (r < (dense ? 0.55 : 0.32)) x += kominka(B, x, gy, i * 3 + 1) + 10;
    else if (r < (dense ? 0.7 : 0.44)) { x += kura(B, x, gy, i * 3 + 2) + 6; if (pick < 0.6) x += kominka(B, x, gy, i * 3 + 7) + 8; }
    else if (r < 0.54) x += modernHouse(B, x, gy, i * 3 + 3) + 10;
    else if (r < 0.6) x += shed(B, x, gy, i * 3 + 4) + 8;
    else if (r < 0.66) x += shrine(B, x, gy, i, L) + 10;
    else if (r < 0.72) { const b0 = sprite('bamboo_0'), b1 = sprite('bamboo_1'); for (let k = 0; k < 6; k++) { const s2 = k % 2 ? b1 : b0; if (s2) B.blit(s2, x + k * 13, gy - s2.h + 2, { flip: k % 3 === 0 }); } x += 90; }
    else if (r < 0.78) { fumikiri(B, x + 10, gy, 0); x += 60; }
    else if (r < 0.84) { x += busStop(B, x, gy) + 6; x += vending(B, x, gy, 2 + Math.floor(pick * 2)) + 6; }
    else { const t = sprite(pick < 0.5 ? 'camphor_1' : 'sakura_small'); if (t) B.blit(t, x, gy - t.h + 2); x += 70; }
    // garden trees and hedges between houses
    if (pick < 0.5 && r < 0.6) { const t = sprite(pick < 0.2 ? 'pine_0' : pick < 0.35 ? 'camphor_0' : 'momiji_0'); if (t) B.blit(t, x - 6, gy - t.h + 2, { dark: pick < 0.35 ? 0 : 0 }); }
    if (h1(i, 456) < 0.5) { const hy = sprite(['hydrangea_blue', 'hydrangea_pink', 'hydrangea_violet'][i % 3]); if (hy) for (let k = 0; k < 3; k++) B.blit(hy, X - 30 + k * 20, gy - hy.h + 3); }
    if (h1(i, 457) < 0.25) jizo(B, X - 34, gy);
    // the paddies in front: a farmer, a scarecrow, a heron, a kei truck on the lane
    if (h1(i, 458) < 0.35) farmer(B, X + 20 + Math.floor(h1(i, 459) * 60), gy + 16 + Math.floor(h1(i, 460) * 16));
    if (h1(i, 461) < 0.2) scarecrow(B, X + 70, gy + 26);
    if (h1(i, 462) < 0.3) { const hr = sprite('heron_idle'); if (hr) B.blit(hr, X + 100, gy + 22 - hr.h + Math.floor(h1(i, 463) * 14), { flip: h1(i, 464) < 0.5 }); }
    if (h1(i, 465) < 0.22) keiTruck(B, X + 30, gy + 2, i);
  });
}
const CEDARN = pks(['#16281e', '#1e3626', '#284430', '#34543a']);

// ---- the town by the line (dusk lights come on through the WIN / EMIT codes)
const KANJI = [
  ['111', '010', '111'], ['101', '111', '101'], ['110', '011', '110'], ['111', '101', '111'], ['010', '111', '010'], ['101', '010', '101'],
];
function signGlyphs(B, x, y, n, col, vertical) {
  for (let k = 0; k < n; k++) {
    const g = KANJI[(x * 7 + k * 3 + y) % KANJI.length];
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) if (g[gy][gx] === '1') B.set(x + (vertical ? gx : k * 4 + gx), y + (vertical ? k * 4 + gy : gy), col);
  }
}
function cityBlock(B, X, gy, seed, L) {
  const r = (k) => h1(seed, k);
  let x = X;
  for (let k = 0; k < 3; k++) {
    const kind = h1(seed * 5 + k, 471);
    const w = 34 + Math.floor(h1(seed * 5 + k, 472) * 40);
    if (kind < 0.18) { // a konbini: lit glass front and the stripe fascia
      const S1 = ['#2aa04a', '#e8403a', '#2a6ad8'][seed % 3], S2 = ['#2a6ad8', '#f0a020', '#ffffff'][seed % 3];
      B.rect(x, gy - 26, w, 26, pk('#f0f0ec'));
      B.rect(x, gy - 26, w, 3, pk(S1)); B.rect(x, gy - 23, w, 2, pk(S2)); B.rect(x, gy - 21, w, 1, pk(S1));
      B.rect(x + 2, gy - 18, w - 4, 16, emit('#fff8e8'));
      for (let s = x + 4; s < x + w - 4; s += 5) { B.rect(s, gy - 14, 3, 10, pk('#8a9aa8')); for (let q = 0; q < 3; q++) B.set(s + 1, gy - 13 + q * 3, emit(['#ff8a6a', '#6ab0ff', '#ffe060'][(s + q) % 3])); }
      B.rect(x + w - 10, gy - 18, 6, 16, pk('#c8ccd0'));
      signGlyphs(B, x + 6, gy - 25, 4, emit('#ffffff'), false);
    } else if (kind < 0.55) { // an apartment block with balconies, laundry, lit windows
      const fl = 3 + Math.floor(h1(seed * 5 + k, 473) * 4), fh = 13;
      const wall = pks(['#d8d4c8', '#c4c8cc', '#e0d4c0', '#b8b4ac'])[k % 4];
      B.rect(x, gy - fl * fh - 3, w, fl * fh + 3, wall);
      B.vline(x + w - 1, gy - fl * fh - 3, gy - 1, darkenPacked(wall, 0.3));
      for (let f = 0; f < fl; f++) {
        const fy = gy - (f + 1) * fh;
        for (let u = x + 3; u < x + w - 6; u += 10) {
          B.rect(u, fy + 2, 7, 7, h2(u, fy, 474) > 0.4 ? win(h2(u, fy, 475) > 0.6 ? '#ffd890' : '#fff0d0') : pk('#3e4658'));
          B.rect(u - 1, fy + 8, 9, 3, pk('#a8acb0')); B.hline(u - 1, u + 7, fy + 8, pk('#d0d4d8'));
          if (h2(u, fy, 476) > 0.7) B.rect(u + 1, fy + 5, 3, 4, pk(['#ff9ab0', '#8ab8ff', '#ffffff'][(u + f) % 3]));
        }
      }
      B.rect(x + 2, gy - fl * fh - 7, 6, 4, pk('#9a9ea4')); // water tank
    } else if (kind < 0.75) { // a shotengai shop row with vertical neon signs and paper lanterns
      B.rect(x, gy - 30, w, 30, pk('#c8b8a0'));
      for (let s = 0; s < w; s += 14) {
        const sc = ['#ff4a6a', '#ffd040', '#40d0ff', '#ff8a30', '#7aff8a'][(s + seed) % 5];
        B.rect(x + s + 1, gy - 12, 12, 12, win('#ffe0a8')); B.rect(x + s + 1, gy - 14, 12, 2, pk(['#c83a32', '#2a5aa8', '#3a8a4a'][(s >> 1) % 3]));
        B.rect(x + s + 4, gy - 29, 5, 14, emit(sc)); signGlyphs(B, x + s + 5, gy - 28, 3, pk('#ffffff'), true);
        if ((s / 14) % 2 === 0) { B.ellipse(x + s + 2, gy - 9, 2, 3, emit('#ff5a3a')); }
      }
    } else { // a pachinko parlour / game centre: loud lights
      B.rect(x, gy - 34, w, 34, pk('#2a2a3a'));
      for (let y = gy - 32; y < gy - 18; y++) for (let u = x + 1; u < x + w - 1; u++) if ((u + y) % 3 === 0) B.set(u, y, emit(['#ff3a8a', '#ffd03a', '#3ad0ff'][((u >> 2) + y) % 3]));
      signGlyphs(B, x + 4, gy - 30, Math.floor((w - 8) / 4), emit('#ffffff'), false);
      B.rect(x + 3, gy - 14, w - 6, 14, emit('#fff0d0'));
    }
    // streetlight in front
    const lx = x + w - 3; B.vline(lx, gy - 40, gy - 1, pk('#6a6e78')); B.hline(lx - 6, lx, gy - 40, pk('#6a6e78')); B.rect(lx - 8, gy - 40, 4, 2, emit('#fff4c8'));
    x += w + 2;
  }
  // a car on the street with headlights
  if (r(1) < 0.5) { const cx = X + 30, cy = gy + 9; B.rect(cx, cy - 6, 26, 6, pk(['#e8e8e4', '#c83a32', '#2a3a5a'][seed % 3])); B.rect(cx + 5, cy - 10, 14, 4, pk('#6a7a90')); B.ellipse(cx + 5, cy, 2.5, 2.5, BLACK); B.ellipse(cx + 21, cy, 2.5, 2.5, BLACK); B.set(cx + 25, cy - 4, emit('#fff4c0')); B.set(cx, cy - 4, emit('#ff3a2a')); }
}
