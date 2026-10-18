// Ground layers of the train-window scenery, after real Japanese country
// seen from the Shinkansen in early summer: deep-green rice fields to the
// foot of wooded hills, hamlets of tile-roofed houses behind clipped hedges,
// white vinyl greenhouses, concrete utility poles with their sagging lines,
// cedar and bamboo groves, a shrine in its wood, kei trucks on farm lanes.
// No open water anywhere: the paddies are grown thick and green.
//
//   paintFarGround: the plain in the middle distance (fields, hamlets, groves).
//   paintNear: the houses and fields right by the line, big and chunky.
//
// Everything that stands up is drawn as an object (B.obj) so the ink pass
// gives it a bold dark outline; ground fills stay unlined.
// Rows: y = 0 at the top; L.hz is the horizon row, L.gy the near ground line.
import { pk, pks, h1, h2, n1, n2, win, emit, darkenPacked } from './core.js';

const segOf = (L, X) => { const s = L.segAt(X); return s.k > 0.5 ? s.b : s.a; };
// flat (undithered) pick from a ramp: chunky bands of colour
const flat = (R, v) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * R.length)))];
const shade = (c, k) => darkenPacked(c, k);
function lighten(c, k) {
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  return (((255 << 24) | (Math.round(b + (255 - b) * k) << 16) | (Math.round(g + (255 - g) * k) << 8) | Math.round(r + (255 - r) * k)) >>> 0);
}

// ---------------------------------------------------------------- palettes
const RICE = pks(['#2c6428', '#36762e', '#448a36', '#539c3c', '#66b046', '#80c454']);
const RICE_FAR = pks(['#3a7432', '#46863a', '#549842', '#64a84a']);
const AZE = pks(['#4a7a30', '#5e9038', '#76a646', '#8ebc52']);
const SOIL = pks(['#5e4430', '#6e5038', '#7e5e42', '#8e6c4c']);
const CABB = pks(['#4e8a3c', '#68a24a', '#86ba5a', '#a8d27a']);
const TEA = pks(['#2e5a26', '#3e7030', '#52883a', '#6aa046', '#88b856']);
const LEAF = pks(['#1c3e22', '#25502a', '#306234', '#3e763c', '#528a46', '#6ca052']);
const HEDGE = pks(['#1e4020', '#285226', '#33642e', '#427836', '#568c40']);
const CEDAR = pks(['#142a20', '#1b3628', '#234430', '#2e5238']);
const BAMBOO = pks(['#4e7a2e', '#6a9638', '#86b046', '#a6c85a']);
const KAWARA = pks(['#272d3a', '#323a4a', '#3f485c', '#4f5a70', '#636f88', '#7c88a0']);
const SLATE = pks(['#1f2026', '#292b33', '#34373f', '#40444e', '#50545e']);
const BROWN = pks(['#3e2820', '#4e3228', '#5e3e30', '#70503e', '#866650']);
const TIN = { red: pks(['#6e2c26', '#88382e', '#a04838', '#b45a44']), blue: pks(['#2a4466', '#345276', '#406286', '#527496']), green: pks(['#2a5240', '#33604a', '#3e7056', '#508264']) };
const WOOD = pks(['#2e2018', '#3e2c20', '#4e382a', '#624834', '#7a5c42']);
const PLASTER = pks(['#d6cebc', '#e4ddcc', '#eee8da', '#f6f2e8']);
const STONE = pks(['#6a6a6a', '#7e7c78', '#94918a', '#aaa69c']);
const CONC = pks(['#7e7e7a', '#929290', '#a6a59e', '#bab8b0']);
const ASPH = pks(['#55565a', '#606165', '#6c6d70']);
const SIDING = [
  ['#efe8d8', '#e0d8c4'], ['#f2f0ea', '#e0ded6'], ['#dccfb4', '#ccbe9e'], ['#cfd3d6', '#bec3c7'],
  ['#c8ae8e', '#b69a7a'], ['#e6dcd0', '#d6cab8'], ['#b9c4b8', '#a8b4a6'],
].map((p) => pks(p));
const FRAME = pk('#a8aeb6'), FRAME_D = pk('#7e848e'), GLASS = pk('#34405a'), GLASS_L = pk('#6a86a8');
const INK = pk('#141018'), WHITE = pk('#f4f2ec'), BLACK = pk('#1e1a22');
const NIGHT = ['#ffd890', '#ffe6b0', '#ffcf80', '#fff0d0'];

// a window: dark frame, glass with a sky glint, lit at night (WIN code)
function windowAt(B, x, y, w, h, seed, o = {}) {
  B.rect(x - 1, y - 1, w + 2, h + 2, o.frame ?? FRAME_D);
  const lit = win(NIGHT[Math.floor(h1(seed, 7) * 4)]);
  const curtain = h1(seed, 8) < 0.35 ? pk(['#e8dcc0', '#d8e4ec', '#f0d8d8'][Math.floor(h1(seed, 9) * 3)]) : 0;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    let c = h1(seed, 6) < 0.4 ? lit : GLASS;
    if (c === GLASS && xx + yy < 2) c = GLASS_L;
    if (curtain && (xx < 2 || xx >= w - 2) && c === GLASS) c = curtain;
    B.set(x + xx, y + yy, c);
  }
  if (o.mullion && w >= 6) B.vline(x + (w >> 1), y, y + h - 1, o.frame ?? FRAME_D);
  if (o.sill) B.hline(x - 1, x + w, y + h + 1, FRAME);
}
// a hipped tile roof seen from its long side: chunky tile rows, a ridge, ends
function hipRoof(B, xL, xR, yE, rh, inset, R, o = {}) {
  for (let k = 0; k < rh; k++) {
    const y = yE - k, t = k / Math.max(1, rh - 1);
    const a = Math.round(xL + inset * t), b = Math.round(xR - inset * t);
    const band = k % 2 === 0 ? 2 : 3;
    for (let x = a; x <= b; x++) {
      let c = R[band + (k > rh * 0.6 ? 1 : 0)];
      if (x - a < 2) c = R[1];                    // the shaded hip end on the left
      else if (b - x < 2) c = R[Math.min(R.length - 1, 4)]; // the lit one on the right
      else if (k % 2 === 1 && (x + (k >> 1) * 3) % 5 === 0) c = R[1]; // tile seams
      B.set(x, y, c);
    }
  }
  // the eave edge and the ridge
  B.hline(Math.round(xL), Math.round(xR), yE + 1, R[0]);
  const ra = Math.round(xL + inset) - 1, rb = Math.round(xR - inset) + 1, ry = yE - rh;
  B.rect(ra, ry - 1, rb - ra + 1, 2, R[1]);
  B.hline(ra, rb, ry - 2, R[3]);
  if (o.noshi) B.hline(ra + 2, rb - 2, ry, PLASTER[1]);
  if (o.oni) for (const ex of [ra - 1, rb - 1]) { B.rect(ex, ry - 4, 3, 4, R[0]); B.set(ex + 1, ry - 3, R[3]); }
}
// a darker band just under an eave
function eaveShadow(B, X0, X1, y, n = 2) {
  for (let x = X0; x <= X1; x++) for (let k = 0; k < n; k++) { const c = B.get(x, y + k); if (c && (c >>> 24) >= 247) B.set(x, y + k, shade(c, 0.3 - k * 0.12)); }
}

