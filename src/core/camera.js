// Orthographic diorama camera, snapped to the low-res pixel grid for stable
// pixel art (sub-pixel remainder applied in the post pass).
//
// It has two layers:
//  - a gameplay rig: follow a character, pan / zoom, soft room bounds, gentle
//    look-ahead, 45-degree rotation;
//  - cinematic "shots" layered on top: tweened framing (target, zoom, pitch,
//    yaw, roll-free), handheld sway, shake, and "phases" (street, interior,
//    close-up) that buildings use when you walk in or out.
import * as THREE from 'three';
import { clamp, damp, angleDiff, EASE, lerp } from './util.js';

const _v = new THREE.Vector3();
const _R = new THREE.Vector3();
const _U = new THREE.Vector3();
const _F = new THREE.Vector3();

export class CameraRig {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
    this.target = new THREE.Vector3(0, 0, 0);
    this.goal = this.target.clone();
    this.yaw = 0; this.yawGoal = 0;
    this.pitch = THREE.MathUtils.degToRad(38); this.pitchGoal = this.pitch;
    this.dist = 120;
    this.wupp = 0.016; this.wuppGoal = 0.016; // world units per low-res pixel
    this.minWupp = 0.004; this.maxWupp = 0.2;
    this.subpixel = new THREE.Vector2();
    this.bounds = null; // { minX, maxX, minZ, maxZ } soft
    this.follow = null; // object with .x/.z (and optional .y) or THREE.Object3D
    this.followOffset = new THREE.Vector3();
    this.lookAhead = 0.6;
    this.shake = 0;
    this.sway = 0; // handheld amount (cutscenes)
    this.time = 0;
    this._rt = { w: 1, h: 1 };
    this.shot = null; // active tween
    this.userZoomEnabled = true;
    this.userPanEnabled = false;
    this._velX = 0; this._velZ = 0; this._lastFX = null; this._lastFZ = null;
    this.stiffness = 7;
    // cut plane: geometry more than `clip` metres in front of the target (towards
    // the camera) is sliced away, so close-ups can look through seats and walls
    this.clip = 0;
    // narrow places (a street seen side-on) keep the framing near a fixed depth
    // instead of chasing the character's z: goal.z = lerp(follow z, lockZ, lockK)
    this.lockZ = null; this.lockK = 0.85;
  }

  // ------------------------------------------------------------ gameplay
  setBounds(b) { this.bounds = b; }
  setFollow(obj, offset = null) { this.follow = obj; if (offset) this.followOffset.copy(offset); this._lastFX = null; }
  _fpos(o) {
    if (!o) return null;
    if (o.isObject3D) { o.getWorldPosition(_v); return { x: _v.x, y: _v.y, z: _v.z }; }
    return { x: o.x, y: o.y ?? 0, z: o.z };
  }

  panPixels(dx, dy, renderer) {
    const wuppCss = this.wupp * (renderer.dpr || 1) / renderer.pixelScale;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const rx = cy, rz = -sy, fx = -sy, fz = -cy;
    const gx = dx * wuppCss, gy = dy * wuppCss / Math.sin(this.pitch);
    this.goal.x -= rx * gx - fx * gy;
    this.goal.z -= rz * gx - fz * gy;
    this.clampGoal();
  }
  clampGoal() {
    const b = this.bounds;
    if (!b) return;
    this.goal.x = clamp(this.goal.x, b.minX, b.maxX);
    this.goal.z = clamp(this.goal.z, b.minZ, b.maxZ);
  }
  zoom(factor) { this.wuppGoal = clamp(this.wuppGoal * factor, this.minWupp, this.maxWupp); }
  rotate(steps) { this.yawGoal += steps * Math.PI / 4; }
  lookAt(x, z, instant = false, y = 0) {
    this.goal.set(x, y, z);
    if (instant) this.target.copy(this.goal);
  }
  snap() { this.target.copy(this.goal); this.wupp = this.wuppGoal; this.yaw = this.yawGoal; this.pitch = this.pitchGoal; }

  // ------------------------------------------------------------ cinematic shots
  // shot({ x, y, z, wupp, pitch (deg), yaw (deg), dur, ease, hold, clip }) -> Promise
  // Any field left out keeps its current value. dur 0 = cut.
  play(s) {
    if (this.shot && this.shot.resolve) this.shot.resolve();
    const from = { x: this.target.x, y: this.target.y, z: this.target.z, wupp: this.wupp, pitch: this.pitch, yaw: this.yaw };
    const to = {
      x: s.x ?? from.x, y: s.y ?? from.y, z: s.z ?? from.z,
      wupp: s.wupp ?? from.wupp,
      pitch: s.pitch != null ? THREE.MathUtils.degToRad(s.pitch) : from.pitch,
      yaw: s.yaw != null ? THREE.MathUtils.degToRad(s.yaw) : from.yaw,
    };
    to.yaw = from.yaw + angleDiff(from.yaw, to.yaw);
    const dur = s.dur ?? 1.2;
    if (s.follow !== undefined) this.follow = s.follow;
    if (s.clip !== undefined) this.clip = s.clip || 0;
    return new Promise((resolve) => {
      this.shot = { from, to, t: 0, dur, ease: EASE[s.ease || 'inOutCubic'] || EASE.inOutCubic, resolve, keep: s.keep !== false };
      if (dur <= 0) this._applyShot(1);
    });
  }
  _applyShot(k) {
    const S = this.shot, f = S.from, t = S.to;
    this.target.set(lerp(f.x, t.x, k), lerp(f.y, t.y, k), lerp(f.z, t.z, k));
    this.goal.copy(this.target);
    this.wupp = Math.exp(lerp(Math.log(f.wupp), Math.log(t.wupp), k));
    this.wuppGoal = this.wupp;
    this.pitch = lerp(f.pitch, t.pitch, k); this.pitchGoal = this.pitch;
    this.yaw = lerp(f.yaw, t.yaw, k); this.yawGoal = this.yaw;
    if (k >= 1) { const r = S.resolve; this.shot = null; r && r(); }
  }
  cancelShot() { if (this.shot) { const r = this.shot.resolve; this.shot = null; r && r(); } }

  // ------------------------------------------------------------ per frame
  update(dt, renderer) {
    if (!(dt >= 0)) dt = 0;
    this.time += dt;
    this._rt.w = renderer.rtW; this._rt.h = renderer.rtH;
    if (this.shot) {
      const S = this.shot;
      S.t += dt;
      const u = S.dur <= 0 ? 1 : clamp(S.t / S.dur, 0, 1);
      this._applyShot(S.ease(u));
    } else {
      const fp = this._fpos(this.follow);
      if (fp) {
        // look a little ahead of where the character is heading
        if (this._lastFX != null && dt > 0) {
          const vx = (fp.x - this._lastFX) / dt, vz = (fp.z - this._lastFZ) / dt;
          this._velX = damp(this._velX, clamp(vx, -4, 4), 3, dt);
          this._velZ = damp(this._velZ, clamp(vz, -4, 4), 3, dt);
        }
        this._lastFX = fp.x; this._lastFZ = fp.z;
        this.goal.x = fp.x + this.followOffset.x + this._velX * this.lookAhead * 0.35;
        this.goal.z = fp.z + this.followOffset.z + this._velZ * this.lookAhead * 0.35;
        if (this.lockZ != null) this.goal.z = lerp(this.goal.z, this.lockZ, this.lockK);
        this.goal.y = (fp.y || 0) * 0.5 + this.followOffset.y;
        this.clampGoal();
      }
      const k = this.stiffness;
      this.target.x = damp(this.target.x, this.goal.x, k, dt);
      this.target.y = damp(this.target.y, this.goal.y, k, dt);
      this.target.z = damp(this.target.z, this.goal.z, k, dt);
      this.yaw += angleDiff(this.yaw, this.yawGoal) * (1 - Math.exp(-8 * dt));
      this.pitch = damp(this.pitch, this.pitchGoal, 6, dt);
      this.wupp = Math.exp(damp(Math.log(this.wupp), Math.log(this.wuppGoal), 8, dt));
    }
    if (!Number.isFinite(this.wupp)) this.wupp = this.wuppGoal = 0.016;
    if (!Number.isFinite(this.target.x) || !Number.isFinite(this.target.z)) this.target.set(0, 0, 0);

    const cam = this.camera;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    let tx = this.target.x, ty = this.target.y, tz = this.target.z;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const a = this.shake * this.shake * 0.25;
      tx += (Math.random() - 0.5) * a;
      tz += (Math.random() - 0.5) * a;
      ty += (Math.random() - 0.5) * a * 0.5;
    }
    if (this.sway > 0) {
      const T = this.time, a = this.sway * this.wupp * 6;
      tx += (Math.sin(T * 0.53) + Math.sin(T * 1.31) * 0.4) * a;
      tz += (Math.sin(T * 0.41 + 1.2) + Math.sin(T * 1.07) * 0.3) * a;
    }
    cam.position.set(tx + Math.sin(this.yaw) * cp * this.dist, ty + sp * this.dist, tz + Math.cos(this.yaw) * cp * this.dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(tx, ty, tz);
    cam.updateMatrixWorld(true);
    // snap to the texel grid in view space
    const e = cam.matrixWorld.elements;
    _R.set(e[0], e[1], e[2]);
    _U.set(e[4], e[5], e[6]);
    const w = this.wupp;
    const px = cam.position.dot(_R) / w, py = cam.position.dot(_U) / w;
    const fx = px - Math.round(px), fy = py - Math.round(py);
    cam.position.addScaledVector(_R, -fx * w).addScaledVector(_U, -fy * w);
    this.subpixel.set(fx, fy);
    const hw = (renderer.rtW * w) / 2, hh = (renderer.rtH * w) / 2;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
    cam.near = this.clip > 0 ? Math.max(1, this.dist - this.clip) : 1; cam.far = this.dist * 2 + 200;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------ picking helpers
  screenRay(cssX, cssY, renderer, outRay) {
    const dpr = renderer.dpr || 1;
    const lowX = (cssX * dpr) / renderer.pixelScale + this.subpixel.x + 1;
    const lowY = (renderer.H - cssY * dpr) / renderer.pixelScale + this.subpixel.y + 1;
    const ndcX = (lowX / renderer.rtW) * 2 - 1;
    const ndcY = (lowY / renderer.rtH) * 2 - 1;
    const ray = outRay || new THREE.Ray();
    ray.origin.set(ndcX, ndcY, -1).unproject(this.camera);
    _F.set(0, 0, -1).transformDirection(this.camera.matrixWorld);
    ray.direction.copy(_F);
    return ray;
  }
  screenNDC(cssX, cssY, renderer, out = new THREE.Vector2()) {
    const dpr = renderer.dpr || 1;
    const lowX = (cssX * dpr) / renderer.pixelScale + this.subpixel.x + 1;
    const lowY = (renderer.H - cssY * dpr) / renderer.pixelScale + this.subpixel.y + 1;
    return out.set((lowX / renderer.rtW) * 2 - 1, (lowY / renderer.rtH) * 2 - 1);
  }
  screenToGround(cssX, cssY, renderer, h = 0, out = new THREE.Vector3()) {
    const ray = this.screenRay(cssX, cssY, renderer);
    const t = (h - ray.origin.y) / ray.direction.y;
    return out.copy(ray.origin).addScaledVector(ray.direction, t);
  }
  worldToScreen(p, renderer, out = { x: 0, y: 0, visible: true }) {
    _v.copy(p).project(this.camera);
    const lowX = ((_v.x + 1) / 2) * renderer.rtW - 1 - this.subpixel.x;
    const lowY = ((_v.y + 1) / 2) * renderer.rtH - 1 - this.subpixel.y;
    const dpr = renderer.dpr || 1;
    out.x = (lowX * renderer.pixelScale) / dpr;
    out.y = (renderer.H - lowY * renderer.pixelScale) / dpr;
    out.visible = _v.z > -1 && _v.z < 1 && _v.x > -1.1 && _v.x < 1.1 && _v.y > -1.1 && _v.y < 1.1;
    return out;
  }
  // CSS px per world unit at the current zoom (for sizing DOM bits in-world)
  cssPerUnit(renderer) { return renderer.pixelScale / (this.wupp * (renderer.dpr || 1)); }
  viewDir(out = new THREE.Vector3()) { return out.set(0, 0, -1).transformDirection(this.camera.matrixWorld); }
}
