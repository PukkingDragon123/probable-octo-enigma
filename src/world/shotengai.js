// Kodama Ginza shop buildings: a two-storey facade kit for a covered
// shotengai. Each building is voxels (0.05 m) with pixel-art planes for the
// signs, curtains, posters and displays. Origin = bottom centre of the ground-
// floor front plane, the building extends to -z, the street is +z.
//
//   shopFacade({ w, wall, wallKind, front, awning, sign, vsign, upper, ... })
//     front:  'open' | 'shutter' | 'glass' | 'koshi'
//     upper:  'flush' | 'balcony'
//   -> THREE.Group, userData { width, stage: {x0,x1,z0,z1} (open floor inside),
//      shutter (mesh, rolls up via scale.y), lights: [{x,z,col}] for spill pools }
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, sh, mixc, tone, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { valance, shopPoster } from './shopSigns.js';
import { glassPane } from './station.js';
import { emitMat } from '../core/materials.js';

const grp = (...kids) => { const g = new THREE.Group(); for (const k of kids) if (k) g.add(k); return g; };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export const H1 = 52, FB = 12; // ground floor height, fascia band (voxels)

// ---------------------------------------------------------------- wall materials
export function wallFn(kind, base, seed = 1) {
  const D = sh(base, 0.9), L = sh(base, 1.05), G = sh(base, 0.78);
  switch (kind) {
    case 'tile': return (x, y, z) => {
      if (((x + 300) % 3 === 0) || (y % 3 === 0)) return sh(base, 0.82);
      const h = hash3(Math.floor((x + 300) / 3), Math.floor(y / 3), seed);
      return h < 0.18 ? D : h > 0.86 ? L : base;
    };
    case 'wood': return (x, y, z) => {
      if (y % 4 === 0) return G;
      const h = hash3(0, Math.floor(y / 4), seed), k = hash3(x, y, seed);
      return k < 0.06 ? sh(base, 0.86) : h < 0.3 ? sh(base, 0.95) : h > 0.75 ? sh(base, 1.06) : base;
    };
    case 'metal': return (x, y, z) => {
      const rib = (x + 300) % 3 === 0 ? sh(base, 0.82) : (x + 300) % 3 === 1 ? sh(base, 1.06) : base;
      const rust = hash3(x >> 1, y >> 2, seed) < 0.05 + Math.max(0, (20 - y) / 200) ? 0x9a5a3a : null;
      return rust ?? rib;
    };
    case 'brick': return (x, y, z) => {
      if (y % 3 === 0) return 0xc8bca8;
      const off = (Math.floor(y / 3) % 2) * 3;
      if ((x + 300 + off) % 6 === 0) return 0xc8bca8;
      const h = hash3(Math.floor((x + 300 + off) / 6), Math.floor(y / 3), seed);
      return h < 0.25 ? D : h > 0.8 ? L : base;
    };
    default: return (x, y, z) => { // mortar: subtle tone + grime streaks under ledges
      const streak = hash3(x, 0, seed) < 0.07 && hash3(x, y >> 3, seed + 1) < 0.6;
      return streak ? sh(base, 0.92) : tone(x, y, z, base, D, L, 0.1, 0.07);
    };
  }
}

