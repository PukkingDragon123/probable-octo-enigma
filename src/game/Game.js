// The game: renderer, camera, input, audio, UI layers, the current location,
// the player, story state, the clock, and the frame loop.
import * as THREE from 'three';
import { PixelRenderer } from '../core/renderer.js';
import { CameraRig } from '../core/camera.js';
import { Input } from '../core/input.js';
import { WORLD } from '../core/materials.js';
import { Particles } from '../core/particles.js';
import { updateSpriteUniforms } from '../core/sprites.js';
import { Lighting } from '../world/lighting.js';
import { Bubbles, Captions } from '../ui/bubbles.js';
import { Emotes } from '../ui/emotes.js';
import { Transitions } from '../ui/transitions.js';
import { Director } from './Director.js';
import { Character } from '../entities/rig.js';
import { CHARACTERS } from '../data/characters.js';
import { Emitter, clamp, damp } from '../core/util.js';
import { newState, loadState, saveState } from './state.js';
import '../ui/game.css';

// optional modules (exist once written; the game runs without them)
const AUDIO = import.meta.glob('../audio/audio.js', { eager: true })['../audio/audio.js'];

export class Game extends Emitter {
  constructor(canvas, uiRoot) {
    super();
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.THREE = THREE;
    this.renderer = new PixelRenderer(canvas);
    this.rig = new CameraRig();
    this.input = new Input(canvas);
    this.audio = AUDIO?.Audio ? new AUDIO.Audio() : null;
    this.bubbles = new Bubbles(this, uiRoot);
    this.captions = new Captions(uiRoot);
    this.transitions = new Transitions(this, uiRoot);
    this.director = new Director(this);
    this.locations = {}; // id -> Location instance
    this.factories = {}; // id -> () => Location
    this.location = null;
    this.timers = [];
    this.tweens = [];
    this.time = 0;
    this.timeScale = 1;
    this.inputLocked = false;
    this.letterbox = 0; this.letterboxGoal = 0;
    this.state = newState();
    this.player = new Character(CHARACTERS.mamoru);
    this.player.isPlayer = true;
    // shared systems that hop between scenes
    this.lighting = null;
    this.particles = null;
    this.emotes = null;
    this.hoverIt = null;
    this.running = false;
    this.bindInput();
    window.__game = this;
  }

  // ---------------------------------------------------------------- locations
  register(id, factory) { this.factories[id] = factory; }
  async getLocation(id) {
    if (!this.locations[id]) {
      const L = this.factories[id](this);
      this.locations[id] = L;
    }
    const L = this.locations[id];
    if (!L.built) { await L.build(); L.built = true; }
    return L;
  }
  // switch location (with an optional transition): opts passed to enter()
  async goTo(id, opts = {}, { transition = 'shoji', closeDur = 0.6, openDur = 0.7 } = {}) {
    const g = this;
    if (transition && this.location) await g.transitions.close(transition, closeDur);
    const L = await this.getLocation(id);
    if (this.location && this.location !== L) { this.location.exit(); this.location.remove(this.player); }
    this.location = L;
    // move shared systems into the new scene
    if (!this.lighting) this.lighting = new Lighting(L.scene);
    this.lighting.attach(L.scene);
    this.lighting.mode = L.lightMode;
    this.lighting.override = L.lightOverride ? { ...L.lightOverride } : null;
    this.lighting.setShadowSize(L.shadowSize);
    if (!this.particles) this.particles = new Particles(L.scene);
    this.particles.clear();
    this.particles.setScene(L.scene);
    this.particles.groundY = () => L.nav?.y ?? L.groundY;
    if (!this.emotes) this.emotes = new Emotes(L.scene);
    this.emotes.clear();
    this.emotes.setScene(L.scene);
    this.renderer.setGrade(L.grade, transition ? 0 : 1.2);
    this.renderer.setFog(null);
    this.bubbles.clear();
    this.rig.shot = null;
    this.rig.lockZ = L.camCfg.lockZ ?? null;
    this.rig.setBounds(L.camCfg.bounds ?? null);
    if (L.camCfg.followY != null) this.rig.followOffset.set(0, L.camCfg.followY, 0); else this.rig.followOffset.set(0, 0, 0);
    await L.enter(opts);
    if (L.music !== undefined) this.audio?.music?.(L.music);
    if (L.ambience !== undefined) this.audio?.ambience?.(L.ambience);
    this.emit('location', L);
    if (transition) { this.rig.snap(); await g.transitions.open(transition, openDur); }
    return L;
  }
  // put the player (or anyone) into the current location
  place(char, x, z, yaw = 0, y = 0) {
    const L = this.location;
    L.add(char);
    char.setPos(x, z, y);
    char.faceNow(yaw);
    char.stop();
    return char;
  }

