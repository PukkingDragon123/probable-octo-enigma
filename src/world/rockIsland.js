// Kappa Island's ground: a floating island of bare volcanic rock (no soil, no
// grass anywhere) built from 10 cm voxels, the way the old hot-spring valleys
// look: weathered stone slabs split by cracks; cream travertine crusted round
// the hot water with rust-orange runs where it spills; yellow sulphur round
// the steam vents; cliffs of banded strata under the rim; clusters of
// columnar basalt standing along the back; boulders. Only the visible shell
// of the rock is filled (the top skin, the cliff walls, the stepped underside).
//
//   const R = rockIsland(shape, { basins, vents, keep, seed });
//   scene.add(R.group);  R.outcrops -> [{ x, z, r }] to block in the nav grid
import * as THREE from 'three';
import { VoxelModel, vm, tone, hash3, sh, mixc, V1, V5 } from './build.js';
import { fbm2 } from '../core/util.js';

const SLAB = [0x6f6a6c, 0x7c7676, 0x878180, 0x938c88, 0x9f9890, 0xaba397];
const CRACK = 0x4c4650, PEBBLE = 0xb8b0a4;
const TRAV = [0xc9bca2, 0xd8ccb2, 0xe6dcc6, 0xf2ead8];
const RUST = [0xa0582e, 0xb86c38, 0xcc844a];
const SULF = [0xc8b040, 0xdcc850, 0xece070];
const STRATA = [0x8e7e72, 0x7c6c66, 0x9c8a7c, 0x6e6278, 0x5a4e70, 0x4a3e66, 0x3c3258];
const BASALT = [0x4a4652, 0x58545f, 0x66626c, 0x74707a, 0x84808a, 0x96929a];

// Voronoi slabs: which slab a point is in and how close it is to a crack
function slabAt(x, z, size, seed) {
  const gx = Math.floor(x / size), gz = Math.floor(z / size);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cz = gz + j;
    const px = (cx + hash3(cx, cz, seed)) * size, pz = (cz + hash3(cz, cx, seed + 1)) * size;
    const d = Math.hypot(x - px, z - pz);
    if (d < d1) { d2 = d1; d1 = d; id = cx * 7919 + cz; } else if (d < d2) d2 = d;
  }
  return { id, edge: d2 - d1 };
}

