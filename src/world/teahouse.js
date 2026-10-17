// The tea-house kit for Kodamaya: an extremely old shop built like a Taishō
// tea house — walls of dark red, sun-worn cedar boards between black posts,
// cracked plaster above, moss along the skirting and ivy creeping in round the
// big garden window; green curtains, red paper lanterns, a stone fireplace with
// a kettle, an apothecary chest of a hundred little drawers, bundles of herbs
// drying from the beams, sacks and baskets, a chalkboard, a pendulum clock,
// bonsai on the sill, and through the glass a pond garden.
// Voxels are 0.05 m (V5) unless noted. Everything faces +z (into the room)
// unless a wall says otherwise.
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, tone, sh, hash3, rbox, ell, V5, V25 } from './build.js';
import { PixCanvas, mix, darken, lighten, makeTexture } from '../core/pixtex.js';
import { emitMat, litMat } from '../core/materials.js';
import { FONT } from '../ui/fonts.js';

// ---------------------------------------------------------------- palettes
export const TH = {
  red: [0x5a241c, 0x6a2c20, 0x7a3626, 0x8a4230, 0x9a4e36], // aged red cedar boards
  post: 0x2a1812, postL: 0x3e2418, beam: 0x32201a, plaster: [0xd8ccb0, 0xe4d8bc, 0xccc0a2], moss: [0x4a6a2a, 0x5a7a32, 0x6e8e3a, 0x86a448],
  ivy: [0x2e5a2a, 0x3e7034, 0x52863e, 0x6aa04a], stone: [0x6e6660, 0x847a72, 0x9a9088, 0x5a524e], wood: [0x6a4428, 0x7e5432, 0x92643c, 0xa8784a],
};
const pickR = (x, y) => TH.red[Math.floor(hash3(Math.floor(x / 4), 7, 3) * 3) + (hash3(x, y >> 2, 11) < 0.15 ? 2 : 0)];

