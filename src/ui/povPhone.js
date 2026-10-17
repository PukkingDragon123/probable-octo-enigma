// First person: Mamo's own hands holding his phone up in front of the train
// window (the game view behind goes soft, like a camera's shallow focus).
// The phone runs "Nanpure" — a little 6x6 sudoku with a cat mascot. Painted
// in pixels on the game's own grid: hoodie sleeves, green turtle hands, a
// navy case with a fish charm, the thumb that reaches over to tap.
//
//   const won = await pov.play({ seed: 7 });   // resolves when the puzzle is solved
import { PixCanvas } from '../core/pixtex.js';
import { FONT } from './fonts.js';
import { makeSudoku, boxOf, completedUnits } from '../game/sudoku.js';

const SKIN = '#94bf6c', SKIN_L = '#b8d68a', SKIN_D = '#6e9a50', SKIN_O = '#3e6034', NAIL = '#d8e8b0';
const HOOD = '#d99a3c', HOOD_L = '#ecb85a', HOOD_D = '#b0782a', HOOD_O = '#6e4618', CUFF = '#b8782a';
const CASE = '#2a3452', CASE_L = '#46527a', CASE_D = '#1a2036', BEZEL = '#121216';
const UI = { bg: '#fff6e6', bg2: '#ffe9c8', line: '#d8b48a', thick: '#8a5a3a', given: '#4a3428', mine: '#2a8a9a', sel: '#ffd86a', hl: '#fff0c4', same: '#ffe0a0', bad: '#ff6a6a', title: '#e86a5a' };
const PADS = ['#ffb0c0', '#ffc898', '#ffe88a', '#b8eaa0', '#a8d8ff', '#d0b8ff'];

// ---------------------------------------------------------------- tiny pixel brush on a 2D context
function px(x, c, X, Y, w = 1, h = 1) { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); }
function ell(x, cx, cy, rx, ry, c) {
  x.fillStyle = c;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const ny = (y + 0.5 - cy) / ry;
    if (ny * ny > 1) continue;
    const hw = rx * Math.sqrt(1 - ny * ny);
    x.fillRect(Math.round(cx - hw), y, Math.round(cx + hw) - Math.round(cx - hw), 1);
  }
}
function rrect(x, X, Y, w, h, r, c) {
  x.fillStyle = c;
  for (let y = 0; y < h; y++) {
    let ins = 0;
    if (y < r) ins = r - Math.round(Math.sqrt(r * r - (r - y - 0.5) ** 2));
    else if (y >= h - r) ins = r - Math.round(Math.sqrt(r * r - (y - (h - r) + 0.5) ** 2));
    x.fillRect(Math.round(X + ins), Math.round(Y + y), Math.round(w - ins * 2), 1);
  }
}
function poly(x, pts, c) {
  x.fillStyle = c; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); x.fill();
}
// crisp text glyphs, cached
const GLY = new Map();
function glyph(str, size, color, font = FONT.ui, outline = null) {
  const k = str + size + color + font + outline;
  if (GLY.has(k)) return GLY.get(k);
  const p = new PixCanvas(Math.max(8, Math.ceil(str.length * size * 1.1) + 6), size + 8, 1);
  const r = p.text(str, 2, 2, { font: `${size}px "${font}"`, color, outline });
  const c = { c: p.c, w: (r?.w ?? str.length * size * 0.6) + (outline ? 2 : 0), h: size + 4 };
  GLY.set(k, c);
  return c;
}
function text(x, str, X, Y, size, color, { align = 'left', font, outline } = {}) {
  const g = glyph(str, size, color, font, outline);
  const ox = align === 'center' ? g.w / 2 : align === 'right' ? g.w : 0;
  x.drawImage(g.c, Math.round(X - ox - 2), Math.round(Y - 2));
  return g.w;
}

