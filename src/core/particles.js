// Particles: little pixel sprites with simple physics, written into two sprite
// batches each frame (lit alpha-tested ones like dust, leaves and petals, and
// unlit additive glows like fireflies, spirit motes and sparkles).
//
//   fx.emit('dustPuff', { x, y, z, n: 6 })
//   fx.addEmitter({ type: 'firefly', area: { x, z, w, d, y0, y1 }, rate: 2 })
import * as THREE from 'three';
import { Atlas, SpriteBatch } from './sprites.js';
import { WORLD } from './materials.js';
import { lighten, darken, mix } from './pixtex.js';
import { clamp, randRange, pick } from './util.js';

// ---------------------------------------------------------------- the atlas
function buildAtlas() {
  const A = new Atlas(512, 512);
  // dust puffs: soft round clumps with a light top
  for (let s = 0; s < 4; s++) {
    const r = 3 + s * 2, S = r * 2 + 2;
    A.add('puff' + s, S, S, (p) => {
      p.circle(S / 2, S / 2, r, '#cfc4bc');
      p.circle(S / 2 - r * 0.25, S / 2 - r * 0.3, r * 0.65, '#e9e1d8');
      p.circle(S / 2 + r * 0.35, S / 2 + r * 0.35, r * 0.45, '#b3a69e');
    }, { ax: S / 2, ay: S / 2 });
  }
  // steam / smoke wisps (white, tinted at emit)
  for (let s = 0; s < 4; s++) {
    const r = 3 + s * 2, S = r * 2 + 2;
    A.add('steam' + s, S, S, (p) => {
      p.circle(S / 2, S / 2, r, '#ffffff');
      p.dither(0, 0, S, S, '#00000000', 0);
      p.circle(S / 2 + r * 0.3, S / 2 + r * 0.25, r * 0.55, '#e4ecf4');
    }, { ax: S / 2, ay: S / 2 });
  }
  A.add('mote', 1, 1, (p) => p.px(0, 0, '#fff4d8'), { ax: 0.5, ay: 0.5 });
  A.add('mote2', 2, 2, (p) => { p.rect(0, 0, 2, 2, '#fff4d8'); }, { ax: 1, ay: 1 });
  // glow dots (additive): soft round, bright core
  for (let s = 0; s < 4; s++) {
    const r = 2 + s * 2, S = r * 2 + 1;
    A.add('glow' + s, S, S, (p) => {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2) / (S / 2);
        if (d > 1) continue;
        const v = Math.round(255 * Math.pow(1 - d, 1.6));
        const b = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16;
        const q = Math.min(255, Math.round(v / 64 + b) * 64);
        if (q > 0) p.px(x, y, `rgb(${q},${q},${q})`);
      }
    }, { ax: S / 2, ay: S / 2 });
  }
  // twinkle star (additive)
  A.add('twinkle', 7, 7, (p) => {
    p.rect(3, 0, 1, 7, '#9a9a9a'); p.rect(0, 3, 7, 1, '#9a9a9a');
    p.rect(2, 2, 3, 3, '#cfcfcf'); p.px(3, 3, '#ffffff');
  }, { ax: 3.5, ay: 3.5 });
  A.add('twinkleS', 5, 5, (p) => { p.rect(2, 0, 1, 5, '#a0a0a0'); p.rect(0, 2, 5, 1, '#a0a0a0'); p.px(2, 2, '#ffffff'); }, { ax: 2.5, ay: 2.5 });
  // leaves (4 colours x 3 shapes), petals, pollen
  const leafCols = [['#7fae3e', '#5a8a2e'], ['#e0a03a', '#b8702a'], ['#d0583a', '#9a3a2e'], ['#c8b04a', '#98803a']];
  leafCols.forEach(([c, d], i) => {
    A.add('leaf' + i + 'a', 5, 4, (p) => { p.rect(1, 0, 3, 1, c); p.rect(0, 1, 5, 2, c); p.rect(1, 3, 2, 1, c); p.px(1, 2, d); p.px(2, 1, d); p.px(3, 2, d); }, { ax: 2.5, ay: 2 });
    A.add('leaf' + i + 'b', 4, 5, (p) => { p.rect(1, 0, 2, 1, c); p.rect(0, 1, 4, 3, c); p.px(2, 4, d); p.px(2, 1, d); p.px(2, 2, d); }, { ax: 2, ay: 2.5 });
    A.add('leaf' + i + 'c', 3, 3, (p) => { p.rect(0, 0, 2, 2, c); p.rect(1, 1, 2, 2, c); p.px(1, 1, d); }, { ax: 1.5, ay: 1.5 });
  });
  A.add('petal', 4, 3, (p) => { p.rect(1, 0, 2, 1, '#ffd2e0'); p.rect(0, 1, 4, 1, '#ffbcd2'); p.rect(1, 2, 2, 1, '#f49ab8'); }, { ax: 2, ay: 1.5 });
  A.add('petal2', 3, 3, (p) => { p.rect(0, 0, 2, 2, '#ffe0ea'); p.px(2, 1, '#ffbcd2'); p.px(1, 2, '#f49ab8'); }, { ax: 1.5, ay: 1.5 });
  A.add('pollen', 2, 2, (p) => { p.rect(0, 0, 2, 2, '#ffe88a'); p.px(1, 1, '#e8c24a'); }, { ax: 1, ay: 1 });
  // rain streak + splash
  A.add('rain', 1, 7, (p) => { p.rect(0, 0, 1, 7, '#a8c4e8'); p.px(0, 6, '#e8f2ff'); }, { ax: 0.5, ay: 7 });
  A.add('splash', 5, 2, (p) => { p.px(0, 0, '#cfe2f8'); p.px(4, 0, '#cfe2f8'); p.rect(1, 1, 3, 1, '#a8c4e8'); }, { ax: 2.5, ay: 2 });
  A.add('ripple0', 7, 3, (p) => { p.ring(3.5, 1.5, 3.4, '#cfe2f8'); }, { ax: 3.5, ay: 1.5 });
  A.add('bubble', 4, 4, (p) => { p.ring(2, 2, 2, '#d8f0ff'); p.px(1, 1, '#ffffff'); }, { ax: 2, ay: 2 });
  // water droplet / sweat
  A.add('drop', 3, 5, (p) => { p.px(1, 0, '#bfe6ff'); p.rect(0, 1, 3, 3, '#8fd0ff'); p.rect(1, 4, 1, 1, '#5aa8e8'); p.px(0, 1, '#ffffff'); }, { ax: 1.5, ay: 2.5 });
  // sparks for impacts (white, tinted)
  A.add('spark', 3, 3, (p) => { p.px(1, 0, '#fff'); p.rect(0, 1, 3, 1, '#fff'); p.px(1, 2, '#fff'); }, { ax: 1.5, ay: 1.5 });
  // emotes
  const ink = '#2a1828';
  A.add('heart', 7, 6, (p) => {
    p.stamp(['.k.k.', 'kHkHk', 'kHHHk', '.kHk.', '..k..'].map((r) => r), { k: ink, H: '#ff6a8a' }, 1, 0);
    p.px(2, 1, '#ffd0dc');
  }, { ax: 3.5, ay: 6 });
  A.add('note', 6, 7, (p) => { p.rect(3, 0, 1, 5, ink); p.rect(4, 0, 2, 1, ink); p.rect(5, 1, 1, 1, ink); p.ellipse(2, 5, 2, 1.5, ink); }, { ax: 3, ay: 7 });
  A.add('zzz', 5, 5, (p) => { p.rect(0, 0, 5, 1, '#e8e8ff'); p.px(3, 1, '#e8e8ff'); p.px(2, 2, '#e8e8ff'); p.px(1, 3, '#e8e8ff'); p.rect(0, 4, 5, 1, '#e8e8ff'); }, { ax: 2.5, ay: 2.5 });
  A.add('confetti', 2, 2, (p) => p.rect(0, 0, 2, 2, '#ffffff'), { ax: 1, ay: 1 });
  A.add('dustball', 6, 6, (p) => { p.circle(3, 3, 3, '#7a7276'); p.circle(2.5, 2.4, 2, '#9a9296'); p.px(1, 1, '#b8b0b4'); }, { ax: 3, ay: 3 });
  A.add('crumb', 2, 2, (p) => { p.rect(0, 0, 2, 2, '#c89a5a'); p.px(1, 1, '#8a5a3a'); }, { ax: 1, ay: 1 });
  A.add('feather', 6, 3, (p) => { p.rect(0, 1, 6, 1, '#2a2a3a'); p.rect(1, 0, 4, 1, '#3a3a50'); p.rect(2, 2, 3, 1, '#3a3a50'); }, { ax: 3, ay: 1.5 });
  A.add('grassbit', 2, 3, (p) => { p.rect(0, 0, 1, 3, '#7fbf4a'); p.px(1, 1, '#5a9a3a'); }, { ax: 1, ay: 1.5 });
  A.add('tealeaf', 4, 3, (p) => { p.rect(0, 1, 4, 1, '#5aa04a'); p.rect(1, 0, 2, 3, '#4a8a3a'); p.px(1, 1, '#8ad06a'); }, { ax: 2, ay: 1.5 });
  return A.finish();
}