// ---------------------------------------------------------------- walls
// a wall along x (length n voxels, height h), boards + posts + nuki beams +
// plaster band + moss. holes: [{ a0, a1, y0, y1 }] cut out (windows, doors).
// Returns { full, stub } meshes; the stub is the low version shown when the
// camera looks over that wall.
export function wallPanels(n, h, { holes = [], seed = 1, posts = 40, stubH = 8, inside = 1 } = {}) {
  const full = new VoxelModel(), stub = new VoxelModel();
  const x0 = -Math.floor(n / 2), x1 = x0 + n - 1;
  const inHole = (x, y) => holes.some((o) => x >= o.a0 && x <= o.a1 && y >= o.y0 && y <= o.y1);
  const nearHole = (x, y) => holes.some((o) => x >= o.a0 - 1 && x <= o.a1 + 1 && y >= o.y0 - 1 && y <= o.y1 + 1) && !inHole(x, y);
  for (let x = x0; x <= x1; x++) for (let y = 0; y < h; y++) {
    if (inHole(x, y)) continue;
    const isPost = ((x - x0) % posts) < 3 || x > x1 - 3;
    let c;
    if (isPost) c = ((x - x0) % posts) === 1 ? TH.postL : TH.post;
    else if (y >= h - 4) c = TH.beam;
    else if (y >= h - 16) { // the aged plaster band, with water stains and cracks
      c = tone(x, y, 0, TH.plaster[1], TH.plaster[2], TH.plaster[0], 0.12, 0.05);
      if (hash3(x >> 2, y >> 3, seed) < 0.06) c = 0xb8a888;
      if (y === h - 16) c = TH.beam;
    } else if (y === 18 || y === 19 || y === 46 || y === 47) c = TH.beam; // nuki rails
    else {
      c = pickR(x, y);
      if ((x & 3) === 0) c = sh(c, 0.8); // board seams
      if (hash3(x, y >> 1, seed + 5) < 0.04) c = sh(c, 1.2); // worn streaks
      if (y < 3) c = TH.post;
      // moss creeping along the skirting
      if (y >= 3 && y < 3 + Math.floor(hash3(x >> 1, 1, seed + 9) * 6) && hash3(x >> 3, 2, seed) < 0.55) c = TH.moss[Math.floor(hash3(x, y, 5) * 4)];
    }
    if (nearHole(x, y)) c = TH.post;
    full.set(x, y, 0, c); full.set(x, y, -1, sh(c, 0.85));
    if (y < stubH) { stub.set(x, y, 0, c); stub.set(x, y, -1, sh(c, 0.85)); }
    if (isPost && inside) full.set(x, y, 1, sh(c, 1.05)); // posts stand proud of the boards
  }
  for (let x = x0; x <= x1; x++) { stub.set(x, stubH, 0, TH.beam); stub.set(x, stubH, -1, TH.beam); stub.set(x, stubH, 1, TH.postL); }
  return { full: vm(full, V5, [0, 0, 0]), stub: vm(stub, V5, [0, 0, 0]) };
}
// ivy creeping up from a point: leaves of four greens on a wandering vine
export function ivy(len = 40, seed = 1, { spread = 1 } = {}) {
  const v = new VoxelModel();
  let x = 0, y = 0;
  for (let i = 0; i < len; i++) {
    y += 1; x += Math.round((hash3(i, seed, 1) - 0.5) * 1.6 * spread);
    v.set(x, y, 0, 0x4a3a20);
    if (i % 2 === 0) {
      const s = hash3(i, seed, 2) < 0.5 ? -1 : 1;
      const c = TH.ivy[Math.floor(hash3(i, seed, 3) * 4)];
      v.set(x + s, y, 0, c); v.set(x + s * 2, y, 0, c); v.set(x + s, y + 1, 0, c); v.set(x + s * 2, y - 1, 0, sh(c, 0.85)); v.set(x + s, y, 1, sh(c, 1.15));
    }
  }
  return vm(v, V25, [0, 0, 0], { cast: false });
}
// hanging ivy curtain from a beam (drapes down)
export function ivyDrape(w = 16, len = 18, seed = 1) {
  const v = new VoxelModel();
  for (let k = 0; k < w; k += 2) {
    const L = Math.floor(len * (0.4 + hash3(k, seed, 1) * 0.6));
    for (let y = 0; y < L; y++) {
      const x = k + Math.round(Math.sin(y * 0.5 + k) * 0.6);
      const c = TH.ivy[Math.floor(hash3(k, y, seed) * 4)];
      v.set(x, -y, 0, y % 2 ? c : 0x3a5a24);
      if (y % 3 === 1) { v.set(x - 1, -y, 0, c); v.set(x + 1, -y, 1, sh(c, 1.1)); }
    }
  }
  return vm(v, V25, [0, 0, 0], { cast: false });
}

