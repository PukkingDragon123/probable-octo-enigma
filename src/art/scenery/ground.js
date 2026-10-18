// Ground layers of the train-window scenery: hand-painted Japanese country in
// early summer, after photos from the Shinkansen and the local lines.
//   paintFarGround: the plain in the middle distance (fields, hamlets, copses).
//   paintNear: the houses, gardens, trees and fields right by the line.
//
// Painted at about a centimetre a texel so every house gets its wavy kawara
// courses and onigawara, aluminium sashes with curtains and sky in the glass,
// rain streaks, gutters and air-con units; trees are built from leaf clusters
// lit from the upper right with gaps of sky; rice is drawn blade by blade.
// No open water anywhere: the paddies are grown thick and green.
//
// Everything that stands up is an object (B.obj): the ink pass gives it a thin
// outline in a darker shade of its own colour (never flat black).
// Rows: y = 0 at the top; L.hz is the horizon row, L.gy the near ground line.
import { pk, pks, h1, h2, n1, n2, rgba, win, emit, darkenPacked } from './core.js';

const segOf = (L, X) => { const s = L.segAt(X); return s.k > 0.5 ? s.b : s.a; };
const clamp01 = (v) => Math.max(0, Math.min(0.9999, v));
const pick = (R, v) => R[Math.floor(clamp01(v) * R.length)];
const dark = (c, k) => darkenPacked(c, k);
// toward a warm light (highlights lean yellow, shadows lean violet)
function lit(c, k) {
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  return rgba(Math.round(r + (255 - r) * k), Math.round(g + (246 - g) * k), Math.round(b + (220 - b) * k), c >>> 24);
}

// ---------------------------------------------------------------- palettes (hue-shifted ramps, dark -> light)
const RICE = pks(['#1e4a26', '#28602c', '#337632', '#408a38', '#4f9e3e', '#63b048', '#7cc254', '#9ad464']);
const RICE_FAR = pks(['#3a7034', '#46823a', '#529240', '#62a248', '#74b252']);
const AZE = pks(['#3a5e2a', '#4a7232', '#5c873a', '#71a046', '#8ab852', '#a6cc62']);
const SOIL = pks(['#4a3428', '#5c4230', '#6e523a', '#806246', '#937352']);
const CABB = pks(['#3e6e3a', '#528846', '#68a052', '#82b862', '#a2cc7c', '#c4e09c']);
const TEA = pks(['#22462a', '#2c5a2e', '#386e34', '#46843c', '#589a44', '#70b050']);
const LEAF = pks(['#163824', '#1e4a2a', '#275e30', '#327236', '#40863c', '#529a44', '#68ae4e', '#84c25a']);
const LEAF_Y = pks(['#2c4a22', '#3a6028', '#4c7830', '#62903a', '#7aa844', '#96bc52', '#b2d064']);
const KAKI = pks(['#14321e', '#1c4426', '#24582c', '#2e6c32', '#3a8038', '#4a9440']);
const HEDGE = pks(['#173a1e', '#1f4c24', '#285e2a', '#327030', '#3e8436', '#4e983e', '#64ac48']);
const CEDAR = pks(['#0f2a22', '#153628', '#1c442e', '#245234', '#2e623c', '#3a7244']);
const BAMBOO = pks(['#3e6a2a', '#4e8032', '#62963a', '#78aa44', '#92bc52', '#aed064']);
const BARK = pks(['#2a1e1c', '#3a2a24', '#4c382c', '#5e4836', '#72583f']);
const KAWARA = pks(['#22283a', '#2c3446', '#374055', '#444e65', '#535e76', '#656f88', '#7b859c', '#939cb0']);
const SLATE = pks(['#1a1b22', '#23252d', '#2d3039', '#383b45', '#454953', '#545862']);
const BROWNR = pks(['#34201c', '#432a22', '#53342a', '#644033', '#784e3e', '#8c5e4a']);
const TIN = {
  red: pks(['#5a2422', '#72302a', '#8a3c32', '#a04a3a', '#b45c46', '#c47056']),
  blue: pks(['#22344e', '#2c4260', '#385272', '#466484', '#567694', '#6c8aa6']),
  green: pks(['#1e3c32', '#28503e', '#33624a', '#427656', '#548a64', '#6a9e76']),
};
const WOOD = pks(['#24170f', '#332117', '#432d1f', '#553a28', '#684a33', '#7d5c40', '#937050']);
const PLASTER = pks(['#bfb6a2', '#cfc6b2', '#ddd5c2', '#e8e1d0', '#f2ecde', '#faf6ec']);
const STONE = pks(['#56565a', '#68676a', '#7c7a7a', '#908d88', '#a5a198', '#bab5aa']);
const CONC = pks(['#6e6e6c', '#80807c', '#92918c', '#a4a39c', '#b6b4ac', '#c8c6be']);
const ASPH = pks(['#45464c', '#4f5056', '#5a5b60', '#65666a', '#717276']);
const ALU = pks(['#7a808a', '#959ba4', '#afb4bc', '#c8ccd2', '#dfe2e6']);
const SIDINGS = [
  ['#c9c0ac', '#d9d0bc', '#e7dfcc', '#f1ead9'], ['#c8c8c4', '#dadad6', '#e8e8e4', '#f4f4f0'],
  ['#b8a888', '#c9b998', '#d8c9a8', '#e6d8b8'], ['#a9afb4', '#bcc2c6', '#ccd2d5', '#dce1e3'],
  ['#a88e74', '#ba9f84', '#cab094', '#d8c0a4'], ['#c4b6a6', '#d4c6b6', '#e2d6c6', '#eee4d6'],
  ['#9eaa9a', '#b0bcac', '#c0ccbc', '#d0dbcc'],
].map((p) => pks(p));
const CURTAIN = ['#e8dcc0', '#d6e2ea', '#f0d6d6', '#e2e8cc', '#f2e6b0'];
const NIGHT = ['#ffd890', '#ffe6b0', '#ffcf80', '#fff0d0'];
const WHITE = pk('#f4f2ec'), BLACK = pk('#1e1a22');
const FLOWERS = ['#f26aa0', '#ffffff', '#ffd23a', '#c86ae0', '#ff8a5a'];

