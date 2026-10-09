// Scrolling pixel-art landscape for the Shinkansen windows (and the title).
// Tileable layer strips are painted once per segment; every frame they are
// composited with parallax offsets into one canvas that sits behind the
// voxel train's windows: sky gradient + clouds, far mountains (a Fuji-like
// peak), hills, the segment band (rice paddies / river / town / city), and
// the near layer of catenary poles and fences flicking past.
import { PixCanvas, ramp, mix, darken, lighten } from '../core/pixtex.js';
import { mulberry32, clamp, lerp, fbm2, hash2 } from '../core/util.js';

export const PANO_W = 1024; // strip width (tileable)

// time-of-day looks: sky top/horizon, light tint (multiply), glow (screen), window lights on
export const PANO_TIMES = {
  day: { top: '#6aa8e8', hor: '#cfe6f4', tint: '#ffffff', glow: 0, lights: 0, sun: '#fff8e0' },
  golden: { top: '#7a9ad8', hor: '#ffd6a0', tint: '#ffe8cc', glow: 0.25, lights: 0.1, sun: '#ffd080' },
  sunset: { top: '#5a5aa8', hor: '#ff9a68', tint: '#ffc8a8', glow: 0.35, lights: 0.4, sun: '#ff8a50' },
  dusk: { top: '#2a2a62', hor: '#c86a7a', tint: '#9a90c0', glow: 0.2, lights: 1, sun: '#ff7a60' },
  night: { top: '#0e1230', hor: '#2a3060', tint: '#5a5a8a', glow: 0, lights: 1, sun: '#8090ff' },
};

function strip(h, seed) { return new PixCanvas(PANO_W, h, seed); }