// ---------------------------------------------------------------- near buildings (1 texel = 1.25 cm)
// the everyday two-storey house: siding, aluminium windows, a skirt roof
// between the floors, a hipped tile or slate roof, a balcony with futons
function house2(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 34 + Math.floor(r(1) * 14), f1 = 12, f2 = 11, top = gy - f1 - f2;
  const S = SIDING[Math.floor(r(2) * SIDING.length)];
  const R = r(3) < 0.55 ? KAWARA : r(3) < 0.8 ? SLATE : BROWN;
  B.obj(seed * 13 + 1);
  // walls with board lines, a lit corner trim and a footing
  for (let x = X; x < X + w; x++) B.col(x, top, gy - 1, (xx, y) => (x === X ? lighten(S[0], 0.25) : x === X + w - 1 ? S[1] : (gy - y) % 3 === 0 ? S[1] : S[0]));
  B.rect(X, gy - 2, w, 2, CONC[1]);
  // 1F: a big sliding glass door, a small window, the front door with its canopy
  const dw = 11, dx = X + 4;
  windowAt(B, dx, gy - 11, dw, 9, seed * 3 + 1, { mullion: true });
  windowAt(B, X + w - 10, gy - 10, 6, 5, seed * 3 + 2);
  const doorX = X + Math.floor(w * 0.55);
  if (doorX + 5 < X + w - 11) { B.rect(doorX, gy - 10, 5, 8, BROWN[2]); B.vline(doorX + 3, gy - 7, gy - 6, PLASTER[3]); B.rect(doorX - 1, gy - 12, 7, 1, R[1]); }
  // the skirt roof between the floors
  const sy = gy - f1;
  for (let k = 0; k < 3; k++) B.hline(X - 3 + k, X + w + 2 - k, sy - k, R[k === 2 ? 4 : 2 + (k & 1)]);
  B.hline(X - 3, X + w + 2, sy + 1, R[0]);
  eaveShadow(B, X, X + w - 1, sy + 2, 2);
  // 2F: windows (some with shutter boxes), and a balcony
  const n2w = 2 + (w > 42 ? 1 : 0), sp = Math.floor((w - 6) / n2w);
  for (let k = 0; k < n2w; k++) {
    const wx = X + 4 + k * sp, wy = top + 3;
    windowAt(B, wx, wy, 7, 6, seed * 5 + k);
    if (r(10 + k) < 0.5) { B.rect(wx - 1, wy - 3, 9, 2, S[1]); B.hline(wx - 1, wx + 7, wy - 3, lighten(S[1], 0.2)); }
  }
  if (r(4) < 0.6) {
    const bx = X + 2, bw = Math.min(w - 4, 22), by = sy - 3;
    B.rect(bx, by - 4, bw, 4, pk('#9ea4ac'));
    for (let x = bx + 1; x < bx + bw - 1; x += 2) B.set(x, by - 3, pk('#7e848c'));
    B.hline(bx, bx + bw - 1, by - 5, pk('#c4c8ce'));
    if (r(5) < 0.6) { const fc = pk(['#f2eee6', '#f6c8d4', '#c8daf6', '#f6e6a0'][Math.floor(r(6) * 4)]); B.rect(bx + 2, by - 9, 10, 6, fc); B.hline(bx + 2, bx + 11, by - 9, lighten(fc, 0.3)); }
  }
  // the roof
  const rh = 8 + Math.floor(r(7) * 3);
  hipRoof(B, X - 3, X + w + 2, top - 1, rh, rh * 1.15, R);
  eaveShadow(B, X, X + w - 1, top, 2);
  // the outdoor unit of the air conditioner
  if (r(8) < 0.7) { const ax = X + w - 9; B.obj(seed * 13 + 2); B.rect(ax, gy - 7, 8, 5, pk('#e6e6e2')); B.rect(ax + 1, gy - 6, 4, 3, pk('#a8aaae')); B.set(ax + 6, gy - 5, pk('#c8c8c4')); }
  B.obj(null);
  return w;
}
// the old farmhouse: one tall storey under a huge hip-and-gable roof, shoji
// and glass doors behind the engawa, dark timber, a stone footing
function kominka(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 50 + Math.floor(r(1) * 16), wh = 15, yW = gy - wh;
  const R = r(2) < 0.8 ? KAWARA : TIN[['red', 'blue'][Math.floor(r(3) * 2)]];
  B.obj(seed * 13 + 3);
  B.rect(X - 1, gy - 2, w + 2, 2, STONE[2]); B.hline(X - 1, X + w, gy - 2, STONE[3]);
  const bays = Math.max(4, Math.round(w / 9)), bw = w / bays;
  for (let b = 0; b < bays; b++) {
    const x0 = Math.round(X + b * bw), x1 = Math.round(X + (b + 1) * bw) - 1;
    const kind = h1(seed * 31 + b, 381);
    for (let x = x0; x <= x1; x++) B.col(x, yW, gy - 3, (xx, y) => {
      if (x === x0) return WOOD[1];
      if (y === yW || y === yW + 1) return WOOD[2];
      if (kind < 0.4) { // glass doors
        if ((x - x0) % 4 === 0 || y === gy - 8) return WOOD[3];
        return (x - x0 + y) % 7 === 0 ? GLASS_L : win('#ffe0a8');
      }
      if (kind < 0.75) { // shoji
        if ((x - x0) % 3 === 0 || (y - yW) % 4 === 0) return pk('#c8bc9e');
        return win('#fff2cc');
      }
      return y > gy - 8 ? WOOD[1 + ((x >> 1) & 1)] : PLASTER[2]; // plaster over boards
    });
  }
  B.vline(X + w - 1, yW, gy - 3, WOOD[1]);
  // engawa veranda along the front
  B.rect(X + 2, gy - 5, w - 4, 2, WOOD[4]); B.hline(X + 2, X + w - 3, gy - 3, WOOD[1]);
  // the big roof (lower hip, upper gable bit, ridge with noshi and onigawara)
  const rh = 13 + Math.floor(r(4) * 4);
  hipRoof(B, X - 5, X + w + 4, yW - 1, rh, rh * 1.05, R, { noshi: R === KAWARA, oni: true });
  eaveShadow(B, X, X + w - 1, yW, 3);
  // a little gable triangle in the hip
  const gx = X + w / 2, gyT = yW - rh;
  for (let k = 0; k < 4; k++) B.hline(Math.round(gx - k * 1.5) - 1, Math.round(gx + k * 1.5), gyT + 1 + k, k < 1 ? R[1] : WOOD[2]);
  // potted plants by the door
  if (r(5) < 0.6) { B.obj(seed * 13 + 4); for (let k = 0; k < 3; k++) { const px = X + 3 + k * 4; B.rect(px, gy - 5, 3, 3, pk('#a8583a')); B.rect(px - 1, gy - 8, 5, 3, LEAF[3 + (k & 1)]); } }
  B.obj(null);
  return w;
}
// the white storehouse: thick plaster, black namako tiles below, a shuttered window
function kura(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 22 + Math.floor(r(1) * 6), wh = 22, yW = gy - wh;
  B.obj(seed * 13 + 5);
  for (let x = X; x < X + w; x++) B.col(x, yW, gy - 1, (xx, y) => {
    if (y > gy - 8) { const u = (x - X + (y - gy)) % 4, v = (x - X - (y - gy) + 40) % 4; return u === 0 || v === 0 ? pk('#e8e4dc') : pk('#363a46'); }
    return x === X + w - 1 ? PLASTER[0] : x === X ? PLASTER[3] : PLASTER[2];
  });
  const wx = X + Math.floor(w / 2) - 3, wy = yW + 5;
  B.rect(wx - 1, wy - 1, 8, 7, BLACK); B.rect(wx, wy, 6, 5, pk('#4a4652')); B.vline(wx + 3, wy, wy + 4, BLACK);
  hipRoof(B, X - 3, X + w + 2, yW - 1, 6, 4, KAWARA, { noshi: true });
  eaveShadow(B, X, X + w - 1, yW, 2);
  if (r(2) < 0.6) { B.rect(X + (w >> 1) - 2, yW - 9, 5, 4, BLACK); B.rect(X + (w >> 1) - 1, yW - 8, 3, 2, PLASTER[3]); }
  B.obj(null);
  return w;
}
// a corrugated farm shed with a rusty tin roof and a tractor inside
function shed(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const w = 26 + Math.floor(r(1) * 12), wh = 16;
  const T = TIN[['red', 'blue', 'green'][Math.floor(r(2) * 3)]];
  B.obj(seed * 13 + 6);
  for (let x = X; x < X + w; x++) B.col(x, gy - wh, gy - 1, (xx, y) => {
    if (x > X + 4 && x < X + w - 5 && y > gy - wh + 4) return y > gy - 3 ? pk('#2a2420') : pk('#1e1a1e');
    const rust = n2(x / 3, y / 6, 401) > 0.72 && (x & 1);
    return rust ? pk('#8a5a3a') : (x & 1 ? pk('#9a9ca2') : pk('#b2b4ba'));
  });
  if (r(3) < 0.7) { const tx = X + 8; B.rect(tx, gy - 7, 8, 4, pk('#d85a2a')); B.rect(tx + 5, gy - 10, 3, 3, pk('#3a3a40')); B.rect(tx, gy - 3, 3, 3, BLACK); B.rect(tx + 6, gy - 2, 2, 2, BLACK); }
  for (let k = 0; k < 4; k++) B.hline(X - 2 + k, X + w + 1 - k, gy - wh - 1 - k, T[k & 1 ? 1 : 2]);
  B.hline(X - 2, X + w + 1, gy - wh, T[0]);
  B.obj(null);
  return w;
}
// white vinyl greenhouses: arched tunnels in a row, ribs showing through
function greenhouse(B, X, gy, n, seed) {
  const hw = 9;
  for (let k = 0; k < n; k++) {
    B.obj(seed * 13 + 7 + k * 101);
    const x0 = X + k * (hw * 2 + 1), h = 15;
    for (let x = 0; x < hw * 2; x++) {
      const t = (x + 0.5 - hw) / hw, top = Math.round(gy - 1 - h * Math.sqrt(Math.max(0, 1 - t * t * 0.9)));
      B.col(x0 + x, top, gy - 1, (xx, y) => {
        if (y === top) return WHITE;
        if (y > gy - 5) return (x & 1) ? pk('#a8c49c') : pk('#bcd4b0'); // the crop inside
        if (x % 5 === 0) return pk('#b6c2c6');
        return t < -0.3 ? pk('#f0f4f4') : t > 0.4 ? pk('#d0dadc') : pk('#e2eaec');
      });
    }
  }
  B.obj(null);
  return n * (hw * 2 + 1);
}