// ================================================================= building parts
// an aluminium sash window: frame, glass holding the sky (lighter at the top,
// a diagonal glint), sometimes curtains or a lit room; mullion for sliders
function sash(B, x, y, w, h, seed, o = {}) {
  const r = (k) => h1(seed, k);
  B.rect(x - 1, y - 1, w + 2, h + 2, ALU[1]);
  B.hline(x - 1, x + w, y - 1, ALU[3]);
  const lit0 = r(1) < (o.lit ?? 0.35);
  const glowC = win(NIGHT[Math.floor(r(2) * 4)]);
  const cur = r(3) < 0.55 ? pk(CURTAIN[Math.floor(r(4) * CURTAIN.length)]) : 0;
  const cw = cur ? 1 + Math.floor(r(5) * Math.max(1, w / 3)) : 0;
  const g0 = r(6) * 6, treeLine = 0.42 + r(7) * 0.2;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    let c;
    if (cur && (xx < cw || xx >= w - cw)) c = (xx & 1) ? dark(cur, 0.12) : cur;
    else {
      // the sky and a line of trees in the glass, then the dim room
      const t = yy / Math.max(1, h - 1), tl = treeLine + Math.sin((x + xx) * 0.7) * 0.06;
      c = t < tl - 0.25 ? pk('#a4bcd6') : t < tl ? pk('#86a2c0') : t < tl + 0.18 ? pk('#4e6a6a') : pk('#34405a');
      if (((xx + yy + g0) | 0) % 10 === 0 || ((xx + yy + g0 + 1) | 0) % 10 === 0) c = pk('#d4e2f0');
    }
    if (lit0 && !(cur && (xx < cw || xx >= w - cw))) c = glowC;
    else if (lit0) c = win('#ffe0a8');
    B.set(x + xx, y + yy, c);
  }
  if (o.mullion !== false && w >= 7) B.vline(x + (w >> 1), y, y + h - 1, ALU[2]);
  if (o.bars) for (let xx = 1; xx < w; xx += 3) B.vline(x + xx, y, y + h - 1, ALU[3]);
  if (o.sill !== false) { B.hline(x - 2, x + w + 1, y + h + 1, ALU[3]); B.hline(x - 1, x + w, y + h + 2, ALU[0]); }
}
// rain streaks down a wall from under a sill
function streaks(B, x, y, w, len, seed) {
  for (let k = 0; k < w; k += 2) {
    if (h1(seed + k, 31) < 0.45) continue;
    const l = 2 + Math.floor(h1(seed + k, 32) * len);
    for (let q = 0; q < l; q++) { const c = B.get(x + k, y + q); if (c && (c >>> 24) === 255) B.set(x + k, y + q, dark(c, 0.1 - q * 0.01)); }
  }
}
// a darker band just under an eave (the shadow it throws)
function eaveShadow(B, X0, X1, y, n = 3) {
  for (let x = X0; x <= X1; x++) for (let k = 0; k < n; k++) { const c = B.get(x, y + k); if (c && (c >>> 24) >= 247) B.set(x, y + k, dark(c, 0.36 - k * 0.1)); }
}
// a hipped roof of kawara seen from its long side. Real tiles line up in
// columns down the slope: each column a rounded crest (lit) and a trough
// (shaded), each course ending in a rounded lip with a dark gap under the next.
// Hip ridges run down both ends, the ridge is stacked noshi tiles with
// onigawara, and moss gathers in the troughs of the lower courses.
function kawaraRoof(B, xL, xR, yE, rh, inset, R, seed, o = {}) {
  const CH = 4, TW = 5;
  for (let k = 0; k < rh; k++) {
    const y = yE - k, t = k / Math.max(1, rh - 1);
    const a = Math.round(xL + inset * t), b = Math.round(xR - inset * t);
    const kk = k % CH, ci = Math.floor(k / CH);
    for (let x = a; x <= b; x++) {
      const tc = ((x % TW) + TW) % TW, tile = Math.floor(x / TW);
      // across a tile: trough, rising flank, crest, crest, falling flank
      let v = [0.22, 0.48, 0.74, 0.66, 0.4][tc];
      // along it: the lip at the bottom of a course is brightest, the overlap under the next course darkest
      v += kk === 0 ? 0.1 : kk === CH - 1 ? -0.2 : 0;
      v += t * 0.06 + (h2(tile, ci, seed) - 0.5) * 0.1;
      let c = pick(R, v);
      if (k < rh * 0.45 && tc === 0 && kk !== CH - 1 && n2(x / 6, y / 3, seed + 7) > 0.62) c = h2(x, y, seed) > 0.5 ? pk('#5e7a40') : pk('#748e4a');
      B.set(x, y, c);
    }
    // the hip ridges running down each end: a band of ridge tiles
    for (const [ex, dir] of [[a, 1], [b, -1]]) {
      B.set(ex, y, R[dir > 0 ? 1 : 3]); B.set(ex + dir, y, R[dir > 0 ? 2 : 6]); B.set(ex + 2 * dir, y, R[dir > 0 ? 3 : 5]);
      if (k % 3 === 0) B.set(ex + dir, y, R[dir > 0 ? 4 : 7]);
    }
  }
  // the eave: rounded end tiles (a lit disc on each crest) over a dark fascia
  const a0 = Math.round(xL), b0 = Math.round(xR);
  for (let x = a0; x <= b0; x++) {
    const tc = ((x % TW) + TW) % TW;
    B.set(x, yE + 1, tc === 2 || tc === 3 ? R[6] : tc === 0 ? R[1] : R[3]);
    B.set(x, yE + 2, tc === 2 ? R[4] : R[0]);
  }
  // the ridge: cap, two noshi bands, white mortar line; onigawara at both ends
  const ra = Math.round(xL + inset) - 2, rb = Math.round(xR - inset) + 2, ry = yE - rh;
  B.rect(ra, ry - 5, rb - ra + 1, 6, R[2]);
  B.hline(ra, rb, ry - 5, R[7]); B.hline(ra, rb, ry - 4, R[5]);
  B.hline(ra + 1, rb - 1, ry - 2, R[1]);
  for (let x = ra; x <= rb; x += 3) B.set(x, ry - 3, R[4]);
  if (o.noshi !== false) B.hline(ra + 2, rb - 2, ry, PLASTER[3]);
  for (const ex of [ra - 2, rb - 3]) {
    B.rect(ex, ry - 10, 6, 11, R[1]); B.rect(ex + 1, ry - 9, 4, 8, R[3]);
    B.rect(ex + 2, ry - 7, 2, 3, R[0]); B.hline(ex, ex + 5, ry - 10, R[6]);
    B.set(ex + (ex < ra ? -1 : 6), ry - 11, R[4]); B.set(ex + (ex < ra ? -1 : 6), ry - 10, R[3]); // the upturned horn
  }
}
// a tin roof (an old thatch hip covered in corrugated iron): vertical seams, rust runs
function tinRoof(B, xL, xR, yE, rh, inset, T, seed) {
  for (let k = 0; k < rh; k++) {
    const y = yE - k, t = k / Math.max(1, rh - 1);
    const a = Math.round(xL + inset * t), b = Math.round(xR - inset * t);
    for (let x = a; x <= b; x++) {
      let v = ((x % 3) === 0 ? 0.32 : (x % 3) === 1 ? 0.72 : 0.56) + t * 0.12;
      if (x - a < 3) v -= 0.25; else if (b - x < 3) v += 0.15;
      let c = pick(T, v);
      if (n2(x / 2, y / 9, seed + 3) > 0.7 && (x % 3) !== 1) c = (y & 1) ? pk('#8a4a2a') : pk('#9a5a34');
      B.set(x, y, c);
    }
  }
  const a0 = Math.round(xL), b0 = Math.round(xR);
  B.hline(a0, b0, yE + 1, T[1]); B.hline(a0, b0, yE + 2, T[0]);
  const ra = Math.round(xL + inset) - 1, rb = Math.round(xR - inset) + 1, ry = yE - rh;
  B.rect(ra, ry - 2, rb - ra + 1, 3, T[4]); B.hline(ra, rb, ry - 2, T[5]);
}
// gutter along an eave and a downspout down one corner
function gutter(B, X0, X1, y, gy, side) {
  B.hline(X0, X1, y, ALU[2]); B.hline(X0, X1, y + 1, ALU[0]);
  const dx = side > 0 ? X1 - 1 : X0 + 1;
  B.vline(dx, y + 1, gy - 2, ALU[2]); B.vline(dx + 1, y + 1, gy - 2, ALU[0]);
  for (let yy = y + 6; yy < gy - 3; yy += 9) B.hline(dx - 1, dx + 2, yy, ALU[1]);
}
// the outdoor unit of an air conditioner with its duct up the wall
function acUnit(B, x, gy, seed) {
  B.rect(x, gy - 13, 16, 12, ALU[3]); B.hline(x, x + 15, gy - 13, ALU[4]); B.vline(x + 15, gy - 13, gy - 2, ALU[1]);
  B.ellipse(x + 6, gy - 7, 4.2, 4.2, (xx, yy, nx, ny) => ((xx + yy) & 1 ? ALU[0] : ALU[1]));
  B.set(x + 6, gy - 7, ALU[3]);
  for (let k = 0; k < 4; k++) B.hline(x + 12, x + 14, gy - 11 + k * 2, ALU[1]);
  B.rect(x + 1, gy - 2, 2, 2, ALU[0]); B.rect(x + 13, gy - 2, 2, 2, ALU[0]);
  B.rect(x + 13, gy - 26, 3, 13, pk('#d8ccb0')); B.hline(x + 13, x + 15, gy - 26, pk('#e8dec4'));
}
// a balcony rail with laundry or a futon airing over it
function balcony(B, x, y, w, seed) {
  const r = (k) => h1(seed, k);
  B.rect(x, y, w, 3, CONC[3]); B.hline(x, x + w - 1, y + 2, CONC[1]);
  for (let xx = x; xx < x + w; xx++) for (let yy = y - 9; yy < y; yy++) {
    if (yy === y - 9) B.set(xx, yy, ALU[4]);
    else if ((xx - x) % 3 === 0) B.set(xx, yy, ALU[2]);
  }
  B.hline(x, x + w - 1, y - 8, ALU[1]);
  if (r(1) < 0.55) { // a futon folded over the rail
    const fx = x + 3 + Math.floor(r(2) * (w - 24)), fw = 18, fc = pk(['#f2eee6', '#f6c8d4', '#c8daf6', '#f6e6a0'][Math.floor(r(3) * 4)]);
    for (let xx = 0; xx < fw; xx++) B.col(fx + xx, y - 12, y + 3, (X, yy) => ((xx + (yy >> 1)) % 6 === 0 ? dark(fc, 0.15) : yy === y - 12 ? lit(fc, 0.3) : fc));
  }
  if (r(4) < 0.7) { // shirts and towels on hangers
    B.hline(x + 2, x + w - 3, y - 20, ALU[1]);
    for (let k = 0; k < Math.floor(w / 10); k++) {
      const lx = x + 4 + k * 9, c = pk(['#ffffff', '#ff8a8a', '#8ab4ff', '#ffe070', '#7ac87a', '#f0a0d0'][(seed + k) % 6]);
      B.set(lx + 3, y - 19, ALU[0]);
      if ((seed + k) % 2) { B.rect(lx, y - 18, 7, 2, c); B.rect(lx + 1, y - 16, 5, 5, c); B.vline(lx + 5, y - 16, y - 12, dark(c, 0.2)); }
      else { B.rect(lx + 1, y - 18, 5, 8, c); B.hline(lx + 1, lx + 5, y - 15, dark(c, 0.15)); }
    }
  }
}

