// Tileable pixel-art material textures, painted in code at 64 texels/metre.
//   const t = tex('woodFloor', { base: '#a8743e' })   // cached THREE texture
//   const p = paint('tatami')                          // raw PixCanvas
import { PixCanvas, ramp, mix, darken, lighten, makeTexture, cached, bayer } from '../core/pixtex.js';
import { hash2, fbm2, mulberry32, clamp } from '../core/util.js';

const P = {};

// ---------------------------------------------------------------- wood
P.woodFloor = ({ base = '#b07a44', plank = 12, w = 128, h = 128, gap = '#3e2618', worn = 0.4, seed = 3 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 6, { spread: 0.22 });
  const rows = Math.round(h / plank);
  const rnd = mulberry32(seed);
  for (let r = 0; r < rows; r++) {
    const y0 = r * plank;
    const tone = Math.floor(rnd() * 3); // per-plank tone
    const off = Math.floor(rnd() * w);
    const len = 48 + Math.floor(rnd() * 3) * 16;
    for (let y = y0; y < y0 + plank; y++) for (let x = 0; x < w; x++) {
      const gx = (x + off) % w;
      // grain: wavy lines along the plank
      const g = Math.sin((gx * 0.09) + Math.sin(gx * 0.021 + r) * 2.2 + (y - y0) * 1.7 + r * 3.1);
      let i = 2 + (tone - 1) * 0.6;
      if (g > 0.82) i -= 1;
      else if (g < -0.9) i += 0.8;
      if (y === y0 + 1) i += 0.8;
      if (y === y0 + plank - 2) i -= 0.6;
      i += (bayer(x, y) - 0.5) * 0.6;
      p.px(x, y, R[clamp(Math.round(i), 0, 5)]);
    }
    // plank seams + butt joints
    p.hline(0, w - 1, y0, gap);
    for (let x = (off % len); x < w; x += len) { p.vline(x, y0, y0 + plank - 1, gap); p.px(x + 2, y0 + 3, darken(R[1], 0.3)); p.px(x + 2, y0 + plank - 4, darken(R[1], 0.3)); }
    // knots
    if (rnd() < 0.5) { const kx = Math.floor(rnd() * w), ky = y0 + 3 + Math.floor(rnd() * (plank - 6)); p.ellipse(kx, ky, 2.5, 1.5, R[0]); p.px(kx, ky, darken(R[0], 0.3)); }
  }
  // wear: lighter scuffs in the middle of planks
  if (worn) p.scatter(0, 0, w, h, lighten(R[3], 0.1), (x, y) => clamp((fbm2(x * 0.05, y * 0.12, seed + 9) - 0.55) * 4, 0, 1) * worn * 0.35);
  return p;
};
P.woodPanel = ({ base = '#8a5a34', w = 64, h = 64, vertical = true, board = 10, seed = 5 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.2 });
  const rnd = mulberry32(seed);
  const n = Math.round((vertical ? w : h) / board);
  for (let b = 0; b < n; b++) {
    const tone = Math.floor(rnd() * 3) - 1;
    for (let a = b * board; a < (b + 1) * board; a++) for (let c = 0; c < (vertical ? h : w); c++) {
      const x = vertical ? a : c, y = vertical ? c : a;
      const g = Math.sin(c * 0.11 + Math.sin(c * 0.03 + b * 2) * 2 + (a - b * board) * 1.3);
      let i = 2 + tone * 0.6 + (g > 0.85 ? -1 : 0) + (bayer(x, y) - 0.5) * 0.5;
      if (a === b * board) i = 0;
      if (a === b * board + 1) i += 1;
      p.px(x, y, R[clamp(Math.round(i), 0, 4)]);
    }
  }
  return p;
};
// overlapping horizontal clapboards (old shop facades)
P.siding = ({ base = '#6a4a32', board = 10, w = 64, h = 64, weather = 0.5, seed = 7 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.24 });
  for (let y = 0; y < h; y++) {
    const k = y % board;
    for (let x = 0; x < w; x++) {
      let i = 2;
      if (k === 0) i = 0; else if (k === 1) i = 1; else if (k === board - 1) i = 3;
      const g = Math.sin(x * 0.13 + Math.floor(y / board) * 1.7 + Math.sin(x * 0.04) * 2);
      if (g > 0.9 && k > 1) i -= 1;
      if (weather && fbm2(x * 0.05, y * 0.08, seed) > 0.6 && k > 1) i += 1;
      p.px(x, y, R[clamp(i, 0, 4)]);
    }
  }
  return p;
};
P.yakisugi = ({ w = 64, h = 64, seed = 8 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ['#16141a', '#1e1c24', '#26242e', '#302e3a', '#3c3a48'];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const k = x % 12;
    const scale = Math.sin(y * 0.6 + Math.floor(x / 12) * 3) * Math.sin(x * 1.3);
    let i = 2 + (scale > 0.5 ? 1 : scale < -0.6 ? -1 : 0);
    if (k === 0) i = 0;
    p.px(x, y, R[clamp(i, 0, 4)]);
  }
  return p;
};

