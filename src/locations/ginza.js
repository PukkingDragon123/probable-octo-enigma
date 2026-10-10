// Kodama Ginza (木霊銀座): the covered shopping street between the station and
// Kodamaya, at dusk. Seen side-on like the platform: the row of shops along the
// far side (z < 0) faces the camera; the near side is cut away to low wall
// stubs so nothing hides the street. The arcade roof isn't drawn, only its
// striped shadow. Shopkeepers at their counters, shoppers browsing, kids, the
// yaki-imo cart, Tsuru-baa sweeping, tanabata streamers swaying overhead.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { VoxelModel, vm, glowVm, signPlane, fill, sh, tone, hash3, V5 } from '../world/build.js';
import { PixCanvas, makeTexture, mix, darken, lighten } from '../core/pixtex.js';
import { litMat } from '../core/materials.js';
import { makeShop, SHOPS } from '../world/shops.js';
import { lightPool, pottedPlant } from '../world/shotengai.js';
import { lanternString, streamer, bicycle, planter, streetBench, yakiimoCart, shrineCorner, arcadeGate, roofShadow, broom, crate, sleepingCat, arcadeEdge, nobori } from '../world/streetProps.js';
import { manholeCover } from '../world/shopSigns.js';
import { vendingMachine } from '../world/props.js';
import { natureBatch } from '../art/nature.js';
import { Crowd } from '../world/crowd.js';
import { Birds } from '../world/birds.js';
import { phoneMesh } from '../entities/parts.js';

export const ST = { x0: -38, x1: 38, z0: 0, z1: 8.6, walkZ0: 0.7, walkZ1: 8.1 };
const ORDER = ['cafe', 'florist', 'shutterA', 'fish', 'wagashi', 'thrift', 'drug', 'shutterB', 'bendys', 'books', 'kodamaya', 'tabako'];
const ALLEY_AFTER = { fish: 1.0, bendys: 1.0 };

// street paving at 64 texels/m: granite edge with a drain line by the shops,
// warm interlocking bricks, a terracotta "carpet" down the middle with leaf
// medallions, a yellow tactile line, the granite curb on the near side
function streetTexture() {
  const W = 256, H = Math.round(ST.z1 * 64);
  const p = new PixCanvas(W, H, 41);
  const bricks = ['#d8c8a8', '#ccbc9c', '#e0d0b0', '#c8b490', '#d4c09c'];
  for (let y = 0; y < H; y += 8) {
    const off = (y / 8) % 2 ? 8 : 0;
    for (let x = -16; x < W; x += 16) {
      const c = bricks[Math.floor(hash3(x + off, y, 3) * bricks.length)];
      p.rect(x + off, y, 16, 8, c);
      p.hline(x + off, x + off + 15, y, darken(c, 0.12)); p.vline(x + off, y, y + 7, darken(c, 0.12));
      if (hash3(x, y, 9) < 0.3) p.px(x + off + 3 + Math.floor(hash3(y, x, 1) * 10), y + 3, lighten(c, 0.12));
    }
  }
  // centre carpet (terracotta + cream border) with leaf medallions every 4 m
  const c0 = Math.round(3.5 * 64), c1 = Math.round(5.1 * 64);
  p.rect(0, c0, W, c1 - c0, '#b8684a');
  for (let y = c0; y < c1; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) { p.hline(x, x + 15, y, '#a85a3e'); p.vline(x, y, y + 7, '#a85a3e'); }
  p.rect(0, c0, W, 4, '#ece0c4'); p.rect(0, c1 - 4, W, 4, '#ece0c4');
  p.hline(0, W - 1, c0 + 4, '#8a4a32'); p.hline(0, W - 1, c1 - 5, '#8a4a32');
  for (const mx of [64, 192]) {
    const my = (c0 + c1) / 2;
    p.circle(mx, my, 30, '#ece0c4'); p.circle(mx, my, 27, '#4a7a5a');
    p.ellipse(mx, my, 16, 9, '#7ab86a'); p.line(mx - 15, my + 1, mx + 15, my - 1, '#3a6a3a');
    for (let k = -12; k <= 12; k += 6) p.line(mx + k, my, mx + k + 4, my - 6, '#3a6a3a');
    p.ring(mx, my, 22, '#e8c860');
    for (let a = 0; a < 8; a++) p.circle(mx + Math.cos(a * 0.785) * 22, my + Math.sin(a * 0.785) * 22, 2, '#f4e8c8');
  }
  // granite band + drain grate along the shopfronts (top of the texture = z 0)
  p.rect(0, 0, W, 38, '#a8a49c');
  for (let x = 0; x < W; x += 32) { p.vline(x, 0, 37, '#8a867e'); }
  p.scatter(0, 0, W, 38, '#b8b4ac', 0.2); p.scatter(0, 0, W, 38, '#9a968e', 0.15);
  p.rect(0, 26, W, 7, '#5a5a62');
  for (let x = 0; x < W; x += 4) p.vline(x, 27, 31, '#2a2a30');
  // tactile line
  const ty = Math.round(6.5 * 64);
  p.rect(0, ty, W, 14, '#e8c040');
  for (let x = 2; x < W; x += 8) p.rect(x, ty + 2, 5, 10, '#f4d468');
  // near curb
  p.rect(0, H - 34, W, 34, '#b0aca4'); p.rect(0, H - 34, W, 2, '#8a867e');
  for (let x = 0; x < W; x += 48) p.vline(x, H - 34, H - 1, '#8a867e');
  // wear, gum, cracks, little stains
  for (let i = 0; i < 90; i++) { const x = p.rnd() * W, y = 40 + p.rnd() * (H - 80); p.ellipse(x, y, 1 + p.rnd() * 1.5, 1, p.rnd() < 0.5 ? '#a8987c' : '#b8a888'); }
  for (let i = 0; i < 8; i++) { let x = p.rnd() * W, y = 60 + p.rnd() * (H - 140); for (let k = 0; k < 16; k++) { p.px(x, y, '#9a8a70'); x += p.rnd() < 0.5 ? 1 : -1; y += 1; } }
  return p;
}

