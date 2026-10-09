// Scene lighting, keyed over the time of day, tuned to The Bear Must Eat:
// a strong warm sun from the viewer's upper left (so voxel tops are bright,
// fronts lit, right sides in soft violet shade, and the 3D light matches the
// top-left light painted into every pixel sprite), a hemisphere fill (blue
// sky / olive ground), and the sky gradient behind everything.
//
// Modes: 'human' (grounded day/night), 'spirit' (warm and golden, its day is
// our night), 'interior' (cut-away rooms: warm bright fill like TBME's homes).
// The sun is camera-relative unless `fixedAzimuth` is set (train windows...).
import * as THREE from 'three';
import { WORLD } from '../core/materials.js';
import { Sky } from './sky.js';

// h: hour; sun/sunI: key light; sky/gnd/hemiI: fill; top/bot: sky gradient;
// tint: world sky tint (wet reflections, water); night 0..1; clouds: cloud shadows
const HUMAN = [
  { h: 0, sun: 0x8fa8ff, sunI: 0.55, sky: 0x40508a, gnd: 0x1e2232, hemiI: 0.85, top: 0x050a22, bot: 0x14204a, tint: 0x203060, night: 1, clouds: 0 },
  { h: 5.5, sun: 0xa890d8, sunI: 0.7, sky: 0x5a5290, gnd: 0x2a2436, hemiI: 0.85, top: 0x1a2250, bot: 0x6a4a78, tint: 0x6a5080, night: 0.8, clouds: 0.05 },
  { h: 7, sun: 0xffb488, sunI: 1.45, sky: 0xc4b8ea, gnd: 0x5c4c3c, hemiI: 1.15, top: 0x6a8ad0, bot: 0xf2c0a0, tint: 0xf0b8a0, night: 0.1, clouds: 0.25 },
  { h: 9, sun: 0xfff0d2, sunI: 1.85, sky: 0xbcd6ff, gnd: 0x6c7a46, hemiI: 1.5, top: 0x74ade6, bot: 0xd8ecf6, tint: 0xc8e0f0, night: 0, clouds: 0.32 },
  { h: 12.5, sun: 0xfff7e6, sunI: 2.0, sky: 0xc4dcff, gnd: 0x707e48, hemiI: 1.55, top: 0x62a4ea, bot: 0xcfe8f8, tint: 0xd0e8f8, night: 0, clouds: 0.34 },
  { h: 15.5, sun: 0xffe8c4, sunI: 2.0, sky: 0xd2d6f2, gnd: 0x76724a, hemiI: 1.48, top: 0x6aa2e0, bot: 0xe8e4d8, tint: 0xe0e0e0, night: 0, clouds: 0.32 },
  { h: 17, sun: 0xffc47e, sunI: 2.1, sky: 0xf0c8cc, gnd: 0x7c6646, hemiI: 1.38, top: 0xe6996a, bot: 0xffd9a0, tint: 0xffc890, night: 0, clouds: 0.28 },
  { h: 18.4, sun: 0xff8c60, sunI: 1.8, sky: 0xcaa2cc, gnd: 0x5c4842, hemiI: 1.2, top: 0x7c5aa6, bot: 0xff9468, tint: 0xff9a80, night: 0.2, clouds: 0.18 },
  { h: 19.6, sun: 0xa080d8, sunI: 0.9, sky: 0x6e6cac, gnd: 0x302e44, hemiI: 0.95, top: 0x262c66, bot: 0x8a5a8c, tint: 0x7060a0, night: 0.75, clouds: 0.05 },
  { h: 21, sun: 0x8fa8ff, sunI: 0.6, sky: 0x40508a, gnd: 0x1e2232, hemiI: 0.85, top: 0x0a1030, bot: 0x1c2a58, tint: 0x203868, night: 1, clouds: 0 },
  { h: 24, sun: 0x8fa8ff, sunI: 0.55, sky: 0x40508a, gnd: 0x1e2232, hemiI: 0.85, top: 0x050a22, bot: 0x14204a, tint: 0x203060, night: 1, clouds: 0 },
];
// Spirit Realm, keyed on the Human World hour (18:00 human = spirit dawn,
// ~23:00 spirit noon, ~05:00 spirit dusk). Warmer, more golden, violet shade.
const SPIRIT = [
  { h: 0, sun: 0xfff2d8, sunI: 2.05, sky: 0xd8e4ff, gnd: 0x7e8a48, hemiI: 1.55, top: 0x6eb4f0, bot: 0xffe8c8, tint: 0xd8e8f8, night: 0, clouds: 0.3 },
  { h: 3.5, sun: 0xffc47e, sunI: 2.1, sky: 0xf4c8d0, gnd: 0x86704a, hemiI: 1.42, top: 0xf0a070, bot: 0xffe0a8, tint: 0xffc890, night: 0, clouds: 0.28 },
  { h: 5.2, sun: 0xff8c60, sunI: 1.8, sky: 0xd0a2d0, gnd: 0x604a46, hemiI: 1.25, top: 0x8a5ab0, bot: 0xff9a70, tint: 0xff9a80, night: 0.15, clouds: 0.18 },
  { h: 6.5, sun: 0xb08ae0, sunI: 1.0, sky: 0x7a70b8, gnd: 0x3a3450, hemiI: 1.0, top: 0x2e3070, bot: 0x9a6aa0, tint: 0x8070b0, night: 0.7, clouds: 0.05 },
  { h: 7.5, sun: 0x9ab0ff, sunI: 0.75, sky: 0x5060a0, gnd: 0x26283a, hemiI: 0.95, top: 0x0e1640, bot: 0x2a3a70, tint: 0x304080, night: 1, clouds: 0 },
  { h: 16.5, sun: 0x9ab0ff, sunI: 0.75, sky: 0x5060a0, gnd: 0x26283a, hemiI: 0.95, top: 0x0e1640, bot: 0x2a3a70, tint: 0x304080, night: 1, clouds: 0 },
  { h: 18.0, sun: 0xffb08a, sunI: 1.5, sky: 0xd0b8e8, gnd: 0x605048, hemiI: 1.2, top: 0x7a8ad8, bot: 0xffc8a8, tint: 0xf8b8a8, night: 0.15, clouds: 0.22 },
  { h: 19.5, sun: 0xfff0d0, sunI: 1.95, sky: 0xd0e0ff, gnd: 0x7a8a48, hemiI: 1.5, top: 0x78b4ee, bot: 0xfff0d8, tint: 0xd8e8f8, night: 0, clouds: 0.3 },
  { h: 24, sun: 0xfff2d8, sunI: 2.05, sky: 0xd8e4ff, gnd: 0x7e8a48, hemiI: 1.55, top: 0x6eb4f0, bot: 0xffe8c8, tint: 0xd8e8f8, night: 0, clouds: 0.3 },
];
// cut-away interiors (TBME home kit): warm bright hemi + a front key light;
// at night the key drops and lamps (point lights / emissive) take over
const INTERIOR = [
  { h: 0, sun: 0xffd8a8, sunI: 0.55, sky: 0xc8a8a0, gnd: 0x3a2e30, hemiI: 1.05, top: 0x1a1420, bot: 0x2a1e2a, tint: 0x30385a, night: 1, clouds: 0 },
  { h: 7, sun: 0xfff0dc, sunI: 0.95, sky: 0xffe8cc, gnd: 0x5a4636, hemiI: 1.55, top: 0x2a2028, bot: 0x3a2c30, tint: 0xd0c0c0, night: 0, clouds: 0 },
  { h: 13, sun: 0xfff4e4, sunI: 1.0, sky: 0xffeedc, gnd: 0x5a4a3a, hemiI: 1.6, top: 0x2a2028, bot: 0x3a2c30, tint: 0xd8d0d0, night: 0, clouds: 0 },
  { h: 17.5, sun: 0xffd0a0, sunI: 0.95, sky: 0xffdcc0, gnd: 0x5a4234, hemiI: 1.5, top: 0x2a2028, bot: 0x3a2c30, tint: 0xc09090, night: 0.2, clouds: 0 },
  { h: 20, sun: 0xffd8a8, sunI: 0.6, sky: 0xd8b0a0, gnd: 0x3e3032, hemiI: 1.1, top: 0x1a1420, bot: 0x2a1e2a, tint: 0x30385a, night: 1, clouds: 0 },
  { h: 24, sun: 0xffd8a8, sunI: 0.55, sky: 0xc8a8a0, gnd: 0x3a2e30, hemiI: 1.05, top: 0x1a1420, bot: 0x2a1e2a, tint: 0x30385a, night: 1, clouds: 0 },
];
export const LIGHT_KEYS = { human: HUMAN, spirit: SPIRIT, interior: INTERIOR };

