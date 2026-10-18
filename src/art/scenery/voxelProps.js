// The country outside the Kodama's windows, built in 1 cm voxels: everyday
// two-storey houses and old minka farmhouses, white kura storehouses, tin
// farm sheds, vinyl greenhouses, utility poles and their lines, broadleaf
// trees, garden pines, sugi spires, bamboo, hedges, shrine gates, level
// crossings, vending machines, kei trucks, the town at dusk; and the ground
// they stand on (rice terraces drawn row by row, cabbages, leeks, tea
// hedgerows, the farm lane, the railway embankment).
//
// Every builder returns { v, n, a, w } — the lit model, voxels that glow at
// night (lit windows), voxels that always glow (vending machines, neon), and
// the width in voxels. Coordinates: x from 0 (left) to w - 1, y up from the
// ground, the front face at z = 0 and the body going back to negative z;
// eaves, balconies and canopies stick out to positive z.
import { VoxelModel } from '../../vox/voxel.js';
import { h1, h2, n1, n2 } from './core.js';

const hx = (s) => parseInt(s.slice(1), 16);
const P = (...a) => a.map(hx);
const shc = (c, f) => { const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f)); return (r << 16) | (g << 8) | b; };
const pick = (R, v) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * R.length)))];

// ---------------------------------------------------------------- palettes
const KAWARA = P('#22283a', '#2c3446', '#374055', '#444e65', '#535e76', '#656f88', '#7b859c');
const SLATE = P('#1e2028', '#272a33', '#31353f', '#3c404b', '#4a4e59', '#5a5e68', '#6c707a');
const BROWNR = P('#3a221e', '#4a2c24', '#5a362c', '#6c4234', '#7e5040', '#92604c', '#a6725a');
const TIN = { red: P('#5a2422', '#72302a', '#8a3c32', '#a04a3a', '#b45c46', '#c47056', '#d08668'), blue: P('#22344e', '#2c4260', '#385272', '#466484', '#567694', '#6c8aa6', '#86a0b8'), green: P('#1e3c32', '#28503e', '#33624a', '#427656', '#548a64', '#6a9e76', '#84b28c') };
const SIDINGS = [['#c9c0ac', '#d9d0bc', '#e7dfcc', '#f1ead9'], ['#c8c8c4', '#dadad6', '#e8e8e4', '#f4f4f0'], ['#b8a888', '#c9b998', '#d8c9a8', '#e6d8b8'],
  ['#a9afb4', '#bcc2c6', '#ccd2d5', '#dce1e3'], ['#a88e74', '#ba9f84', '#cab094', '#d8c0a4'], ['#c4b6a6', '#d4c6b6', '#e2d6c6', '#eee4d6'], ['#9eaa9a', '#b0bcac', '#c0ccbc', '#d0dbcc']].map((p) => P(...p));
const WOOD = P('#24170f', '#332117', '#432d1f', '#553a28', '#684a33', '#7d5c40', '#937050');
const PLASTER = P('#bfb6a2', '#cfc6b2', '#ddd5c2', '#e8e1d0', '#f2ecde', '#faf6ec');
const STONE = P('#56565a', '#68676a', '#7c7a7a', '#908d88', '#a5a198', '#bab5aa');
const CONC = P('#6e6e6c', '#80807c', '#92918c', '#a4a39c', '#b6b4ac', '#c8c6be');
const ASPH = P('#45464c', '#4f5056', '#5a5b60', '#65666a');
const ALU = P('#7a808a', '#959ba4', '#afb4bc', '#c8ccd2', '#dfe2e6');
const LEAF = P('#163824', '#1e4a2a', '#275e30', '#327236', '#40863c', '#529a44', '#68ae4e', '#84c25a');
const LEAF_Y = P('#2c4a22', '#3a6028', '#4c7830', '#62903a', '#7aa844', '#96bc52', '#b2d064');
const KAKI = P('#14321e', '#1c4426', '#24582c', '#2e6c32', '#3a8038', '#4a9440');
const HEDGE = P('#173a1e', '#1f4c24', '#285e2a', '#327030', '#3e8436', '#4e983e', '#64ac48');
const CEDAR = P('#0f2a22', '#153628', '#1c442e', '#245234', '#2e623c', '#3a7244');
const BAMBOO = P('#3e6a2a', '#4e8032', '#62963a', '#78aa44', '#92bc52', '#aed064');
const BARK = P('#2a1e1c', '#3a2a24', '#4c382c', '#5e4836', '#72583f');
const RICE = P('#1e4a26', '#28602c', '#337632', '#408a38', '#4f9e3e', '#63b048', '#7cc254', '#9ad464');
const AZE = P('#3a5e2a', '#4a7232', '#5c873a', '#71a046', '#8ab852', '#a6cc62');
const SOIL = P('#4a3428', '#5c4230', '#6e523a', '#806246', '#937352');
const CABB = P('#3e6e3a', '#528846', '#68a052', '#82b862', '#a2cc7c', '#c4e09c');
const TEA = P('#22462a', '#2c5a2e', '#386e34', '#46843c', '#589a44', '#70b050');
const GRASS = P('#2e5a28', '#3c6e30', '#4c8238', '#5e9842', '#78ae4e', '#94c25c');
const CURTAIN = P('#e8dcc0', '#d6e2ea', '#f0d6d6', '#e2e8cc', '#f2e6b0');
const NIGHT = P('#ffd890', '#ffe6b0', '#ffcf80', '#fff0d0');
const WHITE = hx('#f4f2ec'), BLACK = hx('#1e1a22'), RED = hx('#d83a32');