  // ---------------------------------------------------------------- input
  bindInput() {
    const I = this.input;
    I.on('press', () => this.audio?.unlock?.());
    I.on('tap', (e) => this.onTap(e));
    I.on('zoom', (e) => {
      if (this.inputLocked || !this.location) return;
      const cfg = this.location.camCfg;
      this.rig.zoom(e.factor);
      this.rig.wuppGoal = clamp(this.rig.wuppGoal, cfg.minWupp ?? 0.007, cfg.maxWupp ?? 0.03);
    });
    I.on('drag', (e) => { if (this.location?.onDrag) this.location.onDrag(e); });
    I.on('dragstart', (e) => { if (this.location?.onDragStart) this.location.onDragStart(e); });
    I.on('dragend', (e) => { if (this.location?.onDragEnd) this.location.onDragEnd(e); });
    I.on('move', (e) => this.onHover(e));
    I.on('key', (e) => {
      if (!e.down) { if (e.key === ' ' || e.key === 'Shift') this.director.skipping = false; return; }
      if (e.key === ' ' || e.key === 'Enter') { if (this.bubbles.active) this.bubbles.tapAdvance(); }
      if (e.key === 'Shift' && this.director.inCutscene) { this.director.skipping = true; }
      if (e.key === 'q') this.rig.rotate(1);
      if (e.key === 'e') this.rig.rotate(-1);
      this.location?.onKey?.(e);
    });
  }
  onTap(e) {
    if (this.bubbles.active) { this.bubbles.tapAdvance(); return; }
    if (this.inputLocked || !this.location || this.transitions.busy) return;
    const L = this.location;
    if (L.onTapFirst && L.onTapFirst(e)) return;
    const it = L.pick(e.x, e.y);
    if (it) { this.useInteractable(it); return; }
    if (L.onTapGround && L.onTapGround(e)) return;
    if (!L.chars.has(this.player) || !L.nav) return;
    const p = L.groundPoint(e.x, e.y);
    if (!Number.isFinite(p.x)) return;
    if (!L.nav.okXZ(p.x, p.z)) { const n = L.nav.nearest(p.x, p.z, 6); if (!n) return; p.x = n.x; p.z = n.z; }
    this.player.walkTo(p.x, p.z, { nav: L.nav });
    this.tapMarker(p);
  }
  async useInteractable(it) {
    if (this.busyUse) return;
    this.busyUse = true;
    try {
      const P = this.player, L = this.location;
      const use = typeof it.use === 'function' ? it.use() : it.use;
      if (use && L.chars.has(P)) {
        const ok = await P.walkTo(use.x, use.z, { nav: it.free ? null : L.nav });
        if (ok === false && Math.hypot(P.x - use.x, P.z - use.z) > 0.5) return;
        if (use.yaw != null) P.faceYaw(use.yaw);
        await this.director.wait(0.15);
      } else if (it.char && L.chars.has(P)) {
        const c = it.char;
        const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz) || 1;
        await P.walkTo(c.x + (dx / d) * 0.75, c.z + (dz / d) * 0.75, { nav: L.nav });
        P.faceTo(c.x, c.z); c.faceTo(P.x, P.z);
      }
      if (it.onUse) await it.onUse(this, it);
    } finally { this.busyUse = false; }
  }
  onHover(e) {
    if (!this.location || this.inputLocked) { this.canvas.style.cursor = ''; return; }
    if (this._hoverT && performance.now() - this._hoverT < 60) return;
    this._hoverT = performance.now();
    const it = this.location.pick(e.x, e.y);
    this.canvas.style.cursor = it ? 'pointer' : '';
    this.hoverIt = it;
  }
  tapMarker(p) {
    this.particles?.emit('sparkle', { x: p.x, y: (this.location.nav?.y ?? 0) + 0.05, z: p.z, n: 3, speed: [0.2, 0.5], up: [0.3, 0.6] });
  }

  // ---------------------------------------------------------------- clock
  // Human-world hour drives lighting for both worlds (the Spirit Realm's day is our night)
  get hour() { return this.state.hour; }
  set hour(h) { this.state.hour = ((h % 24) + 24) % 24; }

  // ---------------------------------------------------------------- overlays
  async titleCard(text, sub = '', dur = 2.6) {
    const el = document.createElement('div');
    el.className = 'title-card';
    el.innerHTML = `<div class="tc-main">${text}</div>${sub ? `<div class="tc-sub">${sub}</div>` : ''}`;
    this.uiRoot.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    await this.director.wait(dur);
    el.classList.remove('in'); el.classList.add('out');
    await this.director.wait(0.6);
    el.remove();
  }

  // ---------------------------------------------------------------- save
  save() { saveState(this.state); }
  load() { const s = loadState(); if (s) { this.state = s; return true; } return false; }

  // ---------------------------------------------------------------- frame
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(window.innerWidth, window.innerHeight, dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
  }
  update(rawDt) {
    const fast = this.director.skipping ? 6 : (this.fastForward || 1);
    const dt = rawDt * this.timeScale * fast;
    this.time += dt;
    WORLD.uTime.value = this.time;
    // timers + tweens (game time)
    for (let i = this.timers.length - 1; i >= 0; i--) { const T = this.timers[i]; T.t -= dt; if (T.t <= 0) { this.timers.splice(i, 1); T.res(); } }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const T = this.tweens[i]; T.t += dt;
      const u = Math.min(1, T.t / T.dur);
      T.fn(T.ease(u));
      if (u >= 1) { this.tweens.splice(i, 1); T.res(); }
    }
    const L = this.location;
    if (!L) return;
    // keyboard walking
    if (!this.inputLocked && L.chars.has(this.player) && L.nav) {
      const mv = this.input.moveVector();
      if (mv) {
        const yaw = this.rig.yaw;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const tx = this.player.x + (rx * mv.x + fx * mv.y) * 0.6, tz = this.player.z + (rz * mv.x + fz * mv.y) * 0.6;
        if (L.nav.okXZ(tx, tz)) this.player.walkTo(tx, tz, { nav: null });
      }
    }
    if (L.clock && !this.director.inCutscene && this.state.clockRunning) this.hour = this.hour + dt * (this.state.clockSpeed ?? 1 / 60);
    L.update(dt, this.time);
    for (const c of L.chars) c.update(dt);
    this.particles?.update(dt, this.time);
    this.emotes?.update(dt, this.time);
    this.bubbles.update(dt);
    this.transitions.update(rawDt);
    // camera follows the player by default in gameplay
    this.rig.update(dt, this.renderer);
    this.letterbox = damp(this.letterbox, this.letterboxGoal, 6, rawDt);
    this.renderer.uniforms.letterbox.value = this.letterbox;
    const f = this.rig.target;
    this.lighting.camYaw = this.rig.yaw;
    this.lighting.skyOn = L.sky !== false;
    this.lighting.update(L.hourOverride ?? this.hour, new THREE.Vector3(f.x, f.y, f.z), rawDt, this.time);
    const pushers = [];
    for (const c of L.chars) { if (pushers.length >= 8) break; pushers.push({ x: c.x, y: c.y, z: c.z, r: 0.45 }); }
    updateSpriteUniforms(this.rig.camera, { sunDir: this.lighting.sunDir(), pushers, cut: L.cut || null });
    this.renderer.updateGrade(rawDt);
    // outline thresholds scale with zoom so far views don't fill with creases
    const k = Math.max(1, this.rig.wupp / 0.0125);
    this.renderer.setEdges(0.05 * k, 0.16 * k);
  }
  render() { if (this.location) this.renderer.render(this.location.scene, this.rig, this.time); }
  start() {
    this.running = true;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      try { this.update(dt); } catch (e) { console.error(e); }
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  // fast-forward for tests: __step(seconds)
  step(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) this.update(dt); this.render(); }
}
