// Spirit Realm kit: a voxel sky-island (grass top, layered cliffs, a rocky
// underside with hanging roots and vines), Grandpa's old minka with its
// engawa, the torii that the basement door opens onto, stone lanterns, a koi
// pond spilling over the edge as a waterfall, voxel cloud puffs and a sea of
// clouds, and far-off islands waiting behind cloud banks.
import * as THREE from 'three';
import { VoxelModel, vm, glowVm, signPlane, fill, carve, sh, mixc, tone, hash3, ell, V1, V5, V25 } from './build.js';
import { PixCanvas, mix, darken, lighten } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { fbm2 } from '../core/util.js';

const grp = (...k) => { const g = new THREE.Group(); for (const c of k) if (c) g.add(c); return g; };
const V2 = 0.2;

// ---------------------------------------------------------------- the island
// shape: a noisy ellipse; heightAt gives the grass height (0 = garden level);
// depthAt the underside bottom (negative). Only the visible shell is filled.
export function islandShape({ rx = 9.2, rz = 5.9, cx = 0, cz = 0.9, seed = 3 } = {}) {
  const edge = (x, z) => {
    const a = Math.atan2((z - cz) / rz, (x - cx) / rx);
    return 1 + (fbm2(Math.cos(a) * 1.6 + 7, Math.sin(a) * 1.6 + 7, seed, 3) - 0.5) * 0.42;
  };
  const d = (x, z) => Math.hypot((x - cx) / rx, (z - cz) / rz);
  const inside = (x, z) => d(x, z) < edge(x, z);
  const k = (x, z) => Math.max(0, 1 - d(x, z) / edge(x, z)); // 0 at the rim, 1 at the centre
  const depthAt = (x, z) => -(0.9 + Math.pow(k(x, z), 0.55) * 5.6 + (fbm2(x * 0.6, z * 0.6, seed + 9, 3) - 0.5) * 1.4);
  return { inside, k, depthAt, rx, rz, cx, cz };
}