// ---------------------------------------------------------------- voxel helpers
const out = () => ({ v: new VoxelModel(), n: new VoxelModel(), a: new VoxelModel(), w: 0 });
function box(v, x0, x1, y0, y1, z0, z1, c) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const col = typeof c === 'function' ? c(x, y, z) : c;
    if (col != null) v.set(x, y, z, col);
  }
}
// only the outside skin of a box (what the camera can ever see)
function shell(v, x0, x1, y0, y1, z0, z1, c, { top = true, bottom = false } = {}) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1 || (top && y === y1) || (bottom && y === y0);
    if (!edge) continue;
    const col = typeof c === 'function' ? c(x, y, z) : c;
    if (col != null) v.set(x, y, z, col);
  }
}
// a window in a front wall at z: frame, glass holding the sky and a line of
// trees, curtains, a glint; recessed one voxel; lit rooms go in the night model
function sash(o, x, y, w, h, z, seed, { lit = 0.45, mullion = true, bars = false } = {}) {
  const { v, n } = o;
  const r = (k) => h1(seed, k);
  const cur = r(3) < 0.55 ? CURTAIN[Math.floor(r(4) * CURTAIN.length)] : 0;
  const cw = cur ? 1 + Math.floor(r(5) * Math.max(1, w / 3)) : 0;
  const glow = r(1) < lit ? NIGHT[Math.floor(r(2) * 4)] : 0;
  const tl = 0.35 + r(7) * 0.2;
  for (let xx = -1; xx <= w; xx++) for (let yy = -1; yy <= h; yy++) {
    const fr = xx < 0 || yy < 0 || xx >= w || yy >= h;
    if (fr) { v.set(x + xx, y + yy, z, yy === h ? ALU[3] : xx < 0 ? ALU[2] : ALU[1]); continue; }
    v.set(x + xx, y + yy, z, null);
    let c;
    const curtain = cur && (xx < cw || xx >= w - cw);
    if (curtain) c = (xx & 1) ? shc(cur, 0.9) : cur;
    else {
      const t = 1 - yy / Math.max(1, h - 1);
      c = t < tl - 0.2 ? hx('#a4bcd6') : t < tl ? hx('#86a2c0') : t < tl + 0.18 ? hx('#4e6a6a') : hx('#34405a');
      if ((xx + (h - yy)) % 9 === 0) c = hx('#d4e2f0');
    }
    v.set(x + xx, y + yy, z - 1, c);
    if (glow && !curtain) n.set(x + xx, y + yy, z - 1, glow);
  }
  if (mullion && w >= 7) for (let yy = 0; yy < h; yy++) v.set(x + (w >> 1), y + yy, z - 1, ALU[2]);
  if (bars) for (let xx = 1; xx < w; xx += 3) for (let yy = 0; yy < h; yy++) v.set(x + xx, y + yy, z, ALU[3]);
  for (let xx = -2; xx <= w + 1; xx++) v.set(x + xx, y - 2, z + 1, ALU[3]); // the sill
}
// a hipped roof over the footprint [xa..xb] x [zb..zf] (zf the front eave),
// eaves at height y0. Each column's height is the distance to the nearest
// eave times the slope, so the slopes come out as courses of tiles stepping
// up. Front slope: kawara laid in columns (crest, flank, trough), hip ridges
// down the corners, a ridge cap with onigawara at both ends. gableAt: above
// this height the ends turn into vertical gables (irimoya).
function hipRoof(v, xa, xb, zb, zf, y0, slope, R, { gable = 0, tin = false, noshi = true, seed = 1 } = {}) {
  const inset = gable ? Math.floor(gable / slope) : 0;
  let top = 0;
  const hAt = (x, z) => {
    const dz = Math.min(zf - z, z - zb), dx = Math.min(x - xa, xb - x);
    const hz = dz * slope;
    if (gable && dx >= inset) return { h: Math.floor(hz), side: 'z' };
    const hx2 = dx * slope;
    return hz <= hx2 ? { h: Math.floor(hz), side: 'z' } : { h: Math.floor(hx2), side: 'x' };
  };
  for (let x = xa; x <= xb; x++) for (let z = zb; z <= zf; z++) top = Math.max(top, hAt(x, z).h);
  for (let x = xa; x <= xb; x++) for (let z = zb; z <= zf; z++) {
    const { h, side } = hAt(x, z);
    const y = y0 + h;
    let c;
    if (h >= top) c = R[1]; // the ridge
    else if (side === 'z') {
      if (tin) c = (x % 3 === 0) ? R[2] : R[4 + ((h >> 2) & 1)];
      else { const col = ((x % 4) + 4) % 4; c = [R[5], R[6], R[3], R[4]][col]; if (z === zf) c = col === 1 || col === 2 ? R[6] : R[2]; }
      if (!tin && h < top * 0.4 && col4(x) === 2 && n2(x / 6, z / 3, seed) > 0.66) c = hx('#6e8a4a'); // moss in the troughs
    } else c = h % 2 ? R[3] : R[4];
    // the hip ridges down the corners
    const dz = Math.min(zf - z, z - zb), dx = Math.min(x - xa, xb - x);
    if (!gable && Math.abs(dz - dx) < 1 && h < top) c = R[2];
    v.set(x, y, z, c);
    v.set(x, y - 1, z, R[0]);
    if (z === zf || z === zb || x === xa || x === xb) v.set(x, y - 2, z, R[0]); // eave fascia
  }
  // ridge cap and onigawara
  const yr = y0 + top + 1;
  const zr = Math.round((zb + zf) / 2);
  for (let x = xa + inset - (gable ? 1 : 0); x <= xb - inset + (gable ? 1 : 0); x++) {
    if (hAt(x, zr).h < top && !gable) continue;
    v.set(x, yr, zr, R[2]); v.set(x, yr, zr + 1, R[3]); v.set(x, yr + 1, zr, R[1]);
    if (noshi) v.set(x, yr - 1, zr + 2, PLASTER[3]);
  }
  let ra = xb, rb = xa;
  for (let x = xa; x <= xb; x++) if (hAt(x, zr).h >= top) { ra = Math.min(ra, x); rb = Math.max(rb, x); }
  if (!tin) for (const ex of [ra - 1, rb - 1]) box(v, ex, ex + 2, yr, yr + 4, zr - 1, zr + 1, (x, y) => (y === yr + 4 ? R[4] : R[1]));
  // the gable faces (irimoya): white plaster triangles with a timber lattice
  if (gable) for (const gx of [xa + inset, xb - inset]) for (let z = zb; z <= zf; z++) {
    const ht = hAt(gx, z).h;
    for (let h = gable; h < ht; h++) {
      const edge = h === ht - 1;
      v.set(gx, y0 + h, z, edge ? R[1] : (z % 4 === 0 || h % 4 === 0) ? WOOD[2] : PLASTER[4]);
    }
  }
  return top;
}
const col4 = (x) => ((x % 4) + 4) % 4;
function gutter(v, xa, xb, y, z, gy0, side) {
  for (let x = xa; x <= xb; x++) { v.set(x, y, z, ALU[2]); v.set(x, y - 1, z, ALU[0]); }
  const dx = side > 0 ? xb - 1 : xa + 1;
  for (let yy = gy0; yy < y; yy++) { v.set(dx, yy, z - 1, ALU[2]); if (yy % 9 === 0) v.set(dx, yy, z, ALU[1]); }
}
function acUnit(v, x, z) {
  box(v, x, x + 15, 1, 12, z, z + 6, (xx, yy, zz) => (zz === z + 6 && Math.hypot(xx - x - 6, yy - 6) < 4.5 ? ((xx + yy) & 1 ? ALU[0] : ALU[1]) : yy === 12 ? ALU[4] : ALU[3]));
  box(v, x + 13, x + 15, 13, 26, z, z + 2, hx('#d8ccb0'));
}

