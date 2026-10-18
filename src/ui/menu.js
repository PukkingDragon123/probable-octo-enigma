// Menu kit shared by every menu (title, pause, settings, chapters, confirm):
//   - one keyboard focus stack: the top layer gets the keys (and the game
//     doesn't), with no layer open the "idle" handlers get them (Esc = pause)
//   - MenuList: hover, tap, arrow keys and Enter / Esc unified, each move and
//     confirm answered with a sound and a snap of the selection slab
//   - Slider / Cycler rows for settings
//   - shutter(): the diagonal slash wipe used between title, game and menus
import './kit.css';
import { typeEl, INK, CREAM, RED, GOLD } from './pixtype.js';
import { PixCanvas } from '../core/pixtex.js';

let audio = null;
export function setMenuAudio(a) { audio = a; }
export function sfx(name, o = {}) { audio?.play?.(name, { volume: 0.5, ...o }); }

// ---------------------------------------------------------------- keys
const KEYS = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  enter: 'ok', ' ': 'ok', z: 'ok', escape: 'back', backspace: 'back', x: 'back', tab: 'down',
};
export const keyName = (e) => KEYS[e.key.toLowerCase()] || null;
const layers = [];
const idle = [];
addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts stay the browser's
  const top = layers[layers.length - 1];
  const k = keyName(e);
  if (!top) { for (const fn of idle) if (fn(k, e)) { e.preventDefault(); e.stopImmediatePropagation(); return; } return; }
  if (e.repeat && k === 'ok') { e.preventDefault(); e.stopImmediatePropagation(); return; }
  top.key?.(k, e);
  // the game underneath never sees keys while a menu is up
  if (k) e.preventDefault();
  e.stopImmediatePropagation();
}, true);
// a focused <button> would also "click" on Space / Enter: menus handle those keys themselves
addEventListener('keyup', (e) => { if (layers.length && (e.key === ' ' || e.key === 'Enter')) e.preventDefault(); }, true);
export function pushLayer(l) { layers.push(l); return l; }
export function popLayer(l) { const i = layers.indexOf(l); if (i >= 0) layers.splice(i, 1); }
export const menuOpen = () => layers.length > 0;
export function onIdleKey(fn) { idle.push(fn); }
export const isTouch = () => matchMedia?.('(hover: none)').matches;

// ---------------------------------------------------------------- patterns
// a small gacha capsule (menu cursor, floating capsules)
export function paintCapsule(top = RED) {
  const p = new PixCanvas(11, 11, 1);
  p.circle(5.5, 5.5, 5.4, INK);
  p.circle(5.5, 5.5, 4.3, '#fff6ea');
  p.ellipse(5.5, 4, 4.3, 2.8, top);
  p.rect(1, 5, 9, 1, INK);
  p.px(3, 3, '#ffffff');
  return p;
}
// tiny pixel tiles shared through CSS variables (halftone dots, hatching)
(function patterns() {
  const root = document.documentElement.style;
  const tile = (w, h, fn) => { const p = new PixCanvas(w, h); fn(p); return `url(${p.c.toDataURL()})`; };
  root.setProperty('--pat-dots', tile(4, 4, (p) => { p.px(0, 0, '#fff'); p.px(2, 2, '#fff'); }));
  root.setProperty('--pat-dot', tile(6, 6, (p) => { p.rect(0, 0, 2, 2, '#fff'); p.rect(3, 3, 2, 2, '#fff'); }));
  root.setProperty('--pat-hatch', tile(4, 4, (p) => { for (let i = 0; i < 4; i++) p.px(i, 3 - i, '#fff'); }));
  root.setProperty('--pat-check', tile(2, 2, (p) => { p.px(0, 0, '#fff'); p.px(1, 1, '#fff'); }));
  root.setProperty('--cap', `url(${paintCapsule().c.toDataURL()})`);
})();

// ---------------------------------------------------------------- list
// items: elements; each gets .sel when selected. opts: { onPick(i), onBack(),
// onSide(i, dir), onMove(i), wrap, index, layer: push a key layer (default) }
export class MenuList {
  constructor(items, o = {}) {
    this.items = items;
    this.o = o;
    this.i = -1;
    this.enabled = true;
    items.forEach((el, i) => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && this.enabled && !el.classList.contains('off')) this.select(i); });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        el.blur?.();
        if (!this.enabled || el.classList.contains('off')) return;
        if (this.i !== i) this.select(i, { silent: true });
        this.pick();
      });
    });
    this.select(o.index ?? 0, { silent: true, first: true });
    if (o.layer !== false) pushLayer(this);
  }
  get el() { return this.items[this.i]; }
  select(i, { silent = false, first = false } = {}) {
    const n = this.items.length;
    if (!n) return;
    i = this.o.wrap === false ? Math.max(0, Math.min(n - 1, i)) : (i + n) % n;
    if (i === this.i) return;
    const prev = this.items[this.i];
    if (prev) prev.classList.remove('sel');
    this.i = i;
    const el = this.items[i];
    el.classList.add('sel');
    // replay the snap animation of the selection slab
    el.classList.remove('snap'); void el.offsetWidth; el.classList.add('snap');
    if (!silent) sfx('uiMove', { volume: 0.4 });
    el.scrollIntoView?.({ block: 'nearest' });
    if (!first) this.o.onMove?.(i);
  }
  move(d) {
    let i = this.i;
    for (let k = 0; k < this.items.length; k++) { i += d; const j = (i + this.items.length) % this.items.length; if (!this.items[j].classList.contains('off')) { this.select(i); return; } }
  }
  pick() {
    const el = this.el;
    if (!el || !this.enabled) return;
    el.classList.remove('picked'); void el.offsetWidth; el.classList.add('picked');
    this.o.onPick?.(this.i, el);
  }
  key(k) {
    if (!this.enabled) return;
    if (k === 'up') this.move(-1);
    else if (k === 'down') this.move(1);
    else if (k === 'left' || k === 'right') this.o.onSide?.(this.i, k === 'left' ? -1 : 1);
    else if (k === 'ok') this.pick();
    else if (k === 'back') this.o.onBack?.();
  }
  close() { popLayer(this); this.enabled = false; }
}