// ---------------------------------------------------------------- near plants (all chunky, cel-shaded, outlined)
// a clump-built crown: lumps lit from the upper right, shaded bottom left
function crownClumps(B, cx, cy, rx, ry, R, seed, n = 7) {
  const lumps = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + h1(seed, k) * 0.8;
    const d = k === 0 ? 0 : 0.55 + h1(seed, k + 20) * 0.3;
    lumps.push([cx + Math.cos(a) * rx * d * 0.7, cy + Math.sin(a) * ry * d * 0.6, (0.45 + h1(seed, k + 40) * 0.25) * Math.min(rx, ry * 1.4)]);
  }
  lumps.sort((p, q) => p[1] - q[1]);
  for (const [lx, ly, lr] of lumps.reverse()) {
    B.ellipse(lx, ly, lr * 1.1, lr * 0.9, (x, y, nx, ny) => {
      const v = 0.62 + nx * 0.22 - ny * 0.42;
      return flat(R, v);
    });
  }
}
function broadleaf(B, X, gy, seed, o = {}) {
  const r = (k) => h1(seed, k);
  const h = o.h ?? (24 + Math.floor(r(1) * 14)), rx = o.rx ?? (9 + r(2) * 6);
  B.obj(seed * 13 + 8);
  B.rect(X - 1, gy - h * 0.45, 3, h * 0.45, WOOD[2]); B.vline(X - 1, gy - h * 0.45, gy - 1, WOOD[3]);
  B.line(X, gy - h * 0.4, X - 4, gy - h * 0.6, WOOD[2]); B.line(X + 1, gy - h * 0.42, X + 5, gy - h * 0.62, WOOD[2]);
  crownClumps(B, X, gy - h * 0.66, rx, h * 0.36, o.R ?? LEAF, seed, 8);
  if (o.fruit) for (let k = 0; k < 7; k++) B.set(Math.round(X - rx * 0.7 + r(30 + k) * rx * 1.4), Math.round(gy - h * 0.66 + (r(40 + k) - 0.3) * h * 0.4), pk('#f08a2a'));
  B.obj(null);
  return Math.round(rx * 2);
}
// a garden pine: a crooked trunk and flat cloud-pads of needles
function gardenPine(B, X, gy, seed) {
  const r = (k) => h1(seed, k);
  const h = 20 + Math.floor(r(1) * 8);
  B.obj(seed * 13 + 9);
  let x = X;
  for (let y = gy - 1; y > gy - h; y--) { x += Math.sin((gy - y) * 0.35 + seed) * 0.45; B.rect(Math.round(x) - 1, y, 2, 1, WOOD[1]); }
  for (let k = 0; k < 4; k++) {
    const py = gy - h * (0.35 + k * 0.2), px = X + (k % 2 ? 4 : -3) + (r(3 + k) - 0.5) * 4, pw = 7 + r(10 + k) * 5;
    B.ellipse(px, py, pw, 2.6, (xx, yy, nx, ny) => (ny < -0.2 ? CEDAR[3] : ny < 0.4 ? CEDAR[2] : CEDAR[1]));
  }
  B.obj(null);
  return 18;
}
// a stand of sugi cedar: tall dark spires
function cedars(B, X, gy, n, seed, hmin = 44) {
  for (let k = 0; k < n; k++) {
    const r = (q) => h1(seed * 7 + k, q);
    const tx = X + k * 9 + Math.floor(r(1) * 4), h = hmin + Math.floor(r(2) * 16);
    B.obj(seed * 13 + 10 + k * 37);
    B.rect(tx, gy - h * 0.3, 2, h * 0.3, WOOD[1]);
    for (let y = gy - h; y < gy - h * 0.22; y++) {
      const t = (y - (gy - h)) / (h * 0.78), hw = Math.max(0.5, t * 6.5 + Math.sin(y * 0.9) * 0.8);
      for (let x = Math.round(tx + 1 - hw); x <= Math.round(tx + hw); x++) B.set(x, y, x < tx + 1 ? CEDAR[(y >> 2) % 2 ? 1 : 0] : CEDAR[(y >> 2) % 2 ? 3 : 2]);
    }
  }
  B.obj(null);
  return n * 9 + 6;
}
// a bamboo grove: pale stalks and feathery yellow-green crowns bowing over
function bamboo(B, X, gy, w, seed) {
  B.obj(seed * 13 + 11);
  const n = Math.floor(w / 4);
  for (let k = 0; k < n; k++) {
    const sx = X + k * 4 + Math.floor(h1(seed + k, 1) * 3), h = 44 + Math.floor(h1(seed + k, 2) * 14);
    for (let y = gy - h; y < gy; y++) B.set(sx + Math.round((gy - y) / h * (k % 2 ? 2 : -1)), y, (y - gy) % 6 === 0 ? BAMBOO[0] : BAMBOO[2]);
  }
  for (let k = 0; k < n * 1.4; k++) {
    const cx = X + h1(seed, 50 + k) * w, cy = gy - 40 - h1(seed, 80 + k) * 18, rr = 6 + h1(seed, 110 + k) * 4;
    B.ellipse(cx, cy, rr * 1.3, rr * 0.7, (x, y, nx, ny) => flat(BAMBOO, 0.55 + nx * 0.25 - ny * 0.35));
  }
  B.obj(null);
  return w;
}
// a clipped hedge (ikegaki) along the front of a property
function hedge(B, X, gy, w, seed, h = 7) {
  B.obj(seed * 13 + 12, false);
  for (let x = X; x < X + w; x++) {
    const bump = Math.round(Math.abs(Math.sin(x * 0.55 + seed)) * 1.2);
    B.col(x, gy - h - bump, gy - 1, (xx, y) => {
      const d = y - (gy - h - bump);
      return d < 1 ? HEDGE[4] : d < 3 ? HEDGE[3] : (x + y) % 5 === 0 ? HEDGE[1] : HEDGE[2];
    });
  }
  B.obj(null);
  return w;
}
// round clipped azalea balls in a garden
function shrubs(B, X, gy, n, seed) {
  for (let k = 0; k < n; k++) {
    B.obj(seed * 13 + 14 + k * 17);
    const r = 3 + h1(seed, k) * 2;
    B.ellipse(X + k * 8, gy - r, r * 1.2, r, (x, y, nx, ny) => flat(HEDGE, 0.55 + nx * 0.2 - ny * 0.45));
    if (h1(seed, k + 9) < 0.4) for (let q = 0; q < 3; q++) B.set(Math.round(X + k * 8 + (h1(seed, q + 30 + k) - 0.5) * r * 1.6), Math.round(gy - r - h1(seed, q + 40 + k) * r), pk('#f26aa0'));
  }
  B.obj(null);
  return n * 8;
}

