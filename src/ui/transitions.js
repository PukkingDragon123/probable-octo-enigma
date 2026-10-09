// Full-screen pixel-art scene transitions drawn on a low-res canvas over the
// game: sliding shoji doors, rolling clouds, a swirl of leaves and petals
// (portal), a noren curtain, a dotted wipe and plain fades.
//   await T.close('shoji'); ...swap scenes...; await T.open('shoji');
import { clamp, EASE, mulberry32 } from '../core/util.js';

export class Transitions {
  constructor(game, root) {
    this.game = game;
    this.c = document.createElement('canvas');
    this.c.className = 'transition';
    Object.assign(this.c.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 40, display: 'none' });
    root.appendChild(this.c);
    this.x = this.c.getContext('2d');
    this.k = 0; // 0 open .. 1 closed
    this.kind = 'shoji';
    this.anim = null;
    this.t = 0;
    this.leaves = null;
  }
  size() {
    const R = this.game.renderer;
    const ps = Math.max(2, R.pixelScale);
    const w = Math.ceil(R.W / ps), h = Math.ceil(R.H / ps);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    return { w, h };
  }
  run(kind, from, to, dur) {
    this.kind = kind;
    this.c.style.display = 'block';
    if (kind === 'leaves' && !this.leaves) this.seedLeaves();
    return new Promise((res) => { this.anim = { from, to, t: 0, dur, res }; });
  }
  close(kind = 'shoji', dur = 0.75) { this.game.audio?.play?.(kind === 'shoji' ? 'fusuma' : kind === 'leaves' ? 'portalWhoosh' : 'select', { volume: 0.4 }); return this.run(kind, this.k, 1, dur); }
  open(kind = this.kind, dur = 0.75) { return this.run(kind, this.k, 0, dur); }
  get busy() { return !!this.anim; }
  seedLeaves() {
    const r = mulberry32(7);
    this.leaves = Array.from({ length: 260 }, () => ({ a: r() * Math.PI * 2, d: r(), s: 0.5 + r() * 1.2, c: ['#7fae3e', '#a8d05a', '#ffd2e0', '#ffbcd2', '#e0a03a', '#5a8a2e', '#fff4c8'][Math.floor(r() * 7)], spin: r() * 6 }));
  }
  update(dt) {
    this.t += dt;
    const A = this.anim;
    if (A) {
      A.t += dt;
      const u = clamp(A.t / A.dur, 0, 1);
      this.k = A.from + (A.to - A.from) * EASE.inOutCubic(u);
      if (u >= 1) { this.anim = null; this.k = A.to; A.res(); }
    }
    if (this.k <= 0.0001 && !this.anim) { this.c.style.display = 'none'; return; }
    this.draw();
  }
  draw() {
    const { w, h } = this.size();
    const x = this.x, k = this.k;
    x.clearRect(0, 0, w, h);
    x.imageSmoothingEnabled = false;
    const kind = this.kind;
    if (kind === 'fade' || kind === 'black') { x.fillStyle = `rgba(14,8,18,${k})`; x.fillRect(0, 0, w, h); return; }
    if (kind === 'white') { x.fillStyle = `rgba(255,250,240,${k})`; x.fillRect(0, 0, w, h); return; }
    if (kind === 'shoji') {
      const half = Math.ceil(w / 2);
      const off = Math.round((1 - k) * (half + 6));
      for (const side of [0, 1]) {
        const x0 = side === 0 ? -off : half + off;
        this.shojiPanel(x0, 0, half, h, side);
      }
      return;
    }
    if (kind === 'clouds') {
      // puffs grow inwards from all edges
      x.fillStyle = '#fff6ee';
      const R = Math.max(w, h);
      const n = 40;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = w / 2 + Math.cos(a) * R * 0.75, cy = h / 2 + Math.sin(a) * R * 0.75;
        const r = (R * 0.2 + (i % 3) * R * 0.04) * (0.2 + k * 2.6);
        this.puff(cx, cy, r, i);
      }
      if (k > 0.85) { x.fillStyle = `rgba(255,246,238,${(k - 0.85) / 0.15})`; x.fillRect(0, 0, w, h); }
      return;
    }
    if (kind === 'leaves') {
      // a swirl of leaves fills the screen, then a warm glow
      const t = this.t;
      for (const L of this.leaves) {
        const rad = (1 - k) * Math.max(w, h) * 0.9 + L.d * Math.max(w, h) * 0.6 * (1 - k * 0.6);
        const a = L.a + t * (1.2 + L.d) + k * 4;
        const cx = w / 2 + Math.cos(a) * rad * (0.4 + L.d * 0.8);
        const cy = h / 2 + Math.sin(a) * rad * (0.3 + L.d * 0.7);
        const s = Math.max(1, Math.round((2 + L.s * 3) * (0.6 + k * 1.4)));
        x.fillStyle = L.c;
        x.fillRect(Math.round(cx), Math.round(cy), s, Math.max(1, Math.round(s * 0.6)));
      }
      if (k > 0.6) { x.fillStyle = `rgba(255,248,224,${(k - 0.6) / 0.4})`; x.fillRect(0, 0, w, h); }
      return;
    }
    if (kind === 'noren') {
      const n = 4, sw = Math.ceil(w / n);
      for (let i = 0; i < n; i++) {
        const hh = Math.round(h * k * (1 + (i % 2) * 0.04));
        x.fillStyle = '#2a3a6a'; x.fillRect(i * sw, 0, sw - 1, hh);
        x.fillStyle = '#3a4a80'; x.fillRect(i * sw, 0, 2, hh);
        x.fillStyle = '#f4ece0'; x.fillRect(i * sw + sw / 2 - 6, Math.max(0, hh - 30), 12, 12);
      }
      return;
    }
    // 'dots': halftone dots grow from the centre
    const cell = 8;
    x.fillStyle = '#1a1220';
    for (let y = 0; y < h + cell; y += cell) for (let xx = 0; xx < w + cell; xx += cell) {
      const d = Math.hypot(xx - w / 2, y - h / 2) / Math.hypot(w / 2, h / 2);
      const r = clamp((k * 1.6 - d * 0.6) * cell * 0.75, 0, cell * 0.75);
      if (r > 0.5) { x.beginPath(); x.arc(xx, y, r, 0, Math.PI * 2); x.fill(); }
    }
  }
  puff(cx, cy, r, i) {
    const x = this.x;
    const lobes = 5;
    for (let j = 0; j < lobes; j++) {
      const a = (j / lobes) * Math.PI * 2 + i;
      x.beginPath(); x.arc(Math.round(cx + Math.cos(a) * r * 0.5), Math.round(cy + Math.sin(a) * r * 0.4), Math.max(1, r * 0.6), 0, Math.PI * 2); x.fill();
    }
    x.beginPath(); x.arc(Math.round(cx), Math.round(cy), Math.max(1, r * 0.75), 0, Math.PI * 2); x.fill();
  }
  shojiPanel(x0, y0, pw, ph, side) {
    const x = this.x;
    const frame = '#6a4224', frameL = '#8a5a34', paper = '#f6efdc', paperS = '#e8dcc0';
    x.fillStyle = frame; x.fillRect(x0, y0, pw, ph);
    x.fillStyle = paper; x.fillRect(x0 + 4, y0 + 4, pw - 8, ph - 8);
    // warm light through the paper
    const g = x.createLinearGradient(x0, 0, x0 + pw, 0);
    g.addColorStop(side ? 0 : 1, 'rgba(255,220,160,0.35)'); g.addColorStop(side ? 1 : 0, 'rgba(255,220,160,0)');
    x.fillStyle = g; x.fillRect(x0 + 4, y0 + 4, pw - 8, ph - 8);
    // lattice (kumiko)
    const cols = 4, rows = 6;
    x.fillStyle = frame;
    for (let i = 1; i < cols; i++) x.fillRect(Math.round(x0 + 4 + (i * (pw - 8)) / cols) - 1, y0, 2, ph);
    for (let j = 1; j < rows; j++) x.fillRect(x0, Math.round(y0 + 4 + (j * (ph - 8)) / rows) - 1, pw, 2);
    x.fillStyle = paperS;
    for (let j = 0; j < rows; j++) x.fillRect(x0 + 4, Math.round(y0 + 4 + (j * (ph - 8)) / rows) + 1, pw - 8, 1);
    x.fillStyle = frameL; x.fillRect(x0, y0, pw, 2); x.fillRect(x0, y0, 2, ph);
    // handle (hikite)
    const hx = side === 0 ? x0 + pw - 14 : x0 + 8;
    x.fillStyle = '#3a2418'; x.fillRect(hx, Math.round(ph / 2) - 8, 6, 16);
    x.fillStyle = '#c8a050'; x.fillRect(hx + 1, Math.round(ph / 2) - 7, 4, 14);
  }
}
