// Animated pixel-art faces. Every character has a small canvas (default 48x40
// texels) painted onto a curved decal in front of its head. The painter is
// parametric: eyes (with lids, tilt, gaze, pupils, highlights and a dozen
// special shapes), brows, mouth (expressions + talking visemes), blush, tears,
// sweat, anger veins, gloom and sparkles. It only repaints when the state
// changes.
import * as THREE from 'three';
import { PixCanvas, lighten, darken, mix } from '../core/pixtex.js';
import { clamp, lerp } from '../core/util.js';

// ---------------------------------------------------------------- expressions
// Each expression sets targets; anything left out falls back to NEUTRAL.
// eye: { open 0..1, lower 0..1 (cheek push), tilt -1 sad .. +1 angry, shape, pupil }
// brow: { y -1 low .. +1 raised, tilt -1 worried .. +1 angry, curve }
// mouth: shape name; fx: { blush, gloom, sweat, vein, tears, sparkle, shadow }
const NEUTRAL = { eye: { open: 1, lower: 0, tilt: 0, shape: 'normal', pupil: 1 }, brow: { y: 0, tilt: 0, curve: 0.2 }, mouth: 'line', fx: {} };
export const EXPRESSIONS = {
  neutral: {},
  calm: { eye: { open: 0.82 }, mouth: 'smallSmile' },
  smile: { eye: { open: 0.9, lower: 0.25 }, brow: { y: 0.15 }, mouth: 'smile' },
  happy: { eye: { shape: 'happy' }, brow: { y: 0.35 }, mouth: 'openSmile', fx: { blush: 0.5 } },
  joy: { eye: { shape: 'happy' }, brow: { y: 0.5 }, mouth: 'bigSmile', fx: { blush: 0.7, sparkle: 1 } },
  excited: { eye: { shape: 'sparkle', open: 1.1 }, brow: { y: 0.7 }, mouth: 'bigSmile', fx: { blush: 0.6, sparkle: 1 } },
  sad: { eye: { open: 0.72, tilt: -0.8 }, brow: { y: 0.1, tilt: -1, curve: 0 }, mouth: 'frown' },
  verySad: { eye: { open: 0.6, tilt: -1, shape: 'teary' }, brow: { y: 0.15, tilt: -1 }, mouth: 'wobble', fx: { gloom: 0.6 } },
  crying: { eye: { shape: 'closedSad' }, brow: { y: 0.2, tilt: -1 }, mouth: 'wail', fx: { tears: 1, blush: 0.4 } },
  teary: { eye: { shape: 'teary', open: 0.85, tilt: -0.5 }, brow: { y: 0.2, tilt: -0.8 }, mouth: 'wobble', fx: { tears: 0.35 } },
  hollow: { eye: { open: 0.55, pupil: 0.8, tilt: -0.2 }, brow: { y: -0.1, tilt: -0.3 }, mouth: 'line', fx: { shadow: 0.35 } },
  tired: { eye: { open: 0.45, tilt: -0.2 }, brow: { y: -0.2, tilt: -0.4 }, mouth: 'line', fx: { bags: 1 } },
  angry: { eye: { open: 0.8, tilt: 1 }, brow: { y: -0.6, tilt: 1, curve: 0 }, mouth: 'grit', fx: { vein: 1 } },
  furious: { eye: { shape: 'blankWhite' }, brow: { y: -0.8, tilt: 1 }, mouth: 'shout', fx: { vein: 1, shadow: 0.6 } },
  grumpy: { eye: { open: 0.62, tilt: 0.6 }, brow: { y: -0.4, tilt: 0.8 }, mouth: 'frownSmall', fx: {} },
  annoyed: { eye: { open: 0.55, tilt: 0.2 }, brow: { y: -0.2, tilt: 0.3 }, mouth: 'flat', fx: { vein: 0.6 } },
  surprised: { eye: { open: 1.2, pupil: 0.65 }, brow: { y: 1 }, mouth: 'o', fx: {} },
  shocked: { eye: { shape: 'tiny', open: 1.25 }, brow: { y: 1, tilt: -0.4 }, mouth: 'bigO', fx: { sweat: 1, gloom: 0.3 } },
  scared: { eye: { open: 1.1, pupil: 0.5, tilt: -0.6 }, brow: { y: 0.8, tilt: -1 }, mouth: 'wavyOpen', fx: { sweat: 1 } },
  embarrassed: { eye: { shape: 'squeeze' }, brow: { y: 0.3, tilt: -0.6 }, mouth: 'wavy', fx: { blush: 1, blushLines: 1, sweat: 0.6 } },
  shy: { eye: { open: 0.7, lower: 0.3, tilt: -0.3 }, brow: { y: 0.25, tilt: -0.5 }, mouth: 'wavy', fx: { blush: 0.9 } },
  flustered: { eye: { shape: 'spiral' }, brow: { y: 0.6, tilt: -0.7 }, mouth: 'wavyOpen', fx: { blush: 1, blushLines: 1, sweat: 1 } },
  awkward: { eye: { shape: 'flat' }, brow: { y: 0.2, tilt: -0.3 }, mouth: 'wavy', fx: { sweat: 1 } },
  smug: { eye: { open: 0.55, lower: 0.2, tilt: 0.3 }, brow: { y: 0.1, tilt: 0.4 }, mouth: 'smirk', fx: {} },
  proud: { eye: { shape: 'closed' }, brow: { y: 0.5, tilt: 0.2 }, mouth: 'smile', fx: { sparkle: 0.6 } },
  thinking: { eye: { open: 0.75, tilt: 0.1, gy: -0.8, gx: 0.6 }, brow: { y: 0.3, tilt: 0.2, asym: 1 }, mouth: 'pout', fx: {} },
  confused: { eye: { open: 0.95, pupil: 0.8 }, brow: { y: 0.4, tilt: -0.3, asym: 1 }, mouth: 'wavy', fx: { sweat: 0.4 } },
  skeptical: { eye: { open: 0.6, tilt: 0.3, asym: 1 }, brow: { y: 0.2, asym: 1, tilt: 0.4 }, mouth: 'flat', fx: {} },
  love: { eye: { shape: 'heart' }, brow: { y: 0.6 }, mouth: 'openSmile', fx: { blush: 1, sparkle: 0.5 } },
  dreamy: { eye: { shape: 'content' }, brow: { y: 0.4, tilt: -0.2 }, mouth: 'smallSmile', fx: { blush: 0.8 } },
  sleepy: { eye: { open: 0.3, tilt: -0.1 }, brow: { y: -0.1 }, mouth: 'smallO', fx: {} },
  asleep: { eye: { shape: 'closed' }, brow: { y: -0.1 }, mouth: 'smallO', fx: {} },
  dizzy: { eye: { shape: 'spiral' }, brow: { y: 0.4, tilt: -0.5 }, mouth: 'wavyOpen', fx: {} },
  ko: { eye: { shape: 'x' }, brow: { y: 0.3 }, mouth: 'wavyOpen', fx: {} },
  determined: { eye: { open: 0.9, tilt: 0.5 }, brow: { y: -0.3, tilt: 0.7 }, mouth: 'grinClosed', fx: { sparkle: 0.4 } },
  delicious: { eye: { shape: 'happy' }, brow: { y: 0.4 }, mouth: 'chew', fx: { blush: 0.8, sparkle: 0.6 } },
  disgust: { eye: { open: 0.5, tilt: 0.4, asym: 1 }, brow: { y: -0.1, tilt: 0.5 }, mouth: 'grimace', fx: { gloom: 0.4 } },
  pout: { eye: { open: 0.7, tilt: 0.3 }, brow: { y: -0.2, tilt: 0.4 }, mouth: 'pout', fx: { blush: 0.5 } },
  nostalgic: { eye: { shape: 'content' }, brow: { y: 0.15, tilt: -0.5 }, mouth: 'smallSmile', fx: {} },
  gentle: { eye: { open: 0.75, lower: 0.35 }, brow: { y: 0.2, tilt: -0.3 }, mouth: 'smallSmile', fx: { blush: 0.2 } },
  laugh: { eye: { shape: 'squeeze' }, brow: { y: 0.5 }, mouth: 'laugh', fx: { blush: 0.5 } },
  greedy: { eye: { shape: 'coin' }, brow: { y: 0.4, tilt: 0.3 }, mouth: 'grin', fx: { sparkle: 0.5 } },
  left_out: { eye: { open: 0.62, tilt: -0.3, gx: -0.8, gy: 0.4 }, brow: { y: 0.0, tilt: -0.5 }, mouth: 'wavy', fx: {} },
};
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