// ---------------------------------------------------------------- pixel windows
// a window as seen from the street: glass, curtains (or blinds / shoji), a
// glare streak; lit windows glow warm through the curtain
function windowTex(wpx, hpx, { col = '#e8d8b8', seed = 1, lit = false, kind = 'curtain' } = {}) {
  const p = new PixCanvas(wpx, hpx, 1600 + seed);
  const glass = lit ? '#ffd890' : '#34404e';
  p.rect(0, 0, wpx, hpx, glass);
  if (lit) for (let y = 0; y < hpx; y++) p.hline(0, wpx - 1, y, mix('#ffe8b0', '#f8b860', y / hpx));
  if (kind === 'shoji') {
    p.rect(0, 0, wpx, hpx, lit ? '#fff0c8' : '#e8e0cc');
    for (let x = 0; x < wpx; x += 8) p.vline(x, 0, hpx - 1, '#6a4a32');
    for (let y = 0; y < hpx; y += 10) p.hline(0, wpx - 1, y, '#6a4a32');
  } else if (kind === 'blinds') {
    for (let y = 0; y < hpx * 0.7; y += 3) { p.hline(0, wpx - 1, y, lit ? '#fff4d8' : '#c8ccd0'); p.hline(0, wpx - 1, y + 1, lit ? '#f0d8a8' : '#a8acb4'); }
  } else {
    const open = 0.25 + (seed % 5) * 0.1, cw = Math.round(wpx * (1 - open) / 2);
    const c = lit ? lighten(col, 0.35) : col;
    for (const [x0, x1] of [[0, cw], [wpx - cw, wpx]]) for (let x = x0; x < x1; x++) p.vline(x, 0, hpx - 1, (x - x0) % 4 === 0 ? darken(c, 0.18) : c);
    if (seed % 3 === 0) for (const [x0, x1] of [[0, cw], [wpx - cw, wpx]]) for (let y = 4; y < hpx; y += 7) for (let x = x0 + 2; x < x1 - 1; x += 5) p.px(x, y, darken(c, 0.32));
    // something on the sill: a plant, a cat silhouette, a doll
    const k = seed % 4;
    if (k === 0) { p.rect(wpx / 2 - 3, hpx - 6, 6, 5, '#c87a4a'); p.circle(wpx / 2, hpx - 9, 4, '#4a8a3a'); }
    else if (k === 1) { p.ellipse(wpx / 2, hpx - 4, 5, 3, '#2a2028'); p.circle(wpx / 2 + 4, hpx - 7, 2.5, '#2a2028'); p.px(wpx / 2 + 3, hpx - 10, '#2a2028'); p.px(wpx / 2 + 5, hpx - 10, '#2a2028'); }
    else if (k === 2 && lit) { p.circle(wpx / 2, hpx * 0.3, 3, '#fff8e0'); }
  }
  // frame shadow + glare
  p.rect(0, 0, wpx, 2, 'rgba(20,16,30,0.35)');
  for (let i = -hpx; i < wpx; i += 26) for (let k = 0; k < hpx; k++) { p.px(i + k, hpx - 1 - k, 'rgba(255,255,255,0.18)'); p.px(i + k + 2, hpx - 1 - k, 'rgba(255,255,255,0.1)'); }
  return p;
}