// ================================================================= buildings
// the everyday two-storey house
export function house2(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const W = 2 * Math.floor((60 + r(1) * 22) / 2), D = 34, f1 = 22, f2 = 20, H = f1 + f2;
  const S = SIDINGS[Math.floor(r(2) * SIDINGS.length)];
  const R = r(3) < 0.55 ? KAWARA : r(3) < 0.78 ? SLATE : BROWNR;
  // footing with vents, then the walls: boards with joints, a lit corner, grime low down
  shell(v, 0, W - 1, 0, 3, -D + 1, 0, (x, y, z) => (y === 3 ? CONC[4] : z === 0 && y === 1 && x % 22 > 7 && x % 22 < 13 ? CONC[0] : CONC[2]));
  const jx = [14 + Math.floor(r(4) * 12), 38 + Math.floor(r(5) * 14)];
  shell(v, 0, W - 1, 4, H - 1, -D + 1, 0, (x, y, z) => {
    if ((y - 4) % 4 === 3) return S[1];
    if (z === 0 && jx.includes(x)) return S[1];
    if (x === W - 1) return S[3];
    if (y < 8 && n2(x / 4, z / 4, seed) > 0.6) return shc(S[2], 0.93);
    return S[2];
  }, { top: false });
  // 1F: a big sliding glass door, the front door under a canopy, a barred window
  sash(o, 5, 6, 18, 12, 0, seed * 3 + 1, { lit: 0.45 });
  const dX = 28 + Math.floor(r(6) * 6);
  box(v, dX - 1, dX + 10, 4, 20, 0, 0, (x, y) => (x === dX - 1 || x === dX + 10 || y === 20 ? ALU[1] : hx('#5a4636')));
  for (let y = 7; y < 18; y += 3) box(v, dX + 2, dX + 7, y, y, 1, 1, hx('#c8bca8'));
  v.set(dX + 8, 12, 1, ALU[4]);
  box(v, dX - 3, dX + 12, 22, 22, 1, 5, R[3]); box(v, dX - 3, dX + 12, 21, 21, 5, 5, R[1]);
  o.n.set(dX - 2, 18, 1, hx('#ffe6a0'));
  box(v, dX + 11, dX + 13, 12, 15, 1, 1, hx('#e8e0cc')); // nameplate
  sash(o, W - 16, 7, 10, 8, 0, seed * 3 + 2, { mullion: false, bars: true });
  // the skirt roof between the floors (or a balcony over the glass door)
  const balc = r(7) < 0.6, bx1 = Math.min(W - 6, 36);
  for (let k = 0; k < 5; k++) for (let x = -3; x <= W + 2; x++) {
    if (balc && x >= 1 && x <= bx1) continue;
    const y = f1 + 3 - Math.floor(k * 0.8), z = 1 + k;
    v.set(x, y, z, k === 4 ? (col4(x) === 1 ? R[6] : R[2]) : [R[4], R[5], R[2], R[3]][col4(x)]);
    v.set(x, y - 1, z, R[0]);
  }
  if (balc) {
    box(v, 1, bx1, f1 - 1, f1 + 1, 1, 8, (x, y) => (y === f1 + 1 ? CONC[4] : CONC[2]));
    for (let x = 1; x <= bx1; x++) for (let y = f1 + 2; y <= f1 + 10; y++) if (x % 3 === 1 || y === f1 + 10) v.set(x, y, 8, y === f1 + 10 ? ALU[4] : ALU[2]);
    if (r(8) < 0.55) { // a futon airing over the rail
      const fx = 3 + Math.floor(r(9) * Math.max(1, bx1 - 22)), fc = [hx('#f2eee6'), hx('#f6c8d4'), hx('#c8daf6'), hx('#f6e6a0')][Math.floor(r(10) * 4)];
      for (let x = fx; x < fx + 18; x++) { for (let y = f1 + 3; y <= f1 + 11; y++) v.set(x, y, 9, (x - fx) % 6 === 0 ? shc(fc, 0.85) : fc); for (let z = 6; z <= 9; z++) v.set(x, f1 + 11, z, fc); }
    }
    if (r(11) < 0.7) { // laundry on a pole
      box(v, 2, bx1 - 1, f1 + 19, f1 + 19, 4, 4, ALU[1]);
      for (let k = 0; k < Math.floor(bx1 / 9); k++) {
        const lx = 4 + k * 9, c = [WHITE, hx('#ff8a8a'), hx('#8ab4ff'), hx('#ffe070'), hx('#7ac87a'), hx('#f0a0d0')][(seed + k) % 6];
        if ((seed + k) % 2) { box(v, lx, lx + 6, f1 + 16, f1 + 18, 4, 5, c); box(v, lx + 1, lx + 5, f1 + 11, f1 + 15, 4, 5, c); }
        else box(v, lx + 1, lx + 5, f1 + 10, f1 + 18, 4, 4, c);
      }
    }
  }
  // 2F windows, some with shutter boxes
  const nw = W > 70 ? 3 : 2, sp = Math.floor((W - 8) / nw);
  for (let k = 0; k < nw; k++) {
    const wx = 6 + k * sp;
    sash(o, wx, f1 + 7, sp - 10, 10, 0, seed * 5 + k);
    if (r(12 + k) < 0.5) box(v, wx - 2, wx + sp - 9, f1 + 19, f1 + 21, 1, 2, S[1]);
  }
  // the main roof, a gutter, an air-con unit
  hipRoof(v, -6, W + 5, -D - 5, 6, H, 0.55, R, { noshi: R === KAWARA, seed });
  gutter(v, -5, W + 4, H - 1, 7, 4, r(13) < 0.5 ? 1 : -1);
  if (r(14) < 0.75) acUnit(v, W - 20, 1);
  o.w = W;
  return o;
}
// the old farmhouse: a tall storey under a huge irimoya roof (tiles, or the
// old thatch sheathed in tin), dark timber, shoji and glass doors behind the
// engawa, a stone footing
export function minka(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const W = 2 * Math.floor((86 + r(1) * 28) / 2), D = 46, wh = 28;
  const tin = r(2) < 0.35, R = tin ? TIN[['red', 'blue', 'green'][Math.floor(r(3) * 3)]] : KAWARA;
  shell(v, -2, W + 1, 0, 4, -D - 1, 2, (x, y, z) => ((x + (y & 1) * 3) % 7 === 0 || y === 4 ? STONE[1] : STONE[2 + ((x * 3 + y) % 3)]));
  // walls: posts and beams, bays of glass doors, shoji, or plaster over boards
  const bays = Math.max(5, Math.round(W / 15)), bw = W / bays;
  shell(v, 0, W - 1, 5, wh - 1, -D + 1, 0, (x, y, z) => {
    if (z !== 0) return (y > 16 ? PLASTER[3] : WOOD[3]);
    const b = Math.floor(x / bw), u = x - Math.round(b * bw);
    if (u === 0 || u === 1) return u === 0 ? WOOD[1] : WOOD[3];
    if (y > wh - 4) return y === wh - 1 ? WOOD[4] : WOOD[2];
    const kind = h1(seed * 31 + b, 381);
    if (kind < 0.38) { if (u % 6 === 2 || y === 14) return WOOD[4]; return null; } // glass doors (glass set behind)
    if (kind < 0.72) { if (u % 4 === 2 || (y - 5) % 5 === 3) return hx('#b8aa8a'); return null; } // shoji (paper behind)
    return y < 14 ? WOOD[2 + ((x >> 1) & 1)] : PLASTER[4];
  }, { top: false });
  for (let x = 0; x < W; x++) for (let y = 5; y < wh - 3; y++) {
    if (v.has(x, y, 0)) continue;
    const b = Math.floor(x / bw), kind = h1(seed * 31 + b, 381);
    if (kind < 0.38) { const t = (y - 5) / (wh - 8); v.set(x, y, -1, (x + y) % 11 === 0 ? hx('#a8c0d8') : t > 0.55 ? hx('#6e88a6') : hx('#3e5270')); if (h1(seed + b, 9) < 0.5) o.n.set(x, y, -1, hx('#ffe0a8')); }
    else { v.set(x, y, -1, hx('#f2ead2')); o.n.set(x, y, -1, hx('#fff2cc')); }
  }
  // the engawa: a veranda with posts
  box(v, 2, W - 3, 6, 7, 1, 7, (x, y, z) => (y === 7 ? (z % 2 ? WOOD[6] : WOOD[5]) : WOOD[2]));
  for (let x = 8; x < W - 6; x += 18) box(v, x, x + 1, 1, 5, 6, 7, WOOD[1]);
  for (let x = 4; x < W - 4; x += 30) box(v, x, x + 1, 8, wh - 1, 6, 7, WOOD[1]); // posts to the eave
  // the big roof, irimoya: hips below, gables above
  const rh = hipRoof(v, -8, W + 7, -D - 8, 12, wh, 0.75, R, { gable: 14, tin, seed });
  void rh;
  if (r(5) < 0.6) for (let k = 0; k < 3; k++) { box(v, 3 + k * 5, 6 + k * 5, 1, 4, 9, 12, hx('#a8583a')); box(v, 2 + k * 5, 7 + k * 5, 5, 8, 9, 12, LEAF[4 + (k & 1)]); }
  o.w = W;
  return o;
}
// the white storehouse: thick plaster, black namako tiles with raised white joints, a shuttered window
export function kura(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const W = 38 + Math.floor(r(1) * 10), D = 32, H = 40;
  shell(v, 0, W - 1, 0, H - 1, -D + 1, 0, (x, y, z) => {
    if (y < 14) { const u = ((x + z) - y + 400) % 6, w2 = ((x + z) + y + 400) % 6; if (u === 0 || w2 === 0) return u === 0 && w2 === 0 ? PLASTER[5] : PLASTER[3]; return (x + y) & 1 ? hx('#32363f') : hx('#3a3e48'); }
    if (y > H - 4) return PLASTER[1];
    return n2(x / 3, y / 8, seed) > 0.7 ? PLASTER[3] : PLASTER[4];
  }, { top: false });
  const wx = Math.floor(W / 2) - 5, wy = 22;
  box(v, wx - 2, wx + 11, wy - 2, wy + 10, 1, 1, PLASTER[2]); box(v, wx - 1, wx + 10, wy - 1, wy + 9, 2, 2, BLACK);
  box(v, wx, wx + 9, wy, wy + 8, 3, 3, (x) => ((x - wx) % 3 === 1 ? hx('#6e6a76') : hx('#45414d')));
  hipRoof(v, -5, W + 4, -D - 5, 6, H, 0.6, KAWARA, { seed });
  if (r(2) < 0.6) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const d = Math.hypot(x - 3.5, y - 3.5); if (d < 4) v.set(Math.floor(W / 2) - 4 + x, H + 4 + y, 7, d < 2.3 ? PLASTER[5] : BLACK); }
  o.w = W;
  return o;
}
// a corrugated farm shed: ribbed walls with rust runs, a dark open front, a tractor inside
export function shed(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const W = 44 + Math.floor(r(1) * 18), D = 34, H = 28;
  const T = TIN[['red', 'blue', 'green'][Math.floor(r(2) * 3)]];
  shell(v, 0, W - 1, 0, H - 1, -D + 1, 0, (x, y, z) => {
    if (z === 0 && x > 6 && x < W - 7 && y < H - 6) return null;
    if (n2(x / 2, y / 7, seed + 1) > 0.72 && (x % 3 === 1)) return (y & 1) ? hx('#8a5a3a') : hx('#7a4a30');
    return [ALU[1], ALU[2], ALU[3]][((x + z) % 3 + 3) % 3];
  }, { top: false });
  box(v, 7, W - 8, 0, H - 7, -D + 2, -D + 2, hx('#1e1a1e')); box(v, 7, W - 8, 0, 0, -D + 2, -1, hx('#2e2824'));
  if (r(3) < 0.75) { // a little orange tractor
    const tx = 14;
    box(v, tx, tx + 15, 3, 9, -14, -6, hx('#e0602a')); box(v, tx + 10, tx + 15, 10, 16, -12, -8, hx('#3a3a40'));
    for (const [wx, wr] of [[tx + 3, 4], [tx + 13, 3]]) for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; v.set(Math.round(wx + Math.cos(t) * wr), Math.round(wr + Math.sin(t) * wr), -5, BLACK); }
  }
  hipRoof(v, -3, W + 2, -D - 3, 3, H, 0.4, T, { tin: true, seed });
  o.w = W;
  return o;
}
// white vinyl greenhouses running back from us: arched film over ribs, crops inside, the ends open
export function greenhouse(seed, n = 2) {
  const o = out(), v = o.v;
  const hw = 15, H = 26, D = 80;
  for (let k = 0; k < n; k++) {
    const x0 = k * (hw * 2 + 3);
    for (let x = 0; x < hw * 2; x++) {
      const t = (x + 0.5 - hw) / hw, top = Math.round(H * Math.sqrt(Math.max(0, 1 - t * t * 0.92)));
      for (let z = -D; z <= 0; z++) {
        const rib = z % 8 === 0;
        v.set(x0 + x, top, z, rib ? hx('#aebcc0') : t > 0.3 ? hx('#f4f8f8') : t < -0.4 ? hx('#d4dee0') : hx('#e6eeee'));
        if (z === 0 || z === -D) for (let y = 0; y < top; y++) {
          if (z === 0 && y < 9 && Math.abs(t) < 0.75) continue; // the open end
          v.set(x0 + x, y, z, y < 9 ? hx('#c8d4d6') : (x % 6 === 0 ? hx('#aebcc0') : hx('#e2eaea')));
        }
        if (x === 0 || x === hw * 2 - 1) for (let y = 0; y < Math.min(top, 7); y++) v.set(x0 + x, y, z, hx('#d8e2e2'));
      }
    }
    for (let z = -D + 2; z < -2; z++) for (let x = 3; x < hw * 2 - 3; x++) if (x % 5 < 3) { const h = 3 + ((x * 7 + z) % 3); for (let y = 0; y < h; y++) v.set(x0 + x, y, z, y === h - 1 ? CABB[4] : CABB[2]); }
  }
  o.w = n * (hw * 2 + 3);
  return o;
}

