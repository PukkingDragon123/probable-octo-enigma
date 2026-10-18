// Scenery painting core: a pixel "brush" that writes straight into one column
// range of a ring-buffer DataTexture, using absolute texel x so things that
// straddle two chunks are painted half and half without seams.
//
// Alpha is a material code the scenery shader reads:
//   255  solid
//   252  water: rgb = (reflection height 0..1, glint 0..1, murk 0..1)
//   248  window: rgb = the colour it glows at night (dark glass by day)
//   244  emissive: lanterns, neon, vending machines (always glow)
//   240  cloud: rgb = (light 0..1, rim 0..1, -)
//     0  empty
import { natureCanvas } from '../nature/natureArt.js';

export const SOLID = 255, WATER = 252, WIN = 248, EMIT = 244, CLOUD = 240;

const PK = new Map();
// '#rrggbb' -> packed little-endian RGBA uint32
export function pk(hex, a = 255) {
  const k = hex + a;
  let v = PK.get(k);
  if (v !== undefined) return v;
  const n = parseInt(hex.slice(1), 16);
  v = ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  PK.set(k, v);
  return v;
}
export const rgba = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
// water texel: reflection height (0 = horizon colour, 1 = zenith), glint, murk
export const water = (refl, glint = 0, murk = 0.2) => rgba(Math.round(refl * 255), Math.round(glint * 255), Math.round(murk * 255), WATER);
export const cloudPx = (light, rim = 0) => rgba(Math.round(light * 255), Math.round(rim * 255), 0, CLOUD);
export const win = (hex) => pk(hex, WIN);
export const emit = (hex) => pk(hex, EMIT);

// ---------------------------------------------------------------- hashing / noise
export function h1(i, s = 0) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export const h2 = (x, y, s = 0) => h1((x | 0) * 73856093 ^ (y | 0) * 19349663, s);
const sm = (t) => t * t * (3 - 2 * t);
export function n1(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  return h1(i, s) + (h1(i + 1, s) - h1(i, s)) * sm(f);
}
export function fbm1(x, s = 0, oct = 3) {
  let a = 0, w = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { a += n1(x * f, s + o * 17) * w; n += w; w *= 0.5; f *= 2.03; }
  return a / n;
}
export function n2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => B4[((y & 3) << 2) | (x & 3)];
// pick from a ramp with ordered dithering between steps (v in 0..1)
export function rampPick(R, v, x, y) {
  const f = Math.max(0, Math.min(0.9999, v)) * (R.length - 1);
  const i = Math.floor(f);
  return R[Math.min(R.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))];
}
export const pks = (arr, a = 255) => arr.map((c) => pk(c, a));