// ---------------------------------------------------------------- floors
P.tatami = ({ base = '#c8b878', border = '#2a3a2a', w = 64, h = 128, borderW = 5, aged = 0.3, seed = 9 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.16 });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // rush weave: rows of tiny lozenges
    const row = y % 3;
    let i = row === 0 ? 1 : 2;
    if ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 && row !== 0) i = 3;
    if (aged && fbm2(x * 0.04, y * 0.03, seed) > 0.58) i -= 1;
    p.px(x, y, R[clamp(i, 0, 4)]);
  }
  // heri (cloth border) along the long edges
  for (const x0 of [0, w - borderW]) {
    p.rect(x0, 0, borderW, h, border);
    for (let y = 1; y < h; y += 4) p.px(x0 + 2, y, lighten(border, 0.25));
    p.vline(x0 + (x0 ? 0 : borderW - 1), 0, h - 1, darken(border, 0.3));
  }
  p.hline(0, w - 1, 0, darken(R[1], 0.2));
  return p;
};
P.tile = ({ base = '#e8e4d8', grout = '#a8a498', size = 16, w = 64, h = 64, chip = 0.1, seed = 10 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 4, { spread: 0.1 });
  p.fill(R[2]);
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
    p.rect(x + 1, y + 1, size - 2, 1, R[3]); p.rect(x + 1, y + 1, 1, size - 2, R[3]);
    p.rect(x + 1, y + size - 2, size - 2, 1, R[1]);
    if (hash2(x, y, seed) < chip) p.px(x + 2 + Math.floor(hash2(y, x, 3) * (size - 4)), y + 3, R[0]);
    p.hline(x, x + size - 1, y, grout); p.vline(x, y, y + size - 1, grout);
  }
  return p;
};
P.checker = ({ a = '#f2ece0', b = '#d8443a', size = 16, w = 64, h = 64 } = {}) => {
  const p = new PixCanvas(w, h, 11);
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
    const c = ((x + y) / size) % 2 ? b : a;
    p.rect(x, y, size, size, c);
    p.hline(x, x + size - 1, y, lighten(c, 0.1));
    p.hline(x, x + size - 1, y + size - 1, darken(c, 0.12));
  }
  p.speckle(40, ['#00000018']);
  return p;
};
P.terrazzo = ({ base = '#cfc8bc', chips = ['#8a8a8a', '#f4f0e8', '#a87a5a', '#6a7a8a', '#3a3a3a'], w = 64, h = 64, seed = 12 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.noiseFill(ramp(base, 3, { spread: 0.06 }), { scale: 0.08 });
  const rnd = mulberry32(seed);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), c = chips[Math.floor(rnd() * chips.length)];
    if (rnd() < 0.25) p.rect(x, y, 2, 2, c); else p.px(x, y, c);
  }
  return p;
};
// shotengai pavers: coloured interlocking bricks in a pattern band
P.pavers = ({ a = '#b89a8a', b = '#8a7a74', c = '#c8b8a0', w = 128, h = 128, bw = 16, bh = 8, seed = 13 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const grout = darken(b, 0.35);
  p.fill(grout);
  for (let y = 0; y < h; y += bh) {
    const off = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const bx = x + off;
      const band = (Math.floor(y / bh) % 8 === 3 || Math.floor(y / bh) % 8 === 4) ? c : (hash2(bx, y, seed) < 0.5 ? a : b);
      const R = ramp(band, 4, { spread: 0.1 });
      for (let j = 1; j < bh; j++) for (let i = 1; i < bw; i++) {
        const X = ((bx + i) % w + w) % w, Y = y + j;
        let k = 2;
        if (j === 1 || i === 1) k = 3;
        if (j === bh - 1 || i === bw - 1) k = 1;
        if (hash2(X, Y, seed + 1) < 0.04) k = 0;
        p.px(X, Y, R[k]);
      }
    }
  }
  return p;
};
P.asphalt = ({ base = '#4a4a52', w = 128, h = 128, cracks = 3, patches = 2, seed = 14 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.12 });
  p.noiseFill(R, { scale: 0.12, contrast: 0.9, octaves: 3 });
  p.speckle(500, [R[4], R[0], lighten(R[4], 0.2)]);
  const rnd = mulberry32(seed);
  for (let k = 0; k < patches; k++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), pw = 20 + Math.floor(rnd() * 30), ph = 12 + Math.floor(rnd() * 20);
    p.rect(x, y, pw, ph, darken(R[1], 0.1)); p.frame(x, y, pw, ph, R[0]);
  }
  for (let k = 0; k < cracks; k++) {
    let x = rnd() * w, y = rnd() * h, a = rnd() * 6.28;
    for (let s = 0; s < 40; s++) { p.px(x, y, R[0]); a += (rnd() - 0.5) * 0.9; x = (x + Math.cos(a) + w) % w; y = (y + Math.sin(a) + h) % h; }
  }
  return p;
};
P.concrete = ({ base = '#a8a49c', w = 64, h = 64, seams = 32, stains = 0.4, seed = 15 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.1 });
  p.noiseFill(R, { scale: 0.1, contrast: 0.7 });
  p.speckle(200, [R[0], R[4]]);
  if (seams) { for (let x = 0; x < w; x += seams) p.vline(x, 0, h - 1, R[0]); for (let y = 0; y < h; y += seams) p.hline(0, w - 1, y, R[0]); }
  if (stains) p.scatter(0, 0, w, h, darken(R[1], 0.12), (x, y) => clamp((fbm2(x * 0.05, y * 0.03, seed + 3) - 0.52) * 4, 0, 1) * stains * 0.7);
  return p;
};
P.plaster = ({ base = '#e8dcc4', w = 64, h = 64, stains = 0.4, cracks = 1, seed = 16 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.08 });
  p.noiseFill(R, { scale: 0.09, contrast: 0.6, bias: 0.05 });
  if (stains) p.scatter(0, 0, w, h, mix(R[1], '#8a7a5a', 0.25), (x, y) => clamp((fbm2(x * 0.04, y * 0.07, seed) - 0.55) * 3.5, 0, 1) * stains * 0.8);
  const rnd = mulberry32(seed);
  for (let k = 0; k < cracks; k++) {
    let x = rnd() * w, y = rnd() * h * 0.5;
    for (let s = 0; s < 18; s++) { p.px(x, y, R[0]); x += rnd() - 0.4; y += 0.8 + rnd() * 0.5; }
  }
  return p;
};
P.brick = ({ base = '#a85a44', mortar = '#d8ccb8', w = 64, h = 64, bw = 16, bh = 6, seed = 17 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.fill(mortar);
  for (let y = 0; y < h; y += bh) {
    const off = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w; x += bw) {
      const R = ramp(mix(base, hash2(x, y, seed) < 0.3 ? '#5a3a30' : base, 0.3), 4, { spread: 0.12 });
      for (let j = 0; j < bh - 1; j++) for (let i = 0; i < bw - 1; i++) {
        const X = ((x + off + i) % w + w) % w;
        p.px(X, y + j, R[j === 0 ? 3 : j === bh - 2 ? 1 : 2]);
      }
    }
  }
  return p;
};
// roof tiles (kawara): rows of S-curved tiles, eaves down
P.kawara = ({ base = '#5a6274', w = 64, h = 64, tw = 8, th = 10, moss = 0.1, seed = 18 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 6, { spread: 0.26 });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x % tw) / tw, v = (y % th) / th;
    const curve = Math.sin(u * Math.PI);
    let i = 1 + Math.round(curve * 3);
    if (v > 0.82) i = 0; // shadow under the next row
    if (v < 0.12) i = Math.min(5, i + 1);
    if (moss && fbm2(x * 0.08, y * 0.08, seed) > 0.68 && v > 0.5) { p.px(x, y, (x + y) % 2 ? '#6a8a4a' : '#5a7a3a'); continue; }
    p.px(x, y, R[clamp(i, 0, 5)]);
  }
  return p;
};
P.metalSheet = ({ base = '#8a9098', w = 64, h = 64, rust = 0.4, seed = 19 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.18 });
  for (let x = 0; x < w; x++) {
    const k = Math.round(2 + Math.sin(x / 4 * Math.PI) * 1.6);
    for (let y = 0; y < h; y++) p.px(x, y, R[clamp(k, 0, 4)]);
  }
  if (rust) p.scatter(0, 0, w, h, '#a8582a', (x, y) => clamp((fbm2(x * 0.06, y * 0.02, seed) - 0.55) * 4, 0, 1) * rust * (0.3 + y / h));
  return p;
};
// rolling shutter: horizontal slats
P.shutter = ({ base = '#9aa0a6', w = 64, h = 64, slat = 4, rust = 0.3, seed = 20 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.18 });
  for (let y = 0; y < h; y++) {
    const k = y % slat;
    const i = k === 0 ? 0 : k === 1 ? 4 : k === slat - 1 ? 1 : 3;
    p.hline(0, w - 1, y, R[i]);
  }
  if (rust) p.scatter(0, 0, w, h, '#9a5a34', (x, y) => clamp((fbm2(x * 0.03, y * 0.09, seed) - 0.52) * 4, 0, 1) * rust);
  return p;
};
P.cardboard = ({ base = '#c8945a', w = 64, h = 64, tape = '#d8c890', label = null, seed = 21 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 4, { spread: 0.1 });
  p.noiseFill(R, { scale: 0.2, contrast: 0.5, bias: 0.05 });
  for (let x = 0; x < w; x += 3) p.vline(x, 0, h - 1, mix(R[2], R[1], 0.4));
  p.rect(0, Math.floor(h / 2) - 3, w, 6, tape);
  p.hline(0, w - 1, Math.floor(h / 2) - 3, lighten(tape, 0.2));
  if (label) { p.rect(6, 6, 22, 12, '#f4f0e4'); p.text(label, 8, 7, { font: '8px Galmuri7', color: '#2a2a3a' }); }
  p.frame(0, 0, w, h, R[0]);
  return p;
};
P.shoji = ({ paper = '#f4efe2', frame = '#8a6038', w = 64, h = 64, cells = [4, 6], glow = false } = {}) => {
  const p = new PixCanvas(w, h, 22);
  p.fill(paper);
  p.dither(0, 0, w, h, darken(paper, 0.06), (x, y) => (hash2(x, y, 5) > 0.85 ? 1 : 0));
  const [cx, cy] = cells;
  for (let i = 0; i <= cx; i++) p.vline(Math.min(w - 1, Math.round(i * w / cx)), 0, h - 1, frame);
  for (let j = 0; j <= cy; j++) p.hline(0, w - 1, Math.min(h - 1, Math.round(j * h / cy)), frame);
  p.frame(0, 0, w, h, darken(frame, 0.3), 2);
  return p;
};