// ---------------------------------------------------------------- near buildings (1 texel ~ 0.9 cm)
// the everyday two-storey house
function house2(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 60 + Math.floor(r(1) * 22), f1 = 22, f2 = 20, top = gy - f1 - f2;
  const S = SIDINGS[Math.floor(r(2) * SIDINGS.length)];
  const R = r(3) < 0.55 ? KAWARA : r(3) < 0.78 ? SLATE : BROWNR;
  B.obj(seed * 13 + 1);
  // walls: boards with joints, grime low down, a lit right corner
  const jx = [X + 14 + Math.floor(r(4) * 12), X + 38 + Math.floor(r(5) * 14)];
  for (let x = X; x < X + w; x++) B.col(x, top, gy - 1, (xx, y) => {
    const fy = y < gy - f1 ? y - top : y - (gy - f1);
    let v = 2;
    if ((gy - y) % 4 === 0) v = 1;
    if (jx.includes(x)) v = 1;
    if (x >= X + w - 2) v = 3;
    else if (x <= X + 1) v = 1;
    let c = S[v];
    if (fy > (y < gy - f1 ? f2 : f1) - 5 && n2(x / 4, y / 2, seed) > 0.55) c = dark(c, 0.07);
    return c;
  });
  // footing with vents
  B.rect(X - 1, gy - 4, w + 2, 4, CONC[2]); B.hline(X - 1, X + w, gy - 4, CONC[4]);
  for (let vx = X + 8; vx < X + w - 6; vx += 22) B.rect(vx, gy - 3, 5, 2, CONC[0]);
  // 1F: a big sliding glass door, a small window with a lattice, the front door under a canopy
  sash(B, X + 5, gy - 18, 18, 13, seed * 3 + 1, { lit: 0.4 });
  streaks(B, X + 4, gy - 3, 20, 2, seed);
  const dX = X + 28 + Math.floor(r(6) * 6);
  B.rect(dX - 1, gy - 20, 12, 17, ALU[1]); B.rect(dX, gy - 19, 10, 15, pk('#5a4636'));
  for (let yy = gy - 17; yy < gy - 6; yy += 3) B.hline(dX + 2, dX + 7, yy, pk('#c8bca8'));
  B.set(dX + 8, gy - 12, ALU[4]);
  B.rect(dX - 3, gy - 23, 16, 2, R[3]); B.hline(dX - 3, dX + 12, gy - 21, R[0]);
  B.set(dX - 2, gy - 18, emit('#ffe6a0')); B.rect(dX + 11, gy - 16, 3, 4, pk('#e8e0cc')); // lamp, nameplate
  sash(B, X + w - 16, gy - 17, 10, 8, seed * 3 + 2, { bars: true, mullion: false });
  // the skirt roof between the floors
  const sy = gy - f1;
  for (let k = 0; k < 5; k++) {
    const a = X - 5 + k, b = X + w + 4 - k;
    for (let x = a; x <= b; x++) B.set(x, sy - k, k === 4 ? R[5] : pick(R, [0.32, 0.5, 0.7, 0.48][(x + k) % 4]));
  }
  for (let x = X - 5; x <= X + w + 4; x++) B.set(x, sy + 1, (x - X) % 4 === 1 ? R[6] : R[2]);
  eaveShadow(B, X, X + w - 1, sy + 2, 3);
  // 2F windows (some with shutter boxes) and a balcony
  const nw = w > 70 ? 3 : 2, sp = Math.floor((w - 8) / nw);
  for (let k = 0; k < nw; k++) {
    const wx = X + 6 + k * sp, wy = top + 6;
    sash(B, wx, wy, sp - 10, 10, seed * 5 + k);
    if (r(10 + k) < 0.5) { B.rect(wx - 2, wy - 5, sp - 6, 3, S[1]); B.hline(wx - 2, wx + sp - 9, wy - 5, S[3]); }
    streaks(B, wx, wy + 13, sp - 10, 3, seed + k * 7);
  }
  if (r(7) < 0.6) balcony(B, X + 3, sy - 3, Math.min(w - 6, 34), seed * 7);
  // the main roof, a gutter and its downspout
  const rh = 15 + Math.floor(r(8) * 4);
  kawaraRoof(B, X - 6, X + w + 5, top - 1, rh, rh * 1.15, R, seed, { noshi: R === KAWARA });
  eaveShadow(B, X, X + w - 1, top, 3);
  gutter(B, X - 5, X + w + 4, top, gy, r(9) < 0.5 ? 1 : -1);
  if (r(11) < 0.75) { B.obj(seed * 13 + 2); acUnit(B, X + w - 20, gy, seed); }
  B.obj(null);
  return w;
}
// the old farmhouse: a tall storey under a huge hip-and-gable roof (tiles, or
// the old thatch sheathed in red / blue tin), dark timber, shoji and glass
// doors behind the engawa, a stone footing
function minka(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 84 + Math.floor(r(1) * 28), wh = 26, yW = gy - wh;
  const tin = r(2) < 0.35, R = tin ? TIN[['red', 'blue', 'green'][Math.floor(r(3) * 3)]] : KAWARA;
  B.obj(seed * 13 + 3);
  // stone footing
  for (let x = X - 2; x < X + w + 2; x++) B.col(x, gy - 4, gy - 1, (xx, y) => ((x + (y & 1) * 3) % 7 === 0 || y === gy - 4 ? STONE[1] : pick(STONE, 0.5 + (h2(x >> 1, y, seed) - 0.5) * 0.4)));
  // bays between posts: glass doors, shoji, or plaster over boards
  const bays = Math.max(5, Math.round(w / 14)), bw = w / bays;
  for (let b = 0; b < bays; b++) {
    const x0 = Math.round(X + b * bw), x1 = Math.round(X + (b + 1) * bw) - 1;
    const kind = h1(seed * 31 + b, 381);
    for (let x = x0; x <= x1; x++) B.col(x, yW, gy - 5, (xx, y) => {
      if (x === x0 || x === x0 + 1) return x === x0 ? WOOD[1] : WOOD[3];
      if (y < yW + 3) return y === yW ? WOOD[4] : WOOD[2]; // the beam over the openings
      const u = x - x0;
      if (kind < 0.38) { // glass doors: wooden frames, sky in the glass
        if (u % 6 === 2 || y === gy - 14 || y === yW + 3) return WOOD[4];
        const t = (y - yW) / wh;
        return (u + y) % 11 === 0 ? pk('#a8c0d8') : t < 0.45 ? pk('#6e88a6') : pk('#3e5270');
      }
      if (kind < 0.72) { // shoji: a paper grid, warm at night
        if (u % 4 === 2 || (y - yW) % 5 === 3) return pk('#b8aa8a');
        return win('#fff2cc');
      }
      return y > gy - 13 ? WOOD[2 + ((x >> 1) & 1)] : (h2(x, y, seed) > 0.93 ? PLASTER[1] : PLASTER[4]);
    });
  }
  B.vline(X + w - 1, yW, gy - 5, WOOD[1]);
  // the engawa veranda
  B.rect(X + 2, gy - 8, w - 4, 3, WOOD[5]); B.hline(X + 2, X + w - 3, gy - 8, WOOD[6]); B.hline(X + 2, X + w - 3, gy - 5, WOOD[1]);
  for (let x = X + 8; x < X + w - 6; x += 18) B.vline(x, gy - 5, gy - 1, WOOD[1]);
  // the big roof
  const rh = 24 + Math.floor(r(4) * 6);
  if (tin) tinRoof(B, X - 8, X + w + 7, yW - 1, rh, rh * 1.0, R, seed);
  else kawaraRoof(B, X - 8, X + w + 7, yW - 1, rh, rh * 1.05, R, seed);
  eaveShadow(B, X, X + w - 1, yW, 4);
  // the gable in the top of the hip: white plaster, a timber lattice, a vent
  const gx = X + w / 2, gyT = yW - rh + 1;
  for (let k = 0; k < 9; k++) {
    const hw = Math.round(k * 1.6) + 1;
    for (let x = Math.round(gx) - hw; x <= Math.round(gx) + hw; x++) {
      const edge = Math.abs(x - gx) >= hw - 1;
      B.set(x, gyT + k, edge ? R[1] : (x - Math.round(gx)) % 4 === 0 || k % 4 === 3 ? WOOD[2] : PLASTER[4]);
    }
  }
  B.rect(Math.round(gx) - 2, gyT + 4, 4, 3, WOOD[0]);
  B.obj(null);
  return w;
}
// the white storehouse: thick plaster with stains, black namako tiles with
// raised white joints below, a heavy shuttered window, a family crest
function kura(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 38 + Math.floor(r(1) * 10), wh = 40, yW = gy - wh;
  B.obj(seed * 13 + 5);
  for (let x = X; x < X + w; x++) B.col(x, yW, gy - 1, (xx, y) => {
    if (y > gy - 14) {
      const u = (x - X + (y - gy) + 400) % 6, v = (x - X - (y - gy) + 400) % 6;
      if (u === 0 || v === 0) return (u === 0 && v === 0) ? PLASTER[5] : PLASTER[3];
      return (x + y) & 1 ? pk('#32363f') : pk('#3a3e48');
    }
    let c = x >= X + w - 2 ? PLASTER[2] : x <= X + 1 ? PLASTER[5] : PLASTER[4];
    if (y - yW < 3) c = PLASTER[1];
    if (n2(x / 3, y / 8, seed) > 0.68) c = dark(c, 0.07);
    return c;
  });
  const wx = X + Math.floor(w / 2) - 5, wy = yW + 9;
  B.rect(wx - 2, wy - 2, 14, 13, PLASTER[1]); B.rect(wx - 1, wy - 1, 12, 11, BLACK); B.rect(wx, wy, 10, 9, pk('#45414d'));
  for (let k = 1; k < 10; k += 3) B.vline(wx + k, wy, wy + 8, pk('#6e6a76'));
  kawaraRoof(B, X - 5, X + w + 4, yW - 1, 9, 6, KAWARA, seed, { noshi: true });
  eaveShadow(B, X, X + w - 1, yW, 3);
  if (r(2) < 0.6) { B.ellipse(X + w / 2, yW - 15, 4, 4, BLACK); B.ellipse(X + w / 2, yW - 15, 2.4, 2.4, PLASTER[5]); }
  B.obj(null);
  return w;
}
// a corrugated farm shed: ribbed walls with rust runs, a dark open front with a tractor
function shed(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 44 + Math.floor(r(1) * 18), wh = 28;
  const T = TIN[['red', 'blue', 'green'][Math.floor(r(2) * 3)]];
  B.obj(seed * 13 + 6);
  for (let x = X; x < X + w; x++) B.col(x, gy - wh, gy - 1, (xx, y) => {
    if (x > X + 7 && x < X + w - 8 && y > gy - wh + 7) return y > gy - 4 ? pk('#2e2824') : pk('#1e1a1e');
    if (n2(x / 2, y / 7, seed + 1) > 0.7 && (x & 1)) return (y & 1) ? pk('#8a5a3a') : pk('#7a4a30');
    return pick(ALU, [0.25, 0.55, 0.8][x % 3]);
  });
  if (r(3) < 0.75) { // a little orange tractor inside
    const tx = X + 14;
    B.rect(tx, gy - 12, 16, 7, pk('#e0602a')); B.hline(tx, tx + 15, gy - 12, pk('#f08a4a'));
    B.rect(tx + 10, gy - 18, 6, 6, pk('#3a3a40')); B.rect(tx + 11, gy - 17, 4, 3, pk('#7a96b4'));
    B.ellipse(tx + 3, gy - 4, 4, 4, BLACK); B.ellipse(tx + 13, gy - 3, 3, 3, BLACK); B.set(tx + 3, gy - 4, ALU[2]);
  }
  for (let k = 0; k < 6; k++) { const a = X - 3 + k, b = X + w + 2 - k; for (let x = a; x <= b; x++) B.set(x, gy - wh - 1 - k, pick(T, ((x % 3) === 1 ? 0.7 : 0.45) + k * 0.04)); }
  B.hline(X - 3, X + w + 2, gy - wh, T[0]);
  B.obj(null);
  return w;
}
// white vinyl greenhouses: arched tunnels, ribs through the film, crops inside, ends rolled up
function greenhouse(B, X, gy, n, seed) {
  const hw = 15, h = 26;
  for (let k = 0; k < n; k++) {
    B.obj(seed * 13 + 7 + k * 101);
    const x0 = X + k * (hw * 2 + 2);
    for (let x = 0; x < hw * 2; x++) {
      const t = (x + 0.5 - hw) / hw, top = Math.round(gy - 1 - h * Math.sqrt(Math.max(0, 1 - t * t * 0.92)));
      B.col(x0 + x, top, gy - 1, (xx, y) => {
        if (y === top) return WHITE;
        const d = gy - y;
        if (d < 9) { // crops seen through the film
          const row = (x + (d >> 1)) % 4;
          return row === 0 ? pk('#9cbc90') : row === 2 ? pk('#86aa7e') : pk('#b4cca8');
        }
        if (x % 6 === 0) return pk('#aebcc0');
        if (t > 0.35 && y < top + 4) return pk('#ffffff');
        return t < -0.4 ? pk('#c4d0d4') : t > 0.3 ? pk('#eef4f4') : pk('#dce6e8');
      });
    }
    B.hline(x0 + 2, x0 + hw * 2 - 3, gy - 9, pk('#c8d2d4')); // the rolled-up side
  }
  B.obj(null);
  return n * (hw * 2 + 2);
}

