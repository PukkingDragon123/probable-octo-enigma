// Hokori (埃): little dust spirits. A fuzzy grey ball with two big googly
// eyes (pixel planes that look around and blink), tiny stubby feet, and a
// body that squashes and stretches as it hops. They chatter in squeaks,
// teleport with a dust poof, and carry things on their heads.
//   const h = new Hokori({ seed, size, tint });  scene.add(h.root)
//   h.hopTo(x, z) -> Promise     h.poofTo(x, z, particles) -> Promise
//   h.emote('heart' | 'excl' | ...) via game.emotes.show(h, ...)
//   h.carry(obj) / h.drop()      h.lookAt(x, z) / h.lookAt(null)
import * as THREE from 'three';
import { VoxelModel, vm, signPlane, ell, hash3, V25 } from '../world/build.js';
import { PixCanvas } from '../core/pixtex.js';

const _v = new THREE.Vector3();

function bodyModel(seed, r, tint) {
  const v = new VoxelModel();
  const greys = [0x8a8a96, 0x9a9aa8, 0xaeaebc, 0xc0c0cc].map((c) => (tint ? mix3(c, tint, 0.25) : c));
  ell(v, 0.5, r, 0.5, r * 1.05, r, r, (x, y, z) => { const h = hash3(x, y, z + seed); return h < 0.08 ? null : greys[Math.floor(h * greys.length)]; });
  // fluffy tufts sticking out all over
  for (let i = 0; i < 26; i++) {
    const a = hash3(i, seed, 1) * Math.PI * 2, b = (hash3(seed, i, 2) - 0.3) * Math.PI;
    const x = Math.round(Math.cos(a) * Math.cos(b) * (r + 1)), y = Math.round(r + Math.sin(b) * (r + 1)), z = Math.round(Math.sin(a) * Math.cos(b) * (r + 1));
    v.set(x, y, z, greys[i % greys.length]);
  }
  for (let i = 0; i < 3; i++) v.set(i - 1, r * 2 + 1 + (i === 1 ? 1 : 0), 0, greys[3]); // a little cowlick
  return v;
}
function mix3(a, b, t) { const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t, g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t; return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl); }

