// Kodama-machi station, Shinkansen platform 14 (the terminus). A long island
// platform seen side-on: the Kodama pulls in along the far edge (z < 0),
// commuters and tourists pour out and stream to the stairs at the east end,
// the platform roof is a cut-away frame of beams with hanging fluorescent
// tubes and signs, and beyond the near edge there's an empty track, a fence,
// susuki and the town's rooftops.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { VoxelModel, vm, glowVm, signPlane, fill, tx, sh, tone, hash3, V1, V5 } from '../world/build.js';
import { stationBoard, exitSign, numberPlate, poster, welcomeSign, SIGN_TPM } from '../world/signs.js';
import { vendingMachine, bench, bins, hangingClock, kiosk } from '../world/props.js';
import { waitingRoom, sobaStand, departureBoard, stationColumn, overheadBeam, extinguisherBox, aedBox, emergencyPost, convexMirror, speakerCam, plantPot, boardingMarker } from '../world/station.js';
import { Crowd } from '../world/crowd.js';
import { Birds } from '../world/birds.js';
import { shinkansenCar, CAR_LEN } from '../world/shinkansen.js';
import { PixCanvas, makeTexture, mix, darken, lighten } from '../core/pixtex.js';
import { litMat } from '../core/materials.js';
import { natureBatch } from '../art/nature.js';

export const PLAT = { x0: -22, x1: 22, z0: 0, z1: 7.4, stairsX: 17, cz: 3.3 };
const TRAIN_Z = -0.22;