// ================================================================= trees and plants
// a crown of leaf clusters: each a lumpy blob, lit from the upper front right,
// darker deep inside, leaf marks, sky showing through near the rim
function crown(v, cx, cy, cz, rx, ry, rz, R, seed, { n = null, fruit = 0 } = {}) {
  const blobs = [];
  const nb = n ?? Math.max(5, Math.round((rx * ry) / 50));
  for (let k = 0; k < nb; k++) {
    const a = h1(seed, k * 3) * Math.PI * 2, d = Math.sqrt(h1(seed, k * 3 + 1)) * 0.72, e = (h1(seed, k * 3 + 2) - 0.4) * 0.9;
    const br = (0.34 + h1(seed, k * 5 + 7) * 0.22) * Math.min(rx, ry * 1.2);
    blobs.push([cx + Math.cos(a) * rx * d * 0.8, cy + e * ry * 0.7, cz + Math.sin(a) * rz * d * 0.8, br]);
  }
  blobs.push([cx, cy, cz, Math.min(rx, ry) * 0.7]);
  const L = [0.42, 0.68, 0.6];
  const x0 = Math.floor(cx - rx - 4), x1 = Math.ceil(cx + rx + 4), y0 = Math.floor(cy - ry - 4), y1 = Math.ceil(cy + ry + 4), z0 = Math.floor(cz - rz - 4), z1 = Math.ceil(cz + rz + 4);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    let best = 9, bb = null;
    for (const b of blobs) { const d = ((x - b[0]) ** 2 + ((y - b[1]) * 1.15) ** 2 + (z - b[2]) ** 2) / (b[3] * b[3]); if (d < best) { best = d; bb = b; } }
    const wob = (h2(x * 3 + z, y, seed) - 0.5) * 0.3;
    if (best > 1 + wob) continue;
    if (best < 0.5) { // the inside: only a dark core skin
      if (best < 0.42) continue;
      v.set(x, y, z, R[0]); continue;
    }
    if (best > 0.82 && h2(x + z * 7, y, seed + 13) > 0.84) continue; // gaps of sky at the rim
    const nx = (x - bb[0]) / bb[3], ny = (y - bb[1]) / bb[3], nz = (z - bb[2]) / bb[3];
    let lv = 0.5 + (nx * L[0] + ny * L[1] + nz * L[2]) * 0.38 - (1 - best) * 0.3 + (y - cy) / ry * 0.08;
    const leaf = h2(x * 5 + z, y, seed + 17);
    if (leaf > 0.82) lv += 0.12; else if (leaf < 0.14) lv -= 0.12;
    if (fruit && h2(x * 11 + z * 3, y, seed + 19) > 0.985 && ny > -0.5) { v.set(x, y, z, fruit); continue; }
    v.set(x, y, z, pick(R, lv));
  }
}
function trunk(v, x, z, h, seed, r0 = 2.5) {
  for (let y = 0; y < h; y++) {
    const t = y / h, rr = r0 * (1 - t * 0.45), sw = Math.sin(t * 2.5 + seed) * 1.2 * t;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (dx * dx + dz * dz <= rr * rr) v.set(Math.round(x + dx + sw), y, z + dz, pick(BARK, 0.35 + (dx + dz) * 0.08 + (h2(dx, y >> 1, seed) - 0.5) * 0.2));
  }
}
export function broadleaf(seed, { h = null, rx = null, R = LEAF, fruit = 0 } = {}) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const H = h ?? (46 + Math.floor(r(1) * 24)), RX = rx ?? (17 + r(2) * 12);
  const cx = Math.round(RX) + 2;
  trunk(v, cx, -Math.round(RX * 0.6), Math.round(H * 0.55), seed);
  for (const s of [-1, 1]) for (let k = 0; k < RX * 0.45; k++) v.set(cx + s * k, Math.round(H * 0.42 + k * 0.5), -Math.round(RX * 0.6), BARK[2]);
  crown(v, cx, H * 0.66, -RX * 0.6, RX, H * 0.36, RX * 0.6, R, seed, { fruit });
  o.w = cx * 2;
  return o;
}
export const persimmon = (seed) => broadleaf(seed, { R: KAKI, fruit: hx('#f08a2a') });
export const keyaki = (seed) => broadleaf(seed, { h: 70, rx: 30, R: LEAF_Y });
// a garden pine: a crooked trunk and flat cloud-pads of needles
export function gardenPine(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const H = 36 + Math.floor(r(1) * 14), cx = 16, cz = -8;
  let x = cx;
  const pts = [];
  for (let y = 0; y < H; y++) { x += Math.sin(y * 0.2 + seed) * 0.5; pts.push([x, y]); box(v, Math.round(x) - 1, Math.round(x) + 1, y, y, cz - 1, cz + 1, (xx, yy, zz) => ((yy & 3) ? BARK[2 + (xx > x ? 1 : 0)] : BARK[1])); }
  for (let k = 0; k < 4; k++) {
    const [px, py] = pts[Math.min(pts.length - 1, Math.floor(H * (0.4 + k * 0.18)))];
    const side = k % 2 ? 1 : -1, pw = 8 + r(3 + k) * 6, ox = px + side * (4 + r(10 + k) * 5);
    for (let xx = -pw; xx <= pw; xx++) for (let zz = -pw * 0.8; zz <= pw * 0.8; zz++) for (let yy = -3; yy <= 3; yy++) {
      const d = (xx / pw) ** 2 + (zz / (pw * 0.8)) ** 2 + (yy / 3.2) ** 2;
      if (d > 1 || d < 0.45) continue;
      v.set(Math.round(ox + xx), Math.round(py + yy), Math.round(cz + zz), pick(CEDAR, 0.6 + yy * 0.12 + xx / pw * 0.12 + (h2(xx * 3 + zz, yy, seed) > 0.7 ? 0.15 : 0)));
    }
  }
  o.w = 32;
  return o;
}
// a stand of sugi cedar: tall spires of drooping branch tiers
export function cedars(seed, n = 4, hmin = 80) {
  const o = out(), v = o.v;
  for (let k = 0; k < n; k++) {
    const r = (q) => h1(seed * 7 + k, q);
    const tx = 10 + k * 15 + Math.floor(r(1) * 6), tz = -10 - Math.floor(r(3) * 10), H = hmin + Math.floor(r(2) * 28);
    box(v, tx - 1, tx + 1, 0, Math.round(H * 0.3), tz - 1, tz + 1, (x) => (x > tx ? BARK[3] : BARK[1]));
    for (let y = Math.round(H * 0.2); y < H; y++) {
      const t = (H - y) / (H * 0.8), tier = (H - y) % 7;
      const rr = Math.max(0.6, t * 10 + (tier / 7) * 2.6 - 1);
      for (let dx = -Math.ceil(rr); dx <= rr; dx++) for (let dz = -Math.ceil(rr); dz <= rr; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > rr || d < rr - 2.2) continue;
        v.set(tx + dx, y, tz + dz, pick(CEDAR, 0.48 + (dx + dz) / (rr * 2 + 1) * 0.35 - (tier < 2 ? 0.18 : 0) + (h2(dx * 7 + dz, y, seed) - 0.5) * 0.18));
      }
    }
  }
  o.w = n * 15 + 12;
  return o;
}
// a bamboo grove: pale jointed culms and sprays of leaves bowing over
export function bamboo(seed, w = 56) {
  const o = out(), v = o.v;
  const n = Math.floor(w / 5);
  for (let k = 0; k < n; k++) {
    const sx = 2 + k * 5 + Math.floor(h1(seed + k, 1) * 3), sz = -4 - Math.floor(h1(seed + k, 3) * 14), H = 76 + Math.floor(h1(seed + k, 2) * 24), lean = (k % 2 ? 3 : -2);
    for (let y = 0; y < H; y++) {
      const x = sx + Math.round((y / H) ** 2 * lean), node = y % 11 === 0;
      box(v, x, x + 1, y, y, sz, sz + 1, (xx) => (node ? BAMBOO[1] : xx > x ? BAMBOO[2] : BAMBOO[3]));
    }
  }
  for (let k = 0; k < n * 2; k++) {
    const cx = h1(seed, 50 + k) * w, cy = 56 + h1(seed, 80 + k) * 34, cz = -4 - h1(seed, 140 + k) * 16, rr = 6 + h1(seed, 110 + k) * 5;
    for (let q = 0; q < 16; q++) { // single leaves fanning out of the spray
      const a = (q / 16) * Math.PI * 2, l = rr * (0.6 + h1(seed + k, q) * 0.5);
      for (let t = 0; t < l; t++) { const x = cx + Math.cos(a) * t, y = cy - Math.abs(Math.sin(a)) * t * 0.3 - t * 0.25, z = cz + Math.sin(a) * t * 0.6; v.set(Math.round(x), Math.round(y), Math.round(z), pick(BAMBOO, 0.45 + Math.cos(a) * 0.25 + (t / l) * 0.2)); }
    }
  }
  o.w = w;
  return o;
}
// a clipped hedge along the front of a property
export function hedge(seed, w = 60, h = 10) {
  const o = out(), v = o.v;
  for (let x = 0; x < w; x++) {
    const hh = h + Math.round(n1(x / 5, seed) * 2);
    for (let z = -5; z <= 0; z++) for (let y = 0; y < hh; y++) {
      if (z > -5 && z < 0 && y < hh - 1 && x > 0 && x < w - 1) continue;
      let lv = y >= hh - 1 ? 0.86 : y >= hh - 3 ? 0.68 : 0.46 - (hh - y) * 0.008;
      const leaf = h2(x * 3 + z, y, seed);
      if (leaf > 0.8) lv += 0.12; else if (leaf < 0.15) lv -= 0.12;
      v.set(x, y, z, pick(HEDGE, lv));
    }
  }
  o.w = w;
  return o;
}
export function shrubs(seed, n = 4) {
  const o = out(), v = o.v;
  for (let k = 0; k < n; k++) {
    const rr = 6 + h1(seed, k) * 3, cx = 8 + k * 15;
    crown(v, cx, rr, -rr, rr * 1.15, rr, rr, HEDGE, seed + k * 5, { n: 3 });
    if (h1(seed, k + 9) < 0.5) { const fc = [hx('#f26aa0'), WHITE][Math.floor(h1(seed, k + 11) * 2)]; for (let q = 0; q < 10; q++) v.set(Math.round(cx + (h1(seed, q + 30 + k) - 0.5) * rr * 1.8), Math.round(rr + (h1(seed, q + 40 + k) - 0.2) * rr * 0.9), Math.round(1 - h1(seed, q + 50 + k) * rr * 0.4), fc); }
  }
  o.w = n * 15 + 2;
  return o;
}

