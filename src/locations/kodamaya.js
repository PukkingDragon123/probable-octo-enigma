// Kodamaya (木霊屋), inside: Grandpa's gachapon shop, seen as a cut-away
// diorama from the street side (the shutter opening is the open front).
// Two rows of capsule machines (some still under dust sheets), shelves of old
// toys, the counter with the cash register and an empty "Happiness" jar, the
// coin changer, a kamidana high on the wall, the stairs up to Mamo's room and,
// under them, a small old door sealed with a paper charm.
//   L.setDust(k)      0..1 dust overlay, cobwebs, sheets (1 = abandoned)
//   L.setLights(on)   fluorescent tubes flicker on
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { HomeKit, HV, W, bookshelf, clock, plant, crate as hkCrate, lamp, PAL, mix as hmix } from '../world/homeKit.js';
import { VoxelModel, vm, glowVm, signPlane, fill, sh, tone, hash3, ell, rbox, V5, V25 } from '../world/build.js';
import { PixCanvas, mix, darken, lighten, makeTexture } from '../core/pixtex.js';
import { gachaMachine, broom } from '../world/streetProps.js';
import { gachaCard, shopPoster } from '../world/shopSigns.js';
import { manekiNeko } from '../world/shops.js';
import { glassPane } from '../world/station.js';
import { emitMat } from '../core/materials.js';
import { FONT } from '../ui/fonts.js';

export const SHOP = { w: 200, d: 120, h: 68 }; // voxels (10 m x 6 m x 3.4 m)