// ---------------------------------------------------------------- near street life
function utilityPole(B, X, gy) {
  B.obj(X * 3 + 1);
  const top = gy - 58;
  B.rect(X - 1, top, 3, gy - top, CONC[2]); B.vline(X - 1, top, gy - 1, CONC[3]); B.vline(X + 1, top, gy - 1, CONC[0]);
  B.rect(X - 8, top + 3, 17, 1, CONC[0]); B.rect(X - 6, top + 9, 13, 1, CONC[0]);
  for (const dx of [-7, -2, 3, 7]) B.set(X + dx, top + 2, WHITE);
  B.rect(X + 2, top + 13, 5, 7, pk('#8a9098')); B.hline(X + 2, X + 6, top + 13, pk('#aab0b8'));
  B.rect(X - 2, gy - 10, 5, 8, pk('#f0d040')); for (let y = gy - 10; y < gy - 2; y += 2) B.hline(X - 2, X + 2, y, BLACK);
  B.rect(X - 2, gy - 26, 5, 4, pk('#2a6ad8'));
  B.obj(null);
}
const POLE_SP = 200;
function poleWires(B, L, gy) {
  const has = (i) => { const sg = segOf(L, i * POLE_SP); return (sg === 'country' || sg === 'village' || sg === 'farm' || sg === 'valley' || sg === 'tea') && n1(i / 4, 420) > 0.55; };
  B.slots(POLE_SP, 12, 421, (i, sx) => {
    if (!has(i)) return;
    utilityPole(B, sx, gy);
    if (!has(i + 1)) return;
    const ex = sx + POLE_SP, top = gy - 58;
    B.obj(sx * 3 + 2);
    for (const [dy, sag] of [[3, 10]]) {
      for (let x = Math.max(sx + 2, B.x0); x < Math.min(ex - 1, B.x1); x++) { const t = (x - sx) / POLE_SP; B.set(x, top + dy + Math.round(Math.sin(t * Math.PI) * sag), INK); }
    }
    // crows or sparrows on the line
    if (h1(i, 422) > 0.72) for (let k = 0; k < 2 + Math.floor(h1(i, 423) * 3); k++) {
      const x = sx + 40 + k * 8 + Math.floor(h1(i * 5 + k, 424) * 5), t = (x - sx) / POLE_SP, y = top + 3 + Math.round(Math.sin(t * Math.PI) * 10);
      B.rect(x, y - 3, 3, 3, BLACK); B.set(x - 1, y - 3, BLACK); B.set(x + 3, y - 2, BLACK);
    }
    B.obj(null);
  });
}
function vending(B, X, gy, n) {
  const fronts = ['#e8403a', '#2a6ad8', '#f4f4f0', '#3aa860', '#f0b020'];
  for (let k = 0; k < n; k++) {
    B.obj(X * 7 + k);
    const x = X + k * 8, f = pk(fronts[(X + k) % fronts.length]);
    B.rect(x, gy - 14, 7, 14, f); B.rect(x + 1, gy - 13, 5, 6, emit('#f4f8ff'));
    for (let row = 0; row < 2; row++) for (let c = 0; c < 3; c++) B.set(x + 1 + c * 2, gy - 12 + row * 3, emit(['#ff6a5a', '#5ab0ff', '#ffd050', '#7ae07a'][(c + row + k) % 4]));
    B.rect(x + 1, gy - 4, 5, 2, BLACK);
  }
  B.obj(null);
  return n * 8;
}
function busStop(B, X, gy) {
  B.obj(X * 7 + 5);
  B.vline(X, gy - 18, gy - 1, pk('#8a8a90')); B.ellipse(X, gy - 20, 3, 3, pk('#2a6ad8')); B.set(X, gy - 20, WHITE);
  B.rect(X - 3, gy - 1, 7, 1, STONE[1]);
  B.obj(X * 7 + 6);
  B.rect(X + 5, gy - 6, 12, 2, pk('#6a8ac0')); B.vline(X + 6, gy - 4, gy - 1, WOOD[1]); B.vline(X + 15, gy - 4, gy - 1, WOOD[1]);
  B.obj(null);
  return 18;
}
function jizo(B, X, gy) {
  for (let k = 0; k < 3; k++) {
    B.obj(X * 7 + 10 + k);
    const x = X + k * 6;
    B.rect(x, gy - 7, 4, 7, STONE[2]); B.vline(x + 3, gy - 7, gy - 1, STONE[0]); B.ellipse(x + 2, gy - 9, 2.2, 2.2, STONE[3]);
    B.rect(x, gy - 6, 4, 2, pk('#d83a32'));
  }
  B.obj(null);
  return 20;
}
function keiTruck(B, X, gy, seed) {
  B.obj(seed * 13 + 15);
  const W = pk('#f2f2ee'), Wd = pk('#c8c8c4');
  B.rect(X, gy - 7, 22, 3, W); B.hline(X, X + 21, gy - 5, Wd);
  B.rect(X + 15, gy - 12, 7, 6, W); B.rect(X + 16, gy - 11, 5, 3, GLASS); B.set(X + 16, gy - 11, GLASS_L); B.set(X + 21, gy - 6, emit('#ffe8a0'));
  B.hline(X + 1, X + 14, gy - 9, Wd); B.vline(X + 1, gy - 9, gy - 7, Wd);
  if (h1(seed, 1) < 0.5) for (let k = 0; k < 3; k++) { B.rect(X + 2 + k * 4, gy - 10, 3, 3, pk('#c8a060')); B.hline(X + 2 + k * 4, X + 4 + k * 4, gy - 11, pk(['#e85a3a', '#7ac04a', '#f0a030'][k])); }
  else B.ellipse(X + 8, gy - 9, 6, 3, pk('#d8c070'));
  B.rect(X + 3, gy - 3, 3, 3, BLACK); B.rect(X + 16, gy - 3, 3, 3, BLACK);
  B.obj(null);
  return 24;
}
function farmer(B, X, y, seed) {
  B.obj(seed * 13 + 16);
  B.ellipse(X + 2, y - 8, 4, 1.3, pk('#d8b860'));
  B.rect(X, y - 7, 4, 4, pk('#3a5a9a')); B.rect(X + 3, y - 5, 3, 2, pk('#3a5a9a'));
  B.vline(X + 1, y - 3, y - 1, pk('#2a3a6a')); B.vline(X + 3, y - 3, y - 1, pk('#2a3a6a'));
  B.set(X + 5, y - 3, pk('#e8c8a0'));
  B.obj(null);
}
function scarecrow(B, X, gy, seed) {
  B.obj(seed * 13 + 17);
  B.vline(X, gy - 17, gy - 1, WOOD[2]); B.hline(X - 6, X + 6, gy - 12, WOOD[2]);
  B.rect(X - 4, gy - 13, 9, 5, pk('#4a6aa8')); B.rect(X - 2, gy - 8, 5, 2, pk('#4a6aa8'));
  B.ellipse(X, gy - 16, 2.8, 2.8, pk('#f0e8d8')); B.set(X - 1, gy - 16, BLACK); B.set(X + 1, gy - 16, BLACK);
  B.ellipse(X, gy - 18.5, 5, 1.3, pk('#d8b860'));
  B.obj(null);
}
function shrine(B, X, gy, seed) {
  const RED = pks(['#8a2a22', '#b23a2a', '#d24e36', '#e8704a']);
  let w = cedars(B, X + 18, gy, 4, seed, 40);
  B.obj(seed * 13 + 19);
  const tx = X;
  for (const px of [tx, tx + 16]) { B.rect(px, gy - 24, 2, 24, RED[2]); B.rect(px - 1, gy - 2, 4, 2, BLACK); }
  B.rect(tx - 4, gy - 28, 26, 2, BLACK); B.rect(tx - 3, gy - 26, 24, 2, RED[2]);
  B.rect(tx - 1, gy - 21, 20, 2, RED[2]); B.rect(tx + 7, gy - 25, 4, 4, BLACK); B.rect(tx + 8, gy - 24, 2, 2, pk('#c8a040'));
  B.obj(seed * 13 + 20);
  const hx = X + 26;
  B.rect(hx, gy - 10, 12, 9, WOOD[3]); B.rect(hx + 2, gy - 8, 8, 5, WOOD[1]); B.rect(hx + 5, gy - 7, 2, 2, emit('#ffd070'));
  for (let k = 0; k < 4; k++) B.hline(hx - 2 + k, hx + 13 - k, gy - 11 - k, KAWARA[k % 2 ? 2 : 3]);
  B.obj(null);
  return Math.max(w + 18, 40);
}
function fumikiri(B, X, gy) {
  B.obj(X * 7 + 20);
  for (let y = gy - 26; y < gy; y++) { const c = ((y >> 1) & 1) ? pk('#f0c020') : BLACK; B.set(X, y, c); B.set(X + 1, y, c); }
  B.line(X - 5, gy - 30, X + 6, gy - 24, WHITE); B.line(X - 5, gy - 24, X + 6, gy - 30, WHITE);
  for (const lx of [X - 4, X + 3]) { B.rect(lx, gy - 22, 3, 3, emit('#ff3a2a')); B.rect(lx - 1, gy - 23, 5, 1, BLACK); }
  B.obj(X * 7 + 21);
  for (let k = 0; k < 20; k++) B.set(X + 3 + Math.round(k * 0.3), gy - 14 - k, ((k >> 1) & 1) ? pk('#f0c020') : BLACK);
  B.obj(null);
  B.rect(X - 24, gy - 1, 56, 2, ASPH[1]);
  return 34;
}
// frost fans on tall poles over the tea rows
function frostFan(B, X, gy) {
  B.obj(X * 7 + 30);
  B.rect(X, gy - 38, 2, 38, pk('#9a9aa0')); B.rect(X - 3, gy - 41, 8, 4, pk('#c8ccd4')); B.ellipse(X + 6, gy - 39, 1.4, 4, pk('#6a6e78'));
  B.obj(null);
}

