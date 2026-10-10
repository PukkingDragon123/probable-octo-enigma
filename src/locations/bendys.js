// Bendy's (ベンディーズ), inside: Bendo's old-fashioned family restaurant.
// Red-and-white checkered floor, red vinyl booths along the back wall, a long
// counter with chrome stools and the open kitchen behind it (Bendo's flat-top
// stove, the fryer, plates on the pass), menu boards with pixel food, the
// parfait case, a jukebox, pendant lamps and regulars at every table.
import * as THREE from 'three';
import { Location } from '../game/Location.js';
import { HomeKit, W, PAL, mix as hmix, frame as hkFrame, plant as hkPlant } from '../world/homeKit.js';
import { VoxelModel, vm, glowVm, signPlane, fill, sh, tone, hash3, ell, V5, V25 } from '../world/build.js';
import { PixCanvas, mix } from '../core/pixtex.js';
import { bendysLogo, sampleCase } from '../world/shopSigns.js';
import { gachaMachine } from '../world/streetProps.js';
import { glassPane } from '../world/station.js';
import { Crowd } from '../world/crowd.js';
import { FONT } from '../ui/fonts.js';

export const BEN = { w: 220, d: 124, h: 66 };

function menuWall() { // the big menu board over the counter: pixel food with prices
  const p = new PixCanvas(160, 40, 4001);
  p.rect(0, 0, 160, 40, '#2a1818'); p.frame(0, 0, 160, 40, '#c8202a', 2);
  const items = [['オムライス', '890', '#f8c838'], ['ハンバーグ', '980', '#8a4a2a'], ['ナポリタン', '780', '#e8582a'], ['エビフライ', '1050', '#e8a040'], ['パフェ', '650', '#ff9ac8'], ['クリームソーダ', '480', '#58d870']];
  items.forEach(([n, pr, c], i) => {
    const x = 6 + (i % 3) * 52, y = 4 + Math.floor(i / 3) * 18;
    p.rect(x, y + 2, 12, 9, '#fff4e0'); p.ellipse(x + 6, y + 6, 4.5, 3, c); p.px(x + 4, y + 5, '#ffffff');
    p.text(n, x + 15, y + 1, { font: `7px ${FONT.tiny}`, color: '#fff4d8' });
    p.text(pr + '円', x + 15, y + 9, { font: `7px ${FONT.tiny}`, color: '#ffd040' });
  });
  return p;
}
function retroPoster(seed = 1) {
  const p = new PixCanvas(30, 40, 4010 + seed);
  p.rect(0, 0, 30, 40, ['#fff0d8', '#d8f0ff'][seed % 2]);
  p.circle(15, 17, 10, '#e8303a'); p.circle(15, 17, 8, '#fff4e8');
  if (seed % 2) { p.ellipse(15, 18, 6, 4, '#f8c838'); p.line(10, 17, 20, 18, '#d8301a'); }
  else { p.rect(11, 9, 8, 14, '#58d870'); p.circle(15, 8, 3, '#ffffff'); }
  p.text(seed % 2 ? 'OMURICE!' : 'SODA!', 15, 30, { font: `7px ${FONT.tiny}`, color: '#c8202a', align: 'center' });
  p.frame(0, 0, 30, 40, '#5a2a2a');
  return p;
}
function booth() {
  const v = new VoxelModel();
  fill(v, -10, 9, 0, 13, -4, 3, (x, y) => (y === 13 ? 0xf4f0e8 : y === 12 ? 0xd8d4cc : x === -10 || x === 9 ? 0x8a8e96 : 0x6a4a3a)); // table
  for (const z of [-15, 15]) {
    const back = z < 0 ? -18 : 17;
    fill(v, -12, 11, 0, 8, Math.min(z - 2, z + 2), Math.max(z - 2, z + 2), (x, y) => (y === 8 ? 0xd8303a : y < 2 ? 0x5a2a2a : 0xc8202a));
    fill(v, -12, 11, 9, 24, back, back + (z < 0 ? 2 : -2), (x, y) => (y === 24 ? 0xe84a4a : (x + 40) % 6 === 0 ? 0xb81a22 : 0xc8202a));
  }
  // condiments: ketchup, mustard, napkins, a menu stand
  fill(v, -7, -6, 14, 18, -1, 0, 0xd8202a); v.set(-7, 19, -1, 0xf4f0e8);
  fill(v, -4, -3, 14, 17, -1, 0, 0xf8d040);
  fill(v, 4, 7, 14, 16, -2, 1, 0xffffff);
  const g = new THREE.Group(); g.add(vm(v, V5));
  g.userData.seats = [{ x: -0.3, z: -0.72, yaw: 0 }, { x: 0.3, z: -0.72, yaw: 0 }, { x: -0.3, z: 0.72, yaw: Math.PI }, { x: 0.3, z: 0.72, yaw: Math.PI }];
  g.userData.seatY = 9 * V5;
  return g;
}
function counterBar(len = 90) {
  const v = new VoxelModel();
  fill(v, 0, len - 1, 0, 19, -6, 5, (x, y, z) => (y >= 18 ? (y === 19 ? 0xf4f0e8 : 0xc8ccd4) : z === 5 && y % 6 === 0 ? 0xd8202a : z === 5 ? 0xf4ece0 : 0xe8e0d0));
  fill(v, 0, len - 1, 1, 2, 6, 6, 0xb8bcc4); // foot rail
  const g = new THREE.Group(); g.add(vm(v, V5));
  return g;
}
function barStool() {
  const v = new VoxelModel();
  fill(v, 0, 0, 0, 10, 0, 0, 0xc8ccd4); fill(v, -2, 2, 0, 0, -2, 2, 0x9aa0a8);
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= 10) { v.set(x, 11, z, 0xd8303a); v.set(x, 12, z, x * x + z * z < 5 ? 0xe84a4a : 0xd8303a); }
  return vm(v, V5, [0.5, 0, 0.5]);
}
function kitchen(onU) {
  const v = new VoxelModel(), gl = new VoxelModel();
  // back wall tiles + steel counters, flat-top stove, fryer, hood, shelves of plates, pass with heat lamps
  fill(v, 0, 89, 0, 17, -10, -1, (x, y, z) => (y === 17 ? 0xd8dce0 : x % 15 === 0 ? 0xa8acb4 : 0xc8ccd4));
  fill(v, 8, 30, 18, 18, -9, -2, 0x3a3a40); // flat-top
  for (let x = 10; x <= 28; x += 6) fill(gl, x, x + 2, 17, 17, -2, -2, 0xff6a1a); // flames under
  fill(v, 36, 46, 18, 21, -9, -2, 0xb8bcc4); fill(v, 37, 45, 21, 21, -8, -3, 0xe8b040); // fryer oil
  fill(v, 4, 52, 38, 44, -12, -4, (x, y) => (y === 38 ? 0x8a8e96 : 0xb8bcc4)); // hood
  for (const y of [26, 32]) { fill(v, 56, 86, y, y, -10, -6, 0xd8dce0); for (let x = 57; x < 86; x += 3) fill(v, x, x + 1, y + 1, y + 4, -9, -7, 0xffffff); }
  fill(gl, 6, 50, 37, 37, -6, -6, 0xfff0d0);
  const g = new THREE.Group(); g.add(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.2, mode: 3, onU }));
  return g;
}
function parfaitCase() {
  const v = new VoxelModel();
  fill(v, -12, 11, 0, 16, -6, 5, (x, y) => (y === 16 ? 0xc8ccd4 : 0xd8303a));
  fill(v, -12, 11, 17, 32, -6, -5, 0xf4f0e8);
  for (let i = 0; i < 4; i++) { const x = -9 + i * 6; fill(v, x, x + 2, 17, 22, -2, 0, 0xf4f8fc); fill(v, x, x + 2, 23, 25, -2, 0, [0xff9ac8, 0xf8d040, 0x8a4a2a, 0x58d870][i]); v.set(x + 1, 26, -1, 0xe8202a); }
  fill(v, -12, 11, 33, 33, -6, 5, 0xc8ccd4);
  const g = new THREE.Group(); g.add(vm(v, V5));
  const gp = glassPane(1.2, 0.8); gp.position.set(0, 1.25, 0.28); g.add(gp);
  return g;
}
function jukebox(onU) {
  const v = new VoxelModel(), gl = new VoxelModel();
  for (let y = 0; y < 36; y++) for (let x = -9; x <= 8; x++) { const top = y > 26 && Math.hypot(x + 0.5, y - 26) > 9.5; if (top) continue; for (let z = -5; z <= 4; z++) v.set(x, y, z, (x === -9 || x === 8) ? 0xb8803a : 0x8a4a2a); }
  for (let y = 4; y < 30; y++) for (const x of [-8, 7]) gl.set(x, y, 5, ['#ff6a8a', '#ffd040', '#6ad8ff'].length ? [0xff6a8a, 0xffd040, 0x6ad8ff][Math.floor(y / 4) % 3] : 0);
  fill(gl, -5, 4, 14, 22, 5, 5, 0xfff0c8);
  const g = new THREE.Group(); g.add(vm(v, V5), glowVm(gl, V5, [0, 0, 0], { intensity: 1.2, mode: 6, onU }));
  return g;
}
// the omurice (with a slot for a ketchup drawing)
export function omurice() {
  const v = new VoxelModel();
  for (let x = -8; x <= 8; x++) for (let z = -6; z <= 6; z++) if ((x / 8.5) ** 2 + (z / 6.5) ** 2 <= 1) v.set(x, 0, z, 0xffffff);
  ell(v, 0.5, 1.5, 0.5, 6, 2.6, 3.6, (x, y) => (y > 2 ? 0xfadc60 : 0xf8c838));
  v.set(5, 1, 3, 0x58a838); v.set(6, 1, 3, 0x58a838); // parsley
  const g = new THREE.Group(); g.add(vm(v, V25, [0.5, 0, 0.5]));
  const p = new PixCanvas(16, 10, 4020);
  const art = signPlane(p, 0.24, { alphaTest: 0.5 }); art.rotation.x = -Math.PI / 2; art.position.y = 4.2 * V25; g.add(art);
  g.userData.art = art; g.userData.pc = p;
  // draws a little turtle face in ketchup, stroke by stroke (k 0..1)
  g.userData.drawTurtle = (k) => {
    const c = p; c.clear();
    const R = '#d8201a';
    const pts = [];
    for (let a = 0; a < 26; a++) pts.push([8 + Math.cos(a / 26 * Math.PI * 2) * 4.5, 5 + Math.sin(a / 26 * Math.PI * 2) * 3.4]);
    const n = Math.floor(k * (pts.length + 6));
    for (let i = 0; i < Math.min(n, pts.length); i++) c.px(pts[i][0], pts[i][1], R);
    if (n > pts.length + 1) c.px(6, 4, R);
    if (n > pts.length + 2) c.px(10, 4, R);
    if (n > pts.length + 4) { c.px(7, 6, R); c.px(8, 7, R); c.px(9, 6, R); }
    if (n > pts.length + 5) { c.px(2, 5, R); c.px(14, 5, R); } // little flippers
    art.userData.tex.needsUpdate = true;
  };
  return g;
}

