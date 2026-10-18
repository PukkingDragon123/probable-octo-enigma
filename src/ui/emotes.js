// In-world emote icons that pop above characters' heads ('!', '?', '...',
// heart, sweat, anger, note, idea, gloom, sparkle, zzz, '!?') and the bobbing
// hint markers over things you can use. 2D pixel sprites rendered with the
// scene, so they share its pixel grid.
import * as THREE from 'three';
import { Atlas, SpriteBatch } from '../core/sprites.js';
import { clamp, EASE } from '../core/util.js';

// UI palette: ink, cream, vermilion, gold
const K = '#141018', W = '#fff3dc', R = '#e8443a', G = '#ffd060';
function buildAtlas() {
  const A = new Atlas(256, 128);
  // ink speech box with a cream rim and a slanted tail (the dialogue boxes in miniature)
  const bubble = (p, w, h, fill = K) => {
    p.rect(1, 0, w - 1, h - 4, K); p.rect(0, 1, w, h - 6, K);
    p.rect(1, 1, w - 2, h - 6, W);
    p.rect(2, 2, w - 4, h - 8, fill);
    p.poly([[w / 2 - 3, h - 5], [w / 2 + 3, h - 5], [w / 2 - 2, h]], K);
    p.poly([[w / 2 - 2, h - 5], [w / 2 + 1.6, h - 5], [w / 2 - 1.4, h - 2]], W);
    p.rect(w / 2 - 1, h - 6, 2, 1, fill);
    p.rect(w - 4, 0, 4, 1, R); // vermilion corner tab
  };
  A.add('excl', 13, 17, (p) => { bubble(p, 13, 17); p.rect(5, 3, 3, 5, R); p.rect(6, 8, 1, 1, R); p.rect(5, 9, 3, 2, G); });
  A.add('quest', 13, 17, (p) => { bubble(p, 13, 17); p.stamp(['.ooo.', 'o...o', '...o.', '..o..', '.....', '..o..'], { o: G }, 4, 3); });
  A.add('interro', 15, 17, (p) => { bubble(p, 15, 17); p.rect(4, 3, 2, 6, R); p.rect(4, 10, 2, 2, R); p.stamp(['ooo.', '...o', '..o.', '.o..', '....', '.o..'], { o: G }, 7, 3); });
  for (let i = 0; i < 4; i++) A.add('dots' + i, 17, 13, (p) => { bubble(p, 17, 13); for (let k = 0; k < Math.min(3, i); k++) p.rect(4 + k * 4, 4, 2, 2, W); });
  A.add('heart', 13, 12, (p) => { p.stamp(['.kk.kk.', 'kHHkHHk', 'kHhHHHk', 'kHHHHHk', '.kHHHk.', '..kHk..', '...k...'], { k: K, H: '#ff4a78', h: '#ffd0dc' }, 3, 2); });
  A.add('bigheart', 17, 15, (p) => { p.stamp(['..kkk.kkk..', '.kHHHkHHHk.', 'kHhhHHHHHHk', 'kHhHHHHHHHk', 'kHHHHHHHHHk', '.kHHHHHHHk.', '..kHHHHHk..', '...kHHHk...', '....kHk....', '.....k.....'], { k: K, H: '#ff4a78', h: '#ffd0dc' }, 3, 2); });
  A.add('sweat', 9, 13, (p) => { p.stamp(['...k...', '..kbk..', '.kbbbk.', 'kbbwbbk', 'kbwbbbk', 'kbbbbbk', '.kbbbk.', '..kkk..'], { k: '#2a4a8a', b: '#8fd0ff', w: '#ffffff' }, 1, 2); });
  A.add('anger', 13, 13, (p) => { p.stamp(['.vv...vv.', 'vVVv.vVVv', 'vV.....Vv', '.........', 'vV.....Vv', 'vVVv.vVVv', '.vv...vv.'], { v: '#ff4a4a', V: '#a8142a' }, 2, 3); });
  A.add('note', 11, 13, (p) => { p.rect(5, 1, 1, 8, K); p.rect(6, 1, 3, 2, K); p.rect(8, 3, 1, 2, K); p.ellipse(3.5, 9.5, 2.6, 2, K); p.ellipse(3.5, 9.2, 1.5, 1, '#ffd040'); });
  A.add('idea', 13, 15, (p) => { p.circle(6.5, 6, 5, K); p.circle(6.5, 6, 4, '#fff0a0'); p.circle(5.5, 5, 1.5, '#ffffff'); p.rect(4, 10, 5, 3, '#9a9aa8'); p.rect(4, 11, 5, 1, K); p.rect(5, 13, 3, 1, K); });
  A.add('gloom', 17, 11, (p) => { p.ellipse(8.5, 5, 8, 4.5, '#5a4a7a'); p.ellipse(6, 4, 4, 3, '#6a5a8a'); p.ellipse(11, 4.5, 4, 3, '#6a5a8a'); for (let i = 0; i < 4; i++) p.vline(3 + i * 4, 8, 10, '#7a6aa8'); });
  A.add('sparkle', 11, 11, (p) => { p.rect(5, 0, 1, 11, '#fff4b0'); p.rect(0, 5, 11, 1, '#fff4b0'); p.rect(4, 4, 3, 3, '#ffffff'); p.px(2, 2, '#fff4b0'); p.px(8, 8, '#fff4b0'); });
  A.add('zzz', 13, 11, (p) => { p.stamp(['kkkk', '..k.', '.k..', 'kkkk'], { k: '#a8b0ff' }, 1, 5); p.stamp(['kkk', '.k.', 'kkk'], { k: '#c8ccff' }, 7, 1); });
  A.add('swirl', 11, 11, (p) => { p.ring(5.5, 5.5, 5, '#8a7aa8'); p.ring(5.5, 5.5, 2.6, '#8a7aa8'); });
  // hint markers: a bobbing "tap me" glove with a vermilion cuff, a gold diamond, a talk box
  A.add('hintHand', 11, 13, (p) => {
    p.stamp(['...kk......', '..kwwk.....', '..kwwk.....', '..kwwkkk...', '..kwwkwwkk.', 'kkkwwkwwkwk', 'kwwwwwwwwwk', 'kwswwwwwwsk', '.kwwwwwwsk.', '..krrrrrk..', '..kkkkkkk..'], { k: K, w: W, s: '#e8cfa4', r: R }, 0, 1);
  });
  A.add('hintDiamond', 9, 9, (p) => { p.poly([[4.5, 0], [9, 4.5], [4.5, 9], [0, 4.5]], K); p.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 7.8], [1.2, 4.5]], R); p.poly([[4.5, 2.4], [6.6, 4.5], [4.5, 6.6], [2.4, 4.5]], G); p.px(4, 3, '#ffffff'); });
  A.add('hintTalk', 13, 12, (p) => { bubble(p, 13, 12); for (let k = 0; k < 3; k++) p.rect(3 + k * 3, 3, 2, 2, k === 1 ? R : W); });
  return A.finish();
}