// ---------------------------------------------------------------- the big window with green curtains
// window opening a0..a1 (voxels along the wall), y0..y1; returns a group to set in the hole
export function bigWindow(wv, hv, { onU = null } = {}) {
  const g = new THREE.Group();
  const v = new VoxelModel();
  // a heavy wooden frame with muntins (a grid of panes), the sill sticking out
  for (let x = 0; x < wv; x++) for (let y = 0; y < hv; y++) {
    const frame = x < 2 || x >= wv - 2 || y < 2 || y >= hv - 2;
    const mullion = (x % Math.floor(wv / 4)) === 0 || (y % Math.floor(hv / 3)) === 0;
    if (frame || mullion) v.set(x, y, 0, frame ? TH.post : TH.postL);
  }
  for (let x = -3; x < wv + 3; x++) for (let z = 0; z <= 6; z++) v.set(x, -1, z, z === 6 ? TH.wood[3] : TH.wood[1]);
  g.add(vm(v, V5, [wv / 2, 0, 0.5]));
  // faint glass
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(wv * V5, hv * V5), new THREE.MeshBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.12, depthWrite: false }));
  gl.position.set(0, hv * V5 / 2, 0); gl.renderOrder = 4; g.add(gl);
  // green curtains tied back at each side, a valance on top
  const cv = new VoxelModel();
  const greens = [0x2e6a44, 0x3a7a50, 0x4a8a5c, 0x26583a];
  for (const side of [-1, 1]) for (let y = 0; y < hv + 6; y++) {
    const tieY = Math.floor(hv * 0.45);
    const wdt = y > tieY - 2 && y < tieY + 2 ? 3 : y < tieY ? 5 + Math.floor((tieY - y) / 6) : 6;
    for (let k = 0; k < wdt; k++) {
      const x = side < 0 ? -wv / 2 - 3 + k : wv / 2 + 2 - k;
      const fold = (k + (y >> 3)) % 3;
      cv.set(x, y, 2, greens[fold]); if (fold === 0) cv.set(x, y, 3, greens[3]);
    }
    if (y === tieY) for (let k = -1; k <= 3; k++) cv.set(side < 0 ? -wv / 2 - 3 + k : wv / 2 + 2 - k, y, 4, 0xc8a050); // tassel cord
  }
  for (let x = -wv / 2 - 4; x < wv / 2 + 4; x++) for (let y = hv + 2; y < hv + 6; y++) cv.set(x, y, 3, (x + (y === hv + 2 ? 1 : 0)) % 4 === 0 ? greens[0] : greens[1]);
  for (let x = -wv / 2 - 5; x < wv / 2 + 5; x++) cv.set(x, hv + 6, 2, 0xc8a050); // brass rod
  g.add(vm(cv, V5, [0, 0, 0]));
  return g;
}
// a bonsai in a shallow glazed pot: twisted trunk and cloud pads of foliage (V25)
export function bonsai(seed = 1, { kind = 'pine' } = {}) {
  const v = new VoxelModel();
  const potC = [0x3a5a8a, 0x8a3a2a, 0x5a4a3a][seed % 3];
  fill(v, -6, 5, 0, 2, -3, 2, (x, y) => (y === 2 ? sh(potC, 1.2) : potC)); fill(v, -5, 4, 3, 3, -2, 1, 0x4a3a28);
  let x = 0, y = 4;
  const pads = [];
  for (let i = 0; i < 12; i++) {
    x += Math.round(Math.sin(i * 0.9 + seed) * 1.2); y += 1;
    v.set(x, y, 0, 0x6a4a34); v.set(x + 1, y, 0, 0x5a3a28);
    if (i === 5 || i === 9 || i === 11) pads.push([x + (i === 5 ? -4 : i === 9 ? 4 : 0), y + 1]);
  }
  const leaf = kind === 'maple' ? [0xc83a2a, 0xe85a3a, 0xff8a4a] : kind === 'azalea' ? [0x4a7a3a, 0xff7aa0, 0xffa8c8] : [0x2e5a32, 0x3e6e3a, 0x5a8a48];
  for (const [px, py] of pads) for (let dx = -4; dx <= 4; dx++) for (let dy = -1; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
    if ((dx / 4.4) ** 2 + (dy / 2.2) ** 2 + (dz / 2.4) ** 2 > 1) continue;
    v.set(px + dx, py + dy, dz, leaf[dy > 0 ? 2 : hash3(dx, dy, dz) < 0.5 ? 1 : 0]);
  }
  return vm(v, V25, [0, 0, 0]);
}
export function pottedPlant(kind = 'monstera', seed = 1) {
  const v = new VoxelModel();
  fill(v, -4, 3, 0, 6, -4, 3, (x, y) => (y === 6 ? 0x8a5a3a : y > 4 ? 0xb8683a : 0xa85a32));
  const G = [0x2e6a32, 0x3e7e3a, 0x52924a, 0x6aa850];
  if (kind === 'monstera') for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + seed, L = 7 + (k % 3) * 2;
    for (let i = 0; i < L; i++) { const x = Math.round(Math.cos(a) * i * 0.8), z = Math.round(Math.sin(a) * i * 0.8), y = 7 + Math.round(i * 1.1 - i * i * 0.05); v.set(x, y, z, G[1]); if (i > 3) for (let s = -2; s <= 2; s++) if ((s + i) % 3) v.set(x - Math.round(Math.sin(a) * s), y, z + Math.round(Math.cos(a) * s), G[(i + s + 4) % 4]); }
  } else if (kind === 'fern') for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + seed;
    for (let i = 0; i < 9; i++) { const x = Math.round(Math.cos(a) * i * 0.9), z = Math.round(Math.sin(a) * i * 0.9), y = 7 + Math.round(i * 0.9 - i * i * 0.07); v.set(x, y, z, G[(i + k) % 4]); }
  } else { // a small citrus tree with fruit
    for (let y = 7; y < 16; y++) v.set(0, y, 0, 0x6a4a30);
    for (let dx = -5; dx <= 5; dx++) for (let dy = -4; dy <= 4; dy++) for (let dz = -5; dz <= 5; dz++) if (dx * dx + dy * dy * 1.4 + dz * dz < 26) v.set(dx, 19 + dy, dz, hash3(dx, dy, dz) < 0.08 ? 0xffa020 : G[Math.floor(hash3(dx, dz, dy) * 3)]);
  }
  return vm(v, V25, [0, 0, 0]);
}

