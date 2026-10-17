// First person, in 3D: the camera becomes Mamo's eyes (a real perspective
// camera inside the carriage) and his own voxel hands hold the phone up in
// front of him — green turtle fingers wrapped round a navy case with a fish
// charm swinging off the corner, the mustard hoodie sleeves, the right thumb
// reaching over to tap. The phone's screen shows Nanpure, live; you tap the
// actual 3D screen. The window, the seat in front and the landscape rolling
// by are all really there around you.
//
//   const won = await game.fp.play({ eye: {x,y,z}, look: {x,y,z}, seed: 7 });
import * as THREE from 'three';
import { VoxelModel, vm, fill, tone, sh } from '../world/build.js';
import { rbox } from '../vox/kit.js';
import { emitMat } from '../core/materials.js';
import { Nanpure } from '../ui/nanpure.js';

const VP = 0.004; // voxel size for the hands and phone (they're close to the eye)
const SKIN = 0x94bf6c, SKIN_L = 0xb4d488, SKIN_D = 0x6e9a50, NAIL = 0xdcecb6;
const HOOD = 0xd99a3c, HOOD_L = 0xeab45a, HOOD_D = 0xb47a2c, CUFF = 0xb8782a, CUFF_D = 0x8e5a1e;
const CASE = 0x27314f, CASE_L = 0x3c4a74, CASE_D = 0x1a2038, BEZEL = 0x101014;
// phone size in voxels: 18 x 36 x 3 (0.072 x 0.144 x 0.012 m); screen 0.064 x 0.120
const PW = 18, PH = 36;
const SCR = { w: 0.064, h: 0.12, y: 0.004 };

function phoneModel() {
  const v = new VoxelModel();
  const x0 = -PW / 2, x1 = PW / 2 - 1, y0 = -PH / 2, y1 = PH / 2 - 1;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    // rounded corners
    const cx = x < x0 + 2 ? x0 + 2 - x : x > x1 - 2 ? x - (x1 - 2) : 0, cy = y < y0 + 2 ? y0 + 2 - y : y > y1 - 2 ? y - (y1 - 2) : 0;
    if (cx * cx + cy * cy > 5) continue;
    const edge = cx > 0 || cy > 0 || x === x0 || x === x1 || y === y0 || y === y1;
    for (let z = -2; z <= 0; z++) {
      let c = z === 0 ? (edge ? CASE_L : BEZEL) : z === -1 ? CASE : CASE_D;
      if (z === 0 && !edge && (x === x0 + 1 || x === x1 - 1 || y === y0 + 1 || y === y1 - 1)) c = CASE;
      v.set(x, y, z, c);
    }
  }
  // volume buttons on the right edge, the speaker slit and the little camera
  for (let y = 5; y <= 9; y++) v.set(x1 + 1, y, -1, CASE_L);
  for (let x = -2; x <= 1; x++) v.set(x, y1 - 1, 1, 0x2a2a36);
  v.set(4, y1 - 1, 1, 0x1e2a4a);
  return v;
}
function fishCharm() {
  const v = new VoxelModel();
  const blue = 0x5ab0e8, dk = 0x3a7ac0;
  for (const [x, y, c] of [[0, 0, blue], [1, 0, blue], [2, 0, blue], [-1, 0, blue], [0, 1, blue], [1, 1, 0x8ad0f8], [0, -1, dk], [1, -1, dk], [-2, 1, dk], [-2, -1, dk], [-2, 0, dk]]) v.set(x, y, 0, c);
  v.set(2, 1, 0, 0x1a1a2a);
  return vm(v, VP * 0.8, [0, 0, 0.5], { cast: false });
}
// a chunky turtle hand cupping the phone's lower corner from behind: a round
// mitten palm (the fingers wrap the back, out of sight). 0.003 m voxels.
const VH = 0.003;
function handModel(side) {
  const v = new VoxelModel();
  for (let x = -10; x <= 10; x++) for (let y = -11; y <= 9; y++) for (let z = -8; z <= 2; z++) {
    const nx = x / 10.2, ny = y / 10.5, nz = (z + 3) / 5.4;
    if (nx * nx + ny * ny + nz * nz > 1) continue;
    // light from the window (the left): lit edge, shaded underside, a knuckle line
    const lit = side * x < -4 ? 1 : 0, low = y < -6 ? 1 : 0;
    let c = low ? SKIN_D : lit ? SKIN_L : SKIN;
    if (y === 3 && z > 0 && Math.abs(x) < 7) c = SKIN_D;
    v.set(x, y, z, c);
  }
  return vm(v, VH, [0, 0, 0], { cast: false });
}
function thumbModel() {
  // a thumb along +y from its base: tapering, a rounded tip and a nail on the front
  const v = new VoxelModel();
  for (let y = 0; y <= 15; y++) {
    const r = 3.2 - y * 0.06 - (y > 12 ? (y - 12) * 0.7 : 0);
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      if (x * x + (z * 1.15) * (z * 1.15) > r * r) continue;
      let c = tone(x, y, z, SKIN, SKIN_D, SKIN_L, 0.05, 0.06);
      if (z >= 2 && y >= 10 && Math.abs(x) <= 1.5) c = y === 15 ? SKIN_L : NAIL;
      else if (x <= -2) c = SKIN_D; else if (x >= 2 && z > 0) c = SKIN_L;
      if (y === 7 && z > 1) c = SKIN_D; // the knuckle crease
      v.set(x, y, z, c);
    }
  }
  return vm(v, VH, [0, 0, 0], { cast: false });
}
function sleeveModel() {
  // a hoodie sleeve: a fat tube along -y with a ribbed cuff at the top
  const v = new VoxelModel();
  for (let y = -48; y <= 0; y++) {
    const r = y > -7 ? 7.2 : 8.4 + Math.sin(y * 0.4) * 0.5;
    for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) {
      const d = Math.hypot(x, z);
      if (d > r || d < r - 2.2) continue;
      let c;
      if (y > -7) c = ((Math.atan2(z, x) * 5 + 20) | 0) % 2 ? CUFF : CUFF_D;
      else c = (y % 11 === 0 && x > 0) ? HOOD_D : x < -3 ? HOOD_L : x > 4 ? HOOD_D : HOOD;
      v.set(x, y, z, c);
    }
  }
  return vm(v, VP, [0, 0, 0], { cast: false });
}

