// Scenery: the endless, hand-painted landscape outside the Kodama's windows.
//
// A stack of parallax layers (clouds, distant ranges, forested hills, the
// plain, the old houses by the line, the catenary and embankment right
// outside) — each an endless strip painted chunk by chunk into a ring-buffer
// texture as the train moves, so it never repeats. A shader lights them by
// time of day: atmospheric haze per layer, paddies and rivers mirroring the
// sky with glints, clouds blushing at sunset, windows and neon coming on at
// dusk, a motion smear on the fastest layer, and a dithered sky with the sun.
//
//   const S = new Scenery({ tsz: 0.0068, horizonY: 1.15, z: -1.4, layout: 'window' });
//   scene.add(S.group);
//   S.setSegment('tea'); S.setTime('golden', 8); S.speedGoal = 1;
//   S.update(dt, camX, viewHalfWidthWorld);
import * as THREE from 'three';
import { Brush, SOFT, NOINK, darkenPacked, pk } from './core.js';
import { paintClouds, paintFar, paintHills } from './far.js';
import { paintFarGround, paintNear } from './ground.js';
import { paintTrack, paintFore } from './track.js';

const RING = 2048;
// first person: how far away each layer stands, and the angle one texel spans
const PERSP_D = { clouds: 1300, far: 950, hills: 520, plain: 210, near: 64, track: 6.5 };
const ANG = 0.009;
export const SEGMENTS = ['country', 'farm', 'tea', 'mountain', 'village', 'valley', 'city', 'tunnel', 'station'];
// old names: the river and the sea are gone from the view (no open water), farmland and a wooded valley stand in
const ALIAS = { river: 'farm', sea: 'valley' };
const INK = pk('#141018');

// time-of-day looks
export const LOOKS = {
  day: { top: '#2a74e0', hor: '#b8e0fa', sun: '#fff4d0', glow: 0.25, tint: '#fffbf0', haze: '#c4ddf4', cLit: '#ffffff', cShade: '#aebfdc', rim: '#ffffff', lights: 0, stars: 0, sunX: 0.78, sunY: 0.9, hazeK: 1 },
  golden: { top: '#4c78d4', hor: '#ffcc8a', sun: '#ffd27a', glow: 0.65, tint: '#ffe2b4', haze: '#f6caa0', cLit: '#fff0d4', cShade: '#b8a2c0', rim: '#fff0b0', lights: 0.08, stars: 0, sunX: 0.8, sunY: 0.5, hazeK: 1.1 },
  sunset: { top: '#3c3c9e', hor: '#ff8a52', sun: '#ff9a40', glow: 1.0, tint: '#ffb48e', haze: '#f0907e', cLit: '#ffb68a', cShade: '#76578e', rim: '#ffe09c', lights: 0.5, stars: 0, sunX: 0.82, sunY: 0.16, hazeK: 1.15 },
  dusk: { top: '#1f275a', hor: '#cc7878', sun: '#ff7a60', glow: 0.45, tint: '#8e86b8', haze: '#6e6292', cLit: '#c486a0', cShade: '#363866', rim: '#ff9a8a', lights: 1, stars: 0.35, sunX: 0.85, sunY: -0.1, hazeK: 1 },
  night: { top: '#090d24', hor: '#242a56', sun: '#c8d4ff', glow: 0.05, tint: '#56598a', haze: '#262a4c', cLit: '#4a5080', cShade: '#181c38', rim: '#6a70a0', lights: 1, stars: 1, sunX: 0.7, sunY: 0.8, hazeK: 0.8 },
  rain: { top: '#727c8e', hor: '#b2bac4', sun: '#e4e8f0', glow: 0.04, tint: '#b0b8c6', haze: '#a6aebb', cLit: '#cdd2da', cShade: '#7a8092', rim: '#e0e4ea', lights: 0.35, stars: 0, sunX: 0.8, sunY: 0.8, hazeK: 1.4 },
};