export function islandMesh(S, { pond = null, path = [] } = {}) {
  const top = new VoxelModel(), under = new VoxelModel();
  const x0 = Math.floor((S.cx - S.rx * 1.3) / V1), x1 = Math.ceil((S.cx + S.rx * 1.3) / V1);
  const z0 = Math.floor((S.cz - S.rz * 1.3) / V1), z1 = Math.ceil((S.cz + S.rz * 1.3) / V1);
  const inV = (i, j) => S.inside(i * V1 + 0.05, j * V1 + 0.05);
  const inPond = (x, z) => pond && ((x - pond.x) / pond.rx) ** 2 + ((z - pond.z) / pond.rz) ** 2 < 1;
  const SLAB = 7; // 0.7 m of grass-and-earth lip above the rock
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    if (!inV(i, j)) continue;
    const x = i * V1 + 0.05, z = j * V1 + 0.05;
    const rim = !inV(i + 1, j) || !inV(i - 1, j) || !inV(i, j + 1) || !inV(i, j - 1);
    const kk = S.k(x, z);
    const pondHere = inPond(x, z);
    // grass top (a darker lip near the rim, lighter sunny patches, flowers)
    let topY = -1;
    if (pondHere) topY = -3; // the pond bowl
    const n = fbm2(x * 0.7, z * 0.7, 5, 3);
    const g = kk < 0.06 ? 0x5a9a3a : n > 0.6 ? 0x8ac458 : n < 0.38 ? 0x6aa840 : 0x7ab84a;
    const fl = hash3(i, 7, j);
    const flower = fl < 0.012 ? 0xffffff : fl < 0.02 ? 0xffb0d0 : fl < 0.026 ? 0xffe060 : null;
    if (pondHere) top.set(i, topY, j, 0x5a6a5a);
    else top.set(i, topY, j, flower ?? tone(i, 0, j, g, sh(g, 0.92), sh(g, 1.06), 0.12, 0.08));
    if (pondHere) { for (let y = topY + 1; y < -1; y++) if (!inPond(x + V1, z) || !inPond(x - V1, z) || !inPond(x, z + V1) || !inPond(x, z - V1)) top.set(i, y, j, 0x8a8a7a); }
    if (rim) {
      for (let y = topY - 1; y >= -SLAB; y--) {
        const dirt = y > -3 ? 0x6a8a3a : y > -5 ? 0x8a6a42 : 0x7a5a3a;
        top.set(i, y, j, hash3(i, y, j) < 0.1 ? sh(dirt, 0.85) : dirt);
      }
      // a grass overhang lip just outside the cliff
      if (hash3(i, 3, j) < 0.6) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inV(i + di, j + dj)) top.set(i + di, -1, j + dj, 0x5a9a3a);
    }
  }
  // underside at 0.2 m: fill each column from its bottom up to the highest neighbour bottom
  const u0 = Math.floor(x0 / 2), u1 = Math.ceil(x1 / 2), w0 = Math.floor(z0 / 2), w1 = Math.ceil(z1 / 2);
  const bottom = new Map();
  const bAt = (a, b) => { const key = a * 4096 + b; if (bottom.has(key)) return bottom.get(key); const x = a * V2 + 0.1, z = b * V2 + 0.1; const v = S.inside(x, z) ? Math.round(S.depthAt(x, z) / V2) : null; bottom.set(key, v); return v; };
  const slabB = Math.floor(-SLAB * V1 / V2); // underside starts below the top slab
  for (let a = u0; a <= u1; a++) for (let b = w0; b <= w1; b++) {
    const bt = bAt(a, b);
    if (bt == null) continue;
    let upTo = bt;
    for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nb = bAt(a + da, b + db); upTo = Math.max(upTo, nb == null ? slabB : nb); }
    upTo = Math.min(slabB, upTo + 1);
    for (let y = bt; y <= upTo; y++) {
      const band = Math.floor((y + 40) / 3) % 4;
      const base = [0x8a7a6a, 0x7a6a62, 0x9a8a78, 0x6e6270][band];
      const deep = Math.max(0, Math.min(1, (-y - 6) / 20));
      let c = mixc(base, 0x5a4a6a, deep * 0.6);
      if (y > slabB - 3 && hash3(a, y, b) < 0.25) c = 0x5a8a4a; // moss near the top
      under.set(a, y, b, hash3(a, y, b) < 0.12 ? sh(c, 0.86) : c);
    }
  }
  // hanging roots and vines under the rim (fine voxels)
  const roots = new VoxelModel();
  for (let n = 0; n < 160; n++) {
    const a = (n / 160) * Math.PI * 2 + hash3(n, 1, 2) * 0.05;
    let x = S.cx + Math.cos(a) * S.rx * 0.97, z = S.cz + Math.sin(a) * S.rz * 0.97;
    for (let t = 0; t < 30 && !S.inside(x, z); t++) { x -= Math.cos(a) * 0.05; z -= Math.sin(a) * 0.05; }
    const vine = hash3(n, 3, 3) < 0.4;
    const L = 8 + Math.floor(hash3(n, 5, 5) * (vine ? 30 : 18));
    let rx = Math.round(x / V25), rz = Math.round(z / V25);
    for (let y = 0; y < L; y++) {
      const yy = Math.round(-0.75 / V25) - y;
      if (y % 6 === 5) rx += hash3(n, y, 1) < 0.5 ? 1 : -1;
      roots.set(rx, yy, rz, vine ? (y % 4 === 0 ? 0x7ac858 : 0x4a8a3a) : (y % 3 === 0 ? 0x6a4a2e : 0x5a3a24));
      if (vine && y % 5 === 2) roots.set(rx + 1, yy, rz, 0x8ad868);
    }
  }
  return grp(vm(top, V1), vm(under, V2, [0, 0, 0], { cast: false }), vm(roots, V25, [0, 0, 0], { cast: false }));
}