// ---------------------------------------------------------------- trees and plants (organic, leaf by leaf)
// a crown of leaf clusters: each cluster an irregular blob, lit from the upper
// right, with leaf marks, darker deep inside, sky showing through near the rim
function crown(B, cx, cy, rx, ry, R, seed, o = {}) {
  const n = o.n ?? Math.max(5, Math.round((rx * ry) / 40));
  const blobs = [];
  for (let k = 0; k < n; k++) {
    const a = h1(seed, k * 3) * Math.PI * 2, d = Math.sqrt(h1(seed, k * 3 + 1)) * 0.78;
    const br = (0.3 + h1(seed, k * 3 + 2) * 0.22) * Math.min(rx, ry * 1.25);
    blobs.push([cx + Math.cos(a) * rx * d * 0.85, cy + Math.sin(a) * ry * d * 0.8, br]);
  }
  blobs.sort((p, q) => (p[1] - q[1]) || (p[0] - q[0]));
  const fill = (bx, by, br, depth) => {
    const x0 = Math.floor(bx - br - 2), x1 = Math.ceil(bx + br + 2), y0 = Math.floor(by - br - 2), y1 = Math.ceil(by + br + 2);
    for (let y = y0; y <= y1; y++) for (let x = Math.max(x0, B.x0); x <= Math.min(x1, B.x1 - 1); x++) {
      const nx = (x + 0.5 - bx) / br, ny = (y + 0.5 - by) / (br * 0.88);
      const wob = (n2(x / 2.2, y / 2.2, seed + 11) - 0.5) * 0.55;
      const d = nx * nx + ny * ny;
      if (d > 1 + wob) continue;
      if (d > 0.7 + wob && h2(x, y, seed + 13) > 0.8) continue; // gaps of sky at the rim
      let v = 0.56 + nx * 0.22 - ny * 0.34 - d * 0.18 - depth;
      const leaf = h2(x >> 1, y, seed + 17);
      if (leaf > 0.82) v += 0.14; else if (leaf < 0.14) v -= 0.14;
      if (o.fruit && h2(x, y, seed + 19) > 0.992 && ny > -0.4) { B.set(x, y, o.fruit); continue; }
      B.set(x, y, pick(R, v));
    }
  };
  // the dark mass inside first, then the clusters over it
  fill(cx, cy + ry * 0.1, Math.min(rx, ry) * 0.85, 0.28);
  for (const [bx, by, br] of blobs) fill(bx, by, br, 0);
}
function trunk(B, X, gy, h, seed, wTop = 2) {
  for (let y = gy - h; y < gy; y++) {
    const t = (y - (gy - h)) / h, hw = wTop + t * t * 2.5;
    const sway = Math.sin(t * 2.5 + seed) * 1.2 * (1 - t);
    for (let x = Math.round(X - hw + sway); x <= Math.round(X + hw + sway); x++) B.set(x, y, pick(BARK, 0.25 + (x - (X + sway - hw)) / (hw * 2) * 0.6 + (h2(x, y >> 1, seed) - 0.5) * 0.2));
  }
}
function broadleaf(B, X, gy, seed, o = {}) {
  const r = (k) => h1(seed, k);
  const h = o.h ?? (46 + Math.floor(r(1) * 24)), rx = o.rx ?? (17 + r(2) * 12);
  B.obj(seed * 13 + 8);
  trunk(B, X, gy, Math.round(h * 0.55), seed);
  for (const s of [-1, 1]) B.line(X, gy - h * 0.42, X + s * rx * 0.45, gy - h * 0.62, BARK[2]);
  crown(B, X, gy - h * 0.66, rx, h * 0.36, o.R ?? LEAF, seed, o);
  B.obj(null);
  return Math.round(rx * 2);
}
// a garden pine: a crooked trunk and flat cloud-pads of needles
function gardenPine(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const h = 36 + Math.floor(r(1) * 14);
  B.obj(seed * 13 + 9);
  let x = X;
  const pts = [];
  for (let y = gy - 1; y > gy - h; y--) { x += Math.sin((gy - y) * 0.2 + seed) * 0.5; pts.push([x, y]); B.rect(Math.round(x) - 1, y, 3, 1, (y & 3) ? BARK[2] : BARK[1]); B.set(Math.round(x) + 1, y, BARK[3]); }
  for (let k = 0; k < 4; k++) {
    const [px, py] = pts[Math.min(pts.length - 1, Math.floor(pts.length * (0.4 + k * 0.18)))];
    const side = k % 2 ? 1 : -1, pw = 9 + r(3 + k) * 7, ox = px + side * (4 + r(10 + k) * 6);
    B.line(px, py, ox, py - 1, BARK[2]);
    B.ellipse(ox, py - 2, pw, 3.6, (xx, yy, nx, ny) => {
      const needle = h2(xx, yy, seed + k) > 0.7 ? 0.12 : 0;
      return pick(CEDAR, 0.62 - ny * 0.42 + nx * 0.14 + needle);
    });
  }
  B.obj(null);
  return 28;
}
// a stand of sugi cedar: tall spires of drooping branch tiers
function cedars(B, X, gy, n, seed, hmin = 80) {
  for (let k = 0; k < n; k++) {
    const r = (q) => h1(seed * 7 + k, q);
    const tx = X + k * 15 + Math.floor(r(1) * 6), h = hmin + Math.floor(r(2) * 28);
    B.obj(seed * 13 + 10 + k * 37);
    B.rect(tx - 1, gy - h * 0.3, 3, h * 0.3, BARK[3]); B.vline(tx - 1, gy - h * 0.3, gy - 1, BARK[1]);
    for (let y = gy - h; y < gy - h * 0.2; y++) {
      const t = (y - (gy - h)) / (h * 0.8), tier = (y - (gy - h)) % 7;
      const hw = Math.max(0.6, t * 10 + (tier / 7) * 2.6 - 1);
      for (let x = Math.round(tx - hw); x <= Math.round(tx + hw); x++) {
        const u = (x - tx) / Math.max(1, hw);
        let v = 0.5 + u * 0.3 - (tier < 2 ? 0.2 : 0) + (h2(x, y, seed + k) - 0.5) * 0.2;
        B.set(x, y, pick(CEDAR, v));
      }
    }
  }
  B.obj(null);
  return n * 15 + 8;
}
// a bamboo grove: pale jointed culms and sprays of leaves bowing over
function bamboo(B, X, gy, w, seed) {
  B.obj(seed * 13 + 11);
  const n = Math.floor(w / 5);
  for (let k = 0; k < n; k++) {
    const sx = X + k * 5 + Math.floor(h1(seed + k, 1) * 4), h = 76 + Math.floor(h1(seed + k, 2) * 24), lean = (k % 2 ? 2.5 : -1.5);
    for (let y = gy - h; y < gy; y++) {
      const x = sx + Math.round((gy - y) / h * lean);
      const node = (gy - y) % 11 === 0;
      B.set(x, y, node ? BAMBOO[1] : BAMBOO[3]); B.set(x + 1, y, node ? BAMBOO[0] : BAMBOO[2]);
    }
  }
  for (let k = 0; k < n * 2.2; k++) {
    const cx = X + h1(seed, 50 + k) * w, cy = gy - 56 - h1(seed, 80 + k) * 34, rr = 7 + h1(seed, 110 + k) * 6;
    for (let q = 0; q < 14; q++) { // single leaves fanning out of the spray
      const a = (q / 14) * Math.PI * 2, l = rr * (0.6 + h1(seed + k, q) * 0.5);
      const ex = cx + Math.cos(a) * l, ey = cy + Math.sin(a) * l * 0.5 + l * 0.3;
      B.line(cx, cy, ex, ey, pick(BAMBOO, 0.4 + Math.cos(a) * 0.25 - Math.sin(a) * 0.2));
    }
    B.ellipse(cx, cy, rr * 0.7, rr * 0.4, (x, y, nx, ny) => pick(BAMBOO, 0.55 + nx * 0.2 - ny * 0.3 + (h2(x, y, seed) - 0.5) * 0.2));
  }
  B.obj(null);
  return w;
}
// a clipped hedge along the front of a property: leaf texture, a lit top
function hedge(B, X, gy, w, seed, h = 12) {
  B.obj(seed * 13 + 12);
  for (let x = X; x < X + w; x++) {
    const bump = Math.round(n1(x / 5, seed) * 2);
    B.col(x, gy - h - bump, gy - 1, (xx, y) => {
      const d = y - (gy - h - bump);
      let v = d < 2 ? 0.86 : d < 4 ? 0.7 : 0.48 - d * 0.012;
      const leaf = h2(x >> 1, y, seed);
      if (leaf > 0.8) v += 0.12; else if (leaf < 0.15) v -= 0.14;
      return pick(HEDGE, v);
    });
  }
  B.obj(null);
  return w;
}
// round clipped azaleas, some still in flower
function shrubs(B, X, gy, n, seed) {
  for (let k = 0; k < n; k++) {
    B.obj(seed * 13 + 14 + k * 17);
    const rr = 6 + h1(seed, k) * 3, cx = X + k * 15;
    crown(B, cx, gy - rr, rr * 1.15, rr, HEDGE, seed + k * 5, { n: 3 });
    if (h1(seed, k + 9) < 0.5) { const fc = pk(FLOWERS[Math.floor(h1(seed, k + 11) * 2)]); for (let q = 0; q < 7; q++) B.set(Math.round(cx + (h1(seed, q + 30 + k) - 0.5) * rr * 1.8), Math.round(gy - rr - (h1(seed, q + 40 + k) - 0.3) * rr * 1.2), fc); }
  }
  B.obj(null);
  return n * 15;
}

