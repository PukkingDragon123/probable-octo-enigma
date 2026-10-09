// Human World voxel props (0.05 m voxels unless noted), each returned as a
// THREE.Group with its origin at the bottom centre of its footprint, front
// facing +z. Pixel-art faces (vending displays, signs) are planes on top.
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, cyl, tx, sh, mixc, tone, hash3, rbox, ell, V5, V25 } from './build.js';
import { vendingFront, kioskBoard, clockFace, poster, SIGN_TPM } from './signs.js';

const grp = (...kids) => { const g = new THREE.Group(); for (const k of kids) if (k) g.add(k); return g; };

// ---------------------------------------------------------------- vending machine
export function vendingMachine({ brand = 'Pocori', color = 0x2a7ad8, seed = 1, onU = null } = {}) {
  const v = new VoxelModel();
  const c = color, cd = sh(c, 0.72), cl = sh(c, 1.15);
  // body 18 x 36 x 14
  fill(v, -9, 8, 0, 35, -7, 6, (x, y, z) => (y === 35 || x === -9 || x === 8 ? cd : z === 6 ? c : tone(x, y, z, c, cd, cl, 0.06, 0.04)));
  fill(v, -9, 8, 0, 1, -7, 6, 0x3a3a44); // plinth
  fill(v, -10, 9, 36, 36, -8, 7, 0xd8dce0); // top cap
  fill(v, -10, 9, 37, 37, -8, 7, cd);
  const g = grp(vm(v, V5, [0, 0, 0]));
  const pc = vendingFront({ brand, color: '#' + c.toString(16).padStart(6, '0'), seed });
  const front = signPlane(pc, 0.86, { lit: true });
  front.position.set(0, 0.9, 0.351);
  g.add(front);
  // the display window glows (a second emissive plane over the window only)
  const win = signPlane(cropCanvas(pc, 3, 14, pc.w - 6, 58), 0.86 * (pc.w - 6) / pc.w, { emissive: 1.25, onU, mode: 1 });
  win.position.set(0, 0.9 + (pc.h / 2 - 14 - 29) / SIGN_TPM * (0.86 * SIGN_TPM / pc.w), 0.355);
  g.add(win);
  g.userData.kind = 'vending';
  return g;
}
function cropCanvas(pc, x, y, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(pc.c, x, y, w, h, 0, 0, w, h);
  return { c, w, h };
}

// ---------------------------------------------------------------- platform bench (3 moulded seats)
export function bench({ color = 0x3a9a8a, seats = 3 } = {}) {
  const v = new VoxelModel();
  const frame = 0x8a9098, frameD = 0x6a7078;
  const half = seats * 5;
  fill(v, -half, half - 1, 7, 7, -3, 3, frame);
  for (const x of [-half + 1, half - 2]) { fill(v, x, x, 0, 6, -2, -2, frameD); fill(v, x, x, 0, 6, 2, 2, frameD); fill(v, x, x, 0, 0, -3, 3, frameD); }
  for (let s = 0; s < seats; s++) {
    const x0 = -half + s * 10 + 1, x1 = x0 + 7;
    const cc = s % 2 ? sh(color, 1.08) : color;
    rbox(v, x0, x1, 8, 9, -3, 3, 0.6, cc);
    rbox(v, x0, x1, 10, 17, -4, -3, 0.6, (x, y, z) => (y === 17 ? sh(cc, 1.12) : cc));
  }
  return grp(vm(v, V5));
}

// ---------------------------------------------------------------- recycling bins (cans / bottles / other)
export function bins() {
  const v = new VoxelModel();
  const cols = [0x3a8ad8, 0x4aa84a, 0xd8a03a];
  for (let i = 0; i < 3; i++) {
    const x0 = -9 + i * 6;
    fill(v, x0, x0 + 5, 0, 17, -3, 3, (x, y, z) => (y >= 15 ? 0xd8dce0 : x === x0 + 5 ? 0x9aa0a8 : 0xc8ccd4));
    fill(v, x0 + 1, x0 + 4, 12, 13, 4, 4, cols[i]);
    fill(v, x0 + 2, x0 + 3, 16, 16, 4, 4, 0x2a2a30); // slot
    fill(v, x0 + 1, x0 + 4, 16, 16, 3, 3, 0x2a2a30);
  }
  return grp(vm(v, V5));
}

// ---------------------------------------------------------------- steel roof column, painted, with a band
export function column({ h = 64, color = 0xe8e2d0, band = 0x1f8a7a, top = true } = {}) {
  const v = new VoxelModel();
  fill(v, -2, 1, 0, h - 1, -2, 1, (x, y, z) => (y < 2 ? 0x8a8a90 : y >= 20 && y <= 22 ? band : (x === 1 || z === 1) ? sh(color, 0.9) : color));
  if (top) { fill(v, -3, 2, h, h + 1, -6, 5, sh(color, 0.85)); }
  return grp(vm(v, V5));
}

// ---------------------------------------------------------------- hanging clock
export function hangingClock() {
  const v = new VoxelModel();
  fill(v, 0, 0, 10, 20, 0, 0, 0x5a5a62);
  cyl(v, 0.5, 0.5, 6, 0, 9, 0x3a3a42);
  const g = grp();
  const m = vm(v, V25, [0.5, 0, 0.5]); m.rotation.x = Math.PI / 2; m.position.y = 0.25;
  const face = signPlane(clockFace(15, 24), 0.28);
  face.position.set(0, 0.0, 0.09);
  g.add(m, face);
  g.userData.face = face;
  return g;
}

