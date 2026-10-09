// Scene lighting: sun (shadow-casting directional), hemisphere fill and a
// little ambient, keyed over the time of day for each world. The Human World
// is grounded (cool shadows, white noon, orange sunset, blue night lit by
// street lamps); the Spirit Realm is warm and golden with soft violet shadows
// (its day is the Human World's night).
import * as THREE from 'three';
import { WORLD } from '../core/materials.js';

const HUMAN = [
  { h: 0, sun: 0x7f90d8, sunI: 0.35, sky: 0x3a4a7a, gnd: 0x1a1c2a, hemiI: 0.62, amb: 0x1a2040, ambI: 0.25, skyTint: 0x22305a, night: 1, clouds: 0.0 },
  { h: 5.2, sun: 0x9a88c8, sunI: 0.5, sky: 0x5a5a8e, gnd: 0x2a2634, hemiI: 0.7, amb: 0x2a2848, ambI: 0.25, skyTint: 0x6a6a9a, night: 0.8, clouds: 0.1 },
  { h: 6.5, sun: 0xffb38a, sunI: 1.5, sky: 0xc8bce8, gnd: 0x5e5048, hemiI: 1.05, amb: 0x4a4050, ambI: 0.2, skyTint: 0xf0c0a8, night: 0.15, clouds: 0.3 },
  { h: 9, sun: 0xfff2dc, sunI: 2.2, sky: 0xbfd8f8, gnd: 0x6a6658, hemiI: 1.25, amb: 0x506070, ambI: 0.18, skyTint: 0xb8d0e8, night: 0, clouds: 0.38 },
  { h: 13, sun: 0xfff8ec, sunI: 2.35, sky: 0xc6dcfa, gnd: 0x6e6a5c, hemiI: 1.3, amb: 0x506070, ambI: 0.18, skyTint: 0xc0d8f0, night: 0, clouds: 0.38 },
  { h: 16, sun: 0xffe2b8, sunI: 2.2, sky: 0xd4d4ee, gnd: 0x726450, hemiI: 1.2, amb: 0x5a5060, ambI: 0.18, skyTint: 0xd8d0d8, night: 0, clouds: 0.35 },
  { h: 17.6, sun: 0xffa868, sunI: 2.0, sky: 0xe8b8c0, gnd: 0x6e5246, hemiI: 1.05, amb: 0x5a4058, ambI: 0.2, skyTint: 0xffb890, night: 0.05, clouds: 0.3 },
  { h: 18.6, sun: 0xff7a58, sunI: 1.3, sky: 0xa888c0, gnd: 0x4a3a44, hemiI: 0.9, amb: 0x4a3a60, ambI: 0.25, skyTint: 0xc88aa0, night: 0.4, clouds: 0.2 },
  { h: 19.6, sun: 0x8a80d0, sunI: 0.55, sky: 0x4e5490, gnd: 0x242232, hemiI: 0.72, amb: 0x262a50, ambI: 0.28, skyTint: 0x3a4478, night: 0.9, clouds: 0.05 },
  { h: 24, sun: 0x7f90d8, sunI: 0.35, sky: 0x3a4a7a, gnd: 0x1a1c2a, hemiI: 0.62, amb: 0x1a2040, ambI: 0.25, skyTint: 0x22305a, night: 1, clouds: 0.0 },
];
// Spirit Realm: keyed on the *Human World* hour (its day is our night).
// 18:00 human = spirit dawn, 23:00 = spirit noon, 05:00 = spirit dusk.
const SPIRIT = [
  { h: 0, sun: 0xfff0d0, sunI: 2.3, sky: 0xd0e4ff, gnd: 0x7a8a50, hemiI: 1.35, amb: 0x605870, ambI: 0.2, skyTint: 0xc8e0ff, night: 0, clouds: 0.32 },
  { h: 3.5, sun: 0xffc880, sunI: 2.15, sky: 0xf0d0c8, gnd: 0x80704c, hemiI: 1.2, amb: 0x6a5068, ambI: 0.22, skyTint: 0xffd0a0, night: 0, clouds: 0.3 },
  { h: 5.5, sun: 0xff8a68, sunI: 1.6, sky: 0xc898d0, gnd: 0x5a4450, hemiI: 1.0, amb: 0x5a4070, ambI: 0.26, skyTint: 0xe0a0b8, night: 0.3, clouds: 0.2 },
  { h: 7, sun: 0x9a8ae0, sunI: 0.7, sky: 0x5a5aa0, gnd: 0x2a2a40, hemiI: 0.8, amb: 0x302c60, ambI: 0.3, skyTint: 0x4a4a90, night: 0.85, clouds: 0.05 },
  { h: 17, sun: 0x9a8ae0, sunI: 0.7, sky: 0x5a5aa0, gnd: 0x2a2a40, hemiI: 0.8, amb: 0x302c60, ambI: 0.3, skyTint: 0x4a4a90, night: 0.85, clouds: 0.05 },
  { h: 18.5, sun: 0xffb08a, sunI: 1.7, sky: 0xe8c0d8, gnd: 0x6a5a50, hemiI: 1.1, amb: 0x5a4a68, ambI: 0.22, skyTint: 0xffc8b0, night: 0.15, clouds: 0.25 },
  { h: 20.5, sun: 0xfff0d0, sunI: 2.25, sky: 0xd0e4ff, gnd: 0x7a8a50, hemiI: 1.32, amb: 0x605870, ambI: 0.2, skyTint: 0xc8e0ff, night: 0, clouds: 0.32 },
  { h: 24, sun: 0xfff0d0, sunI: 2.3, sky: 0xd0e4ff, gnd: 0x7a8a50, hemiI: 1.35, amb: 0x605870, ambI: 0.2, skyTint: 0xc8e0ff, night: 0, clouds: 0.32 },
];
// interiors: mostly lamp light, a little daylight through windows
const INTERIOR = [
  { h: 0, sun: 0x8a90d0, sunI: 0.25, sky: 0x8a7a90, gnd: 0x3a2e30, hemiI: 0.75, amb: 0x5a4a50, ambI: 0.35, skyTint: 0x30385a, night: 1, clouds: 0 },
  { h: 7, sun: 0xffd2a8, sunI: 1.1, sky: 0xd8ccc8, gnd: 0x6a5648, hemiI: 1.05, amb: 0x605050, ambI: 0.3, skyTint: 0xd0c0c0, night: 0, clouds: 0 },
  { h: 13, sun: 0xfff2e0, sunI: 1.3, sky: 0xdcd4cc, gnd: 0x6a5a4c, hemiI: 1.1, amb: 0x605050, ambI: 0.3, skyTint: 0xd8d0d0, night: 0, clouds: 0 },
  { h: 18, sun: 0xffa070, sunI: 0.9, sky: 0xc0a8b0, gnd: 0x5a4640, hemiI: 0.95, amb: 0x604858, ambI: 0.32, skyTint: 0xc09090, night: 0.3, clouds: 0 },
  { h: 20, sun: 0x8a90d0, sunI: 0.3, sky: 0x8a7a90, gnd: 0x3a2e30, hemiI: 0.8, amb: 0x5a4a50, ambI: 0.35, skyTint: 0x30385a, night: 1, clouds: 0 },
  { h: 24, sun: 0x8a90d0, sunI: 0.25, sky: 0x8a7a90, gnd: 0x3a2e30, hemiI: 0.75, amb: 0x5a4a50, ambI: 0.35, skyTint: 0x30385a, night: 1, clouds: 0 },
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
    sc.near = 1; sc.far = 120; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.025;
    this.hemi = new THREE.HemisphereLight(0xc4dcff, 0x5b6a3a, 1.1);
    this.amb = new THREE.AmbientLight(0x404050, 0.2);
    this.group = new THREE.Group();
    this.group.add(this.sun, this.sun.target, this.hemi, this.amb);
    scene.add(this.group);
    this.mode = 'human';
    this.hour = 12;
    this.night = 0;
    this.sunAzimuth = 0.6; // radians, where the sun comes from (around y)
    this.sunElev = 0.9;
    this.override = null; // { sun, sunI, ... } for cutscenes
    this.focus = new THREE.Vector3();
    this.shadowSize = 16;
  }
  attach(scene) { if (this.group.parent !== scene) scene.add(this.group); }
  setShadowSize(s) {
    this.shadowSize = s;
    const sc = this.sun.shadow.camera;
    sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s;
    sc.updateProjectionMatrix();
  }
  update(hour, focus, dt = 0) {
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
    lerpHex(a.amb, b.amb, t, this.amb.color);
    this.amb.intensity = a.ambI + (b.ambI - a.ambI) * t;
    lerpHex(a.skyTint, b.skyTint, t, WORLD.uSkyTint.value);
    this.night = a.night + (b.night - a.night) * t;
    WORLD.uNight.value = this.night;
    WORLD.uCloudAmt.value = (a.clouds + (b.clouds - a.clouds) * t) * (this.cloudMul ?? 1);
    if (this.override) {
      const o = this.override;
      if (o.sun != null) this.sun.color.setHex(o.sun);
      if (o.sunI != null) this.sun.intensity = o.sunI;
      if (o.hemiI != null) this.hemi.intensity = o.hemiI;
      if (o.sky != null) this.hemi.color.setHex(o.sky);
      if (o.gnd != null) this.hemi.groundColor.setHex(o.gnd);
    }
    // sun direction: arcs across the sky; low and long in the morning / evening
    const dayT = this.mode === 'spirit' ? ((hour + 6) % 24) / 24 : hour / 24;
    const elev = this.override?.elev ?? Math.max(0.35, Math.sin(Math.PI * Math.min(1, Math.max(0, (dayT * 24 - 5.5) / 13.5))) * 1.05);
    const az = this.sunAzimuth + (dayT - 0.5) * 1.4;
    const d = 40;
    if (focus) this.focus.copy(focus);
    const f = this.focus;
    this.sun.position.set(f.x + Math.sin(az) * Math.cos(elev) * d, f.y + Math.sin(elev) * d, f.z + Math.cos(az) * Math.cos(elev) * d);
    this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
    // snap the light (and its target) to the shadow-map texel grid so
    // shadows don't shimmer while the camera pans
    const texel = (this.shadowSize * 2) / this.sun.shadow.mapSize.x;
    const ox = Math.round(this.sun.target.position.x / texel) * texel - this.sun.target.position.x;
    const oz = Math.round(this.sun.target.position.z / texel) * texel - this.sun.target.position.z;
    this.sun.position.x += ox; this.sun.position.z += oz;
    this.sun.target.position.x += ox; this.sun.target.position.z += oz;
    this.sun.target.updateMatrixWorld();
  }
  sunDir(out = new THREE.Vector3()) { return out.copy(this.sun.position).sub(this.sun.target.position).normalize(); }
}