// ---------------------------------------------------------------- street life
function utilityPole(B, X, gy) {
  B.obj(X * 3 + 1);
  const top = gy - 104;
  for (let y = top; y < gy; y++) { B.set(X - 2, y, CONC[1]); B.set(X - 1, y, CONC[3]); B.set(X, y, CONC[4]); B.set(X + 1, y, CONC[2]); B.set(X + 2, y, CONC[0]); }
  for (let y = top; y < gy; y += 13) B.hline(X - 2, X + 2, y, CONC[1]);
  B.rect(X - 15, top + 6, 31, 2, CONC[1]); B.hline(X - 15, X + 15, top + 6, CONC[4]);
  B.rect(X - 11, top + 18, 23, 2, CONC[1]);
  for (const dx of [-13, -6, 6, 13]) { B.rect(X + dx - 1, top + 3, 3, 3, WHITE); B.set(X + dx, top + 3, pk('#d0d4dc')); }
  B.rect(X + 3, top + 24, 9, 13, ALU[2]); B.vline(X + 3, top + 24, top + 36, ALU[3]); B.vline(X + 11, top + 24, top + 36, ALU[0]);
  for (let y = top + 26; y < top + 36; y += 2) B.hline(X + 4, X + 10, y, ALU[1]);
  B.rect(X - 3, gy - 18, 7, 15, pk('#f0d040')); for (let y = gy - 18; y < gy - 3; y += 3) B.hline(X - 3, X + 3, y, BLACK);
  B.rect(X - 3, gy - 44, 7, 8, pk('#2a6ad8')); B.hline(X - 2, X + 2, gy - 41, WHITE);
  B.obj(null);
}
const POLE_SP = 330;
function poleWires(B, L, gy) {
  const has = (i) => { const sg = segOf(L, i * POLE_SP); return (sg === 'country' || sg === 'village' || sg === 'farm' || sg === 'valley' || sg === 'tea') && n1(i / 4, 420) > 0.5; };
  B.slots(POLE_SP, 20, 421, (i, sx) => {
    if (!has(i)) return;
    utilityPole(B, sx, gy);
    if (!has(i + 1)) return;
    const ex = sx + POLE_SP, top = gy - 104;
    B.obj(sx * 3 + 2, 'none');
    for (const [dy, sag] of [[4, 14], [19, 18]]) for (let x = Math.max(sx + 3, B.x0); x < Math.min(ex - 2, B.x1); x++) { const t = (x - sx) / POLE_SP; B.set(x, top + dy + Math.round(Math.sin(t * Math.PI) * sag), pk('#2a2830')); }
    if (h1(i, 422) > 0.7) for (let k = 0; k < 2 + Math.floor(h1(i, 423) * 3); k++) { // sparrows on the line
      B.obj(sx * 3 + 3 + k);
      const x = sx + 70 + k * 14 + Math.floor(h1(i * 5 + k, 424) * 8), t = (x - sx) / POLE_SP, y = top + 4 + Math.round(Math.sin(t * Math.PI) * 14);
      B.ellipse(x, y - 3, 3, 2.4, pk('#7a5a40')); B.set(x + 2, y - 4, pk('#3a2a20')); B.set(x - 3, y - 2, pk('#5a4030')); B.set(x + 1, y - 2, pk('#e8dcc8'));
    }
    B.obj(null);
  });
}
function vending(B, X, gy, n) {
  const fronts = ['#e8403a', '#2a6ad8', '#f4f4f0', '#3aa860', '#f0b020'];
  for (let k = 0; k < n; k++) {
    B.obj(X * 7 + k);
    const x = X + k * 14, f = pk(fronts[(X + k) % fronts.length]);
    B.rect(x, gy - 26, 13, 26, f); B.vline(x + 12, gy - 26, gy - 1, dark(f, 0.25)); B.hline(x, x + 12, gy - 26, lit(f, 0.3));
    B.rect(x + 1, gy - 24, 11, 11, emit('#f4f8ff'));
    for (let row = 0; row < 3; row++) for (let c = 0; c < 5; c++) B.rect(x + 2 + c * 2, gy - 23 + row * 4, 1, 3, emit(['#ff6a5a', '#5ab0ff', '#ffd050', '#7ae07a', '#ffffff'][(c + row + k) % 5]));
    B.rect(x + 2, gy - 10, 8, 2, BLACK); B.rect(x + 2, gy - 5, 9, 3, pk('#1a1a20')); B.set(x + 10, gy - 12, emit('#ff5a4a'));
  }
  B.obj(null);
  return n * 14;
}
function busStop(B, X, gy) {
  B.obj(X * 7 + 5);
  B.vline(X, gy - 34, gy - 1, ALU[1]); B.vline(X + 1, gy - 34, gy - 1, ALU[3]);
  B.ellipse(X + 0.5, gy - 38, 5, 5, pk('#2a6ad8')); B.ellipse(X + 0.5, gy - 38, 3, 3, WHITE); B.rect(X - 1, gy - 39, 3, 2, pk('#2a6ad8'));
  B.rect(X - 4, gy - 2, 10, 2, CONC[2]);
  B.obj(X * 7 + 6);
  B.rect(X + 8, gy - 10, 22, 3, pk('#6a8ac0')); B.hline(X + 8, X + 29, gy - 10, pk('#8aa8d8'));
  B.vline(X + 10, gy - 7, gy - 1, WOOD[1]); B.vline(X + 27, gy - 7, gy - 1, WOOD[1]);
  B.obj(null);
  return 32;
}
function jizo(B, X, gy) {
  B.obj(X * 7 + 9);
  B.rect(X - 3, gy - 3, 34, 3, STONE[2]); B.hline(X - 3, X + 30, gy - 3, STONE[4]);
  for (let k = 0; k < 3; k++) {
    B.obj(X * 7 + 10 + k);
    const x = X + k * 10;
    B.ellipse(x + 4, gy - 9, 4, 6, (xx, yy, nx, ny) => pick(STONE, 0.55 + nx * 0.25 - ny * 0.15));
    B.ellipse(x + 4, gy - 18, 3.4, 3.6, (xx, yy, nx, ny) => pick(STONE, 0.6 + nx * 0.25 - ny * 0.3));
    B.set(x + 3, gy - 18, STONE[1]); B.set(x + 5, gy - 18, STONE[1]);
    B.rect(x + 1, gy - 14, 7, 4, pk('#d83a32')); B.hline(x + 1, x + 7, gy - 14, pk('#f05a4a')); B.set(x + 4, gy - 11, pk('#b02a24'));
    B.ellipse(x + 4, gy - 21, 3.2, 1.6, pk('#d83a32'));
  }
  B.obj(null);
  return 34;
}
function keiTruck(B, X, gy, seed) {
  B.obj(seed * 13 + 15);
  const W = pk('#f2f2ee'), Wd = pk('#c8c8c4'), Wl = pk('#ffffff');
  B.rect(X, gy - 12, 40, 5, W); B.hline(X, X + 39, gy - 12, Wl); B.hline(X, X + 39, gy - 8, Wd);
  B.rect(X + 27, gy - 22, 13, 11, W); B.hline(X + 27, X + 38, gy - 22, Wl);
  B.rect(X + 29, gy - 20, 9, 6, pk('#3e5270')); B.line(X + 30, gy - 15, X + 34, gy - 20, pk('#a8c0d8'));
  B.set(X + 39, gy - 10, emit('#ffe8a0')); B.vline(X + 27, gy - 20, gy - 12, Wd);
  B.hline(X + 1, X + 26, gy - 16, Wd); B.vline(X + 1, gy - 16, gy - 12, Wd); B.vline(X + 26, gy - 16, gy - 12, Wd);
  if (h1(seed, 1) < 0.5) for (let k = 0; k < 4; k++) { B.rect(X + 3 + k * 6, gy - 18, 5, 5, pk('#c8a060')); B.hline(X + 3 + k * 6, X + 7 + k * 6, gy - 18, pk(['#e85a3a', '#7ac04a', '#f0a030', '#8a5ac8'][k])); }
  else B.ellipse(X + 13, gy - 15, 11, 4, (xx, yy, nx, ny) => (h2(xx, yy, seed) > 0.6 ? pk('#e8d080') : pk('#d0b060')));
  for (const wx of [X + 7, X + 31]) { B.ellipse(wx, gy - 4, 4.2, 4.2, BLACK); B.ellipse(wx, gy - 4, 1.8, 1.8, ALU[2]); }
  B.obj(null);
  return 42;
}
function farmer(B, X, y, seed) {
  B.obj(seed * 13 + 16);
  B.ellipse(X + 3, y - 15, 7, 2, pk('#e0c070')); B.ellipse(X + 3, y - 16.5, 3, 1.5, pk('#c8a050'));
  B.rect(X, y - 13, 7, 7, pk('#3a5a9a')); B.rect(X + 6, y - 10, 4, 3, pk('#3a5a9a')); B.set(X + 9, y - 8, pk('#e8c8a0'));
  B.rect(X + 1, y - 6, 2, 6, pk('#2a3a6a')); B.rect(X + 4, y - 6, 2, 6, pk('#2a3a6a'));
  B.obj(null);
}
function scarecrow(B, X, gy, seed) {
  B.obj(seed * 13 + 17);
  B.vline(X, gy - 30, gy - 1, WOOD[3]); B.hline(X - 10, X + 10, gy - 21, WOOD[3]);
  B.rect(X - 7, gy - 22, 15, 9, pk('#4a6aa8')); B.rect(X - 4, gy - 13, 9, 4, pk('#4a6aa8')); B.hline(X - 7, X + 7, gy - 22, pk('#6a8ac8'));
  B.ellipse(X, gy - 27, 4.4, 4.4, pk('#f0e8d8')); B.set(X - 2, gy - 27, BLACK); B.set(X + 2, gy - 27, BLACK); B.hline(X - 1, X + 1, gy - 25, pk('#d83a3a'));
  B.ellipse(X, gy - 31, 8, 2, pk('#e0c070'));
  B.obj(null);
}
function shrine(B, X, gy, seed) {
  const RED = pks(['#7a2620', '#a2342a', '#c84634', '#e0623e', '#f08050']);
  const w = cedars(B, X + 30, gy, 4, seed, 76);
  B.obj(seed * 13 + 19);
  const tx = X;
  for (const px of [tx, tx + 26]) { B.rect(px, gy - 40, 4, 40, RED[2]); B.vline(px, gy - 40, gy - 1, RED[1]); B.vline(px + 3, gy - 40, gy - 1, RED[3]); B.rect(px - 1, gy - 4, 6, 4, BLACK); }
  B.rect(tx - 7, gy - 46, 44, 3, BLACK); B.hline(tx - 8, tx + 37, gy - 47, pk('#3a3a44'));
  B.rect(tx - 5, gy - 43, 40, 3, RED[2]); B.hline(tx - 5, tx + 34, gy - 43, RED[4]);
  B.rect(tx - 2, gy - 34, 34, 3, RED[2]); B.hline(tx - 2, tx + 31, gy - 34, RED[3]);
  B.rect(tx + 11, gy - 42, 8, 8, BLACK); B.rect(tx + 12, gy - 41, 6, 6, pk('#c8a040'));
  for (let x = tx + 4; x < tx + 26; x++) B.set(x, gy - 30 + Math.round(Math.sin((x - tx - 4) / 22 * Math.PI) * 2), pk('#d8c890'));
  for (const zx of [tx + 10, tx + 18]) { B.vline(zx, gy - 28, gy - 22, WHITE); B.set(zx + 1, gy - 25, WHITE); }
  B.obj(seed * 13 + 20);
  const hx = X + 44;
  B.rect(hx, gy - 18, 20, 16, WOOD[4]); B.rect(hx + 3, gy - 15, 14, 10, WOOD[2]); B.rect(hx + 8, gy - 13, 4, 4, emit('#ffd070'));
  for (let k = 0; k < 6; k++) B.hline(hx - 3 + k, hx + 22 - k, gy - 19 - k, pick(KAWARA, 0.4 + (k & 1) * 0.25));
  B.rect(hx - 2, gy - 2, 24, 2, STONE[3]);
  B.obj(null);
  return Math.max(w + 30, 70);
}
function fumikiri(B, X, gy) {
  B.obj(X * 7 + 20);
  for (let y = gy - 44; y < gy; y++) { const c = ((y >> 2) & 1) ? pk('#f0c020') : BLACK; B.set(X, y, c); B.set(X + 1, y, c); B.set(X + 2, y, ((y >> 2) & 1) ? pk('#c89a10') : BLACK); }
  B.line(X - 8, gy - 52, X + 10, gy - 42, WHITE); B.line(X - 8, gy - 42, X + 10, gy - 52, WHITE);
  B.line(X - 8, gy - 53, X + 10, gy - 43, BLACK); B.line(X - 8, gy - 43, X + 10, gy - 53, BLACK);
  for (const lx of [X - 7, X + 6]) { B.ellipse(lx + 1.5, gy - 36, 3, 3, BLACK); B.ellipse(lx + 1.5, gy - 36, 2, 2, emit('#ff3a2a')); }
  B.obj(X * 7 + 21);
  for (let k = 0; k < 34; k++) { const c = ((k >> 2) & 1) ? pk('#f0c020') : BLACK; B.set(X + 4 + Math.round(k * 0.3), gy - 22 - k, c); B.set(X + 5 + Math.round(k * 0.3), gy - 22 - k, c); }
  B.obj(null);
  B.rect(X - 40, gy - 1, 94, 2, ASPH[2]);
  return 56;
}
function frostFan(B, X, gy) {
  B.obj(X * 7 + 30);
  B.rect(X, gy - 64, 3, 64, ALU[1]); B.vline(X + 2, gy - 64, gy - 1, ALU[3]);
  B.rect(X - 5, gy - 69, 13, 6, ALU[3]); B.hline(X - 5, X + 7, gy - 69, ALU[4]);
  B.ellipse(X + 10, gy - 66, 2, 7, (xx, yy, nx, ny) => (Math.abs(ny) < 0.2 ? ALU[0] : ALU[2]));
  B.obj(null);
}

