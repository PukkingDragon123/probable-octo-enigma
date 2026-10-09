// Character crafting kit, in The Bear Must Eat's style: every character is a
// hand-made set of small voxel models (0.05 m voxels, fine 0.025 m voxels for
// glasses, charms, laces), built from rounded boxes and ellipsoids with
// designed colour zones and 3-5 tone palettes (shade: violet-ish dark, warm
// light), a sprinkle of per-voxel tone noise, and accessories with volume.
//
// A design (see src/entities/cast/*.js) returns:
//   {
//     dims:  { legLen, hipX, thigh, shoulderX, shoulderY, chestY, neckY, headScale, tailAt:[y, z], carryZ },
//     pelvis, torso, thigh, shin (or thighL/R, shinL/R), upper, fore (or upperL/R, foreL/R),
//     hands: { relax: [L, R], fist: [L, R], open: [L, R], point: [L, R] },
//     head, ears: [{ model, at: [x, y, z], side, kind }], tail: [segment models],
//     hood: model (on the head, toggled), hoodDown: model (on the chest, the opposite),
//     extras: [{ joint, model, at, pivot, scale, rot, spring: { k, damp, amp, axis }, name, hidden }],
//     face: { box: {x0,x1,y0,y1,z0,z1}, faceZ, snout: { z, y, h, beak, w } | null, cfg: {...Face style} },
//   }
// Units: voxels. Joints place models so their local origin is the pivot.
import { VoxelModel } from '../vox/voxel.js';
import { rbox, ell, tone, hash3 } from '../vox/kit.js';

export { VoxelModel, rbox, ell, tone, hash3 };
export const V5 = 0.05, FV = 0.025;

// ---------------------------------------------------------------- colour helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function rgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
export function hexOf(r, g, b) { return (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255); }
export function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return hexOf(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
export function sh(c, f) { const A = rgb(c); return hexOf(A[0] * f, A[1] * f, A[2] * f); }
// hue-shifted ramp around a base colour: shadows drift to violet, lights to warm cream
const SHADOW = 0x3a2450, LIGHT = 0xfff0c8;
export function ramp5(base, { dark = 0.22, light = 0.2 } = {}) {
  return {
    b: base,
    d: mixc(sh(base, 0.86), SHADOW, dark * 0.45),
    dd: mixc(sh(base, 0.7), SHADOW, dark),
    l: mixc(sh(base, 1.08), LIGHT, light * 0.45),
    ll: mixc(sh(base, 1.16), LIGHT, light),
  };
}
// per-voxel material: base with a few dark / light voxels (TBME's tone)
export const T = (R, pd = 0.1, pl = 0.08) => (x, y, z) => tone(x, y, z, R.b, R.d, R.l, pd, pl);
// shaded by height inside a part: top light, bottom dark band (reads as form)
export const Tz = (R, yTop, yBot, pd = 0.08, pl = 0.06) => (x, y, z) => (y >= yTop ? tone(x, y, z, R.l, R.b, R.ll, 0.2, 0.06) : y <= yBot ? tone(x, y, z, R.d, R.dd, R.b, 0.15, 0.08) : tone(x, y, z, R.b, R.d, R.l, pd, pl));

// ---------------------------------------------------------------- model helpers
export function box(v, x0, x1, y0, y1, z0, z1, c) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const col = typeof c === 'function' ? c(x, y, z) : c;
    if (col !== undefined) v.set(x, y, z, col);
  }
  return v;
}
export const vnew = () => new VoxelModel();
/** mirror a model across x (voxel centre x -> -x-1) */
export function mirror(m) {
  const o = new VoxelModel();
  for (const [k, c] of m.vox) { const x = (k & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = ((k >> 20) & 1023) - 512; o.set(-x - 1, y, z, c); }
  return o;
}
/** recolour voxels of a model that pass a test */
export function paint(m, fn) {
  for (const [k, c] of [...m.vox]) {
    const x = (k & 1023) - 512, y = ((k >> 10) & 1023) - 512, z = ((k >> 20) & 1023) - 512;
    const n = fn(x, y, z, c);
    if (n !== undefined) m.set(x, y, z, n);
  }
  return m;
}
/** voxel line (Bresenham-ish), thickness 1 */
export function line3(v, a, b, c) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), typeof c === 'function' ? c(i, n) : c);
  }
  return v;
}
/** top surface y at (x, z) of a model, or null */
export function topAt(v, x, z, from = 40, to = -40) { for (let y = from; y >= to; y--) if (v.has(x, y, z)) return y; return null; }