// ---------------------------------------------------------------- shared bits
// a jagged menu item: the slab (shadow + vermilion face) sits behind the
// painted word; .sel punches it forward. label: string, ja: small subtitle
export function menuItem(label, ja = '', { size = 15, cls = '' } = {}) {
  const b = document.createElement('button');
  b.className = 'k-item ' + cls;
  b.innerHTML = '<i class="k-slab"><i></i></i><span class="k-cur"></span>';
  const word = document.createElement('span');
  word.className = 'k-word';
  word.appendChild(typeEl(label, { size }, null, 'k-off'));
  word.appendChild(typeEl(label, { size, fill: CREAM, outline: INK, outline2: INK, shadow: 0 }, null, 'k-on'));
  b.appendChild(word);
  if (ja) { const j = document.createElement('span'); j.className = 'k-ja'; j.textContent = ja; b.appendChild(j); }
  return b;
}

// keycap hint: <kbd>Esc</kbd>
export const kbd = (t) => `<kbd class="k-kbd">${t}</kbd>`;

// ---------------------------------------------------------------- rows
export function sliderRow(label, value, onChange, { steps = 10 } = {}) {
  const row = document.createElement('div');
  row.className = 'k-row k-slider';
  row.innerHTML = `<i class="k-slab"><i></i></i><span class="k-rl"></span><span class="k-rv"><button class="k-arr l" aria-label="less">◀</button><span class="k-cells">${'<i></i>'.repeat(steps)}</span><b class="k-num"></b><button class="k-arr r" aria-label="more">▶</button></span>`;
  row.querySelector('.k-rl').appendChild(typeEl(label, { size: 11, slant: 0.18 }));
  const cells = [...row.querySelectorAll('.k-cells i')];
  const num = row.querySelector('.k-num');
  let v = Math.round(value * steps);
  const draw = () => { cells.forEach((c, i) => c.classList.toggle('on', i < v)); num.textContent = String(v * (100 / steps)).padStart(3, ' '); };
  const set = (nv, sound = true) => {
    nv = Math.max(0, Math.min(steps, nv));
    if (nv === v) return;
    v = nv; draw(); onChange(v / steps);
    if (sound) sfx('uiTick', { volume: 0.5, pitch: 0.8 + v * 0.05 });
    row.classList.remove('bump'); void row.offsetWidth; row.classList.add('bump');
  };
  cells.forEach((c, i) => c.addEventListener('click', (e) => { e.stopPropagation(); set(i + 1 === v ? i : i + 1); }));
  row.querySelector('.k-arr.l').addEventListener('click', (e) => { e.stopPropagation(); set(v - 1); });
  row.querySelector('.k-arr.r').addEventListener('click', (e) => { e.stopPropagation(); set(v + 1); });
  draw();
  row.side = (d) => set(v + d);
  return row;
}
export function cyclerRow(label, options, index, onChange) {
  const row = document.createElement('div');
  row.className = 'k-row k-cycler';
  row.innerHTML = `<i class="k-slab"><i></i></i><span class="k-rl"></span><span class="k-rv"><button class="k-arr l" aria-label="previous">◀</button><b class="k-opt"></b><span class="k-pips">${options.map(() => '<i></i>').join('')}</span><button class="k-arr r" aria-label="next">▶</button></span>`;
  row.querySelector('.k-rl').appendChild(typeEl(label, { size: 11, slant: 0.18 }));
  const opt = row.querySelector('.k-opt');
  const pips = [...row.querySelectorAll('.k-pips i')];
  let i = index;
  const draw = () => { opt.textContent = options[i]; pips.forEach((p, k) => p.classList.toggle('on', k === i)); };
  const set = (ni) => {
    ni = (ni + options.length) % options.length;
    if (ni === i) return;
    i = ni; draw(); onChange(i);
    sfx('uiTick', { volume: 0.5 });
    opt.classList.remove('flip'); void opt.offsetWidth; opt.classList.add('flip');
  };
  row.querySelector('.k-arr.l').addEventListener('click', (e) => { e.stopPropagation(); set(i - 1); });
  row.querySelector('.k-arr.r').addEventListener('click', (e) => { e.stopPropagation(); set(i + 1); });
  draw();
  row.side = (d) => set(i + d);
  row.cycle = () => set(i + 1);
  return row;
}

// ---------------------------------------------------------------- shutter wipe
// slanted bars sweep in from the right, cover the screen, `covered` runs
// (await it), then they sweep away to the left
export function shutter(covered, { hold = 120 } = {}) {
  const el = document.createElement('div');
  el.className = 'k-shutter';
  el.innerHTML = '<i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><b>木霊屋</b>';
  document.body.appendChild(el);
  sfx('uiOpen', { volume: 0.55 });
  return new Promise((res) => {
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(async () => {
      try { await covered?.(); } catch (e) { console.error(e); }
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => { el.remove(); }, 700);
        res();
      }, hold);
    }, 520);
  });
}

export { INK, CREAM, RED, GOLD };
