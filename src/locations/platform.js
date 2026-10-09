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
import { vendingMachine, bench, bins, column, hangingClock, kiosk } from '../world/props.js';
import { shinkansenCar, CAR_LEN } from '../world/shinkansen.js';
import { PixCanvas, makeTexture, mix } from '../core/pixtex.js';
import { litMat } from '../core/materials.js';
import { natureBatch } from '../art/nature.js';

export const PLAT = { x0: -18, x1: 18, z0: 0, z1: 7.4, stairsX: 12.5 };
const TRAIN_Z = -0.22;

function floorTexture() {
  // 4 m x 7.4 m of platform at 64 texels/m, repeats along x
  const W = 256, H = 474;
  const p = new PixCanvas(W, H, 31);
  p.noiseFill(['#a8a49a', '#b4b0a6', '#bcb8ae', '#c4c0b6'], { scale: 0.08, contrast: 0.8 });
  // tile seams every 0.5 m
  for (let x = 0; x < W; x += 32) p.vline(x, 0, H - 1, '#9a968c');
  for (let y = 0; y < H; y += 32) p.hline(0, W - 1, y, '#9a968c');
  // stains / gum spots
  for (let i = 0; i < 40; i++) { const x = p.rnd() * W, y = 90 + p.rnd() * (H - 100); p.ellipse(x, y, 1 + p.rnd() * 3, 1 + p.rnd() * 2, p.rnd() < 0.5 ? '#9e9a90' : '#aaa69c'); }
  // the platform edge: white safety line, then the yellow tactile strip with dots
  p.rect(0, 0, W, 6, '#d8d4ca');
  p.rect(0, 6, W, 4, '#f4f2ea');
  p.rect(0, 46, W, 22, '#f0c430');
  for (let x = 2; x < W; x += 6) for (let y = 49; y < 66; y += 6) { p.rect(x, y, 3, 3, '#ffd85a'); p.px(x + 2, y + 2, '#c89a20'); }
  p.hline(0, W - 1, 46, '#c89a20'); p.hline(0, W - 1, 67, '#c89a20');
  // guide line (linear tactile) along the middle walkway
  p.rect(0, 300, W, 14, '#f0c430');
  for (let x = 0; x < W; x += 8) p.rect(x + 1, 302, 5, 10, '#ffd85a');
  // the far edge (near-side track): white line + tactile
  p.rect(0, H - 6, W, 6, '#f4f2ea');
  p.rect(0, H - 40, W, 18, '#f0c430');
  for (let x = 2; x < W; x += 6) for (let y = H - 37; y < H - 24; y += 6) p.rect(x, y, 3, 3, '#ffd85a');
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
    this.camCfg = { wupp: 0.0125, pitch: 34, yaw: 0, follow: true, minWupp: 0.006, maxWupp: 0.02 };
    this.shadowSize = 20;
    this.clock = false;
    this.hourOverride = 16.6;
    this.trainX = 0;
    this.folk = [];
  }
  async build() {
    const S = this.scene;
    const L = PLAT.x1 - PLAT.x0, D = PLAT.z1 - PLAT.z0;
    // ---- platform slab: textured floor + edge faces
    const ft = makeTexture(floorTexture().c, { repeat: true, mips: false });
    ft.repeat.set(L / 4, 1);
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
    // track beds (gravel + rails + sleepers) on both sides
    for (const tz of [TRAIN_Z - 1.6, PLAT.z1 + 1.7]) S.add(this.trackBed(tz, L + 30));
    // ---- the town backdrop behind the far track + beyond the near fence
    const bd = signPlane(backdrop(), 60, { lit: false });
    bd.position.set(0, 3.4, -9);
    S.add(bd);
    // near side: a fence, susuki, bushes and a sakura (2D nature sprites)
    const fence = new VoxelModel();
    for (let x = -400; x < 400; x++) { for (let y = 0; y < 12; y++) if (x % 20 === 0 || y === 11 || y === 5) fence.set(x, y, 0, x % 20 === 0 ? 0x6a6a72 : 0x8a8e96); }
    const fm = vm(fence, V5); fm.position.set(0, -1.25, PLAT.z1 + 3.6); S.add(fm);
    this.plants = natureBatch({ max: 200, castShadow: true });
    S.add(this.plants.mesh);
    const nb = this.plants;
    for (let i = 0; i < 40; i++) {
      const x = -24 + i * 1.25 + Math.sin(i * 7.3) * 0.4;
      const name = ['susuki', 'tallgrass_0', 'tuft_1', 'bush_0', 'susuki', 'fern_1', 'tuft_2', 'azalea'][i % 8];
      nb.push(name, x, -1.25, PLAT.z1 + 3.9 + (i % 3) * 0.25, { sway: 0.5 });
    }
    nb.push('sakura_0', -9, -1.25, PLAT.z1 + 5.2, { sway: 0.25 });
    nb.push('camphor_1', 7, -1.25, PLAT.z1 + 5.6, { sway: 0.2 });
    nb.push('sakura_small', 16, -1.25, PLAT.z1 + 5.0, { sway: 0.3 });
    nb.commit();
    // ---- roof frame: columns along the centre line, beams, hanging tubes
    const cz = 3.3;
    for (let x = -15; x <= 15; x += 6) {
      const c = column({ h: 66 }); c.position.set(x, 0, cz); S.add(c);
    }
    const beam = new VoxelModel();
    for (let x = -360; x < 360; x++) for (let y = 0; y < 4; y++) for (let z = -2; z <= 1; z++) beam.set(x, y, z, y === 0 ? 0xc8c2b0 : 0xe8e2d0);
    for (let x = -300; x <= 300; x += 120) for (let z = -60; z <= 72; z++) for (let y = 0; y < 3; y++) beam.set(x, y, z, 0xd8d2c0);
    const bm = vm(beam, V5); bm.position.set(0, 3.36, cz); S.add(bm);
    // fluorescent tubes hanging under the beam (glow, a dying one flickers)
    this.onU = { value: 1 };
    for (let x = -14; x <= 14; x += 3.5) {
      const tube = new VoxelModel();
      for (let i = 0; i < 24; i++) tube.set(i, 0, 0, 0xfffaf0);
      const t = glowVm(tube, V5, [12, 0, 0.5], { intensity: 1.15, mode: Math.abs(x - 3.5) < 0.1 ? 2 : 1, onU: this.onU });
      t.position.set(x, 3.15, cz + 0.4); S.add(t);
      const wire = new VoxelModel(); for (let y = 0; y < 4; y++) { wire.set(0, y, 0, 0x5a5a62); wire.set(20, y, 0, 0x5a5a62); }
      const wm = vm(wire, V5, [10, 0, 0], { cast: false }); wm.position.set(x, 3.2, cz + 0.4); S.add(wm);
    }
    // ---- signs: station name boards, exits, clock
    for (const x of [-8, 4]) {
      const sb = signPlane(stationBoard(), 2.0); sb.position.set(x, 2.55, cz + 0.12); S.add(sb);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.84, 0.06), new THREE.MeshLambertMaterial({ color: 0x5a5a62 }));
      back.position.set(x, 2.55, cz + 0.08); back.castShadow = true; S.add(back);
      const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), new THREE.MeshLambertMaterial({ color: 0x5a5a62 }));
      for (const dx of [-0.8, 0.8]) { const h = h1.clone(); h.position.set(x + dx, 3.15, cz + 0.08); S.add(h); }
    }
    const ex = signPlane(exitSign({ dir: 1 }), 1.5, { emissive: 0.5, onU: this.onU }); ex.position.set(9.5, 2.8, cz + 0.12); S.add(ex);
    const ex2 = signPlane(exitSign({ ja: 'のりかえ', en: 'Transfer', sub: '在来線 Local lines', dir: 1 }), 1.5, { emissive: 0.5, onU: this.onU }); ex2.position.set(-14, 2.8, cz + 0.12); S.add(ex2);
    const clk = hangingClock(); clk.position.set(-2, 2.5, cz + 0.2); S.add(clk);
    // car-position plates on the floor near the edge
    for (const [x, n] of [[-12, 6], [-3, 7], [6, 8]]) {
      const np = signPlane(numberPlate(n), 0.32); np.rotation.x = -Math.PI / 2; np.position.set(x, 0.012, 1.4); S.add(np);
    }
    // ---- facilities on the centre line (all face +z, the camera side)
    const km = kiosk({ onU: this.onU }); km.position.set(-1.5, 0, 3.0 + 0.6); S.add(km);
    const vend = [[3.0, 'Pocori', 0x2a7ad8, 1], [4.0, 'KIRIN-ish', 0xe8443a, 2], [5.0, 'Boss Coffee', 0x2a2a34, 3]];
    for (const [x, brand, col, seed] of vend) { const vmach = vendingMachine({ brand, color: col, seed, onU: this.onU }); vmach.position.set(x, 0, 3.05); S.add(vmach); }
    const bn = bins(); bn.position.set(6.2, 0, 3.15); S.add(bn);
    for (const x of [-11, -6.5, 8]) { const b = bench({ color: 0x3a9a8a }); b.position.set(x, 0, 3.5); S.add(b); }
    // posters on the kiosk side + a notice board
    for (const [i, kind] of [[0, 'travel'], [1, 'manners'], [2, 'festival']]) {
      const pp = signPlane(poster(kind, i), 0.56); pp.position.set(-9.2 + i * 0.65, 1.2, cz - 0.15); S.add(pp);
    }
    const nbV = new VoxelModel(); fill(nbV, -22, 21, 0, 24, 0, 1, (x, y) => (y === 0 || y === 24 || x === -22 || x === 21 ? 0x5a5a62 : 0x8a7a68));
    const nbm = vm(nbV, V5); nbm.position.set(-8.55, 0.65, cz - 0.25); S.add(nbm);
    // ---- the stairs down (east end): a stairwell box with railings + glowing exit sign
    S.add(this.stairwell());
    // ---- the train (3 cars, nose first at the east)
    this.train = new THREE.Group();
    const c1 = shinkansenCar({ nose: true, number: 8, onU: this.onU });
    const c2 = shinkansenCar({ number: 7, panto: true, onU: this.onU });
    const c3 = shinkansenCar({ number: 6, onU: this.onU });
    c1.position.x = 5.5; c2.position.x = 5.5 - CAR_LEN - 0.3; c3.position.x = 5.5 - 2 * CAR_LEN - 0.6;
    this.cars = [c1, c2, c3];
    this.train.add(c1, c2, c3);
    this.train.position.z = TRAIN_Z;
    S.add(this.train);
    // door centres in world x (when the train is stopped)
    this.doorXs = this.cars.flatMap((c) => c.userData.doors.map((d) => d + c.position.x)).sort((a, b) => a - b);
    // ---- grandpa's welcome sign (a prop he holds up)
    const ws = welcomeSign();
    this.signMesh = signPlane(ws, 0.62, { double: true });
    // nav: the whole platform minus the facilities
    const nav = this.makeNav('plat', { minX: PLAT.x0 + 0.5, minZ: 0.4, w: L - 1, d: D - 0.8 });
    for (const [x0, x1] of [[-3.1, 0.1], [2.5, 6.6]]) nav.block(x0, 2.6, x1, 3.75);
    nav.block(PLAT.stairsX - 2, 4.15, PLAT.stairsX + 2.1, 4.3); nav.block(PLAT.stairsX - 2, 5.65, PLAT.stairsX + 2.1, 5.8);
    for (let x = -15; x <= 15; x += 6) nav.blockCircle(x, 3.3, 0.2);
    this.navs.plat = nav;
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
    const x0 = 0, x1 = 80, z0 = 0, z1 = 30; // 4 m x 1.5 m opening (V5)
    // low walls with glass panels along the sides and back, opening faces -x
    for (let x = x0; x <= x1; x++) for (let y = 0; y < 22; y++) {
      const glass = y > 4 && y < 20;
      for (const z of [z0, z1]) v.set(x, y, z, glass ? null : y === 21 ? 0xb8bcc4 : 0xd8d4ca);
    }
    for (let z = z0; z <= z1; z++) for (let y = 0; y < 22; y++) v.set(x1, y, z, y === 21 ? 0xb8bcc4 : 0xd8d4ca);
    // the steps going down (dark, receding)
    for (let i = 0; i < 16; i++) for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 4 + i * 4; x < x0 + 8 + i * 4 && x < x1; x++) v.set(x, -1 - i * 2, z, i % 2 ? 0x8a867e : 0x9a968c);
    // handrails
    for (let x = x0; x <= x1; x++) { v.set(x, 18, z0 + 1, 0xc8a050); v.set(x, 18, z1 - 1, 0xc8a050); }
    const m = vm(v, V5);
    m.position.set(PLAT.stairsX - 2, 0, 4.2);
    g.add(m);
    // glass panels (transparent planes)
    const gm = new THREE.MeshBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.25, depthWrite: false });
    for (const z of [4.2, 4.2 + 1.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.75), gm); p.position.set(PLAT.stairsX, 0.6, z + 0.025); g.add(p); }
    const ex = signPlane(exitSign({ dir: 0, sub: '改札 Ticket gates' }), 1.2, { emissive: 0.5, onU: this.onU });
    ex.position.set(PLAT.stairsX - 1.6, 1.45, 4.2 + 1.5 + 0.06); g.add(ex);
    return g;
  }
  async enter(opts = {}) {
    const g = this.game;
    g.rig.setFollow(null);
    const c = this.camCfg;
    g.rig.play({ x: 0, y: 0.8, z: 3, wupp: c.wupp, pitch: c.pitch, yaw: c.yaw, dur: 0 });
    this.setTrain(opts.trainX ?? 0);
  }
  setTrain(x) { this.trainX = x; this.train.position.x = x; }
  openDoors(k) { for (const c of this.cars) c.userData.openDoors(k); }
  update(dt, t) {
    this.onU.value = 1;
  }
}