// ---------------------------------------------------------------- lanterns, herbs, baskets, sacks, the scale
export function paperLantern(col = 0xd8302a, { onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  for (let y = 0; y < 14; y++) {
    const r = 5.4 * Math.sin(Math.PI * (y + 0.5) / 14) + 0.6;
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
      const d = Math.hypot(x, z);
      if (d > r || d < r - 1.2) continue;
      (y % 3 === 0 ? v : gl).set(x, y, z, y % 3 === 0 ? sh(col, 0.6) : (x + z + y) % 7 === 0 ? 0x1a1010 : col);
    }
  }
  fill(v, -3, 2, -1, -1, -3, 2, 0x1a1010); fill(v, -3, 2, 14, 14, -3, 2, 0x1a1010);
  for (let y = 15; y < 22; y++) v.set(0, y, 0, 0x3a2a20);
  for (let y = -5; y < -1; y++) v.set(0, y, 0, 0xe8c040); // tassel
  const g = new THREE.Group();
  g.add(vm(v, V25, [0.5, 0, 0.5], { cast: false }));
  g.add(glowVm(gl, V25, [0.5, 0, 0.5], { intensity: 1.15, mode: 3, onU }));
  return g;
}
export function herbBundles(n = 6, seed = 1) {
  // bundles of herbs tied with string, hung upside-down from a pole (V25)
  const v = new VoxelModel();
  const cols = [[0x6a8a3a, 0x8aa44a], [0x8a7a4a, 0xa89a5a], [0x7a5a8a, 0x9a7aa8], [0xa8783a, 0xc8984a], [0x5a7a4a, 0x7a9a5a]];
  for (let x = -2; x < n * 8; x++) v.set(x, 0, 0, 0x6a4a30);
  for (let k = 0; k < n; k++) {
    const cx = k * 8 + 3, L = 8 + Math.floor(hash3(k, seed, 1) * 6), [a, b] = cols[(k + seed) % cols.length];
    for (let y = 1; y < 4; y++) v.set(cx, -y, 0, 0xd8c8a0);
    for (let y = 4; y < 4 + L; y++) {
      const w = Math.floor((y - 4) / 3) + 1;
      for (let dx = -w; dx <= w; dx++) for (let dz = -1; dz <= 1; dz++) if (hash3(dx, y, k) < 0.75) v.set(cx + dx, -y, dz, hash3(dx, y + 1, dz) < 0.5 ? a : b);
    }
    v.set(cx, -5, 1, 0xc83a32);
  }
  return vm(v, V25, [0, 0, 0], { cast: false });
}
export function sack(seed = 1, label = '米') {
  const v = new VoxelModel();
  const c = [0xd8c49a, 0xc8b088, 0xe0d0a8][seed % 3];
  for (let y = 0; y < 18; y++) {
    const r = y < 14 ? 7 - Math.max(0, (y - 10) * 0.6) : 3.4;
    for (let x = -8; x <= 8; x++) for (let z = -7; z <= 7; z++) if ((x / (r * 1.1)) ** 2 + (z / r) ** 2 <= 1) v.set(x, y, z, (x + y) % 5 === 0 ? sh(c, 0.9) : c);
  }
  for (let x = -4; x <= 4; x++) v.set(x, 15, 0, 0x8a6a3a);
  const g = new THREE.Group(); g.add(vm(v, V25, [0.5, 0, 0.5]));
  const p = new PixCanvas(12, 12, 3100 + seed); p.circle(6, 6, 5, '#c83a32'); p.text(label, 6, 1, { font: `8px ${FONT.brush}`, color: '#fff4e0', align: 'center' });
  const s = signPlane(p, 0.14); s.position.set(0, 0.17, 7 * V25 + 0.01); g.add(s);
  return g;
}
export function basket(seed = 1, fillKind = 'mikan') {
  const v = new VoxelModel();
  for (let y = 0; y < 7; y++) for (let x = -7; x <= 7; x++) for (let z = -6; z <= 6; z++) {
    const d = Math.hypot(x / 7, z / 6);
    if (d > 1 || (d < 0.82 && y > 0)) continue;
    v.set(x, y, z, (x + y * 2 + z) % 3 === 0 ? 0x8a6a3a : 0xb8904e);
  }
  const fc = { mikan: [0xff9a20, 0xffb84a], tea: [0x4a8a3a, 0x6aa84a], bean: [0x8a3a2a, 0xa84a32], chestnut: [0x6a3a20, 0x8a5030] }[fillKind];
  for (let x = -6; x <= 6; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x / 6, z / 5) < 0.85) { const hgt = 6 + Math.round((1 - Math.hypot(x / 6, z / 5)) * 2); v.set(x, hgt, z, hash3(x, z, seed) < 0.5 ? fc[0] : fc[1]); }
  return vm(v, V25, [0.5, 0, 0.5]);
}
export function brassScale() {
  const v = new VoxelModel();
  const B = 0xc8a040, BD = 0x8a6a2a;
  fill(v, -6, 5, 0, 1, -3, 2, BD); for (let y = 2; y < 14; y++) v.set(0, y, 0, B);
  for (let x = -9; x <= 8; x++) v.set(x, 14, 0, B);
  for (const s of [-8, 7]) { for (let y = 8; y < 14; y++) v.set(s, y, 0, 0x8a8a90); for (let x = s - 3; x <= s + 3; x++) for (let z = -2; z <= 2; z++) v.set(x, 7, z, B); }
  fill(v, -9, -7, 8, 9, -1, 1, 0x7a4a2a); // a little weight
  return vm(v, V25, [0.5, 0, 0.5]);
}