export class BendysLocation extends Location {
  constructor(game) {
    super(game, 'bendys', { bg: 0x1e1420, lightMode: 'interior', grade: 'cozy', ambience: 'restaurant' });
    this.camCfg = { wupp: 0.0122, pitch: 34, yaw: 0, follow: true, minWupp: 0.006, maxWupp: 0.02, followY: 0.9, bounds: { minX: -1.9, maxX: 1.9, minZ: -0.6, maxZ: 0.6 } };
    this.shadowSize = 9;
    this.clock = false;
    this.hourOverride = 19.4;
    this.sky = false;
    this.lightOverride = { hemiI: 1.6, sunI: 1.3, sky: 0xfff0e0, gnd: 0x7a4a40, sun: 0xffe8c8 };
  }
  async build() {
    const S = this.scene;
    this.onU = { value: 1 };
    this.updaters = [];
    const k = (this.kit = new HomeKit());
    const { w, d, h } = BEN;
    k.room({
      w, d, h, lowFront: 16, cap: 0xc8202a, base: 0xc8202a,
      floor: (x, z) => (((Math.floor((x + 400) / 6) + Math.floor((z + 400) / 6)) & 1) ? 0xf4ece0 : 0xc8302a),
      wall: (x, y, z, side) => (y < 20 ? (y === 19 ? 0xc8ccd4 : (side === 'back' ? x : z) % 8 === 0 ? 0xb81a22 : 0xc8202a) : y > h - 6 ? 0xf4f0e8 : tone(x, y, z, 0xfff0dc, 0xf8e8d0, 0xfff6e8, 0.08, 0.06)),
      windows: [{ side: 'left', a0: -30, a1: 10, y0: 26, y1: 48, frame: 0xc8ccd4, sky: (u, v) => hmix(0x2a3a6a, 0x5a4a8a, v) }],
    });
    // ---- booths along the back wall (left part), each with a pendant lamp
    this.booths = [];
    for (let i = 0; i < 3; i++) {
      const b = booth(); b.position.set(-4.3 + i * 1.75, 0, -1.85); b.rotation.y = Math.PI / 2; S.add(b); this.booths.push(b);
      const lv = new VoxelModel(), lg = new VoxelModel(); fill(lv, 0, 0, 0, 14, 0, 0, 0x3a3a40); for (let y = 0; y < 4; y++) for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) { const r = 1.5 + y; const dd = Math.hypot(x, z); if (dd <= r && dd > r - 1.1) lv.set(x, -y, z, 0xc8202a); } lg.set(0, -3, 0, 0xfff0c0); lg.set(-1, -3, 0, 0xfff0c0); lg.set(0, -3, -1, 0xfff0c0); lg.set(-1, -3, -1, 0xfff0c0);
      const lamp = new THREE.Group(); lamp.add(vm(lv, V25), glowVm(lg, V25, [0, 0, 0], { intensity: 1.4 })); lamp.position.set(b.position.x, 2.6, -1.85); S.add(lamp);
    }
    // ---- the counter on the right with stools, the kitchen behind it
    const ct = counterBar(76); ct.position.set(1.15, 0, -0.95); S.add(ct);
    this.stools = [];
    for (let i = 0; i < 5; i++) { const st = barStool(); st.position.set(1.45 + i * 0.68, 0, -0.25); S.add(st); this.stools.push(st); }
    const kt = kitchen(this.onU); kt.position.set(0.9, 0, W(-d / 2) + 0.55); S.add(kt); this.kitchen = kt;
    this.stove = { x: 0.9 + 19 * V5, y: 0.95, z: W(-d / 2) + 0.2 };
    const mw = signPlane(menuWall(), 2.6, { emissive: 0.5, onU: this.onU }); mw.position.set(3.05, 2.55, W(-d / 2) + 0.012); S.add(mw);
    const logo = signPlane(bendysLogo(), 2.2, { emissive: 0.7, onU: this.onU }); logo.position.set(-2.6, 2.45, W(-d / 2) + 0.012); S.add(logo);
    for (let i = 0; i < 2; i++) { const pp = signPlane(retroPoster(i), 0.42); pp.position.set(-4.95 + 0.01, 1.7, -1.2 + i * 0.9); pp.rotation.y = Math.PI / 2; S.add(pp); }
    // ---- front of house: parfait case, jukebox, a gacha machine by the door, plants
    const pc = parfaitCase(); pc.position.set(4.4, 0, 1.6); pc.rotation.y = -0.4; S.add(pc);
    const jb = jukebox(this.onU); jb.position.set(-4.6, 0, 0.9); jb.rotation.y = 0.5; S.add(jb);
    const gm = gachaMachine({ seed: 77, body: 0xf8e8e0 }); gm.position.set(-4.75, 0, 2.2); gm.rotation.y = 0.6; S.add(gm);
    k.add(hkPlant(k, { h: 14, r: 5, flower: 0xff8ab0 }), 4.7, 0, -0.2);
    // ---- a family table in the middle-front
    const tb = booth(); tb.position.set(-1.0, 0, 1.0); tb.rotation.y = 0; S.add(tb); this.frontTable = tb;
    k.finish({ lights: false, pitch: 34 });
    S.add(k.group);
    this.updaters.push((dt) => k.update(dt));
    // ---- nav
    const nav = this.makeNav('floor', { minX: W(-w / 2) + 0.25, minZ: W(-d / 2) + 0.3, w: W(w) - 0.5, d: W(d) - 0.5 });
    nav.block(-5.3, -3.1, 0.2, -1.0); nav.block(1.1, -3.1, 5.3, -0.65);
    for (const st of this.stools) nav.blockCircle(st.position.x, st.position.z, 0.18);
    nav.block(-2.1, 0.2, 0.1, 1.8); nav.block(3.8, 1.1, 5.3, 2.2); nav.block(-5.3, 0.4, -4.1, 2.6);
    this.navs.floor = nav;
    // ---- regulars
    this.crowd = new Crowd(this.game, this);
    this.populate();
  }
  populate() {
    const C = this.crowd;
    let seed = 700; const S = () => (seed += 13);
    const sit = (b, si, role, act) => { const st = b.userData.seats[si]; const yaw = b.rotation.y; const cx = b.position.x + st.x * Math.cos(yaw) + st.z * Math.sin(yaw), cz = b.position.z - st.x * Math.sin(yaw) + st.z * Math.cos(yaw); return C.add({ seed: S(), role }, { x: cx, z: cz, yaw: st.yaw + yaw, mode: 'sit', seatY: b.userData.seatY + 0.02, prop: false, act }); };
    sit(this.booths[0], 0, 'salaryman', 'eat'); sit(this.booths[0], 2, 'salaryman', 'drink');
    sit(this.booths[2], 1, 'shopper', 'eat'); sit(this.booths[2], 3, 'kid', 'eat'); sit(this.booths[2], 2, 'shopper', null);
    sit(this.booths[1], 0, 'student', 'phone'); sit(this.booths[1], 1, 'student', 'eat');
    // counter regulars
    for (const i of [0, 3]) C.add({ seed: S(), role: i ? 'worker' : 'granny' }, { x: this.stools[i].position.x, z: this.stools[i].position.z, yaw: Math.PI, mode: 'sit', seatY: 0.62, prop: false, act: i ? 'drink' : 'eat' });
  }
  async enter() {
    const g = this.game;
    g.rig.setFollow(null);
    g.rig.play({ x: 0, y: 0.9, z: 0.2, wupp: this.camCfg.wupp, pitch: this.camCfg.pitch, yaw: 0, dur: 0 });
  }
  update(dt, t) {
    for (const f of this.updaters) f(dt, t);
    this.crowd?.update(dt);
    if ((this._steamT = (this._steamT || 0) - dt) <= 0) {
      this._steamT = 0.5;
      this.game.particles?.emit('steam', { x: this.stove.x + (Math.random() - 0.5) * 0.6, y: this.stove.y + 0.1, z: this.stove.z, n: 1 });
    }
  }
}
