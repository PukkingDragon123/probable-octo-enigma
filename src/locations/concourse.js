// Kodama-machi Station, the concourse under the platforms, seen side-on like
// a long stage set: the stairs down from platforms 13-14 at the west end; the
// ekiben shop with its glass case of bento and paper lanterns; the omiyage
// shop stacked with mascot boxes; the kiosk, lockers and vending machines;
// the departure board and the big clock; the ticket gates with their flaps;
// and past them the glass doors onto the evening street — where Grandpa waits.
// Late sun pours in through the high windows in dusty beams.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { VoxelModel, vm, glowVm, signPlane, fill, tone, sh, hash3, rbox, V5, V25 } from '../world/build.js';
import { PixCanvas, makeTexture, mix, darken, lighten } from '../core/pixtex.js';
import { litMat, emitMat } from '../core/materials.js';
import { vendingMachine, bench, bins, hangingClock, kiosk } from '../world/props.js';
import { departureBoard, stationColumn } from '../world/station.js';
import { exitSign, poster, welcomeSign } from '../world/signs.js';
import { fasciaSign, noren, menuBoard, verticalSign, valance } from '../world/shopSigns.js';
import { ProductBatch, omiyage, bentoLid, snack, drink, mascot, OMIYAGE, BENTOS, SNACKS, DRINKS } from '../world/products.js';
import { Crowd } from '../world/crowd.js';
import { FONT } from '../ui/fonts.js';

export const CON = { x0: -19, x1: 19, zBack: -4.4, zFront: 3.6, gateX: 7.6, doorX: 18.2, stairX: -13.2 };