// ---------------------------------------------------------------- the near fields
const NEAR_ROWS = (gy, H) => { const out = []; let y = gy + 6, s = 8; while (y < H) { const h = Math.round(s); out.push([y, h]); y += h; s *= 1.38; } return out; };
function fieldKind(seg, row, cell) {
  const r = h2(row, cell, 301);
  if (seg === 'tea') return r < 0.8 ? 'tea' : 'rice';
  if (seg === 'farm') return r < 0.35 ? 'cabbage' : r < 0.6 ? 'negi' : r < 0.85 ? 'rice' : 'soil';
  if (seg === 'mountain') return 'grass';
  return r < 0.9 ? 'rice' : r < 0.96 ? 'cabbage' : 'negi';
}
// one texel of a field. Rice: dense clumps of blades in faint planting rows,
// each paddy its own green (planted on a different day), lit blade tips; the
// aze ridge a lighter grassy lip with tufts. Cabbages: staggered round heads
// on dark soil. Leeks: upright stalks, white at the foot. Tea: clipped rows.
function fieldPx(kind, x, y, y0, h, cell) {
  const d = y - y0;
  if (d === 0) return pick(AZE, 0.78 + (h2(x, y, 480) - 0.5) * 0.35);
  if (d === 1) return pick(AZE, h2(x >> 1, y, 481) > 0.72 ? 0.82 : 0.5);
  if (d === 2) return pick(AZE, h2(x, y, 482) > 0.8 ? 0.45 : 0.25);
  const t = (d - 3) / Math.max(1, h - 3);
  switch (kind) {
    case 'rice': {
      const tone = (h1(cell, 446) - 0.5) * 0.22;
      const rowH = h > 14 ? 4 : 3, row = (d - 3) % rowH;
      let v = 0.5 + tone - t * 0.08 + (n2(x / 2.3, y / 1.5, 447) - 0.5) * 0.42;
      if (row === rowH - 1) v -= 0.12;
      const tip = h2(x, y, 448);
      if (tip > 0.88 && row < rowH - 1) v += 0.28; else if (tip < 0.06) v -= 0.2;
      return pick(RICE, v);
    }
    case 'tea': { const k = (d - 3) % 7; return k === 0 ? TEA[5] : k === 1 ? TEA[4] : k >= 5 ? TEA[0] : pick(TEA, 0.5 + (n2(x / 2, y / 1.5, 449) - 0.5) * 0.4); }
    case 'cabbage': {
      const rowI = Math.floor((d - 3) / 5), k = (d - 3) % 5, cx = (x + (rowI & 1) * 4) % 8;
      const dx = cx - 3.5, dy = (k - 2) * 1.5, rr = Math.hypot(dx, dy) / 3.3;
      if (rr < 1) {
        const v = 0.86 - rr * 0.45 + (dx > 0 ? 0.06 : -0.04) - (dy > 0 ? 0.18 : 0);
        return rr > 0.75 ? pick(CABB, 0.22) : pick(CABB, v);
      }
      return h2(x, y, 450) > 0.85 ? SOIL[3] : SOIL[1];
    }
    case 'negi': {
      const k = (d - 3) % 5;
      if (k === 4) return SOIL[(x & 1) + 1];
      if (k === 3) return x % 2 ? PLASTER[4] : PLASTER[2];
      return x % 2 ? pick(CABB, 0.75 - k * 0.12) : pick(CABB, 0.5 - k * 0.1);
    }
    case 'grass': return pick(AZE, 0.45 + (n2(x / 3, y / 2, 441) - 0.5) * 0.5 + (h2(x, y >> 1, 442) > 0.86 ? 0.22 : 0));
    default: return (d & 1) ? SOIL[1] : SOIL[2];
  }
}