const cA = new THREE.Color(), cB = new THREE.Color();
const lerpHex = (a, b, t, out) => { cA.setHex(a); cB.setHex(b); return out.copy(cA).lerp(cB, t); };

export class Lighting {
  constructor(scene) {
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.near = 1; sc.far = 160; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.hemi = new THREE.HemisphereLight(0xc4dcff, 0x5b6a3a, 1.1);
    this.group = new THREE.Group();
    this.group.add(this.sun, this.sun.target, this.hemi);
    this.sky = new Sky();
    this.group.add(this.sky.mesh);
    scene.add(this.group);
    this.mode = 'human';
    this.hour = 12;
    this.night = 0;
    this.override = null; // { sun, sunI, hemiI, sky, gnd, elev, azimuth, top, bot } for cutscenes
    this.fixedAzimuth = null; // world azimuth (radians) for scenes lit through windows
    this.camYaw = 0;
    this.focus = new THREE.Vector3();
    this.shadowSize = 16;
    this.skyOn = true;
    this.dir = new THREE.Vector3(0, 1, 0);
  }
  attach(scene) { if (this.group.parent !== scene) scene.add(this.group); }
  setShadowSize(s) {
    this.shadowSize = s;
    const sc = this.sun.shadow.camera;
    sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s;
    sc.updateProjectionMatrix();
  }
  update(hour, focus, dt = 0, time = 0) {
    this.hour = hour;
    const K = LIGHT_KEYS[this.mode] || HUMAN;
    let a = K[0], b = K[1];
    for (let i = 0; i < K.length - 1; i++) if (hour >= K[i].h && hour <= K[i + 1].h) { a = K[i]; b = K[i + 1]; break; }
    const t = (hour - a.h) / Math.max(1e-4, b.h - a.h);
    lerpHex(a.sun, b.sun, t, this.sun.color);
    this.sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    lerpHex(a.sky, b.sky, t, this.hemi.color);
    lerpHex(a.gnd, b.gnd, t, this.hemi.groundColor);
    this.hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;
    lerpHex(a.tint, b.tint, t, WORLD.uSkyTint.value);
    const su = this.sky.uniforms;
    lerpHex(a.top, b.top, t, su.uTop.value);
    lerpHex(a.bot, b.bot, t, su.uBottom.value);
    this.night = a.night + (b.night - a.night) * t;
    WORLD.uNight.value = this.night;
    su.uNight.value = this.mode === 'interior' ? 0 : this.night;
    su.uTime.value = time;
    su.uYaw.value = this.camYaw;
    WORLD.uCloudAmt.value = (a.clouds + (b.clouds - a.clouds) * t) * (this.cloudMul ?? 1);
    const o = this.override;
    if (o) {
      if (o.sun != null) this.sun.color.setHex(o.sun);
      if (o.sunI != null) this.sun.intensity = o.sunI;
      if (o.hemiI != null) this.hemi.intensity = o.hemiI;
      if (o.sky != null) this.hemi.color.setHex(o.sky);
      if (o.gnd != null) this.hemi.groundColor.setHex(o.gnd);
      if (o.top != null) su.uTop.value.setHex(o.top);
      if (o.bot != null) su.uBottom.value.setHex(o.bot);
    }
    this.sky.mesh.visible = this.skyOn;
    // ---- sun direction
    // day progress 0..1 (for elevation and the sweep from front-left to left)
    const dayT = this.mode === 'spirit' ? (((hour - 18) % 24) + 24) % 24 / 12 : (hour - 6.5) / 13.3;
    const k = Math.min(1, Math.max(0, dayT));
    const elev = o?.elev ?? (this.mode === 'interior' ? 0.95 : 0.42 + Math.sin(k * Math.PI) * 0.62);
    let az; // world azimuth of the direction TO the light (0 = +z)
    if (o?.azimuth != null) az = o.azimuth;
    else if (this.fixedAzimuth != null) az = this.fixedAzimuth;
    else {
      // camera-relative: from the viewer's upper left, a little more frontal in the morning
      const rel = -0.45 - k * 0.55; // radians to the left of "towards the camera"
      az = this.camYaw + rel;
    }
    const ce = Math.cos(elev);
    this.dir.set(Math.sin(az) * ce, Math.sin(elev), Math.cos(az) * ce).normalize();
    const d = 60;
    if (focus) this.focus.copy(focus);
    const f = this.focus;
    // snap the shadow camera to its texel grid in light space (no shimmer while panning)
    const basis = this._basis || (this._basis = new THREE.Object3D());
    basis.position.set(0, 0, 0); basis.up.set(0, 1, 0);
    basis.lookAt(-this.dir.x, -this.dir.y, -this.dir.z);
    basis.updateMatrixWorld(true);
    const e = basis.matrixWorld.elements;
    const R = (this._R ||= new THREE.Vector3()).set(e[0], e[1], e[2]);
    const U = (this._U ||= new THREE.Vector3()).set(e[4], e[5], e[6]);
    const texel = (this.shadowSize * 2) / this.sun.shadow.mapSize.x;
    const p = (this._p ||= new THREE.Vector3()).set(f.x, f.y, f.z);
    const ra = p.dot(R), ua = p.dot(U);
    p.addScaledVector(R, Math.round(ra / texel) * texel - ra).addScaledVector(U, Math.round(ua / texel) * texel - ua);
    this.sun.target.position.copy(p);
    this.sun.position.set(p.x + this.dir.x * d, p.y + this.dir.y * d, p.z + this.dir.z * d);
    this.sun.target.updateMatrixWorld();
  }
  sunDir(out = new THREE.Vector3()) { return out.copy(this.dir); }
}
