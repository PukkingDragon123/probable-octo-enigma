// Kappa Island: Kappei's home in the clouds (isometric, like Grandpa's
// garden). A sandy lagoon with a wooden pier and a swimming course of
// red-and-white buoys, a steaming rock hot spring (onsen) under a little
// lantern, rows of cucumber trellises, Kappei's thatched hut with a cucumber
// drying rack, reeds and lily pads, and the cloud sea all around.
//   L.swimNav  - walkable grid inside the lagoon (for swimming)
//   L.buoys    - [{ x, z, mesh }] the swim course, in order
//   L.onsen    - { x, z, r } the hot spring
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { islandShape, islandMesh, pondWater, cloudPuff, cloudSea, seaShadow, stoneLantern, waterfall } from '../world/spiritIsland.js';
import { natureBatch, natureFrames } from '../art/nature.js';
import { VoxelModel, vm, glowVm, signPlane, fill, ell, sh, tone, hash3, V5, V25, V1 } from '../world/build.js';
import { PixCanvas } from '../core/pixtex.js';
import { emitMat } from '../core/materials.js';
import { NavGrid } from '../core/nav.js';
import { FONT } from '../ui/fonts.js';
import { organicIsland, nebulaVoid, dreamClouds, SpiritAir } from '../world/spiritFx.js';
import { magicWater, rotenburo, irisPond } from '../world/onsen.js';

export const LAGOON = { x: 2.4, z: 2.0, rx: 3.0, rz: 1.75, depth: 7, sand: true };
const ONSEN = { x: -3.4, z: 2.4, r: 1.3 };