// eye sheet: open (pupil drawn at runtime) / blink
function eyeCanvas() { const p = new PixCanvas(20, 12, 7001); return p; }
function drawEyes(p, lx, ly, blink, happy) {
  p.clear();
  for (const cx of [5, 15]) {
    if (blink) { p.hline(cx - 4, cx + 4, 6, '#1a1420'); p.hline(cx - 3, cx + 3, 7, '#1a1420'); continue; }
    if (happy) { p.line(cx - 4, 7, cx, 3, '#1a1420'); p.line(cx, 3, cx + 4, 7, '#1a1420'); p.line(cx - 4, 8, cx, 4, '#1a1420'); p.line(cx, 4, cx + 4, 8, '#1a1420'); continue; }
    p.circle(cx, 6, 5, '#1a1420'); p.circle(cx, 6, 4.2, '#ffffff');
    p.circle(cx + lx * 1.6, 6 + ly * 1.4, 2.1, '#1a1420');
    p.px(cx - 2, 3, '#ffffff'); p.px(cx - 1, 3, '#ffffff');
  }
}
export class Hokori {
  constructor({ seed = 1, size = 1, tint = null } = {}) {
    this.seed = seed;
    const r = Math.round(5 * size);
    this.r = r;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mesh = vm(bodyModel(seed, r, tint), V25, [0.5, 0, 0.5]);
    this.body.add(this.mesh);
    // feet
    const fv = new VoxelModel(); for (const x of [-2, 1]) { fv.set(x, 0, 1, 0x6a6268); fv.set(x + 1, 0, 1, 0x6a6268); fv.set(x, 0, 2, 0x5a5258); }
    this.feet = vm(fv, V25, [0.5, 0, 0.5]); this.root.add(this.feet);
    // eyes
    this.eyePc = eyeCanvas();
    this.eyes = signPlane(this.eyePc, r * 2 * V25 * 1.05, { alphaTest: 0.5 });
    this.eyes.position.set(0, r * 1.1 * V25, (r + 0.6) * V25);
    this.body.add(this.eyes);
    this.look = { x: 0, y: 0 }; this.lookGoal = { x: 0, y: 0 };
    this.blinkT = 2 + Math.random() * 3; this.blinking = 0; this.happy = 0;
    this.x = 0; this.z = 0; this.y = 0; this.yaw = 0; this.yawGoal = 0;
    this.sq = 0; this.sqV = 0;
    this.hop = null; this.t = Math.random() * 10;
    this.carried = null;
    this.lookTarget = null;
    this.height = r * 2 * V25;
    this.isHokori = true;
    this.redrawEyes();
  }
  get isCharacter() { return true; }
  headPos(out = new THREE.Vector3()) { return out.set(this.x, this.y + this.height + 0.05, this.z); }
  setPos(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.sync(); return this; }
  faceYaw(y) { this.yawGoal = y; return this; }
  faceTo(x, z) { this.yawGoal = Math.atan2(x - this.x, z - this.z); return this; }
  lookAt(t) { this.lookTarget = t; return this; }
  setHappy(s = 1.5) { this.happy = s; this.redrawEyes(); }
  squash(k) { this.sqV += k * 12; }
  carry(obj) { this.carried = obj; this.body.add(obj); obj.position.set(0, this.height + 0.02, 0); }
  drop() { const o = this.carried; if (o) this.body.remove(o); this.carried = null; return o; }
  redrawEyes() { drawEyes(this.eyePc, this.look.x, this.look.y, this.blinking > 0, this.happy > 0); this.eyes.userData.tex.needsUpdate = true; }
  // hop along to a point (a series of little bounces)
  hopTo(x, z, { speed = 1.6, height = 0.12 } = {}) {
    return new Promise((res) => { this.hop = { x0: this.x, z0: this.z, x, z, t: 0, dur: Math.max(0.2, Math.hypot(x - this.x, z - this.z) / speed), h: height, res }; this.faceTo(x, z); });
  }
  // vanish in a puff of dust and reappear somewhere else
  async poofTo(x, z, game) {
    game?.particles?.emit('dustPuff', { x: this.x, y: 0.1, z: this.z, n: 6 });
    game?.audio?.play?.('poof', { volume: 0.35, pitch: 1.3 });
    this.root.visible = false;
    await game.director.wait(0.35);
    this.setPos(x, z);
    game?.particles?.emit('dustPuff', { x, y: 0.1, z, n: 6 });
    this.root.visible = true;
    this.squash(0.5);
  }
  sync() { this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw; }
  update(dt) {
    this.t += dt;
    // hop motion
    if (this.hop) {
      const H = this.hop; H.t += dt;
      const k = Math.min(1, H.t / H.dur);
      this.x = H.x0 + (H.x - H.x0) * k; this.z = H.z0 + (H.z - H.z0) * k;
      const bounces = Math.max(1, Math.round(H.dur / 0.28));
      const ph = (k * bounces) % 1;
      this.y = Math.sin(ph * Math.PI) * H.h;
      if (ph < 0.12 && !H.landed) { H.landed = true; this.squash(0.25); } else if (ph > 0.5) H.landed = false;
      if (k >= 1) { this.y = 0; this.hop = null; this.squash(0.35); H.res(); }
    } else {
      // idle: a slow breathing wobble and the occasional little bounce
      this.y = Math.max(0, Math.sin(this.t * 1.7 + this.seed) * 0.008);
      if (Math.random() < dt * 0.15) this.squash(0.2);
    }
    // squash & stretch spring
    this.sqV += (-this.sq * 90 - this.sqV * 9) * dt; this.sq += this.sqV * dt;
    const s = Math.max(-0.4, Math.min(0.4, this.sq));
    this.body.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
    // turning
    let d = this.yawGoal - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 10);
    // eyes: look toward a target (relative to facing), blink now and then
    if (this.lookTarget) {
      const tp = this.lookTarget.isObject3D ? this.lookTarget.getWorldPosition(_v) : _v.set(this.lookTarget.x, this.lookTarget.y ?? 0.5, this.lookTarget.z);
      const a = Math.atan2(tp.x - this.x, tp.z - this.z) - this.yaw;
      this.lookGoal.x = Math.max(-1, Math.min(1, Math.sin(a) * 1.6)); this.lookGoal.y = Math.max(-1, Math.min(1, -(tp.y - (this.y + this.height)) * 1.2));
    } else if (Math.random() < dt * 0.5) { this.lookGoal.x = Math.random() * 2 - 1; this.lookGoal.y = Math.random() * 1.2 - 0.6; }
    const ox = this.look.x, oy = this.look.y;
    this.look.x += (this.lookGoal.x - this.look.x) * Math.min(1, dt * 12); this.look.y += (this.lookGoal.y - this.look.y) * Math.min(1, dt * 12);
    let redraw = Math.round(ox * 2) !== Math.round(this.look.x * 2) || Math.round(oy * 2) !== Math.round(this.look.y * 2);
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.12; this.blinkT = 2 + Math.random() * 4; redraw = true; }
    if (this.blinking > 0) { this.blinking -= dt; if (this.blinking <= 0) redraw = true; }
    if (this.happy > 0) { this.happy -= dt; if (this.happy <= 0) redraw = true; }
    if (redraw) this.redrawEyes();
    // feet patter while hopping
    this.feet.position.y = this.hop ? Math.abs(Math.sin(this.t * 20)) * 0.01 : 0;
    this.sync();
  }
}

// a little band of Hokori milling about an area, for ambience
export class HokoriFlock {
  constructor(game, scene, { n = 5, area, nav = null } = {}) {
    this.g = game; this.list = [];
    for (let i = 0; i < n; i++) {
      const h = new Hokori({ seed: i * 7 + 3, size: 0.8 + Math.random() * 0.4 });
      h.setPos(area.x0 + Math.random() * (area.x1 - area.x0), area.z0 + Math.random() * (area.z1 - area.z0));
      scene.add(h.root);
      this.list.push({ h, wait: Math.random() * 3 });
    }
    this.area = area; this.nav = nav;
  }
  update(dt) {
    for (const f of this.list) {
      f.h.update(dt);
      if (f.h.hop || f.busy) continue;
      f.wait -= dt;
      if (f.wait > 0) continue;
      f.wait = 1 + Math.random() * 4;
      const A = this.area;
      let x = f.h.x + (Math.random() - 0.5) * 1.6, z = f.h.z + (Math.random() - 0.5) * 1.2;
      x = Math.max(A.x0, Math.min(A.x1, x)); z = Math.max(A.z0, Math.min(A.z1, z));
      if (this.nav && !this.nav.okXZ(x, z)) continue;
      if (Math.random() < 0.15) { f.h.setHappy(1.2); f.h.squash(0.6); }
      f.h.hopTo(x, z, { speed: 1.2 + Math.random() * 0.8 });
    }
  }
}