// ---------------------------------------------------------------- station kiosk
export function kiosk({ onU = null } = {}) {
  const v = new VoxelModel();
  const W = 30, D = 18, H = 44;
  const body = 0xe8e4d8, trim = 0x1f8a7a;
  // booth
  fill(v, -W, W - 1, 0, 18, -D, -6, (x, y, z) => (y < 2 ? 0x6a6a72 : y === 18 ? trim : tone(x, y, z, body, sh(body, 0.94), sh(body, 1.04))));
  fill(v, -W, W - 1, 19, 20, -D, -4, 0xb8a88a); // counter top (wood)
  fill(v, -W, W - 1, 21, H - 1, -D, -D + 1, body); // back wall
  fill(v, -W, -W + 1, 21, H - 1, -D, -6, body); fill(v, W - 2, W - 1, 21, H - 1, -D, -6, body);
  fill(v, -W - 1, W, H, H + 1, -D - 1, -2, sh(body, 0.9)); // roof
  // shelves of goods behind the counter
  const goods = [0xe8443a, 0xf0c040, 0x3a8ad8, 0x6ab04a, 0xf4f0e8, 0xff8ab0, 0x8a5ac8, 0xc87a3a];
  for (const sy of [24, 31, 38]) {
    fill(v, -W + 2, W - 3, sy - 1, sy - 1, -D + 2, -D + 5, 0xb8a88a);
    for (let x = -W + 3; x < W - 3; x += 2) { const c = goods[(x * 7 + sy) & 7]; const hh = 2 + ((x + sy) % 3); fill(v, x, x, sy, sy + hh, -D + 2, -D + 3, c); }
  }
  // magazines rack on the counter front (fanned colourful covers)
  for (let x = -W + 2; x < W - 2; x += 3) { const c = goods[(x * 3) & 7]; fill(v, x, x + 1, 8, 15, -5, -5, c); fill(v, x, x + 1, 15, 15, -5, -5, 0xffffff); }
  // drinks cooler on the side (glowing)
  const glow = new VoxelModel();
  fill(glow, W - 1, W + 8, 0, 34, -D, -8, null);
  fill(v, W, W + 9, 0, 35, -D, -7, (x, y, z) => (y === 35 || x === W + 9 ? 0xc8ccd4 : 0xd8dce0));
  for (let y = 4; y <= 32; y++) for (let z = -D + 1; z <= -8; z++) { const shelf = y % 7 === 0; glow.set(W + 10, y, z, shelf ? 0xb8c4cc : goods[(y * 3 + z) & 7]); }
  const g = grp(vm(v, V5), glowVm(glow, V5, [0, 0, 0], { intensity: 0.9, onU }));
  const board = signPlane(kioskBoard(), 1.4, { emissive: 0.6, onU });
  board.position.set(0, (H + 4) * V5, -1 * V5);
  g.add(board);
  return g;
}

// ---------------------------------------------------------------- luggage + hand props (fine voxels)
export function suitcase(color = 0xc84a3a, { w = 8, h = 11, d = 4, handle = true } = {}) {
  const v = new VoxelModel();
  rbox(v, -w / 2, w / 2 - 1, 1, h, -d / 2, d / 2 - 1, 0.8, (x, y, z) => (x % 3 === 0 ? sh(color, 0.9) : color));
  for (const x of [-w / 2 + 1, w / 2 - 2]) v.set(x, 0, 0, 0x2a2a30);
  if (handle) { fill(v, -2, -2, h + 1, h + 6, 0, 0, 0x6a6a72); fill(v, 1, 1, h + 1, h + 6, 0, 0, 0x6a6a72); fill(v, -2, 1, h + 6, h + 6, 0, 0, 0x2a2a30); }
  return grp(vm(v, V25 * 2, [0, 0, 0]));
}
export function briefcase(color = 0x3a2a24) {
  const v = new VoxelModel();
  rbox(v, -7, 6, 0, 9, -1, 1, 0.5, color);
  fill(v, -2, 1, 10, 11, 0, 0, 0x2a1a14); fill(v, -2, -2, 10, 10, 0, 0, color);
  v.set(-3, 7, 2, 0xd8b040); v.set(2, 7, 2, 0xd8b040);
  const m = vm(v, V25, [0, 11, 0]);
  return grp(m);
}
export function shoppingBag(color = 0xf4f0e8, logo = 0xe8443a) {
  const v = new VoxelModel();
  fill(v, -5, 4, 0, 11, -2, 1, (x, y, z) => (y >= 5 && y <= 7 && x >= -2 && x <= 1 && z === 1 ? logo : color));
  fill(v, -3, -3, 12, 15, 0, 0, 0x8a6a4a); fill(v, 2, 2, 12, 15, 0, 0, 0x8a6a4a); fill(v, -3, 2, 15, 15, 0, 0, 0x8a6a4a);
  return grp(vm(v, V25, [0, 15, 0]));
}
export function backpack(color = 0x4a7a5a) {
  const v = new VoxelModel();
  rbox(v, -4, 3, 0, 10, -2, 2, 1.4, (x, y, z) => (z === 2 && y >= 2 && y <= 5 ? sh(color, 0.85) : color));
  return grp(vm(v, V25 * 1.6, [0, 5, 0]));
}
export function duffel(color = 0xd99a3c) {
  const v = new VoxelModel();
  ell(v, 0, 3, 0, 7, 3.5, 3.5, (x, y, z) => (Math.abs(x) === 6 ? sh(color, 0.8) : y === 6 && z === 0 ? 0x2a2a30 : color));
  for (let x = -3; x <= 3; x++) v.set(x, 8 - (Math.abs(x) > 2 ? 1 : 0), 0, 0x3a2a24);
  return grp(vm(v, V25 * 1.6, [0, 8, 0]));
}

// ---------------------------------------------------------------- paper poster on a wall (lit plane)
export function posterBoard(kind, seed = 1) {
  const p = poster(kind, seed);
  return signPlane(p, p.w / SIGN_TPM * 1.25);
}