// ================================================================= street life
// a concrete utility pole: cross-arms with insulators, a transformer, the yellow guard sleeve
export function pole() {
  const o = out(), v = o.v;
  const H = 104;
  box(v, 0, 4, 0, H, -2, 2, (x, y) => (y % 13 === 0 ? CONC[1] : x === 0 ? CONC[2] : x === 4 ? CONC[1] : CONC[3]));
  box(v, -13, 17, H - 6, H - 5, -1, 1, CONC[1]); box(v, -9, 13, H - 18, H - 17, -1, 1, CONC[1]);
  for (const dx of [-11, -4, 8, 15]) box(v, dx, dx + 1, H - 4, H - 2, 0, 1, WHITE);
  box(v, 6, 14, H - 36, H - 24, -3, 3, (x, y) => (y % 2 ? ALU[1] : ALU[2])); box(v, 6, 14, H - 23, H - 23, -3, 3, ALU[3]);
  box(v, -1, 5, 3, 17, -3, 3, (x, y) => ((y >> 1) % 2 ? hx('#f0d040') : BLACK));
  box(v, -1, 5, 36, 43, 3, 3, (x, y) => (y === 39 && x > 0 && x < 4 ? WHITE : hx('#2a6ad8')));
  o.w = 5;
  return o;
}
// the two lines between two poles `len` voxels apart, sagging
export function wires(len) {
  const o = out(), v = o.v;
  for (const [dy, sag, z] of [[-4, 14, 1], [-16, 18, 0]]) for (let x = 0; x <= len; x++) v.set(x, 104 + dy - Math.round(Math.sin((x / len) * Math.PI) * sag), z, hx('#2a2830'));
  o.w = len;
  return o;
}
export function vending(seed, n = 2) {
  const o = out(), v = o.v;
  const fronts = P('#e8403a', '#2a6ad8', '#f4f4f0', '#3aa860', '#f0b020');
  for (let k = 0; k < n; k++) {
    const x0 = k * 14, f = fronts[(seed + k) % fronts.length];
    shell(v, x0, x0 + 12, 0, 26, -9, 0, (x, y, z) => (y === 26 ? shc(f, 1.15) : x === x0 + 12 ? shc(f, 0.8) : f), { top: true });
    box(o.a, x0 + 1, x0 + 11, 13, 24, 1, 1, hx('#e8f0ff'));
    for (let row = 0; row < 3; row++) for (let c = 0; c < 5; c++) box(o.a, x0 + 2 + c * 2, x0 + 2 + c * 2, 14 + row * 4, 16 + row * 4, 2, 2, P('#ff6a5a', '#5ab0ff', '#ffd050', '#7ae07a', '#ffffff')[(c + row + k) % 5]);
    box(v, x0 + 2, x0 + 9, 9, 10, 1, 1, BLACK); box(v, x0 + 2, x0 + 10, 2, 4, 1, 1, hx('#1a1a20'));
  }
  o.w = n * 14;
  return o;
}
export function busStop() {
  const o = out(), v = o.v;
  box(v, 0, 1, 0, 34, -1, 0, ALU[2]);
  for (let y = 0; y < 11; y++) for (let x = -5; x <= 6; x++) { const d = Math.hypot(x - 0.5, y - 5); if (d < 5.5) v.set(x, 34 + y, 1, d < 3.5 ? WHITE : hx('#2a6ad8')); }
  box(v, 8, 30, 8, 10, -6, 0, (x, y) => (y === 10 ? hx('#8aa8d8') : hx('#6a8ac0')));
  for (const x of [10, 28]) box(v, x, x, 0, 7, -5, -1, WOOD[1]);
  o.w = 32;
  return o;
}
export function jizo(seed) {
  const o = out(), v = o.v;
  box(v, 0, 33, 0, 2, -10, 0, (x, y) => (y === 2 ? STONE[4] : STONE[2]));
  for (let k = 0; k < 3; k++) {
    const x0 = 3 + k * 10;
    for (let y = 3; y < 24; y++) for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      const body = y < 15 && (x * x) / 16 + (z * z) / 12 + ((y - 9) / 7) ** 2 < 1, head = ((x * x + z * z) / 11 + ((y - 18) / 3.6) ** 2) < 1;
      if (!body && !head) continue;
      let c = pick(STONE, 0.55 + x * 0.04 + z * 0.03);
      if (y >= 11 && y <= 14 && z > -2) c = y === 14 ? hx('#f05a4a') : RED; // the bib
      v.set(x0 + x, y, -5 + z, c);
    }
    box(v, x0 - 3, x0 + 3, 22, 23, -8, -2, RED); // the cap
  }
  o.w = 34;
  return o;
}
export function keiTruck(seed) {
  const o = out(), v = o.v;
  const W = hx('#f2f2ee'), Wd = hx('#c8c8c4');
  shell(v, 0, 39, 4, 9, -16, 0, (x, y) => (y === 9 ? Wd : W));
  shell(v, 27, 39, 10, 21, -16, 0, (x, y, z) => (z === 0 && y > 13 && y < 20 && x > 28 && x < 38 ? hx('#3e5270') : y === 21 ? WHITE : W));
  box(v, 1, 26, 10, 13, 0, 0, Wd); box(v, 1, 26, 10, 13, -16, -16, Wd);
  if (h1(seed, 1) < 0.5) for (let k = 0; k < 4; k++) box(v, 3 + k * 6, 7 + k * 6, 10, 14, -12, -4, (x, y) => (y === 14 ? P('#e85a3a', '#7ac04a', '#f0a030', '#8a5ac8')[k] : hx('#c8a060')));
  else box(v, 3, 24, 10, 15, -13, -3, (x, y, z) => (h2(x * 3 + z, y, seed) > 0.6 ? hx('#e8d080') : hx('#d0b060')));
  for (const wx of [7, 31]) for (const z of [1, -17]) for (let a = 0; a < 30; a++) { const t = (a / 30) * Math.PI * 2; v.set(Math.round(wx + Math.cos(t) * 4), Math.round(4 + Math.sin(t) * 4), z, BLACK); }
  o.a.set(39, 7, 1, hx('#ffe8a0'));
  o.w = 40;
  return o;
}
export function farmer(seed) {
  const o = out(), v = o.v;
  box(v, 1, 3, 0, 6, -3, -2, hx('#2a3a6a')); box(v, 4, 6, 0, 6, -3, -2, hx('#2a3a6a'));
  box(v, 0, 7, 7, 14, -4, -1, hx('#3a5a9a')); box(v, 7, 10, 9, 11, -4, -2, hx('#3a5a9a')); v.set(10, 8, -3, hx('#e8c8a0'));
  for (let x = -4; x <= 11; x++) for (let z = -9; z <= 4; z++) if (((x - 3.5) / 8) ** 2 + ((z + 2.5) / 6.5) ** 2 < 1) v.set(x, 16, z, hx('#e0c070'));
  box(v, 2, 5, 17, 18, -4, -1, hx('#c8a050'));
  o.w = 12;
  return o;
}
export function scarecrow(seed) {
  const o = out(), v = o.v;
  box(v, 10, 11, 0, 30, -1, 0, WOOD[3]); box(v, 0, 21, 21, 22, -1, 0, WOOD[3]);
  box(v, 3, 18, 13, 21, -2, 1, (x, y) => (y === 21 ? hx('#6a8ac8') : hx('#4a6aa8'))); box(v, 6, 15, 9, 12, -2, 1, hx('#4a6aa8'));
  for (let y = 0; y < 9; y++) for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if ((x * x + z * z) / 18 + ((y - 4) / 4.4) ** 2 < 1) v.set(10 + x, 23 + y, z, hx('#f0e8d8'));
  v.set(8, 27, 4, BLACK); v.set(12, 27, 4, BLACK); box(v, 9, 11, 25, 25, 4, 4, RED);
  for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (x * x + z * z < 64) v.set(10 + x, 32, z, hx('#e0c070'));
  o.w = 22;
  return o;
}
// a shrine in its wood: a vermilion torii, a little hokora under a tiled roof, stone lanterns
export function shrine(seed) {
  const o = cedars(seed, 4, 76);
  const v = o.v;
  const RD = P('#7a2620', '#a2342a', '#c84634', '#e0623e', '#f08050');
  for (const px of [0, 26]) box(v, px, px + 3, 0, 40, 6, 9, (x) => (x === px ? RD[1] : x === px + 3 ? RD[3] : RD[2]));
  for (const px of [0, 26]) box(v, px - 1, px + 4, 0, 3, 5, 10, BLACK);
  box(v, -7, 36, 43, 45, 5, 10, BLACK); box(v, -5, 34, 40, 42, 6, 9, (x, y) => (y === 42 ? RD[4] : RD[2])); box(v, -2, 31, 32, 34, 6, 9, RD[2]);
  box(v, 11, 18, 35, 41, 10, 10, BLACK); box(v, 12, 17, 36, 40, 11, 11, hx('#c8a040'));
  for (let x = 4; x < 26; x++) v.set(x, 29 + Math.round(Math.sin(((x - 4) / 22) * Math.PI) * 2), 10, hx('#d8c890'));
  const hx0 = 44;
  shell(v, hx0, hx0 + 19, 0, 15, -14, 0, (x, y, z) => (z === 0 && x > hx0 + 2 && x < hx0 + 17 && y > 2 && y < 12 ? WOOD[2] : WOOD[4]));
  box(o.n, hx0 + 8, hx0 + 11, 5, 8, 1, 1, hx('#ffd070'));
  hipRoof(v, hx0 - 3, hx0 + 22, -17, 3, 16, 0.6, KAWARA, { seed });
  o.w = Math.max(o.w + 4, 70);
  return o;
}
export function fumikiri() {
  const o = out(), v = o.v;
  for (let y = 0; y < 44; y++) box(v, 8, 10, y, y, -1, 1, ((y >> 2) & 1) ? hx('#f0c020') : BLACK);
  for (let k = -9; k <= 9; k++) { v.set(9 + k, 47 + Math.round(k * 0.55), 2, WHITE); v.set(9 + k, 47 - Math.round(k * 0.55), 2, WHITE); }
  for (const lx of [2, 15]) for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.hypot(x - 3, y - 3); if (d < 3.5) { v.set(lx + x, 34 + y, 2, BLACK); if (d < 2.2) o.a.set(lx + x, 34 + y, 3, hx('#ff3a2a')); } }
  for (let k = 0; k < 34; k++) box(v, 12 + Math.round(k * 0.3), 13 + Math.round(k * 0.3), 22 + k, 22 + k, 0, 0, ((k >> 2) & 1) ? hx('#f0c020') : BLACK);
  o.w = 24;
  return o;
}
export function frostFans(n = 3) {
  const o = out(), v = o.v;
  for (let k = 0; k < n; k++) {
    const x = 4 + k * 60;
    box(v, x, x + 2, 0, 64, -1, 1, (xx) => (xx === x + 2 ? ALU[3] : ALU[1]));
    box(v, x - 5, x + 7, 64, 69, -3, 3, (xx, y) => (y === 69 ? ALU[4] : ALU[3]));
    for (let a = 0; a < 32; a++) { const t = (a / 32) * Math.PI * 2; v.set(x + 9, Math.round(66 + Math.sin(t) * 6), Math.round(Math.cos(t) * 6), ALU[2]); }
  }
  o.w = n * 60;
  return o;
}