// ---------------------------------------------------------------- the apothecary chest (kusuri-dansu)
export function drawerChest(cols = 8, rows = 9) {
  const v = new VoxelModel();
  const W = cols * 5 + 1, H = rows * 4 + 1;
  fill(v, 0, W - 1, 0, H + 1, -9, 0, (x, y, z) => {
    if (z < 0) return TH.wood[0];
    const ex = x % 5 === 0, ey = y % 4 === 0;
    if (ex || ey || y > H - 1) return 0x3a2418;
    if (x % 5 === 2 && y % 4 === 2) return 0xc8a040; // ring pulls
    return tone(x, y, z, 0x7a4a2a, 0x6a3e22, 0x8a5632, 0.12, 0.08);
  });
  fill(v, -1, W, H + 2, H + 3, -10, 1, 0x2a1810);
  const g = new THREE.Group(); g.add(vm(v, V5, [W / 2, 0, 0]));
  // little paper labels on some drawers
  const lab = new PixCanvas(cols * 10, rows * 8, 3200);
  const herbs = ['茶', '菊', '桂', '葛', '梅', '柚', '芍', '甘', '陳', '薄', '朮', '参'];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (hash3(r, c, 4) < 0.7) { lab.rect(c * 10 + 2, r * 8 + 1, 6, 4, '#f0e4c8'); lab.text(herbs[(r * cols + c) % herbs.length], c * 10 + 5, r * 8, { font: `5px ${FONT.tiny}`, color: '#3a2418', align: 'center' }); }
  const lp = signPlane(lab, (W - 1) * V5, { alphaTest: 0.3 });
  lp.position.set(0, (H / 2 + 0.6) * V5, 0.006 + V5); g.add(lp);
  return g;
}