// ---------------------------------------------------------------- Grandpa's old minka
export function oldHouse({ onU = null } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const W = 104, D = 62, F = 9; // footprint (V5), floor height
  const x0 = -W / 2, x1 = W / 2 - 1, z0 = -D, z1 = -1;
  const post = 0x4a2e1e, plaster = 0xf0e8d8, board = 0x6a4428, stone = 0x8a8a82;
  // stone footings + raised floor
  for (let x = x0; x <= x1; x += 13) for (const z of [z0, z1]) fill(v, x, x + 2, 0, 2, z, z + 2, stone);
  fill(v, x0, x1, F - 1, F - 1, z0, z1, 0x7a5232);
  // walls: posts every 13, plaster above a board dado; the front is sliding shoji
  for (let x = x0; x <= x1; x++) for (let y = F; y < F + 46; y++) {
    const isPost = (x - x0) % 13 === 0 || x === x1;
    const col = isPost ? post : y < F + 12 ? (y % 3 === 0 ? sh(board, 0.85) : board) : y === F + 30 ? post : plaster;
    v.set(x, y, z0, col);
    if (isPost) v.set(x, y, z1, post);
  }
  for (let z = z0; z <= z1; z++) for (let y = F; y < F + 46; y++) {
    const isPost = (z - z0) % 13 === 0 || z === z1;
    const col = isPost ? post : y < F + 12 ? (y % 3 === 0 ? sh(board, 0.85) : board) : y === F + 30 ? post : plaster;
    v.set(x0, y, z, col); v.set(x1, y, z, col);
  }
  // front: shoji panels between the posts (paper with a lattice), one slid open
  for (let x = x0 + 1; x < x1; x++) {
    const bay = Math.floor((x - x0) / 13);
    if (bay === 3) continue; // the open one (dark inside)
    for (let y = F + 1; y < F + 42; y++) {
      const lat = (x - x0) % 13 === 6 || (y - F) % 8 === 0;
      v.set(x, y, z1, lat ? 0x8a6a48 : (y < F + 8 ? 0xd8ccb8 : 0xf4ecd8));
    }
  }
  fill(v, x0 + 40, x0 + 51, F, F + 41, z1 - 3, z1 - 3, 0x2a2228); // the dark room beyond the open shoji
  fill(gl, x0 + 44, x0 + 47, F + 34, F + 35, z1 - 2, z1 - 2, 0xffd890); // a lantern glow inside
  // engawa: the veranda deck along the front, with its step stone
  fill(v, x0 - 4, x1 + 4, F - 1, F - 1, z1 + 1, z1 + 16, (x, y, z) => ((x + 200) % 5 === 0 ? 0x8a5a32 : 0xa8743e));
  for (let x = x0 - 4; x <= x1 + 4; x += 13) fill(v, x, x + 1, 0, F - 2, z1 + 15, z1 + 16, post);
  fill(v, -8, 7, 0, 3, z1 + 18, z1 + 26, (x, y, z) => tone(x, y, z, 0x9a968c, 0x8a867e, 0xaaa69c));
  // roof: a big hip roof of blue-grey kawara tiles, eaves overhanging the engawa
  const RY = F + 46, over = 18;
  for (let k = 0; k < 34; k++) {
    const y = RY + k;
    const ax0 = x0 - over + k, ax1 = x1 + over - k, az0 = z0 - over + k, az1 = z1 + over - k;
    if (ax0 > ax1 - 6 || az0 > az1) break;
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const edge = x === ax0 || x === ax1 || z === az0 || z === az1;
      if (!edge && k < 33) continue;
      const row = (x + z + 400) % 3 === 0;
      v.set(x, y, z, k === 0 ? 0x3a4250 : row ? 0x4a5468 : 0x5a6478);
    }
  }
  // ridge + onigawara ends, a little chimney for the kamado
  fill(v, x0 + 18, x1 - 18, RY + 32, RY + 35, z0 + 26, z0 + 34, 0x3a4250);
  for (const x of [x0 + 17, x1 - 17]) fill(v, x - 2, x + 2, RY + 32, RY + 39, z0 + 26, z0 + 34, 0x2e3440);
  fill(v, x1 - 30, x1 - 25, RY + 14, RY + 32, z0 + 12, z0 + 17, 0x8a7a6a);
  const g = grp(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.2, mode: 3, onU }));
  // a wind chime (furin) hanging from the eave, swaying
  const fv = new VoxelModel();
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x * x + z * z <= 5) for (let y = 0; y < 3; y++) fv.set(x, -y, z, y === 0 ? 0xc8e8f8 : 0xa8d0e8);
  fill(fv, 0, 0, 1, 6, 0, 0, 0x8a8a92); fill(fv, -1, 1, -9, -4, 0, 0, 0xf8f0e0); fv.set(0, -9, 0, 0xd8302a);
  const furin = vm(fv, V25, [0.5, 6, 0.5]); furin.position.set(x0 * V5 + 1.6, (RY - 1) * V5, (z1 + 15) * V5);
  g.add(furin);
  g.userData.furin = furin;
  g.userData.door = { x: (x0 + 45.5) * V5, z: (z1 + 8) * V5 };
  g.userData.step = { x: 0, z: (z1 + 30) * V5 };
  g.userData.engawaY = F * V5;
  g.userData.update = (dt, t) => { furin.rotation.z = Math.sin(t * 2.1) * 0.12 + Math.sin(t * 0.7) * 0.05; furin.rotation.x = Math.sin(t * 1.3) * 0.06; };
  return g;
}