export class FirstPerson {
  constructor(game) {
    this.game = game;
    this.app = new Nanpure(game, 126, 236);
    this.active = false;
    this.tex = new THREE.CanvasTexture(this.app.cv);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.build();
    this._down = (e) => this.onDown(e);
    this._move = (e) => this.onMove(e);
  }
  build() {
    const root = (this.root = new THREE.Group());
    const hold = (this.hold = new THREE.Group()); // the phone, in camera space
    root.add(hold);
    const phone = (this.phone = new THREE.Group());
    hold.add(phone);
    phone.add(vm(phoneModel(), VP, [0, 0, 0], { cast: false }));
    const scr = (this.screen = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), emitMat({ map: this.tex, intensity: 1.05 })));
    scr.position.set(0, SCR.y, VP + 0.0006);
    phone.add(scr);
    // a fish charm on a cord from the top-left corner
    this.charm = new THREE.Group();
    this.charm.position.set(-PW / 2 * VP + 0.004, PH / 2 * VP - 0.002, -0.004);
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.03, 0.0012), new THREE.MeshLambertMaterial({ color: 0xd84a3a }));
    cord.position.y = -0.015; this.charm.add(cord);
    const fish = fishCharm(); fish.position.y = -0.033; fish.rotation.z = 0.2; this.charm.add(fish);
    phone.add(this.charm);
    // hands and sleeves
    this.handL = new THREE.Group(); this.handR = new THREE.Group();
    const hl = handModel(-1); this.handL.add(hl);
    const hr = handModel(1); this.handR.add(hr);
    this.thumbL = thumbModel(); this.thumbL.position.set(0.008, 0.0, 0.011); this.thumbL.rotation.z = -0.55; this.thumbL.scale.setScalar(0.88); this.handL.add(this.thumbL);
    this.thumbR = thumbModel(); this.thumbR.position.set(-0.008, 0.0, 0.011); this.thumbR.rotation.z = 0.55; this.thumbR.scale.setScalar(0.88); this.handR.add(this.thumbR);
    for (const [h, s] of [[this.handL, -1], [this.handR, 1]]) {
      const sl = sleeveModel();
      sl.position.set(s * 0.01, -0.028, -0.008);
      sl.rotation.set(-1.0, 0, s * 0.5);
      h.add(sl);
    }
    this.restL = new THREE.Vector3(-0.03, -0.066, 0);
    this.restR = new THREE.Vector3(0.03, -0.066, 0);
    this.handL.position.copy(this.restL); this.handR.position.copy(this.restR);
    phone.add(this.handL, this.handR);
    // the screen's glow on the thumbs
    this.glow = new THREE.PointLight(0xfff4e0, 0.02, 0.12, 2);
    this.glow.position.set(0, 0, 0.05); phone.add(this.glow);
    // where the thumb tip sits relative to the right hand
    this.tipR = new THREE.Vector3(-0.008 - Math.sin(0.55) * 0.039, Math.cos(0.55) * 0.039, 0.02);
    root.visible = false;
  }
  // ------------------------------------------------------------ flow
  play({ eye, look, seed = 7, fov = 56 } = {}) {
    const g = this.game;
    this.app.start(seed);
    g.rig.setPov({ eye, look, fov }, { snap: true });
    this.eye = eye; this.look = look;
    g.location.scene.add(this.root);
    this.root.visible = true;
    this.active = true;
    this.t = 0;
    this.hand = { x: 0, y: 0, press: 0 };
    this.lowered = 0; this.lowerGoal = 0;
    addEventListener('pointerdown', this._down, true);
    addEventListener('pointermove', this._move, true);
    return new Promise((res) => { this.resolve = res; });
  }
  stop() {
    const g = this.game;
    this.active = false;
    this.root.visible = false;
    this.root.parent?.remove(this.root);
    removeEventListener('pointerdown', this._down, true);
    removeEventListener('pointermove', this._move, true);
    g.rig.clearPov();
  }
  // tap the real screen: ray from the pointer into the scene, hit the phone
  onDown(e) {
    if (!this.active || this.app.won || this.app.screen === 'photo') return;
    if (e.target && e.target.closest && e.target.closest('.bubble, .ui-btn, button')) return;
    e.stopPropagation(); e.preventDefault();
    const g = this.game;
    const ray = g.rig.screenRay(e.clientX, e.clientY, g.renderer);
    const rc = this._rc || (this._rc = new THREE.Raycaster());
    rc.ray.copy(ray);
    const hit = rc.intersectObject(this.screen, false)[0];
    if (hit && hit.uv) this.app.tap(hit.uv.x * this.app.W, (1 - hit.uv.y) * this.app.H);
    else if (this.app.screen === 'lock') this.app.openApp();
  }
  onMove(e) {
    if (!this.active || !this.game.rig.pov) return;
    const P = this.game.rig.pov;
    P.offset.set((e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2);
  }
  // ------------------------------------------------------------ per frame
  update(dt) {
    if (!this.active) return;
    const g = this.game, cam = g.rig.camera;
    this.t += dt;
    const A = this.app;
    A.update(dt);
    A.draw();
    this.tex.needsUpdate = true;
    // the phone floats in front of the eyes with a soft lag and the train's sway
    const sc = g.location?.scenery, sp = sc ? sc.speed : 0.5, t = this.t;
    this.root.position.copy(cam.position);
    this.root.quaternion.copy(cam.quaternion);
    this.hold.position.set(0.004 + Math.sin(t * 0.8) * 0.0012, -0.004 + Math.sin(t * 1.4) * 0.001 + Math.sin(t * 9) * 0.0003 * sp, -0.178);
    this.hold.rotation.set(0.08 + Math.sin(t * 0.6) * 0.012, -0.05 + Math.sin(t * 0.5) * 0.015, 0.03 + Math.sin(t * 0.7) * 0.01);
    // lowered: the phone drops toward the lap when you look up at someone
    this.lowered += (this.lowerGoal - this.lowered) * (1 - Math.exp(-dt * 4));
    this.hold.position.y -= this.lowered * 0.11; this.hold.position.z += this.lowered * 0.03;
    this.hold.rotation.x -= this.lowered * 0.6;
    this.charm.rotation.z = Math.sin(t * 2.2) * 0.35 + Math.sin(t * 8.7) * 0.08 * sp;
    this.charm.rotation.x = Math.sin(t * 1.7) * 0.2;
    // the right hand reaches so the thumb tip lands on what you tapped
    const T = A.thumb;
    let gx = this.restR.x, gy = this.restR.y, gz = 0;
    if (!T.rest) {
      const lx = -SCR.w / 2 + (T.tx / A.W) * SCR.w, ly = SCR.y + SCR.h / 2 - (T.ty / A.H) * SCR.h;
      gx = lx - this.tipR.x; gy = ly - this.tipR.y; gz = T.press > 0.08 ? -0.0015 : 0.004;
    }
    const k = 1 - Math.exp(-dt * 16);
    this.handR.position.x += (gx - this.handR.position.x) * k;
    this.handR.position.y += (gy - this.handR.position.y) * k;
    this.handR.position.z += (gz - this.handR.position.z) * k;
    this.thumbR.rotation.x = T.press > 0.08 ? 0.25 : 0;
    this.handL.position.y = this.restL.y + Math.sin(t * 1.1) * 0.0008;
    // the screen glows a little warmer in the dark
    const tk = sc ? sc.tunnelK : 0;
    this.glow.intensity = 0.012 + tk * 0.03;
    if (A.done && this.resolve) { const r = this.resolve; this.resolve = null; r(true); }
  }
}