// ---------------------------------------------------------------- small bits
export function acUnit() {
  const v = new VoxelModel();
  fill(v, 0, 15, 0, 11, 0, 5, (x, y, z) => (y === 11 ? 0xf4f4f0 : x === 15 ? 0xc8c8c4 : 0xe4e4e0));
  for (let x = 2; x <= 9; x++) for (let y = 2; y <= 9; y++) { const d = Math.hypot(x - 5.5, y - 5.5); if (d < 4) v.set(x, y, 6, d < 1.2 ? 0x9a9aa0 : (Math.floor(d * 2) % 2 ? 0x4a4a52 : 0x6a6a72)); }
  for (let y = 2; y <= 9; y += 2) fill(v, 11, 14, y, y, 6, 6, 0xb8b8b4);
  fill(v, 1, 1, -3, -1, 1, 4, 0x6a6a72); fill(v, 14, 14, -3, -1, 1, 4, 0x6a6a72); // feet
  fill(v, 15, 15, 4, 18, 2, 2, 0xf0f0ea); // insulated pipe
  return vm(v, V5);
}
function laundry(len, seed = 1) {
  const v = new VoxelModel();
  for (let x = 0; x < len; x++) v.set(x, 0, 0, 0xa8acb4);
  const cols = [0xf4f4f0, 0x8ab8e8, 0xf0a0b0, 0xf0d060, 0x6a8a5a, 0xe86a4a, 0x3a4a6a];
  let x = 2;
  while (x < len - 8) {
    const c = cols[Math.floor(hash3(x, seed, 3) * cols.length)];
    const kind = hash3(x, seed, 4);
    if (kind < 0.4) { fill(v, x, x + 6, -9, -1, 0, 0, c); fill(v, x - 1, x + 7, -3, -1, 0, 0, c); x += 10; } // shirt
    else if (kind < 0.7) { fill(v, x, x + 4, -11, -1, 0, 0, c); for (let y = -11; y < -1; y += 3) fill(v, x, x + 4, y, y, 0, 0, sh(c, 0.85)); x += 7; } // towel
    else { fill(v, x, x + 2, -6, -1, 0, 0, c); fill(v, x + 4, x + 6, -6, -1, 0, 0, c); fill(v, x, x + 6, -1, -1, 0, 0, sh(c, 0.9)); x += 9; } // socks pair
  }
  return v;
}
function futon(w, col) {
  const v = new VoxelModel();
  for (let x = 0; x < w; x++) for (let y = -14; y <= 0; y++) {
    const pat = ((x >> 2) + (y >> 2)) & 1;
    v.set(x, y, 1, pat ? col : sh(col, 0.9)); v.set(x, y, -1, sh(col, 0.85));
  }
  for (let x = 0; x < w; x++) v.set(x, 1, 0, col);
  return v;
}
// a little potted plant (pot + leafy ball) in fine voxels
export function pottedPlant(seed = 1, { pot = 0xc87a4a, leaf = 0x4a8a3a, big = false } = {}) {
  const v = new VoxelModel();
  const r = big ? 5 : 3;
  for (let y = 0; y < r * 2; y++) for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= (r - (y < 2 ? 1 : 0)) ** 2) v.set(x, y, z, y === r * 2 - 1 ? sh(pot, 1.1) : pot);
  ell(v, 0.5, r * 2 + r * 1.2, 0.5, r * 1.5, r * 1.4, r * 1.5, (x, y, z) => { const h = hash3(x, y, z + seed); return h < 0.25 ? sh(leaf, 0.8) : h > 0.85 ? sh(leaf, 1.25) : leaf; });
  return vm(v, V25, [0.5, 0, 0.5]);
}