// ---------------------------------------------------------------- textures
function floorTex() {
  // polished granite tiles, 0.6 m, with a darker border lane and soft light reflections
  const W = 256, H = 256, p = new PixCanvas(W, H, 41);
  const T = 32; // 0.5 m at 64 texels/m
  for (let ty = 0; ty < H; ty += T) for (let tx = 0; tx < W; tx += T) {
    const k = ((tx / T) + (ty / T)) % 2;
    const base = k ? '#d6cfc2' : '#c8c0b2';
    p.rect(tx, ty, T, T, base);
    for (let i = 0; i < 40; i++) p.px(tx + p.rnd() * T, ty + p.rnd() * T, p.rnd() < 0.5 ? darken(base, 0.08) : lighten(base, 0.1));
    for (let i = 0; i < 3; i++) { const sx = tx + p.rnd() * T, sy = ty + p.rnd() * T; p.line(sx, sy, sx + 3 + p.rnd() * 5, sy + 1 + p.rnd() * 3, darken(base, 0.12)); }
  }
  for (let x = 0; x < W; x += T) p.vline(x, 0, H - 1, '#a8a092');
  for (let y = 0; y < H; y += T) p.hline(0, W - 1, y, '#a8a092');
  // glossy streaks where the ceiling lights reflect
  for (let x = 0; x < W; x += 64) for (let y = 0; y < H; y++) if ((y % 32) < 22) { p.px(x + 30, y, 'rgba(255,255,255,0.18)'); p.px(x + 31, y, 'rgba(255,255,255,0.1)'); }
  return p;
}
function wallTex() {
  // cream enamel panels with seams, a dado of dark tiles, a stainless kick plate
  const W = 128, H = 320, p = new PixCanvas(W, H, 42);
  p.noiseFill(['#ece4d2', '#f2ead8', '#e6dcc8'], { scale: 0.1 });
  for (let x = 0; x < W; x += 64) p.vline(x, 0, H - 1, '#cfc4ae');
  for (let y = 0; y < H; y += 80) p.hline(0, W - 1, y, '#d8ccb6');
  p.rect(0, H - 70, W, 50, '#4a5a6a');
  for (let y = H - 70; y < H - 20; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < W; x += 10) p.frame(x, y, 10, 10, '#3e4c5a');
  p.rect(0, H - 20, W, 20, '#9aa0a8'); p.hline(0, W - 1, H - 20, '#c8ccd4');
  p.rect(0, H - 74, W, 4, '#2e8a7a');
  return p;
}
function outsideTex() {
  // through the glass doors: the station plaza at dusk, the Kodama Ginza arcade gate, lanterns
  const W = 220, H = 180, p = new PixCanvas(W, H, 43);
  for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#5a5aa8', '#ffb48a', Math.min(1, y / 110)));
  for (let i = 0; i < 6; i++) p.ellipse(20 + i * 40, 18 + (i % 3) * 8, 18, 4, '#ffc8b0');
  // rooftops and the gate
  for (let x = 0; x < W; x += 26) { const h = 50 + (x * 7) % 30; p.rect(x, H - 40 - h, 24, h, '#4a3a5a'); for (let k = 0; k < 4; k++) p.rect(x + 4 + (k % 2) * 10, H - 30 - h + Math.floor(k / 2) * 14, 5, 6, '#ffd890'); }
  p.rect(60, 60, 110, 22, '#c83a32'); p.rect(62, 62, 106, 18, '#e84a3a');
  p.text('こだま銀座', 115, 63, { font: `14px ${FONT.bold}`, color: '#fff4d8', align: 'center' });
  p.rect(66, 82, 6, 58, '#3a2a2a'); p.rect(158, 82, 6, 58, '#3a2a2a');
  for (let k = 0; k < 7; k++) { p.ellipse(78 + k * 12, 92, 4, 5, '#ff6a3a'); p.ellipse(78 + k * 12, 91, 2, 3, '#ffd08a'); }
  p.rect(0, H - 40, W, 40, '#6a5a6a'); for (let x = 0; x < W; x += 12) p.rect(x, H - 22, 6, 2, '#f4f0e8');
  for (let i = 0; i < 9; i++) { const x = 10 + i * 24, y = H - 46; p.rect(x, y - 14, 6, 12, ['#3a4a6a', '#6a3a4a', '#4a6a5a'][i % 3]); p.circle(x + 3, y - 18, 3, '#d8b090'); }
  return p;
}
// ticket-gate top panel: the IC reader and the little screen
function gateTop(seed) {
  const p = new PixCanvas(20, 12, 60 + seed);
  p.rect(0, 0, 20, 12, '#2a3448'); p.rect(1, 1, 18, 10, '#3a4a64');
  p.rect(2, 2, 8, 8, '#1a6ad8'); p.rect(3, 3, 6, 6, '#4aa8ff'); p.px(5, 5, '#ffffff'); p.px(6, 5, '#ffffff');
  p.rect(12, 3, 6, 4, '#0a1a12'); p.text('IC', 15, 2, { font: `7px ${FONT.tiny}`, color: '#4aff8a', align: 'center' });
  return p;
}
function mapBoard() {
  // the town map by the exit: river, the shotengai, Kodamaya marked with a star
  const W = 72, H = 52, p = new PixCanvas(W, H, 44);
  p.rect(0, 0, W, H, '#2e5a8a'); p.rect(2, 2, W - 4, H - 4, '#f4f0dc');
  p.text('木霊町 まちあるき', W / 2, 3, { font: `7px ${FONT.small}`, color: '#2e5a8a', align: 'center' });
  p.rect(4, 12, W - 8, H - 16, '#d8e8c8');
  p.poly([[4, 40], [30, 30], [W - 4, 44], [W - 4, 48], [4, 48]], '#8ac0e8');
  p.rect(10, 20, 50, 4, '#e8a050'); p.text('銀座', 35, 14, { font: `6px ${FONT.tiny}`, color: '#8a4a1a', align: 'center' });
  p.rect(6, 16, 8, 8, '#2e5a8a'); p.text('駅', 10, 16, { font: `6px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  p.poly([[54, 18], [56, 22], [60, 22], [57, 25], [58, 29], [54, 27], [50, 29], [51, 25], [48, 22], [52, 22]], '#e84a3a');
  for (let k = 0; k < 5; k++) p.circle(14 + k * 9, 33, 2, '#5a9a4a');
  p.rect(40, 26, 4, 6, '#c83a32');
  mascot(p, 'tanuki', W - 10, 14, 5);
  return p;
}
function townMascotBanner() {
  // "Welcome to Kodama-machi" with the town mascot, Kodama-chan, a little tree spirit
  const W = 160, H = 46, p = new PixCanvas(W, H, 45);
  p.rect(0, 0, W, H, '#ffffff'); p.rect(2, 2, W - 4, H - 4, '#fff4dc');
  for (let x = 2; x < W - 2; x += 6) p.rect(x, 2, 3, 3, '#7ac050');
  p.circle(24, 26, 15, '#5aa84a'); p.circle(24, 26, 13, '#7ac868');
  p.circle(18, 18, 6, '#9ad870'); p.circle(30, 17, 5, '#9ad870');
  p.ellipse(24, 30, 9, 8, '#fff6e6'); p.rect(20, 29, 2, 3, '#2a2420'); p.rect(27, 29, 2, 3, '#2a2420'); p.px(20, 29, '#ffffff'); p.px(27, 29, '#ffffff');
  p.rect(17, 33, 3, 1, '#ff8a9a'); p.rect(28, 33, 3, 1, '#ff8a9a'); p.rect(23, 34, 3, 1, '#4a2a2a');
  p.rect(23, 6, 2, 6, '#8a5a3a'); p.ellipse(27, 7, 4, 2, '#7ac050');
  p.text('ようこそ 木霊町へ', 96, 6, { font: `14px ${FONT.pop}`, color: '#3a6a2a', align: 'center' });
  p.text('Welcome to Kodama-machi', 96, 26, { font: `9px ${FONT.ui}`, color: '#8a5a3a', align: 'center' });
  p.text('こだまちゃん', 24, 4, { font: `6px ${FONT.tiny}`, color: '#3a6a2a', align: 'center' });
  return p;
}

// ---------------------------------------------------------------- voxel pieces
function stairs() {
  // a broad staircase down from the platforms: 16 steps, rubber nosings, handrails, the side wall
  const v = new VoxelModel();
  const steps = 16, tread = 6, rise = 4; // voxels (0.3 m tread, 0.2 m rise)
  for (let s = 0; s < steps; s++) {
    const x0 = -s * tread - tread, top = (s + 1) * rise;
    for (let x = x0; x < x0 + tread; x++) for (let y = 0; y < top; y++) for (let z = -54; z <= -6; z++) {
      const edge = y === top - 1 && x === x0 + tread - 1;
      v.set(x, y, z, edge ? 0xf0c430 : y === top - 1 ? 0xb8b2a6 : 0x9a948a);
    }
  }
  // the side wall on the near side (low, so the stairs stay visible) and handrails
  const L = steps * tread;
  for (let x = -L; x <= 0; x++) {
    const h = Math.round((-x / tread) * rise) + 18;
    for (let y = 0; y < Math.min(h, 72); y++) v.set(x, y, -5, y > h - 3 ? 0xd8d2c4 : tone(x, y, 0, 0xc8c0b0, 0xb8b0a0, 0xd4ccbc, 0.06, 0.05));
    const ry = Math.round((-x / tread) * rise) + 18;
    v.set(x, ry, -7, 0xa8b0b8); v.set(x, ry, -30, 0xa8b0b8); v.set(x, ry, -53, 0xa8b0b8);
    if (x % 18 === 0) for (let y = ry - 16; y < ry; y++) { v.set(x, y, -30, 0x8a9098); }
  }
  // the landing up top (the upper floor edge, platforms beyond)
  for (let x = -L - 30; x < -L; x++) for (let z = -54; z <= -5; z++) { v.set(x, steps * rise - 1, z, 0xb8b2a6); v.set(x, steps * rise - 2, z, 0x9a948a); }
  return vm(v, V5);
}
function ticketGate(seed) {
  // one gate cabinet (0.05 m voxels), long along x; flaps are separate meshes
  const v = new VoxelModel();
  const body = 0xe8eaee, bodyD = 0xc8ccd4, panel = 0x2e8a7a;
  fill(v, -14, 13, 0, 19, -2, 1, (x, y, z) => (y === 19 ? 0xd0d4dc : y < 2 ? 0x6a7078 : z === 1 && y > 6 && y < 14 ? panel : tone(x, y, z, body, bodyD, 0xf4f6f8, 0.04, 0.05)));
  // arrows / no-entry lamps on the ends
  v.set(-14, 16, 2, 0x4aff7a); v.set(13, 16, 2, 0xff4a4a);
  const g = new THREE.Group();
  g.add(vm(v, V5));
  const top = signPlane(gateTop(seed), 0.42, { emissive: 0.8 });
  top.rotation.x = -Math.PI / 2 + 0.25; top.position.set(-0.3, 20 * V5 + 0.02, 0.0);
  g.add(top);
  // the yellow flaps (open = swung back flat)
  const fv = new VoxelModel(); fill(fv, 0, 5, 0, 7, 0, 0, (x, y) => (y === 7 || x === 5 ? 0xd8a020 : 0xf0c030));
  const flaps = [];
  for (const s of [-1, 1]) {
    const f = vm(fv, V5, [0, 0, 0.5]);
    const piv = new THREE.Group(); piv.position.set(0.15, 0.42, s * 0.12); piv.add(f); f.position.set(0, 0, 0); f.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(piv); flaps.push(piv);
  }
  g.userData.flaps = flaps;
  return g;
}
function lockers() {
  const v = new VoxelModel();
  fill(v, -20, 19, 0, 39, -8, 0, (x, y, z) => {
    if (z < 0) return 0x9aa0a8;
    const col = Math.floor((x + 20) / 8), row = Math.floor(y / 10);
    const ex = (x + 20) % 8 === 0 || y % 10 === 0;
    if (ex) return 0x6a7078;
    const c = [0x3a8ad8, 0x4ab0a0, 0xe8a83a, 0xd8584a][(col + row) % 4];
    if ((x + 20) % 8 === 6 && y % 10 === 5) return 0xd8dce0; // lock
    return y % 10 === 8 ? sh(c, 1.15) : c;
  });
  return vm(v, V5);
}
// the ekiben shop counter + glass case, the omiyage shelves (frames only; products are batched)
function shopFrame(w, kind) {
  const v = new VoxelModel();
  const n = Math.round(w / V5 / 2);
  const wood = 0x8a5a36, woodD = 0x6a4228, woodL = 0xa8723e;
  if (kind === 'counter') {
    fill(v, -n, n - 1, 0, 17, -10, 0, (x, y, z) => (y === 17 ? woodL : z === 0 && y % 6 === 0 ? woodD : tone(x, y, z, wood, woodD, woodL, 0.08, 0.06)));
    // the glass case on top: steel edges, a light strip
    for (let x = -n; x < n; x++) { v.set(x, 18, -9, 0xb8bcc4); v.set(x, 27, -9, 0xb8bcc4); v.set(x, 27, -1, 0xb8bcc4); v.set(x, 18, -1, 0xb8bcc4); }
    for (const x of [-n, n - 1]) for (let y = 18; y <= 27; y++) { v.set(x, y, -9, 0xb8bcc4); v.set(x, y, -1, 0xb8bcc4); }
    for (let x = -n + 1; x < n - 1; x++) for (let z = -8; z <= -2; z++) v.set(x, 18, z, 0xf4f0e6);
  } else {
    // tall shelving: 4 levels
    fill(v, -n, n - 1, 0, 44, -12, -11, woodD);
    for (const x of [-n, n - 1]) fill(v, x, x, 0, 44, -12, -1, wood);
    for (let lv = 0; lv < 4; lv++) fill(v, -n, n - 1, 2 + lv * 11, 2 + lv * 11, -11, -1, (x, y, z) => (z === -1 ? woodL : wood));
    fill(v, -n, n - 1, 45, 46, -12, -1, woodD);
  }
  return vm(v, V5);
}

export class ConcourseLocation extends Location {
  constructor(game) {
    super(game, 'concourse', { bg: 0x2a2030, lightMode: 'interior', grade: 'human', music: undefined, ambience: 'station' });
    this.camCfg = { wupp: 0.0098, pitch: 14, yaw: 0, lockZ: 0.6, followY: 1.25, bounds: { minX: CON.x0 + 4.5, maxX: CON.x1 - 4.5, minZ: -2, maxZ: 3 } };
    this.shadowSize = 14;
    this.clock = false;
    this.hourOverride = 17.4;
    this.lightOverride = { elev: 0.45, sunI: 1.9, sun: 0xffe2b4, hemiI: 1.2, sky: 0xf4f0f0, gnd: 0x8a8080 };
  }
  async build() {
    const S = this.scene;
    const L = CON.x1 - CON.x0, D = CON.zFront - CON.zBack;
    this.updaters = [];
    // ---- floor, back wall, ceiling edge
    const ft = makeTexture(floorTex().c, { repeat: true, mips: false }); ft.repeat.set(L / 4, D / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, D), litMat({ map: ft, vertexColors: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (CON.zBack + CON.zFront) / 2); floor.receiveShadow = true; S.add(floor);
    const wt = makeTexture(wallTex().c, { repeat: true, mips: false }); wt.repeat.set(L / 2, 1);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, 5), litMat({ map: wt, vertexColors: false }));
    wall.position.set(0, 2.5, CON.zBack); wall.receiveShadow = true; S.add(wall);
    // high windows in the back wall: the low sun pours through them
    const winM = emitMat({ color: 0xffe4b8, intensity: 1.5 });
    for (let x = -14; x <= 14; x += 4) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), winM); w.position.set(x, 4.25, CON.zBack + 0.01); S.add(w);
      for (const dx of [-0.65, 0, 0.65]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), new THREE.MeshLambertMaterial({ color: 0x5a6070 })); m.position.set(x + dx, 4.25, CON.zBack + 0.04); S.add(m); }
    }
    // ceiling beams (cut-away) with hanging lights
    const beamM = new THREE.MeshLambertMaterial({ color: 0x8a96aa });
    for (let x = CON.x0; x <= CON.x1; x += 3.8) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, D), beamM); b.position.set(x, 4.95, (CON.zBack + CON.zFront) / 2 - 0.4); b.castShadow = true; S.add(b); }
    const lb = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 0.3), beamM); lb.position.set(0, 4.85, -0.6); S.add(lb);
    const lampM = emitMat({ color: 0xfff6e4, intensity: 1.25 });
    for (let x = CON.x0 + 2; x <= CON.x1 - 2; x += 3.2) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.12), lampM); t.position.set(x, 4.2, -0.6); S.add(t); const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), beamM); c.position.set(x, 4.52, -0.6); S.add(c); }
    // dusty sunbeams from the high windows
    this.beamU = { time: { value: 0 } };
    for (let x = -14; x <= 14; x += 4) S.add(this.sunbeam(x));
    // ---- stairs down from the platforms (west)
    const st = stairs(); st.position.set(CON.stairX, 0, 0); S.add(st);
    const pl = signPlane(fasciaSign({ ja: '13・14番線', en: 'Platforms 13・14  Shinkansen', w: 150, h: 30, bg: '#1e3a6a', fg: '#ffffff', accent: '#2e8a7a', style: 'lightbox', seed: 81 }), 2.2, { emissive: 0.8 });
    pl.position.set(CON.stairX - 1.6, 3.95, -1.0); S.add(pl);
    // ---- the ekiben shop
    this.buildEkiben(-9.6);
    // ---- the omiyage shop
    this.buildOmiyage(-3.8);
    // ---- kiosk, lockers, vending machines, bins
    const km = kiosk(); km.position.set(1.2, 0, CON.zBack + 1.0); S.add(km); this.kiosk = km;
    const lk = lockers(); lk.position.set(4.0, 0, CON.zBack + 0.42); S.add(lk);
    const vend = [[5.6, 'Pocori', 0x2a7ad8, 1], [6.5, 'Boss Coffee', 0x2a2a34, 3]];
    for (const [x, brand, col, seed] of vend) { const v = vendingMachine({ brand, color: col, seed }); v.position.set(x, 0, CON.zBack + 0.4); S.add(v); }
    const bn = bins(); bn.position.set(2.7, 0, CON.zBack + 0.32); S.add(bn);
    // ---- columns with ads, the departure board, the big clock, the welcome banner
    const ads = ['onsen', 'gacha', 'bento', 'travel'];
    [-12.2, -6.4, 0.2, 9.8, 15.4].forEach((x, i) => { const c = stationColumn({ h: 96, ad: ads[i % 4], seed: i }); c.position.set(x, 0, -1.2); S.add(c); });
    const dep = departureBoard({ rows: [['こだま', '742', '16:42', '木霊町', '14'], ['こだま', '746', '17:12', '静岡', '13'], ['ひかり', '651', '17:20', '新大阪', '12']] });
    dep.position.set(-0.6, 3.35, -1.0); S.add(dep); this.updaters.push(dep.userData.update);
    const clk = hangingClock(); clk.scale.setScalar(1.6); clk.position.set(6.2, 3.2, -1.0); S.add(clk);
    const ban = signPlane(townMascotBanner(), 3.2); ban.position.set(12.0, 3.85, CON.zBack + 0.02); S.add(ban);
    // hanging exit signs
    const ex1 = signPlane(exitSign({ ja: '東口', en: 'East Exit', sub: '木霊銀座・バスのりば', dir: 1, w: 112 }), 1.9, { emissive: 0.6 });
    ex1.position.set(3.4, 3.7, -0.9); S.add(ex1);
    const ex2 = signPlane(exitSign({ ja: '改札', en: 'Ticket Gates', sub: '', dir: 1, w: 96 }), 1.5, { emissive: 0.6 });
    ex2.position.set(-6.8, 3.7, -0.9); S.add(ex2);
    // ---- the ticket gates (a row of cabinets across the hall) and the station office
    this.gates = [];
    for (let k = 0; k < 5; k++) {
      const gt = ticketGate(k); gt.position.set(CON.gateX, 0, -3.3 + k * 1.15); S.add(gt); this.gates.push(gt);
    }
    const office = new VoxelModel();
    fill(office, -24, 23, 0, 56, -6, 0, (x, y, z) => (y > 18 && y < 44 && z === 0 && x > -20 && x < 20 ? (y % 12 === 0 || x % 13 === 0 ? 0x5a6070 : 0x9ac0d0) : y === 56 ? 0x2e8a7a : tone(x, y, z, 0xe0d8c8, 0xd0c8b8, 0xece4d4, 0.04, 0.04)));
    const om = vm(office, V5); om.position.set(CON.gateX - 1.8, 0, CON.zBack + 0.32); S.add(om);
    const midori = signPlane(fasciaSign({ ja: 'みどりの窓口', en: 'Ticket Office', w: 120, h: 24, bg: '#2a8a4a', fg: '#ffffff', style: 'lightbox', seed: 82, size: 13 }), 1.8, { emissive: 0.7 });
    midori.position.set(CON.gateX - 1.8, 3.0, CON.zBack + 0.66); S.add(midori);
    // ---- the exit: glass doors onto the evening street, a map, benches, plants
    const out = signPlane(outsideTex(), 5.2, { emissive: 0.85, lit: false });
    out.position.set(CON.doorX + 0.3, 2.0, -0.6); out.rotation.y = -Math.PI / 2; S.add(out);
    const dv = new VoxelModel();
    for (let z = -88; z <= 72; z++) for (let y = 0; y <= 80; y++) { const frame = z % 40 === 0 || y === 0 || y === 80 || y === 52; if (frame) dv.set(0, y, z, 0x5a6070); }
    const doors = vm(dv, V5); doors.position.set(CON.doorX, 0, 0); S.add(doors);
    const map = signPlane(mapBoard(), 1.3); map.position.set(14.2, 1.4, CON.zBack + 0.05); S.add(map);
    const mapPost = new VoxelModel(); fill(mapPost, -14, 13, 0, 2, -1, 0, 0x5a6070); const mp = vm(mapPost, V5); mp.position.set(14.2, 0, CON.zBack + 0.05); S.add(mp);
    this.benches = [];
    for (const x of [11.0, 16.2]) { const b = bench({ color: 0x8a5a3a }); b.position.set(x, 0, CON.zBack + 0.5); S.add(b); this.benches.push(b); }
    // ---- the crowd
    this.crowd = new Crowd(this.game, this);
    this.signMesh = signPlane(welcomeSign(), 0.62, { double: true });
    const nav = this.makeNav('hall', { minX: CON.x0 + 5.5, minZ: -3.6, w: L - 6.5, d: 7.0 });
    nav.block(CON.x0, -4.4, -10.8, -2.5); // shop counters
    nav.block(-11.8, -4.4, 6.9, -3.0);
    for (let k = 0; k < 5; k++) nav.block(CON.gateX - 0.75, -3.4 + k * 1.15, CON.gateX + 0.75, -3.2 + k * 1.15);
    this.navs.hall = nav;
    this.populate();
  }
  sunbeam(x) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float time; varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float k = pow(vUv.y, 1.4) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * 0.16;
          vec2 g = floor(vec2(vUv.x * 40.0, vUv.y * 120.0 - time * 2.0));
          float mote = step(0.994, hash(g)) * vUv.y * 0.5;
          gl_FragColor = vec4(vec3(1.0, 0.8, 0.55) * (k + mote), 1.0);
        }`,
      uniforms: { time: this.beamU.time }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const g = new THREE.BufferGeometry();
    const w = 2.4, top = 4.6, bot = 0.02;
    g.setAttribute('position', new THREE.Float32BufferAttribute([x - w / 2, top, CON.zBack + 0.05, x + w / 2, top, CON.zBack + 0.05, x - w / 2 + 2.2, bot, 2.4, x + w / 2 + 2.2, bot, 2.4], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 6;
    return m;
  }
  buildEkiben(cx) {
    const S = this.scene;
    const ctr = shopFrame(3.6, 'counter'); ctr.position.set(cx, 0, CON.zBack + 1.55); S.add(ctr);
    // the back wall: shelves of stacked bento towers, the fascia, noren, lanterns, a menu
    const fas = signPlane(fasciaSign({ ja: '駅弁 こだま屋', en: 'EKIBEN · Station Lunch Boxes', w: 200, h: 34, bg: '#2a1e18', fg: '#ffd890', style: 'wood', seed: 83 }), 3.6);
    fas.position.set(cx, 3.05, CON.zBack + 0.03); S.add(fas);
    const nr = signPlane(noren({ text: '駅弁', bg: '#a8302a', fg: '#fff4e0', w: 140, h: 40, panels: 5, seed: 84 }), 3.2, { double: true });
    nr.position.set(cx, 2.42, CON.zBack + 1.05); S.add(nr);
    for (const dx of [-1.95, 1.95]) {
      const lv = new VoxelModel(); rbox(lv, -4, 3, 0, 11, -4, 3, 3, (x, y) => (y === 0 || y === 11 ? 0x2a1e18 : y % 3 === 0 ? 0xc8302a : 0xe84a3a));
      const lm = glowVm(lv, V25, [0.5, 0, 0.5], { intensity: 1.1, mode: 3 }); lm.position.set(cx + dx, 2.1, CON.zBack + 1.2); S.add(lm);
    }
    const menu = signPlane(menuBoard({ title: 'おしながき', lines: ['富士の朝 ¥1,280', 'こだま弁当 ¥1,100', 'からあげ ¥980', 'さけ弁当 ¥1,050', 'うなぎ飯 ¥1,980', '祝い鯛 ¥1,500'], w: 52, h: 60, seed: 85, doodle: 'cup' }), 0.95);
    menu.position.set(cx + 2.4, 1.55, CON.zBack + 0.05); S.add(menu);
    const B = new ProductBatch();
    // the glass case: lids tilted up toward you
    BENTOS.forEach((k, i) => { const art = bentoLid(k, i); for (let r = 0; r < 2; r++) B.box(art, cx - 1.45 + i * 0.56 + r * 0.06, 0.9 + 0.01, CON.zBack + 1.25 - r * 0.22, { d: 0.05, w: 0.3, h: 0.22 }); });
    // towers of boxes on the back shelf
    for (let i = 0; i < 8; i++) for (let s2 = 0; s2 < 3 + (i % 3); s2++) B.box(bentoLid(BENTOS[(i + s2) % BENTOS.length], i), cx - 1.6 + i * 0.44, 1.05 + s2 * 0.07, CON.zBack + 0.3, { w: 0.34, h: 0.07, d: 0.24, side: [0xc83a32, 0x1e4a9a, 0xff8a2a, 0x2a6ab0][i % 4] });
    const pm = B.build(); S.add(pm);
    this.ekiben = { x: cx };
  }
  buildOmiyage(cx) {
    const S = this.scene;
    const sh2 = shopFrame(4.2, 'shelf'); sh2.position.set(cx, 0, CON.zBack + 0.7); S.add(sh2);
    const fas = signPlane(fasciaSign({ ja: 'おみやげ処', en: 'Souvenirs · Local Specialities', w: 200, h: 34, bg: '#f4ecd8', fg: '#8a2a22', accent: '#d8443a', style: 'board', seed: 86 }), 4.0);
    fas.position.set(cx, 3.05, CON.zBack + 0.03); S.add(fas);
    const val = signPlane(valance({ text: '名物  こだま饅頭  かめサブレ  富士山プリン  静岡茶', w: 260, h: 12, bg: '#d8443a', fg: '#ffffff' }), 4.2, { double: true });
    val.position.set(cx, 2.55, CON.zBack + 0.75); S.add(val);
    const B = new ProductBatch();
    // four levels of boxes in stacks and pyramids, faced toward the aisle
    for (let lv = 0; lv < 4; lv++) {
      const y = (3 + lv * 11) * V5;
      let x = cx - 2.0;
      let i = lv * 3;
      while (x < cx + 1.85) {
        const kind = OMIYAGE[i % OMIYAGE.length];
        const art = omiyage(kind, i);
        const stack = 1 + ((i * 7) % 3);
        for (let s2 = 0; s2 < stack; s2++) B.box(art, x + 0.16, y + s2 * 0.18 * (lv === 3 ? 0.5 : 1), CON.zBack + 0.68 - s2 * 0.02, { w: 0.31, h: 0.2, d: 0.22 });
        x += 0.36; i++;
      }
    }
    // a display table out front with a pyramid of manju boxes and a mascot standee
    const tv = new VoxelModel(); fill(tv, -14, 13, 0, 13, -8, 7, (x, y, z) => (y === 13 ? 0xe8d8b8 : y > 10 ? 0xd8443a : 0x8a5a36));
    const tm = vm(tv, V5); tm.position.set(cx - 0.4, 0, CON.zBack + 1.9); S.add(tm);
    for (let r = 0; r < 3; r++) for (let k = 0; k <= 2 - r; k++) B.box(omiyage(['manju', 'sable', 'pudding'][r]), cx - 0.4 - (2 - r) * 0.17 + k * 0.34, 0.7 + r * 0.2, CON.zBack + 2.2, { w: 0.31, h: 0.2, d: 0.2 });
    const pm = B.build(); S.add(pm);
    // the big tanuki standee
    const st = new PixCanvas(40, 56, 87);
    st.ellipse(20, 40, 15, 15, '#b08050'); st.ellipse(20, 42, 10, 11, '#f4e0bc');
    mascot(st, 'tanuki', 20, 17, 14, { mood: 'open' });
    st.rect(4, 49, 32, 7, '#d8443a'); st.text('ようこそ!', 20, 49, { font: `7px ${FONT.small}`, color: '#ffffff', align: 'center' });
    const sp = signPlane(st, 0.8, { double: true }); sp.position.set(cx + 1.4, 0.56, CON.zBack + 2.0); S.add(sp);
    this.omiyage = { x: cx };
  }
  populate() {
    const C = this.crowd;
    let seed = 300;
    const S = () => (seed += 11);
    // shopkeepers
    C.add({ seed: S(), role: 'shopper' }, { x: -9.6, z: CON.zBack + 0.95, yaw: 0, mode: 'stand' });
    C.add({ seed: S(), role: 'granny' }, { x: -3.0, z: CON.zBack + 1.25, yaw: 0, mode: 'stand' });
    C.add({ seed: 4242, role: 'officeLady' }, { x: 1.2 + this.kiosk.userData.clerk.x, z: CON.zBack + 1.0 + this.kiosk.userData.clerk.z, yaw: 0, mode: 'stand', prop: false });
    // customers browsing
    C.add({ seed: S(), role: 'tourist' }, { x: -10.2, z: -1.9, yaw: Math.PI, mode: 'stand', act: 'phone' });
    C.add({ seed: S(), role: 'salaryman' }, { x: -8.8, z: -2.0, yaw: Math.PI, mode: 'stand' });
    C.add({ seed: S(), role: 'tourist' }, { x: -4.2, z: -1.6, yaw: Math.PI + 0.4, mode: 'stand' });
    C.add({ seed: S(), role: 'student' }, { x: 1.6, z: -2.2, yaw: Math.PI, mode: 'stand' });
    // waiting by the clock, on the benches
    C.group([{ seed: S(), role: 'student' }, { seed: S(), role: 'student' }, { seed: S(), role: 'student' }], { x: 4.6, z: 1.6, r: 0.6, a0: 0.5 });
    this.benches.forEach((b, bi) => b.userData.seats.forEach((st, si) => { if ((bi + si) % 2) return; C.add({ seed: S(), role: ['granny', 'shopper', 'tourist'][(bi + si) % 3] }, { x: b.position.x + st.x, z: b.position.z - 0.02, yaw: 0, mode: 'sit', seatY: st.y, prop: false }); }));
    // station staff by the gates
    C.add({ seed: S(), role: 'salaryman' }, { x: CON.gateX - 1.2, z: 2.8, yaw: -0.6, mode: 'stand' });
    // commuters streaming both ways
    const A = [{ x: -12, z: 0.4 }, { x: 16, z: 0.6 }], Bp = [{ x: 16, z: -0.6 }, { x: -12, z: -0.8 }], Cp = [{ x: -8, z: 2.4 }, { x: 14, z: 2.2 }];
    for (let i = 0; i < 10; i++) {
      const path = [A, Bp, Cp][i % 3];
      C.add({ seed: S(), role: ['salaryman', 'officeLady', 'tourist', 'student', 'shopper'][i % 5] }, { x: -10 + i * 2.5, z: path[0].z, yaw: 1.57, mode: 'walk', path, start: i % 2 });
    }
  }
  // open the flaps of gate k for someone walking through
  async passGate(k) {
    const g = this.gates[k]; if (!g) return;
    this.game.audio?.play?.('phoneTap', { volume: 0.5, pitch: 1.8 });
    const fl = g.userData.flaps;
    await this.game.director.tween((t) => { fl[0].rotation.y = -t * 1.4; fl[1].rotation.y = t * 1.4; }, 0.25);
    await this.game.director.wait(1.2);
    await this.game.director.tween((t) => { fl[0].rotation.y = -(1 - t) * 1.4; fl[1].rotation.y = (1 - t) * 1.4; }, 0.3);
  }
  update(dt, t) {
    this.beamU.time.value = t;
    for (const u of this.updaters) u?.(dt, t);
    this.crowd?.update?.(dt);
  }
}