// ================================================================= the town at dusk
export function cityBlock(seed) {
  const o = out(), v = o.v;
  let x = 0;
  for (let k = 0; k < 3; k++) {
    const kind = h1(seed * 5 + k, 471), w = 48 + Math.floor(h1(seed * 5 + k, 472) * 44);
    if (kind < 0.2) { // a konbini
      const S1 = P('#2aa04a', '#e8403a', '#2a6ad8')[seed % 3], S2 = P('#2a6ad8', '#f0a020', '#ffffff')[seed % 3];
      shell(v, x, x + w - 1, 0, 36, -40, 0, (xx, y, z) => (z === 0 && y < 25 && xx > x + 2 && xx < x + w - 3 ? null : y > 30 ? (y > 33 ? S1 : S2) : hx('#f0f0ec')), { top: true });
      box(o.a, x + 3, x + w - 4, 1, 24, -1, -1, hx('#fff8e8'));
      for (let s2 = x + 5; s2 < x + w - 6; s2 += 7) box(v, s2, s2 + 3, 0, 15, -12, -6, hx('#8a9aa8'));
    } else if (kind < 0.6) { // an apartment block: floors of balconies and windows
      const fl = 3 + Math.floor(h1(seed * 5 + k, 473) * 3), fh = 19, S = SIDINGS[k % SIDINGS.length];
      shell(v, x, x + w - 1, 0, fl * fh + 3, -36, 0, (xx, y) => (y >= fl * fh ? S[3] : S[2]), { top: true });
      for (let f = 0; f < fl; f++) for (let u = x + 4; u < x + w - 12; u += 15) {
        sash(o, u, f * fh + 4, 10, 9, 0, (u * 7 + f + seed) | 0, { lit: 0.6 });
        box(v, u - 2, u + 11, f * fh + 13, f * fh + 15, 1, 5, (xx, y) => (y === f * fh + 15 ? ALU[4] : ALU[2]));
        if (h2(u, f, 476) > 0.6) box(v, u + 1, u + 5, f * fh + 9, f * fh + 14, 4, 4, P('#ff9ab0', '#8ab8ff', '#ffffff', '#ffe070')[(u + f) % 4]);
      }
    } else if (kind < 0.82) { // a row of little shops with vertical neon signs and lanterns
      shell(v, x, x + w - 1, 0, 40, -30, 0, (xx, y) => (y === 40 ? hx('#dccdb4') : hx('#c8b8a0')), { top: true });
      for (let s2 = 0; s2 + 20 <= w; s2 += 20) {
        box(v, x + s2 + 2, x + s2 + 17, 0, 16, 0, 0, () => null); box(v, x + s2 + 2, x + s2 + 17, 0, 16, -1, -1, hx('#a08a6a'));
        box(o.n, x + s2 + 2, x + s2 + 17, 0, 16, -1, -1, hx('#ffe0a8'));
        box(v, x + s2 + 1, x + s2 + 18, 17, 19, 1, 4, P('#c83a32', '#2a5aa8', '#3a8a4a')[(s2 >> 2) % 3]);
        box(o.a, x + s2 + 6, x + s2 + 12, 21, 37, 2, 3, P('#ff4a6a', '#ffd040', '#40d0ff', '#ff8a30', '#7aff8a')[(s2 + seed) % 5]);
        for (let y = 23; y < 36; y += 4) box(o.a, x + s2 + 8, x + s2 + 10, y, y + 1, 4, 4, WHITE);
      }
    } else { // a pachinko parlour
      shell(v, x, x + w - 1, 0, 46, -40, 0, hx('#2a2a3a'), { top: true });
      for (let y = 24; y < 44; y++) for (let u = x + 2; u < x + w - 2; u++) if ((u + y) % 3 === 0) o.a.set(u, y, 1, P('#ff3a8a', '#ffd03a', '#3ad0ff')[((u >> 2) + y) % 3]);
      box(o.a, x + 4, x + w - 5, 0, 17, 1, 1, hx('#fff0d0'));
    }
    // a streetlight
    const lx = x + w - 4;
    box(v, lx, lx + 1, 0, 54, 8, 9, ALU[1]); box(v, lx - 9, lx, 54, 55, 8, 9, ALU[1]); box(o.n, lx - 12, lx - 7, 52, 53, 8, 9, hx('#fff4c8'));
    x += w + 3;
  }
  o.w = x;
  return o;
}