// ---------------------------------------------------------------- the facade
export function shopFacade(o = {}) {
  const W = o.w ?? 96, D = o.depth ?? 64;
  const H2 = o.h2 ?? 56, top = H1 + FB + H2; // cornice starts at `top`
  const seed = o.seed ?? 1;
  const wall = o.wall ?? 0xe8dcc4, wk = o.wallKind ?? 'mortar';
  const WF = wallFn(wk, wall, seed);
  const fasc = o.fascia ?? sh(wall, 0.8);
  const pillar = o.pillar ?? (wk === 'wood' ? 0x5a3a26 : sh(wall, 0.86));
  const x0 = -W / 2, x1 = W / 2 - 1;
  const v = new VoxelModel(), glow = new VoxelModel();
  const g = grp();
  const onU = o.onU;
  g.userData = { width: W * V5, lights: [], stage: null };

  // ---- shell: side walls, back wall (ground floor), ceiling slab, roof slab
  fill(v, x0, x0 + 1, 0, top + 3, -D, 0, (x, y, z) => (z > -3 ? pillar : sh(wall, 0.8)));
  fill(v, x1 - 1, x1, 0, top + 3, -D, 0, (x, y, z) => (z > -3 ? pillar : sh(wall, 0.75)));
  fill(v, x0 + 2, x1 - 2, H1, H1 + 1, -D, -1, sh(wall, 0.7));
  fill(v, x0, x1, top + 4, top + 4, -D, 1, sh(wall, 0.7));
  // ground floor pillars (front)
  fill(v, x0, x0 + 2, 0, H1 - 1, -2, 0, (x, y, z) => (y < 3 ? 0x6a6a6e : pillar));
  fill(v, x1 - 2, x1, 0, H1 - 1, -2, 0, (x, y, z) => (y < 3 ? 0x6a6a6e : pillar));
  // fascia band (sign board mount) + a thin drip edge
  fill(v, x0, x1, H1, H1 + FB - 1, -1, 1, (x, y, z) => (y === H1 ? sh(fasc, 0.7) : y === H1 + FB - 1 ? sh(fasc, 1.12) : fasc));
  // ---- upper floor
  const upper = o.upper ?? 'flush';
  const y2 = H1 + FB; // first voxel of the 2nd floor
  if (upper === 'balcony') {
    const bz = -8;
    fill(v, x0 + 2, x1 - 2, y2, top - 1, bz - 1, bz, WF);
    fill(v, x0, x1, y2, y2 + 1, bz, 2, (x, y, z) => (y === y2 + 1 ? 0xb8b4ac : 0x9a968e)); // slab
    const rail = o.rail ?? 0x4a5a5a;
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      v.set(x, y2 + 17, 2, rail); v.set(x, y2 + 18, 2, sh(rail, 1.2));
      if ((x - x0) % 2 === 0) fill(v, x, x, y2 + 2, y2 + 16, 2, 2, rail);
    }
    for (const x of [x0 + 2, x1 - 2]) fill(v, x, x, y2 + 2, y2 + 18, 2, 2, sh(rail, 0.8));
    // sliding glass doors on the recessed wall
    const n = Math.max(1, Math.round((W - 10) / 34));
    const dw = Math.floor((W - 12) / n);
    for (let i = 0; i < n; i++) {
      const wx0 = x0 + 6 + i * dw, wx1 = wx0 + dw - 5, wy0 = y2 + 3, wy1 = y2 + 40;
      carve(v, wx0, wx1, wy0, wy1, bz - 1, bz);
      fill(v, wx0 - 1, wx1 + 1, wy0 - 1, wy1 + 1, bz + 1, bz + 1, (x, y) => (x >= wx0 && x <= wx1 && y >= wy0 && y <= wy1 ? (x === Math.round((wx0 + wx1) / 2) ? 0xc8ccd0 : undefined) : 0xd8dce0));
      const lit = hash3(i, seed, 7) < (o.litChance ?? 0.55);
      const wp = windowTex((wx1 - wx0 + 1) * 3.2, (wy1 - wy0 + 1) * 3.2, { col: o.curtain ?? ['#e8d8b8', '#c8d8e8', '#f0c8c8', '#d8e8c8'][(seed + i) % 4], seed: seed * 7 + i, lit, kind: o.windowKind ?? 'curtain' });
      const pl = signPlane(wp, (wx1 - wx0 + 1) * V5, lit ? { emissive: 0.85, onU } : {});
      pl.position.set(((wx0 + wx1 + 1) / 2) * V5, ((wy0 + wy1 + 1) / 2) * V5, (bz - 1) * V5 + 0.004);
      g.add(pl);
    }
    // balcony life: AC unit, plants, laundry or a futon airing on the rail
    const ac = acUnit(); ac.position.set((x1 - 20) * V5, (y2 + 2) * V5 + 0.15, (bz + 1) * V5); g.add(ac);
    if (o.laundry !== false && hash3(seed, 1, 1) < 0.7) {
      fill(v, x0 + 3, x0 + 3, y2 + 2, y2 + 46, 0, 0, 0x8a8e96); fill(v, x1 - 3, x1 - 3, y2 + 2, y2 + 46, 0, 0, 0x8a8e96);
      const lm = vm(laundry(W - 8, seed), V5, [0, 0, 0]); lm.position.set((x0 + 4) * V5, (y2 + 45) * V5, 0); g.add(lm);
      g.userData.laundry = lm;
    } else {
      const fm = vm(futon(30, [0xe8a0b0, 0x8ab0d8, 0xf0d080][seed % 3]), V5); fm.position.set((x0 + 8) * V5, (y2 + 18) * V5, 2 * V5); g.add(fm);
    }
    for (let i = 0; i < 2; i++) { const pp = pottedPlant(seed + i); pp.position.set((x0 + 6 + i * 6) * V5, (y2 + 2) * V5, (bz + 3) * V5); g.add(pp); }
  } else {
    fill(v, x0 + 2, x1 - 2, y2, top - 1, -1, 0, WF);
    const n = o.windows ?? Math.max(1, Math.round((W - 12) / 36));
    const ww = o.winW ?? 22, wh = o.winH ?? 26, wy0 = y2 + 12, wy1 = wy0 + wh - 1;
    const span = W - 8;
    for (let i = 0; i < n; i++) {
      const cx = Math.round(x0 + 4 + ((i + 0.5) * span) / n);
      const wx0 = cx - ww / 2, wx1 = cx + ww / 2 - 1;
      carve(v, wx0, wx1, wy0, wy1, -1, 0);
      const frame = o.winFrame ?? 0xc8ccd0;
      for (let x = wx0 - 1; x <= wx1 + 1; x++) { v.set(x, wy0 - 1, 1, 0xd8d8d4); v.set(x, wy1 + 1, 0, frame); v.set(x, wy0 - 1, 0, frame); }
      for (let y = wy0; y <= wy1; y++) { v.set(wx0 - 1, y, 0, frame); v.set(wx1 + 1, y, 0, frame); v.set(cx, y, -1, frame); }
      // a grime streak below the sill, a little hood over some windows
      for (let y = wy0 - 10; y < wy0 - 1; y++) if (hash3(cx, y, seed) < 0.5) v.set(cx + Math.floor(hash3(y, cx, seed) * 6) - 3, y, 0, sh(wall, 0.86));
      if (hash3(seed, i, 2) < 0.4) fill(v, wx0 - 2, wx1 + 2, wy1 + 2, wy1 + 2, 0, 3, 0x8a8e96);
      const lit = hash3(i, seed, 7) < (o.litChance ?? 0.5);
      const wp = windowTex(ww * 3.2, wh * 3.2, { col: o.curtain ?? ['#e8d8b8', '#c8d8e8', '#f0c8c8', '#d8e8c8'][(seed + i) % 4], seed: seed * 7 + i, lit, kind: o.windowKind ?? (i % 3 === 2 ? 'blinds' : 'curtain') });
      const pl = signPlane(wp, ww * V5, lit ? { emissive: 0.85, onU } : {});
      pl.position.set(((wx0 + wx1 + 1) / 2) * V5, ((wy0 + wy1 + 1) / 2) * V5, -1 * V5 + 0.004);
      g.add(pl);
      // flower box / potted plant on some sills
      if (hash3(seed, i, 5) < 0.45) { const pp = pottedPlant(seed + i * 3); pp.position.set((wx0 + 4) * V5, (wy0) * V5, 1.5 * V5); g.add(pp); }
    }
    if (o.ac !== false && hash3(seed, 9, 9) < 0.75) { const ac = acUnit(); ac.position.set((x1 - 19) * V5, (y2 + 3) * V5, 1 * V5); g.add(ac); }
  }
  // cornice + a parapet line
  fill(v, x0, x1, top, top + 3, -1, 2, (x, y, z) => (y === top + 3 ? sh(wall, 1.1) : y === top ? sh(wall, 0.72) : sh(wall, 0.85)));
  // downpipe on one edge with brackets
  const dpx = (seed % 2 ? x1 - 3 : x0 + 3);
  for (let y = 0; y <= top + 2; y++) v.set(dpx, y, 2, y % 18 === 0 ? 0x6a6e76 : 0x9aa0a6);
  v.set(dpx, top + 2, 1, 0x9aa0a6);
  // electricity meter on the pillar
  fill(v, x0 + 0, x0 + 2, 34, 39, 1, 1, 0xd8dcd8); v.set(x0 + 1, 37, 2, 0x2a2a30);

  // ---- ground floor front
  const fx0 = x0 + 3, fx1 = x1 - 3;
  const front = o.front ?? 'open';
  g.userData.frontX = [fx0 * V5, (fx1 + 1) * V5];
  if (front === 'shutter') {
    const sv = new VoxelModel();
    const sc = o.shutterCol ?? 0xa8acb0;
    const rust = hash3(seed, 3, 3) * 0.12 + (o.rusty ? 0.12 : 0);
    fill(sv, fx0, fx1, 0, H1 - 6, 0, 0, (x, y) => {
      if (y < 2) return 0x5a5e66;
      const slat = y % 3 === 0 ? sh(sc, 0.78) : y % 3 === 1 ? sh(sc, 1.06) : sc;
      const dirt = hash3(x, y, seed) < (1 - y / 30) * 0.25 ? sh(sc, 0.82) : null;
      // rust runs down from the slat seams in thin vertical streaks, heavier low down
      const col = hash3(x, 0, seed + 4), run = hash3(x, Math.floor(y / 7), seed + 5);
      const r = col < rust * 1.6 && run < 0.55 * (1.3 - y / H1) ? (hash3(x, y, 9) < 0.5 ? sh(0x8a6448, 0.95) : 0x7a5a42) : null;
      return r ?? dirt ?? slat;
    });
    sv.set(Math.round((fx0 + fx1) / 2), 3, 1, 0x3a3a40); sv.set(Math.round((fx0 + fx1) / 2) + 1, 3, 1, 0x3a3a40);
    if (o.shutterText) { /* painted letters are a plane below */ }
    const sm = vm(sv, V5, [0, H1 - 5, 0]);
    sm.position.y = (H1 - 5) * V5;
    g.add(sm);
    g.userData.shutter = sm;
    // the shutter box under the fascia
    fill(v, fx0 - 1, fx1 + 1, H1 - 5, H1 - 1, -1, 1, (x, y) => (y === H1 - 5 ? 0x7a7e86 : 0x9a9ea6));
    // stuff taped to it
    const posters = o.posters ?? ['tenant'];
    posters.forEach((k, i) => {
      const pp = signPlane(shopPoster(k, seed + i), 0.42);
      pp.position.set((fx0 + 10 + i * 18) * V5 + (hash3(i, seed, 1) - 0.5) * 0.2, 1.25 + (hash3(seed, i, 2) - 0.5) * 0.3, 1 * V5 + 0.006);
      pp.rotation.z = (hash3(i, 1, seed) - 0.5) * 0.12;
      sm.add(pp); pp.position.y -= (H1 - 5) * V5;
    });
    // the dark interior behind (seen when the shutter is up)
    fill(v, fx0, fx1, 0, 0, -D + 3, -1, 0x6a645c);
    fill(v, fx0, fx1, 1, H1 - 1, -D + 2, -D + 2, 0x4a443e);
  } else if (front === 'glass' || front === 'koshi') {
    const koshi = front === 'koshi';
    const frame = o.frame ?? (koshi ? 0x4a2e1e : 0xb8bcc4);
    const bays = o.bays ?? Math.max(2, Math.round((fx1 - fx0) / 24));
    const bw = (fx1 - fx0 + 1) / bays;
    const doorBay = o.doorBay ?? Math.floor(bays / 2);
    fill(v, fx0, fx1, 0, 3, -1, 0, koshi ? 0x7a7a72 : 0xc8ccd0); // kick plate / stone base
    fill(v, fx0, fx1, H1 - 6, H1 - 1, -1, 0, frame); // transom
    for (let b = 0; b <= bays; b++) { const x = Math.round(fx0 + b * bw); fill(v, x - (b === bays ? 1 : 0), x - (b === bays ? 1 : 0) + (b === 0 || b === bays ? 0 : 1), 0, H1 - 1, -1, 0, frame); }
    for (let b = 0; b < bays; b++) {
      const bx0 = Math.round(fx0 + b * bw) + 1, bx1 = Math.round(fx0 + (b + 1) * bw) - 1;
      if (koshi && b !== doorBay) {
        for (let x = bx0; x <= bx1; x++) if ((x - bx0) % 2 === 1) fill(v, x, x, 4, H1 - 7, 0, 0, (xx, y) => (y % 14 === 0 ? sh(frame, 1.15) : frame));
        fill(v, bx0, bx1, 26, 26, 0, 0, sh(frame, 1.1));
      }
      if (b === doorBay) {
        // door: handle bar (glass) or a sliding wooden door with a little window
        if (!koshi) { fill(v, bx1 - 3, bx1 - 3, 16, 32, 1, 1, 0xd8dce4); fill(v, bx0, bx1, 0, 0, 1, 2, 0x5a5e66); }
        else fill(v, bx0, bx1, 0, H1 - 7, -3, -3, (x, y) => (y > 18 && y < 40 && x > bx0 + 2 && x < bx1 - 2 ? 0xd8d0b8 : (x - bx0) % 4 === 0 ? sh(frame, 1.2) : frame));
      }
      if (!koshi || b === doorBay) {
        const gp = glassPane((bx1 - bx0 + 1) * V5, (H1 - 10) * V5);
        gp.position.set(((bx0 + bx1 + 1) / 2) * V5, (4 + (H1 - 10) / 2) * V5, koshi ? -2.5 * V5 : 0.5 * V5);
        g.add(gp);
      }
    }
    g.userData.door = { x: (fx0 + (doorBay + 0.5) * bw) * V5, z: 0.35 };
    // interior shell behind the glass
    fill(v, fx0, fx1, 0, 0, -D + 3, -2, o.floor ?? 0x9a8a72);
    fill(v, fx0, fx1, 1, H1 - 1, -D + 2, -D + 2, o.inWall ?? 0xe8dcc0);
    g.userData.stage = { x0: fx0 * V5, x1: (fx1 + 1) * V5, z0: (-D + 3) * V5, z1: -2 * V5 };
  } else { // open front
    fill(v, fx0, fx1, 0, 0, -D + 3, 0, o.floor ? ((x, y, z) => ((x + z) % 6 === 0 ? sh(o.floor, 0.92) : o.floor)) : ((x, y, z) => (((x >> 2) + (z >> 2)) & 1 ? 0xb8b0a0 : 0xa8a090)));
    fill(v, fx0, fx1, 1, H1 - 1, -D + 2, -D + 2, o.inWall ?? 0xe8dcc0);
    g.userData.stage = { x0: fx0 * V5, x1: (fx1 + 1) * V5, z0: (-D + 3) * V5, z1: 0 };
    g.userData.door = { x: 0, z: 0.4 };
    // fluorescent tubes under the ceiling (seen at the back when looking in)
    for (let x = fx0 + 6; x < fx1 - 6; x += 24) fill(glow, x, x + 14, H1 - 2, H1 - 2, -D / 2 - 6, -D / 2 - 6, 0xfff8e8);
  }

  // ---- awning
  if (o.awning) {
    const A = o.awning, ad = A.depth ?? 22, drop = A.drop ?? 7, ay = A.y ?? H1 - 2;
    const av = new VoxelModel();
    for (let k = 0; k < ad; k++) {
      const y = ay - Math.floor((k * drop) / ad);
      for (let x = x0 + 1; x <= x1 - 1; x++) {
        const st = A.b != null ? (((x + 400) >> 2) & 1 ? A.a : A.b) : A.a;
        av.set(x, y, 2 + k, k === 0 ? sh(st, 0.8) : st);
      }
    }
    // little side cheeks
    for (let k = 0; k < ad; k++) { const y = ay - Math.floor((k * drop) / ad); for (let yy = y - 3; yy < y; yy++) { av.set(x0 + 1, yy, 2 + k, sh(A.a, 0.85)); av.set(x1 - 1, yy, 2 + k, sh(A.a, 0.85)); } }
    g.add(vm(av, V5));
    const vp = valance({ text: A.text ?? '', w: Math.round((W - 2) * V5 * 64), h: 12, bg: hex(A.a), fg: A.fg ?? '#ffffff', stripe: A.b != null ? hex(A.b) : null });
    const vpl = signPlane(vp, (W - 2) * V5, { double: false });
    vpl.position.set(0, (ay - drop) * V5 - (12 / 64) / 2, (2 + ad) * V5 + 0.003);
    g.add(vpl);
    g.userData.awningEdge = { y: (ay - drop) * V5, z: (2 + ad) * V5 };
  }
  // ---- signs
  if (o.sign) {
    const sw = Math.min(W - 6, o.signW ?? W - 8) * V5;
    const sp = signPlane(o.sign, sw, o.signGlow ? { emissive: o.signGlow, onU, mode: o.signMode ?? 0 } : {});
    sp.position.set(o.signX ?? 0, (H1 + FB / 2) * V5 + (o.signY ?? 0), 1 * V5 + 0.06);
    g.add(sp);
    g.userData.sign = sp;
  }
  if (o.vsign) {
    const sx = (o.vsignSide ?? (seed % 2 ? -1 : 1)) * (W / 2 - 7) * V5;
    const sw = o.vsign.w / 64;
    const sp = signPlane(o.vsign, sw, o.vsignGlow ? { emissive: o.vsignGlow, onU, mode: 4 } : {});
    const sh2 = sw * o.vsign.h / o.vsign.w;
    sp.position.set(sx, (y2 + 4) * V5 + sh2 / 2, 5 * V5 + 0.01);
    g.add(sp);
    // the sign's box + brackets behind
    const bv = new VoxelModel();
    const bw = Math.round(sw / V5) + 2, bh = Math.round(sh2 / V5) + 2;
    fill(bv, 0, bw - 1, 0, bh - 1, 0, 1, 0x4a4a52);
    fill(bv, 2, 3, 3, 4, -3, -1, 0x6a6a72); fill(bv, 2, 3, bh - 5, bh - 4, -3, -1, 0x6a6a72);
    const bm = vm(bv, V5); bm.position.set(sx - (bw / 2) * V5, (y2 + 3) * V5, 3 * V5); g.add(bm);
  }
  g.add(vm(v, V5));
  if (glow.vox.size) g.add(glowVm(glow, V5, [0, 0, 0], { intensity: 1.1, mode: 1, onU }));
  g.userData.top = (top + 4) * V5;
  return g;
}

// ---------------------------------------------------------------- warm light pool
// a dithered pixel gradient laid on the floor in front of a lit shop (additive)
let poolTex = null;
export function lightPool(w, d, { color = 0xffc070, intensity = 0.32, onU = null } = {}) {
  if (!poolTex) {
    const S = 64, p = new PixCanvas(S, S, 77);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S * 2 - 1, dy = (y + 0.5) / S * 2 - 1;
      const k = Math.max(0, 1 - Math.hypot(dx, dy * 1.1));
      const q = Math.floor(k * k * 4 + ((x * 7 + y * 13) % 4) / 4) / 4; // banded + ordered dither
      if (q > 0) p.px(x, y, `rgba(255,255,255,${Math.min(1, q)})`);
    }
    poolTex = new THREE.CanvasTexture(p.c); poolTex.magFilter = THREE.NearestFilter; poolTex.minFilter = THREE.NearestFilter; poolTex.colorSpace = THREE.SRGBColorSpace;
  }
  const mat = emitMat({ map: poolTex, color, intensity, onU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  return m;
}