// ---------------------------------------------------------------- the torii portal
export function toriiPortal({ onU = null } = {}) {
  const v = new VoxelModel();
  const red = 0xd8402a, ink = 0x2a2228;
  for (const x of [-20, 18]) { fill(v, x, x + 2, 0, 52, -1, 1, red); fill(v, x - 1, x + 3, 0, 4, -2, 2, ink); }
  fill(v, -24, 22, 44, 46, -2, 2, red);
  fill(v, -27, 25, 52, 55, -3, 3, (x, y) => (y === 55 ? ink : red));
  fill(v, -28, -25, 55, 56, -3, 3, ink); fill(v, 23, 26, 55, 56, -3, 3, ink);
  fill(v, -2, 0, 46, 52, -1, 1, red);
  const g = grp(vm(v, V5));
  // the spirit door: a swirling glow between the posts
  const S = 64, p = new PixCanvas(S, S * 1.4, 6001);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < S; x++) {
    const dx = (x - S / 2) / (S / 2), dy = (y - p.h / 2) / (p.h / 2);
    const r = Math.hypot(dx, dy * 0.9), a = Math.atan2(dy, dx);
    const sw = Math.sin(a * 3 + r * 9) * 0.5 + 0.5;
    const k = Math.max(0, 1 - r) * (0.55 + sw * 0.45);
    if (k > ((x * 7 + y * 13) % 8) / 8 * 0.7) p.px(x, y, `rgba(${Math.round(180 + sw * 60)},${Math.round(240 - r * 40)},${Math.round(230 + sw * 25)},${Math.min(1, k * 1.6)})`);
  }
  const tex = new THREE.CanvasTexture(p.c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const mat = emitMat({ map: tex, color: 0xffffff, intensity: 1.15, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, onU, side: THREE.DoubleSide });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), mat);
  door.position.set(0, 1.12, 0); door.renderOrder = 6;
  g.add(door);
  g.userData.door = door;
  g.userData.update = (dt, t) => { door.rotation.z = Math.sin(t * 0.6) * 0.05; door.scale.set(1 + Math.sin(t * 1.7) * 0.03, 1 + Math.sin(t * 1.3) * 0.02, 1); mat.uniforms && mat.uniforms.uGlow && (mat.uniforms.uGlow.value = 1.0 + Math.sin(t * 2.2) * 0.15); };
  return g;
}

export function stoneLantern({ onU = null, lit = true } = {}) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const st = (x, y, z) => tone(x, y, z, 0x9a968c, 0x86827a, 0xaeaaa0, 0.2, 0.15);
  fill(v, -4, 3, 0, 2, -4, 3, st); fill(v, -2, 1, 3, 12, -2, 1, st); fill(v, -5, 4, 13, 14, -5, 4, st);
  fill(v, -4, 3, 15, 21, -4, 3, st); carve(v, -3, 2, 16, 20, -4, 3);
  if (lit) fill(gl, -2, 1, 16, 19, -1, 0, 0xffd070);
  for (let k = 0; k < 5; k++) fill(v, -6 + k, 5 - k, 22 + k, 22 + k, -6 + k, 5 - k, st);
  fill(v, -1, 0, 27, 29, -1, 0, st);
  for (let i = 0; i < 6; i++) v.set(-4 + (i % 3) * 3, 22 + Math.floor(i / 3), 5, 0x5a8a4a); // moss
  return grp(vm(v, V5, [0.5, 0, 0.5]), glowVm(gl, V5, [0.5, 0, 0.5], { intensity: 1.2, mode: 3, onU }));
}