// ---------------------------------------------------------------- presets
// Every value can be a number or [min, max]. Units: metres, seconds.
const R = (v) => (Array.isArray(v) ? randRange(v[0], v[1]) : v);
export const PRESETS = {
  dustPuff: { frames: ['puff0', 'puff1', 'puff2'], life: [0.5, 0.9], speed: [0.4, 1.0], up: [0.2, 0.6], spread: 0.15, size: [0.6, 1.1], grow: 1.6, gravity: -0.4, drag: 3.2, fade: 'out', tint: [1, 1, 1] },
  dustBig: { frames: ['puff2', 'puff3'], life: [0.8, 1.4], speed: [0.6, 1.4], up: [0.3, 0.9], spread: 0.3, size: [0.9, 1.4], grow: 1.8, gravity: -0.3, drag: 2.6, fade: 'out' },
  dustMote: { frames: ['mote'], life: [3, 6], speed: [0.02, 0.06], up: [-0.01, 0.03], spread: 0.6, size: 1, gravity: 0, drag: 0.2, wander: 0.08, fade: 'inout', additive: true, glow: 0.6 },
  sunMote: { frames: ['mote', 'mote2'], life: [3, 7], speed: [0.01, 0.05], up: [-0.02, 0.02], spread: 0.6, size: 1, gravity: 0.0, drag: 0.1, wander: 0.05, fade: 'inout', additive: true, glow: 1.2, tint: [1, 0.92, 0.7] },
  steam: { frames: ['steam0', 'steam1', 'steam2'], life: [1.2, 2.2], speed: [0.02, 0.08], up: [0.35, 0.6], spread: 0.06, size: [0.35, 0.6], grow: 2.4, gravity: -0.05, drag: 0.8, wander: 0.18, fade: 'inout', alpha: 0.7 },
  smoke: { frames: ['steam1', 'steam2', 'steam3'], life: [2.5, 4.0], speed: [0.05, 0.12], up: [0.4, 0.7], spread: 0.08, size: [0.4, 0.7], grow: 3.0, gravity: -0.02, drag: 0.5, wander: 0.22, windK: 0.5, fade: 'inout', tint: [0.75, 0.72, 0.78], alpha: 0.8 },
  mist: { frames: ['steam2', 'steam3'], life: [1.5, 3], speed: [0.2, 0.6], up: [0.05, 0.3], spread: 0.4, size: [0.8, 1.4], grow: 1.6, gravity: -0.02, drag: 0.6, fade: 'inout', alpha: 0.45, tint: [0.92, 0.97, 1] },
  leaf: { frames: ['leaf0a', 'leaf0b', 'leaf0c'], life: [5, 9], speed: [0.05, 0.2], up: [-0.1, 0], spread: 0.2, size: 1, gravity: 0.35, drag: 1.8, flutter: 1, windK: 1.2, spin: [-3, 3], fade: 'inout', ground: true, lit: true },
  leafAutumn: { frames: ['leaf1a', 'leaf1b', 'leaf2a', 'leaf2b', 'leaf3a', 'leaf1c'], life: [5, 9], speed: [0.05, 0.2], up: [-0.1, 0], spread: 0.2, size: 1, gravity: 0.35, drag: 1.8, flutter: 1, windK: 1.2, spin: [-3, 3], fade: 'inout', ground: true, lit: true },
  petal: { frames: ['petal', 'petal2'], life: [5, 9], speed: [0.05, 0.2], up: [-0.05, 0.05], spread: 0.3, size: 1, gravity: 0.22, drag: 1.6, flutter: 1.3, windK: 1.4, spin: [-4, 4], fade: 'inout', ground: true, lit: true },
  pollen: { frames: ['pollen'], life: [4, 8], speed: [0.03, 0.08], up: [-0.02, 0.04], spread: 0.6, size: 1, gravity: 0.0, drag: 0.4, wander: 0.12, windK: 0.6, fade: 'inout', additive: true, glow: 0.9, tint: [1, 0.95, 0.6] },
  firefly: { frames: ['glow0', 'glow1'], life: [5, 10], speed: [0.05, 0.15], up: [-0.05, 0.05], spread: 0.6, size: 1, gravity: 0, drag: 0.8, wander: 0.5, fade: 'inout', blink: 1, additive: true, glow: 2.2, tint: [0.75, 1, 0.45] },
  spiritMote: { frames: ['glow0', 'glow1', 'twinkleS'], life: [3, 6], speed: [0.05, 0.2], up: [0.05, 0.25], spread: 0.6, size: 1, gravity: -0.03, drag: 0.6, wander: 0.35, fade: 'inout', blink: 0.4, additive: true, glow: 2.0, tint: [0.7, 1, 0.85] },
  sparkle: { frames: ['twinkle', 'twinkleS'], life: [0.4, 0.8], speed: [0.4, 1.2], up: [0.3, 1.0], spread: 0.1, size: 1, gravity: 1.2, drag: 2.0, fade: 'out', additive: true, glow: 2.4, tint: [1, 0.95, 0.7], spin: [-6, 6] },
  confetti: { frames: ['confetti'], life: [1.2, 2.2], speed: [1.0, 2.2], up: [1.5, 3.0], spread: 0.1, size: 1, gravity: 4.5, drag: 1.4, flutter: 1, spin: [-8, 8], fade: 'out', colors: [[1, 0.4, 0.5], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.6, 1, 0.5], [0.9, 0.6, 1]], ground: true, lit: true },
  rain: { frames: ['rain'], life: [0.6, 0.8], speed: 0, up: -6.5, spread: 0, size: 1, gravity: 2, drag: 0, fade: 'none', ground: true, splash: true, alpha: 0.85 },
  splash: { frames: ['splash'], life: [0.15, 0.25], speed: 0, up: 0, spread: 0, size: 1, gravity: 0, drag: 0, fade: 'out' },
  waterSplash: { frames: ['drop'], life: [0.4, 0.8], speed: [0.5, 1.4], up: [1.0, 2.2], spread: 0.05, size: 1, gravity: 7, drag: 0.6, fade: 'out', ground: true },
  bubble: { frames: ['bubble'], life: [0.8, 1.6], speed: [0.02, 0.06], up: [0.2, 0.4], spread: 0.08, size: 1, gravity: -0.1, drag: 0.5, wander: 0.15, fade: 'out' },
  sweat: { frames: ['drop'], life: [0.5, 0.7], speed: [0.3, 0.6], up: [0.6, 1.0], spread: 0.02, size: 1, gravity: 4, drag: 0.5, fade: 'out' },
  heart: { frames: ['heart'], life: [1.0, 1.4], speed: [0.05, 0.15], up: [0.5, 0.7], spread: 0.05, size: 1, gravity: -0.1, drag: 1.0, wander: 0.2, fade: 'out', pop: 1 },
  note: { frames: ['note'], life: [1.0, 1.6], speed: [0.1, 0.2], up: [0.4, 0.6], spread: 0.05, size: 1, gravity: -0.05, drag: 0.6, wander: 0.3, fade: 'out', pop: 1 },
  zzz: { frames: ['zzz'], life: [1.6, 2.2], speed: [0.05, 0.1], up: [0.25, 0.35], spread: 0.02, size: 1, gravity: 0, drag: 0.2, wander: 0.15, fade: 'inout', pop: 1, grow: 0.6 },
  dustball: { frames: ['dustball'], life: [0.6, 1.0], speed: [0.3, 0.8], up: [0.5, 1.2], spread: 0.1, size: [0.7, 1.2], gravity: 3.5, drag: 1.2, fade: 'out', ground: true, spin: [-5, 5], lit: true },
  crumbs: { frames: ['crumb'], life: [0.5, 0.9], speed: [0.4, 1.0], up: [0.6, 1.4], spread: 0.05, size: 1, gravity: 6, drag: 0.5, fade: 'out', ground: true, lit: true },
  feather: { frames: ['feather'], life: [2, 3], speed: [0.2, 0.6], up: [0.4, 0.9], spread: 0.1, size: 1, gravity: 0.5, drag: 2.2, flutter: 1.5, spin: [-3, 3], fade: 'out', ground: true, lit: true },
  grassBits: { frames: ['grassbit'], life: [0.5, 0.8], speed: [0.4, 1.0], up: [0.6, 1.2], spread: 0.05, size: 1, gravity: 5, drag: 0.8, spin: [-6, 6], fade: 'out', ground: true, lit: true },
  teaLeaves: { frames: ['tealeaf'], life: [0.6, 1.0], speed: [0.3, 0.8], up: [0.6, 1.2], spread: 0.05, size: 1, gravity: 4, drag: 1.0, spin: [-6, 6], fade: 'out', ground: true, lit: true },
  happyGlow: { frames: ['glow1', 'glow2'], life: [0.5, 0.9], speed: [0.2, 0.6], up: [0.2, 0.6], spread: 0.1, size: 1, gravity: -0.2, drag: 2.0, fade: 'out', additive: true, glow: 2.4 },
  portalSwirl: { frames: ['glow1', 'twinkleS', 'petal'], life: [1.0, 2.0], speed: [0.6, 1.4], up: [0.2, 0.8], spread: 0.4, size: 1, gravity: -0.4, drag: 0.6, wander: 0.6, orbit: 2.4, fade: 'inout', additive: true, glow: 2.2, tint: [0.8, 1, 0.75] },
};

