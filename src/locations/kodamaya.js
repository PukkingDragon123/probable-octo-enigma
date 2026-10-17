// Kodamaya (木霊屋), inside: Grandpa's gachapon shop — a very old house built
// like a tea house. Dark red cedar walls between black posts, moss along the
// skirting and ivy round the big garden window (green curtains, bonsai on the
// sill, a pond and a red maple beyond), red paper lanterns on the beams, a
// stone fireplace with a kettle and a tea corner, an apothecary chest behind
// the long worn counter, herbs drying overhead, sacks and baskets, a pendulum
// clock, a chalkboard. Two rows of capsule machines (some under dust sheets),
// the cash register and the empty "Happiness" jar, the coin changer, a
// kamidana, the stairs up to Mamo's room and, under them, a small old door
// sealed with a paper charm. The camera turns in 45° steps; walls on the
// near side drop to low stubs so you can always see in.
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
import { toyBox } from '../game/shopDay.js';
import { displayCabinet, fillCabinet, konyokiBanner } from '../game/konyoki.js';
import { glassPane } from '../world/station.js';
import { emitMat } from '../core/materials.js';
import { FONT } from '../ui/fonts.js';
import { TH, wallPanels, ivy, ivyDrape, bigWindow, bonsai, pottedPlant, paperLantern, herbBundles, sack, basket, brassScale, drawerChest, fireplace, pendulumClock, chalkboard, scroll, teaCorner, gardenBackdrop } from '../world/teahouse.js';
import { pondWater, koi, stoneLantern } from '../world/spiritIsland.js';
import { natureBatch } from '../art/nature.js';

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
  // the long, worn counter: a thick top of old planks (lighter where hands rest),
  // a slatted front, and a glass showcase of rare capsules at the left end
  fill(v, -26, 25, 0, 17, -8, 7, (x, y, z) => {
    if (y < 2) return 0x2a1812;
    if (z === 7 && y > 3 && y < 15 && x > -24 && x < -4) return null; // showcase window
    if (z === 7) return (x + 40) % 3 === 0 ? 0x3e2418 : tone(x, y, z, 0x6a3a24, 0x5a2e1c, 0x7a4630, 0.1, 0.08);
    return 0x4a2a1a;
  });
  fill(v, -27, 26, 18, 19, -9, 8, (x, y, z) => {
    if (y === 18) return 0x3a2218;
    const plank = Math.floor((z + 9) / 4);
    let c = [0x8a5a36, 0x7e5030, 0x94623a, 0x8a5832][plank % 4];
    if ((z + 9) % 4 === 0) c = 0x5a3a24;
    if (Math.abs(x) < 12 && z > 0 && hash3(x, z, 3) < 0.4) c = sh(c, 1.18); // worn by sixty years of elbows
    if (hash3(x, z, 9) < 0.03) c = 0x4a2e1e; // old rings and knots
    return c;
  });
  for (let x = -22; x <= -6; x += 3) for (const y of [5, 11]) { const c = [0xff6a8a, 0x5ab8f0, 0xf8d040, 0x7ad860, 0xb88af0][(x + y + 40) % 5]; ell(v, x + 0.5, y + 1.5, 4.5, 1.4, 1.4, 1.4, (xx, yy) => (yy > y + 1 ? 0xf8f8f8 : c)); }
  fill(gl, -23, -5, 16, 16, 5, 5, 0xfff0d0);
  // the cash register (old, chunky, mint green) + a little bell
  fill(v, 8, 19, 20, 27, -6, 2, (x, y, z) => (y > 25 ? 0x9ac8b0 : y === 20 ? 0x5a6a62 : 0x8ab8a0));
  for (let x = 9; x <= 18; x += 2) for (let z = -1; z <= 1; z += 2) v.set(x, 27 + (z > 0 ? 0 : 1), z, 0xf4f0e8);
  fill(v, 10, 17, 28, 31, -5, -4, 0x5a6a62); fill(gl, 11, 16, 29, 30, -3, -3, 0x9af0a0); // display
  fill(v, -18, -16, 20, 21, 0, 2, PAL.brass); v.set(-17, 22, 1, PAL.brass);
  // glass candy jars with konpeito and ramune
  for (const [jx, col] of [[-12, 0xff9ab8], [-8, 0x8ad8ff]]) for (let y = 20; y < 26; y++) for (let x = jx - 1; x <= jx + 1; x++) for (let z = -1; z <= 1; z++) v.set(x, y, z, y === 25 ? 0xc8a070 : y < 24 && (x + z + y) % 2 === 0 ? col : 0xe8f4f8);
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
  // the konpeito inside (glowing, piled up to the fill level)
  const c = new VoxelModel();
  const SC = [0xff8ab8, 0xffe060, 0x8ae0ff, 0xb0f080, 0xd0a8ff, 0xffb070, 0xffffff];
  for (let y = 1; y < 13; y++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 4.6) c.set(x, y, z, SC[Math.floor(hash3(x, y, z) * SC.length)]);
  const cm = glowVm(c, V25, [0.5, 1, 0.5], { intensity: 1.15 });
  cm.position.y = V25; cm.renderOrder = 5; cm.visible = false; g.add(cm);
  g.userData.capacity = 100; g.userData.fill = 0;
  g.userData.setFill = (k) => { g.userData.fill = k; cm.visible = k > 0.005; cm.scale.y = Math.max(0.02, k); };
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
    this.camCfg = { wupp: 0.0112, pitch: 46, yaw: 0, follow: true, rotatable: true, minWupp: 0.006, maxWupp: 0.022, followY: 0.9, bounds: { minX: -1.6, maxX: 1.6, minZ: -0.9, maxZ: 0.9 } };
    this.shadowSize = 9;
    this.clock = false;
    this.hourOverride = 18.0;
    this.sky = false;
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 0 }; // lanterns and lamps (off until Grandpa flips the switch)
    this.warmU = { value: 1 };
    this.updaters = [];
    const H = 72; // wall height in voxels (3.6 m)
    // ---- floor: old dark planks, a worn path down the middle, a big rug
    const fl = new PixCanvas(320, 192, 2400);
    for (let y = 0; y < 192; y++) {
      const plank = Math.floor(y / 10);
      for (let x = 0; x < 320; x++) {
        const seg = Math.floor((x + plank * 37) / 70);
        const base = TH.wood[Math.floor(hash3(seg, plank, 4) * 3)];
        let c = '#' + base.toString(16).padStart(6, '0');
        if (y % 10 === 0 || (x + plank * 37) % 70 === 0) c = '#3a2418';
        else if (hash3(x >> 2, y, 5) < 0.06) c = darken(c, 0.12);
        else if (Math.abs(y - 112) < 26 && hash3(x, y, 6) < 0.25) c = lighten(c, 0.12);
        fl.px(x, y, c);
      }
    }
    const ft = makeTexture(fl.c, { mips: false });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshLambertMaterial({ map: ft }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
    const rug = new PixCanvas(96, 48, 2401);
    rug.rect(0, 0, 96, 48, '#7a2a2a'); rug.rect(3, 3, 90, 42, '#a83a32'); rug.rect(6, 6, 84, 36, '#e8d0a0');
    for (let k = 0; k < 6; k++) { const cx = 14 + k * 14; rug.poly([[cx, 12], [cx + 6, 24], [cx, 36], [cx - 6, 24]], k % 2 ? '#2e6a6a' : '#c8582e'); rug.circle(cx, 24, 2, '#f4ecd8'); }
    for (let x = 0; x < 96; x += 3) { rug.px(x, 0, '#e8d0a0'); rug.px(x + 1, 47, '#e8d0a0'); }
    const rm = signPlane(rug, 3.2); rm.rotation.x = -Math.PI / 2; rm.position.set(-0.9, 0.004, 1.15); S.add(rm);
    // ---- the four walls (near ones drop to stubs as the camera turns)
    this.walls = [];
    const wall = (name, n, holes, pos, rotY, normal) => {
      const { full, stub } = wallPanels(n, H, { holes, seed: n });
      const gFull = new THREE.Group(), gStub = new THREE.Group();
      gFull.add(full); gStub.add(stub);
      for (const g2 of [gFull, gStub]) { g2.position.set(pos[0], 0, pos[1]); g2.rotation.y = rotY; S.add(g2); }
      const w2 = { name, full: gFull, stub: gStub, n: normal, deco: gFull };
      this.walls.push(w2);
      return w2;
    };
    const back = wall('back', 204, [{ a0: 28, a1: 88, y0: 18, y1: 54 }], [0, -3.05], 0, [0, -1]);
    const front = wall('front', 204, [{ a0: -21, a1: 20, y0: 0, y1: 44 }, { a0: -84, a1: -50, y0: 18, y1: 44 }, { a0: 50, a1: 84, y0: 18, y1: 44 }], [0, 3.05], Math.PI, [0, 1]);
    const left = wall('left', 124, [], [-5.05, 0], Math.PI / 2, [-1, 0]);
    const right = wall('right', 124, [], [5.05, 0], -Math.PI / 2, [1, 0]);
    // helper: put an object on a wall in that wall's own coordinates (u along, y up, out from the boards)
    const onWall = (w2, obj, u, y, out = 0.06, rot = 0) => { obj.position.set(u, y, out); obj.rotation.y += rot; w2.full.add(obj); return obj; };
    // ---- beams overhead with paper lanterns, herbs drying above the counter
    this.lanterns = [];
    for (const [x, z, col] of [[-1.6, -1.1, 0xd8302a], [0.6, 1.3, 0xe8642a], [2.6, -1.1, 0xd8302a], [-3.4, 1.3, 0xc82a3a], [3.7, 1.3, 0xe8a02a]]) {
      const l = paperLantern(col, { onU: this.warmU }); l.position.set(x, 2.62, z); S.add(l); this.lanterns.push(l);
    }
    const hb = herbBundles(7, 2); hb.position.set(1.9, 3.0, -1.75); S.add(hb);
    const hb2 = herbBundles(5, 5); hb2.position.set(-4.4, 3.0, 0.5); hb2.rotation.y = Math.PI / 2; S.add(hb2);
        // ---- the back wall: the big garden window, the pendulum clock, posters, ivy
    const win = bigWindow(61, 37); onWall(back, win, 2.9, 0.9, 0.04);
    for (const [x, kind, s2] of [[1.9, 'pine', 1], [2.75, 'maple', 2], [3.6, 'azalea', 3]]) { const b2 = bonsai(s2, { kind }); onWall(back, b2, x, 0.88, 0.2); }
    for (const [x, y, len, sd] of [[1.35, 0.9, 50, 3], [4.5, 0.6, 60, 7], [-4.7, 0.1, 44, 9], [0.4, 0.1, 30, 11]]) { const iv = ivy(len, sd); onWall(back, iv, x, y, 0.07); }
    const clk = pendulumClock(); onWall(back, clk, -1.05, 1.55, 0.1); this.updaters.push(clk.userData.update);
    const posters = [[gachaPoster(1), -4.4, 2.25], [animePoster(), -0.05, 2.45], [gachaPoster(2), -2.2, 2.5]];
    for (const [pc, px2, py] of posters) { const pp = signPlane(pc, pc.w / 64 * 1.0); onWall(back, pp, px2, py, 0.12); pp.rotation.z = (hash3(px2 * 10 | 0, 1, 1) - 0.5) * 0.06; }
    const cal = signPlane(calendar2019(), 0.4); onWall(back, cal, 0.85, 2.0, 0.12);
    const ph = signPlane(familyPhoto(), 0.46); onWall(back, ph, 4.75, 2.45, 0.12); ph.rotation.z = -0.03; this.photo = ph;
    // ---- the right wall: the apothecary chest behind the counter, the kamidana, the fireplace and tea corner
    const dc = drawerChest(8, 9); dc.position.set(4.52, 0, -2.0); dc.rotation.y = -Math.PI / 2; S.add(dc); this.drawers = dc;
    const kd = kamidana(); onWall(right, kd, -2.1, 2.72, 0.24);
    const fp = fireplace({ onU: this.warmU }); fp.position.set(4.43, 0, 1.5); fp.rotation.y = -Math.PI / 2; S.add(fp); this.fire = fp;
    const sc2 = signPlane(scroll('縁'), 0.42); onWall(right, sc2, 0.35, 1.75, 0.12);
    const tc = teaCorner(); tc.position.set(3.75, 0, 1.55); S.add(tc);
    // ---- the left wall: stairs to Mamo's room, the chalkboard by the door, more ivy
    const cb = signPlane(chalkboard(), 1.15); onWall(left, cb, -2.2, 1.65, 0.1);
    for (const [u, sd] of [[2.9, 13], [-2.9, 15]]) { const iv = ivy(40, sd); onWall(left, iv, u, 0.1, 0.07); }
    // ---- the front wall: sliding glass doors with lattice, windows, an umbrella stand
    const fd = new VoxelModel();
    for (let x = -21; x <= 20; x++) for (let y = 0; y <= 44; y++) { const frame = x === -21 || x === 20 || x === 0 || x === -1 || y === 44 || y === 0 || y % 11 === 0 || (x + 21) % 7 === 0; if (frame) fd.set(x, y, 0, TH.post); }
    for (const a of [-67, 67]) for (let x = a - 17; x <= a + 17; x++) for (let y = 18; y <= 44; y++) if (x === a - 17 || x === a + 17 || y === 18 || y === 44 || (x - a) % 6 === 0 || (y - 18) % 6 === 0) fd.set(x, y, 0, TH.postL);
    onWall(front, vm(fd, V5), 0, 0, 0.0);
    const shojiM = new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.55 });
    for (const a of [-3.35, 3.35]) { const sj = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), shojiM); onWall(front, sj, a, 1.55, -0.01); }
    // ---- gacha machines: a row along the back wall + an island in the middle
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
    const tp = new PixCanvas(20, 8, 2100); tp.rect(0, 0, 20, 8, '#ffe040'); tp.text('故障中', 10, 0, { font: `7px ${FONT.tiny}`, color: '#2a1828', align: 'center' });
    const tape = signPlane(tp, 0.32); tape.position.set(-2.3 + 0.44 * 6, 0.62, -2.55 + 0.135); tape.rotation.z = 0.12; S.add(tape);
    // ---- the long worn counter (register, jar, maneki-neko, scale, candy jars)
    const ct = counter(); ct.position.set(3.1, 0, -0.9); S.add(ct); this.counter = ct;
    this.regPc = new PixCanvas(28, 8, 2200);
    this.regPlane = signPlane(this.regPc, 0.3, { emissive: 1.0 });
    this.regPlane.position.set(3.1 + 14 * V5, 30 * V5, -0.9 - 2 * V5 + 0.007); S.add(this.regPlane);
    this.setYen(0);
    const scl = brassScale(); scl.position.set(1.95, 1.0, -0.95); S.add(scl);
    const fern = pottedPlant('fern', 2); fern.position.set(4.25, 1.0, -1.0); fern.scale.setScalar(0.7); S.add(fern);
    // behind the counter: sacks and baskets under the window
    [[1.75, -2.65, '米'], [2.25, -2.75, '茶'], [4.45, -2.6, '豆']].forEach(([x, z, lab], i) => { const sk = sack(i, lab); sk.position.set(x, 0, z); sk.rotation.y = (i - 1) * 0.3; S.add(sk); });
    [[2.8, -2.7, 'tea'], [3.35, -2.65, 'mikan'], [3.9, -2.7, 'chestnut']].forEach(([x, z, k], i) => { const bk = basket(i, k); bk.position.set(x, 0, z); S.add(bk); });
    // the collection cabinet (one of every Konyoki) in the front-left corner, the toy box, the jar, the changer
    this.cabinet = displayCabinet(); this.cabinet.position.set(-4.35, 0, 2.55); this.cabinet.rotation.y = 0.45; S.add(this.cabinet);
    this.toyBox = toyBox(); this.toyBox.position.set(2.75, 0, 2.15); this.toyBox.rotation.y = -0.25; S.add(this.toyBox);
    this.jar = happinessJar(); this.jar.position.set(2.45, 1.0, -0.85); this.jar.scale.setScalar(1.35); S.add(this.jar);
    const cc = coinChanger(); cc.position.set(4.55, 0, 0.25); cc.rotation.y = -Math.PI / 2; S.add(cc); this.changer = cc;
    const mn = manekiNeko(); mn.position.set(3.75, 1.0, -0.75); mn.scale.setScalar(0.8); S.add(mn); this.updaters.push(mn.userData.update); this.maneki = mn;
    // ---- left: the stairs up, and under them the sealed basement door
    const st = stairs(); st.position.set(-5.0, 0, 0); S.add(st);
    const bd = basementDoor(); bd.position.set(-3.85, 0, -3.0); S.add(bd); this.basement = bd;
    // ---- plants, a sleeping cat on a cushion by the fire
    for (const [kind, x, z, sc3] of [['monstera', -1.75, 2.55, 1], ['citrus', 4.55, 2.6, 0.9], ['fern', -4.55, -0.6, 0.8]]) { const pl = pottedPlant(kind, x * 10 | 0); pl.position.set(x, 0, z); pl.scale.setScalar(sc3); S.add(pl); }
    // ---- clutter: boxes, a broom against the wall
    const boxes = [[-0.9, 1.6, 'ガチャ在庫'], [-0.35, 1.9, ''], [-0.7, 2.1, ''], [1.9, 1.7, 'おもちゃ'], [1.3, 2.2, '']];
    this.boxes = boxes.map(([bx, bz, lab], i) => { const b = cardboard(i, { label: lab || null, w: 12 + (i % 2) * 2, h: 8 + (i % 3) }); b.position.set(bx, 0, bz); b.rotation.y = (hash3(i, 1, 9) - 0.5) * 0.5; S.add(b); return b; });
    const top = cardboard(9, { w: 10, h: 7 }); top.position.set(-0.85, 0.45, 1.6); top.rotation.y = 0.3; S.add(top); this.boxes.push(top);
    const br = broom(); br.position.set(1.15, 0.0, -2.75); br.rotation.set(0.12, 0, -0.08); S.add(br);
    // ---- the garden beyond the window: pond, koi, a stone lantern, a red maple, bamboo, the far lake
    this.garden = new THREE.Group();
    const gt = new PixCanvas(64, 32, 2402); gt.noiseFill(['#4a7a3a', '#5a8a42', '#6a9a4a', '#7aa852'], { scale: 0.2 });
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshLambertMaterial({ map: makeTexture(gt.c, { mips: false }) }));
    gm.rotation.x = -Math.PI / 2; gm.position.set(2, -0.02, -5.6); this.garden.add(gm);
    const pond = pondWater(1.6, 0.9); pond.position.set(3.0, 0.0, -4.9); this.garden.add(pond);
    this.koi = [koi(0xf08a30), koi(0xffffff), koi(0xe84a3a)].map((k2, i) => { k2.position.set(3 + i * 0.3, 0.02, -4.9); this.garden.add(k2); return k2; });
    const sl = stoneLantern({ onU: this.warmU }); sl.position.set(1.0, 0, -4.2); this.garden.add(sl);
    this.gardenTrees = natureBatch({ max: 40, castShadow: true });
    for (const [n2, x, z] of [['momiji_0', 4.9, -5.4], ['bamboo_0', 0.4, -5.6], ['bamboo_1', 0.9, -6.1], ['camphor_0', 2.4, -6.6], ['hydrangea_blue', 1.7, -4.4], ['hydrangea_pink', 4.3, -4.2], ['susuki', 5.5, -4.6], ['azalea', 2.2, -3.6]]) this.gardenTrees.push(n2, x, 0, z, { sway: 0.4 });
    this.gardenTrees.commit();
    this.garden.add(this.gardenTrees.mesh);
    const far = signPlane(gardenBackdrop(), 10, { lit: false }); far.position.set(2.5, 2.4, -8.4); this.garden.add(far); this.gardenFar = far;
    S.add(this.garden);
    // ---- dust: floor drifts, cobwebs in the corners, motes in the light shafts
    const dt = makeTexture(dustTex(320, 192).c, { mips: false });
    this.dustMat = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, opacity: 1 });
    const dust = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), this.dustMat);
    dust.rotation.x = -Math.PI / 2; dust.position.y = 0.006; dust.renderOrder = 2; S.add(dust);
    this.webs = [];
    for (const [wx, wy, wz, ry] of [[-4.95, 3.1, -2.95, Math.PI / 4], [4.95, 3.1, -2.95, -Math.PI / 4], [-1.6, 2.5, -2.5, 0]]) {
      const wb = signPlane(cobweb(), 0.5, { double: true, alphaTest: 0.2 }); wb.material.transparent = true; wb.position.set(wx, wy, wz); wb.rotation.y = ry; wb.rotation.z = Math.PI; S.add(wb); this.webs.push(wb);
    }
    // light shafts: the late sun through the garden window and the front doors
    this.shafts = [];
    const shaftTex = (() => { const p = new PixCanvas(32, 64, 2110); for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) { const k2 = (1 - y / 64) * (1 - Math.abs(x - 16) / 16); if (k2 > ((x * 7 + y * 13) % 8) / 8 * 0.9) p.px(x, y, `rgba(255,255,255,${Math.min(1, k2 * 1.4)})`); } const t = new THREE.CanvasTexture(p.c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t; })();
    for (const [sx, sz, sw, sh2, rx] of [[2.9, -2.1, 2.8, 2.6, 0.6], [-0.2, 2.2, 1.8, 2.4, -0.55]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh2), emitMat({ map: shaftTex, color: 0xffd090, intensity: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.position.set(sx, sh2 / 2, sz); m.rotation.x = rx;
      m.renderOrder = 8; S.add(m); this.shafts.push(m);
    }
    // a warm point light by the fire, one in the lantern cluster
    this.fireLight = new THREE.PointLight(0xff9a50, 0, 3.2, 1.6); this.fireLight.position.set(4.3, 0.6, 1.5); S.add(this.fireLight);
    // ---- nav: the floor minus machines, counter, stairs, furniture
    const nav = this.makeNav('shop', { minX: -4.8, minZ: -2.7, w: 9.6, d: 5.6 });
    nav.block(-2.6, -2.9, 1.2, -2.2); nav.block(-3.15, -0.65, 1.55, -0.05);
    nav.block(1.85, -1.4, 4.4, -0.4);
    nav.block(-5, -3, -3.75, 1.9);
    for (const b of this.boxes) nav.blockCircle(b.position.x, b.position.z, 0.38);
    nav.block(1.5, -3, 4.8, -2.35); // sacks and baskets under the window
    nav.block(4.6, -2.8, 5, -1.4); // apothecary chest
    nav.block(4.2, 0.0, 5, 0.55); // coin changer
    nav.block(4.3, 0.75, 5, 2.3); // fireplace
    nav.blockCircle(3.75, 1.55, 0.5); // tea table
    nav.block(2.1, 1.75, 3.4, 2.6);
    nav.block(-5.0, 2.0, -3.6, 3.0);
    nav.blockCircle(-1.75, 2.55, 0.3); nav.blockCircle(4.55, 2.6, 0.32);
    this.navs.shop = nav;
    this.stairsTop = { x: -4.4, z: -2.6 };
    this.setDust(1);
    this.setLights(false);
  }
  setYen(n) {
    const p = this.regPc; p.rect(0, 0, 28, 8, '#103018');
    p.text('¥' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 27, 0, { font: `7px ${FONT.tiny}`, color: '#8af0a0', align: 'right' });
    this.regPlane.userData.tex.needsUpdate = true;
  }
  // morning after the big clean: sheets off, a little dust left, lights on, daylight from the street
  setDay(hour = 10) {
    this.setDust(0.12);
    for (const m of this.machines) if (m.sheet) { m.sheet.visible = false; m.sheet.userData.off = true; }
    this.hourOverride = hour;
    this.setLights(true);
    this.lightOverride = { hemiI: 1.7, sunI: 1.6, sky: 0xfff8ec, gnd: 0x7a6048, sun: 0xfff4e0 };
    if (this.game.location === this) this.game.lighting.override = { ...this.lightOverride };
    this.jar?.userData.setFill?.(Math.min(1, (this.game.state.happiness || 0) / 100));
    this.refreshCollection();
    for (const s of this.shafts) s.material.uniforms && (s.material.uniforms.uColor && s.material.uniforms.uColor.value.setHex(0xfff0d0));
  }
  // fill the cabinet from the saved collection
  refreshCollection() {
    const col = this.game.state.collection || {};
    if (col.kyuriOffice || this.game.state.konyoki?.includes('kyuriOffice')) fillCabinet(this.cabinet, 'kyuriOffice', new Set(col.kyuriOffice || []));
  }
  // turn a machine into a Konyoki machine: glowing banner on top, green capsules
  makeKonyokiMachine(m, seriesId) {
    m.konyoki = seriesId;
    if (!m.banner) { m.banner = konyokiBanner(seriesId); m.banner.position.set(m.x, 1.24, m.z + 0.14); this.scene.add(m.banner); }
  }
  onTapFirst(e) { return this.day ? this.day.pickStars(e.x, e.y) > 0 : false; }
  onDrag(e) { if (this.day) this.day.pickStars(e.x, e.y, 40); }
  setDust(k) {
    this.dust = k;
    if (this.dustMat) this.dustMat.opacity = k;
    for (const w2 of this.webs || []) w2.visible = k > 0.3;
    for (const m of this.machines || []) if (m.sheet) m.sheet.visible = k > 0.5;
  }
  // the tubes, and the room's light level with them (dim dusk spill when off)
  setLights(on) {
    this.lightsOn = on; this.onU.value = on ? 1 : 0; this.warmU.value = on ? 1 : 0.35;
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
    this.day?.update(dt);
    // walls between the camera and the room drop to stubs
    const yaw = this.game.rig.yaw, cx = Math.sin(yaw), cz = Math.cos(yaw);
    for (const w2 of this.walls) {
      const near = w2.n[0] * cx + w2.n[1] * cz > 0.22;
      w2.full.visible = !near; w2.stub.visible = near;
      if (w2.name === 'back') { this.gardenFar.visible = !near; this.gardenTrees.mesh.visible = !near; }
      if (w2.name === 'right') { this.fire.visible = !near; this.drawers.visible = !near; }
    }
    // the fire breathes; koi circle the pond
    this.fireLight.intensity = (0.6 + Math.sin(t * 7.3) * 0.12 + Math.sin(t * 13.1) * 0.08) * (this.lightsOn ? 1 : 1.4);
    this.koi?.forEach((k2, i) => { const a = t * (0.35 + i * 0.1) + i * 2.1; k2.position.set(3.0 + Math.cos(a) * 1.05, 0.02, -4.9 + Math.sin(a) * 0.55); k2.rotation.y = -a; });
    // dust motes drifting in the light shafts
    if ((this._moteT = (this._moteT || 0) - dt) <= 0) {
      this._moteT = 0.25;
      const s = this.shafts[Math.floor(Math.random() * this.shafts.length)];
      if (s && this.dust > 0.2) this.game.particles?.emit('dustMote', { x: s.position.x + (Math.random() - 0.5) * 1.2, y: 0.4 + Math.random() * 1.8, z: s.position.z + (Math.random() - 0.5) * 0.6, n: 1 });
    }
  }
}