// ---------------------------------------------------------------- pond water + koi, the waterfall
export function pondWater(rx, rz) {
  const p = new PixCanvas(64, 40, 6010);
  p.rect(0, 0, 64, 40, 'rgba(70,150,180,0.8)');
  for (let i = 0; i < 30; i++) p.hline(Math.floor(p.rnd() * 56), Math.floor(p.rnd() * 56) + 4, Math.floor(p.rnd() * 40), 'rgba(200,240,255,0.55)');
  const tex = new THREE.CanvasTexture(p.c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat);
  m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.renderOrder = 3;
  m.userData.update = (dt, t) => { tex.offset.x = (t * 0.02) % 1; tex.offset.y = Math.sin(t * 0.3) * 0.02; };
  return m;
}
export function koi(col = 0xf08a30) {
  const v = new VoxelModel();
  for (let x = -5; x <= 4; x++) { const w = x < -3 ? 0 : x > 2 ? 0 : 1; for (let z = -w; z <= w; z++) v.set(x, 0, z, (x + 10) % 3 === 0 ? 0xffffff : col); }
  v.set(5, 0, -1, col); v.set(5, 0, 1, col); v.set(-4, 1, 0, 0x2a2228);
  return vm(v, V25, [0.5, 0, 0.5], { cast: false });
}
export function waterfall(h = 5) {
  const p = new PixCanvas(16, 64, 6020);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 16; x++) { const k = (Math.sin(x * 1.7) + 1) * 0.5; p.px(x, y, (y + x * 3) % 9 < 3 ? 'rgba(255,255,255,0.95)' : `rgba(${170 + k * 60},${225 + k * 25},255,0.7)`); }
  const tex = new THREE.CanvasTexture(p.c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, h / 1.2);
  const mat = emitMat({ map: tex, color: 0xffffff, intensity: 0.75, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, h), mat);
  m.position.y = -h / 2; m.renderOrder = 4;
  const g = grp(m);
  g.userData.update = (dt, t) => { tex.offset.y = (t * 1.4) % 1; };
  return g;
}

// ---------------------------------------------------------------- clouds
export function cloudPuff(seed = 1, { r = 14, tint = 0xffffff, shade = 0xe4d6f0 } = {}) {
  // a cauliflower of overlapping round lobes; bright tops, lilac undersides,
  // a few warm highlights, the bottom flattened like real cumulus
  const v = new VoxelModel();
  const n = 6 + (seed % 4);
  const lobes = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash3(seed, i, 1) * 0.8;
    lobes.push([Math.cos(a) * r * 0.85, r * (0.25 + hash3(i, seed, 3) * 0.25), Math.sin(a) * r * 0.4, r * (0.5 + hash3(i, seed, 2) * 0.35)]);
  }
  lobes.push([0, r * 0.55, 0, r * 0.8], [r * 0.35, r * 0.75, -r * 0.1, r * 0.55]);
  for (const [cx, cy, cz, rr] of lobes) {
    ell(v, cx, cy, cz, rr, rr * 0.82, rr * 0.8, (x, y, z) => {
      if (y < 0) return null; // flat base
      const up = (y - cy) / rr;
      const h = hash3(x, y, z + seed);
      if (up > 0.45) return h < 0.06 ? 0xfff4e4 : tint;
      if (up > -0.1) return h < 0.1 ? 0xf6eefa : mixc(tint, shade, 0.25);
      return h < 0.15 ? sh(shade, 0.96) : shade;
    });
  }
  return vm(v, V1, [0, 0, 0], { cast: false, grain: 0.02 });
}
// the sea of clouds below: a big soft pixel layer (lit, so it takes the light of the hour)
export function cloudSea(size = 90) {
  const S = 256, p = new PixCanvas(S, S, 6030);
  p.rect(0, 0, S, S, '#f4e8f0');
  for (let i = 0; i < 220; i++) { const x = p.rnd() * S, y = p.rnd() * S, r = 4 + p.rnd() * 14; p.ellipse(x, y, r * 1.4, r, p.rnd() < 0.5 ? '#ffffff' : '#fff6f8'); p.ellipse(x + 2, y + r * 0.6, r * 1.2, r * 0.4, '#e0d0e8'); }
  for (let i = 0; i < 60; i++) { const x = p.rnd() * S, y = p.rnd() * S; p.ellipse(x, y, 10 + p.rnd() * 10, 3, '#d8c8e4'); }
  const tex = new THREE.CanvasTexture(p.c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / 36, size / 36); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.userData.update = (dt, t) => { tex.offset.x = (t * 0.004) % 1; tex.offset.y = (t * 0.002) % 1; };
  return m;
}