// ---------------------------------------------------------------- layers
function paintClouds(seed) {
  const p = strip(110, seed);
  const r = mulberry32(seed);
  for (let i = 0; i < 9; i++) {
    const cx = r() * PANO_W, cy = 18 + r() * 60, w = 40 + r() * 90, h = 8 + r() * 12;
    for (const dx of [-PANO_W, 0, PANO_W]) {
      const x0 = cx + dx;
      p.ellipse(x0, cy, w * 0.5, h * 0.6, '#ffffff');
      p.ellipse(x0 - w * 0.25, cy + 2, w * 0.3, h * 0.55, '#f4f6fa');
      p.ellipse(x0 + w * 0.22, cy - 2, w * 0.28, h * 0.7, '#ffffff');
      p.rect(x0 - w * 0.5, cy + h * 0.3, w, 2, '#e2e8f2');
    }
  }
  return p;
}
function paintMountains(seed, fuji = true) {
  const p = strip(90, seed);
  const R = ['#7d8fb2', '#8a9cbe', '#98a8c8'];
  // far ridge
  const ridge = (base, amp, freq, col, sd) => {
    for (let x = 0; x < PANO_W; x++) {
      const t = x / PANO_W * Math.PI * 2;
      const hgt = base + amp * (0.55 * Math.sin(t * freq + sd) + 0.3 * Math.sin(t * freq * 2.3 + sd * 2) + 0.15 * Math.sin(t * freq * 5.1 + sd * 3));
      p.vline(x, Math.round(90 - hgt), 89, col);
    }
  };
  ridge(30, 14, 3, R[2], seed);
  if (fuji) {
    // the big snow-capped peak
    const cx = PANO_W * 0.62;
    for (let x = -150; x <= 150; x++) {
      const k = Math.abs(x) / 150;
      const hgt = 82 * Math.pow(1 - k, 1.25) + 6;
      const X = Math.round(cx + x);
      p.vline(X, Math.round(90 - hgt), 89, x < 0 ? '#7484aa' : '#8698bc');
      const snow = 82 * Math.pow(1 - k, 1.25) - 54;
      if (snow > 0) p.vline(X, Math.round(90 - hgt), Math.round(90 - hgt + snow * 0.75 + (hash2(X, 1, 3) > 0.6 ? 2 : 0)), x < 0 ? '#e8eef8' : '#ffffff');
    }
  }
  ridge(18, 10, 5, R[1], seed + 1.7);
  ridge(10, 6, 9, R[0], seed + 3.1);
  return p;
}
function paintHills(seed) {
  const p = strip(70, seed);
  const G = ['#4e7a4a', '#5a8a52', '#6a9a5a', '#7aaa62'];
  for (let x = 0; x < PANO_W; x++) {
    const t = x / PANO_W * Math.PI * 2;
    const hgt = 28 + 14 * Math.sin(t * 4 + seed) + 6 * Math.sin(t * 11 + seed * 2);
    for (let y = Math.round(70 - hgt); y < 70; y++) {
      const v = fbm2(x * 0.05, y * 0.08, seed, 2);
      p.px(x, y, G[clamp(Math.floor(v * 4 + (y - (70 - hgt)) * 0.02), 0, 3)]);
    }
    // treeline bumps
    if (hash2(x, 3, seed) > 0.7) p.rect(x, Math.round(70 - hgt) - 2, 2, 3, G[0]);
  }
  return p;
}
// rice paddies: flooded fields mirror the sky (left transparent where water so
// the compositor can paint the reflected sky there)
function paintRice(seed) {
  const p = strip(80, seed);
  const r = mulberry32(seed);
  const dike = '#8a7a4a', dikeL = '#a8986a', grass = '#6aa04a';
  // rows of paddies in perspective: thin far rows, taller near rows
  const rows = [[0, 6], [6, 9], [15, 12], [27, 16], [43, 18], [61, 19]];
  for (const [y0, hh] of rows) {
    let x = Math.floor(r() * 60);
    while (x < PANO_W + 80) {
      const w = 60 + Math.floor(r() * 140);
      const sprout = r() < 0.55; // young green rice vs mirror-water
      for (let y = y0 + 1; y < y0 + hh; y++) for (let xx = x; xx < x + w - 2; xx++) {
        const X = ((xx % PANO_W) + PANO_W) % PANO_W;
        if (sprout && (xx + y * 3) % (y0 > 20 ? 4 : 3) === 0) p.px(X, y, (y + xx) % 7 === 0 ? '#9ad070' : grass);
        else if (sprout && (xx + y) % 5 === 0) p.px(X, y, '#7ab85a');
        // else transparent: water
      }
      // dikes between paddies (with tiny paths)
      for (let y = y0; y < y0 + hh; y++) { const X = (((x + w - 2) % PANO_W) + PANO_W) % PANO_W; p.px(X, y, dike); p.px((X + 1) % PANO_W, y, dikeL); }
      x += w;
    }
    p.hline(0, PANO_W - 1, y0, dike);
    if (y0 > 0) p.hline(0, PANO_W - 1, y0 - 1 >= 0 ? y0 - 1 : 0, dikeL);
  }
  return p;
}
// props standing on the rice band (farmhouses, persimmon trees, scarecrows, power poles)
function paintFarmProps(seed) {
  const p = strip(70, seed);
  const r = mulberry32(seed);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor((i + r() * 0.6) * PANO_W / 6);
    farmhouse(p, x, 66, r);
  }
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * PANO_W);
    tree(p, x, 66, r() < 0.5 ? '#e88a3a' : '#4a7a3a', r);
  }
  // power line with poles
  for (let x = 20; x < PANO_W; x += 128) { p.vline(x, 20, 66, '#4a3a34'); p.hline(x - 4, x + 4, 22, '#4a3a34'); }
  for (let x = 0; x < PANO_W; x++) { const k = ((x - 20) % 128 + 128) % 128 / 128; p.px(x, Math.round(22 + Math.sin(k * Math.PI) * 4), '#3a3034'); }
  return p;
}
function farmhouse(p, x, base, r) {
  const w = 26 + Math.floor(r() * 16), h = 12 + Math.floor(r() * 4);
  const wall = r() < 0.5 ? '#e8dcc0' : '#c8a878', roof = r() < 0.6 ? '#4a5268' : '#7a5a48';
  for (const dx of [0, -PANO_W]) {
    const X = x + dx;
    p.rect(X, base - h, w, h, wall);
    p.rect(X, base - h, w, 2, darken(wall, 0.15));
    for (let wx = X + 3; wx < X + w - 4; wx += 7) { p.rect(wx, base - h + 4, 4, 4, '#3a3a4a'); p.px(wx + 1, base - h + 5, '#ffd890'); }
    p.poly([[X - 4, base - h + 1], [X + w / 2, base - h - 11], [X + w + 4, base - h + 1]], roof);
    p.hline(X - 4, X + w + 3, base - h + 1, darken(roof, 0.3));
    p.hline(X + 2, X + w - 2, base - h - 9, lighten(roof, 0.2));
  }
}
function tree(p, x, base, col, r) {
  for (const dx of [0, -PANO_W]) {
    const X = x + dx;
    p.vline(X, base - 10, base, '#5a3a2a');
    p.circle(X, base - 13, 5 + r() * 2, col);
    p.circle(X - 2, base - 15, 3, lighten(col, 0.2));
    if (col === '#e88a3a') for (let i = 0; i < 4; i++) p.px(X - 3 + i * 2, base - 12 + (i % 2) * 2, '#ff6a2a');
  }
}
function paintTown(seed, city = false) {
  const p = strip(city ? 110 : 80, seed);
  const r = mulberry32(seed);
  const H = p.h;
  let x = 0;
  const walls = city ? ['#8a94a8', '#a8b0c0', '#c8ccd4', '#7a8498', '#b8a898'] : ['#e8dcc4', '#d8c8a8', '#c8d0d8', '#e0d0c0', '#b8b8c0'];
  while (x < PANO_W) {
    const w = city ? 30 + Math.floor(r() * 50) : 22 + Math.floor(r() * 30);
    const h = city ? 40 + Math.floor(r() * 66) : 16 + Math.floor(r() * 30);
    const c = walls[Math.floor(r() * walls.length)];
    p.rect(x, H - h, w - 1, h, c);
    p.vline(x + w - 2, H - h, H - 1, darken(c, 0.2));
    p.hline(x, x + w - 2, H - h, lighten(c, 0.15));
    // windows (lights recorded in a second pass by the compositor via 'win' mask colour)
    for (let wy = H - h + 4; wy < H - 4; wy += city ? 6 : 7) for (let wx = x + 3; wx < x + w - 5; wx += city ? 5 : 6) {
      const lit = hash2(wx, wy, seed) > 0.5;
      p.rect(wx, wy, city ? 3 : 3, city ? 3 : 3, lit ? '#fe01fe' : '#4a5468'); // magenta = window that can light up
    }
    if (!city && r() < 0.5) { p.poly([[x - 2, H - h], [x + w / 2, H - h - 8], [x + w + 1, H - h]], r() < 0.5 ? '#5a6278' : '#8a5a4a'); }
    if (city && r() < 0.35) { // rooftop billboard
      const bw = Math.min(w - 4, 24), bx = x + 2, by = H - h - 10;
      p.rect(bx, by, bw, 9, ['#e8443a', '#3a8ad8', '#f0c040', '#40c080'][Math.floor(r() * 4)]);
      p.rect(bx + 2, by + 3, bw - 4, 2, '#ffffff');
      p.vline(bx + 2, by + 9, H - h, '#4a4a54'); p.vline(bx + bw - 3, by + 9, H - h, '#4a4a54');
    }
    if (!city && r() < 0.3) { p.hline(x + 2, x + w - 3, H - h + 6, '#a0a0a0'); for (let k = x + 3; k < x + w - 3; k += 3) p.rect(k, H - h + 7, 2, 3, ['#ffffff', '#ffb0c0', '#a0c0ff'][k % 3]); } // laundry
    x += w;
  }
  return p;
}
function paintRiver(seed) {
  const p = strip(80, seed);
  // banks + an iron truss bridge; water left transparent for sky reflection
  p.rect(0, 0, PANO_W, 10, '#6a9a52'); p.hline(0, PANO_W - 1, 10, '#a89a6a');
  p.rect(0, 64, PANO_W, 16, '#6a9a52'); p.hline(0, PANO_W - 1, 63, '#a89a6a');
  const bx = 300;
  for (let x = bx; x < bx + 220; x++) { p.px(x, 34, '#8a3a2a'); p.px(x, 35, '#6a2a1a'); }
  for (let x = bx; x < bx + 220; x += 12) { p.line(x, 34, x + 6, 22, '#8a3a2a'); p.line(x + 6, 22, x + 12, 34, '#8a3a2a'); }
  p.hline(bx, bx + 219, 22, '#8a3a2a');
  for (let x = bx + 20; x < bx + 220; x += 50) p.rect(x, 35, 4, 29, '#7a7a7a');
  return p;
}
function paintNear(seed, kind) {
  const p = strip(256, seed);
  // catenary masts every 128px, wires, a fence and some trackside weeds
  for (let x = 0; x < PANO_W; x += 128) {
    p.rect(x, 0, 5, 256, '#4a4a52'); p.rect(x + 1, 0, 1, 256, '#6a6a74');
    p.rect(x - 14, 26, 34, 3, '#4a4a52');
  }
  p.hline(0, PANO_W - 1, 30, '#2a2a30'); p.hline(0, PANO_W - 1, 40, '#2a2a30');
  if (kind !== 'tunnel') {
    for (let x = 0; x < PANO_W; x += 8) p.rect(x, 210, 2, 30, '#8a8a90');
    p.hline(0, PANO_W - 1, 214, '#9a9aa0'); p.hline(0, PANO_W - 1, 226, '#9a9aa0');
    for (let x = 0; x < PANO_W; x++) if (hash2(x, 2, seed) > 0.55) p.vline(x, 236 - Math.floor(hash2(x, 5, seed) * 8), 255, hash2(x, 9, seed) > 0.5 ? '#5a8a3a' : '#7aaa4a');
  }
  return p;
}
function paintTunnelLights(seed) {
  const p = strip(256, seed);
  p.fill('#0c0c12');
  for (let x = 0; x < PANO_W; x += 64) { p.rect(x, 60, 26, 5, '#ffcf70'); p.rect(x + 2, 61, 22, 3, '#fff2c0'); }
  for (let x = 32; x < PANO_W; x += 128) p.rect(x, 0, 3, 256, '#1a1a22');
  return p;
}

