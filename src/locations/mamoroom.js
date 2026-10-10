// Mamo's room, upstairs at Kodamaya: a six-mat tatami room that's been the
// shop's storeroom for years. Boxes everywhere, dust bunnies in the corners,
// a window that sticks, the oshiire closet, a low desk, a rolled-up futon.
// The cleaning tutorial happens here: tap a box to carry it into the closet,
// tap dust to sweep it up, tap the window to let the night air in.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { HomeKit, W, bookshelf, lamp, PAL, mix as hmix } from '../world/homeKit.js';
import { VoxelModel, vm, glowVm, signPlane, fill, sh, tone, hash3, ell, V5, V25 } from '../world/build.js';
import { PixCanvas, mix, makeTexture } from '../core/pixtex.js';
import { cardboard } from './kodamaya.js';
import { pottedPlant } from '../world/shotengai.js';
import { FONT } from '../ui/fonts.js';

export const ROOM = { w: 140, d: 92, h: 58 };

// tatami: six mats with dark cloth borders, woven texture
function tatamiFloor(x, z) {
  // mats 36 x 18 voxels (1.8 m x 0.9 m) in the classic six-mat layout
  const X = x + 70, Z = z + 46;
  const mats = [[0, 0, 36, 18], [0, 18, 36, 18], [0, 36, 18, 36], [18, 36, 18, 36], [36, 0, 18, 36], [54, 0, 18, 36], [36, 36, 36, 18], [36, 54, 36, 18], [72, 0, 36, 18], [72, 18, 36, 18], [72, 36, 18, 36], [90, 36, 18, 36], [108, 0, 32, 36], [108, 36, 32, 36], [0, 72, 36, 20], [36, 72, 36, 20], [72, 72, 36, 20], [108, 72, 32, 20]];
  for (const [mx, mz, mw, md] of mats) {
    if (X < mx || X >= mx + mw || Z < mz || Z >= mz + md) continue;
    const lx = X - mx, lz = Z - mz;
    const longX = mw > md;
    const border = longX ? (lz === 0 || lz === md - 1) : (lx === 0 || lx === mw - 1);
    if (border) return 0x3a3a2e;
    if (lx === 0 || lz === 0) return 0x9a9a62;
    const weave = longX ? (lx % 2) : (lz % 2);
    const age = hash3(Math.floor(X / 6), Math.floor(Z / 6), 4) < 0.3 ? 0.94 : 1;
    return sh(weave ? 0xc8c080 : 0xbcb474, age);
  }
  return 0xb8b070;
}
function nightWindow(u, v) {
  // the arcade roof edge, rooftops and a deep blue evening sky with a star or two
  if (v < 0.18) return hmix(0x3a3a52, 0x4a4a62, u);
  if (v < 0.35 && (Math.floor(u * 9) % 3 === 0)) return 0x2a2a3e;
  if (hash3(Math.floor(u * 30), Math.floor(v * 20), 7) > 0.985) return 0xfff4c8;
  return hmix(0x6a5a9a, 0x1e2650, v);
}
function fusumaTex() { // two full-height sliding paper doors with a faded pine-and-mountain painting
  const p = new PixCanvas(72, 88, 3001);
  p.rect(0, 0, 72, 88, '#f0e8d8');
  for (let i = 0; i < 2; i++) {
    const x0 = i * 36;
    p.frame(x0, 0, 36, 88, '#5a3a24', 2);
    p.hline(x0 + 2, x0 + 33, 44, '#d8ccb8');
    p.poly([[x0 + 2, 80], [x0 + 12, 58], [x0 + 22, 72], [x0 + 32, 54], [x0 + 34, 86], [x0 + 2, 86]], '#c8d0c8');
    p.poly([[x0 + 2, 84], [x0 + 18, 70], [x0 + 34, 82], [x0 + 34, 86], [x0 + 2, 86]], '#b0bcb4');
    p.line(x0 + 4, 26, x0 + 30, 18, '#6a5a4a'); p.line(x0 + 14, 23, x0 + 18, 32, '#6a5a4a');
    for (let k = 0; k < 6; k++) p.circle(x0 + 7 + k * 4, 19 + (k % 2) * 4, 2.5, '#6a8a6a');
    p.circle(x0 + (i ? 26 : 10), 10, 4, '#e8c8b0'); // a faded sun
    p.ellipse(x0 + (i ? 5 : 31), 46, 2, 3, '#3a2a1a'); // pull
  }
  p.scatter(0, 0, 72, 88, '#e0d4c0', 0.12);
  return p;
}
function idolPoster() { // the poster the last tenant (Dad) left: a band from the 90s
  const p = new PixCanvas(30, 42, 3002);
  for (let y = 0; y < 42; y++) p.hline(0, 29, y, mix('#2a2a5a', '#e86a8a', y / 42));
  for (let i = 0; i < 3; i++) { p.circle(7 + i * 8, 20, 3, '#f4e0c8'); p.rect(4 + i * 8, 23, 7, 10, ['#3a3a44', '#e8443a', '#f4f0e8'][i]); }
  p.text('ROCK', 15, 34, { font: `7px ${FONT.tiny}`, color: '#ffe040', align: 'center' });
  p.x.globalAlpha = 0.3; p.rect(0, 0, 30, 42, '#f8f0e0'); p.x.globalAlpha = 1;
  p.frame(0, 0, 30, 42, '#2a2028');
  return p;
}