export class PovPhone {
  constructor(game, root) {
    this.game = game;
    this.cv = document.createElement('canvas');
    this.cv.className = 'pov-phone';
    Object.assign(this.cv.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', imageRendering: 'pixelated', opacity: '0', transition: 'opacity .45s', pointerEvents: 'none', zIndex: '30' });
    root.appendChild(this.cv);
    this.x = this.cv.getContext('2d');
    this.active = false;
    this.cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.tap(e); });
  }
  // ------------------------------------------------------------ flow
  play({ seed = 7, givens = 16 } = {}) {
    const g = this.game, R = g.renderer;
    this.W = R.lowW; this.H = R.lowH;
    this.cv.width = this.W; this.cv.height = this.H;
    this.puz = makeSudoku(seed, givens);
    this.grid = this.puz.grid.slice();
    this.given = this.grid.map((v) => v > 0);
    this.sel = this.grid.findIndex((v) => !v);
    this.fx = []; this.flash = new Map(); this.shake = new Map(); this.sparkle = [];
    this.mood = 'idle'; this.moodT = 0;
    this.screen = 'lock'; this.screenT = 0;
    this.t = 0; this.clock = 0; this.thumb = { x: 0, y: 0, tx: 0, ty: 0, press: 0, rest: true };
    this.thought = null; this.won = false; this.winT = 0;
    this.active = true;
    this.cv.style.pointerEvents = 'auto';
    this.cv.style.opacity = '1';
    const gc = R.renderer.domElement;
    gc.style.transition = 'filter .6s';
    gc.style.filter = 'blur(2.5px) saturate(0.9) brightness(0.92)';
    this.autoT = 0;
    this._last = performance.now();
    const loop = (now) => {
      if (!this.active) return;
      const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return new Promise((res) => { this.resolve = res; });
  }
  close() {
    this.active = false;
    this.cv.style.opacity = '0';
    this.cv.style.pointerEvents = 'none';
    this.game.renderer.renderer.domElement.style.filter = '';
  }
  think(str, dur = 2.6) { this.thought = { str, t: 0, dur }; }
  openApp() { if (this.screen !== 'lock') return; this.screen = 'opening'; this.screenT = 0; this.game.audio?.play?.('phoneTap', { volume: 0.4 }); }
  // ------------------------------------------------------------ layout
  get L() {
    const W = this.W, H = this.H;
    const ph = Math.round(Math.min(H * 0.82, W * 1.2)), pw = Math.round(ph * 0.5);
    const sway = this.sway || { x: 0, y: 0 };
    const pxX = Math.round(W / 2 - pw / 2 + W * 0.02 + sway.x), pyY = Math.round(H * 0.06 + sway.y);
    const s = { x: pxX + 6, y: pyY + 13, w: pw - 12, h: ph - 25 };
    const head = s.y + 9, gTop = head + 26;
    const cell = Math.floor((s.w - 10) / 6), G = cell * 6;
    const gx = Math.round(s.x + (s.w - G) / 2);
    const padY = gTop + G + 8, pad = Math.floor((s.w - 10) / 6);
    return { W, H, px: pxX, py: pyY, pw, ph, s, head, gTop, gx, cell, G, padY, pad };
  }
  // ------------------------------------------------------------ input
  tap(e) {
    if (!this.active || this.won) return;
    const r = this.cv.getBoundingClientRect();
    const X = (e.clientX - r.left) * this.W / r.width, Y = (e.clientY - r.top) * this.H / r.height;
    const L = this.L;
    if (this.screen === 'lock') { if (X > L.s.x && X < L.s.x + L.s.w && Y > L.s.y && Y < L.s.y + L.s.h) this.openApp(); return; }
    if (this.screen !== 'app') return;
    // grid
    if (X >= L.gx && X < L.gx + L.G && Y >= L.gTop && Y < L.gTop + L.G) {
      const c = Math.floor((X - L.gx) / L.cell), rr = Math.floor((Y - L.gTop) / L.cell);
      this.select(rr * 6 + c);
      return;
    }
    // number pad
    const bx0 = L.s.x + 5;
    if (Y >= L.padY && Y < L.padY + L.pad) { const k = Math.floor((X - bx0) / L.pad); if (k >= 0 && k < 6) this.place(k + 1); return; }
    if (Y >= L.padY + L.pad + 3 && Y < L.padY + L.pad + 17) this.erase();
  }
  select(i) {
    this.sel = i; this.game.audio?.play?.('phoneTap', { volume: 0.25 });
    const L = this.L; this.moveThumb(L.gx + (i % 6 + 0.5) * L.cell, L.gTop + (Math.floor(i / 6) + 0.5) * L.cell);
  }
  erase() { const i = this.sel; if (i >= 0 && !this.given[i]) this.grid[i] = 0; this.game.audio?.play?.('phoneTap', { volume: 0.2 }); }
  moveThumb(x, y) { const T = this.thumb; T.tx = x; T.ty = y; T.press = 0.18; T.rest = false; T.restT = 1.4; }
  place(v) {
    const i = this.sel;
    const L = this.L;
    this.moveThumb(L.s.x + 5 + (v - 0.5) * L.pad, L.padY + L.pad / 2);
    if (i < 0 || this.given[i]) return;
    const A = this.game.audio;
    if (this.puz.solution[i] === v) {
      this.grid[i] = v;
      this.flash.set(i, 0.5);
      this.mood = 'happy'; this.moodT = 1.0;
      A?.play?.('coin', { volume: 0.25, pitch: 1.6 + v * 0.06 });
      for (const unit of completedUnits(this.grid, i)) unit.forEach((j, k) => this.sparkle.push({ i: j, t: -k * 0.05 }));
      if (this.grid.every((x, j) => x === this.puz.solution[j])) this.win();
      else { const nx = this.grid.findIndex((x, j) => !x && j > i); this.sel = nx >= 0 ? nx : this.grid.findIndex((x) => !x); }
    } else {
      this.grid[i] = v; this.shake.set(i, 0.6);
      this.mood = 'oops'; this.moodT = 1.2;
      A?.play?.('boxDrop', { volume: 0.18, pitch: 2.2 });
      setTimeout(() => { if (this.grid[i] === v && this.puz.solution[i] !== v) this.grid[i] = 0; }, 600);
    }
  }
  win() {
    this.won = true; this.winT = 0; this.mood = 'win'; this.moodT = 99; this.sel = -1;
    const A = this.game.audio;
    A?.play?.('sparkle', { volume: 0.5 }); A?.play?.('cheer', { volume: 0.25 });
    const L = this.L;
    for (let k = 0; k < 70; k++) this.fx.push({ x: L.s.x + L.s.w / 2, y: L.gTop + L.G / 2, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 110, c: PADS[k % 6], t: 0, life: 1.6 + Math.random() });
  }
  // ------------------------------------------------------------ per frame
  update(dt) {
    this.t += dt; this.clock += dt; this.screenT += dt; this.moodT -= dt;
    if (this.moodT < 0 && !this.won) this.mood = 'idle';
    const sc = this.game.location?.scenery;
    const sp = sc ? sc.speed : 0.6;
    // hands sway with the train and your breathing
    this.sway = { x: Math.sin(this.t * 0.8) * 1.4 + Math.sin(this.t * 7.3) * 0.25 * sp, y: Math.sin(this.t * 1.3) * 1.2 + Math.sin(this.t * 11) * 0.3 * sp };
    this.tunnel = sc ? sc.tunnelK : 0;
    this.lights = sc ? sc.look.lights : 0;
    for (const [k, v] of this.flash) { if (v - dt <= 0) this.flash.delete(k); else this.flash.set(k, v - dt); }
    for (const [k, v] of this.shake) { if (v - dt <= 0) this.shake.delete(k); else this.shake.set(k, v - dt); }
    this.sparkle = this.sparkle.filter((s) => (s.t += dt) < 0.7);
    for (const f of this.fx) { f.t += dt; f.vy += 160 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.99; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    const T = this.thumb;
    if (!T.rest) { T.restT -= dt; if (T.restT < 0) T.rest = true; }
    T.press = Math.max(0, T.press - dt);
    if (this.thought) { this.thought.t += dt; if (this.thought.t > this.thought.dur) this.thought = null; }
    if (this.screen === 'opening' && this.screenT > 0.45) { this.screen = 'app'; this.screenT = 0; }
    if (this.won) {
      this.winT += dt;
      if (this.winT > 3.2 && this.resolve) { const r = this.resolve; this.resolve = null; r(true); }
    }
    // dev / auto-play: the puzzle solves itself
    if (this.game.autoPlay && this.screen === 'app' && !this.won) {
      this.autoT += dt;
      if (this.autoT > 0.32) { this.autoT = 0; const i = this.grid.findIndex((v) => !v); if (i >= 0) { this.sel = i; this.place(this.puz.solution[i]); } }
    }
    if (this.game.autoPlay && this.screen === 'lock' && this.screenT > 1.6) this.openApp();
  }
  draw() {
    const x = this.x, L = this.L, W = this.W, H = this.H;
    x.clearRect(0, 0, W, H);
    x.imageSmoothingEnabled = false;
    // a soft vignette framing the view
    const vg = x.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75);
    vg.addColorStop(0, 'rgba(10,8,20,0)'); vg.addColorStop(1, `rgba(10,8,20,${0.55 + this.tunnel * 0.3})`);
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    this.drawArms(L, 'back');
    this.drawPhone(L);
    this.drawArms(L, 'front');
    // light from the screen on the hands, the shadow of a passing mast
    const sc = this.game.location?.scenery;
    if (sc && sc.speed > 0.05 && this.tunnel < 0.5) {
      const per = 1.2 / Math.max(0.2, sc.speed), ph = (this.t % per) / per;
      const bx = W * 1.3 - ph * W * 1.6;
      x.fillStyle = 'rgba(20,14,40,0.22)';
      x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx + 34, 0); x.lineTo(bx + 4, H); x.lineTo(bx - 30, H); x.closePath(); x.fill();
    }
    if (this.tunnel > 0.01) { x.fillStyle = `rgba(8,6,16,${this.tunnel * 0.45})`; x.fillRect(0, 0, W, H); this.drawScreen(L, true); }
    // inner voice
    if (this.thought) {
      const T = this.thought, a = Math.min(1, T.t * 3, (T.dur - T.t) * 3);
      x.globalAlpha = a;
      const w = glyph(T.str, 11, '#fff6e6', FONT.ui, '#1a1420').w;
      rrect(x, W / 2 - w / 2 - 8, H * 0.08 - 3, w + 16, 18, 6, 'rgba(26,20,32,0.7)');
      text(x, T.str, W / 2, H * 0.08, 11, '#fff6e6', { align: 'center', outline: '#1a1420' });
      x.globalAlpha = 1;
    }
  }
  // ------------------------------------------------------------ hands
  // shaded pixel shapes from signed-distance functions (crisp, lit from the upper left)
  shape(img, W, H, bb, sdf, ramp, outline, opts = {}) {
    const d32 = img;
    const [x0, y0, x1, y1] = bb.map(Math.round);
    const r = opts.r || 8;
    for (let Y = Math.max(0, y0); Y <= Math.min(H - 1, y1); Y++) for (let X = Math.max(0, x0); X <= Math.min(W - 1, x1); X++) {
      const d = sdf(X + 0.5, Y + 0.5);
      if (d > 0) continue;
      let c;
      if (d > -1.15) c = outline;
      else {
        const gx = sdf(X + 1.5, Y + 0.5) - sdf(X - 0.5, Y + 0.5), gy = sdf(X + 0.5, Y + 1.5) - sdf(X + 0.5, Y - 0.5);
        const l = Math.hypot(gx, gy) || 1;
        const depth = Math.min(1, -d / r);
        let v = 0.55 + ((gx / l) * -0.62 + (gy / l) * -0.78) * 0.5 * (1 - depth * 0.75) + (opts.bias || 0);
        if (opts.stripe) v += opts.stripe(X, Y);
        const f = Math.max(0, Math.min(0.999, v)) * (ramp.length - 1), i = Math.floor(f);
        const bay = ((X & 1) * 2 + (Y & 1) * 3) % 4 / 4 + 0.125;
        c = ramp[Math.min(ramp.length - 1, i + (f - i > bay ? 1 : 0))];
      }
      d32[Y * W + X] = c;
    }
  }
  bakeHands(L) {
    const key = L.W + 'x' + L.H;
    if (this._hands && this._hands.key === key) return this._hands;
    const W = L.W, H = L.H;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d');
    const img = cx.createImageData(W, H), d32 = new Uint32Array(img.data.buffer);
    const P = (h) => { const n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
    const SK = [SKIN_O, SKIN_D, SKIN, SKIN_L, '#d0e6a6'].map(P), HD = [HOOD_O, HOOD_D, HOOD, HOOD_L, '#f4cc78'].map(P), CF = [HOOD_O, CUFF, HOOD_D, HOOD].map(P);
    const cap = (ax, ay, bx, by, r) => (X, Y) => { const px2 = X - ax, py2 = Y - ay, vx = bx - ax, vy = by - ay; const t = Math.max(0, Math.min(1, (px2 * vx + py2 * vy) / (vx * vx + vy * vy))); return Math.hypot(px2 - vx * t, py2 - vy * t) - r; };
    const el = (ex, ey, rx, ry) => (X, Y) => (Math.hypot((X - ex) / rx, (Y - ey) / ry) - 1) * Math.min(rx, ry);
    // phone-relative anchors (without sway: the bake is offset by the sway when drawn)
    const sw = this.sway; this.sway = { x: 0, y: 0 }; const Q = this.L; this.sway = sw;
    const { px: X, py: Y, pw, ph } = Q;
    for (const side of [-1, 1]) {
      const wx = side < 0 ? X + pw * 0.02 : X + pw * 0.98, wy = Y + ph * 0.95;
      const ox = side < 0 ? X - pw * 0.75 : X + pw * 1.75, oy = H + 40;
      const R = pw * 0.3;
      // sleeve, with soft folds
      this.shape(d32, W, H, [Math.min(ox, wx) - R - 4, wy - R - 4, Math.max(ox, wx) + R + 4, H], cap(ox, oy, wx + side * 6, wy + 10, R), HD, P(HOOD_O), { r: R, stripe: (x, y) => (Math.sin((x * 0.35 + y * 0.9) * side) > 0.93 ? -0.25 : 0) });
      // ribbed cuff
      const cr = R * 0.82;
      this.shape(d32, W, H, [wx - cr - 10, wy - cr, wx + cr + 10, wy + cr + 18], cap(wx + side * 10, wy + 14, wx + side * 2, wy + 4, cr), CF, P(HOOD_O), { r: cr, stripe: (x, y) => ((Math.round(x * 0.9 - y * side * 0.5) % 3) === 0 ? -0.3 : 0) });
      // the palm behind the phone's corner
      const hx = side < 0 ? X + pw * 0.05 : X + pw * 0.95, hy = Y + ph * 0.87;
      this.shape(d32, W, H, [hx - 26, hy - 24, hx + 26, hy + 24], el(hx, hy, pw * 0.2, ph * 0.1), SK, P(SKIN_O), { r: 12, bias: side > 0 ? -0.05 : 0.04 });
      // fingertips curling round the back, peeking past the edge
      for (let k = 0; k < 3; k++) {
        const fx = side < 0 ? X - 3 : X + pw + 3, fy = Y + ph * (0.58 + k * 0.075);
        this.shape(d32, W, H, [fx - 8, fy - 7, fx + 8, fy + 7], el(fx, fy, 6, 5), SK, P(SKIN_O), { r: 4, bias: 0.05 });
      }
    }
    cx.putImageData(img, 0, 0);
    // the left thumb lies on the bottom-left of the screen
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const cx2 = c2.getContext('2d'); const img2 = cx2.createImageData(W, H), e32 = new Uint32Array(img2.data.buffer);
    const tx0 = X + pw * 0.02, ty0 = Y + ph * 0.94, tx1 = X + pw * 0.2, ty1 = Y + ph * 0.86;
    this.shape(e32, W, H, [tx0 - 12, ty1 - 12, tx1 + 12, ty0 + 12], cap(tx0, ty0, tx1, ty1, 7.5), SK, P(SKIN_O), { r: 6 });
    this.shape(e32, W, H, [tx1 - 6, ty1 - 6, tx1 + 4, ty1 + 2], el(tx1 - 1.5, ty1 - 1.5, 3.5, 2.6), [P('#c8dca0'), P(NAIL), P('#f4fae0')], P('#8aa870'), { r: 2 });
    cx2.putImageData(img2, 0, 0);
    this._hands = { key, back: c, front: c2, SK, P, cap, el };
    return this._hands;
  }
  drawArms(L, layer) {
    const x = this.x, hb = this.bakeHands(L);
    const ox = Math.round(this.sway.x), oy = Math.round(this.sway.y);
    if (layer === 'back') { x.drawImage(hb.back, ox, oy); return; }
    x.drawImage(hb.front, ox, oy);
    // the right thumb: rests on the bezel, reaches over to tap
    const { px: X, py: Y, pw, ph } = L;
    const T = this.thumb;
    const restX = X + pw * 0.8, restY = Y + ph * 0.87;
    const gx = T.rest ? restX : T.tx + 4, gy = T.rest ? restY : T.ty + 5;
    if (!T.x) { T.x = restX; T.y = restY; }
    T.x += (gx - T.x) * 0.32; T.y += (gy - T.y) * 0.32;
    const pr = T.press > 0.06 ? 1 : 0;
    const bx = X + pw * 0.99, by = Y + ph * 0.95;
    const W = this.W, H = this.H;
    const x0 = Math.floor(Math.min(bx, T.x) - 12), y0 = Math.floor(Math.min(by, T.y) - 12), x1 = Math.ceil(Math.max(bx, T.x) + 12), y1 = Math.ceil(Math.max(by, T.y) + 12);
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const img = x.createImageData(w, h), d32 = new Uint32Array(img.data.buffer);
    const tx = T.x - x0, ty = T.y - y0 + pr;
    this.shape(d32, w, h, [0, 0, w - 1, h - 1], hb.cap(bx - x0, by - y0, tx, ty, 7.5), hb.SK, hb.P(SKIN_O), { r: 6 });
    const ang = Math.atan2(ty - (by - y0), tx - (bx - x0));
    const nx = tx - Math.cos(ang) * 2.5, ny = ty - Math.sin(ang) * 2.5 - 1.5;
    this.shape(d32, w, h, [nx - 5, ny - 4, nx + 5, ny + 4], hb.el(nx, ny, 3.5, 2.6), [hb.P('#c8dca0'), hb.P(NAIL), hb.P('#f4fae0')], hb.P('#8aa870'), { r: 2 });
    const tmp = this._tc || (this._tc = document.createElement('canvas'));
    tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(img, 0, 0);
    x.drawImage(tmp, x0, y0);
  }
  // ------------------------------------------------------------ the handset
  drawPhone(L) {
    const x = this.x, { px: X, py: Y, pw, ph } = L;
    rrect(x, X - 1, Y - 1, pw + 2, ph + 2, 14, CASE_D);
    rrect(x, X, Y, pw, ph, 13, CASE);
    rrect(x, X + 1, Y + 1, 3, ph - 30, 1, CASE_L);
    rrect(x, X + 4, Y + 4, pw - 8, ph - 8, 10, BEZEL);
    // speaker slit + camera
    px(x, '#2a2a34', X + pw / 2 - 9, Y + 7, 18, 2); ell(x, X + pw / 2 + 16, Y + 8, 2, 2, '#1e2a4a');
    // a little fish charm on a string from the corner
    const sw = Math.sin(this.t * 2.1) * 3;
    x.strokeStyle = '#d84a3a'; x.lineWidth = 1; x.beginPath(); x.moveTo(X + 6, Y + 2); x.lineTo(X - 6 + sw, Y + 22); x.stroke();
    ell(x, X - 8 + sw, Y + 27, 6, 3.5, '#5ab0e8'); poly(x, [[X - 14 + sw, Y + 27], [X - 19 + sw, Y + 23], [X - 19 + sw, Y + 31]], '#3a8ac8');
    px(x, '#ffffff', X - 5 + sw, Y + 26, 1, 1); px(x, '#1a1a2a', X - 4 + sw, Y + 26, 1, 1);
    this.drawScreen(L);
  }
  drawScreen(L, glowOnly = false) {
    const x = this.x, s = L.s;
    x.save();
    x.beginPath(); x.rect(s.x, s.y, s.w, s.h); x.clip();
    if (this.screen === 'lock' || (this.screen === 'opening' && this.screenT < 0.2)) this.drawLock(L);
    else this.drawApp(L);
    if (this.screen === 'opening') { const k = Math.min(1, this.screenT / 0.45); x.fillStyle = `rgba(255,246,230,${1 - Math.abs(k - 0.5) * 2})`; x.fillRect(s.x, s.y, s.w, s.h); }
    x.restore();
    // status bar
    px(x, 'rgba(0,0,0,0.0)', s.x, s.y, s.w, 9);
    const dark = this.screen === 'lock';
    text(x, '15:42', s.x + 5, s.y, 9, dark ? '#ffffff' : '#6a4a3a', { font: FONT.small });
    for (let k = 0; k < 4; k++) px(x, dark ? '#ffffff' : '#6a4a3a', s.x + s.w - 24 + k * 2, s.y + 6 - k, 1, k + 1);
    rrect(x, s.x + s.w - 14, s.y + 2, 10, 5, 1, dark ? '#ffffff' : '#6a4a3a'); px(x, dark ? '#2a3050' : UI.bg, s.x + s.w - 13, s.y + 3, 6, 3);
  }
  drawLock(L) {
    const x = this.x, s = L.s;
    for (let y = 0; y < s.h; y++) { const k = y / s.h; x.fillStyle = `rgb(${Math.round(26 + 40 * k)},${Math.round(34 + 30 * k)},${Math.round(68 + 50 * k)})`; x.fillRect(s.x, s.y + y, s.w, 1); }
    for (let i = 0; i < 30; i++) px(x, i % 3 ? '#8a9ad8' : '#ffffff', s.x + ((i * 37) % s.w), s.y + ((i * 53) % (s.h * 0.6)), 1, 1);
    ell(x, s.x + s.w * 0.72, s.y + 40, 10, 10, '#f4f0d8'); ell(x, s.x + s.w * 0.72 - 4, s.y + 37, 9, 9, '#2a3458');
    text(x, '15:42', s.x + s.w / 2, s.y + 30, 22, '#ffffff', { align: 'center', font: FONT.big });
    text(x, '7月18日 木曜日', s.x + s.w / 2, s.y + 58, 9, '#d8e0ff', { align: 'center', font: FONT.small });
    rrect(x, s.x + 8, s.y + 82, s.w - 16, 18, 5, 'rgba(255,255,255,0.16)');
    text(x, '通知はありません', s.x + s.w / 2, s.y + 86, 9, '#e8ecff', { align: 'center', font: FONT.small });
    // app icons along the bottom: music, messages (no badge), photos, and the puzzle
    const icons = [['#ff7a8a', '♪'], ['#5ad08a', '✉'], ['#ffc860', '▣'], ['#ffffff', '6']];
    const iy = Math.round(s.y + s.h * 0.6), iw = 22;
    icons.forEach(([c, g], k) => {
      const ix = s.x + 10 + k * ((s.w - 20 - iw) / 3);
      rrect(x, ix, iy, iw, iw, 6, c);
      if (k === 3) { // Nanpure: a tiny grid and the cat ears
        for (let q = 0; q < 3; q++) { px(x, '#d8b48a', ix + 4, iy + 6 + q * 5, iw - 8, 1); px(x, '#d8b48a', ix + 6 + q * 5, iy + 4, 1, iw - 8); }
        poly(x, [[ix + 3, iy + 3], [ix + 8, iy + 3], [ix + 4, iy - 2]], '#e86a5a'); poly(x, [[ix + iw - 3, iy + 3], [ix + iw - 8, iy + 3], [ix + iw - 4, iy - 2]], '#e86a5a');
        if (Math.floor(this.t * 2) % 2 === 0 && this.screen === 'lock') { x.strokeStyle = '#ffe070'; x.lineWidth = 1; x.strokeRect(ix - 1.5, iy - 1.5, iw + 3, iw + 3); }
      } else text(x, g, ix + iw / 2, iy + 5, 11, '#ffffff', { align: 'center', font: FONT.ui });
      text(x, ['音楽', 'メール', '写真', 'ナンプレ'][k], ix + iw / 2, iy + iw + 1, 9, '#e8ecff', { align: 'center', font: FONT.small });
    });
  }
  drawApp(L) {
    const x = this.x, s = L.s, t = this.t;
    // paper background with soft polka dots
    px(x, UI.bg, s.x, s.y, s.w, s.h);
    for (let yy = 0; yy < s.h; yy += 8) for (let xx = (yy / 8) % 2 ? 4 : 0; xx < s.w; xx += 8) px(x, UI.bg2, s.x + xx, s.y + yy, 2, 2);
    // header: the mascot, the title, the timer
    const hy = L.head;
    this.drawCat(s.x + 14, hy + 11);
    text(x, 'ナンプレ', s.x + 27, hy + 1, 11, UI.title, { font: FONT.ui, outline: '#fff6e6' });
    rrect(x, s.x + 27, hy + 14, 34, 10, 3, '#8ad0a0'); text(x, 'かんたん', s.x + 44, hy + 14, 9, '#ffffff', { align: 'center', font: FONT.small });
    const sec = Math.floor(this.clock);
    rrect(x, s.x + s.w - 34, hy + 4, 30, 12, 4, '#ffffff');
    text(x, `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, s.x + s.w - 19, hy + 6, 7, '#8a5a3a', { align: 'center', font: FONT.tiny });
    // grid
    const { gx, gTop, cell, G } = L;
    rrect(x, gx - 3, gTop - 3, G + 6, G + 6, 4, UI.thick);
    px(x, '#ffffff', gx, gTop, G, G);
    const sel = this.sel, sv = sel >= 0 ? this.grid[sel] : 0;
    for (let i = 0; i < 36; i++) {
      const c = i % 6, r = Math.floor(i / 6);
      let X0 = gx + c * cell, Y0 = gTop + r * cell;
      let bg = boxOf(i) % 2 ? '#fffaf0' : '#fff1dc';
      if (sel >= 0 && (Math.floor(sel / 6) === r || sel % 6 === c || boxOf(sel) === boxOf(i))) bg = UI.hl;
      if (sv && this.grid[i] === sv) bg = UI.same;
      if (i === sel) bg = UI.sel;
      const sk = this.shake.get(i);
      if (sk) { bg = UI.bad; X0 += Math.round(Math.sin(sk * 60) * 2); }
      px(x, bg, X0 + 1, Y0 + 1, cell - 1, cell - 1);
      const fl = this.flash.get(i);
      const sp = this.sparkle.find((q) => q.i === i && q.t > 0);
      if (sp) px(x, `rgba(255,255,255,${0.8 - sp.t})`, X0 + 1, Y0 + 1, cell - 1, cell - 1);
      const v = this.grid[i];
      if (v) {
        const wob = this.won ? Math.round(Math.sin(this.winT * 9 - i * 0.35) * 2 * Math.max(0, 1 - this.winT / 2.5)) : 0;
        const col = this.given[i] ? UI.given : sk ? '#ffffff' : UI.mine;
        const size = cell >= 20 ? 14 : 11;
        text(x, String(v), X0 + cell / 2 + 0.5, Y0 + (cell - size) / 2 - 1 + wob - (fl ? Math.round(fl * 4) : 0), size, col, { align: 'center', font: this.given[i] ? FONT.bold : FONT.round });
      }
    }
    // lines: thin cells, thick boxes
    for (let k = 1; k < 6; k++) {
      px(x, k % 3 === 0 ? UI.thick : UI.line, gx + k * cell, gTop, 1, G);
      px(x, k % 2 === 0 ? UI.thick : UI.line, gx, gTop + k * cell, G, 1);
      if (k === 3) px(x, UI.thick, gx + k * cell - 1, gTop, 1, G);
      if (k % 2 === 0) px(x, UI.thick, gx, gTop + k * cell - 1, G, 1);
    }
    // number pad
    const bx0 = s.x + 5, by = L.padY, b = L.pad;
    for (let k = 0; k < 6; k++) {
      const used = this.grid.filter((v) => v === k + 1).length;
      const done = used >= 6;
      const press = this.thumb.press > 0 && Math.abs(this.thumb.tx - (bx0 + (k + 0.5) * b)) < 2 ? 1 : 0;
      rrect(x, bx0 + k * b + 1, by + 2, b - 2, b - 2, 5, '#d8a87a');
      rrect(x, bx0 + k * b + 1, by + press, b - 2, b - 2, 5, done ? '#e8e0d4' : PADS[k]);
      text(x, String(k + 1), bx0 + (k + 0.5) * b, by + (b - 14) / 2 + press, 12, done ? '#b8ac9c' : '#5a3a2a', { align: 'center', font: FONT.round });
    }
    rrect(x, s.x + s.w / 2 - 22, by + b + 4, 44, 13, 5, '#f0d8c0');
    text(x, 'けす', s.x + s.w / 2, by + b + 6, 9, '#8a5a3a', { align: 'center', font: FONT.small });
    // the win: a stamp, confetti, stars
    if (this.won) {
      const k = Math.min(1, this.winT / 0.35), sc = 1 + (1 - k) * 1.6;
      x.save();
      x.translate(s.x + s.w / 2, gTop + G / 2);
      x.rotate(-0.18 * k); x.scale(sc, sc);
      x.globalAlpha = Math.min(1, this.winT * 4);
      rrect(x, -44, -16, 88, 32, 8, '#e84a3a'); rrect(x, -41, -13, 82, 26, 6, '#fff6e6'); rrect(x, -39, -11, 78, 22, 5, '#e84a3a');
      text(x, 'クリア!', 0, -8, 16, '#ffffff', { align: 'center', font: FONT.pop });
      x.restore();
      for (const f of this.fx) px(x, f.c, f.x, f.y, 2 + (f.t * 10 % 2 > 1 ? 1 : 0), 2);
    }
  }
  drawCat(cx, cy) {
    const x = this.x, m = this.mood, t = this.t;
    const hop = m === 'win' ? -Math.abs(Math.sin(t * 9)) * 3 : m === 'happy' ? -Math.abs(Math.sin(t * 12)) * 2 : 0;
    cy += hop;
    poly(x, [[cx - 9, cy - 4], [cx - 4, cy - 7], [cx - 8, cy - 12]], '#f4a05a'); poly(x, [[cx + 9, cy - 4], [cx + 4, cy - 7], [cx + 8, cy - 12]], '#f4a05a');
    px(x, '#ffc8c8', cx - 7, cy - 8, 2, 2); px(x, '#ffc8c8', cx + 6, cy - 8, 2, 2);
    ell(x, cx, cy, 9, 7.5, '#f4a05a'); ell(x, cx, cy + 2, 7, 5, '#ffe2b8');
    px(x, '#d8783a', cx - 1, cy - 7, 2, 3); px(x, '#d8783a', cx - 4, cy - 6, 1, 2); px(x, '#d8783a', cx + 3, cy - 6, 1, 2);
    const blink = Math.floor(t * 0.6) % 6 === 0 && (t % 1.66) < 0.12;
    if (m === 'happy' || m === 'win') { px(x, '#3a2420', cx - 5, cy - 1, 3, 1); px(x, '#3a2420', cx - 4, cy - 2, 1, 1); px(x, '#3a2420', cx + 2, cy - 1, 3, 1); px(x, '#3a2420', cx + 3, cy - 2, 1, 1); }
    else if (blink) { px(x, '#3a2420', cx - 5, cy - 1, 3, 1); px(x, '#3a2420', cx + 2, cy - 1, 3, 1); }
    else { px(x, '#3a2420', cx - 4, cy - 2, 2, 3); px(x, '#3a2420', cx + 3, cy - 2, 2, 3); px(x, '#ffffff', cx - 4, cy - 2, 1, 1); px(x, '#ffffff', cx + 3, cy - 2, 1, 1); }
    px(x, '#ff8a9a', cx - 7, cy + 1, 2, 1); px(x, '#ff8a9a', cx + 6, cy + 1, 2, 1);
    if (m === 'oops') { px(x, '#3a2420', cx - 1, cy + 3, 3, 1); px(x, '#6ab0ff', cx + 8, cy - 6, 2, 3); }
    else { px(x, '#3a2420', cx - 2, cy + 2, 1, 1); px(x, '#3a2420', cx + 1, cy + 2, 1, 1); px(x, '#3a2420', cx - 1, cy + 3, 2, 1); }
  }
}