export function rockIsland(shape, { basins = [], vents = [], keep = [], columns = [], seed = 11 } = {}) {
  const S = shape, U = V1;
  const v = new VoxelModel();
  const x0 = Math.floor((S.cx - S.rx * 1.35) / U), x1 = Math.ceil((S.cx + S.rx * 1.35) / U);
  const z0 = Math.floor((S.cz - S.rz * 1.35) / U), z1 = Math.ceil((S.cz + S.rz * 1.35) / U);
  const W = x1 - x0 + 1, D = z1 - z0 + 1;
  // per column: top voxel index (top face at (t + 1) * U), bottom index; NaN = no rock
  const top = new Float32Array(W * D).fill(NaN), bot = new Float32Array(W * D).fill(NaN);
  const basinQ = (x, z) => {
    let best = null;
    for (const b of basins) {
      const n = (fbm2(x * 1.7 + b.x, z * 1.7 + b.z, seed + 3, 2) - 0.5) * 0.22;
      const q = ((x - b.x) / b.rx) ** 2 + ((z - b.z) / b.rz) ** 2 + n;
      if (!best || q < best.q) best = { b, q };
    }
    return best;
  };
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const x = (x0 + i + 0.5) * U, z = (z0 + j + 0.5) * U;
    if (!S.inside(x, z)) continue;
    const k = S.k(x, z);
    let t = -1;
    if (k < 0.035) t = -2; // the rim drops a step
    const bq = basinQ(x, z);
    if (bq && bq.q < 1) t = (bq.b.level ?? 0) - Math.round(bq.b.depth * Math.min(1, (1 - bq.q) * 4) / U) - 1;
    else if (bq && bq.b.level && bq.q < 1.35) t = bq.b.level; // the rimstone dam: a lip just above the terrace water
    else if (bq && bq.b.level && bq.q < 1.8) t = bq.b.level - 1; // a sunken apron round a lower pool
    top[j * W + i] = t;
    bot[j * W + i] = Math.round(S.depthAt(x, z) / U);
  }
  const T = (i, j) => (i < 0 || j < 0 || i >= W || j >= D ? NaN : top[j * W + i]);
  const Bt = (i, j) => (i < 0 || j < 0 || i >= W || j >= D ? NaN : bot[j * W + i]);
  // colours
  const surface = (x, z, y, i, j) => {
    const X = x * U, Z = z * U;
    const bq = basinQ(X, Z);
    // inside a basin: pale travertine floor (seen through the water)
    if (bq && bq.q < 1) return bq.b.tint === 'red' ? 0x9a5a3a : bq.b.tint === 'blue' ? 0x7ab8c8 : mixc(TRAV[1], 0x9ad0c8, 0.35);
    // round the hot water: travertine crust, damp dark lip, rust runs where it spills
    if (bq && bq.q < 1.5) {
      if (bq.q < 1.1) return hash3(x, z, 3) < 0.3 ? TRAV[0] : sh(TRAV[1], 0.9);
      const runs = fbm2(X * 2.5, Z * 2.5, seed + 5, 2);
      if (runs > 0.62) return RUST[Math.floor(hash3(x, z, 4) * 3)];
      return TRAV[1 + Math.floor(hash3(x, z, 5) * 3)];
    }
    for (const vt of vents) {
      // a crack in the rock breathing steam: a dark mouth, a lip of yellow
      // sulphur crystals, then grey-white mineral crust fading into the stone
      const dx = X - vt.x, dz = Z - vt.z, d = Math.hypot(dx * 0.7, dz * 1.4);
      const jag = (hash3(x, z, 12) - 0.5) * 0.08;
      if (d < 0.07 + jag) return 0x24202a;
      if (d < 0.16 + jag) return SULF[Math.floor(hash3(x, z, 6) * 3)];
      if (d < 0.3 + jag && hash3(x, z, 13) < 0.7) return hash3(x, z, 14) < 0.5 ? 0xd8d4c8 : 0xbab4a8;
    }
    // stone slabs split by cracks, each slab its own grey, pits and pebbles
    const sl = slabAt(X, Z, 0.62, seed);
    if (sl.edge < 0.07) return CRACK;
    const base = Math.floor(hash3(sl.id, 1, seed) * 4) + 1;
    let c = SLAB[base];
    const n = hash3(x, z, 9);
    if (n < 0.08) c = SLAB[base - 1]; else if (n > 0.94) c = PEBBLE;
    if (sl.edge < 0.14) c = SLAB[Math.max(0, base - 1)];
    if (S.k(X, Z) < 0.06) c = sh(c, 0.88);
    return c;
  };
  const cliff = (x, y, z) => {
    const X = x * U, Z = z * U;
    const w = fbm2(X * 0.8 + y * 0.02, Z * 0.8, seed + 7, 2);
    const band = Math.floor(-y * 0.42 + w * 3.2);
    let c = STRATA[((band % 5) + 5) % 5];
    if (y < -24) c = mixc(c, STRATA[6], Math.min(0.8, (-y - 24) / 30));
    if (hash3(x, y >> 2, z, 11) < 0.06) c = sh(c, 0.8); // vertical cracks
    if (hash3(x, y, z) < 0.08) c = sh(c, 1.12);
    return c;
  };
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const t = top[j * W + i];
    if (Number.isNaN(t)) continue;
    const b = Math.min(bot[j * W + i], t - 1);
    // the top skin down to the lowest neighbouring top (or the whole wall at the rim)
    let lo = t;
    let bhi = b;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nt = T(i + di, j + dj), nb = Bt(i + di, j + dj);
      if (Number.isNaN(nt)) { lo = b; bhi = t; break; }
      lo = Math.min(lo, nt);
      bhi = Math.max(bhi, Math.min(nb, nt));
    }
    const x = x0 + i, z = z0 + j;
    for (let y = Math.max(b, lo); y <= t; y++) v.set(x, y, z, y === t ? surface(x, z, y, i, j) : y >= t - 1 ? sh(surface(x, z, y, i, j), 0.82) : cliff(x, y, z));
    for (let y = b; y <= Math.min(bhi, t); y++) v.set(x, y, z, cliff(x, y, z));
  }
  const group = new THREE.Group();
  group.add(vm(v, U, [0, 0, 0], { grain: 0.04 }));

  // columnar basalt along the back rim and a few lone clusters; boulders
  const outcrops = [];
  const free = (x, z, r) => {
    if (!S.inside(x, z) || S.k(x, z) < 0.05) return false;
    for (const kz of keep) if (Math.hypot(x - kz.x, z - kz.z) < kz.r + r) return false;
    for (const b of basins) if (((x - b.x) / (b.rx + r + 0.3)) ** 2 + ((z - b.z) / (b.rz + r + 0.3)) ** 2 < 1) return false;
    for (const o of outcrops) if (Math.hypot(x - o.x, z - o.z) < o.r + r + 0.15) return false;
    return true;
  };
  const rocks = new VoxelModel();
  let placed = 0;
  for (const [i, c] of columns.entries()) { // hand-placed basalt along the back rim
    basaltCluster(rocks, Math.round(c.x / V5), Math.round(c.z / V5), Math.round(c.r / V5), Math.round(c.h / V5), seed + 100 + i, (vx, vz) => S.inside(vx * V5, vz * V5) && S.k(vx * V5, vz * V5) > 0.045);
    outcrops.push({ x: c.x, z: c.z, r: c.r });
  }
  for (let a = 0; a < 400 && placed < 16; a++) {
    // mostly along the back half of the rim (away from the camera at +x +z)
    const ang = Math.PI + (hash3(a, 3, seed) - 0.5) * 2.6 + Math.PI / 4;
    const rr = 0.62 + hash3(a, 4, seed) * 0.26;
    const x = S.cx + Math.cos(ang) * S.rx * rr, z = S.cz + Math.sin(ang) * S.rz * rr;
    const r = 0.45 + hash3(a, 5, seed) * 0.5;
    if (!free(x, z, r)) continue;
    basaltCluster(rocks, Math.round(x / V5), Math.round(z / V5), Math.round(r / V5), 10 + Math.floor(hash3(a, 6, seed) * 22), seed + a);
    outcrops.push({ x, z, r });
    placed++;
  }
  for (let a = 0; a < 200 && placed < 30; a++) {
    const x = S.cx + (hash3(a, 7, seed) - 0.5) * S.rx * 1.8, z = S.cz + (hash3(a, 8, seed) - 0.5) * S.rz * 1.8;
    const r = 0.18 + hash3(a, 9, seed) * 0.22;
    if (!free(x, z, r)) continue;
    boulder(rocks, Math.round(x / V5), Math.round(z / V5), Math.round(r / V5), seed + a);
    outcrops.push({ x, z, r });
    placed++;
  }
  group.add(vm(rocks, V5, [0.5, 0, 0.5]));
  return { group, outcrops };
}