function resolve(name) {
  const e = EXPRESSIONS[name] || {};
  return {
    eye: { ...NEUTRAL.eye, ...(e.eye || {}) },
    brow: { ...NEUTRAL.brow, ...(e.brow || {}) },
    mouth: e.mouth || NEUTRAL.mouth,
    fx: { ...(e.fx || {}) },
  };
}

// talking visemes (from text): which mouth shape a letter group maps to
export function visemeFor(ch) {
  if (!ch) return null;
  const c = ch.toLowerCase();
  if ('a'.includes(c)) return 'A';
  if ('ei'.includes(c)) return 'E';
  if ('ou'.includes(c)) return 'O';
  if ('mbp'.includes(c)) return 'M';
  if ('fvw'.includes(c)) return 'U';
  if (/[a-z]/.test(c)) return 'I';
  return null;
}

// ---------------------------------------------------------------- the painter
export class Face {
  // style: { w, h, eyeY, eyeDX, eyeW, eyeH, eyeStyle: 'anime'|'bead'|'dot', iris, irisLight, pupil,
  //          sclera, lash, lid (skin around eyes), brow, browY, browW, browThick, mouthY, mouthW,
  //          mouthCol, tongue, teeth, blushCol, blushY, blushDX, beak (turtle mouth), freckles,
  //          whiskers, girl (lash flick), skin }
  constructor(style = {}) {
    this.s = {
      w: 48, h: 40, eyeY: 20, eyeDX: 9, eyeW: 9, eyeH: 11, eyeStyle: 'anime',
      iris: '#3a2418', irisLight: '#7a4a2a', pupil: '#140a10', sclera: '#fffaf2', lash: '#2a1620',
      lid: '#2a1620', brow: '#3a2418', browY: 10, browW: 8, browThick: 2,
      mouthY: 31, mouthW: 8, mouthCol: '#3a1424', mouthIn: '#6a2030', tongue: '#ff8a9c', teeth: '#ffffff',
      blushCol: '#ff8aa0', blushY: 27, blushDX: 14, skin: '#88c070', beak: false, freckles: false,
      whiskers: false, girl: false, nostrils: false, cheekFluff: null,
      ...style,
    };
    if (typeof this.s.skin === 'number') this.s.skin = '#' + this.s.skin.toString(16).padStart(6, '0');
    this.pc = new PixCanvas(this.s.w, this.s.h);
    this.texture = new THREE.CanvasTexture(this.pc.c);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    if (this.s.mouthCanvas) {
      const M = this.s.mouthCanvas;
      this.mpc = new PixCanvas(M.w, M.h);
      this.mtexture = new THREE.CanvasTexture(this.mpc.c);
      this.mtexture.magFilter = THREE.NearestFilter;
      this.mtexture.minFilter = THREE.NearestMipmapLinearFilter;
      this.mtexture.colorSpace = THREE.SRGBColorSpace;
    }
    // live state
    this.exprName = 'neutral';
    this.cur = resolve('neutral');
    this.blink = 0; // 0 open .. 1 closed
    this.blinkT = 1 + Math.random() * 3;
    this.blinkPhase = -1;
    this.gaze = { x: 0, y: 0 };
    this.gazeGoal = { x: 0, y: 0 };
    this.saccT = 1;
    this.viseme = null; // talking shape or null
    this.time = 0;
    this.override = {}; // per-frame tweaks (e.g. eyesClosed for sleep)
    this._key = '';
    this.anim = 0; // for animated fx
    this.paint(true);
  }

  set(name) {
    if (!EXPRESSIONS[name]) name = 'neutral';
    if (name === this.exprName) return;
    this.exprName = name;
    this.cur = resolve(name);
    // a quick blink often sells the change
    if (Math.random() < 0.45 && this.blinkPhase < 0) this.blinkPhase = 0;
  }
  // look direction in -1..1 (x right on screen, y down)
  look(x, y) { this.gazeGoal.x = clamp(x, -1, 1); this.gazeGoal.y = clamp(y, -1, 1); }
  talk(v) { this.viseme = v; }