// ---------------------------------------------------------------- the near fields
const NEAR_ROWS = (gy, H) => { const out = []; let y = gy + 3, s = 5; while (y < H) { const h = Math.round(s); out.push([y, h]); y += h; s *= 1.4; } return out; };
function fieldKind(seg, row, cell) {
  const r = h2(row, cell, 301);
  if (seg === 'tea') return r < 0.8 ? 'tea' : 'rice';
  if (seg === 'farm') return r < 0.35 ? 'cabbage' : r < 0.6 ? 'negi' : r < 0.8 ? 'rice' : 'soil';
  if (seg === 'mountain') return 'grass';
  return r < 0.9 ? 'rice' : r < 0.96 ? 'cabbage' : 'negi';
}
function fieldPx(kind, x, y, y0, h) {
  const d = y - y0;
  // the aze ridge between fields: a lit grassy top, a darker lip
  if (d === 0) return flat(AZE, 0.8 + (h2(x, y, 480) - 0.5) * 0.3);
  if (d === 1) return AZE[1];
  switch (kind) {
    case 'rice': {
      // thick summer rice: rows of clumps, lit tips, shaded feet
      const rowH = 2 + (h > 10 ? 1 : 0), k = (d - 2) % rowH;
      const clump = ((x + ((d - 2) / rowH | 0) * 2) % 4);
      let v = k === 0 ? 0.78 : 0.48;
      if (clump === 0) v -= 0.18; else if (clump === 2 && k === 0) v += 0.12;
      return flat(RICE, v + (n2(x / 14, y / 6, 447) - 0.5) * 0.22);
    }
    case 'tea': { const k = (d - 2) % 5; return k === 0 ? TEA[4] : k === 1 ? TEA[3] : k === 4 ? TEA[0] : TEA[2]; }
    case 'cabbage': {
      const rowH = 4, k = (d - 2) % rowH, cx = x % 5;
      if (k === rowH - 1) return SOIL[1];
      const r = Math.hypot(cx - 2, k - 1.2) / 2.2;
      return r < 1 ? flat(CABB, 0.85 - r * 0.6) : SOIL[2];
    }
    case 'negi': { const k = (d - 2) % 3; return k === 2 ? SOIL[1] : (x % 2 ? CABB[2] : CABB[1]); }
    case 'grass': return flat(AZE, 0.45 + (n2(x / 10, y / 4, 441) - 0.5) * 0.5);
    default: return (d & 1) ? SOIL[1] : SOIL[2];
  }
}
// ---------------------------------------------------------------- the near-layer painter
const NEAR_SP = 120;
export function paintNear(B, L) {
  const gy = L.gy, H = B.H;
  B.obj(null);
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      B.col(X, gy - 1, H - 1, (x, y) => {
        const d = y - gy;
        if (d < 2) return CONC[2];
        if (d < 12) return d === 6 && x % 12 < 6 ? pk('#e8e4d8') : ASPH[(h2(x >> 1, y >> 1, 436) * 3) | 0];
        if (d < 14) return CONC[1];
        return flat(AZE, 0.35 + (n2(x / 8, y / 4, 437) - 0.5) * 0.4);
      });
      continue;
    }
    // a farm lane (gravel in the hills, asphalt with a white edge elsewhere), then fields toward us
    const gravel = seg === 'mountain' || seg === 'valley';
    B.col(X, gy - 1, gy + 2, (x, y) => {
      const d = y - gy;
      if (d === -1) return flat(AZE, 0.7);
      if (gravel) return h2(x, y, 438) > 0.8 ? pk('#a49a86') : pk(d === 0 ? '#8e8270' : '#7e7262');
      return d === 0 ? pk('#e8e6de') : ASPH[1 + ((h2(x >> 1, y, 439) * 2) | 0)];
    });
    let rowI = 0;
    for (const [y0, h] of NEAR_ROWS(gy, H)) {
      rowI++;
      const fw = 80 + rowI * 50, off = Math.floor(h1(rowI, 439) * fw), cell = Math.floor((X + off) / fw);
      const kind = fieldKind(seg, rowI, cell);
      const edge = (X + off) % fw < 2;
      B.col(X, y0, y0 + h - 1, (x, yy) => (edge && yy - y0 > 1 ? AZE[(x + yy) & 1 ? 2 : 1] : fieldPx(kind, x, yy, y0, h)));
    }
  }
  poleWires(B, L, gy);
  // ---- buildings, trees and life, placed in slots
  B.slots(NEAR_SP, 150, 451, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 452) * 24);
    const seg = segOf(L, X);
    const pick = h1(i, 453), s = i * 3;
    if (seg === 'city' || seg === 'station') { cityBlock(B, X - 30, gy, i); return; }
    if (seg === 'mountain') {
      if (r < 0.75) cedars(B, X - 30, gy, 8 + Math.floor(pick * 5), s, 48);
      else if (r < 0.9) { cedars(B, X - 40, gy, 3, s, 46); kominka(B, X, gy, s + 1); }
      return;
    }
    if (seg === 'tea') {
      if (r < 0.4) { for (let k = 0; k < 3; k++) frostFan(B, X + k * 36, gy + 6); }
      else if (r < 0.7) { const w = house2(B, X, gy, s + 1); hedge(B, X - 6, gy + 1, w + 12, s); broadleaf(B, X + w + 8, gy, s + 2); }
      else if (r < 0.8) cedars(B, X, gy, 4, s);
      return;
    }
    if (seg === 'farm') {
      if (r < 0.45) greenhouse(B, X, gy + 1, 2 + Math.floor(pick * 3), s);
      else if (r < 0.6) { const w = shed(B, X, gy, s + 1); keiTruck(B, X + w + 6, gy + 1, s + 2); }
      else if (r < 0.72) { const w = kominka(B, X, gy, s + 3); broadleaf(B, X + w + 10, gy, s + 4, { fruit: true }); }
      else if (r < 0.8) scarecrow(B, X + 20, gy + 14, s);
      if (h1(i, 458) < 0.4) farmer(B, X + 30 + Math.floor(h1(i, 459) * 50), gy + 12 + Math.floor(h1(i, 460) * 8), s + 5);
      return;
    }
    // country, village and the valley
    const dense = seg === 'village', valley = seg === 'valley';
    let x = X;
    const hasHouse = r < (dense ? 0.72 : valley ? 0.45 : 0.55);
    if (hasHouse) {
      const kind = h1(i, 470);
      // behind the house: a tree or a stand of bamboo/cedar
      if (pick < 0.3) bamboo(B, x + 8, gy, 30, s + 6);
      else if (pick < 0.5 && !dense) cedars(B, x + 10, gy, 3, s + 7, 40);
      let w;
      if (kind < (valley ? 0.6 : 0.3)) w = kominka(B, x, gy, s + 1);
      else w = house2(B, x, gy, s + 2);
      if (h1(i, 471) < 0.3) { x += w + 4; w = kura(B, x, gy, s + 3); }
      x += w;
      // the garden: a pine, a persimmon, clipped shrubs; a hedge along the lane
      const g = h1(i, 472);
      if (g < 0.35) x += gardenPine(B, x + 10, gy, s + 4) + 6;
      else if (g < 0.6) x += broadleaf(B, x + 12, gy, s + 5, { fruit: valley }) + 8;
      if (h1(i, 473) < 0.6) hedge(B, X - 4, gy + 1, x - X + 8, s + 8, 5);
      else shrubs(B, X + 2, gy + 1, 4, s + 9);
    } else if (r < 0.55) greenhouse(B, x, gy + 1, 2 + Math.floor(pick * 2), s);
    else if (r < 0.66) { broadleaf(B, x + 10, gy, s + 10, { h: 30 + Math.floor(pick * 10), rx: 14 }); broadleaf(B, x + 34, gy, s + 11); }
    else if (r < 0.72) shrine(B, x, gy, s + 12);
    else if (r < 0.77) { const w = shed(B, x, gy, s + 13); keiTruck(B, x + w + 4, gy + 1, s + 14); }
    else if (r < 0.81) { x += busStop(B, x, gy); vending(B, x + 4, gy, 2); }
    else if (r < 0.84 && !valley) fumikiri(B, x + 10, gy);
    else if (r < 0.9) bamboo(B, x, gy, 40, s + 15);
    if (h1(i, 457) < 0.12) jizo(B, X - 28, gy);
    // the fields in front: a farmer, a scarecrow, a heron
    if (h1(i, 458) < 0.25) farmer(B, X + 20 + Math.floor(h1(i, 459) * 60), gy + 12 + Math.floor(h1(i, 460) * 10), s + 16);
    if (h1(i, 461) < 0.12) scarecrow(B, X + 70, gy + 16, s + 17);
    if (h1(i, 465) < 0.15 && !hasHouse) keiTruck(B, X + 30, gy + 1, s + 19);
  });
}