// ---------------------------------------------------------------- shared limbs
/** a mitten hand (relax / fist / open / point), pivot at the wrist, hangs along -y; thumb side `inner` (+1 = +x) */
export function hand(kind, inner, col, { pad = null, claws = null, w = 1, sleeve = null } = {}) {
  const v = new VoxelModel();
  const S = typeof col === 'function' ? col : (x, y, z) => col;
  const X = (x) => x * inner;
  if (kind === 'fist') {
    rbox(v, -1, w, -3, 0, -1, 1, 0.8, S);
    v.set(X(2), -2, 0, S(2, -2, 0)); v.set(X(2), -2, 1, S(2, -2, 1));
    if (claws) for (const x of [-1, 0, 1]) v.set(x, -3, 2, claws);
  } else if (kind === 'open') {
    rbox(v, -1, w, -2, 0, -1, 1, 0.6, S);
    for (const x of [-1, 0, 1]) { v.set(x, -3, 0, S(x, -3, 0)); v.set(x, -4, 0, claws ?? S(x, -4, 0)); }
    v.set(X(2), -1, 1, S(2, -1, 1)); v.set(X(2), -2, 1, S(2, -2, 1));
    if (pad != null) for (let y = -2; y <= 0; y++) v.set(0, y, 1, pad);
  } else if (kind === 'point') {
    rbox(v, -1, w, -3, 0, -1, 1, 0.8, S);
    v.set(X(1), -4, 1, S(1, -4, 1)); v.set(X(1), -5, 1, S(1, -5, 1)); v.set(X(1), -6, 1, claws ?? S(1, -6, 1));
    v.set(X(2), -2, 0, S(2, -2, 0));
  } else {
    rbox(v, -1, w, -3, 0, -1, 1, 0.9, S);
    v.set(X(2), -1, 1, S(2, -1, 1)); v.set(X(2), -2, 1, S(2, -2, 1));
    if (claws) for (const x of [-1, 0, 1]) v.set(x, -4, 1, claws);
  }
  if (sleeve) { for (let x = -2; x <= w + 1; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x - (w - 1) / 2) + Math.abs(z) < 3.6) v.set(x, 1, z, sleeve); }
  return v;
}
export function handSet(col, o = {}) {
  const out = {};
  for (const k of ['relax', 'fist', 'open', 'point']) out[k] = [hand(k, 1, col, o), hand(k, -1, col, o)];
  return out;
}
/** sneaker / shoe on the bottom of a shin model: sole at y0, toe towards +z */
export function shoe(v, { x0 = -2, x1 = 1, y0 = 0, z0 = -2, z1 = 3, upper, sole, stripe = null, lace = null, toe = null, h = 2 }) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    v.set(x, y0, z, sole);
    for (let y = y0 + 1; y <= y0 + h; y++) {
      if (z === z1 && y === y0 + h) continue; // rounded toe
      let c = typeof upper === 'function' ? upper(x, y, z) : upper;
      if (stripe != null && (x === x0 || x === x1) && y === y0 + 1 && z > z0 && z < z1 - 1) c = stripe;
      if (toe != null && z >= z1 - 1 && y === y0 + 1) c = toe;
      v.set(x, y, z, c);
    }
  }
  if (lace != null) for (let z = z0 + 2; z <= z1 - 1; z += 1) v.set(Math.round((x0 + x1) / 2), y0 + h + (z < z1 - 1 ? 0 : -1), z, z % 2 ? lace : upper instanceof Function ? upper(0, 0, z) : upper);
  return v;
}