// ---------------------------------------------------------------- props
function hut() {
  const v = new VoxelModel();
  const R = 26, H = 34;
  // round mud-and-bamboo walls, a door, a little window
  for (let y = 0; y < H; y++) for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = Math.hypot(x, z);
    if (d > R || d < R - 2) continue;
    if (z > R - 8 && Math.abs(x) < 6 && y < 26) continue; // door
    if (Math.abs(x + 15) < 4 && z > 10 && y > 14 && y < 22) continue; // window
    v.set(x, y, z, y % 6 === 0 ? 0x8a6a3a : tone(x, y, z, 0xc8a06a, 0xb08a58, 0xd8b07a, 0.15, 0.1));
  }
  fill(v, -R, R, -1, -1, -R, R, 0x6a5038);
  // a thatched cone roof with a cucumber finial
  for (let k = 0; k < 30; k++) {
    const r = R + 6 - k * 1.05, y = H + k;
    for (let x = -Math.ceil(r); x <= r; x++) for (let z = -Math.ceil(r); z <= r; z++) { const d = Math.hypot(x, z); if (d <= r && d > r - 2.2) v.set(x, y, z, (Math.floor(Math.atan2(z, x) * 9) + k) % 3 === 0 ? 0xa8884a : (k % 4 === 0 ? 0xb89a58 : 0xc8aa68)); }
  }
  for (let y = 0; y < 8; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x * x + z * z <= 4) v.set(x, H + 30 + y, z, y % 2 ? 0x4a9a3a : 0x6aae44);
  // a wooden sign: かっぱ
  const g = new THREE.Group(); g.add(vm(v, V5));
  const p = new PixCanvas(30, 12, 5101); p.rect(0, 0, 30, 12, '#8a5a32'); p.frame(0, 0, 30, 12, '#5a3a20'); p.text('かっぱ', 15, 1, { font: `9px ${FONT.brush}`, color: '#f4ecd8', align: 'center' });
  const s = signPlane(p, 0.5); s.position.set(0.55, 1.5, R * V5 + 0.04); g.add(s);
  return g;
}
function trellis(len = 40, seed = 1) {
  const v = new VoxelModel();
  for (const x of [0, len - 1]) fill(v, x, x, 0, 26, 0, 0, 0x8a6a3a);
  for (const y of [8, 16, 24]) fill(v, 0, len - 1, y, y, 0, 0, 0xc8b888);
  for (let x = 1; x < len - 1; x++) for (let y = 1; y < 25; y++) {
    const h = hash3(x, y, seed);
    if (h < 0.45) v.set(x, y, h < 0.2 ? 1 : 0, h < 0.1 ? 0x3a7a2a : 0x5aa840); // vines and leaves
    else if (h > 0.965 && y > 5) { for (let k = 0; k < 4; k++) v.set(x, y - k, 1, k === 0 ? 0xffe060 : 0x3a8a2a); } // cucumbers (a yellow flower on top)
  }
  return vm(v, V5);
}
function dryingRack() {
  const v = new VoxelModel();
  for (const x of [0, 21]) fill(v, x, x, 0, 20, 0, 0, 0x8a6a3a);
  fill(v, 0, 21, 20, 20, 0, 0, 0x8a6a3a);
  for (let i = 0; i < 6; i++) { const x = 2 + i * 3.5 | 0; fill(v, x, x, 12, 19, 0, 0, 0x6a4a2a); fill(v, x, x + 1, 9, 14, 1, 1, i % 2 ? 0x4a9a3a : 0x5aae44); }
  return vm(v, V5);
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
function onsenRocks(r) {
  const v = new VoxelModel();
  const R = Math.round(r / V5);
  for (let x = -R - 4; x <= R + 4; x++) for (let z = -R - 4; z <= R + 4; z++) {
    const d = Math.hypot(x, z);
    if (d > R + 3.5 || d < R - 0.5) continue;
    const h = 3 + Math.floor(hash3(x >> 1, 0, z >> 1) * 5);
    for (let y = 0; y < h; y++) v.set(x, y, z, tone(x, y, z, 0x8a867e, 0x726e68, 0xa29e94, 0.25, 0.2));
  }
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) if (Math.hypot(x, z) < R) v.set(x, -2, z, 0x6a7a7a);
  return vm(v, V5, [0.5, 0, 0.5]);
}
function onsenWater(r) {
  const p = new PixCanvas(48, 48, 5201);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x - 24, y - 24) / 24; if (d < 1) p.px(x, y, d > 0.85 ? 'rgba(220,250,250,0.95)' : (x * 3 + y * 5) % 11 === 0 ? 'rgba(240,255,255,0.9)' : 'rgba(140,220,220,0.85)'); }
  const tex = new THREE.CanvasTexture(p.c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), emitMat({ map: tex, color: 0xffffff, intensity: 0.55, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 4;
  return m;
}

export class KappaLocation extends Location {
  constructor(game) {
    super(game, 'kappa', { bg: 0x120e30, lightMode: 'spirit', grade: 'spiritDusk', ambience: 'spirit' });
    this.camCfg = { wupp: 0.0158, pitch: 46, yaw: 45, follow: true, minWupp: 0.007, maxWupp: 0.03, followY: 0.6, bounds: { minX: -5, maxX: 5.5, minZ: -0.8, maxZ: 3.6 } };
    this.shadowSize = 16;
    this.clock = false;
    this.hourOverride = 3.2; // spirit late afternoon, going gold
    this.sky = true;
    this.lightOverride = { sun: 0xffc890, sunI: 2.0, hemiI: 1.35, sky: 0xd8b8ff, gnd: 0x4a7a6a, top: 0x2a2060, bot: 0xff9ac0 };
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 1 };
    this.updaters = [];
    const shape = (this.shape = islandShape({ rx: 7.6, rz: 5.0, cx: 0.2, cz: 0.8, seed: 11 }));
    S.add(organicIsland(shape, { pond: LAGOON, seed: 11 }));
    // lagoon water + sparkles, the pier, the buoy course
    const water = magicWater(LAGOON.rx * 0.99, LAGOON.rz * 0.99, { shallow: '#9ae8d8', deep: '#2a6ab0' }); water.position.set(LAGOON.x, -0.12, LAGOON.z); S.add(water); this.updaters.push(water.userData.update);
    this.water = water;
    const pr = pier(); pr.position.set(LAGOON.x - 1.4, 0.0, LAGOON.z - LAGOON.rz - 0.45); pr.rotation.y = 0.0; S.add(pr);
    this.pierEnd = { x: LAGOON.x - 1.4, z: LAGOON.z - LAGOON.rz + 1.9 };
    const course = [[-1.0, 0.55], [0.4, 1.15], [2.0, 1.1], [2.5, 0.0], [1.2, -0.85], [-0.6, -0.55]];
    this.buoys = course.map(([dx, dz], i) => { const b = buoy(i % 2 === 0); b.position.set(LAGOON.x + dx, -0.14, LAGOON.z + dz); S.add(b); return { x: LAGOON.x + dx, z: LAGOON.z + dz, mesh: b, ph: i }; });
    this.updaters.push((dt, t) => { for (const b of this.buoys) { b.mesh.position.y = -0.14 + Math.sin(t * 1.8 + b.ph) * 0.02; b.mesh.rotation.z = Math.sin(t * 1.3 + b.ph) * 0.08; } });
    // the onsen: rock ring, milky glowing water, steam, a lantern and a bucket
    const ro = rotenburo(ONSEN.r, { onU: this.onU }); ro.position.set(ONSEN.x, 0, ONSEN.z); S.add(ro); this.updaters.push(ro.userData.water.userData.update);
    this.onsen = ONSEN;
    const lan = stoneLantern({ onU: this.onU }); lan.position.set(ONSEN.x - 1.75, 0, ONSEN.z - 0.4); S.add(lan);
    const lan2 = stoneLantern({ onU: this.onU }); lan2.position.set(ONSEN.x + 1.75, 0, ONSEN.z + 0.5); S.add(lan2);
    // an iris pond with a red arched bridge by the front rim
    const ip = irisPond(1.0, 0.55); ip.position.set(-0.9, 0, 4.55); S.add(ip); this.updaters.push(ip.userData.water.userData.update);
    // the hut + drying rack, cucumber farm
    const h = hut(); h.position.set(-2.4, 0, -1.9); S.add(h); this.hut = h;
    const dr = dryingRack(); dr.position.set(-0.6, 0, -1.4); S.add(dr);
    this.trellises = [];
    for (let i = 0; i < 4; i++) { const t = trellis(36, i + 3); t.position.set(1.8 + 0, 0, -2.6 + i * 0.62); t.position.x = 1.6; S.add(t); this.trellises.push(t); }
    // clouds
    const sky = nebulaVoid(); S.add(sky); this.updaters.push(sky.userData.update);
    const sea = dreamClouds({ y: -10, cover: 0.6, lit: '#ffe8f0', shade: '#9a7ac8' }); S.add(sea); this.updaters.push(sea.userData.update);
    const sea2 = dreamClouds({ y: -22, cover: 0.64, lit: '#ffc8e8', shade: '#6a5aa8', rim: '#ffd0a0' }); S.add(sea2); this.updaters.push(sea2.userData.update);
    this.puffs = [];
    [[-11, -3.5, 2, 18], [11, -4, 3, 20], [-15, 3.5, -4, 15], [14, 2.4, 1, 16], [3, 4.2, -9, 13]].forEach(([x, y, z, r], i) => { const p = cloudPuff(i + 31, { r: r * 0.75, tint: 0xf0dcff, shade: 0x9a80d0 }); p.position.set(x * 1.3, y - 3, z); S.add(p); this.puffs.push({ m: p, x0: x * 1.3, ph: i }); });
    // a little waterfall from the lagoon over the edge
    let ez = LAGOON.z; while (shape.inside(LAGOON.x + 1.2, ez + 0.05) && ez < 12) ez += 0.05;
    const fall = waterfall(6); fall.position.set(LAGOON.x + 1.2, -0.1, ez + 0.02); S.add(fall); this.updaters.push(fall.userData.update);
    const chan = pondWater(0.2, (ez - LAGOON.z - LAGOON.rz) / 2 + 0.1); chan.position.set(LAGOON.x + 1.2, -0.11, (LAGOON.z + LAGOON.rz + ez) / 2); S.add(chan);
    // plants
    const nb = (this.plants = natureBatch({ max: 500, castShadow: true }));
    S.add(nb.mesh);
    for (const [n, x, z, sc] of [['sakura_small', -4.8, -1.0, 0.85], ['camphor_0', 5.6, -1.6, 0.7], ['jp_matsu', -6.0, 1.2, 0.7], ['sakura_1', 6.3, 0.9, 0.7]]) nb.push(n, x, 0, z, { sway: 0.2, scale: sc });
    for (let i = 0; i < 8; i++) nb.push(i % 2 ? 'bamboo_0' : 'bamboo_1', -5.6 + (i % 4) * 0.4, 0, -0.4 + Math.floor(i / 4) * 0.45, { sway: 0.4, scale: 0.8 });
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; const x = LAGOON.x + Math.cos(a) * (LAGOON.rx + 0.2), z = LAGOON.z + Math.sin(a) * (LAGOON.rz + 0.15); if (z < LAGOON.z - LAGOON.rz + 0.3 && Math.abs(x - (LAGOON.x - 1.4)) < 0.5) continue; nb.push(['jp_ashi', 'jp_gama', 'jp_ashi', 'jp_grass_2', 'jp_gama'][i % 5], x, 0, z, { sway: 0.5, scale: 0.6 }); }
    for (const [dx, dz] of [[-2.2, 0.9], [-1.6, -1.1], [2.6, 1.3], [1.4, 0.4], [-0.4, 1.4], [2.8, -0.9]]) nb.push(Math.random() < 0.5 ? 'jp_hasu_0' : 'jp_hasu_1', LAGOON.x + dx, -0.1, LAGOON.z + dz, { scale: 0.6 });
    nb.push('jp_hasu_hana', LAGOON.x - 2.0, -0.08, LAGOON.z + 1.0, { scale: 0.6 });
    nb.push('jp_kame', LAGOON.x + 2.9, 0.06, LAGOON.z - 0.8, { scale: 0.55 });
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      let x = shape.cx + Math.cos(a) * shape.rx, z = shape.cz + Math.sin(a) * shape.rz;
      for (let t = 0; t < 40 && !shape.inside(x, z); t++) { x -= Math.cos(a) * 0.06; z -= Math.sin(a) * 0.06; }
      x -= Math.cos(a) * (0.15 + (i % 3) * 0.18); z -= Math.sin(a) * (0.15 + (i % 3) * 0.18);
      if (((x - LAGOON.x) / (LAGOON.rx + 0.3)) ** 2 + ((z - LAGOON.z) / (LAGOON.rz + 0.3)) ** 2 < 1) continue;
      nb.push(['susuki', 'jp_grass_0', 'jp_shida_1', 'hydrangea_blue', 'jp_grass_1', 'jp_cosmos_1', 'jp_grass_1'][i % 7], x, 0, z, { sway: 0.45, scale: 0.6 + (i % 4) * 0.08 });
    }
    for (const [n, x, z] of [['jp_iwa', -4.9, 3.6], ['jp_ishi_1', 5.6, 1.4], ['jp_ishi_2', -2.3, 3.6], ['jp_iwa', -5.4, 2.2]]) nb.push(n, x, 0, z, { scale: 0.7 });
    // lush planting round the bath, the hut and the ponds
    const lush = ['hydrangea_blue', 'hydrangea_violet', 'jp_shida', 'hydrangea_pink', 'jp_shida_1', 'azalea', 'jp_grass_1', 'hydrangea_blue'];
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const x = ONSEN.x + Math.cos(a) * (ONSEN.r + 0.7), z = ONSEN.z + Math.sin(a) * (ONSEN.r + 0.6); if (z < ONSEN.z - 0.6) continue; nb.push(lush[i % lush.length], x, 0, z, { sway: 0.35, scale: 0.65 }); }
    for (let i = 0; i < 10; i++) nb.push(lush[(i + 3) % lush.length], -3.8 + i * 0.32, 0, -0.55 + (i % 2) * 0.25, { sway: 0.35, scale: 0.6 });
    for (const [n, x, z, sc] of [['momiji_0', -6.2, -1.6, 0.75], ['sakura_small', 4.6, 4.4, 0.7], ['camphor_1', -1.4, -3.4, 0.7]]) nb.push(n, x, 0, z, { sway: 0.2, scale: sc });
    // dragonflies over the lagoon
    this.flyers = [];
    for (const [k, cx, cz, r, y] of [['jp_akatombo', LAGOON.x, LAGOON.z, 1.6, 0.6], ['jp_akatombo', LAGOON.x + 0.5, LAGOON.z - 0.3, 1.1, 0.9], ['jp_ageha', 1.6, -1.2, 1.2, 0.8]]) {
      const fr = natureFrames(k); const i = nb.push(`${k}#0`, cx, y, cz, { mode: 2, scale: 0.35 });
      this.flyers.push({ i, k, n: Math.max(1, fr.length), cx, cz, r, y, a: Math.random() * 6, sp: 0.6 + Math.random() * 0.5, f: 0, ft: 0 });
    }
    nb.commit();
    // nav: island top minus lagoon, onsen, hut, trellises; a second grid for swimming
    const nav = this.makeNav('island', { minX: shape.cx - shape.rx, minZ: shape.cz - shape.rz, w: shape.rx * 2, d: shape.rz * 2, cell: 0.2 });
    const swim = new NavGrid({ minX: LAGOON.x - LAGOON.rx, minZ: LAGOON.z - LAGOON.rz, w: LAGOON.rx * 2, d: LAGOON.rz * 2, cell: 0.2 });
    for (let j = 0; j < nav.nz; j++) for (let i = 0; i < nav.nx; i++) {
      const x = nav.cx(i), z = nav.cz(j);
      const inLag = ((x - LAGOON.x) / (LAGOON.rx + 0.1)) ** 2 + ((z - LAGOON.z) / (LAGOON.rz + 0.1)) ** 2 < 1;
      if (!(shape.inside(x, z) && shape.k(x, z) > 0.07) || inLag || Math.hypot(x - ONSEN.x, z - ONSEN.z) < ONSEN.r + 0.25) nav.walk[j * nav.nx + i] = 0;
    }
    for (let j = 0; j < swim.nz; j++) for (let i = 0; i < swim.nx; i++) { const x = swim.cx(i), z = swim.cz(j); if (((x - LAGOON.x) / (LAGOON.rx - 0.3)) ** 2 + ((z - LAGOON.z) / (LAGOON.rz - 0.25)) ** 2 >= 1) swim.walk[j * swim.nx + i] = 0; }
    nav.blockCircle(-2.4, -1.9, 1.45); nav.block(-0.7, -1.55, 0.5, -1.25);
    nav.block(1.5, -2.8, 3.5, -0.5);
    // the pier is walkable over the water
    nav.open(LAGOON.x - 1.75, LAGOON.z - LAGOON.rz - 0.5, LAGOON.x - 1.05, LAGOON.z - LAGOON.rz + 2.0);
    this.navs.island = nav; this.swimNav = swim; this.navs.swim = swim;
    this.arrive = { x: -4.4, z: 0.9 };
    nav.block(-1.9, 4.0, 0.1, 5.1); // the iris pond
    this.air = new SpiritAir(S, shape, {
      flowers: [{ x: -3.4, z: 3.9 }, { x: -1.0, z: 4.0 }, { x: 5.2, z: 1.2 }, { x: -2.0, z: -0.4 }, { x: 1.0, z: -1.2 }, { x: -5.6, z: 2.6 }],
      water: [{ x: LAGOON.x, z: LAGOON.z, r: 2.2 }, { x: ONSEN.x, z: ONSEN.z, r: 1.0 }, { x: -0.9, z: 4.55, r: 0.8 }],
      trees: [{ x: 4.6, z: 4.4 }, { x: -4.8, z: -1.0 }, { x: 6.3, z: 0.9 }],
      souls: 12, wisps: 7,
    });
  }
  async enter() {
    const g = this.game;
    g.rig.setFollow(null);
    g.rig.play({ x: 0, y: 0.4, z: 1.2, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: this.camCfg.yaw, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    this.air.update(dt, t, this.game.rig.camera);
    for (const p of this.puffs) p.m.position.x = p.x0 + Math.sin(t * 0.05 + p.ph) * 1.2;
    const B = this.plants;
    for (const f of this.flyers) {
      f.a += dt * f.sp; f.ft += dt;
      if (f.ft > 0.06) { f.ft = 0; f.f = (f.f + 1) % f.n; B.setFrame(f.i, `${f.k}#${f.f}`); }
      B.setPos(f.i, f.cx + Math.cos(f.a) * f.r, f.y + Math.sin(f.a * 3.1) * 0.15, f.cz + Math.sin(f.a) * f.r * 0.6); B.setFlip(f.i, Math.cos(f.a) > 0);
    }
    B.commit?.();
    if ((this._steamT = (this._steamT || 0) - dt) <= 0) {
      this._steamT = 0.22;
      const a = Math.random() * 6.28, r = Math.random() * this.onsen.r * 0.8;
      this.game.particles?.emit('steam', { x: this.onsen.x + Math.cos(a) * r, y: 0.1, z: this.onsen.z + Math.sin(a) * r, n: 1 });
    }
  }
}