// ---- the town by the line at dusk (lights through the WIN / EMIT codes)
const KANJI = [['111', '010', '111'], ['101', '111', '101'], ['110', '011', '110'], ['111', '101', '111'], ['010', '111', '010'], ['101', '010', '101']];
function signGlyphs(B, x, y, n, col, vertical) {
  for (let k = 0; k < n; k++) {
    const g = KANJI[(x * 7 + k * 3 + y) % KANJI.length];
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) if (g[gy][gx] === '1') B.set(x + (vertical ? gx : k * 4 + gx), y + (vertical ? k * 4 + gy : gy), col);
  }
}
function cityBlock(B, X, gy, seed) {
  let x = X;
  for (let k = 0; k < 3; k++) {
    const kind = h1(seed * 5 + k, 471);
    const w = 28 + Math.floor(h1(seed * 5 + k, 472) * 26);
    B.obj(seed * 41 + k);
    if (kind < 0.2) { // a konbini: lit glass front and the stripe fascia
      const S1 = ['#2aa04a', '#e8403a', '#2a6ad8'][seed % 3], S2 = ['#2a6ad8', '#f0a020', '#ffffff'][seed % 3];
      B.rect(x, gy - 20, w, 20, pk('#f0f0ec'));
      B.rect(x, gy - 20, w, 2, pk(S1)); B.rect(x, gy - 18, w, 2, pk(S2));
      B.rect(x + 2, gy - 14, w - 4, 12, emit('#fff8e8'));
      for (let s = x + 4; s < x + w - 4; s += 5) { B.rect(s, gy - 11, 3, 8, pk('#8a9aa8')); for (let q = 0; q < 2; q++) B.set(s + 1, gy - 10 + q * 3, emit(['#ff8a6a', '#6ab0ff', '#ffe060'][(s + q) % 3])); }
      signGlyphs(B, x + 5, gy - 20, 3, emit('#ffffff'), false);
    } else if (kind < 0.6) { // an apartment block with balconies and lit windows
      const fl = 3 + Math.floor(h1(seed * 5 + k, 473) * 2), fh = 11;
      const wall = pks(['#d8d4c8', '#c4c8cc', '#e0d4c0', '#b8b4ac'])[k % 4];
      B.rect(x, gy - fl * fh - 2, w, fl * fh + 2, wall);
      for (let f = 0; f < fl; f++) {
        const fy = gy - (f + 1) * fh;
        for (let u = x + 3; u < x + w - 6; u += 9) {
          B.rect(u, fy + 2, 6, 5, h2(u, fy, 474) > 0.4 ? win(h2(u, fy, 475) > 0.6 ? '#ffd890' : '#fff0d0') : GLASS);
          B.rect(u - 1, fy + 7, 8, 2, pk('#a8acb0')); B.hline(u - 1, u + 6, fy + 7, pk('#d0d4d8'));
          if (h2(u, fy, 476) > 0.7) B.rect(u + 1, fy + 4, 3, 3, pk(['#ff9ab0', '#8ab8ff', '#ffffff'][(u + f) % 3]));
        }
      }
    } else if (kind < 0.82) { // a shop row with vertical neon signs and paper lanterns
      B.rect(x, gy - 24, w, 24, pk('#c8b8a0'));
      for (let s = 0; s + 12 <= w; s += 12) {
        const sc = ['#ff4a6a', '#ffd040', '#40d0ff', '#ff8a30', '#7aff8a'][(s + seed) % 5];
        B.rect(x + s + 1, gy - 10, 10, 10, win('#ffe0a8')); B.rect(x + s + 1, gy - 12, 10, 2, pk(['#c83a32', '#2a5aa8', '#3a8a4a'][(s >> 1) % 3]));
        B.rect(x + s + 3, gy - 23, 5, 11, emit(sc)); signGlyphs(B, x + s + 4, gy - 22, 2, pk('#ffffff'), true);
      }
    } else { // a pachinko parlour: loud lights
      B.rect(x, gy - 28, w, 28, pk('#2a2a3a'));
      for (let y = gy - 26; y < gy - 14; y++) for (let u = x + 1; u < x + w - 1; u++) if ((u + y) % 3 === 0) B.set(u, y, emit(['#ff3a8a', '#ffd03a', '#3ad0ff'][((u >> 2) + y) % 3]));
      B.rect(x + 3, gy - 11, w - 6, 11, emit('#fff0d0'));
    }
    B.obj(seed * 41 + k + 7);
    const lx = x + w - 3; B.vline(lx, gy - 32, gy - 1, pk('#6a6e78')); B.hline(lx - 5, lx, gy - 32, pk('#6a6e78')); B.rect(lx - 7, gy - 32, 4, 2, emit('#fff4c8'));
    x += w + 2;
  }
  if (h1(seed, 1) < 0.5) {
    B.obj(seed * 41 + 20);
    const cx = X + 30, cy = gy + 8;
    B.rect(cx, cy - 5, 20, 5, pk(['#e8e8e4', '#c83a32', '#2a3a5a'][seed % 3])); B.rect(cx + 4, cy - 8, 11, 3, pk('#6a7a90'));
    B.rect(cx + 3, cy, 3, 2, BLACK); B.rect(cx + 14, cy, 3, 2, BLACK); B.set(cx + 19, cy - 3, emit('#fff4c0')); B.set(cx, cy - 3, emit('#ff3a2a'));
  }
  B.obj(null);
}