// ================================================================= the far plain (small things)
export function miniHouse(seed) {
  const o = out(), v = o.v;
  const r = (k) => h1(seed, k);
  const W = 15 + Math.floor(r(1) * 12), H = 7 + Math.floor(r(2) * 6), D = 12;
  const S = SIDINGS[Math.floor(r(4) * SIDINGS.length)];
  const R = r(5) < 0.6 ? KAWARA : r(5) < 0.8 ? SLATE : TIN[['red', 'blue', 'green'][Math.floor(r(6) * 3)]];
  shell(v, 0, W - 1, 0, H - 1, -D + 1, 0, (x, y, z) => (x === W - 1 ? S[3] : S[2]), { top: false });
  box(v, 2, Math.min(7, W - 7), H - 4, H - 3, 0, 0, hx('#4a5a74'));
  if (r(9) > 0.4) box(o.n, 2, Math.min(7, W - 7), H - 4, H - 3, 1, 1, hx('#ffd890'));
  box(v, W - 5, W - 3, 0, 4, 0, 0, WOOD[2]);
  hipRoof(v, -2, W + 1, -D - 2, 2, H, 0.6, R, { tin: R !== KAWARA && R !== SLATE, noshi: false, seed });
  o.w = W;
  return o;
}
export function miniGreenhouses(seed, n = 3) {
  const o = out(), v = o.v;
  for (let k = 0; k < n; k++) for (let x = 0; x < 13; x++) {
    const t = (x - 6) / 6.6, top = Math.round(8 * Math.sqrt(Math.max(0, 1 - t * t)));
    for (let z = -26; z <= 0; z++) { v.set(k * 15 + x, top, z, z % 6 === 0 ? hx('#c4ced2') : t > 0.3 ? hx('#eef2f2') : hx('#dce6e8')); if (z === 0) for (let y = 0; y < top; y++) v.set(k * 15 + x, y, 0, x % 4 === 0 ? hx('#c4ced2') : hx('#e2eaea')); }
  }
  o.w = n * 15;
  return o;
}
export function copse(seed, w = 40) {
  const o = out(), v = o.v;
  const n = Math.max(2, Math.round(w / 9));
  for (let k = 0; k < n; k++) {
    const cx = (k + 0.5) * (w / n), h = 12 + h1(seed, k) * 10, rr = 5 + h1(seed, k + 9) * 3;
    crown(v, cx, h, -rr - 2, rr, rr * 0.9, rr, h1(seed, k + 20) < 0.3 ? LEAF_Y : LEAF, seed + k * 13, { n: 3 });
    box(v, Math.round(cx) - 1, Math.round(cx), 0, Math.round(h - rr * 0.6), -Math.round(rr) - 3, -Math.round(rr) - 2, BARK[2]);
  }
  o.w = w;
  return o;
}
export function miniCedars(seed, n = 5) {
  const o = cedars(seed, n, 34);
  return o;
}
export function miniFans(seed) {
  const o = out(), v = o.v;
  for (let k = 0; k < 3; k++) { const x = 3 + k * 26; box(v, x, x, 0, 18, 0, 0, ALU[1]); box(v, x - 2, x + 2, 18, 20, -1, 1, ALU[3]); }
  o.w = 60;
  return o;
}

