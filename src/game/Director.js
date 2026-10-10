// Cutscene director: small async verbs the story scripts are written in.
//
//   const D = game.director;
//   await D.cutscene(async () => {
//     await D.cam({ x: 0, z: 2, wupp: 0.006, pitch: 20, dur: 1.5 });
//     await D.say(genzo, 'Mamoru! Over here!', { expr: 'joy' });
//     await D.walk(mamo, 1, 2);
//     D.emote(mamo, 'sweat');
//   });
// Inside a cutscene the player can't move; tapping advances bubbles; holding
// the skip key (or the skip button) fast-forwards.
import { sleep } from '../core/util.js';

export class Director {
  constructor(game) {
    this.game = game;
    this.active = 0;
    this.skipping = false;
  }
  get g() { return this.game; }
  async cutscene(fn, { letterbox = true } = {}) {
    const g = this.g;
    this.active++;
    g.inputLocked = true;
    if (letterbox) this.letterbox(true);
    try { await fn(this); } catch (e) { console.error('cutscene error', e); }
    this.active--;
    if (this.active <= 0) {
      this.active = 0;
      g.inputLocked = false;
      this.skipping = false;
      g.timeScale = 1;
      this.letterbox(false);
      g.bubbles.clear();
    }
  }
  get inCutscene() { return this.active > 0; }
  // ---------------------------------------------------------------- time
  wait(s) {
    const g = this.g;
    return new Promise((res) => { g.timers.push({ t: s, res }); });
  }
  frame() { return this.wait(0); }
  all(list) { return Promise.all(list); }
  // ---------------------------------------------------------------- talk
  async say(char, text, o = {}) {
    if (o.expr && char?.setExpr) char.setExpr(o.expr);
    if (o.act && char?.play) char.play(o.act, o.actOpts || {});
    if (o.look && char?.lookAt) char.lookAt(o.look);
    const name = o.name ?? (char && !char.introduced && char.name ? (char.introduced = true, char.name) : null);
    await this.g.bubbles.say(char, text, { ...o, name });
    if (o.after && char?.setExpr) char.setExpr(o.after);
  }
  think(char, text, o = {}) { return this.say(char, text, { ...o, kind: 'thought', silent: true }); }
  shout(char, text, o = {}) { return this.say(char, text, { ...o, kind: 'shout' }); }
  choose(char, prompt, options, o = {}) { return this.g.bubbles.choose(char, prompt, options, o); }
  caption(text, o = {}) { return this.g.captions.show(text, o); }
  // ---------------------------------------------------------------- bodies
  walk(char, x, z, o = {}) {
    const nav = o.nav ?? this.g.location?.nav;
    return char.walkTo(x, z, { nav: o.free ? null : nav, run: o.run, face: o.face });
  }
  run(char, x, z, o = {}) { return this.walk(char, x, z, { ...o, run: true }); }
  async walkPath(char, pts, o = {}) {
    for (const p of pts) await char.walkTo(p.x, p.z, { nav: null, run: o.run });
  }
  face(char, target) {
    if (typeof target === 'number') char.faceYaw(target);
    else if (target) char.faceTo(target.x, target.z);
  }
  faceEach(a, b) { a.faceTo(b.x, b.z); b.faceTo(a.x, a.z); }
  expr(char, name) { char.setExpr(name); }
  act(char, name, o = {}) { return char.play(name, o); }
  emote(char, kind, o) { this.g.emotes.show(char, kind, o); this.g.audio?.play?.(EMOTE_SFX[kind] || 'pop', { volume: 0.35 }); }
  // ---------------------------------------------------------------- camera
  cam(shot) { return this.g.rig.play({ dur: 1.2, ...shot }); }
  follow(target, o = {}) { this.g.rig.shot = null; this.g.rig.setFollow(target); if (o.wupp) this.g.rig.wuppGoal = o.wupp; }
  shake(k = 0.6) { this.g.rig.shake = Math.max(this.g.rig.shake, k); }
  letterbox(on) { this.g.letterboxGoal = on ? 1 : 0; }
  // ---------------------------------------------------------------- screen
  async fadeOut(dur = 0.8, color = 0x0e0812) { this.g.renderer.uniforms.fadeColor.value.setHex(color); await this.tween((k) => { this.g.renderer.uniforms.fade.value = k; }, dur); }
  async fadeIn(dur = 0.8) { await this.tween((k) => { this.g.renderer.uniforms.fade.value = 1 - k; }, dur); }
  async flash(color = 0xffffff, dur = 0.5) { this.g.renderer.uniforms.flashColor.value.setHex(color); await this.tween((k) => { this.g.renderer.uniforms.flash.value = 1 - k; }, dur); }
  async title(text, sub = '', dur = 2.6) { await this.g.titleCard(text, sub, dur); }
  tween(fn, dur, ease = (x) => x * x * (3 - 2 * x)) {
    return new Promise((res) => { this.g.tweens.push({ t: 0, dur: Math.max(1e-3, dur), fn, ease, res }); });
  }
  sfx(name, o) { this.g.audio?.play?.(name, o); }
  music(name, o) { this.g.audio?.music?.(name, o); }
  sleepReal(ms) { return sleep(ms); }
}

const EMOTE_SFX = { excl: 'surprise', interro: 'surprise', quest: 'pop', heart: 'sparkle', bigheart: 'sparkle', sweat: 'embarrassed', anger: 'angryHuff', note: 'pop', idea: 'sparkle', gloom: 'sigh', sparkle: 'sparkle', zzz: 'pop', dots: 'pop' };
