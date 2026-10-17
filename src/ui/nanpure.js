// "Nanpure" — the little sudoku app on Mamo's phone, painted in pixels onto
// the phone's screen canvas (which the 3D phone shows as its screen). A lock
// screen with no notifications, then a 6x6 puzzle with a cat mascot, a
// number pad, sparkles for finished rows, a stamp and confetti for the win.
//   const app = new Nanpure(game, 126, 236); app.start(seed);
//   app.tap(x, y)  (screen canvas pixels)   app.update(dt); app.draw();
//   app.thumb -> { tx, ty, press, rest }  where the thumb should go
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

export class Nanpure {
  constructor(game, W = 126, H = 236) {
    this.game = game; this.W = W; this.H = H;
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    this.x = this.cv.getContext('2d');
    this.t = 0;
  }
  start(seed = 7, givens = 16) {
    this.puz = makeSudoku(seed, givens);
    this.grid = this.puz.grid.slice();
    this.given = this.grid.map((v) => v > 0);
    this.sel = this.grid.findIndex((v) => !v);
    this.fx = []; this.flash = new Map(); this.shake = new Map(); this.sparkle = [];
    this.mood = 'idle'; this.moodT = 0;
    this.screen = 'lock'; this.screenT = 0;
    this.t = 0; this.clock = 0; this.thumb = { tx: 0, ty: 0, press: 0, rest: true, restT: 0 };
    this.won = false; this.winT = 0; this.done = false; this.autoT = 0;
    this.lockHold = 1.8; this.photo = null;
  }
  // show a photo full-screen (Dad, at the river)
  showPhoto(src, caption) {
    const img = new Image(); img.src = src;
    this.photo = { img, caption }; this.screen = 'photo'; this.screenT = 0;
  }
  openApp() { if (this.screen !== 'lock') return; this.screen = 'opening'; this.screenT = 0; this.moveThumb(this.W * 0.8, this.H * 0.68); this.game.audio?.play?.('phoneTap', { volume: 0.4 }); }
  get L() {
    const W = this.W, H = this.H;
    const s = { x: 0, y: 0, w: W, h: H };
    const head = 10, gTop = head + 27;
    const cell = Math.floor((W - 8) / 6), G = cell * 6;
    const gx = Math.round((W - G) / 2);
    const padY = gTop + G + 8, pad = Math.floor((W - 8) / 6);
    return { W, H, s, head, gTop, gx, cell, G, padY, pad };
  }
  tap(X, Y) {
    if (this.won) return;
    const L = this.L;
    if (this.screen === 'photo') return;
    if (this.screen === 'lock') { if (this.screenT > 0.6) this.openApp(); return; }
    if (this.screen !== 'app') return;
    if (X >= L.gx && X < L.gx + L.G && Y >= L.gTop && Y < L.gTop + L.G) {
      const c = Math.floor((X - L.gx) / L.cell), rr = Math.floor((Y - L.gTop) / L.cell);
      this.select(rr * 6 + c);
      return;
    }
    const bx0 = 4;
    if (Y >= L.padY - 2 && Y < L.padY + L.pad + 2) { const k = Math.floor((X - bx0) / L.pad); if (k >= 0 && k < 6) this.place(k + 1); return; }
    if (Y >= L.padY + L.pad + 3 && Y < L.padY + L.pad + 19) this.erase();
  }
  select(i) {
    this.sel = i; this.game.audio?.play?.('phoneTap', { volume: 0.25 });
    const L = this.L; this.moveThumb(L.gx + (i % 6 + 0.5) * L.cell, L.gTop + (Math.floor(i / 6) + 0.5) * L.cell);
  }
  erase() { const i = this.sel; if (i >= 0 && !this.given[i]) this.grid[i] = 0; this.moveThumb(this.W / 2, this.L.padY + this.L.pad + 10); this.game.audio?.play?.('phoneTap', { volume: 0.2 }); }
  moveThumb(x, y) { const T = this.thumb; T.tx = x; T.ty = y; T.press = 0.2; T.rest = false; T.restT = 1.3; }
  place(v) {
    const i = this.sel;
    const L = this.L;
    this.moveThumb(4 + (v - 0.5) * L.pad, L.padY + L.pad / 2);
    if (i < 0 || this.given[i]) return;
    const A = this.game.audio;
    if (this.puz.solution[i] === v) {
      this.grid[i] = v;
      this.flash.set(i, 0.5);
      this.mood = 'happy'; this.moodT = 1.0;
      A?.play?.('coin', { volume: 0.22, pitch: 1.6 + v * 0.06 });
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
    for (let k = 0; k < 60; k++) this.fx.push({ x: L.W / 2, y: L.gTop + L.G / 2, vx: (Math.random() - 0.5) * 120, vy: -50 - Math.random() * 100, c: PADS[k % 6], t: 0, life: 1.6 + Math.random() });
  }
  update(dt) {
    this.t += dt; this.clock += dt; this.screenT += dt; this.moodT -= dt;
    if (this.moodT < 0 && !this.won) this.mood = 'idle';
    for (const [k, v] of this.flash) { if (v - dt <= 0) this.flash.delete(k); else this.flash.set(k, v - dt); }
    for (const [k, v] of this.shake) { if (v - dt <= 0) this.shake.delete(k); else this.shake.set(k, v - dt); }
    this.sparkle = this.sparkle.filter((s) => (s.t += dt) < 0.7);
    for (const f of this.fx) { f.t += dt; f.vy += 150 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.99; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    const T = this.thumb;
    if (!T.rest) { T.restT -= dt; if (T.restT < 0) T.rest = true; }
    T.press = Math.max(0, T.press - dt);
    if (this.screen === 'opening' && this.screenT > 0.45) { this.screen = 'app'; this.screenT = 0; }
    if (this.won) { this.winT += dt; if (this.winT > 3.2) this.done = true; }
    if (this.game.autoPlay && this.screen === 'app' && !this.won) {
      this.autoT += dt;
      if (this.autoT > 0.3) { this.autoT = 0; const i = this.grid.findIndex((v) => !v); if (i >= 0) { this.sel = i; this.place(this.puz.solution[i]); } }
    }
    if (this.game.autoPlay && this.screen === 'lock' && this.screenT > this.lockHold) this.openApp();
  }
  draw() {
    const x = this.x;
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, this.W, this.H);
    this.drawScreen(this.L);
  }
  drawScreen(L, glowOnly = false) {
    const x = this.x, s = L.s;
    x.save();
    x.beginPath(); x.rect(s.x, s.y, s.w, s.h); x.clip();
    if (this.screen === 'photo') this.drawPhoto(L);
    else if (this.screen === 'lock' || (this.screen === 'opening' && this.screenT < 0.2)) this.drawLock(L);
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
  drawPhoto(L) {
    const x = this.x, s = L.s, P = this.photo;
    px(x, '#16141c', s.x, s.y, s.w, s.h);
    text(x, '写真 · 夏', s.x + s.w / 2, s.y + 12, 9, '#c8c0d8', { align: 'center', font: FONT.small });
    if (P.img.complete && P.img.naturalWidth) {
      const w = s.w - 8, h = Math.round(w * P.img.naturalHeight / P.img.naturalWidth);
      x.drawImage(P.img, s.x + 4, s.y + 30, w, h);
      if (P.caption) {
        const words = P.caption.split(' '); let line = '', y = s.y + 36 + h;
        for (const wd of words) { const t2 = line ? line + ' ' + wd : wd; if (glyph(t2, 9, '#e8e0f0', FONT.small).w > s.w - 12) { text(x, line, s.x + 6, y, 9, '#e8e0f0', { font: FONT.small }); line = wd; y += 11; } else line = t2; }
        if (line) text(x, line, s.x + 6, y, 9, '#e8e0f0', { font: FONT.small });
      }
    }
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
    const bx0 = 4, by = L.padY, b = L.pad;
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
    cx = Math.round(cx); cy = Math.round(cy);
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
