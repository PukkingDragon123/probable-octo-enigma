// Pixel-art texture painter. Everything in Kodamaya is painted in code: a
// PixCanvas is a small canvas you draw on texel by texel (rects, lines,
// ellipses, dithers, noise, palette ramps, crisp pixel text, outlines), then
// turn into a nearest-filtered THREE texture.
//
// Texel density convention: environment textures use 64 texels per metre
// (TPM), so at the default gameplay zoom one texel is about one screen pixel.
import * as THREE from 'three';
import { hash2, valueNoise2, fbm2, hexToRgb, rgbToHex, clamp, mulberry32 } from './util.js';

export const TPM = 64; // texels per metre

// ---------------------------------------------------------------- colour
// Hue-shifted ramp: darker steps drift towards purple/blue, lighter steps
// towards warm yellow (classic pixel-art shading). Returns hex strings.
export function ramp(base, n = 5, { spread = 0.32, hueShift = 0.06, sat = 0.0 } = {}) {
  const c = new THREE.Color(base);
  const hsl = {};
  c.getHSL(hsl);
  const out = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const k = (i - mid) / Math.max(1, mid); // -1 .. 1
    // darker -> hue towards 0.72 (violet), lighter -> towards 0.13 (warm)
    const towards = k < 0 ? 0.72 : 0.13;
    let dh = towards - hsl.h;
    if (dh > 0.5) dh -= 1;
    if (dh < -0.5) dh += 1;
    const h = (hsl.h + dh * Math.abs(k) * hueShift * 2 + 1) % 1;
    const l = clamp(hsl.l + k * spread * (k < 0 ? 0.9 : 0.75), 0.02, 0.97);
    const s = clamp(hsl.s * (1 + sat) * (k < 0 ? 1 + 0.12 * -k : 1 - 0.18 * k), 0, 1);
    out.push('#' + new THREE.Color().setHSL(h, s, l).getHexString());
  }
  return out;
}
export const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
export const darken = (c, k = 0.2) => mix(c, '#24142e', k);
export const lighten = (c, k = 0.2) => mix(c, '#fff6e2', k);
export const alpha = (c, a) => { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${a})`; };

// 4x4 bayer
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

// ---------------------------------------------------------------- canvas
export class PixCanvas {
  constructor(w, h, seed = 1) {
    this.w = w | 0; this.h = h | 0;
    this.c = document.createElement('canvas');
    this.c.width = this.w; this.c.height = this.h;
    this.x = this.c.getContext('2d', { willReadFrequently: true });
    this.x.imageSmoothingEnabled = false;
    this.seed = seed;
    this.rnd = mulberry32(seed);
  }
  get canvas() { return this.c; }
  clear() { this.x.clearRect(0, 0, this.w, this.h); return this; }
  fill(color) { this.x.fillStyle = color; this.x.fillRect(0, 0, this.w, this.h); return this; }
  px(x, y, color) { this.x.fillStyle = color; this.x.fillRect(Math.floor(x), Math.floor(y), 1, 1); return this; }
  rect(x, y, w, h, color) { if (w <= 0 || h <= 0) return this; this.x.fillStyle = color; this.x.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); return this; }
  // 1px frame
  frame(x, y, w, h, color, t = 1) {
    this.rect(x, y, w, t, color); this.rect(x, y + h - t, w, t, color);
    this.rect(x, y, t, h, color); this.rect(x + w - t, y, t, h, color);
    return this;
  }
  // bevelled panel: light top/left, dark bottom/right
  bevel(x, y, w, h, base, light, dark, t = 1) {
    this.rect(x, y, w, h, base);
    this.rect(x, y, w, t, light); this.rect(x, y, t, h, light);
    this.rect(x, y + h - t, w, t, dark); this.rect(x + w - t, y, t, h, dark);
    return this;
  }
  hline(x0, x1, y, color) { return this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, color); }
  vline(x, y0, y1, color) { return this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, color); }
  line(x0, y0, x1, y1, color, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.x.fillStyle = color;
    for (let guard = 0; guard < 10000; guard++) {
      this.x.fillRect(x0 - ((thick - 1) >> 1), y0 - ((thick - 1) >> 1), thick, thick);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  // filled ellipse with pixel-exact edges
  ellipse(cx, cy, rx, ry, color) {
    this.x.fillStyle = color;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
      if (x1 > x0) this.x.fillRect(x0, y, x1 - x0, 1);
    }
    return this;
  }
  circle(cx, cy, r, color) { return this.ellipse(cx, cy, r, r, color); }
  ring(cx, cy, r, color, t = 1) {
    this.x.fillStyle = color;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - t) this.x.fillRect(x, y, 1, 1);
      }
    return this;
  }
  // rounded rectangle (pixel corners)
  rrect(x, y, w, h, r, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    this.x.fillStyle = color;
    for (let j = 0; j < h; j++) {
      let inset = 0;
      if (j < r) inset = r - Math.round(Math.sqrt(r * r - (r - j - 0.5) ** 2));
      else if (j >= h - r) inset = r - Math.round(Math.sqrt(r * r - (j - (h - r) + 0.5) ** 2));
      this.x.fillRect(x + inset, y + j, w - inset * 2, 1);
    }
    return this;
  }
  poly(points, color) {
    // scanline fill of a polygon given as [[x,y],...]
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    this.x.fillStyle = color;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        if (x1 > x0) this.x.fillRect(x0, y, x1 - x0, 1);
      }
    }
    return this;
  }
  // ordered-dither blend of `color` over a region with coverage k (0..1) or k(x,y)
  dither(x, y, w, h, color, k = 0.5) {
    this.x.fillStyle = color;
    const f = typeof k === 'function' ? k : () => k;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = x + i, Y = y + j;
      if (f(X, Y, i / Math.max(1, w - 1), j / Math.max(1, h - 1)) > bayer(X, Y)) this.x.fillRect(X, Y, 1, 1);
    }
    return this;
  }
  // same, but with white-noise thresholds: organic speckle instead of a grid
  scatter(x, y, w, h, color, k = 0.5, seed = this.seed) {
    this.x.fillStyle = color;
    const f = typeof k === 'function' ? k : () => k;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = x + i, Y = y + j;
      if (f(X, Y, i / Math.max(1, w - 1), j / Math.max(1, h - 1)) > hash2(X, Y, seed)) this.x.fillRect(X, Y, 1, 1);
    }
    return this;
  }
  // per-texel painter: fn(x, y) -> colour string or null
  each(fn, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const c = fn(x, y);
      if (c) { this.x.fillStyle = c; this.x.fillRect(x, y, 1, 1); }
    }
    return this;
  }
  // sprinkle `n` single texels from `colors` (tileable)
  speckle(n, colors, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.floor(this.rnd() * w), y = y0 + Math.floor(this.rnd() * h);
      this.px(x, y, colors[Math.floor(this.rnd() * colors.length)]);
    }
    return this;
  }
  // noisy fill from a palette ramp: picks ramp[i] by fbm (tileable if `tile`)
  noiseFill(pal, { scale = 0.15, x0 = 0, y0 = 0, w = this.w, h = this.h, bias = 0, contrast = 1, octaves = 3, dither = true, seed = this.seed } = {}) {
    const n = pal.length;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      let v = this._tileNoise(x, y, scale, seed, octaves);
      v = (v - 0.5) * contrast + 0.5 + bias;
      if (dither) v += (bayer(x, y) - 0.5) / n;
      const i = clamp(Math.floor(v * n), 0, n - 1);
      this.x.fillStyle = pal[i];
      this.x.fillRect(x, y, 1, 1);
    }
    return this;
  }
  _tileNoise(x, y, scale, seed, octaves) {
    // seamless fbm by blending 4 offsets over the tile size
    const W = this.w, H = this.h;
    const u = x / W, v = y / H;
    const a = fbm2(x * scale, y * scale, seed, octaves);
    const b = fbm2((x - W) * scale, y * scale, seed, octaves);
    const c = fbm2(x * scale, (y - H) * scale, seed, octaves);
    const d = fbm2((x - W) * scale, (y - H) * scale, seed, octaves);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  // stamp a char-art sprite: rows of chars, pal maps char -> colour ('.'/' ' transparent)
  stamp(rows, pal, x0 = 0, y0 = 0, { flipX = false, scale = 1 } = {}) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[flipX ? r.length - 1 - i : i];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) continue;
        this.rect(x0 + i * scale, y0 + j * scale, scale, scale, col);
      }
    }
    return this;
  }
  // draw another canvas (or PixCanvas) at integer position
  draw(src, x = 0, y = 0, w, h) {
    const s = src.c || src;
    this.x.imageSmoothingEnabled = false;
    if (w != null) this.x.drawImage(s, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    else this.x.drawImage(s, Math.round(x), Math.round(y));
    return this;
  }
  // crisp pixel text: renders with the given font, then thresholds alpha so
  // no anti-aliased edges remain. align: 'left'|'center'|'right'.
  text(str, x, y, { font = '11px Galmuri11', color = '#000', align = 'left', baseline = 'top', threshold = 0.45, outline = null, shadow = null, maxWidth = null, letterSpacing = 0 } = {}) {
    const tmp = PixCanvas._tmp || (PixCanvas._tmp = document.createElement('canvas'));
    const tx = tmp.getContext('2d', { willReadFrequently: true });
    tx.font = font;
    let wMeasure = tx.measureText(str).width + Math.max(0, str.length - 1) * letterSpacing;
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] || 12);
    const scaleX = maxWidth && wMeasure > maxWidth ? maxWidth / wMeasure : 1;
    const W = Math.ceil(wMeasure * scaleX) + 8, H = Math.ceil(size * 1.6) + 8;
    tmp.width = W; tmp.height = H;
    tx.font = font;
    tx.textBaseline = 'top';
    tx.fillStyle = '#fff';
    tx.save();
    tx.translate(4, 4);
    tx.scale(scaleX, 1);
    if (letterSpacing) {
      let cx = 0;
      for (const ch of str) { tx.fillText(ch, cx, 0); cx += tx.measureText(ch).width + letterSpacing; }
    } else tx.fillText(str, 0, 0);
    tx.restore();
    const img = tx.getImageData(0, 0, W, H);
    const d = img.data;
    // threshold into a mask
    const mask = new Uint8Array(W * H);
    let minX = W, maxX = -1, minY = H, maxY = -1;
    for (let i = 0; i < W * H; i++) {
      if (d[i * 4 + 3] / 255 > threshold) {
        mask[i] = 1;
        const px = i % W, py = (i / W) | 0;
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    if (maxX < 0) return { w: 0, h: 0 };
    const tw = maxX - minX + 1, th = maxY - minY + 1;
    let ox = Math.round(x), oy = Math.round(y);
    if (align === 'center') ox = Math.round(x - tw / 2);
    else if (align === 'right') ox = Math.round(x - tw);
    if (baseline === 'middle') oy = Math.round(y - th / 2);
    else if (baseline === 'bottom') oy = Math.round(y - th);
    const put = (dx, dy, col) => {
      this.x.fillStyle = col;
      for (let j = minY; j <= maxY; j++) for (let i = minX; i <= maxX; i++) if (mask[j * W + i]) this.x.fillRect(ox + i - minX + dx, oy + j - minY + dy, 1, 1);
    };
    if (shadow) put(shadow.dx ?? 1, shadow.dy ?? 1, shadow.color);
    if (outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) put(dx, dy, outline);
    put(0, 0, color);
    return { w: tw, h: th, x: ox, y: oy };
  }
  // measure crisp text width without drawing
  static measure(str, font) {
    const tmp = PixCanvas._tmp || (PixCanvas._tmp = document.createElement('canvas'));
    const tx = tmp.getContext('2d');
    tx.font = font;
    return tx.measureText(str).width;
  }
  // add a 1px outline around all opaque texels
  outline(color, { diagonal = false } = {}) {
    const img = this.x.getImageData(0, 0, this.w, this.h), d = img.data, W = this.w, H = this.h;
    const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 127;
    const marks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) || (diagonal && (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)))) marks.push(x, y);
    }
    this.x.fillStyle = color;
    for (let i = 0; i < marks.length; i += 2) this.x.fillRect(marks[i], marks[i + 1], 1, 1);
    return this;
  }
  // snap all alpha to 0/1 (after any smooth drawing)
  hardAlpha(th = 0.5) {
    const img = this.x.getImageData(0, 0, this.w, this.h), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] / 255 > th ? 255 : 0;
    this.x.putImageData(img, 0, 0);
    return this;
  }
  // quantise colours to a palette (nearest), optional ordered dither between the two nearest
  quantize(pal, ditherAmt = 0) {
    const P = pal.map(hexToRgb);
    const img = this.x.getImageData(0, 0, this.w, this.h), d = img.data;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      if (d[i + 3] === 0) continue;
      let best = 0, bd = Infinity, second = 0, sd = Infinity;
      for (let k = 0; k < P.length; k++) {
        const dd = (P[k][0] - d[i]) ** 2 + (P[k][1] - d[i + 1]) ** 2 + (P[k][2] - d[i + 2]) ** 2;
        if (dd < bd) { second = best; sd = bd; best = k; bd = dd; } else if (dd < sd) { second = k; sd = dd; }
      }
      let k = best;
      if (ditherAmt > 0 && sd < Infinity) {
        const t = Math.sqrt(bd) / (Math.sqrt(bd) + Math.sqrt(sd) + 1e-6);
        if (t * ditherAmt * 2 > bayer(x, y)) k = second;
      }
      d[i] = P[k][0]; d[i + 1] = P[k][1]; d[i + 2] = P[k][2];
    }
    this.x.putImageData(img, 0, 0);
    return this;
  }
  // wrap-around copy so tiling textures have no seam where features crossed the edge
  tileWrap(fn) {
    // fn(dx, dy) draws at offset; call it for the 9 neighbour copies
    for (const dy of [-this.h, 0, this.h]) for (const dx of [-this.w, 0, this.w]) fn(dx, dy);
    return this;
  }
  texture(opts = {}) { return makeTexture(this.c, opts); }
}

// nearest-filtered texture from a canvas
export function makeTexture(canvas, { repeat = false, mips = true, srgb = true, flipY = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mips ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = !!mips;
  t.anisotropy = 1;
  t.flipY = flipY;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// texture cache by key (textures are generated once)
const _cache = new Map();
export function cached(key, make) {
  if (_cache.has(key)) return _cache.get(key);
  const v = make();
  _cache.set(key, v);
  return v;
}

export { hash2, valueNoise2, fbm2 };