// ---------------------------------------------------------------- painted bits
function gachaPoster(seed = 1) {
  const p = new PixCanvas(40, 56, 2000 + seed);
  const bg = ['#ffe8a0', '#c8f0ff', '#ffd0e0', '#d8f8c8'][seed % 4];
  p.rect(0, 0, 40, 56, bg);
  p.rect(0, 0, 40, 12, ['#e8443a', '#3a8ad8', '#e85a9a', '#3aa85a'][seed % 4]);
  p.text(['ガチャ!', 'NEW!', 'カプセル', 'あたり'][seed % 4], 20, 1, { font: `9px ${FONT.pop}`, color: '#ffffff', align: 'center' });
  // a big capsule with a mascot peeking out
  p.circle(20, 30, 11, '#2a1828'); p.circle(20, 30, 10, '#fff8ee'); p.ellipse(20, 25, 10, 6, ['#ff6a5a', '#5ab0e8', '#ffd040', '#7ad860'][seed % 4]);
  p.rect(10, 29, 21, 1, '#2a1828');
  p.circle(20, 33, 4, '#f4ece0'); p.px(18, 33, '#2a1828'); p.px(22, 33, '#2a1828');
  p.text('1回 100円', 20, 45, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' });
  p.frame(0, 0, 40, 56, '#5a4a3a');
  p.scatter(0, 0, 40, 56, '#e8dcc0', 0.1);
  return p;
}
function animePoster() { // a retro robot-show poster, sun-faded
  const p = new PixCanvas(44, 60, 2010);
  for (let y = 0; y < 60; y++) p.hline(0, 43, y, mix('#5a8ac8', '#f0a060', y / 60));
  p.rect(14, 18, 16, 20, '#e8e4dc'); p.rect(16, 12, 12, 8, '#e8e4dc'); p.rect(18, 14, 3, 2, '#e8402a'); p.rect(23, 14, 3, 2, '#e8402a');
  p.rect(8, 20, 6, 14, '#c8302a'); p.rect(30, 20, 6, 14, '#c8302a'); p.rect(16, 38, 5, 12, '#3a4a8a'); p.rect(23, 38, 5, 12, '#3a4a8a');
  p.poly([[22, 4], [24, 12], [20, 12]], '#ffe040');
  p.text('ガチャロボ', 22, 51, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center', outline: '#2a1828' });
  p.x.globalAlpha = 0.35; p.rect(0, 0, 44, 60, '#f0e8d8'); p.x.globalAlpha = 1;
  p.frame(0, 0, 44, 60, '#3a2a2a');
  return p;
}
function calendar2019() {
  const p = new PixCanvas(26, 36, 2020);
  p.rect(0, 0, 26, 36, '#fffaf0'); p.rect(0, 0, 26, 9, '#c8302a');
  p.text('2019', 13, 0, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  p.text('8月', 13, 10, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) p.rect(2 + c * 4, 19 + r * 4, 2, 2, c === 0 ? '#e8443a' : '#8a8a94');
  p.ring(15, 24, 2.5, '#e8443a'); // a circled day
  p.scatter(0, 0, 26, 36, '#e8dcc0', 0.12);
  return p;
}
// the family photo: young Genzō, Grandma, and a little boy (Mamo's dad) in front of this shop
function familyPhoto() {
  const p = new PixCanvas(30, 24, 2030);
  p.rect(0, 0, 30, 24, '#e8dcc0');
  p.rect(2, 2, 26, 20, mix('#c8a878', '#e8d8b0', 0.4));
  p.rect(2, 2, 26, 8, '#a88a60'); p.rect(4, 4, 22, 3, '#8a6a48'); // the shopfront behind them
  const fig = (x, col, h, head) => { p.rect(x - 2, 22 - h, 5, h - 4, col); p.circle(x, 22 - h - 1, 2.5, head); };
  fig(9, '#3a4a6a', 13, '#6a8a5a'); fig(21, '#8a4a5a', 12, '#7a9a6a'); fig(15, '#d8a040', 8, '#6a9a5a');
  p.x.globalAlpha = 0.25; p.rect(0, 0, 30, 24, '#f8e8c8'); p.x.globalAlpha = 1; // sepia wash
  p.frame(0, 0, 30, 24, '#5a3a24');
  return p;
}
function ofuda() { // paper charm on the basement door
  const p = new PixCanvas(10, 30, 2040);
  p.rect(0, 0, 10, 30, '#f8f0dc'); p.frame(0, 0, 10, 30, '#c8b890');
  p.rect(2, 2, 6, 4, '#c8302a');
  ['封', '霊', '印'].forEach((c, i) => p.text(c, 5, 8 + i * 7, { font: `7px ${FONT.brush}`, color: '#1a1020', align: 'center' }));
  return p;
}
function dustTex(w, h, seed = 5) { // soft grey-brown drifts, densest along the walls and under things
  const p = new PixCanvas(w, h, 2050 + seed);
  const blob = (cx, cy, r, a) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r * 1.6); x <= cx + r * 1.6; x++) {
      const k = 1 - Math.hypot((x - cx) / (r * 1.6), (y - cy) / r);
      if (k > 0 && p.rnd() < k * a) p.px(x, y, p.rnd() < 0.7 ? 'rgba(122,112,104,0.55)' : 'rgba(150,140,130,0.5)');
    }
  };
  for (let i = 0; i < 70; i++) blob(p.rnd() * w, p.rnd() * h, 3 + p.rnd() * 7, 0.55);
  for (let x = 0; x < w; x += 6) blob(x, 2 + p.rnd() * 4, 5, 0.8); // the back wall line
  for (let y = 0; y < h; y += 6) { blob(2, y, 4, 0.7); blob(w - 3, y, 4, 0.7); }
  return p;
}
function cobweb() {
  const p = new PixCanvas(24, 24, 2060);
  for (let a = 0; a < 5; a++) p.line(0, 0, Math.cos(a * 0.39) * 24, Math.sin(a * 0.39) * 24, 'rgba(230,230,240,0.7)');
  for (let r = 5; r < 24; r += 5) for (let a = 0; a < 4; a++) p.line(Math.cos(a * 0.39) * r, Math.sin(a * 0.39) * r, Math.cos((a + 1) * 0.39) * r, Math.sin((a + 1) * 0.39) * r, 'rgba(230,230,240,0.55)');
  return p;
}