// ---------------------------------------------------------------- nature
P.grass = ({ base = '#6aa84a', w = 128, h = 128, flowers = 0.6, clover = 0.5, seed = 23, lush = 1 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 6, { spread: 0.24, hueShift: 0.1 });
  // painterly patches
  p.noiseFill([R[1], R[2], R[3], R[2]], { scale: 0.045, contrast: 1.3 });
  // blade strokes: little 1x2 / 1x3 ticks in light and dark
  const rnd = mulberry32(seed);
  for (let i = 0; i < 1400 * lush; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    const lt = rnd() < 0.55;
    const c = lt ? R[4] : R[0];
    p.px(x, y, c); p.px(x, (y + 1) % h, lt ? R[3] : R[1]);
    if (rnd() < 0.3) p.px((x + 1) % w, (y + h - 1) % h, c);
  }
  if (clover) for (let i = 0; i < 26 * clover; i++) {
    const x = Math.floor(rnd() * (w - 4)), y = Math.floor(rnd() * (h - 4));
    p.stamp(['.c.', 'cCc', '.c.'], { c: R[4], C: R[5] }, x, y);
  }
  if (flowers) for (let i = 0; i < 40 * flowers; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    const col = ['#fff4f0', '#ffe070', '#ffb0c8', '#c8b0ff'][Math.floor(rnd() * 4)];
    p.px(x, y, col); if (rnd() < 0.4) p.px((x + 1) % w, y, mix(col, R[3], 0.4));
  }
  return p;
};
P.dirt = ({ base = '#a87a50', w = 64, h = 64, pebbles = 1, seed = 24 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.18 });
  p.noiseFill(R, { scale: 0.08, contrast: 0.9 });
  const rnd = mulberry32(seed);
  for (let i = 0; i < 30 * pebbles; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    p.px(x, y, R[4]); p.px(x + 1, y, R[3]); p.px(x, y + 1, R[0]);
  }
  return p;
};
P.stone = ({ base = '#9a948c', w = 64, h = 64, seed = 25 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.2 });
  p.noiseFill(R, { scale: 0.12, contrast: 1.1 });
  p.speckle(120, [R[0], R[4]]);
  return p;
};
P.cobble = ({ base = '#8a8478', w = 64, h = 64, seed = 26, moss = 0.3 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.22 });
  p.fill(darken(R[0], 0.2));
  const rnd = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < 26; i++) pts.push([rnd() * w, rnd() * h]);
  // voronoi stones
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (let k = 0; k < pts.length; k++) {
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const d = (x - pts[k][0] - ox) ** 2 + (y - pts[k][1] - oy) ** 2;
        if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
      }
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1);
    if (edge < 1.2) continue;
    const t = hash2(best, 1, seed);
    let i = 2 + (t < 0.33 ? -1 : t > 0.66 ? 1 : 0) + (edge < 2.5 ? -1 : 0);
    if (moss && edge < 2.2 && fbm2(x * 0.1, y * 0.1, seed) > 0.55) { p.px(x, y, '#5a8a3a'); continue; }
    p.px(x, y, R[clamp(i, 0, 4)]);
  }
  return p;
};
P.moss = ({ base = '#5a8a3a', w = 64, h = 64, seed = 27 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.noiseFill(ramp(base, 5, { spread: 0.22 }), { scale: 0.15, contrast: 1.2 });
  return p;
};
P.sand = ({ base = '#e8d4a0', w = 64, h = 64, seed = 28 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.noiseFill(ramp(base, 4, { spread: 0.1 }), { scale: 0.1 });
  p.speckle(120, [darken(base, 0.2), lighten(base, 0.2)]);
  return p;
};
P.thatch = ({ base = '#b8944a', w = 64, h = 64, seed = 29 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.24 });
  const rnd = mulberry32(seed);
  p.fill(R[1]);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), L = 3 + Math.floor(rnd() * 6);
    p.vline(x, y, Math.min(h - 1, y + L), R[2 + Math.floor(rnd() * 3)]);
  }
  for (let y = 0; y < h; y += 10) p.hline(0, w - 1, y, R[0]);
  return p;
};
P.bamboo = ({ base = '#8ab04a', w = 64, h = 64, seed = 30 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  const R = ramp(base, 5, { spread: 0.2 });
  for (let x = 0; x < w; x++) {
    const k = x % 8;
    const i = k === 0 ? 0 : k === 1 ? 3 : k === 2 ? 4 : k === 7 ? 1 : 2;
    p.vline(x, 0, h - 1, R[i]);
  }
  for (let x = 0; x < w; x += 8) { const ny = (x * 7) % h; p.hline(x, x + 7, ny, R[0]); p.hline(x, x + 7, ny + 1, R[4]); }
  return p;
};
P.water = ({ base = '#3a8aa8', w = 64, h = 64, seed = 31 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.noiseFill(ramp(base, 4, { spread: 0.12 }), { scale: 0.1 });
  return p;
};
// plain painted colour with faint noise (fallback / painted surfaces)
P.paint = ({ base = '#c8c0b0', w = 32, h = 32, amt = 0.05, seed = 32 } = {}) => {
  const p = new PixCanvas(w, h, seed);
  p.noiseFill(ramp(base, 3, { spread: amt }), { scale: 0.15, contrast: 0.6 });
  return p;
};

export function paint(name, opts = {}) {
  const f = P[name];
  if (!f) throw new Error('no texture ' + name);
  return f(opts);
}
export function tex(name, opts = {}) {
  return cached('tex:' + name + JSON.stringify(opts), () => makeTexture(paint(name, opts).c, { repeat: true, mips: true }));
}
export const TEXTURES = P;