const _wind = new THREE.Vector2();

export class Particles {
  constructor(scene, max = 3000) {
    this.atlas = buildAtlas();
    this.lit = new SpriteBatch(this.atlas, { max, lit: true, name: 'fx-lit', texels: 64 });
    this.glow = new SpriteBatch(this.atlas, { max, lit: false, additive: true, name: 'fx-glow', texels: 64, renderOrder: 10 });
    this.glow.mesh.castShadow = false;
    scene.add(this.lit.mesh, this.glow.mesh);
    this.list = [];
    this.emitters = [];
    this.max = max;
    this.groundY = (x, z) => 0;
    this.attractors = [];
    this.scene = scene;
  }
  setScene(scene) {
    if (this.scene === scene) return;
    scene.add(this.lit.mesh, this.glow.mesh);
    this.scene = scene;
  }
  clear() { this.list.length = 0; this.emitters.length = 0; this.attractors.length = 0; }

  emit(type, o = {}) {
    const P = PRESETS[type];
    if (!P) { console.warn('no particle preset', type); return; }
    const n = o.n ?? 1;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = R(o.speed ?? P.speed);
      const spread = o.spread ?? P.spread ?? 0;
      const col = o.tint || (P.colors ? pick(P.colors) : P.tint) || [1, 1, 1];
      this.list.push({
        P, type,
        x: (o.x ?? 0) + (Math.random() - 0.5) * 2 * spread,
        y: (o.y ?? 0) + (Math.random() - 0.5) * spread * 0.5,
        z: (o.z ?? 0) + (Math.random() - 0.5) * 2 * spread,
        vx: Math.cos(a) * sp + (o.vx ?? 0), vy: R(o.up ?? P.up) + (o.vy ?? 0), vz: Math.sin(a) * sp + (o.vz ?? 0),
        t: 0, life: R(o.life ?? P.life), size: R(o.size ?? P.size) * (o.scale ?? 1),
        frame: pick(o.frames || P.frames), rot: Math.random() * 6.28, spin: R(P.spin ?? 0),
        tint: col, phase: Math.random() * 100, alpha: o.alpha ?? P.alpha ?? 1,
        target: o.target || null, onArrive: o.onArrive || null, ground: o.ground ?? P.ground,
        floor: o.floor, glow: o.glow ?? P.glow ?? 0,
      });
    }
  }
  // continuous ambient emitters: returns a handle with .stop()
  addEmitter(e) {
    const em = { acc: 0, on: true, ...e };
    em.stop = () => { em.on = false; };
    this.emitters.push(em);
    return em;
  }
  removeEmitter(em) { const i = this.emitters.indexOf(em); if (i >= 0) this.emitters.splice(i, 1); }

  update(dt, time) {
    const wd = WORLD.uWindDir.value, ws = WORLD.uWind.value;
    _wind.set(wd.x * ws, wd.y * ws);
    for (const em of this.emitters) {
      if (!em.on) continue;
      if (em.when && !em.when()) continue;
      em.acc += dt * (typeof em.rate === 'function' ? em.rate() : em.rate);
      while (em.acc >= 1) {
        em.acc -= 1;
        const A = em.area;
        let x, y, z;
        if (A) { x = A.x + (Math.random() - 0.5) * (A.w || 0); z = A.z + (Math.random() - 0.5) * (A.d || 0); y = (A.y0 ?? 0) + Math.random() * ((A.y1 ?? A.y0 ?? 0) - (A.y0 ?? 0)); }
        else { const p = typeof em.pos === 'function' ? em.pos() : em.pos; x = p.x; y = p.y; z = p.z; }
        this.emit(em.type, { x, y, z, ...(em.opts || {}) });
      }
    }
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i], P = p.P;
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      if (p.target) {
        // homing (Happiness flying to the jar etc.)
        const tg = typeof p.target === 'function' ? p.target() : p.target;
        const dx = tg.x - p.x, dy = tg.y - p.y, dz = tg.z - p.z;
        const d = Math.hypot(dx, dy, dz);
        const k = Math.min(1, dt * (4 + p.t * 10));
        p.vx += (dx / Math.max(d, 0.01) * 6 - p.vx) * k;
        p.vy += (dy / Math.max(d, 0.01) * 6 - p.vy) * k;
        p.vz += (dz / Math.max(d, 0.01) * 6 - p.vz) * k;
        if (d < 0.12) { L.splice(i, 1); p.onArrive && p.onArrive(p); continue; }
      } else {
        const drag = Math.exp(-(P.drag || 0) * dt);
        p.vx *= drag; p.vz *= drag; p.vy *= drag;
        p.vy -= (P.gravity || 0) * dt;
        if (P.windK) { p.vx += _wind.x * P.windK * dt * 0.6; p.vz += _wind.y * P.windK * dt * 0.6; }
        if (P.wander) {
          const w = P.wander;
          p.vx += Math.sin(time * 1.3 + p.phase) * w * dt * 2;
          p.vz += Math.cos(time * 1.1 + p.phase * 1.7) * w * dt * 2;
          p.vy += Math.sin(time * 0.9 + p.phase * 0.7) * w * dt;
        }
        if (P.flutter) {
          const f = P.flutter;
          p.vx += Math.sin(time * 3.1 + p.phase) * f * dt * 1.5;
          p.vy += Math.max(0, Math.sin(time * 4.3 + p.phase * 2.0)) * f * dt * 0.9;
        }
        if (P.orbit) {
          const ox = p.x - (p.cx ?? (p.cx = p.x)), oz = p.z - (p.cz ?? (p.cz = p.z));
          p.vx += -oz * P.orbit * dt; p.vz += ox * P.orbit * dt;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.spin * dt;
      if (p.ground) {
        const gy = p.floor ?? this.groundY(p.x, p.z);
        if (p.y < gy + 0.005) {
          p.y = gy + 0.005;
          if (P.splash) { L.splice(i, 1); if (Math.random() < 0.5) this.emit('splash', { x: p.x, y: gy + 0.01, z: p.z }); continue; }
          p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; p.spin *= 0.3;
          if (!p.landed) { p.landed = true; p.t = Math.max(p.t, p.life - 1.2); }
        }
      }
    }
    // write the batches
    this.lit.clear(); this.glow.clear();
    for (const p of L) {
      const P = p.P, u = p.t / p.life;
      let a = p.alpha;
      if (P.fade === 'out') a *= 1 - u * u;
      else if (P.fade === 'inout') a *= Math.min(1, u * 5) * Math.min(1, (1 - u) * 4);
      if (P.blink) a *= 0.35 + 0.65 * Math.max(0, Math.sin(time * 2.6 * P.blink + p.phase * 3.0));
      let s = p.size * (1 + (P.grow || 0) * u);
      if (P.pop) s *= u < 0.15 ? 0.4 + 0.6 * (u / 0.15) * 1.3 : 1 + 0.05 * Math.sin(time * 6 + p.phase);
      const additive = P.additive;
      const B = additive ? this.glow : this.lit;
      const tint = additive ? [p.tint[0] * a * (p.glow || 1), p.tint[1] * a * (p.glow || 1), p.tint[2] * a * (p.glow || 1)] : p.tint;
      B.push(p.frame, p.x, p.y, p.z, { mode: 2, scale: s, rot: P.spin ? p.rot : 0, alpha: additive ? 1 : a, tint, ax: 0.5, ay: 0.5 });
    }
    this.lit.commit(); this.glow.commit();
  }
}