// ---------------------------------------------------------------- the stone fireplace with a kettle
export function fireplace({ onU = null } = {}) {
  const g = new THREE.Group();
  const v = new VoxelModel(), gl = new VoxelModel();
  const W = 30, H = 46, D = 12;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) {
    const opening = x > 6 && x < W - 7 && y < 22 && z > 2;
    if (opening) continue;
    // fieldstones: irregular blocks with dark mortar
    const bx = Math.floor((x + (Math.floor(y / 5) % 2) * 3) / 6), by = Math.floor(y / 5);
    const mortar = (x + (Math.floor(y / 5) % 2) * 3) % 6 === 0 || y % 5 === 0;
    const c = mortar ? 0x3a3432 : TH.stone[Math.floor(hash3(bx, by, 3) * 4)];
    v.set(x, y, z, hash3(x, y, z) < 0.04 && !mortar ? TH.moss[1] : c);
  }
  // the mantel shelf
  fill(v, -2, W + 1, 24, 25, -1, D + 1, TH.wood[1]); fill(v, -2, W + 1, 26, 26, -1, D + 1, TH.wood[3]);
  // hearth floor, logs, the fire (glow) and embers
  fill(v, 7, W - 8, 0, 0, 3, D - 1, 0x2a2420);
  for (let x = 9; x < W - 9; x++) { v.set(x, 1, 6, 0x6a4a30); v.set(x, 2, 7, 0x5a3a24); }
  for (let x = 9; x < W - 9; x++) for (let y = 3; y < 10; y++) if (hash3(x, y, 2) < 0.55 - (y - 3) * 0.06) gl.set(x, y, 7, y < 5 ? 0xff5a1a : y < 7 ? 0xff9a2a : 0xffd84a);
  const body = vm(v, V5, [W / 2, 0, D]);
  const fire = glowVm(gl, V5, [W / 2, 0, D], { intensity: 1.6, mode: 3, onU });
  g.add(body, fire);
  // an iron kettle on a hook (tetsubin)
  const k = new VoxelModel();
  for (let y = 0; y < 8; y++) for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if ((x / 6.2) ** 2 + ((y - 4) / 4.4) ** 2 + (z / 6.2) ** 2 <= 1) k.set(x, y, z, (x + y + z) % 4 === 0 ? 0x2a2626 : 0x3a3434);
  for (let x = 6; x <= 9; x++) k.set(x, 5 + (x - 6), 0, 0x3a3434);
  for (let a = 0; a < 14; a++) k.set(Math.round(Math.cos(a / 13 * Math.PI) * 6), 8 + Math.round(Math.sin(a / 13 * Math.PI) * 5), 0, 0x2a2626);
  const km = vm(k, V25, [0.5, 0, 0.5]); km.position.set(0, 0.14, -0.3); g.add(km);
  // things on the mantel: a clock-ish teapot, a photo, a candle, a little daruma
  const m = new VoxelModel();
  ell(m, 4, 3, 0, 3, 3, 3, 0xd83a32); m.set(4, 4, 3, 0xf4f0e8); m.set(3, 4, 3, 0x1a1010); m.set(5, 4, 3, 0x1a1010);
  fill(m, 14, 15, 0, 6, -1, 0, 0xf4ecd8); m.set(14, 7, 0, 0xffd060);
  fill(m, 22, 30, 0, 5, -1, 1, 0x4a7a9a); ell(m, 26, 7, 0, 3, 2, 2, 0x4a7a9a); m.set(31, 4, 0, 0x4a7a9a);
  const mm = vm(m, V25, [16, 0, 0]); mm.position.set(0, 27 * V5, -D * V5 / 2 + 0.05); g.add(mm);
  g.userData.fire = fire;
  g.userData.kettle = km;
  return g;
}