  update(dt) {
    this.time += dt;
    // blinking (not when eyes are a closed/special shape)
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkPhase < 0) {
      this.blinkPhase = 0;
      this.blinkT = 1.8 + Math.random() * 4.2;
      if (Math.random() < 0.18) this.doubleBlink = true;
    }
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt;
      const T = 0.16;
      const u = this.blinkPhase / T;
      this.blink = u < 0.4 ? u / 0.4 : u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4);
      if (this.blinkPhase >= T) {
        this.blink = 0;
        this.blinkPhase = this.doubleBlink ? -0.0001 : -1;
        if (this.doubleBlink) { this.doubleBlink = false; this.blinkPhase = -1; this.blinkT = 0.12; }
      }
    }
    // micro saccades around the gaze goal
    this.saccT -= dt;
    let jx = 0, jy = 0;
    if (this.saccT <= 0) { this.saccT = 0.6 + Math.random() * 1.8; this._jx = (Math.random() - 0.5) * 0.35; this._jy = (Math.random() - 0.5) * 0.25; }
    jx = this._jx || 0; jy = this._jy || 0;
    const ex = this.cur.eye;
    const gx = clamp(this.gazeGoal.x + (ex.gx ?? 0) + jx, -1, 1), gy = clamp(this.gazeGoal.y + (ex.gy ?? 0) + jy, -1, 1);
    this.gaze.x += (gx - this.gaze.x) * Math.min(1, dt * 18);
    this.gaze.y += (gy - this.gaze.y) * Math.min(1, dt * 18);
    this.anim += dt;
    this.paint();
  }

  // ---------------------------------------------------------------- painting
  paint(force = false) {
    const c = this.cur, s = this.s;
    const fx = c.fx;
    const animated = fx.tears || fx.vein || fx.sparkle || fx.sweat || c.eye.shape === 'spiral' || c.eye.shape === 'teary' || c.eye.shape === 'heart';
    const frame = animated ? Math.floor(this.anim * 6) : 0;
    const gx = Math.round(this.gaze.x * 2), gy = Math.round(this.gaze.y * 1.5);
    const bl = this.override.eyesClosed ? 1 : this.blink;
    const key = [this.exprName, gx, gy, Math.round(bl * 3), this.viseme, frame, this.override.eyesClosed ? 1 : 0, this.override.mouth || ''].join('|');
    if (!force && key === this._key) return;
    this._key = key;
    const P = this.pc;
    P.clear();
    const cx = s.w / 2;
    // under-layers: blush, shadow, gloom
    // hood / gloom shadow: a solid darker-skin band over the brow (no checker dither; reads as shade, not noise)
    if (fx.shadow) {
      const hb = Math.round(s.eyeY - s.eyeH / 2 - 1);
      P.rect(0, 0, s.w, hb, mix(s.skin, '#2a1838', 0.32 + fx.shadow * 0.4));
      for (let x = 0; x < s.w; x++) if ((x % 3) !== 1) P.px(x, hb, mix(s.skin, '#2a1838', 0.25 + fx.shadow * 0.3));
    }
    if (fx.gloom) for (let i = 0; i < 7; i++) {
      const x = Math.round(cx - 14 + i * 4.6);
      P.vline(x, 1, Math.round(3 + (i % 3) * 2 + fx.gloom * 5), '#7a68c8');
    }
    if (s.patch) { P.ellipse(cx, s.eyeY + 2, s.eyeDX + s.eyeW * 0.9, s.eyeH * 0.95, s.patch); P.ellipse(cx, s.mouthY - 1, s.mouthW * 0.9, 4, s.patch); }
    if (s.mask) for (const side of [-1, 1]) { P.ellipse(cx + side * s.eyeDX, s.eyeY + 1, s.eyeW * 0.8, s.eyeH * 0.65, s.mask); }
    if (fx.blush) this.drawBlush(fx.blush, fx.blushLines);
    if (fx.bags) { for (const side of [-1, 1]) P.hline(Math.round(cx + side * s.eyeDX - 3), Math.round(cx + side * s.eyeDX + 2), Math.round(s.eyeY + s.eyeH / 2 + 2), mix(s.skin, '#5a3a6a', 0.45)); }
    if (s.decor) for (const dc of s.decor) {
      const x = Math.round(cx + dc.x), y = Math.round(dc.y);
      if (dc.type === 'bandaid') { // a little sticking plaster, slightly crooked
        P.rect(x - 4, y - 1, 9, 3, '#f2c8a0'); P.rect(x - 1, y - 1, 3, 3, '#fbe4cc');
        P.px(x - 4, y - 1, '#d8a478'); P.px(x + 4, y + 1, '#d8a478'); P.px(x - 3, y, '#e0b088'); P.px(x + 3, y, '#e0b088');
        P.px(x, y, '#f0d0b0');
      } else if (dc.type === 'mole') P.px(x, y, dc.color || '#5a3a2a');
      else if (dc.type === 'scar') { P.line(x - 2, y - 2, x + 2, y + 2, '#c8a090'); P.px(x - 1, y + 1, '#c8a090'); P.px(x + 1, y - 1, '#c8a090'); }
      else if (dc.type === 'whiskerDots') for (const sd of [-1, 1]) for (const [ddx, ddy] of [[0, 0], [2, -1], [2, 1]]) P.px(x + sd * (dc.dx ?? 8) + sd * ddx, y + ddy, dc.color || '#5a3a2a');
    }
    if (s.freckles) for (const side of [-1, 1]) for (const [dx, dy] of [[0, 0], [2, 1], [-2, 1], [1, 2]]) P.px(Math.round(cx + side * (s.blushDX - 1) + dx), Math.round(s.blushY + dy - 1), mix(s.skin, '#a0583a', 0.5));
    // eyes
    for (const side of [-1, 1]) this.drawEye(side, cx + side * s.eyeDX, s.eyeY, bl, gx, gy, frame);
    // glasses: thin round frames with a lens glint
    if (s.glasses) {
      const gc = s.glasses.color || '#5a3a24';
      const r = Math.max(s.eyeW, s.eyeH) * 0.62 + 1.5;
      for (const side of [-1, 1]) {
        const gx = cx + side * s.eyeDX;
        P.ring(gx, s.eyeY + 0.5, r, gc);
        P.px(Math.round(gx - r * 0.45), Math.round(s.eyeY - r * 0.4), '#ffffffc0');
      }
      P.hline(Math.round(cx - s.eyeDX + r - 1), Math.round(cx + s.eyeDX - r + 1), Math.round(s.eyeY - 1), gc);
    }
    // brows
    if (s.brow) for (const side of [-1, 1]) this.drawBrow(side, cx + side * s.eyeDX, s.browY);
    // nose / nostrils
    if (s.nostrils) { P.px(Math.round(cx - 2), s.mouthY - 5, darken(s.skin, 0.55)); P.px(Math.round(cx + 1), s.mouthY - 5, darken(s.skin, 0.55)); }
    if (s.whiskers) for (const side of [-1, 1]) for (let k = 0; k < 3; k++) P.px(Math.round(cx + side * (s.mouthW / 2 + 4 + k * 2)), s.mouthY - 2 + (k % 2), darken(s.skin, 0.4));
    // mouth
    if (this.mpc) this.mpc.clear();
    this.drawMouth(this.override.mouth || this.viseme || c.mouth, frame);
    if (this.mtexture) this.mtexture.needsUpdate = true;
    // overlays: tears, sweat, vein, sparkle
    if (fx.tears) this.drawTears(fx.tears, frame);
    if (fx.sweat) this.drawSweat(frame);
    if (fx.vein) this.drawVein(frame);
    if (fx.sparkle) this.drawSparkle(frame);
    this.texture.needsUpdate = true;
  }

  drawBlush(k, lines) {
    const s = this.s, P = this.pc, cx = s.w / 2;
    for (const side of [-1, 1]) {
      const bx = cx + side * s.blushDX, by = s.blushY;
      P.dither(Math.round(bx - 4), Math.round(by - 1), 8, 3, s.blushCol, (x, y, u, v) => k * (1 - Math.abs(u - 0.5) * 1.2) * 1.4);
      if (k > 0.7) P.rect(Math.round(bx - 2), Math.round(by), 4, 1, lighten(s.blushCol, 0.25));
      if (lines) for (let i = 0; i < 3; i++) P.line(Math.round(bx - 3 + i * 2), by + 1, Math.round(bx - 2 + i * 2), by - 1, darken(s.blushCol, 0.25));
    }
  }

  // one eye. side -1 = viewer's left. closing `bl` 0..1 multiplies the lid.
  drawEye(side, ex, ey, bl, gx, gy, frame) {
    const s = this.s, P = this.pc, e = this.cur.eye;
    ex = Math.round(ex); ey = Math.round(ey);
    const asym = e.asym && side > 0 ? 0.55 : 1;
    let shape = e.shape;
    const open = clamp(e.open * asym * (1 - bl), 0, 1.3);
    if (bl > 0.66 && !['happy', 'closed', 'closedSad', 'content', 'squeeze', 'x', 'flat'].includes(shape)) shape = 'blink';
    else if (bl > 0.3 && shape === 'normal') { /* half blink handled by `open` */ }
    const ink = s.lash;
    const W = s.eyeW, H = s.eyeH;
    const half = Math.floor(W / 2);
    const fl = side < 0; // flip so outer corner = outside
    const X = (dx) => ex + (fl ? -dx : dx); // dx: + towards the outer side for side>0
    switch (shape) {
      case 'happy': { // ^ ^
        for (let i = -half; i <= half; i++) {
          const yy = Math.round(ey + 1 - (1 - (i / half) ** 2) * 3);
          P.rect(ex + i, yy, 1, 2, ink);
        }
        return;
      }
      case 'closed': case 'blink': {
        for (let i = -half; i <= half; i++) {
          const yy = Math.round(ey + 2 + (i / half) ** 2 * 0.8);
          P.rect(ex + i, yy, 1, 1, ink);
        }
        if (s.girl) { P.px(X(half + 1), ey + 2, ink); P.px(X(half + 2), ey + 1, ink); }
        else P.px(X(half), ey + 1, ink);
        return;
      }
      case 'closedSad': {
        for (let i = -half; i <= half; i++) {
          const t = (i * (fl ? -1 : 1)) / half; // -1 inner .. +1 outer
          P.rect(ex + i, Math.round(ey + 1 + t * 1.6), 1, 2, ink);
        }
        return;
      }
      case 'content': { // u u
        for (let i = -half; i <= half; i++) {
          const yy = Math.round(ey + (1 - (1 - (i / half) ** 2)) * -0 + (1 - (i / half) ** 2) * 2.2);
          P.rect(ex + i, yy, 1, 1, ink);
        }
        return;
      }
      case 'squeeze': { // > <
        const d = fl ? 1 : -1;
        for (let k = 0; k <= 3; k++) { P.rect(ex + d * (k - 2) * -1, ey - 2 + k, 2, 1, ink); P.rect(ex + d * (k - 2) * -1, ey + 4 - k, 2, 1, ink); }
        return;
      }
      case 'flat': { // awkward - - with a dot pupil peeking
        P.rect(ex - half, ey, W, 1, ink);
        P.rect(ex - half + 1, ey + 1, W - 2, 2, s.sclera);
        P.rect(ex - 1 + gx, ey + 1, 2, 2, s.pupil);
        P.rect(ex - half, ey + 3, W, 1, darken(s.skin, 0.35));
        return;
      }
      case 'x': {
        for (let k = -2; k <= 2; k++) { P.rect(ex + k, ey + k, 1, 1, ink); P.rect(ex + k, ey - k, 1, 1, ink); }
        P.rect(ex - 3, ey - 3, 1, 1, ink); P.rect(ex + 3, ey + 3, 1, 1, ink); P.rect(ex - 3, ey + 3, 1, 1, ink); P.rect(ex + 3, ey - 3, 1, 1, ink);
        return;
      }
      case 'spiral': {
        const r = Math.min(half, Math.floor(H / 2));
        P.ellipse(ex + 0.5, ey + 0.5, r + 0.5, r + 0.5, s.sclera);
        const a0 = this.anim * 6 * (side);
        for (let t = 0; t < 1; t += 0.03) {
          const a = a0 + t * 12, rr = t * r;
          P.px(Math.round(ex + Math.cos(a) * rr), Math.round(ey + Math.sin(a) * rr), ink);
        }
        P.ring(ex + 0.5, ey + 0.5, r + 0.5, ink);
        return;
      }
      case 'heart': {
        const pulse = (frame % 4) < 2 ? 0 : 1;
        const rows = pulse ? ['.HH.HH.', 'HhHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'] : ['.HH.HH.', 'HhHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'].map((r) => r);
        P.stamp(rows, { H: '#ff4a78', h: '#ffd0dc' }, ex - 3, ey - 2);
        if (pulse) P.frame(ex - 4, ey - 3, 9, 8, '#00000000');
        return;
      }
      case 'coin': {
        P.ellipse(ex + 0.5, ey + 0.5, 4, 4.5, '#e8a820');
        P.ellipse(ex + 0.5, ey + 0.5, 3, 3.5, '#ffd84a');
        P.rect(ex, ey - 2, 1, 5, '#b87a10'); P.rect(ex - 1, ey - 1, 3, 1, '#b87a10');
        P.px(ex - 2, ey - 2, '#fff8c0');
        return;
      }
      case 'blankWhite': { // furious comedic: white eyes with dark rims, slanted
        const t = side * (fl ? -1 : 1);
        P.ellipse(ex + 0.5, ey + 1, half, H / 2.6, '#ffffff');
        for (let i = -half; i <= half; i++) { const it = (i * (fl ? 1 : -1)) / half; P.rect(ex + i, Math.round(ey - H / 2.6 + 1 + (it + 1) * 1.5), 1, 2, ink); }
        return;
      }
      default: break;
    }
    // ---- open eyes ('normal', 'teary', 'sparkle', 'tiny', 'wide')
    if (s.eyeStyle === 'gloss') {
      // The Bear Must Eat's glossy bead: a dark oval with an ink rim, a warm
      // iris glow in the lower half, a 2x2 highlight up-left and a dot down-right.
      // Lids cut it from the top (sleepy / sad / angry tilt) and the cheeks push
      // it up from below (smiles).
      const big = shape === 'wide' ? 1.15 : shape === 'tiny' ? 0.62 : 1;
      const rx = (W / 2) * big, ry = (H / 2) * big;
      const ocx = ex + 0.5 + gx * 0.6, ocy = ey + 0.5 + gy * 0.5;
      const tilt = e.tilt, lower = e.lower;
      const opn = clamp(open, 0, 1.3);
      const lidTop = (px) => {
        const u = (px + 0.5 - ex - 0.5) / Math.max(1, rx); // -1..1 viewer left..right
        const it = u * (fl ? -1 : 1); // -1 inner .. +1 outer
        let y = ocy - ry + (1 - Math.min(1, opn)) * ry * 2.05;
        if (tilt > 0) y += (1 - it) * tilt * 1.4; // angry: inner corner drops
        else if (tilt < 0) y += (1 + it) * -tilt * 1.2; // sad: outer corner drops
        return y;
      };
      const botY = ocy + ry - lower * ry * 0.9;
      const inside = (px, py) => {
        const dx = (px + 0.5 - ocx) / rx, dy = (py + 0.5 - ocy) / ry;
        return dx * dx + dy * dy <= 1 && py + 0.5 >= lidTop(px) && py + 0.5 <= botY;
      };
      const x0 = Math.floor(ocx - rx - 1), x1 = Math.ceil(ocx + rx + 1), y0 = Math.floor(ocy - ry - 1), y1 = Math.ceil(ocy + ry + 1);
      let any = false;
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        if (!inside(px, py)) continue;
        any = true;
        const dx = (px + 0.5 - ocx) / rx, dy = (py + 0.5 - ocy) / ry;
        let col = dy > 0.55 && Math.abs(dx) < 0.55 ? s.irisLight : dy > 0.18 ? s.iris : s.pupil;
        if (shape === 'teary' && dy > 0.1) col = dy > 0.5 ? '#9ad8ff' : '#5aa8e8';
        const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
        P.px(px, py, edge && !(dy > 0.6 && Math.abs(dx) < 0.3) ? ink : col);
      }
      if (!any) { // fully lidded: a soft closed line
        for (let i = -Math.floor(rx); i <= Math.floor(rx); i++) P.px(ex + i, Math.round(ocy + 0.5 + (i / rx) ** 2 * 0.6), ink);
        return;
      }
      // highlights (only where the eye is open)
      const hl = (x, y, c = '#ffffff') => { if (inside(x, y)) P.px(x, y, c); };
      const hx = Math.floor(ocx - rx * 0.45), hy = Math.floor(ocy - ry * 0.5);
      if (shape === 'sparkle') {
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 1], [0, -1], [1, 2]]) hl(hx + dx + 1, hy + dy, dx === 0 && dy === 0 ? '#ffffff' : '#fff6c8');
        hl(Math.floor(ocx + rx * 0.35), Math.floor(ocy + ry * 0.3));
      } else if (shape !== 'tiny') {
        hl(hx, hy); hl(hx + 1, hy); hl(hx, hy + 1); if (rx >= 3) hl(hx + 1, hy + 1);
        hl(Math.floor(ocx + rx * 0.38), Math.floor(ocy + ry * 0.3));
        if (shape === 'teary') { hl(Math.floor(ocx - 1), Math.floor(ocy + ry * 0.55), '#e8f8ff'); }
      } else hl(Math.floor(ocx - 0.5), Math.floor(ocy - 0.5));
      // the lid line when it cuts the eye + a lash flick at the outer corner
      if (opn < 0.98 || Math.abs(tilt) > 0.2) {
        for (let px = x0; px <= x1; px++) {
          const dx = (px + 0.5 - ocx) / (rx + 0.6);
          if (Math.abs(dx) > 1) continue;
          const yy = Math.floor(lidTop(px)) - 1;
          if (yy + 1 > ocy - ry * Math.sqrt(Math.max(0, 1 - dx * dx)) - 0.5) P.px(px, yy + 1, ink);
        }
      }
      if (s.girl) { const ox = Math.round(ocx + (fl ? -1 : 1) * (rx + 0.2)), oy = Math.round(Math.max(lidTop(ox), ocy - ry * 0.6)); P.px(ox, oy, ink); P.px(ox + (fl ? -1 : 1), oy - 1, ink); }
      return;
    }
    if (s.eyeStyle === 'dot' || s.eyeStyle === 'bead') {
      // compact animal eyes: a dark oval with highlight, lids cut it
      const w = s.eyeStyle === 'dot' ? Math.max(3, Math.round(W * 0.55)) : Math.max(4, Math.round(W * 0.75));
      const h = Math.max(1, Math.round(H * 0.8 * Math.min(1, open)));
      const top = Math.round(ey + (H * 0.8 - h) * 0.65 - H * 0.4 + 1);
      if (h <= 1) { P.rect(ex - Math.floor(w / 2), ey + 1, w, 1, ink); return; }
      P.rrect(ex - Math.floor(w / 2) + gx, top + gy, w, h, Math.min(2, Math.floor(w / 3)), s.pupil);
      if (shape !== 'tiny') { P.rect(ex - Math.floor(w / 2) + 1 + gx, top + 1 + gy, Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)), '#ffffff'); }
      if (shape === 'sparkle') { P.px(ex + 1 + gx, top + h - 2 + gy, '#ffffff'); }
      if (shape === 'teary') P.rect(ex - Math.floor(w / 2) + gx, top + h - 2 + gy, w, 2, '#7ac8f8');
      // lid tilt line
      const tilt = e.tilt;
      if (Math.abs(tilt) > 0.2) for (let i = -Math.floor(w / 2) - 1; i <= Math.floor(w / 2) + 1; i++) {
        const it = (i * (fl ? -1 : 1)) / (w / 2); // -1 inner .. +1 outer
        const yy = Math.round(top - 1 + gy + (tilt > 0 ? (1 - it) : (1 + it)) * Math.abs(tilt) * 1.2);
        P.rect(ex + i + gx, yy - 1, 1, 2, s.lid === s.lash ? ink : s.lid);
      }
      return;
    }
    // anime eye: lid-cut ellipse with sclera, iris, pupil, highlights, lashes
    const rx = W / 2, ry = H / 2;
    const tilt = e.tilt;
    const lower = e.lower;
    const topBase = ey - ry + (1 - Math.min(1, open)) * H * 0.95 - Math.max(0, open - 1) * 2;
    const botBase = ey + ry - lower * H * 0.45;
    const scl = shape === 'tiny' ? 1.0 : 1;
    // per column lid lines
    const cols = [];
    for (let i = -Math.floor(rx); i <= Math.floor(rx); i++) {
      const u = i / rx; // -1..1
      const it = u * (fl ? -1 : 1); // -1 inner .. +1 outer
      const curve = Math.sqrt(Math.max(0, 1 - u * u));
      let yt = ey - ry * curve * scl;
      yt = Math.max(yt, topBase + (1 - curve) * 1.2 + (tilt > 0 ? (1 - it) * tilt * 2.2 : (1 + it) * -tilt * 1.6));
      let yb = ey + ry * curve * 0.95;
      yb = Math.min(yb, botBase - (lower > 0 ? curve * lower * 1.5 : 0));
      cols.push({ x: ex + i, yt: Math.round(yt), yb: Math.round(yb) });
    }
    // closed by lids?
    let anyOpen = false;
    for (const c of cols) if (c.yb - c.yt >= 1) { anyOpen = true; break; }
    if (!anyOpen) {
      for (const c of cols) P.px(c.x, Math.round((c.yt + c.yb) / 2), ink);
      return;
    }
    // sclera
    for (const c of cols) if (c.yb > c.yt) P.rect(c.x, c.yt, 1, c.yb - c.yt, s.sclera);
    // iris + pupil, clipped to the eye opening
    const ir = shape === 'tiny' ? 1.2 : Math.max(2, rx * 0.78);
    const icx = ex + gx * Math.max(1, rx * 0.35) + (shape === 'tiny' ? 0 : 0);
    const icy = ey + 0.5 + gy * Math.max(1, ry * 0.22);
    const pr = shape === 'tiny' ? 1 : Math.max(1, ir * 0.48 * e.pupil);
    for (const c of cols) {
      for (let y = c.yt; y < c.yb; y++) {
        const dx = c.x + 0.5 - icx, dy = y + 0.5 - icy;
        const d = Math.hypot(dx / ir, dy / (ir * 1.12));
        if (d <= 1) {
          let col = dy < -ir * 0.25 ? darken(s.iris, 0.25) : dy > ir * 0.35 ? s.irisLight : s.iris;
          if (shape === 'teary' && dy > ir * 0.2) col = '#7ac8f8';
          const dp = Math.hypot(dx / pr, dy / (pr * 1.15));
          if (dp <= 1 && shape !== 'sparkle') col = s.pupil;
          P.px(c.x, y, col);
        }
      }
    }
    // shadow under the upper lid
    for (const c of cols) if (c.yb - c.yt > 2) P.px(c.x, c.yt, mix(s.sclera, s.iris, 0.35));
    // highlights
    const hx = Math.round(icx - ir * 0.45), hy = Math.round(icy - ir * 0.55);
    const inEye = (x, y) => cols.some((c) => c.x === x && y >= c.yt && y < c.yb);
    const hl = (x, y, col = '#ffffff') => { if (inEye(x, y)) P.px(x, y, col); };
    if (shape === 'sparkle') {
      const sx = Math.round(icx), sy = Math.round(icy);
      for (const [dx, dy] of [[0, -2], [0, -1], [0, 1], [0, 2], [-2, 0], [-1, 0], [1, 0], [2, 0], [0, 0]]) hl(sx + dx, sy + dy, dx === 0 && dy === 0 ? '#ffffff' : '#fff4b0');
    } else if (shape !== 'tiny') {
      hl(hx, hy); hl(hx + 1, hy); hl(hx, hy + 1); if (rx > 4) hl(hx + 1, hy + 1);
      hl(Math.round(icx + ir * 0.45), Math.round(icy + ir * 0.4), '#ffffffc0');
      if (shape === 'teary') { hl(Math.round(icx + 1), Math.round(icy + ir * 0.5)); hl(Math.round(icx - 1), Math.round(icy + ir * 0.6), '#d8f0ff'); }
    }
    // upper lid line (lashes), thicker for girls with a flick at the outer corner
    for (let k = 0; k < cols.length; k++) {
      const c = cols[k];
      if (c.yb - c.yt < 1) { P.px(c.x, c.yt, ink); continue; }
      P.px(c.x, c.yt - 1, ink);
      if (s.girl || Math.abs(k - cols.length / 2) < cols.length * 0.35) P.px(c.x, c.yt, ink);
    }
    const outer = cols[fl ? 0 : cols.length - 1];
    if (s.girl) { P.px(outer.x + (fl ? -1 : 1), outer.yt - 2, ink); P.px(outer.x + (fl ? -2 : 2), outer.yt - 3, ink); }
    else P.px(outer.x + (fl ? -1 : 1), outer.yt - 1, ink);
    // lower lid hint
    const lowCol = mix(s.skin, ink, 0.55);
    for (let k = 2; k < cols.length - 2; k++) if (cols[k].yb - cols[k].yt > 1) P.px(cols[k].x, cols[k].yb, lowCol);
  }

  drawBrow(side, ex, by) {
    const s = this.s, P = this.pc, b = this.cur.brow;
    const fl = side < 0;
    const asym = b.asym && side > 0 ? 1 : 0;
    const y = by - b.y * 2.4 - asym * 1.5;
    const W = s.browW;
    for (let i = 0; i < W; i++) {
      const u = i / (W - 1); // 0 inner .. 1 outer
      // inner end raised when worried (tilt<0), lowered when angry (tilt>0)
      const tiltY = (b.tilt + (asym ? -0.6 : 0)) * (1 - u) * 3;
      const curveY = -Math.sin(u * Math.PI) * b.curve * 2;
      const yy = Math.round(y + tiltY + curveY);
      const xx = Math.round(fl ? ex + W / 2 - 0.5 - i : ex - W / 2 + 0.5 + i);
      P.rect(xx, yy, 1, s.browThick, s.brow);
    }
  }

  drawMouth(shape, frame) {
    const s = this.s;
    // snouts / beaks get their own small canvas on the front of the muzzle
    const P = this.mpc || this.pc;
    const cx = this.mpc ? Math.round(this.mpc.w / 2) : Math.round(s.w / 2);
    const my = this.mpc ? s.mouthCanvas.my : s.mouthY;
    const ink = s.mouthCol, inn = s.mouthIn, W = s.mouthW;
    const hw = Math.floor(W / 2);
    const beak = s.beak;
    const curve = (k, x0, x1, ycen, col = ink, th = 1) => { // k>0 smile
      for (let x = x0; x <= x1; x++) {
        const u = (x - (x0 + x1) / 2) / Math.max(1, (x1 - x0) / 2);
        P.rect(x, Math.round(ycen - k * (1 - u * u) + k * 0.5), 1, th, col);
      }
    };
    const openShape = (w, h, yTop, { teeth = false, tongue = true, round = 1 } = {}) => {
      const x0 = cx - Math.floor(w / 2);
      P.rrect(x0, yTop, w, h, Math.min(round, Math.floor(Math.min(w, h) / 2)), ink);
      if (w > 2 && h > 2) P.rrect(x0 + 1, yTop + 1, w - 2, h - 2, Math.max(0, round - 1), inn);
      if (tongue && h > 3 && w > 3) P.ellipse(cx + 0.5, yTop + h - 1.5, Math.max(1, w / 2 - 1.5), 1.2, s.tongue);
      if (teeth && w > 3) P.rect(x0 + 1, yTop + 1, w - 2, 1, s.teeth);
    };
    switch (shape) {
      case 'line': curve(beak ? 0.6 : 0.3, cx - hw + 1, cx + hw - 1, my); if (beak) { P.px(cx - hw, my - 1, ink); P.px(cx + hw, my - 1, ink); } break;
      case 'flat': P.rect(cx - hw + 1, my, W - 2, 1, ink); break;
      case 'smallSmile': curve(1.2, cx - hw + 1, cx + hw - 1, my); break;
      case 'smile': curve(2, cx - hw, cx + hw, my); P.px(cx - hw - 1, my - 1, ink); P.px(cx + hw + 1, my - 1, ink); break;
      case 'openSmile': {
        const x0 = cx - hw, x1 = cx + hw;
        for (let x = x0; x <= x1; x++) {
          const u = (x - cx) / hw;
          const d = Math.round(3 * (1 - u * u)) + 1;
          P.rect(x, my - 1, 1, d, x === x0 || x === x1 ? ink : inn);
          P.px(x, my - 1, ink);
          P.px(x, my - 1 + d, ink);
        }
        P.rect(cx - 1, my + 1, 3, 2, s.tongue);
        break;
      }
      case 'bigSmile': case 'laugh': {
        const ww = hw + 1, hh = shape === 'laugh' ? 6 : 5;
        for (let x = -ww; x <= ww; x++) {
          const u = x / ww, d = Math.max(1, Math.round(hh * Math.sqrt(1 - u * u)));
          P.rect(cx + x, my - 1, 1, d + 1, ink);
          if (Math.abs(x) < ww) P.rect(cx + x, my, 1, d - 1, inn);
        }
        P.rect(cx - ww + 1, my - 1, ww * 2 - 1, 1, s.teeth);
        P.ellipse(cx + 0.5, my + hh - 2, ww * 0.55, 1.6, s.tongue);
        if (shape === 'laugh' && frame % 2) P.rect(cx - ww, my - 2, ww * 2 + 1, 1, ink);
        break;
      }
      case 'grin': {
        P.rrect(cx - hw - 1, my - 1, W + 2, 4, 1, ink);
        P.rect(cx - hw, my, W, 2, s.teeth);
        for (let x = cx - hw + 2; x < cx + hw; x += 3) P.px(x, my + 1, '#d0c8d8');
        break;
      }
      case 'grinClosed': curve(1.6, cx - hw, cx + hw, my); P.px(cx + hw + 1, my - 2, ink); break;
      case 'smirk': {
        for (let x = cx - hw + 1; x <= cx + hw; x++) { const u = (x - (cx - hw)) / W; P.px(x, Math.round(my + 0.5 - u * u * 2.5), ink); }
        break;
      }
      case 'frown': curve(-1.6, cx - hw + 1, cx + hw - 1, my + 1); break;
      case 'frownSmall': curve(-1, cx - hw + 2, cx + hw - 2, my + 1); break;
      case 'wobble': case 'wavy': {
        for (let x = cx - hw; x <= cx + hw; x++) P.px(x, my + ((x + (shape === 'wobble' ? frame : 0)) % 2 === 0 ? 0 : 1), ink);
        break;
      }
      case 'wavyOpen': {
        P.rrect(cx - hw + 1, my - 1, W - 2, 4, 1, inn);
        for (let x = cx - hw + 1; x <= cx + hw - 1; x++) { P.px(x, my - 1 + (x % 2), ink); P.px(x, my + 2 + (x % 2), ink); }
        break;
      }
      case 'o': openShape(4, 4, my - 1, { tongue: false, round: 2 }); break;
      case 'smallO': openShape(3, 3, my - 1, { tongue: false, round: 1 }); break;
      case 'bigO': openShape(6, 7, my - 2, { tongue: true, round: 3 }); break;
      case 'shout': openShape(W + 2, 7, my - 2, { teeth: true, tongue: true, round: 2 }); break;
      case 'wail': {
        openShape(W, 6, my - 1, { tongue: true, round: 2 });
        P.rect(cx - 1, my - 1, 3, 1, ink);
        break;
      }
      case 'grit': {
        P.rect(cx - hw - 1, my - 1, W + 2, 4, ink);
        P.rect(cx - hw, my, W, 2, s.teeth);
        P.rect(cx - hw, my + 1, W, 1, '#d8d0e0');
        for (let x = cx - hw + 1; x < cx + hw; x += 2) P.rect(x, my, 1, 2, '#b8a8c0');
        break;
      }
      case 'grimace': {
        P.rect(cx - hw, my - 1, W, 3, ink);
        P.rect(cx - hw + 1, my, W - 2, 1, s.teeth);
        P.px(cx - hw - 1, my + 1, ink); P.px(cx + hw, my - 2, ink);
        break;
      }
      case 'pout': {
        P.rect(cx - 1, my, 3, 1, ink); P.px(cx - 2, my + 1, ink); P.px(cx + 2, my + 1, ink);
        P.px(cx, my - 1, ink);
        break;
      }
      case 'chew': {
        const k = frame % 4;
        if (k < 2) curve(1.6, cx - hw + 1, cx + hw - 1, my);
        else { P.rrect(cx - 2, my - 1, 5, 3, 1, ink); P.rect(cx - 1, my, 3, 1, inn); }
        P.px(cx + hw + 1, my - 3 + (k % 2), '#ffffff');
        break;
      }
      case 'cat': { // ω
        P.px(cx - 3, my - 1, ink); P.px(cx - 2, my, ink); P.px(cx - 1, my, ink); P.px(cx, my - 1, ink); P.px(cx + 1, my, ink); P.px(cx + 2, my, ink); P.px(cx + 3, my - 1, ink);
        break;
      }
      // talking visemes
      case 'A': openShape(Math.max(4, W - 2), 4, my - 1, { tongue: true, round: 1 }); break;
      case 'E': openShape(Math.max(4, W - 1), 3, my - 1, { tongue: false, teeth: true, round: 1 }); break;
      case 'I': openShape(Math.max(4, W - 2), 2, my - 1, { tongue: false, teeth: true, round: 0 }); break;
      case 'O': openShape(4, 4, my - 1, { tongue: false, round: 2 }); break;
      case 'U': openShape(3, 2, my - 1, { tongue: false, round: 1 }); break;
      case 'M': curve(0.4, cx - hw + 1, cx + hw - 1, my); break;
      default: curve(0.3, cx - hw + 1, cx + hw - 1, my);
    }
  }

  drawTears(k, frame) {
    const s = this.s, P = this.pc, cx = s.w / 2;
    for (const side of [-1, 1]) {
      const x = Math.round(cx + side * (s.eyeDX + 1));
      const len = Math.round(4 + k * 8);
      for (let y = 0; y < len; y++) {
        const yy = s.eyeY + Math.floor(s.eyeH / 2) - 1 + y;
        const on = ((y + frame) % 3) !== 0;
        P.px(x, yy, on ? '#7ac8f8' : '#bfe6ff');
        if (k > 0.6) P.px(x + side, yy, '#5aa8e8');
      }
    }
  }
  drawSweat(frame) {
    const s = this.s, P = this.pc;
    const x = s.w - 6, y = 5 + (frame % 6 < 3 ? 0 : 1);
    P.stamp(['..d..', '.dbd.', 'dbbwd', 'dbbbd', '.ddd.'], { d: '#3a8ad8', b: '#8fd0ff', w: '#ffffff' }, x - 2, y);
  }
  drawVein(frame) {
    const s = this.s, P = this.pc;
    const big = frame % 4 < 2;
    const x = 6, y = 3;
    const rows = big ? ['.v...v.', 'vVv.vVv', '.vV.Vv.', '.......', '.vV.Vv.', 'vVv.vVv', '.v...v.'] : ['.v..v.', 'vVvvVv', '......', 'vVvvVv', '.v..v.'];
    P.stamp(rows, { v: '#e83a4a', V: '#9a1428' }, x, y);
  }
  drawSparkle(frame) {
    const s = this.s, P = this.pc;
    const pts = [[4, 6], [s.w - 5, 8], [s.w - 9, 2]];
    pts.forEach(([x, y], i) => {
      if ((frame + i * 2) % 6 < 3) { P.px(x, y - 1, '#fff6b0'); P.px(x, y + 1, '#fff6b0'); P.px(x - 1, y, '#fff6b0'); P.px(x + 1, y, '#fff6b0'); P.px(x, y, '#ffffff'); }
      else P.px(x, y, '#fff6b0');
    });
  }
}