// ---------------------------------------------------------------- voxel props
function counter() {
  const v = new VoxelModel(), gl = new VoxelModel();
  // wooden counter with a glass showcase front (rare capsules inside)
  fill(v, -24, 23, 0, 19, -8, 7, (x, y, z) => (y === 19 ? 0x8a5a32 : y > 17 ? 0x6a4224 : z === 7 && y > 3 && y < 16 && x > -22 && x < 21 ? null : (x + 40) % 6 === 0 ? 0x5a3a22 : 0x7a4e2c));
  for (let x = -21; x <= 20; x += 3) for (const y of [5, 11]) { const c = [0xff6a8a, 0x5ab8f0, 0xf8d040, 0x7ad860, 0xb88af0][(x + y + 40) % 5]; ell(v, x + 0.5, y + 1.5, 4.5, 1.4, 1.4, 1.4, (xx, yy) => (yy > y + 1 ? 0xf8f8f8 : c)); }
  fill(gl, -22, 21, 16, 16, 5, 5, 0xfff0d0);
  // the cash register (old, chunky, mint green) + a little bell + the Happiness jar spot
  fill(v, 8, 19, 20, 27, -6, 2, (x, y, z) => (y > 25 ? 0x9ac8b0 : y === 20 ? 0x5a6a62 : 0x8ab8a0));
  for (let x = 9; x <= 18; x += 2) for (let z = -1; z <= 1; z += 2) v.set(x, 27 + (z > 0 ? 0 : 1), z, 0xf4f0e8);
  fill(v, 10, 17, 28, 31, -5, -4, 0x5a6a62); fill(gl, 11, 16, 29, 30, -3, -3, 0x9af0a0); // display
  fill(v, -18, -16, 20, 21, 0, 2, PAL.brass); v.set(-17, 22, 1, PAL.brass);
  const g = new THREE.Group(); g.add(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 0.9 }));
  return g;
}
// the empty Happiness jar: glass with a cork, a paper label (しあわせ)
export function happinessJar() {
  const v = new VoxelModel();
  for (let y = 0; y < 16; y++) for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
    const r = y < 13 ? 6 : 4; const d = Math.hypot(x, z);
    if (d <= r && (d > r - 1.1 || y === 0)) v.set(x, y, z, y === 0 ? 0xb8d8e0 : 0xd8f0f8);
  }
  for (let y = 16; y < 19; y++) for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (Math.hypot(x, z) <= 3.6) v.set(x, y, z, 0xc8a070);
  const g = new THREE.Group();
  const m = vm(v, V25, [0.5, 0, 0.5]);
  m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.55; m.renderOrder = 6;
  g.add(m);
  const p = new PixCanvas(16, 10, 2070); p.rect(0, 0, 16, 10, '#fff8e8'); p.frame(0, 0, 16, 10, '#c8a070'); p.text('しあわせ', 8, 1, { font: `7px ${FONT.tiny}`, color: '#c8302a', align: 'center' });
  const lab = signPlane(p, 0.22); lab.position.set(0, 0.17, 6.2 * V25); g.add(lab);
  g.userData.capacity = 100; g.userData.fill = 0;
  return g;
}
function coinChanger() {
  const v = new VoxelModel(), gl = new VoxelModel();
  fill(v, -7, 6, 0, 33, -5, 4, (x, y, z) => (y === 33 ? 0xd8dce0 : x === 6 ? 0xa8acb4 : 0xc8ccd4));
  fill(gl, -5, 4, 24, 29, 5, 5, 0x6ad8ff); // display
  fill(v, -4, -1, 16, 19, 5, 5, 0x3a3a40); fill(v, 1, 4, 16, 17, 5, 5, 0x6a6e76); // bill slot, coin slot
  fill(v, -5, 4, 4, 8, 5, 6, 0x5a5e66); // coin tray
  const g = new THREE.Group(); g.add(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.0 }));
  const p = new PixCanvas(26, 10, 2080); p.rect(0, 0, 26, 10, '#3a6ab0'); p.text('両替機', 13, 1, { font: `7px ${FONT.tiny}`, color: '#ffffff', align: 'center' });
  const s = signPlane(p, 0.62); s.position.set(-0.025, 1.58, 0.26); g.add(s);
  return g;
}
// a machine (or a whole row) under a draped dust sheet
function dustSheet(w = 18, h = 38, d = 12) {
  const v = new VoxelModel();
  for (let x = -w / 2 - 1; x <= w / 2; x++) for (let z = -d / 2 - 1; z <= d / 2; z++) for (let y = 0; y <= h; y++) {
    const edge = x === -w / 2 - 1 || x === w / 2 || z === -d / 2 - 1 || z === d / 2;
    const top = y === h;
    if (!edge && !top) continue;
    if (edge && y < 2 + Math.floor(hash3(x, z, 3) * 5)) continue; // ragged hem
    const fold = (x + 40) % 7 === 0 && !top;
    v.set(x, y, z, fold ? 0xd8d4cc : tone(x, y, z, 0xf0ece4, 0xe0dcd4, 0xfaf8f4, 0.15, 0.1));
  }
  return vm(v, V25, [0.5, 0, 0.5]);
}
function stairs() {
  const v = new VoxelModel();
  // steps rising toward the back along the left wall (x 0..24), from z 40 (front) to z -50
  for (let i = 0; i < 16; i++) {
    const z0 = 34 - i * 6, y = (i + 1) * 4;
    fill(v, 0, 23, y - 2, y - 1, z0 - 5, z0, (x, yy) => (yy === y - 1 ? (x % 8 === 0 ? 0x7a4e2c : 0x9a6a3c) : 0x6a4224));
    fill(v, 0, 23, 0, y - 3, z0 - 5, z0 - 5, 0x5a3a22);
  }
  // handrail + balusters on the open side
  for (let i = 0; i < 16; i++) { const z = 34 - i * 6, y = (i + 1) * 4; fill(v, 23, 23, y, y + 16, z - 2, z - 2, 0x5a3a22); }
  for (let z = -56; z <= 34; z++) { const y = Math.round((34 - z) / 6 * 4) + 20; v.set(23, y, z, 0x7a4e2c); v.set(23, y + 1, z, 0x8a5a32); }
  return vm(v, V5);
}
function basementDoor() {
  const v = new VoxelModel(), gl = new VoxelModel();
  fill(v, -9, 8, 0, 33, -1, 0, (x, y) => (x === -9 || x === 8 || y === 33 ? 0x3a2418 : (x + 40) % 4 === 0 ? 0x4a2e1e : 0x5a3a26));
  fill(v, 5, 6, 15, 17, 1, 1, PAL.brass); // knob
  // shimenawa rope above with paper shide
  for (let x = -11; x <= 10; x++) v.set(x, 35 - Math.round(Math.sin(((x + 11) / 21) * Math.PI) * 2), 2, (x + 20) % 2 ? 0xd8c890 : 0xc8b070);
  for (const x of [-6, 0, 6]) { fill(v, x, x + 1, 26, 32, 3, 3, 0xffffff); fill(v, x + 1, x + 2, 24, 27, 3, 3, 0xffffff); }
  // a faint glow leaking from under the door (only noticed later)
  fill(gl, -8, 7, 0, 0, 1, 2, 0x8af0d0);
  const g = new THREE.Group(); g.add(vm(v, V5));
  const glow = glowVm(gl, V5, [0, 0, 0], { intensity: 0.0, mode: 6 }); g.add(glow);
  const o = signPlane(ofuda(), 0.16); o.position.set(-0.05, 1.0, 1 * V5 + 0.006); g.add(o);
  g.userData.glow = glow;
  return g;
}
function kamidana() {
  const v = new VoxelModel();
  fill(v, -14, 13, 0, 1, -4, 4, 0x8a6a4a); // shelf
  fill(v, -6, 5, 2, 12, -3, 2, 0xd8c8a0); for (let k = 0; k < 4; k++) fill(v, -8 + k, 7 - k, 13 + k, 13 + k, -4, 3, 0x4a4a52); // little shrine
  fill(v, -12, -10, 2, 6, 0, 2, 0xf4f4f0); fill(v, 9, 11, 2, 6, 0, 2, 0xf4f4f0); // sake cups / vases
  fill(v, -12, -10, 7, 10, 1, 1, 0x3a8a3a); fill(v, 9, 11, 7, 10, 1, 1, 0x3a8a3a); // sakaki
  for (let x = -14; x <= 13; x++) v.set(x, -1 - Math.round(Math.sin(((x + 14) / 27) * Math.PI) * 1.5), 5, 0xd8c890);
  return vm(v, V5);
}
export function cardboard(seed = 1, { w = 12, h = 9, d = 10, label = null } = {}) {
  const v = new VoxelModel();
  const c = [0xc8a070, 0xb89060, 0xd0aa78][seed % 3];
  fill(v, -w / 2, w / 2 - 1, 0, h - 1, -d / 2, d / 2 - 1, (x, y, z) => (y === h - 1 && Math.abs(x + 0.5) < 1 ? 0xd8c8a0 : y === h - 1 ? sh(c, 1.08) : (x === -w / 2 || z === d / 2 - 1) && y % 4 === 0 ? sh(c, 0.92) : c));
  fill(v, -w / 2, w / 2 - 1, h - 1, h - 1, -1, 0, 0xe8dcc0); // tape
  const g = new THREE.Group(); g.add(vm(v, V5));
  if (label) { const p = new PixCanvas(20, 8, 2090 + seed); p.text(label, 10, 0, { font: `7px ${FONT.cute}`, color: '#3a2a1a', align: 'center' }); const s = signPlane(p, 0.3); s.position.set(0, h * V5 * 0.55, (d / 2) * V5 + 0.004); g.add(s); }
  return g;
}