// ---------------------------------------------------------------- the near-layer painter
const NEAR_SP = 190;
export function paintNear(B, L) {
  const gy = L.gy, H = B.H;
  B.obj(null);
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      B.col(X, gy - 1, H - 1, (x, y) => {
        const d = y - gy;
        if (d < 3) return d === 0 ? CONC[4] : CONC[2];
        if (d < 22) return d === 11 && x % 20 < 11 ? pk('#e8e4d8') : pick(ASPH, 0.4 + (h2(x >> 1, y >> 1, 436) - 0.5) * 0.4);
        if (d < 25) return CONC[1];
        return pick(AZE, 0.35 + (n2(x / 8, y / 4, 437) - 0.5) * 0.4);
      });
      continue;
    }
    // a farm lane (gravel in the hills, asphalt with a worn white edge line elsewhere), then fields
    const gravel = seg === 'mountain' || seg === 'valley';
    B.col(X, gy - 2, gy + 5, (x, y) => {
      const d = y - gy;
      if (d < 0) return h2(x, y, 470) > 0.5 ? pick(AZE, 0.7) : pick(AZE, 0.5);
      if (gravel) return h2(x, y, 438) > 0.82 ? pk('#aaa08c') : h2(x, y, 439) > 0.8 ? pk('#6e6252') : pk(d < 2 ? '#8e8270' : '#7e7262');
      if (d === 1 && h2(x >> 2, 0, 471) > 0.2) return pk('#e8e6de');
      return pick(ASPH, 0.45 + (h2(x, y, 439) - 0.5) * 0.5);
    });
    let rowI = 0;
    for (const [y0, h] of NEAR_ROWS(gy, H)) {
      rowI++;
      const fw = 140 + rowI * 90, off = Math.floor(h1(rowI, 439) * fw), cell = Math.floor((X + off) / fw);
      const kind = fieldKind(seg, rowI, cell);
      const edge = (X + off) % fw < 3;
      B.col(X, y0, y0 + h - 1, (x, yy) => (edge && yy - y0 > 2 ? pick(AZE, (x + off) % fw === 1 ? 0.75 : 0.4) : fieldPx(kind, x, yy, y0, h, cell * 31 + rowI)));
    }
  }
  poleWires(B, L, gy);
  // ---- buildings, trees and life, placed in slots
  B.slots(NEAR_SP, 230, 451, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 452) * 40);
    const seg = segOf(L, X);
    const pk2 = h1(i, 453), s = i * 3;
    if (seg === 'city' || seg === 'station') { cityBlock(B, X - 50, gy, i); return; }
    if (seg === 'mountain') {
      if (r < 0.75) cedars(B, X - 50, gy, 8 + Math.floor(pk2 * 5), s, 92);
      else if (r < 0.9) { cedars(B, X - 60, gy, 3, s, 84); minka(B, X, gy, s + 1); }
      return;
    }
    if (seg === 'tea') {
      if (r < 0.4) { for (let k = 0; k < 3; k++) frostFan(B, X + k * 60, gy + 10); }
      else if (r < 0.7) { const w = house2(B, X, gy, s + 1); hedge(B, X - 10, gy + 2, w + 20, s); broadleaf(B, X + w + 14, gy, s + 2); }
      else if (r < 0.8) cedars(B, X, gy, 4, s);
      return;
    }
    if (seg === 'farm') {
      if (r < 0.45) greenhouse(B, X, gy + 2, 2 + Math.floor(pk2 * 3), s);
      else if (r < 0.6) { const w = shed(B, X, gy, s + 1); keiTruck(B, X + w + 10, gy + 2, s + 2); }
      else if (r < 0.72) { const w = minka(B, X, gy, s + 3); broadleaf(B, X + w + 18, gy, s + 4, { R: KAKI }); }
      else if (r < 0.8) scarecrow(B, X + 30, gy + 22, s);
      if (h1(i, 458) < 0.4) farmer(B, X + 50 + Math.floor(h1(i, 459) * 80), gy + 20 + Math.floor(h1(i, 460) * 12), s + 5);
      return;
    }
    // country, village and the valley
    const dense = seg === 'village', valley = seg === 'valley';
    let x = X;
    const hasHouse = r < (dense ? 0.72 : valley ? 0.45 : 0.55);
    if (hasHouse) {
      const kind = h1(i, 470);
      // behind the house: a stand of bamboo or cedar, or a big tree
      if (pk2 < 0.25) bamboo(B, x + 14, gy, 50, s + 6);
      else if (pk2 < 0.45 && !dense) cedars(B, x + 16, gy, 3, s + 7, 76);
      else if (pk2 < 0.6) broadleaf(B, x + 50, gy, s + 21, { h: 70, rx: 30, R: LEAF_Y });
      let w;
      if (kind < (valley ? 0.6 : 0.3)) w = minka(B, x, gy, s + 1);
      else w = house2(B, x, gy, s + 2);
      if (h1(i, 471) < 0.3) { x += w + 6; w = kura(B, x, gy, s + 3); }
      x += w;
      // the garden: a pine, a persimmon, clipped shrubs; a hedge along the lane
      const g = h1(i, 472);
      if (g < 0.35) x += gardenPine(B, x + 16, gy, s + 4) + 10;
      else if (g < 0.6) x += broadleaf(B, x + 20, gy, s + 5, { R: KAKI }) + 12;
      if (h1(i, 473) < 0.6) hedge(B, X - 6, gy + 2, x - X + 12, s + 8, 10);
      else shrubs(B, X + 4, gy + 2, 4, s + 9);
    } else if (r < 0.55) greenhouse(B, x, gy + 2, 2 + Math.floor(pk2 * 2), s);
    else if (r < 0.66) { broadleaf(B, x + 18, gy, s + 10, { h: 64 + Math.floor(pk2 * 16), rx: 26 }); broadleaf(B, x + 60, gy, s + 11, { R: LEAF_Y }); }
    else if (r < 0.72) shrine(B, x, gy, s + 12);
    else if (r < 0.77) { const w = shed(B, x, gy, s + 13); keiTruck(B, x + w + 6, gy + 2, s + 14); }
    else if (r < 0.81) { x += busStop(B, x, gy); vending(B, x + 6, gy, 2); }
    else if (r < 0.84 && !valley) fumikiri(B, x + 16, gy);
    else if (r < 0.9) bamboo(B, x, gy, 64, s + 15);
    if (h1(i, 457) < 0.05) jizo(B, X - 44, gy);
    if (h1(i, 458) < 0.25) farmer(B, X + 30 + Math.floor(h1(i, 459) * 90), gy + 20 + Math.floor(h1(i, 460) * 14), s + 16);
    if (h1(i, 461) < 0.12) scarecrow(B, X + 110, gy + 26, s + 17);
    if (h1(i, 465) < 0.15 && !hasHouse) keiTruck(B, X + 50, gy + 2, s + 19);
  });
}

// ---- the town by the line at dusk (lights through the WIN / EMIT codes)
const KANJI = [['111', '010', '111'], ['101', '111', '101'], ['110', '011', '110'], ['111', '101', '111'], ['010', '111', '010'], ['101', '010', '101']];
function signGlyphs(B, x, y, n, col, vertical) {
  for (let k = 0; k < n; k++) {
    const g = KANJI[(x * 7 + k * 3 + y) % KANJI.length];
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) if (g[gy][gx] === '1') B.set(x + (vertical ? gx : k * 4 + gx), y + (vertical ? k * 4 + gy : gy), col);
  }
}
function cityBlock(B, X, gy, seed) {
  let x = X;
  for (let k = 0; k < 3; k++) {
    const kind = h1(seed * 5 + k, 471);
    const w = 48 + Math.floor(h1(seed * 5 + k, 472) * 44);
    B.obj(seed * 41 + k);
    if (kind < 0.2) { // a konbini: lit glass front and the stripe fascia
      const S1 = ['#2aa04a', '#e8403a', '#2a6ad8'][seed % 3], S2 = ['#2a6ad8', '#f0a020', '#ffffff'][seed % 3];
      B.rect(x, gy - 36, w, 36, pk('#f0f0ec'));
      B.rect(x, gy - 36, w, 3, pk(S1)); B.rect(x, gy - 33, w, 3, pk(S2)); B.rect(x, gy - 30, w, 1, pk(S1));
      B.rect(x + 3, gy - 25, w - 6, 21, win('#fff4dc'));
      for (let s2 = x + 5; s2 < x + w - 6; s2 += 7) { B.rect(s2, gy - 20, 4, 15, pk('#8a9aa8')); for (let q = 0; q < 4; q++) B.rect(s2 + 1, gy - 19 + q * 4, 2, 2, emit(['#ff8a6a', '#6ab0ff', '#ffe060', '#7ae07a'][(s2 + q) % 4])); }
      signGlyphs(B, x + 8, gy - 35, 4, emit('#ffffff'), false);
    } else if (kind < 0.6) { // an apartment block with balconies and lit windows
      const fl = 3 + Math.floor(h1(seed * 5 + k, 473) * 3), fh = 19;
      const S = SIDINGS[k % SIDINGS.length];
      B.rect(x, gy - fl * fh - 4, w, fl * fh + 4, S[2]); B.vline(x + w - 1, gy - fl * fh - 4, gy - 1, S[0]); B.hline(x, x + w - 1, gy - fl * fh - 4, S[3]);
      for (let f = 0; f < fl; f++) {
        const fy = gy - (f + 1) * fh;
        for (let u = x + 4; u < x + w - 12; u += 15) {
          sash(B, u, fy + 3, 10, 9, (u * 7 + f) | 0, { lit: 0.6, sill: false });
          B.rect(u - 2, fy + 13, 14, 4, ALU[2]); B.hline(u - 2, u + 11, fy + 13, ALU[4]);
          if (h2(u, fy, 476) > 0.6) B.rect(u + 1, fy + 8, 5, 6, pk(['#ff9ab0', '#8ab8ff', '#ffffff', '#ffe070'][(u + f) % 4]));
        }
      }
    } else if (kind < 0.82) { // a shop row with vertical neon signs and paper lanterns
      B.rect(x, gy - 40, w, 40, pk('#c8b8a0')); B.hline(x, x + w - 1, gy - 40, pk('#dccdb4'));
      for (let s2 = 0; s2 + 20 <= w; s2 += 20) {
        const sc = ['#ff4a6a', '#ffd040', '#40d0ff', '#ff8a30', '#7aff8a'][(s2 + seed) % 5];
        B.rect(x + s2 + 2, gy - 17, 16, 17, win('#ffe0a8')); B.rect(x + s2 + 1, gy - 20, 18, 3, pk(['#c83a32', '#2a5aa8', '#3a8a4a'][(s2 >> 2) % 3]));
        B.rect(x + s2 + 6, gy - 38, 7, 17, emit(sc)); signGlyphs(B, x + s2 + 8, gy - 37, 3, pk('#ffffff'), true);
        B.ellipse(x + s2 + 3, gy - 14, 2.5, 3.5, emit('#ff5a3a'));
      }
    } else { // a pachinko parlour: loud lights
      B.rect(x, gy - 46, w, 46, pk('#2a2a3a'));
      for (let y = gy - 43; y < gy - 22; y++) for (let u = x + 2; u < x + w - 2; u++) if ((u + y) % 3 === 0) B.set(u, y, emit(['#ff3a8a', '#ffd03a', '#3ad0ff'][((u >> 2) + y) % 3]));
      signGlyphs(B, x + 6, gy - 42, Math.floor((w - 12) / 4), emit('#ffffff'), false);
      B.rect(x + 4, gy - 18, w - 8, 18, win('#ffe8c0')); for (let u = x + 6; u < x + w - 6; u += 6) B.vline(u, gy - 17, gy - 1, pk('#5a4a3a'));
    }
    B.obj(seed * 41 + k + 7);
    const lx = x + w - 4; B.vline(lx, gy - 54, gy - 1, ALU[1]); B.vline(lx + 1, gy - 54, gy - 1, ALU[3]); B.hline(lx - 9, lx, gy - 54, ALU[1]); B.rect(lx - 12, gy - 54, 6, 3, emit('#fff4c8'));
    x += w + 3;
  }
  if (h1(seed, 1) < 0.5) {
    B.obj(seed * 41 + 20);
    const cx = X + 50, cy = gy + 14, c = pk(['#e8e8e4', '#c83a32', '#2a3a5a'][seed % 3]);
    B.rect(cx, cy - 8, 34, 8, c); B.hline(cx, cx + 33, cy - 8, lit(c, 0.3)); B.rect(cx + 7, cy - 13, 19, 5, pk('#5a6a82')); B.line(cx + 9, cy - 9, cx + 13, cy - 13, pk('#a8c0d8'));
    for (const wx of [cx + 6, cx + 27]) B.ellipse(wx, cy, 3.6, 3.6, BLACK);
    B.set(cx + 33, cy - 5, emit('#fff4c0')); B.set(cx, cy - 5, emit('#ff3a2a'));
  }
  B.obj(null);
}

