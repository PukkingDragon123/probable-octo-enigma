// In-world speech bubbles, Persona-style: a bold ink box (cream text, a cream
// rim, a hard drop shadow, a slight random tilt) anchored above the
// speaker's head every frame, a slanted vermilion name tag, a wedge tail that
// points at the speaker, a bouncing advance arrow, and choices as a slanted
// list whose selected line is punched forward on a vermilion slab. Kinds:
// say, shout (a jagged vermilion burst), thought (an indigo cloud), spirit
// (a teal glow). The typewriter drives the character's mouth and babble
// voice; Space / Enter / tap advance, arrows + Enter pick choices.
// Sizes come from --px (the renderer's pixel scale) so the Galmuri pixel font
// lands on whole device pixels.
import * as THREE from 'three';
import './bubbles.css';
import { esc, clamp } from '../core/util.js';

export class Bubbles {
  constructor(game, root) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.className = 'bubbles';
    root.appendChild(this.root);
    this.list = [];
  }
  // css px per font pixel: the game's pixel scale, but never so small that a
  // phone's text drops under ~15 css px (kept on whole device pixels)
  get scale() {
    const R = this.game.renderer, dpr = R.dpr || 1;
    let s = Math.max(1, (R.basePixelScale ?? R.pixelScale) / dpr);
    if (11 * s < 15) s = Math.ceil((15 * dpr) / 11) / dpr;
    return s;
  }

  // show a line: resolves when the player taps to continue (or after `auto` s)
  say(speaker, text, o = {}) {
    return new Promise((resolve) => {
      const b = this.create(speaker, text, o);
      b.resolve = resolve;
    });
  }
  // choices: resolves with the chosen index
  choose(speaker, prompt, options, o = {}) {
    return new Promise((resolve) => {
      const b = this.create(speaker, prompt, { ...o, choices: options });
      b.resolveChoice = resolve;
    });
  }

  create(speaker, text, o) {
    const kind = o.kind || (speaker?.def?.spirit ? 'spirit' : 'say');
    const el = document.createElement('div');
    el.className = 'bubble b-' + kind + (o.ambient ? ' ambient' : '');
    const sc = this.scale * (o.ambient ? 0.85 : 1);
    el.style.setProperty('--px', sc + 'px');
    el.style.setProperty('--tilt', ((Math.random() - 0.5) * 2.4).toFixed(2) + 'deg');
    el.style.fontSize = `${11 * sc}px`;
    // speaker tag: an explicit name, else anyone already introduced (not for thoughts / chatter)
    const name = o.name ?? (kind !== 'thought' && !o.ambient && speaker?.introduced && speaker?.name ? speaker.name : null);
    el.innerHTML = `<i class="b-bg"></i><i class="b-bg2"></i><i class="b-tail"></i><i class="b-tail b-tail-in"></i>${name ? `<div class="b-name"><span>${esc(name)}</span></div>` : ''}<div class="b-text"></div><i class="b-nib"></i>`;
    this.root.appendChild(el);
    const textEl = el.querySelector('.b-text');
    const b = {
      el, textEl, speaker, text, o, kind, shown: 0, t: 0, done: false, closing: false,
      cps: o.cps ?? 38, life: 0, choices: o.choices || null, sel: -1, voice: null,
      anchor: o.anchor || null, tails: [...el.querySelectorAll('.b-tail')],
    };
    // hidden spans so the box has its final size from the start (no reflow jumps)
    textEl.innerHTML = this.markup(text, 0);
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 800); // frees the layers for the press kick
    this.list.push(b);
    const audio = this.game.audio;
    if (!o.ambient) audio?.play?.(kind === 'shout' ? 'uiSlam' : 'bubble', { volume: kind === 'shout' ? 0.22 : 0.25 });
    if (speaker?.def?.voice && audio?.voice && !o.silent) {
      try { b.voice = audio.voice(speaker.def.voice, text, {}); } catch { b.voice = null; }
    }
    if (!o.ambient) el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.advance(b); });
    if (b.choices) {
      const box = document.createElement('div');
      box.className = 'b-choices';
      b.choiceEls = b.choices.map((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'b-choice';
        btn.style.setProperty('--n', i);
        btn.innerHTML = `<i class="bc-slab"></i><b class="bc-n">${i + 1}</b><span class="bc-t">${esc(c)}</span>`;
        btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && b.done) this.selChoice(b, i); });
        btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!b.done) { this.finishTyping(b); return; } this.selChoice(b, i, true); this.pick(b, i); });
        box.appendChild(btn);
        return btn;
      });
      el.appendChild(box);
      b.choiceBox = box;
    }
    if (this.game.settings?.textMul === 0) this.finishTyping(b);
    return b;
  }

  markup(text, n) {
    // visible prefix + invisible remainder (keeps layout stable). *word* = emphasis
    let out = '', i = 0, em = false;
    for (const ch of text) {
      if (ch === '*') { em = !em; out += em ? '<b>' : '</b>'; continue; }
      const vis = i < n;
      out += vis ? esc(ch) : `<span class="ghost">${esc(ch)}</span>`;
      i++;
    }
    if (em) out += '</b>';
    return out;
  }
  plainLen(text) { return [...text.replace(/\*/g, '')].length; }

  finishTyping(b) {
    b.shown = this.plainLen(b.text);
    b.textEl.innerHTML = this.markup(b.text, b.shown);
    this.done(b);
    if (b.voice) { try { b.voice.stop(); } catch { /* */ } }
  }
  done(b) {
    if (b.done) return;
    b.done = true;
    b.el.classList.add('done');
    b.speaker?.face?.talk(null);
    if (b.choices && b.sel < 0) this.selChoice(b, 0, true);
  }
  selChoice(b, i, silent = false) {
    if (!b.choiceEls) return;
    i = (i + b.choiceEls.length) % b.choiceEls.length;
    if (i === b.sel) return;
    b.choiceEls[b.sel]?.classList.remove('sel');
    b.sel = i;
    const c = b.choiceEls[i];
    c.classList.add('sel');
    c.classList.remove('snap'); void c.offsetWidth; c.classList.add('snap');
    if (!silent) this.game.audio?.play?.('uiMove', { volume: 0.3 });
  }
  advance(b) {
    if (b.closing) return;
    if (!b.done) {
      this.finishTyping(b);
      b.el.classList.remove('press'); void b.el.offsetWidth; b.el.classList.add('press');
      return;
    }
    if (b.choices) return;
    this.close(b);
    b.resolve && b.resolve();
  }
  pick(b, i) {
    if (b.closing) return;
    this.game.audio?.play?.('uiConfirm', { volume: 0.35 });
    b.choiceEls?.[i]?.classList.add('picked');
    b.el.classList.add('chose');
    b.closing = true;
    setTimeout(() => { b.closing = false; this.close(b); }, 240);
    b.resolveChoice && b.resolveChoice(i);
  }
  close(b) {
    if (b.closing) return;
    b.closing = true;
    b.el.classList.add('out');
    if (b.voice) { try { b.voice.stop(); } catch { /* */ } }
    b.speaker?.face?.talk(null);
    setTimeout(() => { b.el.remove(); }, 170);
    const i = this.list.indexOf(b);
    if (i >= 0) this.list.splice(i, 1);
  }
  // tap anywhere advances the newest bubble
  tapAdvance() {
    const b = this.list.filter((q) => !q.o.ambient).pop();
    if (!b) return false;
    if (b.choices && b.done) return true; // must pick
    this.advance(b);
    return true;
  }
  // keyboard for choices: arrows / W S move, Space / Enter / Z pick, 1-9 pick
  onKey(key) {
    const b = this.list.filter((q) => !q.o.ambient && q.choices && !q.closing).pop();
    if (!b) return false;
    if (!b.done) { if (key === ' ' || key === 'Enter' || key === 'z') { this.finishTyping(b); return true; } return false; }
    if (key === 'ArrowUp' || key === 'w') { this.selChoice(b, b.sel - 1); return true; }
    if (key === 'ArrowDown' || key === 's') { this.selChoice(b, b.sel + 1); return true; }
    if (key === ' ' || key === 'Enter' || key === 'z') { this.pick(b, Math.max(0, b.sel)); return true; }
    const d = +key;
    if (d >= 1 && d <= b.choices.length) { this.selChoice(b, d - 1, true); this.pick(b, d - 1); return true; }
    return false;
  }
  // ambient chatter (shopkeepers calling out) never blocks taps or cutscenes
  get active() { return this.list.some((b) => !b.o.ambient); }
  clear() { for (const b of [...this.list]) { this.close(b); b.resolve && b.resolve(); b.resolveChoice && b.resolveChoice(0); } }

  update(dt) {
    const g = this.game;
    const fast = g.director?.skipping;
    const mul = g.settings?.textMul || 1;
    for (const b of this.list) {
      b.life += dt;
      if (!b.done) {
        b.t += dt * (fast ? 8 : 1) * mul;
        const n = Math.min(this.plainLen(b.text), Math.floor(b.t * b.cps));
        if (n !== b.shown) {
          const plain = [...b.text.replace(/\*/g, '')];
          for (let k = b.shown; k < n; k++) {
            const ch = plain[k];
            // mouth shapes follow the letters
            if (b.speaker?.talk) b.speaker.talk(ch);
            if (!b.voice && /[a-z0-9]/i.test(ch) && k % 2 === 0 && !b.o.silent) g.audio?.play?.('textBlip', { volume: 0.12, pitch: b.speaker?.def?.voice?.pitch ?? 1 });
            // little pauses on punctuation
            if (/[.,!?…]/.test(ch)) b.t -= 0.07;
          }
          b.shown = n;
          b.textEl.innerHTML = this.markup(b.text, n);
        }
        if (n >= this.plainLen(b.text)) this.done(b);
      } else if (b.o.auto != null && !b.closing && b.life > b.o.auto + this.plainLen(b.text) / b.cps) {
        this.advance(b);
      } else if (fast && !b.choices && !b.closing && b.life > 0.25) this.advance(b);
      if (b.o.ambient && !b.closing && b.life > 6) this.advance(b);
      // dev auto-play: lines advance by themselves after a reading pause (choices take the first)
      if (g.autoPlay && b.done && !b.closing && b.life > 1.2 + this.plainLen(b.text) / 30) { if (b.choices) this.pick(b, 0); else this.advance(b); }
      this.place(b);
    }
  }

  place(b) {
    const g = this.game;
    let wp = null;
    if (b.anchor) wp = typeof b.anchor === 'function' ? b.anchor() : b.anchor;
    else if (b.speaker?.headPos) wp = b.speaker.headPos(this._tmp || (this._tmp = new THREE.Vector3()));
    const el = b.el;
    const W = el.offsetWidth, H = el.offsetHeight;
    const vw = g.canvas.clientWidth, vh = g.canvas.clientHeight;
    const sc = this.scale;
    const tw = 10 * sc; // tail width
    if (wp) {
      const s = g.rig.worldToScreen(wp, g.renderer, this._sp || (this._sp = { x: 0, y: 0 }));
      const sx = s.x, sy = s.y - 6 * sc;
      // ambient chatter from someone off screen just isn't shown
      if (b.o.ambient) { const off = sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 60; el.style.visibility = off ? 'hidden' : ''; }
      // keep on screen (room for the rim, the name tag and the shadow)
      const m = 6 * sc;
      const left = clamp(sx - W / 2, m, vw - W - m - 2 * sc);
      const top = clamp(sy - H - 9 * sc, m + 8 * sc, vh - H - m);
      const tailX = clamp(sx - left, 8 * sc, W - 12 * sc);
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      const hide = sy - H - 9 * sc < m + 8 * sc;
      for (const t of b.tails) { t.style.left = `${Math.round(tailX - tw / 2)}px`; t.style.display = hide ? 'none' : ''; }
      // lean the tail toward the speaker when the box had to slide sideways
      el.style.setProperty('--lean', clamp((sx - (left + tailX)) / (10 * sc), -1, 1).toFixed(2));
    } else {
      el.style.transform = `translate(${Math.round(vw / 2 - W / 2)}px, ${Math.round(vh * 0.2)}px)`;
      for (const t of b.tails) t.style.display = 'none';
    }
  }
}

// captions live in cards.js (kept importable from here)
export { Captions } from './cards.js';