// ---------------------------------------------------------------- accessories (fine voxels unless noted)
/** round wire glasses, centred between the eyes; eyes at x = ±dx (fine voxels), radius r. Lens glint is a plane added by the rig. */
export function roundGlasses({ frame = 0x6a4a2a, dx = 7, r = 4.2, bridge = true, temples = 10 } = {}) {
  const v = new VoxelModel();
  for (const s of [-1, 1]) {
    const cx = s * dx;
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      v.set(Math.round(cx + Math.cos(t) * r - 0.5), Math.round(Math.sin(t) * r * 0.92 - 0.5), 0, frame);
    }
    // temple arms going back along the head sides
    for (let z = -1; z >= -temples; z--) v.set(Math.round(cx + s * (r + 0.5)), 0, z, frame);
  }
  if (bridge) for (let x = -Math.round(dx - r); x <= Math.round(dx - r) - 1; x++) v.set(x, 1, 0, frame);
  return v;
}
/** a little earbud (white) */
export function earbud(col = 0xf6f6f8) {
  const v = new VoxelModel();
  rbox(v, -1, 1, -1, 1, -1, 1, 0.8, col);
  v.set(0, -2, 0, col); v.set(0, -3, 0, col);
  return v;
}
/** a dangling cable from a to b with sag (fine voxels) */
export function cable(a, b, sag = 4, col = 0xeceef2) {
  const v = new VoxelModel();
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    v.set(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag), Math.round(a[2] + (b[2] - a[2]) * t), col);
  }
  return v;
}
/** a fishing bobber charm on a short cord (fine voxels), pivot at the top of the cord */
export function bobberCharm() {
  const v = new VoxelModel();
  for (let y = 0; y >= -5; y--) v.set(0, y, 0, 0x3a2a24);
  ell(v, 0.5, -9, 0.5, 2.6, 3.4, 2.6, (x, y, z) => (y >= -9 ? (y === -9 ? 0xf8f4ec : 0xe8402e) : 0xf8f4ec));
  v.set(0, -6, 0, 0x2a2228); v.set(0, -13, 0, 0x2a2228);
  v.set(-1, -8, 1, 0xff8a70);
  return v;
}
/** a brass key ring with keys and the spirit charm (fine voxels), pivot at the ring top */
export function keyRing({ charm = true } = {}) {
  const v = new VoxelModel();
  const brass = 0xd8a840, brassD = 0x9a7020, brassL = 0xf8d880;
  for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; v.set(Math.round(Math.cos(t) * 3.2), Math.round(-3 + Math.sin(t) * 3.2), 0, a % 7 ? brass : brassL); }
  // two old keys
  const key = (x0, len, col) => {
    for (let y = -6; y >= -6 - len; y--) v.set(x0, y, 0, col);
    v.set(x0 + 1, -6 - len, 0, col); v.set(x0 + 1, -4 - len, 0, col);
    for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; v.set(Math.round(x0 + Math.cos(t) * 1.6), Math.round(-5 + Math.sin(t) * 1.6), 0, col); }
  };
  key(-2, 7, brassD); key(2, 9, brass);
  if (charm) {
    // the kodama charm: a little white round spirit with a leaf sprout
    ell(v, 0.5, -15, 0.5, 2.8, 2.8, 2.2, (x, y, z) => (z >= 1 && y === -15 && (x === -1 || x === 1) ? 0x2a2a34 : 0xf8f6f0));
    v.set(0, -11, 0, 0x6ab04a); v.set(1, -10, 0, 0x8ad060); v.set(-1, -10, 0, 0x6ab04a);
    for (let y = -7; y >= -12; y--) if (!v.has(0, y, 0)) v.set(0, y, -1, 0xe84a3a); // red cord
  }
  return v;
}
/** smartphone (fine voxels), screen facing +z */
export function phoneModel(col = 0x2a2a34) {
  const v = new VoxelModel();
  rbox(v, -3, 2, -5, 5, 0, 1, 0.6, col);
  for (let x = -2; x <= 1; x++) for (let y = -4; y <= 4; y++) v.set(x, y, 2, 0x4a6ab0);
  return v;
}
/** woven straw hat (0.05 voxels): brim radius R, crown height h, band colour */
export function strawHat({ R = 9, h = 4, band = 0xc8402e, col = 0xe8c87a } = {}) {
  const v = new VoxelModel();
  const D = sh(col, 0.82), L = sh(col, 1.08);
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (d > R) continue;
    v.set(x, 0, z, (Math.round(d) + (x & 1)) % 3 === 0 ? D : col);
    if (d > R - 1.2) v.set(x, 1, z, D);
  }
  const r = R * 0.55;
  for (let y = 1; y <= h; y++) for (let x = -Math.ceil(r); x < Math.ceil(r); x++) for (let z = -Math.ceil(r); z < Math.ceil(r); z++) {
    const d = Math.hypot(x + 0.5, z + 0.5), rr = r - (y === h ? 1 : 0);
    if (d > rr) continue;
    v.set(x, y, z, y <= 2 && d > rr - 1.2 ? band : y === h ? L : (x + y) % 3 === 0 ? D : col);
  }
  return v;
}