// ================================================================= the far plain
// rows of distant fields (all grown green), hamlets, copses and greenhouses
function plainRows(hz, H) {
  const rows = [];
  let y = hz + 1, s = 1.6;
  while (y < H) { const h = Math.max(1, Math.round(s)); rows.push([y, h]); y += h + 1; s *= 1.32; }
  return rows;
}
function plainField(seg, row, cell) {
  const r = h2(row, cell, 301);
  if (seg === 'tea') return r < 0.75 ? 'tea' : 'rice';
  if (seg === 'farm') return r < 0.4 ? 'veg' : r < 0.85 ? 'rice' : 'soil';
  return r < 0.85 ? 'rice' : r < 0.97 ? 'veg' : 'soil';
}
// a house in the distance: walls, one strip of window, a door, a hipped roof
function farHouse(B, X, base, seed) {
  const r = (k) => h1(seed, k);
  const w = 15 + Math.floor(r(1) * 12), h = 7 + Math.floor(r(2) * 6), rh = 5 + Math.floor(r(3) * 3);
  const S = SIDINGS[Math.floor(r(4) * SIDINGS.length)];
  const R = r(5) < 0.6 ? KAWARA : r(5) < 0.8 ? SLATE : TIN[['red', 'blue', 'green'][Math.floor(r(6) * 3)]];
  B.obj(seed * 17 + 1);
  B.rect(X, base - h, w, h, S[2]); B.vline(X + w - 1, base - h, base - 1, S[3]); B.vline(X, base - h, base - 1, S[1]);
  B.rect(X + 2, base - h + 2, Math.min(6, w - 8), 2, r(9) > 0.5 ? win('#ffd890') : pk('#4a5a74'));
  if (h > 9) B.rect(X + w - 8, base - h + 2, 4, 2, r(10) > 0.5 ? win('#ffe6b0') : pk('#4a5a74'));
  B.rect(X + w - 5, base - 5, 3, 5, WOOD[2]);
  for (let k = 0; k < rh; k++) for (let x = X - 2 + k; x <= X + w + 1 - k; x++) B.set(x, base - h - 1 - k, x - (X - 2 + k) < 2 ? R[2] : (X + w + 1 - k) - x < 2 ? R[6] : pick(R, [0.4, 0.62][(x + k) & 1] + k * 0.04));
  B.hline(X - 2, X + w + 1, base - h, R[1]);
  B.obj(null);
  return w;
}
function farCopse(B, X, base, w, seed) {
  B.obj(seed * 17 + 2);
  crown(B, X + w / 2, base - 9, w / 2, 9, LEAF, seed, { n: Math.max(3, Math.round(w / 7)) });
  B.rect(X + 3, base - 4, w - 6, 4, LEAF[2]);
  B.obj(null);
}
function farGreenhouse(B, X, base, n, seed) {
  for (let k = 0; k < n; k++) {
    B.obj(seed * 17 + 3 + k);
    for (let x = 0; x < 13; x++) { const t = (x - 6) / 6.6, top = Math.round(base - 8 * Math.sqrt(Math.max(0, 1 - t * t))); B.col(X + k * 14 + x, top, base - 1, (xx, y) => (y === top ? WHITE : x % 4 === 0 ? pk('#c4ced2') : t > 0.3 ? pk('#eef2f2') : pk('#dce6e8'))); }
  }
  B.obj(null);
}
export function paintFarGround(B, L) {
  const hz = L.hz, H = B.H;
  const rows = plainRows(hz, H);
  B.obj(null);
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      B.col(X, hz, H - 1, (x, y) => ((y - hz) % 11 === 5 ? ASPH[2] : pick(pks(['#7a7a74', '#8a8880', '#9a968c']), n2(x / 7, y / 3, 328))));
      continue;
    }
    let rowI = 0;
    for (const [y0, h] of rows) {
      rowI++;
      const fw = Math.max(26, Math.round(40 + h * 16)), off = Math.floor(h1(rowI, 329) * fw), cell = Math.floor((X + off) / fw);
      const kind = plainField(seg, rowI, cell);
      B.set(X, y0 - 1, pick(AZE, (X & 3) === 0 ? 0.85 : 0.6));
      B.col(X, y0, y0 + h - 1, (x, y) => {
        if ((X + off) % fw === 0) return AZE[3];
        if (kind === 'tea') return (y - y0) % 2 ? TEA[2] : TEA[4];
        if (kind === 'veg') return (y - y0) & 1 ? SOIL[3] : CABB[2 + (h2(x >> 1, y, 304) > 0.6 ? 1 : 0)];
        if (kind === 'soil') return (y - y0) % 2 ? SOIL[2] : AZE[2];
        return pick(RICE_FAR, 0.5 + ((x + y) % 4 === 0 ? 0.25 : 0) + (n2(x / 14, y / 3, 303) - 0.5) * 0.4);
      });
    }
  }
  B.slots(150, 80, 331, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 332) * 50), seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      for (let k = 0; k < 5; k++) {
        const w = 14 + Math.floor(h1(i * 9 + k, 336) * 16), h = 14 + Math.floor(h1(i * 9 + k, 337) ** 1.6 * 38), x0 = X - 50 + k * 24;
        const S = SIDINGS[Math.floor(h1(i * 9 + k, 338) * SIDINGS.length)];
        B.obj(i * 9 + k);
        B.rect(x0, hz + 4 - h, w, h, S[1]); B.vline(x0 + w - 1, hz + 4 - h, hz + 3, S[0]);
        for (let wy = hz + 7 - h; wy < hz + 1; wy += 4) for (let wx = x0 + 2; wx < x0 + w - 2; wx += 3) if (h2(wx, wy, 339) > 0.35) B.rect(wx, wy, 2, 2, h2(wx, wy, 340) > 0.4 ? win('#ffe0a0') : pk('#4a5a74'));
      }
      B.obj(null);
      return;
    }
    if (seg === 'tea') {
      if (r < 0.5) for (let k = 0; k < 3; k++) { const x = X + k * 26; B.obj(x * 5); B.vline(x, hz - 12, hz + 4, ALU[1]); B.rect(x - 2, hz - 15, 5, 3, ALU[3]); }
      else farHouse(B, X, hz + 3, i);
      B.obj(null);
      return;
    }
    const n = seg === 'village' ? 4 : seg === 'mountain' ? (r < 0.6 ? 0 : 1) : r < 0.4 ? 0 : 1 + Math.floor(h1(i, 342) * 3);
    if (r < 0.25 || (seg === 'valley' && r < 0.5)) farCopse(B, X - 16, hz + 3, 30 + Math.floor(h1(i, 343) * 30), i);
    else if (r < 0.36 || (seg === 'farm' && r < 0.7)) farGreenhouse(B, X, hz + 6, 2 + Math.floor(h1(i, 345) * 3), i);
    for (let k = 0; k < n; k++) farHouse(B, X + 34 + k * 22 + Math.floor(h1(i * 5 + k, 346) * 5), hz + 2 + Math.floor(h1(i * 5 + k, 347) * 3), i * 11 + k);
  });
}