// layer stack. spd: texels/s at full speed; par: how much camera panning moves it;
// fog: atmospheric haze; H: rows; hz: horizon row; gy: ground row; ch: chunk width
const STACK = {
  window: [
    { id: 'clouds', H: 96, hz: 92, spd: 1.6, par: 0.02, fog: 0.08, ch: 64, paint: paintClouds, mode: 1, blend: 1 },
    { id: 'far', H: 110, hz: 100, spd: 3, par: 0.04, fog: 0.2, ch: 64, paint: paintFar, blend: 160, ink: 'sil', silCol: pk('#4a5884') },
    { id: 'hills', H: 96, hz: 88, spd: 10, par: 0.1, fog: 0.1, ch: 64, paint: paintHills, blend: 100, ink: 'sil', silCol: pk('#10241a'), inkCol: INK },
    { id: 'plain', H: 56, hz: 22, spd: 28, par: 0.25, fog: 0.04, ch: 128, paint: paintFarGround, blend: 40, ink: 'obj', inkCol: pk('#1c1a24') },
    { id: 'near', H: 140, hz: 76, gy: 84, spd: 95, par: 0.55, fog: 0.0, ch: 128, paint: paintNear, blend: 30, ink: 'obj', inkCol: INK },
    { id: 'track', H: 110, hz: 60, gy: 86, mastTop: 0, wireY: 6, masts: false, spd: 280, par: 0.9, fog: 0.0, ch: 256, paint: paintTrack, blend: 1, smear: 1, ink: 'obj', inkCol: INK },
  ],
  // outside the train: the same country at a wider scale, plus a fast bank of
  // grass and flowers in front of the train
  outside: [
    { id: 'clouds', H: 160, hz: 156, spd: 2.7, par: 0.02, fog: 0.08, ch: 64, paint: paintClouds, mode: 1, blend: 1 },
    { id: 'far', H: 120, hz: 106, spd: 5.4, par: 0.04, fog: 0.42, ch: 64, paint: paintFar, blend: 200, ink: 'sil', silCol: pk('#4a5884') },
    { id: 'hills', H: 96, hz: 88, spd: 18, par: 0.1, fog: 0.2, ch: 64, paint: paintHills, blend: 120, ink: 'sil', silCol: pk('#10241a'), inkCol: INK },
    { id: 'plain', H: 64, hz: 22, spd: 48, par: 0.25, fog: 0.08, ch: 128, paint: paintFarGround, blend: 40, ink: 'obj', inkCol: pk('#1c1a24') },
    { id: 'near', H: 220, hz: 76, gy: 92, spd: 143, par: 0.55, fog: 0.03, ch: 128, paint: paintNear, blend: 30, ink: 'obj', inkCol: INK },
    { id: 'track', H: 170, hz: 15, gy: 160, mastTop: 12, wireY: 30, masts: false, spd: 354, par: 0.9, fog: 0.0, ch: 256, paint: paintTrack, blend: 1, smear: 1 },
    { id: 'fore', H: 90, hz: -140, gy: 16, spd: 612, par: 1.2, fog: 0.0, ch: 256, paint: paintFore, blend: 1, smear: 1, front: 9.5 },
  ],
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const LAYER_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 size;
uniform float offset;
uniform float mode;
uniform float smear;
uniform vec3 tint, haze, top, hor, sunCol, cLit, cShade, rimCol;
uniform float fogAmt, lights, time, sunAmt, dim;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec4 tx(float u, float v) { return texture2D(map, vec2(u / size.x, v / size.y)); }
void main() {
  float u = floor((vUv.x - 0.5) * size.x + offset) + 0.5;
  float v = floor((1.0 - vUv.y) * size.y) + 0.5;
  vec4 t = tx(u, v);
  if (smear > 0.5) {
    // motion smear: the colours this pixel saw during the frame
    vec3 acc = vec3(0.0); float n = 0.0;
    for (int i = 0; i < 7; i++) {
      vec4 s = tx(u - float(i) * smear / 7.0, v);
      if (s.a > 0.4) { acc += lin(s.rgb) * (s.a > 0.955 && s.a < 0.96 ? 2.2 : 1.0); n += 1.0; }
    }
    if (n / 7.0 < bayer4(gl_FragCoord.xy) * 0.9 + 0.05) discard;
    vec3 c = acc / max(n, 1.0) * tint * dim;
    gl_FragColor = vec4(mix(c, haze, fogAmt), 1.0);
    return;
  }
  float a = floor(t.a * 255.0 + 0.5);
  if (a < 100.0) discard;
  vec3 c;
  float f = fogAmt;
  if (a > 238.5 && a < 241.5) { // cloud
    c = mix(cShade, cLit, t.r) + rimCol * t.g * 0.4;
  } else if (a > 250.5 && a < 253.5) { // water mirrors the sky
    vec3 refl = mix(hor, top, t.r * 0.85);
    refl = mix(refl, refl * 0.5 + vec3(0.01, 0.025, 0.035), t.b);
    float gl = t.g * (0.55 + 0.45 * sin(time * 2.6 + u * 0.37 + v * 1.7));
    float sp = step(0.988, hash(vec2(floor(u / 3.0) + floor(time * 5.0) * 17.0, v)));
    c = refl + sunCol * (gl * 0.55 + sp * 0.6 * sunAmt);
    c *= mix(vec3(1.0), tint, 0.35);
  } else if (a > 246.5 && a < 250.5) { // a window: dark glass by day, warm at night
    float on = step(hash(vec2(floor(u / 4.0), floor(v / 4.0))) * 0.9 + 0.05, lights);
    vec3 glass = mix(vec3(0.03, 0.04, 0.07), hor * 0.35, 0.4) * tint;
    c = mix(glass, lin(t.rgb) * 2.4, on);
    f *= 0.35;
  } else if (a > 242.5 && a < 246.5) { // always lit: lanterns, neon, vending machines
    c = lin(t.rgb) * (1.0 + lights * 1.6);
    f *= 0.3;
  } else {
    c = lin(t.rgb) * tint;
  }
  c = mix(c * dim, haze, f);
  gl_FragColor = vec4(c, 1.0);
}
`;
const SKY_FRAG = /* glsl */ `
uniform vec3 top, hor, sunCol;
uniform vec2 sunPos;
uniform float glow, stars, horizonV, aspect, time, dim;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  float t = clamp((vUv.y - horizonV) / (1.0 - horizonV), 0.0, 1.0);
  float b = bayer4(gl_FragCoord.xy);
  float q = floor(pow(t, 0.65) * 20.0 + b) / 20.0;
  vec3 c = mix(hor, top, q);
  vec2 d = (vUv - sunPos) * vec2(aspect, 1.0);
  float r = length(d);
  // banded glow around the sun, and a big soft warm wash near the horizon
  float g = glow * (exp(-r * 5.0) * 0.9 + exp(-r * 1.6) * 0.35);
  g = floor(g * 9.0 + b) / 9.0;
  c += sunCol * g;
  c += sunCol * glow * 0.25 * (1.0 - t) * (1.0 - t);
  if (r < 0.032) c = mix(c, sunCol * 1.5 + 0.3, step(r, 0.026) + 0.5 * step(0.026, r));
  // stars
  if (stars > 0.01) {
    vec2 sp = floor(gl_FragCoord.xy);
    float s = step(0.9965, hash(sp + floor(vUv.x * 0.0)));
    float tw = 0.6 + 0.4 * sin(time * 2.0 + hash(sp) * 30.0);
    c += vec3(0.9, 0.92, 1.0) * s * tw * stars * t;
  }
  gl_FragColor = vec4(c * dim, 1.0);
}
`;

const col = (hex) => new THREE.Color(hex);

export class Scenery {
  constructor({ tsz = 0.0068, horizonY = 1.15, z = -1.4, refZ = null, layout = 'window', skyW = 40, skyH = 8, ids = null } = {}) {
    this.tsz = tsz; this.horizonY = horizonY; this.z = z; this.refZ = refZ ?? z;
    this.view = { x: 0, z: 0, yaw: 0, pitch: 0, halfW: 3 };
    this.group = new THREE.Group();
    this.speed = 1; this.speedGoal = 1;
    this.time = 0;
    this.look = { ...LOOKS.day };
    this.lookFrom = LOOKS.day; this.lookTo = LOOKS.day; this.lookK = 1; this.lookDur = 1;
    this.timeName = 'day';
    this.dim = 1; // tunnel darkness etc.
    this.pending = null;
    this.U = {
      tint: { value: col('#ffffff') }, haze: { value: col('#d0e2f2') }, top: { value: col('#3f84de') }, hor: { value: col('#cfe6f6') },
      sunCol: { value: col('#fff6dc') }, cLit: { value: col('#ffffff') }, cShade: { value: col('#aebfdc') }, rimCol: { value: col('#ffffff') },
      lights: { value: 0 }, time: { value: 0 }, sunAmt: { value: 0.3 }, dim: { value: 1 },
    };
    // sky
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SKY_FRAG, depthWrite: true,
      uniforms: { top: this.U.top, hor: this.U.hor, sunCol: this.U.sunCol, time: this.U.time, dim: this.U.dim, sunPos: { value: new THREE.Vector2(0.8, 0.7) }, glow: { value: 0.2 }, stars: { value: 0 }, horizonV: { value: 0.3 }, aspect: { value: skyW / skyH } },
    });
    this.skyW = skyW; this.skyH = skyH;
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(skyW, skyH), this.skyMat);
    this.sky.position.set(0, horizonY + skyH * 0.2, z - 0.2);
    this.skyMat.uniforms.horizonV.value = 0.3;
    this.sky.frustumCulled = false;
    this.group.add(this.sky);
    // layers
    this.layers = [];
    const defs = STACK[layout].filter((d) => !ids || ids.includes(d.id));
    defs.forEach((d, i) => this.layers.push(this.makeLayer(d, i)));
  }
  makeLayer(d, i) {
    const data = new Uint8Array(RING * d.H * 4);
    const tex = new THREE.DataTexture(data, RING, d.H, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping; tex.generateMipmaps = false;
    tex.needsUpdate = true;
    const U = this.U;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: LAYER_FRAG,
      uniforms: { map: { value: tex }, size: { value: new THREE.Vector2(RING, d.H) }, offset: { value: 0 }, mode: { value: d.mode || 0 }, smear: { value: 0 }, fogAmt: { value: d.fog }, ...U },
    });
    const W = RING * this.tsz, Hh = d.H * this.tsz;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), mat);
    mesh.frustumCulled = false;
    mesh.position.z = this.z + i * 0.004 + (d.front || 0);
    this.group.add(mesh);
    const L = {
      ...d, tex, data, mat, mesh, brush: new Brush(data, RING, d.H),
      scroll: 200000, painted: null, changes: [{ x: -1e9, seg: 'country' }], dy: 0, dyGoal: 0, fujiX: null,
    };
    L.segAt = (X) => {
      const C = L.changes;
      let k = C.length - 1;
      while (k > 0 && C[k].x > X) k--;
      const c = C[k];
      const a = k > 0 ? C[k - 1].seg : c.seg;
      const t = Math.min(1, Math.max(0, (X - c.x) / L.blend));
      return { a, b: c.seg, k: k > 0 ? t : 1, x0: c.x };
    };
    this.placeLayer(L);
    return L;
  }
  // the backdrop planes sit a little behind the window wall; keep their horizon
  // lined up with the windows whatever the camera's pitch and yaw
  get horizonDrop() { const v = this.view; return Math.tan(v.pitch) * Math.cos(v.yaw) * (this.z - this.refZ); }
  placeLayer(L) {
    // row hz sits at the horizon (plus the layer's own vertical drift)
    const topY = this.horizonY + this.horizonDrop + (L.hz + L.dy) * this.tsz;
    L.mesh.position.y = topY - (L.H * this.tsz) / 2;
  }
  layer(id) { return this.layers.find((l) => l.id === id); }
  get segment() { return this.layer('track')?.changes.at(-1).seg ?? this.layers.at(-1).changes.at(-1).seg; }

  // ------------------------------------------------------------ control
  // switch to a new stretch of country; it rolls in from ahead on each layer
  setSegment(seg, { now = false } = {}) {
    seg = ALIAS[seg] || seg;
    const track = this.layer('track');
    const covered = this.tunnelK > 0.98;
    for (const L of this.layers) {
      const cur = L.changes.at(-1).seg;
      if (L === track) { if (cur !== seg) L.changes.push({ x: L.painted ?? 0, seg }); continue; }
      if (seg === 'tunnel') { this.pending = this.pending || cur; continue; } // only the track layer knows tunnels
      if (cur === seg && !covered) continue;
      if (covered || now) { L.changes = [{ x: -1e9, seg }]; L.painted = null; }
      else L.changes.push({ x: L.painted ?? 0, seg });
      if (seg === 'tea' && L.id === 'far') L.fujiX = (covered || now) ? (L._c ?? L.scroll) + 24 : (L.painted ?? 0) + 40;
    }
    for (const L of this.layers) if (L.id === 'far') L.dyGoal = 0;
  }
  setTime(name, dur = 6) {
    this.lookFrom = { ...this.look }; this.lookTo = LOOKS[name] || LOOKS.day; this.lookK = dur <= 0 ? 1 : 0; this.lookDur = dur; this.timeName = name;
    if (dur <= 0) this.look = { ...this.lookTo };
  }
  // tunnel coverage 0..1 (how much of the view the tunnel dark covers)
  get tunnelK() { return this._tk || 0; }

  // ------------------------------------------------------------ per frame
  paintChunk(L) {
    const X0 = L.painted;
    const c0 = ((X0 % RING) + RING) % RING;
    if (L.inkLo == null || X0 !== L.inkNext) L.inkLo = X0; // a fresh run: nothing valid to the left
    L.brush.begin(X0, c0, L.ch);
    L.paint(L.brush, L);
    L.painted += L.ch;
    L.inkNext = L.painted;
    // ink the previous chunk's last column and all of this one but its last
    // (that one waits for its right-hand neighbour)
    if (L.ink) this.inkPass(L, Math.max(L.inkLo, X0 - 1), L.painted - 1);
    L.dirty = true;
  }
  // bold outlines: an object's edge texel goes dark where it meets the ground,
  // the empty sky, or an object painted before it (behind it)
  inkPass(L, xa, xb) {
    const B = L.brush, d = B.d, ids = B.ids, dep = B.dep, W = RING, H = L.H;
    const ink = L.inkCol, sil = L.ink === 'sil', silCol = L.silCol;
    const lo = L.inkLo;
    for (let X = xa; X < xb; X++) {
      const c = ((X % W) + W) % W, cl = X - 1 >= lo ? ((c - 1 + W) % W) : -1, cr = (c + 1) % W;
      for (let y = 0; y < H; y++) {
        const i = y * W + c, v = d[i];
        if ((v >>> 24) < 100) continue;
        const a = ids[i];
        let hit = false;
        if (a === 0) {
          if (!sil) continue;
          if (y > 0 && (d[i - W] >>> 24) < 100) hit = true;
          else if (cl >= 0 && (d[y * W + cl] >>> 24) < 100) hit = true;
          else if ((d[y * W + cr] >>> 24) < 100) hit = true;
          if (hit) d[i] = silCol ?? darkenPacked(v, 0.5);
          continue;
        }
        if (a & NOINK) continue;
        const me = dep[i];
        const test = (j) => {
          const b = ids[j];
          if (b === a) return false;
          if ((d[j] >>> 24) < 100 || b === 0) return true;
          return ((me - dep[j]) & 0xffff) < 0x8000;
        };
        if ((y > 0 && test(i - W)) || (y < H - 1 && test(i + W)) || (cl >= 0 && test(y * W + cl)) || test(y * W + cr)) {
          d[i] = (a & SOFT) ? darkenPacked(v, 0.62) : ink;
        }
      }
    }
  }
  update(dt, view) {
    this.view = view;
    const camX = view.x, halfW = view.halfW;
    const cy = Math.cos(view.yaw), sx = 1 / Math.max(0.3, cy);
    // centre the planes on the view ray and stretch them so texels stay square on screen
    const px = camX + Math.tan(view.yaw) * (this.z - view.z);
    this.time += dt;
    this.U.time.value = this.time;
    this.speed += (this.speedGoal - this.speed) * Math.min(1, dt * 0.55);
    if (Math.abs(this.speed - this.speedGoal) < 0.002) this.speed = this.speedGoal;
    // look blend
    if (this.lookK < 1) {
      this.lookK = Math.min(1, this.lookK + dt / this.lookDur);
      const A = this.lookFrom, B = this.lookTo, k = this.lookK * this.lookK * (3 - 2 * this.lookK);
      const o = {};
      for (const key of Object.keys(B)) o[key] = typeof B[key] === 'number' ? A[key] + (B[key] - A[key]) * k : '#' + col(A[key]).lerp(col(B[key]), k).getHexString();
      this.look = o;
    }
    const lk = this.look, U = this.U;
    U.tint.value.set(lk.tint); U.haze.value.set(lk.haze); U.top.value.set(lk.top); U.hor.value.set(lk.hor);
    U.sunCol.value.set(lk.sun); U.cLit.value.set(lk.cLit); U.cShade.value.set(lk.cShade); U.rimCol.value.set(lk.rim);
    U.lights.value = lk.lights; U.sunAmt.value = Math.min(1, lk.glow * 1.4 + 0.15);
    const sm = this.skyMat.uniforms;
    sm.glow.value = lk.glow; sm.stars.value = lk.stars;
    // sky follows the camera; the sun sits at a fixed place in the view
    const P = view.persp;
    if (P) {
      const D = 1500, ss = 360;
      this.sky.scale.set(ss, ss, 1);
      this.sky.position.set(P.eye.x + this.planeX(P, D), P.eye.y + this.skyH * ss * 0.2, P.eye.z - D);
      sm.horizonV.value = 0.3;
      sm.aspect.value = this.skyW / this.skyH;
      sm.sunPos.value.set(0.5 + (lk.sunX - 0.5) * 0.12, 0.3 + lk.sunY * 0.7 * 0.4);
    } else {
      this.sky.scale.set(sx, 1, 1);
      this.sky.position.x = px; this.sky.position.z = this.z - 0.2;
      this.sky.position.y = this.horizonY + this.horizonDrop + this.skyH * 0.2;
      const hv = (this.horizonY + this.horizonDrop - (this.sky.position.y - this.skyH / 2)) / this.skyH;
      sm.horizonV.value = hv;
      const viewW = halfW * 2 / this.skyW;
      sm.sunPos.value.set(0.5 + (lk.sunX - 0.5) * viewW, hv + lk.sunY * (1 - hv) * 0.55);
    }
    // tunnel darkness
    const track = this.layer('track');
    let tk = 0;
    if (track && track.painted != null) {
      const c = track._c ?? (track.scroll + camX * cy * track.par / this.tsz);
      const hw = P ? 1.0 / ANG : halfW / this.tsz;
      let n = 0;
      for (let i = 0; i <= 8; i++) {
        const X = c + (i / 8 - 0.5) * hw * 2;
        const s = track.segAt(X);
        if ((s.b === 'tunnel' && X - s.x0 > 100) || (s.a === 'tunnel' && s.b !== 'tunnel' && X - s.x0 < 10)) n++;
      }
      tk = n / 9;
    }
    this._tk = tk;
    U.dim.value = this.dim;
    this.layers.forEach((L, li) => {
      L.scroll += dt * this.speed * L.spd;
      let center = L.scroll + camX * cy * L.par / this.tsz;
      let half = halfW / this.tsz + 24;
      let ps = 0, pX = 0;
      if (P) { // first person: the strip stands far off, scaled so a texel spans ANG radians
        const D = PERSP_D[L.id] ?? 100;
        ps = ANG * D / this.tsz;
        pX = this.planeX(P, D);
        center = L.scroll + pX / (this.tsz * ps);
        half = 1.9 / ANG + 24;
        L.mesh.position.set(P.eye.x + pX, P.eye.y + (L.hz + L.dy - L.H / 2) * this.tsz * ps, P.eye.z - D + li * 0.01);
        L.mesh.scale.set(ps, ps, 1);
      }
      L._c = center; L._half = half;
      if (L.painted == null || center - half < L.painted - RING + L.ch || center + half > L.painted + RING) {
        L.painted = Math.floor((center - half - 32) / L.ch) * L.ch;
      }
      let n = 0;
      while (L.painted < center + half + 16 && n < 40) { this.paintChunk(L); n++; }
      if (L.dirty) { L.tex.needsUpdate = true; L.dirty = false; }
      L.mat.uniforms.offset.value = center;
      if (!P) { L.mesh.position.x = px; L.mesh.position.z = this.z + li * 0.004 + (L.front || 0); L.mesh.scale.set(sx, 1, 1); this.placeLayer(L); }
      if (L.smear) L.mat.uniforms.smear.value = Math.min(24, this.speed * L.spd * (1 / 60) * 1.2);
      if (L.dy !== L.dyGoal) L.dy += Math.sign(L.dyGoal - L.dy) * Math.min(Math.abs(L.dyGoal - L.dy), dt * 6);
      // the other layers vanish while the tunnel covers the view
      if (L !== track) L.mesh.visible = tk < 0.999;
    });
    this.sky.visible = tk < 0.999;
  }
  // where a far plane at distance D should be centred so the view ray hits its middle
  planeX(P, D) {
    const f = P.fwd;
    const t = f.z < -0.15 ? D / -f.z : D / 0.15;
    return Math.max(-D * 1.6, Math.min(D * 1.6, f.x * t));
  }
}