// ================================================================= ground chunks
// Raked so their tops face the window: fields step up as they go back.
// near: fields z 0..-119 (three paddies deep, rows of rice), the farm lane
// z -120..-135, the house lots behind. len voxels long.
export const NEAR = { len: 240, laneZ: -120, lotZ: -136, depth: 200, lotY: 26, rake: 0.21 };
export function nearGround(kind, seed) {
  const o = out(), v = o.v;
  const { len, laneZ, lotZ, depth, lotY, rake } = NEAR;
  const rows = [[0, -34], [-35, -74], [-75, -119]];
  const kinds = rows.map((_, i) => fieldKind(kind, h1(seed, i)));
  const city = kind === 'city', gravel = kind === 'mountain' || kind === 'valley';
  for (let x = 0; x < len; x++) {
    for (let z = 0; z >= -depth; z--) {
      let y, c, h = 0;
      if (city) { // a town street: sidewalk, road with its lines, the far sidewalk
        y = Math.floor(-Math.min(z, -1) * 0.12);
        if (z > -20 || z < -110) { y = z > -20 ? 1 : 14; c = ((x >> 3) + (z >> 3)) & 1 ? CONC[3] : CONC[4]; }
        else { y = 6 + Math.floor((-20 - z) * 0.09); c = (z === -64 || z === -65) && x % 24 < 12 ? hx('#e8e4d8') : pick(ASPH, 0.4 + (h2(x >> 1, z >> 1, seed) - 0.5) * 0.4); }
        if (z <= laneZ) { y = lotY; c = (x + z) % 9 === 0 ? CONC[2] : CONC[3]; }
      } else if (z > laneZ) {
        y = Math.floor(-z * rake);
        const ri = rows.findIndex(([a, b]) => z <= a && z >= b);
        const [za, zb] = rows[ri];
        const fk = kinds[ri];
        const ridge = z >= za - 1 || z <= zb + 1 || x < 2;
        if (ridge) { c = pick(AZE, z === za || x === 0 ? 0.85 : 0.5); h = (z === za || z === zb) && x % 5 === 0 ? 1 : 0; y += 1; }
        else ({ c, h } = fieldCol(fk, x, z, za, seed));
      } else if (z > lotZ) { // the lane
        y = lotY - 1;
        if (gravel) c = h2(x, z, seed) > 0.8 ? hx('#a49a86') : hx('#8e8270');
        else c = z === laneZ - 1 || z === laneZ - 2 ? hx('#e8e6de') : pick(ASPH, 0.45 + (h2(x, z, seed) - 0.5) * 0.4);
      } else { // the lots: gravel, a little soil, garden green
        y = lotY;
        const g = n2(x / 14, z / 9, seed + 3);
        c = g > 0.62 ? pick(GRASS, 0.5 + (h2(x, z, 4) - 0.5) * 0.4) : h2(x, z, seed) > 0.85 ? hx('#b0a690') : hx('#9a8e78');
      }
      v.set(x, y, z, c);
      v.set(x, y - 1, z, shc(c, 0.8));
      for (let k = 1; k <= h; k++) v.set(x, y + k, z, fieldTop(c, k, h));
    }
  }
  o.w = len;
  return o;
}
function fieldKind(seg, r) {
  if (seg === 'tea') return r < 0.8 ? 'tea' : 'rice';
  if (seg === 'farm') return r < 0.3 ? 'cabbage' : r < 0.55 ? 'negi' : r < 0.85 ? 'rice' : 'soil';
  if (seg === 'mountain') return 'grass';
  return r < 0.85 ? 'rice' : r < 0.94 ? 'cabbage' : 'negi';
}
// one column of a field: { c: ground colour, h: how many voxels of plant on top }
function fieldCol(kind, x, z, za, seed) {
  const d = za - z;
  switch (kind) {
    case 'rice': {
      // rows of rice every three voxels, clumps of varying height, lit tips
      if (d % 3 !== 1) return { c: RICE[1], h: 0 };
      const hh = 2 + Math.floor(n1(x / 5 + z * 0.37, seed) * 3);
      return { c: RICE[2], h: hh, rice: true };
    }
    case 'tea': { const k = d % 9; if (k < 2) return { c: SOIL[1], h: 0 }; return { c: TEA[2], h: k === 2 || k === 8 ? 4 : 6 }; }
    case 'cabbage': { const k = d % 6, cx = (x + Math.floor(d / 6) * 3) % 6; if (k > 3 || cx > 3) return { c: SOIL[1 + ((x + z) & 1)], h: 0 }; return { c: CABB[2], h: k === 0 || k === 3 || cx === 0 || cx === 3 ? 1 : 2 }; }
    case 'negi': { const k = d % 4; if (k > 1) return { c: SOIL[1], h: 0 }; return { c: PLASTER[3], h: 4 + ((x * 3 + z) % 2) }; }
    case 'grass': return { c: pick(GRASS, 0.4 + (h2(x, z, seed) - 0.5) * 0.4), h: h2(x * 3, z, seed + 1) > 0.7 ? 1 + Math.floor(h2(x, z, 7) * 3) : 0 };
    default: return { c: (d & 1) ? SOIL[1] : SOIL[3], h: 0 };
  }
}
function fieldTop(c, k, h) {
  if (c === RICE[2]) return k === h ? RICE[6] : k === h - 1 ? RICE[4] : RICE[3];
  if (c === TEA[2]) return k === h ? TEA[5] : k >= h - 1 ? TEA[4] : TEA[2];
  if (c === CABB[2]) return k === h ? CABB[4] : CABB[3];
  if (c === PLASTER[3]) return k >= h - 1 ? CABB[3] : k >= 2 ? CABB[2] : PLASTER[4];
  return GRASS[3 + Math.min(2, k)];
}
// the far plain: shallow fields, then the lots where the hamlets stand
export const MID = { len: 240, lotZ: -110, depth: 160, lotY: 11, rake: 0.09 };
export function midGround(kind, seed) {
  const o = out(), v = o.v;
  const { len, lotZ, depth, lotY, rake } = MID;
  for (let x = 0; x < len; x++) for (let z = 0; z >= -depth; z--) {
    let y, c, h = 0;
    if (kind === 'city') { y = z > lotZ ? Math.floor(-z * rake) : lotY; c = (x % 20 === 0 || z % 16 === 0) ? ASPH[1] : CONC[2 + ((x + z) & 1)]; }
    else if (z > lotZ) {
      y = Math.floor(-z * rake);
      const fi = Math.floor(-z / 28), fz = (-z) % 28;
      const fk = fieldKind(kind, h1(seed * 13 + fi, Math.floor(x / 80)));
      if (fz === 0 || x % 80 === 0) c = AZE[3];
      else if (fk === 'rice') { c = fz % 2 ? RICE[2] : RICE[4]; h = fz % 2 ? 0 : 1; }
      else if (fk === 'tea') { c = fz % 3 ? TEA[3] : TEA[1]; h = fz % 3 ? 1 : 0; }
      else if (fk === 'cabbage' || fk === 'negi') c = fz % 2 ? SOIL[2] : CABB[3];
      else if (fk === 'grass') c = pick(GRASS, 0.45 + (h2(x >> 1, z, seed) - 0.5) * 0.4);
      else c = fz % 2 ? SOIL[2] : SOIL[3];
    } else { y = lotY; c = n2(x / 12, z / 8, seed + 5) > 0.55 ? GRASS[2] : hx('#8e8470'); }
    v.set(x, y, z, c); v.set(x, y - 1, z, shc(c, 0.8));
    for (let k = 1; k <= h; k++) v.set(x, y + k, z, c === TEA[3] ? TEA[4] : RICE[5]);
  }
  o.w = len;
  return o;
}
// the railway embankment: a grassy berm rising to the concrete cable trough
// along the track, tufts of grass leaning in the wind, a flower or two; in
// town a noise barrier wall stands on top
export const BANK = { len: 240, depth: 34, top: 22 };
export function bankGround(kind, seed) {
  const o = out(), v = o.v;
  const { len, depth, top } = BANK;
  const barrier = kind === 'city';
  for (let x = 0; x < len; x++) for (let z = 0; z >= -depth; z--) {
    if (z > -27) {
      const y = Math.floor(-z * (top / 26));
      const c = pick(GRASS, 0.45 + (n2(x / 6, z / 3, seed) - 0.5) * 0.5);
      v.set(x, y, z, c); v.set(x, y - 1, z, GRASS[0]); v.set(x, y - 2, z, GRASS[0]);
      const t = h2(x, z, seed + 1);
      if (t > 0.72) { const hh = 1 + Math.floor(h2(x * 3, z, seed + 2) * 6); for (let k = 1; k <= hh; k++) v.set(x - Math.floor(k / 3), y + k, z, k === hh ? GRASS[5] : GRASS[3 + (k & 1)]); }
      else if (t < 0.006) v.set(x, y + 1, z, [WHITE, hx('#ffe060'), hx('#c8a0f0')][Math.floor(h2(x, z, 3) * 3)]);
    } else {
      // the cable trough: a concrete U with lids, seams every 60
      const y0 = top;
      const lid = z >= -31;
      for (let y = y0 - 2; y <= y0 + (lid ? 3 : 2); y++) v.set(x, y, z, y === y0 + 3 ? (x % 60 === 0 ? CONC[1] : CONC[5]) : CONC[2]);
      if (barrier && z === -depth) for (let y = y0 + 3; y < y0 + 30; y++) v.set(x, y, z, x % 48 === 0 ? CONC[0] : y > y0 + 16 && y < y0 + 26 ? hx("#9ab8c8") : y === y0 + 29 ? CONC[5] : CONC[3]);
    }
  }
  o.w = len;
  return o;
}
