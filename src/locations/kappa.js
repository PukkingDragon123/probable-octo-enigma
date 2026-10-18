// Kappa Island: Kappei's home in the clouds (isometric, like Grandpa's
// garden), remade as bare volcanic rock and hot water, nothing growing: a
// floating island of stone slabs and banded cliffs with columnar basalt along
// the back; a big steaming pool (where Mamo learns to swim) stepping down in
// cream travertine terraces to a hot waterfall over the edge; Kappei's rock
// hot spring for soaking; a blue spring and a red one; steam vents crusted
// with sulphur; and Kappei's little wooden bath hut with its noren.
//   L.swimNav  - walkable grid inside the big pool (for swimming)
//   L.buoys    - [{ x, z, mesh }] the swim course, in order
//   L.onsen    - { x, z, r } the soaking spring
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { islandShape, cloudPuff, waterfall } from '../world/spiritIsland.js';
import { VoxelModel, vm, glowVm, signPlane, fill, ell, tone, hash3, V5, V25 } from '../world/build.js';
import { PixCanvas } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { NavGrid } from '../core/nav.js';
import { FONT } from '../ui/fonts.js';
import { nebulaVoid, dreamClouds, SpiritAir } from '../world/spiritFx.js';
import { magicWater } from '../world/onsen.js';
import { rockIsland, boulder } from '../world/rockIsland.js';

export const LAGOON = { x: 2.4, z: 2.0, rx: 3.0, rz: 1.75, depth: 7, sand: true };
const ONSEN = { x: -3.4, z: 2.4, r: 1.3 };