// a dust bunny: a fluffy grey clump. When disturbed it opens two googly eyes
// for a moment (Hokori!), then poofs.
export function dustBunny(seed = 1, r = 4) {
  const v = new VoxelModel();
  ell(v, 0.5, r * 0.8, 0.5, r * 1.15, r * 0.85, r, (x, y, z) => { const h = hash3(x, y, z + seed); return h < 0.12 ? null : h < 0.4 ? 0x8a8288 : h < 0.75 ? 0x9a9298 : 0xb0a8ae; });
  for (let i = 0; i < 10; i++) { const a = i * 0.63, x = Math.round(Math.cos(a) * (r + 1)), z = Math.round(Math.sin(a) * (r + 1)); v.set(x, 1 + (i % 2), z, 0x9a9298); }
  const g = new THREE.Group();
  g.add(vm(v, V25, [0.5, 0, 0.5]));
  const e = new PixCanvas(12, 6, 3010 + seed);
  for (const cx of [3, 9]) { e.circle(cx, 3, 2.6, '#ffffff'); e.circle(cx + 0.5, 3.3, 1.3, '#1a1420'); }
  const eyes = signPlane(e, 0.16, { alphaTest: 0.5 });
  eyes.position.set(0, r * 0.95 * V25, r * V25 + 0.004);
  eyes.visible = false;
  g.add(eyes);
  g.userData.eyes = eyes;
  return g;
}

