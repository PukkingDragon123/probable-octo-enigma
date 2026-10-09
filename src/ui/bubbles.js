// In-world speech bubbles. Pixel-art 9-slice frames (painted once into a
// canvas, scaled by the renderer's pixel scale so they match the game's
// pixels), anchored above a character's head every frame, with a tail that
// points at the speaker, a typewriter that drives the character's mouth and
// babble voice, choices, thought clouds and a "tap to continue" nib.
import * as THREE from 'three';
import './bubbles.css';
import { PixCanvas } from '../core/pixtex.js';
import { visemeFor } from '../entities/face.js';
import { esc, clamp } from '../core/util.js';

const INK = '#2a1828';
// 9-slice source art (corner size C texels)
function frameArt(kind) {
  const S = 16, C = 6;
  const p = new PixCanvas(S, S);
  if (kind === 'thought') {
    p.rrect(0, 0, S, S, 6, INK);
    p.rrect(1, 1, S - 2, S - 2, 5, '#f8f4ff');
    p.rrect(2, 2, S - 4, S - 4, 4, '#ffffff');
  } else if (kind === 'shout') {
    p.rect(0, 0, S, S, INK);
    p.rect(1, 1, S - 2, S - 2, '#fff6c8');
    p.rect(2, 2, S - 4, S - 4, '#fffbe0');
  } else if (kind === 'spirit') {
    p.rrect(0, 0, S, S, 5, '#2a3a5a');
    p.rrect(1, 1, S - 2, S - 2, 4, '#e8fff4');
    p.rrect(2, S - 4, S - 4, 2, 1, '#c8f0e0');
  } else {
    p.rrect(0, 0, S, S, 4, INK);
    p.rrect(1, 1, S - 2, S - 2, 3, '#fffaf0');
    p.rect(2, S - 3, S - 4, 1, '#efe4d0'); // soft bottom shade
  }
  return { url: p.c.toDataURL(), S, C };
}
function tailArt(kind) {
  const p = new PixCanvas(9, 7);
  if (kind === 'thought') {
    p.circle(5, 1.5, 1.6, INK); p.circle(5, 1.5, 0.8, '#ffffff');
    p.circle(3, 5, 1.2, INK); p.px(3, 5, '#ffffff');
  } else {
    const fill = kind === 'shout' ? '#fffbe0' : kind === 'spirit' ? '#e8fff4' : '#fffaf0';
    const edge = kind === 'spirit' ? '#2a3a5a' : INK;
    p.poly([[0, 0], [9, 0], [3, 7]], edge);
    p.poly([[1.6, 0], [7.4, 0], [3.4, 5.2]], fill);
  }
  return p.c.toDataURL();
}
const ARTS = {};
function art(kind) {
  if (!ARTS[kind]) ARTS[kind] = { frame: frameArt(kind), tail: tailArt(kind) };
  return ARTS[kind];
}
function nibArt() {
  const p = new PixCanvas(7, 5);
  p.poly([[0, 0], [7, 0], [3.5, 4.5]], INK);
  return p.c.toDataURL();
}