// a cluster of hexagonal-ish basalt columns: packed square columns, tallest
// in the middle, lit tops with a dark rim, horizontal joints, some snapped short
export function basaltCluster(v, cx, cz, R, H, seed, ok = null) {
  const cw = 4;
  for (let gz = -R; gz <= R; gz += cw) for (let gx = -R; gx <= R; gx += cw) {
    const ox = gx + ((gz / cw) & 1 ? 2 : 0);
    const d = Math.hypot(ox, gz) / Math.max(1, R);
    if (d > 1) continue;
    if (ok && !ok(cx + ox, cz + gz)) continue;
    const h = Math.max(2, Math.round(H * (1 - d * d * 0.7) * (0.55 + hash3(ox, gz, seed) * 0.5)));
    const tone0 = Math.floor(hash3(gz, ox, seed + 1) * 3) + 1;
    for (let x = 0; x < cw; x++) for (let z = 0; z < cw; z++) for (let y = 0; y < h; y++) {
      const edgeX = x === 0 || x === cw - 1, edgeZ = z === 0 || z === cw - 1;
      let c;
      if (y === h - 1) c = edgeX || edgeZ ? BASALT[tone0 + 1] : BASALT[tone0 + 2]; // the lit top facet
      else if ((y + (ox & 3)) % 7 === 0) c = BASALT[0]; // joints
      else if (edgeX && edgeZ) c = BASALT[0]; // the dark seam between columns
      else c = BASALT[tone0 + (x === cw - 1 || z === cw - 1 ? 1 : 0) - (y < 2 ? 1 : 0)];
      v.set(cx + ox + x - 2, y, cz + gz + z - 2, c);
    }
  }
}
// a rounded boulder with facets, a lighter top, a few rust and lichen spots
export function boulder(v, cx, cz, R, seed) {
  const ry = Math.max(2, Math.round(R * (0.6 + hash3(R, seed, 1) * 0.4)));
  for (let x = -R; x <= R; x++) for (let y = 0; y <= ry; y++) for (let z = -R; z <= R; z++) {
    const n = hash3(x + seed, y, z) * 0.22;
    if ((x / (R + 0.5)) ** 2 + (y / (ry + 0.5)) ** 2 + (z / (R + 0.5)) ** 2 > 1 - n * 0.35) continue;
    let c = SLAB[1 + Math.floor(hash3(x >> 1, y >> 1, z + seed) * 3)];
    if (y >= ry - 1) c = SLAB[4];
    if (hash3(x, y, z + seed * 3) < 0.012) c = RUST[0];
    else if (hash3(x, y, z + seed * 5) < 0.02) c = 0xd8d0b8;
    v.set(cx + x, y, cz + z, c);
  }
}