function floorTexture() {
  // 8 m x 7.4 m of platform at 64 texels/m, repeats along x. Concrete slabs
  // with per-slab tone, grout, wear, gum spots and cracks; granite coping and
  // the white line + tactile strip at both edges; the guide line in the middle.
  const W = 512, H = 474;
  const p = new PixCanvas(W, H, 31);
  const slab = ['#b4aea2', '#bab4a8', '#aea89c', '#c0baae', '#b0aa9e'];
  for (let sy = 0; sy < H; sy += 32) for (let sx = 0; sx < W; sx += 32) {
    const k = Math.floor(p.rnd() * slab.length);
    p.rect(sx, sy, 32, 32, slab[k]);
    for (let i = 0; i < 26; i++) p.px(sx + Math.floor(p.rnd() * 32), sy + Math.floor(p.rnd() * 32), p.rnd() < 0.5 ? darken(slab[k], 0.06) : lighten(slab[k], 0.06));
  }
  for (let x = 0; x < W; x += 32) p.vline(x, 0, H - 1, '#948e84');
  for (let y = 0; y < H; y += 32) p.hline(0, W - 1, y, '#948e84');
  // worn path down the middle walkway (lighter, smoother)
  for (let y = 300; y < 420; y++) for (let x = 0; x < W; x++) if (p.rnd() < 0.08) p.px(x, y, '#c6c0b4');
  // gum spots, stains, little cracks
  for (let i = 0; i < 70; i++) { const x = p.rnd() * W, y = 80 + p.rnd() * (H - 120); p.ellipse(x, y, 1 + p.rnd() * 1.5, 1, p.rnd() < 0.5 ? '#8e887e' : '#a29c90'); }
  for (let i = 0; i < 9; i++) { let x = p.rnd() * W, y = 90 + p.rnd() * 300; for (let k = 0; k < 14; k++) { p.px(x, y, '#8a847a'); x += p.rnd() < 0.5 ? 1 : 0; y += 1; } }
  // the train-side edge: granite coping, rubber gap, white line, tactile strip
  p.rect(0, 0, W, 10, '#d8d4cc'); for (let x = 0; x < W; x += 24) p.vline(x, 0, 9, '#b8b4ac');
  p.rect(0, 0, W, 2, '#3a3a40');
  p.rect(0, 14, W, 5, '#f8f6ee');
  p.rect(0, 46, W, 22, '#f0c430');
  for (let x = 2; x < W; x += 6) for (let y = 49; y < 66; y += 6) { p.rect(x, y, 3, 3, '#ffdc5e'); p.px(x + 2, y + 2, '#c89a20'); }
  p.hline(0, W - 1, 46, '#c89a20'); p.hline(0, W - 1, 67, '#c89a20');
  // guide line (linear tactile) along the middle walkway
  p.rect(0, 300, W, 14, '#f0c430');
  for (let x = 0; x < W; x += 8) p.rect(x + 1, 302, 5, 10, '#ffdc5e');
  // the far edge (track 13)
  p.rect(0, H - 10, W, 10, '#d8d4cc'); p.rect(0, H - 2, W, 2, '#3a3a40');
  p.rect(0, H - 19, W, 5, '#f8f6ee');
  p.rect(0, H - 48, W, 20, '#f0c430');
  for (let x = 2; x < W; x += 6) for (let y = H - 45; y < H - 30; y += 6) p.rect(x, y, 3, 3, '#ffdc5e');
  return p;
}
function edgeTexture() {
  const p = new PixCanvas(256, 80, 32);
  p.noiseFill(['#7a766e', '#86827a', '#8e8a82'], { scale: 0.12 });
  p.rect(0, 0, 256, 6, '#a8a49a');
  p.rect(0, 6, 256, 2, '#5a564e');
  for (let x = 0; x < 256; x += 64) p.vline(x, 8, 79, '#6a665e');
  for (let i = 0; i < 30; i++) p.vline((i * 37) % 256, 8, 8 + (i * 13) % 40, '#706c64');
  return p;
}
// the town and hills behind the far track (pixel painting, 64 texels/m at 1:3)
function backdrop() {
  const W = 512, H = 160;
  const p = new PixCanvas(W, H, 33);
  for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#9ec8f0', '#f2e4cc', Math.min(1, y / 120)));
  // clouds
  for (let i = 0; i < 9; i++) { const cx = (i * 71) % W, cy = 20 + (i * 17) % 40; for (let k = 0; k < 5; k++) p.ellipse(cx + k * 9 - 18, cy + (k % 2) * 3, 12, 6, k % 2 ? '#ffffff' : '#f4f8ff'); }
  // hills
  for (let x = 0; x < W; x++) { const h = 70 + Math.sin(x * 0.013) * 14 + Math.sin(x * 0.041 + 1) * 6; p.vline(x, Math.round(h), H, mix('#7aa070', '#5a8060', (x % 37) / 37 * 0.3)); }
  for (let x = 0; x < W; x++) { const h = 92 + Math.sin(x * 0.02 + 2) * 8; p.vline(x, Math.round(h), H, '#6a9064'); }
  // rooftops (kawara grey-blue, a few red and green tin roofs), windows
  let x = 0;
  while (x < W) {
    const w = 18 + Math.floor(p.rnd() * 26), h = 18 + Math.floor(p.rnd() * 26), top = H - h - 14;
    const roof = ['#5a6478', '#4a5468', '#a8483a', '#5a7a5a', '#6a6a72'][Math.floor(p.rnd() * 5)];
    const wall = ['#e8e0d0', '#d8ccb8', '#c8c0b0', '#f0e8d8', '#b8b0a4'][Math.floor(p.rnd() * 5)];
    p.rect(x, top + 6, w, h, wall);
    p.poly([[x - 2, top + 7], [x + w / 2, top - 3], [x + w + 2, top + 7]], roof);
    for (let wx = x + 3; wx < x + w - 4; wx += 6) for (let wy = top + 10; wy < top + h - 4; wy += 7) p.rect(wx, wy, 3, 3, p.rnd() < 0.2 ? '#ffe8a0' : '#6a7488');
    x += w + 1 + Math.floor(p.rnd() * 4);
  }
  // power lines + a few poles
  for (let i = 0; i < 6; i++) { const px = 30 + i * 90; p.vline(px, 70, H, '#4a4a52'); p.hline(px - 4, px + 4, 74, '#4a4a52'); }
  for (let x2 = 0; x2 < W; x2++) { p.px(x2, 75 + Math.round(Math.sin(((x2 - 30) % 90) / 90 * Math.PI) * 4), '#3a3a42'); }
  // a billboard
  p.rect(300, 92, 40, 20, '#ffffff'); p.rect(301, 93, 38, 18, '#e8443a'); p.text('ガチャ!', 320, 96, { font: '10px "Mochiy Pop One"', color: '#ffffff', align: 'center' });
  p.vline(310, 112, 130, '#3a3a42'); p.vline(330, 112, 130, '#3a3a42');
  // track bed / gravel at the bottom
  p.rect(0, H - 14, W, 14, '#6a645c');
  for (let i = 0; i < 300; i++) p.px(Math.floor(p.rnd() * W), H - 14 + Math.floor(p.rnd() * 14), p.rnd() < 0.5 ? '#7a746a' : '#5a544c');
  return p;
}