export class MamoRoomLocation extends Location {
  constructor(game) {
    super(game, 'mamoroom', { bg: 0x1a1424, lightMode: 'interior', grade: 'cozy', ambience: 'night' });
    this.camCfg = { wupp: 0.0118, pitch: 38, yaw: 0, follow: false, minWupp: 0.006, maxWupp: 0.016, fixed: { x: 0, y: 1.0, z: 0.15 } };
    this.shadowSize = 7;
    this.clock = false;
    this.hourOverride = 18.6;
    this.sky = false;
    this.lightOverride = { hemiI: 1.25, sunI: 1.05, sky: 0xe8d8e8, gnd: 0x5a4450, sun: 0xffd8a8 };
  }
  async build() {
    const S = this.scene;
    this.updaters = [];
    const k = (this.kit = new HomeKit());
    const { w, d, h } = ROOM;
    k.room({
      w, d, h, lowFront: 12, cap: 0x4a2e1e, base: 0x5a3a24,
      floor: tatamiFloor,
      wall: (x, y, z, side) => {
        const a = side === 'back' ? x : z;
        if ((a + 400) % 36 === 0 || (a + 400) % 36 === 1) return 0x7a5232; // hashira posts
        if (y > h - 8) return y === h - 8 ? 0x6a4428 : 0xe0d4b8; // ramma band
        return tone(x, y, z, 0xd8c8a4, 0xccbc98, 0xe4d4b0, 0.14, 0.06);
      },
      windows: [{ side: 'back', a0: 14, a1: 46, y0: 22, y1: 44, frame: 0x6a4428, sky: nightWindow }],
    });
    // the window's sliding glass pane (opens during the tutorial) + a curtain each side
    const pane = new VoxelModel();
    for (let x = 0; x < 17; x++) for (let y = 0; y < 23; y++) { const edge = x === 0 || x === 16 || y === 0 || y === 22; pane.set(x, y, 0, edge ? 0x8a6a4a : (x + y) % 9 === 0 ? 0xe8f0f8 : 0xb8c8d8); }
    this.pane = vm(pane, V5); this.pane.position.set(W(30), W(22), W(-d / 2) + 0.03);
    this.pane.material = this.pane.material.clone(); this.pane.material.transparent = true; this.pane.material.opacity = 0.55;
    S.add(this.pane);
    this.curtains = [];
    for (const [cx, side] of [[W(11), -1], [W(47), 1]]) {
      const cv = new VoxelModel(); for (let x = 0; x < 6; x++) for (let y = 0; y < 26; y++) cv.set(x * side, -y, 0, (x % 2) ? 0xe8b8a8 : 0xf0c8b8);
      const cm = vm(cv, V5); cm.position.set(cx, W(46), W(-d / 2) + 0.12); S.add(cm); this.curtains.push(cm);
    }
    this.windowOpen = false;
    // ---- back wall, left: the oshiire closet; its two fusuma slide open during cleaning
    const osh = new VoxelModel();
    const ox0 = -66, ox1 = -29, oz0 = -d / 2, oz1 = -d / 2 + 13;
    fill(osh, ox0, ox1, 0, 46, oz0, oz1, (x, y, z) => (x <= ox0 + 1 || x >= ox1 - 1 || y >= 45 || y <= 1 ? 0x6a4428 : y === 23 || y === 24 ? 0x8a6a4a : z === oz0 ? 0x2a2228 : undefined));
    for (let x = ox0 + 2; x <= ox1 - 2; x++) for (let y = 2; y < 45; y++) if (y !== 23 && y !== 24) osh.set(x, y, oz0, 0x2a2228);
    for (let x = ox0 + 2; x <= ox1 - 2; x++) for (let z = oz0; z <= oz1; z++) { osh.set(x, 1, z, 0x5a3a24); osh.set(x, 23, z, 0x8a6a4a); osh.set(x, 45, z, 0x6a4428); }
    for (let y = 2; y < 45; y++) for (let z = oz0; z <= oz1; z++) { osh.set(ox0 + 1, y, z, 0x6a4428); osh.set(ox1 - 1, y, z, 0x6a4428); }
    S.add(vm(osh, V5));
    const fz = W(oz1) + 0.055;
    this.fusuma = [];
    const ft = fusumaTex();
    for (let i = 0; i < 2; i++) {
      const pc = new PixCanvas(36, 88, 3005 + i); pc.draw(ft, -i * 36, 0);
      const fp = signPlane(pc, W(18)); fp.position.set(W(ox0 + 2 + 9 + i * 17.5), W(23.5), fz + i * 0.012); S.add(fp);
      this.fusuma.push({ m: fp, x0: fp.position.x });
    }
    this.closet = { x: W((ox0 + ox1) / 2), z: W(oz1) + 0.55, slots: [] };
    for (let i = 0; i < 8; i++) this.closet.slots.push({ x: W(ox0 + 7) + (i % 4) * 0.42, z: W(oz0) + 0.32, y: i < 4 ? W(2) : W(25) });
    // ---- furniture: low desk with an old CRT, a zabuton, a lamp, a small shelf, the futon roll
    const desk = new VoxelModel();
    fill(desk, -18, 17, 10, 11, -9, 8, 0x8a5a32); for (const [x, z] of [[-17, -8], [16, -8], [-17, 7], [16, 7]]) fill(desk, x, x, 0, 9, z, z, 0x6a4224);
    fill(desk, -16, -4, 12, 23, -8, 0, 0xc8c4b8); fill(desk, -15, -5, 14, 21, 1, 1, 0x2a3a3a); // little CRT
    fill(desk, 2, 12, 12, 12, -4, 4, 0xf4f0e8); // notebook
    const dm = vm(desk, V5); dm.position.set(1.6, 0, -1.55); S.add(dm);
    const zab = new VoxelModel(); fill(zab, -8, 7, 0, 2, -8, 7, (x, y, z) => (y === 2 ? 0x6a5aa8 : 0x5a4a98)); const zm = vm(zab, V5); zm.position.set(1.6, 0, -0.75); S.add(zm);
    const lp = lamp(k, { h: 30, shadeCol: 0xf8d898 }); k.add(lp, -0.7, 0, -1.95);
    const sh2 = bookshelf(k, { w: 20, h: 30, d: 8, col: 0x6a4428, rows: 3 }); k.add(sh2, 3.0, 0, W(-d / 2 + 4));
    const fut = new VoxelModel(); ell(fut, 0.5, 6, 0.5, 18, 6, 6, (x, y, z) => ((x + 40) % 6 < 3 ? 0x8ab0d8 : 0xf4f0e8)); const fm = vm(fut, V5, [0.5, 0, 0.5]); fm.position.set(2.9, 0, 1.3); S.add(fm); this.futonRoll = fm;
    // the futon laid out (shown at the end)
    const flat = new VoxelModel(); fill(flat, -12, 11, 0, 2, -20, 19, (x, y, z) => (z < -14 ? 0xf4f0e8 : (x + z + 40) % 8 < 4 ? 0x8ab0d8 : 0x7aa0c8)); fill(flat, -9, 8, 3, 4, -19, -15, 0xfaf6ee);
    const fl = vm(flat, V5); fl.position.set(0.3, 0, 0.3); fl.visible = false; S.add(fl); this.futonFlat = fl;
    const pp = signPlane(idolPoster(), 0.46); pp.position.set(-0.9, 1.75, W(-d / 2) + 0.006); S.add(pp);
    const pl = pottedPlant(5, { leaf: 0x6a6a3a, pot: 0xc87a4a }); pl.position.set(W(w / 2) - 0.3, 0, 0.2); S.add(pl); // a sad, dry plant
    // ceiling light pull-cord lamp (glow) hanging in the middle
    const cl = new VoxelModel(), cg = new VoxelModel();
    fill(cl, 0, 0, 0, 20, 0, 0, 0x3a3a40); for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) { const r = Math.hypot(x, z); if (r < 8.5 && r > 6.8) cl.set(x, -1, z, 0xe8e0d0); if (r <= 6.8) cg.set(x, -1, z, 0xfff4d8); }
    this.lampU = { value: 1 };
    const clg = new THREE.Group(); clg.add(vm(cl, V25), glowVm(cg, V25, [0, 0, 0], { intensity: 1.1, onU: this.lampU })); clg.position.set(0, 2.55, -0.4); S.add(clg);
    // ---- the clutter (tutorial targets): boxes + dust bunnies
    const labels = ['ガチャ在庫', '昭和', 'おもちゃ', '', 'カプセル', '', '雑誌'];
    const spots = [[-1.9, 0.9], [-0.9, 1.6], [0.4, 1.9], [1.2, 0.6], [-2.5, -0.4], [2.2, -0.3], [-0.6, -0.8]];
    this.boxes = spots.map(([bx, bz], i) => {
      const b = cardboard(i + 3, { label: labels[i] || null, w: 12 + (i % 3) * 2, h: 8 + (i % 2) * 3 });
      b.position.set(bx, 0, bz); b.rotation.y = (hash3(i, 3, 9) - 0.5) * 0.7; S.add(b);
      return { obj: b, done: false, id: 'box' + i };
    });
    const dspots = [[-3.1, -0.9], [3.2, -1.2], [-2.9, 1.8], [3.15, 1.95], [0.1, -1.95]];
    this.bunnies = dspots.map(([dx, dz], i) => { const b = dustBunny(i, 5 + (i % 3)); b.position.set(dx, 0, dz); S.add(b); return { obj: b, done: false, id: 'dust' + i }; });
    k.finish({ lights: false, pitch: 38 });
    S.add(k.group);
    this.updaters.push((dt) => k.update(dt));
    // ---- nav
    const nav = this.makeNav('room', { minX: W(-w / 2) + 0.25, minZ: W(-d / 2) + 0.3, w: W(w) - 0.5, d: W(d) - 0.5 });
    nav.block(0.6, -2.1, 2.6, -1.05); nav.block(2.0, 1.0, 3.6, 1.65); nav.block(-3.4, -2.3, -1.4, -1.6); nav.block(2.4, -2.3, 3.5, -1.9);
    this.navs.room = nav;
    nav.snapshot();
    this.boxNav();
  }
  // boxes block the floor until they're carried away
  boxNav() {
    const nav = this.navs.room;
    nav.restore();
    for (const b of this.boxes) if (!b.done) nav.blockCircle(b.obj.position.x, b.obj.position.z, 0.32);
  }
  // lights out: moonlight through the window, the lamp off
  setNight() {
    this.lampU.value = 0.04;
    this.hourOverride = 22.5;
    this.lightOverride = { hemiI: 0.7, sunI: 0.55, sky: 0x7080c0, gnd: 0x2a2440, sun: 0xa8c0ff };
    if (this.game.location === this) this.game.lighting.override = { ...this.lightOverride };
    this.futonRoll.visible = false; this.futonFlat.visible = true;
    for (const b of this.boxes) if (!b.done) { this.scene.remove(b.obj); b.done = true; }
    for (const b of this.bunnies) if (!b.done) { this.scene.remove(b.obj); b.done = true; }
  }
  async enter() {
    const g = this.game;
    g.rig.setFollow(null);
    g.rig.play({ ...this.camCfg.fixed, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: 0, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    if (this.windowOpen) for (const [i, c] of this.curtains.entries()) c.rotation.x = -0.1 - Math.sin(t * 1.6 + i) * 0.12;
  }
}
