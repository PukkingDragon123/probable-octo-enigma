// Unified pointer / touch / keyboard input. Emits high-level gestures; the
// game decides what they mean in the current scene:
//   'tap'       { x, y }            short press without much movement
//   'hold'      { x, y }            press held still ~0.45 s
//   'dragstart' { x, y }            moved past the slop distance
//   'drag'      { x, y, dx, dy }
//   'dragend'   { x, y }
//   'move'      { x, y }            hover (mouse)
//   'zoom'      { factor, x, y }    wheel / pinch
//   'key'       { key, down }
import { Emitter } from './util.js';

export class Input extends Emitter {
  constructor(el) {
    super();
    this.el = el;
    this.pointers = new Map();
    this.keys = new Set();
    this.enabled = true;
    this.slop = 8;
    this.hoverX = -1; this.hoverY = -1;
    this.lastPinch = 0;
    this.holdTimer = null;
    const opt = { passive: false };
    el.addEventListener('pointerdown', (e) => this.down(e), opt);
    window.addEventListener('pointermove', (e) => this.moveEv(e), opt);
    window.addEventListener('pointerup', (e) => this.up(e), opt);
    window.addEventListener('pointercancel', (e) => this.up(e, true), opt);
    el.addEventListener('wheel', (e) => { e.preventDefault(); if (!this.enabled) return; this.emit('zoom', { factor: Math.exp(e.deltaY * 0.0012), x: e.clientX, y: e.clientY }); }, opt);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(k)) this.emit('key', { key: k, down: true, e });
      this.keys.add(k);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
      this.emit('key', { key: k, down: false, e });
    });
    window.addEventListener('blur', () => this.keys.clear());
  }
  rel(e) { const r = this.el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  down(e) {
    if (!this.enabled) return;
    e.preventDefault();
    try { this.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = this.rel(e);
    this.pointers.set(e.pointerId, { x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now(), dragging: false, held: false, button: e.button });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
      clearTimeout(this.holdTimer);
    } else {
      clearTimeout(this.holdTimer);
      this.holdTimer = setTimeout(() => {
        const q = this.pointers.get(e.pointerId);
        if (q && !q.dragging) { q.held = true; this.emit('hold', { x: q.x, y: q.y }); }
      }, 450);
    }
    this.emit('press', { x: p.x, y: p.y, button: e.button });
  }
  moveEv(e) {
    const p = this.rel(e);
    this.hoverX = p.x; this.hoverY = p.y;
    const q = this.pointers.get(e.pointerId);
    if (!q) { this.emit('move', { x: p.x, y: p.y }); return; }
    if (!this.enabled) return;
    e.preventDefault();
    if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      q.x = p.x; q.y = p.y;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.lastPinch > 0 && d > 0) this.emit('zoom', { factor: this.lastPinch / d, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      this.lastPinch = d;
      q.dragging = true;
      return;
    }
    const dx = p.x - q.x, dy = p.y - q.y;
    q.x = p.x; q.y = p.y;
    if (!q.dragging && Math.hypot(q.x - q.x0, q.y - q.y0) > this.slop) {
      q.dragging = true;
      clearTimeout(this.holdTimer);
      this.emit('dragstart', { x: q.x0, y: q.y0, held: q.held });
    }
    if (q.dragging) this.emit('drag', { x: p.x, y: p.y, dx, dy, held: q.held });
    this.emit('move', { x: p.x, y: p.y });
  }
  up(e, cancel = false) {
    const q = this.pointers.get(e.pointerId);
    if (!q) return;
    this.pointers.delete(e.pointerId);
    clearTimeout(this.holdTimer);
    if (!this.enabled) return;
    const p = this.rel(e);
    if (q.dragging) this.emit('dragend', { x: p.x, y: p.y, held: q.held });
    else if (!cancel && !q.held && performance.now() - q.t0 < 600 && this.pointers.size === 0) this.emit('tap', { x: p.x, y: p.y, button: q.button });
    else if (q.held) this.emit('holdend', { x: p.x, y: p.y });
    this.emit('release', { x: p.x, y: p.y });
  }
  // keyboard movement vector (x right, y forward) from WASD / arrows
  moveVector() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('w') || k.has('ArrowUp')) y += 1;
    if (k.has('s') || k.has('ArrowDown')) y -= 1;
    if (k.has('a') || k.has('ArrowLeft')) x -= 1;
    if (k.has('d') || k.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : null;
  }
  get pressed() { return this.pointers.size > 0; }
}