// flat face plane for voxel heads (4 texels per 0.05 voxel, like TBME)
export function makeFacePlane(tex, wTex, hTex, texPerUnit = 80) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.14 });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wTex / texPerUnit, hTex / texPerUnit), mat);
  m.castShadow = false; m.receiveShadow = true; m.name = 'face';
  return m;
}

// curved decal mesh that sits on the front of an ellipsoid head.
// r: head radius, scale: head ellipsoid scale [sx, sy, sz]; spans azimuth +-azi
// and elevation [elevLo, elevHi] (radians)
export function makeFaceDecal(face, { r = 0.25, scale = [1, 1, 1], azi = 1.1, elevLo = -0.45, elevHi = 1.15, lift = 1.012, seg = [16, 12] } = {}) {
  // SphereGeometry: phi around Y (azimuth) starting at -x, theta from +y (top)
  const phiLength = azi * 2, thetaStart = Math.PI / 2 - elevHi, thetaLength = elevHi - elevLo;
  // azimuth 0 = +z (front); SphereGeometry x = -cos(phi) sin(theta), z = sin(phi) sin(theta)
  // front (+z) is at phi = PI/2
  const g = new THREE.SphereGeometry(r * lift, seg[0], seg[1], Math.PI / 2 - azi, phiLength, thetaStart, thetaLength);
  g.scale(scale[0], scale[1], scale[2]);
  // SphereGeometry's u runs with phi; flip so the canvas isn't mirrored
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  const mat = new THREE.MeshLambertMaterial({ map: face.texture, transparent: false, alphaTest: 0.5, depthWrite: true });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  const m = new THREE.Mesh(g, mat);
  m.castShadow = false;
  m.receiveShadow = true;
  m.name = 'face';
  return m;
}