export class PlatformLocation extends Location {
  constructor(game) {
    super(game, 'platform', { bg: 0x9ec8f0, lightMode: 'human', grade: 'human', music: undefined, ambience: 'station' });
    this.camCfg = { wupp: 0.0095, pitch: 35, yaw: 0, follow: true, minWupp: 0.005, maxWupp: 0.02 };
    this.shadowSize = 16;
    this.clock = false;
    this.hourOverride = 16.6;
    this.trainX = 0;
  }
  async build() {
    const S = this.scene;
    const L = PLAT.x1 - PLAT.x0, D = PLAT.z1 - PLAT.z0, cz = PLAT.cz;
    this.onU = { value: 1 };
    this.updaters = [];
    // ---- platform slab: textured floor + edge faces
    const ft = makeTexture(floorTexture().c, { repeat: true, mips: false });
    ft.repeat.set(L / 8, 1);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, D), litMat({ map: ft, vertexColors: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((PLAT.x0 + PLAT.x1) / 2, 0, (PLAT.z0 + PLAT.z1) / 2);
    floor.receiveShadow = true;
    S.add(floor);
    const et = makeTexture(edgeTexture().c, { repeat: true, mips: false });
    et.repeat.set(L / 4, 1);
    for (const [z, ry] of [[PLAT.z0, Math.PI], [PLAT.z1, 0]]) {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.25), litMat({ map: et, vertexColors: false }));
      e.position.set((PLAT.x0 + PLAT.x1) / 2, -0.625, z); e.rotation.y = ry;
      e.receiveShadow = true;
      S.add(e);
    }
    for (const tz of [TRAIN_Z - 1.6, PLAT.z1 + 1.7]) S.add(this.trackBed(tz, L + 40));
    // ---- backdrop: the town and hills behind the far track
    const bd = signPlane(backdrop(), 70, { lit: false });
    bd.position.set(0, 3.6, -9);
    S.add(bd);
    // near side: a fence, a hedge of susuki, azalea, a couple of trees
    const fence = new VoxelModel();
    for (let x = -480; x < 480; x++) for (let y = 0; y < 12; y++) if (x % 20 === 0 || y === 11 || y === 5) fence.set(x, y, 0, x % 20 === 0 ? 0x6a6a72 : 0x8a8e96);
    const fm = vm(fence, V5); fm.position.set(0, -1.25, PLAT.z1 + 3.6); S.add(fm);
    this.plants = natureBatch({ max: 260, castShadow: true });
    S.add(this.plants.mesh);
    const nb = this.plants;
    for (let i = 0; i < 64; i++) {
      const x = -30 + i * 0.95 + Math.sin(i * 7.3) * 0.35;
      const name = ['susuki', 'jp_grass_1', 'azalea', 'jp_shrub', 'susuki', 'jp_shida_1', 'hydrangea_blue', 'jp_grass_2', 'jp_shrub_1', 'hydrangea_pink'][i % 10];
      nb.push(name, x, -1.25, PLAT.z1 + 3.9 + (i % 3) * 0.22, { sway: 0.5 });
    }
    for (const [n, x, z] of [['sakura_0', -13, 5.4], ['camphor_1', 3, 5.8], ['sakura_1', 15, 5.2], ['camphor_0', -26, 5.8], ['ginkgo_0', 25, 5.4]]) nb.push(n, x, -1.25, PLAT.z1 + z, { sway: 0.22 });
    nb.commit();
    // ---- the train (3 cars, nose first at the east)
    this.train = new THREE.Group();
    const c1 = shinkansenCar({ nose: true, number: 8, onU: this.onU });
    const c2 = shinkansenCar({ number: 7, panto: true, onU: this.onU });
    const c3 = shinkansenCar({ number: 6, onU: this.onU });
    c1.position.x = 1.5; c2.position.x = 1.5 - CAR_LEN - 0.3; c3.position.x = 1.5 - 2 * CAR_LEN - 0.6;
    this.cars = [c1, c2, c3];
    this.train.add(c1, c2, c3);
    this.train.position.z = TRAIN_Z;
    S.add(this.train);
    this.doorXs = this.cars.flatMap((c) => c.userData.doors.map((d) => d + c.position.x)).filter((x) => x > PLAT.x0 + 1 && x < PLAT.x1 - 3).sort((a, b) => a - b);
    // ---- roof structure: columns, the overhead beam, lamps, swallows' nest
    this.colXs = [-15.8, -10.8, -3.6, 3.6, 9.4, 20.5];
    const ads = ['gacha', 'onsen', 'bento', 'phone', 'travel', 'gacha'];
    this.colXs.forEach((x, i) => { const c = stationColumn({ ad: ads[i], seed: i, onU: this.onU }); c.position.set(x, 0, cz); S.add(c); });
    const beam = overheadBeam(L + 2); beam.position.set(0, 3.42, cz); S.add(beam);
    for (let x = -21; x <= 21; x += 3) {
      if (Math.abs(x - 0.4) < 2.4) continue; // the departure board hangs here
      const tube = new VoxelModel();
      for (let i = 0; i < 26; i++) { tube.set(i, 0, 0, 0xfffaf0); tube.set(i, 1, 0, i === 0 || i === 25 ? 0x9aa0a8 : 0xe8ecf0); }
      const t = glowVm(tube, V5, [13, 0, 0.5], { intensity: 1.15, mode: Math.abs(x - 6) < 0.1 ? 2 : 1, onU: this.onU });
      t.position.set(x, 3.25, cz + 0.42); S.add(t);
    }
    for (const x of [-14.4, 7.2]) { const sc = speakerCam(); sc.position.set(x, 3.15, cz + 0.2); S.add(sc); }
    // swallows' mud nest on a cross beam + the swallows darting around it
    const nest = new VoxelModel();
    for (let x = -3; x <= 2; x++) for (let z = -2; z <= 1; z++) for (let y = 0; y <= 2; y++) if (Math.hypot(x + 0.5, z + 0.5) < 2.6 - y * 0.3) nest.set(x, -y, z, (x + y + z) % 3 === 0 ? 0x6a5038 : 0x8a6a48);
    const nm = vm(nest, V5); nm.position.set(-7.2, 3.4, cz - 1.0); S.add(nm);
    // ---- hanging signs: station name boards, departure board, exits, clocks
    for (const x of [-7.2, 7.2]) {
      const sb = signPlane(stationBoard(), 2.0); sb.position.set(x, 2.55, cz + 0.12); S.add(sb);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.84, 0.06), new THREE.MeshLambertMaterial({ color: 0x5a5a62 }));
      back.position.set(x, 2.55, cz + 0.08); back.castShadow = true; S.add(back);
      for (const dx of [-0.8, 0.8]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), new THREE.MeshLambertMaterial({ color: 0x5a5a62 })); h.position.set(x + dx, 3.2, cz + 0.08); S.add(h); }
    }
    const dep = departureBoard({ rows: [['こだま', '742', '16:42', '木霊町', '14'], ['こだま', '746', '17:12', '静岡', '13']], onU: this.onU });
    dep.position.set(0.4, 2.45, cz + 0.05); S.add(dep);
    this.updaters.push(dep.userData.update);
    const ex = signPlane(exitSign({ dir: 1 }), 1.5, { emissive: 0.5, onU: this.onU }); ex.position.set(13.6, 2.85, cz + 0.12); S.add(ex);
    const ex2 = signPlane(exitSign({ ja: 'のりかえ', en: 'Transfer', sub: '在来線 Local lines', dir: -1 }), 1.5, { emissive: 0.5, onU: this.onU }); ex2.position.set(-20, 2.85, cz + 0.12); S.add(ex2);
    for (const x of [-14.4, 12.6]) { const clk = hangingClock(); clk.position.set(x, 2.55, cz + 0.2); S.add(clk); }
    // ---- facilities on the centre line (all facing the camera, +z)
    const wr = waitingRoom({ onU: this.onU }); wr.position.set(-19.2, 0, cz + 0.75); S.add(wr); this.waiting = wr;
    const soba = sobaStand({ onU: this.onU }); soba.position.set(-5.8, 0, cz + 0.6); S.add(soba); this.soba = soba;
    const km = kiosk({ onU: this.onU }); km.position.set(1.0, 0, cz + 0.62); S.add(km); this.kiosk = km;
    const vend = [[4.7, 'Pocori', 0x2a7ad8, 1], [5.6, 'KIRIN-ish', 0xe8443a, 2], [6.5, 'Boss Coffee', 0x2a2a34, 3]];
    for (const [x, brand, col, seed] of vend) { const v = vendingMachine({ brand, color: col, seed, onU: this.onU }); v.position.set(x, 0, cz + 0.05); S.add(v); }
    const bn = bins(); bn.position.set(7.6, 0, cz + 0.2); S.add(bn);
    this.benches = [];
    for (const x of [-13.6, -8.6, -1.8, 12.0]) { const b = bench({ color: 0x3a9a8a }); b.position.set(x, 0, cz + 0.4); S.add(b); this.benches.push(b); }
    const ext = extinguisherBox(); ext.position.set(-10.8 + 0.42, 0.05, cz + 0.05); S.add(ext);
    const ext2 = extinguisherBox(); ext2.position.set(9.4 + 0.42, 0.05, cz + 0.05); S.add(ext2);
    const aed = aedBox(); aed.position.set(-16.75, 0.75, cz + 0.4); aed.rotation.y = Math.PI / 2; S.add(aed);
    for (const x of [-16, -1, 14.4]) { const ep = emergencyPost(); ep.position.set(x, 0, 1.55); S.add(ep); }
    const mir = convexMirror(); mir.position.set(21.4, 0, 1.4); mir.rotation.y = -0.6; S.add(mir);
    for (const x of [-16.6, 10.4, 13.6]) { const pp = plantPot({ col: [0xc87a4a, 0x3a6a8a, 0xb85a4a][Math.abs(Math.round(x)) % 3] }); pp.position.set(x, 0, cz + 0.6); S.add(pp); nb.push(['jp_shrub_1', 'hydrangea_violet', 'jp_shida'][Math.abs(Math.round(x)) % 3], x + 0.02, 0.35, cz + 0.62, { sway: 0.4, scale: 0.8 }); }
    nb.commit();
    // posters on the waiting room back + floor boarding markers at each door
    for (const [i, kind] of [[0, 'travel'], [1, 'manners'], [2, 'festival']]) { const pp = signPlane(poster(kind, i), 0.5); pp.position.set(-20.8 + i * 0.6, 0.55, cz + 0.79); S.add(pp); }
    for (const dx of this.doorXs) { const mk = signPlane(boardingMarker(8), 1.2); mk.rotation.x = -Math.PI / 2; mk.position.set(dx, 0.013, 1.45); S.add(mk); }
    for (const [x, n] of [[-12, 6], [-3, 7], [6, 8]]) { const np = signPlane(numberPlate(n), 0.32); np.rotation.x = -Math.PI / 2; np.position.set(x, 0.012, 2.3); S.add(np); }
    // ---- the stairs down (east end)
    S.add(this.stairwell());
    // ---- grandpa's welcome sign (a prop he holds up in the chapter)
    this.signMesh = signPlane(welcomeSign(), 0.62, { double: true });
    // ---- birds: sparrows by the benches, doves at the quiet west end, swallows under the roof
    this.birds = new Birds(S, { max: 40 });
    for (let i = 0; i < 5; i++) this.birds.addGround('jp_suzume', -9.6 + i * 0.4, 5.0 + (i % 2) * 0.4, { x0: -11, x1: -6, z0: 4.6, z1: 6.2, y: 0 }, { scale: 0.4 });
    for (let i = 0; i < 4; i++) this.birds.addGround('jp_suzume', 8.4 + i * 0.5, 5.2 + (i % 2) * 0.5, { x0: 7, x1: 11, z0: 4.6, z1: 6.4, y: 0 }, { scale: 0.4 });
    for (let i = 0; i < 4; i++) this.birds.addGround('jp_hato', -21 + i * 0.7, 5.4 + (i % 2) * 0.5, { x0: -21.6, x1: -17, z0: 4.8, z1: 6.6, y: 0 }, { scale: 0.5 });
    for (let i = 0; i < 2; i++) this.birds.addFlyer('jp_tsubame', -7.2, 3.0, cz, 2.4 + i * 0.9);
    // ---- nav: the whole platform minus the facilities
    const nav = this.makeNav('plat', { minX: PLAT.x0 + 0.4, minZ: 0.5, w: L - 0.8, d: D - 1.0 });
    for (const [x0, x1] of [[-21.5, -16.9], [-7.4, -4.2], [-0.6, 3.6], [4.2, 8.2]]) nav.block(x0, cz - 1.2, x1, cz + 0.85);
    for (const b of this.benches) nav.block(b.position.x - 0.8, cz - 0.1, b.position.x + 0.8, cz + 0.65);
    nav.block(PLAT.stairsX - 2.1, cz + 0.85, PLAT.stairsX + 2.2, cz + 1.0); nav.block(PLAT.stairsX - 2.1, cz + 2.35, PLAT.stairsX + 2.2, cz + 2.5);
    for (const x of this.colXs) nav.blockCircle(x, cz, 0.3);
    this.navs.plat = nav;
    // ---- the crowd
    this.crowd = new Crowd(this.game, this);
    this.populate();
  }
  // a packed, lived-in platform: queues at each door, people in the waiting room,
  // on the benches and at the soba counter, groups chatting, walkers with luggage,
  // a kid orbiting a parent, a tourist photographing the train, a station guard
  populate() {
    const C = this.crowd, cz = PLAT.cz;
    let seed = 100;
    const S = () => (seed += 7);
    const roles = ['salaryman', 'salaryman', 'officeLady', 'tourist', 'student', 'shopper', 'granny', 'tourist'];
    // queues: two lanes per door, 2-3 deep (the first door of a close pair gets a short one)
    this.doorXs.forEach((dx, di) => {
      const short = di < this.doorXs.length - 1 && this.doorXs[di + 1] - dx < 6;
      for (const lane of [-0.55, 0.55]) {
        const n = short ? 1 : 2;
        for (let k = 0; k < n; k++) C.add({ seed: S(), role: roles[(seed >> 3) % roles.length] }, { x: dx + lane + (Math.random() - 0.5) * 0.1, z: 1.3 + k * 0.85, yaw: Math.random() < 0.25 ? Math.PI + (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 2.2, mode: 'queue', act: Math.random() < 0.3 ? 'phone' : null });
      }
    });
    // waiting room sitters
    const wr = this.waiting;
    wr.userData.seats.slice(0, 5).forEach((st, i) => { if (i === 2) return; C.add({ seed: S(), role: pick2(['granny', 'salaryman', 'shopper', 'officeLady'], i) }, { x: wr.position.x + st.x, z: wr.position.z + st.z, yaw: 0, mode: 'sit', seatY: st.y, prop: false, act: i === 3 ? 'phone' : null }); });
    // benches
    this.benches.forEach((b, bi) => b.userData.seats.forEach((st, si) => { if (si === 1) return; C.add({ seed: S(), role: pick2(['granny', 'shopper', 'student', 'salaryman', 'tourist'], bi + si) }, { x: b.position.x + st.x, z: b.position.z - 0.02, yaw: 0, mode: 'sit', seatY: st.y, prop: false, act: (bi + si) % 4 === 1 ? 'phone' : null }); }));
    // soba counter: cook + two slurpers; kiosk clerk + a customer
    const so = this.soba;
    C.add({ species: 'tanuki', skin: 0x8a6a4a, light: 0xd8c4a8, earInner: 0x2a2018, ears: 'round', tail: 'tanuki', tailColor: 0x8a6a4a, tailTip: 0x3a2a20, outfit: { kind: 'apron', base: 0xf4f0e8, apron: 0x2a3a6a }, sleeve: 0xf4f0e8, sleeveLen: 0.5, pants: 0x3a3a3a, hat: { type: 'kerchief', color: 0x2a3a6a }, face: { mask: '#3a2a20' }, belly: 0.7, scale: 0.95 }, { x: so.position.x + so.userData.cook.x, z: so.position.z + so.userData.cook.z, yaw: 0, mode: 'stand', prop: false });
    so.userData.spots.slice(0, 2).forEach((sp) => C.add({ seed: S(), role: 'salaryman' }, { x: so.position.x + sp.x, z: so.position.z + sp.z, yaw: sp.yaw, mode: 'eat', prop: false }));
    const ki = this.kiosk;
    C.add({ seed: 4242, role: 'officeLady' }, { x: ki.position.x + ki.userData.clerk.x, z: ki.position.z + ki.userData.clerk.z, yaw: 0, mode: 'stand', prop: false });
    C.add({ seed: S(), role: 'student' }, { x: ki.position.x + 0.3, z: cz + 1.25, yaw: Math.PI, mode: 'stand', prop: 'backpack' });
    // chatting groups on the near walkway
    C.group([{ seed: S(), role: 'student' }, { seed: S(), role: 'student' }, { seed: S(), role: 'student' }].map((d) => ({ ...d })), { x: -3.4, z: 5.7, r: 0.8, a0: 0.4 });
    C.group([{ seed: S(), role: 'tourist' }, { seed: S(), role: 'tourist' }, { seed: S(), role: 'shopper' }], { x: 4.8, z: 5.9, r: 0.82, a0: 1.2 });
    C.group([{ seed: S(), role: 'salaryman' }, { seed: S(), role: 'salaryman' }], { x: -15.2, z: 5.5, r: 0.6, a0: 1.57 });
    // walkers with luggage looping along the walkway (and into the stairs)
    const loopA = [{ x: -20, z: 5.0 }, { x: 15, z: 5.2 }, { x: 15.4, z: 6.6 }, { x: -20, z: 6.5 }];
    const loopB = [{ x: 14, z: 6.4 }, { x: -18, z: 6.2 }, { x: -18.5, z: 4.9 }, { x: 14, z: 5.0 }];
    for (let i = 0; i < 7; i++) {
      const path = i % 2 ? loopB : loopA, w = path[i % path.length];
      C.add({ seed: S(), role: pick2(['tourist', 'salaryman', 'officeLady', 'tourist', 'shopper'], i) }, { x: w.x + (i * 2.7) % 9 - 4, z: w.z, yaw: 1.57, mode: 'walk', path, start: (i + 1) % 4 });
    }
    // a kid orbiting a parent by the vending machines, pointing at the drinks
    const mom = C.add({ seed: S(), role: 'shopper' }, { x: 5.6, z: cz + 1.3, yaw: Math.PI, mode: 'stand' });
    C.add({ seed: S(), role: 'kid' }, { x: 6.2, z: cz + 1.5, yaw: 0, mode: 'kid', parent: mom });
    // a tourist photographing the train, a station guard by the edge
    C.add({ seed: S(), role: 'tourist' }, { x: 7.6, z: 1.5, yaw: Math.PI - 0.3, mode: 'photo', prop: false });
    C.add({ species: 'shiba', skin: 0xd8964a, light: 0xf8ecd8, earInner: 0xf8e0c8, ears: 'shiba', tail: 'shiba', tailColor: 0xd8964a, outfit: { kind: 'suit', color: 0x2a3450, tie: 0x2a3450, shirt: 0xf0f0f4 }, sleeve: 0x2a3450, pants: 0x2a3450, shoe: 0x2a2228, hat: { type: 'cap', color: 0x2a3450, brim: 0x1e2438 }, scale: 0.94 }, { x: 18.6, z: 1.3, yaw: -1.2, mode: 'stand', prop: false, act: 'handsBack' });
  }
  trackBed(z, len) {
    const v = new VoxelModel();
    const n = Math.round(len / V1);
    for (let x = -n / 2; x < n / 2; x++) for (let k = -14; k <= 14; k++) v.set(x, 0, k, tone(x, 0, k, 0x6a645c, 0x5a544c, 0x7a746a, 0.3, 0.2));
    for (let x = -n / 2; x < n / 2; x += 6) for (let k = -10; k <= 10; k++) v.set(x, 1, k, 0x6a5a4a);
    for (const k of [-7, 7]) for (let x = -n / 2; x < n / 2; x++) { v.set(x, 1, k, 0x8a8a92); v.set(x, 2, k, 0xb8bcc4); }
    const m = vm(v, V1, [0, 0, 0], { cast: false });
    m.position.set(0, -1.32, z);
    return m;
  }
  stairwell() {
    const g = new THREE.Group();
    const v = new VoxelModel();
    const x0 = 0, x1 = 84, z0 = 0, z1 = 30; // opening faces -x
    for (let x = x0; x <= x1; x++) for (let y = 0; y < 22; y++) {
      const glass = y > 4 && y < 20;
      for (const z of [z0, z1]) v.set(x, y, z, glass ? null : y === 21 ? 0xb8bcc4 : 0xd8d4ca);
    }
    for (let z = z0; z <= z1; z++) for (let y = 0; y < 22; y++) v.set(x1, y, z, y === 21 ? 0xb8bcc4 : 0xd8d4ca);
    for (let i = 0; i < 18; i++) for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 4 + i * 4; x < x0 + 8 + i * 4 && x < x1; x++) { v.set(x, -1 - i * 2, z, i % 2 ? 0x8a867e : 0x9a968c); if (x === x0 + 4 + i * 4) v.set(x, -1 - i * 2, z, 0xf0c430); }
    for (let x = x0; x <= x1; x++) { v.set(x, 18, z0 + 1, 0xc8a050); v.set(x, 18, z1 - 1, 0xc8a050); }
    const m = vm(v, V5);
    m.position.set(PLAT.stairsX - 2.1, 0, PLAT.cz + 0.9);
    g.add(m);
    const gm = new THREE.MeshBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.25, depthWrite: false });
    for (const z of [PLAT.cz + 0.9, PLAT.cz + 0.9 + 1.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.75), gm); p.position.set(PLAT.stairsX, 0.6, z + 0.025); g.add(p); }
    const ex = signPlane(exitSign({ dir: 0, sub: '改札 Ticket gates' }), 1.2, { emissive: 0.5, onU: this.onU });
    ex.position.set(PLAT.stairsX - 1.4, 1.45, PLAT.cz + 0.9 + 1.5 + 0.06); g.add(ex);
    return g;
  }
  async enter(opts = {}) {
    const g = this.game;
    g.rig.setFollow(null);
    const c = this.camCfg;
    g.rig.play({ x: 0, y: 0.8, z: 3.4, wupp: c.wupp, pitch: c.pitch, yaw: c.yaw, dur: 0 });
    this.setTrain(opts.trainX ?? 0);
  }
  setTrain(x) { this.trainX = x; this.train.position.x = x; }
  openDoors(k) { for (const c of this.cars) c.userData.openDoors(k); }
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
    // steam from the soba pots
    if (this.soba && (this._steamT = (this._steamT || 0) - dt) <= 0) {
      this._steamT = 0.45;
      for (const s of this.soba.userData.steam) this.game.particles?.emit('steam', { x: this.soba.position.x + s.x, y: s.y, z: this.soba.position.z + s.z, n: 1 });
    }
  }
}
function pick2(arr, i) { return arr[i % arr.length]; }
