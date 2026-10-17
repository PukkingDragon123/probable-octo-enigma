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
import { vendingMachine, bench } from '../world/props.js';
import { stationHouse, koban, konbini, gameCenter, ramenShop, bakery, lotteryKiosk, kodamaStatue, mosaic, treeRing, clockPost, suzuranLamp, townBanner, busStop, phoneBooth, postBox, taxi, keiCar, carSignal, pedSignal, sideStreet, officeBlock, hotelSign, izakayaSign, plazaTexture, roadTexture, groundPlane } from '../world/ekimae.js';
import { natureBatch } from '../art/nature.js';
import { Crowd } from '../world/crowd.js';
import { Birds } from '../world/birds.js';
import { phoneMesh } from '../entities/parts.js';

export const ST = { x0: -86, x1: 38, z0: 0, z1: 8.6, walkZ0: 0.7, walkZ1: 8.1 };
// the station square (west of the arcade) and the little road you cross to reach the gate
export const PLAZA = { x0: -86, x1: -41.5, roadX0: -41.5, roadX1: -36.5, arcadeX0: -36.5, curbZ: 6.85, depth: 10.6, station: -76, statue: { x: -60.5, z: 3.7 } };
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
    tex.repeat.set((ST.x1 - PLAZA.arcadeX0) / 4, 1);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ST.x1 - PLAZA.arcadeX0, ST.z1), litMat({ map: tex, vertexColors: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((PLAZA.arcadeX0 + ST.x1) / 2, 0, ST.z1 / 2); floor.receiveShadow = true;
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
    this.buildPlaza(pools);
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
    S.add(roofShadow(-33.4, ST.x1, -1, ST.z1 + 1, 7.6, { every: 2.4, rib: 0.09 }));
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
    this.plants = natureBatch({ max: 760, castShadow: true });
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
    for (const [n, fx, fy, fz, sc] of this.plazaFlowers) nb.push(n, fx, fy, fz, { sway: 0.45, scale: sc });
    for (const [n, tx, tz] of this.plazaTrees) nb.push(n, tx, 0.3, tz, { sway: 0.25, scale: 1.0 });
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
    for (const [a, b, c, d] of this.plazaBlocks) nav.block(a, b, c, d);
    for (const [px, pz, r] of this.plazaCircles) nav.blockCircle(px, pz, r);
    this.navs.street = nav;
    // ---- people
    this.crowd = new Crowd(this.game, this);
    this.populate();
  }
  // ---- the station square: the station, the koban, Kodama Mart, the game
  // centre, ramen, the bakery; the statue, trees, lamps, the bus stop and taxi
  // rank; then the road with its crossing up to the arcade gate
  buildPlaza(pools) {
    const S = this.scene, onU = this.onU, P = PLAZA;
    const B = (this.plazaBlocks = []), Ci = (this.plazaCircles = []);
    const put = (o, x, z, yaw = 0, y = 0) => { o.position.set(x, y, z); o.rotation.y = yaw; S.add(o); if (o.userData.update) this.updaters.push(o.userData.update); return o; };
    // ground: granite square, the crossing road (running off between the houses)
    const pf = groundPlane(plazaTexture(P.depth), P.x1 - P.x0, P.depth, { repeat: (P.x1 - P.x0) / 8 });
    pf.position.set((P.x0 + P.x1) / 2, 0, P.depth / 2); S.add(pf);
    const zFar = 15;
    const rd = groundPlane(roadTexture(P.roadX1 - P.roadX0, zFar, P.depth), P.roadX1 - P.roadX0, zFar + P.depth);
    rd.position.set((P.roadX0 + P.roadX1) / 2, 0, (P.depth - zFar) / 2); S.add(rd);
    const af = groundPlane(plazaTexture(P.depth), 3.4, P.depth, { repeat: 3.4 / 8 }); af.position.set(-34.8, -0.004, P.depth / 2); S.add(af);
    // the buildings along the far side
    const st = put(stationHouse({ onU }), P.station, 0);
    this.stationDoor = { x: P.station + st.userData.door.x, z: 0.55 };
    put(officeBlock({ w: 4.4, floors: 4, onU, seed: 3, wall: 0xb8c4c8, sign: hotelSign() }), -84.2, -0.4);
    const vmA = vendingMachine({ brand: 'Pocori', color: 0x2a7ad8, seed: 31, onU }); put(vmA, -69.45, -0.35); vmA.scale.setScalar(0.92);
    put(officeBlock({ w: 4.8, floors: 4, onU, seed: 5, wall: 0xd8c8b0, sign: izakayaSign() }), -67.6, -3.6);
    const kb = put(koban({ onU }), -67.3, 0);
    this.kobanSpot = { x: -67.3 + kb.userData.officer.x, z: kb.userData.officer.z };
    const shopAt = (g, x) => { put(g, x, 0); for (const pl of g.userData.pools || []) pools.push({ ...pl, x: pl.x + x }); return g; };
    this.plazaShops = {
      konbini: shopAt(konbini({ onU }), -61.65),
      game: shopAt(gameCenter({ onU }), -54.5),
      ramen: shopAt(ramenShop({ onU }), -48.5),
      bakery: shopAt(bakery({ onU }), -43.7),
    };
    if (this.plazaShops.ramen.userData.noren) this.updaters.push((dt, t) => { this.plazaShops.ramen.userData.noren.rotation.x = Math.sin(t * 1.2 + 1) * 0.07 - 0.03; });
    put(lotteryKiosk({ onU }), -35.2, 0);
    S.add(sideStreet({ onU }));
    // the station-front: phone booth, post box, bus stop and its bench
    put(phoneBooth({ onU }), -80.9, 1.05); B.push([-81.4, 0.5, -80.4, 1.6]);
    put(postBox(), -79.5, 0.85); Ci.push([-79.5, 0.85, 0.3]);
    for (const cx of [-79.0, -73.0]) Ci.push([cx, 1.4, 0.22]);
    put(busStop({ onU }), -77.8, 6.55); Ci.push([-77.8, 6.55, 0.2]);
    const bb = put(bench({ color: 0x2a6ad8, seats: 3 }), -75.6, 6.45); B.push([-76.4, 6.1, -74.8, 6.85]);
    this.busBench = bb;
    // the statue on its mosaic, ringed with flowers; trees in granite rings
    const ms = mosaic(3.0); ms.position.set(P.statue.x, 0.012, P.statue.z); S.add(ms);
    put(kodamaStatue(), P.statue.x, P.statue.z); Ci.push([P.statue.x, P.statue.z, 0.75]);
    this.treeRings = [];
    for (const [tx, tz] of [[-72.6, 4.3], [-48.6, 4.4]]) { const tr = put(treeRing(), tx, tz); this.treeRings.push(tr); Ci.push([tx, tz, 1.2]); }
    put(clockPost({ onU }), -70.0, 1.05); Ci.push([-70.0, 1.05, 0.2]);
    [[-79.4, 6.05], [-55.2, 6.05], [-44.6, 6.05], [-38.6 + 3.3, 8.25]].forEach(([lx, lz], i) => { put(suzuranLamp({ onU, banner: townBanner(i) }), lx, lz); Ci.push([lx, lz, 0.18]); });
    // taxis waiting at the rank, bikes in the rack
    this.taxis = [put(taxi({ onU }), -66.0, 8.75, -Math.PI / 2), put(taxi({ onU, body: 0x2a6ab0 }), -60.6, 8.75, -Math.PI / 2)];
    for (let i = 0; i < 5; i++) { const bk = bicycle({ col: [0xf4f0e8, 0xe8a0c0, 0x3a5a8a, 0xf0c040, 0x5a8a5a][i], seed: 40 + i }); put(bk, -58.6 + i * 0.5, 6.4, 0.75 + (i % 2 ? 0.08 : -0.05)); }
    B.push([-58.9, 6.0, -56.3, 6.85]);
    // the crossing: car signal on a cantilever, pedestrian lights at the corners, a kei car waiting
    this.carSig = put(carSignal({ arm: 2.35, onU }), -36.6, -0.6);
    this.peds = [
      put(pedSignal({ onU }), P.roadX0 - 0.25, 0.45, Math.PI / 2 - 0.55),
      put(pedSignal({ onU }), P.roadX1 + 0.25, 0.45, -Math.PI / 2 + 0.55),
      put(pedSignal({ onU }), P.roadX0 - 0.25, 8.3, Math.PI / 2 - 0.25),
      put(pedSignal({ onU }), P.roadX1 + 0.25, 8.3, -Math.PI / 2 + 0.25),
    ];
    for (const pz of [0.45, 8.3]) for (const px of [P.roadX0 - 0.25, P.roadX1 + 0.25]) Ci.push([px, pz, 0.15]);
    this.kei = put(keiCar({ onU }), -37.75, -2.6);
    this.car = { z: -2.6, v: 0, stopZ: -2.6 };
    this.signalT = 0;
    // planters along the curb
    const flowersPl = ['hydrangea_blue', 'azalea', 'susan', 'hydrangea_pink', 'daisy', 'rose', 'hydrangea_violet', 'aster'];
    this.plazaFlowers = [];
    for (const [px, pi] of [[-70.4, 0], [-63.2, 2], [-52.6, 4], [-47.0, 6]]) {
      const pl = planter(); put(pl, px, 6.55);
      for (let k = 0; k < 4; k++) this.plazaFlowers.push([flowersPl[(pi + k) % flowersPl.length], px - 0.45 + k * 0.3, pl.userData.soilY, 6.55 + (k % 2) * 0.06, 0.7]);
      B.push([px - 0.65, 6.25, px + 0.65, 6.85]);
    }
    // a ring of flowers round the statue, trees in the rings
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; this.plazaFlowers.push([['hydrangea_blue', 'azalea', 'daisy', 'hydrangea_pink', 'rose'][i % 5], P.statue.x + Math.cos(a) * 0.68, 0, P.statue.z + Math.sin(a) * 0.55, 0.5]); }
    this.plazaTrees = [['camphor_0', -72.6, 4.3], ['sakura_0', -48.6, 4.4]];
    // the plaza's near edge is the station road: nobody walks on it
    B.push([P.x0, P.curbZ, P.x1, ST.z1]);
    // the ramen shop's vent, the konbini oden
    const rs = this.plazaShops.ramen;
    this.vents = [{ x: rs.position.x + rs.userData.vent.x, y: rs.userData.vent.y, z: rs.userData.vent.z }];
    const kn = this.plazaShops.konbini;
    this.vents.push({ x: kn.position.x + kn.userData.oden.x, y: kn.userData.oden.y + 0.05, z: kn.userData.oden.z, small: true });
    // a light pool under the station canopy and the koban lamp
    pools.push({ x: P.station, z: 1.4, w: 6.4, d: 2.4, col: 0xfff0d0 }, { x: -67.3, z: 0.9, w: 1.8, d: 1.4, col: 0xff8070 });
  }
  // the crossing: a 24 s cycle (walk 9 s, blink 3, all red 1, cars 8, amber 2, all red 1)
  updateCrossing(dt) {
    this.signalT = (this.signalT + dt) % 24;
    const t = this.signalT;
    const ped = t < 9 ? 'go' : t < 12 ? 'blink' : 'stop';
    const car = t >= 13 && t < 21 ? 'go' : t >= 21 && t < 23 ? 'slow' : 'stop';
    this.crossing = { ped, car };
    const blink = ped === 'blink' && Math.floor(t * 4) % 2 === 0;
    for (const s of this.peds) s.userData.setState(ped === 'stop' ? 'stop' : 'go', blink);
    this.carSig.userData.setState(car);
    // the bird-song chirp that tells you it's safe to cross
    if (ped === 'go' && this.game.audio && Math.abs(this.game.rig.target.x + 39) < 14) {
      this._chirpT = (this._chirpT || 0) - dt;
      if (this._chirpT <= 0) { this._chirpT = 0.55; this.game.audio.play('sparrowChirp', { volume: 0.18, pitch: 1.35 }); }
    }
    // the kei car: waits at the line; on green (and with nobody on the zebra) it drives through
    const C = this.car;
    let busy = false;
    const inBox = (x, z) => x > PLAZA.roadX0 - 0.1 && x < PLAZA.roadX1 + 0.1 && z > 0.3 && z < 8.8;
    for (const c of this.chars) if (inBox(c.x, c.z)) { busy = true; break; }
    const want = car === 'go' && !busy;
    if (C.z > -0.2 || want) C.v = Math.min(5, C.v + dt * 3);
    else if (C.z < C.stopZ) C.v = Math.max(0.6, Math.min(5, (C.stopZ - C.z) * 0.9));
    else C.v = Math.max(0, C.v - dt * 8);
    if (!want && C.z <= C.stopZ && C.z + C.v * dt > C.stopZ) { C.z = C.stopZ; C.v = 0; }
    C.z += C.v * dt;
    if (C.z > 12) { C.z = -19; C.v = 3.5; }
    this.kei.position.z = C.z;
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
    const X0 = Math.round(PLAZA.arcadeX0 / V5), X1 = Math.round(ST.x1 / V5);
    const z0 = Math.round(ST.z1 / V5), z1 = z0 + 40;
    const walls = [0x8a7a6a, 0x6a7a7a, 0x8a6a5a, 0x7a7a8a, 0x9a8a6a];
    // built in chunks (voxel coordinates must stay within +-512 of each model's origin)
    let sx = X0, k = 0;
    while (sx < X1) {
      const base = sx;
      const v = new VoxelModel();
      const end = Math.min(X1, base + 600);
      while (sx < end) {
        const w = 80 + Math.floor(hash3(sx, 0, 5) * 50);
        const col = walls[k++ % walls.length];
        // dark interior floor of the opposite shop
        fill(v, sx - base, Math.min(X1, sx + w) - base, -1, -1, z0, z1, (x, y, z) => ((x + base + z) % 7 === 0 ? 0x2e2836 : 0x342e3c));
        // the cut shopfront line (open between pillars), party wall, cut caps lighter
        for (let x = sx; x < Math.min(X1, sx + w); x++) {
          const door = (x - sx) > 18 && (x - sx) < w - 18;
          const h = door ? 2 : 9;
          for (let y = 0; y < h; y++) v.set(x - base, y, z0, y === h - 1 ? 0xd8ccb8 : col);
        }
        for (let z = z0; z < z1; z++) for (let y = 0; y < 9; y++) v.set(sx - base, y, z, y === 8 ? 0xd8ccb8 : sh(col, 0.85));
        if (k % 2) fill(v, sx + 20 - base, sx + 44 - base, 0, 6, z0 + 10, z0 + 16, (x, y) => (y === 6 ? 0xd8ccb8 : 0x5a4a3a));
        sx += w;
      }
      const m = vm(v, V5, [0, 0, 0], { cast: false });
      m.position.x = base * V5;
      g.add(m);
    }
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
    // ---- the station square
    const PS = this.plazaShops;
    // the officer standing guard outside the koban
    const cop = C.add({ id: 'local_koban', name: 'Inuyama-san', species: 'shiba', skin: 0xd8964a, light: 0xf8ecd8, earInner: 0xf8e0c8, ears: 'shiba', tail: 'shiba', tailColor: 0xd8964a, outfit: { kind: 'suit', color: 0x24346a, tie: 0x24346a, shirt: 0xd8e0f0 }, sleeve: 0x24346a, pants: 0x24346a, shoe: 0x1e1e24, hat: { type: 'cap', color: 0x24346a }, scale: 0.98 }, { x: this.kobanSpot.x, z: this.kobanSpot.z + 0.1, yaw: 0, mode: 'stand', prop: false, calm: true });
    cop.c.name = 'Inuyama-san';
    this.locals.koban = cop;
    cop.shout = ['Evening! Mind the crossing.', 'Welcome to Kodama-machi!'];
    // the konbini clerk at the till, two people reading magazines at the window
    const kn = PS.konbini;
    C.add({ id: 'local_konbini', species: 'hamster', skin: 0xf0b878, light: 0xfff4e0, earInner: 0xffb8a8, ears: 'round', tail: 'none', outfit: { kind: 'apron', base: 0xf4f4f0, apron: 0x1fa050 }, sleeve: 0xf4f4f0, pants: 0x3a3a44, scale: 0.9, face: { girl: true } }, { x: kn.position.x + kn.userData.keeper.x, z: kn.userData.keeper.z, yaw: 0, mode: 'stand', prop: false, calm: true });
    kn.userData.readers.forEach((r, i) => C.add({ seed: S(), role: i ? 'salaryman' : 'student' }, { x: kn.position.x + r.x, z: r.z, yaw: 0, mode: 'stand', prop: false, calm: true, act: 'phone' }));
    // kids at the gacha machines, teens at the UFO catchers, a customer at the ramen ticket machine
    kn.userData.browse.forEach((b, i) => C.add({ seed: S(), role: 'kid' }, { x: kn.position.x + b.x, z: b.z, yaw: b.yaw, mode: 'stand', calm: true, act: i ? 'point' : null }));
    PS.game.userData.browse.forEach((b, i) => { if (i === 1) return; C.add({ seed: S(), role: 'student' }, { x: PS.game.position.x + b.x, z: b.z + 0.65, yaw: b.yaw, mode: 'stand', calm: true }); });
    for (const k of ['ramen', 'bakery']) for (const b of PS[k].userData.browse) C.add({ seed: S(), role: k === 'ramen' ? 'salaryman' : 'shopper' }, { x: PS[k].position.x + b.x, z: b.z, yaw: b.yaw, mode: 'stand', calm: true });
    // a queue at the bus stop, people resting on the tree rings, a tourist photographing the statue
    ['granny', 'student', 'officeLady'].forEach((role, i) => C.add({ seed: S(), role }, { x: -76.9 + i * 0.62, z: 5.95, yaw: -Math.PI / 2, mode: 'stand', calm: true, act: i === 1 ? 'phone' : null }));
    this.treeRings.forEach((tr, ti) => tr.userData.seats.forEach((st, i) => { if ((ti + i) % 3 === 2) return; C.add({ seed: S(), role: ['granny', 'student', 'salaryman', 'shopper'][(ti * 2 + i) % 4] }, { x: tr.position.x + st.x, z: tr.position.z + st.z, yaw: st.yaw, mode: 'sit', seatY: st.y, prop: false, act: i ? 'phone' : null }); }));
    C.add({ seed: S(), role: 'tourist' }, { x: PLAZA.statue.x + 2.1, z: PLAZA.statue.z - 0.5, yaw: Math.atan2(-2.1, 0.5), mode: 'stand', calm: true, act: 'phone' });
    // a taxi driver stretching by his cab
    C.add({ seed: S(), role: 'worker' }, { x: -63.4, z: 6.7, yaw: Math.PI, mode: 'stand', calm: true });
    // ---- walkers both ways along the street with pauses at shops
    const east = [], west = [];
    for (const [px, pz, pp] of [[PLAZA.station + 2.5, 2.0, 0.6], [-69.5, 2.4, 0.4], [-62.8, 1.7, 1.4], [-55.4, 1.6, 1.2], [-48.6, 1.9, 0.8], [-43.6, 1.9, 0.9], [-39.2, 2.6, 0.2]]) east.push({ x: px, z: pz, pause: pp, yaw: Math.PI });
    for (const k of ORDER) { const s = sp(k); const b = s.userData.browse[0]; if (!b) continue; east.push({ x: s.position.x + b.x, z: 2.6 + hash3(s.position.x, 1, 2) * 0.6, pause: 0.4 + hash3(s.position.x, 2, 2) * 2.4, yaw: Math.PI }); }
    west.push(...east.map((w) => ({ x: w.x + 0.8, z: w.x < PLAZA.roadX0 ? 5.0 + hash3(w.x, 3, 3) * 0.5 : 5.9 + hash3(w.x, 3, 3) * 0.9, pause: 0.2 + hash3(w.x, 4, 3) * 0.8 })).reverse());
    const loopE = [...east, { x: ST.x1 - 4, z: 3.0 }, { x: ST.x1 - 4, z: 6.4 }, ...west, { x: ST.x0 + 5, z: 6.4 }, { x: ST.x0 + 5, z: 3.0 }];
    const roles = ['shopper', 'salaryman', 'student', 'officeLady', 'granny', 'tourist', 'shopper', 'worker', 'student', 'shopper'];
    for (let i = 0; i < 28; i++) {
      const start = Math.floor((i / 28) * loopE.length);
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
    if (this.peds) this.updateCrossing(dt);
    if (this.vents && (this._ventT = (this._ventT || 0) - dt) <= 0) {
      this._ventT = 0.3;
      for (const v of this.vents) if (!v.small || Math.random() < 0.5) this.game.particles?.emit('steam', { x: v.x + (Math.random() - 0.5) * 0.1, y: v.y, z: v.z, n: 1 });
    }
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