// ---------------------------------------------------------------- compositor
const SEGMENTS = ['rice', 'river', 'town', 'mountain', 'city', 'tunnel', 'station'];

export class Panorama {
  constructor(w = 896, h = 256) {
    this.w = w; this.h = h;
    this.c = document.createElement('canvas');
    this.c.width = w; this.c.height = h;
    this.x = this.c.getContext('2d');
    this.x.imageSmoothingEnabled = false;
    this.layers = {
      clouds: paintClouds(11), mountains: paintMountains(12, true), mountainsNoFuji: paintMountains(13, false),
      hills: paintHills(14), rice: paintRice(15), farm: paintFarmProps(16), town: paintTown(17), city: paintTown(18, true),
      river: paintRiver(19), near: paintNear(20), tunnel: paintTunnelLights(21),
    };
    // pre-baked night variants of the town/city strips with lit windows
    this.lit = {};
    for (const k of ['town', 'city']) this.lit[k] = this.lightWindows(this.layers[k], true);
    for (const k of ['town', 'city']) this.layers[k] = this.lightWindows(this.layers[k], false);
    this.scroll = 0;
    this.seg = 'rice';
    this.prevSeg = null;
    this.blend = 1;
    this.time = 'day';
    this.timeFrom = 'day';
    this.timeK = 1;
    this.rain = 0;
    this.drops = Array.from({ length: 90 }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, s: 0.5 + Math.random(), l: 4 + Math.random() * 10 }));
  }
  lightWindows(src, lit) {
    const p = new PixCanvas(src.w, src.h);
    p.draw(src);
    const img = p.x.getImageData(0, 0, p.w, p.h), d = img.data;
    for (let i = 0; i < d.length; i += 4) if (d[i] === 254 && d[i + 1] === 1 && d[i + 2] === 254) {
      const on = lit && ((i / 4) % 7) < 5;
      d[i] = on ? 255 : 74; d[i + 1] = on ? 214 : 84; d[i + 2] = on ? 140 : 104;
    }
    p.x.putImageData(img, 0, 0);
    return p;
  }
  setSegment(name) { if (name === this.seg) return; this.prevSeg = this.seg; this.seg = name; this.blend = name === 'tunnel' || this.prevSeg === 'tunnel' ? 1 : 0; }
  setTime(name, dur = 6) { if (name === this.time) return; this.timeFrom = this.time; this.time = name; this.timeK = 0; this.timeDur = dur; }
  update(dt, speed) {
    this.scroll += dt * speed * 260; // px per second at full speed
    this.blend = Math.min(1, this.blend + dt / 1.6);
    if (this.timeK < 1) this.timeK = Math.min(1, this.timeK + dt / (this.timeDur || 6));
    this.draw();
  }
  look() {
    const A = PANO_TIMES[this.timeFrom], B = PANO_TIMES[this.time], k = this.timeK;
    const m = (a, b) => mix(a, b, k);
    return { top: m(A.top, B.top), hor: m(A.hor, B.hor), tint: m(A.tint, B.tint), glow: lerp(A.glow, B.glow, k), lights: lerp(A.lights, B.lights, k), sun: m(A.sun, B.sun) };
  }
  tile(src, speed, y, alpha = 1, h = null) {
    const x = this.x, W = src.w;
    let off = -((this.scroll * speed) % W);
    if (off > 0) off -= W;
    x.globalAlpha = alpha;
    for (let px = Math.round(off); px < this.w; px += W) x.drawImage(src.c, px, Math.round(y), W, h ?? src.h);
    x.globalAlpha = 1;
  }
  draw() {
    const x = this.x, W = this.w, H = this.h, L = this.look();
    const seg = this.seg;
    if (seg === 'tunnel') {
      this.tile(this.layers.tunnel, 2.2, 0);
      this.drawRain();
      return;
    }
    // sky gradient (dithered bands)
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      x.fillStyle = mix(L.top, L.hor, i / (bands - 1));
      x.fillRect(0, Math.floor(i * H * 0.62 / bands), W, Math.ceil(H * 0.62 / bands) + 1);
    }
    x.fillStyle = L.hor; x.fillRect(0, Math.floor(H * 0.6), W, H);
    // sun glow
    if (L.glow > 0) { const g = x.createRadialGradient(W * 0.8, H * 0.45, 4, W * 0.8, H * 0.45, 160); g.addColorStop(0, L.sun); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = L.glow; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
    this.tile(this.layers.clouds, 0.03, 6, 0.9);
    const mtn = seg === 'mountain' || seg === 'rice' ? this.layers.mountains : this.layers.mountainsNoFuji;
    if (seg !== 'city') this.tile(mtn, 0.06, H * 0.22);
    this.tile(this.layers.hills, 0.14, H * 0.42);
    const band = (s, a) => {
      if (s === 'rice' || s === 'mountain') {
        this.water(H * 0.66, H * 0.34, L, 0.35);
        this.tile(this.layers.rice, 0.35, H * 0.66, a);
        this.tile(this.layers.farm, 0.3, H * 0.66 - 66 + 4, a);
      } else if (s === 'river') {
        this.water(H * 0.66, H * 0.34, L, 0.45);
        this.tile(this.layers.river, 0.45, H * 0.66, a);
      } else if (s === 'town' || s === 'station') {
        this.tile(this.layers.town, 0.32, H * 0.42, a);
        if (L.lights > 0.01) this.tile(this.lit.town, 0.32, H * 0.42, a * L.lights);
        x.fillStyle = '#7a7a72'; x.globalAlpha = a; x.fillRect(0, Math.floor(H * 0.42 + 80), W, H); x.globalAlpha = 1;
      } else if (s === 'city') {
        this.tile(this.layers.city, 0.22, H * 0.3, a);
        if (L.lights > 0.01) this.tile(this.lit.city, 0.22, H * 0.3, a * L.lights);
        x.fillStyle = '#5a5a62'; x.globalAlpha = a; x.fillRect(0, Math.floor(H * 0.3 + 110), W, H); x.globalAlpha = 1;
      }
    };
    if (this.prevSeg && this.blend < 1 && this.prevSeg !== 'tunnel') band(this.prevSeg, 1);
    band(seg, this.blend);
    this.tile(this.layers.near, 1.6, 0);
    // time-of-day tint
    if (L.tint !== '#ffffff') { x.globalCompositeOperation = 'multiply'; x.fillStyle = L.tint; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
    this.drawRain();
  }
  // mirror-water with sky colour, horizontal glints
  water(y, h, L, speed) {
    const x = this.x;
    for (let i = 0; i < 6; i++) { x.fillStyle = mix(L.hor, L.top, i / 7); x.fillRect(0, Math.floor(y + i * h / 6), this.w, Math.ceil(h / 6) + 1); }
    x.fillStyle = 'rgba(255,255,255,0.35)';
    const off = (this.scroll * speed) % 40;
    for (let k = 0; k < 40; k++) { const gx = ((k * 53 - off * (1 + (k % 3))) % this.w + this.w) % this.w; x.fillRect(Math.floor(gx), Math.floor(y + 4 + (k * 17) % h), 6 + (k % 4) * 3, 1); }
  }
  drawRain() {
    if (this.rain <= 0.01) return;
    const x = this.x;
    x.fillStyle = 'rgba(200,220,255,0.55)';
    for (const d of this.drops) {
      d.x -= 9 * d.s; d.y += 1.2 * d.s;
      if (d.x < -20) { d.x = this.w + Math.random() * 40; d.y = Math.random() * this.h; }
      if (Math.random() > this.rain) continue;
      x.fillRect(Math.floor(d.x), Math.floor(d.y), Math.floor(d.l), 1);
    }
  }
}
export { SEGMENTS };