export class GinzaLocation extends Location {
  constructor(game) {
    super(game, 'ginza', { bg: 0x2a2036, lightMode: 'human', grade: 'humanDusk', ambience: 'street' });
    this.camCfg = { wupp: 0.0148, pitch: 29, yaw: 0, follow: true, minWupp: 0.006, maxWupp: 0.024, lockZ: 2.3, followY: 1.55 };
    this.shadowSize = 18;
    this.clock = false;
    this.hourOverride = 17.55;
    this.sky = false;
    // dusk under the arcade: low warm sun through the roof, cool violet fill in the shade
    this.lightOverride = { sun: 0xffb474, sunI: 2.15, hemiI: 1.32, sky: 0xd4c8e8, gnd: 0x7a6248 };
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 1 };
    this.updaters = [];
    // ---- paving
    const tex = makeTexture(streetTexture().c, { repeat: true, mips: false });
    tex.repeat.set((ST.x1 - ST.x0) / 4, 1);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ST.x1 - ST.x0, ST.z1), litMat({ map: tex, vertexColors: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((ST.x0 + ST.x1) / 2, 0, ST.z1 / 2); floor.receiveShadow = true;
    S.add(floor);
    // ---- the shop row
    this.shops = {};
    let x = -31.2;
    const pools = [];
    this.flowerSpots = [];
    ORDER.forEach((kind, i) => {
      const sh2 = makeShop(kind, { onU: this.onU, seed: 11 + i * 7 });
      const w = sh2.userData.width;
      sh2.position.set(x + w / 2, 0, 0);
      S.add(sh2);
      this.shops[kind] = sh2;
      for (const pl of sh2.userData.pools) pools.push({ ...pl, x: pl.x + x + w / 2 });
      for (const f of sh2.userData.flowers) this.flowerSpots.push([f[0], f[1] + x + w / 2, f[2], f[3], f[4]]);
      if (sh2.userData.laundry) this.updaters.push((dt, t) => { sh2.userData.laundry.rotation.x = Math.sin(t * 0.9 + i) * 0.04; });
      for (const k of ['cat', 'maneki']) if (sh2.userData[k]?.userData.update) this.updaters.push(sh2.userData[k].userData.update);
      if (sh2.userData.noren) this.updaters.push((dt, t) => { sh2.userData.noren.rotation.x = Math.sin(t * 1.3) * 0.06 - 0.03; });
      x += w;
      if (ALLEY_AFTER[kind]) { this.alley(x, ALLEY_AFTER[kind], i); x += ALLEY_AFTER[kind]; }
    });
    this.streetEnd = x;
    // warm light spilling from the shops onto the paving
    for (const pl of pools) { const m = lightPool(pl.w, pl.d, { color: pl.col ?? 0xffc070, intensity: 0.26, onU: this.onU }); m.position.set(pl.x, 0.012, pl.z); S.add(m); }
    // ---- overhead: lantern strings, tanabata streamers, the roof's striped shadow
    const lanternShops = ['cafe', 'fish', 'wagashi', 'drug', 'books', 'kodamaya'];
    for (const k of lanternShops) {
      const shp = this.shops[k], w = shp.userData.width;
      const ls = lanternString(w - 0.4, { n: Math.max(3, Math.round(w / 1.1)), onU: this.onU, sag: 0.1, cols: k === 'drug' ? [0xf4f0e8, 0xe8402a] : [0xe8402a, 0xf4f0e8] });
      ls.position.set(shp.position.x, 3.78, 0.32);
      S.add(ls); this.updaters.push(ls.userData.update);
    }
    let si = 0;
    for (let sx = -29; sx < this.streetEnd; sx += 6.6) {
      const st = streamer({ seed: si++ });
      st.position.set(sx + (si % 2) * 0.8, 6.42, 1.05);
      S.add(st); this.updaters.push(st.userData.update);
    }
    S.add(roofShadow(ST.x0, ST.x1, -1, ST.z1 + 1, 7.6, { every: 2.4, rib: 0.09 }));
    const edge = arcadeEdge(this.streetEnd + 33, { onU: this.onU }); edge.position.set(-33, 6.48, 1.05); S.add(edge);
    // nobori banners outside the shops that want customers
    const nob = [['cafe', 2.2, 'モーニング', '#6a3a22', '#fff4d8'], ['florist', -2.45, '花', '#3a8a5a', '#ffffff'], ['fish', 2.6, '大漁', '#1a3a6a', '#ffffff'], ['wagashi', 2.1, 'だんご', '#f4ecd8', '#5a2a6a'],
      ['thrift', -2.6, '古着', '#d86a9a', '#ffffff'], ['drug', 2.75, '特売', '#ffe040', '#e8301a'], ['bendys', -3.0, 'オムライス', '#e8303a', '#ffffff'], ['books', 2.1, '古本', '#5a7a4a', '#f4ecd8']];
    nob.forEach(([k, dx, t, bg, fg], i) => { const n = nobori({ text: t, bg, fg, edge: fg, seed: i }); n.position.set(this.shops[k].position.x + dx, 0, 1.25); S.add(n); this.updaters.push(n.userData.update); (this.poles ||= []).push([n.position.x, 1.25]); });
    // ---- the west gate (from the station) and the shrine at the east end
    const gate = arcadeGate(8.4, { onU: this.onU }); gate.position.set(-33.2, 0, 0.2); S.add(gate);
    const shrine = shrineCorner({ onU: this.onU }); shrine.position.set(this.streetEnd + 1.6, 0, 0.6); S.add(shrine);
    // ---- near side: cut-away wall stubs of the opposite shops + the curb props
    S.add(this.nearSide());
    // ---- street furniture down the middle and along the near curb
    this.benches = [];
    for (const bx of [-12.5, 8.6]) { const b = streetBench(); b.position.set(bx, 0, 7.5); b.rotation.y = Math.PI; S.add(b); this.benches.push(b); }
    this.plants = natureBatch({ max: 420, castShadow: true });
    S.add(this.plants.mesh);
    const nb = this.plants;
    const flowersPl = ['hydrangea_blue', 'azalea', 'hydrangea_pink', 'rose', 'daisy', 'hydrangea_violet', 'aster', 'susan'];
    let pi = 0;
    for (const px of [-22, -4.5, 15.5, 26.5]) {
      const pl = planter(); pl.position.set(px, 0, 7.75); S.add(pl);
      for (let k = 0; k < 4; k++) nb.push(flowersPl[(pi++) % flowersPl.length], px - 0.45 + k * 0.3, pl.userData.soilY, 7.75 + (k % 2) * 0.06, { sway: 0.4, scale: 0.7 });
    }
    // bicycle parking on the near side (painted bays)
    for (let i = 0; i < 6; i++) { const b = bicycle({ col: [0xe8e0d0, 0x3a5a8a, 0xd84a4a, 0x2a2a30, 0xf0c040, 0x6a8a5a][i], seed: i + 1 }); b.position.set(-1.6 + i * 0.55, 0, 8.0); b.rotation.y = 0.75 + (i % 2 ? 0.08 : -0.05); S.add(b); }
    for (let i = 0; i < 4; i++) { const b = bicycle({ col: [0x8a8e96, 0xe86aa0, 0x3a7a6a, 0xf4f0e8][i], seed: i + 8 }); b.position.set(19.2 + i * 0.55, 0, 8.0); b.rotation.y = 0.75 + (i % 2 ? -0.06 : 0.05); S.add(b); }
    // manholes
    for (const [mx, mz] of [[-17.5, 2.4], [5.2, 6.0], [21.8, 2.6]]) { const m = signPlane(manholeCover({ seed: Math.round(mx) }), 0.68); m.rotation.x = -Math.PI / 2; m.position.set(mx, 0.011, mz); S.add(m); }
    // yaki-imo cart by the gate, chimney smoke handled in update
    this.imo = yakiimoCart({ onU: this.onU }); this.imo.position.set(-26.2, 0, 6.3); this.imo.rotation.y = 0.15; S.add(this.imo); this.updaters.push(this.imo.userData.update);
    // flowers from the florist + weeds
    for (const [n, fx, fy, fz, sc] of this.flowerSpots) nb.push(n, fx, fy, fz, { sway: 0.45, scale: sc ?? 0.7 });
    for (let i = 0; i < 18; i++) nb.push(['tuft_0', 'tuft_1', 'tuft_2', 'clover'][i % 4], -34 + i * 4.1 + Math.sin(i * 3.1) * 0.6, 0, 0.08 + (i % 3) * 0.04, { sway: 0.3, scale: 0.45 });
    nb.commit();
    // ---- birds: sparrows by the florist and the shrine, pigeons near the gate
    this.birds = new Birds(S, { max: 30 });
    const fl = this.shops.florist.position.x;
    for (let i = 0; i < 4; i++) this.birds.addGround('sparrow', fl - 1 + i * 0.5, 2.6 + (i % 2) * 0.3, { x0: fl - 2.4, x1: fl + 2.4, z0: 2.2, z1: 3.4, y: 0 }, { scale: 0.4 });
    for (let i = 0; i < 4; i++) this.birds.addGround('dove', -31 + i * 0.6, 7.0 + (i % 2) * 0.4, { x0: -33, x1: -28.5, z0: 6.4, z1: 7.9, y: 0 }, { scale: 0.5 });
    for (let i = 0; i < 3; i++) this.birds.addGround('sparrow', this.streetEnd + 0.6 + i * 0.4, 2.0 + (i % 2) * 0.4, { x0: this.streetEnd - 0.5, x1: this.streetEnd + 3, z0: 1.6, z1: 3.2, y: 0 }, { scale: 0.4 });
    for (let i = 0; i < 2; i++) this.birds.addFlyer('swallow', -8 + i * 20, 5.6, 3.5, 2.6 + i * 0.6);
    // ---- nav: the street minus the shop displays, furniture and bike bays
    const nav = this.makeNav('street', { minX: ST.x0 + 2, minZ: ST.walkZ0, w: ST.x1 - ST.x0 - 4, d: ST.walkZ1 - ST.walkZ0 });
    const blockZ = { cafe: 0.95, florist: 1.85, shutterA: 0.75, fish: 1.3, wagashi: 1.6, thrift: 1.35, drug: 1.38, shutterB: 1.0, bendys: 0.95, books: 1.15, kodamaya: 1.0, tabako: 0.8 };
    for (const k of ORDER) { const shp = this.shops[k], w = shp.userData.width; nav.block(shp.position.x - w / 2, 0, shp.position.x + w / 2, blockZ[k]); }
    nav.block(-1.9, 7.7, 1.4, 8.4); nav.block(18.9, 7.7, 21.2, 8.4);
    for (const b of this.benches) nav.block(b.position.x - 0.8, 7.2, b.position.x + 0.8, 8.4);
    for (const px of [-22, -4.5, 15.5, 26.5]) nav.block(px - 0.65, 7.45, px + 0.65, 8.4);
    nav.block(-27.2, 5.8, -25.1, 6.9);
    nav.block(-33.6, 0, -32.6, 0.6);
    for (const [px, pz] of this.poles || []) nav.blockCircle(px, pz, 0.22);
    this.navs.street = nav;
    // ---- people
    this.crowd = new Crowd(this.game, this);
    this.populate();
  }
  // an alley between two shops: dark, a glowing vending machine, a bicycle, pipes
  alley(x, w, i) {
    const S = this.scene;
    const v = new VoxelModel();
    const n = Math.round(w / V5);
    fill(v, 0, n - 1, 0, 0, -60, 0, (xx, y, z) => ((xx + z) % 5 === 0 ? 0x4a4440 : 0x5a5450));
    fill(v, 0, n - 1, 1, 50, -60, -60, (xx, y) => (y % 6 === 0 ? 0x3a2a20 : 0x5a4030));
    for (let y = 2; y < 120; y++) v.set(2, y, -40, y % 15 === 0 ? 0x5a5e66 : 0x7a7e86);
    fill(v, 0, n - 1, 118, 121, -60, 0, 0x2a2430);
    const m = vm(v, V5); m.position.set(x, 0, 0); S.add(m);
    const vmc = vendingMachine({ brand: i % 2 ? 'Boss Coffee' : 'Pocori', color: i % 2 ? 0x2a2a34 : 0x2a7ad8, seed: 20 + i, onU: this.onU });
    vmc.position.set(x + w / 2, 0, -1.4); vmc.scale.setScalar(0.92); S.add(vmc);
    const pool = lightPool(1.4, 1.6, { color: 0xb8e0ff, intensity: 0.22, onU: this.onU }); pool.position.set(x + w / 2, 0.012, 0.1); S.add(pool);
  }
  nearSide() {
    const g = new THREE.Group();
    const v = new VoxelModel();
    const x0 = Math.round(ST.x0 / V5), x1 = Math.round(ST.x1 / V5);
    const z0 = Math.round(ST.z1 / V5), z1 = z0 + 40;
    // dark interior floors of the opposite shops
    fill(v, x0, x1, -1, -1, z0, z1, (x, y, z) => ((x + z) % 7 === 0 ? 0x2e2836 : 0x342e3c));
    // cut wall stubs: the shopfront line, party walls every few metres, cut caps lighter
    const walls = [0x8a7a6a, 0x6a7a7a, 0x8a6a5a, 0x7a7a8a, 0x9a8a6a];
    let sx = x0, k = 0;
    while (sx < x1) {
      const w = 80 + Math.floor(hash3(sx, 0, 5) * 50);
      const col = walls[k++ % walls.length];
      for (let x = sx; x < Math.min(x1, sx + w); x++) {
        const door = (x - sx) > 18 && (x - sx) < w - 18; // open shopfront between pillars
        const h = door ? 2 : 9;
        for (let y = 0; y < h; y++) v.set(x, y, z0, y === h - 1 ? 0xd8ccb8 : col);
      }
      for (let z = z0; z < z1; z++) for (let y = 0; y < 9; y++) v.set(sx, y, z, y === 8 ? 0xd8ccb8 : sh(col, 0.85));
      // a few things standing inside: a cut counter, a shelf base
      if (k % 2) fill(v, sx + 20, sx + 44, 0, 6, z0 + 10, z0 + 16, (x, y) => (y === 6 ? 0xd8ccb8 : 0x5a4a3a));
      sx += w;
    }
    g.add(vm(v, V5, [0, 0, 0], { cast: false }));
    return g;
  }

  // a busy evening street: shopkeepers, customers browsing, people walking both
  // ways with bags, groups chatting, kids, grannies on the red bench, the
  // yaki-imo man, Tsuru-baa sweeping, a stray cat
  populate() {
    const C = this.crowd;
    const sp = (k) => this.shops[k];
    const wx = (k, lx) => sp(k).position.x + lx;
    let seed = 300;
    const S = () => (seed += 11);
    // ---- named shopkeepers
    const keepers = {
      cafe: { name: 'Shibata-san', species: 'shiba', skin: 0xd8964a, light: 0xf8ecd8, earInner: 0xf8e0c8, ears: 'shiba', tail: 'shiba', tailColor: 0xd8964a, outfit: { kind: 'apron', base: 0xf4f0e8, apron: 0x6a3a22 }, sleeve: 0xf4f0e8, sleeveLen: 0.6, pants: 0x3a3430, glasses: { frame: 0x3a2a24 }, scale: 0.96, act: 'wipe' },
      florist: { name: 'Hanae-san', species: 'deer', skin: 0xc8905a, light: 0xf4e8d8, earInner: 0xf0c8b0, ears: 'deer', tail: 'deer', outfit: { kind: 'apron', base: 0xf8e8e8, apron: 0x3a8a5a }, sleeve: 0xf8e8e8, skirt: { color: 0x6a8a6a, len: 4, flare: 0.8 }, shorts: true, face: { girl: true }, scale: 0.92, hat: { type: 'kerchief', color: 0xe8a0b0 } },
      fish: { name: 'Ponta', species: 'tanuki', skin: 0x8a6a4a, light: 0xd8c4a8, earInner: 0x2a2018, ears: 'round', tail: 'tanuki', tailColor: 0x8a6a4a, tailTip: 0x3a2a20, outfit: { kind: 'happi', color: 0x1a3a6a }, sleeve: 0x1a3a6a, wideSleeves: true, pants: 0x2a2a30, hat: { type: 'kerchief', color: 0xf4f0e8 }, face: { mask: '#3a2a20' }, belly: 0.8, scale: 1.0, act: 'shout' },
      wagashi: { name: 'Tsukimi-baa', species: 'rabbit', skin: 0xf0e8e0, light: 0xffffff, earInner: 0xf0c0c8, ears: 'rabbit', tail: 'rabbit', outfit: { kind: 'kimono', color: 0x5a2a6a, patCol: 0x8a5a9a, obi: 0xe8d8b8 }, sleeve: 0x5a2a6a, pants: 0x5a2a6a, feet: 'geta', skirt: { color: 0x5a2a6a, len: 5, flare: 0.5 }, hunch: 0.15, scale: 0.84, face: { eyeStyle: 'dot', brow: '#e8e0d8' } },
      thrift: { name: 'Usami-san', species: 'rabbit', skin: 0xb89a7a, light: 0xf0e0c8, earInner: 0xf0c0b0, ears: 'rabbit', tail: 'rabbit', tailTip: 0xffffff, outfit: { kind: 'cardigan', color: 0xe8a0c0, shirt: 0xf4f0e8 }, sleeve: 0xe8a0c0, pants: 0x3a4a6a, glasses: { frame: 0xc83a6a }, scale: 0.94, face: { girl: true } },
      drug: { name: '', species: 'cat', skin: 0xf4ece0, light: 0xffffff, earInner: 0xffc0c8, ears: 'cat', tail: 'cat', tailColor: 0xe8a04a, outfit: { kind: 'apron', base: 0xf4f4f0, apron: 0x1a3a8a }, sleeve: 0xf4f4f0, pants: 0x3a3a44, scale: 0.9, act: 'wave' },
      books: { name: 'Fukurō-jii', species: 'monkey', skin: 0x8a6a5a, light: 0xe8c8b0, outfit: { kind: 'cardigan', color: 0x6a5a4a, shirt: 0xe8e0d0 }, sleeve: 0x6a5a4a, pants: 0x4a4440, glasses: { frame: 0x2a2a2a }, hunch: 0.16, scale: 0.9, face: { eyeStyle: 'dot', brow: '#e8e0d8' } },
    };
    this.locals = {};
    for (const [k, d] of Object.entries(keepers)) {
      const s = sp(k), K = s.userData.keeper;
      if (!K) continue;
      const def = { id: 'local_' + k, ...d };
      delete def.act;
      const p = C.add(def, { x: s.position.x + K.x, z: s.position.z + K.z, yaw: K.yaw, mode: K.sit ? 'sit' : 'stand', prop: false, act: d.act === 'wipe' ? 'wipe' : null, calm: true, seatY: K.sit ? 0.45 : undefined });
      p.c.name = d.name;
      if (d.act === 'shout') p.shout = ['Irasshai! Fresh saba!', 'Today only, two for 500!', 'Oi oi, look at this tai!'];
      if (d.act === 'wave') p.shout = ['Points ×5 today~!', 'Welcome~!'];
      this.locals[k] = p;
    }
    // Bendy's: diners in the booths behind the glass
    const bs = sp('bendys');
    bs.userData.seats.forEach((st, i) => { if (i % 3 === 2) return; C.add({ seed: S(), role: ['shopper', 'student', 'salaryman', 'kid', 'officeLady'][i % 5] }, { x: bs.position.x + st.x, z: bs.position.z + st.z, yaw: st.yaw, mode: 'sit', seatY: st.y + 0.02, prop: false, act: i % 4 === 1 ? 'eat' : i % 4 === 3 ? 'drink' : null }); });
    // ---- grannies with dango on the red bench
    const wg = sp('wagashi');
    wg.userData.seats.forEach((st, i) => C.add({ seed: S(), role: 'granny' }, { x: wg.position.x + st.x, z: st.z, yaw: 0, mode: 'sit', seatY: st.y, prop: false, act: i === 0 ? 'eat' : null }));
    // ---- customers browsing at shopfronts
    const browseRoles = ['shopper', 'granny', 'officeLady', 'student', 'shopper', 'tourist'];
    let bi = 0;
    for (const k of ORDER) {
      const s = sp(k);
      for (const b of s.userData.browse) {
        if (k === 'kodamaya' || k.startsWith('shutter') || k === 'tabako') continue;
        if (hash3(bi, 3, 7) < 0.25) { bi++; continue; }
        C.add({ seed: S(), role: browseRoles[bi++ % browseRoles.length] }, { x: s.position.x + b.x + (hash3(bi, 1, 1) - 0.5) * 0.2, z: b.z + 0.05, yaw: b.yaw + (hash3(bi, 2, 1) - 0.5) * 0.4, mode: 'stand', calm: true, act: hash3(bi, 4, 4) < 0.2 ? 'point' : null });
      }
    }
    // kids peering at the (closed) Kodamaya gacha machines
    const kd = sp('kodamaya');
    kd.userData.browse.forEach((b, i) => { if (i === 1) return; C.add({ seed: S(), role: 'kid' }, { x: kd.position.x + b.x, z: b.z, yaw: Math.PI + (i - 1) * 0.3, mode: 'stand', calm: true, act: i === 0 ? 'point' : null }); });
    // ---- groups chatting
    C.group([{ seed: S(), role: 'student' }, { seed: S(), role: 'student' }, { seed: S(), role: 'student' }], { x: wx('drug', 0.4), z: 4.9, r: 0.72, a0: 0.5 });
    C.group([{ seed: S(), role: 'shopper' }, { seed: S(), role: 'granny' }, { seed: S(), role: 'shopper' }], { x: wx('fish', -1.6), z: 5.3, r: 0.7, a0: 1.1 });
    C.group([{ seed: S(), role: 'salaryman' }, { seed: S(), role: 'worker' }], { x: wx('books', 1.6), z: 4.4, r: 0.56, a0: 1.57 });
    // ---- sitters on the street benches (facing the shops)
    for (const b of this.benches) b.userData.seats.forEach((st, i) => { if (i === 1) return; C.add({ seed: S(), role: ['granny', 'salaryman', 'student'][i % 3] }, { x: b.position.x - st.x, z: b.position.z - 0.02, yaw: Math.PI, mode: 'sit', seatY: st.y, prop: false, act: i === 2 ? 'phone' : null }); });
    // ---- walkers both ways along the street with pauses at shops
    const east = [], west = [];
    for (const k of ORDER) { const s = sp(k); const b = s.userData.browse[0]; if (!b) continue; east.push({ x: s.position.x + b.x, z: 2.6 + hash3(s.position.x, 1, 2) * 0.6, pause: 0.4 + hash3(s.position.x, 2, 2) * 2.4, yaw: Math.PI }); }
    west.push(...east.map((w) => ({ x: w.x + 0.8, z: 5.9 + hash3(w.x, 3, 3) * 0.9, pause: 0.2 + hash3(w.x, 4, 3) * 0.8 })).reverse());
    const loopE = [...east, { x: ST.x1 - 4, z: 3.0 }, { x: ST.x1 - 4, z: 6.4 }, ...west, { x: ST.x0 + 5, z: 6.4 }, { x: ST.x0 + 5, z: 3.0 }];
    const roles = ['shopper', 'salaryman', 'student', 'officeLady', 'granny', 'tourist', 'shopper', 'worker', 'student', 'shopper'];
    for (let i = 0; i < 16; i++) {
      const start = Math.floor((i / 16) * loopE.length);
      const w0 = loopE[start];
      C.add({ seed: S(), role: roles[i % roles.length] }, { x: w0.x + (hash3(i, 5, 5) - 0.5), z: w0.z, yaw: 1.57, mode: 'walk', path: loopE.map((w) => ({ ...w, x: w.x + (hash3(i, w.x | 0, 1) - 0.5) * 0.6, z: w.z + (hash3(i, w.z * 10 | 0, 2) - 0.5) * 0.5 })), start: start + 1, nav: this.navs.street });
    }
    // ---- a parent with two kids orbiting
    const mom = C.add({ seed: S(), role: 'shopper' }, { x: wx('thrift', 0.4), z: 3.4, yaw: Math.PI, mode: 'stand', calm: true });
    C.add({ seed: S(), role: 'kid' }, { x: wx('thrift', 1.0), z: 3.6, yaw: 0, mode: 'kid', parent: mom });
    C.add({ seed: S(), role: 'kid' }, { x: wx('thrift', -0.2), z: 3.2, yaw: 0, mode: 'kid', parent: mom });
    // ---- the yaki-imo man (Anaguma-jii) and Tsuru-baa with her broom
    const ana = C.add({ id: 'local_imo', name: 'Anaguma-jii', species: 'tanuki', skin: 0x6a6a6e, light: 0xf0f0ec, earInner: 0x2a2a30, ears: 'round', tail: 'tanuki', tailColor: 0x6a6a6e, tailTip: 0x2a2a30, face: { mask: '#2a2a30', eyeStyle: 'dot', brow: '#f0f0ec' }, outfit: { kind: 'happi', color: 0x2a3a6a }, sleeve: 0x2a3a6a, wideSleeves: true, pants: 0x3a3430, feet: 'geta', hat: { type: 'kerchief', color: 0xf4f0e8 }, hunch: 0.12, scale: 0.9 }, { x: -25.0, z: 6.6, yaw: -0.4, mode: 'stand', prop: false, calm: true });
    ana.c.name = 'Anaguma-jii';
    ana.shout = ['Yaki-imo~ ishi-yaki-imo~', 'Hot sweet potatoes~!'];
    this.locals.imo = ana;
    const tsuru = C.add({ id: 'local_tsuru', name: 'Tsuru-baa', species: 'crane', skin: 0xf4f2ee, ears: 'none', tail: 'none', outfit: { kind: 'kimono', color: 0x4a5a7a, patCol: 0x6a7a9a, obi: 0x2a2a3a }, sleeve: 0x4a5a7a, pants: 0x4a5a7a, feet: 'geta', skirt: { color: 0x4a5a7a, len: 5, flare: 0.5 }, hunch: 0.18, scale: 0.86, face: { eyeStyle: 'dot' }, hat: { type: 'kerchief', color: 0xe8e0d0 } }, { x: wx('shutterB', 0.4), z: 1.6, yaw: 0.3, mode: 'stand', prop: false, calm: true });
    tsuru.c.name = 'Tsuru-baa';
    tsuru.c.hold(broom(), 'R');
    tsuru.c.play('sweep', { loop: true }); tsuru.c.idleT = 999;
    this.locals.tsuru = tsuru;
    // ---- a stray cat asleep on the crates by the alley, another stretching by the shrine
    const cat = sleepingCat({ col: 0xf4f0e8, stripe: 0x3a3a40 }); cat.position.set(this.streetEnd + 0.4, 0.45, 1.5); this.scene.add(cat); this.updaters.push(cat.userData.update);
    const cr = crate({ col: 0x9a7a4a }); cr.position.set(this.streetEnd + 0.4, 0, 1.5); this.scene.add(cr);
    this.shoutT = 2;
  }
  async enter(opts = {}) {
    const g = this.game;
    g.rig.setFollow(null);
    const c = this.camCfg;
    g.rig.play({ x: opts.camX ?? -28, y: 1.55, z: 2.3, wupp: c.wupp, pitch: c.pitch, yaw: c.yaw, dur: 0 });
  }
  update(dt, t) {
    this.onU.value = 1;
    for (const f of this.updaters) f(dt, t);
    this.crowd?.update(dt);
    if (this.birds) {
      const P = this._pushers || (this._pushers = []);
      P.length = 0;
      for (const c of this.chars) if (c.moving) P.push({ x: c.x, z: c.z });
      this.birds.update(dt, P);
    }
    // smoke from the yaki-imo chimney
    if (this.imo && (this._smokeT = (this._smokeT || 0) - dt) <= 0) {
      this._smokeT = 0.35;
      const ch = this.imo.userData.chimney;
      this.game.particles?.emit('steam', { x: this.imo.position.x + ch.x, y: ch.y, z: this.imo.position.z + ch.z, n: 1 });
    }
    // shopkeepers calling out now and then
    this.shoutT -= dt;
    if (this.shoutT <= 0 && !this.game.director?.inCutscene) {
      this.shoutT = 5 + Math.random() * 6;
      const cx = this.game.rig.target.x;
      const who = Object.values(this.locals).filter((p) => p.shout && Math.abs(p.c.x - cx) < 9);
      const p = who[Math.floor(Math.random() * who.length)];
      if (p) { const line = p.shout[Math.floor(Math.random() * p.shout.length)]; this.game.bubbles?.say(p.c, line, { auto: 1.6, name: p.c.name || '', ambient: true, silent: true }); p.c.play('wave'); }
    }
  }
}
