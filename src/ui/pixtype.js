// Display type painted as pixel art. Menu words, place names, day numbers
// and name tags are rasterised with hard alpha into a small canvas (fill,
// ink outline, an optional second outline, a hard drop shadow and a
// pixel-stepped italic slant) and shown upscaled with image-rendering:
// pixelated, so the UI's big type sits on the same chunky grid as the game.
//   typeEl('NEW GAME', { size: 16 })            -> <canvas> sized by --ts
//   typeEl('Day 2', { size: 30, fill: GOLD }, 4) -> fixed 4x scale
import { PixCanvas } from '../core/pixtex.js';

export const INK = '#141018', CREAM = '#fff3dc', RED = '#e8443a', GOLD = '#ffd060', INDIGO = '#23264a';

const cache = new Map();

// paint once (cached by text + options); returns a canvas with the trimmed type
export function paintType(str, o = {}) {
  const key = str + '|' + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const { font = 'Dela Gothic One', size = 16, fill = CREAM, outline = INK, outline2 = null, shadow = 2, shadowColor = INK, slant = 0.22, spacing = 0, threshold = 0.5, hollow = false } = o;
  const f = `${size}px "${font}"`;
  const n = [...str].length;
  const w0 = Math.ceil(PixCanvas.measure(str, f) + Math.max(0, n - 1) * spacing) + 16;
  const h0 = Math.ceil(size * 1.6) + 12;
  const p = new PixCanvas(w0, h0);
  if (hollow) {
    // outline only: a 1-texel ring around the glyphs
    p.text(str, 5, 5, { font: f, color: '#fff', threshold, letterSpacing: spacing });
    const m = new PixCanvas(w0, h0);
    m.draw(p.c);
    p.outline(fill);
    p.x.globalCompositeOperation = 'destination-out';
    p.x.drawImage(m.c, 0, 0);
    p.x.globalCompositeOperation = 'source-over';
  } else p.text(str, 5, 5, { font: f, color: fill, outline, threshold, letterSpacing: spacing, shadow: shadow ? { dx: shadow, dy: shadow, color: shadowColor } : null });
  if (outline2) p.outline(outline2, { diagonal: true });
  let c = p.c;
  // pixel italic: every row shifts right by its height above the baseline
  if (slant) {
    const extra = Math.ceil(h0 * slant);
    const s = document.createElement('canvas');
    s.width = w0 + extra; s.height = h0;
    const x = s.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (let y = 0; y < h0; y++) x.drawImage(c, 0, y, w0, 1, Math.round((h0 - 1 - y) * slant), y, w0, 1);
    c = s;
  }
  const out = trim(c);
  cache.set(key, out);
  return out;
}

const urlOf = (c) => c._url || (c._url = c.toDataURL());

function trim(c) {
  const x = c.getContext('2d', { willReadFrequently: true });
  const { width: W, height: H } = c;
  const d = x.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    if (d[(y * W + i) * 4 + 3] > 0) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { const e = document.createElement('canvas'); e.width = e.height = 1; return e; }
  const o = document.createElement('canvas');
  o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  const ox = o.getContext('2d');
  ox.imageSmoothingEnabled = false;
  ox.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

// an element showing painted type: <img> so the same painting can appear many
// times. scale = fixed integer; omitted = CSS var --ts (set per layout / media query)
export function typeEl(str, o = {}, scale = null, cls = '') {
  const c = paintType(str, o);
  const img = document.createElement('img');
  img.className = 'ptype ' + cls;
  img.alt = str;
  img.draggable = false;
  img.src = urlOf(c);
  img.width = c.width; img.height = c.height;
  img.style.setProperty('--w', c.width);
  img.style.setProperty('--h', c.height);
  if (scale) { img.style.width = c.width * scale + 'px'; img.style.height = c.height * scale + 'px'; }
  return img;
}
// the same but as an HTML string (for innerHTML templates)
export function typeHTML(str, o = {}, cls = '') {
  const c = paintType(str, o);
  return `<img class="ptype ${cls}" alt="" draggable="false" src="${urlOf(c)}" width="${c.width}" height="${c.height}" style="--w:${c.width};--h:${c.height}">`;
}