// ---------------------------------------------------------------- the pendulum clock (the pendulum swings)
export function pendulumClock() {
  const g = new THREE.Group();
  const v = new VoxelModel();
  const W = 12, H = 34;
  fill(v, 0, W - 1, 0, H - 1, -3, 0, (x, y, z) => {
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1 || y === 20 || y === 21) return 0x3a2014;
    if (z === 0 && y < 20 && x > 1 && x < W - 2) return null; // the glass door over the pendulum
    return tone(x, y, z, 0x6a3a22, 0x5a2e1a, 0x7a4628, 0.1, 0.08);
  });
  fill(v, 1, W - 2, 1, 19, -3, -3, 0x2a1810);
  // the dial
  for (let x = 2; x < W - 2; x++) for (let y = 23; y < 32; y++) if (Math.hypot(x - (W - 1) / 2, y - 27.5) < 4.6) v.set(x, y, 1, Math.hypot(x - (W - 1) / 2, y - 27.5) > 3.8 ? 0xc8a040 : 0xf4ecd4);
  v.set(5, 28, 2, 0x1a1010); v.set(5, 29, 2, 0x1a1010); v.set(6, 28, 2, 0x1a1010); v.set(7, 28, 2, 0x1a1010);
  fill(v, -1, W, H, H + 1, -4, 1, 0x2a1810); fill(v, 4, 7, H + 2, H + 3, -2, 0, 0x2a1810);
  g.add(vm(v, V5, [W / 2, 0, 0]));
  const p = new VoxelModel();
  for (let y = -12; y <= 0; y++) p.set(0, y, 0, 0xc8a040);
  for (let x = -2; x <= 2; x++) for (let y = -16; y <= -12; y++) if (Math.hypot(x, y + 14) < 2.6) p.set(x, y, 0, 0xe8c050);
  const pend = vm(p, V5, [0.5, 0, 0.5], { cast: false });
  const piv = new THREE.Group(); piv.position.set(0, 19 * V5, -1.5 * V5); piv.add(pend); g.add(piv);
  g.userData.update = (dt, t) => { piv.rotation.z = Math.sin(t * Math.PI) * 0.22; };
  return g;
}

// ---------------------------------------------------------------- the chalkboard menu (prices, doodles)
export function chalkboard() {
  const p = new PixCanvas(64, 44, 3300);
  p.rect(0, 0, 64, 44, '#5a3a24'); p.rect(2, 2, 60, 40, '#2a3a30');
  p.scatter(2, 2, 60, 40, '#34463a', 0.25);
  const ch = '#e8ece4';
  p.text('本日のおすすめ', 32, 3, { font: `7px ${FONT.cute}`, color: '#ffe08a', align: 'center' });
  p.text('ガチャ 1回 100円', 5, 13, { font: `7px ${FONT.cute}`, color: ch });
  p.text('ほうじ茶 50円', 5, 21, { font: `7px ${FONT.cute}`, color: ch });
  p.text('ラムネ 80円', 5, 29, { font: `7px ${FONT.cute}`, color: ch });
  p.text('どうぞ ごゆっくり', 32, 34, { font: `6px ${FONT.cute}`, color: '#ffb8c8', align: 'center' });
  // a doodled capsule and a tea cup
  p.ring(53, 17, 5, ch); p.hline(48, 58, 17, ch); p.ring(53, 28, 3, '#a8e0ff');
  p.rect(0, 42, 64, 2, '#4a2e1c');
  return p;
}
// a hanging scroll (kakejiku) with a brushed character and a little ink landscape
export function scroll(char = '縁') {
  const p = new PixCanvas(18, 52, 3400);
  p.rect(0, 0, 18, 52, '#5a7a6a'); p.rect(2, 4, 14, 42, '#f4ecd4');
  p.text(char, 9, 6, { font: `12px ${FONT.brush}`, color: '#1a1414', align: 'center' });
  p.poly([[3, 44], [8, 34], [12, 40], [15, 36], [15, 44]], '#8a9aa0'); p.circle(12, 26, 2, '#c84a3a');
  p.rect(0, 0, 18, 2, '#3a2418'); p.rect(0, 50, 18, 2, '#3a2418');
  return p;
}