export class KodamayaLocation extends Location {
  constructor(game) {
    super(game, 'kodamaya', { bg: 0x1e1622, lightMode: 'interior', grade: 'cozy', ambience: 'shop' });
    this.camCfg = { wupp: 0.0118, pitch: 36, yaw: 0, follow: true, minWupp: 0.006, maxWupp: 0.022, followY: 0.9, bounds: { minX: -1.3, maxX: 1.3, minZ: -0.6, maxZ: 0.6 } };
    this.shadowSize = 9;
    this.clock = false;
    this.hourOverride = 18.0;
    this.sky = false;
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 0 }; // fluorescent tubes (off until Grandpa flips the switch)
    this.warmU = { value: 1 };
    this.updaters = [];
    const k = (this.kit = new HomeKit());
    const { w, d, h } = SHOP;
    k.room({
      w, d, h, lowFront: 14, cap: 0x5a3a22, base: 0x4a2e1e,
      floor: (x, z) => { const plank = Math.floor((z + 200) / 5); const h2 = hash3(Math.floor((x + 200 + plank * 13) / 22), plank, 3); const seam = (x + 200 + plank * 13) % 22 === 0 || (z + 200) % 5 === 0; return seam ? 0x5a3a24 : h2 < 0.3 ? 0x8a5e38 : h2 > 0.75 ? 0xa0703f : 0x946640; },
      wall: (x, y, z, side) => (y < 22 ? (y === 21 ? 0x5a3a22 : (side === 'back' ? (x + 400) : (z + 400)) % 6 === 0 ? 0x6a4428 : 0x7a5030) : y > h - 4 ? 0xd8c8a8 : tone(x, y, z, 0xe8dcc0, 0xdcd0b4, 0xf0e6cc, 0.12, 0.06)),
      windows: [{ side: 'right', a0: -30, a1: -6, y0: 30, y1: 52, frame: 0x5a3a22, sky: (u, v) => hmix(0xffb070, 0x6a5a9a, v) }],
    });
    // stains on the plaster + a horizontal beam
    k.deco((R) => {
      for (let i = 0; i < 40; i++) { const x = -w / 2 + Math.floor(hash3(i, 1, 2) * w), y = 24 + Math.floor(hash3(i, 2, 2) * 30); for (let j = 0; j < 4; j++) R.set(x, y - j, -d / 2 - 1, 0xd0c4a8); }
      for (let x = -w / 2 - 2; x <= w / 2 + 1; x++) for (const y of [h - 8, h - 7]) R.set(x, y, -d / 2, 0x6a4428);
    });
    // fluorescent tubes on the ceiling line (glow, follow onU)
    const tubes = new VoxelModel();
    // wall-mounted fluorescent fittings along the top of the back wall
    const fit = new VoxelModel();
    for (const tx of [-60, 0, 60]) { for (let x = tx - 15; x < tx + 15; x++) { tubes.set(x, h - 11, -d / 2 + 2, 0xfffaf0); fit.set(x, h - 10, -d / 2 + 1, 0xd8dce0); fit.set(x, h - 10, -d / 2 + 2, 0xc8ccd0); fit.set(x, h - 12, -d / 2 + 1, 0xb8bcc4); } fit.set(tx - 15, h - 11, -d / 2 + 2, 0x9aa0a8); fit.set(tx + 14, h - 11, -d / 2 + 2, 0x9aa0a8); }
    k.add(vm(fit, V5));
    const tubeMesh = glowVm(tubes, V5, [0, 0, 0], { intensity: 1.3, mode: 1, onU: this.onU });
    k.add(tubeMesh);
    // ---- the machines: a row along the back wall + an island in the middle
    this.machines = [];
    const mrow = (n, x0, z, seed, sheets = []) => {
      for (let i = 0; i < n; i++) {
        const m = gachaMachine({ seed: seed + i * 3, body: [0xf4f2ec, 0xf8e8e0, 0xe8f0f4, 0xfff4d8, 0xf0f0f0][(seed + i) % 5], dust: 0.35 });
        const x = x0 + i * 0.44;
        m.position.set(x, 0, z);
        S.add(m);
        const rec = { obj: m, x, z, sheet: null, id: 'machine' + this.machines.length };
        if (sheets.includes(i)) { const sh2 = dustSheet(); sh2.position.set(x, 0.02, z); S.add(sh2); rec.sheet = sh2; }
        this.machines.push(rec);
      }
    };
    mrow(8, -2.3, -2.55, 3, [1, 2, 5]);
    mrow(5, -2.9, -0.35, 41, [0, 3]);
    mrow(4, 0.0, -0.35, 61, [2]);
    // a broken one with tape
    const tp = new PixCanvas(20, 8, 2100); tp.rect(0, 0, 20, 8, '#ffe040'); tp.text('故障中', 10, 0, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' });
    const tape = signPlane(tp, 0.32); tape.position.set(-2.3 + 0.44 * 6, 0.62, -2.55 + 0.135); tape.rotation.z = 0.12; S.add(tape);
    // ---- back wall: toy shelves, posters, calendar, a stopped clock, the family photo, kamidana
    const toyFill = (b, y, sh2, hx, dd, r) => {
      for (let x = -hx + 2; x < hx - 2; x += 4) {
        const kind = Math.floor(hash3(x, r, 7) * 4), c = [0xe8443a, 0x3a8ad8, 0xf0c040, 0x6ab04a, 0xf4f0e8, 0xff8ab0][Math.floor(hash3(r, x, 2) * 6)];
        if (kind === 0) b.box(x, y, -1, x + 2, y + 4, 1, c); // boxed toy
        else if (kind === 1) { ell(b, x + 1.5, y + 2, 0, 1.6, 2, 1.6, c); b.set(x + 1, y + 4, 0, 0xf4f0e8); } // capsule
        else if (kind === 2) { b.box(x, y, -1, x + 2, y + 2, 1, c); b.box(x + 1, y + 3, -1, x + 1, y + 5, 0, sh(c, 0.8)); } // figure
        else b.box(x, y, -2, x + 3, y + 1, 2, sh(c, 0.9)); // stacked cards
      }
    };
    for (const sx of [2.6, 3.9]) { const bs = bookshelf(k, { w: 24, h: 40, d: 8, col: 0x6a4428, rows: 5, fill: toyFill }); k.add(bs, sx, 0, W(-d / 2 + 4)); }
    const posters = [[gachaPoster(1), -4.2, 1.75], [animePoster(), -3.5, 1.8], [gachaPoster(2), 1.6, 1.75], [gachaPoster(3), -1.0, 2.05]];
    for (const [pc, px, py] of posters) { const pp = signPlane(pc, pc.w / 64 * 1.1); pp.position.set(px, py, W(-d / 2) + 0.006); pp.rotation.z = (hash3(px * 10 | 0, 1, 1) - 0.5) * 0.05; S.add(pp); }
    const cal = signPlane(calendar2019(), 0.42); cal.position.set(0.45, 1.75, W(-d / 2) + 0.006); S.add(cal);
    const clk = clock(k, { wall: true, h: 14 }); k.add(clk, -0.3, 2.35, W(-d / 2) + 0.05);
    const ph = signPlane(familyPhoto(), 0.5); ph.position.set(3.25, 2.25, W(-d / 2) + 0.012); ph.rotation.z = -0.03; S.add(ph); this.photo = ph;
    const kd = kamidana(); kd.position.set(4.2, 2.65, W(-d / 2) + 0.2); S.add(kd);
    // ---- right side: counter (with the jar), the coin changer, a stool, a lamp
    const ct = counter(); ct.position.set(3.1, 0, -0.9); S.add(ct); this.counter = ct;
    this.jar = happinessJar(); this.jar.position.set(2.45, 1.0, -0.85); S.add(this.jar);
    const cc = coinChanger(); cc.position.set(4.45, 0, 1.05); cc.rotation.y = -0.35; S.add(cc); this.changer = cc;
    const lp = lamp(k, { table: true, h: 14, shadeCol: 0xf8c878 }); k.add(lp, 4.05, 1.0, -1.0);
    const mn = manekiNeko(); mn.position.set(3.75, 1.0, -0.75); mn.scale.setScalar(0.8); S.add(mn); this.updaters.push(mn.userData.update); this.maneki = mn;
    // ---- left: the stairs up, and under them the sealed basement door
    const st = stairs(); st.position.set(W(-w / 2), 0, 0); S.add(st);
    const bd = basementDoor(); bd.position.set(-3.85, 0, W(-d / 2) + 0.05); S.add(bd); this.basement = bd;
    // ---- clutter: boxes, a broom against the wall, a step ladder, a crate of capsules
    const boxes = [[-0.9, 1.6, 'ガチャ在庫'], [-0.35, 1.9, ''], [-0.7, 2.1, ''], [1.9, 1.7, 'おもちゃ'], [1.3, 2.2, ''], [-4.3, 1.9, '']];
    this.boxes = boxes.map(([bx, bz, lab], i) => { const b = cardboard(i, { label: lab || null, w: 12 + (i % 2) * 2, h: 8 + (i % 3) }); b.position.set(bx, 0, bz); b.rotation.y = (hash3(i, 1, 9) - 0.5) * 0.5; S.add(b); return b; });
    const top = cardboard(9, { w: 10, h: 7 }); top.position.set(-0.85, 0.45, 1.6); top.rotation.y = 0.3; S.add(top); this.boxes.push(top);
    const br = broom(); br.position.set(1.15, 0.0, -2.75); br.rotation.set(0.12, 0, -0.08); S.add(br);
    // ---- dust: floor drifts, cobwebs in the corners, motes in the light shafts
    const dt = makeTexture(dustTex(320, 192).c, { mips: false });
    this.dustMat = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, opacity: 1 });
    const dust = new THREE.Mesh(new THREE.PlaneGeometry(W(w), W(d)), this.dustMat);
    dust.rotation.x = -Math.PI / 2; dust.position.y = 0.006; dust.renderOrder = 2; S.add(dust);
    this.webs = [];
    for (const [wx, wy, wz, ry] of [[W(-w / 2) + 0.02, 3.1, W(-d / 2) + 0.02, Math.PI / 4], [W(w / 2) - 0.02, 3.1, W(-d / 2) + 0.02, -Math.PI / 4], [-1.6, 2.5, -2.5, 0]]) {
      const wb = signPlane(cobweb(), 0.5, { double: true, alphaTest: 0.2 }); wb.material.transparent = true; wb.position.set(wx, wy, wz); wb.rotation.y = ry; wb.rotation.z = Math.PI; S.add(wb); this.webs.push(wb);
    }
    // light shafts: dusty evening light falling in through the open shutter and the window
    this.shafts = [];
    const shaftTex = (() => { const p = new PixCanvas(32, 64, 2110); for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) { const k2 = (1 - y / 64) * (1 - Math.abs(x - 16) / 16); if (k2 > ((x * 7 + y * 13) % 8) / 8 * 0.9) p.px(x, y, `rgba(255,255,255,${Math.min(1, k2 * 1.4)})`); } const t = new THREE.CanvasTexture(p.c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t; })();
    for (const [sx, sz, sw, sh2, rx] of [[-1.0, 1.6, 2.4, 2.8, -0.55], [1.6, 1.6, 2.0, 2.6, -0.55], [4.3, -0.9, 1.4, 2.4, 0.0]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh2), emitMat({ map: shaftTex, color: 0xffc888, intensity: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, onU: this.warmU, side: THREE.DoubleSide }));
      m.position.set(sx, sh2 / 2, sz); m.rotation.x = rx; if (sx > 4) m.rotation.y = -Math.PI / 2;
      m.renderOrder = 8; S.add(m); this.shafts.push(m);
    }
    // ---- finish the room (scene lighting comes from the game's interior light)
    k.finish({ lights: false, pitch: 36 });
    S.add(k.group);
    this.updaters.push((dtt) => k.update(dtt));
    // ---- nav: the floor minus machines, counter, stairs, boxes
    const nav = this.makeNav('shop', { minX: W(-w / 2) + 0.2, minZ: W(-d / 2) + 0.3, w: W(w) - 0.4, d: W(d) - 0.4 });
    nav.block(-2.6, -2.9, 1.2, -2.2); nav.block(-3.15, -0.65, 1.55, -0.05);
    nav.block(1.85, -1.4, 4.4, -0.4); nav.block(4.0, 0.65, 5, 1.5);
    nav.block(W(-w / 2), W(-d / 2), W(-w / 2) + 1.25, 1.9);
    for (const b of this.boxes) nav.blockCircle(b.position.x, b.position.z, 0.38);
    nav.block(2.0, -3, 4.6, -2.6);
    this.navs.shop = nav;
    this.stairsTop = { x: -4.4, z: -2.6 };
    this.setDust(1);
    this.setLights(false);
  }
  setDust(k) {
    this.dust = k;
    if (this.dustMat) this.dustMat.opacity = k;
    for (const w2 of this.webs || []) w2.visible = k > 0.3;
    for (const m of this.machines || []) if (m.sheet) m.sheet.visible = k > 0.5;
  }
  // the tubes, and the room's light level with them (dim dusk spill when off)
  setLights(on) {
    this.lightsOn = on; this.onU.value = on ? 1 : 0;
    this.lightOverride = on ? { hemiI: 1.55, sunI: 1.35, sky: 0xfff4e4, gnd: 0x6a5040, sun: 0xfff2dc } : { hemiI: 0.95, sunI: 0.75, sky: 0xc8a8c8, gnd: 0x4a3440, sun: 0xffb080 };
    if (this.game.location === this && this.game.lighting) this.game.lighting.override = { ...this.lightOverride };
  }
  async enter(opts = {}) {
    const g = this.game;
    g.rig.setFollow(null);
    const c = this.camCfg;
    g.rig.play({ x: 0, y: 1.0, z: 0.4, wupp: c.wupp, pitch: c.pitch, yaw: 0, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    // dust motes drifting in the light shafts
    if ((this._moteT = (this._moteT || 0) - dt) <= 0) {
      this._moteT = 0.25;
      const s = this.shafts[Math.floor(Math.random() * this.shafts.length)];
      if (s && this.dust > 0.2) this.game.particles?.emit('dustMote', { x: s.position.x + (Math.random() - 0.5) * 1.2, y: 0.4 + Math.random() * 1.8, z: s.position.z + (Math.random() - 0.5) * 0.6, n: 1 });
    }
  }
}