// ================================================================= the far plain
// rows of distant fields (all grown green), hamlets, groves and greenhouses
function plainRows(hz, H) {
  const rows = [];
  let y = hz + 1, s = 1.2;
  while (y < H) { const h = Math.max(1, Math.round(s)); rows.push([y, h]); y += h + 1; s *= 1.35; }
  return rows;
}
function plainField(seg, row, cell) {
  const r = h2(row, cell, 301);
  if (seg === 'tea') return r < 0.75 ? 'tea' : 'rice';
  if (seg === 'farm') return r < 0.4 ? 'veg' : r < 0.55 ? 'house' : r < 0.85 ? 'rice' : 'soil';
  return r < 0.85 ? 'rice' : r < 0.97 ? 'veg' : 'soil';
}
function tinyHouse(B, X, base, seed) {
  const r = (k) => h1(seed, k);
  const w = 9 + Math.floor(r(1) * 6), h = 4 + Math.floor(r(2) * 3), rh = 3 + Math.floor(r(3) * 2);
  const wall = [PLASTER[3], PLASTER[2], pk('#dccfb4'), pk('#cfd3d6'), pk('#e6dcd0')][Math.floor(r(4) * 5)];
  const R = r(5) < 0.65 ? KAWARA : r(5) < 0.85 ? SLATE : TIN[['red', 'blue', 'green'][Math.floor(r(6) * 3)]];
  B.obj(seed * 17 + 1);
  B.rect(X, base - h, w, h, wall);
  // one wide window and a door: never two dots (they read as a face)
  B.rect(X + 1, base - h + 1, Math.min(4, w - 5), 1, h1(seed, 9) > 0.5 ? win('#ffd890') : GLASS);
  B.rect(X + w - 3, base - 3, 2, 3, WOOD[2]);
  B.hline(X, X + w - 1, base - h, shade(wall, 0.3));
  for (let k = 0; k < rh; k++) B.hline(X - 1 + k, X + w - k, base - h - 1 - k, R[k === rh - 1 ? 4 : k === 0 ? 1 : 3]);
  B.obj(null);
  return w;
}
// a copse in the distance: a mound of round crowns, lit from the upper right
function tinyGrove(B, X, base, w, seed) {
  B.obj(seed * 17 + 2);
  const n = Math.max(2, Math.round(w / 5));
  const lumps = [];
  for (let i = 0; i < n; i++) {
    const r = 3 + h1(seed + i, 312) * 2;
    lumps.push([X + (i + 0.5) * (w / n), base - 3 - Math.sin(Math.PI * (i + 0.5) / n) * 5 - r * 0.5, r]);
  }
  B.rect(X + 1, base - 4, w - 2, 4, LEAF[2]);
  for (const [lx, ly, r] of lumps) B.ellipse(lx, ly, r, r * 0.9, (x, y, nx, ny) => flat(LEAF, Math.max(0.42, 0.6 + nx * 0.25 - ny * 0.45)));
  B.hline(X + 1, X + w - 2, base - 1, LEAF[1]);
  B.obj(null);
}
function tinyGreenhouse(B, X, base, n, seed) {
  for (let k = 0; k < n; k++) {
    B.obj(seed * 17 + 3 + k);
    for (let x = 0; x < 7; x++) { const t = (x - 3) / 3.6, top = Math.round(base - 4 * Math.sqrt(Math.max(0, 1 - t * t))); B.col(X + k * 8 + x, top, base - 1, (xx, y) => (y === top ? WHITE : pk('#dce6e8'))); }
  }
  B.obj(null);
}
export function paintFarGround(B, L) {
  const hz = L.hz, H = B.H;
  const rows = plainRows(hz, H);
  B.obj(null);
  for (let X = B.x0; X < B.x1; X++) {
    const seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      B.col(X, hz, H - 1, (x, y) => ((y - hz) % 7 === 3 ? ASPH[1] : flat(pks(['#7a7a74', '#8a8880', '#9a968c']), n2(x / 7, y / 3, 328))));
      continue;
    }
    let rowI = 0;
    for (const [y0, h] of rows) {
      rowI++;
      const fw = Math.max(16, Math.round(22 + h * 10)), off = Math.floor(h1(rowI, 329) * fw), cell = Math.floor((X + off) / fw);
      const kind = plainField(seg, rowI, cell);
      B.set(X, y0 - 1, AZE[(X & 3) === 0 ? 3 : 2]);
      B.col(X, y0, y0 + h - 1, (x, y) => {
        if ((X + off) % fw === 0) return AZE[2];
        if (kind === 'tea') return (y - y0) % 2 ? TEA[1] : TEA[3];
        if (kind === 'veg') return x % 3 === 0 ? SOIL[1] : CABB[(y - y0) & 1 ? 1 : 2];
        if (kind === 'soil') return (y - y0) % 2 ? SOIL[1] : AZE[1];
        return flat(RICE_FAR, 0.55 + ((x + y) % 3 === 0 ? 0.2 : 0) + (n2(x / 9, y / 2, 303) - 0.5) * 0.4);
      });
    }
  }
  // objects standing on the plain
  B.slots(90, 50, 331, (i, sx, r) => {
    const X = sx + Math.floor(h1(i, 332) * 30), seg = segOf(L, X);
    if (seg === 'city' || seg === 'station') {
      for (let k = 0; k < 5; k++) {
        const w = 8 + Math.floor(h1(i * 9 + k, 336) * 10), h = 8 + Math.floor(h1(i * 9 + k, 337) ** 1.6 * 22), x0 = X - 30 + k * 14;
        const wall = pks(['#a8acb8', '#c4c0b8', '#9aa4b0', '#d0ccc0', '#b8b0a4'])[Math.floor(h1(i * 9 + k, 338) * 5)];
        B.obj(i * 9 + k);
        B.rect(x0, hz + 3 - h, w, h, wall);
        for (let wy = hz + 5 - h; wy < hz + 1; wy += 3) for (let wx = x0 + 1; wx < x0 + w - 1; wx += 2) if (h2(wx, wy, 339) > 0.35) B.set(wx, wy, h2(wx, wy, 340) > 0.4 ? win('#ffe0a0') : GLASS);
      }
      B.obj(null);
      return;
    }
    if (seg === 'tea') {
      if (r < 0.5) for (let k = 0; k < 3; k++) { const x = X + k * 16; B.obj(x * 5); B.vline(x, hz - 7, hz + 3, pk('#8a8a90')); B.rect(x - 1, hz - 9, 3, 2, pk('#c8ccd4')); }
      else tinyHouse(B, X, hz + 2, i);
      B.obj(null);
      return;
    }
    const n = seg === 'village' ? 4 : seg === 'mountain' ? (r < 0.6 ? 0 : 1) : r < 0.4 ? 0 : 1 + Math.floor(h1(i, 342) * 3);
    if (r < 0.25 || seg === 'valley' && r < 0.5) tinyGrove(B, X - 10, hz + 2, 18 + Math.floor(h1(i, 343) * 18), i);
    else if (r < 0.36 || seg === 'farm' && r < 0.7) tinyGreenhouse(B, X, hz + 4, 2 + Math.floor(h1(i, 345) * 3), i);
    for (let k = 0; k < n; k++) tinyHouse(B, X + 20 + k * 12 + Math.floor(h1(i * 5 + k, 346) * 3), hz + 1 + Math.floor(h1(i * 5 + k, 347) * 2), i * 11 + k);
  });
}