// ---------------------------------------------------------------- props
// Kappei's little bath hut: a stone footing, walls of vertical cedar boards
// on dark posts, a gabled roof of layered cedar shingles with a steam vent on
// the ridge, a lattice window, the doorway hung with an indigo noren, a red
// paper lantern under the eave, a bench, buckets and a towel rail
function hut(onU) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const W = 34, Dp = 26, H = 24; // x -W/2..W/2, z -Dp/2..Dp/2 (front at +z)
  const xa = -W / 2, xb = W / 2 - 1, za = -Dp / 2, zb = Dp / 2 - 1;
  // footing of fitted stones, a step at the door
  for (let x = xa - 2; x <= xb + 2; x++) for (let z = za - 2; z <= zb + 2; z++) for (let y = 0; y < 3; y++) {
    const st = Math.floor((x + (y & 1) * 3) / 5) * 31 + Math.floor((z + y * 2) / 4);
    v.set(x, y, z, (x + (y & 1) * 3) % 5 === 0 || (z + y * 2) % 4 === 0 ? 0x5a5658 : [0x7c7676, 0x878180, 0x938c88, 0x6f6a6c][Math.abs(st) % 4]);
  }
  for (let x = -5; x <= 4; x++) for (let z = zb + 3; z <= zb + 5; z++) v.set(x, 0, z, 0x938c88);
  // walls: cedar boards, posts at the corners, a beam under the eave, a dark kick strip
  for (let y = 3; y < H; y++) for (let x = xa; x <= xb; x++) for (let z = za; z <= zb; z++) {
    const wall = x === xa || x === xb || z === za || z === zb;
    if (!wall) continue;
    const corner = (x === xa || x === xb) && (z === za || z === zb);
    const door = z === zb && x >= -5 && x <= 4 && y < 20;
    const win = x === xa && z >= -4 && z <= 4 && y >= 11 && y <= 17;
    if (door) continue;
    let c;
    if (corner || y === H - 1 || y === H - 2) c = 0x3a281c;
    else if (y < 6) c = 0x4a3424;
    else { const bx = (z === za || z === zb ? x : z) + 40; c = bx % 3 === 0 ? 0x5e4430 : (Math.floor(bx / 3) % 2 ? 0x8a6444 : 0x9a7250); if (hash3(x, y, z) < 0.05) c = 0x6e5038; }
    if (win) c = (z + 40) % 3 === 0 || y === 11 || y === 17 || y === 14 ? 0x3a281c : 0xf0e2c0;
    v.set(x, y, z, c);
    if (win && c === 0xf0e2c0) gl.set(x - 1, y, z, 0xffd890);
  }
  // the warm room seen through the doorway
  for (let x = -5; x <= 4; x++) for (let y = 3; y < 20; y++) v.set(x, y, zb - 6, y < 8 ? 0x6a4a30 : 0x8a6a48);
  for (let x = -5; x <= 4; x++) for (let z = zb - 6; z <= zb; z++) v.set(x, 3, z, (x + z) % 3 ? 0x9a7a52 : 0x8a6a46);
  // gabled roof (ridge along x): layered cedar shingles, deep overhangs, a dark ridge cap
  const OV = 4, rise = 12, half = Dp / 2 + OV;
  for (let k = 0; k <= half; k++) {
    const y = H + Math.round((half - k) * rise / half);
    for (let x = xa - OV - 1; x <= xb + OV + 1; x++) for (const side of [-1, 1]) {
      const z = side < 0 ? za - OV + k : zb + OV - k;
      const row = Math.floor(k / 2);
      let c = (x + row * 2) % 5 === 0 ? 0x4a3628 : row % 2 ? 0x6e5440 : 0x7a5e46;
      if (k < 2) c = 0x3e2c20; // the eave edge
      if (hash3(x, k, side + 5) < 0.06) c = 0x8a6c50;
      v.set(x, y, z, c); v.set(x, y - 1, z, 0x4a3628);
    }
  }
  for (let x = xa - OV - 1; x <= xb + OV + 1; x++) { v.set(x, H + rise + 1, 0, 0x2e2420); v.set(x, H + rise + 1, -1, 0x2e2420); v.set(x, H + rise + 2, 0, 0x3e3028); }
  // the gable ends: boards and a little triangle vent
  for (let k = 0; k <= half - OV; k++) {
    const y = H + Math.round((half - k) * rise / half);
    for (let yy = H; yy < y; yy++) for (const x of [xa, xb]) for (const z of [za + k, zb - k]) if (z >= za && z <= zb) v.set(x, yy, z, (z + 40) % 3 === 0 ? 0x5e4430 : 0x8a6444);
  }
  // the steam vent box on the ridge (yuge-nuki)
  for (let x = -3; x <= 2; x++) for (let z = -2; z <= 1; z++) for (let y = H + rise + 2; y <= H + rise + 6; y++) v.set(x, y, z, y === H + rise + 6 ? 0x3e3028 : (x + z + y) % 2 ? 0x5e4430 : 0x6e5038);
  // bench, buckets, towel rail by the door
  for (let x = 7; x <= 15; x++) { v.set(x, 6, zb + 3, 0xa8743e); v.set(x, 6, zb + 4, 0xb8844a); } for (const x of [7, 15]) for (let y = 3; y < 6; y++) v.set(x, y, zb + 3, 0x6a4a2a);
  for (const [bx, bz, by] of [[-10, zb + 4, 3], [-13, zb + 3, 3], [-11, zb + 3, 7]]) for (let y = 0; y < 4; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) { const d = Math.hypot(x, z); if (d <= 2.3 && (d > 1.4 || y === 0)) v.set(bx + x, by + y, bz + z, y === 2 ? 0x3a2e24 : 0xc89a5a); }
  for (const x of [xb + 3, xb + 3]) for (let y = 3; y < 17; y++) v.set(x, y, zb - 2, 0x6a4a2a);
  for (let z = zb - 8; z <= zb - 2; z++) v.set(xb + 3, 17, z, 0x6a4a2a);
  for (let z = zb - 7; z <= zb - 3; z++) for (let y = 11; y <= 16; y++) v.set(xb + 3, y, z, z % 2 ? 0xf4f2ec : 0xe0dcd4);
  const g = new THREE.Group();
  g.add(vm(v, V5, [0.5, 0, 0.5]));
  // the red paper lantern and the lit window
  const lan = new VoxelModel();
  for (let y = 0; y < 6; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) { const r = 2.4 - Math.abs(y - 2.5) * 0.35; if (Math.hypot(x, z) <= r) lan.set(x, y, z, y === 0 || y === 5 ? 0x2a2228 : (y === 2 ? 0xffb070 : 0xff6a4a)); }
  const lm = glowVm(lan, V5, [0.5, 0, 0.5], { intensity: 1.3, mode: 3, onU }); lm.position.set(0.32, (H - 9) * V5, (zb + 2) * V5); g.add(lm);
  g.add(glowVm(gl, V5, [0.5, 0, 0.5], { intensity: 1.0, mode: 3, onU }));
  // the noren: indigo cloth, a white kappa face and かっぱ
  const p = new PixCanvas(40, 30, 5101);
  p.rect(0, 0, 40, 30, '#24386e'); for (let k = 1; k < 3; k++) p.rect(k * 13, 4, 1, 26, '#16285a');
  p.rect(0, 0, 40, 4, '#1a2c60');
  p.circle(20, 13, 6, '#f4f0e6'); p.circle(20, 13, 4, '#24386e'); p.rect(16, 15, 8, 2, '#f4f0e6');
  p.text('かっぱ', 20, 21, { font: `8px ${FONT.brush}`, color: '#f4f0e6', align: 'center' });
  const nr = signPlane(p, 0.52, { double: true }); nr.position.set(-0.02, 0.86, (zb + 0.6) * V5); g.add(nr);
  return g;
}
// the soaking spring: a ring of big stones (bare rock, rust-stained where the
// water laps), a wooden trough pouring hot water in, buckets and stools
function soakSpring(r, onU) {
  const g = new THREE.Group();
  const v = new VoxelModel();
  const R = Math.round(r / V5);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + hash3(k, 1, 1) * 0.2;
    const big = hash3(k, 2, 2) < 0.35;
    boulder(v, Math.round(Math.cos(a) * (R + 3)), Math.round(Math.sin(a) * (R + 3)), big ? 5 : 3, k * 7 + 3);
  }
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) if (Math.hypot(x, z) < R) v.set(x, -6, z, 0x9ab8b0);
  // the trough on two posts, pouring in from the back
  const tz = -R - 6;
  for (let y = 0; y < 18; y++) { v.set(-1, y, tz - 2, 0x5a4028); v.set(4, y, tz - 2, 0x5a4028); }
  for (let z = tz - 4; z <= -R + 2; z++) for (let x = 0; x <= 3; x++) { v.set(x, 18, z, 0x7a5636); if (x === 0 || x === 3) v.set(x, 19, z, 0x6a4a2e); }
  for (let z = tz - 4; z <= -R + 2; z++) for (let x = 1; x <= 2; x++) v.set(x, 19, z, 0x9ae0e0);
  // stools and stacked buckets on the near rocks
  for (const [bx, bz] of [[R + 2, R - 2], [-R - 1, R + 1]]) for (let y = 0; y < 4; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) { const d = Math.hypot(x, z); if (d <= 2.3 && (d > 1.4 || y === 0)) v.set(bx + x, 3 + y, bz + z, y === 2 ? 0x3a2e24 : 0xc89a5a); }
  g.add(vm(v, V5, [0.5, 0, 0.5]));
  const stream = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.04), emitMat({ color: 0xd8f8ff, intensity: 1.1 }));
  stream.position.set(0.08, 0.45, (-R + 2) * V5 + 0.02); g.add(stream);
  const w = magicWater(r * 1.08, r * 1.08, { shallow: '#7adcd4', deep: '#2a8aa8', milky: 0.6, glow: 0.22 }); w.position.y = -0.04; g.add(w);
  g.userData.water = w;
  return g;
}
// a stone lantern of bare granite (no moss up here)
function lantern(onU) {
  const v = new VoxelModel(), gl = new VoxelModel();
  const st = (x, y, z) => tone(x, y, z, 0x9a968c, 0x86827a, 0xaeaaa0, 0.2, 0.15);
  fill(v, -4, 3, 0, 2, -4, 3, st); fill(v, -2, 1, 3, 12, -2, 1, st); fill(v, -5, 4, 13, 14, -5, 4, st);
  fill(v, -4, 3, 15, 21, -4, 3, st);
  for (let x = -3; x <= 2; x++) for (let y = 16; y <= 20; y++) for (let z = -4; z <= 3; z++) if (Math.abs(z + 0.5) < 3 && Math.abs(x + 0.5) < 2.5) v.set(x, y, z, null);
  fill(gl, -2, 1, 16, 19, -1, 0, 0xffd070);
  for (let k = 0; k < 5; k++) fill(v, -6 + k, 5 - k, 22 + k, 22 + k, -6 + k, 5 - k, st);
  fill(v, -1, 0, 27, 29, -1, 0, st);
  const g = new THREE.Group();
  g.add(vm(v, V5, [0.5, 0, 0.5]), glowVm(gl, V5, [0.5, 0, 0.5], { intensity: 1.2, mode: 3, onU }));
  return g;
}
function pier() {
  const v = new VoxelModel();
  // planks out over the water on posts, a little ladder and a diving board
  for (let z = 0; z < 50; z++) for (let x = -7; x <= 6; x++) v.set(x, 0, z, (z % 4 === 0) ? 0x8a5a32 : (x + z) % 7 === 0 ? 0xa8743e : 0x9a6a3c);
  for (const z of [6, 24, 44]) for (const x of [-7, 6]) fill(v, x, x, -14, -1, z, z, 0x6a4224);
  fill(v, -4, 3, 1, 1, 46, 58, 0xd8c8a8); // diving board
  for (let y = -12; y < 0; y += 3) fill(v, -3, 2, y, y, 50, 50, 0x8a8a92); // ladder rungs
  return vm(v, V5);
}
function buoy(red = true) {
  const v = new VoxelModel();
  ell(v, 0.5, 2, 0.5, 4, 3, 4, (x, y) => (y >= 2 ? (red ? 0xe8402a : 0xf4f0e8) : (red ? 0xf4f0e8 : 0xe8402a)));
  fill(v, 0, 0, 5, 9, 0, 0, 0x6a6a72); v.set(0, 10, 0, 0xffd040); v.set(1, 10, 0, 0xffd040);
  const g = new THREE.Group(); g.add(vm(v, V25, [0.5, 0, 0.5]));
  return g;
}
export class KappaLocation extends Location {
  constructor(game) {
    super(game, 'kappa', { bg: 0x120e30, lightMode: 'spirit', grade: 'spiritDusk', ambience: 'spirit' });
    this.camCfg = { wupp: 0.0158, pitch: 46, yaw: 45, follow: true, minWupp: 0.007, maxWupp: 0.03, followY: 0.6, bounds: { minX: -5, maxX: 5.5, minZ: -0.8, maxZ: 3.6 } };
    this.shadowSize = 16;
    this.clock = false;
    this.hourOverride = 3.2; // spirit late afternoon, going gold
    this.sky = true;
    this.lightOverride = { sun: 0xffd4a0, sunI: 2.1, hemiI: 1.3, sky: 0xe8d0f0, gnd: 0x6a5a58, top: 0x2a2060, bot: 0xffb0a0 };
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 1 };
    this.updaters = [];
    const shape = (this.shape = islandShape({ rx: 7.6, rz: 5.0, cx: 0.2, cz: 0.8, seed: 11 }));
    // the hot water: the big pool, two travertine terraces stepping down to the
    // edge, a blue spring, a red (iron) spring, and the soaking spring
    const TER = [{ x: 3.75, z: 4.2, rx: 0.8, rz: 0.42, depth: 0.25, level: -2 }, { x: 4.05, z: 4.72, rx: 0.62, rz: 0.32, depth: 0.2, level: -4 }];
    const BLUE = { x: 5.25, z: -0.55, rx: 0.52, rz: 0.42, depth: 0.45, tint: 'blue' }, RED = { x: -0.45, z: -2.65, rx: 0.48, rz: 0.38, depth: 0.45, tint: 'red' };
    const basins = [{ x: LAGOON.x, z: LAGOON.z, rx: LAGOON.rx, rz: LAGOON.rz, depth: 0.95 }, ...TER, BLUE, RED, { x: ONSEN.x, z: ONSEN.z, rx: ONSEN.r, rz: ONSEN.r, depth: 0.55 }];
    this.vents = [{ x: 0.95, z: -1.55 }, { x: 3.35, z: -2.25 }, { x: -1.45, z: 4.25 }, { x: 6.35, z: 2.1 }];
    const keep = [
      { x: -4.9, z: 0.8, r: 1.3 }, { x: -3.0, z: 0.5, r: 0.9 }, { x: -1.2, z: 0.2, r: 0.9 }, { x: 0.9, z: -0.1, r: 0.8 }, // arrival -> the pier
      { x: -2.4, z: -1.9, r: 1.5 }, { x: ONSEN.x, z: ONSEN.z, r: ONSEN.r + 0.7 }, { x: 3.9, z: 4.6, r: 1.1 },
      ...this.vents.map((v) => ({ x: v.x, z: v.z, r: 0.7 })),
    ];
    // columnar basalt standing along the back rim (tall at the back, low toward the sides)
    const columns = [{ x: -6.3, z: -0.4, r: 0.7, h: 1.3 }, { x: -5.2, z: -2.3, r: 0.85, h: 1.7 }, { x: -3.8, z: -3.4, r: 0.6, h: 1.1 },
      { x: 0.6, z: -3.6, r: 0.75, h: 1.5 }, { x: 2.2, z: -3.5, r: 0.55, h: 0.9 }, { x: 5.4, z: -2.5, r: 0.7, h: 1.2 }, { x: 6.9, z: -1.0, r: 0.5, h: 0.7 }, { x: -6.6, z: 3.1, r: 0.45, h: 0.5 }];
    const rock = rockIsland(shape, { basins, vents: this.vents, keep, columns, seed: 11 });
    S.add(rock.group);
    this.outcrops = rock.outcrops;
    // the big pool: milky, steaming, the pier and the course of floats
    const water = magicWater(LAGOON.rx + 0.25, LAGOON.rz + 0.25, { shallow: '#8ae4dc', deep: '#2a8aa8', milky: 0.5, glow: 0.2 }); water.position.set(LAGOON.x, -0.12, LAGOON.z); S.add(water); this.updaters.push(water.userData.update);
    this.water = water;
    for (const t of TER) { const w = magicWater(t.rx + 0.15, t.rz + 0.15, { shallow: '#a4ece4', deep: '#4aa8b8', milky: 0.6, glow: 0.2 }); w.position.set(t.x, t.level * 0.1 - 0.06, t.z); S.add(w); this.updaters.push(w.userData.update); }
    const wb = magicWater(BLUE.rx + 0.12, BLUE.rz + 0.12, { shallow: '#6ad0f4', deep: '#1a4ab8', milky: 0.25, glow: 0.3 }); wb.position.set(BLUE.x, -0.08, BLUE.z); S.add(wb); this.updaters.push(wb.userData.update);
    const wr = magicWater(RED.rx + 0.12, RED.rz + 0.12, { shallow: '#e08a5a', deep: '#8a2a1a', foam: '#ffd8b8', milky: 0.35, glow: 0.1 }); wr.position.set(RED.x, -0.08, RED.z); S.add(wr); this.updaters.push(wr.userData.update);
    this.hotSpots = [{ x: LAGOON.x, z: LAGOON.z, rx: LAGOON.rx * 0.8, rz: LAGOON.rz * 0.8, n: 3, y: -0.1 }, ...TER.map((t) => ({ x: t.x, z: t.z, rx: t.rx * 0.7, rz: t.rz * 0.7, n: 1, y: t.level * 0.1 })),
      { x: BLUE.x, z: BLUE.z, rx: 0.3, rz: 0.25, n: 1, y: -0.06 }, { x: RED.x, z: RED.z, rx: 0.3, rz: 0.25, n: 1, y: -0.06 }, { x: ONSEN.x, z: ONSEN.z, rx: ONSEN.r * 0.7, rz: ONSEN.r * 0.7, n: 1, y: 0 }];
    const pr = pier(); pr.position.set(LAGOON.x - 1.4, 0.0, LAGOON.z - LAGOON.rz - 0.45); S.add(pr);
    this.pierEnd = { x: LAGOON.x - 1.4, z: LAGOON.z - LAGOON.rz + 1.9 };
    const course = [[-1.0, 0.55], [0.4, 1.15], [2.0, 1.1], [2.5, 0.0], [1.2, -0.85], [-0.6, -0.55]];
    this.buoys = course.map(([dx, dz], i) => { const b = buoy(i % 2 === 0); b.position.set(LAGOON.x + dx, -0.14, LAGOON.z + dz); S.add(b); return { x: LAGOON.x + dx, z: LAGOON.z + dz, mesh: b, ph: i }; });
    this.updaters.push((dt, t) => { for (const b of this.buoys) { b.mesh.position.y = -0.14 + Math.sin(t * 1.8 + b.ph) * 0.02; b.mesh.rotation.z = Math.sin(t * 1.3 + b.ph) * 0.08; } });
    // the soaking spring with its stone lanterns
    const ro = soakSpring(ONSEN.r, this.onU); ro.position.set(ONSEN.x, 0, ONSEN.z); S.add(ro); this.updaters.push(ro.userData.water.userData.update);
    this.onsen = ONSEN;
    const lan = lantern(this.onU); lan.position.set(ONSEN.x - 1.85, 0, ONSEN.z - 0.5); S.add(lan);
    const lan2 = lantern(this.onU); lan2.position.set(ONSEN.x + 1.6, 0, ONSEN.z - 1.0); S.add(lan2);
    // Kappei's little bath hut
    const h = hut(this.onU); h.position.set(-2.4, 0, -1.9); S.add(h); this.hut = h;
    // clouds
    const sky = nebulaVoid(); S.add(sky); this.updaters.push(sky.userData.update);
    const sea = dreamClouds({ y: -10, cover: 0.6, lit: '#ffe8f0', shade: '#9a7ac8' }); S.add(sea); this.updaters.push(sea.userData.update);
    const sea2 = dreamClouds({ y: -22, cover: 0.64, lit: '#ffc8e8', shade: '#6a5aa8', rim: '#ffd0a0' }); S.add(sea2); this.updaters.push(sea2.userData.update);
    this.puffs = [];
    [[-11, -3.5, 2, 18], [11, -4, 3, 20], [-15, 3.5, -4, 15], [14, 2.4, 1, 16], [3, 4.2, -9, 13]].forEach(([x, y, z, r], i) => { const p = cloudPuff(i + 31, { r: r * 0.75, tint: 0xf0dcff, shade: 0x9a80d0 }); p.position.set(x * 1.3, y - 3, z); S.add(p); this.puffs.push({ m: p, x0: x * 1.3, ph: i }); });
    // the hot waterfall from the lowest terrace over the edge
    const last = TER[TER.length - 1];
    let ez = last.z; while (shape.inside(last.x, ez + 0.05) && ez < 12) ez += 0.05;
    const fall = waterfall(6); fall.position.set(last.x, last.level * 0.1 - 0.06, ez + 0.04); S.add(fall); this.updaters.push(fall.userData.update);
    this.fallAt = { x: last.x, z: ez };
    // nav: the rock top minus the hot water, the outcrops, the hut and the spring's ring of stones
    const nav = this.makeNav('island', { minX: shape.cx - shape.rx, minZ: shape.cz - shape.rz, w: shape.rx * 2, d: shape.rz * 2, cell: 0.2 });
    const swim = new NavGrid({ minX: LAGOON.x - LAGOON.rx, minZ: LAGOON.z - LAGOON.rz, w: LAGOON.rx * 2, d: LAGOON.rz * 2, cell: 0.2 });
    for (let j = 0; j < nav.nz; j++) for (let i = 0; i < nav.nx; i++) {
      const x = nav.cx(i), z = nav.cz(j);
      let ok = shape.inside(x, z) && shape.k(x, z) > 0.07;
      for (const b of basins) if (((x - b.x) / (b.rx + (b.level ? 0.6 : 0.12))) ** 2 + ((z - b.z) / (b.rz + (b.level ? 0.5 : 0.12))) ** 2 < 1) ok = false;
      for (const o of this.outcrops) if (Math.hypot(x - o.x, z - o.z) < o.r + 0.12) ok = false;
      if (Math.hypot(x - ONSEN.x, z - ONSEN.z) < ONSEN.r + 0.3) ok = false;
      if (!ok) nav.walk[j * nav.nx + i] = 0;
    }
    for (let j = 0; j < swim.nz; j++) for (let i = 0; i < swim.nx; i++) { const x = swim.cx(i), z = swim.cz(j); if (((x - LAGOON.x) / (LAGOON.rx - 0.3)) ** 2 + ((z - LAGOON.z) / (LAGOON.rz - 0.25)) ** 2 >= 1) swim.walk[j * swim.nx + i] = 0; }
    nav.block(-3.4, -2.75, -1.4, -1.05); // the hut and its bench
    nav.open(LAGOON.x - 1.75, LAGOON.z - LAGOON.rz - 0.5, LAGOON.x - 1.05, LAGOON.z - LAGOON.rz + 2.0); // the pier
    this.navs.island = nav; this.swimNav = swim; this.navs.swim = swim;
    this.arrive = { x: -4.4, z: 0.9 };
    this.air = new SpiritAir(S, shape, {
      butterflies: 0, trees: [],
      water: [{ x: LAGOON.x, z: LAGOON.z, r: 2.2 }, { x: ONSEN.x, z: ONSEN.z, r: 1.0 }, { x: BLUE.x, z: BLUE.z, r: 0.5 }, { x: RED.x, z: RED.z, r: 0.5 }],
      souls: 12, wisps: 7,
    });
  }
  async enter() {
    const g = this.game;
    if (!g.director.inCutscene) g.place(g.player, this.arrive.x, this.arrive.z, 1.2, 0);
    g.rig.setFollow(null);
    g.rig.play({ x: 0, y: 0.4, z: 1.2, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: this.camCfg.yaw, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    this.air.update(dt, t, this.game.rig.camera);
    for (const p of this.puffs) p.m.position.x = p.x0 + Math.sin(t * 0.05 + p.ph) * 1.2;
    const P = this.game.particles;
    if (!P) return;
    // steam rising off all the hot water, puffs from the vents and the hut's roof vent
    if ((this._steamT = (this._steamT || 0) - dt) <= 0) {
      this._steamT = 0.1;
      for (const h of this.hotSpots) {
        if (Math.random() > 0.3 * h.n) continue;
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random());
        P.emit('steam', { x: h.x + Math.cos(a) * h.rx * r, y: h.y + 0.04, z: h.z + Math.sin(a) * h.rz * r, n: 1, scale: 1.3, life: [1.6, 2.8], alpha: 0.4, tint: [1, 1, 1] });
      }
    }
    if ((this._ventT = (this._ventT || 0) - dt) <= 0) {
      this._ventT = 0.35;
      const v = this.vents[Math.floor(Math.random() * this.vents.length)];
      P.emit('smoke', { x: v.x, y: 0.05, z: v.z, n: 2, tint: [0.95, 0.93, 0.9], scale: 1.4 });
      if (Math.random() < 0.4) P.emit('steam', { x: -2.4, y: 2.0, z: -1.95, n: 1 });
      if (Math.random() < 0.5) P.emit('mist', { x: this.fallAt.x, y: -0.6, z: this.fallAt.z + 0.1, n: 1 });
    }
  }
}