// ---------------------------------------------------------------- the low tea table, cushions, tea set
export function teaCorner() {
  const g = new THREE.Group();
  const v = new VoxelModel();
  // chabudai: round low table
  for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) { const d = Math.hypot(x, z); if (d <= 12) { v.set(x, 9, z, d > 11 ? 0x5a3420 : (x + z) % 9 === 0 ? 0x7a4a2c : 0x8a5632); if (d < 3 && false) v.set(x, 8, z, 0); } }
  for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) for (let y = 0; y < 9; y++) v.set(x, y, z, 0x4a2e1c);
  // zabuton cushions round it
  for (const [cx, cz, c] of [[0, 18, 0x8a3a5a], [-18, 0, 0x3a5a8a], [18, 0, 0x5a7a3a]]) rbox(v, cx - 6, cx + 5, 0, 2, cz - 6, cz + 5, 1.5, (x, y) => (y === 2 && (x + 50) % 4 === 0 ? sh(c, 1.15) : c));
  g.add(vm(v, V25, [0.5, 0, 0.5]));
  // tea set: a teapot, three cups, a plate of dango
  const t = new VoxelModel();
  ell(t, 0, 3, 0, 3.5, 3, 3.5, 0x6a8a7a); fill(t, -1, 0, 6, 6, -1, 0, 0x4a6a5a); for (let k = 0; k < 4; k++) t.set(4 + (k > 1 ? 1 : 0), 2 + k, 0, 0x6a8a7a);
  for (const [x, z] of [[-7, 4], [6, -5], [-3, -7]]) fill(t, x, x + 1, 0, 2, z, z + 1, 0xf0e8d8);
  for (let k = 0; k < 3; k++) t.set(8 + k, 1, 6, [0xffb8c8, 0xf4f0e8, 0x8ac060][k]);
  const tm = vm(t, V25, [0.5, 0, 0.5]); tm.position.y = 10 * V25; g.add(tm);
  return g;
}

// ---------------------------------------------------------------- the garden through the window
export function gardenBackdrop() {
  // far: hills, a lake catching the late light, a pagoda roof among trees
  const W = 320, H = 150, p = new PixCanvas(W, H, 3500);
  for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#8ac0e8', '#ffe2b8', Math.min(1, y / 90)));
  for (let i = 0; i < 7; i++) p.ellipse(30 + i * 46, 20 + (i % 3) * 9, 22, 5, '#ffffff');
  for (let x = 0; x < W; x++) { const h1 = 70 + Math.sin(x * 0.02) * 10 + Math.sin(x * 0.07) * 4; p.vline(x, Math.round(h1), H, '#8a9ac0'); }
  for (let x = 0; x < W; x++) { const h1 = 86 + Math.sin(x * 0.035 + 1) * 8; p.vline(x, Math.round(h1), H, '#5a8a62'); }
  for (let y = 100; y < H; y++) p.hline(0, W - 1, y, mix('#a8d4f0', '#5a9ac8', (y - 100) / 50));
  for (let k = 0; k < 40; k++) p.rect((k * 37) % W, 104 + (k * 13) % 40, 6 + (k % 4) * 3, 1, '#e8f6ff');
  p.rect(150, 74, 10, 14, '#6a3a2a'); for (let k = 0; k < 3; k++) p.rect(146 + k, 72 - k * 5, 18 - k * 2, 2, '#3a3a44');
  for (let i = 0; i < 18; i++) p.circle((i * 19) % W, 92 + (i % 3) * 3, 6 + (i % 4), ['#4a7a4a', '#5a8a52', '#3a6a40', '#c85a3a'][i % 4]);
  return p;
}