// ---------------------------------------------------------------- far islands (miniatures)
// Kappa Island: a round green islet with a steaming hot spring and a hut
export function kappaIsland() {
  const v = new VoxelModel(), gl = new VoxelModel();
  for (let x = -30; x <= 30; x++) for (let z = -18; z <= 18; z++) {
    const d = Math.hypot(x / 30, z / 18);
    if (d > 1) continue;
    const depth = Math.round(4 + (1 - d) * 26);
    for (let y = -depth; y <= 0; y++) v.set(x, y, z, y === 0 ? (Math.hypot(x - 8, z - 2) < 7 ? 0x9ad8e0 : (x + z) % 7 === 0 ? 0x8ac458 : 0x7ab84a) : y > -3 ? 0x8a6a42 : (y % 4 === 0 ? 0x7a6a62 : 0x8a7a6a));
  }
  for (let x = 1; x <= 15; x++) for (let z = -5; z <= 9; z++) if (Math.hypot(x - 8, z - 2) < 7) gl.set(x, 1, z, 0xb8f0f0);
  fill(v, -18, -8, 1, 8, -6, 2, 0x8a6a42); for (let k = 0; k < 5; k++) fill(v, -20 + k, -6 - k, 9 + k, 9 + k, -8 + k, 4 - k, 0x4a7a5a);
  for (let x = -26; x <= -12; x += 3) for (let z = 8; z <= 14; z += 3) fill(v, x, x, 1, 3, z, z, 0x3a8a3a); // cucumber rows
  return grp(vm(v, V1, [0, 0, 0], { cast: false }), glowVm(gl, V1, [0, 0, 0], { intensity: 0.8 }));
}
// Tarōbō's castle on a craggy peak
export function tenguPeak() {
  const v = new VoxelModel();
  for (let y = -60; y <= 20; y++) { const r = y < 0 ? 14 + (-y) * 0.12 : Math.max(2, 14 - y * 0.55); for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r); z <= r; z++) if (Math.hypot(x, z) <= r - hash3(x, y, z) * 1.5) v.set(x, y, z, y > 14 ? 0x7ab84a : hash3(x >> 1, y >> 2, z >> 1) < 0.2 ? 0x5a8a4a : (y % 5 === 0 ? 0x6a6270 : 0x7a7280)); }
  // a three-tier castle at the top
  for (let t = 0; t < 3; t++) {
    const w = 9 - t * 2.5, y0 = 21 + t * 8;
    fill(v, -Math.round(w), Math.round(w), y0, y0 + 4, -Math.round(w), Math.round(w), 0xf0e8d8);
    for (let k = 0; k < 4; k++) fill(v, -Math.round(w) - 3 + k, Math.round(w) + 3 - k, y0 + 5 + k, y0 + 5 + k, -Math.round(w) - 3 + k, Math.round(w) + 3 - k, 0x3a4250);
  }
  fill(v, -1, 1, 45, 47, -1, 1, 0xd8a83a);
  return grp(vm(v, V1, [0, 0, 0], { cast: false }));
}