export class Bubbles {
  constructor(game, root) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.className = 'bubbles';
    root.appendChild(this.root);
    this.list = [];
    this.nib = nibArt();
  }
  get scale() { const R = this.game.renderer; return Math.max(1, R.pixelScale / (R.dpr || 1)); }

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
    const A = art(kind);
    const el = document.createElement('div');
    el.className = 'bubble b-' + kind;
    const sc = this.scale;
    const C = A.frame.C;
    el.style.borderImage = `url(${A.frame.url}) ${C} fill / ${C * sc}px stretch`;
    el.style.borderWidth = `${C * sc}px`;
    el.style.setProperty('--px', sc + 'px');
    el.style.fontSize = `${11 * sc}px`;
    el.innerHTML = `${o.name ? `<div class="b-name">${esc(o.name)}</div>` : ''}<div class="b-text"></div><img class="b-tail" src="${A.tail}" style="width:${9 * sc}px;height:${7 * sc}px"><img class="b-nib" src="${this.nib}" style="width:${7 * sc}px;height:${5 * sc}px">`;
    this.root.appendChild(el);
    const textEl = el.querySelector('.b-text');
    const b = {
      el, textEl, speaker, text, o, kind, shown: 0, t: 0, done: false, closing: false,
      cps: o.cps ?? 38, life: 0, choices: o.choices || null, sel: -1, voice: null,
      anchor: o.anchor || null,
    };
    // hidden spans so the box has its final size from the start (no reflow jumps)
    textEl.innerHTML = this.markup(text, 0);
    el.classList.add('pop');
    this.list.push(b);
    const audio = this.game.audio;
    audio?.play?.('bubble', { volume: 0.25 });
    if (speaker?.def?.voice && audio?.voice && !o.silent) {
      try { b.voice = audio.voice(speaker.def.voice, text, {}); } catch { b.voice = null; }
    }
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.advance(b); });
    if (b.choices) {
      const box = document.createElement('div');
      box.className = 'b-choices';
      b.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'b-choice';
        btn.style.borderImage = `url(${art('say').frame.url}) ${C} fill / ${C * sc}px stretch`;
        btn.style.borderWidth = `${C * sc}px`;
        btn.style.fontSize = `${11 * sc}px`;
        btn.textContent = c;
        btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!b.done) { this.finishTyping(b); return; } this.pick(b, i); });
        box.appendChild(btn);
      });
      el.appendChild(box);
      b.choiceBox = box;
    }
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
    b.done = true;
    b.el.classList.add('done');
    if (b.voice) { try { b.voice.stop(); } catch { /* */ } }
    b.speaker?.face?.talk(null);
  }
  advance(b) {
    if (b.closing) return;
    if (!b.done) { this.finishTyping(b); return; }
    if (b.choices) return;
    this.close(b);
    b.resolve && b.resolve();
  }
  pick(b, i) {
    this.game.audio?.play?.('select', { volume: 0.4 });
    this.close(b);
    b.resolveChoice && b.resolveChoice(i);
  }
  close(b) {
    if (b.closing) return;
    b.closing = true;
    b.el.classList.add('out');
    if (b.voice) { try { b.voice.stop(); } catch { /* */ } }
    b.speaker?.face?.talk(null);
    setTimeout(() => { b.el.remove(); }, 160);
    const i = this.list.indexOf(b);
    if (i >= 0) this.list.splice(i, 1);
  }
  // tap anywhere advances the newest bubble
  tapAdvance() {
    const b = this.list[this.list.length - 1];
    if (!b) return false;
    if (b.choices && b.done) return true; // must pick
    this.advance(b);
    return true;
  }
  get active() { return this.list.length > 0; }
  clear() { for (const b of [...this.list]) { this.close(b); b.resolve && b.resolve(); b.resolveChoice && b.resolveChoice(0); } }

  update(dt) {
    const g = this.game;
    const fast = g.director?.skipping;
    for (const b of this.list) {
      b.life += dt;
      if (!b.done) {
        b.t += dt * (fast ? 8 : 1);
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
        if (n >= this.plainLen(b.text)) { b.done = true; b.el.classList.add('done'); b.speaker?.face?.talk(null); }
      } else if (b.o.auto != null && !b.closing && b.life > b.o.auto + this.plainLen(b.text) / b.cps) {
        this.advance(b);
      } else if (fast && !b.choices && !b.closing && b.life > 0.25) this.advance(b);
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
    let sx = vw / 2, sy = vh * 0.2, tailX = W / 2;
    if (wp) {
      const s = g.rig.worldToScreen(wp, g.renderer, this._sp || (this._sp = { x: 0, y: 0 }));
      const sc = this.scale;
      sx = s.x; sy = s.y - 6 * sc;
      // keep on screen
      const left = clamp(sx - W / 2, 8, vw - W - 8);
      const top = clamp(sy - H - 6 * sc, 8, vh - H - 8);
      tailX = clamp(sx - left, 10 * sc, W - 10 * sc);
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      // stack multiple bubbles: newer ones push older ones up a bit
      const tail = el.querySelector('.b-tail');
      tail.style.left = `${Math.round(tailX - 4.5 * sc)}px`;
      tail.style.display = sy - H - 6 * sc < 8 ? 'none' : '';
    } else {
      el.style.transform = `translate(${Math.round(sx - W / 2)}px, ${Math.round(sy)}px)`;
      el.querySelector('.b-tail').style.display = 'none';
    }
  }
}

// caption at the bottom of the screen (narration, phone texts, place names)
export class Captions {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'captions';
    root.appendChild(this.el);
  }
  show(text, { dur = 3, kind = 'narration' } = {}) {
    const c = document.createElement('div');
    c.className = 'caption c-' + kind;
    c.innerHTML = esc(text).replace(/\*(.+?)\*/g, '<b>$1</b>');
    this.el.appendChild(c);
    requestAnimationFrame(() => c.classList.add('in'));
    return new Promise((res) => setTimeout(() => { c.classList.remove('in'); c.classList.add('out'); setTimeout(() => { c.remove(); res(); }, 400); }, dur * 1000));
  }
}