// ---------------------------------------------------------------- the brush
// Every write also stamps the current object (B.obj) into an id buffer, so a
// later ink pass can draw the bold dark outlines round each house, tree and
// pole: ids are stable per object (straddling chunks get the same id), and a
// running depth number says which of two touching objects is in front.
export const SOFT = 0x8000; // obj flag: outline in a dark shade of its own colour, not black
export const NOINK = 0x4000; // obj flag: no outline of its own (thin things: pylons, wires)
export class Brush {
  constructor(data, W, H) {
    this.d = new Uint32Array(data.buffer);
    this.ids = new Uint16Array(W * H);
    this.dep = new Uint16Array(W * H);
    this.W = W; this.H = H;
    this.ox = 0; this.c0 = 0; this.cw = 0;
    this.cur = 0; this.curD = 0; this.seq = 0;
  }
  // paint absolute columns [ox, ox + cw) into ring columns [c0, c0 + cw)
  begin(ox, c0, cw) {
    this.ox = ox; this.c0 = c0; this.cw = cw; this.cur = 0; this.curD = 0;
    for (let y = 0; y < this.H; y++) { const a = y * this.W + c0; this.d.fill(0, a, a + cw); this.ids.fill(0, a, a + cw); }
  }
  // start a new object (key: any number, the same for the same object in every chunk); null = ground
  obj(key, soft = false) {
    if (key == null) { this.cur = 0; this.curD = 0; return; }
    this.cur = ((Math.floor(h1(Math.floor(key * 997) | 0, 0x51ab) * 0x3ffe) + 1) | (soft === 'none' ? NOINK : soft ? SOFT : 0));
    this.curD = (++this.seq) & 0xffff;
  }
  get x0() { return this.ox; }
  get x1() { return this.ox + this.cw; }
  set(X, y, c) {
    const cx = (X | 0) - this.ox; y |= 0;
    if (cx < 0 || cx >= this.cw || y < 0 || y >= this.H) return;
    const i = y * this.W + this.c0 + cx;
    this.d[i] = c; this.ids[i] = this.cur; this.dep[i] = this.curD;
  }
  get(X, y) {
    const cx = (X | 0) - this.ox; y |= 0;
    if (cx < 0 || cx >= this.cw || y < 0 || y >= this.H) return 0;
    return this.d[y * this.W + this.c0 + cx];
  }
  rect(X, y, w, h, c) {
    X = Math.round(X); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    let a = Math.max(X, this.ox), b = Math.min(X + w, this.ox + this.cw);
    const ya = Math.max(0, y), yb = Math.min(this.H, y + h);
    if (a >= b || ya >= yb) return;
    a = a - this.ox + this.c0; b = b - this.ox + this.c0;
    for (let yy = ya; yy < yb; yy++) { const r = yy * this.W; this.d.fill(c, r + a, r + b); this.ids.fill(this.cur, r + a, r + b); this.dep.fill(this.curD, r + a, r + b); }
  }
  hline(X0, X1, y, c) { this.rect(Math.min(X0, X1), y, Math.abs(X1 - X0) + 1, 1, c); }
  vline(X, y0, y1, c) { this.rect(X, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, c); }
  // vertical span with a function per pixel: fn(X, y) -> colour | 0 (skip)
  col(X, y0, y1, fn) {
    X |= 0; const cx = X - this.ox;
    if (cx < 0 || cx >= this.cw) return;
    const a = Math.max(0, Math.ceil(y0)), b = Math.min(this.H - 1, Math.floor(y1));
    const base = this.c0 + cx;
    for (let y = a; y <= b; y++) { const c = fn(X, y); if (c) { const i = y * this.W + base; this.d[i] = c; this.ids[i] = this.cur; this.dep[i] = this.curD; } }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let i = 0; i < 4000; i++) {
      this.set(x0, y0, typeof c === 'function' ? c(x0, y0) : c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // filled ellipse; c may be fn(X, y, nx, ny) for shading
  ellipse(cx, cy, rx, ry, c) {
    if (cx + rx < this.ox - 1 || cx - rx > this.ox + this.cw + 1) return;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const ny = (y + 0.5 - cy) / ry;
      if (ny * ny > 1) continue;
      const hw = rx * Math.sqrt(1 - ny * ny);
      const xa = Math.round(cx - hw), xb = Math.round(cx + hw) - 1;
      if (typeof c !== 'function') { this.rect(xa, y, xb - xa + 1, 1, c); continue; }
      for (let x = Math.max(xa, this.ox); x <= Math.min(xb, this.ox + this.cw - 1); x++) {
        const v = c(x, y, (x + 0.5 - cx) / rx, ny);
        if (v) this.set(x, y, v);
      }
    }
  }
  // polygon fill (even-odd scanline); c may be fn(X, y)
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const [x, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (maxX < this.ox || minX > this.ox + this.cw) return;
    const n = pts.length;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]) - 1;
        if (typeof c !== 'function') this.rect(xa, y, xb - xa + 1, 1, c);
        else for (let x = Math.max(xa, this.ox); x <= Math.min(xb, this.ox + this.cw - 1); x++) { const v = c(x, y); if (v) this.set(x, y, v); }
      }
    }
  }
  // ordered-dither a rect with colour c at density k (0..1)
  dither(X, y, w, h, c, k) {
    const a = Math.max(Math.round(X), this.ox), b = Math.min(Math.round(X + w), this.ox + this.cw);
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(this.H, Math.round(y + h)); yy++) for (let x = a; x < b; x++) if (bayer(x, yy) < k) this.set(x, yy, c);
  }
  // blit a sprite (Uint32 pixels, alpha < 128 skipped); flip = mirror x
  blit(S, X, y, { flip = false, tint = null, dark = 0 } = {}) {
    X = Math.round(X); y = Math.round(y);
    if (X + S.w < this.ox || X > this.ox + this.cw) return;
    for (let sy = 0; sy < S.h; sy++) {
      const yy = y + sy;
      if (yy < 0 || yy >= this.H) continue;
      for (let sx = 0; sx < S.w; sx++) {
        const c = S.px[sy * S.w + (flip ? S.w - 1 - sx : sx)];
        if ((c >>> 24) < 128) continue;
        this.set(X + sx, yy, dark ? darkenPacked(c, dark) : tint ? tint(c) : (c | 0xff000000) >>> 0);
      }
    }
  }
  // run fn for each slot (spacing sp) whose object (half-width up to reach) may touch this chunk
  slots(sp, reach, seed, fn) {
    const a = Math.floor((this.ox - reach) / sp), b = Math.floor((this.ox + this.cw + reach) / sp);
    for (let i = a; i <= b; i++) fn(i, i * sp, h1(i, seed));
  }
}
export function darkenPacked(c, k) {
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  const f = 1 - k;
  return rgba(Math.round(r * f + 36 * k * 0.4), Math.round(g * f + 20 * k * 0.4), Math.round(b * f + 46 * k * 0.4), 255);
}

// ---------------------------------------------------------------- sprites from The Bear Must Eat's nature atlas
const SPR = new Map();
export function sprite(name, frame = 0) {
  const k = name + '#' + frame;
  if (SPR.has(k)) return SPR.get(k);
  let s = null;
  try {
    const c = natureCanvas(name, frame, 1);
    if (c) {
      const x = c.getContext('2d', { willReadFrequently: true });
      const d = x.getImageData(0, 0, c.width, c.height).data;
      s = { w: c.width, h: c.height, px: new Uint32Array(d.buffer.slice(0)) };
    }
  } catch (e) { s = null; }
  SPR.set(k, s);
  return s;
}
// a hand-made sprite from rows of palette letters ('.' = empty)
export function art(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const px = new Uint32Array(w * h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch !== '.' && ch !== ' ' && pal[ch]) px[y * w + x] = typeof pal[ch] === 'number' ? pal[ch] : pk(pal[ch]); } });
  return { w, h, px };
}
// a PixCanvas (signs with real text) -> sprite
export function fromCanvas(p) {
  const d = p.x.getImageData(0, 0, p.w, p.h).data;
  return { w: p.w, h: p.h, px: new Uint32Array(d.buffer.slice(0)) };
}