const POP = { excl: 1, quest: 1, interro: 1, heart: 1, bigheart: 1, sweat: 1, anger: 1, note: 1, idea: 1, gloom: 1, sparkle: 1, zzz: 1, swirl: 1, dots: 1 };

export class Emotes {
  constructor(scene) {
    this.atlas = buildAtlas();
    this.batch = new SpriteBatch(this.atlas, { max: 128, lit: false, name: 'emotes', texels: 64, renderOrder: 20 });
    this.batch.mesh.castShadow = false;
    this.batch.mesh.receiveShadow = false;
    // draw on top of the scene's geometry so icons never hide inside heads
    this.batch.mesh.material.depthTest = false;
    scene.add(this.batch.mesh);
    this.list = [];
    this.hints = new Map(); // id -> { pos | fn, kind }
    this._v = new THREE.Vector3();
  }
  setScene(scene) { scene.add(this.batch.mesh); }
  // show an emote over a character (or any { headPos() } / position fn)
  show(target, kind = 'excl', { dur = 1.6, dy = 0.08 } = {}) {
    if (!POP[kind]) return;
    // replace an existing emote on the same target
    this.list = this.list.filter((e) => e.target !== target);
    this.list.push({ target, kind, t: 0, dur, dy });
  }
  hint(id, pos, kind = 'hintHand') { this.hints.set(id, { pos, kind }); }
  unhint(id) { this.hints.delete(id); }
  clearHints() { this.hints.clear(); }
  clear() { this.list.length = 0; this.hints.clear(); }
  update(dt, t) {
    const B = this.batch;
    B.clear();
    const v = this._v;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.t += dt;
      if (e.t > e.dur) { this.list.splice(i, 1); continue; }
      const tg = e.target;
      if (tg.headPos) tg.headPos(v); else if (typeof tg === 'function') v.copy(tg()); else v.set(tg.x, tg.y ?? 1, tg.z);
      const u = e.t / e.dur;
      const pop = e.t < 0.2 ? EASE.outBack(e.t / 0.2) : 1;
      const out = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
      let frame = e.kind;
      if (e.kind === 'dots') frame = 'dots' + Math.min(3, Math.floor(e.t * 4) % 4);
      const bob = Math.sin(e.t * 6) * 0.015;
      B.push(frame, v.x + 0.14, v.y + e.dy + 0.12 + bob + (1 - pop) * -0.05, v.z, { mode: 2, scale: Math.max(0.01, pop * out), ax: 0.5, ay: 0 });
    }
    for (const [, h] of this.hints) {
      const p = typeof h.pos === 'function' ? h.pos() : h.pos;
      if (!p) continue;
      const bob = Math.abs(Math.sin(t * 3.2)) * 0.06;
      B.push(h.kind, p.x, (p.y ?? 0.5) + 0.1 + bob, p.z, { mode: 2, ax: 0.5, ay: 0, scale: 1 + Math.sin(t * 6.4) * 0.04 });
    }
    B.commit();
  }
}
